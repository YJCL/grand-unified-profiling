// ─────────────────────────────────────────────────────────────
//  易占い API
//    POST: 新しい卦を立てる
//    GET ?id=...  : 1件の保存済み結果を再表示（再抽選しない）
//    GET (id無し): 直近のユーザー履歴一覧（最大20件）
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { checkUserAccess } from '@/lib/auth';
import {
  castIching,
  reconstructIching,
  normalizeQuestion,
  hashQuestion,
  type LineValue,
} from '@/lib/engine/iching';
import { buildProfileFromUser } from '@/lib/engine/profile';
import { isLaunchFreeActive } from '@/lib/launch';
import { jstDateKey, jstDayRange } from '@/lib/jst';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_QUESTION_CHARS = 400;
const SAME_QUESTION_WINDOW_HOURS = 24;

// 高リスク語彙のヒューリスティック検出。
// 完全な分類ではないが、頻出語をひっかけて注意文を付ける。
const RISK_PATTERNS: { key: string; words: string[] }[] = [
  { key: 'medical',  words: ['薬', '手術', '病気', '通院', '医者', '医師', '治療', '抗うつ', '抗がん', '副作用', '症状', 'うつ', '癌', 'がん'] },
  { key: 'safety',   words: ['死', '殺', '自殺', '自傷', '消えたい', 'リスカ'] },
  { key: 'legal',    words: ['訴訟', '弁護士', '裁判', '逮捕', '違法', '犯罪'] },
  { key: 'finance',  words: ['投資', '株', '仮想通貨', 'FX', '借金', 'ローン', 'ギャンブル'] },
  { key: 'lifeevent', words: ['離婚', '退職', '会社辞', '会社を辞', '別れる', '退社'] },
];

function detectRisk(text: string): string[] {
  const flags = new Set<string>();
  for (const r of RISK_PATTERNS) {
    if (r.words.some((w) => text.includes(w))) flags.add(r.key);
  }
  return [...flags];
}

// プロフィールから「易の解釈で本当に使う」最大3項目だけ抜く（個別化用）。
function pickRelevantProfile(user: {
  birthDate?: string | null; name?: string | null;
  birthTime?: string | null; birthPlace?: string | null; gender?: string | null;
}): string[] {
  const profile = buildProfileFromUser(user);
  if (!profile) return [];
  const items: string[] = [];
  // 行動指針の核 = HDタイプ＋権威（最も再現性のある「動き方」）
  items.push(`ヒューマンデザイン: ${profile.humanDesign.type} / 権威 ${profile.humanDesign.authority}`);
  // 本質の核 = 四柱の日主（その人の「素材」）
  items.push(`日主: ${profile.fourPillars.dayMaster.stem}（${profile.fourPillars.dayMaster.element}・${profile.fourPillars.dayMaster.yinYang}）`);
  // 内面の表情 = 月星座
  items.push(`月星座: ${profile.westernAstrology.moon.sign}`);
  return items.slice(0, 3);
}

// ── LLM 解釈（構造化出力 / Sonnet） ───────────────────────
type Interpretation = {
  situation: string;
  central: string;
  changing: string;
  caution: string;
  step: string;
  uncertainty: string;
  safety_notes?: string;
};

async function interpret(opts: {
  question: string;
  primary: { name: string; summary: string; judgment: string };
  changingLines: number[];
  transformed: { name: string; summary: string } | null;
  profileHints: string[];
  riskFlags: string[];
}): Promise<Interpretation> {
  const tools: Anthropic.Tool[] = [{
    name: 'deliver_iching_reading',
    description: '易の解釈を6つの観点で構造化して返す',
    input_schema: {
      type: 'object',
      properties: {
        situation: { type: 'string', description: '今の状況の読み（80〜140字）。卦と問いを結び付けて。' },
        central:   { type: 'string', description: '卦が示す中心テーマ（80〜140字）。本卦の意味を、問いに即して。' },
        changing:  { type: 'string', description: '変化している部分（80〜140字）。変爻があれば之卦への動き、無ければ「動きは内にとどまる」など。' },
        caution:   { type: 'string', description: '注意して扱うこと（70〜120字）。具体的に。' },
        step:      { type: 'string', description: '今できる一歩（70〜120字）。小さく実行可能なもの。' },
        uncertainty: { type: 'string', description: '断定できないこと（60〜120字）。何が読みきれないかを正直に。' },
        safety_notes: { type: 'string', description: 'リスク領域（医療・法律・投資・安全・離婚等）に該当する場合のみ、専門家・現実情報を優先する旨を一文。該当しなければ空文字。' },
      },
      required: ['situation','central','changing','caution','step','uncertainty'],
    },
  }];

  const sys = `あなたは『周易』の知恵を借りるOrba。問いに対して卦を読む。

【絶対ルール】
- 与えられた卦・要約だけを根拠に解釈する。自分で卦を立て直さない。
- 出生プロフィールは「個別化のヒント」として最大3項目だけ与えられる。これは易の読みを「上書き」せず、易の読みに「彩りを添える」だけ。プロフィールが易と矛盾する場合は易を優先する。
- 未来や行動を断定しない。「〜だろう」「〜してください」より「〜が示唆される」「〜が一歩になり得る」。
- 高リスク領域（医療・薬・法律・投資・生死・自傷・犯罪・緊急の安全・離婚や退職など重大かつ不可逆な判断）では、具体的な決定を促す表現をしない。象徴の解釈は可能だが、「専門家や現実の情報を優先してください」と safety_notes に明記する。
- 「医療」「法律」「投資」と判定されたフラグがある場合は safety_notes を必ず埋める。
- 自分を AI/モデル/計算 と呼ばない。Orba として静かに読む。

出力は deliver_iching_reading ツールで返すこと。`;

  const userMsg = `# 問い
${opts.question}

# 本卦
${opts.primary.name}: ${opts.primary.summary}
（古典：${opts.primary.judgment}）

# 変爻
${opts.changingLines.length === 0 ? 'なし（卦の全体像をそのまま読む）' : `第${opts.changingLines.join('・')}爻が動いている`}

${opts.transformed ? `# 之卦（変化の先）
${opts.transformed.name}: ${opts.transformed.summary}` : ''}

# Orbaが知っているこの人の手がかり（解釈の彩りに最大3つだけ。読みを上書きしない）
${opts.profileHints.map((h) => '- ' + h).join('\n')}

# リスクフラグ
${opts.riskFlags.length ? opts.riskFlags.join('・') : 'なし'}

上記から、6項目（今の状況／卦が示す中心テーマ／変化している部分／注意して扱うこと／今できる一歩／断定できないこと）を構造化して返してください。リスクフラグがあれば safety_notes を埋めてください。`;

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 2048,
    system: sys,
    tools,
    tool_choice: { type: 'tool', name: 'deliver_iching_reading' },
    messages: [{ role: 'user', content: userMsg }],
  });
  const block = res.content.find((c) => c.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('no tool_use in iching interpret');
  return block.input as Interpretation;
}

// ── POST: 新しい卦を立てる ────────────────────────────────
export async function POST(request: Request) {
  try {
    const { userId, question, seed } = await request.json();
    if (!userId || !question) {
      return NextResponse.json({ error: 'userId と question が必要です' }, { status: 400 });
    }
    if (typeof question !== 'string' || question.length > MAX_QUESTION_CHARS) {
      return NextResponse.json({ error: '問いが長すぎます（400文字以内）' }, { status: 400 });
    }

    const access = await checkUserAccess(userId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const normalized = normalizeQuestion(question);
    if (!normalized) return NextResponse.json({ error: '問いを入力してください' }, { status: 400 });
    const qHash = hashQuestion(normalized);

    // 24h以内の同一質問は前回結果を返す
    const since = new Date(Date.now() - SAME_QUESTION_WINDOW_HOURS * 3600_000);
    const recent = await prisma.ichingReading.findFirst({
      where: { userId, questionHash: qHash, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      return NextResponse.json({
        ...formatReading(recent),
        reused: true,
        reuseNote: '同じ問いについて短時間に何度も卦を立てることは推奨していません。前回の卦をお返しします。',
      });
    }

    // 無料ユーザーは初回1回、Premiumは1日1回。無料開放中はPremium相当。
    const included = access.user.isPremium || isLaunchFreeActive();
    if (included) {
      const { start, end } = jstDayRange(jstDateKey());
      const todayReading = await prisma.ichingReading.findFirst({
        where: { userId, createdAt: { gte: start, lt: end } },
        orderBy: { createdAt: 'desc' },
      });
      if (todayReading) {
        return NextResponse.json({
          error: 'daily limit reached',
          message: '今日の卦は、すでに立っています。履歴から静かに読み返してみてください。',
        }, { status: 429 });
      }
    } else {
      const previousCount = await prisma.ichingReading.count({ where: { userId } });
      if (previousCount >= 1) {
        return NextResponse.json({
          error: 'premium required',
          upgradeRequired: true,
          message: '無料で立てられる最初の一卦を使いました。Orba Plusでは、1日1回新しい問いを立てられます。',
        }, { status: 402 });
      }
    }

    // 1) 卦を立てる
    const cast = castIching(seed);

    // 2) 高リスク検出
    const riskFlags = detectRisk(normalized);

    // 3) LLM解釈（プロフィールは最大3項目だけ）
    const profileHints = pickRelevantProfile(access.user);
    const interp = await interpret({
      question: normalized,
      primary: { name: cast.primary.name, summary: cast.primary.summary, judgment: cast.primary.judgment },
      changingLines: cast.changingLines,
      transformed: cast.transformed ? { name: cast.transformed.name, summary: cast.transformed.summary } : null,
      profileHints,
      riskFlags,
    });

    // 4) 保存
    const saved = await prisma.ichingReading.create({
      data: {
        userId,
        question,
        questionNormalized: normalized,
        questionHash: qHash,
        lineValues: JSON.stringify(cast.values),
        primaryNum: cast.primary.num,
        transformedNum: cast.transformed?.num ?? null,
        changingLines: JSON.stringify(cast.changingLines),
        interpretation: JSON.stringify({ ...interp, riskFlags }),
        dataVersion: cast.dataVersion,
        profileVersion: access.user.id, // 後でフリーズ版IDに置換可
        seed: cast.seed ?? null,
      },
    });

    return NextResponse.json(formatReading(saved));
  } catch (error) {
    console.error('iching POST error:', error);
    return NextResponse.json({ error: '易を立てる処理に失敗しました', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// ── GET: 履歴 or 単独再表示 ────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');
    if (!userId) return NextResponse.json({ error: 'userId が必要です' }, { status: 400 });

    const access = await checkUserAccess(userId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    if (id) {
      const r = await prisma.ichingReading.findFirst({ where: { id, userId } });
      if (!r) return NextResponse.json({ error: 'not found' }, { status: 404 });
      return NextResponse.json(formatReading(r));
    }
    const list = await prisma.ichingReading.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return NextResponse.json({ items: list.map((r) => ({
      id: r.id,
      question: r.question,
      primaryNum: r.primaryNum,
      transformedNum: r.transformedNum,
      changingLines: JSON.parse(r.changingLines),
      createdAt: r.createdAt,
    })) });
  } catch (error) {
    console.error('iching GET error:', error);
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }
}

// ── 保存済み行 → 表示用オブジェクト（保存済みvaluesから再算出。再抽選しない） ─
function formatReading(r: {
  id: string; question: string; questionNormalized: string; lineValues: string;
  changingLines: string; interpretation: string; createdAt: Date;
  primaryNum: number; transformedNum: number | null; dataVersion: string;
}) {
  const values = JSON.parse(r.lineValues) as LineValue[];
  const rebuilt = reconstructIching(values);
  return {
    id: r.id,
    question: r.question,
    values,
    primary: rebuilt.primary,
    changingLines: rebuilt.changingLines,
    transformed: rebuilt.transformed,
    interpretation: JSON.parse(r.interpretation),
    dataVersion: r.dataVersion,
    createdAt: r.createdAt,
  };
}

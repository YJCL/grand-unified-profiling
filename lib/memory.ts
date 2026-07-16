// ─────────────────────────────────────────────────────────────
//  会話メモリの蒸留
//  全会話をAPIに毎回詰め込むのはトークン浪費＝代わりに「覚えておくべきこと」を
//  安価なHaikuで簡潔なメモに蒸留し、User.memory に永続化する。
//  これを毎回の system prompt に注入することで、低コストで「ちゃんと覚えている
//  パートナー」を実現する。保存先は自前DB（セッション認証の奥・非公開）。
// ─────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';
import { jstDateKey, jstDateLabel } from '@/lib/jst';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MEMORY_MAX_CHARS = 4000;

type Turn = { role: string; content: string; ts?: string };

// 現在の記憶 + 最近の会話 → 更新後の記憶（メモ本文）。失敗時は null（呼び出し側は据え置き）。
export async function distillMemory(opts: {
  currentMemory: string;
  recent: Turn[];
  userName?: string | null;
}): Promise<string | null> {
  if (opts.recent.length === 0) return null;
  const who = opts.userName || 'ユーザー';
  // 発言日が分かるものは行頭に付ける（記憶に「いつの話か」を残すため）
  const transcript = opts.recent
    .map((m) => {
      const day = m.ts ? `[${jstDateKey(new Date(m.ts))}] ` : '';
      return `${day}${m.role === 'assistant' ? 'Orba' : who}: ${m.content}`;
    })
    .join('\n');
  const today = jstDateLabel();

  const system = `あなたはOrba。${who}を長く見守るパートナーとして、「次に話すとき覚えておくべきこと」を日本語メモに更新する。今日は${today}。

# 最重要ルール
- ★占術・命式・星座・数秘・宿曜・ヒューマンデザイン等の鑑定データや占術用語は一切書かない（システムが別途保持している。書くと本当に覚えるべき出来事の場所を奪う）。既存の記憶にそれらが含まれていたら削除する。
- ★性格・傾向を書くときも占術用語（星座名・星名・「七赤金星」「数秘5」「感情型権威」「喉センター」等）を使わず、日常語に言い換える（例:「感情型権威」→「感情の波が静まってから決めるとうまくいく」）。占術由来かどうかに関わらず、その人の行動パターンとして書く。
- ★「${who}の身に起きた具体的な出来事」を最優先で残す。誰に・何を・いつ（例:「友人にエアコンを譲った」「上司との面談が来週ある」）。固有名詞と具体名詞をぼかさない。
- ★出来事・予定・宣言には「いつの話か」を必ず添える（会話の行頭の [YYYY-MM-DD] がその発言の日付。無ければ今日の日付を使う）。「来週」「明日」のような相対表現は具体的な日付・時期に直して書く（例:「(2026-07-10) 近々髪を切りに行くと言っていた」）。日付のない予定は永遠に「これからの話」に見えてしまうため厳禁。
- 既存の記憶にある予定・宣言の日付が今日より十分過去なら、「〜する予定」ではなく「〜すると言っていた（その後は不明）」のように過去の言及として書き直す。

# 構成（この2見出しで書く）
## 人物像（安定した情報）
状況・仕事・大切な人・価値観・考え方・感情のパターン・好み。
## 最近の出来事・進行中の話題（新しい順・各項目に日付を添える）
起きたこと・話したエピソード・約束・宣言・未解決の相談。

# その他のルール
- 既存の記憶を土台に、新情報を追記。矛盾は新しい方へ更新。重複は統合。
- 淡々と事実ベース・箇条書き中心。全体で${MEMORY_MAX_CHARS}字以内。
- メモ本文だけを出力する（前置き・後書き不要）。`;

  const userMsg = `# 現在の記憶
${opts.currentMemory || '(まだ何も覚えていない)'}

# 最近の会話
${transcript}

# 更新後の記憶（本文のみ）`;

  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      // 4000字の記憶が途中で切れないだけの出力余裕を確保（旧800では尻切れが起きていた）
      max_tokens: 3000,
      system,
      messages: [{ role: 'user', content: userMsg }],
    });
    const txt = res.content[0]?.type === 'text' ? res.content[0].text.trim() : '';
    return txt ? txt.slice(0, MEMORY_MAX_CHARS) : null;
  } catch (e) {
    console.warn('memory distill failed:', (e as Error)?.message);
    return null;
  }
}

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { checkUserAccess } from '@/lib/auth';
import { isLaunchFreeActive } from '@/lib/launch';
import { buildProfileFromUser } from '@/lib/engine/profile';
import { computeDailyState } from '@/lib/engine/daily';
import { summarizeDaily, summarizeProfile } from '@/lib/engine/summarize';
import { characterToneBlock } from '@/lib/character';
import { jstDateKey, jstDateLabel } from '@/lib/jst';
import type { DailyContent, DailyLogEnvelope, DailyReadingContent } from '@/types';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseEnvelope(raw?: string | null): DailyLogEnvelope {
  if (!raw) return {};
  const parsed = JSON.parse(raw) as DailyContent | DailyLogEnvelope;
  return 'theme' in parsed ? { daily: parsed } : parsed;
}

async function getStatus(userId: string) {
  const access = await checkUserAccess(userId);
  if (!access.ok) return access;
  const date = jstDateKey();
  const log = await prisma.dailyLog.findUnique({ where: { userId_date: { userId, date } } });
  const reading = parseEnvelope(log?.data).reading ?? null;
  const launchFree = isLaunchFreeActive();
  return {
    ok: true as const,
    user: access.user,
    date,
    reading,
    included: access.user.isPremium || launchFree,
    launchFree,
  };
}

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
  const current = await getStatus(userId);
  if (!current.ok) return NextResponse.json({ error: current.error }, { status: current.status });
  return NextResponse.json({
    reading: current.reading,
    tickets: current.user.tickets,
    included: current.included,
    launchFree: current.launchFree,
    canCreate: current.included || current.user.tickets > 0,
  });
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    const current = await getStatus(userId);
    if (!current.ok) return NextResponse.json({ error: current.error }, { status: current.status });
    if (current.reading) {
      return NextResponse.json({ reading: current.reading, tickets: current.user.tickets, reused: true });
    }
    if (!current.included && current.user.tickets < 1) {
      return NextResponse.json({
        error: 'ticket required',
        upgradeRequired: true,
        message: '今日の鑑定には鑑定チケットが1枚必要です。',
      }, { status: 402 });
    }
    if (!current.user.birthDate) {
      return NextResponse.json({ error: 'プロフィールを完成させてから鑑定できます。' }, { status: 422 });
    }

    const profile = buildProfileFromUser(current.user);
    if (!profile) return NextResponse.json({ error: 'プロフィールを読み込めませんでした。' }, { status: 422 });
    const facts = summarizeProfile(profile);
    const daily = summarizeDaily(computeDailyState(profile));
    const dateLabel = jstDateLabel();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1800,
      system: `あなたはOrba。複数の占術データと今日の運気を重ね、ユーザーのための「今日の鑑定」を読む。
${characterToneBlock(current.user.characterType)}
断定や恐怖を煽る表現を避け、現実の選択肢を狭めない。医療・法律・投資などの重大判断は専門家と現実情報を優先する。与えられたデータだけを根拠にし、構造化ツールで返す。`,
      tools: [{
        name: 'deliver_daily_reading',
        description: '今日の鑑定を構造化して返す',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '今日の鑑定タイトル（10〜18文字）' },
            opening: { type: 'string', description: '今日の輪郭をひらく導入（60〜100字）' },
            overall: { type: 'string', description: '今日全体の流れ（100〜160字）' },
            work: { type: 'string', description: '仕事・学び・作業の流れ（80〜130字）' },
            relationships: { type: 'string', description: '人間関係・会話の流れ（80〜130字）' },
            inner: { type: 'string', description: '心の内側と整え方（80〜130字）' },
            timing: { type: 'string', description: '動く時間と待つ時間の見極め（70〜110字）' },
            action: { type: 'string', description: '今日できる具体的な一歩（50〜90字）' },
            closing: { type: 'string', description: '相棒からの短い結び（30〜60字）' },
          },
          required: ['title', 'opening', 'overall', 'work', 'relationships', 'inner', 'timing', 'action', 'closing'],
        },
      }],
      tool_choice: { type: 'tool', name: 'deliver_daily_reading' },
      messages: [{ role: 'user', content: `# 日付\n${dateLabel}\n\n# プロフィール\n${facts}\n\n# 今日の運気\n${daily}\n\nこの人の今日を、生活で使える言葉に読み解いてください。` }],
    });
    const block = response.content.find((item) => item.type === 'tool_use');
    if (!block || block.type !== 'tool_use') throw new Error('structured reading missing');
    const reading: DailyReadingContent = { date: current.date, ...(block.input as Omit<DailyReadingContent, 'date'>) };

    const saved = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) return { kind: 'missing' as const };
      const log = await tx.dailyLog.findUnique({ where: { userId_date: { userId, date: current.date } } });
      const envelope = parseEnvelope(log?.data);
      if (envelope.reading) return { kind: 'existing' as const, reading: envelope.reading, tickets: user.tickets };
      const included = user.isPremium || isLaunchFreeActive();
      if (!included && user.tickets < 1) return { kind: 'ticket' as const };
      const tickets = included ? user.tickets : user.tickets - 1;
      if (!included) await tx.user.update({ where: { id: userId }, data: { tickets: { decrement: 1 } } });
      const data = JSON.stringify({ ...envelope, reading } satisfies DailyLogEnvelope);
      await tx.dailyLog.upsert({
        where: { userId_date: { userId, date: current.date } },
        create: { userId, date: current.date, data },
        update: { data },
      });
      return { kind: 'created' as const, reading, tickets };
    });

    if (saved.kind === 'missing') return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (saved.kind === 'ticket') return NextResponse.json({ error: 'ticket required', upgradeRequired: true }, { status: 402 });
    return NextResponse.json({ reading: saved.reading, tickets: saved.tickets, reused: saved.kind === 'existing' });
  } catch (error) {
    console.error('daily reading error:', error);
    return NextResponse.json({ error: '今日の鑑定を読みきれませんでした。少し時間をおいて、もう一度お試しください。' }, { status: 500 });
  }
}

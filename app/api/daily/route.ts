import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { type DailyContent, type DailyLogEnvelope } from '@/types';
import { buildProfileFromUser } from '@/lib/engine/profile';
import { computeDailyState } from '@/lib/engine/daily';
import { summarizeProfile, summarizeDaily } from '@/lib/engine/summarize';
import { characterToneBlock } from '@/lib/character';
import { checkUserAccess } from '@/lib/auth';
import { jstDateKey } from '@/lib/jst';
import { AI_SAFETY_PROMPT, reviewAiGeneratedValue } from '@/lib/ai-safety';
import { recordAiSafetyEvent } from '@/lib/ai-safety-log';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const access = await checkUserAccess(userId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const today = jstDateKey();

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { dailyLogs: { where: { date: today } } }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        let envelope: DailyLogEnvelope = {};
        if (user.dailyLogs.length > 0) {
            const stored = JSON.parse(user.dailyLogs[0].data) as DailyContent | DailyLogEnvelope;
            if ('theme' in stored) return NextResponse.json(stored);
            envelope = stored;
            if (envelope.daily) return NextResponse.json(envelope.daily);
        }
        if (!user.birthDate) {
            return NextResponse.json({ error: 'Profile incomplete' }, { status: 422 });
        }

        const language = user.language || 'ja';
        const langName = language === 'en' ? 'English' : language === 'es' ? 'Spanish' : 'Japanese';

        // ★ 出生図と今日の運気を実計算
        const profile = buildProfileFromUser(user)!;
        const daily = computeDailyState(profile);
        const factSheet = summarizeProfile(profile);
        const dailySheet = summarizeDaily(daily);

        const systemPrompt = `あなたはユーザー専属のライフパートナーAI。
${characterToneBlock(user.characterType)}
# ルール
- 下の占術データ・運気データは天体暦による実計算。**自分で計算し直さず、その数値を根拠に**今日の指針を語る。
- 与えられた「総合運/攻め守り/月相/今日の宿/効いているトランジット」を必ず反映し、毎日内容が変わるようにする。
- 占いを前面に出しすぎず、相棒として自然に。ネガティブは対処とセット。
- JSONのみ。必ず${langName}で。
${AI_SAFETY_PROMPT}`;

        const userMessage = `${factSheet}\n\n${dailySheet}\n\n上の運気データを踏まえ、deliver_daily ツールで今日の指針を返してください。`;

        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: systemPrompt,
            tools: [{
                name: 'deliver_daily',
                description: '今日の指針を構造化して返す',
                input_schema: {
                    type: 'object',
                    properties: {
                        theme: { type: 'string', description: '今日のテーマ（5-10文字）' },
                        guidance: { type: 'string', description: '今日の指針。効いているトランジットや今日の宿を踏まえた具体的洞察（2-3文）' },
                        timing: { type: 'string', description: '今日は【攻め】または【守り】。総合運の数値と理由を1文で' },
                        action: { type: 'string', description: '今日できる具体的アクション1つ（抽象論禁止）' },
                        affirmation: { type: 'string', description: '今日このユーザーに最も必要な一言（20文字以内）' },
                    },
                    required: ['theme', 'guidance', 'timing', 'action', 'affirmation'],
                },
            }],
            tool_choice: { type: 'tool', name: 'deliver_daily' },
            messages: [{ role: 'user', content: userMessage }]
        });

        const toolUse = response.content.find((c) => c.type === 'tool_use');
        if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No structured output');

        const safetyOutput = reviewAiGeneratedValue(toolUse.input as DailyContent);
        if (safetyOutput.flagged) {
            await recordAiSafetyEvent({
                userId,
                route: 'daily',
                phase: 'output',
                action: 'output_rewritten',
                ruleIds: safetyOutput.ruleIds,
            });
        }
        const parsed = safetyOutput.value;
        const data = JSON.stringify({ ...envelope, daily: parsed } satisfies DailyLogEnvelope);
        await prisma.dailyLog.upsert({
            where: { userId_date: { userId, date: today } },
            create: { userId, date: today, data },
            update: { data },
        });
        return NextResponse.json(parsed);

    } catch (error) {
        console.error('Error in /api/daily:', error);
        return NextResponse.json({ error: 'Failed to generate daily content' }, { status: 500 });
    }
}

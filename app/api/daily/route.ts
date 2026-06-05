import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { type DailyContent } from '@/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                diagnoses: { orderBy: { createdAt: 'desc' }, take: 1 },
                dailyLogs: { where: { date: today } }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 当日キャッシュヒット
        if (user.dailyLogs.length > 0) {
            return NextResponse.json(JSON.parse(user.dailyLogs[0].data));
        }

        if (!user.birthDate) {
            return NextResponse.json({ error: 'Profile incomplete' }, { status: 422 });
        }

        const language = user.language || 'ja';
        const langName = language === 'en' ? 'English' : language === 'es' ? 'Spanish' : 'Japanese';
        const latestDiagnosis = user.diagnoses[0];
        const coreProfile = latestDiagnosis ? JSON.parse(latestDiagnosis.data) : null;

        const todayFormatted = new Date().toLocaleDateString(
            language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'ja-JP',
            { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
        );

        const systemPrompt = `あなたはユーザーの専属ライフパートナーAIです。
毎日の指針を提供する際は：
- 挨拶・前置き禁止。本題から開始。
- 標準的な敬語（です・ます調）。
- ハルシネーション禁止。ユーザーのプロフィールと今日の日付のみ根拠にする。
- 毎日内容が変わるよう、日付・曜日・月齢を必ず反映する。
- JSONのみ出力。必ず${langName}で。`;

        const userMessage = `# ユーザープロフィール
名前: ${user.name}
生年月日: ${user.birthDate}${user.birthTime ? ' ' + user.birthTime : ''}
出生地: ${user.birthPlace || '不明'}
性別: ${user.gender || '不明'}
${coreProfile ? `\n# 魂のプロファイリング（参照）\n本質: ${coreProfile.coreNature}\n行動戦略: ${coreProfile.strategy}` : ''}

# 今日の日付
${todayFormatted}

# 出力形式 (JSON)
\`\`\`json
{
  "theme": "今日のテーマ（5-10文字）",
  "guidance": "今日の指針。プロフィールと今日の日付を組み合わせた具体的な洞察（2-3文）",
  "timing": "今日は【攻め】または【守り】。理由を1文で。",
  "action": "今日実行できる具体的なアクション1つ（抽象論禁止）",
  "affirmation": "今日このユーザーに最も必要な一言（20文字以内）"
}
\`\`\``;

        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid response format');

        const parsed: DailyContent = JSON.parse(jsonMatch[0]);

        await prisma.dailyLog.create({
            data: { userId, date: today, data: JSON.stringify(parsed) }
        });

        return NextResponse.json(parsed);

    } catch (error) {
        console.error('Error in /api/daily:', error);
        return NextResponse.json({ error: 'Failed to generate daily content' }, { status: 500 });
    }
}

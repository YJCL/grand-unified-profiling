import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { type UserProfile, type Question } from '@/types';
import { QUESTIONS } from '@/data/questions';
import { buildGrandProfile } from '@/lib/engine/profile';
import { summarizeProfile } from '@/lib/engine/summarize';
import { characterToneBlock } from '@/lib/character';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 深い鑑定の生成は時間がかかるため、関数タイムアウトを延長
export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const userProfile: UserProfile = body.userProfile;

        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 });
        }

        const language = userProfile.language || 'ja';
        const langName = language === 'en' ? 'English' : language === 'es' ? 'Spanish' : 'Japanese';

        // ★ 占術データは天体暦で実計算（LLMには計算させない）
        const profile = buildGrandProfile({
            name: userProfile.name,
            birthDate: userProfile.birthDate,
            birthTime: userProfile.birthTime || undefined,
            birthPlace: userProfile.birthPlace || undefined,
            gender: userProfile.gender || undefined,
        });
        const factSheet = summarizeProfile(profile);

        // 心理テスト回答は補助的なヒントとして添える
        const answersText = (userProfile.answers || []).map(ans => {
            const q = QUESTIONS.find((q: Question) => q.id === ans.questionId);
            if (!q) return '';
            const selectedText = ans.selected === 'A' ? q.optionA[language] : q.optionB[language];
            return `Q${q.id}[${q.type}]: ${selectedText}`;
        }).filter(Boolean).join('\n');

        const psychoText = [
            userProfile.mbti ? `MBTI=${userProfile.mbti}` : '',
            userProfile.enneagram ? `エニアグラム=タイプ${userProfile.enneagram}` : '',
        ].filter(Boolean).join(' / ');

        const systemPrompt = `# 役割
あなたは古今東西のあらゆる占術・心理学・統計を統合する「グランド・ユニファイド・フォーチュン」。
ユーザーの人生に寄り添う唯一無二のパーソナルパートナーです。
${characterToneBlock(userProfile.characterType)}

# 最重要ルール
- 占術データ（星座・度数・干支・ヒューマンデザイン等）は**すでに天体暦で正確に計算済み**で下に与えられる。**絶対に自分で計算し直さない・推測で別の値を作らない**。与えられた数値・配置のみを根拠に解釈する。
- 断片を羅列せず、各体系が示す共通点と矛盾を**統合**し、その人だけの一本筋の通った像を描く。
- 矛盾時の優先順位: 行動指針→ヒューマンデザインのタイプ＆権威を最優先 / 性格→エニアグラムの動機を核にMBTIを表層の武器として解釈 / タイミング→東洋の年運月運×西洋トランジット。
- ネガティブな断定的予言は禁止。必ず「活かし方・対処」とセットで。
- 出力テキストは必ず ${langName} で書く。deliver_reading ツールで結果を返すこと。`;

        const userMessage = `## 相談者
名前: ${userProfile.name} / 性別: ${userProfile.gender || '不明'} / 現在の悩み: ${userProfile.currentWorry || '特になし'}
${psychoText ? '自己申告: ' + psychoText : ''}

${factSheet}

${answersText ? '## 心理テスト傾向（補助）\n' + answersText : ''}

上記のデータを統合し、deliver_reading ツールで鑑定結果を返してください。`;

        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2048,
            system: systemPrompt,
            tools: [{
                name: 'deliver_reading',
                description: '統合鑑定の結果を構造化して返す',
                input_schema: {
                    type: 'object',
                    properties: {
                        coreNature: { type: 'string', description: '【魂のプロファイリング】データを統合した本質・才能・行動原理。日主とHD、太陽月のサインを織り込み、サビアン度数で詩的に締める（300文字程度）' },
                        strategy: { type: 'string', description: '【最強の戦略】HDのタイプ＆権威に基づく意思決定と動き方を断言（200文字程度）' },
                        timing: { type: 'string', description: '【現在の運気】今が攻めか守りかを明確に。根拠に触れる（150文字程度）' },
                        advice: { type: 'string', description: '【具体的ソリューション】悩みに対し明日から実行できる具体策（200文字程度）' },
                        dailyTheme: { type: 'string', description: '今日のテーマ（10文字以内）' },
                        luckyAction: { type: 'string', description: '今日の具体的アクション（1つ）' },
                    },
                    required: ['coreNature', 'strategy', 'timing', 'advice', 'dailyTheme', 'luckyAction'],
                },
            }],
            tool_choice: { type: 'tool', name: 'deliver_reading' },
            messages: [{ role: 'user', content: userMessage }]
        });

        const toolUse = response.content.find((c) => c.type === 'tool_use');
        if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No structured output');

        return NextResponse.json(toolUse.input);

    } catch (error) {
        console.error('Error generating fortune:', error);
        return NextResponse.json({ error: 'Failed to generate fortune' }, { status: 500 });
    }
}

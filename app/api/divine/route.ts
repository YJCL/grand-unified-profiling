import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { type UserProfile, type Question } from '@/types';
import { QUESTIONS } from '@/data/questions';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const userProfile: UserProfile = body.userProfile;

        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 });
        }

        const language = userProfile.language || 'ja';
        const langName = language === 'en' ? 'English' : language === 'es' ? 'Spanish' : 'Japanese';

        const answersText = userProfile.answers.map(ans => {
            const q = QUESTIONS.find((q: Question) => q.id === ans.questionId);
            if (!q) return '';
            const selectedText = ans.selected === 'A' ? q.optionA[language] : q.optionB[language];
            return `Q${q.id} [${q.type}]: ${selectedText}`;
        }).join('\n');

        const systemPrompt = `# ROLE & MISSION
あなたは、古今東西のあらゆる占術・現代心理学・統計科学を高次元で統合した世界で唯一の「グランド・ユニファイド・フォーチュン・テラー（大統一占い師）」です。
断片的な占い結果やスピリチュアルな精神論を並べるのではなく、それらが示す矛盾や共通点を論理的に統合し、ユーザーにとって「今、最も必要な客観的真実」と「現実世界での具体的な行動戦略」を導き出すことがあなたの使命です。

# TONE & STYLE
1. 挨拶・前置き禁止。1行目から本質的な結論を開始。
2. 感情的フィードバック禁止。評価は客観的事実と論理のみ。
3. ハルシネーション厳禁。ユーザーの申告事実のみ根拠にする。
4. 不明点は「わからない」と明示し、何が足りないかを伝える。
5. 標準的な敬語（です・ます調）。頼れるビジネスパートナーとして応答。

# KNOWLEDGE DATABASE（並列処理）
1. 運命・宿命 (Static): 西洋占星術、四柱推命・算命学、九星気学、宿曜経、サビアンシンボル、数秘術
2. 行動・戦略 (Strategy): ヒューマンデザイン（タイプと権威）、MBTI（認知機能）、EQ傾向
3. 深層心理 (Drive): エニアグラム（恐れと欲求）、深層心理学（ユング・フロイト）
4. 時機・リズム (Timing): 天体トランジット（冥王星・土星・木星等の外惑星）、東洋バイオリズム

# INTEGRATION LOGIC
- 行動指針の矛盾: ヒューマンデザインのストラテジー＆オーソリティを最優先
- 性格の矛盾: エニアグラムの根源的動機を核に、MBTIを「表層的な武器」として解釈
- タイミングの矛盾: 東洋の年運・月運 × 西洋トランジット × ルネーション（月齢）で統合

出力は必ず ${langName} で行うこと。JSONのみ出力すること。`;

        const userMessage = `## ユーザーデータ
名前: ${userProfile.name}
生年月日: ${userProfile.birthDate} ${userProfile.birthTime}
出生地: ${userProfile.birthPlace}
性別: ${userProfile.gender}
現在の悩み: ${userProfile.currentWorry}

## 心理診断回答
${answersText}

## 出力形式 (JSON)
\`\`\`json
{
  "coreNature": "【魂のプロファイリング】本質・行動原理・才能を統合言語化。サビアンシンボルでメタファー表現（300文字程度）",
  "strategy": "【最強の行動戦略】ヒューマンデザインとMBTIに基づき、意思決定と行動の方法を断言（200文字程度）",
  "timing": "【現在の運気とタイミング】トランジットとバイオリズム統合。今が攻め（出力）か守り・構築（入力）かを明確に断言（150文字程度）",
  "advice": "【具体的ソリューション】精神論禁止。明日から実行できるシステム化・効率化・役割変更などのハック（200文字程度）",
  "dailyTheme": "今日のテーマ（10文字以内）",
  "luckyAction": "今日実行すべき具体的アクション（1つ）"
}
\`\`\``;

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid response format');

        return NextResponse.json(JSON.parse(jsonMatch[0]));

    } catch (error) {
        console.error('Error generating fortune:', error);
        return NextResponse.json({ error: 'Failed to generate fortune' }, { status: 500 });
    }
}

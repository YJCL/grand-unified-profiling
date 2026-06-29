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
        let factSheet: string;
        try {
            const profile = buildGrandProfile({
                name: userProfile.name,
                birthDate: userProfile.birthDate,
                birthTime: userProfile.birthTime || undefined,
                birthPlace: userProfile.birthPlace || undefined,
                gender: userProfile.gender || undefined,
            });
            factSheet = summarizeProfile(profile);
        } catch (e) {
            throw new Error(`engine(${userProfile.birthDate}/${userProfile.birthTime}/${userProfile.birthPlace}): ${e instanceof Error ? e.message : String(e)}`);
        }

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
あなたは古今東西のあらゆる占術・心理学・統計を統合する「Orba（オーバ）」。
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

        // ── ① 本質部分（既存）＋ ② signature / compass を1回のtool_useで返してもらう ──
        // 直感パートは五行・星座から根拠付きで生成する必要があるので、tool schemaに併せて記述。
        const tools: Anthropic.Tool[] = [{
            name: 'deliver_reading',
            description: '統合鑑定の結果を構造化して返す',
            input_schema: {
                type: 'object',
                properties: {
                    summary: { type: 'string', description: 'シェア用の一言キャッチ。その人を一言で言い表す、親しみやすく少しドキッとする短文（20〜40文字・句点なし）。例:「静かな海に、噴火を秘めた人」' },
                    coreNature: { type: 'string', description: '【魂のプロファイリング】データを統合した本質・才能・行動原理。日主とHD、太陽月のサインを織り込み、サビアン度数で詩的に締める（300文字程度）' },
                    strategy: { type: 'string', description: '【最強の戦略】HDのタイプ＆権威に基づく意思決定と動き方を断言（200文字程度）' },
                    timing: { type: 'string', description: '【現在の運気】今が攻めか守りかを明確に。根拠に触れる（150文字程度）' },
                    advice: { type: 'string', description: '【具体的ソリューション】悩みに対し明日から実行できる具体策（200文字程度）' },
                    dailyTheme: { type: 'string', description: '今日のテーマ（10文字以内）' },
                    luckyAction: { type: 'string', description: '今日の具体的アクション（1つ）' },

                    signature: {
                        type: 'object',
                        description: '直感的な「色と数字」セクション。五行・星座・月相から根拠付きで選定する。',
                        properties: {
                            lead: { type: 'string', description: '小見出し（8〜14字）。例「あなたの色、あなたの数」' },
                            colors: {
                                type: 'array',
                                description: 'KEY / ACCENT / SHADOW の3色（必ずこの順）。',
                                items: {
                                    type: 'object',
                                    properties: {
                                        role: { type: 'string', enum: ['KEY','ACCENT','SHADOW'] },
                                        name: { type: 'string', description: '色名（5〜9字）。例:「夜明け前の紫紺」「燭台の金」' },
                                        hex:  { type: 'string', description: '#RRGGBB 6桁。色相は占術根拠（五行・星座・月相）に紐づく。' },
                                        why:  { type: 'string', description: 'なぜこの色がこの人の核か（60〜90字）' },
                                        use:  { type: 'string', description: 'どう使うと良いか（30〜50字）' },
                                    },
                                    required: ['role','name','hex','why','use'],
                                },
                            },
                            number: {
                                type: 'object',
                                properties: {
                                    main: { type: 'integer', minimum: 1, maximum: 9 },
                                    sub:  { type: 'integer', minimum: 1, maximum: 9 },
                                    why:  { type: 'string', description: 'なぜこの数字があなたを支えるか（60〜90字）' },
                                },
                                required: ['main','sub','why'],
                            },
                            items: {
                                type: 'array',
                                description: '象徴アイテム3つ。素材・場所・時間帯どれかを1つずつ（10〜20字）。',
                                items: { type: 'string' },
                            },
                        },
                        required: ['lead','colors','number','items'],
                    },

                    compass: {
                        type: 'object',
                        description: '行動アドバイスの「羅針盤」。3シーン分のお守りの言葉と具体的アクション。',
                        properties: {
                            lead: { type: 'string', description: '小見出し（8〜14字）。例「あなたの羅針盤」' },
                            lost: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string', description: '6〜10字。例「迷ったとき」' },
                                    word: { type: 'string', description: 'お守りの一言（20〜35字）' },
                                    steps: { type: 'array', description: '具体的アクション3つ（各25〜40字・命令形・主語あなた）', items: { type: 'string' } },
                                    anchor: { type: 'string', description: '占術的な根拠の一言（30〜50字）' },
                                },
                                required: ['title','word','steps','anchor'],
                            },
                            anxious: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string' }, word: { type: 'string' },
                                    steps: { type: 'array', items: { type: 'string' } },
                                    anchor: { type: 'string' },
                                },
                                required: ['title','word','steps','anchor'],
                            },
                            stepping: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string' }, word: { type: 'string' },
                                    steps: { type: 'array', items: { type: 'string' } },
                                    anchor: { type: 'string' },
                                },
                                required: ['title','word','steps','anchor'],
                            },
                        },
                        required: ['lead','lost','anxious','stepping'],
                    },
                },
                required: ['summary', 'coreNature', 'strategy', 'timing', 'advice', 'dailyTheme', 'luckyAction', 'signature', 'compass'],
            },
        }];

        // signature/compass を含めると応答が長くなるため max_tokens を増やす。
        // 本質パートはHaikuで十分・直感パートは根拠付き選定が要るのでSonnetに昇格。
        let toolUse: Anthropic.ToolUseBlock | undefined;
        let lastErr: unknown;
        for (let i = 0; i < 3; i++) {
            try {
                const response = await anthropic.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 4096,
                    system: systemPrompt,
                    tools,
                    tool_choice: { type: 'tool', name: 'deliver_reading' },
                    messages: [{ role: 'user', content: userMessage }],
                });
                const block = response.content.find((c) => c.type === 'tool_use');
                if (block && block.type === 'tool_use') { toolUse = block; break; }
                lastErr = new Error('No tool_use in response');
            } catch (e) {
                lastErr = e;
            }
            await new Promise((r) => setTimeout(r, 600));
        }

        if (!toolUse) throw lastErr ?? new Error('No structured output');
        return NextResponse.json(toolUse.input);

    } catch (error) {
        console.error('Error generating fortune:', error);
        return NextResponse.json(
            { error: 'Failed to generate fortune', detail: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

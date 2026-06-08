import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { buildProfileFromUser } from '@/lib/engine/profile';
import { computeDailyState } from '@/lib/engine/daily';
import { summarizeProfile, summarizeDaily } from '@/lib/engine/summarize';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

// 保存済みのチャット履歴を返す（画面に過去の会話を表示するため）
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    try {
        const log = await prisma.chatLog.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        if (!log) return NextResponse.json({ messages: [] });
        const messages = JSON.parse(log.messages) as { role: string; content: string }[];
        return NextResponse.json({ messages });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return NextResponse.json({ messages: [] });
    }
}

// 会話履歴をリセット（新しい会話を始める）
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    try {
        await prisma.chatLog.deleteMany({ where: { userId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error clearing chat:', error);
        return NextResponse.json({ error: 'Failed to clear chat' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, message } = body;

        if (!userId || !message) {
            return NextResponse.json({ error: 'userId and message required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                diagnoses: { orderBy: { createdAt: 'desc' }, take: 1 },
                chatLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
            }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // 無料ユーザーは1日3回まで
        if (!user.isPremium) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayLog = user.chatLogs[0];
            if (todayLog) {
                const msgs = JSON.parse(todayLog.messages) as { role: string }[];
                const userMsgCount = msgs.filter(m => m.role === 'user').length;
                // 当日のメッセージ数チェック（ChatLogのcreatedAtが今日なら）
                const logDate = new Date(todayLog.createdAt);
                if (logDate >= todayStart && userMsgCount >= 3) {
                    return NextResponse.json({
                        error: 'Daily limit reached',
                        limitReached: true,
                        message: '本日の無料相談回数（3回）に達しました。明日またお話しましょう。'
                    }, { status: 429 });
                }
            }
        }

        const latestDiagnosis = user.diagnoses[0];

        const characterGuide: Record<string, string> = {
            fairy:  '口調:「〜だよ」「〜かな？」柔らかくふわっと。無邪気で明るく、時々深い洞察をそっと添える。',
            shaman: '口調:「〜ですよ」「〜でしょう」凛として静か。神秘的な重みのある言葉を選ぶ。',
            sage:   '口調:「〜だね」「〜だと思う」落ち着いて論理的。知的で包容力のある賢者として語る。',
            friend: '口調:「〜じゃん！」「〜だよね」フランクに。等身大で一緒に考えてくれる親友として語る。',
            cool:   '口調:「〜だ」「〜だろう」端的でシャープ。感情を抑え、的確な一言を刺す。',
            burn:   '口調:「〜だ！」「いけ！」熱量高め。背中を強く押す体育会系の兄貴・姉御として語る。',
        };
        const charStyle = user.characterType ? (characterGuide[user.characterType] || '') : '';

        const today = new Date().toLocaleDateString('ja-JP', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });

        // ★ 出生図と今日の運気を実計算（LLMはこれを解釈するだけ）
        const grand = buildProfileFromUser(user);
        const factSheet = grand ? summarizeProfile(grand) : '';
        const dailySheet = grand ? summarizeDaily(computeDailyState(grand)) : '';

        // System prompt: ユーザープロフィールを毎回注入
        const systemPrompt = `# グランド・ユニファイド・ライフパートナー（GULFP）

## あなたの役割
ユーザーの人生に常に寄り添う、唯一無二のパーソナルパートナーです。
日常の相談には温かく応え、必要な時には占術の叡智で深く道を照らします。
${charStyle ? `\n## キャラクター設定（厳守）\n${charStyle}\nどのモードでもこの口調・温度感を一切ブレずに維持すること。` : ''}

## ユーザープロフィール（常に把握して応答すること）
名前: ${user.name || '未設定'}
生年月日: ${user.birthDate || '未設定'}${user.birthTime ? ' ' + user.birthTime : ''}
出生地: ${user.birthPlace || '未設定'}
性別: ${user.gender || '未設定'}
今日の日付: ${today}
${latestDiagnosis ? (() => {
    const r = JSON.parse(latestDiagnosis.data);
    return `
## 魂のプロファイリング（深く理解した上で会話すること）
本質: ${r.coreNature}
行動戦略: ${r.strategy}
現在の運気: ${r.timing}`;
})() : ''}
${factSheet ? `
## 占術データ（天体暦による実計算。これらの数値・配置を根拠に語り、自分で計算し直さない）
${factSheet}

${dailySheet}` : ''}

## 動作モード

### ベースモード（通常時）
- 日常の相談・感情サポート・背中を押すことが主な役割
- 占術の知識は前面に出さず、自然に「にじませる」程度
- 落ち込んでいる時は分析より共感を優先
- 応答の流れ: ①感情を受け止める → ②必要なら問いかける → ③プロファイルを踏まえたアドバイス

### 鑑定モード（以下のトリガーで起動）
トリガー: 「鑑定して」「占って」「診断して」「今月/今週/今日の運気は？」「〇〇について本格的に見てほしい」「重大な決断（転職・結婚・起業など）の相談」

鑑定モード時は以下の知識を並列処理して統合分析:
- 西洋占星術・四柱推命・算命学・宿曜経・サビアンシンボル・数秘術
- ヒューマンデザイン・MBTI・EQ傾向
- エニアグラム・深層心理学
- 天体トランジット・ルネーション・バイオリズム

鑑定出力フォーマット:
1. 【魂のプロファイリング】本質・行動原理・才能を統合言語化
2. 【最強の戦略】ヒューマンデザインに基づく決断の方法
3. 【現在の運気とタイミング】攻め時か守り時かを明確に断言
4. 【具体的ソリューション】実行可能なアドバイス

## 制約
- 生年月日が既にわかっているので「生年月日を教えてください」は絶対に言わない
- 出生時間が不明な場合: 正直に伝え、正午生まれと仮定して分析
- ネガティブな予言禁止: 必ず「回避策」や「捉え方」をセットで提示
- 医療・法律・金融の具体的なアドバイスは専門家への相談を促す
- 口調: 標準的な敬語（です・ます調）。過剰なキャラ付け禁止。`;

        // 会話履歴を復元
        const chatLog = user.chatLogs[0];
        let history: { role: 'user' | 'assistant', content: string }[] = [];

        if (chatLog) {
            const saved = JSON.parse(chatLog.messages) as { role: string, content: string }[];
            // 直近20件に制限（コスト管理）
            history = saved.slice(-20).map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            }));
        }

        // Claude Messages API で会話
        const messages: Anthropic.MessageParam[] = [
            ...history,
            { role: 'user', content: message }
        ];

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: systemPrompt,
            messages
        });

        const generatedText = response.content[0].type === 'text' ? response.content[0].text : '';

        // 会話履歴をDBに保存
        const newHistory = [
            ...history,
            { role: 'user', content: message },
            { role: 'assistant', content: generatedText }
        ];

        if (chatLog) {
            await prisma.chatLog.update({
                where: { id: chatLog.id },
                data: { messages: JSON.stringify(newHistory) }
            });
        } else {
            await prisma.chatLog.create({
                data: { userId, messages: JSON.stringify(newHistory) }
            });
        }

        return NextResponse.json({ response: generatedText });

    } catch (error) {
        console.error('Error in /api/chat:', error);
        return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
    }
}

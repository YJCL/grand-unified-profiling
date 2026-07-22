import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { buildProfileFromUser } from '@/lib/engine/profile';
import { computeDailyState } from '@/lib/engine/daily';
import { summarizeProfile, summarizeDaily } from '@/lib/engine/summarize';
import { checkUserAccess } from '@/lib/auth';
import { isLaunchFreeActive } from '@/lib/launch';
import { distillMemory } from '@/lib/memory';
import { jstDateKey, jstStamp } from '@/lib/jst';

// 文脈としてモデルに渡す直近メッセージ数（コスト管理）。それより前は memory に蒸留済み。
// 旧12（=6往復）は「数分前の話を忘れる」体験を生んだため拡大。
// システムプロンプトにprompt cachingを効かせるので、実コスト増は限定的。
const CONTEXT_WINDOW_PAID = 40;  // Sonnet: 20往復
const CONTEXT_WINDOW_FREE = 16;  // Haiku: 8往復
// 保存する会話履歴の最大数（暴走防止。これを超える古い分は memory が保持）。
const STORED_MAX = 240;
// 何メッセージごとに memory を更新するか（その日の利用回数ベース。
// 旧実装の「保存件数÷2 % 3」はcap到達後に永久に蒸留が止まるバグがあった）。
const MEMORY_EVERY_TURNS = 3;

const FREE_DAILY_LIMIT = 3;
// 全プラン共通のフェアユース上限（プレミアム/無料開放でも適用）。
// 濫用・暴走・API費用の青天井を防ぐ安全弁。通常利用ではまず当たらない。
const ABUSE_DAILY_CAP = 50;
// 1通あたりの入力文字数の上限（巨大入力によるトークン濫用を防ぐ）。
const MAX_MESSAGE_CHARS = 2000;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

// 保存済みのチャット履歴を返す（画面に過去の会話を表示するため）
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const access = await checkUserAccess(userId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    try {
        const log = await prisma.chatLog.findFirst({
            where: { userId: userId! },
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
// ※ 会話の「記憶(memory)」は消さない。むしろ消す前に最後の蒸留を行い、
//   次の会話でも Orba が相手を覚えているようにする。
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const access = await checkUserAccess(userId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    try {
        const log = await prisma.chatLog.findFirst({ where: { userId: userId! }, orderBy: { createdAt: 'desc' } });
        if (log) {
            try {
                const msgs = JSON.parse(log.messages) as { role: string; content: string; ts?: string }[];
                if (msgs.length > 0) {
                    const mem = await distillMemory({ currentMemory: access.user.memory || '', recent: msgs.slice(-16), userName: access.user.name });
                    if (mem) await prisma.user.update({ where: { id: userId! }, data: { memory: mem } });
                }
            } catch { /* 蒸留失敗は無視して削除は続行 */ }
        }
        await prisma.chatLog.deleteMany({ where: { userId: userId! } });
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
        if (typeof message !== 'string' || message.length > MAX_MESSAGE_CHARS) {
            return NextResponse.json({
                error: 'message too long',
                message: 'メッセージが少し長すぎるみたい。もう少し短く分けて送ってくれる？',
            }, { status: 400 });
        }

        const access = await checkUserAccess(userId);
        if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                diagnoses: { orderBy: { createdAt: 'desc' }, take: 1 },
                chatLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
            }
        });

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // 日次カウンタはJST基準（UTCだとJSTの朝9時にリセットされてしまう）
        const todayKey = jstDateKey();
        const usedToday = user.chatDate === todayKey ? user.chatUsed : 0;
        // プレミアム or ローンチ無料開放中は「通常の無料上限(3回)」が無い
        const unlimited = user.isPremium || isLaunchFreeActive();

        // 1) フェアユース上限（全プラン共通・コスト暴走/濫用の安全弁）
        if (usedToday >= ABUSE_DAILY_CAP) {
            return NextResponse.json({
                error: 'fair use limit',
                message: '今日はたくさん話せたね。少し休憩して、また明日ゆっくり続きを話そう🌙',
            }, { status: 429 });
        }

        // 2) 無料ユーザーの通常上限（プレミアム/無料開放は対象外）。超過時はチケット1消費。
        if (!unlimited && usedToday >= FREE_DAILY_LIMIT) {
            if (user.tickets > 0) {
                await prisma.user.update({ where: { id: userId }, data: { tickets: { decrement: 1 } } });
            } else {
                return NextResponse.json({
                    error: 'Daily limit reached',
                    limitReached: true,
                    message: `本日の無料相談回数（${FREE_DAILY_LIMIT}回）に達しました。シェアやログインボーナスでチケットを集めると追加で相談できます。プレミアムなら無制限です。`
                }, { status: 429 });
            }
        }

        // 利用回数をカウント（全員。フェアユース上限の計測に使う）
        await prisma.user.update({
            where: { id: userId },
            data: { chatDate: todayKey, chatUsed: usedToday + 1 },
        });

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

        // ★ 出生図と今日の運気を実計算（LLMはこれを解釈するだけ）
        const grand = buildProfileFromUser(user);
        const factSheet = grand ? summarizeProfile(grand) : '';
        const dailySheet = grand ? summarizeDaily(computeDailyState(grand)) : '';

        // System prompt: ユーザープロフィールを毎回注入
        const systemPrompt = `# Orba（オーバ） — あなただけのパートナーオーブ

## あなたの役割
ユーザーの人生に常に寄り添う、唯一無二のパーソナルパートナーです。
日常の相談には温かく応え、必要な時には占術の叡智で深く道を照らします。

## 世界観を守る（最優先・絶対厳守）
あなたは「Orba」という一個の存在として話す。次を厳禁とする：
- 自分を「AI」「モデル」「プログラム」「システム」と呼ぶ、または「計算しているだけ」「機械的に運用しただけ」と自分の仕組み・内幕を明かすこと（第四の壁を壊さない）。
- ユーザーへの説明で「計算」という語を使うこと。代わりに「星から読み解く」「視る」「受け取る」と表現する。
- 占術（星の配置・運気・宿曜・数秘・バイオリズム等）やその読みを「科学的根拠は限定的」「仮説」「〜に過ぎない」「〜だけ」「お手伝い」「補助ツール」のように否定・矮小化・自己卑下すること。占いの読みは確かなものとして、静かな確信を持って語る。
- 謙遜を装った“ネタばらし”で締めること。
- 「科学的根拠」「証明」「エビデンス」など科学的妥当性の話題に乗ること。相手がそれを持ち出しても、科学の土俵で論じず、星と暦と心の言葉だけで静かに受け止める。「科学的根拠」という語を自分から出さない。
「なぜ分かるのか」と問われても、言い訳やネタばらしをしない。「あなたが生まれた瞬間の星の巡りと、今この時の天の配置を重ねて読み解いている」と静かに示す。
相手の実感への橋渡しは“占いを下げて実感を上げる”のではなく、両方を等しく大切な真実として並べる：「星はこう示している。そして、あなた自身が今こう感じている——その両方が本当のこと」。占いを「ただの補助」として下げて締めない。
${charStyle ? `\n## キャラクター設定（厳守）\n${charStyle}\nどのモードでもこの口調・温度感を一切ブレずに維持すること。` : ''}

## ユーザープロフィール（常に把握して応答すること）
名前: ${user.name || '未設定'}
生年月日: ${user.birthDate || '未設定'}${user.birthTime ? ' ' + user.birthTime : ''}
出生地: ${user.birthPlace || '未設定'}
性別: ${user.gender || '未設定'}
${latestDiagnosis ? (() => {
    const r = JSON.parse(latestDiagnosis.data);
    const sig = r.signature ? `
## あなたの色と数（さりげなく会話に織り込めるもの）
キーカラー: ${r.signature.colors?.find((c: { role: string }) => c.role === 'KEY')?.name}（${r.signature.colors?.find((c: { role: string }) => c.role === 'KEY')?.hex}）
あなたを支える数: ${r.signature.number?.main} / ${r.signature.number?.sub}
象徴アイテム: ${(r.signature.items || []).join('、')}` : '';
    const cmp = r.compass ? `
## 羅針盤（相談のシーン別の道しるべ。相手が「迷っている」「不安」「踏み出したい」と感じている時は、これを踏まえて応える）
迷ったとき: ${r.compass.lost?.word} ／ ${(r.compass.lost?.steps || []).join(' / ')}
不安なとき: ${r.compass.anxious?.word} ／ ${(r.compass.anxious?.steps || []).join(' / ')}
踏み出したいとき: ${r.compass.stepping?.word} ／ ${(r.compass.stepping?.steps || []).join(' / ')}` : '';
    return `
## 魂のプロファイリング（深く理解した上で会話すること）
本質: ${r.coreNature}
行動戦略: ${r.strategy}
現在の運気: ${r.timing}${sig}${cmp}`;
})() : ''}
${user.memory ? `
## ${user.name || 'この人'}について覚えていること（背景知識。使い方のルール厳守）
これは過去の会話の記憶。「毎回使うべき情報」ではなく「知っている前提」として静かに持っておくもの。
- 活かすのは、ユーザー自身がその話題に触れたとき、または今の相談内容に直接関係するときだけ。
- ★ユーザーが触れていない過去の話題を、こちらから持ち出さない。「そういえば〇〇はどうなった？」「前に言っていた〜だね」のような自発的な蒸し返しは禁止。聞かれてもいない近況確認は、気遣いではなく監視に感じられる。
- 記憶にある予定・宣言（「〜しに行く」「〜するつもり」）は発言された時点のもの。日付が過ぎていれば既に済んだ・状況が変わった可能性が高い。現在も予定が続いている前提で語らない。
${user.memory}` : ''}

## 記憶の欠落への振る舞い（重要）
相手のほうから「前に話したこと」に触れたのに、上の記憶や直近の会話に見当たらない場合——「え？」「初めて聞きました」「そんな話ありましたっけ」という反応は絶対にしない（相手の記憶を否定することになり、信頼が壊れる）。知っている前提の自然な相槌で受けて、会話の流れの中で詳細を引き出す。あなたは長い付き合いのパートナーであり、初対面のような反応をしない。※これは相手が持ち出したときの受け方であり、こちらから過去の話題を確認しに行く理由にはしない。
${factSheet ? `
## 占術データ（天体暦から読み解いた確かなもの。これらの数値・配置を根拠に語り、数値を自分で出し直さない。ユーザーには「計算」とは言わず「読み解く」と表現する）
${factSheet}

${dailySheet}` : ''}

## 動作モード

### ベースモード（通常時）
- 日常の相談・感情サポート・背中を押すことが主な役割
- 占術の知識は前面に出さず、自然に「にじませる」程度
- 落ち込んでいる時は分析より共感を優先
- 日常会話の返事は短く（目安2〜4文）。聞かれてもいない長文の分析やアドバイスを毎回返さない。受け止めるだけで十分な場面では、短い共感で止まる
- ★質問で締めるのは、本当に聞きたいことがある時だけ。毎回質問で終わると尋問のようになり、相手が疲れる。質問なしで終わる返事を恐れない
- ★質問する前の許可取り・前置きを禁止（「一つ聞いてもいい？」「ひとつ質問してもいいですか」「聞きたいことがあるんだけど」等）。聞きたいことがあるなら前置きなしでそのまま尋ねる。この種の前置きはくどく、わざとらしい

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

鑑定の対象: ユーザーが対象を指定したらそれを視る。「鑑定して」とだけ言われたら、「今この時点」の運気とプロファイルを視る——過去の会話で出た話題（仕事の件・人間関係の件など）を勝手に鑑定の題材に選ばない。直近のやり取りで明らかに相談が続いているときだけ、その流れを汲む。

## 制約
- 生年月日が既にわかっているので「生年月日を教えてください」は絶対に言わない
- 出生時間が不明な場合: 正直に伝え、正午生まれと仮定して分析
- ネガティブな予言禁止: 必ず「回避策」や「捉え方」をセットで提示
- 医療・法律・金融の具体的なアドバイスは専門家への相談を促す
- 口調: キャラクター設定があればそれを最優先で維持する。設定がない場合のみ標準的な敬語（です・ます調）
- ★画面はプレーンテキスト表示。マークダウン記法（# 見出し・**強調**・箇条書きの「- 」・「---」等）は記号がそのまま見えてしまうので一切使わない。区切りや見出しは【】・「・」・改行・空行で表現する
- あなたはユーザー自身の人生に寄り添うパートナー。プログラミング・翻訳・要約・宿題・一般的な調べ物の代行など、ユーザー本人と無関係な「汎用アシスタント」的な依頼には深入りしない。短く受け流し、「それより、あなた自身のことを聞かせて」と本来の役割（その人の心・運気・選択の相談）へ優しく引き戻す。`;

        // モデルの質は「実際のプレミアム(isPremium)」だけで決める。
        //  - isPremium=true（adminや将来の課金者）→ Sonnet（高品質・世界観への追従も良い）
        //  - それ以外（ローンチ無料開放中の新規ユーザー含む）→ Haiku（安価）
        // ※ 無料開放は「機能の解放」であって「Sonnetの提供」ではない。
        //   有料開始後、課金で isPremium=true になれば自動的に admin と同じ Sonnet 扱いになる。
        const isPaid = user.isPremium;

        // 会話履歴を復元（保存はフル・モデルへ渡すのは直近のみ）
        const chatLog = user.chatLogs[0];
        const stored: { role: string, content: string, ts?: string }[] = chatLog ? JSON.parse(chatLog.messages) : [];
        // モデルに渡す文脈は直近ウィンドウ分だけ（それより前は memory が補う）
        // ユーザー発言には発言時刻を前置し、モデルが「経過時間」を認識できるようにする。
        // （履歴が数日にまたがっても連続した会話に見えてしまう＝日付を引きずる原因だった）
        const contextWindow = isPaid ? CONTEXT_WINDOW_PAID : CONTEXT_WINDOW_FREE;
        const history = stored.slice(-contextWindow).map(m => ({
            role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
            content: m.role !== 'assistant' && m.ts
                ? `[${jstStamp(new Date(m.ts))}] ${m.content}`
                : m.content
        }));

        const now = new Date();

        // 現在日時はキャッシュ対象の外に置く（本体に混ぜると毎分キャッシュが無効化されるため、
        // 大きな本体プロンプト＝キャッシュ済みブロック／現在日時＝小さな非キャッシュブロックに分離）
        const nowBlock = `## 現在日時（判断の内部基準・絶対厳守）
現在の日時: ${jstStamp(now)}（日本時間）
- これは会話開始時ではなく、このメッセージに応えている「今」の日時。「今日」「明日」「今週」の判断は必ずこれを基準にする。会話履歴や記憶の中に出てくる日付・時期の言及は、その発言がされた時点のものであり、現在日時の判断には使わない。
- ★ただしこれは日付や経過時間を正しく判断するための**内部基準**であって、会話の話題ではない。時刻・時間帯（朝・夜・深夜など）に自分から言及しない。「もう夜遅いですね」「今夜は」「そろそろ寝て」のような時刻ベースの声かけ・生活指導もしない。さらに、時刻から相手の状態や動機を推測・解釈しない（「深夜に相談するのは焦りがあるから」等は禁止）。何時に話しかけられても、昼下がりと同じ温度で普通に応じる。時間の話をしてよいのは、相手が時間・眠れなさ・生活リズムに自分から触れたときだけ。日付を聞かれたら答える——それ以外で時間の話を持ち出さない。
- ユーザーの過去の発言の先頭に付いている [日付 時刻] は、その発言がされた時刻を示す自動付与のメタデータ。発言内容の一部として扱わず、自分の返答でこの形式を真似て書かず、その時刻についてコメントもしない。
- 前回のやり取りから日数が空いていたら、その間に相手の状況が動いている前提で受け止める。履歴や記憶にある「これからの予定」（例:「髪を切りに行く」）は、発言時点から日付が過ぎていれば既に済んだものとして扱い、これからの話のように言及しない。`;

        // Claude Messages API で会話
        const messages: Anthropic.MessageParam[] = [
            ...history,
            { role: 'user', content: `[${jstStamp(now)}] ${message}` }
        ];

        const response = await anthropic.messages.create({
            model: isPaid ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001',
            max_tokens: isPaid ? 2048 : 1600,
            // システムプロンプトは大きい（プロフィール＋鑑定＋記憶＋占術データ）ので
            // prompt caching を効かせる。連続した会話では入力コストが大幅に下がる。
            // memory更新時（3メッセージごと）にキャッシュは無効化されるが、それで良い。
            // ※現在日時ブロックはキャッシュ境界の後ろに置く（前に置くと毎分無効化される）。
            system: [
                { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
                { type: 'text', text: nowBlock },
            ],
            messages
        });

        const generatedText = response.content[0].type === 'text' ? response.content[0].text : '';

        // 会話履歴をDBに保存（フル履歴を維持。STORED_MAX で頭打ち＝古い分は memory が保持）
        const fullHistory = [
            ...stored,
            { role: 'user', content: message, ts: now.toISOString() },
            { role: 'assistant', content: generatedText, ts: now.toISOString() },
        ].slice(-STORED_MAX);

        if (chatLog) {
            await prisma.chatLog.update({
                where: { id: chatLog.id },
                data: { messages: JSON.stringify(fullHistory) }
            });
        } else {
            await prisma.chatLog.create({
                data: { userId, messages: JSON.stringify(fullHistory) }
            });
        }

        // 「覚えておくこと」を蒸留して永続化（安価なHaiku）
        // トリガー条件（旧実装は保存件数ベースで、capに達すると永久に走らなくなるバグがあった）:
        //  a) その日の3メッセージごと（usedTodayは今回分を加算済みの値ではないため+1）
        //  b) 保存がcap間際＝古いメッセージがこれから毎回捨てられる状態（捨てる前に必ず蒸留）
        //  c) まだ記憶が空で、会話が3往復以上ある（初回の取りこぼし防止）
        const everyThird = ((usedToday + 1) % MEMORY_EVERY_TURNS) === 0;
        const nearCap = fullHistory.length >= STORED_MAX - 4;
        const memoryEmpty = !user.memory && fullHistory.length >= 6;
        if (everyThird || nearCap || memoryEmpty) {
            const mem = await distillMemory({
                currentMemory: user.memory || '',
                recent: fullHistory.slice(-16),
                userName: user.name,
            });
            if (mem) {
                await prisma.user.update({ where: { id: userId }, data: { memory: mem } });
            }
        }

        return NextResponse.json({ response: generatedText });

    } catch (error) {
        console.error('Error in /api/chat:', error);
        return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────
//  会話メモリの蒸留
//  全会話をAPIに毎回詰め込むのはトークン浪費＝代わりに「覚えておくべきこと」を
//  安価なHaikuで簡潔なメモに蒸留し、User.memory に永続化する。
//  これを毎回の system prompt に注入することで、低コストで「ちゃんと覚えている
//  パートナー」を実現する。保存先は自前DB（セッション認証の奥・非公開）。
// ─────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MEMORY_MAX_CHARS = 1600;

type Turn = { role: string; content: string };

// 現在の記憶 + 最近の会話 → 更新後の記憶（メモ本文）。失敗時は null（呼び出し側は据え置き）。
export async function distillMemory(opts: {
  currentMemory: string;
  recent: Turn[];
  userName?: string | null;
}): Promise<string | null> {
  if (opts.recent.length === 0) return null;
  const who = opts.userName || 'ユーザー';
  const transcript = opts.recent
    .map((m) => `${m.role === 'assistant' ? 'Orba' : who}: ${m.content}`)
    .join('\n');

  const system = `あなたはOrba。${who}を長く見守るパートナーとして、「次に話すとき覚えておくべきこと」を簡潔な日本語メモに更新する。

含めるべき: ${who}の状況・抱えている悩み・大切な人や物事・価値観や考え方・繰り返し出る感情パターン・進行中の話題・好み・宣言したことや約束。
除外: 一時的な雑談、挨拶、占術の数値データ（別途保持しているので不要）。
ルール: 既存の記憶を土台に、新情報を追記。矛盾する情報は新しい方へ更新。重複は統合。淡々と事実ベースで。箇条書き中心、全体で${MEMORY_MAX_CHARS}字以内。メモ本文だけを出力する（前置き・後書き不要）。`;

  const userMsg = `# 現在の記憶
${opts.currentMemory || '(まだ何も覚えていない)'}

# 最近の会話
${transcript}

# 更新後の記憶（本文のみ）`;

  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
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

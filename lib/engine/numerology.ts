// ─────────────────────────────────────────────────────────────
//  数秘術（ピタゴラス式）
//  生年月日と姓名から、完全に決定論的に算出される。
// ─────────────────────────────────────────────────────────────

import type { Numerology } from './types';

const MASTER = new Set([11, 22, 33]);

// 1桁（またはマスターナンバー）まで還元
function reduce(n: number, keepMaster = true): number {
  while (n > 9 && !(keepMaster && MASTER.has(n))) {
    n = String(n).split('').reduce((s, d) => s + Number(d), 0);
  }
  return n;
}

// アルファベット → 数価（A=1..I=9, J=1..）
const LETTER_VALUE: Record<string, number> = {};
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((ch, i) => {
  LETTER_VALUE[ch] = (i % 9) + 1;
});
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function nameSum(name: string, filter: (ch: string) => boolean): number {
  const total = name
    .toUpperCase()
    .split('')
    .filter((ch) => LETTER_VALUE[ch] !== undefined && filter(ch))
    .reduce((s, ch) => s + LETTER_VALUE[ch], 0);
  return reduce(total);
}

export function computeNumerology(birthDate: string, name?: string): Numerology {
  const [y, m, d] = birthDate.split('-').map(Number);

  // ライフパス：年・月・日をそれぞれ還元してから合計し、再度還元
  const lifePathRaw = reduce(reduce(y) + reduce(m) + reduce(d));
  const lifePath = lifePathRaw;
  const birthday = reduce(d);

  const result: Numerology = {
    lifePath,
    birthday,
    isMaster: { lifePath: MASTER.has(lifePath) },
  };

  // 姓名がローマ字（アルファベット）の場合のみ表現数・魂の数・人格数を算出
  if (name && /^[A-Za-z\s'.-]+$/.test(name)) {
    result.expression = nameSum(name, () => true);
    result.soulUrge = nameSum(name, (ch) => VOWELS.has(ch));
    result.personality = nameSum(name, (ch) => !VOWELS.has(ch));
  }

  return result;
}

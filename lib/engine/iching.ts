// ─────────────────────────────────────────────────────────────
//  易占い（三枚コイン法）
//  - 3枚のコインを6回投げて、下から6本の爻を生成。
//  - 表(陽=3)・裏(陰=2)の合計値で 6,7,8,9 のいずれか。
//      9 = 老陽（陽→変爻して陰へ）
//      8 = 少陰（陰のまま）
//      7 = 少陽（陽のまま）
//      6 = 老陰（陰→変爻して陽へ）
//  - 下卦・上卦の組み合わせから本卦を特定。
//  - 変爻の位置を反転させて之卦を得る。
//
//  決定論的な再現が必要な場面（テスト・再表示）では seed を渡す。
//  seed 未指定なら crypto.randomBytes 由来の乱数を使う。
// ─────────────────────────────────────────────────────────────

import { createHash, randomBytes } from 'crypto';
import hexData from '@/data/iching/hexagrams.json';

// 各 hexagram の binary は upper/lower trigram の binary から構成する（下→上の6文字）。
// JSON ファイルの "binary" フィールドは参考値だが信頼せず、ここで再計算する。
function trigramBinary(triNum: number): string {
  const t = (hexData.trigrams as Record<string, { binary: string }>)[String(triNum)];
  return t.binary; // "111" 等の3文字（上=index0=上爻, 下=index2=下爻）
}

// 易の卦の binary：下→上 の6ビット = 下卦(下→上) + 上卦(下→上)。
// trigram.binary は「上→下」の順で 3 文字（"111"=乾は3本陽）なので reverse する。
function hexagramBinaryFromTrigrams(upperNum: number, lowerNum: number): string {
  const lower = trigramBinary(lowerNum).split('').reverse().join(''); // 下→上
  const upper = trigramBinary(upperNum).split('').reverse().join(''); // 下→上
  return lower + upper; // 全体も 下→上
}

const BINARY_TO_NUM: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (const h of hexData.hexagrams) {
    const b = hexagramBinaryFromTrigrams(h.upper, h.lower);
    m[b] = h.num;
  }
  return m;
})();

export type LineValue = 6 | 7 | 8 | 9;

export type IchingResult = {
  values: LineValue[];                  // 下から6本（index 0 = 初爻）
  primary: HexagramRef;                 // 本卦
  changingLines: number[];              // 変爻の位置（1〜6、下から）
  transformed: HexagramRef | null;      // 之卦（変爻がなければ null）
  binary: { primary: string; transformed: string | null };
  dataVersion: string;
  seed?: string;
};

export type HexagramRef = {
  num: number;
  name: string;
  judgment: string;       // 古典原文（パブリックドメイン）
  summary: string;        // Orba独自要約
  upper: { num: number; name: string; element: string };
  lower: { num: number; name: string; element: string };
};

// ── 乱数源 ───────────────────────────────────────────────
// seed 指定時は決定論的 PRNG（mulberry32 風）、未指定時は crypto。
function makeRng(seed?: string): () => number {
  if (!seed) {
    return () => {
      // 0〜2^32-1 を 0..1 へ。`>>> 0` を先に効かせる必要があるので括弧を明示。
      const b = randomBytes(4);
      const n = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
      return n / 0x100000000;
    };
  }
  // seed → 32bit シード
  const h = createHash('sha256').update(seed).digest();
  let s = (h.readUInt32LE(0) ^ h.readUInt32LE(4) ^ h.readUInt32LE(8)) >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

// ── 1枚のコイン: 表(3) / 裏(2) 等確率 ──────────────────────
function coin(rng: () => number): 2 | 3 {
  return rng() < 0.5 ? 2 : 3;
}

// ── 1本の爻: 3枚のコインの合計 = 6/7/8/9 ──────────────────
// 確率: 6=1/8, 7=3/8, 8=3/8, 9=1/8（三枚コイン法の正しい分布）
function castLine(rng: () => number): LineValue {
  return (coin(rng) + coin(rng) + coin(rng)) as LineValue;
}

// ── 爻値 → 陰陽（陽=1, 陰=0） ─────────────────────────────
function lineToYinYang(v: LineValue): 0 | 1 {
  // 9=老陽=陽, 7=少陽=陽, 8=少陰=陰, 6=老陰=陰
  return v === 9 || v === 7 ? 1 : 0;
}

// ── 爻値 → 変爻フラグ（9=陽→陰, 6=陰→陽） ─────────────────
function isChanging(v: LineValue): boolean {
  return v === 6 || v === 9;
}

// ── 6本の爻値（下→上）→ 卦番号 ───────────────────────────
function valuesToBinary(values: LineValue[]): string {
  // hexagrams.json の binary は「下→上」の6文字（"010101"等）
  return values.map(lineToYinYang).join('');
}

// ── 変爻を反転させた爻値列 → 之卦の binary ──────────────────
function transformBinary(values: LineValue[]): string {
  return values
    .map((v) => {
      const y = lineToYinYang(v);
      return isChanging(v) ? String(1 - y) : String(y);
    })
    .join('');
}

// ── 卦番号 → HexagramRef（trigram情報も付与） ───────────────
function hexagramByBinary(binary: string): HexagramRef {
  const num = BINARY_TO_NUM[binary];
  if (!num) {
    // 念のためのフォールバック（全64卦が網羅されているのでここには来ない想定）
    throw new Error(`unknown hexagram binary: ${binary}`);
  }
  return hexagramByNumber(num);
}

function hexagramByNumber(num: number): HexagramRef {
  const h = hexData.hexagrams.find((x) => x.num === num);
  if (!h) throw new Error(`unknown hexagram number: ${num}`);
  const upperT = (hexData.trigrams as Record<string, { name: string; element: string; binary: string }>)[String(h.upper)];
  const lowerT = (hexData.trigrams as Record<string, { name: string; element: string; binary: string }>)[String(h.lower)];
  return {
    num: h.num,
    name: h.name,
    judgment: h.judgment,
    summary: h.summary,
    upper: { num: h.upper, name: upperT.name, element: upperT.element },
    lower: { num: h.lower, name: lowerT.name, element: lowerT.element },
  };
}

// ── 公開関数 ──────────────────────────────────────────────
export function castIching(seed?: string): IchingResult {
  const rng = makeRng(seed);
  const values: LineValue[] = [];
  for (let i = 0; i < 6; i++) values.push(castLine(rng));

  const primaryBinary = valuesToBinary(values);
  const primary = hexagramByBinary(primaryBinary);

  const changingLines: number[] = [];
  values.forEach((v, i) => { if (isChanging(v)) changingLines.push(i + 1); });

  let transformed: HexagramRef | null = null;
  let transformedBinary: string | null = null;
  if (changingLines.length > 0) {
    transformedBinary = transformBinary(values);
    transformed = hexagramByBinary(transformedBinary);
  }

  return {
    values,
    primary,
    changingLines,
    transformed,
    binary: { primary: primaryBinary, transformed: transformedBinary },
    dataVersion: hexData.version,
    seed,
  };
}

// ── 既存の保存結果を再構成（保存時の values から再算出。再抽選はしない） ──
export function reconstructIching(values: LineValue[]): IchingResult {
  if (values.length !== 6) throw new Error('values length must be 6');
  for (const v of values) {
    if (v !== 6 && v !== 7 && v !== 8 && v !== 9) throw new Error('invalid line value: ' + v);
  }
  const primaryBinary = valuesToBinary(values);
  const primary = hexagramByBinary(primaryBinary);
  const changingLines: number[] = [];
  values.forEach((v, i) => { if (isChanging(v)) changingLines.push(i + 1); });
  let transformed: HexagramRef | null = null;
  let transformedBinary: string | null = null;
  if (changingLines.length > 0) {
    transformedBinary = transformBinary(values);
    transformed = hexagramByBinary(transformedBinary);
  }
  return {
    values,
    primary,
    changingLines,
    transformed,
    binary: { primary: primaryBinary, transformed: transformedBinary },
    dataVersion: hexData.version,
  };
}

// 質問文の正規化（前後空白・連続空白・全角空白）
export function normalizeQuestion(q: string): string {
  return q
    .normalize('NFKC')
    .replace(/[\s　]+/g, ' ')
    .trim();
}

export function hashQuestion(normalized: string): string {
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

// ─────────────────────────────────────────────────────────────
//  ヒューマンデザイン
//  天体暦から「意識(出生時)」と「無意識(太陽88°前)」の全13天体を
//  64ゲート(I Ching)に写像し、チャネル/定義センター/タイプ/権威/
//  プロファイルを完全に決定論的に算出する。質問は一切使わない。
// ─────────────────────────────────────────────────────────────

import type { HumanDesign, HDActivation } from './types';
import { planetLongitude, findSolarLongitudeDate } from './ephemeris';

// レイヴ・マンダラ：黄経302°(水瓶座2°)から始まるゲートの並び順
const GATE_WHEEL = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
  27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
  28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
];
const WHEEL_START = 302; // 黄経(度)
const GATE_SPAN = 360 / 64;       // 5.625°
const LINE_SPAN = GATE_SPAN / 6;  // 0.9375°

// ゲート → 所属センター
const GATE_CENTER: Record<number, string> = {};
const CENTER_GATES: Record<string, number[]> = {
  head: [61, 63, 64],
  ajna: [47, 24, 4, 11, 43, 17],
  throat: [62, 23, 56, 35, 12, 45, 33, 8, 31, 20, 16],
  g: [1, 13, 25, 46, 2, 15, 10, 7],
  heart: [21, 26, 51, 40],
  spleen: [48, 57, 44, 50, 32, 28, 18],
  solar: [36, 22, 37, 6, 49, 55, 30],
  sacral: [5, 14, 29, 59, 9, 3, 42, 27, 34],
  root: [53, 60, 52, 19, 39, 41, 58, 38, 54],
};
for (const [c, gates] of Object.entries(CENTER_GATES)) {
  for (const g of gates) GATE_CENTER[g] = c;
}

// 36チャネル（ゲート対）
const CHANNELS: [number, number][] = [
  [1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59], [7, 31], [9, 52],
  [10, 20], [10, 34], [10, 57], [11, 56], [12, 22], [13, 33], [16, 48],
  [17, 62], [18, 58], [19, 49], [20, 34], [20, 57], [21, 45], [23, 43],
  [24, 61], [25, 51], [26, 44], [27, 50], [28, 38], [29, 46], [30, 41],
  [32, 54], [34, 57], [35, 36], [37, 40], [39, 55], [42, 53], [47, 64],
];

const MOTORS = ['sacral', 'solar', 'heart', 'root'];
const CENTER_JA: Record<string, string> = {
  head: '頭', ajna: 'アジナ', throat: '喉', g: 'G(アイデンティティ)',
  heart: 'ハート(意志)', spleen: '脾臓', solar: '感情(太陽神経叢)',
  sacral: '仙骨', root: 'ルート',
};

// 黄経 → ゲート・ライン
function gateLine(lon: number): { gate: number; line: number } {
  const offset = ((lon - WHEEL_START) % 360 + 360) % 360;
  const idx = Math.floor(offset / GATE_SPAN);
  const line = Math.floor((offset % GATE_SPAN) / LINE_SPAN) + 1;
  return { gate: GATE_WHEEL[idx], line };
}

// 平均黄道交点（ノード）の黄経。Meeus近似。
function meanNodeLongitude(date: Date): number {
  const jd = date.getTime() / 86_400_000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const om = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000;
  return ((om % 360) + 360) % 360;
}

// 指定日時の13天体アクティベーション
function activations(date: Date): HDActivation[] {
  const sun = planetLongitude('sun', date);
  const node = meanNodeLongitude(date);
  const bodies: [string, number][] = [
    ['太陽', sun],
    ['地球', (sun + 180) % 360],
    ['月', planetLongitude('moon', date)],
    ['North Node', node],
    ['South Node', (node + 180) % 360],
    ['水星', planetLongitude('mercury', date)],
    ['金星', planetLongitude('venus', date)],
    ['火星', planetLongitude('mars', date)],
    ['木星', planetLongitude('jupiter', date)],
    ['土星', planetLongitude('saturn', date)],
    ['天王星', planetLongitude('uranus', date)],
    ['海王星', planetLongitude('neptune', date)],
    ['冥王星', planetLongitude('pluto', date)],
  ];
  return bodies.map(([body, lon]) => ({ body, ...gateLine(lon) }));
}

// デザイン日時：太陽が出生時より88°手前に来た瞬間（約88日前）
function designDate(birthUTC: Date): Date {
  const birthSun = planetLongitude('sun', birthUTC);
  const target = ((birthSun - 88) % 360 + 360) % 360;
  const start = new Date(birthUTC.getTime() - 95 * 86_400_000);
  const found = findSolarLongitudeDate(target, start, 95);
  return found ?? new Date(birthUTC.getTime() - 88 * 86_400_000);
}

// 定義センター間の到達可能性（モーター→喉）
function motorReachesThroat(definedChannels: [number, number][]): boolean {
  // 隣接リスト（センター同士をチャネルで接続）
  const adj: Record<string, Set<string>> = {};
  for (const [a, b] of definedChannels) {
    const ca = GATE_CENTER[a], cb = GATE_CENTER[b];
    (adj[ca] ??= new Set()).add(cb);
    (adj[cb] ??= new Set()).add(ca);
  }
  for (const motor of MOTORS) {
    if (!adj[motor]) continue;
    // BFS
    const seen = new Set([motor]);
    const queue = [motor];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === 'throat') return true;
      for (const nx of adj[cur] ?? []) {
        if (!seen.has(nx)) { seen.add(nx); queue.push(nx); }
      }
    }
  }
  return false;
}

export function computeHumanDesign(birthUTC: Date, hasExactTime: boolean): HumanDesign {
  const personality = activations(birthUTC);
  const design = activations(designDate(birthUTC));

  // 全アクティベーションのゲート集合
  const activeGates = new Set<number>();
  for (const a of [...personality, ...design]) activeGates.add(a.gate);

  // 成立チャネル
  const definedChannels = CHANNELS.filter(([a, b]) => activeGates.has(a) && activeGates.has(b));

  // 定義センター
  const definedSet = new Set<string>();
  for (const [a, b] of definedChannels) {
    definedSet.add(GATE_CENTER[a]);
    definedSet.add(GATE_CENTER[b]);
  }
  const def = (c: string) => definedSet.has(c);

  // タイプ
  const motorToThroat = motorReachesThroat(definedChannels);
  let type: string;
  if (definedSet.size === 0) type = 'リフレクター';
  else if (def('sacral')) type = motorToThroat ? 'マニフェスティング・ジェネレーター' : 'ジェネレーター';
  else type = motorToThroat ? 'マニフェスター' : 'プロジェクター';

  // 権威
  let authority: string;
  if (def('solar')) authority = '感情型（エモーショナル）';
  else if (def('sacral')) authority = '仙骨型（サクラル）';
  else if (def('spleen')) authority = '脾臓型（スプリーン）';
  else if (def('heart')) authority = 'エゴ型（意志）';
  else if (def('g')) authority = 'セルフ投影型（G）';
  else if (type === 'リフレクター') authority = '月型（ルナー）';
  else authority = '環境型（メンタル）';

  // プロファイル：意識の太陽ライン / 無意識の太陽ライン
  const pSunLine = personality[0].line;
  const dSunLine = design[0].line;
  const profile = `${pSunLine}/${dSunLine}`;

  return {
    type,
    authority,
    profile,
    definedCenters: [...definedSet].map((c) => CENTER_JA[c]),
    channels: definedChannels.map(([a, b]) => `${a}-${b}`),
    personality,
    design,
    incomplete: !hasExactTime,
  };
}

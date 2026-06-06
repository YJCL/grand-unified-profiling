// ─────────────────────────────────────────────────────────────
//  トランジット（運気）
//  「今日の運行天体」と「出生図の感受点」のアスペクトを計算し、
//  出生図を踏まえた“その人だけの運気”を算出する。
//  誕生日だけのバイオリズムと違い、本人の natal を参照する。
// ─────────────────────────────────────────────────────────────

import type { TransitHit, WesternAstrology } from './types';
import { planetLongitude } from './ephemeris';

// 運行側に見る天体（速い天体ほど日々の機微、遅い天体ほど大局）
const TRANSITING: { key: Parameters<typeof planetLongitude>[0]; ja: string; weight: number }[] = [
  { key: 'moon', ja: '月', weight: 0.4 },
  { key: 'sun', ja: '太陽', weight: 0.8 },
  { key: 'mars', ja: '火星', weight: 0.9 },
  { key: 'jupiter', ja: '木星', weight: 1.4 },
  { key: 'saturn', ja: '土星', weight: 1.4 },
  { key: 'uranus', ja: '天王星', weight: 1.0 },
  { key: 'neptune', ja: '海王星', weight: 1.0 },
  { key: 'pluto', ja: '冥王星', weight: 1.2 },
];

const ASPECTS: { type: string; angle: number; orb: number; harmony: '吉' | '凶' | '中'; mag: number }[] = [
  { type: 'トライン', angle: 120, orb: 5, harmony: '吉', mag: 1.0 },
  { type: 'セクスタイル', angle: 60, orb: 4, harmony: '吉', mag: 0.6 },
  { type: 'スクエア', angle: 90, orb: 5, harmony: '凶', mag: -1.0 },
  { type: 'オポジション', angle: 180, orb: 5, harmony: '凶', mag: -0.9 },
  { type: '合', angle: 0, orb: 5, harmony: '中', mag: 0 },
];

// 合のときは天体の吉凶で符号を決める
const BENEFIC = new Set(['木星', '金星', '太陽']);
const MALEFIC = new Set(['土星', '火星', '冥王星']);

function sep(a: number, b: number): number {
  let s = Math.abs(a - b) % 360;
  if (s > 180) s = 360 - s;
  return s;
}

export function computeTransits(natal: WesternAstrology, target: Date): {
  hits: TransitHit[];
  score: number;
} {
  // natal の感受点（重み付き）
  const natalPoints: { name: string; lon: number; weight: number }[] = [];
  for (const p of natal.planets) {
    const w = p.planet === '太陽' || p.planet === '月' ? 1.3 : 0.7;
    natalPoints.push({ name: p.planet, lon: p.longitude, weight: w });
  }
  if (natal.ascendant) natalPoints.push({ name: 'ASC', lon: natal.ascendant.longitude, weight: 1.3 });

  const hits: TransitHit[] = [];
  let raw = 0;

  for (const tr of TRANSITING) {
    const tlon = planetLongitude(tr.key, target);
    for (const np of natalPoints) {
      const s = sep(tlon, np.lon);
      for (const asp of ASPECTS) {
        const orb = Math.abs(s - asp.angle);
        if (orb <= asp.orb) {
          let mag = asp.mag;
          if (asp.type === '合') {
            mag = BENEFIC.has(tr.ja) ? 0.7 : MALEFIC.has(tr.ja) ? -0.5 : 0;
          }
          // 正確角に近いほど強く効く
          const tightness = 1 - orb / asp.orb;
          const contribution = mag * tr.weight * np.weight * tightness;
          raw += contribution;
          // 表示用：弱すぎるものは省く（遅い天体や主要点は残す）
          if (tr.weight >= 0.8 || np.weight >= 1.3) {
            hits.push({
              transiting: tr.ja,
              natal: np.name,
              aspect: asp.type,
              orb: Math.round(orb * 10) / 10,
              harmony: mag > 0 ? '吉' : mag < 0 ? '凶' : '中',
            });
          }
          break;
        }
      }
    }
  }

  // raw（おおよそ -8〜+8 程度）を 0〜100 にマップ
  const score = Math.max(0, Math.min(100, Math.round(50 + raw * 6)));

  // 強い順（正確角＝orb小さい順）に並べる
  hits.sort((a, b) => a.orb - b.orb);

  return { hits, score };
}

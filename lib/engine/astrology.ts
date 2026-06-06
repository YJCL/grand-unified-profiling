// ─────────────────────────────────────────────────────────────
//  西洋占星術コア
//  天体暦から各惑星の黄経を取り、星座・度数・逆行・アスペクト・
//  サビアン度数を算出。アセンダント／MCは出生時刻＋出生地が要る。
// ─────────────────────────────────────────────────────────────

import { SiderealTime } from 'astronomy-engine';
import type { WesternAstrology, PlanetPosition, Aspect } from './types';
import { planetLongitude, PLANETS } from './ephemeris';

const SIGNS = [
  '牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座',
  '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座',
];
const PLANET_JA: Record<string, string> = {
  sun: '太陽', moon: '月', mercury: '水星', venus: '金星', mars: '火星',
  jupiter: '木星', saturn: '土星', uranus: '天王星', neptune: '海王星', pluto: '冥王星',
};
const OBLIQUITY = 23.4366; // 黄道傾斜角（度・近似）

function signOf(lon: number) {
  const idx = Math.floor(((lon % 360) + 360) % 360 / 30);
  const degree = (((lon % 360) + 360) % 360) % 30;
  return { sign: SIGNS[idx], signIdx: idx, degree };
}

// サビアン度数ポインタ（1〜360）。星座内の度数を切り上げた度に対応。
function sabianPointer(lon: number) {
  const { sign, signIdx, degree } = signOf(lon);
  const degreeInSign = Math.floor(degree) + 1; // 1〜30
  return { num: signIdx * 30 + degreeInSign, sign, degreeInSign };
}

// 逆行判定（6時間後の黄経と比較）
function isRetrograde(planet: string, date: Date): boolean {
  if (planet === 'sun' || planet === 'moon') return false;
  const before = planetLongitude(planet as never, date);
  const after = planetLongitude(planet as never, new Date(date.getTime() + 6 * 3600_000));
  let diff = after - before;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

const ASPECT_DEFS: { type: string; angle: number; orb: number }[] = [
  { type: '合', angle: 0, orb: 8 },
  { type: 'セクスタイル', angle: 60, orb: 6 },
  { type: 'スクエア', angle: 90, orb: 8 },
  { type: 'トライン', angle: 120, orb: 8 },
  { type: 'オポジション', angle: 180, orb: 8 },
];

function computeAspects(planets: PlanetPosition[]): Aspect[] {
  const out: Aspect[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      let sep = Math.abs(planets[i].longitude - planets[j].longitude) % 360;
      if (sep > 180) sep = 360 - sep;
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(sep - def.angle);
        if (orb <= def.orb) {
          out.push({ a: planets[i].planet, b: planets[j].planet, type: def.type, orb: Math.round(orb * 10) / 10 });
          break;
        }
      }
    }
  }
  return out;
}

// アセンダント／MC（地方恒星時 + 緯度 + 黄道傾斜から算出）
function computeAscMc(date: Date, lat: number, lon: number) {
  const gastHours = SiderealTime(date);              // グリニッジ視恒星時（時）
  const lstHours = (gastHours + lon / 15) % 24;       // 地方恒星時（東経プラス）
  const ramc = ((lstHours * 15) % 360 + 360) % 360;   // MCの赤経（度）

  const rad = Math.PI / 180;
  const e = OBLIQUITY * rad;
  const theta = ramc * rad;
  const phi = lat * rad;

  // MC黄経
  let mc = Math.atan2(Math.sin(theta), Math.cos(theta) * Math.cos(e)) / rad;
  mc = (mc + 360) % 360;

  // アセンダント黄経
  let asc =
    Math.atan2(
      Math.cos(theta),
      -(Math.sin(theta) * Math.cos(e) + Math.tan(phi) * Math.sin(e))
    ) / rad;
  asc = (asc + 360) % 360;

  return { asc, mc };
}

export function computeWesternAstrology(
  date: Date,
  opts?: { lat?: number; lon?: number; hasExactTime?: boolean }
): WesternAstrology {
  const planets: PlanetPosition[] = PLANETS.map((p) => {
    const longitude = planetLongitude(p, date);
    const { sign, degree } = signOf(longitude);
    return {
      planet: PLANET_JA[p],
      sign,
      degree: Math.round(degree * 100) / 100,
      longitude: Math.round(longitude * 1000) / 1000,
      retrograde: isRetrograde(p, date),
      sabian: sabianPointer(longitude),
    };
  });

  const sunPos = planets.find((p) => p.planet === '太陽')!;
  const moonPos = planets.find((p) => p.planet === '月')!;

  const result: WesternAstrology = {
    planets,
    sun: { sign: sunPos.sign, degree: sunPos.degree },
    moon: { sign: moonPos.sign, degree: moonPos.degree },
    aspects: computeAspects(planets),
    hasAscendant: false,
  };

  // アセンダント／MCは出生時刻＋出生地が揃った時のみ
  if (opts?.hasExactTime && opts.lat !== undefined && opts.lon !== undefined) {
    const { asc, mc } = computeAscMc(date, opts.lat, opts.lon);
    const a = signOf(asc);
    const m = signOf(mc);
    result.ascendant = { sign: a.sign, degree: Math.round(a.degree * 100) / 100, longitude: Math.round(asc * 1000) / 1000 };
    result.midheaven = { sign: m.sign, degree: Math.round(m.degree * 100) / 100, longitude: Math.round(mc * 1000) / 1000 };
    result.hasAscendant = true;
  }

  return result;
}

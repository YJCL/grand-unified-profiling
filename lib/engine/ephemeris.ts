// ─────────────────────────────────────────────────────────────
//  天体暦ラッパー（astronomy-engine）
//
//  占星術・ヒューマンデザイン・宿曜・四柱推命の節入りなど、
//  「正確な天体位置」が必要な全モジュールの土台。
//  すべて地心・その日の春分点基準の黄経（ecliptic longitude）で返す。
// ─────────────────────────────────────────────────────────────

import {
  Body,
  GeoVector,
  Ecliptic,
  SunPosition,
  EclipticGeoMoon,
  MoonPhase,
  Illumination,
  SearchSunLongitude,
} from 'astronomy-engine';

// 'YYYY-MM-DD' + 'HH:mm' + tzオフセット(分) → UTCのDateを作る
export function toUTCDate(
  birthDate: string,
  birthTime?: string,
  tzOffsetMinutes: number = 540 // 既定はJST(+9h)
): { date: Date; hasExactTime: boolean } {
  const [y, m, d] = birthDate.split('-').map(Number);
  const hasExactTime = !!birthTime;
  const [hh, mm] = (birthTime || '12:00').split(':').map(Number);
  const off = Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 540;
  // ローカル時刻をUTCへ：UTC = local - offset
  let utcMs = Date.UTC(y, m - 1, d, hh, mm) - off * 60_000;
  // 不正な日付になった場合は正午UTCで安全にフォールバック（落とさない）
  if (Number.isNaN(utcMs)) utcMs = Date.UTC(y, m - 1, d, 12, 0);
  if (Number.isNaN(utcMs)) utcMs = Date.now();
  return { date: new Date(utcMs), hasExactTime };
}

// 太陽の黄経（0〜360°）— 四柱推命の節入り・サビアン・占星術に使用
export function sunLongitude(date: Date): number {
  return SunPosition(date).elon;
}

// 月の黄経（0〜360°）— 宿曜・占星術の月星座に使用
export function moonLongitude(date: Date): number {
  return EclipticGeoMoon(date).lon;
}

// 任意の天体の地心黄経（0〜360°）— 占星術・ヒューマンデザインに使用
const PLANET_BODIES: Record<string, Body> = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
};

export function planetLongitude(planet: keyof typeof PLANET_BODIES, date: Date): number {
  if (planet === 'sun') return sunLongitude(date);
  if (planet === 'moon') return moonLongitude(date);
  const vec = GeoVector(PLANET_BODIES[planet], date, true); // aberration補正あり
  return Ecliptic(vec).elon;
}

export const PLANETS = Object.keys(PLANET_BODIES) as (keyof typeof PLANET_BODIES)[];

// 月相情報
export function moonPhaseInfo(date: Date): {
  phaseAngle: number;
  illumination: number;
} {
  return {
    phaseAngle: MoonPhase(date), // 0=新月, 90=上弦, 180=満月, 270=下弦
    illumination: Illumination(Body.Moon, date).phase_fraction, // 0〜1
  };
}

// 指定年に太陽が targetLon[°] に達する瞬間（UTC）を探す
// 四柱推命の節入り・立春境界の判定に使用
export function findSolarLongitudeDate(
  targetLon: number,
  searchStart: Date,
  limitDays: number = 40
): Date | null {
  const t = SearchSunLongitude(targetLon, searchStart, limitDays);
  return t ? t.date : null;
}

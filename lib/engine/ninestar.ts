// ─────────────────────────────────────────────────────────────
//  九星気学（本命星・月命星）
//  立春・節入りの境界は四柱推命と共通（天体暦で判定）。
// ─────────────────────────────────────────────────────────────

import type { NineStar, Star } from './types';
import { toUTCDate } from './ephemeris';
import { getSolarYear, getSolarMonthSector } from './bazi';

const STAR_NAMES: Record<number, string> = {
  1: '一白水星',
  2: '二黒土星',
  3: '三碧木星',
  4: '四緑木星',
  5: '五黄土星',
  6: '六白金星',
  7: '七赤金星',
  8: '八白土星',
  9: '九紫火星',
};

function star(num: number): Star {
  return { num, name: STAR_NAMES[num] };
}

// 年の各桁を1桁まで還元
function digitRoot(n: number): number {
  while (n > 9) n = String(n).split('').reduce((s, d) => s + Number(d), 0);
  return n;
}

// 本命星：S=年の数字根 → 11 - S（10は1に）
function mainStarNum(solarYear: number): number {
  const s = digitRoot(solarYear);
  const m = 11 - s;
  return m === 10 ? 1 : m;
}

// 月命星：本命星のグループ × 節月セクター（0=寅月）
function monthlyStarNum(main: number, sector: number): number {
  // グループ別の寅月の月命星
  const start = main % 3 === 1 ? 8 : main % 3 === 2 ? 2 : 5;
  // 月が進むごとに -1（1の次は9へ循環）
  return (((start - 1 - sector) % 9) + 9) % 9 + 1;
}

export function computeNineStar(
  birthDate: string,
  birthTime?: string,
  tzOffsetMinutes: number = 540
): NineStar {
  const { date } = toUTCDate(birthDate, birthTime, tzOffsetMinutes);
  const solarYear = getSolarYear(date);
  const sector = getSolarMonthSector(date);

  const main = mainStarNum(solarYear);
  const monthly = monthlyStarNum(main, sector);

  return { main: star(main), monthly: star(monthly) };
}

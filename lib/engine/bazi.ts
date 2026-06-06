// ─────────────────────────────────────────────────────────────
//  四柱推命 / 干支（BaZi）
//  節入り（太陽黄経）を天体暦で正確に判定して年柱・月柱を決める。
//  日柱はユリウス通日、時柱は日干と時刻から算出。
// ─────────────────────────────────────────────────────────────

import type { Element5, YinYang, Pillar, FourPillars, ChineseZodiac } from './types';
import { sunLongitude, findSolarLongitudeDate, toUTCDate } from './ephemeris';

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ANIMALS = ['鼠', '牛', '虎', '兎', '龍', '蛇', '馬', '羊', '猿', '鶏', '犬', '猪'];
const STEM_ELEMENT: Element5[] = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];

function stemYinYang(i: number): YinYang {
  return i % 2 === 0 ? '陽' : '陰';
}

function makePillar(stemIdx: number, branchIdx: number): Pillar {
  return {
    stem: STEMS[stemIdx],
    branch: BRANCHES[branchIdx],
    element: STEM_ELEMENT[stemIdx],
    yinYang: stemYinYang(stemIdx),
    animal: ANIMALS[branchIdx],
    sexagenary: STEMS[stemIdx] + BRANCHES[branchIdx],
  };
}

// ── 立春境界を考慮した「四柱推命の年」を返す ───────────────
// 立春（太陽黄経315°）より前の生まれは前年扱い。
export function getSolarYear(date: Date): number {
  const civilYear = date.getUTCFullYear();
  // その年の立春を探す（2月頭付近）
  const risshun = findSolarLongitudeDate(315, new Date(Date.UTC(civilYear, 0, 20)), 30);
  if (risshun && date.getTime() < risshun.getTime()) return civilYear - 1;
  return civilYear;
}

// ── 節月のセクター（0=寅月, 1=卯月, …, 11=丑月） ──────────
// 寅月は立春(315°)から始まる。以後30°ごと。
export function getSolarMonthSector(date: Date): number {
  const lon = sunLongitude(date);
  return Math.floor(((lon - 315 + 360) % 360) / 30);
}

// ── ユリウス通日（正午基準の整数JDN, グレゴリオ暦） ───────
function julianDayNumber(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}

// 年柱（甲子=1984年 を基準, index0）
function yearPillar(solarYear: number): Pillar {
  const idx = (((solarYear - 1984) % 60) + 60) % 60;
  return makePillar(idx % 10, idx % 12);
}

// 月柱（五虎遁：年干から寅月の干を決め、節月セクターを加算）
function monthPillar(yearStemIdx: number, sector: number): Pillar {
  const firstMonthStem = ((yearStemIdx % 5) * 2 + 2) % 10; // 寅月の天干
  const stemIdx = (firstMonthStem + sector) % 10;
  const branchIdx = (2 + sector) % 12; // 寅=2 から
  return makePillar(stemIdx, branchIdx);
}

// 日柱（JDNから六十干支の通し番号を出す）
// アンカーは権威ある万年暦で較正: 2000-12-25(JDN=2451904)=己未(index55)。
//   index = (jdn - 2451849) mod 60   （2451904 - 55 = 2451849）
const DAY_ANCHOR_JDN = 2451849;
function dayPillar(y: number, m: number, d: number): { pillar: Pillar; stemIdx: number } {
  const jdn = julianDayNumber(y, m, d);
  const idx = (((jdn - DAY_ANCHOR_JDN) % 60) + 60) % 60;
  return { pillar: makePillar(idx % 10, idx % 12), stemIdx: idx % 10 };
}

// 時柱（五鼠遁：日干から子刻の干を決め、時の地支を加算）
function hourPillar(dayStemIdx: number, hour: number): Pillar {
  const branchIdx = Math.floor(((hour + 1) % 24) / 2) % 12; // 23-1時=子(0)
  const firstHourStem = (dayStemIdx % 5) * 2 % 10;          // 子刻の天干
  const stemIdx = (firstHourStem + branchIdx) % 10;
  return makePillar(stemIdx, branchIdx);
}

export function computeFourPillars(
  birthDate: string,
  birthTime?: string,
  tzOffsetMinutes: number = 540
): FourPillars {
  const { date } = toUTCDate(birthDate, birthTime, tzOffsetMinutes);

  const solarYear = getSolarYear(date);
  const yp = yearPillar(solarYear);
  const sector = getSolarMonthSector(date);
  const mp = monthPillar(STEMS.indexOf(yp.stem), sector);

  // 日柱は出生地の civil date を使う
  const [y, m, d] = birthDate.split('-').map(Number);
  const { pillar: dp, stemIdx: dayStemIdx } = dayPillar(y, m, d);

  const result: FourPillars = {
    year: yp,
    month: mp,
    day: dp,
    dayMaster: { stem: dp.stem, element: dp.element, yinYang: dp.yinYang },
  };

  if (birthTime) {
    const hour = Number(birthTime.split(':')[0]);
    result.hour = hourPillar(dayStemIdx, hour);
  }

  return result;
}

export function computeChineseZodiac(
  birthDate: string,
  birthTime?: string,
  tzOffsetMinutes: number = 540
): ChineseZodiac {
  const { date } = toUTCDate(birthDate, birthTime, tzOffsetMinutes);
  const solarYear = getSolarYear(date);
  const yp = yearPillar(solarYear);
  return {
    animal: yp.animal,
    element: yp.element,
    yinYang: yp.yinYang,
    sexagenary: yp.sexagenary,
  };
}

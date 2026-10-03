// ─────────────────────────────────────────────────────────────
//  オーケストレーター：出生データ → 統合プロフィール（GrandProfile）
//  各占術モジュールの計算結果を一つの構造にまとめる。
//  Phase 3 以降、ヒューマンデザイン・宿曜をここに追加していく。
// ─────────────────────────────────────────────────────────────

import type { BirthInput, GrandProfile } from './types';
import { computeNumerology } from './numerology';
import { computeNineStar } from './ninestar';
import { computeFourPillars, computeChineseZodiac } from './bazi';
import { computeWesternAstrology } from './astrology';
import { computeHumanDesign } from './humandesign';
import { computeSukuyo } from './sukuyo';
import { geocodePlace, resolveTzOffset } from './geocode';
import { toUTCDate } from './ephemeris';
import { BirthInputError, parseBirthDateTime } from './birth-input';
import { ORBA_CALCULATION_VERSION } from './version';

// DB の User 行（または同等のオブジェクト）から GrandProfile を構築
export function buildProfileFromUser(user: {
  name?: string | null;
  birthDate?: string | null;
  birthTime?: string | null;
  birthPlace?: string | null;
  gender?: string | null;
}): GrandProfile | null {
  if (!user.birthDate) return null;
  return buildGrandProfile({
    name: user.name ?? undefined,
    birthDate: user.birthDate,
    birthTime: user.birthTime || undefined,
    birthPlace: user.birthPlace ?? undefined,
    gender: user.gender ?? undefined,
  });
}

export function buildGrandProfile(input: BirthInput): GrandProfile {
  const birthTime = input.birthTime === '' ? undefined : input.birthTime;
  parseBirthDateTime(input.birthDate, birthTime);
  const hasExactTime = birthTime !== undefined;
  const hasCoordinates = input.lat !== undefined || input.lon !== undefined;
  if (hasCoordinates && (input.lat === undefined || input.lon === undefined ||
      !Number.isFinite(input.lat) || !Number.isFinite(input.lon) ||
      Math.abs(input.lat) > 90 || Math.abs(input.lon) > 180)) throw new BirthInputError('invalid_coordinates');

  // 出生地 → 緯度経度 + 正しいタイムゾーンオフセット
  const place = geocodePlace(input.birthPlace);
  const geo = hasCoordinates
    ? { ...place, lat: input.lat!, lon: input.lon!, confidence: 'explicit' as const }
    : place;
  const hasKnownCoordinates = geo.confidence !== 'fallback' && geo.confidence !== 'timezone';
  const timeZone = input.timeZone ?? (place.confidence !== 'fallback' ? place.iana : undefined);
  if (place.confidence === 'fallback' && input.birthPlace?.trim() && timeZone === undefined && input.tzOffsetMinutes === undefined) {
    throw new BirthInputError('unknown_place');
  }
  if (hasCoordinates && timeZone === undefined && input.tzOffsetMinutes === undefined) {
    throw new BirthInputError('coordinates_require_timezone');
  }
  const tz =
    input.tzOffsetMinutes ??
    resolveTzOffset(timeZone ?? geo.iana, input.birthDate, birthTime ?? '12:00');
  // An explicit offset also disambiguates a repeated local time (DST fold).
  if (timeZone !== undefined && input.tzOffsetMinutes !== undefined) {
    const { date: candidate } = toUTCDate(input.birthDate, birthTime, tz);
    let parts: Intl.DateTimeFormatPart[];
    try {
      parts = new Intl.DateTimeFormat('en-CA', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).formatToParts(candidate);
    } catch { throw new BirthInputError('invalid_timezone'); }
    const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
    if (`${p.year}-${p.month}-${p.day}` !== input.birthDate || `${p.hour}:${p.minute}` !== (birthTime ?? '12:00')) {
      throw new BirthInputError('offset_timezone_mismatch');
    }
  }
  const hasKnownTimeZone = timeZone !== undefined || input.tzOffsetMinutes !== undefined;
  const calculationAssumptions: string[] = [];
  if (!hasExactTime) calculationAssumptions.push('出生時刻が未入力のため現地正午を仮定しています。');
  if (!hasKnownCoordinates) calculationAssumptions.push('出生地を市区町村まで特定できないためアセンダントとMCは算出していません。');
  if (!hasKnownTimeZone) calculationAssumptions.push('出生地のタイムゾーンが不明のため日本標準時を仮定しています。');

  // 天体計算用のUTC日時
  const { date: utc } = toUTCDate(input.birthDate, birthTime, tz);

  return {
    meta: {
      calculationVersion: ORBA_CALCULATION_VERSION,
      birthDate: input.birthDate,
      birthTime,
      hasExactTime,
      birthPlace: input.birthPlace,
      lat: hasKnownCoordinates ? geo.lat : undefined,
      lon: hasKnownCoordinates ? geo.lon : undefined,
      timeZone,
      tzOffsetMinutes: tz,
      locationConfidence: geo.confidence,
      calculationAssumptions,
      generatedAt: new Date().toISOString(),
    },
    numerology: computeNumerology(input.birthDate, input.name),
    nineStar: computeNineStar(input.birthDate, birthTime, tz),
    fourPillars: computeFourPillars(input.birthDate, birthTime, tz),
    chineseZodiac: computeChineseZodiac(input.birthDate, birthTime, tz),
    westernAstrology: computeWesternAstrology(utc, {
      lat: geo.lat,
      lon: geo.lon,
      hasExactTime: hasExactTime && hasKnownCoordinates,
    }),
    humanDesign: computeHumanDesign(utc, hasExactTime && hasKnownTimeZone),
    sukuyo: computeSukuyo(utc),
  };
}

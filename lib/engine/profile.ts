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
    birthTime: user.birthTime ?? undefined,
    birthPlace: user.birthPlace ?? undefined,
    gender: user.gender ?? undefined,
  });
}

export function buildGrandProfile(input: BirthInput): GrandProfile {
  const hasExactTime = !!input.birthTime;

  // 出生地 → 緯度経度 + 正しいタイムゾーンオフセット
  const geo =
    input.lat !== undefined && input.lon !== undefined
      ? { lat: input.lat, lon: input.lon, iana: 'Asia/Tokyo' as string }
      : geocodePlace(input.birthPlace);
  const tz =
    input.tzOffsetMinutes ??
    resolveTzOffset(geo.iana, input.birthDate, input.birthTime || '12:00');

  // 天体計算用のUTC日時
  const { date: utc } = toUTCDate(input.birthDate, input.birthTime, tz);

  return {
    meta: {
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      hasExactTime,
      birthPlace: input.birthPlace,
      lat: geo.lat,
      lon: geo.lon,
      generatedAt: new Date().toISOString(),
    },
    numerology: computeNumerology(input.birthDate, input.name),
    nineStar: computeNineStar(input.birthDate, input.birthTime, tz),
    fourPillars: computeFourPillars(input.birthDate, input.birthTime, tz),
    chineseZodiac: computeChineseZodiac(input.birthDate, input.birthTime, tz),
    westernAstrology: computeWesternAstrology(utc, {
      lat: geo.lat,
      lon: geo.lon,
      hasExactTime,
    }),
    humanDesign: computeHumanDesign(utc, hasExactTime),
    sukuyo: computeSukuyo(utc),
  };
}

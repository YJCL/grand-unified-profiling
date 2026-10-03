// ─────────────────────────────────────────────────────────────
//  ジオコーディング & タイムゾーン解決
//  出生地（自由入力）→ 緯度経度 + IANAタイムゾーン。
//  さらに「出生時刻の瞬間」の歴史的UTCオフセット（DST込み）を
//  Node内蔵のICU(tzdata)経由で求める。曖昧・非存在の壁時計時刻は拒否する。
//
//  ※ content安定の鍵はlat/lon精度より「正しいタイムゾーン」。
//    1時間のDST誤差はアセンダントを星座1つ分ずらすため。
// ─────────────────────────────────────────────────────────────

import cityTimezones from 'city-timezones';
import { BirthInputError, parseBirthDateTime } from './birth-input';

export type GeoResult = {
  lat: number;
  lon: number;
  iana: string;       // IANAタイムゾーン（例: Asia/Tokyo）
  matched: string;    // ヒットした都市名
  confidence: 'exact' | 'alias' | 'fallback';
};

// 日本語の主要地名 → 英語都市名（city-timezonesは英語名のため）
const JA_ALIASES: Record<string, string> = {
  東京: 'Tokyo', 大阪: 'Osaka', 京都: 'Kyoto', 横浜: 'Yokohama',
  名古屋: 'Nagoya', 札幌: 'Sapporo', 福岡: 'Fukuoka', 神戸: 'Kobe',
  仙台: 'Sendai', 広島: 'Hiroshima', 那覇: 'Naha', 川崎: 'Kawasaki',
  さいたま: 'Saitama', 千葉: 'Chiba', 北九州: 'Kitakyushu', 堺: 'Sakai',
  新潟: 'Niigata', 浜松: 'Hamamatsu', 熊本: 'Kumamoto', 岡山: 'Okayama',
  静岡: 'Shizuoka', 金沢: 'Kanazawa', 鹿児島: 'Kagoshima', 長崎: 'Nagasaki',
  日本: 'Tokyo', 沖縄: 'Naha',
};

const TOKYO_FALLBACK: GeoResult = {
  lat: 35.6850, lon: 139.7514, iana: 'Asia/Tokyo', matched: 'Tokyo', confidence: 'fallback',
};

export function geocodePlace(place?: string): GeoResult {
  if (!place || !place.trim()) return TOKYO_FALLBACK;
  const q = place.trim();

  // 日本語エイリアス（部分一致も許容）
  for (const [ja, en] of Object.entries(JA_ALIASES)) {
    if (q.includes(ja)) {
      const hit = cityTimezones.lookupViaCity(en)[0];
      if (hit) return { lat: hit.lat, lon: hit.lng, iana: hit.timezone, matched: hit.city, confidence: 'alias' };
    }
  }

  // 英語名で直接検索（先頭トークンで再試行も）
  const tries = [q, q.split(/[ ,，、]/)[0]];
  for (const t of tries) {
    const hits = cityTimezones.lookupViaCity(t);
    if (hits.length > 0) {
      // 人口最大の都市を採用（同名都市の代表化）
      const top = hits.sort((a, b) => (b.pop || 0) - (a.pop || 0))[0];
      return { lat: top.lat, lon: top.lng, iana: top.timezone, matched: top.city, confidence: 'exact' };
    }
  }

  return TOKYO_FALLBACK;
}

// ── 指定IANAゾーン・指定ローカル壁時計時刻の UTCオフセット(分) ──
// Use the runtime's ICU history. Missing/ambiguous wall times must not silently become JST.
function instantOffsetMinutes(iana: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: iana, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value;
  const local = new Date(0);
  local.setUTCFullYear(Number(p.year), Number(p.month) - 1, Number(p.day));
  local.setUTCHours(Number(p.hour), Number(p.minute), Number(p.second), 0);
  return (local.getTime() - instant.getTime()) / 60000;
}

// ローカル壁時計時刻（出生地）→ 正しいUTCオフセット(分)
export function resolveTzOffset(
  iana: string,
  birthDate: string,
  birthTime: string = '12:00'
): number {
  const { localAsUTC } = parseBirthDateTime(birthDate, birthTime);
  const wallMs = localAsUTC.getTime();
  try {
    // Check offsets on both sides of a transition, then round-trip every candidate.
    const offsets = new Set([-36, -24, -12, 0, 12, 24, 36].map(hours =>
      instantOffsetMinutes(iana, new Date(wallMs + hours * 3_600_000))));
    const candidates = [...offsets].filter(offset => Number.isFinite(offset) &&
      instantOffsetMinutes(iana, new Date(wallMs - offset * 60_000)) === offset);
    if (candidates.length === 0) throw new BirthInputError('nonexistent_local_time');
    if (candidates.length > 1) throw new BirthInputError('ambiguous_local_time');
    return candidates[0];
  } catch (error) {
    if (error instanceof BirthInputError) throw error;
    throw new BirthInputError('invalid_timezone');
  }
}

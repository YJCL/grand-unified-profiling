// ─────────────────────────────────────────────────────────────
//  ジオコーディング & タイムゾーン解決
//  出生地（自由入力）→ 緯度経度 + IANAタイムゾーン。
//  さらに「出生時刻の瞬間」の歴史的UTCオフセット（DST込み）を
//  Node内蔵のICU(tzdata)経由で正確に求める。
//
//  ※ content安定の鍵はlat/lon精度より「正しいタイムゾーン」。
//    1時間のDST誤差はアセンダントを星座1つ分ずらすため。
// ─────────────────────────────────────────────────────────────

import cityTimezones from 'city-timezones';

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
// Node内蔵ICUの履歴tzdataを使い、歴史的DSTも正確に反映する。
function instantOffsetMinutes(iana: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: iana, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value;
  let hour = Number(p.hour);
  if (hour === 24) hour = 0; // en-US は 24:xx を返すことがある
  const asUTC = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second));
  return Math.round((asUTC - instant.getTime()) / 60000);
}

// ローカル壁時計時刻（出生地）→ 正しいUTCオフセット(分)
export function resolveTzOffset(
  iana: string,
  birthDate: string,
  birthTime: string = '12:00'
): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  const [hh, mm] = birthTime.split(':').map(Number);
  // 壁時計をUTCと見なした仮の瞬間
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  let offset = instantOffsetMinutes(iana, guess);
  // 真の瞬間で再評価（DST境界の補正）
  const real = new Date(guess.getTime() - offset * 60000);
  offset = instantOffsetMinutes(iana, real);
  return offset;
}

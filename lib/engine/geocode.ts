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
import municipalities from '@/data/geo/japan-municipalities.json';
import { BirthInputError, parseBirthDateTime } from './birth-input';

export type GeoResult = {
  lat: number;
  lon: number;
  iana: string;       // IANAタイムゾーン（例: Asia/Tokyo）
  matched: string;    // ヒットした都市名
  confidence: 'exact' | 'alias' | 'locality' | 'timezone' | 'fallback';
};

const TOKYO_FALLBACK: GeoResult = {
  lat: 35.6850, lon: 139.7514, iana: 'Asia/Tokyo', matched: 'Tokyo', confidence: 'fallback',
};

const normalize = (value: string) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[\s,，、.\-_'’]/g, '');
const romanName = (value: string) => normalize(value.replace(/\s+(?:ken|to|fu|dou|shi|ku|machi|cho|chou|son|mura)$/i, ''));
const prefectures = [...new Map(municipalities.rows.map(row => [row[0] as string, row[1] as string])).entries()];
const countryAliases: Record<string, string[]> = {
  JP: ['日本', '日本国', 'japan'], US: ['アメリカ', '米国', 'usa', 'united states'],
  GB: ['イギリス', '英国', 'uk', 'united kingdom'], FR: ['フランス'], DE: ['ドイツ'],
  CA: ['カナダ'], AU: ['オーストラリア'], NZ: ['ニュージーランド'], CN: ['中国'], KR: ['韓国'],
};
const countries = new Map<string, string>();
for (const city of cityTimezones.cityMapping) {
  if (typeof city.iso2 !== 'string') continue;
  for (const name of [city.country, city.iso2, city.iso3, ...(countryAliases[city.iso2] || [])]) countries.set(normalize(name), city.iso2);
}
countries.set(normalize('United States'), 'US');
function countryIn(query: string): { country?: string; parts: string[]; conflict: boolean } {
  const parts = query.split(/[,，、]/).map(part => part.trim()).filter(Boolean);
  const tokens = query.split(/[\s,，、]+/).filter(Boolean);
  const found = new Set<string>();
  // Whole segments/words only. Do not find "US" inside Australia, or 日本 inside a foreign address.
  for (const value of [...parts, ...tokens]) { const match = countries.get(normalize(value)); if (match) found.add(match); }
  return { country: found.size === 1 ? [...found][0] : undefined,
    parts: parts.filter(part => !countries.has(normalize(part))), conflict: found.size > 1 };
}

export function geocodePlace(place?: string): GeoResult {
  if (!place || !place.trim()) return { ...TOKYO_FALLBACK };
  const query = place.normalize('NFKC').trim();
  const { country, parts, conflict } = countryIn(query);
  if (conflict) return { ...TOKYO_FALLBACK };
  const q = normalize(parts.join(' ')).replace(/^(日本国?|japan)|(?:日本国?|japan)$/g, '');
  if ((!country || country === 'JP') && q === '東京') {
    const hit = cityTimezones.lookupViaCity('Tokyo').find(city => city.iso2 === 'JP');
    if (hit) return {lat:hit.lat,lon:hit.lng,iana:hit.timezone,matched:hit.city,confidence:'alias'};
  }
  const pref = prefectures.find(([name, roman]) => q.startsWith(normalize(name)) || q.startsWith(normalize(roman)) ||
    q.startsWith(romanName(roman)+'prefecture') || (country === 'JP' && q !== romanName(roman) && q.startsWith(romanName(roman))));
  const japanese = country === 'JP' || pref !== undefined || /[一-龯ぁ-んァ-ヶ]/.test(q);
  if ((!country || country === 'JP') && japanese) {
    let cityQuery = q;
    if (pref) {
      const [name, roman] = pref;
      cityQuery = cityQuery.replace(new RegExp('^'+normalize(name)), '').replace(new RegExp('^'+romanName(roman)+'(?:prefecture|ken|to|fu|dou)?'), '');
    }
    const hits = municipalities.rows.filter(row => {
      if (pref && row[0] !== pref[0]) return false;
      const city = row[2] as string;
      const simple = city.replace(/^.*郡/, '');
      const names = [city, simple, city.replace(/(?:市|区|町|村)$/, ''), simple.replace(/(?:市|区|町|村)$/, ''), (city.match(/^.*?市/) || [])[0], row[3] as string];
      return names.some(name => name && (normalize(name) === cityQuery || romanName(name) === cityQuery));
    });
    if (hits.length) {
      const uniquePref = new Set(hits.map(row => row[0]));
      // A supplied city name can intentionally match its wards; repeated names across prefectures cannot select coordinates.
      const baseCities = new Set(hits.map(row => (row[2] as string).replace(/(市).*$/, '$1')));
      if (uniquePref.size === 1 && baseCities.size === 1) return {
        lat: hits.reduce((sum,row) => sum+Number(row[4]),0)/hits.length,
        lon: hits.reduce((sum,row) => sum+Number(row[5]),0)/hits.length,
        iana:'Asia/Tokyo', matched: String(hits[0][0])+cityQuery, confidence:'locality',
      };
      return { ...TOKYO_FALLBACK, matched: query, confidence:'timezone' };
    }
    if ((pref && !cityQuery) || (!q && country === 'JP')) return { ...TOKYO_FALLBACK, matched: query, confidence:'timezone' };
    // A known prefecture establishes Japan's timezone, even when a locality is not in the dataset.
    if (pref) return { ...TOKYO_FALLBACK, matched: query, confidence:'timezone' };
  }

  const normalizedParts = parts.map(normalize);
  const hits = cityTimezones.cityMapping.filter(city =>
    (!country || city.iso2 === country) &&
    normalizedParts.some(part => part === normalize(city.city) || part === normalize(city.city_ascii)) &&
    normalizedParts.every(part => part === normalize(city.city) || part === normalize(city.city_ascii) || part === normalize(city.province) || part === normalize(city.state_ansi || '')));
  if (hits.length === 1) {
    const hit = hits[0];
    return {lat:hit.lat,lon:hit.lng,iana:hit.timezone,matched:hit.city,confidence:'exact'};
  }
  // Romanized Japanese municipalities missing from the global city dataset still resolve without a network request.
  if (!hits.length && (!country || country === 'JP')) {
    const domestic = municipalities.rows.filter(row => romanName(String(row[3])) === q);
    if (domestic.length === 1) { const row=domestic[0]; return {lat:Number(row[4]),lon:Number(row[5]),iana:'Asia/Tokyo',matched:String(row[2]),confidence:'locality'}; }
    if (domestic.length > 1 && country === 'JP') return { ...TOKYO_FALLBACK, matched:query, confidence:'timezone' };
  }
  if (hits.length > 1 && country && new Set(hits.map(hit => hit.timezone)).size === 1) {
    return { ...TOKYO_FALLBACK, iana:hits[0].timezone, matched:query, confidence:'timezone' };
  }
  return { ...TOKYO_FALLBACK };
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

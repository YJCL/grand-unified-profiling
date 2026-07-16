// ─────────────────────────────────────────────────────────────
//  日本時間（JST）での日付・時刻表記ユーティリティ
//  サーバーのタイムゾーン（Vercel等はUTC）に依存せず、常にJSTで揃える。
//  ※ UTCのまま new Date().toISOString() 等を使うと、JSTの0時〜9時の間
//    「今日」が1日前にズレる。ユーザー向けの日付は必ずこちらを使う。
// ─────────────────────────────────────────────────────────────

const TZ = 'Asia/Tokyo';

/** 'YYYY-MM-DD'（日次カウンタのキーなどに） */
export function jstDateKey(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

/** '2026年7月15日(水)' */
export function jstDateLabel(d: Date = new Date()): string {
  return d.toLocaleDateString('ja-JP', {
    timeZone: TZ, year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });
}

/** '2026/7/15(水) 14:03'（会話メッセージのタイムスタンプ表記） */
export function jstStamp(d: Date = new Date()): string {
  return d.toLocaleString('ja-JP', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
    weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
}

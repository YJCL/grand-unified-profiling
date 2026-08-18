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

/** 指定JST日付の開始・終了をUTCのDateで返す（DBの日次検索用） */
export function jstDayRange(dateKey: string = jstDateKey()): { start: Date; end: Date } {
  const start = new Date(`${dateKey}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** 前回日付から7日以上経過していれば週次報酬を付与できる */
export function canClaimWeekly(lastDate: string | null | undefined, today: string = jstDateKey()): boolean {
  if (!lastDate) return true;
  const previous = new Date(`${lastDate}T00:00:00+09:00`).getTime();
  const current = new Date(`${today}T00:00:00+09:00`).getTime();
  return Number.isFinite(previous) && current - previous >= 7 * 24 * 60 * 60 * 1000;
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

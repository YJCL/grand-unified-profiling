// ─────────────────────────────────────────────────────────────
//  ローンチ記念・無料開放期間（収益化ロードマップ）
//  期間中は全ユーザーがプレミアム相当の機能を使える＝製品の価値を
//  実際に体験してもらう。終了日・価格は公開コミットなので env で管理し、
//  必ず「期間限定・将来は有料・終了日」を明記する（誠実さの最低ライン）。
//
//  ★鉄則: 終了日は「延長のみ」。短縮は既得権の取り上げになるので不可。
//          終了は決済レールが動いてから（事前告知）。
// ─────────────────────────────────────────────────────────────

// 例: NEXT_PUBLIC_LAUNCH_FREE_UNTIL=2026-09-30
const FREE_UNTIL_RAW = process.env.NEXT_PUBLIC_LAUNCH_FREE_UNTIL || '';

// 正式版でのプレミアム想定価格（計測後に調整可・公開明記用）
export const PREMIUM_PRICE_LABEL = '¥550 / 月（税込）';

export function launchFreeUntil(): Date | null {
  if (!FREE_UNTIL_RAW) return null;
  // 終了日の「その日いっぱい」まで有効にする（日本時間の一日の終わり）
  const d = new Date(`${FREE_UNTIL_RAW}T23:59:59+09:00`);
  return isNaN(d.getTime()) ? null : d;
}

// 無料開放期間が現在有効か（env未設定なら無効＝通常の無料/有料ゲート）
export function isLaunchFreeActive(now: Date = new Date()): boolean {
  const until = launchFreeUntil();
  return !!until && now < until;
}

// 「2026年9月30日」の形式で終了日を返す（明記用）。未設定なら空。
export function launchFreeUntilLabel(): string {
  const d = launchFreeUntil();
  if (!d) return '';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

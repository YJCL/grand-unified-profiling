// ─────────────────────────────────────────────────────────────
//  クライアント計測ヘルパー（収益化ロードマップ P0）
//  - 未ログインでも追えるよう localStorage に匿名IDを保持
//  - 既存の guf_user_id があれば一緒に送る
//  - fire-and-forget（失敗してもアプリに影響させない）
// ─────────────────────────────────────────────────────────────

const ANON_KEY = 'guf_anon_id';

function getAnonId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = (crypto?.randomUUID?.() ?? `a-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export type EventName =
  | 'landing_view'
  | 'onboarding_start'
  | 'reading_complete'
  | 'app_open'
  | 'paywall_view'
  | 'paywall_click'
  | 'purchase';

export function track(name: EventName, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({
      name,
      anonId: getAnonId(),
      userId: localStorage.getItem('guf_user_id') || undefined,
      props,
    });
    // keepalive: ページ遷移中でも送信を完了させる
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* 計測失敗は無視 */
  }
}

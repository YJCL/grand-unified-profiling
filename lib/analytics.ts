// ─────────────────────────────────────────────────────────────
//  クライアント計測ヘルパー（収益化ロードマップ P0）
//  - 未ログインでも追えるよう localStorage に匿名IDを保持
//  - 既存の guf_user_id があれば一緒に送る
//  - fire-and-forget（失敗してもアプリに影響させない）
// ─────────────────────────────────────────────────────────────

const ANON_KEY = 'guf_anon_id';
const ATTRIBUTION_KEY = 'orba_first_touch';

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
  | 'home_view'
  | 'home_cta_click'
  | 'article_view'
  | 'article_cta_click'
  | 'diagnosis_view'
  | 'diagnosis_start'
  | 'diagnosis_answer'
  | 'diagnosis_complete'
  | 'diagnosis_to_start'
  | 'result_save'
  | 'share_click'
  | 'share_landing_view'
  | 'share_landing_cta_click'
  | 'start_view'
  | 'partner_selected'
  | 'first_question'
  | 'registration_complete'
  | 'onboarding_start'
  | 'reading_complete'
  | 'app_open'
  | 'paywall_view'
  | 'paywall_click'
  | 'founding_interest'
  | 'purchase';

type Attribution = {
  firstPath: string;
  firstReferrer?: string;
  firstSeenAt: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
};

function getAttribution(): Attribution | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const current = new URLSearchParams(window.location.search);
    const stored = localStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return JSON.parse(stored) as Attribution;

    const attribution: Attribution = {
      firstPath: `${window.location.pathname}${window.location.search}`.slice(0, 500),
      firstReferrer: document.referrer ? document.referrer.slice(0, 500) : undefined,
      firstSeenAt: new Date().toISOString(),
      utmSource: current.get('utm_source') || undefined,
      utmMedium: current.get('utm_medium') || undefined,
      utmCampaign: current.get('utm_campaign') || undefined,
      utmContent: current.get('utm_content') || undefined,
    };
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    return attribution;
  } catch {
    return undefined;
  }
}

export function track(name: EventName, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({
      name,
      anonId: getAnonId(),
      userId: localStorage.getItem('guf_user_id') || undefined,
      props: {
        ...getAttribution(),
        pagePath: `${window.location.pathname}${window.location.search}`.slice(0, 500),
        ...props,
      },
    });
    // keepalive: ページ遷移中でも送信を完了させる
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.('event', name, props || {});
  } catch {
    /* 計測失敗は無視 */
  }
}

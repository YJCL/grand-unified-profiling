// ─────────────────────────────────────────────────────────────
//  クライアント計測ヘルパー（収益化ロードマップ P0）
//  - 未ログインでも追えるよう localStorage に匿名IDを保持
//  - 既存の guf_user_id があれば一緒に送る
//  - fire-and-forget（失敗してもアプリに影響させない）
// ─────────────────────────────────────────────────────────────

import { minimizeAnalyticsProps } from '@/lib/analytics-privacy';

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

type Attribution = Record<string, string | number>;

function getAttribution(): Attribution | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const current = new URLSearchParams(window.location.search);
    const stored = localStorage.getItem(ATTRIBUTION_KEY);
    if (stored) {
      const safe = minimizeAnalyticsProps(JSON.parse(stored));
      localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(safe));
      return safe;
    }

    const attribution: Attribution = minimizeAnalyticsProps({
      firstPath: window.location.pathname,
      utmSource: current.get('utm_source') || undefined,
      utmMedium: current.get('utm_medium') || undefined,
    });
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    return attribution;
  } catch {
    return undefined;
  }
}

export function track(name: EventName, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    const safeProps = minimizeAnalyticsProps({ ...getAttribution(), pagePath: window.location.pathname, ...props });
    const body = JSON.stringify({
      name,
      anonId: getAnonId(),
      userId: localStorage.getItem('guf_user_id') || undefined,
      props: safeProps,
    });
    // keepalive: ページ遷移中でも送信を完了させる
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.('event', name, safeProps);
  } catch {
    /* 計測失敗は無視 */
  }
}

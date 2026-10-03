// Shared minimization for first-party metrics and external event forwarding.
const ENUM_FIELDS: Record<string, readonly string[]> = {
  source: ['chat_limit', 'daily_reading', 'iching', 'settings', 'full_profile', 'post_reading', 'profile_handoff', 'direct_registration', 'strengths', 'landing', 'calendar', 'mypage'],
  provider: ['komoju'], plan: ['orba_plus'], diagnosis: ['strengths'],
  method: ['copy', 'x', 'line'], characterType: ['fairy', 'burn', 'shaman', 'sage', 'cool', 'friend'],
  placement: ['header', 'hero', 'footer', 'pricing', 'plus', 'intro', 'result'],
  utmSource: ['google', 'bing', 'x', 'twitter', 'instagram', 'line', 'youtube', 'note', 'coconala'],
  utmMedium: ['organic', 'social', 'cpc', 'referral', 'email'],
};

export function minimizeAnalyticsProps(input: unknown): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string' && ENUM_FIELDS[key]?.includes(value)) result[key] = value;
    else if (['questions', 'question'].includes(key) && typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100) result[key] = value;
    else if (['pagePath', 'firstPath'].includes(key) && typeof value === 'string') {
      const pathname = value.split(/[?#]/u)[0];
      if (/^\/[a-zA-Z0-9/_-]{0,120}$/u.test(pathname)) result[key] = pathname;
    }
  }
  return result;
}

import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

const API_BASE = process.env.KOMOJU_API_BASE_URL || 'https://komoju.com/api/v1';

export const ORBA_PLUS_AMOUNT = 1480;

type JsonObject = Record<string, unknown>;

export type KomojuSession = JsonObject & {
  id: string;
  status?: string;
  session_url?: string;
  customer_id?: string;
  customer?: string | { id?: string };
  external_customer_id?: string;
  metadata?: Record<string, string>;
};

export type KomojuSubscription = JsonObject & {
  id: string;
  status?: string;
  customer?: string | { id?: string };
  metadata?: Record<string, string>;
  next_capture_at?: string;
};

export class KomojuApiError extends Error {
  constructor(public status: number, public details: unknown) {
    super(`KOMOJU API error (${status})`);
  }
}

function secretKey(): string {
  const key = process.env.KOMOJU_SECRET_KEY;
  if (!key) throw new Error('KOMOJU_SECRET_KEY is not configured');
  return key;
}

async function komojuRequest<T>(
  path: string,
  init: RequestInit = {},
  idempotencyKey?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Basic ${Buffer.from(`${secretKey()}:`).toString('base64')}`);
  if (process.env.KOMOJU_API_VERSION) {
    headers.set('X-KOMOJU-API-VERSION', process.env.KOMOJU_API_VERSION);
  }
  if (init.body) headers.set('Content-Type', 'application/json');
  if (idempotencyKey) headers.set('X-KOMOJU-IDEMPOTENCY', idempotencyKey);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new KomojuApiError(response.status, payload);
  return payload as T;
}

export async function createCustomerSession(input: {
  userId: string;
  email: string;
  returnUrl: string;
}): Promise<KomojuSession> {
  return komojuRequest<KomojuSession>(
    '/sessions',
    {
      method: 'POST',
      body: JSON.stringify({
        mode: 'customer',
        currency: 'JPY',
        return_url: input.returnUrl,
        email: input.email,
        external_customer_id: input.userId,
        payment_types: ['credit_card'],
        default_locale: 'ja',
        metadata: { user_id: input.userId, plan: 'orba_plus' },
      }),
    },
    randomUUID(),
  );
}

export function getSession(id: string): Promise<KomojuSession> {
  return komojuRequest<KomojuSession>(`/sessions/${encodeURIComponent(id)}`);
}

export function createSubscription(input: {
  customerId: string;
  userId: string;
  checkoutSessionId: string;
}): Promise<KomojuSubscription> {
  return komojuRequest<KomojuSubscription>(
    '/subscriptions',
    {
      method: 'POST',
      body: JSON.stringify({
        customer: input.customerId,
        amount: ORBA_PLUS_AMOUNT,
        currency: 'JPY',
        period: 'monthly',
        metadata: { user_id: input.userId, plan: 'orba_plus' },
      }),
    },
    `orba-sub-${input.checkoutSessionId}`.slice(0, 100),
  );
}

export function deleteSubscription(id: string): Promise<KomojuSubscription> {
  return komojuRequest<KomojuSubscription>(
    `/subscriptions/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
}

export function customerIdFrom(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string') {
    return (value as { id: string }).id;
  }
  return null;
}

export function verifyKomojuSignature(body: string, received: string | null): boolean {
  const secret = process.env.KOMOJU_WEBHOOK_SECRET;
  if (!secret || !received) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function nextMonthlyPeriod(from: Date = new Date()): Date {
  const result = new Date(from);
  result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}

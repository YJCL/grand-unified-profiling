import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { customerIdFrom, nextMonthlyPeriod, verifyKomojuSignature } from '@/lib/komoju';

type KomojuEvent = {
  id?: string;
  type?: string;
  created_at?: string;
  data?: Record<string, unknown>;
};

function metadata(data: Record<string, unknown>): Record<string, string> {
  const raw = data.metadata;
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function subscriptionId(data: Record<string, unknown>): string | null {
  if (typeof data.id === 'string' && data.resource === 'subscription') return data.id;
  const nested = data.subscription;
  if (typeof nested === 'string') return nested;
  if (nested && typeof nested === 'object' && typeof (nested as { id?: unknown }).id === 'string') {
    return (nested as { id: string }).id;
  }
  return null;
}

async function findUser(data: Record<string, unknown>) {
  const userId = metadata(data).user_id;
  if (userId) return prisma.user.findUnique({ where: { id: userId } });
  const subId = subscriptionId(data);
  if (subId) return prisma.user.findUnique({ where: { komojuSubscriptionId: subId } });
  const customerId = customerIdFrom(data.customer);
  if (customerId) return prisma.user.findUnique({ where: { komojuCustomerId: customerId } });
  return null;
}

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyKomojuSignature(body, request.headers.get('x-komoju-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  let event: KomojuEvent;
  try {
    event = JSON.parse(body) as KomojuEvent;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const deliveryId = request.headers.get('x-komoju-id') || event.id;
  const type = request.headers.get('x-komoju-event') || event.type;
  if (!deliveryId || !type) return NextResponse.json({ error: 'missing event metadata' }, { status: 400 });

  try {
    await prisma.billingEvent.create({ data: { id: deliveryId, type } });
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw error;
  }

  try {
    if (type === 'ping') return NextResponse.json({ received: true });
    const data = event.data || {};
    const user = await findUser(data);
    if (!user) {
      console.warn('[billing/webhook] user not found', { type, deliveryId });
      return NextResponse.json({ received: true, unmatched: true });
    }

    const subId = subscriptionId(data);
    const customerId = customerIdFrom(data.customer);
    const status = typeof data.status === 'string' ? data.status : type.split('.')[1];

    if (type === 'subscription.created') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          komojuSubscriptionId: subId || user.komojuSubscriptionId,
          komojuCustomerId: customerId || user.komojuCustomerId,
          premiumStatus: status,
        },
      });
    } else if (type === 'subscription.captured') {
      const nextCapture = typeof data.next_capture_at === 'string'
        ? new Date(data.next_capture_at)
        : nextMonthlyPeriod(event.created_at ? new Date(event.created_at) : new Date());
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isPremium: true,
          komojuSubscriptionId: subId || user.komojuSubscriptionId,
          komojuCustomerId: customerId || user.komojuCustomerId,
          premiumStatus: 'active',
          premiumUntil: nextCapture,
          premiumCancelAtPeriodEnd: false,
        },
      });
    } else if (type === 'subscription.failed' || type === 'subscription.suspended') {
      const stillPaid = !!user.premiumUntil && user.premiumUntil > new Date();
      await prisma.user.update({
        where: { id: user.id },
        data: { isPremium: stillPaid, premiumStatus: status },
      });
    } else if (type === 'subscription.deleted') {
      const stillPaid = !!user.premiumUntil && user.premiumUntil > new Date();
      await prisma.user.update({
        where: { id: user.id },
        data: { isPremium: stillPaid, premiumStatus: 'canceled', premiumCancelAtPeriodEnd: true },
      });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    // Webhookを再送してもらうため、処理失敗時は記録を戻す。
    await prisma.billingEvent.delete({ where: { id: deliveryId } }).catch(() => undefined);
    console.error('[billing/webhook] handler error', error);
    return NextResponse.json({ error: 'handler error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/auth';
import {
  createSubscription,
  customerIdFrom,
  getSession,
  nextMonthlyPeriod,
} from '@/lib/komoju';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://orba.life';

function mypage(result: string) {
  return NextResponse.redirect(`${APP_URL}/mypage?billing=${encodeURIComponent(result)}`);
}

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.redirect(`${APP_URL}/mypage?billing=login_required`);

  const sessionId = new URL(request.url).searchParams.get('session_id');
  if (!sessionId || !/^[a-zA-Z0-9_-]{10,100}$/.test(sessionId)) return mypage('cancelled');

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.komojuCheckoutSessionId !== sessionId) return mypage('invalid');
    if (user.komojuSubscriptionId && user.isPremium) return mypage('success');

    const session = await getSession(sessionId);
    const completed = session.status === 'completed' || session.status === 'complete';
    if (!completed) return mypage(session.status === 'cancelled' ? 'cancelled' : 'pending');
    if (session.external_customer_id && session.external_customer_id !== user.id) return mypage('invalid');
    if (session.metadata?.user_id && session.metadata.user_id !== user.id) return mypage('invalid');

    const customerId = session.customer_id || customerIdFrom(session.customer);
    if (!customerId) throw new Error('Completed KOMOJU session is missing customer_id');

    const subscription = await createSubscription({
      customerId,
      userId: user.id,
      checkoutSessionId: sessionId,
    });
    const status = (subscription.status || 'pending').toLowerCase();
    const isActive = status === 'active';
    const until = isActive
      ? (subscription.next_capture_at ? new Date(subscription.next_capture_at) : nextMonthlyPeriod())
      : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isPremium: isActive,
        komojuCustomerId: customerId,
        komojuSubscriptionId: subscription.id,
        premiumStatus: status,
        premiumUntil: until,
        premiumCancelAtPeriodEnd: false,
      },
    });
    if (isActive) {
      await prisma.event.create({
        data: { name: 'purchase', userId: user.id, props: JSON.stringify({ plan: 'orba_plus', provider: 'komoju' }) },
      }).catch(() => undefined);
    }
    return mypage(isActive ? 'success' : 'pending');
  } catch (error) {
    console.error('[billing/complete] error', error);
    return mypage('error');
  }
}

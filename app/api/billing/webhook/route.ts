import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import type Stripe from 'stripe';

// StripeのWebhook受信。署名を検証し、課金状態を isPremium に反映する。
export async function POST(request: Request) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !secret) {
        console.error('[webhook] Stripe未設定');
        return NextResponse.json({ error: 'not configured' }, { status: 500 });
    }

    const sig = request.headers.get('stripe-signature');
    const body = await request.text(); // 署名検証のため生のボディが必要

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, sig || '', secret);
    } catch (err) {
        console.error('[webhook] 署名検証失敗:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const s = event.data.object as Stripe.Checkout.Session;
                const userId = s.client_reference_id;
                const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id;
                if (userId) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: { isPremium: true, stripeCustomerId: customerId ?? undefined },
                    }).catch((e) => console.error('[webhook] user更新失敗', e));
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const sub = event.data.object as Stripe.Subscription;
                const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
                await prisma.user.updateMany({
                    where: { stripeCustomerId: customerId },
                    data: { isPremium: false },
                });
                break;
            }
            case 'customer.subscription.updated': {
                const sub = event.data.object as Stripe.Subscription;
                const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
                // active/trialing 以外（解約予約満了・支払い失敗等）は無効化
                const active = sub.status === 'active' || sub.status === 'trialing';
                await prisma.user.updateMany({
                    where: { stripeCustomerId: customerId },
                    data: { isPremium: active },
                });
                break;
            }
        }
        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('[webhook] 処理エラー:', error);
        return NextResponse.json({ error: 'handler error' }, { status: 500 });
    }
}

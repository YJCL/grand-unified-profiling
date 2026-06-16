import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { getSessionUserId } from '@/lib/auth';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://orba.life';

// プレミアム会員の解約・支払い方法変更（Stripeカスタマーポータル）
export async function POST() {
    try {
        const userId = await getSessionUserId();
        if (!userId) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
        if (!stripe) return NextResponse.json({ error: '決済が未設定です' }, { status: 503 });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user?.stripeCustomerId) {
            return NextResponse.json({ error: '購読情報が見つかりません' }, { status: 404 });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${APP_URL}/mypage`,
        });
        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('portal error:', error);
        return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
    }
}

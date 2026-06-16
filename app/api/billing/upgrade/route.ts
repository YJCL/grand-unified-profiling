import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────
//  プレミアム購入：Stripe支払いリンクへのURLを返す。
//  条件：ログイン＋本登録（メール＋パスワード）必須。
//  client_reference_id にユーザーIDを乗せ、課金成立はWebhookで反映。
//  実際の isPremium 変更は webhook のみが行う（ここでは付与しない）。
// ─────────────────────────────────────────────────────────────

export async function POST() {
    const link = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
    try {
        const userId = await getSessionUserId();
        if (!userId) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        if (!user.email || !user.passwordHash) {
            return NextResponse.json({ error: 'プレミアムには本登録が必要です', needsRegistration: true }, { status: 403 });
        }
        if (!link) {
            return NextResponse.json({ error: '決済が未設定です（運営者にお問い合わせください）' }, { status: 503 });
        }

        const url = `${link}?client_reference_id=${encodeURIComponent(user.id)}&prefilled_email=${encodeURIComponent(user.email)}`;
        return NextResponse.json({ url });
    } catch (error) {
        console.error('checkout url error:', error);
        return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
    }
}

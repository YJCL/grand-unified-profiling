import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteSubscription } from '@/lib/komoju';
import { getSessionUserId } from '@/lib/auth';

// KOMOJUには購入者向けポータルがないため、Orbaから解約APIを呼ぶ。
// 定期課金は停止するが、支払済み期間の終了まではPremiumを維持する。
export async function POST() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.komojuSubscriptionId) {
      return NextResponse.json({ error: '購読情報が見つかりません' }, { status: 404 });
    }
    if (user.premiumCancelAtPeriodEnd) {
      return NextResponse.json({ canceled: true, effectiveUntil: user.premiumUntil });
    }

    await deleteSubscription(user.komojuSubscriptionId);
    const stillPaid = !!user.premiumUntil && user.premiumUntil > new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isPremium: stillPaid,
        premiumStatus: 'canceled',
        premiumCancelAtPeriodEnd: true,
      },
    });
    return NextResponse.json({ canceled: true, effectiveUntil: user.premiumUntil });
  } catch (error) {
    console.error('[billing/cancel] error', error);
    return NextResponse.json({ error: '解約処理に失敗しました。お問い合わせください。' }, { status: 500 });
  }
}

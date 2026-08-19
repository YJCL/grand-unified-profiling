import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/auth';
import { createCustomerSession, KomojuApiError } from '@/lib/komoju';
import { isAtLeastAge } from '@/lib/age';
import { isBillingEnabled } from '@/lib/launch';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://orba.life';

// カード情報はOrbaを経由せず、KOMOJUのホスト画面で登録する。
export async function POST() {
  try {
    if (!isBillingEnabled()) {
      return NextResponse.json({ error: 'Orba Plusのお申し込みは現在準備中です' }, { status: 503 });
    }

    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!user.email || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Orba Plusのお申し込みには本登録が必要です', needsRegistration: true },
        { status: 403 },
      );
    }
    if (!user.birthDate) {
      return NextResponse.json(
        { error: 'お申し込み前にプロフィールへ生年月日を登録してください', needsProfile: true },
        { status: 403 },
      );
    }
    if (!isAtLeastAge(user.birthDate, 18)) {
      return NextResponse.json(
        { error: 'Orba Plusは18歳以上の方のみお申し込みいただけます', ageRestricted: true },
        { status: 403 },
      );
    }
    if (user.isPremium && !user.premiumCancelAtPeriodEnd) {
      return NextResponse.json({ error: 'すでにOrba Plusをご利用中です' }, { status: 409 });
    }
    if (!process.env.KOMOJU_SECRET_KEY) {
      return NextResponse.json({ error: '決済は現在準備中です' }, { status: 503 });
    }

    const session = await createCustomerSession({
      userId: user.id,
      email: user.email,
      returnUrl: `${APP_URL}/api/billing/complete`,
    });
    if (!session.id || !session.session_url) {
      throw new Error('KOMOJU session response is missing id or session_url');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { komojuCheckoutSessionId: session.id },
    });
    return NextResponse.json({ url: session.session_url });
  } catch (error) {
    if (error instanceof KomojuApiError) {
      console.error('[billing/upgrade] KOMOJU error', error.status, error.details);
    } else {
      console.error('[billing/upgrade] error', error);
    }
    return NextResponse.json({ error: '決済画面を開けませんでした。時間をおいてお試しください。' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkUserAccess } from '@/lib/auth';

// プッシュ購読を保存（端末のendpoint単位でupsert）
export async function POST(request: Request) {
  try {
    const { userId, subscription } = await request.json();
    const access = await checkUserAccess(userId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const endpoint: string | undefined = subscription?.endpoint;
    const p256dh: string | undefined = subscription?.keys?.p256dh;
    const auth: string | undefined = subscription?.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'invalid subscription' }, { status: 400 });
    }

    // 同じ端末(endpoint)が別ユーザーに紐づいていた場合は付け替える
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: access.user.id, endpoint, p256dh, auth },
      update: { userId: access.user.id, p256dh, auth },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('push subscribe error:', error);
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}

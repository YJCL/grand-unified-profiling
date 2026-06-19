import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkUserAccess } from '@/lib/auth';

// プッシュ購読を解除（この端末のendpointのみ削除）
export async function POST(request: Request) {
  try {
    const { userId, endpoint } = await request.json();
    const access = await checkUserAccess(userId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });

    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: access.user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('push unsubscribe error:', error);
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}

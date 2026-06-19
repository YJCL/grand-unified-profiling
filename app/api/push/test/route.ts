import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkUserAccess } from '@/lib/auth';
import { sendPush, ensureVapid } from '@/lib/push';

export const maxDuration = 30;

// 購読直後の確認通知。ユーザーに「ちゃんと届く」ことを体験させる。
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    const access = await checkUserAccess(userId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (!ensureVapid()) return NextResponse.json({ error: 'push not configured' }, { status: 503 });

    const subs = await prisma.pushSubscription.findMany({ where: { userId: access.user.id } });
    if (subs.length === 0) return NextResponse.json({ sent: 0 });

    const payload = {
      title: 'Orba ✦ 通知をオンにしたよ',
      body: '毎朝、あなただけの今日の運気をそっとお届けします🌙',
      url: '/mypage',
      tag: 'orba-welcome',
    };

    let sent = 0;
    for (const s of subs) {
      if (await sendPush(s, payload)) sent++;
    }
    return NextResponse.json({ sent });
  } catch (error) {
    console.error('push test error:', error);
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}

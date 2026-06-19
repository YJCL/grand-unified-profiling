import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPush, dailyTeaser, ensureVapid } from '@/lib/push';
import { buildProfileFromUser } from '@/lib/engine/profile';
import { computeDailyState } from '@/lib/engine/daily';

export const maxDuration = 60;

// Vercel Cron が毎日叩く。各ユーザーの“今日の運気”を計算してプッシュ。
// 認証: CRON_SECRET（Vercel Cronは Authorization: Bearer <CRON_SECRET> を自動付与）。
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // 未設定なら拒否（誤爆防止）
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

async function run(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!ensureVapid()) return NextResponse.json({ error: 'push not configured' }, { status: 503 });

  const users = await prisma.user.findMany({
    where: { pushSubs: { some: {} }, birthDate: { not: null } },
    include: { pushSubs: true },
  });

  const today = new Date();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of users) {
    let payload;
    try {
      const profile = buildProfileFromUser(user);
      if (!profile) { skipped++; continue; }
      const daily = computeDailyState(profile, today);
      payload = dailyTeaser(user.characterType, daily);
    } catch (err) {
      console.warn('daily compute failed for', user.id, (err as Error)?.message);
      skipped++;
      continue;
    }
    for (const s of user.pushSubs) {
      if (await sendPush(s, payload)) sent++;
      else failed++;
    }
  }

  return NextResponse.json({ users: users.length, sent, failed, skipped });
}

export async function GET(request: Request) {
  return run(request);
}
export async function POST(request: Request) {
  return run(request);
}

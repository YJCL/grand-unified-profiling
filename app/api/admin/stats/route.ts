import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 管理用ファネル統計。ADMIN_KEY（?key= もしくは Bearer）で保護。
function authorized(request: Request): boolean {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const url = new URL(request.url);
  const q = url.searchParams.get('key');
  const bearer = request.headers.get('authorization');
  return q === key || bearer === `Bearer ${key}`;
}

async function countEvent(name: string, since: Date): Promise<number> {
  return prisma.event.count({ where: { name, createdAt: { gte: since } } });
}

// 指定期間のアクティブな識別子数（userId 優先・無ければ anonId で distinct）
async function activeIdentities(since: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ c: bigint }[]>`
    SELECT COUNT(DISTINCT COALESCE("userId", "anonId")) AS c
    FROM "Event"
    WHERE "createdAt" >= ${since}
  `;
  return Number(rows[0]?.c ?? 0);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const now = Date.now();
  const d1 = new Date(now - 1 * 864e5);
  const d7 = new Date(now - 7 * 864e5);
  const d30 = new Date(now - 30 * 864e5);

  const [
    totalUsers, registeredUsers, premiumUsers, usersWithBirth, pushSubs,
    signups7d,
    landing30, onbStart30, reading30,
    paywallView30, paywallClick30, purchase30,
    dau, wau, mau,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { passwordHash: { not: null } } }),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.user.count({ where: { birthDate: { not: null } } }),
    prisma.pushSubscription.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    countEvent('landing_view', d30),
    countEvent('onboarding_start', d30),
    countEvent('reading_complete', d30),
    countEvent('paywall_view', d30),
    countEvent('paywall_click', d30),
    countEvent('purchase', d30),
    activeIdentities(d1),
    activeIdentities(d7),
    activeIdentities(d30),
  ]);

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    users: {
      total: totalUsers,
      registered: registeredUsers,
      premium: premiumUsers,
      withReading: usersWithBirth,
      signups7d,
      pushSubs,
    },
    active: { dau, wau, mau },
    funnel30d: {
      landing: landing30,
      onboardingStart: onbStart30,
      readingComplete: reading30,
      // 転換率
      startRate: pct(onbStart30, landing30),       // 訪問→オンボ開始
      completeRate: pct(reading30, onbStart30),     // オンボ開始→鑑定完了
    },
    monetization30d: {
      paywallView: paywallView30,
      paywallClick: paywallClick30,
      purchase: purchase30,
      clickRate: pct(paywallClick30, paywallView30), // 課金欲（paywall表示→クリック）
    },
  });
}

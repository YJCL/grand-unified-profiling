import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// /admin と /api/admin は proxy.ts のHTTP Basic認証で一括保護する。
export async function GET() {

  const now = Date.now();
  const d1 = new Date(now - 1 * 864e5);
  const d7 = new Date(now - 7 * 864e5);
  const d30 = new Date(now - 30 * 864e5);

  // Supabase セッションプーラーは最大15接続。並列クエリを抑えるため、
  // イベント集計は1回の groupBy、アクティブ数は1回の raw にまとめる。
  const [
    totalUsers, registeredUsers, premiumUsers, usersWithBirth, pushSubs, signups7d,
    grouped,
    activeRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { passwordHash: { not: null } } }),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.user.count({ where: { birthDate: { not: null } } }),
    prisma.pushSubscription.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.event.groupBy({ by: ['name'], where: { createdAt: { gte: d30 } }, _count: { _all: true } }),
    prisma.$queryRaw<{ dau: bigint; wau: bigint; mau: bigint }[]>`
      SELECT
        COUNT(DISTINCT CASE WHEN "createdAt" >= ${d1} THEN COALESCE("userId", "anonId") END) AS dau,
        COUNT(DISTINCT CASE WHEN "createdAt" >= ${d7} THEN COALESCE("userId", "anonId") END) AS wau,
        COUNT(DISTINCT COALESCE("userId", "anonId")) AS mau
      FROM "Event"
      WHERE "createdAt" >= ${d30}
    `,
  ]);

  const ev = (name: string) => grouped.find((g) => g.name === name)?._count._all ?? 0;
  const landing30 = ev('landing_view');
  const onbStart30 = ev('onboarding_start');
  const reading30 = ev('reading_complete');
  const paywallView30 = ev('paywall_view');
  const paywallClick30 = ev('paywall_click');
  const founding30 = ev('founding_interest');
  const purchase30 = ev('purchase');
  const dau = Number(activeRows[0]?.dau ?? 0);
  const wau = Number(activeRows[0]?.wau ?? 0);
  const mau = Number(activeRows[0]?.mau ?? 0);

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
      foundingInterest: founding30,
      purchase: purchase30,
      clickRate: pct(paywallClick30, paywallView30),      // paywall表示→開いた
      intentRate: pct(founding30, paywallView30),          // 課金欲＝paywall表示→先行登録
    },
  });
}

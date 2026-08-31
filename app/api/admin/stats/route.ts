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
    distinctEventRows,
    activeRows,
    safetyRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { passwordHash: { not: null } } }),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.user.count({ where: { birthDate: { not: null } } }),
    prisma.pushSubscription.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.event.groupBy({ by: ['name'], where: { createdAt: { gte: d30 } }, _count: { _all: true } }),
    prisma.$queryRaw<{ name: string; count: bigint }[]>`
      SELECT "name", COUNT(DISTINCT COALESCE("userId", "anonId")) AS count
      FROM "Event"
      WHERE "createdAt" >= ${d30}
      GROUP BY "name"
    `,
    prisma.$queryRaw<{ dau: bigint; wau: bigint; mau: bigint }[]>`
      SELECT
        COUNT(DISTINCT CASE WHEN "createdAt" >= ${d1} THEN COALESCE("userId", "anonId") END) AS dau,
        COUNT(DISTINCT CASE WHEN "createdAt" >= ${d7} THEN COALESCE("userId", "anonId") END) AS wau,
        COUNT(DISTINCT COALESCE("userId", "anonId")) AS mau
      FROM "Event"
      WHERE "createdAt" >= ${d30}
    `,
    prisma.event.findMany({
      where: { name: 'ai_safety_event', createdAt: { gte: d30 } },
      select: { props: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  ]);

  const ev = (name: string) => grouped.find((g) => g.name === name)?._count._all ?? 0;
  const distinct = (name: string) => Number(distinctEventRows.find((row) => row.name === name)?.count ?? 0);
  const home30 = distinct('home_view');
  const article30 = distinct('article_view');
  const articleCta30 = distinct('article_cta_click');
  const diagnosisView30 = distinct('diagnosis_view');
  const diagnosisStart30 = distinct('diagnosis_start');
  const diagnosisComplete30 = distinct('diagnosis_complete');
  const diagnosisToStart30 = distinct('diagnosis_to_start') + distinct('share_landing_cta_click');
  const startView30 = distinct('start_view');
  const partnerSelected30 = distinct('partner_selected');
  const firstQuestion30 = distinct('first_question');
  const reading30 = distinct('reading_complete');
  const paywallView30 = ev('paywall_view');
  const paywallClick30 = ev('paywall_click');
  const founding30 = ev('founding_interest');
  const purchase30 = ev('purchase');
  const dau = Number(activeRows[0]?.dau ?? 0);
  const wau = Number(activeRows[0]?.wau ?? 0);
  const mau = Number(activeRows[0]?.mau ?? 0);
  const safety = safetyRows.map((row) => {
    try {
      const props = JSON.parse(row.props || '{}') as {
        route?: string; phase?: string; action?: string; categories?: string[]; ruleIds?: string[];
      };
      return { ...props, createdAt: row.createdAt.toISOString() };
    } catch {
      return { createdAt: row.createdAt.toISOString() };
    }
  });
  const safetyCategoryCounts = safety.flatMap((item) => item.categories || []).reduce<Record<string, number>>((acc, category) => {
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

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
      homeView: home30,
      articleView: article30,
      articleCta: articleCta30,
      diagnosisView: diagnosisView30,
      diagnosisStart: diagnosisStart30,
      diagnosisComplete: diagnosisComplete30,
      diagnosisToStart: diagnosisToStart30,
      startView: startView30,
      partnerSelected: partnerSelected30,
      firstQuestion: firstQuestion30,
      readingComplete: reading30,
      articleCtaRate: pct(articleCta30, article30),
      diagnosisStartRate: pct(diagnosisStart30, diagnosisView30),
      diagnosisCompleteRate: pct(diagnosisComplete30, diagnosisStart30),
      diagnosisToStartRate: pct(diagnosisToStart30, diagnosisComplete30),
      partnerRate: pct(partnerSelected30, startView30),
      questionRate: pct(firstQuestion30, partnerSelected30),
      readingRate: pct(reading30, firstQuestion30),
    },
    monetization30d: {
      paywallView: paywallView30,
      paywallClick: paywallClick30,
      foundingInterest: founding30,
      purchase: purchase30,
      clickRate: pct(paywallClick30, paywallView30),      // paywall表示→開いた
      intentRate: pct(founding30, paywallView30),          // 課金欲＝paywall表示→先行登録
    },
    aiSafety30d: {
      total: ev('ai_safety_event'),
      categories: safetyCategoryCounts,
      recent: safety.slice(0, 12),
    },
  });
}

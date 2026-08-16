import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await prisma.user.updateMany({
    where: {
      isPremium: true,
      premiumUntil: { lte: new Date() },
      OR: [
        { premiumCancelAtPeriodEnd: true },
        { premiumStatus: { in: ['failed', 'suspended', 'canceled'] } },
      ],
    },
    data: { isPremium: false },
  });
  return NextResponse.json({ reconciled: result.count });
}

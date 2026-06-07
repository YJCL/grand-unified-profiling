import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/auth';

// 現在ログイン中のユーザー（セッションクッキーから判定）
export async function GET() {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ user: null });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({
        user: { id: user.id, email: user.email, isPremium: user.isPremium, birthDate: user.birthDate, name: user.name },
    });
}

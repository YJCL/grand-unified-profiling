import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();
        const mail = String(email || '').trim().toLowerCase();

        const user = await prisma.user.findUnique({ where: { email: mail } });
        // メール有無・パスワード誤りを区別しない（情報を漏らさない）
        if (!user || !user.passwordHash || !verifyPassword(String(password || ''), user.passwordHash)) {
            return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });
        }

        const res = NextResponse.json({ id: user.id, email: user.email, isPremium: user.isPremium, birthDate: user.birthDate, name: user.name });
        res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions);
        return res;
    } catch (error) {
        console.error('login error:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'ログインに失敗しました' }, { status: 500 });
    }
}

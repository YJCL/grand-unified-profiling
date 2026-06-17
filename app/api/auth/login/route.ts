import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';

// 不正ログイン対策：連続失敗でアカウントを一時ロック（ブルートフォース防止）
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();
        const mail = String(email || '').trim().toLowerCase();
        const now = new Date();

        const user = await prisma.user.findUnique({ where: { email: mail } });

        // ロック中なら、正誤に関わらず弾く
        if (user && user.lockedUntil && user.lockedUntil > now) {
            return NextResponse.json(
                { error: 'ログイン失敗が続いたため、一時的にロックされています。しばらくしてからお試しください。' },
                { status: 429 }
            );
        }

        const ok = !!user && !!user.passwordHash && verifyPassword(String(password || ''), user.passwordHash);

        if (!ok) {
            // 失敗回数を加算し、上限でロック（存在するアカウントのみ）
            if (user) {
                const failed = (user.failedLogins ?? 0) + 1;
                const lock = failed >= MAX_ATTEMPTS;
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        failedLogins: lock ? 0 : failed,
                        lockedUntil: lock ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : user.lockedUntil,
                    },
                });
            }
            // メール有無・誤りを区別しない
            return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });
        }

        // 成功：失敗カウンタとロックを解除
        if (user!.failedLogins !== 0 || user!.lockedUntil) {
            await prisma.user.update({ where: { id: user!.id }, data: { failedLogins: 0, lockedUntil: null } });
        }

        const res = NextResponse.json({ id: user!.id, email: user!.email, isPremium: user!.isPremium, birthDate: user!.birthDate, name: user!.name });
        res.cookies.set(SESSION_COOKIE, createSessionToken(user!.id), sessionCookieOptions);
        return res;
    } catch (error) {
        console.error('login error:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'ログインに失敗しました' }, { status: 500 });
    }
}

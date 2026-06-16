import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashResetToken, hashPassword, createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const { token, password } = await request.json();
        if (!token) return NextResponse.json({ error: 'トークンがありません' }, { status: 400 });
        if (typeof password !== 'string' || password.length < 8) {
            return NextResponse.json({ error: 'パスワードは8文字以上にしてください' }, { status: 400 });
        }

        const reset = await prisma.passwordReset.findUnique({ where: { tokenHash: hashResetToken(token) } });
        if (!reset || reset.expiresAt < new Date()) {
            if (reset) await prisma.passwordReset.delete({ where: { id: reset.id } }).catch(() => null);
            return NextResponse.json({ error: 'リンクが無効か、有効期限が切れています。もう一度お試しください。' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id: reset.userId },
            data: { passwordHash: hashPassword(password) },
        });
        // 使用済みトークンと、このユーザーの他のリセットトークンを破棄
        await prisma.passwordReset.deleteMany({ where: { userId: reset.userId } });

        // そのままログイン状態にする
        const res = NextResponse.json({ id: user.id, email: user.email });
        res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions);
        return res;
    } catch (error) {
        console.error('reset error:', error);
        return NextResponse.json({ error: '再設定に失敗しました' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 本登録（インスタントアカウントのアップグレード or 新規登録）
export async function POST(request: Request) {
    try {
        const { email, password, userId } = await request.json();
        const mail = String(email || '').trim().toLowerCase();

        if (!EMAIL_RE.test(mail)) return NextResponse.json({ error: 'メールアドレスの形式が正しくありません' }, { status: 400 });
        if (typeof password !== 'string' || password.length < 8) return NextResponse.json({ error: 'パスワードは8文字以上にしてください' }, { status: 400 });

        // 既に同じメールが使われていないか
        const existing = await prisma.user.findUnique({ where: { email: mail } });
        if (existing && existing.id !== userId) return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 409 });

        const passwordHash = hashPassword(password);
        let user;

        if (userId) {
            const current = await prisma.user.findUnique({ where: { id: userId } });
            if (current && !current.email) {
                // インスタントアカウントを本登録（データはそのまま引き継ぐ）
                user = await prisma.user.update({ where: { id: userId }, data: { email: mail, passwordHash } });
            } else if (current && current.email === mail) {
                user = await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
            }
        }
        if (!user) {
            user = await prisma.user.create({ data: { email: mail, passwordHash, language: 'ja' } });
        }

        const res = NextResponse.json({ id: user.id, email: user.email, isPremium: user.isPremium, birthDate: user.birthDate });
        res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions);
        return res;
    } catch (error) {
        console.error('register error:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
    }
}

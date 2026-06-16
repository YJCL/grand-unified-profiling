import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateResetToken } from '@/lib/auth';
import { sendEmail, passwordResetEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://orba.life';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();
        const mail = String(email || '').trim().toLowerCase();

        const user = mail ? await prisma.user.findUnique({ where: { email: mail } }) : null;

        // 本登録済みユーザーのみ。存在有無は外部に漏らさず常に成功を返す。
        if (user && user.passwordHash) {
            await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
            const { raw, hash } = generateResetToken();
            await prisma.passwordReset.create({
                data: { tokenHash: hash, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
            });
            const resetUrl = `${APP_URL}/reset?token=${raw}`;
            const { subject, html } = passwordResetEmail(resetUrl);
            await sendEmail({ to: mail, subject, html });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('forgot error:', error);
        // エラーでも成功扱い（情報を漏らさない）
        return NextResponse.json({ ok: true });
    }
}

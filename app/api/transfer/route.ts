import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkUserAccess, createSessionToken, sessionCookieOptions, SESSION_COOKIE, guestCookieName, getSessionUserId } from '@/lib/auth';
import { randomBytes } from 'crypto';

function generateCode(): string {
    return 'R1-' + randomBytes(16).toString('hex').toUpperCase();
}

// POST /api/transfer { userId } → { code }
export async function POST(request: Request) {
    try {
        const { userId, code: recoveryCode } = await request.json();
        const code = recoveryCode;
        if (code !== undefined) {
            if (typeof code !== 'string' || !/^R1-[A-F0-9]{32}$/.test(code)) return NextResponse.json({ error: '所有者の端末で新しい引き継ぎコードを発行してください。以前の共有コードはログインに使えません。' }, { status: 410 });
            const restored = await prisma.$transaction(async tx => {
                const transfer = await tx.transferCode.findUnique({ where: { code } });
                if (!transfer || transfer.expiresAt <= new Date()) return null;
                const user = await tx.user.findUnique({ where: { id: transfer.userId }, select: { id: true, passwordHash: true, profileType: true } });
                if (!user) return null;
                if (user.passwordHash) return { registered: true as const };
                const consumed = await tx.transferCode.deleteMany({ where: { code, expiresAt: { gt: new Date() } } });
                return consumed.count === 1 ? { registered: false as const, user } : null;
            });
            if (!restored) return NextResponse.json({ error: '無効・期限切れ・使用済みのコードです。' }, { status: 410 });
            if (restored.registered) return NextResponse.json({ error: '登録済みアカウントはメールとパスワードでログインしてください。' }, { status: 403 });
            const response = NextResponse.json({ id: restored.user.id, profileType: restored.user.profileType, restored: true });
            const token = createSessionToken(restored.user.id);
            response.cookies.set(guestCookieName(restored.user.id), token, sessionCookieOptions);
            if (!await getSessionUserId()) response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
            return response;
        }
        const access = await checkUserAccess(userId);
        if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

        // Generate unique code
        let generatedCode = generateCode();
        let attempts = 0;
        while (attempts < 10) {
            const existing = await prisma.transferCode.findUnique({ where: { code: generatedCode } });
            if (!existing) break;
            generatedCode = generateCode();
            attempts++;
        }

        // Delete any existing transfer codes for this user
        await prisma.transferCode.deleteMany({ where: { userId } });

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await prisma.transferCode.create({ data: { code: generatedCode, userId, expiresAt } });

        return NextResponse.json({ code: generatedCode });
    } catch {
        console.error('Error creating transfer code:');
        return NextResponse.json({ error: 'Failed to create transfer code' }, { status: 500 });
    }
}

// GET /api/transfer?code=XXXXXX → profile data
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
    if (!/^[A-F0-9]{32}$/u.test(code)) return NextResponse.json({ error: '所有者の端末で新しい共有コードを発行してください。旧形式のコードは利用できません。' }, { status: 410 });

    try {
        const transfer = await prisma.transferCode.findUnique({ where: { code } });
        if (!transfer) return NextResponse.json({ error: 'Invalid code' }, { status: 404 });
        if (new Date() > transfer.expiresAt) {
            await prisma.transferCode.delete({ where: { code } });
            return NextResponse.json({ error: 'Code expired' }, { status: 410 });
        }

        const user = await prisma.user.findUnique({
            where: { id: transfer.userId },
            include: { diagnoses: { orderBy: { createdAt: 'desc' }, take: 1 } }
        });
        if (!user) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

        return NextResponse.json({
            name: user.name,
            birthDate: user.birthDate,
            birthTime: user.birthTime,
            birthPlace: user.birthPlace,
            gender: user.gender,
            language: user.language,
            characterType: user.characterType,
            mbti: user.mbti,
            enneagram: user.enneagram,
            latestDiagnosis: user.diagnoses[0]?.data ?? null,
        });
    } catch {
        console.error('Error redeeming transfer code:');
        return NextResponse.json({ error: 'Failed to redeem code' }, { status: 500 });
    }
}

// DELETE /api/transfer?code=XXXXXX (after successful import on friend's side)
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
    if (!/^[A-F0-9]{32}$/u.test(code)) return NextResponse.json({ error: 'invalid code' }, { status: 400 });

    try {
        await prisma.transferCode.delete({ where: { code } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: true }); // already gone, that's fine
    }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// POST /api/transfer { userId } → { code }
export async function POST(request: Request) {
    try {
        const { userId } = await request.json();
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Generate unique code
        let code = generateCode();
        let attempts = 0;
        while (attempts < 10) {
            const existing = await prisma.transferCode.findUnique({ where: { code } });
            if (!existing) break;
            code = generateCode();
            attempts++;
        }

        // Delete any existing transfer codes for this user
        await prisma.transferCode.deleteMany({ where: { userId } });

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await prisma.transferCode.create({ data: { code, userId, expiresAt } });

        return NextResponse.json({ code });
    } catch (error) {
        console.error('Error creating transfer code:', error);
        return NextResponse.json({ error: 'Failed to create transfer code' }, { status: 500 });
    }
}

// GET /api/transfer?code=XXXXXX → profile data
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

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
    } catch (error) {
        console.error('Error redeeming transfer code:', error);
        return NextResponse.json({ error: 'Failed to redeem code' }, { status: 500 });
    }
}

// DELETE /api/transfer?code=XXXXXX (after successful import on friend's side)
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

    try {
        await prisma.transferCode.delete({ where: { code } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: true }); // already gone, that's fine
    }
}

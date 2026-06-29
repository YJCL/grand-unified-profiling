import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkUserAccess } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, data } = body;

        if (!userId || !data) {
            return NextResponse.json({ error: 'User ID and Data required' }, { status: 400 });
        }

        const access = await checkUserAccess(userId);
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        // 既存ユーザーの frozen を読み、まだ空なら今回の data から固定保存する。
        // 一度入ったら以後一切上書きしない（人生に1度きりロック）。
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { frozenSignature: true, frozenCompass: true },
        });

        // 受信した data に frozen を強制反映してから保存（再鑑定でも diagnosis 内で同じ値に揃う）
        const merged: Record<string, unknown> = { ...(data ?? {}) };
        if (user?.frozenSignature) {
            try { merged.signature = JSON.parse(user.frozenSignature); } catch {}
        }
        if (user?.frozenCompass) {
            try { merged.compass = JSON.parse(user.frozenCompass); } catch {}
        }

        const diagnosis = await prisma.diagnosis.create({
            data: {
                userId,
                data: JSON.stringify(merged),
            },
        });

        // User の frozen が空なら、今回の data から「初回の象徴」として固定。
        const updates: Record<string, string> = {};
        if (!user?.frozenSignature && (data?.signature)) {
            updates.frozenSignature = JSON.stringify(data.signature);
        }
        if (!user?.frozenCompass && (data?.compass)) {
            updates.frozenCompass = JSON.stringify(data.compass);
        }
        if (Object.keys(updates).length > 0) {
            await prisma.user.update({ where: { id: userId }, data: updates });
        }

        return NextResponse.json(diagnosis);
    } catch (error) {
        console.error('Error saving diagnosis:', error);
        return NextResponse.json({ error: 'Failed to save diagnosis' }, { status: 500 });
    }
}

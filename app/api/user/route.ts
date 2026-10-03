import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkUserAccess } from '@/lib/auth';
import { RECEPTION_CLOSED_MESSAGE } from '@/lib/service-policy';
import { buildProfileFromUser } from '@/lib/engine/profile';
import { BirthInputError, birthInputIssue } from '@/lib/engine/birth-input';
import type { User, Diagnosis } from '@prisma/client';

const PUBLIC_FIELDS = ['id', 'email', 'name', 'birthDate', 'birthTime', 'birthPlace', 'gender', 'language', 'characterType', 'mbti', 'enneagram', 'createdAt', 'isPremium', 'tickets', 'widgetOrder', 'profileType', 'expiresAt', 'diagnoses'] as const;
function userView(user: User & { diagnoses?: Diagnosis[] }) {
    return Object.fromEntries(PUBLIC_FIELDS.map((key) => [key, user[key]]));
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        // 注意: isPremium はここでは受け付けない（課金状態はサーバー側でのみ変更可能）
        const { id, name, birthDate, birthTime, birthPlace, gender, language, characterType, mbti, enneagram, widgetOrder, profileType, expiresAt } = body;

        if (!id) return NextResponse.json({ error: RECEPTION_CLOSED_MESSAGE, code: 'reception_closed' }, { status: 410 });
        const access = await checkUserAccess(id);
        if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
        let user = access.user;
        if (birthDate !== undefined || birthTime !== undefined || birthPlace !== undefined) {
            buildProfileFromUser({
                ...user,
                birthDate: birthDate !== undefined ? birthDate : user.birthDate,
                birthTime: birthTime !== undefined ? birthTime : user.birthTime,
                birthPlace: birthPlace !== undefined ? birthPlace : user.birthPlace,
            });
        }
        {
            // Update any provided fields（isPremium は除外）
            const updateData: Record<string, unknown> = {};
            if (name !== undefined) updateData.name = name;
            if (birthDate !== undefined) updateData.birthDate = birthDate;
            if (birthTime !== undefined) updateData.birthTime = birthTime;
            if (birthPlace !== undefined) updateData.birthPlace = birthPlace;
            if (gender !== undefined) updateData.gender = gender;
            if (language !== undefined) updateData.language = language;
            if (characterType !== undefined) updateData.characterType = characterType;
            if (mbti !== undefined) updateData.mbti = mbti;
            if (enneagram !== undefined) updateData.enneagram = enneagram;
            if (widgetOrder !== undefined) updateData.widgetOrder = widgetOrder;
            if (profileType !== undefined) updateData.profileType = profileType;
            if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

            if (Object.keys(updateData).length > 0) {
                user = await prisma.user.update({ where: { id: user.id }, data: updateData });
            }
        }

        return NextResponse.json(userView(user));
    } catch (error) {
        if (error instanceof BirthInputError) return NextResponse.json(birthInputIssue(error.code), { status: 422 });
        console.error('Error in /api/user');
        return NextResponse.json({ error: 'Failed to process user' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    try {
        const access = await checkUserAccess(id);
        if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

        await prisma.chatLog.deleteMany({ where: { userId: id } });
        await prisma.dailyLog.deleteMany({ where: { userId: id } });
        await prisma.diagnosis.deleteMany({ where: { userId: id } });
        await prisma.user.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch {
        console.error('Error deleting user');
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const access = await checkUserAccess(id);
        if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                diagnoses: { orderBy: { createdAt: 'desc' }, take: 1 }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(userView(user));
    } catch {
        console.error('Error fetching user');
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

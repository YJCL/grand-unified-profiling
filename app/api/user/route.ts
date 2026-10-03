import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkUserAccess, createSessionToken, sessionCookieOptions, SESSION_COOKIE, guestCookieName, getSessionUserId } from '@/lib/auth';
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

        let user = null;

        if (id) {
            const access = await checkUserAccess(id);
            if (!access.ok) {
                return NextResponse.json({ error: access.error }, { status: access.status });
            }
            if (access.ok) user = access.user;
        }

        let created = false;
        if (!user) {
            user = await prisma.user.create({
                data: {
                    name: name || null,
                    birthDate: birthDate || null,
                    birthTime: birthTime || null,
                    birthPlace: birthPlace || null,
                    gender: gender || null,
                    language: language || 'ja',
                    characterType: characterType || null,
                    profileType: profileType || 'self',
                    expiresAt: expiresAt ? new Date(expiresAt) : null,
                    tickets: 2,
                }
            });
            created = true;
        } else {
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

        const res = NextResponse.json(userView(user));
        // 新規作成（インスタントアカウント）にもセッションを発行しておく
        if (created) {
            const token = createSessionToken(user.id);
            res.cookies.set(guestCookieName(user.id), token, sessionCookieOptions);
            // Preserve the main account session while adding a separate guest profile.
            if (!await getSessionUserId()) res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
        }
        return res;
    } catch {
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

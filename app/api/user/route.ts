import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkUserAccess, createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        // 注意: isPremium はここでは受け付けない（課金状態はサーバー側でのみ変更可能）
        const { id, email, name, birthDate, birthTime, birthPlace, gender, language, characterType, mbti, enneagram, widgetOrder, profileType, expiresAt } = body;

        let user = null;

        if (id) {
            const access = await checkUserAccess(id);
            if (!access.ok && access.status !== 404) {
                return NextResponse.json({ error: access.error }, { status: access.status });
            }
            if (access.ok) user = access.user;
        }

        let created = false;
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: email || null,
                    name: name || null,
                    birthDate: birthDate || null,
                    birthTime: birthTime || null,
                    birthPlace: birthPlace || null,
                    gender: gender || null,
                    language: language || 'ja',
                    characterType: characterType || null,
                    profileType: profileType || 'self',
                    expiresAt: expiresAt ? new Date(expiresAt) : null,
                }
            });
            created = true;
        } else {
            // Update any provided fields（isPremium は除外）
            const updateData: Record<string, unknown> = {};
            if (email !== undefined) updateData.email = email;
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

        const { passwordHash: _ph, ...safe } = user;
        void _ph;
        const res = NextResponse.json(safe);
        // 新規作成（インスタントアカウント）にもセッションを発行しておく
        if (created) {
            res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions);
        }
        return res;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error in /api/user:', message);
        return NextResponse.json({ error: 'Failed to process user', details: message }, { status: 500 });
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
    } catch (error) {
        console.error('Error deleting user:', error);
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
                diagnoses: { orderBy: { createdAt: 'desc' } }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { passwordHash: _ph, ...safe } = user;
        void _ph;
        return NextResponse.json(safe);
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { id, email, isPremium, name, birthDate, birthTime, birthPlace, gender, language, characterType, mbti, enneagram, widgetOrder } = body;

        let user;

        if (id) {
            user = await prisma.user.findUnique({ where: { id } });
        }

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
                }
            });
        } else {
            // Update any provided fields
            const updateData: Record<string, unknown> = {};
            if (email !== undefined) updateData.email = email;
            if (isPremium !== undefined) updateData.isPremium = isPremium;
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

            if (Object.keys(updateData).length > 0) {
                user = await prisma.user.update({ where: { id: user.id }, data: updateData });
            }
        }

        return NextResponse.json(user);
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
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                diagnoses: { orderBy: { createdAt: 'desc' } }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

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

        const diagnosis = await prisma.diagnosis.create({
            data: {
                userId,
                data: JSON.stringify(data)
            }
        });

        return NextResponse.json(diagnosis);
    } catch (error) {
        console.error('Error saving diagnosis:', error);
        return NextResponse.json({ error: 'Failed to save diagnosis' }, { status: 500 });
    }
}

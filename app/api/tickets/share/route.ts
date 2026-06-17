import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkUserAccess } from '@/lib/auth';

// シェア報酬：1日1回まで +1 チケット（farming防止）
export async function POST(request: Request) {
    try {
        const { userId } = await request.json();
        const access = await checkUserAccess(userId);
        if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
        const user = access.user;

        const today = new Date().toISOString().split('T')[0];
        if (user.lastShareTicketDate === today) {
            return NextResponse.json({ granted: false, tickets: user.tickets, reason: 'already' });
        }
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { tickets: { increment: 1 }, lastShareTicketDate: today },
        });
        return NextResponse.json({ granted: true, tickets: updated.tickets });
    } catch (error) {
        console.error('share ticket error:', error);
        return NextResponse.json({ error: 'error' }, { status: 500 });
    }
}

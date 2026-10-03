import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 公開シェア用：診断ID（推測困難なUUID＝ケイパビリティ）から、
// 公開して良い情報だけを返す。名前・生年月日・メール等のPIIは一切返さない。
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    try {
        const diag = await prisma.diagnosis.findUnique({
            where: { id },
            select: { user: { select: { characterType: true } } },
        });
        if (!diag) return NextResponse.json({ error: 'not found' }, { status: 404 });

        // Public sharing exposes the selected orb only, never private generated reading text.
        return NextResponse.json({
            characterType: diag.user.characterType || 'sage',
            summary: '',
            coreNature: '',
            dailyTheme: '',
        });
    } catch {
        console.error('share fetch failed');
        return NextResponse.json({ error: 'error' }, { status: 500 });
    }
}

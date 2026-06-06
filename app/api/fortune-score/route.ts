import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildProfileFromUser, buildGrandProfile } from '@/lib/engine/profile';
import { computeScoreRange } from '@/lib/engine/daily';
import type { GrandProfile } from '@/lib/engine/types';

export type DayScore = {
    date: string;
    score: number;
    moon: string;
    phase: 'attack' | 'defense';
};

// 出生図を踏まえたトランジット運気スコアを範囲で返す。
// userId（推奨：出生時刻・出生地まで使える）または birthDate を受け付ける。
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const birthDate = searchParams.get('birthDate');
    const range = parseInt(searchParams.get('range') || '14');

    try {
        let profile: GrandProfile | null = null;

        if (userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user) profile = buildProfileFromUser(user);
        }
        if (!profile && birthDate) {
            profile = buildGrandProfile({ birthDate });
        }
        if (!profile) {
            return NextResponse.json({ error: 'userId or birthDate required' }, { status: 400 });
        }

        // 過去1/4・未来3/4の範囲
        const scores = computeScoreRange(profile, -Math.floor(range / 4), range);
        return NextResponse.json(scores);
    } catch (error) {
        console.error('Error in /api/fortune-score:', error);
        return NextResponse.json({ error: 'Failed to compute scores' }, { status: 500 });
    }
}

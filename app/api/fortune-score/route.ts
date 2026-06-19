import { NextResponse } from 'next/server';
import { buildProfileFromUser, buildGrandProfile } from '@/lib/engine/profile';
import { computeScoreRange } from '@/lib/engine/daily';
import type { GrandProfile } from '@/lib/engine/types';
import { checkUserAccess } from '@/lib/auth';
import { isLaunchFreeActive } from '@/lib/launch';

// 無料プランで見られる日数（プレミアムはフルカレンダー）
const FREE_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 60;

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
    let range = Math.min(parseInt(searchParams.get('range') || '14'), MAX_RANGE_DAYS);

    try {
        let profile: GrandProfile | null = null;
        let isPremium = false;

        if (userId) {
            const access = await checkUserAccess(userId);
            if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
            profile = buildProfileFromUser(access.user);
            isPremium = access.user.isPremium;
        }
        if (!profile && birthDate) {
            profile = buildGrandProfile({ birthDate });
        }
        if (!profile) {
            return NextResponse.json({ error: 'userId or birthDate required' }, { status: 400 });
        }

        // 無料プランは閲覧範囲を制限（サーバー側で強制）
        // ローンチ記念の無料開放期間中は全員フルカレンダー。
        if (!isPremium && !isLaunchFreeActive()) range = Math.min(range, FREE_RANGE_DAYS);

        // 過去1/4・未来3/4の範囲
        const scores = computeScoreRange(profile, -Math.floor(range / 4), range);
        return NextResponse.json(scores);
    } catch (error) {
        console.error('Error in /api/fortune-score:', error);
        return NextResponse.json({ error: 'Failed to compute scores' }, { status: 500 });
    }
}

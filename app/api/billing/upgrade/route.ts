import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────
//  プレミアムへのアップグレード
//  isPremium を変更できる唯一の入口。条件：
//   1. セッション（ログイン）必須
//   2. 本登録済み（メール＋パスワード）必須
//
//  ★ TODO(リリース前必須): ここに実際の決済を組み込む。
//    - Web/PWA配信 → Stripe Checkout + Webhook で isPremium を更新
//    - App Store 配信 → Apple In-App Purchase（外部決済は審査NG）
//    - Google Play 配信 → Google Play Billing
//    現状は決済なしで付与される「テスト用スタブ」。
// ─────────────────────────────────────────────────────────────

export async function POST() {
    try {
        const userId = await getSessionUserId();
        if (!userId) {
            return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
        }
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        if (!user.email || !user.passwordHash) {
            return NextResponse.json({ error: 'プレミアムには本登録（メール＋パスワード）が必要です', needsRegistration: true }, { status: 403 });
        }

        const updated = await prisma.user.update({ where: { id: userId }, data: { isPremium: true } });
        return NextResponse.json({ isPremium: updated.isPremium });
    } catch (error) {
        console.error('upgrade error:', error);
        return NextResponse.json({ error: 'アップグレードに失敗しました' }, { status: 500 });
    }
}

// 解約（スタブ。実決済導入後はサブスクのキャンセルと連動させる）
export async function DELETE() {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    await prisma.user.update({ where: { id: userId }, data: { isPremium: false } }).catch(() => null);
    return NextResponse.json({ isPremium: false });
}

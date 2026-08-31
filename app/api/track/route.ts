import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 計測する正当なイベント名（ジャンク混入を防ぐ allowlist）
const ALLOWED = new Set([
  'landing_view',     // トップ/イントロ表示
  'home_view',
  'home_cta_click',
  'article_view',
  'article_cta_click',
  'diagnosis_view',
  'diagnosis_start',
  'diagnosis_answer',
  'diagnosis_complete',
  'diagnosis_to_start',
  'result_save',
  'share_click',
  'share_landing_view',
  'share_landing_cta_click',
  'start_view',
  'partner_selected',
  'first_question',
  'registration_complete',
  'onboarding_start', // オンボーディング開始
  'reading_complete', // 初回鑑定が生成された（オンボ完了）
  'app_open',         // マイページ表示＝アクティブ
  'paywall_view',     // プレミアム訴求が見えた
  'paywall_click',    // プレミアム訴求を開いた
  'founding_interest',// 先行登録＝「払う意思」の最強signal（validate-first）
  'purchase',         // 実課金（P2以降）
]);

// 第一者ファネル計測。未ログインでも anonId で追える。fire-and-forget。
export async function POST(request: Request) {
  try {
    const { name, anonId, userId, props } = await request.json().catch(() => ({}));
    if (typeof name !== 'string' || !ALLOWED.has(name)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await prisma.event.create({
      data: {
        name,
        anonId: typeof anonId === 'string' ? anonId.slice(0, 64) : null,
        userId: typeof userId === 'string' ? userId.slice(0, 64) : null,
        props: props != null ? JSON.stringify(props).slice(0, 2000) : null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    // 計測失敗はアプリ動作に影響させない
    return NextResponse.json({ ok: false });
  }
}

// ─────────────────────────────────────────────────────────────
//  Web Push 送信ユーティリティ（VAPID）
//  - 送信は web-push に委譲。期限切れ購読(404/410)は自動削除。
//  - 毎日の通知文はキャラ口調＋実計算スコアの決定論テンプレ。
//    cron で全ユーザー分を回すため LLM は使わない（コスト・タイムアウト回避）。
// ─────────────────────────────────────────────────────────────

import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import type { DailyState } from '@/lib/engine/types';

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:orba.support@gmail.com';

let configured = false;
export function ensureVapid(): boolean {
  if (configured) return true;
  if (!PUBLIC || !PRIVATE) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export type StoredSub = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

// 1件送信。成功true。期限切れ(404/410)はDBから削除しfalse。
export async function sendPush(sub: StoredSub, payload: PushPayload): Promise<boolean> {
  if (!ensureVapid()) return false;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) {
      // 購読が無効化された端末 → 掃除
      await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } }).catch(() => {});
    } else {
      console.warn('push send failed:', status, (err as Error)?.message);
    }
    return false;
  }
}

// ── 毎日の通知文（キャラ口調・実スコア反映・LLM不使用） ──────
const ATTACK: Record<string, string> = {
  fairy: '今日はきらめく追い風の日だよ。やりたいこと、いっちゃえ✨',
  shaman: '今日は流れがあなたに味方しています。一歩、踏み出してみましょう。',
  sage: '今日は攻めていい日だね。動いた分だけ返ってくると思う。',
  friend: '今日めっちゃ流れ来てるじゃん！やりたいことやっちゃお🔥',
  cool: '今日は追い風だ。動け。結果はついてくる。',
  burn: '今日は攻めの日だ！迷うな、いけ！🔥',
};
const DEFENSE: Record<string, string> = {
  fairy: '今日はそっと整える日かな。無理せず、自分をいたわってね🌙',
  shaman: '今日は静かに力を蓄える日。焦らず、内側を整えましょう。',
  sage: '今日は守りの日だね。新しく動くより、足元を固めるといい。',
  friend: '今日はちょい充電モードかも。無理しないでいこ〜🌙',
  cool: '今日は守りの日だ。深追いするな。整えておけ。',
  burn: '今日は溜める日だ！次に爆発させるために、今は構えろ！',
};

export function dailyTeaser(characterType: string | null | undefined, daily: DailyState): PushPayload {
  const ct = characterType && ATTACK[characterType] ? characterType : 'fairy';
  const line = daily.phase === 'attack' ? ATTACK[ct] : DEFENSE[ct];
  return {
    title: `Orba ✦ 今日の運気 ${daily.score}`,
    body: `${line}（${daily.moon.phaseName}・宿は${daily.sukuyoDay}）`,
    url: '/mypage',
    tag: 'orba-daily',
  };
}

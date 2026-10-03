// ─────────────────────────────────────────────────────────────
//  認証ユーティリティ（メール＋パスワード）
//  - パスワードは scrypt + 個別ソルトで一方向ハッシュ（平文は保存しない）
//  - セッションは HMAC 署名トークンを httpOnly クッキーで保持
//  外部サービス不要。秘密鍵は AUTH_SECRET（サーバーのみ）。
// ─────────────────────────────────────────────────────────────

import { scryptSync, randomBytes, timingSafeEqual, createHmac, createHash } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { User } from '@prisma/client';

const SECRET = process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-insecure-secret-change-me');
export const SESSION_COOKIE = 'guf_session';
export const GUEST_COOKIE_PREFIX = 'guf_guest_';
const MAX_AGE = 60 * 60 * 24 * 30; // 30日

// ── パスワード ────────────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const hash = scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  return keyBuf.length === hash.length && timingSafeEqual(keyBuf, hash);
}

// ── セッショントークン（userId を HMAC 署名） ─────────────
function sign(userId: string): string {
  if (!SECRET) throw new Error('Session authentication is not configured');
  return createHmac('sha256', SECRET).update(userId).digest('hex');
}

export function createSessionToken(userId: string): string {
  const token = `${userId}:${sign(userId)}`;
  return Buffer.from(token).toString('base64url');
}

export function verifySessionToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const idx = decoded.lastIndexOf(':');
    if (idx < 0) return null;
    const userId = decoded.slice(0, idx);
    const sig = decoded.slice(idx + 1);
    const expected = sign(userId);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return userId;
  } catch {
    return null;
  }
}

// ── パスワードリセット用トークン ─────────────────────────
// 生トークンはメールでのみ送り、DBにはSHA-256ハッシュを保存する。
export function generateResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  return { raw, hash: createHash('sha256').update(raw).digest('hex') };
}
export function hashResetToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: MAX_AGE,
};

export function guestCookieName(userId: string): string {
  if (!/^[a-zA-Z0-9-]{1,64}$/u.test(userId)) throw new Error('Invalid profile identifier');
  return `${GUEST_COOKIE_PREFIX}${userId}`;
}

// Additional guest profiles need their own signed, httpOnly proof of ownership.
// Never mint this proof for a supplied existing ID without verifying ownership first.
export async function hasProfileSession(userId: string): Promise<boolean> {
  if (await getSessionUserId() === userId) return true;
  if (!/^[a-zA-Z0-9-]{1,64}$/u.test(userId)) return false;
  const store = await cookies();
  const token = store.get(guestCookieName(userId))?.value;
  return !!token && verifySessionToken(token) === userId;
}

// 現在のセッションの userId を取得（route handler / server component 用）
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// ── アクセス制御 ──────────────────────────────────────────
// Every profile, including a guest, requires signed owner-session proof.
export type AccessResult =
  | { ok: true; user: User }
  | { ok: false; status: number; error: string };

export async function checkUserAccess(userId: string | null | undefined): Promise<AccessResult> {
  if (!userId) return { ok: false, status: 400, error: 'userId required' };
  const sessionId = await getSessionUserId();
  if (sessionId !== userId && !await hasProfileSession(userId)) {
    return { ok: false, status: 403, error: 'プロフィールの所有者確認が必要です。登録済みの方はログインしてください。' };
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, status: 404, error: 'User not found' };
  if (user.passwordHash) {
    if (sessionId !== user.id) {
      return { ok: false, status: 403, error: 'ログインが必要です' };
    }
  }
  return { ok: true, user };
}

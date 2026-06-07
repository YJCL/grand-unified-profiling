// ─────────────────────────────────────────────────────────────
//  認証ユーティリティ（メール＋パスワード）
//  - パスワードは scrypt + 個別ソルトで一方向ハッシュ（平文は保存しない）
//  - セッションは HMAC 署名トークンを httpOnly クッキーで保持
//  外部サービス不要。秘密鍵は AUTH_SECRET（サーバーのみ）。
// ─────────────────────────────────────────────────────────────

import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'crypto';
import { cookies } from 'next/headers';

const SECRET = process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
export const SESSION_COOKIE = 'guf_session';
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

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: MAX_AGE,
};

// 現在のセッションの userId を取得（route handler / server component 用）
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

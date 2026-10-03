import { NextResponse } from 'next/server';
import { SESSION_COOKIE, GUEST_COOKIE_PREFIX } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
    const store = await cookies();
    for (const cookie of store.getAll()) {
        if (cookie.name.startsWith(GUEST_COOKIE_PREFIX)) res.cookies.set(cookie.name, '', { path: '/', maxAge: 0 });
    }
    return res;
}

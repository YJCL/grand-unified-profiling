import { NextRequest, NextResponse } from 'next/server';

function challenge(message = 'Authentication required') {
  return new NextResponse(message, {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Orba Admin", charset="UTF-8"' },
  });
}

// 管理画面と管理APIは公開URL上のキーではなくHTTP Basic認証で保護する。
export function proxy(request: NextRequest) {
  const user = process.env.ADMIN_BASIC_USER || 'orba-admin';
  // 既存環境ではADMIN_KEYを移行用フォールバックとして利用できる。
  const password = process.env.ADMIN_BASIC_PASSWORD || process.env.ADMIN_KEY;
  if (!user || !password) return new NextResponse('Admin access is not configured', { status: 503 });

  const expected = `Basic ${btoa(`${user}:${password}`)}`;
  const received = request.headers.get('authorization');
  if (received !== expected) return challenge();
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

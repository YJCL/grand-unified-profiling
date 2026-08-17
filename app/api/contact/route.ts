import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

const SUPPORT_EMAIL = 'orba.support@gmail.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>;
    const name = String(input.name || '').trim().slice(0, 80);
    const email = String(input.email || '').trim().toLowerCase().slice(0, 160);
    const category = String(input.category || 'その他').trim().slice(0, 40);
    const message = String(input.message || '').trim().slice(0, 4000);
    const website = String(input.website || '').trim();

    // Botだけが入力しやすいハニーポット。外部には成功を返す。
    if (website) return NextResponse.json({ ok: true });
    if (!name || !EMAIL_RE.test(email) || message.length < 10) {
      return NextResponse.json({ error: '入力内容をご確認ください。' }, { status: 400 });
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCategory = escapeHtml(category);
    const safeMessage = escapeHtml(message).replaceAll('\n', '<br>');
    const result = await sendEmail({
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `【Orbaお問い合わせ】${category}`,
      html: `
        <div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#19152c">
          <h1 style="font-size:20px">Orba お問い合わせ</h1>
          <p><strong>お名前</strong><br>${safeName}</p>
          <p><strong>返信先</strong><br>${safeEmail}</p>
          <p><strong>種別</strong><br>${safeCategory}</p>
          <p><strong>内容</strong><br>${safeMessage}</p>
        </div>`,
    });
    if (!result.ok) {
      return NextResponse.json({ error: '送信できませんでした。時間をおいて再度お試しください。' }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[contact] error', error);
    return NextResponse.json({ error: '送信できませんでした。時間をおいて再度お試しください。' }, { status: 500 });
  }
}

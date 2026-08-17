// ─────────────────────────────────────────────────────────────
//  メール送信（Resend）
//  RESEND_API_KEY が未設定なら送信せず警告（開発時はリンクをログ出力）。
//  本番で実ユーザーに送るには Resend で送信ドメイン(orba.life)の認証が必要。
// ─────────────────────────────────────────────────────────────

const FROM = process.env.EMAIL_FROM || 'Orba <noreply@orba.life>';

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<{ ok: boolean; skipped?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY 未設定のため送信スキップ:', opts.subject, '→', opts.to);
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      console.error('[email] 送信失敗:', res.status, await res.text().catch(() => ''));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error('[email] 送信エラー:', e);
    return { ok: false };
  }
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: '【Orba】パスワード再設定のご案内',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1635">
        <p style="font-size:20px;font-weight:bold;color:#b8860b">Orba</p>
        <p>パスワード再設定のリクエストを受け付けました。</p>
        <p>下のボタンから新しいパスワードを設定してください（有効期限：1時間）。</p>
        <p style="margin:28px 0">
          <a href="${resetUrl}" style="background:linear-gradient(135deg,#f0c860,#e09a40);color:#2a1c08;text-decoration:none;padding:12px 28px;border-radius:9999px;font-weight:bold">パスワードを再設定する</a>
        </p>
        <p style="font-size:12px;color:#777">ボタンが押せない場合は次のURLをブラウザで開いてください：<br>${resetUrl}</p>
        <p style="font-size:12px;color:#777">このメールに心当たりがない場合は破棄してください。パスワードは変更されません。</p>
      </div>`,
  };
}

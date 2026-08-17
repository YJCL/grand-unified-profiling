'use client';

import { FormEvent, useState } from 'react';

export function ContactForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    setError('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(data)),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setError(result.error || '送信できませんでした。');
      setState('error');
      return;
    }
    form.reset();
    setState('sent');
  }

  if (state === 'sent') {
    return (
      <div className="rounded-2xl border border-amber-200/20 bg-white/[0.04] p-7" role="status">
        <h2 className="text-lg text-amber-100 mb-2">送信しました</h2>
        <p className="text-sm leading-relaxed text-white/65">お問い合わせありがとうございます。内容を確認のうえ、通常3営業日以内を目安に返信します。</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.035] p-6 md:p-8">
      <div className="grid md:grid-cols-2 gap-5">
        <label className="block text-sm text-white/70">
          お名前
          <input name="name" required maxLength={80} autoComplete="name" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-amber-200/40" />
        </label>
        <label className="block text-sm text-white/70">
          メールアドレス
          <input name="email" type="email" required maxLength={160} autoComplete="email" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-amber-200/40" />
        </label>
      </div>
      <label className="block text-sm text-white/70">
        お問い合わせ種別
        <select name="category" className="mt-2 w-full rounded-xl border border-white/10 bg-[#151127] px-4 py-3 text-white outline-none focus:border-amber-200/40">
          <option>サービスについて</option>
          <option>お支払い・解約について</option>
          <option>アカウントについて</option>
          <option>不具合のご報告</option>
          <option>その他</option>
        </select>
      </label>
      <label className="block text-sm text-white/70">
        お問い合わせ内容
        <textarea name="message" required minLength={10} maxLength={4000} rows={7} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-amber-200/40" />
      </label>
      <label className="hidden" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {state === 'error' && <p className="text-sm text-red-300" role="alert">{error}</p>}
      <button type="submit" disabled={state === 'sending'} className="rounded-full bg-amber-200 px-7 py-3 text-sm font-bold text-[#281d0f] disabled:opacity-50">
        {state === 'sending' ? '送信中…' : 'お問い合わせを送信'}
      </button>
    </form>
  );
}

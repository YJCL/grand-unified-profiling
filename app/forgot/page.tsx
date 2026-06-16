'use client';

import { useState } from 'react';
import Link from 'next/link';
import { OrbField } from '@/app/components/OrbField';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setSent(true);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-mesh text-white relative flex items-center justify-center px-4">
      <OrbField count={14} />
      <div className="relative z-10 w-full max-w-sm card p-7 rounded-3xl">
        <p className="font-display italic text-amber-200/70 text-2xl mb-1">Orba</p>
        <h1 className="text-xl mb-4 font-serif-jp">パスワードの再設定</h1>
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-white/75 font-serif-jp leading-relaxed">
              ご登録のメールアドレス宛に、再設定用のリンクを送信しました（届くまで数分かかる場合があります）。メールが届かない場合は、迷惑メールフォルダもご確認ください。
            </p>
            <Link href="/" className="block text-center text-xs text-white/40 hover:text-white/70">← トップへ戻る</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-xs text-white/45 font-serif-jp mb-1">登録したメールアドレスを入力してください。再設定用リンクをお送りします。</p>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メールアドレス"
              className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-amber-200/40" />
            <button type="submit" disabled={loading} className="w-full btn-gold py-3 font-bold disabled:opacity-50">
              {loading ? '送信中…' : '再設定リンクを送る'}
            </button>
            <Link href="/" className="block text-center text-xs text-white/40 hover:text-white/70 pt-1">← 戻る</Link>
          </form>
        )}
      </div>
    </main>
  );
}

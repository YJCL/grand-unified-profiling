'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { OrbField } from '@/app/components/OrbField';

function ResetInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'エラーが発生しました'); setLoading(false); return; }
      localStorage.setItem('guf_user_id', data.id);
      router.push('/mypage');
    } catch {
      setError('通信に失敗しました');
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-sm card p-7 rounded-3xl">
      <p className="font-display italic text-amber-200/70 text-2xl mb-1">Orba</p>
      <h1 className="text-xl mb-4 font-serif-jp">新しいパスワードを設定</h1>
      {!token ? (
        <div className="space-y-3">
          <p className="text-sm text-rose-300 font-serif-jp">リンクが正しくありません。もう一度お試しください。</p>
          <Link href="/forgot" className="block text-center text-xs text-white/40 hover:text-white/70">再設定をやり直す</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="新しいパスワード（8文字以上）"
            className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-amber-200/40" />
          {error && <p className="text-xs text-rose-300">{error}</p>}
          <button type="submit" disabled={loading} className="w-full btn-gold py-3 font-bold disabled:opacity-50">
            {loading ? '設定中…' : 'パスワードを設定してログイン'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPage() {
  return (
    <main className="min-h-screen bg-mesh text-white relative flex items-center justify-center px-4">
      <OrbField count={14} />
      <Suspense fallback={<div className="relative z-10 w-10 h-10 rounded-full border-2 border-dashed border-amber-300/40 animate-spin" />}>
        <ResetInner />
      </Suspense>
    </main>
  );
}

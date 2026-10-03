'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function TransferRestore() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  return <details className="text-sm text-white/70">
    <summary className="cursor-pointer">既存プロフィールの引き継ぎコードを使う</summary>
    <p className="mt-3 text-xs leading-relaxed">所有者の端末で発行したR1-で始まる35文字のコードで、既存プロフィールを開きます。新しいアカウントは作成しません。コードは他人に渡さないでください。</p>
    <form className="mt-3 space-y-3" onSubmit={async event => {
      event.preventDefault(); setLoading(true); setError('');
      try {
        const response = await fetch('/api/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.trim().toUpperCase() }) });
        const data = await response.json();
        if (!response.ok) { setError(data.error || '引き継ぎできませんでした。'); return; }
        localStorage.setItem('guf_user_id', data.id);
        const stored = JSON.parse(localStorage.getItem('guf_profiles') || '[]') as { id: string }[];
        localStorage.setItem('guf_profiles', JSON.stringify([{ id: data.id, name: null, profileType: data.profileType || 'self' }, ...stored.filter(profile => profile.id !== data.id)]));
        router.push('/mypage'); router.refresh();
      } catch { setError('通信に失敗しました。'); }
      finally { setLoading(false); }
    }}>
      <input aria-label="引き継ぎコード" autoComplete="off" value={code} onChange={event => setCode(event.target.value)} maxLength={35} className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2" />
      {error && <p role="alert" className="text-rose-300">{error}</p>}
      <button type="submit" className="btn-gold w-full py-2" disabled={loading || !/^R1-[a-fA-F0-9]{32}$/i.test(code.trim())}>{loading ? '確認中…' : '既存プロフィールを開く'}</button>
    </form>
  </details>;
}

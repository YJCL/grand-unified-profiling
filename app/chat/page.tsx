'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { OrbaAppNav } from '@/app/components/OrbaAppNav';
import { ProfileSessionRecovery } from '@/app/components/ProfileSessionRecovery';
type Message = { role: 'user' | 'assistant'; content: string };
export default function ChatHistoryPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsOwner, setNeedsOwner] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const id = localStorage.getItem('guf_user_id');
    if (!id) {
      queueMicrotask(() => { if (!controller.signal.aborted) { setNeedsOwner(true); setLoading(false); } });
      return () => controller.abort();
    }
    fetch('/api/chat?userId=' + encodeURIComponent(id), { signal: controller.signal })
      .then(async response => {
        if (response.status === 403 || response.status === 401) { setNeedsOwner(true); return; }
        if (!response.ok) throw new Error('history unavailable');
        const data = await response.json();
        setMessages((data.messages || []).filter((m: Message) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'));
      }).catch(() => { if (!controller.signal.aborted) setError('会話履歴を読み込めませんでした。'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  if (needsOwner) return <ProfileSessionRecovery />;
  return <div className="orba-service-page hig-shell"><OrbaAppNav /><main className="max-w-2xl mx-auto px-5 py-8 space-y-5 text-white">
    <h1 className="text-2xl font-serif-jp">これまでの会話履歴</h1>
    <p className="text-sm text-white/70">保存した会話を閲覧できます。</p>
    <Link href="/mypage" className="underline text-sm">マイページに戻る</Link>
    {loading ? <p role="status">履歴を読み込んでいます。</p> : error ? <p role="alert">{error}</p> : messages.length === 0 ? <p>保存された会話履歴はありません。</p> : messages.map((message, index) => <article key={index} className="card rounded-2xl p-5"><p className="text-xs text-white/40 mb-2">{message.role === 'user' ? 'あなた' : 'Orba'}</p><p className="whitespace-pre-wrap leading-relaxed">{message.content}</p></article>)}
  </main></div>;
}

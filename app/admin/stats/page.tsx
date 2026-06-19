'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type Stats = {
  generatedAt: string;
  users: { total: number; registered: number; premium: number; withReading: number; signups7d: number; pushSubs: number };
  active: { dau: number; wau: number; mau: number };
  funnel30d: { landing: number; onboardingStart: number; readingComplete: number; startRate: number; completeRate: number };
  monetization30d: { paywallView: number; paywallClick: number; foundingInterest: number; purchase: number; clickRate: number; intentRate: number };
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-white/40">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-200/80">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{children}</div>
    </section>
  );
}

function Dashboard() {
  const key = useSearchParams().get('key') || '';
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!key) { setErr('?key=<ADMIN_KEY> が必要です'); return; }
    fetch(`/api/admin/stats?key=${encodeURIComponent(key)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 401 ? 'ADMIN_KEY が違います' : `HTTP ${r.status}`);
        return r.json();
      })
      .then(setStats)
      .catch((e) => setErr(e.message));
  }, [key]);

  if (err) return <div className="p-8 text-red-300">{err}</div>;
  if (!stats) return <div className="p-8 text-white/40">読み込み中…</div>;

  const s = stats;
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="mb-1 text-xl font-bold text-white">Orba — ファネル統計</h1>
      <p className="mb-8 text-[11px] text-white/30">更新: {new Date(s.generatedAt).toLocaleString('ja-JP')}</p>

      <Section title="ユーザー">
        <Stat label="累計ユーザー" value={s.users.total} sub={`本登録 ${s.users.registered}`} />
        <Stat label="鑑定済み" value={s.users.withReading} sub="birthDateあり" />
        <Stat label="プレミアム" value={s.users.premium} />
        <Stat label="新規(7日)" value={s.users.signups7d} />
        <Stat label="プッシュ購読" value={s.users.pushSubs} />
      </Section>

      <Section title="アクティブ（distinct識別子）">
        <Stat label="DAU(1日)" value={s.active.dau} />
        <Stat label="WAU(7日)" value={s.active.wau} />
        <Stat label="MAU(30日)" value={s.active.mau} />
      </Section>

      <Section title="獲得ファネル（30日）">
        <Stat label="訪問 landing" value={s.funnel30d.landing} />
        <Stat label="オンボ開始" value={s.funnel30d.onboardingStart} sub={`訪問→開始 ${s.funnel30d.startRate}%`} />
        <Stat label="鑑定完了" value={s.funnel30d.readingComplete} sub={`開始→完了 ${s.funnel30d.completeRate}%`} />
      </Section>

      <Section title="課金（30日）">
        <Stat label="paywall表示" value={s.monetization30d.paywallView} />
        <Stat label="paywall開封" value={s.monetization30d.paywallClick} sub={`表示→開封 ${s.monetization30d.clickRate}%`} />
        <Stat label="先行登録" value={s.monetization30d.foundingInterest} sub={`課金欲 ${s.monetization30d.intentRate}%`} />
        <Stat label="実課金" value={s.monetization30d.purchase} />
      </Section>
    </div>
  );
}

export default function AdminStatsPage() {
  return (
    <main className="min-h-screen bg-[#080818] text-white">
      <Suspense fallback={<div className="p-8 text-white/40">読み込み中…</div>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

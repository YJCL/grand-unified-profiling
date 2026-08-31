'use client';

import { useEffect, useState } from 'react';

type Stats = {
  generatedAt: string;
  users: { total: number; registered: number; premium: number; withReading: number; signups7d: number; pushSubs: number };
  active: { dau: number; wau: number; mau: number };
  funnel30d: {
    homeView: number; articleView: number; articleCta: number; diagnosisView: number; diagnosisStart: number;
    diagnosisComplete: number; diagnosisToStart: number; startView: number; partnerSelected: number;
    firstQuestion: number; readingComplete: number; articleCtaRate: number; diagnosisStartRate: number;
    diagnosisCompleteRate: number; diagnosisToStartRate: number; partnerRate: number; questionRate: number; readingRate: number;
  };
  monetization30d: { paywallView: number; paywallClick: number; foundingInterest: number; purchase: number; clickRate: number; intentRate: number };
  aiSafety30d: {
    total: number;
    categories: Record<string, number>;
    recent: Array<{ createdAt: string; route?: string; phase?: string; action?: string; categories?: string[]; ruleIds?: string[] }>;
  };
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 401 ? '管理者認証が必要です' : `HTTP ${r.status}`);
        return r.json();
      })
      .then(setStats)
      .catch((e) => setErr(e.message));
  }, []);

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
        <Stat label="トップ閲覧" value={s.funnel30d.homeView} />
        <Stat label="記事閲覧" value={s.funnel30d.articleView} />
        <Stat label="記事CTA" value={s.funnel30d.articleCta} sub={`記事→CTA ${s.funnel30d.articleCtaRate}%`} />
        <Stat label="ミニ診断閲覧" value={s.funnel30d.diagnosisView} />
        <Stat label="ミニ診断開始" value={s.funnel30d.diagnosisStart} sub={`閲覧→開始 ${s.funnel30d.diagnosisStartRate}%`} />
        <Stat label="ミニ診断完了" value={s.funnel30d.diagnosisComplete} sub={`開始→完了 ${s.funnel30d.diagnosisCompleteRate}%`} />
        <Stat label="ミニ診断→本編" value={s.funnel30d.diagnosisToStart} sub={`完了→本編 ${s.funnel30d.diagnosisToStartRate}%`} />
        <Stat label="本編 /start" value={s.funnel30d.startView} />
        <Stat label="相棒選択" value={s.funnel30d.partnerSelected} sub={`本編→選択 ${s.funnel30d.partnerRate}%`} />
        <Stat label="最初の回答" value={s.funnel30d.firstQuestion} sub={`選択→回答 ${s.funnel30d.questionRate}%`} />
        <Stat label="初回鑑定完了" value={s.funnel30d.readingComplete} sub={`回答→完了 ${s.funnel30d.readingRate}%`} />
      </Section>

      <Section title="課金（30日）">
        <Stat label="paywall表示" value={s.monetization30d.paywallView} />
        <Stat label="paywall開封" value={s.monetization30d.paywallClick} sub={`表示→開封 ${s.monetization30d.clickRate}%`} />
        <Stat label="先行登録" value={s.monetization30d.foundingInterest} sub={`課金欲 ${s.monetization30d.intentRate}%`} />
        <Stat label="実課金" value={s.monetization30d.purchase} />
      </Section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-200/80">AI安全性（30日）</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label="安全ルール作動" value={s.aiSafety30d.total} sub="原文は安全ログに保存しません" />
          {Object.entries(s.aiSafety30d.categories).map(([category, count]) => (
            <Stat key={category} label={category} value={count} />
          ))}
        </div>
        <div className="mt-3 overflow-hidden rounded-xl bg-white/[0.03]">
          {s.aiSafety30d.recent.length === 0 ? (
            <p className="p-4 text-xs text-white/45">直近30日に検知記録はありません。</p>
          ) : s.aiSafety30d.recent.map((item, index) => (
            <div key={`${item.createdAt}-${index}`} className="flex flex-wrap gap-x-3 gap-y-1 border-b border-white/8 px-4 py-3 text-[11px] text-white/60 last:border-b-0">
              <time>{new Date(item.createdAt).toLocaleString('ja-JP')}</time>
              <strong className="text-white/80">{item.route} / {item.action}</strong>
              <span>{(item.categories || []).join(', ') || (item.ruleIds || []).join(', ')}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ROADMAP 採用判断ゲート: 鑑定完了の5%以上が Founding 登録なら拡散投資にコミット */}
      <section className="mb-8 rounded-2xl border border-amber-300/20 bg-amber-400/[0.04] p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-amber-200">採用判断ゲート（30日）</h2>
        <p className="mb-4 text-[11px] text-white/40">鑑定完了者のうち何%がFoundingに登録したか。<strong className="text-amber-200">5%以上</strong>で拡散投資にフルコミット判断。母数は100以上が望ましい。</p>
        {(() => {
          const reads = s.funnel30d.readingComplete;
          const founding = s.monetization30d.foundingInterest;
          const conv = reads > 0 ? Math.round((founding / reads) * 1000) / 10 : 0;
          const ready = reads >= 100;
          const ok = ready && conv >= 5;
          const verdict = !ready ? `判定保留（鑑定完了 ${reads}/100）` : ok ? `✅ ${conv}% — 拡散投資GO` : conv >= 3 ? `⚠ ${conv}% — 微妙、製品見直し検討` : `❌ ${conv}% — 製品の何かが弱い`;
          const color = !ready ? 'text-white/70' : ok ? 'text-amber-200' : conv >= 3 ? 'text-yellow-300' : 'text-rose-300';
          return (
            <div>
              <div className={`text-2xl font-bold ${color}`}>{verdict}</div>
              <div className="mt-2 text-[11px] text-white/40">鑑定完了 {reads}人 → Founding {founding}人 ／ 閾値 5%</div>
            </div>
          );
        })()}
      </section>
    </div>
  );
}

export default function AdminStatsPage() {
  return (
    <main className="min-h-screen bg-[#080818] text-white">
      <Dashboard />
    </main>
  );
}

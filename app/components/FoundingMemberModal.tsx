'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MessageSquare, CalendarDays, CreditCard, BookOpen, Sparkles, ShieldCheck } from 'lucide-react';
import { track } from '@/lib/analytics';
import { PREMIUM_PRICE_LABEL, isBillingEnabled, isLaunchFreeActive, launchFreeUntilLabel } from '@/lib/launch';

const PERKS = [
  { icon: MessageSquare, text: '高品質な対話を1日50回まで', sub: '無料プランは1日3回まで' },
  { icon: BookOpen, text: '今日の鑑定を毎日ひらける', sub: '無料プランは鑑定チケットを1枚使用' },
  { icon: Sparkles, text: '易を1日1回立てられる', sub: '無料プランは最初の一卦を体験できます' },
  { icon: CalendarDays, text: '運気カレンダーを60日分ひと目で', sub: '無料プランは7日分まで' },
];

export function FoundingMemberModal({ onClose }: { userEmail?: string | null; onClose: () => void }) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const billingEnabled = isBillingEnabled();
  const launchFree = isLaunchFreeActive();
  const untilLabel = launchFreeUntilLabel();

  const checkout = async () => {
    if (!confirmed) return;
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      track('paywall_click', { provider: 'komoju', plan: 'orba_plus' });
      const response = await fetch('/api/billing/upgrade', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || '決済画面を開けませんでした');
      window.location.href = data.url;
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : '決済画面を開けませんでした');
      setCheckoutLoading(false);
    }
  };

  const title = billingEnabled ? 'Orba Plus' : launchFree ? 'ローンチ記念・無料開放中' : 'Orba Plus 受付準備中';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm glass p-6 rounded-2xl border border-amber-300/20"
        role="dialog"
        aria-modal="true"
        aria-labelledby="orba-plus-title"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
            <h3 id="orba-plus-title" className="text-base font-bold text-white">{title}</h3>
          </div>
          <button onClick={onClose} aria-label="閉じる" className="w-11 h-11 -mr-3 grid place-items-center text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[12px] text-white/55 mb-4 leading-relaxed">
          {billingEnabled ? (
            <>毎日の対話と運気の流れを、もっと深く。<strong className="text-amber-200">{PREMIUM_PRICE_LABEL}</strong>でご利用いただけます。</>
          ) : launchFree ? (
            <>現在は、通常Plusの機能も<strong className="text-amber-200">期間限定で無料</strong>でお使いいただけます。</>
          ) : (
            <>決済会社による最終確認中のため、現在は新規のお申し込みを受け付けていません。<strong className="text-amber-200">無料プランは通常どおり利用できます。</strong></>
          )}
        </p>

        <ul className="space-y-2.5 mb-4">
          {PERKS.map((perk) => (
            <li key={perk.text} className="flex items-start gap-2.5">
              <span className="flex-none mt-0.5 w-7 h-7 rounded-full bg-amber-400/10 text-amber-300 flex items-center justify-center">
                <perk.icon className="w-3.5 h-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] text-white leading-snug">{perk.text}</span>
                <span className="block text-[11px] text-white/35">{perk.sub}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mb-4 rounded-xl bg-white/[0.04] border border-white/10 p-3 text-[11px] text-white/55 leading-relaxed space-y-1">
          {billingEnabled ? (
            <>
              <p>・料金：<strong className="text-amber-200">{PREMIUM_PRICE_LABEL}</strong></p>
              <p>・初回決済後、毎月同日に自動更新されます。</p>
              <p>・18歳以上の方のみお申し込みいただけます。</p>
              <p className="text-white/35">いつでも解約可能です。解約後も支払済み期間の終了まではご利用いただけます。</p>
            </>
          ) : launchFree ? (
            <>
              <p>・Plus正式価格：<strong className="text-amber-200">{PREMIUM_PRICE_LABEL}</strong></p>
              <p>・無料開放期間：{untilLabel ? <strong className="text-white/80">{untilLabel}まで</strong> : '正式リリースまで'}（延長する場合があります）。</p>
              <p className="text-white/35">期間終了後は無料プランへ戻り、自動課金は発生しません。</p>
            </>
          ) : (
            <>
              <p>・正式価格：<strong className="text-amber-200">{PREMIUM_PRICE_LABEL}</strong></p>
              <p>・受付開始前に課金が発生することはありません。</p>
              <p>・開始後も、Plusへの加入は任意です。</p>
            </>
          )}
        </div>

        {billingEnabled ? (
          <>
            <label className="mb-3 flex items-start gap-2.5 text-[11px] text-white/60 leading-relaxed cursor-pointer">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 accent-amber-300" />
              <span>
                18歳以上で、<Link href="/legal/terms" className="text-amber-100 underline">利用規約</Link>・
                <Link href="/legal/cancellation" className="text-amber-100 underline">キャンセルポリシー</Link>・
                <Link href="/legal/tokushoho" className="text-amber-100 underline">特商法表記</Link>を確認しました。
              </span>
            </label>
            {checkoutError && <p className="mb-3 text-center text-[11px] text-rose-300">{checkoutError}</p>}
            <button onClick={checkout} disabled={checkoutLoading || !confirmed} className="w-full min-h-11 py-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 text-black text-sm font-bold hover:brightness-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              <span className="inline-flex items-center gap-2"><CreditCard className="w-4 h-4" />{checkoutLoading ? '決済画面を準備中…' : 'Orba Plusを始める'}</span>
            </button>
            <p className="mt-2 text-center text-[10px] text-white/30">カード情報はKOMOJUの決済画面で入力し、Orbaでは保持しません。</p>
          </>
        ) : (
          <button onClick={onClose} className="w-full min-h-11 py-3 rounded-full bg-white/10 text-white/80 text-sm font-bold hover:bg-white/15 transition-colors">
            {launchFree ? '無料で引き続き使う' : '無料プランへ戻る'}
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

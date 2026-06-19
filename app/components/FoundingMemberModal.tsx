'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Gift, Check, MessageSquare, CalendarDays } from 'lucide-react';
import { track } from '@/lib/analytics';
import { PREMIUM_PRICE_LABEL, launchFreeUntilLabel } from '@/lib/launch';

// ローンチ記念の無料開放を「期間限定・将来は有料・終了日」とともに明記するモーダル。
// 買えない価格を煽るのではなく、いま無料で使えること＋開始時の通知登録(任意)を案内する。
const PERKS = [
  { icon: MessageSquare, text: 'いつでも無制限に相談できる', sub: '通常プランは1日3回まで' },
  { icon: CalendarDays, text: '運気カレンダーを60日分ひと目で', sub: '通常プランは7日分まで' },
];

export function FoundingMemberModal({ userEmail, onClose }: { userEmail?: string | null; onClose: () => void }) {
  const [email, setEmail] = useState(userEmail || '');
  const [submitted, setSubmitted] = useState(false);
  const untilLabel = launchFreeUntilLabel();

  const submit = () => {
    const e = email.trim();
    track('founding_interest', e ? { email: e } : undefined);
    setSubmitted(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm glass p-6 rounded-2xl border border-amber-300/20"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-300" />
            <h3 className="text-base font-bold text-white">ローンチ記念・無料開放中</h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-amber-400/15 flex items-center justify-center">
              <Check className="w-6 h-6 text-amber-300" />
            </div>
            <p className="text-sm font-serif-jp text-white mb-1">ありがとう ✨</p>
            <p className="text-[12px] text-white/50 leading-relaxed">
              プレミアムの正式開始がきまったら、いちばんにお知らせします。<br />それまで全機能をたっぷり楽しんでね。
            </p>
            <button onClick={onClose} className="mt-5 w-full py-2.5 rounded-full bg-white/10 text-white/80 text-sm font-bold hover:bg-white/15 transition-colors">
              閉じる
            </button>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-white/55 mb-4 leading-relaxed">
              いまなら、通常はプレミアムの機能も<strong className="text-amber-200">すべて無料</strong>でお使いいただけます。
            </p>

            <ul className="space-y-2.5 mb-4">
              {PERKS.map((p) => (
                <li key={p.text} className="flex items-start gap-2.5">
                  <span className="flex-none mt-0.5 w-7 h-7 rounded-full bg-amber-400/10 text-amber-300 flex items-center justify-center">
                    <p.icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] text-white leading-snug">{p.text}</span>
                    <span className="block text-[11px] text-white/35">{p.sub}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* ★期間限定・将来有料・終了日を明記（誠実さの最低ライン） */}
            <div className="mb-4 rounded-xl bg-white/[0.04] border border-white/10 p-3 text-[11px] text-white/55 leading-relaxed space-y-1">
              <p>・これは<strong className="text-white/80">ローンチ記念の無料開放</strong>です。</p>
              <p>・正式版ではプレミアム機能は<strong className="text-amber-200">{PREMIUM_PRICE_LABEL}</strong>の予定です。</p>
              <p>・無料開放期間：{untilLabel ? <strong className="text-white/80">{untilLabel}まで</strong> : '正式リリースまで'}（延長する場合があります）。</p>
              <p className="text-white/35">期間終了後は無料プラン（チャット1日3回 ほか）に戻ります。</p>
            </div>

            <input
              type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス（任意・正式開始時にお知らせ）"
              className="w-full mb-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-300/40"
            />
            <button
              onClick={submit}
              className="w-full py-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 text-black text-sm font-bold hover:brightness-105 transition-all"
            >
              開始のお知らせを受け取る
            </button>
            <p className="mt-2 text-center text-[10px] text-white/25">いま課金は発生しません。登録は任意です。</p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

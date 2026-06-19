'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Crown, Check, MessageSquare, CalendarDays } from 'lucide-react';
import { track } from '@/lib/analytics';

// 月額の表示価格（working assumption。計測後に調整可）
export const PREMIUM_PRICE_LABEL = '¥480 / 月';

// ※ 実装済みの本物のゲートだけを載せる（誇大広告を避ける）。
const PERKS = [
  { icon: MessageSquare, text: 'いつでも無制限に相談できる', sub: '無料は1日3回まで' },
  { icon: CalendarDays, text: '運気カレンダーを60日分ひと目で', sub: '無料は7日分まで' },
];

// 先行登録（Founding Member）モーダル。
// 決済レールが整う前に「払う意思」を集める validate-first の中核。
export function FoundingMemberModal({ userEmail, onClose }: { userEmail?: string | null; onClose: () => void }) {
  const [email, setEmail] = useState(userEmail || '');
  const [submitted, setSubmitted] = useState(false);

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
            <Crown className="w-5 h-5 text-amber-300" />
            <h3 className="text-base font-bold text-white">Orba Premium</h3>
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
            <p className="text-sm font-serif-jp text-white mb-1">先行登録ありがとう ✨</p>
            <p className="text-[12px] text-white/50 leading-relaxed">
              正式公開のときに、先行メンバー価格でいちばんに お知らせします。<br />それまで無料機能を楽しんでね。
            </p>
            <button onClick={onClose} className="mt-5 w-full py-2.5 rounded-full bg-white/10 text-white/80 text-sm font-bold hover:bg-white/15 transition-colors">
              閉じる
            </button>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-white/50 mb-4">あなただけのパートナーを、もっと深く。</p>

            <ul className="space-y-2.5 mb-5">
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

            <div className="mb-4 rounded-xl bg-amber-400/[0.07] border border-amber-300/15 p-3 text-center">
              <span className="text-lg font-bold text-amber-200">{PREMIUM_PRICE_LABEL}</span>
              <span className="block text-[11px] text-amber-200/50 mt-0.5">近日公開・先行メンバー募集中</span>
            </div>

            <input
              type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス（任意・公開時にお知らせ）"
              className="w-full mb-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-300/40"
            />
            <button
              onClick={submit}
              className="w-full py-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 text-black text-sm font-bold hover:brightness-105 transition-all"
            >
              先行登録する（無料）
            </button>
            <p className="mt-2 text-center text-[10px] text-white/25">いま課金は発生しません。意思表明のみ。</p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

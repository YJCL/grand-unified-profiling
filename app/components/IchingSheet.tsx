'use client';

// ─────────────────────────────────────────────────────────────
//  易シート: 問いを書く → 卦を立てる → 結果を読む
//  チャット画面の「易を立てる」ボタンから開く軽量モーダル。
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, HelpCircle, History, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Interpretation = {
  situation: string;
  central: string;
  changing: string;
  caution: string;
  step: string;
  uncertainty: string;
  safety_notes?: string;
  riskFlags?: string[];
};

type HexagramRef = {
  num: number;
  name: string;
  summary: string;
  judgment: string;
  upper: { name: string; element: string };
  lower: { name: string; element: string };
};

type Reading = {
  id: string;
  question: string;
  values: number[];
  primary: HexagramRef;
  changingLines: number[];
  transformed: HexagramRef | null;
  interpretation: Interpretation;
  createdAt: string;
  reused?: boolean;
  reuseNote?: string;
};

type HistoryItem = {
  id: string;
  question: string;
  primaryNum: number;
  transformedNum: number | null;
  changingLines: number[];
  createdAt: string;
};

export function IchingSheet({
  userId,
  initialQuestion = '',
  onClose,
}: {
  userId: string;
  initialQuestion?: string;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [error, setError] = useState('');
  const [reading, setReading] = useState<Reading | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch(`/api/iching?userId=${userId}`);
      if (r.ok) {
        const d = await r.json();
        setHistory(d.items || []);
      }
    } catch { /* ignore */ }
  }, [userId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const cast = async () => {
    const q = question.trim();
    if (!q) { setError('問いを入力してください'); return; }
    setIsCasting(true); setError(''); setReading(null);
    try {
      const r = await fetch('/api/iching', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, question: q }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || 'うまく卦が立ちませんでした');
      } else {
        setReading(d);
        loadHistory();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '通信に失敗しました');
    } finally {
      setIsCasting(false);
    }
  };

  const openPast = async (id: string) => {
    setIsCasting(true); setError(''); setReading(null);
    try {
      const r = await fetch(`/api/iching?userId=${userId}&id=${id}`);
      const d = await r.json();
      if (!r.ok) setError(d.error || '取得できませんでした');
      else { setReading(d); setShowHistory(false); }
    } finally {
      setIsCasting(false);
    }
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
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto glass p-6 rounded-2xl border border-amber-300/20"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <h3 className="text-base font-bold text-white font-serif-jp">易を立てる</h3>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowHistory(s => !s)} title="履歴" className="p-1.5 text-white/30 hover:text-white/70 transition-colors">
              <History className="w-4 h-4" />
            </button>
            <button onClick={() => setShowHowTo(s => !s)} title="易の使い方" className="p-1.5 text-white/30 hover:text-white/70 transition-colors">
              <HelpCircle className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showHowTo && <HowTo />}
        {showHistory && (
          <HistoryList items={history} onOpen={openPast} />
        )}

        {/* 問いの入力 */}
        {!reading && (
          <>
            <p className="text-[11px] text-white/40 mb-2">いま気になっている一つの問いを、短くひとことで。</p>
            <textarea
              value={question} onChange={(e) => { setQuestion(e.target.value); setError(''); }}
              maxLength={400}
              placeholder="例：転職の話を進めるか、もう少し今の場所に居るか"
              rows={3}
              className="w-full mb-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-300/40 resize-none font-serif-jp"
            />
            <div className="flex items-center justify-between text-[10px] text-white/30 mb-3">
              <span>同じ問いを短時間に何度も立てることは推奨していません</span>
              <span>{question.length}/400</span>
            </div>
            {error && <p className="text-xs text-rose-300 mb-3">{error}</p>}
            <button
              onClick={cast}
              disabled={isCasting || !question.trim()}
              className="w-full py-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 text-black text-sm font-bold hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCasting ? <><Loader2 className="w-4 h-4 animate-spin" /> 卦を立てています…</> : 'この問いで易を立てる'}
            </button>
            <p className="mt-2 text-center text-[10px] text-white/25">易は判断材料を示すもので、未来を保証するものではありません。</p>
          </>
        )}

        {/* 結果表示 */}
        {reading && <ResultView reading={reading} onReset={() => { setReading(null); setQuestion(''); }} />}
      </motion.div>
    </motion.div>
  );
}

function HowTo() {
  return (
    <div className="mb-4 p-3 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-white/65 leading-relaxed space-y-1.5">
      <p className="text-amber-200/80 font-bold text-[12px] mb-1">易の使い方</p>
      <p>・一度に一つの問いに絞ってください。</p>
      <p>・単純な未来予測より、「いまの状況」や「向き合い方」を尋ねるのに向いています。</p>
      <p>・同じ問いについて短時間に何度も卦を立てないでください。</p>
      <p>・易は未来や結果を保証するものではなく、判断を整理するためのものです。</p>
      <p>・医療・法律・投資・安全に関する判断は、現実の情報や専門家の助言を優先してください。</p>
    </div>
  );
}

function HistoryList({ items, onOpen }: { items: HistoryItem[]; onOpen: (id: string) => void }) {
  if (items.length === 0) return (
    <div className="mb-4 p-3 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-white/40 text-center">まだ履歴はありません</div>
  );
  return (
    <div className="mb-4 rounded-xl border border-white/10 divide-y divide-white/8 max-h-48 overflow-y-auto">
      {items.map(it => (
        <button key={it.id} onClick={() => onOpen(it.id)} className="w-full text-left p-2.5 hover:bg-white/[0.04] transition-colors">
          <p className="text-xs text-white/80 truncate font-serif-jp">{it.question}</p>
          <p className="text-[10px] text-white/35 mt-0.5">
            {new Date(it.createdAt).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            {' · '}卦 {it.primaryNum}{it.transformedNum ? ` → ${it.transformedNum}` : ''}
            {it.changingLines.length ? ` · 変爻 ${it.changingLines.join('・')}` : ''}
          </p>
        </button>
      ))}
    </div>
  );
}

function ResultView({ reading, onReset }: { reading: Reading; onReset: () => void }) {
  const ip = reading.interpretation;
  return (
    <div className="space-y-4">
      {reading.reuseNote && (
        <div className="p-2.5 rounded-lg bg-amber-400/10 border border-amber-300/30 text-[11px] text-amber-100/90">{reading.reuseNote}</div>
      )}

      <div>
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">問い</p>
        <p className="text-sm text-white/90 font-serif-jp">{reading.question}</p>
      </div>

      <HexagramVisual values={reading.values} changingLines={reading.changingLines} />

      <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[10px] text-amber-200/80 uppercase tracking-widest">本卦</span>
          <span className="text-base font-bold text-white font-serif-jp">{reading.primary.name}</span>
          <span className="text-[10px] text-white/35 ml-auto">{reading.primary.upper.name}/{reading.primary.lower.name}</span>
        </div>
        <p className="text-[12px] text-white/70 leading-relaxed">{reading.primary.summary}</p>
        <p className="text-[10px] text-white/30 mt-1.5 font-mono">古典：{reading.primary.judgment}</p>
      </div>

      {reading.transformed && (
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[10px] text-amber-200/80 uppercase tracking-widest">之卦（変化の先）</span>
            <span className="text-base font-bold text-white font-serif-jp">{reading.transformed.name}</span>
          </div>
          <p className="text-[12px] text-white/70 leading-relaxed">{reading.transformed.summary}</p>
          <p className="text-[10px] text-white/30 mt-1.5">変爻：第 {reading.changingLines.join('・')} 爻</p>
        </div>
      )}

      {!reading.transformed && (
        <p className="text-[11px] text-white/40 text-center">変爻なし。卦の全体像をそのまま読みます。</p>
      )}

      <div className="space-y-2.5">
        <Section title="今の状況" body={ip.situation} />
        <Section title="卦が示す中心テーマ" body={ip.central} />
        <Section title="変化している部分" body={ip.changing} />
        <Section title="注意して扱うこと" body={ip.caution} />
        <Section title="今できる一歩" body={ip.step} />
        <Section title="断定できないこと" body={ip.uncertainty} dim />
        {ip.safety_notes && (
          <div className="rounded-xl border border-rose-300/30 bg-rose-500/[0.08] p-3">
            <p className="text-[10px] text-rose-200 uppercase tracking-widest mb-1">専門家・現実情報を優先</p>
            <p className="text-[12px] text-rose-50/90 leading-relaxed">{ip.safety_notes}</p>
          </div>
        )}
      </div>

      <button onClick={onReset} className="w-full py-2.5 rounded-full bg-white/10 text-white/80 text-xs font-bold hover:bg-white/15 transition-all">別の問いを立てる</button>
    </div>
  );
}

function Section({ title, body, dim }: { title: string; body: string; dim?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-3', dim ? 'border-white/8 bg-white/[0.02]' : 'border-white/10 bg-white/[0.04]')}>
      <p className="text-[10px] text-amber-200/70 uppercase tracking-widest mb-1.5">{title}</p>
      <p className={cn('text-[12.5px] leading-relaxed font-serif-jp', dim ? 'text-white/55' : 'text-white/85')}>{body}</p>
    </div>
  );
}

// 6本の爻を上から下に縦に並べる（伝統表記に合わせて上が第6爻、下が初爻）
function HexagramVisual({ values, changingLines }: { values: number[]; changingLines: number[] }) {
  // valuesは下→上の順なので、表示は逆順
  const lines = [...values].reverse();
  const numbersFromTop = [6, 5, 4, 3, 2, 1];
  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      {lines.map((v, i) => {
        const lineNum = numbersFromTop[i];
        const isYang = v === 9 || v === 7;
        const isChanging = v === 6 || v === 9;
        return (
          <div key={i} className="flex items-center gap-2 w-44">
            <span className="text-[9px] text-white/25 w-4 text-right">{lineNum}</span>
            {isYang ? (
              <div className={cn('h-1.5 flex-1 rounded-full', isChanging ? 'bg-amber-300' : 'bg-white/70')} />
            ) : (
              <div className="flex-1 flex gap-1.5">
                <div className={cn('h-1.5 flex-1 rounded-full', isChanging ? 'bg-amber-300' : 'bg-white/70')} />
                <div className={cn('h-1.5 flex-1 rounded-full', isChanging ? 'bg-amber-300' : 'bg-white/70')} />
              </div>
            )}
            <span className="text-[9px] w-4 text-amber-300/70">
              {isChanging ? (changingLines.includes(lineNum) ? '●' : '') : ''}
            </span>
          </div>
        );
      })}
      <p className="text-[10px] text-white/30 mt-1.5">陽=線一本／陰=線二本／変爻=金色</p>
    </div>
  );
}

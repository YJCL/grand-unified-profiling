'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Zap, Shield, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type DayScore } from '@/app/api/fortune-score/route';
import { OrbaAppNav } from '@/app/components/OrbaAppNav';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const fill = (score / 100) * circ;
    const color = score >= 70 ? '#F4C060' : score >= 50 ? '#8B7FD4' : '#4FC3CF';
    return (
        <svg width={size} height={size} className="rotate-[-90deg]">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
                strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
        </svg>
    );
}

export default function CalendarPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [birthDate, setBirthDate] = useState<string | null>(null);
    const [scores, setScores] = useState<DayScore[]>([]);
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [selected, setSelected] = useState<DayScore | null>(null);
    const [today] = useState(() => new Date().toISOString().split('T')[0]);
    const [weekOffset, setWeekOffset] = useState(0);

    useEffect(() => {
        const init = async () => {
            const id = localStorage.getItem('guf_user_id');
            if (!id) { router.push('/start'); return; }
            const res = await fetch(`/api/user?id=${id}`);
            if (!res.ok) { router.push('/start'); return; }
            const user = await res.json();
            if (!user.birthDate) { router.push('/mypage'); return; }
            setUserId(id);
            setBirthDate(user.birthDate);
        };
        init();
    }, [router]);

    useEffect(() => {
        if (!userId) return;
        fetch(`/api/fortune-score?userId=${userId}&range=60`)
            .then(r => r.json())
            .then(setScores);
    }, [userId]);

    // 週表示用: 今週 + weekOffset
    const getWeekDays = () => {
        const base = new Date(today);
        base.setDate(base.getDate() - base.getDay() + weekOffset * 7);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            return d.toISOString().split('T')[0];
        });
    };

    // 月表示用
    const getMonthDays = () => {
        const base = new Date(today);
        const year = base.getFullYear();
        const month = base.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days: (string | null)[] = Array(firstDay).fill(null);
        for (let d = 1; d <= daysInMonth; d++) {
            days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        }
        return days;
    };

    const getScore = (date: string) => scores.find(s => s.date === date);
    const weekDays = getWeekDays();
    const monthDays = getMonthDays();

    const todayScore = getScore(today);

    if (!birthDate) return (
        <div className="min-h-screen bg-mesh flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-yellow-400/50 animate-spin" />
        </div>
    );

    return (
        <div className="orba-service-page hig-shell service-calendar-shell">
        <OrbaAppNav />
        <main className="service-calendar-main min-h-screen w-full bg-mesh text-white">
            <div className="service-calendar-content max-w-2xl mx-auto px-4 py-8 space-y-6">

                {/* Header */}
                <header className="service-page-heading flex items-center justify-between">
                    <button onClick={() => router.push('/mypage')} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
                        <ChevronLeft className="w-4 h-4" /> 戻る
                    </button>
                    <h1 className="text-base font-serif-jp text-white/80">運気カレンダー</h1>
                    <div className="w-12" />
                </header>

                {/* 今日のスコア — ヒーロー */}
                {todayScore && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        className="glass service-calendar-today p-6 flex items-center gap-6"
                    >
                        <div className="relative flex-none">
                            <ScoreRing score={todayScore.score} size={80} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-bold text-gold">{todayScore.score}</span>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mb-1">Today</p>
                            <p className="text-lg font-bold text-white mb-1">
                                {new Date(today + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
                            </p>
                            <div className="flex items-center gap-3">
                                <span className={cn(
                                    'flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full',
                                    todayScore.phase === 'attack'
                                        ? 'bg-yellow-500/15 text-yellow-400'
                                        : 'bg-indigo-500/15 text-indigo-400'
                                )}>
                                    {todayScore.phase === 'attack' ? <Zap className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                    {todayScore.phase === 'attack' ? '攻め' : '守り'}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-white/30">
                                    <Moon className="w-3 h-3" /> {todayScore.moon}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 週/月 切り替え */}
                <div className="flex gap-2">
                    {(['week', 'month'] as const).map(mode => (
                        <button key={mode} onClick={() => setViewMode(mode)}
                            className={cn(
                                'px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-full transition-all',
                                viewMode === mode
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'text-white/30 hover:text-white'
                            )}
                        >
                            {mode === 'week' ? '週' : '月'}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {viewMode === 'week' ? (
                        <motion.div key="week" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {/* 週ナビ */}
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={() => setWeekOffset(p => p - 1)} className="p-2 text-white/30 hover:text-white transition-colors">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-xs text-white/40 uppercase tracking-widest">
                                    {weekOffset === 0 ? 'Today' : weekOffset === 1 ? 'Next Week' : weekOffset === -1 ? 'Last Week' : `${weekOffset > 0 ? '+' : ''}${weekOffset}w`}
                                </span>
                                <button onClick={() => setWeekOffset(p => p + 1)} className="p-2 text-white/30 hover:text-white transition-colors">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {WEEKDAYS.map(d => (
                                    <div key={d} className="text-center text-[10px] text-white/20 pb-1">{d}</div>
                                ))}
                                {weekDays.map((date, i) => {
                                    const s = getScore(date);
                                    const isToday = date === today;
                                    const day = parseInt(date.split('-')[2]);
                                    return (
                                        <motion.button key={date} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                            onClick={() => s && setSelected(s)}
                                            className={cn(
                                                'flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all',
                                                isToday ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5',
                                                selected?.date === date && 'ring-1 ring-yellow-400/50'
                                            )}
                                        >
                                            <span className={cn('text-xs font-bold', isToday ? 'text-yellow-400' : i === 0 ? 'text-red-400/70' : 'text-white/50')}>{day}</span>
                                            {s ? (
                                                <>
                                                    <ScoreRing score={s.score} size={36} />
                                                    <span className="text-[10px] font-bold" style={{ color: s.score >= 70 ? '#F4C060' : s.score >= 50 ? '#8B7FD4' : '#4FC3CF' }}>{s.score}</span>
                                                </>
                                            ) : <div className="w-9 h-9 rounded-full bg-white/5" />}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="month" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <p className="text-center text-xs text-white/30 mb-4 uppercase tracking-widest">
                                {new Date(today).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                            </p>
                            <div className="grid grid-cols-7 gap-1.5">
                                {WEEKDAYS.map(d => (
                                    <div key={d} className="text-center text-[10px] text-white/20 pb-1">{d}</div>
                                ))}
                                {monthDays.map((date, i) => {
                                    if (!date) return <div key={`empty-${i}`} />;
                                    const s = getScore(date);
                                    const isToday = date === today;
                                    const day = parseInt(date.split('-')[2]);
                                    const dow = new Date(date + 'T00:00:00').getDay();
                                    return (
                                        <motion.button key={date} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                                            onClick={() => s && setSelected(s)}
                                            className={cn(
                                                'aspect-square flex flex-col items-center justify-center rounded-xl gap-0.5 transition-all',
                                                isToday ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5',
                                                selected?.date === date && 'ring-1 ring-yellow-400/50'
                                            )}
                                        >
                                            <span className={cn('text-[11px] font-bold', isToday ? 'text-yellow-400' : dow === 0 ? 'text-red-400/60' : dow === 6 ? 'text-indigo-400/60' : 'text-white/40')}>{day}</span>
                                            {s && (
                                                <div className="w-4 h-1 rounded-full" style={{
                                                    background: s.score >= 70 ? '#F4C060' : s.score >= 50 ? '#8B7FD4' : '#4FC3CF',
                                                    opacity: 0.6 + (s.score / 100) * 0.4
                                                }} />
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 日別詳細パネル */}
                <AnimatePresence>
                    {selected && (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                            className="glass p-6 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mb-1">
                                        {new Date(selected.date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' })}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            'text-3xl font-bold',
                                            selected.score >= 70 ? 'text-yellow-400' : selected.score >= 50 ? 'text-indigo-400' : 'text-teal-400'
                                        )}>{selected.score}</span>
                                        <span className="text-sm text-white/30">/ 100</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={cn(
                                        'flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full',
                                        selected.phase === 'attack' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-indigo-500/15 text-indigo-400'
                                    )}>
                                        {selected.phase === 'attack' ? <Zap className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                        {selected.phase === 'attack' ? '攻め時' : '守り時'}
                                    </span>
                                    <span className="text-xs text-white/30 flex items-center gap-1"><Moon className="w-3 h-3" />{selected.moon}</span>
                                </div>
                            </div>

                            <div className="score-bar-track">
                                <div className="score-bar-fill" style={{ width: `${selected.score}%` }} />
                            </div>

                            <p className="text-sm text-white/50 leading-relaxed">
                                {selected.phase === 'attack'
                                    ? `スコア ${selected.score} — バイオリズムと${selected.moon}の力が重なる積極的な一日です。新しいことを始める、重要な連絡を取る、決断を下すのに適しています。`
                                    : `スコア ${selected.score} — ${selected.moon}の影響で内省と整理に向いた一日です。無理に動かず、計画を練り直すことで次の攻め時に備えましょう。`
                                }
                            </p>

                            <button onClick={() => setSelected(null)} className="text-xs text-white/20 hover:text-white/50 transition-colors">閉じる</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
        </div>
    );
}

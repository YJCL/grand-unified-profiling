'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    Sparkles, MessageSquare, CalendarDays, User,
    Zap, Shield, Target, RefreshCw, GripVertical,
    Settings, Crown, Moon, Plus, X, Copy, Check, Clock, Share2, Sun, LogOut, UserPlus
} from 'lucide-react';
import { useTheme } from '@/app/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { type AnalysisResult, type DailyContent } from '@/types';
import { CharacterAvatar, CHARACTER_META, type CharacterType } from '@/app/components/CharacterAvatar';
import { OrbField } from '@/app/components/OrbField';
import { AuthModal } from '@/app/components/AuthModal';
import { NotificationToggle } from '@/app/components/NotificationToggle';
import { track } from '@/lib/analytics';
import { FoundingMemberModal } from '@/app/components/FoundingMemberModal';
import { OrbaAppNav } from '@/app/components/OrbaAppNav';
import { isBillingEnabled, isLaunchFreeActive, launchFreeUntilLabel, PREMIUM_PRICE_LABEL } from '@/lib/launch';

function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text);
    }
    // Fallback for non-secure contexts
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return Promise.resolve();
}

type WidgetId = 'daily' | 'calendar' | 'chat' | 'profile';
const DEFAULT_ORDER: WidgetId[] = ['daily', 'calendar', 'chat', 'profile'];

type ProfileTab = {
    id: string;
    name: string | null;
    profileType: 'self' | 'family' | 'friend';
    expiresAt?: string | null;
};

type UserData = {
    id: string;
    email: string | null;
    name: string | null;
    birthDate: string | null;
    birthTime: string | null;
    birthPlace: string | null;
    gender: string | null;
    characterType: string | null;
    mbti: string | null;
    enneagram: string | null;
    createdAt: string;
    isPremium: boolean;
    tickets: number;
    widgetOrder: string | null;
    profileType: string | null;
    expiresAt: string | null;
    diagnoses: { id: string; createdAt: string; data: string }[];
};

// ── Widget Components ──────────────────────────────────────────

function DailyWidget({ userId }: { userId: string }) {
    const [daily, setDaily] = useState<DailyContent | null>(null);
    const [loading, setLoading] = useState(true);
    const today = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
    const isAttack = daily?.timing?.includes('攻め');

    useEffect(() => {
        fetch(`/api/daily?userId=${userId}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { setDaily(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [userId]);

    const refresh = async () => {
        setLoading(true); setDaily(null);
        const r = await fetch(`/api/daily?userId=${userId}&t=${Date.now()}`);
        if (r.ok) setDaily(await r.json());
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mb-1">{today}</p>
                    {loading ? <div className="h-7 w-36 bg-white/5 rounded animate-pulse" />
                        : <h3 className="text-xl font-bold text-white">{daily?.theme ?? '—'}</h3>}
                </div>
                <div className="flex items-center gap-2">
                    {!loading && daily && (
                        <span className={cn('flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border',
                            isAttack ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                        )}>
                            {isAttack ? <Zap className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
                            {isAttack ? '攻め' : '守り'}
                        </span>
                    )}
                    <button onClick={refresh} disabled={loading} className="p-1 text-white/20 hover:text-white/60 transition-colors">
                        <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[100, 80, 60].map(w => <div key={w} className="h-3 bg-white/5 rounded animate-pulse" style={{ width: `${w}%` }} />)}
                </div>
            ) : daily ? (
                <div className="space-y-3">
                    <p className="text-sm text-white/70 leading-relaxed">{daily.guidance}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-white/3 rounded-xl border border-white/5">
                            <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Timing</p>
                            <p className="text-xs text-white/60">{daily.timing}</p>
                        </div>
                        <div className="p-3 bg-white/3 rounded-xl border border-white/5">
                            <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Target className="w-2.5 h-2.5" /> Action
                            </p>
                            <p className="text-xs text-yellow-400/80 font-medium">{daily.action}</p>
                        </div>
                    </div>
                    <p className="text-center text-xs text-white/30 italic pt-1 border-t border-white/5">
                        &ldquo;{daily.affirmation}&rdquo;
                    </p>
                </div>
            ) : (
                <p className="text-sm text-white/30">鑑定後に表示されます。</p>
            )}
        </div>
    );
}

function CalendarWidget({ userId }: { userId: string }) {
    const router = useRouter();
    const [scores, setScores] = useState<{ date: string; score: number; phase: string }[]>([]);

    useEffect(() => {
        fetch(`/api/fortune-score?userId=${userId}&range=14`)
            .then(r => r.json()).then(setScores).catch(() => {});
    }, [userId]);

    const today = new Date().toISOString().split('T')[0];
    const days = scores.slice(0, 7);

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-7 gap-1">
                {['日','月','火','水','木','金','土'].map(d => (
                    <p key={d} className="text-center text-[9px] text-white/20">{d}</p>
                ))}
                {days.map(s => {
                    const isToday = s.date === today;
                    const day = parseInt(s.date.split('-')[2]);
                    const color = s.score >= 70 ? '#F4C060' : s.score >= 50 ? '#8B7FD4' : '#4FC3CF';
                    return (
                        <div key={s.date} className={cn('flex flex-col items-center gap-1 p-1 rounded-lg',
                            isToday && 'bg-white/8 ring-1 ring-white/20')}>
                            <span className={cn('text-[10px] font-bold', isToday ? 'text-yellow-400' : 'text-white/40')}>{day}</span>
                            <div className="w-5 h-5 rounded-full" style={{ background: `conic-gradient(${color} ${s.score}%, rgba(255,255,255,0.06) 0%)` }} />
                            <span className="text-[9px]" style={{ color }}>{s.score}</span>
                        </div>
                    );
                })}
            </div>
            <button onClick={() => router.push('/calendar')}
                className="w-full py-2 text-[10px] text-white/30 hover:text-white/70 uppercase tracking-widest border border-white/5 hover:border-white/15 rounded-lg transition-all">
                Full Calendar →
            </button>
        </div>
    );
}

const CHAT_EXAMPLES = [
    '今の仕事を続けるべきか迷っている',
    '次の決断のタイミングは？',
    '気になる人との相性を見てほしい',
];

function ChatWidget() {
    const router = useRouter();
    return (
        <div className="flex flex-col items-center gap-4 py-2">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-indigo-300" />
            </div>
            <div className="text-center">
                <p className="text-sm text-white/70 leading-relaxed">
                    今日どんなことを話しますか？<br />
                    <span className="text-white/30 text-xs">「鑑定して」で本格占いモードへ</span>
                </p>
            </div>
            <button onClick={() => router.push('/chat')}
                className="w-full py-3 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/25 text-white font-bold tracking-widest uppercase text-sm rounded-xl transition-all">
                <span className="flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" /> 相談する
                </span>
            </button>
            <div className="w-full space-y-1.5">
                {CHAT_EXAMPLES.map((ex, i) => (
                    <button key={i}
                        onClick={() => router.push(`/chat?prefill=${encodeURIComponent(ex)}`)}
                        className="w-full text-left text-[10px] text-white/25 hover:text-white/70 px-3 py-1.5 border border-white/5 hover:border-white/20 rounded-lg transition-all truncate">
                        &ldquo;{ex}&rdquo;
                    </button>
                ))}
            </div>
        </div>
    );
}

function TransferCodePanel({ userId }: { userId: string }) {
    const [code, setCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const generate = async () => {
        setLoading(true);
        const res = await fetch('/api/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        if (res.ok) {
            const data = await res.json();
            setCode(data.code);
        }
        setLoading(false);
    };

    const copyCode = () => {
        if (!code) return;
        copyToClipboard(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mt-4 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl">
            <p className="text-[9px] text-orange-400/70 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> 引き継ぎコード
            </p>
            {code ? (
                <div className="flex items-center gap-2">
                    <span className="flex-1 text-center font-mono text-lg font-bold tracking-[0.4em] text-orange-300 bg-orange-500/10 py-2 rounded-lg">
                        {code}
                    </span>
                    <button onClick={copyCode} className="p-2 text-orange-400/60 hover:text-orange-300 transition-colors">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            ) : (
                <button onClick={generate} disabled={loading}
                    className="w-full py-2 text-[11px] text-orange-400/70 hover:text-orange-300 border border-orange-500/20 hover:border-orange-500/40 rounded-lg transition-all disabled:opacity-50">
                    {loading ? '生成中...' : 'コードを発行する（7日間有効）'}
                </button>
            )}
            <p className="text-[9px] text-white/20 mt-2">友達がこのコードをアプリで入力すると、プロフィールを自分のものとして引き継げます</p>
        </div>
    );
}

function ShareRow({ diagnosisId, characterType, summary, userId, isPremium, onTicket }: {
    diagnosisId: string; characterType: string | null; summary?: string; userId: string; isPremium: boolean; onTicket?: (n: number) => void;
}) {
    const [copied, setCopied] = useState(false);
    const [reward, setReward] = useState('');
    const label = (characterType && CHARACTER_META[characterType as CharacterType]?.label) || 'パートナーオーブ';
    const url = typeof window !== 'undefined' ? `${window.location.origin}/s/${diagnosisId}` : `/s/${diagnosisId}`;
    const oneLiner = summary || `私のパートナーオーブは「${label}」`;
    const text = `“${oneLiner}”\n— Orbaが視た私 🔮 あなたも30秒で →`;

    const earn = async () => {
        if (isPremium) return;
        try {
            const r = await fetch('/api/tickets/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
            const d = await r.json();
            if (d.granted) { setReward('シェアありがとう！鑑定チケット +1 🎟'); onTicket?.(d.tickets); }
            else setReward('チケットは1日1回までです');
            setTimeout(() => setReward(''), 4000);
        } catch { /* noop */ }
    };

    const openX = () => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener'); earn(); };
    const openLine = () => { window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`, '_blank', 'noopener'); earn(); };
    const copy = () => { copyToClipboard(url); setCopied(true); setTimeout(() => setCopied(false), 2000); earn(); };

    return (
        <div className="mt-2">
            <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Share2 className="w-2.5 h-2.5" /> 結果をシェア{!isPremium && <span className="text-amber-300/70 normal-case tracking-normal">・1日1回シェアで鑑定チケット+1🎟</span>}</p>
            <div className="flex gap-2">
                <button onClick={openX} className="flex-1 py-2 text-[11px] font-bold rounded-lg bg-white/10 hover:bg-white/15 transition-colors">X</button>
                <button onClick={openLine} className="flex-1 py-2 text-[11px] font-bold rounded-lg text-[#06C755] bg-[#06C755]/12 hover:bg-[#06C755]/20 transition-colors">LINE</button>
                <button onClick={copy} className="flex-1 py-2 text-[11px] rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition-colors flex items-center justify-center gap-1">
                    {copied ? <><Check className="w-3 h-3 text-green-400" />コピー済</> : <><Copy className="w-3 h-3" />リンク</>}
                </button>
            </div>
            {reward && <p className="text-[11px] text-amber-300/90 mt-1.5 text-center">{reward}</p>}
        </div>
    );
}

function ProfileWidget({ userData }: { userData: UserData }) {
    const latestDiagnosis = userData.diagnoses[0];
    const result: AnalysisResult | null = latestDiagnosis ? JSON.parse(latestDiagnosis.data) : null;
    const charEmoji: Record<string, string> = {
        fairy: '🧚', shaman: '🌸', sage: '🦉', friend: '👯', cool: '🧊', burn: '🔥'
    };

    const isFriend = userData.profileType === 'friend';
    const daysLeft = userData.expiresAt
        ? Math.max(0, Math.ceil((new Date(userData.expiresAt).getTime() - Date.now()) / 86400000))
        : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex items-center justify-center text-2xl">
                    {userData.characterType ? charEmoji[userData.characterType] : <User className="w-5 h-5 text-white/30" />}
                </div>
                <div className="flex-1">
                    <p className="font-bold text-white">{userData.name || 'Anonymous'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        {userData.mbti && <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{userData.mbti}</span>}
                        {userData.enneagram && <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full">Type {userData.enneagram}</span>}
                        {userData.profileType && userData.profileType !== 'self' && (
                            <span className="text-[10px] text-indigo-400/70 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                                {userData.profileType === 'family' ? '家族' : '友達'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {isFriend && daysLeft !== null && (
                <div className={cn('flex items-center gap-2 p-2.5 rounded-lg text-xs',
                    daysLeft <= 7 ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-white/5 border border-white/10 text-white/40'
                )}>
                    <Clock className="w-3 h-3 flex-none" />
                    <span>{daysLeft > 0 ? `あと${daysLeft}日で削除されます` : '本日削除予定'}</span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-white/3 rounded-lg">
                    <p className="text-[9px] text-white/25 uppercase tracking-widest mb-0.5">Birth</p>
                    <p className="text-xs text-white/60 font-mono">{userData.birthDate || '—'}</p>
                </div>
                <div className="p-2 bg-white/3 rounded-lg">
                    <p className="text-[9px] text-white/25 uppercase tracking-widest mb-0.5">Place</p>
                    <p className="text-xs text-white/60 truncate">{userData.birthPlace || '—'}</p>
                </div>
            </div>

            {result && (
                <div className="p-3 bg-white/3 rounded-xl border border-white/5">
                    <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1.5">Latest Reading</p>
                    <p className="text-xs text-white/60 line-clamp-3 leading-relaxed">{result.coreNature}</p>
                    <p className="text-[10px] text-white/25 mt-1 font-mono">
                        {new Date(latestDiagnosis.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                </div>
            )}

            {/* 直感パート：色と数字 */}
            {result?.signature && (
                <div className="p-3 bg-white/3 rounded-xl border border-white/5">
                    <p className="text-[9px] text-white/25 uppercase tracking-widest mb-2">Your Colors & Numbers</p>
                    <div className="flex items-stretch gap-2 mb-3">
                        {result.signature.colors.map((c) => (
                            <div key={c.role} className="flex-1 min-w-0">
                                <div className="w-full h-10 rounded-md border border-white/15 shadow-inner mb-1" style={{ background: c.hex }} />
                                <p className="text-[9px] text-white/35 uppercase tracking-widest">{c.role}</p>
                                <p className="text-[10px] text-white/75 truncate" title={c.name}>{c.name}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-display text-2xl text-amber-300 leading-none">{result.signature.number.main}</span>
                        <span className="font-display text-base text-amber-300/60 leading-none">/ {result.signature.number.sub}</span>
                        <span className="text-[9px] text-white/30 uppercase tracking-widest ml-auto">Your Numbers</span>
                    </div>
                    <p className="text-[10px] text-white/45 leading-relaxed line-clamp-2">{result.signature.number.why}</p>
                    {result.signature.items?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/8 flex flex-wrap gap-1.5">
                            {result.signature.items.map((it, i) => (
                                <span key={i} className="text-[10px] text-white/55 bg-white/5 border border-white/8 rounded-full px-2 py-0.5">{it}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 羅針盤：3シーンの行動アドバイス */}
            {result?.compass && (
                <div className="p-3 bg-white/3 rounded-xl border border-white/5">
                    <p className="text-[9px] text-white/25 uppercase tracking-widest mb-2">Your Compass</p>
                    <div className="space-y-2">
                        {[result.compass.lost, result.compass.anxious, result.compass.stepping].map((c, i) => (
                            <details key={i} className="group">
                                <summary className="flex items-center gap-2 cursor-pointer list-none">
                                    <span className="text-amber-300/60 group-open:text-amber-300 text-[10px] font-display">▸</span>
                                    <span className="text-xs text-white/75 font-serif-jp">{c.title}</span>
                                    <span className="text-[10px] text-white/35 italic truncate flex-1">— {c.word}</span>
                                </summary>
                                <ul className="mt-1.5 ml-4 space-y-1">
                                    {c.steps.map((s, j) => (
                                        <li key={j} className="text-[11px] text-white/65 leading-relaxed flex gap-1.5">
                                            <span className="text-amber-300/50">·</span><span>{s}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-1.5 ml-4 text-[10px] text-amber-200/50 leading-relaxed">{c.anchor}</p>
                            </details>
                        ))}
                    </div>
                </div>
            )}

            {latestDiagnosis && <ShareRow diagnosisId={latestDiagnosis.id} characterType={userData.characterType} summary={result?.summary} userId={userData.id} isPremium={userData.isPremium} />}

            {isFriend && <TransferCodePanel userId={userData.id} />}
        </div>
    );
}

// ── Widget Shell ───────────────────────────────────────────────

const WIDGET_META: Record<WidgetId, { label: string; icon: React.ReactNode }> = {
    daily:    { label: '今日の運勢', icon: <Moon className="w-4 h-4" /> },
    calendar: { label: '運気カレンダー', icon: <CalendarDays className="w-4 h-4" /> },
    chat:     { label: 'チャット相談', icon: <MessageSquare className="w-4 h-4" /> },
    profile:  { label: 'マイプロフィール', icon: <User className="w-4 h-4" /> },
};

function WidgetShell({ id, editMode, children }: { id: WidgetId; editMode: boolean; children: React.ReactNode }) {
    return (
        <motion.div layout className={`glass service-widget service-widget--${id} p-5 relative overflow-hidden`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white/45">
                    {WIDGET_META[id].icon}
                    <span className="text-xs font-serif-jp tracking-wide">{WIDGET_META[id].label}</span>
                </div>
                {editMode && (
                    <div className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/60 transition-colors">
                        <GripVertical className="w-4 h-4" />
                    </div>
                )}
            </div>
            {children}
        </motion.div>
    );
}

// ── Delete Confirm Modal ───────────────────────────────────────

function DeleteModal({ profile, onConfirm, onCancel }: {
    profile: ProfileTab;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
        >
            <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm glass p-6 rounded-2xl"
            >
                <h3 className="text-base font-bold text-white mb-1">プロフィールを削除</h3>
                <p className="text-sm text-white/50 mb-6">
                    「{profile.name || 'このプロフィール'}」のすべてのデータが削除されます。この操作は取り消せません。
                </p>
                <div className="flex gap-3">
                    <button onClick={onCancel}
                        className="flex-1 py-3 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition-colors">
                        キャンセル
                    </button>
                    <button onClick={onConfirm}
                        className="flex-1 py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-sm text-red-400 hover:bg-red-500/30 transition-colors font-bold">
                        削除する
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Transfer Code Import Modal ─────────────────────────────────

// ── Main Page ───────────────────────────────────────────────────

export default function MyPage() {
    const router = useRouter();
    const { theme, toggle: toggleTheme } = useTheme();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [profiles, setProfiles] = useState<ProfileTab[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [order, setOrder] = useState<WidgetId[]>(DEFAULT_ORDER);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<ProfileTab | null>(null);
    const [isDevicePremium, setIsDevicePremium] = useState(false);
    // Generate code modal
    const [showGenCode, setShowGenCode] = useState(false);
    const [genCode, setGenCode] = useState<string | null>(null);
    const [genCodeLoading, setGenCodeLoading] = useState(false);
    const [genCodeCopied, setGenCodeCopied] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [tickets, setTickets] = useState(0);
    const [bonusMsg, setBonusMsg] = useState('');
    const [showFounding, setShowFounding] = useState(false);
    const [showAccount, setShowAccount] = useState(false);
    const [orbSaving, setOrbSaving] = useState(false);

    // KOMOJU決済から戻ってきた結果を表示し、URLを綺麗にする。
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const billing = new URLSearchParams(window.location.search).get('billing');
        if (billing === 'success') {
            setShowWelcome(true); // 閉じるまで表示（自動消去しない）
            window.history.replaceState({}, '', '/mypage');
        } else if (billing === 'error' || billing === 'invalid') {
            alert('決済の確認に失敗しました。課金状況を確認のうえ、サポートへお問い合わせください。');
            window.history.replaceState({}, '', '/mypage');
        }
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.removeItem('guf_user_id');
        localStorage.removeItem('guf_profiles');
        localStorage.removeItem('guf_premium');
        router.push('/');
    };

    // 相棒のオーブ（キャラ口調）をあとから変更する
    const changeOrb = async (t: CharacterType) => {
        if (!userData || userData.characterType === t || orbSaving) return;
        setOrbSaving(true);
        try {
            await fetch('/api/user', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userData.id, characterType: t }),
            });
            setUserData({ ...userData, characterType: t });
        } finally {
            setOrbSaving(false);
        }
    };

    const loadProfile = useCallback(async (id: string) => {
        const res = await fetch(`/api/user?id=${id}`);
        if (!res.ok) return null;
        return await res.json() as UserData;
    }, []);

    useEffect(() => {
        const init = async () => {
            const id = localStorage.getItem('guf_user_id');
            if (!id) { router.push('/start'); return; }

            const data = await loadProfile(id);
            if (!data) { router.push('/start'); return; }

            // Check/enforce friend expiry
            if (data.profileType === 'friend' && data.expiresAt && new Date(data.expiresAt) < new Date()) {
                await fetch(`/api/user?id=${id}`, { method: 'DELETE' });
                // Remove from profiles
                const stored = JSON.parse(localStorage.getItem('guf_profiles') || '[]') as ProfileTab[];
                const updated = stored.filter(p => p.id !== id);
                localStorage.setItem('guf_profiles', JSON.stringify(updated));
                if (updated.length > 0) {
                    localStorage.setItem('guf_user_id', updated[0].id);
                    window.location.reload();
                } else {
                    localStorage.removeItem('guf_user_id');
                    router.push('/start');
                }
                return;
            }

            setUserData(data);
            setActiveId(id);
            setTickets(data.tickets ?? 0);
            track('app_open');
            if (!data.isPremium) track('paywall_view'); // 無料ユーザーは下部アップグレードバーを必ず見る
            // ログインボーナス（1日1回 +1チケット）
            fetch('/api/tickets/login-bonus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id }) })
                .then(r => r.json())
                .then(d => { if (d.granted) { setTickets(d.tickets); setBonusMsg('ログインボーナス：鑑定チケット +1 🎟'); setTimeout(() => setBonusMsg(''), 6000); } })
                .catch(() => {});
            if (data.widgetOrder) {
                try { setOrder(JSON.parse(data.widgetOrder)); } catch {}
            }

            // Sync profiles from localStorage
            const stored = JSON.parse(localStorage.getItem('guf_profiles') || '[]') as ProfileTab[];
            if (stored.length === 0 || !stored.find(p => p.id === id)) {
                // Bootstrap: just this profile
                const self: ProfileTab = { id: data.id, name: data.name, profileType: (data.profileType as ProfileTab['profileType']) || 'self', expiresAt: data.expiresAt };
                const merged = stored.filter(p => p.id !== id);
                merged.unshift(self);
                localStorage.setItem('guf_profiles', JSON.stringify(merged));
                setProfiles(merged);
            } else {
                setProfiles(stored);
            }

            // 会員状態はサーバー（DB）の isPremium のみを信頼する
            setIsDevicePremium(data.isPremium);

            setLoading(false);
        };
        init();
    }, [router, loadProfile]);

    const switchProfile = async (id: string) => {
        if (id === activeId) return;
        setLoading(true);
        const data = await loadProfile(id);
        if (!data) return;
        localStorage.setItem('guf_user_id', id);
        setActiveId(id);
        setUserData(data);
        if (data.widgetOrder) {
            try { setOrder(JSON.parse(data.widgetOrder)); } catch { setOrder(DEFAULT_ORDER); }
        } else {
            setOrder(DEFAULT_ORDER);
        }
        setLoading(false);
    };

    const saveOrder = useCallback(async (newOrder: WidgetId[]) => {
        if (!userData) return;
        setOrder(newOrder);
        await fetch('/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userData.id, widgetOrder: JSON.stringify(newOrder) })
        });
    }, [userData]);

    const handleDeleteProfile = async () => {
        if (!deleteTarget) return;
        await fetch(`/api/user?id=${deleteTarget.id}`, { method: 'DELETE' });
        const updated = profiles.filter(p => p.id !== deleteTarget.id);
        localStorage.setItem('guf_profiles', JSON.stringify(updated));
        setDeleteTarget(null);
        if (deleteTarget.id === activeId) {
            if (updated.length > 0) {
                localStorage.setItem('guf_user_id', updated[0].id);
                window.location.reload();
            } else {
                localStorage.removeItem('guf_user_id');
                router.push('/start');
            }
        } else {
            setProfiles(updated);
        }
    };

    const handleGenerateCode = async () => {
        if (!userData) return;
        setGenCodeLoading(true);
        const res = await fetch('/api/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userData.id }),
        });
        if (res.ok) {
            const data = await res.json();
            setGenCode(data.code);
        }
        setGenCodeLoading(false);
    };

    const copyGenCode = () => {
        if (!genCode) return;
        copyToClipboard(genCode);
        setGenCodeCopied(true);
        setTimeout(() => setGenCodeCopied(false), 2000);
    };

    if (loading) return (
        <div className="min-h-screen bg-mesh flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-yellow-400/40 animate-spin" />
        </div>
    );
    if (!userData) return null;

    const renderWidget = (id: WidgetId) => {
        switch (id) {
            case 'daily':
                return <DailyWidget userId={userData.id} />;
            case 'calendar':
                return userData.birthDate
                    ? <CalendarWidget userId={userData.id} />
                    : <p className="text-sm text-white/30">鑑定後に表示されます。</p>;
            case 'chat':
                return <ChatWidget />;
            case 'profile':
                return <div id="profile"><ProfileWidget userData={userData} /></div>;
        }
    };

    return (
        <div className="orba-service-page hig-shell orba-service-home text-white flex flex-col relative">
            <OrbaAppNav />
            <OrbField count={14} />

            {/* ── 上部タブバー ───────────────────────────── */}
            <header className="orba-profile-switcher flex-none border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-[60px] md:top-[68px] z-30">
              <div className="px-3 pt-4 pb-3 flex items-center justify-between max-w-2xl mx-auto w-full">
                <button onClick={() => setShowAccount(true)} title="アカウント・設定"
                    className="flex-none mr-2 rounded-full transition-transform hover:scale-105 active:scale-95">
                    <CharacterAvatar type={(userData.characterType as CharacterType) in CHARACTER_META ? (userData.characterType as CharacterType) : 'sage'} size={36} />
                </button>
                <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-none">
                    <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 min-w-0">
                        {profiles.map(p => (
                            <button
                                key={p.id}
                                onClick={() => editMode && profiles.length > 1
                                    ? setDeleteTarget(p)
                                    : switchProfile(p.id)
                                }
                                className={cn(
                                    'relative flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap',
                                    p.id === activeId ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
                                )}
                            >
                                {p.name?.split('')[0] || 'Me'}
                                {p.profileType !== 'self' && (
                                    <span className="text-[8px] opacity-60">{p.profileType === 'family' ? '家族' : '友'}</span>
                                )}
                                {editMode && profiles.length > 1 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                        <X className="w-2.5 h-2.5 text-white" />
                                    </span>
                                )}
                            </button>
                        ))}
                        {/* + 新規プロファイル */}
                        <button
                            onClick={() => router.push('/start?newProfile=1')}
                            className="flex items-center gap-0.5 px-2 py-1 rounded-full text-white/25 hover:text-white/60 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    {isDevicePremium && (
                        <span className="flex items-center gap-1 text-[9px] text-yellow-400/70 font-bold uppercase tracking-widest flex-none">
                            <Crown className="w-3 h-3" /> Premium
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-none ml-2">
                    {/* テーマ切替 */}
                    <button
                        onClick={toggleTheme}
                        className="p-1.5 text-white/20 hover:text-white/60 transition-colors"
                        title={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
                    >
                        {theme === 'dark'
                            ? <Sun className="w-3.5 h-3.5" />
                            : <Moon className="w-3.5 h-3.5" />
                        }
                    </button>
                    {/* 引き継ぎコードを発行 */}
                    <button
                        onClick={() => { setShowGenCode(true); setGenCode(null); setGenCodeCopied(false); }}
                        className="p-1.5 text-white/20 hover:text-white/60 transition-colors"
                        title="引き継ぎコードを発行"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                    </button>
                    {/* アカウント（本登録 / ログアウト） */}
                    {userData.email ? (
                        <button onClick={handleLogout} title={`${userData.email}\nログアウト`}
                            className="p-1.5 text-white/20 hover:text-white/60 transition-colors">
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <button onClick={() => setShowAuth(true)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold text-amber-200/90 border border-amber-300/30 bg-amber-400/10 hover:bg-amber-400/20 transition-all whitespace-nowrap">
                            <UserPlus className="w-3 h-3" /> 本登録
                        </button>
                    )}
                    <button onClick={() => setEditMode(e => !e)}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all',
                            editMode ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30' : 'text-white/30 hover:text-white/60'
                        )}>
                        <Settings className="w-3 h-3" />
                        {editMode ? '完了' : 'カスタマイズ'}
                    </button>
                </div>
              </div>
            </header>

            {/* ── ウィジェットエリア ─────────────────────── */}
            <main className="orba-home-main flex-1 px-4 py-6 overflow-y-auto pb-28 relative z-10 w-full max-w-2xl mx-auto">
                <section className="orba-home-heading">
                    <h1>おかえりなさい。</h1>
                    <p>今日の流れと、いま役立つ言葉を置いています。</p>
                </section>
                <AnimatePresence>
                    {bonusMsg && (
                        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                            className="mb-4 card p-3 flex items-center gap-2 border border-amber-300/30 text-sm font-serif-jp text-amber-100">
                            🎟 {bonusMsg}
                        </motion.div>
                    )}
                    {showWelcome && (
                        <motion.div
                            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                            className="mb-4 card p-4 flex items-center gap-3 border border-amber-300/30"
                        >
                            <Crown className="w-5 h-5 text-amber-300 flex-none" />
                            <div className="flex-1">
                                <p className="text-sm font-serif-jp text-white">プレミアムへようこそ ✨</p>
                                <p className="text-[11px] text-white/50">ご登録ありがとうございます。すべての機能をお使いいただけます。</p>
                            </div>
                            <button onClick={() => setShowWelcome(false)} className="text-white/30 hover:text-white/70"><X className="w-4 h-4" /></button>
                        </motion.div>
                    )}
                </AnimatePresence>
                {!editMode && <div className="mb-3"><NotificationToggle userId={userData.id} /></div>}
                {editMode && (
                    <div className="mb-3 px-1 flex items-center justify-between">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">ウィジェットを並び替え・プロフィールタブを削除</p>
                        {profiles.length > 1 && (
                            <p className="text-[10px] text-red-400/60 flex items-center gap-1">
                                <X className="w-2.5 h-2.5" /> タブをタップで削除
                            </p>
                        )}
                    </div>
                )}

                <Reorder.Group axis="y" values={order} onReorder={editMode ? saveOrder : () => {}}
                    className="orba-widget-stack space-y-3">
                    {order.map(id => (
                        <Reorder.Item key={id} value={id} dragListener={editMode}
                            className={cn('outline-none', editMode && 'cursor-grab active:cursor-grabbing')}>
                            <WidgetShell id={id} editMode={editMode}>
                                {renderWidget(id)}
                            </WidgetShell>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            </main>

            {/* ── 下部サブスクバー ───────────────────────── */}
            <div className="orba-membership-bar fixed bottom-0 left-0 right-0 z-30 bg-black/60 backdrop-blur-xl border-t border-white/5 px-4 py-3 [&>*]:max-w-2xl [&>*]:mx-auto">
                {isDevicePremium ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-bold text-white">Premium</span>
                            <span className="text-xs text-white/30">すべての機能が使えます</span>
                        </div>
                        <button
                            onClick={async () => {
                                if (!confirm('Orba Plusを解約しますか？ 支払済み期間の終了までは引き続き利用できます。')) return;
                                const res = await fetch('/api/billing/portal', { method: 'POST' });
                                const data = await res.json().catch(() => ({}));
                                if (res.ok && data.canceled) {
                                    const until = data.effectiveUntil ? new Date(data.effectiveUntil).toLocaleDateString('ja-JP') : '現在の利用期間末';
                                    alert(`解約を受け付けました。${until}までご利用いただけます。`);
                                } else alert(data.error || '解約処理に失敗しました');
                            }}
                            className="text-[10px] text-white/30 hover:text-white/70 transition-colors uppercase tracking-widest">
                            管理・解約
                        </button>
                    </div>
                ) : isLaunchFreeActive() ? (
                    <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                🎁 ローンチ記念・全機能を無料開放中
                            </p>
                            <p className="text-[10px] text-white/40">
                                {launchFreeUntilLabel() ? `${launchFreeUntilLabel()}まで無料。` : ''}正式版は{PREMIUM_PRICE_LABEL}予定
                            </p>
                        </div>
                        <button
                            onClick={() => { track('paywall_click'); setShowFounding(true); }}
                            className="flex-none px-3 py-2 bg-white/10 text-white/80 text-xs font-bold rounded-full whitespace-nowrap hover:bg-white/15 transition-all"
                        >
                            詳しく
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <p className="text-xs font-bold text-white flex items-center gap-2">
                                プレミアムにアップグレード
                                <span className="text-[10px] font-normal text-amber-300/90">🎟 鑑定チケット ×{tickets}</span>
                            </p>
                            <p className="text-[10px] text-white/40">高品質チャット1日20回・運気カレンダー60日分</p>
                        </div>
                        <button
                            onClick={() => { track('paywall_click'); setShowFounding(true); }}
                            className="flex-none px-4 py-2 bg-gradient-to-r from-amber-300 to-amber-400 text-black text-xs font-bold rounded-full whitespace-nowrap hover:brightness-105 transition-all"
                        >
                            {isBillingEnabled() ? 'Orba Plusを始める' : '先行登録'}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Modals ────────────────────────────────── */}
            <AnimatePresence>
                {showFounding && (
                    <FoundingMemberModal userEmail={userData.email} onClose={() => setShowFounding(false)} />
                )}
                {showAccount && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowAccount(false)}
                    >
                        <motion.div
                            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-sm glass p-6 rounded-2xl"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-white">アカウント・設定</h3>
                                <button onClick={() => setShowAccount(false)} className="text-white/30 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                            </div>

                            {/* アカウント情報 */}
                            <div className="mb-5">
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">アカウント</p>
                                {userData.email ? (
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm text-white truncate">{userData.email}</p>
                                            <p className="text-[10px] text-white/35">ログイン中{isDevicePremium ? '・Premium' : ''}</p>
                                        </div>
                                        <button onClick={handleLogout}
                                            className="flex-none flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] text-white/50 hover:text-white/80 border border-white/10 hover:border-white/25 transition-all">
                                            <LogOut className="w-3 h-3" /> ログアウト
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm text-white/50">未登録（この端末のみ）</p>
                                        <button onClick={() => { setShowAccount(false); setShowAuth(true); }}
                                            className="flex-none flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold text-amber-200/90 border border-amber-300/30 bg-amber-400/10 hover:bg-amber-400/20 transition-all">
                                            <UserPlus className="w-3 h-3" /> 本登録
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 相棒のオーブを変える */}
                            <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">相棒のオーブ（話し方）を変える</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.keys(CHARACTER_META) as CharacterType[]).map(t => {
                                        const active = userData.characterType === t;
                                        return (
                                            <button key={t} onClick={() => changeOrb(t)} disabled={orbSaving}
                                                className={cn('flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all disabled:opacity-50',
                                                    active ? 'border-amber-300/50 bg-amber-400/10' : 'border-white/8 hover:border-white/20')}>
                                                <CharacterAvatar type={t} size={40} />
                                                <span className={cn('text-[11px]', active ? 'text-amber-200' : 'text-white/60')}>
                                                    {CHARACTER_META[t].label.replace('オーブ', '')}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="mt-2 text-[10px] text-white/30">変えても鑑定結果（占いの中身）は同じ。話し方（口調）だけ変わります。</p>
                            </div>

                            {!userData.isPremium && isLaunchFreeActive() && (
                                <div className="mt-5 pt-5 border-t border-white/8">
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">正式版のお知らせ</p>
                                    <button
                                        onClick={() => { setShowAccount(false); track('paywall_view', { source: 'settings' }); setShowFounding(true); }}
                                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-amber-300/20 bg-amber-400/[0.06] hover:bg-amber-400/10 transition-all text-left">
                                        <span className="min-w-0">
                                            <span className="block text-[12px] text-white">正式版（{PREMIUM_PRICE_LABEL}予定）の開始をお知らせ</span>
                                            <span className="block text-[10px] text-white/40">{launchFreeUntilLabel() ? `${launchFreeUntilLabel()}まで無料開放中` : '無料開放中'}</span>
                                        </span>
                                        <span className="flex-none text-amber-200/80 text-[11px] font-bold">受け取る ›</span>
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
                {showAuth && (
                    <AuthModal initialMode="register" userId={userData.id}
                        onClose={() => setShowAuth(false)}
                        onSuccess={() => { setShowAuth(false); window.location.reload(); }} />
                )}
                {deleteTarget && (
                    <DeleteModal
                        profile={deleteTarget}
                        onConfirm={handleDeleteProfile}
                        onCancel={() => setDeleteTarget(null)}
                    />
                )}
                {showGenCode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowGenCode(false)}
                    >
                        <motion.div
                            initial={{ y: 60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 60, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-sm glass p-6 rounded-2xl"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-bold text-white">引き継ぎコードを発行</h3>
                                <button onClick={() => setShowGenCode(false)} className="text-white/30 hover:text-white transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-xs text-white/40 mb-4">
                                「{userData?.name || 'このプロフィール'}」のコードを発行します。<br />
                                友達がアプリの最初の画面でコードを入力すると、プロフィールを自分のものとして引き継げます。（7日間有効）
                            </p>
                            {genCode ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="flex-1 text-center font-mono text-2xl font-bold tracking-[0.5em] text-indigo-300 bg-indigo-500/10 py-3 rounded-xl">
                                            {genCode}
                                        </span>
                                        <button onClick={copyGenCode} className="p-2.5 text-indigo-400/60 hover:text-indigo-300 transition-colors border border-indigo-500/20 rounded-lg">
                                            {genCodeCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-white/20 text-center">このコードを友達に共有してください</p>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGenerateCode}
                                    disabled={genCodeLoading}
                                    className="w-full py-3 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-sm text-indigo-300 hover:bg-indigo-500/30 transition-colors font-bold disabled:opacity-40"
                                >
                                    {genCodeLoading ? '生成中...' : 'コードを発行する'}
                                </button>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

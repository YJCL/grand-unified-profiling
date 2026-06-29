'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ChevronLeft, PenSquare, Sparkles } from 'lucide-react';
import { IchingSheet } from '@/app/components/IchingSheet';
import { cn } from '@/lib/utils';
import { CharacterAvatar, CHARACTER_META, type CharacterType } from '@/app/components/CharacterAvatar';
import { OrbField } from '@/app/components/OrbField';
import { FoundingMemberModal } from '@/app/components/FoundingMemberModal';
import { track } from '@/lib/analytics';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

function ChatPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState(searchParams.get('prefill') || '');
    const [isLoading, setIsLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [char, setChar] = useState<CharacterType>('sage');
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [showFounding, setShowFounding] = useState(false);
    const [showIching, setShowIching] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

    useEffect(() => {
        const init = async () => {
            const id = localStorage.getItem('guf_user_id');
            if (!id) { router.push('/'); return; }
            setUserId(id);
            try {
                const res = await fetch(`/api/user?id=${id}`);
                let name = 'あなた';
                if (res.ok) {
                    const data = await res.json();
                    if (data.characterType && CHARACTER_META[data.characterType as CharacterType]) setChar(data.characterType);
                    name = data.name ? `${data.name}` : 'あなた';
                    setUserEmail(data.email ?? null);
                }
                // 過去の会話履歴を読み込んで表示
                const hist = await fetch(`/api/chat?userId=${id}`).then(r => r.ok ? r.json() : { messages: [] }).catch(() => ({ messages: [] }));
                const past: Message[] = (hist.messages || [])
                    .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
                    .map((m: { role: string; content: string }, i: number) => ({ id: `h${i}`, role: m.role as 'user' | 'assistant', content: m.content }));

                if (past.length > 0) {
                    setMessages([
                        { id: 'welcome', role: 'assistant', content: `${name}、おかえり。前回の続きから話せるよ。` },
                        ...past,
                    ]);
                } else {
                    setMessages([{ id: 'welcome', role: 'assistant',
                        content: `${name}、はじめまして。\n今日はどんなことを話す？日々の悩みでも、大きな決断でも、なんでも聞かせて。「鑑定して」と言えば、本格的に視るよ。` }]);
                }
            } catch (e) { console.error(e); }
        };
        init();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !userId || isLoading) return;
        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages((p) => [...p, userMsg]);
        setInput('');
        setIsLoading(true);
        try {
            const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, message: userMsg.content }) });
            const data = await res.json().catch(() => ({}));
            setMessages((p) => [...p, { id: Date.now() + 'ai', role: 'assistant', content: res.ok ? data.response : (data.message || 'ごめん、うまく繋がらなかった…もう一度試してみて。') }]);
            // 無料相談の上限に当たった瞬間＝最良のアップセル機会。先行登録へ誘導する。
            if (!res.ok && data.limitReached) {
                track('paywall_view', { source: 'chat_limit' });
                setTimeout(() => setShowFounding(true), 500);
            }
        } catch { setMessages((p) => [...p, { id: Date.now() + 'ai', role: 'assistant', content: 'ごめん、エラーが起きたみたい。' }]); }
        finally { setIsLoading(false); }
    };

    if (!userId) return null;

    return (
        <main className="flex flex-col h-dvh w-full bg-mesh text-white relative" style={{ minHeight: '100dvh' }}>
            <OrbField count={16} />

            {/* Header */}
            <header className="flex-none px-4 py-3 flex items-center gap-3 relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
                <button onClick={() => router.push('/mypage')} className="text-white/40 hover:text-white transition-colors p-1">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <CharacterAvatar type={char} size={40} speaking={isLoading} />
                <div className="flex-1">
                    <p className="text-sm font-serif-jp text-white/90">{CHARACTER_META[char].label}</p>
                    <p className="text-[10px] text-white/35">あなたのパートナー</p>
                </div>
                <button
                    onClick={async () => {
                        if (!userId || isLoading) return;
                        if (!window.confirm('これまでの会話履歴を消して、新しい会話を始めますか？')) return;
                        await fetch(`/api/chat?userId=${userId}`, { method: 'DELETE' });
                        setMessages([{ id: 'welcome', role: 'assistant', content: 'うん、新しく始めよう。今日はどんなことを話す？' }]);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] text-white/40 hover:text-white/80 border border-white/10 hover:border-white/25 transition-all whitespace-nowrap"
                    title="新しい会話を始める"
                >
                    <PenSquare className="w-3 h-3" /> 新しい会話
                </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4 space-y-5 relative z-10">
                {messages.map((msg) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className={cn('flex gap-3 max-w-2xl mx-auto', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                        {msg.role === 'assistant' && <div className="flex-none pt-1"><CharacterAvatar type={char} size={36} /></div>}
                        <div className={cn('rounded-2xl px-4 py-3 leading-relaxed text-[15px] font-serif-jp max-w-[82%]',
                            msg.role === 'user' ? 'bg-white/10 text-white/90 rounded-tr-sm' : 'card text-white/85 rounded-tl-sm')}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </motion.div>
                ))}
                {isLoading && (
                    <div className="flex gap-3 max-w-2xl mx-auto">
                        <div className="flex-none pt-1"><CharacterAvatar type={char} size={36} speaking /></div>
                        <div className="card rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                            {[0, 1, 2].map((i) => <motion.span key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }} className="w-1.5 h-1.5 rounded-full bg-amber-200/70" />)}
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {/* Input + 易を立てる導線 */}
            <div className="flex-none p-4 relative z-10 bg-gradient-to-t from-[#0a0820] to-transparent">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-2 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowIching(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-amber-200/90 border border-amber-300/30 bg-amber-400/[0.08] hover:bg-amber-400/15 transition-all whitespace-nowrap"
                            title="易を立てる（具体的な問いに対して卦を立てる）"
                        >
                            <Sparkles className="w-3 h-3" /> 易を立てる
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="relative">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="メッセージを送る…" disabled={isLoading}
                            className="w-full bg-white/6 border border-white/12 rounded-full py-3.5 pl-5 pr-14 text-white placeholder:text-white/25 focus:outline-none focus:border-amber-200/40 transition-colors" />
                        <button type="submit" disabled={!input.trim() || isLoading}
                            className="absolute right-2 top-1.5 w-9 h-9 btn-gold rounded-full flex items-center justify-center disabled:opacity-40">
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>

            <AnimatePresence>
                {showFounding && <FoundingMemberModal userEmail={userEmail} onClose={() => setShowFounding(false)} />}
                {showIching && userId && (
                    <IchingSheet
                        userId={userId}
                        initialQuestion={input.trim()}
                        onClose={() => setShowIching(false)}
                    />
                )}
            </AnimatePresence>
        </main>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-mesh flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-dashed border-amber-300/40 animate-spin" /></div>}>
            <ChatPageInner />
        </Suspense>
    );
}

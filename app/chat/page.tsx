'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Send, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CharacterAvatar, CHARACTER_META, type CharacterType } from '@/app/components/CharacterAvatar';
import { OrbField } from '@/app/components/OrbField';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

function ChatPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState(searchParams.get('prefill') || '');
    const [isLoading, setIsLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [char, setChar] = useState<CharacterType>('sage');
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

    useEffect(() => {
        const init = async () => {
            const id = localStorage.getItem('guf_user_id');
            if (!id) { router.push('/'); return; }
            setUserId(id);
            try {
                const res = await fetch(`/api/user?id=${id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.characterType && CHARACTER_META[data.characterType as CharacterType]) setChar(data.characterType);
                    const name = data.name ? `${data.name}` : 'あなた';
                    setMessages([{ id: 'welcome', role: 'assistant',
                        content: `${name}、おかえり。\n今日はどんなことを話す？日々の悩みでも、大きな決断でも、なんでも聞かせて。「鑑定して」と言えば、本格的に視るよ。` }]);
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
                <div>
                    <p className="text-sm font-serif-jp text-white/90">{CHARACTER_META[char].label}</p>
                    <p className="text-[10px] text-white/35">あなたのパートナー</p>
                </div>
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

            {/* Input */}
            <div className="flex-none p-4 relative z-10 bg-gradient-to-t from-[#0a0820] to-transparent">
                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="メッセージを送る…" disabled={isLoading}
                        className="w-full bg-white/6 border border-white/12 rounded-full py-3.5 pl-5 pr-14 text-white placeholder:text-white/25 focus:outline-none focus:border-amber-200/40 transition-colors" />
                    <button type="submit" disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-1.5 w-9 h-9 btn-gold rounded-full flex items-center justify-center disabled:opacity-40">
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
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

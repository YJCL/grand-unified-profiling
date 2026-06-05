'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, User, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
};

function ChatPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState(searchParams.get('prefill') || '');
    const [isLoading, setIsLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const checkAuth = async () => {
            const id = localStorage.getItem('guf_user_id');
            if (!id) {
                router.push('/');
                return;
            }
            setUserId(id);

            try {
                const res = await fetch(`/api/user?id=${id}`);
                if (res.ok) {
                    const data = await res.json();
                    const name = data.name ? `${data.name}さん` : 'あなた';
                    setMessages([
                        {
                            id: 'welcome',
                            role: 'assistant',
                            content: `${name}、こんにちは。\n\n今日はどんなことを話しましょうか？日常の悩みでも、大きな決断でも、何でも聞かせてください。「鑑定して」と言えば、本格的な占い分析もできます。`,
                            createdAt: new Date().toISOString()
                        }
                    ]);
                }
            } catch (e) {
                console.error(e);
            }
        };
        checkAuth();
    }, [router]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !userId || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, message: userMsg.content })
            });

            if (res.ok) {
                const data = await res.json();
                const aiMsg: Message = {
                    id: Date.now().toString() + 'ai',
                    role: 'assistant',
                    content: data.response,
                    createdAt: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiMsg]);
            } else {
                const errData = await res.json().catch(() => ({}));
                const aiMsg: Message = {
                    id: Date.now().toString() + 'ai',
                    role: 'assistant',
                    content: errData.message || '申し訳ありません、エラーが発生しました。',
                    createdAt: new Date().toISOString()
                };
                setMessages(prev => [...prev, aiMsg]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    if (!userId) return null; // Or loading spinner

    return (
        <main className="flex flex-col h-dvh w-full bg-mesh text-white relative" style={{ minHeight: '100dvh' }}>
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-900/10 blur-[150px] animate-pulse-soft" />
                <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-cyan-900/10 blur-[150px] animate-pulse-soft" />
            </div>

            {/* Header */}
            <header className="flex-none p-4 md:p-6 flex items-center justify-between glass border-b border-white/5 relative z-10">
                <button onClick={() => router.push('/mypage')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors uppercase text-xs tracking-widest font-bold">
                    <ChevronLeft className="w-4 h-4" /> Dashboard
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                    <span className="text-sm font-bold tracking-[0.2em] uppercase text-purple-200">Deep Dive Protocol</span>
                </div>
                <div className="w-8" />
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4 md:px-8 md:pt-8 space-y-8 relative z-10">
                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "flex gap-4 max-w-3xl mx-auto",
                            msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                        )}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-full flex-none flex items-center justify-center border",
                            msg.role === 'user' ? "bg-white/10 border-white/20" : "bg-purple-900/20 border-purple-500/30"
                        )}>
                            {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-purple-400" />}
                        </div>

                        <div className={cn(
                            "rounded-2xl p-6 glass leading-relaxed",
                            msg.role === 'user' ? "bg-white/5 border-white/10 rounded-tr-sm" : "bg-purple-900/10 border-purple-500/20 rounded-tl-sm"
                        )}>
                            <p className="whitespace-pre-wrap text-slate-200">{msg.content}</p>
                        </div>
                    </motion.div>
                ))}

                {isLoading && (
                    <div className="flex gap-4 max-w-3xl mx-auto">
                        <div className="w-10 h-10 rounded-full flex-none flex items-center justify-center border bg-purple-900/20 border-purple-500/30">
                            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                        </div>
                        <div className="rounded-2xl p-6 glass bg-purple-900/10 border-purple-500/20 rounded-tl-sm flex gap-1 items-center h-12">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex-none p-4 md:p-8 glass border-t border-white/5 relative z-10">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative group">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Enter query for deeper analysis..."
                        className="w-full bg-black/50 border border-white/10 rounded-full py-4 pl-6 pr-16 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-2 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 transition-all pointer-events-auto"
                    >
                        <Send className="w-4 h-4 text-white" />
                    </button>
                    <div className="absolute inset-0 -z-10 bg-purple-500/5 rounded-full blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </form>
            </div>
        </main>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-mesh flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-dashed border-purple-400/40 animate-spin" /></div>}>
            <ChatPageInner />
        </Suspense>
    );
}

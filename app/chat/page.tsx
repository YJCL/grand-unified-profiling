'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ChevronLeft, PenSquare, Sparkles } from 'lucide-react';
import { IchingSheet } from '@/app/components/IchingSheet';
import { cn } from '@/lib/utils';
import { CharacterAvatar, CHARACTER_META, type CharacterType } from '@/app/components/CharacterAvatar';
import { OrbField } from '@/app/components/OrbField';
import { FoundingMemberModal } from '@/app/components/FoundingMemberModal';
import { OrbaAppNav } from '@/app/components/OrbaAppNav';
import { track } from '@/lib/analytics';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

const CONVERSATION_STARTERS = [
    'いまの気持ちを整理したい',
    '決めかねていることがある',
    '今日の流れを一緒に見たい',
];

function ChatPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState(searchParams.get('prefill') || '');
    const [isInitializing, setIsInitializing] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [char, setChar] = useState<CharacterType>('sage');
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [showFounding, setShowFounding] = useState(false);
    const [showIching, setShowIching] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messages.length > 1 || isLoading) endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        const init = async () => {
            const id = localStorage.getItem('guf_user_id');
            if (!id) { router.push('/start'); return; }
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
            finally { setIsInitializing(false); }
        };
        init();
    }, [router]);

    const sendMessage = async (content: string) => {
        const clean = content.trim();
        if (!clean || !userId || isLoading) return;
        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: clean };
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void sendMessage(input);
    };

    if (!userId) return null;

    const isWelcome = !isInitializing && messages.length === 1 && messages[0]?.id === 'welcome';

    return (
        <div className="orba-service-page hig-shell service-chat-shell">
        <OrbaAppNav />
        <main className="orba-chat-main orba-dialogue flex flex-col w-full relative">
            <OrbField count={12} className="orba-dialogue__field" />

            <header className="orba-dialogue__header">
                <button onClick={() => router.push('/mypage')} className="orba-dialogue__back" aria-label="今日の画面へ戻る">
                    <ChevronLeft aria-hidden="true" />
                </button>
                <div className="orba-dialogue__identity">
                    <CharacterAvatar type={char} size={52} speaking={isLoading} />
                    <div>
                        <p>{CHARACTER_META[char].label}</p>
                        <span>{isLoading ? '言葉を整えています' : 'あなたのパートナー'}</span>
                    </div>
                </div>
                <p className="orba-dialogue__privacy"><i />この対話は、あなたの輪郭として静かに残ります。</p>
                <button
                    onClick={async () => {
                        if (!userId || isLoading) return;
                        if (!window.confirm('これまでの会話履歴を消して、新しい会話を始めますか？')) return;
                        await fetch(`/api/chat?userId=${userId}`, { method: 'DELETE' });
                        setMessages([{ id: 'welcome', role: 'assistant', content: 'うん、新しく始めよう。今日はどんなことを話す？' }]);
                    }}
                    className="orba-dialogue__new"
                    title="新しい会話を始める"
                >
                    <PenSquare aria-hidden="true" /> <span>会話を新しく</span>
                </button>
            </header>

            <div className="orba-dialogue__scroll flex-1 overflow-y-auto relative z-10">
                {isInitializing ? (
                    <div className="orba-dialogue__initializing" role="status">
                        <CharacterAvatar type={char} size={92} speaking />
                        <p>前の言葉を、静かにひらいています。</p>
                    </div>
                ) : isWelcome ? (
                    <motion.section
                        className="orba-dialogue-welcome"
                        initial={{ opacity: 0, filter: 'blur(8px)', y: 12 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                        transition={{ duration: 0.65, ease: [0.23, 1, 0.32, 1] }}
                    >
                        <CharacterAvatar type={char} size={148} />
                        <h1>今日は、どんな輪郭を<br />見つけたい？</h1>
                        <p>まとまった質問でなくて大丈夫。いま心に残っていることから、聞かせてください。</p>
                        <div className="orba-dialogue-welcome__starters" aria-label="会話のきっかけ">
                            {CONVERSATION_STARTERS.map((starter) => (
                                <button key={starter} type="button" onClick={() => void sendMessage(starter)}>
                                    {starter}<ArrowUp aria-hidden="true" />
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={() => setShowIching(true)} className="orba-dialogue-welcome__iching">
                            <Sparkles aria-hidden="true" /> 具体的な問いを、易で確かめる
                        </button>
                    </motion.section>
                ) : (
                    <div className="orba-dialogue__transcript">
                        {messages.map((msg) => (
                            <motion.article
                                key={msg.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn('orba-dialogue-turn', msg.role === 'user' ? 'is-user' : 'is-assistant')}
                            >
                                {msg.role === 'assistant' && <CharacterAvatar type={char} size={42} />}
                                <div>
                                    <span>{msg.role === 'assistant' ? CHARACTER_META[char].label : 'あなた'}</span>
                                    <p>{msg.content}</p>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                )}
                {isLoading && (
                    <div className="orba-dialogue__thinking" role="status">
                        <CharacterAvatar type={char} size={42} speaking />
                        <div>
                            <span>{CHARACTER_META[char].label}</span>
                            <p>言葉を整えています<i /><i /><i /></p>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            <div className="orba-dialogue-composer relative z-10">
                <div className="orba-dialogue-composer__inner">
                    <div className="orba-dialogue-composer__tools">
                        <span>書きかけのままでも大丈夫です。</span>
                        <button
                            type="button"
                            onClick={() => setShowIching(true)}
                            title="易を立てる（具体的な問いに対して卦を立てる）"
                        >
                            <Sparkles aria-hidden="true" /> 易を立てる
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="orba-dialogue-composer__form">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    void sendMessage(input);
                                }
                            }}
                            rows={1}
                            aria-label="パートナーへ送るメッセージ"
                            placeholder="いま、心に残っていることは？"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={!input.trim() || isLoading} aria-label="メッセージを送る">
                            <ArrowUp aria-hidden="true" />
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
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-mesh flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-dashed border-amber-300/40 animate-spin" /></div>}>
            <ChatPageInner />
        </Suspense>
    );
}

'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { type UserProfile, type AnalysisResult } from '@/types';
import { CharacterAvatar, CHARACTER_META, type CharacterType } from '@/app/components/CharacterAvatar';
import { OrbField } from '@/app/components/OrbField';

type Phase = 'select' | 'chat' | 'analyzing' | 'result';
type ProfileType = 'self' | 'family' | 'friend';
type Turn = 'name' | 'gender' | 'birth' | 'time' | 'place' | 'concern';
const TURNS: Turn[] = ['name', 'gender', 'birth', 'time', 'place', 'concern'];
// ターン名 → 収集データのキー（'birth'→'birthDate' 等のズレを吸収）
const TURN_KEY: Record<Turn, 'name' | 'gender' | 'birthDate' | 'birthTime' | 'birthPlace' | 'currentWorry'> = {
  name: 'name', gender: 'gender', birth: 'birthDate', time: 'birthTime', place: 'birthPlace', concern: 'currentWorry',
};

// ── キャラごとの会話スクリプト（口調を一貫） ──────────────
type Script = {
  greet: string; name: string; gender: string; birth: string;
  time: string; place: string; concern: string; analyzing: string; reveal: string;
};
const SCRIPT: Record<CharacterType, Script> = {
  fairy: {
    greet: 'やっと会えたね！わたし、きみの妖精オーブだよ✨ これからよろしくね。',
    name: 'まず、きみのことなんて呼べばいい？',
    gender: 'よかったら教えて、きみは…？（答えなくてもいいよ）',
    birth: 'きみが生まれた日を教えてくれる？星の配置を読むのに必要なんだ。',
    time: '生まれた時刻はわかるかな？わからなければスキップで大丈夫だよ。',
    place: 'どこで生まれたの？街の名前だけでいいよ。',
    concern: '今、いちばん気になってることってある？なんでも話してね。',
    analyzing: 'うん、わかった。きみの星と魂、ぜんぶ読んでみるね…✨',
    reveal: 'できたよ。これが、きみという宇宙——',
  },
  shaman: {
    greet: 'お会いできて光栄です。わたくしは、あなたの巫女オーブ。共に歩みましょう。',
    name: 'まず、あなたのお名前を伺えますか。',
    gender: 'よろしければ、あなたのことを教えてください。（無理にとは申しません）',
    birth: 'あなたが生まれた日を、お聞かせください。',
    time: '生まれた刻はおわかりですか。不明であれば、そのままで構いません。',
    place: 'どちらで生を受けましたか。街の名で結構です。',
    concern: '今、心にかかっていることはありますか。なんなりと。',
    analyzing: '承知しました。あなたの星と宿、すべて読み解きます…',
    reveal: '視えました。これが、あなたという星宿——',
  },
  sage: {
    greet: 'はじめまして。私はきみの賢者オーブだ。これからじっくり付き合っていこう。',
    name: 'まず、きみの名前を教えてくれるかな。',
    gender: 'よければ、きみについて教えてほしい。（任意でいい）',
    birth: 'きみの生年月日を教えてくれ。星の地図を引くのに要る。',
    time: '生まれた時刻はわかるかい？不明ならスキップでいい。',
    place: 'どこで生まれた？都市名で十分だ。',
    concern: '今、いちばん気がかりなことは何だろう。聞かせてくれ。',
    analyzing: 'なるほど。きみの構造を、隅々まで読み解こう…',
    reveal: 'まとまったよ。これが、きみという一冊の本だ——',
  },
  friend: {
    greet: 'よっ、会えたね！おれ、きみの親友オーブ。気軽にいこーぜ！',
    name: 'まずさ、なんて呼べばいい？',
    gender: 'よかったら教えてよ、きみって…？（言いたくなきゃパスでOK）',
    birth: '誕生日いつ？星読むのに要るんだよね。',
    time: '生まれた時間ってわかる？わかんなきゃ飛ばしてOK！',
    place: 'どこ生まれ？街の名前だけでいいよ。',
    concern: 'で、今いちばん気になってることって何？なんでも話してよ。',
    analyzing: 'おっけー、まかせて。きみのこと全部読んでみる…！',
    reveal: 'できた！これがきみだよ——',
  },
  cool: {
    greet: '来たか。おれはきみのクールオーブだ。よろしく。',
    name: '名前を。',
    gender: '差し支えなければ、きみのことを。（任意だ）',
    birth: '生年月日を教えてくれ。',
    time: '出生時刻は？不明ならスキップでいい。',
    place: '出生地は。都市名でいい。',
    concern: '今、引っかかっていることは。端的でいい。',
    analyzing: '把握した。きみの全要素を読む…',
    reveal: '出た。これがきみだ——',
  },
  burn: {
    greet: 'よォ、待ってたぜ！おれがきみの焔オーブだ！一緒に燃えていこうぜ！',
    name: 'まず名前を聞かせてくれ！なんて呼べばいい？',
    gender: 'よかったら教えてくれ、きみは…？（言いたくなきゃパスでいいぜ）',
    birth: '誕生日はいつだ！？星を読むのに要るんだ！',
    time: '生まれた時間はわかるか？わからなきゃ飛ばしていいぜ！',
    place: 'どこで生まれた！？街の名前でいいぞ！',
    concern: 'で、今いちばん燃えてる悩みは何だ！？ぶつけてくれ！',
    analyzing: 'よし、まかせろ！きみの魂、全部読み切ってやる…！',
    reveal: 'できたぜ！これがきみだ——!',
  },
};

type Msg = { from: 'orb' | 'user'; text: string };

// 「〇〇です。」「〇〇と申します」等から名前部分だけを抽出
function cleanName(raw: string): string {
  let n = raw.trim();
  n = n.replace(/[。．.、,，!！?？\s]+$/g, '');
  n = n.replace(/(と申します|といいます|と言います|って言います|っていいます|です|でーす|だよ|だす)$/g, '');
  n = n.replace(/^(私は|わたしは|僕は|ぼくは|俺は|おれは|名前は)/g, '');
  n = n.replace(/[。．.、,，!！?？\s]+$/g, '');
  return n.trim() || raw.trim();
}

// ── オーブ選択画面 ────────────────────────────────────────
function OrbSelect({ onSelect, isNewProfile }: { onSelect: (t: CharacterType) => void; isNewProfile: boolean }) {
  const router = useRouter();
  const types = Object.keys(CHARACTER_META) as CharacterType[];
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  const redeem = async () => {
    if (code.length < 6) return;
    setCodeLoading(true); setCodeErr('');
    try {
      const res = await fetch(`/api/transfer?code=${code.toUpperCase()}`);
      if (!res.ok) { setCodeErr('無効または期限切れのコードです'); setCodeLoading(false); return; }
      const d = await res.json();
      const ur = await fetch('/api/user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: d.name, birthDate: d.birthDate, birthTime: d.birthTime, birthPlace: d.birthPlace, gender: d.gender, language: d.language, characterType: d.characterType, mbti: d.mbti, enneagram: d.enneagram, profileType: 'self' }),
      });
      const nu = await ur.json();
      if (d.latestDiagnosis) {
        await fetch('/api/diagnosis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: nu.id, data: JSON.parse(d.latestDiagnosis) }) });
      }
      await fetch(`/api/transfer?code=${code.toUpperCase()}`, { method: 'DELETE' });
      const stored = JSON.parse(localStorage.getItem('guf_profiles') || '[]');
      stored.push({ id: nu.id, name: d.name, profileType: 'self' });
      localStorage.setItem('guf_profiles', JSON.stringify(stored));
      localStorage.setItem('guf_user_id', nu.id);
      router.push('/mypage');
    } catch { setCodeErr('エラーが発生しました'); }
    setCodeLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="relative z-10 max-w-4xl mx-auto px-6 py-14 min-h-screen flex flex-col justify-center">
      <p className="font-display italic text-amber-200/70 text-xl md:text-2xl mb-2">Grand Unified Fortune</p>
      <h1 className="text-3xl md:text-5xl mb-3 leading-tight bg-gradient-to-b from-white to-white/55 bg-clip-text text-transparent">
        数ある無数のオーブの中から、<br className="hidden md:block" />君だけのパートナーを。
      </h1>
      <p className="text-white/45 mb-2 font-serif-jp text-sm md:text-base">
        ひとつ選んでください。その光が、あなたの人生にそっと寄り添います。
      </p>
      <p className="text-white/30 mb-9 text-xs">
        ※ 選ぶオーブで変わるのは<span className="text-amber-200/70">話し方（口調）だけ</span>。鑑定結果（占いの中身）は同じです。後からいつでも変えられます。
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {types.map((t) => (
          <motion.button key={t} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(t)}
            className="card p-5 flex flex-col items-center gap-2.5 text-center transition-colors hover:border-white/25">
            <CharacterAvatar type={t} size={96} />
            <p className="text-base md:text-lg font-serif-jp">{CHARACTER_META[t].label}</p>
            <p className="text-[11px] text-white/45 leading-snug font-serif-jp">{CHARACTER_META[t].tone}</p>
          </motion.button>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        {!showCode ? (
          <button onClick={() => setShowCode(true)} className="text-[11px] text-white/30 hover:text-white/60 tracking-wide transition-colors">
            引き継ぎコードをお持ちの方 →
          </button>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full max-w-xs">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="6文字のコード"
              className="w-full bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-center font-mono tracking-[0.4em] text-white placeholder:text-white/20 focus:outline-none focus:border-white/30" />
            {codeErr && <p className="text-xs text-rose-300">{codeErr}</p>}
            <div className="flex gap-2 w-full">
              <button onClick={() => { setShowCode(false); setCodeErr(''); }} className="flex-1 py-2 text-xs text-white/40 border border-white/10 rounded-full hover:text-white/70">キャンセル</button>
              <button onClick={redeem} disabled={code.length < 6 || codeLoading} className="flex-1 py-2 text-xs btn-gold font-bold disabled:opacity-40">{codeLoading ? '確認中…' : '引き継ぐ'}</button>
            </div>
          </div>
        )}
        {isNewProfile && (
          <button onClick={() => router.push('/mypage')} className="text-[11px] text-white/25 hover:text-white/50 tracking-wide">← ダッシュボードに戻る</button>
        )}
      </div>
    </motion.div>
  );
}

// ── 会話 + 鑑定結果 ───────────────────────────────────────
function Conversation({ char, profileType, userId }: { char: CharacterType; profileType: ProfileType; userId: string | null }) {
  const router = useRouter();
  const s = SCRIPT[char];
  const [phase, setPhase] = useState<Phase>('chat');
  const [turnIndex, setTurnIndex] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([{ from: 'orb', text: s.greet }, { from: 'orb', text: s.name }]);
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [data, setData] = useState({ name: '', gender: '', birthDate: '', birthTime: '', birthPlace: '', currentWorry: '' });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, phase, isTyping]);

  const currentTurn = TURNS[turnIndex];

  const advance = (value: string, display: string) => {
    const turn = TURNS[turnIndex];
    const stored = turn === 'name' ? cleanName(value) : value;
    const newData = { ...data, [TURN_KEY[turn]]: stored };
    setData(newData);
    setDraft('');
    setMessages((m) => [...m, { from: 'user', text: display || '（スキップ）' }]);

    // 少し「書き込み中」の間をおいてから相棒が返す
    const ni = turnIndex + 1;
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      if (ni < TURNS.length) {
        setMessages((m) => [...m, { from: 'orb', text: s[TURNS[ni]] }]);
        setTurnIndex(ni);
      } else {
        setMessages((m) => [...m, { from: 'orb', text: s.analyzing }]);
        setPhase('analyzing');
        runAnalysis(newData);
      }
    }, 850);
  };

  const runAnalysis = async (d: typeof data) => {
    try {
      const res = await fetch('/api/divine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile: { ...d, language: 'ja', characterType: char, mbti: '', enneagram: '', answers: [] } as UserProfile }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ? `${res.status}: ${err.detail}` : `HTTP ${res.status}`);
      }
      const r: AnalysisResult = await res.json();
      setResult(r);
      setMessages((m) => [...m, { from: 'orb', text: s.reveal }]);
      setPhase('result');
    } catch (e) {
      setMessages((m) => [...m, { from: 'orb', text: `ごめん、うまく読み取れなかった…もう一度試してくれる？（${e instanceof Error ? e.message : 'error'}）` }]);
      setPhase('chat');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    let id: string | null = userId;
    try {
      if (!id) {
        const r = await fetch('/api/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        if (r.ok) { id = (await r.json()).id; if (id) localStorage.setItem('guf_user_id', id); }
      }
      if (!id) { setIsSaving(false); return; }
      const expiresAt = profileType === 'friend' ? new Date(Date.now() + 30 * 864e5).toISOString() : null;
      await fetch('/api/user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: data.name, birthDate: data.birthDate, birthTime: data.birthTime, birthPlace: data.birthPlace, gender: data.gender, language: 'ja', characterType: char, profileType, expiresAt }),
      });
      let res = await fetch('/api/diagnosis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, data: result }) });
      if (res.status === 404) {
        const nr = await fetch('/api/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.name, birthDate: data.birthDate, birthTime: data.birthTime, birthPlace: data.birthPlace, gender: data.gender, language: 'ja', characterType: char }) });
        if (nr.ok) { id = (await nr.json()).id; if (id) { localStorage.setItem('guf_user_id', id); res = await fetch('/api/diagnosis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, data: result }) }); } }
      }
      if (res.ok) {
        const stored = JSON.parse(localStorage.getItem('guf_profiles') || '[]') as Array<{ id: string; name: string | null; profileType: string; expiresAt?: string | null }>;
        const entry = { id: id!, name: data.name, profileType, expiresAt };
        const merged = stored.filter((p) => p.id !== id);
        if (profileType === 'self') merged.unshift(entry); else merged.push(entry);
        localStorage.setItem('guf_profiles', JSON.stringify(merged));
        localStorage.setItem('guf_user_id', id!);
        router.push('/mypage');
      } else { setIsSaving(false); }
    } catch { setIsSaving(false); }
  };

  return (
    <div className="relative z-10 max-w-2xl mx-auto px-4 min-h-screen flex flex-col">
      {/* ヘッダー：相棒の存在 */}
      <div className="flex items-center gap-3 py-5 sticky top-0 z-20 bg-gradient-to-b from-[#0a0820] via-[#0a0820]/90 to-transparent">
        <CharacterAvatar type={char} size={48} speaking={phase === 'analyzing'} />
        <div>
          <p className="text-sm font-serif-jp text-white/90">{CHARACTER_META[char].label}</p>
          <p className="text-[10px] text-white/35">あなたのパートナー</p>
        </div>
      </div>

      {/* 会話 */}
      <div className="flex-1 space-y-4 pb-4">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={cn('flex', m.from === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[80%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed font-serif-jp',
                m.from === 'user' ? 'bg-white/10 text-white/90 rounded-br-sm' : 'card text-white/85 rounded-bl-sm')}>
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {(phase === 'analyzing' || isTyping) && (
          <div className="flex justify-start"><div className="card px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5">
            {[0, 1, 2].map((i) => <motion.span key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }} className="w-1.5 h-1.5 rounded-full bg-amber-200/70" />)}
          </div></div>
        )}

        {/* 鑑定結果 */}
        {phase === 'result' && result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3 pt-2">
            <div className="card p-6">
              <p className="text-amber-200/70 text-xs tracking-widest mb-3 font-serif-jp">魂のプロファイリング</p>
              <p className="text-lg leading-relaxed text-white/90 font-serif-jp whitespace-pre-line">{result.coreNature}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <ResultCard label="最強の戦略" body={result.strategy} />
              <ResultCard label="今の運気" body={result.timing} />
            </div>
            <div className="card p-6 text-center">
              <p className="text-amber-200/70 text-xs tracking-widest mb-2 font-serif-jp">核心メッセージ</p>
              <p className="text-xl font-serif-jp italic text-white leading-relaxed">&ldquo;{result.advice}&rdquo;</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4"><p className="text-[10px] text-white/35 mb-1">今日のテーマ</p><p className="text-base font-serif-jp text-white/90">{result.dailyTheme}</p></div>
              <div className="card p-4"><p className="text-[10px] text-white/35 mb-1">ラッキーアクション</p><p className="text-base font-serif-jp text-amber-200/90">{result.luckyAction}</p></div>
            </div>
            <div className="pt-3 flex flex-col items-center gap-3">
              <button onClick={handleSave} disabled={isSaving} className="btn-gold px-10 py-4 font-bold disabled:opacity-50">
                {isSaving ? '保存中…' : 'この子と歩きはじめる'}
              </button>
              <button onClick={() => window.location.reload()} className="text-[11px] text-white/30 hover:text-white/60">最初からやり直す</button>
            </div>
          </motion.div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* 入力エリア */}
      {phase === 'chat' && !isTyping && (
        <div className="sticky bottom-0 bg-gradient-to-t from-[#0a0820] via-[#0a0820]/95 to-transparent pt-3 pb-5">
          <Composer turn={currentTurn} draft={draft} setDraft={setDraft} onAnswer={advance} />
        </div>
      )}
    </div>
  );
}

function ResultCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="card p-5">
      <p className="text-amber-200/60 text-[11px] tracking-widest mb-2 font-serif-jp">{label}</p>
      <p className="text-sm leading-relaxed text-white/80 font-serif-jp">{body}</p>
    </div>
  );
}

// ── 入力コンポーザー（ターンごとに変化） ─────────────────
function Composer({ turn, draft, setDraft, onAnswer }: { turn: Turn; draft: string; setDraft: (v: string) => void; onAnswer: (value: string, display: string) => void }) {
  const inputBase = 'flex-1 bg-white/6 border border-white/12 rounded-full px-5 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-amber-200/40 transition-colors';
  const sendBtn = 'btn-gold px-6 py-3 font-bold text-sm disabled:opacity-40';

  if (turn === 'gender') {
    const opts: [string, string][] = [['male', '男性'], ['female', '女性'], ['other', 'その他'], ['', '答えない']];
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {opts.map(([v, l]) => (
          <button key={l} onClick={() => onAnswer(v, l)} className="btn-ghost px-5 py-2.5 text-sm text-white/80">{l}</button>
        ))}
      </div>
    );
  }
  if (turn === 'birth') {
    return (
      <div className="flex gap-2">
        <input type="date" value={draft} onChange={(e) => setDraft(e.target.value)} className={inputBase} />
        <button disabled={!draft} onClick={() => onAnswer(draft, draft)} className={sendBtn}>決定</button>
      </div>
    );
  }
  if (turn === 'time') {
    return (
      <div className="flex gap-2 items-center">
        <input type="time" value={draft} onChange={(e) => setDraft(e.target.value)} className={inputBase} />
        <button disabled={!draft} onClick={() => onAnswer(draft, draft)} className={sendBtn}>決定</button>
        <button onClick={() => onAnswer('', 'わからない')} className="btn-ghost px-4 py-3 text-xs text-white/60 whitespace-nowrap">わからない</button>
      </div>
    );
  }
  if (turn === 'concern') {
    return (
      <div className="flex gap-2 items-end">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder="気になっていること…"
          className="flex-1 bg-white/6 border border-white/12 rounded-2xl px-5 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-amber-200/40 resize-none" />
        <div className="flex flex-col gap-1.5">
          <button disabled={!draft.trim()} onClick={() => onAnswer(draft, draft)} className={sendBtn}>送る</button>
          <button onClick={() => onAnswer('', '特にない')} className="btn-ghost px-4 py-2 text-[11px] text-white/55 whitespace-nowrap">特にない</button>
        </div>
      </div>
    );
  }
  // name / place （テキスト）
  const ph = turn === 'name' ? 'お名前 / ニックネーム' : '生まれた街（例：東京）';
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) onAnswer(draft.trim(), draft.trim()); }} className="flex gap-2">
      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={ph} className={inputBase} />
      <button type="submit" disabled={!draft.trim()} className={sendBtn}>送る</button>
    </form>
  );
}

// ── ルート ────────────────────────────────────────────────
function HomeInner() {
  const searchParams = useSearchParams();
  const isNewProfile = searchParams.get('newProfile') === '1';
  const [phase, setPhase] = useState<Phase>('select');
  const [char, setChar] = useState<CharacterType | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileType] = useState<ProfileType>('self');

  useEffect(() => {
    const init = async () => {
      let id = localStorage.getItem('guf_user_id');
      if (isNewProfile) {
        try { const r = await fetch('/api/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); setUserId((await r.json()).id); } catch {}
        return;
      }
      if (id) {
        try {
          const check = await fetch(`/api/user?id=${id}`);
          if (check.ok) { const u = await check.json(); if (u.birthDate) { window.location.href = '/mypage'; return; } }
          else { localStorage.removeItem('guf_user_id'); id = null; }
        } catch {}
      }
      if (!id) {
        try { const r = await fetch('/api/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); id = (await r.json()).id; if (id) localStorage.setItem('guf_user_id', id); } catch {}
      }
      setUserId(id);
    };
    init();
  }, [isNewProfile]);

  return (
    <main className="relative min-h-screen w-full bg-mesh overflow-x-hidden text-white">
      <OrbField count={22} />
      <AnimatePresence mode="wait">
        {phase === 'select' && (
          <OrbSelect key="select" isNewProfile={isNewProfile}
            onSelect={(t) => { setChar(t); setPhase('chat'); }} />
        )}
        {phase !== 'select' && char && (
          <Conversation key="conv" char={char} profileType={profileType} userId={userId} />
        )}
      </AnimatePresence>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-mesh flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-dashed border-amber-300/40 animate-spin" /></div>}>
      <HomeInner />
    </Suspense>
  );
}

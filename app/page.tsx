'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { QUESTIONS } from '@/data/questions';
import { TRANSLATIONS } from '@/data/translations';
import { cn } from '@/lib/utils';
import { Sparkles, Moon, Sun, Users, Heart, UserCheck } from 'lucide-react';
import { type UserProfile, type AnalysisResult, type Language, type CharacterType } from '@/types';

type Step = 'intro' | 'character' | 'form' | 'quiz' | 'analyzing' | 'result';

const CHARACTER_OPTIONS: { type: CharacterType; emoji: string; label: string; tone: string; vibe: string }[] = [
  { type: 'fairy',  emoji: '🧚', label: '妖精',   tone: '「〜だよ」ふわっと',     vibe: '無邪気で明るい、でも時々深い' },
  { type: 'shaman', emoji: '🌸', label: '巫女',   tone: '「〜ですよ」凛として',   vibe: '神秘的、言葉に重みがある' },
  { type: 'sage',   emoji: '🦉', label: '賢者',   tone: '「〜だね」論理的に',     vibe: '知的で包容力がある' },
  { type: 'friend', emoji: '👯', label: '親友',   tone: '「〜じゃん！」フランクに', vibe: '等身大、一緒に考えてくれる' },
  { type: 'cool',   emoji: '🧊', label: 'クール', tone: '「〜だ」端的にシャープに', vibe: '感情少なめ、でも的確' },
  { type: 'burn',   emoji: '🔥', label: 'アツい', tone: '「いけ！」熱量高めに',    vibe: '背中を強く押してくれる' },
];

// Character Select Component
const CharacterSelect = ({ userProfile, setUserProfile, setStep }: { userProfile: UserProfile, setUserProfile: (p: UserProfile) => void, setStep: (step: Step) => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-screen px-4 w-full relative z-10"
    >
      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mb-8" />
          <h2 className="text-3xl font-bold tracking-[0.3em] text-white uppercase mb-3">Partner Type</h2>
          <p className="text-slate-500 text-xs tracking-widest uppercase">あなたの相棒のキャラクターを選んでください</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {CHARACTER_OPTIONS.map((c) => (
            <motion.button
              key={c.type}
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setUserProfile({ ...userProfile, characterType: c.type });
                setStep('form');
              }}
              className={cn(
                'group glass p-6 text-left relative overflow-hidden transition-all duration-300 border',
                userProfile.characterType === c.type
                  ? 'border-purple-500/60 bg-purple-500/10'
                  : 'border-white/5 hover:border-white/20'
              )}
            >
              <div className="text-3xl mb-3">{c.emoji}</div>
              <div className="text-base font-bold text-white mb-1">{c.label}</div>
              <div className="text-[10px] text-slate-400 mb-2 tracking-wide">{c.tone}</div>
              <div className="text-[10px] text-slate-600">{c.vibe}</div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

type ProfileType = 'self' | 'family' | 'friend';

// Intro Component
const Intro = ({ userProfile, setUserProfile, setStep, isNewProfile, profileType, setProfileType }: {
  userProfile: UserProfile;
  setUserProfile: (p: UserProfile) => void;
  setStep: (step: Step) => void;
  isNewProfile: boolean;
  profileType: ProfileType;
  setProfileType: (t: ProfileType) => void;
}) => {
  const t = TRANSLATIONS[userProfile.language];
  const router = useRouter();
  const [hasId, setHasId] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [transferCode, setTransferCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('guf_user_id')) {
      setHasId(true);
    }
  }, []);

  const handleRedeemCode = async () => {
    if (transferCode.length < 6) return;
    setCodeLoading(true);
    setCodeError('');
    try {
      const res = await fetch(`/api/transfer?code=${transferCode.toUpperCase()}`);
      if (!res.ok) {
        const err = await res.json();
        setCodeError(err.error === 'Code expired' ? 'コードの有効期限が切れています' : '無効なコードです');
        setCodeLoading(false);
        return;
      }
      const profileData = await res.json();

      const userRes = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.name, birthDate: profileData.birthDate,
          birthTime: profileData.birthTime, birthPlace: profileData.birthPlace,
          gender: profileData.gender, language: profileData.language,
          characterType: profileData.characterType, mbti: profileData.mbti,
          enneagram: profileData.enneagram, profileType: 'self',
        })
      });
      if (!userRes.ok) throw new Error('Failed');
      const newUser = await userRes.json();

      if (profileData.latestDiagnosis) {
        await fetch('/api/diagnosis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: newUser.id, data: JSON.parse(profileData.latestDiagnosis) })
        });
      }
      await fetch(`/api/transfer?code=${transferCode.toUpperCase()}`, { method: 'DELETE' });

      const stored = JSON.parse(localStorage.getItem('guf_profiles') || '[]');
      stored.push({ id: newUser.id, name: profileData.name, profileType: 'self' });
      localStorage.setItem('guf_profiles', JSON.stringify(stored));
      localStorage.setItem('guf_user_id', newUser.id);
      router.push('/mypage');
    } catch {
      setCodeError('エラーが発生しました。もう一度お試しください。');
    }
    setCodeLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col items-center justify-center min-h-screen text-center px-4 overflow-hidden"
    >
      {/* Background Aura */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 blur-[120px] rounded-full animate-pulse-soft" />
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full animate-float" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-cyan-600/10 blur-[100px] rounded-full animate-float" style={{ animationDelay: '-3s' }} />
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative z-10"
      >
        <div className="mb-12 relative flex justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="w-48 h-48 rounded-full border border-white/10 flex items-center justify-center"
          >
            <div className="w-40 h-40 rounded-full border border-purple-500/20 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border border-cyan-500/30 flex items-center justify-center bg-white/5 backdrop-blur-sm">
                <Sparkles className="w-12 h-12 text-white/80 animate-pulse" />
              </div>
            </div>
          </motion.div>
          {/* Decorative rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/5 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
        </div>

        <h1 className="text-5xl md:text-8xl font-bold tracking-[0.2em] mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white/80 to-white/40 uppercase">
          {t.title}
        </h1>

        <p className="text-slate-400 text-lg md:text-xl font-light tracking-widest mb-12 max-w-2xl mx-auto leading-relaxed">
          {t.subtitle}
        </p>

        {/* Language Selector */}
        <div className="flex justify-center gap-4 mb-12">
          {(['ja', 'en', 'es'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setUserProfile({ ...userProfile, language: lang })}
              className={cn(
                "px-4 py-2 rounded-full border text-xs font-bold tracking-widest uppercase transition-all duration-300",
                userProfile.language === lang
                  ? "bg-white text-black border-white"
                  : "bg-transparent text-slate-500 border-white/10 hover:border-white/30 hover:text-white"
              )}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        {isNewProfile && (
          <div className="mb-8">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">誰のプロフィールを作りますか？</p>
            <div className="flex gap-3 justify-center">
              {([
                { type: 'self' as ProfileType, icon: <UserCheck className="w-4 h-4" />, label: '自分' },
                { type: 'family' as ProfileType, icon: <Heart className="w-4 h-4" />, label: '家族' },
                { type: 'friend' as ProfileType, icon: <Users className="w-4 h-4" />, label: '友達' },
              ]).map(({ type, icon, label }) => (
                <button
                  key={type}
                  onClick={() => setProfileType(type)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl border text-xs font-bold transition-all',
                    profileType === type
                      ? 'bg-white/10 border-white/30 text-white'
                      : 'bg-transparent border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                  )}
                >
                  {icon}
                  {label}
                  {type === 'friend' && <span className="text-[8px] text-white/25 font-normal">30日後削除</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 items-center">
          <button
            onClick={() => setStep('character')}
            className="group relative px-12 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10 text-white tracking-[1em] text-sm uppercase mr-[-1em] font-medium transition-transform group-hover:scale-110 block">
              {t.initialize}
            </span>
            {/* Internal Glow */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </button>

          {hasId && !isNewProfile && (
            <button
              onClick={() => router.push('/mypage')}
              className="text-xs text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
            >
              User Dashboard &gt;
            </button>
          )}
          {isNewProfile && (
            <button
              onClick={() => router.push('/mypage')}
              className="text-xs text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
            >
              ← ダッシュボードに戻る
            </button>
          )}

          {/* Transfer code entry */}
          {!showCodeInput ? (
            <button
              onClick={() => setShowCodeInput(true)}
              className="text-[10px] text-white/20 hover:text-white/50 uppercase tracking-widest transition-colors"
            >
              引き継ぎコードをお持ちの方 →
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
              <input
                value={transferCode}
                onChange={e => setTransferCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="6文字のコード"
                className="w-full bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-center font-mono text-base text-white tracking-[0.4em] placeholder:text-white/20 focus:outline-none focus:border-white/30"
                autoFocus
              />
              {codeError && <p className="text-xs text-red-400">{codeError}</p>}
              <div className="flex gap-2 w-full">
                <button onClick={() => { setShowCodeInput(false); setCodeError(''); }}
                  className="flex-1 py-2 text-xs text-white/30 border border-white/10 rounded-full hover:text-white/60 transition-colors">
                  キャンセル
                </button>
                <button onClick={handleRedeemCode} disabled={transferCode.length < 6 || codeLoading}
                  className="flex-1 py-2 text-xs text-white border border-white/20 bg-white/5 rounded-full hover:bg-white/10 disabled:opacity-40 transition-colors font-bold">
                  {codeLoading ? '確認中...' : '引き継ぐ'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Decorative corners */}
      <div className="absolute top-8 left-8 w-12 h-12 border-t border-l border-white/20" />
      <div className="absolute top-8 right-8 w-12 h-12 border-t border-r border-white/20" />
      <div className="absolute bottom-8 left-8 w-12 h-12 border-b border-l border-white/20" />
      <div className="absolute bottom-8 right-8 w-12 h-12 border-b border-r border-white/20" />
    </motion.div>
  );
};

// Form Component
interface FormProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  setStep: (step: Step) => void;
}

const Form = ({ userProfile, setUserProfile, setStep }: FormProps) => {
  const t = TRANSLATIONS[userProfile.language];
  const inputClasses = "w-full bg-white/5 border border-white/10 rounded-none px-6 py-4 transition-all duration-500 focus:bg-white/10 focus:border-purple-500/50 outline-none text-white tracking-wider placeholder:text-slate-600";
  const labelClasses = "block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-[0.3em] ml-1";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-screen px-4 w-full relative z-10"
    >
      <div className="w-full max-w-2xl">
        <div className="mb-12 text-center">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            className="h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mb-8"
          />
          <h2 className="text-4xl font-bold tracking-[0.4em] text-white uppercase mb-4">
            {t.configTitle}
          </h2>
          <p className="text-slate-500 text-xs tracking-widest uppercase">
            {t.configDesc}
          </p>
        </div>

        <div className="glass p-12 relative overflow-hidden group">
          <div className="scanline" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {/* Name */}
            <div className="md:col-span-2 group/field">
              <label className={labelClasses}>{t.nameLabel}</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t.namePlaceholder}
                  className={inputClasses}
                  value={userProfile.name}
                  onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                />
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-500 group-focus-within/field:w-full transition-all duration-700" />
              </div>
            </div>

            {/* Birth Info */}
            <div className="group/field">
              <label className={labelClasses}>{t.dateLabel}</label>
              <input
                type="date"
                className={inputClasses}
                value={userProfile.birthDate}
                onChange={(e) => setUserProfile({ ...userProfile, birthDate: e.target.value })}
              />
            </div>
            <div className="group/field">
              <label className={labelClasses}>{t.timeLabel}</label>
              <input
                type="time"
                className={inputClasses}
                value={userProfile.birthTime}
                onChange={(e) => setUserProfile({ ...userProfile, birthTime: e.target.value })}
              />
            </div>

            {/* Place & Gender */}
            <div className="group/field">
              <label className={labelClasses}>{t.placeLabel}</label>
              <input
                type="text"
                placeholder={t.placePlaceholder}
                className={inputClasses}
                value={userProfile.birthPlace}
                onChange={(e) => setUserProfile({ ...userProfile, birthPlace: e.target.value })}
              />
            </div>
            <div className="group/field">
              <label className={labelClasses}>{t.genderLabel}</label>
              <select
                className={`${inputClasses} appearance-none cursor-pointer`}
                value={userProfile.gender}
                onChange={(e) => setUserProfile({ ...userProfile, gender: e.target.value })}
              >
                <option value="" className="bg-black text-slate-500">{t.genderSelect}</option>
                <option value="male" className="bg-black">{t.genderMale}</option>
                <option value="female" className="bg-black">{t.genderFemale}</option>
                <option value="other" className="bg-black">{t.genderOther}</option>
              </select>
            </div>

            {/* MBTI */}
            <div className="group/field">
              <label className={labelClasses}>MBTI <span className="text-slate-600 normal-case">(任意)</span></label>
              <input
                type="text"
                placeholder="例: INFJ"
                maxLength={4}
                className={inputClasses}
                value={userProfile.mbti}
                onChange={(e) => setUserProfile({ ...userProfile, mbti: e.target.value.toUpperCase() })}
              />
            </div>

            {/* Enneagram */}
            <div className="group/field">
              <label className={labelClasses}>エニアグラム <span className="text-slate-600 normal-case">(任意)</span></label>
              <select
                className={`${inputClasses} appearance-none cursor-pointer`}
                value={userProfile.enneagram}
                onChange={(e) => setUserProfile({ ...userProfile, enneagram: e.target.value })}
              >
                <option value="" className="bg-black text-slate-500">わからない / スキップ</option>
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <option key={n} value={String(n)} className="bg-black">タイプ {n}</option>
                ))}
              </select>
            </div>

            {/* Worry */}
            <div className="md:col-span-2 group/field">
              <label className={labelClasses}>{t.worryLabel}</label>
              <textarea
                className={`${inputClasses} h-32 resize-none py-4 leading-relaxed`}
                placeholder={t.worryPlaceholder}
                value={userProfile.currentWorry}
                onChange={(e) => setUserProfile({ ...userProfile, currentWorry: e.target.value })}
              />
            </div>
          </div>

          <motion.button
            disabled={!userProfile.name || !userProfile.birthDate}
            onClick={() => setStep('quiz')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-12 py-5 bg-white text-black font-bold tracking-[0.5em] uppercase hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all relative overflow-hidden"
          >
            <span className="relative z-10 transition-transform group-hover:scale-110 block">
              {t.startCalibration}
            </span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};


// Quiz Component
interface QuizProps {
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (index: number | ((prev: number) => number)) => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  setStep: (step: Step) => void;
  runAnalysis: (finalAnswers: { questionId: number, selected: 'A' | 'B' }[]) => void;
}

const Quiz = ({ currentQuestionIndex, setCurrentQuestionIndex, userProfile, setUserProfile, setStep, runAnalysis }: QuizProps) => {
  const t = TRANSLATIONS[userProfile.language];
  const question = QUESTIONS[currentQuestionIndex];

  const handleAnswer = (selected: 'A' | 'B') => {
    const newAnswers = [...userProfile.answers, { questionId: question.id, selected }];
    setUserProfile({ ...userProfile, answers: newAnswers });

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setStep('analyzing');
      runAnalysis(newAnswers);
    }
  };

  return (
    <motion.div
      key={currentQuestionIndex}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center min-h-screen px-4 max-w-4xl mx-auto relative z-10"
    >
      {/* Progress HUD */}
      <div className="w-full max-w-lg mb-16 px-8 py-4 glass border-white/5 relative overflow-hidden">
        <div className="scanline" />
        <div className="flex justify-between items-end mb-4">
          <div className="space-y-1">
            <span className="block text-[10px] text-slate-500 uppercase tracking-[0.3em]">{t.sequenceStatus}</span>
            <span className="text-xl font-bold text-white tracking-widest uppercase">
              Q-{String(currentQuestionIndex + 1).padStart(2, '0')}
            </span>
          </div>
          <div className="text-right space-y-1">
            <span className="block text-[10px] text-slate-500 uppercase tracking-[0.3em]">{t.integrity}</span>
            <span className="text-xl font-mono text-cyan-400">
              {Math.round((currentQuestionIndex / QUESTIONS.length) * 100)}%
            </span>
          </div>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-400"
            initial={{ width: `${((currentQuestionIndex) / QUESTIONS.length) * 100}%` }}
            animate={{ width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%` }}
            transition={{ duration: 1, ease: "circOut" }}
          />
        </div>
      </div>

      <motion.h2
        key={String(question.text[userProfile.language])}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl md:text-4xl font-bold text-center mb-16 leading-relaxed text-white tracking-tight"
      >
        {question.text[userProfile.language]}
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {['A', 'B'].map((option) => {
          const isA = option === 'A';
          const text = isA ? question.optionA[userProfile.language] : question.optionB[userProfile.language];
          const accent = isA ? "hover:border-purple-500/50" : "hover:border-cyan-500/50";
          const glow = isA ? "group-hover:bg-purple-500/5" : "group-hover:bg-cyan-500/5";

          return (
            <motion.button
              key={option}
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAnswer(option as 'A' | 'B')}
              className={cn(
                "group p-10 glass border-white/10 text-left relative overflow-hidden transition-all duration-500",
                accent
              )}
            >
              <div className={cn("absolute inset-0 opacity-0 transition-opacity duration-500", glow)} />
              <div className="absolute top-6 right-8 text-[10px] font-bold text-slate-500 tracking-widest uppercase bg-white/5 px-2 py-1">
                {t.optionPrefix} {option}
              </div>
              <p className="text-xl text-slate-200 group-hover:text-white transition-colors relative z-10 leading-relaxed font-light">
                {text}
              </p>

              {/* Decorative corner accent */}
              <div className={cn(
                "absolute bottom-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                isA ? "border-b border-r border-purple-500" : "border-b border-r border-cyan-500"
              )} />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

// Analyzing Component
const Analyzing = ({ language }: { language: Language }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dataPoints, setDataPoints] = useState<string[]>([]);
  const t = TRANSLATIONS[language];
  const messages = t.analyzing;

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length);
      setDataPoints(prev => [...prev.slice(-4), `0x${Math.random().toString(16).slice(2, 8).toUpperCase()}`]);
    }, 1000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-screen text-center relative overflow-hidden"
    >
      {/* Scanning Grid Background */}
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-5">
        {[...Array(64)].map((_, i) => (
          <div key={i} className="border border-white/20 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>

      <div className="relative mb-16 scale-150">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ rotate: { duration: 10, repeat: Infinity, ease: "linear" }, scale: { duration: 4, repeat: Infinity } }}
          className="w-24 h-24 rounded-full border-2 border-dashed border-purple-500/50 flex items-center justify-center p-2"
        >
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="w-full h-full rounded-full border border-cyan-500/30 flex items-center justify-center"
          >
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </motion.div>
        </motion.div>

        {/* Rapid data labels around the center */}
        {dataPoints.map((point, i) => (
          <motion.div
            key={`${point}-${i}`}
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: [0, 1, 0], x: (i % 2 === 0 ? 60 : -60), y: (i < 2 ? 60 : -60) }}
            transition={{ duration: 1.5 }}
            className="absolute text-[8px] font-mono text-cyan-500 pointer-events-none"
          >
            {point}
          </motion.div>
        ))}
      </div>

      <div className="space-y-6 relative z-10">
        <motion.p
          key={msgIndex}
          initial={{ opacity: 0, letterSpacing: "1em" }}
          animate={{ opacity: 1, letterSpacing: "0.4em" }}
          exit={{ opacity: 0 }}
          className="text-sm font-bold text-white tracking-[0.4em] uppercase"
        >
          {messages[msgIndex]}
        </motion.p>

        <div className="flex gap-1 justify-center">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-1 h-1 bg-white rounded-full"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Result Component
const Result = ({ result, language, userId, userProfile, profileType }: {
  result: AnalysisResult | null;
  language: Language;
  userId: string | null;
  userProfile: UserProfile;
  profileType: ProfileType;
}) => {
  if (!result) return null;
  const t = TRANSLATIONS[language];
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    let currentUserId: string | null = userId;
    setIsSaving(true);

    try {
      // ユーザーIDがない場合は新規作成
      if (!currentUserId) {
        const newUserRes = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if (newUserRes.ok) {
          const newUserData = await newUserRes.json();
          currentUserId = newUserData.id;
          if (currentUserId) localStorage.setItem('guf_user_id', currentUserId);
        }
      }

      if (!currentUserId) {
        alert("Failed to initialize user identity. Please reload.");
        setIsSaving(false);
        return;
      }

      // expiresAt: 友達は30日後
      const expiresAt = profileType === 'friend'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // プロフィールをUserテーブルに保存
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUserId,
          name: userProfile.name,
          birthDate: userProfile.birthDate,
          birthTime: userProfile.birthTime,
          birthPlace: userProfile.birthPlace,
          gender: userProfile.gender,
          language: userProfile.language,
          characterType: userProfile.characterType || null,
          mbti: userProfile.mbti || null,
          enneagram: userProfile.enneagram || null,
          profileType,
          expiresAt,
        })
      });

      // 診断結果を保存
      let res = await fetch('/api/diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, data: result })
      });

      // stale IDの場合は新規ユーザーで再試行
      if (res.status === 404) {
        const newUserRes = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: userProfile.name,
            birthDate: userProfile.birthDate,
            birthTime: userProfile.birthTime,
            birthPlace: userProfile.birthPlace,
            gender: userProfile.gender,
            language: userProfile.language,
          })
        });
        if (newUserRes.ok) {
          const newUserData = await newUserRes.json();
          currentUserId = newUserData.id;
          if (currentUserId) {
            localStorage.setItem('guf_user_id', currentUserId);
            res = await fetch('/api/diagnosis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: currentUserId, data: result })
            });
          }
        }
      }

      if (res.ok) {
        // guf_profiles に追加/更新
        const stored = JSON.parse(localStorage.getItem('guf_profiles') || '[]') as Array<{ id: string; name: string | null; profileType: string; expiresAt?: string | null }>;
        const newEntry = { id: currentUserId!, name: userProfile.name, profileType, expiresAt: profileType === 'friend' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null };
        const merged = stored.filter(p => p.id !== currentUserId);
        // self profile goes first, others append
        if (profileType === 'self' && merged.length === 0) {
          merged.push(newEntry);
        } else if (profileType === 'self') {
          merged.unshift(newEntry);
        } else {
          merged.push(newEntry);
        }
        localStorage.setItem('guf_profiles', JSON.stringify(merged));
        localStorage.setItem('guf_user_id', currentUserId!);
        router.push('/mypage');
      } else {
        console.error("Save failed", res.status);
        alert("Failed to save data. Please try again.");
      }
    } catch (e) {
      console.error("Failed to save", e);
      alert("Network error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen py-24 px-4 max-w-6xl mx-auto relative z-10"
    >
      <div className="text-center mb-20">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "200px" }}
          className="h-px bg-cyan-500/50 mx-auto mb-8"
        />
        <h2 className="text-sm font-bold text-cyan-400 tracking-[0.5em] uppercase mb-4">Analysis Terminal</h2>
        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 tracking-tight uppercase">
          {t.resultTitle}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
        {/* Core Nature - Hero Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-12 glass p-12 relative overflow-hidden group"
        >
          <div className="scanline opacity-20" />
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles className="w-48 h-48" />
          </div>
          <div className="relative z-10 max-w-3xl">
            <h3 className="text-sm md:text-base font-bold text-purple-400 tracking-[0.4em] mb-6 uppercase flex items-center gap-4">
              <span className="w-8 h-px bg-purple-500/50" />
              01 // {t.coreEssence}
            </h3>
            <p className="text-2xl md:text-3xl font-light text-slate-200 leading-relaxed italic">
              {result.coreNature}
            </p>
          </div>
          {/* Decorative corner */}
          <div className="absolute top-0 right-0 w-24 h-24 border-t border-r border-white/10" />
        </motion.div>

        {/* Strategy & Timing */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-6 glass p-10 group"
        >
          <h3 className="text-sm font-bold text-cyan-400 tracking-[0.4em] mb-6 uppercase">02 // {t.operationalStrategy}</h3>
          <p className="text-lg text-slate-300 leading-relaxed font-light">{result.strategy}</p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-6 glass p-10 group"
        >
          <h3 className="text-sm font-bold text-indigo-400 tracking-[0.4em] mb-6 uppercase">03 // {t.temporalAlignment}</h3>
          <p className="text-lg text-slate-300 leading-relaxed font-light">{result.timing}</p>
        </motion.div>

        {/* Advice - Full width gradient */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-12 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-cyan-500/20 blur-3xl opacity-30" />
          <div className="glass p-12 text-center relative z-10 border-white/20">
            <h3 className="text-sm font-bold text-white tracking-[1em] mb-8 uppercase mr-[-1em]">{t.masterGuidance}</h3>
            <p className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60 leading-tight italic">
              &quot;{result.advice}&quot;
            </p>
          </div>
        </motion.div>

        {/* Themes */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="md:col-span-6 glass p-8 flex items-center justify-between group"
        >
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-[0.3em]">{t.currentFrequency}</p>
            <p className="text-xl font-bold text-white tracking-widest">{result.dailyTheme}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
            <Moon className="w-6 h-6 text-purple-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="md:col-span-6 glass p-8 flex items-center justify-between group"
        >
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-[0.3em]">{t.catalyticAction}</p>
            <p className="text-xl font-bold text-cyan-400 tracking-widest">{result.luckyAction}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
            <Sun className="w-6 h-6 text-cyan-400" />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-20 text-center flex flex-col gap-4 items-center"
      >
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="group px-12 py-4 bg-purple-500/20 border border-purple-500/50 text-white hover:bg-purple-500/30 transition-all uppercase text-sm tracking-[0.4em] font-bold"
        >
          {isSaving ? "SAVING..." : "SAVE & MY PAGE"}
        </button>

        <button
          onClick={() => window.location.reload()}
          className="group px-8 py-3 bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all uppercase text-xs tracking-[0.4em] font-bold"
        >
          {t.reInitialize}
        </button>
      </motion.div>
    </motion.div>
  );
};

function HomeInner() {
  const searchParams = useSearchParams();
  const isNewProfile = searchParams.get('newProfile') === '1';

  const [step, setStep] = useState<Step>('intro');
  const [profileType, setProfileType] = useState<ProfileType>('self');
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    gender: '',
    currentWorry: '',
    language: 'ja',
    characterType: '',
    mbti: '',
    enneagram: '',
    answers: [],
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const initUser = async () => {
      let id = localStorage.getItem('guf_user_id');

      // newProfile=1: skip redirect, create a fresh user ID for the new profile
      if (isNewProfile) {
        try {
          const res = await fetch('/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          const data = await res.json();
          // Don't update localStorage yet — we'll do that on save
          setUserId(data.id);
        } catch (e) {
          console.error("Failed to init new profile user", e);
        }
        return;
      }

      if (id) {
        try {
          const check = await fetch(`/api/user?id=${id}`);
          if (check.ok) {
            const userData = await check.json();
            // 再訪ユーザー：プロフィール登録済みならダッシュボードへ
            if (userData.birthDate) {
              window.location.href = '/mypage';
              return;
            }
          } else {
            localStorage.removeItem('guf_user_id');
            id = null;
          }
        } catch (e) {
          console.error("Error verifying user", e);
        }
      }

      if (!id) {
        try {
          const res = await fetch('/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          const data = await res.json();
          id = data.id;
          if (id) localStorage.setItem('guf_user_id', id);
        } catch (e) {
          console.error("Failed to init user", e);
        }
      }
      setUserId(id);
    };
    initUser();
  }, [isNewProfile]);

  const runAnalysis = async (finalAnswers: { questionId: number, selected: 'A' | 'B' }[]) => {
    // Short delay for visual effect
    await new Promise(resolve => setTimeout(resolve, 6000));

    try {
      const res = await fetch('/api/divine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile: {
            ...userProfile,
            answers: finalAnswers
          }
        })
      });

      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      setResult(data);
      setStep('result');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-mesh overflow-x-hidden selection:bg-purple-500/30">
      {/* Dynamic Background Auras */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-900/10 blur-[150px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-900/10 blur-[150px] rounded-full animate-float" style={{ animationDelay: '-5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <Intro key="intro" userProfile={userProfile} setUserProfile={setUserProfile} setStep={setStep}
            isNewProfile={isNewProfile} profileType={profileType} setProfileType={setProfileType} />
        )}
        {step === 'character' && (
          <CharacterSelect key="character" userProfile={userProfile} setUserProfile={setUserProfile} setStep={setStep} />
        )}
        {step === 'form' && (
          <Form key="form" userProfile={userProfile} setUserProfile={setUserProfile} setStep={setStep} />
        )}
        {step === 'quiz' && (
          <Quiz
            key="quiz"
            currentQuestionIndex={currentQuestionIndex}
            setCurrentQuestionIndex={setCurrentQuestionIndex}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            setStep={setStep}
            runAnalysis={runAnalysis}
          />
        )}
        {step === 'analyzing' && <Analyzing key="analyzing" language={userProfile.language} />}
        {step === 'result' && (
          <Result key="result" result={result} language={userProfile.language} userId={userId}
            userProfile={userProfile} profileType={profileType} />
        )}
      </AnimatePresence>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-purple-400/40 animate-spin" />
      </div>
    }>
      <HomeInner />
    </Suspense>
  );
}

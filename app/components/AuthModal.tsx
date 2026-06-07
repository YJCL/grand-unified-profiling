'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

type Mode = 'login' | 'register';

// 本登録/ログイン兼用モーダル。
// userId を渡すと「インスタントアカウントの本登録（データ引き継ぎ）」になる。
export function AuthModal({
  initialMode = 'login',
  userId,
  onClose,
  onSuccess,
}: {
  initialMode?: Mode;
  userId?: string | null;
  onClose: () => void;
  onSuccess: (user: { id: string; email: string | null }) => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'register' ? { email, password, userId } : { email, password };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'エラーが発生しました'); setLoading(false); return; }
      // ログイン中の identity を localStorage に反映
      localStorage.setItem('guf_user_id', data.id);
      onSuccess({ id: data.id, email: data.email });
    } catch {
      setError('通信に失敗しました');
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm card p-7 rounded-3xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-serif-jp text-white">{mode === 'register' ? 'アカウント登録' : 'ログイン'}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-white/40 mb-5 font-serif-jp">
          {mode === 'register'
            ? (userId ? '今のプロフィールを引き継いで本登録します。別の端末でも同じデータを使えます。' : 'メールとパスワードで登録します。')
            : '登録済みのメールとパスワードでログインします。'}
        </p>

        <form onSubmit={submit} className="space-y-3">
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メールアドレス"
            className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-amber-200/40" />
          <input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="パスワード（8文字以上）"
            className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-amber-200/40" />
          {error && <p className="text-xs text-rose-300">{error}</p>}
          <button type="submit" disabled={loading} className="w-full btn-gold py-3 font-bold disabled:opacity-50">
            {loading ? '処理中…' : mode === 'register' ? '登録する' : 'ログイン'}
          </button>
        </form>

        <button onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}
          className="mt-4 w-full text-center text-xs text-white/40 hover:text-white/70">
          {mode === 'register' ? 'アカウントをお持ちの方はログイン' : '新規登録はこちら'}
        </button>

        <p className="mt-4 text-[10px] text-white/25 leading-relaxed">
          パスワードは暗号化（一方向ハッシュ）して保存され、運営も元のパスワードを見ることはできません。
        </p>
      </motion.div>
    </motion.div>
  );
}

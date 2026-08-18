'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { AuthModal } from './AuthModal';

type AuthMode = 'login' | 'register';

export function LandingAccountActions() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode | null>(null);

  const open = (nextMode: AuthMode) => setMode(nextMode);

  return (
    <>
      <div className="orba-lp__account-actions is-header">
        <button type="button" className="orba-lp__login" onClick={() => open('login')}>
          ログイン
        </button>
        <button type="button" className="orba-lp__register" onClick={() => open('register')}>
          新規登録
        </button>
        <Link className="orba-lp__trial" href="/start">
          無料で試す
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <AnimatePresence>
        {mode && (
          <AuthModal
            initialMode={mode}
            onClose={() => setMode(null)}
            onSuccess={() => router.push(mode === 'register' ? '/start' : '/mypage')}
          />
        )}
      </AnimatePresence>
    </>
  );
}

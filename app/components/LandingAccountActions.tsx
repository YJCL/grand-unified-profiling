'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { AuthModal } from './AuthModal';

type AuthMode = 'login' | 'register';

export function LandingAccountActions({ placement }: { placement: 'header' | 'hero' | 'final' }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode | null>(null);

  const open = (nextMode: AuthMode) => setMode(nextMode);

  return (
    <>
      <div className={`orba-lp__account-actions is-${placement}`}>
        {placement !== 'final' && (
          <button type="button" className="orba-lp__login" onClick={() => open('login')}>
            ログイン
          </button>
        )}
        <button type="button" className="orba-lp__register" onClick={() => open('register')}>
          {placement === 'header' ? '無料で新規登録' : '無料アカウントを作る'}
          <ArrowRight size={placement === 'header' ? 14 : 16} aria-hidden="true" />
        </button>
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

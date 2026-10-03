'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthModal } from './AuthModal';
export function LandingAccountActions() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  return <>
    <div className="orba-lp__account-actions is-header">
      <button type="button" className="orba-lp__login" onClick={() => setShowLogin(true)}>既存アカウントでログイン</button>
      <Link className="orba-lp__trial" href="/mypage">マイページを開く</Link>
    </div>
    {showLogin && <AuthModal initialMode="login" onClose={() => setShowLogin(false)} onSuccess={() => router.push('/mypage')} />}
  </>;
}

'use client';

import { useState } from 'react';
import { AuthModal } from '@/app/components/AuthModal';

export function ProfileSessionRecovery() {
  const [showLogin, setShowLogin] = useState(false);
  return (
    <main className="min-h-screen bg-mesh flex items-center justify-center px-6 text-white">
      <section className="card max-w-md rounded-3xl p-7 space-y-4">
        <h1 className="text-xl font-serif-jp">プロフィールの所有者確認が必要です</h1>
        <p className="text-sm text-white/70">登録済みの方はログインすると、以前のプロフィールを開けます。</p>
        <p className="text-sm text-white/70">ゲスト利用で確認情報が残っていない場合は、以前のデータをIDだけで復元できません。データは削除せず、新しいプロフィールから始められます。</p>
        <button className="btn-gold w-full py-3" onClick={() => setShowLogin(true)}>ログインする</button>
        <a className="btn-ghost block text-center py-3" href="/start?newProfile=1">新しいプロフィールを作る</a>
        <a className="block text-center text-sm underline" href="/contact">お問い合わせ</a>
      </section>
      {showLogin && <AuthModal initialMode="login" onClose={() => setShowLogin(false)} onSuccess={() => { window.location.href = '/mypage'; }} />}
    </main>
  );
}

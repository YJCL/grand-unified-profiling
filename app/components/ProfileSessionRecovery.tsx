'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TransferRestore } from './TransferRestore';
import { AuthModal } from '@/app/components/AuthModal';

export function ProfileSessionRecovery() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  return (
    <main className="min-h-screen bg-mesh flex items-center justify-center px-6 text-white">
      <section className="card max-w-md rounded-3xl p-7 space-y-4">
        <h1 className="text-xl font-serif-jp">プロフィールの所有者確認が必要です</h1>
        <p className="text-sm text-white/70">登録済みの方はログインすると、以前のプロフィールを開けます。</p>
        <p className="text-sm text-white/70">ゲスト利用で確認情報が残っていない場合は、以前のデータをIDだけで復元できません。データは保持しています。所有者の端末で新しい引き継ぎコードを発行してください。新規プロフィールの受付は停止しています。</p>
        <button className="btn-gold w-full py-3" onClick={() => setShowLogin(true)}>ログインする</button>
        <TransferRestore />
        <Link className="block text-center text-sm underline" href="/contact">お問い合わせ</Link>
      </section>
      {showLogin && <AuthModal initialMode="login" onClose={() => setShowLogin(false)} onSuccess={() => { router.push('/mypage'); router.refresh(); }} />}
    </main>
  );
}

'use client';

import { useEffect } from 'react';

// アプリ全体で一度だけサービスワーカーを登録する。
// プッシュ購読そのものはユーザーがマイページで明示的にオンにしたときに行う。
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // 登録失敗は致命的ではない（プッシュが使えないだけ）
      console.warn('SW registration failed:', err);
    });
  }, []);

  return null;
}

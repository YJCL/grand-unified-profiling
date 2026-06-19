'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

// VAPID公開鍵(base64url) → Uint8Array（PushManager.subscribe用）
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = 'loading' | 'unsupported' | 'off' | 'on' | 'denied' | 'busy';

export function NotificationToggle({ userId }: { userId: string }) {
  const [state, setState] = useState<State>('loading');
  const [hint, setHint] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window &&
        !!VAPID_PUBLIC;
      if (!supported) { if (!cancelled) setState('unsupported'); return; }
      if (Notification.permission === 'denied') { if (!cancelled) setState('denied'); return; }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub ? 'on' : 'off');
      } catch {
        if (!cancelled) setState('off');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const enable = async () => {
    setState('busy');
    setHint('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setState(perm === 'denied' ? 'denied' : 'off');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error('subscribe failed');
      setState('on');
      // 動作確認の通知を即時送信
      fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }).catch(() => {});
    } catch (err) {
      console.warn('enable push failed:', err);
      setState('off');
      // iOS はホーム画面に追加したアプリ内でのみ通知が使える
      const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      setHint(isIOS && !standalone
        ? 'iPhoneでは、共有メニューから「ホーム画面に追加」したOrbaのアプリでオンにできますⓘ'
        : '通知をオンにできませんでした。ブラウザの設定をご確認ください。');
    }
  };

  const disable = async () => {
    setState('busy');
    setHint('');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
    } finally {
      setState('off');
    }
  };

  if (state === 'loading' || state === 'unsupported') return null;

  const on = state === 'on';

  return (
    <div className="card p-3.5 flex items-center gap-3">
      <div className={cn('flex-none w-9 h-9 rounded-full flex items-center justify-center',
        on ? 'bg-amber-400/15 text-amber-300' : 'bg-white/5 text-white/40')}>
        {on ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-serif-jp text-white">毎日の運気を通知で受け取る</p>
        <p className="text-[11px] text-white/40">
          {state === 'denied'
            ? '通知がブロックされています。ブラウザの設定で許可してください。'
            : hint || '毎朝、あなただけの今日の運気をそっとお届けします🌙'}
        </p>
      </div>
      {state !== 'denied' && (
        <button
          onClick={on ? disable : enable}
          disabled={state === 'busy'}
          aria-label={on ? '通知をオフにする' : '通知をオンにする'}
          className={cn(
            'flex-none relative w-12 h-7 rounded-full transition-colors disabled:opacity-50',
            on ? 'bg-amber-400/80' : 'bg-white/15'
          )}
        >
          {state === 'busy'
            ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            : <span className={cn('absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all', on ? 'left-6' : 'left-1')} />}
        </button>
      )}
    </div>
  );
}

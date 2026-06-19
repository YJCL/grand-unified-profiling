/* Orba Service Worker — Web Push 通知の受信とクリック処理だけを担う最小構成。
   オフラインキャッシュは現状やらない（アプリ的SPAでメリット薄く、古いHTMLを掴むリスクの方が大きい）。*/

self.addEventListener('install', () => {
  // 新しいSWを即時有効化（古いSWを待たない）
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// サーバーからのプッシュ受信 → 通知を表示
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text ? event.data.text() : '' };
  }

  const title = data.title || 'Orba';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'orba-daily', // 同タグは上書き＝通知が溜まらない
    data: { url: data.url || '/mypage' },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知タップ → 既存タブを前面に、なければ新規に開く
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/mypage';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // 既にOrbaを開いているタブがあればフォーカスして遷移
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl).catch(() => {});
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

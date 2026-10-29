/* No caching of authenticated content or market data. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let data = { title: 'Monetizable', body: 'Your next quest is ready.', href: '/', icon: '/push/charlie-192.png', badge: '/push/charlie-192.png', image: '/push/charlie-192.png', id: 'quest' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch { /* show the fallback */ }
  const icon = data.icon || '/push/charlie-192.png';
  const options = { body: data.body, icon, badge: data.badge || icon, tag: data.id || 'quest', data: { href: data.href || '/' } };
  event.waitUntil((async () => {
    try { await self.registration.showNotification(data.title, { ...options, image: data.image || icon, renotify: true }); }
    catch { await self.registration.showNotification(data.title, options); }
  })());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.href || '/', self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
    for (const client of windows) {
      if (!client.url.startsWith(self.location.origin)) continue;
      if (typeof client.navigate === 'function') {
        try { await client.navigate(target.href); return client.focus(); } catch { /* open a fresh window */ }
      }
    }
    return self.clients.openWindow(target.href);
  }));
});

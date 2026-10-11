/* No caching of authenticated content or market data. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let data = { title: 'Monetizable', body: 'Your next quest is ready', href: '/', id: 'quest' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch { /* show fallback */ }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: '/brand/icon-192.png', badge: '/brand/icon-192.png', tag: data.id || 'quest', data: { href: data.href || '/' } }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.href || '/', self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
    for (const client of windows) { if ('focus' in client) { await client.navigate(target.href); return client.focus(); } }
    return self.clients.openWindow(target.href);
  }));
});

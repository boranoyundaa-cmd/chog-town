// The phone companion's service worker (m.html, js/mobile.js): shows Lev's notifications (server/push.js) and opens the phone page on a tap.
// It caches nothing: the site is small and always served fresh.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Lev, front desk', { body: d.body || '', icon: 'icons/lev-192.png', badge: 'icons/badge-96.png', tag: d.kind || 'lev', renotify: true, data: { url: d.url || 'm.html' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || 'm.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => { for (const c of list) if (c.url.includes('/m.html') && 'focus' in c) return c.focus(); return self.clients.openWindow(url); }));
});

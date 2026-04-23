/* Sirat offline service worker — cache-first + privacy-safe local notifications */
const CACHE = 'sirat-static-v2';
const OFFLINE_URLS = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Don't cache the WebLLM model — it manages its own cache.
  if (url.hostname.includes('huggingface.co') || url.hostname.includes('mlc.ai')) return;

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(resp => {
          if (resp.ok && url.origin === self.location.origin) {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return resp;
        })
        .catch(() => cached || new Response('Offline', { status: 503 }));
      return cached || network;
    })
  );
});

/* ---------------- Local notifications (privacy-safe) ----------------
 * The page posts { type: 'SHOW_NOTIFICATION', title, body, tag } to the SW
 * which calls showNotification — this works whether the tab is hidden or
 * the PWA is installed. No remote push server is involved.
 */
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(data.title || 'Sirat', {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'sirat-reminder',
      silent: false,
      data: { url: data.url || '/' },
    });
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

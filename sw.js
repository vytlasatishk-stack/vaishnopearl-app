/* Vaishno Pearl FOMACS - service worker (network-first for app, offline fallback) */
const CACHE = 'vp-cache-v22';
const ASSETS = ['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-512-maskable.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const accept = e.request.headers.get('accept') || '';
  const isHTML = e.request.mode === 'navigate' || accept.includes('text/html');
  if (isHTML) {
    // NETWORK-FIRST: always fetch the freshest app when online; fall back to cache offline
    e.respondWith(
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put('index.html', copy).catch(() => {}));
        return resp;
      }).catch(() => caches.match('index.html').then(r => r || caches.match('./')))
    );
  } else {
    // CACHE-FIRST for static assets (icons, manifest)
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy).catch(() => {}));
        return resp;
      }).catch(() => undefined))
    );
  }
});

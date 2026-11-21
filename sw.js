const CACHE_NAME = 'old-norse-v411111.7';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './ic_launcher.png',
  './bg_norse.jpg',
  './sql-wasm.js',
  './sql-wasm.wasm',
  './old_norse.db.gz'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
  } else {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then((cached) => cached || fetch(e.request))
    );
  }
});

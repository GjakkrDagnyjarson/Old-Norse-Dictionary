const CACHE_NAME = "old-norse-v3.3";
const ASSETS = [
  './',
  './index.html',
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
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => cached || fetch(e.request))
  );
});

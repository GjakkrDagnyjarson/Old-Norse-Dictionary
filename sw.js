const UI_CACHE = 'old-norse-ui-v3.08';
const DB_CACHE = 'old-norse-db-v3.08';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== UI_CACHE && k !== DB_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.pathname.endsWith('old_norse.db.gz') || url.pathname.endsWith('sql-wasm.wasm')) {
    if (e.request.url.includes('nocache=')) { e.respondWith(fetch(e.request, { cache: 'no-store' })); return; }
  e.respondWith(
      caches.open(DB_CACHE).then(cache =>
        cache.match(e.request).then(hit => hit || fetch(e.request).then(res => {
          cache.put(e.request, res.clone());
          return res;
        }))
      )
    );
    return;
  }
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(UI_CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});

const CACHE_NAME = 'old-norse-v2.27';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './ic_launcher.png',
  './bg_norse.jpg', './glyphs/upd.png', './glyphs/a.png', './glyphs/á.png', './glyphs/b.png', './glyphs/d.png', './glyphs/ð.png', './glyphs/e.png', './glyphs/é.png', './glyphs/f.png', './glyphs/g.png', './glyphs/h.png', './glyphs/i.png', './glyphs/í.png', './glyphs/j.png', './glyphs/k.png', './glyphs/l.png', './glyphs/m.png', './glyphs/n.png', './glyphs/o.png', './glyphs/ó.png', './glyphs/p.png', './glyphs/r.png', './glyphs/s.png', './glyphs/t.png', './glyphs/u.png', './glyphs/ú.png', './glyphs/v.png', './glyphs/y.png', './glyphs/ý.png', './glyphs/þ.png', './glyphs/æ.png', './glyphs/ø.png', './glyphs/ǫ.png', './glyphs/œ.png', './knot_bar.png',
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

const CACHE = 'dune-companion-v2';
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./css/styles.css", "./js/app.js", "./js/storage.js", "./js/data.js", "./js/ui.js", "./js/game.js", "./js/timers.js", "./js/screens/play.js", "./js/screens/statistics.js", "./js/screens/home.js", "./js/screens/setup.js", "./js/state.js"];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) {
      const c = r.clone();
      caches.open(CACHE).then(cache => cache.put(e.request, c));
    }

    return r;
  }).catch(() => caches.match(e.request)));
});

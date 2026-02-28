const CACHE = 'byndoor-v2';
const STATIC = ['/', '/index.html', '/pages/place.html', '/manifest.json',
  '/css/app.css', '/js/firebase-config.js', '/js/app.js',
  '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request)
      .catch(() => caches.match('/index.html')))
  );
});

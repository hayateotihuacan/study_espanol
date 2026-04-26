const CACHE_NAME = 'lector-espanol-c1-v1-20260427';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './service-worker.js',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './data/words_A1.json',
  './data/words_A2.json',
  './data/words_B1.json',
  './data/words_B2.json',
  './data/words_C1.json',
  './data/grammar_A1.json',
  './data/grammar_A2.json',
  './data/grammar_B1.json',
  './data/grammar_B2.json',
  './data/grammar_C1.json',
  './data/readings_A1.json',
  './data/readings_A2.json',
  './data/readings_B1.json',
  './data/readings_B2.json',
  './data/readings_C1.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match('./index.html'));
    })
  );
});

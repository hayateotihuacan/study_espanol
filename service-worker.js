const CACHE_NAME = "lector-espanol-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-maskable.svg",
  "./data/words_A1.json",
  "./data/words_A2.json",
  "./data/grammar_A1.json",
  "./data/grammar_A2.json",
  "./data/readings_A1.json",
  "./data/readings_A2.json"
];

// 初回インストール時に主要アセットをキャッシュする。
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// 有効化時に古いキャッシュを削除する。
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// キャッシュ優先で取得し、未キャッシュはネットワーク取得して保存する。
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

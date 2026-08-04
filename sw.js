// Sonnenkompass – Service Worker
// Cache-Name bei jedem inhaltlichen Update hochzählen (v1 -> v2 ...),
// sonst bekommen Nutzer alte Versionen aus dem Cache ausgeliefert.
const CACHE_NAME = "sonnenkompass-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./fonts/fraunces.woff2",
  "./fonts/archivo.woff2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first mit Netzwerk-Fallback: App startet auch offline,
// aktualisiert sich aber automatisch, wenn Netz verfügbar ist.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

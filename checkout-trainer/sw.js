// Checkout-Trainer – Service Worker (Scope: nur dieser Ordner).
// Network-first: Online kommt immer die aktuelle Version, offline die zuletzt geladene.
// So bleibt kein Update im Cache hängen. Cache-Name trotzdem bei Änderungen an ASSETS hochzählen.
const CACHE = "checkout-trainer-v1";
const ASSETS = [
  "./", "./index.html", "./style.css", "./routes.js", "./logic.js", "./app.js", "./manifest.json",
  "./fonts/big-shoulders-display.woff2", "./fonts/hanken-grotesk.woff2",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("checkout-trainer-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});

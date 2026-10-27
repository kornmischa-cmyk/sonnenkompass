// Checkout-Trainer – Service Worker (Scope: nur dieser Ordner).
// Network-first: Online kommt immer die aktuelle Version, offline die zuletzt geladene.
// So bleibt kein Update im Cache hängen. Bei sehr langsamem Netz greift ein Zeitlimit (siehe unten). Cache-Name trotzdem bei Änderungen an ASSETS hochzählen.
const CACHE = "checkout-trainer-v2";
const ASSETS = [
  "./", "./index.html", "./style.css", "./routes.js", "./logic.js", "./app.js", "./manifest.json",
  "./fonts/big-shoulders-display.woff2", "./fonts/hanken-grotesk.woff2",
  "./icons/favicon.svg", "./icons/favicon.ico", "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"
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

// Bei schlechtem Netz (z. B. im Vereinsheim-Keller) nicht ewig warten: Nach TIMEOUT_MS gibt es die
// Cache-Version. Danach kommt SLOW_MS lang alles aus dem Cache, damit HTML, CSS und JS zueinander passen.
// Die Netzantwort aktualisiert den Cache trotzdem im Hintergrund für den nächsten Start.
const TIMEOUT_MS = 3000;
const SLOW_MS = 10000;
let slowUntil = 0;

function fromCache(req) {
  return caches.match(req, { ignoreSearch: true })
    .then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined));
}

function fromNetwork(req) {
  return fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const net = fromNetwork(req);
  e.waitUntil(net.catch(() => {}));
  e.respondWith(
    fromCache(req).then((cached) => {
      if (!cached) return net; // noch nichts im Cache: auf das Netz warten
      if (Date.now() < slowUntil) return cached;
      return new Promise((resolve) => {
        const timer = setTimeout(() => { slowUntil = Date.now() + SLOW_MS; resolve(cached); }, TIMEOUT_MS);
        net.then(
          (res) => { clearTimeout(timer); resolve(res.ok ? res : cached); },
          () => { clearTimeout(timer); resolve(cached); }
        );
      });
    })
  );
});

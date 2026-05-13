const CACHE_VERSION = "topmlm-static-v2";
const CACHE_NAME = `topmlm-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/manifest.json", 
  "/logo192.png", 
  "/logo512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => 
      cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => 
        caches.delete(k)));
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = req.url;

  if (req.method !== "GET") return;

  // NEVER intercept HTML documents
  if (req.destination === "document" || 
      req.mode === "navigate") return;

  // NEVER intercept Supabase or API
  if (
    url.includes("supabase.co") ||
    url.includes("/api/") ||
    url.includes("/auth/") ||
    url.includes("/rest/v1/") ||
    url.includes("/realtime/")
  ) {
    return;
  }

  // Only cache specific static assets
  const path = new URL(url).pathname;
  const isStaticAllowlist =
    path === "/manifest.json" ||
    path === "/logo192.png" ||
    path === "/logo512.png";

  if (!isStaticAllowlist) return;

  event.respondWith(
    caches.match(req).then((cached) => 
      cached || fetch(req))
  );
});

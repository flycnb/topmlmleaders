importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDiU9T7GEqWyi--SIoW0lXrPG4yf_CWMsk",
  authDomain: "topmlmleaders-d3d01.firebaseapp.com",
  projectId: "topmlmleaders-d3d01",
  storageBucket: "topmlmleaders-d3d01.firebasestorage.app",
  messagingSenderId: "273857679796",
  appId: "1:273857679796:web:72a05d4e2125037a7f22e1",
});

const firebaseMessaging = firebase.messaging();

firebaseMessaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(
    title || "TopMLMLeaders",
    {
      body: body || "You have a new notification",
      icon: "/logo192-notify.png",
      badge: "/logo192-notify.png",
      data: payload.data || {},
      vibrate: [200, 100, 200],
    }
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ||
    "https://topmlmleaders.com";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

const CACHE_VERSION = "topmlm-static-v2";
const CACHE_NAME = `topmlm-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/manifest.json",
  "/logo192.png",
  "/logo512.png",
  "/logo192-notify.png",
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
    path === "/logo512.png" ||
    path === "/logo192-notify.png";

  if (!isStaticAllowlist) return;

  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req))
  );
});

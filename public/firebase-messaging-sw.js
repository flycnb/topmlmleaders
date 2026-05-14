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

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "TopMLMLeaders", {
    body: body || "You have a new notification",
    icon: icon || "/logo192.png",
    badge: "/logo192.png",
    data: payload.data || {},
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

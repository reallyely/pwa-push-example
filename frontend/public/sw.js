// Hand-rolled service worker, deliberately NOT @angular/service-worker — push/
// notificationclick/pushsubscriptionchange need to stay under our own control, same
// as public/client/sw.js before this rewrite (see the Angular-frontend-overhaul
// plan's decision 1). Angular's CLI copies this file verbatim into the build root
// (frontend/public/ is the static-asset root, `angular.json`'s `assets` glob) — it is
// NOT bundled/processed by esbuild, so it can't `import` the app's own
// url-base64.ts/browser-environment.ts helpers and keeps its own inline copy of
// urlBase64ToUint8Array below, same as the old sw.js already had to.
//
// Only behavioral change from public/client/sw.js: `notificationclick` now navigates
// to the Angular route `/notification/:id` instead of the old static page's
// `/notification.html?id=`. Every other handler (install/activate/fetch/push/
// pushsubscriptionchange) is unchanged.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Passthrough fetch handler — required by Chrome's PWA installability check.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: data.data,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationId = event.notification.data && event.notification.data.notificationId;
  const targetUrl = `/notification/${notificationId}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('navigate' in client && 'focus' in client) {
          return client.navigate(targetUrl).then(() => client.focus());
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// The browser/OS push service can invalidate a subscription at any time (token
// rotation, storage pressure, etc.) and fires this event to give us a chance to
// resubscribe. This runs in the background even while the app is closed — if we
// don't handle it, the subscription silently goes stale and pushes stop arriving
// with no error visible to the user.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const oldEndpoint = event.oldSubscription ? event.oldSubscription.endpoint : null;
      const { publicKey } = await fetch('/api/vapid-public-key').then((r) => r.json());
      const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch('/api/resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldEndpoint, subscription: subscription.toJSON() }),
      });
    })()
  );
});

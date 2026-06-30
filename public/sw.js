/* Digital Twin PWA service worker.
 *
 * This intentionally does not cache app data. It exists to make supported
 * browsers treat the HTTPS deployment as installable while keeping private
 * journal/chat/check-in responses network-first.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(fetch(event.request));
});

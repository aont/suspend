const CACHE_NAME = 'suspend-page-cache-v1';
const SUSPEND_PATH = '/suspend.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(SUSPEND_PATH))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_SUSPEND_CACHE') {
    event.waitUntil(caches.delete(CACHE_NAME));
  }
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.pathname !== SUSPEND_PATH || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(SUSPEND_PATH);
      if (cached) {
        return cached;
      }

      const response = await fetch(event.request);
      cache.put(SUSPEND_PATH, response.clone());
      return response;
    })
  );
});

const CACHE_NAME = 'asubt-v10';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // JS/CSS бандлы и API — всегда сеть, без кеша
  if (
    url.hostname === 'functions.poehali.dev' ||
    url.pathname.match(/\.(js|css)$/) ||
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'moz-extension:'
  ) {
    return;
  }

  // Шрифты — кешируем
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Всё остальное — сеть, при ошибке — кеш
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
const CACHE_NAME = 'book-tracker-v2';
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  'https://cdn.tailwindcss.com?plugins=forms,container-queries'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.startsWith('http') || event.request.url.startsWith('https')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
           // Only cache successful responses
           if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
           }
           const resClone = response.clone();
           caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, resClone);
           });
           return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
      event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  }
});

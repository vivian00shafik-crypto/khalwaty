const CACHE_NAME = 'khalwati-v11';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './jesus.jpg',
  './hymn.m4a',
  './icon-192.png',
  './icon-512.png',
  './progress-girl-high.jpg',
  './progress-girl-low.jpg',
  './progress-girl-final.jpg',
  './progress-boy-high.jpg',
  './progress-boy-low.jpg',
  './progress-boy-final.jpg',
  './progress-girl-final.mp4',
  './progress-boy-final.mp4',
  './bible-svd.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request).catch(() => caches.match('./index.html')))
  );
});

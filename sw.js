const CACHE_NAME = 'khalwati-v20';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './jesus.jpg',
  './hymn.m4a',
  './sawt-rabina.mp3',
  './icon-192.png',
  './icon-512.png',
  './icon-mass.png',
  './bible-svd.js',
  './verse-bg/bg1.jpg','./verse-bg/bg2.jpg','./verse-bg/bg3.jpg','./verse-bg/bg4.jpg','./verse-bg/bg5.jpg',
  './verse-bg/bg6.jpg','./verse-bg/bg7.jpg','./verse-bg/bg8.jpg','./verse-bg/bg9.jpg','./verse-bg/bg10.jpg'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html'))));
});

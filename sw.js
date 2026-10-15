const CACHE = 'khalwati-v187-offline-persist';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './khalwaty-poster.js',
  './agpeya-texts.js',
  './bible-svd.js',
  './bible-deutero.js',
  './logo.png',
  './parchment-bg.jpg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './hymn.m4a',
  './prayer-alarm.mp3',
  './sawt-rabina.mp3',
  './bible-music.mp3',
  './bible-music-1.mp3',
  './bible-music-2.mp3',
  './bible-music-3.mp3',
  './bg-11.jpg', './bg-12.jpg', './bg-13.jpg', './bg-14.jpg',
  './bg-15.jpg', './bg-16.jpg', './bg-17.jpg', './bg-18.jpg', './bg-19.jpg'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.allSettled(ASSETS.map(function (a) {
        return c.add(a).catch(function () {});
      }));
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  try {
    var u = new URL(e.request.url);
    // لا نخزّن طلبات الذكاء الاصطناعي الخارجية
    if (u.hostname.indexOf('pollinations') >= 0 || u.hostname.indexOf('google') >= 0) {
      e.respondWith(fetch(e.request).catch(function () {
        return new Response('', { status: 503, statusText: 'offline' });
      }));
      return;
    }
  } catch (err) {}

  var req = e.request;
  if (req.method !== 'GET') return;

  // تنقّل التطبيق: كاش أولاً ثم شبكة (يعمل بدون نت)
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(function (cached) {
        return cached || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./index.html', copy); }).catch(function () {});
          return res;
        }).catch(function () {
          return caches.match('./index.html');
        });
      })
    );
    return;
  }

  // باقي الملفات: كاش أولاً، وإن لم يوجد فالشبكة مع التخزين
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        // بدون استعلام
        try {
          var path = new URL(req.url).pathname;
          return caches.match(path) || caches.match('.' + path);
        } catch (e2) {
          return caches.match(req.url.split('?')[0]);
        }
      });
    })
  );
});

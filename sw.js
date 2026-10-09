const CACHE_NAME = 'khalwati-v48-agpeya-alarms';
const CORE = [
  './', './index.html', './manifest.json', './sw.js',
  './logo.png', './jesus.jpg', './jesus-prayer-bg.jpg', './hymn.m4a', './sawt-rabina.mp3',
  './icon-192.png', './icon-512.png', './icon-mass.png',
  './bible-svd.js', './psalms.js', './agpeya-texts.js', './cross-center.png', './parchment-bg.jpg',
  './progress-boy-final.jpg', './progress-boy-high.jpg', './progress-boy-low.jpg',
  './progress-girl-final.jpg', './progress-girl-high.jpg', './progress-girl-low.jpg',
  './Cairo-400.woff2', './Cairo-700.woff2', './Amiri-400.woff2', './Amiri-700.woff2',
  './Tajawal-400.woff2', './Tajawal-700.woff2', './ArefRuqaa-400.woff', './ArefRuqaa-700.woff',
  './NotoNaskhArabic-400.woff2', './NotoNaskhArabic-700.woff2',
  './ScheherazadeNew-400.woff2', './ScheherazadeNew-700.woff2',
  './icons3d/sun.png', './icons3d/moon.png', './icons3d/chalice.png', './icons3d/music.png', './icons3d/leaf.png', './icons3d/pray.png', './icons3d/bible.png', './icons3d/church.png', './icons3d/door.png', './icons3d/candle.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res && res.ok) await cache.put(url, res);
      } catch (e) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req).catch(() => new Response('', { status: 503 })));
    return;
  }

  const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('/khalwaty');
  const isSW = url.pathname.endsWith('sw.js');

  event.respondWith((async () => {
    // HTML و sw: شبكة أولاً عشان التحديثات تظهر
    if (isHTML || isSW) {
      try {
        const res = await fetch(req, { cache: 'no-cache' });
        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(isHTML ? './index.html' : './sw.js', res.clone());
        }
        return res;
      } catch (e) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || new Response('أوفلاين', { status: 503 });
      }
    }

    // باقي الملفات: كاش أولاً
    let cached = await caches.match(req, { ignoreSearch: true });
    if (!cached) {
      const name = url.pathname.split('/').pop();
      if (name) cached = await caches.match('./' + name);
    }
    if (cached) return cached;

    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const cache = await caches.open(CACHE_NAME);
        try { await cache.put(req, res.clone()); } catch (_) {}
      }
      return res;
    } catch (e) {
      return new Response('', { status: 503 });
    }
  })());
});


/* إشعارات: صوت النظام والتطبيق مقفول + تشغيل صوت يسوع عند الفتح */
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil((async function() {
    let openUrl = './index.html';
    if (data.type === 'agpeya' && data.hour) {
      openUrl = './index.html?open=agpeya&hour=' + encodeURIComponent(data.hour);
    } else if (data.type === 'jesus' || data.play) {
      openUrl = './index.html?jesusVoice=1&play=1';
    }
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url && c.url.indexOf(self.registration.scope) !== -1) {
        await c.focus();
        if (data.type === 'agpeya' && data.hour) {
          c.postMessage({ type: 'notification-open', data: data });
        } else {
          c.postMessage({ type: 'JESUS_VOICE_FROM_NOTIFICATION', data: data, play: true });
        }
        return;
      }
    }
    await clients.openWindow(openUrl);
  })());
});

self.addEventListener('notificationclose', function() {});

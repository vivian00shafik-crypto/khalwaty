const CACHE_NAME = 'khalwati-v26-offline-audio';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './logo.png',
  './jesus.jpg',
  './hymn.m4a',
  './sawt-rabina.mp3',
  './icon-192.png',
  './icon-512.png',
  './icon-mass.png',
  './bible-svd.js',
  './psalms.js',
  './cross-center.png',
  './parchment-bg.jpg',
  './progress-boy-final.jpg',
  './progress-boy-high.jpg',
  './progress-boy-low.jpg',
  './progress-girl-final.jpg',
  './progress-girl-high.jpg',
  './progress-girl-low.jpg',
  './Cairo-400.woff2',
  './Cairo-700.woff2',
  './Amiri-400.woff2',
  './Amiri-700.woff2',
  './Tajawal-400.woff2',
  './Tajawal-700.woff2',
  './ArefRuqaa-400.woff',
  './ArefRuqaa-700.woff',
  './NotoNaskhArabic-400.woff2',
  './NotoNaskhArabic-700.woff2',
  './ScheherazadeNew-400.woff2',
  './ScheherazadeNew-700.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res && res.ok) {
          await cache.put(url, res);
        }
      } catch (e) {
        console.log('skip', url);
      }
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
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // خارج الموقع: شبكة فقط
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req).catch(() => new Response('', { status: 503 })));
    return;
  }

  event.respondWith((async () => {
    // طلبات الصوت/الفيديو غالبًا Range — رجّع من الكاش كاملًا
    const isMedia = /\.(m4a|mp3|mp4|ogg|wav)(\?|$)/i.test(url.pathname);

    // جرب الكاش أولاً (بدون query)
    let cached = await caches.match(req, { ignoreSearch: true });
    if (!cached) {
      cached = await caches.match(url.pathname.split('/').pop() ? url.pathname : './index.html');
    }
    // مسارات نسبية شائعة
    if (!cached) {
      const name = url.pathname.split('/').pop();
      if (name) cached = await caches.match('./' + name);
    }

    if (cached) {
      return cached;
    }

    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const cache = await caches.open(CACHE_NAME);
        // خزّن بدون query
        try {
          await cache.put(url.pathname.endsWith('/') ? './' : req.url.split('?')[0].replace(self.location.origin, '.').replace(/^\.\//, './') || req, res.clone());
        } catch (e) {
          try { await cache.put(req, res.clone()); } catch (_) {}
        }
      }
      return res;
    } catch (e) {
      if (isMedia) {
        return new Response('', { status: 503, statusText: 'Audio offline unavailable' });
      }
      const fallback = await caches.match('./index.html') || await caches.match('./');
      if (fallback) return fallback;
      return new Response('افتحِي التطبيق مرة وأنتِ على الإنترنت لتحميل الملفات.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});

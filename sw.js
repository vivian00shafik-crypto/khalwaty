const CACHE_NAME = 'khalwati-v25-fonts-root';
const CORE = ['./', './index.html', './manifest.json', './sw.js', './logo.png', './jesus.jpg', './hymn.m4a', './sawt-rabina.mp3', './icon-192.png', './icon-512.png', './icon-mass.png', './bible-svd.js', './psalms.js', './cross-center.png', './cross-center-clean.png', './progress-boy-final.jpg', './progress-boy-high.jpg', './progress-boy-low.jpg', './progress-girl-final.jpg', './progress-girl-high.jpg', './progress-girl-low.jpg', './verse-bg/bg1.jpg', './verse-bg/bg2.jpg', './verse-bg/bg3.jpg', './verse-bg/bg4.jpg', './verse-bg/bg5.jpg', './verse-bg/bg6.jpg', './verse-bg/bg7.jpg', './verse-bg/bg8.jpg', './verse-bg/bg9.jpg', './verse-bg/bg10.jpg', './Almarai-400.woff2', './Almarai-700.woff2', './Amiri-400.woff2', './Amiri-700.woff2', './ArefRuqaa-400.woff', './ArefRuqaa-700.woff', './Cairo-400.woff2', './Cairo-700.woff2', './ElMessiri-400.woff2', './ElMessiri-700.woff2', './IBMPlexSansArabic-400.woff2', './IBMPlexSansArabic-700.woff2', './Merriweather-400.woff2', './Merriweather-700.woff2', './Montserrat-400.woff2', './Montserrat-700.woff2', './NotoKufiArabic-400.woff2', './NotoKufiArabic-700.woff2', './NotoNaskhArabic-400.woff2', './NotoNaskhArabic-700.woff2', './OpenSans-400.woff2', './OpenSans-700.woff2', './PlayfairDisplay-400.woff2', './PlayfairDisplay-700.woff2', './ReemKufi-400.woff2', './ReemKufi-700.woff2', './Roboto-400.woff2', './Roboto-700.woff2', './ScheherazadeNew-400.woff2', './ScheherazadeNew-700.woff2', './Tajawal-400.woff2', './Tajawal-700.woff2'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // لا نفشل التثبيت لو ملف واحد فشل
    await Promise.all(CORE.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res && res.ok) await cache.put(url, res);
      } catch (e) {
        console.log('skip cache', url, e);
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

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const url = new URL(req.url);
    // cache-first للملفات المحلية
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const res = await fetch(req);
      // خزّن استجابات نفس الأصل
      if (res && res.ok && url.origin === self.location.origin) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      // أوفلاين: رجّع الصفحة الرئيسية
      const fallback = await caches.match('./index.html') || await caches.match('./');
      if (fallback) return fallback;
      return new Response('التطبيق غير متاح أوفلاين بعد. افتحيه مرة مع الإنترنت لتحميل الملفات.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});

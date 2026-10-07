const CACHE_NAME = 'khalwati-v24-offline';
const CORE = ['./', './index.html', './manifest.json', './sw.js', './logo.png', './jesus.jpg', './hymn.m4a', './sawt-rabina.mp3', './icon-192.png', './icon-512.png', './icon-mass.png', './bible-svd.js', './psalms.js', './cross-center.png', './cross-center-clean.png', './progress-boy-final.jpg', './progress-boy-high.jpg', './progress-boy-low.jpg', './progress-girl-final.jpg', './progress-girl-high.jpg', './progress-girl-low.jpg', './verse-bg/bg1.jpg', './verse-bg/bg2.jpg', './verse-bg/bg3.jpg', './verse-bg/bg4.jpg', './verse-bg/bg5.jpg', './verse-bg/bg6.jpg', './verse-bg/bg7.jpg', './verse-bg/bg8.jpg', './verse-bg/bg9.jpg', './verse-bg/bg10.jpg', './fonts/Almarai-400.woff2', './fonts/Almarai-700.woff2', './fonts/Amiri-400.woff2', './fonts/Amiri-700.woff2', './fonts/ArefRuqaa-400.woff', './fonts/ArefRuqaa-700.woff', './fonts/Cairo-400.woff2', './fonts/Cairo-700.woff2', './fonts/ElMessiri-400.woff2', './fonts/ElMessiri-700.woff2', './fonts/IBMPlexSansArabic-400.woff2', './fonts/IBMPlexSansArabic-700.woff2', './fonts/Merriweather-400.woff2', './fonts/Merriweather-700.woff2', './fonts/Montserrat-400.woff2', './fonts/Montserrat-700.woff2', './fonts/NotoKufiArabic-400.woff2', './fonts/NotoKufiArabic-700.woff2', './fonts/NotoNaskhArabic-400.woff2', './fonts/NotoNaskhArabic-700.woff2', './fonts/OpenSans-400.woff2', './fonts/OpenSans-700.woff2', './fonts/PlayfairDisplay-400.woff2', './fonts/PlayfairDisplay-700.woff2', './fonts/ReemKufi-400.woff2', './fonts/ReemKufi-700.woff2', './fonts/Roboto-400.woff2', './fonts/Roboto-700.woff2', './fonts/ScheherazadeNew-400.woff2', './fonts/ScheherazadeNew-700.woff2', './fonts/Tajawal-400.woff2', './fonts/Tajawal-700.woff2'];

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

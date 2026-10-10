const CACHE = 'khalwati-v86-agpeya-music';
const ASSETS = [
  './', './index.html', './manifest.json', './sw.js',
  './logo.png', './parchment-bg.jpg',
  './icon-192.png', './icon-512.png',
  './hymn.m4a', './prayer-alarm.mp3', './sawt-rabina.mp3',
  './bible-music.mp3', './bible-music-1.mp3', './bible-music-2.mp3', './bible-music-3.mp3'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a).catch(()=>{})))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;

  // الصوت: شبكة أولاً ثم كاش (عشان الملفات الجديدة تظهر فورًا)
  if (/\.(mp3|m4a|wav|ogg)(\?|$)/i.test(url)) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match(url.split('?')[0])))
    );
    return;
  }

  if (req.mode === 'navigate' || /\.(html|js|json)(\?|$)/.test(url) || url.includes('sw.js')) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
      return res;
    }).catch(() => cached))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = (e.notification && e.notification.data) || {};
  const playType = data.type === 'agpeya' ? 'agpeya' : (data.type === 'jesus' ? 'jesus' : (data.playAlarm ? 'agpeya' : ''));
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all && all.length) {
      const client = all[0];
      try { await client.focus(); } catch (err) {}
      try { client.postMessage({ type: 'PLAY_FROM_NOTIFICATION', data: data }); } catch (err) {}
      return;
    }
    const url = './?fromNotif=1&play=' + encodeURIComponent(playType) + '&v=77';
    await clients.openWindow(url);
  })());
});

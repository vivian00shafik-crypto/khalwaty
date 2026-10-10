const CACHE = 'khalwati-v76-tts';
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

async function rangeResponse(req) {
  const cache = await caches.open(CACHE);
  let full = await cache.match(req.url);
  if (!full) {
    try {
      const res = await fetch(req.url);
      if (!res.ok) return fetch(req);
      cache.put(req.url, res.clone());
      full = res;
    } catch (err) { return fetch(req); }
  }
  const buf = await full.arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : size - 1;
  if (end >= size) end = size - 1;
  if (start > end) start = 0;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': full.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range') && /\.(mp3|m4a)(\?|$)/i.test(req.url)) {
    e.respondWith(rangeResponse(req));
    return;
  }
  if (req.mode === 'navigate' || /\.(html|js|json)(\?|$)/.test(req.url) || req.url.includes('sw.js')) {
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

// عند الضغط على الإشعار: افتح التطبيق وشغّل الصوت المناسب
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
    const url = './?fromNotif=1&play=' + encodeURIComponent(playType) + '&v=73';
    await clients.openWindow(url);
  })());
});

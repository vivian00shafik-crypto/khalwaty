const CACHE = 'khalwati-v251';

// أساسيات صغيرة تُحفظ فور التثبيت
const CORE = [
  './', './index.html', './manifest.json', './sw.js',
  './progress-girl-low.jpg', './progress-girl-high.jpg', './progress-girl-final.jpg',
  './progress-boy-low.jpg', './progress-boy-high.jpg', './progress-boy-final.jpg',
  './kyrie-girl.jpg', './kyrie-boy.jpg',
  './silence-girl.jpg', './silence-girl-shush.jpg', './silence-boy.jpg', './silence-boy-shush.jpg',
  './khalwaty-poster.js', './agpeya-texts.js', './psalms.js',
  './logo.png', './parchment-bg.jpg',
  './icon-192.png', './icon-v76-192.png', './icon-v76-512.png', './apple-touch-icon-v76.png',
  './prayer-alarm.mp3', './sawt-rabina.mp3', './bible-music-4.mp3'
];

// ملفات أكبر تُحفظ في الخلفية بعد فتح التطبيق (بترتيب الأهمية) ليعمل التطبيق بدون إنترنت
const FONTS = [
  'Almarai', 'Amiri', 'Cairo', 'ElMessiri', 'IBMPlexSansArabic', 'NotoKufiArabic', 'NotoNaskhArabic',
  'ReemKufi', 'ScheherazadeNew', 'Tajawal', 'Merriweather', 'Montserrat', 'OpenSans', 'PlayfairDisplay', 'Roboto'
];
const LATER = [].concat(
  ['./bible-svd.js', './bible-deutero.js', './yarab-matetrokneesh.mp3', './yarab-lih-tasmah.m4a', './amal-yarab.m4a', './qoulo-yarab.m4a', './arafni-ana-fein.m4a', './tamav-irini-prayer.m4a'],
  ['./ArefRuqaa-400.woff', './ArefRuqaa-700.woff'],
  [].concat.apply([], FONTS.map((f) => ['./' + f + '-400.woff2', './' + f + '-700.woff2'])),
  ['./jesus.jpg', './jesus-prayer-bg.jpg'],
  ['11', '12', '13', '14', '15', '16', '17', '18', '19'].map((n) => './bg-' + n + '.jpg'),
  ['cottage', 'cross-worship', 'jesus-comfort', 'jesus-door', 'lantern-bible', 'pray-mountain', 'pray-sea', 'reading', 'rescue', 'worship-bible']
    .map((n) => './design-scenes/scene-' + n + '.jpg'),
  ['boy', 'girl'].map((g) => ['low', 'high', 'final'].map((l) => './progress-' + g + '-' + l + '.jpg')).reduce((a, b) => a.concat(b), []),
  ['./bible-music-1.mp3', './bible-music-2.mp3', './bible-music-3.mp3', './praises-music.mp3', './hymn.m4a'],
  ['./progress-boy-final.mp4', './progress-girl-final.mp4']
);

function stripSearch(u) {
  try { const x = new URL(u); x.search = ''; return x.toString(); } catch (e) { return u; }
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(CORE.map((a) => c.add(a).catch(() => {})))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    const clientsList = await self.clients.matchAll({ type: 'window' });
    clientsList.forEach((client) => {
      try { client.postMessage({ type: 'SW_ACTIVATED', cache: CACHE }); } catch (err) {}
    });
  })());
});

async function cacheLater() {
  const c = await caches.open(CACHE);
  let done = 0, failed = 0;
  for (const f of LATER) {
    try {
      const hit = await c.match(f, { ignoreSearch: true });
      if (hit) { done++; continue; }
      const res = await fetch(f, { cache: 'reload' });
      if (res && res.ok && res.status === 200) { await c.put(f, res); done++; }
      else if (!res || res.status !== 404) { failed++; }   // 404 = ملف غير موجود، نتجاهله
    } catch (err) { failed++; }
  }
  const all = await self.clients.matchAll({ type: 'window' });
  all.forEach((client) => {
    try { client.postMessage({ type: 'OFFLINE_READY', cache: CACHE, done: done, failed: failed, total: LATER.length }); } catch (err) {}
  });
}

self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  if (d.type === 'CACHE_ALL') e.waitUntil(cacheLater());
});

// ردّ جزئي (Range) من الكاش حتى يعمل الصوت والفيديو بدون إنترنت
async function rangeFromCache(hit, req) {
  const range = req.headers.get('range');
  if (!range) return hit;
  const buf = await hit.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? parseInt(m[1], 10) : 0;
  let end = m[2] ? parseInt(m[2], 10) : buf.byteLength - 1;
  if (isNaN(start) || start >= buf.byteLength) start = 0;
  if (isNaN(end) || end >= buf.byteLength) end = buf.byteLength - 1;
  const chunk = buf.slice(start, end + 1);
  return new Response(chunk, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': hit.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
      'Content-Length': String(chunk.byteLength),
      'Accept-Ranges': 'bytes'
    }
  });
}

async function mediaResponse(req) {
  const hit = await caches.match(stripSearch(req.url), { ignoreSearch: true });
  if (hit) return rangeFromCache(hit, req);
  try { return await fetch(req); } catch (err) { return Response.error(); }
}

// صفحات وسكربتات: الشبكة أولًا (لتصل التحديثات) مع الرجوع للكاش فورًا لو الإنترنت ضعيف أو مقطوع
function networkFirst(req, fallbackUrl) {
  const key = stripSearch(req.url);
  return new Promise((resolve) => {
    let settled = false;
    const useCache = async () => {
      const hit = (await caches.match(key, { ignoreSearch: true })) ||
                  (fallbackUrl && (await caches.match(fallbackUrl, { ignoreSearch: true })));
      return hit || null;
    };
    const timer = setTimeout(async () => {
      if (settled) return;
      const hit = await useCache();
      if (hit && !settled) { settled = true; resolve(hit); }
    }, 1800);
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (res && res.ok && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(key, copy)).catch(() => {});
      }
      if (!settled) { settled = true; resolve(res); }
    }).catch(async () => {
      clearTimeout(timer);
      if (settled) return;
      const hit = await useCache();
      settled = true;
      resolve(hit || Response.error());
    });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let u;
  try { u = new URL(req.url); } catch (err) { return; }
  if (u.origin !== self.location.origin) return;   // روابط خارجية (الأنبا تكلا، جوجل...) تمر كما هي

  if (/\.(mp3|m4a|wav|ogg|mp4|webm)$/i.test(u.pathname) || req.destination === 'audio' || req.destination === 'video') {
    e.respondWith(mediaResponse(req));
    return;
  }

  if (req.mode === 'navigate' || /\.(html|js|json)$/i.test(u.pathname)) {
    e.respondWith(networkFirst(req, req.mode === 'navigate' ? './index.html' : null));
    return;
  }

  // صور وخطوط وغيرها: الكاش أولًا
  e.respondWith((async () => {
    const hit = await caches.match(stripSearch(req.url), { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(stripSearch(req.url), copy)).catch(() => {});
      }
      return res;
    } catch (err) { return Response.error(); }
  })());
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
    const url = './?fromNotif=1&play=' + encodeURIComponent(playType) + '&v=229';
    await clients.openWindow(url);
  })());
});

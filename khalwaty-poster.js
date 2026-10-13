/* khalwaty-poster.js  (v2)
 * بوستر تحضير الدرس: رسومات بالذكاء الاصطناعي + نص عربي حاد من التطبيق
 * + تقسيم تلقائي على صفحتين/ثلاث بمقاس A4 + حفظ PDF/صور.
 *
 * KhalwatyPoster.open({ title, subtitle, items:[{heading,text}] })
 */
(function () {
  'use strict';

  var W = 1240, H = 1754, M = 56;          // A4 عند 150dpi تقريبًا
  var INNER = 28, GAP = 26;
  var TOP_FIRST = 372, TOP_NEXT = 180, BOTTOM = H - 344;
  var FONT = 'Cairo, "Noto Naskh Arabic", Tahoma, sans-serif';
  var EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"';

  var THEMES = [
    { id: 'spring', name: 'ربيعي',  word: 'light blue, soft green and peach',   hues: [200, 125, 35, 270, 340], bg: [48, 40, 96] },
    { id: 'gold',   name: 'ذهبي',   word: 'warm gold, amber and cream',         hues: [42, 28, 50, 16, 36],     bg: [42, 55, 95] },
    { id: 'sky',    name: 'سماوي',  word: 'sky blue and turquoise',             hues: [210, 192, 226, 175, 240], bg: [205, 60, 96] },
    { id: 'rose',   name: 'وردي',   word: 'soft pink and rose',                 hues: [335, 352, 305, 12, 322], bg: [340, 55, 96] },
    { id: 'green',  name: 'أخضر',   word: 'fresh green and olive',              hues: [130, 100, 160, 80, 145], bg: [110, 40, 95] },
    { id: 'violet', name: 'بنفسجي', word: 'soft lavender and lilac purple',     hues: [270, 250, 290, 230, 310], bg: [265, 50, 96] }
  ];
  var EMOJI_SETS = [
    { id: 'faith',  name: 'إيمان', list: ['✝️', '📖', '🕊️', '🌿'] },
    { id: 'prayer', name: 'صلاة',  list: ['🙏', '⛪', '🕯️', '✨'] },
    { id: 'nature', name: 'طبيعة', list: ['🌸', '🌿', '🦋', '☀️'] },
    { id: 'glory',  name: 'مجد',   list: ['👑', '⭐', '🔥', '🛡️'] },
    { id: 'world',  name: 'عالم',  list: ['🌍', '🌊', '⛰️', '🌅'] },
    { id: 'study',  name: 'دراسة', list: ['📜', '🔍', '💡', '✏️'] }
  ];

  var ART_STYLES = [
    { id: 'watercolor', name: 'مرسومة مائية', prompt: 'soft pastel watercolor illustration, hand-painted look, gentle brush strokes' },
    { id: 'sketch', name: 'رسم خطّي', prompt: 'clean ink line art illustration, soft paper texture, minimal shading, storybook drawing' },
    { id: 'print', name: 'طباعة كلاسيكية', prompt: 'vintage book engraving print style, classic lithograph, warm paper tones' },
    { id: 'icon', name: 'أيقوني', prompt: 'inspired by soft Christian icon style, gold accents, reverent composition, no text' },
    { id: 'pastel', name: 'باستيل مطبوع', prompt: 'soft pastel print poster, matte colors, clean educational design' },
    { id: 'realistic', name: 'شبه واقعي', prompt: 'soft realistic illustration, natural light, cinematic calm, no text' }
  ];

var EMOJI_WORDS = {
    '✝': 'wooden cross', '📖': 'open book', '🕊': 'white dove', '🌿': 'olive branch', '🙏': 'praying hands',
    '⛪': 'small church', '🕯': 'candle', '✨': 'gentle sparkles', '🌸': 'blossoms', '🦋': 'butterfly',
    '☀': 'sun rays', '👑': 'golden crown', '⭐': 'stars', '🔥': 'flame', '🛡': 'shield',
    '🌍': 'globe', '🌊': 'waves', '⛰': 'mountains', '🌅': 'sunrise', '📜': 'scroll',
    '🔍': 'magnifying glass', '💡': 'light bulb', '✏': 'pencil'
  };

  /* ---------- أدوات ---------- */
  function hsl(h, s, l, a) { return a == null ? 'hsl(' + h + ',' + s + '%,' + l + '%)' : 'hsla(' + h + ',' + s + '%,' + l + '%,' + a + ')'; }
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function seeded(seed) { var s = seed; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function ar(n) { return String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); }
  function wrap(ctx, text, maxW) {
    var out = [];
    String(text || '').split(/\n/).forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); return; }
      var line = '';
      words.forEach(function (w) {
        var t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
      });
      if (line) out.push(line);
    });
    return out;
  }
  function elementsFor(emojis) {
    return emojis.map(function (e) { return EMOJI_WORDS[e.replace(/\uFE0F/g, '')]; }).filter(Boolean).slice(0, 3).join(', ');
  }

  /* ---------- تقسيم المحتوى على الصفحات ---------- */
  function dims(s) {
    var BODY = Math.round(34 * s);
    return { BODY: BODY, LH: Math.round(BODY * 1.75), HEAD_F: Math.round(26 + 10 * s), HEAD_H: Math.round(64 + 22 * s) };
  }
  function topOf(pi) { return pi === 0 ? TOP_FIRST : TOP_NEXT; }

  function paginate(items, s, m) {
    var d = dims(s), innerW = W - 2 * M - 2 * INNER, PADB = 24;
    var pages = [[]], pi = 0, y = topOf(0);
    m.direction = 'rtl';
    m.font = '400 ' + d.BODY + 'px ' + FONT;
    function next() { pages.push([]); pi++; y = topOf(pi); }
    items.forEach(function (it, i) {
      var lines = wrap(m, it.text, innerW), idx = 0;
      if (!lines.length) lines = [''];
      var n = lines.length, over = d.HEAD_H + 20 + PADB;
      function place(k) {
        pages[pi].push({ it: it, i: i, lines: lines.slice(idx, idx + k), cont: idx > 0, y: y, h: over + k * d.LH });
      }
      while (idx < n) {
        var cap = Math.floor((BOTTOM - y - over) / d.LH), rem = n - idx;
        if (cap >= rem) { place(rem); y += over + rem * d.LH + GAP; idx = n; }
        else {
          var take = Math.min(cap, rem - 2), fresh = (y === topOf(pi));
          if (take >= 3 || (fresh && take >= 1)) { place(take); idx += take; next(); }
          else if (fresh) { place(1); idx += 1; next(); }
          else next();
        }
      }
    });
    if (pages.length > 1 && !pages[pages.length - 1].length) pages.pop();
    return pages;
  }
  function layout(items, N, m) {
    var last = null;
    for (var s = 1.5; s >= 0.5; s -= 0.05) {
      var p = paginate(items, s, m);
      last = { pages: p, s: s, fits: p.length <= N };
      if (last.fits) return last;
    }
    return last;
  }

  /* ---------- رسم صفحة ---------- */
  function drawScene(ctx, img, x, y, w, h, theme, emojis) {
    // صورة واضحة وكاملة — بدون تدرج يخفي نصفها
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.14)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#ffffff';
    rrect(ctx, x, y, w, h, 28);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    rrect(ctx, x, y, w, h, 28);
    ctx.clip();
    if (img && img.width) {
      // cover كامل للإطار
      var sc = Math.max(w / img.width, h / img.height);
      var nw = img.width * sc, nh = img.height * sc;
      ctx.drawImage(img, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh);
    } else {
      ctx.fillStyle = hsl(theme.hues[1], 55, 92);
      ctx.fillRect(x, y, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '90px ' + EMOJI_FONT;
      var list = (emojis && emojis.length) ? emojis : ['✝', '📖', '🕊'];
      var step = Math.min(160, w / (list.length + 1));
      list.slice(0, 4).forEach(function (e, k) {
        ctx.fillText(e, x + w / 2 + (k - (Math.min(list.length, 4) - 1) / 2) * step, y + h / 2);
      });
    }
    ctx.restore();
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = hsl(theme.hues[0], 45, 72);
    rrect(ctx, x, y, w, h, 28);
    ctx.stroke();
    ctx.restore();
  }

  function drawPage(cv, pg, pi, total, data, opt, art, d) {
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    ctx.direction = 'rtl'; ctx.textBaseline = 'middle';
    var theme = opt.theme, emojis = opt.emojis, hb = theme.hues[0];

    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, hsl(theme.bg[0], theme.bg[1], theme.bg[2] + 2));
    g.addColorStop(1, hsl(theme.hues[1], 45, 94));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    var hasPageArt = art && ((art.pages && art.pages[pi]) || art.hero || art.a || art.b);
    var rnd = seeded(11 + emojis.length * 7 + pi * 31);
    ctx.textAlign = 'center';
    // قلل الرموز المتكررة جدًا — خاصة عند وجود صور مولّدة
    var decorN = hasPageArt ? 3 : 8;
    for (var n = 0; n < decorN; n++) {
      ctx.save(); ctx.globalAlpha = hasPageArt ? 0.05 : 0.08;
      ctx.translate(rnd() * W, rnd() * H); ctx.rotate((rnd() - 0.5) * 0.9);
      ctx.font = (40 + rnd() * 40) + 'px ' + EMOJI_FONT;
      ctx.fillText(emojis[Math.floor(rnd() * emojis.length)], 0, 0);
      ctx.restore();
    }

    var title = data.title || 'تحضير الدرس';
    if (pi === 0) {
      /* صورة الغلاف المرسومة بالذكاء الاصطناعي */
      var hx = M, hy = 40, hs = 300;
      if (art && art.hero) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.12)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#fff';
        rrect(ctx, hx, hy, hs, hs, 28);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        rrect(ctx, hx, hy, hs, hs, 28);
        ctx.clip();
        var sc = Math.max(hs / art.hero.width, hs / art.hero.height);
        var nw = art.hero.width * sc, nh = art.hero.height * sc;
        ctx.drawImage(art.hero, hx + (hs - nw) / 2, hy + (hs - nh) / 2, nw, nh);
        ctx.restore();
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = hsl(hb, 45, 70);
        rrect(ctx, hx, hy, hs, hs, 28);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = hsl(hb, 65, 88);
        ctx.beginPath(); ctx.arc(hx + hs / 2, hy + hs / 2, hs / 2 - 10, 0, Math.PI * 2); ctx.fill();
        ctx.textAlign = 'center'; ctx.font = '150px ' + EMOJI_FONT;
        ctx.fillText(emojis[0], hx + hs / 2, hy + hs / 2 + 6);
      }
      /* العنوان */
      var rx = W - M, lw = rx - (hx + hs + 24), tf = 74, lines;
      do {
        ctx.font = '700 ' + tf + 'px ' + FONT;
        lines = wrap(ctx, title, lw - 70); tf -= 4;
      } while (lines.length > 2 && tf > 38);
      tf += 4;
      var lh = tf * 1.35, ph = lines.length * lh + 36, pcy = 40 + hs / 2 - (data.subtitle ? 30 : 0);
      ctx.fillStyle = hsl(hb, 70, 84); rrect(ctx, hx + hs + 24, pcy - ph / 2, lw, ph, 44); ctx.fill();
      ctx.fillStyle = hsl(hb, 45, 22); ctx.textAlign = 'center';
      lines.forEach(function (ln, k) { ctx.fillText(ln, hx + hs + 24 + lw / 2, pcy - ph / 2 + 18 + lh * (k + 0.5)); });
      if (data.subtitle) {
        ctx.font = '700 38px ' + FONT;
        var sw = Math.min(lw, ctx.measureText(data.subtitle).width + 70);
        ctx.fillStyle = hsl(theme.hues[2], 75, 88);
        rrect(ctx, hx + hs + 24 + (lw - sw) / 2, pcy + ph / 2 + 18, sw, 62, 31); ctx.fill();
        ctx.fillStyle = hsl(theme.hues[2], 50, 26);
        ctx.fillText(data.subtitle, hx + hs + 24 + lw / 2, pcy + ph / 2 + 49);
      }
    } else {
      var tf2 = 48;
      ctx.font = '700 ' + tf2 + 'px ' + FONT;
      while (ctx.measureText(title).width > W - 2 * M - 300 && tf2 > 28) { tf2 -= 2; ctx.font = '700 ' + tf2 + 'px ' + FONT; }
      var tw = ctx.measureText(title).width + 80;
      ctx.fillStyle = hsl(hb, 70, 84); rrect(ctx, (W - tw) / 2, 56, tw, 88, 44); ctx.fill();
      ctx.fillStyle = hsl(hb, 45, 22); ctx.textAlign = 'center';
      ctx.fillText(title, W / 2, 101);
      if (!(art && art.pages && art.pages[pi])) {
        ctx.font = '70px ' + EMOJI_FONT;
        ctx.fillText(emojis[0], M + 50, 100);
        ctx.fillText(emojis[Math.min(1, emojis.length - 1)], W - M - 50, 100);
      }
    }

    /* البطاقات */
    var x = M, w = W - 2 * M;
    pg.forEach(function (f) {
      var hue = theme.hues[f.i % theme.hues.length], y = f.y, h = f.h;
      ctx.save();
      ctx.shadowColor = hsl(hue, 40, 40, 0.18); ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
      ctx.fillStyle = hsl(hue, 80, 97, 0.96); rrect(ctx, x, y, w, h, 30); ctx.fill();
      ctx.restore();
      ctx.lineWidth = 2.5; ctx.strokeStyle = hsl(hue, 60, 80); rrect(ctx, x, y, w, h, 30); ctx.stroke();

      ctx.fillStyle = hsl(hue, 70, 86); rrect(ctx, x + 10, y + 10, w - 20, d.HEAD_H, 24); ctx.fill();
      var r = d.HEAD_H / 2 - 6, cx = W - M - 10 - r - 10, cy = y + 10 + d.HEAD_H / 2;
      ctx.fillStyle = hsl(hue, 55, 42); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 ' + (d.HEAD_F - 2) + 'px ' + FONT;
      ctx.fillText(ar(f.i + 1), cx, cy + 2);
      ctx.font = (d.HEAD_H - 22) + 'px ' + EMOJI_FONT;
      ctx.fillText(emojis[f.i % emojis.length], x + 10 + d.HEAD_H / 2 + 8, cy + 2);

      var hs = (f.it.heading || '') + (f.cont ? ' (تابع)' : ''), hf = d.HEAD_F;
      ctx.font = '700 ' + hf + 'px ' + FONT;
      var avail = w - 20 - (r * 2 + 36) - (d.HEAD_H + 20);
      while (ctx.measureText(hs).width > avail && hf > 18) { hf -= 2; ctx.font = '700 ' + hf + 'px ' + FONT; }
      ctx.textAlign = 'right'; ctx.fillStyle = hsl(hue, 50, 22);
      ctx.fillText(hs, cx - r - 16, cy + 2);

      ctx.fillStyle = hsl(hue, 25, 16); ctx.font = '400 ' + d.BODY + 'px ' + FONT;
      var ty = y + 10 + d.HEAD_H + 20 + d.LH / 2;
      f.lines.forEach(function (ln) { ctx.fillText(ln, W - M - INNER, ty); ty += d.LH; });
    });

    /* المشهد السفلي — صورة خاصة بكل صفحة عند توفرها */
    var sceneImg = null;
    if (art) {
      if (art.pages && art.pages[pi]) sceneImg = art.pages[pi];
      else if (art.pages && art.pages.length) sceneImg = art.pages[pi % art.pages.length];
      else sceneImg = (pi % 2 === 0 ? art.a : art.b);
    }
    drawScene(ctx, sceneImg, M, H - 420, W - 2 * M, 300, theme, emojis);

    /* رقم الصفحة */
    var label = ar(pi + 1) + ' من ' + ar(total);
    ctx.textAlign = 'center'; ctx.font = '700 30px ' + FONT;
    var lw2 = ctx.measureText(label).width + 80;
    ctx.fillStyle = hsl(hb, 60, 92); rrect(ctx, (W - lw2) / 2, H - 96, lw2, 56, 28); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = hsl(hb, 50, 75); rrect(ctx, (W - lw2) / 2, H - 96, lw2, 56, 28); ctx.stroke();
    ctx.fillStyle = hsl(hb, 45, 28); ctx.fillText(label, W / 2, H - 67);
    ctx.font = '40px ' + EMOJI_FONT;
    ctx.fillText(emojis[2 % emojis.length], W / 2 - lw2 / 2 - 44, H - 66);
    ctx.fillText(emojis[3 % emojis.length], W / 2 + lw2 / 2 + 44, H - 66);
  }

  /* ---------- PDF بسيط (A4) من صور JPEG ---------- */
  function dataUrlToBytes(u) {
    var b = atob(u.split(',')[1]), a = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return a;
  }
  function makePdf(canvases) {
    var enc = new TextEncoder(), chunks = [], offs = [], len = 0;
    function push(x) { var b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; }
    function begin(n) { offs[n] = len; push(n + ' 0 obj\n'); }
    var N = canvases.length, total = 2 + N * 3;
    push('%PDF-1.4\n');
    begin(1); push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    var kids = []; for (var i = 0; i < N; i++) kids.push((3 + i * 3) + ' 0 R');
    begin(2); push('<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + N + ' >>\nendobj\n');
    canvases.forEach(function (cv, i) {
      var po = 3 + i * 3, co = po + 1, io = po + 2;
      var jpg = dataUrlToBytes(cv.toDataURL('image/jpeg', 0.92));
      begin(po);
      push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ' + io + ' 0 R >> >> /Contents ' + co + ' 0 R >>\nendobj\n');
      var content = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
      begin(co); push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
      begin(io);
      push('<< /Type /XObject /Subtype /Image /Width ' + cv.width + ' /Height ' + cv.height +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n');
      push(jpg); push('\nendstream\nendobj\n');
    });
    var xref = len;
    var x = 'xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n';
    for (var k = 1; k <= total; k++) x += ('0000000000' + offs[k]).slice(-10) + ' 00000 n \n';
    push(x + 'trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(chunks, { type: 'application/pdf' });
  }

  /* ---------- الرسم بالذكاء الاصطناعي (Pollinations بدون مفتاح، زي بقية التطبيق) ---------- */
  function loadImg(url, ms) {
    // 1) fetch blob (canvas غير ملوّث)  2) Image+crossOrigin  3) null
    return new Promise(function (res) {
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; res(null); } }, ms || 50000);
      function finish(im) { if (!done) { done = true; clearTimeout(timer); res(im); } }

      function viaImage() {
        try {
          var im = new Image();
          im.crossOrigin = 'anonymous';
          im.onload = function () {
            if (im.width > 0) finish(im); else finish(null);
          };
          im.onerror = function () { finish(null); };
          im.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
        } catch (e) { finish(null); }
      }

      if (typeof fetch === 'function') {
        var ctrl = null;
        try { ctrl = new AbortController(); } catch (e) {}
        var opts = { mode: 'cors', credentials: 'omit', cache: 'no-store' };
        if (ctrl) opts.signal = ctrl.signal;
        var ft = setTimeout(function () { try { if (ctrl) ctrl.abort(); } catch (e) {} }, (ms || 50000) - 500);
        fetch(url, opts).then(function (r) {
          clearTimeout(ft);
          if (!r || !r.ok) { viaImage(); return; }
          return r.blob();
        }).then(function (blob) {
          if (!blob || done) return;
          if (blob.size < 800) { viaImage(); return; }
          var obj = URL.createObjectURL(blob);
          var im = new Image();
          im.onload = function () { finish(im); };
          im.onerror = function () { try { URL.revokeObjectURL(obj); } catch (e) {} viaImage(); };
          im.src = obj;
        }).catch(function () {
          clearTimeout(ft);
          viaImage();
        });
      } else {
        viaImage();
      }
    });
  }

  function makeLocalArt(w, h, theme, emojis, label, seed) {
    // رسم محلي جميل إن فشل الذكاء الاصطناعي — حتى لا تفشل كل الصفحات
    w = w || 896; h = h || 512;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var h0 = (theme && theme.hues && theme.hues[0]) || 200;
    var h1 = (theme && theme.hues && theme.hues[1]) || 160;
    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'hsl(' + h0 + ',55%,88%)');
    g.addColorStop(0.55, 'hsl(' + h1 + ',45%,92%)');
    g.addColorStop(1, 'hsl(' + ((h0 + 40) % 360) + ',50%,82%)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // دوائر زخرفية
    for (var i = 0; i < 6; i++) {
      var x = (seed * (i + 3) * 47) % w;
      var y = (seed * (i + 5) * 31) % h;
      var r = 40 + (seed + i * 13) % 90;
      ctx.beginPath();
      ctx.fillStyle = 'hsla(' + ((h0 + i * 25) % 360) + ',50%,70%,' + (0.12 + (i % 3) * 0.04) + ')';
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // شريط سفلي
    var lg = ctx.createLinearGradient(0, h * 0.55, 0, h);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(1, 'rgba(255,255,255,0.35)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, w, h);
    // إيموجي كبيرة
    var list = (emojis && emojis.length) ? emojis : ['✝', '📖', '🕊', '🌿'];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = Math.floor(Math.min(w, h) * 0.22) + 'px serif';
    var n = Math.min(4, list.length);
    for (var k = 0; k < n; k++) {
      var px = w * (0.2 + k * 0.2);
      var py = h * (0.38 + (k % 2) * 0.08);
      ctx.globalAlpha = 0.92;
      ctx.fillText(list[k], px, py);
    }
    ctx.globalAlpha = 1;
    // صليب بسيط في الوسط
    ctx.strokeStyle = 'hsla(' + h0 + ',40%,40%,0.35)';
    ctx.lineWidth = Math.max(6, w * 0.012);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.22);
    ctx.lineTo(w * 0.5, h * 0.72);
    ctx.moveTo(w * 0.38, h * 0.38);
    ctx.lineTo(w * 0.62, h * 0.38);
    ctx.stroke();
    // إطار
    ctx.strokeStyle = 'hsla(' + h0 + ',35%,55%,0.5)';
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    var im = new Image();
    // نستخدم toDataURL — مسموح لأن الرسم محلي
    im.src = c.toDataURL('image/jpeg', 0.92);
    return new Promise(function (resolve) {
      if (im.complete && im.width) resolve(im);
      else {
        im.onload = function () { resolve(im); };
        im.onerror = function () { resolve(null); };
        setTimeout(function () { resolve(im.width ? im : null); }, 2000);
      }
    });
  }


  function artUrl(prompt, w, h, seed, variant) {
    var p = String(prompt || 'peaceful cross sunrise').replace(/\s+/g, ' ').trim().slice(0, 120);
    var enc = encodeURIComponent(p);
    w = w || 512; h = h || 512; seed = (seed || 1) | 0;
    variant = variant || 0;
    // مسارات متعددة — أصغر حجم = نجاح أعلى على الموبايل
    if (variant === 0) {
      return 'https://image.pollinations.ai/prompt/' + enc + '?width=' + w + '&height=' + h + '&nologo=true&seed=' + seed;
    }
    if (variant === 1) {
      return 'https://image.pollinations.ai/prompt/' + enc + '?width=' + w + '&height=' + h + '&nologo=true&model=flux&seed=' + (seed + 17);
    }
    // مسار بديل
    return 'https://image.pollinations.ai/prompt/' + enc + '?width=' + w + '&height=' + h + '&seed=' + (seed + 33) + '&nologo=true';
  }
  function artUrlsFor(prompt, w, h, seed) {
    return [0, 1, 2].map(function (v) { return artUrl(prompt, w, h, seed + v * 11, v); });
  }
  function textToVisualHint(arText) {
    var n = String(arText || '');
    var bits = [];
    if (/كتاب|مقدس|إنجيل|آية|مزمور/.test(n)) bits.push('open bible');
    if (/صليب|مسيح|يسوع|فداء|خلاص/.test(n)) bits.push('wooden cross with soft light');
    if (/صلاه|صلّ|تضرع|اذكر/.test(n)) bits.push('person praying peacefully');
    if (/نور|اضاء|اشرق/.test(n)) bits.push('golden sunrise light rays');
    if (/سلام|لا تخف|اطمئ/.test(n)) bits.push('calm lake at dawn');
    if (/محب|احب|رحمة|غفر/.test(n)) bits.push('warm embracing light and olive branches');
    if (/كنيسة|قداس|هيكل/.test(n)) bits.push('small church among trees');
    if (/خلق|سماوات|أرض/.test(n)) bits.push('creation sky and earth soft panorama');
    if (/ماء|نهر|بحر|عماد/.test(n)) bits.push('clear living water stream');
    if (/خبز|شبع|مائدة/.test(n)) bits.push('simple bread on wooden table');
    if (/فرح|ابتهج|ترنيم/.test(n)) bits.push('joyful morning meadow');
    if (/توب|خطي|رجوع/.test(n)) bits.push('path returning toward light');
    if (/راع|خروف|قطيع/.test(n)) bits.push('shepherd with sheep on green hill');
    if (/حرب|عدو|نصرة|صمود/.test(n)) bits.push('banner of hope on a hill after storm');
    if (/حق|صدق|أمانة/.test(n)) bits.push('straight path of light through trees');
    if (/روح|قدس/.test(n)) bits.push('gentle dove and soft flame of light');
    if (!bits.length) bits.push('peaceful Christian Sunday school scene');
    return bits.slice(0, 3).join(', ');
  }
  function artSteps(theme, emojis, seed, extra, pageCount, contentItems, artStyle) {
    artStyle = artStyle || ART_STYLES[0];
    var styleTag = (artStyle && artStyle.id) ? artStyle.id : 'watercolor';
    var col = theme.word;
    pageCount = Math.max(1, Math.min(10, pageCount || 1));
    contentItems = contentItems || [];
    var steps = [];
    var titleHint = textToVisualHint(String((contentItems[0] && (contentItems[0].heading || contentItems[0].text)) || ''));
    var heroPrompt = ('lesson cover, ' + titleHint + ', ' + col + ', ' + styleTag + ', no text').slice(0, 140);
    steps.push({
      key: 'hero',
      prompt: heroPrompt,
      url: artUrl(heroPrompt, 512, 512, seed, 0),
      urls: artUrlsFor(heroPrompt, 512, 512, seed)
    });
    for (var i = 0; i < pageCount; i++) {
      var it = contentItems[i] || contentItems[i % Math.max(contentItems.length, 1)] || {};
      var pageText = String(it.heading || '') + ' ' + String(it.text || '');
      var visual = textToVisualHint(pageText);
      var prompt = (visual + ', ' + col + ', ' + styleTag + ', wide scene, no text').slice(0, 140);
      steps.push({
        key: 'p' + i,
        pageIndex: i,
        prompt: prompt,
        url: artUrl(prompt, 640, 384, seed + 3 + i, 0),
        urls: artUrlsFor(prompt, 640, 384, seed + 3 + i)
      });
    }
    return steps;
  }

  /* ---------- الواجهة ---------- */
/* ---------- الواجهة ---------- */
  var cssDone = false;
  function injectCSS() {
    if (cssDone) return; cssDone = true;
    var s = document.createElement('style');
    s.textContent =
      '.kp-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;direction:rtl;font-family:' + FONT + '}' +
      '.kp-box{background:#fffdf8;width:100%;max-width:600px;max-height:95vh;overflow:auto;border-radius:22px 22px 0 0;padding:14px 14px 22px;box-sizing:border-box}' +
      '.kp-prev{background:#e9e6df;border-radius:14px;padding:8px;max-height:48vh;overflow:auto}' +
      '.kp-prev canvas{width:100%;height:auto;border-radius:6px;display:block;margin-bottom:10px;box-shadow:0 3px 10px rgba(0,0,0,.18);background:#fff}' +
      '.kp-note{font-size:13px;color:#a65d4a;margin:8px 2px 0}' +
      '.kp-stat{font-size:13px;color:#5a7d4a;margin:8px 2px 0;font-weight:700}' +
      '.kp-lbl{font-weight:700;font-size:14px;margin:14px 2px 6px;color:#444}' +
      '.kp-row{display:flex;flex-wrap:wrap;gap:8px}' +
      '.kp-chip{border:2px solid #ddd;background:#fff;border-radius:999px;padding:7px 12px;font:600 14px ' + FONT + ';cursor:pointer;display:flex;align-items:center;gap:6px}' +
      '.kp-chip.on{border-color:#4f8a3c;background:#eef7e8}' +
      '.kp-dot{width:16px;height:16px;border-radius:50%;display:inline-block}' +
      '.kp-in{width:100%;box-sizing:border-box;border:2px solid #ddd;border-radius:12px;padding:9px 12px;font:600 15px ' + FONT + ';direction:rtl}' +
      '.kp-act{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}' +
      '.kp-btn{flex:1 1 40%;border:0;border-radius:14px;padding:13px;font:800 15px ' + FONT + ';cursor:pointer;background:#4f8a3c;color:#fff}' +
      '.kp-btn.ai{flex-basis:100%;background:#7a5a9a}' +
      '.kp-btn.alt{background:#e9e4d6;color:#333}';
    document.head.appendChild(s);
  }

  function open(data) {
    injectCSS();
    data = data || { items: [] };
    var items = (data.items || []).filter(function (it) { return it && String(it.text || '').trim(); });
    var state = { theme: THEMES[0], set: EMOJI_SETS[0], artStyle: ART_STYLES[0], custom: '', pages: Math.min(10, Math.max(1, data.pages || 3)), title: data.title || 'تحضير الدرس', art: null, genId: 0, canvases: [] };

    var ov = document.createElement('div'); ov.className = 'kp-ov';
    var box = document.createElement('div'); box.className = 'kp-box'; ov.appendChild(box);
    var prev = document.createElement('div'); prev.className = 'kp-prev'; box.appendChild(prev);
    var note = document.createElement('div'); note.className = 'kp-note'; box.appendChild(note);
    var stat = document.createElement('div'); stat.className = 'kp-stat'; box.appendChild(stat);

    function lbl(t) { var d = document.createElement('div'); d.className = 'kp-lbl'; d.textContent = t; box.appendChild(d); }
    function chip(parent, html, on, fn) {
      var b = document.createElement('button'); b.type = 'button';
      b.className = 'kp-chip' + (on ? ' on' : ''); b.innerHTML = html; b.onclick = fn; parent.appendChild(b); return b;
    }
    function emojisNow() {
      var raw = String(state.custom || '').trim();
      var found = [];
      try {
        var m = raw.match(/\p{Extended_Pictographic}/gu);
        if (m) found = m.slice(0, 6);
      } catch (e) {
        // متصفحات قديمة بدون Unicode property
        Array.from(raw.replace(/\s+/g, '')).forEach(function (ch) {
          if (found.length < 6 && ch && ch.charCodeAt(0) > 255) found.push(ch);
        });
      }
      var l = found.length ? found.slice() : state.set.list.slice();
      while (l.length < 4) l = l.concat(state.set.list);
      return l.slice(0, 6);
    }
    function customPromptExtra() {
      var raw = String(state.custom || '').trim();
      if (!raw) return '';
      // أضف النص/الرموز التي كتبها المستخدم لطلب الذكاء الاصطناعي
      return ', also include visual motifs inspired by: ' + raw.slice(0, 120);
    }

    var timer;
    function redraw() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var fonts = document.fonts && document.fonts.load
          ? Promise.all([document.fonts.load('400 34px Cairo'), document.fonts.load('700 34px Cairo')]).catch(function () {})
          : Promise.resolve();
        fonts.then(function () {
          if (!ov.isConnected) return;
          var m = document.createElement('canvas').getContext('2d');
          var lay = layout(items, state.pages, m), d = dims(lay.s);
          prev.innerHTML = ''; state.canvases = [];
          var opt = { theme: state.theme, emojis: emojisNow() };
          var d2 = { title: state.title, subtitle: data.subtitle };
          lay.pages.forEach(function (pg, i) {
            var cv = document.createElement('canvas');
            drawPage(cv, pg, i, lay.pages.length, d2, opt, state.art, d);
            prev.appendChild(cv); state.canvases.push(cv);
          });
          note.textContent = !items.length ? 'لا توجد نصوص في صفحات التحضير.'
            : !lay.fits ? 'النص أطول من ' + ar(state.pages) + ' صفحات حتى بأصغر خط — اختاري عدد صفحات أكبر أو اختصري النص.'
            : lay.pages.length < state.pages ? 'النص يكفي ' + ar(lay.pages.length) + ' صفحة فقط، فتم ضبط البوستر عليها.' : '';
        });
      }, 150);
    }

    function genArt() {
      var id = ++state.genId, seed = Math.floor(Math.random() * 90000) + 1;
      state.art = { hero: null, pages: [] };
      var steps = artSteps(state.theme, emojisNow(), seed, customPromptExtra(), state.pages, items, state.artStyle);
      var total = steps.length, aiOk = 0, localOk = 0;
      if (!total) { stat.textContent = 'تعذر تجهيز طلب الرسم'; return; }
      stat.textContent = '🤖 جاري توليد الصور بالذكاء الاصطناعي… ١/' + ar(total);
      redraw();
      function saveStep(step, im) {
        if (step.key === 'hero') state.art.hero = im;
        else if (typeof step.pageIndex === 'number') state.art.pages[step.pageIndex] = im;
      }
      function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
      function loadAI(step) {
        var w = step.key === 'hero' ? 512 : 640;
        var h = step.key === 'hero' ? 512 : 384;
        var list = (step.urls && step.urls.length) ? step.urls.slice() : [];
        var base = step.prompt || 'christian cross soft light';
        list = list.concat([
          artUrl(base, w, h, seed + 3 + step.pageIndex, 0),
          artUrl(base, w, h, seed + 50 + step.pageIndex, 1),
          artUrl(base, w, h, seed + 90 + step.pageIndex, 2)
        ]);
        // إزالة تكرار
        var seen = {}, uniq = [];
        list.forEach(function (u) { if (u && !seen[u]) { seen[u] = 1; uniq.push(u); } });
        var i = 0;
        function tryNext() {
          if (i >= uniq.length) return Promise.resolve(null);
          var u = uniq[i++];
          return loadImg(u, 45000).then(function (im) {
            if (im && im.width > 8) return im;
            return wait(1500).then(tryNext);
          });
        }
        return tryNext();
      }
      (function next(k) {
        if (id !== state.genId || !ov.isConnected) return;
        if (k >= steps.length) {
          if (aiOk === total) stat.textContent = '✅ تم توليد كل الصور بالذكاء الاصطناعي (' + ar(total) + ')';
          else if (aiOk > 0) stat.textContent = '✅ ذكاء اصطناعي: ' + ar(aiOk) + ' — محلي: ' + ar(localOk) + ' (أعيدي «ارسمي» للباقي مع نت أقوى)';
          else stat.textContent = '✅ صور محلية جاهزة — الشبكة منعت الذكاء الاصطناعي، أعيدي المحاولة لاحقًا';
          redraw();
          return;
        }
        var step = steps[k];
        stat.textContent = '🤖 ذكاء اصطناعي… ' + ar(k + 1) + '/' + ar(total) + ' (انتظري قليلاً بين كل صورة)';
        // فاصل أطول بين الطلبات حتى لا يحظر السيرفر باقي الصور
        var gap = k === 0 ? 0 : 3500;
        wait(gap).then(function () { return loadAI(step); }).then(function (im) {
          if (id !== state.genId || !ov.isConnected) return;
          if (im) {
            saveStep(step, im);
            aiOk++;
            redraw();
            next(k + 1);
          } else {
            var w = step.key === 'hero' ? 512 : 640;
            var h = step.key === 'hero' ? 512 : 384;
            return makeLocalArt(w, h, state.theme, emojisNow(), step.key, seed + k).then(function (loc) {
              if (id !== state.genId || !ov.isConnected) return;
              saveStep(step, loc);
              if (loc) localOk++;
              redraw();
              next(k + 1);
            });
          }
        });
      })(0);
    }

    lbl('عنوان البوستر');
    var ti = document.createElement('input'); ti.className = 'kp-in'; ti.value = state.title;
    ti.oninput = function () { state.title = ti.value; redraw(); }; box.appendChild(ti);

    lbl('عدد الصفحات (A4) — حتى ١٠');
    var rowP = document.createElement('div'); rowP.className = 'kp-row'; box.appendChild(rowP);
    function pageLabel(n) {
      if (n === 1) return 'صفحة';
      if (n === 2) return 'صفحتان';
      return ar(n) + ' صفحات';
    }
    function drawP() {
      rowP.innerHTML = '';
      [1,2,3,4,5,6,7,8,9,10].forEach(function (n) {
        chip(rowP, pageLabel(n), state.pages === n, function () { state.pages = n; drawP(); redraw(); });
      });
    }
    drawP();

    lbl('الألوان');
    var rowT = document.createElement('div'); rowT.className = 'kp-row'; box.appendChild(rowT);
    function drawT() {
      rowT.innerHTML = '';
      THEMES.forEach(function (th) {
        chip(rowT, '<span class="kp-dot" style="background:' + hsl(th.hues[0], 65, 70) + '"></span>' + th.name, th === state.theme,
          function () { state.theme = th; drawT(); redraw(); });
      });
    }
    drawT();

    lbl('نمط الصورة');
    var rowS = document.createElement('div'); rowS.className = 'kp-row'; box.appendChild(rowS);
    function drawS() {
      rowS.innerHTML = '';
      ART_STYLES.forEach(function (st) {
        chip(rowS, st.name, st === state.artStyle, function () { state.artStyle = st; drawS(); });
      });
    }
    drawS();

    lbl('الرموز التعبيرية');
    var rowE = document.createElement('div'); rowE.className = 'kp-row'; box.appendChild(rowE);
    var ci = document.createElement('input'); ci.className = 'kp-in'; ci.placeholder = 'أو اكتبي رموزك بنفسك: 🌹🕊️✝️🙏'; ci.style.marginTop = '8px';
    function drawE() {
      rowE.innerHTML = '';
      EMOJI_SETS.forEach(function (s) {
        chip(rowE, s.list.join(' '), !state.custom && s === state.set, function () { state.set = s; state.custom = ''; ci.value = ''; drawE(); redraw(); });
      });
    }
    ci.oninput = function () { state.custom = ci.value; drawE(); redraw(); };
    drawE(); box.appendChild(ci);

    var act = document.createElement('div'); act.className = 'kp-act'; box.appendChild(act);
    function btn(cls, text, fn) { var b = document.createElement('button'); b.type = 'button'; b.className = 'kp-btn ' + cls; b.textContent = text; b.onclick = fn; act.appendChild(b); return b; }
    function download(blob, name) {
      if (!blob) { stat.textContent = 'لا يوجد ملف للحفظ'; return Promise.resolve(false); }
      var file;
      try { file = new File([blob], name, { type: blob.type || 'application/octet-stream' }); } catch (e) { file = null; }
      if (file && navigator.canShare) {
        try {
          if (navigator.canShare({ files: [file] })) {
            return navigator.share({ files: [file], title: name }).then(function () { return true; }).catch(function () { return anchorDownload(blob, name); });
          }
        } catch (e) {}
      }
      return Promise.resolve(anchorDownload(blob, name));
    }
    function anchorDownload(blob, name) {
      try {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { try { a.remove(); URL.revokeObjectURL(a.href); } catch (e) {} }, 4000);
        return true;
      } catch (e) {
        stat.textContent = 'تعذر الحفظ: ' + (e && e.message ? e.message : e);
        return false;
      }
    }
    function canvasToBlob(cv, type, quality) {
      return new Promise(function (resolve, reject) {
        try {
          if (cv.toBlob) {
            cv.toBlob(function (b) { b ? resolve(b) : reject(new Error('toBlob فاضي — جربي إعادة رسم الصور بالذكاء الاصطناعي')); }, type || 'image/jpeg', quality || 0.92);
          } else {
            var du = cv.toDataURL(type || 'image/jpeg', quality || 0.92);
            var arr = dataUrlToBytes(du);
            resolve(new Blob([arr], { type: type || 'image/jpeg' }));
          }
        } catch (e) {
          reject(new Error('تعذر قراءة الصورة (غالبًا بسبب حماية المتصفح بعد رسم الإنترنت). اضغطي «ارسمي صور» ثم الحفظ فورًا.'));
        }
      });
    }
    btn('ai', '🤖 ارسمي صور جديدة بالذكاء الاصطناعي (بالألوان والرموز المختارة)', genArt);
    btn('', '📄 حفظ PDF (A4)', function () {
      if (!state.canvases.length) { stat.textContent = 'لا توجد صفحات للبوستر بعد'; return; }
      stat.textContent = 'جاري تجهيز PDF…';
      try {
        var blob = makePdf(state.canvases);
        download(blob, 'khalwaty-lesson.pdf').then(function () { stat.textContent = '✅ تم حفظ / مشاركة PDF'; });
      } catch (e) {
        stat.textContent = 'تعذر إنشاء PDF: ' + (e && e.message ? e.message : e) + ' — جرّبي إعادة رسم الصور ثم الحفظ';
      }
    });
    btn('', '🖼️ حفظ الصور', function () {
      if (!state.canvases.length) { stat.textContent = 'لا توجد صور للحفظ'; return; }
      stat.textContent = 'جاري حفظ الصور…';
      var n = state.canvases.length, ok = 0, fail = 0;
      state.canvases.forEach(function (cv, i) {
        setTimeout(function () {
          canvasToBlob(cv, 'image/jpeg', 0.92).then(function (b) {
            return download(b, 'khalwaty-lesson-p' + (i + 1) + '.jpg');
          }).then(function () {
            ok++;
            if (ok + fail >= n) stat.textContent = fail ? ('⚠️ حُفظ ' + ok + ' وتعذّر ' + fail) : ('✅ تم حفظ ' + ok + ' صورة');
          }).catch(function (e) {
            fail++;
            stat.textContent = 'تعذر حفظ صورة: ' + (e && e.message ? e.message : e);
          });
        }, i * 600);
      });
    });
    btn('alt', '📤 مشاركة PDF', function () {
      if (!state.canvases.length) { stat.textContent = 'لا توجد صفحات'; return; }
      try {
        var blob = makePdf(state.canvases);
        download(blob, 'khalwaty-lesson.pdf').then(function () { stat.textContent = '✅ تمت مشاركة / حفظ PDF'; });
      } catch (e) {
        stat.textContent = 'تعذر مشاركة PDF: ' + (e && e.message ? e.message : e);
      }
    });
    btn('alt', 'إغلاق', function () { state.genId++; ov.remove(); });

    ov.addEventListener('click', function (e) { if (e.target === ov) { state.genId++; ov.remove(); } });
    document.body.appendChild(ov);
    redraw();
    genArt();           // أول مرة: يبدأ الرسم تلقائيًا
  }

  function attachButton(container, getData, label) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = label || '🎨 بوستر A4 بالذكاء الاصطناعي';
    b.style.cssText = 'font:800 15px ' + FONT + ';padding:11px 16px;border:0;border-radius:14px;background:#7a5a9a;color:#fff;cursor:pointer';
    b.onclick = function () { open(typeof getData === 'function' ? getData() : getData); };
    container.appendChild(b); return b;
  }

  window.KhalwatyPoster = {
    open: open, attachButton: attachButton, THEMES: THEMES, EMOJI_SETS: EMOJI_SETS,
    _layout: layout, _makePdf: makePdf, _drawPage: drawPage
  };
})();

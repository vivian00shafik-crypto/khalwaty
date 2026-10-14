/* khalwaty-poster.js  (v2)
 * بوستر تحضير الدرس: رسومات بالذكاء الاصطناعي + نص عربي حاد من التطبيق
 * + تقسيم تلقائي على صفحتين/ثلاث بمقاس A4 + حفظ PDF/صور.
 *
 * KhalwatyPoster.open({ title, subtitle, items:[{heading,text}] })
 */
(function () {
  'use strict';
  // build v183
  /* بوستر التحضير — تصميم A4 احترافي للطباعة:
     دقة النص أولًا، خط مقروء، هوامش آمنة، تقسيم صفحات منطقي، صورة داعمة دون تغطية النص */

  var W = 1240, H = 1754, M = 56;          // A4 عمودي 210×297مم @ ~150dpi
  var INNER = 22, GAP = 18;
  // تخطيط تحريري: بطاقات نصية + صور جانبية (بدون شريط صورة سفلي ضخم)
  var TOP_FIRST = 200, TOP_NEXT = 120, BOTTOM = H - 100;
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
    var BODY = Math.max(27, Math.round(34 * s));
    var LH = Math.round(BODY * 1.8);
    return {
      BODY: BODY,
      LH: LH,
      HEAD_F: Math.max(20, Math.round(24 + 8 * s)),
      HEAD_H: Math.round(48 + 14 * s),
      CARD_PAD: 18,
      ACCENT: 8
    };
  }
  function topOf(pi) { return pi === 0 ? TOP_FIRST : TOP_NEXT; }

  function paginate(items, s, m) {
    var d = dims(s);
    var fullW = W - 2 * M - 2 * INNER - 20;
    var sideW = Math.round(fullW * 0.30); // عمود صورة جانبية محجوز
    var PADB = d.CARD_PAD * 2;
    var pages = [[]], pi = 0, y = topOf(0);
    m.direction = 'rtl';
    function next() { pages.push([]); pi++; y = topOf(pi); }
    items.forEach(function (it, i) {
      var raw = String(it.text || '').trim();
      if (!raw) return;
      var linesAll = raw.split(/\n/);
      var head = '';
      var body = raw;
      if (linesAll.length > 1 && linesAll[0].trim().length > 0 && linesAll[0].trim().length <= 52) {
        head = linesAll[0].trim();
        body = linesAll.slice(1).join('\n').trim() || raw;
      }
      // صورة جانبية لأقسام فردية طويلة فقط — والنص يُلفّ على العرض المتبقي فقط
      var useSide = (i % 2 === 1);
      var textColW = useSide ? (fullW - sideW - 16) : fullW;
      m.font = '400 ' + d.BODY + 'px ' + FONT;
      var lines = wrap(m, body, textColW);
      if (!lines.length) lines = [''];
      var idx = 0, n = lines.length;
      var headH = head ? d.HEAD_H : Math.round(d.HEAD_H * 0.4);
      var over = headH + PADB + 10;
      function place(k) {
        var hh = over + k * d.LH;
        // ارتفاع أدنى لو فيه صورة جانبية
        if (useSide) hh = Math.max(hh, sideW * 0.7 + PADB);
        pages[pi].push({
          it: it, i: i,
          lines: lines.slice(idx, idx + k),
          cont: idx > 0,
          y: y, h: hh,
          head: idx === 0 ? head : '',
          hasSide: useSide && idx === 0, // الصورة مرة واحدة مع بداية القسم
          textColW: textColW,
          sideW: useSide ? sideW : 0
        });
        return hh;
      }
      while (idx < n) {
        var cap = Math.floor((BOTTOM - y - over) / d.LH), rem = n - idx;
        if (cap < 1) { next(); continue; }
        if (cap >= rem) {
          var hh = place(rem);
          y += hh + GAP;
          idx = n;
        } else {
          var take = Math.min(cap, Math.max(2, rem - 1));
          var fresh = (y === topOf(pi));
          if (take >= 2 || fresh) {
            place(take);
            idx += take;
            next();
          } else next();
        }
      }
    });
    if (pages.length > 1 && !pages[pages.length - 1].length) pages.pop();
    return pages;
  }

function layout(items, N, m) {
    // نفضّل خطًا مقروءًا على A4؛ إن لم يتسع زد عدد الصفحات بدل تصغير مفرط
    var last = null;
    for (var s = 1.4; s >= 0.82; s -= 0.04) {
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
    ctx.direction = 'rtl';
    ctx.textBaseline = 'middle';
    var theme = opt.theme, emojis = opt.emojis || ['✝'], hb = theme.hues[0];
    var FONT_USE = (opt && opt.fontFamily) || (d && d.FONT) || FONT;

    // خلفية ورقية
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, hsl(theme.bg[0], Math.min(35, theme.bg[1]), 98));
    bg.addColorStop(1, hsl(theme.hues[1], 20, 95));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = hsl(hb, 45, 42);
    ctx.fillRect(0, 0, W, 7);

    var title = data.title || 'تحضير الدرس';

    // رأس
    if (pi === 0) {
      var hx = M, hy = 22, hs = 130;
      var hero = art && (art.hero || (art.pages && art.pages[0]));
      if (hero && hero.width) {
        ctx.save();
        ctx.beginPath(); rrect(ctx, hx, hy, hs, hs, 16); ctx.clip();
        var sc = Math.max(hs / hero.width, hs / hero.height) * (opt.imgScale || 1);
        ctx.drawImage(hero, hx + (hs - hero.width * sc) / 2 + (opt.imgOffX || 0) * 0.4, hy + (hs - hero.height * sc) / 2 + (opt.imgOffY || 0) * 0.4, hero.width * sc, hero.height * sc);
        ctx.restore();
        ctx.lineWidth = 2.5; ctx.strokeStyle = hsl(hb, 40, 70);
        rrect(ctx, hx, hy, hs, hs, 16); ctx.stroke();
      } else {
        ctx.fillStyle = hsl(hb, 40, 90);
        rrect(ctx, hx, hy, hs, hs, 16); ctx.fill();
        ctx.font = '64px ' + EMOJI_FONT;
        ctx.textAlign = 'center';
        ctx.fillText(emojis[0] || '📖', hx + hs / 2, hy + hs / 2 + 4);
      }
      var titleX0 = hx + hs + 18;
      var titleW = W - M - titleX0;
      ctx.textAlign = 'right';
      ctx.fillStyle = hsl(hb, 50, 26);
      var tf = 44, tlines;
      do {
        ctx.font = '700 ' + tf + 'px ' + FONT_USE;
        tlines = wrap(ctx, title, titleW);
        tf -= 2;
      } while (tlines.length > 3 && tf > 28);
      var ty = hy + 36;
      tlines.forEach(function (ln) { ctx.fillText(ln, W - M, ty); ty += tf + 6; });
    } else {
      ctx.textAlign = 'right';
      ctx.font = '700 26px ' + FONT_USE;
      ctx.fillStyle = hsl(hb, 40, 32);
      ctx.fillText(title, W - M, 48);
      ctx.strokeStyle = hsl(hb, 30, 82);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(M, 70); ctx.lineTo(W - M, 70); ctx.stroke();
    }

    var cardTints = [
      [hb, 28, 97],
      [(hb + 28) % 360, 22, 97],
      [(hb + 50) % 360, 20, 96]
    ];

    pg.forEach(function (f, fi) {
      var y = f.y, h = f.h;
      var tint = cardTints[fi % cardTints.length];
      var x = M, w = W - 2 * M;

      // بطاقة
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.07)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = hsl(tint[0], tint[1], tint[2]);
      rrect(ctx, x, y, w, h, 16);
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = hsl(hb, 22, 84);
      rrect(ctx, x, y, w, h, 16);
      ctx.stroke();

      // شريط تمييز على يمين البطاقة
      ctx.fillStyle = hsl(hb, 48, 50);
      rrect(ctx, x + w - 7, y + 10, 5, h - 20, 3);
      ctx.fill();

      // ===== عمودان: نص يمين | صورة يسار (بدون تداخل) =====
      var pad = d.CARD_PAD;
      var gapCol = 14;
      var sideW = f.sideW || 0;
      var hasImg = f.hasSide && sideW > 0;
      var imgColW = hasImg ? sideW : 0;

      // حدود عمود النص (من اليمين)
      var textRight = x + w - 14;
      var textLeft = x + pad + (hasImg ? imgColW + gapCol : 0);
      var textColW = Math.max(80, textRight - textLeft);

      // صورة في العمود الأيسر فقط
      if (hasImg) {
        var sideImg = null;
        if (art) {
          if (art.pages && art.pages.length) sideImg = art.pages[(pi + fi) % art.pages.length];
          else sideImg = art.hero || art.a || art.b;
        }
        var ix = x + pad;
        var iy = y + pad;
        var ih = h - pad * 2;
        var iw = imgColW;
        ctx.fillStyle = hsl(hb, 20, 92);
        rrect(ctx, ix, iy, iw, ih, 12);
        ctx.fill();
        if (sideImg && sideImg.width) {
          ctx.save();
          ctx.beginPath(); rrect(ctx, ix, iy, iw, ih, 12); ctx.clip();
          var sc2 = Math.max(iw / sideImg.width, ih / sideImg.height) * (opt.imgScale || 1);
          var dw = sideImg.width * sc2, dh = sideImg.height * sc2;
          var ox = (opt.imgOffX || 0);
          var oy = (opt.imgOffY || 0);
          ctx.drawImage(sideImg, ix + (iw - dw) / 2 + ox, iy + (ih - dh) / 2 + oy, dw, dh);
          ctx.restore();
        } else {
          ctx.font = Math.min(48, iw * 0.35) + 'px ' + EMOJI_FONT;
          ctx.textAlign = 'center';
          ctx.fillText(emojis[fi % emojis.length] || '🕯', ix + iw / 2, iy + ih / 2);
        }
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = hsl(hb, 25, 78);
        rrect(ctx, ix, iy, iw, ih, 12);
        ctx.stroke();
      }

      // نص داخل عمود النص فقط (clip يمنع أي تداخل)
      ctx.save();
      ctx.beginPath();
      ctx.rect(textLeft - 2, y + 4, textColW + 8, h - 8);
      ctx.clip();

      var cursorY = y + pad + 4;
      var align = (opt && opt.textAlign) || 'right';
      if (align !== 'left' && align !== 'center' && align !== 'right') align = 'right';
      ctx.textAlign = align;
      var textX = textRight;
      if (align === 'center') textX = (textLeft + textRight) / 2;
      else if (align === 'left') textX = textLeft;
      var lhMul = (opt && opt.lineHeight) ? (opt.lineHeight / 1.8) : 1;
      var bodyLH = d.LH * lhMul;
      var paraMul = (opt && opt.paraGap) ? opt.paraGap : 1;

      if (f.head) {
        ctx.font = '700 ' + d.HEAD_F + 'px ' + FONT_USE;
        ctx.fillStyle = hsl(hb, 55, 30);
        var hl = wrap(ctx, f.head, textColW - 4);
        hl.forEach(function (ln) {
          cursorY += d.HEAD_F * 0.55;
          ctx.fillText(ln, textX, cursorY);
          cursorY += d.HEAD_F * 0.55 + 3;
        });
        ctx.strokeStyle = hsl(hb, 35, 78);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (align === 'center') {
          var mid = (textLeft + textRight) / 2;
          var half = Math.min(textColW, 200) / 2;
          ctx.moveTo(mid - half, cursorY + 2);
          ctx.lineTo(mid + half, cursorY + 2);
        } else if (align === 'left') {
          ctx.moveTo(textLeft, cursorY + 2);
          ctx.lineTo(textLeft + Math.min(textColW, 200), cursorY + 2);
        } else {
          ctx.moveTo(textRight - Math.min(textColW, 200), cursorY + 2);
          ctx.lineTo(textRight, cursorY + 2);
        }
        ctx.stroke();
        cursorY += 12 * paraMul;
      } else if (f.cont) {
        ctx.font = '400 17px ' + FONT_USE;
        ctx.fillStyle = hsl(hb, 20, 55);
        cursorY += 12;
        ctx.fillText('… تتمة', textX, cursorY);
        cursorY += 14;
      } else {
        cursorY += 6 * paraMul;
      }

      // إعادة لفّ على عرض العمود الفعلي لضمان عدم تجاوز الصورة
      ctx.font = '400 ' + d.BODY + 'px ' + FONT_USE;
      ctx.fillStyle = hsl(hb, 22, 16);
      var bodyText = (f.lines || []).join(' ');
      var drawLines = f.lines || [];
      if (f.textColW && Math.abs(f.textColW - textColW) > 8) {
        drawLines = wrap(ctx, bodyText, textColW - 4);
      }
      drawLines.forEach(function (ln, li) {
        cursorY += bodyLH * 0.5;
        if (cursorY > y + h - pad) return;
        ctx.fillText(ln, textX, cursorY);
        cursorY += bodyLH * 0.5;
        // فراغ بسيط بين الفقرات عند سطر فارغ
        if (!String(ln || '').trim()) cursorY += 6 * paraMul;
      });
      ctx.restore();
    });

    // تذييل
    var label = ar(pi + 1) + ' / ' + ar(total);
    ctx.textAlign = 'center';
    ctx.font = '600 20px ' + FONT_USE;
    ctx.fillStyle = hsl(hb, 28, 42);
    ctx.fillText(label, W / 2, H - 36);
    ctx.strokeStyle = hsl(hb, 20, 82);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 70, H - 52);
    ctx.lineTo(W / 2 + 70, H - 52);
    ctx.stroke();
  }

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

  
  
  /* صور مخزنة حقيقية في مجلد stock/ */
  var STOCK_5D = [
    { id: 'bible', name: 'الكتاب المقدس', data: 'stock/bible.jpg' },
    { id: 'mary', name: 'العذراء', data: 'stock/mary.jpg' },
    { id: 'christ', name: 'المسيح يصلي', data: 'stock/christ.jpg' },
    { id: 'forest', name: 'غابة ونور', data: 'stock/forest.jpg' },
    { id: 'mountains', name: 'جبل وكنيسة', data: 'stock/mountains.jpg' },
    { id: 'candle', name: 'شموع', data: 'stock/candle.jpg' },
    { id: 'flowers', name: 'زنابق', data: 'stock/flowers.jpg' },
    { id: 'chapel', name: 'كنيسة صغيرة', data: 'stock/chapel.jpg' },
  ]

  function loadStockImage(stock) {
    return new Promise(function (res) {
      if (!stock || !stock.data) { res(null); return; }
      var im = new Image();
      im.onload = function () {
        im.__local = false;
        im.__stock = stock.id;
        im.__stockName = stock.name;
        res(im);
      };
      im.onerror = function () { res(null); };
      var src = stock.data;
      if (src && src.indexOf('data:') !== 0 && src.indexOf('?') < 0) src = src + '?v=183';
      im.src = src;
    });
  }

function makeLocalArt(w, h, theme, emojis, label, seed, styleId) {
    w = w || 896; h = h || 512;
    seed = (seed || 1) | 0;
    styleId = (styleId == null ? seed % 12 : styleId) | 0;
    var names = ['مشهد','مشهد','مشهد','مشهد','مشهد','مشهد','مشهد','مشهد','مشهد','مشهد','مشهد','مشهد'];
    var emojiSets = [
      ['✝','📖','🕊'], ['🌅','✝','✨'], ['📜','✝','🕯'], ['🕯','🙏','✝'],
      ['🍇','🍞','✝'], ['🌊','🕊','✝'], ['🏔','✝','🌅'], ['🌸','✝','🌿'],
      ['⭐','✝','🌙'], ['🔥','✝','📖'], ['🌳','🕊','✝'], ['💎','✝','📜']
    ];
    var pals = [
      [210, 45, 88], [25, 70, 82], [35, 30, 88], [40, 50, 86],
      [280, 35, 88], [195, 55, 84], [150, 25, 82], [330, 40, 90],
      [230, 40, 86], [15, 75, 80], [120, 40, 84], [45, 55, 86]
    ];
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var pal = pals[styleId % pals.length];
    var h0 = pal[0], sat = pal[1], light = pal[2];

    // خلفيات مختلفة بوضوح
    if (styleId === 0) {
      var g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#d6eaff'); g.addColorStop(1, '#fff8e8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else if (styleId === 1) {
      var g1 = ctx.createLinearGradient(0, 0, 0, h);
      g1.addColorStop(0, '#ffb347'); g1.addColorStop(0.55, '#ff7e5f'); g1.addColorStop(1, '#4a2c6a');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);
    } else if (styleId === 2) {
      ctx.fillStyle = '#f3e4c8'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(120,90,40,0.15)';
      for (var ly = 0; ly < h; ly += 14) { ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(w, ly); ctx.stroke(); }
    } else if (styleId === 3) {
      ctx.fillStyle = '#2a1f3d'; ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,200,80,' + (0.15 + i * 0.08) + ')';
        ctx.arc(w * (0.2 + i * 0.15), h * 0.7, 20 + i * 8, 0, Math.PI * 2); ctx.fill();
      }
    } else if (styleId === 4) {
      ctx.fillStyle = '#f8f0ff'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(160,80,180,0.2)';
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.35, 0, Math.PI * 2); ctx.fill();
    } else if (styleId === 5) {
      var g2 = ctx.createLinearGradient(0, 0, 0, h);
      g2.addColorStop(0, '#87ceeb'); g2.addColorStop(0.5, '#4db8c9'); g2.addColorStop(1, '#0b3d5c');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
    } else if (styleId === 6) {
      ctx.fillStyle = '#cfe8d5'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(60,100,70,0.35)';
      ctx.beginPath(); ctx.moveTo(0, h * 0.7); ctx.lineTo(w * 0.3, h * 0.35); ctx.lineTo(w * 0.55, h * 0.65); ctx.lineTo(w, h * 0.3); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    } else if (styleId === 7) {
      ctx.fillStyle = '#ffe8f0'; ctx.fillRect(0, 0, w, h);
      for (var f = 0; f < 8; f++) {
        ctx.font = (28 + (seed + f) % 24) + 'px serif';
        ctx.globalAlpha = 0.7;
        ctx.fillText('🌸', (seed * (f + 3) * 37) % w, (seed * (f + 5) * 29) % h);
      }
      ctx.globalAlpha = 1;
    } else if (styleId === 8) {
      ctx.fillStyle = '#0b1a3a'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff8b0';
      for (var st = 0; st < 30; st++) {
        var sx = (seed * (st + 2) * 53) % w, sy = (seed * (st + 7) * 41) % h;
        ctx.fillRect(sx, sy, 2, 2);
      }
    } else if (styleId === 9) {
      var g3 = ctx.createRadialGradient(w * 0.5, h * 0.55, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.6);
      g3.addColorStop(0, '#ffe066'); g3.addColorStop(0.4, '#ff6b00'); g3.addColorStop(1, '#3a0a0a');
      ctx.fillStyle = g3; ctx.fillRect(0, 0, w, h);
    } else if (styleId === 10) {
      ctx.fillStyle = '#e8f5e0'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(40,100,50,0.45)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.85); ctx.lineTo(w * 0.5, h * 0.35); ctx.stroke();
      ctx.fillStyle = 'rgba(40,120,50,0.35)';
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.32, 70, 0, Math.PI * 2); ctx.fill();
    } else {
      var g4 = ctx.createLinearGradient(0, 0, w, h);
      g4.addColorStop(0, '#fff3c4'); g4.addColorStop(1, '#d4af37');
      ctx.fillStyle = g4; ctx.fillRect(0, 0, w, h);
    }

    // إيموجي كبيرة واضحة
    var list = emojiSets[styleId % emojiSets.length];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = Math.floor(Math.min(w, h) * 0.22) + 'px serif';
    for (var k = 0; k < list.length; k++) {
      ctx.globalAlpha = 0.95;
      ctx.fillText(list[k], w * (0.25 + k * 0.25), h * 0.42);
    }
    ctx.globalAlpha = 1;

    // صليب
    ctx.strokeStyle = 'rgba(80,60,20,0.45)';
    ctx.lineWidth = Math.max(5, w * 0.012);
    ctx.lineCap = 'round';
    var cx = w * 0.5, cy = h * 0.72, cl = Math.min(w, h) * 0.11;
    ctx.beginPath();
    ctx.moveTo(cx, cy - cl); ctx.lineTo(cx, cy + cl);
    ctx.moveTo(cx - cl * 0.7, cy - cl * 0.2); ctx.lineTo(cx + cl * 0.7, cy - cl * 0.2);
    ctx.stroke();

    // اسم النمط مكتوب على الصورة عشان يبان التغيير
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, h - 44, w, 44);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.max(16, Math.floor(h * 0.06)) + 'px sans-serif';
    ctx.fillText(names[styleId % names.length], w / 2, h - 22);

    // نرجع الكانفس مباشرة (أضمن من Image+dataURL)
    c.__local = true;
    c.__stock = styleId;
    return Promise.resolve(c);
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
  function playPosterClick() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!window.__kpAudioCtx) window.__kpAudioCtx = new AC();
      var ctx = window.__kpAudioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.06);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  }
  function hapticTap() {
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
  }
  function feedbackTap() { playPosterClick(); hapticTap(); }

  function injectCSS() {
    if (cssDone) return; cssDone = true;
    var s = document.createElement('style');
    s.textContent =
      '.kp-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;direction:rtl;font-family:' + FONT + '}' +
      '.kp-box{background:#fffdf8;width:100%;max-width:600px;max-height:95vh;overflow:auto;border-radius:22px 22px 0 0;padding:14px 14px 22px;box-sizing:border-box}' +
      '.kp-prev{background:#e9e6df;border-radius:14px;padding:10px;max-height:62vh;overflow-y:auto;-webkit-overflow-scrolling:touch}' +
      '.kp-prev canvas{width:100%;height:auto;border-radius:8px;display:block;margin:0 0 6px;box-shadow:0 3px 10px rgba(0,0,0,.18);background:#fff}.kp-page-wrap{margin-bottom:14px;border:1px solid rgba(0,0,0,.08);border-radius:10px;overflow:hidden;background:#fff}.kp-page-tag{display:block;text-align:center;font:700 13px Cairo,sans-serif;color:#5a4a2a;background:#f0e6d0;padding:6px 8px}' +
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
      '.kp-btn.alt{background:#e9e4d6;color:#333}' +
      '.kp-btn.ai2{flex-basis:100%;background:#6a7a9a}' +
      '.kp-btn.fill{flex-basis:100%;background:#3d7a5c}' +
      '.kp-controls{background:#f7f1e4;border:1px solid rgba(180,150,80,0.3);border-radius:16px;padding:12px;margin-top:10px;box-sizing:border-box;max-width:100%}' +
      '.kp-controls .kp-lbl{margin-top:10px}' +
      '.kp-controls .kp-lbl:first-child{margin-top:0}' +
      '.kp-row{display:flex;flex-wrap:wrap;gap:8px;max-width:100%}' +
      '.kp-chip.on{border-color:#4f8a3c;background:#eef7e8;box-shadow:0 0 0 2px rgba(79,138,60,0.22)}';
    document.head.appendChild(s);
  }

  function open(data) {
    injectCSS();
    data = data || { items: [] };
    var items = (data.items || []).filter(function (it) { return it && String(it.text || '').trim(); });
    var state = { theme: THEMES[0], set: EMOJI_SETS[0], artStyle: ART_STYLES[0], custom: '', pages: Math.min(10, Math.max(1, data.pages || 3)), title: data.title || 'تحضير الدرس', art: null, genId: 0, canvases: [], fontScale: 1, fontFamily: 'Cairo, "Noto Naskh Arabic", Tahoma, sans-serif', imgScale: 1, imgOffX: 0, imgOffY: 0, textAlign: 'right', lineHeight: 1.8, paraGap: 1 };

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
          // دمج مقياس الخط الذي يختاره المستخدم مع مقياس التقسيم التلقائي
          var baseLay = layout(items, state.pages, m);
          var userS = Math.max(0.7, Math.min(1.6, state.fontScale || 1));
          var combinedS = Math.max(0.7, Math.min(1.7, (baseLay.s || 1) * userS));
          var lay = { pages: paginate(items, combinedS, m), s: combinedS, fits: true };
          // إن زاد عدد الصفحات عن المطلوب بسبب تكبير الخط، أعد مع تصغير طفيف
          if (lay.pages.length > state.pages) {
            combinedS = Math.max(0.7, combinedS * 0.92);
            lay = { pages: paginate(items, combinedS, m), s: combinedS, fits: paginate(items, combinedS, m).length <= state.pages };
          }
          var d = dims(lay.s);
          // خط مخصص
          d.FONT = state.fontFamily || FONT;
          prev.innerHTML = ''; state.canvases = [];
          var opt = {
            theme: state.theme,
            emojis: emojisNow(),
            imgScale: 1,
            imgOffX: 0,
            imgOffY: 0,
            fontFamily: state.fontFamily || FONT,
            textAlign: state.textAlign || 'right',
            lineHeight: state.lineHeight || 1.8,
            paraGap: state.paraGap || 1
          };
          var d2 = { title: state.title, subtitle: data.subtitle };
          lay.pages.forEach(function (pg, i) {
            var cv = document.createElement('canvas');
            drawPage(cv, pg, i, lay.pages.length, d2, opt, state.art, d);
            var wrap = document.createElement('div');
            wrap.className = 'kp-page-wrap';
            var tag = document.createElement('div');
            tag.className = 'kp-page-tag';
            tag.textContent = 'صفحة ' + (i + 1) + ' من ' + lay.pages.length;
            wrap.appendChild(tag);
            wrap.appendChild(cv);
            prev.appendChild(wrap);
            state.canvases.push(cv);
          });
          note.textContent = !items.length ? 'لا توجد نصوص في صفحات التحضير.'
            : '📄 المعاينة تعرض كل الصفحات — مرري لأسفل لرؤية الصفحة 2 و 3 … (' + ar(lay.pages.length) + ' صفحة). ' + (
              !lay.fits ? 'النص طويل؛ زِدي عدد الصفحات أو صغّري الخط.' :
              (lay.pages.length < state.pages ? 'النص يكفي ' + ar(lay.pages.length) + ' صفحة فقط.' : '')
            );
        });
      }, 150);
    }

    function fillAllLocalNow() {
      var id = ++state.genId;
      var seed = Math.floor(Math.random() * 90000) + 1;
      state.art = { hero: null, pages: [] };
      var total = state.pages + 1;
      stat.textContent = '🎨 جاري وضع مشاهد المخزون على كل الصفحات…';
      redraw();
      var chain = Promise.resolve();
      chain = chain.then(function () {
        if (id !== state.genId) return;
        var st = STOCK_5D[0];
        return loadStockImage(st).then(function (im) {
          state.art.hero = im;
          redraw();
        });
      });
      for (var p = 0; p < state.pages; p++) {
        (function (pi) {
          chain = chain.then(function () {
            if (id !== state.genId) return;
            var st = STOCK_5D[(pi + 1) % STOCK_5D.length];
            return loadStockImage(st).then(function (im) {
              state.art.pages[pi] = im;
              stat.textContent = '🎨 ' + st.name + ' — ' + ar(pi + 2) + '/' + ar(total);
              redraw();
            });
          });
        })(p);
      }
      return chain.then(function () {
        if (id !== state.genId) return;
        stat.textContent = '✅ تم وضع مشاهد المخزون على كل الصفحات — يمكن تغيير أي صفحة من «مخزون صور»';
        redraw();
      });
    }

    function genArt(opts) {
      opts = opts || {};
      var retryLocalOnly = !!opts.retryLocalOnly;
      var id = ++state.genId;
      var seed = Math.floor(Math.random() * 90000) + 1;
      if (!state.art) state.art = { hero: null, pages: [] };
      // أولًا: املأ أي فراغات بالمحلي فورًا حتى لا تبقى صفحات بلا صورة
      var fillJobs = [];
      if (!state.art.hero) {
        fillJobs.push(makeLocalArt(512, 512, state.theme, emojisNow(), 'hero', seed, 0).then(function (im) {
          if (im) state.art.hero = im;
        }));
      }
      for (var p0 = 0; p0 < state.pages; p0++) {
        (function (pi) {
          if (!state.art.pages[pi]) {
            fillJobs.push(makeLocalArt(640, 384, state.theme, emojisNow(), 'p' + pi, seed + pi + 3, (pi + 1) % 12).then(function (im) {
              if (im) state.art.pages[pi] = im;
            }));
          }
        })(p0);
      }
      Promise.all(fillJobs).then(function () { redraw(); });

      var stepsAll = artSteps(state.theme, emojisNow(), seed, customPromptExtra(), state.pages, items, state.artStyle);
      var steps = stepsAll;
      if (retryLocalOnly) {
        steps = stepsAll.filter(function (st) {
          if (st.key === 'hero') return !state.art.hero || state.art.hero.__local;
          if (typeof st.pageIndex === 'number') {
            var im = state.art.pages[st.pageIndex];
            return !im || im.__local;
          }
          return true;
        });
      }
      var total = steps.length, aiOk = 0, doneN = 0;
      if (!total) {
        stat.textContent = '✅ كل الصور جاهزة';
        redraw();
        return;
      }
      stat.textContent = '🤖 ترقية بالذكاء الاصطناعي ' + ar(total) + ' صورة — المحلي يبقى لو فشل النت';
      redraw();
      function saveStep(step, im, isLocal) {
        if (im) im.__local = !!isLocal;
        if (step.key === 'hero') state.art.hero = im;
        else if (typeof step.pageIndex === 'number') state.art.pages[step.pageIndex] = im;
      }
      function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
      function loadAI(step) {
        var w = step.key === 'hero' ? 512 : 640;
        var h = step.key === 'hero' ? 512 : 384;
        var base = step.prompt || 'christian soft watercolor cross bible light';
        // محاولتان فقط سريعتان حتى نكمّل باقي الصفحات
        var list = [
          artUrl(base, w, h, seed + doneN * 19, 0),
          artUrl(base, w, h, seed + doneN * 19 + 7, 1)
        ];
        var i = 0;
        function tryNext() {
          if (i >= list.length) return Promise.resolve(null);
          var u = list[i++];
          return loadImg(u, 18000).then(function (im) {
            if (im && im.width >= 64 && im.height >= 64) return im;
            return wait(1500).then(tryNext);
          });
        }
        return tryNext();
      }
      (function next(k) {
        if (id !== state.genId || !ov.isConnected) return;
        if (k >= steps.length) {
          var haveAi = (state.art.hero && !state.art.hero.__local ? 1 : 0);
          for (var pi = 0; pi < state.pages; pi++) {
            if (state.art.pages[pi] && !state.art.pages[pi].__local) haveAi++;
          }
          var need = state.pages + 1;
          if (haveAi >= need) stat.textContent = '✅ كل الصور بالذكاء الاصطناعي (' + ar(haveAi) + ')';
          else if (aiOk > 0) stat.textContent = '✅ ذكاء اصطناعي: ' + ar(haveAi) + '/' + ar(need) + ' — الباقي من المخزون المحلي (اضغطي أعد الذكي أو اختاري من المخزون)';
          else stat.textContent = '✅ الصور جاهزة من المخزون المحلي — الذكاء الاصطناعي لم يتوفر (نت/حظر). اختاري مخزون أو ارفعي صورًا';
          redraw();
          return;
        }
        var step = steps[k];
        stat.textContent = '🤖 ذكاء اصطناعي ' + ar(k + 1) + '/' + ar(total) + '…';
        var gap = k === 0 ? 300 : 4000;
        wait(gap).then(function () { return loadAI(step); }).then(function (im) {
          if (id !== state.genId || !ov.isConnected) return;
          if (im) {
            saveStep(step, im, false);
            aiOk++;
          }
          // لو فشل: المحلي موجود أصلًا من fill — لا تستبدله بفراغ
          doneN++;
          redraw();
          next(k + 1);
        });
      })(0);
    }

    function openStockPicker() {
      var existing = document.getElementById('stockPicker');
      if (existing) existing.remove();
      var box = document.createElement('div');
      box.id = 'stockPicker';
      box.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;justify-content:center;';
      var panel = document.createElement('div');
      panel.style.cssText = 'background:#faf6ec;width:100%;max-width:520px;max-height:90vh;overflow:auto;border-radius:20px 20px 0 0;padding:16px;box-shadow:0 -8px 30px rgba(0,0,0,0.25);position:relative;z-index:1;';
      var html = '';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;">';
      html += '<b style="color:#5a4a2a;flex:1;">صور المخزون الجديدة — اضغطي على الصورة</b>';
      html += '<button type="button" id="stockClose" style="border:none;background:#eee;border-radius:10px;padding:8px 12px;">إغلاق</button></div>';
      html += '<label style="display:block;margin-bottom:10px;color:#6a5a40;font-weight:600;">وضع الصورة على:<br/>';
      html += '<select id="stockTarget" style="margin-top:6px;width:100%;padding:10px;border-radius:12px;border:1px solid #d4c4a0;font-size:15px;box-sizing:border-box;">';
      html += '<option value="hero">الصورة الرئيسية (غلاف)</option>';
      html += '<option value="all">كل الصفحات + الغلاف</option>';
      for (var pi = 0; pi < state.pages; pi++) {
        html += '<option value="' + pi + '">الصفحة ' + (pi + 1) + ' فقط</option>';
      }
      html += '</select></label>';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
      STOCK_5D.forEach(function (st, s) {
        html += '<button type="button" class="stock-item" data-s="' + s + '" style="padding:0;border-radius:14px;border:2px solid rgba(180,140,60,0.45);background:#fff;cursor:pointer;overflow:hidden;text-align:center;">';
        html += '<img src="' + st.data + '" alt="' + st.name + '" style="width:100%;height:140px;object-fit:cover;display:block;background:#ccc;" />';
        html += '<div style="padding:8px;font-weight:700;color:#4a3a18;font-size:14px;">' + st.name + '</div>';
        html += '</button>';
      });
      html += '</div>';
      html += '<p id="stockMsg" style="margin-top:12px;font-size:0.9em;color:#5a7d4a;text-align:center;font-weight:700;min-height:1.4em;">اضغطي على الصورة لاختيارها</p>';
      panel.innerHTML = html;
      box.appendChild(panel);
      document.body.appendChild(box);
      function close() { try { box.remove(); } catch (e) {} }
      document.getElementById('stockClose').onclick = function (e) { e.preventDefault(); e.stopPropagation(); close(); };
      box.addEventListener('click', function (e) { if (e.target === box) close(); });

      function applyStock(idx, target) {
        var stock = STOCK_5D[idx];
        if (!stock) return Promise.resolve();
        var msg = document.getElementById('stockMsg');
        if (msg) msg.textContent = 'جاري وضع «' + stock.name + '»…';
        if (!state.art) state.art = { hero: null, pages: [] };
        if (!state.art.pages) state.art.pages = [];
        var seed = Math.floor(Math.random() * 90000) + 1;
        var jobs = [];
        function putHero() {
          return loadStockImage(stock).then(function (im) { if (im) state.art.hero = im; });
        }
        function putPage(p) {
          return loadStockImage(stock).then(function (im) { if (im) state.art.pages[p] = im; });
        }
        if (target === 'hero') jobs.push(putHero());
        else if (target === 'all') {
          jobs.push(putHero());
          for (var p = 0; p < state.pages; p++) jobs.push(putPage(p));
        } else {
          var pidx = parseInt(target, 10);
          if (isNaN(pidx)) pidx = 0;
          jobs.push(putPage(pidx));
        }
        return Promise.all(jobs).then(function () {
          redraw();
          if (typeof feedbackTap === 'function') feedbackTap();
          if (msg) msg.textContent = '✅ تم وضع الصورة: ' + stock.name;
          if (stat) stat.textContent = '✅ صورة: ' + stock.name;
          setTimeout(close, 400);
        });
      }

      panel.querySelectorAll('.stock-item').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof feedbackTap === 'function') feedbackTap();
          var sid = parseInt(btn.getAttribute('data-s'), 10);
          var sel = document.getElementById('stockTarget');
          var target = sel ? sel.value : 'all';
          btn.style.opacity = '0.6';
          applyStock(sid, target).then(function () { btn.style.opacity = '1'; });
        });
      });
    }

function uploadUserImage() {
      var inp = document.createElement('input');
      inp.type = 'file';
      // بدون capture حتى يفتح ملفات/المعرض وليس الكاميرا
      inp.accept = 'image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif';
      try { inp.removeAttribute('capture'); } catch (e) {}
      inp.multiple = false;
      inp.style.display = 'none';
      document.body.appendChild(inp);
      // اختيار الهدف
      var tgt = prompt('اكتبي رقم الصفحة (1-' + state.pages + ') أو اتركيها فارغة للصورة الرئيسية:', '');
      var target = 'hero';
      if (tgt !== null && String(tgt).trim() !== '') {
        var n = parseInt(tgt, 10);
        if (!isNaN(n) && n >= 1 && n <= state.pages) target = String(n - 1);
      }
      inp.onchange = function () {
        var f = inp.files && inp.files[0];
        inp.remove();
        if (!f) return;
        if (!/^image\//.test(f.type)) {
          stat.textContent = 'الملف ليس صورة';
          return;
        }
        stat.textContent = 'جاري تحميل الصورة…';
        var reader = new FileReader();
        reader.onload = function () {
          var im = new Image();
          im.onload = function () {
            im.__local = false;
            im.__upload = true;
            if (!state.art) state.art = { hero: null, pages: [] };
            if (target === 'hero') state.art.hero = im;
            else state.art.pages[parseInt(target, 10)] = im;
            stat.textContent = '✅ تم رفع الصورة وتعيينها';
            redraw();
          };
          im.onerror = function () { stat.textContent = 'تعذر قراءة الصورة'; };
          im.src = reader.result;
        };
        reader.onerror = function () { stat.textContent = 'تعذر قراءة الملف'; };
        reader.readAsDataURL(f);
      };
      inp.click();
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
        chip(rowP, pageLabel(n), state.pages === n, function () { feedbackTap(); state.pages = n; drawP(); redraw(); });
      });
    }
    drawP();

    var controls = document.createElement('div');
    controls.className = 'kp-controls';
    box.appendChild(controls);
    function clbl(t) {
      var d = document.createElement('div'); d.className = 'kp-lbl'; d.textContent = t; controls.appendChild(d);
    }

    clbl('الألوان');
    var rowT = document.createElement('div'); rowT.className = 'kp-row'; controls.appendChild(rowT);
    function drawT() {
      rowT.innerHTML = '';
      THEMES.forEach(function (th) {
        chip(rowT, '<span class="kp-dot" style="background:' + hsl(th.hues[0], 65, 70) + '"></span>' + th.name, th === state.theme,
          function () { feedbackTap(); state.theme = th; drawT(); redraw(); });
      });
    }
    drawT();

    clbl('نمط الصورة (مرسومة / طباعة / أيقوني…)');
    var rowS = document.createElement('div'); rowS.className = 'kp-row'; controls.appendChild(rowS);
    function drawS() {
      rowS.innerHTML = '';
      ART_STYLES.forEach(function (st) {
        chip(rowS, st.name, st === state.artStyle, function () { feedbackTap(); state.artStyle = st; drawS(); redraw(); });
      });
    }
    drawS();

    clbl('الخط وحجمه');
    var rowF = document.createElement('div'); rowF.className = 'kp-row'; controls.appendChild(rowF);
    var fonts = [
      { n: 'Cairo', v: 'Cairo, "Noto Naskh Arabic", Tahoma, sans-serif' },
      { n: 'Amiri', v: 'Amiri, "Noto Naskh Arabic", serif' },
      { n: 'Tajawal', v: 'Tajawal, Cairo, sans-serif' },
      { n: 'Noto Naskh', v: '"Noto Naskh Arabic", Amiri, serif' },
      { n: 'Aref Ruqaa', v: '"Aref Ruqaa", Amiri, serif' }
    ];
    function drawF() {
      rowF.innerHTML = '';
      fonts.forEach(function (f) {
        chip(rowF, f.n, state.fontFamily.indexOf(f.n.split(' ')[0]) >= 0 || state.fontFamily === f.v, function () {
          feedbackTap(); state.fontFamily = f.v; drawF(); redraw();
        });
      });
    }
    drawF();
    var rowFS = document.createElement('div'); rowFS.className = 'kp-row'; controls.appendChild(rowFS);
    chip(rowFS, 'نص أصغر −', false, function () { feedbackTap(); state.fontScale = Math.max(0.7, (state.fontScale || 1) - 0.08); redraw(); updateFS(); });
    var fsLbl = document.createElement('span'); fsLbl.className = 'kp-chip'; fsLbl.style.cursor = 'default';
    function updateFS() { fsLbl.textContent = 'حجم الخط ' + Math.round((state.fontScale || 1) * 100) + '%'; }
    updateFS(); rowFS.appendChild(fsLbl);
    chip(rowFS, 'نص أكبر +', false, function () { feedbackTap(); state.fontScale = Math.min(1.6, (state.fontScale || 1) + 0.08); redraw(); updateFS(); });

    clbl('محاذاة النص');
    var rowA = document.createElement('div'); rowA.className = 'kp-row'; controls.appendChild(rowA);
    function drawAlign() {
      rowA.innerHTML = '';
      [
        { id: 'right', n: 'يمين' },
        { id: 'center', n: 'وسط' },
        { id: 'left', n: 'يسار' }
      ].forEach(function (a) {
        chip(rowA, a.n, state.textAlign === a.id, function () {
          feedbackTap(); state.textAlign = a.id; drawAlign(); redraw();
        });
      });
    }
    drawAlign();

    clbl('تنسيق الفقرة');
    var rowP = document.createElement('div'); rowP.className = 'kp-row'; controls.appendChild(rowP);
    chip(rowP, 'تباعد أقل', false, function () {
      feedbackTap();
      state.lineHeight = Math.max(1.25, (state.lineHeight || 1.8) - 0.1);
      state.paraGap = Math.max(0.5, (state.paraGap || 1) - 0.15);
      redraw(); updatePara();
    });
    var paraLbl = document.createElement('span'); paraLbl.className = 'kp-chip'; paraLbl.style.cursor = 'default';
    function updatePara() {
      paraLbl.textContent = 'ارتفاع السطر ' + (state.lineHeight || 1.8).toFixed(1);
    }
    updatePara(); rowP.appendChild(paraLbl);
    chip(rowP, 'تباعد أكبر', false, function () {
      feedbackTap();
      state.lineHeight = Math.min(2.6, (state.lineHeight || 1.8) + 0.1);
      state.paraGap = Math.min(2, (state.paraGap || 1) + 0.15);
      redraw(); updatePara();
    });
    chip(rowP, 'فقرة مريحة', false, function () {
      feedbackTap(); state.lineHeight = 1.9; state.paraGap = 1.15; redraw(); updatePara();
    });
    chip(rowP, 'فقرة مضغوطة', false, function () {
      feedbackTap(); state.lineHeight = 1.4; state.paraGap = 0.7; redraw(); updatePara();
    });

    clbl('الرموز التعبيرية');
    var rowE = document.createElement('div'); rowE.className = 'kp-row'; controls.appendChild(rowE);
    var ci = document.createElement('input'); ci.className = 'kp-in'; ci.placeholder = 'أو اكتبي رموزك بنفسك: 🌹🕊️✝️🙏'; ci.style.marginTop = '8px';
    function drawE() {
      rowE.innerHTML = '';
      EMOJI_SETS.forEach(function (s) {
        chip(rowE, s.list.join(' '), !state.custom && s === state.set, function () { feedbackTap(); state.set = s; state.custom = ''; ci.value = ''; drawE(); redraw(); });
      });
    }
    ci.oninput = function () { state.custom = ci.value; drawE(); redraw(); };
    drawE(); controls.appendChild(ci);

    var act = document.createElement('div'); act.className = 'kp-act'; box.appendChild(act);
    function btn(cls, text, fn) { var b = document.createElement('button'); b.type = 'button'; b.className = 'kp-btn ' + cls; b.textContent = text; b.onclick = function (e) { feedbackTap(); if (fn) fn(e); }; act.appendChild(b); return b; }
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
    btn('fill', '🎨 املأ كل الصفحات الآن (مخزون محلي — مضمونة)', function () { fillAllLocalNow(); });
    btn('stock', '🖼️ مخزون صور — اختاري نمط لكل صفحة', function () { openStockPicker(); });
    btn('up', '📤 رفع صورة من الموبايل', function () { uploadUserImage(); });
    btn('ai', '🤖 رقِّ بالذكاء الاصطناعي (اختياري — يحتاج نت)', function () { genArt({}); });
    btn('ai2', '🔁 أعد الذكي فقط للناقص', function () { genArt({ retryLocalOnly: true }); });
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
    fillAllLocalNow(); // أول مرة: املأ كل الصفحات فورًا
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

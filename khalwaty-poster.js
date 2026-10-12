/* khalwaty-poster.js
 * مولّد بوستر النصوص المجمّعة (قائمة تحضير الدرس) — ملف مستقل بدون مكتبات خارجية.
 *
 * الاستخدام:
 *   <script src="khalwaty-poster.js"></script>
 *   KhalwatyPoster.open({
 *     title: 'استحالة تحريف الكتاب المقدس',
 *     subtitle: 'الدرس الأول',
 *     items: [ { heading:'أولاً: الكتاب المقدس موحى به', text:'...', ref:'٢ تيموثاوس ٣: ١٦' }, ... ]
 *   });
 *
 * أو زر جاهز:
 *   KhalwatyPoster.attachButton(document.querySelector('#lesson-prep'), () => ({ title, subtitle, items }));
 */
(function () {
  'use strict';

  /* ---------- الألوان: كل ثيم = مجموعة درجات (Hue) تتوزع على الأقسام ---------- */
  var THEMES = [
    { id: 'spring', name: 'ربيعي',   hues: [200, 125, 35, 270, 340], bg: [48, 40, 96] },
    { id: 'gold',   name: 'ذهبي',    hues: [42, 28, 50, 16, 36],     bg: [42, 55, 95] },
    { id: 'sky',    name: 'سماوي',   hues: [210, 192, 226, 175, 240], bg: [205, 60, 96] },
    { id: 'rose',   name: 'وردي',    hues: [335, 352, 305, 12, 322], bg: [340, 55, 96] },
    { id: 'green',  name: 'أخضر',    hues: [130, 100, 160, 80, 145], bg: [110, 40, 95] },
    { id: 'violet', name: 'بنفسجي',  hues: [270, 250, 290, 230, 310], bg: [265, 50, 96] }
  ];

  /* ---------- مجموعات الرموز التعبيرية ---------- */
  var EMOJI_SETS = [
    { id: 'faith',  name: 'إيمان',  list: ['✝️', '📖', '🕊️', '🌿'] },
    { id: 'prayer', name: 'صلاة',   list: ['🙏', '⛪', '🕯️', '✨'] },
    { id: 'nature', name: 'طبيعة',  list: ['🌸', '🌿', '🦋', '☀️'] },
    { id: 'glory',  name: 'مجد',    list: ['👑', '⭐', '🔥', '🛡️'] },
    { id: 'world',  name: 'عالم',   list: ['🌍', '🌊', '⛰️', '🌅'] },
    { id: 'study',  name: 'دراسة',  list: ['📜', '🔍', '💡', '✏️'] }
  ];

  var FONT = 'Cairo, "Noto Naskh Arabic", Tahoma, sans-serif';
  var EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"';

  function hsl(h, s, l, a) {
    return a == null ? 'hsl(' + h + ',' + s + '%,' + l + '%)' : 'hsla(' + h + ',' + s + '%,' + l + '%,' + a + ')';
  }
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
  function seeded(seed) {
    var s = seed;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }
  function toArabicDigits(n) {
    return String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; });
  }

  /* تقسيم النص إلى أسطر حسب العرض */
  function wrap(ctx, text, maxW) {
    var out = [];
    String(text || '').split(/\n/).forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); return; }
      var line = '';
      words.forEach(function (w) {
        var t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; }
        else line = t;
      });
      if (line) out.push(line);
    });
    return out;
  }

  /* ---------- الرسم ---------- */
  function render(canvas, data, opt) {
    var W = 1080, PAD = 44, GAP = 28;
    var cols = opt.cols === 2 ? 2 : 1;
    var theme = opt.theme, emojis = opt.emojis.length ? opt.emojis : ['✨'];
    var colW = (W - PAD * 2 - GAP * (cols - 1)) / cols;
    var INNER = 26;
    var BODY = cols === 2 ? 27 : 32, LH = Math.round(BODY * 1.75);
    var HEAD_H = cols === 2 ? 64 : 76, HEAD_F = cols === 2 ? 28 : 34;

    var m = document.createElement('canvas').getContext('2d');
    m.direction = 'rtl';

    /* قياس البطاقات */
    var cards = (data.items || []).map(function (it, i) {
      m.font = '500 ' + BODY + 'px ' + FONT;
      var lines = wrap(m, it.text, colW - INNER * 2);
      m.font = '700 ' + (BODY - 3) + 'px ' + FONT;
      var refLines = it.ref ? wrap(m, it.ref, colW - INNER * 2 - 20) : [];
      var h = HEAD_H + 20 + lines.length * LH + (refLines.length ? 14 + refLines.length * (LH - 6) + 10 : 0) + 22;
      return { it: it, i: i, lines: lines, refLines: refLines, h: h };
    });

    /* توزيع (أقصر عمود أولاً) */
    var colY = []; for (var c = 0; c < cols; c++) colY.push(0);
    cards.forEach(function (cd) {
      var k = colY.indexOf(Math.min.apply(null, colY));
      cd.col = k; cd.y = colY[k]; colY[k] += cd.h + GAP;
    });
    var bodyH = Math.max.apply(null, colY) - GAP;
    if (bodyH < 0) bodyH = 0;

    var TOP = data.subtitle ? 300 : 250, FOOT = 150;
    var H = Math.round(TOP + bodyH + FOOT);
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.direction = 'rtl';
    ctx.textBaseline = 'middle';

    var hb = theme.hues[0];
    /* خلفية */
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, hsl(theme.bg[0], theme.bg[1], theme.bg[2] + 2));
    g.addColorStop(1, hsl(theme.hues[1], 45, 94));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    /* رموز خفيفة منثورة في الخلفية */
    var rnd = seeded(7 + emojis.length * 13);
    ctx.textAlign = 'center';
    for (var n = 0; n < Math.round(H / 130); n++) {
      var e = emojis[Math.floor(rnd() * emojis.length)];
      var size = 50 + rnd() * 50;
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.translate(rnd() * W, rnd() * H);
      ctx.rotate((rnd() - 0.5) * 0.9);
      ctx.font = size + 'px ' + EMOJI_FONT;
      ctx.fillText(e, 0, 0);
      ctx.restore();
    }

    /* الترويسة */
    ctx.textAlign = 'center';
    ctx.font = '120px ' + EMOJI_FONT;
    ctx.fillText(emojis[0], PAD + 80, 110);
    ctx.fillText(emojis[1 % emojis.length], W - PAD - 80, 110);

    var title = data.title || 'قائمة التحضير';
    var tf = 68;
    ctx.font = '800 ' + tf + 'px ' + FONT;
    while (ctx.measureText(title).width > W - 420 && tf > 32) { tf -= 3; ctx.font = '800 ' + tf + 'px ' + FONT; }
    var tw = ctx.measureText(title).width + 70;
    ctx.fillStyle = hsl(hb, 70, 84);
    rrect(ctx, (W - tw) / 2, 62, tw, tf + 44, 40); ctx.fill();
    ctx.fillStyle = hsl(hb, 45, 22);
    ctx.fillText(title, W / 2, 62 + (tf + 44) / 2 + 2);

    if (data.subtitle) {
      ctx.font = '700 38px ' + FONT;
      var sw = ctx.measureText(data.subtitle).width + 60;
      ctx.fillStyle = hsl(theme.hues[2], 75, 88);
      rrect(ctx, (W - sw) / 2, 62 + tf + 70, sw, 62, 31); ctx.fill();
      ctx.fillStyle = hsl(theme.hues[2], 50, 26);
      ctx.fillText(data.subtitle, W / 2, 62 + tf + 70 + 33);
    }

    /* البطاقات */
    cards.forEach(function (cd) {
      var hue = theme.hues[cd.i % theme.hues.length];
      var xRight = W - PAD - cd.col * (colW + GAP);
      var x = xRight - colW, y = TOP + cd.y;

      ctx.save();
      ctx.shadowColor = hsl(hue, 40, 40, 0.18); ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
      ctx.fillStyle = hsl(hue, 80, 97);
      rrect(ctx, x, y, colW, cd.h, 28); ctx.fill();
      ctx.restore();
      ctx.lineWidth = 2.5; ctx.strokeStyle = hsl(hue, 60, 80);
      rrect(ctx, x, y, colW, cd.h, 28); ctx.stroke();

      /* شريط العنوان */
      ctx.fillStyle = hsl(hue, 70, 86);
      rrect(ctx, x + 10, y + 10, colW - 20, HEAD_H, 22); ctx.fill();

      /* دائرة الرقم */
      var r = HEAD_H / 2 - 6, cx = xRight - 10 - r - 8, cy = y + 10 + HEAD_H / 2;
      ctx.fillStyle = hsl(hue, 55, 42);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = '800 ' + (HEAD_F - 2) + 'px ' + FONT;
      ctx.fillText(toArabicDigits(cd.i + 1), cx, cy + 2);

      /* رمز تعبيري على يسار الشريط */
      ctx.font = (HEAD_H - 20) + 'px ' + EMOJI_FONT;
      ctx.fillText(emojis[cd.i % emojis.length], x + 10 + HEAD_H / 2 + 6, cy + 2);

      /* العنوان */
      var hf = HEAD_F, hs = cd.it.heading || '';
      ctx.font = '800 ' + hf + 'px ' + FONT;
      var avail = colW - 20 - (r * 2 + 30) - (HEAD_H + 16);
      while (ctx.measureText(hs).width > avail && hf > 18) { hf -= 2; ctx.font = '800 ' + hf + 'px ' + FONT; }
      ctx.textAlign = 'right'; ctx.fillStyle = hsl(hue, 50, 22);
      ctx.fillText(hs, cx - r - 14, cy + 2);

      /* النص */
      ctx.textAlign = 'right';
      ctx.fillStyle = hsl(hue, 25, 16);
      ctx.font = '500 ' + BODY + 'px ' + FONT;
      var ty = y + 10 + HEAD_H + 20 + LH / 2;
      cd.lines.forEach(function (ln) { ctx.fillText(ln, xRight - INNER, ty); ty += LH; });

      /* المرجع */
      if (cd.refLines.length) {
        var rh = cd.refLines.length * (LH - 6) + 16;
        ctx.fillStyle = hsl(hue, 70, 91);
        rrect(ctx, x + 14, ty - LH / 2 + 8, colW - 28, rh, 16); ctx.fill();
        ctx.fillStyle = hsl(hue, 55, 30);
        ctx.font = '700 ' + (BODY - 3) + 'px ' + FONT;
        var ry = ty - LH / 2 + 8 + 8 + (LH - 6) / 2;
        cd.refLines.forEach(function (ln) { ctx.fillText(ln, xRight - INNER - 8, ry); ry += LH - 6; });
      }
    });

    /* التذييل */
    ctx.textAlign = 'center';
    ctx.font = '54px ' + EMOJI_FONT;
    var fy = H - 90, step = 90, startX = W / 2 - (emojis.length - 1) * step / 2;
    emojis.forEach(function (e, k) { ctx.fillText(e, startX + k * step, fy); });
    ctx.font = '700 28px ' + FONT;
    ctx.fillStyle = hsl(hb, 35, 35, 0.8);
    ctx.fillText('خلوتي', W / 2, H - 36);
  }

  /* ---------- واجهة الاختيار ---------- */
  var cssDone = false;
  function injectCSS() {
    if (cssDone) return; cssDone = true;
    var s = document.createElement('style');
    s.textContent =
      '.kp-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;direction:rtl;font-family:' + FONT + '}' +
      '.kp-box{background:#fffdf8;width:100%;max-width:560px;max-height:94vh;overflow:auto;border-radius:22px 22px 0 0;padding:14px 14px 22px;box-sizing:border-box}' +
      '.kp-prev{background:#eee;border-radius:14px;padding:8px;max-height:46vh;overflow:auto;text-align:center}' +
      '.kp-prev canvas{width:100%;height:auto;border-radius:10px;display:block}' +
      '.kp-note{font-size:13px;color:#a65d4a;margin:8px 2px 0;min-height:0}' +
      '.kp-lbl{font-weight:700;font-size:14px;margin:14px 2px 6px;color:#444}' +
      '.kp-row{display:flex;flex-wrap:wrap;gap:8px}' +
      '.kp-chip{border:2px solid #ddd;background:#fff;border-radius:999px;padding:7px 12px;font:600 14px ' + FONT + ';cursor:pointer;display:flex;align-items:center;gap:6px}' +
      '.kp-chip.on{border-color:#4f8a3c;background:#eef7e8}' +
      '.kp-dot{width:16px;height:16px;border-radius:50%;display:inline-block}' +
      '.kp-in{width:100%;box-sizing:border-box;border:2px solid #ddd;border-radius:12px;padding:9px 12px;font:600 15px ' + FONT + ';direction:rtl}' +
      '.kp-act{display:flex;gap:8px;margin-top:16px}' +
      '.kp-btn{flex:1;border:0;border-radius:14px;padding:13px;font:800 15px ' + FONT + ';cursor:pointer;background:#4f8a3c;color:#fff}' +
      '.kp-btn.alt{background:#e9e4d6;color:#333}';
    document.head.appendChild(s);
  }

  function open(data) {
    injectCSS();
    data = data || { items: [] };
    var state = {
      theme: THEMES[0],
      set: EMOJI_SETS[0],
      custom: '',
      cols: 1,
      title: data.title || 'قائمة التحضير'
    };
    var ov = document.createElement('div'); ov.className = 'kp-ov';
    var box = document.createElement('div'); box.className = 'kp-box'; ov.appendChild(box);
    var prev = document.createElement('div'); prev.className = 'kp-prev';
    var canvas = document.createElement('canvas'); prev.appendChild(canvas); box.appendChild(prev);
    var note = document.createElement('div'); note.className = 'kp-note'; box.appendChild(note);

    function lbl(t) { var d = document.createElement('div'); d.className = 'kp-lbl'; d.textContent = t; box.appendChild(d); }
    function chip(parent, html, on, fn) {
      var b = document.createElement('button'); b.type = 'button';
      b.className = 'kp-chip' + (on ? ' on' : ''); b.innerHTML = html;
      b.onclick = fn; parent.appendChild(b); return b;
    }

    function currentEmojis() {
      var c = Array.from(state.custom.replace(/\s+/g, '')).filter(Boolean);
      return c.length ? c.slice(0, 6) : state.set.list;
    }
    var t;
    function redraw() {
      clearTimeout(t);
      t = setTimeout(function () {
        var go = function () {
          render(canvas, { title: state.title, subtitle: data.subtitle, items: data.items },
            { theme: state.theme, emojis: currentEmojis(), cols: state.cols });
          note.textContent = canvas.height > 14000 ? 'النص طويل جدًا — جرّبي «عمودان» أو قسّمي النص على صفحات أقصر عشان الصورة تطلع بوضوح.' : '';
        };
        (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go);
      }, 120);
    }

    /* العنوان */
    lbl('عنوان البوستر');
    var ti = document.createElement('input'); ti.className = 'kp-in'; ti.value = state.title;
    ti.oninput = function () { state.title = ti.value; redraw(); }; box.appendChild(ti);

    /* الألوان */
    lbl('الألوان');
    var rowT = document.createElement('div'); rowT.className = 'kp-row'; box.appendChild(rowT);
    function drawThemes() {
      rowT.innerHTML = '';
      THEMES.forEach(function (th) {
        chip(rowT, '<span class="kp-dot" style="background:' + hsl(th.hues[0], 65, 70) + '"></span>' + th.name,
          th === state.theme, function () { state.theme = th; drawThemes(); redraw(); });
      });
    }
    drawThemes();

    /* الرموز */
    lbl('الرموز التعبيرية');
    var rowE = document.createElement('div'); rowE.className = 'kp-row'; box.appendChild(rowE);
    function drawSets() {
      rowE.innerHTML = '';
      EMOJI_SETS.forEach(function (s) {
        chip(rowE, s.list.join(' '), !state.custom && s === state.set, function () {
          state.set = s; state.custom = ''; ci.value = ''; drawSets(); redraw();
        });
      });
    }
    var ci = document.createElement('input'); ci.className = 'kp-in'; ci.placeholder = 'أو اكتبي رموزك بنفسك: 🌹🕊️✝️';
    ci.style.marginTop = '8px';
    ci.oninput = function () { state.custom = ci.value; drawSets(); redraw(); };
    drawSets(); box.appendChild(ci);

    /* الأعمدة */
    lbl('التقسيم');
    var rowC = document.createElement('div'); rowC.className = 'kp-row'; box.appendChild(rowC);
    function drawCols() {
      rowC.innerHTML = '';
      chip(rowC, 'عمود واحد (كبير)', state.cols === 1, function () { state.cols = 1; drawCols(); redraw(); });
      chip(rowC, 'عمودان (مدمج)', state.cols === 2, function () { state.cols = 2; drawCols(); redraw(); });
    }
    drawCols();

    /* الأزرار */
    var act = document.createElement('div'); act.className = 'kp-act'; box.appendChild(act);
    function blob(cb) { canvas.toBlob(cb, 'image/png'); }
    var save = document.createElement('button'); save.className = 'kp-btn'; save.textContent = '⬇️ حفظ الصورة';
    save.onclick = function () {
      blob(function (b) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(b);
        a.download = 'khalwaty-poster.png'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      });
    };
    var share = document.createElement('button'); share.className = 'kp-btn alt'; share.textContent = '📤 مشاركة';
    share.onclick = function () {
      blob(function (b) {
        var f = new File([b], 'khalwaty-poster.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: state.title }).catch(function () {});
        else save.onclick();
      });
    };
    var close = document.createElement('button'); close.className = 'kp-btn alt'; close.textContent = 'إغلاق';
    close.onclick = function () { ov.remove(); };
    act.appendChild(save); act.appendChild(share); act.appendChild(close);

    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    redraw();
  }

  function attachButton(container, getData, label) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = label || '🎨 توليد بوستر';
    b.style.cssText = 'font:800 15px ' + FONT + ';padding:11px 16px;border:0;border-radius:14px;background:#4f8a3c;color:#fff;cursor:pointer';
    b.onclick = function () { open(typeof getData === 'function' ? getData() : getData); };
    container.appendChild(b); return b;
  }

  window.KhalwatyPoster = { open: open, attachButton: attachButton, THEMES: THEMES, EMOJI_SETS: EMOJI_SETS };
})();

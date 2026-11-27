/**
 * Khalwaty Smart Tafsir — Cloudflare Worker
 * Deploy: wrangler deploy (or paste into Cloudflare Workers editor)
 * Secret required: OPENAI_API_KEY
 * Optional: OPENAI_MODEL (default gpt-4o-mini)
 *
 * Compatible with خلوتي app fetch contract:
 *  GET  -> { ok, service, ready, version }
 *  POST -> chapter | verse | linguistic
 */

const VERSION = 8;
const SERVICE = 'Khalwaty Smart Tafsir';
const ALLOWED_ORIGINS = [
  'https://vivian00shafik-crypto.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.some((o) => origin === o || origin.startsWith(o))
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    Vary: 'Origin'
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: corsHeaders(origin || '')
  });
}

const CHAPTER_SYSTEM = `أنت «مُفسّر | خلوة اليوم» وفق التعليم الأرثوذكسي القبطي.
فسّر الإصحاح كاملًا بالهيكل التالي وبالعربية البسيطة:

مقدمة الإصحاح
(خلفية وسياق مختصران، بلا كلام عام فارغ)

أولًا: [عنوان موضوعي] (ع س–ص)
* شرح المعنى والسبب والنتيجة والرموز إن وُجدت
* لا تعد لصق نص الآيات
* ادمج معاني الكلمات الصعبة المرفقة داخل الجمل طبيعيًا

ثانيًا: ...
(أكمل حسب تسلسل الأفكار)

المعنى الروحي
* نقاط

تطبيق عملي
* خطوة واحدة قابلة للتنفيذ

ملخص الإصحاح
* نقاط مختصرة

قواعد صارمة:
- لا تكرر نفس الجملة على آيات متعددة
- لا تخترع تاريخًا أو لاهوتًا
- لا تنسب قولًا لقديس بلا مصدر
- ميّز بين نص الكتاب والتفسير
- راعِ التقليد القبطي الأرثوذكسي`;

const VERSE_SYSTEM = `أنت مفسّر أرثوذكسي قبطي. اشرح الآية شرحًا واضحًا مختصرًا:
المعنى في السياق، أي كلمة صعبة، والبعد الروحي العملي.
لا تعد نص الآية كاملًا. لا تخترع معلومات.`;

const LINGUISTIC_SYSTEM = `أنت مساعد لغوي لنص فانديك العربي.
استخرج الكلمات الصعبة أو غير المألوفة من النص وأعطِ لكل كلمة معنى موجزًا في السياق.
أرجع JSON فقط بالشكل: {"words":[{"word":"...","meaning":"..."}]}`;

async function callOpenAI(env, messages, maxTokens) {
  const key = env.OPENAI_API_KEY;
  if (!key) return { error: 'ai_unavailable', detail: 'OPENAI_API_KEY missing' };
  const model = env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: maxTokens || 2500,
      messages
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    return { error: 'ai_unavailable', detail: 'openai_http_' + res.status, body: t.slice(0, 300) };
  }
  const data = await res.json();
  const text = (((data || {}).choices || [])[0] || {}).message || {};
  return { text: String(text.content || '').trim() };
}

function buildLexiconBlock(lex) {
  if (!Array.isArray(lex) || !lex.length) return '';
  return (
    '\n\nكلمات صعبة للمساعدة (ادمجها في الشرح عند الحاجة):\n' +
    lex
      .slice(0, 20)
      .map((x) => '- ' + (x.word || '') + ': ' + (x.meaning || ''))
      .join('\n')
  );
}

function splitLongChapter(verseText, maxChunk) {
  const lines = String(verseText || '').split(/\n+/).filter(Boolean);
  if (String(verseText || '').length <= maxChunk) return [verseText];
  const chunks = [];
  let buf = [];
  let size = 0;
  for (const line of lines) {
    if (size + line.length > maxChunk && buf.length) {
      chunks.push(buf.join('\n'));
      buf = [];
      size = 0;
    }
    buf.push(line);
    size += line.length + 1;
  }
  if (buf.length) chunks.push(buf.join('\n'));
  return chunks;
}

async function handleChapter(body, env) {
  const ref = String(body.ref || '').trim();
  const verseText = String(body.verseText || '').trim();
  const systemPrompt = String(body.systemPrompt || CHAPTER_SYSTEM).trim() || CHAPTER_SYSTEM;
  const instruction = String(body.instruction || '').trim();
  const lex = body.lexiconAssist || [];
  const verseCount = body.verseCount || 0;

  if (!verseText) return { ok: false, error: 'missing_verseText' };

  // لا نقصّ عند 1800 — نمرّر كاملًا مع تقسيم داخلي إن لزم
  const chunks = splitLongChapter(verseText, 6000);
  const parts = [];

  for (let i = 0; i < chunks.length; i++) {
    const user =
      'المرجع: ' +
      ref +
      (verseCount ? '\nعدد الآيات: ' + verseCount : '') +
      (chunks.length > 1 ? '\nجزء ' + (i + 1) + ' من ' + chunks.length : '') +
      '\n\nنص الإصحاح:\n' +
      chunks[i] +
      buildLexiconBlock(lex) +
      (instruction ? '\n\nتعليمات إضافية:\n' + instruction : '') +
      (chunks.length > 1 && i > 0
        ? '\n\nأكمل نفس هيكل التفسير دون تكرار المقدمة إن وُجدت في جزء سابق؛ ركّز على هذا الجزء.'
        : '');

    const r = await callOpenAI(
      env,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: user }
      ],
      chunks.length > 1 ? 1800 : 3200
    );
    if (r.error) return { ok: false, error: r.error, detail: r.detail || '' };
    parts.push(r.text);
  }

  const text = parts.join('\n\n').trim();
  return {
    ok: true,
    mode: 'ai',
    text,
    tafsir: text,
    content: text,
    disclaimer: 'تفسير مبسّط للاستفادة الروحية؛ للرجوع العلمي راجع التفاسير الكنسية الموثوقة.',
    chapter: true,
    version: VERSION
  };
}

async function handleVerse(body, env) {
  const ref = String(body.ref || '').trim();
  const verseText = String(body.verseText || '').trim();
  if (!verseText) return { ok: false, error: 'missing_verseText' };
  const lex = body.lexiconAssist || [];
  const user =
    'المرجع: ' + ref + '\nالآية:\n' + verseText + buildLexiconBlock(lex);
  const r = await callOpenAI(
    env,
    [
      { role: 'system', content: VERSE_SYSTEM },
      { role: 'user', content: user }
    ],
    1200
  );
  if (r.error) return { ok: false, error: r.error, detail: r.detail || '' };
  return {
    ok: true,
    mode: 'ai',
    text: r.text,
    tafsir: r.text,
    disclaimer: 'تفسير مبسّط للاستفادة الروحية.',
    version: VERSION
  };
}

async function handleLinguistic(body, env) {
  const verseText = String(body.verseText || '').trim();
  if (!verseText) return { ok: false, error: 'missing_verseText' };
  const r = await callOpenAI(
    env,
    [
      { role: 'system', content: LINGUISTIC_SYSTEM },
      { role: 'user', content: verseText }
    ],
    1000
  );
  if (r.error) return { ok: false, error: r.error, detail: r.detail || '' };
  let words = [];
  try {
    const m = r.text.match(/\{[\s\S]*\}/);
    if (m) {
      const j = JSON.parse(m[0]);
      if (Array.isArray(j.words)) words = j.words;
    }
  } catch (e) {}
  return {
    ok: true,
    mode: 'linguistic',
    words,
    text: r.text,
    version: VERSION
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method === 'GET') {
      return json(
        {
          ok: true,
          service: SERVICE,
          ready: !!env.OPENAI_API_KEY,
          version: VERSION
        },
        200,
        origin
      );
    }
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
    }

    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      return json({ ok: false, error: 'invalid_json' }, 400, origin);
    }

    try {
      const mode = String(body.mode || '').toLowerCase();
      let result;
      if (mode === 'linguistic') result = await handleLinguistic(body, env);
      else if (mode === 'chapter' || body.chapter === true) result = await handleChapter(body, env);
      else result = await handleVerse(body, env);

      if (result && result.ok === false) {
        return json(result, 503, origin);
      }
      return json(result, 200, origin);
    } catch (err) {
      return json(
        { ok: false, error: 'server_error', detail: String((err && err.message) || err) },
        500,
        origin
      );
    }
  }
};

const VERSION = "12.0";
const MODEL = "@cf/meta/llama-3.1-8b-instruct";

const ORIGINS = [
  "https://vivian00shafik-crypto.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:5500"
];

const CHAPTER_RULES = `
أنت مفسر متخصص في الكتاب المقدس من منظور قبطي أرثوذكسي.

مهمتك تفسير النص الكتابي المرسل فعلًا، وليس إنتاج كلام عام.

قواعد أساسية:
- اقرأ النص كاملًا قبل التفسير.
- لا تخترع أحداثًا أو كلمات أو أسبابًا أو رموزًا.
- لا تذكر كلمة صعبة غير موجودة في النص.
- لا تكرر نفس المعنى في أكثر من موضع.
- لا تستخدم عبارات وعظية عامة بدل شرح الآيات.
- قسّم الإصحاح حسب انتقال الموضوع والأحداث، وليس حسب عدد ثابت من الآيات.
- التزم بأرقام الآيات الصحيحة.
- اشرح المعنى المباشر أولًا، ثم المعنى الروحي.
- اذكر الرموز والنبوات فقط إذا كان لها أساس كتابي وتفسيري.
- لا تنسب أقوالًا للآباء دون مصدر موثوق.
- إذا لم تتوفر معلومة، لا تخمّنها.

اكتب بهذا الترتيب:

# شرح الإصحاح

## مقدمة
موضوع الإصحاح وسياقه في السفر.

## شرح الإصحاح
قسّم الإصحاح إلى مقاطع حسب المعنى.

لكل مقطع:
### عنوان يعبّر عن موضوعه (أرقام الآيات)
- شرح الآيات: وضّح ما يحدث ومعنى الكلام وسبب الأحداث ونتائجها.
- المعنى الروحي: استخرج معنى محددًا من المقطع.
- الكلمات الصعبة: اذكر الكلمات الموجودة فعلًا فقط.
- الرموز والنبوات: عند وجود أساس واضح فقط.

## الدروس المستفادة
3 إلى 5 نقاط مستخرجة من الإصحاح.

## تدريب عملي
تدريب واقعي محدد مستخرج من موضوع الإصحاح، مع ربطه بآية أو موقف.
يجب أن يختلف التدريب باختلاف الإصحاح.

## ملخص الإصحاح
خلاصة قصيرة لأهم ما يعلّمه الإصحاح.

ممنوع تكرار العناوين أو ملء الأقسام بكلام إنشائي.
يجب أن يحتوي كل مقطع على شرح حقيقي للآيات.
`;

const VERSE_RULES = `
أنت مفسر كتابي قبطي أرثوذكسي.
اشرح الآية المرسلة:
1. المعنى المباشر.
2. شرح الكلمات والتعبيرات الصعبة.
3. سياق الآية.
4. المعنى الروحي.
5. الرمز أو النبوة إن وجد أساس واضح.
لا تخترع معلومات ولا تكرر نص الآية.
استخدم العربية البسيطة والنقاط الواضحة.
`;

const WORD_RULES = `
اشرح الكلمات الصعبة الموجودة فعلًا في النص المرسل.
لكل كلمة اذكر:
- الكلمة.
- معناها اللغوي.
- معناها في سياق الآية.
- رقم الآية إن توفر.
لا تضف كلمات من خارج النص.
`;

async function ask(env, system, prompt, tokens = 6500) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("مفتاح OPENAI_API_KEY غير موجود.");
  }

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt }
        ],
        temperature: 0.25,
        max_tokens: tokens
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "خطأ في خدمة التفسير.");
  }

  const result = data?.choices?.[0]?.message?.content;
  if (!result) throw new Error("لم يصل رد من نموذج التفسير.");

  return result.trim();
}

function getText(b) {
  return String(
    b.chapterText || b.bibleText || b.scriptureText ||
    b.text || b.content || b.verseText || ""
  ).trim();
}

function getMode(b) {
  const m = String(b.mode || b.type || b.action || "").toLowerCase();
  if (m === "image") return "image";
  if (["linguistic", "words", "dictionary"].includes(m)) return "linguistic";
  if (["verse", "single-verse", "ayat"].includes(m)) return "verse";
  if (m === "chapter" || b.chapter === true) return "chapter";
  return b.ref ? "verse" : "chapter";
}

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(origin)
      ? origin : ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin"
  };
}

function reply(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function interpret(env, b, text, mode) {
  const book = b.book || b.bookName || "غير محدد";
  const chapter = (typeof b.chapter === "boolean" ? b.chapterNumber : b.chapter) || b.chapterNumber || "غير محدد";
  const context = `السفر: ${book}\nالإصحاح: ${chapter}\n` + (b.ref ? `المرجع: ${b.ref}\n` : "");
  const lex = Array.isArray(b.lexiconAssist) && b.lexiconAssist.length
    ? "\nكلمات صعبة مساعدة (استخدم الموجود في النص فقط):\n" + b.lexiconAssist.slice(0, 25).join("\n") + "\n" : "";

  if (mode === "verse") {
    return ask(env, VERSE_RULES, context + "\nالنص:\n" + text + lex, 3000);
  }

  if (mode === "linguistic") {
    return ask(env, WORD_RULES, context + "\nالنص:\n" + text, 3000);
  }

  if (Number(b.totalParts) > 1) {
    const p = Number(b.part) || 1, n = Number(b.totalParts);
    let d = `هذا المقطع ${p} من ${n} من الإصحاح (الآيات ${b.fromVerse}–${b.toVerse} من ${b.verseCount}). `;
    if (p === 1) d += "ابدأ بـ «## مقدمة» عن الإصحاح كله ثم المقاطع، ولا تكتب الدروس أو التدريب أو الملخص الآن.";
    else if (p < n) d += "اكتب مقاطع هذه الآيات فقط (### عنوان (أرقام الآيات)) بلا مقدمة ولا دروس ولا تدريب ولا ملخص، ولا تكرر ما سبق.";
    else d += "اكتب مقاطع هذه الآيات بلا مقدمة، ثم اختم عن الإصحاح كله بـ «## الدروس المستفادة» و«## تدريب عملي» و«## ملخص الإصحاح» اعتمادًا على العناوين السابقة وهذا المقطع.";
    const prev = b.previousSummary ? "\nما سبق (للربط وعدم التكرار):\n" + b.previousSummary + "\n" : "";
    return ask(env, CHAPTER_RULES + "\nمهم: التزم بتعليمات المقطع أدناه حتى لو خالفت الترتيب أعلاه.", context + d + prev + "\nالنص:\n" + text + lex, 3500);
  }

  const previous = b.previousTrainings || b.trainingHistory || "";
  const prompt = `
${context}

النص الكتابي الكامل:
${text}
${lex}
تدريبات سابقة لتجنب تكرارها:
${Array.isArray(previous) ? previous.join("\n") : previous}

فسّر الإصحاح كاملًا وفق التعليمات.
لا تكتب تفسيرًا قبل قراءة النص.
`;

  const draft = await ask(env, CHAPTER_RULES, prompt, 6500);

  const reviewed = await ask(env, `
أنت مراجع للتفسير الكتابي.
قارن التفسير بالنص الأصلي.
صحح أرقام الآيات.
احذف الكلمات غير الموجودة في النص.
احذف الرموز غير المثبتة والتكرار والكلام العام.
تأكد أن كل مقطع يحتوي على شرح فعلي.
لا تضف معلومات غير مؤكدة.
أخرج التفسير النهائي فقط.
`, `
النص الأصلي:
${text}

التفسير:
${draft}

${context}
`, 6500);

  return reviewed;
}

export default {
  async fetch(request, env) {
    const headers = cors(request.headers.get("Origin") || "");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method === "GET") {
      return reply({
        success: true,
        status: "online",
        version: VERSION,
        ready: !!env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL || "gpt-4o-mini"
      }, 200, headers);
    }

    if (request.method !== "POST") {
      return reply({ success: false, error: "Method not allowed." }, 405, headers);
    }

    try {
      const body = await request.json();
      if (getMode(body) === "image") {
        return reply({ success: false, ok: false, error: "image_unavailable", detail: "توليد الصور غير مفعّل في هذا الـ Worker" }, 501, headers);
      }
      const text = getText(body);
      const mode = getMode(body);

      if (!text) {
        return reply({
          success: false,
          error: "نص الإصحاح غير موجود. افتحي الإصحاح من الكتاب أولًا."
        }, 400, headers);
      }

      if (text.length > 50000) {
        return reply({
          success: false,
          error: "النص أطول من الحد المسموح."
        }, 413, headers);
      }

      const result = await interpret(env, body, text, mode);

      return reply({
        success: true,
        ok: true,
        version: VERSION,
        mode,
        result,
        text: result,
        tafsir: result,
        content: result,
        answer: result,
        interpretation: result
      }, 200, headers);

    } catch (error) {
      return reply({
        success: false,
        ok: false,
        version: VERSION,
        error: error.message || "حدث خطأ أثناء التفسير."
      }, 500, headers);
    }
  }
};

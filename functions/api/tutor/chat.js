import { getCookie, verifyJWT } from '../auth/_helpers.js';

const SYSTEM_PROMPT = `Eres un tutor experto especialista en matemáticas para la PAES (Prueba de Acceso a la Educación Superior) de Chile. Tu nombre es "Tutor PreuOnline".

REGLAS ESTRICTAS:
1. SOLO respondes preguntas relacionadas con matemáticas. Si te preguntan sobre cualquier otro tema (historia, ciencias, programación, etc.), responde amablemente: "Lo siento, soy un tutor especializado exclusivamente en matemáticas. Solo puedo ayudarte con ejercicios y conceptos matemáticos."
2. Resuelves ejercicios paso a paso, explicando cada procedimiento de forma clara.
3. Si te envían una imagen, analízala y resuelve los ejercicios matemáticos que aparezcan.
4. Usa notación matemática clara. Para fracciones usa a/b, para potencias usa x^n, para raíces usa √x.
5. Siempre verifica tus cálculos antes de responder.
6. Sé motivador y paciente con el estudiante.
7. Si el ejercicio tiene múltiples formas de resolverse, muestra la más eficiente.
8. Al final de cada resolución, indica el tema PAES relacionado (Álgebra, Geometría, Probabilidad y Estadística, Números).
9. Si el estudiante te pide que le expliques un concepto, hazlo con ejemplos concretos.
10. Responde siempre en español.

TEMAS QUE DOMINAS:
- Números y operaciones (fracciones, decimales, porcentajes, razones, proporciones)
- Álgebra (ecuaciones, inecuaciones, sistemas, funciones, polinomios, factorización)
- Geometría (figuras planas, cuerpos geométricos, teorema de Pitágoras, trigonometría, áreas, volúmenes)
- Probabilidad y Estadística (combinatoria, probabilidades, medidas de tendencia central, gráficos)
- Cálculo (límites, derivadas, integrales básicas)
- Lógica y conjuntos`;

export async function onRequestPost(context) {
  const { request, env } = context;

  // Verify student is authenticated
  const token = getCookie(request, 'token');
  if (!token) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) {
    return Response.json({ ok: false, error: 'Sesión expirada' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { messages, image } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ ok: false, error: 'Mensaje vacío' }, { status: 400 });
    }

    // Build Gemini request
    const geminiContents = messages.map(msg => {
      const parts = [];

      if (msg.text) {
        parts.push({ text: msg.text });
      }

      // If this is the last message and has an image
      if (msg.image) {
        parts.push({
          inlineData: {
            mimeType: msg.image.mimeType,
            data: msg.image.data
          }
        });
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts
      };
    });

    const geminiBody = {
      contents: geminiContents,
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    };

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ ok: false, error: 'API key no configurada' }, { status: 500 });
    }

    const result = await callGeminiWithFallback(env, apiKey, geminiBody);
    if (result.ok) {
      return Response.json({ ok: true, response: result.text, model: result.model });
    }
    return Response.json({ ok: false, error: result.error }, { status: result.status || 502 });

  } catch (err) {
    console.error('Tutor chat error:', err);
    return Response.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ── Gemini call with retries + fallback models ──
// Order matters: first the main model, then lighter ones that are usually less congested.
// Can be overridden with a GEMINI_MODELS env var (comma-separated).
const DEFAULT_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
const TRIES_PER_MODEL = 2;
const REQUEST_TIMEOUT_MS = 25000;
const TOTAL_BUDGET_MS = 55000;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function callGeminiWithFallback(env, apiKey, body) {
  const models = (env.GEMINI_MODELS || '').split(',').map(m => m.trim()).filter(Boolean);
  const chain = models.length ? models : DEFAULT_MODELS;
  const started = Date.now();
  let lastStatus = 0;
  let lastMessage = '';

  for (const model of chain) {
    for (let attempt = 1; attempt <= TRIES_PER_MODEL; attempt++) {
      const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
      if (remaining < 3000) break;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), Math.min(REQUEST_TIMEOUT_MS, remaining));
      let res;
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: ctrl.signal
          }
        );
      } catch (err) {
        clearTimeout(timer);
        lastStatus = 504;
        lastMessage = err.name === 'AbortError' ? 'tiempo de espera agotado' : err.message;
        console.error(`Gemini ${model} intento ${attempt}: ${lastMessage}`);
        await sleep(backoff(attempt));
        continue;
      }
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const text = parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
        if (text) return { ok: true, text, model };

        // Blocked by safety filters: retrying won't help
        const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason;
        if (reason === 'SAFETY' || reason === 'PROHIBITED_CONTENT' || data.promptFeedback?.blockReason) {
          return { ok: false, status: 400, error: 'No puedo responder ese mensaje. Intenta reformular tu pregunta de matemáticas.' };
        }
        lastStatus = 502;
        lastMessage = 'respuesta vacía' + (reason ? ` (${reason})` : '');
        console.error(`Gemini ${model} intento ${attempt}: ${lastMessage}`);
        continue;
      }

      const errText = await res.text();
      let detail = errText;
      try { detail = JSON.parse(errText).error?.message || errText; } catch {}
      lastStatus = res.status;
      lastMessage = detail;
      console.error(`Gemini ${model} intento ${attempt}: ${res.status} ${detail}`);

      // 400 = bad request (e.g. unreadable image), 401/403 = bad API key: no point retrying
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        return { ok: false, status: res.status, error: friendlyError(res.status, detail) };
      }
      // 404 = model not available: jump straight to the next model
      if (res.status === 404) break;
      // 429 / 5xx: wait and retry, then move to the next model
      if (attempt < TRIES_PER_MODEL) await sleep(backoff(attempt));
    }
  }

  return { ok: false, status: 503, error: friendlyError(lastStatus, lastMessage) };
}

function backoff(attempt) {
  return 1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 500);
}

function friendlyError(status, detail) {
  if (status === 400) return 'No pude leer tu mensaje o la imagen. Prueba con otra foto o escribe el ejercicio.';
  if (status === 401 || status === 403) return 'El tutor no está bien configurado. Avisa al administrador.';
  if (status === 429) return 'El tutor está recibiendo muchas preguntas en este momento. Espera un minuto e intenta de nuevo. (código 429)';
  return `El tutor tiene mucha demanda en este momento. Espera unos segundos e intenta de nuevo. (código ${status || 'red'})`;
}

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
        maxOutputTokens: 4096
      }
    };

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ ok: false, error: 'API key no configurada' }, { status: 500 });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.text();
      console.error('Gemini API error:', errData);
      // Return the actual error for debugging
      let detail = 'Error al contactar el tutor IA';
      try {
        const parsed = JSON.parse(errData);
        detail = parsed.error?.message || detail;
      } catch {}
      return Response.json({ ok: false, error: detail }, { status: 502 });
    }

    const geminiData = await geminiRes.json();

    // Extract response text
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude generar una respuesta. Intenta de nuevo.';

    return Response.json({ ok: true, response: responseText });

  } catch (err) {
    console.error('Tutor chat error:', err);
    return Response.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

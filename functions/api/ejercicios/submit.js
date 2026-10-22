import { getUser, json, error } from '../auth/_helpers.js';
import { getIntentosTema, MAX_INTENTOS } from './_intentos.js';

// POST /api/ejercicios/submit — save exercise results (max 2 attempts per topic)
export async function onRequestPost(context) {
  const user = await getUser(context.request, context.env);
  if (!user) return error('No autorizado', 401);

  try {
    const body = await context.request.json();
    const { topic, total, correctas, incorrectas, omitidas, tiempo_usado } = body;

    if (!topic || !total || total < 1) {
      return error('Datos incompletos');
    }

    if (correctas + incorrectas + omitidas !== total) {
      return error('Los totales no coinciden');
    }

    const usados = await getIntentosTema(context.env, user.id, topic);
    if (usados >= MAX_INTENTOS) {
      return error(`Has alcanzado el máximo de ${MAX_INTENTOS} intentos para este tema. Contacta a tu administrador para reiniciar los intentos.`, 403);
    }

    await context.env.DB.prepare(
      `INSERT INTO exercise_results (user_id, topic, total, correctas, incorrectas, omitidas, tiempo_usado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(user.id, topic, total, correctas || 0, incorrectas || 0, omitidas || 0, tiempo_usado || 0).run();

    return json({
      ok: true,
      message: 'Resultado guardado',
      intentosUsados: usados + 1,
      intentosRestantes: MAX_INTENTOS - (usados + 1)
    });
  } catch (err) {
    return error('Error al guardar resultado', 500);
  }
}

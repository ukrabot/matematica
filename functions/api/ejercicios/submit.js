import { getUser, json, error } from '../auth/_helpers.js';

// POST /api/ejercicios/submit — save exercise results
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

    await context.env.DB.prepare(
      `INSERT INTO exercise_results (user_id, topic, total, correctas, incorrectas, omitidas, tiempo_usado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(user.id, topic, total, correctas || 0, incorrectas || 0, omitidas || 0, tiempo_usado || 0).run();

    return json({ ok: true, message: 'Resultado guardado' });
  } catch (err) {
    return error('Error al guardar resultado', 500);
  }
}

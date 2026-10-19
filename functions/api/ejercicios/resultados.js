import { getUser, json, error } from '../auth/_helpers.js';

// GET /api/ejercicios/resultados — get student's exercise results
export async function onRequestGet(context) {
  const user = await getUser(context.request, context.env);
  if (!user) return error('No autorizado', 401);

  try {
    const { results } = await context.env.DB.prepare(
      `SELECT id, topic, total, correctas, incorrectas, omitidas, tiempo_usado, created_at
       FROM exercise_results
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`
    ).bind(user.id).all();

    // Summary stats
    let totalEjercicios = 0;
    let totalCorrectas = 0;
    let totalIncorrectas = 0;
    let totalOmitidas = 0;

    for (const r of results) {
      totalEjercicios += r.total;
      totalCorrectas += r.correctas;
      totalIncorrectas += r.incorrectas;
      totalOmitidas += r.omitidas;
    }

    return json({
      ok: true,
      resultados: results,
      resumen: {
        intentos: results.length,
        totalEjercicios,
        totalCorrectas,
        totalIncorrectas,
        totalOmitidas
      }
    });
  } catch (err) {
    return error('Error al obtener resultados', 500);
  }
}

import { getAdmin, json, error } from '../../_helpers.js';

// GET /api/admin/estudiantes/:id/resultados — get a student's exercise results
export async function onRequestGet(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  const userId = context.params.id;

  try {
    // Verify student exists
    const { results: userCheck } = await context.env.DB.prepare(
      'SELECT id, nombre, apellido FROM users WHERE id = ?'
    ).bind(userId).all();

    if (!userCheck.length) return error('Estudiante no encontrado', 404);

    // Get exercise results
    const { results } = await context.env.DB.prepare(
      `SELECT id, topic, total, correctas, incorrectas, omitidas, tiempo_usado, created_at
       FROM exercise_results
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`
    ).bind(userId).all();

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
      estudiante: userCheck[0],
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

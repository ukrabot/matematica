import { getUser, json, error } from '../auth/_helpers.js';

// GET /api/ejercicios/intentos — get attempt counts per topic for the logged-in student
export async function onRequestGet(context) {
  const user = await getUser(context.request, context.env);
  if (!user) return error('No autorizado', 401);

  try {
    // Get global reset timestamp
    const globalResetRow = await context.env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'global_attempts_reset_at'"
    ).first();
    const globalResetAt = globalResetRow?.value || '';

    // Get per-student reset timestamp
    const studentRow = await context.env.DB.prepare(
      "SELECT attempts_reset_at FROM users WHERE id = ?"
    ).bind(user.id).first();
    const studentResetAt = studentRow?.attempts_reset_at || '';

    // Use the most recent reset
    let resetAfter = '';
    if (globalResetAt && studentResetAt) {
      resetAfter = globalResetAt > studentResetAt ? globalResetAt : studentResetAt;
    } else {
      resetAfter = globalResetAt || studentResetAt || '';
    }

    // Count attempts per topic after the reset
    let results;
    if (resetAfter) {
      const resp = await context.env.DB.prepare(
        "SELECT topic, COUNT(*) as intentos FROM exercise_results WHERE user_id = ? AND created_at > ? GROUP BY topic"
      ).bind(user.id, resetAfter).all();
      results = resp.results;
    } else {
      const resp = await context.env.DB.prepare(
        "SELECT topic, COUNT(*) as intentos FROM exercise_results WHERE user_id = ? GROUP BY topic"
      ).bind(user.id).all();
      results = resp.results;
    }

    // Build map: topic -> attempt count
    const intentos = {};
    for (const row of results) {
      intentos[row.topic] = row.intentos;
    }

    return json({ ok: true, intentos, max: 2 });
  } catch (err) {
    return error('Error al obtener intentos', 500);
  }
}

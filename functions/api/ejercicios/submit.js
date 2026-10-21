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

    // ── Check 2-attempt limit ──
    // Get global reset timestamp from settings
    const globalResetRow = await context.env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'global_attempts_reset_at'"
    ).first();
    const globalResetAt = globalResetRow?.value || '';

    // Get per-student reset timestamp
    const studentRow = await context.env.DB.prepare(
      "SELECT attempts_reset_at FROM users WHERE id = ?"
    ).bind(user.id).first();
    const studentResetAt = studentRow?.attempts_reset_at || '';

    // Use the most recent reset (whichever is later)
    let resetAfter = '';
    if (globalResetAt && studentResetAt) {
      resetAfter = globalResetAt > studentResetAt ? globalResetAt : studentResetAt;
    } else {
      resetAfter = globalResetAt || studentResetAt || '';
    }

    // Count attempts for this topic after the reset
    let attemptCount;
    if (resetAfter) {
      const countRow = await context.env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM exercise_results WHERE user_id = ? AND topic = ? AND created_at > ?"
      ).bind(user.id, topic, resetAfter).first();
      attemptCount = countRow?.cnt || 0;
    } else {
      const countRow = await context.env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM exercise_results WHERE user_id = ? AND topic = ?"
      ).bind(user.id, topic).first();
      attemptCount = countRow?.cnt || 0;
    }

    if (attemptCount >= 2) {
      return error('Has alcanzado el máximo de 2 intentos para este tema. Contacta a tu administrador para reiniciar los intentos.', 403);
    }

    await context.env.DB.prepare(
      `INSERT INTO exercise_results (user_id, topic, total, correctas, incorrectas, omitidas, tiempo_usado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(user.id, topic, total, correctas || 0, incorrectas || 0, omitidas || 0, tiempo_usado || 0).run();

    return json({ ok: true, message: 'Resultado guardado', intentosRestantes: 1 - (attemptCount) });
  } catch (err) {
    return error('Error al guardar resultado', 500);
  }
}

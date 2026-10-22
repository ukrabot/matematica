import { getAdmin, json, error } from './_helpers.js';

// POST /api/admin/reset-intentos — reset exercise attempts for ALL students
export async function onRequestPost(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  try {
    await context.env.DB.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('global_attempts_reset_at', datetime('now'), CURRENT_TIMESTAMP) " +
      "ON CONFLICT(key) DO UPDATE SET value = datetime('now'), updated_at = CURRENT_TIMESTAMP"
    ).run();

    return json({ ok: true, message: 'Intentos reiniciados para todos los estudiantes' });
  } catch (err) {
    return error('Error al reiniciar intentos', 500);
  }
}

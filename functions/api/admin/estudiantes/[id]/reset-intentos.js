import { getAdmin, json, error } from '../../_helpers.js';

// POST /api/admin/estudiantes/:id/reset-intentos — reset attempts for one student
export async function onRequestPost(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  const id = context.params.id;

  try {
    // Set attempts_reset_at to current UTC timestamp
    const now = new Date().toISOString();
    const result = await context.env.DB.prepare(
      'UPDATE users SET attempts_reset_at = ? WHERE id = ?'
    ).bind(now, id).run();

    if (result.meta.changes === 0) {
      return error('Estudiante no encontrado', 404);
    }

    return json({ ok: true, message: 'Intentos reiniciados para el estudiante' });
  } catch (err) {
    return error('Error al reiniciar intentos', 500);
  }
}

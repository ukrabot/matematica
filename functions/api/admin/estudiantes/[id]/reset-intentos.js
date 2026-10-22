import { getAdmin, json, error } from '../../_helpers.js';
import { ensureSchema } from '../../../auth/_helpers.js';

// POST /api/admin/estudiantes/:id/reset-intentos — reset exercise attempts for one student
export async function onRequestPost(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  try {
    await ensureSchema(context.env);
    const result = await context.env.DB.prepare(
      "UPDATE users SET attempts_reset_at = datetime('now') WHERE id = ?"
    ).bind(context.params.id).run();

    if (result.meta.changes === 0) {
      return error('Estudiante no encontrado', 404);
    }

    return json({ ok: true, message: 'Intentos reiniciados para el estudiante' });
  } catch (err) {
    return error('Error al reiniciar intentos', 500);
  }
}

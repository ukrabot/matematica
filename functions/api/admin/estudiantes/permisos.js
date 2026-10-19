import { getAdmin, json, error } from '../_helpers.js';

// PUT /api/admin/estudiantes/permisos — bulk update all students' permissions
export async function onRequestPut(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  try {
    const body = await context.request.json();
    const { perm_tutor, perm_evaluacion, perm_ejercicios, perm_materiales, perm_resultados } = body;

    const fields = [];
    const values = [];

    if (perm_tutor !== undefined)     { fields.push('perm_tutor = ?');     values.push(perm_tutor ? 1 : 0); }
    if (perm_evaluacion !== undefined) { fields.push('perm_evaluacion = ?'); values.push(perm_evaluacion ? 1 : 0); }
    if (perm_ejercicios !== undefined) { fields.push('perm_ejercicios = ?'); values.push(perm_ejercicios ? 1 : 0); }
    if (perm_materiales !== undefined) { fields.push('perm_materiales = ?'); values.push(perm_materiales ? 1 : 0); }
    if (perm_resultados !== undefined) { fields.push('perm_resultados = ?'); values.push(perm_resultados ? 1 : 0); }

    if (fields.length === 0) {
      return error('No se proporcionaron permisos para actualizar');
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    await context.env.DB.prepare(
      `UPDATE users SET ${fields.join(', ')}`
    ).bind(...values).run();

    return json({ ok: true, message: 'Permisos actualizados para todos los estudiantes' });
  } catch (err) {
    return error('Error al actualizar permisos: ' + err.message, 500);
  }
}

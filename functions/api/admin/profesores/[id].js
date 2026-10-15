import { getAdmin, json, error, hashPassword, generateSalt } from '../_helpers.js';

// GET /api/admin/profesores/:id
export async function onRequestGet(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  const id = context.params.id;
  const { results } = await context.env.DB.prepare(
    'SELECT id, nombre, apellido, email, telefono, especialidad, rut, activo, created_at FROM teachers WHERE id = ?'
  ).bind(id).all();

  if (!results[0]) return error('Profesor no encontrado', 404);
  return json({ ok: true, profesor: results[0] });
}

// PUT /api/admin/profesores/:id — update professor info
export async function onRequestPut(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  const id = context.params.id;

  try {
    const body = await context.request.json();
    const { nombre, apellido, email, telefono, especialidad, rut, newPassword, activo } = body;

    // If password update requested
    if (newPassword) {
      if (newPassword.length < 6) {
        return error('La contraseña debe tener al menos 6 caracteres');
      }
      const salt = generateSalt();
      const hash = await hashPassword(newPassword, salt);
      await context.env.DB.prepare(
        'UPDATE teachers SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(hash, salt, id).run();
    }

    // If info update requested
    if (nombre || apellido || email || telefono || especialidad || rut !== undefined || activo !== undefined) {
      const fields = [];
      const values = [];

      if (nombre)       { fields.push('nombre = ?');       values.push(nombre); }
      if (apellido)     { fields.push('apellido = ?');     values.push(apellido); }
      if (email)        { fields.push('email = ?');        values.push(email); }
      if (telefono)     { fields.push('telefono = ?');     values.push(telefono); }
      if (especialidad) { fields.push('especialidad = ?'); values.push(especialidad); }
      if (rut !== undefined)   { fields.push('rut = ?');   values.push(rut || ''); }
      if (activo !== undefined) { fields.push('activo = ?'); values.push(activo ? 1 : 0); }

      if (fields.length > 0) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        await context.env.DB.prepare(
          `UPDATE teachers SET ${fields.join(', ')} WHERE id = ?`
        ).bind(...values).run();
      }
    }

    return json({ ok: true, message: 'Profesor actualizado' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return error('Ya existe un profesor con ese correo electrónico');
    }
    return error('Error al actualizar profesor', 500);
  }
}

// DELETE /api/admin/profesores/:id
export async function onRequestDelete(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  const id = context.params.id;

  try {
    // Delete professor's materials first (FK)
    await context.env.DB.prepare('DELETE FROM materials WHERE teacher_id = ?').bind(id).run();
    // Delete professor
    const result = await context.env.DB.prepare('DELETE FROM teachers WHERE id = ?').bind(id).run();

    if (result.meta.changes === 0) {
      return error('Profesor no encontrado', 404);
    }

    return json({ ok: true, message: 'Profesor eliminado' });
  } catch (err) {
    return error('Error al eliminar profesor', 500);
  }
}

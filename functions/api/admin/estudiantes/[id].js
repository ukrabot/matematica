import { getAdmin, json, error, hashPassword, generateSalt } from '../_helpers.js';

// GET /api/admin/estudiantes/:id
export async function onRequestGet(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  const id = context.params.id;
  const { results } = await context.env.DB.prepare(
    'SELECT id, nombre, apellido, email, telefono, colegio, rut, created_at FROM users WHERE id = ?'
  ).bind(id).all();

  if (!results[0]) return error('Estudiante no encontrado', 404);
  return json({ ok: true, estudiante: results[0] });
}

// PUT /api/admin/estudiantes/:id — update student info
export async function onRequestPut(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  const id = context.params.id;

  try {
    const body = await context.request.json();
    const { nombre, apellido, email, telefono, colegio, rut, newPassword } = body;

    // If password update requested
    if (newPassword) {
      if (newPassword.length < 6) {
        return error('La contraseña debe tener al menos 6 caracteres');
      }
      const salt = generateSalt();
      const hash = await hashPassword(newPassword, salt);
      await context.env.DB.prepare(
        'UPDATE users SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(hash, salt, id).run();
    }

    // If info update requested
    if (nombre || apellido || email || telefono || colegio || rut !== undefined) {
      const fields = [];
      const values = [];

      if (nombre)   { fields.push('nombre = ?');   values.push(nombre); }
      if (apellido) { fields.push('apellido = ?'); values.push(apellido); }
      if (email)    { fields.push('email = ?');    values.push(email); }
      if (telefono) { fields.push('telefono = ?'); values.push(telefono); }
      if (colegio)  { fields.push('colegio = ?');  values.push(colegio); }
      if (rut !== undefined) { fields.push('rut = ?'); values.push(rut || ''); }

      if (fields.length > 0) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        await context.env.DB.prepare(
          `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
        ).bind(...values).run();
      }
    }

    return json({ ok: true, message: 'Estudiante actualizado' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return error('Ya existe un estudiante con ese correo electrónico');
    }
    return error('Error al actualizar estudiante', 500);
  }
}

// DELETE /api/admin/estudiantes/:id
export async function onRequestDelete(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  const id = context.params.id;

  try {
    // Delete password resets first (FK)
    await context.env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(id).run();
    // Delete user
    const result = await context.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();

    if (result.meta.changes === 0) {
      return error('Estudiante no encontrado', 404);
    }

    return json({ ok: true, message: 'Estudiante eliminado' });
  } catch (err) {
    return error('Error al eliminar estudiante', 500);
  }
}

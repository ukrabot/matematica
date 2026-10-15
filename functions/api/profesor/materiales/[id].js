import { getProfesor, json, error } from '../_helpers.js';

// PUT /api/profesor/materiales/:id — update material
export async function onRequestPut(context) {
  const profesor = await getProfesor(context.request, context.env);
  if (!profesor) return error('No autenticado', 401);

  const id = context.params.id;

  try {
    // Verify ownership
    const { results: existing } = await context.env.DB.prepare(
      'SELECT id FROM materials WHERE id = ? AND teacher_id = ?'
    ).bind(id, profesor.id).all();

    if (!existing[0]) return error('Material no encontrado', 404);

    const body = await context.request.json();
    const { titulo, descripcion, tipo, url, filename } = body;

    const fields = [];
    const values = [];

    if (titulo)      { fields.push('titulo = ?');      values.push(titulo.trim()); }
    if (descripcion !== undefined) { fields.push('descripcion = ?'); values.push((descripcion || '').trim()); }
    if (tipo)        { fields.push('tipo = ?');         values.push(tipo); }
    if (url)         { fields.push('url = ?');          values.push(url.trim()); }
    if (filename !== undefined) { fields.push('filename = ?'); values.push((filename || '').trim()); }

    if (fields.length === 0) {
      return error('No hay datos para actualizar');
    }

    values.push(id);
    await context.env.DB.prepare(
      `UPDATE materials SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return json({ ok: true, message: 'Material actualizado' });
  } catch (err) {
    return error('Error al actualizar material', 500);
  }
}

// DELETE /api/profesor/materiales/:id — delete material
export async function onRequestDelete(context) {
  const profesor = await getProfesor(context.request, context.env);
  if (!profesor) return error('No autenticado', 401);

  const id = context.params.id;

  try {
    const result = await context.env.DB.prepare(
      'DELETE FROM materials WHERE id = ? AND teacher_id = ?'
    ).bind(id, profesor.id).run();

    if (result.meta.changes === 0) {
      return error('Material no encontrado', 404);
    }

    return json({ ok: true, message: 'Material eliminado' });
  } catch (err) {
    return error('Error al eliminar material', 500);
  }
}

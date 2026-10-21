import { getAdmin, json, error } from '../_helpers.js';

// PUT /api/admin/materiales/:id — update any material (admin can edit all)
export async function onRequestPut(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  const id = context.params.id;

  try {
    // Verify material exists
    const { results: existing } = await context.env.DB.prepare(
      'SELECT id FROM materials WHERE id = ?'
    ).bind(id).all();

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

// DELETE /api/admin/materiales/:id — delete any material (admin can delete all)
export async function onRequestDelete(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  const id = context.params.id;

  try {
    const result = await context.env.DB.prepare(
      'DELETE FROM materials WHERE id = ?'
    ).bind(id).run();

    if (result.meta.changes === 0) {
      return error('Material no encontrado', 404);
    }

    return json({ ok: true, message: 'Material eliminado' });
  } catch (err) {
    return error('Error al eliminar material', 500);
  }
}

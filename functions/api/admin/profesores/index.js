import { getAdmin, json, error } from '../_helpers.js';

// GET /api/admin/profesores — list all professors
export async function onRequestGet(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  const { results } = await context.env.DB.prepare(
    'SELECT id, nombre, apellido, email, telefono, especialidad, rut, activo, created_at FROM teachers ORDER BY created_at DESC'
  ).all();

  return json({ ok: true, profesores: results });
}

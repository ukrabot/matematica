import { getAdmin, json, error } from '../_helpers.js';

export async function onRequestGet(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  try {
    const { results } = await context.env.DB.prepare(
      'SELECT id, nombre, apellido, email, telefono, colegio, rut, created_at FROM users ORDER BY created_at DESC'
    ).all();

    return json({ ok: true, estudiantes: results });
  } catch (err) {
    return error('Error al obtener estudiantes', 500);
  }
}

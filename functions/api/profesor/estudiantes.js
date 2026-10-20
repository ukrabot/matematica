import { getProfesor, json, error } from './_helpers.js';

// GET /api/profesor/estudiantes — list all students
export async function onRequestGet(context) {
  const prof = await getProfesor(context.request, context.env);
  if (!prof) return error('No autorizado', 401);

  try {
    const { results } = await context.env.DB.prepare(
      'SELECT id, nombre, apellido, email, telefono, colegio, curso, rut, activo, created_at FROM users ORDER BY created_at DESC'
    ).all();

    return json({ ok: true, estudiantes: results });
  } catch (err) {
    return error('Error al obtener estudiantes', 500);
  }
}

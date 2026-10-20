import { getProfesor, json, error } from '../_helpers.js';

// GET /api/profesor/estudiantes/:id — get single student
export async function onRequestGet(context) {
  const prof = await getProfesor(context.request, context.env);
  if (!prof) return error('No autorizado', 401);

  const id = context.params.id;

  try {
    const { results } = await context.env.DB.prepare(
      'SELECT id, nombre, apellido, email, telefono, colegio, curso, rut, activo, created_at FROM users WHERE id = ?'
    ).bind(id).all();

    if (!results.length) return error('Estudiante no encontrado', 404);

    return json({ ok: true, estudiante: results[0] });
  } catch (err) {
    return error('Error al obtener estudiante', 500);
  }
}

// PUT /api/profesor/estudiantes/:id — toggle active status
export async function onRequestPut(context) {
  const prof = await getProfesor(context.request, context.env);
  if (!prof) return error('No autorizado', 401);

  const id = context.params.id;

  try {
    const body = await context.request.json();
    const activo = body.activo ? 1 : 0;

    await context.env.DB.prepare(
      'UPDATE users SET activo = ? WHERE id = ?'
    ).bind(activo, id).run();

    return json({ ok: true });
  } catch (err) {
    return error('Error al actualizar estudiante', 500);
  }
}

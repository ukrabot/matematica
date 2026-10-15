// GET /api/materiales — Public endpoint for students to fetch all materials
// Requires student auth (token cookie)

import { getUser, json, error } from '../auth/_helpers.js';

export async function onRequestGet(context) {
  const user = await getUser(context.request, context.env);
  if (!user) return error('No autenticado', 401);

  const { results } = await context.env.DB.prepare(`
    SELECT m.id, m.titulo, m.descripcion, m.tipo, m.url, m.filename, m.created_at,
           t.nombre || ' ' || t.apellido AS profesor
    FROM materials m
    JOIN teachers t ON m.teacher_id = t.id
    WHERE t.activo = 1
    ORDER BY m.created_at DESC
  `).all();

  return json({ ok: true, materiales: results });
}

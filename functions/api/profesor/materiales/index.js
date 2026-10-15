import { getProfesor, json, error } from '../_helpers.js';

// GET /api/profesor/materiales — list teacher's own materials
export async function onRequestGet(context) {
  const profesor = await getProfesor(context.request, context.env);
  if (!profesor) return error('No autenticado', 401);

  const { results } = await context.env.DB.prepare(
    'SELECT id, titulo, descripcion, tipo, url, filename, created_at FROM materials WHERE teacher_id = ? ORDER BY created_at DESC'
  ).bind(profesor.id).all();

  return json({ ok: true, materiales: results });
}

// POST /api/profesor/materiales — create material
export async function onRequestPost(context) {
  const profesor = await getProfesor(context.request, context.env);
  if (!profesor) return error('No autenticado', 401);

  try {
    const body = await context.request.json();
    const { titulo, descripcion, tipo, url, filename } = body;

    if (!titulo || !titulo.trim()) {
      return error('El título es obligatorio');
    }
    if (!url || !url.trim()) {
      return error('La URL es obligatoria');
    }

    const materialTipo = tipo || 'link';
    const validTipos = ['link', 'video', 'documento', 'presentacion', 'otro'];
    if (!validTipos.includes(materialTipo)) {
      return error('Tipo de material no válido');
    }

    const result = await context.env.DB.prepare(
      'INSERT INTO materials (teacher_id, titulo, descripcion, tipo, url, filename) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      profesor.id,
      titulo.trim(),
      (descripcion || '').trim(),
      materialTipo,
      url.trim(),
      (filename || '').trim()
    ).run();

    return json({ ok: true, message: 'Material creado', id: result.meta.last_row_id }, 201);
  } catch (err) {
    return error('Error al crear material', 500);
  }
}

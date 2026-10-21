import { getAdmin, json, error } from '../_helpers.js';

// GET /api/admin/materiales — list ALL materials (admin sees everything)
export async function onRequestGet(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  try {
    const { results } = await context.env.DB.prepare(
      `SELECT m.id, m.titulo, m.descripcion, m.tipo, m.url, m.filename, m.teacher_id, m.created_at,
              COALESCE(p.nombre || ' ' || p.apellido, 'Admin') as autor
       FROM materials m
       LEFT JOIN profesores p ON m.teacher_id = p.id
       ORDER BY m.created_at DESC`
    ).all();

    return json({ ok: true, materiales: results });
  } catch (err) {
    return json({ ok: true, materiales: [] });
  }
}

// POST /api/admin/materiales — create material as admin (teacher_id = 0)
export async function onRequestPost(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

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
      'INSERT INTO materials (teacher_id, titulo, descripcion, tipo, url, filename) VALUES (0, ?, ?, ?, ?, ?)'
    ).bind(
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

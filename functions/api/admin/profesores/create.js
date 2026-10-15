import { getAdmin, json, error, hashPassword, generateSalt } from '../_helpers.js';

// POST /api/admin/profesores/create — register a new professor
export async function onRequestPost(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  try {
    const body = await context.request.json();
    const { nombre, apellido, email, telefono, especialidad, rut, password } = body;

    if (!nombre || !apellido || !email || !password) {
      return error('Nombre, apellido, email y contraseña son obligatorios');
    }

    if (password.length < 6) {
      return error('La contraseña debe tener al menos 6 caracteres');
    }

    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    await context.env.DB.prepare(
      `INSERT INTO teachers (nombre, apellido, email, telefono, especialidad, rut, password_hash, salt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      nombre.trim(),
      apellido.trim(),
      email.toLowerCase().trim(),
      (telefono || '').trim(),
      (especialidad || '').trim(),
      (rut || '').trim(),
      hash,
      salt
    ).run();

    return json({ ok: true, message: 'Profesor creado exitosamente' }, 201);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return error('Ya existe un profesor con ese correo electrónico');
    }
    return error('Error al crear profesor', 500);
  }
}

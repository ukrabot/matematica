import { getAdmin, json, error, hashPassword, generateSalt } from '../_helpers.js';

// POST /api/admin/estudiantes/create — admin registers a new student
export async function onRequestPost(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  try {
    const body = await context.request.json();
    const { nombre, apellido, email, telefono, colegio, rut, password } = body;

    if (!nombre?.trim() || !apellido?.trim() || !email?.trim() || !password) {
      return error('Nombre, apellido, correo y contraseña son obligatorios');
    }

    if (password.length < 6) {
      return error('La contraseña debe tener al menos 6 caracteres');
    }

    // Check duplicate email
    const existing = await context.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email.toLowerCase().trim()).first();

    if (existing) {
      return error('Ya existe un estudiante con ese correo electrónico');
    }

    // Check duplicate RUT if provided
    if (rut?.trim()) {
      const existingRut = await context.env.DB.prepare(
        "SELECT id FROM users WHERE rut = ? AND rut != ''"
      ).bind(rut.trim()).first();

      if (existingRut) {
        return error('Ya existe un estudiante con ese RUT');
      }
    }

    // Hash password
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    // Insert user
    const result = await context.env.DB.prepare(
      'INSERT INTO users (nombre, apellido, email, telefono, colegio, rut, password_hash, salt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      nombre.trim(),
      apellido.trim(),
      email.toLowerCase().trim(),
      (telefono || '').trim(),
      (colegio || '').trim(),
      (rut || '').trim(),
      hash,
      salt
    ).run();

    return json({ ok: true, message: 'Estudiante registrado correctamente', id: result.meta.last_row_id }, 201);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return error('Ya existe un estudiante con ese correo electrónico');
    }
    return error('Error al registrar estudiante: ' + err.message, 500);
  }
}

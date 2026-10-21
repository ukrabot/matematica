import { hashPassword, generateSalt, createJWT, setAuthCookie, json, error, validateEmail } from './_helpers.js';

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;

    // Check if registration is enabled
    try {
      const setting = await db.prepare("SELECT value FROM settings WHERE key = 'registro_habilitado'").first();
      if (setting && setting.value === 'false') {
        return error('El registro de nuevos estudiantes está deshabilitado. Contacta al administrador.');
      }
    } catch {}

    const body = await context.request.json();
    const { nombre, apellido, email, telefono, colegio, rut, password } = body;

    // Validate required fields
    if (!nombre?.trim() || !apellido?.trim() || !email?.trim() || !telefono?.trim() || !colegio?.trim() || !password) {
      return error('Todos los campos son obligatorios');
    }
    if (!validateEmail(email)) {
      return error('Email inválido');
    }
    if (password.length < 6) {
      return error('La contraseña debe tener al menos 6 caracteres');
    }

    // Check if email already exists
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first();
    if (existing) {
      return error('Ya existe una cuenta con este email');
    }

    // Check duplicate RUT if provided
    if (rut?.trim()) {
      const existingRut = await db.prepare("SELECT id FROM users WHERE rut = ? AND rut != ''").bind(rut.trim()).first();
      if (existingRut) {
        return error('Ya existe una cuenta con este RUT');
      }
    }

    // Hash password
    const salt = generateSalt();
    const password_hash = await hashPassword(password, salt);

    // Insert user
    const result = await db.prepare(
      'INSERT INTO users (nombre, apellido, email, telefono, colegio, rut, password_hash, salt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      nombre.trim(), apellido.trim(), email.toLowerCase().trim(), telefono.trim(), colegio.trim(), (rut || '').trim(), password_hash, salt
    ).run();

    const userId = result.meta.last_row_id;

    // Create JWT
    const secret = context.env.JWT_SECRET || 'dev-secret-change-me';
    const token = await createJWT({ sub: userId, email: email.toLowerCase().trim() }, secret);

    return json(
      { ok: true, user: { id: userId, nombre: nombre.trim(), apellido: apellido.trim(), email: email.toLowerCase().trim() } },
      201,
      { 'Set-Cookie': setAuthCookie(token) }
    );
  } catch (err) {
    return error('Error al registrar: ' + err.message, 500);
  }
}

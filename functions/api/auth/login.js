import { verifyPassword, createJWT, setAuthCookie, json, error } from './_helpers.js';

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { email, password } = body;

    if (!email?.trim() || !password) {
      return error('Email/RUT y contraseña son obligatorios');
    }

    const db = context.env.DB;
    const identifier = email.trim().toLowerCase();

    // Determine if identifier is RUT or email
    const isRut = /^[0-9]{7,9}[0-9kK]?$/.test(identifier.replace(/[.\-]/g, ''));
    const cleanRut = identifier.replace(/[.\-]/g, '');

    let user;
    if (isRut) {
      user = await db.prepare(
        'SELECT id, nombre, apellido, email, telefono, colegio, password_hash, salt, activo FROM users WHERE rut = ?'
      ).bind(cleanRut).first();
    } else {
      user = await db.prepare(
        'SELECT id, nombre, apellido, email, telefono, colegio, password_hash, salt, activo FROM users WHERE email = ?'
      ).bind(identifier).first();
    }

    if (!user) {
      return error('Credenciales incorrectas', 401);
    }

    // Check if student account is disabled
    if (user.activo === 0) {
      return error('Tu cuenta está deshabilitada. Contacta al administrador.', 403);
    }

    const valid = await verifyPassword(password, user.salt, user.password_hash);
    if (!valid) {
      return error('Credenciales incorrectas', 401);
    }

    // Create JWT
    const secret = context.env.JWT_SECRET || 'dev-secret-change-me';
    const token = await createJWT({ sub: user.id, email: user.email }, secret);

    return json(
      { ok: true, user: { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email } },
      200,
      { 'Set-Cookie': setAuthCookie(token) }
    );
  } catch (err) {
    return error('Error al iniciar sesión: ' + err.message, 500);
  }
}

import { verifyPassword, createJWT, setAuthCookie, json, error } from './_helpers.js';

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { email, password } = body;

    if (!email?.trim() || !password) {
      return error('Email y contraseña son obligatorios');
    }

    const db = context.env.DB;
    const user = await db.prepare(
      'SELECT id, nombre, apellido, email, telefono, colegio, password_hash, salt FROM users WHERE email = ?'
    ).bind(email.toLowerCase().trim()).first();

    if (!user) {
      return error('Email o contraseña incorrectos', 401);
    }

    const valid = await verifyPassword(password, user.salt, user.password_hash);
    if (!valid) {
      return error('Email o contraseña incorrectos', 401);
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

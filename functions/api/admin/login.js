import { verifyPassword, createJWT, setAdminCookie } from './_helpers.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({ ok: false, error: 'Usuario y contraseña son obligatorios' }, { status: 400 });
    }

    const identifier = username.trim();
    const cleanRut = identifier.replace(/[.\-]/g, '');
    const isRut = /^[0-9]{7,9}[0-9kK]?$/.test(cleanRut);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    let admin;
    if (isRut) {
      const { results } = await env.DB.prepare(
        'SELECT id, username, password_hash, salt FROM admins WHERE rut = ? OR rut = ? OR rut = ?'
      ).bind(cleanRut, identifier, identifier.toLowerCase()).all();
      admin = results[0];
    } else if (isEmail) {
      const { results } = await env.DB.prepare(
        'SELECT id, username, password_hash, salt FROM admins WHERE email = ?'
      ).bind(identifier.toLowerCase()).all();
      admin = results[0];
    } else {
      const { results } = await env.DB.prepare(
        'SELECT id, username, password_hash, salt FROM admins WHERE username = ?'
      ).bind(identifier).all();
      admin = results[0];
    }

    if (!admin) {
      return Response.json({ ok: false, error: 'Credenciales incorrectas' }, { status: 401 });
    }

    const valid = await verifyPassword(password, admin.salt, admin.password_hash);
    if (!valid) {
      return Response.json({ ok: false, error: 'Credenciales incorrectas' }, { status: 401 });
    }

    const token = await createJWT({ sub: admin.id, role: 'admin', username: admin.username }, env.JWT_SECRET);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setAdminCookie(token)
      }
    });
  } catch (err) {
    return Response.json({ ok: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

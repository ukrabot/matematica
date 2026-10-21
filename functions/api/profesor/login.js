import { verifyPassword, createJWT, setProfesorCookie, error } from './_helpers.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return error('Email/RUT y contraseña son obligatorios');
    }

    const identifier = email.trim().toLowerCase();

    // Check if identifier is RUT or email
    const isRut = /^[0-9]{7,9}[0-9kK]?$/.test(identifier.replace(/[.\-]/g, ''));
    const cleanRut = identifier.replace(/[.\-]/g, '');

    let teacher;
    if (isRut) {
      const { results } = await env.DB.prepare(
        'SELECT id, nombre, apellido, email, especialidad, password_hash, salt, activo FROM teachers WHERE rut = ?'
      ).bind(cleanRut).all();
      teacher = results[0];
    } else {
      const { results } = await env.DB.prepare(
        'SELECT id, nombre, apellido, email, especialidad, password_hash, salt, activo FROM teachers WHERE email = ?'
      ).bind(identifier).all();
      teacher = results[0];
    }

    if (!teacher) {
      return error('Credenciales incorrectas', 401);
    }

    if (teacher.activo === 0) {
      return error('Tu cuenta está deshabilitada. Contacta al administrador.', 403);
    }

    const valid = await verifyPassword(password, teacher.salt, teacher.password_hash);
    if (!valid) {
      return error('Credenciales incorrectas', 401);
    }

    const token = await createJWT(
      { sub: teacher.id, role: 'profesor', email: teacher.email },
      env.JWT_SECRET
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setProfesorCookie(token)
      }
    });
  } catch (err) {
    return error('Error interno del servidor', 500);
  }
}

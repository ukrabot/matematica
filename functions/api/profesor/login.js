import { verifyPassword, createJWT, setProfesorCookie, error } from './_helpers.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return error('Email y contraseña son obligatorios');
    }

    const { results } = await env.DB.prepare(
      'SELECT id, nombre, apellido, email, especialidad, password_hash, salt, activo FROM teachers WHERE email = ?'
    ).bind(email.toLowerCase().trim()).all();

    const teacher = results[0];
    if (!teacher) {
      return error('Email o contraseña incorrectos', 401);
    }

    if (teacher.activo === 0) {
      return error('Tu cuenta está deshabilitada. Contacta al administrador.', 403);
    }

    const valid = await verifyPassword(password, teacher.salt, teacher.password_hash);
    if (!valid) {
      return error('Email o contraseña incorrectos', 401);
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

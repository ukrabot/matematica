import { getUser, validateEmail, json, error } from './_helpers.js';

export async function onRequestPost(context) {
  try {
    const user = await getUser(context.request, context.env);
    if (!user) return error('No autenticado', 401);

    const body = await context.request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return error('El email es obligatorio');
    }

    const newEmail = email.trim().toLowerCase();

    if (!validateEmail(newEmail)) {
      return error('Email no válido');
    }

    if (newEmail === user.email) {
      return error('El email es el mismo que el actual');
    }

    // Check if email is already taken
    const existing = await context.env.DB.prepare(
      'SELECT id FROM users WHERE email = ? AND id != ?'
    ).bind(newEmail, user.id).first();

    if (existing) {
      return error('Este email ya está registrado por otro usuario');
    }

    await context.env.DB.prepare(
      "UPDATE users SET email = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(newEmail, user.id).run();

    return json({ ok: true, message: 'Email actualizado correctamente', email: newEmail });
  } catch (err) {
    return error('Error al actualizar email: ' + err.message, 500);
  }
}

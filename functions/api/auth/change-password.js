import { getUser, verifyPassword, hashPassword, generateSalt, json, error } from './_helpers.js';

export async function onRequestPost(context) {
  try {
    const user = await getUser(context.request, context.env);
    if (!user) {
      return error('No autenticado', 401);
    }

    const body = await context.request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return error('Contraseña actual y nueva son obligatorias');
    }
    if (newPassword.length < 6) {
      return error('La nueva contraseña debe tener al menos 6 caracteres');
    }

    const db = context.env.DB;

    // Get current hash and salt
    const row = await db.prepare('SELECT password_hash, salt FROM users WHERE id = ?').bind(user.id).first();
    if (!row) return error('Usuario no encontrado', 404);

    const valid = await verifyPassword(currentPassword, row.salt, row.password_hash);
    if (!valid) {
      return error('Contraseña actual incorrecta', 401);
    }

    // Hash new password
    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);

    await db.prepare(
      "UPDATE users SET password_hash = ?, salt = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(newHash, newSalt, user.id).run();

    return json({ ok: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    return error('Error: ' + err.message, 500);
  }
}

import { hashPassword, generateSalt, json, error } from './_helpers.js';

// POST — reset password using token
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return error('Token y nueva contraseña son obligatorios');
    }
    if (newPassword.length < 6) {
      return error('La contraseña debe tener al menos 6 caracteres');
    }

    const db = context.env.DB;

    const reset = await db.prepare(
      "SELECT id, user_id, expires_at FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime('now')"
    ).bind(token).first();

    if (!reset) {
      return error('Token inválido o expirado', 401);
    }

    // Hash new password
    const salt = generateSalt();
    const password_hash = await hashPassword(newPassword, salt);

    // Update password and mark token as used
    await db.batch([
      db.prepare("UPDATE users SET password_hash = ?, salt = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(password_hash, salt, reset.user_id),
      db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?')
        .bind(reset.id),
    ]);

    return json({ ok: true, message: 'Contraseña restablecida correctamente' });
  } catch (err) {
    return error('Error: ' + err.message, 500);
  }
}

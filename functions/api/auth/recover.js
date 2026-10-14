import { generateToken, validateEmail, json, error } from './_helpers.js';

// POST — request password recovery (generates reset token)
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { email } = body;

    if (!email?.trim() || !validateEmail(email)) {
      return error('Email inválido');
    }

    const db = context.env.DB;
    const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first();

    // Always return success to avoid email enumeration
    if (!user) {
      return json({ ok: true, message: 'Si el email existe, recibirás instrucciones para recuperar tu contraseña' });
    }

    // Generate reset token (valid for 1 hour)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();

    // Invalidate previous tokens
    await db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').bind(user.id).run();

    // Insert new token
    await db.prepare(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, token, expiresAt).run();

    // In production, send this token via email.
    // For now, we return it so the frontend can build the reset URL.
    // TODO: Integrate with an email service (Mailgun, SendGrid, Resend, etc.)
    return json({
      ok: true,
      message: 'Si el email existe, recibirás instrucciones para recuperar tu contraseña',
      // REMOVE in production — only for development:
      _dev_token: token
    });
  } catch (err) {
    return error('Error: ' + err.message, 500);
  }
}

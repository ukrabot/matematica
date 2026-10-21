import { getUser, json, error } from './_helpers.js';

export async function onRequestPost(context) {
  try {
    const user = await getUser(context.request, context.env);
    if (!user) return error('No autenticado', 401);

    const body = await context.request.json();
    const { foto } = body;

    if (foto === undefined || foto === null) {
      return error('La foto es obligatoria');
    }

    // Allow empty string to remove photo
    if (foto !== '' && !foto.startsWith('data:image/')) {
      return error('Formato de imagen no válido');
    }

    // Limit size: ~500KB base64 (approx 375KB image)
    if (foto.length > 500000) {
      return error('La imagen es muy grande. Máximo 500KB.');
    }

    await context.env.DB.prepare(
      "UPDATE users SET foto = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(foto, user.id).run();

    return json({ ok: true, message: 'Foto actualizada correctamente' });
  } catch (err) {
    return error('Error al actualizar foto: ' + err.message, 500);
  }
}

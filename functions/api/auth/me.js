import { getUser, json, error, touchLastLogin } from './_helpers.js';

export async function onRequestGet(context) {
  try {
    const user = await getUser(context.request, context.env);
    if (!user) {
      return error('No autenticado', 401);
    }

    // Track last connection (students with a saved session don't log in again)
    context.waitUntil(touchLastLogin(context.env, user.id));

    // Fetch section visibility settings
    let sectionSettings = {};
    try {
      const { results } = await context.env.DB.prepare(
        "SELECT key, value FROM settings WHERE key IN ('global_seccion_m1', 'global_seccion_m2', 'global_seccion_7b')"
      ).all();
      for (const row of results) {
        sectionSettings[row.key] = row.value;
      }
    } catch {}

    return json({ ok: true, user, sectionSettings });
  } catch (err) {
    return error('Error: ' + err.message, 500);
  }
}

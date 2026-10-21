import { getAdmin, json, error } from './_helpers.js';

// GET /api/admin/settings — get all settings
export async function onRequestGet(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  try {
    const { results } = await context.env.DB.prepare(
      'SELECT key, value FROM settings'
    ).all();

    const settings = {};
    for (const row of results) {
      settings[row.key] = row.value;
    }

    return json({ ok: true, settings });
  } catch (err) {
    return json({ ok: true, settings: { registro_habilitado: 'true' } });
  }
}

// PUT /api/admin/settings — update a setting
export async function onRequestPut(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  try {
    const body = await context.request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return error('Key y value son requeridos');
    }

    // Only allow known settings
    const allowedKeys = [
      'registro_habilitado',
      'global_perm_tutor',
      'global_perm_evaluacion',
      'global_perm_ejercicios',
      'global_perm_materiales',
      'global_perm_resultados',
      'global_seccion_m1',
      'global_seccion_m2',
      'global_seccion_7b',
      'global_attempts_reset_at'
    ];
    if (!allowedKeys.includes(key)) {
      return error('Configuración no válida');
    }

    await context.env.DB.prepare(
      'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP'
    ).bind(key, value, value).run();

    return json({ ok: true, message: 'Configuración actualizada' });
  } catch (err) {
    return error('Error al actualizar configuración', 500);
  }
}

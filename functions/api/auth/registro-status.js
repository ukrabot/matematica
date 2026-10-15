// GET /api/auth/registro-status — check if public registration is enabled
export async function onRequestGet(context) {
  try {
    const row = await context.env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'registro_habilitado'"
    ).first();

    const enabled = row ? row.value === 'true' : true;

    return new Response(JSON.stringify({ ok: true, enabled }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    // Default to enabled if settings table doesn't exist yet
    return new Response(JSON.stringify({ ok: true, enabled: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

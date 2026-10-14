import { getAdmin, json, error } from './_helpers.js';

export async function onRequestGet(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);
  return json({ ok: true, admin: { id: admin.id, username: admin.username } });
}

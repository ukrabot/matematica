import { getProfesor, json, error } from './_helpers.js';

export async function onRequestGet(context) {
  const profesor = await getProfesor(context.request, context.env);
  if (!profesor) return error('No autenticado', 401);
  return json({ ok: true, profesor });
}

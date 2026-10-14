import { getUser, json, error } from './_helpers.js';

export async function onRequestGet(context) {
  try {
    const user = await getUser(context.request, context.env);
    if (!user) {
      return error('No autenticado', 401);
    }
    return json({ ok: true, user });
  } catch (err) {
    return error('Error: ' + err.message, 500);
  }
}

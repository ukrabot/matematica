import { clearProfesorCookie, json } from './_helpers.js';

export async function onRequestPost(context) {
  return json({ ok: true, message: 'Sesión cerrada' }, 200, { 'Set-Cookie': clearProfesorCookie() });
}

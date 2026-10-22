import { getUser, json, error } from '../auth/_helpers.js';
import { getIntentosPorTema, MAX_INTENTOS } from './_intentos.js';

// GET /api/ejercicios/intentos — attempts used per topic for the logged-in student
export async function onRequestGet(context) {
  const user = await getUser(context.request, context.env);
  if (!user) return error('No autorizado', 401);

  try {
    const intentos = await getIntentosPorTema(context.env, user.id);
    return json({ ok: true, intentos, max: MAX_INTENTOS });
  } catch (err) {
    return error('Error al obtener intentos', 500);
  }
}

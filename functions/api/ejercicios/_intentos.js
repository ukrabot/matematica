import { ensureSchema } from '../auth/_helpers.js';

export const MAX_INTENTOS = 2;

// Returns the most recent reset moment (global or per-student) as SQLite datetime text, or ''.
// Values are normalized with datetime() so old ISO values ("...T...Z") compare correctly
// against exercise_results.created_at ("YYYY-MM-DD HH:MM:SS").
async function getResetAfter(env, userId) {
  await ensureSchema(env);
  const row = await env.DB.prepare(
    `SELECT
       COALESCE(datetime((SELECT value FROM settings WHERE key = 'global_attempts_reset_at')), '') AS g,
       COALESCE(datetime((SELECT attempts_reset_at FROM users WHERE id = ?)), '') AS s`
  ).bind(userId).first();
  const g = row?.g || '';
  const s = row?.s || '';
  return g > s ? g : s;
}

// Map of topic -> attempts used since the last reset
export async function getIntentosPorTema(env, userId) {
  const resetAfter = await getResetAfter(env, userId);
  const { results } = await env.DB.prepare(
    'SELECT topic, COUNT(*) AS intentos FROM exercise_results WHERE user_id = ? AND created_at >= ? GROUP BY topic'
  ).bind(userId, resetAfter).all();
  const intentos = {};
  for (const r of results) intentos[r.topic] = r.intentos;
  return intentos;
}

// Attempts used for one topic since the last reset
export async function getIntentosTema(env, userId, topic) {
  const resetAfter = await getResetAfter(env, userId);
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS cnt FROM exercise_results WHERE user_id = ? AND topic = ? AND created_at >= ?'
  ).bind(userId, topic, resetAfter).first();
  return row?.cnt || 0;
}

import { getAdmin, json, error, hashPassword, generateSalt } from '../_helpers.js';

const MAX_PER_REQUEST = 25;

// POST /api/admin/estudiantes/bulk — bulk import students (the client sends small chunks)
export async function onRequestPost(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  try {
    const body = await context.request.json();
    const { students } = body;
    const startRow = Number(body.startRow) || 2; // Excel row of the first student in this chunk

    if (!students || !Array.isArray(students) || students.length === 0) {
      return error('No se recibieron datos de estudiantes');
    }

    if (students.length > MAX_PER_REQUEST) {
      return error(`Máximo ${MAX_PER_REQUEST} estudiantes por petición`);
    }

    const results = { created: 0, skipped: 0, errors: [] };

    // Normalize + validate
    const valid = [];
    for (let i = 0; i < students.length; i++) {
      const s = students[i] || {};
      const row = startRow + i;
      const nombre = (s.nombre || '').toString().trim();
      const apellido = (s.apellido || '').toString().trim();
      const email = (s.email || '').toString().trim().toLowerCase();
      const telefono = (s.telefono || '').toString().trim();
      const colegio = (s.colegio || '').toString().trim();
      const rut = (s.rut || '').toString().trim();
      const pwd = (s.password || s.contraseña || '').toString().trim() || 'Preu2026';

      if (!nombre || !apellido || !email) {
        results.errors.push({ row, error: `Fila ${row}: Nombre, apellido y email son obligatorios` });
        results.skipped++;
        continue;
      }
      if (pwd.length < 6) {
        results.errors.push({ row, error: `Fila ${row}: Contraseña debe tener al menos 6 caracteres` });
        results.skipped++;
        continue;
      }
      valid.push({ row, nombre, apellido, email, telefono, colegio, rut, pwd });
    }

    // Check all emails of this chunk in one query
    const existingSet = new Set();
    if (valid.length > 0) {
      const placeholders = valid.map(() => '?').join(',');
      const { results: existing } = await context.env.DB.prepare(
        `SELECT email FROM users WHERE email IN (${placeholders})`
      ).bind(...valid.map(v => v.email)).all();
      for (const r of existing) existingSet.add(r.email);
    }

    const statements = [];
    const inserted = [];
    for (const v of valid) {
      if (existingSet.has(v.email)) {
        results.errors.push({ row: v.row, error: `Fila ${v.row}: Email ${v.email} ya existe` });
        results.skipped++;
        continue;
      }
      existingSet.add(v.email); // avoid duplicates inside the same file

      const salt = generateSalt();
      const hash = await hashPassword(v.pwd, salt);
      statements.push(
        context.env.DB.prepare(
          'INSERT INTO users (nombre, apellido, email, telefono, colegio, rut, password_hash, salt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(v.nombre, v.apellido, v.email, v.telefono, v.colegio, v.rut, hash, salt)
      );
      inserted.push(v);
    }

    if (statements.length > 0) {
      try {
        await context.env.DB.batch(statements);
        results.created += statements.length;
      } catch {
        // Batch failed as a whole — retry one by one to report which rows fail
        for (let i = 0; i < statements.length; i++) {
          try {
            await statements[i].run();
            results.created++;
          } catch (err) {
            results.errors.push({ row: inserted[i].row, error: `Fila ${inserted[i].row}: ${err.message}` });
            results.skipped++;
          }
        }
      }
    }

    return json({
      ok: true,
      message: `${results.created} estudiantes registrados, ${results.skipped} omitidos`,
      results
    });
  } catch (err) {
    return error('Error al procesar carga masiva: ' + err.message, 500);
  }
}

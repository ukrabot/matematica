import { getAdmin, json, error, hashPassword, generateSalt } from '../_helpers.js';

// POST /api/admin/estudiantes/bulk — bulk import students from parsed Excel data
export async function onRequestPost(context) {
  const admin = await getAdmin(context.request, context.env);
  if (!admin) return error('No autorizado', 401);

  try {
    const body = await context.request.json();
    const { students } = body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return error('No se recibieron datos de estudiantes');
    }

    if (students.length > 500) {
      return error('Máximo 500 estudiantes por carga');
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const row = i + 2; // Row number in Excel (header is row 1)

      try {
        const nombre = (s.nombre || '').trim();
        const apellido = (s.apellido || '').trim();
        const email = (s.email || '').trim().toLowerCase();
        const telefono = (s.telefono || '').toString().trim();
        const colegio = (s.colegio || '').trim();
        const curso = (s.curso || '').trim();
        const rut = (s.rut || '').toString().trim();
        const password = (s.password || s.contraseña || '').toString().trim();

        // Validate required fields
        if (!nombre || !apellido || !email) {
          results.errors.push({ row, error: `Fila ${row}: Nombre, apellido y email son obligatorios` });
          results.skipped++;
          continue;
        }

        // Generate default password if not provided
        const pwd = password || 'Preu2026';

        if (pwd.length < 6) {
          results.errors.push({ row, error: `Fila ${row}: Contraseña debe tener al menos 6 caracteres` });
          results.skipped++;
          continue;
        }

        // Check if email already exists
        const existing = await context.env.DB.prepare(
          'SELECT id FROM users WHERE email = ?'
        ).bind(email).first();

        if (existing) {
          results.errors.push({ row, error: `Fila ${row}: Email ${email} ya existe` });
          results.skipped++;
          continue;
        }

        // Hash password
        const salt = generateSalt();
        const hash = await hashPassword(pwd, salt);

        // Insert
        await context.env.DB.prepare(
          'INSERT INTO users (nombre, apellido, email, telefono, colegio, curso, rut, password_hash, salt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(nombre, apellido, email, telefono, colegio, curso, rut, hash, salt).run();

        results.created++;
      } catch (err) {
        results.errors.push({ row, error: `Fila ${row}: ${err.message}` });
        results.skipped++;
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

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefono TEXT DEFAULT '',
  especialidad TEXT DEFAULT '',
  rut TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'link',
  url TEXT NOT NULL,
  filename TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

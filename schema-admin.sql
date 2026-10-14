-- Tabla de administradores
CREATE TABLE IF NOT EXISTS admins (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt       TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertar admin por defecto (usuario: admin / contraseña: PreuAdmin2026)
INSERT INTO admins (username, password_hash, salt) VALUES ('admin', '6f6bc9f25027777922fa2d636a6942b8ced26791a7892e839c65f4cfa40a68ff', '70990d2c8b9d31cf2115a0f40a976ddc');

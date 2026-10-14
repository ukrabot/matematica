-- PreuOnline Matemáticas — Cloudflare D1 Schema
-- Run: wrangler d1 execute preuonline-db --file=./schema.sql

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT    NOT NULL,
  apellido   TEXT    NOT NULL,
  email      TEXT    NOT NULL UNIQUE,
  telefono   TEXT    NOT NULL,
  colegio    TEXT    NOT NULL,
  password_hash TEXT NOT NULL,
  salt       TEXT    NOT NULL,
  created_at TEXT    DEFAULT (datetime('now')),
  updated_at TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_resets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  token      TEXT    NOT NULL UNIQUE,
  expires_at TEXT    NOT NULL,
  used       INTEGER DEFAULT 0,
  created_at TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_resets_token ON password_resets(token);

-- Add RUT column to users table
ALTER TABLE users ADD COLUMN rut TEXT DEFAULT '';

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('registro_habilitado', 'true');

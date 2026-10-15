-- Add activo column to users table (1 = active, 0 = disabled)
ALTER TABLE users ADD COLUMN activo INTEGER DEFAULT 1;

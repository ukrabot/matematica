-- Add email and rut columns to admins table
ALTER TABLE admins ADD COLUMN email TEXT DEFAULT '';
ALTER TABLE admins ADD COLUMN rut TEXT DEFAULT '';

-- Set RUT for existing admin
UPDATE admins SET rut = '150477484' WHERE username = 'admin';

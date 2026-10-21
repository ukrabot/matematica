-- Add attempts_reset_at column to users table (for per-student reset)
-- Run this statement in the Cloudflare D1 console:
ALTER TABLE users ADD COLUMN attempts_reset_at TEXT DEFAULT '';

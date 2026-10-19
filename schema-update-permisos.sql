-- Migration: Add per-student section access permission columns
-- Run in Cloudflare D1 console: https://dash.cloudflare.com > D1 > preuonline-db > Console

ALTER TABLE users ADD COLUMN perm_tutor INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN perm_evaluacion INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN perm_ejercicios INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN perm_materiales INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN perm_resultados INTEGER NOT NULL DEFAULT 1;

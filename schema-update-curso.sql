-- Migration: Add curso (grade level) column to users table
-- Run in Cloudflare D1 console: https://dash.cloudflare.com > D1 > preuonline-db > Console
-- Values: "7° Básico", "8° Básico", "1° Medio", "2° Medio", "3° Medio", "4° Medio"

ALTER TABLE users ADD COLUMN curso TEXT NOT NULL DEFAULT '';

// Shared auth utilities — PBKDF2 password hashing + JWT via Web Crypto API

const ITERATIONS = 100_000;
const HASH_ALG   = 'SHA-256';
const KEY_LEN    = 32; // bytes

// --- Password hashing (PBKDF2) ---

export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: ITERATIONS, hash: HASH_ALG },
    keyMaterial, KEY_LEN * 8
  );
  return bufToHex(bits);
}

export function generateSalt() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return bufToHex(buf);
}

export async function verifyPassword(password, salt, hash) {
  const computed = await hashPassword(password, salt);
  return timingSafeEqual(computed, hash);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// --- JWT (HMAC-SHA256) ---

function b64url(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlEncode(str) {
  return b64url(new TextEncoder().encode(str));
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

async function getSigningKey(secret) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

export async function createJWT(payload, secret, expiresInHours = 72) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + expiresInHours * 3600 };

  const segments = b64urlEncode(JSON.stringify(header)) + '.' + b64urlEncode(JSON.stringify(claims));
  const key = await getSigningKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(segments));
  return segments + '.' + b64url(sig);
}

export async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const key = await getSigningKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC', key, Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
    new TextEncoder().encode(parts[0] + '.' + parts[1])
  );
  if (!valid) return null;

  const payload = JSON.parse(b64urlDecode(parts[1]));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// --- Cookie helpers ---

export function setAuthCookie(token) {
  return `token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${72 * 3600}`;
}

export function clearAuthCookie() {
  return 'token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

export function getCookie(request, name) {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

// --- Response helpers ---

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function error(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

// --- Auth middleware (extract user from JWT) ---

export async function getUser(request, env) {
  const token = getCookie(request, 'token');
  if (!token) return null;
  const secret = env.JWT_SECRET || 'dev-secret-change-me';
  const payload = await verifyJWT(token, secret);
  if (!payload) return null;
  const { results } = await env.DB.prepare('SELECT id, nombre, apellido, email, telefono, colegio FROM users WHERE id = ?').bind(payload.sub).all();
  return results[0] || null;
}

// --- Helpers ---

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateToken() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return bufToHex(buf);
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

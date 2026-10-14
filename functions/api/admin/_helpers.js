// ── Admin auth helpers (mirrors student _helpers but separate cookie/token) ──

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function error(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

// ── Password hashing (PBKDF2-SHA256) ──

export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password, salt, hash) {
  const computed = await hashPassword(password, salt);
  if (computed.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

// ── JWT ──

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

export async function createJWT(payload, secret, expiresInHours = 72) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInHours * 3600 };
  const enc = new TextEncoder();
  const parts = b64url(enc.encode(JSON.stringify(header))) + '.' + b64url(enc.encode(JSON.stringify(body)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(parts));
  return parts + '.' + b64url(sig);
}

export async function verifyJWT(token, secret) {
  try {
    const [hdr, payload, sig] = token.split('.');
    if (!hdr || !payload || !sig) return null;
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify('HMAC', key, b64urlDecode(sig), new TextEncoder().encode(hdr + '.' + payload));
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch { return null; }
}

// ── Cookie helpers ──

export function setAdminCookie(token) {
  return `admin_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${72 * 3600}`;
}

export function clearAdminCookie() {
  return 'admin_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

export function getCookie(request, name) {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

// ── Get admin from JWT cookie ──

export async function getAdmin(request, env) {
  const token = getCookie(request, 'admin_token');
  if (!token) return null;
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload || payload.role !== 'admin') return null;
  const { results } = await env.DB.prepare('SELECT id, username FROM admins WHERE id = ?').bind(payload.sub).all();
  return results[0] || null;
}

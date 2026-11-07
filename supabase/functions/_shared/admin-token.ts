/**
 * Signed admin tokens shared by the `admin-auth` Edge Function and (re-implemented in SQL) the database guard
 * `kft_admin_token_ok()`. Pure / erasable TS (tested from Node: `npm run test:edge`).
 *
 * Token  = <payloadB64Url>.<hexHmacSha256(secret, payloadB64Url)>
 * payload = {"sub":"admin","scope":"admin"|"pin","iat":<sec>,"exp":<sec>}
 *
 * The HMAC secret lives ONLY in the private table `kft_security_config` (never readable with the public anon key).
 */
const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64urlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? enc.encode(input) : input;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function b64urlDecodeToString(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return dec.decode(bytes);
}

export async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Compare two secrets without leaking their length or position of the first mismatch (hash both, then compare). */
export async function safeSecretEqual(a: string, b: string): Promise<boolean> {
  const ha = await hmacHex('kft-secret-compare', a);
  const hb = await hmacHex('kft-secret-compare', b);
  return constantTimeEqual(ha, hb);
}

export type TokenScope = 'admin' | 'pin';

export async function signToken(
  secret: string,
  scope: TokenScope,
  ttlSeconds: number,
  nowMs: number = Date.now()
): Promise<{ token: string; expiresAt: number }> {
  const iat = Math.floor(nowMs / 1000);
  const exp = iat + ttlSeconds;
  const payload = b64urlEncode(JSON.stringify({ sub: 'admin', scope, iat, exp }));
  const sig = await hmacHex(secret, payload);
  return { token: `${payload}.${sig}`, expiresAt: exp * 1000 };
}

export async function verifyToken(
  secret: string,
  token: unknown,
  scope: TokenScope,
  nowMs: number = Date.now()
): Promise<{ ok: boolean; reason?: string }> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 2000) return { ok: false, reason: 'format' };
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'format' };
  const expect = await hmacHex(secret, parts[0]);
  if (!constantTimeEqual(expect, parts[1].toLowerCase())) return { ok: false, reason: 'signature' };
  try {
    const p = JSON.parse(b64urlDecodeToString(parts[0]));
    if (p.scope !== scope) return { ok: false, reason: 'scope' };
    if (!(Number(p.exp) > Math.floor(nowMs / 1000))) return { ok: false, reason: 'expired' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'payload' };
  }
}

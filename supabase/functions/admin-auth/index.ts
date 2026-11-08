// Supabase Edge Function: admin-auth
// Server-side verification & rotation of the Admin PIN + password.
// Initial credentials live in Supabase secrets (ADMIN_PIN, ADMIN_PASSWORD); when the Admin changes their password or
// PIN inside the app, the PBKDF2-SHA256 hash (`admin_password_hash` / `admin_pin_hash`) is stored in the private
// service-role-only `public.kft_security_config` table (RLS enabled, zero anon/authenticated policies) and takes
// precedence over the initial bootstrap env secret.
//
// POST /admin-auth
//   {action:'status'}                                                 -> {ok, configured}
//   {action:'pin', pin}                                               -> {ok, ticket, ticketExpiresAt}  (10 min)
//   {action:'login', username, password, ticket}                      -> {ok, token, expiresAt}         (7 days)
//   {action:'verify', token}                                          -> {ok}
//   {action:'change_password', newPassword, currentPassword?, token?, ticket?} -> {ok, token, expiresAt}
//   {action:'change_pin', newPin, currentPassword?, token?, ticket?}  -> {ok, ticket, ticketExpiresAt}

import { hashSecretPBKDF2, safeSecretEqual, signToken, verifySecretPBKDF2, verifyToken } from '../_shared/admin-token.ts';
import { WindowLimiter, envInt } from '../_shared/common.ts';
import { background, getSecurityConfig, logUsage, setSecurityConfig, usageGet, usageHit } from '../_shared/supa.ts';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'x-admin-auth',
  'x-admin-auth': '1',
};

const ADMIN_USERNAMES = new Set(['chea savuth', 'cheasavuth', 'admin']);
const TICKET_TTL_S = 10 * 60;
const TOKEN_TTL_S = 7 * 24 * 3600;
const burst = new WindowLimiter(20, 5 * 60_000);

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return req.headers.get('cf-connecting-ip') || fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

let cachedSecret: { value: string; at: number } | null = null;
async function tokenSecret(): Promise<string | null> {
  if (cachedSecret && Date.now() - cachedSecret.at < 5 * 60_000) return cachedSecret.value;
  const v = await getSecurityConfig('admin_token_secret');
  if (v && v.length >= 32) cachedSecret = { value: v, at: Date.now() };
  return v && v.length >= 32 ? v : null;
}

async function verifyActivePin(candidatePin: string, envPin: string, storedPinHash: string | null): Promise<boolean> {
  if (!/^\d{6}$/.test(candidatePin)) return false;
  if (storedPinHash && storedPinHash.startsWith('pbkdf2$')) {
    return await verifySecretPBKDF2(candidatePin, storedPinHash);
  }
  return envPin.length >= 6 ? await safeSecretEqual(candidatePin, envPin) : false;
}

async function verifyActivePassword(candidatePass: string, envPass: string, storedPassHash: string | null): Promise<boolean> {
  if (!candidatePass) return false;
  if (storedPassHash && storedPassHash.startsWith('pbkdf2$')) {
    return await verifySecretPBKDF2(candidatePass, storedPassHash);
  }
  return envPass.length >= 8 ? await safeSecretEqual(candidatePass, envPass.trim()) : false;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

  const adminPinEnv = Deno.env.get('ADMIN_PIN') || '';
  const adminPasswordEnv = Deno.env.get('ADMIN_PASSWORD') || '';
  const [secret, storedPassHash, storedPinHash] = await Promise.all([
    tokenSecret(),
    getSecurityConfig('admin_password_hash'),
    getSecurityConfig('admin_pin_hash'),
  ]);

  const hasValidPin = Boolean((storedPinHash && storedPinHash.startsWith('pbkdf2$')) || adminPinEnv.length >= 6);
  const hasValidPass = Boolean((storedPassHash && storedPassHash.startsWith('pbkdf2$')) || adminPasswordEnv.length >= 8);
  const configured = hasValidPin && hasValidPass && Boolean(secret);

  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text.length > 4000) return json(413, { ok: false, error: 'TOO_LARGE' });
    body = JSON.parse(text || '{}');
  } catch {
    return json(400, { ok: false, error: 'BAD_REQUEST' });
  }
  const action = typeof body.action === 'string' ? body.action : '';

  if (action === 'status') return json(200, { ok: true, configured });
  if (!configured || !secret) return json(503, { ok: false, error: 'ADMIN_AUTH_NOT_CONFIGURED' });

  if (action === 'verify') {
    const r = await verifyToken(secret, body.token, 'admin');
    return json(200, { ok: r.ok });
  }

  if (
    action !== 'pin' &&
    action !== 'login' &&
    action !== 'change_password' &&
    action !== 'change_pin'
  ) {
    return json(400, { ok: false, error: 'UNKNOWN_ACTION' });
  }

  // ---- brute-force protection (per IP and global, persisted in Postgres) ------------------------------------
  const ip = clientIp(req);
  const ipKey = `ip:${ip}`;
  if (!burst.allow(ip)) return json(429, { ok: false, error: 'LOCKED', retryAfterSeconds: 300 });
  const ipFails = (await usageGet(ipKey, 'admin_fail')) ?? 0;
  const globalFails = (await usageGet('global', 'admin_fail')) ?? 0;
  if (ipFails >= envInt(Deno.env.get('ADMIN_MAX_FAILS_PER_IP'), 8, 3, 100) || globalFails >= envInt(Deno.env.get('ADMIN_MAX_FAILS_GLOBAL'), 200, 10, 5000)) {
    background(logUsage({ user_key: ipKey, kind: 'admin_auth', status: 429, note: 'locked' }));
    return json(429, { ok: false, error: 'LOCKED', retryAfterSeconds: 3600 });
  }

  const fail = async (error: string): Promise<Response> => {
    await usageHit(ipKey, 'admin_fail', 1);
    await usageHit('global', 'admin_fail', 1);
    background(logUsage({ user_key: ipKey, kind: 'admin_auth', status: 401, note: error }));
    return json(401, { ok: false, error, attemptsLeft: Math.max(0, envInt(Deno.env.get('ADMIN_MAX_FAILS_PER_IP'), 8, 3, 100) - ipFails - 1) });
  };

  if (action === 'pin') {
    const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
    if (!(await verifyActivePin(pin, adminPinEnv, storedPinHash))) return await fail('INVALID_PIN');
    const t = await signToken(secret, 'pin', TICKET_TTL_S);
    background(logUsage({ user_key: ipKey, kind: 'admin_auth', status: 200, note: 'pin_ok' }));
    return json(200, { ok: true, ticket: t.token, ticketExpiresAt: t.expiresAt });
  }

  if (action === 'change_password') {
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : '';
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword.trim() : '';
    if (newPassword.length < 8 || newPassword.length > 256) {
      return json(400, { ok: false, error: 'PASSWORD_TOO_SHORT' });
    }

    const adminTok = await verifyToken(secret, body.token, 'admin');
    const pinTok = await verifyToken(secret, body.ticket, 'pin');
    if (!adminTok.ok && !pinTok.ok) {
      return json(401, { ok: false, error: 'PIN_REQUIRED' });
    }

    // If changing via PIN ticket (not yet logged into AdminDashboard), currentPassword MUST be supplied and valid.
    // If already logged into AdminDashboard with a valid signed admin token, also verify currentPassword when supplied.
    if (!adminTok.ok || currentPassword.length > 0) {
      const curOk = await verifyActivePassword(currentPassword, adminPasswordEnv, storedPassHash);
      if (!curOk) return await fail('INVALID_CREDENTIALS');
    }

    const newHash = await hashSecretPBKDF2(newPassword);
    const saved = await setSecurityConfig('admin_password_hash', newHash);
    if (!saved) return json(500, { ok: false, error: 'SAVE_FAILED' });

    const freshToken = await signToken(secret, 'admin', TOKEN_TTL_S);
    background(logUsage({ user_key: ipKey, kind: 'admin_auth', status: 200, note: 'password_changed' }));
    return json(200, { ok: true, token: freshToken.token, expiresAt: freshToken.expiresAt });
  }

  if (action === 'change_pin') {
    const newPin = typeof body.newPin === 'string' ? body.newPin.trim() : '';
    if (!/^\d{6}$/.test(newPin)) {
      return json(400, { ok: false, error: 'INVALID_NEW_PIN' });
    }

    const adminTok = await verifyToken(secret, body.token, 'admin');
    const pinTok = await verifyToken(secret, body.ticket, 'pin');
    if (!adminTok.ok && !pinTok.ok) {
      return json(401, { ok: false, error: 'PIN_REQUIRED' });
    }

    const newPinHash = await hashSecretPBKDF2(newPin);
    const saved = await setSecurityConfig('admin_pin_hash', newPinHash);
    if (!saved) return json(500, { ok: false, error: 'SAVE_FAILED' });

    const freshTicket = await signToken(secret, 'pin', TICKET_TTL_S);
    background(logUsage({ user_key: ipKey, kind: 'admin_auth', status: 200, note: 'pin_changed' }));
    return json(200, { ok: true, ticket: freshTicket.token, ticketExpiresAt: freshTicket.expiresAt });
  }

  // action === 'login'
  const ticket = await verifyToken(secret, body.ticket, 'pin');
  if (!ticket.ok) return json(401, { ok: false, error: 'PIN_REQUIRED' });
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password.trim() : '';
  const userOk = ADMIN_USERNAMES.has(username);
  const passOk = await verifyActivePassword(password, adminPasswordEnv, storedPassHash);
  if (!userOk || !passOk) return await fail('INVALID_CREDENTIALS');
  const t = await signToken(secret, 'admin', TOKEN_TTL_S);
  background(logUsage({ user_key: ipKey, kind: 'admin_auth', status: 200, note: 'login_ok' }));
  return json(200, { ok: true, token: t.token, expiresAt: t.expiresAt });
});
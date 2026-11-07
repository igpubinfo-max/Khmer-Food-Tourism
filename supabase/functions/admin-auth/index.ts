// Supabase Edge Function: admin-auth
// Server-side verification of the Admin PIN + password. The credentials live ONLY in Supabase secrets
// (ADMIN_PIN, ADMIN_PASSWORD) - never in the APK, never in a public table. A successful login returns a signed,
// expiring token that the database guard (kft_admin_keys_guard) checks before it accepts writes to the admin-only
// documents (app settings, VIP pricing, payment QR / bank details, download links, PIN).
//
// Deploy:
//   supabase secrets set ADMIN_PIN=<6 digits> ADMIN_PASSWORD=<long password> --project-ref ryvltobwuwuulazqjnza
//   supabase functions deploy admin-auth --no-verify-jwt --project-ref ryvltobwuwuulazqjnza
// (run supabase_admin_security_v1.sql once first: it creates the private signing secret)
//
// POST /admin-auth
//   {action:'status'}                         -> {configured}
//   {action:'pin', pin}                       -> {ok, ticket, ticketExpiresAt}        (ticket valid 10 min)
//   {action:'login', username, password, ticket} -> {ok, token, expiresAt}            (token valid 7 days)
//   {action:'verify', token}                  -> {ok}

import { safeSecretEqual, signToken, verifyToken } from '../_shared/admin-token.ts';
import { WindowLimiter, envInt } from '../_shared/common.ts';
import { background, getSecurityConfig, logUsage, usageGet, usageHit } from '../_shared/supa.ts';

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
const burst = new WindowLimiter(12, 5 * 60_000); // per isolate / IP / 5 min (the daily DB counters are the hard limit)

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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

  const adminPin = Deno.env.get('ADMIN_PIN') || '';
  const adminPassword = Deno.env.get('ADMIN_PASSWORD') || '';
  const secret = await tokenSecret();
  const configured = adminPin.length >= 6 && adminPassword.length >= 10 && Boolean(secret);

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
  if (action !== 'pin' && action !== 'login') return json(400, { ok: false, error: 'UNKNOWN_ACTION' });

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
    const pin = typeof body.pin === 'string' ? body.pin : '';
    if (!/^\d{6}$/.test(pin) || !(await safeSecretEqual(pin, adminPin))) return await fail('INVALID_PIN');
    const t = await signToken(secret, 'pin', TICKET_TTL_S);
    background(logUsage({ user_key: ipKey, kind: 'admin_auth', status: 200, note: 'pin_ok' }));
    return json(200, { ok: true, ticket: t.token, ticketExpiresAt: t.expiresAt });
  }

  // action === 'login'
  const ticket = await verifyToken(secret, body.ticket, 'pin');
  if (!ticket.ok) return json(401, { ok: false, error: 'PIN_REQUIRED' });
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password.trim() : '';
  const userOk = ADMIN_USERNAMES.has(username);
  const passOk = await safeSecretEqual(password, adminPassword.trim());
  if (!userOk || !passOk) return await fail('INVALID_CREDENTIALS');
  const t = await signToken(secret, 'admin', TOKEN_TTL_S);
  background(logUsage({ user_key: ipKey, kind: 'admin_auth', status: 200, note: 'login_ok' }));
  return json(200, { ok: true, token: t.token, expiresAt: t.expiresAt });
});

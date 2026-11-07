/**
 * Client side of the `admin-auth` Supabase Edge Function.
 *
 * When the function is deployed AND its secrets are set ("active"), the Admin PIN and password are verified on the
 * server and a signed token (valid 7 days) is stored on this device. That token is sent as `x-kft-admin-token` with every
 * write to the admin-only documents (payment QR / bank details, VIP prices, download links, PIN); the database trigger
 * `kft_admin_keys_guard` rejects those writes without it once enforcement is switched on.
 *
 * When the function is NOT available (not deployed / secrets missing / offline) every helper reports "unavailable" so the
 * caller falls back to the legacy local check - nothing breaks before or during the roll-out.
 */
import { getCloudApiConfig } from './supabaseService';

export const ADMIN_ONLY_KV_KEYS: readonly string[] = [
  'kft_cloud_app_settings_v1',
  'kft_cloud_admin_vip_pricing_v2',
  'kft_admin_pin_security_v1',
];

const TOKEN_STORAGE_KEY = 'kft_admin_token_v1';
const STATUS_TTL_MS = 60_000;

let pinTicket: { ticket: string; expiresAt: number } | null = null;
let statusCache: { active: boolean; at: number } | null = null;

interface StoredToken {
  token: string;
  expiresAt: number;
}

export function getAdminToken(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as StoredToken;
    if (t && typeof t.token === 'string' && typeof t.expiresAt === 'number' && t.expiresAt > Date.now() + 60_000) return t.token;
  } catch {
    /* ignore */
  }
  return null;
}

function storeAdminToken(token: string, expiresAt: number): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ token, expiresAt }));
  } catch {
    /* ignore */
  }
}

export function clearAdminToken(): void {
  pinTicket = null;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Header carrying the admin token for writes to admin-only documents (empty object otherwise). */
export function adminTokenHeaders(key: string): Record<string, string> {
  // Admin-only documents, and per-user rows (an admin can grant / adjust VIP from the Admin portal; the database VIP guard
  // accepts those writes only with a valid admin token). Ordinary users never have a token.
  if (!ADMIN_ONLY_KV_KEYS.includes(key) && !key.startsWith('kft_user_')) return {};
  const token = getAdminToken();
  return token ? { 'x-kft-admin-token': token } : {};
}

type CallResult =
  | { kind: 'unavailable' }
  | { kind: 'response'; status: number; data: any };

async function callAdminAuth(body: Record<string, unknown>, timeoutMs = 9000): Promise<CallResult> {
  const cfg = getCloudApiConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || typeof fetch === 'undefined') return { kind: 'unavailable' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.supabaseUrl.replace(/\/+$/, '')}/functions/v1/admin-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    // Our function stamps every answer; gateway 404 / 401 (not deployed) has no stamp.
    if (res.headers.get('x-admin-auth') !== '1') return { kind: 'unavailable' };
    const data = await res.json().catch(() => ({}));
    return { kind: 'response', status: res.status, data };
  } catch {
    return { kind: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

/** True when the server-side admin login is deployed and configured (cached for a minute). */
export async function isAdminServerAuthActive(): Promise<boolean> {
  if (statusCache && Date.now() - statusCache.at < STATUS_TTL_MS) return statusCache.active;
  const r = await callAdminAuth({ action: 'status' }, 6000);
  const active = r.kind === 'response' && r.status === 200 && Boolean(r.data?.configured);
  if (r.kind === 'response') statusCache = { active, at: Date.now() };
  return active;
}

export type ServerAuthOutcome =
  | { kind: 'ok' }
  | { kind: 'invalid'; attemptsLeft?: number }
  | { kind: 'locked'; retryAfterSeconds?: number }
  | { kind: 'pin_required' }
  | { kind: 'unavailable' };

function mapOutcome(r: CallResult): ServerAuthOutcome {
  if (r.kind === 'unavailable') return { kind: 'unavailable' };
  if (r.status === 503) return { kind: 'unavailable' }; // not configured yet
  if (r.status === 200 && r.data?.ok) return { kind: 'ok' };
  if (r.status === 429) return { kind: 'locked', retryAfterSeconds: Number(r.data?.retryAfterSeconds) || undefined };
  if (r.data?.error === 'PIN_REQUIRED') return { kind: 'pin_required' };
  if (r.status === 401) return { kind: 'invalid', attemptsLeft: typeof r.data?.attemptsLeft === 'number' ? r.data.attemptsLeft : undefined };
  return { kind: 'unavailable' };
}

export async function adminServerVerifyPin(pin: string): Promise<ServerAuthOutcome> {
  const r = await callAdminAuth({ action: 'pin', pin });
  const out = mapOutcome(r);
  if (out.kind === 'ok' && r.kind === 'response') {
    pinTicket = { ticket: String(r.data.ticket), expiresAt: Number(r.data.ticketExpiresAt) || Date.now() + 9 * 60_000 };
    statusCache = { active: true, at: Date.now() };
  }
  return out;
}

export async function adminServerLogin(username: string, password: string): Promise<ServerAuthOutcome> {
  if (!pinTicket || pinTicket.expiresAt < Date.now()) {
    // No PIN ticket in this session: only meaningful when the server auth is active; otherwise legacy path applies.
    return (await isAdminServerAuthActive()) ? { kind: 'pin_required' } : { kind: 'unavailable' };
  }
  const r = await callAdminAuth({ action: 'login', username, password, ticket: pinTicket.ticket });
  const out = mapOutcome(r);
  if (out.kind === 'ok' && r.kind === 'response') {
    storeAdminToken(String(r.data.token), Number(r.data.expiresAt));
    pinTicket = null;
  }
  if (out.kind === 'pin_required') pinTicket = null;
  return out;
}

/** Test hook. */
export function resetAdminAuthClientState(): void {
  pinTicket = null;
  statusCache = null;
}

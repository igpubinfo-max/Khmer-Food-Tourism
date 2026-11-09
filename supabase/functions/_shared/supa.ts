// Tiny service-role PostgREST client for Edge Functions (Deno). The service-role key is injected by Supabase
// (SUPABASE_SERVICE_ROLE_KEY) and never leaves the server. Every helper FAILS OPEN/SOFT: a missing table or
// a database hiccup must never take AI / Places offline - it only disables quota, cache and logging.

declare const Deno: { env: { get: (key: string) => string | undefined } };

function cfg(): { url: string; key: string } | null {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return url && key ? { url: url.replace(/\/+$/, ''), key } : null;
}

async function call(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response | null> {
  const c = cfg();
  if (!c) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 3500);
  try {
    return await fetch(`${c.url}/rest/v1/${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: c.key,
        Authorization: `Bearer ${c.key}`,
        'Content-Type': 'application/json',
        ...((init.headers as Record<string, string>) || {}),
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Atomic daily counter. Returns the new count, or null when the counter is unavailable (fail-open). */
export async function usageHit(userKey: string, kind: string, weight = 1): Promise<number | null> {
  const r = await call('rpc/kft_api_usage_hit', {
    method: 'POST',
    body: JSON.stringify({ p_user: userKey, p_kind: kind, p_weight: weight }),
  });
  if (!r || !r.ok) return null;
  const n = Number(await r.json());
  return Number.isFinite(n) ? n : null;
}

/** Reset/clear today's counter for a specific userKey + kind (e.g., on successful login/reset). */
export async function usageClear(userKey: string, kind: string): Promise<void> {
  const day = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  await call(
    `kft_api_usage_daily?day=eq.${day}&user_key=eq.${encodeURIComponent(userKey.slice(0, 160))}&kind=eq.${encodeURIComponent(kind)}`,
    { method: 'DELETE', headers: { Prefer: 'return=minimal' } }
  );
}

/** Read today's counter without incrementing it (null when unavailable). */
export async function usageGet(userKey: string, kind: string): Promise<number | null> {
  const day = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10); // Asia/Phnom_Penh (UTC+7)
  const r = await call(
    `kft_api_usage_daily?day=eq.${day}&user_key=eq.${encodeURIComponent(userKey.slice(0, 160))}&kind=eq.${encodeURIComponent(kind)}&select=hits&limit=1`
  );
  if (!r || !r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) ? (rows[0] ? Number(rows[0].hits) || 0 : 0) : null;
}

/** Private server-side config value (kft_security_config is service-role only). */
export async function getSecurityConfig(name: string): Promise<string | null> {
  const r = await call(`kft_security_config?name=eq.${encodeURIComponent(name)}&select=value&limit=1`);
  if (!r || !r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] && typeof rows[0].value === 'string' ? rows[0].value : null;
}
/** Upsert private server-side config value (kft_security_config is service-role only). */
export async function setSecurityConfig(name: string, value: string): Promise<boolean> {
  const r = await call('kft_security_config?on_conflict=name', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ name, value, updated_at: new Date().toISOString() }),
    timeoutMs: 6000,
  });
  return Boolean(r && r.ok);
}

/** Generic helpers used by the payment function (service role). */
export async function restInsert(table: string, row: Record<string, unknown>): Promise<{ status: number; error?: string }> {
  const r = await call(table, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row), timeoutMs: 6000 });
  if (!r) return { status: 0, error: 'unreachable' };
  return { status: r.status, error: r.ok ? undefined : (await r.text().catch(() => '')).slice(0, 200) };
}

export async function restSelectRows(pathAndQuery: string): Promise<Array<Record<string, unknown>> | null> {
  const r = await call(pathAndQuery, { timeoutMs: 5000 });
  if (!r || !r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) ? rows : null;
}

export async function restPatch(pathAndQuery: string, patch: Record<string, unknown>): Promise<boolean> {
  const r = await call(pathAndQuery, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch), timeoutMs: 5000 });
  return Boolean(r && r.ok);
}

/** Upsert one kv document (service role => trusted by the VIP / admin guards). */
export async function writeKv(key: string, payload: unknown): Promise<boolean> {
  const r = await call('kft_app_kv_store?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key, payload, updated_at: new Date().toISOString() }),
    timeoutMs: 6000,
  });
  return Boolean(r && r.ok);
}

export interface UsageLogRow {
  user_key?: string | null;
  kind: string;
  provider?: string;
  model?: string;
  status?: number;
  tokens_in?: number | null;
  tokens_out?: number | null;
  cache_hit?: boolean;
  ms?: number;
  note?: string;
}

export async function logUsage(row: UsageLogRow): Promise<void> {
  await call('kft_api_usage_log', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
}

export async function readUserDoc(key: string): Promise<unknown | null> {
  const r = await call(`kft_app_kv_store?key=eq.${encodeURIComponent(key)}&select=payload&limit=1`);
  if (!r || !r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0].payload : null;
}

export async function cacheGet(cacheKey: string): Promise<unknown | null> {
  const r = await call(
    `kft_places_cache?cache_key=eq.${encodeURIComponent(cacheKey)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=payload&limit=1`
  );
  if (!r || !r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0].payload : null;
}

export async function cachePut(cacheKey: string, payload: unknown, ttlMs: number): Promise<void> {
  await call('kft_places_cache?on_conflict=cache_key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ cache_key: cacheKey, payload, expires_at: new Date(Date.now() + ttlMs).toISOString() }),
  });
}

/** Run work after the response has been sent (falls back to fire-and-forget). */
export function background(work: Promise<unknown>): void {
  const g = globalThis as unknown as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } };
  const safe = work.catch(() => {});
  if (g.EdgeRuntime?.waitUntil) g.EdgeRuntime.waitUntil(safe);
}

import { getAppAttestationHeaders, isAppCloneTampered } from '../utils/appCloneIntegrityGuard';
/**
 * Client side of the `places-proxy` Supabase Edge Function.
 *
 * Every Google Places (New) call of the app goes through `placesFetch`. When the Edge Function is deployed and has its
 * GOOGLE_MAPS_API_KEY secret, requests are sent there (the Google key then never has to exist inside the APK, results are
 * cached in Postgres and a per-user daily quota protects the Google bill). When it is NOT available the call falls back
 * to the old direct request, so nothing breaks before / during deployment.
 */
import { getApiUserId } from '../utils/apiIdentity';
import { getCloudApiConfig } from './supabaseService';

const STATE_KEY = 'kft_places_proxy_state_v1';
const ALIVE_TTL_MS = 6 * 60 * 60 * 1000; // re-verify the proxy every 6 h
const ALIVE_TRUST_MS = 7 * 24 * 60 * 60 * 1000; // ...but trust a good answer for up to a week (refreshed on every use)
const DOWN_RETRY_MS = 10 * 60 * 1000;

interface ProxyState {
  ok: boolean;
  at: number;
}

let memState: ProxyState | null = null;
let probeInFlight: Promise<boolean> | null = null;

function readState(): ProxyState | null {
  if (memState) return memState;
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p && typeof p.ok === 'boolean' && typeof p.at === 'number') {
      memState = p;
      return p;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeState(ok: boolean): void {
  memState = { ok, at: Date.now() };
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STATE_KEY, JSON.stringify(memState));
  } catch {
    /* ignore */
  }
}

/** Test hook. */
export function resetPlacesProxyState(): void {
  memState = null;
  probeInFlight = null;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STATE_KEY);
  } catch {
    /* ignore */
  }
}

/** True when the proxy answered correctly recently (the app may then work WITHOUT a Google key on the device). */
export function isPlacesProxyKnownAlive(): boolean {
  const s = readState();
  return Boolean(s && s.ok && Date.now() - s.at < ALIVE_TRUST_MS);
}

function proxyBase(): string {
  const cfg = getCloudApiConfig();
  return `${(cfg.supabaseUrl || '').replace(/\/+$/, '')}/functions/v1/places-proxy`;
}

/** Cheap, free health check (`?health=1`). Never throws. */
export function probePlacesProxy(): Promise<boolean> {
  if (probeInFlight) return probeInFlight;
  const cfg = getCloudApiConfig();
  if (!cfg.supabaseUrl || typeof fetch === 'undefined') return Promise.resolve(false);
  probeInFlight = (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${proxyBase()}?health=1`, {
        method: 'GET',
        headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}` },
        signal: controller.signal,
      });
      clearTimeout(timer);
      let ok = false;
      if (res.ok && res.headers.get('x-places-proxy') === '1') {
        const body = await res.json().catch(() => null);
        ok = Boolean(body && body.configured);
      }
      writeState(ok);
      return ok;
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        probeInFlight = null;
      }, 60_000);
    }
  })();
  return probeInFlight;
}

/** Kick off a probe when the state is unknown / stale (fire-and-forget, safe to call often). */
export function ensurePlacesProxyProbed(): void {
  const s = readState();
  if (s && (s.ok ? Date.now() - s.at < ALIVE_TTL_MS : Date.now() - s.at < DOWN_RETRY_MS)) return;
  void probePlacesProxy();
}

/** Stand-in "key" handed to code that only checks "is a Google key configured?" while the proxy holds the real one. */
export const PLACES_PROXY_PLACEHOLDER_KEY = 'via-places-proxy';

/**
 * The key value the Places helpers should use / test. With a working proxy the real key lives server-side, so a
 * placeholder is returned (it is never sent to Google: `placesFetch` / `buildPlacesPhotoUrl` route via the proxy).
 */
export function getEffectivePlacesKey(): string {
  if (isPlacesProxyKnownAlive()) return PLACES_PROXY_PLACEHOLDER_KEY;
  const key = (getCloudApiConfig().googleMapsApiKey || '').trim();
  if (!key) ensurePlacesProxyProbed();
  return key;
}

function parsePlacesUrl(url: string): { path: string; query: URLSearchParams } | null {
  const m = /^https:\/\/places\.googleapis\.com\/v1\/([^?#]+)(?:\?([^#]*))?/.exec(url);
  if (!m) return null;
  return { path: decodeURIComponent(m[1]), query: new URLSearchParams(m[2] || '') };
}

/**
 * Drop-in replacement for `fetch('https://places.googleapis.com/v1/...', { headers: {X-Goog-Api-Key, X-Goog-FieldMask} })`.
 */
export async function placesFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (isAppCloneTampered()) {
    return new Response(JSON.stringify({ error: { status: 'PERMISSION_DENIED', message: 'Cloned app blocked' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  const parsed = parsePlacesUrl(url);
  const state = readState();
  const proxyUsable = !state || state.ok || Date.now() - state.at > DOWN_RETRY_MS;
  if (!parsed || !proxyUsable) return fetch(url, init);

  const cfg = getCloudApiConfig();
  const headers = new Headers(init.headers || {});
  const fieldMask = headers.get('X-Goog-FieldMask') || '';
  let body: unknown;
  if (typeof init.body === 'string' && init.body) {
    try {
      body = JSON.parse(init.body);
    } catch {
      return fetch(url, init);
    }
  }
  const userId = getApiUserId();
  try {
    const res = await fetch(proxyBase(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        ...(userId ? { 'x-kft-user-id': userId } : {}),
        ...getAppAttestationHeaders(),
      },
      body: JSON.stringify({ path: parsed.path, fieldMask, languageCode: parsed.query.get('languageCode') || undefined, body }),
      signal: init.signal,
    });
    const isOurProxy = res.headers.get('x-places-proxy') === '1';
    if (!isOurProxy || res.status === 404 || (res.status === 503 && !res.headers.get('x-places-cache'))) {
      // Not deployed (gateway 404) or secret missing (503) -> remember and fall back to the direct call.
      writeState(false);
      return fetch(url, init);
    }
    writeState(true);
    return res;
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') throw err;
    return fetch(url, init); // proxy host unreachable -> direct
  }
}

/**
 * Photo URL for an <img>. Goes through the proxy (no key in the URL) once the proxy is known to work, otherwise the
 * legacy direct Google URL. The `src=places.googleapis.com` marker keeps the existing "never persist paid Google photo
 * URLs" checks (`includes('places.googleapis.com')`) working for proxy URLs too.
 */
export function buildPlacesPhotoUrl(photoName: string, widthPx: number, heightPx: number, apiKey: string): string {
  if (isPlacesProxyKnownAlive()) {
    return `${proxyBase()}/${photoName}?w=${widthPx}&h=${heightPx}&src=places.googleapis.com`;
  }
  ensurePlacesProxyProbed();
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${widthPx}&maxHeightPx=${heightPx}&key=${encodeURIComponent(apiKey)}`;
}

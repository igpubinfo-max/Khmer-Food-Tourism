// Supabase Edge Function: places-proxy
// Secure + cached gateway for the Google Maps Platform "Places API (New)".
//   * The Google key (GOOGLE_MAPS_API_KEY) lives ONLY in a Supabase secret - never in the APK / web bundle.
//   * Only searchText, searchNearby, Place Details and Place Photo are forwarded (see sanitize.ts).
//   * Text / nearby / details responses are cached in Postgres (kft_places_cache; 1-7 days) => fewer Google calls.
//     Place PHOTOS are never stored (Google's terms) - they are streamed with a 1-day browser/CDN cache header.
//   * Per-user / per-IP DAILY quota (kft_api_usage_daily) + per-minute burst limit => hard cost control.
//
// Deploy:
//   supabase secrets set GOOGLE_MAPS_API_KEY=... --project-ref ryvltobwuwuulazqjnza
//   supabase functions deploy places-proxy --no-verify-jwt --project-ref ryvltobwuwuulazqjnza
//
// Routes
//   POST /places-proxy                       {path, fieldMask, body?, languageCode?}  -> Google JSON
//   GET  /places-proxy/places/<id>/photos/<ref>?w=480&h=480                           -> image bytes
//   GET  /places-proxy?health=1                                                         -> {ok, configured}

import { sanitizePhotoRequest, sanitizePlacesRequest, MAX_BODY_BYTES } from './sanitize.ts';
import { WindowLimiter, envInt, safeUserId, sha256Hex, verifyClientAppIntegrity } from '../_shared/common.ts';
import { background, cacheGet, cachePut, logUsage, usageHit } from '../_shared/supa.ts';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kft-user-id, x-kft-app-id, x-kft-app-platform, x-kft-app-sig',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Expose-Headers': 'x-places-proxy, x-places-cache',
  'x-places-proxy': '1',
};

const perMinute = new WindowLimiter(90, 60_000);
const photoPerMinute = new WindowLimiter(240, 60_000);

function json(status: number, payload: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra } });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return req.headers.get('cf-connecting-ip') || fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const appIntegrity = verifyClientAppIntegrity(req);
  if (!appIntegrity.ok) return json(403, { error: { status: 'PERMISSION_DENIED', message: 'Unauthorized cloned/modified app' } });
  const url = new URL(req.url);
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

  if (req.method === 'GET' && url.searchParams.get('health') === '1') {
    return json(200, { ok: true, configured: Boolean(apiKey) });
  }
  if (!apiKey) {
    return json(503, { error: { status: 'PLACES_NOT_CONFIGURED', message: 'GOOGLE_MAPS_API_KEY secret is not set' } });
  }

  const started = Date.now();
  const ip = clientIp(req);
  const userId = safeUserId(req.headers.get('x-kft-user-id'));
  const quotaKey = userId || `ip:${ip}`;

  // ---------------------------------------------------------------- photo (GET /places-proxy/places/<id>/photos/<ref>)
  const photoMatch = /\/places-proxy\/(places\/[^/]+\/photos\/[^/]+)$/.exec(url.pathname);
  if (req.method === 'GET' && photoMatch) {
    const photo = sanitizePhotoRequest(decodeURIComponent(photoMatch[1]), url.searchParams.get('w'), url.searchParams.get('h'));
    if (!photo.ok) return json(400, { error: { status: 'INVALID_ARGUMENT', message: 'bad photo reference' } });
    if (!photoPerMinute.allow(ip)) return json(429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'Too many photo requests' } }, { 'Retry-After': '30' });
    const used = await usageHit(quotaKey, 'places_photo', 1);
    if (used !== null && used > envInt(Deno.env.get('PLACES_DAILY_PHOTO_LIMIT'), 1500)) {
      return json(429, { error: { status: 'DAILY_QUOTA_EXCEEDED', message: 'Daily photo limit reached' } }, { 'Retry-After': '3600' });
    }
    try {
      const upstream = await fetchWithTimeout(
        `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=${photo.w}&maxHeightPx=${photo.h}&key=${encodeURIComponent(apiKey)}`,
        { method: 'GET', redirect: 'follow' },
        15_000
      );
      if (!upstream.ok) return json(upstream.status === 404 ? 404 : 502, { error: { status: 'UPSTREAM_ERROR', message: `Google ${upstream.status}` } });
      background(logUsage({ user_key: quotaKey, kind: 'places_photo', provider: 'google_places', status: 200, ms: Date.now() - started }));
      return new Response(upstream.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    } catch {
      return json(504, { error: { status: 'DEADLINE_EXCEEDED', message: 'Google photo timed out' } });
    }
  }

  // ---------------------------------------------------------------- JSON operations
  if (req.method !== 'POST') return json(405, { error: { status: 'METHOD_NOT_ALLOWED', message: 'POST only' } });
  if (!perMinute.allow(ip)) return json(429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'Too many requests, please slow down.' } }, { 'Retry-After': '30' });

  const declared = Number(req.headers.get('content-length') || '0');
  if (declared > MAX_BODY_BYTES + 4000) return json(413, { error: { status: 'PAYLOAD_TOO_LARGE', message: 'Request too large' } });
  let parsed: unknown;
  try {
    parsed = JSON.parse(await req.text());
  } catch {
    return json(400, { error: { status: 'BAD_REQUEST', message: 'Invalid JSON' } });
  }
  const checked = sanitizePlacesRequest(parsed);
  if (!checked.ok) return json(checked.status, { error: { status: 'INVALID_ARGUMENT', message: checked.message } });
  const call = checked.call;

  // 1) server-side cache (does NOT count against the daily quota - it costs Google nothing)
  const cacheKey = await sha256Hex(call.cacheKeyMaterial);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    background(logUsage({ user_key: quotaKey, kind: 'places', provider: 'google_places', status: 200, cache_hit: true, ms: Date.now() - started, note: call.op }));
    return json(200, cached, { 'x-places-cache': 'hit' });
  }

  // 2) daily quota
  const limit = userId ? envInt(Deno.env.get('PLACES_DAILY_LIMIT_USER'), 400) : envInt(Deno.env.get('PLACES_DAILY_LIMIT_ANON'), 120);
  const used = await usageHit(quotaKey, 'places', 1);
  if (used !== null && used > limit) {
    background(logUsage({ user_key: quotaKey, kind: 'places', status: 429, note: 'daily_quota', ms: Date.now() - started }));
    return json(429, { error: { status: 'DAILY_QUOTA_EXCEEDED', message: 'Daily map-search limit reached. Try again tomorrow.' } }, { 'Retry-After': '3600' });
  }

  // 3) Google
  try {
    const upstream = await fetchWithTimeout(
      `https://places.googleapis.com/v1/${call.upstreamPath}`,
      {
        method: call.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': call.fieldMask,
        },
        body: call.body ? JSON.stringify(call.body) : undefined,
      },
      12_000
    );
    const text = await upstream.text();
    background(logUsage({ user_key: quotaKey, kind: 'places', provider: 'google_places', status: upstream.status, ms: Date.now() - started, note: call.op }));
    if (upstream.ok && text.length < 400_000) {
      try {
        const body = JSON.parse(text);
        // Google page tokens expire quickly: a page that carries one is only cached for an hour.
        const ttl = body && typeof body === 'object' && (body as { nextPageToken?: string }).nextPageToken ? Math.min(call.ttlMs, 60 * 60_000) : call.ttlMs;
        background(cachePut(cacheKey, body, ttl));
      } catch {
        /* not JSON => not cached */
      }
    }
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': upstream.headers.get('content-type') || 'application/json', 'x-places-cache': 'miss' },
    });
  } catch (err) {
    const aborted = (err as { name?: string })?.name === 'AbortError';
    return json(aborted ? 504 : 502, { error: { status: aborted ? 'DEADLINE_EXCEEDED' : 'UPSTREAM_UNAVAILABLE', message: 'Google Places unreachable' } });
  }
});

/**
 * Request hardening for the `places-proxy` edge function (pure / erasable TS => unit-tested from Node: `npm run test:edge`).
 *
 * The proxy exists so the Google Maps API key lives ONLY in a Supabase secret. Because anybody with the public anon key
 * can call it, it must not behave like an open Google relay: only the 4 Places (New) operations the app really uses are
 * forwarded, with whitelisted body fields, whitelisted field-mask names (the mask decides the Google billing SKU) and
 * clamped sizes.
 */

export const MAX_BODY_BYTES = 20_000;
export const MAX_TEXT_QUERY = 240;

/** Every field name the app legitimately requests (with or without the `places.` prefix). `*` is never allowed. */
export const ALLOWED_FIELDS = new Set([
  'id', 'name', 'displayName', 'formattedAddress', 'shortFormattedAddress', 'addressComponents', 'location', 'viewport',
  'rating', 'userRatingCount', 'nationalPhoneNumber', 'internationalPhoneNumber', 'websiteUri', 'regularOpeningHours',
  'currentOpeningHours', 'priceLevel', 'photos', 'types', 'primaryType', 'primaryTypeDisplayName', 'editorialSummary',
  'reviews', 'businessStatus', 'googleMapsUri', 'plusCode', 'utcOffsetMinutes', 'takeout', 'delivery', 'dineIn',
  'servesVegetarianFood', 'servesBreakfast', 'servesLunch', 'servesDinner', 'servesCoffee', 'outdoorSeating',
  'priceRange', 'paymentOptions', 'accessibilityOptions', 'goodForGroups', 'reservable', 'nextPageToken',
]);

export type PlacesOp = 'searchText' | 'searchNearby' | 'details';

export interface PlacesCall {
  op: PlacesOp;
  method: 'GET' | 'POST';
  upstreamPath: string; // after https://places.googleapis.com/v1/
  fieldMask: string;
  body: Record<string, unknown> | null;
  ttlMs: number; // server-side cache lifetime
  cacheKeyMaterial: string; // what the cache key is derived from (coordinates rounded)
}

export type PlacesCheck = { ok: true; call: PlacesCall } | { ok: false; status: number; message: string };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function clamp(v: unknown, min: number, max: number): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;
}
function str(v: unknown, max: number): string | undefined {
  return typeof v === 'string' && v.length > 0 && v.length <= max ? v : undefined;
}

export function sanitizeFieldMask(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 1500) return null;
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const name = part.trim().replace(/^places\./, '');
    if (!name) continue;
    if (!ALLOWED_FIELDS.has(name)) return null; // unknown / wildcard => reject (prevents billing-SKU escalation)
    out.push(part.trim());
  }
  return out.length > 0 ? out.join(',') : null;
}

function cleanCircle(v: unknown): { circle: { center: { latitude: number; longitude: number }; radius: number } } | null {
  if (!isObj(v) || !isObj(v.circle) || !isObj(v.circle.center)) return null;
  const lat = clamp(v.circle.center.latitude, -90, 90);
  const lng = clamp(v.circle.center.longitude, -180, 180);
  const radius = clamp(v.circle.radius, 1, 50000);
  if (lat === undefined || lng === undefined || radius === undefined) return null;
  return { circle: { center: { latitude: lat, longitude: lng }, radius } };
}

const DAY = 24 * 60 * 60 * 1000;
const round3 = (n: number) => Math.round(n * 1000) / 1000; // ~110 m: nearby users share cache entries

function stringList(v: unknown, maxItems: number): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const items = v.filter((x) => typeof x === 'string' && /^[a-z_]{2,60}$/.test(x)).slice(0, maxItems) as string[];
  return items.length ? items : undefined;
}

export function sanitizePlacesRequest(input: unknown): PlacesCheck {
  if (!isObj(input)) return { ok: false, status: 400, message: 'JSON object expected' };
  const fieldMask = sanitizeFieldMask(input.fieldMask);
  if (!fieldMask) return { ok: false, status: 400, message: 'fieldMask missing or not allowed' };
  const path = input.path;
  if (typeof path !== 'string') return { ok: false, status: 400, message: 'path required' };

  // ---- Place Details: GET places/{id}
  const details = /^places\/([A-Za-z0-9_-]{10,200})$/.exec(path);
  if (details) {
    const lang = str(input.languageCode, 12);
    const q = new URLSearchParams();
    if (lang && /^[A-Za-z-]{2,12}$/.test(lang)) q.set('languageCode', lang);
    q.set('regionCode', 'KH');
    return {
      ok: true,
      call: {
        op: 'details',
        method: 'GET',
        upstreamPath: `places/${details[1]}?${q.toString()}`,
        fieldMask,
        body: null,
        ttlMs: 7 * DAY,
        cacheKeyMaterial: JSON.stringify(['details', details[1], q.toString(), fieldMask]),
      },
    };
  }

  if (path !== 'places:searchText' && path !== 'places:searchNearby') {
    return { ok: false, status: 400, message: 'path not allowed' };
  }
  if (!isObj(input.body)) return { ok: false, status: 400, message: 'body object expected' };
  if (JSON.stringify(input.body).length > MAX_BODY_BYTES) return { ok: false, status: 413, message: 'body too large' };
  const raw = input.body;
  const body: Record<string, unknown> = {};

  const regionCode = str(raw.regionCode, 4);
  if (regionCode && /^[A-Za-z]{2}$/.test(regionCode)) body.regionCode = regionCode.toUpperCase();
  const languageCode = str(raw.languageCode, 12);
  if (languageCode && /^[A-Za-z-]{2,12}$/.test(languageCode)) body.languageCode = languageCode;
  const maxResultCount = clamp(raw.maxResultCount, 1, 20);
  if (maxResultCount !== undefined) body.maxResultCount = Math.floor(maxResultCount);
  if (raw.rankPreference === 'DISTANCE' || raw.rankPreference === 'RELEVANCE' || raw.rankPreference === 'POPULARITY') {
    body.rankPreference = raw.rankPreference;
  }

  let keyMaterialBody: Record<string, unknown> = {};
  if (path === 'places:searchText') {
    const textQuery = str(raw.textQuery, MAX_TEXT_QUERY);
    if (!textQuery) return { ok: false, status: 400, message: 'textQuery required (max 240 chars)' };
    body.textQuery = textQuery;
    const pageSize = clamp(raw.pageSize, 1, 20);
    if (pageSize !== undefined) body.pageSize = Math.floor(pageSize);
    const pageToken = str(raw.pageToken, 2000);
    if (pageToken) body.pageToken = pageToken;
    const includedType = str(raw.includedType, 60);
    if (includedType && /^[a-z_]{2,60}$/.test(includedType)) body.includedType = includedType;
    if (typeof raw.openNow === 'boolean') body.openNow = raw.openNow;
    const minRating = clamp(raw.minRating, 0, 5);
    if (minRating !== undefined) body.minRating = minRating;
    if (typeof raw.strictTypeFiltering === 'boolean') body.strictTypeFiltering = raw.strictTypeFiltering;
    const bias = cleanCircle(raw.locationBias);
    if (bias) body.locationBias = bias;
    const restriction = cleanCircle(raw.locationRestriction);
    if (restriction) body.locationRestriction = restriction;
  } else {
    const included = stringList(raw.includedTypes, 12);
    if (!included) return { ok: false, status: 400, message: 'includedTypes required' };
    body.includedTypes = included;
    const excluded = stringList(raw.excludedTypes, 12);
    if (excluded) body.excludedTypes = excluded;
    const primary = stringList(raw.includedPrimaryTypes, 12);
    if (primary) body.includedPrimaryTypes = primary;
    const restriction = cleanCircle(raw.locationRestriction);
    if (!restriction) return { ok: false, status: 400, message: 'locationRestriction.circle required' };
    body.locationRestriction = restriction;
  }

  // Cache key: same request with the centre rounded to ~110 m => many nearby users share one Google call.
  keyMaterialBody = JSON.parse(JSON.stringify(body));
  for (const k of ['locationBias', 'locationRestriction']) {
    const c = (keyMaterialBody[k] as { circle?: { center: { latitude: number; longitude: number }; radius: number } } | undefined)?.circle;
    if (c) {
      c.center.latitude = round3(c.center.latitude);
      c.center.longitude = round3(c.center.longitude);
      c.radius = Math.round(c.radius / 500) * 500 || 500;
    }
  }
  return {
    ok: true,
    call: {
      op: path === 'places:searchText' ? 'searchText' : 'searchNearby',
      method: 'POST',
      upstreamPath: path,
      fieldMask,
      body,
      ttlMs: path === 'places:searchText' ? 3 * DAY : 1 * DAY,
      cacheKeyMaterial: JSON.stringify([path, fieldMask, keyMaterialBody]),
    },
  };
}

/** Photo reference like `places/ChIJ.../photos/AUc7...` */
export function sanitizePhotoRequest(name: unknown, w: unknown, h: unknown): { ok: true; name: string; w: number; h: number } | { ok: false } {
  if (typeof name !== 'string' || !/^places\/[A-Za-z0-9_-]{10,200}\/photos\/[A-Za-z0-9_-]{10,600}$/.test(name)) return { ok: false };
  const wn = clamp(Number(w), 64, 1600) ?? 480;
  const hn = clamp(Number(h), 64, 1600) ?? 480;
  return { ok: true, name, w: Math.round(wn), h: Math.round(hn) };
}

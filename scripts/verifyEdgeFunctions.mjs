/* Edge Function + Pro-platform checks - run: npm run test:edge (pure logic, no network, no Deno needed) */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
let passed = 0;
const ok = (name, fn) => {
  const r = fn();
  const done = () => {
    passed++;
    console.log('  \u2713 ' + name);
  };
  return r && typeof r.then === 'function' ? r.then(done) : done();
};

const common = await load('supabase/functions/_shared/common.ts');
const places = await load('supabase/functions/places-proxy/sanitize.ts');
const oa = await load('supabase/functions/food-ai/openai.ts');

console.log('[edge] shared helpers');
ok('safeUserId accepts real ids and rejects filter-injection', () => {
  assert.equal(common.safeUserId('google-abc_gmail_com'), 'google-abc_gmail_com');
  assert.equal(common.safeUserId('user-test-1260'), 'user-test-1260');
  for (const bad of ['', 'a', "x'or'1", 'a b', 'x&select=*', 'a/b', 'a,b', null, 5, 'x'.repeat(200)]) assert.equal(common.safeUserId(bad), null, String(bad));
});
ok('isVipActive mirrors the app rule (tier + status + not cancelled + not expired)', () => {
  const now = Date.parse('2026-11-07T00:00:00Z');
  const vip = { membershipTier: 'premium_vip', subscriptionStatus: 'active', subscriptionExpiryDate: '2026-12-01T00:00:00Z' };
  assert.equal(common.isVipActive(vip, now), true);
  assert.equal(common.isVipActive({ ...vip, subscriptionExpiryDate: '2026-11-01T00:00:00Z' }, now), false, 'expired');
  assert.equal(common.isVipActive({ ...vip, vipCancelledAt: '2026-11-02' }, now), false, 'cancelled');
  assert.equal(common.isVipActive({ ...vip, subscriptionStatus: 'cancelled' }, now), false);
  assert.equal(common.isVipActive({ membershipTier: 'free' }, now), false);
  assert.equal(common.isVipActive(null, now), false);
});
ok('quota decision, env parsing and sliding window', () => {
  assert.equal(common.decideQuota(150, 150).allowed, true);
  assert.equal(common.decideQuota(151, 150).allowed, false);
  assert.equal(common.envInt('abc', 7), 7);
  assert.equal(common.envInt('0', 7, 1), 1);
  assert.equal(common.envInt('99', 7, 1, 50), 50);
  const w = new common.WindowLimiter(2, 1000);
  assert.ok(w.allow('a', 0) && w.allow('a', 1) && !w.allow('a', 2) && w.allow('a', 1500));
});
await ok('sha256Hex is deterministic', async () => {
  assert.equal(await common.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

console.log('[edge] places-proxy request hardening');
const goodSearch = (over = {}) => ({
  path: 'places:searchText',
  fieldMask: 'places.id,places.displayName,places.location,nextPageToken',
  body: { textQuery: 'Num Banh Chok Siem Reap', regionCode: 'KH', languageCode: 'en', maxResultCount: 20, locationBias: { circle: { center: { latitude: 13.36, longitude: 103.86 }, radius: 35000 } } },
  ...over,
});
ok('valid text search passes with a rebuilt (whitelisted) body', () => {
  const r = places.sanitizePlacesRequest(goodSearch({ body: { ...goodSearch().body, evil: 'x', includedType: 'restaurant; drop' } }));
  assert.equal(r.ok, true);
  assert.equal(r.call.body.evil, undefined, 'unknown body fields are dropped');
  assert.equal(r.call.body.includedType, undefined, 'bad includedType dropped');
  assert.equal(r.call.method, 'POST');
});
ok('field mask: wildcard / unknown / empty are rejected (prevents billing-SKU escalation)', () => {
  for (const m of ['*', 'places.*', 'places.id,places.secretField', '', undefined, 123]) assert.equal(places.sanitizePlacesRequest(goodSearch({ fieldMask: m })).ok, false, String(m));
});
ok('only the four known operations are reachable', () => {
  for (const p of ['places:autocomplete', 'places:searchTextX', '../places:searchText', 'operations/x', 'places/', 'places/short']) assert.equal(places.sanitizePlacesRequest(goodSearch({ path: p })).ok, false, p);
});
ok('sizes are clamped (results, radius) and text query is required / bounded', () => {
  const r = places.sanitizePlacesRequest(goodSearch({ body: { textQuery: 'x', maxResultCount: 999, locationBias: { circle: { center: { latitude: 13, longitude: 103 }, radius: 9e9 } } } }));
  assert.equal(r.call.body.maxResultCount, 20);
  assert.equal(r.call.body.locationBias.circle.radius, 50000);
  assert.equal(places.sanitizePlacesRequest(goodSearch({ body: { regionCode: 'KH' } })).ok, false);
  assert.equal(places.sanitizePlacesRequest(goodSearch({ body: { textQuery: 'x'.repeat(500) } })).ok, false);
});
ok('nearby search needs includedTypes and a circle', () => {
  const body = { includedTypes: ['restaurant', 'cafe'], maxResultCount: 20, rankPreference: 'DISTANCE', locationRestriction: { circle: { center: { latitude: 11.56, longitude: 104.92 }, radius: 3000 } } };
  assert.equal(places.sanitizePlacesRequest({ path: 'places:searchNearby', fieldMask: 'places.id', body }).ok, true);
  assert.equal(places.sanitizePlacesRequest({ path: 'places:searchNearby', fieldMask: 'places.id', body: { ...body, includedTypes: ['Bad Type!'] } }).ok, false);
  assert.equal(places.sanitizePlacesRequest({ path: 'places:searchNearby', fieldMask: 'places.id', body: { ...body, locationRestriction: undefined } }).ok, false);
});
ok('place details: GET with validated id; unsafe ids rejected', () => {
  const r = places.sanitizePlacesRequest({ path: 'places/ChIJN1t_tDeuEmsRUsoyG83frY4', fieldMask: 'id,displayName,reviews', languageCode: 'km' });
  assert.equal(r.ok, true);
  assert.equal(r.call.method, 'GET');
  assert.ok(r.call.upstreamPath.includes('regionCode=KH'));
  assert.equal(places.sanitizePlacesRequest({ path: 'places/abc?x=1&key=zzzzzzzzzz', fieldMask: 'id' }).ok, false);
});
ok('cache key: nearby GPS positions (~50 m apart) share one cache entry, far ones do not', () => {
  const mk = (lat, lng) => places.sanitizePlacesRequest(goodSearch({ body: { textQuery: 'cafe', locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 3000 } } } })).call.cacheKeyMaterial;
  assert.equal(mk(13.3601, 103.8601), mk(13.3604, 103.8604));
  assert.notEqual(mk(13.3601, 103.8601), mk(13.4601, 103.8601));
});
ok('photo references are validated and sizes clamped', () => {
  const r = places.sanitizePhotoRequest('places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/AUc7tXVabcdefghijkl', '99999', '10');
  assert.equal(r.ok, true);
  assert.equal(r.w, 1600);
  assert.equal(r.h, 64);
  assert.equal(places.sanitizePhotoRequest('places/x/photos/y', 480, 480).ok, false);
  assert.equal(places.sanitizePhotoRequest('https://evil.example/x', 480, 480).ok, false);
});

console.log('[edge] OpenAI fail-over adapter');
ok('Gemini request converts to chat completions (system, roles, image, JSON mode)', () => {
  const out = oa.geminiToOpenAi(
    {
      systemInstruction: { parts: [{ text: 'You are a Khmer food guide.' }] },
      contents: [
        { role: 'user', parts: [{ text: 'hi' }] },
        { role: 'model', parts: [{ text: 'hello' }] },
        { role: 'user', parts: [{ text: 'what is this?' }, { inlineData: { mimeType: 'image/jpeg', data: 'QUJD' } }] },
      ],
      generationConfig: { temperature: 0.3, maxOutputTokens: 500, responseMimeType: 'application/json' },
    },
    'gpt-4o-mini'
  );
  assert.equal(out.messages[0].role, 'system');
  assert.ok(/JSON/.test(out.messages[0].content), 'json_object mode requires the word JSON');
  assert.deepEqual(out.messages.slice(1, 3).map((m) => m.role), ['user', 'assistant']);
  const last = out.messages[3].content;
  assert.equal(last[1].image_url.url, 'data:image/jpeg;base64,QUJD');
  assert.deepEqual(out.response_format, { type: 'json_object' });
  assert.equal(out.max_tokens, 500);
});
ok('OpenAI answer converts back to a Gemini-shaped response (the app never notices)', () => {
  const g = oa.openAiToGemini({ model: 'gpt-4o-mini', choices: [{ message: { content: 'សួស្តី' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 4 } });
  assert.equal(g.candidates[0].content.parts[0].text, 'សួស្តី');
  assert.equal(g.usageMetadata.totalTokenCount, 14);
  assert.equal(oa.openAiToGemini({ choices: [{ message: { content: '' } }] }), null);
});
await ok('Gemini key type picks the right Google endpoint(s) (AIza -> Studio only; AQ. -> Studio first, then Vertex)', async () => {
  const ep = await load('supabase/functions/food-ai/endpoint.ts');
  const [studio, ...rest] = ep.geminiEndpoints('AIzaSyEXAMPLEEXAMPLEEXAMPLEEXAMPLE12345', 'gemini-2.5-flash');
  assert.equal(rest.length, 0);
  assert.ok(studio.url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'));
  assert.ok(!studio.url.includes('key=') && studio.headers['x-goog-api-key'].startsWith('AIza'), 'key goes in a header, never the URL');
  const list = ep.geminiEndpoints('AQ.Ab8EXAMPLE_key-1', 'gemini-2.5-flash');
  assert.equal(list.length, 2);
  assert.ok(list[0].url.startsWith('https://generativelanguage.googleapis.com/'), 'AQ. keys are Gemini-API restricted -> Studio first');
  assert.ok(list[1].url.startsWith('https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent?key=AQ.Ab8EXAMPLE_key-1'));
  assert.equal(list[1].headers['x-goog-api-key'], undefined);
  for (const st of [400, 401, 403, 404]) assert.equal(ep.shouldTryNextEndpoint(st), true, String(st));
  for (const st of [200, 402, 429, 500]) assert.equal(ep.shouldTryNextEndpoint(st), false, String(st));
});
ok('fail-over only on provider-side problems; model allow-list', () => {
  for (const s of [429, 500, 503, 401, 402, 403, 408]) assert.equal(oa.shouldFailover(s), true, String(s));
  for (const s of [200, 400, 404]) assert.equal(oa.shouldFailover(s), false, String(s));
  assert.equal(oa.pickOpenAiModel('gpt-4o'), 'gpt-4o');
  assert.equal(oa.pickOpenAiModel('evil-model'), oa.OPENAI_DEFAULT_MODEL);
});

console.log('[edge] source contracts');
ok('no API key literal inside Edge Functions; secrets come from Deno.env', () => {
  for (const f of ['supabase/functions/food-ai/index.ts', 'supabase/functions/places-proxy/index.ts', 'supabase/functions/_shared/supa.ts']) {
    const t = read(f);
    assert.ok(!/AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}|AQ\.Ab8/.test(t), 'key literal in ' + f);
  }
  assert.ok(read('supabase/functions/places-proxy/index.ts').includes("Deno.env.get('GOOGLE_MAPS_API_KEY')"));
  assert.ok(read('supabase/functions/food-ai/index.ts').includes("Deno.env.get('OPENAI_API_KEY')"));
});
ok('functions allow the new request headers (otherwise browsers block the call at CORS preflight)', () => {
  assert.ok(read('supabase/functions/food-ai/index.ts').includes('x-kft-user-id, x-kft-purpose'));
  assert.ok(read('supabase/functions/places-proxy/index.ts').includes('x-kft-user-id'));
});
ok('config.toml disables gateway JWT checks (new sb_publishable_ keys are not JWTs)', () => {
  const t = read('supabase/config.toml');
  for (const fn of ['food-ai', 'places-proxy', 'social-food-discovery']) assert.ok(new RegExp(`\\[functions\\.${fn}\\][^\\[]*verify_jwt\\s*=\\s*false`).test(t), fn);
});
ok('every Google Places call in the app goes through placesFetch (no raw fetch left)', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : []));
  const offenders = [];
  for (const f of walk(path.join(ROOT, 'src'))) {
    if (f.endsWith('placesProxy.ts')) continue;
    const t = fs.readFileSync(f, 'utf8');
    if (/\bfetch\(\s*(['"`]https:\/\/places\.googleapis\.com\/v1|PLACES_SEARCH_TEXT_URL)/.test(t)) offenders.push(path.relative(ROOT, f));
    if (/places\.googleapis\.com\/v1\/\$\{[^}]+\}\/media\?/.test(t)) offenders.push(path.relative(ROOT, f) + ' (photo URL)');
  }
  assert.deepEqual(offenders, []);
});
ok('no Google Maps / Gemini key is bundled in the app source (keys live only in Supabase secrets)', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(ts|tsx|js|json|html)$/.test(e.name) ? [path.join(d, e.name)] : []));
  const offenders = [];
  for (const f of [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'public'))]) {
    const t = fs.readFileSync(f, 'utf8');
    if (/AIzaSy[0-9A-Za-z_-]{25,}|AQ\.Ab8[0-9A-Za-z_-]{20,}/.test(t)) offenders.push(path.relative(ROOT, f));
  }
  assert.deepEqual(offenders, []);
  const svc = read('src/services/supabaseService.ts');
  assert.ok(svc.includes("DEFAULT_GOOGLE_MAPS_API_KEY = ''") && svc.includes("DEFAULT_GEMINI_API_KEY = ''") && !svc.includes('decodeRuntimeKey'), 'embedded char-code keys must stay removed');
});
ok('Pro platform SQL is service-role only and non-destructive', () => {
  const sql = read('supabase_pro_platform_v1.sql');
  const code = sql.split(/\r?\n/).filter((l) => !l.trim().startsWith('--')).join('\n');
  for (const t of ['kft_api_usage_daily', 'kft_api_usage_log', 'kft_places_cache']) assert.ok(new RegExp(`ALTER TABLE public\\.${t}\\s+ENABLE ROW LEVEL SECURITY`).test(code), 'RLS ' + t);
  assert.ok(/REVOKE ALL ON public\.kft_api_usage_daily, public\.kft_api_usage_log, public\.kft_places_cache FROM anon, authenticated/.test(code));
  assert.ok(!/CREATE POLICY/i.test(code), 'no public policies on the new tables');
  assert.ok(!/DROP\s+TABLE|TRUNCATE|DELETE\s+FROM\s+public\.kft_app_kv_store|UPDATE\s+public\.kft_app_kv_store/i.test(code), 'must not touch kv data');
  for (const j of ['kft-nightly-snapshot', 'kft-snapshot-prune', 'kft-history-prune', 'kft-platform-cleanup']) assert.ok(code.includes(j), j);
});

console.log(`\n[edge] ALL ${passed} CHECKS PASSED`);

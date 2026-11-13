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
  const g = oa.openAiToGemini({ model: 'gpt-4o-mini', choices: [{ message: { content: 'Ã¡Å¾Å¸Ã¡Å¾Â½Ã¡Å¾Å¸Ã¡Å¸â€™Ã¡Å¾ÂÃ¡Å¾Â¸' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 4 } });
  assert.equal(g.candidates[0].content.parts[0].text, 'Ã¡Å¾Å¸Ã¡Å¾Â½Ã¡Å¾Å¸Ã¡Å¸â€™Ã¡Å¾ÂÃ¡Å¾Â¸');
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
  for (const fn of ['food-ai', 'places-proxy', 'social-food-discovery', 'admin-auth', 'vip-purchase']) assert.ok(new RegExp(`\\[functions\\.${fn}\\][^\\[]*verify_jwt\\s*=\\s*false`).test(t), fn);
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
ok('AI chat does not require a device-side Gemini key when the Edge gateway is available (regression: chat fell back to offline engine)', () => {
  const t = read('src/components/WhatToEatModal.tsx');
  assert.ok(t.includes('isAiGatewayConfigured()'), 'gateway availability must be consulted');
  assert.ok(!/if \(!geminiKey\) \{/.test(t) && !/image && !geminiKey\) \{/.test(t), 'a bare `!geminiKey` gate would disable AI for every device without its own key');
  assert.ok(/image && !geminiKey && !gatewayAvailable/.test(t) && /if \(!geminiKey && !gatewayAvailable\)/.test(t));
  assert.ok(read('src/services/foodAssistantLlm.ts').includes('export function isAiGatewayConfigured'));
});
console.log('[edge] admin security (Phase B1)');
const at = await load('supabase/functions/_shared/admin-token.ts');
await ok('admin token: sign/verify round-trip, expiry, scope, tampering, wrong secret', async () => {
  const secret = 'unit-test-secret-0123456789abcdef0123456789abcdef';
  const now = Date.parse('2026-11-07T00:00:00Z');
  const { token, expiresAt } = await at.signToken(secret, 'admin', 3600, now);
  assert.equal(expiresAt, now + 3600_000);
  assert.deepEqual(await at.verifyToken(secret, token, 'admin', now + 1000), { ok: true });
  assert.equal((await at.verifyToken(secret, token, 'admin', now + 3601_000)).reason, 'expired');
  assert.equal((await at.verifyToken(secret, token, 'pin', now + 1000)).reason, 'scope', 'a PIN ticket must never act as an admin token');
  assert.equal((await at.verifyToken('another-secret-another-secret-another-secret', token, 'admin', now)).ok, false);
  const flipped = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
  assert.equal((await at.verifyToken(secret, flipped, 'admin', now)).reason, 'signature');
  const [p, s2] = token.split('.');
  const forged = at.b64urlEncode(JSON.stringify({ sub: 'admin', scope: 'admin', iat: 1, exp: 9999999999 }));
  assert.equal((await at.verifyToken(secret, `${forged}.${s2}`, 'admin', now)).ok, false, 'payload cannot be swapped under an old signature');
  for (const bad of [undefined, null, '', 'abc', 'a.b.c', 12345]) assert.equal((await at.verifyToken(secret, bad, 'admin', now)).ok, false, String(bad));
});
await ok('HMAC matches Node crypto (the SQL check uses the same algorithm: hmac_sha256 over the base64url payload)', async () => {
  const nodeCrypto = await import('node:crypto');
  const mac = nodeCrypto.createHmac('sha256', 'k3y').update('payload.part').digest('hex');
  assert.equal(await at.hmacHex('k3y', 'payload.part'), mac);
  assert.equal(at.b64urlDecodeToString(at.b64urlEncode('Ã¡Å¾Å¸Ã¡Å¾Â½Ã¡Å¾Å¸Ã¡Å¸â€™Ã¡Å¾ÂÃ¡Å¾Â¸ Cambodia')), 'Ã¡Å¾Å¸Ã¡Å¾Â½Ã¡Å¾Å¸Ã¡Å¸â€™Ã¡Å¾ÂÃ¡Å¾Â¸ Cambodia');
  assert.equal(await at.safeSecretEqual('123456', '123456'), true);
  assert.equal(await at.safeSecretEqual('123456', '1234567'), false);
});
ok('no admin password / PIN is hard-coded anywhere in the app or the Edge Function', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : []));
  const offenders = [];
  for (const f of [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'supabase/functions'))]) {
    const t = fs.readFileSync(f, 'utf8');
    if (/CheaSavuth@2026|Admin@KhmerFood2026/.test(t)) offenders.push(path.relative(ROOT, f));
  }
  assert.deepEqual(offenders, [], 'old built-in admin passwords must stay removed');
  const fn = read('supabase/functions/admin-auth/index.ts');
  assert.ok(fn.includes("Deno.env.get('ADMIN_PASSWORD')") && fn.includes("Deno.env.get('ADMIN_PIN')"));
  assert.ok(!/ADMIN_PASSWORD'\)\s*\|\|\s*'[^']/.test(fn), 'no default password fallback');
});
ok('biometric web fallback can never grant admin access without a stored password', () => {
  const t = read('src/services/biometricService.ts');
  assert.ok(!/pw\s*=\s*'[^']/.test(t), 'no assignment of a non-empty literal password');
  assert.ok(t.includes("error: 'password required'") && t.includes("error: 'no stored admin password'"));
});
ok('admin-only documents carry the admin token on write/delete; hash is no longer published when server login is active', () => {
  const svc = read('src/services/supabaseService.ts');
  assert.equal((svc.match(/\.\.\.adminTokenHeaders\(key\)/g) || []).length, 2, 'push + delete must both attach the token');
  assert.ok(svc.includes('adminPasswordHash: _omitHash'), 'public settings docs must drop the hash');
  const client = read('src/services/adminAuthClient.ts');
  for (const k of ['kft_cloud_app_settings_v1', 'kft_cloud_admin_vip_pricing_v2', 'kft_admin_pin_security_v1']) assert.ok(client.includes(k), k);
  const sql = read('supabase_admin_security_v1.sql');
  for (const k of ['kft_cloud_app_settings_v1', 'kft_cloud_admin_vip_pricing_v2', 'kft_admin_pin_security_v1']) assert.ok(sql.includes(`'${k}'`), 'SQL guard covers ' + k);
});
ok('admin security SQL: private table, starts in "off", no policies, non-destructive', () => {
  const sql = read('supabase_admin_security_v1.sql');
  const code = sql.split(/\r?\n/).filter((l) => !l.trim().startsWith('--')).join('\n');
  assert.ok(/ALTER TABLE public\.kft_security_config ENABLE ROW LEVEL SECURITY/.test(code) && /REVOKE ALL ON public\.kft_security_config FROM anon, authenticated/.test(code));
  assert.ok(!/CREATE POLICY/i.test(code));
  assert.ok(/VALUES \('enforce_admin_keys', 'off'\)/.test(code), 'enforcement must start OFF so nothing changes until the admin opts in');
  assert.ok(/ON CONFLICT \(name\) DO NOTHING/.test(code), 'must never rotate an existing secret');
  assert.ok(!/DROP\s+TABLE|TRUNCATE|DELETE\s+FROM|UPDATE\s+public\.kft_app_kv_store/i.test(code));
  assert.ok(/current_user IN \('postgres', 'supabase_admin', 'service_role'\)/.test(code), 'SQL editor / service role stay allowed');
});
console.log('[edge] VIP purchase security (Phase B2)');
const rr = await load('supabase/functions/_shared/receipt-rules.ts');
const NOW = Date.parse('2026-11-07T08:00:00Z');
const goodReceipt = { isAbaReceipt: true, trxId: '176121426630955', amountUsd: 4.99, currency: 'USD', recipientName: 'CHEA KIMSENG', recipientAccount: '095 245 959', transactionDate: 'Nov 6, 2026 06:31 PM', senderName: 'TESTER' };
const ev = (over = {}, extra = {}) => rr.evaluateReceipt({ extracted: { ...goodReceipt, ...over }, expectedAmountUsd: 4.99, expectedDays: 30, nowMs: NOW, ...extra });
ok('receipt: a genuine receipt passes all four content checks', () => {
  const e = ev();
  assert.equal(e.allPassed, true);
  assert.equal(e.trxKey, '176121426630955');
});
ok('receipt: wrong recipient / wrong amount / wrong currency / old / future / missing Trx ID are all refused', () => {
  assert.equal(ev({ recipientName: 'SONLEAK ROUERN', recipientAccount: '010 339 036' }).allPassed, false, 'another person');
  assert.equal(ev({ recipientName: undefined, recipientAccount: '010 339 036' }).allPassed, false, 'another account');
  assert.equal(ev({ amountUsd: 2.99 }).allPassed, false, 'cheaper plan amount');
  assert.equal(ev({ amountUsd: 4.99, currency: 'KHR' }).allPassed, false, 'currency');
  assert.equal(ev({ transactionDate: 'Oct 1, 2025 06:31 PM' }).allPassed, false, 'stale receipt');
  assert.equal(ev({ transactionDate: 'Dec 25, 2026 06:31 PM' }).allPassed, false, 'future date');
  assert.equal(ev({ transactionDate: undefined }).allPassed, false, 'no date');
  assert.equal(ev({ trxId: undefined }).allPassed, false, 'no Trx ID may be invented any more');
  assert.equal(ev({ trxId: '123' }).allPassed, false, 'malformed Trx ID');
  assert.equal(ev({ isAbaReceipt: false }).allPassed, false, 'not an ABA receipt');
});
ok('receipt: the Trx ID typed by the user must match the receipt; app placeholders are ignored', () => {
  assert.equal(ev({}, { submittedTrxId: '176121426630955' }).allPassed, true);
  assert.equal(ev({}, { submittedTrxId: '999999999999999' }).allPassed, false);
  assert.equal(ev({}, { submittedTrxId: 'ABA-KHQR-1730000000' }).allPassed, true, 'auto-generated reference is ignored');
});
ok('plans come from the SERVER pricing (never from the client) and are matched by duration', () => {
  const pricing = { vipShortDurationDays: 30, vipShortPriceUsd: 4.99, vipLongDurationDays: 60, vipLongPriceUsd: 6.99 };
  assert.deepEqual(rr.resolvePlan(pricing, 30), { planType: 'quarterly', days: 30, priceUsd: 4.99 });
  assert.deepEqual(rr.resolvePlan(pricing, 60), { planType: 'annual', days: 60, priceUsd: 6.99 });
  assert.equal(rr.resolvePlan(pricing, 3650), null, 'an invented 10-year plan is refused');
  assert.equal(rr.resolvePlan({ vipShortDurationDays: 30, vipShortPriceUsd: 0 }, 30), null, 'free plan is refused');
  assert.equal(rr.resolvePlan(null, 30), null);
});
ok('VIP window: starts now, renewals stack on the remaining time, expired VIP restarts from now', () => {
  const w1 = rr.computeVipWindow(undefined, 30, NOW);
  assert.equal(w1.expiryIso, new Date(NOW + 30 * 86400000).toISOString());
  const active = new Date(NOW + 10 * 86400000).toISOString();
  assert.equal(rr.computeVipWindow(active, 30, NOW).expiryIso, new Date(NOW + 40 * 86400000).toISOString());
  const expired = new Date(NOW - 5 * 86400000).toISOString();
  assert.equal(rr.computeVipWindow(expired, 30, NOW).expiryIso, w1.expiryIso);
});
ok('applyVipGrant writes only entitlement fields and clears a previous cancellation', () => {
  const doc = { id: 'u1', email: 'a@b.c', name: 'Sok', vipCancelledAt: '2026-10-01', membershipTier: 'free', phone: '012' };
  const g = rr.applyVipGrant(doc, { startIso: '2026-11-07T00:00:00.000Z', expiryIso: '2026-12-07T00:00:00.000Z', days: 30, planType: 'quarterly', trxId: 'T123456789' });
  assert.equal(g.membershipTier, 'premium_vip');
  assert.equal(g.subscriptionExpiryDate, '2026-12-07T00:00:00.000Z');
  assert.equal(g.vipExpiresAt, '2026-12-07T00:00:00.000Z');
  assert.equal(g.vipCancelledAt, undefined);
  assert.equal(g.email, 'a@b.c');
  assert.equal(g.phone, '012');
});
ok('report has the exact shape of the app AbaReceiptVerificationReport (verified / pending / rejected)', () => {
  const e = ev();
  const v = rr.buildReport({ decision: 'verified', evaluation: e, extracted: goodReceipt, duplicate: false, noteKh: 'k', noteEn: 'e', nowIso: '2026-11-07T08:00:00.000Z' });
  assert.equal(v.status, 'verified');
  assert.equal(v.canAutoApprove, true);
  assert.deepEqual(Object.keys(v.checks).sort(), ['amount', 'antiReplay', 'date', 'recipient', 'trxId']);
  assert.equal(v.confidenceScore, 100);
  const p = rr.buildReport({ decision: 'pending', evaluation: null, extracted: null, duplicate: false, noteKh: 'k', noteEn: 'e', nowIso: '2026-11-07T08:00:00.000Z' });
  assert.equal(p.status, 'flagged_manual_review');
  assert.equal(p.canAutoApprove, false);
  const r = rr.buildReport({ decision: 'rejected', evaluation: e, extracted: goodReceipt, duplicate: true, noteKh: 'k', noteEn: 'e', nowIso: '2026-11-07T08:00:00.000Z' });
  assert.equal(r.status, 'rejected_mismatch');
  assert.equal(r.checks.antiReplay.passed, false);
});
ok('vip-purchase function: no client-supplied price, receipts reserved before the grant, VIP written with the service role', () => {
  const fn = read('supabase/functions/vip-purchase/index.ts');
  assert.ok(!/body\.(priceUsd|amountUsd|price)\b/.test(fn), 'price must never be taken from the request');
  assert.ok(fn.includes("readUserDoc('kft_cloud_admin_vip_pricing_v2')"), 'server pricing is used');
  assert.ok(fn.indexOf("restInsert('kft_payment_receipts', { ...baseRow, status: 'verified'") < fn.indexOf('writeKv(userKvKey(userId)'), 'the unique receipt row must be reserved BEFORE the grant is written');
  assert.ok(fn.includes('ins.status === 409'), 'a unique-index conflict means "already used"');
  assert.ok((/const autoApprove = false/.test(fn) || /VIP_AUTO_APPROVE'\) === 'true'/.test(fn)) && /autoApprove && evaluation\.allPassed/.test(fn), 'automatic activation must be OFF unless explicitly enabled (manual approval is the default)');
  assert.ok(/status=in\.\(verified,pending\)/.test(fn), 'a Trx ID that is already pending/verified cannot fund a second VIP');
  assert.ok(!/AIza[0-9A-Za-z_-]{20,}|AQ\.Ab8/.test(fn), 'no key literal');
});
ok('client: purchase flow asks the server first, uses the server dates, falls back to the old check only when unavailable', () => {
  const ctx = read('src/context/AppContext.tsx');
  assert.ok(ctx.includes('verifyVipPurchaseOnServer({'), 'server verification wired in');
  assert.ok(/serverRes\.kind !== 'unavailable'/.test(ctx) && /serverGrant\s*\n?\s*\?/.test(ctx), 'server result + server dates are used');
  const cl = read('src/services/vipPurchaseClient.ts');
  assert.ok(cl.includes("x-vip-purchase") && cl.includes("kind: 'unavailable'"));
  assert.ok(read('src/services/adminAuthClient.ts').includes("key.startsWith('kft_user_')"), 'admin token is attached to user rows (admin VIP grants)');
});
ok('VIP security SQL: private ledger with UNIQUE receipt + Trx ID, shadow first, upsert-aware, trusted callers only', () => {
  const sql = read('supabase_vip_security_v1.sql');
  const code = sql.split(/\r?\n/).filter((l) => !l.trim().startsWith('--')).join('\n');
  assert.ok(/CREATE UNIQUE INDEX IF NOT EXISTS uq_kft_receipts_image\s+ON public\.kft_payment_receipts \(image_hash\)/.test(code));
  assert.ok(/uq_kft_receipts_trx_ver[\s\S]*WHERE status = 'verified'/.test(code));
  assert.ok(/VALUES \('enforce_vip_grants', 'shadow'\)/.test(code), 'must start in shadow (log only) mode');
  assert.ok(/SELECT payload INTO old_p FROM public\.kft_app_kv_store WHERE key = NEW\.key/.test(code), 'the upsert (INSERT .. ON CONFLICT) path must compare against the stored row');
  assert.ok(/current_user IN \('postgres', 'supabase_admin', 'service_role'\)/.test(code));
  assert.ok(/kft_admin_token_ok\(v_tok\)/.test(code), 'admin token accepted');
  assert.ok(/BEFORE INSERT OR UPDATE ON public\.kft_app_kv_store/.test(code));
  for (const t of ['kft_payment_receipts', 'kft_security_events']) {
    assert.ok(new RegExp(`ALTER TABLE public\\.${t}\\s+ENABLE ROW LEVEL SECURITY`).test(code), 'RLS ' + t);
    assert.ok(new RegExp(`REVOKE ALL ON public\\.${t} FROM anon, authenticated`).test(code), 'revoke ' + t);
  }
  assert.ok(!/CREATE POLICY/i.test(code));
  assert.ok(!/DROP\s+TABLE|TRUNCATE|DELETE\s+FROM\s+public\.kft_app_kv_store|UPDATE\s+public\.kft_app_kv_store/i.test(code), 'never touches existing data');
});
const sm = await load('src/utils/statementMatch.ts');
const statementCsv = [
  'Date,Description,Reference,Debit,Credit,Balance',
  '"Nov 6, 2026 06:31 PM","Transfer from TESTER ONE","FT176121426630955",,4.99,"1,204.99"',
  '"Nov 6, 2026 07:02 PM","Transfer from TESTER TWO","176121426630111",,2.99,"1,207.98"',
  '"Nov 6, 2026 09:10 PM","Payment to SUPPLIER","999000111222333",12.50,,"1,195.48"',
].join('\n');
ok('statement: CSV parsing handles quotes, thousands separators and the delimiter', () => {
  const rows = sm.parseCsv(statementCsv);
  assert.equal(rows.length, 4);
  assert.equal(rows[1][0], 'Nov 6, 2026 06:31 PM');
  assert.equal(rows[1][5], '1,204.99');
  assert.equal(sm.parseCsv('a;b;c\n1;2;3').length, 2);
  assert.equal(sm.parseCsv('a;b;c\n1;2;3')[1][2], '3');
  const entries = sm.normalizeRows(rows);
  assert.ok(entries[1].amounts.includes(4.99) && entries[1].amounts.includes(1204.99));
});
ok('statement: a payment is "matched" only with its Trx ID AND the incoming amount; everything else needs a human', () => {
  const entries = sm.normalizeRows(sm.parseCsv(statementCsv));
  const pay = (id, trx, amt) => ({ id, trxId: trx, amountUsd: amt });
  const r = sm.matchPayments(
    [
      pay('T1', '176121426630955', 4.99), // genuine (reference has an FT prefix in the statement)
      pay('T2', '176121426630111', 4.99), // right Trx ID, wrong amount (paid 2.99 for a 4.99 plan)
      pay('T3', '555555555555555', 4.99), // fabricated receipt: not in the statement
      pay('T4', '', 4.99), // no Trx ID
      pay('T5', '999000111222333', 12.5), // an outgoing payment, not an incoming one
    ],
    entries
  );
  const by = Object.fromEntries(r.map((x) => [x.payment.id, x.status]));
  assert.equal(by.T1, 'matched');
  assert.equal(by.T2, 'amount_mismatch');
  assert.equal(by.T3, 'not_found');
  assert.equal(by.T4, 'no_trx_id');
  assert.equal(by.T5, 'not_credit', 'a debit row must never approve a VIP');
  // single signed Amount column (credits +, debits -)
  const signed = sm.normalizeRows(sm.parseCsv('Date,Details,Amount\n2026-11-06,Received 176121426630955,4.99\n2026-11-06,Sent 999000111222333,-12.50'));
  const r2 = sm.matchPayments([{ id: 'S1', trxId: '176121426630955', amountUsd: 4.99 }, { id: 'S2', trxId: '999000111222333', amountUsd: 12.5 }], signed);
  assert.equal(r2[0].status, 'matched');
  assert.equal(r2[1].status, 'not_credit');
});
ok('statement: one transfer can fund only one VIP (duplicate Trx IDs and reused rows are never auto-matched)', () => {
  const entries = sm.normalizeRows(sm.parseCsv(statementCsv));
  const dup = sm.matchPayments([{ id: 'A', trxId: '176121426630955', amountUsd: 4.99 }, { id: 'B', trxId: '176 121 426 630 955', amountUsd: 4.99 }], entries);
  assert.deepEqual(dup.map((x) => x.status), ['duplicate_trx', 'duplicate_trx']);
});
ok('statement panel: reads the file on-device only, approves through the existing admin approval (verifyTransaction)', () => {
  const t = read('src/components/admin/AdminStatementMatchPanel.tsx');
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(t), 'the statement must never be uploaded');
  assert.ok(t.includes('verifyTransaction(r.payment.id)'));
  assert.ok(t.includes('window.confirm'), 'bulk approval needs a confirmation');
  assert.ok(read('src/components/AdminDashboard.tsx').includes('<AdminStatementMatchPanel />'));
});
ok('statement panel: the lazy one-click approval only covers payments that passed EVERY AI check, and warns before acting', () => {
  const t = read('src/components/admin/AdminStatementMatchPanel.tsx');
  assert.ok(/c\.recipient\?\.passed && c\.amount\?\.passed && c\.date\?\.passed && c\.trxId\?\.passed && c\.antiReplay\?\.passed/.test(t), 'all five checks required');
  assert.ok(t.includes("t.status !== 'pending_verification'"), 'only pending payments');
  assert.ok((t.match(/window\.confirm/g) || []).length >= 2, 'both bulk actions are confirmed');
  assert.ok(/WITHOUT checking your bank statement/.test(t), 'the risk is stated in the dialog');
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

await ok('PBKDF2 password/PIN hashing & verification round-trip, salt uniqueness, and rejection', async () => {
  const h1 = await at.hashSecretPBKDF2('MyNewStrongPass#2026');
  const h2 = await at.hashSecretPBKDF2('MyNewStrongPass#2026');
  assert.notEqual(h1, h2, 'each hash must generate a fresh random salt');
  assert.ok(h1.startsWith('pbkdf2$100000$'));
  assert.equal(await at.verifySecretPBKDF2('MyNewStrongPass#2026', h1), true);
  assert.equal(await at.verifySecretPBKDF2('MyNewStrongPass#2026', h2), true);
  assert.equal(await at.verifySecretPBKDF2('WrongPassword#2026', h1), false);
  for (const bad of ['', 'plain', 'pbkdf2$100000$bad', 'pbkdf2$0$aa$bb', null, undefined]) {
    assert.equal(await at.verifySecretPBKDF2('MyNewStrongPass#2026', bad), false, String(bad));
  }
});
ok('admin-auth supports persistent change_password & change_pin via private kft_security_config', () => {
  const fn = read('supabase/functions/admin-auth/index.ts');
  assert.ok(fn.includes("action === 'change_password'") && fn.includes("action === 'change_pin'"));
  assert.ok(fn.includes("setSecurityConfig('admin_password_hash'") && fn.includes("setSecurityConfig('admin_pin_hash'"));
  assert.ok(fn.includes("getSecurityConfig('admin_password_hash')") && fn.includes("getSecurityConfig('admin_pin_hash')"));
  const supa = read('supabase/functions/_shared/supa.ts');
  assert.ok(supa.includes('export async function setSecurityConfig'));
  const client = read('src/services/adminAuthClient.ts');
  assert.ok(client.includes('export async function adminServerChangePassword') && client.includes('export async function adminServerChangePin'));
});
await ok('ephemeral image URLs (ntfy.sh/file/*) are blocked from upload and auto-healed on render', async () => {
  const typesMod = await load('src/types/index.ts');
  assert.equal(typesMod.isEphemeralDeadImageUrl('https://ntfy.sh/file/abc123.webp'), true);
  assert.equal(typesMod.isEphemeralDeadImageUrl('https://ryvltobwuwuulazqjnza.supabase.co/storage/v1/object/public/food-media/ov/kft_ov_food_food-69_healed.jpg'), false);
  assert.equal(typesMod.getBundledSeedFoodFallbackPath('food-69'), '/foods/food-69.jpg');
  const healed = typesMod.resolveFoodPhotoUrl('https://ntfy.sh/file/expired.webp', 'https://ntfy.sh/file/expired.webp', undefined, 'food-69');
  assert.ok(healed.startsWith('/foods/food-69.jpg'), 'expected /foods/food-69.jpg?v=..., got ' + healed);
  const cloudImg = read('src/services/cloudImageStorageService.ts');
  assert.ok(!cloudImg.includes("fetch('https://ntfy.sh/'"), 'secondary ntfy.sh image upload must stay disabled');
});


console.log('[edge] Phase E.2 Consumer VIP, Shop Package & Two-Line Trial Abuse Protection');
const idNormServer = await load('supabase/functions/_shared/identity-normalize.ts');
const idNormClient = await load('src/utils/identityNormalize.ts');
const winbackSvc = await load('src/services/trialWinbackNotificationService.ts');

ok('resolveOfficialServerPlan resolves all 7 paid Consumer & Shop plans, enforces 50-shop Early-Bird cap, and refuses trial_7d on receipt endpoint', () => {
  const defPricing = {};
  assert.deepEqual(rr.resolveOfficialServerPlan(defPricing, 'consumer_promo_30d'), {
    planId: 'consumer_promo_30d',
    category: 'consumer',
    planType: 'quarterly',
    days: 30,
    priceUsd: 0.99,
  });
  assert.deepEqual(rr.resolveOfficialServerPlan(defPricing, 'consumer_30d'), {
    planId: 'consumer_30d',
    category: 'consumer',
    planType: 'quarterly',
    days: 30,
    priceUsd: 2.99,
  });
  assert.deepEqual(rr.resolveOfficialServerPlan(defPricing, 'consumer_90d'), {
    planId: 'consumer_90d',
    category: 'consumer',
    planType: 'annual',
    days: 90,
    priceUsd: 6.99,
  });
  assert.deepEqual(rr.resolveOfficialServerPlan(defPricing, 'consumer_365d'), {
    planId: 'consumer_365d',
    category: 'consumer',
    planType: 'annual',
    days: 365,
    priceUsd: 19.99,
  });
  assert.deepEqual(rr.resolveOfficialServerPlan(defPricing, 'shop_30d'), {
    planId: 'shop_30d',
    category: 'shop',
    planType: 'quarterly',
    days: 30,
    priceUsd: 6.99,
  });
  assert.deepEqual(rr.resolveOfficialServerPlan({ shopEarlyBirdClaimedCount: 12, shopEarlyBirdMaxShops: 50 }, 'shop_earlybird_365d'), {
    planId: 'shop_earlybird_365d',
    category: 'shop',
    planType: 'annual',
    days: 365,
    priceUsd: 49.99,
  });
  // Cap reached (50/50) -> automatic fallback to standard $59.99 shop_365d
  assert.deepEqual(rr.resolveOfficialServerPlan({ shopEarlyBirdClaimedCount: 50, shopEarlyBirdMaxShops: 50 }, 'shop_earlybird_365d'), {
    planId: 'shop_365d',
    category: 'shop',
    planType: 'annual',
    days: 365,
    priceUsd: 59.99,
  });
  assert.equal(rr.resolveOfficialServerPlan(defPricing, 'trial_7d'), null, 'free trial uses claim_trial action, never receipt verification');
  assert.equal(rr.resolveOfficialServerPlan(defPricing, 'lifetime_forever'), null, 'no lifetime shop or consumer plan');
});

ok('applyShopSubscriptionGrant stacks early shop renewals and applyTrial7dGrant records trial metadata cleanly', () => {
  const activeExp = new Date(NOW + 10 * 86400000).toISOString();
  const { updatedShop, expiryIso } = rr.applyShopSubscriptionGrant(
    { id: 'rest-vip-1', shopSubscriptionExpiresAt: activeExp },
    { startIso: new Date(NOW).toISOString(), days: 30, planId: 'shop_30d', trxId: 'TRXSHOP30', nowMs: NOW }
  );
  assert.equal(expiryIso, new Date(NOW + 40 * 86400000).toISOString(), 'early renewal must stack remaining days');
  assert.equal(updatedShop.shopPaymentStatus, 'active');
  assert.equal(updatedShop.activeShopPlanId, 'shop_30d');

  const trialUser = rr.applyTrial7dGrant(
    { id: 'u-trial', email: 'sok@gmail.com', membershipTier: 'free' },
    { startIso: '2026-11-08T00:00:00.000Z', expiryIso: '2026-11-15T00:00:00.000Z', days: 7, trxId: 'TRIAL-7D-1' }
  );
  assert.equal(trialUser.membershipTier, 'premium_vip');
  assert.equal(trialUser.activeConsumerPlanId, 'trial_7d');
  assert.equal(trialUser.freeTrialActivated, true);
});

ok('server AI daily quota distinguishes 7-day trial VIP (15/day) from paid Consumer VIP (80/day)', () => {
  const future = '2026-12-01T00:00:00.000Z';
  const trialDoc = {
    membershipTier: 'premium_vip',
    subscriptionStatus: 'active',
    subscriptionExpiryDate: future,
    activeConsumerPlanId: 'trial_7d',
    freeTrialActivated: true,
  };
  const paidDoc = {
    membershipTier: 'premium_vip',
    subscriptionStatus: 'active',
    subscriptionExpiryDate: future,
    activeConsumerPlanId: 'consumer_90d',
  };
  assert.equal(common.classifyVipQuotaTier(trialDoc, NOW), 'trial_vip');
  assert.equal(common.classifyVipQuotaTier(paidDoc, NOW), 'paid_vip');
  assert.deepEqual(common.resolveUserAiDailyLimit({ isPayment: false, userId: 'u1', userDoc: trialDoc, nowMs: NOW }), {
    limit: 15,
    tier: 'trial_vip',
  });
  assert.deepEqual(common.resolveUserAiDailyLimit({ isPayment: false, userId: 'u2', userDoc: paidDoc, nowMs: NOW }), {
    limit: 80,
    tier: 'paid_vip',
  });
});

await ok('Cambodia +855 phone & Gmail canonicalization produce byte-identical hashes on client and server, and block disposable emails', async () => {
  for (const variant of ['012 345 678', '85512345678', '+855 12 345 678', '+855012345678', '០១២ ៣៤៥ ៦៧៨']) {
    assert.equal(idNormServer.normalizeCambodiaPhone(variant), '+85512345678', variant);
    assert.equal(idNormClient.normalizeCambodiaPhone(variant), '+85512345678', variant);
  }
  const g1 = idNormServer.normalizeEmailForIdentity('Sok.Ha+promo1@googlemail.com');
  assert.deepEqual(g1, { canonical: 'sokha@gmail.com', isDisposable: false });
  const disp = idNormServer.normalizeEmailForIdentity('burner@mailinator.com');
  assert.equal(disp?.isDisposable, true);

  const srvHashes = await idNormServer.computeServerIdentityHashes({ email: 'Sok.Ha+vip@gmail.com', phone: '012 345 678' });
  const cliHashes = await idNormClient.computeIdentityClaimHashes({ email: 'sokha@googlemail.com', phone: '+85512345678' });
  assert.deepEqual(srvHashes.identityHashes.sort(), cliHashes.identityHashes.sort(), 'client & server SHA-256 identity hashes must match');
});

ok('Trial Win-Back planner schedules Day 6 (880001) & Day 8 (880002) for active trial and cancels on paid upgrade', () => {
  const startMs = Date.parse('2026-11-08T03:00:00.000Z');
  const expIso = new Date(startMs + 7 * 86400000).toISOString();
  const trialUser = {
    id: 'u-trial',
    name: 'Dara',
    role: 'user',
    membershipTier: 'premium_vip',
    subscriptionStatus: 'active',
    subscriptionExpiryDate: expIso,
    activeConsumerPlanId: 'trial_7d',
    freeTrialActivated: true,
    freeTrialExpiresAt: expIso,
  };
  const planned = winbackSvc.planTrialWinbackNotifications({
    user: trialUser,
    language: 'km',
    nowMs: startMs + 1000,
    promoPriceUsd: 0.99,
    skipIosCheckForTest: true,
  });
  assert.deepEqual(planned.map((p) => p.id), [880001, 880002]);

  const upgradedUser = { ...trialUser, activeConsumerPlanId: 'consumer_90d' };
  const afterUpgrade = winbackSvc.planTrialWinbackNotifications({
    user: upgradedUser,
    language: 'km',
    nowMs: startMs + 1000,
    skipIosCheckForTest: true,
  });
  assert.deepEqual(afterUpgrade, []);
});

ok('Pricing & Two-Line Trial SQL (supabase_pricing_trial_shop_v1.sql) is RLS-locked, service-role only, and non-destructive', () => {
  const sql = read('supabase_pricing_trial_shop_v1.sql');
  const code = sql.split(/\r?\n/).filter((l) => !l.trim().startsWith('--')).join('\n');
  assert.ok(/CREATE TABLE IF NOT EXISTS public\.kft_trial_promo_claims/.test(code));
  assert.ok(/ALTER TABLE public\.kft_trial_promo_claims ENABLE ROW LEVEL SECURITY/.test(code));
  assert.ok(/REVOKE ALL ON public\.kft_trial_promo_claims FROM anon, authenticated/.test(code));
  assert.ok(/uq_kft_trial_promo_identity/.test(code) && /uq_kft_trial_promo_device/.test(code));
  assert.ok(!/CREATE POLICY/i.test(code));
  assert.ok(!/DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i.test(code));
});

ok('validateCambodiaPhoneForRegistration blocks fake 10-digit numbers on 9-digit prefixes, invalid prefixes, and test patterns while accepting real 9- and 10-digit numbers', () => {
  for (const fn of [idNormClient.validateCambodiaPhoneForRegistration, idNormServer.validateCambodiaPhoneForRegistration]) {
    // Fake 10-digit numbers on 9-digit-only prefixes (012, 010, 077)
    for (const fake10 of ['012 458 2917', '010 458 2917', '077 458 2917', '+855 12 458 2917']) {
      const r = fn(fake10);
      assert.equal(r.valid, false, fake10);
      assert.equal(r.reason, 'invalid_carrier_length', fake10);
    }
    // Invalid non-existent Cambodian prefixes (000, 020, 022, 084)
    for (const badPrefix of ['020 245 959', '022 458 2917', '084 245 959', '091 245 959']) {
      const r = fn(badPrefix);
      assert.equal(r.valid, false, badPrefix);
      assert.equal(r.reason, 'invalid_carrier_prefix', badPrefix);
    }
    // Sequential or repetitive fake numbers
    for (const fakePat of ['012 123 456', '096 123 4567', '012 111 111', '097 888 8888', '015 000 123']) {
      const r = fn(fakePat);
      assert.equal(r.valid, false, fakePat);
      assert.equal(r.reason, 'fake_pattern', fakePat);
    }
    // Valid real 9-digit and 10-digit Cambodia numbers
    for (const [raw, expected] of [
      ['012 245 959', '+85512245959'],
      ['010 582 914', '+85510582914'],
      ['096 458 2917', '+855964582917'],
      ['097 382 9104', '+855973829104'],
      ['088 519 2048', '+855885192048'],
      ['071 629 4815', '+855716294815'],
    ]) {
      const r = fn(raw);
      assert.equal(r.valid, true, raw);
      assert.equal(r.canonicalPhone, expected, raw);
    }
  }
});


console.log('[edge] Strict ABA VIP Renewal Verification System');
ok('receipt renewal anti-replay: rejects receipts older than or equal to previous VIP activation timestamp', () => {
  const prevActivationMs = Date.parse('2026-11-06T07:00:00Z');
  // Receipt from Nov 5, 2026 (within 14 days of NOW, but BEFORE user's previous VIP activation on Nov 6)
  const oldRenewal = ev({ transactionDate: 'Nov 5, 2026 06:31 PM' }, { lastVerifiedPaymentAtMs: prevActivationMs });
  assert.equal(oldRenewal.allPassed, false, 'receipt older than previous activation must be rejected on renewal');
  assert.equal(oldRenewal.checks.date.passed, false);

  // Fresh receipt from Nov 6, 2026 06:31 PM UTC+7 (11:31 UTC > 07:00 UTC)
  const freshRenewal = ev({ transactionDate: '2026-11-06T12:00:00Z' }, { lastVerifiedPaymentAtMs: prevActivationMs });
  assert.equal(freshRenewal.allPassed, true, 'receipt newer than previous activation passes');
});

ok('receipt authenticity & payment status: rejects pending/failed transfers and modified/fake receipts', () => {
  const pendingTransfer = ev({ paymentStatus: 'pending' });
  assert.equal(pendingTransfer.allPassed, false, 'pending transfer screen must not pass');
  assert.equal(pendingTransfer.paymentStatusOk, false);

  const failedTransfer = ev({ paymentStatus: 'failed' });
  assert.equal(failedTransfer.allPassed, false, 'failed transfer must not pass');

  const fakeReceipt = ev({ isModifiedOrFake: true, tamperReason: 'Edited digits on amount' });
  assert.equal(fakeReceipt.allPassed, false, 'modified/fake receipt must not pass');
  assert.equal(fakeReceipt.notModifiedOrFake, false);
  const rep = rr.buildReport({
    decision: 'rejected',
    evaluation: fakeReceipt,
    extracted: { ...goodReceipt, isModifiedOrFake: true },
    duplicate: false,
    noteKh: 'k',
    noteEn: 'e',
    nowIso: '2026-11-07T08:00:00.000Z',
  });
  assert.equal(rep.checks.antiReplay.passed, false, 'buildReport marks antiReplay failed on modified/fake receipt');
});

ok('statement matcher + centralized Used-Trx database: blocks any already-used Trx ID across accounts', () => {
  const entries = sm.normalizeRows(sm.parseCsv(statementCsv));
  // 176121426630955 is in the statement for $4.99, but if it is in usedTrxKeys (already used by another account), it must be rejected as duplicate_trx
  const resWithUsed = sm.matchPayments(
    [{ id: 'P-CROSS-ACCOUNT', trxId: '176121426630955', amountUsd: 4.99 }],
    entries,
    ['176121426630955']
  );
  assert.equal(resWithUsed[0].status, 'duplicate_trx', 'already-used Trx ID must never match even if present in bank statement');

  // Placeholder refs like ABA-KHQR-... are normalized to empty and treated as no_trx_id
  const resPlaceholder = sm.matchPayments(
    [{ id: 'P-PLACEHOLDER', trxId: 'ABA-KHQR-30D-MVOVQCZU', amountUsd: 4.99 }],
    entries
  );
  assert.equal(resPlaceholder[0].status, 'no_trx_id', 'placeholder ref must never be treated as a real ABA Trx ID');

  // Modified/fake receipt is blocked in statement matcher even if Trx ID is in statement
  const resTampered = sm.matchPayments(
    [{ id: 'P-TAMPERED', trxId: '176121426630955', amountUsd: 4.99, isModifiedOrFake: true }],
    entries
  );
  assert.equal(resTampered[0].status, 'duplicate_trx', 'tampered receipt must be blocked in statement matcher');
});

ok('PDF & screenshot support + centralized Used-Trx & Audit Log SQL (supabase_aba_vip_verification_v1.sql)', () => {
  const fn = read('supabase/functions/vip-purchase/index.ts');
  assert.ok(fn.includes('application\\/pdf'), 'vip-purchase Edge Function parses PDF receipts alongside screenshots');
  assert.ok(fn.includes('kft_used_aba_transactions') && fn.includes('kft_payment_audit_log'), 'centralized used-Trx and audit log tables wired');
  assert.ok(fn.includes("action === 'admin_approve_transaction'") && fn.includes("action === 'get_payment_registry_and_audit'"));

  const sql = read('supabase_aba_vip_verification_v1.sql');
  const code = sql.split(/\r?\n/).filter((l) => !l.trim().startsWith('--')).join('\n');
  for (const t of ['kft_used_aba_transactions', 'kft_payment_audit_log']) {
    assert.ok(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${t}`).test(code), 'creates ' + t);
    assert.ok(new RegExp(`ALTER TABLE public\\.${t}\\s+ENABLE ROW LEVEL SECURITY`).test(code), 'RLS ' + t);
    assert.ok(new RegExp(`REVOKE ALL ON public\\.${t} FROM anon, authenticated`).test(code), 'revoke ' + t);
  }
});

ok('Code Obfuscation + Anti-Debugging + Anti-Clone Check (Vite, ProGuard, MainActivity, NativeAppIntegrity, Runtime Guard)', () => {
  const viteCfg = read('vite.config.ts');
  assert.ok(viteCfg.includes("sourcemap: false"), 'production sourcemaps disabled');
  assert.ok(viteCfg.includes("entryFileNames: 'assets/k-[hash].js'") && viteCfg.includes("chunkFileNames: 'assets/c-[hash].js'"), 'Rollup chunk and entry filenames are obfuscated');

  const proguard = read('android/app/proguard-rules.pro');
  assert.ok(proguard.includes('-renamesourcefileattribute SourceFile'), 'ProGuard renames Java source file attributes');
  assert.ok(!proguard.includes('-keepattributes SourceFile,LineNumberTable'), 'ProGuard strips original source line tables');

  const mainAct = read('android/app/src/main/java/com/khmerfood/tourism/MainActivity.java');
  assert.ok(mainAct.includes('WebView.setWebContentsDebuggingEnabled(false)'), 'MainActivity disables WebView remote debugging in release builds');

  const nativeInt = read('android/app/src/main/java/com/khmerfood/tourism/NativeAppIntegrityPlugin.java');
  assert.ok(nativeInt.includes('detectDebuggerAttached') && nativeInt.includes('detectClonedMultiSpaceContainer') && nativeInt.includes('detectHookFrameworks'), 'NativeAppIntegrityPlugin detects debuggers, app-cloner containers, and Xposed/Frida hooks');

  const guardTs = read('src/utils/appCloneIntegrityGuard.ts');
  assert.ok(guardTs.includes('installRuntimeAntiDebugGuard') && guardTs.includes('isAllowedRuntimeOrigin'), 'Runtime anti-debug and origin guard exported');

  const mainTsx = read('src/main.tsx');
  assert.ok(mainTsx.includes('installRuntimeAntiDebugGuard()'), 'main.tsx installs runtime anti-debug guard at startup');
});

ok('CORS Origin allowlist & RLS hardening across Edge Functions and SQL', () => {
  const reqAllowed = new Request('https://example.com', { headers: { origin: 'https://igpubinfo-max.github.io' } });
  const reqCap = new Request('https://example.com', { headers: { origin: 'capacitor://localhost' } });
  const reqEvil = new Request('https://example.com', { headers: { origin: 'https://evil-cloned-app.com' } });
  assert.equal(common.isAllowedOrigin(reqAllowed), true);
  assert.equal(common.isAllowedOrigin(reqCap), true);
  assert.equal(common.isAllowedOrigin(reqEvil), false);
  assert.equal(common.verifyClientAppIntegrity(reqEvil).ok, false);
  assert.equal(common.resolveAllowedOrigin(reqCap), 'capacitor://localhost');
  assert.equal(common.resolveAllowedOrigin(reqEvil), 'https://igpubinfo-max.github.io');

  const scaleSql = read('supabase_admin_users_scale_10k.sql');
  assert.ok(scaleSql.includes('ALTER TABLE public.kft_users_directory ENABLE ROW LEVEL SECURITY;'));
  assert.ok(scaleSql.includes('ALTER TABLE public.kft_user_activity_logs ENABLE ROW LEVEL SECURITY;'));
  assert.ok(scaleSql.includes("SELECT (payload - 'passwordHash') AS payload"));
});

console.log(`\n[edge] ALL ${passed} CHECKS PASSED`);


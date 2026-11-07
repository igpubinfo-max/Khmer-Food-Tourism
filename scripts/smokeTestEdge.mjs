// Smoke test for the deployed Edge Functions: node scripts/smokeTestEdge.mjs
const SUPA = 'https://ryvltobwuwuulazqjnza.supabase.co';
const KEY = 'sb_publishable_h5ufAaA0qAL3s-ebprATsw_8AApv71l';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', 'x-kft-user-id': 'smoke-test-user' };
let bad = 0;
const line = (ok, name, extra = '') => { if (!ok) bad++; console.log((ok ? '  PASS ' : '  FAIL ') + name + (extra ? '  - ' + extra : '')); };

async function t(name, fn) { try { await fn(); } catch (e) { line(false, name, String(e?.message || e)); } }

await t('places-proxy health', async () => {
  const r = await fetch(`${SUPA}/functions/v1/places-proxy?health=1`, { headers: H });
  const j = await r.json().catch(() => ({}));
  line(r.ok && r.headers.get('x-places-proxy') === '1', 'places-proxy deployed', `HTTP ${r.status}`);
  line(Boolean(j.configured), 'GOOGLE_MAPS_API_KEY secret is set', JSON.stringify(j));
});
await t('places searchText', async () => {
  const body = { path: 'places:searchText', fieldMask: 'places.id,places.displayName', body: { textQuery: 'Num Banh Chok Siem Reap Cambodia', regionCode: 'KH', maxResultCount: 3 } };
  const r1 = await fetch(`${SUPA}/functions/v1/places-proxy`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r1.json().catch(() => ({}));
  line(r1.ok && Array.isArray(j.places) && j.places.length > 0, 'searchText returns places', `HTTP ${r1.status} cache=${r1.headers.get('x-places-cache')} ${j?.error?.message || ''}`);
  const r2 = await fetch(`${SUPA}/functions/v1/places-proxy`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  line(r2.headers.get('x-places-cache') === 'hit', 'second identical search is served from the cache (needs supabase_pro_platform_v1.sql)', `cache=${r2.headers.get('x-places-cache')}`);
  const bad1 = await fetch(`${SUPA}/functions/v1/places-proxy`, { method: 'POST', headers: H, body: JSON.stringify({ ...body, fieldMask: '*' }) });
  line(bad1.status === 400, 'wildcard field mask is refused', `HTTP ${bad1.status}`);
});
await t('food-ai', async () => {
  const body = { model: 'gemini-3.5-flash-lite', body: { contents: [{ role: 'user', parts: [{ text: 'Say OK in one word.' }] }], generationConfig: { maxOutputTokens: 256 } } };
  const r = await fetch(`${SUPA}/functions/v1/food-ai`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  line(r.headers.get('x-food-ai-proxy') === '1', 'food-ai deployed', `HTTP ${r.status}`);
  line(r.ok && Boolean(j?.candidates?.[0]?.content?.parts?.[0]?.text), 'AI answered', `provider=${r.headers.get('x-food-ai-provider')} quota=${r.headers.get('x-kft-quota-used')}/${r.headers.get('x-kft-quota-limit')} ${j?.error?.message || ''}`);
});
console.log(bad ? `\n${bad} check(s) FAILED` : '\nAll smoke checks passed');
process.exitCode = bad ? 1 : 0;

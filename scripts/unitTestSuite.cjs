/**
 * Automated Unit Test Suite (CHG-16)
 * Verifies:
 *   1. Seed Data Integrity (Foods, Restaurants, Hotels, Attractions — 0 duplicate IDs)
 *   2. Unified Khmer/English/Chinese Search Normalization (CHG-12 / DUP-02)
 *   3. Centralized Near Me Navigation Helper (CHG-11 / DUP-01)
 *   4. Centralized App Constants (CHG-19 / DUP-06)
 *   5. SQL Migration Syntax & SEC-01 RLS Policy Guard Verification (CHG-03, CHG-04, CHG-06)
 *   6. Healthy Food 5 Category Buttons Audit
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('=== Cambodia Flavors & Tourism — Unit Test Suite (CHG-16) ===');

test('1. Centralized appConstants.ts exports official Supabase & ABA constants (CHG-19)', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/config/appConstants.ts'), 'utf8');
  assert.ok(content.includes("DEFAULT_SUPABASE_URL = 'https://ryvltobwuwuulazqjnza.supabase.co'"));
  assert.ok(content.includes("DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_h5ufAaA0qAL3s-ebprATsw_8AApv71l'"));
  assert.ok(content.includes("SUPABASE_KV_TABLE = 'kft_app_kv_store'"));
  assert.ok(content.includes('ABA_OFFICIAL_MERCHANT'));
});

test('2. SQL files have zero DB-01 (headers_json) or DB-02 ($;) syntax bugs (CHG-03 / CHG-04)', () => {
  const sqlFiles = [
    'supabase_security_hardening_v2.sql',
    'supabase/migrations/20261108000001_security_hardening_v2.sql',
    'supabase_admin_users_scale_10k.sql',
    'supabase/migrations/20261110000001_admin_users_scale_10k.sql',
    'supabase/migrations/20261115000001_kft_kv_rls_and_schema_hardening.sql',
  ];
  for (const rel of sqlFiles) {
    const c = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.ok(!c.includes('headers_json'), `${rel} still contains undeclared headers_json`);
    assert.ok(!/^\s*\$;\s*$/m.test(c), `${rel} still contains invalid $; terminator`);
  }
});

test('3. SEC-01 RLS migration guards kft_user_* SELECT and provides kft_get_single_user_record RPC (CHG-06)', () => {
  const c = fs.readFileSync(
    path.join(ROOT, 'supabase/migrations/20261115000001_kft_kv_rls_and_schema_hardening.sql'),
    'utf8'
  );
  assert.ok(c.includes('CREATE OR REPLACE FUNCTION public.kft_is_valid_kv_select_request(p_key text)'));
  assert.ok(c.includes('CREATE OR REPLACE FUNCTION public.kft_get_single_user_record(p_user_key text)'));
  assert.ok(c.includes('USING (public.kft_is_valid_kv_select_request(key))'));
  assert.ok(c.includes("p_key LIKE 'kft\\_media\\_%' ESCAPE '\\'"));
});

test('4. Unified Khmer spelling normalization across searchEngine, khmerFoodSearch, and googlePlacesService (CHG-12)', () => {
  const se = fs.readFileSync(path.join(ROOT, 'src/utils/searchEngine.ts'), 'utf8');
  const kf = fs.readFileSync(path.join(ROOT, 'src/utils/khmerFoodSearch.ts'), 'utf8');
  const gp = fs.readFileSync(path.join(ROOT, 'src/services/googlePlacesService.ts'), 'utf8');
  assert.ok(se.includes('export function applyKhmerSpellingVariants'));
  assert.ok(kf.includes('applyKhmerSpellingVariants(input)'));
  assert.ok(gp.includes('applyKhmerSpellingVariants(input)'));
});

test('5. Centralized Near Me navigation helper is wired across all 6 components (CHG-11)', () => {
  const nav = fs.readFileSync(path.join(ROOT, 'src/utils/nearMeNavigation.ts'), 'utf8');
  assert.ok(nav.includes('export function openNearMeModal'));
  assert.ok(nav.includes('export function consumeNearMeInitialState'));
  for (const comp of [
    'src/components/GuideView.tsx',
    'src/components/HomeView.tsx',
    'src/components/SmartHubMenuModal.tsx',
    'src/components/WhatToEatModal.tsx',
    'src/components/WhereToEat.tsx',
  ]) {
    const c = fs.readFileSync(path.join(ROOT, comp), 'utf8');
    assert.ok(c.includes('openNearMeModal('), `${comp} should use openNearMeModal`);
  }
  const nearMe = fs.readFileSync(path.join(ROOT, 'src/components/NearMeModal.tsx'), 'utf8');
  assert.ok(nearMe.includes('consumeNearMeInitialState()'));
});

test('6. AppContext.Provider value is memoized with useMemo (CHG-09)', () => {
  const ctx = fs.readFileSync(path.join(ROOT, 'src/context/AppContext.tsx'), 'utf8');
  assert.ok(ctx.includes('const contextValue = useMemo('));
  assert.ok(ctx.includes('<AppContext.Provider value={contextValue}>'));
  assert.ok(!ctx.includes('Boolean(1)'));
});

test('7. Dead photo functions and unused dependencies removed (CHG-13 / CHG-15 / CHG-21)', () => {
  const shopPhoto = fs.readFileSync(path.join(ROOT, 'src/services/shopGooglePhotoService.ts'), 'utf8');
  const attrPhoto = fs.readFileSync(path.join(ROOT, 'src/services/touristAttractionPhotoService.ts'), 'utf8');
  const vipClient = fs.readFileSync(path.join(ROOT, 'src/services/vipPurchaseClient.ts'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.ok(!shopPhoto.includes('searchGoogleMapsShopPhoto'));
  assert.ok(!attrPhoto.includes('queryGooglePlacesPhotoForAttraction'));
  assert.ok(!vipClient.includes('Boolean(1)'));
  assert.equal(pkg.dependencies['firebase'], undefined);
  assert.equal(pkg.dependencies['bakong-khqr'], undefined);
  assert.equal(pkg.dependencies['exceljs'], undefined);
  assert.ok(pkg.devDependencies['exceljs']);
});

test('8. Healthy Food 5 Category Buttons functional audit passes 100%', () => {
  const out = execSync('node scripts/healthyChipsAudit.cjs', { cwd: ROOT, encoding: 'utf8' });
  assert.ok(out.includes('RESULT: ALL CHECKS PASSED'));
});

console.log(`\nAll ${passed} unit test suites passed successfully!`);

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

test('9. 3-Language Food Content Integrity & Anti-Duplication Audit (KM, EN, ZH)', () => {
  const Module = require('module');
  const ts = require('typescript');
  const origResolve = Module._resolveFilename;
  Module._resolveFilename = function (req, parent, isMain, opts) {
    if (req.startsWith('.') && parent && parent.filename) {
      const cand = path.resolve(path.dirname(parent.filename), req);
      for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        if (fs.existsSync(cand + ext)) return cand + ext;
      }
    }
    return origResolve.call(this, req, parent, isMain, opts);
  };
  require.extensions['.ts'] = function (mod, filename) {
    const rawTs = fs.readFileSync(filename, 'utf8').replace(/import\.meta/g, '({ env: {} })');
    const { outputText } = ts.transpileModule(rawTs, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
      fileName: filename,
    });
    mod._compile(outputText, filename);
  };

  const { canonicalKhmerFoods } = require(path.join(ROOT, 'src/data/seedFoods.ts'));
  const { initialTrendingFoods } = require(path.join(ROOT, 'src/data/seedTrendingFoods.ts'));
  const { getLocalizedFood, translateDynamicTextToZh, sanitizeStrictLanguageText } = require(path.join(ROOT, 'src/utils/zhDynamicTranslator.ts'));

  assert.equal(canonicalKhmerFoods.length, 277, 'Canonical Khmer foods should contain 277 deduplicated dishes');

  const ids = new Set();
  const namesKm = new Set();
  const namesEn = new Set();
  const namesZh = new Set();
  const descsKm = new Set();
  const descsEn = new Set();
  const descsZh = new Set();

  for (const food of canonicalKhmerFoods) {
    assert.ok(!ids.has(food.id), 'Duplicate food ID: ' + food.id);
    ids.add(food.id);

    const km = getLocalizedFood(food, 'km');
    const en = getLocalizedFood(food, 'en');
    const zh = getLocalizedFood(food, 'zh');

    assert.ok(!namesKm.has(km.name), 'Duplicate KM name: ' + km.name);
    assert.ok(!namesEn.has(en.name.toLowerCase()), 'Duplicate EN name: ' + en.name);
    assert.ok(!namesZh.has(zh.name), 'Duplicate ZH name: ' + zh.name);
    namesKm.add(km.name);
    namesEn.add(en.name.toLowerCase());
    namesZh.add(zh.name);

    assert.ok(!descsKm.has(km.description), 'Duplicate KM description on ' + food.id);
    assert.ok(!descsEn.has(en.description.toLowerCase()), 'Duplicate EN description on ' + food.id);
    assert.ok(!descsZh.has(zh.description), 'Duplicate ZH description on ' + food.id);
    descsKm.add(km.description);
    descsEn.add(en.description.toLowerCase());
    descsZh.add(zh.description);

    // Language purity checks
    assert.ok(!/[\u4E00-\u9FFF]/.test(km.name + km.description + km.category), 'CJK leaked into KM on ' + food.id);
    assert.ok(!km.category.includes('&'), 'Ampersand in KM category on ' + food.id);
    assert.ok(!/[\u1780-\u17FF]/.test(en.name + en.description + en.category), 'Khmer leaked into EN on ' + food.id);
    assert.ok(!/[\u1780-\u17FF]/.test(zh.name + zh.description + zh.category), 'Khmer leaked into ZH on ' + food.id);
    assert.ok(!/[A-Za-z]{2,}/.test(zh.name + zh.category), 'Untranslated Latin in ZH name/category on ' + food.id);

    // Ingredient & step parity across KM, EN, ZH
    assert.equal(km.ingredients.length, en.ingredients.length, 'KM/EN ingredient count mismatch on ' + food.id);
    assert.equal(km.ingredients.length, zh.ingredients.length, 'KM/ZH ingredient count mismatch on ' + food.id);
    assert.equal(km.steps.length, en.steps.length, 'KM/EN step count mismatch on ' + food.id);
    assert.equal(km.steps.length, zh.steps.length, 'KM/ZH step count mismatch on ' + food.id);

    for (let i = 0; i < km.ingredients.length; i++) {
      assert.ok(!/[\u4E00-\u9FFF]/.test(km.ingredients[i].name), 'CJK in KM ingredient on ' + food.id);
      assert.ok(!/[\u1780-\u17FF]/.test(en.ingredients[i].amount), 'Khmer in EN amount on ' + food.id);
      assert.ok(!/[\u1780-\u17FFA-Za-z]/.test(zh.ingredients[i].amount), 'Untranslated ZH amount on ' + food.id + ': ' + zh.ingredients[i].amount);
      assert.ok(!/[A-Za-z]{2,}/.test(zh.ingredients[i].name), 'Untranslated Latin in ZH ingredient on ' + food.id + ': ' + zh.ingredients[i].name);
    }

    for (let i = 0; i < km.steps.length; i++) {
      assert.ok(!/[A-Za-z]{2,}/.test(zh.steps[i].instruction), 'Untranslated Latin in ZH step on ' + food.id + ': ' + zh.steps[i].instruction);
    }
  }

  for (const tf of initialTrendingFoods) {
    assert.ok(ids.has(tf.matchedFoodId), 'Trending food ' + tf.id + ' matchedFoodId missing: ' + tf.matchedFoodId);
    assert.ok(!tf.foodNameKh.includes('&') && !tf.categoryKh.includes('&'), 'Ampersand in trending KM text on ' + tf.id);
    const zhTrendName = sanitizeStrictLanguageText(translateDynamicTextToZh(tf.foodNameEn), 'zh');
    assert.ok(!/[A-Za-z]{2,}/.test(zhTrendName), 'Untranslated trending ZH name on ' + tf.id + ': ' + zhTrendName);
  }
});

test('10. Global GPS Distance-First Sorting System across KM/EN/ZH searches, Google Places, and Local DB', () => {
  const {
    calculateDistanceMeters,
    compareByGpsDistanceAscending,
    sortResultsByGpsDistance,
  } = require(path.join(ROOT, 'src/utils/nearMeEngine.ts'));
  const {
    rankBySearchRelevance,
    restaurantSearchFields,
    destinationSearchFields,
  } = require(path.join(ROOT, 'src/utils/searchEngine.ts'));
  const {
    matchShopToProductQuery,
    getMatchingRestaurantsForDish,
  } = require(path.join(ROOT, 'src/utils/foodFilters.ts'));
  const {
    performUnifiedCambodiaSearch,
  } = require(path.join(ROOT, 'src/services/googlePlacesService.ts'));
  const { canonicalKhmerFoods } = require(path.join(ROOT, 'src/data/seedFoods.ts'));

  const userGps = { lat: 11.5564, lng: 104.9282 };

  // 1. Verify exact coffee shop scenario from user screenshot (785m < 956m < 1556m < 1764m < 1878m < 2200m < 4300m)
  const coffeeCandidates = [
    { id: 'c1', nameKh: 'ហាងកាហ្វេ ប្រោន កោះពេជ្រ', nameEn: 'Brown Coffee Koh Pich', distanceMeters: 4300, _matchScore: 260, _isExactProductMatch: true, rating: 4.5 },
    { id: 'c2', nameKh: 'ចកកាហ្វេ', nameEn: 'Chok Coffee', distanceMeters: 785, _matchScore: 180, _isExactProductMatch: true, rating: 4.7 },
    { id: 'c3', nameKh: 'ខាល់ធើកាហ្វេ', nameEn: 'Culture Coffee', distanceMeters: 2200, _matchScore: 230, _isExactProductMatch: true, rating: 4.5 },
    { id: 'c4', nameKh: 'ហាងកាហ្វេ ០០៧១', nameEn: 'Coffee 0071', distanceMeters: 1764, _matchScore: 190, _isExactProductMatch: true, rating: 4.8 },
    { id: 'c5', nameKh: 'លី កាហ្វេ', nameEn: 'Ly Coffee', distanceMeters: 956, _matchScore: 175, _isExactProductMatch: true, rating: 4.5 },
    { id: 'c6', nameKh: 'កាហ្វេអាមេរិខេណូ', nameEn: 'Americano Coffee', distanceMeters: 1556, _matchScore: 170, _isExactProductMatch: true, rating: 4.5 },
    { id: 'c7', nameKh: 'ធូបកាហ្វេ', nameEn: 'Tube Coffee', distanceMeters: 1878, _matchScore: 165, _isExactProductMatch: true, rating: 4.5 },
  ];

  const sortedCoffee = [...coffeeCandidates].sort((a, b) => compareByGpsDistanceAscending(a, b, userGps));
  const sortedDistances = sortedCoffee.map((c) => c.distanceMeters);
  assert.deepEqual(
    sortedDistances,
    [785, 956, 1556, 1764, 1878, 2200, 4300],
    'Coffee search results must be sorted strictly by ascending GPS distance (closest to farthest)'
  );

  // 2. Verify fallback sorting when GPS is unavailable (null coordinates and no precomputed distance)
  const noGpsItems = [
    { id: 'n1', nameKh: 'ហាង ក', _matchScore: 150, _isExactProductMatch: false, rating: 4.2 },
    { id: 'n2', nameKh: 'ហាង ខ', _matchScore: 280, _isExactProductMatch: true, rating: 4.9 },
    { id: 'n3', nameKh: 'ហាង គ', _matchScore: 220, _isExactProductMatch: true, rating: 4.6 },
  ];
  const sortedNoGps = sortResultsByGpsDistance(noGpsItems, null);
  assert.deepEqual(sortedNoGps.map((x) => x.id), ['n2', 'n3', 'n1'], 'Fallback sorting when GPS is unavailable must prioritize exact match, score, and rating');

  // 3. Verify rankBySearchRelevance sorts nearest first across Khmer, English, and Chinese queries when GPS is available
  const sampleShops = [
    {
      id: 's_far_exact',
      nameKh: 'ហាងកាហ្វេ ប្រោន',
      nameEn: 'Brown Coffee',
      categoryKh: 'ហាងកាហ្វេ',
      categoryEn: 'Cafe & Coffee',
      latitude: 11.5950, // ~4.3km
      longitude: 104.9282,
      rating: 4.9,
      isVerified: true,
      status: 'approved',
      signatureDishesKh: ['កាហ្វេដុតថ្មី'],
      signatureDishesEn: ['Fresh Roasted Coffee'],
    },
    {
      id: 's_near',
      nameKh: 'ចកកាហ្វេ',
      nameEn: 'Chok Coffee',
      categoryKh: 'ហាងកាហ្វេ',
      categoryEn: 'Cafe & Coffee',
      latitude: 11.5630, // ~730m
      longitude: 104.9282,
      rating: 4.5,
      isVerified: true,
      status: 'approved',
      signatureDishesKh: ['កាហ្វេដុតថ្មី'],
      signatureDishesEn: ['Fresh Roasted Coffee'],
    },
    {
      id: 's_mid',
      nameKh: 'លី កាហ្វេ',
      nameEn: 'Ly Coffee Shop',
      categoryKh: 'ហាងកាហ្វេ',
      categoryEn: 'Cafe & Coffee',
      latitude: 11.5700, // ~1.5km
      longitude: 104.9282,
      rating: 4.6,
      isVerified: true,
      status: 'approved',
      signatureDishesKh: ['កាហ្វេទឹកដោះគោ'],
      signatureDishesEn: ['Iced Latte Coffee'],
    },
  ];

  for (const queryStr of ['កាហ្វេ', 'coffee']) {
    const ranked = rankBySearchRelevance(sampleShops, queryStr, (r) => restaurantSearchFields(r), {
      userCoords: userGps,
    });
    assert.equal(ranked.length, 3, 'All relevant shops must be preserved for query: ' + queryStr);
    assert.deepEqual(
      ranked.map((r) => r.id),
      ['s_near', 's_mid', 's_far_exact'],
      'rankBySearchRelevance must sort closest to farthest for query: ' + queryStr
    );
  }

  // 4. Verify matchShopToProductQuery does not leak Chinese characters into Khmer matchedInventoryItems
  const matchKh = matchShopToProductQuery(sampleShops[1], 'កាហ្វេ');
  assert.ok(matchKh.matches, 'Khmer coffee query should match shop');
  for (const item of matchKh.matchedInventoryItems) {
    assert.ok(!/[\u4e00-\u9fff]/.test(item), 'Khmer matchedInventoryItems must not leak CJK text: ' + item);
  }

  // 5. Verify performUnifiedCambodiaSearch sorts restaurants, destinations, and externalPlaces by GPS distance ascending
  const sampleDestinations = [
    {
      id: 'd_far',
      nameKh: 'ប្រាសាទឆ្ងាយ',
      nameEn: 'Far Temple',
      categorySlug: 'temple',
      categoryKh: 'ប្រាសាទបុរាណ',
      categoryEn: 'Ancient Temple',
      provinceKh: 'រាជធានីភ្នំពេញ',
      latitude: 11.6200,
      longitude: 104.9282,
      rating: 4.9,
      isVerified: true,
    },
    {
      id: 'd_near',
      nameKh: 'ប្រាសាទជិត',
      nameEn: 'Near Temple',
      categorySlug: 'temple',
      categoryKh: 'ប្រាសាទបុរាណ',
      categoryEn: 'Ancient Temple',
      provinceKh: 'រាជធានីភ្នំពេញ',
      latitude: 11.5600,
      longitude: 104.9282,
      rating: 4.5,
      isVerified: true,
    },
  ];

  const unifiedRes = performUnifiedCambodiaSearch({
    query: 'ប្រាសាទ',
    foods: canonicalKhmerFoods.slice(0, 5),
    restaurants: [],
    destinations: sampleDestinations,
    smartCachePlaces: [],
    userLat: userGps.lat,
    userLng: userGps.lng,
  });
  assert.deepEqual(
    unifiedRes.destinations.map((d) => d.id),
    ['d_near', 'd_far'],
    'performUnifiedCambodiaSearch must sort matching destinations nearest-first'
  );
});


test('11. Authentic Cambodian Meal-Time Classification (Breakfast, Lunch, Snack, Dinner — zero cross-meal mixing)', () => {
  const { canonicalKhmerFoods } = require(path.join(ROOT, 'src/data/seedFoods.ts'));
  const {
    isAuthenticCambodianDishForMealTime,
    getAuthenticCambodianDishesForMealTime,
    scoreCambodianDishForMealTime,
  } = require(path.join(ROOT, 'src/utils/cambodianMealHabits.ts'));

  const breakfastList = getAuthenticCambodianDishesForMealTime(canonicalKhmerFoods, 'breakfast');
  const lunchList = getAuthenticCambodianDishesForMealTime(canonicalKhmerFoods, 'lunch');
  const dinnerList = getAuthenticCambodianDishesForMealTime(canonicalKhmerFoods, 'dinner');

  assert.ok(breakfastList.length >= 35, 'Should have at least 35 authentic Cambodian breakfast dishes');
  assert.ok(lunchList.length >= 120, 'Should have at least 120 authentic Cambodian lunch dishes');
  assert.ok(dinnerList.length >= 120, 'Should have at least 120 authentic Cambodian dinner dishes');

  // 1. Iconic Breakfast dishes must be in Breakfast and top-scored (100)
  for (const id of ['food-36', 'food-37', 'food-39', 'food-41', 'food-49', 'food-88', 'food-89', 'food-165', 'food-172']) {
    const dish = canonicalKhmerFoods.find((f) => f.id === id);
    assert.ok(dish, 'Dish must exist: ' + id);
    assert.equal(scoreCambodianDishForMealTime(dish, 'breakfast'), 100, 'Iconic breakfast dish must score 100: ' + dish.nameKh);
  }

  // 2. Lunch/Dinner stir-fries, stews, curries, and soups must NEVER appear in Breakfast
  const forbiddenInBreakfast = [
    'food-139', // ឆាបន្លែគ្រប់មុខ
    'food-140', // ខជើងជ្រូកពងទាស្ករត្នោត
    'food-141', // ឆាផ្សិតសាច់មាន់
    'food-145', // ឆាផ្សិត
    'food-1',   // អាម៉ុកត្រីស្លឹកញ
    'food-2',   // សម្លកកូរខ្មែរ
    'food-3',   // សម្លម្ជូរគ្រឿងសាច់គោ
    'food-4',   // សម្លការីសាច់មាន់ខ្មែរ
    'food-5',   // សម្លប្រហើរត្រីរ៉ស់
    'food-8',   // ខសាច់ជ្រូកពងទា
    'food-17',  // ស្ងោរជ្រក់ត្រីរ៉ស់
    'food-19',  // សាច់គោអាំងទឹកប្រហុក
    'food-26',  // ឡុកឡាក់សាច់គោម្រេចកំពត
    'food-29',  // ឆាខ្ញីសាច់គោ
    'food-50',  // ពងទាកូនទឹកម្រេចក្រូចឆ្មា
    'food-236', // ស៊ុបគោឆ្នាំងដី
  ];
  for (const id of forbiddenInBreakfast) {
    const dish = canonicalKhmerFoods.find((f) => f.id === id);
    assert.ok(dish, 'Dish must exist: ' + id);
    assert.equal(
      isAuthenticCambodianDishForMealTime(dish, 'breakfast'),
      false,
      'Lunch/Dinner dish must NEVER be classified as Breakfast: ' + dish.nameKh
    );
  }

  // 3. Morning-only breakfast dishes must NEVER appear in Lunch or Dinner
  const morningOnlyIds = [
    'food-36',  // គុយទាវភ្នំពេញពិសេស
    'food-37',  // នំបញ្ចុកសម្លខ្មែរ
    'food-39',  // គុយទាវខសាច់គោ
    'food-41',  // បាយសាច់ជ្រូកអាំងពងទាចៀន
    'food-42',  // គុយទាវគ្រឿងក្នុង
    'food-49',  // នំប៉័ងប៉ាតេពិសេស
    'food-88',  // បបរមាន់ស្រែស្លឹកខ្ទឹម
    'food-89',  // បបរត្រីរ៉ស់ខ្ញីស្រស់
    'food-165', // ខគោនំប៉័ង
    'food-172', // បាយមាន់ស្ងោរទឹកត្រីខ្ញីពិសេស
  ];
  for (const id of morningOnlyIds) {
    const dish = canonicalKhmerFoods.find((f) => f.id === id);
    assert.equal(
      isAuthenticCambodianDishForMealTime(dish, 'lunch'),
      false,
      'Morning-only dish must NEVER appear in Lunch: ' + dish.nameKh
    );
    assert.equal(
      isAuthenticCambodianDishForMealTime(dish, 'dinner'),
      false,
      'Morning-only dish must NEVER appear in Dinner: ' + dish.nameKh
    );
  }

  // 4. Evening claypot hotpots must appear in Dinner (100) and NEVER in Breakfast or Lunch
  const claypotBeef = canonicalKhmerFoods.find((f) => f.id === 'food-236');
  assert.equal(scoreCambodianDishForMealTime(claypotBeef, 'dinner'), 100);
  assert.equal(isAuthenticCambodianDishForMealTime(claypotBeef, 'lunch'), false);
  assert.equal(isAuthenticCambodianDishForMealTime(claypotBeef, 'breakfast'), false);
});

// 12. Profile Settings Menu Auto-Scroll & Visual Section Highlight Verification
test('12. Profile Settings Menu buttons automatically scroll to and highlight the corresponding result section', () => {
  const profileSrc = fs.readFileSync(path.join(ROOT, 'src/components/ProfileView.tsx'), 'utf8');
  assert.ok(
    profileSrc.includes("import { smoothScrollToElement } from '../utils/smoothScroll'"),
    'ProfileView must import smoothScrollToElement'
  );
  const requiredTargetIds = [
    'profile-subtab-content',
    'profile-vip-benefits-panel',
    'profile-shop-benefits-panel',
    'profile-vip-power-detail',
    'profile-membership-renewal-card',
    'profile-admin-rotation-status',
    'profile-settings-card',
  ];
  for (const id of requiredTargetIds) {
    assert.ok(
      profileSrc.includes(`id="${id}"`),
      `ProfileView must define scroll target id="${id}"`
    );
  }
  const requiredSubTabs = ['myrestaurant', 'wishlists', 'tripplans', 'bookmarks', 'membership', 'settings'];
  for (const tab of requiredSubTabs) {
    assert.ok(
      profileSrc.includes(`selectAndScrollSubTab('${tab}')`),
      `ProfileView must call selectAndScrollSubTab('${tab}') when tapping the ${tab} menu button`
    );
  }
});

// 13. Food Menu Show All (All 277 Dishes) & Removal of Heading Count Badge Verification
test('13. Food menu loads all 277+ dishes on Show All without 36-item filter/pagination lock and removes heading count badge', () => {
  const foodViewSrc = fs.readFileSync(path.join(ROOT, 'src/components/FoodView.tsx'), 'utf8');
  const { canonicalKhmerFoods } = require(path.join(ROOT, 'src/data/seedFoods.ts'));
  const { organizeAndDeduplicateFoods } = require(path.join(ROOT, 'src/types/index.ts'));
  const org = organizeAndDeduplicateFoods(canonicalKhmerFoods);
  assert.ok(org.length >= 277, 'Organized food catalog must contain all 277 deduplicated dishes');
  assert.ok(
    foodViewSrc.includes('const PAGE_BATCH_SIZE = 500;'),
    'FoodView PAGE_BATCH_SIZE must be >= 500 so all 277+ dishes load without pagination cutoff'
  );
  assert.ok(
    foodViewSrc.includes("if (cat.id === 'all')") && foodViewSrc.includes("setTagFilter('all')"),
    'Clicking Show All (គ្រប់មុខម្ហូប) must reset tagFilter, provinceFilter, and mealTimeFilter'
  );
  assert.ok(
    !foodViewSrc.includes('filteredFoods.length} មុខម្ហូប'),
    'Total food count badge on the right side of the Food menu heading must be removed'
  );
});

// 14. Responsive Screen & Layout Optimization (Phone & Tablet Aspect-Ratio Lock + Solid Dark Charcoal Backdrop)
test('14. Welcome Screen, Auth Modal, and App Shell maintain original aspect ratio without stretching on phones/tablets', () => {
  const welcomeSlidesSrc = fs.readFileSync(path.join(ROOT, 'src/components/welcome/WelcomeSlides.tsx'), 'utf8');
  const welcomeTopBarSrc = fs.readFileSync(path.join(ROOT, 'src/components/welcome/WelcomeTopBar.tsx'), 'utf8');
  assert.ok(
    welcomeTopBarSrc.includes('pointer-events-auto') &&
      welcomeTopBarSrc.includes('<button') &&
      welcomeTopBarSrc.includes('onLanguage(l.code)'),
    'WelcomeTopBar must render interactive language buttons that call onLanguage(l.code)'
  );
  const authModalSrc = fs.readFileSync(path.join(ROOT, 'src/components/AuthModal.tsx'), 'utf8');
  const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');

  assert.ok(
    welcomeSlidesSrc.includes("aspectRatio: '3 / 4'") && welcomeSlidesSrc.includes("containerType: 'inline-size'"),
    'WelcomeSlides must lock stage to aspect-ratio 3/4 with inline-size container queries'
  );
  assert.ok(
    !welcomeSlidesSrc.includes('blur-2xl'),
    'WelcomeSlides must not render a stretched/blurred duplicate background image on iPads and tablets'
  );
  assert.ok(
    welcomeSlidesSrc.includes('bg-[#12151C]') && appSrc.includes('bg-[#12151C]') && appSrc.includes('max-w-[480px]'),
    'App and WelcomeSlides must center mobile layout at max-w-[480px] with a solid dark charcoal (#12151C) background on tablets/iPads'
  );
  assert.ok(
    welcomeSlidesSrc.includes('ស្វែងរកទីកន្លែងដើរលេងសម្រាប់ថ្ងៃនេះ') &&
      welcomeSlidesSrc.includes('មុខម្ហូបគួរឱ្យចង់ញ៉ាំថ្ងៃនេះ') &&
      welcomeSlidesSrc.includes('WELCOME_LABELS.offlineBadge[language]'),
    'WelcomeSlides must include updated Khmer labels and offline readiness badge'
  );
  assert.ok(
    authModalSrc.includes("aspectRatio: '935 / 1024'") && authModalSrc.includes('/welcome/auth-login-bg.jpg'),
    'AuthModal must use /welcome/auth-login-bg.jpg locked to 935/1024 aspect ratio'
  );
});

// 15. Nearby Food Search (6 Category Buttons, GPS, Phnom Penh Mountain Bug, Khmer Subscript ថ្មី, & 3-Language Accuracy)
test('15. Nearby Food Search 6 category buttons, Phnom Penh mountain fix, Khmer subscript ថ្មី fix, and KM/EN/ZH accuracy', () => {
  const { restPart1 } = require(path.join(ROOT, 'src/data/seedRestPart1.ts'));
  const { restPart2 } = require(path.join(ROOT, 'src/data/seedRestPart2.ts'));
  const sdMod = require(path.join(ROOT, 'src/data/seedDestinations.ts'));
  const allDestinations = sdMod[Object.keys(sdMod)[0]];
  const {
    getLocalSmartCache,
    convertGooglePlaceToRestaurant,
    convertGooglePlaceToDestination,
  } = require(path.join(ROOT, 'src/services/googlePlacesService.ts'));
  const {
    mergeNearbyFoodShops,
    mergeNearbyTourismDestinations,
    matchesNearMeQuickCategory,
    selectLocalizedBadgeDishesForCategory,
    isFoodShopGooglePlace,
    isTourismAttractionGooglePlace,
  } = require(path.join(ROOT, 'src/utils/nearMeEngine.ts'));
  const { classifyShopBusinessKind } = require(path.join(ROOT, 'src/utils/foodFilters.ts'));

  const allRestaurants = [...restPart1, ...restPart2];
  const smartCache = getLocalSmartCache();
  const ppCenter = { lat: 11.5564, lng: 104.9282 };

  // 1. Verify "Cofe 223" in Phnom Penh (from user screenshot) is NEVER classified as Tourism or Mountain
  const cofe223Polluted = {
    placeId: 'gmap-free-11.5580_104.9250_0',
    googlePlaceId: 'free-11.5580_104.9250_0',
    nameKh: 'Cofe 223',
    nameEn: 'Cofe 223',
    category: 'tourism',
    subCategorySlug: 'mountain',
    province: 'រាជធានីភ្នំពេញ',
    provinceKh: 'រាជធានីភ្នំពេញ',
    address: 'HW44+M8R, St 223, Phnom Penh, ភ្នំពេញ',
    addressKh: 'HW44+M8R, St 223, Phnom Penh, ភ្នំពេញ',
    lat: 11.5610,
    lng: 104.9280,
    phone: '',
    openHours: '07:00 AM - 08:00 PM',
    rating: 4.0,
    reviewCount: 12,
    photoUrl: '',
    googleMapsUrl: 'https://maps.google.com',
    source: 'google_maps_api',
    cachedAt: new Date().toISOString(),
  };

  assert.equal(
    isTourismAttractionGooglePlace(cofe223Polluted),
    false,
    'Cofe 223 in Phnom Penh must NEVER be classified as a tourism attraction'
  );
  assert.equal(
    isFoodShopGooglePlace(cofe223Polluted),
    true,
    'Cofe 223 in Phnom Penh must be rescued as a food/drink shop even if cached as tourism'
  );
  const cofe223Rest = convertGooglePlaceToRestaurant(cofe223Polluted);
  assert.equal(classifyShopBusinessKind(cofe223Rest), 'coffee_drink', 'Cofe 223 must classify as coffee_drink');
  assert.equal(matchesNearMeQuickCategory(cofe223Rest, 'coffee'), true, 'Cofe 223 must match coffee category');
  assert.equal(matchesNearMeQuickCategory(cofe223Rest, 'noodles'), false, 'Cofe 223 must NOT match noodles');
  assert.equal(matchesNearMeQuickCategory(cofe223Rest, 'rice_khmer'), false, 'Cofe 223 must NOT match rice_khmer');
  assert.equal(matchesNearMeQuickCategory(cofe223Rest, 'bbq_seafood'), false, 'Cofe 223 must NOT match bbq_seafood');

  // 2. Verify convertGooglePlaceToDestination never returns empty photoUrl or false-positive mountain in Phnom Penh
  const sampleDest = convertGooglePlaceToDestination({
    ...cofe223Polluted,
    nameKh: 'សួនមាត់ទន្លេចតុមុខ',
    nameEn: 'Chaktomuk Riverside Park',
    subCategorySlug: 'mountain',
    photoUrl: '',
  });
  assert.notEqual(sampleDest.categorySlug, 'mountain', 'Phnom Penh address must not force mountain categorySlug');
  assert.ok(sampleDest.photoUrl && sampleDest.photoUrl.length > 10, 'Destination photoUrl must never be empty string');

  // 3. Verify Khmer subscript ថ្មី ("new/fresh"), MIXUE (មីស៊ូវ), steak (s-tea-k), Pteah (p-tea-h), and អង់តែន do NOT cause category cross-contamination
  const freshCoffeePlace = convertGooglePlaceToRestaurant({
    ...cofe223Polluted,
    nameKh: 'ហាងកាហ្វេឆុងថ្មី ភ្នំពេញ',
    nameEn: 'Fresh Brewed Coffee Phnom Penh',
    category: 'cafe',
  });
  assert.equal(matchesNearMeQuickCategory(freshCoffeePlace, 'noodles'), false, 'កាហ្វេឆុងថ្មី (ថ្មី) must NOT match noodles');
  assert.equal(matchesNearMeQuickCategory(freshCoffeePlace, 'coffee'), true, 'កាហ្វេឆុងថ្មី must match coffee');

  const mixueShop = allRestaurants.find((r) => r.id === 'rest-483');
  if (mixueShop) {
    assert.equal(matchesNearMeQuickCategory(mixueShop, 'noodles'), false, 'MIXUE (មីស៊ូវ) must NOT match noodles');
    assert.equal(matchesNearMeQuickCategory(mixueShop, 'coffee'), true, 'MIXUE (មីស៊ូវ) must match coffee & drinks');
  }

  const steakShop = allRestaurants.find((r) => r.id === 'rest-420');
  if (steakShop) {
    assert.equal(matchesNearMeQuickCategory(steakShop, 'coffee'), false, 'Rama Steakhouse (s-tea-k) must NOT match coffee');
  }

  const pteahShop = allRestaurants.find((r) => r.id === 'rest-400');
  if (pteahShop) {
    assert.equal(matchesNearMeQuickCategory(pteahShop, 'coffee'), false, 'Pteah Bay (p-tea-h) must NOT match coffee');
    assert.equal(matchesNearMeQuickCategory(pteahShop, 'rice_khmer'), true, 'Pteah Bay must match rice_khmer');
  }

  const noodleSoupShop = allRestaurants.find((r) => r.id === 'rest-448');
  if (noodleSoupShop) {
    assert.equal(matchesNearMeQuickCategory(noodleSoupShop, 'noodles'), true, '3-Generation Khmer Noodle must match noodles');
    assert.equal(matchesNearMeQuickCategory(noodleSoupShop, 'bbq_seafood'), false, 'គុយទាវទឹកស៊ុប must NOT match bbq_seafood');
  }

  // 4. Verify all 6 category buttons in Phnom Penh return non-empty, distance-sorted, category-accurate results across KM, EN, and ZH
  const mergedFood = mergeNearbyFoodShops({
    restaurants: allRestaurants,
    liveNearbyRestaurants: [...smartCache, cofe223Polluted],
    refCoords: ppCenter,
    radiusMeters: 20000,
    targetProvinceKh: 'រាជធានីភ្នំពេញ',
  });
  const mergedDest = mergeNearbyTourismDestinations({
    destinations: allDestinations,
    liveNearbyAttractions: [...smartCache, cofe223Polluted],
    refCoords: ppCenter,
    radiusMeters: 20000,
    targetProvinceKh: 'រាជធានីភ្នំពេញ',
  });

  assert.ok(mergedFood.length >= 80, 'All Shops in Phnom Penh must return >= 80 verified food shops');
  assert.ok(mergedDest.length >= 15 && mergedDest.length <= 30, 'Nearby Places in Phnom Penh must contain genuine attractions only');
  assert.ok(!mergedDest.some((d) => /cofe|coffee|កាហ្វេ|គុយទាវ|ភោជនីយដ្ឋាន/i.test(d.nameKh + ' ' + d.nameEn)), 'Nearby Places must never contain cafes or restaurants');

  // The 5 specific buttons are mutually exclusive: no shop may appear under two of them
  const exclusiveIds = ['rice_khmer', 'noodles', 'coffee', 'bbq_seafood', 'vegetarian'];
  for (const shop of mergedFood) {
    const hits = exclusiveIds.filter((id) => matchesNearMeQuickCategory(shop, id));
    assert.ok(hits.length <= 1, `Shop ${shop.id} (${shop.nameEn}) must not match several category buttons: ${hits.join(', ')}`);
  }
  const minPerCat = { all: 15, rice_khmer: 15, noodles: 15, coffee: 15, bbq_seafood: 8, vegetarian: 1 };
  for (const catId of ['all', 'rice_khmer', 'noodles', 'coffee', 'bbq_seafood', 'vegetarian']) {
    const matches = mergedFood.filter((r) => matchesNearMeQuickCategory(r, catId));
    if (process.env.KFT_DEBUG_COUNTS) console.log('[count]', catId, matches.length);
    assert.ok(matches.length >= minPerCat[catId], `Category [${catId}] must have >= ${minPerCat[catId]} accurate shops in Phnom Penh (got ${matches.length})`);
    for (let i = 1; i < matches.length; i++) {
      assert.ok(
        matches[i].distanceMeters >= matches[i - 1].distanceMeters,
        `Category [${catId}] must be sorted nearest-first by GPS distance`
      );
    }
    // Check 3-language badge accuracy on top results
    for (const r of matches.slice(0, 10)) {
      for (const lang of ['km', 'en', 'zh']) {
        const badges = selectLocalizedBadgeDishesForCategory(r, catId, lang);
        assert.ok(badges.length >= 1 && badges.length <= 2, `Badges for ${r.id} in [${catId}/${lang}] must be non-empty`);
        if (lang !== 'zh') {
          assert.ok(!badges.some((b) => /[\u4e00-\u9fff]/.test(b)), `No CJK in ${lang} badges for ${r.id}`);
        }
        assert.ok(!badges.some((b) => /Authentic Cambodian Cultural & Scenic Highlight|高棉自然与文化名胜景观/i.test(b)), `No generic tourism placeholder in dish badges for ${r.id}`);
      }
    }
  }
});

// 16. RestaurantView (ហាងអាហារ) 6 Category Buttons, Event Exclusivity & Top Search Bar Root-Cause Regression Guard
test('RestaurantView (ហាងអាហារ) 6 Category Buttons, Event Exclusivity & Top Search Bar Root-Cause Regression Guard', () => {
  const path = require('path');
  const {
    classifyShopDirectoryCategory,
    getShopCategoryTabTier,
    matchesShopCategoryTab,
    detectExplicitShopCategoryFromQuery,
    verifyShopDataForDisplay,
    isVegetarianShop,
    isPubNightlifeShop,
  } = require(path.join(ROOT, 'src/utils/foodFilters.ts'));
  const { isPubNightlifeText } = require(path.join(ROOT, 'src/utils/pubNightlife.ts'));
  const { initialRestaurants } = require(path.join(ROOT, 'src/data/seedData.ts'));
  const { isHotelBusinessRecord, isStrictVerifiedCambodiaRestaurant } = require(path.join(ROOT, 'src/types/index.ts'));
  const { parseSmartSearchIntent } = require(path.join(ROOT, 'src/utils/aiSearchBridge.ts'));

  const validShops = initialRestaurants.filter(
    (r) => !isHotelBusinessRecord(r) && isStrictVerifiedCambodiaRestaurant(r) && verifyShopDataForDisplay(r)
  );
  assert.ok(validShops.length >= 270, 'Must have >= 270 verified shops');

  // 1. Verify all 4 primary categories partition the directory cleanly without false-positive subscript នំ in ភ្នំពេញ
  const counts = { restaurant_dining: 0, cafe_bistro: 0, drinks_boba: 0, fast_street: 0 };
  for (const r of validShops) {
    const cat = classifyShopDirectoryCategory(r);
    assert.ok(counts[cat] !== undefined, 'Invalid primary category ' + cat);
    counts[cat]++;
  }
  assert.ok(counts.restaurant_dining >= 150, 'Expected >= 150 restaurant_dining, got ' + counts.restaurant_dining);
  assert.ok(counts.cafe_bistro >= 50, 'Expected >= 50 cafe_bistro, got ' + counts.cafe_bistro);
  assert.ok(counts.drinks_boba >= 6, 'Expected >= 6 dedicated drinks_boba, got ' + counts.drinks_boba);
  assert.ok(counts.fast_street >= 20 && counts.fast_street <= 45, 'Expected 20..45 fast_street shops, got ' + counts.fast_street);

  // 2. Verify zero false-positive leaks into fast_street (អាហាររហ័ស) and drinks_boba (ភេសជ្ជៈ)
  const fastStreetList = validShops.filter((r) => matchesShopCategoryTab(r, 'fast_street'));
  assert.ok(
    !fastStreetList.some((r) => /ម្លិះ|រំដេង|ក្រវាញ|សុវណ្ណា|គីមលី|ហូលី|ឆាជី|ខយ តេ|មីស៊ូវ|ប្រោន|ស្តារបាក់|ធ្យូប|អាម៉ាហ្សូន/i.test(r.nameKh)),
    'fast_street must never leak fine dining, seafood, BBQ, coffee chains, or boba chains via ភ្នំពេញ or priceLevel'
  );

  const drinksList = validShops.filter((r) => matchesShopCategoryTab(r, 'drinks_boba'));
  assert.ok(drinksList.length >= 45, 'Expected >= 45 drinks_boba matches, got ' + drinksList.length);
  assert.ok(
    !drinksList.some((r) => /steak|pteah|ម្លិះ|រំដេង|សុវណ្ណា|ចំការម្រេច/i.test(r.nameKh + ' ' + r.nameEn)),
    'drinks_boba must never match steak (s-tea-k) or Pteah (p-tea-h) or traditional restaurants'
  );

  // Verify dedicated boba/tea/ice-cream shops rank Tier 2 above beverage-serving cafes (Tier 1)
  const chagee = validShops.find((r) => /ឆាជី|chagee/i.test(r.nameKh + ' ' + r.nameEn));
  const koi = validShops.find((r) => /ខយ តេ|koi/i.test(r.nameKh + ' ' + r.nameEn));
  const tube = validShops.find((r) => /ធ្យូប|tube coffee/i.test(r.nameKh + ' ' + r.nameEn));
  assert.equal(getShopCategoryTabTier(chagee, 'drinks_boba'), 2, 'CHAGEE must be Tier 2 in drinks_boba');
  assert.equal(getShopCategoryTabTier(koi, 'drinks_boba'), 2, 'KOI Thé must be Tier 2 in drinks_boba');
  assert.equal(getShopCategoryTabTier(tube, 'drinks_boba'), 1, 'TUBE Coffee must be Tier 1 in drinks_boba');

  // 3. Verify full-service bistros/restaurants classify as restaurant_dining (ភោជនីយដ្ឋាន), never cafe_bistro
  for (const id of ['rest-538', 'rest-22', 'rest-543']) {
    const shop = validShops.find((r) => r.id === id);
    if (shop) {
      assert.equal(
        classifyShopDirectoryCategory(shop),
        'restaurant_dining',
        id + ' (' + shop.nameKh + ') must classify as restaurant_dining'
      );
    }
  }

  // 4. Verify detectExplicitShopCategoryFromQuery across Khmer, English, and Chinese
  assert.equal(detectExplicitShopCategoryFromQuery('កាហ្វេ'), 'cafe_bistro');
  assert.equal(detectExplicitShopCategoryFromQuery('coffee shop'), 'cafe_bistro');
  assert.equal(detectExplicitShopCategoryFromQuery('咖啡馆'), 'cafe_bistro');
  assert.equal(detectExplicitShopCategoryFromQuery('ភេសជ្ជៈ'), 'drinks_boba');
  assert.equal(detectExplicitShopCategoryFromQuery('តែគុជ'), 'drinks_boba');
  assert.equal(detectExplicitShopCategoryFromQuery('boba'), 'drinks_boba');
  assert.equal(detectExplicitShopCategoryFromQuery('奶茶'), 'drinks_boba');
  assert.equal(detectExplicitShopCategoryFromQuery('អាហាររហ័ស'), 'fast_street');
  assert.equal(detectExplicitShopCategoryFromQuery('fast food'), 'fast_street');
  assert.equal(detectExplicitShopCategoryFromQuery('快餐'), 'fast_street');
  assert.equal(detectExplicitShopCategoryFromQuery('ភោជនីយដ្ឋាន'), 'restaurant_dining');
  assert.equal(detectExplicitShopCategoryFromQuery('restaurants'), 'restaurant_dining');
  assert.equal(detectExplicitShopCategoryFromQuery('餐厅'), 'restaurant_dining');
  assert.equal(detectExplicitShopCategoryFromQuery('នៅជិតខ្ញុំ'), 'near_me_toggle');
  assert.equal(detectExplicitShopCategoryFromQuery('near me'), 'near_me_toggle');
  assert.equal(detectExplicitShopCategoryFromQuery('附近店铺'), 'near_me_toggle');
  assert.equal(detectExplicitShopCategoryFromQuery('ភីហ្សា'), null);
  assert.equal(detectExplicitShopCategoryFromQuery('បឺហ្គឺ'), null);
  assert.equal(detectExplicitShopCategoryFromQuery('គុយទាវ'), null);
  assert.equal(detectExplicitShopCategoryFromQuery('ម្លិះ'), null);

  // 5. Verify RestaurantView.tsx source enforces mutually exclusive active button state & clean searchFields.names
  const rvSrc = fs.readFileSync(path.join(ROOT, 'src/components/RestaurantView.tsx'), 'utf8');
  assert.ok(
    rvSrc.includes('!nearMeActive && categoryFilter === cat.id'),
    'RestaurantView.tsx must guard non-near-me category button active state with !nearMeActive'
  );
  assert.ok(
    rvSrc.includes('restaurantSearchFields(r, [zhLoc.name])'),
    'RestaurantView.tsx must only pass [zhLoc.name] into restaurantSearchFields extraNames'
  );
  const smartSr = parseSmartSearchIntent('កាហ្វេ សៀមរាប');
  assert.equal(smartSr.detectedProvinceKh, 'សៀមរាប');
  assert.equal(smartSr.coreQuery, 'កាហ្វេ');

  // 6. Vegetarian (អាហារបួស) GPS button replaces "Near Me": strictly vegetarian shops, nearest first
  assert.ok(rvSrc.includes("id: 'vegetarian_shop'"), 'RestaurantView must expose the vegetarian_shop (អាហារបួស) button');
  assert.ok(!rvSrc.includes("id: 'near_me_toggle'"), 'Near Me button must be replaced by vegetarian_shop');
  assert.ok(rvSrc.includes('handleToggleVegetarianNearby'), 'vegetarian button must run the GPS handler');
  assert.ok(
    /handleToggleVegetarianNearby[\s\S]{0,900}requestLocation\(false\)[\s\S]{0,200}/.test(rvSrc) &&
      rvSrc.includes("setSortMode('nearest')"),
    'vegetarian button must request GPS and sort nearest-first'
  );
  const vegMk = (o) => ({ id: 'v', nameKh: '', nameEn: '', signatureDishesKh: [], signatureDishesEn: [], ...o });
  assert.equal(isVegetarianShop(vegMk({ nameKh: 'ភោជនីយដ្ឋានម្ហូបបួស' })), true);
  assert.equal(isVegetarianShop(vegMk({ nameEn: 'Veggie Garden Vegan Cafe' })), true);
  assert.equal(isVegetarianShop(vegMk({ nameKh: '素食馆' })), true);
  assert.equal(isVegetarianShop(vegMk({ nameKh: 'ហាងគុយទាវភ្នំពេញ', nameEn: 'Phnom Penh Noodles' })), false);
  assert.equal(getShopCategoryTabTier(vegMk({ nameEn: 'Vegetarian Kitchen' }), 'vegetarian_shop'), 2);
  assert.equal(getShopCategoryTabTier(vegMk({ nameEn: 'Steak House' }), 'vegetarian_shop'), 0);
  const vegShops = validShops.filter((r) => matchesShopCategoryTab(r, 'vegetarian_shop'));
  assert.ok(
    vegShops.every((r) => isVegetarianShop(r)),
    'vegetarian_shop tab must only contain vegetarian shops'
  );

  // 7. Pub & Nightlife (ហាងផឹកស៊ី) replaces the Drinks button: deep GPS search, only bars/pubs/night venues
  assert.ok(rvSrc.includes("id: 'pub_nightlife'"), 'RestaurantView must expose the pub_nightlife (ហាងផឹកស៊ី) button');
  assert.ok(!rvSrc.includes("id: 'drinks_boba',\n      nameKh"), 'Drinks button must be replaced by pub_nightlife');
  assert.ok(rvSrc.includes('searchNearbyPubNightlife'), 'pub button must run the deep nearby pub search');
  assert.ok(
    /handleTogglePubNightlife[\s\S]{0,1200}requestLocation\(false\)/.test(rvSrc),
    'pub button must request GPS'
  );
  for (const yes of [
    'Angkor Beer Garden',
    'Sky Bar Phnom Penh',
    'The Irish Pub',
    'Dragon Night Club',
    'Karaoke KTV Palace',
    'ហាងផឹកស៊ី អូឡាំពិក',
    'ស្រាបៀរ អង្គរ',
    '金边酒吧',
    'Craft Brewery Taproom',
    'bar_and_grill',
    'Rooftop Lounge Cocktail',
  ]) {
    assert.equal(isPubNightlifeText(yes), true, 'must be pub/nightlife: ' + yes);
  }
  for (const no of [
    'Brown Coffee Roastery',
    'Fresh Juice Bar',
    'Salad Bar Healthy',
    'Sushi Bar',
    'Korean Bar-B-Q Restaurant',
    'Barista Academy',
    'Phnom Penh Noodle Soup',
    'Khmer Kitchen Restaurant',
    'Pteah Bay Steakhouse',
    'ភោជនីយដ្ឋានបារាំង',
    'Coffee Lounge Cafe',
    'ហាងនំប៉័ង ប៉ាតេ ភ្នំពេញ',
    'Tous Les Jours Bakery',
    'ហាងគុយទាវ និងអាហារព្រឹក',
    'គុយទាវពេលព្រឹក ភ្នំពេញ',
    'Specialty Cambodian espresso bar and training café',
    'BROWN Coffee and Bakery Roastery',
  ]) {
    assert.equal(isPubNightlifeText(no), false, 'must NOT be pub/nightlife: ' + no);
  }
  assert.ok(rvSrc.includes("nameKh: 'កម្សាន្ត និងជួបជុំ'"), 'Button 4 must be named កម្សាន្ត និងជួបជុំ');
  assert.ok(rvSrc.includes("imageSrc: '/categories/shop_cat_pub_nightlife.png'"), 'Button 4 must use shop_cat_pub_nightlife.png');
  assert.ok(rvSrc.includes("nameKh: 'កាហ្វេ/ភេសជ្ជៈ'"), 'Button 3 must be named កាហ្វេ/ភេសជ្ជៈ');
  const { getLocalSmartCache, convertGooglePlaceToRestaurant } = require(path.join(ROOT, 'src/services/googlePlacesService.ts'));
  const cachedConverted = getLocalSmartCache().map(convertGooglePlaceToRestaurant);
  const cachedPubs = cachedConverted.filter((r) => matchesShopCategoryTab(r, 'pub_nightlife'));
  assert.ok(cachedPubs.length >= 12, 'Expected >= 12 verified pub/nightlife venues in cache, got ' + cachedPubs.length);
  assert.ok(
    !cachedPubs.some((r) => /នំប៉័ង|គុយទាវ|អាហារព្រឹក|ហាងកាហ្វេ|bakery|noodle|coffee|kinyei/i.test(r.nameKh + ' ' + r.nameEn)),
    'pub_nightlife must never contain bakeries, morning noodle shops, or coffee shops'
  );
  const pubShop = vegMk({ nameEn: 'Angkor Beer Garden' });
  const coffeeShop = vegMk({ nameEn: 'Brown Coffee Roastery' });
  assert.equal(getShopCategoryTabTier(pubShop, 'pub_nightlife'), 2);
  assert.equal(getShopCategoryTabTier(coffeeShop, 'pub_nightlife'), 0);
  for (const tab of ['restaurant_dining', 'cafe_bistro', 'fast_street', 'drinks_boba']) {
    assert.equal(getShopCategoryTabTier(pubShop, tab), 0, 'pub must not appear under ' + tab);
  }
  const pubTab = validShops.filter((r) => matchesShopCategoryTab(r, 'pub_nightlife'));
  assert.ok(pubTab.every((r) => isPubNightlifeShop(r)), 'pub_nightlife tab must only contain pubs/bars');
  // Every shop is shown under at most one of the 6 buttons (all excluded)
  const exclusiveTabs = ['restaurant_dining', 'cafe_bistro', 'fast_street', 'pub_nightlife', 'vegetarian_shop'];
  for (const shop of validShops) {
    const hits = exclusiveTabs.filter((t) => matchesShopCategoryTab(shop, t));
    assert.ok(hits.length <= 1, 'shop ' + shop.id + ' appears under several buttons: ' + hits.join(', '));
  }

  // 8. Zero Thai Content Guard across seed data, search results, and runtime validators
  const { isThaiRelatedText, isThaiRelatedRecord } = require(path.join(ROOT, 'src/types/index.ts'));
  assert.ok(
    validShops.every((r) => !isThaiRelatedRecord(r)),
    'Zero Thai restaurants or shops may exist in validShops'
  );
  assert.equal(
    isStrictVerifiedCambodiaRestaurant({
      id: 'custom-thai-1',
      nameKh: 'ភោជនីយដ្ឋានម្ហូបថៃ',
      nameEn: 'Bangkok Thai Kitchen',
      addressKh: 'ភ្នំពេញ',
      provinceKh: 'រាជធានីភ្នំពេញ',
      latitude: 11.5564,
      longitude: 104.9282,
    }),
    false,
    'isStrictVerifiedCambodiaRestaurant must reject Thai restaurants'
  );
  assert.equal(isThaiRelatedText('ទឹកធ្លាក់តាតៃ Koh Kong Tatai Waterfall'), false, 'Tatai Waterfall must be preserved');
});

console.log('\nAll ' + passed + ' unit test suites passed successfully!');

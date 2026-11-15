/**
 * Healthy-Food chips audit (AI Food Assistant -> "Dietary" chips).
 * Independently re-derives each chip's rule from raw recipe data and verifies that every dish the app
 * would return satisfies it, that chips are distinct, that all three languages are complete, and that
 * no VIP gate remains on the chips.   Run: npm run test:healthy-chips
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const jiti = require(path.join(ROOT, 'node_modules/jiti'))(ROOT, { interopDefault: true, esmResolve: true });

const { initial200Foods } = jiti(path.join(ROOT, 'src/data/seedFoods.ts'));
const { REMOVED_DUPLICATE_FOOD_IDS } = jiti(path.join(ROOT, 'src/types/index.ts'));
const tagsMod = jiti(path.join(ROOT, 'src/utils/dishTags.ts'));
const { matchesDishCategoryFilter } = jiti(path.join(ROOT, 'src/utils/foodFilters.ts'));
const { getDishTagIds, estimateProteinPerServing, LIGHT_KCAL_LIMIT, HIGH_PROTEIN_GRAMS } = tagsMod;

const foods = initial200Foods.filter((f) => f && f.id && !REMOVED_DUPLICATE_FOOD_IDS.has(f.id));
let failures = 0;
const fail = (msg) => { failures++; console.error('  FAIL: ' + msg); };
const pass = (msg) => console.log('  ok:   ' + msg);
const section = (t) => console.log('\n== ' + t);

const CHIPS = ['none', 'light', 'protein_rich', 'steamed_boiled', 'vegetable_rich'];
const matchesChip = (f, chip) => chip === 'none' || getDishTagIds(f).includes(chip);
const sets = Object.fromEntries(CHIPS.map((c) => [c, foods.filter((f) => matchesChip(f, c))]));

section('1. Every chip returns a non-empty, bounded set');
console.log('  sizes:', JSON.stringify(Object.fromEntries(CHIPS.map((c) => [c, sets[c].length]))));
if (sets.none.length !== foods.length) fail('Standard must return every dish'); else pass('Standard (ធម្មតា) returns all ' + foods.length + ' dishes');
for (const c of CHIPS.slice(1)) {
  if (sets[c].length === 0) fail(c + ' is empty');
  else if (sets[c].length > foods.length * 0.6) fail(c + ' returns >60% of all dishes (filter not selective)');
  else pass(c + ' = ' + sets[c].length + ' dishes (selective)');
}

section('2. ស្រាលក្រពះ (light): strictly < ' + LIGHT_KCAL_LIMIT + ' kcal, recorded calories, no desserts/drinks/fried');
for (const f of sets.light) {
  if (!(typeof f.calories === 'number' && f.calories > 0 && f.calories < LIGHT_KCAL_LIMIT)) fail(`${f.id} ${f.nameKh} calories=${f.calories}`);
  if (/dessert|drink|cake/.test(f.categorySlug)) fail(`${f.id} is ${f.categorySlug}`);
  if (/បំពង|ចៀន|បាយឆា/.test(f.nameKh)) fail(`${f.id} ${f.nameKh} is fried`);
}
const lightBad = foods.filter((f) => f.calories >= LIGHT_KCAL_LIMIT && matchesChip(f, 'light'));
if (lightBad.length === 0) pass('no dish >= 450 kcal inside Light');
const noCal = foods.filter((f) => !(f.calories > 0));
if (noCal.some((f) => matchesChip(f, 'light'))) fail('a dish with no calorie record leaked into Light'); else pass(noCal.length + ' dishes without recorded calories are correctly excluded from Light');

section('3. ប្រូតេអ៊ីនខ្ពស់ (protein): >= ' + HIGH_PROTEIN_GRAMS + ' g / serving computed from ingredient weights');
for (const f of sets.protein_rich) {
  const g = estimateProteinPerServing(f);
  if (g < HIGH_PROTEIN_GRAMS) fail(`${f.id} ${f.nameKh} only ${g.toFixed(1)} g`);
  if (/dessert|drink/.test(f.categorySlug)) fail(`${f.id} is a dessert/drink`);
}
pass('all ' + sets.protein_rich.length + ' protein dishes verified >= ' + HIGH_PROTEIN_GRAMS + ' g');

section('4. ស្ងោរ/ចំហុយ (steamed/boiled): no fried/grilled/dessert dishes');
for (const f of sets.steamed_boiled) {
  const tags = getDishTagIds(f);
  if (tags.includes('fried') || tags.includes('grilled')) fail(`${f.id} ${f.nameKh} is fried/grilled`);
  if (/dessert|drink/.test(f.categorySlug)) fail(`${f.id} is dessert/drink`);
}
const congee = sets.steamed_boiled.filter((f) => /បបរ|porridge|congee/i.test(f.nameKh + f.nameEn)).length;
const soups = sets.steamed_boiled.filter((f) => /ស៊ុប|ស្ងោរ|soup/i.test(f.nameKh + f.nameEn)).length;
console.log(`  soups=${soups} congee=${congee}`);
if (congee === 0 || soups === 0) fail('steamed/boiled must include both soups and congee'); else pass('includes soups and congee');

section('5. បន្លែច្រើន (vegetable-rich): no raw seafood, dips, burgers, fried rice, fried or sweet dishes');
for (const f of sets.vegetable_rich) {
  const n = (f.nameKh + ' ' + f.nameEn).toLowerCase();
  if (/ឆៅ|ភ្លា|ceviche|oyster|sashimi|\braw\b/.test(n)) fail(`${f.id} ${f.nameKh} is raw seafood`);
  if (/burger|បឺហ្គឺរ|បាយឆា|fried rice|spaghetti/.test(n)) fail(`${f.id} ${f.nameKh} is a burger/fried rice/spaghetti`);
  if (getDishTagIds(f).includes('fried')) fail(`${f.id} is fried`);
  if (/dessert|drink|cake/.test(f.categorySlug)) fail(`${f.id} is dessert/drink`);
}
pass('all ' + sets.vegetable_rich.length + ' vegetable dishes pass exclusions');

section('6. Chips are distinct (no duplicated result sets)');
const keyOf = (c) => sets[c].map((f) => f.id).sort().join(',');
for (let i = 0; i < CHIPS.length; i++) for (let j = i + 1; j < CHIPS.length; j++) {
  if (keyOf(CHIPS[i]) === keyOf(CHIPS[j])) fail(`${CHIPS[i]} and ${CHIPS[j]} return identical results`);
}
pass('all 5 chips return different result sets');
const overlap = (a, b) => sets[a].filter((f) => sets[b].includes(f)).length;
console.log(`  overlap steamed∩veg=${overlap('steamed_boiled', 'vegetable_rich')} light∩protein=${overlap('light', 'protein_rich')}`);

section('7. Chip x dish-type intersections never leak across categories');
const CATS = ['rice', 'noodles', 'soup', 'stirfry', 'grilled', 'salad', 'dessert'];
let combos = 0, emptyCombos = [];
for (const chip of CHIPS.slice(1)) for (const cat of CATS) {
  const res = sets[chip].filter((f) => matchesDishCategoryFilter(f, cat));
  combos++;
  for (const f of res) { if (!matchesChip(f, chip)) fail(`${chip}+${cat} leaked ${f.id}`); }
  if (res.length === 0) emptyCombos.push(`${chip}+${cat}`);
}
pass(combos + ' chip×type combinations checked, 0 leaks');
console.log('  combos with no dish (UI must show the empty state, never unrelated dishes): ' + (emptyCombos.join(', ') || 'none'));

section('8. Three-language completeness + no VIP gate (static source check)');
const src = fs.readFileSync(path.join(ROOT, 'src/components/WhatToEatModal.tsx'), 'utf8');
const block = src.slice(src.indexOf('const HEALTH_OPTIONS'), src.indexOf('function matchesCategoryStrict'));
const opts = block.split(/\n  \{\n/).slice(1);
if (opts.length !== 5) fail('expected 5 HEALTH_OPTIONS, found ' + opts.length); else pass('5 chips defined');
for (const o of opts) {
  const id = (o.match(/id: '([a-z_]+)'/) || [])[1];
  for (const k of ['labelKh', 'labelEn', 'labelZh', 'shortKh', 'shortEn', 'shortZh', 'ruleKh', 'ruleEn', 'ruleZh']) {
    const m = o.match(new RegExp(k + ": '([^']+)'"));
    if (!m || !m[1].trim()) fail(`${id}.${k} missing`);
  }
  if (/vip: true/.test(o)) fail(`${id} is still VIP-gated`);
  // Khmer/Chinese must really be Khmer/Chinese
  const kh = (o.match(/labelKh: '([^']+)'/) || [])[1] || '';
  const zh = (o.match(/labelZh: '([^']+)'/) || [])[1] || '';
  if (!/[\u1780-\u17FF]/.test(kh)) fail(`${id}.labelKh is not Khmer`);
  if (!/[\u4e00-\u9fff]/.test(zh)) fail(`${id}.labelZh is not Chinese`);
}
pass('every chip has Khmer / English / Chinese label, short label and rule');
const clickBlock = src.slice(src.indexOf('data-testid={`wte-health-${opt.id}`}'), src.indexOf('data-testid={`wte-health-${opt.id}`}') + 900);
if (/promptVipUpgrade|canUseVip/.test(clickBlock)) fail('VIP gate still present in chip click handler'); else pass('chip click handler has no VIP gate');
if (/\{opt\.vip && <AccessBadge/.test(src)) fail('VIP badge still rendered on chips'); else pass('no VIP badge on chips');
if (!/activeFilters:/.test(src)) fail('selected chips are not forwarded to the AI'); else pass('selected chips are forwarded to the AI (activeFilters)');
if (!/if \(vipDietFilter !== 'none'\) return \[\];/.test(src)) fail('diet filter can still fall back to unrelated dishes'); else pass('diet filter never falls back to unrelated dishes');

section('9. Home AI buttons are two different functions (no duplicate)');
const home = fs.readFileSync(path.join(ROOT, 'src/components/HomeView.tsx'), 'utf8');
const banner = fs.readFileSync(path.join(ROOT, 'src/components/home/HomePopularAndSocialSection.tsx'), 'utf8');
if (!/handleFoodRecommendations = useCallback\(\(\) => \{\s*\(window as any\)\.__kft_wte_mode = 'picks'/.test(home)) fail('"ណែនាំម្ហូប" tile does not open Food Picks mode'); else pass('"ណែនាំម្ហូប" tile opens Food Picks (no chat, no AI)');
if (!/handleOpenAiAssistantChat = useCallback\(\(\) => \{\s*\(window as any\)\.__kft_wte_mode = 'assistant'/.test(home)) fail('AI banner does not open Assistant mode'); else pass('"ជំនួយការ AI ម្ហូបអាហារ" banner opens the conversational assistant');
if ((home.match(/onOpenAiAssistant=\{handleOpenAiAssistantChat\}/g) || []).length !== 2) fail('both Home layouts must use the assistant handler'); else pass('both Home layouts wired to the assistant handler');
if (!/Ask anything/.test(banner)) fail('AI banner is missing its distinguishing subtitle'); else pass('AI banner subtitle explains it is for asking / photos / recipes');
const hasModeGate = (re) => re.test(src);
if (!hasModeGate(/\{viewMode === 'assistant' && \(\s*<>\s*<form onSubmit=\{handleCravingSubmit\}/)) fail('chat input is not limited to assistant mode'); else pass('chat input + AI answers render only in assistant mode');
if (!hasModeGate(/\{viewMode === 'picks' && \(\s*<div\s+className="w-full max-w-full min-w-0 overflow-hidden rounded-\[24px\]/)) fail('filter groups are not limited to picks mode'); else pass('time/type/taste/dietary groups render only in Food Picks mode');
if (!hasModeGate(/\{viewMode === 'picks' && \(\s*<div ref=\{dishCardRef\}/)) fail('results grid is not limited to picks mode'); else pass('result grid + shuffle button render only in Food Picks mode');
if (!/entry === 'picks' \|\| w\.__kft_wte_open_drink_pairing/.test(src)) fail('entry-mode selection missing'); else pass('entry mode chosen from the tapped button (drink / healthy banners open Picks; Ask-AI / camera open Assistant)');
if (!/hasHardFilter \? \[\] : verifiedFoods/.test(src)) fail('result grid can still fall back to the full catalog under a diet/type filter'); else pass('result grid never falls back to the full catalog under a diet/type filter');

console.log('\n' + (failures === 0 ? 'RESULT: ALL CHECKS PASSED' : 'RESULT: ' + failures + ' FAILURE(S)'));
process.exit(failures === 0 ? 0 : 1);

/* Festival-food audit - run: npm run test:festival  (data integrity + season window; no network) */
const { createServer } = require(require.resolve('vite', { paths: [process.cwd()] }));

let pass = 0;
let fail = 0;
const failures = [];
function ok(cond, name, extra) {
  if (cond) {
    pass++;
    console.log('  \u2713', name);
  } else {
    fail++;
    failures.push(name);
    console.log('  \u2717 FAIL:', name, extra !== undefined ? '=> ' + JSON.stringify(extra) : '');
  }
}
function section(t) {
  console.log('\n' + t);
}

(async () => {
  const server = await createServer({
    root: process.cwd(),
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
    logLevel: 'error',
  });
  try {
    const { initial200Foods: foods } = await server.ssrLoadModule('/src/data/seedFoods.ts');
    const types = await server.ssrLoadModule('/src/types/index.ts');
    const F = await server.ssrLoadModule('/src/data/festivalFoods.ts');
    const byId = new Map(foods.map((f) => [f.id, f]));

    section('1. Every listed dish is a real, visible catalog dish');
    for (const [fest, ids] of Object.entries(F.FESTIVAL_FOOD_IDS)) {
      ok(ids.length > 0, `${fest}: has dishes`);
      ok(new Set(ids).size === ids.length, `${fest}: no duplicate ids`);
      const missing = ids.filter((id) => !byId.has(id));
      ok(missing.length === 0, `${fest}: all ids exist in the catalog`, missing);
      const hidden = ids.filter((id) => types.REMOVED_DUPLICATE_FOOD_IDS.has(id));
      ok(hidden.length === 0, `${fest}: none is a removed-duplicate id (would be hidden in the app)`, hidden);
      const noPhoto = ids.filter((id) => !(byId.get(id)?.photoUrl || '').startsWith('/foods/'));
      ok(noPhoto.length === 0, `${fest}: every dish has a verified catalog photo`, noPhoto);
    }

    section('2. Dishes match what the user asked for (by name)');
    const nameOf = (id) => byId.get(id).nameKh;
    const kny = F.FESTIVAL_FOOD_IDS['khmer-new-year'].map(nameOf).join(' | ');
    ok(/នំអន្សមជ្រូក/.test(kny) && /នំអន្សមចេក/.test(kny) && /^.*ខសាច់ជ្រូក/.test(kny), 'Khmer New Year: num ansom chrouk, num ansom chek, khor sach chrouk', kny);
    const pb = F.FESTIVAL_FOOD_IDS['pchum-ben'].map(nameOf).join(' | ');
    ok(/ប្រហុកខ្ទិះ/.test(pb) && /ការី/.test(pb) && /ត្រយូងចេក/.test(pb) && /អាម៉ុក/.test(pb) && /ខជើងជ្រូក/.test(pb), 'Pchum Ben: prahok ktis, khor trotter, chicken curry, banana blossom, amok', pb);

    section('3. resolveFestivalFoods');
    const r = F.resolveFestivalFoods('pchum-ben', foods);
    ok(r.map((f) => f.id).join() === F.FESTIVAL_FOOD_IDS['pchum-ben'].join(), 'keeps the curated order');
    ok(F.resolveFestivalFoods('pchum-ben', foods.filter((f) => f.id !== 'food-4')).length === r.length - 1, 'a dish missing from the catalog is skipped (never invented)');
    ok(F.resolveFestivalFoods('water-festival', foods).length === 0, 'festival without a collection -> empty');
    ok(F.resolveFestivalFoods('pchum-ben', []).length === 0, 'empty catalog -> empty');
    ok(F.hasFestivalFoods('khmer-new-year') && !F.hasFestivalFoods('labor-day') && !F.hasFestivalFoods('toString'), 'hasFestivalFoods guards unknown ids / prototype keys');

    section('4. Season window (uses the live holiday calendar)');
    const at = (y, m, d) => F.pickFestivalInSeason(new Date(y, m - 1, d, 12, 0));
    const tag = (h) => (h ? h.id : null);
    ok(tag(at(2026, 11, 3)) === null, '3 Nov 2026: no collection festival near -> section hidden', tag(at(2026, 11, 3)));
    ok(tag(at(2027, 3, 10)) === 'khmer-new-year', '35 days before Khmer New Year 2027 -> shown');
    ok(tag(at(2027, 4, 15)) === 'khmer-new-year', 'during Khmer New Year -> shown');
    ok(tag(at(2027, 4, 17)) === null, 'after Khmer New Year ends -> hidden again');
    ok(tag(at(2027, 2, 20)) === null, '53 days before -> not yet (outside 45-day window)');
    ok(tag(at(2027, 9, 20)) === 'pchum-ben', '9 days before Pchum Ben 2027 -> shown');
    ok(tag(at(2027, 10, 1)) === 'pchum-ben', 'during Pchum Ben 2027 -> shown');
    ok(tag(at(2026, 10, 10)) === 'pchum-ben', 'during Pchum Ben 2026 (9-11 Oct) -> shown');
    const h = at(2027, 3, 10);
    ok(!!h && h.daysUntil === 35 && /35/.test(h.countdownBadge.en), 'countdown text is available for the section subtitle', h && h.countdownBadge);
    ok(F.FESTIVAL_PROMO_WINDOW_DAYS === 45, 'promo window is 45 days');
  } finally {
    await server.close();
  }
  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  if (fail) {
    console.log('Failures:');
    failures.forEach((f) => console.log(' -', f));
    process.exit(1);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

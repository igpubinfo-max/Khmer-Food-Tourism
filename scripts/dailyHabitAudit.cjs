/* Daily-habit audit - run: npm run test:habit  (loads TS through Vite SSR; no network, no real storage) */
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

// Minimal in-memory localStorage so the storage code paths are exercised for real.
const mem = new Map();
global.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => void mem.set(k, String(v)),
  removeItem: (k) => void mem.delete(k),
  clear: () => mem.clear(),
};

(async () => {
  const server = await createServer({
    root: process.cwd(),
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
    logLevel: 'error',
  });
  try {
    const { initial200Foods: foods } = await server.ssrLoadModule('/src/data/seedFoods.ts');
    const h = await server.ssrLoadModule('/src/utils/dailyHabit.ts');
    const p = await server.ssrLoadModule('/src/utils/foodPassport.ts');

    section('1. Day keys');
    ok(/^\d{4}-\d{2}-\d{2}$/.test(h.toLocalDayKey(new Date(2026, 10, 3))), 'local day key format');
    ok(h.toLocalDayKey(new Date(2026, 10, 3, 23, 59)) === '2026-11-03', 'uses the user\'s local calendar day');
    ok(h.dayDiff('2026-10-31', '2026-11-01') === 1, 'month boundary = 1 day');
    ok(h.dayDiff('2026-12-31', '2027-01-01') === 1, 'year boundary = 1 day');
    ok(h.dayDiff('2026-03-01', '2026-03-01') === 0, 'same day = 0');
    ok(h.dayDiff('2026-11-05', '2026-11-03') === -2, 'clock backwards is negative');

    section('2. Streak transitions (pure)');
    const a = h.computeNextStreak(null, '2026-11-01');
    ok(a.state.current === 1 && a.isNewDay && a.milestone === null, 'first visit starts at 1');
    const same = h.computeNextStreak(a.state, '2026-11-01');
    ok(same.isNewDay === false && same.state.current === 1, 'same day is idempotent');
    const b = h.computeNextStreak(a.state, '2026-11-02');
    ok(b.state.current === 2 && b.state.totalDays === 2, 'next day increments');
    const c = h.computeNextStreak(b.state, '2026-11-03');
    ok(c.state.current === 3 && c.milestone === 3, 'milestone 3 fires once on the day it is reached');
    const gap = h.computeNextStreak(c.state, '2026-11-06');
    ok(gap.state.current === 1 && gap.state.longest === 3, 'missed days reset but keep the best record');
    ok(gap.milestone === null, 'no milestone after a reset');
    const back = h.computeNextStreak(c.state, '2026-11-01');
    ok(back.isNewDay === false && back.state.current === 3, 'clock moved backwards never destroys progress');
    let s = null;
    let fired = [];
    for (let d = 1; d <= 31; d++) {
      const r = h.computeNextStreak(s, `2026-12-${String(d).padStart(2, '0')}`);
      s = r.state;
      if (r.milestone) fired.push(r.milestone);
    }
    ok(JSON.stringify(fired) === JSON.stringify([3, 7, 14, 30]), 'milestones 3/7/14/30 across a month', fired);

    section('3. Streak storage');
    mem.clear();
    const t1 = h.touchDailyStreak(new Date(2026, 10, 1, 9));
    ok(t1.state.current === 1 && h.getDailyStreak().current === 1, 'first touch persisted');
    h.touchDailyStreak(new Date(2026, 10, 1, 21));
    ok(h.getDailyStreak().totalDays === 1, 'second touch same day does not double count');
    const t2 = h.touchDailyStreak(new Date(2026, 10, 2, 8));
    ok(t2.state.current === 2 && h.getDailyStreak().current === 2, 'next day persisted');
    mem.set(h.DAILY_STREAK_KEY, '{not json');
    ok(h.getDailyStreak() === null, 'corrupt storage is ignored, not thrown');
    ok(h.touchDailyStreak(new Date(2026, 10, 3)).state.current === 1, 'recovers cleanly from corrupt storage');
    const otherKeys = [...mem.keys()].filter((k) => k !== h.DAILY_STREAK_KEY);
    ok(otherKeys.length === 0, 'touches only its own storage key', otherKeys);

    section("4. Dish of the Day");
    const d1 = h.pickDishOfTheDay(foods, '2026-11-03');
    ok(!!d1 && !!d1.nameKh && !!d1.photoUrl, 'returns a real dish with a photo');
    const shuffled = [...foods].reverse();
    ok(h.pickDishOfTheDay(shuffled, '2026-11-03').id === d1.id, 'same dish regardless of catalog order');
    ok(h.pickDishOfTheDay(foods, '2026-11-03').id === d1.id, 'stable within the same day');
    const seen = new Set();
    for (let d = 1; d <= 30; d++) seen.add(h.pickDishOfTheDay(foods, `2026-11-${String(d).padStart(2, '0')}`).id);
    ok(seen.size >= 20, 'rotates (>=20 different dishes in 30 days)', seen.size);
    ok(h.pickDishOfTheDay([], '2026-11-03') === null, 'empty catalog -> null');
    const withGenerated = [{ ...foods[0], id: 'ai-dish-x', photoUrl: '/foods/x.jpg' }, { ...foods[1], photoUrl: '' }];
    ok(h.pickDishOfTheDay(withGenerated, '2026-11-03') === null, 'AI-generated / photo-less dishes are never chosen');

    section('5. Next goal');
    const stampsOf = (ids) => ids.map((foodId) => ({ foodId, stampedAt: '2026-11-01T00:00:00.000Z' }));
    const g0 = h.getNextGoal(foods, []);
    ok(g0.kind === 'level' && g0.remaining === 5, 'new user: first goal is the first level (5 dishes)', g0);
    const soups = foods.filter((f) => f.categorySlug === 'soup').map((f) => f.id);
    const g2 = h.getNextGoal(foods, stampsOf(soups.slice(0, 2)));
    ok(g2.kind === 'badge' && g2.badge.id === 'cat-soup' && g2.remaining === 1, '2 of 3 soups -> soup badge is 1 away', g2);
    const g3 = h.getNextGoal(foods, stampsOf(foods.map((f) => f.id)));
    ok(g3.kind === 'complete', 'everything tasted -> complete');
    const lvl = p.getPassportLevel(5);
    ok(lvl.level.min === 5, 'sanity: 5 dishes = level 2');

    section('6. Share text');
    for (const lang of ['km', 'en', 'zh']) {
      const t = h.buildPassportShareText(lang, { count: 12, total: 171, levelTitle: 'X', streak: 7 });
      ok(t.includes('12') && t.includes('171') && t.includes('7'), `share text (${lang}) carries progress + streak`);
    }
    const noStreak = h.buildPassportShareText('en', { count: 1, total: 10, levelTitle: 'X', streak: 1 });
    ok(!noStreak.includes('streak'), 'no streak line on day 1');
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

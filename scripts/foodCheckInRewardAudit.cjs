/* Food check-in reward audit - run: npm run test:reward  (pure logic + storage via Vite SSR; no network) */
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
    const R = await server.ssrLoadModule('/src/utils/foodCheckInReward.ts');
    const T = await server.ssrLoadModule('/src/types/index.ts');
    const ids = foods.map((f) => f.id);
    const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0);

    section('1. Program constants (as agreed)');
    ok(R.FOOD_CHECKIN_REWARD_TARGET === 30 && R.FOOD_CHECKIN_REWARD_VIP_DAYS === 30 && R.FOOD_CHECKIN_DAILY_CAP === 3, '30 distinct dishes -> 30 VIP days, max 3 counted per day');

    section('2. Counting rules');
    let l = R.emptyLedger();
    let r = R.applyCheckIn(l, ids[0], at(2026, 11, 3));
    ok(r.outcome.kind === 'counted' && r.outcome.progress === 1 && r.outcome.todayCount === 1, 'first dish counts (1/30, today 1/3)');
    l = r.ledger;
    r = R.applyCheckIn(l, ids[0], at(2026, 11, 3));
    ok(r.outcome.kind === 'duplicate' && R.ledgerProgress(r.ledger) === 1, 'the same dish again never adds progress (un-stamp / re-stamp is harmless)');
    r = R.applyCheckIn(l, ids[0], at(2026, 11, 20));
    ok(r.outcome.kind === 'duplicate', '...even weeks later (each dish counts once per account, ever)');
    l = R.applyCheckIn(l, ids[1], at(2026, 11, 3)).ledger;
    r = R.applyCheckIn(l, ids[2], at(2026, 11, 3));
    ok(r.outcome.kind === 'counted' && r.outcome.todayCount === 3, 'third dish of the day still counts (3/3)');
    l = r.ledger;
    r = R.applyCheckIn(l, ids[3], at(2026, 11, 3, 23));
    ok(r.outcome.kind === 'daily_cap' && R.ledgerProgress(r.ledger) === 3, '4th new dish the same day is NOT counted (daily cap)');
    r = R.applyCheckIn(l, ids[3], at(2026, 11, 4, 0));
    ok(r.outcome.kind === 'counted' && r.outcome.todayCount === 1, 'after midnight the cap resets and the dish counts');
    ok(R.applyCheckIn(R.emptyLedger(), ids[5], at(2026, 12, 31, 23)).ledger.entries[0].day === '2026-12-31', 'day key is the local calendar day');

    section('3. Reaching 30 (needs >= 10 days)');
    l = R.emptyLedger();
    let reachedOn = null;
    let kinds = [];
    outer: for (let d = 0; d < 20; d++) {
      for (let k = 0; k < 4; k++) {
        const dish = ids[(d * 4 + k) % ids.length];
        const res = R.applyCheckIn(l, dish, new Date(2026, 10, 1 + d, 9 + k));
        l = res.ledger;
        kinds.push(res.outcome.kind);
        if (res.outcome.kind === 'reached') {
          reachedOn = { day: d + 1, dishInDay: k + 1 };
          break outer;
        }
      }
    }
    ok(reachedOn && reachedOn.day === 10 && reachedOn.dishInDay === 3, 'trying 4 dishes a day reaches 30 exactly on day 10 (3 per day counted)', reachedOn);
    ok(R.ledgerProgress(l) === 30, 'progress is exactly 30');
    ok(kinds.filter((k) => k === 'reached').length === 1, '"reached" fired exactly once');
    const again = R.applyCheckIn(l, ids[100], at(2026, 12, 1));
    ok(again.outcome.kind === 'reached' && R.ledgerProgress(again.ledger) === 30, 'if the grant did not finish, the next stamp asks for it again (no extra progress)');
    const granted = { ...l, grantedAt: '2026-11-10T10:00:00.000Z' };
    const afterGrant = R.applyCheckIn(granted, ids[101], at(2026, 12, 2));
    ok(afterGrant.outcome.kind === 'already_granted' && afterGrant.ledger.grantedAt === granted.grantedAt, 'once granted: never counts or asks again (no duplicate reward)');
    ok(R.applyCheckIn({ entries: [], grantedAt: '2026-01-01T00:00:00.000Z' }, ids[0], at(2026, 1, 2)).outcome.kind === 'already_granted', 'grantedAt wins even with an empty ledger');

    section('4. Sanitising stored data');
    const bad = R.sanitizeLedger({ entries: [{ foodId: 'a', day: '2026-11-01' }, { foodId: 'a', day: '2026-11-02' }, { foodId: 5 }, null, { foodId: 'b', day: 7 }, { foodId: 'c', day: '2026-11-03', at: 'x' }], grantedAt: 42 });
    ok(bad.entries.length === 2 && bad.entries.map((e) => e.foodId).join() === 'a,c' && bad.grantedAt === undefined, 'duplicates / malformed entries dropped, bad grantedAt ignored');
    const many = R.sanitizeLedger({ entries: Array.from({ length: 50 }, (_, i) => ({ foodId: 'f' + i, day: '2026-11-01' })) });
    ok(many.entries.length === 30, 'a tampered ledger can never hold more than 30 dishes');
    ok(R.sanitizeLedger('garbage').entries.length === 0, 'garbage -> empty ledger');

    section('5. Per-account storage');
    mem.clear();
    R.saveLedgerForUser('user-A', { entries: [{ foodId: 'x1', day: '2026-11-01', at: '' }] });
    R.saveLedgerForUser('user-B', { entries: [{ foodId: 'y1', day: '2026-11-01', at: '' }, { foodId: 'y2', day: '2026-11-01', at: '' }] });
    ok(R.ledgerProgress(R.loadLedgerForUser('user-A')) === 1 && R.ledgerProgress(R.loadLedgerForUser('user-B')) === 2, 'each account has its own progress');
    ok(R.ledgerProgress(R.loadLedgerForUser('user-C')) === 0, 'a new account starts at 0 (no inherited progress)');
    R.saveLedgerForUser('legacy-1', { entries: [{ foodId: 'x1', day: '2026-11-01', at: '' }, { foodId: 'x9', day: '2026-11-02', at: '' }] });
    ok(R.ledgerProgress(R.loadLedgerForUser('user-A', ['legacy-1'])) === 2, 'legacy ids are merged (a changed canonical id does not lose progress, no double counting)');
    R.markLedgerGranted('user-A', []);
    const g1 = R.loadLedgerForUser('user-A').grantedAt;
    R.markLedgerGranted('user-A', [], '2099-01-01T00:00:00.000Z');
    ok(!!g1 && R.loadLedgerForUser('user-A').grantedAt === g1, 'markLedgerGranted is idempotent (keeps the first grant time)');
    ok(!R.loadLedgerForUser('user-B').grantedAt, 'granting one account never affects another');
    mem.set(R.FOOD_CHECKIN_LEDGER_KEY, '{oops');
    ok(R.ledgerProgress(R.loadLedgerForUser('user-A')) === 0, 'corrupt storage -> empty ledger, no crash');

    section('6. Stamp hand-off');
    R.setFoodCheckInHandler(null);
    ok(R.reportFoodStamped('food-1').kind === 'ineligible', 'no handler (guest / admin shell) -> ineligible');
    R.setFoodCheckInHandler(() => {
      throw new Error('boom');
    });
    ok(R.reportFoodStamped('food-1').kind === 'ineligible', 'a failing handler can never break the stamp button');
    R.setFoodCheckInHandler((id) => ({ kind: 'counted', progress: 4, todayCount: 1, id }));
    ok(R.reportFoodStamped('food-1').kind === 'counted', 'handler result is returned synchronously');
    R.setFoodCheckInHandler(null);

    section('7. VIP window (never shortens paid VIP)');
    const NOW = new Date(2026, 10, 3, 12, 0, 0);
    const DAY = 86400000;
    const base = { id: 'u1', name: 'U', email: 'u@x.com', role: 'user', avatar: '', createdAt: '2026-01-01' };
    const free = R.computeRewardVipWindow(base, NOW);
    ok(!free.wasVipActive && free.durationDays === 30, 'free user: a fresh 30-day plan');
    ok(Math.round((Date.parse(free.expiryDate) - NOW.getTime()) / DAY) === 30, 'free user: VIP ends 30 days from now');
    const expired = R.computeRewardVipWindow({ ...base, membershipTier: 'premium_vip', subscriptionStatus: 'expired', subscriptionExpiryDate: new Date(NOW.getTime() - 5 * DAY).toISOString() }, NOW);
    ok(!expired.wasVipActive && Math.round((Date.parse(expired.expiryDate) - NOW.getTime()) / DAY) === 30, 'expired VIP: 30 days from now');
    const activeExp = new Date(NOW.getTime() + 10 * DAY).toISOString();
    const activeStart = new Date(NOW.getTime() - 20 * DAY).toISOString();
    const activeUser = { ...base, membershipTier: 'premium_vip', subscriptionStatus: 'active', vipStatus: 'active', subscriptionStartDate: activeStart, subscriptionExpiryDate: activeExp, vipPlanDays: 30, vipPlanType: 'quarterly' };
    ok(T.isUserVipActive(activeUser), 'sanity: the sample member is an active VIP');
    const stacked = R.computeRewardVipWindow(activeUser, NOW);
    ok(stacked.wasVipActive && Date.parse(stacked.expiryDate) === Date.parse(activeExp) + 30 * DAY, 'active VIP (10 days left): reward is ADDED -> 40 days left');
    ok(stacked.startDate === activeStart && stacked.durationDays === 30, 'active VIP keeps the original start date and plan length');
    const annualExp = new Date(NOW.getTime() + 300 * DAY).toISOString();
    const annual = R.computeRewardVipWindow({ ...activeUser, subscriptionExpiryDate: annualExp, vipPlanDays: 365, vipPlanType: 'annual' }, NOW);
    ok(Date.parse(annual.expiryDate) > Date.parse(annualExp), 'annual VIP (300 days left): never shortened, extended by 30 days');
    ok([free, expired, stacked, annual].every((w) => Date.parse(w.expiryDate) > NOW.getTime()), 'every outcome ends in the future');
    const custom = R.computeRewardVipWindow(base, NOW, 7);
    ok(Math.round((Date.parse(custom.expiryDate) - NOW.getTime()) / DAY) === 7, 'reward length is a parameter');
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

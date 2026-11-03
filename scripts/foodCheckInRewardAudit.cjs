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
    // Helper creating a UTC date corresponding to Cambodia time (UTC+7)
    const khmerDate = (y, m, d, h = 12) => new Date(Date.UTC(y, m - 1, d, h - 7, 0, 0));

    section('1. Program constants (3 strict anti-cheat rules)');
    ok(
      R.FOOD_CHECKIN_REWARD_TARGET === 30 &&
        R.FOOD_CHECKIN_REWARD_VIP_DAYS === 30 &&
        R.FOOD_CHECKIN_DAILY_CAP === 1,
      '30 distinct dishes -> 30 VIP days, max 1 counted per server day (requires 30 distinct server days)'
    );

    section('2. Rule 1: Authoritative Internet Server Time (no device clock trust)');
    R.setVerifiedServerClock(null);
    ok(R.getVerifiedServerNowMs() === null, 'before server sync, getVerifiedServerNowMs() is null (never trusts device new Date())');
    const unverifiedRes = R.applyCheckIn(R.emptyLedger(), ids[0], null);
    ok(
      unverifiedRes.outcome.kind === 'unverified_time' && R.ledgerProgress(unverifiedRes.ledger) === 0,
      'applyCheckIn with null serverNow returns unverified_time and does not count progress'
    );
    const traceTs = R.parseServerTimeResponse('fl=12f\nts=1762149600.123\nip=1.2.3.4', null);
    ok(traceTs === 1762149600123, 'parses Cloudflare /cdn-cgi/trace ts= epoch seconds accurately');
    const headerTs = R.parseServerTimeResponse('', 'Tue, 03 Nov 2026 06:00:00 GMT');
    ok(headerTs === Date.UTC(2026, 10, 3, 6, 0, 0), 'parses HTTP Date header accurately');
    R.setVerifiedServerClock(khmerDate(2026, 11, 3, 23).getTime());
    const verifiedNow = R.getVerifiedServerNowMs();
    ok(verifiedNow !== null && R.toServerDayKey(verifiedNow) === '2026-11-03', 'verified server clock resolves Cambodia (UTC+7) calendar day');

    section('3. Rule 2: Max 1 check-in per server day & distinct dishes only');
    let l = R.emptyLedger();
    let r = R.applyCheckIn(l, ids[0], khmerDate(2026, 11, 3, 9));
    ok(r.outcome.kind === 'counted' && r.outcome.progress === 1 && r.outcome.todayCount === 1, 'first dish of the server day counts (1/30, today 1/1)');
    l = r.ledger;
    r = R.applyCheckIn(l, ids[0], khmerDate(2026, 11, 3, 10));
    ok(r.outcome.kind === 'duplicate' && R.ledgerProgress(r.ledger) === 1, 'same dish again never adds progress (un-stamp / re-stamp is harmless)');
    r = R.applyCheckIn(l, ids[0], khmerDate(2026, 11, 20, 10));
    ok(r.outcome.kind === 'duplicate', '...even weeks later (each dish counts once per account, ever)');
    r = R.applyCheckIn(l, ids[1], khmerDate(2026, 11, 3, 18));
    ok(r.outcome.kind === 'daily_cap' && R.ledgerProgress(r.ledger) === 1, '2nd new dish on the same server day is blocked by daily_cap (max 1 per server day)');
    r = R.applyCheckIn(l, ids[1], khmerDate(2026, 11, 4, 8));
    ok(r.outcome.kind === 'counted' && r.outcome.progress === 2 && r.outcome.todayCount === 1, 'on the next server day (UTC+7), the new dish counts (2/30)');

    section('4. Reaching 30 requires 30 distinct server days');
    l = R.emptyLedger();
    let reachedOn = null;
    let kinds = [];
    outer: for (let d = 0; d < 35; d++) {
      for (let k = 0; k < 3; k++) {
        const dish = ids[(d * 3 + k) % ids.length];
        const res = R.applyCheckIn(l, dish, khmerDate(2026, 11, 1 + d, 9 + k));
        l = res.ledger;
        kinds.push(res.outcome.kind);
        if (res.outcome.kind === 'reached') {
          reachedOn = { day: d + 1, dishInDay: k + 1 };
          break outer;
        }
      }
    }
    ok(
      reachedOn && reachedOn.day === 30 && reachedOn.dishInDay === 1,
      'trying 3 dishes a day reaches 30 strictly on server day 30 (1 per server day counted)',
      reachedOn
    );
    ok(R.ledgerProgress(l) === 30, 'progress is exactly 30');
    ok(kinds.filter((k) => k === 'reached').length === 1, '"reached" fired exactly once');
    const again = R.applyCheckIn(l, ids[100], khmerDate(2026, 12, 15));
    ok(again.outcome.kind === 'reached' && R.ledgerProgress(again.ledger) === 30, 'if the grant did not finish, the next stamp asks for it again (no extra progress)');
    const granted = { ...l, grantedAt: '2026-11-30T10:00:00.000Z' };
    const afterGrant = R.applyCheckIn(granted, ids[101], khmerDate(2026, 12, 16));
    ok(afterGrant.outcome.kind === 'already_granted' && afterGrant.ledger.grantedAt === granted.grantedAt, 'once granted: never counts or asks again (no duplicate reward)');
    ok(R.applyCheckIn({ entries: [], grantedAt: '2026-01-01T00:00:00.000Z' }, ids[0], khmerDate(2026, 1, 2)).outcome.kind === 'already_granted', 'grantedAt wins even with an empty ledger');

    section('5. Sanitising stored data (enforces 1 dish per server day & max 30)');
    const bad = R.sanitizeLedger({
      entries: [
        { foodId: 'a', day: '2026-11-01' },
        { foodId: 'a', day: '2026-11-02' },
        { foodId: 'b', day: '2026-11-01' }, // same day as 'a' -> dropped by 1/day rule
        { foodId: 5 },
        null,
        { foodId: 'c', day: 7 },
        { foodId: 'd', day: '2026-11-03', at: 'x' },
      ],
      grantedAt: 42,
    });
    ok(
      bad.entries.length === 2 && bad.entries.map((e) => e.foodId).join() === 'a,d' && bad.grantedAt === undefined,
      'duplicate dishes, same-day extra dishes, and malformed entries dropped'
    );
    const many = R.sanitizeLedger({
      entries: Array.from({ length: 50 }, (_, i) => ({
        foodId: 'f' + i,
        day: `2026-${String(Math.floor(i / 28) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      })),
    });
    ok(many.entries.length === 30, 'a tampered ledger can never hold more than 30 dishes across distinct days');
    ok(R.sanitizeLedger('garbage').entries.length === 0, 'garbage -> empty ledger');

    section('6. Per-account storage & Rule 3: One-Time Reward Lock by User ID + Email');
    mem.clear();
    R.saveLedgerForUser('user-A', { entries: [{ foodId: 'x1', day: '2026-11-01', at: '' }] });
    R.saveLedgerForUser('user-B', { entries: [{ foodId: 'y1', day: '2026-11-01', at: '' }, { foodId: 'y2', day: '2026-11-02', at: '' }] });
    ok(R.ledgerProgress(R.loadLedgerForUser('user-A')) === 1 && R.ledgerProgress(R.loadLedgerForUser('user-B')) === 2, 'each account has its own progress');
    ok(R.ledgerProgress(R.loadLedgerForUser('user-C')) === 0, 'a new account starts at 0 (no inherited progress)');
    R.saveLedgerForUser('legacy-1', { entries: [{ foodId: 'x1', day: '2026-11-01', at: '' }, { foodId: 'x9', day: '2026-11-02', at: '' }] });
    ok(R.ledgerProgress(R.loadLedgerForUser('user-A', ['legacy-1'])) === 2, 'legacy ids are merged across distinct days');

    ok(!R.hasClaimedFoodCheckInReward({ userId: 'user-A', email: 'Sokha@Example.com', legacyIds: ['legacy-1'] }), 'initially user-A has not claimed the one-time reward');
    const claimReg = R.recordFoodCheckInRewardClaim(
      { userId: 'user-A', email: 'Sokha@Example.com', legacyIds: ['legacy-1'] },
      '2026-11-30T10:00:00.000Z'
    );
    ok(Boolean(claimReg.byUserId['user-A'] && claimReg.byEmail['sokha@example.com']), 'claim registry records both userId and normalized lowercase email');
    ok(R.hasClaimedFoodCheckInReward({ userId: 'user-A' }), 'locked by userId');
    ok(R.hasClaimedFoodCheckInReward({ userId: 'legacy-1' }), 'locked by legacyId');
    ok(R.hasClaimedFoodCheckInReward({ userId: 'brand-new-id', email: 'SOKHA@example.com' }), 'locked by email even if user re-registers with a new userId');
    ok(!R.hasClaimedFoodCheckInReward({ userId: 'user-B', email: 'other@example.com' }), 'other user is not affected');

    section('7. Stamp hand-off');
    R.setFoodCheckInHandler(null);
    ok(R.reportFoodStamped('food-1').kind === 'ineligible', 'no handler (guest / admin shell) -> ineligible');
    R.setFoodCheckInHandler(() => {
      throw new Error('boom');
    });
    ok(R.reportFoodStamped('food-1').kind === 'ineligible', 'a failing handler can never break the stamp button');
    R.setFoodCheckInHandler((id) => ({ kind: 'counted', progress: 4, todayCount: 1, id }));
    ok(R.reportFoodStamped('food-1').kind === 'counted', 'handler result is returned synchronously');
    R.setFoodCheckInHandler(null);

    section('8. VIP window (never shortens paid VIP)');
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

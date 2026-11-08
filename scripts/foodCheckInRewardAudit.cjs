/**
 * Regression audit: verifies the retired "30-dish check-in -> Free 30-Day VIP" reward
 * has been completely removed and CANNOT grant VIP, while Meal Reminders & Daily Streak remain intact.
 * Run with: npm run test:reward
 */
const fs = require('fs');
const path = require('path');
const { createServer } = require('vite');

const ROOT = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
const failures = [];

function ok(cond, name, detail) {
  if (cond) {
    pass++;
    console.log('  ✓', name);
  } else {
    fail++;
    failures.push(name + (detail !== undefined ? ' -> ' + JSON.stringify(detail) : ''));
    console.log('  ✗', name, detail !== undefined ? detail : '');
  }
}

(async () => {
  console.log('\n— 1. Retired check-in reward files & hooks are absent —');
  ok(!fs.existsSync(path.join(ROOT, 'src/utils/foodCheckInReward.ts')), 'src/utils/foodCheckInReward.ts is deleted');
  ok(!fs.existsSync(path.join(ROOT, 'src/components/FoodCheckInRewardBootstrap.tsx')), 'src/components/FoodCheckInRewardBootstrap.tsx is deleted');

  const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
  ok(!appSrc.includes('FoodCheckInRewardBootstrap'), 'App.tsx does not mount FoodCheckInRewardBootstrap');
  ok(appSrc.includes('MealReminderBootstrap'), 'App.tsx still mounts MealReminderBootstrap');

  const cardSrc = fs.readFileSync(path.join(ROOT, 'src/components/home/DailyHabitCard.tsx'), 'utf8');
  ok(!cardSrc.includes('foodCheckInReward') && !cardSrc.includes('grantFoodCheckInReward'), 'DailyHabitCard.tsx has zero check-in VIP reward logic');
  ok(cardSrc.includes('touchDailyStreak') && cardSrc.includes('MealReminderPanel'), 'DailyHabitCard.tsx preserves touchDailyStreak and MealReminderPanel');

  const stampSrc = fs.readFileSync(path.join(ROOT, 'src/components/PassportStampButton.tsx'), 'utf8');
  ok(!stampSrc.includes('foodCheckInReward') && !stampSrc.includes('reportFoodStamped'), 'PassportStampButton.tsx stamps food passport without check-in VIP reward');

  const guardSrc = fs.readFileSync(path.join(ROOT, 'src/utils/securityIntegrityGuard.ts'), 'utf8');
  ok(!guardSrc.includes('trialsByUserId') && !guardSrc.includes('REWARD-FOODCHECKIN30-'), 'securityIntegrityGuard.ts cannot resurrect VIP from localStorage check-in claims');

  console.log('\n— 2. Runtime entitlement guards reject retired check-in reward markers —');
  const server = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const T = await server.ssrLoadModule('/src/types/index.ts');
    const nowIso = new Date().toISOString();
    const futureIso = new Date(Date.now() + 25 * 86400000).toISOString();

    const forgedRewardUser = {
      id: 'u-reward-test',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      avatar: '',
      createdAt: nowIso,
      foodCheckInRewardAt: nowIso,
    };
    ok(T.isUserVipActive(forgedRewardUser) === false, 'foodCheckInRewardAt alone never activates VIP');

    const forgedRewardTxnUser = {
      ...forgedRewardUser,
      membershipTier: 'premium_vip',
      subscriptionStatus: 'active',
      paymentStatus: 'verified',
      subscriptionExpiryDate: futureIso,
      transactionRef: 'REWARD-FOODCHECKIN30-u-reward-test',
    };
    ok(T.isUserVipActive(forgedRewardTxnUser) === false, 'REWARD-FOODCHECKIN30 transactionRef is rejected by isUserVipActive');

    const sanitized = T.sanitizeUserVipPlanAndExpiry(forgedRewardTxnUser);
    ok(sanitized.membershipTier === 'free' && T.isUserVipActive(sanitized) === false, 'sanitizeUserVipPlanAndExpiry strips retired REWARD-FOODCHECKIN VIP status');
  } finally {
    await server.close();
  }

  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  if (fail > 0) {
    console.error('Failures:', failures);
    process.exit(1);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

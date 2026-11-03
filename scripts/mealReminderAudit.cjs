/* Meal-reminder plan audit - run: npm run test:reminders  (pure logic via Vite SSR; no device, no network) */
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
    const P = await server.ssrLoadModule('/src/utils/mealReminderPlan.ts');
    const H = await server.ssrLoadModule('/src/utils/cambodianMealHabits.ts');

    const on = (over = {}) => ({
      enabled: true,
      slots: {
        breakfast: { on: true, time: '07:00' },
        lunch: { on: true, time: '11:30' },
        snack: { on: false, time: '15:30' },
        dinner: { on: true, time: '17:30' },
      },
      ...over,
    });
    const NOW = new Date(2026, 10, 3, 10, 0, 0); // 3 Nov 2026, 10:00 local

    section('1. Settings sanitising');
    ok(P.sanitizeReminderSettings(null).enabled === false, 'null -> disabled defaults');
    ok(P.sanitizeReminderSettings('x').slots.lunch.time === '11:30', 'garbage -> default times');
    const bad = P.sanitizeReminderSettings({ enabled: true, slots: { lunch: { on: true, time: '25:99' }, dinner: { on: 'yes', time: '18:05' } } });
    ok(bad.slots.lunch.time === '11:30', 'invalid time falls back to that slot default');
    ok(bad.slots.dinner.on === true && bad.slots.dinner.time === '18:05', 'valid time kept, non-boolean flag -> default');
    ok(P.sanitizeReminderSettings({ enabled: 'true' }).enabled === false, 'enabled must be literally true');
    ok(P.isValidReminderTime('07:00') && !P.isValidReminderTime('7:00') && !P.isValidReminderTime('24:00'), 'time validator');
    ok(P.DEFAULT_REMINDER_SETTINGS.slots.snack.on === false, 'snack is opt-in (fewer interruptions by default)');

    section('2. Plan window');
    const plan = P.planMealReminders({ settings: on(), foods, language: 'km', now: NOW });
    // today: breakfast 07:00 already past -> skipped; lunch + dinner kept (2). Then 6 more days x 3 = 18.
    ok(plan.length === 20, '20 reminders (today 2 + 6 days x 3)', plan.length);
    ok(plan.every((p) => p.at.getTime() > NOW.getTime()), 'every reminder is in the future');
    ok(!plan.some((p) => p.slot === 'breakfast' && p.at.getDate() === 3), "today's past breakfast is skipped");
    ok(new Set(plan.map((p) => p.id)).size === plan.length, 'ids are unique');
    ok(plan.every((p) => p.id >= P.REMINDER_ID_BASE && P.isReminderId(p.id)), 'ids stay inside the owned range');
    ok(P.isReminderId(P.REMINDER_ID_BASE) && !P.isReminderId(P.REMINDER_ID_BASE + 1000) && !P.isReminderId(5), 'isReminderId boundaries');
    const maxAt = Math.max(...plan.map((p) => p.at.getTime()));
    ok(maxAt < new Date(2026, 10, 10, 23, 59).getTime(), 'window is 7 days');
    const plan2 = P.planMealReminders({ settings: on(), foods, language: 'km', now: NOW });
    ok(JSON.stringify(plan.map((p) => [p.id, p.at.getTime(), p.foodId])) === JSON.stringify(plan2.map((p) => [p.id, p.at.getTime(), p.foodId])), 'deterministic for the same inputs');
    const almostDue = P.planMealReminders({ settings: on(), foods, language: 'km', now: new Date(2026, 10, 3, 11, 29, 30) });
    ok(!almostDue.some((p) => p.slot === 'lunch' && p.at.getDate() === 3), 'a reminder due within a minute is skipped, never fired instantly');

    section('3. Switches');
    ok(P.planMealReminders({ settings: on({ enabled: false }), foods, language: 'km', now: NOW }).length === 0, 'master switch off -> nothing');
    const noMeals = on({ slots: { breakfast: { on: false, time: '07:00' }, lunch: { on: false, time: '11:30' }, snack: { on: false, time: '15:30' }, dinner: { on: false, time: '17:30' } } });
    ok(P.planMealReminders({ settings: noMeals, foods, language: 'km', now: NOW }).length === 0, 'all meals off -> nothing');
    const withSnack = on();
    withSnack.slots.snack.on = true;
    const planSnack = P.planMealReminders({ settings: withSnack, foods, language: 'en', now: NOW });
    ok(planSnack.some((p) => p.slot === 'snack'), 'snack can be enabled');
    ok(P.planMealReminders({ settings: on(), foods: [], language: 'km', now: NOW }).length === 0, 'empty catalog -> nothing (no crash)');
    const custom = on();
    custom.slots.lunch.time = '12:15';
    ok(P.planMealReminders({ settings: custom, foods, language: 'km', now: NOW }).filter((p) => p.slot === 'lunch').every((p) => p.at.getHours() === 12 && p.at.getMinutes() === 15), 'custom time is honoured');

    section('4. Dish quality (authentic Khmer eating habits)');
    const byId = new Map(foods.map((f) => [f.id, f]));
    const allScore = planSnack.every((p) => H.scoreCambodianDishForMealTime(byId.get(p.foodId), p.slot) > 0);
    ok(allScore, 'every suggested dish suits its meal (score > 0 in the Khmer meal-time classifier)');
    ok(plan.filter((p) => p.slot === 'breakfast').every((p) => H.scoreCambodianDishForMealTime(byId.get(p.foodId), 'breakfast') >= 85), 'breakfast = real breakfast dishes only');
    ok(plan.every((p) => !p.foodId.startsWith('ai-dish-') && !p.foodId.startsWith('custom-recipe-')), 'never an AI-generated dish');
    const perDay = new Map();
    for (const p of planSnack) {
      const k = `${p.at.getFullYear()}-${p.at.getMonth()}-${p.at.getDate()}`;
      if (!perDay.has(k)) perDay.set(k, []);
      perDay.get(k).push(p.foodId);
    }
    ok([...perDay.values()].every((ids) => new Set(ids).size === ids.length), 'no dish repeated within a day');
    let consecutiveRepeat = false;
    for (const slot of ['breakfast', 'lunch', 'dinner']) {
      const ids = plan.filter((p) => p.slot === slot).map((p) => p.foodId);
      for (let i = 1; i < ids.length; i++) if (ids[i] === ids[i - 1]) consecutiveRepeat = true;
    }
    ok(!consecutiveRepeat, 'same meal never gets the same dish two days in a row');
    ok(new Set(plan.filter((p) => p.slot === 'dinner').map((p) => p.foodId)).size >= 5, 'dinner dishes vary across the week');

    section('5. Text per language');
    const kmP = P.planMealReminders({ settings: on(), foods, language: 'km', now: NOW })[0];
    const enP = P.planMealReminders({ settings: on(), foods, language: 'en', now: NOW })[0];
    const zhP = P.planMealReminders({ settings: on(), foods, language: 'zh', now: NOW })[0];
    ok(/[\u1780-\u17FF]/.test(kmP.title) && /[\u1780-\u17FF]/.test(kmP.body), 'km title/body contain Khmer script');
    ok(/^[\x00-\x7F\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]+$/u.test(enP.title), 'en title is English (+ emoji)');
    ok(/[\u4E00-\u9FFF]/.test(zhP.title) && /[\u4E00-\u9FFF]/.test(zhP.body), 'zh title/body contain Chinese');
    ok(plan.every((p) => p.title.length > 3 && p.title.length <= 60 && p.body.length > 10 && p.body.length <= 200), 'title/body lengths are notification friendly');
    ok(['breakfast', 'lunch', 'snack', 'dinner'].every((s) => P.reminderTitle(s, 'km') && P.reminderTitle(s, 'en') && P.reminderTitle(s, 'zh')), 'all slot titles exist in 3 languages');

    section('6. Calendar edge cases');
    const eve = P.planMealReminders({ settings: on(), foods, language: 'km', now: new Date(2026, 10, 30, 23, 50) });
    ok(eve[0].at.getMonth() === 11 && eve[0].at.getDate() === 1, 'month rollover: after 23:50 on 30 Nov the next reminder is 1 Dec');
    const ny = P.planMealReminders({ settings: on(), foods, language: 'en', now: new Date(2026, 11, 31, 20, 0) });
    ok(ny[0].at.getFullYear() === 2027 && ny[0].at.getMonth() === 0 && ny[0].at.getDate() === 1, 'year rollover works');
    ok(P.planMealReminders({ settings: on(), foods, language: 'km', now: NOW, windowDays: 99 }).length <= 14 * 3, 'window is capped at 14 days');
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

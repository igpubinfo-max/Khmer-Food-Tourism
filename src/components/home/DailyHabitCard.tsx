import React, { useEffect, useMemo, useState } from 'react';
import { Award, Share2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { organizeAndDeduplicateFoods, isAdminAccount, type FoodItem } from '../../types';
import { tr } from '../../utils/i18n';
import { getLocalizedFood } from '../../utils/zhDynamicTranslator';
import { useFoodPassport, getPassportLevel, levelTitle, badgeTitle } from '../../utils/foodPassport';
import {
  touchDailyStreak,
  getDailyStreak,
  pickDishOfTheDay,
  getNextGoal,
  toLocalDayKey,
  buildPassportShareText,
  type StreakState,
} from '../../utils/dailyHabit';
import { shareText } from '../../utils/shareApp';
import {
  FOOD_CHECKIN_REWARD_TARGET,
  FOOD_CHECKIN_REWARD_VIP_DAYS,
  FOOD_CHECKIN_DAILY_CAP,
  useFoodCheckInProgress,
} from '../../utils/foodCheckInReward';
import { PassportStampButton } from '../PassportStampButton';
import { MealReminderPanel } from './MealReminderPanel';
import { FALLBACK_IMG, resolveHomePhoto, headingFont } from './homeUtils';

interface Props {
  onOpenFood: (food: FoodItem) => void;
}

const MILESTONE_MESSAGES = (lang: Parameters<typeof tr>[0], n: number) =>
  tr(
    lang,
    `អស្ចារ្យណាស់! អ្នកបានចូលប្រើកម្មវិធីជាប់ៗគ្នា ${n} ថ្ងៃហើយ`,
    `Amazing! You've kept a ${n}-day streak`,
    `太棒了！你已连续打卡 ${n} 天`
  );

/**
 * Home "daily habit" card — three small reasons to come back every day:
 *  1. a visit streak,
 *  2. a shared Dish of the Day (one tap to stamp it in the Food Passport),
 *  3. the closest reward to unlock (almost-finished badge or next level).
 * Laid out compactly so the six feature buttons below stay on the first screen.
 */
const DailyHabitCardInner: React.FC<Props> = ({ onOpenFood }) => {
  const { language, foods, showToast, currentUser, setIsAuthModalOpen } = useApp();
  const { stamps, count } = useFoodPassport();
  const [streak, setStreak] = useState<StreakState | null>(() => getDailyStreak());
  const reward = useFoodCheckInProgress(
    currentUser?.id,
    currentUser?.legacyIds || [],
    currentUser?.foodCheckInRewardAt,
    currentUser?.email
  );
  const isGuest = !currentUser;
  // Admins never take part; everyone else sees the VIP reward as their headline goal until it has been granted.
  const rewardActive = !isAdminAccount(currentUser) && !reward.granted;

  // Record today's visit once per mount (idempotent per calendar day) and celebrate milestones.
  useEffect(() => {
    const update = touchDailyStreak();
    setStreak(update.state);
    if (update.isNewDay && update.milestone) {
      showToast(MILESTONE_MESSAGES(language, update.milestone), 'success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allFoods = useMemo(() => organizeAndDeduplicateFoods(foods), [foods]);
  const dayKey = toLocalDayKey();
  const dish = useMemo(() => pickDishOfTheDay(allFoods, dayKey), [allFoods, dayKey]);
  const goal = useMemo(() => getNextGoal(allFoods, stamps), [allFoods, stamps]);
  const { level } = getPassportLevel(count);

  if (!dish) return null;
  const loc = getLocalizedFood(dish, language);
  const total = allFoods.length;
  const current = streak?.current ?? 1;
  const longest = streak?.longest ?? 1;

  const goalText = (() => {
    if (rewardActive) {
      if (isGuest) {
        return tr(
          language,
          `ចូលគណនី ហើយភ្លក់ម្ហូប ${FOOD_CHECKIN_REWARD_TARGET} ដង (១ ដង/ថ្ងៃ) ដើម្បីទទួលបាន VIP ${FOOD_CHECKIN_REWARD_VIP_DAYS} ថ្ងៃ`,
          `Sign in and try ${FOOD_CHECKIN_REWARD_TARGET} dishes (1 per day) to earn ${FOOD_CHECKIN_REWARD_VIP_DAYS} days of VIP`,
          `登录并品尝 ${FOOD_CHECKIN_REWARD_TARGET} 道菜（每天 1 次），即可获得 ${FOOD_CHECKIN_REWARD_VIP_DAYS} 天 VIP`
        );
      }
      const capReached = reward.todayCount >= reward.dailyCap;
      return tr(
        language,
        `រង្វាន់ VIP ${FOOD_CHECKIN_REWARD_VIP_DAYS} ថ្ងៃ៖ ភ្លក់ ${reward.progress}/${reward.target} ដង • ${capReached ? 'ថ្ងៃនេះបានរាប់រួចហើយ' : `ថ្ងៃនេះ ${reward.todayCount}/${reward.dailyCap}`}`,
        `${FOOD_CHECKIN_REWARD_VIP_DAYS}-day VIP reward: ${reward.progress}/${reward.target} dishes • ${capReached ? 'today recorded' : `today ${reward.todayCount}/${reward.dailyCap}`}`,
        `${FOOD_CHECKIN_REWARD_VIP_DAYS} 天 VIP 奖励：${reward.progress}/${reward.target} 次 • ${capReached ? '今日已计' : `今日 ${reward.todayCount}/${reward.dailyCap}`}`
      );
    }
    if (goal.kind === 'badge') {
      const name = badgeTitle(goal.badge, language);
      return tr(
        language,
        `នៅសល់ ${goal.remaining} មុខទៀត ដើម្បីទទួលបាន ${name}`,
        `${goal.remaining} more dish${goal.remaining > 1 ? 'es' : ''} to earn ${name}`,
        `再品尝 ${goal.remaining} 道菜即可获得 ${name}`
      );
    }
    if (goal.kind === 'level') {
      return tr(
        language,
        `នៅសល់ ${goal.remaining} មុខទៀត ដើម្បីឡើងជា ${levelTitle(goal.next, language)}`,
        `${goal.remaining} more dish${goal.remaining > 1 ? 'es' : ''} to reach ${levelTitle(goal.next, language)}`,
        `再品尝 ${goal.remaining} 道菜即可成为 ${levelTitle(goal.next, language)}`
      );
    }
    return tr(language, 'អ្នកបានឈានដល់កម្រិតខ្ពស់បំផុត', 'You reached the top level', '你已达到最高等级');
  })();

  const goalPct = rewardActive
    ? Math.round((reward.progress / reward.target) * 100)
    : goal.kind === 'badge'
      ? Math.round((goal.badge.have / goal.badge.total) * 100)
      : goal.kind === 'level'
        ? Math.round((count / goal.next.min) * 100)
        : 100;

  // Tapping the goal explains the reward rules (signed in) or opens sign-in (guest).
  const onGoalTap = () => {
    if (!rewardActive) return;
    if (isGuest) {
      setIsAuthModalOpen(true);
      return;
    }
    showToast(
      tr(
        language,
        `ភ្លក់ម្ហូបខុសៗគ្នា ${FOOD_CHECKIN_REWARD_TARGET} ដង (រាប់ ${FOOD_CHECKIN_DAILY_CAP} ដង/ថ្ងៃ តាមម៉ោង Server ពិតប្រាកដ) ដើម្បីទទួលបាន VIP ${FOOD_CHECKIN_REWARD_VIP_DAYS} ថ្ងៃ — ផ្តល់ជូនតែ ១ ដងគត់ក្នុង ១ គណនី`,
        `Try ${FOOD_CHECKIN_REWARD_TARGET} different dishes (${FOOD_CHECKIN_DAILY_CAP} count per server day) to earn ${FOOD_CHECKIN_REWARD_VIP_DAYS} days of VIP — one time per account`,
        `品尝 ${FOOD_CHECKIN_REWARD_TARGET} 道不同的菜（按服务器时间每天计 ${FOOD_CHECKIN_DAILY_CAP} 次）即可获得 ${FOOD_CHECKIN_REWARD_VIP_DAYS} 天 VIP — 每个账号仅限一次`
      ),
      'info'
    );
  };

  const onShare = () => {
    const text = buildPassportShareText(language, {
      count,
      total,
      levelTitle: levelTitle(level, language),
      streak: current,
    });
    void shareText(
      language,
      tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨风味与旅游'),
      text,
      showToast
    );
  };

  return (
    <section
      data-testid="daily-habit-card"
      className="rounded-2xl bg-white dark:bg-slate-800 border border-emerald-500/40 shadow-xs p-2 space-y-1.5 font-khmer"
    >
      {/* Streak + level + share */}
      <div className="flex items-center gap-2">
        <span
          className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-slate-700 border border-emerald-200/80 dark:border-slate-600 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <Award className="w-5 h-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white leading-snug truncate">
            {tr(language, `${current} ថ្ងៃជាប់ៗគ្នា`, `${current}-day streak`, `连续 ${current} 天`)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug truncate">
            {current < longest
              ? tr(language, `កំណត់ត្រាល្អបំផុត ${longest} ថ្ងៃ`, `Best: ${longest} days`, `最佳纪录 ${longest} 天`)
              : tr(language, 'ត្រឡប់មកវិញរាល់ថ្ងៃ ដើម្បីបន្តរក្សា!', 'Come back tomorrow to keep it going!', '明天再来，继续保持！')}
          </p>
        </div>
        <div className="text-right shrink-0 max-w-[40%]">
          <p className="text-[12px] font-bold text-emerald-800 dark:text-emerald-300 leading-snug truncate">
            {levelTitle(level, language)}
          </p>
          <p className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 leading-snug">
            {count} / {total}
          </p>
        </div>
        <button
          type="button"
          onClick={onShare}
          title={tr(language, 'ចែករំលែកកំណត់ត្រារបស់ខ្ញុំ', 'Share my progress', '分享我的进度')}
          aria-label={tr(language, 'ចែករំលែកកំណត់ត្រារបស់ខ្ញុំ', 'Share my progress', '分享我的进度')}
          className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center active:scale-95 transition cursor-pointer shrink-0"
        >
          <Share2 className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Dish of the Day: photo | name | stamp */}
      <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 p-1.5">
        <button
          type="button"
          onClick={() => onOpenFood(dish)}
          className="shrink-0 rounded-lg overflow-hidden active:scale-95 transition cursor-pointer"
          aria-label={loc.name}
        >
          <img
            src={resolveHomePhoto(dish.photoUrl, dish.photoUpdatedAt)}
            alt={loc.name}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_IMG;
            }}
            className="w-14 h-14 object-cover bg-slate-200 dark:bg-slate-700"
          />
        </button>
        <button type="button" onClick={() => onOpenFood(dish)} className="min-w-0 flex-1 text-left cursor-pointer">
          <span className="block text-[10px] font-extrabold uppercase tracking-wide text-amber-600 dark:text-amber-300 leading-snug">
            {tr(language, 'ម្ហូបប្រចាំថ្ងៃនេះ', "Today's Dish", '今日美食')}
          </span>
          <span className={`${headingFont(language)} text-[14px] leading-snug text-[#064E3B] dark:text-emerald-100 line-clamp-2`}>
            {loc.name}
          </span>
        </button>
        <PassportStampButton foodId={dish.id} language={language} showToast={showToast} variant="inline" />
      </div>

      {/* Next goal (the VIP reward until it has been earned) */}
      <div
        data-testid="habit-goal"
        role={rewardActive ? 'button' : undefined}
        tabIndex={rewardActive ? 0 : undefined}
        onClick={rewardActive ? onGoalTap : undefined}
        className={rewardActive ? 'cursor-pointer' : undefined}
      >
        <p className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 leading-snug truncate">{goalText}</p>
        <div
          className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.min(100, goalPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-emerald-600 transition-all"
            style={{ width: `${Math.min(100, goalPct)}%` }}
          />
        </div>
      </div>

      {/* Opt-in meal-time reminders (native app only) */}
      <MealReminderPanel />
    </section>
  );
};

export const DailyHabitCard = React.memo(DailyHabitCardInner);

import React, { useEffect, useMemo } from 'react';
import { Award } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { organizeAndDeduplicateFoods, isAdminAccount, type FoodItem } from '../../types';
import { tr } from '../../utils/i18n';
import { useFoodPassport, levelTitle, badgeTitle } from '../../utils/foodPassport';
import {
  touchDailyStreak,
  getNextGoal,
} from '../../utils/dailyHabit';
import {
  FOOD_CHECKIN_REWARD_TARGET,
  FOOD_CHECKIN_DAILY_CAP,
  useFoodCheckInProgress,
} from '../../utils/foodCheckInReward';
import { MealReminderPanel } from './MealReminderPanel';

interface Props {
  onOpenFood?: (food: FoodItem) => void;
}

const MILESTONE_MESSAGES = (lang: Parameters<typeof tr>[0], n: number) =>
  tr(
    lang,
    `អស្ចារ្យណាស់! អ្នកបានចូលប្រើកម្មវិធីជាប់ៗគ្នា ${n} ថ្ងៃហើយ`,
    `Amazing! You've kept a ${n}-day streak`,
    `太棒了！你已连续打卡 ${n} 天`
  );

/**
 * Compact Home bar:
 *  1. 1-line "រង្វាន់ Free VIP ៣០ថ្ងៃ៖ 0/30" progress bar,
 *  2. 1-line regular meal-time reminder toggle.
 * Keeps the Home screen clean and uncluttered so all 6 feature buttons fit on the first screen.
 */
const DailyHabitCardInner: React.FC<Props> = () => {
  const { language, foods, showToast, currentUser, setIsAuthModalOpen } = useApp();
  const { stamps, count } = useFoodPassport();
  const reward = useFoodCheckInProgress(
    currentUser?.id,
    currentUser?.legacyIds || [],
    currentUser?.foodCheckInRewardAt,
    currentUser?.email
  );
  const isGuest = !currentUser;
  const rewardActive = !isAdminAccount(currentUser) && !reward.granted;

  // Silently record today's visit once per mount (idempotent per calendar day).
  useEffect(() => {
    const update = touchDailyStreak();
    if (update.isNewDay && update.milestone) {
      showToast(MILESTONE_MESSAGES(language, update.milestone), 'success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allFoods = useMemo(() => organizeAndDeduplicateFoods(foods), [foods]);
  const goal = useMemo(() => getNextGoal(allFoods, stamps), [allFoods, stamps]);

  const rewardLabel = tr(
    language,
    'រង្វាន់ Free VIP ៣០ថ្ងៃ',
    'Free 30-Day VIP',
    '30 天免费 VIP'
  );

  const goalText = (() => {
    if (rewardActive) {
      if (isGuest) {
        return tr(
          language,
          `៖ 0/${FOOD_CHECKIN_REWARD_TARGET} (ចូលគណនី)`,
          `: 0/${FOOD_CHECKIN_REWARD_TARGET} (Sign in)`,
          `：0/${FOOD_CHECKIN_REWARD_TARGET}（请登录）`
        );
      }
      const capReached = reward.todayCount >= reward.dailyCap;
      return tr(
        language,
        `៖ ${reward.progress}/${reward.target} ដង${capReached ? ' • ថ្ងៃនេះរួចរាល់' : ''}`,
        `: ${reward.progress}/${reward.target}${capReached ? ' • today done' : ''}`,
        `：${reward.progress}/${reward.target}${capReached ? ' • 今日已计' : ''}`
      );
    }
    if (goal.kind === 'badge') {
      const name = badgeTitle(goal.badge, language);
      return tr(
        language,
        `នៅសល់ ${goal.remaining} មុខទៀត → ${name}`,
        `${goal.remaining} more → ${name}`,
        `再尝 ${goal.remaining} 道 → ${name}`
      );
    }
    if (goal.kind === 'level') {
      return tr(
        language,
        `នៅសល់ ${goal.remaining} មុខទៀត → ${levelTitle(goal.next, language)}`,
        `${goal.remaining} more → ${levelTitle(goal.next, language)}`,
        `再尝 ${goal.remaining} 道 → ${levelTitle(goal.next, language)}`
      );
    }
    return tr(language, 'អ្នកបានឈានដល់កម្រិតខ្ពស់បំផុត', 'Top level reached', '已达最高等级');
  })();

  const goalPct = rewardActive
    ? Math.round((reward.progress / reward.target) * 100)
    : goal.kind === 'badge'
      ? Math.round((goal.badge.have / goal.badge.total) * 100)
      : goal.kind === 'level'
        ? Math.round((count / goal.next.min) * 100)
        : 100;

  const onGoalTap = () => {
    if (!rewardActive) return;
    if (isGuest) {
      setIsAuthModalOpen(true);
      return;
    }
    showToast(
      tr(
        language,
        `ភ្លក់ម្ហូបខុសៗគ្នា ${FOOD_CHECKIN_REWARD_TARGET} ដង (រាប់ ${FOOD_CHECKIN_DAILY_CAP} ដង/ថ្ងៃ តាមម៉ោង Server ពិតប្រាកដ) ដើម្បីទទួលបាន រង្វាន់ Free VIP ៣០ថ្ងៃ — ផ្តល់ជូនតែ ១ ដងគត់ក្នុង ១ គណនី`,
        `Try ${FOOD_CHECKIN_REWARD_TARGET} different dishes (${FOOD_CHECKIN_DAILY_CAP} count per server day) to earn Free 30-Day VIP Reward — one time per account`,
        `品尝 ${FOOD_CHECKIN_REWARD_TARGET} 道不同的菜（按服务器时间每天计 ${FOOD_CHECKIN_DAILY_CAP} 次）即可获得 30 天免费 VIP 奖励 — 每个账号仅限一次`
      ),
      'info'
    );
  };

  return (
    <section
      data-testid="daily-habit-card"
      className="rounded-2xl bg-white dark:bg-slate-800 border border-emerald-500/40 shadow-xs px-2.5 py-1.5 space-y-1.5 font-khmer"
    >
      {/* Compact 1-line VIP reward progress bar */}
      <div
        data-testid="habit-goal"
        role={rewardActive ? 'button' : undefined}
        tabIndex={rewardActive ? 0 : undefined}
        onClick={rewardActive ? onGoalTap : undefined}
        className={`flex items-center gap-2 ${rewardActive ? 'cursor-pointer' : ''}`}
      >
        <Award className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" strokeWidth={1.75} />
        <p className="min-w-0 flex-1 text-[12px] font-bold text-slate-700 dark:text-slate-200 leading-snug truncate">
          {rewardActive ? (
            <>
              <span className="text-orange-500 dark:text-orange-400 font-extrabold">{rewardLabel}</span>
              <span>{goalText}</span>
            </>
          ) : (
            goalText
          )}
        </p>
        <div
          className="w-16 sm:w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0"
          role="progressbar"
          aria-valuenow={Math.min(100, goalPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-orange-500 transition-all"
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

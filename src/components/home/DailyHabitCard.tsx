import React, { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isAdminAccount, type FoodItem } from '../../types';
import { tr } from '../../utils/i18n';
import { touchDailyStreak } from '../../utils/dailyHabit';
import {
  FOOD_CHECKIN_REWARD_TARGET,
  FOOD_CHECKIN_REWARD_VIP_DAYS,
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
 *  1. 1-line "រង្វាន់ Free VIP ៣០ថ្ងៃ" status & progress bar:
 *     - Active Trial / VIP: displays server-calculated remaining days (`សល់ X/30 ថ្ងៃ • ផុតកំណត់ YYYY-MM-DD`), never resetting to 0/30 on app updates.
 *     - Expired Trial: displays `សល់ 0/30 ថ្ងៃ (បានប្រើរួចហើយ)` and blocks duplicate free trials on the same account.
 *     - Eligible (not yet activated): allows 1-time Free 30-Day VIP Trial activation or check-in progress.
 *  2. 1-line regular meal-time reminder toggle.
 */
const DailyHabitCardInner: React.FC<Props> = () => {
  const {
    language,
    showToast,
    currentUser,
    setIsAuthModalOpen,
    setIsUpgradeVipModalOpen,
    grantFoodCheckInReward,
  } = useApp();
  const [isActivating, setIsActivating] = useState(false);

  const reward = useFoodCheckInProgress(
    currentUser?.id,
    currentUser?.legacyIds || [],
    currentUser?.foodCheckInRewardAt,
    currentUser?.email,
    currentUser
  );
  const isGuest = !currentUser;
  const isAdmin = isAdminAccount(currentUser);

  // Silently record today's visit once per mount (idempotent per calendar day).
  useEffect(() => {
    const update = touchDailyStreak();
    if (update.isNewDay && update.milestone) {
      showToast(MILESTONE_MESSAGES(language, update.milestone), 'success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rewardLabel = tr(
    language,
    'រង្វាន់ Free VIP ៣០ថ្ងៃ',
    'Free 30-Day VIP',
    '30 天免费 VIP'
  );

  const expDateShort = reward.expiresAt ? reward.expiresAt.slice(0, 10) : '';

  const goalText = (() => {
    if (isAdmin) {
      return tr(
        language,
        '៖ គណនីអ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)',
        ': System Administrator Account',
        '：系统管理员账号'
      );
    }
    if (reward.trialState === 'active') {
      return tr(
        language,
        `៖ សល់ ${reward.remainingDays}/${reward.totalDays} ថ្ងៃ${expDateShort ? ` • ផុតកំណត់ ${expDateShort}` : ' • កំពុងដំណើរការ'}`,
        `: ${reward.remainingDays}/${reward.totalDays} days left${expDateShort ? ` • Expires ${expDateShort}` : ' • Active'}`,
        `：剩余 ${reward.remainingDays}/${reward.totalDays} 天${expDateShort ? ` • 到期 ${expDateShort}` : ' • 已激活'}`
      );
    }
    if (reward.trialState === 'expired') {
      return tr(
        language,
        `៖ សល់ 0/${reward.totalDays} ថ្ងៃ (បានប្រើរួចហើយ${expDateShort ? ` • ${expDateShort}` : ''})`,
        `: 0/${reward.totalDays} days left (Already used${expDateShort ? ` • ${expDateShort}` : ''})`,
        `：剩余 0/${reward.totalDays} 天（已使用${expDateShort ? ` • ${expDateShort}` : ''}）`
      );
    }
    if (isGuest) {
      return tr(
        language,
        `៖ 0/${FOOD_CHECKIN_REWARD_TARGET} គ្រាន់តែចុចបានភ្លក់ (ចូលគណនី)`,
        `: 0/${FOOD_CHECKIN_REWARD_TARGET} Tap to activate (Sign in)`,
        `：0/${FOOD_CHECKIN_REWARD_TARGET} 点击激活（请登录）`
      );
    }
    if (isActivating) {
      return tr(
        language,
        '៖ កំពុងផ្ទៀងផ្ទាត់ម៉ោង Server និងបើកដំណើរការ...',
        ': Verifying server time & activating...',
        '：正在验证服务器时间并激活...'
      );
    }
    const capReached = reward.todayCount >= reward.dailyCap;
    return tr(
      language,
      `៖ ${reward.progress}/${reward.target} គ្រាន់តែចុចបានភ្លក់${capReached ? ' • ថ្ងៃនេះរួចរាល់' : ' (ចុចដើម្បីបើក)'}`,
      `: ${reward.progress}/${reward.target} Tap to activate${capReached ? ' • today done' : ''}`,
      `：${reward.progress}/${reward.target} 点击激活${capReached ? ' • 今日已计' : ''}`
    );
  })();

  const goalPct = (() => {
    if (isAdmin) return 100;
    if (reward.trialState === 'active') {
      return Math.max(4, Math.min(100, Math.round((reward.remainingDays / Math.max(1, reward.totalDays)) * 100)));
    }
    if (reward.trialState === 'expired') {
      return 0;
    }
    return Math.min(100, Math.round((reward.progress / Math.max(1, reward.target)) * 100));
  })();

  const onGoalTap = async () => {
    if (isAdmin) return;
    if (isGuest) {
      setIsAuthModalOpen(true);
      return;
    }
    if (reward.trialState === 'active') {
      const startShort = reward.activatedAt ? reward.activatedAt.slice(0, 10) : '';
      showToast(
        tr(
          language,
          `👑 រង្វាន់ Free VIP ៣០ថ្ងៃ កំពុងដំណើរការ៖ សល់ ${reward.remainingDays}/${reward.totalDays} ថ្ងៃ${startShort ? ` (ថ្ងៃចាប់ផ្តើម ${startShort}` : ''}${expDateShort ? ` • ផុតកំណត់ ${expDateShort})` : ''}`,
          `👑 Free 30-Day VIP is active: ${reward.remainingDays}/${reward.totalDays} days remaining${expDateShort ? ` (Expires ${expDateShort})` : ''}`,
          `👑 30 天免费 VIP 已激活：剩余 ${reward.remainingDays}/${reward.totalDays} 天${expDateShort ? `（到期 ${expDateShort}）` : ''}`
        ),
        'info'
      );
      return;
    }
    if (reward.trialState === 'expired') {
      showToast(
        tr(
          language,
          `គណនីនេះបានប្រើប្រាស់ រង្វាន់ Free VIP ${FOOD_CHECKIN_REWARD_VIP_DAYS} ថ្ងៃ រួចហើយ (១ គណនីទទួលបានតែ ១ ដងគត់)។ សូមបន្តសមាជិកភាព VIP!`,
          `This account has already used its one-time Free ${FOOD_CHECKIN_REWARD_VIP_DAYS}-Day VIP Trial. Upgrade to VIP to continue!`,
          `该账号已使用过一次性的 ${FOOD_CHECKIN_REWARD_VIP_DAYS} 天免费 VIP 试用（每个账号限享一次）。请升级或续费 VIP！`
        ),
        'warning'
      );
      setIsUpgradeVipModalOpen(true);
      return;
    }
    if (isActivating) return;
    setIsActivating(true);
    try {
      const res = await grantFoodCheckInReward({ directTrialActivation: true });
      if (res.alreadyGranted) {
        showToast(
          tr(
            language,
            'គណនីនេះបានប្រើប្រាស់ រង្វាន់ Free VIP ៣០ថ្ងៃ រួចហើយ (១ គណនីទទួលបានតែ ១ ដងគត់)',
            'This account has already used its one-time Free 30-Day VIP Trial (1 per account)',
            '该账号已领取过 30 天免费 VIP 试用（每个账号限领一次）'
          ),
          'warning'
        );
      }
    } finally {
      setIsActivating(false);
    }
  };

  const progressBarColor =
    reward.trialState === 'active'
      ? 'bg-emerald-500'
      : reward.trialState === 'expired'
        ? 'bg-slate-400'
        : 'bg-orange-500';

  return (
    <section
      data-testid="daily-habit-card"
      className="rounded-2xl bg-white dark:bg-slate-800 border border-emerald-500/40 shadow-xs px-2.5 py-1.5 space-y-1.5 font-khmer"
    >
      {/* Compact 1-line VIP trial/reward status bar */}
      <div
        data-testid="habit-goal"
        role={!isAdmin ? 'button' : undefined}
        tabIndex={!isAdmin ? 0 : undefined}
        onClick={!isAdmin ? () => void onGoalTap() : undefined}
        className={`flex items-center gap-2 ${!isAdmin ? 'cursor-pointer' : ''}`}
      >
        <Award
          className={`w-4 h-4 shrink-0 ${
            reward.trialState === 'active'
              ? 'text-emerald-500 dark:text-emerald-400'
              : 'text-orange-500 dark:text-orange-400'
          }`}
          strokeWidth={1.75}
        />
        <p className="min-w-0 flex-1 text-[12px] font-bold text-slate-700 dark:text-slate-200 leading-snug truncate">
          <span
            className={
              reward.trialState === 'active'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-orange-500 dark:text-orange-400 font-extrabold'
            }
          >
            {rewardLabel}
          </span>
          <span>{goalText}</span>
        </p>
        <div
          className="w-16 sm:w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0"
          role="progressbar"
          aria-valuenow={Math.min(100, goalPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full ${progressBarColor} transition-all`}
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

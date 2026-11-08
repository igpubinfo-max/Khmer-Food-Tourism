import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { FoodItem } from '../../types';
import { tr } from '../../utils/i18n';
import { touchDailyStreak } from '../../utils/dailyHabit';
import { isReminderSupported } from '../../services/mealReminderService';
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
 *  - Silently records the user's daily visit streak (idempotent per calendar day).
 *  - Renders the opt-in regular meal-time reminder panel on native platforms.
 */
const DailyHabitCardInner: React.FC<Props> = () => {
  const { language, showToast } = useApp();
  const reminderSupported = isReminderSupported();

  // Silently record today's visit once per mount (idempotent per calendar day).
  useEffect(() => {
    const update = touchDailyStreak();
    if (update.isNewDay && update.milestone) {
      showToast(MILESTONE_MESSAGES(language, update.milestone), 'success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!reminderSupported) return null;

  return (
    <section
      data-testid="daily-habit-card"
      className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/85 p-2 shadow-2xs space-y-1.5"
    >
      {/* Opt-in meal-time reminders (native app only) */}
      <MealReminderPanel />
    </section>
  );
};

export const DailyHabitCard = React.memo(DailyHabitCardInner);

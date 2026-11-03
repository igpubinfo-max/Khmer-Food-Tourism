import React, { useEffect, useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { organizeAndDeduplicateFoods, type FoodItem } from '../../types';
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
import { PassportStampButton } from '../PassportStampButton';
import { MealReminderPanel } from './MealReminderPanel';
import { FALLBACK_IMG, resolveHomePhoto, headingFont } from './homeUtils';

interface Props {
  onOpenFood: (food: FoodItem) => void;
}

const MILESTONE_MESSAGES = (lang: Parameters<typeof tr>[0], n: number) =>
  tr(
    lang,
    `🔥 អស្ចារ្យណាស់! អ្នកបានចូលប្រើកម្មវិធីជាប់ៗគ្នា ${n} ថ្ងៃហើយ!`,
    `🔥 Amazing! You've kept a ${n}-day streak!`,
    `🔥 太棒了！你已连续打卡 ${n} 天！`
  );

/**
 * Home "daily habit" card — three small reasons to come back every day:
 *  1. a visit streak,
 *  2. a shared Dish of the Day (one tap to stamp it in the Food Passport),
 *  3. the closest reward to unlock (almost-finished badge or next level).
 * Everything is stored locally under tiny new keys; nothing here touches accounts or photos.
 */
const DailyHabitCardInner: React.FC<Props> = ({ onOpenFood }) => {
  const { language, foods, showToast } = useApp();
  const { stamps, count } = useFoodPassport();
  const [streak, setStreak] = useState<StreakState | null>(() => getDailyStreak());

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
    if (goal.kind === 'badge') {
      const name = `${goal.badge.emoji} ${badgeTitle(goal.badge, language)}`;
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
        `នៅសល់ ${goal.remaining} មុខទៀត ដើម្បីឡើងជា ${goal.next.emoji} ${levelTitle(goal.next, language)}`,
        `${goal.remaining} more dish${goal.remaining > 1 ? 'es' : ''} to reach ${goal.next.emoji} ${levelTitle(goal.next, language)}`,
        `再品尝 ${goal.remaining} 道菜即可成为 ${goal.next.emoji} ${levelTitle(goal.next, language)}`
      );
    }
    return tr(language, '🎉 អ្នកបានឈានដល់កម្រិតខ្ពស់បំផុត!', '🎉 You reached the top level!', '🎉 你已达到最高等级！');
  })();

  const goalPct =
    goal.kind === 'badge'
      ? Math.round((goal.badge.have / goal.badge.total) * 100)
      : goal.kind === 'level'
        ? Math.round((count / goal.next.min) * 100)
        : 100;

  const onShare = () => {
    const text = buildPassportShareText(language, {
      count,
      total,
      levelTitle: `${level.emoji} ${levelTitle(level, language)}`,
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
      className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-slate-800 dark:via-slate-800 dark:to-emerald-950/40 border border-emerald-400/60 shadow-xs p-3.5 space-y-3 font-khmer"
    >
      {/* Streak + level */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl flex items-center justify-center shadow-sm shrink-0" aria-hidden="true">
            🔥
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
              {tr(language, `${current} ថ្ងៃជាប់ៗគ្នា`, `${current}-day streak`, `连续 ${current} 天`)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {current < longest
                ? tr(language, `កំណត់ត្រាល្អបំផុត ${longest} ថ្ងៃ`, `Best: ${longest} days`, `最佳纪录 ${longest} 天`)
                : tr(language, 'ត្រឡប់មកវិញរាល់ថ្ងៃ ដើម្បីបន្តរក្សា!', 'Come back tomorrow to keep it going!', '明天再来，继续保持！')}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate max-w-[9.5rem]">
            {level.emoji} {levelTitle(level, language)}
          </p>
          <p className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
            {count} / {total}
          </p>
        </div>
      </div>

      {/* Dish of the Day */}
      <div className="flex items-center gap-3 rounded-2xl bg-white/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 p-2">
        <button
          type="button"
          onClick={() => onOpenFood(dish)}
          className="shrink-0 rounded-xl overflow-hidden active:scale-95 transition cursor-pointer"
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
            className="w-[72px] h-[72px] object-cover bg-slate-200 dark:bg-slate-700"
          />
        </button>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-600 dark:text-amber-300">
            {tr(language, 'ម្ហូបប្រចាំថ្ងៃនេះ', "Today's Dish", '今日美食')}
          </p>
          <button type="button" onClick={() => onOpenFood(dish)} className="block w-full text-left cursor-pointer">
            <span className={`${headingFont(language)} block text-[15px] leading-snug text-[#064E3B] dark:text-emerald-100 line-clamp-2`}>
              {loc.name}
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">{loc.category}</span>
          </button>
          <PassportStampButton foodId={dish.id} language={language} showToast={showToast} variant="full" />
        </div>
      </div>

      {/* Next goal + share */}
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug">{goalText}</p>
          <div
            className="mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.min(100, goalPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all"
              style={{ width: `${Math.min(100, goalPct)}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onShare}
          title={tr(language, 'ចែករំលែកកំណត់ត្រារបស់ខ្ញុំ', 'Share my progress', '分享我的进度')}
          aria-label={tr(language, 'ចែករំលែកកំណត់ត្រារបស់ខ្ញុំ', 'Share my progress', '分享我的进度')}
          className="min-w-[44px] min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center active:scale-95 transition cursor-pointer shrink-0"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Opt-in meal-time reminders (native app only) */}
      <MealReminderPanel />
    </section>
  );
};

export const DailyHabitCard = React.memo(DailyHabitCardInner);

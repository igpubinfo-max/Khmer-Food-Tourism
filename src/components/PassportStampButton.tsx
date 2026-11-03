import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { Language } from '../types';
import { tr } from '../utils/i18n';
import { togglePassportStamp, useFoodPassport, getPassportLevel, levelTitle } from '../utils/foodPassport';
import { recordMeaningfulAction } from '../utils/engagement';
import { touchDailyStreak } from '../utils/dailyHabit';
import {
  FOOD_CHECKIN_DAILY_CAP,
  FOOD_CHECKIN_REWARD_TARGET,
  reportFoodStamped,
} from '../utils/foodCheckInReward';

interface Props {
  foodId: string;
  language: Language;
  showToast?: (msg: string, type?: 'success' | 'info' | 'warning') => void;
  /** compact = icon-only chip for cards; full = labelled button for detail screens; inline = slim labelled button for compact cards */
  variant?: 'compact' | 'full' | 'inline';
}

/** "I tried it" stamp button for the Cambodian Food Passport. */
export const PassportStampButton: React.FC<Props> = ({ foodId, language, showToast, variant = 'compact' }) => {
  const { has, count } = useFoodPassport();
  const stamped = has(foodId);

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nowStamped = togglePassportStamp(foodId);
    if (!nowStamped) return;
    recordMeaningfulAction('favorite');
    touchDailyStreak();

    // Food check-in reward ("taste 30 dishes -> 30 days VIP"): the shell answers synchronously with what really happened.
    const outcome = reportFoodStamped(foodId);
    // The 30th dish: the grant shows its own celebration, so no regular toast here.
    if (outcome.kind === 'reached') return;

    // Celebrate crossing into a new level (cheap: depends on the count only).
    const before = getPassportLevel(count).level;
    const after = getPassportLevel(count + 1).level;
    const base =
      after.min !== before.min
        ? tr(
            language,
            `ឡើងកម្រិតថ្មី៖ ${levelTitle(after, language)}`,
            `New level unlocked: ${levelTitle(after, language)}`,
            `已升级：${levelTitle(after, language)}`
          )
        : tr(language, 'បានបន្ថែមទៅ រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Added to Cambodia Flavors & Tourism', '已加入柬埔寨风味与旅游');

    let suffix = '';
    if (outcome.kind === 'counted') {
      suffix = ` • VIP ${outcome.progress}/${FOOD_CHECKIN_REWARD_TARGET}`;
    } else if (outcome.kind === 'daily_cap') {
      suffix = ` • ${tr(
        language,
        `ពិន្ទុរង្វាន់ថ្ងៃនេះគ្រប់ ${FOOD_CHECKIN_DAILY_CAP} ដងហើយ — សូមបន្តនៅថ្ងៃស្អែក`,
        `Today's ${FOOD_CHECKIN_DAILY_CAP} reward check-in is complete — continue tomorrow`,
        `今日 ${FOOD_CHECKIN_DAILY_CAP} 次奖励打卡已完成 — 请明天继续`
      )}`;
    }
    showToast?.(base + suffix, 'success');
  };

  const label = stamped
    ? tr(language, 'បានភ្លក់ហើយ', 'Tried it', '已品尝')
    : tr(language, 'ខ្ញុំបានភ្លក់', 'I tried it', '我吃过了');

  if (variant === 'inline') {
    // Slim labelled button used inside compact cards (36px tall, still a comfortable touch target).
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={stamped}
        className={`min-h-[36px] px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer border ${
          stamped
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border-emerald-500'
        }`}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        <span className="whitespace-nowrap">{label}</span>
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={stamped}
        className={`min-h-[44px] px-4 rounded-xl text-sm font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer border ${
          stamped
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border-emerald-500'
        }`}
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={stamped}
      title={label}
      aria-label={label}
      className={`min-w-[36px] min-h-[36px] px-1.5 rounded-lg flex items-center justify-center transition active:scale-95 cursor-pointer ${
        stamped
          ? 'bg-emerald-600 text-white'
          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
      }`}
    >
      <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
    </button>
  );
};

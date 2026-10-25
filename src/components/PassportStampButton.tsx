import React from 'react';
import { BadgeCheck } from 'lucide-react';
import type { Language } from '../types';
import { tr } from '../utils/i18n';
import { togglePassportStamp, useFoodPassport } from '../utils/foodPassport';
import { recordMeaningfulAction } from '../utils/engagement';

interface Props {
  foodId: string;
  language: Language;
  showToast?: (msg: string, type?: 'success' | 'info' | 'warning') => void;
  /** compact = icon-only chip for cards; full = labelled button for detail screens */
  variant?: 'compact' | 'full';
}

/** "I tried it" stamp button for the Cambodian Food Passport. */
export const PassportStampButton: React.FC<Props> = ({ foodId, language, showToast, variant = 'compact' }) => {
  const { has } = useFoodPassport();
  const stamped = has(foodId);

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nowStamped = togglePassportStamp(foodId);
    if (nowStamped) {
      recordMeaningfulAction('favorite');
      showToast?.(
        tr(language, '🛂 បានបោះត្រាក្នុងលិខិតឆ្លងដែនម្ហូប!', '🛂 Stamped in your Food Passport!', '🛂 已盖章到你的美食护照！'),
        'success'
      );
    }
  };

  const label = stamped
    ? tr(language, 'បានភ្លក់ហើយ', 'Tried it', '已品尝')
    : tr(language, 'ខ្ញុំបានភ្លក់', 'I tried it', '我吃过了');

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={stamped}
        className={`min-h-[44px] px-4 rounded-xl text-sm font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer border-2 ${
          stamped
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border-emerald-500'
        }`}
      >
        <BadgeCheck className="w-4 h-4" />
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
      <BadgeCheck className="w-4 h-4" />
    </button>
  );
};

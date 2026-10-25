import React from 'react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';

/** Skeleton shown while foods / places are still loading. */
export const HomeSkeleton: React.FC = () => (
  <div className="space-y-5 animate-pulse" aria-busy="true" aria-live="polite">
    <div className="grid grid-cols-2 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      ))}
    </div>
    <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
    <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />
    <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />
    <div className="flex gap-3 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div key={i} className="shrink-0 w-44 h-44 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      ))}
    </div>
  </div>
);

interface EmptyProps {
  language: Language;
  emoji?: string;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Friendly empty state with an optional action button. */
export const HomeEmptyState: React.FC<EmptyProps> = ({ language, emoji = '🍽️', title, message, actionLabel, onAction }) => (
  <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-center space-y-2">
    <div className="text-4xl" aria-hidden="true">{emoji}</div>
    <p className="text-base font-bold text-slate-800 dark:text-white">
      {title ?? tr(language, 'មិនទាន់មានអ្វីបង្ហាញទេ', 'Nothing to show yet', '暂时没有内容')}
    </p>
    <p className="text-sm text-slate-500 dark:text-slate-400">
      {message ?? tr(language, 'សូមព្យាយាមម្តងទៀតក្នុងពេលបន្តិចទៀត', 'Please check back in a moment.', '请稍后再来看看。')}
    </p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-1 min-h-[44px] px-5 rounded-xl bg-[#064E3B] text-white text-sm font-bold active:scale-95 transition cursor-pointer"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

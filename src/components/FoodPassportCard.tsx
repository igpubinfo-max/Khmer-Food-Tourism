import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { tr } from '../utils/i18n';
import {
  useFoodPassport,
  getPassportLevel,
  getPassportBadges,
  levelTitle,
  badgeTitle,
} from '../utils/foodPassport';
import { organizeAndDeduplicateFoods } from '../types';

/** Profile card: Cambodian Food Passport progress, level title, and badges. */
export const FoodPassportCard: React.FC = () => {
  const { language, foods } = useApp();
  const { stamps, count } = useFoodPassport();
  const allFoods = useMemo(() => organizeAndDeduplicateFoods(foods), [foods]);
  const total = allFoods.length;
  const { level, next } = getPassportLevel(count);
  const badges = useMemo(() => getPassportBadges(allFoods, stamps), [allFoods, stamps]);
  const unlocked = badges.filter((b) => b.unlocked);
  const inProgress = badges.filter((b) => !b.unlocked && b.have > 0).slice(0, 4);
  const pct = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;

  return (
    <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-slate-800 dark:via-slate-800 dark:to-emerald-950/40 border-2 border-emerald-400/60 shadow-xs space-y-3 font-khmer">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-[#064E3B] text-white flex items-center justify-center text-3xl shadow-sm shrink-0">
          {level.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-moul text-sm text-[#064E3B] dark:text-emerald-300">
            🧭 {tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨风味与旅游')}
          </h4>
          <p className="text-sm font-bold text-slate-800 dark:text-white">{levelTitle(level, language)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {next
              ? tr(
                  language,
                  `ភ្លក់ឱ្យបាន ${next.min} មុខ ដើម្បីឡើងកម្រិតបន្ទាប់`,
                  `Taste ${next.min} dishes for the next level`,
                  `品尝 ${next.min} 道菜即可升级`
                )
              : tr(language, 'កម្រិតខ្ពស់បំផុត! 🎉', 'Top level reached! 🎉', '已达最高等级！🎉')}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
          <span>{tr(language, 'ម្ហូបដែលបានភ្លក់', 'Dishes tried', '已品尝菜品')}</span>
          <span>{count} / {total}</span>
        </div>
        <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" role="progressbar" aria-valuenow={count} aria-valuemin={0} aria-valuemax={total}>
          <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {unlocked.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unlocked.map((b) => (
            <span key={b.id} className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
              {b.emoji} {badgeTitle(b, language)}
            </span>
          ))}
        </div>
      )}
      {inProgress.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {inProgress.map((b) => (
            <span key={b.id} className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold">
              {b.emoji} {badgeTitle(b, language)} {b.have}/{b.total}
            </span>
          ))}
        </div>
      )}
      {count === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {tr(
            language,
            'ចុចប៊ូតុង «ខ្ញុំបានភ្លក់» លើមុខម្ហូប ដើម្បីកត់ត្រា។',
            'Tap “I tried it” on any dish to record your first dish.',
            '在任意菜品上点击“我吃过了”，记录第一道菜。'
          )}
        </p>
      )}
    </div>
  );
};

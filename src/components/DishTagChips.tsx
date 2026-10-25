import React, { useMemo } from 'react';
import type { FoodItem, Language } from '../types';
import { getDishTags, tagLabel, TAG_ESTIMATE_NOTE, GENERAL_FOOD_INFO_NOTE } from '../utils/dishTags';
import { tr } from '../utils/i18n';

interface Props {
  food: FoodItem;
  language: Language;
}

const toneClass = (tone: 'green' | 'blue' | 'amber') =>
  tone === 'green'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    : tone === 'blue'
    ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';

/** Full tag list for the dish detail screen, with recipe-based guide and general food info notes. */
export const DishTagChips: React.FC<Props> = ({ food, language }) => {
  const tags = useMemo(() => getDishTags(food), [food]);
  if (tags.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tg) => (
          <span key={tg.id} className={`px-2.5 py-1 rounded-full text-xs font-bold border ${toneClass(tg.tone)}`}>
            {tg.emoji} {tagLabel(tg, language)}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-slate-400">
        ℹ️ {tr(language, TAG_ESTIMATE_NOTE.km, TAG_ESTIMATE_NOTE.en, TAG_ESTIMATE_NOTE.zh)} ·{' '}
        {tr(language, GENERAL_FOOD_INFO_NOTE.km, GENERAL_FOOD_INFO_NOTE.en, GENERAL_FOOD_INFO_NOTE.zh)}
      </p>
    </div>
  );
};

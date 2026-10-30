import React, { useMemo } from 'react';
import type { FoodItem, Language } from '../types';
import { getDishTags, tagLabel } from '../utils/dishTags';

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

/** Concise tag chips for the dish detail screen. */
export const DishTagChips: React.FC<Props> = ({ food, language }) => {
  const tags = useMemo(() => getDishTags(food), [food]);
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tg) => (
        <span key={tg.id} className={`px-2.5 py-1 rounded-full text-xs font-bold border ${toneClass(tg.tone)}`}>
          {tg.emoji} {tagLabel(tg, language)}
        </span>
      ))}
    </div>
  );
};

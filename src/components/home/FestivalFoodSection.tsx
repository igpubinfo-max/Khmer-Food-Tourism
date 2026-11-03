import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { FoodItem, Language } from '../../types';
import { tr } from '../../utils/i18n';
import { getLocalizedFood } from '../../utils/zhDynamicTranslator';
import { pickTri } from '../../data/guideContent';
import {
  FESTIVAL_FOOD_TITLES,
  pickFestivalInSeason,
  resolveFestivalFoods,
} from '../../data/festivalFoods';
import { SectionHeader } from './SectionHeader';
import { FALLBACK_IMG, resolveHomePhoto } from './homeUtils';

interface RowProps {
  language: Language;
  dishes: FoodItem[];
  onOpenFood: (food: FoodItem) => void;
  /** `card` = large Home cards, `chip` = compact thumbnails (Guide festival calendar). */
  variant?: 'card' | 'chip';
}

/** Horizontally scrolling list of festival dishes (real catalog dishes only). */
export const FestivalDishRow: React.FC<RowProps> = ({ language, dishes, onOpenFood, variant = 'card' }) => {
  if (dishes.length === 0) return null;
  const isChip = variant === 'chip';
  return (
    <div className={`-mx-1 px-1 flex overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 ${isChip ? 'gap-2' : 'gap-3'}`}>
      {dishes.map((food) => {
        const loc = getLocalizedFood(food, language);
        return (
          <button
            key={food.id}
            type="button"
            onClick={() => onOpenFood(food)}
            data-testid={`festival-dish-${food.id}`}
            className={
              isChip
                ? 'snap-start shrink-0 w-28 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 overflow-hidden text-left active:scale-[0.97] transition cursor-pointer'
                : 'snap-start shrink-0 w-40 rounded-3xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-md overflow-hidden text-left active:scale-[0.97] transition cursor-pointer'
            }
          >
            <span className={`relative block ${isChip ? 'h-20' : 'h-28'}`}>
              <img
                src={resolveHomePhoto(food.photoUrl, food.photoUpdatedAt)}
                alt={loc.name}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_IMG;
                }}
                className="absolute inset-0 w-full h-full object-cover bg-slate-100 dark:bg-slate-700"
              />
            </span>
            <span className={`block ${isChip ? 'p-1.5' : 'p-2.5'}`}>
              <span className={`block font-bold leading-snug text-slate-900 dark:text-white line-clamp-2 ${isChip ? 'text-[11px]' : 'text-[13px]'}`}>
                {loc.name}
              </span>
              {!isChip && loc.category && (
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{loc.category}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Home section: the traditional dishes of the festival that is ongoing or about to start (within the promo window).
 * Renders nothing outside of festival season, so Home stays calm the rest of the year.
 */
const FestivalFoodSectionInner: React.FC<{ onOpenFood: (food: FoodItem) => void }> = ({ onOpenFood }) => {
  const { language, foods } = useApp();
  const dayKey = new Date().toDateString();
  const festival = useMemo(() => pickFestivalInSeason(new Date()), [dayKey]);
  const dishes = useMemo(() => (festival ? resolveFestivalFoods(festival.id, foods) : []), [festival, foods]);

  if (!festival || dishes.length === 0) return null;
  const title = pickTri(FESTIVAL_FOOD_TITLES[festival.id as keyof typeof FESTIVAL_FOOD_TITLES], language);

  return (
    <section className="space-y-3" data-testid="festival-food-section">
      <SectionHeader
        title={title}
        subtitle={`${pickTri(festival.countdownBadge, language)} • ${tr(
          language,
          'ម្ហូបប្រពៃណីសម្រាប់គ្រួសារ',
          'Traditional dishes for the family table',
          '适合家庭餐桌的传统美食'
        )}`}
      />
      <FestivalDishRow language={language} dishes={dishes} onOpenFood={onOpenFood} />
    </section>
  );
};

export const FestivalFoodSection = React.memo(FestivalFoodSectionInner);

import React from 'react';
import { ChevronRight, MapPin, Star } from 'lucide-react';
import type { FoodItem, Restaurant, Language } from '../../types';
import { tr } from '../../utils/i18n';
import { getLocalizedFood, getLocalizedRestaurant } from '../../utils/zhDynamicTranslator';

interface Props {
  language: Language;
  food: FoodItem | null;
  restaurant: Restaurant | null;
  onOpenFood: (food: FoodItem) => void;
  onOpenRestaurant: (restaurant: Restaurant) => void;
}

/** "Today's discovery": 1 featured dish + 1 featured place. Photos come from the already-merged app data (admin overrides win). */
export const TodayDiscovery: React.FC<Props> = ({ language, food, restaurant, onOpenFood, onOpenRestaurant }) => {
  if (!food && !restaurant) return null;
  const locFood = food ? getLocalizedFood(food, language) : null;
  const locRest = restaurant ? getLocalizedRestaurant(restaurant, language) : null;

  return (
    <section className="space-y-2.5">
      <h3 className="font-moul text-base text-[#064E3B] dark:text-emerald-300">
        ✨ {tr(language, 'រកឃើញថ្មីថ្ងៃនេះ', "Today's discovery", '今日发现')}
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {food && locFood && (
          <button
            type="button"
            onClick={() => onOpenFood(food)}
            className="w-full min-h-[96px] flex items-center gap-3 p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs text-left active:scale-[0.98] transition cursor-pointer"
          >
            <img src={food.photoUrl} alt={locFood.name} loading="lazy" className="w-24 h-24 rounded-xl object-cover shrink-0 bg-slate-100" />
            <span className="min-w-0 flex-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                🍲 {tr(language, 'ម្ហូបប្រចាំថ្ងៃ', 'Dish of the day', '今日菜品')}
              </span>
              <span className="block mt-1 text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">{locFood.name}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{locFood.category}</span>
            </span>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </button>
        )}
        {restaurant && locRest && (
          <button
            type="button"
            onClick={() => onOpenRestaurant(restaurant)}
            className="w-full min-h-[96px] flex items-center gap-3 p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs text-left active:scale-[0.98] transition cursor-pointer"
          >
            <img src={restaurant.photoUrl} alt={locRest.name} loading="lazy" className="w-24 h-24 rounded-xl object-cover shrink-0 bg-slate-100" />
            <span className="min-w-0 flex-1">
              <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                🏪 {tr(language, 'ហាងណែនាំ', 'Featured place', '推荐餐厅')}
              </span>
              <span className="block mt-1 text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">{locRest.name}</span>
              <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" />{locRest.province}</span>
                {typeof restaurant.rating === 'number' && (
                  <span className="inline-flex items-center gap-0.5"><Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />{restaurant.rating.toFixed(1)}</span>
                )}
              </span>
            </span>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </button>
        )}
      </div>
    </section>
  );
};

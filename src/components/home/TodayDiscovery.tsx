import React from 'react';
import { MapPin, Star, Shuffle, Compass, Utensils, Store } from 'lucide-react';
import type { FoodItem, Restaurant, Language } from '../../types';
import { tr } from '../../utils/i18n';
import { getLocalizedFood, getLocalizedRestaurant } from '../../utils/zhDynamicTranslator';
import { AutoMarquee } from './AutoMarquee';

interface Props {
  language: Language;
  foods: FoodItem[];
  restaurants: Restaurant[];
  onOpenFood: (food: FoodItem) => void;
  onOpenRestaurant: (restaurant: Restaurant) => void;
  onShuffle?: () => void;
}

const FALLBACK_IMG = '/welcome/hero-bg.webp';

/** "Today's discovery": random mix of dishes and places that slowly glides right-to-left. */
export const TodayDiscovery: React.FC<Props> = ({ language, foods, restaurants, onOpenFood, onOpenRestaurant, onShuffle }) => {
  if (!foods.length && !restaurants.length) return null;

  // Interleave dishes and places so the strip feels varied
  const cards: React.ReactNode[] = [];
  const max = Math.max(foods.length, restaurants.length);
  for (let i = 0; i < max; i++) {
    const food = foods[i];
    if (food) {
      const loc = getLocalizedFood(food, language);
      cards.push(
        <button
          key={`f-${food.id}`}
          type="button"
          onClick={() => onOpenFood(food)}
          className="relative shrink-0 w-44 h-56 rounded-3xl overflow-hidden text-left shadow-lg active:scale-[0.97] transition cursor-pointer"
        >
          <img
            src={food.photoUrl || FALLBACK_IMG}
            alt={loc.name}
            loading="lazy"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
            className="absolute inset-0 w-full h-full object-cover bg-slate-200"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black inline-flex items-center gap-1">
            <Utensils className="w-3 h-3" />
            <span>{tr(language, 'ម្ហូប', 'Dish', '美食')}</span>
          </span>
          <span className="absolute bottom-0 inset-x-0 p-3">
            <span className="block text-sm font-extrabold text-white leading-snug line-clamp-2 drop-shadow">{loc.name}</span>
            <span className="block text-[11px] text-amber-200 line-clamp-1 mt-0.5">{loc.category}</span>
          </span>
        </button>
      );
    }
    const rest = restaurants[i];
    if (rest) {
      const loc = getLocalizedRestaurant(rest, language);
      cards.push(
        <button
          key={`r-${rest.id}`}
          type="button"
          onClick={() => onOpenRestaurant(rest)}
          className="relative shrink-0 w-44 h-56 rounded-3xl overflow-hidden text-left shadow-lg active:scale-[0.97] transition cursor-pointer"
        >
          <img
            src={rest.photoUrl || FALLBACK_IMG}
            alt={loc.name}
            loading="lazy"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
            className="absolute inset-0 w-full h-full object-cover bg-slate-200"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black inline-flex items-center gap-1">
            <Store className="w-3 h-3" />
            <span>{tr(language, 'ហាង', 'Place', '餐厅')}</span>
          </span>
          <span className="absolute bottom-0 inset-x-0 p-3">
            <span className="block text-sm font-extrabold text-white leading-snug line-clamp-2 drop-shadow">{loc.name}</span>
            <span className="flex items-center gap-2 text-[11px] text-emerald-200 mt-0.5">
              <span className="inline-flex items-center gap-0.5 truncate"><MapPin className="w-3 h-3" />{loc.province}</span>
              {typeof rest.rating === 'number' && rest.rating > 0 && (
                <span className="inline-flex items-center gap-0.5 text-amber-300"><Star className="w-3 h-3 fill-amber-300" />{rest.rating.toFixed(1)}</span>
              )}
            </span>
          </span>
        </button>
      );
    }
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-moul text-base text-[#064E3B] dark:text-emerald-300 flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{tr(language, 'រកឃើញថ្មីថ្ងៃនេះ', "Today's discovery", '今日发现')}</span>
        </h3>
        {onShuffle && (
          <button
            type="button"
            onClick={onShuffle}
            className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-1 active:scale-95 transition cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>{tr(language, 'ប្តូរថ្មី', 'Shuffle', '换一批')}</span>
          </button>
        )}
      </div>
      <AutoMarquee durationSec={Math.max(30, cards.length * 7)}>{cards}</AutoMarquee>
    </section>
  );
};

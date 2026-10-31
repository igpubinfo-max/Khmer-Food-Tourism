import React, { useMemo } from 'react';
import { Navigation, Store } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isGpipRegisteredRestaurant, openRestaurantGoogleExternal, type FoodItem, type Restaurant } from '../types';
import { tr } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { getMatchingRestaurantsForDish } from '../utils/foodFilters';
import { ShopAvatar } from './icons/DefaultShopIcon';

export function findRestaurantsServingDish(food: FoodItem, restaurants: Restaurant[]): Restaurant[] {
  return getMatchingRestaurantsForDish(food, restaurants, 4);
}

interface Props {
  food: FoodItem;
}

/** "Where to eat this": restaurants whose listed signature dishes match, plus a Near-me shortcut. */
export const WhereToEat: React.FC<Props> = ({ food }) => {
  const { language, restaurants, setSelectedFood, setSelectedRestaurant, setIsNearMeModalOpen } = useApp();
  const matches = useMemo(() => findRestaurantsServingDish(food, restaurants).slice(0, 4), [food, restaurants]);

  const openNearMe = () => {
    setSelectedFood(null);
    setIsNearMeModalOpen(true);
  };

  return (
    <div className="space-y-2.5">
      <h3 className="font-bold text-[#0F172A] dark:text-white text-sm flex items-center gap-1.5">
        <Store className="w-4 h-4 text-[#059669]" />
        {tr(language, 'កន្លែងញ៉ាំម្ហូបនេះ', 'Where to eat this', '哪里可以吃到')}
      </h3>

      {matches.length > 0 && (
        <div className="space-y-2">
          {matches.map((r) => {
            const loc = getLocalizedRestaurant(r, language);
            const isRegistered = isGpipRegisteredRestaurant(r);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (isRegistered) {
                    setSelectedFood(null);
                    setSelectedRestaurant(r);
                  } else {
                    openRestaurantGoogleExternal(r, 'maps');
                  }
                }}
                className="w-full min-h-[52px] flex items-center gap-3 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 text-left active:scale-[0.98] transition cursor-pointer"
              >
                <ShopAvatar restaurant={r} alt={loc.name} className="w-10 h-10 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{loc.name}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={openNearMe}
        className="min-h-[42px] px-4 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
      >
        <Navigation className="w-4 h-4" />
        {tr(language, 'រកហាងនៅជិតខ្ញុំ', 'Find restaurants near me', '查找附近餐厅')}
      </button>
    </div>
  );
};

import React, { useMemo } from 'react';
import { Navigation, Store } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { type FoodItem, type Restaurant } from '../types';
import { tr, translateProvince } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { getMatchingRestaurantsForDish, matchShopToProductQuery } from '../utils/foodFilters';
import { ShopAvatar } from './icons/DefaultShopIcon';

function readStoredUserGps(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem('kft_last_known_user_gps_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Number.isFinite(Number(parsed.lat)) &&
      Number.isFinite(Number(parsed.lng)) &&
      Number(parsed.lat) >= 9.5 &&
      Number(parsed.lat) <= 15.0 &&
      Number(parsed.lng) >= 102.0 &&
      Number(parsed.lng) <= 108.0
    ) {
      return { lat: Number(parsed.lat), lng: Number(parsed.lng) };
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function findRestaurantsServingDish(
  food: FoodItem,
  restaurants: Restaurant[],
  userCoords?: { lat: number; lng: number } | null,
  preferredProvinceKh?: string
): Restaurant[] {
  return getMatchingRestaurantsForDish(food, restaurants, 4, 0, userCoords, preferredProvinceKh);
}

interface Props {
  food: FoodItem;
}

/** "Where to eat this": verified restaurants whose listed inventory genuinely matches the dish, plus a Near-me shortcut. */
export const WhereToEat: React.FC<Props> = ({ food }) => {
  const { language, restaurants, selectedProvince, setSelectedFood, setSelectedRestaurant, setIsNearMeModalOpen } = useApp();
  const userCoords = useMemo(() => readStoredUserGps(), [food.id]);
  const matches = useMemo(
    () => findRestaurantsServingDish(food, restaurants, userCoords, selectedProvince || 'រាជធានីភ្នំពេញ').slice(0, 4),
    [food, restaurants, userCoords, selectedProvince]
  );

  const openNearMe = () => {
    if (typeof window !== 'undefined') {
      (window as any).__kft_near_me_initial_tab = 'restaurants';
      (window as any).__kft_near_me_initial_query = food.nameKh;
      (window as any).__kft_near_me_initial_food = food;
    }
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
            const matchInfo = matchShopToProductQuery(r, food.nameKh, food);
            const matchedDishLabel = matchInfo.matchedInventoryItems[0] || food.nameKh;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedFood(null);
                  setSelectedRestaurant(r);
                }}
                className="w-full min-h-[52px] flex items-center gap-3 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 text-left active:scale-[0.98] transition cursor-pointer"
              >
                <ShopAvatar restaurant={r} alt={loc.name} className="w-10 h-10 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{loc.name}</span>
                  <span className="block text-[11px] text-emerald-600 dark:text-emerald-400 font-medium line-clamp-1">
                    🍜 {matchedDishLabel} • {translateProvince(r.provinceKh || loc.province, language)}
                  </span>
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

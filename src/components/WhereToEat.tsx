import React, { useMemo } from 'react';
import { Navigation, Store } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isGpipRegisteredRestaurant, openRestaurantGoogleExternal, type FoodItem, type Restaurant } from '../types';
import { tr } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';

// Transparent keyword table: English dish-name keyword -> Khmer fragment that restaurants list in signatureDishesKh
const DISH_KEYWORDS: Array<{ en: string; kh: string }> = [
  { en: 'amok', kh: 'អាម៉ុក' },
  { en: 'lok lak', kh: 'ឡុកឡាក់' },
  { en: 'kuyteav', kh: 'គុយទាវ' },
  { en: 'kuy teav', kh: 'គុយទាវ' },
  { en: 'banh chao', kh: 'បាញ់ឆែវ' },
  { en: 'korko', kh: 'កកូរ' },
  { en: 'machu', kh: 'ម្ជូរ' },
  { en: 'sour soup', kh: 'ម្ជូរ' },
  { en: 'prahok', kh: 'ប្រហុក' },
  { en: 'crab', kh: 'ក្តាម' },
  { en: 'squid', kh: 'មឹក' },
  { en: 'banh chok', kh: 'នំបញ្ចុក' },
  { en: 'pleah', kh: 'ភ្លា' },
  { en: 'curry', kh: 'ការី' },
  { en: 'num pang', kh: 'នំប៉័ង' },
];

export function findRestaurantsServingDish(food: FoodItem, restaurants: Restaurant[]): Restaurant[] {
  const nameKh = (food.nameKh || '').trim();
  const nameEn = (food.nameEn || '').toLowerCase();
  const khFragments = DISH_KEYWORDS.filter((k) => nameEn.includes(k.en)).map((k) => k.kh);

  const scored = restaurants
    .filter((r) => r.status === 'approved' || r.status === undefined)
    .map((r) => {
      const sigs = r.signatureDishesKh || [];
      let score = 0;
      for (const sig of sigs) {
        if (nameKh.length >= 4 && (sig.includes(nameKh) || nameKh.includes(sig))) score += 3;
        for (const frag of khFragments) if (sig.includes(frag)) score += 1;
      }
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.r.rating ?? 0) - (a.r.rating ?? 0));
  return scored.map((x) => x.r);
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
                    openRestaurantGoogleExternal(r, 'search');
                  }
                }}
                className="w-full min-h-[52px] flex items-center gap-3 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/60 text-left active:scale-[0.98] transition cursor-pointer"
              >
                <img src={r.photoUrl} alt={loc.name} loading="lazy" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-slate-100" />
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

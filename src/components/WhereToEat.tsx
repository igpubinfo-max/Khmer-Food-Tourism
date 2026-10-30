import React, { useMemo } from 'react';
import { MapPin, Navigation, Store } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { FoodItem, Restaurant } from '../types';
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
    <div className="space-y-2">
      <h3 className="font-bold text-[#0F172A] dark:text-white text-sm flex items-center gap-1.5">
        <Store className="w-4 h-4 text-[#059669]" />
        {tr(language, 'កន្លែងញ៉ាំម្ហូបនេះ', 'Where to eat this', '哪里可以吃到')}
      </h3>

      {matches.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
          {tr(
            language,
            'មិនទាន់មានហាងក្នុងបញ្ជីដែលដាក់ម្ហូបនេះជាម្ហូបពិសេសទេ។ សាកល្បង «នៅជិតខ្ញុំ»។',
            'No listed restaurant has this as a signature dish yet. Try “Near me”.',
            '暂无餐厅将此菜列为招牌菜，试试“附近”。'
          )}
        </p>
      ) : (
        <div className="space-y-2">
          {matches.map((r) => {
            const loc = getLocalizedRestaurant(r, language);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedFood(null);
                  setSelectedRestaurant(r);
                }}
                className="w-full min-h-[64px] flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left active:scale-[0.98] transition cursor-pointer"
              >
                <img src={r.photoUrl} alt={loc.name} loading="lazy" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-slate-100" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{loc.name}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{loc.province}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        ℹ️ {tr(language, 'ផ្គូផ្គងតាមម្ហូបពិសេសដែលហាងបានចុះបញ្ជី', "Matched by each restaurant's listed signature dishes", '根据餐厅登记的招牌菜匹配')}
      </p>

      <button
        type="button"
        onClick={openNearMe}
        className="min-h-[44px] px-4 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-sm font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
      >
        <Navigation className="w-4 h-4" />
        {tr(language, 'រកហាងនៅជិតខ្ញុំ', 'Find restaurants near me', '查找附近餐厅')}
      </button>
    </div>
  );
};

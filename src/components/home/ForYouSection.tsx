import React from 'react';
import { Clock, Sunrise, Sun, Coffee, Moon, RefreshCw } from 'lucide-react';
import type { FoodItem, Language } from '../../types';
import { tr } from '../../utils/i18n';
import { getLocalizedFood } from '../../utils/zhDynamicTranslator';
import { SectionHeader } from './SectionHeader';
import { IconFoodPicks } from '../icons/HandcraftedIcons';
import { FALLBACK_IMG, resolveHomePhoto, type MealSlot, headingFont } from './homeUtils';

interface Props {
  language: Language;
  slot: MealSlot;
  foods: FoodItem[];
  onSelectSlot?: (slot: MealSlot) => void;
  onShuffle?: () => void;
  onOpenFood: (food: FoodItem) => void;
  onSeeAll: () => void;
}

const SLOT_META: Record<
  MealSlot,
  { icon: React.ElementType; km: string; en: string; zh: string; tabKm: string; tabEn: string; tabZh: string }
> = {
  breakfast: {
    icon: Sunrise,
    km: 'ស័ក្តិសមសម្រាប់ពេលព្រឹក',
    en: 'Authentic Khmer Breakfast',
    zh: '柬式早餐精选',
    tabKm: 'ពេលព្រឹក',
    tabEn: 'Breakfast',
    tabZh: '早餐',
  },
  lunch: {
    icon: Sun,
    km: 'ស័ក្តិសមសម្រាប់ពេលថ្ងៃត្រង់',
    en: 'Authentic Khmer Lunch',
    zh: '柬式午餐精选',
    tabKm: 'ថ្ងៃត្រង់',
    tabEn: 'Lunch',
    tabZh: '午餐',
  },
  snack: {
    icon: Coffee,
    km: 'ស័ក្តិសមសម្រាប់ពេលរសៀល',
    en: 'Afternoon Snacks & Desserts',
    zh: '下午茶与甜点',
    tabKm: 'រសៀល',
    tabEn: 'Snack',
    tabZh: '下午茶',
  },
  dinner: {
    icon: Moon,
    km: 'ស័ក្តិសមសម្រាប់ពេលល្ងាច',
    en: 'Authentic Khmer Dinner',
    zh: '柬式晚餐精选',
    tabKm: 'ពេលល្ងាច',
    tabEn: 'Dinner',
    tabZh: '晚餐',
  },
};

const ALL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

const ForYouSectionInner: React.FC<Props> = ({
  language,
  slot,
  foods,
  onSelectSlot,
  onShuffle,
  onOpenFood,
  onSeeAll,
}) => {
  if (!foods.length) return null;
  const [hero, ...rest] = foods;
  const heroLoc = getLocalizedFood(hero, language);
  const meta = SLOT_META[slot];
  const SlotIcon = meta.icon;
  const slotLabel = tr(language, meta.km, meta.en, meta.zh);

  return (
    <section className="space-y-3">
      <SectionHeader
        icon={IconFoodPicks}
        title={tr(language, 'មុខម្ហូបប្រចាំពេល', 'Recommended Dishes', '时段精选美食')}
        subtitle={tr(language, 'តាមទម្លាប់ញ៉ាំអាហារខ្មែរពិតប្រាកដ', 'Authentic Cambodian meals by time of day', '地道高棉一日三餐与下午茶推荐')}
        actionLabel={tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}
        onAction={onSeeAll}
      />

      {onSelectSlot && (
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1">
            {ALL_SLOTS.map((s) => {
              const m = SLOT_META[s];
              const Icon = m.icon;
              const active = slot === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSelectSlot(s)}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center gap-1 transition cursor-pointer ${
                    active
                      ? 'bg-[#064E3B] text-amber-300 shadow-xs'
                      : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tr(language, m.tabKm, m.tabEn, m.tabZh)}</span>
                </button>
              );
            })}
          </div>
          {onShuffle && (
            <button
              type="button"
              onClick={onShuffle}
              title={tr(language, 'ប្តូរមុខម្ហូប', 'Refresh dishes', '换一批')}
              className="p-2 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs shrink-0 active:scale-95 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => onOpenFood(hero)}
        className="relative w-full h-52 rounded-3xl overflow-hidden text-left shadow-lg active:scale-[0.98] transition cursor-pointer"
      >
        <img
          src={resolveHomePhoto(hero.photoUrl, hero.photoUpdatedAt)}
          alt={heroLoc.name}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_IMG;
          }}
          className="absolute inset-0 w-full h-full object-cover bg-slate-800"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/65 text-amber-200 text-[11px] font-bold inline-flex items-center gap-1.5">
          <SlotIcon className="w-3.5 h-3.5" />
          {slotLabel}
        </span>
        <span className="absolute bottom-0 inset-x-0 p-4">
          <span className={`${headingFont(language)} text-lg leading-snug text-white line-clamp-2`}>{heroLoc.name}</span>
          <span className="mt-1 flex items-center gap-3 text-xs text-emerald-100">
            <span className="truncate">{heroLoc.category}</span>
            {(heroLoc.cookTime || heroLoc.prepTime) && (
              <span className="inline-flex items-center gap-1 shrink-0 text-amber-200">
                <Clock className="w-3.5 h-3.5" />
                {heroLoc.cookTime || heroLoc.prepTime}
              </span>
            )}
          </span>
        </span>
      </button>

      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {rest.slice(0, 2).map((food) => {
            const loc = getLocalizedFood(food, language);
            return (
              <button
                key={food.id}
                type="button"
                onClick={() => onOpenFood(food)}
                className="flex items-center gap-2.5 p-2 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-sm text-left active:scale-[0.97] transition cursor-pointer min-w-0"
              >
                <img
                  src={resolveHomePhoto(food.photoUrl, food.photoUpdatedAt)}
                  alt={loc.name}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_IMG;
                  }}
                  className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-200 dark:bg-slate-700"
                />
                <span className="min-w-0 flex-1">
                  <span className="text-[13px] font-bold leading-snug text-slate-900 dark:text-white line-clamp-2">
                    {loc.name}
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {loc.category}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export const ForYouSection = React.memo(ForYouSectionInner);

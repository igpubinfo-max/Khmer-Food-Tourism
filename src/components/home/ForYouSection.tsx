import React from 'react';
import { Clock, Sunrise, Sun, Coffee, Moon } from 'lucide-react';
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
  onOpenFood: (food: FoodItem) => void;
  onSeeAll: () => void;
}

const SLOT_META: Record<MealSlot, { icon: React.ElementType; km: string; en: string; zh: string }> = {
  breakfast: { icon: Sunrise, km: 'ស័ក្តិសមសម្រាប់ពេលព្រឹក', en: 'Recommended for breakfast', zh: '早餐精选' },
  lunch: { icon: Sun, km: 'ស័ក្តិសមសម្រាប់ពេលថ្ងៃត្រង់', en: 'Recommended for lunch', zh: '午餐精选' },
  snack: { icon: Coffee, km: 'ស័ក្តិសមសម្រាប់ពេលរសៀល', en: 'Recommended for afternoon', zh: '下午茶精选' },
  dinner: { icon: Moon, km: 'ស័ក្តិសមសម្រាប់ពេលល្ងាច', en: 'Recommended for dinner', zh: '晚餐精选' },
};

const ForYouSectionInner: React.FC<Props> = ({ language, slot, foods, onOpenFood, onSeeAll }) => {
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
        subtitle={tr(language, 'ជ្រើសរើសតាមពេលវេលាបច្ចុប្បន្ន', 'Curated for this time of day', '根据当前时段为您精选')}
        actionLabel={tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}
        onAction={onSeeAll}
      />

      <button
        type="button"
        onClick={() => onOpenFood(hero)}
        className="relative w-full h-52 rounded-3xl overflow-hidden text-left shadow-lg active:scale-[0.98] transition cursor-pointer"
      >
        <img
          src={resolveHomePhoto(hero.photoUrl)}
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
                  src={resolveHomePhoto(food.photoUrl)}
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

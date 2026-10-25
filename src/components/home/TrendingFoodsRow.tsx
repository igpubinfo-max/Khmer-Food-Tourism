import React from 'react';
import { MapPin, ChevronRight } from 'lucide-react';
import type { TrendingFoodItem, Language } from '../../types';
import { tr } from '../../utils/i18n';
import { translateSignatureDish } from '../../utils/zhDynamicTranslator';

interface Props {
  language: Language;
  items: TrendingFoodItem[];
  onOpen: (item: TrendingFoodItem) => void;
  onExploreAll?: () => void;
}

/** Horizontal, swipeable list of trending foods. */
export const TrendingFoodsRow: React.FC<Props> = ({ language, items, onOpen, onExploreAll }) => (
  <section className="space-y-2.5">
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-moul text-base text-[#064E3B] dark:text-emerald-300">
        🔥 {tr(language, 'ម្ហូបកំពុងពេញនិយម', 'Trending Khmer Food', '热门高棉美食')}
      </h3>
      {onExploreAll && (
        <button
          type="button"
          onClick={onExploreAll}
          className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-extrabold flex items-center gap-0.5 active:scale-95 transition cursor-pointer"
        >
          <span>{tr(language, 'ស្វែងរកតាមអនឡាញ', 'Online Discovery', '在线美食发现')}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
    <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pb-1">
      {items.map((item) => {
        const name =
          language === 'km'
            ? item.foodNameKh
            : language === 'zh'
            ? translateSignatureDish(item.foodNameKh, 'zh')
            : item.foodNameEn;
        const province = language === 'km' ? item.provinceKh : item.provinceEn;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item)}
            className="snap-start shrink-0 w-44 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden text-left active:scale-[0.97] transition cursor-pointer"
          >
            <img src={item.photoUrl} alt={name} loading="lazy" className="w-full h-28 object-cover bg-slate-100" />
            <span className="block p-2.5">
              <span className="block text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 min-h-[2.5rem]">{name}</span>
              <span className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{province}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  </section>
);

import React from 'react';
import { MapPin, ChevronRight, Flame } from 'lucide-react';
import type { TrendingFoodItem, Language } from '../../types';
import { AutoMarquee } from './AutoMarquee';
import { tr, translateProvinceName } from '../../utils/i18n';
import { translateSignatureDish, sanitizeStrictLanguageText } from '../../utils/zhDynamicTranslator';

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
      <h3 className="font-moul text-base text-[#064E3B] dark:text-emerald-300 flex items-center gap-2">
        <Flame className="w-4 h-4 text-amber-500 shrink-0" />
        <span>{tr(language, 'ម្ហូបកំពុងពេញនិយម', 'Trending Khmer Food', '热门高棉美食')}</span>
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
    <AutoMarquee durationSec={Math.max(36, (items || []).length * 6)}>
      {(items || []).map((item) => {
        if (!item || !item.id) return null;
        const safeKh = item.foodNameKh || item.foodNameEn || 'ម្ហូបខ្មែរ';
        const safeEn = item.foodNameEn || item.foodNameKh || 'Khmer Dish';
        const rawName =
          language === 'km'
            ? safeKh
            : language === 'zh'
            ? translateSignatureDish(safeKh, 'zh')
            : safeEn;
        const name = sanitizeStrictLanguageText(rawName || safeKh, language) || safeKh;
        const province = translateProvinceName(
          item.provinceKh || 'កម្ពុជា',
          item.provinceEn || 'Cambodia',
          language
        );
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item)}
            className="shrink-0 w-48 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden text-left active:scale-[0.97] transition cursor-pointer"
          >
            <img
              src={item.photoUrl || '/welcome/hero-bg.webp'}
              alt={name}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/welcome/hero-bg.webp';
              }}
              className="w-full h-28 object-cover bg-slate-100 dark:bg-slate-700"
            />
            <span className="block p-3">
              <span className="block text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 min-h-[2.6rem]">{name}</span>
              <span className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{province}</span>
              </span>
            </span>
          </button>
        );
      })}
    </AutoMarquee>
  </section>
);

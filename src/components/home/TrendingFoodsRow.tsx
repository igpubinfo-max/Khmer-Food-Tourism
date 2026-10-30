import React from 'react';
import { MapPin } from 'lucide-react';
import type { TrendingFoodItem, Language } from '../../types';
import { tr, translateProvinceName } from '../../utils/i18n';
import { translateSignatureDish, sanitizeStrictLanguageText } from '../../utils/zhDynamicTranslator';
import { SectionHeader } from './SectionHeader';
import { IconFlamePopular } from '../icons/HandcraftedIcons';
import { FALLBACK_IMG, resolveHomePhoto } from './homeUtils';

interface Props {
  language: Language;
  items: TrendingFoodItem[];
  onOpen: (item: TrendingFoodItem) => void;
  onExploreAll?: () => void;
}

const TrendingFoodsRowInner: React.FC<Props> = ({ language, items, onOpen, onExploreAll }) => (
  <section className="space-y-3">
    <SectionHeader
      icon={IconFlamePopular}
      title={tr(language, 'ម្ហូបពេញនិយមនៅកម្ពុជា', 'Popular Cambodian Dishes', '柬埔寨人气美食')}
      subtitle={tr(language, 'មុខម្ហូបប្រចាំតំបន់ និងអាហារតាមផ្លូវល្បីៗ', 'Regional specialties & local street food', '地方特色名菜与人气街头小吃')}
      actionLabel={onExploreAll ? tr(language, 'មើលវីដេអូម្ហូប', 'Food videos', '美食视频') : undefined}
      onAction={onExploreAll}
    />
    <div className="-mx-4 px-4 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-4 pb-1">
      {(items || []).map((item, index) => {
        if (!item || !item.id) return null;
        const safeKh = item.foodNameKh || item.foodNameEn || 'ម្ហូបខ្មែរ';
        const safeEn = item.foodNameEn || item.foodNameKh || 'Cambodian Dish';
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
            className="snap-start shrink-0 w-44 rounded-3xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-md overflow-hidden text-left active:scale-[0.97] transition cursor-pointer"
          >
            <span className="relative block h-32">
              <img
                src={resolveHomePhoto(item.photoUrl)}
                alt={name}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_IMG;
                }}
                className="absolute inset-0 w-full h-full object-cover bg-slate-100 dark:bg-slate-700"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
              <span className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center shadow">
                {index + 1}
              </span>
            </span>
            <span className="block p-3">
              <span className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 min-h-[2.5rem]">{name}</span>
              <span className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
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

export const TrendingFoodsRow = React.memo(TrendingFoodsRowInner);

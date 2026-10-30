import React, { useMemo } from 'react';
import { Star, MapPin } from 'lucide-react';
import type { Language, TouristDestination } from '../../types';
import { tr } from '../../utils/i18n';
import { getLocalizedDestination } from '../../utils/zhDynamicTranslator';
import { SectionHeader } from './SectionHeader';
import { IconNavTourism } from '../icons/HandcraftedIcons';
import { FALLBACK_IMG, headingFont } from './homeUtils';

interface Props {
  language: Language;
  destinations: TouristDestination[];
  onOpen: (destination: TouristDestination) => void;
  onSeeAll: () => void;
}

const PopularDestinationsInner: React.FC<Props> = ({ language, destinations, onOpen, onSeeAll }) => {
  const top = useMemo(() => {
    const valid = destinations.filter((d) => d && d.id && d.photoUrl);
    const score = (d: TouristDestination) => (d.isFeatured ? 10 : 0) + (d.rating || 0) * 2 + Math.min(d.reviewCount || 0, 300) * 0.01;
    return valid.sort((a, b) => score(b) - score(a)).slice(0, 8);
  }, [destinations]);

  if (!top.length) return null;

  return (
    <section className="space-y-3">
      <SectionHeader
        icon={IconNavTourism}
        title={tr(language, 'ស្វែងយល់ទឹកដីកម្ពុជា', 'Explore Cambodia', '探索柬埔寨')}
        subtitle={tr(language, 'តំបន់ទេសចរណ៍ល្បីៗទូទាំង ២៥ រាជធានី-ខេត្ត', 'Top sights across all 25 provinces', '遍布柬埔寨 25 省市的精选景点')}
        actionLabel={tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}
        onAction={onSeeAll}
      />
      <div className="-mx-4 px-4 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-4 pb-1">
        {top.map((dest) => {
          const loc = getLocalizedDestination(dest, language);
          return (
            <button
              key={dest.id}
              type="button"
              onClick={() => onOpen(dest)}
              className="snap-start relative shrink-0 w-64 h-44 rounded-3xl overflow-hidden text-left shadow-lg active:scale-[0.97] transition cursor-pointer"
            >
              <img
                src={dest.photoUrl || FALLBACK_IMG}
                alt={loc.name}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_IMG;
                }}
                className="absolute inset-0 w-full h-full object-cover bg-slate-200 dark:bg-slate-700"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
              {typeof dest.rating === 'number' && dest.rating > 0 && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/65 text-white text-[11px] font-bold inline-flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                  {dest.rating.toFixed(1)}
                </span>
              )}
              <span className="absolute bottom-0 inset-x-0 p-3.5">
                <span className="block text-[11px] font-bold text-amber-300 truncate">{loc.category}</span>
                <span className={`${headingFont(language)} text-[15px] leading-snug text-white line-clamp-2 mt-0.5`}>
                  {loc.name}
                </span>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-100">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{loc.province}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export const PopularDestinations = React.memo(PopularDestinationsInner);

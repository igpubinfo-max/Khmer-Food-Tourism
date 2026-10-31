import React, { useMemo, useState } from 'react';
import { Star, MapPin } from 'lucide-react';
import type { Language, Restaurant } from '../../types';
import { isRestaurantPremiumActive, isGpipRegisteredRestaurant, openRestaurantGoogleExternal } from '../../types';
import { tr } from '../../utils/i18n';
import { getLocalizedRestaurant } from '../../utils/zhDynamicTranslator';
import { SectionHeader } from './SectionHeader';
import { IconNavShop } from '../icons/HandcraftedIcons';
import { ShopAvatar } from '../icons/DefaultShopIcon';

interface Props {
  language: Language;
  restaurants: Restaurant[];
  onOpen: (restaurant: Restaurant) => void;
  onSeeAll: () => void;
}

const PROVINCES = [
  { id: '', km: 'ទាំងអស់', en: 'All', zh: '全部' },
  { id: 'ភ្នំពេញ', km: 'ភ្នំពេញ', en: 'Phnom Penh', zh: '金边' },
  { id: 'សៀមរាប', km: 'សៀមរាប', en: 'Siem Reap', zh: '暹粒' },
  { id: 'បាត់ដំបង', km: 'បាត់ដំបង', en: 'Battambang', zh: '马德望' },
  { id: 'កំពត', km: 'កំពត', en: 'Kampot', zh: '贡布' },
  { id: 'ព្រះសីហនុ', km: 'ព្រះសីហនុ', en: 'Sihanoukville', zh: '西哈努克' },
];

const PopularShopsInner: React.FC<Props> = ({ language, restaurants, onOpen, onSeeAll }) => {
  const [province, setProvince] = useState('');

  const ranked = useMemo(() => {
    const approved = restaurants.filter((r) => r && r.id && (r.status === 'approved' || !r.status));
    const score = (r: Restaurant) =>
      (r.isVerified ? 2000 : 0) +
      (isGpipRegisteredRestaurant(r) ? 1000 : 0) +
      (r.rating || 0) * 20 +
      Math.min(r.reviewCount || 0, 200) * 0.15 +
      (isRestaurantPremiumActive(r) ? 6 : 0);
    return approved.sort((a, b) => score(b) - score(a));
  }, [restaurants]);

  const visible = useMemo(() => {
    const list = province ? ranked.filter((r) => (r.provinceKh || '').includes(province)) : ranked;
    return list.slice(0, 10);
  }, [ranked, province]);

  if (!ranked.length) return null;

  return (
    <section className="space-y-3">
      <SectionHeader
        icon={IconNavShop}
        title={tr(language, 'ហាងអាហារពេញនិយម', 'Popular Places to Eat', '热门餐厅推荐')}
        subtitle={tr(language, 'ហាងដែលមានការវាយតម្លៃខ្ពស់តាមបណ្តាខេត្ត-ក្រុង', 'Highly rated dining spots across Cambodia', '深受食客喜爱的高分好店')}
        actionLabel={tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}
        onAction={onSeeAll}
      />

      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
        {PROVINCES.map((p) => {
          const active = province === p.id;
          return (
            <button
              key={p.id || 'all'}
              type="button"
              onClick={() => setProvince(p.id)}
              aria-pressed={active}
              className={`shrink-0 min-h-[36px] px-3.5 rounded-full text-xs font-bold border transition cursor-pointer active:scale-95 ${
                active
                  ? 'bg-[#064E3B] text-white border-[#064E3B] dark:bg-amber-400 dark:text-slate-950 dark:border-amber-400 shadow-sm'
                  : 'bg-white dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10'
              }`}
            >
              {tr(language, p.km, p.en, p.zh)}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-600 text-center text-sm text-slate-500 dark:text-slate-400">
          {tr(
            language,
            'មិនទាន់មានហាងក្នុងតំបន់នេះនៅឡើយទេ',
            'No places listed in this area yet',
            '该地区暂无店铺'
          )}
        </div>
      ) : (
        <div className="-mx-4 px-4 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-4 pb-1">
          {visible.map((rest) => {
            const loc = getLocalizedRestaurant(rest, language);
            const featured = isRestaurantPremiumActive(rest);
            const isRegistered = isGpipRegisteredRestaurant(rest);
            return (
              <button
                key={rest.id}
                type="button"
                onClick={() => {
                  if (isRegistered) {
                    onOpen(rest);
                  } else {
                    openRestaurantGoogleExternal(rest, 'maps');
                  }
                }}
                className="snap-start shrink-0 w-56 rounded-3xl overflow-hidden bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-md text-left active:scale-[0.97] transition cursor-pointer"
              >
                <span className="relative block h-32">
                  <ShopAvatar
                    restaurant={rest}
                    alt={loc.name}
                    className="absolute inset-0 w-full h-full rounded-none border-0"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                  {typeof rest.rating === 'number' && rest.rating > 0 && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/65 text-white text-[11px] font-bold inline-flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                      {rest.rating.toFixed(1)}
                    </span>
                  )}
                  {featured && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black inline-flex items-center gap-1">
                      {tr(language, 'ណែនាំ', 'Featured', '精选')}
                    </span>
                  )}
                </span>
                <span className="block p-3">
                  <span className="text-sm font-bold leading-snug text-slate-900 dark:text-white line-clamp-1">
                    {loc.name}
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{loc.province}</span>
                    </span>
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

export const PopularDestinationsPlaceholder = null;
export const PopularShops = React.memo(PopularShopsInner);

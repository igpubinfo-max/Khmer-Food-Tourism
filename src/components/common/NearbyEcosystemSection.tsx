import React, { useMemo } from 'react';
import { BedDouble, Landmark, MapPin, Navigation, Star, Utensils } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { tr } from '../../utils/i18n';
import { getLocalizedDestination, getLocalizedRestaurant } from '../../utils/zhDynamicTranslator';
import { isHotelBusinessRecord, openExternalUrlNativeSafe } from '../../types';
import type { Language, Restaurant, TouristDestination } from '../../types';
import { CambodiaChoiceBadge, isCambodiaChoiceEligible } from './CambodiaChoiceAndRatings';

const MAX_PER_GROUP = 4;
const NEAR_RADIUS_KM = 30;

export const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const validCoord = (lat: unknown, lon: unknown): boolean =>
  typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0);

const formatDistance = (km: number, language: Language): string =>
  km < 1
    ? `${Math.max(50, Math.round((km * 1000) / 10) * 10)} ${tr(language, 'ម៉ែត្រ', 'm', '米')}`
    : `${km < 10 ? km.toFixed(1) : Math.round(km)} ${tr(language, 'គ.ម', 'km', '公里')}`;

type NearbyEntry =
  | { type: 'restaurant'; id: string; item: Restaurant; km: number }
  | { type: 'destination'; id: string; item: TouristDestination; km: number };

interface NearbyEcosystemProps {
  language: Language;
  /** Currently opened listing (tourist destination, hotel or restaurant). */
  origin: { id: string; latitude?: number; longitude?: number; provinceKh?: string; provinceEn?: string };
}

export const NearbyEcosystemSection: React.FC<NearbyEcosystemProps> = ({ language, origin }) => {
  const { restaurants, destinations, setSelectedRestaurant, setSelectedDestination } = useApp();

  const groups = useMemo(() => {
    const hasOrigin = validCoord(origin.latitude, origin.longitude);
    const sameProvince = (p?: { provinceKh?: string; provinceEn?: string }) =>
      Boolean(p) &&
      ((origin.provinceKh && p!.provinceKh === origin.provinceKh) || (origin.provinceEn && p!.provinceEn === origin.provinceEn));

    const rank = <T extends { id: string; latitude?: number; longitude?: number; provinceKh?: string; provinceEn?: string; rating?: number }>(
      list: T[],
      make: (item: T, km: number) => NearbyEntry
    ): NearbyEntry[] => {
      const withKm = list
        .filter((x) => x.id !== origin.id)
        .map((x) => ({
          x,
          km: hasOrigin && validCoord(x.latitude, x.longitude)
            ? haversineKm(origin.latitude as number, origin.longitude as number, x.latitude as number, x.longitude as number)
            : Number.POSITIVE_INFINITY,
        }));
      const near = withKm.filter((e) => e.km <= NEAR_RADIUS_KM).sort((a, b) => a.km - b.km);
      let picked = near.slice(0, MAX_PER_GROUP);
      if (picked.length < MAX_PER_GROUP) {
        // Fallback: same-province items (nearest first, otherwise best rated)
        const used = new Set(picked.map((e) => e.x.id));
        const prov = withKm
          .filter((e) => !used.has(e.x.id) && sameProvince(e.x))
          .sort((a, b) => (a.km === b.km ? Number(b.x.rating || 0) - Number(a.x.rating || 0) : a.km - b.km));
        picked = [...picked, ...prov.slice(0, MAX_PER_GROUP - picked.length)];
      }
      return picked.map((e) => make(e.x, e.km));
    };

    const approved = (restaurants || []).filter((r) => r && r.status === 'approved');
    const foodShops = approved.filter((r) => !isHotelBusinessRecord(r));
    const hotelShops = approved.filter((r) => isHotelBusinessRecord(r));
    const dests = destinations || [];

    const food = rank(foodShops, (item, km) => ({ type: 'restaurant', id: item.id, item, km }));
    const stays = [
      ...rank(dests.filter((d) => d.categorySlug === 'hotel'), (item, km) => ({ type: 'destination', id: item.id, item, km }) as NearbyEntry),
      ...rank(hotelShops, (item, km) => ({ type: 'restaurant', id: item.id, item, km }) as NearbyEntry),
    ]
      .sort((a, b) => a.km - b.km)
      .slice(0, MAX_PER_GROUP);
    const attractions = rank(dests.filter((d) => d.categorySlug !== 'hotel'), (item, km) => ({ type: 'destination', id: item.id, item, km }));
    return { food, stays, attractions };
  }, [restaurants, destinations, origin.id, origin.latitude, origin.longitude, origin.provinceKh, origin.provinceEn]);

  const open = (e: NearbyEntry) => {
    if (e.type === 'restaurant') setSelectedRestaurant(e.item);
    else setSelectedDestination(e.item);
  };

  const directions = (e: NearbyEntry, ev: React.MouseEvent) => {
    ev.stopPropagation();
    const { latitude, longitude, mapUrl } = e.item as { latitude?: number; longitude?: number; mapUrl?: string };
    openExternalUrlNativeSafe(
      validCoord(latitude, longitude)
        ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
        : mapUrl || 'https://www.google.com/maps'
    );
  };

  const renderGroup = (
    testId: string,
    icon: React.ReactNode,
    title: string,
    entries: NearbyEntry[]
  ) => {
    if (!entries.length) return null;
    return (
      <div data-testid={testId} className="space-y-2">
        <h5 className="flex items-center gap-1.5 font-extrabold text-[13px] leading-[1.6] text-slate-900 font-khmer">
          {icon}
          {title}
        </h5>
        <div className="grid gap-2">
          {entries.map((e) => {
            const loc = e.type === 'restaurant' ? getLocalizedRestaurant(e.item, language) : getLocalizedDestination(e.item, language);
            const photo = (e.item.photoUrl || '').trim();
            const rating = Number(e.item.rating);
            return (
              <article
                key={`${e.type}-${e.id}`}
                onClick={() => open(e)}
                className="flex items-center gap-2.5 rounded-2xl bg-white border border-slate-200 p-2 cursor-pointer active:scale-[0.99] hover:border-emerald-400 transition"
              >
                <div className="w-14 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  {photo && !photo.startsWith('data:image/svg') ? (
                    <img src={photo} alt={loc.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0 font-khmer">
                  <div className="font-extrabold text-[13px] leading-[1.6] text-slate-900 line-clamp-1">{loc.name}</div>
                  <div className="flex items-center gap-2 flex-wrap text-[11.5px] leading-[1.6]">
                    {rating > 0 && (
                      <span className="inline-flex items-center gap-0.5 font-extrabold text-slate-800">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {rating.toFixed(1)}
                      </span>
                    )}
                    {Number.isFinite(e.km) && (
                      <span className="inline-flex items-center gap-0.5 font-extrabold text-emerald-700">
                        <MapPin className="w-3 h-3" />
                        {formatDistance(e.km, language)}
                      </span>
                    )}
                    {isCambodiaChoiceEligible(e.item) && <CambodiaChoiceBadge language={language} size="sm" />}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(ev) => directions(e, ev)}
                  aria-label={tr(language, 'បង្ហាញផ្លូវ', 'Directions', '导航')}
                  className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 active:scale-95"
                >
                  <Navigation className="w-4 h-4" />
                </button>
              </article>
            );
          })}
        </div>
      </div>
    );
  };

  if (!groups.food.length && !groups.stays.length && !groups.attractions.length) return null;

  return (
    <section data-testid="nearby-ecosystem" className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 space-y-3.5">
      <div className="font-khmer">
        <h4 className="font-extrabold text-sm leading-[1.6] text-slate-900">
          {tr(language, 'នៅជិតតំបន់នេះ', 'Nearby Food, Stays & Attractions', '附近的美食、住宿与景点')}
        </h4>
        <p className="text-[11.5px] leading-[1.6] text-slate-600 font-semibold">
          {tr(
            language,
            'ទៅលេងទីនេះ គួរញ៉ាំអីនៅជិតនោះ? និងគេងនៅសណ្ឋាគារណា?',
            'Visiting here? See where to eat and where to stay nearby.',
            '来这里游玩？看看附近吃什么、住哪里。'
          )}
        </p>
      </div>
      {renderGroup('nearby-food', <Utensils className="w-4 h-4 text-orange-600" />, tr(language, 'ហាងអាហារនៅជិតនេះ', 'Nearby Restaurants', '附近餐厅'), groups.food)}
      {renderGroup('nearby-stays', <BedDouble className="w-4 h-4 text-sky-600" />, tr(language, 'សណ្ឋាគារនៅជិតនេះ', 'Nearby Hotels & Stays', '附近酒店与住宿'), groups.stays)}
      {renderGroup('nearby-attractions', <Landmark className="w-4 h-4 text-emerald-700" />, tr(language, 'កន្លែងដើរលេងនៅជិតនេះ', 'Nearby Attractions', '附近景点'), groups.attractions)}
    </section>
  );
};

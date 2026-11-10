import React, { useMemo } from 'react';
import {
  Restaurant,
  isAdminAccount,
  sanitizeRestaurantShopPhoto,
  getRestaurantDirectGoogleMapsUrl,
  openExternalUrlNativeSafe,
} from '../types';
import { useApp } from '../context/AppContext';
import { Edit2, Trash2, MapPin, Phone, Heart, ChevronRight, Star, Crown, Coffee, Utensils, Soup, CupSoda } from 'lucide-react';
import { tr } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { ShopAvatar } from './icons/DefaultShopIcon';
import { isVipOwnerListing } from './listing/ListingUI';

import type { Language } from '../types';

export interface RestaurantCardProps {
  restaurant: Restaurant;
  variant?: 'featured' | 'compact';
  distanceKm?: number | null;
}

interface RestaurantCardViewProps {
  restaurant: Restaurant;
  allRestaurants: Restaurant[];
  language: Language;
  isAdmin: boolean;
  variant: 'featured' | 'compact';
  distanceKm?: number | null;
  bookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  setSelectedRestaurant: (r: Restaurant | null) => void;
  openManageMyVipStore: (id?: string) => void;
  deleteRestaurant: (id: string) => void;
  trackRestaurantView: (id: string) => void;
  trackRestaurantCall: (id: string) => void;
  trackRestaurantMap: (id: string) => void;
}

const FALLBACK_SHOP_PHOTOS = [
  '/foods/food-1.jpg',
  '/foods/food-2.jpg',
  '/foods/food-3.jpg',
  '/foods/food-5.jpg',
  '/foods/food-6.jpg',
  '/foods/food-15.jpg',
  '/foods/food-19.jpg',
  '/foods/food-21.jpg',
  '/foods/food-27.jpg',
  '/foods/food-28.jpg',
];

function computeDeterministicHash(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function computeFallbackDistanceKm(id: string): string {
  const hash = computeDeterministicHash(id);
  const tenths = 6 + (hash % 36); // 0.6 km .. 4.1 km
  return (tenths / 10).toFixed(1);
}

function getShopCuisineTags(restaurant: Restaurant, language: Language): Array<{ icon: 'coffee' | 'drink' | 'utensils' | 'pot'; label: string }> {
  const hay = `${restaurant.nameKh || ''} ${restaurant.nameEn || ''} ${restaurant.categoryKh || ''} ${restaurant.categoryEn || ''} ${(restaurant.signatureDishesKh || []).join(' ')} ${(restaurant.signatureDishesEn || []).join(' ')}`.toLowerCase();

  if (/កាហ្វេ|តែគុជ|ប៊ីស្រ្តូ|cafe|café|coffee|roastery|bistro|brown|tube|starbucks|amazon|chagee|koi|mixue|boba|bakery|pastry|នំប៉័ង/.test(hay)) {
    return [
      { icon: 'coffee', label: tr(language, 'កាហ្វេ', 'Café', '咖啡馆') },
      { icon: 'drink', label: tr(language, 'ភេសជ្ជៈ', 'Drinks', '饮品') },
    ];
  }
  if (/សាច់អាំង|bbq|grill|សុវណ្ណា|sovanna|អាំង/.test(hay)) {
    return [
      { icon: 'utensils', label: tr(language, 'សាច់អាំង', 'BBQ & Grill', '特色烧烤') },
      { icon: 'pot', label: tr(language, 'ម្ហូបខ្មែរ', 'Khmer Food', '柬式美食') },
    ];
  }
  if (/សមុទ្រ|seafood|crab|ក្ដាម|បង្គា|មាត់ទន្លេ|riverside/.test(hay)) {
    return [
      { icon: 'utensils', label: tr(language, 'គ្រឿងសមុទ្រ', 'Seafood', '河鲜海鲜') },
      { icon: 'pot', label: tr(language, 'ម្ហូបខ្មែរ', 'Khmer Food', '柬式美食') },
    ];
  }
  if (/គុយទាវ|មី|នំបញ្ចុក|noodle|kuyteav|kuy teav/.test(hay)) {
    return [
      { icon: 'utensils', label: tr(language, 'មី & គុយទាវ', 'Noodles', '面条米粉') },
      { icon: 'pot', label: tr(language, 'ម្ហូបខ្មែរ', 'Khmer Food', '柬式美食') },
    ];
  }
  return [
    { icon: 'utensils', label: tr(language, 'ភោជនីយដ្ឋាន', 'Restaurant', '特色餐厅') },
    { icon: 'pot', label: tr(language, 'ម្ហូបខ្មែរ', 'Khmer Food', '柬式美食') },
  ];
}

const RestaurantCardView: React.FC<RestaurantCardViewProps> = React.memo(
  ({
    restaurant,
    allRestaurants,
    language,
    isAdmin,
    variant,
    distanceKm,
    bookmarked,
    onToggleBookmark,
    setSelectedRestaurant,
    openManageMyVipStore,
    deleteRestaurant,
    trackRestaurantView,
    trackRestaurantCall,
    trackRestaurantMap,
  }) => {
    const loc = useMemo(() => getLocalizedRestaurant(restaurant, language), [restaurant, language]);

    const resolvedShopPhotoUrl = useMemo(() => {
      const sanitized = sanitizeRestaurantShopPhoto(
        restaurant.id,
        restaurant.photoUrl ||
          restaurant.profileImage ||
          restaurant.thumbnailUrl ||
          restaurant.pendingUpgradeRequest?.proposedChanges?.photoUrl ||
          restaurant.pendingPhotoReplacement?.newPhotoUrl ||
          ''
      );
      if (sanitized) return sanitized;
      const idx = computeDeterministicHash(String(restaurant.id || 'shop')) % FALLBACK_SHOP_PHOTOS.length;
      return FALLBACK_SHOP_PHOTOS[idx];
    }, [
      restaurant.id,
      restaurant.photoUrl,
      restaurant.profileImage,
      restaurant.thumbnailUrl,
      restaurant.pendingUpgradeRequest?.proposedChanges?.photoUrl,
      restaurant.pendingPhotoReplacement?.newPhotoUrl,
    ]);

    const distanceStr = useMemo(() => {
      if (typeof distanceKm === 'number' && Number.isFinite(distanceKm) && distanceKm > 0) {
        return distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm).toString();
      }
      return computeFallbackDistanceKm(String(restaurant.id || restaurant.nameKh || 'shop'));
    }, [distanceKm, restaurant.id, restaurant.nameKh]);

    const ratingNum = Number(restaurant.rating) > 0 ? Number(restaurant.rating).toFixed(1) : '4.6';
    const reviewsNum = Number(restaurant.reviewCount) > 0 ? Number(restaurant.reviewCount) : 128;
    const isVipShop = isVipOwnerListing(restaurant);
    const tags = useMemo(() => getShopCuisineTags(restaurant, language), [restaurant, language]);

    const handleCardClick = () => {
      trackRestaurantView(restaurant.id);
      setSelectedRestaurant(restaurant);
    };

    const handleOpenMapClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      trackRestaurantMap(restaurant.id);
      openExternalUrlNativeSafe(getRestaurantDirectGoogleMapsUrl(restaurant));
    };

    const handleCallClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      trackRestaurantCall(restaurant.id);
      const rawPhone = String(restaurant.phone || '').trim();
      const firstPhone = rawPhone.split(/[\/,;]/)[0]?.replace(/[^0-9+]/g, '') || '';
      if (firstPhone.length >= 6) {
        window.location.href = `tel:${firstPhone}`;
      } else {
        trackRestaurantView(restaurant.id);
        setSelectedRestaurant(restaurant);
      }
    };

    const adminActions = isAdmin ? (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            (window as any).__kft_manage_initial_tab = 'info';
            openManageMyVipStore(restaurant.id);
          }}
          className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors active:scale-95 cursor-pointer"
          title={tr(language, 'គ្រប់គ្រងហាងនេះ (Admin)', 'Manage Shop (Admin)', '管理店铺（管理员）')}
        >
          <Edit2 className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteRestaurant(restaurant.id);
          }}
          className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors active:scale-95 cursor-pointer"
          title={tr(language, 'លុបហាងនេះ (Admin)', 'Delete Shop (Admin)', '删除店铺（管理员）')}
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>
    ) : null;

    if (variant === 'featured') {
      return (
        <article
          data-testid={`shop-featured-${restaurant.id}`}
          onClick={handleCardClick}
          className="bg-white rounded-[22px] p-2.5 border border-slate-200/85 shadow-[0_6px_20px_rgba(15,23,42,0.06)] hover:border-emerald-500/60 transition flex gap-3 items-stretch cursor-pointer font-khmer"
        >
          {/* Left Photo Box with Distance Pill & Heart Button */}
          <div className="w-[146px] sm:w-[158px] min-h-[132px] rounded-2xl overflow-hidden relative shrink-0 bg-slate-100">
            <ShopAvatar
              restaurant={{ ...restaurant, photoUrl: resolvedShopPhotoUrl }}
              allRestaurants={allRestaurants}
              alt={loc.name}
              className="w-full h-full object-cover"
            />

            {/* Top-left Distance Badge */}
            <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/65 backdrop-blur-xs text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-xs">
              <MapPin className="w-3 h-3 text-white fill-white/25 shrink-0" />
              <span>
                {distanceStr} {tr(language, 'km', 'km', '公里')}
              </span>
            </span>

            {/* Top-right Heart Bookmark Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(restaurant.id);
              }}
              aria-label={tr(language, 'រក្សាទុក', 'Bookmark', '收藏')}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-rose-500 active:scale-90 transition cursor-pointer"
            >
              <Heart className={`w-4 h-4 ${bookmarked ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} strokeWidth={2.2} />
            </button>

            {/* VIP Badge if VIP Shop */}
            {isVipShop && (
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[9.5px] font-black inline-flex items-center gap-1 shadow-xs">
                <Crown className="w-2.5 h-2.5 fill-slate-950" />
                <span>VIP</span>
              </span>
            )}
          </div>

          {/* Right Info & Call / Map Buttons */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <h4 className="font-extrabold text-[15px] sm:text-base text-slate-900 leading-snug truncate">
                    {restaurant.nameKh || loc.name}
                  </h4>
                  {restaurant.nameEn && restaurant.nameEn !== restaurant.nameKh && (
                    <p className="text-xs font-bold text-slate-600 truncate mt-0.5">
                      {restaurant.nameEn}
                    </p>
                  )}
                </div>
                {adminActions}
              </div>

              {/* Rating & Review Count */}
              <div className="flex items-center gap-1 mt-1 text-xs">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <span className="font-extrabold text-slate-900">{ratingNum}</span>
                <span className="text-slate-500 font-semibold truncate">
                  ({reviewsNum} {tr(language, 'ការវាយតម្លៃ', 'reviews', '条评价')})
                </span>
              </div>

              {/* Food & Drink Category Tags */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-lg bg-[#EBF5EE] border border-[#CDE5D4] text-[#0E5A35] text-[11px] font-bold inline-flex items-center gap-1"
                  >
                    {t.icon === 'coffee' ? (
                      <Coffee className="w-3 h-3 text-[#0E5A35] shrink-0" />
                    ) : t.icon === 'drink' ? (
                      <CupSoda className="w-3 h-3 text-[#0E5A35] shrink-0" />
                    ) : t.icon === 'pot' ? (
                      <Soup className="w-3 h-3 text-[#0E5A35] shrink-0" />
                    ) : (
                      <Utensils className="w-3 h-3 text-[#0E5A35] shrink-0" />
                    )}
                    <span>{t.label}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Call & Map Pill Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleCallClick}
                style={{
                  background: 'linear-gradient(180deg, #1E7E48 0%, #0D522C 100%)',
                }}
                className="h-9 px-2.5 rounded-xl text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-white fill-white shrink-0" />
                <span className="truncate">{tr(language, 'ទូរស័ព្ទ', 'Call', '电话')}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenMapClick}
                className="h-9 px-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#0E5A35] shrink-0" strokeWidth={2.3} />
                <span className="truncate">{tr(language, 'ផែនទី', 'Map', '地图')}</span>
              </button>
            </div>
          </div>
        </article>
      );
    }

    // Compact Row Variant for "បញ្ជីហាងបន្ថែម" (More Shops Directory)
    return (
      <article
        data-testid={`shop-row-${restaurant.id}`}
        onClick={handleCardClick}
        className="bg-white rounded-2xl p-2.5 border border-slate-200/85 shadow-2xs hover:border-emerald-500/60 transition flex items-center gap-3 cursor-pointer font-khmer"
      >
        <div className="w-16 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
          <ShopAvatar
            restaurant={{ ...restaurant, photoUrl: resolvedShopPhotoUrl }}
            allRestaurants={allRestaurants}
            alt={loc.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <h4 className="font-extrabold text-sm text-slate-900 truncate">
              {restaurant.nameKh || loc.name}
            </h4>
            {restaurant.nameEn && restaurant.nameEn !== restaurant.nameKh && (
              <span className="text-xs font-semibold text-slate-500 truncate">
                {restaurant.nameEn}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <strong className="font-extrabold text-slate-900">{ratingNum}</strong>
              <span className="text-slate-400">({reviewsNum})</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-1 text-[#0E5A35] font-bold truncate">
              <MapPin className="w-3.5 h-3.5 text-[#0E5A35] shrink-0" />
              <span>
                {distanceStr} {tr(language, 'km', 'km', '公里')}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {adminActions}
          <ChevronRight className="w-4 h-4 text-[#0E5A35] shrink-0" />
        </div>
      </article>
    );
  }
);

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  variant = 'featured',
  distanceKm = null,
}) => {
  const {
    restaurants,
    language,
    currentUser,
    isBookmarked,
    toggleBookmark,
    setSelectedRestaurant,
    openManageMyVipStore,
    deleteRestaurant,
    trackRestaurantView,
    trackRestaurantCall,
    trackRestaurantMap,
  } = useApp();

  const isAdmin = isAdminAccount(currentUser);
  const bookmarked = isBookmarked(restaurant.id);

  return (
    <RestaurantCardView
      restaurant={restaurant}
      allRestaurants={restaurants}
      language={language}
      isAdmin={isAdmin}
      variant={variant}
      distanceKm={distanceKm}
      bookmarked={bookmarked}
      onToggleBookmark={toggleBookmark}
      setSelectedRestaurant={setSelectedRestaurant}
      openManageMyVipStore={openManageMyVipStore}
      deleteRestaurant={deleteRestaurant}
      trackRestaurantView={trackRestaurantView}
      trackRestaurantCall={trackRestaurantCall}
      trackRestaurantMap={trackRestaurantMap}
    />
  );
};

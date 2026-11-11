import React, { useMemo } from 'react';
import {
  Restaurant,
  isAdminAccount,
  sanitizeRestaurantShopPhoto,
  getRestaurantDirectGoogleMapsUrl,
  openExternalUrlNativeSafe,
} from '../types';
import { useApp } from '../context/AppContext';
import {
  Edit2,
  Trash2,
  MapPin,
  Phone,
  Heart,
  ChevronRight,
  Star,
  Crown,
  Coffee,
  Utensils,
  Soup,
  CupSoda,
  Navigation,
  Store,
} from 'lucide-react';
import { tr } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { ShopAvatar } from './icons/DefaultShopIcon';
import { ListingFeaturedCard, isVipOwnerListing } from './listing/ListingUI';

import type { Language } from '../types';

export interface RestaurantCardProps {
  restaurant: Restaurant;
  variant?: 'hero' | 'featured' | 'compact';
  distanceKm?: number | null;
}

interface RestaurantCardViewProps {
  restaurant: Restaurant;
  allRestaurants: Restaurant[];
  language: Language;
  isAdmin: boolean;
  variant: 'hero' | 'featured' | 'compact';
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

function getShopCuisineTags(
  restaurant: Restaurant,
  language: Language
): Array<{ icon: 'coffee' | 'drink' | 'utensils' | 'pot'; label: string }> {
  const hay = `${restaurant.nameKh || ''} ${restaurant.nameEn || ''} ${restaurant.categoryKh || ''} ${restaurant.categoryEn || ''} ${(restaurant.signatureDishesKh || []).join(' ')} ${(restaurant.signatureDishesEn || []).join(' ')}`.toLowerCase();

  if (
    /កាហ្វេ|តែគុជ|ប៊ីស្រ្តូ|cafe|café|coffee|roastery|bistro|brown|tube|starbucks|amazon|chagee|koi|mixue|boba|bakery|pastry|នំប៉័ង/.test(
      hay
    )
  ) {
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
      return sanitized;
    }, [
      restaurant.id,
      restaurant.photoUrl,
      restaurant.profileImage,
      restaurant.thumbnailUrl,
      restaurant.pendingUpgradeRequest?.proposedChanges?.photoUrl,
      restaurant.pendingPhotoReplacement?.newPhotoUrl,
    ]);

    const avatarRestaurant = useMemo(
      () => ({ ...restaurant, photoUrl: resolvedShopPhotoUrl }),
      [restaurant, resolvedShopPhotoUrl]
    );

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

    if (variant === 'hero') {
      return (
        <ListingFeaturedCard
          testId={`shop-featured-${restaurant.id}`}
          language={language}
          coverUrl={resolvedShopPhotoUrl}
          fallbackIcon={Store}
          title={loc.name || restaurant.nameKh}
          province={loc.province}
          address={loc.address || restaurant.addressEn || restaurant.addressKh}
          description={
            loc.description ||
            (language === 'km' && restaurant.signatureDishesKh?.length
              ? restaurant.signatureDishesKh.join(', ')
              : restaurant.signatureDishesEn?.length
              ? restaurant.signatureDishesEn.join(', ')
              : '') ||
            tr(
              language,
              'ម្ហូបខ្មែរប្រពៃណី, ម្ហូបពិសេសប្រចាំហាង',
              'Authentic Khmer cuisine & house specialties.',
              '正宗柬式美食与招牌特色菜。'
            )
          }
          rating={typeof restaurant.rating === 'number' ? restaurant.rating : 0}
          reviewCount={restaurant.reviewCount}
          priceText={restaurant.priceLevel || '$'}
          phone={restaurant.phone}
          badgeLabel={tr(language, 'ផ្សព្វផ្សាយ • ហាង VIP', 'Promoted • VIP Shop', '推广 • VIP 店铺')}
          onOpen={handleCardClick}
          onOpenMap={() => {
            trackRestaurantMap(restaurant.id);
            openExternalUrlNativeSafe(getRestaurantDirectGoogleMapsUrl(restaurant));
          }}
          topRightActions={
            <>
              {adminActions}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(restaurant.id);
                }}
                aria-label={tr(language, 'រក្សាទុក', 'Bookmark', '收藏')}
                className="kft-btn-fav"
              >
                <Heart className={`w-4 h-4 ${bookmarked ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} strokeWidth={2.2} />
              </button>
            </>
          }
        />
      );
    }

    if (variant === 'featured') {
      return (
        <article
          data-testid={`shop-featured-${restaurant.id}`}
          onClick={handleCardClick}
          className="bg-white rounded-[22px] p-2.5 border border-slate-200/90 shadow-[0_6px_20px_rgba(15,23,42,0.06)] hover:border-emerald-500/60 transition flex gap-3 items-stretch cursor-pointer font-khmer"
        >
          {/* Left Photo Box with Distance Pill & Heart Button */}
          <div className="w-[100px] min-[340px]:w-[120px] min-[380px]:w-[144px] sm:w-[156px] min-h-[130px] rounded-2xl overflow-hidden relative shrink-0 bg-slate-100 border border-slate-100">
            <ShopAvatar
              restaurant={avatarRestaurant}
              allRestaurants={allRestaurants}
              alt={loc.name}
              className="w-full h-full object-cover"
            />

            {/* Top-left Distance Badge */}
            <span
              style={{
                background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
              }}
              className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-white text-[10.5px] font-extrabold inline-flex items-center gap-1 shadow-xs"
            >
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
              className="kft-btn-fav absolute top-2 right-2"
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
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-[14.5px] sm:text-[15.5px] text-slate-900 leading-[1.65] line-clamp-2 break-words">
                    {loc.name || restaurant.nameKh}
                  </h4>
                  {language === 'km' && restaurant.nameEn && restaurant.nameEn !== restaurant.nameKh && (
                    <p className="text-xs font-bold text-slate-500 line-clamp-1 break-words mt-0.5 leading-[1.5]">
                      {restaurant.nameEn}
                    </p>
                  )}
                </div>
                {adminActions}
              </div>

              {/* Rating & Review Count */}
              <div className="flex items-center gap-1 mt-1 text-xs flex-wrap">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <span className="font-extrabold text-slate-900">{ratingNum}</span>
                <span className="text-slate-500 font-semibold leading-[1.5]">
                  ({reviewsNum} {tr(language, 'ការវាយតម្លៃ', 'reviews', '条评价')})
                </span>
              </div>

              {/* Food & Drink Category Tags */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10.5px] font-bold inline-flex items-center gap-1"
                  >
                    {t.icon === 'coffee' ? (
                      <Coffee className="w-3 h-3 text-emerald-700 shrink-0" />
                    ) : t.icon === 'drink' ? (
                      <CupSoda className="w-3 h-3 text-emerald-700 shrink-0" />
                    ) : t.icon === 'pot' ? (
                      <Soup className="w-3 h-3 text-emerald-700 shrink-0" />
                    ) : (
                      <Utensils className="w-3 h-3 text-emerald-700 shrink-0" />
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
                className="kft-btn-call"
              >
                <Phone className="w-3.5 h-3.5 text-white fill-white shrink-0" />
                <span className="break-words">{tr(language, 'ទូរស័ព្ទ', 'Call', '电话')}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenMapClick}
                className="kft-btn-map"
              >
                <Navigation className="w-3.5 h-3.5 text-white shrink-0" strokeWidth={2.2} />
                <span className="break-words">{tr(language, 'ផែនទី', 'Map', '地图')}</span>
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
        className="bg-white rounded-[20px] p-2.5 border border-slate-200/90 shadow-[0_4px_14px_rgba(15,23,42,0.04)] hover:border-emerald-500/60 transition flex items-center gap-3 cursor-pointer font-khmer"
      >
        <div className="w-16 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200/80">
          <ShopAvatar
            restaurant={avatarRestaurant}
            allRestaurants={allRestaurants}
            alt={loc.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
            <h4 className="font-extrabold text-[13.5px] sm:text-sm text-slate-900 leading-[1.65] line-clamp-2 break-words">
              {loc.name || restaurant.nameKh}
            </h4>
            {language === 'km' && restaurant.nameEn && restaurant.nameEn !== restaurant.nameKh && (
              <span className="text-xs font-semibold text-slate-500 line-clamp-1 break-words">
                {restaurant.nameEn}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <strong className="font-extrabold text-slate-900">{ratingNum}</strong>
              <span className="text-slate-400">({reviewsNum})</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {distanceStr} {tr(language, 'km', 'km', '公里')}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleOpenMapClick}
            className="kft-btn-map-icon"
            title={tr(language, 'ផែនទី', 'Map', '地图')}
          >
            <Navigation className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
          {adminActions}
          <ChevronRight
            onClick={handleCardClick}
            className="w-4 h-4 text-slate-400 shrink-0 cursor-pointer"
          />
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

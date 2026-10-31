import React, { useMemo } from 'react';
import {
  Restaurant,
  getVipFeaturedRotationState,
  isAdminAccount,
  isGpipRegisteredRestaurant,
  openRestaurantGoogleExternal,
} from '../types';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Crown,
  ChevronRight,
} from 'lucide-react';
import { tr } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { ShopAvatar } from './icons/DefaultShopIcon';

import type { Language } from '../types';

let _cachedRotRestaurants: Restaurant[] | null = null;
let _cachedRotUsers: any = null;
let _cachedRotSettings: any = null;
let _cachedRotState: ReturnType<typeof getVipFeaturedRotationState> | null = null;

function getCachedVipRotation(
  restaurants: Restaurant[],
  users: any[],
  appSettings: any
): ReturnType<typeof getVipFeaturedRotationState> {
  if (
    _cachedRotState &&
    _cachedRotRestaurants === restaurants &&
    _cachedRotUsers === users &&
    _cachedRotSettings === appSettings
  ) {
    return _cachedRotState;
  }
  _cachedRotRestaurants = restaurants;
  _cachedRotUsers = users;
  _cachedRotSettings = appSettings;
  _cachedRotState = getVipFeaturedRotationState(restaurants, users, appSettings);
  return _cachedRotState;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
}

interface RestaurantCardViewProps {
  restaurant: Restaurant;
  language: Language;
  isAdmin: boolean;
  isTopFeaturedVip: boolean;
  setSelectedRestaurant: (r: Restaurant | null) => void;
  openManageMyVipStore: (id?: string) => void;
  deleteRestaurant: (id: string) => void;
  trackRestaurantView: (id: string) => void;
  trackRestaurantMap: (id: string) => void;
}

const RestaurantCardView: React.FC<RestaurantCardViewProps> = React.memo(
  ({
    restaurant,
    language,
    isAdmin,
    isTopFeaturedVip,
    setSelectedRestaurant,
    openManageMyVipStore,
    deleteRestaurant,
    trackRestaurantView,
    trackRestaurantMap,
  }) => {
    const loc = useMemo(() => getLocalizedRestaurant(restaurant, language), [restaurant, language]);
    const isGpipRegistered = useMemo(() => isGpipRegisteredRestaurant(restaurant), [restaurant]);

    const resolvedShopPhotoUrl = useMemo(() => {
      const raw =
        restaurant.photoUrl && !restaurant.photoUrl.startsWith('/restaurants/')
          ? restaurant.photoUrl
          : restaurant.profileImage && !restaurant.profileImage.startsWith('/restaurants/')
          ? restaurant.profileImage
          : '/Shop/rest-1.jpg';
      if (raw.startsWith('/Shop/') && !raw.includes('?')) {
        return `${raw}?v=20261031v1`;
      }
      if (raw.startsWith('/foods/') && !raw.includes('?')) {
        return `${raw}?v=20261031v1`;
      }
      return raw;
    }, [restaurant.photoUrl, restaurant.profileImage]);

    const handleCardClick = () => {
      trackRestaurantView(restaurant.id);
      if (isGpipRegistered) {
        setSelectedRestaurant(restaurant);
      } else {
        trackRestaurantMap(restaurant.id);
        openRestaurantGoogleExternal(restaurant, 'maps');
      }
    };

    return (
      <div
        data-testid={`shop-row-${restaurant.id}`}
        data-verified={restaurant.isVerified ? 'true' : 'false'}
        data-registered={isGpipRegistered ? 'true' : 'false'}
        onClick={handleCardClick}
        className={`group rounded-2xl px-3 py-2.5 transition-all duration-150 cursor-pointer flex items-center gap-3 border active:scale-[0.99] ${
          isGpipRegistered
            ? 'bg-white dark:bg-slate-800/95 hover:bg-emerald-50/50 dark:hover:bg-slate-800 border-amber-400/50 dark:border-amber-400/40 shadow-xs'
            : 'bg-white dark:bg-slate-800/90 hover:bg-emerald-50/40 dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-700/80 shadow-2xs'
        }`}
      >
        {/* Left: Verified shop photo OR uniform default storefront icon for unverified shops */}
        <ShopAvatar
          restaurant={{ ...restaurant, photoUrl: resolvedShopPhotoUrl }}
          alt={loc.name}
          className="w-12 h-12 rounded-xl border border-slate-200/80 dark:border-slate-600/70"
        />

        {/* Right: Shop Name + Clear Verified / Unverified Status & Province */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-bold text-sm sm:text-[15px] text-[#0F172A] dark:text-white group-hover:text-[#059669] dark:group-hover:text-emerald-400 transition truncate leading-snug font-khmer">
              {loc.name}
            </h3>
          </div>

          <div className="mt-1 flex items-center gap-1.5 flex-nowrap overflow-hidden text-[11px] font-khmer">
            {restaurant.isVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 whitespace-nowrap shrink-0">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>{tr(language, 'ផ្ទៀងផ្ទាត់រួច', 'Verified', '已认证')}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-300/70 dark:border-slate-600 whitespace-nowrap shrink-0">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{tr(language, 'មិនទាន់ផ្ទៀងផ្ទាត់', 'Unverified', '未认证')}</span>
              </span>
            )}

            {isGpipRegistered && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold bg-amber-400/20 text-amber-800 dark:text-amber-300 border border-amber-400/40 whitespace-nowrap shrink-0">
                <Crown className="w-2.5 h-2.5 shrink-0" />
                <span>{isTopFeaturedVip ? 'VIP+' : 'VIP'}</span>
              </span>
            )}

            {loc.province && (
              <span className="inline-flex items-center gap-0.5 text-slate-500 dark:text-slate-400 truncate min-w-0">
                <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{loc.province}</span>
              </span>
            )}
          </div>
        </div>

        {/* Trailing Action Indicator + Optional Admin Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isAdmin && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  (window as any).__kft_manage_initial_tab = 'info';
                  openManageMyVipStore(restaurant.id);
                }}
                className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-2xs transition active:scale-95 cursor-pointer"
                title={tr(language, 'គ្រប់គ្រងហាងនេះ (Admin)', 'Manage Shop (Admin)', '管理店铺（管理员）')}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteRestaurant(restaurant.id);
                }}
                className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition active:scale-95 cursor-pointer"
                title={tr(language, 'លុបហាងនេះ (Admin)', 'Delete Shop (Admin)', '删除店铺（管理员）')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isGpipRegistered ? (
            <span
              className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-200/70 dark:border-emerald-700/50"
              title={tr(language, 'មើលព័ត៌មានលម្អិតក្នុងកម្មវិធី', 'View full shop details', '查看店铺详情')}
            >
              <ChevronRight className="w-4 h-4" />
            </span>
          ) : (
            <span
              className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 flex items-center justify-center border border-blue-200/70 dark:border-blue-800/50"
              title={tr(language, 'បើកទីតាំងលើ Google Maps', 'Open in Google Maps', '在 Google 地图中打开')}
            >
              <Navigation className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.restaurant === next.restaurant &&
    prev.language === next.language &&
    prev.isAdmin === next.isAdmin &&
    prev.isTopFeaturedVip === next.isTopFeaturedVip
);

const RestaurantCardInner: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  const {
    language,
    setSelectedRestaurant,
    currentUser,
    restaurants,
    users,
    appSettings,
    openManageMyVipStore,
    deleteRestaurant,
    trackRestaurantView,
    trackRestaurantMap,
  } = useApp();
  const isAdmin = isAdminAccount(currentUser);
  const isTopFeaturedVip = useMemo(() => {
    const rotation = getCachedVipRotation(restaurants, users, appSettings);
    return rotation.currentlyFeaturedIds.has(restaurant.id);
  }, [restaurants, users, appSettings, restaurant.id]);

  return (
    <RestaurantCardView
      restaurant={restaurant}
      language={language}
      isAdmin={isAdmin}
      isTopFeaturedVip={isTopFeaturedVip}
      setSelectedRestaurant={setSelectedRestaurant}
      openManageMyVipStore={openManageMyVipStore}
      deleteRestaurant={deleteRestaurant}
      trackRestaurantView={trackRestaurantView}
      trackRestaurantMap={trackRestaurantMap}
    />
  );
};

export const RestaurantCard = React.memo(RestaurantCardInner);

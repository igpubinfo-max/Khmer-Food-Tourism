import React, { useMemo } from 'react';
import {
  Restaurant,
  isAdminAccount,
  isGpipRegisteredRestaurant,
  resolveFoodPhotoUrl,
  getRestaurantDirectGoogleMapsUrl,
  openExternalUrlNativeSafe,
} from '../types';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Edit2,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { tr } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { ShopAvatar } from './icons/DefaultShopIcon';

import type { Language } from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

interface RestaurantCardViewProps {
  restaurant: Restaurant;
  language: Language;
  isAdmin: boolean;
  setSelectedRestaurant: (r: Restaurant | null) => void;
  openManageMyVipStore: (id?: string) => void;
  deleteRestaurant: (id: string) => void;
  trackRestaurantView: (id: string) => void;
}

const RestaurantCardView: React.FC<RestaurantCardViewProps> = React.memo(
  ({
    restaurant,
    language,
    isAdmin,
    openManageMyVipStore,
    deleteRestaurant,
    trackRestaurantView,
  }) => {
    const loc = useMemo(() => getLocalizedRestaurant(restaurant, language), [restaurant, language]);
    const isGpipRegistered = useMemo(() => isGpipRegisteredRestaurant(restaurant), [restaurant]);

    const resolvedShopPhotoUrl = useMemo(() => {
      const candidate =
        restaurant.photoUrl &&
        !restaurant.photoUrl.startsWith('/restaurants/') &&
        !restaurant.photoUrl.startsWith('/foods/') &&
        !restaurant.photoUrl.includes('culinary-placeholder')
          ? restaurant.photoUrl
          : restaurant.profileImage &&
            !restaurant.profileImage.startsWith('/restaurants/') &&
            !restaurant.profileImage.startsWith('/foods/') &&
            !restaurant.profileImage.includes('culinary-placeholder')
          ? restaurant.profileImage
          : '';
      return candidate ? resolveFoodPhotoUrl(candidate, restaurant.photoUpdatedAt) : '';
    }, [restaurant.photoUrl, restaurant.profileImage, restaurant.photoUpdatedAt]);

    const handleCardClick = () => {
      trackRestaurantView(restaurant.id);
      // Open the shop's exact location directly in Google Maps (no intermediate in-app detail page)
      openExternalUrlNativeSafe(getRestaurantDirectGoogleMapsUrl(restaurant));
    };

    return (
      <div
        data-testid={`shop-row-${restaurant.id}`}
        data-verified={restaurant.isVerified ? 'true' : 'false'}
        data-registered={isGpipRegistered ? 'true' : 'false'}
        onClick={handleCardClick}
        className="group rounded-2xl px-3 py-2.5 transition-all duration-150 cursor-pointer flex items-center gap-3 border active:scale-[0.99] bg-white dark:bg-slate-800/90 hover:bg-emerald-50/40 dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-700/80 shadow-2xs"
      >
        {/* Left: Real shop photo for all restaurants (or culinary placeholder if none) */}
        <ShopAvatar
          restaurant={{ ...restaurant, photoUrl: resolvedShopPhotoUrl }}
          alt={loc.name}
          className="w-12 h-12 rounded-xl border border-slate-200/80 dark:border-slate-600/70"
        />

        {/* Right: Shop Name & Province */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-bold text-sm sm:text-[15px] text-[#0F172A] dark:text-white group-hover:text-[#059669] dark:group-hover:text-emerald-400 transition truncate leading-snug font-khmer">
              {loc.name}
            </h3>
          </div>

          <div className="mt-1 flex items-center gap-1.5 flex-nowrap overflow-hidden text-[11px] font-khmer">
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

          <span
            className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-200/70 dark:border-emerald-700/50"
            title={tr(language, 'បើកទីតាំងហាងក្នុង Google Maps', 'Open shop location in Google Maps', '在 Google 地图中打开店铺位置')}
          >
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.restaurant === next.restaurant &&
    prev.language === next.language &&
    prev.isAdmin === next.isAdmin
);

const RestaurantCardInner: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  const {
    language,
    setSelectedRestaurant,
    currentUser,
    openManageMyVipStore,
    deleteRestaurant,
    trackRestaurantView,
  } = useApp();
  const isAdmin = isAdminAccount(currentUser);

  return (
    <RestaurantCardView
      restaurant={restaurant}
      language={language}
      isAdmin={isAdmin}
      setSelectedRestaurant={setSelectedRestaurant}
      openManageMyVipStore={openManageMyVipStore}
      deleteRestaurant={deleteRestaurant}
      trackRestaurantView={trackRestaurantView}
    />
  );
};

export const RestaurantCard = React.memo(RestaurantCardInner);

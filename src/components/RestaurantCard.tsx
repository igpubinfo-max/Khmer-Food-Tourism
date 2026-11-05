import React, { useEffect, useMemo, useState } from 'react';
import {
  Restaurant,
  isAdminAccount,
  sanitizeRestaurantShopPhoto,
  getRestaurantDirectGoogleMapsUrl,
  openExternalUrlNativeSafe,
} from '../types';
import { useApp } from '../context/AppContext';
import { Edit2, Trash2, Store } from 'lucide-react';
import { tr } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { ShopAvatar } from './icons/DefaultShopIcon';
import { ListingRow, ListingFeaturedCard, isVipOwnerListing } from './listing/ListingUI';
import { fetchVerifiedShopPhotoFromGoogleMaps } from '../services/shopGooglePhotoService';
import { recordPermanentRestaurantOverride } from '../services/permanentMediaVaultService';

import type { Language } from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

interface RestaurantCardViewProps {
  restaurant: Restaurant;
  allRestaurants: Restaurant[];
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
    allRestaurants,
    language,
    isAdmin,
    setSelectedRestaurant,
    openManageMyVipStore,
    deleteRestaurant,
    trackRestaurantView,
  }) => {
    const [autoFetchedPhoto, setAutoFetchedPhoto] = useState<string>('');
    const loc = useMemo(() => getLocalizedRestaurant(restaurant, language), [restaurant, language]);

    const resolvedShopPhotoUrl = useMemo(() => {
      return sanitizeRestaurantShopPhoto(
        restaurant.id,
        restaurant.photoUrl || restaurant.profileImage || autoFetchedPhoto || ''
      );
    }, [restaurant.id, restaurant.photoUrl, restaurant.profileImage, autoFetchedPhoto]);

    const isVipFeatured = isVipOwnerListing(restaurant);

    useEffect(() => {
      if (!isVipFeatured || resolvedShopPhotoUrl) return;
      let cancelled = false;
      fetchVerifiedShopPhotoFromGoogleMaps(restaurant, allRestaurants)
        .then((match) => {
          if (cancelled || !match || !match.photoUrl) return;
          setAutoFetchedPhoto(match.photoUrl);
          const nowIso = new Date().toISOString();
          recordPermanentRestaurantOverride({
            ...restaurant,
            photoUrl: match.photoUrl,
            profileImage: match.photoUrl,
            galleryPhotos: match.galleryPhotos.length > 0 ? match.galleryPhotos : [match.photoUrl],
            photoUpdatedAt: nowIso,
            updatedAt: nowIso,
          });
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [isVipFeatured, resolvedShopPhotoUrl, restaurant, allRestaurants]);

    const handleCardClick = () => {
      trackRestaurantView(restaurant.id);
      setSelectedRestaurant(restaurant);
    };

    const handleOpenMapClick = () => {
      trackRestaurantView(restaurant.id);
      openExternalUrlNativeSafe(getRestaurantDirectGoogleMapsUrl(restaurant));
    };

    const viewDetailsTitle = tr(
      language,
      'មើលព័ត៌មានលម្អិត',
      'View details',
      '查看详情'
    );

    const adminActions = isAdmin ? (
      <>
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
          <Edit2 className="w-4 h-4" strokeWidth={1.75} />
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
          <Trash2 className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </>
    ) : null;

    // Shops added by a VIP owner are showcased as a large card; all other shops stay as compact rows.
    if (isVipOwnerListing(restaurant)) {
      return (
        <ListingFeaturedCard
          testId={`shop-featured-${restaurant.id}`}
          language={language}
          coverUrl={resolvedShopPhotoUrl}
          fallbackIcon={Store}
          title={loc.name}
          province={loc.province}
          address={loc.address}
          description={loc.description}
          rating={restaurant.rating}
          reviewCount={restaurant.reviewCount}
          priceText={restaurant.priceLevel}
          phone={restaurant.phone}
          badgeLabel={tr(language, 'ហាង VIP', 'VIP Shop', 'VIP 店铺')}
          onOpen={handleCardClick}
          onOpenMap={handleOpenMapClick}
          topRightActions={adminActions}
        />
      );
    }

    return (
      <ListingRow
        testId={`shop-row-${restaurant.id}`}
        thumb={
          <ShopAvatar
            restaurant={{ ...restaurant, photoUrl: resolvedShopPhotoUrl }}
            allRestaurants={allRestaurants}
            alt={loc.name}
            className="w-12 h-12 rounded-xl border border-slate-200/80 dark:border-slate-600/70"
          />
        }
        title={loc.name}
        province={loc.province}
        chips={restaurant.priceLevel ? [{ text: restaurant.priceLevel, tone: 'amber' }] : undefined}
        onClick={handleCardClick}
        actionTitle={viewDetailsTitle}
        trailingActions={
          adminActions ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {adminActions}
            </div>
          ) : null
        }
      />
    );
  },
  (prev, next) =>
    prev.restaurant === next.restaurant &&
    prev.language === next.language &&
    prev.isAdmin === next.isAdmin
);

const RestaurantCardInner: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  const {
    restaurants,
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
      allRestaurants={restaurants}
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

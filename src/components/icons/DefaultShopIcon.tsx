import React, { useState } from 'react';
import { resolveFoodPhotoUrl } from '../../types';
import type { Restaurant } from '../../types';

export const DEFAULT_CULINARY_SHOP_PLACEHOLDER = '/Shop/culinary-placeholder.jpg';

export interface DefaultShopIconProps {
  className?: string;
}

/**
 * Clean, high-quality professional culinary placeholder image displayed when a restaurant
 * genuinely has no photo available yet (replaces flat generic storefront icons).
 */
export const DefaultShopIcon: React.FC<DefaultShopIconProps> = ({ className = 'w-12 h-12 rounded-xl' }) => (
  <div
    data-shop-avatar="culinary-placeholder"
    aria-label="Culinary Shop Photo"
    className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 border border-emerald-500/30 shadow-xs shrink-0 select-none ${className}`}
  >
    <img
      src={DEFAULT_CULINARY_SHOP_PLACEHOLDER}
      alt="Cambodian Restaurant & Culinary Dining"
      loading="lazy"
      decoding="async"
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.dataset.fallback) {
          target.dataset.fallback = '1';
          target.src = '/Shop/rest-1.jpg';
        }
      }}
      className="w-full h-full object-cover select-none"
    />
  </div>
);

export interface ShopAvatarProps {
  restaurant: Pick<Restaurant, 'isVerified' | 'photoUrl' | 'profileImage' | 'photoUpdatedAt' | 'nameKh' | 'nameEn'>;
  alt?: string;
  className?: string;
  imgClassName?: string;
}

/**
 * Renders the actual restaurant/food photo (`photoUrl` / `profileImage`) for ALL restaurants
 * in the Shop List (both verified/registered and unverified/unregistered shops).
 * If a restaurant genuinely has no photo available, displays the clean culinary placeholder photo.
 */
export const ShopAvatar: React.FC<ShopAvatarProps> = ({
  restaurant,
  alt,
  className = 'w-12 h-12 rounded-xl',
  imgClassName = 'w-full h-full object-cover',
}) => {
  const [imgError, setImgError] = useState(false);
  const rawCandidate = (restaurant?.photoUrl || restaurant?.profileImage || '').trim();
  const resolvedUrl =
    rawCandidate && !rawCandidate.startsWith('/restaurants/')
      ? resolveFoodPhotoUrl(rawCandidate, restaurant?.photoUpdatedAt)
      : '';
  const finalPhotoUrl = !imgError && resolvedUrl ? resolvedUrl : DEFAULT_CULINARY_SHOP_PLACEHOLDER;

  return (
    <div
      data-shop-avatar={resolvedUrl && !imgError ? 'shop-photo' : 'culinary-placeholder'}
      className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 ${className}`}
    >
      <img
        src={finalPhotoUrl}
        alt={alt || restaurant?.nameKh || restaurant?.nameEn || 'Shop'}
        loading="lazy"
        decoding="async"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onError={(e) => {
          if (!imgError) {
            setImgError(true);
          } else {
            const target = e.currentTarget;
            if (!target.dataset.fallback) {
              target.dataset.fallback = '1';
              target.src = '/Shop/rest-1.jpg';
            }
          }
        }}
        className={`select-none ${imgClassName}`}
      />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { resolveFoodPhotoUrl, sanitizeRestaurantShopPhoto } from '../../types';
import type { Restaurant } from '../../types';

export const DEFAULT_CULINARY_SHOP_PLACEHOLDER = '';

export interface DefaultShopIconProps {
  className?: string;
}

/**
 * Clean, neutral vector storefront icon displayed whenever a restaurant's real photo
 * has not yet been verified or uploaded. Never displays another shop's image or misleading scenery.
 */
export const DefaultShopIcon: React.FC<DefaultShopIconProps> = ({ className = 'w-12 h-12 rounded-xl' }) => (
  <div
    data-shop-avatar="default-shop-icon"
    aria-label="Default Shop Icon"
    className={`relative overflow-hidden bg-gradient-to-br from-emerald-950 via-[#093228] to-slate-900 border border-emerald-500/30 shadow-2xs shrink-0 select-none flex items-center justify-center ${className}`}
  >
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-[56%] h-[56%] max-w-16 max-h-16 text-emerald-300 drop-shadow-xs"
      aria-hidden="true"
    >
      <path
        d="M12 24L16.5 14H47.5L52 24"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 24H53.5V27.5C53.5 30.5376 51.0376 33 48 33C44.9624 33 42.5 30.5376 42.5 27.5C42.5 30.5376 40.0376 33 37 33C33.9624 33 31.5 30.5376 31.5 27.5C31.5 30.5376 29.0376 33 26 33C22.9624 33 20.5 30.5376 20.5 27.5C20.5 30.5376 18.0376 33 15 33C11.9624 33 10.5 30.5376 10.5 27.5V24Z"
        fill="#065F46"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinejoin="round"
      />
      <path
        d="M16 33V50H48V33"
        stroke="#A7F3D0"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="27"
        y="39"
        width="10"
        height="11"
        rx="1.5"
        stroke="#FBBF24"
        strokeWidth="2.6"
      />
      <line
        x1="11"
        y1="50"
        x2="53"
        y2="50"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

export interface ShopAvatarProps {
  restaurant: Pick<Restaurant, 'isVerified' | 'photoUrl' | 'profileImage' | 'photoUpdatedAt' | 'nameKh' | 'nameEn'> &
    Partial<Restaurant>;
  allRestaurants?: Restaurant[];
  alt?: string;
  className?: string;
  imgClassName?: string;
}

/**
 * Renders a restaurant's strictly verified shop photo (`photoUrl` / `profileImage`) uploaded by
 * the VIP shop owner or Admin, or falls back cleanly to the neutral `<DefaultShopIcon />`
 * with zero Google Places API calls ($0 cost for 10,000+ users and 100% copyright safety).
 */
export const ShopAvatar: React.FC<ShopAvatarProps> = ({
  restaurant,
  alt,
  className = 'w-12 h-12 rounded-xl',
  imgClassName = 'w-full h-full object-cover',
}) => {
  const [imgError, setImgError] = useState(false);

  const cleanPhoto = sanitizeRestaurantShopPhoto(
    restaurant?.id,
    restaurant?.photoUrl || restaurant?.profileImage || ''
  );
  const resolvedUrl = cleanPhoto ? resolveFoodPhotoUrl(cleanPhoto, restaurant?.photoUpdatedAt) : '';

  useEffect(() => {
    setImgError(false);
  }, [resolvedUrl]);

  if (!resolvedUrl || imgError) {
    return (
      <div className="shrink-0">
        <DefaultShopIcon className={className} />
      </div>
    );
  }

  return (
    <div
      data-shop-avatar="shop-photo"
      className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 ${className}`}
    >
      <img
        src={resolvedUrl}
        alt={alt || restaurant?.nameKh || restaurant?.nameEn || 'Shop'}
        loading="lazy"
        decoding="async"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onError={() => setImgError(true)}
        className={`select-none ${imgClassName}`}
      />
    </div>
  );
};

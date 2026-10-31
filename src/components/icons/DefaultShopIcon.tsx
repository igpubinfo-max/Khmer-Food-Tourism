import React, { useState } from 'react';
import type { Restaurant } from '../../types';

export interface DefaultShopIconProps {
  className?: string;
}

/**
 * Uniform, modern, recognizable default storefront icon displayed for all unverified shops.
 * Only verified shops display their individual shop photo.
 */
export const DefaultShopIcon: React.FC<DefaultShopIconProps> = ({ className = 'w-12 h-12 rounded-xl' }) => (
  <div
    data-shop-avatar="default-unverified-icon"
    aria-label="Default Shop Icon"
    className={`relative overflow-hidden bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#0F766E] border border-emerald-400/35 shadow-xs flex items-center justify-center shrink-0 select-none ${className}`}
  >
    {/* Subtle ambient glow */}
    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-300/20 blur-xs pointer-events-none" />
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-[68%] h-[68%] drop-shadow-2xs"
      aria-hidden="true"
    >
      {/* Storefront base building */}
      <rect
        x="8"
        y="21"
        width="32"
        height="19"
        rx="3"
        fill="#ECFDF5"
        stroke="#A7F3D0"
        strokeWidth="1.5"
      />
      {/* Storefront warm interior window */}
      <rect x="12" y="25" width="13" height="10" rx="1.8" fill="#065F46" />
      <path d="M14 27L18 33" stroke="#6EE7B7" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
      {/* Storefront door */}
      <rect x="28" y="25" width="8" height="15" rx="1.5" fill="#D97706" />
      <circle cx="34" cy="32.5" r="1" fill="#FEF3C7" />
      {/* Foundation base bar */}
      <rect x="6" y="39" width="36" height="3" rx="1.5" fill="#F59E0B" />
      {/* Striped market awning roof */}
      <path
        d="M6 19C6 18.4 6.3 17.8 6.7 17.4L10.2 11.4C10.7 10.5 11.6 10 12.6 10H35.4C36.4 10 37.3 10.5 37.8 11.4L41.3 17.4C41.7 17.8 42 18.4 42 19V20.2C42 22.3 40.3 24 38.2 24C36.5 24 35.1 22.9 34.6 21.4C34.1 22.9 32.7 24 31 24C29.3 24 27.9 22.9 27.4 21.4C26.9 22.9 25.5 24 23.8 24C22.1 24 20.7 22.9 20.2 21.4C19.7 22.9 18.3 24 16.6 24C14.9 24 13.5 22.9 13 21.4C12.5 22.9 11.1 24 9.4 24C7.5 24 6 22.3 6 20.2V19Z"
        fill="#F59E0B"
      />
      {/* Awning alternating stripes */}
      <path
        d="M15.5 10H20.5L19.5 21.5C19.2 23 17.9 24 16.5 24C15.1 24 13.8 23 13.6 21.5L15.5 10Z"
        fill="#FEF3C7"
      />
      <path
        d="M27.5 10H32.5L34.4 21.5C34.2 23 32.9 24 31.5 24C30.1 24 28.8 23 28.5 21.5L27.5 10Z"
        fill="#FEF3C7"
      />
    </svg>
  </div>
);

export interface ShopAvatarProps {
  restaurant: Pick<Restaurant, 'isVerified' | 'photoUrl' | 'nameKh' | 'nameEn'>;
  alt?: string;
  className?: string;
  imgClassName?: string;
}

/**
 * Renders the actual shop photo ONLY when `restaurant.isVerified === true`.
 * For all unverified shops (`!restaurant.isVerified`), renders the uniform `<DefaultShopIcon />`.
 */
export const ShopAvatar: React.FC<ShopAvatarProps> = ({
  restaurant,
  alt,
  className = 'w-12 h-12 rounded-xl',
  imgClassName = 'w-full h-full object-cover',
}) => {
  const [imgError, setImgError] = useState(false);
  const isVerified = Boolean(restaurant?.isVerified);
  const photoUrl = restaurant?.photoUrl?.trim() || '';

  if (!isVerified || !photoUrl || imgError) {
    return <DefaultShopIcon className={className} />;
  }

  return (
    <div
      data-shop-avatar="verified-photo"
      className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 ${className}`}
    >
      <img
        src={photoUrl}
        alt={alt || restaurant.nameKh || restaurant.nameEn || 'Verified Shop'}
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

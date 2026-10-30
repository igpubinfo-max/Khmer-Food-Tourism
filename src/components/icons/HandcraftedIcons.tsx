import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Handcrafted UI/UX Designer Icon System for Cambodia Flavors & Tourism
 * Designed on a precision 24x24 optical grid with 1.85px rounded strokes
 * and subtle layered duotone accents (0.16 opacity) for visual depth.
 */

/** 1. Nearby Food Search — Steaming artisan Khmer bowl with location pin badge */
export const IconNearbyFood: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M4 12h11a5.5 5.5 0 0 1-11 0Z" fill="currentColor" fillOpacity={0.16} />
    <path d="M3.5 12h12" />
    <path d="M4 12a5.5 5.5 0 0 0 11 0" />
    <path d="M6.5 17.5h6" />
    <path d="M7 6.5c0-1 .8-1.5.8-2.5" />
    <path d="M10.5 6.5c0-1 .8-1.5.8-2.5" />
    <path d="M18 11.5c1.93 0 3.5 1.52 3.5 3.4 0 2.38-3.5 5.6-3.5 5.6s-3.5-3.22-3.5-5.6c0-1.88 1.57-3.4 3.5-3.4Z" fill="currentColor" fillOpacity={0.2} />
    <circle cx={18} cy={14.8} r={1.1} fill="currentColor" stroke="none" />
  </svg>
);

/** 2. Nearby Places — Architectural heritage temple silhouette with GPS pin */
export const IconNearbyPlaces: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 3.2c-4.2 0-7.5 3.22-7.5 7.2 0 5.18 7.5 10.4 7.5 10.4s7.5-5.22 7.5-10.4c0-3.98-3.3-7.2-7.5-7.2Z" fill="currentColor" fillOpacity={0.15} />
    <path d="M9.2 11.5h5.6" />
    <path d="M10.2 11.5V9.3l1.8-2 1.8 2v2.2" />
    <circle cx={12} cy={10.2} r={0.8} fill="currentColor" stroke="none" />
  </svg>
);

/** 3. Food Recommendations — Chef cloche platter with precision star emblem */
export const IconFoodPicks: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M4.5 15.5a7.5 7.5 0 0 1 15 0H4.5Z" fill="currentColor" fillOpacity={0.16} />
    <path d="M3 15.5h18" />
    <path d="M5.5 18.5h13" />
    <path d="M12 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    <path d="M18.5 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z" fill="currentColor" stroke="none" />
  </svg>
);

/** 4. Food by Province — Folded 25-province map with culinary heritage badge */
export const IconProvinceFood: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M3.5 6.2 9 4l6 2.2 5.5-2.2v13.8L15 20l-6-2.2-5.5 2.2V6.2Z" fill="currentColor" fillOpacity={0.14} />
    <path d="M9 4v13.8" />
    <path d="M15 6.2V20" />
    <circle cx={12} cy={11.5} r={2.3} fill="currentColor" fillOpacity={0.28} />
  </svg>
);

/** 5. Map Navigation — Precision route path connecting origin and destination */
export const IconMapRoute: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx={6.5} cy={17.5} r={2.5} fill="currentColor" fillOpacity={0.22} />
    <path d="M17.5 3.5c-2.2 0-4 1.75-4 3.9 0 2.75 4 6.1 4 6.1s4-3.35 4-6.1c0-2.15-1.8-3.9-4-3.9Z" fill="currentColor" fillOpacity={0.22} />
    <circle cx={17.5} cy={7.3} r={1.1} fill="currentColor" stroke="none" />
    <path d="M9 17.5h3.5a2.5 2.5 0 0 0 0-5h-1a2.5 2.5 0 0 1 0-5H13.5" strokeDasharray="2.2 2.2" />
  </svg>
);

/** 6. Smart AI Assistant — Editorial concierge compass diamond with smart nodes (non-robot) */
export const IconSmartAssistant: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx={12} cy={12} r={8.5} fill="currentColor" fillOpacity={0.14} />
    <path d="M12 6.2 14.1 9.9 17.8 12 14.1 14.1 12 17.8 9.9 14.1 6.2 12 9.9 9.9 12 6.2Z" fill="currentColor" fillOpacity={0.24} />
    <circle cx={12} cy={12} r={1.2} fill="currentColor" stroke="none" />
  </svg>
);

/** Bottom Nav 1: Home — Khmer peaked roof sanctuary */
export const IconNavHome: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M4 10.5 12 4l8 6.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z" fill="currentColor" fillOpacity={0.15} />
    <path d="M9.5 20.5v-6a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6" />
  </svg>
);

/** Bottom Nav 2: Food — Warm traditional soup bowl & spoon */
export const IconNavFood: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z" fill="currentColor" fillOpacity={0.15} />
    <path d="M3 11.5h18" />
    <path d="M7.5 20h9" />
    <path d="M8.5 7.5c0-1.2.9-1.8.9-3" />
    <path d="M12 7.5c0-1.2.9-1.8.9-3" />
    <path d="M15.5 7.5c0-1.2.9-1.8.9-3" />
  </svg>
);

/** Bottom Nav 3: Shop / Restaurants — Awning storefront */
export const IconNavShop: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M4.5 9.5v9.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V9.5" fill="currentColor" fillOpacity={0.14} />
    <path d="M3.5 9.5h17l-1.6-5.2a1 1 0 0 0-.95-.7H6.05a1 1 0 0 0-.95.7L3.5 9.5Z" />
    <path d="M3.5 9.5a2.83 2.83 0 0 0 5.66 0 2.83 2.83 0 0 0 5.68 0 2.83 2.83 0 0 0 5.66 0" />
    <path d="M10 20.5v-5.5h4v5.5" />
  </svg>
);

/** Bottom Nav 4: Tourism — Angkor lotus towers & horizon */
export const IconNavTourism: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M3 19.5h18" />
    <path d="M5 19.5v-5h14v5" fill="currentColor" fillOpacity={0.15} />
    <path d="M10 14.5V8.5l2-4 2 4v6" />
    <path d="M6 14.5v-4l1.5-2.5L9 10.5v4" />
    <path d="M15 14.5v-4l1.5-2.5L18 10.5v4" />
  </svg>
);

/** Bottom Nav 5: Guide & Safety — Travel handbook with shield emblem */
export const IconNavGuide: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 3.5 19 6.5v5.5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6.5l7-3Z" fill="currentColor" fillOpacity={0.15} />
    <path d="m9.5 12 1.8 1.8 3.5-3.6" />
  </svg>
);

/** Bottom Nav 6: Profile — Clean user badge */
export const IconNavProfile: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx={12} cy={8.5} r={3.8} fill="currentColor" fillOpacity={0.16} />
    <path d="M5 19.5c0-3.3 3.1-5.8 7-5.8s7 2.5 7 5.8" fill="currentColor" fillOpacity={0.12} />
  </svg>
);

/** VIP Crown Emblem — Handcrafted royal Khmer crown */
export const IconVipCrown: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M3.5 17.5 2.5 7.5l5 3.5L12 4.5l4.5 6.5 5-3.5-1 10h-17Z" fill="currentColor" fillOpacity={0.22} />
    <path d="M4 20.5h16" />
  </svg>
);

/** Trending Flame Emblem */
export const IconFlamePopular: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 3c2.5 3.2 6 6.2 6 10.5a6 6 0 1 1-12 0c0-2.6 1.5-5 3.2-6.8.3 1.8 1.3 2.8 2.3 3.3-.3-2.4.5-4.8 2.5-7Z" fill="currentColor" fillOpacity={0.18} />
  </svg>
);

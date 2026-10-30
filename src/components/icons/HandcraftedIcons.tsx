import React from 'react';
import type { DishTagId } from '../../utils/dishTags';

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

/** 7. Beverage Pairings (ម្ហូបអមភេសជ្ជៈ) — Savory sharing platter paired with a chilled citrus refreshment glass */
export const IconBeveragePairing: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    {/* Chilled refreshment glass with straw & citrus garnish */}
    <path d="M14.2 7.5h6.3l-.7 11.2a1.6 1.6 0 0 1-1.6 1.5h-1.7a1.6 1.6 0 0 1-1.6-1.5L14.2 7.5Z" fill="currentColor" fillOpacity={0.18} />
    <path d="M14.5 11.5h5.7" />
    <path d="M17.5 7.5 19.2 3.5h1.6" />
    <circle cx={14.2} cy={7.2} r={2} fill="currentColor" fillOpacity={0.22} />
    {/* Dining platter / savory bowl on left */}
    <path d="M2.5 15.5a5.2 5.2 0 0 1 10.4 0H2.5Z" fill="currentColor" fillOpacity={0.18} />
    <path d="M2 15.5h11.4" />
    <path d="M3.2 18.2a4.8 4.8 0 0 0 9 0" />
    <path d="M7.7 8.8v1.5" />
  </svg>
);

/** 8. Dish Category Plate — Precision dining plate with fork & spoon */
export const IconDishCategory: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx={12} cy={12} r={5.5} fill="currentColor" fillOpacity={0.16} />
    <circle cx={12} cy={12} r={2.5} />
    <path d="M3.5 5v5a1.5 1.5 0 0 0 3 0V5" />
    <path d="M5 5v14" />
    <path d="M19.5 5c1.1 0 1.8 1.2 1.8 2.8 0 1.6-.7 2.7-1.8 2.7V19" />
  </svg>
);

/** 9. Craving Inspiration — Culinary spark emblem */
export const IconCravingSpark: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.8 10.6c.6.5 1.1 1.3 1.2 2.1h5.2c.1-.8.6-1.6 1.2-2.1A6 6 0 0 0 12 3Z" fill="currentColor" fillOpacity={0.18} />
  </svg>
);

/** 10. Grill & Crispy Flame — Charcoal grill grate with flame */
export const IconGrillFlame: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 3.5c2 2.6 4.8 5 4.8 8.4a4.8 4.8 0 1 1-9.6 0c0-2.1 1.2-4 2.6-5.5.2 1.4 1 2.2 1.8 2.6-.2-1.9.4-3.8 2.4-5.5Z" fill="currentColor" fillOpacity={0.2} />
    <path d="M4.5 19.5h15" />
  </svg>
);

/** 11. Zesty Citrus & Herbs — Lime wheel slice for refreshing salads & pairings */
export const IconZestyCitrus: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx={12} cy={12} r={8} fill="currentColor" fillOpacity={0.16} />
    <path d="M12 4v16" />
    <path d="M4 12h16" />
    <path d="m6.3 6.3 11.4 11.4" />
    <path d="m17.7 6.3-11.4 11.4" />
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

/**
 * Precision Vector Icon for Recipe & Nutrition Dish Tags (`DishTagId`).
 * Replaces raw OS emojis (`🌿`, `♨️`, `🔥`, `🍳`, `🥬`, `💪`, `🌱`, `🌶️`, `🐟`)
 * so tags render identically and cleanly across all Android, iOS, and desktop devices.
 */
export const DishTagIcon: React.FC<{ id: DishTagId; className?: string }> = ({ id, className = 'w-3.5 h-3.5 shrink-0' }) => {
  switch (id) {
    case 'light':
    case 'vegetarian_friendly':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M19.5 4.5C12 4.5 6 9.5 5.5 17.5c8-.5 13-6.5 14-13Z" fill="currentColor" fillOpacity={0.2} />
          <path d="M4.5 19.5c3-3 6.5-5.5 11-7.5" />
        </svg>
      );
    case 'steamed_boiled':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M4 13h16a7 7 0 0 1-16 0Z" fill="currentColor" fillOpacity={0.18} />
          <path d="M3 13h18" />
          <path d="M8 9c0-1.3 1-2 1-3.3" />
          <path d="M12 9c0-1.3 1-2 1-3.3" />
          <path d="M16 9c0-1.3 1-2 1-3.3" />
        </svg>
      );
    case 'grilled':
      return <IconGrillFlame className={className} />;
    case 'fried':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx={10.5} cy={12.5} r={6.5} fill="currentColor" fillOpacity={0.16} />
          <circle cx={10.5} cy={12.5} r={2.2} fill="currentColor" fillOpacity={0.35} />
          <path d="M16.5 10.5 21 7" />
        </svg>
      );
    case 'vegetable_rich':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 4c4.5 0 7.5 3.5 7.5 8 0 4.5-3.5 8-7.5 8s-7.5-3.5-7.5-8c0-4.5 3-8 7.5-8Z" fill="currentColor" fillOpacity={0.18} />
          <path d="M12 7v11" />
          <path d="m9 11 3 2.5 3-2.5" />
        </svg>
      );
    case 'protein_rich':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" fill="currentColor" fillOpacity={0.22} />
        </svg>
      );
    case 'spicy':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M17.5 6.5c-2.5-1-6 1.5-8.5 5s-4 7.5-2.5 9c1.5 1.5 5.5 0 9-3.5s3-9.5 2-10.5Z" fill="currentColor" fillOpacity={0.22} />
          <path d="M17.5 6.5c1-1.5 2.5-2 3.5-1.5" />
        </svg>
      );
    case 'fish_sauce_prahok':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3.5 12c3.2-4 7.5-5.5 12.5-3.5L20.5 6v12L16 15.5C11 17.5 6.7 16 3.5 12Z" fill="currentColor" fillOpacity={0.18} />
          <circle cx={7.5} cy={11.5} r={0.9} fill="currentColor" stroke="none" />
        </svg>
      );
  }
};


/** Healthy Herbal Leaf Emblem */
export const IconHealthyLeaf: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M19.5 4.5C12 4.5 6 9.5 5.5 17.5c8-.5 13-6.5 14-13Z" fill="currentColor" fillOpacity={0.2} />
    <path d="M4.5 19.5c3-3 6.5-5.5 11-7.5" />
  </svg>
);

/** Khmer Traditional Food Bowl Emblem */
export const IconKhmerFoodBowl: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z" fill="currentColor" fillOpacity={0.18} />
    <path d="M3 11.5h18" />
    <path d="M7.5 20h9" />
    <path d="M8.5 7.5c0-1.2.9-1.8.9-3" />
    <path d="M12 7.5c0-1.2.9-1.8.9-3" />
    <path d="M15.5 7.5c0-1.2.9-1.8.9-3" />
  </svg>
);

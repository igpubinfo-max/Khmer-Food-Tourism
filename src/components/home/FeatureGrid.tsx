import React from 'react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';

interface Props {
  language: Language;
  isVip: boolean;
  onNearbyFoodSearch: () => void;
  onNearbyPlaces: () => void;
  onFoodRecommendations: () => void;
  onDailyFoodDiscovery: () => void;
  onMapNavigation: () => void;
  onSmartAiAssistant: () => void;
}

interface FeatureItem {
  id: string;
  imageSrc: string;
  label: string;
  isLongLabel?: boolean;
  onClick: () => void;
}

const FeatureGridImpl: React.FC<Props> = ({
  language,
  onNearbyFoodSearch,
  onNearbyPlaces,
  onFoodRecommendations,
  onDailyFoodDiscovery,
  onMapNavigation,
  onSmartAiAssistant,
}) => {
  const items: FeatureItem[] = [
    {
      id: 'nearby-food',
      imageSrc: '/categories/home_cat_nearby_food.png',
      label: tr(language, 'ម្ហូបជិតខ្ញុំ', 'Nearby Food', '附近美食'),
      onClick: onNearbyFoodSearch,
    },
    {
      id: 'compare-dishes',
      imageSrc: '/categories/home_cat_drinks.png',
      label: tr(language, 'ម្ហូបអមភេសជ្ជៈ', 'Beverage Pairings', '佳肴与饮品'),
      isLongLabel: true,
      onClick: onNearbyPlaces,
    },
    {
      id: 'food-recommend',
      imageSrc: '/categories/home_cat_recommend.png',
      label: tr(language, 'ណែនាំម្ហូប', 'Food Picks', '美食推荐'),
      onClick: onFoodRecommendations,
    },
    {
      id: 'daily-food',
      imageSrc: '/categories/home_cat_province_food.png',
      label: tr(language, 'ម្ហូបតាមខេត្ត', 'Food by Province', '各省美食'),
      isLongLabel: language === 'en',
      onClick: onDailyFoodDiscovery,
    },
    {
      id: 'map-nav',
      imageSrc: '/categories/home_cat_map_route.png',
      label: tr(language, 'ផែនទីធ្វើដំណើរ', 'Map Route', '地图导航'),
      isLongLabel: language === 'km',
      onClick: onMapNavigation,
    },
    {
      id: 'smart-ai',
      imageSrc: '/categories/home_cat_smart_ai.png',
      label: tr(language, 'ជំនួយការឆ្លាតវៃ Ai', 'Smart AI', 'AI 智能助手'),
      isLongLabel: language === 'km',
      onClick: onSmartAiAssistant,
    },
  ];

  return (
    <section
      aria-label={tr(language, 'សេវាកម្មឆ្លាតវៃប្រចាំថ្ងៃ', 'Daily Smart Services', '日常智能服务')}
      className="rounded-[24px] bg-white/96 p-2 sm:p-3 shadow-[0_6px_20px_rgba(15,23,42,0.08)] border border-white"
    >
      <div className="grid grid-cols-3 gap-1.5 min-[360px]:gap-2 sm:gap-2.5 items-stretch">
        {items.map((it) => (
          <button
            key={it.id}
            id={`kft-feature-${it.id}-btn`}
            type="button"
            onClick={it.onClick}
            className="group relative w-full min-w-0 aspect-[5/3] bg-transparent border-0 p-0 transition-transform active:scale-95 cursor-pointer select-none flex items-center justify-center"
          >
            <img
              src={it.imageSrc}
              alt={it.label}
              loading="eager"
              decoding="async"
              className="w-full h-full object-fill bg-transparent select-none pointer-events-none drop-shadow-[0_4px_10px_rgba(15,23,42,0.18)] group-hover:brightness-[1.03] transition-all duration-150"
            />

            {/* Centered Bold White Label Inside Button Directly Below the 3D Illustration */}
            <div className="pointer-events-none absolute inset-x-[4.5%] top-[63%] bottom-[8%] flex items-center justify-center px-0.5 overflow-visible">
              <span
                className="font-khmer font-extrabold text-white text-center leading-[1.35] tracking-tight whitespace-nowrap max-w-full"
                style={{
                  fontSize: it.isLongLabel
                    ? 'clamp(9.4px, 2.55vw, 13.5px)'
                    : 'clamp(10.5px, 2.95vw, 15px)',
                  textShadow:
                    '0 1.5px 3px rgba(0, 0, 0, 0.9), 0 0 8px rgba(0, 0, 0, 0.65)',
                }}
              >
                {it.label}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export const FeatureGrid = React.memo(FeatureGridImpl);

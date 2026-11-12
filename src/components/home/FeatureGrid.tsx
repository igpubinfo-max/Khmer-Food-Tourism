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
      style={{
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.96) 100%)',
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
      }}
      className="w-full max-w-full min-w-0 rounded-[24px] p-2 min-[360px]:p-2.5 sm:p-3.5 border border-amber-400/25"
    >
      <div className="kft-cat-grid grid grid-cols-3 gap-x-1.5 min-[360px]:gap-x-2 sm:gap-x-3 gap-y-2 min-[360px]:gap-y-2.5 sm:gap-y-3 items-start">
        {items.map((it) => (
          <button
            key={it.id}
            id={`kft-feature-${it.id}-btn`}
            type="button"
            onClick={it.onClick}
            className="kft-cat-btn group relative flex flex-col items-center justify-start w-full max-w-full min-w-0 overflow-visible p-0 bg-transparent border-0 transition-transform duration-150 active:scale-[0.95] cursor-pointer focus:outline-none select-none"
          >
            {/* 3D Gold-Bordered Category Illustration Button */}
            <div
              className="kft-cat-img-wrap relative w-full max-w-full min-w-0 min-h-0 aspect-[2.12/1] overflow-visible transition-all duration-200 rounded-[14px] group-hover:scale-[1.02]"
              style={{
                filter: 'drop-shadow(0 5px 10px rgba(15, 23, 42, 0.35))',
              }}
            >
              <img
                src={it.imageSrc}
                alt={it.label}
                loading="eager"
                decoding="async"
                draggable={false}
                className="block w-full h-full max-w-full min-w-0 min-h-0 object-contain bg-transparent select-none pointer-events-none group-hover:brightness-[1.04] transition-all duration-150"
              />
            </div>

            {/* Clear White Text Title Directly Below Each Illustration */}
            <span
              className="mt-1 px-0.5 font-khmer font-extrabold leading-[1.52] text-center break-words whitespace-normal w-full transition-colors duration-150 group-hover:text-[#FDE047]"
              style={{
                fontSize: it.isLongLabel
                  ? 'clamp(10px, 2.75vw, 12.6px)'
                  : 'clamp(11px, 3.05vw, 13.4px)',
                color: '#FFFFFF',
                textShadow: '0 1.5px 3px rgba(0, 0, 0, 0.90), 0 0 2px rgba(0, 0, 0, 0.75)',
              }}
            >
              {it.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export const FeatureGrid = React.memo(FeatureGridImpl);
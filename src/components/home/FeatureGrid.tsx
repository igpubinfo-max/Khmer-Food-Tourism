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
  label: string;
  gradientStyle: string;
  renderIcon: () => React.ReactNode;
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
      label: tr(language, 'ម្ហូបជិតខ្ញុំ', 'Nearby Food', '附近美食'),
      gradientStyle: 'linear-gradient(180deg, #F68B29 0%, #DF590B 100%)',
      onClick: onNearbyFoodSearch,
      renderIcon: () => (
        <svg className="w-9 h-9 text-white drop-shadow-xs" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 6C16.8 6 11 11.8 11 19c0 9.5 13 21 13 21s13-11.5 13-21c0-7.2-5.8-13-13-13z" />
          <circle cx="24" cy="19" r="5" />
          <path d="M13 40c2.8 1.8 6.6 3 11 3s8.2-1.2 11-3" />
        </svg>
      ),
    },
    {
      id: 'compare-dishes',
      label: tr(language, 'ម្ហូបអមភេសជ្ជៈ', 'Beverage Pairings', '佐餐与饮品搭配'),
      gradientStyle: 'linear-gradient(180deg, #329F5B 0%, #136835 100%)',
      onClick: onNearbyPlaces,
      renderIcon: () => (
        <svg className="w-9 h-9 text-white drop-shadow-xs" viewBox="0 0 36 32" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <g transform="translate(2, 2) rotate(-10 10 14)">
            <path d="M6 2h8l-1 10a3 3 0 0 1-6 0L6 2z" />
            <path d="M6.5 6h7" />
            <path d="M10 15v7" />
            <path d="M7 22h6" />
          </g>
          <g transform="translate(14, 2) rotate(10 10 14)">
            <path d="M6 2h8l-1 10a3 3 0 0 1-6 0L6 2z" />
            <path d="M6.5 6h7" />
            <path d="M10 15v7" />
            <path d="M7 22h6" />
          </g>
          <path d="M18 1v3" />
          <path d="M14 2l1.5 2" />
          <path d="M22 2l-1.5 2" />
        </svg>
      ),
    },
    {
      id: 'food-recommend',
      label: tr(language, 'ណែនាំម្ហូប', 'Food Picks', '美食推荐'),
      gradientStyle: 'linear-gradient(180deg, #F65D79 0%, #C82555 100%)',
      onClick: onFoodRecommendations,
      renderIcon: () => (
        <svg className="w-9 h-9 text-white drop-shadow-xs" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 24h30a15 15 0 0 1-30 0z" />
          <path d="M17 39h14" />
          <path d="M13 20c1.5-3 4.5-3 6 0s4.5 3 6 0 4.5-3 6 0" />
          <path d="M26 17L36 8" />
          <path d="M30 19L40 11" />
        </svg>
      ),
    },
    {
      id: 'daily-food',
      label: tr(language, 'ម្ហូបតាមខេត្ត', 'Food by Province', '各省美食'),
      gradientStyle: 'linear-gradient(180deg, #3892F6 0%, #1659B8 100%)',
      onClick: onDailyFoodDiscovery,
      renderIcon: () => (
        <svg className="w-9 h-9 drop-shadow-xs" viewBox="0 0 52 46" fill="none">
          <path d="M12 10l7-3 7 2 8-2 6 4 4 7-2 8-5 5-4 8-7-3-8 2-6-5-3-9 3-14z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
          <text x="26" y="27" textAnchor="middle" fill="#1D63C2" fontFamily="sans-serif" fontSize="15" fontWeight="800">
            25
          </text>
        </svg>
      ),
    },
    {
      id: 'map-nav',
      label: tr(language, 'ផែនទីធ្វើដំណើរ', 'Map Route', '地图导航'),
      gradientStyle: 'linear-gradient(180deg, #F5BA36 0%, #C98212 100%)',
      onClick: onMapNavigation,
      renderIcon: () => (
        <svg className="w-9 h-9 text-white drop-shadow-xs" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="8 12 18 8 30 12 40 8 40 36 30 40 18 36 8 40 8 12" />
          <path d="M18 28c2-5 8-3 10-8" strokeDasharray="3 3" />
          <circle cx="16" cy="28" r="2.5" fill="currentColor" />
          <path d="M31 14c-2.5 0-4.5 2-4.5 4.5 0 3.2 4.5 7.5 4.5 7.5s4.5-4.3 4.5-7.5c0-2.5-2-4.5-4.5-4.5z" />
        </svg>
      ),
    },
    {
      id: 'smart-ai',
      label: tr(language, 'ជំនួយការឆ្លាតវៃ Ai', 'Smart AI', 'AI 智能助手'),
      gradientStyle: 'linear-gradient(180deg, #27AAA5 0%, #136B6E 100%)',
      onClick: onSmartAiAssistant,
      renderIcon: () => (
        <svg className="w-9 h-9 text-white drop-shadow-xs" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10c-7.7 0-14 5.1-14 11.5 0 3.1 1.5 5.9 4 8l-2 5.5 6.2-2.5c1.8.6 3.7 1 5.8 1 7.7 0 14-5.1 14-11.5S29.7 10 22 10z" />
          <path d="M32 20c4.8 1.2 8 4.8 8 9.2 0 2.5-1.1 4.7-3 6.3l1.5 4.5-4.8-2c-1.4.4-2.9.7-4.5.7-3.8 0-7.2-1.5-9.2-3.8" />
          <circle cx="17" cy="21.5" r="1.5" fill="currentColor" />
          <circle cx="22" cy="21.5" r="1.5" fill="currentColor" />
          <circle cx="27" cy="21.5" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <section aria-label={tr(language, 'សេវាកម្មឆ្លាតវៃប្រចាំថ្ងៃ', 'Daily Smart Services', '日常智能服务')}>
      <div className="grid grid-cols-3 gap-2.5">
        {items.map((it) => (
          <button
            key={it.id}
            id={`kft-feature-${it.id}-btn`}
            type="button"
            onClick={it.onClick}
            style={{
              background: it.gradientStyle,
              boxShadow: '0 4px 10px rgba(15, 23, 42, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
            }}
            className="group relative rounded-2xl py-2.5 px-1.5 flex flex-col items-center justify-center gap-1.5 text-white transition active:scale-[0.96] cursor-pointer overflow-hidden"
          >
            {/* Subtle top glass highlight */}
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)',
              }}
            />

            {/* Crisp centered icon */}
            <span className="relative z-10 flex items-center justify-center transition-transform group-hover:scale-105">
              {it.renderIcon()}
            </span>

            {/* Crisp 1-line Khmer label */}
            <span
              className="relative z-10 font-khmer text-xs sm:text-[13px] font-bold leading-snug text-center truncate w-full px-0.5 text-white"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.22)' }}
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

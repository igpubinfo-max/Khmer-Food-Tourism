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
      gradientStyle: 'linear-gradient(180deg, #FF9933 0%, #D94E08 100%)',
      onClick: onNearbyFoodSearch,
      renderIcon: () => (
        <svg className="w-7 h-7 text-white drop-shadow-xs shrink-0" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 5c-6.1 0-11 4.8-11 10.8 0 7.9 11 17.7 11 17.7s11-9.8 11-17.7C35 9.8 30.1 5 24 5Z" />
          <circle cx="24" cy="15.8" r="4" />
          <path d="M13 31l-5 9 11-2.5 5 2.5 5-2.5L40 40l-5-9" />
        </svg>
      ),
    },
    {
      id: 'compare-dishes',
      label: tr(language, 'ម្ហូបអមភេសជ្ជៈ', 'Beverage Pairings', '佳肴与饮品搭配'),
      gradientStyle: 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
      onClick: onNearbyPlaces,
      renderIcon: () => (
        <svg className="w-7 h-7 text-white drop-shadow-xs shrink-0" viewBox="0 0 36 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
      gradientStyle: 'linear-gradient(180deg, #F75977 0%, #C41D4B 100%)',
      onClick: onFoodRecommendations,
      renderIcon: () => (
        <svg className="w-7 h-7 text-white drop-shadow-xs shrink-0" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8c0 3-2.5 4.5-2.5 7.5S18 20 18 20" />
          <path d="M24 6c0 3-2.5 4.5-2.5 7.5S24 18 24 18" />
          <path d="M30 8c0 3-2.5 4.5-2.5 7.5S30 20 30 20" />
          <path d="M9 24h30a15 15 0 0 1-30 0Z" fill="currentColor" fillOpacity="0.18" />
          <path d="M16 40h16" />
        </svg>
      ),
    },
    {
      id: 'daily-food',
      label: tr(language, 'ម្ហូបតាមខេត្ត', 'Food by Province', '各省美食'),
      gradientStyle: 'linear-gradient(180deg, #3290FA 0%, #1254C7 100%)',
      onClick: onDailyFoodDiscovery,
      renderIcon: () => (
        <svg className="w-7 h-7 drop-shadow-xs shrink-0" viewBox="0 0 52 46" fill="none">
          <path d="M26 4l5.4 3.1 6.2-.5 3.1 5.4 5.4 3.1-.5 6.2 3.1 5.4-3.1 5.4.5 6.2-5.4 3.1-3.1 5.4-6.2-.5L26 44l-5.4-3.1-6.2.5-3.1-5.4-5.4-3.1.5-6.2L3.3 21.3l3.1-5.4-.5-6.2 5.4-3.1 3.1-5.4 6.2.5L26 4z" fill="#FFFFFF" />
          <text x="26" y="29" textAnchor="middle" fill="#1558C0" fontFamily="sans-serif" fontSize="16" fontWeight="900">
            25
          </text>
        </svg>
      ),
    },
    {
      id: 'map-nav',
      label: tr(language, 'ផែនទីធ្វើដំណើរ', 'Map Route', '地图导航'),
      gradientStyle: 'linear-gradient(180deg, #F4B630 0%, #C67D0D 100%)',
      onClick: onMapNavigation,
      renderIcon: () => (
        <svg className="w-7 h-7 text-white drop-shadow-xs shrink-0" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="8 12 18 8 30 12 40 8 40 36 30 40 18 36 8 40 8 12" />
          <path d="M18 8v28" />
          <path d="M30 12v28" />
          <path d="M31 13c-3 0-5.5 2.4-5.5 5.4 0 3.9 5.5 9.1 5.5 9.1s5.5-5.2 5.5-9.1c0-3-2.5-5.4-5.5-5.4z" fill="#F4B630" stroke="#FFFFFF" strokeWidth="2.4" />
          <circle cx="31" cy="18.2" r="1.8" fill="#FFFFFF" />
        </svg>
      ),
    },
    {
      id: 'smart-ai',
      label: tr(language, 'ជំនួយការឆ្លាតវៃ Ai', 'Smart AI', 'AI 智能助手'),
      gradientStyle: 'linear-gradient(180deg, #22AAA3 0%, #0E6769 100%)',
      onClick: onSmartAiAssistant,
      renderIcon: () => (
        <svg className="w-7 h-7 text-white drop-shadow-xs shrink-0" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="24" y1="6" x2="24" y2="11" />
          <circle cx="24" cy="5" r="2" fill="currentColor" />
          <rect x="11" y="11" width="26" height="22" rx="9" fill="currentColor" fillOpacity="0.16" />
          <path d="M7 20v5a2 2 0 0 0 2 2h2v-9H9a2 2 0 0 0-2 2Z" fill="currentColor" />
          <path d="M41 20v5a2 2 0 0 1-2 2h-2v-9h2a2 2 0 0 1 2 2Z" fill="currentColor" />
          <circle cx="18.5" cy="21" r="2.2" fill="currentColor" />
          <circle cx="29.5" cy="21" r="2.2" fill="currentColor" />
          <path d="M20 27c1.2 1.2 2.5 1.8 4 1.8s2.8-.6 4-1.8" />
          <path d="M37 26c0 5-4 8-9 8h-3" />
          <circle cx="24" cy="34" r="1.8" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <section
      aria-label={tr(language, 'សេវាកម្មឆ្លាតវៃប្រចាំថ្ងៃ', 'Daily Smart Services', '日常智能服务')}
      className="rounded-[22px] bg-white p-2.5 shadow-[0_5px_18px_rgba(15,23,42,0.06)] border border-white"
    >
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {items.map((it) => (
          <button
            key={it.id}
            id={`kft-feature-${it.id}-btn`}
            type="button"
            onClick={it.onClick}
            style={{
              background: it.gradientStyle,
              boxShadow: '0 4px 10px rgba(15, 23, 42, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.36)',
            }}
            className="group relative min-h-[72px] rounded-[16px] py-2 px-1 flex flex-col items-center justify-center gap-1 text-white transition active:scale-[0.96] cursor-pointer overflow-hidden"
          >
            {/* Subtle top glass highlight */}
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 100%)',
              }}
            />

            {/* Crisp centered icon */}
            <span className="relative z-10 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
              {it.renderIcon()}
            </span>

            {/* Full readable label across Khmer, English, and Chinese without truncation or subscript clipping */}
            <span
              className="relative z-10 font-khmer font-extrabold leading-[1.6] py-0.5 text-center break-words whitespace-normal w-full px-0.5 text-white"
              style={{ fontSize: 'clamp(10px, 2.8vw, 11.5px)', textShadow: '0 1px 2px rgba(0,0,0,0.28)' }}
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

import React from 'react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';
import {
  IconNearbyFood,
  IconBeveragePairing,
  IconFoodPicks,
  IconProvinceFood,
  IconMapRoute,
  IconSmartAssistant,
} from '../icons/HandcraftedIcons';

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
  icon: React.ElementType;
  badgeType: 'free' | 'vip';
  badgeLabel: string;
  iconContainerClass: string;
  onClick: () => void;
}

const FLAT_ICON_CONTAINER =
  'bg-emerald-50 text-[#064E3B] dark:bg-slate-700/80 dark:text-emerald-300 border border-emerald-200/80 dark:border-slate-600';

const FeatureGridImpl: React.FC<Props> = ({
  language,
  isVip,
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
      icon: IconNearbyFood,
      badgeType: 'free',
      badgeLabel: tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费'),
      iconContainerClass: FLAT_ICON_CONTAINER,
      onClick: onNearbyFoodSearch,
    },
    {
      id: 'compare-dishes',
      label: tr(language, 'ម្ហូបអមភេសជ្ជៈ', 'Beverage Pairings', '佐餐与饮品搭配'),
      icon: IconBeveragePairing,
      badgeType: 'free',
      badgeLabel: tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费'),
      iconContainerClass: FLAT_ICON_CONTAINER,
      onClick: onNearbyPlaces,
    },
    {
      id: 'food-recommend',
      label: tr(language, 'ណែនាំម្ហូប', 'Food Picks', '美食推荐'),
      icon: IconFoodPicks,
      badgeType: 'free',
      badgeLabel: tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费'),
      iconContainerClass: FLAT_ICON_CONTAINER,
      onClick: onFoodRecommendations,
    },
    {
      id: 'daily-food',
      label: tr(language, 'ម្ហូបតាមខេត្ត', 'Food by Province', '各省美食'),
      icon: IconProvinceFood,
      badgeType: 'free',
      badgeLabel: tr(language, '២៥ ខេត្ត', '25 Prov', '25省市'),
      iconContainerClass: FLAT_ICON_CONTAINER,
      onClick: onDailyFoodDiscovery,
    },
    {
      id: 'map-nav',
      label: tr(language, 'ផែនទីធ្វើដំណើរ', 'Map Route', '地图导航'),
      icon: IconMapRoute,
      badgeType: 'free',
      badgeLabel: tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费'),
      iconContainerClass: FLAT_ICON_CONTAINER,
      onClick: onMapNavigation,
    },
    {
      id: 'smart-ai',
      label: tr(language, 'ជំនួយការឆ្លាតវៃ', 'Smart AI', '智能助手'),
      icon: IconSmartAssistant,
      badgeType: 'vip',
      badgeLabel: isVip
        ? tr(language, 'VIP បើករួច', 'VIP Active', 'VIP已激活')
        : tr(language, 'ឥតគិតថ្លៃ + VIP', 'FREE + VIP', '免费+VIP'),
      iconContainerClass:
        'bg-amber-400/15 text-amber-300 border border-amber-400/35',
      onClick: onSmartAiAssistant,
    },
  ];

  return (
    <section aria-label={tr(language, 'សេវាកម្មឆ្លាតវៃប្រចាំថ្ងៃ', 'Daily Smart Services', '日常智能服务')}>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map((it) => {
          const Icon = it.icon;
          const isVipCard = it.badgeType === 'vip';
          return (
            <button
              key={it.id}
              id={`kft-feature-${it.id}-btn`}
              type="button"
              onClick={it.onClick}
              className={`group rounded-xl pt-1 pb-1.5 px-1 flex flex-col items-center justify-center gap-0.5 transition active:scale-[0.97] cursor-pointer shadow-xs ${
                isVipCard
                  ? 'bg-[#064E3B] border border-amber-400/45 hover:border-amber-400/75'
                  : 'bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/40'
              }`}
            >
              {/* Compact Free / VIP text pill */}
              <span
                className={`self-end inline-flex items-center px-1.5 py-[1px] rounded-full text-[8px] font-extrabold leading-none ${
                  isVipCard
                    ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'
                }`}
              >
                <span>{it.badgeLabel}</span>
              </span>

              {/* Clean centered icon */}
              <span
                className={`w-8 h-8 rounded-lg ${it.iconContainerClass} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}
              >
                <Icon className="w-4 h-4" />
              </span>

              {/* Crisp 1-line Khmer label */}
              <span
                className={`font-khmer text-[11px] sm:text-xs font-bold leading-normal text-center truncate w-full px-0.5 ${
                  isVipCard ? 'text-white' : 'text-slate-800 dark:text-slate-100'
                }`}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export const FeatureGrid = React.memo(FeatureGridImpl);

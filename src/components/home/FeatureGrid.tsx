import React from 'react';
import { Crown } from 'lucide-react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';
import {
  IconNearbyFood,
  IconCravingSpark,
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
      iconContainerClass:
        'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 ring-1 ring-emerald-500/30',
      onClick: onNearbyFoodSearch,
    },
    {
      id: 'compare-dishes',
      label: tr(language, 'ប្រៀបធៀបម្ហូប', 'Compare Dishes', '美食对比'),
      icon: IconCravingSpark,
      badgeType: 'free',
      badgeLabel: tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费'),
      iconContainerClass:
        'bg-teal-500/15 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300 ring-1 ring-teal-500/30',
      onClick: onNearbyPlaces,
    },
    {
      id: 'food-recommend',
      label: tr(language, 'ណែនាំម្ហូប', 'Food Picks', '美食推荐'),
      icon: IconFoodPicks,
      badgeType: 'free',
      badgeLabel: tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费'),
      iconContainerClass:
        'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 ring-1 ring-amber-500/30',
      onClick: onFoodRecommendations,
    },
    {
      id: 'daily-food',
      label: tr(language, 'ម្ហូបតាមខេត្ត', 'Food by Province', '各省美食'),
      icon: IconProvinceFood,
      badgeType: 'free',
      badgeLabel: tr(language, '២៥ ខេត្ត', '25 Prov', '25省市'),
      iconContainerClass:
        'bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300 ring-1 ring-orange-500/30',
      onClick: onDailyFoodDiscovery,
    },
    {
      id: 'map-nav',
      label: tr(language, 'ផែនទីធ្វើដំណើរ', 'Map Route', '地图导航'),
      icon: IconMapRoute,
      badgeType: 'free',
      badgeLabel: tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费'),
      iconContainerClass:
        'bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300 ring-1 ring-sky-500/30',
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
        'bg-amber-400/20 text-amber-600 dark:bg-amber-400/25 dark:text-amber-300 ring-1 ring-amber-400/45',
      onClick: onSmartAiAssistant,
    },
  ];

  return (
    <section aria-label={tr(language, 'សេវាកម្មឆ្លាតវៃប្រចាំថ្ងៃ', 'Daily Smart Services', '日常智能服务')}>
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => {
          const Icon = it.icon;
          const isVipCard = it.badgeType === 'vip';
          return (
            <button
              key={it.id}
              id={`kft-feature-${it.id}-btn`}
              type="button"
              onClick={it.onClick}
              className={`group relative rounded-2xl py-2.5 px-1.5 flex flex-col items-center justify-center gap-1 transition active:scale-[0.97] cursor-pointer shadow-xs ${
                isVipCard
                  ? 'bg-gradient-to-b from-slate-800/95 to-amber-950/35 border border-amber-400/45 hover:border-amber-400/75'
                  : 'bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/40'
              }`}
            >
              {/* Compact top-right Free / VIP indicator pill */}
              <span
                className={`absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full text-[8px] font-extrabold leading-none ${
                  isVipCard
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/25'
                }`}
              >
                {isVipCard && <Crown className="w-2 h-2 text-amber-300 shrink-0" />}
                <span>{it.badgeLabel}</span>
              </span>

              {/* Clean centered handcrafted icon */}
              <span
                className={`w-9 h-9 rounded-xl ${it.iconContainerClass} flex items-center justify-center shrink-0 mt-1 transition-transform group-hover:scale-105`}
              >
                <Icon className="w-[19px] h-[19px]" />
              </span>

              {/* Crisp 1-line Khmer label with sufficient vertical line-height so subscripts never clip */}
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 leading-normal text-center truncate w-full px-0.5 pt-0.5">
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

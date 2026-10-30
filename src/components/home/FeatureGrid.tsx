import React from 'react';
import {
  UtensilsCrossed,
  MapPin,
  Sparkles,
  Compass,
  Navigation,
  Bot,
  Crown,
} from 'lucide-react';
import { Language } from '../../types';

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

/**
 * Compact 3-column x 2-row Home Screen Feature Grid (v2.4.0 proportions)
 * Fits neatly above the fold with clear Khmer labels and Free/VIP access badges.
 */
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
  const isKm = language === 'km';
  const isZh = language === 'zh';
  const t = (km: string, en: string, zh: string) => (isKm ? km : isZh ? zh : en);

  const freeBadge = t('ឥតគិតថ្លៃ', 'FREE', '免费');
  const vipBadge = isVip ? 'VIP ✓' : 'VIP';

  const items = [
    {
      key: 'nearby_food',
      icon: UtensilsCrossed,
      label: t('ម្ហូបជិតខ្ញុំ', 'Nearby Food', '附近美食'),
      tone: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
      tier: 'free' as const,
      onClick: onNearbyFoodSearch,
    },
    {
      key: 'nearby_places',
      icon: MapPin,
      label: t('កន្លែងជិតខ្ញុំ', 'Nearby Places', '附近景点'),
      tone: 'bg-teal-500/15 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300',
      tier: 'free' as const,
      onClick: onNearbyPlaces,
    },
    {
      key: 'food_recommend',
      icon: Sparkles,
      label: t('ណែនាំម្ហូប', 'Food Picks', '美食推荐'),
      tone: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
      tier: 'free' as const,
      onClick: onFoodRecommendations,
    },
    {
      key: 'province_food_discovery',
      icon: Compass,
      label: t('ម្ហូបតាមខេត្ត', 'Food by Province', '各省美食'),
      tone: 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
      tier: 'free' as const,
      onClick: onDailyFoodDiscovery,
    },
    {
      key: 'map_navigation',
      icon: Navigation,
      label: t('ផែនទីនាំផ្លូវ', 'Map Route', '地图导航'),
      tone: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
      tier: 'free' as const,
      onClick: onMapNavigation,
    },
    {
      key: 'smart_ai',
      icon: Bot,
      label: t('ជំនួយការ AI', 'AI Assistant', 'AI 助手'),
      tone: 'bg-amber-400/25 text-amber-600 dark:bg-amber-400/25 dark:text-amber-300',
      tier: 'vip' as const,
      onClick: onSmartAiAssistant,
    },
  ];

  return (
    <section
      aria-label={t('មុខងាររហ័ស', 'Quick actions', '快捷功能')}
      className="grid grid-cols-3 gap-2"
    >
      {items.map((it) => {
        const Icon = it.icon;
        const isVipTile = it.tier === 'vip';
        return (
          <button
            key={it.key}
            type="button"
            onClick={it.onClick}
            className={`group relative min-h-[78px] rounded-2xl border py-2.5 px-1.5 flex flex-col items-center justify-center gap-1.5 shadow-sm hover:shadow-md active:scale-95 transition cursor-pointer ${
              isVipTile
                ? 'bg-gradient-to-br from-amber-50/90 via-white to-emerald-50/50 dark:from-slate-800/90 dark:via-slate-800/80 dark:to-amber-950/30 border-amber-400/50 dark:border-amber-400/40'
                : 'bg-white dark:bg-slate-800/70 border-slate-200/80 dark:border-white/10'
            }`}
          >
            {/* Compact Top-Right Access Badge (FREE vs VIP) */}
            {isVipTile ? (
              <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 text-[8.5px] font-black leading-tight shadow-2xs">
                <Crown className="w-2.5 h-2.5 fill-current" />
                <span>{vipBadge}</span>
              </span>
            ) : (
              <span className="absolute top-1.5 right-1.5 inline-flex items-center px-1.5 py-0.2 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[8px] font-extrabold leading-tight">
                {freeBadge}
              </span>
            )}

            {/* Compact Icon (matching v2.4.0 proportions) */}
            <span
              className={`w-9 h-9 rounded-xl ${it.tone} flex items-center justify-center group-hover:scale-105 transition mt-1`}
            >
              <Icon className="w-4 h-4" />
            </span>

            {/* Crisp 1-line Khmer / EN / ZH Label */}
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight text-center line-clamp-1 px-0.5">
              {it.label}
            </span>
          </button>
        );
      })}
    </section>
  );
};

export const FeatureGrid = React.memo(FeatureGridImpl);

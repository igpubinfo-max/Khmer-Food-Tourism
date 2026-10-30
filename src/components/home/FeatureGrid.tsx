import React from 'react';
import {
  UtensilsCrossed,
  MapPin,
  Sparkles,
  Flame,
  Navigation,
  Bot,
  Crown,
  CheckCircle2,
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
 * 6 Smart Daily Service buttons on the Home Screen:
 *  1. Nearby Food Search (FREE)
 *  2. Nearby Places (FREE)
 *  3. Food Recommendations (FREE)
 *  4. Daily Food Discovery (FREE)
 *  5. Map Navigation (FREE)
 *  6. Smart AI Assistant (VIP)
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

  const freeBadgeLabel = t('ឥតគិតថ្លៃ', 'FREE', '免费');
  const vipBadgeLabel = isVip ? t('VIP ✓', 'VIP ✓', 'VIP ✓') : 'VIP';

  const items = [
    {
      key: 'nearby_food',
      icon: UtensilsCrossed,
      title: t('ស្វែងរកម្ហូបជិតខ្ញុំ', 'Nearby Food Search', '附近美食搜索'),
      subtitle: t('រកម្ហូប និងហាងឆ្ងាញ់ៗក្បែរ GPS', 'Dishes & restaurants near you', '搜索身边的美食与餐厅'),
      iconTone: 'bg-emerald-600 text-white shadow-emerald-600/25',
      cardTone:
        'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-white/10 hover:border-emerald-500/60',
      tier: 'free' as const,
      onClick: onNearbyFoodSearch,
    },
    {
      key: 'nearby_places',
      icon: MapPin,
      title: t('កន្លែងជិតខ្ញុំ', 'Nearby Places', '附近景点好去处'),
      subtitle: t('រមណីយដ្ឋាន និងកន្លែងកម្សាន្តជិតអ្នក', 'Attractions & spots around you', '查找周边的景点与打卡地'),
      iconTone: 'bg-teal-600 text-white shadow-teal-600/25',
      cardTone:
        'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-white/10 hover:border-teal-500/60',
      tier: 'free' as const,
      onClick: onNearbyPlaces,
    },
    {
      key: 'food_recommend',
      icon: Sparkles,
      title: t('ណែនាំមុខម្ហូប', 'Food Recommendations', '智能美食推荐'),
      subtitle: t('ណែនាំម្ហូបតាមពេលវេលា & ចំណូលចិត្ត', 'Smart picks by meal & craving', '按时段与口味智能推荐菜品'),
      iconTone: 'bg-amber-500 text-slate-950 shadow-amber-500/25',
      cardTone:
        'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-white/10 hover:border-amber-500/60',
      tier: 'free' as const,
      onClick: onFoodRecommendations,
    },
    {
      key: 'daily_discovery',
      icon: Flame,
      title: t('ស្វែងយល់ម្ហូបប្រចាំថ្ងៃ', 'Daily Food Discovery', '每日美食探索'),
      subtitle: t('មុខម្ហូបប្លែកៗ ហាងថ្មី និងប្រូម៉ូសិន', 'Fresh dishes, new shops & promos', '今日特色菜品、新店与优惠'),
      iconTone: 'bg-rose-600 text-white shadow-rose-600/25',
      cardTone:
        'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-white/10 hover:border-rose-500/60',
      tier: 'free' as const,
      onClick: onDailyFoodDiscovery,
    },
    {
      key: 'map_navigation',
      icon: Navigation,
      title: t('នាំផ្លូវលើផែនទី', 'Map Navigation', '地图搜索与导航'),
      subtitle: t('ស្វែងរកទីតាំង និងនាំផ្លូវផ្ទាល់លើផែនទី', 'Search map & turn-by-turn route', '搜索全柬地点并开启导航'),
      iconTone: 'bg-blue-600 text-white shadow-blue-600/25',
      cardTone:
        'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-white/10 hover:border-blue-500/60',
      tier: 'free' as const,
      onClick: onMapNavigation,
    },
    {
      key: 'smart_ai',
      icon: Bot,
      title: t('ជំនួយការឆ្លាតវៃ AI', 'Smart AI Assistant', 'AI 智能助手'),
      subtitle: t('ជំនួយការរើសម្ហូប សុខភាព & ផែនការ AI', 'AI food, nutrition & route helper', 'AI 选餐顾问、营养与路线助手'),
      iconTone: 'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-amber-500/30',
      cardTone:
        'bg-gradient-to-br from-amber-50/90 via-white to-emerald-50/60 dark:from-slate-800 dark:via-slate-800/95 dark:to-emerald-950/40 border-amber-300/90 dark:border-amber-500/40 hover:border-amber-400',
      tier: 'vip' as const,
      onClick: onSmartAiAssistant,
    },
  ];

  return (
    <section aria-label={t('សេវាកម្មឆ្លាតវៃប្រចាំថ្ងៃ', 'Smart Daily Services', '每日智能服务')} className="space-y-2.5">
      {/* Section Header with Clear Free vs. VIP Access Legend */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h2 className="font-moul text-xs sm:text-sm text-[#064E3B] dark:text-emerald-300 truncate">
            {t('សេវាកម្មឆ្លាតវៃប្រចាំថ្ងៃ', 'Smart Daily Services', '每日智能生活服务')}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {t(
              'ស្វែងរកម្ហូប ទីតាំងជិតអ្នក និងនាំផ្លូវដោយឥតគិតថ្លៃ • AI កម្រិតខ្ពស់សម្រាប់ VIP',
              'Free nearby food, places & map navigation • Advanced AI for VIP',
              '免费搜索附近美食、景点与地图导航 • 高级 AI 专属 VIP'
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-700 text-[10px] font-extrabold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>5 {freeBadgeLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 text-[10px] font-black shadow-2xs">
            <Crown className="w-3 h-3" />
            <span>1 VIP</span>
          </span>
        </div>
      </div>

      {/* 6 Smart Service Cards (2 Columns x 3 Rows for clear titles, subtitles & Free/VIP badges) */}
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((it) => {
          const Icon = it.icon;
          const isVipTile = it.tier === 'vip';
          return (
            <button
              key={it.key}
              type="button"
              onClick={it.onClick}
              className={`group relative rounded-2xl border p-3 text-left shadow-xs hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between gap-2 cursor-pointer ${it.cardTone}`}
            >
              {/* Top Row: Icon + Free/VIP Access Badge */}
              <div className="flex items-start justify-between gap-2 w-full">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform ${it.iconTone}`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {isVipTile ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 text-[10px] font-black shadow-xs border border-amber-500/40 shrink-0">
                    <Crown className="w-3 h-3 fill-current" />
                    <span>{vipBadgeLabel}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-extrabold shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{freeBadgeLabel}</span>
                  </span>
                )}
              </div>

              {/* Bottom Row: Title + Practical Daily Subtitle */}
              <div className="space-y-0.5 min-w-0 w-full">
                <div className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white leading-snug truncate group-hover:text-[#064E3B] dark:group-hover:text-emerald-300 transition-colors">
                  {it.title}
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
                  {it.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export const FeatureGrid = React.memo(FeatureGridImpl);

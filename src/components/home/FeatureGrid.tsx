import React from 'react';
import { UtensilsCrossed, MapPin, Leaf, CalendarDays, Bell, Globe } from 'lucide-react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';

interface Props {
  language: Language;
  isVip?: boolean;
  unreadCount: number;
  onWhatToEat: () => void;
  onNearMe: () => void;
  onSmartMenu: () => void;
  onDaily: () => void;
  onAlerts: () => void;
  onMapsSearch: () => void;
}

/**
 * Six clear, equal-weight feature shortcuts that open their respective tools directly.
 */
export const FeatureGrid: React.FC<Props> = ({
  language,
  unreadCount,
  onWhatToEat,
  onNearMe,
  onSmartMenu,
  onDaily,
  onAlerts,
  onMapsSearch,
}) => {
  const tiles = [
    {
      id: 'eat',
      Icon: UtensilsCrossed,
      gradient: 'from-amber-400 to-orange-500',
      label: tr(language, 'ញ៉ាំអ្វីល្អ?', 'What to Eat', '吃什么'),
      onClick: onWhatToEat,
    },
    {
      id: 'near',
      Icon: MapPin,
      gradient: 'from-emerald-400 to-teal-600',
      label: tr(language, 'នៅជិតខ្ញុំ', 'Near Me', '附近'),
      onClick: onNearMe,
    },
    {
      id: 'menu',
      Icon: Leaf,
      gradient: 'from-lime-400 to-emerald-600',
      label: tr(language, 'ម៉ឺនុយឆ្លាតវៃ', 'Smart Menu', '智能菜单'),
      onClick: onSmartMenu,
    },
    {
      id: 'daily',
      Icon: CalendarDays,
      gradient: 'from-sky-400 to-indigo-500',
      label: tr(language, 'ថ្មីប្រចាំថ្ងៃ', 'Daily New', '每日新发现'),
      onClick: onDaily,
    },
    {
      id: 'alerts',
      Icon: Bell,
      gradient: 'from-rose-400 to-pink-600',
      label: tr(language, 'ការជូនដំណឹង', 'Alerts', '通知'),
      onClick: onAlerts,
      badge: unreadCount > 0 ? unreadCount : 0,
    },
    {
      id: 'maps',
      Icon: Globe,
      gradient: 'from-violet-400 to-purple-600',
      label: tr(language, 'ស្វែងរកលើផែនទី', 'Maps Search', '地图搜索'),
      onClick: onMapsSearch,
    },
  ];

  return (
    <section
      className="grid grid-cols-3 gap-2.5"
      aria-label={tr(language, 'មុខងារសំខាន់ៗ', 'Main features', '主要功能')}
    >
      {tiles.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={t.onClick}
          className="relative min-h-[96px] px-2 py-3 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md active:scale-95 transition cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
        >
          <span
            className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${t.gradient} text-white flex items-center justify-center shadow-md`}
            aria-hidden="true"
          >
            <t.Icon className="w-5 h-5" />
          </span>
          <span className="text-[12px] font-bold leading-snug text-slate-800 dark:text-slate-100 line-clamp-2">
            {t.label}
          </span>

          {'badge' in t && t.badge ? (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow">
              {t.badge > 99 ? '99+' : t.badge}
            </span>
          ) : null}
        </button>
      ))}
    </section>
  );
};

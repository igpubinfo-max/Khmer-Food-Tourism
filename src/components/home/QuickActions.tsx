import React from 'react';
import { UtensilsCrossed, MapPin, Lock } from 'lucide-react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';

export interface QuickActionHandlers {
  onWhatToEat: () => void;
  onNearMe?: () => void;
  onCheckIn?: () => void;
}

interface Props extends QuickActionHandlers {
  language: Language;
  /** Show a small lock badge on VIP-gated actions for free users */
  showVipLock: boolean;
}

/** Exactly 2 big quick-action cards (each >= 88px tall, easy to tap). */
export const QuickActions: React.FC<Props> = ({
  language,
  showVipLock,
  onWhatToEat,
  onNearMe,
  onCheckIn,
}) => {
  const handleNearMeAction = onNearMe || onCheckIn || (() => {});

  const cards = [
    {
      id: 'eat',
      Icon: UtensilsCrossed,
      iconTone: 'bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300 border border-amber-400/30',
      title: tr(language, 'ញ៉ាំអ្វីល្អ?', 'What should I eat?', '吃什么好？'),
      sub: tr(language, 'ជ្រើសតាមថវិកា', 'Smart meal match', '按预算推荐'),
      bg: 'from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/40 dark:to-slate-800 dark:border-amber-700/50',
      lock: true,
      onClick: onWhatToEat,
    },
    {
      id: 'nearme',
      Icon: MapPin,
      iconTone: 'bg-emerald-600/15 text-[#064E3B] dark:bg-emerald-400/15 dark:text-emerald-300 border border-emerald-500/30',
      title: tr(language, 'កន្លែងនៅជិតខ្ញុំ', 'Nearby Places', '附近好去处'),
      sub: tr(language, 'ហាង និងកន្លែងដើរលេងក្បែរអ្នក', 'Food & sights around you', '身边的美食与景点'),
      bg: 'from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-950/40 dark:to-slate-800 dark:border-emerald-700/50',
      lock: true,
      onClick: handleNearMeAction,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3" aria-label={tr(language, 'សកម្មភាពរហ័ស', 'Quick actions', '快捷操作')}>
      {cards.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={c.onClick}
          className={`relative min-h-[96px] p-3.5 rounded-2xl border bg-gradient-to-br ${c.bg} text-left shadow-xs transition active:scale-[0.97] hover:shadow-md cursor-pointer flex flex-col justify-between`}
        >
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.iconTone}`} aria-hidden="true">
            <c.Icon className="w-5 h-5" />
          </span>
          <span className="mt-2 block">
            <span className="block text-[15px] font-bold text-slate-900 dark:text-white leading-tight">{c.title}</span>
            <span className="block text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">{c.sub}</span>
          </span>
          {showVipLock && c.lock && (
            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-slate-900/85 text-amber-300 text-[10px] font-bold inline-flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              <span>VIP</span>
            </span>
          )}
        </button>
      ))}
    </section>
  );
};

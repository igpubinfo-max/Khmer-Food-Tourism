import React from 'react';
import { ChevronRight, Lock, Crown, UtensilsCrossed, Leaf, Route, MapPin, Heart, Flame, Compass } from 'lucide-react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';

interface Props {
  language: Language;
  onOpen: () => void;
  showVipLock?: boolean;
  onUpgradeVip?: () => void;
}

/**
 * Premium teaser entry to the Smart Menu (Special Menu & Healthy Food).
 * Curiosity-driven: short hook, "what's inside" chips, gold shimmer, VIP key.
 */
export const SmartMenuBanner: React.FC<Props> = ({ language, onOpen, showVipLock = false, onUpgradeVip }) => {
  const chips = [
    { icon: Leaf, label: tr(language, 'ម្ហូបសុខភាព', 'Healthy picks', '健康美食') },
    { icon: Route, label: tr(language, 'ដំណើរ ១ ថ្ងៃ', '1-day trip', '一日行程') },
    { icon: MapPin, label: tr(language, 'នៅជិតខ្ញុំ', 'Near me', '附近') },
    { icon: Heart, label: tr(language, 'ចំណូលចិត្ត', 'Favorites', '收藏') },
    { icon: Compass, label: tr(language, 'ផែនការដើរលេង AI', 'AI Trip Plan', 'AI 行程规划') },
    { icon: Flame, label: tr(language, 'កំពុងពេញនិយម', 'Trending', '热门') },
  ];

  return (
    <div className="kft-premium-card relative w-full overflow-hidden rounded-3xl border border-amber-300/60 bg-gradient-to-br from-[#022c22] via-[#064E3B] to-[#0b1f1a] text-white">
      {/* decorative gold glow + shimmer sweep */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="kft-shimmer-bar absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent" />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="relative w-full p-4 pb-3 flex items-center gap-3 text-left active:scale-[0.99] transition motion-reduce:transition-none cursor-pointer"
      >
        <span className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30 border border-amber-100/60">
          <UtensilsCrossed className="w-7 h-7 stroke-[2.2]" />
          {showVipLock && (
            <span className="kft-key-wiggle absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-950 border border-amber-300 text-amber-300 flex items-center justify-center shadow">
              <Lock className="w-3 h-3" />
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.18em] text-amber-300/90 uppercase">
            <Crown className="w-3 h-3" />
            {tr(language, 'ពិសេសសម្រាប់ VIP', 'VIP Exclusive', 'VIP 专享')}
          </span>
          <span className="block font-moul text-[15px] leading-snug text-amber-100 mt-0.5">
            {tr(language, 'មានអ្វីនៅខាងក្នុង?', "What's inside?", '里面有什么？')}
          </span>
          <span className="block text-[11px] text-emerald-100/90 mt-0.5 leading-snug">
            {tr(
              language,
              'ម៉ឺនុយឆ្លាតវៃ · ម្ហូបសុខភាព · ផែនការអាហារ',
              'Smart Menu · Healthy Food · Your personal food guide',
              '智能菜单 · 健康饮食 · 专属美食向导'
            )}
          </span>
        </span>

        <ChevronRight className="w-5 h-5 text-amber-300 shrink-0" />
      </button>

      {/* teaser chips */}
      <div className="relative px-4 pb-3 flex flex-wrap gap-1.5">
        {chips.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-amber-300/30 text-[10.5px] font-bold text-amber-100 backdrop-blur-sm"
          >
            <Icon className="w-3 h-3 text-amber-300" />
            {label}
          </span>
        ))}
      </div>

      {showVipLock && onUpgradeVip && (
        <div className="relative px-4 py-2.5 border-t border-amber-300/20 bg-black/25 flex items-center justify-between gap-2">
          <span className="text-[11px] text-amber-200 font-bold flex items-center gap-1.5 min-w-0">
            <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="truncate">
              {tr(language, 'ដោះសោភ្លាមៗ ដោយ VIP', 'Unlock instantly with VIP', 'VIP 即刻解锁')}
            </span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpgradeVip();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 hover:from-amber-200 text-slate-950 text-xs font-black inline-flex items-center gap-1 shadow-md shrink-0 active:scale-95 transition cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>{tr(language, 'ដំឡើង VIP', 'Upgrade VIP', '升级 VIP')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

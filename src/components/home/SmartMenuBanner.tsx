import React from 'react';
import { LayoutGrid, ChevronRight, Lock, Crown } from 'lucide-react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';

interface Props {
  language: Language;
  onOpen: () => void;
  showVipLock?: boolean;
  onUpgradeVip?: () => void;
}

/** One prominent entry to the Smart Menu (Special Menu & Healthy Food). Shows VIP badge + upgrade CTA for free users. */
export const SmartMenuBanner: React.FC<Props> = ({ language, onOpen, showVipLock = false, onUpgradeVip }) => (
  <div className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-[#064E3B] to-teal-800 text-white shadow-md ring-2 ring-amber-300/60 space-y-2.5">
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 text-left active:scale-[0.98] transition motion-reduce:transition-none cursor-pointer"
    >
      <span className="relative w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
        <LayoutGrid className="w-6 h-6" />
        {showVipLock && (
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[9px] font-black border border-amber-400 flex items-center gap-0.5 shadow-sm">
            <Lock className="w-2.5 h-2.5" />
            VIP
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 flex-wrap">
          <span className="font-moul text-sm text-amber-200 leading-snug">
            {tr(language, 'ម៉ឺនុយពិសេស & ជម្រើសម្ហូបសុខភាព', 'Smart Menu & Healthy Filter', '智能菜单与健康饮食筛选')}
          </span>
          {showVipLock && (
            <span className="px-2 py-0.5 rounded-full bg-slate-900/90 text-amber-300 text-[10px] font-extrabold border border-amber-400/50 inline-flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              <span>VIP</span>
            </span>
          )}
        </span>
        <span className="block text-xs text-emerald-100 mt-0.5">
          {tr(language, 'ស្លាកម្ហូប • ដំណើរ ១ ថ្ងៃ • នៅជិតខ្ញុំ • ចំណូលចិត្ត', 'Dish tags • 1-day trips • Near me • Favorites', '菜品标签 • 一日行程 • 附近 • 收藏')}
        </span>
      </span>
      <ChevronRight className="w-5 h-5 text-amber-200 shrink-0" />
    </button>

    {showVipLock && onUpgradeVip && (
      <div className="pt-2 border-t border-white/15 flex items-center justify-between gap-2">
        <span className="text-[11px] text-amber-200 font-bold flex items-center gap-1.5 min-w-0">
          <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="truncate">
            {tr(
              language,
              'សម្រាប់សមាជិក VIP • ដោះសោមុខងារពិសេសទាំងអស់',
              'VIP Members Only · Unlock Special & Healthy Food',
              'VIP 会员专属 · 解锁特色与健康饮食功能'
            )}
          </span>
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpgradeVip();
          }}
          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold inline-flex items-center gap-1 shadow-sm shrink-0 active:scale-95 transition cursor-pointer"
        >
          <Crown className="w-3.5 h-3.5" />
          <span>{tr(language, 'ដំឡើង VIP', 'Upgrade VIP', '升级 VIP')}</span>
        </button>
      </div>
    )}
  </div>
);

import React from 'react';
import { LayoutGrid, ChevronRight } from 'lucide-react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';

interface Props {
  language: Language;
  onOpen: () => void;
}

/** One prominent entry to the Smart Menu (dish tags + trips, near me, favorites, stamps, share, offline status). */
export const SmartMenuBanner: React.FC<Props> = ({ language, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="w-full min-h-[72px] p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-[#064E3B] to-teal-800 text-white text-left shadow-md flex items-center gap-3 ring-2 ring-amber-300/60 active:scale-[0.98] transition motion-reduce:transition-none cursor-pointer"
  >
    <span className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
      <LayoutGrid className="w-6 h-6" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-moul text-sm text-amber-200 leading-snug">
        {tr(language, 'ម៉ឺនុយពិសេស & ជម្រើសម្ហូបសុខភាព', 'Smart Menu & Healthy Filter', '智能菜单与健康饮食筛选')}
      </span>
      <span className="block text-xs text-emerald-100">
        {tr(language, 'ស្លាកម្ហូប • ដំណើរ ១ ថ្ងៃ • នៅជិតខ្ញុំ • ចំណូលចិត្ត', 'Dish tags • 1-day trips • Near me • Favorites', '菜品标签 • 一日行程 • 附近 • 收藏')}
      </span>
    </span>
    <ChevronRight className="w-5 h-5 text-amber-200 shrink-0" />
  </button>
);

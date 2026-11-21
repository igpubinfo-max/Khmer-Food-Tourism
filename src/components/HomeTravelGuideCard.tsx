import React from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import type { Language } from '../types';
import { tr } from '../utils/i18n';

interface HomeTravelGuideCardProps {
  language: Language;
  onOpen: () => void;
}

/**
 * Compact home card that surfaces the Travel guide tab (tips, holidays, key phrases, emergency
 * contacts, Angkor visit guide) so the app reads as a food + tourism discovery guide at a glance.
 */
export const HomeTravelGuideCard: React.FC<HomeTravelGuideCardProps> = ({ language, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="w-full flex items-center gap-3 p-3 rounded-3xl bg-white border border-emerald-200/80 shadow-xs text-left cursor-pointer active:scale-[0.99] transition"
  >
    <span className="shrink-0 w-11 h-11 rounded-2xl bg-emerald-50 text-[#064E3B] flex items-center justify-center">
      <BookOpen className="w-6 h-6" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-bold text-sm text-slate-900 leading-[1.6]">
        {tr(language, 'មគ្គុទ្ទេសក៍ធ្វើដំណើរ', 'Travel guide', '旅行指南')}
      </span>
      <span className="block text-[11px] text-slate-600 leading-[1.6]">
        {tr(
          language,
          'គន្លឹះ ថ្ងៃបុណ្យ ឃ្លាសំខាន់ៗ និងលេខសង្គ្រោះបន្ទាន់',
          'Tips, holidays, key phrases and emergency contacts',
          '出行贴士、节日、常用语和紧急联系方式'
        )}
      </span>
    </span>
    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
  </button>
);

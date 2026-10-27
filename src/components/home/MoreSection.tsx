import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';

interface Props {
  language: Language;
  children: React.ReactNode | (() => React.ReactNode);
}

/** Collapsible "More" section: everything secondary lives here, collapsed by default. */
export const MoreSection: React.FC<Props> = ({ language, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full min-h-[52px] px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between text-base font-bold text-[#064E3B] dark:text-emerald-300 cursor-pointer active:scale-[0.99] transition"
      >
        <span>
          {open
            ? tr(language, 'លាក់ព័ត៌មានបន្ថែម', 'Show less', '收起')
            : tr(language, 'មើលបន្ថែម (VIP, ហាងរបស់ខ្ញុំ...)', 'More (VIP, my shop...)', '更多（VIP、我的店铺…）')}
        </span>
        <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {typeof children === 'function' ? children() : children}
        </div>
      )}
    </section>
  );
};

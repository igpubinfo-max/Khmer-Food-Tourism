import React from 'react';
import { ChevronRight } from 'lucide-react';
import { headingFont } from './homeUtils';
import { useApp } from '../../context/AppContext';

interface Props {
  icon?: React.ElementType;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional custom control on the right (e.g. shuffle button). Replaces the action link. */
  right?: React.ReactNode;
}

/** Consistent section title used across the Home screen: gold accent bar, title, optional subtitle and "see all" link. */
export const SectionHeader: React.FC<Props> = ({ icon: Icon, title, subtitle, actionLabel, onAction, right }) => {
  const { language } = useApp();
  return (
  <div className="flex items-end justify-between gap-3">
    <div className="min-w-0 flex items-start gap-2.5">
      <span className="mt-1 w-1 h-9 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <h3 className={`${headingFont(language)} text-[15px] leading-snug text-[#064E3B] dark:text-emerald-100 flex items-center gap-1.5`}>
          {Icon && <Icon className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />}
          <span className="truncate">{title}</span>
        </h3>
        {subtitle && (
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{subtitle}</p>
        )}
      </div>
    </div>
    {right ? (
      <div className="shrink-0">{right}</div>
    ) : (
      actionLabel &&
      onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 min-h-[36px] px-1 flex items-center gap-0.5 text-xs font-bold text-emerald-700 dark:text-amber-300 hover:opacity-80 active:scale-95 transition cursor-pointer"
        >
          <span>{actionLabel}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )
    )}
  </div>
  );
};

import React from 'react';
import { Phone, Navigation, MapPin } from 'lucide-react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';

interface DetailActionBarProps {
  language: Language;
  /** Show the Call button only when a phone number exists. */
  hasPhone?: boolean;
  onCall?: () => void;
  onDirections: () => void;
  onMaps: () => void;
}

/**
 * Sticky bottom action bar shared by Shop / Hotel / Tourism detail screens.
 * Directions is the single primary action; Call and Google Maps are secondary.
 */
export const DetailActionBar: React.FC<DetailActionBarProps> = ({
  language,
  hasPhone,
  onCall,
  onDirections,
  onMaps,
}) => {
  const base =
    'h-11 rounded-2xl flex items-center justify-center gap-1.5 text-[12px] sm:text-[13px] font-extrabold font-khmer shadow active:scale-95 transition cursor-pointer whitespace-nowrap px-2';
  return (
    <div
      data-testid="detail-action-bar"
      className="shrink-0 flex items-center gap-2 px-3 pt-2 border-t border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-950/95 backdrop-blur"
      style={{ paddingBottom: 'calc(var(--kft-safe-bottom, 0px) + 8px)' }}
    >
      {hasPhone && onCall && (
        <button type="button" onClick={onCall} className={`${base} flex-1 bg-emerald-600 hover:bg-emerald-500 text-white`}>
          <Phone className="w-4 h-4 fill-white shrink-0" />
          <span>{tr(language, 'ហៅទូរស័ព្ទ', 'Call', '致电')}</span>
        </button>
      )}
      <button
        type="button"
        onClick={onDirections}
        className={`${base} flex-[1.6] bg-amber-400 hover:bg-amber-300 text-slate-950`}
      >
        <Navigation className="w-4 h-4 fill-slate-950 shrink-0" />
        <span>{tr(language, 'នាំផ្លូវ', 'Directions', '导航')}</span>
      </button>
      <button
        type="button"
        onClick={onMaps}
        className={`${base} flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white border border-slate-300 dark:border-white/10`}
      >
        <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
        <span>{tr(language, 'ផែនទី', 'Maps', '地图')}</span>
      </button>
    </div>
  );
};

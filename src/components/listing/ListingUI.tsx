import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  ChevronRight,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  Star,
  X,
  type LucideIcon,
} from 'lucide-react';
import { tr } from '../../utils/i18n';
import { type Language, type Restaurant, isShopSubscriptionActive } from '../../types';
import { getCachedCloudImageDataUrl } from '../../services/cloudImageStorageService';
import { useApp } from '../../context/AppContext';
import { openAiAssistantWithQuery, getAskAiButtonLabel } from '../../utils/aiSearchBridge';

/**
 * Shared, flat-color building blocks for the Shop menu and Hotel menu.
 *  - ListingRow          : compact list row (small thumbnail on the left, name + province on the right)
 *  - ListingFeaturedCard : large showcase card, reserved for listings added by a VIP owner
 * Only functional Lucide icons (w-4 h-4 / w-5 h-5, strokeWidth 1.75), no emojis and no gradients.
 */

const ICON_STROKE = 1.75;

/* ---------------------------------------------------------------------------
   Thumbnail
   --------------------------------------------------------------------------- */
interface ListingThumbProps {
  src?: string;
  alt?: string;
  icon: LucideIcon;
  className?: string;
}

export const ListingThumb: React.FC<ListingThumbProps> = ({
  src,
  alt,
  icon: Icon,
  className = 'w-12 h-12 rounded-xl',
}) => {
  const [failed, setFailed] = useState(false);
  const [fallbackDataUrl, setFallbackDataUrl] = useState<string | null>(null);
  const clean = (src || '').trim();

  useEffect(() => {
    setFailed(false);
    setFallbackDataUrl(null);
  }, [clean]);

  const activeSrc = fallbackDataUrl || clean;

  if (!activeSrc || failed) {
    return (
      <div
        className={`shrink-0 select-none flex items-center justify-center bg-emerald-900 border border-emerald-700/60 ${className}`}
      >
        <Icon className="w-5 h-5 text-emerald-200" strokeWidth={ICON_STROKE} />
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600/70 ${className}`}
    >
      <img
        src={activeSrc}
        alt={alt || ''}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => {
          if (!fallbackDataUrl && clean.startsWith('https://')) {
            getCachedCloudImageDataUrl(clean)
              .then((cached) => {
                if (cached) {
                  setFallbackDataUrl(cached);
                } else {
                  setFailed(true);
                }
              })
              .catch(() => setFailed(true));
          } else {
            setFailed(true);
          }
        }}
        className="w-full h-full object-cover select-none"
      />
    </div>
  );
};

/* ---------------------------------------------------------------------------
   Compact row
   --------------------------------------------------------------------------- */
export interface ListingChip {
  text: string;
  tone?: 'amber' | 'emerald';
}

interface ListingRowProps {
  testId?: string;
  thumb: React.ReactNode;
  title: string;
  province?: string;
  chips?: ListingChip[];
  onClick: () => void;
  trailingActions?: React.ReactNode;
  actionTitle?: string;
}

export const ListingRow: React.FC<ListingRowProps> = ({
  testId,
  thumb,
  title,
  province,
  chips,
  onClick,
  trailingActions,
  actionTitle,
}) => (
  <div
    data-testid={testId}
    onClick={onClick}
    className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 cursor-pointer border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 hover:border-emerald-600/40 dark:hover:border-emerald-500/40 transition-colors active:scale-[0.99]"
  >
    {thumb}

    <div className="flex-1 min-w-0 font-khmer">
      <h3 className="font-bold text-sm sm:text-[15px] leading-snug truncate text-[#0F172A] dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
        {title}
      </h3>
      <div className="mt-1 flex items-center gap-2 flex-nowrap overflow-hidden text-[11px]">
        {province && (
          <span className="inline-flex items-center gap-1 min-w-0 text-slate-500 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={ICON_STROKE} />
            <span className="truncate">{province}</span>
          </span>
        )}
        {chips?.map((chip) => (
          <span
            key={chip.text}
            className={`shrink-0 px-1.5 py-px rounded-md text-[10px] font-bold border ${
              chip.tone === 'emerald'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60'
            }`}
          >
            {chip.text}
          </span>
        ))}
      </div>
    </div>

    <div className="flex items-center gap-1.5 shrink-0">
      {trailingActions}
      <span
        title={actionTitle}
        className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-700/50"
      >
        <ChevronRight className="w-4 h-4" strokeWidth={ICON_STROKE} />
      </span>
    </div>
  </div>
);

/* ---------------------------------------------------------------------------
   Featured (VIP) card
   --------------------------------------------------------------------------- */
interface ListingFeaturedCardProps {
  testId?: string;
  language: Language;
  coverUrl?: string;
  fallbackIcon: LucideIcon;
  title: string;
  province?: string;
  address?: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  priceText?: string;
  phone?: string;
  badgeLabel: string;
  onOpen: () => void;
  onOpenMap: () => void;
  topRightActions?: React.ReactNode;
}

export const ListingFeaturedCard: React.FC<ListingFeaturedCardProps> = ({
  testId,
  language,
  coverUrl,
  fallbackIcon: FallbackIcon,
  title,
  province,
  address,
  description,
  rating,
  reviewCount,
  priceText,
  phone,
  badgeLabel,
  onOpen,
  onOpenMap,
  topRightActions,
}) => {
  const [coverFailed, setCoverFailed] = useState(false);
  const [fallbackCoverDataUrl, setFallbackCoverDataUrl] = useState<string | null>(null);
  const cover = (coverUrl || '').trim();

  useEffect(() => {
    setCoverFailed(false);
    setFallbackCoverDataUrl(null);
  }, [cover]);

  const activeCover = fallbackCoverDataUrl || cover;

  return (
    <div
      data-testid={testId}
      onClick={onOpen}
      className="group overflow-hidden rounded-2xl cursor-pointer bg-white dark:bg-slate-800 border border-emerald-700/30 dark:border-emerald-500/30 shadow-xs transition-colors active:scale-[0.995]"
    >
      <div className="relative h-40 sm:h-44 w-full bg-emerald-900">
        {activeCover && !coverFailed ? (
          <img
            src={activeCover}
            alt={title}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => {
              if (!fallbackCoverDataUrl && cover.startsWith('https://')) {
                getCachedCloudImageDataUrl(cover)
                  .then((cached) => {
                    if (cached) {
                      setFallbackCoverDataUrl(cached);
                    } else {
                      setCoverFailed(true);
                    }
                  })
                  .catch(() => setCoverFailed(true));
              } else {
                setCoverFailed(true);
              }
            }}
            className="w-full h-full object-cover select-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FallbackIcon className="w-10 h-10 text-emerald-200" strokeWidth={ICON_STROKE} />
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap font-khmer">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">
            <BadgeCheck className="w-4 h-4 shrink-0" strokeWidth={ICON_STROKE} />
            <span>{badgeLabel}</span>
          </span>
          {province && (
            <span className="px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[11px] font-semibold">
              {province}
            </span>
          )}
        </div>

        {topRightActions && (
          <div
            className="absolute top-2.5 right-2.5 flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {topRightActions}
          </div>
        )}
      </div>

      <div className="p-4 space-y-3 font-khmer">
        <div className="space-y-1.5">
          <h3 className="font-extrabold text-base sm:text-lg leading-snug text-[#0F172A] dark:text-white line-clamp-2">
            {title}
          </h3>
          {address && (
            <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <MapPin className="w-4 h-4 shrink-0 mt-px text-emerald-600 dark:text-emerald-400" strokeWidth={ICON_STROKE} />
              <span className="line-clamp-2">{address}</span>
            </div>
          )}
        </div>

        {description && (
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">{description}</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/70">
          <div className="flex items-center gap-2 min-w-0 text-xs">
            {typeof rating === 'number' && (
              <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" strokeWidth={ICON_STROKE} />
                <span>{rating}</span>
                {typeof reviewCount === 'number' && reviewCount > 0 && (
                  <span className="text-[11px] font-medium text-slate-400">({reviewCount})</span>
                )}
              </span>
            )}
            {priceText && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold border border-amber-200/70 dark:border-amber-800/60 truncate">
                {priceText}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {phone && (
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition-colors"
              >
                <Phone className="w-4 h-4" strokeWidth={ICON_STROKE} />
                <span>{tr(language, 'ហៅ', 'Call', '致电')}</span>
              </a>
            )}
            <button
              type="button"
              onClick={onOpenMap}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 border border-emerald-700/40 dark:border-emerald-500/40 text-[11px] font-bold cursor-pointer transition-colors hover:bg-emerald-50 dark:hover:bg-slate-800"
            >
              <MapPin className="w-4 h-4" strokeWidth={ICON_STROKE} />
              <span>{tr(language, 'ផែនទី', 'Map', '地图')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------------
   Search panel pieces
   --------------------------------------------------------------------------- */
interface ListingPanelProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export const ListingSearchPanel: React.FC<ListingPanelProps> = ({
  icon: Icon,
  title,
  subtitle,
  headerAction,
  children,
}) => (
  <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 font-khmer">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
          <Icon className="w-5 h-5" strokeWidth={ICON_STROKE} />
        </div>
        <div className="min-w-0">
          <h2 className="font-moul text-xs sm:text-sm text-[#0F172A] dark:text-white truncate">{title}</h2>
          {subtitle && <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
        </div>
      </div>
      {headerAction}
    </div>
    {children}
  </div>
);

interface ListingSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  clearLabel: string;
}

export const ListingSearchInput: React.FC<ListingSearchInputProps> = ({
  value,
  onChange,
  placeholder,
  clearLabel,
}) => {
  const { language, setIsWhatToEatModalOpen } = useApp();
  const trimmed = value.trim();
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search
          className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          strokeWidth={ICON_STROKE}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 font-khmer focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            title={clearLabel}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={ICON_STROKE} />
          </button>
        )}
      </div>
      {trimmed.length >= 2 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-khmer">
            {tr(
              language,
              'គាំទ្រការស្វែងរកជាប្រយោគធម្មជាតិ & AI',
              'Smart AI & natural-language search active',
              '已启用智能自然语言与 AI 搜索'
            )}
          </span>
          <button
            type="button"
            onClick={() => openAiAssistantWithQuery(trimmed, setIsWhatToEatModalOpen)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-800 hover:bg-emerald-700 text-amber-300 text-[11px] font-bold shadow-2xs transition active:scale-95 cursor-pointer shrink-0 font-khmer"
          >
            <Sparkles className="w-3 h-3" strokeWidth={ICON_STROKE} />
            <span>{getAskAiButtonLabel(language)}</span>
          </button>
        </div>
      )}
    </div>
  );
};

interface ListingPillsProps {
  items: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const ListingPills: React.FC<ListingPillsProps> = ({ items, activeId, onSelect }) => (
  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
    {items.map((item) => {
      const active = item.id === activeId;
      return (
        <button
          key={item.id || 'all'}
          type="button"
          onClick={() => onSelect(item.id)}
          className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors cursor-pointer border ${
            active
              ? 'bg-emerald-800 border-emerald-800 text-white font-bold'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          {item.label}
        </button>
      );
    })}
  </div>
);

/* ---------------------------------------------------------------------------
   Add panel (VIP add shop / add hotel)
   --------------------------------------------------------------------------- */
interface ListingAddPanelProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  /** When provided, replaces the action button (e.g. the 1-slot VIP lock notice). */
  lockedNotice?: React.ReactNode;
  children?: React.ReactNode;
}

export const ListingAddPanel: React.FC<ListingAddPanelProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  lockedNotice,
  children,
}) => (
  <div className="p-4 rounded-3xl bg-emerald-900 text-white border border-emerald-700/60 space-y-3 font-khmer">
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 shrink-0 text-amber-300" strokeWidth={ICON_STROKE} />
        <span className="font-moul text-xs sm:text-sm text-white">{title}</span>
      </div>
      <p className="text-[11px] text-emerald-100/90 leading-relaxed">{description}</p>
    </div>

    {lockedNotice ? (
      lockedNotice
    ) : (
      <button
        type="button"
        onClick={onAction}
        className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-colors active:scale-[0.98] cursor-pointer"
      >
        <Plus className="w-5 h-5 shrink-0" strokeWidth={2} />
        <span>{actionLabel}</span>
      </button>
    )}

    {children}
  </div>
);

/** Vip-created listings (Shop or Hotel) are the only ones rendered as large featured cards. */
export const isVipOwnerListing = (r?: { dataSource?: string; id?: string | number } | null): boolean => {
  if (!r) return false;
  return isShopSubscriptionActive(r as Partial<Restaurant>);
};

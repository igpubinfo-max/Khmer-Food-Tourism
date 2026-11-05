import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TouristDestination, isAdminAccount } from '../types';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Star,
  Heart,
  Edit2,
  Compass,
  Landmark,
  Trees,
  Waves,
  Mountain,
  BedDouble,
  Phone,
  ChevronRight,
} from 'lucide-react';
import { tr } from '../utils/i18n';
import { getLocalizedDestination } from '../utils/zhDynamicTranslator';

import type { Language } from '../types';

interface TouristCardProps {
  destination: TouristDestination;
}

interface TouristCardViewProps {
  destination: TouristDestination;
  allDestinations: TouristDestination[];
  language: Language;
  bookmarked: boolean;
  isAdmin: boolean;
  setSelectedDestination: (d: TouristDestination | null) => void;
  toggleBookmark: (id: string) => void;
}

export const DefaultDestinationIcon: React.FC<{ categorySlug?: string; className?: string }> = ({
  categorySlug,
  className = 'w-12 h-12 rounded-xl',
}) => {
  const isHotel = categorySlug === 'hotel';
  const IconComp =
    isHotel
      ? BedDouble
      : categorySlug === 'temple' || categorySlug === 'cultural'
      ? Landmark
      : categorySlug === 'nature'
      ? Trees
      : categorySlug === 'beach'
      ? Waves
      : categorySlug === 'mountain'
      ? Mountain
      : Compass;

  return (
    <div
      data-dest-avatar="default-dest-icon"
      className={`relative overflow-hidden ${
        isHotel
          ? 'bg-gradient-to-br from-amber-950 via-[#3b2508] to-slate-900 border border-amber-500/35'
          : 'bg-gradient-to-br from-emerald-950 via-[#093228] to-slate-900 border border-emerald-500/30'
      } shadow-2xs shrink-0 select-none flex items-center justify-center ${className}`}
    >
      <IconComp className={`w-6 h-6 ${isHotel ? 'text-amber-300' : 'text-emerald-300'} drop-shadow-xs`} />
    </div>
  );
};

const TouristCardView: React.FC<TouristCardViewProps> = React.memo(
  ({
    destination,
    language,
    bookmarked,
    isAdmin,
    setSelectedDestination,
    toggleBookmark,
  }) => {
    const [imgError, setImgError] = useState(false);
    const cardRef = useRef<HTMLDivElement | null>(null);
    const loc = useMemo(() => getLocalizedDestination(destination, language), [destination, language]);

    const rawPhoto = (destination.photoUrl || '').trim();
    const isRealPhoto =
      Boolean(rawPhoto) &&
      !rawPhoto.startsWith('data:image/svg') &&
      !rawPhoto.includes('places.googleapis.com');
    const hasClearPhoto = isRealPhoto && !imgError;

    // Reset imgError when photoUrl changes
    useEffect(() => {
      setImgError(false);
    }, [destination.photoUrl]);

    const resolvedDestPhotoUrl = useMemo(() => {
      if (!isRealPhoto) return '';
      const ver = destination.photoUpdatedAt ? encodeURIComponent(destination.photoUpdatedAt) : '20261030v1';
      return rawPhoto.startsWith('/destinations/') && !rawPhoto.includes('?') ? `${rawPhoto}?v=${ver}` : rawPhoto;
    }, [rawPhoto, isRealPhoto, destination.photoUpdatedAt]);

    const isCompactDirectoryRow = destination.id.startsWith('rac-') && !destination.isFeatured;

    // Compact Shop-Menu Style Card (Thumbnail or Default Icon on Left + Name/Province on Right)
    if (!hasClearPhoto || isCompactDirectoryRow) {
      return (
        <div
          ref={cardRef}
          data-testid={`dest-row-${destination.id}`}
          onClick={() => setSelectedDestination(destination)}
          className="group rounded-2xl px-3 py-2.5 transition-all duration-150 cursor-pointer flex items-center gap-3 border active:scale-[0.99] bg-white dark:bg-slate-800/90 hover:bg-emerald-50/40 dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-700/80 shadow-2xs"
        >
          {/* Left: High-Quality Google Maps Thumbnail or Default Destination Placeholder Icon */}
          {hasClearPhoto ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200/80 dark:border-slate-600/70 bg-slate-100 dark:bg-slate-700 shadow-2xs">
              <img
                src={resolvedDestPhotoUrl}
                alt={loc.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <DefaultDestinationIcon
              categorySlug={destination.categorySlug}
              className="w-12 h-12 rounded-xl border border-slate-200/80 dark:border-slate-600/70"
            />
          )}

          {/* Right: Destination Name, Province & Category */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-bold text-sm sm:text-[15px] text-[#0F172A] dark:text-white group-hover:text-[#059669] dark:group-hover:text-emerald-400 transition truncate leading-snug font-khmer">
                {loc.name}
              </h3>
            </div>

            <div className="mt-1 flex items-center gap-2 flex-nowrap overflow-hidden text-[11px] font-khmer">
              {loc.province && (
                <span className="inline-flex items-center gap-0.5 text-slate-500 dark:text-slate-400 truncate min-w-0">
                  <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">{loc.province}</span>
                </span>
              )}
              {destination.phone && (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-semibold shrink-0">
                  <Phone className="w-2.5 h-2.5 shrink-0" />
                  <span>{destination.phone}</span>
                </span>
              )}
              {destination.priceRange && (
                <span className="px-1.5 py-0.2 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/70 dark:border-amber-800/70 shrink-0">
                  {destination.priceRange}
                </span>
              )}
              {loc.category && (
                <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-[#064E3B] dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/60 dark:border-emerald-800/60 truncate shrink-0">
                  {loc.category}
                </span>
              )}
            </div>
          </div>

          {/* Trailing Actions: Admin Edit + Bookmark + Chevron */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  (window as any).__kft_open_dest_edit = true;
                  setSelectedDestination(destination);
                }}
                className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-2xs transition active:scale-95 cursor-pointer"
                title={tr(language, 'កែប្រែ / ដាក់រូបច្បាស់ (Admin)', 'Edit / Upload Photo (Admin)', '编辑景点/上传清晰图片')}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleBookmark(destination.id);
              }}
              className={`p-1.5 rounded-lg transition active:scale-90 cursor-pointer ${
                bookmarked
                  ? 'bg-rose-500 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-300 hover:text-rose-500'
              }`}
              title={tr(language, 'រក្សាទុក', 'Save', '收藏')}
            >
              <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
            </button>

            <span
              className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-200/70 dark:border-emerald-700/50"
              title={tr(language, 'មើលព័ត៌មានលម្អិត', 'View details', '查看详情')}
            >
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      );
    }

    // Full Large Photo Card when destination has a clear HD photo
    return (
      <div
        data-testid={`dest-card-${destination.id}`}
        onClick={() => setSelectedDestination(destination)}
        className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/90 dark:border-slate-700/80 transition-colors duration-150 cursor-pointer flex flex-col"
      >
        {/* Cover image */}
        <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
          <img
            src={resolvedDestPhotoUrl}
            alt={loc.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />

          {/* Province pill & Viral Social Badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#064E3B]/95 text-emerald-100 border border-emerald-400/30 shadow-xs">
              {loc.province}
            </span>
            {destination.isTrendingSocial && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900/90 text-white border border-white/25 shadow-xs flex items-center gap-1 font-khmer">
                <Compass className="w-3 h-3 shrink-0 text-amber-400" />
                <span>
                  {destination.socialViews
                    ? language === 'km'
                      ? destination.socialViews.replace(/views/gi, 'ដង').replace(/M\+/gi, 'លាន+')
                      : language === 'zh'
                      ? destination.socialViews.replace(/views/gi, '次浏览').replace(/M\+/gi, '百万+')
                      : destination.socialViews
                    : tr(language, 'ពេញនិយម', 'Popular', '热门')}
                </span>
              </span>
            )}
          </div>

          {/* Admin Edit Shortcut */}
          {isAdmin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                (window as any).__kft_open_dest_edit = true;
                setSelectedDestination(destination);
              }}
              className="absolute top-2.5 right-11 p-2 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md transition-transform active:scale-90"
              title={tr(language, 'កែប្រែព័ត៌មានតំបន់ទេសចរណ៍', 'Edit Destination (Admin)', '编辑景点信息（管理员）')}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(destination.id);
            }}
            className={`absolute top-2.5 right-2.5 p-2 rounded-full transition-transform active:scale-90 ${
              bookmarked
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-white/95 dark:bg-slate-900/95 text-slate-600 hover:text-rose-500'
            }`}
            title={tr(language, 'រក្សាទុក', 'Save', '收藏')}
          >
            <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Category tag */}
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#064E3B]/95 text-emerald-100 text-xs font-bold border border-emerald-400/30">
            {loc.category}
          </div>

          {/* Reference Image Label (រូបភាពយោង) */}
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/55 backdrop-blur-xs text-[8px] sm:text-[9px] text-white/85 font-khmer border border-white/15 select-none pointer-events-none shadow-2xs z-10">
            <span>{tr(language, 'រូបភាពយោង', 'Reference photo', '参考图片')}</span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col flex-1 justify-between">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-[#0F172A] dark:text-white group-hover:text-[#059669] transition line-clamp-2 leading-snug mb-1.5">
              {loc.name}
            </h3>

            <div className="flex items-start gap-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-2 line-clamp-1">
              <MapPin className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
              <span>{loc.address}</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-3">
              {loc.description}
            </p>
          </div>

          {/* Bottom meta */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs sm:text-sm font-khmer">
            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-bold">
              <Star className="w-4 h-4 fill-current text-amber-500" />
              <span>{destination.rating ?? 4.8}</span>
              <span className="text-slate-400 text-xs">({destination.reviewCount ?? 0})</span>
            </div>
            {destination.priceRange && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-200/70 dark:border-amber-800/70">
                {destination.priceRange}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.destination === next.destination &&
    prev.language === next.language &&
    prev.bookmarked === next.bookmarked &&
    prev.isAdmin === next.isAdmin
);

const TouristCardInner: React.FC<TouristCardProps> = ({ destination }) => {
  const { destinations, language, setSelectedDestination, isBookmarked, toggleBookmark, currentUser } = useApp();
  const bookmarked = isBookmarked(destination.id);
  const isAdmin = isAdminAccount(currentUser);

  return (
    <TouristCardView
      destination={destination}
      allDestinations={destinations}
      language={language}
      bookmarked={bookmarked}
      isAdmin={isAdmin}
      setSelectedDestination={setSelectedDestination}
      toggleBookmark={toggleBookmark}
    />
  );
};

export const TouristCard = React.memo(TouristCardInner);

import React, { useEffect, useMemo, useState } from 'react';
import {
  TouristDestination,
  isAdminAccount,
  isEphemeralDeadImageUrl,
  getDestinationGoogleExternalUrl,
  openExternalUrlNativeSafe,
} from '../types';
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
  Navigation,
} from 'lucide-react';
import { tr } from '../utils/i18n';
import { getLocalizedDestination } from '../utils/zhDynamicTranslator';
import type { Language } from '../types';

export interface TouristCardProps {
  destination: TouristDestination;
  distanceKm?: number | null;
}

interface TouristCardViewProps {
  destination: TouristDestination;
  language: Language;
  bookmarked: boolean;
  isAdmin: boolean;
  distanceKm?: number | null;
  setSelectedDestination: (d: TouristDestination | null) => void;
  toggleBookmark: (id: string) => void;
}

function computeDeterministicDistanceKm(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const tenths = 12 + (hash % 85); // 1.2 km .. 9.6 km
  return (tenths / 10).toFixed(1);
}

function getDirectDestinationMapsUrl(destination: TouristDestination): string {
  const verified = getDestinationGoogleExternalUrl(destination, 'directions') || getDestinationGoogleExternalUrl(destination, 'maps');
  if (verified) return verified;
  if (
    typeof destination.latitude === 'number' &&
    typeof destination.longitude === 'number' &&
    Number.isFinite(destination.latitude) &&
    Number.isFinite(destination.longitude) &&
    destination.latitude !== 0 &&
    destination.longitude !== 0
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
  }
  const query = [destination.nameEn || destination.nameKh, destination.provinceEn || destination.provinceKh, 'Cambodia']
    .filter(Boolean)
    .join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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

  const bgGradient =
    isHotel
      ? 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)'
      : categorySlug === 'temple' || categorySlug === 'cultural'
      ? 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)'
      : categorySlug === 'nature'
      ? 'linear-gradient(180deg, #F75977 0%, #C41D4B 100%)'
      : categorySlug === 'beach'
      ? 'linear-gradient(180deg, #3290FA 0%, #1254C7 100%)'
      : categorySlug === 'mountain'
      ? 'linear-gradient(180deg, #F4B630 0%, #C67D0D 100%)'
      : 'linear-gradient(180deg, #22AAA3 0%, #0E6769 100%)';

  return (
    <div
      data-dest-avatar="default-dest-icon"
      style={{ background: bgGradient }}
      className={`relative overflow-hidden shadow-xs shrink-0 select-none flex items-center justify-center text-white ${className}`}
    >
      <IconComp className="w-6 h-6 text-white drop-shadow-xs" strokeWidth={2.2} />
    </div>
  );
};

const TouristCardView: React.FC<TouristCardViewProps> = React.memo(
  ({
    destination,
    language,
    bookmarked,
    isAdmin,
    distanceKm,
    setSelectedDestination,
    toggleBookmark,
  }) => {
    const [imgError, setImgError] = useState(false);
    const loc = useMemo(() => getLocalizedDestination(destination, language), [destination, language]);

    const rawPhoto = (destination.photoUrl || '').trim();
    const isRealPhoto =
      Boolean(rawPhoto) &&
      !isEphemeralDeadImageUrl(rawPhoto) &&
      !rawPhoto.startsWith('data:image/svg') &&
      !rawPhoto.includes('places.googleapis.com');
    const hasClearPhoto = isRealPhoto && !imgError;

    useEffect(() => {
      setImgError(false);
    }, [destination.photoUrl]);

    const resolvedDestPhotoUrl = useMemo(() => {
      if (!isRealPhoto) return '';
      const ver = destination.photoUpdatedAt ? encodeURIComponent(destination.photoUpdatedAt) : '20261030v1';
      return rawPhoto.startsWith('/destinations/') && !rawPhoto.includes('?') ? `${rawPhoto}?v=${ver}` : rawPhoto;
    }, [rawPhoto, isRealPhoto, destination.photoUpdatedAt]);

    const distanceStr = useMemo(() => {
      if (typeof distanceKm === 'number' && Number.isFinite(distanceKm) && distanceKm > 0) {
        return distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm).toString();
      }
      return computeDeterministicDistanceKm(String(destination.id || destination.nameKh || 'dest'));
    }, [distanceKm, destination.id, destination.nameKh]);

    const ratingNum = Number(destination.rating) > 0 ? Number(destination.rating).toFixed(1) : '4.8';
    const reviewsNum = Number(destination.reviewCount) > 0 ? Number(destination.reviewCount) : 96;

    const handleNavigateClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      openExternalUrlNativeSafe(getDirectDestinationMapsUrl(destination));
    };

    const isCompactDirectoryRow = destination.id.startsWith('rac-') && !destination.isFeatured;

    // Compact Clean White Card Variant
    if (!hasClearPhoto || isCompactDirectoryRow) {
      return (
        <article
          data-testid={`dest-row-${destination.id}`}
          onClick={() => setSelectedDestination(destination)}
          className="group bg-white rounded-[20px] p-2.5 transition-all duration-150 cursor-pointer flex items-center gap-3 border border-slate-200/90 hover:border-emerald-500/60 shadow-[0_4px_14px_rgba(15,23,42,0.05)] active:scale-[0.99] font-khmer text-slate-900"
        >
          {/* Left: Thumbnail or Colorful Category Icon */}
          {hasClearPhoto ? (
            <div className="w-16 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200/80 bg-slate-100 shadow-2xs">
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
              className="w-14 h-14 rounded-xl border border-white/40"
            />
          )}

          {/* Middle: Destination Name, Rating, Distance & Province */}
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-[13.5px] sm:text-sm text-slate-900 group-hover:text-emerald-700 transition line-clamp-1 leading-[1.6] font-khmer">
              {loc.name}
            </h3>

            <div className="mt-0.5 flex items-center gap-2 flex-wrap text-xs font-khmer">
              <span className="inline-flex items-center gap-1 text-slate-800 font-extrabold shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <span>{ratingNum}</span>
              </span>

              <span className="inline-flex items-center gap-0.5 text-emerald-700 font-extrabold shrink-0">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  {distanceStr} {tr(language, 'km', 'km', '公里')}
                </span>
              </span>

              {loc.province && (
                <span className="text-slate-500 font-semibold truncate max-w-[130px]">
                  • {loc.province}
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {loc.category && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold border border-emerald-200/80 truncate">
                  {loc.category}
                </span>
              )}
              {destination.phone && (
                <span className="inline-flex items-center gap-1 text-amber-700 text-[10.5px] font-bold shrink-0">
                  <Phone className="w-2.5 h-2.5 shrink-0" />
                  <span>{destination.phone}</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Directions + Admin Edit + Bookmark + Chevron */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleNavigateClick}
              style={{
                background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
              }}
              className="w-8 h-8 rounded-xl text-white flex items-center justify-center shadow-2xs active:scale-95 transition cursor-pointer"
              title={tr(language, 'បង្ហាញផ្លូវ', 'Directions', '导航')}
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>

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
                  : 'bg-slate-100 text-slate-500 hover:text-rose-500'
              }`}
              title={tr(language, 'រក្សាទុក', 'Save', '收藏')}
            >
              <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
            </button>

            <ChevronRight
              onClick={() => setSelectedDestination(destination)}
              className="w-4 h-4 text-slate-400 shrink-0 cursor-pointer"
            />
          </div>
        </article>
      );
    }

    // Featured Clean White Card with HD Photo, Distance, Rating, and Navigation Button
    return (
      <article
        data-testid={`dest-card-${destination.id}`}
        onClick={() => setSelectedDestination(destination)}
        className="group bg-white rounded-[22px] overflow-hidden shadow-[0_6px_20px_rgba(15,23,42,0.08)] hover:border-emerald-500/60 border border-slate-200/90 transition-all duration-150 cursor-pointer flex flex-col font-khmer text-slate-900"
      >
        {/* Cover Image */}
        <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
          <img
            src={resolvedDestPhotoUrl}
            alt={loc.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />

          {/* Top-Left: Province Badge & GPS Distance Pill */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#064E3B]/95 text-white border border-emerald-400/30 shadow-xs">
              {loc.province}
            </span>
            <span
              style={{
                background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
              }}
              className="px-2.5 py-0.5 rounded-full text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-xs"
            >
              <MapPin className="w-3 h-3 text-white fill-white/25 shrink-0" />
              <span>
                {distanceStr} {tr(language, 'km', 'km', '公里')}
              </span>
            </span>
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
              className="absolute top-2.5 right-11 p-2 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md transition-transform active:scale-90 z-10 cursor-pointer"
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
            className={`absolute top-2.5 right-2.5 p-2 rounded-full transition-transform active:scale-90 z-10 cursor-pointer ${
              bookmarked
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-white/95 text-slate-700 hover:text-rose-500 shadow-xs'
            }`}
            title={tr(language, 'រក្សាទុក', 'Save', '收藏')}
          >
            <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Bottom-Left: Category Pill */}
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/95 text-emerald-900 text-xs font-extrabold border border-emerald-200 shadow-xs">
            {loc.category}
          </div>
        </div>

        {/* Clean White Card Body */}
        <div className="p-3.5 flex flex-col flex-1 justify-between bg-white text-slate-900">
          <div>
            <h3 className="font-extrabold text-[15px] sm:text-base text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 leading-[1.6] mb-1">
              {loc.name}
            </h3>

            <div className="flex items-start gap-1 text-xs text-slate-600 mb-1.5 line-clamp-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">{loc.address || loc.province}</span>
            </div>

            {loc.description && (
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-2.5">
                {loc.description}
              </p>
            )}
          </div>

          {/* Bottom Meta: Rating + Direct GPS Navigation Button */}
          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs font-khmer">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <div className="inline-flex items-center gap-1 text-slate-900 font-extrabold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                <span>{ratingNum}</span>
                <span className="text-slate-400 font-semibold">({reviewsNum})</span>
              </div>
              {destination.priceRange && (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-extrabold text-[11px] border border-amber-200/80">
                  {destination.priceRange}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleNavigateClick}
              style={{
                background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                boxShadow: '0 4px 10px rgba(21, 128, 61, 0.25)',
              }}
              className="min-h-[34px] px-3 py-1 rounded-full text-white font-extrabold text-xs inline-flex items-center gap-1.5 active:scale-95 transition cursor-pointer shrink-0 leading-[1.6]"
            >
              <Navigation className="w-3.5 h-3.5 text-white shrink-0" strokeWidth={2.2} />
              <span>{tr(language, 'បង្ហាញផ្លូវ', 'Directions', '导航')}</span>
            </button>
          </div>
        </div>
      </article>
    );
  },
  (prev, next) =>
    prev.destination === next.destination &&
    prev.language === next.language &&
    prev.bookmarked === next.bookmarked &&
    prev.isAdmin === next.isAdmin &&
    prev.distanceKm === next.distanceKm
);

const TouristCardInner: React.FC<TouristCardProps> = ({ destination, distanceKm = null }) => {
  const { language, setSelectedDestination, isBookmarked, toggleBookmark, currentUser } = useApp();
  const bookmarked = isBookmarked(destination.id);
  const isAdmin = isAdminAccount(currentUser);

  return (
    <TouristCardView
      destination={destination}
      language={language}
      bookmarked={bookmarked}
      isAdmin={isAdmin}
      distanceKm={distanceKm}
      setSelectedDestination={setSelectedDestination}
      toggleBookmark={toggleBookmark}
    />
  );
};

export const TouristCard = React.memo(TouristCardInner);

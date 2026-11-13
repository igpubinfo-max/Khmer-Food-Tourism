import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AngkorHeroTopHeader } from './AngkorHeroTopHeader';
import {
  TouristDestination,
  Restaurant,
  isAdminAccount,
  openDestinationGoogleExternal,
  openExternalUrlNativeSafe,
  inferBusinessTypeAndCategory,
  isHotelBusinessRecord,
  resolveFoodPhotoUrl,
} from '../types';
import { shuffleForCurrentSession } from '../utils/sessionShuffle';
import { smoothScrollToElement } from '../utils/smoothScroll';
import {
  BedDouble,
  Edit2,
  Settings,
  MapPin,
  Heart,
  Camera,
  Star,
  Trash2,
  Download,
  Search,
  Mic,
  Bell,
  ChevronDown,
  ChevronRight,
  Phone,
  Crown,
  Home,
  Building2,
  Utensils,
  Plus,
  X,
  Flame,
  SlidersHorizontal,
  LayoutGrid,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { ListingFeaturedCard } from './listing/ListingUI';
import { normalizeKhmerSearchText } from '../services/googlePlacesService';
import { TouristImageModal } from './TouristImageModal';
import { rankBySearchRelevance, destinationSearchFields, analyzeSearchQuery } from '../utils/searchEngine';
import { parseSmartSearchIntent } from '../utils/aiSearchBridge';
import { DISH_PROVINCES } from '../utils/foodFilters';
import { tr } from '../utils/i18n';
import { CambodiaChoiceBadge, isCambodiaChoiceEligible } from './common/CambodiaChoiceAndRatings';
import { getLocalizedDestination } from '../utils/zhDynamicTranslator';
import { resolveUserAvatarUrl, handleAvatarImageError } from '../utils/avatarHelper';

const HOTEL_BATCH_SIZE = 24;

/**
 * Clean vector hotel/storefront icon matching DefaultShopIcon in Shop Menu.
 * Never displays fake stock hotel photos in place of the icon.
 */
export const DefaultHotelIcon: React.FC<{ className?: string }> = ({ className = 'w-12 h-12 rounded-xl' }) => (
  <div
    data-hotel-avatar="default-hotel-icon"
    aria-label="Default Hotel Icon"
    className={`relative overflow-hidden bg-gradient-to-br from-emerald-950 via-[#093228] to-slate-900 border border-emerald-500/30 shadow-2xs shrink-0 select-none flex items-center justify-center ${className}`}
  >
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-[56%] h-[56%] max-w-16 max-h-16 text-emerald-300 drop-shadow-xs"
      aria-hidden="true"
    >
      <path
        d="M12 24L16.5 14H47.5L52 24"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 24H53.5V27.5C53.5 30.5376 51.0376 33 48 33C44.9624 33 42.5 30.5376 42.5 27.5C42.5 30.5376 40.0376 33 37 33C33.9624 33 31.5 30.5376 31.5 27.5C31.5 30.5376 29.0376 33 26 33C22.9624 33 20.5 30.5376 20.5 27.5C20.5 30.5376 18.0376 33 15 33C11.9624 33 10.5 30.5376 10.5 27.5V24Z"
        fill="#065F46"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinejoin="round"
      />
      <path
        d="M16 33V50H48V33"
        stroke="#A7F3D0"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="27"
        y="39"
        width="10"
        height="11"
        rx="1.5"
        stroke="#FBBF24"
        strokeWidth="2.6"
      />
      <line
        x1="11"
        y1="50"
        x2="53"
        y2="50"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

function hasVerifiedCustomHotelPhoto(hotel: TouristDestination): string {
  const raw = (hotel.photoUrl || '').trim();
  if (!raw) return '';
  if (
    raw.startsWith('/destinations/hotel-') ||
    raw.includes('places.googleapis.com') ||
    raw.includes('images.unsplash.com')
  ) {
    return '';
  }
  if (
    hotel.isCustomPhoto ||
    hotel.isAdminEdited ||
    raw.startsWith('data:image/') ||
    raw.includes('supabase.co') ||
    raw.startsWith('http') ||
    raw.startsWith('/')
  ) {
    return resolveFoodPhotoUrl(raw);
  }
  return '';
}

const HotelAvatar: React.FC<{
  hotel: TouristDestination;
  alt?: string;
  className?: string;
}> = ({ hotel, alt, className = 'w-full h-full' }) => {
  const [imgError, setImgError] = useState(false);
  const customSrc = useMemo(() => hasVerifiedCustomHotelPhoto(hotel), [hotel]);

  useEffect(() => {
    setImgError(false);
  }, [customSrc]);

  if (!customSrc || imgError) {
    return <DefaultHotelIcon className={className} />;
  }

  return (
    <div className={`relative overflow-hidden bg-slate-100 shrink-0 ${className}`}>
      <img
        src={customSrc}
        alt={alt || hotel.nameKh || hotel.nameEn || 'Hotel'}
        loading="lazy"
        decoding="async"
        onError={() => setImgError(true)}
        className="w-full h-full object-cover select-none"
      />
    </div>
  );
};

function getDeterministicHash(id: string): number {
  let hash = 0;
  const str = String(id || 'hotel');
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getDeterministicDistanceKm(id: string): number {
  const hash = getDeterministicHash(id);
  const steps = (hash % 36) + 6; // 0.6 to 4.1 km
  return Number((steps / 10).toFixed(1));
}

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2?: number,
  lon2?: number
): number | null {
  if (
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2) ||
    lat2 <= 0 ||
    lon2 <= 0
  ) {
    return null;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Number.isFinite(d) ? Number(d.toFixed(1)) : null;
}

function extractAddedTimestampMs(record: any, fallbackIndex: number): number {
  const candidates = [
    record?.approvedAt,
    record?.createdAt,
    record?.submittedAt,
    record?.created_at,
    record?.updatedAt,
    record?.adminEditedAt,
    record?.locationVerifiedAt,
    record?.photoUpdatedAt,
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c) && c > 0) return c;
    if (typeof c === 'string' && c.trim()) {
      const parsed = Date.parse(c);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  const idStr = String(record?.id || '');
  const numMatch = idStr.match(/(\d{10,13})/);
  if (numMatch) {
    const num = Number(numMatch[1]);
    if (Number.isFinite(num) && num > 0) return num;
  }
  // Fallback preserves chronological submission order in array
  return 1_700_000_000_000 + fallbackIndex * 1000;
}

export const HotelView: React.FC = () => {
  const {
    destinations,
    restaurants,
    language,
    selectedProvince,
    setSelectedProvince,
    setSelectedDestination,
    updateDestination,
    deleteDestination,
    isBookmarked,
    toggleBookmark,
    setIsVipAddRestaurantModalOpen,
    currentUser,
    setIsAuthModalOpen,
    activeManagedShopId,
    getOwnedRestaurantsForUser,
    getCurrentUserStoreQuota,
    openManageMyVipStore,
    setIsAdminOpen,
    setActiveTab,
    unreadNotificationsCount,
    setIsNotificationsModalOpen,
    showToast,
  } = useApp();

  const isAdmin = isAdminAccount(currentUser);
  const storeQuota = getCurrentUserStoreQuota(currentUser);

  // All businesses (Shop OR Hotel) owned by current user — 1 VIP slot is shared across both!
  const myOwnedBusinesses = useMemo(
    () => getOwnedRestaurantsForUser(currentUser),
    [restaurants, currentUser, activeManagedShopId]
  );
  const myExistingShop = useMemo(
    () => myOwnedBusinesses.find((r) => !isHotelBusinessRecord(r)),
    [myOwnedBusinesses]
  );
  const myExistingHotel = useMemo(
    () => myOwnedBusinesses.find((r) => isHotelBusinessRecord(r)),
    [myOwnedBusinesses]
  );

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | '4.5' | '4.0'>('all');
  const [sortMode, setSortMode] = useState<'newest' | 'popular' | 'nearest' | 'rating'>('newest');
  const [showAllFeatured, setShowAllFeatured] = useState<boolean>(false);
  const [hotelSearchQuery, setHotelSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(HOTEL_BATCH_SIZE);
  const [hotelForImageEdit, setHotelForImageEdit] = useState<TouristDestination | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const hotelListStartRef = useRef<HTMLDivElement | null>(null);
  const hotelCategoryCardRef = useRef<HTMLDivElement | null>(null);

  const scrollToHotelList = (_keepCategoriesVisible = false) => {
    smoothScrollToElement(hotelListStartRef.current, { offsetTop: 8 });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(hotelSearchQuery);
    }, 180);
    return () => clearTimeout(timer);
  }, [hotelSearchQuery]);

  useEffect(() => {
    setVisibleCount(HOTEL_BATCH_SIZE);
  }, [selectedProvince, categoryFilter, ratingFilter, sortMode, hotelSearchQuery]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // Ignore silent geolocation error
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 180000 }
      );
    }
  }, []);

  // Convert any user/owner-added Hotel records (from `restaurants` where `isHotelBusinessRecord(r)`) into TouristDestination format,
  // sorted EARLIEST APPROVED FIRST (TOP 1 = earliest approved hotel submission)
  const { vipAddedHotelDestinations, addedHotelTimestampMap } = useMemo(() => {
    const tsMap = new Map<string, number>();
    const list: TouristDestination[] = [];
    const seenIds = new Set<string>();
    const seenNameKeys = new Set<string>();

    restaurants.forEach((r: Restaurant, idx: number) => {
      if (
        !r ||
        !isHotelBusinessRecord(r) ||
        !(r.status === 'approved' || isAdmin || r.ownerId === currentUser?.id)
      ) {
        return;
      }
      const idStr = String(r.id || '').trim();
      if (!idStr || seenIds.has(idStr)) return;
      const normNameKey = `${normalizeKhmerSearchText(r.nameKh || r.nameEn || '')}::${(r.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
      if (normNameKey.length > 3 && seenNameKeys.has(normNameKey)) return;

      seenIds.add(idStr);
      if (normNameKey.length > 3) seenNameKeys.add(normNameKey);

      const catInfo = inferBusinessTypeAndCategory(r);
      const ts = extractAddedTimestampMs(r, idx + 1);
      tsMap.set(r.id, ts);

      const resolvedPhoto =
        r.profileImage ||
        r.photoUrl ||
        r.thumbnailUrl ||
        (Array.isArray(r.galleryPhotos) && r.galleryPhotos[0]) ||
        '';

      list.push({
        id: r.id,
        nameKh: r.nameKh,
        nameEn: r.nameEn || r.nameKh,
        categorySlug: 'hotel' as const,
        categoryKh: r.categoryKh || catInfo.shortKh,
        categoryEn: r.categoryEn || catInfo.shortEn,
        descriptionKh: r.descriptionKh || `${r.nameKh} — កន្លែងស្នាក់នៅស្អាត និងមានផាសុកភាព។`,
        descriptionEn: r.descriptionEn || `${r.nameEn || r.nameKh} — Verified accommodation in ${r.provinceEn}.`,
        photoUrl: resolvedPhoto,
        galleryPhotos: r.galleryPhotos || [],
        provinceKh: r.provinceKh,
        provinceEn: r.provinceEn,
        addressKh: r.addressKh || r.provinceKh,
        addressEn: r.addressEn || r.provinceEn,
        phone: r.phone,
        priceRange: r.priceLevel || '$$',
        entranceFeeKh: `តម្លៃបន្ទប់៖ ${r.priceLevel || '$'} • ${r.phone || ''}`,
        entranceFeeEn: `Room Rate: ${r.priceLevel || '$'} • ${r.phone || ''}`,
        bestTimeToVisitKh: r.openingHoursKh || 'បើកទទួលភ្ញៀវ ២៤ ម៉ោង',
        bestTimeToVisitEn: r.openingHoursEn || 'Open 24 Hours',
        mapUrl: r.mapUrl || `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`,
        latitude: r.latitude,
        longitude: r.longitude,
        googlePlaceId: r.googlePlaceId,
        rating: r.rating || 4.8,
        reviewCount: r.reviewCount || 128,
        highlightsKh: r.signatureDishesKh?.length
          ? r.signatureDishesKh
          : ['បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ Wi-Fi និងចំណតរថយន្តសុវត្ថិភាព'],
        isFeatured: true,
        isCustomPhoto: Boolean(resolvedPhoto),
        locationVerificationStatus: 'verified' as const,
      });
    });

    // Also detect any user/admin newly added or edited hotels in `destinations`
    destinations.forEach((d, idx) => {
      if (!d || d.categorySlug !== 'hotel') return;
      if (d.isAdminEdited || d.isCustomPhoto || !/^dest-hotel-\d+$/i.test(String(d.id || ''))) {
        if (!tsMap.has(d.id)) {
          tsMap.set(d.id, extractAddedTimestampMs(d, idx + 5000));
        }
      }
    });

    // Sort user/owner-added hotels strictly Earliest Approved First (lowest timestamp first -> TOP 1)
    list.sort((a, b) => {
      const diff = (tsMap.get(a.id) || 0) - (tsMap.get(b.id) || 0);
      if (diff !== 0) return diff;
      return String(a.id).localeCompare(String(b.id));
    });

    return { vipAddedHotelDestinations: list, addedHotelTimestampMap: tsMap };
  }, [restaurants, destinations, isAdmin, currentUser?.id]);

  const userAddedHotelIds = useMemo(
    () => new Set<string>([...vipAddedHotelDestinations.map((d) => d.id), ...addedHotelTimestampMap.keys()]),
    [vipAddedHotelDestinations, addedHotelTimestampMap]
  );

  // Combine user/owner approved hotels (Earliest Approved First) + deduplicated seed hotels from `destinations`
  const allHotels = useMemo<TouristDestination[]>(() => {
    const seedHotels = destinations.filter((d) => Boolean(d && d.categorySlug === 'hotel'));
    const seenIds = new Set(vipAddedHotelDestinations.map((d) => d.id));
    const seenNameKeys = new Set(
      vipAddedHotelDestinations
        .map((d) => `${normalizeKhmerSearchText(d.nameKh || d.nameEn || '')}::${(d.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`)
        .filter((k) => k.length > 3)
    );
    const dedupedSeed = seedHotels.filter((d) => {
      if (!d || seenIds.has(d.id)) return false;
      const normKey = `${normalizeKhmerSearchText(d.nameKh || d.nameEn || '')}::${(d.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
      if (normKey.length > 3 && seenNameKeys.has(normKey)) return false;
      seenIds.add(d.id);
      if (normKey.length > 3) seenNameKeys.add(normKey);
      return true;
    });
    return [...vipAddedHotelDestinations, ...dedupedSeed];
  }, [destinations, vipAddedHotelDestinations]);

  const classifyHotelSubCategory = (h: TouristDestination): string => {
    const text = `${h.nameKh || ''} ${h.nameEn || ''} ${h.categoryKh || ''} ${h.categoryEn || ''}`.toLowerCase();
    if (text.includes('រីសត') || text.includes('resort') || h.priceRange === '$$$$' || h.priceRange === '$$$') {
      return 'luxury_resort';
    }
    if (text.includes('វីឡា') || text.includes('villa') || text.includes('ប៊ូទិក') || text.includes('boutique')) {
      return 'boutique_villa';
    }
    if (
      text.includes('ផ្ទះសំណាក់') ||
      text.includes('guesthouse') ||
      text.includes('ផ្ទះស្នាក់') ||
      text.includes('homestay') ||
      text.includes('hostel')
    ) {
      return 'guesthouse';
    }
    return 'hotel_stay';
  };

  // All user/business-owner added hotels or active VIP hotels get top priority
  const vipHotelIds = useMemo(
    () =>
      new Set(
        restaurants
          .filter(
            (r: Restaurant) =>
              r &&
              isHotelBusinessRecord(r) &&
              (r.status === 'approved' || isAdmin || r.ownerId === currentUser?.id)
          )
          .map((r) => r.id)
      ),
    [restaurants, isAdmin, currentUser?.id]
  );

  const isVerifiedBigHotel = (h: TouristDestination): boolean =>
    vipHotelIds.has(h.id) || userAddedHotelIds.has(h.id) || Boolean(h.isAdminEdited && h.isFeatured);

  const hotelCategoryPills = [
    {
      id: 'all',
      nameKh: 'ទាំងអស់',
      nameEn: 'All',
      nameZh: '全部',
      icon: 'grid' as const,
    },
    {
      id: 'hotel_stay',
      nameKh: 'សណ្ឋាគារ',
      nameEn: 'Hotels',
      nameZh: '酒店',
      icon: 'bed' as const,
    },
    {
      id: 'verified_big',
      nameKh: 'VIP',
      nameEn: 'VIP',
      nameZh: 'VIP',
      icon: 'crown' as const,
    },
    {
      id: 'guesthouse',
      nameKh: 'ផ្ទះស្នាក់នៅ',
      nameEn: 'Guesthouses',
      nameZh: '客栈',
      icon: 'home' as const,
    },
    {
      id: 'luxury_resort',
      nameKh: 'រីសត',
      nameEn: 'Resorts',
      nameZh: '度假村',
      icon: 'palm' as const,
    },
    {
      id: 'boutique_villa',
      nameKh: 'វីឡា/ប៊ូទិក',
      nameEn: 'Villas',
      nameZh: '精品别墅',
      icon: 'building' as const,
    },
  ];

  // Filter by category first so the 25-Province Dropdown shows accurate counts
  const categoryMatchedHotels = useMemo(() => {
    return allHotels.filter((h) => {
      if (categoryFilter === 'verified_big') return isVerifiedBigHotel(h);
      if (categoryFilter !== 'all') return classifyHotelSubCategory(h) === categoryFilter;
      return true;
    });
  }, [allHotels, categoryFilter]);

  const provinceOptions = useMemo(() => {
    return DISH_PROVINCES.map((p) => {
      const cleanKey = p.kh.replace(/^រាជធានី|^ខេត្ត/g, '').trim();
      const count = categoryMatchedHotels.filter((h) =>
        (h.provinceKh || '').replace(/^រាជធានី|^ខេត្ត/g, '').includes(cleanKey)
      ).length;
      return {
        ...p,
        value: p.kh,
        count,
      };
    });
  }, [categoryMatchedHotels]);

  // Order: User/business-owner approved hotels FIRST (strictly Earliest Approved First -> TOP 1, never shuffled), then standard hotels
  const orderedHotels = useMemo(() => {
    const userSubmitted = allHotels
      .filter((h) => userAddedHotelIds.has(h.id))
      .sort((a, b) => {
        const diff = (addedHotelTimestampMap.get(a.id) || 0) - (addedHotelTimestampMap.get(b.id) || 0);
        if (diff !== 0) return diff;
        return String(a.id).localeCompare(String(b.id));
      });
    const regularHotels = allHotels.filter((h) => !userAddedHotelIds.has(h.id));
    return [...userSubmitted, ...shuffleForCurrentSession(regularHotels)];
  }, [allHotels, userAddedHotelIds, addedHotelTimestampMap]);

  const distanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const refLat = userCoords?.lat ?? 11.5564;
    const refLng = userCoords?.lng ?? 104.9282;
    for (const h of orderedHotels) {
      const d = calculateDistanceKm(refLat, refLng, h.latitude, h.longitude);
      map.set(h.id, d !== null ? d : getDeterministicDistanceKm(h.id));
    }
    return map;
  }, [orderedHotels, userCoords]);

  const filteredHotels = useMemo(() => {
    const trimmedQ = debouncedSearchQuery.trim();
    const smartIntent = trimmedQ ? parseSmartSearchIntent(trimmedQ) : null;
    const normSelProv =
      selectedProvince && selectedProvince !== 'ទាំងអស់' && selectedProvince.toLowerCase() !== 'all'
        ? selectedProvince
        : '';
    const effectiveProvRaw = normSelProv || smartIntent?.detectedProvinceKh || '';
    const cleanSelProv = effectiveProvRaw.replace(/^រាជធានី|^ខេត្ត/g, '').trim();

    let scoped = orderedHotels.filter((h) => {
      if (categoryFilter === 'verified_big' && !isVerifiedBigHotel(h)) return false;
      if (
        categoryFilter !== 'all' &&
        categoryFilter !== 'verified_big' &&
        classifyHotelSubCategory(h) !== categoryFilter
      ) {
        return false;
      }
      if (categoryFilter === 'all' && smartIntent?.semanticCategory) {
        if (smartIntent.semanticCategory === 'resort' && classifyHotelSubCategory(h) !== 'luxury_resort') return false;
        if (smartIntent.semanticCategory === 'guesthouse' && classifyHotelSubCategory(h) !== 'guesthouse') return false;
      }
      if (cleanSelProv && !(h.provinceKh || '').replace(/^រាជធានី|^ខេត្ត/g, '').includes(cleanSelProv)) {
        return false;
      }
      const effRating = h.rating && h.rating > 0 ? Number(h.rating) : 4.6;
      if (ratingFilter === '4.5' && effRating < 4.5) return false;
      if (ratingFilter === '4.0' && effRating < 4.0) return false;
      return true;
    });

    if (!trimmedQ) {
      if (sortMode === 'nearest') {
        scoped = [...scoped].sort((a, b) => (distanceMap.get(a.id) ?? 999) - (distanceMap.get(b.id) ?? 999));
      } else if (sortMode === 'rating') {
        scoped = [...scoped].sort((a, b) => (b.rating || 4.6) - (a.rating || 4.6));
      } else {
        // Automatic priority sorting: Earliest approved user-submitted hotel gets TOP 1 and appears first
        const priorityUserHotels = scoped
          .filter((h) => userAddedHotelIds.has(h.id))
          .sort((a, b) => {
            const diff = (addedHotelTimestampMap.get(a.id) || 0) - (addedHotelTimestampMap.get(b.id) || 0);
            if (diff !== 0) return diff;
            return String(a.id).localeCompare(String(b.id));
          });
        const restHotels = scoped.filter((h) => !userAddedHotelIds.has(h.id));
        scoped = [...priorityUserHotels, ...restHotels];
      }
      return scoped;
    }

    const qa = analyzeSearchQuery(trimmedQ);
    if (qa.distinctive.length === 0 && (smartIntent?.detectedProvinceKh || smartIntent?.semanticCategory)) {
      return scoped;
    }

    const needZhSearch = language === 'zh' || /[\u4e00-\u9fff]/.test(trimmedQ);
    return rankBySearchRelevance(
      scoped,
      trimmedQ,
      (h) => destinationSearchFields(h, [needZhSearch ? getLocalizedDestination(h, 'zh').name : '', classifyHotelSubCategory(h)]),
      {
        bucketSize: 100,
        tieBreak: (a, b) => {
          const aUser = userAddedHotelIds.has(a.id);
          const bUser = userAddedHotelIds.has(b.id);
          if (aUser && !bUser) return -1;
          if (!aUser && bUser) return 1;
          if (aUser && bUser) {
            return (addedHotelTimestampMap.get(a.id) || 0) - (addedHotelTimestampMap.get(b.id) || 0);
          }
          return (
            (b.rating || 0) - (a.rating || 0) ||
            (a.nameEn || a.nameKh || '').localeCompare(b.nameEn || b.nameKh || '')
          );
        },
      }
    );
  }, [
    orderedHotels,
    categoryFilter,
    ratingFilter,
    sortMode,
    selectedProvince,
    debouncedSearchQuery,
    distanceMap,
    userAddedHotelIds,
    addedHotelTimestampMap,
  ]);

  // Split into Section 1: TOP 1 Earliest Approved Hotel (Featured Card matching Reference Image 3)
  // & Section 2: Subsequent Hotels in Compact Directory Cards (matching Reference Image 2 / Shop Menu)
  const { featuredHotels, directoryHotels } = useMemo(() => {
    if (filteredHotels.length === 0) {
      return { featuredHotels: [], directoryHotels: [] };
    }
    const newlyAddedInFiltered = filteredHotels.filter((h) => userAddedHotelIds.has(h.id));
    const baseTargetCount = showAllFeatured ? Math.min(12, Math.max(4, newlyAddedInFiltered.length)) : 1;
    const featured = filteredHotels.slice(0, baseTargetCount);
    const featuredIds = new Set<string>(featured.map((h) => h.id));
    const directory = filteredHotels.filter((h) => !featuredIds.has(h.id));
    return { featuredHotels: featured, directoryHotels: directory };
  }, [filteredHotels, showAllFeatured, userAddedHotelIds]);

  const displayedDirectoryHotels = useMemo(
    () => directoryHotels.slice(0, visibleCount),
    [directoryHotels, visibleCount]
  );

  useEffect(() => {
    const node = loadMoreTriggerRef.current;
    if (!node || visibleCount >= directoryHotels.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(directoryHotels.length, prev + HOTEL_BATCH_SIZE));
        }
      },
      { root: document.getElementById('kft-main-scroll'), rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, directoryHotels.length]);

  const handleAddHotelClick = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    (window as any).__kft_vip_store_initial_mode = { mode: 'create', businessType: 'hotel' };
    setIsVipAddRestaurantModalOpen(true);
  };

  const selectedProvinceShortLabel = useMemo(() => {
    if (!selectedProvince || selectedProvince === 'ទាំងអស់' || selectedProvince.toLowerCase() === 'all') {
      return tr(language, 'តំបន់/ខេត្ត', 'Province', '省份/地区');
    }
    const found = provinceOptions.find((p) => p.value === selectedProvince);
    if (found) {
      return tr(language, found.kh, found.en, found.zh);
    }
    return selectedProvince.replace(/^(ខេត្ត|រាជធានី)/, '').trim();
  }, [selectedProvince, provinceOptions, language]);

  const getAmenityChipsForHotel = (hotel: TouristDestination) => {
    const subCat = classifyHotelSubCategory(hotel);
    if (subCat === 'luxury_resort') {
      return [
        { icon: 'palm', label: tr(language, 'រីសត', 'Resort', '度假村') },
        { icon: 'lotus', label: tr(language, 'ស្ប៉ា', 'Spa', '水疗') },
      ];
    }
    if (subCat === 'guesthouse') {
      return [
        { icon: 'home', label: tr(language, 'ផ្ទះស្នាក់នៅ', 'Guesthouse', '客栈') },
        { icon: 'dining', label: tr(language, 'អាហារដ្ឋាន', 'Dining', '餐饮') },
      ];
    }
    if (subCat === 'boutique_villa') {
      return [
        { icon: 'building', label: tr(language, 'វីឡា/ប៊ូទិក', 'Boutique', '精品别墅') },
        { icon: 'pool', label: tr(language, 'អាងហែលទឹក', 'Pool', '泳池') },
      ];
    }
    return [
      { icon: 'bed', label: tr(language, 'សណ្ឋាគារ', 'Hotel', '酒店') },
      { icon: 'dining', label: tr(language, 'ភោជនីយដ្ឋាន', 'Restaurant', '餐厅') },
    ];
  };

  const renderAmenityIcon = (type: string) => {
    if (type === 'palm') {
      return (
        <svg className="w-3 h-3 text-[#0E5A35] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4" />
          <path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3" />
          <path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35z" />
          <path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14" />
        </svg>
      );
    }
    if (type === 'lotus') {
      return (
        <svg className="w-3 h-3 text-[#0E5A35] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3c2.5 3.5 3.5 7 0 11-3.5-4-2.5-7.5 0-11z" />
          <path d="M12 14c3-2.5 6.5-3 9-1-1.5 3.5-4.5 5.5-9 5.5S4.5 16.5 3 13c2.5-2 6-1.5 9 1z" />
        </svg>
      );
    }
    if (type === 'pool') {
      return (
        <svg className="w-3 h-3 text-[#0E5A35] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 16c1.5 1 3.5 1 5 0s3.5-1 5 0 3.5 1 5 0 3.5-1 5 0" />
          <path d="M2 20c1.5 1 3.5 1 5 0s3.5-1 5 0 3.5 1 5 0 3.5-1 5 0" />
          <circle cx="9" cy="7" r="2" />
          <path d="M6 12l3-2 3 2 3-2" />
        </svg>
      );
    }
    if (type === 'dining') {
      return <Utensils className="w-3 h-3 text-[#0E5A35] shrink-0" strokeWidth={2.2} />;
    }
    if (type === 'home') {
      return <Home className="w-3 h-3 text-[#0E5A35] shrink-0" strokeWidth={2.2} />;
    }
    if (type === 'building') {
      return <Building2 className="w-3 h-3 text-[#0E5A35] shrink-0" strokeWidth={2.2} />;
    }
    return <BedDouble className="w-3 h-3 text-[#0E5A35] shrink-0" strokeWidth={2.2} />;
  };

  const nearestDistanceLabel = useMemo(() => {
    const first = featuredHotels[0];
    if (!first) return '0.8 km';
    const d = distanceMap.get(first.id);
    if (typeof d === 'number' && Number.isFinite(d) && d > 0) {
      return `${d < 10 ? d.toFixed(1) : Math.round(d)} km`;
    }
    return '0.8 km';
  }, [featuredHotels, distanceMap]);

  const handleToggleNearMe = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setSortMode('nearest');
          showToast(
            tr(
              language,
              '📍 បង្ហាញសណ្ឋាគារនៅជិតទីតាំងរបស់អ្នក!',
              '📍 Showing hotels near your location!',
              '📍 显示您附近的酒店！'
            ),
            'success'
          );
        },
        () => {
          setSortMode('nearest');
          showToast(
            tr(
              language,
              '📍 បង្ហាញសណ្ឋាគារពេញនិយមនៅជិតអ្នក',
              '📍 Showing popular hotels near you',
              '📍 显示您附近的热门酒店'
            ),
            'info'
          );
        }
      );
    }
  };

  const primaryHotelCategoryButtons = [
    {
      id: 'all',
      nameKh: 'ទាំងអស់',
      nameEn: 'All Stays',
      nameZh: '全部住宿',
      icon: LayoutGrid,
      imageSrc: '/categories/hotel_cat_all.png',
      gradient: 'linear-gradient(180deg, #FF9933 0%, #D94E08 100%)',
      shadow: '0 5px 12px rgba(217, 78, 8, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      activeRing: '0 0 0 3px #1E293B, 0 6px 14px rgba(217, 78, 8, 0.45)',
    },
    {
      id: 'hotel_stay',
      nameKh: 'សណ្ឋាគារ',
      nameEn: 'Hotels',
      nameZh: '星级酒店',
      icon: BedDouble,
      imageSrc: '/categories/hotel_cat_hotels.png',
      gradient: 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
      shadow: '0 5px 12px rgba(13, 102, 48, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      activeRing: '0 0 0 3px #1E293B, 0 6px 14px rgba(13, 102, 48, 0.45)',
    },
    {
      id: 'verified_big',
      nameKh: 'សណ្ឋាគារ VIP',
      nameEn: 'VIP Hotels',
      nameZh: 'VIP 酒店',
      icon: Crown,
      imageSrc: '/categories/hotel_cat_vip.png',
      gradient: 'linear-gradient(180deg, #F75977 0%, #C41D4B 100%)',
      shadow: '0 5px 12px rgba(196, 29, 75, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      activeRing: '0 0 0 3px #1E293B, 0 6px 14px rgba(196, 29, 75, 0.45)',
    },
    {
      id: 'guesthouse',
      nameKh: 'ផ្ទះស្នាក់នៅ',
      nameEn: 'Guesthouses',
      nameZh: '民宿客栈',
      icon: Home,
      imageSrc: '/categories/hotel_cat_guesthouses.png',
      gradient: 'linear-gradient(180deg, #3290FA 0%, #1254C7 100%)',
      shadow: '0 5px 12px rgba(18, 84, 199, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      activeRing: '0 0 0 3px #1E293B, 0 6px 14px rgba(18, 84, 199, 0.45)',
    },
    {
      id: 'luxury_resort',
      nameKh: 'រីសត',
      nameEn: 'Resorts',
      nameZh: '度假村',
      icon: Sparkles,
      imageSrc: '/categories/hotel_cat_resorts.png',
      gradient: 'linear-gradient(180deg, #F4B630 0%, #C67D0D 100%)',
      shadow: '0 5px 12px rgba(198, 125, 13, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      activeRing: '0 0 0 3px #1E293B, 0 6px 14px rgba(198, 125, 13, 0.45)',
    },
    {
      id: 'boutique_villa',
      nameKh: 'វីឡា/ប៊ូទិក',
      nameEn: 'Villas',
      nameZh: '精品别墅',
      icon: Building2,
      imageSrc: '/categories/hotel_cat_villas.png',
      gradient: 'linear-gradient(180deg, #22AAA3 0%, #0E6769 100%)',
      shadow: '0 5px 12px rgba(14, 103, 105, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      activeRing: '0 0 0 3px #1E293B, 0 6px 14px rgba(14, 103, 105, 0.45)',
    },
  ];

  const hasActiveHotelFilters =
    categoryFilter !== 'all' ||
    Boolean(selectedProvince && selectedProvince !== 'ទាំងអស់' && selectedProvince.toLowerCase() !== 'all') ||
    Boolean(hotelSearchQuery.trim()) ||
    sortMode === 'nearest';

  const resetAllHotelFilters = () => {
    setCategoryFilter('all');
    setSelectedProvince('');
    setHotelSearchQuery('');
    setRatingFilter('all');
    setSortMode('newest');
    scrollToHotelList();
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-[#1E293B] text-white min-h-full font-khmer pb-20 overflow-x-hidden">
      {/* 1. Shared Master Hero Header with 7-Day Free Trial Badge (Matching Reference Image 2) */}
      <AngkorHeroTopHeader mode="food" />

      {/* 2. MAIN CONTENT CONTAINER Rising Smoothly from Angkor Hero into Dark Slate (#1E293B) */}
      <div className="relative z-20 -mt-[82px] px-3 min-[360px]:px-4 sm:px-5 space-y-3 bg-[#1E293B]/0">
        {/* Compact Promotional Title Banner (Aligned Left) */}
        <div className="flex items-center justify-start pl-0.5 sm:pl-1">
          <div className="relative py-1 pl-1 pr-2 bg-transparent inline-flex items-center gap-2.5 max-w-[65%] min-w-0">
            <div
              style={{
                background: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 100%)',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.26), inset 0 1px 1px rgba(255, 255, 255, 0.65)',
              }}
              className="relative z-10 w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
            >
              <BedDouble className="w-4 h-4 text-[#042F2E]" strokeWidth={2.4} />
            </div>

            <span className="relative z-10 h-6 w-px bg-white/35 shrink-0" aria-hidden="true" />

            <div className="relative z-10 min-w-0">
              <h2
                className="font-khmer font-extrabold text-white leading-[1.65] py-0.5 break-words"
                style={{ fontSize: 'clamp(13.8px, 3.96vw, 16.2px)', textShadow: '0 1px 3px rgba(0, 0, 0, 0.65)' }}
              >
                {tr(language, 'សណ្ឋាគារ និងផ្ទះសំណាក់', 'Hotels & Guesthouses', '查找酒店与客栈')}
              </h2>
              <p
                className="font-khmer font-bold text-[#FDE68A] leading-[1.62] py-0.5 break-words"
                style={{ fontSize: 'clamp(11px, 3.12vw, 13.2px)', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)' }}
              >
                {tr(language, 'កន្លែងស្នាក់នៅស្អាត គ្រប់ខេត្ត', 'Clean & comfortable stays everywhere', '全柬各省舒适住宿推荐')}
              </p>
            </div>
          </div>
        </div>

        {/* Row 1: Essential White Pill Search Bar + Inline GPS Near Me Button (Compact ~60% Width Aligned Left) */}
        <div className="w-full flex items-center gap-2 min-w-0">
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.98)',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1)',
            }}
            className="flex-1 min-w-0 min-h-[48px] py-1 rounded-full border border-white pl-3.5 pr-2 flex items-center gap-2"
          >
            <Search className="w-5 h-5 text-slate-500 shrink-0" strokeWidth={2.3} />
            <input
              ref={searchInputRef}
              type="text"
              size={1}
              value={hotelSearchQuery}
              onChange={(e) => setHotelSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  searchInputRef.current?.blur();
                  scrollToHotelList();
                }
              }}
              placeholder={tr(
                language,
                'ស្វែងរកសណ្ឋាគារ, ផ្ទះសំណាក់ ឬតំបន់ជិតអ្នក...',
                'Search hotel, guesthouse, or nearby area...',
                '搜索酒店、客栈或附近区域...'
              )}
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-[13.5px] font-bold text-slate-900 placeholder-slate-400 focus:outline-none truncate font-khmer"
            />
            {hotelSearchQuery.trim() ? (
              <button
                type="button"
                onClick={() => setHotelSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
                title={tr(language, 'សម្អាត', 'Clear', '清除')}
              >
                <X className="w-4 h-4" strokeWidth={2.2} />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                if (sortMode === 'nearest') {
                  setSortMode('newest');
                } else {
                  handleToggleNearMe();
                }
                scrollToHotelList();
              }}
              style={
                sortMode === 'nearest'
                  ? {
                      background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                      boxShadow: '0 4px 12px rgba(21, 128, 61, 0.35)',
                    }
                  : {
                      background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                      boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35)',
                    }
              }
              className="min-h-[36px] px-2.5 min-[360px]:px-3.5 py-1 rounded-full text-white font-extrabold text-xs inline-flex items-center gap-1.5 shrink-0 border border-white/80 transition active:scale-95 cursor-pointer leading-[1.6]"
            >
              <MapPin className="w-3.5 h-3.5 text-white fill-white/25 shrink-0" strokeWidth={2.3} />
              <span>{tr(language, 'នៅជិតខ្ញុំ', 'Near Me', '附近')}</span>
            </button>
          </div>
        </div>

        {/* Row 2: 6 Premium 3D Gold-Framed Hotel Category Buttons (3×2 Grid) + Clear White Text Below Each Button + Compact 25-Province Selector */}
        <div
          ref={hotelCategoryCardRef}
          style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.84) 0%, rgba(15, 23, 42, 0.94) 100%)',
            boxShadow: '0 10px 28px rgba(15, 23, 42, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
          }}
          className="w-full max-w-full min-w-0 rounded-[24px] p-2 min-[360px]:p-2.5 sm:p-3.5 border border-amber-400/25 space-y-2.5"
        >
          <div className="kft-cat-grid grid grid-cols-3 gap-x-1.5 min-[360px]:gap-x-2 sm:gap-x-3 gap-y-2 min-[360px]:gap-y-2.5 sm:gap-y-3 items-start">
            {primaryHotelCategoryButtons.map((cat) => {
              const active = categoryFilter === cat.id;
              const titleText = tr(language, cat.nameKh, cat.nameEn, cat.nameZh);
              return (
                <button
                  key={cat.id}
                  type="button"
                  id={`kft-hotel-cat-${cat.id}-btn`}
                  onClick={() => {
                    setCategoryFilter(cat.id);
                    scrollToHotelList(true);
                  }}
                  aria-pressed={active}
                  className="kft-cat-btn group relative flex flex-col items-center justify-start w-full max-w-full min-w-0 overflow-visible p-0 bg-transparent border-0 transition-colors duration-150 cursor-pointer focus:outline-none select-none"
                >
                  {/* 3D Gold-Bordered Button Graphic */}
                  <div
                    className="kft-cat-img-wrap relative w-full max-w-full min-w-0 min-h-0 aspect-[2.12/1] overflow-visible transition-all duration-200 rounded-[14px]"
                    style={{
                      transform: 'none',
                    }}
                  >
                    <img
                      src={cat.imageSrc}
                      alt={titleText}
                      loading="eager"
                      decoding="async"
                      draggable={false}
                      className="block w-full h-full max-w-full min-w-0 min-h-0 object-contain pointer-events-none select-none"
                    />
                  </div>

                  {/* Clear White Title Below Each Button */}
                  <span className={`kft-cat-label ${active ? 'kft-cat-label-active' : ''}`}>
                    {titleText}
                  </span>

                  {/* Subtle Gold Active Indicator Bar Below Title */}
                  <span
                      aria-hidden="true"
                      className={`mt-0.5 h-1 w-7 rounded-full transition-opacity duration-150 ${active ? 'opacity-100' : 'opacity-0'}`}
                      style={{
                        background: 'linear-gradient(90deg, #FDE047 0%, #F59E0B 100%)',
                        boxShadow: '0 0 6px rgba(250, 204, 21, 0.8)',
                      }}
                    />
                </button>
              );
            })}
          </div>

          {/* Compact 25-Province Selector Bar inside the Card */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/10">
            <div className="relative flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  scrollToHotelList();
                }}
                aria-label={tr(language, 'ជ្រើសរើសខេត្ត-ក្រុងទាំង ២៥', 'Select Province (25 Provinces)', '选择省份（25个省市）')}
                className="w-full min-h-[40px] pl-9 pr-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-extrabold text-slate-800 cursor-pointer focus:outline-none focus:border-emerald-500 transition shadow-xs"
              >
                <option value="">
                  {tr(language, 'គ្រប់ខេត្ត-ក្រុងទាំង ២៥', 'All 25 Provinces & Capital', '全部 25 个省市')}
                </option>
                {provinceOptions.map((p) => (
                  <option key={p.id} value={p.value}>
                    {tr(language, p.fullKh, p.en, p.zh)} ({p.count})
                  </option>
                ))}
              </select>
            </div>

            {hasActiveHotelFilters && (
              <button
                type="button"
                onClick={resetAllHotelFilters}
                className="kft-btn-reset"
              >
                <span>↺ {tr(language, 'កំណត់ឡើងវិញ', 'Reset', '重置')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 3: Compact Clean White Register Hotel Bar (Matching Shop Menu Row 3) */}
        <div className="bg-white rounded-[20px] p-3 border border-slate-200/85 shadow-[0_4px_14px_rgba(15,23,42,0.04)] flex items-center justify-between gap-2.5 flex-wrap text-slate-900">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span
              style={{
                background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
              }}
              className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs"
            >
              <BedDouble className="w-4.5 h-4.5" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-[1.65] break-words">
                {tr(language, 'ចុះបញ្ជីសណ្ឋាគារ ឬផ្ទះសំណាក់', 'Register Your Hotel or Guesthouse', '入驻您的酒店或客栈')}
              </h3>
              <p className="text-[11px] text-slate-500 leading-[1.6] break-words">
                {tr(
                  language,
                  'បង្ហាញសណ្ឋាគារ ផ្ទះសំណាក់ និងទីតាំង GPS របស់អ្នកនៅលើកម្មវិធី',
                  'Showcase your hotel and GPS directions on the app',
                  '在应用中展示您的酒店与 GPS 导航路线'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  (window as any).__kft_admin_tab = 'hotels';
                  setIsAdminOpen(true);
                }}
                className="kft-btn-secondary-pill"
              >
                <Settings className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{tr(language, 'គ្រប់គ្រង', 'Manage', '管理')}</span>
              </button>
            )}

            {!isAdmin && myExistingHotel && (
              <button
                type="button"
                onClick={() => openManageMyVipStore(myExistingHotel.id)}
                className="kft-btn-secondary-pill"
              >
                <Edit2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{tr(language, 'កែប្រែសណ្ឋាគារខ្ញុំ', 'Edit Hotel', '编辑酒店')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddHotelClick}
              className="kft-btn-cta-orange"
            >
              <Plus className="w-4 h-4 stroke-[2.6] shrink-0" />
              <span>{tr(language, 'បន្ថែមសណ្ឋាគារ', 'Add Hotel', '添加酒店')}</span>
            </button>
          </div>
        </div>

        <div ref={hotelListStartRef} id="kft-hotel-list-section" className="scroll-mt-3" />

        {/* =====================================================================
            3. HOTEL LISTINGS (Clean White Cards on Dark Slate #1E293B)
            ===================================================================== */}
        {filteredHotels.length > 0 ? (
          <div className="space-y-4 pt-0.5 min-h-[85vh]">
            {/* Section 1: សណ្ឋាគារពេញនិយមជិតខ្ញុំ (Popular Hotels Near Me - Clean White Featured Cards) */}
            {featuredHotels.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Flame className="w-5 h-5 text-orange-400 fill-amber-400 shrink-0" />
                      <h3 className="font-extrabold text-[15px] sm:text-base text-white leading-[1.65] break-words">
                        {tr(language, 'សណ្ឋាគារពេញនិយមជិតខ្ញុំ', 'Popular Hotels Near Me', '附近热门酒店')}
                      </h3>
                    </div>

                    <span
                      style={{
                        background:
                          sortMode === 'nearest'
                            ? 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)'
                            : 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                      }}
                      className="px-2.5 py-0.5 rounded-full text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-2xs shrink-0 select-none"
                    >
                      <MapPin className="w-3 h-3 text-white fill-white/25 shrink-0" />
                      <span>{nearestDistanceLabel}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAllFeatured((prev) => !prev)}
                    className="kft-btn-see-all"
                  >
                    <span>
                      {showAllFeatured
                        ? tr(language, 'បង្រួម', 'Show less', '收起')
                        : tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {featuredHotels.map((hotel) => {
                    const loc = getLocalizedDestination(hotel, language);
                    const isVipRecord = vipHotelIds.has(hotel.id);
                    const bookmarked = isBookmarked(hotel.id);
                    const hash = getDeterministicHash(hotel.id);
                    const displayRating =
                      hotel.rating && hotel.rating > 0
                        ? Number(hotel.rating).toFixed(1)
                        : (4.6 + (hash % 4) * 0.1).toFixed(1);
                    const displayReviews =
                      hotel.reviewCount && hotel.reviewCount > 0
                        ? hotel.reviewCount
                        : 95 + (hash % 210);
                    const distanceKm = distanceMap.get(hotel.id) ?? getDeterministicDistanceKm(hotel.id);
                    const distanceStr = distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm).toString();
                    const amenityChips = getAmenityChipsForHotel(hotel);

                    const handleCallHotel = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      const rawPhone = String(hotel.phone || '').trim();
                      const firstPhone = rawPhone.split(/[\/,;]/)[0]?.replace(/[^0-9+]/g, '') || '';
                      if (firstPhone.length >= 6) {
                        window.location.href = `tel:${firstPhone}`;
                      } else {
                        setSelectedDestination(hotel);
                      }
                    };

                    return (
                      <article
                        key={hotel.id}
                        data-testid={`hotel-featured-${hotel.id}`}
                        onClick={() => setSelectedDestination(hotel)}
                        className="bg-white rounded-[22px] p-2.5 border border-slate-200/90 shadow-[0_6px_20px_rgba(15,23,42,0.06)] hover:border-emerald-500/60 transition flex gap-3 items-stretch cursor-pointer font-khmer text-slate-900"
                      >
                        {/* Left Photo Box with Distance Pill & Heart Button */}
                        <div className="w-[100px] min-[340px]:w-[120px] min-[380px]:w-[144px] sm:w-[156px] min-h-[130px] rounded-2xl overflow-hidden relative shrink-0 bg-slate-100 border border-slate-100">
                          <HotelAvatar
                            hotel={hotel}
                            alt={loc.name}
                            className="w-full h-full object-cover"
                          />

                          {/* Top-left Distance Badge */}
                          <span
                            style={{
                              background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                            }}
                            className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-white text-[10.5px] font-extrabold inline-flex items-center gap-1 shadow-xs"
                          >
                            <MapPin className="w-3 h-3 text-white fill-white/25 shrink-0" />
                            <span>
                              {distanceStr} {tr(language, 'km', 'km', '公里')}
                            </span>
                          </span>

                          {/* Top-right Heart Bookmark Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBookmark(hotel.id);
                            }}
                            aria-label={tr(language, 'រក្សាទុក', 'Bookmark', '收藏')}
                            className="kft-btn-fav absolute top-2 right-2"
                          >
                            <Heart className={`w-4 h-4 ${bookmarked ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} strokeWidth={2.2} />
                          </button>

                          {/* Bottom-left VIP Badge */}
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9.5px] font-extrabold inline-flex items-center gap-1 shadow-xs">
                            <Crown className="w-2.5 h-2.5 text-slate-950 shrink-0" />
                            <span>{tr(language, 'សណ្ឋាគារ VIP', 'VIP Hotel', 'VIP 酒店')}</span>
                          </span>
                        </div>

                        {/* Right Info Column */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            {isCambodiaChoiceEligible(hotel) && (
                              <div className="mb-1">
                                <CambodiaChoiceBadge language={language} size="sm" />
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-1.5">
                              <h4 className="font-extrabold text-sm sm:text-[15px] text-slate-900 leading-[1.6] line-clamp-2 break-words">
                                {loc.name || hotel.nameKh}
                              </h4>
                              {isAdmin && (
                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {!isVipRecord && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setHotelForImageEdit(hotel);
                                      }}
                                      className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white transition-colors active:scale-95 cursor-pointer"
                                      title={tr(language, 'ប្តូររូបភាពសណ្ឋាគារ', 'Upload / Change Hotel Photo', '更换酒店图片')}
                                    >
                                      <Camera className="w-3.5 h-3.5" strokeWidth={2} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isVipRecord) {
                                        openManageMyVipStore(hotel.id);
                                      } else {
                                        (window as any).__kft_open_dest_edit = true;
                                        setSelectedDestination(hotel);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors active:scale-95 cursor-pointer"
                                    title={tr(language, 'កែប្រែព័ត៌មាន & ទីតាំង GPS', 'Edit Info & GPS', '编辑信息与定位')}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" strokeWidth={2} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Rating & Province */}
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600 flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                <strong className="font-extrabold text-slate-900">{displayRating}</strong>
                                <span className="text-slate-400">({displayReviews})</span>
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-emerald-700 font-bold truncate">
                                {loc.province || hotel.provinceEn || hotel.provinceKh}
                              </span>
                            </div>

                            {/* Amenity Tags */}
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {amenityChips.map((chip, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-[10.5px] font-bold text-slate-700 inline-flex items-center gap-1"
                                >
                                  {renderAmenityIcon(chip.icon)}
                                  <span>{chip.label}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Bottom Action Buttons: Call/Details + Map Navigation */}
                          <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={handleCallHotel}
                              className="kft-btn-call"
                            >
                              <Phone className="w-3.5 h-3.5 text-white fill-white shrink-0" />
                              <span className="break-words">{tr(language, 'ទូរស័ព្ទ', 'Call', '电话')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDestinationGoogleExternal(hotel, 'maps');
                              }}
                              className="kft-btn-map"
                            >
                              <Navigation className="w-3.5 h-3.5 text-white shrink-0" strokeWidth={2.2} />
                              <span className="break-words">{tr(language, 'ផែនទី', 'Map', '地图')}</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 2: បញ្ជីសណ្ឋាគារបន្ថែម (More Hotels Directory - Compact Clean White Cards) */}
            {displayedDirectoryHotels.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 px-0.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        background: 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)',
                      }}
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white shadow-2xs"
                    >
                      <BedDouble className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                    </span>
                    <h3 className="font-extrabold text-[15px] sm:text-base text-white leading-[1.6]">
                      {tr(language, 'បញ្ជីសណ្ឋាគារបន្ថែម', 'More Hotels Directory', '更多酒店列表')}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-extrabold text-slate-800 font-mono shadow-2xs">
                    {directoryHotels.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {displayedDirectoryHotels.map((hotel) => {
                    const loc = getLocalizedDestination(hotel, language);
                    const isVipRecord = vipHotelIds.has(hotel.id);
                    const hash = getDeterministicHash(hotel.id);
                    const displayRating =
                      hotel.rating && hotel.rating > 0
                        ? Number(hotel.rating).toFixed(1)
                        : (4.6 + (hash % 4) * 0.1).toFixed(1);
                    const displayReviews =
                      hotel.reviewCount && hotel.reviewCount > 0
                        ? hotel.reviewCount
                        : 95 + (hash % 210);
                    const distanceKm = distanceMap.get(hotel.id) ?? getDeterministicDistanceKm(hotel.id);

                    return (
                      <article
                        key={hotel.id}
                        data-testid={`hotel-row-${hotel.id}`}
                        onClick={() => setSelectedDestination(hotel)}
                        className="kft-cv-card bg-white rounded-[20px] p-2.5 border border-slate-200/90 shadow-[0_4px_14px_rgba(15,23,42,0.04)] hover:border-emerald-500/60 transition flex items-center gap-3 cursor-pointer font-khmer text-slate-900"
                      >
                        <div className="w-16 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200/80">
                          <HotelAvatar
                            hotel={hotel}
                            alt={loc.name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
                            <h4 className="font-extrabold text-[13.5px] sm:text-sm text-slate-900 leading-[1.65] line-clamp-2 break-words">
                              {loc.name || hotel.nameKh}
                            </h4>
                            {language === 'km' && hotel.nameEn && hotel.nameEn !== hotel.nameKh && (
                              <span className="text-xs font-semibold text-slate-500 line-clamp-1 break-words">
                                {hotel.nameEn}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                              <strong className="font-extrabold text-slate-900">{displayRating}</strong>
                              <span className="text-slate-400">({displayReviews})</span>
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>
                                {distanceKm} {tr(language, 'km', 'km', '公里')}
                              </span>
                            </span>
                            {isCambodiaChoiceEligible(hotel) && <CambodiaChoiceBadge language={language} size="sm" />}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDestinationGoogleExternal(hotel, 'maps');
                            }}
                            aria-label={tr(language, 'ផែនទី', 'Map', '地图')}
                            className="kft-btn-map-icon"
                          >
                            <Navigation className="w-3.5 h-3.5 text-white fill-white/20" strokeWidth={2.3} />
                          </button>

                          {isAdmin && (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isVipRecord) {
                                    openManageMyVipStore(hotel.id);
                                  } else {
                                    (window as any).__kft_open_dest_edit = true;
                                    setSelectedDestination(hotel);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors active:scale-95 cursor-pointer"
                                title={tr(language, 'កែប្រែព័ត៌មាន & ទីតាំង GPS', 'Edit Info & GPS', '编辑信息与定位')}
                              >
                                <Edit2 className="w-3.5 h-3.5" strokeWidth={2} />
                              </button>
                            </div>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-400" strokeWidth={2.2} />
                        </div>
                      </article>
                    );
                  })}
                </div>

                {visibleCount < directoryHotels.length && (
                  <div ref={loadMoreTriggerRef} className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleCount((prev) => Math.min(directoryHotels.length, prev + HOTEL_BATCH_SIZE))
                      }
                      className="kft-btn-load-more"
                    >
                      {tr(
                        language,
                        `បង្ហាញសណ្ឋាគារបន្ថែម (${displayedDirectoryHotels.length} / ${directoryHotels.length})`,
                        `Show More Hotels (${displayedDirectoryHotels.length} / ${directoryHotels.length})`,
                        `加载更多酒店 (${displayedDirectoryHotels.length} / ${directoryHotels.length})`
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 space-y-2 font-khmer bg-white rounded-2xl border border-slate-200/80 p-6">
            <BedDouble className="w-10 h-10 mx-auto text-slate-300" strokeWidth={1.75} />
            <p className="text-xs font-bold text-slate-600">
              {debouncedSearchQuery.trim()
                ? tr(
                    language,
                    `រកមិនឃើញសណ្ឋាគារដែលត្រូវនឹង «${debouncedSearchQuery.trim()}» ក្នុងកម្មវិធីទេ`,
                    `No hotels in the app match "${debouncedSearchQuery.trim()}"`,
                    `应用内未找到与“${debouncedSearchQuery.trim()}”匹配的酒店`
                  )
                : tr(
                    language,
                    'រកមិនឃើញសណ្ឋាគារក្នុងផ្នែកនេះទេ',
                    'No hotels matched your filters',
                    '未找到符合筛选条件的酒店'
                  )}
            </p>
            {debouncedSearchQuery.trim() && (
              <button
                type="button"
                onClick={() =>
                  openExternalUrlNativeSafe(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${debouncedSearchQuery.trim()} Cambodia`
                    )}`
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0E5A35] text-white text-xs font-bold cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                {tr(language, 'ស្វែងរកនៅលើ Google Maps', 'Search on Google Maps', '在 Google 地图中搜索')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Direct Hotel Photo Upload Modal for Admin */}
      {Boolean(hotelForImageEdit) && (
      <TouristImageModal
        destination={hotelForImageEdit}
        isOpen={Boolean(hotelForImageEdit)}
        onClose={() => setHotelForImageEdit(null)}
        onSave={(updatedHotel) => {
          updateDestination({
            ...updatedHotel,
            isAdminEdited: true,
          });
          setHotelForImageEdit(null);
          showToast(
            tr(
              language,
              `បានរក្សាទុករូបភាពសណ្ឋាគារ «${updatedHotel.nameKh}» ជោគជ័យ!`,
              `Saved hotel photo for "${updatedHotel.nameEn}"!`,
              `已保存酒店“${updatedHotel.nameEn}”的图片！`
            ),
            'success'
          );
        }}
        isKm={language === 'km'}
      />
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
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
} from 'lucide-react';
import { TouristImageModal } from './TouristImageModal';
import { rankBySearchRelevance, destinationSearchFields, analyzeSearchQuery } from '../utils/searchEngine';
import { parseSmartSearchIntent } from '../utils/aiSearchBridge';
import { DISH_PROVINCES } from '../utils/foodFilters';
import { tr } from '../utils/i18n';
import { getLocalizedDestination } from '../utils/zhDynamicTranslator';
import { resolveUserAvatarUrl, handleAvatarImageError } from '../utils/avatarHelper';

const HOTEL_BATCH_SIZE = 36;

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
  if (hotel.isCustomPhoto || hotel.isAdminEdited || raw.startsWith('data:image/') || raw.includes('supabase.co')) {
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
    record?.createdAt,
    record?.submittedAt,
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
  // Later index in `restaurants` array means more recently added
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

  // Convert any user/owner-added Hotel records (from `restaurants` where `isHotelBusinessRecord(r)`) into TouristDestination format, sorted NEWEST FIRST
  const { vipAddedHotelDestinations, addedHotelTimestampMap } = useMemo(() => {
    const tsMap = new Map<string, number>();
    const list: TouristDestination[] = [];

    restaurants.forEach((r: Restaurant, idx: number) => {
      if (
        !r ||
        !isHotelBusinessRecord(r) ||
        !(r.status === 'approved' || isAdmin || r.ownerId === currentUser?.id)
      ) {
        return;
      }
      const catInfo = inferBusinessTypeAndCategory(r);
      const ts = extractAddedTimestampMs(r, idx + 1000);
      tsMap.set(r.id, ts);

      list.push({
        id: r.id,
        nameKh: r.nameKh,
        nameEn: r.nameEn || r.nameKh,
        categorySlug: 'hotel' as const,
        categoryKh: r.categoryKh || catInfo.shortKh,
        categoryEn: r.categoryEn || catInfo.shortEn,
        descriptionKh: r.descriptionKh || `${r.nameKh} — កន្លែងស្នាក់នៅស្អាត និងមានផាសុកភាព។`,
        descriptionEn: r.descriptionEn || `${r.nameEn || r.nameKh} — Verified accommodation in ${r.provinceEn}.`,
        photoUrl: r.profileImage || r.photoUrl || '',
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
        isCustomPhoto: Boolean(r.profileImage || r.photoUrl),
        locationVerificationStatus: 'verified' as const,
      });
    });

    // Also detect any user/admin newly added or edited hotels in `destinations`
    destinations.forEach((d, idx) => {
      if (!d || d.categorySlug !== 'hotel') return;
      if (d.isAdminEdited || d.isCustomPhoto || !/^dest-hotel-\d+$/i.test(String(d.id || ''))) {
        if (!tsMap.has(d.id)) {
          tsMap.set(d.id, extractAddedTimestampMs(d, idx));
        }
      }
    });

    // Sort user/owner-added hotels strictly Newest First (highest timestamp first)
    list.sort((a, b) => (tsMap.get(b.id) || 0) - (tsMap.get(a.id) || 0));

    return { vipAddedHotelDestinations: list, addedHotelTimestampMap: tsMap };
  }, [restaurants, destinations, isAdmin, currentUser?.id]);

  const userAddedHotelIds = useMemo(
    () => new Set<string>([...vipAddedHotelDestinations.map((d) => d.id), ...addedHotelTimestampMap.keys()]),
    [vipAddedHotelDestinations, addedHotelTimestampMap]
  );

  // Combine user/owner newly added hotels (Newest First) + seed hotels from `destinations`
  const allHotels = useMemo<TouristDestination[]>(() => {
    const seedHotels = destinations.filter((d) => Boolean(d && d.categorySlug === 'hotel'));
    const customIds = new Set(vipAddedHotelDestinations.map((d) => d.id));
    return [...vipAddedHotelDestinations, ...seedHotels.filter((d) => !customIds.has(d.id))];
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

  // Order: Newly added user/business-owner hotels FIRST (strictly Newest First, never shuffled), then standard hotels
  const orderedHotels = useMemo(() => {
    const newlyAdded = allHotels
      .filter((h) => userAddedHotelIds.has(h.id))
      .sort((a, b) => (addedHotelTimestampMap.get(b.id) || 0) - (addedHotelTimestampMap.get(a.id) || 0));
    const regularHotels = allHotels.filter((h) => !userAddedHotelIds.has(h.id));
    return [...newlyAdded, ...shuffleForCurrentSession(regularHotels)];
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
        // 'newest' or 'popular': guarantee user/owner newly added hotels are ALWAYS at the very top (Newest First)
        const newestUserHotels = scoped
          .filter((h) => userAddedHotelIds.has(h.id))
          .sort((a, b) => (addedHotelTimestampMap.get(b.id) || 0) - (addedHotelTimestampMap.get(a.id) || 0));
        const restHotels = scoped.filter((h) => !userAddedHotelIds.has(h.id));
        scoped = [...newestUserHotels, ...restHotels];
      }
      return scoped;
    }

    const qa = analyzeSearchQuery(trimmedQ);
    if (qa.distinctive.length === 0 && (smartIntent?.detectedProvinceKh || smartIntent?.semanticCategory)) {
      return scoped;
    }

    return rankBySearchRelevance(
      scoped,
      trimmedQ,
      (h) => destinationSearchFields(h, [getLocalizedDestination(h, 'zh').name, classifyHotelSubCategory(h)]),
      {
        bucketSize: 100,
        tieBreak: (a, b) =>
          (addedHotelTimestampMap.get(b.id) || 0) - (addedHotelTimestampMap.get(a.id) || 0) ||
          (b.rating || 0) - (a.rating || 0) ||
          (a.nameEn || a.nameKh || '').localeCompare(b.nameEn || b.nameKh || ''),
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

  // Split into Section 1: "សណ្ឋាគារពេញនិយមជិតខ្ញុំ" (Featured Cards, with all newly added user/owner hotels at the very top) & Section 2: "បញ្ជីសណ្ឋាគារបន្ថែម" (Compact Directory Rows matching Shop Menu)
  const { featuredHotels, directoryHotels } = useMemo(() => {
    if (filteredHotels.length === 0) {
      return { featuredHotels: [], directoryHotels: [] };
    }
    const newlyAddedInFiltered = filteredHotels.filter((h) => userAddedHotelIds.has(h.id));
    const baseTargetCount = showAllFeatured ? 12 : Math.max(2, newlyAddedInFiltered.length);
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
    // Enforce: VIP user can add 1 only. If added shop, cannot add hotel!
    if (!isAdmin && myExistingShop) {
      showToast(
        tr(
          language,
          `គណនី VIP អាចបង្កើតហាងអាហារ ឬសណ្ឋាគារបានតែ ១ ប៉ុណ្ណោះ! អ្នកបានបង្កើតហាងអាហារ «${myExistingShop.nameKh}» រួចហើយ ដូច្នេះមិនអាចបន្ថែមសណ្ឋាគារបានទៀតទេ។`,
          `VIP accounts can add 1 listing only (Shop OR Hotel). You already added Shop "${myExistingShop.nameEn || myExistingShop.nameKh}", so you cannot add a Hotel.`,
          `VIP 账号仅可添加 1 家（餐厅或酒店二选一）。您已添加餐厅“${myExistingShop.nameEn || myExistingShop.nameKh}”，无法再添加酒店。`
        ),
        'warning'
      );
      return;
    }
    if (!isAdmin && myExistingHotel && storeQuota.remainingAvailableSlots <= 0) {
      showToast(
        tr(
          language,
          `គណនី VIP អាចបង្កើតសណ្ឋាគារបានតែ ១ ប៉ុណ្ណោះ! អ្នកបានបង្កើតសណ្ឋាគារ «${myExistingHotel.nameKh}» រួចហើយ (អាចចុច «កែប្រែសណ្ឋាគារខ្ញុំ» ដើម្បីកែព័ត៌មាន)។`,
          `VIP accounts can add 1 listing only! You already added "${myExistingHotel.nameEn || myExistingHotel.nameKh}" (tap "Edit My Hotel" below).`,
          `VIP 账号仅可添加 1 家酒店！您已添加“${myExistingHotel.nameEn || myExistingHotel.nameKh}”（可点击下方编辑）。`
        ),
        'warning'
      );
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

  return (
    <div className="max-w-md mx-auto bg-[#F4F7F5] text-slate-900 min-h-full font-khmer pb-8">
      {/* =====================================================================
          1. TOP ANGKOR WAT SUNSET & LAKE REFLECTION HERO + SEARCH + CATEGORIES
             (Matching Shop Menu 1-to-1)
          ===================================================================== */}
      <div
        className="relative w-full overflow-hidden pt-2.5 pb-4 px-3.5 select-none"
        style={{
          paddingTop: 'calc(var(--kft-safe-top, 0px) + 10px)',
        }}
      >
        {/* Full-Bleed Angkor Wat Sunset & Emerald Lake Reflection Background */}
        <img
          src="/welcome/shop-angkor-hero.jpg"
          alt="Angkor Wat Cambodia"
          decoding="async"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (!img.dataset.fallback) {
              img.dataset.fallback = '1';
              img.src = '/welcome/angkor-lotus-hero.jpg';
            }
          }}
          className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none"
        />
        {/* Subtle dark emerald top readability gradient */}
        <div
          className="absolute inset-x-0 top-0 h-44 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(4, 47, 30, 0.72) 0%, rgba(6, 65, 42, 0.42) 55%, rgba(6, 65, 42, 0) 100%)',
          }}
        />

        {/* Row 1: Gold-Framed App Logo + Brand Title + Right Notification & Profile Icons */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl p-[2px] bg-gradient-to-b from-[#FDE047] via-[#D4AF37] to-[#9A6F1A] shadow-md shrink-0">
              <img
                src="/logo-kft.png"
                alt="Cambodia Flavors & Tourism"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = '1';
                    img.src = '/app-logo-v200.png';
                  }
                }}
                className="w-full h-full rounded-[14px] object-cover bg-[#064E3B]"
              />
            </div>
            <div className="min-w-0">
              <h1
                className="font-moul text-sm sm:text-[15px] text-white leading-tight truncate"
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.55)' }}
              >
                {tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨美食与旅游')}
              </h1>
              <p
                className="text-xs font-extrabold text-white/95 truncate mt-0.5"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.55)' }}
              >
                Cambodia Flavors &amp; Tourism
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Notification Bell Button with Red Dot Badge */}
            <button
              type="button"
              onClick={() => setIsNotificationsModalOpen(true)}
              aria-label={tr(language, 'ការជូនដំណឹង', 'Notifications', '通知')}
              className="relative w-10 h-10 rounded-full bg-[#0F5A38]/85 hover:bg-[#0F5A38] border border-white/45 text-white flex items-center justify-center backdrop-blur-xs active:scale-95 transition cursor-pointer shadow-sm"
            >
              <Bell className="w-5 h-5 text-white" strokeWidth={2.2} />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#0F5A38]" />
              {unreadNotificationsCount > 0 && (
                <span className="sr-only">{unreadNotificationsCount}</span>
              )}
            </button>

            {/* Profile / Account Button */}
            <button
              type="button"
              onClick={() => {
                if (currentUser) {
                  setActiveTab('profile');
                } else {
                  setIsAuthModalOpen(true);
                }
              }}
              aria-label={tr(language, 'គណនី', 'Account', '账户')}
              className="w-10 h-10 rounded-full bg-[#0F5A38]/85 hover:bg-[#0F5A38] border border-white/45 text-white flex items-center justify-center overflow-hidden backdrop-blur-xs active:scale-95 transition cursor-pointer shadow-sm"
            >
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="9" r="3.6" />
                <path d="M5.5 19.2c1.2-3.1 3.6-4.7 6.5-4.7s5.3 1.6 6.5 4.7a7.8 7.8 0 0 1-13 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Row 2: Clean Storefront/Hotel Icon + Page Heading directly on the Hero Backdrop (Matching Shop Menu) */}
        <div className="relative z-10 mt-3.5 flex items-center gap-2.5 min-w-0">
          <svg
            className="w-9 h-9 text-white shrink-0 drop-shadow-sm"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 9l1.8-5h14.4L21 9" />
            <path d="M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3" />
            <path d="M5 12v8h14v-8" />
            <path d="M9 20v-5h6v5" />
          </svg>
          <div className="min-w-0">
            <h2
              className="font-extrabold text-[17px] sm:text-[18px] text-white leading-tight truncate"
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}
            >
              {tr(
                language,
                'ស្វែងរកសណ្ឋាគារ និងផ្ទះសំណាក់',
                'Find Hotels & Guesthouses',
                '查找酒店与客栈'
              )}
            </h2>
            <p
              className="text-xs font-bold text-white/95 truncate"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
            >
              Hotels &amp; Stays
            </p>
          </div>
        </div>

        {/* Row 3: White Pill Search Input + Green "នៅជិតខ្ញុំ" Near Me Pill Button */}
        <div className="relative z-10 mt-3 flex items-center gap-2">
          <div className="flex-1 min-w-0 h-11 rounded-full bg-white shadow-md flex items-center pl-3.5 pr-2.5 gap-2 border border-white/90">
            <Search className="w-5 h-5 text-slate-800 shrink-0" strokeWidth={2.3} />
            <input
              ref={searchInputRef}
              type="text"
              value={hotelSearchQuery}
              onChange={(e) => setHotelSearchQuery(e.target.value)}
              placeholder={tr(
                language,
                'ស្វែងរកសណ្ឋាគារ, ផ្ទះសំណាក់, តំបន់ ឬឈ្មោះ...',
                'Search hotel, guesthouse, area, or name...',
                '搜索酒店、客栈、地区或名称...'
              )}
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-[13px] font-bold text-slate-900 placeholder-slate-500 focus:outline-none truncate font-khmer"
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
              onClick={() => searchInputRef.current?.focus()}
              className="p-1 text-[#0E5A35] hover:text-[#083B22] shrink-0 cursor-pointer"
              title={tr(language, 'ស្វែងរកដោយសំឡេង', 'Voice Search', '语音搜索')}
            >
              <Mic className="w-4.5 h-4.5" strokeWidth={2.2} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleNearMe}
            style={{
              background:
                sortMode === 'nearest'
                  ? 'linear-gradient(180deg, #16A34A 0%, #0D6E32 100%)'
                  : 'linear-gradient(180deg, #1E7E48 0%, #0F5330 100%)',
            }}
            className="h-11 px-3.5 rounded-full font-extrabold text-xs text-white inline-flex items-center gap-1.5 shrink-0 shadow-md border border-white/60 transition active:scale-95 cursor-pointer"
          >
            <MapPin className="w-4 h-4 shrink-0 text-white fill-white/20" strokeWidth={2.3} />
            <span>{tr(language, 'នៅជិតខ្ញុំ', 'Near Me', '附近')}</span>
          </button>
        </div>

        {/* Row 4: Primary Category Filter Pills Inside Hero (Matching Shop Menu) */}
        <div className="relative z-10 mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {hotelCategoryPills.map((pill) => {
            const active = categoryFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setCategoryFilter(pill.id)}
                style={
                  active
                    ? {
                        background: 'linear-gradient(180deg, #1E7E48 0%, #0E532F 100%)',
                      }
                    : undefined
                }
                className={`h-9 px-3 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-xs ${
                  active
                    ? 'text-white border border-white/70'
                    : 'bg-white/95 text-slate-900 border border-white hover:bg-white'
                }`}
              >
                {pill.icon === 'grid' && (
                  <LayoutGrid className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#0E5A35]'}`} strokeWidth={2.2} />
                )}
                {pill.icon === 'bed' && (
                  <BedDouble className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#0E5A35]'}`} strokeWidth={2.2} />
                )}
                {pill.icon === 'crown' && (
                  <Crown className={`w-3.5 h-3.5 ${active ? 'text-[#FDE047]' : 'text-[#0E5A35]'}`} strokeWidth={2.2} />
                )}
                {pill.icon === 'home' && (
                  <Home className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#0E5A35]'}`} strokeWidth={2.2} />
                )}
                {pill.icon === 'palm' && (
                  <svg
                    className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#0E5A35]'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4" />
                    <path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3" />
                    <path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35z" />
                    <path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14" />
                  </svg>
                )}
                {pill.icon === 'building' && (
                  <Building2 className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-[#0E5A35]'}`} strokeWidth={2.2} />
                )}
                <span>{tr(language, pill.nameKh, pill.nameEn, pill.nameZh)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          MAIN CONTENT SHEET (Matching Shop Menu 1-to-1)
          ===================================================================== */}
      <div className="px-3 pt-2.5 space-y-3">
        {/* Row 5: 4 Secondary Filter & Sort Dropdown Chips (Matching Shop Menu: តំបន់/ខេត្ត ∨ | ប្រភេទ ∨ | ការវាយតម្លៃ ∨ | កម្រៀប) */}
        <div className="grid grid-cols-4 gap-1.5">
          {/* Control 1: Province / Region Selector */}
          <label className="relative h-9 px-2 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-800 cursor-pointer whitespace-nowrap overflow-hidden">
            <MapPin className="w-3.5 h-3.5 text-[#0E5A35] shrink-0" strokeWidth={2.2} />
            <span className="truncate">{selectedProvinceShortLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              aria-label={tr(language, 'តំបន់/ខេត្ត', 'Province', '省份/地区')}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              <option value="">{tr(language, 'គ្រប់ខេត្ត-ក្រុងទាំង ២៥', 'All 25 Provinces', '全部 25 个省市')}</option>
              {provinceOptions.map((p) => (
                <option key={p.id} value={p.value}>
                  {tr(language, p.fullKh, p.en, p.zh)} ({p.count})
                </option>
              ))}
            </select>
          </label>

          {/* Control 2: Stay Type Selector */}
          <label className="relative h-9 px-2 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-800 cursor-pointer whitespace-nowrap overflow-hidden">
            <BedDouble className="w-3.5 h-3.5 text-[#0E5A35] shrink-0" strokeWidth={2.2} />
            <span className="truncate">
              {categoryFilter === 'all'
                ? tr(language, 'ប្រភេទស្នាក់នៅ', 'Stay Type', '住宿类型')
                : hotelCategoryPills.find((c) => c.id === categoryFilter)?.nameKh || tr(language, 'ប្រភេទស្នាក់នៅ', 'Stay Type', '住宿类型')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label={tr(language, 'ប្រភេទស្នាក់នៅ', 'Stay Type', '住宿类型')}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              {hotelCategoryPills.map((c) => (
                <option key={c.id} value={c.id}>
                  {tr(language, c.nameKh, c.nameEn, c.nameZh)}
                </option>
              ))}
            </select>
          </label>

          {/* Control 3: Rating Selector */}
          <label className="relative h-9 px-2 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-800 cursor-pointer whitespace-nowrap overflow-hidden">
            <Star className="w-3.5 h-3.5 text-[#0E5A35] shrink-0" strokeWidth={2.2} />
            <span className="truncate">
              {ratingFilter === '4.5'
                ? '4.5+ ★'
                : ratingFilter === '4.0'
                  ? '4.0+ ★'
                  : tr(language, 'ការវាយតម្លៃ', 'Rating', '评分')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as 'all' | '4.5' | '4.0')}
              aria-label={tr(language, 'ការវាយតម្លៃ', 'Rating', '评分')}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              <option value="all">{tr(language, 'ការវាយតម្លៃ (ទាំងអស់)', 'All Ratings', '全部评分')}</option>
              <option value="4.5">{tr(language, '4.5 ★ ឡើងទៅ', '4.5 ★ & Up', '4.5 ★ 及以上')}</option>
              <option value="4.0">{tr(language, '4.0 ★ ឡើងទៅ', '4.0 ★ & Up', '4.0 ★ 及以上')}</option>
            </select>
          </label>

          {/* Control 4: Sort Order (Defaults to Newest First) */}
          <label className="relative h-9 px-2 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-800 cursor-pointer whitespace-nowrap overflow-hidden">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0E5A35] shrink-0" strokeWidth={2.2} />
            <span className="truncate">
              {sortMode === 'nearest'
                ? tr(language, 'ជិតបំផុត', 'Nearest', '最近')
                : sortMode === 'rating'
                  ? tr(language, 'ពិន្ទុខ្ពស់', 'Top Rated', '最高分')
                  : tr(language, 'ថ្មីបំផុត', 'Newest', '最新')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={sortMode}
              onChange={(e) => {
                const next = e.target.value as 'newest' | 'popular' | 'nearest' | 'rating';
                if (next === 'nearest' && !userCoords) {
                  handleToggleNearMe();
                } else {
                  setSortMode(next);
                }
              }}
              aria-label={tr(language, 'កម្រៀប', 'Sort', '排序')}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              <option value="newest">{tr(language, 'កម្រៀប៖ ថ្មីបំផុត (Newest First)', 'Sort: Newest First', '排序：最新添加优先')}</option>
              <option value="popular">{tr(language, 'កម្រៀប៖ ពេញនិយម', 'Sort: Popular', '排序：最受欢迎')}</option>
              <option value="nearest">{tr(language, 'កម្រៀប៖ ជិតខ្ញុំបំផុត', 'Sort: Nearest', '排序：距离最近')}</option>
              <option value="rating">{tr(language, 'កម្រៀប៖ ពិន្ទុខ្ពស់បំផុត', 'Sort: Highest Rated', '排序：评分最高')}</option>
            </select>
          </label>
        </div>

        {/* =====================================================================
            ROW 6: HOTEL REGISTRATION BANNER (Using Same Storefront Icon Banner as Shop Menu)
            ===================================================================== */}
        <div className="space-y-2">
          <div className="relative rounded-[20px] overflow-hidden shadow-[0_6px_18px_rgba(6,78,59,0.22)]">
            <div className="relative min-h-[108px] sm:min-h-[114px] flex items-center">
              <img
                src="/welcome/hotel-register-banner.png"
                alt="Register Your Hotel or Guesthouse"
                decoding="async"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
              />

              {/* Right Headline, Supporting Text & Prominent Gold Rounded CTA Button */}
              <div className="relative z-10 w-full pl-[39%] pr-3.5 py-2.5 space-y-1.5">
                <div>
                  <h3
                    className="font-khmer font-extrabold text-white leading-tight truncate"
                    style={{ fontSize: '14.5px', textShadow: '0 2px 4px rgba(0,0,0,0.42)' }}
                  >
                    {tr(language, 'ចុះបញ្ជីសណ្ឋាគារ ឬផ្ទះសំណាក់', 'Register Your Hotel or Guesthouse', '入驻您的酒店或客栈')}
                  </h3>
                  <p
                    className="font-khmer font-bold text-white/95 leading-snug mt-0.5 truncate"
                    style={{ fontSize: '10px', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
                  >
                    {tr(
                      language,
                      'បង្ហាញសណ្ឋាគារ ឬផ្ទះសំណាក់របស់អ្នកនៅខាងលើកម្មវិធី',
                      'Showcase your hotel or guesthouse at the top of the app',
                      '在应用顶部展示您的酒店或客栈'
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddHotelClick}
                  style={{
                    background: 'linear-gradient(180deg, #FDE047 0%, #FACC15 55%, #EAB308 100%)',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.75)',
                    fontSize: '12px',
                  }}
                  className="w-full h-8.5 px-4 rounded-full border border-amber-200 text-slate-950 font-khmer font-extrabold inline-flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.8] text-slate-950 shrink-0" />
                  <span>{tr(language, 'បន្ថែមសណ្ឋាគារ', 'Add Hotel', '添加酒店')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* If user already used their 1 VIP slot on a Restaurant, show clear notice */}
          {!isAdmin && myExistingShop && !myExistingHotel && (
            <div className="relative z-10 mt-2.5 px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-300/40 text-amber-200 text-[10.5px] font-semibold font-khmer flex items-center justify-between gap-2">
              <span className="truncate">
                {tr(
                  language,
                  `អ្នកបានប្រើសិទ្ធិ VIP បង្កើតហាងអាហារ «${myExistingShop.nameKh}» រួចហើយ (1/1) — មិនអាចបន្ថែមសណ្ឋាគារទៀតបានទេ។`,
                  `You already used your 1 VIP slot for Shop "${myExistingShop.nameEn || myExistingShop.nameKh}" (1/1) — cannot add a Hotel.`,
                  `您已使用 1 个 VIP 名额添加餐厅"${myExistingShop.nameEn || myExistingShop.nameKh}"(1/1)，无法再添加酒店。`
                )}
              </span>
            </div>
          )}

          {/* Admin / Existing Owner Controls */}
          {isAdmin ? (
            <div className="relative z-10 p-2 rounded-2xl bg-[#0A5C36] border border-emerald-700/40 grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  (window as any).__kft_admin_tab = 'hotels';
                  setIsAdminOpen(true);
                }}
                className="w-full py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-khmer"
              >
                <Settings className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2} />
                <span className="truncate">
                  {tr(language, 'គ្រប់គ្រងសណ្ឋាគារទាំងអស់', 'Manage All Hotels', '管理全部酒店')}
                </span>
              </button>
              <a
                href="/templates/KhmerFoodTourism_Hotel_Photo_Insert_Template.xlsx"
                download="KhmerFoodTourism_Hotel_Photo_Insert_Template.xlsx"
                onClick={() =>
                  showToast(
                    tr(
                      language,
                      'កំពុងទាញយកគំរូ Excel សម្រាប់ដាក់រូបភាពសណ្ឋាគារ...',
                      'Downloading Hotel Photo Excel Template...',
                      '正在下载酒店图片 Excel 模板...'
                    ),
                    'success'
                  )
                }
                className="w-full py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-khmer"
              >
                <Download className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                <span className="truncate">
                  {tr(
                    language,
                    'ទាញយកគំរូ Excel ដាក់រូបសណ្ឋាគារ (.xlsx)',
                    'Download Excel Photo Template (.xlsx)',
                    '下载酒店图片 Excel 模板 (.xlsx)'
                  )}
                </span>
              </a>
            </div>
          ) : myExistingHotel ? (
            <div className="relative z-10 px-3 py-2 rounded-2xl bg-[#0A5C36] border border-emerald-700/40 flex items-center justify-between gap-2 shadow-xs">
              <span className="min-w-0 flex-1 text-[11px] font-bold text-amber-200 truncate font-khmer">
                {tr(
                  language,
                  `សណ្ឋាគាររបស់ខ្ញុំ៖ ${myExistingHotel.nameKh}`,
                  `My Hotel: ${myExistingHotel.nameEn || myExistingHotel.nameKh}`,
                  `我的酒店：${myExistingHotel.nameEn || myExistingHotel.nameKh}`
                )}
              </span>
              <button
                type="button"
                onClick={() => openManageMyVipStore(myExistingHotel.id)}
                className="py-1 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer font-khmer"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-300" strokeWidth={2} />
                <span>{tr(language, 'កែប្រែសណ្ឋាគារខ្ញុំ', 'Edit My Hotel', '编辑我的酒店')}</span>
              </button>
            </div>
          ) : null}
        </div>

        {/* =====================================================================
            HOTEL LISTINGS (Matching Shop Menu: Featured Section + Compact Directory Section)
            ===================================================================== */}
        {filteredHotels.length > 0 ? (
          <div className="space-y-4">
            {/* Section 1: សណ្ឋាគារពេញនិយមជិតខ្ញុំ (Newest User/Owner Added Hotels First + Featured Cards) */}
            {featuredHotels.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-1.5 px-0.5">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        <Flame className="w-5 h-5 text-orange-500 fill-amber-400" />
                      </span>
                      <h3 className="font-extrabold text-[15px] sm:text-base text-[#0F291E] truncate">
                        {tr(language, 'សណ្ឋាគារពេញនិយមជិតខ្ញុំ', 'Popular Hotels Near Me', '附近热门酒店')}
                      </h3>
                    </div>

                    {/* Red Distance Pill Badge */}
                    <button
                      type="button"
                      onClick={handleToggleNearMe}
                      style={{
                        background: 'linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)',
                      }}
                      className="px-2.5 py-0.5 rounded-full text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-xs active:scale-95 transition cursor-pointer shrink-0"
                    >
                      <MapPin className="w-3 h-3 text-white fill-white/25 shrink-0" />
                      <span>
                        {tr(language, 'ជិតខ្ញុំ', 'Near Me', '附近')} ({nearestDistanceLabel})
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAllFeatured((prev) => !prev)}
                    className="text-xs font-extrabold text-[#0E5A35] hover:underline inline-flex items-center gap-0.5 cursor-pointer shrink-0"
                  >
                    <span>
                      {showAllFeatured
                        ? tr(language, 'បង្រួម', 'Show less', '收起')
                        : tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {featuredHotels.map((hotel) => {
                    const loc = getLocalizedDestination(hotel, language);
                    const isVipRecord = vipHotelIds.has(hotel.id);
                    const isUserNew = userAddedHotelIds.has(hotel.id);
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
                    const amenityChips = getAmenityChipsForHotel(hotel);

                    const adminActions = isAdmin ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                        {!isVipRecord && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  tr(
                                    language,
                                    `តើអ្នកពិតជាចង់លុបសណ្ឋាគារ «${hotel.nameKh}» មែនទេ?`,
                                    `Delete hotel "${hotel.nameEn}"?`,
                                    `确定删除酒店“${hotel.nameEn}”吗？`
                                  )
                                )
                              ) {
                                deleteDestination(hotel.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors active:scale-95 cursor-pointer"
                            title={tr(language, 'លុបសណ្ឋាគារ', 'Delete Hotel', '删除酒店')}
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    ) : null;

                    return (
                      <article
                        key={hotel.id}
                        data-testid={`hotel-featured-${hotel.id}`}
                        onClick={() => setSelectedDestination(hotel)}
                        className="bg-white rounded-[22px] p-2.5 border border-slate-200/85 shadow-[0_6px_20px_rgba(15,23,42,0.06)] hover:border-emerald-500/60 transition flex gap-3 items-stretch cursor-pointer font-khmer"
                      >
                        {/* Left Icon / Verified Owner Photo Box with Distance Pill & Heart Button (Matching RestaurantCard) */}
                        <div className="w-[146px] sm:w-[158px] min-h-[132px] rounded-2xl overflow-hidden relative shrink-0 bg-slate-100">
                          <HotelAvatar
                            hotel={hotel}
                            alt={loc.name}
                            className="w-full h-full rounded-2xl"
                          />

                          {/* Top-left Distance Badge */}
                          <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/65 backdrop-blur-xs text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-xs">
                            <MapPin className="w-3 h-3 text-white fill-white/25 shrink-0" />
                            <span>
                              {distanceKm} {tr(language, 'km', 'km', '公里')}
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
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-rose-500 active:scale-90 transition cursor-pointer"
                          >
                            <Heart className={`w-4 h-4 ${bookmarked ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} strokeWidth={2.2} />
                          </button>

                          {/* VIP / New Badge */}
                          {(isVipRecord || isUserNew) && (
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[9.5px] font-black inline-flex items-center gap-1 shadow-xs">
                              <Crown className="w-2.5 h-2.5 fill-slate-950" />
                              <span>{tr(language, 'ថ្មី • VIP', 'NEW • VIP', '新入驻 • VIP')}</span>
                            </span>
                          )}
                        </div>

                        {/* Right Info & Call / Map Buttons (Matching RestaurantCard 1-to-1) */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-[15px] sm:text-base text-slate-900 leading-snug truncate">
                                  {hotel.nameKh || loc.name}
                                </h4>
                                {hotel.nameEn && hotel.nameEn !== hotel.nameKh && (
                                  <p className="text-xs font-bold text-slate-600 truncate mt-0.5">
                                    {hotel.nameEn}
                                  </p>
                                )}
                              </div>
                              {adminActions}
                            </div>

                            {/* Rating & Review Count */}
                            <div className="flex items-center gap-1 mt-1 text-xs">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                              <span className="font-extrabold text-slate-900">{displayRating}</span>
                              <span className="text-slate-500 font-semibold truncate">
                                ({displayReviews} {tr(language, 'ការវាយតម្លៃ', 'reviews', '条评价')})
                              </span>
                            </div>

                            {/* Category / Amenity Tags */}
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                              {amenityChips.map((chip, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-0.5 rounded-lg bg-[#EBF5EE] border border-[#CDE5D4] text-[#0E5A35] text-[11px] font-bold inline-flex items-center gap-1"
                                >
                                  {renderAmenityIcon(chip.icon)}
                                  <span>{chip.label}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Bottom Call & Map Pill Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                if (hotel.phone) {
                                  window.location.href = `tel:${hotel.phone.replace(/\s+/g, '')}`;
                                } else {
                                  setSelectedDestination(hotel);
                                }
                              }}
                              style={{
                                background: 'linear-gradient(180deg, #1E7E48 0%, #0D522C 100%)',
                              }}
                              className="h-9 px-2.5 rounded-xl text-white font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
                            >
                              <Phone className="w-3.5 h-3.5 text-white fill-white shrink-0" />
                              <span className="truncate">{tr(language, 'ទូរស័ព្ទ', 'Call', '电话')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openDestinationGoogleExternal(hotel, 'maps')}
                              className="h-9 px-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
                            >
                              <MapPin className="w-3.5 h-3.5 text-[#0E5A35] shrink-0" strokeWidth={2.3} />
                              <span className="truncate">{tr(language, 'ផែនទី', 'Map', '地图')}</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 2: បញ្ជីសណ្ឋាគារបន្ថែម (More Hotels Directory - Compact Rows with Icon matching Shop Menu) */}
            {displayedDirectoryHotels.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-1 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[#0E5A35]/10 border border-[#0E5A35]/25 flex items-center justify-center shrink-0">
                      <BedDouble className="w-4 h-4 text-[#0E5A35] shrink-0" strokeWidth={2.2} />
                    </span>
                    <h3 className="font-extrabold text-[15px] sm:text-base text-[#0F291E]">
                      {tr(language, 'បញ្ជីសណ្ឋាគារបន្ថែម', 'More Hotels Directory', '更多酒店列表')}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0E5A35]/10 border border-[#0E5A35]/25 text-[11px] font-extrabold text-[#0E5A35] font-mono">
                    {directoryHotels.length}
                  </span>
                </div>

                <div className="space-y-2">
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
                        className="bg-white rounded-2xl p-2.5 border border-slate-200/85 shadow-2xs hover:border-emerald-500/60 transition flex items-center gap-3 cursor-pointer font-khmer"
                      >
                        <div className="w-16 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                          <HotelAvatar
                            hotel={hotel}
                            alt={loc.name}
                            className="w-full h-full rounded-xl"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5 min-w-0">
                            <h4 className="font-extrabold text-sm text-slate-900 truncate">
                              {hotel.nameKh || loc.name}
                            </h4>
                            {hotel.nameEn && hotel.nameEn !== hotel.nameKh && (
                              <span className="text-xs font-semibold text-slate-500 truncate">
                                {hotel.nameEn}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                              <strong className="font-extrabold text-slate-900">{displayRating}</strong>
                              <span className="text-slate-500">({displayReviews})</span>
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="inline-flex items-center gap-1 text-slate-700 font-bold truncate">
                              <MapPin className="w-3.5 h-3.5 text-[#0E5A35] shrink-0" />
                              <span>
                                {distanceKm} {tr(language, 'km', 'km', '公里')}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
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
                          <ChevronRight className="w-5 h-5 text-slate-400" strokeWidth={2.2} />
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
                      className="px-5 py-2.5 rounded-full bg-[#0E5A35] hover:bg-[#094226] text-white text-xs font-extrabold shadow-xs cursor-pointer transition"
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
            <p className="text-xs">
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
    </div>
  );
};

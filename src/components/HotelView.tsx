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
  isShopSubscriptionActive,
} from '../types';
import { shuffleForCurrentSession } from '../utils/sessionShuffle';
import {
  BedDouble,
  Edit2,
  Settings,
  MapPin,
  Heart,
  Lock,
  Camera,
  Star,
  Trash2,
  Download,
  Search,
  Mic,
  Bell,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Phone,
  Crown,
  Home,
  Building2,
  Utensils,
  Plus,
  X,
  Calendar,
  Check,
} from 'lucide-react';
import { TouristImageModal } from './TouristImageModal';
import { rankBySearchRelevance, destinationSearchFields, analyzeSearchQuery } from '../utils/searchEngine';
import { parseSmartSearchIntent } from '../utils/aiSearchBridge';
import { DISH_PROVINCES } from '../utils/foodFilters';
import { tr } from '../utils/i18n';
import { getLocalizedDestination } from '../utils/zhDynamicTranslator';

const HOTEL_BATCH_SIZE = 36;

const FALLBACK_HOTEL_PHOTOS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=80',
];

function getDeterministicHash(id: string): number {
  let hash = 0;
  const str = String(id || 'hotel');
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getHotelCoverPhoto(hotel: TouristDestination): string {
  const raw = (hotel.photoUrl || '').trim();
  if (
    raw &&
    !raw.startsWith('/destinations/hotel-') &&
    !raw.includes('places.googleapis.com')
  ) {
    return raw;
  }
  const idx = getDeterministicHash(hotel.id) % FALLBACK_HOTEL_PHOTOS.length;
  return FALLBACK_HOTEL_PHOTOS[idx];
}

function getDeterministicDistanceKm(id: string): number {
  const hash = getDeterministicHash(id);
  const steps = (hash % 38) + 6; // 0.6 to 4.3 km
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
    !Number.isFinite(lon2)
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

export const HotelView: React.FC = () => {
  const {
    destinations,
    restaurants,
    language,
    setLanguage,
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
  }, [selectedProvince, categoryFilter, hotelSearchQuery]);

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

  // Convert any VIP-added Hotel records (from `restaurants` where `isHotelBusinessRecord(r)`) into TouristDestination format so they appear first as Verified Big Cards
  const vipAddedHotelDestinations = useMemo<TouristDestination[]>(() => {
    return restaurants
      .filter(
        (r: Restaurant) =>
          r &&
          isHotelBusinessRecord(r) &&
          (r.status === 'approved' || isAdmin || r.ownerId === currentUser?.id)
      )
      .map((r: Restaurant) => {
        const catInfo = inferBusinessTypeAndCategory(r);
        return {
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
          rating: r.rating || 0,
          reviewCount: r.reviewCount || 0,
          highlightsKh: r.signatureDishesKh?.length
            ? r.signatureDishesKh
            : ['បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ Wi-Fi និងចំណតរថយន្តសុវត្ថិភាព'],
          isFeatured: true,
          isCustomPhoto: Boolean(r.profileImage || r.photoUrl),
          locationVerificationStatus: 'verified' as const,
        };
      });
  }, [restaurants, isAdmin, currentUser?.id]);

  // Combine VIP-added hotels + seed/admin hotels from `destinations` (where categorySlug === 'hotel')
  const allHotels = useMemo<TouristDestination[]>(() => {
    const seedHotels = destinations.filter((d) => Boolean(d && d.categorySlug === 'hotel'));
    const customIds = new Set(vipAddedHotelDestinations.map((d) => d.id));
    const activeVipHotels = vipAddedHotelDestinations.filter((d) =>
      restaurants.some(
        (r) =>
          r.id === d.id &&
          r.status === 'approved' &&
          (isShopSubscriptionActive(r) || Boolean(r.isAdminEdited && r.membershipTier === 'premium'))
      )
    );
    const nonVipCustomHotels = vipAddedHotelDestinations.filter(
      (d) => !activeVipHotels.some((v) => v.id === d.id)
    );
    return [...activeVipHotels, ...seedHotels.filter((d) => !customIds.has(d.id)), ...nonVipCustomHotels];
  }, [destinations, vipAddedHotelDestinations, restaurants]);

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

  // Only hotels with an active Paid Shop/Hotel Package (or explicitly promoted by Admin) get Featured Big Card + Gold VIP Badge.
  const vipHotelIds = useMemo(
    () =>
      new Set(
        restaurants
          .filter(
            (r: Restaurant) =>
              r &&
              isHotelBusinessRecord(r) &&
              r.status === 'approved' &&
              (isShopSubscriptionActive(r) || Boolean(r.isAdminEdited && r.membershipTier === 'premium'))
          )
          .map((r) => r.id)
      ),
    [restaurants]
  );
  const isVerifiedBigHotel = (h: TouristDestination): boolean =>
    vipHotelIds.has(h.id) || Boolean(h.isAdminEdited && h.isFeatured);

  const hotelCategoryPills = [
    {
      id: 'all',
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
      nameKh: 'តំបន់ប្រភេទផ្សេងៗ',
      nameEn: 'Other Stays',
      nameZh: '其他类型',
      icon: 'building' as const,
    },
  ];

  // Filter by category first so the 25-Province Dropdown shows accurate counts for the active category
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

  // Order: Verified Big Hotels first (shuffled in session), then other Hotels (shuffled in session)
  const orderedHotels = useMemo(() => {
    const verifiedBig = allHotels.filter((h) => isVerifiedBigHotel(h));
    const compactRows = allHotels.filter((h) => !isVerifiedBigHotel(h));
    return [
      ...shuffleForCurrentSession(verifiedBig),
      ...shuffleForCurrentSession(compactRows),
    ];
  }, [allHotels]);

  const filteredHotels = useMemo(() => {
    const trimmedQ = debouncedSearchQuery.trim();
    const smartIntent = trimmedQ ? parseSmartSearchIntent(trimmedQ) : null;
    const normSelProv =
      selectedProvince && selectedProvince !== 'ទាំងអស់' && selectedProvince.toLowerCase() !== 'all'
        ? selectedProvince
        : '';
    const effectiveProvRaw = normSelProv || smartIntent?.detectedProvinceKh || '';
    const cleanSelProv = effectiveProvRaw.replace(/^រាជធានី|^ខេត្ត/g, '').trim();

    const scoped = orderedHotels.filter((h) => {
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
      return true;
    });

    if (!trimmedQ) return scoped;

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
          (b.rating || 0) - (a.rating || 0) ||
          (a.nameEn || a.nameKh || '').localeCompare(b.nameEn || b.nameKh || ''),
      }
    );
  }, [orderedHotels, categoryFilter, selectedProvince, debouncedSearchQuery]);

  const displayedHotels = useMemo(
    () => filteredHotels.slice(0, visibleCount),
    [filteredHotels, visibleCount]
  );

  useEffect(() => {
    const node = loadMoreTriggerRef.current;
    if (!node || visibleCount >= filteredHotels.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(filteredHotels.length, prev + HOTEL_BATCH_SIZE));
        }
      },
      { root: document.getElementById('kft-main-scroll'), rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, filteredHotels.length]);

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

  const selectedProvinceDisplay = useMemo(() => {
    if (!selectedProvince || selectedProvince === 'ទាំងអស់' || selectedProvince.toLowerCase() === 'all') {
      return tr(
        language,
        'គ្រប់រាជធានី-ខេត្តទាំង ២៥ (25 Provinces)',
        'All 25 Provinces & Capital',
        '全部 25 个省市'
      );
    }
    const found = provinceOptions.find((p) => p.value === selectedProvince);
    if (found) {
      return tr(language, found.fullKh, found.en, found.zh);
    }
    return selectedProvince;
  }, [selectedProvince, provinceOptions, language]);

  const getAmenityChipsForHotel = (hotel: TouristDestination) => {
    const subCat = classifyHotelSubCategory(hotel);
    if (subCat === 'luxury_resort') {
      return [
        { icon: 'palm', label: tr(language, 'រីសត', 'Resort', '度假村') },
        { icon: 'lotus', label: tr(language, 'ស្ប៉ា', 'Spa', '水疗') },
        { icon: 'pool', label: tr(language, 'អាងហែលទឹក', 'Pool', '泳池') },
      ];
    }
    if (subCat === 'guesthouse') {
      return [
        { icon: 'home', label: tr(language, 'ផ្ទះស្នាក់នៅ', 'Guesthouse', '客栈') },
        { icon: 'lotus', label: tr(language, 'ស្អាត & សុវត្ថិភាព', 'Clean & Safe', '干净安全') },
        { icon: 'dining', label: tr(language, 'អាហារដ្ឋាន', 'Dining', '餐饮') },
      ];
    }
    if (subCat === 'boutique_villa') {
      return [
        { icon: 'building', label: tr(language, 'វីឡា/ប៊ូទិក', 'Boutique', '精品别墅') },
        { icon: 'lotus', label: tr(language, 'ស្ប៉ា', 'Spa', '水疗') },
        { icon: 'pool', label: tr(language, 'អាងហែលទឹក', 'Pool', '泳池') },
      ];
    }
    return [
      { icon: 'bed', label: tr(language, 'សណ្ឋាគារ', 'Hotel', '酒店') },
      { icon: 'lotus', label: tr(language, 'ស្ប៉ា', 'Spa', '水疗') },
      { icon: 'dining', label: tr(language, 'ភោជនីយដ្ឋាន', 'Restaurant', '餐厅') },
    ];
  };

  const renderAmenityIcon = (type: string) => {
    if (type === 'palm') {
      return (
        <svg className="w-3 h-3 text-[#0B5B3E] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4" />
          <path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3" />
          <path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35z" />
          <path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14" />
        </svg>
      );
    }
    if (type === 'lotus') {
      return (
        <svg className="w-3 h-3 text-[#0B5B3E] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3c2.5 3.5 3.5 7 0 11-3.5-4-2.5-7.5 0-11z" />
          <path d="M12 14c3-2.5 6.5-3 9-1-1.5 3.5-4.5 5.5-9 5.5S4.5 16.5 3 13c2.5-2 6-1.5 9 1z" />
        </svg>
      );
    }
    if (type === 'pool') {
      return (
        <svg className="w-3 h-3 text-[#0B5B3E] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 16c1.5 1 3.5 1 5 0s3.5-1 5 0 3.5 1 5 0 3.5-1 5 0" />
          <path d="M2 20c1.5 1 3.5 1 5 0s3.5-1 5 0 3.5 1 5 0 3.5-1 5 0" />
          <circle cx="9" cy="7" r="2" />
          <path d="M6 12l3-2 3 2 3-2" />
        </svg>
      );
    }
    if (type === 'dining') {
      return <Utensils className="w-3 h-3 text-[#0B5B3E] shrink-0" strokeWidth={2.2} />;
    }
    if (type === 'home') {
      return <Home className="w-3 h-3 text-[#0B5B3E] shrink-0" strokeWidth={2.2} />;
    }
    if (type === 'building') {
      return <Building2 className="w-3 h-3 text-[#0B5B3E] shrink-0" strokeWidth={2.2} />;
    }
    return <BedDouble className="w-3 h-3 text-[#0B5B3E] shrink-0" strokeWidth={2.2} />;
  };

  return (
    <div className="min-h-screen bg-[#F3F5F3] text-slate-900 pb-10">
      {/* =====================================================================
          1. TOP EMERALD & ANGKOR WAT HERO HEADER (Matching OK.jpg / Reference Top Design)
          ===================================================================== */}
      <div
        className="relative w-full overflow-hidden pt-2.5 pb-6 px-3.5 select-none max-w-md mx-auto"
        style={{
          background: 'linear-gradient(135deg, #063822 0%, #0A4D31 48%, #12613E 100%)',
          paddingTop: 'calc(var(--kft-safe-top, 0px) + 10px)',
        }}
      >
        {/* Right-side Angkor Wat Temple & Palm Trees Photo Backdrop */}
        <img
          src="/welcome/angkor-lotus-hero.png"
          alt="Angkor Wat Cambodia"
          decoding="async"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (!img.dataset.fallback) {
              img.dataset.fallback = '1';
              img.src = '/welcome/angkor-sunrise-hero.png';
            }
          }}
          className="absolute right-0 top-0 h-full w-[66%] object-cover object-top opacity-80 pointer-events-none"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, #073D26 0%, #09482E 38%, rgba(11,79,51,0.62) 66%, rgba(8,61,38,0.28) 100%)',
          }}
        />

        {/* Row 1: Gold-Framed App Logo + Brand Title + Right Notification & Profile Icons */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl p-[2px] bg-gradient-to-b from-[#FDE047] via-[#D4AF37] to-[#9A6F1A] shadow-md shrink-0">
              <img
                src="/app-logo-v200.png"
                alt="Cambodia Flavors & Tourism"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = '1';
                    img.src = '/app-icon.png';
                  }
                }}
                className="w-full h-full rounded-[9px] object-cover bg-[#064E3B]"
              />
            </div>
            <div className="min-w-0">
              <h1
                className="font-moul text-[13.5px] sm:text-sm text-white leading-tight truncate"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}
              >
                {tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨美食与旅游')}
              </h1>
              <p
                className="text-[11px] font-bold text-white/95 truncate"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.45)' }}
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
              className="relative w-9 h-9 rounded-full bg-[#135E3B]/85 hover:bg-[#135E3B] border border-white/30 text-white flex items-center justify-center backdrop-blur-xs active:scale-95 transition cursor-pointer shadow-xs"
            >
              <Bell className="w-4 h-4 text-white" strokeWidth={2.2} />
              <span className="absolute top-1 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#0C5536]" />
            </button>

            {/* Profile / Account Button (Clean White User Silhouette matching OK.jpg) */}
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
              className="w-9 h-9 rounded-full bg-[#135E3B]/85 hover:bg-[#135E3B] border border-white/30 text-white flex items-center justify-center overflow-hidden backdrop-blur-xs active:scale-95 transition cursor-pointer shadow-xs"
            >
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="9" r="3.6" />
                <path d="M5.5 19.2c1.2-3.1 3.6-4.7 6.5-4.7s5.3 1.6 6.5 4.7a7.8 7.8 0 0 1-13 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Row 2: Hotel Icon + Page Heading directly on the Emerald-to-Angkor Hero Backdrop */}
        <div className="relative z-10 mt-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg
              className="w-9 h-9 text-white shrink-0 drop-shadow-xs"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 4v16" />
              <path d="M2 8h18a2 2 0 0 1 2 2v10" />
              <path d="M2 17h20" />
              <path d="M6 8v9" />
            </svg>
            <div className="min-w-0">
              <h2
                className="font-extrabold text-[17px] sm:text-[18px] text-white leading-tight truncate font-khmer"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}
              >
                {tr(
                  language,
                  'សណ្ឋាគារ និងផ្ទះស្នាក់នៅ',
                  'Hotels & Stays in Cambodia',
                  '柬埔寨酒店与客栈'
                )}
              </h2>
              <p
                className="text-xs font-semibold text-emerald-50/95 truncate"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
              >
                Hotels &amp; Stays
              </p>
            </div>
          </div>
        </div>

        {/* Row 3: White Pill Search Input + Green "នៅជិតខ្ញុំ" Near Me Pill Button */}
        <div className="relative z-10 mt-3 flex items-center gap-2">
          <div className="flex-1 min-w-0 h-11 rounded-full bg-white shadow-md flex items-center pl-3.5 pr-2.5 gap-2 border border-white">
            <Search className="w-5 h-5 text-slate-800 shrink-0" strokeWidth={2.3} />
            <input
              ref={searchInputRef}
              type="text"
              value={hotelSearchQuery}
              onChange={(e) => setHotelSearchQuery(e.target.value)}
              placeholder={tr(
                language,
                'ស្វែងរកសណ្ឋាគារ, ផ្ទះស្នាក់នៅ, ទីតាំង...',
                'Search hotels, guesthouses, locations...',
                '搜索酒店、客栈、位置...'
              )}
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-[13px] font-bold text-slate-900 placeholder-slate-400 focus:outline-none truncate font-khmer"
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
              className="p-1 text-[#0E6442] hover:text-[#08422A] shrink-0 cursor-pointer"
              title={tr(language, 'ស្វែងរកដោយសំឡេង', 'Voice Search', '语音搜索')}
            >
              <Mic className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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
            }}
            className="h-11 px-3.5 rounded-full font-extrabold text-xs inline-flex items-center gap-1.5 shrink-0 shadow-md border-[1.5px] bg-[#135E3B] hover:bg-[#0F4D30] text-white border-emerald-300/70 transition active:scale-95 cursor-pointer font-khmer"
          >
            <MapPin className="w-4 h-4 shrink-0 text-white fill-white/20" strokeWidth={2.2} />
            <span>{tr(language, 'នៅជិតខ្ញុំ', 'Near Me', '附近')}</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MAIN LIGHT ROUNDED SHEET
          ===================================================================== */}
      <div className="relative z-10 -mt-3 rounded-t-[24px] bg-[#F3F5F3] px-3.5 pt-3.5 space-y-3 max-w-md mx-auto">
        {/* 5 Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {hotelCategoryPills.map((pill) => {
            const active = categoryFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setCategoryFilter(pill.id)}
                className={`h-9 px-3.5 rounded-full text-xs font-extrabold font-khmer inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  active
                    ? 'bg-[#0B5B3E] text-white shadow-xs'
                    : 'bg-white text-slate-800 border border-slate-200/90 hover:border-emerald-700/40'
                }`}
              >
                {pill.icon === 'bed' && (
                  <BedDouble className={`w-4 h-4 ${active ? 'text-white' : 'text-[#0B5B3E]'}`} strokeWidth={2.2} />
                )}
                {pill.icon === 'crown' && (
                  <Crown className={`w-4 h-4 ${active ? 'text-[#FDE047]' : 'text-[#0B5B3E]'}`} strokeWidth={2.2} />
                )}
                {pill.icon === 'home' && (
                  <Home className={`w-4 h-4 ${active ? 'text-white' : 'text-[#0B5B3E]'}`} strokeWidth={2.2} />
                )}
                {pill.icon === 'palm' && (
                  <svg
                    className={`w-4 h-4 ${active ? 'text-white' : 'text-[#0B5B3E]'}`}
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
                  <Building2 className={`w-4 h-4 ${active ? 'text-white' : 'text-[#0B5B3E]'}`} strokeWidth={2.2} />
                )}
                <span>{tr(language, pill.nameKh, pill.nameEn, pill.nameZh)}</span>
              </button>
            );
          })}
        </div>

        {/* Province Selector Card */}
        <label className="relative block bg-white rounded-2xl border border-slate-200/90 px-3.5 py-2 shadow-2xs cursor-pointer">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <MapPin className="w-5 h-5 text-[#0B5B3E] shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-slate-500 font-khmer leading-tight">
                  {tr(language, 'ជ្រើសរើសខេត្ត/ក្រុង', 'Select Province / City', '选择省份/城市')}
                </div>
                <div className="text-[13px] font-extrabold text-slate-900 font-khmer leading-tight truncate mt-0.5">
                  {selectedProvinceDisplay}
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" strokeWidth={2.2} />
          </div>
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            aria-label={tr(language, 'ជ្រើសរើសខេត្ត/ក្រុង', 'Select Province / City', '选择省份/城市')}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            <option value="">
              {tr(
                language,
                'គ្រប់រាជធានី-ខេត្តទាំង ២៥',
                'All 25 Provinces & Capital',
                '全部 25 个省市'
              )}
            </option>
            {provinceOptions.map((p) => (
              <option key={p.id} value={p.value}>
                {tr(language, p.fullKh, p.en, p.zh)}
              </option>
            ))}
          </select>
        </label>

        {/* =====================================================================
            HOTEL REGISTRATION BANNER (Matching Reference Image 1: 1-to-1)
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
              <div className="relative z-10 w-full pl-[41%] pr-3.5 py-2.5 space-y-1.5">
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
            POPULAR HOTELS SECTION HEADER
            ===================================================================== */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#0B5B3E] text-white flex items-center justify-center shadow-2xs">
              <Building2 className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <h3 className="text-[16px] font-extrabold text-[#0F2942] font-khmer">
              {tr(language, 'សណ្ឋាគារពេញនិយម', 'Popular Hotels', '热门酒店')}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              setCategoryFilter('all');
              setSelectedProvince('');
              setHotelSearchQuery('');
              setVisibleCount((prev) => Math.max(prev, HOTEL_BATCH_SIZE * 2));
            }}
            className="text-xs font-extrabold text-[#0B5B3E] hover:underline font-khmer inline-flex items-center gap-0.5 cursor-pointer"
          >
            <span>{tr(language, 'មើលទាំងអស់', 'See All', '查看全部')}</span>
            <ChevronRight className="w-4 h-4" strokeWidth={2.4} />
          </button>
        </div>

        {/* =====================================================================
            HORIZONTAL HOTEL CARDS LIST
            ===================================================================== */}
        <div className="space-y-2.5">
          {displayedHotels.length > 0 ? (
            <>
              {displayedHotels.map((hotel) => {
                const loc = getLocalizedDestination(hotel, language);
                const isBig = isVerifiedBigHotel(hotel);
                const isVipRecord = vipHotelIds.has(hotel.id);
                const bookmarked = isBookmarked(hotel.id);
                const coverPhotoUrl = getHotelCoverPhoto(hotel);

                const hash = getDeterministicHash(hotel.id);
                const displayRating =
                  hotel.rating && hotel.rating > 0
                    ? Number(hotel.rating).toFixed(1)
                    : (4.6 + (hash % 4) * 0.1).toFixed(1);
                const displayReviews =
                  hotel.reviewCount && hotel.reviewCount > 0
                    ? hotel.reviewCount
                    : 95 + (hash % 210);

                const liveDist = userCoords
                  ? calculateDistanceKm(userCoords.lat, userCoords.lng, hotel.latitude, hotel.longitude)
                  : null;
                const distanceKm = liveDist !== null ? liveDist : getDeterministicDistanceKm(hotel.id);
                const cleanProv = (loc.province || hotel.provinceKh || '')
                  .replace(/^រាជធានី|^ខេត្ត/g, '')
                  .trim();
                const amenityChips = getAmenityChipsForHotel(hotel);

                const adminEditButton = isAdmin ? (
                  <div
                    className="absolute bottom-1.5 left-1.5 z-20 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isVipRecord && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHotelForImageEdit(hotel);
                          }}
                          className="p-1 rounded-md bg-[#064E3B]/90 hover:bg-emerald-800 text-white transition-colors active:scale-95 cursor-pointer"
                          title={tr(language, 'ប្តូររូបភាពសណ្ឋាគារ', 'Upload / Change Hotel Photo', '更换酒店图片')}
                        >
                          <Camera className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextFeatured = !(hotel.isAdminEdited && hotel.isFeatured);
                            updateDestination({
                              ...hotel,
                              isFeatured: nextFeatured,
                              isAdminEdited: true,
                            });
                            showToast(
                              nextFeatured
                                ? tr(
                                    language,
                                    `បានដាក់ «${hotel.nameKh}» ជាសណ្ឋាគារ VIP`,
                                    `Set "${hotel.nameEn}" as Featured VIP`,
                                    `已设为 VIP 推荐酒店`
                                  )
                                : tr(
                                    language,
                                    `បានដក «${hotel.nameKh}» ពីសណ្ឋាគារ VIP`,
                                    `Removed "${hotel.nameEn}" from Featured VIP`,
                                    `已取消 VIP 推荐`
                                  ),
                              'success'
                            );
                          }}
                          className={`p-1 rounded-md transition-colors active:scale-95 cursor-pointer ${
                            hotel.isAdminEdited && hotel.isFeatured
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-black/60 text-white hover:bg-amber-400 hover:text-slate-950'
                          }`}
                          title={tr(language, 'ប្តូរទំហំកាត VIP', 'Toggle VIP Featured', '切换 VIP 推荐')}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${hotel.isAdminEdited && hotel.isFeatured ? 'fill-current' : ''}`}
                            strokeWidth={2}
                          />
                        </button>
                      </>
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
                      className="p-1 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors active:scale-95 cursor-pointer"
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
                        className="p-1 rounded-md bg-rose-600/90 hover:bg-rose-600 text-white transition-colors active:scale-95 cursor-pointer"
                        title={tr(language, 'លុបសណ្ឋាគារ', 'Delete Hotel', '删除酒店')}
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                ) : null;

                return (
                  <div
                    key={hotel.id}
                    data-testid={isBig ? `hotel-featured-${hotel.id}` : `hotel-row-${hotel.id}`}
                    onClick={() => setSelectedDestination(hotel)}
                    className="bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex gap-3 items-stretch cursor-pointer"
                  >
                    {/* Left Hotel Thumbnail */}
                    <div className="w-[126px] sm:w-[140px] min-h-[120px] rounded-xl overflow-hidden relative shrink-0 bg-slate-100">
                      <img
                        src={coverPhotoUrl}
                        alt={loc.name}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = FALLBACK_HOTEL_PHOTOS[0];
                          if (target.src !== fallback) {
                            target.src = fallback;
                          }
                        }}
                        className="w-full h-full object-cover"
                      />

                      {isBig && (
                        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FDE047] to-[#F59E0B] text-slate-950 text-[9.5px] font-extrabold font-khmer inline-flex items-center gap-1 shadow-xs">
                          <Crown className="w-2.5 h-2.5 fill-slate-950" strokeWidth={2.2} />
                          <span>VIP</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(hotel.id);
                        }}
                        className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer backdrop-blur-xs ${
                          bookmarked
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'bg-black/45 text-white hover:bg-black/65'
                        }`}
                        title={tr(language, 'រក្សាទុក', 'Save', '收藏')}
                      >
                        <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} strokeWidth={2.2} />
                      </button>

                      {adminEditButton}
                    </div>

                    {/* Right Hotel Info & Action Buttons */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      {/* Title & Subtitle */}
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-[14px] sm:text-[15px] font-extrabold text-[#0F2942] font-khmer leading-snug truncate">
                            {hotel.nameKh || loc.name}
                          </h4>
                          <ChevronRight className="w-4 h-4 text-[#0B5B3E] shrink-0 mt-0.5" strokeWidth={2.4} />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600 leading-tight truncate mt-0.5">
                          {hotel.nameEn || loc.name}
                        </p>
                      </div>

                      {/* Bottom Split: Left Metadata + Right Call/Map Pills */}
                      <div className="flex items-end justify-between gap-2 mt-1.5">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          {/* Rating Line */}
                          <div className="flex items-center gap-1 text-[11px] leading-none">
                            <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B] shrink-0" strokeWidth={2} />
                            <span className="font-extrabold text-slate-900">{displayRating}</span>
                            <span className="text-slate-500 font-khmer truncate">
                              ({displayReviews} {tr(language, 'ការវាយតម្លៃ', 'reviews', '条评价')})
                            </span>
                          </div>

                          {/* Amenity Chips */}
                          <div className="flex flex-wrap items-center gap-1">
                            {amenityChips.map((chip, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded-md bg-[#EBF3EE] text-[#0B5B3E] text-[9.5px] font-bold font-khmer inline-flex items-center gap-1 leading-tight"
                              >
                                {renderAmenityIcon(chip.icon)}
                                <span>{chip.label}</span>
                              </span>
                            ))}
                          </div>

                          {/* Province & Distance Line */}
                          <div className="flex items-center gap-1 text-[10.5px] font-semibold text-slate-600 font-khmer truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#0B5B3E] shrink-0" strokeWidth={2.2} />
                            <span className="truncate">
                              {cleanProv} • {distanceKm} {tr(language, 'គីឡូម៉ែត្រ', 'km', '公里')}
                            </span>
                          </div>
                        </div>

                        {/* Right Call & Map Buttons */}
                        <div
                          className="shrink-0 flex flex-col gap-1.5 w-[84px] sm:w-[92px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (hotel.phone) {
                                window.location.href = `tel:${hotel.phone.replace(/\s+/g, '')}`;
                              } else {
                                setSelectedDestination(hotel);
                              }
                            }}
                            className="h-7 rounded-full bg-[#0B5B3E] hover:bg-[#084730] text-white font-bold text-[11px] font-khmer flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-transform"
                          >
                            <Phone className="w-3 h-3 fill-current" strokeWidth={2.2} />
                            <span>{tr(language, 'ទូរស័ព្ទ', 'Call', '电话')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openDestinationGoogleExternal(hotel, 'maps')}
                            className="h-7 rounded-full bg-white hover:bg-slate-50 text-[#0F2942] border border-slate-300 font-bold text-[11px] font-khmer flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform"
                          >
                            <MapPin className="w-3 h-3 text-[#0B5B3E]" strokeWidth={2.3} />
                            <span>{tr(language, 'ផែនទី', 'Map', '地图')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {visibleCount < filteredHotels.length && (
                <div ref={loadMoreTriggerRef} className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((prev) => Math.min(filteredHotels.length, prev + HOTEL_BATCH_SIZE))
                    }
                    className="px-5 py-2 rounded-full bg-white border border-slate-200 text-xs font-extrabold text-[#0B5B3E] font-khmer shadow-2xs cursor-pointer hover:bg-emerald-50"
                  >
                    {tr(language, 'បង្ហាញសណ្ឋាគារបន្ថែម', 'Show More Hotels', '加载更多酒店')}
                  </button>
                </div>
              )}
            </>
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0B5B3E] text-white text-xs font-bold cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {tr(language, 'ស្វែងរកនៅលើ Google Maps', 'Search on Google Maps', '在 Google 地图中搜索')}
                </button>
              )}
            </div>
          )}
        </div>
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

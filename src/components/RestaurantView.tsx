import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RestaurantCard } from './RestaurantCard';
import {
  Restaurant,
  sortRestaurantsWithVipRotation,
  isAdminAccount,
  isStrictVerifiedCambodiaRestaurant,
  openExternalUrlNativeSafe,
  isHotelBusinessRecord,
} from '../types';
import { shuffleForCurrentSession } from '../utils/sessionShuffle';
import {
  Store,
  Edit2,
  Settings,
  MapPin,
  Search,
  Bell,
  Mic,
  X,
  LayoutGrid,
  Utensils,
  Coffee,
  CupSoda,
  Sandwich,
  ChevronDown,
  Star,
  SlidersHorizontal,
  Plus,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { isVipOwnerListing } from './listing/ListingUI';
import { normalizeKhmerSearchText } from '../services/googlePlacesService';
import { analyzeSearchQuery, scoreSearchRecord, restaurantSearchFields } from '../utils/searchEngine';
import { tr, translateProvince } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { matchShopToProductQuery, verifyShopDataForDisplay } from '../utils/foodFilters';
import { parseSmartSearchIntent } from '../utils/aiSearchBridge';
import { resolveUserAvatarUrl, handleAvatarImageError } from '../utils/avatarHelper';

const RESTAURANT_BATCH_SIZE = 40;

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const RestaurantView: React.FC = () => {
  const {
    restaurants,
    users,
    appSettings,
    language,
    selectedProvince,
    setSelectedProvince,
    setIsVipAddRestaurantModalOpen,
    currentUser,
    setIsAuthModalOpen,
    activeManagedShopId,
    setActiveManagedShopId,
    getOwnedRestaurantsForUser,
    getCurrentUserStoreQuota,
    openManageMyVipStore,
    setIsAdminOpen,
    setIsRestaurantCheckInModalOpen,
    openGoogleMapsSearchModal,
    setIsNotificationsModalOpen,
    unreadNotificationsCount,
    setActiveTab,
    showToast,
  } = useApp();

  const isAdmin = isAdminAccount(currentUser);
  const storeQuota = getCurrentUserStoreQuota(currentUser);

  const myOwnedRestaurants = useMemo(
    () => getOwnedRestaurantsForUser(currentUser),
    [restaurants, currentUser, activeManagedShopId]
  );
  const myExistingRest = useMemo(
    () =>
      (activeManagedShopId && myOwnedRestaurants.find((r) => r.id === activeManagedShopId)) ||
      myOwnedRestaurants[0],
    [myOwnedRestaurants, activeManagedShopId]
  );

  const [priceFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cuisineFilter, setCuisineFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | '4.5' | '4.0'>('all');
  const [sortMode, setSortMode] = useState<'popular' | 'nearest' | 'rating'>('popular');
  const [nearMeActive, setNearMeActive] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showAllFeatured, setShowAllFeatured] = useState<boolean>(false);
  const [shopSearchQuery, setShopSearchQuery] = useState<string>('');
  const [debouncedShopSearchQuery, setDebouncedShopSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(RESTAURANT_BATCH_SIZE);
  const [nowTickMs, setNowTickMs] = useState<number>(() => Date.now());
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        setNowTickMs(Date.now());
      }
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedShopSearchQuery(shopSearchQuery);
    }, 180);
    return () => clearTimeout(timer);
  }, [shopSearchQuery]);

  const handleToggleNearMe = () => {
    if (nearMeActive) {
      setNearMeActive(false);
      setSortMode('popular');
      return;
    }
    setNearMeActive(true);
    setSortMode('nearest');
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          showToast(
            tr(
              language,
              '📍 បានរៀបហាងតាមចម្ងាយជិតអ្នកបំផុត!',
              '📍 Sorted shops nearest to your location!',
              '📍 已按距离您最近排序店铺！'
            ),
            'success'
          );
        },
        () => {
          setUserCoords({ lat: 11.5564, lng: 104.9282 });
          showToast(
            tr(
              language,
              '📍 បង្ហាញហាងពេញនិយមនៅជិតអ្នក',
              '📍 Showing popular shops near you',
              '📍 显示您附近的热门店铺'
            ),
            'info'
          );
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 }
      );
    } else {
      setUserCoords({ lat: 11.5564, lng: 104.9282 });
    }
  };

  const classifyRestaurantCategory = (r: Restaurant): string => {
    const text = `${r.nameKh || ''} ${r.nameEn || ''} ${r.descriptionKh || ''} ${r.descriptionEn || ''} ${(r.signatureDishesKh || []).join(' ')} ${(r.signatureDishesEn || []).join(' ')}`.toLowerCase();
    if (
      text.includes('កាហ្វេ') ||
      text.includes('តែគុជ') ||
      text.includes('ប៊ីស្រ្តូ') ||
      text.includes('cafe') ||
      text.includes('café') ||
      text.includes('coffee') ||
      text.includes('roastery') ||
      text.includes('atelier') ||
      text.includes('kinyei') ||
      text.includes('bistro') ||
      text.includes('brown ') ||
      text.includes('tube ') ||
      text.includes('starbucks') ||
      text.includes('amazon') ||
      text.includes('chagee') ||
      text.includes('koi ') ||
      text.includes('mixue') ||
      text.includes('boba') ||
      text.includes('bakery') ||
      text.includes('pastry') ||
      text.includes('sister srey') ||
      text.includes('ministry of cat') ||
      text.includes('camping')
    ) {
      return 'cafe_bistro';
    }
    if (
      text.includes('សាច់អាំង') ||
      text.includes('bbq') ||
      text.includes('grill') ||
      text.includes('សុវណ្ណា') ||
      text.includes('sovanna')
    ) {
      return 'bbq_grill';
    }
    if (
      text.includes('សមុទ្រ') ||
      text.includes('seafood') ||
      text.includes('crab') ||
      text.includes('មាត់ទន្លេ') ||
      text.includes('មាត់បឹង') ||
      text.includes('មាត់ព្រែក') ||
      text.includes('riverside') ||
      text.includes('lake') ||
      text.includes('sailing') ||
      text.includes('bopha') ||
      text.includes('ក្បាលកោះ')
    ) {
      return 'seafood_riverside';
    }
    if (
      r.priceLevel === '$$$' ||
      text.includes('ម្លិះ') ||
      text.includes('malis') ||
      text.includes('wat damnak') ||
      text.includes('chanrey tree') ||
      text.includes('ក្រវាញ') ||
      text.includes('kravanh') ||
      text.includes('viroth') ||
      text.includes('រំដេង') ||
      text.includes('romdeng')
    ) {
      return 'khmer_fine_dining';
    }
    return 'family_garden';
  };

  const matchesPrimaryTabPill = (r: Restaurant, tabId: string): boolean => {
    if (tabId === 'all') return true;
    const text = `${r.nameKh || ''} ${r.nameEn || ''} ${r.categoryKh || ''} ${r.categoryEn || ''} ${r.descriptionKh || ''} ${(r.signatureDishesKh || []).join(' ')}`.toLowerCase();
    const subCat = classifyRestaurantCategory(r);
    if (tabId === 'cafe_bistro') {
      return subCat === 'cafe_bistro';
    }
    if (tabId === 'drinks_boba') {
      return (
        /ភេសជ្ជៈ|តែគុជ|ទឹកក្រឡុក|ទឹកផ្លែឈើ|ការ៉េម|boba|tea|chagee|koi|mixue|smoothie|juice|drink|cafe|កាហ្វេ/.test(text)
      );
    }
    if (tabId === 'fast_street') {
      return (
        /អាហារសម្រន់|អាហាររហ័ស|នំប៉័ង|បឺហ្គឺ|ភីហ្សា|មីឆា|គុយទាវ|បាយឆា|បាញ់ឆែវ|ប្រហិត|នំ|bakery|fast|street|burger|pizza|sandwich|noodle|kuyteav/.test(
          text
        ) || r.priceLevel === '$'
      );
    }
    if (tabId === 'restaurant_dining') {
      return subCat !== 'cafe_bistro';
    }
    return subCat === tabId;
  };

  const primaryCategoryPills = [
    { id: 'all', nameKh: 'ទាំងអស់', nameEn: 'All', nameZh: '全部', icon: LayoutGrid },
    { id: 'restaurant_dining', nameKh: 'ភោជនីយដ្ឋាន', nameEn: 'Restaurants', nameZh: '餐厅', icon: Utensils },
    { id: 'cafe_bistro', nameKh: 'កាហ្វេ', nameEn: 'Café', nameZh: '咖啡馆', icon: Coffee },
    { id: 'drinks_boba', nameKh: 'ភេសជ្ជៈ', nameEn: 'Drinks', nameZh: '饮品', icon: CupSoda },
    { id: 'fast_street', nameKh: 'អាហាររហ័ស', nameEn: 'Fast Food', nameZh: '快餐小吃', icon: Sandwich },
  ];

  const cuisineOptions = [
    { id: 'all', nameKh: 'ប្រភេទម្ហូប', nameEn: 'Cuisine Type', nameZh: '菜系分类' },
    { id: 'khmer_fine_dining', nameKh: 'ម្ហូបខ្មែរប្រណីត', nameEn: 'Khmer Fine Dining', nameZh: '高端柬式料理' },
    { id: 'bbq_grill', nameKh: 'សាច់អាំង & ជួបជុំ', nameEn: 'BBQ & Grill', nameZh: '烧烤与聚餐' },
    { id: 'seafood_riverside', nameKh: 'គ្រឿងសមុទ្រ & មាត់ទន្លេ', nameEn: 'Seafood & Riverside', nameZh: '海鲜与河畔餐厅' },
    { id: 'family_garden', nameKh: 'ភោជនីយដ្ឋានគ្រួសារ', nameEn: 'Family & Khmer', nameZh: '家庭与传统柬菜' },
    { id: 'cafe_bistro', nameKh: 'កាហ្វេ & នំដុត', nameEn: 'Café & Bakery', nameZh: '咖啡与烘焙' },
  ];

  useEffect(() => {
    setVisibleCount(RESTAURANT_BATCH_SIZE);
  }, [selectedProvince, priceFilter, categoryFilter, cuisineFilter, ratingFilter, sortMode, shopSearchQuery]);

  const provinces = [
    { id: '', nameKh: 'តំបន់/ខេត្ត', nameEn: 'Area/Province' },
    { id: 'ភ្នំពេញ', nameKh: 'ភ្នំពេញ', nameEn: 'Phnom Penh' },
    { id: 'សៀមរាប', nameKh: 'សៀមរាប', nameEn: 'Siem Reap' },
    { id: 'កំពត', nameKh: 'កំពត', nameEn: 'Kampot' },
    { id: 'កែប', nameKh: 'កែប', nameEn: 'Kep' },
    { id: 'បាត់ដំបង', nameKh: 'បាត់ដំបង', nameEn: 'Battambang' },
    { id: 'ព្រះសីហនុ', nameKh: 'ព្រះសីហនុ', nameEn: 'Sihanoukville' },
    { id: 'កំពង់ចាម', nameKh: 'កំពង់ចាម', nameEn: 'Kampong Cham' },
    { id: 'មណ្ឌលគិរី', nameKh: 'មណ្ឌលគិរី', nameEn: 'Mondulkiri' },
    { id: 'កោះកុង', nameKh: 'កោះកុង', nameEn: 'Koh Kong' },
    { id: 'តាកែវ', nameKh: 'តាកែវ', nameEn: 'Takeo' },
    { id: 'ពោធិ៍សាត់', nameKh: 'ពោធិ៍សាត់', nameEn: 'Pursat' },
  ];

  const sessionShuffledRestaurants = useMemo(
    () => shuffleForCurrentSession(restaurants),
    [restaurants]
  );

  const validDirectoryRestaurants = useMemo(() => {
    const seenIds = new Set<string>();
    return sessionShuffledRestaurants.filter((r) => {
      if (isHotelBusinessRecord(r)) {
        return false;
      }
      if (!isStrictVerifiedCambodiaRestaurant(r)) {
        return false;
      }
      if (
        r.aiCategoryVerification?.detectedType &&
        r.aiCategoryVerification.detectedType !== 'restaurant'
      ) {
        return false;
      }
      if (r.status === 'rejected' && r.pendingPhotoReplacement?.source === 'google_places_replacement_shop') {
        return false;
      }
      if (r.status !== 'approved' && currentUser?.role !== 'admin' && currentUser?.id !== r.ownerId) {
        return false;
      }
      if (!verifyShopDataForDisplay(r)) {
        return false;
      }
      const idStr = String(r.id);
      if (seenIds.has(idStr)) return false;
      seenIds.add(idStr);
      return true;
    });
  }, [sessionShuffledRestaurants, currentUser?.role, currentUser?.id, isAdmin]);

  const cleanSelectedProvince = useMemo(() => {
    const raw = (selectedProvince || '').trim();
    if (!raw || raw === 'ទាំងអស់' || raw.toLowerCase() === 'all') return '';
    return raw.replace(/^(ខេត្ត|រាជធានី)/, '').trim();
  }, [selectedProvince]);

  const preRotatedRestaurants = useMemo(
    () => sortRestaurantsWithVipRotation(validDirectoryRestaurants, users, appSettings, nowTickMs),
    [validDirectoryRestaurants, users, appSettings, nowTickMs]
  );

  const distanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const refLat = userCoords?.lat ?? 11.5564;
    const refLng = userCoords?.lng ?? 104.9282;
    for (const r of preRotatedRestaurants) {
      if (typeof r.latitude === 'number' && typeof r.longitude === 'number' && r.latitude > 9 && r.longitude > 102) {
        const d = haversineDistanceKm(refLat, refLng, r.latitude, r.longitude);
        map.set(r.id, d);
      }
    }
    return map;
  }, [preRotatedRestaurants, userCoords]);

  const sortedRestaurants = useMemo(() => {
    const rawTrimmed = debouncedShopSearchQuery.trim();
    const smartIntent = rawTrimmed ? parseSmartSearchIntent(rawTrimmed) : null;
    const effectiveProvince = cleanSelectedProvince || (smartIntent?.detectedProvinceKh || '');
    const effectiveRawQuery = (
      smartIntent?.isConversationalPrompt && smartIntent.coreQuery ? smartIntent.coreQuery : rawTrimmed
    ).trim();
    const q = normalizeKhmerSearchText(effectiveRawQuery);
    const analyzed = effectiveRawQuery ? analyzeSearchQuery(effectiveRawQuery) : null;

    const scored: { item: Restaurant; score: number }[] = [];
    for (const r of preRotatedRestaurants) {
      const cleanRestProvince = (r.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim();
      const matchesProvince =
        !effectiveProvince ||
        cleanRestProvince === effectiveProvince ||
        (r.provinceKh || '').includes(effectiveProvince) ||
        (r.addressKh || '').includes(effectiveProvince);
      const matchesPrice = priceFilter === 'all' || r.priceLevel === priceFilter;
      const matchesCategory = matchesPrimaryTabPill(r, categoryFilter);
      const matchesCuisine = cuisineFilter === 'all' || classifyRestaurantCategory(r) === cuisineFilter;
      const matchesRating =
        ratingFilter === 'all' ||
        (ratingFilter === '4.5' ? Number(r.rating || 4.6) >= 4.5 : Number(r.rating || 4.6) >= 4.0);

      let relevance = 1;
      if (q && analyzed) {
        const nameDetail = scoreSearchRecord(
          analyzed,
          restaurantSearchFields(r, [getLocalizedRestaurant(r, 'zh').name])
        );
        const productMatch = matchShopToProductQuery(r, effectiveRawQuery);
        relevance = Math.max(nameDetail.score, productMatch.matches ? productMatch.score : 0);
        if (relevance <= 0) {
          const hay = normalizeKhmerSearchText(
            `${r.nameKh || ''} ${r.nameEn || ''} ${r.provinceKh || ''} ${r.provinceEn || ''} ${r.addressKh || ''} ${r.addressEn || ''} ${r.descriptionKh || ''} ${r.descriptionEn || ''} ${(r.signatureDishesKh || []).join(' ')} ${(r.signatureDishesEn || []).join(' ')}`
          );
          if (hay.includes(q)) {
            relevance = 25;
          }
        }
        if (smartIntent?.semanticCategory === 'cafe' && classifyRestaurantCategory(r) === 'cafe_bistro') {
          relevance += 35;
        }
      }

      if (matchesProvince && matchesPrice && matchesCategory && matchesCuisine && matchesRating && relevance > 0) {
        scored.push({ item: r, score: relevance });
      }
    }

    if (q) {
      scored.sort((a, b) => b.score - a.score);
    } else if (sortMode === 'nearest') {
      scored.sort((a, b) => (distanceMap.get(a.item.id) ?? 999) - (distanceMap.get(b.item.id) ?? 999));
    } else if (sortMode === 'rating') {
      scored.sort((a, b) => Number(b.item.rating || 0) - Number(a.item.rating || 0));
    }

    return scored.map((entry) => entry.item);
  }, [
    preRotatedRestaurants,
    cleanSelectedProvince,
    priceFilter,
    categoryFilter,
    cuisineFilter,
    ratingFilter,
    sortMode,
    distanceMap,
    debouncedShopSearchQuery,
  ]);

  // Split into Section 1: "ហាងពេញនិយមជិតខ្ញុំ" (2 Featured Horizontal Cards by default matching OK.jpg) & Section 2: "បញ្ជីហាងបន្ថែម" (Compact Directory Rows)
  const { featuredRestaurants, directoryRestaurants } = useMemo(() => {
    if (sortedRestaurants.length === 0) {
      return { featuredRestaurants: [], directoryRestaurants: [] };
    }
    const targetFeaturedCount = showAllFeatured ? 12 : 2;
    const vipList = sortedRestaurants.filter((r) => isVipOwnerListing(r));
    const nonVipList = sortedRestaurants.filter((r) => !isVipOwnerListing(r));
    const orderedForFeatured = [...vipList, ...nonVipList];
    const featured = orderedForFeatured.slice(0, targetFeaturedCount);
    const featuredIds = new Set<string>(featured.map((r) => r.id));
    const directory = sortedRestaurants.filter((r) => !featuredIds.has(r.id));
    return { featuredRestaurants: featured, directoryRestaurants: directory };
  }, [sortedRestaurants, showAllFeatured]);

  const displayedDirectoryRestaurants = useMemo(
    () => directoryRestaurants.slice(0, visibleCount),
    [directoryRestaurants, visibleCount]
  );

  useEffect(() => {
    const node = loadMoreTriggerRef.current;
    if (!node) return;
    if (visibleCount >= directoryRestaurants.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting) {
          setVisibleCount((prev) => Math.min(directoryRestaurants.length, prev + RESTAURANT_BATCH_SIZE));
        }
      },
      { root: null, rootMargin: '300px 0px', threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, directoryRestaurants.length]);

  const handleAddShopClick = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (isAdmin) {
      (window as any).__kft_vip_store_initial_mode = { mode: 'create', businessType: 'restaurant' };
      setIsVipAddRestaurantModalOpen(true);
      return;
    }
    if (storeQuota.usedStoresCount < storeQuota.totalAllowedStores) {
      (window as any).__kft_vip_store_initial_mode = { mode: 'create', businessType: 'restaurant' };
      setIsVipAddRestaurantModalOpen(true);
      return;
    }
    if (myExistingRest) {
      setActiveManagedShopId(myExistingRest.id);
      openManageMyVipStore(myExistingRest.id);
      return;
    }
    (window as any).__kft_vip_store_initial_mode = { mode: 'create', businessType: 'restaurant' };
    setIsVipAddRestaurantModalOpen(true);
  };

  const hasCustomPhotoAvatar = Boolean(
    currentUser?.avatar &&
      !currentUser.avatar.startsWith('data:image/svg') &&
      (currentUser.avatar.startsWith('http') || currentUser.avatar.startsWith('data:image/') || currentUser.avatar.startsWith('/'))
  );

  const nearestDistanceLabel = useMemo(() => {
    const first = featuredRestaurants[0];
    if (!first) return '0.8 km';
    const d = distanceMap.get(first.id);
    if (typeof d === 'number' && Number.isFinite(d) && d > 0) {
      return `${d < 10 ? d.toFixed(1) : Math.round(d)} km`;
    }
    return '0.8 km';
  }, [featuredRestaurants, distanceMap]);

  return (
    <div className="max-w-md mx-auto bg-[#F4F7F5] text-slate-900 min-h-full font-khmer pb-8">
      {/* =====================================================================
          1. TOP ANGKOR WAT SUNSET & LAKE REFLECTION HERO + SEARCH + 5 CATEGORIES
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
              {hasCustomPhotoAvatar && currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  onError={(e) => handleAvatarImageError(e, currentUser)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="8.5" r="3.8" />
                  <path d="M5 19.5c1.3-3.3 3.8-5 7-5s5.7 1.7 7 5a8.5 8.5 0 0 1-14 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Large White Storefront Icon + Khmer Page Title & English Subtitle */}
        <div className="relative z-10 mt-4 flex items-center gap-3">
          <svg
            className="w-10 h-10 text-white shrink-0 drop-shadow-sm"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M5 13L7.5 6.5H28.5L31 13"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4.5 13H31.5V15.2C31.5 17.2 29.9 18.8 27.9 18.8C25.9 18.8 24.3 17.2 24.3 15.2C24.3 17.2 22.7 18.8 20.7 18.8C18.7 18.8 17.1 17.2 17.1 15.2C17.1 17.2 15.5 18.8 13.5 18.8C11.5 18.8 9.9 17.2 9.9 15.2C9.9 17.2 8.3 18.8 6.3 18.8C4.8 18.8 4.5 17.2 4.5 15.2V13Z"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            <path
              d="M7.5 18.8V29.5H28.5V18.8"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="11.5" y="22.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2.1" />
            <line x1="22.5" y1="23.5" x2="25.5" y2="23.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
          <div className="min-w-0">
            <h2
              className="font-extrabold text-[18px] sm:text-[19px] text-white leading-tight truncate"
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.55)' }}
            >
              {tr(language, 'ស្វែងរកហាង និងភោជនីយដ្ឋាន', 'Find Restaurants & Shops', '搜索餐厅与店铺')}
            </h2>
            <p
              className="text-xs sm:text-[13px] font-bold text-white/95 truncate"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
            >
              Restaurants &amp; Shops
            </p>
          </div>
        </div>

        {/* Row 3: Large White Rounded Search Bar with Gold Border + Emerald Green Nearby Button */}
        <div className="relative z-10 mt-3.5 flex items-center gap-2">
          <div className="flex-1 min-w-0 h-12 rounded-full bg-white border-2 border-[#D4AF37] shadow-md flex items-center pl-3.5 pr-3 gap-2">
            <Search className="w-5 h-5 text-[#0E5A35] shrink-0" strokeWidth={2.4} />
            <input
              type="text"
              value={shopSearchQuery}
              onChange={(e) => setShopSearchQuery(e.target.value)}
              placeholder={tr(
                language,
                'ស្វែងរកហាង, ម្ហូប, តំបន់ ឬឈ្មោះ',
                'Search shop, dish, area or name...',
                '搜索店铺、菜品、区域或名称...'
              )}
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-[13px] font-bold text-slate-900 placeholder-slate-500 focus:outline-none truncate"
            />
            {shopSearchQuery ? (
              <button
                type="button"
                onClick={() => setShopSearchQuery('')}
                aria-label={tr(language, 'សម្អាត', 'Clear', '清除')}
                className="p-1 text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => openGoogleMapsSearchModal('restaurant')}
              title={tr(language, 'ស្វែងរកលើផែនទី', 'Find on Map', '地图查找')}
              className="p-1 text-[#0E5A35] hover:text-[#083B22] shrink-0 cursor-pointer"
            >
              <Mic className="w-5 h-5" strokeWidth={2.2} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleNearMe}
            style={
              nearMeActive
                ? { background: 'linear-gradient(180deg, #FDE047 0%, #EAB308 100%)' }
                : { background: 'linear-gradient(180deg, #1E7E48 0%, #0D522C 100%)' }
            }
            className={`h-12 px-4 rounded-full font-extrabold text-xs sm:text-[13px] inline-flex items-center gap-1.5 shrink-0 shadow-md border-2 border-[#D4AF37] transition active:scale-95 cursor-pointer ${
              nearMeActive ? 'text-slate-950' : 'text-white'
            }`}
          >
            <MapPin className={`w-4 h-4 shrink-0 ${nearMeActive ? 'text-slate-950' : 'text-white fill-white/25'}`} strokeWidth={2.3} />
            <span>{tr(language, 'នៅជិតខ្ញុំ', 'Near Me', '附近')}</span>
          </button>
        </div>

        {/* Row 4: 5 Large Rounded Category Buttons (Icon on Top + Khmer Label Below) */}
        <div className="relative z-10 mt-3.5 grid grid-cols-5 gap-1.5 sm:gap-2">
          {primaryCategoryPills.map((cat) => {
            const Icon = cat.icon;
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                style={
                  active
                    ? {
                        background: 'linear-gradient(180deg, #1E7E48 0%, #0B4D29 100%)',
                        boxShadow: '0 4px 12px rgba(11, 77, 41, 0.28)',
                      }
                    : undefined
                }
                className={`rounded-2xl py-2.5 px-1 flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
                  active
                    ? 'text-white border-2 border-[#D4AF37]'
                    : 'bg-white/95 hover:bg-white text-[#0F291E] border border-white shadow-sm'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-[#0E5A35]'}`} strokeWidth={2.1} />
                <span className="font-extrabold text-[10.5px] sm:text-xs leading-[1.55] py-0.5 text-center break-words whitespace-normal w-full">
                  {tr(language, cat.nameKh, cat.nameEn, cat.nameZh)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          2. MAIN SHEET CONTENT: FILTERS, ADD SHOP BANNER & TRENDING SHOPS
          ===================================================================== */}
      <div className="relative z-10 px-3.5 pt-1 space-y-3">
        {/* Row 5: 4 Rounded Filter & Sorting Controls */}
        <div className="grid grid-cols-2 min-[420px]:grid-cols-4 gap-1.5">
          {/* Control 1: Location / Province */}
          <label className="relative min-h-[40px] px-2.5 py-1 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-800 cursor-pointer whitespace-nowrap overflow-hidden">
            <MapPin className="w-3.5 h-3.5 text-[#0E5A35] shrink-0" strokeWidth={2.2} />
            <span className="truncate">
              {cleanSelectedProvince
                ? language === 'km'
                  ? cleanSelectedProvince
                  : translateProvince(cleanSelectedProvince, language)
                : tr(language, 'តំបន់/ខេត្ត', 'Area', '地区')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={cleanSelectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              aria-label={tr(language, 'ជ្រើសរើសខេត្ត', 'Select Province', '选择省份')}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {language === 'km' ? p.nameKh : language === 'zh' ? translateProvince(p.nameEn, 'zh') : p.nameEn}
                </option>
              ))}
            </select>
          </label>

          {/* Control 2: Food Category */}
          <label className="relative min-h-[40px] px-2.5 py-1 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-800 cursor-pointer whitespace-nowrap overflow-hidden">
            <Utensils className="w-3.5 h-3.5 text-[#0E5A35] shrink-0" strokeWidth={2.2} />
            <span className="truncate">
              {(() => {
                const found = cuisineOptions.find((c) => c.id === cuisineFilter) || cuisineOptions[0];
                return tr(language, found.nameKh, found.nameEn, found.nameZh);
              })()}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={cuisineFilter}
              onChange={(e) => setCuisineFilter(e.target.value)}
              aria-label={tr(language, 'ប្រភេទម្ហូប', 'Cuisine Type', '菜系分类')}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              {cuisineOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {tr(language, c.nameKh, c.nameEn, c.nameZh)}
                </option>
              ))}
            </select>
          </label>

          {/* Control 3: Rating */}
          <label className="relative min-h-[40px] px-2.5 py-1 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-800 cursor-pointer whitespace-nowrap overflow-hidden">
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

          {/* Control 4: Advanced Filters / Sort */}
          <label className="relative min-h-[40px] px-2.5 py-1 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-800 cursor-pointer whitespace-nowrap overflow-hidden">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0E5A35] shrink-0" strokeWidth={2.2} />
            <span className="truncate">
              {sortMode === 'nearest'
                ? tr(language, 'ជិតបំផុត', 'Nearest', '最近')
                : sortMode === 'rating'
                  ? tr(language, 'ពិន្ទុខ្ពស់', 'Top Rated', '最高分')
                  : tr(language, 'កម្រៀប', 'Sort', '排序')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={sortMode}
              onChange={(e) => {
                const next = e.target.value as 'popular' | 'nearest' | 'rating';
                if (next === 'nearest' && !nearMeActive) {
                  handleToggleNearMe();
                } else {
                  setSortMode(next);
                  if (next !== 'nearest') setNearMeActive(false);
                }
              }}
              aria-label={tr(language, 'កម្រៀប', 'Sort', '排序')}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              <option value="popular">{tr(language, 'កម្រៀប៖ ពេញនិយម', 'Sort: Popular', '排序：最受欢迎')}</option>
              <option value="nearest">{tr(language, 'កម្រៀប៖ ជិតខ្ញុំបំផុត', 'Sort: Nearest', '排序：距离最近')}</option>
              <option value="rating">{tr(language, 'កម្រៀប៖ ពិន្ទុខ្ពស់បំផុត', 'Sort: Highest Rated', '排序：评分最高')}</option>
            </select>
          </label>
        </div>

        {/* Row 6: Add Your Shop Promotional Banner (Using New Gold-Bordered 3D /welcome/shop-register-banner.png) */}
        <div className="space-y-2">
          <div className="relative rounded-[20px] overflow-hidden shadow-[0_6px_18px_rgba(6,78,59,0.22)]">
            <div className="relative min-h-[108px] sm:min-h-[114px] flex items-center">
              <img
                src="/welcome/shop-register-banner.png"
                alt="Register Your Shop"
                decoding="async"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
              />

              {/* Right-Side Heading, Description & Gold CTA Button */}
              <div className="relative z-10 w-full pl-[39%] pr-3.5 py-2.5 space-y-1.5">
                <div>
                  <h3
                    className="font-khmer font-extrabold text-white leading-tight truncate"
                    style={{ fontSize: '15px', textShadow: '0 2px 4px rgba(0,0,0,0.42)' }}
                  >
                    {tr(language, 'ចុះបញ្ជីហាងរបស់អ្នក', 'Register Your Shop', '入驻您的餐厅店铺')}
                  </h3>
                  <p
                    className="font-khmer font-bold text-white/95 leading-snug mt-0.5 truncate"
                    style={{ fontSize: '10.5px', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
                  >
                    {tr(
                      language,
                      'បង្ហាញហាងភោជនីយដ្ឋានរបស់អ្នកនៅលើកម្មវិធី',
                      'Showcase your restaurant on the app',
                      '在应用上展示您的餐厅与招牌菜'
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddShopClick}
                  style={{
                    background: 'linear-gradient(180deg, #FDE047 0%, #FACC15 55%, #EAB308 100%)',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.75)',
                    fontSize: '12px',
                  }}
                  className="w-full h-8.5 px-4 rounded-full border border-amber-200 text-slate-950 font-khmer font-extrabold inline-flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.8] text-slate-950 shrink-0" />
                  <span>{tr(language, 'បន្ថែមហាងថ្មី', 'Add New Shop', '添加新店铺')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Admin / Existing Shop Owner Quick Actions */}
          {isAdmin ? (
            <div className="relative z-10 p-2 rounded-2xl bg-[#0A5C36] border border-emerald-700/40 grid grid-cols-2 gap-2 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  (window as any).__kft_admin_tab = 'shops';
                  setIsAdminOpen(true);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">{tr(language, 'គ្រប់គ្រងហាងទាំងអស់', 'Manage All Shops', '管理全部店铺')}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRestaurantCheckInModalOpen(true)}
                className="py-1.5 px-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                <span className="truncate">{tr(language, 'ឆែកអ៊ីន GPS ហាង', 'GPS Check-In', 'GPS 实地核验')}</span>
              </button>
            </div>
          ) : myExistingRest ? (
            <div className="relative z-10 px-3 py-2 rounded-2xl bg-[#0A5C36] border border-emerald-700/40 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {myOwnedRestaurants.length > 1 ? (
                  <select
                    value={myExistingRest.id}
                    onChange={(e) => setActiveManagedShopId(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-black/25 border border-white/25 text-white font-bold text-[11px] focus:outline-none truncate max-w-[180px]"
                  >
                    {myOwnedRestaurants.map((r, i) => (
                      <option key={r.id} value={r.id} className="text-slate-900">
                        #{i + 1}: {r.nameKh || r.nameEn}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[11px] font-bold text-amber-200 truncate">
                    🏪 {myExistingRest.nameKh || myExistingRest.nameEn}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  (window as any).__kft_manage_initial_tab = 'info';
                  openManageMyVipStore(myExistingRest.id);
                }}
                className="py-1 px-3 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>{tr(language, 'កែប្រែហាងរបស់ខ្ញុំ', 'Edit My Shop', '管理我的店铺')}</span>
              </button>
            </div>
          ) : null}
        </div>

        {/* ===================================================================
            3. TRENDING / NEARBY SHOPS & DIRECTORY
            =================================================================== */}
        {sortedRestaurants.length > 0 ? (
          <div className="space-y-3.5 pt-0.5">
            {/* Section 1: ហាងពេញនិយមជិតខ្ញុំ (Popular Shops Near Me) */}
            {featuredRestaurants.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-1.5 px-0.5">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        <Flame className="w-5 h-5 text-orange-500 fill-amber-400" />
                      </span>
                      <h3 className="font-extrabold text-[15px] sm:text-base text-[#0F291E] truncate">
                        {tr(language, 'ហាងពេញនិយមជិតខ្ញុំ', 'Popular Shops Near Me', '附近热门店铺')}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {featuredRestaurants.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      variant="featured"
                      distanceKm={distanceMap.get(restaurant.id) ?? null}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: បញ្ជីហាងបន្ថែម (More Shops Directory) */}
            {displayedDirectoryRestaurants.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-1 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[#0E5A35]/10 border border-[#0E5A35]/25 flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4 text-[#0E5A35] shrink-0" strokeWidth={2.2} />
                    </span>
                    <h3 className="font-extrabold text-[15px] sm:text-base text-[#0F291E]">
                      {tr(language, 'បញ្ជីហាងបន្ថែម', 'More Shops Directory', '更多店铺列表')}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0E5A35]/10 border border-[#0E5A35]/25 text-[11px] font-extrabold text-[#0E5A35] font-mono">
                    {directoryRestaurants.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {displayedDirectoryRestaurants.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      variant="compact"
                      distanceKm={distanceMap.get(restaurant.id) ?? null}
                    />
                  ))}
                </div>

                {visibleCount < directoryRestaurants.length && (
                  <div ref={loadMoreTriggerRef} className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleCount((prev) => Math.min(directoryRestaurants.length, prev + RESTAURANT_BATCH_SIZE))
                      }
                      className="px-5 py-2.5 rounded-full bg-[#0E5A35] hover:bg-[#094226] text-white text-xs font-extrabold shadow-xs cursor-pointer transition"
                    >
                      {tr(
                        language,
                        `បង្ហាញហាងបន្ថែម (${displayedDirectoryRestaurants.length} / ${directoryRestaurants.length})`,
                        `Show More Restaurants (${displayedDirectoryRestaurants.length} / ${directoryRestaurants.length})`,
                        `加载更多餐厅 (${displayedDirectoryRestaurants.length} / ${directoryRestaurants.length})`
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 px-4 text-center bg-white rounded-3xl border border-slate-200 text-slate-600 space-y-2.5 shadow-xs">
            <Store className="w-10 h-10 mx-auto text-slate-400" strokeWidth={1.75} />
            <p className="text-xs font-bold text-slate-700">
              {debouncedShopSearchQuery.trim()
                ? tr(
                    language,
                    `រកមិនឃើញហាងដែលត្រូវនឹង «${debouncedShopSearchQuery.trim()}» ក្នុងកម្មវិធីទេ`,
                    `No shops in the app match "${debouncedShopSearchQuery.trim()}"`,
                    `应用内未找到与“${debouncedShopSearchQuery.trim()}”匹配的店铺`
                  )
                : tr(
                    language,
                    'រកមិនឃើញហាងអាហារក្នុងផ្នែកនេះទេ',
                    'No restaurants matched your filters',
                    '未找到符合筛选条件的餐厅'
                  )}
            </p>
            {debouncedShopSearchQuery.trim() && (
              <button
                type="button"
                onClick={() =>
                  openExternalUrlNativeSafe(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${debouncedShopSearchQuery.trim()} Cambodia`)}`
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
    </div>
  );
};

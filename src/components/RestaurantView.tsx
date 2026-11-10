import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RestaurantCard } from './RestaurantCard';
import {
  Restaurant,
  sortRestaurantsWithVipRotation,
  isAdminAccount,
  getVipFeaturedRotationConfig,
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
  User as UserIcon,
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
          // Default to Phnom Penh center if permission denied
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
      const v = verifyShopDataForDisplay(r);
      if (!v.isValid) {
        return false;
      }
      if (seenIds.has(r.id)) return false;
      seenIds.add(r.id);
      return true;
    });
  }, [sessionShuffledRestaurants, currentUser]);

  const cleanSelectedProvince = useMemo(
    () => selectedProvince.replace(/^(ខេត្ត|រាជធានី)/, '').trim(),
    [selectedProvince]
  );

  const rotationConfig = useMemo(
    () => getVipFeaturedRotationConfig(appSettings),
    [
      appSettings.vipFeaturedRotationEnabled,
      appSettings.vipFeaturedDurationDays,
      appSettings.vipFeaturedRotationIntervalMinutes,
      appSettings.manualFeaturedRestaurants,
    ]
  );

  const preRotatedRestaurants = useMemo(
    () => sortRestaurantsWithVipRotation(validDirectoryRestaurants, users, nowTickMs, rotationConfig),
    [validDirectoryRestaurants, users, nowTickMs, rotationConfig]
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
    const effectiveRawQuery =
      smartIntent && smartIntent.cleanedKeywords && cleanSelectedProvince === ''
        ? smartIntent.cleanedKeywords
        : rawTrimmed;
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
        relevance = scoreSearchRecord(restaurantSearchFields(r), analyzed);
        if (relevance <= 0) {
          const hay = normalizeKhmerSearchText(
            `${r.nameKh || ''} ${r.nameEn || ''} ${r.provinceKh || ''} ${r.provinceEn || ''} ${r.addressKh || ''} ${r.addressEn || ''} ${r.descriptionKh || ''} ${r.descriptionEn || ''} ${(r.signatureDishesKh || []).join(' ')} ${(r.signatureDishesEn || []).join(' ')}`
          );
          if (hay.includes(q)) {
            relevance = 25;
          } else if (matchShopToProductQuery(r, effectiveRawQuery)) {
            relevance = 40;
          }
        }
        if (relevance > 0 && matchShopToProductQuery(r, effectiveRawQuery)) {
          relevance += 20;
        }
        if (
          smartIntent?.intentType === 'cafe' &&
          classifyRestaurantCategory(r) === 'cafe_bistro'
        ) {
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

  // Split into Section 1: "ហាងពេញនិយមជិតខ្ញុំ" (Featured Horizontal Cards) & Section 2: "បញ្ជីហាងបន្ថែម" (Compact Directory Rows)
  const { featuredRestaurants, directoryRestaurants } = useMemo(() => {
    if (sortedRestaurants.length === 0) {
      return { featuredRestaurants: [], directoryRestaurants: [] };
    }
    const vipList = sortedRestaurants.filter((r) => isVipOwnerListing(r));
    const nonVipList = sortedRestaurants.filter((r) => !isVipOwnerListing(r));
    const minFeaturedCount = showAllFeatured ? 10 : Math.max(2, vipList.length);
    const featuredIds = new Set<string>(vipList.map((r) => r.id));
    const featured: Restaurant[] = [...vipList];
    for (const r of nonVipList) {
      if (featured.length >= minFeaturedCount) break;
      featuredIds.add(r.id);
      featured.push(r);
    }
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
    if (storeQuota.usedStoresCount < storeQuota.maxAllowedStores) {
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

  const resolvedProfileAvatar = useMemo(
    () => resolveUserAvatarUrl(currentUser || { name: 'KH', role: 'user' }),
    [currentUser]
  );

  return (
    <div className="max-w-md mx-auto bg-[#F3F5F3] text-slate-900 min-h-full font-khmer pb-8">
      {/* =====================================================================
          1. TOP EMERALD & ANGKOR WAT HERO HEADER (Matching Attached Reference)
          ===================================================================== */}
      <div
        className="relative w-full overflow-hidden pt-2.5 pb-6 px-3.5 select-none"
        style={{
          background: 'linear-gradient(135deg, #073B25 0%, #0C5536 52%, #156A45 100%)',
          paddingTop: 'calc(var(--kft-safe-top, 0px) + 10px)',
        }}
      >
        {/* Right-side Angkor Wat Temple Silhouette / Photo Backdrop */}
        <img
          src="/hero/angkor-wat-sunrise.jpg"
          alt="Angkor Wat"
          className="absolute right-0 top-0 h-full w-[62%] object-cover object-center opacity-35 mix-blend-luminosity pointer-events-none"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, #08422A 0%, rgba(11,79,53,0.92) 46%, rgba(15,92,61,0.45) 78%, rgba(11,79,53,0.75) 100%)',
          }}
        />

        {/* Row 1: App Logo + Brand Title + Right Notification & Profile Icons */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-11 h-11 rounded-xl p-[1.5px] bg-gradient-to-b from-[#FDE047] via-[#D4AF37] to-[#9A6F1A] shadow-md shrink-0">
              <img
                src="/icons/app-logo-header.jpg"
                alt="Cambodia Flavors & Tourism"
                className="w-full h-full rounded-[10px] object-cover bg-[#064E3B]"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-moul text-[13px] sm:text-sm text-white leading-tight truncate drop-shadow-xs">
                {tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨美食与旅游')}
              </h1>
              <p className="text-[11px] font-bold text-emerald-100/90 truncate">
                Cambodia Flavors &amp; Tourism
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Notification Bell Button */}
            <button
              type="button"
              onClick={() => setIsNotificationsModalOpen(true)}
              aria-label={tr(language, 'ការជូនដំណឹង', 'Notifications', '通知')}
              className="relative w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white flex items-center justify-center backdrop-blur-xs active:scale-95 transition cursor-pointer"
            >
              <Bell className="w-4 h-4 text-white" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#0C5536]" />
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
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white flex items-center justify-center overflow-hidden backdrop-blur-xs active:scale-95 transition cursor-pointer"
            >
              {currentUser ? (
                <img
                  src={resolvedProfileAvatar}
                  alt={currentUser.name}
                  onError={(e) => handleAvatarImageError(e, currentUser)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Storefront Icon + "ស្វែងរកហាង និងភោជនីយដ្ឋាន" Page Heading */}
        <div className="relative z-10 mt-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/12 border border-white/25 flex items-center justify-center text-white shrink-0">
              <Store className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-base sm:text-lg text-white leading-tight truncate drop-shadow-xs">
                {tr(language, 'ស្វែងរកហាង និងភោជនីយដ្ឋាន', 'Find Restaurants & Shops', '搜索餐厅与店铺')}
              </h2>
              <p className="text-xs font-medium text-emerald-100/90 truncate">
                {tr(language, 'Restaurants & Shops', 'Cambodia Dining Directory', 'Restaurants & Shops')}
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                (window as any).__kft_admin_tab = 'restaurants';
                setIsAdminOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[11px] inline-flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}
        </div>

        {/* Row 3: White Pill Search Input + Green "នៅជិតខ្ញុំ" (Near Me) Button */}
        <div className="relative z-10 mt-3.5 flex items-center gap-2">
          <div className="flex-1 min-w-0 h-11 rounded-full bg-white px-3.5 shadow-md flex items-center gap-2 border border-white/80">
            <Search className="w-4 h-4 text-slate-600 shrink-0" />
            <input
              type="text"
              value={shopSearchQuery}
              onChange={(e) => setShopSearchQuery(e.target.value)}
              placeholder={tr(
                language,
                'ស្វែងរកហាង, ម្ហូប, តំបន់ ឬឈ្មោះ',
                'Search shops, dishes, areas or names...',
                '搜索店铺、菜品、地区或名称...'
              )}
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-[13px] font-bold text-slate-900 placeholder-slate-400 focus:outline-none truncate"
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
              className="p-1 text-[#0E6442] hover:text-[#08422A] shrink-0 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleNearMe}
            className={`h-11 px-3.5 rounded-full font-extrabold text-xs inline-flex items-center gap-1.5 shrink-0 shadow-md border transition active:scale-95 cursor-pointer ${
              nearMeActive
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : 'bg-[#166641] hover:bg-[#115334] text-white border-emerald-300/60'
            }`}
          >
            <MapPin className={`w-4 h-4 shrink-0 ${nearMeActive ? 'text-slate-950' : 'text-white'}`} />
            <span>{tr(language, 'នៅជិតខ្ញុំ', 'Near Me', '附近')}</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. MAIN ROUNDED SHEET CONTENT
          ===================================================================== */}
      <div className="relative z-10 -mt-3 rounded-t-[22px] bg-[#F3F5F3] px-3.5 pt-3 space-y-3">
        {/* Row 1: 5 Primary Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {primaryCategoryPills.map((cat) => {
            const Icon = cat.icon;
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`h-9 px-3 rounded-full text-xs font-extrabold whitespace-nowrap inline-flex items-center gap-1.5 border transition active:scale-95 cursor-pointer shrink-0 ${
                  active
                    ? 'bg-[#15653E] text-white border-[#15653E] shadow-xs'
                    : 'bg-white text-slate-800 border-slate-200/90 hover:border-emerald-500/50 shadow-2xs'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-[#15653E]'}`} />
                <span>{tr(language, cat.nameKh, cat.nameEn, cat.nameZh)}</span>
              </button>
            );
          })}
        </div>

        {/* Row 2: 4 Secondary Filter / Sort Chips (តំបន់/ខេត្ត, ប្រភេទម្ហូប, ការវាយតម្លៃ, កម្រៀប) */}
        <div className="grid grid-cols-4 gap-1.5">
          {/* Chip 1: Area / Province Select */}
          <label className="relative h-8 px-2 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-1 text-[11px] font-bold text-slate-800 cursor-pointer overflow-hidden">
            <span className="inline-flex items-center gap-1 min-w-0 truncate">
              <MapPin className="w-3 h-3 text-[#15653E] shrink-0" />
              <span className="truncate">
                {cleanSelectedProvince
                  ? language === 'km'
                    ? cleanSelectedProvince
                    : translateProvince(cleanSelectedProvince, language)
                  : tr(language, 'តំបន់/ខេត្ត', 'Area', '地区')}
              </span>
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
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

          {/* Chip 2: Cuisine Type Select */}
          <label className="relative h-8 px-2 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-1 text-[11px] font-bold text-slate-800 cursor-pointer overflow-hidden">
            <span className="inline-flex items-center gap-1 min-w-0 truncate">
              <Utensils className="w-3 h-3 text-[#15653E] shrink-0" />
              <span className="truncate">
                {(() => {
                  const found = cuisineOptions.find((c) => c.id === cuisineFilter) || cuisineOptions[0];
                  return tr(language, found.nameKh, found.nameEn, found.nameZh);
                })()}
              </span>
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
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

          {/* Chip 3: Rating Filter */}
          <button
            type="button"
            onClick={() =>
              setRatingFilter((prev) => (prev === 'all' ? '4.5' : prev === '4.5' ? '4.0' : 'all'))
            }
            className={`h-8 px-2 rounded-full border shadow-2xs flex items-center justify-between gap-1 text-[11px] font-bold transition cursor-pointer ${
              ratingFilter !== 'all'
                ? 'bg-emerald-50 border-emerald-500 text-[#0F5338]'
                : 'bg-white border-slate-200/90 text-slate-800'
            }`}
          >
            <span className="inline-flex items-center gap-1 min-w-0 truncate">
              <Star className="w-3 h-3 text-[#15653E] shrink-0" />
              <span className="truncate">
                {ratingFilter === 'all'
                  ? tr(language, 'ការវាយតម្លៃ', 'Rating', '评分')
                  : `${ratingFilter}+ ⭐`}
              </span>
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
          </button>

          {/* Chip 4: Sort Mode */}
          <button
            type="button"
            onClick={() =>
              setSortMode((prev) =>
                prev === 'popular' ? 'nearest' : prev === 'nearest' ? 'rating' : 'popular'
              )
            }
            className={`h-8 px-2 rounded-full border shadow-2xs flex items-center justify-center gap-1 text-[11px] font-bold transition cursor-pointer ${
              sortMode !== 'popular'
                ? 'bg-emerald-50 border-emerald-500 text-[#0F5338]'
                : 'bg-white border-slate-200/90 text-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3 text-[#15653E] shrink-0" />
            <span className="truncate">
              {sortMode === 'popular'
                ? tr(language, 'កម្រៀប', 'Sort', '排序')
                : sortMode === 'nearest'
                ? tr(language, 'ជិតបំផុត', 'Nearest', '最近')
                : tr(language, 'ពិន្ទុខ្ពស់', 'Top Rated', '最高分')}
            </span>
          </button>
        </div>

        {/* =====================================================================
            3. GREEN "ចុះបញ្ជីហាងរបស់អ្នក" PROMOTIONAL BANNER CARD
            ===================================================================== */}
        <div
          className="rounded-2xl p-3.5 shadow-md border border-emerald-400/35 relative overflow-hidden"
          style={{
            background: 'linear-gradient(125deg, #094B30 0%, #106240 55%, #0B4D32 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Custom 3D-Style Storefront Vector Illustration (Red/White Striped Awning + Warm Windows + Potted Plants) */}
            <div className="w-[96px] h-[78px] shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 120 96" className="w-full h-full drop-shadow-md" fill="none">
                {/* Ground Base */}
                <ellipse cx="60" cy="88" rx="52" ry="6" fill="#052E1D" fillOpacity="0.55" />
                <rect x="16" y="81" width="88" height="5" rx="2.5" fill="#D6D3D1" />

                {/* Shop Building Body */}
                <rect x="24" y="30" width="72" height="52" rx="4" fill="#F5F5F4" stroke="#D6D3D1" strokeWidth="1.5" />
                <rect x="28" y="34" width="64" height="47" fill="#E7E5E4" />

                {/* Warm Lit Shop Door & Window */}
                <rect x="33" y="44" width="22" height="37" rx="2" fill="#78350F" />
                <rect x="36" y="47" width="16" height="22" rx="1" fill="#FDE68A" />
                <circle cx="52" cy="64" r="1.3" fill="#FBBF24" />

                <rect x="59" y="44" width="29" height="24" rx="2" fill="#78350F" />
                <rect x="61.5" y="46.5" width="24" height="19" rx="1" fill="#FEF08A" />
                <line x1="73.5" y1="46.5" x2="73.5" y2="65.5" stroke="#92400E" strokeWidth="1.5" />
                <line x1="61.5" y1="56" x2="85.5" y2="56" stroke="#92400E" strokeWidth="1.5" />

                {/* Wooden Produce Stand */}
                <rect x="62" y="70" width="25" height="11" rx="1.5" fill="#B45309" />
                <rect x="60" y="68" width="29" height="3.5" rx="1" fill="#D97706" />

                {/* Roof Cap */}
                <rect x="21" y="20" width="78" height="6" rx="2" fill="#E7E5E4" />

                {/* Red & White Striped Awning */}
                <path d="M22 25H98L103 39H17L22 25Z" fill="#EF4444" />
                <path d="M31 25H40L38 39H28L31 25Z" fill="#FFFFFF" />
                <path d="M49 25H58L57 39H47L49 25Z" fill="#FFFFFF" />
                <path d="M67 25H76L77 39H67L67 25Z" fill="#FFFFFF" />
                <path d="M85 25H94L97 39H87L85 25Z" fill="#FFFFFF" />
                {/* Scalloped Awning Bottom Edge */}
                <path
                  d="M17 39C19.5 42.5 24.5 42.5 27 39C29.5 42.5 34.5 42.5 37 39C39.5 42.5 44.5 42.5 47 39C49.5 42.5 54.5 42.5 57 39C59.5 42.5 64.5 42.5 67 39C69.5 42.5 74.5 42.5 77 39C79.5 42.5 84.5 42.5 87 39C89.5 42.5 94.5 42.5 97 39C99 41.5 101.5 41.5 103 39"
                  fill="#DC2626"
                />

                {/* Left Potted Plant */}
                <rect x="14" y="72" width="10" height="10" rx="2" fill="#D97706" />
                <circle cx="19" cy="64" r="8" fill="#16A34A" />
                <circle cx="15" cy="66" r="5.5" fill="#22C55E" />
                <circle cx="22" cy="66" r="5.5" fill="#15803D" />

                {/* Right Potted Plant */}
                <rect x="95" y="73" width="9" height="9" rx="2" fill="#D97706" />
                <circle cx="99.5" cy="66" r="7" fill="#16A34A" />
                <circle cx="97" cy="67" r="5" fill="#22C55E" />
              </svg>
            </div>

            {/* Right Text & Gold CTA Button */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <h3 className="font-extrabold text-[15px] sm:text-base text-white leading-tight">
                {tr(language, 'ចុះបញ្ជីហាងរបស់អ្នក', 'Register Your Shop', '登记您的店铺')}
              </h3>
              <p className="text-[11px] text-emerald-100/95 leading-snug">
                {tr(
                  language,
                  'បង្ហាញហាងភោជនីយដ្ឋានរបស់អ្នកនៅលើកម្មវិធី',
                  'Showcase your restaurant or shop on the app',
                  '在应用上展示您的餐厅或店铺'
                )}
              </p>
              <button
                type="button"
                onClick={handleAddShopClick}
                style={{
                  background: 'linear-gradient(180deg, #FDE047 0%, #EAB308 100%)',
                }}
                className="w-full py-2 px-4 rounded-full text-slate-950 font-extrabold text-xs sm:text-[13px] shadow-md inline-flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>{tr(language, 'បន្ថែមហាងថ្មី', 'Add New Shop', '添加新店铺')}</span>
              </button>
            </div>
          </div>

          {/* Owner / Admin Quick Controls */}
          {isAdmin ? (
            <div className="mt-2.5 pt-2 border-t border-white/15 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  (window as any).__kft_admin_tab = 'restaurants';
                  setIsAdminOpen(true);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">{tr(language, 'គ្រប់គ្រងហាងទាំងអស់', 'Manage All Shops', '管理全部店铺')}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRestaurantCheckInModalOpen(true)}
                className="py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-50 border border-white/15 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="truncate">{tr(language, 'ឆែកអ៊ីន & បញ្ជាក់ GPS', 'GPS Check-In', 'GPS 实地核验')}</span>
              </button>
            </div>
          ) : myExistingRest ? (
            <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 text-[11px] font-bold text-amber-200 truncate">
                {tr(
                  language,
                  `ហាងរបស់ខ្ញុំ៖ ${myExistingRest.nameKh}`,
                  `My Shop: ${myExistingRest.nameEn || myExistingRest.nameKh}`,
                  `我的店铺：${myExistingRest.nameEn || myExistingRest.nameKh}`
                )}
              </span>
              <button
                type="button"
                onClick={() => openManageMyVipStore(myExistingRest.id)}
                className="py-1 px-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-300" />
                <span>{tr(language, 'កែប្រែហាងខ្ញុំ', 'Edit My Shop', '编辑我的店铺')}</span>
              </button>
            </div>
          ) : null}
        </div>

        {/* =====================================================================
            4. SHOP LISTINGS (Section 1: ហាងពេញនិយមជិតខ្ញុំ + Section 2: បញ្ជីហាងបន្ថែម)
            ===================================================================== */}
        {sortedRestaurants.length > 0 ? (
          <div className="space-y-4">
            {/* Section 1: ហាងពេញនិយមជិតខ្ញុំ (Popular Shops Near Me) */}
            {featuredRestaurants.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-5 h-5 text-orange-500 fill-orange-400 shrink-0" />
                    <h3 className="font-extrabold text-[15px] sm:text-base text-slate-900">
                      {tr(language, 'ហាងពេញនិយមជិតខ្ញុំ', 'Popular Shops Near Me', '附近热门店铺')}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllFeatured((prev) => !prev)}
                    className="text-xs font-extrabold text-[#15653E] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>
                      {showAllFeatured
                        ? tr(language, 'បង្រួមវិញ', 'Show Less', '收起')
                        : tr(language, 'មើលទាំងអស់', 'See All', '查看全部')}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
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
                <div className="flex items-center gap-2 pt-1">
                  <Store className="w-5 h-5 text-[#15653E] shrink-0" />
                  <h3 className="font-extrabold text-[15px] sm:text-base text-slate-900">
                    {tr(language, 'បញ្ជីហាងបន្ថែម', 'More Shops Directory', '更多店铺列表')}
                  </h3>
                </div>

                <div className="space-y-2">
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
                      className="px-5 py-2.5 rounded-full bg-[#15653E] hover:bg-[#105232] text-white text-xs font-extrabold shadow-xs cursor-pointer transition"
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
          <div className="py-12 px-4 text-center bg-white rounded-3xl border border-slate-200/90 text-slate-500 space-y-2.5 shadow-2xs">
            <Store className="w-10 h-10 mx-auto text-slate-300" strokeWidth={1.75} />
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#15653E] text-white text-xs font-bold cursor-pointer"
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

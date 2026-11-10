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
import { handleAvatarImageError } from '../utils/avatarHelper';

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

  return (
    <div className="max-w-md mx-auto bg-[#F3F5F3] text-slate-900 min-h-full font-khmer pb-8">
      {/* =====================================================================
          1. TOP EMERALD & ANGKOR WAT HERO HEADER (Matching OK.jpg Top-to-Bottom)
          ===================================================================== */}
      <div
        className="relative w-full overflow-hidden pt-2.5 pb-6 px-3.5 select-none"
        style={{
          background: 'linear-gradient(135deg, #063822 0%, #0A4D31 48%, #12613E 100%)',
          paddingTop: 'calc(var(--kft-safe-top, 0px) + 10px)',
        }}
      >
        {/* Right-side Angkor Wat Temple & Palm Trees Photo Backdrop (Matching OK.jpg) */}
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
              {hasCustomPhotoAvatar && currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  onError={(e) => handleAvatarImageError(e, currentUser)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="9" r="3.6" />
                  <path d="M5.5 19.2c1.2-3.1 3.6-4.7 6.5-4.7s5.3 1.6 6.5 4.7a7.8 7.8 0 0 1-13 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Storefront Icon + "ស្វែងរកហាង និងភោជនីយដ្ឋាន" Page Heading (Matching OK.jpg) */}
        <div className="relative z-10 mt-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg
              className="w-9 h-9 text-white shrink-0 drop-shadow-xs"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M5 13L7.5 6.5H28.5L31 13"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4.5 13H31.5V15.2C31.5 17.2 29.9 18.8 27.9 18.8C25.9 18.8 24.3 17.2 24.3 15.2C24.3 17.2 22.7 18.8 20.7 18.8C18.7 18.8 17.1 17.2 17.1 15.2C17.1 17.2 15.5 18.8 13.5 18.8C11.5 18.8 9.9 17.2 9.9 15.2C9.9 17.2 8.3 18.8 6.3 18.8C4.8 18.8 4.5 17.2 4.5 15.2V13Z"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <path
                d="M7.5 18.8V29.5H28.5V18.8"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect x="11.5" y="22.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
              <line x1="22.5" y1="22.5" x2="25.5" y2="22.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="min-w-0">
              <h2
                className="font-extrabold text-[17px] sm:text-[18px] text-white leading-tight truncate"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}
              >
                {tr(language, 'ស្វែងរកហាង និងភោជនីយដ្ឋាន', 'Find Restaurants & Shops', '搜索餐厅与店铺')}
              </h2>
              <p
                className="text-xs font-semibold text-emerald-50/95 truncate"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
              >
                Restaurants &amp; Shops
              </p>
            </div>
          </div>
        </div>

        {/* Row 3: White Pill Search Input + Green "នៅជិតខ្ញុំ" Near Me Pill Button */}
        <div className="relative z-10 mt-3 flex items-center gap-2">
          <div className="flex-1 min-w-0 h-11 rounded-full bg-white shadow-md flex items-center pl-3.5 pr-2.5 gap-2 border border-white">
            <Search className="w-5 h-5 text-slate-800 shrink-0" strokeWidth={2.3} />
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
              <Mic className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleNearMe}
            className={`h-11 px-3.5 rounded-full font-extrabold text-xs inline-flex items-center gap-1.5 shrink-0 shadow-md border-[1.5px] transition active:scale-95 cursor-pointer ${
              nearMeActive
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : 'bg-[#135E3B] hover:bg-[#0F4D30] text-white border-emerald-300/70'
            }`}
          >
            <MapPin className={`w-4 h-4 shrink-0 ${nearMeActive ? 'text-slate-950' : 'text-white fill-white/20'}`} strokeWidth={2.2} />
            <span>{tr(language, 'នៅជិតខ្ញុំ', 'Near Me', '附近')}</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. MAIN ROUNDED SHEET CONTENT (Matching OK.jpg)
          ===================================================================== */}
      <div className="relative z-10 -mt-3 rounded-t-[24px] bg-[#F3F5F3] px-3 pt-3 space-y-2.5">
        {/* Row 1: 5 Primary Category Pills (All 5 visible on 1 row matching OK.jpg) */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {primaryCategoryPills.map((cat) => {
            const Icon = cat.icon;
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`h-8.5 px-2.5 rounded-full text-[11px] font-extrabold whitespace-nowrap inline-flex items-center justify-center gap-1 border transition active:scale-95 cursor-pointer shrink-0 ${
                  active
                    ? 'bg-[#15653E] text-white border-[#15653E] shadow-xs'
                    : 'bg-white text-slate-800 border-slate-200/90 hover:border-emerald-500/50 shadow-2xs'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-[#15653E]'}`} strokeWidth={2} />
                <span>{tr(language, cat.nameKh, cat.nameEn, cat.nameZh)}</span>
              </button>
            );
          })}
        </div>

        {/* Row 2: 4 Secondary Filter / Sort Chips (តំបន់/ខេត្ត, ប្រភេទម្ហូប, ការវាយតម្លៃ, កម្រៀប - Full text, no truncation) */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          {/* Chip 1: Area / Province Select */}
          <label className="relative h-8 px-2.5 rounded-full bg-white border border-slate-200/90 shadow-2xs inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 cursor-pointer whitespace-nowrap shrink-0">
            <MapPin className="w-3 h-3 text-[#15653E] shrink-0" strokeWidth={2.2} />
            <span>
              {cleanSelectedProvince
                ? language === 'km'
                  ? cleanSelectedProvince
                  : translateProvince(cleanSelectedProvince, language)
                : tr(language, 'តំបន់/ខេត្ត', 'Area', '地区')}
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
          <label className="relative h-8 px-2.5 rounded-full bg-white border border-slate-200/90 shadow-2xs inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 cursor-pointer whitespace-nowrap shrink-0">
            <Utensils className="w-3 h-3 text-[#15653E] shrink-0" strokeWidth={2.2} />
            <span>
              {(() => {
                const found = cuisineOptions.find((c) => c.id === cuisineFilter) || cuisineOptions[0];
                return tr(language, found.nameKh, found.nameEn, found.nameZh);
              })()}
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

          {/* Chip 3: Rating Filter (Full "ការវាយតម្លៃ" text visible matching OK.jpg) */}
          <button
            type="button"
            onClick={() =>
              setRatingFilter((prev) => (prev === 'all' ? '4.5' : prev === '4.5' ? '4.0' : 'all'))
            }
            className={`h-8 px-2.5 rounded-full border shadow-2xs inline-flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
              ratingFilter !== 'all'
                ? 'bg-emerald-50 border-emerald-500 text-[#0F5338]'
                : 'bg-white border-slate-200/90 text-slate-800'
            }`}
          >
            <Star className="w-3 h-3 text-[#15653E] shrink-0" strokeWidth={2.2} />
            <span>
              {ratingFilter === 'all'
                ? tr(language, 'ការវាយតម្លៃ', 'Rating', '评分')
                : `${ratingFilter}+ ⭐`}
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
            className={`h-8 px-2.5 rounded-full border shadow-2xs inline-flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
              sortMode !== 'popular'
                ? 'bg-emerald-50 border-emerald-500 text-[#0F5338]'
                : 'bg-white border-slate-200/90 text-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3 text-[#15653E] shrink-0" strokeWidth={2.2} />
            <span>
              {sortMode === 'popular'
                ? tr(language, 'កម្រៀប', 'Sort', '排序')
                : sortMode === 'nearest'
                ? tr(language, 'ជិតបំផុត', 'Nearest', '最近')
                : tr(language, 'ពិន្ទុខ្ពស់', 'Top Rated', '最高分')}
            </span>
          </button>
        </div>

        {/* =====================================================================
            3. GREEN "ចុះបញ្ជីហាងរបស់អ្នក" PROMOTIONAL BANNER CARD (Matching OK.jpg)
            ===================================================================== */}
        <div
          className="rounded-2xl p-3 shadow-md border border-emerald-400/35 relative overflow-hidden"
          style={{
            background: 'linear-gradient(125deg, #08442B 0%, #0E5D3B 55%, #0A4A30 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Left 3D-Style Red & White Striped Awning Storefront Illustration with Potted Plants */}
            <div className="w-[100px] h-[82px] shrink-0 flex items-center justify-center select-none">
              <svg viewBox="0 0 120 96" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Ground Shadow Platform */}
                <ellipse cx="60" cy="87" rx="52" ry="6" fill="#042818" fillOpacity="0.65" />
                <ellipse cx="60" cy="85" rx="46" ry="4.5" fill="#1F7A4C" />
                {/* Building Body */}
                <rect x="24" y="34" width="70" height="49" rx="3" fill="#F5EFE6" stroke="#D6C7B2" strokeWidth="1.5" />
                {/* Side Wall 3D Depth */}
                <path d="M24 34L17 38V80L24 83V34Z" fill="#DFD3C3" />
                {/* Door with Warm Light */}
                <rect x="33" y="47" width="20" height="36" rx="1.5" fill="#7C4D2B" stroke="#5C371E" strokeWidth="1.5" />
                <rect x="36" y="50" width="14" height="18" rx="1" fill="#FDE68A" />
                <circle cx="50" cy="66" r="1.3" fill="#FDE047" />
                {/* Right Shop Window with Warm Glow */}
                <rect x="59" y="47" width="27" height="22" rx="2" fill="#FEF08A" stroke="#7C4D2B" strokeWidth="2" />
                <line x1="72.5" y1="47" x2="72.5" y2="69" stroke="#7C4D2B" strokeWidth="1.5" />
                <line x1="59" y1="58" x2="86" y2="58" stroke="#7C4D2B" strokeWidth="1.5" />
                {/* Wooden Counter / Fruit Display Below Window */}
                <rect x="61" y="72" width="24" height="10" rx="1.5" fill="#B45309" stroke="#78350F" strokeWidth="1.2" />
                <circle cx="67" cy="71" r="2.5" fill="#EF4444" />
                <circle cx="73" cy="71" r="2.5" fill="#F59E0B" />
                <circle cx="79" cy="71" r="2.5" fill="#22C55E" />
                {/* Roof Cornice */}
                <rect x="21" y="16" width="76" height="5" rx="2" fill="#E7Dec8" />
                {/* Red & White Striped Awning */}
                <path d="M22 20H96L102 35H16L22 20Z" fill="#FFFFFF" stroke="#B91C1C" strokeWidth="1" />
                <path d="M22 20H32L30 35H16L22 20Z" fill="#DC2626" />
                <path d="M41 20H51L51 35H39L41 20Z" fill="#DC2626" />
                <path d="M60 20H70L72 35H60L60 20Z" fill="#DC2626" />
                <path d="M79 20H89L94 35H82L79 20Z" fill="#DC2626" />
                {/* Awning Scallops */}
                <path
                  d="M16 35C16 38 23 38 23 35C23 38 30 38 30 35C30 38 38 38 38 35C38 38 45 38 45 35C45 38 53 38 53 35C53 38 60 38 60 35C60 38 68 38 68 35C68 38 75 38 75 35C75 38 83 38 83 35C83 38 91 38 91 35C91 38 102 38 102 35"
                  fill="#B91C1C"
                />
                {/* Left Potted Bush */}
                <circle cx="14" cy="60" r="8" fill="#16A34A" />
                <circle cx="10" cy="65" r="6" fill="#22C55E" />
                <circle cx="18" cy="65" r="6" fill="#15803D" />
                <rect x="10" y="72" width="9" height="10" rx="2" fill="#D97706" />
                {/* Right Potted Bush */}
                <circle cx="103" cy="63" r="7" fill="#16A34A" />
                <circle cx="99" cy="67" r="5" fill="#22C55E" />
                <circle cx="107" cy="67" r="5" fill="#15803D" />
                <rect x="99" y="73" width="8" height="9" rx="2" fill="#D97706" />
              </svg>
            </div>

            {/* Right Banner Text & Golden CTA Button */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div>
                <h3 className="font-extrabold text-[15px] sm:text-base text-white leading-tight">
                  {tr(language, 'ចុះបញ្ជីហាងរបស់អ្នក', 'Register Your Shop', '入驻您的餐厅店铺')}
                </h3>
                <p className="text-[11px] font-medium text-emerald-100/95 leading-snug mt-0.5">
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
                }}
                className="w-full h-9 px-4 rounded-full text-slate-950 font-extrabold text-xs sm:text-[13px] inline-flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.6] text-slate-950" />
                <span>{tr(language, 'បន្ថែមហាងថ្មី', 'Add New Shop', '添加新店铺')}</span>
              </button>
            </div>
          </div>

          {/* Admin / Existing Shop Owner Quick Actions */}
          {isAdmin ? (
            <div className="mt-2.5 pt-2 border-t border-white/15 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  (window as any).__kft_admin_tab = 'shops';
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
          <div className="space-y-3.5">
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
                    className="text-xs font-extrabold text-slate-800 hover:text-[#15653E] inline-flex items-center gap-0.5 cursor-pointer"
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
                <div className="flex items-center gap-2 pt-0.5">
                  <Store className="w-5 h-5 text-[#15653E] shrink-0" strokeWidth={2.2} />
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

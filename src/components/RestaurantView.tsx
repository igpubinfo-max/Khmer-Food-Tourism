import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RestaurantCard } from './RestaurantCard';
import { AngkorHeroTopHeader } from './AngkorHeroTopHeader';
import {
  Restaurant,
  sortRestaurantsWithVipRotation,
  getVipFeaturedRotationState,
  isSeedRestaurantId,
  hasApprovedShopPhoto,
  getRestaurantApprovedAtMs,
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
  X,
  LayoutGrid,
  Utensils,
  Coffee,
  CupSoda,
  Sandwich,
  Plus,
  ChevronRight,
  Flame,
  Filter,
} from 'lucide-react';
import { isVipOwnerListing } from './listing/ListingUI';
import { normalizeKhmerSearchText } from '../services/googlePlacesService';
import { analyzeSearchQuery, scoreSearchRecord, restaurantSearchFields } from '../utils/searchEngine';
import { tr } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { DISH_PROVINCES, matchShopToProductQuery, verifyShopDataForDisplay } from '../utils/foodFilters';
import { parseSmartSearchIntent } from '../utils/aiSearchBridge';
import { handleAvatarImageError } from '../utils/avatarHelper';
import { smoothScrollToElement } from '../utils/smoothScroll';

const RESTAURANT_BATCH_SIZE = 24;

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
    setLanguage,
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
  const [cuisineFilter] = useState<string>('all');
  const [ratingFilter] = useState<'all' | '4.5' | '4.0'>('all');
  const [sortMode, setSortMode] = useState<'popular' | 'nearest' | 'rating'>('popular');
  const [nearMeActive, setNearMeActive] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showAllFeatured, setShowAllFeatured] = useState<boolean>(false);
  const [shopSearchQuery, setShopSearchQuery] = useState<string>('');
  const [debouncedShopSearchQuery, setDebouncedShopSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(RESTAURANT_BATCH_SIZE);
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [nowTickMs, setNowTickMs] = useState<number>(() => Date.now());
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const shopListStartRef = useRef<HTMLDivElement | null>(null);
  const shopCategoryCardRef = useRef<HTMLDivElement | null>(null);

  const scrollToShopList = (keepCategoriesVisible = false) => {
    if (keepCategoriesVisible && shopCategoryCardRef.current) {
      smoothScrollToElement(shopCategoryCardRef.current, { offsetTop: 8, onlyIfOutOfView: true });
      return;
    }
    smoothScrollToElement(shopListStartRef.current, { offsetTop: 10 });
  };

  const handleExecuteShopSearch = () => {
    setDebouncedShopSearchQuery(shopSearchQuery);
    searchInputRef.current?.blur();
    scrollToShopList();
  };

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
      return /ភេសជ្ជៈ|តែគុជ|ទឹកក្រឡុក|ទឹកផ្លែឈើ|ការ៉េម|boba|tea|chagee|koi|mixue|smoothie|juice|drink|cafe|កាហ្វេ/.test(
        text
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

  // 6 Premium 3D Gold-Bordered Category Buttons in 3x2 Grid
  const primaryCategoryPills = [
    {
      id: 'all',
      nameKh: 'ទាំងអស់',
      nameEn: 'All Shops',
      nameZh: '全部店铺',
      icon: LayoutGrid,
      imageSrc: '/categories/shop_cat_all.png',
      accentColor: '#F59E0B',
    },
    {
      id: 'restaurant_dining',
      nameKh: 'ភោជនីយដ្ឋាន',
      nameEn: 'Restaurants',
      nameZh: '餐厅',
      icon: Utensils,
      imageSrc: '/categories/shop_cat_restaurant.png',
      accentColor: '#22C55E',
    },
    {
      id: 'cafe_bistro',
      nameKh: 'កាហ្វេ',
      nameEn: 'Café',
      nameZh: '咖啡馆',
      icon: Coffee,
      imageSrc: '/categories/shop_cat_cafe.png',
      accentColor: '#F43F5E',
    },
    {
      id: 'drinks_boba',
      nameKh: 'ភេសជ្ជៈ',
      nameEn: 'Drinks',
      nameZh: '饮品',
      icon: CupSoda,
      imageSrc: '/categories/shop_cat_drinks.png',
      accentColor: '#3B82F6',
    },
    {
      id: 'fast_street',
      nameKh: 'អាហាររហ័ស',
      nameEn: 'Fast Food',
      nameZh: '快餐小吃',
      icon: Sandwich,
      imageSrc: '/categories/shop_cat_fastfood.png',
      accentColor: '#EAB308',
    },
    {
      id: 'near_me_toggle',
      nameKh: 'នៅជិតខ្ញុំ',
      nameEn: 'Near Me',
      nameZh: '附近店铺',
      icon: MapPin,
      imageSrc: '/categories/shop_cat_nearme.png',
      accentColor: '#14B8A6',
    },
  ];

  useEffect(() => {
    setVisibleCount(RESTAURANT_BATCH_SIZE);
  }, [selectedProvince, priceFilter, categoryFilter, cuisineFilter, ratingFilter, sortMode, shopSearchQuery]);

  const sessionShuffledRestaurants = useMemo(
    () => shuffleForCurrentSession(restaurants),
    [restaurants]
  );

  const validDirectoryRestaurants = useMemo(() => {
    const seenIds = new Set<string>();
    const seenNameKeys = new Set<string>();
    // Prioritize non-seed (user/VIP-submitted) shops before seed shops so duplicates never shadow user submissions
    const customFirst = [
      ...sessionShuffledRestaurants.filter((r) => r && !isSeedRestaurantId(r.id)),
      ...sessionShuffledRestaurants.filter((r) => r && isSeedRestaurantId(r.id)),
    ];
    return customFirst.filter((r) => {
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
      const normNameKey = `${normalizeKhmerSearchText(r.nameKh || r.nameEn || '')}::${(r.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
      if (normNameKey.length > 3 && seenNameKeys.has(normNameKey)) return false;
      seenIds.add(idStr);
      if (normNameKey.length > 3) seenNameKeys.add(normNameKey);
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
        const subCatKey = classifyRestaurantCategory(r);
        const extraCatLabels =
          subCatKey === 'cafe_bistro'
            ? 'កាហ្វេ cafe coffee bistro តែគុជ ភេសជ្ជៈ drinks boba 咖啡 饮品'
            : subCatKey === 'bbq_grill'
              ? 'សាច់អាំង bbq grill ភោជនីយដ្ឋាន restaurant 烧烤 餐厅'
              : subCatKey === 'seafood_riverside'
                ? 'គ្រឿងសមុទ្រ seafood មាត់ទន្លេ riverside ភោជនីយដ្ឋាន restaurant 海鲜 餐厅'
                : 'ភោជនីយដ្ឋាន អាហារដ្ឋាន ហាងអាហារ អាហាររហ័ស restaurant dining fast food 餐厅 快餐';
        const searchFields = restaurantSearchFields(r, [getLocalizedRestaurant(r, 'zh').name]);
        searchFields.categories = [...(searchFields.categories || []), extraCatLabels];
        const nameDetail = scoreSearchRecord(analyzed, searchFields);
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

  const rotationState = useMemo(
    () => getVipFeaturedRotationState(validDirectoryRestaurants, users, appSettings, nowTickMs),
    [validDirectoryRestaurants, users, appSettings, nowTickMs]
  );

  const { featuredRestaurants, directoryRestaurants } = useMemo(() => {
    if (sortedRestaurants.length === 0) {
      return { featuredRestaurants: [], directoryRestaurants: [] };
    }

    const activeRotatingShopId =
      rotationState.eligibleQueue.length > 0
        ? rotationState.eligibleQueue[rotationState.currentSlotIndex % rotationState.eligibleQueue.length]?.id
        : null;

    // Score eligible shops according to the app's existing ranking criteria (not submission time alone):
    // 1. Active manual schedule / 24h VIP boost (`currentlyFeaturedIds`)
    // 2. Fair VIP rotation slot (`activeRotatingShopId`)
    // 3. Eligible VIP / user-submitted shop status (`isVipOwnerListing` / `!isSeedRestaurantId`)
    // 4. Verified custom shop photo (`hasApprovedShopPhoto`)
    // 5. Rating & review count quality score
    const computeShopRankScore = (r: Restaurant): number => {
      let score = 0;
      if (rotationState.primaryFeaturedShop?.restaurant.id === r.id) score += 10000;
      else if (rotationState.currentlyFeaturedIds.has(r.id)) score += 8000;
      if (activeRotatingShopId && r.id === activeRotatingShopId) score += 5000;
      if (isVipOwnerListing(r)) score += 2000;
      if (!isSeedRestaurantId(r.id)) score += 1000;
      if (hasApprovedShopPhoto(r)) score += 500;
      score += Number(r.rating || 4.5) * 40;
      score += Math.min(200, Number(r.reviewCount || 0) * 0.25);
      return score;
    };

    const isDefaultOrder = !debouncedShopSearchQuery.trim() && sortMode === 'popular';
    const eligibleList = sortedRestaurants.filter((r) => isVipOwnerListing(r) || !isSeedRestaurantId(r.id));
    const regularList = sortedRestaurants.filter((r) => !isVipOwnerListing(r) && isSeedRestaurantId(r.id));

    if (isDefaultOrder && eligibleList.length > 1) {
      eligibleList.sort((a, b) => {
        const diff = computeShopRankScore(b) - computeShopRankScore(a);
        if (Math.abs(diff) > 0.01) return diff;
        return getRestaurantApprovedAtMs(b) - getRestaurantApprovedAtMs(a);
      });
    }

    const orderedAll = isDefaultOrder ? [...eligibleList, ...regularList] : sortedRestaurants;
    const targetFeaturedCount = showAllFeatured ? Math.min(12, Math.max(4, eligibleList.length)) : 1;
    const featured = orderedAll.slice(0, targetFeaturedCount);
    const featuredIds = new Set<string>(featured.map((r) => r.id));
    const directory = orderedAll.filter((r) => !featuredIds.has(r.id));
    return { featuredRestaurants: featured, directoryRestaurants: directory };
  }, [sortedRestaurants, showAllFeatured, rotationState, debouncedShopSearchQuery, sortMode]);

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
      (currentUser.avatar.startsWith('http') ||
        currentUser.avatar.startsWith('data:image/') ||
        currentUser.avatar.startsWith('/'))
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
    <div className="w-full max-w-6xl mx-auto bg-[#1E293B] text-white min-h-full font-khmer pb-20">
      {/* 1. Shared Master Hero Header with Free Account Status Badge (100% Matching Food Menu) */}
      <AngkorHeroTopHeader mode="food" />

      {/* 2. MAIN CONTENT CONTAINER rising smoothly from the Angkor Wat reflection (100% Matching Food Menu) */}
      <div className="relative z-20 -mt-[82px] px-2.5 min-[360px]:px-3.5 sm:px-5 space-y-2.5">
        {/* Compact Khmer Promotional Title Banner (Aligned Left) */}
        <div className="flex items-center justify-start pl-0.5 sm:pl-1">
          <div className="relative py-1 pl-1 pr-2 bg-transparent inline-flex items-center gap-2.5 max-w-[65%] min-w-0">
            {/* Left Yellow Shop / Restaurant Icon */}
            <div
              style={{
                background: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 100%)',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.26), inset 0 1px 1px rgba(255, 255, 255, 0.65)',
              }}
              className="relative z-10 w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
            >
              <Store className="w-4 h-4 text-[#042F2E]" strokeWidth={2.4} />
            </div>

            {/* Thin Vertical Divider Line */}
            <span className="relative z-10 h-6 w-px bg-white/35 shrink-0" aria-hidden="true" />

            {/* Shop & Restaurant Title & Subtitle */}
            <div className="relative z-10 min-w-0">
              <h2
                className="font-khmer font-extrabold text-white leading-[1.65] py-0.5 break-words"
                style={{ fontSize: 'clamp(13.8px, 3.96vw, 16.2px)', textShadow: '0 1px 3px rgba(0, 0, 0, 0.65)' }}
              >
                {tr(language, 'ហាងអាហារ និងកាហ្វេ', 'Restaurants & Cafés', '餐厅与美食店铺')}
              </h2>
              <p
                className="font-khmer font-bold text-[#FDE68A] leading-[1.62] py-0.5 break-words"
                style={{ fontSize: 'clamp(11px, 3.12vw, 13.2px)', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)' }}
              >
                {tr(
                  language,
                  'ហាងល្បីៗ និងទីតាំងជិតអ្នកគ្រប់ខេត្ត',
                  'Top shops & nearby dining in all provinces',
                  '探索全柬热门餐厅、咖啡馆与附近店铺'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Row 1: Main Search Bar – Compact Left-Aligned (~60% Width, Shrunk 40% from Right to Left) + Separate Green Filter Button */}
        <div className="w-full flex items-center gap-1.5 min-[360px]:gap-2 min-w-0">
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 6px 20px rgba(15, 23, 42, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
            }}
            className="flex-1 min-w-0 h-[44px] rounded-full border-[1.5px] border-white pl-2.5 min-[360px]:pl-3.5 pr-1.5 flex items-center gap-1.5 min-[360px]:gap-2"
          >
            <Search className="w-4 h-4 min-[360px]:w-4.5 min-[360px]:h-4.5 text-slate-600 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              size={1}
              value={shopSearchQuery}
              onChange={(e) => setShopSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleExecuteShopSearch();
                }
              }}
              placeholder={tr(
                language,
                'ស្វែងរកឈ្មោះហាង ប្រភេទហាង ឬទីតាំង...',
                'Search shop name, category, or location...',
                '搜索店铺名称、类型或位置...'
              )}
              className="w-full flex-1 min-w-0 bg-transparent text-[12px] min-[360px]:text-[13px] font-khmer font-bold text-[#1E293B] placeholder:text-slate-500 focus:outline-none"
            />
            {shopSearchQuery && (
              <button
                type="button"
                onClick={() => setShopSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                aria-label={tr(language, 'សម្អាត', 'Clear', '清除')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleExecuteShopSearch}
              className="kft-btn-search-inline"
            >
              <Search className="w-3.5 h-3.5 text-white stroke-[2.4] shrink-0" />
              <span>{tr(language, 'ស្វែងរក', 'Search', '搜索')}</span>
            </button>
          </div>

          {/* Separate Circular Green Filter Icon Button (100% Matching Food Menu) */}
          <button
            type="button"
            onClick={() => setShowFilterDrawer((prev) => !prev)}
            style={{
              background: 'linear-gradient(180deg, #2E7D52 0%, #1B5E3A 100%)',
              boxShadow: '0 6px 16px rgba(15, 23, 42, 0.16)',
            }}
            className={`relative w-[44px] h-[44px] rounded-full border-[2px] border-white flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer text-white ${
              showFilterDrawer || cleanSelectedProvince || categoryFilter !== 'all' || nearMeActive
                ? 'ring-2 ring-[#22C55E]'
                : ''
            }`}
            title={tr(language, 'តម្រងហាងអាហារ', 'Filter Shops', '筛选店铺')}
          >
            <Filter className="w-4.5 h-4.5 stroke-[2.2]" />
            {(Boolean(cleanSelectedProvince) || categoryFilter !== 'all' || nearMeActive) && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
            )}
          </button>
        </div>

        {/* Collapsible Shop Filter Drawer (Province + Category + Near Me GPS) */}
        {showFilterDrawer && (
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm space-y-3 text-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900">
                {tr(language, 'តម្រងស្វែងរកហាងអាហារ និងទីតាំង', 'Shop & Location Filters', '店铺与位置筛选')}
              </span>
              {(cleanSelectedProvince || categoryFilter !== 'all' || nearMeActive || shopSearchQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvince('ទាំងអស់');
                    setCategoryFilter('all');
                    setNearMeActive(false);
                    setSortMode('popular');
                    setShopSearchQuery('');
                    setDebouncedShopSearchQuery('');
                  }}
                  className="kft-btn-reset"
                >
                  <span>↺ {tr(language, 'កំណត់ឡើងវិញ', 'Reset', '重置')}</span>
                </button>
              )}
            </div>

            {/* Province Select */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#235D3A]" />
                <span>{tr(language, 'ជ្រើសរើសខេត្ត/រាជធានី (២៥ ខេត្ត-ក្រុង)៖', 'Filter by Province (25 Provinces):', '按省份/城市筛选（25个省市）：')}</span>
              </label>
              <select
                value={cleanSelectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value || 'ទាំងអស់');
                  scrollToShopList();
                }}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="">
                  {tr(language, 'គ្រប់រាជធានី-ខេត្តទាំង ២៥', 'All 25 Provinces & Capital', '全柬 25 个省市')}
                </option>
                {DISH_PROVINCES.map((p) => (
                  <option key={p.id} value={p.kh}>
                    {tr(language, p.fullKh, p.en, p.zh)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Row 2: 6 Premium 3D Gold-Bordered Category Buttons in 3x2 Layout with Clear White Text Below Each Illustration */}
        <div
          ref={shopCategoryCardRef}
          style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.96) 100%)',
            boxShadow: '0 10px 28px rgba(15, 23, 42, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
          }}
          className="w-full max-w-full min-w-0 rounded-[24px] p-2 min-[360px]:p-2.5 sm:p-3.5 border border-amber-400/25"
        >
          <div className="kft-cat-grid grid grid-cols-3 gap-x-1.5 min-[360px]:gap-x-2 sm:gap-x-3 gap-y-2 min-[360px]:gap-y-2.5 sm:gap-y-3 items-start">
            {primaryCategoryPills.map((cat) => {
              const active = cat.id === 'near_me_toggle' ? nearMeActive : categoryFilter === cat.id;
              const titleText = tr(language, cat.nameKh, cat.nameEn, cat.nameZh);
              return (
                <button
                  key={cat.id}
                  type="button"
                  id={`kft-shop-cat-${cat.id}-btn`}
                  onClick={() => {
                    if (cat.id === 'near_me_toggle') {
                      handleToggleNearMe();
                    } else if (cat.id === 'all') {
                      setCategoryFilter('all');
                      setNearMeActive(false);
                      setSortMode('popular');
                    } else {
                      setCategoryFilter(cat.id);
                    }
                    scrollToShopList(true);
                  }}
                  aria-pressed={active}
                  className="kft-cat-btn group relative flex flex-col items-center justify-start w-full max-w-full min-w-0 transition-transform duration-150 active:scale-[0.95] cursor-pointer focus:outline-none bg-transparent border-0 select-none"
                >
                  {/* 3D Gold-Bordered Category Illustration Button */}
                  <div
                    className="kft-cat-img-wrap relative w-full max-w-full min-w-0 min-h-0 aspect-[2.12/1] transition-all duration-200 rounded-[14px]"
                    style={{
                      filter: active
                        ? 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.72)) drop-shadow(0 5px 10px rgba(15, 23, 42, 0.35))'
                        : 'drop-shadow(0 5px 10px rgba(15, 23, 42, 0.32))',
                      transform: active ? 'translateY(-1.5px) scale(1.02)' : 'none',
                    }}
                  >
                    <img
                      decoding="async"
                      src={cat.imageSrc}
                      alt={titleText}
                      className="block w-full h-full max-w-full min-w-0 min-h-0 object-contain select-none pointer-events-none"
                      loading="eager"
                      draggable={false}
                    />
                  </div>

                  {/* Clear White Text Title Directly Below Button / Illustration */}
                  <span
                    className="mt-1 px-0.5 font-khmer font-extrabold leading-[1.62] text-center break-words whitespace-normal w-full transition-colors duration-150"
                    style={{
                      fontSize: 'clamp(11px, 3.05vw, 13.4px)',
                      color: active ? '#FDE047' : '#FFFFFF',
                      textShadow: active
                        ? '0 1px 3px rgba(0, 0, 0, 0.92), 0 0 8px rgba(250, 204, 21, 0.45)'
                        : '0 1.5px 3px rgba(0, 0, 0, 0.90), 0 0 2px rgba(0, 0, 0, 0.75)',
                    }}
                  >
                    {titleText}
                  </span>

                  {/* Subtle Gold Active Indicator Bar Below Title */}
                  {active && (
                    <span
                      className="mt-0.5 h-1 w-7 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, #FDE047 0%, #F59E0B 100%)',
                        boxShadow: '0 0 6px rgba(250, 204, 21, 0.8)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Compact Clean Shop Owner / Register Shop Bar */}
        <div className="bg-white rounded-[20px] p-3 border border-slate-200/85 shadow-[0_4px_14px_rgba(15,23,42,0.04)] flex items-center justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span
              style={{
                background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
              }}
              className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs"
            >
              <Store className="w-4.5 h-4.5" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-[1.65] break-words">
                {tr(language, 'ចុះបញ្ជីហាងរបស់អ្នកដោយឥតគិតថ្លៃ', 'Register Your Shop on the App', '入驻您的餐厅店铺')}
              </h3>
              <p className="text-[11px] text-slate-500 leading-[1.6] break-words">
                {tr(
                  language,
                  'បង្ហាញហាងភោជនីយដ្ឋាន និងទីតាំង GPS របស់អ្នកនៅលើកម្មវិធី',
                  'Showcase your restaurant and GPS directions',
                  '展示您的餐厅与 GPS 导航路线'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    (window as any).__kft_admin_tab = 'shops';
                    setIsAdminOpen(true);
                  }}
                  className="kft-btn-secondary-pill"
                >
                  <Settings className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{tr(language, 'គ្រប់គ្រង', 'Manage', '管理')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRestaurantCheckInModalOpen(true)}
                  className="kft-btn-secondary-pill"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>GPS</span>
                </button>
              </>
            )}

            {!isAdmin && myExistingRest && (
              <button
                type="button"
                onClick={() => {
                  (window as any).__kft_manage_initial_tab = 'info';
                  openManageMyVipStore(myExistingRest.id);
                }}
                className="kft-btn-secondary-pill"
              >
                <Edit2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{tr(language, 'កែប្រែហាង', 'Edit Shop', '管理店铺')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddShopClick}
              className="kft-btn-cta-orange"
            >
              <Plus className="w-4 h-4 stroke-[2.6] shrink-0" />
              <span>{tr(language, 'បន្ថែមហាងថ្មី', 'Add Shop', '添加店铺')}</span>
            </button>
          </div>
        </div>

        <div ref={shopListStartRef} id="kft-shop-list-section" className="scroll-mt-3" />

        {/* ===================================================================
            3. NEARBY & POPULAR SHOPS LISTINGS
            =================================================================== */}
        {sortedRestaurants.length > 0 ? (
          <div className="space-y-4 pt-0.5 min-h-[65vh]">
            {/* Section 1: ហាងពេញនិយមជិតខ្ញុំ (Popular Shops Near Me) */}
            {featuredRestaurants.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Flame className="w-5 h-5 text-orange-400 fill-amber-400 shrink-0" />
                      <h3 className="font-extrabold text-[15px] sm:text-base text-white leading-[1.65] break-words">
                        {tr(language, 'ហាងពេញនិយមជិតខ្ញុំ', 'Popular Shops Near Me', '附近热门店铺')}
                      </h3>
                    </div>

                    {/* Non-redundant GPS Distance Status Pill (Near Me toggle is in the 6-button grid above) */}
                    <span
                      style={{
                        background: nearMeActive
                          ? 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)'
                          : 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                      }}
                      className="px-2.5 py-0.5 rounded-full text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-2xs shrink-0 select-none"
                    >
                      <MapPin className="w-3 h-3 text-white fill-white/25 shrink-0" />
                      <span>{nearestDistanceLabel}</span>
                    </span>
                  </div>

                  {/* Unified White Rounded Pill "មើលទាំងអស់ >" */}
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

                <div className={featuredRestaurants.length === 1 ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
                  {featuredRestaurants.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      variant="hero"
                      distanceKm={distanceMap.get(restaurant.id) ?? null}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: បញ្ជីហាងបន្ថែម (More Shops Directory) */}
            {displayedDirectoryRestaurants.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 px-0.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        background: 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)',
                      }}
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white shadow-2xs"
                    >
                      <Store className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                    </span>
                    <h3 className="font-extrabold text-[15px] sm:text-base text-white leading-[1.6]">
                      {tr(language, 'បញ្ជីហាងបន្ថែម', 'More Shops Directory', '更多店铺列表')}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-extrabold text-slate-800 font-mono shadow-2xs">
                    {directoryRestaurants.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
                      className="kft-btn-load-more"
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
                style={{
                  background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-xs font-extrabold cursor-pointer shadow-xs"
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

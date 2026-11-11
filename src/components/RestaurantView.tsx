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
} from 'lucide-react';
import { isVipOwnerListing } from './listing/ListingUI';
import { normalizeKhmerSearchText } from '../services/googlePlacesService';
import { analyzeSearchQuery, scoreSearchRecord, restaurantSearchFields } from '../utils/searchEngine';
import { tr } from '../utils/i18n';
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
    setLanguage,
    selectedProvince,
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

  // 6 Colorful Glossy Category Cards matching Reference Image 2 (Home Screen 3x2 grid)
  const primaryCategoryPills = [
    {
      id: 'all',
      nameKh: 'ទាំងអស់',
      nameEn: 'All Shops',
      nameZh: '全部店铺',
      icon: LayoutGrid,
      gradient: 'linear-gradient(180deg, #FF9933 0%, #D94E08 100%)',
      shadow: '0 4px 10px rgba(15, 23, 42, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.36)',
      activeRing: '0 6px 14px rgba(15, 23, 42, 0.22), 0 0 0 2.5px #064E3B, inset 0 1px 1px rgba(255, 255, 255, 0.45)',
    },
    {
      id: 'restaurant_dining',
      nameKh: 'ភោជនីយដ្ឋាន',
      nameEn: 'Restaurants',
      nameZh: '餐厅',
      icon: Utensils,
      gradient: 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
      shadow: '0 4px 10px rgba(15, 23, 42, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.36)',
      activeRing: '0 6px 14px rgba(15, 23, 42, 0.22), 0 0 0 2.5px #064E3B, inset 0 1px 1px rgba(255, 255, 255, 0.45)',
    },
    {
      id: 'cafe_bistro',
      nameKh: 'កាហ្វេ',
      nameEn: 'Café',
      nameZh: '咖啡馆',
      icon: Coffee,
      gradient: 'linear-gradient(180deg, #F75977 0%, #C41D4B 100%)',
      shadow: '0 4px 10px rgba(15, 23, 42, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.36)',
      activeRing: '0 6px 14px rgba(15, 23, 42, 0.22), 0 0 0 2.5px #064E3B, inset 0 1px 1px rgba(255, 255, 255, 0.45)',
    },
    {
      id: 'drinks_boba',
      nameKh: 'ភេសជ្ជៈ',
      nameEn: 'Drinks',
      nameZh: '饮品',
      icon: CupSoda,
      gradient: 'linear-gradient(180deg, #3290FA 0%, #1254C7 100%)',
      shadow: '0 4px 10px rgba(15, 23, 42, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.36)',
      activeRing: '0 6px 14px rgba(15, 23, 42, 0.22), 0 0 0 2.5px #064E3B, inset 0 1px 1px rgba(255, 255, 255, 0.45)',
    },
    {
      id: 'fast_street',
      nameKh: 'អាហាររហ័ស',
      nameEn: 'Fast Food',
      nameZh: '快餐小吃',
      icon: Sandwich,
      gradient: 'linear-gradient(180deg, #F4B630 0%, #C67D0D 100%)',
      shadow: '0 4px 10px rgba(15, 23, 42, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.36)',
      activeRing: '0 6px 14px rgba(15, 23, 42, 0.22), 0 0 0 2.5px #064E3B, inset 0 1px 1px rgba(255, 255, 255, 0.45)',
    },
    {
      id: 'near_me_toggle',
      nameKh: 'នៅជិតខ្ញុំ',
      nameEn: 'Near Me',
      nameZh: '附近店铺',
      icon: MapPin,
      gradient: 'linear-gradient(180deg, #22AAA3 0%, #0E6769 100%)',
      shadow: '0 4px 10px rgba(15, 23, 42, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.36)',
      activeRing: '0 6px 14px rgba(15, 23, 42, 0.22), 0 0 0 2.5px #064E3B, inset 0 1px 1px rgba(255, 255, 255, 0.45)',
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
    <div className="w-full max-w-6xl mx-auto bg-[#1E293B] text-white min-h-full font-khmer pb-12">
      {/* 1. Shared Master Hero Header with Free Account Status Badge */}
      <AngkorHeroTopHeader mode="food" />

      {/* 2. MAIN CONTENT CONTAINER (Dark Slate #1E293B + Clean White Cards & Colorful Category Buttons) */}
      <div className="relative z-20 -mt-12 px-3 min-[360px]:px-4 sm:px-5 space-y-3.5 bg-[#1E293B] pt-1">
        {/* Row 1: Essential Search Bar + GPS Location Button */}
        <div className="flex items-center gap-2">
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1)',
            }}
            className="flex-1 min-w-0 min-h-[48px] py-1 rounded-full border border-white pl-3.5 pr-2 flex items-center gap-2"
          >
            <Search className="w-5 h-5 text-slate-500 shrink-0" strokeWidth={2.3} />
            <input
              type="text"
              value={shopSearchQuery}
              onChange={(e) => setShopSearchQuery(e.target.value)}
              placeholder={tr(
                language,
                'ស្វែងរកហាង, មុខម្ហូប ឬតំបន់ជិតអ្នក...',
                'Search shops, dishes, or nearby area...',
                '搜索店铺、菜品或附近区域...'
              )}
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-[13.5px] font-bold text-slate-900 placeholder-slate-400 focus:outline-none truncate"
            />
            {shopSearchQuery && (
              <button
                type="button"
                onClick={() => setShopSearchQuery('')}
                aria-label={tr(language, 'សម្អាត', 'Clear', '清除')}
                className="p-1 text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleNearMe}
              style={
                nearMeActive
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

        {/* Row 2: 6 Colorful Gradient Category Buttons in Clean White Card (Matching Reference Image 2) */}
        <div
          style={{
            background: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          }}
          className="rounded-[24px] p-2.5 sm:p-3 border border-slate-100"
        >
          <div className="grid grid-cols-3 gap-2">
            {primaryCategoryPills.map((cat) => {
              const Icon = cat.icon;
              const active = cat.id === 'near_me_toggle' ? nearMeActive : categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    if (cat.id === 'near_me_toggle') {
                      handleToggleNearMe();
                    } else {
                      setCategoryFilter(cat.id);
                    }
                  }}
                  aria-pressed={active}
                  style={{
                    background: cat.gradient,
                    boxShadow: active ? cat.activeRing : cat.shadow,
                  }}
                  className="group relative min-h-[68px] px-1.5 py-2 rounded-[16px] flex flex-col items-center justify-center gap-1 min-w-0 text-white transition active:scale-[0.96] cursor-pointer overflow-hidden"
                >
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)',
                    }}
                  />
                  <Icon className="relative z-10 w-5 h-5 text-white shrink-0 drop-shadow-xs" strokeWidth={2.2} />
                  <span
                    className="relative z-10 font-khmer font-extrabold leading-[1.62] py-0.5 text-center break-words whitespace-normal w-full"
                    style={{ fontSize: 'clamp(11.4px, 3.12vw, 13.8px)', textShadow: '0 1px 2px rgba(0,0,0,0.30)' }}
                  >
                    {tr(language, cat.nameKh, cat.nameEn, cat.nameZh)}
                  </span>
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
                  className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{tr(language, 'គ្រប់គ្រង', 'Manage', '管理')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRestaurantCheckInModalOpen(true)}
                  className="h-9 px-3 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
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
                className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3 text-emerald-700" />
                <span>{tr(language, 'កែប្រែហាង', 'Edit Shop', '管理店铺')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddShopClick}
              style={{
                background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                boxShadow: '0 4px 10px rgba(234, 88, 12, 0.25)',
              }}
              className="h-9 px-3.5 rounded-full text-white font-extrabold text-xs inline-flex items-center gap-1 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.6] shrink-0" />
              <span>{tr(language, 'បន្ថែមហាងថ្មី', 'Add Shop', '添加店铺')}</span>
            </button>
          </div>
        </div>

        {/* ===================================================================
            3. NEARBY & POPULAR SHOPS LISTINGS
            =================================================================== */}
        {sortedRestaurants.length > 0 ? (
          <div className="space-y-4 pt-0.5">
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

                    {/* GPS Distance Pill Badge */}
                    <button
                      type="button"
                      onClick={handleToggleNearMe}
                      style={{
                        background: nearMeActive
                          ? 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)'
                          : 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                      }}
                      className="px-2.5 py-0.5 rounded-full text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-2xs active:scale-95 transition cursor-pointer shrink-0"
                    >
                      <MapPin className="w-3 h-3 text-white fill-white/25 shrink-0" />
                      <span>
                        {tr(language, 'ជិតខ្ញុំ', 'Near Me', '附近')} ({nearestDistanceLabel})
                      </span>
                    </button>
                  </div>

                  {/* White Rounded Pill "មើលទាំងអស់ >" Matching Reference Image 2 */}
                  <button
                    type="button"
                    onClick={() => setShowAllFeatured((prev) => !prev)}
                    className="px-3 py-1 rounded-full bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs text-xs font-extrabold text-slate-800 inline-flex items-center gap-0.5 cursor-pointer shrink-0"
                  >
                    <span>
                      {showAllFeatured
                        ? tr(language, 'បង្រួម', 'Show less', '收起')
                        : tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
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
                      style={{
                        background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                      }}
                      className="px-5 py-2.5 rounded-full text-white text-xs font-extrabold shadow-xs cursor-pointer transition active:scale-95"
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

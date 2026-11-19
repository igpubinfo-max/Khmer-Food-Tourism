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
  isShopSubscriptionActive,
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
import {
  normalizeKhmerSearchText,
  searchNearbyPlacesWithin500m,
  getInstantCachedNearbyPlaces,
  GooglePlaceCachedItem,
  searchNearbyPubNightlife,
} from '../services/googlePlacesService';
import { NearMeControlBar } from './common/NearMeControlBar';
import {
  MAX_NEARBY_RADIUS_METERS,
  PROVINCE_CENTERS,
  calculateDistanceMeters,
  readSavedUserGps,
  detectClosestProvinceFromCoords,
  resolveActiveNearMeCoords,
  requestCambodiaGpsLocation,
  mergeNearbyFoodShops,
} from '../utils/nearMeEngine';
import { analyzeSearchQuery, scoreSearchRecord, restaurantSearchFields } from '../utils/searchEngine';
import { tr } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import {
  DISH_PROVINCES,
  matchShopToProductQuery,
  verifyShopDataForDisplay,
  classifyShopDirectoryCategory,
  classifyRestaurantSubCategory,
  getShopCategoryTabTier,
  matchesShopCategoryTab,
  detectExplicitShopCategoryFromQuery,
} from '../utils/foodFilters';
import { parseSmartSearchIntent } from '../utils/aiSearchBridge';
import { isShopExcludedFromSearch, EXCLUDED_SHOPS_UPDATED_EVENT } from '../utils/excludedShopsRegistry';
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
    activeTab,
    showToast,
    pushNavigationStep,
    registerModalBackHandler,
    isRestoringHistoryRef,
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
  const [sortMode, setSortMode] = useState<'popular' | 'nearest' | 'rating'>('nearest');
  const [nearMeActive, setNearMeActive] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(() => readSavedUserGps());
  const [geoStatus, setGeoStatus] = useState<'requesting' | 'granted' | 'fallback'>(() =>
    readSavedUserGps() ? 'granted' : 'requesting'
  );
  const [selectedRadiusMeters, setSelectedRadiusMeters] = useState<number>(MAX_NEARBY_RADIUS_METERS);
  const [manualProvince, setManualProvince] = useState<string>(() => {
    const saved = readSavedUserGps();
    return saved ? detectClosestProvinceFromCoords(saved) : 'រាជធានីភ្នំពេញ';
  });
  const [isLoadingNearby, setIsLoadingNearby] = useState<boolean>(false);
  const [liveNearbyRestaurants, setLiveNearbyRestaurants] = useState<GooglePlaceCachedItem[]>(() => {
    const initCoords = readSavedUserGps() || PROVINCE_CENTERS['រាជធានីភ្នំពេញ'];
    return getInstantCachedNearbyPlaces(initCoords.lat, initCoords.lng, MAX_NEARBY_RADIUS_METERS).restaurants;
  });
  const [livePubNightlife, setLivePubNightlife] = useState<GooglePlaceCachedItem[]>([]);
  const [isLoadingPub, setIsLoadingPub] = useState<boolean>(false);
  const locationReqSeqRef = useRef<number>(0);
  const [showAllFeatured, setShowAllFeatured] = useState<boolean>(false);
  const [shopSearchQuery, setShopSearchQuery] = useState<string>('');
  const [debouncedShopSearchQuery, setDebouncedShopSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(RESTAURANT_BATCH_SIZE);
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [nowTickMs, setNowTickMs] = useState<number>(() => Date.now());
  const [excludedShopsTick, setExcludedShopsTick] = useState<number>(0);

  useEffect(() => {
    const onExcludedUpdated = () => {
      setExcludedShopsTick((t) => t + 1);
      setLiveNearbyRestaurants((prev) => prev.filter((p) => !isShopExcludedFromSearch(p)));
      setLivePubNightlife((prev) => prev.filter((p) => !isShopExcludedFromSearch(p)));
    };
    window.addEventListener(EXCLUDED_SHOPS_UPDATED_EVENT, onExcludedUpdated);
    return () => window.removeEventListener(EXCLUDED_SHOPS_UPDATED_EVENT, onExcludedUpdated);
  }, []);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const shopListStartRef = useRef<HTMLDivElement | null>(null);
  const shopCategoryCardRef = useRef<HTMLDivElement | null>(null);

  const [scrollRequestTick, setScrollRequestTick] = useState<number>(0);

  const scrollToShopList = (_keepCategoriesVisible = false) => {
    setScrollRequestTick((prev) => prev + 1);
    smoothScrollToElement(shopListStartRef.current, {
      containerId: 'kft-main-scroll',
      targetId: 'kft-shop-list-section',
      offsetTop: 6,
      delayMs: 25,
    });
  };

  const recordRestaurantStep = (label?: string) => {
    if (isRestoringHistoryRef.current) return;
    const snap = {
      categoryFilter,
      sortMode,
      nearMeActive,
      selectedRadiusMeters,
      manualProvince,
      showAllFeatured,
      shopSearchQuery,
      debouncedShopSearchQuery,
      visibleCount,
    };
    pushNavigationStep({
      label: label || 'restaurant-filter',
      restoreViewStep: () => {
        setCategoryFilter(snap.categoryFilter);
        setSortMode(snap.sortMode);
        setNearMeActive(snap.nearMeActive);
        setSelectedRadiusMeters(snap.selectedRadiusMeters);
        setManualProvince(snap.manualProvince);
        setShowAllFeatured(snap.showAllFeatured);
        setShopSearchQuery(snap.shopSearchQuery);
        setDebouncedShopSearchQuery(snap.debouncedShopSearchQuery);
        setVisibleCount(snap.visibleCount);
        setShowFilterDrawer(false);
      },
    });
  };

  useEffect(() => {
    registerModalBackHandler('view:restaurants', () => {
      if (showFilterDrawer) {
        setShowFilterDrawer(false);
        return true;
      }
      return false;
    });
    return () => registerModalBackHandler('view:restaurants', null);
  }, [registerModalBackHandler, showFilterDrawer]);

  useEffect(() => {
    if (scrollRequestTick === 0 || isRestoringHistoryRef.current) return;
    smoothScrollToElement(shopListStartRef.current, {
      containerId: 'kft-main-scroll',
      targetId: 'kft-shop-list-section',
      offsetTop: 6,
      delayMs: 25,
    });
  }, [scrollRequestTick]);

  const handleExecuteShopSearch = () => {
    const trimmed = shopSearchQuery.trim();
    setDebouncedShopSearchQuery(trimmed);
    if (trimmed) {
      const smart = parseSmartSearchIntent(trimmed);
      const coreOrRaw = (
        smart && (smart.detectedProvinceKh || smart.isConversationalPrompt)
          ? smart.coreQuery
          : trimmed
      ).trim();
      const explicitCat =
        detectExplicitShopCategoryFromQuery(coreOrRaw) ||
        detectExplicitShopCategoryFromQuery(trimmed);
      if (explicitCat === 'near_me_toggle') {
        setCategoryFilter('all');
        setNearMeActive(true);
        setSortMode('nearest');
        requestLocation(false);
      } else if (explicitCat === 'pub_nightlife' || explicitCat === 'vegetarian_shop') {
        setCategoryFilter(explicitCat);
        setNearMeActive(true);
        setSortMode('nearest');
        if (explicitCat === 'pub_nightlife') {
          setSelectedRadiusMeters((prev) => Math.max(prev, 10000));
        }
        requestLocation(false);
      } else if (explicitCat) {
        setNearMeActive(false);
        setCategoryFilter(explicitCat);
        setSortMode('nearest');
      } else if (categoryFilter !== 'all') {
        setCategoryFilter('all');
      }
    }
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

  const baseCoords = useMemo(() => {
    return userCoords || readSavedUserGps() || PROVINCE_CENTERS['រាជធានីភ្នំពេញ'];
  }, [userCoords]);

  const detectedGpsProvince = useMemo(
    () => detectClosestProvinceFromCoords(baseCoords),
    [baseCoords]
  );

  const activeNearMeCoords = useMemo(
    () => resolveActiveNearMeCoords(baseCoords, detectedGpsProvince, manualProvince),
    [baseCoords, detectedGpsProvince, manualProvince]
  );

  const fetchLiveNearby500m = async (
    coords: { lat: number; lng: number },
    forceRefresh = false,
    radiusOverride = selectedRadiusMeters
  ) => {
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return;
    const reqSeq = locationReqSeqRef.current;
    if (!forceRefresh) {
      const instant = getInstantCachedNearbyPlaces(coords.lat, coords.lng, radiusOverride);
      if (instant.restaurants.length > 0) {
        setLiveNearbyRestaurants(instant.restaurants);
      }
      if (instant.fromMemoryCache) {
        setIsLoadingNearby(false);
        return;
      }
    }
    setIsLoadingNearby(true);
    try {
      const res = await searchNearbyPlacesWithin500m(
        coords.lat,
        coords.lng,
        radiusOverride,
        forceRefresh
      );
      if (reqSeq !== locationReqSeqRef.current) return;
      setLiveNearbyRestaurants(res.restaurants);
    } catch (err) {
      console.warn('Shop NearMe fetch warning:', err);
    } finally {
      if (reqSeq === locationReqSeqRef.current) {
        setIsLoadingNearby(false);
      }
    }
  };

  const requestLocation = (forceRefresh = false) => {
    const reqSeq = ++locationReqSeqRef.current;
    if (forceRefresh || (!userCoords && !readSavedUserGps())) {
      setGeoStatus('requesting');
    }
    let fetchedCoords: { lat: number; lng: number } | null = null;

    requestCambodiaGpsLocation({
      forceRefresh,
      defaultProvinceKh: manualProvince || 'រាជធានីភ្នំពេញ',
      isCurrentReq: () => reqSeq === locationReqSeqRef.current,
      onImmediateSaved: (savedCoords, detProv) => {
        setUserCoords(savedCoords);
        setManualProvince(detProv);
        setGeoStatus('granted');
        fetchedCoords = savedCoords;
        fetchLiveNearby500m(savedCoords, false, selectedRadiusMeters);
      },
      onGranted: (nextCoords, detProv) => {
        setUserCoords(nextCoords);
        setManualProvince(detProv);
        setGeoStatus('granted');
        if (
          !fetchedCoords ||
          forceRefresh ||
          calculateDistanceMeters(fetchedCoords.lat, fetchedCoords.lng, nextCoords.lat, nextCoords.lng) > 120
        ) {
          fetchedCoords = nextCoords;
          fetchLiveNearby500m(nextCoords, forceRefresh, selectedRadiusMeters);
        }
      },
      onFallback: (fallbackCoords, detProv) => {
        setUserCoords(fallbackCoords);
        setManualProvince(detProv);
        setGeoStatus('fallback');
        if (!fetchedCoords) {
          fetchedCoords = fallbackCoords;
          fetchLiveNearby500m(fallbackCoords, forceRefresh, selectedRadiusMeters);
        }
      },
    });
  };

  useEffect(() => {
    const savedGps = readSavedUserGps();
    if (!savedGps) {
      requestLocation(false);
    } else {
      const instant = getInstantCachedNearbyPlaces(savedGps.lat, savedGps.lng, selectedRadiusMeters);
      if (instant.restaurants.length > 0) {
        setLiveNearbyRestaurants(instant.restaurants);
      }
    }
    const onGpsUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ lat: number; lng: number }>).detail;
      if (detail && Number.isFinite(detail.lat) && Number.isFinite(detail.lng)) {
        setUserCoords(detail);
        setGeoStatus('granted');
      }
    };
    window.addEventListener('kft:gps-updated', onGpsUpdated);
    return () => window.removeEventListener('kft:gps-updated', onGpsUpdated);
  }, []);

  const handleNearMeProvinceChange = (prov: string) => {
    recordRestaurantStep('shop-nearme-prov:' + prov);
    setManualProvince(prov);
    const nextRef = resolveActiveNearMeCoords(baseCoords, detectedGpsProvince, prov);
    fetchLiveNearby500m(nextRef, false, selectedRadiusMeters);
    scrollToShopList();
  };

  const handleSelectRadius = (newRadius: number) => {
    recordRestaurantStep('shop-nearme-radius:' + newRadius);
    setSelectedRadiusMeters(newRadius);
    fetchLiveNearby500m(activeNearMeCoords, true, newRadius);
    scrollToShopList();
  };

  const handleToggleNearMe = () => {
    if (shopSearchQuery || debouncedShopSearchQuery) {
      setShopSearchQuery('');
      setDebouncedShopSearchQuery('');
    }
    if (nearMeActive && categoryFilter === 'all') {
      setNearMeActive(false);
      setSortMode('nearest');
      return;
    }
    setCategoryFilter('all');
    setNearMeActive(true);
    setSortMode('nearest');
    requestLocation(false);
    showToast(
      tr(
        language,
        '📍 បានរៀបហាងតាមចម្ងាយជិតអ្នកបំផុត!',
        '📍 Sorted shops nearest to your location!',
        '📍 已按距离您最近排序店铺！'
      ),
      'success'
    );
  };

  /** "អាហារបួស": GPS-based vegetarian / vegan shops, nearest first (closest → farthest). */
  const handleToggleVegetarianNearby = () => {
    if (shopSearchQuery || debouncedShopSearchQuery) {
      setShopSearchQuery('');
      setDebouncedShopSearchQuery('');
    }
    if (nearMeActive && categoryFilter === 'vegetarian_shop') {
      setNearMeActive(false);
      setCategoryFilter('all');
      setSortMode('nearest');
      return;
    }
    setCategoryFilter('vegetarian_shop');
    setNearMeActive(true);
    setSortMode('nearest');
    requestLocation(false);
    showToast(
      tr(
        language,
        'កំពុងស្វែងរកហាងអាហារបួសជិតអ្នក — រៀបពីជិតទៅឆ្ងាយ',
        'Finding vegetarian shops near you — nearest first',
        '正在查找您附近的素食店铺——由近到远排序'
      ),
      'success'
    );
  };

  /** "ហាងផឹកស៊ី": deep GPS search for pubs, bars, beer gardens & night venues, nearest first. */
  const handleTogglePubNightlife = () => {
    if (shopSearchQuery || debouncedShopSearchQuery) {
      setShopSearchQuery('');
      setDebouncedShopSearchQuery('');
    }
    if (nearMeActive && categoryFilter === 'pub_nightlife') {
      setNearMeActive(false);
      setCategoryFilter('all');
      setSortMode('nearest');
      return;
    }
    setCategoryFilter('pub_nightlife');
    setNearMeActive(true);
    setSortMode('nearest');
    // Wider default radius so the deep search returns many venues (user can still pick 5 / 10 / 20 km)
    setSelectedRadiusMeters((prev) => Math.max(prev, 10000));
    requestLocation(false);
    showToast(
      tr(
        language,
        'កំពុងស្វែងរកកន្លែងកម្សាន្ត និងជួបជុំ (បារ ផាប់ បៀរហ្គាឌិន) ជិតអ្នក — រៀបពីជិតទៅឆ្ងាយ',
        'Deep-searching pubs, bars & nightlife near you — nearest first',
        '正在深度搜索您附近的酒吧与夜生活场所——由近到远排序'
      ),
      'success'
    );
  };

  const classifyRestaurantCategory = (r: Restaurant): string => {
    return classifyRestaurantSubCategory(r);
  };

  const matchesPrimaryTabPill = (r: Restaurant, tabId: string): boolean => {
    return matchesShopCategoryTab(r, tabId);
  };

  // 6 Premium 3D Gold-Bordered Category Buttons in 3x2 Grid
  const primaryCategoryPills = [
    {
      id: 'all',
      nameKh: 'ទាំងអស់',
      nameEn: 'All Shops',
      nameZh: '全部店铺',
      icon: LayoutGrid,
      imageSrc: './categories/shop_cat_all.png',
      accentColor: '#F59E0B',
    },
    {
      id: 'restaurant_dining',
      nameKh: 'ភោជនីយដ្ឋាន',
      nameEn: 'Restaurants',
      nameZh: '餐厅',
      icon: Utensils,
      imageSrc: './categories/shop_cat_restaurant.png',
      accentColor: '#22C55E',
    },
    {
      id: 'cafe_bistro',
      nameKh: 'កាហ្វេ/ភេសជ្ជៈ',
      nameEn: 'Café & Drinks',
      nameZh: '咖啡与饮品',
      icon: Coffee,
      imageSrc: './categories/shop_cat_cafe.png',
      accentColor: '#F43F5E',
    },
    {
      id: 'pub_nightlife',
      nameKh: 'កម្សាន្ត និងជួបជុំ',
      nameEn: 'Pub & Nightlife',
      nameZh: '娱乐与聚会',
      icon: CupSoda,
      imageSrc: './categories/shop_cat_pub_nightlife.png',
      accentColor: '#9333EA',
    },
    {
      id: 'fast_street',
      nameKh: 'អាហាររហ័ស',
      nameEn: 'Fast Food',
      nameZh: '快餐小吃',
      icon: Sandwich,
      imageSrc: './categories/shop_cat_fastfood.png',
      accentColor: '#EAB308',
    },
    {
      id: 'vegetarian_shop',
      nameKh: 'អាហារបួស',
      nameEn: 'Vegetarian',
      nameZh: '素食',
      icon: Utensils,
      imageSrc: './categories/shop_cat_vegetarian.png',
      accentColor: '#22C55E',
    },
  ];

  useEffect(() => {
    if (isRestoringHistoryRef.current) return;
    setVisibleCount(RESTAURANT_BATCH_SIZE);
  }, [selectedProvince, priceFilter, categoryFilter, cuisineFilter, ratingFilter, sortMode, shopSearchQuery, nearMeActive, selectedRadiusMeters, manualProvince]);

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
      if (isHotelBusinessRecord(r) || isShopExcludedFromSearch(r)) {
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
  }, [sessionShuffledRestaurants, currentUser?.role, currentUser?.id, isAdmin, excludedShopsTick]);

  const cleanSelectedProvince = useMemo(() => {
    const raw = (selectedProvince || '').trim();
    if (!raw || raw === 'ទាំងអស់' || raw.toLowerCase() === 'all') return '';
    return raw.replace(/^(ខេត្ត|រាជធានី)/, '').trim();
  }, [selectedProvince]);

  const preRotatedRestaurants = useMemo(
    () => sortRestaurantsWithVipRotation(validDirectoryRestaurants, users, appSettings, nowTickMs),
    [validDirectoryRestaurants, users, appSettings, nowTickMs]
  );

  const pubModeActive = nearMeActive && categoryFilter === 'pub_nightlife';
  const liveSourceForNearMe = useMemo(
    () => (pubModeActive ? [...liveNearbyRestaurants, ...livePubNightlife] : liveNearbyRestaurants),
    [pubModeActive, liveNearbyRestaurants, livePubNightlife]
  );

  // Deep pub / nightlife search whenever the pub button is active (re-runs on GPS or radius change)
  useEffect(() => {
    if (!pubModeActive) return;
    let cancelled = false;
    setIsLoadingPub(true);
    searchNearbyPubNightlife(activeNearMeCoords.lat, activeNearMeCoords.lng, selectedRadiusMeters)
      .then((items) => {
        if (!cancelled) setLivePubNightlife(items);
      })
      .catch((err) => console.warn('Pub & nightlife deep search warning:', err))
      .finally(() => {
        if (!cancelled) setIsLoadingPub(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pubModeActive, activeNearMeCoords.lat, activeNearMeCoords.lng, selectedRadiusMeters]);

  const nearbyMergedShops = useMemo(() => {
    if (!nearMeActive) return [];
    return mergeNearbyFoodShops({
      restaurants: validDirectoryRestaurants,
      liveNearbyRestaurants: liveSourceForNearMe,
      refCoords: activeNearMeCoords,
      radiusMeters: selectedRadiusMeters,
      targetProvinceKh: manualProvince,
    });
  }, [
    nearMeActive,
    validDirectoryRestaurants,
    liveSourceForNearMe,
    activeNearMeCoords,
    selectedRadiusMeters,
    manualProvince,
  ]);

  const { distanceMap, distanceMetersMap } = useMemo(() => {
    const kmMap = new Map<string, number>();
    const mMap = new Map<string, number>();
    const refLat = nearMeActive ? activeNearMeCoords.lat : baseCoords.lat;
    const refLng = nearMeActive ? activeNearMeCoords.lng : baseCoords.lng;

    for (const r of preRotatedRestaurants) {
      const m = calculateDistanceMeters(refLat, refLng, r.latitude, r.longitude);
      if (Number.isFinite(m)) {
        mMap.set(r.id, m);
        kmMap.set(r.id, Number((m / 1000).toFixed(1)));
      }
    }
    for (const r of nearbyMergedShops) {
      mMap.set(r.id, r.distanceMeters);
      kmMap.set(r.id, r.distanceKm);
    }
    return { distanceMap: kmMap, distanceMetersMap: mMap };
  }, [preRotatedRestaurants, nearbyMergedShops, nearMeActive, activeNearMeCoords, baseCoords]);

  const sortedRestaurants = useMemo(() => {
    const rawTrimmed = (shopSearchQuery.trim() || debouncedShopSearchQuery.trim());
    const smartIntent = rawTrimmed ? parseSmartSearchIntent(rawTrimmed) : null;
    const queryProvince = (smartIntent?.detectedProvinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim();
    const effectiveProvince = queryProvince || cleanSelectedProvince;
    const effectiveRawQuery = (
      smartIntent && (smartIntent.detectedProvinceKh || smartIntent.isConversationalPrompt)
        ? smartIntent.coreQuery
        : rawTrimmed
    ).trim();
    const q = normalizeKhmerSearchText(effectiveRawQuery);
    const analyzed = effectiveRawQuery ? analyzeSearchQuery(effectiveRawQuery) : null;
    const queryExplicitCat =
      detectExplicitShopCategoryFromQuery(effectiveRawQuery) ||
      detectExplicitShopCategoryFromQuery(rawTrimmed);

    const scored: { item: Restaurant; score: number; tier: number }[] = [];
    const fallbackUnfilteredScored: { item: Restaurant; score: number; tier: number }[] = [];
    const seenIds = new Set<string>();
    const seenFallbackIds = new Set<string>();

    const cleanManualProv = (manualProvince || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim();
    const useNearMePool =
      (nearMeActive || queryExplicitCat === 'near_me_toggle') &&
      (!queryProvince || queryProvince === cleanManualProv);

    const candidatePool: Restaurant[] = useNearMePool
      ? nearMeActive
        ? nearbyMergedShops
        : mergeNearbyFoodShops({
            restaurants: validDirectoryRestaurants,
            liveNearbyRestaurants: liveSourceForNearMe,
            refCoords: activeNearMeCoords,
            radiusMeters: selectedRadiusMeters,
            targetProvinceKh: manualProvince,
          })
      : preRotatedRestaurants;

    for (const r of candidatePool) {
      if (!r?.id || isShopExcludedFromSearch(r)) continue;
      const cleanRestProvince = (r.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim();
      const matchesProvince = useNearMePool
        ? true
        : !effectiveProvince ||
          cleanRestProvince === effectiveProvince ||
          (r.provinceKh || '').includes(effectiveProvince) ||
          (r.addressKh || '').includes(effectiveProvince);
      const matchesPrice = priceFilter === 'all' || r.priceLevel === priceFilter;

      const activeTabForMatch =
        queryExplicitCat && queryExplicitCat !== 'near_me_toggle'
          ? queryExplicitCat
          : q
            ? 'all'
            : categoryFilter;

      const tabTier = getShopCategoryTabTier(r, activeTabForMatch);
      const matchesCategory = tabTier > 0;
      const matchesCuisine = cuisineFilter === 'all' || classifyRestaurantCategory(r) === cuisineFilter;
      const matchesRating =
        ratingFilter === 'all' ||
        (ratingFilter === '4.5' ? Number(r.rating || 4.6) >= 4.5 : Number(r.rating || 4.6) >= 4.0);

      let relevance = 1;
      let matchTier = tabTier;

      if (q && analyzed) {
        if (queryExplicitCat === 'near_me_toggle') {
          relevance = 100;
          matchTier = 2;
        } else {
          const primaryCat = classifyShopDirectoryCategory(r);
          const subCatKey = classifyRestaurantSubCategory(r);
          const extraCatLabels =
            primaryCat === 'drinks_boba'
              ? 'ភេសជ្ជៈ ហាងភេសជ្ជៈ តែគុជ តែគុច ហាងតែ ទឹកក្រឡុក ទឹកផ្លែឈើ ការ៉េម drinks beverages boba bubble tea milk tea smoothie juice ice cream 饮品 饮料 奶茶 珍珠奶茶 果汁 冰淇淋'
              : primaryCat === 'fast_street'
                ? 'អាហាររហ័ស អាហារសម្រន់ អាហារតាមផ្លូវ បឺហ្គឺ ភីហ្សា នំប៉័ង សាំងវិច មាន់បំពង ហាងនំខេក fast food street food burger pizza sandwich banh mi bakery fried chicken 快餐 街头小吃 汉堡 披萨 三明治 炸鸡 面包店'
                : primaryCat === 'cafe_bistro'
                  ? 'កាហ្វេ ហាងកាហ្វេ cafe café coffee roastery espresso latte cappuccino 咖啡 咖啡馆 咖啡厅 咖啡店'
                  : subCatKey === 'bbq_grill'
                    ? 'សាច់អាំង bbq grill steakhouse hotpot ភោជនីយដ្ឋាន អាហារដ្ឋាន ហាងអាហារ restaurant dining 烧烤 餐厅 烤肉 火锅'
                    : subCatKey === 'seafood_riverside'
                      ? 'គ្រឿងសមុទ្រ seafood មាត់ទន្លេ riverside ភោជនីយដ្ឋាន អាហារដ្ឋាន ហាងអាហារ restaurant dining 海鲜 餐厅 河畔 螃蟹 虾 鱼'
                      : 'ភោជនីយដ្ឋាន អាហារដ្ឋាន ហាងអាហារ អាហារខ្មែរ ម្ហូបខ្មែរ restaurant dining khmer food 餐厅 饭店 高棉菜 柬埔寨菜';

          const zhLoc = getLocalizedRestaurant(r, 'zh');
          const searchFields = restaurantSearchFields(r, [zhLoc.name]);
          searchFields.categories = [...(searchFields.categories || []), extraCatLabels];
          searchFields.locations = [
            ...(searchFields.locations || []),
            zhLoc.province || '',
            zhLoc.address || '',
          ].filter(Boolean);
          searchFields.texts = [
            ...(searchFields.texts || []),
            ...(zhLoc.signatureDishes || []),
            zhLoc.description || '',
          ].filter(Boolean);
          const nameDetail = scoreSearchRecord(analyzed, searchFields);
          const productMatch = matchShopToProductQuery(r, effectiveRawQuery);

          const nameNorm = normalizeKhmerSearchText(`${r.nameKh || ''} ${r.nameEn || ''} ${zhLoc.name || ''}`);
          const dish0Norm = normalizeKhmerSearchText(
            `${(r.signatureDishesKh || [])[0] || ''} ${(r.signatureDishesEn || [])[0] || ''} ${(zhLoc.signatureDishes || [])[0] || ''}`
          );
          const allDishesNorm = normalizeKhmerSearchText(
            `${(r.signatureDishesKh || []).join(' ')} ${(r.signatureDishesEn || []).join(' ')} ${(zhLoc.signatureDishes || []).join(' ')}`
          );

          const hasDirectNameMatch =
            nameDetail.exactName ||
            (analyzed.distinctive.length > 0 && nameDetail.matchedInName) ||
            (q.length >= 2 && nameNorm.includes(q));
          const hasPrimaryDishMatch =
            (q.length >= 2 && dish0Norm.includes(q)) ||
            (productMatch.isExactProductMatch && productMatch.score >= 1000);
          const hasAnyDishMatch =
            (q.length >= 2 && allDishesNorm.includes(q)) || productMatch.isExactProductMatch;

          // Prevent location-only token noise when searching for a shop name, category, or dish
          const isLocationOnlyNoise =
            nameDetail.score > 0 &&
            !hasDirectNameMatch &&
            !hasAnyDishMatch &&
            !productMatch.matches &&
            Boolean(queryProvince || queryExplicitCat);

          const cleanNameScore = isLocationOnlyNoise ? 0 : nameDetail.score;
          const prodScore = productMatch.matches ? productMatch.score : 0;

          if (queryExplicitCat) {
            if (!matchesShopCategoryTab(r, queryExplicitCat)) {
              relevance = 0;
              matchTier = 0;
            } else {
              const catTier = getShopCategoryTabTier(r, queryExplicitCat);
              matchTier = catTier;
              relevance = Math.max(100 * catTier, cleanNameScore, prodScore);
            }
          } else {
            relevance = Math.max(cleanNameScore, prodScore);
            if (relevance <= 0 && (hasDirectNameMatch || hasAnyDishMatch)) {
              relevance = 120;
            }
            if (hasDirectNameMatch) {
              matchTier = 4;
              relevance = Math.max(relevance, 1200);
            } else if (hasPrimaryDishMatch) {
              matchTier = 3;
              relevance = Math.max(relevance, 900);
            } else if (hasAnyDishMatch) {
              matchTier = 2;
              relevance = Math.max(relevance, 600);
            } else if (relevance > 0) {
              matchTier = 1;
            } else {
              matchTier = 0;
            }
          }

          if (relevance > 0 && smartIntent?.semanticCategory === 'cafe' && primaryCat === 'cafe_bistro') {
            relevance += 35;
          }
          if (relevance > 0 && isShopSubscriptionActive(r)) {
            relevance += 250;
          }
        }
      }

      if (relevance > 0) {
        if (matchesProvince && matchesPrice && matchesCategory && matchesCuisine && matchesRating) {
          if (!seenIds.has(r.id)) {
            seenIds.add(r.id);
            scored.push({ item: r, score: relevance, tier: matchTier });
          }
        }
        if (q && !useNearMePool && !seenFallbackIds.has(r.id)) {
          seenFallbackIds.add(r.id);
          fallbackUnfilteredScored.push({ item: r, score: relevance, tier: matchTier });
        }
      }
    }

    let activeList =
      q && !useNearMePool && scored.length === 0 && fallbackUnfilteredScored.length > 0
        ? fallbackUnfilteredScored
        : scored;

    // When searching for a specific shop name or dish, if strong direct/dish matches (tier >= 2) exist,
    // drop weak description-only noise (tier 1) so results stay 100% relevant.
    if (q && !queryExplicitCat) {
      const strongMatches = activeList.filter((entry) => entry.tier >= 2);
      if (strongMatches.length > 0) {
        activeList = strongMatches;
      }
    }

    const hasActiveUserGps = Boolean(userCoords || readSavedUserGps());
    if (sortMode === 'rating' && !q && !useNearMePool) {
      activeList.sort((a, b) => {
        if (b.tier !== a.tier) return b.tier - a.tier;
        const rDiff = Number(b.item.rating || 0) - Number(a.item.rating || 0);
        if (rDiff !== 0) return rDiff;
        return (distanceMetersMap.get(a.item.id) ?? 9999999) - (distanceMetersMap.get(b.item.id) ?? 9999999);
      });
    } else if (
      useNearMePool ||
      sortMode === 'nearest' ||
      q ||
      categoryFilter !== 'all' ||
      cuisineFilter !== 'all' ||
      hasActiveUserGps
    ) {
      activeList.sort((a, b) => {
        // 1. Always respect primary category tier / search relevance tier first so dedicated
        // matches (e.g. exact shop name, primary dish, or dedicated boba shop) never get buried by unrelated nearby shops.
        if (b.tier !== a.tier) return b.tier - a.tier;
        if (q && a.tier >= 3 && Math.abs(b.score - a.score) >= 80) {
          return b.score - a.score;
        }
        // 2. Within the same match tier, sort by actual GPS distance ascending (closest to farthest)
        if (hasActiveUserGps || useNearMePool || sortMode === 'nearest') {
          const dA = distanceMetersMap.get(a.item.id) ?? 9999999;
          const dB = distanceMetersMap.get(b.item.id) ?? 9999999;
          if (dA !== dB) return dA - dB;
        }
        if (q && b.score !== a.score) return b.score - a.score;
        return Number(b.item.rating || 0) - Number(a.item.rating || 0);
      });
    }

    return activeList.map((entry) => entry.item);
  }, [
    nearMeActive,
    nearbyMergedShops,
    validDirectoryRestaurants,
    liveSourceForNearMe,
    activeNearMeCoords,
    selectedRadiusMeters,
    manualProvince,
    preRotatedRestaurants,
    cleanSelectedProvince,
    priceFilter,
    categoryFilter,
    cuisineFilter,
    ratingFilter,
    sortMode,
    distanceMetersMap,
    shopSearchQuery,
    debouncedShopSearchQuery,
    userCoords,
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

    const hasActiveUserGps = Boolean(userCoords || readSavedUserGps());
    const isDefaultOrder = !debouncedShopSearchQuery.trim() && categoryFilter === 'all' && sortMode === 'popular' && !hasActiveUserGps;
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
  }, [sortedRestaurants, showAllFeatured, rotationState, debouncedShopSearchQuery, sortMode, categoryFilter, userCoords]);

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
    if (typeof d === 'number' && Number.isFinite(d) && d >= 0) {
      const eff = Math.max(0.1, d);
      return `${eff < 10 ? eff.toFixed(1) : Math.round(eff)} km`;
    }
    return '0.8 km';
  }, [featuredRestaurants, distanceMap]);

  if (activeTab !== 'restaurants') return null;

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
              background: 'rgba(255, 255, 255, 0.96)',
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
              onFocus={() => {
                if (!shopSearchQuery) recordRestaurantStep('shop-search-focus');
              }}
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
                onClick={() => {
                  recordRestaurantStep('shop-search-clear');
                  setShopSearchQuery('');
                  setDebouncedShopSearchQuery('');
                }}
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
                    recordRestaurantStep('shop-reset');
                    setSelectedProvince('ទាំងអស់');
                    setCategoryFilter('all');
                    setNearMeActive(false);
                    setSortMode('popular');
                    setShopSearchQuery('');
                    setDebouncedShopSearchQuery('');
                    setShowFilterDrawer(false);
                    scrollToShopList();
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
                  const val = e.target.value || 'ទាំងអស់';
                  if (val !== selectedProvince) {
                    recordRestaurantStep('shop-prov:' + val);
                  }
                  setSelectedProvince(val);
                  setShowFilterDrawer(false);
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
          <div className="kft-cat-grid grid grid-cols-3 gap-x-1.5 min-[360px]:gap-x-2 sm:gap-x-3 gap-y-2 min-[360px]:gap-y-2.5 sm:gap-y-3 items-stretch">
            {primaryCategoryPills.map((cat) => {
              const active =
                cat.id === 'vegetarian_shop' || cat.id === 'pub_nightlife'
                  ? nearMeActive && categoryFilter === cat.id
                  : !nearMeActive && categoryFilter === cat.id;
              const titleText = tr(language, cat.nameKh, cat.nameEn, cat.nameZh);
              return (
                <button
                  key={cat.id}
                  type="button"
                  id={`kft-shop-cat-${cat.id}-btn`}
                  onClick={() => {
                    recordRestaurantStep('shop-cat:' + cat.id);
                    setShowFilterDrawer(false);
                    if (shopSearchQuery || debouncedShopSearchQuery) {
                      setShopSearchQuery('');
                      setDebouncedShopSearchQuery('');
                    }
                    if (cat.id === 'vegetarian_shop') {
                      handleToggleVegetarianNearby();
                    } else if (cat.id === 'pub_nightlife') {
                      handleTogglePubNightlife();
                    } else {
                      setNearMeActive(false);
                      setCategoryFilter(cat.id);
                      setSortMode('nearest');
                    }
                    scrollToShopList();
                  }}
                  aria-pressed={active}
                  className="kft-cat-btn group relative flex flex-col items-center justify-start w-full max-w-full min-w-0 transition-colors duration-150 cursor-pointer focus:outline-none bg-transparent border-0 select-none"
                >
                  {/* 3D Gold-Bordered Category Illustration Button */}
                  <div
                    className={`kft-cat-img-wrap relative w-full max-w-full min-w-0 min-h-0 aspect-[2.12/1] overflow-visible transition-all duration-200 rounded-[14px] ${active ? 'kft-cat-img-active-glow' : ''}`}
                    style={{
                      transform: 'none',
                    }}
                  >
                    <img
                      decoding="async"
                      src={`${cat.imageSrc}?v=hq1623`}
                      alt={titleText}
                      className="block w-full h-full max-w-full min-w-0 min-h-0 object-contain select-none pointer-events-none"
                      loading="eager"
                      draggable={false}
                    />
                  </div>

                  {/* Clear White Text Title Directly Below Button / Illustration */}
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
        </div>

        {/* Row 3: Compact Clean Shop Owner / Register Shop Bar */}
        <div className="bg-white rounded-[20px] p-3.5 border border-slate-200/85 shadow-[0_4px_14px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-start sm:items-center gap-2.5 w-full sm:w-auto min-w-0 flex-1">
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
                {tr(language, 'ចុះបញ្ជីហាងរបស់អ្នក', 'Register Your Shop on the App', '入驻您的餐厅店铺')}
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

          <div className="flex items-center justify-end gap-1.5 flex-wrap w-full sm:w-auto shrink-0">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    (window as any).__kft_admin_tab = 'restaurants';
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

        {/* ===================================================================
            3. NEARBY & POPULAR SHOPS LISTINGS
            =================================================================== */}
        <div ref={shopListStartRef} id="kft-shop-list-section" className="space-y-3 pt-0.5 scroll-mt-2">
          {nearMeActive && (
            <NearMeControlBar
              language={language}
              geoStatus={geoStatus}
              detectedGpsProvince={detectedGpsProvince}
              manualProvince={manualProvince}
              onProvinceChange={handleNearMeProvinceChange}
              onRefreshGps={() => {
                requestLocation(true);
                scrollToShopList();
              }}
              isLoadingNearby={isLoadingNearby || isLoadingPub}
              selectedRadiusMeters={selectedRadiusMeters}
              onSelectRadius={handleSelectRadius}
              countLabel={tr(
                language,
                `ឃើញ ${sortedRestaurants.length} ហាង`,
                `${sortedRestaurants.length} shops`,
                `共 ${sortedRestaurants.length} 家`
              )}
            />
          )}

          {sortedRestaurants.length > 0 ? (
          <div className="space-y-4 min-h-[85vh]">
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
                    onClick={() => {
                      recordRestaurantStep('shop-featured-toggle');
                      setShowAllFeatured((prev) => !prev);
                    }}
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
                        'បង្ហាញហាងបន្ថែម',
                        'Show More Restaurants',
                        '加载更多餐厅'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 px-4 text-center bg-white rounded-3xl border border-slate-200 text-slate-600 space-y-2.5 shadow-xs min-h-[85vh]">
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
    </div>
  );
};


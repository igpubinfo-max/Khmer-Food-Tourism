import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { TrendingFoodItem, isUserVipActive, getVipAccountState, getVipRemainingDays, sortRestaurantsWithVipRotation, isAdminAccount, getVipFeaturedRotationConfig } from '../types';
import {
  normalizeKhmerSearchText,
  searchCambodiaPlacesWithSmartCache,
  performUnifiedCambodiaSearch,
  GooglePlaceCachedItem,
  openExternalPlaceInGoogleMaps,
  getCurrentDeviceLocation,
  calculateDistanceMeters,
} from '../services/googlePlacesService';
import { shuffleForCurrentSession } from '../utils/sessionShuffle';
import { tr, translateProvince } from '../utils/i18n';
import { getLocalizedFood, getLocalizedRestaurant, getLocalizedDestination } from '../utils/zhDynamicTranslator';
import { HomeGreetingSearch } from './home/HomeGreetingSearch';
import { TrendingFoodsRow } from './home/TrendingFoodsRow';
import { HomeSkeleton, HomeEmptyState } from './home/HomeStates';
import { FeatureGrid } from './home/FeatureGrid';
import { IconNavFood, IconNavShop, IconNavTourism, IconMapRoute } from './icons/HandcraftedIcons';
import { ForYouSection } from './home/ForYouSection';
import { PopularShops } from './home/PopularShops';
import { PopularDestinations } from './home/PopularDestinations';
import { VipPerksCard } from './home/VipPerksCard';
import { VipStatusNotice } from './home/VipStatusNotice';
import { MyShopPanel } from './home/MyShopPanel';
import { getMealSlot, getMealHint, MEAL_CATEGORIES, seededShuffle } from './home/homeUtils';
import {
  ChevronRight, Utensils, Store, Compass,
  MapPin, ShieldCheck,
  ExternalLink, Search, RefreshCw,
  Plus, Edit2, X, Trash2, Globe, Loader2,
  Users, CreditCard, Settings, MessageSquare, Shield, Clock
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const {
    foods, restaurants, destinations, setActiveTab,
    language, selectedProvince, setSelectedProvince,
    currentUser, users, appSettings, setIsAuthModalOpen,
    setSelectedDestination,
    setIsWhatToEatModalOpen,
    setIsNearMeModalOpen,
    setIsDailyDiscoveriesModalOpen,
    setIsAiTripPlannerModalOpen,
    setIsTrendingSocialModalOpen,
    trendingFoods, setSelectedTrendingFood, setIsTrendingFoodDetailModalOpen,
    showToast,
    setIsRestaurantCheckInModalOpen,
    searchQuery: globalSearchQuery, setSearchQuery: setGlobalSearchQuery,
    setSelectedFood, setSelectedRestaurant,
    setIsVipAddRestaurantModalOpen,
    getOwnedRestaurantsForUser, getCurrentUserStoreQuota, openManageMyVipStore, activeManagedShopId,
    openUpgradeVipModal, deleteRestaurant, openGoogleMapsSearchModal, setIsAdminOpen,
    transactions, supportTickets, triggerCloudSyncNow
  } = useApp();

  const isVip = isUserVipActive(currentUser);
  const isAdmin = isAdminAccount(currentUser);
  const storeQuota = getCurrentUserStoreQuota(currentUser);
  const myRestaurants = useMemo(() => {
    if (!isVip && !isAdmin) return [];
    return getOwnedRestaurantsForUser(currentUser);
  }, [restaurants, currentUser, activeManagedShopId, isVip, isAdmin, getOwnedRestaurantsForUser]);

  // Search results tab filter, radius filter, and pagination when global search is active
  const [searchTab, setSearchTab] = useState<'all' | 'food' | 'restaurants' | 'tourism' | 'external'>('all');
  const [searchRadiusMeters, setSearchRadiusMeters] = useState<number>(0); // 0 = All Cambodia
  const [userGpsLocation, setUserGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingSearchGps, setIsGettingSearchGps] = useState<boolean>(false);
  const [searchVisibleCount, setSearchVisibleCount] = useState<number>(12);

  const [homeSmartCachePlaces, setHomeSmartCachePlaces] = useState<GooglePlaceCachedItem[]>([]);
  const [isHomeSearchingOnline, setIsHomeSearchingOnline] = useState(false);
  const [homeCacheSourceLabel, setHomeCacheSourceLabel] = useState<string>('');

  const homeProvinces = useMemo(() => [
    { id: '', nameKh: 'គ្រប់ខេត្តក្រុង', nameEn: 'All Provinces' },
    { id: 'ភ្នំពេញ', nameKh: 'ភ្នំពេញ', nameEn: 'Phnom Penh' },
    { id: 'សៀមរាប', nameKh: 'សៀមរាប', nameEn: 'Siem Reap' },
    { id: 'បាត់ដំបង', nameKh: 'បាត់ដំបង', nameEn: 'Battambang' },
    { id: 'កំពត', nameKh: 'កំពត', nameEn: 'Kampot' },
    { id: 'កែប', nameKh: 'កែប', nameEn: 'Kep' },
    { id: 'ព្រះសីហនុ', nameKh: 'ព្រះសីហនុ', nameEn: 'Sihanoukville' },
  ], []);

  const hasActiveSearch = globalSearchQuery.trim().length > 0;

  const sessionShuffledRestaurants = useMemo(
    () => (hasActiveSearch ? sortRestaurantsWithVipRotation(shuffleForCurrentSession(restaurants), users, appSettings) : []),
    [hasActiveSearch, restaurants, users, appSettings]
  );
  const sessionShuffledDestinations = useMemo(
    () => (hasActiveSearch ? shuffleForCurrentSession(destinations) : []),
    [hasActiveSearch, destinations]
  );

  // Live Google Maps & Smart Cache Search on Home Screen
  useEffect(() => {
    const q = globalSearchQuery.trim();
    if (!q || q.length < 2) {
      setHomeSmartCachePlaces([]);
      setIsHomeSearchingOnline(false);
      return;
    }

    let cancelled = false;
    setIsHomeSearchingOnline(true);
    const timer = setTimeout(async () => {
      const res = await searchCambodiaPlacesWithSmartCache(
        q,
        selectedProvince || 'ទាំងអស់',
        'all'
      );
      if (!cancelled) {
        setHomeSmartCachePlaces(res.results);
        setHomeCacheSourceLabel(
          tr(language, 'ផែនទី Google Maps កម្ពុជា', 'Google Maps Cambodia', '柬埔寨 Google 地图')
        );
        setIsHomeSearchingOnline(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [globalSearchQuery, selectedProvince, language]);

  // Reset pagination when search query or filters change
  useEffect(() => {
    setSearchVisibleCount(12);
  }, [globalSearchQuery, selectedProvince, searchTab, searchRadiusMeters]);

  const handleSelectSearchRadius = async (meters: number) => {
    if (meters === 0) {
      setSearchRadiusMeters(0);
      return;
    }
    if (userGpsLocation) {
      setSearchRadiusMeters(meters);
      return;
    }
    setIsGettingSearchGps(true);
    const loc = await getCurrentDeviceLocation();
    setIsGettingSearchGps(false);
    if (loc) {
      setUserGpsLocation({ lat: loc.lat, lng: loc.lng });
      setSearchRadiusMeters(meters);
    } else {
      showToast(
        tr(
          language,
          'មិនអាចចាប់ទីតាំង GPS បានទេ។ កំពុងបង្ហាញលទ្ធផលទូទាំងប្រទេសជំនួស។',
          'GPS unavailable. Showing nationwide results instead.',
          '无法获取 GPS 位置，已为您显示全国搜索结果。'
        ),
        'warning'
      );
      setSearchRadiusMeters(0);
    }
  };

  // Global Search Filtering across Foods, Restaurants, Destinations + Google Maps Smart Cache
  const searchResults = useMemo(() => {
    const q = normalizeKhmerSearchText(globalSearchQuery);
    if (!q) return null;
    return performUnifiedCambodiaSearch({
      query: globalSearchQuery,
      provinceFilter: selectedProvince,
      foods,
      restaurants: sessionShuffledRestaurants,
      destinations: sessionShuffledDestinations,
      smartCachePlaces: homeSmartCachePlaces,
      currentUser,
      userLat: userGpsLocation?.lat,
      userLng: userGpsLocation?.lng,
      radiusMeters: searchRadiusMeters > 0 ? searchRadiusMeters : undefined,
    });
  }, [globalSearchQuery, selectedProvince, foods, sessionShuffledRestaurants, sessionShuffledDestinations, homeSmartCachePlaces, currentUser, userGpsLocation, searchRadiusMeters]);

  const todaySeed = useMemo(() => {
    const d = new Date();
    return d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
  }, []);

  const randomTrendingIds = useMemo(
    () => seededShuffle(trendingFoods.filter((t) => t && t.id), todaySeed + 17).slice(0, 8).map((t) => t.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trendingFoods.length, todaySeed]
  );

  const randomTrending = useMemo(() => {
    const foodById = new Map(foods.map((f) => [f.id, f]));
    const byId = new Map(trendingFoods.map((t) => [t.id, t]));
    return randomTrendingIds
      .map((id) => byId.get(id))
      .filter((t): t is TrendingFoodItem => Boolean(t && t.id))
      .map((t) => {
        if (t.photoUrl && (t.photoUrl.startsWith('data:') || t.photoUrl.startsWith('http'))) {
          return t;
        }
        const candidateIds = [
          ...(t.matchedFoodId ? [t.matchedFoodId] : []),
          ...(Array.isArray(t.fallbackFoodIds) ? t.fallbackFoodIds : []),
        ];
        for (const fid of candidateIds) {
          const matched = foodById.get(fid);
          if (
            matched &&
            matched.photoUrl &&
            (matched.isCustomPhoto || matched.photoUrl.startsWith('data:') || matched.photoUrl.startsWith('http'))
          ) {
            return { ...t, photoUrl: matched.photoUrl, isCustomPhoto: true };
          }
        }
        return t;
      });
  }, [trendingFoods, foods, randomTrendingIds]);

  const isHomeLoading = foods.length === 0 && restaurants.length === 0 && trendingFoods.length === 0;
  const canUseVipActions = isVip;
  const txt = (km: string, en: string, zh: string) => (language === 'km' ? km : language === 'zh' ? zh : en);

  const handleOpenFoodDetail = useCallback((item: TrendingFoodItem) => {
    setSelectedTrendingFood(item);
    setIsTrendingFoodDetailModalOpen(true);
  }, [setSelectedTrendingFood, setIsTrendingFoodDetailModalOpen]);

  const mealSlot = useMemo(() => getMealSlot(), []);
  const forYouFoods = useMemo(() => {
    const withPhoto = foods.filter((f) => f && f.id && f.photoUrl);
    const preferred = MEAL_CATEGORIES[mealSlot];
    const matching = withPhoto.filter((f) => preferred.includes(f.categorySlug));
    const pool = matching.length >= 3 ? matching : withPhoto;
    return seededShuffle(pool, todaySeed * 4 + ['breakfast', 'lunch', 'snack', 'dinner'].indexOf(mealSlot)).slice(0, 3);
  }, [foods, mealSlot, todaySeed]);

  const vipDaysLeft = isVip && currentUser ? getVipRemainingDays(currentUser) : 0;
  const vipNoticeKind: 'expiring' | 'expired' | null =
    currentUser && !isAdmin
      ? isVip && vipDaysLeft <= 3
        ? 'expiring'
        : !isVip && getVipAccountState(currentUser) === 'expired_vip'
        ? 'expired'
        : null
      : null;

  const handleSignIn = useCallback(() => setIsAuthModalOpen(true), [setIsAuthModalOpen]);
  const handleExploreProfile = useCallback(() => setActiveTab('profile'), [setActiveTab]);
  const handleUpgradeVip = useCallback(() => openUpgradeVipModal(), [openUpgradeVipModal]);
  const handleOpenAdminPanel = useCallback(() => {
    (window as any).__kft_admin_tab = 'stats';
    setIsAdminOpen(true);
  }, [setIsAdminOpen]);

  const handleNearbyFoodSearch = useCallback(() => {
    (window as any).__kft_near_me_initial_tab = 'restaurants';
    window.dispatchEvent(new CustomEvent('kft:near-me-tab', { detail: 'restaurants' }));
    setIsNearMeModalOpen(true);
  }, [setIsNearMeModalOpen]);

  const handleNearbyPlaces = useCallback(() => {
    (window as any).__kft_near_me_initial_tab = 'destinations';
    window.dispatchEvent(new CustomEvent('kft:near-me-tab', { detail: 'destinations' }));
    setIsNearMeModalOpen(true);
  }, [setIsNearMeModalOpen]);

  const handleFoodRecommendations = useCallback(() => setIsWhatToEatModalOpen(true), [setIsWhatToEatModalOpen]);

  const handleDailyFoodDiscovery = useCallback(() => {
    (window as any).__kft_daily_initial_category = 'food';
    setIsDailyDiscoveriesModalOpen(true);
  }, [setIsDailyDiscoveriesModalOpen]);

  const handleMapNavigation = useCallback(() => openGoogleMapsSearchModal('all'), [openGoogleMapsSearchModal]);

  const handleSmartAiAssistant = useCallback(() => setIsAiTripPlannerModalOpen(true), [setIsAiTripPlannerModalOpen]);
  const handleSeeAllFoods = useCallback(() => setActiveTab('food'), [setActiveTab]);
  const handleSeeAllRestaurants = useCallback(() => setActiveTab('restaurants'), [setActiveTab]);
  const handleSeeAllTourism = useCallback(() => setActiveTab('tourism'), [setActiveTab]);
  const handleExploreAllTrending = useCallback(() => setIsTrendingSocialModalOpen(true), [setIsTrendingSocialModalOpen]);

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-6 font-khmer">
      {/* 1. Greeting + User Profile Card + debounced search bar */}
      <HomeGreetingSearch
        language={language}
        userName={currentUser?.name}
        currentUser={currentUser}
        isVip={isVip}
        onSignIn={handleSignIn}
        onExploreProfile={handleExploreProfile}
        onUpgradeVip={handleUpgradeVip}
        onOpenAdminPanel={handleOpenAdminPanel}
        hint={getMealHint(mealSlot, language)}
        query={globalSearchQuery}
        onChange={setGlobalSearchQuery}
      />

      {/* 2. Global Live Search Results Dropdown/Panel */}
      {searchResults && (
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border-2 border-emerald-500 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5">
              <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {tr(language, `លទ្ធផលស្វែងរក (${searchResults.totalCount})`, `Search Results (${searchResults.totalCount})`, `搜索结果 (${searchResults.totalCount})`)}
              </h3>
            </div>
            <button
              onClick={() => setGlobalSearchQuery('')}
              className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-0.5"
            >
              <span>{tr(language, 'បិទការស្វែងរក', 'Close', '关闭')}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Province Chips inside Home Search */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {homeProvinces.map((p) => {
              const cleanSel = (selectedProvince || '').replace(/^រាជធានី|^ខេត្ត/g, '').trim();
              const active = cleanSel === p.id || (!cleanSel && p.id === '');
              return (
                <button
                  key={p.id || 'all'}
                  type="button"
                  onClick={() => setSelectedProvince(p.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-[#064E3B] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50'
                  }`}
                >
                  {language === 'km' ? p.nameKh : language === 'zh' ? translateProvince(p.nameEn, 'zh') : p.nameEn}
                </button>
              );
            })}
          </div>

          {/* Search Radius Controls (Near Me / GPS Distance Filter) */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 font-bold shrink-0 mr-0.5">
                {tr(language, 'ចម្ងាយ៖', 'Radius:', '距离：')}
              </span>
              {[
                { meters: 0, labelKh: 'ទូទាំងប្រទេស', labelEn: 'All', labelZh: '全国' },
                { meters: 2000, labelKh: '2km', labelEn: '2km', labelZh: '2公里' },
                { meters: 5000, labelKh: '5km', labelEn: '5km', labelZh: '5公里' },
                { meters: 15000, labelKh: '15km', labelEn: '15km', labelZh: '15公里' },
                { meters: 30000, labelKh: '30km', labelEn: '30km', labelZh: '30公里' },
              ].map((r) => (
                <button
                  key={r.meters}
                  type="button"
                  disabled={isGettingSearchGps}
                  onClick={() => handleSelectSearchRadius(r.meters)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                    searchRadiusMeters === r.meters
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-teal-50'
                  }`}
                >
                  {language === 'km' ? r.labelKh : language === 'zh' ? r.labelZh : r.labelEn}
                </button>
              ))}
              {isGettingSearchGps && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600 shrink-0 ml-1" />
              )}
            </div>

            {isHomeSearchingOnline && (
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{tr(language, 'កំពុងស្វែងរកលើផែនទី...', 'Searching Google Maps...', '正在搜索 Google 地图...')}</span>
              </div>
            )}
          </div>

          {homeCacheSourceLabel && !isHomeSearchingOnline && homeSmartCachePlaces.length > 0 && (
            <div className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
              <span>{tr(language, 'រួមបញ្ចូលបញ្ជីក្នុងកម្មវិធី និងផែនទី Google Maps', 'In-App Directory + Google Maps', '应用内名录与 Google 地图结果')}</span>
              <span>{homeCacheSourceLabel}</span>
            </div>
          )}

          {/* Result Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <button
              onClick={() => setSearchTab('all')}
              className={`px-3 py-1 rounded-xl font-bold transition text-xs whitespace-nowrap cursor-pointer ${
                searchTab === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tr(language, `ទាំងអស់ (${searchResults.totalCount})`, `All (${searchResults.totalCount})`, `全部 (${searchResults.totalCount})`)}
            </button>
            <button
              onClick={() => setSearchTab('food')}
              className={`px-3 py-1 rounded-xl font-bold transition text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                searchTab === 'food'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <IconNavFood className="w-3.5 h-3.5 shrink-0" />
              <span>{tr(language, `មុខម្ហូប (${searchResults.foods.length})`, `Dishes (${searchResults.foods.length})`, `美食 (${searchResults.foods.length})`)}</span>
            </button>
            <button
              onClick={() => setSearchTab('restaurants')}
              className={`px-3 py-1 rounded-xl font-bold transition text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                searchTab === 'restaurants'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <IconNavShop className="w-3.5 h-3.5 shrink-0" />
              <span>{tr(language, `ហាងអាហារ (${searchResults.restaurants.length})`, `Restaurants (${searchResults.restaurants.length})`, `餐厅 (${searchResults.restaurants.length})`)}</span>
            </button>
            <button
              onClick={() => setSearchTab('tourism')}
              className={`px-3 py-1 rounded-xl font-bold transition text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                searchTab === 'tourism'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <IconNavTourism className="w-3.5 h-3.5 shrink-0" />
              <span>{tr(language, `ទេសចរណ៍ (${searchResults.destinations.length})`, `Destinations (${searchResults.destinations.length})`, `景点 (${searchResults.destinations.length})`)}</span>
            </button>
            <button
              onClick={() => setSearchTab('external')}
              className={`px-3 py-1 rounded-xl font-bold transition text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                searchTab === 'external'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}
            >
              <IconMapRoute className="w-3.5 h-3.5 shrink-0" />
              <span>{tr(language, `Google Maps (${searchResults.externalPlaces.length})`, `Google Maps (${searchResults.externalPlaces.length})`, `谷歌地图 (${searchResults.externalPlaces.length})`)}</span>
            </button>
          </div>

          {/* Results List */}
          <div className="space-y-2 max-h-[440px] overflow-y-auto no-scrollbar pt-1">
            {isHomeSearchingOnline && searchResults.totalCount === 0 ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>{tr(language, 'កំពុងស្វែងរកម្ហូប ហាងអាហារ និងទីតាំងទេសចរណ៍...', 'Searching dishes, restaurants, and destinations...', '正在搜索美食、餐厅与景点...')}</span>
              </div>
            ) : searchResults.totalCount === 0 ? (
              <div className="py-8 text-center text-slate-500 space-y-2.5">
                <Search className="w-8 h-8 mx-auto text-slate-400 stroke-1" />
                <p className="text-xs sm:text-sm">
                  {tr(
                    language,
                    `រកមិនឃើញលទ្ធផលត្រូវនឹង "${globalSearchQuery}" ទេ`,
                    `No results found for "${globalSearchQuery}"`,
                    `未找到与“${globalSearchQuery}”相关的结果`
                  )}
                </p>
                {searchRadiusMeters > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchRadiusMeters(0)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold cursor-pointer"
                  >
                    <span>{tr(language, 'បង្ហាញលទ្ធផលទូទាំងប្រទេសវិញ', 'Show results across Cambodia', '恢复显示全国范围结果')}</span>
                  </button>
                )}
                <div className="pt-1 flex justify-center">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${globalSearchQuery.trim()} Cambodia`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>
                      {tr(
                        language,
                        `បើកស្វែងរក "${globalSearchQuery.trim()}" នៅលើ Google Maps`,
                        `Open "${globalSearchQuery.trim()}" in Google Maps`,
                        `在 Google 地图中搜索 “${globalSearchQuery.trim()}”`
                      )}
                    </span>
                  </a>
                </div>
                <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1 text-xs">
                  <span className="text-slate-400">{tr(language, 'សាកល្បង៖', 'Try:', '试试搜索：')}</span>
                  {(language === 'km'
                    ? ['អាម៉ុក', 'នំបញ្ចុក', 'សម្លកកូរ', 'ភ្នំពេញ', 'សៀមរាប', 'កំពត']
                    : language === 'zh'
                    ? ['阿莫克', '金边', '暹粒', '贡布', '白马']
                    : ['Amok', 'Samlor Korko', 'Lok Lak', 'Phnom Penh', 'Siem Reap']
                  ).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setGlobalSearchQuery(tag)}
                      className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-200"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              (() => {
                type UnifiedRow =
                  | { kind: 'food'; item: typeof searchResults.foods[0] }
                  | { kind: 'restaurant'; item: typeof searchResults.restaurants[0] }
                  | { kind: 'destination'; item: typeof searchResults.destinations[0] }
                  | { kind: 'external'; item: GooglePlaceCachedItem };

                const combinedRows: UnifiedRow[] = [];
                if (searchTab === 'all' || searchTab === 'food') {
                  searchResults.foods.forEach((f) => combinedRows.push({ kind: 'food', item: f }));
                }
                if (searchTab === 'all' || searchTab === 'restaurants') {
                  searchResults.restaurants.forEach((r) => combinedRows.push({ kind: 'restaurant', item: r }));
                }
                if (searchTab === 'all' || searchTab === 'tourism') {
                  searchResults.destinations.forEach((d) => combinedRows.push({ kind: 'destination', item: d }));
                }
                if (searchTab === 'all' || searchTab === 'external') {
                  searchResults.externalPlaces.forEach((p) => combinedRows.push({ kind: 'external', item: p }));
                }

                const visibleRows = combinedRows.slice(0, searchVisibleCount);
                const remainingCount = combinedRows.length - visibleRows.length;

                return (
                  <>
                    {visibleRows.map((row) => {
                      if (row.kind === 'food') {
                        const food = row.item;
                        const locF = getLocalizedFood(food, language);
                        return (
                          <div
                            key={`food-${food.id}`}
                            onClick={() => setSelectedFood(food)}
                            className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-slate-600 flex items-center justify-between gap-3 cursor-pointer transition group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img src={food.photoUrl} alt={locF.name} loading="lazy" decoding="async" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                                    {tr(language, 'មុខម្ហូប', 'Dish', '菜品')}
                                  </span>
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-emerald-600">
                                    {locF.name}
                                  </h4>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {locF.description}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
                          </div>
                        );
                      }

                      if (row.kind === 'restaurant') {
                        const rest = row.item;
                        const locR = getLocalizedRestaurant(rest, language);
                        const distKm =
                          userGpsLocation && typeof rest.latitude === 'number' && typeof rest.longitude === 'number'
                            ? (calculateDistanceMeters(userGpsLocation.lat, userGpsLocation.lng, rest.latitude, rest.longitude) / 1000).toFixed(1)
                            : null;
                        const canManageRowShop =
                          isAdmin ||
                          (currentUser &&
                            (rest.ownerId === currentUser.id ||
                              (currentUser.legacyIds && rest.ownerId && currentUser.legacyIds.includes(rest.ownerId)) ||
                              (currentUser.email && rest.ownerEmail && currentUser.email.toLowerCase() === rest.ownerEmail.toLowerCase())));
                        return (
                          <div
                            key={`rest-${rest.id}`}
                            onClick={() => setSelectedRestaurant(rest)}
                            className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-slate-600 flex items-center justify-between gap-3 cursor-pointer transition group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img src={rest.photoUrl} alt={locR.name} loading="lazy" decoding="async" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                                    {tr(language, 'ហាងអាហារ', 'Restaurant', '餐厅')}
                                  </span>
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-emerald-600">
                                    {locR.name}
                                  </h4>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {locR.address} {rest.phone ? `• ${rest.phone}` : ''} {distKm ? `• ${distKm} km` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {canManageRowShop && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      (window as any).__kft_manage_initial_tab = 'info';
                                      openManageMyVipStore(rest.id);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-[11px] font-black shadow-xs flex items-center gap-1 transition active:scale-95 font-khmer cursor-pointer"
                                    title={tr(language, 'កែប្រែហាង', 'Edit Shop', '编辑店铺')}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>{tr(language, 'កែប្រែ', 'Edit', '编辑')}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteRestaurant(rest.id);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs flex items-center gap-1 transition active:scale-95 font-khmer cursor-pointer"
                                    title={tr(language, 'លុបហាង', 'Delete Shop', '删除店铺')}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{tr(language, 'លុប', 'Delete', '删除')}</span>
                                  </button>
                                </>
                              )}
                              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
                            </div>
                          </div>
                        );
                      }

                      if (row.kind === 'destination') {
                        const dest = row.item;
                        const locD = getLocalizedDestination(dest, language);
                        const distKm =
                          userGpsLocation && typeof dest.latitude === 'number' && typeof dest.longitude === 'number'
                            ? (calculateDistanceMeters(userGpsLocation.lat, userGpsLocation.lng, dest.latitude, dest.longitude) / 1000).toFixed(1)
                            : null;
                        return (
                          <div
                            key={`dest-${dest.id}`}
                            onClick={() => setSelectedDestination(dest)}
                            className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-slate-600 flex items-center justify-between gap-3 cursor-pointer transition group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img src={dest.photoUrl} alt={locD.name} loading="lazy" decoding="async" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-[10px] font-bold">
                                    {tr(language, 'ទេសចរណ៍', 'Destination', '景点')}
                                  </span>
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-emerald-600">
                                    {locD.name}
                                  </h4>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {locD.province} ({locD.category}) {distKm ? `• ${distKm} km` : ''}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
                          </div>
                        );
                      }

                      const place = row.item;
                      const extName =
                        language === 'km'
                          ? place.nameKh || place.name
                          : place.nameEn || place.name;
                      const extAddress =
                        language === 'km'
                          ? place.addressKh || place.address || place.provinceKh
                          : place.address || place.addressKh || place.provinceEn;
                      const distKm =
                        userGpsLocation && typeof place.lat === 'number' && typeof place.lng === 'number'
                          ? (calculateDistanceMeters(userGpsLocation.lat, userGpsLocation.lng, place.lat, place.lng) / 1000).toFixed(1)
                          : null;

                      return (
                        <div
                          key={`ext-${place.placeId}`}
                          onClick={() => openExternalPlaceInGoogleMaps(place)}
                          className="p-2.5 rounded-2xl bg-blue-50/70 dark:bg-slate-700/60 hover:bg-blue-100/80 dark:hover:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between gap-3 cursor-pointer transition group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {place.hasRealGooglePhoto && place.photoUrl ? (
                              <img
                                src={place.photoUrl}
                                alt={extName}
                                loading="lazy"
                                decoding="async"
                                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-blue-200"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-teal-600 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                                <MapPin className="w-5 h-5" />
                                <span className="text-[8px] font-extrabold uppercase tracking-tighter">Maps</span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold shrink-0">
                                  Google Maps
                                </span>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600">
                                  {extName}
                                </h4>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                                {extAddress} {distKm ? `• ${distKm} km` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                            <span className="hidden sm:inline">{tr(language, 'ផែនទី', 'Maps', '地图')}</span>
                            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                          </div>
                        </div>
                      );
                    })}

                    {remainingCount > 0 && (
                      <div className="pt-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setSearchVisibleCount((prev) => prev + 12)}
                          className="w-full py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold border border-emerald-200 dark:border-slate-600 transition cursor-pointer"
                        >
                          {tr(
                            language,
                            `បង្ហាញលទ្ធផលបន្ថែម (${remainingCount} ទៀត)`,
                            `Show More Results (${remainingCount} more)`,
                            `加载更多结果（还有 ${remainingCount} 项）`
                          )}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}

      {!searchResults && (
        isAdmin ? (
          (() => {
            const activeVipUsersCount = users.filter(u => isUserVipActive(u)).length;
            const pendingTxnsCount = transactions.filter(
              t => t.status === 'pending_verification' || t.status === 'needs_more_info'
            ).length;
            const pendingShopsCount = restaurants.filter(r => r.status === 'pending').length;
            const verifiedShopsCount = restaurants.filter(r => r.isVerified).length;
            const pendingTicketsCount = supportTickets.filter(
              t => String(t.status || '').toLowerCase() === 'pending' || t.unreadByAdmin
            ).length;
            const totalPendingApprovals = pendingTxnsCount + pendingShopsCount + pendingTicketsCount;
            const rotCfg = getVipFeaturedRotationConfig(appSettings);

            const openAdminTab = (tab: string, settingsSection?: string) => {
              (window as any).__kft_admin_tab = tab;
              if (settingsSection) {
                (window as any).__kft_admin_settings_section = settingsSection;
              }
              setIsAdminOpen(true);
            };

            return (
              <div className="space-y-4 animate-in fade-in">
                {/* 1. System Statistics Card */}
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#064E3B] text-emerald-300 flex items-center justify-center shadow-2xs">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-moul text-xs sm:text-sm text-slate-900 dark:text-white">
                          {tr(language, 'ទិដ្ឋភាពទូទៅនៃប្រព័ន្ធ', 'System Overview', '系统运行概览')}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {tr(language, 'ស្ថិតិទិន្នន័យ និងសំណើរង់ចាំអនុម័ត', 'Directory statistics & pending approvals', '名录统计与待审批事项')}
                        </p>
                      </div>
                    </div>
                    {triggerCloudSyncNow && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerCloudSyncNow(true);
                          showToast(
                            tr(language, 'កំពុងធ្វើសមកាលកម្មទិន្នន័យ Cloud...', 'Syncing cloud database...', '正在同步云端数据库...'),
                            'info'
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-[#064E3B] dark:text-emerald-300 text-[11px] font-bold border border-emerald-200/80 dark:border-slate-600 flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{tr(language, 'Sync ទិន្នន័យ', 'Sync Cloud', '云端同步')}</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => openAdminTab('users')}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 dark:bg-slate-900/60 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700 text-left transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold">
                          {activeVipUsersCount} VIP
                        </span>
                      </div>
                      <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1.5">
                        {users.length}
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-[#064E3B] dark:group-hover:text-emerald-300">
                        {tr(language, 'អ្នកប្រើប្រាស់សរុប', 'Registered Users', '注册用户总数')}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openAdminTab('transactions')}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-amber-50/70 dark:bg-slate-900/60 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700 text-left transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                          <Clock className="w-4 h-4" />
                        </span>
                        {totalPendingApprovals > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                            {tr(language, `${totalPendingApprovals} រង់ចាំ`, `${totalPendingApprovals} Pending`, `${totalPendingApprovals} 待处理`)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            {tr(language, 'រួចរាល់', 'All Clear', '已处理')}
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1.5">
                        {pendingTxnsCount}
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-amber-700 dark:group-hover:text-amber-300">
                        {tr(language, 'វិក្កយបត្ររង់ចាំអនុម័ត', 'Pending Receipts', '待审付款凭证')}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openAdminTab('restaurants')}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 dark:bg-slate-900/60 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700 text-left transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 flex items-center justify-center">
                          <Store className="w-4 h-4" />
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                          {verifiedShopsCount} {tr(language, 'ផ្លូវការ', 'Verified', '已认证')}
                        </span>
                      </div>
                      <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1.5">
                        {restaurants.length}
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-[#064E3B] dark:group-hover:text-emerald-300">
                        {tr(language, 'ហាងអាហារសរុបក្នុងបញ្ជី', 'Total Directory Shops', '名录餐厅总数')}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openAdminTab('food')}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 dark:bg-slate-900/60 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700 text-left transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                          <Utensils className="w-4 h-4" />
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold">
                          {destinations.length} {tr(language, 'ទេសចរណ៍', 'Sights', '景点')}
                        </span>
                      </div>
                      <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1.5">
                        {foods.length}
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                        {tr(language, 'មុខម្ហូប & រូបមន្តសរុប', 'Dishes & Recipes', '美食与食谱总数')}
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Admin Management Menus Grid */}
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-moul text-xs sm:text-sm text-[#064E3B] dark:text-emerald-300 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      <span>{tr(language, 'ម៉ឺនុយគ្រប់គ្រងរដ្ឋបាល', 'Admin Management', '系统管理菜单')}</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        title: tr(language, 'គ្រប់គ្រងអ្នកប្រើប្រាស់ & VIP', 'User & VIP Management', '用户与 VIP 管理'),
                        desc: tr(language, `${users.length} គណនី • ត្រួតពិនិត្យ កែប្រែ ឬលុបគណនី`, `${users.length} accounts • Inspect, edit roles or delete`, `共 ${users.length} 个账户 • 查看、修改或删除`),
                        icon: Users,
                        badge: `${users.length}`,
                        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                        onClick: () => openAdminTab('users'),
                      },
                      {
                        title: tr(language, 'អនុម័តការបង់ប្រាក់ & វិក្កយបត្រ', 'Payment & Receipt Approvals', '付款与凭证审批'),
                        desc: tr(language, 'ពិនិត្យបង្កាន់ដៃ ABA KHQR និងអនុម័ត VIP', 'Verify ABA KHQR receipts & approve VIP', '核验 ABA 付款凭证并审批 VIP'),
                        icon: CreditCard,
                        badge: pendingTxnsCount > 0 ? `${pendingTxnsCount} រង់ចាំ` : 'រួចរាល់',
                        badgeClass: pendingTxnsCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                        onClick: () => openAdminTab('transactions'),
                      },
                      {
                        title: tr(language, 'គ្រប់គ្រងហាងអាហារទាំងអស់', 'Restaurant Directory Control', '餐厅名录管理'),
                        desc: tr(language, `${restaurants.length} ហាង • អនុម័តហាងថ្មី កែប្រែ និងផ្ទៀងផ្ទាត់`, `${restaurants.length} shops • Approve, verify & edit listings`, `${restaurants.length} 家餐厅 • 审批、认证与编辑`),
                        icon: Store,
                        badge: pendingShopsCount > 0 ? `${pendingShopsCount} ថ្មី` : `${verifiedShopsCount} ផ្លូវការ`,
                        badgeClass: pendingShopsCount > 0 ? 'bg-amber-500 text-slate-950' : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
                        onClick: () => openAdminTab('restaurants'),
                      },
                      {
                        title: tr(language, 'វេនបង្ហាញហាង VIP មុខគេ', 'VIP Shop Featured Rotation', 'VIP 店铺置顶轮播设置'),
                        desc: tr(
                          language,
                          rotCfg.enabled ? `កំពុងបើកដំណើរការ • បង្វិលរៀងរាល់ ${rotCfg.durationDays} ថ្ងៃ` : 'បានបិទការបង្វិលបង្ហាញមុខគេ',
                          rotCfg.enabled ? `Active • Rotates every ${rotCfg.durationDays} day(s)` : 'Featured rotation disabled',
                          rotCfg.enabled ? `已启用 • 每 ${rotCfg.durationDays} 天轮换` : '置顶轮播已关闭'
                        ),
                        icon: RefreshCw,
                        badge: rotCfg.enabled ? `${rotCfg.durationDays}d` : 'OFF',
                        badgeClass: rotCfg.enabled ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700',
                        onClick: () => openAdminTab('settings', 'featured_rotation'),
                      },
                      {
                        title: tr(language, 'គ្រប់គ្រងមុខម្ហូប & រូបភាព', 'Food & Recipe Management', '菜品与食谱管理'),
                        desc: tr(language, `${foods.length} មុខម្ហូប • បន្ថែមម្ហូបថ្មី ឬប្តូររូបភាព`, `${foods.length} dishes • Add recipes or update photos`, `${foods.length} 道菜品 • 添加食谱或更新图片`),
                        icon: Utensils,
                        badge: `${foods.length}`,
                        badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
                        onClick: () => openAdminTab('food'),
                      },
                      {
                        title: tr(language, 'គ្រប់គ្រងតំបន់ទេសចរណ៍', 'Tourism Destinations Control', '旅游景点管理'),
                        desc: tr(language, `${destinations.length} កន្លែង • គ្រប់គ្រងរមណីយដ្ឋាន ២៥ ខេត្ត-ក្រុង`, `${destinations.length} sights • Manage destinations across 25 provinces`, `${destinations.length} 个景点 • 管理 25 省市景点`),
                        icon: Compass,
                        badge: `${destinations.length}`,
                        badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
                        onClick: () => openAdminTab('destinations'),
                      },
                      {
                        title: tr(language, 'សារជំនួយ & សំណើអតិថិជន', 'Support Tickets & Helpdesk', '客服工单与支持'),
                        desc: tr(language, 'ឆ្លើយតបសារ និងដោះស្រាយបញ្ហាជូនអ្នកប្រើប្រាស់', 'Reply to user inquiries & payment tickets', '回复用户咨询与付款支持工单'),
                        icon: MessageSquare,
                        badge: pendingTicketsCount > 0 ? `${pendingTicketsCount} ថ្មី` : `${supportTickets.length}`,
                        badgeClass: pendingTicketsCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                        onClick: () => openAdminTab('support_tickets'),
                      },
                      {
                        title: tr(language, 'ការកំណត់ប្រព័ន្ធ & សុវត្ថិភាព', 'System Settings & Security', '系统设置与安全审计'),
                        desc: tr(language, 'កំណត់តម្លៃ VIP, ធនាគារ KHQR, Cloud API និងសុវត្ថិភាព', 'Configure VIP pricing, KHQR, Cloud API & Security', '配置价格、收款码、云端 API 与安全'),
                        icon: Shield,
                        badge: 'Config',
                        badgeClass: 'bg-emerald-900 text-emerald-200',
                        onClick: () => openAdminTab('settings', 'all'),
                      },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={item.onClick}
                        className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 dark:bg-slate-900/60 dark:hover:bg-slate-700/60 border border-slate-200/90 dark:border-slate-700 flex items-start justify-between gap-2.5 text-left transition active:scale-[0.99] cursor-pointer group"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#064E3B] text-amber-300 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-[#064E3B] dark:group-hover:text-emerald-300 truncate">
                              {item.title}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${item.badgeClass}`}>
                            {item.badge}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Admin Field & Directory Quick Tools */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-[#064E3B] via-[#065F46] to-slate-900 text-white border border-emerald-500/40 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-moul text-xs sm:text-sm text-amber-300 flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        <span>{tr(language, 'ឧបករណ៍បន្ថែម និងផ្ទៀងផ្ទាត់ទិន្នន័យផ្ទាល់', 'Directory & Field Verification Tools', '数据录入与实地核验工具')}</span>
                      </h3>
                      <p className="text-[11px] text-emerald-100/90 mt-0.5">
                        {tr(language, 'បន្ថែមហាងផ្លូវការ ឆែកអ៊ីនទីតាំង GPS និងនាំចូលទិន្នន័យផែនទី', 'Add official shops, verify live GPS coordinates & import places', '添加官方店铺、核验 GPS 坐标及导入地图地点')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        (window as any).__kft_vip_store_initial_mode = { mode: 'create' };
                        setIsVipAddRestaurantModalOpen(true);
                      }}
                      className="p-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>{tr(language, 'បន្ថែមហាងផ្លូវការថ្មី', 'Add Official Shop', '添加官方店铺')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsRestaurantCheckInModalOpen(true)}
                      className="p-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span>{tr(language, 'ឆែកអ៊ីន & បញ្ជាក់ GPS', 'GPS Live Check-In', 'GPS 实地核验')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openGoogleMapsSearchModal('all')}
                      className="p-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <Globe className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>{tr(language, 'នាំចូលពី Google Maps', 'Import Google Maps', '从 Google 地图导入')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
        <>
          {isHomeLoading ? (
            <HomeSkeleton />
          ) : (
            <>
              {vipNoticeKind && (
                <VipStatusNotice
                  language={language}
                  kind={vipNoticeKind}
                  daysLeft={vipDaysLeft}
                  onRenew={() => openUpgradeVipModal(true)}
                />
              )}

              {/* 1. Six Smart Daily Services (5 Free + 1 VIP Smart AI Assistant) */}
              <FeatureGrid
                language={language}
                isVip={canUseVipActions}
                onNearbyFoodSearch={handleNearbyFoodSearch}
                onNearbyPlaces={handleNearbyPlaces}
                onFoodRecommendations={handleFoodRecommendations}
                onDailyFoodDiscovery={handleDailyFoodDiscovery}
                onMapNavigation={handleMapNavigation}
                onSmartAiAssistant={handleSmartAiAssistant}
              />

              {/* 2. Personalized picks for the current time of day */}
              <ForYouSection
                language={language}
                slot={mealSlot}
                foods={forYouFoods}
                onOpenFood={setSelectedFood}
                onSeeAll={handleSeeAllFoods}
              />

              {/* 3. Trending foods */}
              {randomTrending.length > 0 ? (
                <TrendingFoodsRow
                  language={language}
                  items={randomTrending}
                  onOpen={handleOpenFoodDetail}
                  onExploreAll={handleExploreAllTrending}
                />
              ) : (
                <HomeEmptyState
                  language={language}
                  emoji="🍲"
                  title={txt('មិនទាន់មានម្ហូបពេញនិយម', 'No featured dishes yet', '暂无精选美食')}
                  message={txt('សូមមើលមុខម្ហូបទាំងអស់ក្នុងផ្ទាំងម្ហូប', 'Browse all dishes in the Food tab.', '请到“美食”页浏览全部菜品。')}
                  actionLabel={txt('មើលមុខម្ហូប', 'Browse dishes', '浏览美食')}
                  onAction={handleSeeAllFoods}
                />
              )}

              {/* 4. Popular places (with quick province chips) */}
              <PopularShops
                language={language}
                restaurants={restaurants}
                onOpen={setSelectedRestaurant}
                onSeeAll={handleSeeAllRestaurants}
              />

              {/* 5. Explore Cambodia */}
              <PopularDestinations
                language={language}
                destinations={destinations}
                onOpen={setSelectedDestination}
                onSeeAll={handleSeeAllTourism}
              />

              {/* 6. Cambodia at a glance */}
              <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/10 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                {[
                  { n: foods.length, label: txt('មុខម្ហូប', 'Dishes', '美食'), tab: 'food' },
                  { n: restaurants.length, label: txt('ហាងអាហារ', 'Restaurants', '餐厅'), tab: 'restaurants' },
                  { n: destinations.length, label: txt('តំបន់ទេសចរណ៍', 'Destinations', '景点'), tab: 'tourism' },
                ].map((s) => (
                  <button
                    key={s.tab}
                    type="button"
                    onClick={() => setActiveTab(s.tab as any)}
                    className="py-3.5 text-center hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition cursor-pointer"
                  >
                    <span className="block text-lg font-black font-mono text-[#064E3B] dark:text-amber-300 leading-tight">{s.n}+</span>
                    <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">{s.label}</span>
                  </button>
                ))}
              </div>

              {/* 7. VIP members manage their shop; everyone else sees one calm benefits card */}
              {isVip ? (
                <MyShopPanel
                  language={language}
                  shops={myRestaurants}
                  usedStores={storeQuota.usedStoresCount}
                  totalStores={storeQuota.totalAllowedStores}
                  onManage={(shopId) => openManageMyVipStore(shopId)}
                  onAdd={() => {
                    if (!currentUser) {
                      setIsAuthModalOpen(true);
                      return;
                    }
                    setIsVipAddRestaurantModalOpen(true);
                  }}
                  onDelete={deleteRestaurant ? (shopId) => { deleteRestaurant(shopId); } : undefined}
                />
              ) : (
                <VipPerksCard language={language} onLearnMore={handleUpgradeVip} />
              )}
            </>
          )}
        </>
        )
      )}
    </div>
  );
};

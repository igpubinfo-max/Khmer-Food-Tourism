import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Calendar,
  Sparkles,
  RefreshCw,
  ChefHat,
  Store,
  Mountain,
  Star,
  MapPin,
  ChevronRight,
  Search,
  Tag,
  Newspaper,
  PartyPopper,
  ExternalLink,
  Navigation,
  EyeOff,
  CheckCircle2,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { DailyDiscoveryCategory, DailyDiscoveryItem } from '../types';
import {
  fetchDynamicDailyDiscoveries,
  buildCuratedCambodiaDiscoveryItems,
  formatRelativeTimestamp,
  calculateDistanceKm,
  CAMBODIA_PROVINCE_COORDS,
  loadSeenDiscoveryIds,
  markDiscoveryItemSeen,
  loadDismissedDiscoveryIds,
  dismissDiscoveryItem,
  clearSeenDiscoveryHistory,
} from '../services/dailyDiscoveryAndNotificationService';
import { tr, translateTextToChinese, translateProvince } from '../utils/i18n';

export const DailyDiscoveriesModal: React.FC = () => {
  const {
    isDailyDiscoveriesModalOpen,
    setIsDailyDiscoveriesModalOpen,
    foods,
    restaurants,
    destinations,
    language,
    setSelectedFood,
    setSelectedRestaurant,
    setSelectedDestination,
    setActiveTab,
    showToast,
  } = useApp();

  const isKm = language === 'km';

  const [items, setItems] = useState<DailyDiscoveryItem[]>(() =>
    buildCuratedCambodiaDiscoveryItems(foods, restaurants, destinations)
  );
  const [selectedCategory, setSelectedCategory] = useState<DailyDiscoveryCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [onlyUnseen, setOnlyUnseen] = useState<boolean>(false);
  const [nearMeActive, setNearMeActive] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() => new Date().toISOString());
  const [seenIds, setSeenIds] = useState<Set<string>>(() => loadSeenDiscoveryIds());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadDismissedDiscoveryIds());
  const [rotationOffset, setRotationOffset] = useState<number>(0);

  const syncFeed = useCallback(
    async (force = false) => {
      setIsSyncing(true);
      try {
        const res = await fetchDynamicDailyDiscoveries({
          foods,
          restaurants,
          destinations,
          forceRefresh: force,
        });
        setItems(res.items);
        setLastSyncedAt(res.lastSyncedAt);
        if (force) {
          setRotationOffset((prev) => prev + 1);
          showToast(
            tr(
              language,
              `✨ បានធ្វើបច្ចុប្បន្នភាពកន្លែងថ្មី និងព្រឹត្តិការណ៍ចំនួន ${res.items.length} មុខ!`,
              `✨ Synced ${res.items.length} latest places, promos & events!`,
              `✨ 已同步 ${res.items.length} 条最新地点、优惠与活动资讯！`
            ),
            'success'
          );
        }
      } catch {
        const fallback = buildCuratedCambodiaDiscoveryItems(foods, restaurants, destinations);
        setItems(fallback);
      } finally {
        setIsSyncing(false);
      }
    },
    [foods, restaurants, destinations, language, showToast]
  );

  // Sync automatically when opened (manual refresh available anytime; no background polling timer)
  useEffect(() => {
    if (!isDailyDiscoveriesModalOpen) return;
    syncFeed(false);
  }, [isDailyDiscoveriesModalOpen, syncFeed]);

  const handleToggleNearMe = () => {
    if (nearMeActive) {
      setNearMeActive(false);
      return;
    }
    setIsLocating(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setNearMeActive(true);
          setIsLocating(false);
          showToast(
            tr(
              language,
              '📍 បានរៀបចំកន្លែងថ្មីៗតាមទីតាំងជិតអ្នកបំផុត!',
              '📍 Sorted discoveries by closest distance to you!',
              '📍 已按距离您最近的位置排序！'
            ),
            'success'
          );
        },
        () => {
          // Privacy-safe fallback to selected province or Phnom Penh center
          const fallbackProv =
            selectedProvince !== 'all' && CAMBODIA_PROVINCE_COORDS[selectedProvince]
              ? CAMBODIA_PROVINCE_COORDS[selectedProvince]
              : CAMBODIA_PROVINCE_COORDS['រាជធានីភ្នំពេញ'];
          setUserCoords({ lat: fallbackProv.lat, lng: fallbackProv.lng });
          setNearMeActive(true);
          setIsLocating(false);
          showToast(
            tr(
              language,
              '📍 បានប្រើទីតាំងតំបន់កណ្តាល ដើម្បីណែនាំកន្លែងជិតអ្នក',
              '📍 Using regional center for nearby recommendations',
              '📍 已使用区域中心为您推荐附近地点'
            ),
            'info'
          );
        },
        { enableHighAccuracy: false, timeout: 4500, maximumAge: 120000 }
      );
    } else {
      setUserCoords({ lat: 11.5564, lng: 104.9282 });
      setNearMeActive(true);
      setIsLocating(false);
    }
  };

  const provincesList = useMemo(() => {
    const set = new Set<string>(Object.keys(CAMBODIA_PROVINCE_COORDS));
    for (const item of items) {
      if (item.provinceKh && item.provinceKh !== 'ទូទាំងប្រទេសកម្ពុជា') {
        set.add(item.provinceKh);
      }
    }
    return Array.from(set);
  }, [items]);

  const categoryTabs: Array<{
    id: DailyDiscoveryCategory;
    label: string;
    icon: React.ReactNode;
    count: number;
  }> = useMemo(() => {
    const activePool = items.filter((i) => !dismissedIds.has(i.id));
    return [
      {
        id: 'all',
        label: tr(language, 'ទាំងអស់', 'All', '全部'),
        icon: <Sparkles className="w-3.5 h-3.5" />,
        count: activePool.length,
      },
      {
        id: 'food',
        label: tr(language, 'មុខម្ហូបថ្ងៃនេះ', 'Daily Dishes', '今日美食'),
        icon: <ChefHat className="w-3.5 h-3.5" />,
        count: activePool.filter((i) => i.category === 'food').length,
      },
      {
        id: 'restaurant',
        label: tr(language, 'ហាងថ្មី', 'New Shops', '新餐厅'),
        icon: <Store className="w-3.5 h-3.5" />,
        count: activePool.filter((i) => i.category === 'restaurant').length,
      },
      {
        id: 'promotion',
        label: tr(language, 'ប្រូម៉ូសិន', 'Promos', '优惠促销'),
        icon: <Tag className="w-3.5 h-3.5" />,
        count: activePool.filter((i) => i.category === 'promotion').length,
      },
      {
        id: 'attraction',
        label: tr(language, 'ទេសចរណ៍', 'Attractions', '旅游景点'),
        icon: <Mountain className="w-3.5 h-3.5" />,
        count: activePool.filter((i) => i.category === 'attraction').length,
      },
      {
        id: 'event',
        label: tr(language, 'ព្រឹត្តិការណ៍', 'Events', '节庆活动'),
        icon: <PartyPopper className="w-3.5 h-3.5" />,
        count: activePool.filter((i) => i.category === 'event').length,
      },
      {
        id: 'local_news',
        label: tr(language, 'ព័ត៌មាន', 'Local News', '本地资讯'),
        icon: <Newspaper className="w-3.5 h-3.5" />,
        count: activePool.filter((i) => i.category === 'local_news').length,
      },
    ];
  }, [items, dismissedIds, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = items.filter((item) => {
      if (dismissedIds.has(item.id)) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (
        selectedProvince !== 'all' &&
        item.provinceKh !== selectedProvince &&
        item.provinceKh !== 'ទូទាំងប្រទេសកម្ពុជា'
      ) {
        return false;
      }
      if (onlyUnseen && seenIds.has(item.id)) return false;
      if (q) {
        const matchTitle =
          item.titleKh.toLowerCase().includes(q) ||
          item.titleEn.toLowerCase().includes(q) ||
          (item.titleZh && item.titleZh.toLowerCase().includes(q));
        const matchSummary =
          item.summaryKh.toLowerCase().includes(q) ||
          item.summaryEn.toLowerCase().includes(q);
        const matchProv =
          item.provinceKh.toLowerCase().includes(q) ||
          item.provinceEn.toLowerCase().includes(q);
        const matchSource = item.sourceName.toLowerCase().includes(q);
        if (!matchTitle && !matchSummary && !matchProv && !matchSource) return false;
      }
      return true;
    });

    // Prioritize:
    // 1. If nearMeActive & userCoords -> sort by distance ascending
    // 2. Otherwise -> prioritize unseen items first, then isNewToday, then newest timestamp (with rotationOffset support)
    return [...list].sort((a, b) => {
      if (nearMeActive && userCoords) {
        const da = calculateDistanceKm(userCoords.lat, userCoords.lng, a.latitude, a.longitude) ?? 9999;
        const db = calculateDistanceKm(userCoords.lat, userCoords.lng, b.latitude, b.longitude) ?? 9999;
        if (Math.abs(da - db) > 0.5) return da - db;
      }
      const aSeen = seenIds.has(a.id) ? 1 : 0;
      const bSeen = seenIds.has(b.id) ? 1 : 0;
      if (aSeen !== bSeen) return aSeen - bSeen; // Unseen first!

      // Prioritize food & restaurant discoveries first for Daily Food Discovery
      const aFoodPriority = a.category === 'food' || a.category === 'restaurant' || a.category === 'promotion' ? 0 : 1;
      const bFoodPriority = b.category === 'food' || b.category === 'restaurant' || b.category === 'promotion' ? 0 : 1;
      if (aFoodPriority !== bFoodPriority) return aFoodPriority - bFoodPriority;

      if (rotationOffset > 0) {
        const ha = ((a.id.charCodeAt(a.id.length - 1) + rotationOffset * 7) % 13);
        const hb = ((b.id.charCodeAt(b.id.length - 1) + rotationOffset * 7) % 13);
        if (ha !== hb) return ha - hb;
      }

      const ta = Date.parse(a.publishedAt) || 0;
      const tb = Date.parse(b.publishedAt) || 0;
      return tb - ta;
    });
  }, [
    items,
    dismissedIds,
    selectedCategory,
    selectedProvince,
    onlyUnseen,
    seenIds,
    searchQuery,
    nearMeActive,
    userCoords,
    rotationOffset,
  ]);

  if (!isDailyDiscoveriesModalOpen) return null;

  const handleOpenItem = (item: DailyDiscoveryItem) => {
    const updatedSeen = markDiscoveryItemSeen(item.id);
    setSeenIds(new Set(updatedSeen));

    if (item.targetType === 'restaurant' && item.targetId) {
      const r = restaurants.find((x) => x.id === item.targetId) || restaurants[0];
      if (r) {
        setActiveTab('restaurants');
        setSelectedRestaurant(r);
        setIsDailyDiscoveriesModalOpen(false);
        return;
      }
    }
    if (item.targetType === 'destination' && item.targetId) {
      const d = destinations.find((x) => x.id === item.targetId) || destinations[0];
      if (d) {
        setActiveTab('tourism');
        setSelectedDestination(d);
        setIsDailyDiscoveriesModalOpen(false);
        return;
      }
    }
    if (item.targetType === 'food' && item.targetId) {
      const f = foods.find((x) => x.id === item.targetId) || foods[0];
      if (f) {
        setActiveTab('food');
        setSelectedFood(f);
        setIsDailyDiscoveriesModalOpen(false);
        return;
      }
    }
    if (item.sourceUrl) {
      window.open(item.sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = dismissDiscoveryItem(id);
    setDismissedIds(new Set(next));
    showToast(
      tr(
        language,
        'បានលាក់មាតិកានេះ ដើម្បីបង្ហាញកន្លែងថ្មីៗផ្សេងទៀត',
        'Hidden item to prioritize fresh discoveries',
        '已隐藏此内容，为您优先展示其他新地点'
      ),
      'info'
    );
  };

  const handleResetFiltersAndHistory = () => {
    setSelectedCategory('all');
    setSelectedProvince('all');
    setSearchQuery('');
    setOnlyUnseen(false);
    setNearMeActive(false);
    clearSeenDiscoveryHistory();
    setSeenIds(new Set());
    setDismissedIds(new Set());
    syncFeed(true);
  };

  const getCategoryBadge = (cat: DailyDiscoveryItem['category']) => {
    switch (cat) {
      case 'restaurant':
        return {
          label: tr(language, '🏪 ហាង & ភោជនីយដ្ឋាន', '🏪 Restaurant & Shop', '🏪 餐厅与店铺'),
          cls: 'bg-emerald-600 text-white',
        };
      case 'attraction':
        return {
          label: tr(language, '🏞️ តំបន់ទេសចរណ៍', '🏞️ Tourist Attraction', '🏞️ 旅游景点'),
          cls: 'bg-teal-600 text-white',
        };
      case 'promotion':
        return {
          label: tr(language, '🏷️ ប្រូម៉ូសិនពិសេស', '🏷️ Special Promotion', '🏷️ 优惠促销'),
          cls: 'bg-rose-600 text-white',
        };
      case 'event':
        return {
          label: tr(language, '🎉 ព្រឹត្តិការណ៍ & ពិធីបុណ្យ', '🎉 Event & Festival', '🎉 节庆活动'),
          cls: 'bg-amber-500 text-slate-950',
        };
      case 'local_news':
        return {
          label: tr(language, '📰 ព័ត៌មានក្នុងស្រុក', '📰 Local News', '📰 本地资讯'),
          cls: 'bg-sky-600 text-white',
        };
      case 'food':
      default:
        return {
          label: tr(language, '🍲 មុខម្ហូបឆ្នើម', '🍲 Featured Dish', '🍲 精选美食'),
          cls: 'bg-amber-600 text-white',
        };
    }
  };

  const getTitle = (item: DailyDiscoveryItem) => {
    if (language === 'km') return item.titleKh;
    if (language === 'zh') return item.titleZh || translateTextToChinese(item.titleEn || item.titleKh);
    return item.titleEn || item.titleKh;
  };

  const getSummary = (item: DailyDiscoveryItem) => {
    if (language === 'km') return item.summaryKh;
    if (language === 'zh') return item.summaryZh || translateTextToChinese(item.summaryEn || item.summaryKh);
    return item.summaryEn || item.summaryKh;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={() => setIsDailyDiscoveriesModalOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#064E3B] via-[#047857] to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-xs shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-moul text-sm text-white">
                  {tr(language, 'ស្វែងយល់ម្ហូបប្រចាំថ្ងៃ', 'Daily Food Discovery', '每日美食探索')}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-[10px] font-extrabold shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  <span>{tr(language, 'ឥតគិតថ្លៃ • FREE', 'FREE Access', '免费使用')}</span>
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-khmer truncate">
                {tr(
                  language,
                  'មុខម្ហូបប្លែកៗប្រចាំថ្ងៃ ហាងថ្មី ប្រូម៉ូសិន និងកន្លែងគួរសាកល្បង',
                  'Daily featured dishes, new restaurants, special promos & spots',
                  '每日特色菜品、新开业餐厅、优惠促销与打卡地'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDailyDiscoveriesModalOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-100 hover:text-white transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Sync Status & Refresh Bar */}
        <div className="px-3.5 py-2 bg-emerald-50/90 dark:bg-slate-800/90 border-b border-emerald-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 font-khmer">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#064E3B] dark:text-emerald-300 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span className="truncate">
              {tr(
                language,
                `ធ្វើបច្ចុប្បន្នភាព៖ ${formatRelativeTimestamp(lastSyncedAt, language)}`,
                `Updated: ${formatRelativeTimestamp(lastSyncedAt, language)}`,
                `最近同步：${formatRelativeTimestamp(lastSyncedAt, language)}`
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleNearMe}
              disabled={isLocating}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                nearMeActive
                  ? 'bg-emerald-700 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-emerald-400'
              }`}
            >
              <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{tr(language, 'នៅជិតខ្ញុំ', 'Near Me', '附近推荐')}</span>
            </button>

            <button
              type="button"
              onClick={() => syncFeed(true)}
              disabled={isSyncing}
              className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 border border-emerald-200 dark:border-slate-600 rounded-xl text-[11px] font-bold shadow-2xs hover:bg-emerald-50 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{tr(language, 'ទាញយកថ្មី', 'Refresh', '刷新')}</span>
            </button>
          </div>
        </div>

        {/* Search, Category Tabs & Province/Unseen Filters */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0 font-khmer">
          {/* Search Input & Province Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr(
                  language,
                  'ស្វែងរកហាងថ្មី, ទេសចរណ៍, ប្រូម៉ូសិន, ព្រឹត្តិការណ៍...',
                  'Search new places, promos, events, news...',
                  '搜索新餐厅、景点、促销或节庆活动...'
                )}
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative shrink-0">
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="pl-2.5 pr-6 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 max-w-[140px] truncate"
              >
                <option value="all">{tr(language, '📍 គ្រប់ខេត្ត-ក្រុង', '📍 All Provinces', '📍 全部省市')}</option>
                {provincesList.map((prov) => (
                  <option key={prov} value={prov}>
                    {translateProvince(prov, language)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {categoryTabs.map((tab) => {
              const active = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    active
                      ? 'bg-[#064E3B] text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700/90 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-600 hover:border-emerald-500/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Unseen Filter & Result Count Bar */}
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {tr(
                language,
                `បង្ហាញ ${filteredItems.length} មាតិកា`,
                `${filteredItems.length} updates`,
                `共 ${filteredItems.length} 条动态`
              )}
            </span>

            <button
              type="button"
              onClick={() => setOnlyUnseen((prev) => !prev)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition cursor-pointer ${
                onlyUnseen
                  ? 'bg-amber-400/20 text-amber-800 dark:text-amber-300 border-amber-400'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>{tr(language, 'មិនទាន់មើលប៉ុណ្ណោះ', 'Unseen Only', '仅看未读')}</span>
            </button>
          </div>
        </div>

        {/* Feed Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 no-scrollbar font-khmer">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const badge = getCategoryBadge(item.category);
              const isSeen = seenIds.has(item.id);
              const distKm =
                userCoords && item.latitude && item.longitude
                  ? calculateDistanceKm(userCoords.lat, userCoords.lng, item.latitude, item.longitude)
                  : null;

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
                  className={`group rounded-3xl overflow-hidden bg-white dark:bg-slate-800/95 border transition cursor-pointer shadow-xs hover:shadow-md ${
                    !isSeen
                      ? 'border-emerald-500/60 dark:border-emerald-600/60'
                      : 'border-slate-200/90 dark:border-slate-700/90 opacity-95'
                  }`}
                >
                  {/* Image Header */}
                  <div className="relative aspect-16/9 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={item.photoUrl}
                      alt={getTitle(item)}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = '1';
                          target.src = '/destinations/dest-1.jpg';
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                    {/* Top Left Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-xs ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {item.isNewToday && !isSeen && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-xs">
                          {tr(language, '✨ ថ្មីថ្ងៃនេះ', '✨ NEW TODAY', '✨ 今日最新')}
                        </span>
                      )}
                      {item.discountPercent && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black font-mono shadow-xs">
                          -{item.discountPercent}% OFF
                        </span>
                      )}
                    </div>

                    {/* Top Right Dismiss Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDismiss(e, item.id)}
                      title={tr(language, 'លាក់មាតិកានេះ', 'Hide this item', '隐藏此条')}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/50 hover:bg-rose-600 text-white/90 transition cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>

                    {/* Bottom Image Overlay Info */}
                    <div className="absolute bottom-2.5 left-3 right-3 text-white space-y-1">
                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-emerald-300 font-bold">
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {isKm ? item.provinceKh : item.provinceEn}
                        </span>
                        {distKm !== null && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-white font-mono">
                            📍 {distKm} km
                          </span>
                        )}
                        {item.priceDisplay && item.targetType !== 'destination' && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-400/25 text-amber-200">
                            {item.priceDisplay.includes('$0') || item.priceDisplay.includes('ឥតគិតថ្លៃ') || item.priceDisplay.includes('សេរី') || item.priceDisplay.includes('ប្រហាក់ប្រហែល')
                              ? item.priceDisplay
                              : tr(language, `ប្រហាក់ប្រហែល ${item.priceDisplay}`, `Approx. ${item.priceDisplay}`, `约 ${item.priceDisplay}`)}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm leading-snug drop-shadow line-clamp-2">
                        {getTitle(item)}
                      </h4>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-3.5 space-y-2.5">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {getSummary(item)}
                    </p>

                    {/* Tags */}
                    {item.tagsKh && item.tagsKh.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(isKm ? item.tagsKh : item.tagsEn || item.tagsKh).slice(0, 3).map((t, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 text-[10px] font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer: Timestamp, Source Link & Open CTA */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="text-slate-400 dark:text-slate-400 font-mono text-[10px]">
                          🕒 {formatRelativeTimestamp(item.publishedAt, language)}
                        </span>

                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline font-medium text-[10px] truncate max-w-[160px]"
                          >
                            <span>{item.sourceName}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSeen && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>{tr(language, 'បានមើល', 'Seen', '已看')}</span>
                          </span>
                        )}
                        <span className="text-[#064E3B] dark:text-emerald-400 font-bold flex items-center gap-0.5">
                          {tr(language, 'មើលលម្អិត', 'Open', '查看详情')}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            /* Clear Empty State when no new data matches filters */
            <div className="text-center py-12 px-4 space-y-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {tr(
                    language,
                    'មិនមានទិន្នន័យថ្មីត្រូវនឹងតម្រងជ្រើសរើសទេ',
                    'No new discoveries match your current filters',
                    '当前筛选条件下暂无更多新内容'
                  )}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {tr(
                    language,
                    'អ្នកបានមើលមាតិកាក្នុងផ្នែកនេះរួចរាល់ ឬមិនមានលទ្ធផលត្រូវនឹងពាក្យស្វែងរក។ សូមសម្អាតតម្រង ឬទាញយកទិន្នន័យថ្មី។',
                    'You have viewed all items in this filter or no results match your search. Reset filters or sync the latest updates.',
                    '您已看完该分类下的全部内容或未找到匹配结果。请重置筛选或从服务器同步最新动态。'
                  )}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={handleResetFiltersAndHistory}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{tr(language, 'សម្អាតតម្រង & បង្ហាញទាំងអស់', 'Reset Filters & Show All', '重置筛选并显示全部')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Compass,
  ChefHat,
  Store,
  Star,
  MapPin,
  Search,
  Navigation,
  CheckCircle2,
  RotateCcw,
  Utensils,
  Crown,
  LocateFixed,
  ChevronRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  FoodItem,
  organizeAndDeduplicateFoods,
  resolveFoodPhotoUrl,
  handleFoodImageError,
} from '../types';
import {
  DISH_PROVINCES,
  ProvinceFilterOption,
  detectDishProvince,
  doesDishBelongToProvince,
  getProvinceOptionById,
  getMatchingRestaurantsForProvinceDish,
  getDishSpecificWhereToFind,
} from '../utils/foodFilters';
import { calculateDistanceKm } from '../services/dailyDiscoveryAndNotificationService';
import { tr } from '../utils/i18n';
import { IconProvinceFood } from './icons/HandcraftedIcons';
import { getLocalizedFood, getLocalizedRestaurant } from '../utils/zhDynamicTranslator';

type RegionFilterId = 'all' | 'central' | 'tonle_sap' | 'coastal' | 'mekong' | 'highlands';
type VipAiTasteId = 'heritage' | 'soup_kroeung' | 'grill_seafood' | 'street_dessert';

const PROVINCIAL_DISH_BATCH_SIZE = 12;

export const DailyDiscoveriesModal: React.FC = () => {
  const {
    isDailyDiscoveriesModalOpen,
    setIsDailyDiscoveriesModalOpen,
    foods,
    restaurants,
    language,
    setSelectedFood,
    setSelectedRestaurant,
    setSelectedProvince: setGlobalProvince,
    setActiveTab,
    showToast,
  } = useApp();

  const isKm = language === 'km';
  const isZh = language === 'zh';

  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<RegionFilterId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [vipTasteProfile, setVipTasteProfile] = useState<VipAiTasteId | null>(null);
  const [visibleDishCount, setVisibleDishCount] = useState<number>(PROVINCIAL_DISH_BATCH_SIZE);
  const [isLoadingProvince, setIsLoadingProvince] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const loadMoreDishesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (isDailyDiscoveriesModalOpen) {
      setSelectedProvinceId('all');
      setSelectedRegion('all');
      setSearchQuery('');
      setDebouncedQuery('');
      setVipTasteProfile(null);
      setVisibleDishCount(PROVINCIAL_DISH_BATCH_SIZE);
      setLoadError(null);
    }
  }, [isDailyDiscoveriesModalOpen]);

  useEffect(() => {
    setVisibleDishCount(PROVINCIAL_DISH_BATCH_SIZE);
  }, [selectedProvinceId, selectedRegion, debouncedQuery, vipTasteProfile]);

  const handleSelectProvince = (provId: string) => {
    setLoadError(null);
    setIsLoadingProvince(true);
    setSelectedProvinceId(provId);
    setVisibleDishCount(PROVINCIAL_DISH_BATCH_SIZE);
    setTimeout(() => {
      setIsLoadingProvince(false);
      if (bodyScrollRef.current) {
        bodyScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 40);
  };

  // Deduplicate and verify all dishes so no duplicate names or photos ever appear
  const verifiedDishes = useMemo(() => {
    try {
      const base = organizeAndDeduplicateFoods(Array.isArray(foods) ? foods : []);
      const seenIds = new Set<string>();
      const seenPhotos = new Set<string>();
      const result: FoodItem[] = [];
      for (const f of base) {
        if (!f || !f.id || !f.nameKh || !f.photoUrl) continue;
        if (seenIds.has(f.id) || seenPhotos.has(f.photoUrl)) continue;
        seenIds.add(f.id);
        seenPhotos.add(f.photoUrl);
        result.push(f);
      }
      return result;
    } catch {
      return [];
    }
  }, [foods]);

  // Count dishes per province across all 25 provinces & capital city
  const provinceDishCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of DISH_PROVINCES) {
      counts[p.id] = 0;
    }
    for (const f of verifiedDishes) {
      for (const p of DISH_PROVINCES) {
        if (doesDishBelongToProvince(f, p.id)) {
          counts[p.id] += 1;
        }
      }
    }
    return counts;
  }, [verifiedDishes]);

  // Filter provinces by region and optional search query
  const visibleProvinces = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return DISH_PROVINCES.filter((p) => {
      if (selectedRegion !== 'all' && p.region !== selectedRegion) {
        return false;
      }
      if (q) {
        const matchProvinceMeta =
          p.kh.toLowerCase().includes(q) ||
          p.fullKh.toLowerCase().includes(q) ||
          p.en.toLowerCase().includes(q) ||
          p.zh.toLowerCase().includes(q) ||
          p.culinaryTitleKh.toLowerCase().includes(q) ||
          p.culinaryTitleEn.toLowerCase().includes(q);
        if (matchProvinceMeta) return true;
        const hasMatchingDish = verifiedDishes.some((f) => {
          if (!doesDishBelongToProvince(f, p.id)) return false;
          const loc = getLocalizedFood(f, language);
          return (
            f.nameKh.toLowerCase().includes(q) ||
            f.nameEn.toLowerCase().includes(q) ||
            loc.name.toLowerCase().includes(q)
          );
        });
        return hasMatchingDish;
      }
      return true;
    });
  }, [selectedRegion, debouncedQuery, verifiedDishes, language]);

  // Currently selected province metadata (if a specific province is chosen)
  const activeProvinceMeta: ProvinceFilterOption | null = useMemo(() => {
    if (selectedProvinceId === 'all') return null;
    return DISH_PROVINCES.find((p) => p.id === selectedProvinceId) || null;
  }, [selectedProvinceId]);

  // Filter dishes by selected province, region, search query, and taste profile
  const filteredDishes = useMemo(() => {
    try {
      const q = debouncedQuery.trim().toLowerCase();

      const list = verifiedDishes.filter((food) => {
        if (selectedProvinceId !== 'all') {
          if (!doesDishBelongToProvince(food, selectedProvinceId)) {
            return false;
          }
        } else if (selectedRegion !== 'all') {
          const pid = detectDishProvince(food);
          const provMeta = getProvinceOptionById(pid);
          if (provMeta.region !== selectedRegion) {
            return false;
          }
        }

        if (vipTasteProfile) {
          const cat = food.categorySlug;
          if (vipTasteProfile === 'soup_kroeung' && cat !== 'soup' && cat !== 'salad') {
            return false;
          }
          if (vipTasteProfile === 'grill_seafood' && cat !== 'grilled' && cat !== 'stirfry' && cat !== 'specialty') {
            return false;
          }
          if (
            vipTasteProfile === 'street_dessert' &&
            cat !== 'dessert' &&
            cat !== 'streetfood' &&
            cat !== 'noodles' &&
            cat !== 'cake' &&
            cat !== 'drink'
          ) {
            return false;
          }
        }

        if (q) {
          const pid = selectedProvinceId !== 'all' ? selectedProvinceId : detectDishProvince(food);
          const provMeta = getProvinceOptionById(pid);
          const locFood = getLocalizedFood(food, language);
          const matchName =
            food.nameKh.toLowerCase().includes(q) ||
            food.nameEn.toLowerCase().includes(q) ||
            locFood.name.toLowerCase().includes(q);
          const matchDesc =
            (food.descriptionKh || '').toLowerCase().includes(q) ||
            (food.descriptionEn || '').toLowerCase().includes(q) ||
            locFood.description.toLowerCase().includes(q);
          const matchProv =
            provMeta.kh.toLowerCase().includes(q) ||
            provMeta.fullKh.toLowerCase().includes(q) ||
            provMeta.en.toLowerCase().includes(q) ||
            provMeta.zh.toLowerCase().includes(q);
          const matchIng = (food.ingredients || []).some(
            (ing) =>
              (ing.nameKh || '').toLowerCase().includes(q) ||
              (ing.nameEn || '').toLowerCase().includes(q)
          );
          if (!matchName && !matchDesc && !matchProv && !matchIng) {
            return false;
          }
        }

        return true;
      });

      // If "All Provinces" is selected and no search query, order so we showcase top signature dishes across all 25 provinces evenly
      if (selectedProvinceId === 'all' && !q) {
        const byProvince = new Map<string, FoodItem[]>();
        for (const p of DISH_PROVINCES) {
          byProvince.set(p.id, []);
        }
        for (const f of list) {
          const pid = detectDishProvince(f) || 'phnom_penh';
          byProvince.get(pid)?.push(f);
        }
        const interleaved: FoodItem[] = [];
        let round = 0;
        let added = true;
        while (added && round < 10) {
          added = false;
          for (const p of DISH_PROVINCES) {
            const bucket = byProvince.get(p.id);
            if (bucket && bucket[round]) {
              interleaved.push(bucket[round]);
              added = true;
            }
          }
          round++;
        }
        return interleaved;
      }

      return list;
    } catch {
      return [];
    }
  }, [
    verifiedDishes,
    selectedProvinceId,
    selectedRegion,
    debouncedQuery,
    language,
    vipTasteProfile,
  ]);

  const displayedDishes = useMemo(
    () => filteredDishes.slice(0, visibleDishCount),
    [filteredDishes, visibleDishCount]
  );

  useEffect(() => {
    if (!isDailyDiscoveriesModalOpen) return;
    const node = loadMoreDishesRef.current;
    if (!node || visibleDishCount >= filteredDishes.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleDishCount((prev) => Math.min(filteredDishes.length, prev + PROVINCIAL_DISH_BATCH_SIZE));
        }
      },
      { rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isDailyDiscoveriesModalOpen, visibleDishCount, filteredDishes.length]);

  if (!isDailyDiscoveriesModalOpen) return null;

  const getProvinceDisplayName = (p: ProvinceFilterOption) => {
    if (isKm) return p.fullKh;
    if (isZh) return p.zh;
    return p.en;
  };

  const getProvinceShortName = (p: ProvinceFilterOption) => {
    if (isKm) return p.kh;
    if (isZh) return p.zh;
    return p.en;
  };

  const getProvinceSpecialty = (p: ProvinceFilterOption) => {
    if (isKm) return p.culinaryTitleKh;
    if (isZh) return p.culinaryTitleZh;
    return p.culinaryTitleEn;
  };

  const getProvinceHistory = (p: ProvinceFilterOption) => {
    if (isKm) return p.historyKh;
    if (isZh) return p.historyZh;
    return p.historyEn;
  };

  const getProvinceWhereToFind = (p: ProvinceFilterOption) => {
    if (isKm) return p.whereToFindKh;
    if (isZh) return p.whereToFindZh;
    return p.whereToFindEn;
  };

  const handleFindNearestProvince = () => {
    setIsLocating(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          let closest = DISH_PROVINCES[0];
          let minKm = 99999;
          for (const p of DISH_PROVINCES) {
            const d = calculateDistanceKm(latitude, longitude, p.lat, p.lng) ?? 99999;
            if (d < minKm) {
              minKm = d;
              closest = p;
            }
          }
          setSelectedRegion('all');
          handleSelectProvince(closest.id);
          setIsLocating(false);
          showToast(
            tr(
              language,
              `📍 បានជ្រើសរើសខេត្តជិតអ្នកបំផុត៖ ${closest.fullKh}`,
              `📍 Selected nearest province: ${closest.en}`,
              `📍 已为您定位最近的省市：${closest.zh}`
            ),
            'success'
          );
        },
        () => {
          setSelectedRegion('all');
          handleSelectProvince('phnom_penh');
          setIsLocating(false);
          showToast(
            tr(
              language,
              '📍 បានជ្រើសរើសរាជធានីភ្នំពេញ (ទីតាំងកណ្តាល)',
              '📍 Selected Phnom Penh (central location)',
              '📍 已选择金边（中心位置）'
            ),
            'info'
          );
        },
        { enableHighAccuracy: false, timeout: 4500, maximumAge: 120000 }
      );
    } else {
      setSelectedRegion('all');
      handleSelectProvince('phnom_penh');
      setIsLocating(false);
    }
  };

  const handleOpenProvinceMap = (prov: ProvinceFilterOption, dishName?: string) => {
    const query = dishName
      ? `${dishName} ${prov.kh} ${prov.en} Cambodia restaurant`
      : `Khmer traditional food restaurant ${prov.en} Cambodia`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleViewProvinceRestaurants = (prov: ProvinceFilterOption) => {
    setGlobalProvince(prov.kh);
    setActiveTab('restaurants');
    setIsDailyDiscoveriesModalOpen(false);
  };

  const handleSelectVipTaste = (id: VipAiTasteId) => {
    setVipTasteProfile((prev) => (prev === id ? null : id));
  };

  const regionTabs: Array<{ id: RegionFilterId; label: string }> = [
    { id: 'all', label: tr(language, 'ទាំងអស់ (២៥ ខេត្ត-ក្រុង)', 'All 25 Provinces', '全部 25 省市') },
    { id: 'central', label: tr(language, 'វាលទំនាបកណ្តាល', 'Central Plains', '中部平原') },
    { id: 'tonle_sap', label: tr(language, 'បឹងទន្លេសាប & ពាយ័ព្យ', 'Tonle Sap & NW', '洞里萨湖与西北') },
    { id: 'coastal', label: tr(language, 'តំបន់ឆ្នេរសមុទ្រ', 'Coastal & Sea', '沿海省份') },
    { id: 'mekong', label: tr(language, 'ទន្លេមេគង្គ & បូព៌ា', 'Mekong & East', '湄公河流域') },
    { id: 'highlands', label: tr(language, 'ខ្ពង់រាប & ភ្នំ', 'Highlands', '东北高原') },
  ];

  const vipTasteOptions: Array<{ id: VipAiTasteId; label: string; emoji: string }> = [
    {
      id: 'heritage',
      emoji: '🏛️',
      label: tr(language, 'ម្ហូបអត្តសញ្ញាណខេត្ត', 'Provincial Icons', '各省代表名菜'),
    },
    {
      id: 'soup_kroeung',
      emoji: '🍲',
      label: tr(language, 'សម្ល & ទឹកគ្រឿងបុរាណ', 'Soups & Kroeung', '传统浓汤与鱼酱'),
    },
    {
      id: 'grill_seafood',
      emoji: '🔥',
      label: tr(language, 'អាំង ឆា & គ្រឿងសមុទ្រ', 'Grills & Seafood', '炭烤热炒与海鲜'),
    },
    {
      id: 'street_dessert',
      emoji: '🍜',
      label: tr(language, 'គុយទាវ នំខ្មែរ & បង្អែម', 'Noodles & Desserts', '汤粉糕点与甜品'),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-stretch md:items-center justify-center bg-black/70 backdrop-blur-xs p-0 md:p-4 animate-in fade-in duration-200 overscroll-none"
      onClick={() => setIsDailyDiscoveriesModalOpen(false)}
    >
      <div
        className="w-full max-w-full md:max-w-2xl lg:max-w-3xl bg-white dark:bg-slate-900 rounded-none md:rounded-3xl border-0 md:border border-slate-200/80 dark:border-slate-800 shadow-2xl h-full md:h-[92dvh] max-h-full md:max-h-[92dvh] flex flex-col overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#064E3B] via-[#047857] to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-xs shrink-0">
              <IconProvinceFood className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-moul text-xs sm:text-sm text-white leading-snug">
                  {tr(
                    language,
                    'ស្វែងយល់ម្ហូបតាមខេត្ត-ក្រុងទាំង ២៥',
                    'Discover Cambodian Food by Province',
                    '按省份探索柬埔寨 25 省市传统美食'
                  )}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-[10px] font-extrabold shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  <span>{tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费浏览')}</span>
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-khmer truncate mt-0.5">
                {tr(
                  language,
                  'មុខម្ហូបប្រចាំខេត្ត និងផែនទីហាងទាំង ២៥ រាជធានី-ខេត្ត',
                  'Signature dishes & map across all 25 provinces & capital',
                  '全柬 25 省市代表菜与地图导航'
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

        {/* Search, GPS Province Locator & 25-Province Selector Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 space-y-2 shrink-0 font-khmer">
          {/* Row 1: Search Input + Nearest Province GPS Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr(
                  language,
                  'ស្វែងរកឈ្មោះម្ហូប, ខេត្ត-ក្រុង, ឬគ្រឿងផ្សំ...',
                  'Search dish name, province, or ingredient...',
                  '搜索菜名、省份或传统食材...'
                )}
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleFindNearestProvince}
              disabled={isLocating}
              className="px-2.5 py-1.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer shrink-0"
              title={tr(language, 'ស្វែងរកខេត្តជិតខ្ញុំ', 'Detect Nearest Province', '定位最近省份')}
            >
              <LocateFixed className={`w-3.5 h-3.5 text-amber-300 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{tr(language, 'ខេត្តជិតខ្ញុំ', 'Near Me', '附近省份')}</span>
            </button>
          </div>

          {/* Row 1.5: Direct 25-Province & Capital City Dropdown Selector */}
          <div className="flex items-center gap-2">
            <select
              aria-label={tr(language, 'ជ្រើសរើសរាជធានី-ខេត្តទាំង ២៥', 'Select from 25 Provinces & Capital', '选择柬埔寨 25 省市')}
              value={selectedProvinceId}
              onChange={(e) => handleSelectProvince(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-500/40 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            >
              <option value="all">
                📍 {tr(language, `គ្រប់រាជធានី-ខេត្តទាំង ២៥ (25 Provinces • ${verifiedDishes.length} មុខម្ហូប)`, `All 25 Provinces & Capital (${verifiedDishes.length} Dishes)`, `全部 25 个省市（${verifiedDishes.length} 道代表菜）`)}
              </option>
              {DISH_PROVINCES.map((prov, index) => (
                <option key={prov.id} value={prov.id}>
                  {index + 1}. {getProvinceDisplayName(prov)} ({prov.en}) — {provinceDishCounts[prov.id] || 0}{' '}
                  {tr(language, 'មុខម្ហូប', 'dishes', '道')}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: Region Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {regionTabs.map((reg) => {
              const active = selectedRegion === reg.id;
              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => {
                    setSelectedRegion(reg.id);
                    if (
                      reg.id !== 'all' &&
                      selectedProvinceId !== 'all' &&
                      getProvinceOptionById(selectedProvinceId).region !== reg.id
                    ) {
                      setSelectedProvinceId('all');
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                    active
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {reg.label}
                </button>
              );
            })}
          </div>

          {/* Row 3: Interactive 25-Province Horizontal Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => handleSelectProvince('all')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer shrink-0 ${
                selectedProvinceId === 'all'
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700/90 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600 hover:border-emerald-500/50'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <span>{tr(language, 'ទាំង ២៥ ខេត្ត-ក្រុង', 'All 25 Provinces', '全部 25 省市')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500/20 text-current">
                25
              </span>
            </button>

            {visibleProvinces.map((prov) => {
              const active = selectedProvinceId === prov.id;
              const count = provinceDishCounts[prov.id] || 0;
              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => handleSelectProvince(prov.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer shrink-0 ${
                    active
                      ? 'bg-[#064E3B] text-white shadow-xs ring-2 ring-amber-400/60'
                      : 'bg-white dark:bg-slate-700/90 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600 hover:border-emerald-500/50'
                  }`}
                >
                  <MapPin className={`w-3 h-3 ${active ? 'text-amber-300' : 'text-emerald-600'}`} />
                  <span>{getProvinceShortName(prov)}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Row 4: Provincial Food Taste Filter Bar */}
          <div className="p-2 rounded-2xl bg-gradient-to-r from-amber-50 via-white to-emerald-50/70 dark:from-slate-800 dark:via-slate-800/90 dark:to-amber-950/30 border border-amber-300/70 dark:border-amber-500/40 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                <span>
                  {tr(
                    language,
                    'ជំនួយការឆ្លាតវៃណែនាំម្ហូបប្រចាំខេត្តតាមចំណូលចិត្ត',
                    'AI Provincial Dish Recommendations',
                    'AI 省级特色美食智能推荐'
                  )}
                </span>
              </span>
              {vipTasteProfile && (
                <button
                  type="button"
                  onClick={() => setVipTasteProfile(null)}
                  className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                >
                  {tr(language, 'បង្ហាញទាំងអស់', 'Reset', '重置')}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {vipTasteOptions.map((opt) => {
                const active = vipTasteProfile === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectVipTaste(opt.id)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap flex items-center gap-1 border transition cursor-pointer shrink-0 ${
                      active
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs'
                        : 'bg-white/90 dark:bg-slate-700/90 text-slate-700 dark:text-slate-200 border-amber-200 dark:border-slate-600 hover:border-amber-400'
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Scrollable Content */}
        <div
          ref={bodyScrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar font-khmer"
        >
          {/* Selected Province Culinary Specialty & Interactive Map Banner */}
          {activeProvinceMeta ? (
            <div className="p-4 rounded-3xl bg-gradient-to-br from-[#064E3B] via-[#047857] to-slate-900 text-white shadow-md border border-emerald-400/30 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectProvince('all')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold border border-white/25 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
                  <span>{tr(language, 'បញ្ជីរាជធានី-ខេត្តទាំង ២៥', 'All 25 Provinces', '返回全部 25 省市')}</span>
                </button>
                <span className="px-2.5 py-1 rounded-xl bg-white/15 text-emerald-100 text-[10px] font-bold font-mono shrink-0">
                  {filteredDishes.length} {tr(language, 'មុខម្ហូប', 'Dishes', '道代表菜')}
                </span>
              </div>

              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  📍 {getProvinceDisplayName(activeProvinceMeta)} ({activeProvinceMeta.en})
                </span>
                <h4 className="font-moul text-xs sm:text-sm text-amber-200 mt-1.5 leading-snug">
                  {getProvinceSpecialty(activeProvinceMeta)}
                </h4>
                <p className="text-[11px] text-emerald-100/95 leading-relaxed mt-1.5">
                  {getProvinceHistory(activeProvinceMeta)}
                </p>
              </div>

              <div className="p-2.5 rounded-2xl bg-black/25 border border-white/15 text-[11px] text-emerald-100 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">
                    {tr(language, 'កន្លែងលក់ល្បីៗ៖ ', 'Where to Find: ', '推荐地点：')}
                  </span>
                  <span>{getProvinceWhereToFind(activeProvinceMeta)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleOpenProvinceMap(activeProvinceMeta)}
                  className="py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {tr(language, 'ផែនទីម្ហូបក្នុងខេត្ត', 'Province Food Map', '省内美食地图')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewProvinceRestaurants(activeProvinceMeta)}
                  className="py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Store className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">
                    {tr(language, 'មើលហាងក្នុងខេត្តនេះ', 'Province Shops', '查看本省餐厅')}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Complete List of All 25 Cambodian Provinces & Capital City */
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-50/90 dark:bg-slate-800/90 border border-emerald-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-[#064E3B] text-amber-300 flex items-center justify-center shrink-0 font-black">
                    25
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {tr(
                        language,
                        `បញ្ជីរាជធានី-ខេត្តទាំង ២៥ (${visibleProvinces.length}/25 ទីតាំង • ${filteredDishes.length} មុខម្ហូប)`,
                        `All 25 Cambodian Provinces & Capital (${visibleProvinces.length}/25)`,
                        `柬埔寨全部 25 个省市列表（${visibleProvinces.length}/25）`
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {tr(
                        language,
                        'ចុចលើខេត្ត-រាជធានីណាមួយខាងក្រោម ដើម្បីមើលមុខម្ហូបប្រចាំខេត្ត និងផែនទី',
                        'Tap any province below to view its signature dishes & map',
                        '点击下方任意省市查看代表美食与地图'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Complete 25-Location Directory Grid (1 Capital + 24 Provinces = 25 Locations) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {visibleProvinces.map((prov) => {
                  const globalNumber = DISH_PROVINCES.findIndex((p) => p.id === prov.id) + 1;
                  const dishCount = provinceDishCounts[prov.id] || 0;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      data-testid={`province-card-${prov.id}`}
                      onClick={() => handleSelectProvince(prov.id)}
                      className="w-full p-2.5 rounded-2xl bg-white dark:bg-slate-800/95 hover:bg-emerald-50/70 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:border-emerald-500 transition flex items-center justify-between gap-2.5 text-left shadow-2xs cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-7 h-7 rounded-xl bg-[#064E3B] text-amber-300 text-[11px] font-black font-mono flex items-center justify-center shrink-0 shadow-2xs">
                          {globalNumber}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate group-hover:text-[#064E3B] dark:group-hover:text-emerald-300">
                              {getProvinceDisplayName(prov)}
                            </span>
                            {!isKm && (
                              <span className="text-[10px] text-slate-400 truncate">({prov.kh})</span>
                            )}
                            {isKm && (
                              <span className="text-[10px] text-slate-400 font-sans truncate">({prov.en})</span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {getProvinceSpecialty(prov)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-[#064E3B] dark:text-emerald-300 text-[10px] font-extrabold font-mono">
                          {dishCount} {tr(language, 'មុខ', 'dishes', '道')}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading Indicator when switching provinces */}
          {isLoadingProvince && (
            <div className="flex items-center justify-center gap-2.5 py-6 px-4 rounded-2xl bg-emerald-50/80 dark:bg-slate-800/80 border border-emerald-200/80 dark:border-slate-700 text-[#064E3B] dark:text-emerald-300 text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
              <span>
                {tr(
                  language,
                  'កំពុងទាញយកបញ្ជីមុខម្ហូបតាមខេត្ត-ក្រុងទាំង ២៥...',
                  'Loading dishes across all 25 provinces...',
                  '正在加载全柬 25 省市美食...'
                )}
              </span>
            </div>
          )}

          {/* Graceful Error State */}
          {loadError && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loadError}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLoadError(null);
                  setVisibleDishCount(PROVINCIAL_DISH_BATCH_SIZE);
                }}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold shrink-0 cursor-pointer"
              >
                {tr(language, 'សាកល្បងម្ដងទៀត', 'Retry', '重试')}
              </button>
            </div>
          )}

          {/* Provincial Dishes List */}
          {!isLoadingProvince && displayedDishes.length > 0 ? (
            <>
              {displayedDishes.map((food) => {
                const pid =
                  selectedProvinceId !== 'all'
                    ? selectedProvinceId
                    : detectDishProvince(food);
                const provMeta = getProvinceOptionById(pid);
                const locFood = getLocalizedFood(food, language);
                const matchedRests = getMatchingRestaurantsForProvinceDish(food, provMeta, restaurants);
                const resolvedPhoto =
                  resolveFoodPhotoUrl(
                    food.photoUrl,
                    food.photoUpdatedAt,
                    720,
                    food.id
                  ) || '/welcome/hero-bg.webp';

                return (
                  <div
                    key={food.id}
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '380px' }}
                    className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700/90 shadow-xs hover:shadow-md transition"
                  >
                    {/* Dish Photo Header */}
                    <div
                      onClick={() => {
                        setSelectedFood(food);
                        setIsDailyDiscoveriesModalOpen(false);
                      }}
                      className="relative aspect-16/9 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer group"
                    >
                      <img
                        src={resolvedPhoto}
                        alt={locFood.name}
                        onError={(e) => handleFoodImageError(e, food.id, food.photoUrl)}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                      {/* Top Left: Province & Category Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProvince(provMeta.id);
                          }}
                          className="px-2.5 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{getProvinceDisplayName(provMeta)}</span>
                        </button>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#064E3B]/95 text-emerald-100 border border-emerald-400/30 text-[10px] font-bold shadow-xs">
                          {locFood.category}
                        </span>
                      </div>

                      {/* Top Right: Rating Badge */}
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/65 text-white text-[10px] font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{(food.rating || 4.9).toFixed(1)}</span>
                      </div>

                      {/* Bottom Overlay: Dish Title */}
                      <div className="absolute bottom-2.5 left-3 right-3 text-white">
                        <h4 className="font-extrabold text-sm sm:text-base leading-snug drop-shadow line-clamp-1">
                          {locFood.name}
                        </h4>
                      </div>
                    </div>

                    {/* Card Body: Concise Summary, Key Ingredients & Where to Find */}
                    <div className="p-4 space-y-3.5">
                      {/* 1. Concise Description */}
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                        {locFood.description}
                      </p>

                      {/* 2. Key Authentic Ingredients */}
                      {locFood.ingredients && locFood.ingredients.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              {tr(
                                language,
                                `គ្រឿងផ្សំសំខាន់ៗ (${locFood.ingredients.length} មុខ)`,
                                `Key Ingredients (${locFood.ingredients.length})`,
                                `主要配料（${locFood.ingredients.length} 种）`
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {locFood.ingredients.slice(0, 4).map((ing, i) => {
                              const shortIng = (ing.name || '')
                                .split(/,|និង|\band\b|、/i)[0]
                                .replace(/\s*\([^)]*\)/g, '')
                                .trim();
                              return (
                                <span
                                  key={i}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-slate-700/80 text-emerald-900 dark:text-emerald-200 border border-emerald-200/70 dark:border-slate-600 text-[11px] font-semibold"
                                >
                                  🌿 {shortIng || ing.name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 3. Where to Find & Verified Province Restaurants */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                        <div className="text-[11px] font-extrabold text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            {tr(
                              language,
                              `កន្លែងលក់ក្នុង${provMeta.fullKh}`,
                              `Where to Find in ${provMeta.en}`,
                              `${provMeta.zh}寻味地点`
                            )}
                          </span>
                        </div>

                        <p
                          data-testid={`dish-where-to-find-${food.id}`}
                          className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug"
                        >
                          📍 {getDishSpecificWhereToFind(food, provMeta, language)}
                        </p>

                        {matchedRests.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {matchedRests.slice(0, 2).map((rest) => {
                              const rLoc = getLocalizedRestaurant(rest, language);
                              return (
                                <button
                                  key={rest.id}
                                  type="button"
                                  data-testid={`dish-matched-rest-${food.id}-${rest.id}`}
                                  onClick={() => {
                                    setActiveTab('restaurants');
                                    setSelectedRestaurant(rest);
                                    setIsDailyDiscoveriesModalOpen(false);
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Store className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[150px]">{rLoc.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 4. Action Buttons: Full Recipe & Interactive Map Navigation */}
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFood(food);
                            setIsDailyDiscoveriesModalOpen(false);
                          }}
                          className="py-2 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                        >
                          <ChefHat className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">
                            {tr(language, 'មើលរូបមន្តពេញលេញ', 'Full Recipe', '查看完整食谱')}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenProvinceMap(provMeta, food.nameKh)}
                          className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-blue-100 shrink-0" />
                          <span className="truncate">
                            {tr(language, 'ផែនទីនាំផ្លូវ', 'Map Navigation', '地图导航寻味')}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {visibleDishCount < filteredDishes.length && (
                <div ref={loadMoreDishesRef} className="pt-2 pb-4 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleDishCount((prev) =>
                        Math.min(filteredDishes.length, prev + PROVINCIAL_DISH_BATCH_SIZE)
                      )
                    }
                    className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#064E3B] dark:text-emerald-300 border border-emerald-200 dark:border-slate-700 text-xs font-extrabold flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
                  >
                    <span>
                      {tr(
                        language,
                        `បង្ហាញមុខម្ហូបបន្ថែមទៀត (${displayedDishes.length}/${filteredDishes.length})`,
                        `Show More Dishes (${displayedDishes.length}/${filteredDishes.length})`,
                        `加载更多美食 (${displayedDishes.length}/${filteredDishes.length})`
                      )}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : !isLoadingProvince ? (
            /* Empty State */
            <div className="text-center py-12 px-4 space-y-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Compass className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {tr(
                    language,
                    'រកមិនឃើញមុខម្ហូបត្រូវនឹងការស្វែងរកទេ',
                    'No provincial dishes match your filter',
                    '未找到符合筛选条件的各省美食'
                  )}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {tr(
                    language,
                    'សូមសម្អាតពាក្យស្វែងរក ឬជ្រើសរើសខេត្ត-ក្រុងផ្សេងទៀត ដើម្បីមើលមុខម្ហូបប្រពៃណីទាំង ២៥ ខេត្ត-ក្រុង។',
                    'Reset your search or select another province to explore traditional dishes across all 25 provinces.',
                    '请重置搜索词或选择其他省份，探索全柬 25 省市传统美食。'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProvinceId('all');
                  setSelectedRegion('all');
                  setSearchQuery('');
                  setVipTasteProfile(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {tr(language, 'បង្ហាញម្ហូបគ្រប់ ២៥ ខេត្ត-ក្រុង', 'Show All 25 Provinces', '显示全部 25 省市美食')}
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

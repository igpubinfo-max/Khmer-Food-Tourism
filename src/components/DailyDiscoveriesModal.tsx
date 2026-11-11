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
  LocateFixed,
  ChevronRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Soup,
  Flame,
  Coffee,
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

type VipAiTasteId = 'all' | 'soup_kroeung' | 'grill_seafood' | 'street_dessert';

const PROVINCIAL_DISH_BATCH_SIZE = 12;

// Home Screen (Reference Image 2) Glossy Badge Gradients for the 25 Provinces
const PROVINCE_BADGE_GRADIENTS = [
  'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)', // Orange
  'linear-gradient(180deg, #22C55E 0%, #15803D 100%)', // Green
  'linear-gradient(180deg, #F472B6 0%, #DB2777 100%)', // Rose/Pink
  'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)', // Blue
  'linear-gradient(180deg, #FBBF24 0%, #D97706 100%)', // Amber/Gold
  'linear-gradient(180deg, #2DD4BF 0%, #0D9488 100%)', // Teal
];

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [vipTasteProfile, setVipTasteProfile] = useState<VipAiTasteId>('all');
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
      setSearchQuery('');
      setDebouncedQuery('');
      setVipTasteProfile('all');
      setVisibleDishCount(PROVINCIAL_DISH_BATCH_SIZE);
      setLoadError(null);
    }
  }, [isDailyDiscoveriesModalOpen]);

  useEffect(() => {
    setVisibleDishCount(PROVINCIAL_DISH_BATCH_SIZE);
  }, [selectedProvinceId, debouncedQuery, vipTasteProfile]);

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

  // Filter provinces by optional search query
  const visibleProvinces = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return DISH_PROVINCES.filter((p) => {
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
  }, [debouncedQuery, verifiedDishes, language]);

  // Currently selected province metadata (if a specific province is chosen)
  const activeProvinceMeta: ProvinceFilterOption | null = useMemo(() => {
    if (selectedProvinceId === 'all') return null;
    return DISH_PROVINCES.find((p) => p.id === selectedProvinceId) || null;
  }, [selectedProvinceId]);

  // Filter dishes by selected province, search query, and category button
  const filteredDishes = useMemo(() => {
    try {
      const q = debouncedQuery.trim().toLowerCase();

      const list = verifiedDishes.filter((food) => {
        if (selectedProvinceId !== 'all') {
          if (!doesDishBelongToProvince(food, selectedProvinceId)) {
            return false;
          }
        }

        if (vipTasteProfile !== 'all') {
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

  // 4 Colorful Glossy Category Buttons matching Reference Image 2 (Home Screen)
  const categoryCards: Array<{
    id: VipAiTasteId;
    label: string;
    imageSrc: string;
    gradient: string;
    shadow: string;
    activeRing: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'all',
      label: tr(language, 'គ្រប់មុខម្ហូប', 'All Dishes', '全部名菜'),
      imageSrc: '/categories/prov_cat_all.png',
      gradient: 'linear-gradient(180deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
      shadow: '0 6px 14px rgba(234, 88, 12, 0.28), inset 0 1.5px 1px rgba(255, 255, 255, 0.65)',
      activeRing: '0 8px 18px rgba(234, 88, 12, 0.42), 0 0 0 2.5px #16A34A, inset 0 1.5px 1px rgba(255, 255, 255, 0.85)',
      icon: <Utensils className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-xs" strokeWidth={2.2} />,
    },
    {
      id: 'soup_kroeung',
      label: tr(language, 'សម្ល & ទឹកគ្រឿង', 'Soups & Kroeung', '浓汤与鱼酱'),
      imageSrc: '/categories/prov_cat_soup.png',
      gradient: 'linear-gradient(180deg, #22C55E 0%, #16A34A 50%, #15803D 100%)',
      shadow: '0 6px 14px rgba(21, 128, 61, 0.28), inset 0 1.5px 1px rgba(255, 255, 255, 0.65)',
      activeRing: '0 8px 18px rgba(21, 128, 61, 0.42), 0 0 0 2.5px #F59E0B, inset 0 1.5px 1px rgba(255, 255, 255, 0.85)',
      icon: <Soup className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-xs" strokeWidth={2.2} />,
    },
    {
      id: 'grill_seafood',
      label: tr(language, 'អាំង ឆា & សមុទ្រ', 'Grills & Seafood', '烧烤与海鲜'),
      imageSrc: '/categories/prov_cat_grill.png',
      gradient: 'linear-gradient(180deg, #F472B6 0%, #EC4899 50%, #DB2777 100%)',
      shadow: '0 6px 14px rgba(219, 39, 119, 0.28), inset 0 1.5px 1px rgba(255, 255, 255, 0.65)',
      activeRing: '0 8px 18px rgba(219, 39, 119, 0.42), 0 0 0 2.5px #16A34A, inset 0 1.5px 1px rgba(255, 255, 255, 0.85)',
      icon: <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-xs" strokeWidth={2.2} />,
    },
    {
      id: 'street_dessert',
      label: tr(language, 'គុយទាវ & បង្អែម', 'Noodles & Sweets', '汤粉与甜品'),
      imageSrc: '/categories/prov_cat_noodles.png',
      gradient: 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 50%, #2563EB 100%)',
      shadow: '0 6px 14px rgba(37, 99, 235, 0.28), inset 0 1.5px 1px rgba(255, 255, 255, 0.65)',
      activeRing: '0 8px 18px rgba(37, 99, 235, 0.42), 0 0 0 2.5px #16A34A, inset 0 1.5px 1px rgba(255, 255, 255, 0.85)',
      icon: <Coffee className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-xs" strokeWidth={2.2} />,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-stretch md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 animate-in fade-in duration-200 overscroll-none"
      onClick={() => setIsDailyDiscoveriesModalOpen(false)}
    >
      <div
        className="w-full max-w-full md:max-w-2xl lg:max-w-3xl bg-[#1E293B] text-slate-900 rounded-none md:rounded-3xl border-0 md:border border-slate-700/80 shadow-2xl h-full md:h-[92dvh] max-h-full md:max-h-[92dvh] flex flex-col overflow-hidden overscroll-contain font-khmer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clean Emerald & Gold Header */}
        <div
          style={{
            background: 'linear-gradient(92deg, #064E3B 0%, #047857 55%, #0D9488 100%)',
            paddingTop: 'max(var(--kft-safe-top, 0px), 0.875rem)',
          }}
          className="px-3.5 sm:px-4 pb-3.5 text-white flex items-center justify-between shrink-0 shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              style={{
                background: 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)',
                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
              }}
              className="w-10 h-10 rounded-2xl border border-white/40 flex items-center justify-center text-white shrink-0"
            >
              <IconProvinceFood className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-moul text-xs sm:text-sm text-white leading-[1.7] py-0.5 break-words">
                  {tr(
                    language,
                    'ស្វែងយល់ម្ហូបតាមខេត្ត-ក្រុងទាំង ២៥',
                    'Discover Cambodian Food by Province',
                    '按省份探索柬埔寨 25 省市传统美食'
                  )}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 border border-white/35 text-white text-[10px] font-extrabold shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-amber-300" />
                  <span>{tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费浏览')}</span>
                </span>
              </div>
              <p className="text-[11px] text-emerald-50 font-khmer leading-[1.55] break-words">
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
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Control Bar: Search + GPS Nearest Province + 4 Colorful Category Cards */}
        <div className="px-3.5 pt-3 pb-2.5 bg-[#1E293B] border-b border-slate-700/80 space-y-2.5 shrink-0 shadow-[0_4px_12px_rgba(15,23,42,0.18)]">
          {/* Row 1: Rounded White Search Bar + Glossy GPS Nearest Province Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr(
                  language,
                  'ស្វែងរកឈ្មោះម្ហូប ឬខេត្ត-ក្រុង...',
                  'Search dish or province...',
                  '搜索菜名或省市...'
                )}
                className="w-full h-10 pl-9 pr-8 rounded-full bg-white border border-slate-200/90 text-xs sm:text-[13px] font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleFindNearestProvince}
              disabled={isLocating}
              style={{
                background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                boxShadow: '0 4px 12px rgba(21, 128, 61, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
              }}
              className="h-10 px-3.5 rounded-full text-white text-xs font-extrabold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0 border border-emerald-400/40"
              title={tr(language, 'ស្វែងរកខេត្តជិតខ្ញុំ', 'Detect Nearest Province', '定位最近省份')}
            >
              <LocateFixed className={`w-4 h-4 text-white ${isLocating ? 'animate-spin' : ''}`} />
              <span>{tr(language, 'ខេត្តជិតខ្ញុំ', 'Near Me', '附近省份')}</span>
            </button>
          </div>

          {/* Row 2: 4 Premium 3D Gold-Framed Category Buttons + Clear White Text Below Each Button */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.84) 0%, rgba(15, 23, 42, 0.94) 100%)',
              boxShadow: '0 10px 28px rgba(15, 23, 42, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
            }}
            className="rounded-[22px] p-2 sm:p-3 border border-amber-400/25"
          >
            <div className="grid grid-cols-2 min-[340px]:grid-cols-4 gap-2 sm:gap-3">
              {categoryCards.map((card) => {
                const active = vipTasteProfile === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setVipTasteProfile(card.id)}
                    aria-pressed={active}
                    className="group relative flex flex-col items-center justify-start min-w-0 p-0 bg-transparent border-0 transition-transform duration-150 active:scale-[0.95] cursor-pointer focus:outline-none select-none"
                  >
                    {/* 3D Gold-Bordered Button Graphic */}
                    <div
                      className="relative w-full aspect-[2.12/1] flex items-center justify-center transition-all duration-200 rounded-[14px]"
                      style={{
                        filter: active
                          ? 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.72)) drop-shadow(0 5px 10px rgba(15, 23, 42, 0.35))'
                          : 'drop-shadow(0 5px 10px rgba(15, 23, 42, 0.32))',
                        transform: active ? 'translateY(-1.5px) scale(1.02)' : 'none',
                      }}
                    >
                      <img
                        src={card.imageSrc}
                        alt={card.label}
                        loading="eager"
                        decoding="async"
                        draggable={false}
                        className="w-full h-full object-contain pointer-events-none select-none"
                      />
                    </div>

                    {/* Clear White Title Below Each Button */}
                    <span
                      className="mt-1 px-0.5 font-khmer font-extrabold leading-[1.62] text-center break-words whitespace-normal w-full transition-colors duration-150"
                      style={{
                        fontSize: 'clamp(10.5px, 2.85vw, 13px)',
                        color: active ? '#FDE047' : '#FFFFFF',
                        textShadow: active
                          ? '0 1px 3px rgba(0, 0, 0, 0.92), 0 0 8px rgba(250, 204, 21, 0.45)'
                          : '0 1.5px 3px rgba(0, 0, 0, 0.90), 0 0 2px rgba(0, 0, 0, 0.75)',
                      }}
                    >
                      {card.label}
                    </span>

                    {/* Subtle Gold Active Indicator Bar Below Title */}
                    {active && (
                      <span
                        className="mt-0.5 h-1 w-6 rounded-full"
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

          {/* Row 3: Clean Horizontal Province Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            <button
              type="button"
              onClick={() => handleSelectProvince('all')}
              style={
                selectedProvinceId === 'all'
                  ? {
                      background: 'linear-gradient(180deg, #16A34A 0%, #15803D 100%)',
                      boxShadow: '0 3px 8px rgba(21, 128, 61, 0.25)',
                    }
                  : undefined
              }
              className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedProvinceId === 'all'
                  ? 'text-white border border-emerald-600'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700 border border-slate-200/90'
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 ${selectedProvinceId === 'all' ? 'text-white' : 'text-emerald-600'}`} />
              <span>{tr(language, 'ទាំង ២៥ ខេត្ត-ក្រុង', 'All 25 Provinces', '全部 25 省市')}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-mono ${
                  selectedProvinceId === 'all' ? 'bg-white/25 text-white' : 'bg-white text-emerald-700'
                }`}
              >
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
                  style={
                    active
                      ? {
                          background: 'linear-gradient(180deg, #16A34A 0%, #15803D 100%)',
                          boxShadow: '0 3px 8px rgba(21, 128, 61, 0.25)',
                        }
                      : undefined
                  }
                  className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold transition whitespace-nowrap flex items-center gap-1 cursor-pointer shrink-0 ${
                    active
                      ? 'text-white border border-emerald-600'
                      : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700 border border-slate-200/90'
                  }`}
                >
                  <MapPin className={`w-3 h-3 ${active ? 'text-white' : 'text-emerald-600'}`} />
                  <span>{getProvinceShortName(prov)}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-mono ${
                      active ? 'bg-white/25 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Scrollable Content on Dark Slate (#1E293B) Surface */}
        <div
          ref={bodyScrollRef}
          className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 no-scrollbar bg-[#1E293B]"
        >
          {/* Selected Province Culinary Specialty & Interactive Map Banner */}
          {activeProvinceMeta ? (
            <div className="p-4 rounded-[24px] bg-white border border-slate-200/90 shadow-[0_8px_24px_rgba(15,23,42,0.06)] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectProvince('all')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-extrabold border border-slate-200 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{tr(language, 'បញ្ជីរាជធានី-ខេត្តទាំង ២៥', 'All 25 Provinces', '返回全部 25 省市')}</span>
                </button>
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold font-mono shrink-0">
                  {filteredDishes.length} {tr(language, 'មុខម្ហូប', 'Dishes', '道代表菜')}
                </span>
              </div>

              <div>
                <span
                  style={{
                    background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                  }}
                  className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-white text-[11px] font-extrabold shadow-2xs"
                >
                  📍 {getProvinceDisplayName(activeProvinceMeta)} ({activeProvinceMeta.en})
                </span>
                <h4 className="font-moul text-xs sm:text-sm text-slate-900 mt-2 leading-[1.7] py-0.5">
                  {getProvinceSpecialty(activeProvinceMeta)}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {getProvinceHistory(activeProvinceMeta)}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-slate-700 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-emerald-900">
                    {tr(language, 'កន្លែងលក់ល្បីៗ៖ ', 'Where to Find: ', '推荐地点：')}
                  </span>
                  <span>{getProvinceWhereToFind(activeProvinceMeta)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleOpenProvinceMap(activeProvinceMeta)}
                  style={{
                    background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                  }}
                  className="py-2.5 px-3 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer leading-[1.6]"
                >
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span className="break-words">
                    {tr(language, 'ផែនទីម្ហូបក្នុងខេត្ត', 'Province Food Map', '省内美食地图')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewProvinceRestaurants(activeProvinceMeta)}
                  style={{
                    background: 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)',
                  }}
                  className="py-2.5 px-3 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer leading-[1.6]"
                >
                  <Store className="w-3.5 h-3.5 shrink-0" />
                  <span className="break-words">
                    {tr(language, 'មើលហាងក្នុងខេត្តនេះ', 'Province Shops', '查看本省餐厅')}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Complete List of All 25 Cambodian Provinces & Capital City on Clean White Cards */
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_14px_rgba(15,23,42,0.04)] flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    style={{
                      background: 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)',
                    }}
                    className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 font-black shadow-xs"
                  >
                    25
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-slate-900 leading-[1.65] break-words">
                      {tr(
                        language,
                        `បញ្ជីរាជធានី-ខេត្តទាំង ២៥ (${visibleProvinces.length}/25 ទីតាំង • ${filteredDishes.length} មុខម្ហូប)`,
                        `All 25 Cambodian Provinces & Capital (${visibleProvinces.length}/25)`,
                        `柬埔寨全部 25 个省市列表（${visibleProvinces.length}/25）`
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-[1.55] break-words">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {visibleProvinces.map((prov) => {
                  const globalIndex = DISH_PROVINCES.findIndex((p) => p.id === prov.id);
                  const globalNumber = globalIndex + 1;
                  const dishCount = provinceDishCounts[prov.id] || 0;
                  const badgeGradient =
                    PROVINCE_BADGE_GRADIENTS[globalIndex % PROVINCE_BADGE_GRADIENTS.length];

                  return (
                    <button
                      key={prov.id}
                      type="button"
                      data-testid={`province-card-${prov.id}`}
                      onClick={() => handleSelectProvince(prov.id)}
                      className="w-full p-3 rounded-[20px] bg-white hover:bg-emerald-50/40 border border-slate-200/90 hover:border-emerald-500/60 transition flex items-center justify-between gap-2.5 text-left shadow-[0_4px_14px_rgba(15,23,42,0.05)] active:scale-[0.99] cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          style={{ background: badgeGradient }}
                          className="w-8 h-8 rounded-xl text-white text-xs font-black font-mono flex items-center justify-center shrink-0 shadow-xs"
                        >
                          {globalNumber}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-[13px] text-slate-900 leading-[1.65] break-words group-hover:text-emerald-700">
                              {getProvinceDisplayName(prov)}
                            </span>
                            {!isKm && (
                              <span className="text-[10.5px] text-slate-500 leading-[1.5] break-words">({prov.kh})</span>
                            )}
                            {isKm && (
                              <span className="text-[10.5px] text-slate-500 font-sans leading-[1.5] break-words">({prov.en})</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 break-words leading-[1.55] mt-0.5">
                            {getProvinceSpecialty(prov)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10.5px] font-extrabold font-mono">
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
            <div className="flex items-center justify-center gap-2.5 py-6 px-4 rounded-2xl bg-white border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
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
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-700">
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

          {/* Section Title for Dishes */}
          {!isLoadingProvince && displayedDishes.length > 0 && (
            <div className="flex items-center justify-between pt-1 px-0.5">
              <div className="flex items-center gap-1.5">
                <Flame className="w-5 h-5 text-orange-400 fill-amber-400 shrink-0" />
                <h4 className="font-extrabold text-[15px] sm:text-base text-white leading-[1.6]">
                  {activeProvinceMeta
                    ? tr(
                        language,
                        `ម្ហូបប្រចាំ${getProvinceDisplayName(activeProvinceMeta)}`,
                        `Signature Dishes in ${activeProvinceMeta.en}`,
                        `${activeProvinceMeta.zh}代表美食`
                      )
                    : tr(
                        language,
                        'ម្ហូបពេញនិយមតាមខេត្ត-ក្រុង',
                        'Popular Provincial Dishes',
                        '各省市热门特色美食'
                      )}
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 text-[11px] font-extrabold font-mono shadow-2xs">
                {filteredDishes.length} {tr(language, 'មុខ', 'dishes', '道')}
              </span>
            </div>
          )}

          {/* Provincial Dishes List on Clean White Cards */}
          {!isLoadingProvince && displayedDishes.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
                      style={{ contentVisibility: 'auto', containIntrinsicSize: '360px' }}
                      className="rounded-[24px] overflow-hidden bg-white border border-slate-200/90 shadow-[0_8px_22px_rgba(15,23,42,0.06)] hover:border-emerald-500/50 transition"
                    >
                      {/* Dish Photo Header */}
                      <div
                        onClick={() => {
                          setSelectedFood(food);
                          setIsDailyDiscoveriesModalOpen(false);
                        }}
                        className="relative aspect-16/9 w-full overflow-hidden bg-slate-100 cursor-pointer group"
                      >
                        <img decoding="async"
                          src={resolvedPhoto}
                          alt={locFood.name}
                          onError={(e) => handleFoodImageError(e, food.id, food.photoUrl)}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Top Left: Province & Category Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectProvince(provMeta.id);
                            }}
                            style={{
                              background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                            }}
                            className="px-2.5 py-1 rounded-full text-white text-[10.5px] font-extrabold shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{getProvinceDisplayName(provMeta)}</span>
                          </button>
                          <span className="px-2.5 py-1 rounded-full bg-white/95 text-emerald-900 text-[10.5px] font-extrabold shadow-xs">
                            {locFood.category}
                          </span>
                        </div>

                        {/* Top Right: Rating Badge */}
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 text-slate-900 text-[11px] font-extrabold flex items-center gap-1 shadow-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{(food.rating || 4.9).toFixed(1)}</span>
                        </div>

                        {/* Bottom Overlay: Dish Title */}
                        <div className="absolute bottom-3 left-3.5 right-3.5 text-white">
                          <h4 className="font-extrabold text-base sm:text-lg leading-[1.6] drop-shadow line-clamp-1">
                            {locFood.name}
                          </h4>
                        </div>
                      </div>

                      {/* Card Body: Concise Summary, Key Ingredients & Where to Find */}
                      <div className="p-4 space-y-3 bg-white">
                        {/* 1. Concise Description */}
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {locFood.description}
                        </p>

                        {/* 2. Key Authentic Ingredients */}
                        {locFood.ingredients && locFood.ingredients.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {locFood.ingredients.slice(0, 4).map((ing, i) => {
                              const shortIng = (ing.name || '')
                                .split(/,|និង|\band\b|、/i)[0]
                                .replace(/\s*\([^)]*\)/g, '')
                                .trim();
                              return (
                                <span
                                  key={i}
                                  className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-[11px] font-bold"
                                >
                                  🌿 {shortIng || ing.name}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* 3. Where to Find & Verified Province Restaurants */}
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <div className="text-[11px] font-extrabold text-emerald-800 flex items-center gap-1.5">
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
                            className="text-[11px] text-slate-600 leading-snug"
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
                                    className="px-2.5 py-1 rounded-xl bg-white hover:border-emerald-500 border border-slate-200 text-[10.5px] font-extrabold text-slate-800 flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                  >
                                    <Store className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span className="line-clamp-1 break-words max-w-[200px] leading-[1.5]">{rLoc.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* 4. Action Buttons: Full Recipe & Interactive Map Navigation */}
                        <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFood(food);
                              setIsDailyDiscoveriesModalOpen(false);
                            }}
                            style={{
                              background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                            }}
                            className="py-2.5 px-3 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer leading-[1.6]"
                          >
                            <ChefHat className="w-4 h-4 text-white shrink-0" />
                            <span className="break-words">
                              {tr(language, 'មើលរូបមន្តពេញលេញ', 'Full Recipe', '查看完整食谱')}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenProvinceMap(provMeta, food.nameKh)}
                            style={{
                              background: 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)',
                            }}
                            className="py-2.5 px-3 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer leading-[1.6]"
                          >
                            <Navigation className="w-3.5 h-3.5 text-white shrink-0" />
                            <span className="break-words">
                              {tr(language, 'ផែនទីនាំផ្លូវ', 'Map Navigation', '地图导航寻味')}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {visibleDishCount < filteredDishes.length && (
                <div ref={loadMoreDishesRef} className="pt-2 pb-4 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleDishCount((prev) =>
                        Math.min(filteredDishes.length, prev + PROVINCIAL_DISH_BATCH_SIZE)
                      )
                    }
                    className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
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
            /* Clean White Empty State */
            <div className="text-center py-12 px-4 space-y-3 bg-white rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                <Compass className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900">
                  {tr(
                    language,
                    'រកមិនឃើញមុខម្ហូបត្រូវនឹងការស្វែងរកទេ',
                    'No provincial dishes match your filter',
                    '未找到符合筛选条件的各省美食'
                  )}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
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
                  setSearchQuery('');
                  setVipTasteProfile('all');
                }}
                style={{
                  background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
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

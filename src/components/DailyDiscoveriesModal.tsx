import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Compass,
  Sparkles,
  ChefHat,
  Store,
  Star,
  MapPin,
  Search,
  Navigation,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  Utensils,
  Crown,
  Lock,
  LocateFixed,
} from 'lucide-react';
import {
  FoodItem,
  isAdminAccount,
  isUserVipActive,
  organizeAndDeduplicateFoods,
} from '../types';
import {
  DISH_PROVINCES,
  ProvinceFilterOption,
  detectDishProvince,
  getProvinceOptionById,
  getDishCulturalHistory,
  getMatchingRestaurantsForProvinceDish,
} from '../utils/foodFilters';
import { calculateDistanceKm } from '../services/dailyDiscoveryAndNotificationService';
import { tr } from '../utils/i18n';
import { IconProvinceFood } from './icons/HandcraftedIcons';
import { getLocalizedFood, getLocalizedRestaurant } from '../utils/zhDynamicTranslator';

type RegionFilterId = 'all' | 'central' | 'tonle_sap' | 'coastal' | 'mekong' | 'highlands';
type VipAiTasteId = 'heritage' | 'soup_kroeung' | 'grill_seafood' | 'street_dessert';

export const DailyDiscoveriesModal: React.FC = () => {
  const {
    isDailyDiscoveriesModalOpen,
    setIsDailyDiscoveriesModalOpen,
    foods,
    restaurants,
    language,
    currentUser,
    setSelectedFood,
    setSelectedRestaurant,
    setSelectedProvince: setGlobalProvince,
    setActiveTab,
    openUpgradeVipModal,
    showToast,
  } = useApp();

  const isKm = language === 'km';
  const isZh = language === 'zh';
  const canUseVip = Boolean(
    currentUser && (isUserVipActive(currentUser) || isAdminAccount(currentUser))
  );

  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<RegionFilterId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [vipTasteProfile, setVipTasteProfile] = useState<VipAiTasteId | null>(null);

  // Deduplicate and verify all dishes so no duplicate names or photos ever appear
  const verifiedDishes = useMemo(() => {
    const base = organizeAndDeduplicateFoods(foods);
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
  }, [foods]);

  // Count dishes per province across all 25 provinces
  const provinceDishCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of DISH_PROVINCES) {
      counts[p.id] = 0;
    }
    for (const f of verifiedDishes) {
      const pid = detectDishProvince(f);
      if (pid && counts[pid] !== undefined) {
        counts[pid] += 1;
      }
    }
    return counts;
  }, [verifiedDishes]);

  // Filter provinces by region
  const visibleProvinces = useMemo(() => {
    if (selectedRegion === 'all') return DISH_PROVINCES;
    return DISH_PROVINCES.filter((p) => p.region === selectedRegion);
  }, [selectedRegion]);

  // Currently selected province metadata (if a specific province is chosen)
  const activeProvinceMeta: ProvinceFilterOption | null = useMemo(() => {
    if (selectedProvinceId === 'all') return null;
    return DISH_PROVINCES.find((p) => p.id === selectedProvinceId) || null;
  }, [selectedProvinceId]);

  // Filter dishes by selected province, region,search query, and optional VIP AI taste profile
  const filteredDishes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = verifiedDishes.filter((food) => {
      const pid = detectDishProvince(food);
      const provMeta = getProvinceOptionById(pid);

      if (selectedProvinceId !== 'all' && pid !== selectedProvinceId) {
        return false;
      }
      if (selectedRegion !== 'all' && provMeta.region !== selectedRegion) {
        return false;
      }

      if (canUseVip && vipTasteProfile) {
        const cat = food.categorySlug;
        if (vipTasteProfile === 'soup_kroeung' && cat !== 'soup' && cat !== 'salad') {
          return false;
        }
        if (vipTasteProfile === 'grill_seafood' && cat !== 'grill' && cat !== 'stir-fry') {
          return false;
        }
        if (
          vipTasteProfile === 'street_dessert' &&
          cat !== 'dessert' &&
          cat !== 'noodle' &&
          cat !== 'drink'
        ) {
          return false;
        }
      }

      if (q) {
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
  }, [
    verifiedDishes,
    selectedProvinceId,
    selectedRegion,
    searchQuery,
    language,
    canUseVip,
    vipTasteProfile,
  ]);

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
          setSelectedProvinceId(closest.id);
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
          setSelectedProvinceId('phnom_penh');
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
      setSelectedProvinceId('phnom_penh');
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
    if (!canUseVip) {
      showToast(
        tr(
          language,
          '👑 មុខងារ AI ណែនាំម្ហូបប្រចាំខេត្តកម្រិតខ្ពស់ សម្រាប់សមាជិក VIP ប៉ុណ្ណោះ!',
          '👑 Advanced AI Provincial Food Recommendations are reserved for VIP members!',
          '👑 AI 各省美食智能推荐为 VIP 会员专属功能！'
        ),
        'info'
      );
      setIsDailyDiscoveriesModalOpen(false);
      openUpgradeVipModal();
      return;
    }
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
      emoji: '🍨',
      label: tr(language, 'គុយទាវ នំខ្មែរ & បង្អែម', 'Noodles & Desserts', '汤粉糕点与甜品'),
    },
  ];

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
                  'មុខម្ហូបប្រពៃណី ប្រវត្តិ គ្រឿងផ្សំ និងផែនទីហាងតាមខេត្ត-ក្រុងទាំង ២៥',
                  'Authentic dishes, history, ingredients & map navigation across all 25 provinces',
                  '涵盖全柬 25 省市正宗代表菜、文化历史、配料与地图导航'
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

        {/* Search, GPS Province Locator & 25-Province Selector Bar (FREE) */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0 font-khmer">
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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

          {/* Row 2: Region Filter Tabs + 25-Province Dropdown */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1">
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

            <select
              value={selectedProvinceId}
              onChange={(e) => setSelectedProvinceId(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-emerald-500/50 text-[11px] font-bold text-[#064E3B] dark:text-emerald-300 focus:outline-none max-w-[155px] truncate shrink-0"
            >
              <option value="all">
                {tr(language, '📍 គ្រប់ ២៥ ខេត្ត-ក្រុង', '📍 All 25 Provinces', '📍 全部 25 省市')} ({verifiedDishes.length})
              </option>
              {DISH_PROVINCES.map((p) => (
                <option key={p.id} value={p.id}>
                  {getProvinceShortName(p)} ({provinceDishCounts[p.id] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Row 3: Interactive 25-Province Horizontal Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setSelectedProvinceId('all')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer shrink-0 ${
                selectedProvinceId === 'all'
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700/90 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600 hover:border-emerald-500/50'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{tr(language, 'ទាំង ២៥ ខេត្ត-ក្រុង', 'All 25 Provinces', '全部 25 省市')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500/20 text-current">
                {verifiedDishes.length}
              </span>
            </button>

            {visibleProvinces.map((prov) => {
              const active = selectedProvinceId === prov.id;
              const count = provinceDishCounts[prov.id] || 0;
              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => setSelectedProvinceId(prov.id)}
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

          {/* Row 4: VIP Advanced AI Provincial Food Matcher Bar */}
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 text-[9px] font-black shrink-0">
                {canUseVip ? '👑 VIP ✓' : <><Lock className="w-2.5 h-2.5" /> 👑 VIP</>}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {vipTasteOptions.map((opt) => {
                const active = canUseVip && vipTasteProfile === opt.id;
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
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 no-scrollbar font-khmer">
          {/* Selected Province Culinary Heritage & Interactive Map Banner */}
          {activeProvinceMeta ? (
            <div className="p-3.5 rounded-3xl bg-gradient-to-br from-[#064E3B] via-[#047857] to-slate-900 text-white shadow-md border border-emerald-400/30 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                    📍 {getProvinceDisplayName(activeProvinceMeta)}
                  </span>
                  <h4 className="font-moul text-xs sm:text-sm text-amber-200 mt-1.5 leading-snug">
                    {getProvinceSpecialty(activeProvinceMeta)}
                  </h4>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-white/15 text-emerald-100 text-[10px] font-bold font-mono shrink-0">
                  {filteredDishes.length} {tr(language, 'មុខម្ហូប', 'Dishes', '道代表菜')}
                </span>
              </div>

              <p className="text-xs text-emerald-50/95 leading-relaxed">
                {getProvinceHistory(activeProvinceMeta)}
              </p>

              <div className="p-2.5 rounded-2xl bg-black/25 border border-white/15 text-[11px] text-emerald-100 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">
                    {tr(language, 'កន្លែងលក់ម្ហូបល្បីៗក្នុងខេត្ត៖ ', 'Where to Find in Province: ', '省内推荐品尝地点：')}
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
                    {tr(language, 'ផែនទីម្ហូបក្នុងខេត្ត', 'Province Food Map', '省内美食地图导航')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewProvinceRestaurants(activeProvinceMeta)}
                  className="py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Store className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">
                    {tr(language, 'មើលហាងក្នុងខេត្តនេះ', 'Verified Province Shops', '查看本省认证餐厅')}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* All 25 Provinces Overview Banner */
            <div className="p-3 rounded-2xl bg-emerald-50/90 dark:bg-slate-800/90 border border-emerald-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-[#064E3B] text-amber-300 flex items-center justify-center shrink-0 font-black">
                  25
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {tr(
                      language,
                      `ម្ហូបប្រពៃណីខ្មែរតាមខេត្ត-ក្រុងទាំង ២៥ (${filteredDishes.length} មុខ)`,
                      `Authentic Dishes Across All 25 Provinces (${filteredDishes.length})`,
                      `全柬 25 省市传统美食名录（共 ${filteredDishes.length} 道）`
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {tr(
                      language,
                      'ចុចលើឈ្មោះខេត្តខាងលើ ដើម្បីមើលប្រវត្តិម្ហូប និងផែនទីតាមខេត្តនីមួយៗ',
                      'Tap any province chip above to explore its culinary history & map',
                      '点击上方任意省份标签，即可查看该省饮食历史与美食地图'
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Provincial Dishes List */}
          {filteredDishes.length > 0 ? (
            filteredDishes.map((food) => {
              const pid = detectDishProvince(food);
              const provMeta = getProvinceOptionById(pid);
              const locFood = getLocalizedFood(food, language);
              const historyText = getDishCulturalHistory(food, provMeta, language);
              const matchedRests = getMatchingRestaurantsForProvinceDish(food, provMeta, restaurants);
              const resolvedPhoto =
                food.photoUrl && food.photoUrl.startsWith('/foods/') && !food.photoUrl.includes('?')
                  ? `${food.photoUrl}?v=20261029v3`
                  : food.photoUrl || '/foods/food-1.jpg';

              return (
                <div
                  key={food.id}
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
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = '1';
                          target.src = '/welcome/hero-bg.webp';
                        }
                      }}
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
                          setSelectedProvinceId(provMeta.id);
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

                  {/* Card Body: Description, History, Ingredients & Where to Find */}
                  <div className="p-3.5 space-y-3">
                    {/* 1. Description */}
                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                      {locFood.description}
                    </p>

                    {/* 2. Cultural History & Regional Origin */}
                    <div className="p-2.5 rounded-2xl bg-amber-50/70 dark:bg-slate-900/70 border border-amber-200/70 dark:border-slate-700 space-y-1">
                      <div className="text-[11px] font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          {tr(
                            language,
                            'ប្រវត្តិ និងប្រភពដើមតាមតំបន់',
                            'Cultural History & Regional Origin',
                            '历史渊源与地域特色'
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                        {historyText}
                      </p>
                    </div>

                    {/* 3. Key Authentic Ingredients */}
                    {locFood.ingredients && locFood.ingredients.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            {tr(
                              language,
                              `គ្រឿងផ្សំសំខាន់ៗ (${locFood.ingredients.length} មុខ)`,
                              `Key Ingredients (${locFood.ingredients.length})`,
                              `主要传统配料（${locFood.ingredients.length} 种）`
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {locFood.ingredients.slice(0, 5).map((ing, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-slate-700/80 text-emerald-900 dark:text-emerald-200 border border-emerald-200/70 dark:border-slate-600 text-[10px] font-semibold"
                            >
                              🌿 {ing.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Where to Find & Verified Province Restaurants */}
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                      <div className="text-[11px] font-extrabold text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {tr(
                            language,
                            `កន្លែងលក់ និងទីតាំងក្នុង${provMeta.fullKh}`,
                            `Where to Find in ${provMeta.en}`,
                            `${provMeta.zh}推荐寻味地点`
                          )}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                        📍 {getProvinceWhereToFind(provMeta)}
                      </p>

                      {matchedRests.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {matchedRests.slice(0, 2).map((rest) => {
                            const rLoc = getLocalizedRestaurant(rest, language);
                            return (
                              <button
                                key={rest.id}
                                type="button"
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

                    {/* 5. Action Buttons: Full Recipe & Interactive Map Navigation */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
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
            })
          ) : (
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
                    'សូមសម្អាតពាក្យស្វែងរក ឬជ្រើសរើសខេត្ត-ក្រុងផ្សេងទៀតដើម្បីមើលមុខម្ហូបប្រពៃណីទាំង ២៥ ខេត្ត-ក្រុង។',
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
          )}
        </div>
      </div>
    </div>
  );
};

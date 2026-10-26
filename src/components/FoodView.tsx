import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { RestaurantCard } from './RestaurantCard';
import {
  FoodItem,
  KHMER_FOOD_PRIMARY_CATEGORIES,
  KhmerFoodPrimaryGroup,
  classifyKhmerFoodPrimaryGroup,
  organizeAndDeduplicateFoods,
  isUserVipActive,
} from '../types';
import { Utensils, Lock, Crown, Search, X, Globe, Loader2, Plus } from 'lucide-react';
import { DISH_PROVINCES, detectDishProvince } from '../utils/foodFilters';
import { TAG_FILTERS, TAG_ESTIMATE_NOTE, GENERAL_FOOD_INFO_NOTE, matchesTagFilter, TagFilterId } from '../utils/dishTags';
import { TAG_FILTER_EVENT, consumePendingTagFilter, hasSpecialAndHealthyFoodVipAccess } from '../utils/smartHub';
import { tr, translateProvince } from '../utils/i18n';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';
import {
  searchCambodiaPlacesWithSmartCache,
  convertGooglePlaceToRestaurant,
  findDuplicateRestaurantForGooglePlace,
  normalizeKhmerSearchText,
  expandMultilingualPlaceQuery,
  GooglePlaceCachedItem,
} from '../services/googlePlacesService';

const PAGE_BATCH_SIZE = 48;

export const FoodView: React.FC = () => {
  const {
    foods,
    restaurants,
    language,
    searchQuery,
    setSearchQuery,
    selectedProvince,
    setSelectedProvince,
    currentUser,
    openUpgradeVipModal,
    showToast,
    openGoogleMapsSearchModal,
    importGooglePlaceToApp,
  } = useApp();
  const canUseVip = hasSpecialAndHealthyFoodVipAccess(currentUser);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_BATCH_SIZE);
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [smartCachePlaces, setSmartCachePlaces] = useState<GooglePlaceCachedItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [cacheSourceLabel, setCacheSourceLabel] = useState<string>('');

  // A tag chosen in the Smart Menu before this screen mounted (in-memory handoff, no storage, VIP-verified)
  const [initialTag] = useState<TagFilterId | null>(() => consumePendingTagFilter(currentUser));
  const [tagFilter, setTagFilter] = useState<TagFilterId>(canUseVip && initialTag ? initialTag : 'all');
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const isKm = language === 'km';

  const quickProvinces = [
    { id: '', nameKh: 'គ្រប់ទីតាំង', nameEn: 'All Locations' },
    { id: 'ភ្នំពេញ', nameKh: 'ភ្នំពេញ', nameEn: 'Phnom Penh' },
    { id: 'សៀមរាប', nameKh: 'សៀមរាប', nameEn: 'Siem Reap' },
    { id: 'កំពត', nameKh: 'កំពត', nameEn: 'Kampot' },
    { id: 'កែប', nameKh: 'កែប', nameEn: 'Kep' },
    { id: 'បាត់ដំបង', nameKh: 'បាត់ដំបង', nameEn: 'Battambang' },
    { id: 'ព្រះសីហនុ', nameKh: 'ព្រះសីហនុ', nameEn: 'Sihanoukville' },
    { id: 'កំពង់ចាម', nameKh: 'កំពង់ចាម', nameEn: 'Kampong Cham' },
    { id: 'មណ្ឌលគិរី', nameKh: 'មណ្ឌលគិរី', nameEn: 'Mondulkiri' },
  ];

  // Smart Menu -> Food tab: pre-select the exact tag and show all matching dishes (VIP-only)
  useEffect(() => {
    if (canUseVip && initialTag) setSearchQuery('');
    const onTag = (e: Event) => {
      const id = (e as CustomEvent<TagFilterId>).detail;
      consumePendingTagFilter(currentUser);
      if (!hasSpecialAndHealthyFoodVipAccess(currentUser)) {
        setTagFilter('all');
        return;
      }
      setTagFilter(id);
      setSelectedCategory('all');
      setProvinceFilter('');
      setSearchQuery('');
    };
    window.addEventListener(TAG_FILTER_EVENT, onTag);
    return () => window.removeEventListener(TAG_FILTER_EVENT, onTag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseVip, currentUser]);

  // Reset healthy tag filter if user logs out or loses VIP status
  useEffect(() => {
    if (!canUseVip && tagFilter !== 'all') {
      setTagFilter('all');
    }
  }, [canUseVip, tagFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_BATCH_SIZE);
  }, [selectedCategory, searchQuery, provinceFilter, selectedProvince, tagFilter]);

  // Live Smart Cache & Google Maps search (works identically to Shops / RestaurantView!)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSmartCachePlaces([]);
      setIsSearchingOnline(false);
      return;
    }

    let cancelled = false;
    setIsSearchingOnline(true);
    const timer = setTimeout(async () => {
      const res = await searchCambodiaPlacesWithSmartCache(
        q,
        selectedProvince || 'ទាំងអស់',
        'restaurant'
      );
      if (!cancelled) {
        setSmartCachePlaces(res.results);
        setCacheSourceLabel(
          res.fromSmartCache
            ? tr(language, 'Smart Cache ($0 កូតា Google)', 'Smart Cache ($0 Google Quota)', '智能缓存（$0 谷歌配额）')
            : res.providerUsed === 'google_maps_api'
            ? tr(language, 'Google Maps Places API + រក្សាទុកចូល Smart Cache', 'Google Maps Places API + Saved to Smart Cache', '谷歌地图 API + 已存至智能缓存')
            : tr(language, 'ផែនទីអនឡាញកម្ពុជា + រក្សាទុកចូល Smart Cache', 'Cambodia Online Map + Saved to Smart Cache', '柬埔寨在线地图 + 已存至智能缓存')
        );
        setIsSearchingOnline(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedProvince, language]);

  // Deduplicate and sort all dishes in exact category order: សម្ល -> ឆា -> ស្ងោរ -> បង្អែម
  const organizedFoods = useMemo(() => organizeAndDeduplicateFoods(foods), [foods]);

  // Count dishes in each primary group
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: organizedFoods.length,
      samlor: 0,
      cha: 0,
      sngor: 0,
      bong_aem: 0,
    };
    for (const f of organizedFoods) {
      const grp = classifyKhmerFoodPrimaryGroup(f);
      counts[grp] = (counts[grp] || 0) + 1;
    }
    return counts;
  }, [organizedFoods]);

  // Ordered exactly as requested: សម្ល, ឆា, ស្ងោរ, បង្អែម
  const categories = [
    { id: 'all', nameKh: 'ទាំងអស់', nameEn: 'All Menus', nameZh: '全部菜品', emoji: '🍽️' },
    { id: 'samlor', nameKh: '១. សម្ល', nameEn: '1. Soups & Curries', nameZh: '1. 浓汤/咖喱', emoji: '🍲' },
    { id: 'cha', nameKh: '២. ឆា', nameEn: '2. Stir-Fry & Grill', nameZh: '2. 热炒/烧烤', emoji: '🥘' },
    { id: 'sngor', nameKh: '៣. ស្ងោរ', nameEn: '3. Boiled Soups', nameZh: '3. 清汤/汤粉', emoji: '🥣' },
    { id: 'bong_aem', nameKh: '៤. បង្អែម', nameEn: '4. Desserts', nameZh: '4. 高棉甜品', emoji: '🍨' },
  ];

  const sectionZhMeta: Record<KhmerFoodPrimaryGroup, { titleZh: string; subtitleZh: string }> = {
    samlor: { titleZh: '1. 高棉传统浓汤与咖喱', subtitleZh: '正宗高棉浓汤、阿莫克与红绿咖喱' },
    cha: { titleZh: '2. 高棉风味小炒与烤物', subtitleZh: '香茅热炒、摇滚牛肉粒、炙烤与凉拌菜' },
    sngor: { titleZh: '3. 清炖鲜汤、米粉与主食', subtitleZh: '酸汤、清汤、高棉米粉与特色饭面' },
    bong_aem: { titleZh: '4. 传统高棉甜品与糕点', subtitleZh: '椰奶甜汤、传统糕点与特色饮品' },
  };

  const filteredFoods = useMemo(() => {
    const q = normalizeKhmerSearchText(searchQuery);
    const tokens = q ? expandMultilingualPlaceQuery(searchQuery, 'restaurant').matchTokens : [];
    const cleanSelProv = (selectedProvince || '').replace(/^រាជធានី|^ខេត្ត/g, '').trim();

    return organizedFoods.filter((f) => {
      if (!matchesTagFilter(f, tagFilter, canUseVip)) return false;
      if (provinceFilter && detectDishProvince(f) !== provinceFilter) return false;
      if (cleanSelProv && !q) {
        const dishText = `${f.nameKh} ${f.nameEn} ${f.descriptionKh} ${f.descriptionEn}`;
        const detectedId = detectDishProvince(f);
        const matchProvObj = DISH_PROVINCES.find((p) => p.id === detectedId);
        if (
          !dishText.includes(cleanSelProv) &&
          (!matchProvObj || !matchProvObj.kh.includes(cleanSelProv))
        ) {
          return false;
        }
      }
      if (selectedCategory !== 'all') {
        const grp = classifyKhmerFoodPrimaryGroup(f);
        if (grp !== selectedCategory && f.categorySlug !== selectedCategory) {
          return false;
        }
      }
      if (q) {
        const loc = getLocalizedFood(f, 'zh');
        const hay = normalizeKhmerSearchText(
          `${f.nameKh} ${f.nameEn} ${loc.name} ${f.categoryKh || ''} ${f.categoryEn || ''} ${f.descriptionKh || ''} ${f.descriptionEn || ''} ${loc.description || ''} ${(f.ingredients || []).map((i) => `${i.nameKh} ${i.nameEn}`).join(' ')}`
        );
        const matched = hay.includes(q) || tokens.some((tok) => tok.length >= 2 && hay.includes(tok.toLowerCase()));
        if (!matched) return false;
      }
      return true;
    });
  }, [organizedFoods, selectedCategory, searchQuery, provinceFilter, selectedProvince, tagFilter, canUseVip]);

  // Also match in-app restaurants when user types a search query in FoodView (just like Shops!)
  const matchedInAppRestaurants = useMemo(() => {
    const q = normalizeKhmerSearchText(searchQuery);
    if (!q || q.length < 2) return [];
    const tokens = expandMultilingualPlaceQuery(searchQuery, 'restaurant').matchTokens;
    const cleanSelProv = (selectedProvince || '').replace(/^រាជធានី|^ខេត្ត/g, '').trim();
    return restaurants
      .filter((r) => {
        if (!r || !r.id || String(r.id).startsWith('food-') || String(r.id).startsWith('dest-')) return false;
        if (r.status !== 'approved' && currentUser?.role !== 'admin' && currentUser?.id !== r.ownerId) return false;
        if (cleanSelProv && !r.provinceKh.replace(/^រាជធានី|^ខេត្ត/g, '').includes(cleanSelProv)) return false;
        const hay = normalizeKhmerSearchText(
          `${r.nameKh || ''} ${r.nameEn || ''} ${r.descriptionKh || ''} ${r.addressKh || ''} ${(r.signatureDishesKh || []).join(' ')} ${(r.menuItems || []).map((m) => `${m.nameKh || ''} ${m.nameEn || ''}`).join(' ')}`
        );
        return hay.includes(q) || tokens.some((tok) => tok.length >= 2 && hay.includes(tok.toLowerCase()));
      })
      .slice(0, 12);
  }, [restaurants, searchQuery, selectedProvince, currentUser?.role, currentUser?.id]);

  // Provinces that actually appear in dish names/descriptions (no empty filter options)
  const provinceOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of organizedFoods) {
      const id = detectDishProvince(f);
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    }
    return DISH_PROVINCES.filter((p) => counts.has(p.id)).map((p) => ({ ...p, count: counts.get(p.id) || 0 }));
  }, [organizedFoods]);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    Boolean(provinceFilter) ||
    Boolean(selectedProvince) ||
    tagFilter !== 'all' ||
    Boolean(searchQuery.trim());
  const resetAllFilters = () => {
    setSelectedCategory('all');
    setProvinceFilter('');
    setSelectedProvince('');
    setTagFilter('all');
    setSearchQuery('');
  };

  useEffect(() => {
    const node = loadMoreTriggerRef.current;
    if (!node || visibleCount >= filteredFoods.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(filteredFoods.length, prev + PAGE_BATCH_SIZE));
        }
      },
      { rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, filteredFoods.length]);

  const displayedFoods = useMemo(
    () => filteredFoods.slice(0, visibleCount),
    [filteredFoods, visibleCount]
  );

  // Group displayedFoods by primary category in exact order: សម្ល, ឆា, ស្ងោរ, បង្អែម
  const groupedDisplayedSections = useMemo(() => {
    const map: Record<KhmerFoodPrimaryGroup, FoodItem[]> = {
      samlor: [],
      cha: [],
      sngor: [],
      bong_aem: [],
    };
    for (const f of displayedFoods) {
      const grp = classifyKhmerFoodPrimaryGroup(f);
      map[grp].push(f);
    }
    return KHMER_FOOD_PRIMARY_CATEGORIES
      .map((meta) => ({
        meta,
        items: map[meta.id],
        totalInCategory: categoryCounts[meta.id] || 0,
      }))
      .filter((sec) => sec.items.length > 0);
  }, [displayedFoods, categoryCounts]);

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-24">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-moul text-base sm:text-lg text-[#0F172A] dark:text-white flex items-center gap-2">
            <Utensils className="w-5 h-5 text-[#059669]" />
            <span>
              {tr(language, 'ប្រមូលផ្តុំម្ហូបខ្មែរ (២០០ មុខ)', 'Khmer Food Collection (200 Dishes)', '高棉美食大全（200 道正宗菜品）')}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-khmer mt-0.5">
            {tr(
              language,
              `បង្ហាញ ${filteredFoods.length} លើ ${foods.length} មុខម្ហូបខ្មែរពិតៗ`,
              `Showing ${filteredFoods.length} of ${foods.length} authentic dishes`,
              `当前显示 ${filteredFoods.length} / ${foods.length} 道正宗高棉菜品`
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openGoogleMapsSearchModal('restaurant')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-bold text-xs shadow-xs font-khmer transition active:scale-95 cursor-pointer shrink-0"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-200" />
          <span>{tr(language, 'ស្វែងរក Google Maps', 'Google Maps Search', '谷歌地图搜索')}</span>
        </button>
      </div>

      {/* Direct Food & Shop Search Bar + Quick Province Filter (Same as Shops!) */}
      <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-emerald-500/30 shadow-xs space-y-2 font-khmer">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr(
              language,
              'ស្វែងរកមុខម្ហូប ឬហាងអាហារ (ឧ. អាម៉ុក, សម្លការី, Pizza, កាហ្វេ)...',
              'Search dish or restaurant (e.g. Amok, Curry, Pizza, Coffee)...',
              '搜索美食或餐厅（如：阿莫克、咖喱、Pizza、咖啡）...'
            )}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {quickProvinces.map((p) => {
            const cleanSel = (selectedProvince || '').replace(/^រាជធានី|^ខេត្ត/g, '').trim();
            const active = cleanSel === p.id || (!cleanSel && p.id === '');
            return (
              <button
                key={p.id || 'all'}
                type="button"
                onClick={() => setSelectedProvince(p.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-[#064E3B] text-white font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-emerald-50'
                }`}
              >
                {language === 'km' ? p.nameKh : language === 'zh' ? translateProvince(p.nameEn, 'zh') : p.nameEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ordered Primary Category Pills: ទាំងអស់ | ១. សម្ល | ២. ឆា | ៣. ស្ងោរ | ៤. បង្អែម */}
      <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-2xl border border-emerald-500/20 shadow-2xs space-y-2 font-khmer">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs sm:text-sm font-bold text-[#064E3B] dark:text-emerald-300">
            {tr(
              language,
              '📂 បញ្ជីមុខម្ហូបតាមផ្នែក (សម្ល • ឆា • ស្ងោរ • បង្អែម)៖',
              '📂 Browse by Category (Soups • Stir-Fry • Broths • Desserts):',
              '📂 按分类浏览菜品（浓汤 • 热炒 • 清炖 • 甜品）：'
            )}
          </span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {organizedFoods.length} {tr(language, 'មុខម្ហូប', 'dishes', '道菜品')}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] ?? 0;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-center transition-all duration-150 cursor-pointer border ${
                  active
                    ? 'bg-gradient-to-b from-[#064E3B] to-[#047857] text-white font-black border-amber-400 shadow-sm scale-[1.02]'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-emerald-50/60'
                }`}
              >
                <span className="text-base leading-none mb-1">{cat.emoji}</span>
                <span className="text-[11px] sm:text-xs font-bold leading-tight truncate w-full">
                  {tr(language, cat.nameKh, cat.nameEn, cat.nameZh)}
                </span>
                <span
                  className={`mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    active ? 'bg-amber-400 text-slate-950' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dish tag filter (estimated from the recipe — VIP-only for healthy tags) */}
      <div className="space-y-2 font-khmer">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-bold text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
            <span>🥗 {tr(language, 'ស្លាកម្ហូបសុខភាព (VIP)៖', 'Healthy Dish Tags (VIP):', '健康菜品标签 (VIP)：')}</span>
            {!canUseVip && (
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-extrabold inline-flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                <span>VIP</span>
              </span>
            )}
          </span>
          {!canUseVip && (
            <button
              type="button"
              onClick={() => openUpgradeVipModal()}
              className="px-3 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold inline-flex items-center gap-1 shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{tr(language, 'ដំឡើង VIP', 'Upgrade VIP', '升级 VIP')}</span>
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {TAG_FILTERS.map((t) => {
            const active = tagFilter === t.id;
            const isLockedTag = !canUseVip && t.id !== 'all';
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  if (isLockedTag) {
                    showToast(
                      tr(
                        language,
                        'មុខងារស្លាកម្ហូបសុខភាពសម្រាប់គណនី VIP • សូមដំឡើង VIP!',
                        'Healthy Dish Tags are for VIP accounts — please upgrade to VIP!',
                        '健康菜品标签仅限 VIP 账户，请先升级 VIP！'
                      ),
                      'info'
                    );
                    openUpgradeVipModal();
                    return;
                  }
                  setTagFilter(t.id);
                }}
                aria-pressed={active}
                className={`shrink-0 min-h-[40px] px-3.5 rounded-full text-xs sm:text-sm font-bold border transition cursor-pointer inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#064E3B] text-white border-[#064E3B]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                }`}
              >
                <span>{t.emoji} {tr(language, t.labelKh, t.labelEn, t.labelZh)}</span>
                {isLockedTag && (
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-extrabold inline-flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    VIP
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          ℹ️ {tr(language, TAG_ESTIMATE_NOTE.km, TAG_ESTIMATE_NOTE.en, TAG_ESTIMATE_NOTE.zh)}
        </p>
      </div>

      {/* Province filter with ONE reset button */}
      <div className="grid grid-cols-1 gap-2 font-khmer">
        <label className="block">
          <span className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            📍 {tr(language, 'ខេត្ត', 'Province', '省份')}
          </span>
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-900 dark:text-white"
          >
            <option value="">{tr(language, 'គ្រប់ខេត្ត', 'All provinces', '全部省份')}</option>
            {provinceOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {tr(language, p.kh, p.en, p.zh)} ({p.count})
              </option>
            ))}
          </select>
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold active:scale-[0.98] transition cursor-pointer"
          >
            ↺ {tr(language, 'កំណត់តម្រងឡើងវិញ', 'Reset filters', '重置筛选')}
          </button>
        )}
      </div>

      {filteredFoods.length > 0 ? (
        <div className="space-y-6">
          {groupedDisplayedSections.map((section) => {
            const zhMeta = sectionZhMeta[section.meta.id];
            return (
              <div key={section.meta.id} className="space-y-3">
                {/* Category Section Banner Header */}
                <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-[#064E3B] via-[#047857] to-emerald-700 text-white shadow-sm border border-emerald-400/30 font-khmer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-xl shrink-0 border border-white/20">
                      {section.meta.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[11px] font-black">
                          {tr(language, `ផ្នែកទី ${section.meta.order}`, `Category #${section.meta.order}`, `第 ${section.meta.order} 类`)}
                        </span>
                        <h3 className="font-moul text-sm sm:text-base text-white truncate">
                          {tr(language, section.meta.nameKh, section.meta.nameEn, zhMeta?.titleZh || section.meta.nameEn)}
                        </h3>
                      </div>
                      <p className="text-xs text-emerald-100 truncate mt-0.5">
                        {tr(language, section.meta.subtitleKh, section.meta.subtitleEn, zhMeta?.subtitleZh || section.meta.subtitleEn)}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-bold shrink-0 border border-white/25">
                    {section.totalInCategory} {tr(language, 'មុខ', 'items', '道菜')}
                  </span>
                </div>

                {/* Dishes in this category */}
                <div className="grid grid-cols-1 gap-4">
                  {section.items.map((food) => (
                    <FoodCard key={food.id} food={food} />
                  ))}
                </div>
              </div>
            );
          })}

          {visibleCount < filteredFoods.length && (
            <div ref={loadMoreTriggerRef} className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(filteredFoods.length, prev + PAGE_BATCH_SIZE))}
                className="px-5 py-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-sm font-bold shadow-sm font-khmer cursor-pointer transition"
              >
                {tr(
                  language,
                  `បង្ហាញមុខម្ហូបបន្ថែម (${displayedFoods.length} / ${filteredFoods.length})`,
                  `Show More Dishes (${displayedFoods.length} / ${filteredFoods.length})`,
                  `加载更多菜品 (${displayedFoods.length} / ${filteredFoods.length})`
                )}
              </button>
            </div>
          )}
        </div>
      ) : !isSearchingOnline && smartCachePlaces.length === 0 && matchedInAppRestaurants.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2 font-khmer shadow-xs">
          <Utensils className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold">
            {tr(language, 'មិនមានមុខម្ហូបដែលត្រូវគ្នានឹងការស្វែងរកទេ', 'No matching dishes found', '未找到匹配的菜品')}
          </p>
          <p className="text-xs text-slate-400">
            {tr(language, 'សូមប្រើប៊ូតុង «កំណត់តម្រងឡើងវិញ» ខាងលើ', 'Use the "Reset filters" button above', '请使用上方“重置筛选”按钮')}
          </p>
        </div>
      ) : null}

      {/* Matching In-App Shops + Google Maps & Smart Cache Live Results (Works identically to Find in Shop!) */}
      {searchQuery.trim().length >= 2 && (
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3 font-khmer">
          {matchedInAppRestaurants.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#064E3B] dark:text-emerald-300">
                {tr(
                  language,
                  `ហាងអាហារក្នុងកម្មវិធីដែលត្រូវនឹង "${searchQuery.trim()}" (${matchedInAppRestaurants.length})`,
                  `Matching Restaurants in App (${matchedInAppRestaurants.length})`,
                  `应用内匹配的餐厅 (${matchedInAppRestaurants.length})`
                )}
              </div>
              {matchedInAppRestaurants.map((rest) => (
                <RestaurantCard key={rest.id} restaurant={rest} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {isKm
                  ? 'លទ្ធផលស្វែងរកបន្ថែមពី Google Maps & Smart Cache'
                  : 'Google Maps & Smart Cache Results'}
              </span>
            </div>
            {cacheSourceLabel && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold">
                ⚡ {cacheSourceLabel}
              </span>
            )}
          </div>

          {isSearchingOnline ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>{tr(language, 'កំពុងស្វែងរកម្ហូប និងហាងពិតៗនៅភ្នំពេញ និងទូទាំងប្រទេស...', 'Searching verified dishes & restaurants across Cambodia...', '正在搜索柬埔寨各地真实美食与餐厅...')}</span>
            </div>
          ) : smartCachePlaces.length > 0 ? (
            <div className="space-y-3">
              {smartCachePlaces.map((place) => {
                const mappedRest = convertGooglePlaceToRestaurant(place);
                const existingRest = findDuplicateRestaurantForGooglePlace(place, restaurants);
                const alreadyInApp = Boolean(existingRest);
                return (
                  <div key={place.placeId} className="space-y-1.5">
                    <RestaurantCard restaurant={existingRest || mappedRest} />
                    {(currentUser?.role === 'admin' || isUserVipActive(currentUser)) && (
                      <button
                        onClick={() => importGooglePlaceToApp(place)}
                        className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          alreadyInApp
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {alreadyInApp
                            ? tr(language, '✓ មានក្នុងបញ្ជីរួចហើយ (ចុចដើម្បីធ្វើបច្ចុប្បន្នភាពទិន្នន័យ Google Maps)', '✓ Already in Directory (Tap to sync Google Maps data)', '✓ 已在目录中（点击同步谷歌地图数据）')
                            : tr(language, '📥 នាំចូលហាងនេះចូលក្នុងបញ្ជីកម្មវិធីអចិន្ត្រៃយ៍ (Import from Google Maps)', '📥 Import Restaurant into Permanent Directory', '📥 将此餐厅永久导入应用目录')}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-2.5">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {isKm
                  ? `រកមិនឃើញទីតាំង "${searchQuery.trim()}" ក្នុងឃ្លាំងទិន្នន័យទេ។ អ្នកអាចបើកស្វែងរកផ្ទាល់នៅលើ Google Maps៖`
                  : language === 'zh'
                  ? `未在缓存中找到“${searchQuery.trim()}”，您可以直接在 Google 地图中搜索：`
                  : `No cached results for "${searchQuery.trim()}". You can open this search directly in Google Maps:`}
              </p>
            </div>
          )}

          <div className="pt-1 flex flex-col sm:flex-row gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${searchQuery.trim()} ${selectedProvince || ''} Cambodia`.trim()
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>
                {isKm
                  ? `🗺️ បើកស្វែងរក "${searchQuery.trim()}" ផ្ទាល់នៅលើ Google Maps`
                  : language === 'zh'
                  ? `🗺️ 在 Google 地图中搜索 “${searchQuery.trim()}”`
                  : `🗺️ Open "${searchQuery.trim()}" in Google Maps`}
              </span>
            </a>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-400 font-khmer pt-2">
        {tr(language, GENERAL_FOOD_INFO_NOTE.km, GENERAL_FOOD_INFO_NOTE.en, GENERAL_FOOD_INFO_NOTE.zh)}
      </p>
    </div>
  );
};

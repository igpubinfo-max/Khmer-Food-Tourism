import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { AngkorHeroTopHeader } from './AngkorHeroTopHeader';
import {
  FoodItem,
  classifyKhmerFoodPrimaryGroup,
  organizeAndDeduplicateFoods,
} from '../types';
import { Utensils, Crown, MapPin, Plus, Search, Filter, X, Sun, Moon } from 'lucide-react';
import { DISH_PROVINCES, detectDishProvince } from '../utils/foodFilters';
import { TAG_FILTERS, matchesTagFilter, TagFilterId, DishTagId } from '../utils/dishTags';
import { TAG_FILTER_EVENT, consumePendingTagFilter, hasSpecialAndHealthyFoodVipAccess } from '../utils/smartHub';
import { tr } from '../utils/i18n';
import { DishTagIcon } from './icons/HandcraftedIcons';
import { getAuthenticCambodianDishesForMealTime } from '../utils/cambodianMealHabits';

const PAGE_BATCH_SIZE = 20;

type MealTimeFilter = 'all' | 'breakfast' | 'lunch' | 'dinner';

export const FoodView: React.FC = () => {
  const { foods, language, currentUser, openUpgradeVipModal, showToast, setIsAdminOpen } = useApp();
  const isAdmin = Boolean(
    currentUser?.role === 'admin' ||
      currentUser?.id === 'admin-authorized-single' ||
      currentUser?.username === 'admin' ||
      currentUser?.username === 'cheasavuth'
  );
  const canUseVip = hasSpecialAndHealthyFoodVipAccess(currentUser);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mealTimeFilter, setMealTimeFilter] = useState<MealTimeFilter>('all');
  const [foodSearchQuery, setFoodSearchQuery] = useState<string>('');
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_BATCH_SIZE);
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [initialTag] = useState<TagFilterId | null>(() => consumePendingTagFilter(currentUser));
  const [tagFilter, setTagFilter] = useState<TagFilterId>(canUseVip && initialTag ? initialTag : 'all');
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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
    };
    window.addEventListener(TAG_FILTER_EVENT, onTag);
    return () => window.removeEventListener(TAG_FILTER_EVENT, onTag);
  }, [canUseVip, currentUser]);

  useEffect(() => {
    setVisibleCount(PAGE_BATCH_SIZE);
  }, [selectedCategory, mealTimeFilter, foodSearchQuery, provinceFilter, tagFilter]);

  const organizedFoods = useMemo(() => organizeAndDeduplicateFoods(foods), [foods]);

  const isVegetarianDish = (f: FoodItem): boolean =>
    Boolean(
      f.isVegetarian ||
        /បួស|\bvegetarian\b|\bvegan\b|ភេសជ្ជៈ|\bdrink\b/i.test(`${f.nameKh} ${f.nameEn} ${f.categoryKh}`)
    );

  // 6 Square Illustrated Categories matching the reference Food Menu design
  const categories = useMemo(
    () => [
      {
        id: 'all',
        nameKh: 'ទាំងអស់',
        nameEn: 'All',
        nameZh: '全部',
        thumb: '/foods/food-1.jpg',
      },
      {
        id: 'samlor',
        nameKh: 'ស៊ុប',
        nameEn: 'Soups',
        nameZh: '汤羹',
        thumb: '/foods/food-2.jpg',
      },
      {
        id: 'sngor',
        nameKh: 'មី',
        nameEn: 'Noodles',
        nameZh: '面条/粉',
        thumb: '/foods/food-6.jpg',
      },
      {
        id: 'cha',
        nameKh: 'អាំង/ចៀន',
        nameEn: 'Grill/Fry',
        nameZh: '烧烤/热炒',
        thumb: '/foods/food-21.jpg',
      },
      {
        id: 'bong_aem',
        nameKh: 'បង្អែម',
        nameEn: 'Desserts',
        nameZh: '甜品',
        thumb: '/foods/food-14.jpg',
      },
      {
        id: 'vegetarian',
        nameKh: 'ភេសជ្ជៈ/បួស',
        nameEn: 'Drinks/Veg',
        nameZh: '饮品/素食',
        thumb: '/foods/food-25.jpg',
      },
    ],
    []
  );

  // Meal-time matching dish IDs
  const mealTimeDishIds = useMemo(() => {
    if (mealTimeFilter === 'all') return null;
    const matched = getAuthenticCambodianDishesForMealTime(organizedFoods, mealTimeFilter, 120);
    return new Set(matched.map((d) => d.id));
  }, [organizedFoods, mealTimeFilter]);

  const provinceOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of organizedFoods) {
      const p = detectDishProvince(f);
      if (p) counts.set(p, (counts.get(p) || 0) + 1);
    }
    return DISH_PROVINCES.filter((p) => (counts.get(p.id) || 0) > 0).map((p) => ({
      ...p,
      count: counts.get(p.id) || 0,
    }));
  }, [organizedFoods]);

  const filteredFoods = useMemo(() => {
    const q = foodSearchQuery.trim().toLowerCase();
    return organizedFoods.filter((food) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'vegetarian'
          ? isVegetarianDish(food)
          : classifyKhmerFoodPrimaryGroup(food) === selectedCategory);
      if (!matchesCategory) return false;
      if (mealTimeDishIds && !mealTimeDishIds.has(food.id)) return false;
      if (provinceFilter && detectDishProvince(food) !== provinceFilter) return false;
      if (!matchesTagFilter(food, tagFilter)) return false;
      if (q) {
        const hay = `${food.nameKh || ''} ${food.nameEn || ''} ${food.descriptionKh || ''} ${food.descriptionEn || ''} ${food.categoryKh || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [organizedFoods, selectedCategory, mealTimeDishIds, provinceFilter, tagFilter, foodSearchQuery]);

  const displayedFoods = useMemo(
    () => filteredFoods.slice(0, visibleCount),
    [filteredFoods, visibleCount]
  );

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    mealTimeFilter !== 'all' ||
    provinceFilter !== '' ||
    tagFilter !== 'all' ||
    foodSearchQuery.trim() !== '';

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setMealTimeFilter('all');
    setProvinceFilter('');
    setTagFilter('all');
    setFoodSearchQuery('');
  };

  useEffect(() => {
    const node = loadMoreTriggerRef.current;
    if (!node) return;
    if (visibleCount >= filteredFoods.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting) {
          setVisibleCount((prev) => Math.min(filteredFoods.length, prev + PAGE_BATCH_SIZE));
        }
      },
      { root: null, rootMargin: '320px 0px', threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, filteredFoods.length]);

  return (
    <div className="max-w-md mx-auto bg-[#F6F4EE] text-slate-900 min-h-full font-khmer">
      {/* 1. Full-Bleed Angkor Wat Hero Header (No Green Bar) */}
      <AngkorHeroTopHeader mode="food" />

      {/* 2. White/Cream Rounded Sheet */}
      <div className="relative z-10 -mt-6 rounded-t-[26px] bg-[#F6F4EE] pb-8 shadow-[0_-6px_20px_rgba(0,0,0,0.18)] overflow-hidden">
        {/* Top White Header Row: មុខម្ហូបខ្មែរ ទាំងអស់ on Left + Small [👑 VIP] Pill on Right */}
        <div className="bg-[#1E293B] px-4 py-3.5 flex items-center justify-between gap-2 border-b border-slate-700/80 shadow-sm">
          <h2 className="font-khmer font-extrabold text-lg sm:text-xl text-white tracking-tight truncate">
            {tr(language, 'មុខម្ហូបខ្មែរ ទាំងអស់', 'All Cambodian Dishes', '柬埔寨全部美食')}
          </h2>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  (window as any).__kft_admin_tab = 'food';
                  (window as any).__kft_admin_open_add_food = true;
                  setIsAdminOpen(true);
                }}
                className="h-9 px-3 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-xs active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{tr(language, 'បន្ថែម', 'Add', '添加')}</span>
              </button>
            )}

            {/* Small Dark-Gold [👑 VIP] Pill Button on Right Side */}
            <button
              type="button"
              onClick={() => openUpgradeVipModal()}
              style={{
                background: 'linear-gradient(180deg, #3A3222 0%, #231E14 100%)',
                boxShadow: '0 3px 10px rgba(212, 175, 55, 0.25)',
              }}
              className="h-9 px-4 rounded-full border-2 border-[#D4AF37] text-[#FBBF24] font-extrabold text-sm inline-flex items-center gap-1.5 active:scale-95 transition cursor-pointer shrink-0"
              title={tr(language, 'សមាជិកពិសេស VIP', 'VIP Membership', 'VIP 会员')}
            >
              <Crown className="w-4 h-4 fill-[#FBBF24] text-[#FBBF24] shrink-0" />
              <span>VIP</span>
            </button>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="px-3.5 pt-3 space-y-3">
          {/* 6 Square Illustrated Category Cards */}
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={
                    active
                      ? {
                          background: 'linear-gradient(180deg, #43A067 0%, #1E5E3A 100%)',
                          boxShadow: '0 4px 10px rgba(30, 94, 58, 0.28)',
                        }
                      : undefined
                  }
                  className={`rounded-2xl py-2 px-1 flex flex-col items-center justify-between gap-1.5 transition active:scale-95 cursor-pointer border ${
                    active
                      ? 'text-white border-[#2E7D4F]'
                      : 'bg-[#FAF9F5] text-[#0F172A] border-slate-200/90 hover:border-emerald-500/50 shadow-2xs'
                  }`}
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-black/10 bg-white shadow-2xs shrink-0">
                    <img
                      src={cat.thumb}
                      alt={cat.nameKh}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span
                    className={`font-khmer font-extrabold text-[11px] sm:text-xs leading-tight text-center truncate w-full ${
                      active ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    {tr(language, cat.nameKh, cat.nameEn, cat.nameZh)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Meal-Time Filter Pills Row: 📍 ទាំងអស់ | 🍴 ពេលព្រឹក | ☀️ ពេលថ្ងៃ | 🌙 ពេលល្ងាច */}
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                id: 'all' as MealTimeFilter,
                labelKh: 'ទាំងអស់',
                labelEn: 'All',
                labelZh: '全部',
                renderIcon: (active: boolean) => (
                  <MapPin className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-emerald-300' : 'text-[#235D3A]'}`} />
                ),
              },
              {
                id: 'breakfast' as MealTimeFilter,
                labelKh: 'ពេលព្រឹក',
                labelEn: 'Morning',
                labelZh: '早餐',
                renderIcon: (active: boolean) => (
                  <Utensils className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-300' : 'text-[#235D3A]'}`} />
                ),
              },
              {
                id: 'lunch' as MealTimeFilter,
                labelKh: 'ពេលថ្ងៃ',
                labelEn: 'Midday',
                labelZh: '午餐',
                renderIcon: (active: boolean) => (
                  <Sun className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-300' : 'text-amber-500'}`} />
                ),
              },
              {
                id: 'dinner' as MealTimeFilter,
                labelKh: 'ពេលល្ងាច',
                labelEn: 'Evening',
                labelZh: '晚餐',
                renderIcon: (active: boolean) => (
                  <Moon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-200' : 'text-indigo-600'}`} />
                ),
              },
            ].map((m) => {
              const active = mealTimeFilter === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMealTimeFilter(m.id)}
                  className={`h-9 px-2 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 border transition active:scale-95 cursor-pointer ${
                    active
                      ? 'bg-[#235D3A] text-white border-[#235D3A] shadow-xs'
                      : 'bg-white text-[#1E293B] border-slate-200/90 hover:border-emerald-600/40 shadow-2xs'
                  }`}
                >
                  {m.renderIcon(active)}
                  <span className="truncate">{tr(language, m.labelKh, m.labelEn, m.labelZh)}</span>
                </button>
              );
            })}
          </div>

          {/* Search Bar + Green Circular Filter Button Row */}
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-11 rounded-full bg-[#1E293B] border border-slate-600/90 shadow-sm px-4 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-white shrink-0" />
              <input
                type="text"
                value={foodSearchQuery}
                onChange={(e) => setFoodSearchQuery(e.target.value)}
                placeholder={tr(language, 'ស្វែងរកម្ហូប...', 'Search dishes...', '搜索高棉美食...')}
                style={{ color: "#FFFFFF" }}
                className="w-full bg-transparent text-xs sm:text-sm font-khmer font-bold text-white placeholder:text-white focus:outline-none"
              />
              {foodSearchQuery && (
                <button
                  type="button"
                  onClick={() => setFoodSearchQuery('')}
                  className="p-0.5 text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowFilterDrawer((v) => !v)}
              title={tr(language, 'តម្រងខេត្ត និងសុខភាព', 'Province & Healthy Filters', '省份与健康筛选')}
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-xs transition active:scale-95 cursor-pointer ${
                showFilterDrawer || provinceFilter !== '' || tagFilter !== 'all'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-[#235D3A] hover:bg-[#1B4B2E] text-white'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {/* Expandable Province & Healthy Tags Filter Drawer */}
          {(showFilterDrawer || provinceFilter !== '' || tagFilter !== 'all') && (
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              {/* Healthy Dish Tag Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">
                    {tr(language, 'តម្រងម្ហូបសុខភាព៖', 'Healthy Tags:', '健康营养筛选：')}
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      ↺ {tr(language, 'កំណត់ឡើងវិញ', 'Reset', '重置')}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {TAG_FILTERS.map((t) => {
                    const active = tagFilter === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTagFilter(t.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 border transition cursor-pointer ${
                          active
                            ? 'bg-[#235D3A] text-white border-[#235D3A]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-500'
                        }`}
                      >
                        {t.id !== 'all' && <DishTagIcon id={t.id as DishTagId} className="w-3.5 h-3.5 shrink-0" />}
                        <span>{tr(language, t.labelKh, t.labelEn, t.labelZh)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Province Select */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#235D3A]" />
                  <span>{tr(language, 'ជ្រើសរើសខេត្ត/តំបន់៖', 'Filter by Province:', '按省份筛选：')}</span>
                </label>
                <select
                  value={provinceFilter}
                  onChange={(e) => setProvinceFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="">{tr(language, 'គ្រប់ខេត្តទាំងអស់', 'All Provinces', '全部省份')}</option>
                  {provinceOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {tr(language, p.kh, p.en, p.zh)} ({p.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Dish Cards List */}
          {filteredFoods.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-2 shadow-2xs">
              <Utensils className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-sm text-slate-700 font-bold">
                {tr(language, 'មិនមានមុខម្ហូបក្នុងផ្នែកនេះទេ', 'No matching dishes found', '未找到匹配的菜品')}
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-4 py-2 rounded-full bg-[#235D3A] text-white text-xs font-bold cursor-pointer"
              >
                ↺ {tr(language, 'បង្ហាញមុខម្ហូបទាំងអស់ឡើងវិញ', 'Show All Dishes', '显示全部菜品')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedFoods.map((food) => (
                <FoodCard key={food.id} food={food} />
              ))}

              {visibleCount < filteredFoods.length && (
                <div ref={loadMoreTriggerRef} className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => Math.min(filteredFoods.length, prev + PAGE_BATCH_SIZE))}
                    className="px-5 py-2.5 rounded-full bg-[#235D3A] hover:bg-[#1B4B2E] text-white text-xs font-bold shadow-xs cursor-pointer transition"
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
          )}
        </div>
      </div>
    </div>
  );
};

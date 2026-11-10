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
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const dishListStartRef = useRef<HTMLDivElement | null>(null);

  const handleExecuteFoodSearch = () => {
    const trimmed = foodSearchQuery.trim();
    if (!trimmed) {
      searchInputRef.current?.focus();
      return;
    }
    if (trimmed !== foodSearchQuery) {
      setFoodSearchQuery(trimmed);
    }
    searchInputRef.current?.blur();
    dishListStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

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

  const isNoodleDish = (f: FoodItem): boolean => {
    if (f.categorySlug === 'noodles') return true;
    if (f.categorySlug === 'dessert' || f.categorySlug === 'drink' || f.categorySlug === 'soup') return false;
    const text = `${f.nameKh || ''} ${f.nameEn || ''} ${f.categoryKh || ''} ${f.categoryEn || ''}`;
    return /(^មី|មីឆា|មីគោក|មីទឹក|មីលាក់ខ្លួន|មីសួរឆា|មីកូឡា|គុយទាវ|នំបញ្ចុក|លតឆា|បាញ់កាញ់|បាញ់ហយ|បាញ់ស៊ុង|ស្ប៉ាហ្គេទី|\bnoodle|\bkuy\s*teav|\bkuyteav|\bnom\s*banh\s*chok|\bnum\s*banh\s*chok|\blort\s*cha|\bspaghetti|\bvermicelli)/i.test(
      text
    );
  };

  const isVegetarianDish = (f: FoodItem): boolean =>
    Boolean(
      f.categorySlug === 'drink' ||
        f.isVegetarian ||
        /បួស|\bvegetarian\b|\bvegan\b|ភេសជ្ជៈ|\bdrink\b|\bsmoothie\b|\biced\s*tea\b|\bcoffee\b/i.test(
          `${f.nameKh || ''} ${f.nameEn || ''} ${f.categoryKh || ''} ${f.categoryEn || ''}`
        )
    );

  const isDessertDish = (f: FoodItem): boolean => {
    if (f.categorySlug === 'drink') return false;
    if (f.categorySlug === 'dessert') return true;
    const kh = (f.nameKh || '').trim();
    if (
      kh.includes('បាញ់ឆែវ') ||
      kh.includes('បាញ់ហយ') ||
      kh.includes('នំប៉័ង') ||
      kh.includes('គួង') ||
      kh.includes('ណែម') ||
      kh.includes('គូឆាយ') ||
      kh.includes('កចាយ') ||
      kh.includes('អន្សមជ្រូក') ||
      kh.includes('អន្សមចៀន') ||
      kh.includes('ពងទាកូន') ||
      kh.includes('ប្រហិត')
    ) {
      return false;
    }
    return classifyKhmerFoodPrimaryGroup(f) === 'bong_aem';
  };

  const matchesSelectedFoodCategory = (f: FoodItem, catId: string): boolean => {
    switch (catId) {
      case 'all':
        return true;
      case 'samlor': {
        if (
          isNoodleDish(f) ||
          isDessertDish(f) ||
          isVegetarianDish(f) ||
          f.categorySlug === 'drink' ||
          f.categorySlug === 'rice' ||
          f.categorySlug === 'salad' ||
          f.categorySlug === 'grilled' ||
          f.categorySlug === 'stirfry'
        ) {
          return false;
        }
        if (f.categorySlug === 'soup') return true;
        const grp = classifyKhmerFoodPrimaryGroup(f);
        return grp === 'samlor' || grp === 'sngor';
      }
      case 'cha': {
        // Merged Noodles + Grill/Fry into "អាំង/ចៀន"
        if (isDessertDish(f) || f.categorySlug === 'drink' || f.categorySlug === 'soup') {
          return false;
        }
        if (isNoodleDish(f) || f.categorySlug === 'grilled' || f.categorySlug === 'stirfry') {
          return true;
        }
        return classifyKhmerFoodPrimaryGroup(f) === 'cha';
      }
      case 'bong_aem':
        // Combined Desserts and Drinks into one button
        return isDessertDish(f) || isVegetarianDish(f) || f.categorySlug === 'drink';
      default:
        return classifyKhmerFoodPrimaryGroup(f) === catId;
    }
  };

  // 4 Square Illustrated Categories:
  // 1. ទាំងអស់ (All)
  // 2. សម្ល (Soups & Stews — renamed from ស៊ុប)
  // 3. អាំង/ចៀន (Grill/Fry & Noodles merged)
  // 4. បង្អែម/ភេសជ្ជៈ (Desserts & Drinks combined)
  const categories = useMemo(
    () => [
      {
        id: 'all',
        nameKh: 'ទាំងអស់',
        nameEn: 'All',
        nameZh: '全部',
        thumb: '/foods/food-1.jpg', // Fish Amok (អាម៉ុកត្រីស្លឹកញរ)
      },
      {
        id: 'samlor',
        nameKh: 'សម្ល',
        nameEn: 'Soups & Stews',
        nameZh: '高棉汤羹',
        thumb: '/foods/food-2.jpg', // Authentic Samlor Korko Soup (សម្លកកូរខ្មែរ)
      },
      {
        id: 'cha',
        nameKh: 'អាំង/ចៀន',
        nameEn: 'Grill/Fry',
        nameZh: '烧烤/热炒',
        thumb: '/foods/food-21.jpg', // Roasted Honey Chicken (មាន់ដុតទឹកឃ្មុំព្រៃ)
      },
      {
        id: 'bong_aem',
        nameKh: 'បង្អែម/ភេសជ្ជៈ',
        nameEn: 'Desserts & Drinks',
        nameZh: '甜品/饮品',
        thumb: '/foods/food-48.jpg', // Warm Banana in Sweet Coconut Cream Dessert
      },
    ],
    []
  );

    // Meal-time matching dish IDs
  const mealTimeDishIds = useMemo(() => {
    if (mealTimeFilter === 'all') return null;
    const matched = getAuthenticCambodianDishesForMealTime(organizedFoods, mealTimeFilter);
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
      const matchesCategory = matchesSelectedFoodCategory(food, selectedCategory);
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
    <div className="max-w-md mx-auto bg-[#1E293B] text-slate-900 min-h-full font-khmer">
      {/* 1. Full-Bleed Angkor Wat Hero Header (No Green Bar) */}
      <AngkorHeroTopHeader mode="food" />

      {/* 2. Rounded Sheet directly below Angkor Wat Hero Header (No VIP button or opaque bar blocking Angkor Wat) */}
      <div className="relative z-10 -mt-3 rounded-t-[26px] bg-[#1E293B] pb-8 shadow-[0_-6px_20px_rgba(0,0,0,0.18)] overflow-hidden">
        {/* Main Content Container */}
        <div className="px-3.5 pt-3.5 space-y-3">
          {/* 4 Square Illustrated Category Cards */}
          <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
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
                  className={`rounded-2xl py-2.5 px-1.5 flex flex-col items-center justify-between gap-1.5 transition active:scale-95 cursor-pointer border ${
                    active
                      ? 'text-white border-[#2E7D4F]'
                      : 'bg-[#FAF9F5] text-[#0F172A] border-slate-200/90 hover:border-emerald-500/50 shadow-2xs'
                  }`}
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-black/10 bg-white shadow-2xs shrink-0">
                    <img
                      src={cat.thumb}
                      alt={cat.nameKh}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span
                    className={`font-khmer font-extrabold text-[11.5px] sm:text-xs leading-tight text-center truncate w-full ${
                      active ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    {tr(language, cat.nameKh, cat.nameEn, cat.nameZh)}
                  </span>
                </button>
              );
            })}
          </div>

                    {/* Meal-Time Filter Pills Row: ទាំងអស់ | ពេលព្រឹក | ពេលថ្ងៃ | ពេលល្ងាច */}
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                id: 'all' as MealTimeFilter,
                labelKh: 'ទាំងអស់',
                labelEn: 'All',
                labelZh: '全部',
                renderIcon: (active: boolean) => (
                  <svg
                    className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-emerald-300' : 'text-[#235D3A]'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" />
                    <circle cx="12" cy="11" r="2.3" />
                  </svg>
                ),
              },
              {
                id: 'breakfast' as MealTimeFilter,
                labelKh: 'ពេលព្រឹក',
                labelEn: 'Morning',
                labelZh: '早餐',
                renderIcon: (active: boolean) => (
                  <svg
                    className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-300' : 'text-[#235D3A]'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 12h16a1 1 0 0 1 1 1v.5a7.5 7.5 0 0 1-15 0V13a1 1 0 0 1 1-1Z" />
                    <path d="M7 20.5h10" />
                    <path d="M9.5 8.5c0-1.4.9-2.2.9-3.5" />
                    <path d="M14.5 8.5c0-1.4.9-2.2.9-3.5" />
                  </svg>
                ),
              },
              {
                id: 'lunch' as MealTimeFilter,
                labelKh: 'ពេលថ្ងៃ',
                labelEn: 'Midday',
                labelZh: '午餐',
                renderIcon: (active: boolean) => (
                  <svg
                    className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-300' : 'text-amber-500'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="4.2" />
                    <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
                  </svg>
                ),
              },
              {
                id: 'dinner' as MealTimeFilter,
                labelKh: 'ពេលល្ងាច',
                labelEn: 'Evening',
                labelZh: '晚餐',
                renderIcon: (active: boolean) => (
                  <svg
                    className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-200' : 'text-indigo-600'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20.4 14.5A8.5 8.5 0 0 1 9.5 3.6a8.5 8.5 0 1 0 10.9 10.9Z" />
                  </svg>
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

          {/* Search Bar (#1B2C40 with Right-Side Compact Green Search Button) + Circular Filter Button Row */}
          <div ref={dishListStartRef} className="flex items-center gap-2">
            <div className="flex-1 h-11 rounded-full bg-[#1B2C40] border border-slate-600/80 shadow-sm pl-3.5 pr-1.5 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-white shrink-0 pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7.5" />
                <path d="m20 20-3.8-3.8" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={foodSearchQuery}
                onChange={(e) => setFoodSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteFoodSearch();
                  }
                }}
                placeholder={tr(language, 'ស្វែងរកម្ហូប...', 'Search dishes...', '搜索高棉美食...')}
                style={{ color: '#FFFFFF' }}
                className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-khmer font-bold text-white placeholder:text-white/90 focus:outline-none"
              />
              {foodSearchQuery && (
                <button
                  type="button"
                  onClick={() => setFoodSearchQuery('')}
                  title={tr(language, 'សម្អាត', 'Clear', '清除')}
                  className="p-1 rounded-full text-white/75 hover:text-white transition cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleExecuteFoodSearch}
                className="h-8 px-3 rounded-full bg-[#15803D] hover:bg-[#166534] border border-emerald-400/35 text-white text-xs font-khmer font-extrabold flex items-center justify-center gap-1.5 shrink-0 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5 text-white shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7.5" />
                  <path d="m20 20-3.8-3.8" />
                </svg>
                <span className="leading-none">{tr(language, 'ស្វែងរក', 'Search', '搜索')}</span>
              </button>
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
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
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

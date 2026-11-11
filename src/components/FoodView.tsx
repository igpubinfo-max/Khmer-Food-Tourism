import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { AngkorHeroTopHeader } from './AngkorHeroTopHeader';
import {
  FoodItem,
  organizeAndDeduplicateFoods,
} from '../types';
import { Utensils, Crown, MapPin, Plus, Search, Filter, X } from 'lucide-react';
import { DISH_PROVINCES, doesDishBelongToProvince } from '../utils/foodFilters';
import { TAG_FILTERS, matchesTagFilter, TagFilterId, DishTagId } from '../utils/dishTags';
import { TAG_FILTER_EVENT, consumePendingTagFilter, hasSpecialAndHealthyFoodVipAccess } from '../utils/smartHub';
import { tr } from '../utils/i18n';
import { DishTagIcon } from './icons/HandcraftedIcons';
import { matchesFoodScreenCategoryTab } from '../utils/cambodianMealHabits';

const PAGE_BATCH_SIZE = 20;

type MealTimeFilter = 'all' | 'breakfast' | 'lunch' | 'dinner';

export const FoodView: React.FC = () => {
  const {
    foods,
    language,
    currentUser,
    openUpgradeVipModal,
    setIsAdminOpen,
  } = useApp();
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
  const provinceOptions = useMemo(() => {
    return DISH_PROVINCES.map((p) => {
      let count = 0;
      for (const f of organizedFoods) {
        if (doesDishBelongToProvince(f, p.id)) {
          count += 1;
        }
      }
      return {
        ...p,
        count,
      };
    });
  }, [organizedFoods]);

  const filteredFoods = useMemo(() => {
    const q = foodSearchQuery.trim().toLowerCase();
    const matched = organizedFoods.filter((food) => {
      if (!matchesFoodScreenCategoryTab(food, selectedCategory)) return false;
      if (provinceFilter && !doesDishBelongToProvince(food, provinceFilter)) return false;
      if (!matchesTagFilter(food, tagFilter)) return false;
      if (q) {
        const hay = [
          food.nameKh,
          food.nameEn,
          food.descriptionKh,
          food.descriptionEn,
          food.categoryKh,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (selectedCategory === 'all') {
      return matched;
    }

    // Prioritize signature / non-vegetarian dishes of the selected category first in a deterministic order
    const getCategoryPriority = (f: FoodItem): number => {
      const kh = (f.nameKh || '').trim();
      const isVeg = Boolean(f.isVegetarian || /បួស|\bvegetarian\b|\bvegan\b/i.test(`${kh} ${f.nameEn || ''}`));
      const vegPenalty = isVeg ? 50 : 0;

      if (selectedCategory === 'samlor') {
        if (/^សម្លកកូរ|^អាម៉ុក|^សម្លការី|^សម្លម្ជូរ|^សម្លប្រហើរ/i.test(kh)) return 1 + vegPenalty;
        if (/^សម្ល|^ស្ងោរ|^ស៊ុប/i.test(kh)) return 2 + vegPenalty;
        return 3 + vegPenalty;
      }
      if (selectedCategory === 'cha') {
        if (f.categorySlug === 'grilled' && /(អាំង|ដុត|ចៀន|បំពង)/i.test(kh)) return 1 + vegPenalty;
        if (/(អាំង|ដុត)/i.test(kh)) return 2 + vegPenalty;
        if (/(ចៀន|បំពង)/i.test(kh)) return 3 + vegPenalty;
        return 4 + vegPenalty;
      }
      if (selectedCategory === 'bong_aem') {
        if (/^បង្អែម|^សង់ខ្យា|^ចេកខ្ទិះ|^លតអង្ករ|^ក្រឡាន|^បាយដំណើប/i.test(kh)) return 1 + vegPenalty;
        if (f.categorySlug === 'dessert' || f.categorySlug === 'cake') return 2 + vegPenalty;
        return 3 + vegPenalty;
      }
      return 5 + vegPenalty;
    };

    return [...matched].sort((a, b) => {
      const pa = getCategoryPriority(a);
      const pb = getCategoryPriority(b);
      if (pa !== pb) return pa - pb;
      if (Boolean(b.isFeatured) !== Boolean(a.isFeatured)) {
        return b.isFeatured ? 1 : -1;
      }
      return 0;
    });
  }, [organizedFoods, selectedCategory, provinceFilter, tagFilter, foodSearchQuery]);

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

  const renderCategoryIcon = (catId: string, sizeClass = 'w-3.5 h-3.5') => {
    switch (catId) {
      case 'all':
        // Fork and spoon with a food plate
        return (
          <svg
            className={`${sizeClass} text-white shrink-0`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Left Fork */}
            <path d="M3.5 3.5v4.5c0 1.1.8 2 1.8 2v10.5" />
            <path d="M3.5 6.5h3.6" />
            <path d="M7.1 3.5v4.5c0 1.1-.8 2-1.8 2" />
            {/* Center Plate */}
            <circle cx="12" cy="12.5" r="4.3" />
            <circle cx="12" cy="12.5" r="2.1" />
            {/* Right Spoon */}
            <path d="M18.8 3.5c1.2 0 2.1 1.3 2.1 2.9 0 1.6-.9 2.8-2.1 2.8s-2.1-1.2-2.1-2.8c0-1.6.9-2.9 2.1-2.9Z" />
            <path d="M18.8 9.2v11.3" />
          </svg>
        );
      case 'samlor':
        // Traditional Cambodian soup bowl with steam
        return (
          <svg
            className={`${sizeClass} text-white shrink-0`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Rising Steam Waves */}
            <path d="M8.5 8.2c0-1.3 1-2.1 1-3.4" />
            <path d="M12 7.5c0-1.3 1-2.1 1-3.4" />
            <path d="M15.5 8.2c0-1.3 1-2.1 1-3.4" />
            {/* Soup Bowl Rim & Body */}
            <path d="M3.5 11.5h17" />
            <path d="M4.5 11.5a7.5 7 0 0 0 15 0" />
            {/* Pedestal Foot */}
            <path d="M8.5 20h7" />
          </svg>
        );
      case 'cha':
        // Barbecue grill / sizzling frying pan with roast & heat waves
        return (
          <svg
            className={`${sizeClass} text-white shrink-0`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Sizzling Heat Waves */}
            <path d="M8 6.5c0-1.2.9-1.9.9-3" />
            <path d="M12 6c0-1.2.9-1.9.9-3" />
            <path d="M16 6.5c0-1.2.9-1.9.9-3" />
            {/* Grill / Frying Pan Grate & Body */}
            <path d="M3 11.5h14.5" />
            <path d="M4.5 11.5a6 5.5 0 0 0 11.5 0" />
            {/* Pan Handle */}
            <path d="M17.5 11.5h3.8" />
            {/* Grill Stand / Legs */}
            <path d="M7.5 16.6 6 20.5" />
            <path d="M13 16.6 14.5 20.5" />
            <path d="M5.5 19.5h9.5" />
          </svg>
        );
      default:
        // Dessert bowl & sweet beverage cup with straw
        return (
          <svg
            className={`${sizeClass} text-white shrink-0`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Drinking Straw */}
            <path d="M14.5 9.5 17 3.5h2.5" />
            {/* Sweet Dome Topping & Cherry */}
            <circle cx="11.5" cy="6.2" r="1.4" />
            <path d="M5.5 11.5c0-2.8 2.6-4.5 6-4.5s6 1.7 6 4.5" />
            {/* Dessert / Cup Rim & Base */}
            <path d="M4.5 11.5h14" />
            <path d="M6 11.5 7.4 19a1.8 1.8 0 0 0 1.8 1.5h4.6A1.8 1.8 0 0 0 15.6 19L17 11.5" />
          </svg>
        );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-[#1E293B] text-[#1E293B] min-h-full font-khmer pb-12">
      {/* 1. Header – Angkor Wat Hero Background */}
      <AngkorHeroTopHeader mode="food" foodCount={filteredFoods.length} />

      {/* Main Content Container rising smoothly from the Angkor Wat reflection */}
      <div className="relative z-20 -mt-[82px] px-2.5 min-[360px]:px-3.5 sm:px-5 space-y-2.5">
        {/* Compact Original Khmer Promotional Title Banner Directly Above the Food Search Bar (Transparent Background) */}
        <div className="flex justify-start pl-0.5 sm:pl-1">
          <div className="relative py-1 pl-1 pr-2 bg-transparent flex items-center gap-2.5">
            {/* Left Yellow Food Icon */}
            <div
              style={{
                background: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 100%)',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.26), inset 0 1px 1px rgba(255, 255, 255, 0.65)',
              }}
              className="relative z-10 w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
            >
              <svg
                className="w-4 h-4 text-[#042F2E]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                <path d="M7 2v20" />
                <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
              </svg>
            </div>

            {/* Thin Vertical Divider Line */}
            <span className="relative z-10 h-6 w-px bg-white/35 shrink-0" aria-hidden="true" />

            {/* Exact Original Khmer Title & Subtitle */}
            <div className="relative z-10 min-w-0">
              <h2
                className="font-khmer font-extrabold text-white leading-[1.65] py-0.5 break-words"
                style={{ fontSize: 'clamp(13.8px, 3.96vw, 16.2px)', textShadow: '0 1px 3px rgba(0, 0, 0, 0.65)' }}
              >
                {tr(language, 'មុខម្ហូបខ្មែរ ទាំងអស់', 'All Cambodian Dishes', '柬埔寨全部美食')}
              </h2>
              <p
                className="font-khmer font-bold text-[#FDE68A] leading-[1.62] py-0.5 break-words"
                style={{ fontSize: 'clamp(11px, 3.12vw, 13.2px)', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)' }}
              >
                {tr(language, 'រកឃើញរសជាតិដើមខ្មែរ គ្រប់ខេត្ត', 'Discover authentic Khmer flavors', '探索正宗高棉风味')}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Main Search Bar – Large White Rounded Glassmorphism Search Bar + Separate Green Filter Button */}
        <div className="flex items-center gap-1.5 min-[360px]:gap-2 min-w-0">
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 6px 20px rgba(15, 23, 42, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
            }}
            className="flex-1 min-w-0 h-[44px] rounded-full border-[1.5px] border-white pl-2.5 min-[360px]:pl-3.5 pr-1.5 flex items-center gap-1.5 min-[360px]:gap-2"
          >
            <Search className="w-4 h-4 min-[360px]:w-4.5 min-[360px]:h-4.5 text-slate-600 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              size={1}
              value={foodSearchQuery}
              onChange={(e) => setFoodSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleExecuteFoodSearch();
                }
              }}
              placeholder={tr(
                language,
                'ស្វែងរកម្ហូប...',
                'Search dishes...',
                '搜索高棉菜品...'
              )}
              className="w-full flex-1 min-w-0 bg-transparent text-[12px] min-[360px]:text-[13px] font-khmer font-bold text-[#1E293B] placeholder:text-slate-500 focus:outline-none"
            />
            {foodSearchQuery && (
              <button
                type="button"
                onClick={() => setFoodSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                aria-label="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleExecuteFoodSearch}
              style={{
                background: 'linear-gradient(180deg, #2E7D52 0%, #1B5E3A 100%)',
                boxShadow: '0 2px 6px rgba(27, 94, 58, 0.35)',
              }}
              className="h-[34px] px-2.5 min-[360px]:px-3.5 rounded-full border-[1.5px] border-white/90 text-white text-[11px] min-[360px]:text-[12px] font-khmer font-extrabold flex items-center gap-1 min-[360px]:gap-1.5 shrink-0 active:scale-95 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-white stroke-[2.4] shrink-0" />
              <span>{tr(language, 'ស្វែងរក', 'Search', '搜索')}</span>
            </button>
          </div>

          {/* Separate Circular Green Filter Icon Button */}
          <button
            type="button"
            onClick={() => setShowFilterDrawer((prev) => !prev)}
            style={{
              background: 'linear-gradient(180deg, #2E7D52 0%, #1B5E3A 100%)',
              boxShadow: '0 6px 16px rgba(15, 23, 42, 0.16)',
            }}
            className={`relative w-[44px] h-[44px] rounded-full border-[2px] border-white flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer text-white ${
              showFilterDrawer || provinceFilter || tagFilter !== 'all' ? 'ring-2 ring-[#22C55E]' : ''
            }`}
            title={tr(language, 'តម្រងមុខម្ហូប', 'Filter Dishes', '筛选菜品')}
          >
            <Filter className="w-4.5 h-4.5 stroke-[2.2]" />
            {(provinceFilter !== '' || tagFilter !== 'all') && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
            )}
          </button>
        </div>

        {/* 3. Four Premium PNG Category Buttons with Category Names Directly Below Each Image */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 8px 22px rgba(15, 23, 42, 0.08)',
          }}
          className="rounded-[24px] px-2.5 py-3 sm:px-3.5 sm:py-3.5 border border-white"
        >
          <div className="grid grid-cols-4 gap-2 min-[360px]:gap-2.5 sm:gap-3.5 items-start">
            {[
              {
                id: 'all',
                imageSrc: '/categories/food_cat_all.png',
                nameKh: 'គ្រប់មុខម្ហូប',
                nameEn: 'All Dishes',
                nameZh: '全部美食',
              },
              {
                id: 'samlor',
                imageSrc: '/categories/food_cat_samlor.png',
                nameKh: 'សម្ល',
                nameEn: 'Soups & Curries',
                nameZh: '高棉汤羹',
              },
              {
                id: 'cha',
                imageSrc: '/categories/food_cat_cha.png',
                nameKh: 'អាំង/ចៀន',
                nameEn: 'Grilled & Fried',
                nameZh: '烧烤/煎炸',
              },
              {
                id: 'bong_aem',
                imageSrc: '/categories/food_cat_dessert.png',
                nameKh: 'បង្អែម/ភេសជ្ជៈ',
                nameEn: 'Desserts & Drinks',
                nameZh: '甜品/饮品',
              },
            ].map((cat) => {
              const active = selectedCategory === cat.id;
              const label = tr(language, cat.nameKh, cat.nameEn, cat.nameZh);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  aria-pressed={active}
                  className="group flex flex-col items-center justify-start gap-1.5 w-full min-w-0 bg-transparent border-0 p-0 active:scale-95 transition-transform cursor-pointer select-none"
                >
                  <div className="w-full aspect-[560/460] bg-transparent flex items-center justify-center relative transition-opacity duration-150">
                    <img
                      src={cat.imageSrc}
                      alt={label}
                      className={`w-full h-full object-contain bg-transparent select-none pointer-events-none transition-all duration-150 ${
                        active
                          ? 'drop-shadow-[0_6px_14px_rgba(21,128,61,0.42)] brightness-[1.03]'
                          : 'drop-shadow-[0_4px_10px_rgba(15,23,42,0.15)] opacity-95 group-hover:opacity-100'
                      }`}
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <span
                    className={`font-khmer font-extrabold leading-[1.58] pt-0.5 px-0.5 text-center break-words whitespace-normal w-full transition-colors ${
                      active ? 'text-[#15803D]' : 'text-[#0F172A] group-hover:text-[#15803D]'
                    }`}
                    style={{ fontSize: 'clamp(11px, 3.05vw, 14.4px)' }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div ref={dishListStartRef} />

        {/* Collapsible Filter Drawer (Province + Dietary Tags + Admin Add Dish) */}
        {showFilterDrawer && (
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900">
                {tr(language, 'តម្រងមុខម្ហូបបន្ថែម', 'Advanced Dish Filters', '高级菜品筛选')}
              </span>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      (window as any).__kft_admin_tab = 'foods';
                      setIsAdminOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{tr(language, 'បន្ថែមម្ហូប', 'Add Dish', '添加菜品')}</span>
                  </button>
                )}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="text-[11px] font-extrabold text-rose-600 hover:underline cursor-pointer"
                  >
                    {tr(language, 'សម្អាតតម្រង', 'Reset All', '重置筛选')}
                  </button>
                )}
              </div>
            </div>

            {/* VIP Dietary / Special Tags */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">
                  {tr(language, 'ម្ហូបពិសេស និងសុខភាព៖', 'Special & Healthy:', '特色与健康：')}
                </span>
                {!canUseVip && (
                  <button
                    type="button"
                    onClick={() => openUpgradeVipModal()}
                    className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 cursor-pointer"
                  >
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span>VIP</span>
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap pb-0.5">
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

        {/* 6. Food Listing Cards */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
            {displayedFoods.map((food) => (
              <FoodCard key={food.id} food={food} />
            ))}

            {visibleCount < filteredFoods.length && (
              <div ref={loadMoreTriggerRef} className="col-span-full pt-2 flex justify-center">
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
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { AngkorHeroTopHeader } from './AngkorHeroTopHeader';
import {
  FoodItem,
  organizeAndDeduplicateFoods,
  resolveFoodPhotoUrl,
} from '../types';
import { Utensils, Crown, MapPin, Plus, Search, Filter, X } from 'lucide-react';
import { DISH_PROVINCES, detectDishProvince } from '../utils/foodFilters';
import { TAG_FILTERS, matchesTagFilter, TagFilterId, DishTagId } from '../utils/dishTags';
import { TAG_FILTER_EVENT, consumePendingTagFilter, hasSpecialAndHealthyFoodVipAccess } from '../utils/smartHub';
import { tr } from '../utils/i18n';
import { DishTagIcon } from './icons/HandcraftedIcons';
import {
  matchesFoodScreenCategoryTab,
  scoreCambodianDishForCategoryAndMealTime,
} from '../utils/cambodianMealHabits';

const PAGE_BATCH_SIZE = 20;

type MealTimeFilter = 'all' | 'breakfast' | 'lunch' | 'dinner';

export const FoodView: React.FC = () => {
  const {
    foods,
    language,
    currentUser,
    openUpgradeVipModal,
    showToast,
    setIsAdminOpen,
    setActiveTab,
    setIsDailyDiscoveriesModalOpen,
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

  const matchesSelectedFoodCategory = (f: FoodItem, catId: string): boolean => {
    return matchesFoodScreenCategoryTab(f, catId);
  };

  const pickCategoryThumbForMealTime = (catId: string, fallbackThumb: string): string => {
    if (mealTimeFilter === 'all') return fallbackThumb;
    const candidates = organizedFoods
      .filter((f) => f.photoUrl && matchesFoodScreenCategoryTab(f, catId))
      .map((f) => ({
        food: f,
        score: scoreCambodianDishForCategoryAndMealTime(f, mealTimeFilter),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || (b.food.rating || 0) - (a.food.rating || 0));

    const best = candidates[0]?.food;
    if (!best || !best.photoUrl) return fallbackThumb;
    return resolveFoodPhotoUrl(best.photoUrl, best.photoUpdatedAt, 320, best.id) || fallbackThumb;
  };

  // 4 Full-Image Food Category Cards:
  // 1. មុខម្ហូប (All Dishes)
  // 2. សម្ល (Soups & Stews)
  // 3. អាំង/ចៀន (Grill/Fry & Noodles)
  // 4. បង្អែម/ភេសជ្ជៈ (Desserts & Drinks)
  const categories = useMemo(
    () => [
      {
        id: 'all',
        nameKh: 'មុខម្ហូប',
        nameEn: 'All Dishes',
        nameZh: '全部美食',
        thumb: pickCategoryThumbForMealTime('all', '/foods/food-1.jpg'),
        overlayBg: 'linear-gradient(180deg, rgba(22, 101, 52, 0.88) 0%, rgba(6, 78, 59, 0.96) 100%)',
      },
      {
        id: 'samlor',
        nameKh: 'សម្ល',
        nameEn: 'Soups & Stews',
        nameZh: '高棉汤羹',
        thumb: pickCategoryThumbForMealTime('samlor', '/foods/food-2.jpg'),
        overlayBg: 'linear-gradient(180deg, rgba(180, 83, 9, 0.88) 0%, rgba(120, 53, 15, 0.96) 100%)',
      },
      {
        id: 'cha',
        nameKh: 'អាំង/ចៀន',
        nameEn: 'Grill/Fry',
        nameZh: '烧烤/热炒',
        thumb: pickCategoryThumbForMealTime('cha', '/foods/food-21.jpg'),
        overlayBg: 'linear-gradient(180deg, rgba(185, 28, 28, 0.88) 0%, rgba(127, 29, 29, 0.96) 100%)',
      },
      {
        id: 'bong_aem',
        nameKh: 'បង្អែម/ភេសជ្ជៈ',
        nameEn: 'Desserts & Drinks',
        nameZh: '甜品/饮品',
        thumb: pickCategoryThumbForMealTime('bong_aem', '/foods/food-48.jpg'),
        overlayBg: 'linear-gradient(180deg, rgba(109, 40, 217, 0.88) 0%, rgba(76, 29, 149, 0.96) 100%)',
      },
    ],
    [organizedFoods, mealTimeFilter]
  );

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
    const matched = organizedFoods.filter((food) => {
      if (!matchesSelectedFoodCategory(food, selectedCategory)) return false;
      if (mealTimeFilter !== 'all') {
        const mealScore = scoreCambodianDishForCategoryAndMealTime(food, mealTimeFilter);
        if (mealScore <= 0) return false;
      }
      if (provinceFilter && detectDishProvince(food) !== provinceFilter) return false;
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

    if (mealTimeFilter === 'all') {
      return matched;
    }

    return [...matched].sort((a, b) => {
      const scoreDiff =
        scoreCambodianDishForCategoryAndMealTime(b, mealTimeFilter) -
        scoreCambodianDishForCategoryAndMealTime(a, mealTimeFilter);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [organizedFoods, selectedCategory, mealTimeFilter, provinceFilter, tagFilter, foodSearchQuery]);

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

  const renderCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'all':
        return (
          <svg
            className="w-3.5 h-3.5 text-white shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
            <path d="M7 2v20" />
            <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
          </svg>
        );
      case 'samlor':
        return (
          <svg
            className="w-3.5 h-3.5 text-white shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12h16a1 1 0 0 1 1 1v.5a7.5 7.5 0 0 1-15 0V13a1 1 0 0 1 1-1Z" />
            <path d="M7 20.5h10" />
            <path d="M9.5 8.5c0-1.4.9-2.2.9-3.5" />
            <path d="M14.5 8.5c0-1.4.9-2.2.9-3.5" />
          </svg>
        );
      case 'cha':
        return (
          <svg
            className="w-3.5 h-3.5 text-white shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 7V4" />
            <path d="M4 17a8 8 0 0 1 16 0" />
            <path d="M2 17h20" />
            <path d="M5 20h14" />
          </svg>
        );
      default:
        return (
          <svg
            className="w-3.5 h-3.5 text-white shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 13h10l-1.2 7H8.2L7 13Z" />
            <path d="M6 13c0-2.5 2-4.5 6-4.5s6 2 6 4.5" />
            <path d="M12 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
          </svg>
        );
    }
  };

  return (
    <div className="max-w-md mx-auto bg-[#F8FAFC] text-[#1E293B] min-h-full font-khmer pb-8">
      {/* 1. Header – Angkor Wat Hero Background with Smooth Cyan-to-White Fade */}
      <AngkorHeroTopHeader mode="food" foodCount={filteredFoods.length} />

      {/* Main Content Container rising smoothly from the Angkor Wat reflection */}
      <div className="relative z-20 -mt-12 px-3.5 space-y-3">
        {/* 2. Main Search Bar – Large White Rounded Glassmorphism Search Bar + Separate Green Filter Button */}
        <div className="flex items-center gap-2">
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 6px 20px rgba(15, 23, 42, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
            }}
            className="flex-1 h-[44px] rounded-full border-[1.5px] border-white pl-3.5 pr-1.5 flex items-center gap-2"
          >
            <Search className="w-4.5 h-4.5 text-slate-600 shrink-0" />
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
              placeholder={tr(
                language,
                'ស្វែងរកម្ហូប...',
                'Search dishes...',
                '搜索高棉菜品...'
              )}
              className="flex-1 min-w-0 bg-transparent text-[13px] font-khmer font-bold text-[#1E293B] placeholder:text-slate-500 focus:outline-none"
            />
            {foodSearchQuery && (
              <button
                type="button"
                onClick={() => setFoodSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
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
              className="h-[34px] px-3.5 rounded-full border-[1.5px] border-white/90 text-white text-[12px] font-khmer font-extrabold flex items-center gap-1.5 shrink-0 active:scale-95 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-white stroke-[2.4]" />
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

        {/* 3. Main Shortcut Menu – Four Large Colorful Rounded-Square Cards in a Soft White Container */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 8px 22px rgba(15, 23, 42, 0.08)',
          }}
          className="rounded-[24px] p-2.5 sm:p-3 border border-white"
        >
          <div className="grid grid-cols-4 gap-2.5">
            {/* 1. Food (ម្ហូបខ្មែរ) – Orange */}
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                dishListStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
              style={{
                background: 'linear-gradient(180deg, #FBBF24 0%, #F59E0B 48%, #D97706 100%)',
                boxShadow: '0 6px 14px rgba(217, 119, 6, 0.32), inset 0 1.5px 1px rgba(255, 255, 255, 0.65)',
              }}
              className="relative h-[78px] sm:h-[84px] rounded-[20px] flex flex-col items-center justify-center gap-1.5 text-white overflow-hidden active:scale-95 transition cursor-pointer border border-amber-200/70"
            >
              <span
                className="pointer-events-none absolute -top-4 -left-4 w-14 h-12 rounded-full opacity-45"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
                }}
              />
              <svg
                className="w-7 h-7 text-white drop-shadow-xs"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                <path d="M7 2v20" />
                <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
              </svg>
              <span
                className="font-khmer font-extrabold text-[11.5px] sm:text-[12px] leading-tight tracking-tight"
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)' }}
              >
                {tr(language, 'ម្ហូបខ្មែរ', 'Khmer Food', '高棉美食')}
              </span>
            </button>

            {/* 2. Hotel (សណ្ឋាគារ) – Blue */}
            <button
              type="button"
              onClick={() => setActiveTab('hotels')}
              style={{
                background: 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 48%, #1D4ED8 100%)',
                boxShadow: '0 6px 14px rgba(29, 78, 216, 0.32), inset 0 1.5px 1px rgba(255, 255, 255, 0.65)',
              }}
              className="relative h-[78px] sm:h-[84px] rounded-[20px] flex flex-col items-center justify-center gap-1.5 text-white overflow-hidden active:scale-95 transition cursor-pointer border border-blue-200/70"
            >
              <span
                className="pointer-events-none absolute -top-4 -left-4 w-14 h-12 rounded-full opacity-45"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
                }}
              />
              <svg
                className="w-7 h-7 text-white drop-shadow-xs"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7v11" />
                <path d="M21 18v-7a3 3 0 0 0-3-3H8v7" />
                <path d="M3 15h18" />
                <circle cx="6" cy="11" r="1.5" fill="currentColor" />
              </svg>
              <span
                className="font-khmer font-extrabold text-[11.5px] sm:text-[12px] leading-tight tracking-tight"
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)' }}
              >
                {tr(language, 'សណ្ឋាគារ', 'Hotels', '酒店住宿')}
              </span>
            </button>

            {/* 3. Tourism (ទេសចរណ៍) – Green */}
            <button
              type="button"
              onClick={() => setActiveTab('tourism')}
              style={{
                background: 'linear-gradient(180deg, #4ADE80 0%, #22C55E 48%, #15803D 100%)',
                boxShadow: '0 6px 14px rgba(21, 128, 61, 0.32), inset 0 1.5px 1px rgba(255, 255, 255, 0.65)',
              }}
              className="relative h-[78px] sm:h-[84px] rounded-[20px] flex flex-col items-center justify-center gap-1.5 text-white overflow-hidden active:scale-95 transition cursor-pointer border border-emerald-200/70"
            >
              <span
                className="pointer-events-none absolute -top-4 -left-4 w-14 h-12 rounded-full opacity-45"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
                }}
              />
              <svg
                className="w-7 h-7 text-white drop-shadow-xs"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
              </svg>
              <span
                className="font-khmer font-extrabold text-[11.5px] sm:text-[12px] leading-tight tracking-tight"
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)' }}
              >
                {tr(language, 'ទេសចរណ៍', 'Tourism', '旅游景点')}
              </span>
            </button>

            {/* 4. Attractions / Experiences (បទពិសោធន៍) – Purple */}
            <button
              type="button"
              onClick={() => {
                (window as any).__kft_daily_initial_category = 'food';
                setIsDailyDiscoveriesModalOpen(true);
              }}
              style={{
                background: 'linear-gradient(180deg, #C084FC 0%, #9333EA 48%, #6B21A8 100%)',
                boxShadow: '0 6px 14px rgba(107, 33, 168, 0.32), inset 0 1.5px 1px rgba(255, 255, 255, 0.65)',
              }}
              className="relative h-[78px] sm:h-[84px] rounded-[20px] flex flex-col items-center justify-center gap-1.5 text-white overflow-hidden active:scale-95 transition cursor-pointer border border-purple-200/70"
            >
              <span
                className="pointer-events-none absolute -top-4 -left-4 w-14 h-12 rounded-full opacity-45"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
                }}
              />
              {/* White Lotus Icon */}
              <svg
                className="w-7 h-7 text-white drop-shadow-xs"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 3.5c-1.8 2.6-2.8 5.4-2.8 8.2 0 2.2 1.2 4.1 2.8 5.3 1.6-1.2 2.8-3.1 2.8-5.3 0-2.8-1-5.6-2.8-8.2Z" />
                <path d="M7.2 6.8c-1.8 1.9-2.7 4.4-2.3 6.9.3 1.8 1.7 3.3 3.7 3.9-.8-1.5-1.2-3.2-1.2-5 0-2.1.4-4 1.2-5.8-.5 0-.9 0-1.4 0Z" />
                <path d="M16.8 6.8c-.5 0-.9 0-1.4 0 .8 1.8 1.2 3.7 1.2 5.8 0 1.8-.4 3.5-1.2 5 2-.6 3.4-2.1 3.7-3.9.4-2.5-.5-5-2.3-6.9Z" />
                <path d="M3.2 11.5c-.2 2.2.8 4.3 2.8 5.5 1.3.8 2.9 1.1 4.5 1.1-1.9-.9-3.4-2.4-4.2-4.2-.5-1.1-.8-2.2-.8-3.4-.8.2-1.6.5-2.3 1Z" />
                <path d="M20.8 11.5c-.7-.5-1.5-.8-2.3-1 0 1.2-.3 2.3-.8 3.4-.8 1.8-2.3 3.3-4.2 4.2 1.6 0 3.2-.3 4.5-1.1 2-1.2 3-3.3 2.8-5.5Z" />
              </svg>
              <span
                className="font-khmer font-extrabold text-[11.5px] sm:text-[12px] leading-tight tracking-tight"
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)' }}
              >
                {tr(language, 'បទពិសោធន៍', 'Experiences', '精选体验')}
              </span>
            </button>
          </div>
        </div>

        {/* 4. Food Category Menu – Four Full-Image Cards with Translucent Bottom Overlay */}
        <div className="grid grid-cols-4 gap-2">
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  boxShadow: active
                    ? '0 6px 16px rgba(34, 197, 94, 0.34), 0 0 0 1px rgba(34, 197, 94, 0.45)'
                    : '0 4px 12px rgba(15, 23, 42, 0.08)',
                }}
                className={`group relative h-[86px] sm:h-[94px] rounded-[18px] overflow-hidden transition active:scale-95 cursor-pointer border-[2.5px] ${
                  active
                    ? 'border-[#22C55E]'
                    : 'border-white hover:border-[#22C55E]/60'
                }`}
              >
                {/* Full-Bleed Food Photography Covering the Card */}
                <img
                  src={cat.thumb}
                  alt={cat.nameKh}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />

                {/* Arched Dark Translucent Gradient Overlay at the Bottom with White Icon & Khmer Label */}
                <div
                  style={{
                    background: cat.overlayBg,
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                  }}
                  className="absolute inset-x-0 bottom-0 pt-2 pb-1.5 px-1 rounded-t-[46%] border-t border-white/45 flex items-center justify-center gap-1 text-white"
                >
                  {renderCategoryIcon(cat.id)}
                  <span
                    style={{
                      fontSize: cat.id === 'bong_aem' ? '9.5px' : '10.5px',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                    }}
                    className="font-khmer font-extrabold leading-tight truncate text-white"
                  >
                    {tr(language, cat.nameKh, cat.nameEn, cat.nameZh)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 5. Time Filter Menu – Four Pill-Shaped Buttons in One Row: ទីតាំង | ពេលព្រឹក | ពេលថ្ងៃ | ពេលល្ងាច */}
        <div className="flex items-center gap-1.5">
          {/* Pill 1: ទីតាំង (Location / All Time) */}
          <button
            type="button"
            onClick={() => {
              if (mealTimeFilter !== 'all') {
                setMealTimeFilter('all');
              } else {
                setShowFilterDrawer((prev) => !prev);
              }
            }}
            style={
              mealTimeFilter === 'all' || provinceFilter !== ''
                ? {
                    background: 'linear-gradient(180deg, #2E7D52 0%, #1B5E3A 100%)',
                    boxShadow: '0 4px 10px rgba(27, 94, 58, 0.25)',
                  }
                : {
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                  }
            }
            className={`h-[36px] px-3 rounded-full text-[11.5px] font-khmer font-extrabold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shrink-0 border ${
              mealTimeFilter === 'all' || provinceFilter !== ''
                ? 'border-[#1B5E3A] text-white'
                : 'bg-white border-slate-200/90 text-[#1E293B]'
            }`}
          >
            <MapPin
              className={`w-3.5 h-3.5 shrink-0 ${
                mealTimeFilter === 'all' || provinceFilter !== '' ? 'text-white' : 'text-[#1B5E3A]'
              }`}
            />
            <span>{tr(language, 'ទីតាំង', 'Location', '位置')}</span>
          </button>

          {/* Subtle Vertical Divider */}
          <span className="h-4 w-px bg-slate-300 shrink-0" aria-hidden="true" />

          {/* Pills 2, 3, 4: ពេលព្រឹក | ពេលថ្ងៃ | ពេលល្ងាច */}
          <div className="flex-1 grid grid-cols-3 gap-1.5">
            {[
              {
                id: 'breakfast' as MealTimeFilter,
                labelKh: 'ពេលព្រឹក',
                labelEn: 'Morning',
                labelZh: '早餐',
                renderIcon: (active: boolean) => (
                  <svg
                    className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-[#1B5E3A]'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
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
                    className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-[#15803D]'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="m4.93 4.93 1.41 1.41" />
                    <path d="m17.66 17.66 1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="m6.34 17.66-1.41 1.41" />
                    <path d="m19.07 4.93-1.41 1.41" />
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
                    className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-[#1E293B]'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                  </svg>
                ),
              },
            ].map((slot) => {
              const active = mealTimeFilter === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setMealTimeFilter(active ? 'all' : slot.id)}
                  style={
                    active
                      ? {
                          background: 'linear-gradient(180deg, #2E7D52 0%, #1B5E3A 100%)',
                          boxShadow: '0 4px 10px rgba(27, 94, 58, 0.25)',
                        }
                      : {
                          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                        }
                  }
                  className={`h-[36px] px-2 rounded-full text-[11px] font-khmer font-extrabold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer border ${
                    active
                      ? 'border-[#1B5E3A] text-white'
                      : 'bg-white border-slate-200/90 text-[#1E293B] hover:border-[#22C55E]/60'
                  }`}
                >
                  {slot.renderIcon(active)}
                  <span className="truncate">{tr(language, slot.labelKh, slot.labelEn, slot.labelZh)}</span>
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
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
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
  );
};

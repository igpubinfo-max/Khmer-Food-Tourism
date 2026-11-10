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
    setSelectedFood,
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

  // 4 Full-Image Food Category Cards:
  // 1. គ្រប់មុខម្ហូប (All Dishes)
  // 2. សម្ល (Soups & Curries)
  // 3. អាំង/ចៀន (Grilled & Fried)
  // 4. បង្អែម/ភេសជ្ជៈ (Desserts & Beverages)
  const categories = useMemo(
    () => [
      {
        id: 'all',
        nameKh: 'គ្រប់មុខម្ហូប',
        nameEn: 'All Dishes',
        nameZh: '全部美食',
        thumb: '/foods/food-1.jpg',
        overlayBg: 'linear-gradient(180deg, rgba(22, 101, 52, 0.88) 0%, rgba(6, 78, 59, 0.96) 100%)',
      },
      {
        id: 'samlor',
        nameKh: 'សម្ល',
        nameEn: 'Soups & Curries',
        nameZh: '高棉汤羹',
        thumb: '/foods/food-2.jpg',
        overlayBg: 'linear-gradient(180deg, rgba(180, 83, 9, 0.88) 0%, rgba(120, 53, 15, 0.96) 100%)',
      },
      {
        id: 'cha',
        nameKh: 'អាំង/ចៀន',
        nameEn: 'Grilled & Fried',
        nameZh: '烧烤/煎炸',
        thumb: '/foods/food-21.jpg',
        overlayBg: 'linear-gradient(180deg, rgba(185, 28, 28, 0.88) 0%, rgba(127, 29, 29, 0.96) 100%)',
      },
      {
        id: 'bong_aem',
        nameKh: 'បង្អែម/ភេសជ្ជៈ',
        nameEn: 'Desserts & Drinks',
        nameZh: '甜品/饮品',
        thumb: '/foods/food-48.jpg',
        overlayBg: 'linear-gradient(180deg, rgba(109, 40, 217, 0.88) 0%, rgba(76, 29, 149, 0.96) 100%)',
      },
    ],
    []
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
      if (!matchesFoodScreenCategoryTab(food, selectedCategory)) return false;
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

  // Top 4 showcase cards below the 4 colored buttons:
  // When 'all' is selected, show the 4 category showcase cards.
  // When a specific category ('samlor', 'cha', 'bong_aem') is selected, immediately show the top 4 matching dishes from that category!
  const activeOverlayBg = useMemo(() => {
    const found = categories.find((c) => c.id === selectedCategory);
    return found?.overlayBg || 'linear-gradient(180deg, rgba(22, 101, 52, 0.88) 0%, rgba(6, 78, 59, 0.96) 100%)';
  }, [categories, selectedCategory]);

  const showcaseDishesForSelectedCategory = useMemo(() => {
    if (selectedCategory === 'all') return [];
    return filteredFoods.slice(0, 4);
  }, [selectedCategory, filteredFoods]);

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
    <div className="max-w-md mx-auto bg-[#F8FAFC] text-[#1E293B] min-h-full font-khmer pb-8">
      {/* 1. Header – Angkor Wat Hero Background */}
      <AngkorHeroTopHeader mode="food" foodCount={filteredFoods.length} />

      {/* Main Content Container rising smoothly from the Angkor Wat reflection */}
      <div className="relative z-20 -mt-[82px] px-3.5 space-y-2.5">
        {/* Compact Original Khmer Promotional Title Banner Directly Above the Food Search Bar */}
        <div className="flex justify-center">
          <div
            style={{
              background: 'linear-gradient(92deg, #043F2E 0%, #065F46 52%, #044E3A 100%)',
              boxShadow:
                '0 0 0 1px rgba(254, 243, 199, 0.55), 0 5px 14px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
            }}
            className="relative w-full max-w-[336px] py-1 pl-2 pr-3 rounded-[14px] border border-[#F5C542]/85 flex items-center gap-2 overflow-hidden"
          >
            {/* Subtle decorative green hills & gold Angkor Wat silhouette on the right */}
            <svg
              className="pointer-events-none absolute right-0 bottom-0 h-full w-28 opacity-85"
              viewBox="0 0 160 56"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M18 56C46 38 82 34 160 42V56H18Z" fill="rgba(16, 185, 129, 0.16)" />
              <path d="M52 56C78 44 114 40 160 47V56H52Z" fill="rgba(5, 150, 105, 0.24)" />
              <g fill="#F5C542" fillOpacity="0.34" transform="translate(88, 10)">
                <rect x="4" y="34" width="52" height="3" rx="1" />
                <rect x="8" y="30" width="44" height="4" rx="1" />
                <path d="M30 4 L34 14 L35 30 L25 30 L26 14 Z" />
                <path d="M19 11 L22 18 L23 30 L15 30 L16 18 Z" />
                <path d="M41 11 L44 18 L45 30 L37 30 L38 18 Z" />
                <path d="M10 18 L12.5 23 L13 30 L7 30 L7.5 23 Z" />
                <path d="M50 18 L52.5 23 L53 30 L47 30 L47.5 23 Z" />
              </g>
            </svg>

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

            {/* Subtle Vertical Divider */}
            <span className="relative z-10 h-5 w-px bg-white/25 shrink-0" aria-hidden="true" />

            {/* Exact Original Khmer Title & Subtitle */}
            <div className="relative z-10 min-w-0 flex-1">
              <h2
                className="font-khmer font-extrabold text-white leading-tight truncate"
                style={{ fontSize: '12.5px', textShadow: '0 1px 3px rgba(0, 0, 0, 0.55)' }}
              >
                {tr(language, 'មុខម្ហូបខ្មែរ ទាំងអស់', 'All Cambodian Dishes', '柬埔寨全部美食')}
              </h2>
              <p
                className="font-khmer font-bold text-[#FDE68A] leading-tight truncate mt-0.5"
                style={{ fontSize: '9.5px', textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}
              >
                {tr(language, 'រកឃើញរសជាតិដើមខ្មែរ គ្រប់ខេត្ត', 'Discover authentic Khmer flavors', '探索正宗高棉风味')}
              </p>
            </div>
          </div>
        </div>

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

        {/* 3. Four Colored Category Filter Buttons in a Soft White Container */}
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
            {/* 1. គ្រប់មុខម្ហូប (All Dishes) – Yellow/Orange */}
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              aria-pressed={selectedCategory === 'all'}
              style={{
                background: 'linear-gradient(180deg, #FBBF24 0%, #F59E0B 48%, #D97706 100%)',
                boxShadow:
                  selectedCategory === 'all'
                    ? '0 8px 18px rgba(217, 119, 6, 0.45), 0 0 0 2.5px #22C55E, inset 0 1.5px 1px rgba(255, 255, 255, 0.8)'
                    : '0 6px 14px rgba(217, 119, 6, 0.32), inset 0 1.5px 1px rgba(255, 255, 255, 0.65)',
              }}
              className={`relative h-[78px] sm:h-[84px] rounded-[20px] flex flex-col items-center justify-center gap-1.5 text-white overflow-hidden active:scale-95 transition cursor-pointer border ${
                selectedCategory === 'all' ? 'border-white' : 'border-amber-200/70 opacity-95 hover:opacity-100'
              }`}
            >
              <span
                className="pointer-events-none absolute -top-4 -left-4 w-14 h-12 rounded-full opacity-45"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
                }}
              />
              {renderCategoryIcon('all', 'w-7 h-7 drop-shadow-xs')}
              <span
                className="font-khmer font-extrabold text-[10.5px] sm:text-[11.5px] leading-tight tracking-tight px-1 truncate max-w-full"
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)' }}
              >
                {tr(language, 'គ្រប់មុខម្ហូប', 'All Dishes', '全部美食')}
              </span>
            </button>

            {/* 2. សម្ល (Cambodian Soups & Curries) – Blue */}
            <button
              type="button"
              onClick={() => setSelectedCategory('samlor')}
              aria-pressed={selectedCategory === 'samlor'}
              style={{
                background: 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 48%, #1D4ED8 100%)',
                boxShadow:
                  selectedCategory === 'samlor'
                    ? '0 8px 18px rgba(29, 78, 216, 0.45), 0 0 0 2.5px #22C55E, inset 0 1.5px 1px rgba(255, 255, 255, 0.8)'
                    : '0 6px 14px rgba(29, 78, 216, 0.32), inset 0 1.5px 1px rgba(255, 255, 255, 0.65)',
              }}
              className={`relative h-[78px] sm:h-[84px] rounded-[20px] flex flex-col items-center justify-center gap-1.5 text-white overflow-hidden active:scale-95 transition cursor-pointer border ${
                selectedCategory === 'samlor' ? 'border-white' : 'border-blue-200/70 opacity-95 hover:opacity-100'
              }`}
            >
              <span
                className="pointer-events-none absolute -top-4 -left-4 w-14 h-12 rounded-full opacity-45"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
                }}
              />
              {renderCategoryIcon('samlor', 'w-7 h-7 drop-shadow-xs')}
              <span
                className="font-khmer font-extrabold text-[11.5px] sm:text-[12px] leading-tight tracking-tight px-1 truncate max-w-full"
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)' }}
              >
                {tr(language, 'សម្ល', 'Soups & Curries', '高棉汤羹')}
              </span>
            </button>

            {/* 3. អាំង/ចៀន (Grilled & Fried Food) – Green */}
            <button
              type="button"
              onClick={() => setSelectedCategory('cha')}
              aria-pressed={selectedCategory === 'cha'}
              style={{
                background: 'linear-gradient(180deg, #4ADE80 0%, #22C55E 48%, #15803D 100%)',
                boxShadow:
                  selectedCategory === 'cha'
                    ? '0 8px 18px rgba(21, 128, 61, 0.45), 0 0 0 2.5px #F59E0B, inset 0 1.5px 1px rgba(255, 255, 255, 0.8)'
                    : '0 6px 14px rgba(21, 128, 61, 0.32), inset 0 1.5px 1px rgba(255, 255, 255, 0.65)',
              }}
              className={`relative h-[78px] sm:h-[84px] rounded-[20px] flex flex-col items-center justify-center gap-1.5 text-white overflow-hidden active:scale-95 transition cursor-pointer border ${
                selectedCategory === 'cha' ? 'border-white' : 'border-emerald-200/70 opacity-95 hover:opacity-100'
              }`}
            >
              <span
                className="pointer-events-none absolute -top-4 -left-4 w-14 h-12 rounded-full opacity-45"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
                }}
              />
              {renderCategoryIcon('cha', 'w-7 h-7 drop-shadow-xs')}
              <span
                className="font-khmer font-extrabold text-[11px] sm:text-[11.5px] leading-tight tracking-tight px-1 truncate max-w-full"
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)' }}
              >
                {tr(language, 'អាំង/ចៀន', 'Grilled & Fried', '烧烤/煎炸')}
              </span>
            </button>

            {/* 4. បង្អែម/ភេសជ្ជៈ (Desserts & Beverages) – Purple */}
            <button
              type="button"
              onClick={() => setSelectedCategory('bong_aem')}
              aria-pressed={selectedCategory === 'bong_aem'}
              style={{
                background: 'linear-gradient(180deg, #C084FC 0%, #9333EA 48%, #6B21A8 100%)',
                boxShadow:
                  selectedCategory === 'bong_aem'
                    ? '0 8px 18px rgba(107, 33, 168, 0.45), 0 0 0 2.5px #22C55E, inset 0 1.5px 1px rgba(255, 255, 255, 0.8)'
                    : '0 6px 14px rgba(107, 33, 168, 0.32), inset 0 1.5px 1px rgba(255, 255, 255, 0.65)',
              }}
              className={`relative h-[78px] sm:h-[84px] rounded-[20px] flex flex-col items-center justify-center gap-1.5 text-white overflow-hidden active:scale-95 transition cursor-pointer border ${
                selectedCategory === 'bong_aem' ? 'border-white' : 'border-purple-200/70 opacity-95 hover:opacity-100'
              }`}
            >
              <span
                className="pointer-events-none absolute -top-4 -left-4 w-14 h-12 rounded-full opacity-45"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
                }}
              />
              {renderCategoryIcon('bong_aem', 'w-7 h-7 drop-shadow-xs')}
              <span
                className="font-khmer font-extrabold text-[10px] sm:text-[11px] leading-tight tracking-tight px-1 truncate max-w-full"
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)' }}
              >
                {tr(language, 'បង្អែម/ភេសជ្ជៈ', 'Desserts & Drinks', '甜品/饮品')}
              </span>
            </button>
          </div>
        </div>

        {/* 4. Four Full-Image Cards Row – Shows 4 Categories in 'all' mode, or Top 4 Matching Dishes when a category is selected */}
        <div className="grid grid-cols-4 gap-2">
          {selectedCategory === 'all'
            ? categories.map((cat) => {
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
                    <img
                      src={cat.thumb}
                      alt={cat.nameKh}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
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
                          fontSize: cat.id === 'bong_aem' || cat.id === 'all' ? '9.5px' : '10.5px',
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                        }}
                        className="font-khmer font-extrabold leading-tight truncate text-white"
                      >
                        {tr(language, cat.nameKh, cat.nameEn, cat.nameZh)}
                      </span>
                    </div>
                  </button>
                );
              })
            : showcaseDishesForSelectedCategory.map((dish) => {
                const thumbUrl = resolveFoodPhotoUrl(dish.photoUrl, dish.photoUpdatedAt, 320, dish.id);
                return (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => setSelectedFood(dish)}
                    style={{
                      boxShadow: '0 5px 14px rgba(15, 23, 42, 0.1)',
                    }}
                    className="group relative h-[86px] sm:h-[94px] rounded-[18px] overflow-hidden transition active:scale-95 cursor-pointer border-[2px] border-[#22C55E]/85 hover:border-[#22C55E]"
                  >
                    <img
                      src={thumbUrl}
                      alt={dish.nameKh}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div
                      style={{
                        background: activeOverlayBg,
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                      }}
                      className="absolute inset-x-0 bottom-0 pt-2 pb-1.5 px-1.5 rounded-t-[42%] border-t border-white/45 flex items-center justify-center gap-1 text-white"
                    >
                      {renderCategoryIcon(selectedCategory, 'w-3 h-3')}
                      <span
                        style={{
                          fontSize: '9.5px',
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.55)',
                        }}
                        className="font-khmer font-extrabold leading-tight truncate text-white"
                      >
                        {tr(language, dish.nameKh, dish.nameEn, dish.nameZh || dish.nameEn)}
                      </span>
                    </div>
                  </button>
                );
              })}
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

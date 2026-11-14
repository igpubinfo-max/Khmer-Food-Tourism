import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { AngkorHeroTopHeader } from './AngkorHeroTopHeader';
import {
  FoodItem,
  organizeAndDeduplicateFoods,
} from '../types';
import { Utensils, Crown, MapPin, Plus, Search, Filter, X , Flame } from 'lucide-react';
import {
  DISH_PROVINCES,
  doesDishBelongToProvince,
  resolvePresetCravingChipId,
  matchesPresetCravingChip,
} from '../utils/foodFilters';
import { TAG_FILTERS, matchesTagFilter, TagFilterId, DishTagId } from '../utils/dishTags';
import { TAG_FILTER_EVENT, consumePendingTagFilter, hasSpecialAndHealthyFoodVipAccess } from '../utils/smartHub';
import { tr } from '../utils/i18n';
import { DishTagIcon } from './icons/HandcraftedIcons';
import { matchesFoodScreenCategoryTab } from '../utils/cambodianMealHabits';
import { smoothScrollToElement } from '../utils/smoothScroll';
import { searchKhmerFoods, normalizeKhmerFoodText } from '../utils/khmerFoodSearch';
import { parseSmartSearchIntent } from '../utils/aiSearchBridge';

const PAGE_BATCH_SIZE = 16;

type MealTimeFilter = 'all' | 'breakfast' | 'lunch' | 'dinner';

export const FoodView: React.FC = () => {
  const {
    foods,
    language,
    currentUser,
    openUpgradeVipModal,
    setIsAdminOpen,
    pushNavigationStep,
    registerModalBackHandler,
    isRestoringHistoryRef,
  } = useApp();
  const isAdmin = Boolean(
    currentUser?.role === 'admin' ||
      currentUser?.id === 'admin-authorized-single' ||
      currentUser?.username === 'admin' ||
      currentUser?.username === 'cheasavuth'
  );
  const canUseVip = hasSpecialAndHealthyFoodVipAccess(currentUser);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categoryShuffleNonce, setCategoryShuffleNonce] = useState<number>(0);
  const [restoredOrderIds, setRestoredOrderIds] = useState<string[] | null>(null);
  const currentRenderedOrderIdsRef = useRef<string[]>([]);
  const lastCategoryOrderRef = useRef<Record<string, { firstId: string; topIds: string; fullOrder: string }>>({});
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
  const dishCategoryCardRef = useRef<HTMLDivElement | null>(null);

  const [scrollRequestTick, setScrollRequestTick] = useState<number>(0);

  const scrollToDishList = (_keepCategoriesVisible = false) => {
    setScrollRequestTick((prev) => prev + 1);
    smoothScrollToElement(dishListStartRef.current, {
      containerId: 'kft-main-scroll',
      targetId: 'kft-dish-list-section',
      offsetTop: 6,
      delayMs: 25,
    });
  };

  const recordFoodStep = (label?: string) => {
    if (isRestoringHistoryRef.current) return;
    const snap = {
      selectedCategory,
      mealTimeFilter,
      foodSearchQuery,
      provinceFilter,
      tagFilter,
      visibleCount,
      orderedIds: [...currentRenderedOrderIdsRef.current],
    };
    pushNavigationStep({
      label: label || 'food-filter',
      restoreViewStep: () => {
        setRestoredOrderIds(snap.orderedIds.length > 0 ? snap.orderedIds : null);
        setSelectedCategory(snap.selectedCategory);
        setMealTimeFilter(snap.mealTimeFilter);
        setFoodSearchQuery(snap.foodSearchQuery);
        setProvinceFilter(snap.provinceFilter);
        setTagFilter(snap.tagFilter);
        setVisibleCount(snap.visibleCount);
        setShowFilterDrawer(false);
      },
    });
  };

  useEffect(() => {
    registerModalBackHandler('view:food', () => {
      if (showFilterDrawer) {
        setShowFilterDrawer(false);
        return true;
      }
      return false;
    });
    return () => registerModalBackHandler('view:food', null);
  }, [registerModalBackHandler, showFilterDrawer]);

  useEffect(() => {
    if (scrollRequestTick === 0 || isRestoringHistoryRef.current) return;
    smoothScrollToElement(dishListStartRef.current, {
      containerId: 'kft-main-scroll',
      targetId: 'kft-dish-list-section',
      offsetTop: 6,
      delayMs: 25,
    });
  }, [scrollRequestTick]);

  const handleExecuteFoodSearch = () => {
    const trimmed = foodSearchQuery.trim();
    if (trimmed && trimmed !== foodSearchQuery) {
      setFoodSearchQuery(trimmed);
    }
    searchInputRef.current?.blur();
    scrollToDishList();
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
    if (isRestoringHistoryRef.current) return;
    setVisibleCount(PAGE_BATCH_SIZE);
  }, [selectedCategory, categoryShuffleNonce, mealTimeFilter, foodSearchQuery, provinceFilter, tagFilter]);

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

  const uniqueOrganizedFoods = useMemo(() => {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const out: FoodItem[] = [];
    for (const food of organizedFoods) {
      if (!food || !food.id) continue;
      const idStr = String(food.id);
      const nameKey = normalizeKhmerFoodText(food.nameKh || '');
      if (!nameKey || seenIds.has(idStr) || seenNames.has(nameKey)) continue;
      seenIds.add(idStr);
      seenNames.add(nameKey);
      out.push(food);
    }
    return out;
  }, [organizedFoods]);

  const filteredFoods = useMemo(() => {
    const rawQuery = foodSearchQuery.trim();
    const matchesActiveFilters = (food: FoodItem): boolean => {
      if (!matchesFoodScreenCategoryTab(food, selectedCategory)) return false;
      if (provinceFilter && !doesDishBelongToProvince(food, provinceFilter)) return false;
      if (!matchesTagFilter(food, tagFilter)) return false;
      return true;
    };

    // When user is actively searching by keyword (Khmer, English, or Chinese):
    // Rank deterministically by relevance and never show false 0-result lockouts due to a previously selected category tab.
    if (rawQuery) {
      const chipId = resolvePresetCravingChipId(rawQuery);
      let searchMatched: FoodItem[];
      if (chipId) {
        searchMatched = uniqueOrganizedFoods.filter((f) => matchesPresetCravingChip(f, chipId));
      } else {
        searchMatched = searchKhmerFoods(uniqueOrganizedFoods, rawQuery);
        if (searchMatched.length === 0) {
          const smartIntent = parseSmartSearchIntent(rawQuery);
          if (smartIntent.coreQuery && smartIntent.coreQuery !== rawQuery) {
            searchMatched = searchKhmerFoods(uniqueOrganizedFoods, smartIntent.coreQuery);
          }
          if (searchMatched.length === 0 && smartIntent.detectedProvinceKh) {
            const provObj = DISH_PROVINCES.find(
              (p) => p.kh === smartIntent.detectedProvinceKh || p.fullKh === smartIntent.detectedProvinceKh
            );
            if (provObj) {
              searchMatched = uniqueOrganizedFoods.filter((f) => doesDishBelongToProvince(f, provObj.id));
            }
          }
        }
      }

      const filteredWithinActiveTab = searchMatched.filter(matchesActiveFilters);
      const finalSearchList =
        filteredWithinActiveTab.length > 0 ? filteredWithinActiveTab : searchMatched;

      if (restoredOrderIds && restoredOrderIds.length > 0) {
        const byId = new Map(finalSearchList.map((f) => [f.id, f]));
        const restored: FoodItem[] = [];
        for (const id of restoredOrderIds) {
          const item = byId.get(id);
          if (item) {
            restored.push(item);
            byId.delete(id);
          }
        }
        for (const remaining of byId.values()) {
          restored.push(remaining);
        }
        currentRenderedOrderIdsRef.current = restored.map((f) => f.id);
        return restored;
      }

      currentRenderedOrderIdsRef.current = finalSearchList.map((f) => f.id);
      return finalSearchList;
    }

    const matched = uniqueOrganizedFoods.filter(matchesActiveFilters);

    if (matched.length <= 1) {
      currentRenderedOrderIdsRef.current = matched.map((f) => f.id);
      return matched;
    }

    if (restoredOrderIds && restoredOrderIds.length > 0) {
      const byId = new Map(matched.map((f) => [f.id, f]));
      const restored: FoodItem[] = [];
      for (const id of restoredOrderIds) {
        const item = byId.get(id);
        if (item) {
          restored.push(item);
          byId.delete(id);
        }
      }
      for (const remaining of byId.values()) {
        restored.push(remaining);
      }
      currentRenderedOrderIdsRef.current = restored.map((f) => f.id);
      return restored;
    }

    const fisherYatesShuffle = (items: FoodItem[]): FoodItem[] => {
      const arr = [...items];
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    };

    const prevRecord = lastCategoryOrderRef.current[selectedCategory];
    const topWindowSize = Math.min(4, matched.length);
    let candidate = fisherYatesShuffle(matched);

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const firstId = candidate[0]?.id || '';
      const topIds = candidate
        .slice(0, topWindowSize)
        .map((f) => f.id)
        .join(',');
      const fullOrder = candidate.map((f) => f.id).join(',');

      const isDifferentFirst = !prevRecord || firstId !== prevRecord.firstId;
      const isDifferentTop = !prevRecord || topIds !== prevRecord.topIds;
      const isDifferentOrder = !prevRecord || fullOrder !== prevRecord.fullOrder;

      if (isDifferentFirst && isDifferentTop && isDifferentOrder) {
        break;
      }
      candidate = fisherYatesShuffle(matched);
    }

    if (prevRecord && candidate.length > 1 && candidate[0]?.id === prevRecord.firstId) {
      const swapIdx = candidate.findIndex((item) => item.id !== prevRecord.firstId);
      if (swapIdx > 0) {
        const tmp = candidate[0];
        candidate[0] = candidate[swapIdx];
        candidate[swapIdx] = tmp;
      }
    }

    lastCategoryOrderRef.current[selectedCategory] = {
      firstId: candidate[0]?.id || '',
      topIds: candidate
        .slice(0, topWindowSize)
        .map((f) => f.id)
        .join(','),
      fullOrder: candidate.map((f) => f.id).join(','),
    };

    currentRenderedOrderIdsRef.current = candidate.map((f) => f.id);
    return candidate;
  }, [uniqueOrganizedFoods, selectedCategory, categoryShuffleNonce, restoredOrderIds, provinceFilter, tagFilter, foodSearchQuery]);

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
    recordFoodStep('food-reset');
    setRestoredOrderIds(null);
    setSelectedCategory('all');
    setCategoryShuffleNonce((prev) => prev + 1);
    setMealTimeFilter('all');
    setProvinceFilter('');
    setTagFilter('all');
    setFoodSearchQuery('');
    setShowFilterDrawer(false);
    setVisibleCount(PAGE_BATCH_SIZE);
    scrollToDishList();
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
    <div className="w-full max-w-6xl min-w-0 mx-auto bg-[#1E293B] text-[#1E293B] min-h-full font-khmer pb-20">
      {/* 1. Header – Angkor Wat Hero Background */}
      <AngkorHeroTopHeader mode="food" foodCount={filteredFoods.length} />

      {/* Main Content Container rising smoothly from the Angkor Wat reflection */}
      <div className="relative z-20 -mt-[82px] px-2.5 min-[360px]:px-3.5 sm:px-5 space-y-2.5">
        {/* Compact Original Khmer Promotional Title Banner (Aligned Left) */}
        <div className="flex items-center justify-start pl-0.5 sm:pl-1">
          <div className="relative py-1 pl-1 pr-2 bg-transparent inline-flex items-center gap-2.5 max-w-[65%] min-w-0">
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

        {/* 2. Main Search Bar – Compact Left-Aligned (~60% Width, Shrunk 40% from Right to Left) + Separate Green Filter Button */}
        <div className="w-full flex items-center gap-1.5 min-[360px]:gap-2 min-w-0">
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.96)',
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
              onFocus={() => {
                if (!foodSearchQuery) recordFoodStep('food-search-focus');
              }}
              onChange={(e) => {
                setRestoredOrderIds(null);
                setFoodSearchQuery(e.target.value);
              }}
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
                onClick={() => {
                  recordFoodStep('food-search-clear');
                  setRestoredOrderIds(null);
                  setFoodSearchQuery('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                aria-label="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleExecuteFoodSearch}
              className="kft-btn-search-inline"
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

        {/* 3. Five Premium PNG Category Buttons with Category Names Inside Each Button */}
        <div
          ref={dishCategoryCardRef}
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            boxShadow: '0 8px 22px rgba(15, 23, 42, 0.08)',
          }}
          className="w-full max-w-full min-w-0 rounded-[24px] p-1.5 min-[360px]:p-2 sm:p-3 border border-white"
        >
          <div className="grid grid-cols-5 gap-1 min-[360px]:gap-1.5 sm:gap-2.5 items-stretch w-full max-w-full min-w-0">
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
                nameEn: 'Soups',
                nameZh: '高棉汤羹',
              },
              {
                id: 'cha',
                imageSrc: '/categories/food_cat_cha.png',
                nameKh: 'អាំង/ចៀន',
                nameEn: 'Grill/Fry',
                nameZh: '烧烤/煎炸',
              },
              {
                id: 'vegetarian',
                imageSrc: '/categories/food_cat_vegetarian.png',
                nameKh: 'ម្ហូបបួស',
                nameEn: 'Vegetarian',
                nameZh: '素食菜肴',
              },
              {
                id: 'bong_aem',
                imageSrc: '/categories/food_cat_dessert.png',
                nameKh: 'បង្អែម/ភេសជ្ជៈ',
                nameEn: 'Desserts',
                nameZh: '甜品/饮品',
              },
            ].map((cat) => {
              const active = selectedCategory === cat.id;
              const label = tr(language, cat.nameKh, cat.nameEn, cat.nameZh);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    recordFoodStep('food-cat:' + cat.id);
                    setRestoredOrderIds(null);
                    setShowFilterDrawer(false);
                    setSelectedCategory(cat.id);
                    setCategoryShuffleNonce((prev) => prev + 1);
                    setVisibleCount(PAGE_BATCH_SIZE);
                    scrollToDishList();
                  }}
                  aria-pressed={active}
                  style={{ transform: 'none' }}
                  className="kft-cat-btn group relative block w-full max-w-full min-w-0 min-h-0 aspect-[560/460] overflow-visible bg-transparent border-0 p-0 transition-opacity duration-150 cursor-pointer select-none"
                >
                  <img
                    src={cat.imageSrc}
                    alt={label}
                    style={{ transform: 'none' }}
                    className={`block w-full h-full max-w-full min-w-0 min-h-0 object-contain bg-transparent select-none pointer-events-none transition-opacity duration-150 ${
                      active
                        ? 'opacity-100'
                        : 'opacity-95 group-hover:opacity-100'
                    }`}
                    loading="eager"
                    decoding="async"
                  />
                  {/* Centered Large Bold WHITE Label Inside Button Directly Below the Food Illustration */}
                  <div className="pointer-events-none absolute inset-x-[4%] top-[69%] bottom-[6.5%] flex items-center justify-center px-0.5 overflow-visible">
                    <span className="kft-food-cat-label">
                      {label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

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
                      (window as any).__kft_admin_tab = 'food';
                      (window as any).__kft_admin_open_add_food = true;
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
                    className="kft-btn-reset"
                  >
                    <span>↺ {tr(language, 'កំណត់ឡើងវិញ', 'Reset', '重置')}</span>
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
                      onClick={() => {
                        if (tagFilter !== t.id) {
                          recordFoodStep('food-tag:' + t.id);
                          setRestoredOrderIds(null);
                        }
                        setTagFilter(t.id);
                        scrollToDishList();
                      }}
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
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== provinceFilter) {
                    recordFoodStep('food-prov:' + val);
                    setRestoredOrderIds(null);
                  }
                  setProvinceFilter(val);
                  setShowFilterDrawer(false);
                  scrollToDishList();
                }}
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

        {/* Section Title Bar on Dark Slate (#1E293B) - Positioned at top of screen on scroll */}
        <div ref={dishListStartRef} id="kft-dish-list-section" className="flex items-center justify-between gap-2 px-0.5 pt-0.5 scroll-mt-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Flame className="w-5 h-5 text-orange-400 fill-amber-400 shrink-0" />
            <h2 className="font-extrabold text-[15px] sm:text-base text-white leading-[1.65] break-words">
              {foodSearchQuery.trim()
                ? tr(
                    language,
                    `លទ្ធផលស្វែងរក «${foodSearchQuery.trim()}»`,
                    `Search results for "${foodSearchQuery.trim()}"`,
                    `“${foodSearchQuery.trim()}”的搜索结果`
                  )
                : selectedCategory === 'samlor'
                ? tr(language, 'សម្លខ្មែរពេញនិយម', 'Popular Khmer Soups', '热门高棉汤羹')
                : selectedCategory === 'cha'
                ? tr(language, 'ម្ហូបអាំង និងចៀនពេញនិយម', 'Popular Grill & Stir-Fry', '热门烧烤与煎炸')
                : selectedCategory === 'vegetarian'
                ? tr(language, 'ម្ហូបបួស និងសុខភាព', 'Vegetarian & Healthy Dishes', '素食与健康菜肴')
                : selectedCategory === 'bong_aem'
                ? tr(language, 'បង្អែម និងភេសជ្ជៈខ្មែរ', 'Khmer Desserts & Drinks', '高棉甜品与饮品')
                : tr(language, 'មុខម្ហូបខ្មែរពេញនិយម', 'Popular Cambodian Dishes', '热门柬埔寨美食')}
            </h2>
          </div>

          <span className="px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs text-xs font-extrabold text-slate-800 shrink-0">
            {tr(
              language,
              `${filteredFoods.length} មុខម្ហូប`,
              `${filteredFoods.length} dishes`,
              `${filteredFoods.length} 道美食`
            )}
          </span>
        </div>

        {/* 6. Food Listing Cards */}
        {filteredFoods.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-2 shadow-2xs min-h-[85vh]">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5 min-h-[85vh] content-start">
            {displayedFoods.map((food) => (
              <FoodCard key={food.id} food={food} />
            ))}

            {visibleCount < filteredFoods.length && (
              <div ref={loadMoreTriggerRef} className="col-span-full pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => Math.min(filteredFoods.length, prev + PAGE_BATCH_SIZE))}
                  className="kft-btn-load-more"
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


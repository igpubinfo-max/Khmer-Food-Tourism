import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Sparkles,
  Shuffle,
  Utensils,
  MapPin,
  Star,
  Clock,
  ChefHat,
  Heart,
  Sun,
  Sunset,
  Moon,
  Coffee,
  CheckCircle2,
  Crown,
  Lock,
  Navigation,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { FoodItem } from '../types';
import {
  IconFoodPicks,
  IconBeveragePairing,
  IconDishCategory,
  IconCravingSpark,
  IconVipCrown,
  IconGrillFlame,
  IconZestyCitrus,
  DishTagIcon,
} from './icons/HandcraftedIcons';
import { tr } from '../utils/i18n';
import { getLocalizedFood, getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import { getDishTagIds, DishTagId } from '../utils/dishTags';
import { hasSpecialAndHealthyFoodVipAccess } from '../utils/smartHub';
import { getAiFoodAdvisorRecommendations, QUICK_CRAVING_CHIPS } from '../services/aiFoodAdvisorService';
import { allergenLabel, type AllergenId } from '../services/aiFoodBrain';
import { AiBrainInsightCard } from './AiBrainInsightCard';
import {
  rankDrinkPairingDishes,
  getDrinkPairing,
  pairingReason,
  pairingKindsLabel,
  drinkDisclaimer,
  type DrinkKindFilter,
} from '../utils/drinkPairing';

type MealSlotFilter = 'auto' | 'breakfast' | 'lunch' | 'afternoon' | 'dinner';
type VipDietFilter = 'none' | DishTagId;

type MenuGroupId = 'time' | 'type' | 'craving' | 'health';

const MEAL_SLOTS: Array<{ id: MealSlotFilter; kh: string; en: string; zh: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'auto', kh: 'ពេលនេះ', en: 'Right Now', zh: '当前时段', icon: Clock },
  { id: 'breakfast', kh: 'ពេលព្រឹក', en: 'Breakfast', zh: '早餐', icon: Coffee },
  { id: 'lunch', kh: 'ថ្ងៃត្រង់', en: 'Lunch', zh: '午餐', icon: Sun },
  { id: 'afternoon', kh: 'រសៀល', en: 'Snack', zh: '下午茶', icon: Sparkles },
  { id: 'dinner', kh: 'ពេលល្ងាច', en: 'Dinner', zh: '晚餐', icon: Moon },
];

const CATEGORY_OPTIONS = [
  { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All', labelZh: '全部' },
  { id: 'soup', labelKh: 'សម្ល/ស៊ុប', labelEn: 'Soup & Curry', labelZh: '汤品/咖喱' },
  { id: 'grilled', labelKh: 'អាំង/បំពង', labelEn: 'Grilled & Fried', labelZh: '烧烤/煎炸' },
  { id: 'stirfry', labelKh: 'ឆា', labelEn: 'Stir-Fry', labelZh: '热炒' },
  { id: 'salad', labelKh: 'ញាំ/ភ្លា', labelEn: 'Salads & Dips', labelZh: '凉拌/蘸酱' },
  { id: 'noodles', labelKh: 'គុយទាវ/នំបញ្ចុក', labelEn: 'Noodles', labelZh: '粉面' },
  { id: 'dessert', labelKh: 'បង្អែម', labelEn: 'Desserts', labelZh: '甜品' },
];

const HEALTH_OPTIONS: Array<{ id: VipDietFilter; kh: string; en: string; zh: string; vipOnly: boolean }> = [
  { id: 'none', kh: 'ធម្មតា', en: 'Any', zh: '不限', vipOnly: false },
  { id: 'light', kh: 'ស្រាលក្រពះ (<450 kcal)', en: 'Light (<450 kcal)', zh: '轻食低卡', vipOnly: true },
  { id: 'protein_rich', kh: 'ប្រូតេអ៊ីនខ្ពស់', en: 'High Protein', zh: '高蛋白', vipOnly: true },
  { id: 'steamed_boiled', kh: 'ស្ងោរ/ចំហុយ', en: 'Steamed/Boiled', zh: '清蒸/水煮', vipOnly: true },
  { id: 'vegetable_rich', kh: 'បន្លែច្រើន', en: 'Veggie Rich', zh: '多蔬菜', vipOnly: true },
];

const stripLeadingSymbols = (s: string) => s.replace(/^[^\p{L}\p{N}]+/u, '').trim();

export const WhatToEatModal: React.FC = () => {
  const {
    isWhatToEatModalOpen,
    setIsWhatToEatModalOpen,
    setIsNearMeModalOpen,
    foods,
    restaurants,
    language,
    currentUser,
    setSelectedFood,
    setSelectedRestaurant,
    openAddToWishlist,
    openUpgradeVipModal,
    showToast,
  } = useApp();

  const canUseVip = hasSpecialAndHealthyFoodVipAccess(currentUser);

  // Filters: Craving Search, Category, Meal Time, and VIP Smart Nutrition Tag
  const [cravingQuery, setCravingQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [mealSlotFilter, setMealSlotFilter] = useState<MealSlotFilter>('auto');
  const [vipDietFilter, setVipDietFilter] = useState<VipDietFilter>('none');
  const [isSpinning, setIsSpinning] = useState(false);
  const cravingInputRef = useRef<HTMLInputElement | null>(null);
  const dishCardRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [openGroup, setOpenGroup] = useState<MenuGroupId | null>(null);
  const [drinkMode, setDrinkMode] = useState(false);
  const [drinkKind, setDrinkKind] = useState<DrinkKindFilter>('all');

  // Current dish index and history of seen dish IDs to prevent repetition
  const [currentDishId, setCurrentDishId] = useState<string>('');
  const seenDishIdsRef = useRef<Set<string>>(new Set());
  useBodyScrollLock(isWhatToEatModalOpen);

  // Determine current mealtime in Cambodia
  const currentMealInfo = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) {
      return {
        slug: 'breakfast' as const,
        labelKh: 'អាហារពេលព្រឹក',
        labelEn: 'Breakfast Recommendation',
        labelZh: '早餐美食推荐',
        icon: Coffee,
      };
    } else if (hour >= 10 && hour < 14) {
      return {
        slug: 'lunch' as const,
        labelKh: 'អាហារថ្ងៃត្រង់',
        labelEn: 'Lunch Recommendation',
        labelZh: '午餐美食推荐',
        icon: Sun,
      };
    } else if (hour >= 14 && hour < 17) {
      return {
        slug: 'afternoon' as const,
        labelKh: 'អាហារសម្រន់ & បង្អែម',
        labelEn: 'Afternoon Treats',
        labelZh: '下午茶与甜点推荐',
        icon: Sparkles,
      };
    } else if (hour >= 17 && hour < 22) {
      return {
        slug: 'dinner' as const,
        labelKh: 'អាហារពេលល្ងាច',
        labelEn: 'Dinner Recommendation',
        labelZh: '晚餐美食推荐',
        icon: Sunset,
      };
    } else {
      return {
        slug: 'dinner' as const,
        labelKh: 'អាហារពេលយប់',
        labelEn: 'Late Night Cravings',
        labelZh: '宵夜美食推荐',
        icon: Moon,
      };
    }
  }, []);

  const effectiveMealSlot = mealSlotFilter === 'auto' ? currentMealInfo.slug : mealSlotFilter;

  const aiCravingRecommendations = useMemo(() => {
    if (!cravingQuery.trim()) return null;
    return getAiFoodAdvisorRecommendations({
      foods,
      restaurants,
      query: cravingQuery,
      goal: 'any',
      seed: 0,
      language,
      canUseVip,
    });
  }, [foods, restaurants, cravingQuery, language, canUseVip]);

  // Per-dish "why" + allergen flags coming from the smart AI brain
  const brainInfoById = useMemo(() => {
    const map: Record<string, { reason: string; allergens: string[] }> = {};
    aiCravingRecommendations?.brain?.dishes.forEach((d) => {
      map[d.food.id] = { reason: d.reason, allergens: d.allergens };
    });
    return map;
  }, [aiCravingRecommendations]);

  // VIP special menu: drinking food (beer / liquor), auto-detected from every dish
  const pairingRanked = useMemo(
    () => (drinkMode && canUseVip ? rankDrinkPairingDishes(foods, drinkKind) : []),
    [drinkMode, canUseVip, foods, drinkKind]
  );

  // Filter candidate dishes by Craving Query, Category, Mealtime, and VIP Nutrition Tag
  const matchingFoods = useMemo(() => {
    if (drinkMode && canUseVip && pairingRanked.length > 0) {
      return pairingRanked.map((r) => r.food);
    }
    if (aiCravingRecommendations && aiCravingRecommendations.dishes.length > 0) {
      return aiCravingRecommendations.dishes;
    }

    const filtered = foods.filter((food) => {
      if (categoryFilter !== 'all' && food.categorySlug !== categoryFilter) return false;

      if (vipDietFilter !== 'none' && canUseVip) {
        const tags = getDishTagIds(food);
        if (!tags.includes(vipDietFilter)) return false;
      }

      if (mealSlotFilter !== 'auto') {
        const text = `${food.nameKh} ${food.nameEn} ${food.categorySlug || ''}`.toLowerCase();
        if (effectiveMealSlot === 'breakfast' && !/គុយទាវ|នំបញ្ចុក|បបរ|បាយសាច់ជ្រូក|មី|កាហ្វេ|នំ|noodles|soup|porridge|rice/.test(text)) {
          return false;
        }
        if (effectiveMealSlot === 'afternoon' && !/បង្អែម|នំ|ភ្លា|ញាំ|បុក|អាំង|dessert|salad|grilled|street/.test(text)) {
          return false;
        }
        if (effectiveMealSlot === 'lunch' && food.categorySlug === 'dessert') {
          return false;
        }
        if (effectiveMealSlot === 'dinner' && food.categorySlug === 'dessert') {
          return false;
        }
      }

      return true;
    });

    return filtered;
  }, [foods, aiCravingRecommendations, categoryFilter, vipDietFilter, canUseVip, mealSlotFilter, effectiveMealSlot, drinkMode, pairingRanked]);

  // Active candidate list (falls back gracefully if combination is too narrow)
  const activeDishList = matchingFoods.length > 0 ? matchingFoods : foods;

  // Pick a fresh random dish that hasn't been shown recently
  const pickRandomDish = (excludeId?: string): FoodItem => {
    if (activeDishList.length === 0) return foods[0];
    if (activeDishList.length === 1) return activeDishList[0];

    // When user typed a specific craving query, prioritize the #1 best-ranked dish first
    if ((cravingQuery.trim() || drinkMode) && !excludeId) {
      return activeDishList[0];
    }

    let unseenCandidates = activeDishList.filter(
      (f) => f.id !== excludeId && !seenDishIdsRef.current.has(f.id)
    );

    if (unseenCandidates.length === 0) {
      seenDishIdsRef.current.clear();
      unseenCandidates = activeDishList.filter((f) => f.id !== excludeId);
    }

    const pool = unseenCandidates.length > 0 ? unseenCandidates : activeDishList;
    const randomPick = cravingQuery.trim()
      ? pool[0]
      : pool[Math.floor(Math.random() * pool.length)];

    seenDishIdsRef.current.add(randomPick.id);
    return randomPick;
  };

  // Re-roll dish whenever modal opens or filters/craving change
  useEffect(() => {
    if (isWhatToEatModalOpen && foods.length > 0) {
      seenDishIdsRef.current.clear();
      const initialPick = pickRandomDish();
      setCurrentDishId(initialPick.id);
    }
  }, [isWhatToEatModalOpen, cravingQuery, categoryFilter, mealSlotFilter, vipDietFilter, drinkMode, drinkKind]);

  useEffect(() => {
    if (!canUseVip && vipDietFilter !== 'none') {
      setVipDietFilter('none');
    }
  }, [canUseVip, vipDietFilter]);

  // Current active dish
  const currentDish: FoodItem = useMemo(() => {
    return activeDishList.find((f) => f.id === currentDishId) || activeDishList[0] || foods[0];
  }, [activeDishList, currentDishId, foods]);

  const currentLoc = useMemo(
    () => (currentDish ? getLocalizedFood(currentDish, language) : null),
    [currentDish, language]
  );

  // 2 Distinct Alternative Dishes (ordered by AI relevance when craving query is active)
  const alternativeDishes = useMemo(() => {
    if (activeDishList.length <= 1) return [];
    const pool = activeDishList.filter((f) => f.id !== currentDish?.id);
    if (pool.length === 0) return [];
    if (cravingQuery.trim() || drinkMode) {
      return pool.slice(0, 4);
    }
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  }, [activeDishList, currentDish?.id, cravingQuery, drinkMode]);

  // Find restaurants serving this dish
  const servingRestaurants = useMemo(() => {
    if (!currentDish) return [];
    return restaurants
      .filter((r) =>
        r.signatureDishesKh?.some(
          (d) => d.includes(currentDish.nameKh) || currentDish.nameKh.includes(d)
        )
      )
      .slice(0, 2);
  }, [restaurants, currentDish]);

  if (!isWhatToEatModalOpen) return null;

  const handleCravingSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    cravingInputRef.current?.blur();
    if (activeDishList.length > 0) {
      setCurrentDishId(activeDishList[0].id);
    }
    setTimeout(() => {
      dishCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const handleShowAnother = () => {
    setIsSpinning(true);
    setTimeout(() => {
      const nextDish = pickRandomDish(currentDish?.id);
      setCurrentDishId(nextDish.id);
      setIsSpinning(false);
    }, 240);
  };

  const handleFindNearbyForDish = () => {
    if (!currentDish) return;
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${currentDish.nameKh} ${currentDish.nameEn} restaurant near me Cambodia`
    )}`;
    if (servingRestaurants.length > 0) {
      (window as any).__kft_near_me_initial_tab = 'restaurants';
      (window as any).__kft_near_me_initial_query = '';
      setIsWhatToEatModalOpen(false);
      setIsNearMeModalOpen(true);
    } else {
      window.open(googleUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const MealIcon = currentMealInfo.icon;

  const handleOpenDrinkPairing = () => {
    if (!canUseVip) {
      showToast(
        tr(
          language,
          'ម៉ឺនុយ «ម្ហូបអមភេសជ្ជៈ» សម្រាប់សមាជិក VIP ប៉ុណ្ណោះ!',
          'The “Beverage Pairings” menu is for VIP members only!',
          '“佐餐与饮品搭配”特别菜单为 VIP 会员专属！'
        ),
        'info'
      );
      openUpgradeVipModal();
      return;
    }
    setDrinkMode((v) => !v);
    setCravingQuery('');
    setOpenGroup(null);
    setTimeout(() => {
      dishCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const activeSlot = MEAL_SLOTS.find((s) => s.id === mealSlotFilter);
  const activeCategory = CATEGORY_OPTIONS.find((c) => c.id === categoryFilter);
  const activeHealth = HEALTH_OPTIONS.find((h) => h.id === vipDietFilter);
  const menuGroups: Array<{ id: MenuGroupId; icon: React.ReactNode; label: string; value: string; active: boolean }> = [
    {
      id: 'time',
      icon: <MealIcon className="w-4 h-4" />,
      label: tr(language, 'ពេលវេលា', 'Time', '时段'),
      value:
        mealSlotFilter === 'auto' || !activeSlot
          ? tr(language, 'ពេលនេះ', 'Now', '当前')
          : stripLeadingSymbols(tr(language, activeSlot.kh, activeSlot.en, activeSlot.zh)),
      active: mealSlotFilter !== 'auto',
    },
    {
      id: 'type',
      icon: <IconDishCategory className="w-4 h-4" />,
      label: tr(language, 'ប្រភេទ', 'Type', '分类'),
      value:
        categoryFilter === 'all' || !activeCategory
          ? ''
          : tr(language, activeCategory.labelKh, activeCategory.labelEn, activeCategory.labelZh),
      active: categoryFilter !== 'all',
    },
    {
      id: 'craving',
      icon: <IconCravingSpark className="w-4 h-4" />,
      label: tr(language, 'ចំណង់', 'Craving', '想吃'),
      value: cravingQuery.trim().slice(0, 10),
      active: cravingQuery.trim().length > 0,
    },
    {
      id: 'health',
      icon: canUseVip ? <IconVipCrown className="w-4 h-4 text-amber-500" /> : <Lock className="w-4 h-4 text-amber-500" />,
      label: tr(language, 'សុខភាព', 'Health', '健康'),
      value:
        vipDietFilter === 'none' || !activeHealth
          ? ''
          : stripLeadingSymbols(tr(language, activeHealth.kh, activeHealth.en, activeHealth.zh)),
      active: vipDietFilter !== 'none',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200 overscroll-none"
      onClick={() => setIsWhatToEatModalOpen(false)}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#064E3B] to-[#047857] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-xs shrink-0">
              <IconFoodPicks className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-moul text-sm text-white truncate">
                  {tr(language, 'ណែនាំមុខម្ហូបឆ្លាតវៃ', 'Food Recommendations', '智能美食推荐')}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-[10px] font-extrabold shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  <span>{tr(language, 'ឥតគិតថ្លៃ • FREE', 'FREE Access', '免费使用')}</span>
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-khmer truncate">
                {tr(
                  language,
                  `ណែនាំម្ហូបតាមពេលវេលា និងចំណូលចិត្តពីមុខម្ហូប ${foods.length} មុខ`,
                  `Smart mealtime & craving picks from ${foods.length} dishes`,
                  `从 ${foods.length} 道柬埔寨美食中按用餐时段智能推荐`
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsWhatToEatModalOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-100 hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          ref={scrollerRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar [-webkit-overflow-scrolling:touch]"
        >
        {/* AI Craving Search Bar (What Do You Want to Eat?) */}
        <div className="px-3.5 pt-3 pb-2.5 bg-white dark:bg-slate-900 border-b border-emerald-100/70 dark:border-slate-800 space-y-2.5 font-khmer">
          <form onSubmit={handleCravingSubmit} className="relative flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={cravingInputRef}
                type="search"
                enterKeyHint="search"
                value={cravingQuery}
                onChange={(e) => {
                  setCravingQuery(e.target.value);
                  if (drinkMode) setDrinkMode(false);
                }}
                placeholder={tr(language, 'ចង់ញ៉ាំអ្វីថ្ងៃនេះ?', 'What to eat today?', '今天吃什么？')}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {cravingQuery && (
                <button
                  type="button"
                  onClick={() => setCravingQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:from-[#047857] hover:to-[#059669] text-white text-sm font-extrabold shadow-xs flex items-center gap-1.5 shrink-0 transition active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{tr(language, 'ស្វែងរក', 'Ask AI', 'AI 推荐')}</span>
            </button>
          </form>

          {/* ★ Special menu (VIP): ម្ហូបអមភេសជ្ជៈ — AI auto-curated Beverage Pairings */}
          <button
            type="button"
            onClick={handleOpenDrinkPairing}
            className={`w-full rounded-2xl px-3.5 py-2.5 flex items-center gap-3 text-left shadow-md border transition active:scale-[0.99] cursor-pointer ${
              drinkMode
                ? 'bg-gradient-to-r from-[#064E3B] via-[#047857] to-[#059669] border-amber-300/80 text-white'
                : 'bg-gradient-to-r from-[#0f2922] via-[#133b2f] to-[#1a4d3c] border-amber-400/60 text-amber-100'
            }`}
          >
            <span className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shrink-0">
              <IconBeveragePairing className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-moul text-sm leading-relaxed">
                {tr(language, 'ម្ហូបអមភេសជ្ជៈ', 'Beverage Pairings', '佐餐与饮品搭配')}
              </span>
              <span className="block text-xs opacity-90 leading-snug">
                {tr(
                  language,
                  'AI ជ្រើសម្ហូបអាំង ចៀនស្រួយ និងញាំជូរហឹរ សម្រាប់ញ៉ាំជុំគ្នា',
                  'AI-curated savory dishes for dining & refreshments',
                  'AI 精选烧烤、香脆与酸辣佐餐美食'
                )}
              </span>
            </span>
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/35 border border-amber-300/50 text-amber-200 text-xs font-black">
              {canUseVip ? (
                drinkMode ? (
                  <span>✓ {tr(language, 'កំពុងបើក', 'ON', '已开启')}</span>
                ) : (
                  <>
                    <IconVipCrown className="w-3.5 h-3.5 text-amber-300" />
                    <span>VIP</span>
                  </>
                )
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  <span>VIP</span>
                </>
              )}
            </span>
          </button>

          {/* Compact sub-menus: one tap opens a group, keeping the screen clean */}
          <div className="grid grid-cols-4 gap-1.5">
            {menuGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setOpenGroup((cur) => (cur === g.id ? null : g.id))}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition cursor-pointer min-w-0 ${
                  openGroup === g.id
                    ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                    : g.active
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#064E3B] dark:text-emerald-300 border-emerald-400'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span className="flex items-center justify-center h-4">{g.icon}</span>
                <span className="text-xs font-extrabold leading-tight">{g.label}</span>
                <span className="text-[10px] leading-tight opacity-80 truncate max-w-full">{g.value || '\u00A0'}</span>
              </button>
            ))}
          </div>

          {openGroup && (
            <div className="p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-slate-800/70 border border-emerald-100 dark:border-slate-700 flex flex-wrap gap-1.5">
              {openGroup === 'time' &&
                MEAL_SLOTS.map((slot) => {
                  const SlotIcon = slot.icon;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        setMealSlotFilter(slot.id);
                        setDrinkMode(false);
                        setOpenGroup(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 transition cursor-pointer ${
                        mealSlotFilter === slot.id
                          ? 'bg-[#064E3B] text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <SlotIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{tr(language, slot.kh, slot.en, slot.zh)}</span>
                    </button>
                  );
                })}

              {openGroup === 'type' &&
                CATEGORY_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(c.id);
                      setDrinkMode(false);
                      setOpenGroup(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      categoryFilter === c.id
                        ? 'bg-[#059669] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {tr(language, c.labelKh, c.labelEn, c.labelZh)}
                  </button>
                ))}

              {openGroup === 'craving' &&
                QUICK_CRAVING_CHIPS.map((chip) => {
                  const chipQuery = language === 'km' ? chip.queryKh : language === 'zh' ? chip.queryZh : chip.queryEn;
                  const isChipActive = cravingQuery.trim().toLowerCase() === chipQuery.trim().toLowerCase();
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        setCravingQuery(isChipActive ? '' : chipQuery);
                        setDrinkMode(false);
                        setOpenGroup(null);
                        cravingInputRef.current?.blur();
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        isChipActive
                          ? 'bg-[#064E3B] text-amber-300 border border-amber-400/60 shadow-2xs'
                          : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {stripLeadingSymbols(tr(language, chip.labelKh, chip.labelEn, chip.labelZh))}
                    </button>
                  );
                })}

              {openGroup === 'health' &&
                HEALTH_OPTIONS.map((d) => {
                  const isLocked = d.vipOnly && !canUseVip;
                  const isActive = vipDietFilter === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        if (isLocked) {
                          showToast(
                            tr(
                              language,
                              'តម្រងម្ហូបសុខភាព និងកាឡូរី គឺសម្រាប់សមាជិក VIP!',
                              'Smart Nutrition & Calorie filters are reserved for VIP members!',
                              '智能营养与热量筛选为 VIP 会员专属功能！'
                            ),
                            'info'
                          );
                          openUpgradeVipModal();
                          return;
                        }
                        setVipDietFilter(d.id);
                        setDrinkMode(false);
                        setOpenGroup(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-amber-300/70 dark:border-slate-600'
                      }`}
                    >
                      {d.id !== 'none' && <DishTagIcon id={d.id} className="w-3.5 h-3.5 shrink-0" />}
                      <span>{tr(language, d.kh, d.en, d.zh)}</span>
                      {isLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Content body */}
        <div ref={dishCardRef} className="p-4 space-y-3">
          {drinkMode && canUseVip && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/70 to-amber-50/70 dark:from-emerald-950/40 dark:via-slate-800 dark:to-amber-950/30 border border-emerald-300/70 dark:border-emerald-700/50 space-y-2.5 font-khmer">
              <div className="flex items-start gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-emerald-600/15 dark:bg-amber-400/20 border border-emerald-500/30 dark:border-amber-300/40 flex items-center justify-center text-[#064E3B] dark:text-amber-300 shrink-0 mt-0.5">
                  <IconBeveragePairing className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed">
                    {tr(
                      language,
                      `ម្ហូបអមភេសជ្ជៈ — AI បានជ្រើសរើស ${pairingRanked.length} មុខ`,
                      `Beverage Pairings — AI selected ${pairingRanked.length} dishes`,
                      `佐餐与饮品搭配 — AI 精选 ${pairingRanked.length} 道`
                    )}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {tr(
                      language,
                      'ជម្រើសម្ហូបរសជាតិឈ្ងុយឆ្ងាញ់៖ អាំង ចៀនស្រួយ ញាំជូរហឹរ គ្រឿងសមុទ្រ និងសាច់ប្រឡាក់ ស័ក្តិសមសម្រាប់ញ៉ាំជុំតុ និងភេសជ្ជៈគ្រប់ប្រភេទ។',
                      'Savory sharing dishes: charcoal-grilled, crispy bites, zesty salads, fresh seafood and seasoned meats for dining & refreshments.',
                      '精选聚餐风味佳肴：烧烤、酥脆小食、酸辣凉拌、海鲜与风味肉食，适合围桌分享与饮品搭配。'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {([
                  {
                    id: 'all' as const,
                    icon: <IconBeveragePairing className="w-3.5 h-3.5 shrink-0" />,
                    kh: 'ទាំងអស់',
                    en: 'All Pairings',
                    zh: '全部搭配',
                  },
                  {
                    id: 'beer' as const,
                    icon: <IconGrillFlame className="w-3.5 h-3.5 shrink-0" />,
                    kh: 'អាំង & ចៀនស្រួយ',
                    en: 'Grilled & Crispy',
                    zh: '烧烤与香脆',
                  },
                  {
                    id: 'spirits' as const,
                    icon: <IconZestyCitrus className="w-3.5 h-3.5 shrink-0" />,
                    kh: 'ញាំជូរហឹរ & ម្ហូបពិសេស',
                    en: 'Zesty & Savory',
                    zh: '酸辣与风味小食',
                  },
                ]).map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setDrinkKind(k.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                      drinkKind === k.id
                        ? 'bg-[#064E3B] text-amber-300 border border-amber-400/60 shadow-xs'
                        : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-emerald-200 dark:border-slate-600'
                    }`}
                  >
                    {k.icon}
                    <span>{tr(language, k.kh, k.en, k.zh)}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-bold text-[#064E3B] dark:text-emerald-300 leading-relaxed flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>{drinkDisclaimer(language)}</span>
              </p>
            </div>
          )}
          {!drinkMode && aiCravingRecommendations && cravingQuery.trim() && (
            aiCravingRecommendations.brain ? (
              <AiBrainInsightCard
                insight={aiCravingRecommendations.brain}
                language={language}
                showDishes={false}
                onChip={(q) => {
                  setCravingQuery(q);
                  setDrinkMode(false);
                }}
                onUpgrade={() => openUpgradeVipModal()}
              />
            ) : (
              <div className="px-3 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 text-xs font-bold text-[#064E3B] dark:text-emerald-200 leading-relaxed font-khmer">
                {aiCravingRecommendations.aiSummaryText}
              </div>
            )
          )}
          {currentDish && currentLoc && (
            <div
              className={`transition-all duration-300 ${
                isSpinning ? 'opacity-30 scale-95' : 'opacity-100 scale-100'
              }`}
            >
              {/* Highlight Recommended Dish Card */}
              <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-md">
                <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={currentDish.photoUrl}
                    alt={currentLoc.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full bg-amber-400 text-stone-900 text-xs font-black shadow-xs flex items-center gap-1 font-khmer">
                      <Sparkles className="w-3.5 h-3.5 fill-current text-amber-900" />
                      {tr(language, 'ម្ហូបណែនាំសម្រាប់អ្នក', 'Recommended Dish', '为您推荐')}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold">
                      {currentLoc.category}
                    </span>
                  </div>

                  {/* Reference label */}
                  <span className="absolute bottom-2 right-2.5 z-10 bg-black/55 backdrop-blur-xs text-white/85 text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded border border-white/15 font-khmer select-none pointer-events-none">
                    {tr(language, 'រូបភាពយោង', 'Reference photo', '参考图片')}
                  </span>

                  {/* Title overlay */}
                  <div className="absolute bottom-3 left-3 right-24 text-white">
                    <h2 className="font-moul text-base sm:text-lg text-white drop-shadow leading-snug">
                      {currentLoc.name}
                    </h2>
                  </div>
                </div>

                {/* Details info */}
                <div className="p-4 space-y-3 font-khmer">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500">
                        {tr(language, 'ថាមពលអាហារូបត្ថម្ភ', 'Nutritional Energy', '营养热量')}
                      </div>
                      <div className="text-base font-black text-[#064E3B] dark:text-emerald-400">
                        {currentDish.calories} {tr(language, 'គីឡូកាឡូរី', 'kcal', '千卡')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-bold">{currentDish.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <span>{currentLoc.cookTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ChefHat className="w-4 h-4 text-emerald-600" />
                        <span className="capitalize">{currentLoc.difficultyLabel}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {currentLoc.description}
                  </p>

                  {(() => {
                    const pInfo = drinkMode && canUseVip ? getDrinkPairing(currentDish) : null;
                    const brainInfo = brainInfoById[currentDish.id];
                    const reason = pInfo
                      ? `${pairingKindsLabel(pInfo.kinds, language)} — ${pairingReason(pInfo, language)}`
                      : brainInfo?.reason;
                    if (!reason) return null;
                    const allergens = brainInfo?.allergens || [];
                    return (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 leading-relaxed space-y-1">
                        <div className="flex items-start gap-1.5">
                          <IconCravingSpark className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                          <span>{reason}</span>
                        </div>
                        {allergens.length > 0 && (
                          <div className="text-[11px] font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>{allergens.map((a) => allergenLabel(a as AllergenId, language)).join(' · ')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Restaurants Serving It */}
                  {servingRestaurants.length > 0 && (
                    <div className="p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 space-y-1.5">
                      <div className="text-[11px] font-bold text-[#064E3B] dark:text-emerald-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {tr(
                            language,
                            'ហាងឆ្ងាញ់ៗដែលមានលក់ម្ហូបនេះ៖',
                            'Recommended restaurants serving this:',
                            '推荐品尝此菜品的餐厅：'
                          )}
                        </span>
                      </div>
                      {servingRestaurants.map((r) => {
                        const rLoc = getLocalizedRestaurant(r, language);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setSelectedRestaurant(r);
                              setIsWhatToEatModalOpen(false);
                            }}
                            className="w-full flex items-center justify-between text-xs text-slate-700 dark:text-slate-200 hover:text-emerald-600 py-0.5 cursor-pointer"
                          >
                            <span className="font-bold truncate">{rLoc.name}</span>
                            <span className="text-[10px] text-emerald-600 font-bold shrink-0">
                              {rLoc.province} →
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions for current dish */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFood(currentDish);
                        setIsWhatToEatModalOpen(false);
                      }}
                      className="py-2.5 px-3 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl text-xs font-bold font-khmer shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ChefHat className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span className="truncate">{tr(language, 'មើលរូបមន្ត', 'View Recipe', '查看食谱')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFindNearbyForDish}
                      className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 border border-emerald-200 dark:border-slate-600 rounded-xl text-xs font-bold font-khmer shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300 shrink-0" />
                      <span className="truncate">
                        {tr(language, 'រកហាងលក់ម្ហូបនេះ', 'Find Nearby Shop', '查找附近餐厅')}
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openAddToWishlist({
                        id: currentDish.id,
                        type: 'food',
                        nameKh: currentDish.nameKh,
                        nameEn: currentDish.nameEn,
                        photoUrl: currentDish.photoUrl,
                        categoryKh: currentDish.categoryKh,
                        priceDisplay: `${currentDish.calories} ${tr(language, 'គីឡូកាឡូរី', 'kcal', '千卡')}`,
                        rating: currentDish.rating,
                      })
                    }
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                    <span>{tr(language, 'រក្សាទុកក្នុងបញ្ជីចូលចិត្ត', 'Save to Favorites', '收藏到心愿单')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Alternative quick choices */}
          {alternativeDishes.length > 0 && (
            <div className="space-y-2 font-khmer">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {tr(language, 'មុខម្ហូបគួរសាកល្បងផ្សេងទៀត៖', 'More dishes you might enjoy:', '其他推荐菜品：')}
                </span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {alternativeDishes.map((d) => {
                  const dLoc = getLocalizedFood(d, language);
                  return (
                    <div
                      key={d.id}
                      onClick={() => {
                        setCurrentDishId(d.id);
                        seenDishIdsRef.current.add(d.id);
                      }}
                      className="p-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 flex items-center gap-2 cursor-pointer hover:border-emerald-500 transition shadow-2xs group"
                    >
                      <img
                        src={d.photoUrl}
                        alt={dLoc.name}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#0F172A] dark:text-white truncate">
                          {dLoc.name}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-mono font-bold">
                          {d.calories} {tr(language, 'គីឡូកាឡូរី', 'kcal', '千卡')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Big Re-roll Button: «បង្ហាញម្ហូបផ្សេងទៀត» */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={handleShowAnother}
            disabled={isSpinning}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-stone-900 font-black text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98] font-khmer cursor-pointer"
          >
            <Shuffle className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{tr(language, 'បង្ហាញម្ហូបផ្សេងទៀត', 'Recommend Another Dish', '换一道推荐菜品')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

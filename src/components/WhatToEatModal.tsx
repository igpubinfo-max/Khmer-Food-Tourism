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
} from 'lucide-react';
import { FoodItem } from '../types';
import { IconFoodPicks } from './icons/HandcraftedIcons';
import { tr } from '../utils/i18n';
import { getLocalizedFood, getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import { getDishTagIds, DishTagId } from '../utils/dishTags';
import { hasSpecialAndHealthyFoodVipAccess } from '../utils/smartHub';

type MealSlotFilter = 'auto' | 'breakfast' | 'lunch' | 'afternoon' | 'dinner';
type VipDietFilter = 'none' | DishTagId;

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

  // Filters: Category, Meal Time, and VIP Smart Nutrition Tag
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [mealSlotFilter, setMealSlotFilter] = useState<MealSlotFilter>('auto');
  const [vipDietFilter, setVipDietFilter] = useState<VipDietFilter>('none');
  const [isSpinning, setIsSpinning] = useState(false);

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

  // Filter candidate dishes by Category, Mealtime, and VIP Nutrition Tag
  const matchingFoods = useMemo(() => {
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
  }, [foods, categoryFilter, vipDietFilter, canUseVip, mealSlotFilter, effectiveMealSlot]);

  // Active candidate list (falls back gracefully if combination is too narrow)
  const activeDishList = matchingFoods.length > 0 ? matchingFoods : foods;

  // Pick a fresh random dish that hasn't been shown recently
  const pickRandomDish = (excludeId?: string): FoodItem => {
    if (activeDishList.length === 0) return foods[0];
    if (activeDishList.length === 1) return activeDishList[0];

    let unseenCandidates = activeDishList.filter(
      (f) => f.id !== excludeId && !seenDishIdsRef.current.has(f.id)
    );

    if (unseenCandidates.length === 0) {
      seenDishIdsRef.current.clear();
      unseenCandidates = activeDishList.filter((f) => f.id !== excludeId);
    }

    const pool = unseenCandidates.length > 0 ? unseenCandidates : activeDishList;
    const randomPick = pool[Math.floor(Math.random() * pool.length)];

    seenDishIdsRef.current.add(randomPick.id);
    return randomPick;
  };

  // Re-roll dish whenever modal opens or filters change
  useEffect(() => {
    if (isWhatToEatModalOpen && foods.length > 0) {
      const initialPick = pickRandomDish();
      setCurrentDishId(initialPick.id);
    }
  }, [isWhatToEatModalOpen, categoryFilter, mealSlotFilter, vipDietFilter]);

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

  // 2 Distinct Alternative Dishes randomly picked from candidates
  const alternativeDishes = useMemo(() => {
    if (activeDishList.length <= 1) return [];
    const pool = activeDishList.filter((f) => f.id !== currentDish?.id);
    if (pool.length === 0) return [];
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  }, [activeDishList, currentDish?.id]);

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

        {/* Mealtime Context & Selector Banner (FREE) */}
        <div className="px-3.5 py-2 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border-b border-emerald-100/60 dark:border-slate-800 space-y-1.5 font-khmer shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#064E3B] dark:text-emerald-300 font-bold text-[11px]">
              <MealIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                {tr(
                  language,
                  `ណែនាំសម្រាប់${currentMealInfo.labelKh}`,
                  `Suggested for ${currentMealInfo.labelEn}`,
                  `当前时段推荐：${currentMealInfo.labelZh}`
                )}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono font-bold">
              {activeDishList.length} {tr(language, 'មុខម្ហូប', 'dishes', '道菜')}
            </span>
          </div>

          {/* Meal Slot Quick Switcher (FREE) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'auto' as const, kh: '⏰ ពេលនេះ', en: '⏰ Right Now', zh: '⏰ 当前时段' },
              { id: 'breakfast' as const, kh: '🌅 ពេលព្រឹក', en: '🌅 Breakfast', zh: '🌅 早餐' },
              { id: 'lunch' as const, kh: '☀️ ថ្ងៃត្រង់', en: '☀️ Lunch', zh: '☀️ 午餐' },
              { id: 'afternoon' as const, kh: '🧋 រសៀល', en: '🧋 Snack', zh: '🧋 下午茶' },
              { id: 'dinner' as const, kh: '🌙 ពេលល្ងាច', en: '🌙 Dinner', zh: '🌙 晚餐' },
            ].map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setMealSlotFilter(slot.id)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                  mealSlotFilter === slot.id
                    ? 'bg-[#064E3B] text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {tr(language, slot.kh, slot.en, slot.zh)}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Bar: Free Category Row + VIP Smart Nutrition Row */}
        <div className="p-3 bg-emerald-50/60 dark:bg-slate-800/60 border-b border-emerald-100 dark:border-slate-800 space-y-2 shrink-0 font-khmer">
          {/* Free Category row */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 shrink-0 mr-0.5">
              {tr(language, 'ប្រភេទ (FREE)៖', 'Type (FREE):', '分类 (免费)：')}
            </span>
            {[
              { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All', labelZh: '全部' },
              { id: 'soup', labelKh: 'សម្ល/ស៊ុប', labelEn: 'Soup & Curry', labelZh: '汤品/咖喱' },
              { id: 'grilled', labelKh: 'អាំង/បំពង', labelEn: 'Grilled & Fried', labelZh: '烧烤/煎炸' },
              { id: 'stirfry', labelKh: 'ឆា', labelEn: 'Stir-Fry', labelZh: '热炒' },
              { id: 'salad', labelKh: 'ញាំ/ភ្លា', labelEn: 'Salads & Dips', labelZh: '凉拌/蘸酱' },
              { id: 'noodles', labelKh: 'គុយទាវ/នំបញ្ចុក', labelEn: 'Noodles', labelZh: '粉面' },
              { id: 'dessert', labelKh: 'បង្អែម', labelEn: 'Desserts', labelZh: '甜品' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryFilter(c.id)}
                className={`px-2 py-1 rounded-xl font-bold whitespace-nowrap transition text-[10px] cursor-pointer ${
                  categoryFilter === c.id
                    ? 'bg-[#059669] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                }`}
              >
                {tr(language, c.labelKh, c.labelEn, c.labelZh)}
              </button>
            ))}
          </div>

          {/* VIP Smart Nutrition & Calorie Filter Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs pt-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 dark:text-amber-300 shrink-0 mr-0.5">
              <Crown className="w-3 h-3 text-amber-500" />
              <span>{tr(language, 'សុខភាព (VIP)៖', 'Nutrition (VIP):', '营养筛选 (VIP)：')}</span>
            </span>
            {[
              { id: 'none' as const, kh: 'ធម្មតា', en: 'Any', zh: '不限', vipOnly: false },
              { id: 'light' as const, kh: '🥗 ស្រាលក្រពះ (<450 kcal)', en: '🥗 Light (<450 kcal)', zh: '🥗 轻食低卡', vipOnly: true },
              { id: 'protein_rich' as const, kh: '💪 ប្រូតេអ៊ីនខ្ពស់', en: '💪 High Protein', zh: '💪 高蛋白', vipOnly: true },
              { id: 'steamed_boiled' as const, kh: '🍲 ស្ងោរ/ចំហុយ', en: '🍲 Steamed/Boiled', zh: '🍲 清蒸/水煮', vipOnly: true },
              { id: 'vegetable_rich' as const, kh: '🥦 បន្លែច្រើន', en: '🥦 Veggie Rich', zh: '🥦 多蔬菜', vipOnly: true },
            ].map((d) => {
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
                          '👑 តម្រងម្ហូបសុខភាព និងកាឡូរី គឺសម្រាប់សមាជិក VIP!',
                          '👑 Smart Nutrition & Calorie filters are reserved for VIP members!',
                          '👑 智能营养与热量筛选为 VIP 会员专属功能！'
                        ),
                        'info'
                      );
                      openUpgradeVipModal();
                      return;
                    }
                    setVipDietFilter(d.id);
                  }}
                  className={`px-2 py-1 rounded-xl font-bold whitespace-nowrap transition text-[10px] inline-flex items-center gap-1 cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'bg-white dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-amber-300/70 dark:border-slate-600'
                  }`}
                >
                  <span>{tr(language, d.kh, d.en, d.zh)}</span>
                  {isLocked && <Lock className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 no-scrollbar [-webkit-overflow-scrolling:touch]">
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

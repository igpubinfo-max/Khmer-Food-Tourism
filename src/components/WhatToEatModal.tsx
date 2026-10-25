import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Sparkles, Shuffle, Utensils, DollarSign, MapPin, 
  Star, Clock, ChefHat, Heart, Sun, Sunset, Moon, Coffee
} from 'lucide-react';
import { FoodItem } from '../types';
import { tr } from '../utils/i18n';
import { getLocalizedFood, getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

export const WhatToEatModal: React.FC = () => {
  const { 
    isWhatToEatModalOpen, setIsWhatToEatModalOpen, 
    foods, restaurants, language, setSelectedFood, 
    openAddToWishlist 
  } = useApp();

  // Filters: Budget, Category, Meal Time
  const [budgetFilter, setBudgetFilter] = useState<'all' | 'budget' | 'medium' | 'premium'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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
        slug: 'breakfast',
        labelKh: 'អាហារពេលព្រឹក',
        labelEn: 'Breakfast Recommendation',
        labelZh: '早餐美食推荐',
        icon: Coffee,
        accent: 'from-amber-500 to-orange-500'
      };
    } else if (hour >= 10 && hour < 14) {
      return {
        slug: 'lunch',
        labelKh: 'អាហារថ្ងៃត្រង់',
        labelEn: 'Lunch Recommendation',
        labelZh: '午餐美食推荐',
        icon: Sun,
        accent: 'from-emerald-500 to-teal-600'
      };
    } else if (hour >= 14 && hour < 17) {
      return {
        slug: 'afternoon',
        labelKh: 'អាហារសម្រន់ & បង្អែម',
        labelEn: 'Afternoon Treats',
        labelZh: '下午茶与甜点推荐',
        icon: Sparkles,
        accent: 'from-pink-500 to-rose-500'
      };
    } else if (hour >= 17 && hour < 22) {
      return {
        slug: 'dinner',
        labelKh: 'អាហារពេលល្ងាច',
        labelEn: 'Dinner Recommendation',
        labelZh: '晚餐美食推荐',
        icon: Sunset,
        accent: 'from-indigo-600 to-purple-600'
      };
    } else {
      return {
        slug: 'night',
        labelKh: 'អាហារពេលយប់',
        labelEn: 'Late Night Cravings',
        labelZh: '宵夜美食推荐',
        icon: Moon,
        accent: 'from-slate-700 to-slate-900'
      };
    }
  }, []);

  // Filter candidate dishes
  const matchingFoods = useMemo(() => {
    return foods.filter(food => {
      if (budgetFilter === 'budget' && food.priceUsd > 3.0) return false;
      if (budgetFilter === 'medium' && (food.priceUsd < 3.0 || food.priceUsd > 7.0)) return false;
      if (budgetFilter === 'premium' && food.priceUsd <= 7.0) return false;
      if (categoryFilter !== 'all' && food.categorySlug !== categoryFilter) return false;
      return true;
    });
  }, [foods, budgetFilter, categoryFilter]);

  // Active candidate list
  const activeDishList = matchingFoods.length > 0 ? matchingFoods : foods;

  // Pick a fresh random dish that hasn't been shown recently
  const pickRandomDish = (excludeId?: string): FoodItem => {
    if (activeDishList.length === 0) return foods[0];
    if (activeDishList.length === 1) return activeDishList[0];

    let unseenCandidates = activeDishList.filter(f => 
      f.id !== excludeId && !seenDishIdsRef.current.has(f.id)
    );

    if (unseenCandidates.length === 0) {
      seenDishIdsRef.current.clear();
      unseenCandidates = activeDishList.filter(f => f.id !== excludeId);
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
  }, [isWhatToEatModalOpen, budgetFilter, categoryFilter]);

  // Current active dish
  const currentDish: FoodItem = useMemo(() => {
    return activeDishList.find(f => f.id === currentDishId) || activeDishList[0] || foods[0];
  }, [activeDishList, currentDishId, foods]);

  const currentLoc = useMemo(
    () => (currentDish ? getLocalizedFood(currentDish, language) : null),
    [currentDish, language]
  );

  // 2 Distinct Alternative Dishes randomly picked from candidates
  const alternativeDishes = useMemo(() => {
    if (activeDishList.length <= 1) return [];
    const pool = activeDishList.filter(f => f.id !== currentDish?.id);
    if (pool.length === 0) return [];
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  }, [activeDishList, currentDish?.id]);

  // Find restaurants serving this dish
  const servingRestaurants = useMemo(() => {
    if (!currentDish) return [];
    return restaurants.filter(r => 
      r.signatureDishesKh?.some(d => d.includes(currentDish.nameKh) || currentDish.nameKh.includes(d))
    ).slice(0, 2);
  }, [restaurants, currentDish]);

  if (!isWhatToEatModalOpen) return null;

  const handleShowAnother = () => {
    setIsSpinning(true);
    setTimeout(() => {
      const nextDish = pickRandomDish(currentDish?.id);
      setCurrentDishId(nextDish.id);
      setIsSpinning(false);
    }, 280);
  };

  const MealIcon = currentMealInfo.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200 overscroll-none"
      onClick={() => setIsWhatToEatModalOpen(false)}
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden overscroll-contain"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#064E3B] to-[#047857] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-xs">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-moul text-sm text-white">
                  {tr(language, 'ថ្ងៃនេះញ៉ាំអ្វី?', 'What to Eat Today?', '今天吃什么？')}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-900 text-[10px] font-bold shadow-xs">
                  {tr(language, 'អាទិភាពខ្ពស់ ⭐', 'High Priority ⭐', '智能推荐 ⭐')}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-khmer">
                {tr(
                  language,
                  'AI ជួយស្នើម្ហូបប្លែកៗឆ្លាតវៃតាមថវិកា និងចំណង់ចំណូលចិត្ត',
                  `Smart AI recommendations from ${foods.length} authentic dishes`,
                  `AI 根据您的预算与口味从 ${foods.length} 道正宗高棉菜中智能推荐`
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsWhatToEatModalOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Mealtime Context Banner */}
        <div className="px-4 py-2 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border-b border-emerald-100/60 dark:border-slate-800 flex items-center justify-between text-xs font-khmer shrink-0">
          <div className="flex items-center gap-2 text-[#064E3B] dark:text-emerald-300 font-bold text-[11px]">
            <MealIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              {tr(
                language,
                `AI ណែនាំសម្រាប់ ${currentMealInfo.labelKh} ពេលនេះ`,
                `AI Pick for ${currentMealInfo.labelEn}`,
                `AI 当前时段推荐：${currentMealInfo.labelZh}`
              )}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono font-medium">
            {activeDishList.length} {tr(language, 'មុខម្ហូប', 'dishes', '道菜')}
          </span>
        </div>

        {/* Filters Bar */}
        <div className="p-3 bg-emerald-50/60 dark:bg-slate-800/60 border-b border-emerald-100 dark:border-slate-800 space-y-2 shrink-0">
          {/* Budget row */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-khmer">
            <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1 mr-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              {tr(language, 'ថវិកា៖', 'Budget:', '预算：')}
            </span>
            {[
              { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All', labelZh: '全部' },
              { id: 'budget', labelKh: '< $3 សន្សំសំចៃ', labelEn: '< $3 Budget', labelZh: '< $3 实惠' },
              { id: 'medium', labelKh: '$3-$7 មធ្យម', labelEn: '$3-$7 Medium', labelZh: '$3-$7 适中' },
              { id: 'premium', labelKh: '> $7 ពិសេស', labelEn: '> $7 Special', labelZh: '> $7 精品' },
            ].map(b => (
              <button
                key={b.id}
                onClick={() => setBudgetFilter(b.id as any)}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition text-[11px] ${
                  budgetFilter === b.id
                    ? 'bg-[#064E3B] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                }`}
              >
                {tr(language, b.labelKh, b.labelEn, b.labelZh)}
              </button>
            ))}
          </div>

          {/* Category row */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-khmer">
            <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1">
              {tr(language, 'ចំណូលចិត្ត៖', 'Category:', '分类：')}
            </span>
            {[
              { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All', labelZh: '全部' },
              { id: 'soup', labelKh: 'សម្ល/ស៊ុប', labelEn: 'Soup & Curry', labelZh: '汤品/咖喱' },
              { id: 'grilled', labelKh: 'អាំង/បំពង', labelEn: 'Grilled & Fried', labelZh: '烧烤/煎炸' },
              { id: 'stirfry', labelKh: 'ឆា', labelEn: 'Stir-Fry', labelZh: '热炒' },
              { id: 'salad', labelKh: 'ញាំ/ភ្លា', labelEn: 'Salads & Dips', labelZh: '凉拌/蘸酱' },
              { id: 'noodles', labelKh: 'គុយទាវ/នំបញ្ចុក', labelEn: 'Noodles', labelZh: '粉面' },
              { id: 'dessert', labelKh: 'បង្អែម', labelEn: 'Desserts', labelZh: '甜品' },
            ].map(c => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className={`px-2 py-1 rounded-xl font-bold whitespace-nowrap transition text-[10px] ${
                  categoryFilter === c.id
                    ? 'bg-[#059669] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                }`}
              >
                {tr(language, c.labelKh, c.labelEn, c.labelZh)}
              </button>
            ))}
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 no-scrollbar [-webkit-overflow-scrolling:touch]">
          {currentDish && currentLoc && (
            <div className={`transition-all duration-300 ${isSpinning ? 'opacity-30 scale-95 blur-[1px]' : 'opacity-100 scale-100'}`}>
              {/* Highlight Recommended Dish Card */}
              <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-md">
                <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img 
                    src={currentDish.photoUrl} 
                    alt={currentLoc.name} 
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  
                  {/* Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-amber-400 text-stone-900 text-xs font-black shadow-xs flex items-center gap-1 font-khmer">
                      <Sparkles className="w-3.5 h-3.5 fill-current text-amber-900" />
                      {tr(language, 'AI ស្នើឡើងសម្រាប់អ្នក!', 'AI Top Pick!', 'AI 为您精选！')}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold">
                      {currentLoc.category}
                    </span>
                  </div>

                  {/* Reference label */}
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white/80 text-[8px] px-1.5 py-0.5 rounded-xs font-khmer select-none">
                    {tr(language, 'រូបភាពយោង', 'Reference photo', '参考图片')}
                  </span>

                  {/* Title overlay */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h2 className="font-moul text-base sm:text-lg text-white drop-shadow">
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
                        <span>{tr(language, 'ហាងឆ្ងាញ់ៗដែលមានលក់ម្ហូបនេះ៖', 'Recommended restaurants serving this:', '推荐品尝此菜品的餐厅：')}</span>
                      </div>
                      {servingRestaurants.map(r => {
                        const rLoc = getLocalizedRestaurant(r, language);
                        return (
                          <div key={r.id} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-200">
                            <span className="font-bold truncate">{rLoc.name}</span>
                            <span className="text-[10px] text-slate-500 shrink-0">{rLoc.province}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions for current dish */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedFood(currentDish);
                        setIsWhatToEatModalOpen(false);
                      }}
                      className="flex-1 py-2.5 px-3 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl text-xs font-bold font-khmer shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <ChefHat className="w-4 h-4 text-emerald-300" />
                      <span>{tr(language, 'មើលរបៀបធ្វើ / រូបមន្ត', 'View Recipe Steps', '查看食谱与烹饪步骤')}</span>
                    </button>
                    <button
                      onClick={() => openAddToWishlist({
                        id: currentDish.id,
                        type: 'food',
                        nameKh: currentDish.nameKh,
                        nameEn: currentDish.nameEn,
                        photoUrl: currentDish.photoUrl,
                        categoryKh: currentDish.categoryKh,
                        priceDisplay: `${currentDish.calories} ${tr(language, 'គីឡូកាឡូរី', 'kcal', '千卡')}`,
                        rating: currentDish.rating,
                      })}
                      className="p-2.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 rounded-xl transition shadow-xs"
                      title={tr(language, 'ដាក់ក្នុងបញ្ជីចង់ញ៉ាំ', 'Add to Wishlist', '加入心愿单')}
                    >
                      <Heart className="w-4 h-4 fill-emerald-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alternative quick choices */}
          {alternativeDishes.length > 0 && (
            <div className="space-y-2 font-khmer">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{tr(language, 'ជម្រើសគួរពិចារណាផ្សេងទៀត៖', 'Other AI alternative picks:', '其他 AI 精选备选菜品：')}</span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {alternativeDishes.map(d => {
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
                      <img src={d.photoUrl} alt={dLoc.name} className="w-10 h-10 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform" />
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
            <span>{tr(language, '« បង្ហាញម្ហូបផ្សេងទៀត »', '« Show Another Dish »', '« 换一道菜 »')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { FoodImageModal } from './FoodImageModal';
import {
  FoodItem,
  KHMER_FOOD_PRIMARY_CATEGORIES,
  KhmerFoodPrimaryGroup,
  classifyKhmerFoodPrimaryGroup,
  organizeAndDeduplicateFoods
} from '../types';
import { Utensils, Plus, Sparkles, Globe, Check, HeartPulse, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp, Info, Share2, CalendarDays } from 'lucide-react';
import { shareText } from '../utils/shareApp';
import { searchOnlineFoodImages, OnlineFoodImageCandidate } from '../services/onlineFoodImageService';
import { tr } from '../utils/i18n';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';
import {
  HEALTHY_NUTRITION_CONDITIONS_DATA,
  NUTRITION_GUIDE_MEDICAL_DISCLAIMER,
  NutritionConditionId
} from '../data/healthyNutritionGuideData';

const PAGE_BATCH_SIZE = 48;

export const FoodView: React.FC = () => {
  const { foods, updateFood, showToast, language, searchQuery, setSearchQuery, currentUser, setIsAdminOpen, setSelectedFood, setIsAiFoodDiscoveryModalOpen } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_BATCH_SIZE);
  const [showOnlineSearchPanel, setShowOnlineSearchPanel] = useState<boolean>(true);
  const [selectedFoodIdForOnline, setSelectedFoodIdForOnline] = useState<string>('');
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);
  const [onlineCandidates, setOnlineCandidates] = useState<OnlineFoodImageCandidate[]>([]);
  const [editingFoodModal, setEditingFoodModal] = useState<FoodItem | null>(null);
  const [showNutritionGuide, setShowNutritionGuide] = useState<boolean>(false);
  const [selectedConditionId, setSelectedConditionId] = useState<NutritionConditionId>('diabetes');
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const isKm = language === 'km';
  const shareTip = (title: string, body: string) =>
    shareText(language, title, `💡 ${title}\n${body}`, showToast);
  const activeConditionGuide = useMemo(
    () =>
      HEALTHY_NUTRITION_CONDITIONS_DATA.find((c) => c.id === selectedConditionId) ||
      HEALTHY_NUTRITION_CONDITIONS_DATA[0],
    [selectedConditionId]
  );

  const activeFoodForOnline = useMemo(() => {
    if (selectedFoodIdForOnline) {
      const found = foods.find((f) => f.id === selectedFoodIdForOnline);
      if (found) return found;
    }
    return foods[0] || null;
  }, [foods, selectedFoodIdForOnline]);

  const handleRunOnlineFoodSearch = async (targetFood?: FoodItem | null) => {
    const food = targetFood || activeFoodForOnline;
    if (!food) return;
    setShowOnlineSearchPanel(true);
    setSelectedFoodIdForOnline(food.id);
    setIsSearchingOnline(true);
    try {
      const results = await searchOnlineFoodImages({
        nameKh: food.nameKh,
        nameEn: food.nameEn,
        categorySlug: food.categorySlug,
        existingUrls: food.photoUrl ? [food.photoUrl] : [],
      });
      setOnlineCandidates(results);
      if (results.length > 0) {
        showToast(
          isKm
            ? `✨ រកឃើញរូបភាពម្ហូបពី Online ចំនួន ${results.length} សន្លឹកសម្រាប់ «${food.nameKh}»!`
            : `✨ Found ${results.length} online photos for "${food.nameEn}"!`,
          'success'
        );
      }
    } catch {
      showToast(
        isKm ? 'មិនអាចស្វែងរករូបភាពពី Online បានទេ' : 'Failed to search online food photos',
        'warning'
      );
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleApplyCandidatePhoto = (cand: OnlineFoodImageCandidate) => {
    if (!activeFoodForOnline) return;
    updateFood({
      ...activeFoodForOnline,
      photoUrl: cand.url,
      imageAuditStatus: 'verified',
      imageAuditNote: `រូបភាពជ្រើសរើសពី Online (${cand.source})`,
    });
    showToast(
      isKm
        ? `✅ បានប្តូររូបភាព «${activeFoodForOnline.nameKh}» ពី Online រួចរាល់!`
        : `✅ Updated photo for "${activeFoodForOnline.nameEn}"!`,
      'success'
    );
  };

  useEffect(() => {
    setVisibleCount(PAGE_BATCH_SIZE);
  }, [selectedCategory, searchQuery]);

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
    { id: 'samlor', nameKh: '១. សម្ល', nameEn: '1. Samlor (Soup/Curry)', nameZh: '1. 传统汤与咖喱', emoji: '🍲' },
    { id: 'cha', nameKh: '២. ឆា', nameEn: '2. Cha (Stir-Fry)', nameZh: '2. 风味热炒', emoji: '🥘' },
    { id: 'sngor', nameKh: '៣. ស្ងោរ', nameEn: '3. Sngor (Boiled Soup)', nameZh: '3. 清炖鲜汤', emoji: '🥣' },
    { id: 'bong_aem', nameKh: '៤. បង្អែម', nameEn: '4. Bong Aem (Dessert)', nameZh: '4. 高棉甜品', emoji: '🍨' },
  ];

  const sectionZhMeta: Record<KhmerFoodPrimaryGroup, { titleZh: string; subtitleZh: string }> = {
    samlor: { titleZh: '1. 高棉传统浓汤与咖喱 (Samlor)', subtitleZh: '正宗高棉浓汤、阿莫克与红绿咖喱' },
    cha: { titleZh: '2. 高棉风味小炒与烤物 (Cha)', subtitleZh: '香茅热炒、摇摇牛肉、炙烤与凉拌菜' },
    sngor: { titleZh: '3. 清炖鲜汤、米粉与主食 (Sngor)', subtitleZh: '酸汤、清汤、高棉米粉与特色饭面' },
    bong_aem: { titleZh: '4. 传统高棉甜品与糕点 (Bong Aem)', subtitleZh: '椰奶甜汤、传统糕点与特色饮品' },
  };

  const filteredFoods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return organizedFoods.filter((f) => {
      if (selectedCategory !== 'all') {
        const grp = classifyKhmerFoodPrimaryGroup(f);
        if (grp !== selectedCategory && f.categorySlug !== selectedCategory) {
          return false;
        }
      }
      if (q) {
        const loc = getLocalizedFood(f, 'zh');
        const matchName =
          f.nameKh.toLowerCase().includes(q) ||
          f.nameEn.toLowerCase().includes(q) ||
          loc.name.toLowerCase().includes(q);
        const matchDesc =
          f.descriptionKh.toLowerCase().includes(q) ||
          f.descriptionEn.toLowerCase().includes(q) ||
          loc.description.toLowerCase().includes(q);
        const matchIng = f.ingredients.some(
          i => i.nameKh.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q)
        );
        if (!matchName && !matchDesc && !matchIng) return false;
      }
      return true;
    });
  }, [organizedFoods, selectedCategory, searchQuery]);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-moul text-sm sm:text-base text-[#0F172A] dark:text-white flex items-center gap-2">
            <Utensils className="w-4 h-4 text-[#059669]" />
            <span>
              {tr(language, 'វិចិត្រសាលមុខម្ហូបខ្មែរ (100+ មុខ)', 'Khmer Food Collection (100+ Dishes)', '高棉美食大全（100+ 道正宗菜品）')}
            </span>
          </h2>
          <p className="text-[11px] text-slate-500 font-khmer">
            {tr(
              language,
              `បង្ហាញ ${filteredFoods.length} លើ ${foods.length} មុខម្ហូបខ្មែរពិតៗ`,
              `Showing ${filteredFoods.length} of ${foods.length} authentic dishes`,
              `当前显示 ${filteredFoods.length} / ${foods.length} 道正宗高棉菜品`
            )}
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setIsAdminOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-xs font-khmer transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-200" />
            <span>{tr(language, 'បញ្ចូលម្ហូប', 'Add Food', '添加菜品')}</span>
          </button>
        )}
      </div>

      {/* Healthy Food & Disease-Friendly Nutrition Guide Banner & Expandable Panel */}
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50 via-white to-teal-50/80 dark:from-slate-800 dark:via-slate-900 dark:to-emerald-950/60 shadow-sm overflow-hidden font-khmer">
        <button
          type="button"
          onClick={() => setShowNutritionGuide((prev) => !prev)}
          className="w-full p-3.5 flex items-center justify-between gap-2.5 text-left hover:bg-emerald-500/5 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#064E3B] to-[#059669] text-white flex items-center justify-center shadow-sm shrink-0">
              <HeartPulse className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-[#064E3B] text-amber-300 text-[9px] font-black uppercase tracking-wide">
                  {tr(language, 'ពិនិត្យផ្ទៀងផ្ទាត់វេជ្ជសាស្ត្រ', 'Medically Reviewed', '医学营养审核')}
                </span>
                <h3 className="font-moul text-xs sm:text-sm text-[#064E3B] dark:text-emerald-300 truncate">
                  {tr(
                    language,
                    'មគ្គុទ្ទេសក៍អាហារសុខភាព និងរបបអាហារតាមជំងឺ',
                    'Healthy Food & Disease-Friendly Nutrition Guide',
                    '健康饮食与慢性病适宜膳食指南'
                  )}
                </h3>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                {tr(
                  language,
                  'ទឹកនោមផ្អែម • លើសសម្ពាធឈាម • លើសខ្លាញ់ • ហ្គោត • រលាកក្រពះ • ម្ហូបខ្មែរសមស្រប',
                  'Diabetes • High Blood Pressure • High Cholesterol • Gout • Gastritis • Cambodian Dishes',
                  '糖尿病 • 高血压 • 高血脂 • 痛风 • 胃炎 • 适宜高棉菜推荐'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#064E3B] text-white text-[10px] font-bold shrink-0 shadow-2xs">
            <span>{showNutritionGuide ? tr(language, 'បិទ', 'Hide', '收起') : tr(language, 'បើកមើល', 'Explore', '展开指南')}</span>
            {showNutritionGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showNutritionGuide && activeConditionGuide && (
          <div className="px-3.5 pb-4 pt-2 border-t border-emerald-500/20 space-y-3">
            {/* Condition Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {HEALTHY_NUTRITION_CONDITIONS_DATA.map((cond) => {
                const isSelected = cond.id === selectedConditionId;
                return (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => setSelectedConditionId(cond.id)}
                    className={`flex items-center gap-1.5 p-2 rounded-xl text-left border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#064E3B] text-white border-amber-400 shadow-xs font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    <span className="text-base shrink-0">{cond.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold leading-tight truncate">
                        {tr(language, cond.nameKh, cond.nameEn, cond.nameZh)}
                      </p>
                      <p className={`text-[9px] truncate ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                        {tr(language, cond.shortSubtitleKh, cond.shortSubtitleEn, cond.shortSubtitleZh)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Condition Overview */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-emerald-500/25 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-xs text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
                  <span>{activeConditionGuide.emoji}</span>
                  <span>{tr(language, activeConditionGuide.nameKh, activeConditionGuide.nameEn, activeConditionGuide.nameZh)}</span>
                </h4>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {activeConditionGuide.trustedSources.join(' • ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                {tr(language, activeConditionGuide.overviewKh, activeConditionGuide.overviewEn, activeConditionGuide.overviewZh)}
              </p>
              <div className="space-y-1 pt-1">
                {(language === 'km'
                  ? activeConditionGuide.keyNutritionalPrinciplesKh
                  : language === 'zh'
                  ? activeConditionGuide.keyNutritionalPrinciplesZh
                  : activeConditionGuide.keyNutritionalPrinciplesEn
                ).map((principle, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[10px] text-emerald-900 dark:text-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{principle}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 1. Healthy Foods to Choose */}
            <div className="space-y-1.5">
              <h5 className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {tr(
                    language,
                    '១. អាហារសុខភាពដែលគួរជ្រើសរើស និងអត្ថប្រយោជន៍អាហារូបត្ថម្ភ៖',
                    '1. Healthy Foods to Choose & Nutritional Benefits:',
                    '1. 推荐选择的健康食材与营养益处：'
                  )}
                </span>
              </h5>
              <div className="grid grid-cols-1 gap-2">
                {activeConditionGuide.healthyFoodsToChoose.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/25 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[11px] text-[#064E3B] dark:text-emerald-200">
                        {item.emoji} {tr(language, item.nameKh, item.nameEn, item.nameZh)}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                          ✓ {tr(language, 'គួរញ៉ាំច្រើន', 'Eat More', '多吃')}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            shareTip(
                              `${tr(language, item.nameKh, item.nameEn, item.nameZh)} — ${tr(language, activeConditionGuide.nameKh, activeConditionGuide.nameEn, activeConditionGuide.nameZh)}`,
                              tr(language, item.nutritionalBenefitKh, item.nutritionalBenefitEn, item.nutritionalBenefitZh)
                            )
                          }
                          className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-emerald-300 text-emerald-700 flex items-center justify-center cursor-pointer active:scale-95"
                          title={tr(language, 'ចែករំលែកគន្លឹះ', 'Share Tip', '分享小贴士')}
                          aria-label={tr(language, 'ចែករំលែកគន្លឹះ', 'Share Tip', '分享小贴士')}
                        >
                          <Share2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      🔬 {tr(language, item.keyNutrientsKh, item.keyNutrientsEn, item.keyNutrientsZh)}
                    </p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {tr(language, item.nutritionalBenefitKh, item.nutritionalBenefitEn, item.nutritionalBenefitZh)}
                    </p>
                    <p className="text-[9px] text-emerald-800 dark:text-emerald-300 font-semibold">
                      🍽️ {tr(language, item.portionTipKh, item.portionTipEn, item.portionTipZh)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Suitable Cambodian Dishes */}
            <div className="space-y-1.5">
              <h5 className="text-[11px] font-extrabold text-[#064E3B] dark:text-amber-300 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {tr(
                    language,
                    '២. មុខម្ហូបខ្មែរសមស្រប និងតិចនិកចម្អិនដើម្បីសុខភាព៖',
                    '2. Suitable Cambodian Dishes & Healthy Cooking Modifications:',
                    '2. 适宜的高棉传统菜肴与健康烹饪建议：'
                  )}
                </span>
              </h5>
              <div className="grid grid-cols-1 gap-2">
                {activeConditionGuide.suitableCambodianDishes.map((dish) => {
                  const matchedFood = foods.find((f) => f.id === dish.foodId);
                  return (
                    <div
                      key={dish.foodId}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-400/40 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[11px] text-slate-900 dark:text-white">
                          🍲 {tr(language, dish.nameKh, dish.nameEn, dish.nameZh)}
                        </span>
                        {matchedFood && (
                          <button
                            type="button"
                            onClick={() => setSelectedFood(matchedFood)}
                            className="px-2 py-0.5 rounded-lg bg-[#064E3B] hover:bg-[#047857] text-amber-300 text-[9px] font-bold shrink-0 cursor-pointer transition"
                          >
                            {tr(language, 'មើលរូបមន្តពេញ', 'View Recipe', '查看完整食谱')}
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        <strong className="text-emerald-700 dark:text-emerald-300">
                          {tr(language, 'អត្ថប្រយោជន៍៖ ', 'Why it suits: ', '适宜原因：')}
                        </strong>
                        {tr(language, dish.whySuitableKh, dish.whySuitableEn, dish.whySuitableZh)}
                      </p>
                      <p className="text-[10px] text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-400/20">
                        💡 {tr(language, dish.healthyCookingModificationKh, dish.healthyCookingModificationEn, dish.healthyCookingModificationZh)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Foods to Limit or Avoid */}
            <div className="space-y-1.5">
              <h5 className="text-[11px] font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>
                  {tr(
                    language,
                    '៣. អាហារដែលគួរកាត់បន្ថយ ឬជៀសវាង៖',
                    '3. Foods to Limit or Avoid:',
                    '3. 建议减少或避免的食物：'
                  )}
                </span>
              </h5>
              <div className="grid grid-cols-1 gap-1.5">
                {activeConditionGuide.foodsToLimitOrAvoid.map((avoid, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-400/30 space-y-0.5"
                  >
                    <p className="font-bold text-[11px] text-rose-800 dark:text-rose-200">
                      {avoid.emoji} {tr(language, avoid.nameKh, avoid.nameEn, avoid.nameZh)}
                    </p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {tr(language, avoid.reasonToLimitKh, avoid.reasonToLimitEn, avoid.reasonToLimitZh)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Medical Disclaimer & Individual Variation Note */}
            <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-slate-800/90 border border-amber-400/50 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-900 dark:text-amber-300">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  {tr(
                    language,
                    NUTRITION_GUIDE_MEDICAL_DISCLAIMER.titleKh,
                    NUTRITION_GUIDE_MEDICAL_DISCLAIMER.titleEn,
                    NUTRITION_GUIDE_MEDICAL_DISCLAIMER.titleZh
                  )}
                </span>
              </div>
              <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-relaxed">
                {tr(
                  language,
                  activeConditionGuide.individualVariationNoteKh,
                  activeConditionGuide.individualVariationNoteEn,
                  activeConditionGuide.individualVariationNoteZh
                )}
              </p>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {tr(
                  language,
                  NUTRITION_GUIDE_MEDICAL_DISCLAIMER.bodyKh,
                  NUTRITION_GUIDE_MEDICAL_DISCLAIMER.bodyEn,
                  NUTRITION_GUIDE_MEDICAL_DISCLAIMER.bodyZh
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Prominent Online Food Photo Auto-Search Card (ឥតគិតថ្លៃ $0) - ADMIN ONLY per Requirement #1 */}
      {currentUser?.role === 'admin' && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#064E3B] via-emerald-900 to-teal-900 text-white border-2 border-amber-400/60 shadow-lg space-y-2.5 font-khmer">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-amber-300 leading-snug">
                  {isKm
                    ? 'ស្វែងរក និងប្តូររូបភាពម្ហូបពី Online ដោយស្វ័យប្រវត្តិ (Admin)'
                    : 'Auto-Search & Match Food Photos Online (Admin)'}
                </h3>
                <p className="text-[10px] text-emerald-200">
                  {isKm
                    ? 'Wikimedia Commons • TheMealDB • ឥតគិតថ្លៃ $0'
                    : 'Wikimedia Commons • TheMealDB • 100% Free ($0)'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shrink-0">
              {isKm ? 'ឥតគិតថ្លៃ $0' : 'FREE $0'}
            </span>
          </div>

          <button
            type="button"
            disabled={isSearchingOnline}
            onClick={() => handleRunOnlineFoodSearch(activeFoodForOnline)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 text-slate-950 shrink-0 ${isSearchingOnline ? 'animate-spin' : ''}`} />
            <span>
              {isSearchingOnline
                ? (isKm ? 'កំពុងស្វែងរករូបភាពម្ហូបពី Online...' : 'Searching online food photos...')
                : (isKm
                    ? '🤖 ស្វែងរករូបភាពម្ហូបពី Online ដោយស្វ័យប្រវត្តិ (ឥតគិតថ្លៃ $0)'
                    : '🤖 Auto-Search Matching Food Photos Online (Free $0)')}
            </span>
          </button>

          {showOnlineSearchPanel && activeFoodForOnline && (
            <div className="pt-2 border-t border-white/15 space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={activeFoodForOnline.id}
                  onChange={(e) => {
                    const nextFood = foods.find((f) => f.id === e.target.value);
                    setSelectedFoodIdForOnline(e.target.value);
                    if (nextFood) {
                      handleRunOnlineFoodSearch(nextFood);
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900/90 border border-emerald-400/40 text-white text-xs font-bold focus:outline-none"
                >
                  {foods.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nameKh} ({f.nameEn})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setEditingFoodModal(activeFoodForOnline)}
                  className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-amber-200 font-bold text-[11px] border border-amber-300/30 transition cursor-pointer shrink-0"
                >
                  {isKm ? '⚙️ បើកផ្ទាំងគ្រប់គ្រងរូបពេញ' : '⚙️ Open Full Photo Editor'}
                </button>
              </div>

              {onlineCandidates.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-amber-200">
                    {isKm
                      ? `✨ រកឃើញរូបភាពម្ហូបពី Online ចំនួន ${onlineCandidates.length} សន្លឹកសម្រាប់ «${activeFoodForOnline.nameKh}» (ចុចជ្រើសរើស)៖`
                      : `✨ Found ${onlineCandidates.length} matching photos for "${activeFoodForOnline.nameEn}" (tap to apply):`}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {onlineCandidates.map((cand, idx) => {
                      const isSelected = activeFoodForOnline.photoUrl === cand.url;
                      return (
                        <button
                          key={`${cand.url}-${idx}`}
                          type="button"
                          onClick={() => handleApplyCandidatePhoto(cand)}
                          className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition cursor-pointer group ${
                            isSelected
                              ? 'border-amber-400 ring-2 ring-amber-400/50'
                              : 'border-white/20 hover:border-amber-300'
                          }`}
                        >
                          <img
                            src={cand.url}
                            alt={cand.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                          {cand.confidenceScore && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-emerald-900/90 text-amber-300 text-[8px] font-black font-mono border border-amber-400/40">
                              #{idx + 1} • {cand.confidenceScore}%
                            </span>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-black/80 text-white text-[9px] px-1.5 py-0.5 truncate font-khmer">
                            {cand.title || cand.source}
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ordered Primary Category Pills: ទាំងអស់ | ១. សម្ល | ២. ឆា | ៣. ស្ងោរ | ៤. បង្អែម */}
      <div className="bg-white dark:bg-slate-800/90 p-2 rounded-2xl border border-emerald-500/20 shadow-2xs space-y-2 font-khmer">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-[#064E3B] dark:text-emerald-300">
            {tr(
              language,
              '📂 បញ្ជីមុខម្ហូបតាមផ្នែក (សម្ល • ឆា • ស្ងោរ • បង្អែម)៖',
              '📂 Browse by Category (Samlor • Cha • Sngor • Dessert):',
              '📂 按分类浏览菜品（浓汤 • 热炒 • 清炖 • 甜品）：'
            )}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
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
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all duration-150 cursor-pointer border ${
                  active
                    ? 'bg-gradient-to-b from-[#064E3B] to-[#047857] text-white font-black border-amber-400 shadow-sm scale-[1.02]'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-emerald-50/60'
                }`}
              >
                <span className="text-sm leading-none mb-1">{cat.emoji}</span>
                <span className="text-[10px] sm:text-[11px] leading-tight truncate w-full">
                  {tr(language, cat.nameKh, cat.nameEn.split(' (')[0], cat.nameZh)}
                </span>
                <span
                  className={`mt-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
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

      {/* Foods Grid Grouped by Category in Order: សម្ល -> ឆា -> ស្ងោរ -> បង្អែម */}
      {filteredFoods.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2 font-khmer shadow-xs">
          <Utensils className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs text-slate-500 font-medium">
            {tr(language, 'មិនមានមុខម្ហូបដែលត្រូវគ្នានឹងការស្វែងរកទេ', 'No matching dishes found', '未找到匹配的菜品')}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-1 text-xs text-[#064E3B] font-bold hover:underline"
            >
              {tr(language, 'សម្អាតការស្វែងរក', 'Clear search', '清除搜索')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedDisplayedSections.map((section) => {
            const zhMeta = sectionZhMeta[section.meta.id];
            return (
              <div key={section.meta.id} className="space-y-2.5">
                {/* Category Section Banner Header */}
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#064E3B] via-[#047857] to-emerald-700 text-white shadow-sm border border-emerald-400/30 font-khmer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-lg shrink-0 border border-white/20">
                      {section.meta.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[10px] font-black">
                          {tr(language, `ផ្នែកទី ${section.meta.order}`, `Category #${section.meta.order}`, `第 ${section.meta.order} 类`)}
                        </span>
                        <h3 className="font-moul text-xs sm:text-sm text-white truncate">
                          {tr(language, section.meta.shortNameKh, section.meta.nameEn, zhMeta?.titleZh || section.meta.nameEn)}
                        </h3>
                      </div>
                      <p className="text-[10px] text-emerald-100 truncate mt-0.5">
                        {tr(language, section.meta.subtitleKh, section.meta.subtitleEn, zhMeta?.subtitleZh || section.meta.subtitleEn)}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold shrink-0 border border-white/25">
                    {section.totalInCategory} {tr(language, 'មុខ', 'items', '道菜')}
                  </span>
                </div>

                {/* Dishes in this category */}
                <div className="grid grid-cols-2 gap-3">
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
                className="px-4 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold shadow-sm font-khmer cursor-pointer transition"
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

      {editingFoodModal && (
        <FoodImageModal
          food={editingFoodModal}
          isOpen={Boolean(editingFoodModal)}
          onClose={() => setEditingFoodModal(null)}
          onSave={(updated) => {
            updateFood(updated);
            setEditingFoodModal(null);
            showToast(
              isKm ? '✅ បានរក្សាទុករូបភាពមុខម្ហូបរួចរាល់!' : '✅ Food photo saved!',
              'success'
            );
          }}
          isKm={isKm}
        />
      )}
    </div>
  );
};

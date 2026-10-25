import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  HeartPulse,
  Utensils,
  Search,
  ChevronRight,
  RefreshCw,
  Droplets,
  ShieldCheck,
  Leaf,
  Calendar,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Info,
} from 'lucide-react';
import { FoodItem } from '../types';
import {
  HEALTH_GOALS_CATALOG,
  KHMER_SUPERFOODS_ENCYCLOPEDIA,
  HealthGoalId,
  getRecommendedDishesByHealthGoal,
  generateBalancedDailyMealPlan,
  searchByHomeIngredients,
  HEALTHY_NUTRITION_CONDITIONS_DATA,
  NUTRITION_GUIDE_MEDICAL_DISCLAIMER,
  NutritionConditionId,
} from '../services/aiFoodService';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';

const COMMON_HEALTHY_KHMER_INGREDIENTS = [
  'ស្លឹកម្រុំ',
  'ត្រីរ៉ស់',
  'សាច់មាន់',
  'ស្លឹកគ្រៃ',
  'រមៀត',
  'ខ្ញី',
  'រំដេង',
  'ល្ហុង',
  'ត្រកួន',
  'ម្រះ',
  'បង្គា',
  'ស៊ុតមាន់',
  'សាច់គោ',
  'ស្លឹកក្រូចសើច',
  'ខ្ទឹមស',
  'ត្រប់',
  'ល្ពៅ',
  'សណ្តែកគួរ',
];

export const AiFoodDiscoveryModal: React.FC = () => {
  const {
    isAiFoodDiscoveryModalOpen,
    setIsAiFoodDiscoveryModalOpen,
    foods,
    language,
    showToast,
    setSelectedFood,
  } = useApp();

  // Support Khmer ('km'), English ('en'), and Simplified Chinese ('zh')
  const [assistantLang, setAssistantLang] = useState<'km' | 'en' | 'zh'>(() =>
    language === 'zh' ? 'zh' : language === 'en' ? 'en' : 'km'
  );

  useEffect(() => {
    if (language === 'km' || language === 'en' || language === 'zh') {
      setAssistantLang(language);
    }
  }, [language]);

  const isKm = assistantLang === 'km';
  const isZh = assistantLang === 'zh';
  const tr = (km: string, en: string, zh: string) => (isKm ? km : isZh ? zh : en);

  // 5 Main Structured Tabs of the Healthy Food & Disease-Friendly Nutrition Guide
  const [activeTab, setActiveTab] = useState<
    'condition_guide' | 'healthy_dishes' | 'meal_plan' | 'ingredients' | 'superfoods'
  >('condition_guide');

  // Tab 1: Medically Reviewed Disease-Friendly Nutrition Guide state
  const [selectedConditionId, setSelectedConditionId] =
    useState<NutritionConditionId>('diabetes');

  const activeCondition = useMemo(
    () =>
      HEALTHY_NUTRITION_CONDITIONS_DATA.find((c) => c.id === selectedConditionId) ||
      HEALTHY_NUTRITION_CONDITIONS_DATA[0],
    [selectedConditionId]
  );

  // Tab 2: Healthy Dishes & Nutrition Filter States
  const [selectedGoal, setSelectedGoal] = useState<HealthGoalId>('all');
  const [dishSearchQuery, setDishSearchQuery] = useState<string>('');
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null);

  // Tab 3: Balanced Daily Meal Planner (3 Meals) States
  const [mealPlanGoal, setMealPlanGoal] = useState<HealthGoalId>('weight_loss');
  const [mealPlanIndex, setMealPlanIndex] = useState<number>(0);

  // Tab 4: Healthy Home Ingredients Matcher States
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([
    'ត្រីរ៉ស់',
    'ស្លឹកម្រុំ',
    'ស្លឹកគ្រៃ',
  ]);
  const [customIngredientInput, setCustomIngredientInput] = useState<string>('');

  // Computed Healthy Dishes List
  const healthyDishesList = useMemo(
    () => getRecommendedDishesByHealthGoal(selectedGoal, foods, dishSearchQuery),
    [selectedGoal, foods, dishSearchQuery]
  );

  // Computed Daily 3-Meal Balanced Plan
  const dailyMealPlan = useMemo(
    () => generateBalancedDailyMealPlan(mealPlanGoal, foods, mealPlanIndex),
    [mealPlanGoal, foods, mealPlanIndex]
  );

  // Computed Home Ingredients Match Results
  const ingredientMatchResults = useMemo(
    () => searchByHomeIngredients(selectedIngredients, foods),
    [selectedIngredients, foods]
  );

  if (!isAiFoodDiscoveryModalOpen) return null;

  const handleClose = () => {
    setIsAiFoodDiscoveryModalOpen(false);
  };

  const handleOpenDishRecipe = (food: FoodItem) => {
    setSelectedFood(food);
  };

  const toggleIngredient = (ing: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing]
    );
  };

  const handleAddCustomIngredient = () => {
    const val = customIngredientInput.trim();
    if (!val) return;
    if (!selectedIngredients.includes(val)) {
      setSelectedIngredients((prev) => [...prev, val]);
    }
    setCustomIngredientInput('');
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-emerald-500/30 overflow-hidden flex flex-col max-h-[94vh] font-khmer animate-in fade-in zoom-in-95 duration-200">
        {/* Top Royal Emerald & Gold Header */}
        <div className="bg-gradient-to-r from-[#064E3B] via-emerald-800 to-teal-900 text-white px-4 py-3.5 flex items-center justify-between border-b border-amber-400/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shrink-0 ring-2 ring-white/30">
              <HeartPulse className="w-6 h-6 stroke-[2.4]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="font-moul text-sm sm:text-base text-amber-300 truncate">
                  {tr(
                    'មគ្គុទ្ទេសក៍អាហារសុខភាព និងរបបអាហារតាមជំងឺ',
                    'Healthy Food & Disease-Friendly Nutrition Guide',
                    '健康饮食与慢性病适宜膳食指南'
                  )}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-[10px] font-bold">
                  {tr('ខ្មែរ • EN • 中文', 'KM • EN • ZH', '中文 • ខ្មែរ • EN')}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 truncate">
                {tr(
                  'ការណែនាំអាហារសុខភាព អាហារគួរជៀសវាង និងម្ហូបខ្មែរសមស្របតាមស្ថានភាពសុខភាព',
                  'Medically reviewed food recommendations, foods to limit & suitable Cambodian dishes',
                  '经医学审核的健康食材推荐、饮食禁忌与慢性病适宜柬埔寨菜肴指南'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 3-Language Switcher Pills inside Header */}
            <div className="hidden sm:flex items-center bg-black/25 p-0.5 rounded-xl border border-white/15">
              {(
                [
                  { code: 'km', label: 'ខ្មែរ' },
                  { code: 'en', label: 'EN' },
                  { code: 'zh', label: '中文' },
                ] as const
              ).map((l) => (
                <button
                  key={l.code}
                  onClick={() => setAssistantLang(l.code)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                    assistantLang === l.code
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 5 Interactive Navigation Tabs */}
        <div className="bg-emerald-950/95 px-2.5 py-2 flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar border-b border-emerald-800/60 shrink-0">
          <div className="flex items-center gap-1.5">
            {[
              {
                id: 'condition_guide',
                icon: HeartPulse,
                labelKh: '🩺 របបអាហារតាមជំងឺ',
                labelEn: '🩺 Disease Diet Guide',
                labelZh: '🩺 慢病膳食指南',
              },
              {
                id: 'healthy_dishes',
                icon: Utensils,
                labelKh: '🥗 ម្ហូបសុខភាព',
                labelEn: '🥗 Healthy Dishes',
                labelZh: '🥗 健康菜肴',
              },
              {
                id: 'meal_plan',
                icon: Calendar,
                labelKh: '📅 ផែនការ ៣ ពេល',
                labelEn: '📅 3-Meal Plan',
                labelZh: '📅 三餐计划',
              },
              {
                id: 'ingredients',
                icon: Search,
                labelKh: '🧺 គ្រឿងផ្សំក្នុងផ្ទះ',
                labelEn: '🧺 Home Ingredients',
                labelZh: '🧺 家常食材匹配',
              },
              {
                id: 'superfoods',
                icon: Leaf,
                labelKh: '🌿 ឱសថគ្រឿងទេសខ្មែរ',
                labelEn: '🌿 Khmer Herbs',
                labelZh: '🌿 柬埔寨草本',
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md'
                      : 'bg-white/10 text-emerald-100 hover:bg-white/15'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tr(tab.labelKh, tab.labelEn, tab.labelZh)}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Language Switcher */}
          <div className="flex sm:hidden items-center bg-black/30 p-0.5 rounded-xl border border-white/15 shrink-0">
            {(
              [
                { code: 'km', label: 'ខ្មែរ' },
                { code: 'en', label: 'EN' },
                { code: 'zh', label: '中文' },
              ] as const
            ).map((l) => (
              <button
                key={l.code}
                onClick={() => setAssistantLang(l.code)}
                className={`px-1.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                  assistantLang === l.code
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-emerald-100'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 bg-slate-50">
          {/* ===================================================================
              TAB 1: STRUCTURED HEALTHY FOOD & DISEASE-FRIENDLY NUTRITION GUIDE
             =================================================================== */}
          {activeTab === 'condition_guide' && activeCondition && (
            <div className="space-y-4">
              {/* Condition Selector Grid */}
              <div className="p-3.5 rounded-2xl bg-white border border-emerald-500/30 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-[#064E3B] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>
                      {tr(
                        'ជ្រើសរើសស្ថានភាពសុខភាព ដើម្បីមើលការណែនាំអាហារូបត្ថម្ភ៖',
                        'Select a Health Condition for Food & Nutrition Guidance:',
                        '请选择健康状况，查看循证营养与高棉膳食建议：'
                      )}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                    {tr(
                      'ណែនាំអាហារសុទ្ធសាធ • គ្មានវេជ្ជបញ្ជាថ្នាំ',
                      'Food Guidance Only • No Medication Advice',
                      '纯饮食营养建议 • 不含药物处方'
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {HEALTHY_NUTRITION_CONDITIONS_DATA.map((cond) => {
                    const selected = cond.id === selectedConditionId;
                    return (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() => setSelectedConditionId(cond.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                          selected
                            ? 'bg-gradient-to-r from-[#064E3B] to-emerald-800 text-white border-amber-400 shadow-sm'
                            : 'bg-slate-50 hover:bg-emerald-50/70 text-slate-800 border-slate-200'
                        }`}
                      >
                        <span className="text-xl shrink-0">{cond.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold leading-tight truncate">
                            {tr(cond.nameKh, cond.nameEn, cond.nameZh)}
                          </p>
                          <p
                            className={`text-[10px] truncate mt-0.5 ${
                              selected ? 'text-amber-200' : 'text-slate-500'
                            }`}
                          >
                            {tr(cond.shortSubtitleKh, cond.shortSubtitleEn, cond.shortSubtitleZh)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Condition Overview & Core Nutritional Principles */}
              <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500/40 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-moul text-xs sm:text-sm text-[#064E3B] flex items-center gap-2">
                    <span>{activeCondition.emoji}</span>
                    <span>
                      {tr(activeCondition.nameKh, activeCondition.nameEn, activeCondition.nameZh)}
                    </span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                    📚 {activeCondition.trustedSources.join(' • ')}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80">
                  {tr(
                    activeCondition.overviewKh,
                    activeCondition.overviewEn,
                    activeCondition.overviewZh
                  )}
                </p>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-extrabold text-slate-900">
                    {tr(
                      '📌 គោលការណ៍អាហារូបត្ថម្ភសំខាន់ៗ៖',
                      '📌 Key Nutritional Principles:',
                      '📌 核心营养膳食原则：'
                    )}
                  </h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(isKm
                      ? activeCondition.keyNutritionalPrinciplesKh
                      : isZh
                      ? activeCondition.keyNutritionalPrinciplesZh
                      : activeCondition.keyNutritionalPrinciplesEn
                    ).map((principle, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 flex items-start gap-2 leading-relaxed"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{principle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 1. Healthy Foods to Choose & Nutritional Benefits */}
              <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-3">
                <h4 className="text-xs sm:text-sm font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {tr(
                      '១. អាហារសុខភាពដែលគួរជ្រើសរើស និងអត្ថប្រយោជន៍អាហារូបត្ថម្ភ',
                      '1. Healthy Foods to Choose & Nutritional Benefits',
                      '1. 推荐优先选择的健康食物与营养益处'
                    )}
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeCondition.healthyFoodsToChoose.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/90 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-extrabold text-[#064E3B]">
                          {item.emoji} {tr(item.nameKh, item.nameEn, item.nameZh)}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-emerald-800">
                        🔬 {tr(item.keyNutrientsKh, item.keyNutrientsEn, item.keyNutrientsZh)}
                      </p>
                      <p className="text-[11px] text-slate-700 leading-relaxed">
                        {tr(
                          item.nutritionalBenefitKh,
                          item.nutritionalBenefitEn,
                          item.nutritionalBenefitZh
                        )}
                      </p>
                      <p className="text-[10px] font-semibold text-teal-900 bg-white/90 px-2 py-1 rounded-lg border border-emerald-200/60">
                        🍽️ {tr(item.portionTipKh, item.portionTipEn, item.portionTipZh)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Suitable Cambodian Dishes */}
              <div className="p-4 rounded-2xl bg-white border border-amber-300/80 shadow-xs space-y-3">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {tr(
                      '២. មុខម្ហូបខ្មែរសមស្រប និងតិចនិកចម្អិនដើម្បីសុខភាព',
                      '2. Suitable Cambodian Dishes & Healthy Cooking Tips',
                      '2. 适宜的柬埔寨传统菜肴与健康烹饪方法'
                    )}
                  </span>
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {activeCondition.suitableCambodianDishes.map((dish) => {
                    const matchedFood = foods.find((f) => f.id === dish.foodId);
                    return (
                      <div
                        key={dish.foodId}
                        className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/90 flex flex-col sm:flex-row items-start gap-3"
                      >
                        {matchedFood && (
                          <img
                            src={matchedFood.photoUrl}
                            alt={matchedFood.nameKh}
                            className="w-20 h-20 rounded-xl object-cover shrink-0 border border-amber-200"
                          />
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h5 className="text-xs sm:text-sm font-extrabold text-slate-900">
                              🍲 {tr(dish.nameKh, dish.nameEn, dish.nameZh)}
                            </h5>
                            {matchedFood && (
                              <button
                                type="button"
                                onClick={() => handleOpenDishRecipe(matchedFood)}
                                className="px-2.5 py-1 rounded-lg bg-[#064E3B] hover:bg-[#047857] text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                              >
                                <span>{tr('មើលរូបមន្តពេញ', 'View Recipe', '查看完整食谱')}</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-700 leading-relaxed">
                            <strong className="text-emerald-800">
                              {tr('អត្ថប្រយោជន៍៖ ', 'Why it is suitable: ', '适宜原因：')}
                            </strong>
                            {tr(dish.whySuitableKh, dish.whySuitableEn, dish.whySuitableZh)}
                          </p>
                          <p className="text-[11px] text-amber-950 bg-amber-100/70 px-2.5 py-1 rounded-lg border border-amber-300/60">
                            👩‍🍳{' '}
                            {tr(
                              dish.healthyCookingModificationKh,
                              dish.healthyCookingModificationEn,
                              dish.healthyCookingModificationZh
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Foods to Limit or Avoid */}
              <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-3">
                <h4 className="text-xs sm:text-sm font-extrabold text-rose-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    {tr(
                      '៣. អាហារដែលគួរកាត់បន្ថយ ឬជៀសវាង',
                      '3. Foods to Limit or Avoid',
                      '3. 建议减少或避免食用的食物'
                    )}
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeCondition.foodsToLimitOrAvoid.map((avoid, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1"
                    >
                      <p className="text-xs font-extrabold text-rose-900">
                        {avoid.emoji} {tr(avoid.nameKh, avoid.nameEn, avoid.nameZh)}
                      </p>
                      <p className="text-[11px] text-slate-700 leading-relaxed">
                        {tr(
                          avoid.reasonToLimitKh,
                          avoid.reasonToLimitEn,
                          avoid.reasonToLimitZh
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hydration & Individual Variation Notice */}
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 space-y-2 text-xs text-sky-950">
                <p className="font-bold flex items-start gap-1.5 leading-relaxed">
                  <Droplets className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    {tr(
                      activeCondition.dailyHydrationTipKh,
                      activeCondition.dailyHydrationTipEn,
                      activeCondition.dailyHydrationTipZh
                    )}
                  </span>
                </p>
                <p className="text-[11px] text-slate-700 pt-1.5 border-t border-sky-200/80 flex items-start gap-1.5 leading-relaxed">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    {tr(
                      activeCondition.individualVariationNoteKh,
                      activeCondition.individualVariationNoteEn,
                      activeCondition.individualVariationNoteZh
                    )}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 2: HEALTHY CAMBODIAN DISHES & NUTRITION ANALYZER (200 DISHES)
             =================================================================== */}
          {activeTab === 'healthy_dishes' && (
            <div className="space-y-3.5">
              {/* Goal Selector Pills */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-800 block">
                  {tr(
                    '🎯 ជ្រើសរើសគោលដៅសុខភាពរបស់អ្នក៖',
                    '🎯 Filter Cambodian Dishes by Health Goal:',
                    '🎯 按健康目标筛选柬埔寨菜肴：'
                  )}
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {HEALTH_GOALS_CATALOG.map((g) => {
                    const active = selectedGoal === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGoal(g.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                          active
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50'
                        }`}
                      >
                        <span>{g.icon}</span>
                        <span>{isKm ? g.shortLabelKh : g.shortLabelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Bar for Any of the 200 Dishes */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={dishSearchQuery}
                  onChange={(e) => setDishSearchQuery(e.target.value)}
                  placeholder={tr(
                    'ស្វែងរកមុខម្ហូប ឬគ្រឿងផ្សំ (ក្នុងចំណោម ២០០ មុខម្ហូបខ្មែរ)...',
                    'Search any of the 200 Cambodian dishes for nutrition facts...',
                    '在 200 道柬埔寨菜肴中搜索营养成分...'
                  )}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Dish Nutrition Cards */}
              <div className="space-y-2.5">
                {healthyDishesList.slice(0, 24).map(({ food, nutrition }) => {
                  const isExpanded = expandedDishId === food.id;
                  const locFood = getLocalizedFood(food, assistantLang);
                  return (
                    <div
                      key={food.id}
                      className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-400 transition space-y-2.5"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={food.photoUrl}
                          alt={food.nameKh}
                          className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-200"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                                {tr(food.nameKh, food.nameEn, locFood.name)}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {isKm ? food.nameEn : food.nameKh}
                              </p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold shrink-0">
                              ❤️ {nutrition.healthScore}/100
                            </span>
                          </div>

                          {/* Macro Pills */}
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            <span className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold">
                              🔥 {nutrition.caloriesKcal} kcal
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-bold">
                              💪 {tr('ប្រូតេអ៊ីន', 'Protein', '蛋白质')} {nutrition.proteinG}g
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-[10px] font-bold">
                              🌿 {tr('ជាតិសរសៃ', 'Fiber', '膳食纤维')} {nutrition.fiberG}g
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              🍚 {nutrition.carbsG}g • {nutrition.fatG}g fat
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Health Benefits & Cooking Tip */}
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs text-slate-700 space-y-1">
                        <p>
                          <strong className="text-emerald-900">
                            {tr('✨ អត្ថប្រយោជន៍សុខភាព៖ ', '✨ Health Benefit: ', '✨ 健康益处：')}
                          </strong>
                          {tr(
                            nutrition.healthBenefitsKh,
                            nutrition.healthBenefitsEn,
                            nutrition.healthBenefitsZh || nutrition.healthBenefitsEn
                          )}
                        </p>
                        {isExpanded && (
                          <p className="pt-1 border-t border-emerald-200/60 text-emerald-950">
                            <strong>
                              {tr(
                                '👩‍🍳 គន្លឹះចម្អិនឱ្យកាន់តែល្អសម្រាប់សុខភាព៖ ',
                                '👩‍🍳 Healthy Cooking Tip: ',
                                '👩‍🍳 健康烹饪技巧：'
                              )}
                            </strong>
                            {tr(
                              nutrition.healthyCookingTipKh,
                              nutrition.healthyCookingTipEn,
                              nutrition.healthyCookingTipZh || nutrition.healthyCookingTipEn
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <button
                          onClick={() =>
                            setExpandedDishId(isExpanded ? null : food.id)
                          }
                          className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          {isExpanded
                            ? tr('▲ បង្រួមព័ត៌មានលម្អិត', '▲ Less Details', '▲ 收起详情')
                            : tr(
                                '▼ មើលគន្លឹះចម្អិនសុខភាព & ជាតិប្រៃ/ស្ករ',
                                '▼ Healthy Cooking Tip & Sodium/Sugar',
                                '▼ 查看健康烹饪建议与钠/糖含量'
                              )}
                        </button>

                        <button
                          onClick={() => handleOpenDishRecipe(food)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{tr('មើលរូបមន្តចម្អិន', 'Full Recipe', '完整食谱')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 3: BALANCED DAILY MEAL PLANNER (3 MEALS + HYDRATION)
             =================================================================== */}
          {activeTab === 'meal_plan' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {tr(
                        '📅 ផែនការអាហារសុខភាពប្រចាំថ្ងៃ (៣ ពេលក្នុងមួយថ្ងៃ)',
                        '📅 Personalized Daily Balanced Meal Plan (3 Meals)',
                        '📅 每日均衡三餐计划（早、午、晚餐）'
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      {tr(
                        'រៀបចំតុល្យភាពកាឡូរី ប្រូតេអ៊ីន និងបន្លែតាមគោលដៅសុខភាពរបស់អ្នក',
                        'Balanced Cambodian breakfast, lunch & dinner tailored to your goal',
                        '根据您的健康目标定制营养均衡的柬埔寨三餐'
                      )}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setMealPlanIndex((idx) => idx + 1);
                      showToast(
                        tr(
                          '🔄 បានបង្កើតផែនការអាហារសុខភាព ៣ ពេលថ្មី!',
                          '🔄 Generated a fresh 3-meal plan!',
                          '🔄 已生成全新的每日三餐计划！'
                        ),
                        'info'
                      );
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>
                      {tr('ប្ដូរមុខម្ហូបប្រចាំថ្ងៃថ្មី', 'New Daily Menu', '更换今日菜单')}
                    </span>
                  </button>
                </div>

                {/* Goal Selector for Meal Plan */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {HEALTH_GOALS_CATALOG.slice(0, 6).map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        setMealPlanGoal(g.id);
                        setMealPlanIndex(0);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        mealPlanGoal === g.id
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-emerald-50'
                      }`}
                    >
                      {g.icon} {isKm ? g.shortLabelKh : g.shortLabelEn}
                    </button>
                  ))}
                </div>

                {/* Total Daily Macros Summary Banner */}
                <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl bg-emerald-900 text-white text-center">
                  <div>
                    <span className="text-[10px] text-emerald-200 block">
                      {tr('កាឡូរីសរុប', 'Total kcal', '总热量')}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-amber-300">
                      {dailyMealPlan.totalCaloriesKcal} kcal
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-200 block">
                      {tr('ប្រូតេអ៊ីនសរុប', 'Protein', '总蛋白质')}
                    </span>
                    <span className="text-xs sm:text-sm font-black">
                      {dailyMealPlan.totalProteinG}g
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-200 block">
                      {tr('ជាតិសរសៃ', 'Fiber', '膳食纤维')}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-300">
                      {dailyMealPlan.totalFiberG}g
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-200 block">
                      {tr('ជាតិប្រៃសរុប', 'Sodium', '总钠量')}
                    </span>
                    <span className="text-xs sm:text-sm font-black">
                      {dailyMealPlan.totalSodiumMg}mg
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Meal Slots: Breakfast, Lunch, Dinner */}
              <div className="space-y-3">
                {dailyMealPlan.meals.map((slot) => (
                  <div
                    key={slot.slotId}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-emerald-900">
                        {isKm ? slot.labelKh : slot.labelEn}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        ⏰ {isKm ? slot.timeRangeKh : slot.timeRangeEn}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <img
                        src={slot.dish.photoUrl}
                        alt={slot.dish.nameKh}
                        className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-200"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {isKm ? slot.dish.nameKh : slot.dish.nameEn}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 text-[10px] font-bold">
                            🔥 {slot.nutrition.caloriesKcal} kcal
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 text-[10px] font-bold">
                            💪 {slot.nutrition.proteinG}g protein
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-900 text-[10px] font-bold">
                            🌿 {slot.nutrition.fiberG}g fiber
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          💡 {isKm ? slot.portionTipKh : slot.portionTipEn}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenDishRecipe(slot.dish)}
                        className="px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        {tr('រូបមន្ត', 'Recipe', '食谱')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Hydration & 2:1:1 Healthy Plate Guide */}
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 space-y-1.5 text-xs text-sky-950">
                <p className="font-bold flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    {isKm
                      ? dailyMealPlan.snackAndHydrationKh
                      : dailyMealPlan.snackAndHydrationEn}
                  </span>
                </p>
                <p className="text-emerald-900 font-semibold pt-1 border-t border-sky-200/70">
                  {isKm
                    ? dailyMealPlan.healthyPlateAdviceKh
                    : dailyMealPlan.healthyPlateAdviceEn}
                </p>
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 4: HEALTHY HOME INGREDIENTS MATCHER
             =================================================================== */}
          {activeTab === 'ingredients' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-3">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {tr(
                    '🧺 ជ្រើសរើសគ្រឿងផ្សំដែលអ្នកមានក្នុងផ្ទះបាយ ដើម្បីស្វែងរកមុខម្ហូបសុខភាព៖',
                    '🧺 Select ingredients you have at home to find healthy Cambodian dishes:',
                    '🧺 选择您家中现有的食材，匹配健康的柬埔寨菜谱：'
                  )}
                </h3>

                <div className="flex flex-wrap gap-1.5">
                  {COMMON_HEALTHY_KHMER_INGREDIENTS.map((ing) => {
                    const active = selectedIngredients.includes(ing);
                    return (
                      <button
                        key={ing}
                        onClick={() => toggleIngredient(ing)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          active
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-emerald-50'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {ing}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customIngredientInput}
                    onChange={(e) => setCustomIngredientInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustomIngredient();
                    }}
                    placeholder={tr(
                      'បន្ថែមគ្រឿងផ្សំផ្សេងទៀត...',
                      'Add another ingredient...',
                      '添加其他食材...'
                    )}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                  <button
                    onClick={handleAddCustomIngredient}
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    {tr('បន្ថែម', 'Add', '添加')}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {ingredientMatchResults.map((res) => (
                  <div
                    key={res.food.id}
                    onClick={() => handleOpenDishRecipe(res.food)}
                    className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 transition flex items-center gap-3 cursor-pointer"
                  >
                    <img
                      src={res.food.photoUrl}
                      alt={res.food.nameKh}
                      className="w-18 h-18 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {isKm ? res.food.nameKh : res.food.nameEn}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold shrink-0">
                          ❤️ {res.nutrition.healthScore}/100
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        🔥 {res.nutrition.caloriesKcal} kcal • 💪 {res.nutrition.proteinG}g
                        protein • {res.matchedIngredients.join(', ')}
                      </p>
                      <p className="text-[11px] text-emerald-800 line-clamp-1">
                        👩‍🍳 {isKm ? res.nutrition.healthyCookingTipKh : res.nutrition.healthyCookingTipEn}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 5: KHMER SUPERFOODS & MEDICINAL HERBS ENCYCLOPEDIA
             =================================================================== */}
          {activeTab === 'superfoods' && (
            <div className="space-y-3">
              {KHMER_SUPERFOODS_ENCYCLOPEDIA.map((herb) => (
                <div
                  key={herb.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{herb.emoji}</span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950">
                        {isKm ? herb.nameKh : herb.nameEn}
                      </h4>
                      <span className="text-[11px] font-bold text-amber-700">
                        ✨ {isKm ? herb.keyVitaminsKh : herb.keyVitaminsEn}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {isKm ? herb.benefitsKh : herb.benefitsEn}
                  </p>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-950">
                    <strong>{tr('💡 គន្លឹះប្រើប្រាស់៖ ', '💡 Best Usage Tip: ', '💡 食用建议：')}</strong>
                    {isKm ? herb.bestUsageTipKh : herb.bestUsageTipEn}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Evidence-Based Medical Disclaimer Footer */}
          <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-950 leading-relaxed space-y-1">
            <p className="font-extrabold">
              {tr(
                NUTRITION_GUIDE_MEDICAL_DISCLAIMER.titleKh,
                NUTRITION_GUIDE_MEDICAL_DISCLAIMER.titleEn,
                NUTRITION_GUIDE_MEDICAL_DISCLAIMER.titleZh
              )}
            </p>
            <p>
              {tr(
                NUTRITION_GUIDE_MEDICAL_DISCLAIMER.bodyKh,
                NUTRITION_GUIDE_MEDICAL_DISCLAIMER.bodyEn,
                NUTRITION_GUIDE_MEDICAL_DISCLAIMER.bodyZh
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Sparkles,
  HeartPulse,
  Flame,
  Utensils,
  Search,
  ChevronRight,
  RefreshCw,
  Send,
  Scale,
  Droplets,
  ShieldCheck,
  Leaf,
  Calendar,
  MessageSquareHeart,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Activity,
} from 'lucide-react';
import { FoodItem } from '../types';
import {
  HEALTH_GOALS_CATALOG,
  KHMER_SUPERFOODS_ENCYCLOPEDIA,
  POPULAR_KHMER_HEALTH_QUESTIONS,
  MEDICAL_DISCLAIMER_KH,
  MEDICAL_DISCLAIMER_EN,
  HealthGoalId,
  HealthQaAnswer,
  UserHealthMetricsInput,
  getRecommendedDishesByHealthGoal,
  generateBalancedDailyMealPlan,
  answerHealthAndNutritionQuestion,
  calculateUserHealthMetrics,
  loadUserHealthMetricsInput,
  saveUserHealthMetricsInput,
  searchByHomeIngredients,
  getDailyHealthyEatingSpotlight,
} from '../services/aiFoodService';

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

  const isKm = language === 'km';

  // 5 Main Tabs of the AI Health & Nutrition Assistant
  const [activeTab, setActiveTab] = useState<
    'qa' | 'healthy_dishes' | 'meal_plan' | 'ingredients' | 'superfoods'
  >('qa');

  // Tab 1: Khmer Health Q&A + Personal BMI/Calorie Calculator States
  const [questionInput, setQuestionInput] = useState<string>('');
  const [currentAnswer, setCurrentAnswer] = useState<HealthQaAnswer | null>(() =>
    answerHealthAndNutritionQuestion(POPULAR_KHMER_HEALTH_QUESTIONS[0].questionKh, foods)
  );
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [healthProfile, setHealthProfile] = useState<UserHealthMetricsInput>(() =>
    loadUserHealthMetricsInput()
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

  // Computed Daily Spotlight
  const dailySpotlight = useMemo(() => getDailyHealthyEatingSpotlight(), []);

  // Computed Personal BMI, Calorie & Hydration Summary
  const metricsSummary = useMemo(
    () => calculateUserHealthMetrics(healthProfile),
    [healthProfile]
  );

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

  const handleAskQuestion = (overrideQuestion?: string) => {
    const q = (overrideQuestion !== undefined ? overrideQuestion : questionInput).trim();
    if (!q) {
      showToast(
        isKm
          ? 'សូមវាយបញ្ចូលសំណួរអំពីសុខភាព ឬឈ្មោះមុខម្ហូបជាមុនសិន!'
          : 'Please enter a health or nutrition question first!',
        'warning'
      );
      return;
    }
    const ans = answerHealthAndNutritionQuestion(q, foods);
    setCurrentAnswer(ans);
    if (overrideQuestion !== undefined) {
      setQuestionInput(overrideQuestion);
    }
    showToast(
      isKm
        ? '✅ AI បានវិភាគ និងផ្តល់ការណែនាំអាហារូបត្ថម្ភជូនអ្នក!'
        : '✅ AI Nutrition analysis ready!',
      'success'
    );
  };

  const handleUpdateHealthProfile = (patch: Partial<UserHealthMetricsInput>) => {
    const next = { ...healthProfile, ...patch };
    setHealthProfile(next);
    saveUserHealthMetricsInput(next);
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
                  {isKm
                    ? 'ជំនួយការ AI សុខភាព និងអាហារូបត្ថម្ភ'
                    : 'AI Health & Nutrition Assistant'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-[10px] font-bold">
                  {isKm ? '២០០ មុខម្ហូបខ្មែរ' : '200 Khmer Dishes'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 truncate">
                {isKm
                  ? 'ណែនាំអាហារសុខភាព រៀបចំផែនការអាហារ ៣ ពេល និងឆ្លើយសំណួរអាហារូបត្ថម្ភជាភាសាខ្មែរ'
                  : 'Healthy Khmer recipes, balanced meal planning & evidence-based nutrition Q&A'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5 Interactive Navigation Tabs */}
        <div className="bg-emerald-950/95 px-2.5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-emerald-800/60 shrink-0">
          {[
            {
              id: 'qa',
              icon: MessageSquareHeart,
              labelKh: '💬 សួរ AI សុខភាព',
              labelEn: '💬 Ask Health AI',
            },
            {
              id: 'healthy_dishes',
              icon: Utensils,
              labelKh: '🥗 ម្ហូបសុខភាព',
              labelEn: '🥗 Healthy Dishes',
            },
            {
              id: 'meal_plan',
              icon: Calendar,
              labelKh: '📅 ផែនការ ៣ ពេល',
              labelEn: '📅 3-Meal Plan',
            },
            {
              id: 'ingredients',
              icon: Search,
              labelKh: '🧺 គ្រឿងផ្សំក្នុងផ្ទះ',
              labelEn: '🧺 Home Ingredients',
            },
            {
              id: 'superfoods',
              icon: Leaf,
              labelKh: '🌿 ឱសថគ្រឿងទេសខ្មែរ',
              labelEn: '🌿 Khmer Herbs',
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
                <span>{isKm ? tab.labelKh : tab.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Main Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 bg-slate-50">
          {/* ===================================================================
              TAB 1: KHMER HEALTH & NUTRITION Q&A + DAILY WELLNESS CALCULATOR
             =================================================================== */}
          {activeTab === 'qa' && (
            <div className="space-y-4">
              {/* Daily Healthy Eating Spotlight Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 border border-emerald-200/80 shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                    {isKm ? dailySpotlight.badgeKh : dailySpotlight.badgeEn}
                  </span>
                  <button
                    onClick={() => setShowCalculator((v) => !v)}
                    className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-[11px] font-extrabold flex items-center gap-1 shadow-xs transition cursor-pointer"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>
                      {showCalculator
                        ? isKm
                          ? 'លាក់តារាងគណនា BMI'
                          : 'Hide BMI Calculator'
                        : isKm
                        ? 'គណនា BMI & កាឡូរីប្រចាំថ្ងៃ'
                        : 'BMI & Daily Calorie Tool'}
                    </span>
                  </button>
                </div>
                <h3 className="text-xs sm:text-sm font-extrabold text-emerald-950">
                  {isKm ? dailySpotlight.titleKh : dailySpotlight.titleEn}
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {isKm ? dailySpotlight.tipKh : dailySpotlight.tipEn}
                </p>

                {/* Quick Summary Strip of User's Current Target */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2 rounded-xl bg-white/90 border border-emerald-200/70 text-center">
                    <span className="text-[10px] text-slate-500 block">
                      {isKm ? 'BMI របស់អ្នក' : 'Your BMI'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-800">
                      {metricsSummary.bmi}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/90 border border-emerald-200/70 text-center">
                    <span className="text-[10px] text-slate-500 block">
                      {isKm ? 'កាឡូរីគោលដៅ/ថ្ងៃ' : 'Daily Target'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-amber-700">
                      {metricsSummary.dailyCalorieTargetKcal} kcal
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/90 border border-emerald-200/70 text-center">
                    <span className="text-[10px] text-slate-500 block">
                      {isKm ? 'ទឹកស្អាត/ថ្ងៃ' : 'Daily Water'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-sky-700">
                      {metricsSummary.dailyWaterLiters} L
                    </span>
                  </div>
                </div>
              </div>

              {/* Collapsible Personal BMI, Calorie & Hydration Calculator */}
              {showCalculator && (
                <div className="p-4 rounded-2xl bg-white border-2 border-amber-300/80 shadow-md space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <span>
                        {isKm
                          ? 'គណនាសន្ទស្សន៍ទម្ងន់ (BMI) កាឡូរី និងបរិមាណទឹកប្រចាំថ្ងៃ'
                          : 'Personal BMI, Daily Calorie & Hydration Calculator'}
                      </span>
                    </h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${metricsSummary.bmiColorClass}`}
                    >
                      {isKm ? metricsSummary.bmiCategoryKh : metricsSummary.bmiCategoryEn}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        {isKm ? 'ទម្ងន់ (kg)' : 'Weight (kg)'}
                      </label>
                      <input
                        type="number"
                        min={30}
                        max={200}
                        value={healthProfile.weightKg}
                        onChange={(e) =>
                          handleUpdateHealthProfile({ weightKg: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        {isKm ? 'កម្ពស់ (cm)' : 'Height (cm)'}
                      </label>
                      <input
                        type="number"
                        min={120}
                        max={220}
                        value={healthProfile.heightCm}
                        onChange={(e) =>
                          handleUpdateHealthProfile({ heightCm: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        {isKm ? 'អាយុ (ឆ្នាំ)' : 'Age (years)'}
                      </label>
                      <input
                        type="number"
                        min={12}
                        max={100}
                        value={healthProfile.age}
                        onChange={(e) =>
                          handleUpdateHealthProfile({ age: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        {isKm ? 'ភេទ' : 'Gender'}
                      </label>
                      <select
                        value={healthProfile.gender}
                        onChange={(e) =>
                          handleUpdateHealthProfile({
                            gender: e.target.value as 'male' | 'female',
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                      >
                        <option value="male">{isKm ? 'ប្រុស (Male)' : 'Male'}</option>
                        <option value="female">{isKm ? 'ស្រី (Female)' : 'Female'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 leading-relaxed">
                    {isKm
                      ? metricsSummary.personalizedAdviceKh
                      : metricsSummary.personalizedAdviceEn}
                  </div>
                </div>
              )}

              {/* Search / Ask Health AI Input Box */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>
                    {isKm
                      ? 'សួរសំណួរអំពីសុខភាព អាហារូបត្ថម្ភ ឬឈ្មោះមុខម្ហូបខ្មែរ (ភាសាខ្មែរ / English)៖'
                      : 'Ask any question about health, nutrition, or a Cambodian dish:'}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAskQuestion();
                    }}
                    placeholder={
                      isKm
                        ? 'ឧ. តើអ្នកមានជំងឺទឹកនោមផ្អែមគួរញ៉ាំម្ហូបអ្វី? ឬ វាយឈ្មោះម្ហូបដូចជា «អាម៉ុកត្រី»...'
                        : 'e.g., Best Khmer foods for blood sugar, weight loss, or type a dish name...'
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none text-xs sm:text-sm text-slate-900"
                  />
                  <button
                    onClick={() => handleAskQuestion()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isKm ? 'សួរ AI' : 'Ask AI'}</span>
                  </button>
                </div>

                {/* Popular Quick-Tap Khmer Health Questions */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    {isKm
                      ? '💡 ចុចជ្រើសរើសសំណួរពេញនិយមខាងក្រោមដើម្បីមើលចម្លើយភ្លាមៗ៖'
                      : '💡 Tap a popular health question below for instant answers:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_KHMER_HEALTH_QUESTIONS.map((qItem) => (
                      <button
                        key={qItem.id}
                        onClick={() =>
                          handleAskQuestion(isKm ? qItem.questionKh : qItem.questionEn)
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[11px] font-bold transition cursor-pointer text-left"
                      >
                        {isKm ? qItem.badgeKh : qItem.questionEn}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Health & Nutrition Structured Response Card */}
              {currentAnswer && (
                <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500/30 shadow-md space-y-3.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-extrabold">
                      {isKm ? currentAnswer.categoryBadgeKh : currentAnswer.categoryBadgeEn}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {isKm ? 'ផ្អែកលើគោលការណ៍អាហារូបត្ថម្ភវេជ្ជសាស្ត្រ' : 'Evidence-Based Guidance'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                    {isKm ? currentAnswer.summaryKh : currentAnswer.summaryEn}
                  </p>

                  {/* Key Takeaways */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-extrabold text-slate-900">
                      {isKm
                        ? '📌 គោលការណ៍អាហារូបត្ថម្ភសំខាន់ៗ៖'
                        : '📌 Key Nutritional Guidelines:'}
                    </h4>
                    <div className="space-y-1.5">
                      {(isKm ? currentAnswer.bulletPointsKh : currentAnswer.bulletPointsEn).map(
                        (pt, i) => (
                          <div
                            key={i}
                            className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed"
                          >
                            {pt}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Foods to Choose vs Foods to Limit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5">
                      <h5 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {isKm ? 'អាហារគួរជ្រើសរើស (Recommended)' : 'Foods to Prioritize'}
                        </span>
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {(isKm
                          ? currentAnswer.foodsToChooseKh
                          : currentAnswer.foodsToChooseEn
                        ).map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-white border border-emerald-200 text-emerald-900 text-[11px] font-semibold"
                          >
                            ✓ {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200 space-y-1.5">
                      <h5 className="text-xs font-extrabold text-rose-900 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>
                          {isKm ? 'អាហារគួរកាត់បន្ថយ (Limit)' : 'Foods to Limit'}
                        </span>
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {(isKm
                          ? currentAnswer.foodsToLimitKh
                          : currentAnswer.foodsToLimitEn
                        ).map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-white border border-rose-200 text-rose-900 text-[11px] font-semibold"
                          >
                            ✕ {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommended Cambodian Dishes with 1-Tap Recipe View */}
                  <div className="space-y-2 pt-1">
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                      <span>
                        {isKm
                          ? '🍲 មុខម្ហូបខ្មែរសុខភាពដែលណែនាំ (ចុចមើលរូបមន្តចម្អិន)៖'
                          : '🍲 Recommended Healthy Cambodian Dishes (Tap for Recipe):'}
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {currentAnswer.recommendedDishes.map(({ food, nutrition }) => (
                        <div
                          key={food.id}
                          onClick={() => handleOpenDishRecipe(food)}
                          className="p-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-400 transition flex items-center gap-3 cursor-pointer group"
                        >
                          <img
                            src={food.photoUrl}
                            alt={food.nameKh}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-extrabold text-slate-900 truncate group-hover:text-emerald-800">
                                {isKm ? food.nameKh : food.nameEn}
                              </p>
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                                {nutrition.healthScore}/100
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              🔥 {nutrition.caloriesKcal} kcal • 💪 {nutrition.proteinG}g • 🌿{' '}
                              {nutrition.fiberG}g fiber
                            </p>
                            <span className="text-[10px] text-emerald-700 font-bold inline-flex items-center gap-0.5 mt-1">
                              {isKm ? 'មើលរូបមន្តសុខភាព' : 'View Recipe'}
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
                  {isKm
                    ? '🎯 ជ្រើសរើសគោលដៅសុខភាពរបស់អ្នក៖'
                    : '🎯 Filter Cambodian Dishes by Health Goal:'}
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
                  placeholder={
                    isKm
                      ? 'ស្វែងរកមុខម្ហូប ឬគ្រឿងផ្សំ (ក្នុងចំណោម ២០០ មុខម្ហូបខ្មែរ)...'
                      : 'Search any of the 200 Cambodian dishes for nutrition facts...'
                  }
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Dish Nutrition Cards */}
              <div className="space-y-2.5">
                {healthyDishesList.slice(0, 24).map(({ food, nutrition }) => {
                  const isExpanded = expandedDishId === food.id;
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
                                {isKm ? food.nameKh : food.nameEn}
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
                              💪 ប្រូតេអ៊ីន {nutrition.proteinG}g
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-[10px] font-bold">
                              🌿 ជាតិសរសៃ {nutrition.fiberG}g
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              🍚 កាបូអ៊ីដ្រាត {nutrition.carbsG}g • ខ្លាញ់ {nutrition.fatG}g
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Health Benefits & Cooking Tip */}
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs text-slate-700 space-y-1">
                        <p>
                          <strong className="text-emerald-900">
                            {isKm ? '✨ អត្ថប្រយោជន៍សុខភាព៖ ' : '✨ Health Benefit: '}
                          </strong>
                          {isKm ? nutrition.healthBenefitsKh : nutrition.healthBenefitsEn}
                        </p>
                        {isExpanded && (
                          <p className="pt-1 border-t border-emerald-200/60 text-emerald-950">
                            <strong>
                              {isKm
                                ? '👩‍🍳 គន្លឹះចម្អិនឱ្យកាន់តែល្អសម្រាប់សុខភាព៖ '
                                : '👩‍🍳 Healthy Cooking Tip: '}
                            </strong>
                            {isKm
                              ? nutrition.healthyCookingTipKh
                              : nutrition.healthyCookingTipEn}
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
                            ? isKm
                              ? '▲ បង្រួមព័ត៌មានលម្អិត'
                              : '▲ Less Details'
                            : isKm
                            ? '▼ មើលគន្លឹះចម្អិនសុខភាព & ជាតិប្រៃ/ស្ករ'
                            : '▼ Healthy Cooking Tip & Sodium/Sugar'}
                        </button>

                        <button
                          onClick={() => handleOpenDishRecipe(food)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{isKm ? 'មើលរូបមន្តចម្អិន' : 'Full Recipe'}</span>
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
                      {isKm
                        ? '📅 ផែនការអាហារសុខភាពប្រចាំថ្ងៃ (៣ ពេលក្នុងមួយថ្ងៃ)'
                        : '📅 Personalized Daily Balanced Meal Plan (3 Meals)'}
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      {isKm
                        ? 'រៀបចំតុល្យភាពកាឡូរី ប្រូតេអ៊ីន និងបន្លែតាមគោលដៅសុខភាពរបស់អ្នក'
                        : 'Balanced Cambodian breakfast, lunch & dinner tailored to your goal'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setMealPlanIndex((idx) => idx + 1);
                      showToast(
                        isKm
                          ? '🔄 បានបង្កើតផែនការអាហារសុខភាព ៣ ពេលថ្មី!'
                          : '🔄 Generated a fresh 3-meal plan!',
                        'info'
                      );
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>
                      {isKm ? 'ប្ដូរមុខម្ហូបប្រចាំថ្ងៃថ្មី' : 'New Daily Menu'}
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
                      {isKm ? 'កាឡូរីសរុប' : 'Total kcal'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-amber-300">
                      {dailyMealPlan.totalCaloriesKcal} kcal
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-200 block">
                      {isKm ? 'ប្រូតេអ៊ីនសរុប' : 'Protein'}
                    </span>
                    <span className="text-xs sm:text-sm font-black">
                      {dailyMealPlan.totalProteinG}g
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-200 block">
                      {isKm ? 'ជាតិសរសៃ' : 'Fiber'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-300">
                      {dailyMealPlan.totalFiberG}g
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-200 block">
                      {isKm ? 'ជាតិប្រៃសរុប' : 'Sodium'}
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
                        {isKm ? 'រូបមន្ត' : 'Recipe'}
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
                  {isKm
                    ? '🧺 ជ្រើសរើសគ្រឿងផ្សំដែលអ្នកមានក្នុងផ្ទះបាយ ដើម្បីស្វែងរកមុខម្ហូបសុខភាព៖'
                    : '🧺 Select ingredients you have at home to find healthy Cambodian dishes:'}
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
                    placeholder={
                      isKm
                        ? 'បន្ថែមគ្រឿងផ្សំផ្សេងទៀត...'
                        : 'Add another ingredient...'
                    }
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                  <button
                    onClick={handleAddCustomIngredient}
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    {isKm ? 'បន្ថែម' : 'Add'}
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
                        protein • ត្រូវគ្នា៖ {res.matchedIngredients.join(', ')}
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
                    <strong>{isKm ? '💡 គន្លឹះប្រើប្រាស់៖ ' : '💡 Best Usage Tip: '}</strong>
                    {isKm ? herb.bestUsageTipKh : herb.bestUsageTipEn}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Evidence-Based Medical Disclaimer Footer */}
          <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
            {isKm ? MEDICAL_DISCLAIMER_KH : MEDICAL_DISCLAIMER_EN}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Sparkles,
  HeartPulse,
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
  RotateCcw,
  AlertTriangle,
  PhoneCall,
  Lock,
  HelpCircle,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FoodItem } from '../types';
import {
  HEALTH_GOALS_CATALOG,
  KHMER_SUPERFOODS_ENCYCLOPEDIA,
  HEALTH_QUICK_QUESTIONS_TRILINGUAL,
  MEDICAL_DISCLAIMER_KH,
  MEDICAL_DISCLAIMER_EN,
  HealthGoalId,
  HealthQaAnswer,
  UserHealthMetricsInput,
  HealthConversationSession,
  HealthConversationTurn,
  getRecommendedDishesByHealthGoal,
  generateBalancedDailyMealPlan,
  answerHealthAndNutritionQuestion,
  calculateUserHealthMetrics,
  loadUserHealthMetricsInput,
  saveUserHealthMetricsInput,
  searchByHomeIngredients,
  getDailyHealthyEatingSpotlight,
  loadHealthConversationSession,
  askHealthAssistantInSession,
  retryHealthTurnInSession,
  resetHealthConversationSession,
  detectQueryLanguage,
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

const MEDICAL_DISCLAIMER_ZH =
  '⚕️ 医疗免责声明：本 AI 健康与营养助手依据世界卫生组织 (WHO) 及柬埔寨卫生部指南提供循证营养与症状科普，仅供健康参考，不能替代执业医师的当面诊断或处方治疗。如遇胸痛、呼吸困难或高烧不退等紧急症状，请立即拨打 119 或前往医院急诊。';

export const AiFoodDiscoveryModal: React.FC = () => {
  const {
    isAiFoodDiscoveryModalOpen,
    setIsAiFoodDiscoveryModalOpen,
    foods,
    language,
    showToast,
    setSelectedFood,
    currentUser,
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

  const accountKey = currentUser?.id || currentUser?.email || 'guest';

  // 5 Main Tabs of the AI Health & Nutrition Assistant
  const [activeTab, setActiveTab] = useState<
    'qa' | 'healthy_dishes' | 'meal_plan' | 'ingredients' | 'superfoods'
  >('qa');

  // Tab 1: Multi-Turn Conversational Health Q&A + Personal BMI/Calorie Calculator States
  const [questionInput, setQuestionInput] = useState<string>('');
  const [session, setSession] = useState<HealthConversationSession>(() =>
    loadHealthConversationSession(accountKey, assistantLang)
  );
  const [isLoadingTurn, setIsLoadingTurn] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [expandedTurnIds, setExpandedTurnIds] = useState<Record<string, boolean>>({});
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [healthProfile, setHealthProfile] = useState<UserHealthMetricsInput>(() =>
    loadUserHealthMetricsInput()
  );

  const latestTurnRef = useRef<HTMLDivElement | null>(null);
  const lastSubmitTimestampRef = useRef<number>(0);

  // Reload session when user account changes
  useEffect(() => {
    const loaded = loadHealthConversationSession(accountKey, assistantLang);
    setSession(loaded);
  }, [accountKey]);

  // Seed initial welcome turn if session has 0 turns so user sees immediate helpful context
  const initialDefaultAnswer = useMemo(
    () =>
      answerHealthAndNutritionQuestion(
        HEALTH_QUICK_QUESTIONS_TRILINGUAL[0].questionKh,
        foods,
        null,
        1,
        assistantLang
      ),
    [foods, assistantLang]
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
    const rawQ = (overrideQuestion !== undefined ? overrideQuestion : questionInput).trim();
    if (!rawQ) {
      setErrorBanner(
        tr(
          'សូមវាយបញ្ចូលសំណួរអំពីសុខភាព រោគសញ្ញា ឬឈ្មោះមុខម្ហូបជាមុនសិន!',
          'Please enter a health symptom, nutrition question, or dish name first!',
          '请先输入您的健康症状、营养问题或柬埔寨菜名！'
        )
      );
      return;
    }

    // Rate-limit guard against accidental double-taps (<150ms)
    const now = Date.now();
    if (isLoadingTurn || now - lastSubmitTimestampRef.current < 150) {
      return;
    }
    lastSubmitTimestampRef.current = now;
    setErrorBanner(null);
    setIsLoadingTurn(true);

    // Automatically detect language if user typed explicitly in Khmer, Chinese, or English
    const detectedLang = detectQueryLanguage(rawQ, assistantLang);
    if (detectedLang !== assistantLang) {
      setAssistantLang(detectedLang);
    }

    try {
      const { updatedSession, turn } = askHealthAssistantInSession(
        session,
        rawQ,
        foods,
        detectedLang
      );

      setSession({ ...updatedSession });
      setExpandedTurnIds((prev) => ({ ...prev, [turn.turnId]: true }));
      setQuestionInput('');
      setIsLoadingTurn(false);

      setTimeout(() => {
        latestTurnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    } catch (err) {
      setIsLoadingTurn(false);
      setErrorBanner(
        tr(
          'មានបញ្ហាបច្ចេកទេសក្នុងការវិភាគសំណួរ។ សូមចុច «សួរម្តងទៀត» ដើម្បីព្យាយាមម្តងទៀត។',
          'Unable to process your question right now. Please tap Retry.',
          '处理问题时出现异常，请点击“重试”。'
        )
      );
    }
  };

  const handleRetryTurn = (turnId: string) => {
    setErrorBanner(null);
    setIsLoadingTurn(true);
    try {
      const { updatedSession, turn: retriedTurn } = retryHealthTurnInSession(
        session,
        turnId,
        foods,
        assistantLang
      );
      setSession({ ...updatedSession });
      if (retriedTurn) {
        setExpandedTurnIds((prev) => ({ ...prev, [retriedTurn.turnId]: true }));
      }
      setIsLoadingTurn(false);
      showToast(
        tr(
          '🔄 បានវិភាគ និងឆ្លើយសំណួរឡើងវិញដោយជោគជ័យ!',
          '🔄 Successfully re-analyzed your health question!',
          '🔄 已重新分析并更新健康解答！'
        ),
        'success'
      );
    } catch {
      setIsLoadingTurn(false);
    }
  };

  const handleStartNewConversation = () => {
    const fresh = resetHealthConversationSession(accountKey, assistantLang);
    setSession(fresh);
    setExpandedTurnIds({});
    setQuestionInput('');
    setErrorBanner(null);
    showToast(
      tr(
        '✨ បានចាប់ផ្តើមការសន្ទនាសុខភាពថ្មី!',
        '✨ Started a new health conversation!',
        '✨ 已开启新的健康咨询对话！'
      ),
      'info'
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

  // Helper to render localized fields from a HealthQaAnswer
  const getAnswerText = (ans: HealthQaAnswer, lang: 'km' | 'en' | 'zh') => {
    const badge =
      lang === 'km'
        ? ans.categoryBadgeKh
        : lang === 'zh'
        ? ans.categoryBadgeZh || ans.categoryBadgeEn
        : ans.categoryBadgeEn;
    const summary =
      lang === 'km'
        ? ans.summaryKh
        : lang === 'zh'
        ? ans.summaryZh || ans.summaryEn
        : ans.summaryEn;
    const bullets =
      lang === 'km'
        ? ans.bulletPointsKh
        : lang === 'zh'
        ? ans.bulletPointsZh || ans.bulletPointsEn
        : ans.bulletPointsEn;
    const choose =
      lang === 'km'
        ? ans.foodsToChooseKh
        : lang === 'zh'
        ? ans.foodsToChooseZh || ans.foodsToChooseEn
        : ans.foodsToChooseEn;
    const limit =
      lang === 'km'
        ? ans.foodsToLimitKh
        : lang === 'zh'
        ? ans.foodsToLimitZh || ans.foodsToLimitEn
        : ans.foodsToLimitEn;
    const advisory =
      lang === 'km'
        ? ans.medicalAdvisoryKh
        : lang === 'zh'
        ? ans.medicalAdvisoryZh || ans.medicalAdvisoryEn
        : ans.medicalAdvisoryEn;
    const sources =
      lang === 'km'
        ? ans.trustedSourcesKh || ['អង្គការសុខភាពពិភពលោក (WHO)', 'ក្រសួងសុខាភិបាលកម្ពុជា (MoH)']
        : lang === 'zh'
        ? ans.trustedSourcesZh || ['世界卫生组织 (WHO)', '柬埔寨卫生部 (MoH Cambodia)']
        : ans.trustedSourcesEn || ['World Health Organization (WHO)', 'Ministry of Health Cambodia'];
    const uncertainty =
      lang === 'km'
        ? ans.uncertaintyNoteKh
        : lang === 'zh'
        ? ans.uncertaintyNoteZh
        : ans.uncertaintyNoteEn;
    const followUps =
      lang === 'km'
        ? ans.followUpSuggestionsKh || []
        : lang === 'zh'
        ? ans.followUpSuggestionsZh || []
        : ans.followUpSuggestionsEn || [];

    return {
      badge,
      summary,
      bullets,
      choose,
      limit,
      advisory,
      sources,
      uncertainty,
      followUps,
    };
  };

  // Render a single clinical answer card (used for both active turns and initial welcome card)
  const renderClinicalAnswerCard = (
    ans: HealthQaAnswer,
    turn?: HealthConversationTurn,
    isLatest = true
  ) => {
    const content = getAnswerText(ans, assistantLang);
    const safety = ans.safetyEscalation;
    const safetyLevel = ans.safetyLevel || safety?.level || 'standard';
    const isCollapsed =
      turn && !isLatest && expandedTurnIds[turn.turnId] === false;

    const safetyBannerStyles =
      safetyLevel === 'emergency'
        ? 'bg-red-600 text-white border-red-700 shadow-lg'
        : safetyLevel === 'urgent'
        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md'
        : safetyLevel === 'medication_caution'
        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
        : safetyLevel === 'high_risk_care'
        ? 'bg-purple-700 text-white border-purple-800 shadow-sm'
        : '';

    return (
      <div
        key={turn ? turn.turnId : 'initial-welcome-answer'}
        ref={isLatest ? latestTurnRef : undefined}
        className={`rounded-2xl bg-white border-2 transition-all ${
          safetyLevel === 'emergency'
            ? 'border-red-500 shadow-xl'
            : safetyLevel === 'urgent'
            ? 'border-amber-400 shadow-lg'
            : isLatest
            ? 'border-emerald-500/60 shadow-md'
            : 'border-slate-200 shadow-xs'
        } overflow-hidden`}
      >
        {/* User Question Bubble Header (when part of multi-turn conversation) */}
        {turn && (
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shrink-0">
                {tr(
                  `សំណួរទី ${turn.turnNumber}`,
                  `Turn #${turn.turnNumber}`,
                  `第 ${turn.turnNumber} 问`
                )}
              </span>
              {turn.isFollowUp && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-[10px] font-bold shrink-0">
                  {tr('🔗 សំណួរបន្ត (Context)', '🔗 Follow-Up Context', '🔗 上下文追问')}
                </span>
              )}
              <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                «{turn.question}»
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleRetryTurn(turn.turnId)}
                title={tr('សួរម្តងទៀត', 'Retry question', '重试此问题')}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-100 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{tr('សួរម្តងទៀត', 'Retry', '重试')}</span>
              </button>
              {!isLatest && (
                <button
                  onClick={() =>
                    setExpandedTurnIds((prev) => ({
                      ...prev,
                      [turn.turnId]: isCollapsed ? true : false,
                    }))
                  }
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="p-4 space-y-3.5">
          {/* 4-Tier Safety Escalation Banner (Emergency / Urgent / Medication / High-Risk) */}
          {safety && safetyLevel !== 'standard' && (
            <div className={`p-3.5 rounded-2xl border ${safetyBannerStyles} space-y-1.5`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 font-extrabold text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {tr(safety.titleKh, safety.titleEn, safety.titleZh)}
                  </span>
                </div>
                {safetyLevel === 'emergency' && (
                  <a
                    href="tel:119"
                    className="px-3 py-1 rounded-xl bg-white text-red-700 font-black text-xs flex items-center gap-1 shadow-sm hover:bg-red-50 transition"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{tr('ហៅ 119 ភ្លាមៗ', 'Call 119 ER', '立即拨打 119')}</span>
                  </a>
                )}
              </div>
              <p className="text-xs leading-relaxed font-medium opacity-95">
                {tr(safety.messageKh, safety.messageEn, safety.messageZh)}
              </p>
              <p className="text-[11px] font-extrabold pt-0.5 opacity-95">
                👉 {tr(safety.actionCalloutKh, safety.actionCalloutEn, safety.actionCalloutZh)}
              </p>
            </div>
          )}

          {/* Category Badge & Evidence-Based Indicator */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-extrabold">
              {content.badge}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {tr(
                'ផ្អែកលើគោលការណ៍វេជ្ជសាស្ត្រ WHO & MoH',
                'WHO & MoH Evidence-Based Guidance',
                '基于 WHO 与柬埔寨卫生部循证指南'
              )}
            </span>
          </div>

          {/* Direct Clinical Summary */}
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200/80">
            {content.summary}
          </p>

          {!isCollapsed && (
            <>
              {/* Key Clinical & Nutritional Guidelines */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-extrabold text-slate-900">
                  {tr(
                    '📌 ការណែនាំវេជ្ជសាស្ត្រ និងអាហារូបត្ថម្ភសំខាន់ៗ៖',
                    '📌 Key Clinical & Nutritional Guidelines:',
                    '📌 关键医学与营养护理建议：'
                  )}
                </h4>
                <div className="space-y-1.5">
                  {content.bullets.map((pt, i) => (
                    <div
                      key={i}
                      className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed"
                    >
                      {pt}
                    </div>
                  ))}
                </div>
              </div>

              {/* Foods to Choose vs Foods to Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5">
                  <h5 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {tr(
                        'អាហារគួរជ្រើសរើស (Recommended)',
                        'Foods to Prioritize',
                        '推荐优先选择的食物'
                      )}
                    </span>
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {content.choose.map((item, idx) => (
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
                      {tr(
                        'អាហារគួរតម ឬកាត់បន្ថយ (Avoid / Limit)',
                        'Foods to Avoid or Limit',
                        '应避免或限制的食物'
                      )}
                    </span>
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {content.limit.map((item, idx) => (
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

              {/* Medical Advisory & Uncertainty Explanation */}
              <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 space-y-1.5 text-[11px] text-amber-950">
                <p className="font-bold leading-relaxed">{content.advisory}</p>
                {content.uncertainty && (
                  <p className="text-slate-600 leading-relaxed flex items-start gap-1.5 pt-1 border-t border-amber-200/60">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span>{content.uncertainty}</span>
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-[10px] text-emerald-900 font-semibold">
                  <span>
                    📚 {tr('ប្រភពវេជ្ជសាស្ត្រ៖ ', 'Trusted Sources: ', '权威医学来源：')}
                    {content.sources.join(' • ')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Lock className="w-3 h-3" />
                    {tr(
                      'ឯកជនភាពត្រូវបានការពារ',
                      'Privacy Protected',
                      '隐私受保护'
                    )}
                  </span>
                </div>
              </div>

              {/* Recommended Cambodian Dishes with 1-Tap Recipe View */}
              {ans.recommendedDishes && ans.recommendedDishes.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                    <span>
                      {tr(
                        '🍲 មុខម្ហូបខ្មែរសុខភាពដែលណែនាំ (ចុចមើលរូបមន្តចម្អិន)៖',
                        '🍲 Recommended Healthy Cambodian Dishes (Tap for Recipe):',
                        '🍲 推荐的健康柬埔寨菜肴（点击查看食谱）：'
                      )}
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ans.recommendedDishes.map(({ food, nutrition }) => (
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
                            {tr('មើលរូបមន្តសុខភាព', 'View Recipe', '查看健康食谱')}
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contextual Follow-Up Question Chips for Multi-Turn Conversation */}
              {content.followUps.length > 0 && (
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <span className="text-[11px] font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    {tr(
                      '💬 សួរសំណួរបន្តអំពីប្រធានបទនេះ (ចុចដើម្បីសួរបន្តបានច្រើនដង)៖',
                      '💬 Ask a follow-up question on this topic (Multi-turn context):',
                      '💬 继续追问此健康话题（支持连续多轮上下文对话）：'
                    )}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {content.followUps.map((fUp, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAskQuestion(fUp)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-950 text-[11px] font-bold transition cursor-pointer text-left shadow-2xs"
                      >
                        ↪ {fUp}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
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
                    'ជំនួយការ AI សុខភាព និងអាហារូបត្ថម្ភ',
                    'AI Health & Nutrition Assistant',
                    'AI 医疗健康与营养助手'
                  )}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-[10px] font-bold">
                  {tr('ខ្មែរ • EN • 中文', 'KM • EN • ZH', '中文 • ខ្មែរ • EN')}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 truncate">
                {tr(
                  'ឆ្លើយសំណួរសុខភាពបន្តគ្នាច្រើនដង ណែនាំម្ហូបសុខភាព និងការពារសុវត្ថិភាពវេជ្ជសាស្ត្រ',
                  'Multi-turn clinical Q&A, healthy Khmer recipes & medical safety guidance',
                  '支持多轮连续健康问诊、柬埔寨健康食谱与医疗安全预警'
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
                id: 'qa',
                icon: MessageSquareHeart,
                labelKh: '💬 សួរ AI សុខភាព',
                labelEn: '💬 Ask Health AI',
                labelZh: '💬 AI 健康问诊',
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
              TAB 1: MULTI-TURN CONVERSATIONAL HEALTH Q&A + WELLNESS CALCULATOR
             =================================================================== */}
          {activeTab === 'qa' && (
            <div className="space-y-4">
              {/* Session Status & New Conversation Control Bar */}
              <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-950 text-white flex items-center justify-between gap-2 flex-wrap shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {tr(
                      `សន្ទនាសុខភាព (${session.turns.length} សំណួរ)`,
                      `Active Session (${session.turns.length} turns)`,
                      `当前对话 (${session.turns.length} 轮问答)`
                    )}
                  </span>
                  <span className="text-[10px] text-emerald-200/80 px-2 py-0.5 rounded-full bg-white/10">
                    ID: {session.sessionId.slice(-8)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCalculator((v) => !v)}
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>
                      {showCalculator
                        ? tr('លាក់ BMI', 'Hide BMI', '隐藏 BMI')
                        : tr('គណនា BMI', 'BMI Tool', '计算 BMI')}
                    </span>
                  </button>

                  {session.turns.length > 0 && (
                    <button
                      onClick={handleStartNewConversation}
                      className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-[11px] font-extrabold flex items-center gap-1 shadow-xs transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>
                        {tr('សន្ទនាថ្មី', 'New Chat', '新对话')}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Personal BMI, Calorie & Hydration Calculator */}
              {showCalculator && (
                <div className="p-4 rounded-2xl bg-white border-2 border-amber-300/80 shadow-md space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <span>
                        {tr(
                          'គណនាសន្ទស្សន៍ទម្ងន់ (BMI) កាឡូរី និងបរិមាណទឹកប្រចាំថ្ងៃ',
                          'Personal BMI, Daily Calorie & Hydration Calculator',
                          '个人 BMI、每日热量与饮水量计算器'
                        )}
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
                        {tr('ទម្ងន់ (kg)', 'Weight (kg)', '体重 (kg)')}
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
                        {tr('កម្ពស់ (cm)', 'Height (cm)', '身高 (cm)')}
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
                        {tr('អាយុ (ឆ្នាំ)', 'Age (years)', '年龄 (岁)')}
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
                        {tr('ភេទ', 'Gender', '性别')}
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
                        <option value="male">{tr('ប្រុស (Male)', 'Male', '男 (Male)')}</option>
                        <option value="female">{tr('ស្រី (Female)', 'Female', '女 (Female)')}</option>
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
              <div className="p-3.5 rounded-2xl bg-white border-2 border-emerald-500/40 shadow-sm space-y-3">
                <label className="text-xs font-extrabold text-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>
                      {tr(
                        'សួរសំណួរអំពីសុខភាព រោគសញ្ញា ឬម្ហូបខ្មែរ (អាចសួរបន្តគ្នា ១០+ សំណួរ)៖',
                        'Ask any symptom, health, or nutrition question (10+ multi-turn support):',
                        '输入任何症状、疾病或饮食问题（支持 10+ 轮连续上下文追问）：'
                      )}
                    </span>
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => {
                      setQuestionInput(e.target.value);
                      if (errorBanner) setErrorBanner(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAskQuestion();
                    }}
                    placeholder={tr(
                      'ឧ. គ្រុនផ្ដាសាយ, ឈឺបេះដូង, ឈឺ ក, រលាកពោះវៀន, ទឹកនោមផ្អែម, តើគួរផឹកទឹកអ្វី?...',
                      'e.g., Flu & fever, chest pain, sore throat, enteritis, diabetes, what to drink next?...',
                      '例如：感冒发烧、胸痛、喉咙痛、肠炎腹泻、糖尿病、接下来该喝什么？...'
                    )}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none text-xs sm:text-sm text-slate-900"
                  />
                  <button
                    onClick={() => handleAskQuestion()}
                    disabled={isLoadingTurn}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isLoadingTurn
                        ? tr('កំពុងវិភាគ...', 'Analyzing...', '分析中...')
                        : tr('សួរ AI', 'Ask AI', '提问 AI')}
                    </span>
                  </button>
                </div>

                {/* Error / Validation Recovery Banner */}
                {errorBanner && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center justify-between gap-2">
                    <span>⚠️ {errorBanner}</span>
                    <button
                      onClick={() => setErrorBanner(null)}
                      className="text-[11px] underline cursor-pointer"
                    >
                      {tr('បិទ', 'Dismiss', '关闭')}
                    </button>
                  </div>
                )}

                {/* Popular Quick-Tap Trilingual Health & Symptom Questions */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    {tr(
                      '💡 ចុចជ្រើសរើសប្រធានបទសុខភាព ឬរោគសញ្ញាខាងក្រោមដើម្បីសួរភ្លាមៗ៖',
                      '💡 Tap a clinical topic or symptom below for instant guidance:',
                      '💡 点击下方常见症状或慢病主题立即获取解答：'
                    )}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {HEALTH_QUICK_QUESTIONS_TRILINGUAL.map((qItem) => (
                      <button
                        key={qItem.id}
                        onClick={() =>
                          handleAskQuestion(
                            tr(qItem.questionKh, qItem.questionEn, qItem.questionZh)
                          )
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[11px] font-bold transition cursor-pointer text-left"
                      >
                        {tr(qItem.badgeKh, qItem.badgeEn, qItem.badgeZh)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Multi-Turn Conversation Thread */}
              <div className="space-y-4">
                {session.turns.length === 0 ? (
                  renderClinicalAnswerCard(initialDefaultAnswer, undefined, true)
                ) : (
                  session.turns.map((turn, idx) =>
                    renderClinicalAnswerCard(
                      turn.answer,
                      turn,
                      idx === session.turns.length - 1
                    )
                  )
                )}
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
                          {isKm ? nutrition.healthBenefitsKh : nutrition.healthBenefitsEn}
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
          <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
            {tr(MEDICAL_DISCLAIMER_KH, MEDICAL_DISCLAIMER_EN, MEDICAL_DISCLAIMER_ZH)}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Camera,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChefHat,
  Flame,
  Utensils,
  Search,
  Filter,
  Crown,
  ChevronRight,
  RefreshCw,
  Edit3,
  Package,
  Layers,
  ListChecks,
} from 'lucide-react';
import { FoodItem } from '../types';
import {
  identifyFoodWithAi,
  retrieveRecipeAndInfoByFoodName,
  saveUserAiCorrectionFeedback,
  findRecommendedDishesForIngredient,
  searchByHomeIngredients,
  getPersonalizedRecommendations,
  getAiDailyQuota,
  recordAiScanUsage,
  AI_OBJECT_TYPE_METADATA,
  REQUIRED_UNCERTAIN_PROMPT_KH,
  REQUIRED_UNCERTAIN_PROMPT_EN,
  AiFoodRecognitionResult,
  AiFoodMatchCandidate,
  HomeIngredientsMatchResult,
  TastePreference,
  DietaryPreference,
  BudgetLevel,
  MaxPrepTime,
} from '../services/aiFoodService';

const COMMON_KHMER_INGREDIENTS = [
  'សាច់មាន់',
  'សាច់ជ្រូក',
  'ត្រីរ៉ស់',
  'សាច់គោ',
  'បង្គា',
  'ស៊ុតមាន់',
  'ខ្ទិះដូង',
  'ស្លឹកគ្រៃ',
  'រមៀត',
  'រំដេង',
  'ស្ករត្នោត',
  'ទឹកត្រី',
  'ប្រហុក',
  'ម្ទេស',
  'ខ្ទឹមស',
  'ស្លឹកក្រូចសើច',
  'ត្រកួន',
  'ល្ហុង',
  'ចេកទុំ',
  'ម្សៅដំណើប',
];

export const AiFoodDiscoveryModal: React.FC = () => {
  const {
    isAiFoodDiscoveryModalOpen,
    setIsAiFoodDiscoveryModalOpen,
    foods,
    restaurants,
    currentUser,
    language,
    showToast,
    openUpgradeVipModal,
    setSelectedFood,
    setSelectedRestaurant,
  } = useApp();

  const isKm = language === 'km';

  // Active Tab: 'scan' | 'ingredients' | 'preferences'
  const [activeTab, setActiveTab] = useState<'scan' | 'ingredients' | 'preferences'>('scan');

  // Scanner States
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [customHint, setCustomHint] = useState<string>('');
  const [scanResult, setScanResult] = useState<AiFoodRecognitionResult | null>(null);
  const [isEditingFoodName, setIsEditingFoodName] = useState<boolean>(false);
  const [showAiSuggestionsHighlight, setShowAiSuggestionsHighlight] = useState<boolean>(false);

  // Ingredients Search States
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [customIngredientInput, setCustomIngredientInput] = useState<string>('');

  // Preference Filter States
  const [tastePref, setTastePref] = useState<TastePreference>('all');
  const [dietaryPref, setDietaryPref] = useState<DietaryPreference>('all');
  const [budgetPref, setBudgetPref] = useState<BudgetLevel>('all');
  const [prepTimePref, setPrepTimePref] = useState<MaxPrepTime>('all');
  const [searchPrefQuery, setSearchPrefQuery] = useState<string>('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const manualNameInputRef = useRef<HTMLInputElement>(null);

  // Quota status (All hooks MUST be declared before any early return!)
  const quota = useMemo(() => {
    return getAiDailyQuota(currentUser?.membershipTier, currentUser?.subscriptionExpiryDate);
  }, [currentUser, isAnalyzing]);

  // Autocomplete suggestions when user types manual food name
  const manualNameSuggestions = useMemo(() => {
    const q = customHint.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return foods
      .filter(
        (f) =>
          (f.nameKh || '').toLowerCase().includes(q) ||
          (f.nameEn || '').toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [customHint, foods]);

  // Ingredients Search computation
  const ingredientResults: HomeIngredientsMatchResult[] = useMemo(() => {
    if (selectedIngredients.length === 0) return [];
    return searchByHomeIngredients(selectedIngredients, foods);
  }, [selectedIngredients, foods]);

  // Preferences Filter computation
  const preferenceResults: FoodItem[] = useMemo(() => {
    return getPersonalizedRecommendations(
      {
        taste: tastePref,
        dietary: dietaryPref,
        budget: budgetPref,
        maxPrepTime: prepTimePref,
        searchQuery: searchPrefQuery,
      },
      foods
    );
  }, [tastePref, dietaryPref, budgetPref, prepTimePref, searchPrefQuery, foods]);

  // Matching restaurants for identified food
  const matchingRestaurants = useMemo(() => {
    if (!scanResult?.primaryMatch) return [];
    const dishNameKh = (scanResult.primaryMatch.nameKh || '').toLowerCase();
    const dishNameEn = (scanResult.primaryMatch.nameEn || '').toLowerCase();
    return restaurants
      .filter((r) => {
        const sigs = (r.signatureDishesKh || []).map((s) => s.toLowerCase());
        return (
          sigs.some((s) => dishNameKh.includes(s) || s.includes(dishNameKh)) ||
          (r.descriptionKh || '').toLowerCase().includes(dishNameKh) ||
          (r.descriptionEn || '').toLowerCase().includes(dishNameEn)
        );
      })
      .slice(0, 3);
  }, [scanResult, restaurants]);

  // Early return strictly AFTER all React hooks
  if (!isAiFoodDiscoveryModalOpen) return null;

  const handleClose = () => {
    setIsAiFoodDiscoveryModalOpen(false);
  };

  const handleRetakePhoto = () => {
    setPhotoDataUrl('');
    setScanResult(null);
    setCustomHint('');
    setIsEditingFoodName(false);
    setShowAiSuggestionsHighlight(false);
  };

  // Image Upload & 4-Stage AI Scan Handler
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!quota.allowed) {
      showToast(
        isKm
          ? '⚠️ អ្នកបានប្រើប្រាស់កូតា AI អស់សម្រាប់ថ្ងៃនេះហើយ (៣ លើក)។ សូមដំឡើងជា VIP ដើម្បីស្កេនបន្ថែម!'
          : '⚠️ Daily AI scan limit reached (3 scans). Please upgrade to VIP for more scans!',
        'warning'
      );
      openUpgradeVipModal();
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setPhotoDataUrl(dataUrl);
        setIsAnalyzing(true);
        setScanResult(null);
        setCustomHint('');
        setIsEditingFoodName(false);
        setShowAiSuggestionsHighlight(false);

        await new Promise((r) => setTimeout(r, 550));

        // Run 4-Stage Vision Analysis Pipeline without arbitrary dish guessing
        const result = await identifyFoodWithAi(dataUrl, foods);
        setScanResult(result);
        setIsAnalyzing(false);

        recordAiScanUsage();

        if (result.status === 'confident') {
          showToast(isKm ? '✅ AI បានសម្គាល់មុខម្ហូបជោគជ័យ!' : '✅ Food recognized successfully!', 'success');
        } else if (result.status === 'uncertain') {
          showToast(
            isKm
              ? '🔍 បានកំណត់ប្រភេទវត្ថុក្នុងរូបភាព សូមបញ្ជាក់ ឬជ្រើសរើសឈ្មោះម្ហូប!'
              : '🔍 Object type identified! Please confirm or enter the food name.',
            'info'
          );
        } else {
          showToast(
            isKm ? '⚠️ រូបភាពមិនទាន់ច្បាស់ សូមបញ្ចូលឈ្មោះម្ហូប ឬថតរូបម្ដងទៀត' : '⚠️ Unclear image, please enter name or retake',
            'warning'
          );
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsAnalyzing(false);
      showToast(isKm ? 'បរាជ័យក្នុងការអានរូបថត' : 'Failed to read photo', 'warning');
    }
  };

  // Manual Name Search & Correction Handler (Step 5 & Step 6 «កែឈ្មោះម្ហូប» / «បញ្ចូលឈ្មោះដោយខ្លួនឯង»)
  const handleApplyManualFoodName = (overrideName?: string) => {
    const query = (overrideName !== undefined ? overrideName : customHint).trim();
    if (!query) {
      showToast(
        isKm
          ? 'សូមវាយបញ្ចូលឈ្មោះម្ហូប ឬឈ្មោះវត្ថុអាហារជាមុនសិន!'
          : 'Please type a dish or food item name first!',
        'warning'
      );
      manualNameInputRef.current?.focus();
      return;
    }

    const updatedResult = retrieveRecipeAndInfoByFoodName(query, foods);
    saveUserAiCorrectionFeedback(
      scanResult?.objectType || 'unknown_unclear',
      scanResult?.identifiedNameKh || 'Unknown',
      query,
      updatedResult.primaryMatch?.id
    );

    setScanResult(updatedResult);
    setCustomHint(query);
    setIsEditingFoodName(false);
    setShowAiSuggestionsHighlight(false);

    if (updatedResult.isVerifiedRecipe) {
      showToast(
        isKm
          ? `✅ បានទាញយកគ្រឿងផ្សំ និងរបៀបធ្វើសម្រាប់ «${updatedResult.identifiedNameKh}»!`
          : `✅ Loaded verified details for "${updatedResult.identifiedNameEn}"!`,
        'success'
      );
    } else {
      showToast(
        isKm
          ? `⚠️ រកមិនឃើញរូបមន្តផ្លូវការសម្រាប់ «${query}» ទេ`
          : `⚠️ Could not find a verified recipe for "${query}"`,
        'warning'
      );
    }
  };

  // Select AI Suggested Candidate Handler («ជ្រើសរើសឈ្មោះដែល AI ណែនាំ»)
  const handleSelectCandidate = (candidate: AiFoodMatchCandidate) => {
    const meta = AI_OBJECT_TYPE_METADATA[candidate.objectType];
    if (candidate.foodItem) {
      setScanResult({
        status: 'confident',
        objectType: candidate.objectType,
        objectTypeLabelKh: meta.labelKh,
        objectTypeLabelEn: meta.labelEn,
        isPreparedDish: true,
        identifiedNameKh: candidate.foodItem.nameKh,
        identifiedNameEn: candidate.foodItem.nameEn,
        confidenceScore: candidate.confidenceScore,
        visualCluesSummaryKh: candidate.visualCluesKh,
        visualCluesSummaryEn: candidate.visualCluesEn,
        candidateMatches: scanResult?.candidateMatches || [candidate],
        primaryMatch: candidate.foodItem,
        isVerifiedRecipe: true,
        requiresUserConfirmation: false,
        uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
        uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
        messageKh: `✅ បានជ្រើសរើសមុខម្ហូប «${candidate.foodItem.nameKh}» ជាមួយរូបមន្តពិតប្រាកដ!`,
        messageEn: `✅ Selected "${candidate.foodItem.nameEn}" with verified recipe!`,
        detectedVisualFeatures: [meta.labelKh, candidate.foodItem.categoryKh],
        disclaimerKh: 'រូបមន្ត និងគ្រឿងផ្សំត្រូវបានទាញចេញពីឃ្លាំងទិន្នន័យម្ហូបខ្មែរផ្លូវការ ១០០%។',
        disclaimerEn: 'Recipes and ingredients are strictly verified from the official Cambodian database.',
        processingTimeMs: scanResult?.processingTimeMs || 120,
      });
      setShowAiSuggestionsHighlight(false);
      showToast(isKm ? `✅ បានជ្រើសរើស «${candidate.foodItem.nameKh}»` : `✅ Selected "${candidate.foodItem.nameEn}"`, 'success');
    } else if (candidate.nonDishInfo) {
      const recDishes = findRecommendedDishesForIngredient(candidate.nonDishInfo.searchKeywordsKh, foods, 4);
      setScanResult({
        status: 'confident',
        objectType: candidate.objectType,
        objectTypeLabelKh: meta.labelKh,
        objectTypeLabelEn: meta.labelEn,
        isPreparedDish: false,
        identifiedNameKh: candidate.nonDishInfo.nameKh,
        identifiedNameEn: candidate.nonDishInfo.nameEn,
        confidenceScore: candidate.confidenceScore,
        visualCluesSummaryKh: candidate.visualCluesKh,
        visualCluesSummaryEn: candidate.visualCluesEn,
        candidateMatches: scanResult?.candidateMatches || [candidate],
        nonDishItemInfo: candidate.nonDishInfo,
        recommendedDishesFromIngredient: recDishes,
        isVerifiedRecipe: true,
        requiresUserConfirmation: false,
        uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
        uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
        messageKh: `✅ បានបញ្ជាក់អត្តសញ្ញាណជា «${candidate.nonDishInfo.nameKh}»!`,
        messageEn: `✅ Confirmed as "${candidate.nonDishInfo.nameEn}"!`,
        detectedVisualFeatures: [meta.labelKh, candidate.nonDishInfo.categoryKh],
        disclaimerKh: candidate.nonDishInfo.isPackagedProduct
          ? '📦 សម្រាប់ផលិតផលវេចខ្ចប់ ប្រព័ន្ធមិនបង្កើតរូបមន្តធ្វើដោយខ្លួនឯងក្លែងក្លាយឡើយ។'
          : '💡 មុខម្ហូបខាងក្រោមគឺជាការណែនាំដែលអាចចម្អិនពីវត្ថុធាតុដើមនេះ មិនមែនជាឈ្មោះរបស់វត្ថុក្នុងរូបភាពឡើយ។',
        disclaimerEn: '💡 Dishes listed below are cooking recommendations using this ingredient.',
        processingTimeMs: scanResult?.processingTimeMs || 120,
      });
      setShowAiSuggestionsHighlight(false);
      showToast(isKm ? `✅ បានជ្រើសរើស «${candidate.nonDishInfo.nameKh}»` : `✅ Selected "${candidate.nonDishInfo.nameEn}"`, 'success');
    }
  };

  const handleToggleIngredient = (ing: string) => {
    setSelectedIngredients((prev) => (prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing]));
  };

  const handleAddCustomIngredient = () => {
    const trimmed = customIngredientInput.trim();
    if (trimmed && !selectedIngredients.includes(trimmed)) {
      setSelectedIngredients((prev) => [...prev, trimmed]);
      setCustomIngredientInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-emerald-500/30 my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#064E3B] via-[#047857] to-teal-700 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-amber-400 text-slate-950 shadow-md">
                <Sparkles className="w-5 h-5 fill-slate-950" />
              </div>
              <div>
                <h3 className="font-moul text-sm sm:text-base text-white flex items-center gap-2">
                  <span>{isKm ? 'ស្វែងរក & ស្គាល់មុខម្ហូប AI' : 'AI Cambodian Food Discovery'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black font-sans">
                    AI Vision
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-200 font-khmer">
                  {isKm
                    ? 'បែងចែកប្រភេទវត្ថុមុន • ស្គាល់ឈ្មោះម្ហូប • រូបមន្តពិតប្រាកដ ១០០%'
                    : 'Object Classification First • Honest Identification • Verified Recipes'}
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Daily Quota Bar */}
          <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>
                {quota.dailyLimit === -1 ? (
                  <strong className="text-amber-300">{isKm ? 'VIP គ្មានដែនកំណត់ (Unlimited)' : 'VIP Unlimited Scans'}</strong>
                ) : (
                  <span>
                    {isKm ? 'កូតា AI ថ្ងៃនេះ៖ ' : 'Daily AI Quota: '}
                    <strong className="text-amber-300">{quota.remainingToday}</strong> / {quota.dailyLimit} {isKm ? 'លើក' : 'left'}
                  </span>
                )}
              </span>
            </div>

            {quota.tier === 'free' && (
              <button
                onClick={openUpgradeVipModal}
                className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] hover:bg-amber-300 transition flex items-center gap-1 shadow-xs"
              >
                <Crown className="w-3 h-3 fill-slate-950" />
                <span>{isKm ? 'ដំឡើង VIP (+១៥/ថ្ងៃ)' : 'Upgrade VIP'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 shrink-0 text-xs font-bold font-khmer">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'scan'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{isKm ? 'ស្កេនរូបថត AI' : 'AI Photo Scan'}</span>
          </button>

          <button
            onClick={() => setActiveTab('ingredients')}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'ingredients'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>{isKm ? 'រកតាមគ្រឿងផ្សំ' : 'By Ingredients'}</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'preferences'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>{isKm ? 'ចំណង់ចំណូលចិត្ត' : 'Preferences'}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 font-khmer text-xs">
          {/* TAB 1: AI PHOTO SCANNER (7-Part Ordered Display) */}
          {activeTab === 'scan' && (
            <div className="space-y-4">
              {!photoDataUrl ? (
                <div className="p-6 border-2 border-dashed border-emerald-500/40 rounded-3xl bg-emerald-50/30 dark:bg-slate-800/40 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {isKm ? 'ថត ឬជ្រើសរើសរូបថតម្ហូប ផ្លែឈើ បន្លែ ឬអាហារវេចខ្ចប់' : 'Take or upload a photo of food, fruit, vegetables, or packaged items'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      {isKm
                        ? 'AI នឹងវិភាគប្រភេទវត្ថុក្នុងរូបភាពជាមុន (ផ្លែឈើ បន្លែ សាច់ឆៅ អាហារវេចខ្ចប់ ឬម្ហូបចម្អិនរួច) មុននឹងបង្ហាញរូបមន្តពិតប្រាកដ'
                        : 'AI first classifies the visible object type before identifying the food and retrieving verified recipes.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto pt-2">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-[#064E3B] text-white font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{isKm ? 'ថតរូបភ្លាមៗ' : 'Take Photo'}</span>
                    </button>

                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 active:scale-95 transition cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      <span>{isKm ? 'ជ្រើសពី Gallery' : 'Gallery'}</span>
                    </button>
                  </div>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageSelected}
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelected}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* ========================================================== */}
                  {/* 1. SCANNED IMAGE                                           */}
                  {/* ========================================================== */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 max-h-56 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    <img src={photoDataUrl} alt="Scanned food" className="w-full h-56 object-cover" />

                    <button
                      onClick={handleRetakePhoto}
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 text-white text-[11px] font-bold backdrop-blur-sm transition flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isKm ? 'ប្តូររូបថត' : 'Retake'}</span>
                    </button>

                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 text-white p-4 text-center">
                        <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        <span className="font-bold text-xs">
                          {isKm
                            ? 'ជំហានទី ១៖ កំពុងកំណត់ប្រភេទវត្ថុក្នុងរូបភាព & វិភាគលក្ខណៈសម្គាល់...'
                            : 'Step 1: Classifying object type & analyzing visual features...'}
                        </span>
                      </div>
                    )}
                  </div>

                  {scanResult && !isAnalyzing && (
                    <div className="space-y-3.5 animate-fade-in">
                      {/* ========================================================== */}
                      {/* 2. IDENTIFIED OBJECT TYPE (Step One Requirement)           */}
                      {/* ========================================================== */}
                      <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{isKm ? '១. ប្រភេទវត្ថុដែលពិនិត្យឃើញក្នុងរូបភាព៖' : '1. Identified Object Type:'}</span>
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              AI_OBJECT_TYPE_METADATA[scanResult.objectType]?.badgeColor || 'bg-emerald-600 text-white'
                            }`}
                          >
                            {isKm ? scanResult.objectTypeLabelKh : scanResult.objectTypeLabelEn}
                          </span>
                        </div>
                        {scanResult.visualCluesSummaryKh && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            <strong className="text-slate-800 dark:text-slate-200">
                              {isKm ? 'ភស្តុតាងរូបភាព៖ ' : 'Visual Clues: '}
                            </strong>
                            {isKm ? scanResult.visualCluesSummaryKh : scanResult.visualCluesSummaryEn}
                          </p>
                        )}
                      </div>

                      {/* ========================================================== */}
                      {/* 3. MOST LIKELY FOOD NAME + VISIBLE «កែឈ្មោះម្ហូប» BUTTON    */}
                      {/* ========================================================== */}
                      <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800/90 dark:to-slate-800/60 border-2 border-emerald-500/40 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  scanResult.status === 'confident'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-500 text-slate-950'
                                }`}
                              >
                                {scanResult.status === 'confident'
                                  ? isKm
                                    ? 'បានផ្ទៀងផ្ទាត់ឈ្មោះម្ហូប'
                                    : 'Verified Match'
                                  : isKm
                                  ? 'ការប៉ាន់ស្មានបឋម (ត្រូវការបញ្ជាក់)'
                                  : 'Preliminary Match (Confirm Below)'}
                              </span>
                              {scanResult.confidenceScore > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-900/10 dark:bg-white/10 text-slate-800 dark:text-amber-300 font-mono text-[10px] font-black">
                                  {Math.round(scanResult.confidenceScore * 100)}% Confidence
                                </span>
                              )}
                            </div>

                            <h3 className="font-moul text-base text-slate-900 dark:text-white pt-1">
                              {scanResult.identifiedNameKh}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-sans font-medium">
                              {scanResult.identifiedNameEn}
                            </p>
                          </div>

                          {/* Visible «កែឈ្មោះម្ហូប» Button (Section 6 Requirement) */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingFoodName((prev) => !prev);
                              setTimeout(() => manualNameInputRef.current?.focus(), 80);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px] shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isKm ? 'កែឈ្មោះម្ហូប' : 'Edit Food Name'}</span>
                          </button>
                        </div>

                        {/* Manual Food Name Input Box (Opens when «កែឈ្មោះម្ហូប» or «បញ្ចូលឈ្មោះដោយខ្លួនឯង» is clicked) */}
                        {(isEditingFoodName || scanResult.requiresUserConfirmation) && (
                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-400/80 space-y-2 animate-fade-in">
                            <label className="text-[11px] font-bold text-slate-800 dark:text-amber-300 block">
                              {isKm
                                ? '✍️ វាយបញ្ចូលឈ្មោះម្ហូប ឬឈ្មោះវត្ថុអាហារពិតប្រាកដ៖'
                                : '✍️ Enter the exact dish or food item name:'}
                            </label>
                            <div className="flex gap-2">
                              <input
                                ref={manualNameInputRef}
                                type="text"
                                value={customHint}
                                onChange={(e) => setCustomHint(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyManualFoodName()}
                                placeholder={
                                  isKm
                                    ? 'ឧ. អាម៉ុកត្រី, សម្លកកូរ, ល្ហុងទុំ, នំកង, បុកល្ហុង...'
                                    : 'e.g. Fish Amok, Samlor Korko, Ripe Papaya, Num Kong...'
                                }
                                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500 font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => handleApplyManualFoodName()}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shrink-0 flex items-center gap-1"
                              >
                                <Search className="w-3.5 h-3.5" />
                                <span>{isKm ? 'ស្វែងរករូបមន្ត' : 'Find Recipe'}</span>
                              </button>
                            </div>

                            {/* Live Verified Database Autocomplete Chips */}
                            {manualNameSuggestions.length > 0 && (
                              <div className="pt-1 space-y-1">
                                <span className="text-[10px] text-slate-500 block">
                                  {isKm ? 'ជ្រើសរើសរហ័សពីឃ្លាំងទិន្នន័យផ្លូវការ៖' : 'Quick select from verified database:'}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {manualNameSuggestions.map((f) => (
                                    <button
                                      key={f.id}
                                      type="button"
                                      onClick={() => handleApplyManualFoodName(f.nameKh)}
                                      className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold cursor-pointer transition"
                                    >
                                      {f.nameKh}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ========================================================== */}
                      {/* STEP 5 UNCERTAIN PROMPT & 3 REQUIRED ACTION BUTTONS        */}
                      {/* ========================================================== */}
                      {scanResult.requiresUserConfirmation && (
                        <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400/70 space-y-3">
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-slate-800 dark:text-amber-100 font-bold text-xs leading-relaxed">
                              {isKm ? REQUIRED_UNCERTAIN_PROMPT_KH : REQUIRED_UNCERTAIN_PROMPT_EN}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            {/* Button 1: «បញ្ចូលឈ្មោះដោយខ្លួនឯង» */}
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingFoodName(true);
                                setTimeout(() => manualNameInputRef.current?.focus(), 80);
                              }}
                              className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{isKm ? 'បញ្ចូលឈ្មោះដោយខ្លួនឯង' : 'Enter Name Manually'}</span>
                            </button>

                            {/* Button 2: «ជ្រើសរើសឈ្មោះដែល AI ណែនាំ» */}
                            <button
                              type="button"
                              onClick={() => {
                                setShowAiSuggestionsHighlight(true);
                                if (scanResult.candidateMatches.length === 1) {
                                  handleSelectCandidate(scanResult.candidateMatches[0]);
                                }
                              }}
                              className="py-2.5 px-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isKm ? 'ជ្រើសរើសឈ្មោះដែល AI ណែនាំ' : 'Select AI Suggestion'}</span>
                            </button>

                            {/* Button 3: «ថតរូបម្ដងទៀត» */}
                            <button
                              type="button"
                              onClick={handleRetakePhoto}
                              className="py-2.5 px-3 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>{isKm ? 'ថតរូបម្ដងទៀត' : 'Retake Photo'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ========================================================== */}
                      {/* 4. IDENTIFICATION CONFIDENCE & UP TO 3 ALTERNATIVE MATCHES */}
                      {/* ========================================================== */}
                      {scanResult.candidateMatches.length > 0 && (
                        <div
                          className={`p-3.5 rounded-2xl border space-y-2 transition ${
                            showAiSuggestionsHighlight
                              ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/50'
                              : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                            {isKm
                              ? 'ជម្រើសដែល AI ណែនាំតាមភស្តុតាងរូបភាព (ចុចជ្រើសរើស ១ ក្នុងចំណោមខាងក្រោម)៖'
                              : 'AI Suggested Matches Based on Visual Clues (Tap to confirm):'}
                          </span>
                          <div className="space-y-2">
                            {scanResult.candidateMatches.slice(0, 3).map((c) => {
                              const isCurrent = scanResult.identifiedNameKh === c.nameKh && !scanResult.requiresUserConfirmation;
                              return (
                                <div
                                  key={c.id}
                                  onClick={() => handleSelectCandidate(c)}
                                  className={`p-2.5 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-2 ${
                                    isCurrent
                                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                                  }`}
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 dark:text-white">{c.nameKh}</span>
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold">
                                        {Math.round(c.confidenceScore * 100)}%
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{c.visualCluesKh}</p>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                                    {isKm ? 'ជ្រើសរើស' : 'Select'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Unverified Manual Name Warning (Step 4 & Step 5: Never invent recipes!) */}
                      {scanResult.status === 'unverified_manual_name' && (
                        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-center space-y-2">
                          <AlertCircle className="w-7 h-7 text-rose-600 mx-auto" />
                          <h4 className="font-bold text-rose-900 dark:text-rose-200">
                            {isKm
                              ? `មិនអាចផ្ទៀងផ្ទាត់រូបមន្តសម្រាប់ «${scanResult.identifiedNameKh}» បានទេ`
                              : `Could not verify recipe for "${scanResult.identifiedNameEn}"`}
                          </h4>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px]">{scanResult.messageKh}</p>
                        </div>
                      )}

                      {/* ========================================================== */}
                      {/* CASE A: PREPARED DISH — 5. INGREDIENTS, 6. INSTRUCTIONS,   */}
                      {/*         7. PREP TIME, SERVING SIZE & VERIFIED CALORIES     */}
                      {/* ========================================================== */}
                      {scanResult.primaryMatch && (
                        <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border-2 border-emerald-500/50 space-y-4 shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                            <div>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                {scanResult.primaryMatch.categoryKh}
                              </span>
                              <h4 className="font-moul text-sm text-slate-900 dark:text-white mt-1">
                                {scanResult.primaryMatch.nameKh} ({scanResult.primaryMatch.nameEn})
                              </h4>
                            </div>
                            <button
                              onClick={() => {
                                handleClose();
                                setSelectedFood(scanResult.primaryMatch!);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <span>{isKm ? 'ទំព័រម្ហូបពេញ' : 'Open Dish Page'}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* 5. INGREDIENTS WITH REALISTIC QUANTITIES */}
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block mb-2 flex items-center gap-1.5">
                              <ChefHat className="w-4 h-4 text-emerald-600" />
                              <span>{isKm ? '៥. គ្រឿងផ្សំ និងបរិមាណពិតប្រាកដ (រូបមន្តពិត ១០០%)៖' : '5. Verified Ingredients & Quantities:'}</span>
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {scanResult.primaryMatch.ingredients.map((ing, idx) => (
                                <div
                                  key={idx}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-emerald-500/25 flex items-center justify-between text-[11px]"
                                >
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{ing.nameKh}</span>
                                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{ing.amount}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 6. STEP-BY-STEP COOKING INSTRUCTIONS IN KHMER */}
                          {scanResult.primaryMatch.cookingSteps && scanResult.primaryMatch.cookingSteps.length > 0 && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                              <span className="font-bold text-slate-900 dark:text-white block mb-2 flex items-center gap-1.5">
                                <ListChecks className="w-4 h-4 text-amber-500" />
                                <span>{isKm ? '៦. របៀបធ្វើ និងជំហានចម្អិនលម្អិត៖' : '6. Step-by-Step Cooking Instructions:'}</span>
                              </span>
                              <div className="space-y-2">
                                {scanResult.primaryMatch.cookingSteps.map((step) => (
                                  <div
                                    key={step.stepNumber}
                                    className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700 flex items-start gap-2.5"
                                  >
                                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                      {step.stepNumber}
                                    </span>
                                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                      {isKm ? step.instructionKh : step.instructionEn}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 7. PREPARATION TIME, COOKING TIME, SERVING SIZE & VERIFIED CALORIES */}
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="font-bold text-slate-900 dark:text-white block mb-2 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-emerald-600" />
                              <span>
                                {isKm
                                  ? '៧. រយៈពេលរៀបចំ ចម្អិន ចំនួនសម្រាប់បរិភោគ និងកាឡូរី៖'
                                  : '7. Prep Time, Cook Time, Servings & Nutritional Info:'}
                              </span>
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] text-slate-500 block">{isKm ? 'រៀបចំគ្រឿង' : 'Prep Time'}</span>
                                <strong className="text-slate-800 dark:text-slate-200">{scanResult.primaryMatch.prepTime}</strong>
                              </div>
                              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] text-slate-500 block">{isKm ? 'រយៈពេលចម្អិន' : 'Cook Time'}</span>
                                <strong className="text-slate-800 dark:text-slate-200">{scanResult.primaryMatch.cookTime}</strong>
                              </div>
                              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] text-slate-500 block">{isKm ? 'សម្រាប់បរិភោគ' : 'Servings'}</span>
                                <strong className="text-slate-800 dark:text-slate-200">{scanResult.primaryMatch.servings}</strong>
                              </div>
                              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] text-slate-500 block">{isKm ? 'កាឡូរីប៉ាន់ស្មាន' : 'Calories'}</span>
                                <strong className="text-emerald-700 dark:text-emerald-400">
                                  {scanResult.primaryMatch.calories
                                    ? `${scanResult.primaryMatch.calories} kcal`
                                    : isKm
                                    ? 'មិនមានទិន្នន័យបញ្ជាក់'
                                    : 'N/A'}
                                </strong>
                              </div>
                            </div>
                          </div>

                          {/* Matching Restaurants */}
                          {matchingRestaurants.length > 0 && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                              <span className="font-bold text-slate-900 dark:text-white block mb-1.5 flex items-center gap-1">
                                <Utensils className="w-3.5 h-3.5 text-amber-500" />
                                <span>{isKm ? 'ភោជនីយដ្ឋានល្បីដែលមានមុខម្ហូបនេះ៖' : 'Famous Restaurants Serving This:'}</span>
                              </span>
                              <div className="space-y-1.5">
                                {matchingRestaurants.map((r) => (
                                  <div
                                    key={r.id}
                                    onClick={() => {
                                      handleClose();
                                      setSelectedRestaurant(r);
                                    }}
                                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
                                  >
                                    <div>
                                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{r.nameKh}</span>
                                      <span className="text-[10px] text-slate-500">{r.provinceKh}</span>
                                    </div>
                                    <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                                      ⭐ {r.rating} ({r.reviewCount})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ========================================================== */}
                      {/* CASE B: NON-DISH ITEM (FRUIT, VEGETABLE, RAW MEAT,         */}
                      {/*         PACKAGED FOOD, OR INGREDIENT) — Step 3 Requirement */}
                      {/* ========================================================== */}
                      {!scanResult.primaryMatch && scanResult.nonDishItemInfo && (
                        <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border-2 border-amber-500/40 space-y-3.5">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-amber-500 shrink-0" />
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                              {isKm
                                ? 'ព័ត៌មានអំពីវត្ថុអាហារ / គ្រឿងផ្សំដែលពិនិត្យឃើញ៖'
                                : 'Identified Food Item / Ingredient Information:'}
                            </h4>
                          </div>

                          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                            {isKm ? scanResult.nonDishItemInfo.descriptionKh : scanResult.nonDishItemInfo.descriptionEn}
                          </p>

                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5 text-[11px]">
                            <div>
                              <strong className="text-emerald-700 dark:text-emerald-400">
                                {isKm ? 'ការប្រើប្រាស់ក្នុងមុខម្ហូបខ្មែរ៖ ' : 'Culinary Uses: '}
                              </strong>
                              <span className="text-slate-700 dark:text-slate-300">
                                {isKm ? scanResult.nonDishItemInfo.culinaryUsesKh : scanResult.nonDishItemInfo.culinaryUsesEn}
                              </span>
                            </div>
                            <div>
                              <strong className="text-amber-700 dark:text-amber-400">
                                {isKm ? 'ការរក្សាទុក៖ ' : 'Storage Tips: '}
                              </strong>
                              <span className="text-slate-700 dark:text-slate-300">{scanResult.nonDishItemInfo.storageTipsKh}</span>
                            </div>
                          </div>

                          {scanResult.disclaimerKh && (
                            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300/60 dark:border-amber-700 text-[10px] text-amber-900 dark:text-amber-200 font-semibold">
                              {isKm ? scanResult.disclaimerKh : scanResult.disclaimerEn}
                            </div>
                          )}

                          {/* Clearly Labeled Recommended Dishes Using This Ingredient */}
                          {scanResult.recommendedDishesFromIngredient &&
                            scanResult.recommendedDishesFromIngredient.length > 0 && (
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                <span className="font-bold text-slate-900 dark:text-white block text-xs">
                                  {isKm
                                    ? '🍲 មុខម្ហូបណែនាំដែលអាចចម្អិនពីវត្ថុធាតុដើមនេះ (Recommended Dishes Using This Ingredient)៖'
                                    : '🍲 Recommended Dishes You Can Cook With This Ingredient:'}
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {scanResult.recommendedDishesFromIngredient.map((dish) => (
                                    <div
                                      key={dish.id}
                                      onClick={() => {
                                        handleSelectCandidate({
                                          id: dish.id,
                                          nameKh: dish.nameKh,
                                          nameEn: dish.nameEn,
                                          objectType: 'cooked_dish',
                                          confidenceScore: 0.95,
                                          visualCluesKh: `មុខម្ហូបណែនាំដែលប្រើប្រាស់គ្រឿងផ្សំនេះ`,
                                          visualCluesEn: `Recommended dish using this ingredient`,
                                          matchReasonKh: `មុខម្ហូបណែនាំ`,
                                          matchReasonEn: `Recommended Dish`,
                                          foodItem: dish,
                                        });
                                      }}
                                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 cursor-pointer transition flex items-center justify-between gap-2"
                                    >
                                      <div className="truncate">
                                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                                          {dish.nameKh}
                                        </span>
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                          {isKm ? 'ចុចមើលរូបមន្ត និងរបៀបធ្វើ' : 'Tap to view recipe'}
                                        </span>
                                      </div>
                                      <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEARCH BY HOME INGREDIENTS */}
          {activeTab === 'ingredients' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">
                  {isKm ? 'ជ្រើសរើសគ្រឿងផ្សំដែលអ្នកមាននៅផ្ទះ' : 'Select ingredients available at home'}
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  {isKm ? 'AI នឹងផ្គូផ្គង និងបង្ហាញមុខម្ហូបខ្មែរដែលអ្នកអាចចម្អិនបានភ្លាមៗ' : 'AI finds what Cambodian dishes you can cook right now.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                {COMMON_KHMER_INGREDIENTS.map((ing) => {
                  const isSelected = selectedIngredients.includes(ing);
                  return (
                    <button
                      key={ing}
                      onClick={() => handleToggleIngredient(ing)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <span>{ing}</span>
                      {isSelected && <X className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customIngredientInput}
                  onChange={(e) => setCustomIngredientInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomIngredient()}
                  placeholder={isKm ? 'បញ្ចូលគ្រឿងផ្សំផ្សេងទៀត...' : 'Enter custom ingredient...'}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleAddCustomIngredient}
                  className="px-4 py-2 rounded-xl bg-[#064E3B] text-white font-bold text-xs hover:bg-[#047857] transition cursor-pointer"
                >
                  {isKm ? '+ បន្ថែម' : '+ Add'}
                </button>
              </div>

              {selectedIngredients.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isKm ? `មុខម្ហូបផ្គូផ្គងបាន (${ingredientResults.length} មុខ)៖` : `Matched Dishes (${ingredientResults.length}):`}
                    </span>
                    <button onClick={() => setSelectedIngredients([])} className="text-[10px] text-rose-500 hover:underline">
                      {isKm ? 'ជម្រះទាំងអស់' : 'Clear all'}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {ingredientResults.slice(0, 10).map((res) => (
                      <div
                        key={res.foodItem.id}
                        onClick={() => {
                          handleClose();
                          setSelectedFood(res.foodItem);
                        }}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <img src={res.foodItem.photoUrl} alt={res.foodItem.nameKh} className="w-12 h-12 rounded-xl object-cover" />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{res.foodItem.nameKh}</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              {isKm
                                ? `មានគ្រឿងផ្សំ ${res.matchedIngredientsCount}/${res.totalDishIngredients} មុខ`
                                : `Has ${res.matchedIngredientsCount}/${res.totalDishIngredients} items`}
                            </span>
                            {res.missingIngredients.length > 0 && (
                              <span className="text-[9px] text-slate-400 block truncate max-w-[200px]">
                                {isKm
                                  ? `ខ្វះ៖ ${res.missingIngredients.slice(0, 2).join(', ')}`
                                  : `Missing: ${res.missingIngredients.slice(0, 2).join(', ')}`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px]">
                            {res.matchPercentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PERSONALIZED PREFERENCES & DIET */}
          {activeTab === 'preferences' && (
            <div className="space-y-3.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchPrefQuery}
                  onChange={(e) => setSearchPrefQuery(e.target.value)}
                  placeholder={isKm ? 'ស្វែងរកឈ្មោះម្ហូប ឬគ្រឿងផ្សំ...' : 'Search dish name or ingredient...'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  {isKm ? 'រសជាតិដែលចូលចិត្ត (Taste Preference)៖' : 'Taste Preference:'}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All' },
                    { id: 'sweet', labelKh: 'ផ្អែម', labelEn: 'Sweet' },
                    { id: 'sour', labelKh: 'ជូរ', labelEn: 'Sour' },
                    { id: 'spicy', labelKh: 'ហឹរ', labelEn: 'Spicy' },
                    { id: 'savory', labelKh: 'ដិត/ប្រៃ', labelEn: 'Savory' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTastePref(t.id as TastePreference)}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition text-center cursor-pointer ${
                        tastePref === t.id
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isKm ? t.labelKh : t.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  {isKm ? 'របបអាហារ (Dietary Preference)៖' : 'Dietary Preference:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', labelKh: 'ទូទៅ', labelEn: 'Regular' },
                    { id: 'vegetarian', labelKh: 'ម្ហូបបួស (Vegetarian)', labelEn: 'Vegetarian' },
                    { id: 'healthy', labelKh: 'សុខភាព (Healthy)', labelEn: 'Healthy' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDietaryPref(d.id as DietaryPreference)}
                      className={`py-2 px-1 rounded-xl text-[10px] font-bold transition text-center cursor-pointer ${
                        dietaryPref === d.id
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isKm ? d.labelKh : d.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  {isKm ? 'ថវិកា (Budget)៖' : 'Budget Level:'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'all', label: 'ទាំងអស់' },
                    { id: 'budget', label: '< $3.00' },
                    { id: 'medium', label: '$3 - $6' },
                    { id: 'premium', label: '> $6.00' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBudgetPref(b.id as BudgetLevel)}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition text-center cursor-pointer ${
                        budgetPref === b.id
                          ? 'bg-[#064E3B] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white block">
                  {isKm ? `លទ្ធផលណែនាំ (${preferenceResults.length} មុខ)៖` : `Recommended Results (${preferenceResults.length}):`}
                </span>

                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {preferenceResults.slice(0, 8).map((f) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        handleClose();
                        setSelectedFood(f);
                      }}
                      className="p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition cursor-pointer flex items-center gap-2"
                    >
                      <img src={f.photoUrl} alt={f.nameKh} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{f.nameKh}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          ${(f.priceUsd || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Camera, Image as ImageIcon, Sparkles, AlertCircle, 
  CheckCircle2, Clock, ChefHat, Flame, Utensils, Search, 
  Filter, Crown, ChevronRight, RefreshCw, Info, Heart
} from 'lucide-react';
import { FoodItem } from '../types';
import { 
  identifyFoodWithAi, 
  searchByHomeIngredients, 
  getPersonalizedRecommendations,
  getAiDailyQuota,
  recordAiScanUsage,
  AiFoodRecognitionResult,
  HomeIngredientsMatchResult,
  TastePreference,
  DietaryPreference,
  BudgetLevel,
  MaxPrepTime
} from '../services/aiFoodService';

const COMMON_KHMER_INGREDIENTS = [
  'សាច់មាន់', 'សាច់ជ្រូក', 'ត្រីរ៉ស់', 'សាច់គោ', 'បង្គា',
  'ស៊ុតមាន់', 'ខ្ទិះដូង', 'ស្លឹកគ្រៃ', 'រមៀត', 'រំដេង',
  'ស្ករត្នោត', 'ទឹកត្រី', 'ប្រហុក', 'ម្ទេស', 'ខ្ទឹមស',
  'ស្លឹកក្រូចសើច', 'ត្រកួន', 'ល្ហុង', 'ចេកទុំ', 'ម្សៅដំណើប'
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
    setSelectedRestaurant
  } = useApp();

  const isKm = language === 'km';

  // Active Tab: 'scan' | 'ingredients' | 'preferences'
  const [activeTab, setActiveTab] = useState<'scan' | 'ingredients' | 'preferences'>('scan');

  // Scanner States
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [customHint, setCustomHint] = useState<string>('');
  const [scanResult, setScanResult] = useState<AiFoodRecognitionResult | null>(null);

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

  // Quota status
  const quota = useMemo(() => {
    return getAiDailyQuota(currentUser?.membershipTier, currentUser?.subscriptionExpiryDate);
  }, [currentUser, isAnalyzing]);

  // Ingredients Search computation
  const ingredientResults: HomeIngredientsMatchResult[] = useMemo(() => {
    if (selectedIngredients.length === 0) return [];
    return searchByHomeIngredients(selectedIngredients, foods);
  }, [selectedIngredients, foods]);

  // Preferences Filter computation
  const preferenceResults: FoodItem[] = useMemo(() => {
    return getPersonalizedRecommendations({
      taste: tastePref,
      dietary: dietaryPref,
      budget: budgetPref,
      maxPrepTime: prepTimePref,
      searchQuery: searchPrefQuery
    }, foods);
  }, [tastePref, dietaryPref, budgetPref, prepTimePref, searchPrefQuery, foods]);

  // Matching restaurants for identified food
  const matchingRestaurants = useMemo(() => {
    if (!scanResult?.primaryMatch) return [];
    const dishNameKh = (scanResult.primaryMatch.nameKh || '').toLowerCase();
    const dishNameEn = (scanResult.primaryMatch.nameEn || '').toLowerCase();
    return restaurants.filter(r => {
      const sigs = (r.signatureDishesKh || []).map(s => s.toLowerCase());
      return sigs.some(s => dishNameKh.includes(s) || s.includes(dishNameKh)) ||
             (r.descriptionKh || '').toLowerCase().includes(dishNameKh) ||
             (r.descriptionEn || '').toLowerCase().includes(dishNameEn);
    }).slice(0, 3);
  }, [scanResult, restaurants]);

  if (!isAiFoodDiscoveryModalOpen) return null;

  const handleClose = () => {
    setIsAiFoodDiscoveryModalOpen(false);
  };

  // Image Upload & AI Scan Handler
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

        // Add 600ms realistic processing delay for AI vision inference
        await new Promise(r => setTimeout(r, 600));

        const result = await identifyFoodWithAi(dataUrl, foods, customHint);
        setScanResult(result);
        setIsAnalyzing(false);

        // Record scan usage
        recordAiScanUsage();

        if (result.status === 'confident') {
          showToast(isKm ? '✅ AI បានសម្គាល់មុខម្ហូបជោគជ័យ!' : '✅ Food recognized successfully!', 'success');
        } else if (result.status === 'uncertain') {
          showToast(isKm ? '🔍 រកឃើញមុខម្ហូបប្រហាក់ប្រហែល សូមពិនិត្យបញ្ជី!' : '🔍 Similar dishes found, please check list!', 'info');
        } else {
          showToast(isKm ? '⚠️ រូបភាពមិនច្បាស់លាស់ សូមសាកល្បងម្ដងទៀត' : '⚠️ Unclear image, please try again', 'warning');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsAnalyzing(false);
      showToast(isKm ? 'បរាជ័យក្នុងការអានរូបថត' : 'Failed to read photo', 'warning');
    }
  };

  const handleToggleIngredient = (ing: string) => {
    setSelectedIngredients(prev => 
      prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]
    );
  };

  const handleAddCustomIngredient = () => {
    const trimmed = customIngredientInput.trim();
    if (trimmed && !selectedIngredients.includes(trimmed)) {
      setSelectedIngredients(prev => [...prev, trimmed]);
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
                  {isKm ? 'ស្កេនសម្គាល់មុខម្ហូប • រូបមន្តពិត ១០០% • ណែនាំតាមចំណង់ចំណូលចិត្ត' : 'Vision Recognition • 100% Verified Recipes • Taste Match'}
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

          {/* TAB 1: AI PHOTO SCANNER */}
          {activeTab === 'scan' && (
            <div className="space-y-4">
              {/* Photo Input Actions */}
              {!photoDataUrl ? (
                <div className="p-6 border-2 border-dashed border-emerald-500/40 rounded-3xl bg-emerald-50/30 dark:bg-slate-800/40 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {isKm ? 'ថត ឬជ្រើសរើសរូបថតម្ហូបខ្មែរ' : 'Take or upload a Cambodian food photo'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      {isKm 
                        ? 'AI នឹងសម្គាល់ឈ្មោះម្ហូប បង្ហាញរូបមន្ត គ្រឿងផ្សំពិតប្រាកដ និងហាងដែលមានលក់' 
                        : 'AI identifies the dish, authentic ingredients, verified recipe and restaurants.'}
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

                  {/* Hidden file inputs */}
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
                /* Photo Preview & Results */
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 max-h-56 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    <img 
                      src={photoDataUrl} 
                      alt="Food preview" 
                      className="w-full h-56 object-cover" 
                    />
                    
                    {/* Retake Button */}
                    <button
                      onClick={() => {
                        setPhotoDataUrl('');
                        setScanResult(null);
                      }}
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white text-[11px] font-bold backdrop-blur-sm transition flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isKm ? 'ប្តូររូបថត' : 'Retake'}</span>
                    </button>

                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 text-white">
                        <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        <span className="font-bold text-xs">{isKm ? 'AI កំពុងវិភាគរូបសណ្ឋានម្ហូបខ្មែរ...' : 'Analyzing dish visual features...'}</span>
                      </div>
                    )}
                  </div>

                  {/* Recognition Result Display */}
                  {scanResult && !isAnalyzing && (
                    <div className="space-y-3 animate-fade-in">
                      {/* Primary Identified Dish Card */}
                      {scanResult.primaryMatch ? (
                        <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800/90 dark:to-slate-800/50 border-2 border-emerald-500/50 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                                  {isKm ? 'សម្គាល់ឃើញ' : 'Identified'}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-black">
                                  {Math.round(scanResult.confidenceScore * 100)}% Match
                                </span>
                              </div>
                              <h3 className="font-moul text-base text-slate-900 dark:text-white mt-1.5">
                                {scanResult.primaryMatch.nameKh}
                              </h3>
                              <p className="text-xs text-slate-600 dark:text-slate-300 font-sans font-medium">
                                {scanResult.primaryMatch.nameEn}
                              </p>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-semibold">
                                {scanResult.primaryMatch.categoryKh}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                handleClose();
                                setSelectedFood(scanResult.primaryMatch!);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <span>{isKm ? 'រូបមន្តលម្អិត' : 'Full Recipe'}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quick Recipe Metrics */}
                          <div className="grid grid-cols-3 gap-2 py-2 border-y border-emerald-500/20 text-center">
                            <div className="p-1.5 rounded-xl bg-white/70 dark:bg-slate-900/60">
                              <span className="text-[10px] text-slate-500 block">{isKm ? 'ចម្អិន' : 'Cook Time'}</span>
                              <strong className="text-slate-800 dark:text-slate-200">{scanResult.primaryMatch.cookTime}</strong>
                            </div>
                            <div className="p-1.5 rounded-xl bg-white/70 dark:bg-slate-900/60">
                              <span className="text-[10px] text-slate-500 block">{isKm ? 'បរិភោគ' : 'Servings'}</span>
                              <strong className="text-slate-800 dark:text-slate-200">{scanResult.primaryMatch.servings}</strong>
                            </div>
                            <div className="p-1.5 rounded-xl bg-white/70 dark:bg-slate-900/60">
                              <span className="text-[10px] text-slate-500 block">{isKm ? 'កាឡូរី' : 'Calories'}</span>
                              <strong className="text-emerald-700 dark:text-emerald-400">
                                {scanResult.primaryMatch.calories ? `${scanResult.primaryMatch.calories} kcal` : 'មិនមានទិន្នន័យបញ្ជាក់'}
                              </strong>
                            </div>
                          </div>

                          {/* Authentic Ingredients Preview */}
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block mb-1.5 flex items-center gap-1">
                              <ChefHat className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{isKm ? 'គ្រឿងផ្សំសំខាន់ៗ (រូបមន្តពិត ១០០%)៖' : 'Key Ingredients (100% Authentic):'}</span>
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {scanResult.primaryMatch.ingredients.map((ing, idx) => (
                                <span 
                                  key={idx}
                                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-500/30 text-slate-700 dark:text-slate-300 text-[10px]"
                                >
                                  {ing.nameKh} ({ing.amount})
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Matching Restaurants that serve this dish */}
                          {matchingRestaurants.length > 0 && (
                            <div className="pt-2 border-t border-emerald-500/20">
                              <span className="font-bold text-slate-900 dark:text-white block mb-1.5 flex items-center gap-1">
                                <Utensils className="w-3.5 h-3.5 text-amber-500" />
                                <span>{isKm ? 'ភោជនីយដ្ឋានល្បីដែលមានមុខម្ហូបនេះ៖' : 'Famous Restaurants Serving This:'}</span>
                              </span>
                              <div className="space-y-1.5">
                                {matchingRestaurants.map(r => (
                                  <div
                                    key={r.id}
                                    onClick={() => {
                                      handleClose();
                                      setSelectedRestaurant(r);
                                    }}
                                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
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
                      ) : (
                        /* Unclear / Need More Info State */
                        <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-center space-y-2">
                          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                          <h4 className="font-bold text-amber-900 dark:text-amber-200">
                            {isKm ? 'មិនអាចសម្គាល់មុខម្ហូបបានច្បាស់លាស់ឡើយ' : 'Could not reliably identify dish'}
                          </h4>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] max-w-sm mx-auto">
                            {scanResult.messageKh}
                          </p>
                        </div>
                      )}

                      {/* Candidate Alternatives if uncertain */}
                      {scanResult.candidateMatches.length > 1 && (
                        <div className="space-y-2 pt-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">
                            {isKm ? 'មុខម្ហូបស្រដៀងគ្នាផ្សេងទៀត (Alternative Matches)៖' : 'Alternative Matches:'}
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {scanResult.candidateMatches.slice(1).map(c => (
                              <div
                                key={c.foodItem.id}
                                onClick={() => {
                                  handleClose();
                                  setSelectedFood(c.foodItem);
                                }}
                                className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500 transition"
                              >
                                <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{c.foodItem.nameKh}</span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                  {Math.round(c.confidenceScore * 100)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Optional Hint Refinement if user wants to specify dish keyword */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                          {isKm ? '💡 ប្រសិនបើមិនទាន់ត្រូវមុខម្ហូប សូមបញ្ជាក់ឈ្មោះ ឬគ្រឿងផ្សំបន្ថែម៖' : '💡 Need a closer match? Enter dish name or hint:'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customHint}
                            onChange={(e) => setCustomHint(e.target.value)}
                            placeholder={isKm ? 'ឧ. អាម៉ុកត្រី, នំបញ្ចុក, បង្អែម...' : 'e.g. Fish Amok, Num Banh Chok...'}
                            className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={async () => {
                              if (!photoDataUrl) return;
                              setIsAnalyzing(true);
                              const refined = await identifyFoodWithAi(photoDataUrl, foods, customHint);
                              setScanResult(refined);
                              setIsAnalyzing(false);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer shrink-0"
                          >
                            {isKm ? '🔍 វិភាគម្ដងទៀត' : '🔍 Re-analyze'}
                          </button>
                        </div>
                      </div>
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

              {/* Common Ingredients Chips */}
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                {COMMON_KHMER_INGREDIENTS.map(ing => {
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

              {/* Add Custom Ingredient Input */}
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

              {/* Matching Dishes List */}
              {selectedIngredients.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isKm ? `មុខម្ហូបផ្គូផ្គងបាន (${ingredientResults.length} មុខ)៖` : `Matched Dishes (${ingredientResults.length}):`}
                    </span>
                    <button
                      onClick={() => setSelectedIngredients([])}
                      className="text-[10px] text-rose-500 hover:underline"
                    >
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
                          <img 
                            src={res.foodItem.photoUrl} 
                            alt={res.foodItem.nameKh}
                            className="w-12 h-12 rounded-xl object-cover" 
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{res.foodItem.nameKh}</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              {isKm ? `មានគ្រឿងផ្សំ ${res.matchedIngredientsCount}/${res.totalDishIngredients} មុខ` : `Has ${res.matchedIngredientsCount}/${res.totalDishIngredients} items`}
                            </span>
                            {res.missingIngredients.length > 0 && (
                              <span className="text-[9px] text-slate-400 block truncate max-w-[200px]">
                                {isKm ? `ខ្វះ៖ ${res.missingIngredients.slice(0, 2).join(', ')}` : `Missing: ${res.missingIngredients.slice(0, 2).join(', ')}`}
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
              {/* Search text */}
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

              {/* Taste Preference */}
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
                  ].map(t => (
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

              {/* Dietary */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  {isKm ? 'របបអាហារ (Dietary Preference)៖' : 'Dietary Preference:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', labelKh: 'ទូទៅ', labelEn: 'Regular' },
                    { id: 'vegetarian', labelKh: 'ម្ហូបបួស (Vegetarian)', labelEn: 'Vegetarian' },
                    { id: 'healthy', labelKh: 'សុខភាព (Healthy)', labelEn: 'Healthy' },
                  ].map(d => (
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

              {/* Budget */}
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
                  ].map(b => (
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

              {/* Filtered Dishes Results */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white block">
                  {isKm ? `លទ្ធផលណែនាំ (${preferenceResults.length} មុខ)៖` : `Recommended Results (${preferenceResults.length}):`}
                </span>

                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {preferenceResults.slice(0, 8).map(f => (
                    <div
                      key={f.id}
                      onClick={() => {
                        handleClose();
                        setSelectedFood(f);
                      }}
                      className="p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition cursor-pointer flex items-center gap-2"
                    >
                      <img 
                        src={f.photoUrl} 
                        alt={f.nameKh} 
                        className="w-10 h-10 rounded-xl object-cover shrink-0" 
                      />
                      <div className="truncate">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{f.nameKh}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">${f.priceUsd.toFixed(2)}</span>
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

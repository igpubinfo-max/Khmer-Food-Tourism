import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Award,
  Shuffle,
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
  Send,
  Compass,
  Store,
  RotateCcw,
  ExternalLink,
  Leaf,
  Utensils,
  Soup,
  Salad,
  Camera,
} from 'lucide-react';
import { FoodItem, isGpipRegisteredRestaurant, isHotelBusinessRecord, openExternalUrlNativeSafe, openRestaurantGoogleExternal, resolveFoodPhotoUrl, handleFoodImageError, isIosOrIpadAppStoreRuntime } from '../types';
import {
  buildAgentRoleChips,
  recordAiAgentTelemetryEvent,
  resolveAiAgentUserRole,
  tryExecuteAiAgentTurn,
} from '../services/aiAgentPlatformService';
import { verifyUserVipStatusFromBackend } from '../services/supabaseService';
import {
  IconFoodPicks,
  IconBeveragePairing,
  IconDishCategory,
  IconCravingSpark,
  IconGrillFlame,
  IconZestyCitrus,
} from './icons/HandcraftedIcons';
import { ShopAvatar } from './icons/DefaultShopIcon';
import { tr } from '../utils/i18n';
import { FOOD_WATERMARK_TEXT, FOOD_WATERMARK_BADGE_CLASS, isUrlWatermarkedAtPixelLevel } from '../utils/foodWatermark';
import { grantAiConsent } from '../services/aiConsent';
import { getLocalizedFood, getLocalizedRestaurant, getLocalizedDestination } from '../utils/zhDynamicTranslator';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import { hasSpecialAndHealthyFoodVipAccess } from '../utils/smartHub';
import { getDishTagIds, type DishTagId } from '../utils/dishTags';
import { getMatchingRestaurantsForDish } from '../utils/foodFilters';
import {
  getSpicyDishScore,
  isSweetOrBeverageFood,
  normalizeKhmerFoodText,
  parseKhmerFoodSearchQuery,
} from '../utils/khmerFoodSearch';
import {
  getAiFoodAdvisorRecommendations,
  QUICK_CRAVING_CHIPS,
  isVegetarianQuery,
  classifyVegetarianDish,
} from '../services/aiFoodAdvisorService';
import { isMedicalOrHealthQuery, describeDish, pickDistinctFlavorDishes } from '../services/aiFoodBrain';
import {
  buildWelcomeAssistantMessage,
  generateConversationalAiResponse,
  fetchOnlineDishPhotoByQuery,
  detectOutOfCatalogDishName,
  createOutOfCatalogDishItem,
  resolveGeminiApiKey,
  testGeminiApiConnection,
  type AiAssistantMessage,
  type AiConversationMemory,
} from '../services/conversationalAiAssistant';
import { saveCloudApiConfig } from '../services/supabaseService';
import {
  rankDrinkPairingDishes,
  getDrinkPairing,
  pairingReason,
  pairingKindsLabel,
  type DrinkKindFilter,
} from '../utils/drinkPairing';
import { isAuthenticCambodianDishForMealTime } from '../utils/cambodianMealHabits';
import { RichAnswerText } from './RichAnswerText';
import { prepareFoodImage, FoodImageError, type PreparedFoodImage } from '../utils/foodImageUpload';
import {
  askFoodAssistant,
  isAiGatewayConfigured,
  buildAssistantFailureMessage,
  toHistoryTurns,
  type FoodAssistantFailure,
} from '../services/foodAssistantLlm';
import { fetchVerifiedDishPhotoByEnglishName } from '../utils/universalDishOpenApi';
import { foodPhotoSrc, fallbackPhotoFor, hasRenderablePhoto, isGeneratedDishId } from '../utils/generatedDish';

type MealSlotFilter = 'auto' | 'breakfast' | 'lunch' | 'afternoon' | 'dinner';
type VipDietFilter = 'none' | 'light' | 'protein_rich' | 'steamed_boiled' | 'vegetable_rich';
type MenuGroupId = 'time' | 'type' | 'craving' | 'health';

const MEAL_SLOTS: Array<{ id: MealSlotFilter; kh: string; en: string; zh: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'auto', kh: 'ពេលនេះ', en: 'Right Now', zh: '当前时段', icon: Clock },
  { id: 'breakfast', kh: 'ពេលព្រឹក', en: 'Breakfast', zh: '早餐', icon: Coffee },
  { id: 'lunch', kh: 'ថ្ងៃត្រង់', en: 'Lunch', zh: '午餐', icon: Sun },
  { id: 'afternoon', kh: 'រសៀល', en: 'Snack', zh: '下午茶', icon: Utensils },
  { id: 'dinner', kh: 'ពេលល្ងាច', en: 'Dinner', zh: '晚餐', icon: Moon },
];

const CATEGORY_OPTIONS = [
  { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All', labelZh: '全部' },
  { id: 'rice', labelKh: 'បាយ', labelEn: 'Rice Dishes', labelZh: '米饭/炒饭' },
  { id: 'noodles', labelKh: 'គុយទាវ/នំបញ្ចុក', labelEn: 'Noodles', labelZh: '粉面' },
  { id: 'soup', labelKh: 'សម្ល/ស៊ុប', labelEn: 'Soup & Curry', labelZh: '汤品/咖喱' },
  { id: 'stirfry', labelKh: 'ឆា', labelEn: 'Stir-Fry', labelZh: '热炒' },
  { id: 'grilled', labelKh: 'អាំង/បំពង', labelEn: 'Grilled & Fried', labelZh: '烧烤/煎炸' },
  { id: 'salad', labelKh: 'ញាំ/ភ្លា', labelEn: 'Salads & Dips', labelZh: '凉拌/蘸酱' },
  { id: 'dessert', labelKh: 'បង្អែម', labelEn: 'Desserts', labelZh: '甜品' },
];

const HEALTH_OPTIONS: Array<{
  id: VipDietFilter;
  vip: boolean;
  labelKh: string;
  labelEn: string;
  labelZh: string;
  shortKh: string;
  shortEn: string;
  shortZh: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'none',
    vip: false,
    labelKh: 'ធម្មតា',
    labelEn: 'Standard',
    labelZh: '常规推荐',
    shortKh: 'ធម្មតា',
    shortEn: 'Standard',
    shortZh: '常规',
    icon: Utensils,
  },
  {
    id: 'light',
    vip: true,
    labelKh: 'ស្រាលក្រពះ (<450 kcal)',
    labelEn: 'Light (<450 kcal)',
    labelZh: '清淡低卡 (<450 kcal)',
    shortKh: 'ស្រាលក្រពះ',
    shortEn: 'Light',
    shortZh: '清淡',
    icon: Leaf,
  },
  {
    id: 'protein_rich',
    vip: true,
    labelKh: 'ប្រូតេអ៊ីនខ្ពស់',
    labelEn: 'High Protein',
    labelZh: '高蛋白',
    shortKh: 'ប្រូតេអ៊ីនខ្ពស់',
    shortEn: 'Protein',
    shortZh: '高蛋白',
    icon: Award,
  },
  {
    id: 'steamed_boiled',
    vip: true,
    labelKh: 'ស្ងោរ/ចំហុយ',
    labelEn: 'Steamed / Boiled',
    labelZh: '清蒸/水煮',
    shortKh: 'ស្ងោរ/ចំហុយ',
    shortEn: 'Steamed',
    shortZh: '蒸/煮',
    icon: Soup,
  },
  {
    id: 'vegetable_rich',
    vip: true,
    labelKh: 'បន្លែច្រើន',
    labelEn: 'Vegetable-Rich',
    labelZh: '多蔬菜',
    shortKh: 'បន្លែច្រើន',
    shortEn: 'Veggies',
    shortZh: '多蔬菜',
    icon: Salad,
  },
];

function matchesCategoryStrict(food: FoodItem, categoryFilter: string): boolean {
  if (categoryFilter === 'all') return true;
  const title = `${food.nameKh || ''} ${food.nameEn || ''}`.toLowerCase();
  const khName = (food.nameKh || '').trim();
  const isDessert =
    food.categorySlug === 'dessert' ||
    food.categorySlug === 'cake' ||
    /^បង្អែម|ចេកខ្ទិះ|សង់ខ្យា|អន្សម|ក្រឡាន|បបរផ្អែម|បាញ់ឌុក|លតស្វិត|នំផ្លែអាយ|នំកង|នំចាក់ចុល|\bdessert\b|\bcustard\b/i.test(
      title
    );

  switch (categoryFilter) {
    case 'rice':
      if (isDessert) return false;
      return (
        food.categorySlug === 'rice' ||
        /^បាយ|បាយឆា|បាយសាច់|បាយមាន់|បាយក្ដាំង|បាយក្តាំង|បាយស្រូប|\bfried\s*rice\b|\bpork\s*rice\b|\bchicken\s*rice\b/i.test(
          title
        )
      );
    case 'noodles':
      if (isDessert || /ទឹកត្រីផ្អែម|លតស្វិត|^សម្ល|^ចាដូវ|^គួង|^បាយ/i.test(khName)) return false;
      return /^គុយទាវ|^មី|^នំបញ្ចុក|^លត|^ហ្វឺ|គុយទាវ|នំបញ្ចុក|មីឆា|មីស៊ុប|មីសួរ|មីទាញ|លតឆា|\bnoodle\b|\bkuy\s*teav\b|\bbanh\s*chok\b|\blort\b|\bpho\b|\bvermicelli\b/i.test(
        title
      );
    case 'soup':
      if (isDessert || /^គុយទាវ|^នំបញ្ចុក|^មី/i.test(khName)) return false;
      return (
        food.categorySlug === 'soup' ||
        /^សម្ល|^ស៊ុប|ម្ជូរ|កកូរ|ការី|^ស្ងោរ|^អាម៉ុក|\bsoup\b|\bcurry\b|\bsamlor\b|\bamok\b|\bbroth\b/i.test(title)
      );
    case 'grilled':
      if (isDessert || /^បាយ|^គុយទាវ|^មី|^លត|^សម្ល/i.test(khName)) return false;
      return (
        food.categorySlug === 'grilled' ||
        /អាំង|បំពង|ចៀន|ដុត|\bgrilled\b|\bfried\b|\bcrispy\b|\broast\b|\bbbq\b/i.test(title)
      );
    case 'stirfry':
      if (isDessert) return false;
      return (
        food.categorySlug === 'stirfry' ||
        /^ឆា|ឡុកឡាក់|ឆាក្តៅ|ឆាខ្ញី|ឆាម្រះព្រៅ|\bstir[\s-]*fr|\blok\s*lak\b/i.test(title)
      );
    case 'salad':
      if (isDessert || /^សាច់គោអាំង|^ត្រីអាំង|^មាន់អាំង/i.test(khName)) return false;
      return (
        food.categorySlug === 'salad' ||
        /^ញាំ|^ភ្លា|^បុក|^ទឹកគ្រឿង|^ប្រហុក|ញាំ|ភ្លា|បុក|\bsalad\b|\bceviche\b/i.test(title)
      );
    case 'dessert':
      if (/^សម្ល|^ឆា|^ស្ងោរ|^ត្រី|^សាច់|\bsoup\b|\bsour\b/i.test(title)) return false;
      return isDessert;
    default:
      return food.categorySlug === categoryFilter;
  }
}

function matchesMealSlotStrict(
  food: FoodItem,
  _mealSlotFilter: MealSlotFilter,
  effectiveMealSlot: Exclude<MealSlotFilter, 'auto'>
): boolean {
  const slot = effectiveMealSlot === 'afternoon' ? 'snack' : effectiveMealSlot;
  return isAuthenticCambodianDishForMealTime(food, slot);
}

function matchesDietStrict(food: FoodItem, vipDietFilter: VipDietFilter): boolean {
  if (vipDietFilter === 'none') return true;
  const tags = getDishTagIds(food);
  return tags.includes(vipDietFilter as DishTagId);
}

const stripLeadingSymbols = (s: string) => s.replace(/^[^\p{L}\p{N}]+/u, '').trim();

const PAIRING_SET_SIZE = 4;
const PAIRING_SETS_PER_PAGE = 2;

/**
 * Clear FREE / VIP access label shown on every Food Pick option.
 */
const AccessBadge: React.FC<{ vip: boolean; className?: string }> = ({ vip, className = '' }) => (
  <span
    role="img"
    aria-label={vip ? 'VIP' : 'FREE'}
    data-label={vip ? 'VIP' : 'FREE'}
    className={`inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[9px] leading-tight font-black tracking-wide shrink-0 whitespace-nowrap font-sans ${
      vip
        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-xs'
        : 'bg-emerald-500 text-white'
    } ${className}`}
  >
    {vip ? <Crown className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
    <span aria-hidden="true" className="after:content-[attr(data-label)]" data-label={vip ? 'VIP' : 'FREE'} />
  </span>
);

export const WhatToEatModal: React.FC = () => {
  const {
    isWhatToEatModalOpen,
    setIsWhatToEatModalOpen,
    setIsNearMeModalOpen,
    foods,
    restaurants,
    destinations,
    language,
    currentUser,
    setSelectedFood,
    setSelectedRestaurant,
    setSelectedDestination,
    openAddToWishlist,
    isItemInWishlist,
    openUpgradeVipModal,
    showToast,
    appSettings,
    updateAppSettings,
    refreshAppSettingsFromServer,
    trendingFoods,
    generateAiTripPlan,
    saveTripPlan,
    setIsAiTripPlannerModalOpen,
    setIsTrendingSocialModalOpen,
    setSelectedTrendingFood,
    setIsTrendingFoodDetailModalOpen,
    updateRestaurant,
    openManageMyVipStore,
  } = useApp();

  const isAdmin = Boolean(
    currentUser?.role === 'admin' ||
      currentUser?.id === 'admin-authorized-single' ||
      currentUser?.username === 'admin' ||
      currentUser?.username === 'cheasavuth'
  );
  const canUseVip = hasSpecialAndHealthyFoodVipAccess(currentUser);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [pendingImage, setPendingImage] = useState<PreparedFoodImage | null>(null);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [forceBigCard, setForceBigCard] = useState(false);
  const [inlineApiKeyInput, setInlineApiKeyInput] = useState('');
  const [isTestingInlineKey, setIsTestingInlineKey] = useState(false);
  const [confirmedOwnerUpdates, setConfirmedOwnerUpdates] = useState<Record<string, 'confirmed' | 'cancelled'>>({});
  const [savedItineraryIds, setSavedItineraryIds] = useState<Record<string, boolean>>({});
  const [backendVipVerified, setBackendVipVerified] = useState<boolean>(false);
  const [isVerifyingVipBackend, setIsVerifyingVipBackend] = useState<boolean>(false);
  const [showVipAiUpgradeNotice, setShowVipAiUpgradeNotice] = useState<boolean>(false);
  const userGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const canUseAiAssistant = Boolean(canUseVip && backendVipVerified);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filters: Conversational Input, Category, Meal Time, Dietary / Health Style
  const [cravingQuery, setCravingQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [mealSlotFilter, setMealSlotFilter] = useState<MealSlotFilter>('auto');
  const [vipDietFilter, setVipDietFilter] = useState<VipDietFilter>('none');
  const [isSpinning, setIsSpinning] = useState(false);
  const cravingInputRef = useRef<HTMLInputElement | null>(null);
  const dishCardRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [openGroup, setOpenGroup] = useState<MenuGroupId | null>(null);
  const [drinkMode, setDrinkMode] = useState(false);
  const [drinkKind, setDrinkKind] = useState<DrinkKindFilter>('all');
  const [setPage, setSetPage] = useState(0);
  const [drinkShuffleSeed, setDrinkShuffleSeed] = useState<number>(() => Date.now());

  // Multi-turn Conversational AI State
  const [chatMessages, setChatMessages] = useState<AiAssistantMessage[]>([]);
  const [chatMemory, setChatMemory] = useState<AiConversationMemory>({
    lastDishes: [],
    lastRestaurants: [],
    lastDestinations: [],
    activeProvinceKh: '',
    lastQuery: '',
    turnSeed: 1,
  });

  // Current dish index and history of seen dish IDs to prevent repetition across unlimited clicks
  const [currentDishId, setCurrentDishId] = useState<string>('');
  const [comparedDishIds, setComparedDishIds] = useState<string[]>([]);
  const [spinCount, setSpinCount] = useState<number>(0);
  const [onlinePhotoByDishId, setOnlinePhotoByDishId] = useState<Record<string, string>>({});
  const [failedOnlineDishIds, setFailedOnlineDishIds] = useState<Record<string, boolean>>({});
  const seenDishIdsRef = useRef<Set<string>>(new Set());
  const seenChatDishIdsRef = useRef<Set<string>>(new Set());
  const seenCompareDishIdsRef = useRef<Set<string>>(new Set());
  const seenPairingLeadIdsRef = useRef<Set<string>>(new Set());
  const comparePanelRef = useRef<HTMLDivElement>(null);
  const sendConversationalMessageRef = useRef<((rawText: string) => void) | null>(null);
  useBodyScrollLock(isWhatToEatModalOpen);

  const toggleCompareDish = (dishId: string) => {
    setComparedDishIds((prev) => {
      if (prev.includes(dishId)) {
        return prev.filter((id) => id !== dishId);
      }
      const next = [...prev, dishId].slice(-3);
      setTimeout(() => {
        comparePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
      return next;
    });
  };

  // Verify VIP status through the Supabase backend whenever modal opens or user changes
  useEffect(() => {
    let cancelled = false;
    if (!currentUser || !canUseVip) {
      setBackendVipVerified(false);
      setIsVerifyingVipBackend(false);
      return;
    }
    setIsVerifyingVipBackend(true);
    verifyUserVipStatusFromBackend(currentUser)
      .then((res) => {
        if (!cancelled) {
          setBackendVipVerified(res.isVip);
          if (res.isVip) {
            setShowVipAiUpgradeNotice(false);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBackendVipVerified(Boolean(canUseVip));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsVerifyingVipBackend(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isWhatToEatModalOpen, currentUser, canUseVip]);

  const promptVipUpgradeForAiAssistant = () => {
    setShowVipAiUpgradeNotice(true);
    showToast(
      tr(
        language,
        '👑 មុខងារ «ជំនួយការ AI ម្ហូបអាហារ» គឺសម្រាប់សមាជិក VIP ប៉ុណ្ណោះ! សូមដំឡើងទៅកាន់ VIP ដើម្បីសួរសំណួរ និងទទួលចម្លើយពី AI។',
        '👑 The AI Assistant feature is VIP-only! Please upgrade to VIP to submit questions and receive AI-generated answers.',
        '👑「AI 美食助手」为 VIP 会员专属功能！请升级 VIP 以提问并获取 AI 回答。'
      ),
      'info'
    );
    openUpgradeVipModal();
  };

  // Initialize welcome message when modal opens or language changes
  useEffect(() => {
    if (isWhatToEatModalOpen) {
      if (chatMessages.length === 0) {
        const roleChips = buildAgentRoleChips(language, currentUser, restaurants);
        const ownerExtra = roleChips.filter((c) => c.id === 'agent_owner_assist');
        setChatMessages([
          buildWelcomeAssistantMessage(language, foods.length, restaurants.length, destinations.length, ownerExtra),
        ]);
      }
      if ((window as any).__kft_wte_open_compare_mode) {
        (window as any).__kft_wte_open_compare_mode = false;
        // 3 genuinely different flavour families (grilled/dry, soup/stew, rice/noodle/stir-fry) — never drinks or sweets
        const distinctCompare = pickDistinctFlavorDishes(foods, 3, seenCompareDishIdsRef.current);
        setComparedDishIds(distinctCompare.map((f) => f.id));
        setTimeout(() => {
          comparePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
      const pendingAiQuery = typeof window !== 'undefined' ? String((window as any).__kft_pending_ai_query || '').trim() : '';
      if (pendingAiQuery) {
        (window as any).__kft_pending_ai_query = '';
        if (canUseVip) {
          setCravingQuery(pendingAiQuery);
        }
        setTimeout(() => {
          sendConversationalMessageRef.current?.(pendingAiQuery);
        }, 60);
      }
    }
  }, [isWhatToEatModalOpen, language, foods, restaurants.length, destinations.length, chatMessages.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onAskAiEvent = (e: Event) => {
      const q = String((e as CustomEvent<{ query?: string }>).detail?.query || (window as any).__kft_pending_ai_query || '').trim();
      if (!q || !isWhatToEatModalOpen) return;
      (window as any).__kft_pending_ai_query = '';
      if (canUseVip) {
        setCravingQuery(q);
      }
      setTimeout(() => {
        sendConversationalMessageRef.current?.(q);
      }, 60);
    };
    window.addEventListener('kft:ask-ai-assistant', onAskAiEvent);
    return () => window.removeEventListener('kft:ask-ai-assistant', onAskAiEvent);
  }, [isWhatToEatModalOpen]);

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
        icon: Utensils,
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
      seed: spinCount + 1,
      language,
      canUseVip,
    });
  }, [foods, restaurants, cravingQuery, spinCount, language, canUseVip]);

  // Check if the latest conversation turn or current input is a medical/disease question
  const lastAssistantMsg = useMemo(() => {
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i].role === 'assistant') return chatMessages[i];
    }
    return null;
  }, [chatMessages]);

  const isMedicalRefusalActive = Boolean(
    isMedicalOrHealthQuery(cravingQuery) ||
      aiCravingRecommendations?.brain?.mode === 'scope_notice' ||
      lastAssistantMsg?.isScopeRefusal
  );

  // The big "recommended dish" card only appears when the latest turn has a verified dish to show.
  // (Clarifications, refusals, fact answers and "no match" turns must never display a random dish.)
  const suppressBigCard =
    !forceBigCard &&
    Boolean(
      lastAssistantMsg &&
        lastAssistantMsg.id !== 'ai-welcome' &&
        (lastAssistantMsg.isPending || lastAssistantMsg.suppressDishCard || lastAssistantMsg.needsClarification)
    );

  // Live out-of-catalog dish detection for ANY dish not in the app — immediately active while typing even before tapping "សួរ AI"
  const liveOutOfCatalogDish: FoodItem | null = useMemo(() => {
    if (isMedicalRefusalActive || drinkMode || !cravingQuery.trim() || foods.length === 0) {
      return null;
    }
    const detectedName = detectOutOfCatalogDishName(cravingQuery, foods);
    if (!detectedName) return null;
    const baseItem = createOutOfCatalogDishItem(detectedName, foods);
    const fetchedUrl = onlinePhotoByDishId[baseItem.id];
    if (fetchedUrl) {
      return {
        ...baseItem,
        photoUrl: fetchedUrl,
        originalPhotoUrl: fetchedUrl,
      };
    }
    return baseItem;
  }, [cravingQuery, foods, isMedicalRefusalActive, drinkMode, onlinePhotoByDishId]);

  useEffect(() => {
    if (!isWhatToEatModalOpen || !liveOutOfCatalogDish) return;
    const targetId = liveOutOfCatalogDish.id;
    if (onlinePhotoByDishId[targetId] || /^https?:\/\//i.test(liveOutOfCatalogDish.photoUrl || '')) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void fetchOnlineDishPhotoByQuery(liveOutOfCatalogDish.nameKh).then((onlineUrl) => {
        if (cancelled) return;
        if (!onlineUrl) {
          setFailedOnlineDishIds((prev) => (prev[targetId] ? prev : { ...prev, [targetId]: true }));
          return;
        }
        setFailedOnlineDishIds((prev) => (prev[targetId] ? { ...prev, [targetId]: false } : prev));
        setOnlinePhotoByDishId((prev) => (prev[targetId] === onlineUrl ? prev : { ...prev, [targetId]: onlineUrl }));
      });
    }, 260);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isWhatToEatModalOpen, liveOutOfCatalogDish?.id, liveOutOfCatalogDish?.nameKh, liveOutOfCatalogDish?.photoUrl, onlinePhotoByDishId]);

  // Per-dish "why" coming from the smart AI brain
  const brainInfoById = useMemo(() => {
    const map: Record<string, { reason: string; allergens: string[] }> = {};
    aiCravingRecommendations?.brain?.dishes.forEach((d) => {
      map[d.food.id] = { reason: d.reason, allergens: d.allergens };
    });
    return map;
  }, [aiCravingRecommendations]);

  // VIP special menu: Beverage Pairings
  const pairingRanked = useMemo(
    () => (drinkMode && canUseVip ? rankDrinkPairingDishes(foods, drinkKind) : []),
    [drinkMode, canUseVip, foods, drinkKind]
  );

  // Beverage Pairings are presented as randomized sets of 4 different dishes every time
  const pairingSets = useMemo(() => {
    const rawList = pairingRanked.map((r) => r.food);
    if (rawList.length === 0) return [];

    // Separate dishes not recently shown in the first visible sets so the top sets are always fresh
    const unseen = rawList.filter((f) => !seenPairingLeadIdsRef.current.has(f.id));
    const seen = rawList.filter((f) => seenPairingLeadIdsRef.current.has(f.id));
    if (unseen.length < PAIRING_SET_SIZE * PAIRING_SETS_PER_PAGE) {
      seenPairingLeadIdsRef.current.clear();
    }

    const fisherYatesShuffle = (arr: FoodItem[]): FoodItem[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
      }
      return copy;
    };

    const list =
      unseen.length >= PAIRING_SET_SIZE * PAIRING_SETS_PER_PAGE
        ? [...fisherYatesShuffle(unseen), ...fisherYatesShuffle(seen)]
        : fisherYatesShuffle(rawList);

    list.slice(0, PAIRING_SET_SIZE * PAIRING_SETS_PER_PAGE).forEach((f) => {
      seenPairingLeadIdsRef.current.add(f.id);
    });

    const sets: FoodItem[][] = [];
    for (let i = 0; i + PAIRING_SET_SIZE <= list.length; i += PAIRING_SET_SIZE) {
      sets.push(list.slice(i, i + PAIRING_SET_SIZE));
    }
    return sets;
  }, [pairingRanked, drinkShuffleSeed]);
  const showSets = drinkMode && canUseVip && pairingSets.length > 0;
  const setPageCount = Math.max(1, Math.ceil(pairingSets.length / PAIRING_SETS_PER_PAGE));
  const visibleSets = pairingSets.slice(setPage * PAIRING_SETS_PER_PAGE, (setPage + 1) * PAIRING_SETS_PER_PAGE);

  useEffect(() => {
    setSetPage(0);
    setDrinkShuffleSeed(Date.now() + Math.floor(Math.random() * 100000));
  }, [drinkMode, drinkKind, isWhatToEatModalOpen]);

  // Filter candidate dishes strictly across all 4 filter groups: Craving, Category, Mealtime, and Dietary/Health
  const matchingFoods = useMemo(() => {
    if (isMedicalRefusalActive) return [];
    if (drinkMode && canUseVip && pairingRanked.length > 0) {
      return pairingRanked.map((r) => r.food);
    }

    const qTrim = normalizeKhmerFoodText(cravingQuery);
    const parsedCraving = parseKhmerFoodSearchQuery(cravingQuery);
    let basePool: FoodItem[];

    if (qTrim) {
      const advisorAll = aiCravingRecommendations?.allMatchedDishes || [];
      const advisorTop = aiCravingRecommendations?.dishes || [];
      const rawPool = advisorAll.length > 0 ? advisorAll : advisorTop;

      // Strictly filter preset craving chips & flavor intents so every craving returns 100% relevant dishes
      const filterByPresetCraving = (f: FoodItem): boolean => {
        const kh = normalizeKhmerFoodText(f.nameKh);
        const title = `${kh} ${(f.nameEn || '').toLowerCase()}`;
        const isDessertDish = matchesCategoryStrict(f, 'dessert');

        if (
          parsedCraving.flavorIntents.includes('spicy') &&
          !parsedCraving.flavorIntents.includes('sour_spicy')
        ) {
          return !isSweetOrBeverageFood(f) && getSpicyDishScore(f) > 0;
        }
        if (qTrim === 'បាយ' || qTrim === 'rice' || qTrim === '米饭') {
          return matchesCategoryStrict(f, 'rice');
        }
        if (qTrim === 'គុយទាវ' || qTrim === 'kuy teav' || qTrim === 'noodles' || qTrim === '粿条面食') {
          return (
            !isDessertDish &&
            !/ទឹកត្រីផ្អែម|លតស្វិត|^សម្ល|^ចាដូវ|^គួង|^បាយ/i.test(kh) &&
            /គុយទាវ|នំបញ្ចុក|ហ្វឺ|លត|មី|\bkuy\s*teav\b|\brice\s*noodle\b|\bbanh\s*chok\b|\blort\b|\bpho\b|\bnoodle\b/i.test(
              title
            )
          );
        }
        if (qTrim === 'សម្លក្តៅៗ' || qTrim === 'warm soup' || qTrim === '热汤') {
          return matchesCategoryStrict(f, 'soup') || /^បបរ|\bporridge\b|\bcongee\b/i.test(title);
        }
        if (qTrim === 'គ្រឿងសមុទ្រ' || qTrim === 'seafood' || qTrim === '海鲜') {
          return (
            !isDessertDish &&
            /គ្រឿងសមុទ្រ|ក្តាម|បង្គា|បង្កង|មឹក|ងាវ|ខ្យង|ត្រីសមុទ្រ|\bseafood\b|\bcrab\b|\bprawn\b|\bshrimp\b|\bsquid\b|\bclam\b|\boyster\b/i.test(
              title
            )
          );
        }
        if (qTrim === 'សាច់អាំង' || qTrim === 'grilled' || qTrim === '烧烤') {
          return (
            !isSweetOrBeverageFood(f) &&
            !/^ឆា|^សម្ល|^បបរ|^គុយទាវ|^នំបញ្ចុក|^ទឹក/i.test(kh) &&
            /អាំង|បំពង|ចៀន|ដុត|ងៀត|ក្រក|\bgrilled\b|\bfried\b|\bcrispy\b|\broast\b|\bbbq\b/i.test(title)
          );
        }
        if (
          qTrim === 'ជូរហឹរ' ||
          qTrim === 'spicy sour' ||
          qTrim === '酸辣' ||
          parsedCraving.flavorIntents.includes('sour_spicy')
        ) {
          return (
            !isSweetOrBeverageFood(f) &&
            !/^បាយសាច់ជ្រូក/i.test(kh) &&
            (getSpicyDishScore(f) > 0 ||
              /ម្ជូរ|ញាំ|ភ្លា|បុក|តុំយ៉ាំ|សម្លម្ជូរព្រៃ|ប្រហុក|ទឹកគ្រឿង|ម្រះព្រៅ|ឆាក្តៅ|\bsour\b|\bsalad\b|\bceviche\b|\btom\s*yum\b/i.test(
                title
              ))
          );
        }
        if (qTrim === 'អាហារសម្រន់' || qTrim === 'street food' || qTrim === '街头小吃') {
          return (
            !isSweetOrBeverageFood(f) &&
            !/^សម្ល|^ស្ងោរ/i.test(kh) &&
            /នំប៉័ង|នំគ្រក់|បាញ់ឆែវ|ប្រហិត|លតឆា|មីឆា|គុយទាវឆា|គួង|ចាដូវ|ស្លាបមាន់|ពងទាកូន|ក្រឡាន|ចេកចៀន|ដំឡូង|បំពង|អាំង|\bstreet\b|\bsnack\b|\bpancake\b|\bspring\s*roll\b|\bbaguette\b/i.test(
              title
            )
          );
        }
        if (qTrim === 'បង្អែម' || qTrim === 'dessert' || qTrim === '甜品') {
          return isDessertDish;
        }
        if (isVegetarianQuery(qTrim)) {
          return classifyVegetarianDish(f) !== 'none';
        }
        return true;
      };

      const strictCravingPool = rawPool.filter(filterByPresetCraving);
      basePool = strictCravingPool.length > 0 ? strictCravingPool : rawPool;
    } else {
      basePool = foods;
    }

    const withCustomLead = (list: FoodItem[]): FoodItem[] =>
      liveOutOfCatalogDish
        ? [liveOutOfCatalogDish, ...list.filter((f) => f.id !== liveOutOfCatalogDish.id)]
        : list;

    // Only enforce automatic clock-based mealtime filtering when no explicit search query is typed
    // (or when the user explicitly selected a specific mealSlotFilter chip).
    // Otherwise searching "ស្ងោរជ្រក់ត្រី" or "សម្លកកូរ" at 3:45 PM (afternoon snack slot) would discard soups!
    const shouldEnforceMealSlot = !qTrim || mealSlotFilter !== 'auto';

    // 1. Strict 4-way intersection (Craving + Category + MealSlot + Diet)
    const strictAll = basePool.filter(
      (food) =>
        matchesCategoryStrict(food, categoryFilter) &&
        (!shouldEnforceMealSlot || matchesMealSlotStrict(food, mealSlotFilter, effectiveMealSlot)) &&
        matchesDietStrict(food, vipDietFilter)
    );
    if (strictAll.length > 0) return withCustomLead(strictAll);

    // 2. If MealSlot made a narrow Craving+Category+Diet combination empty, relax MealSlot while keeping Craving+Category+Diet strict
    const strictWithoutMealSlot = basePool.filter(
      (food) =>
        matchesCategoryStrict(food, categoryFilter) &&
        matchesDietStrict(food, vipDietFilter)
    );
    if (strictWithoutMealSlot.length > 0) return withCustomLead(strictWithoutMealSlot);

    // 3. Keep Category + Diet strict across all foods if Craving conflicted
    const categoryAndDietOnly = foods.filter(
      (food) =>
        matchesCategoryStrict(food, categoryFilter) &&
        matchesMealSlotStrict(food, mealSlotFilter, effectiveMealSlot) &&
        matchesDietStrict(food, vipDietFilter)
    );
    if (categoryAndDietOnly.length > 0) return withCustomLead(categoryAndDietOnly);

    return withCustomLead(basePool);
  }, [
    foods,
    cravingQuery,
    aiCravingRecommendations,
    categoryFilter,
    mealSlotFilter,
    effectiveMealSlot,
    vipDietFilter,
    drinkMode,
    canUseVip,
    pairingRanked,
    isMedicalRefusalActive,
    liveOutOfCatalogDish,
  ]);

  // Active candidate list
  const activeDishList = isMedicalRefusalActive ? [] : matchingFoods.length > 0 ? matchingFoods : cravingQuery.trim() ? [] : foods;

  const hasStructuredFilter = Boolean(
    cravingQuery.trim() || categoryFilter !== 'all' || mealSlotFilter !== 'auto' || vipDietFilter !== 'none' || drinkMode
  );

  const pickRandomDish = (excludeId?: string): FoodItem => {
    const rollPool = activeDishList.length > 0 ? activeDishList : foods;
    if (rollPool.length === 0) return foods[0];
    if (rollPool.length === 1) {
      seenDishIdsRef.current.add(rollPool[0].id);
      return rollPool[0];
    }

    let unseenCandidates = rollPool.filter(
      (f) => f.id !== excludeId && !seenDishIdsRef.current.has(f.id)
    );

    if (unseenCandidates.length === 0) {
      seenDishIdsRef.current.clear();
      unseenCandidates = rollPool.filter((f) => f.id !== excludeId);
    }

    const pool = unseenCandidates.length > 0 ? unseenCandidates : rollPool;
    const nextPick = pool[Math.floor(Math.random() * pool.length)];

    seenDishIdsRef.current.add(nextPick.id);
    return nextPick;
  };

  const pickFreshNonRepeatingDishes = (
    count: number,
    seenSet: Set<string>,
    excludeIds: string[] = []
  ): FoodItem[] => {
    const source = activeDishList.length > 0 ? activeDishList : foods;
    if (source.length === 0) return [];
    const exclude = new Set(excludeIds);
    let unseen = source.filter((f) => !exclude.has(f.id) && !seenSet.has(f.id));
    if (unseen.length < Math.min(count, source.length)) {
      seenSet.clear();
      unseen = source.filter((f) => !exclude.has(f.id));
    }
    const pool = unseen.length > 0 ? unseen : source;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const chosen = shuffled.slice(0, count);
    chosen.forEach((f) => seenSet.add(f.id));
    return chosen;
  };

  useEffect(() => {
    if (!isWhatToEatModalOpen) {
      seenDishIdsRef.current.clear();
      seenChatDishIdsRef.current.clear();
      seenCompareDishIdsRef.current.clear();
      return;
    }
    if (liveOutOfCatalogDish && !isMedicalRefusalActive) {
      setCurrentDishId(liveOutOfCatalogDish.id);
      return;
    }
    if (foods.length > 0 && !isMedicalRefusalActive) {
      const initialPick = cravingQuery.trim()
        ? activeDishList[0] || pickRandomDish(currentDishId || undefined)
        : pickRandomDish(currentDishId || undefined);
      if (initialPick) setCurrentDishId(initialPick.id);
    }
  }, [
    isWhatToEatModalOpen,
    cravingQuery,
    categoryFilter,
    mealSlotFilter,
    vipDietFilter,
    drinkMode,
    drinkKind,
    isMedicalRefusalActive,
    liveOutOfCatalogDish?.id,
  ]);

  const currentDish: FoodItem | null = useMemo(() => {
    if (isMedicalRefusalActive) return null;
    const attachOnlinePhoto = (item: FoodItem | null): FoodItem | null => {
      if (!item) return null;
      const fetched = onlinePhotoByDishId[item.id];
      if (fetched && item.photoUrl !== fetched) {
        return { ...item, photoUrl: fetched, originalPhotoUrl: fetched };
      }
      return item;
    };
    if (currentDishId) {
      for (let i = chatMessages.length - 1; i >= 0; i--) {
        const msg = chatMessages[i];
        if (msg.recipePreview?.food?.id === currentDishId) {
          return attachOnlinePhoto(msg.recipePreview.food);
        }
        const foundInMsg = (msg.dishes || []).find((d) => d.id === currentDishId);
        if (foundInMsg) return attachOnlinePhoto(foundInMsg);
      }
      if (liveOutOfCatalogDish && liveOutOfCatalogDish.id === currentDishId) {
        return attachOnlinePhoto(liveOutOfCatalogDish);
      }
    }
    if (liveOutOfCatalogDish && !currentDishId) {
      return attachOnlinePhoto(liveOutOfCatalogDish);
    }
    return attachOnlinePhoto(
      (currentDishId ? activeDishList.find((f) => f.id === currentDishId) : null) ||
      (forceBigCard && currentDishId ? foods.find((f) => f.id === currentDishId) : null) ||
      activeDishList[0] ||
      (cravingQuery.trim() ? null : foods[0]) ||
        null
    );
  }, [activeDishList, currentDishId, foods, isMedicalRefusalActive, chatMessages, liveOutOfCatalogDish, onlinePhotoByDishId, cravingQuery, forceBigCard]);

  const currentLoc = useMemo(
    () => (currentDish ? getLocalizedFood(currentDish, language) : null),
    [currentDish, language]
  );

  const alternativeDishes = useMemo(() => {
    if (isMedicalRefusalActive || activeDishList.length <= 1) return [];
    const pool = activeDishList.filter((f) => f.id !== currentDish?.id);
    if (pool.length === 0) return [];
    const unseen = pool.filter((f) => !seenDishIdsRef.current.has(f.id));
    const candidates = unseen.length >= 2 ? unseen : pool;
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, hasStructuredFilter ? 4 : 2);
  }, [activeDishList, currentDish?.id, hasStructuredFilter, isMedicalRefusalActive, spinCount]);

  const servingRestaurants = useMemo(() => {
    if (!currentDish) return [];
    return getMatchingRestaurantsForDish(currentDish, restaurants, 2);
  }, [restaurants, currentDish]);

  if (!isWhatToEatModalOpen) return null;

  /** Everything that must happen after an assistant reply is shown (cards, photos, drink mode, memory). */
  const applyReplyEffects = (reply: AiAssistantMessage, nextMemory: AiConversationMemory | null, cleanText: string) => {
    if (nextMemory) setChatMemory(nextMemory);

    if (reply.triggerDrinkSets && canUseVip) {
      setDrinkMode(true);
    } else {
      setDrinkMode(false);
    }

    if (reply.dishes && reply.dishes.length > 0 && !reply.isScopeRefusal) {
      setCurrentDishId(reply.dishes[0].id);
    }

    if (reply.compareDishes && reply.compareDishes.length >= 2) {
      setComparedDishIds(reply.compareDishes.slice(0, 3).map((d) => d.id));
    }

    // Dishes that are NOT in the verified catalog (rules-engine "custom-recipe-*" or AI "ai-dish-*"):
    // look for a photo that is verified to show THIS dish. If none is found the card shows a neutral
    // placeholder - never another dish's picture.
    const generatedFood =
      (reply.recipePreview?.food && isGeneratedDishId(reply.recipePreview.food.id) ? reply.recipePreview.food : null) ||
      (reply.dishes || []).find((d) => isGeneratedDishId(d.id)) ||
      null;
    if (generatedFood) {
      setCurrentDishId(generatedFood.id);
      if (!hasRenderablePhoto(generatedFood.photoUrl)) {
        const lookup = generatedFood.id.startsWith('ai-dish-')
          ? fetchVerifiedDishPhotoByEnglishName(generatedFood.nameEn || '')
          : fetchOnlineDishPhotoByQuery(generatedFood.nameKh || cleanText);
        void lookup.then((onlineUrl) => {
          if (!onlineUrl) {
            setFailedOnlineDishIds((prev) => ({ ...prev, [generatedFood.id]: true }));
            return;
          }
          setFailedOnlineDishIds((prev) => (prev[generatedFood.id] ? { ...prev, [generatedFood.id]: false } : prev));
          setOnlinePhotoByDishId((prev) => ({ ...prev, [generatedFood.id]: onlineUrl }));
          setChatMessages((prev) =>
            prev.map((m) => {
              if (m.id !== reply.id) return m;
              const patch = (item: FoodItem): FoodItem =>
                item.id === generatedFood.id ? { ...item, photoUrl: onlineUrl, originalPhotoUrl: onlineUrl } : item;
              return {
                ...m,
                dishes: m.dishes ? m.dishes.map(patch) : m.dishes,
                recipePreview: m.recipePreview ? { ...m.recipePreview, food: patch(m.recipePreview.food) } : m.recipePreview,
              };
            })
          );
        });
      }
    }
  };

  const scrollChatToTop = () => {
    setTimeout(() => {
      if (scrollerRef.current) {
        scrollerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const sendConversationalMessage = async (rawText: string, image: PreparedFoodImage | null = null) => {
    const clean = rawText.trim();
    if (!clean && !image) return;
    if (isAiThinking) return;
    setForceBigCard(false);

    // 1. Strict Frontend + Backend VIP Verification before accepting any AI question or photo
    if (!canUseVip) {
      promptVipUpgradeForAiAssistant();
      return;
    }
    const backendCheck = await verifyUserVipStatusFromBackend(currentUser);
    setBackendVipVerified(backendCheck.isVip);
    if (!backendCheck.isVip) {
      promptVipUpgradeForAiAssistant();
      return;
    }
    setShowVipAiUpgradeNotice(false);

    const userMsg: AiAssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: clean || tr(language, 'តើនេះជាម្ហូបអ្វី?', 'What dish is this?', '这是什么菜？'),
      timestamp: new Date().toISOString(),
      imagePreviewUrl: image?.previewDataUrl,
    };

    // 0) Zero-Cost ($0 Forever) Hybrid MCP AI Agent Router:
    // Handles Hotels, Travel Itineraries, Nearby GPS Places, Google Maps Directions,
    // Nutrition Analysis, Trending Videos, Wishlist Saves, and Shop/Hotel Owner Profile Drafts!
    if (!image && clean) {
      if (/(?:ជិតខ្ញុំ|នៅជិតខ្ញុំ|near\s+me|nearby|closest|附近)/i.test(clean) && !userGpsRef.current && typeof navigator !== 'undefined' && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          let settled = false;
          const timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              resolve();
            }
          }, 1800);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              userGpsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                resolve();
              }
            },
            () => {
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                resolve();
              }
            },
            { enableHighAccuracy: false, timeout: 1600, maximumAge: 300000 }
          );
        });
      }

      const agentResult = tryExecuteAiAgentTurn({
        userInput: clean,
        language,
        currentUser,
        foods,
        restaurants,
        destinations,
        trendingFoods,
        activeProvinceKh: chatMemory.activeProvinceKh,
        userCoords: userGpsRef.current,
        isVipVerified: backendCheck.isVip,
        generateAiTripPlan,
      });

      if (agentResult?.handled) {
        const agentReply: AiAssistantMessage = {
          id: `agent-${Date.now()}`,
          role: 'assistant',
          text: agentResult.headline,
          timestamp: new Date().toISOString(),
          intent: 'ai_agent_action',
          source: 'rules',
          agentResult,
          dishes: agentResult.dishes,
          restaurants: agentResult.shops,
          destinations: agentResult.attractions,
          followUpChips: agentResult.followUpChips,
          suppressDishCard: !agentResult.dishes || agentResult.dishes.length === 0,
        };
        setChatMessages((prev) => [...prev.slice(-12), userMsg, agentReply]);
        setChatMemory((prev) => ({
          ...prev,
          lastDishes: agentResult.dishes && agentResult.dishes.length > 0 ? agentResult.dishes : prev.lastDishes,
          lastRestaurants: agentResult.shops && agentResult.shops.length > 0 ? agentResult.shops : prev.lastRestaurants,
          lastDestinations:
            agentResult.attractions && agentResult.attractions.length > 0 ? agentResult.attractions : prev.lastDestinations,
          lastQuery: clean,
          turnSeed: (prev.turnSeed || 1) + 1,
        }));
        scrollChatToTop();
        return;
      }
    }

    const activeUserRole = resolveAiAgentUserRole(currentUser, restaurants);

    const runRules = () =>
      generateConversationalAiResponse({
        userInput: clean,
        language,
        foods,
        restaurants,
        destinations,
        canUseVip,
        memory: chatMemory,
      });

    let geminiKey = resolveGeminiApiKey(appSettings?.geminiApiKey);
    // The Gemini key now lives in a Supabase secret behind the `food-ai` Edge Function, so a device without its own key
    // can (and should) still use the live assistant. Only without any gateway/key do we fall back to the offline engine.
    const gatewayAvailable = isAiGatewayConfigured();
    if (!geminiKey && !gatewayAvailable && refreshAppSettingsFromServer) {
      try {
        const latest = await refreshAppSettingsFromServer(false);
        if (latest?.geminiApiKey) {
          geminiKey = resolveGeminiApiKey(latest.geminiApiKey);
        }
      } catch {
        // ignore network error during background settings refresh
      }
    }

    // A) A photo needs the live vision model. Without it we say so honestly instead of guessing a dish.
    if (image && !geminiKey && !gatewayAvailable) {
      const reply = buildAssistantFailureMessage('no_key', language, true, { isAdmin });
      setChatMessages((prev) => [...prev.slice(-12), userMsg, reply]);
      scrollChatToTop();
      return;
    }

    // B) No AI connection: offline rules engine (honest about what it cannot answer).
    if (!geminiKey && !gatewayAvailable) {
      const t0 = performance.now();
      const { reply, nextMemory } = runRules();
      recordAiAgentTelemetryEvent({
        user: currentUser,
        userRole: activeUserRole,
        toolName: 'recommend_khmer_food',
        query: clean,
        latencyMs: performance.now() - t0,
        status: 'ok',
        matchedFoodNames: (reply.dishes || []).slice(0, 2).map((d) => d.nameKh),
        matchedShopNames: (reply.restaurants || []).slice(0, 2).map((r) => r.nameKh),
      });
      setChatMessages((prev) => [...prev.slice(-12), userMsg, reply]);
      applyReplyEffects(reply, nextMemory, clean);
      scrollChatToTop();
      return;
    }

    // C) Live AI assistant (multi-turn, grounded on the verified catalog, vision-capable).
    const pendingId = `pending-${Date.now()}`;
    const pending: AiAssistantMessage = {
      id: pendingId,
      role: 'assistant',
      text: '',
      timestamp: new Date().toISOString(),
      isPending: true,
      suppressDishCard: true,
    };
    setChatMessages((prev) => [...prev.slice(-12), userMsg, pending]);
    setIsAiThinking(true);
    scrollChatToTop();

    const replacePending = (reply: AiAssistantMessage) =>
      setChatMessages((prev) => prev.map((m) => (m.id === pendingId ? reply : m)));

    const handleFailure = (reason: FoodAssistantFailure) => {
      if (image) {
        replacePending(buildAssistantFailureMessage(reason, language, true, { isAdmin }));
        return;
      }
      // Text question: fall back to the offline rules engine and say that the AI was unreachable.
      const { reply, nextMemory } = runRules();
      const offlineNote = tr(
        language,
        'ចម្លើយនេះមកពីប្រព័ន្ធមូលដ្ឋាន ព្រោះ AI មិនអាចភ្ជាប់បាន។',
        'This answer comes from the built-in engine because the AI could not be reached.',
        '由于无法连接 AI，此回答来自内置引擎。'
      );
      const withNote: AiAssistantMessage = { ...reply, text: `${reply.text}\n\n${offlineNote}` };
      replacePending(withNote);
      applyReplyEffects(withNote, nextMemory, clean);
    };

    if (!isIosOrIpadAppStoreRuntime()) {
      grantAiConsent();
    }
    let lastPartialEmit = 0;
    const showPartialAnswer = (partial: string) => {
      const now = performance.now();
      if (partial && now - lastPartialEmit < 120) return; // keep re-renders light while tokens arrive (a reset always passes)
      lastPartialEmit = now;
      setChatMessages((prev) => prev.map((m) => (m.id === pendingId && m.isPending ? { ...m, text: partial } : m)));
    };
    void askFoodAssistant({
      onPartialAnswer: showPartialAnswer,
      userText: clean,
      uiLanguage: language,
      foods,
      restaurants,
      history: toHistoryTurns(chatMessages),
      memory: chatMemory,
      image,
      geminiApiKey: geminiKey,
      currentUser,
    })
      .then((result) => {
        if (!result.ok) {
          handleFailure(result.reason);
          return;
        }
        const reply = result.message;
        recordAiAgentTelemetryEvent({
          user: currentUser,
          userRole: activeUserRole,
          toolName: image ? 'analyze_food_nutrition' : 'recommend_khmer_food',
          query: clean || '[Food Photo]',
          latencyMs: 320,
          estimatedCostUsd: 0,
          status: 'ok',
          matchedFoodNames: (reply.dishes || []).slice(0, 2).map((d) => d.nameKh),
          matchedShopNames: (reply.restaurants || []).slice(0, 2).map((r) => r.nameKh),
        });
        replacePending(reply);
        const catalogDishes = (reply.dishes || []).filter((d) => !isGeneratedDishId(d.id));
        setChatMemory((prev) => ({
          ...prev,
          lastDishes: catalogDishes.length > 0 ? catalogDishes : prev.lastDishes,
          lastRestaurants: reply.restaurants && reply.restaurants.length > 0 ? reply.restaurants : prev.lastRestaurants,
          lastQuery: clean || prev.lastQuery,
          turnSeed: (prev.turnSeed || 1) + 1,
        }));
        applyReplyEffects(reply, null, clean);
      })
      .catch(() => handleFailure('unavailable'))
      .finally(() => setIsAiThinking(false));
  };

  const handleImagePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!canUseVip) {
      promptVipUpgradeForAiAssistant();
      return;
    }
    const vipCheck = await verifyUserVipStatusFromBackend(currentUser);
    setBackendVipVerified(vipCheck.isVip);
    if (!vipCheck.isVip) {
      promptVipUpgradeForAiAssistant();
      return;
    }
    if (!file) return;
    setImageError('');
    setIsPreparingImage(true);
    try {
      setPendingImage(await prepareFoodImage(file));
    } catch (err) {
      const code = err instanceof FoodImageError ? err.code : 'decode_failed';
      setPendingImage(null);
      setImageError(
        code === 'not_image'
          ? tr(language, 'សូមជ្រើសរើសឯកសាររូបភាព (JPG/PNG)។', 'Please choose an image file (JPG/PNG).', '请选择图片文件（JPG/PNG）。')
          : code === 'too_large'
            ? tr(language, 'រូបភាពធំពេក (អតិបរមា 25MB)។', 'The image is too large (max 25 MB).', '图片过大（最大 25MB）。')
            : tr(
                language,
                'មិនអាចបើករូបភាពនេះបានទេ។ សូមសាកល្បងរូប JPG ឬ PNG ផ្សេង។',
                'This image could not be opened. Please try another JPG or PNG.',
                '无法打开该图片，请尝试其他 JPG 或 PNG 图片。'
              )
      );
    } finally {
      setIsPreparingImage(false);
    }
  };

  const handleCravingSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    cravingInputRef.current?.blur();
    if (!canUseAiAssistant) {
      promptVipUpgradeForAiAssistant();
      return;
    }
    if (!cravingQuery.trim() && !pendingImage) return;
    const image = pendingImage;
    setPendingImage(null);
    setImageError('');
    sendConversationalMessage(cravingQuery, image);
  };

  sendConversationalMessageRef.current = (q: string) => {
    void sendConversationalMessage(q);
  };

  const handleResetChat = () => {
    setPendingImage(null);
    setImageError('');
    setForceBigCard(false);
    setCravingQuery('');
    setCategoryFilter('all');
    setMealSlotFilter('auto');
    setVipDietFilter('none');
    setDrinkMode(false);
    setComparedDishIds([]);
    setChatMemory({
      lastDishes: [],
      lastRestaurants: [],
      lastDestinations: [],
      activeProvinceKh: '',
      lastQuery: '',
      turnSeed: 1,
    });
    setChatMessages([
      buildWelcomeAssistantMessage(language, foods.length, restaurants.length, destinations.length),
    ]);
  };

  const handleShowAnother = () => {
    setForceBigCard(true);
    if (showSets) {
      setIsSpinning(true);
      setTimeout(() => {
        setSetPage((p) => {
          const nextPage = (p + 1) % setPageCount;
          if (nextPage === 0) {
            setDrinkShuffleSeed(Date.now() + Math.floor(Math.random() * 100000));
          }
          return nextPage;
        });
        setSpinCount((c) => c + 1);
        setIsSpinning(false);
      }, 200);
      return;
    }
    setIsSpinning(true);
    setTimeout(() => {
      const nextDish = pickRandomDish(currentDish?.id);
      if (nextDish) setCurrentDishId(nextDish.id);
      setSpinCount((c) => c + 1);

      // Also refresh any dish cards displayed in the active AI conversation message so the top card updates on every click!
      setChatMessages((prev) => {
        const lastIdx = [...prev].map((m) => m.role).lastIndexOf('assistant');
        if (lastIdx === -1) return prev;
        const targetMsg = prev[lastIdx];
        if (!targetMsg.dishes || targetMsg.dishes.length === 0 || targetMsg.isScopeRefusal) {
          return prev;
        }
        const currentMsgDishIds = targetMsg.dishes.map((d) => d.id);
        const freshChatDishes = pickFreshNonRepeatingDishes(
          Math.max(3, targetMsg.dishes.length),
          seenChatDishIdsRef.current,
          currentMsgDishIds
        );
        if (freshChatDishes.length === 0) return prev;
        if (nextDish && !freshChatDishes.some((d) => d.id === nextDish.id)) {
          freshChatDishes[0] = nextDish;
        }
        const freshSimilar = pickFreshNonRepeatingDishes(
          4,
          seenChatDishIdsRef.current,
          freshChatDishes.map((d) => d.id)
        );
        const updatedMsg: AiAssistantMessage = {
          ...targetMsg,
          dishes: freshChatDishes,
          similarDishes: freshSimilar.length > 0 ? freshSimilar : targetMsg.similarDishes,
        };
        const nextList = [...prev];
        nextList[lastIdx] = updatedMsg;
        return nextList;
      });

      // If the Side-by-Side Comparison panel is open, also rotate compared dishes to a fresh non-repeating set
      setComparedDishIds((prev) => {
        if (prev.length === 0) return prev;
        const freshCompare = pickDistinctFlavorDishes(
          activeDishList.length > 0 ? activeDishList : foods,
          3,
          seenCompareDishIdsRef.current,
          prev,
          { strict: hasStructuredFilter }
        );
        return freshCompare.length >= 2 ? freshCompare.map((d) => d.id) : prev;
      });

      setIsSpinning(false);
    }, 220);
  };

  const handleCycleCompareDishes = (preferredPool?: FoodItem[]) => {
    setIsSpinning(true);
    setTimeout(() => {
      const source = preferredPool && preferredPool.length >= 2 ? preferredPool : activeDishList.length >= 2 ? activeDishList : foods;
      // Strict when the user picked a taste / category filter (or the pool is a small curated AI list):
      // every compared dish must stay inside that pool. Otherwise pick 3 genuinely different flavour families.
      const strictPool = hasStructuredFilter || (preferredPool !== undefined && preferredPool !== activeDishList);
      let nextCompare = pickDistinctFlavorDishes(
        source,
        3,
        seenCompareDishIdsRef.current,
        comparedDishIds,
        { strict: strictPool }
      );
      if (nextCompare.length < 2) {
        nextCompare = pickDistinctFlavorDishes(source, 3, seenCompareDishIdsRef.current, [], { strict: strictPool });
      }
      setComparedDishIds(nextCompare.map((d) => d.id));
      if (nextCompare[0]) {
        setCurrentDishId(nextCompare[0].id);
      }
      setSpinCount((c) => c + 1);
      setIsSpinning(false);
      setTimeout(() => {
        comparePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }, 180);
  };

  const handleFindNearbyForDish = () => {
    if (!currentDish) return;
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${currentDish.nameKh} ${currentDish.nameEn} restaurant near me Cambodia`
    )}`;
    if (servingRestaurants.length > 0) {
      (window as any).__kft_near_me_initial_tab = 'restaurants';
      (window as any).__kft_near_me_initial_query = currentDish.nameKh;
      (window as any).__kft_near_me_initial_food = currentDish;
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
  const menuGroups: Array<{ id: MenuGroupId; icon: React.ReactNode; label: string; value: string; active: boolean; vip: boolean }> = [
    {
      id: 'time',
      vip: false,
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
      vip: false,
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
      vip: false,
      icon: <IconCravingSpark className="w-4 h-4" />,
      label: tr(language, 'ចំណង់', 'Craving', '想吃'),
      value: cravingQuery.trim().slice(0, 10),
      active: cravingQuery.trim().length > 0,
    },
    {
      id: 'health',
      vip: true,
      icon: <Crown className="w-4 h-4 text-amber-500" />,
      label: tr(language, 'សុខភាព', 'Dietary', '饮食偏好'),
      value:
        vipDietFilter === 'none' || !activeHealth
          ? ''
          : tr(language, activeHealth.shortKh, activeHealth.shortEn, activeHealth.shortZh),
      active: vipDietFilter !== 'none',
    },
  ];

  // Build active filter summary label for the AI banner
  const activeFilterParts: string[] = [];
  if (mealSlotFilter !== 'auto' && activeSlot) {
    activeFilterParts.push(stripLeadingSymbols(tr(language, activeSlot.kh, activeSlot.en, activeSlot.zh)));
  }
  if (categoryFilter !== 'all' && activeCategory) {
    activeFilterParts.push(tr(language, activeCategory.labelKh, activeCategory.labelEn, activeCategory.labelZh));
  }
  if (cravingQuery.trim()) {
    activeFilterParts.push(cravingQuery.trim());
  }
  if (vipDietFilter !== 'none' && activeHealth) {
    activeFilterParts.push(tr(language, activeHealth.shortKh, activeHealth.shortEn, activeHealth.shortZh));
  }
  const activeCriteriaLabel =
    activeFilterParts.length > 0
      ? activeFilterParts.join(' • ')
      : tr(language, currentMealInfo.labelKh, currentMealInfo.labelEn, currentMealInfo.labelZh);

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
                  {tr(language, 'ជំនួយការ AI ម្ហូបអាហារ', 'AI Food Assistant', 'AI 美食助手')}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (!canUseAiAssistant) promptVipUpgradeForAiAssistant();
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/60 text-amber-200 text-[10px] font-extrabold shrink-0 cursor-pointer"
                >
                  <Crown className="w-3 h-3 text-amber-300" />
                  <span>
                    {canUseAiAssistant
                      ? tr(language, 'សមាជិក VIP • បើករួច', 'VIP Active', 'VIP 已激活')
                      : tr(language, 'សម្រាប់ VIP • VIP ONLY', 'VIP Only', 'VIP 专属')}
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-emerald-100 font-khmer truncate">
                {tr(
                  language,
                  `សួរអ្វីក៏បានអំពីម្ហូប • ថតរូបម្ហូប • ម្ហូប ${foods.length}+ មុខ • ហាង ${restaurants.length}+`,
                  `Ask anything about food • photo recognition • ${foods.length}+ dishes • ${restaurants.length}+ shops`,
                  `美食问答 • 拍照识菜 • ${foods.length}+ 道菜 • ${restaurants.length}+ 家餐厅`
                )}
              </p>
            </div>
          </div>
          <button
            id="kft-wte-close-btn"
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
          {/* Conversational AI Search / Chat Input Bar */}
          <div className="px-3.5 pt-3 pb-2.5 bg-white dark:bg-slate-900 border-b border-emerald-100/70 dark:border-slate-800 space-y-2.5 font-khmer">
            <form onSubmit={handleCravingSubmit} className="relative flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                id="kft-wte-photo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImagePicked}
              />
              <button
                id="kft-wte-photo-btn"
                type="button"
                onClick={() => {
                  if (!canUseAiAssistant) {
                    promptVipUpgradeForAiAssistant();
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                disabled={isAiThinking || isPreparingImage}
                aria-label={tr(language, 'ថតរូប ឬជ្រើសរើសរូបម្ហូប', 'Take or choose a food photo', '拍摄或选择美食照片')}
                title={tr(language, 'ថតរូប ឬជ្រើសរើសរូបម្ហូប', 'Take or choose a food photo', '拍摄或选择美食照片')}
                className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-5 h-5" />
              </button>
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="kft-wte-chat-input"
                  ref={cravingInputRef}
                  type="search"
                  enterKeyHint="send"
                  readOnly={!canUseAiAssistant && !isVerifyingVipBackend}
                  value={cravingQuery}
                  onClick={() => {
                    if (!canUseAiAssistant && !isVerifyingVipBackend) {
                      promptVipUpgradeForAiAssistant();
                    }
                  }}
                  onChange={(e) => {
                    if (!canUseAiAssistant) {
                      promptVipUpgradeForAiAssistant();
                      return;
                    }
                    setCravingQuery(e.target.value);
                    setCurrentDishId('');
                    setSpinCount(0);
                    if (drinkMode) setDrinkMode(false);
                  }}
                  placeholder={tr(
                    language,
                    'សួរអ្វីក៏បានអំពីម្ហូប ឬថតរូបម្ហូប...',
                    'Ask anything about food, or send a food photo...',
                    '询问任何美食问题，或发送美食照片...'
                  )}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {cravingQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setCravingQuery('');
                      setCurrentDishId('');
                      setSpinCount(0);
                    }}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                id="kft-wte-chat-send"
                type="submit"
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:from-[#047857] hover:to-[#059669] text-white text-sm font-extrabold shadow-xs flex items-center gap-1.5 shrink-0 transition active:scale-[0.98] cursor-pointer"
              >
                <Send className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{tr(language, 'សួរ AI', 'Ask AI', '发送')}</span>
              </button>
            </form>

            {(pendingImage || isPreparingImage || imageError) && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700">
                {pendingImage && (
                  <>
                    <img src={pendingImage.previewDataUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-amber-300 shrink-0" />
                    <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 flex-1 min-w-0">
                      {tr(language, 'រូបភាពរួចរាល់ — វាយសំណួរបន្ថែម (ជាជម្រើស) រួចចុច «សួរ AI»', 'Photo ready — add a question (optional), then tap “Ask AI”', '照片已就绪 —（可选）补充问题后点击“发送”')}
                    </span>
                    <button type="button" onClick={() => setPendingImage(null)} aria-label="Remove photo" className="p-1 rounded-full text-slate-500 hover:text-rose-600 cursor-pointer shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                {isPreparingImage && (
                  <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 animate-pulse">
                    {tr(language, 'កំពុងរៀបចំរូបភាព...', 'Preparing photo...', '正在处理照片...')}
                  </span>
                )}
                {imageError && <span className="text-[11px] font-bold text-rose-600 flex-1">{imageError}</span>}
              </div>
            )}

            {(!canUseAiAssistant || showVipAiUpgradeNotice) && !isVerifyingVipBackend && (
              <div
                id="kft-wte-vip-upgrade-notice"
                className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 via-yellow-50/90 to-amber-100/80 dark:from-amber-950/50 dark:via-slate-800 dark:to-amber-900/30 border border-amber-300 dark:border-amber-700/70 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-amber-400/25 border border-amber-400/50 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                    <Crown className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-amber-950 dark:text-amber-200">
                      {tr(
                        language,
                        '👑 មុខងារជំនួយការ AI គឺសម្រាប់សមាជិក VIP ប៉ុណ្ណោះ',
                        '👑 AI Assistant is Exclusive to VIP Members',
                        '👑 AI 美食助手为 VIP 会员专属功能'
                      )}
                    </div>
                    <p className="text-[11px] text-amber-900/90 dark:text-amber-100/80 leading-snug mt-0.5">
                      {tr(
                        language,
                        'សូមដំឡើងទៅកាន់ VIP ដើម្បីសួរសំណួរ ថតរូបម្ហូប និងទទួលចម្លើយពី AI។ (ការស្វែងរកម្ហូប ហាង និងតំបន់ទេសចរណ៍ធម្មតា នៅតែឥតគិតថ្លៃ 100%)',
                        'Upgrade to VIP to submit questions, analyze food photos, and receive AI answers. (Normal food, shop & tourism search remains 100% free.)',
                        '请升级 VIP 以提问、拍照识菜并获取 AI 回答。（常规美食、餐厅与景点搜索仍 100% 免费。）'
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openUpgradeVipModal()}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 text-slate-950 text-[11px] font-black shadow-xs shrink-0 flex items-center gap-1 cursor-pointer transition active:scale-95"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{tr(language, 'ដំឡើង VIP', 'Upgrade VIP', '升级 VIP')}</span>
                </button>
              </div>
            )}

            {/* AI Answer Display — Rendered DIRECTLY below the AI input bar so users read top-down naturally */}
            {!drinkMode && chatMessages.length > 0 && (() => {
              const hasActiveAnswer = chatMessages.length > 1;
              const welcomeMsg = chatMessages[0];
              const latestTurn = hasActiveAnswer ? chatMessages.slice(-2) : [];
              const earlierTurns = chatMessages.length > 3 ? chatMessages.slice(1, -2) : [];

              const renderMessageNode = (msg: AiAssistantMessage) => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-xs bg-[#064E3B] text-white text-xs font-bold leading-relaxed shadow-2xs space-y-1.5">
                        {msg.imagePreviewUrl && (
                          <img src={msg.imagePreviewUrl} alt="" className="w-40 max-w-full rounded-xl border border-white/30 object-cover" />
                        )}
                        <div>{msg.text}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="space-y-2">
                    <div
                      className={`p-3 rounded-2xl rounded-tl-xs border text-xs leading-relaxed whitespace-pre-line ${
                        msg.isScopeRefusal
                          ? 'bg-amber-50/90 dark:bg-slate-800 border-amber-300 dark:border-amber-600/60 text-slate-800 dark:text-slate-100 font-semibold'
                          : msg.needsClarification
                            ? 'bg-sky-50/90 dark:bg-slate-800 border-sky-300 dark:border-sky-700/70 text-slate-800 dark:text-slate-100'
                            : 'bg-white dark:bg-slate-800 border-emerald-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {msg.isPending && !msg.text ? (
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
                          <span className="inline-flex gap-1" aria-hidden="true">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                          </span>
                          <span>{tr(language, 'កំពុងគិត និងវិភាគ...', 'Thinking...', '正在思考与分析...')}</span>
                        </div>
                      ) : (
                        <RichAnswerText text={msg.text} />
                      )}

                      {isAdmin && (msg.failureReason === 'no_key' || msg.failureReason === 'auth') && (
                        <div
                          data-testid="ai-inline-key-setup"
                          className="mt-2.5 p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/70 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] font-extrabold text-[#064E3B] dark:text-emerald-300">
                              {tr(language, 'បញ្ចូលសោ Gemini API Key ទីនេះ៖', 'Paste Gemini API Key here:', '在此粘贴 Gemini API Key：')}
                            </span>
                            <a
                              href="https://aistudio.google.com/app/apikey"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>{tr(language, 'យកសោឥតគិតថ្លៃ (Google AI Studio)', 'Get free key (Google AI Studio)', '免费获取密钥 (Google AI Studio)')}</span>
                            </a>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-1.5">
                            <input
                              type="text"
                              value={inlineApiKeyInput}
                              onChange={(e) => setInlineApiKeyInput(e.target.value)}
                              placeholder="AIzaSy..."
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-emerald-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                            />
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const clip = await navigator.clipboard.readText();
                                    if (clip && clip.trim()) setInlineApiKeyInput(clip.trim());
                                  } catch {
                                    showToast(tr(language, 'សូមចុចឱ្យជាប់ក្នុងប្រអប់ រួចជ្រើសរើស Paste', 'Long-press the box and tap Paste', '请长按输入框并选择粘贴'), 'info');
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-[11px] transition cursor-pointer"
                              >
                                Paste
                              </button>
                              <button
                                type="button"
                                disabled={isTestingInlineKey || !inlineApiKeyInput.trim()}
                                onClick={async () => {
                                  const candidate = inlineApiKeyInput.trim();
                                  if (!candidate) return;
                                  setIsTestingInlineKey(true);
                                  try {
                                    saveCloudApiConfig({ geminiApiKey: candidate });
                                    await updateAppSettings({ geminiApiKey: candidate });
                                    const res = await testGeminiApiConnection(candidate);
                                    if (res.ok) {
                                      showToast(
                                        tr(
                                          language,
                                          `បានរក្សាទុក និងភ្ជាប់ Gemini AI ជោគជ័យ (${res.model})! សូមផ្ញើរូបភាព ឬសំណួរម្តងទៀត។`,
                                          `Saved & connected to Gemini AI (${res.model})! Please resend your photo or question.`,
                                          `已保存并成功连接 Gemini AI (${res.model})！请重新发送图片或问题。`
                                        ),
                                        'success'
                                      );
                                    } else {
                                      showToast(`Gemini Key Error: ${res.message}`, 'error');
                                    }
                                  } finally {
                                    setIsTestingInlineKey(false);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#064E3B] hover:bg-[#047857] text-white font-extrabold text-[11px] transition cursor-pointer disabled:opacity-50"
                              >
                                {isTestingInlineKey
                                  ? tr(language, 'កំពុងតេស្ត...', 'Testing...', '测试中...')
                                  : tr(language, 'រក្សាទុក & តេស្ត', 'Save & Test', '保存并测试')}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {msg.imageAnalysis && !msg.imageAnalysis.containsFood && (
                        <div data-testid="ai-image-no-food" className="mt-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                          {tr(language, 'ខ្ញុំមិនឃើញម្ហូបអាហារនៅក្នុងរូបភាពនេះទេ។ សូមថតរូបម្ហូបឱ្យច្បាស់ជាងនេះ។', 'I can’t see any food in this photo. Please send a clearer picture of the dish.', '这张照片里我没有看到食物，请拍一张更清晰的菜品照片。')}
                        </div>
                      )}

                      {msg.imageAnalysis && msg.imageAnalysis.containsFood && (
                        <div data-testid="ai-image-analysis" className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-extrabold text-[#064E3B] dark:text-emerald-300">
                              {tr(language, 'ម្ហូបក្នុងរូបភាព', 'Dish in photo', '照片中的菜品')}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                msg.imageAnalysis.identified
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                              }`}
                            >
                              {msg.imageAnalysis.identified
                                ? `✓ ${tr(language, 'ស្គាល់ហើយ', 'Recognized', '已识别')}`
                                : tr(language, 'មិនទាន់ប្រាកដ', 'Not sure yet', '尚不确定')}
                            </span>
                          </div>
                          {msg.imageAnalysis.dishName && (
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {msg.imageAnalysis.dishName}
                              {msg.imageAnalysis.dishNameEn ? ` (${msg.imageAnalysis.dishNameEn})` : ''}
                            </div>
                          )}
                          {msg.imageAnalysis.evidence && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">{msg.imageAnalysis.evidence}</p>
                          )}
                          {msg.imageAnalysis.visibleIngredients.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {msg.imageAnalysis.visibleIngredients.map((ing, k) => (
                                <span key={k} className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                                  {ing}
                                </span>
                              ))}
                            </div>
                          )}
                          {msg.imageAnalysis.cookingMethod && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300">{msg.imageAnalysis.cookingMethod}</div>
                          )}
                        </div>
                      )}

                      {msg.vegetarianNote && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-emerald-950 dark:text-emerald-200 leading-relaxed">
                          {msg.vegetarianNote}
                        </div>
                      )}

                      {msg.dishes && msg.dishes.length > 0 && !msg.recipePreview && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] font-extrabold text-[#064E3B] dark:text-emerald-300 flex items-center gap-1">
                              <Utensils className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>
                                {tr(
                                  language,
                                  'មុខម្ហូបណែនាំ៖',
                                  'Recommended Dishes:',
                                  '推荐菜品：'
                                )}
                              </span>
                            </div>
                            {msg.dishes.length >= 2 && (
                              <button
                                type="button"
                                onClick={() => handleCycleCompareDishes(activeDishList.length >= 3 ? activeDishList : msg.dishes)}
                                className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-[10px] font-extrabold text-amber-900 dark:text-amber-200 hover:bg-amber-200 transition cursor-pointer"
                              >
                                {tr(language, 'ប្រៀបធៀបទាំងអស់', 'Compare All', '一键对比')}
                              </button>
                            )}
                          </div>

                          <div className="space-y-2">
                            {msg.dishes.slice(0, 3).map((dish) => {
                              const dLoc = getLocalizedFood(dish, language);
                              const tasteProfile = describeDish(dish, language);
                              const isCompared = comparedDishIds.includes(dish.id);
                              const topIngs = (dish.ingredients || []).slice(0, 3).map((ing, idx) =>
                                language === 'km'
                                  ? ing.nameKh
                                  : language === 'zh'
                                    ? dLoc.ingredients?.[idx]?.name || ing.nameEn || ing.nameKh
                                    : ing.nameEn || ing.nameKh
                              );
                              const methodStep = (dish.steps || [])[0];
                              const methodSummary = methodStep
                                ? language === 'km'
                                  ? methodStep.instructionKh
                                  : language === 'zh'
                                    ? dLoc.steps?.[0]?.instruction || methodStep.instructionEn || methodStep.instructionKh
                                    : methodStep.instructionEn || methodStep.instructionKh
                                : '';

                              return (
                                <div
                                  key={dish.id}
                                  data-testid={`ai-chat-dish-card-${dish.id}`}
                                  className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/75 border border-slate-200/90 dark:border-slate-700 space-y-2"
                                >
                                  <div className="flex items-start gap-2.5">
                                    <img
                                      src={foodPhotoSrc(dish)}
                                      alt={dLoc.name}
                                      referrerPolicy="no-referrer"
                                      loading="lazy"
                                      decoding="async"
                                      onError={(e) => {
                                        const imgEl = e.currentTarget as HTMLImageElement; if (imgEl.dataset.fb === (imgEl.getAttribute('src') || '')) return; imgEl.src = fallbackPhotoFor(dish.id); imgEl.dataset.fb = imgEl.getAttribute('src') || '';
                                      }}
                                      className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-200 border border-slate-200 dark:border-slate-700"
                                    />
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                          {dLoc.name}
                                        </span>
                                        {!isGeneratedDishId(dish.id) && (
                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                          {dish.rating}
                                        </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                        {isGeneratedDishId(dish.id) ? dLoc.category : `${dLoc.category} • ${dLoc.cookTime} • ${dish.calories || 280} kcal`}
                                      </div>
                                      {!isGeneratedDishId(dish.id) && (
                                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                                        <span>{tr(language, 'រសជាតិ៖', 'Taste:', '风味：')} {tasteProfile}</span>
                                      </div>
                                      )}
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                                    {dLoc.description}
                                  </p>

                                  {topIngs.length > 0 && (
                                    <div className="text-[10px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/90 px-2 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/70">
                                      <span className="font-extrabold text-[#064E3B] dark:text-emerald-300">
                                        {tr(language, 'គ្រឿងផ្សំ៖ ', 'Ingredients: ', '主要食材：')}
                                      </span>
                                      <span>{topIngs.join(' • ')}</span>
                                    </div>
                                  )}

                                  {methodSummary && (
                                    <div className="text-[10px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/90 px-2 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/70 line-clamp-2">
                                      <span className="font-extrabold text-[#064E3B] dark:text-emerald-300">
                                        {tr(language, 'របៀបចម្អិន៖ ', 'Cooking Method: ', '烹饪方法：')}
                                      </span>
                                      <span>{methodSummary}</span>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedFood(dish);
                                        setIsWhatToEatModalOpen(false);
                                      }}
                                      className="py-1.5 px-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <ChefHat className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                      <span className="truncate">{tr(language, 'មើលលម្អិតពេញ', 'Full Details', '查看完整详情')}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleCompareDish(dish.id)}
                                      className={`py-1.5 px-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                                        isCompared
                                          ? 'bg-amber-400 text-slate-950 border-amber-500'
                                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                                      }`}
                                    >
                                      <span>
                                        {isCompared
                                          ? `✓ ${tr(language, 'កំពុងប្រៀបធៀប', 'Comparing', '已加入对比')}`
                                          : tr(language, 'ប្រៀបធៀប', 'Compare', '加入对比')}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {msg.recipePreview && (() => {
                        const rawRpFood = msg.recipePreview.food;
                        const liveRpPhoto = rawRpFood ? onlinePhotoByDishId[rawRpFood.id] : undefined;
                        const rpFood =
                          rawRpFood && liveRpPhoto && rawRpFood.photoUrl !== liveRpPhoto
                            ? { ...rawRpFood, photoUrl: liveRpPhoto, originalPhotoUrl: liveRpPhoto }
                            : rawRpFood;
                        const rpLoc = rpFood ? getLocalizedFood(rpFood, language) : null;
                        const rpTaste = rpFood ? describeDish(rpFood, language) : '';

                        return (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
                            {rpFood && rpLoc && (
                              <div
                                data-testid={`ai-chat-recipe-hero-${rpFood.id}`}
                                className="rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/80 border border-emerald-200/80 dark:border-slate-700 shadow-xs"
                              >
                                <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                                  {isGeneratedDishId(rpFood.id) &&
                                  !failedOnlineDishIds[rpFood.id] &&
                                  !hasRenderablePhoto(rpFood.photoUrl) ? (
                                    <div className="w-full h-full bg-gradient-to-br from-[#064E3B] via-[#047857] to-slate-900 flex flex-col items-center justify-center gap-2 text-emerald-100 p-4 text-center">
                                      <ChefHat className="w-7 h-7 text-amber-300" />
                                      <span className="text-[11px] font-bold">
                                        {tr(language, 'កំពុងរៀបចំរូបភាព...', 'Preparing photo...', '正在准备图片...')}
                                      </span>
                                    </div>
                                  ) : (
                                    <img
                                      src={foodPhotoSrc(rpFood)}
                                      alt={rpLoc.name}
                                      referrerPolicy="no-referrer"
                                      loading="eager"
                                      decoding="async"
                                      onError={(e) => {
                                        const imgEl = e.currentTarget as HTMLImageElement; if (imgEl.dataset.fb === (imgEl.getAttribute('src') || '')) return; imgEl.src = fallbackPhotoFor(rpFood.id); imgEl.dataset.fb = imgEl.getAttribute('src') || '';
                                      }}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
                                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-900 text-[10px] font-black shadow-2xs flex items-center gap-1">
                                      <Award className="w-3 h-3 text-amber-900" />
                                      {tr(language, 'មុខម្ហូបទី ១', 'Top Dish', '首选菜品')}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                                      {rpLoc.category}
                                    </span>
                                  </div>
                                  {!isUrlWatermarkedAtPixelLevel(rpFood.photoUrl) && (
                                    <span className={FOOD_WATERMARK_BADGE_CLASS}>
                                      {FOOD_WATERMARK_TEXT}
                                    </span>
                                  )}
                                  <div className="absolute bottom-2 left-3 right-20 text-white space-y-0.5">
                                    <div className="text-sm font-extrabold leading-snug drop-shadow truncate">
                                      {rpLoc.name}
                                    </div>
                                    <div className="text-[10px] font-bold text-emerald-200 flex items-center gap-1.5 flex-wrap">
                                      {!isGeneratedDishId(rpFood.id) ? (
                                        <>
                                          <span>{rpFood.rating || 4.8}</span>
                                          <span>•</span>
                                          <span>{rpLoc.cookTime}</span>
                                          <span>•</span>
                                          <span>{rpFood.calories || 280} kcal</span>
                                        </>
                                      ) : rpFood.cookTime ? (
                                        <span>{rpLoc.cookTime}</span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                                <div className="p-2.5 space-y-1.5">
                                  {rpTaste && !isGeneratedDishId(rpFood.id) && (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/85 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                                      <span>{tr(language, 'រសជាតិ៖', 'Taste:', '风味：')} {rpTaste}</span>
                                    </div>
                                  )}
                                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                                    {rpLoc.description}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="font-extrabold text-[#064E3B] dark:text-emerald-300 flex items-center gap-1">
                              <ChefHat className="w-3.5 h-3.5 shrink-0" />
                              <span>{tr(language, 'គ្រឿងផ្សំសំខាន់ៗ៖', 'Key Ingredients:', '主要食材：')}</span>
                            </div>
                            <ul className="grid grid-cols-1 gap-1 text-[11px] text-slate-700 dark:text-slate-300">
                              {msg.recipePreview.ingredients.map((ing, idx) => (
                                <li key={idx} className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/60 px-2 py-1 rounded-lg">
                                  <span className="font-bold">• {ing.name}</span>
                                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">{ing.amount}</span>
                                </li>
                              ))}
                            </ul>

                            <div className="font-extrabold text-[#064E3B] dark:text-emerald-300 pt-1">
                              {tr(language, 'របៀបធ្វើ៖', 'Cooking Steps:', '制作步骤：')}
                            </div>
                            <ol className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                              {msg.recipePreview.steps.map((st) => (
                                <li key={st.stepNumber} className="leading-snug">
                                  <span className="font-black text-emerald-700 dark:text-emerald-400 mr-1">{st.stepNumber}.</span>
                                  {st.instruction}
                                </li>
                              ))}
                            </ol>

                            <button
                              type="button"
                              onClick={() => {
                                if (rpFood) {
                                  setSelectedFood(rpFood);
                                  setIsWhatToEatModalOpen(false);
                                }
                              }}
                              className="w-full mt-1 py-2 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <ChefHat className="w-3.5 h-3.5 text-amber-300" />
                              <span>{tr(language, 'បើកមើលរូបមន្តពេញលេញ', 'Open Full Recipe Card', '打开完整食谱详情')}</span>
                            </button>
                          </div>
                        );
                      })()}

                      {(() => {
                        const rpId = msg.recipePreview?.food?.id;
                        const extraFromDishes = rpId
                          ? (msg.dishes || []).filter((d) => d.id !== rpId)
                          : [];
                        const combinedSimilar: FoodItem[] = [];
                        const seenSim = new Set<string>(rpId ? [rpId] : []);
                        for (const item of [...extraFromDishes, ...(msg.similarDishes || [])]) {
                          if (!seenSim.has(item.id)) {
                            seenSim.add(item.id);
                            combinedSimilar.push(item);
                          }
                        }
                        if (combinedSimilar.length === 0) return null;
                        return (
                          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                            <div className="text-[11px] font-extrabold text-[#064E3B] dark:text-emerald-300 flex items-center gap-1">
                              <Shuffle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>
                                {tr(
                                  language,
                                  'មុខម្ហូបស្រដៀងគ្នា៖',
                                  'Similar Dishes:',
                                  '相似菜品推荐：'
                                )}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {combinedSimilar.slice(0, 4).map((sim) => {
                                const sLoc = getLocalizedFood(sim, language);
                                return (
                                  <button
                                    key={sim.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedFood(sim);
                                      setIsWhatToEatModalOpen(false);
                                    }}
                                    className="p-1.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 flex items-center gap-2 text-left transition cursor-pointer"
                                  >
                                    <img
                                      src={resolveFoodPhotoUrl(sim.photoUrl, sim.photoUpdatedAt, 240, sim.id)}
                                      alt={sLoc.name}
                                      referrerPolicy="no-referrer"
                                      loading="lazy"
                                      decoding="async"
                                      onError={(e) => handleFoodImageError(e, sim.id, sim.photoUrl)}
                                      className="w-9 h-9 rounded-lg object-cover shrink-0 bg-slate-200"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                        {sLoc.name}
                                      </div>
                                      <div className="text-[9px] text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                                        {sim.rating} • {sLoc.category}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {msg.agentResult && (
                        <div className="mt-2.5 pt-2 border-t border-emerald-200/70 dark:border-slate-700 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-[#064E3B] dark:text-emerald-300 text-[10px] font-extrabold">
                              <span>⚡ AI Agent • {msg.agentResult.toolName}()</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {msg.agentResult.latencyMs}ms {msg.agentResult.fromCache ? '• Cached' : '• $0 Free'}
                            </span>
                          </div>

                          {/* 1. Shop / Hotel Owner Profile Update Confirmation Card */}
                          {msg.agentResult.pendingOwnerUpdate && (() => {
                            const upd = msg.agentResult.pendingOwnerUpdate;
                            const status = confirmedOwnerUpdates[upd.actionId];
                            return (
                              <div className="p-3 rounded-2xl bg-amber-50/90 dark:bg-slate-900/90 border border-amber-300 dark:border-amber-700/70 space-y-2.5">
                                <div className="text-xs font-extrabold text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
                                  <span>
                                    {tr(
                                      language,
                                      `🛡️ បញ្ជាក់ការកែប្រែ៖ ${upd.businessNameKh}`,
                                      `🛡️ Confirm Profile Update: ${upd.businessNameEn}`,
                                      `🛡️ 确认更新商户资料：${upd.businessNameEn}`
                                    )}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-800/60 text-[10px]">
                                    {upd.isHotel ? '🏨 Hotel' : '🏪 Shop'}
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {upd.changes.map((ch) => (
                                    <div
                                      key={ch.field}
                                      className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-200/80 dark:border-slate-700 text-[11px] space-y-0.5"
                                    >
                                      <div className="font-extrabold text-slate-700 dark:text-slate-200">
                                        {language === 'km' ? ch.labelKh : ch.labelEn}
                                      </div>
                                      <div className="text-slate-400 line-through truncate">{ch.oldValue}</div>
                                      <div className="text-emerald-700 dark:text-emerald-300 font-bold break-words">
                                        → {ch.newValue}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {status === 'confirmed' ? (
                                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold flex items-center justify-between gap-2">
                                    <span>
                                      {tr(
                                        language,
                                        '✅ បានបញ្ជាក់ និងរក្សាទុកព័ត៌មានហាងដោយជោគជ័យ!',
                                        '✅ Confirmed & saved to your business profile!',
                                        '✅ 已确认并成功保存商户资料！'
                                      )}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsWhatToEatModalOpen(false);
                                        openManageMyVipStore(upd.businessId, 'info');
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-[#064E3B] text-white text-[10px] font-extrabold cursor-pointer"
                                    >
                                      {tr(language, 'បើកហាង', 'Open Store', '管理店铺')}
                                    </button>
                                  </div>
                                ) : status === 'cancelled' ? (
                                  <div className="p-2 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
                                    {tr(
                                      language,
                                      '❌ បានបោះបង់ការកែប្រែ — ទិន្នន័យហាងរក្សាទុកដូចដើម។',
                                      '❌ Update cancelled — your listing remains unchanged.',
                                      '❌ 已取消更新，商户资料保持不变。'
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const target = restaurants.find((r) => r.id === upd.businessId);
                                        if (!target) return;
                                        updateRestaurant({ ...target, ...upd.patch });
                                        setConfirmedOwnerUpdates((prev) => ({ ...prev, [upd.actionId]: 'confirmed' }));
                                        showToast(
                                          tr(
                                            language,
                                            `បានរក្សាទុកការកែប្រែសម្រាប់ «${upd.businessNameKh}»!`,
                                            `Updated "${upd.businessNameEn}" successfully!`,
                                            `已成功更新「${upd.businessNameEn}」！`
                                          ),
                                          'success'
                                        );
                                      }}
                                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer transition"
                                    >
                                      {tr(language, '✅ បញ្ជាក់ និងរក្សាទុក', '✅ Confirm & Apply', '✅ 确认并保存')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirmedOwnerUpdates((prev) => ({ ...prev, [upd.actionId]: 'cancelled' }))
                                      }
                                      className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold cursor-pointer transition"
                                    >
                                      {tr(language, '❌ បោះបង់', '❌ Cancel', '❌ 取消')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsWhatToEatModalOpen(false);
                                        openManageMyVipStore(upd.businessId, 'info');
                                      }}
                                      className="py-2 px-2.5 rounded-xl border border-amber-400 text-amber-900 dark:text-amber-200 text-[11px] font-bold cursor-pointer"
                                    >
                                      {tr(language, '🛠️ ផ្ទាំងគ្រប់គ្រងហាង', '🛠️ Full Editor', '🛠️ 店铺后台')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* 2. AI Travel Itinerary Card */}
                          {msg.agentResult.itinerary && (() => {
                            const plan = msg.agentResult.itinerary;
                            const isSaved = Boolean(savedItineraryIds[plan.id]);
                            return (
                              <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-slate-700 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-extrabold text-[#064E3B] dark:text-emerald-300">
                                    {tr(
                                      language,
                                      `📅 ផែនការ ${plan.durationDays} ថ្ងៃ • ${plan.provinceKh}`,
                                      `📅 ${plan.durationDays}-Day Plan • ${plan.provinceEn}`,
                                      `📅 ${plan.durationDays}日行程 • ${plan.provinceEn}`
                                    )}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold">
                                    ~${plan.totalEstimatedCostUsd}
                                  </span>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                  {plan.days.map((day) => (
                                    <div
                                      key={day.dayNumber}
                                      className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 space-y-1"
                                    >
                                      <div className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                                        <span>{language === 'km' ? day.titleKh : day.titleEn}</span>
                                        <span className="text-[10px] text-slate-500">~${day.dayEstimatedCostUsd}</span>
                                      </div>
                                      {day.activities.map((act, idx) => (
                                        <div key={idx} className="text-[11px] text-slate-700 dark:text-slate-200 leading-snug">
                                          <span className="font-bold text-amber-700 dark:text-amber-300">
                                            {act.timePeriod === 'morning'
                                              ? '🌅 '
                                              : act.timePeriod === 'lunch'
                                              ? '🍲 '
                                              : act.timePeriod === 'afternoon'
                                              ? '🏞️ '
                                              : '🌙 '}
                                          </span>
                                          <span className="font-semibold">
                                            {language === 'km' ? act.titleKh : act.titleEn}
                                          </span>
                                          <span className="text-[10px] text-slate-400"> (${act.estimatedCostUsd})</span>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    disabled={isSaved}
                                    onClick={() => {
                                      saveTripPlan(plan);
                                      setSavedItineraryIds((prev) => ({ ...prev, [plan.id]: true }));
                                    }}
                                    className="flex-1 py-2 px-3 rounded-xl bg-[#064E3B] hover:bg-emerald-800 disabled:bg-emerald-700/60 text-white text-xs font-extrabold cursor-pointer transition"
                                  >
                                    {isSaved
                                      ? tr(language, '✅ បានរក្សាទុកផែនការហើយ', '✅ Trip Plan Saved', '✅ 行程已保存')
                                      : tr(language, '💾 រក្សាទុកផែនការដើរលេង', '💾 Save Trip Plan', '💾 保存旅行行程')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsWhatToEatModalOpen(false);
                                      setIsAiTripPlannerModalOpen(true);
                                    }}
                                    className="py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-emerald-400 text-[#064E3B] dark:text-emerald-300 text-xs font-extrabold cursor-pointer"
                                  >
                                    {tr(language, '🗺️ ផ្ទាំងផែនការពេញ', '🗺️ Full Planner', '🗺️ 完整规划器')}
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* 3. Verified Hotels & Resorts Cards */}
                          {msg.agentResult.hotels && msg.agentResult.hotels.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="text-[11px] font-extrabold text-[#064E3B] dark:text-emerald-300">
                                {tr(language, '🏨 សណ្ឋាគារ និងរីសតណែនាំ៖', '🏨 Verified Hotels & Resorts:', '🏨 推荐核实酒店与度假村：')}
                              </div>
                              {msg.agentResult.hotels.map((h) => {
                                const saved = isItemInWishlist(h.id);
                                return (
                                  <div
                                    key={h.id}
                                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 flex items-center gap-2"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (h.restaurantRecord) {
                                          setSelectedRestaurant(h.restaurantRecord);
                                          setIsWhatToEatModalOpen(false);
                                        } else if (h.destinationRecord) {
                                          setSelectedDestination(h.destinationRecord);
                                          setIsWhatToEatModalOpen(false);
                                        }
                                      }}
                                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                                    >
                                      <img
                                        src={h.photoUrl}
                                        alt={language === 'km' ? h.nameKh : h.nameEn}
                                        loading="lazy"
                                        onError={(e) => {
                                          const el = e.currentTarget as HTMLImageElement;
                                          if (el.dataset.fb !== '1') {
                                            el.dataset.fb = '1';
                                            el.src = '/destinations/dest-1.jpg';
                                          }
                                        }}
                                        className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate-200"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate flex items-center gap-1">
                                          <span className="truncate">{language === 'km' ? h.nameKh : h.nameEn}</span>
                                          {h.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                        </div>
                                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold truncate">
                                          {language === 'km' ? h.provinceKh : h.provinceEn} • ★ {h.rating.toFixed(1)} • {h.priceDisplay}
                                          {h.distanceKm !== undefined ? ` • ${h.distanceKm} km` : ''}
                                        </div>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openAddToWishlist({
                                          id: h.id,
                                          type: h.restaurantRecord ? 'restaurant' : 'destination',
                                          nameKh: h.nameKh,
                                          nameEn: h.nameEn,
                                          photoUrl: h.photoUrl,
                                          provinceKh: h.provinceKh,
                                          priceDisplay: h.priceDisplay,
                                          rating: h.rating,
                                        })
                                      }
                                      className={`p-1.5 rounded-lg border cursor-pointer ${
                                        saved
                                          ? 'bg-rose-50 border-rose-300 text-rose-600'
                                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                      }`}
                                      title={tr(language, 'រក្សាទុកចូលបញ្ជីចូលចិត្ត', 'Save to Wishlist', '收藏')}
                                    >
                                      <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-rose-500 text-rose-500' : ''}`} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openExternalUrlNativeSafe(h.mapUrl)}
                                      className="px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                                    >
                                      <Navigation className="w-3 h-3" />
                                      <span>{tr(language, 'ផែនទី', 'Maps', '地图')}</span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 4. Food Calorie & Nutrition Analysis Card */}
                          {msg.agentResult.nutrition && (() => {
                            const n = msg.agentResult.nutrition;
                            return (
                              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-slate-900/80 border border-emerald-200 dark:border-slate-700 space-y-2">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                    {language === 'km' ? n.dishNameKh : n.dishNameEn}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-emerald-300 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300">
                                    {n.healthBadgeLabel}
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5 text-center">
                                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200/70 dark:border-slate-700">
                                    <div className="text-xs font-black text-amber-600">{n.caloriesKcal}</div>
                                    <div className="text-[9px] font-bold text-slate-500">kcal</div>
                                  </div>
                                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200/70 dark:border-slate-700">
                                    <div className="text-xs font-black text-emerald-600">{n.proteinGrams}g</div>
                                    <div className="text-[9px] font-bold text-slate-500">
                                      {tr(language, 'ប្រូតេអ៊ីន', 'Protein', '蛋白质')}
                                    </div>
                                  </div>
                                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200/70 dark:border-slate-700">
                                    <div className="text-xs font-black text-sky-600">{n.carbsGrams}g</div>
                                    <div className="text-[9px] font-bold text-slate-500">
                                      {tr(language, 'កាបូអ៊ីដ្រាត', 'Carbs', '碳水')}
                                    </div>
                                  </div>
                                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200/70 dark:border-slate-700">
                                    <div className="text-xs font-black text-rose-500">{n.fatGrams}g</div>
                                    <div className="text-[9px] font-bold text-slate-500">
                                      {tr(language, 'ខ្លាញ់', 'Fat', '脂肪')}
                                    </div>
                                  </div>
                                </div>
                                {n.keyIngredients.length > 0 && (
                                  <div className="text-[10px] text-slate-600 dark:text-slate-300">
                                    <span className="font-bold">
                                      {tr(language, 'គ្រឿងផ្សំសំខាន់ៗ៖ ', 'Key ingredients: ', '主要食材：')}
                                    </span>
                                    {n.keyIngredients.join(' • ')}
                                  </div>
                                )}
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                  {n.summaryNote}
                                </p>
                              </div>
                            );
                          })()}

                          {/* 5. Trending YouTube & Social Food Videos */}
                          {msg.agentResult.trendingItems && msg.agentResult.trendingItems.length > 0 && (
                            <div className="space-y-1.5">
                              {msg.agentResult.trendingItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5"
                                >
                                  <img
                                    src={item.photoUrl}
                                    alt={item.foodNameKh}
                                    loading="lazy"
                                    onError={(e) => {
                                      const el = e.currentTarget as HTMLImageElement;
                                      if (el.dataset.fb !== '1') {
                                        el.dataset.fb = '1';
                                        el.src = '/foods/amok.jpg';
                                      }
                                    }}
                                    className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate-200"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                      {language === 'km' ? item.foodNameKh : item.foodNameEn}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                      {language === 'km' ? item.restaurantNameKh : item.restaurantNameEn} • {language === 'km' ? item.provinceKh : item.provinceEn}
                                    </div>
                                    {item.socialViews && (
                                      <div className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400">
                                        🔥 {item.socialViews}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTrendingFood(item);
                                      setIsWhatToEatModalOpen(false);
                                      setIsTrendingFoodDetailModalOpen(true);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold shrink-0 cursor-pointer"
                                  >
                                    {tr(language, '▶️ មើល', '▶️ View', '▶️ 查看')}
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsWhatToEatModalOpen(false);
                                  setIsTrendingSocialModalOpen(true);
                                }}
                                className="w-full py-1.5 px-3 rounded-xl border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-[11px] font-extrabold cursor-pointer"
                              >
                                {tr(language, '🔥 បើកមើលវីដេអូម្ហូបល្បីៗទាំងអស់', '🔥 Explore All Trending Food Videos', '🔥 查看全部热门美食视频')}
                              </button>
                            </div>
                          )}

                          {/* 6. Direct Google Maps Directions Card */}
                          {msg.agentResult.directionsTarget && (
                            <button
                              type="button"
                              onClick={() => openExternalUrlNativeSafe(msg.agentResult!.directionsTarget!.mapUrl)}
                              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                            >
                              <Navigation className="w-4 h-4 text-amber-300 shrink-0" />
                              <span>
                                {tr(
                                  language,
                                  `បើកផ្លូវទៅកាន់ «${msg.agentResult.directionsTarget.placeName}» លើ Google Maps`,
                                  `Navigate to "${msg.agentResult.directionsTarget.placeName}" in Google Maps`,
                                  `在 Google 地图中导航前往「${msg.agentResult.directionsTarget.placeName}」`
                                )}
                                {msg.agentResult.directionsTarget.distanceKm !== undefined
                                  ? ` (${msg.agentResult.directionsTarget.distanceKm} km)`
                                  : ''}
                              </span>
                            </button>
                          )}

                          {/* 7. Quick Save to Favorites Candidate Card */}
                          {msg.agentResult.favoriteCandidate && (() => {
                            const fav = msg.agentResult.favoriteCandidate;
                            const alreadySaved = isItemInWishlist(fav.id);
                            return (
                              <button
                                type="button"
                                onClick={() => openAddToWishlist(fav)}
                                className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <Heart className="w-4 h-4 fill-white shrink-0" />
                                <span>
                                  {alreadySaved
                                    ? tr(language, `❤️ «${fav.nameKh}» មានក្នុងបញ្ជីចូលចិត្តរួចហើយ (គ្រប់គ្រង)`, `❤️ "${fav.nameEn}" is in Wishlist (Manage)`, `❤️「${fav.nameEn}」已在收藏夹中`)
                                    : tr(language, `❤️ រក្សាទុក «${fav.nameKh}» ចូលបញ្ជីចូលចិត្ត`, `❤️ Save "${fav.nameEn}" to Wishlist`, `❤️ 将「${fav.nameEn}」加入收藏夹`)}
                                </span>
                              </button>
                            );
                          })()}
                        </div>
                      )}

                      {msg.destinations && msg.destinations.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                          <div className="text-[11px] font-extrabold text-[#064E3B] dark:text-emerald-300 flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5 shrink-0" />
                            <span>{tr(language, 'តំបន់ទេសចរណ៍ណែនាំ៖', 'Recommended Attractions:', '推荐旅游景点：')}</span>
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {msg.destinations.map((dest) => {
                              const dLoc = getLocalizedDestination(dest, language);
                              return (
                                <button
                                  key={dest.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedDestination(dest);
                                    setIsWhatToEatModalOpen(false);
                                  }}
                                  className="w-full p-2 rounded-xl bg-emerald-50/70 dark:bg-slate-900/70 border border-emerald-200/80 dark:border-slate-700 hover:border-emerald-500 flex items-center gap-2.5 text-left transition cursor-pointer"
                                >
                                  <img
                                    src={dest.photoUrl}
                                    alt={dLoc.name}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => {
                                      const imgEl = e.currentTarget as HTMLImageElement; if (imgEl.dataset.fb === (imgEl.getAttribute('src') || '')) return; imgEl.src = '/destinations/dest-1.jpg'; imgEl.dataset.fb = imgEl.getAttribute('src') || '';
                                    }}
                                    className="w-11 h-11 rounded-lg object-cover shrink-0 bg-slate-200"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{dLoc.name}</div>
                                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold truncate">
                                      {dLoc.province} • {dest.rating}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {msg.restaurants && msg.restaurants.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                          <div className="text-[11px] font-extrabold text-[#064E3B] dark:text-emerald-300 flex items-center gap-1">
                            <Store className="w-3.5 h-3.5 shrink-0" />
                            <span>{tr(language, 'ភោជនីយដ្ឋានណែនាំ និងទីតាំង៖', 'Recommended Restaurants & Locations:', '推荐餐厅与位置导航：')}</span>
                          </div>
                          <div className="space-y-1.5">
                            {msg.restaurants.map((r) => {
                              const rLoc = getLocalizedRestaurant(r, language);
                              return (
                                <div
                                  key={r.id}
                                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 flex items-center gap-2"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedRestaurant(r);
                                      setIsWhatToEatModalOpen(false);
                                    }}
                                    className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                                  >
                                    <ShopAvatar
                                      restaurant={r}
                                      alt={rLoc.name}
                                      className="w-9 h-9 rounded-lg shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{rLoc.name}</div>
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                        {rLoc.address || rLoc.province}
                                        {msg.agentResult?.shopDistancesKm?.[r.id] !== undefined
                                          ? ` • 📍 ${msg.agentResult.shopDistancesKm[r.id]} km`
                                          : ''}
                                      </div>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openRestaurantGoogleExternal(r, 'maps')}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                                  >
                                    <Navigation className="w-3 h-3" />
                                    <span>{tr(language, 'ផ្លូវទៅហាង', 'Maps', '导航')}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {msg.restaurantUnavailableNote && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            {msg.restaurantUnavailableNote}
                          </p>
                          {msg.googleMapsSearchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  msg.googleMapsSearchQuery!
                                )}`;
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <Navigation className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                              <span>
                                {tr(
                                  language,
                                  'ស្វែងរកហាង និងទីតាំងផ្ទាល់លើ Google Maps',
                                  'Find Restaurants & Navigate on Google Maps',
                                  '在 Google 地图上搜索餐厅并导航'
                                )}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {msg.followUpChips && msg.followUpChips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.followUpChips.map((chip) => (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => {
                              if (!canUseAiAssistant) {
                                promptVipUpgradeForAiAssistant();
                                return;
                              }
                              setCravingQuery(chip.query);
                              sendConversationalMessage(chip.query);
                            }}
                            className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-emerald-300/80 dark:border-slate-600 text-[11px] font-bold text-[#064E3B] dark:text-emerald-300 hover:bg-emerald-50 transition cursor-pointer active:scale-95"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              };

              if (!hasActiveAnswer) {
                return (
                  <div id="kft-wte-chat-thread" className="space-y-1.5">
                    {welcomeMsg?.followUpChips && welcomeMsg.followUpChips.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {welcomeMsg.followUpChips.map((chip) => (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => {
                              if (!canUseAiAssistant) {
                                promptVipUpgradeForAiAssistant();
                                return;
                              }
                              setCravingQuery(chip.query);
                              sendConversationalMessage(chip.query);
                            }}
                            className="px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-[11px] font-bold text-[#064E3B] dark:text-emerald-300 whitespace-nowrap hover:bg-emerald-50 transition cursor-pointer active:scale-95"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  id="kft-wte-chat-thread"
                  ref={chatEndRef}
                  className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-emerald-200/80 dark:border-slate-700 p-3 space-y-2.5 font-khmer"
                >
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/70 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#064E3B] dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={1.75} />
                      <span>
                        {tr(
                          language,
                          'ចម្លើយ',
                          'Answer',
                          '回答'
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetChat}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-bold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1 hover:text-emerald-600 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{tr(language, 'សម្អាតចម្លើយ', 'Clear', '清空')}</span>
                    </button>
                  </div>

                  {/* Latest Q&A turn appears directly below AI input bar (no nested scrollbar) */}
                  <div className="space-y-2.5">
                    {latestTurn.map((msg) => renderMessageNode(msg))}
                  </div>

                  {earlierTurns.length > 0 && (
                    <details className="pt-1.5 border-t border-slate-200/70 dark:border-slate-700">
                      <summary className="text-[11px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                        {tr(
                          language,
                          `មើលសំណួរ និងចម្លើយមុនៗ (${Math.ceil(earlierTurns.length / 2)})`,
                          `Earlier answers (${Math.ceil(earlierTurns.length / 2)})`,
                          `查看之前的回答 (${Math.ceil(earlierTurns.length / 2)})`
                        )}
                      </summary>
                      <div className="mt-2 space-y-2.5">
                        {earlierTurns.map((msg) => renderMessageNode(msg))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })()}

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
              <span className="shrink-0 flex flex-col items-end gap-1">
                <AccessBadge vip />
                {canUseVip && drinkMode && (
                  <span className="text-[10px] font-black text-amber-200">✓ {tr(language, 'បើក', 'ON', '开启')}</span>
                )}
                {!canUseVip && <Lock className="w-3 h-3 text-amber-200" />}
              </span>
            </button>

            {/* Compact sub-menus (100% Food & Tourism: Time, Type, Craving, Tourism) */}
            <div className="grid grid-cols-4 gap-1.5 pt-1.5">
              {menuGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  data-testid={`wte-tab-${g.id}`}
                  onClick={() => setOpenGroup((cur) => (cur === g.id ? null : g.id))}
                  className={`relative pt-3 pb-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition cursor-pointer min-w-0 ${
                    openGroup === g.id
                      ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                      : g.active
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#064E3B] dark:text-emerald-300 border-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <AccessBadge vip={g.vip} className="absolute -top-2 left-1/2 -translate-x-1/2" />
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
                        data-testid={`wte-time-${slot.id}`}
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
                      data-testid={`wte-type-${c.id}`}
                      onClick={() => {
                        setCategoryFilter(c.id);
                        setDrinkMode(false);
                        // Clear preset craving if it conflicts with the newly chosen category
                        if (c.id !== 'all' && cravingQuery.trim()) {
                          const isPresetChip = QUICK_CRAVING_CHIPS.some(
                            (chip) =>
                              normalizeKhmerFoodText(chip.queryKh) === normalizeKhmerFoodText(cravingQuery) ||
                              chip.queryEn.toLowerCase() === cravingQuery.trim().toLowerCase() ||
                              chip.queryZh.toLowerCase() === cravingQuery.trim().toLowerCase()
                          );
                          const hasStrictIntersection = (aiCravingRecommendations?.allMatchedDishes || []).some((f) =>
                            matchesCategoryStrict(f, c.id)
                          );
                          if (isPresetChip || !hasStrictIntersection) {
                            setCravingQuery('');
                          }
                        }
                        if (chatMessages.length > 1) {
                          setChatMessages([
                            buildWelcomeAssistantMessage(language, foods.length, restaurants.length, destinations.length),
                          ]);
                        }
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
                    const isChipActive = normalizeKhmerFoodText(cravingQuery) === normalizeKhmerFoodText(chipQuery);
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        data-testid={`wte-craving-${chip.id}`}
                        onClick={() => {
                          if (!canUseAiAssistant) {
                            promptVipUpgradeForAiAssistant();
                            return;
                          }
                          setCravingQuery(chipQuery);
                          setDrinkMode(false);
                          // Clear categoryFilter when selecting a preset Craving chip so they never conflict (e.g. Dessert + Grilled)
                          setCategoryFilter('all');
                          setOpenGroup(null);
                          sendConversationalMessage(chipQuery);
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
                  HEALTH_OPTIONS.map((opt) => {
                    const OptIcon = opt.icon;
                    const isOptActive = vipDietFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        data-testid={`wte-health-${opt.id}`}
                        onClick={() => {
                          setVipDietFilter(opt.id);
                          setDrinkMode(false);
                          if (chatMessages.length > 1) {
                            setChatMessages([
                              buildWelcomeAssistantMessage(language, foods.length, restaurants.length, destinations.length),
                            ]);
                          }
                          setOpenGroup(null);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 transition cursor-pointer ${
                          isOptActive
                            ? 'bg-amber-400 text-slate-950 shadow-xs'
                            : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        <OptIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{tr(language, opt.labelKh, opt.labelEn, opt.labelZh)}</span>
                        <AccessBadge vip={opt.vip} />
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
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed">
                      {tr(language, 'ម្ហូបអមភេសជ្ជៈ', 'Beverage Pairings', '佐餐与饮品搭配')}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {tr(
                        language,
                        `ឈុតម្ហូបជ្រើសរើសដោយ AI • ${showSets ? pairingSets.length : 0} ឈុត × ${PAIRING_SET_SIZE} មុខ`,
                        `AI-curated sets • ${showSets ? pairingSets.length : 0} sets × ${PAIRING_SET_SIZE} dishes`,
                        `AI 精选套餐 • ${showSets ? pairingSets.length : 0} 套 × ${PAIRING_SET_SIZE} 道`
                      )}
                    </p>
                  </div>
                  <AccessBadge vip className="mt-1" />
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
                      onClick={() => {
                        setDrinkKind(k.id);
                        setDrinkShuffleSeed(Date.now() + Math.floor(Math.random() * 100000));
                      }}
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
                  <button
                    type="button"
                    onClick={() => {
                      setIsSpinning(true);
                      setTimeout(() => {
                        setSetPage(0);
                        setDrinkShuffleSeed(Date.now() + Math.floor(Math.random() * 100000));
                        setSpinCount((c) => c + 1);
                        setIsSpinning(false);
                      }, 180);
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-500/60 shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5 shrink-0" />
                    <span>{tr(language, 'ចាប់ឈុតថ្មីចៃដន្យ', 'Randomize Sets', '随机生成新套餐')}</span>
                  </button>
                </div>
              </div>
            )}

            {showSets && (
              <div className={`space-y-3 transition-opacity duration-200 ${isSpinning ? 'opacity-30' : 'opacity-100'}`}>
                {visibleSets.map((set, idx) => {
                  const setNo = setPage * PAIRING_SETS_PER_PAGE + idx + 1;
                  return (
                    <div
                      key={`${setPage}-${idx}`}
                      className="rounded-3xl p-3 bg-gradient-to-br from-[#0f2922] via-[#133b2f] to-[#1a4d3c] border border-amber-400/50 shadow-lg space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 px-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center shrink-0">
                            {setNo}
                          </span>
                          <span className="font-moul text-xs text-amber-100 truncate">
                            {tr(language, `ឈុតម្ហូបទី ${setNo}`, `Pairing Set ${setNo}`, `搭配套餐 ${setNo}`)}
                          </span>
                        </div>
                        <IconBeveragePairing className="w-5 h-5 text-amber-300 shrink-0" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {set.map((food) => {
                          const fLoc = getLocalizedFood(food, language);
                          return (
                            <button
                              key={food.id}
                              type="button"
                              onClick={() => {
                                setSelectedFood(food);
                                setIsWhatToEatModalOpen(false);
                              }}
                              className="group rounded-2xl overflow-hidden bg-white/95 dark:bg-slate-800 border border-white/10 text-left active:scale-[0.97] transition cursor-pointer"
                            >
                              <span className="block aspect-4/3 w-full overflow-hidden bg-slate-200">
                                <img
                                  src={resolveFoodPhotoUrl(food.photoUrl, food.photoUpdatedAt, 480, food.id)}
                                  onError={(e) => handleFoodImageError(e, food.id, food.photoUrl)}
                                  alt={fLoc.name}
                                  loading="lazy"
                                  decoding="async"
                                  draggable={false}
                                  onContextMenu={(e) => e.preventDefault()}
                                  className="w-full h-full object-cover select-none group-hover:scale-105 transition-transform duration-500"
                                />
                              </span>
                              <span className="block px-2 py-1.5 text-xs font-extrabold leading-snug text-slate-900 dark:text-white line-clamp-2 min-h-[2.4rem] font-khmer">
                                {fLoc.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <p className="text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {tr(language, 'ទំព័រ', 'Page', '第')} {setPage + 1} / {setPageCount}
                  {language === 'zh' ? ' 页' : ''}
                </p>
              </div>
            )}

            {/* Interactive Side-by-Side Dish Comparison Panel */}
            {comparedDishIds.length > 0 && (
              <div
                id="kft-wte-compare-panel"
                ref={comparePanelRef}
                className="p-3 rounded-2xl bg-amber-50/90 dark:bg-slate-800/90 border border-amber-300 dark:border-amber-700/70 space-y-2.5 font-khmer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-extrabold text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
                      <span>
                        {tr(
                          language,
                          `ប្រៀបធៀបមុខម្ហូបដោយផ្ទាល់ (${comparedDishIds.length}/3)`,
                          `Side-by-Side Dish Comparison (${comparedDishIds.length}/3)`,
                          `菜品直观对比 (${comparedDishIds.length}/3)`
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-amber-800/95 dark:text-amber-200/90 leading-snug">
                      {tr(
                        language,
                        'បីរសជាតិ បីជម្រើស តើមួយណាជាចំណង់ថ្ងៃនេះ?',
                        'Three flavors, three choices — which one are you craving today?',
                        '三种风味，三种选择，今天最想吃哪一道？'
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComparedDishIds([])}
                    className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-amber-300 dark:border-slate-600 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:text-rose-600 cursor-pointer shrink-0"
                  >
                    {tr(language, 'សម្អាត', 'Clear', '清空')}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {comparedDishIds.map((cId) => {
                    const cDish = foods.find((f) => f.id === cId);
                    if (!cDish) return null;
                    const cLoc = getLocalizedFood(cDish, language);
                    const cTaste = describeDish(cDish, language);
                    const cIngs = (cDish.ingredients || [])
                      .slice(0, 3)
                      .map((ing, idx) =>
                        language === 'km'
                          ? ing.nameKh
                          : language === 'zh'
                            ? cLoc.ingredients?.[idx]?.name || ing.nameEn || ing.nameKh
                            : ing.nameEn || ing.nameKh
                      )
                      .join(', ');
                    return (
                      <div
                        key={cDish.id}
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 flex flex-col justify-between gap-1.5 text-[11px]"
                      >
                        <div className="space-y-1">
                          <div className="relative aspect-16/10 rounded-lg overflow-hidden bg-slate-200">
                            <img
                              src={resolveFoodPhotoUrl(cDish.photoUrl, cDish.photoUpdatedAt, 480, cDish.id)}
                              alt={cLoc.name}
                              onError={(e) => handleFoodImageError(e, cDish.id, cDish.photoUrl)}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => toggleCompareDish(cDish.id)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/65 text-white flex items-center justify-center text-[10px] cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{cLoc.name}</div>
                          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                            {cDish.rating} • {cLoc.cookTime} • {cDish.calories || 280} kcal
                          </div>
                          <div className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold line-clamp-2 leading-snug break-words">
                            {cTaste}
                          </div>
                          {cIngs && (
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2">
                              {cIngs}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFood(cDish);
                            setIsWhatToEatModalOpen(false);
                          }}
                          className="w-full py-1 px-2 rounded-lg bg-[#064E3B] text-white text-[10px] font-bold text-center cursor-pointer"
                        >
                          {tr(language, 'មើលរូបមន្តពេញ', 'Full Recipe', '完整食谱')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!showSets && !isMedicalRefusalActive && currentDish && currentLoc && !suppressBigCard && (
              <div
                className={`space-y-2.5 transition-all duration-300 ${
                  isSpinning ? 'opacity-30 scale-95' : 'opacity-100 scale-100'
                }`}
              >
                {/* AI Filter Match Summary Banner (Personalized Culinary Header - Clean, No Duplicate Compare Button) */}
                <div
                  id="kft-wte-ai-match-banner"
                  className="p-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300/70 dark:border-emerald-700/60 flex items-center justify-between gap-2 text-xs font-extrabold text-[#064E3B] dark:text-emerald-200 leading-relaxed font-khmer"
                >
                  <span>
                    {tr(
                      language,
                      `ការណែនាំមុខម្ហូបសម្រាប់ «${activeCriteriaLabel}»៖`,
                      `Dish picks for “${activeCriteriaLabel}”:`,
                      `为您精选的“${activeCriteriaLabel}”美食：`
                    )}
                  </span>
                </div>

                {/* Highlight Recommended Dish Card */}
                <div
                  data-testid="wte-picked-dish-card"
                  data-dish-id={currentDish.id}
                  className="relative rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-md"
                >
                  <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {isGeneratedDishId(currentDish.id) &&
                    !failedOnlineDishIds[currentDish.id] &&
                    !hasRenderablePhoto(currentDish.photoUrl) ? (
                      <div className="w-full h-full bg-gradient-to-br from-[#064E3B] via-[#047857] to-slate-900 flex flex-col items-center justify-center gap-2.5 text-emerald-100 p-6 text-center">
                        <ChefHat className="w-8 h-8 text-amber-300" />
                        <span className="text-xs font-bold font-khmer">
                          {tr(language, 'កំពុងរៀបចំរូបភាព...', 'Preparing photo...', '正在准备图片...')}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={foodPhotoSrc(currentDish)}
                        alt={currentLoc.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const imgEl = e.currentTarget as HTMLImageElement; if (imgEl.dataset.fb === (imgEl.getAttribute('src') || '')) return; imgEl.src = fallbackPhotoFor(currentDish.id); imgEl.dataset.fb = imgEl.getAttribute('src') || '';
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        loading="eager"
                        decoding="async"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                    {/* Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full bg-amber-400 text-stone-900 text-xs font-black shadow-xs flex items-center gap-1 font-khmer">
                        <Award className="w-3.5 h-3.5 text-amber-900" />
                        {tr(language, 'ម្ហូបណែនាំសម្រាប់អ្នក', 'Recommended Dish', '为您推荐')}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold">
                        {currentLoc.category}
                      </span>
                    </div>

                    {/* Khmer ownership watermark (applied once) */}
                    {!isUrlWatermarkedAtPixelLevel(currentDish.photoUrl) && (
                      <span className={FOOD_WATERMARK_BADGE_CLASS}>
                        {FOOD_WATERMARK_TEXT}
                      </span>
                    )}

                    {/* Title overlay */}
                    <div className="absolute bottom-3 left-3 right-24 text-white">
                      <h2
                        id="kft-wte-picked-dish-name"
                        className="font-moul text-base sm:text-lg text-white drop-shadow leading-snug"
                      >
                        {currentLoc.name}
                      </h2>
                    </div>
                  </div>

                  {/* Details info */}
                  <div className="p-4 space-y-3 font-khmer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                        {!isGeneratedDishId(currentDish.id) && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="font-bold">{currentDish.rating}</span>
                        </div>
                        )}
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
                      return (
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                          <div className="flex items-start gap-1.5">
                            <IconCravingSpark className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                            <span>{reason}</span>
                          </div>
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
                              className="w-full flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 hover:text-emerald-600 py-1 cursor-pointer"
                            >
                              <ShopAvatar
                                restaurant={r}
                                alt={rLoc.name}
                                className="w-7 h-7 rounded-lg"
                              />
                              <span className="font-bold truncate flex-1 text-left">{rLoc.name}</span>
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
                          priceDisplay: currentLoc.cookTime,
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
            {!showSets && !isMedicalRefusalActive && alternativeDishes.length > 0 && (
              <div className="space-y-2 font-khmer">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-emerald-600" />
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
                          src={resolveFoodPhotoUrl(d.photoUrl, d.photoUpdatedAt, 240, d.id)}
                          alt={dLoc.name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => handleFoodImageError(e, d.id, d.photoUrl)}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#0F172A] dark:text-white truncate">
                            {dLoc.name}
                          </div>
                          <div className="text-[11px] text-emerald-600 font-bold truncate">
                            {d.rating} • {dLoc.category}
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
            id="kft-wte-next-dish-btn"
            type="button"
            onClick={handleShowAnother}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-stone-900 font-black text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98] font-khmer cursor-pointer"
          >
            <Shuffle className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>
              {isSpinning
                ? tr(language, 'កំពុងជ្រើសរើសម្ហូបថ្មី...', 'Generating New Dish...', '正在为您更换新推荐...')
                : showSets
                  ? tr(language, 'បង្ហាញឈុតម្ហូបផ្សេងទៀត', 'Show More Sets', '查看更多套餐')
                  : tr(language, 'បង្ហាញម្ហូបផ្សេងទៀត', 'Recommend Another Dish', '换一道推荐菜品')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

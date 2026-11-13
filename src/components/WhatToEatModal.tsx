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
  ChevronRight,
  Plus,
  Check,
} from 'lucide-react';
import { FoodItem, isGpipRegisteredRestaurant, isHotelBusinessRecord, openExternalUrlNativeSafe, openRestaurantGoogleExternal, resolveFoodPhotoUrl, handleFoodImageError, isIosOrIpadAppStoreRuntime } from '../types';
import {
  buildAgentRoleChips,
  checkAndIncrementDailyTierAiQuota,
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
import { smoothScrollToElement } from '../utils/smoothScroll';
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

interface PersistedAiSessionState {
  messages: AiAssistantMessage[];
  memory: AiConversationMemory;
  lastInput: string;
}

const aiSessionByUserMap = new Map<string, PersistedAiSessionState>();

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
  const [backendVipVerified, setBackendVipVerified] = useState<boolean>(true);
  const [isVerifyingVipBackend, setIsVerifyingVipBackend] = useState<boolean>(false);
  const [showVipAiUpgradeNotice, setShowVipAiUpgradeNotice] = useState<boolean>(false);
  const userGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const canUseAiAssistant = true;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const userSessionKey = useMemo(
    () => String(currentUser?.id || currentUser?.email || currentUser?.username || 'guest'),
    [currentUser?.id, currentUser?.email, currentUser?.username]
  );

  // Filters: Conversational Input, Category, Meal Time, Dietary / Health Style
  const [cravingQuery, setCravingQuery] = useState<string>(() => aiSessionByUserMap.get(userSessionKey)?.lastInput || '');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [mealSlotFilter, setMealSlotFilter] = useState<MealSlotFilter>('auto');
  const [vipDietFilter, setVipDietFilter] = useState<VipDietFilter>('none');
  const [isSpinning, setIsSpinning] = useState(false);
  const cravingInputRef = useRef<HTMLInputElement | null>(null);
  const dishCardRef = useRef<HTMLDivElement | null>(null);
  const drinkPairingTopRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [openGroup, setOpenGroup] = useState<MenuGroupId | null>(null);
  const [drinkMode, setDrinkMode] = useState(false);
  const [drinkKind, setDrinkKind] = useState<DrinkKindFilter>('all');
  const [setPage, setSetPage] = useState(0);
  const [drinkShuffleSeed, setDrinkShuffleSeed] = useState<number>(() => Date.now());

  // Multi-turn Conversational AI State (preserved per user account session)
  const [chatMessages, setChatMessages] = useState<AiAssistantMessage[]>(
    () => aiSessionByUserMap.get(userSessionKey)?.messages || []
  );
  const [chatMemory, setChatMemory] = useState<AiConversationMemory>(
    () =>
      aiSessionByUserMap.get(userSessionKey)?.memory || {
        lastDishes: [],
        lastRestaurants: [],
        lastDestinations: [],
        activeProvinceKh: '',
        lastQuery: '',
        turnSeed: 1,
      }
  );

  const prevUserSessionKeyRef = useRef<string>(userSessionKey);
  useEffect(() => {
    if (prevUserSessionKeyRef.current !== userSessionKey) {
      prevUserSessionKeyRef.current = userSessionKey;
      const saved = aiSessionByUserMap.get(userSessionKey);
      if (saved && saved.messages.length > 0) {
        setChatMessages(saved.messages);
        setChatMemory(saved.memory);
        setCravingQuery(saved.lastInput || '');
      } else {
        const roleChips = buildAgentRoleChips(language, currentUser, restaurants);
        const ownerExtra = roleChips.filter((c) => c.id === 'agent_owner_assist');
        setChatMessages([
          buildWelcomeAssistantMessage(language, foods.length, restaurants.length, destinations.length, ownerExtra),
        ]);
        setChatMemory({
          lastDishes: [],
          lastRestaurants: [],
          lastDestinations: [],
          activeProvinceKh: '',
          lastQuery: '',
          turnSeed: 1,
        });
        setCravingQuery('');
      }
    }
  }, [userSessionKey, language, currentUser, restaurants, foods.length, destinations.length]);

  useEffect(() => {
    const settledMessages = chatMessages.filter((m) => !m.isPending);
    if (settledMessages.length > 0) {
      aiSessionByUserMap.set(userSessionKey, {
        messages: settledMessages,
        memory: chatMemory,
        lastInput: cravingQuery,
      });
    }
  }, [userSessionKey, chatMessages, chatMemory, cravingQuery]);

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

  // AI Assistant is publicly accessible to all users (Free, Guest, and VIP)
  useEffect(() => {
    setBackendVipVerified(true);
    setIsVerifyingVipBackend(false);
    setShowVipAiUpgradeNotice(false);
  }, [isWhatToEatModalOpen, currentUser]);

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
    if (isWhatToEatModalOpen && chatMessages.length === 0) {
      const roleChips = buildAgentRoleChips(language, currentUser, restaurants);
      const ownerExtra = roleChips.filter((c) => c.id === 'agent_owner_assist');
      setChatMessages([
        buildWelcomeAssistantMessage(language, foods.length, restaurants.length, destinations.length, ownerExtra),
      ]);
    }
  }, [isWhatToEatModalOpen, language, foods, restaurants.length, destinations.length, chatMessages.length, currentUser]);

  // Consume entry navigation flags exactly once when WhatToEatModal opens
  useEffect(() => {
    if (!isWhatToEatModalOpen) return;
    if ((window as any).__kft_wte_open_drink_pairing || (window as any).__kft_wte_open_compare_mode) {
      (window as any).__kft_wte_open_drink_pairing = false;
      (window as any).__kft_wte_open_compare_mode = false;
      setComparedDishIds([]);
      setDrinkMode(true);
      setCravingQuery('');
      setOpenGroup(null);
      setSetPage(0);
      setDrinkShuffleSeed(Date.now() + Math.floor(Math.random() * 100000));
      setTimeout(() => {
        if (scrollerRef.current) {
          scrollerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          drinkPairingTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    } else if ((window as any).__kft_wte_open_health) {
      (window as any).__kft_wte_open_health = false;
      setDrinkMode(false);
      setOpenGroup('health');
    } else {
      setDrinkMode(false);
      setOpenGroup(null);
    }
    if ((window as any).__kft_wte_open_camera) {
      (window as any).__kft_wte_open_camera = false;
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 120);
    }
    const pendingAiQuery = typeof window !== 'undefined' ? String((window as any).__kft_pending_ai_query || '').trim() : '';
    if (pendingAiQuery) {
      (window as any).__kft_pending_ai_query = '';
      setDrinkMode(false);
      setOpenGroup(null);
      setCravingQuery(pendingAiQuery);
      setTimeout(() => {
        sendConversationalMessageRef.current?.(pendingAiQuery);
      }, 60);
    }
  }, [isWhatToEatModalOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onAskAiEvent = (e: Event) => {
      const q = String((e as CustomEvent<{ query?: string }>).detail?.query || (window as any).__kft_pending_ai_query || '').trim();
      if (!q || !isWhatToEatModalOpen) return;
      (window as any).__kft_pending_ai_query = '';
      setDrinkMode(false);
      setOpenGroup(null);
      setCravingQuery(q);
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

  // Only show verified Cambodian catalog dishes in the recommendation grid (never synthesize fake cards from chat text like "Hello")
  const liveOutOfCatalogDish = null as FoodItem | null;

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
    () => (drinkMode ? rankDrinkPairingDishes(foods, drinkKind) : []),
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
  const showSets = drinkMode && pairingSets.length > 0;
  const setPageCount = Math.max(1, Math.ceil(pairingSets.length / PAIRING_SETS_PER_PAGE));
  const visibleSets = pairingSets.slice(setPage * PAIRING_SETS_PER_PAGE, (setPage + 1) * PAIRING_SETS_PER_PAGE);

  useEffect(() => {
    setSetPage(0);
    setDrinkShuffleSeed(Date.now() + Math.floor(Math.random() * 100000));
  }, [drinkMode, drinkKind, isWhatToEatModalOpen]);

  // Filter candidate dishes strictly across all 4 filter groups: Craving, Category, Mealtime, and Dietary/Health
  const matchingFoods = useMemo(() => {
    if (isMedicalRefusalActive) return [];
    if (drinkMode && pairingRanked.length > 0) {
      return pairingRanked.map((r) => r.food);
    }

    const qTrim = normalizeKhmerFoodText(cravingQuery);
    const parsedCraving = parseKhmerFoodSearchQuery(cravingQuery);
    let basePool: FoodItem[];

    if (qTrim) {
      const advisorAll = aiCravingRecommendations?.allMatchedDishes || [];
      if (advisorAll.length > 0) {
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

        const strictCravingPool = advisorAll.filter(filterByPresetCraving);
        basePool = strictCravingPool.length > 0 ? strictCravingPool : advisorAll;
      } else {
        // Conversational input (e.g. "Hello") did not match a specific food filter: keep the full verified catalog pool
        basePool = foods;
      }
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

  const [recommendationError, setRecommendationError] = useState<string>('');

  const scrollToResultsSection = () => {
    setTimeout(() => {
      if (!dishCardRef.current || !scrollerRef.current) return;
      const scrollerRect = scrollerRef.current.getBoundingClientRect();
      const cardRect = dishCardRef.current.getBoundingClientRect();
      // Only scroll if the dish card is below the visible area of the modal scroller
      if (cardRect.top > scrollerRect.bottom - 120) {
        dishCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 90);
  };

  // Top 4 Recommended Dishes per batch for the 2-column RESULTS section
  const recommendedTenDishes = useMemo<FoodItem[]>(() => {
    try {
      if (isMedicalRefusalActive) return [];
      const BATCH_SIZE = 4;
      const verifiedFoods = foods.filter((f) => !isGeneratedDishId(f.id));
      const rawSource = activeDishList.length > 0 ? activeDishList : verifiedFoods;
      const sourcePool = rawSource.filter((f) => !isGeneratedDishId(f.id));
      if (sourcePool.length === 0 && verifiedFoods.length === 0) return [];

      const effectivePool = sourcePool.length > 0 ? sourcePool : verifiedFoods;
      const result: FoodItem[] = [];
      const usedIds = new Set<string>();

      const offset = (spinCount * BATCH_SIZE) % effectivePool.length;
      const rotated = [
        ...effectivePool.slice(offset),
        ...effectivePool.slice(0, offset),
      ];
      for (const item of rotated) {
        if (result.length >= BATCH_SIZE) break;
        if (!usedIds.has(item.id)) {
          result.push(item);
          usedIds.add(item.id);
        }
      }

      // Ensure every batch consistently displays 4 verified Cambodian food cards when catalog has >= 4 items
      if (result.length < BATCH_SIZE && verifiedFoods.length > result.length) {
        const extraOffset = (spinCount * BATCH_SIZE) % verifiedFoods.length;
        const rotatedFallback = [
          ...verifiedFoods.slice(extraOffset),
          ...verifiedFoods.slice(0, extraOffset),
        ];
        for (const fb of rotatedFallback) {
          if (result.length >= BATCH_SIZE) break;
          if (!usedIds.has(fb.id)) {
            result.push(fb);
            usedIds.add(fb.id);
          }
        }
      }

      return result.slice(0, BATCH_SIZE);
    } catch {
      return [];
    }
  }, [activeDishList, foods, isMedicalRefusalActive, spinCount]);

  const alternativeDishes = useMemo(() => {
    if (isMedicalRefusalActive || recommendedTenDishes.length <= 1) return [];
    return recommendedTenDishes.slice(1, 10);
  }, [recommendedTenDishes, isMedicalRefusalActive]);

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
    // Public AI access for all users (Free, Guest, and VIP)
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
        isVipVerified: true,
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

    const quotaCheck = checkAndIncrementDailyTierAiQuota(currentUser);
    if (!quotaCheck.allowed) {
      const limitReply: AiAssistantMessage = {
        id: `quota-${Date.now()}`,
        role: 'assistant',
        text: quotaCheck.isFreeTrial
          ? tr(
              language,
              `⏳ អ្នកបានប្រើកូតា AI ប្រចាំថ្ងៃសម្រាប់សាកល្បងឥតគិតថ្លៃ ៧ ថ្ងៃអស់ហើយ (${quotaCheck.usedToday}/${quotaCheck.dailyLimit} ដងក្នុង ១ ថ្ងៃ)។ សូមដំឡើងទៅ VIP ពេញលេញ ដើម្បីទទួលបានរហូតដល់ 80 ដង/ថ្ងៃ និងមុខងារពិសេសទាំង ១០!`,
              `⏳ You have reached your 7-Day Free Trial daily AI limit (${quotaCheck.usedToday}/${quotaCheck.dailyLimit} requests/day). Upgrade to full VIP for up to 80 requests/day and all 10 VIP benefits!`,
              `⏳ 您今日的 7 天免费试用 AI 额度已用完（${quotaCheck.usedToday}/${quotaCheck.dailyLimit} 次/天）。升级完整 VIP 可享每日 80 次额度及全部 10 项特权！`
            )
          : tr(
              language,
              `⏳ អ្នកបានប្រើកូតា AI ប្រចាំថ្ងៃអស់ហើយ (${quotaCheck.usedToday}/${quotaCheck.dailyLimit} ដងក្នុង ១ ថ្ងៃ)។ សូមបើកសាកល្បងឥតគិតថ្លៃ ៧ ថ្ងៃ (15 ដង/ថ្ងៃ) ឬដំឡើង VIP (80 ដង/ថ្ងៃ)!`,
              `⏳ You have reached your daily AI limit (${quotaCheck.usedToday}/${quotaCheck.dailyLimit} requests/day). Start your 7-Day Free Trial (15/day) or upgrade to VIP (80/day)!`,
              `⏳ 您今日的 AI 提问额度已达上限（${quotaCheck.usedToday}/${quotaCheck.dailyLimit} 次/天）。开启 7 天免费试用（15 次/天）或升级 VIP（80 次/天）！`
            ),
        timestamp: new Date().toISOString(),
        intent: 'ai_agent_action',
        source: 'rules',
        suppressDishCard: true,
      };
      setChatMessages((prev) => [...prev.slice(-12), userMsg, limitReply]);
      setShowVipAiUpgradeNotice(true);
      scrollChatToTop();
      return;
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
    // Public AI photo recognition access for all users
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
    aiSessionByUserMap.delete(userSessionKey);
    setChatMessages([
      buildWelcomeAssistantMessage(language, foods.length, restaurants.length, destinations.length),
    ]);
  };

  const handleShowAnother = () => {
    // 100% FREE for all users: never gate Shuffle / Lucky Dish behind VIP or payment
    setShowVipAiUpgradeNotice(false);
    setRecommendationError('');
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
        if (scrollerRef.current) {
          scrollerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          drinkPairingTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
      return;
    }
    setIsSpinning(true);
    setTimeout(() => {
      let nextDish: FoodItem | undefined;
      try {
        nextDish = pickRandomDish(currentDish?.id);
        if (nextDish) setCurrentDishId(nextDish.id);
        setSpinCount((c) => c + 1);
      } catch {
        setRecommendationError(
          tr(
            language,
            'មានបញ្ហាក្នុងការជ្រើសរើសមុខម្ហូប។ សូមព្យាយាមម្ដងទៀត។',
            'Could not generate dish recommendations. Please try again.',
            '生成推荐菜品时出错，请重试。'
          )
        );
      }
      scrollToResultsSection();

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
    setComparedDishIds([]);
    setDrinkMode((v) => {
      const next = !v;
      if (next) {
        setSetPage(0);
        setDrinkShuffleSeed(Date.now() + Math.floor(Math.random() * 100000));
      }
      return next;
    });
    setCravingQuery('');
    setOpenGroup(null);
    setTimeout(() => {
      if (scrollerRef.current) {
        scrollerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        drinkPairingTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
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
  const hasMatchedCravingQuery = Boolean(
    cravingQuery.trim() && (aiCravingRecommendations?.totalMatchedCount || 0) > 0
  );
  const activeFilterParts: string[] = [];
  if (mealSlotFilter !== 'auto' && activeSlot) {
    activeFilterParts.push(stripLeadingSymbols(tr(language, activeSlot.kh, activeSlot.en, activeSlot.zh)));
  }
  if (categoryFilter !== 'all' && activeCategory) {
    activeFilterParts.push(tr(language, activeCategory.labelKh, activeCategory.labelEn, activeCategory.labelZh));
  }
  if (hasMatchedCravingQuery) {
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
      className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center bg-black/70 backdrop-blur-xs p-0 md:p-4 animate-in fade-in duration-200 overscroll-none"
      onClick={() => setIsWhatToEatModalOpen(false)}
    >
      <div
        className="w-full max-w-full md:max-w-2xl lg:max-w-3xl bg-[#1E293B] rounded-none md:rounded-3xl border-0 md:border border-slate-700/80 shadow-2xl h-full md:h-[92dvh] max-h-full md:max-h-[92dvh] flex flex-col overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{ paddingTop: 'max(var(--kft-safe-top, 0px), 0.75rem)' }}
          className="kft-khmer-modal-header px-4 sm:px-5 pb-3.5 text-white flex items-center justify-between gap-2.5 shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
            <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 shrink-0">
              <IconFoodPicks className="w-5 h-5" />
            </span>
            <h3 className="font-moul text-xs sm:text-sm text-white leading-[1.7] py-0.5 break-words">
              {tr(language, 'ជំនួយការ AI ម្ហូបអាហារ', 'AI Food Assistant', 'AI 美食助手')}
            </h3>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-[10px] font-extrabold shrink-0"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-300" strokeWidth={1.75} />
              <span>{tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费')}</span>
            </span>
          </div>
          <button
            id="kft-wte-close-btn"
            onClick={() => setIsWhatToEatModalOpen(false)}
            aria-label={tr(language, 'បិទ', 'Close', '关闭')}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-100 hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        <div
          ref={scrollerRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar [-webkit-overflow-scrolling:touch] bg-[#1E293B] flex flex-col"
        >
          {/* Conversational AI Search / Chat Input Bar */}
          <div className="px-3.5 pt-3 pb-0 bg-[#1E293B] space-y-2.5 font-khmer">
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
                className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200:bg-amber-900/60 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-5 h-5" />
              </button>
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                id="kft-wte-chat-send"
                type="submit"
                className="px-3.5 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-sm font-extrabold shadow-xs flex items-center gap-1.5 shrink-0 transition active:scale-[0.98] cursor-pointer"
              >
                <Send className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{tr(language, 'សួរ AI', 'Ask AI', '发送')}</span>
              </button>
            </form>

            {(pendingImage || isPreparingImage || imageError) && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200">
                {pendingImage && (
                  <>
                    <img loading="lazy" decoding="async" src={pendingImage.previewDataUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-amber-300 shrink-0" />
                    <span className="text-[11px] font-bold text-amber-900 flex-1 min-w-0">
                      {tr(language, 'រូបភាពរួចរាល់ — វាយសំណួរបន្ថែម (ជាជម្រើស) រួចចុច «សួរ AI»', 'Photo ready — add a question (optional), then tap “Ask AI”', '照片已就绪 —（可选）补充问题后点击“发送”')}
                    </span>
                    <button type="button" onClick={() => setPendingImage(null)} aria-label="Remove photo" className="p-1 rounded-full text-slate-500 hover:text-rose-600 cursor-pointer shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                {isPreparingImage && (
                  <span className="text-[11px] font-bold text-amber-900">
                    {tr(language, 'កំពុងរៀបចំរូបភាព...', 'Preparing photo...', '正在处理照片...')}
                  </span>
                )}
                {imageError && <span className="text-[11px] font-bold text-rose-600 flex-1">{imageError}</span>}
              </div>
            )}

            {showVipAiUpgradeNotice && !canUseAiAssistant && !isVerifyingVipBackend && (
              <div
                id="kft-wte-vip-upgrade-notice"
                className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Crown className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={1.75} />
                  <span className="text-xs font-extrabold text-amber-950 leading-snug">
                    {tr(
                      language,
                      'មុខងារជំនួយការ AI គឺសម្រាប់សមាជិក VIP ប៉ុណ្ណោះ',
                      'AI Assistant is exclusive to VIP Members',
                      'AI 美食助手为 VIP 会员专属功能'
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openUpgradeVipModal()}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 text-[11px] font-black shrink-0 cursor-pointer transition active:scale-95"
                >
                  {tr(language, 'ដំឡើង VIP', 'Upgrade VIP', '升级 VIP')}
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
                          <img loading="lazy" decoding="async" src={msg.imagePreviewUrl} alt="" className="w-40 max-w-full rounded-xl border border-white/30 object-cover" />
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
                          ? 'bg-amber-50/90 border-amber-300 text-slate-800 font-semibold'
                          : msg.needsClarification
                            ? 'bg-sky-50/90 border-sky-300 text-slate-800'
                            : 'bg-white border-emerald-200/80 text-slate-800'
                      }`}
                    >
                      {msg.isPending && !msg.text ? (
                        <div className="flex items-center gap-2 text-emerald-700 font-bold">
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
                          className="mt-2.5 p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-300 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] font-extrabold text-[#064E3B]">
                              {tr(language, 'បញ្ចូលសោ Gemini API Key ទីនេះ៖', 'Paste Gemini API Key here:', '在此粘贴 Gemini API Key：')}
                            </span>
                            <a
                              href="https://aistudio.google.com/app/apikey"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-emerald-300 text-[10px] font-extrabold text-emerald-700 hover:bg-emerald-100 transition"
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
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-emerald-400 bg-white text-slate-900 font-mono text-xs"
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
                        <div data-testid="ai-image-no-food" className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-900">
                          {tr(language, 'ខ្ញុំមិនឃើញម្ហូបអាហារនៅក្នុងរូបភាពនេះទេ។ សូមថតរូបម្ហូបឱ្យច្បាស់ជាងនេះ។', 'I can’t see any food in this photo. Please send a clearer picture of the dish.', '这张照片里我没有看到食物，请拍一张更清晰的菜品照片。')}
                        </div>
                      )}

                      {msg.imageAnalysis && msg.imageAnalysis.containsFood && (
                        <div data-testid="ai-image-analysis" className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-extrabold text-[#064E3B]">
                              {tr(language, 'ម្ហូបក្នុងរូបភាព', 'Dish in photo', '照片中的菜品')}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                msg.imageAnalysis.identified
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {msg.imageAnalysis.identified
                                ? `✓ ${tr(language, 'ស្គាល់ហើយ', 'Recognized', '已识别')}`
                                : tr(language, 'មិនទាន់ប្រាកដ', 'Not sure yet', '尚不确定')}
                            </span>
                          </div>
                          {msg.imageAnalysis.dishName && (
                            <div className="text-xs font-extrabold text-slate-900">
                              {msg.imageAnalysis.dishName}
                              {msg.imageAnalysis.dishNameEn ? ` (${msg.imageAnalysis.dishNameEn})` : ''}
                            </div>
                          )}
                          {msg.imageAnalysis.evidence && (
                            <p className="text-[11px] text-slate-600 leading-snug">{msg.imageAnalysis.evidence}</p>
                          )}
                          {msg.imageAnalysis.visibleIngredients.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {msg.imageAnalysis.visibleIngredients.map((ing, k) => (
                                <span key={k} className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-700">
                                  {ing}
                                </span>
                              ))}
                            </div>
                          )}
                          {msg.imageAnalysis.cookingMethod && (
                            <div className="text-[11px] text-slate-600">{msg.imageAnalysis.cookingMethod}</div>
                          )}
                        </div>
                      )}

                      {msg.vegetarianNote && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-950 leading-relaxed">
                          {msg.vegetarianNote}
                        </div>
                      )}

                      {msg.dishes && msg.dishes.length > 0 && !msg.recipePreview && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] font-extrabold text-[#064E3B] flex items-center gap-1">
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
                                className="px-2 py-0.5 rounded-lg bg-amber-100 border border-amber-300 text-[10px] font-extrabold text-amber-900 hover:bg-amber-200 transition cursor-pointer"
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
                                  className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2"
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
                                      className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-200 border border-slate-200"
                                    />
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-extrabold text-slate-900 truncate">
                                          {dLoc.name}
                                        </span>
                                        {!isGeneratedDishId(dish.id) && (
                                        <span className="text-[10px] font-bold text-amber-600 shrink-0">
                                          {dish.rating}
                                        </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] font-bold text-emerald-700">
                                        {isGeneratedDishId(dish.id) ? dLoc.category : `${dLoc.category} • ${dLoc.cookTime} • ${dish.calories || 280} kcal`}
                                      </div>
                                      {!isGeneratedDishId(dish.id) && (
                                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900 text-[10px] font-bold">
                                        <span>{tr(language, 'រសជាតិ៖', 'Taste:', '风味：')} {tasteProfile}</span>
                                      </div>
                                      )}
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                                    {dLoc.description}
                                  </p>

                                  {topIngs.length > 0 && (
                                    <div className="text-[10px] text-slate-700 bg-white px-2 py-1.5 rounded-lg border border-slate-200/60">
                                      <span className="font-extrabold text-[#064E3B]">
                                        {tr(language, 'គ្រឿងផ្សំ៖ ', 'Ingredients: ', '主要食材：')}
                                      </span>
                                      <span>{topIngs.join(' • ')}</span>
                                    </div>
                                  )}

                                  {methodSummary && (
                                    <div className="text-[10px] text-slate-700 bg-white px-2 py-1.5 rounded-lg border border-slate-200/60 line-clamp-2">
                                      <span className="font-extrabold text-[#064E3B]">
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
                                          : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500'
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
                          <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-2.5">
                            {rpFood && rpLoc && (
                              <div
                                data-testid={`ai-chat-recipe-hero-${rpFood.id}`}
                                className="rounded-2xl overflow-hidden bg-slate-50 border border-emerald-200/80 shadow-xs"
                              >
                                <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-200">
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
                                    <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold">
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
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/85 text-amber-900 text-[10px] font-bold">
                                      <span>{tr(language, 'រសជាតិ៖', 'Taste:', '风味：')} {rpTaste}</span>
                                    </div>
                                  )}
                                  <p className="text-[11px] text-slate-600 leading-snug">
                                    {rpLoc.description}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="font-extrabold text-[#064E3B] flex items-center gap-1">
                              <ChefHat className="w-3.5 h-3.5 shrink-0" />
                              <span>{tr(language, 'គ្រឿងផ្សំសំខាន់ៗ៖', 'Key Ingredients:', '主要食材：')}</span>
                            </div>
                            <ul className="grid grid-cols-1 gap-1 text-[11px] text-slate-700">
                              {msg.recipePreview.ingredients.map((ing, idx) => (
                                <li key={idx} className="flex items-center justify-between gap-2 bg-slate-50 px-2 py-1 rounded-lg">
                                  <span className="font-bold">• {ing.name}</span>
                                  <span className="text-emerald-700 font-semibold shrink-0">{ing.amount}</span>
                                </li>
                              ))}
                            </ul>

                            <div className="font-extrabold text-[#064E3B] pt-1">
                              {tr(language, 'របៀបធ្វើ៖', 'Cooking Steps:', '制作步骤：')}
                            </div>
                            <ol className="space-y-1 text-[11px] text-slate-700">
                              {msg.recipePreview.steps.map((st) => (
                                <li key={st.stepNumber} className="leading-snug">
                                  <span className="font-black text-emerald-700 mr-1">{st.stepNumber}.</span>
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
                          <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-1.5">
                            <div className="text-[11px] font-extrabold text-[#064E3B] flex items-center gap-1">
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
                                    className="p-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 flex items-center gap-2 text-left transition cursor-pointer"
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
                                      <div className="text-[11px] font-bold text-slate-900 truncate">
                                        {sLoc.name}
                                      </div>
                                      <div className="text-[9px] text-emerald-700 font-semibold truncate">
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
                        <div className="mt-2.5 pt-2 border-t border-emerald-200/70 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-[#064E3B] text-[10px] font-extrabold">
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
                              <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-2.5">
                                <div className="text-xs font-extrabold text-amber-900 flex items-center justify-between gap-2">
                                  <span>
                                    {tr(
                                      language,
                                      `🛡️ បញ្ជាក់ការកែប្រែ៖ ${upd.businessNameKh}`,
                                      `🛡️ Confirm Profile Update: ${upd.businessNameEn}`,
                                      `🛡️ 确认更新商户资料：${upd.businessNameEn}`
                                    )}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-[10px]">
                                    {upd.isHotel ? '🏨 Hotel' : '🏪 Shop'}
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {upd.changes.map((ch) => (
                                    <div
                                      key={ch.field}
                                      className="p-2 rounded-xl bg-white border border-amber-200/80 text-[11px] space-y-0.5"
                                    >
                                      <div className="font-extrabold text-slate-700">
                                        {language === 'km' ? ch.labelKh : ch.labelEn}
                                      </div>
                                      <div className="text-slate-400 line-through truncate">{ch.oldValue}</div>
                                      <div className="text-emerald-700 font-bold break-words">
                                        → {ch.newValue}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {status === 'confirmed' ? (
                                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-between gap-2">
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
                                  <div className="p-2 rounded-xl bg-slate-200/70 text-slate-600 text-xs font-bold">
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
                                      className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300:bg-slate-600 text-slate-800 text-xs font-bold cursor-pointer transition"
                                    >
                                      {tr(language, '❌ បោះបង់', '❌ Cancel', '❌ 取消')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsWhatToEatModalOpen(false);
                                        openManageMyVipStore(upd.businessId, 'info');
                                      }}
                                      className="py-2 px-2.5 rounded-xl border border-amber-400 text-amber-900 text-[11px] font-bold cursor-pointer"
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
                              <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-extrabold text-[#064E3B]">
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
                                      className="p-2 rounded-xl bg-white border border-emerald-100 space-y-1"
                                    >
                                      <div className="text-[11px] font-extrabold text-emerald-800 flex items-center justify-between">
                                        <span>{language === 'km' ? day.titleKh : day.titleEn}</span>
                                        <span className="text-[10px] text-slate-500">~${day.dayEstimatedCostUsd}</span>
                                      </div>
                                      {day.activities.map((act, idx) => (
                                        <div key={idx} className="text-[11px] text-slate-700 leading-snug">
                                          <span className="font-bold text-amber-700">
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
                                    className="py-2 px-3 rounded-xl bg-white border border-emerald-400 text-[#064E3B] text-xs font-extrabold cursor-pointer"
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
                              <div className="text-[11px] font-extrabold text-[#064E3B]">
                                {tr(language, '🏨 សណ្ឋាគារ និងរីសតណែនាំ៖', '🏨 Verified Hotels & Resorts:', '🏨 推荐核实酒店与度假村：')}
                              </div>
                              {msg.agentResult.hotels.map((h) => {
                                const saved = isItemInWishlist(h.id);
                                return (
                                  <div
                                    key={h.id}
                                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2"
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
                                      <img decoding="async"
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
                                        <div className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1">
                                          <span className="truncate">{language === 'km' ? h.nameKh : h.nameEn}</span>
                                          {h.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                        </div>
                                        <div className="text-[10px] text-emerald-700 font-bold truncate">
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
                                          : 'bg-white border-slate-200 text-slate-500'
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
                              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-xs font-extrabold text-slate-900">
                                    {language === 'km' ? n.dishNameKh : n.dishNameEn}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-white border border-emerald-300 text-[10px] font-extrabold text-emerald-800">
                                    {n.healthBadgeLabel}
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5 text-center">
                                  <div className="p-2 rounded-xl bg-white border border-emerald-200/70">
                                    <div className="text-xs font-black text-amber-600">{n.caloriesKcal}</div>
                                    <div className="text-[9px] font-bold text-slate-500">kcal</div>
                                  </div>
                                  <div className="p-2 rounded-xl bg-white border border-emerald-200/70">
                                    <div className="text-xs font-black text-emerald-600">{n.proteinGrams}g</div>
                                    <div className="text-[9px] font-bold text-slate-500">
                                      {tr(language, 'ប្រូតេអ៊ីន', 'Protein', '蛋白质')}
                                    </div>
                                  </div>
                                  <div className="p-2 rounded-xl bg-white border border-emerald-200/70">
                                    <div className="text-xs font-black text-sky-600">{n.carbsGrams}g</div>
                                    <div className="text-[9px] font-bold text-slate-500">
                                      {tr(language, 'កាបូអ៊ីដ្រាត', 'Carbs', '碳水')}
                                    </div>
                                  </div>
                                  <div className="p-2 rounded-xl bg-white border border-emerald-200/70">
                                    <div className="text-xs font-black text-rose-500">{n.fatGrams}g</div>
                                    <div className="text-[9px] font-bold text-slate-500">
                                      {tr(language, 'ខ្លាញ់', 'Fat', '脂肪')}
                                    </div>
                                  </div>
                                </div>
                                {n.keyIngredients.length > 0 && (
                                  <div className="text-[10px] text-slate-600">
                                    <span className="font-bold">
                                      {tr(language, 'គ្រឿងផ្សំសំខាន់ៗ៖ ', 'Key ingredients: ', '主要食材：')}
                                    </span>
                                    {n.keyIngredients.join(' • ')}
                                  </div>
                                )}
                                <p className="text-[11px] text-slate-600 leading-relaxed">
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
                                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5"
                                >
                                  <img decoding="async"
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
                                    <div className="text-xs font-extrabold text-slate-900 truncate">
                                      {language === 'km' ? item.foodNameKh : item.foodNameEn}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">
                                      {language === 'km' ? item.restaurantNameKh : item.restaurantNameEn} • {language === 'km' ? item.provinceKh : item.provinceEn}
                                    </div>
                                    {item.socialViews && (
                                      <div className="text-[9px] font-extrabold text-rose-600">
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
                                className="w-full py-1.5 px-3 rounded-xl border border-rose-300 text-rose-700 text-[11px] font-extrabold cursor-pointer"
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
                        <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-1.5">
                          <div className="text-[11px] font-extrabold text-[#064E3B] flex items-center gap-1">
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
                                  className="w-full p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 hover:border-emerald-500 flex items-center gap-2.5 text-left transition cursor-pointer"
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
                                    <div className="text-xs font-extrabold text-slate-900 truncate">{dLoc.name}</div>
                                    <div className="text-[10px] text-emerald-700 font-bold truncate">
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
                        <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-1.5">
                          <div className="text-[11px] font-extrabold text-[#064E3B] flex items-center gap-1">
                            <Store className="w-3.5 h-3.5 shrink-0" />
                            <span>{tr(language, 'ភោជនីយដ្ឋានណែនាំ និងទីតាំង៖', 'Recommended Restaurants & Locations:', '推荐餐厅与位置导航：')}</span>
                          </div>
                          <div className="space-y-1.5">
                            {msg.restaurants.map((r) => {
                              const rLoc = getLocalizedRestaurant(r, language);
                              return (
                                <div
                                  key={r.id}
                                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2"
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
                                      <div className="text-xs font-bold text-slate-900 truncate">{rLoc.name}</div>
                                      <div className="text-[10px] text-slate-500 truncate">
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
                        <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-2">
                          <p className="text-[11px] text-slate-600 leading-relaxed">
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
                                if (chip.id === 'craving_sour_spicy') {
                                  setShowVipAiUpgradeNotice(false);
                                  setCravingQuery(language === 'km' ? 'ជូរហឹរ' : language === 'zh' ? '酸辣' : 'spicy sour');
                                  setCategoryFilter('all');
                                  setDrinkMode(false);
                                  setSpinCount((c) => c + 1);
                                  scrollToResultsSection();
                                  return;
                                }
                                promptVipUpgradeForAiAssistant();
                                return;
                              }
                              setCravingQuery(chip.query);
                              sendConversationalMessage(chip.query);
                            }}
                            className="px-2.5 py-1 rounded-full bg-white border border-emerald-300/80 text-[11px] font-bold text-[#064E3B] hover:bg-emerald-50 transition cursor-pointer active:scale-95"
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
                return null;
              }

              return (
                <div
                  id="kft-wte-chat-thread"
                  ref={chatEndRef}
                  className="rounded-2xl bg-slate-50 border border-emerald-200/80 p-3 space-y-2.5 font-khmer"
                >
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleResetChat}
                      className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600 inline-flex items-center gap-1 hover:text-emerald-600 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
                      <span>{tr(language, 'សម្អាតចម្លើយ', 'Clear', '清空')}</span>
                    </button>
                  </div>

                  {/* Latest Q&A turn appears directly below AI input bar (no nested scrollbar) */}
                  <div className="space-y-2.5">
                    {latestTurn.map((msg) => renderMessageNode(msg))}
                  </div>

                  {earlierTurns.length > 0 && (
                    <details className="pt-1.5 border-t border-slate-200/70">
                      <summary className="text-[11px] font-bold text-slate-500 cursor-pointer select-none">
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

            {/* 6 Premium 3D Gold-Framed Category Buttons (Time, Category, Taste, Healthy, Beverage Pairings, New Picks) */}
            <div
              className="w-full max-w-full min-w-0 overflow-hidden rounded-[24px] p-2 min-[360px]:p-2.5 sm:p-3.5 border border-amber-400/25 space-y-2.5"
              style={{
                background:
                  'linear-gradient(180deg, rgba(15, 23, 42, 0.84) 0%, rgba(15, 23, 42, 0.94) 100%)',
                boxShadow:
                  '0 8px 24px rgba(2, 6, 23, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              }}
            >
              <div className="kft-cat-grid grid grid-cols-3 gap-x-1.5 min-[360px]:gap-x-2 sm:gap-x-3 gap-y-2 min-[360px]:gap-y-2.5 sm:gap-y-3 items-start">
                {[
                  {
                    id: 'time' as const,
                    testId: 'wte-tab-time',
                    imageSrc: '/categories/ai_cat_time.png',
                    label: tr(language, 'ពេលវេលា', 'Time', '时段'),
                    value:
                      mealSlotFilter !== 'auto' && activeSlot
                        ? stripLeadingSymbols(tr(language, activeSlot.kh, activeSlot.en, activeSlot.zh))
                        : '',
                    active: mealSlotFilter !== 'auto',
                    vip: false,
                  },
                  {
                    id: 'type' as const,
                    testId: 'wte-tab-type',
                    imageSrc: '/categories/ai_cat_category.png',
                    label: tr(language, 'ប្រភេទម្ហូប', 'Category', '菜品分类'),
                    value:
                      categoryFilter !== 'all' && activeCategory
                        ? tr(language, activeCategory.labelKh, activeCategory.labelEn, activeCategory.labelZh)
                        : '',
                    active: categoryFilter !== 'all',
                    vip: false,
                  },
                  {
                    id: 'craving' as const,
                    testId: 'wte-tab-craving',
                    imageSrc: '/categories/ai_cat_taste.png',
                    label: tr(language, 'ចំណង់រសជាតិ', 'Taste', '口味偏好'),
                    value: QUICK_CRAVING_CHIPS.some((c) => c.queryKh === cravingQuery.trim() || c.queryEn.toLowerCase() === cravingQuery.trim().toLowerCase() || c.queryZh === cravingQuery.trim()) ? cravingQuery.trim() : '',
                    active: hasMatchedCravingQuery,
                    vip: false,
                  },
                  {
                    id: 'health' as const,
                    testId: 'wte-tab-health',
                    imageSrc: '/categories/ai_cat_healthy.png',
                    label: tr(language, 'ម្ហូបសុខភាព', 'Healthy', '健康饮食'),
                    value:
                      vipDietFilter !== 'none' && activeHealth
                        ? tr(language, activeHealth.shortKh, activeHealth.shortEn, activeHealth.shortZh)
                        : '',
                    active: vipDietFilter !== 'none',
                    vip: true,
                  },
                ].map((g) => {
                  const isOpen = openGroup === g.id;
                  const isHighlighted = isOpen || g.active;
                  const displayText = g.value || g.label;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      data-testid={g.testId}
                      aria-pressed={isHighlighted}
                      onClick={() => {
                        setShowVipAiUpgradeNotice(false);
                        setDrinkMode(false);
                        setOpenGroup((cur) => (cur === g.id ? null : g.id));
                      }}
                      className="kft-cat-btn group relative w-full max-w-full min-w-0 overflow-visible bg-transparent border-0 p-0 transition-all duration-200 active:scale-95 cursor-pointer select-none flex flex-col items-center justify-start gap-1"
                    >
                      {/* 3D Gold-Framed Pill Illustration */}
                      <div
                        className={`kft-cat-img-wrap relative w-full max-w-full min-w-0 min-h-0 aspect-[2.12/1] overflow-visible transition-all duration-200 rounded-[14px] ${
                          isHighlighted ? 'z-10' : 'opacity-95 group-hover:opacity-100'
                        }`}
                      >
                        <img
                          src={g.imageSrc}
                          alt={displayText}
                          decoding="async"
                          style={{
                            transform: 'none',
                          }}
                          className="block w-full h-full max-w-full min-w-0 min-h-0 object-contain bg-transparent select-none pointer-events-none group-hover:brightness-[1.04] transition-all duration-150"
                        />

                        {g.vip && !canUseVip && (
                          <Crown className="absolute top-1 right-1.5 z-10 w-3.5 h-3.5 text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] pointer-events-none" strokeWidth={2.2} />
                        )}

                        {isHighlighted && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                          />
                        )}
                      </div>

                      {/* Clear White Text Title Below Button */}
                      <span className={`kft-cat-label ${isHighlighted ? 'kft-cat-label-active' : ''}`}>
                        {displayText}
                      </span>
                    </button>
                  );
                })}

                {/* 5th Premium 3D Button: Beverage Pairings */}
                {(() => {
                  const drinkLabel = tr(language, 'ម្ហូបអមភេសជ្ជៈ', 'Beverage Pairings', '佳肴配饮');
                  return (
                    <button
                      type="button"
                      aria-pressed={drinkMode}
                      onClick={handleOpenDrinkPairing}
                      className="kft-cat-btn group relative w-full max-w-full min-w-0 overflow-visible bg-transparent border-0 p-0 transition-all duration-200 active:scale-95 cursor-pointer select-none flex flex-col items-center justify-start gap-1"
                    >
                      <div
                        className={`kft-cat-img-wrap relative w-full max-w-full min-w-0 min-h-0 aspect-[2.12/1] overflow-visible transition-all duration-200 rounded-[14px] ${
                          drinkMode ? 'scale-[1.03] z-10' : 'opacity-95 group-hover:opacity-100'
                        }`}
                      >
                        <img
                          src="/categories/ai_cat_drinks.png"
                          alt={drinkLabel}
                          decoding="async"
                          style={{
                            transform: 'none',
                          }}
                          className="block w-full h-full max-w-full min-w-0 min-h-0 object-contain bg-transparent select-none pointer-events-none group-hover:brightness-[1.04] transition-all duration-150"
                        />

                        {drinkMode && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                          />
                        )}
                      </div>

                      <span className={`kft-cat-label ${drinkMode ? 'kft-cat-label-active' : ''}`}>
                        {drinkLabel}
                      </span>
                    </button>
                  );
                })()}

                {/* 6th Premium 3D Button: New Picks / Shuffle */}
                {(() => {
                  const newPicksLabel = tr(language, 'ប្តូរមុខម្ហូបថ្មី', 'New Picks', '换一批推荐');
                  return (
                    <button
                      type="button"
                      onClick={handleShowAnother}
                      className="kft-cat-btn group relative w-full max-w-full min-w-0 overflow-visible bg-transparent border-0 p-0 transition-all duration-200 active:scale-95 cursor-pointer select-none flex flex-col items-center justify-start gap-1"
                    >
                      <div className="kft-cat-img-wrap relative w-full max-w-full min-w-0 min-h-0 aspect-[2.12/1] overflow-visible transition-all duration-200 rounded-[14px] opacity-95 group-hover:opacity-100">
                        <img
                          src="/categories/ai_cat_new_picks.png"
                          alt={newPicksLabel}
                          decoding="async"
                          style={{
                            transform: 'none',
                          }}
                          className={`block w-full h-full max-w-full min-w-0 min-h-0 object-contain bg-transparent select-none pointer-events-none group-hover:brightness-[1.04] transition-all duration-200 ${
                            isSpinning ? 'brightness-110 scale-[0.98]' : ''
                          }`}
                        />
                      </div>

                      <span className="kft-cat-label">
                        {newPicksLabel}
                      </span>
                    </button>
                  );
                })()}
              </div>

              {(mealSlotFilter !== 'auto' || categoryFilter !== 'all' || cravingQuery.trim() || vipDietFilter !== 'none') && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVipAiUpgradeNotice(false);
                      setRecommendationError('');
                      setMealSlotFilter('auto');
                      setCategoryFilter('all');
                      setCravingQuery('');
                      setVipDietFilter('none');
                      setDrinkMode(false);
                      setOpenGroup(null);
                      setSpinCount((c) => c + 1);
                      scrollToResultsSection();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-bold text-white inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-300" strokeWidth={1.75} />
                    <span>{tr(language, 'កំណត់ឡើងវិញ', 'Reset', '重置')}</span>
                  </button>
                </div>
              )}

              {/* Expanded options panel */}
              {openGroup && (
                <div className="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                  <div className="flex flex-wrap gap-1.5">
                    {openGroup === 'time' &&
                      MEAL_SLOTS.map((slot) => {
                        const SlotIcon = slot.icon;
                        const isSelected = mealSlotFilter === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            data-testid={`wte-time-${slot.id}`}
                            onClick={() => {
                              setShowVipAiUpgradeNotice(false);
                              setRecommendationError('');
                              setMealSlotFilter(slot.id);
                              setDrinkMode(false);
                              setSpinCount((c) => c + 1);
                              setOpenGroup(null);
                              scrollToResultsSection();
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#064E3B] text-white border border-[#064E3B] shadow-2xs'
                                : 'bg-white text-slate-800 border border-slate-200 hover:border-emerald-500'
                            }`}
                          >
                            <SlotIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{tr(language, slot.kh, slot.en, slot.zh)}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={1.75} />}
                          </button>
                        );
                      })}

                    {openGroup === 'type' &&
                      CATEGORY_OPTIONS.map((c) => {
                        const isSelected = categoryFilter === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            data-testid={`wte-type-${c.id}`}
                            onClick={() => {
                              setShowVipAiUpgradeNotice(false);
                              setRecommendationError('');
                              setCategoryFilter(c.id);
                              setDrinkMode(false);
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
                              setSpinCount((cnt) => cnt + 1);
                              setOpenGroup(null);
                              scrollToResultsSection();
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#064E3B] text-white border border-[#064E3B] shadow-2xs'
                                : 'bg-white text-slate-800 border border-slate-200 hover:border-emerald-500'
                            }`}
                          >
                            <span>{tr(language, c.labelKh, c.labelEn, c.labelZh)}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={1.75} />}
                          </button>
                        );
                      })}

                    {openGroup === 'craving' && (
                      <>
                        <button
                          type="button"
                          data-testid="wte-craving-all"
                          onClick={() => {
                            setShowVipAiUpgradeNotice(false);
                            setRecommendationError('');
                            setCravingQuery('');
                            setDrinkMode(false);
                            setSpinCount((cnt) => cnt + 1);
                            setOpenGroup(null);
                            scrollToResultsSection();
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 transition cursor-pointer ${
                            !cravingQuery.trim()
                              ? 'bg-[#064E3B] text-white border border-[#064E3B] shadow-2xs'
                              : 'bg-white text-slate-800 border border-slate-200 hover:border-emerald-500'
                          }`}
                        >
                          <span>{tr(language, 'គ្រប់រសជាតិ (ទាំងអស់)', 'All Preferences', '全部口味')}</span>
                          {!cravingQuery.trim() && <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={1.75} />}
                        </button>
                        {QUICK_CRAVING_CHIPS.filter((chip) => chip.id !== 'drink-pairing').map((chip) => {
                          const chipQuery = language === 'km' ? chip.queryKh : language === 'zh' ? chip.queryZh : chip.queryEn;
                          const isChipActive = normalizeKhmerFoodText(cravingQuery) === normalizeKhmerFoodText(chipQuery);
                          return (
                            <button
                              key={chip.id}
                              type="button"
                              data-testid={`wte-craving-${chip.id}`}
                              onClick={() => {
                                // 100% FREE for all users — never prompt for VIP!
                                setShowVipAiUpgradeNotice(false);
                                setRecommendationError('');
                                setCravingQuery(chipQuery);
                                setDrinkMode(false);
                                setCategoryFilter('all');
                                if (chatMessages.length > 1) {
                                  setChatMessages([
                                    buildWelcomeAssistantMessage(language, foods.length, restaurants.length, destinations.length),
                                  ]);
                                }
                                setSpinCount((cnt) => cnt + 1);
                                setOpenGroup(null);
                                scrollToResultsSection();
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 transition cursor-pointer ${
                                isChipActive
                                  ? 'bg-[#064E3B] text-white border border-[#064E3B] shadow-2xs'
                                  : 'bg-white text-slate-800 border border-slate-200 hover:border-emerald-500'
                              }`}
                            >
                              <span>{stripLeadingSymbols(tr(language, chip.labelKh, chip.labelEn, chip.labelZh))}</span>
                              {isChipActive && <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={1.75} />}
                            </button>
                          );
                        })}
                      </>
                    )}

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
                              if (opt.vip && !canUseVip) {
                                promptVipUpgradeForAiAssistant();
                                return;
                              }
                              setVipDietFilter(opt.id);
                              setDrinkMode(false);
                              if (chatMessages.length > 1) {
                                setChatMessages([
                                  buildWelcomeAssistantMessage(language, foods.length, restaurants.length, destinations.length),
                                ]);
                              }
                              setSpinCount((cnt) => cnt + 1);
                              setOpenGroup(null);
                              scrollToResultsSection();
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 transition cursor-pointer ${
                              isOptActive
                                ? 'bg-amber-400 text-slate-950 shadow-xs'
                                : 'bg-white text-slate-800 border border-slate-200'
                            }`}
                          >
                            <OptIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{tr(language, opt.labelKh, opt.labelEn, opt.labelZh)}</span>
                            {opt.vip && <AccessBadge vip />}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Beverage Pairings sub-filter chips when active */}
              <div ref={drinkPairingTopRef} className="scroll-mt-2">
                {drinkMode && (
                  <div className="kft-hscroll flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
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
                        className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                          drinkKind === k.id
                            ? 'bg-[#064E3B] text-white border border-[#064E3B]'
                            : 'bg-white text-slate-700 border border-emerald-200'
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
                      className="shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 transition active:scale-95 cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                      <span>{tr(language, 'ចាប់ឈុតថ្មីចៃដន្យ', 'Randomize Sets', '随机生成新套餐')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content body (Dark Slate #1E293B background for all marked areas) */}
          <div ref={dishCardRef} className="px-3.5 pt-3.5 pb-4 space-y-3 bg-[#1E293B] flex-1">

            {/* Beverage Pairing sets */}
            {showSets && (
              <div className={`space-y-4 transition-opacity duration-200 ${isSpinning ? 'opacity-30' : 'opacity-100'}`}>
                {visibleSets.map((set, idx) => {
                  const setNo = setPage * PAIRING_SETS_PER_PAGE + idx + 1;
                  return (
                    <div key={`${setPage}-${idx}`} className="space-y-2">
                      <div className="flex items-center gap-2 px-0.5">
                        <span className="w-6 h-6 rounded-md bg-[#064E3B] text-amber-300 text-[11px] font-black flex items-center justify-center shrink-0">
                          {setNo}
                        </span>
                        <span className="font-moul text-xs text-white truncate">
                          {tr(language, `ឈុតម្ហូបទី ${setNo}`, `Pairing Set ${setNo}`, `搭配套餐 ${setNo}`)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
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
                              className="group rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xs text-left active:scale-[0.97] transition cursor-pointer"
                            >
                              <span className="block aspect-4/3 w-full overflow-hidden bg-slate-200">
                                <img
                                  src={resolveFoodPhotoUrl(food.photoUrl, food.photoUpdatedAt, 480, food.id)}
                                  onError={(e) => handleFoodImageError(e, food.id, food.photoUrl)}
                                  alt={fLoc.name}
                                  loading="eager"
                                  decoding="async"
                                  draggable={false}
                                  onContextMenu={(e) => e.preventDefault()}
                                  className="w-full h-full object-cover select-none group-hover:scale-105 transition-transform duration-500"
                                />
                              </span>
                              <span className="block px-2.5 py-2 text-[13px] font-extrabold leading-snug text-slate-900 line-clamp-2 min-h-[2.8rem] font-khmer">
                                {fLoc.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <p className="text-center text-[11px] font-bold text-slate-300">
                  {tr(language, 'ទំព័រ', 'Page', '第')} {setPage + 1} / {setPageCount}
                  {language === 'zh' ? ' 页' : ''}
                </p>
              </div>
            )}

            {/* Results */}
            {!showSets && !isMedicalRefusalActive && (
              <div
                id="kft-wte-results-section"
                data-testid="wte-results-section"
                className="space-y-3.5 font-khmer"
              >
                <div id="kft-wte-ai-match-banner" className="px-0.5">
                  <h4 className="text-sm font-extrabold text-white truncate">
                    {tr(
                      language,
                      `មុខម្ហូបណែនាំទាំង ${recommendedTenDishes.length} មុខ`,
                      `Top ${recommendedTenDishes.length} Recommended Dishes`,
                      `为您推荐的 ${recommendedTenDishes.length} 道美食`
                    )}
                  </h4>
                  {activeFilterParts.length > 0 && (
                    <p className="text-[11px] text-slate-300 truncate mt-0.5">{activeCriteriaLabel}</p>
                  )}
                </div>

                {/* Loading State */}
                {isSpinning && (
                  <div
                    data-testid="wte-results-loading"
                    className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2.5 text-xs font-extrabold text-[#064E3B]"
                  >
                    <Shuffle className="w-4 h-4 animate-spin shrink-0" strokeWidth={1.75} />
                    <span>{tr(language, 'កំពុងជ្រើសរើសម្ហូបថ្មី...', 'Generating 4 Dishes...', '正在为您更换新推荐...')}</span>
                  </div>
                )}

                {/* Error State */}
                {!isSpinning && recommendationError && (
                  <div
                    data-testid="wte-results-error"
                    className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2"
                  >
                    <p className="text-xs font-bold text-rose-700">{recommendationError}</p>
                    <button
                      type="button"
                      onClick={handleShowAnother}
                      className="px-3.5 py-2 rounded-xl bg-[#064E3B] text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>{tr(language, 'ព្យាយាមម្ដងទៀត', 'Try Again', '重试')}</span>
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!isSpinning && !recommendationError && recommendedTenDishes.length === 0 && (
                  <div
                    data-testid="wte-results-empty"
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2.5"
                  >
                    <Utensils className="w-7 h-7 mx-auto text-slate-400" strokeWidth={1.75} />
                    <div className="text-xs font-extrabold text-slate-800">
                      {tr(
                        language,
                        'មិនមានមុខម្ហូបត្រូវនឹងជម្រើសនេះទេ',
                        'No dishes matched this combination',
                        '没有符合该筛选组合的菜品'
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRecommendationError('');
                        setMealSlotFilter('auto');
                        setCategoryFilter('all');
                        setCravingQuery('');
                        setVipDietFilter('none');
                        setSpinCount((c) => c + 1);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#064E3B] text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>{tr(language, 'កំណត់តម្រងឡើងវិញ', 'Reset Filters', '重置筛选')}</span>
                    </button>
                  </div>
                )}

                {/* Featured dish (retained for watermark verification; bottom grid consistently displays 4 cards in 2 columns) */}
                {Boolean(false) && currentDish && currentLoc && !suppressBigCard && (
                  <div
                    data-testid="wte-picked-dish-card"
                    data-dish-id={currentDish.id}
                    className="relative rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-md"
                  >
                    <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
                      {isGeneratedDishId(currentDish.id) &&
                      !failedOnlineDishIds[currentDish.id] &&
                      !hasRenderablePhoto(currentDish.photoUrl) ? (
                        <div className="w-full h-full bg-[#064E3B] flex flex-col items-center justify-center gap-2.5 text-emerald-100 p-6 text-center">
                          <ChefHat className="w-8 h-8 text-amber-300" strokeWidth={1.75} />
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 text-white text-[11px] font-bold font-khmer">
                        {currentLoc.category}
                      </span>

                      {/* Khmer ownership watermark (applied once) */}
                      {!isUrlWatermarkedAtPixelLevel(currentDish.photoUrl) && (
                        <span className={FOOD_WATERMARK_BADGE_CLASS}>
                          {FOOD_WATERMARK_TEXT}
                        </span>
                      )}

                      <div className="absolute bottom-3 left-4 right-24 text-white">
                        <h2
                          id="kft-wte-picked-dish-name"
                          className="font-moul text-base sm:text-lg text-white drop-shadow leading-snug"
                        >
                          {currentLoc.name}
                        </h2>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 font-khmer">
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        {!isGeneratedDishId(currentDish.id) && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" strokeWidth={1.75} />
                            <span className="font-bold">{currentDish.rating}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                          <span>{currentLoc.cookTime}</span>
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                          <ChefHat className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={1.75} />
                          <span className="capitalize truncate">{currentLoc.difficultyLabel}</span>
                        </div>
                      </div>

                      {(() => {
                        const pInfo = drinkMode ? getDrinkPairing(currentDish) : null;
                        const brainInfo = brainInfoById[currentDish.id];
                        const reason = pInfo
                          ? `${pairingKindsLabel(pInfo.kinds, language)} — ${pairingReason(pInfo, language)}`
                          : brainInfo?.reason;
                        if (!reason) return null;
                        return (
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                            {reason}
                          </p>
                        );
                      })()}

                      {/* Restaurants Serving It */}
                      {servingRestaurants.length > 0 && (
                        <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 px-2.5 py-1.5 divide-y divide-emerald-100/80">
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
                                className="w-full flex items-center gap-2.5 text-xs text-slate-700 hover:text-emerald-600 py-1.5 cursor-pointer"
                              >
                                <ShopAvatar
                                  restaurant={r}
                                  alt={rLoc.name}
                                  className="w-7 h-7 rounded-lg"
                                />
                                <span className="font-bold truncate flex-1 text-left">{rLoc.name}</span>
                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.75} />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-stretch gap-2 pt-0.5 flex-wrap min-[340px]:flex-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFood(currentDish);
                            setIsWhatToEatModalOpen(false);
                          }}
                          className="flex-1 min-w-[110px] py-2.5 px-2.5 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer leading-[1.6]"
                        >
                          <Utensils className="w-4 h-4 text-amber-300 shrink-0" strokeWidth={1.75} />
                          <span className="break-words">{tr(language, 'មើលរូបមន្តពេញ', 'Full Recipe', '查看完整食谱')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleFindNearbyForDish}
                          className="flex-1 min-w-[110px] py-2.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-[#064E3B] border border-emerald-200 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer leading-[1.6]"
                        >
                          <Navigation className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={1.75} />
                          <span className="break-words">{tr(language, 'ស្វែងរកហាងជិតខ្ញុំ', 'Find Nearby', '查找附近餐厅')}</span>
                        </button>

                        <button
                          type="button"
                          aria-label={tr(language, 'រក្សាទុកក្នុងបញ្ជីចូលចិត្ត', 'Save to Favorites', '收藏到心愿单')}
                          title={tr(language, 'រក្សាទុកក្នុងបញ្ជីចូលចិត្ត', 'Save to Favorites', '收藏到心愿单')}
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
                          className="w-11 shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center justify-center cursor-pointer"
                        >
                          <Heart className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4 Recommended Dishes per batch in a clean 2-column layout */}
                {!recommendationError &&
                  (() => {
                    const gridDishes = recommendedTenDishes.slice(0, 4);
                    if (gridDishes.length === 0) return null;
                    return (
                      <div
                        data-testid="wte-ten-dishes-results"
                        className={`grid grid-cols-2 gap-3 transition-opacity duration-200 ${isSpinning ? 'opacity-40' : 'opacity-100'}`}
                      >
                        {gridDishes.map((d, idx) => {
                          const rank = idx + 1;
                          const dLoc = getLocalizedFood(d, language);
                          const isCompared = comparedDishIds.includes(d.id);
                          const compareLabel = isCompared
                            ? tr(language, 'កំពុងប្រៀបធៀប', 'Comparing', '已对比')
                            : tr(language, 'ប្រៀបធៀប', 'Compare', '对比');
                          return (
                            <div
                              key={d.id}
                              data-testid={`wte-result-dish-${rank}`}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setCurrentDishId(d.id);
                                seenDishIdsRef.current.add(d.id);
                                setSelectedFood(d);
                                setIsWhatToEatModalOpen(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setCurrentDishId(d.id);
                                  seenDishIdsRef.current.add(d.id);
                                  setSelectedFood(d);
                                  setIsWhatToEatModalOpen(false);
                                }
                              }}
                              className="group rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xs text-left active:scale-[0.98] transition cursor-pointer"
                            >
                              <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-200">
                                <img
                                  src={resolveFoodPhotoUrl(d.photoUrl, d.photoUpdatedAt, 480, d.id)}
                                  alt={dLoc.name}
                                  loading="eager"
                                  decoding="async"
                                  onError={(e) => handleFoodImageError(e, d.id, d.photoUrl)}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <span className="absolute top-2 left-2 min-w-6 h-6 px-1.5 rounded-full bg-[#064E3B] text-amber-300 text-[11px] font-black flex items-center justify-center">
                                  {rank}
                                </span>
                                <button
                                  type="button"
                                  aria-label={compareLabel}
                                  title={compareLabel}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCompareDish(d.id);
                                  }}
                                  className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer ${
                                    isCompared ? 'bg-amber-400 text-slate-950' : 'bg-black/50 text-white hover:bg-black/70'
                                  }`}
                                >
                                  {isCompared ? (
                                    <Check className="w-4 h-4" strokeWidth={1.75} />
                                  ) : (
                                    <Plus className="w-4 h-4" strokeWidth={1.75} />
                                  )}
                                </button>
                              </div>
                              <div className="p-2.5 space-y-1">
                                <h5 className="text-[13px] font-extrabold text-[#1E293B] leading-snug line-clamp-2 min-h-[2.4rem]">
                                  {dLoc.name}
                                </h5>
                                <div className="flex items-center gap-2.5 text-[11px] text-slate-600 font-semibold">
                                  <span className="inline-flex items-center gap-0.5">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" strokeWidth={1.75} />
                                    {d.rating}
                                  </span>
                                  <span className="inline-flex items-center gap-1 min-w-0">
                                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={1.75} />
                                    <span className="truncate">{dLoc.cookTime}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
              </div>
            )}

            {/* Interactive Side-by-Side Dish Comparison Panel */}
            {!drinkMode && comparedDishIds.length > 0 && (
              <div
                id="kft-wte-compare-panel"
                ref={comparePanelRef}
                className="p-3 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-2.5 font-khmer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                      <span>
                        {tr(
                          language,
                          `ប្រៀបធៀបមុខម្ហូបដោយផ្ទាល់ (${comparedDishIds.length}/3)`,
                          `Side-by-Side Dish Comparison (${comparedDishIds.length}/3)`,
                          `菜品直观对比 (${comparedDishIds.length}/3)`
                        )}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComparedDishIds([])}
                    className="px-2 py-0.5 rounded-lg bg-white border border-amber-300 text-[10px] font-bold text-slate-700 hover:text-rose-600 cursor-pointer shrink-0"
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
                        className="p-2 rounded-xl bg-white border border-amber-200 flex flex-col justify-between gap-1.5 text-[11px]"
                      >
                        <div className="space-y-1">
                          <div className="relative aspect-16/10 rounded-lg overflow-hidden bg-slate-200">
                            <img loading="lazy" decoding="async"
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
                              <X className="w-3 h-3" strokeWidth={1.75} />
                            </button>
                          </div>
                          <div className="font-extrabold text-slate-900 line-clamp-1">{cLoc.name}</div>
                          <div className="text-[10px] font-bold text-emerald-700">
                            {cDish.rating} • {cLoc.cookTime} • {cDish.calories || 280} kcal
                          </div>
                          <div className="text-[10px] text-amber-800 font-semibold line-clamp-2 leading-snug break-words">
                            {cTaste}
                          </div>
                          {cIngs && (
                            <div className="text-[10px] text-slate-600 line-clamp-2">
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
          </div>
        </div>

        {/* Primary action: show other dishes (free) */}
        <div
          style={{ paddingBottom: 'max(var(--kft-safe-bottom, 0px), 0.75rem)' }}
          className="px-3 pt-3 bg-[#1E293B] border-t border-slate-700/80 shrink-0"
        >
          <button
            id="kft-wte-next-dish-btn"
            type="button"
            onClick={handleShowAnother}
            className="w-full py-3 px-4 rounded-2xl bg-[#064E3B] hover:bg-[#047857] text-white font-extrabold text-sm shadow-xs flex items-center justify-center gap-2 transition active:scale-[0.98] font-khmer cursor-pointer"
          >
            <Shuffle className={`w-4 h-4 text-amber-300 ${isSpinning ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            <span>
              {isSpinning
                ? tr(language, 'កំពុងជ្រើសរើសម្ហូបថ្មី...', 'Generating 4 Dishes...', '正在为您更换新推荐...')
                : showSets
                  ? tr(language, 'បង្ហាញឈុតម្ហូបផ្សេងទៀត', 'Show More Sets', '查看更多套餐')
                  : tr(language, 'បង្ហាញម្ហូបផ្សេងទៀត', 'Show More Dishes', '换一批推荐菜品')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

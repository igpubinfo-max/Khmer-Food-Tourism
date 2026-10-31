import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Sparkles,
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
  Bot,
  Compass,
  Store,
  RotateCcw,
  ExternalLink,
  Leaf,
  Zap,
  Soup,
  Salad,
} from 'lucide-react';
import { FoodItem, isGpipRegisteredRestaurant, openRestaurantGoogleExternal } from '../types';
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
import { getLocalizedFood, getLocalizedRestaurant, getLocalizedDestination } from '../utils/zhDynamicTranslator';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import { hasSpecialAndHealthyFoodVipAccess } from '../utils/smartHub';
import { getDishTagIds, type DishTagId } from '../utils/dishTags';
import { getMatchingRestaurantsForDish } from '../utils/foodFilters';
import {
  getAiFoodAdvisorRecommendations,
  QUICK_CRAVING_CHIPS,
  isVegetarianQuery,
  classifyVegetarianDish,
} from '../services/aiFoodAdvisorService';
import { isMedicalOrHealthQuery, describeDish } from '../services/aiFoodBrain';
import {
  buildWelcomeAssistantMessage,
  generateConversationalAiResponse,
  type AiAssistantMessage,
  type AiConversationMemory,
} from '../services/conversationalAiAssistant';
import {
  rankDrinkPairingDishes,
  getDrinkPairing,
  pairingReason,
  pairingKindsLabel,
  type DrinkKindFilter,
} from '../utils/drinkPairing';

type MealSlotFilter = 'auto' | 'breakfast' | 'lunch' | 'afternoon' | 'dinner';
type VipDietFilter = 'none' | 'light' | 'protein_rich' | 'steamed_boiled' | 'vegetable_rich';
type MenuGroupId = 'time' | 'type' | 'craving' | 'health';

const MEAL_SLOTS: Array<{ id: MealSlotFilter; kh: string; en: string; zh: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'auto', kh: 'ពេលនេះ', en: 'Right Now', zh: '当前时段', icon: Clock },
  { id: 'breakfast', kh: 'ពេលព្រឹក', en: 'Breakfast', zh: '早餐', icon: Coffee },
  { id: 'lunch', kh: 'ថ្ងៃត្រង់', en: 'Lunch', zh: '午餐', icon: Sun },
  { id: 'afternoon', kh: 'រសៀល', en: 'Snack', zh: '下午茶', icon: Sparkles },
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
    icon: Sparkles,
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
    icon: Zap,
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
  mealSlotFilter: MealSlotFilter,
  effectiveMealSlot: Exclude<MealSlotFilter, 'auto'>
): boolean {
  if (mealSlotFilter === 'auto') return true;
  const text = `${food.nameKh || ''} ${food.nameEn || ''} ${food.categorySlug || ''}`.toLowerCase();
  if (effectiveMealSlot === 'breakfast') {
    return (
      food.categorySlug === 'noodles' ||
      food.categorySlug === 'rice' ||
      /គុយទាវ|នំបញ្ចុក|បបរ|បាយសាច់ជ្រូក|បាយមាន់|បាយឆា|មី|ហ្វឺ|លត|កាហ្វេ|នំប៉័ង|kuy\s*teav|banh\s*chok|porridge|congee|pork\s*rice|chicken\s*rice|noodle/i.test(
        text
      )
    );
  }
  if (effectiveMealSlot === 'afternoon') {
    return (
      food.categorySlug === 'dessert' ||
      food.categorySlug === 'salad' ||
      food.categorySlug === 'grilled' ||
      /បង្អែម|នំ|ភ្លា|ញាំ|បុក|អាំង|បំពង|ចៀន|លតឆា|មីឆា|ប្រហិត|ក្រឡាន|អន្សម|dessert|salad|grilled|street|snack/i.test(
        text
      )
    );
  }
  if (effectiveMealSlot === 'lunch' || effectiveMealSlot === 'dinner') {
    return food.categorySlug !== 'dessert' && food.categorySlug !== 'cake';
  }
  return true;
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
    openUpgradeVipModal,
    showToast,
  } = useApp();

  const canUseVip = hasSpecialAndHealthyFoodVipAccess(currentUser);

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

  // Current dish index and history of seen dish IDs to prevent repetition
  const [currentDishId, setCurrentDishId] = useState<string>('');
  const [comparedDishIds, setComparedDishIds] = useState<string[]>([]);
  const seenDishIdsRef = useRef<Set<string>>(new Set());
  const comparePanelRef = useRef<HTMLDivElement>(null);
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

  // Initialize welcome message when modal opens or language changes
  useEffect(() => {
    if (isWhatToEatModalOpen) {
      if (chatMessages.length === 0) {
        setChatMessages([
          buildWelcomeAssistantMessage(language, foods.length, restaurants.length, destinations.length),
        ]);
      }
      if ((window as any).__kft_wte_open_compare_mode) {
        (window as any).__kft_wte_open_compare_mode = false;
        const defaultCompare = foods.slice(0, 3).map((f) => f.id);
        setComparedDishIds(defaultCompare);
        setTimeout(() => {
          comparePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    }
  }, [isWhatToEatModalOpen, language, foods, restaurants.length, destinations.length, chatMessages.length]);

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

  const aiCravingRecommendations = useMemo(() => {
    if (!cravingQuery.trim()) return null;
    return getAiFoodAdvisorRecommendations({
      foods,
      restaurants,
      query: cravingQuery,
      goal: 'any',
      seed: 0,
      language,
      canUseVip,
    });
  }, [foods, restaurants, cravingQuery, language, canUseVip]);

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

  // Beverage Pairings are presented as curated sets of exactly 4 dishes
  const pairingSets = useMemo(() => {
    const list = pairingRanked.map((r) => r.food);
    const sets: FoodItem[][] = [];
    for (let i = 0; i + PAIRING_SET_SIZE <= list.length; i += PAIRING_SET_SIZE) {
      sets.push(list.slice(i, i + PAIRING_SET_SIZE));
    }
    return sets;
  }, [pairingRanked]);
  const showSets = drinkMode && canUseVip && pairingSets.length > 0;
  const setPageCount = Math.max(1, Math.ceil(pairingSets.length / PAIRING_SETS_PER_PAGE));
  const visibleSets = pairingSets.slice(setPage * PAIRING_SETS_PER_PAGE, (setPage + 1) * PAIRING_SETS_PER_PAGE);

  useEffect(() => {
    setSetPage(0);
  }, [drinkMode, drinkKind]);

  // Filter candidate dishes strictly across all 4 filter groups: Craving, Category, Mealtime, and Dietary/Health
  const matchingFoods = useMemo(() => {
    if (isMedicalRefusalActive) return [];
    if (drinkMode && canUseVip && pairingRanked.length > 0) {
      return pairingRanked.map((r) => r.food);
    }

    const qTrim = cravingQuery.trim().toLowerCase();
    let basePool: FoodItem[];

    if (qTrim) {
      const advisorAll = aiCravingRecommendations?.allMatchedDishes || [];
      const advisorTop = aiCravingRecommendations?.dishes || [];
      const rawPool = advisorAll.length > 0 ? advisorAll : advisorTop;

      // Strictly filter preset craving chips by dish title so every preset chip returns 100% relevant dishes
      const filterByPresetCraving = (f: FoodItem): boolean => {
        const kh = (f.nameKh || '').trim();
        const title = `${kh} ${f.nameEn || ''}`.toLowerCase();
        const isDessertDish = matchesCategoryStrict(f, 'dessert');

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
            /គ្រឿងសមុទ្រ|ក្តាម|ក្ដាម|បង្គា|បង្កង|មឹក|ងាវ|ខ្យង|ត្រីសមុទ្រ|\bseafood\b|\bcrab\b|\bprawn\b|\bshrimp\b|\bsquid\b|\bclam\b|\boyster\b/i.test(
              title
            )
          );
        }
        if (qTrim === 'សាច់អាំង' || qTrim === 'grilled' || qTrim === '烧烤') {
          return (
            !isDessertDish &&
            !/^ឆា|^សម្ល|^បបរ|^គុយទាវ|^នំបញ្ចុក|^ទឹក/i.test(kh) &&
            /អាំង|បំពង|ចៀន|ដុត|ងៀត|ក្រក|\bgrilled\b|\bfried\b|\bcrispy\b|\broast\b|\bbbq\b/i.test(title)
          );
        }
        if (qTrim === 'ជូរហឹរ' || qTrim === 'spicy sour' || qTrim === '酸辣') {
          return (
            !isDessertDish &&
            !/^ទឹកសណ្តែក|^បង្អែម|^នំ|^បាយសាច់ជ្រូក/i.test(kh) &&
            /ម្ជូរ|ញាំ|ភ្លា|បុក|តុំយ៉ាំ|កែងស้ม|ប្រហុក|ទឹកគ្រឿង|ម្រះព្រៅ|ឆាក្តៅ|\bsour\b|\bsalad\b|\bceviche\b|\btom\s*yum\b/i.test(
              title
            )
          );
        }
        if (qTrim === 'អាហារសម្រន់' || qTrim === 'street food' || qTrim === '街头小吃') {
          return (
            !isDessertDish &&
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

    // 1. Strict 4-way intersection (Craving + Category + MealSlot + Diet)
    const strictAll = basePool.filter(
      (food) =>
        matchesCategoryStrict(food, categoryFilter) &&
        matchesMealSlotStrict(food, mealSlotFilter, effectiveMealSlot) &&
        matchesDietStrict(food, vipDietFilter)
    );
    if (strictAll.length > 0) return strictAll;

    // 2. If MealSlot made a narrow Craving+Category+Diet combination empty, relax MealSlot while keeping Craving+Category+Diet strict
    const strictWithoutMealSlot = basePool.filter(
      (food) =>
        matchesCategoryStrict(food, categoryFilter) &&
        matchesDietStrict(food, vipDietFilter)
    );
    if (strictWithoutMealSlot.length > 0) return strictWithoutMealSlot;

    // 3. Keep Category + Diet strict across all foods if Craving conflicted
    const categoryAndDietOnly = foods.filter(
      (food) =>
        matchesCategoryStrict(food, categoryFilter) &&
        matchesMealSlotStrict(food, mealSlotFilter, effectiveMealSlot) &&
        matchesDietStrict(food, vipDietFilter)
    );
    if (categoryAndDietOnly.length > 0) return categoryAndDietOnly;

    return basePool;
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
  ]);

  // Active candidate list
  const activeDishList = isMedicalRefusalActive ? [] : matchingFoods.length > 0 ? matchingFoods : foods;

  const hasStructuredFilter = Boolean(
    cravingQuery.trim() || categoryFilter !== 'all' || mealSlotFilter !== 'auto' || vipDietFilter !== 'none' || drinkMode
  );

  const pickRandomDish = (excludeId?: string): FoodItem => {
    if (activeDishList.length === 0) return foods[0];
    if (activeDishList.length === 1) {
      seenDishIdsRef.current.add(activeDishList[0].id);
      return activeDishList[0];
    }

    let unseenCandidates = activeDishList.filter(
      (f) => f.id !== excludeId && !seenDishIdsRef.current.has(f.id)
    );

    if (unseenCandidates.length === 0) {
      seenDishIdsRef.current.clear();
      unseenCandidates = activeDishList.filter((f) => f.id !== excludeId);
    }

    const pool = unseenCandidates.length > 0 ? unseenCandidates : activeDishList;
    const nextPick = hasStructuredFilter
      ? pool[0]
      : pool[Math.floor(Math.random() * pool.length)];

    seenDishIdsRef.current.add(nextPick.id);
    return nextPick;
  };

  useEffect(() => {
    if (!isWhatToEatModalOpen) {
      seenDishIdsRef.current.clear();
      return;
    }
    if (foods.length > 0 && !isMedicalRefusalActive) {
      const initialPick = pickRandomDish(currentDishId || undefined);
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
  ]);

  const currentDish: FoodItem | null = useMemo(() => {
    if (isMedicalRefusalActive) return null;
    return activeDishList.find((f) => f.id === currentDishId) || activeDishList[0] || foods[0] || null;
  }, [activeDishList, currentDishId, foods, isMedicalRefusalActive]);

  const currentLoc = useMemo(
    () => (currentDish ? getLocalizedFood(currentDish, language) : null),
    [currentDish, language]
  );

  const alternativeDishes = useMemo(() => {
    if (isMedicalRefusalActive || activeDishList.length <= 1) return [];
    const pool = activeDishList.filter((f) => f.id !== currentDish?.id);
    if (pool.length === 0) return [];
    if (hasStructuredFilter) {
      return pool.slice(0, 4);
    }
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  }, [activeDishList, currentDish?.id, hasStructuredFilter, isMedicalRefusalActive]);

  const servingRestaurants = useMemo(() => {
    if (!currentDish) return [];
    return getMatchingRestaurantsForDish(currentDish, restaurants, 2);
  }, [restaurants, currentDish]);

  if (!isWhatToEatModalOpen) return null;

  const sendConversationalMessage = (rawText: string) => {
    const clean = rawText.trim();
    if (!clean) return;

    const userMsg: AiAssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: clean,
      timestamp: new Date().toISOString(),
    };

    const { reply, nextMemory } = generateConversationalAiResponse({
      userInput: clean,
      language,
      foods,
      restaurants,
      destinations,
      canUseVip,
      memory: chatMemory,
    });

    setChatMessages((prev) => [...prev.slice(-12), userMsg, reply]);
    setChatMemory(nextMemory);

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

    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const handleCravingSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    cravingInputRef.current?.blur();
    if (!cravingQuery.trim()) return;
    sendConversationalMessage(cravingQuery);
  };

  const handleResetChat = () => {
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
    if (showSets) {
      setIsSpinning(true);
      setTimeout(() => {
        setSetPage((p) => (p + 1) % setPageCount);
        setIsSpinning(false);
      }, 200);
      return;
    }
    setIsSpinning(true);
    setTimeout(() => {
      const nextDish = pickRandomDish(currentDish?.id);
      if (nextDish) setCurrentDishId(nextDish.id);
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
                  {tr(language, 'ជំនួយការ AI មុខម្ហូប & ទេសចរណ៍', 'AI Food & Tourism Assistant', 'AI 美食与旅游对话助手')}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-[10px] font-extrabold shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  <span>{tr(language, 'ឥតគិតថ្លៃ • FREE', 'FREE Access', '免费使用')}</span>
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-khmer truncate">
                {tr(
                  language,
                  `សន្ទនាឆ្លាតវៃពីម្ហូបខ្មែរ ${foods.length}+ មុខ • ហាង ${restaurants.length}+ • ទេសចរណ៍ ${destinations.length}+`,
                  `Conversational AI for ${foods.length}+ dishes, ${restaurants.length}+ shops & ${destinations.length}+ sights`,
                  `智能对话探索 ${foods.length}+ 道美食、${restaurants.length}+ 家餐厅与 ${destinations.length}+ 个景点`
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
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="kft-wte-chat-input"
                  ref={cravingInputRef}
                  type="search"
                  enterKeyHint="send"
                  value={cravingQuery}
                  onChange={(e) => {
                    setCravingQuery(e.target.value);
                    if (drinkMode) setDrinkMode(false);
                  }}
                  placeholder={tr(
                    language,
                    'ចង់ញ៉ាំអ្វីថ្ងៃនេះ? សួរអំពីម្ហូប រូបមន្ត ហាង ឬកន្លែងដើរលេង...',
                    'What to eat today? Ask about food, recipes, shops or tourism...',
                    '今天吃什么？询问高棉美食、食谱做法、餐厅或旅游景点...'
                  )}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {cravingQuery && (
                  <button
                    type="button"
                    onClick={() => setCravingQuery('')}
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
                              chip.queryKh.toLowerCase() === cravingQuery.trim().toLowerCase() ||
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
                    const isChipActive = cravingQuery.trim().toLowerCase() === chipQuery.trim().toLowerCase();
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        data-testid={`wte-craving-${chip.id}`}
                        onClick={() => {
                          setCravingQuery(chipQuery);
                          setDrinkMode(false);
                          // Clear categoryFilter when selecting a preset Craving chip so they never conflict (e.g. Dessert + Grilled)
                          setCategoryFilter('all');
                          setOpenGroup(null);
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
            {/* Multi-Turn Conversational AI Assistant Thread */}
            {!drinkMode && chatMessages.length > 0 && (
              <div
                id="kft-wte-chat-thread"
                className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-emerald-200/80 dark:border-slate-700 p-3 space-y-2.5 font-khmer"
              >
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/70 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#064E3B] dark:text-emerald-300">
                    <Bot className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {tr(
                        language,
                        'សន្ទនាជាមួយជំនួយការ AI (ម្ហូប & ទេសចរណ៍)',
                        'Conversational AI (Food & Tourism)',
                        'AI 智能对话（美食与旅游）'
                      )}
                    </span>
                  </div>
                  {chatMessages.length > 1 && (
                    <button
                      type="button"
                      onClick={handleResetChat}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-bold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1 hover:text-emerald-600 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{tr(language, 'សន្ទនាថ្មី', 'Reset', '新对话')}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 max-h-[30rem] overflow-y-auto pr-0.5">
                  {chatMessages.map((msg) => {
                    if (msg.role === 'user') {
                      return (
                        <div key={msg.id} className="flex justify-end">
                          <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-xs bg-[#064E3B] text-white text-xs font-bold leading-relaxed shadow-2xs">
                            {msg.text}
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
                              : 'bg-white dark:bg-slate-800 border-emerald-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          {msg.text}

                          {/* Vegetarian / Plant-Based Culinary Guidance Banner */}
                          {msg.vegetarianNote && (
                            <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-emerald-950 dark:text-emerald-200 leading-relaxed">
                              {msg.vegetarianNote}
                            </div>
                          )}

                          {/* Detailed Matching Dishes from Database (Photo, Description, Taste Profile, Ingredients, Cooking Method, Explore/Compare) */}
                          {msg.dishes && msg.dishes.length > 0 && !msg.recipePreview && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[11px] font-extrabold text-[#064E3B] dark:text-emerald-300 flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>
                                    {tr(
                                      language,
                                      'មុខម្ហូបណែនាំលម្អិតពីទិន្នន័យកម្មវិធី៖',
                                      'Matching Dishes & Culinary Details:',
                                      '数据库匹配菜品与详细风味做法：'
                                    )}
                                  </span>
                                </div>
                                {msg.dishes.length >= 2 && (
                                  <button
                                    type="button"
                                    onClick={() => setComparedDishIds(msg.dishes!.slice(0, 3).map((d) => d.id))}
                                    className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-[10px] font-extrabold text-amber-900 dark:text-amber-200 hover:bg-amber-200 transition cursor-pointer"
                                  >
                                    ⚖️ {tr(language, 'ប្រៀបធៀបទាំងអស់', 'Compare All', '一键对比')}
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
                                        ? dLoc.ingredients?.[idx] || ing.nameEn || ing.nameKh
                                        : ing.nameEn || ing.nameKh
                                  );
                                  const methodStep = (dish.steps || [])[0];
                                  const methodSummary = methodStep
                                    ? language === 'km'
                                      ? methodStep.instructionKh
                                      : language === 'zh'
                                        ? dLoc.steps?.[0] || methodStep.instructionEn || methodStep.instructionKh
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
                                          src={dish.photoUrl}
                                          alt={dLoc.name}
                                          loading="lazy"
                                          className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-200 border border-slate-200 dark:border-slate-700"
                                        />
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                              {dLoc.name}
                                            </span>
                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                              ⭐ {dish.rating}
                                            </span>
                                          </div>
                                          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                            {dLoc.category} • ⏱️ {dLoc.cookTime} • {dish.calories || 280} kcal
                                          </div>
                                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                                            <span>✨ {tr(language, 'រសជាតិ៖', 'Taste:', '风味：')} {tasteProfile}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                                        {dLoc.description}
                                      </p>

                                      {topIngs.length > 0 && (
                                        <div className="text-[10px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/90 px-2 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/70">
                                          <span className="font-extrabold text-[#064E3B] dark:text-emerald-300">
                                            🥗 {tr(language, 'គ្រឿងផ្សំ៖ ', 'Ingredients: ', '主要食材：')}
                                          </span>
                                          <span>{topIngs.join(' • ')}</span>
                                        </div>
                                      )}

                                      {methodSummary && (
                                        <div className="text-[10px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/90 px-2 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/70 line-clamp-2">
                                          <span className="font-extrabold text-[#064E3B] dark:text-emerald-300">
                                            👩‍🍳 {tr(language, 'របៀបចម្អិន៖ ', 'Cooking Method: ', '烹饪方法：')}
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
                                              : `⚖️ ${tr(language, 'ប្រៀបធៀប', 'Compare', '加入对比')}`}
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Similar Dishes & Alternative Recommendations */}
                          {msg.similarDishes && msg.similarDishes.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                              <div className="text-[11px] font-extrabold text-[#064E3B] dark:text-emerald-300 flex items-center gap-1">
                                <Shuffle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>
                                  {tr(
                                    language,
                                    'មុខម្ហូបស្រដៀងគ្នា និងជម្រើសជំនួស៖',
                                    'Similar Dishes & Alternative Recommendations:',
                                    '相似菜品与替代推荐：'
                                  )}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-1.5">
                                {msg.similarDishes.slice(0, 4).map((sim) => {
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
                                        src={sim.photoUrl}
                                        alt={sLoc.name}
                                        loading="lazy"
                                        className="w-9 h-9 rounded-lg object-cover shrink-0 bg-slate-200"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                          {sLoc.name}
                                        </div>
                                        <div className="text-[9px] text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                                          ⭐ {sim.rating} • {sLoc.category}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Inline Recipe Preview when user asks for ingredients / how to cook */}
                          {msg.recipePreview && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2">
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
                                  if (msg.recipePreview?.food) {
                                    setSelectedFood(msg.recipePreview.food);
                                    setIsWhatToEatModalOpen(false);
                                  }
                                }}
                                className="w-full mt-1 py-2 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <ChefHat className="w-3.5 h-3.5 text-amber-300" />
                                <span>{tr(language, 'បើកមើលរូបមន្តពេញលេញ', 'Open Full Recipe Card', '打开完整食谱详情')}</span>
                              </button>
                            </div>
                          )}

                          {/* Inline Tourism Destination Cards when user asks about travel / provinces */}
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
                                        className="w-11 h-11 rounded-lg object-cover shrink-0 bg-slate-200"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{dLoc.name}</div>
                                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold truncate">
                                          📍 {dLoc.province} • ⭐ {dest.rating}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Inline Restaurant Cards when user asks where to eat */}
                          {msg.restaurants && msg.restaurants.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                              <div className="text-[11px] font-extrabold text-[#064E3B] dark:text-emerald-300 flex items-center gap-1">
                                <Store className="w-3.5 h-3.5 shrink-0" />
                                <span>{tr(language, 'ភោជនីយដ្ឋានណែនាំ និងទីតាំង៖', 'Recommended Restaurants & Locations:', '推荐餐厅与位置导航：')}</span>
                              </div>
                              <div className="space-y-1.5">
                                {msg.restaurants.map((r) => {
                                  const rLoc = getLocalizedRestaurant(r, language);
                                  const isGpip = isGpipRegisteredRestaurant(r);
                                  return (
                                    <div
                                      key={r.id}
                                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 flex items-center gap-2"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isGpip) {
                                            setSelectedRestaurant(r);
                                            setIsWhatToEatModalOpen(false);
                                          } else {
                                            openRestaurantGoogleExternal(r, 'maps');
                                          }
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
                                            📍 {rLoc.address || rLoc.province}
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

                          {/* Honest explanation + Google Maps Navigation when no partner shop explicitly lists the dish */}
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

                        {/* Follow-up conversational chips */}
                        {msg.followUpChips && msg.followUpChips.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {msg.followUpChips.map((chip) => (
                              <button
                                key={chip.id}
                                type="button"
                                onClick={() => {
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
                  })}
                  <div ref={chatEndRef} />
                </div>
              </div>
            )}

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
                      onClick={() => setDrinkKind(k.id)}
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
                                  src={food.photoUrl}
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
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-extrabold text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
                    <span>⚖️</span>
                    <span>
                      {tr(
                        language,
                        `ប្រៀបធៀបមុខម្ហូបដោយផ្ទាល់ (${comparedDishIds.length}/3)`,
                        `Side-by-Side Dish Comparison (${comparedDishIds.length}/3)`,
                        `菜品直观对比 (${comparedDishIds.length}/3)`
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComparedDishIds([])}
                    className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-amber-300 dark:border-slate-600 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:text-rose-600 cursor-pointer"
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
                            ? cLoc.ingredients?.[idx] || ing.nameEn || ing.nameKh
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
                            <img src={cDish.photoUrl} alt={cLoc.name} className="w-full h-full object-cover" />
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
                            ⭐ {cDish.rating} • {cLoc.cookTime} • {cDish.calories || 280} kcal
                          </div>
                          <div className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold line-clamp-1">
                            ✨ {cTaste}
                          </div>
                          {cIngs && (
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2">
                              🥗 {cIngs}
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

            {!showSets && !isMedicalRefusalActive && currentDish && currentLoc && (
              <div
                className={`space-y-2.5 transition-all duration-300 ${
                  isSpinning ? 'opacity-30 scale-95' : 'opacity-100 scale-100'
                }`}
              >
                {/* AI Filter Match Summary Banner (Personalized Culinary Header + Quick Compare) */}
                <div
                  id="kft-wte-ai-match-banner"
                  className="p-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300/70 dark:border-emerald-700/60 flex items-center justify-between gap-2 text-xs font-extrabold text-[#064E3B] dark:text-emerald-200 leading-relaxed font-khmer"
                >
                  <span>
                    {tr(
                      language,
                      `✨ ការណែនាំមុខម្ហូបពិសេសពី AI សម្រាប់ «${activeCriteriaLabel}»៖`,
                      `✨ AI Personalized Recommendation for “${activeCriteriaLabel}”:`,
                      `✨ AI 为您精选的“${activeCriteriaLabel}”招牌美食：`
                    )}
                  </span>
                  {matchingFoods.length >= 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setComparedDishIds(
                          [currentDish, ...alternativeDishes.slice(0, 2)]
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((d) => d.id)
                        )
                      }
                      className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-[10px] font-black shrink-0 shadow-2xs transition cursor-pointer"
                    >
                      ⚖️ {tr(language, 'ប្រៀបធៀបម្ហូប', 'Compare Dishes', '对比菜品')}
                    </button>
                  )}
                </div>

                {/* Highlight Recommended Dish Card */}
                <div
                  data-testid="wte-picked-dish-card"
                  data-dish-id={currentDish.id}
                  className="relative rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-md"
                >
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
                          const isGpipRest = isGpipRegisteredRestaurant(r);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                if (isGpipRest) {
                                  setSelectedRestaurant(r);
                                  setIsWhatToEatModalOpen(false);
                                } else {
                                  openRestaurantGoogleExternal(r, 'maps');
                                }
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
                          <div className="text-[11px] text-emerald-600 font-bold truncate">
                            ⭐ {d.rating} • {dLoc.category}
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
            onClick={handleShowAnother}
            disabled={isSpinning}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-stone-900 font-black text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98] font-khmer cursor-pointer"
          >
            <Shuffle className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>
              {showSets
                ? tr(language, 'បង្ហាញឈុតម្ហូបផ្សេងទៀត', 'Show More Sets', '查看更多套餐')
                : tr(language, 'បង្ហាញម្ហូបផ្សេងទៀត', 'Recommend Another Dish', '换一道推荐菜品')}
                        </span>
          </button>
        </div>
      </div>
    </div>
  );
};

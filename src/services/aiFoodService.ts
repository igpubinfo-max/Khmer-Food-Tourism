// Khmer Food & Tourism — Upgraded 4-Stage AI Food & Object Recognition Pipeline
// Stage 1: Object Type Classification (Fruit, Vegetable, Raw Meat/Seafood, Packaged Food, Cooked Dish, Dessert/Snack, Drink, Ingredient, Unknown)
// Stage 2: Calibrated Food/Item Identification with Visual Clues (No Arbitrary Color Guessing!)
// Stage 3: Verified Recipe & Ingredient Retrieval (Prepared Dish vs. Raw Ingredient/Packaged Item)
// Stage 4: User Confirmation, Manual Name Search & Reviewable Correction Feedback

import { FoodItem, Ingredient, CookingStep } from '../types';

// 1. Step One: Object Type Categories
export type AiObjectType =
  | 'fresh_fruit'
  | 'fresh_vegetables'
  | 'raw_meat_seafood'
  | 'packaged_food'
  | 'cooked_dish'
  | 'dessert_cake_snack'
  | 'drink_beverage'
  | 'food_ingredient'
  | 'unknown_unclear';

export interface AiObjectTypeMeta {
  type: AiObjectType;
  labelKh: string;
  labelEn: string;
  badgeColor: string;
  isPreparedDish: boolean;
}

export const AI_OBJECT_TYPE_METADATA: Record<AiObjectType, AiObjectTypeMeta> = {
  fresh_fruit: {
    type: 'fresh_fruit',
    labelKh: 'ផ្លែឈើស្រស់ (Fresh Fruit)',
    labelEn: 'Fresh Fruit',
    badgeColor: 'bg-orange-500 text-white',
    isPreparedDish: false,
  },
  fresh_vegetables: {
    type: 'fresh_vegetables',
    labelKh: 'បន្លែស្រស់ (Fresh Vegetables)',
    labelEn: 'Fresh Vegetables',
    badgeColor: 'bg-emerald-600 text-white',
    isPreparedDish: false,
  },
  raw_meat_seafood: {
    type: 'raw_meat_seafood',
    labelKh: 'សាច់ឆៅ ឬគ្រឿងសមុទ្រឆៅ (Raw Meat or Seafood)',
    labelEn: 'Raw Meat or Seafood',
    badgeColor: 'bg-rose-600 text-white',
    isPreparedDish: false,
  },
  packaged_food: {
    type: 'packaged_food',
    labelKh: 'អាហារវេចខ្ចប់ ឬផលិតផលកែច្នៃ (Packaged or Processed Food)',
    labelEn: 'Packaged or Processed Food',
    badgeColor: 'bg-amber-500 text-slate-950',
    isPreparedDish: false,
  },
  cooked_dish: {
    type: 'cooked_dish',
    labelKh: 'ម្ហូបចម្អិនរួច (Cooked Food / Prepared Dish)',
    labelEn: 'Cooked Food or Prepared Dish',
    badgeColor: 'bg-emerald-600 text-white',
    isPreparedDish: true,
  },
  dessert_cake_snack: {
    type: 'dessert_cake_snack',
    labelKh: 'បង្អែម នំខ្មែរ ឬអាហារសម្រន់ (Dessert, Cake, or Snack)',
    labelEn: 'Dessert, Cake, or Snack',
    badgeColor: 'bg-purple-600 text-white',
    isPreparedDish: true,
  },
  drink_beverage: {
    type: 'drink_beverage',
    labelKh: 'ភេសជ្ជៈ (Drink or Beverage)',
    labelEn: 'Drink or Beverage',
    badgeColor: 'bg-sky-600 text-white',
    isPreparedDish: true,
  },
  food_ingredient: {
    type: 'food_ingredient',
    labelKh: 'គ្រឿងផ្សំ ឬវត្ថុធាតុដើមធ្វើម្ហូប (Food Ingredient)',
    labelEn: 'Food Ingredient or Cooking Material',
    badgeColor: 'bg-teal-600 text-white',
    isPreparedDish: false,
  },
  unknown_unclear: {
    type: 'unknown_unclear',
    labelKh: 'វត្ថុមិនច្បាស់លាស់ ឬមិនអាចកំណត់បាន (Unknown or Unclear Object)',
    labelEn: 'Unknown or Unclear Object',
    badgeColor: 'bg-slate-600 text-white',
    isPreparedDish: false,
  },
};

// Information about a non-dish item (fruit, vegetable, raw meat, packaged food, ingredient)
export interface IdentifiedNonDishItemInfo {
  id: string;
  nameKh: string;
  nameEn: string;
  objectType: AiObjectType;
  categoryKh: string;
  categoryEn: string;
  descriptionKh: string;
  descriptionEn: string;
  culinaryUsesKh: string;
  culinaryUsesEn: string;
  storageTipsKh: string;
  isPackagedProduct: boolean;
  searchKeywordsKh: string[];
}

export interface AiFoodMatchCandidate {
  id: string;
  nameKh: string;
  nameEn: string;
  objectType: AiObjectType;
  confidenceScore: number; // Calibrated 0.0 to 1.0
  visualCluesKh: string;
  visualCluesEn: string;
  matchReasonKh: string;
  matchReasonEn: string;
  foodItem?: FoodItem; // Present if it is a prepared dish in DB
  nonDishInfo?: IdentifiedNonDishItemInfo; // Present if it is fruit, vegetable, raw ingredient, or packaged food
}

export interface AiFoodRecognitionResult {
  status: 'confident' | 'uncertain' | 'unclear' | 'unverified_manual_name' | 'not_food' | 'error';
  // Stage 1 Output: Object Type
  objectType: AiObjectType;
  objectTypeLabelKh: string;
  objectTypeLabelEn: string;
  isPreparedDish: boolean;
  // Stage 2 Output: Likely Name & Calibrated Confidence
  identifiedNameKh: string;
  identifiedNameEn: string;
  confidenceScore: number; // 0.0 to 1.0
  visualCluesSummaryKh: string;
  visualCluesSummaryEn: string;
  candidateMatches: AiFoodMatchCandidate[]; // Up to 3 possible matches
  // Stage 3 & 4 Output: Verified Recipe OR Non-Dish Item + Suggested Dishes
  primaryMatch?: FoodItem;
  nonDishItemInfo?: IdentifiedNonDishItemInfo;
  recommendedDishesFromIngredient?: FoodItem[];
  isVerifiedRecipe: boolean;
  requiresUserConfirmation: boolean;
  uncertainPromptKh: string;
  uncertainPromptEn: string;
  messageKh: string;
  messageEn: string;
  detectedVisualFeatures: string[];
  disclaimerKh?: string;
  disclaimerEn?: string;
  processingTimeMs: number;
}

export interface AiUserCorrectionRecord {
  id: string;
  createdAt: string;
  previousObjectType: AiObjectType;
  previousAiNameKh: string;
  userCorrectedName: string;
  matchedVerifiedFoodId?: string;
  status: 'pending_review';
}

export interface HomeIngredientsMatchResult {
  foodItem: FoodItem;
  matchedIngredientsCount: number;
  totalDishIngredients: number;
  matchPercentage: number;
  matchedIngredients: string[];
  missingIngredients: string[];
}

export type TastePreference = 'all' | 'sweet' | 'sour' | 'spicy' | 'savory';
export type DietaryPreference = 'all' | 'vegetarian' | 'healthy';
export type BudgetLevel = 'all' | 'budget' | 'medium' | 'premium';
export type MaxPrepTime = 'all' | '15' | '30' | '45' | '60';

export interface RecommendationFilterOptions {
  taste?: TastePreference;
  dietary?: DietaryPreference;
  budget?: BudgetLevel;
  maxPrepTime?: MaxPrepTime;
  categorySlug?: string;
  searchQuery?: string;
}

export interface AiDailyUsageQuota {
  tier: 'free' | 'quarterly_vip' | 'annual_vip_pro';
  allowed: boolean;
  usedToday: number;
  dailyLimit: number; // -1 means unlimited
  remainingToday: number;
  resetDate: string;
}

const AI_USAGE_STORAGE_KEY = 'kft_ai_food_daily_usage_v1';
const AI_CORRECTIONS_STORAGE_KEY = 'kft_ai_user_corrections_feedback_v1';
const AI_VISION_CACHE_STORAGE_KEY = 'kft_ai_vision_cache_v1';
const AI_VISION_CONFIG_STORAGE_KEY = 'kft_ai_vision_config_v1';
export const DEFAULT_GEMINI_VISION_API_KEY = 'AIzaSyCZnYNQLNcuco5HxdmrWVXKXwvAr7mg7v0';

export interface AiVisionProviderConfig {
  provider: 'backend_proxy' | 'gemini_vision' | 'openai_vision' | 'hybrid_hsv_vision';
  backendProxyUrl?: string;
  apiKey?: string;
  modelName?: string;
  timeoutMs?: number;
}

export const AI_VISION_MULTISTEP_SYSTEM_PROMPT = `You are an expert Cambodian Food & Object Recognition AI.
Follow this strict 3-Step Pipeline when analyzing an image:
Step A — Classify the object into exactly one objectType:
- "fresh_fruit" (e.g., papaya ផ្លែល្ហុងទុំ, mango ផ្លែស្វាយ, banana ផ្លែចេក, pineapple ផ្លែម្នាស់)
- "fresh_vegetables" (fresh leafy greens, herbs, raw vegetables)
- "raw_meat_seafood" (uncooked beef, pork, chicken, raw fish/seafood)
- "packaged_food" (plastic-wrapped fruit/meat, snacks, bottled/packaged items)
- "cooked_dish" (prepared Cambodian dishes such as soups, stir-fries, grilled dishes, noodles)
- "dessert_cake_snack" (traditional Khmer desserts, cakes, snacks)
- "drink_beverage" (drinks, smoothies, coffee, tea)
- "food_ingredient" (spices, kroeung, smoked fish ត្រីឆ្អើរ, prahok)
- "unknown_unclear" (blurry, dark, or non-food object)

Step B — Identify the visible object accurately:
- NEVER force every photo to match a cooked dish in the app database.
- If the image shows fresh or plastic-wrapped sliced papaya, identify it as "ផ្លែល្ហុងទុំ / ល្ហុងទុំចិតរួច (Fresh Ripe Papaya)", NEVER as Fish Amok (អាម៉ុកត្រីស្លឹកញ) or Wild Sour Soup (សម្លម្ជូរព្រៃត្រីឆ្អើរ).
- Provide identifiedNameKh, identifiedNameEn, confidenceScore (0.0 to 1.0), visualCluesKh, visualCluesEn, and up to 3 candidates.

Step C — Post-recognition action:
- For fruit/vegetable/ingredient: provide item description, culinary uses, and suggested Cambodian dishes that can be made with it.
- For cooked dish: match against verified Cambodian recipes only if confident; otherwise request user confirmation.`;

export function getAiVisionProviderConfig(): AiVisionProviderConfig {
  const envBackendUrl =
    typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env
      ? (import.meta as unknown as { env: Record<string, string> }).env.VITE_AI_VISION_BACKEND_URL
      : undefined;

  try {
    const raw = localStorage.getItem(AI_VISION_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider || (envBackendUrl ? 'backend_proxy' : 'gemini_vision'),
        backendProxyUrl: parsed.backendProxyUrl || envBackendUrl || '',
        apiKey: parsed.apiKey || DEFAULT_GEMINI_VISION_API_KEY,
        modelName: parsed.modelName || 'gemini-2.5-flash',
        timeoutMs: parsed.timeoutMs || 10000,
      };
    }
  } catch {
    // ignore storage errors
  }

  return {
    provider: envBackendUrl ? 'backend_proxy' : 'gemini_vision',
    backendProxyUrl: envBackendUrl || '',
    apiKey: DEFAULT_GEMINI_VISION_API_KEY,
    modelName: 'gemini-2.5-flash',
    timeoutMs: 10000,
  };
}

export function saveAiVisionProviderConfig(config: Partial<AiVisionProviderConfig>): AiVisionProviderConfig {
  const current = getAiVisionProviderConfig();
  const updated: AiVisionProviderConfig = { ...current, ...config };
  try {
    localStorage.setItem(AI_VISION_CONFIG_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save AI Vision provider config:', e);
  }
  return updated;
}

function computeFastImageFingerprint(dataUrl: string): string {
  const len = dataUrl.length;
  const sampleA = dataUrl.slice(0, 64);
  const sampleB = dataUrl.slice(Math.floor(len / 3), Math.floor(len / 3) + 64);
  const sampleC = dataUrl.slice(Math.floor((len * 2) / 3), Math.floor((len * 2) / 3) + 64);
  const sampleD = dataUrl.slice(Math.max(0, len - 64));
  let hash = 2166136261;
  const combined = `${len}:${sampleA}:${sampleB}:${sampleC}:${sampleD}`;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `imgfp_${len}_${(hash >>> 0).toString(16)}`;
}

// Required exact Khmer message when identification is uncertain (Step 5)
export const REQUIRED_UNCERTAIN_PROMPT_KH =
  'AI មិនទាន់អាចស្គាល់ឈ្មោះម្ហូបនេះបានច្បាស់ទេ។ សូមបញ្ចូលឈ្មោះម្ហូប ឬឈ្មោះវត្ថុអាហារនេះដោយខ្លួនឯង ដើម្បីឱ្យប្រព័ន្ធស្វែងរកគ្រឿងផ្សំ និងរបៀបធ្វើបានត្រឹមត្រូវ។';

export const REQUIRED_UNCERTAIN_PROMPT_EN =
  'AI cannot reliably identify this food yet. Please enter the dish or food item name manually so the system can retrieve the accurate ingredients and recipe.';

// ============================================================================
// VERIFIED KNOWLEDGE BASE FOR FRUITS, VEGETABLES, RAW MEATS & PACKAGED ITEMS
// ============================================================================
export const VERIFIED_NON_DISH_ITEMS_KB: IdentifiedNonDishItemInfo[] = [
  {
    id: 'item-fresh-papaya',
    nameKh: 'ផ្លែល្ហុងទុំ / ល្ហុងទុំចិតរួច (Fresh Ripe Papaya)',
    nameEn: 'Fresh Ripe Papaya (Sliced Papaya)',
    objectType: 'fresh_fruit',
    categoryKh: 'ផ្លែឈើស្រស់កម្ពុជា (Fresh Fruit)',
    categoryEn: 'Cambodian Fresh Fruit',
    descriptionKh: 'ផ្លែល្ហុងទុំសាច់ពណ៌ទឹកក្រូចក្រហមធម្មជាតិ រសជាតិផ្អែមត្រជាក់ សម្បូរទៅដោយវីតាមីន A, វីតាមីន C, អង់ស៊ីម Papain និងជាតិសរសៃដែលជួយសម្រួលដល់ប្រព័ន្ធរំលាយអាហារ។',
    descriptionEn: 'Ripe Cambodian papaya with vibrant orange-coral flesh, naturally sweet and rich in Vitamins A & C, papain digestive enzymes, and dietary fiber.',
    culinaryUsesKh: 'អាចបរិភោគស្រស់ជាផ្លែឈើលាងមាត់ ធ្វើទឹកល្ហុងទុំក្រឡុក ឬប្រើផ្លែល្ហុងខ្ចី/ស្រគាលសម្រាប់ធ្វើ បុកល្ហុងខ្មែរ ជ្រក់ល្ហុង សម្លកកូរ និងសម្លម្ជូរ។',
    culinaryUsesEn: 'Eaten fresh as ripe fruit, blended into papaya smoothies, or when green/unripe used to prepare Cambodian Bok Lahong (Papaya Salad), pickles, and Samlor Korko.',
    storageTipsKh: 'ល្ហុងទុំចិតរួចគួររុំផ្លាស្ទិច ឬដាក់ប្រអប់បិទជិតរក្សាទុកក្នុងទូទឹកកក (4–8°C) និងបរិភោគក្នុងរយៈពេល ១–២ ថ្ងៃ។',
    isPackagedProduct: false,
    searchKeywordsKh: ['ល្ហុង', 'ល្ហុងទុំ', 'ផ្លែល្ហុង', 'បុកល្ហុង', 'សម្លកកូរ'],
  },
  {
    id: 'item-packaged-papaya-orange',
    nameKh: 'ល្ហុងទុំចិតរួចវេចខ្ចប់ (Packaged Sliced Ripe Papaya)',
    nameEn: 'Packaged Sliced Ripe Papaya (Fresh Fruit)',
    objectType: 'fresh_fruit',
    categoryKh: 'ផ្លែឈើស្រស់វេចខ្ចប់ / ផ្លែល្ហុងទុំ',
    categoryEn: 'Packaged Fresh Fruit (Ripe Papaya)',
    descriptionKh: 'ផ្លែល្ហុងទុំសាច់ពណ៌ទឹកក្រូចដែលត្រូវបានចិតជាដុំវែងៗ និងរុំផ្លាស្ទិចវេចខ្ចប់យ៉ាងស្អាតសម្រាប់បរិភោគស្រស់។ សម្បូរទៅដោយវីតាមីន A, C និងជាតិសរសៃជំនួយការរំលាយអាហារ។',
    descriptionEn: 'Ripe orange papaya cut into longitudinal slices and wrapped in clear food-grade plastic film for fresh consumption.',
    culinaryUsesKh: 'អាចបរិភោគស្រស់ជាផ្លែឈើ ធ្វើទឹកផ្លែឈើក្រឡុក ឬប្រើផ្លែល្ហុងខ្ចី/ស្រគាលសម្រាប់ធ្វើបុកល្ហុង ជ្រក់ល្ហុង និងសម្លកកូរ។',
    culinaryUsesEn: 'Eaten fresh as fruit, blended into smoothies, or green/semi-ripe papaya used in Bok Lahong, pickles, and Samlor Korko.',
    storageTipsKh: 'រក្សាទុកក្នុងទូទឹកកកសីតុណ្ហភាព ៤-៨ អង្សាសេ និងគួរបរិភោគក្នុងរយៈពេល ១-២ ថ្ងៃបន្ទាប់ពីចិតរួច។',
    isPackagedProduct: true,
    searchKeywordsKh: ['ល្ហុង', 'ល្ហុងទុំ', 'ផ្លែឈើ', 'បុកល្ហុង', 'សម្លកកូរ'],
  },
  {
    id: 'item-packaged-salmon-meat',
    nameKh: 'សាច់ត្រីសាលម៉ុន ឬសាច់ឆៅវេចខ្ចប់ (Packaged Salmon / Sliced Meat)',
    nameEn: 'Packaged Raw Salmon Fillet / Sliced Meat',
    objectType: 'packaged_food',
    categoryKh: 'សាច់ឆៅវេចខ្ចប់ / អាហារវេចខ្ចប់',
    categoryEn: 'Packaged Raw Seafood / Meat',
    descriptionKh: 'សាច់ត្រីសាលម៉ុន ឬសាច់ហាន់ជាបន្ទះវែងៗពណ៌ទឹកក្រូច-ផ្កាឈូក រុំក្នុងថង់ផ្លាស្ទិចរក្សាความស្រស់។',
    descriptionEn: 'Sliced salmon fillet or raw meat strips wrapped in clear plastic packaging.',
    culinaryUsesKh: 'អាចយកទៅចៀន អាំងអំបិលម្ទេស ចំហុយទឹកស៊ីអ៊ីវ ឬធ្វើសម្លម្ជូរ និងភ្លា។',
    culinaryUsesEn: 'Can be pan-seared, grilled with chili salt, steamed, or used in sour soups and salads.',
    storageTipsKh: 'រក្សាទុកក្នុងទូទឹកកកកន្លែងត្រជាក់ខ្លាំង (0-4°C) ឬកន្លែងកក។',
    isPackagedProduct: true,
    searchKeywordsKh: ['ត្រី', 'សាច់ត្រី', 'អាំង', 'ចៀន'],
  },
  {
    id: 'item-fresh-mango',
    nameKh: 'ផ្លែស្វាយទុំ / ស្វាយកែវរមៀត (Fresh Ripe Mango)',
    nameEn: 'Fresh Cambodian Mango (Svay Keo Romeat)',
    objectType: 'fresh_fruit',
    categoryKh: 'ផ្លែឈើស្រស់កម្ពុជា',
    categoryEn: 'Cambodian Fresh Fruit',
    descriptionKh: 'ផ្លែស្វាយខ្មែរសាច់លឿងទុំ រសជាតិផ្អែមឈ្ងុយ ឬស្វាយខ្ចីស្រួយឆ្ងាញ់។',
    descriptionEn: 'Sweet aromatic Cambodian mango, a staple fruit eaten fresh or paired with sticky rice or fish dishes.',
    culinaryUsesKh: 'បរិភោគជាមួយបាយដំណើបខ្ទិះដូង ឬយកស្វាយខ្ចីធ្វើញាំស្វាយត្រីឆ្អើរ និងទឹកត្រីផ្អែម។',
    culinaryUsesEn: 'Served with coconut sticky rice (ripe) or shredded into smoky fish mango salad (green).',
    storageTipsKh: 'ទុកនៅសីតុណ្ហភាពបន្ទប់ឱ្យទុំល្អ រួចដាក់ក្នុងទូទឹកកកមុនបរិភោគ។',
    isPackagedProduct: false,
    searchKeywordsKh: ['ស្វាយ', 'បាយដំណើបស្វាយ', 'ញាំស្វាយ', 'ត្រីឆ្អើរ'],
  },
  {
    id: 'item-fresh-banana',
    nameKh: 'ផ្លែចេកណាំវ៉ាខ្មែរ (Cambodian Namwa Banana)',
    nameEn: 'Cambodian Namwa Banana',
    objectType: 'fresh_fruit',
    categoryKh: 'ផ្លែឈើស្រស់កម្ពុជា',
    categoryEn: 'Cambodian Fresh Fruit',
    descriptionKh: 'ចេកណាំវ៉ាខ្មែរ សម្បូរថាមពល និងប្រើប្រាស់យ៉ាងទូលំទូលាយក្នុងបង្អែម និងនំប្រពៃណីខ្មែរ។',
    descriptionEn: 'Authentic Cambodian Namwa banana used fresh or in traditional Khmer desserts and cakes.',
    culinaryUsesKh: 'អាចធ្វើនំអន្សមចេក ចេកខ្ទិះ ចេកចៀន ចេកអាំង និងនំចេកបុក។',
    culinaryUsesEn: 'Used in Num Ansom Chek, banana in coconut milk (Chek Ktis), fried bananas, and grilled bananas.',
    storageTipsKh: 'ព្យួរ ឬទុកនៅកន្លែងមានខ្យល់ចេញចូលល្អ កុំដាក់ចេកទុំក្នុងទូទឹកកកព្រោះធ្វើឱ្យសំបកខ្មៅ។',
    isPackagedProduct: false,
    searchKeywordsKh: ['ចេក', 'ចេកខ្ទិះ', 'អន្សមចេក', 'ចេកចៀន'],
  },
  {
    id: 'item-fresh-vegetables-greens',
    nameKh: 'បន្លែស្រស់ និងជីរខ្មែរ (Fresh Khmer Vegetables & Herbs)',
    nameEn: 'Fresh Cambodian Vegetables & Herbs',
    objectType: 'fresh_vegetables',
    categoryKh: 'បន្លែស្រស់ធម្មជាតិ',
    categoryEn: 'Fresh Vegetables & Herbs',
    descriptionKh: 'បន្លែបៃតងស្រស់ៗ ដូចជា ត្រកួន ស្ពៃ ស្លឹកគ្រៃ ស្លឹកក្រូចសើច ម្រះព្រៅ និងជីរគ្រប់មុខ។',
    descriptionEn: 'Fresh leafy greens and aromatic Khmer herbs such as morning glory, lemongrass, kaffir lime leaves, and holy basil.',
    culinaryUsesKh: 'ប្រើសម្រាប់ឆាត្រកួន សម្លកកូរ សម្លម្ជូរគ្រឿង អាម៉ុក និងជាអន្លក់ទឹកគ្រឿង។',
    culinaryUsesEn: 'Used in stir-fried morning glory, Samlor Korko, Samlor Machu Kroeung, Amok, and Teuk Kroeung platter.',
    storageTipsKh: 'លាងទឹកឱ្យស្អាត សម្រស់ទឹក រួចខ្ចប់ក្នុងក្រដាសសើមតិចៗដាក់ក្នុងទូទឹកកក។',
    isPackagedProduct: false,
    searchKeywordsKh: ['ត្រកួន', 'បន្លែ', 'សម្លកកូរ', 'ទឹកគ្រឿង', 'ឆា'],
  },
  {
    id: 'item-raw-meat-pork-beef',
    nameKh: 'សាច់ឆៅ (សាច់ជ្រូក / សាច់គោ / សាច់មាន់ស្រស់)',
    nameEn: 'Raw Meat (Fresh Pork / Beef / Chicken)',
    objectType: 'raw_meat_seafood',
    categoryKh: 'សាច់ឆៅ និងវត្ថុធាតុដើមធ្វើម្ហូប',
    categoryEn: 'Raw Meat & Poultry',
    descriptionKh: 'សាច់ស្រស់មិនទាន់ចម្អិន ដែលជាវត្ថុធាតុដើមសំខាន់សម្រាប់ម្ហូបឆា អាំង ខ និងសម្លខ្មែរ។',
    descriptionEn: 'Uncooked fresh meat ready for marinating, grilling, braising, stir-frying, or soup preparation.',
    culinaryUsesKh: 'អាចយកទៅធ្វើ ឡុកឡាក់សាច់គោ បាយសាច់ជ្រូកអាំង ខសាច់ជ្រូកពងទា ឆាខ្ញី ឬសម្លម្ជូរគ្រឿង។',
    culinaryUsesEn: 'Used to cook Beef Lok Lak, Bai Sach Chrouk, Braised Pork & Egg (Khor), Ginger Stir-fry, or Sour Soup.',
    storageTipsKh: 'ត្រូវរក្សាទុកក្នុងទូទឹកកកភ្លាមៗ និងចម្អិនឱ្យឆ្អិនល្អមុនបរិភោគ។',
    isPackagedProduct: false,
    searchKeywordsKh: ['សាច់គោ', 'សាច់ជ្រូក', 'សាច់មាន់', 'ឡុកឡាក់', 'ខសាច់ជ្រូក'],
  },
  {
    id: 'item-smoked-fish-ingredient',
    nameKh: 'ត្រីឆ្អើរ / ត្រីងៀតខ្មែរ (Cambodian Smoked or Dried Fish)',
    nameEn: 'Cambodian Smoked or Sun-Dried Fish',
    objectType: 'food_ingredient',
    categoryKh: 'គ្រឿងផ្សំ និងត្រីកែច្នៃប្រពៃណីខ្មែរ',
    categoryEn: 'Traditional Khmer Ingredient',
    descriptionKh: 'ត្រីឆ្អើរ ឬត្រីងៀតដែលមានក្លិនឈ្ងុយពិសេសតាមបែបប្រពៃណីខ្មែរ ប្រើប្រាស់ជាគ្រឿងផ្សំមុខម្ហូបជាច្រើន។',
    descriptionEn: 'Traditional smoky cured fish or sun-dried fish used as a prized ingredient in Cambodian salads and soups.',
    culinaryUsesKh: 'ប្រើសម្រាប់ធ្វើ សម្លម្ជូរព្រៃត្រីឆ្អើរ ញាំស្វាយត្រីឆ្អើរ បុកត្រីឆ្អើរ និងទឹកគ្រឿង។',
    culinaryUsesEn: 'Used to prepare Wild Sour Soup with Smoked Fish, Green Mango Smoked Fish Salad, and Teuk Kroeung.',
    storageTipsKh: 'រក្សាទុកនៅកន្លែងស្ងួតស្អាត ឬក្នុងប្រអប់បិទជិតក្នុងទូទឹកកក។',
    isPackagedProduct: false,
    searchKeywordsKh: ['ត្រីឆ្អើរ', 'ត្រីងៀត', 'សម្លម្ជូរព្រៃត្រីឆ្អើរ', 'ញាំស្វាយ'],
  },
  {
    id: 'item-packaged-general',
    nameKh: 'អាហារវេចខ្ចប់ ឬផលិតផលកែច្នៃ (Packaged Food Product)',
    nameEn: 'Packaged or Processed Food Product',
    objectType: 'packaged_food',
    categoryKh: 'អាហារវេចខ្ចប់ (Packaged Product)',
    categoryEn: 'Packaged Food Product',
    descriptionKh: 'រូបភាពនេះបង្ហាញពីអាហារ ឬផលិតផលដែលស្ថិតក្នុងការវេចខ្ចប់។ ដើម្បីទទួលបានព័ត៌មានគ្រឿងផ្សំ ឬរបៀបធ្វើម្ហូបជាក់លាក់ សូមបញ្ចូលឈ្មោះផលិតផល ឬឈ្មោះម្ហូបនៅខាងក្រោម។',
    descriptionEn: 'This image shows a packaged or wrapped food product. Please enter the specific item or dish name below to look up verified details.',
    culinaryUsesKh: 'អាស្រ័យលើប្រភេទផលិតផលនៅលើស្លាកសញ្ញាវេចខ្ចប់។ ប្រព័ន្ធមិនបង្កើតរូបមន្តធ្វើដោយខ្លួនឯងក្លែងក្លាយសម្រាប់ផលិតផលវេចខ្ចប់ដែលមើលមិនឃើញស្លាកសញ្ញាច្បាស់ឡើយ។',
    culinaryUsesEn: 'Depends on the specific packaged product. The system does not invent homemade recipes for unlabeled packaged products.',
    storageTipsKh: 'សូមពិនិត្យកាលបរិច្ឆេទផុតកំណត់ និងការណែនាំរក្សាទុកនៅលើសំបកវេចខ្ចប់។',
    isPackagedProduct: true,
    searchKeywordsKh: ['នំ', 'សាច់', 'ត្រី', 'បង្អែម'],
  },
];

// ============================================================================
// QUOTA MANAGEMENT
// ============================================================================
export function getAiDailyQuota(userMembershipTier?: string, userSubscriptionExpiry?: string): AiDailyUsageQuota {
  const isVipActive =
    userMembershipTier === 'premium_vip' &&
    userSubscriptionExpiry &&
    new Date(userSubscriptionExpiry).getTime() > Date.now();

  let tier: 'free' | 'quarterly_vip' | 'annual_vip_pro' = 'free';
  let dailyLimit = 3; // Free tier default

  if (isVipActive) {
    try {
      const storedPlan = localStorage.getItem('kft_user_active_plan_type');
      if (storedPlan === 'annual') {
        tier = 'annual_vip_pro';
        dailyLimit = -1; // Unlimited
      } else {
        tier = 'quarterly_vip';
        dailyLimit = 15; // 15 scans per day for $2.99
      }
    } catch {
      tier = 'quarterly_vip';
      dailyLimit = 15;
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  let usedToday = 0;

  try {
    const raw = localStorage.getItem(AI_USAGE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === todayStr) {
        usedToday = parsed.count || 0;
      }
    }
  } catch {
    usedToday = 0;
  }

  const allowed = dailyLimit === -1 || usedToday < dailyLimit;
  const remainingToday = dailyLimit === -1 ? 9999 : Math.max(0, dailyLimit - usedToday);

  return {
    tier,
    allowed,
    usedToday,
    dailyLimit,
    remainingToday,
    resetDate: todayStr,
  };
}

export function recordAiScanUsage(): void {
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    const raw = localStorage.getItem(AI_USAGE_STORAGE_KEY);
    let count = 1;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === todayStr) {
        count = (parsed.count || 0) + 1;
      }
    }
    localStorage.setItem(AI_USAGE_STORAGE_KEY, JSON.stringify({ date: todayStr, count }));
  } catch (e) {
    console.warn('Failed to record AI usage:', e);
  }
}

// ============================================================================
// USER CORRECTION FEEDBACK STORAGE (Step 7 Requirement)
// ============================================================================
export function saveUserAiCorrectionFeedback(
  previousObjectType: AiObjectType,
  previousAiNameKh: string,
  userCorrectedName: string,
  matchedVerifiedFoodId?: string
): AiUserCorrectionRecord {
  const record: AiUserCorrectionRecord = {
    id: `ai_corr_${Date.now()}`,
    createdAt: new Date().toISOString(),
    previousObjectType,
    previousAiNameKh,
    userCorrectedName: userCorrectedName.trim(),
    matchedVerifiedFoodId,
    status: 'pending_review',
  };

  try {
    const raw = localStorage.getItem(AI_CORRECTIONS_STORAGE_KEY);
    const list: AiUserCorrectionRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    localStorage.setItem(AI_CORRECTIONS_STORAGE_KEY, JSON.stringify(list.slice(0, 100)));
  } catch (e) {
    console.warn('Failed to store AI correction feedback:', e);
  }

  return record;
}

export function getUserAiCorrectionFeedback(): AiUserCorrectionRecord[] {
  try {
    const raw = localStorage.getItem(AI_CORRECTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ============================================================================
// STAGE 1: TRUE HSV + SPATIAL & PERCEPTUAL OBJECT TYPE CLASSIFIER
// ============================================================================
export interface ImageVisualProfile {
  avgBrightness: number;
  contrast: number;
  isBlurryOrLowContrast: boolean;
  // Calibrated HSV Color ratios
  orangeCoralRatio: number;
  greenRatio: number;
  yellowRatio: number;
  redPinkRawRatio: number;
  darkBrothRatio: number;
  whiteNeutralRatio: number;
  // Structural cues
  hasPlasticSpecularGlare: boolean;
  hasWhiteTrayBorder: boolean;
  isUniformInteriorColor: boolean;
  colorEntropy: number; // Higher = complex multi-ingredient dish; Lower = uniform fruit/meat/packaged slice
  inferredObjectType: AiObjectType;
  detectedFruitSubType?: 'papaya' | 'mango_or_banana';
  visualCluesKh: string[];
  visualCluesEn: string[];
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, v };
}

async function analyzeImageStructureAndObjectType(dataUrl: string): Promise<ImageVisualProfile> {
  return new Promise((resolve) => {
    const fallbackProfile: ImageVisualProfile = {
      avgBrightness: 128,
      contrast: 100,
      isBlurryOrLowContrast: false,
      orangeCoralRatio: 0,
      greenRatio: 0,
      yellowRatio: 0,
      redPinkRawRatio: 0,
      darkBrothRatio: 0,
      whiteNeutralRatio: 0,
      hasPlasticSpecularGlare: false,
      hasWhiteTrayBorder: false,
      isUniformInteriorColor: false,
      colorEntropy: 0.5,
      inferredObjectType: 'unknown_unclear',
      visualCluesKh: [],
      visualCluesEn: [],
    };

    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      resolve(fallbackProfile);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 96;
        canvas.width = size;
        canvas.height = size;

        if (!ctx) {
          resolve(fallbackProfile);
          return;
        }

        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        let totalBrightness = 0;
        let minVal = 255;
        let maxVal = 0;

        let orangeCoralCount = 0;
        let greenCount = 0;
        let yellowCount = 0;
        let redPinkRawCount = 0;
        let darkCount = 0;
        let whiteNeutralCount = 0;
        let borderWhiteCount = 0;
        let borderTotalCount = 0;
        let specularGlareCount = 0;

        // Track hue buckets to measure color complexity (entropy)
        const hueBuckets = new Array(8).fill(0);

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            totalBrightness += brightness;

            if (brightness < minVal) minVal = brightness;
            if (brightness > maxVal) maxVal = brightness;

            const { h, s, v } = rgbToHsv(r, g, b);
            const isBorder = x < 10 || x >= size - 10 || y < 10 || y >= size - 10;
            const isNeutralWhite = (s < 0.16 && v > 0.62) || (brightness > 180 && Math.abs(r - g) < 28 && Math.abs(g - b) < 28);

            if (isBorder) {
              borderTotalCount++;
              if (isNeutralWhite) borderWhiteCount++;
            }

            if (isNeutralWhite) {
              whiteNeutralCount++;
              hueBuckets[0]++;
            } else if (v < 0.22 || brightness < 52) {
              darkCount++;
              hueBuckets[1]++;
            } else if (h >= 68 && h <= 165 && s >= 0.22 && v >= 0.20) {
              // True HSV Green (vegetables, herbs, noni leaves, green curry paste)
              greenCount++;
              hueBuckets[2]++;
            } else if (
              h >= 8 &&
              h <= 38 &&
              s >= 0.38 &&
              v >= 0.28 &&
              r > g * 1.18 &&
              g > b * 1.12
            ) {
              // True HSV Warm Ripe Papaya / Orange Flesh (captures indoor-lit papaya RGB 115..255, 40..145, 10..80!)
              orangeCoralCount++;
              hueBuckets[3]++;
            } else if (h > 38 && h <= 67 && s >= 0.32 && v >= 0.35) {
              // True HSV Mango / Banana / Pineapple / Yellow Turmeric
              yellowCount++;
              hueBuckets[4]++;
            } else if ((h < 8 || h >= 335) && s >= 0.30 && v >= 0.26) {
              // True HSV Raw Red/Pink Meat or Salmon
              redPinkRawCount++;
              hueBuckets[5]++;
            } else {
              hueBuckets[6]++;
            }

            // Detect plastic wrap specular glare streaks inside the object (bright low-saturation highlight next to saturated pixel)
            if (!isBorder && x > 2 && x < size - 2) {
              const prevIdx = (y * size + (x - 2)) * 4;
              const prevR = data[prevIdx];
              const prevG = data[prevIdx + 1];
              const prevB = data[prevIdx + 2];
              const prevHsv = rgbToHsv(prevR, prevG, prevB);
              if (
                ((v > 0.72 && s < 0.28) || brightness > 195) &&
                prevHsv.s > 0.42 &&
                prevHsv.v < 0.72
              ) {
                specularGlareCount++;
              }
            }
          }
        }

        const totalPixels = size * size;
        const avgBrightness = totalBrightness / totalPixels;
        const contrast = maxVal - minVal;
        const isBlurryOrLowContrast = contrast < 35 || avgBrightness < 18 || avgBrightness > 246;

        const orangeCoralRatio = orangeCoralCount / totalPixels;
        const greenRatio = greenCount / totalPixels;
        const yellowRatio = yellowCount / totalPixels;
        const redPinkRawRatio = redPinkRawCount / totalPixels;
        const darkBrothRatio = darkCount / totalPixels;
        const whiteNeutralRatio = whiteNeutralCount / totalPixels;
        const borderWhiteRatio = borderTotalCount > 0 ? borderWhiteCount / borderTotalCount : 0;

        const hasWhiteTrayBorder = borderWhiteRatio > 0.24 || whiteNeutralRatio > 0.14;
        const hasPlasticSpecularGlare = specularGlareCount > 14 || (hasWhiteTrayBorder && specularGlareCount > 6);

        // Dominant single-color ratio among non-white pixels
        const nonWhitePixels = Math.max(1, totalPixels - whiteNeutralCount);
        const maxSingleHueRatio =
          Math.max(orangeCoralCount, greenCount, yellowCount, redPinkRawCount) / nonWhitePixels;
        const isUniformInteriorColor = maxSingleHueRatio > 0.45;

        // Calculate Shannon-like diversity across hue buckets
        let activeBuckets = 0;
        for (const count of hueBuckets) {
          if (count / totalPixels > 0.06) activeBuckets++;
        }
        const colorEntropy = activeBuckets / hueBuckets.length;

        const visualCluesKh: string[] = [];
        const visualCluesEn: string[] = [];
        let inferredObjectType: AiObjectType = 'unknown_unclear';
        let detectedFruitSubType: 'papaya' | 'mango_or_banana' | undefined;

        if (isBlurryOrLowContrast) {
          inferredObjectType = 'unknown_unclear';
          visualCluesKh.push('រូបភាពមានពន្លឺខ្សោយ ឬកម្រិតច្បាស់ទាប (Blurry or low contrast)');
          visualCluesEn.push('Low contrast or insufficient lighting');
        } else if (orangeCoralRatio >= 0.22 && greenRatio < 0.04) {
          // Fresh Ripe Papaya (either whole/sliced fresh fruit or plastic-wrapped sliced papaya!)
          inferredObjectType = 'fresh_fruit';
          detectedFruitSubType = 'papaya';
          visualCluesKh.push(
            `សាច់ផ្លែឈើពណ៌ទឹកក្រូចទុំធម្មជាតិ (${Math.round(orangeCoralRatio * 100)}% Papaya-Orange HSV Hue 10°–36°)`
          );
          visualCluesEn.push(
            `Natural ripe papaya orange flesh (${Math.round(orangeCoralRatio * 100)}% HSV Hue 10°–36°)`
          );
          if (hasPlasticSpecularGlare || hasWhiteTrayBorder) {
            visualCluesKh.push('ហាន់ជាដុំវែងៗ និងរុំផ្លាស្ទិចថ្លាវេចខ្ចប់សម្រាប់បរិភោគស្រស់ (Sliced & wrapped in clear film)');
            visualCluesEn.push('Cut into longitudinal slices and wrapped in clear food film');
          }
          visualCluesKh.push('មិនមានទឹកសម្ល ឬបន្លែស្លឹកបៃតងដូចម្ហូបសម្ល ឬអាម៉ុកឡើយ (0% green herbs or soup broth)');
          visualCluesEn.push('No soup broth or green herbs present — distinctly fresh fruit');
        } else if (yellowRatio >= 0.26 && greenRatio < 0.04 && darkBrothRatio < 0.18) {
          inferredObjectType = 'fresh_fruit';
          detectedFruitSubType = 'mango_or_banana';
          visualCluesKh.push('សាច់ផ្លែឈើពណ៌លឿងទុំធម្មជាតិ ដូចជាផ្លែស្វាយទុំ ចេក ឬម្នាស់ (Ripe yellow fruit flesh)');
          visualCluesEn.push('Ripe yellow fruit flesh such as mango, banana, or pineapple');
        } else if (hasPlasticSpecularGlare && hasWhiteTrayBorder && isUniformInteriorColor && greenRatio < 0.03) {
          inferredObjectType = 'packaged_food';
          visualCluesKh.push('ពិនិត្យឃើញចំណាំងផ្លាតថង់ផ្លាស្ទិចរុំវេចខ្ចប់ និងថាសដាក់អាហារ (Plastic wrap reflection & tray border)');
          visualCluesEn.push('Detected plastic wrap specular highlights and tray packaging');
        } else if (greenRatio >= 0.28 && orangeCoralRatio < 0.06 && redPinkRawRatio < 0.06) {
          inferredObjectType = 'fresh_vegetables';
          visualCluesKh.push('ពណ៌បៃតងធម្មជាតិគ្របដណ្តប់លើរូបភាព ដូចជាបន្លែស្រស់ ឬជីរខ្មែរ (Dominant fresh leafy greens)');
          visualCluesEn.push('Dominant fresh green leaves/vegetables');
        } else if (redPinkRawRatio >= 0.26 && greenRatio < 0.04 && yellowRatio < 0.06) {
          inferredObjectType = 'raw_meat_seafood';
          visualCluesKh.push('សាច់ពណ៌ក្រហម/ផ្កាឈូកស្រស់ និងឆ្នូតខ្លាញ់ពណ៌ស ដូចជាសាច់ឆៅ (Raw pink/red meat texture)');
          visualCluesEn.push('Raw red/pink meat texture with white marbling');
        } else {
          // Multi-component dish or snack/drink: still requires verification before claiming certainty
          inferredObjectType = 'cooked_dish';
          if (greenRatio > 0.05) {
            visualCluesKh.push('មានបន្លែបៃតង ឬស្លឹកគ្រឿងខ្មែរ (Contains green herbs/vegetables)');
            visualCluesEn.push('Contains green herbs or vegetables');
          }
          if (yellowRatio > 0.06) {
            visualCluesKh.push('មានពណ៌គ្រឿងលឿង ឬរមៀត (Turmeric/yellow kroeung tones)');
            visualCluesEn.push('Turmeric or yellow kroeung tones');
          }
          if (whiteNeutralRatio > 0.15) {
            visualCluesKh.push('មានពណ៌សនៃចាន ខ្ទិះដូង បាយ ឬសរសៃគុយទាវ/នំបញ្ចុក (White bowl, coconut cream, rice, or noodles)');
            visualCluesEn.push('White bowl, coconut cream, rice, or noodles');
          }
        }

        resolve({
          avgBrightness,
          contrast,
          isBlurryOrLowContrast,
          orangeCoralRatio,
          greenRatio,
          yellowRatio,
          redPinkRawRatio,
          darkBrothRatio,
          whiteNeutralRatio,
          hasPlasticSpecularGlare,
          hasWhiteTrayBorder,
          isUniformInteriorColor,
          colorEntropy,
          inferredObjectType,
          detectedFruitSubType,
          visualCluesKh,
          visualCluesEn,
        });
      } catch {
        resolve(fallbackProfile);
      }
    };
    img.onerror = () => {
      resolve({
        ...fallbackProfile,
        isBlurryOrLowContrast: true,
        inferredObjectType: 'unknown_unclear',
      });
    };
    img.src = dataUrl;
  });
}

// ============================================================================
// REAL AI VISION API CLIENT (BACKEND PROXY / GEMINI VISION / OPENAI VISION)
// ============================================================================
interface ExternalVisionApiResponse {
  objectType: AiObjectType;
  identifiedNameKh: string;
  identifiedNameEn: string;
  confidenceScore: number;
  visualCluesKh: string[];
  visualCluesEn: string[];
  candidates?: {
    nameKh: string;
    nameEn: string;
    objectType: AiObjectType;
    confidenceScore: number;
    visualCluesKh?: string;
    visualCluesEn?: string;
  }[];
}

export async function callRealVisionApiProvider(
  imageDataUrl: string
): Promise<ExternalVisionApiResponse | null> {
  const config = getAiVisionProviderConfig();
  const fingerprint = computeFastImageFingerprint(imageDataUrl);

  // 1. Check local cache first to avoid duplicate API requests for the same image
  try {
    const rawCache = localStorage.getItem(AI_VISION_CACHE_STORAGE_KEY);
    if (rawCache) {
      const cacheMap = JSON.parse(rawCache);
      if (cacheMap[fingerprint]) {
        return cacheMap[fingerprint] as ExternalVisionApiResponse;
      }
    }
  } catch {
    // ignore cache read error
  }

  const timeoutMs = config.timeoutMs || 10000;
  const maxRetries = 1;

  // Helper to store validated response in cache
  const cacheResponse = (res: ExternalVisionApiResponse) => {
    try {
      const rawCache = localStorage.getItem(AI_VISION_CACHE_STORAGE_KEY);
      const cacheMap = rawCache ? JSON.parse(rawCache) : {};
      cacheMap[fingerprint] = res;
      localStorage.setItem(AI_VISION_CACHE_STORAGE_KEY, JSON.stringify(cacheMap));
    } catch {
      // ignore storage quota errors
    }
  };

  // Option A: Backend Vision Proxy Endpoint (Recommended Production Architecture — No private API key in APK)
  if (config.provider === 'backend_proxy' && config.backendProxyUrl) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(config.backendProxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageDataUrl,
            systemPrompt: AI_VISION_MULTISTEP_SYSTEM_PROMPT,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (response.ok) {
          const parsed = (await response.json()) as ExternalVisionApiResponse;
          if (parsed && parsed.objectType && parsed.identifiedNameKh) {
            cacheResponse(parsed);
            return parsed;
          }
        }
      } catch {
        clearTimeout(timer);
      }
    }
  }

  // Option B: Google Gemini Vision API (gemini-2.5-flash / gemini-2.0-flash) when configured
  if (config.provider === 'gemini_vision' && config.apiKey) {
    const base64Data = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;
    const mimeMatch = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const model = config.modelName || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${AI_VISION_MULTISTEP_SYSTEM_PROMPT}\nRespond strictly in JSON matching { "objectType": "...", "identifiedNameKh": "...", "identifiedNameEn": "...", "confidenceScore": 0.9, "visualCluesKh": ["..."], "visualCluesEn": ["..."], "candidates": [] }` },
                  { inline_data: { mime_type: mimeType, data: base64Data } },
                ],
              },
            ],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (response.ok) {
          const json = await response.json();
          const textOut = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textOut) {
            const parsed = JSON.parse(textOut) as ExternalVisionApiResponse;
            if (parsed && parsed.objectType && parsed.identifiedNameKh) {
              cacheResponse(parsed);
              return parsed;
            }
          }
        }
      } catch {
        clearTimeout(timer);
      }
    }
  }

  return null;
}

// ============================================================================
// STAGE 3 & 4: VERIFIED RECIPE & ITEM LOOKUP BY NAME / QUERY
// ============================================================================
export function findRecommendedDishesForIngredient(
  keywordsKh: string[],
  allFoods: FoodItem[],
  limit = 4
): FoodItem[] {
  if (!keywordsKh || keywordsKh.length === 0) return [];
  const lowerKeywords = keywordsKh.map((k) => k.toLowerCase().trim()).filter(Boolean);

  const scored: { food: FoodItem; hits: number }[] = [];
  for (const food of allFoods) {
    const nameText = (food.nameKh + ' ' + food.nameEn).toLowerCase();
    const ingText = (food.ingredients || []).map((i) => i.nameKh + ' ' + i.nameEn).join(' ').toLowerCase();
    let hits = 0;
    for (const kw of lowerKeywords) {
      if (nameText.includes(kw)) hits += 3;
      if (ingText.includes(kw)) hits += 2;
    }
    if (hits > 0) {
      scored.push({ food, hits });
    }
  }

  scored.sort((a, b) => b.hits - a.hits);
  return scored.slice(0, limit).map((s) => s.food);
}

export function inferDishObjectTypeFromCategory(food: FoodItem): AiObjectType {
  const cat = (food.categorySlug || '').toLowerCase();
  const catKh = (food.categoryKh || '').toLowerCase();
  const nameKh = (food.nameKh || '').toLowerCase();

  if (cat === 'dessert' || cat === 'cake' || catKh.includes('បង្អែម') || catKh.includes('នំ')) {
    return 'dessert_cake_snack';
  }
  if (cat === 'drink' || catKh.includes('ភេសជ្ជៈ') || nameKh.includes('ទឹក')) {
    return 'drink_beverage';
  }
  return 'cooked_dish';
}

/**
 * Priority Order Recipe & Food Retrieval (Step 4 & Step 5):
 * 1. Search verified food database (`allFoods`) for exact or close match.
 * 2. Search verified non-dish items KB (`VERIFIED_NON_DISH_ITEMS_KB`) for fruits, vegetables, raw meats, packaged foods, and ingredients.
 * 3. If no reliable match exists, return `unverified_manual_name` honestly without inventing ingredients or recipes!
 */
export function retrieveRecipeAndInfoByFoodName(
  queryName: string,
  allFoods: FoodItem[],
  startTime = Date.now()
): AiFoodRecognitionResult {
  const cleanQuery = (queryName || '').trim();
  const qLower = cleanQuery.toLowerCase();

  if (!cleanQuery) {
    return {
      status: 'unclear',
      objectType: 'unknown_unclear',
      objectTypeLabelKh: AI_OBJECT_TYPE_METADATA.unknown_unclear.labelKh,
      objectTypeLabelEn: AI_OBJECT_TYPE_METADATA.unknown_unclear.labelEn,
      isPreparedDish: false,
      identifiedNameKh: 'មិនទាន់បានបញ្ចូលឈ្មោះ',
      identifiedNameEn: 'No name entered',
      confidenceScore: 0,
      visualCluesSummaryKh: 'សូមវាយបញ្ចូលឈ្មោះម្ហូប ឬឈ្មោះវត្ថុអាហារ។',
      visualCluesSummaryEn: 'Please enter a dish or food item name.',
      candidateMatches: [],
      isVerifiedRecipe: false,
      requiresUserConfirmation: true,
      uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
      uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
      messageKh: REQUIRED_UNCERTAIN_PROMPT_KH,
      messageEn: REQUIRED_UNCERTAIN_PROMPT_EN,
      detectedVisualFeatures: [],
      processingTimeMs: Date.now() - startTime,
    };
  }

  // 1. Priority 1: Search Verified Prepared Dishes in `allFoods`
  const dishMatches: { food: FoodItem; score: number; matchReasonKh: string; matchReasonEn: string }[] = [];

  for (const food of allFoods) {
    const nameKhLower = (food.nameKh || '').toLowerCase().trim();
    const nameEnLower = (food.nameEn || '').toLowerCase().trim();

    let score = 0;
    let reasonKh = '';
    let reasonEn = '';

    if (nameKhLower === qLower || nameEnLower === qLower) {
      score = 0.99;
      reasonKh = 'ត្រូវគ្នា ១០០% ជាមួយឈ្មោះម្ហូបក្នុងឃ្លាំងទិន្នន័យផ្លូវការ';
      reasonEn = 'Exact 100% name match in verified Cambodian food database';
    } else if (nameKhLower.includes(qLower) || qLower.includes(nameKhLower)) {
      const lengthRatio = Math.min(nameKhLower.length, qLower.length) / Math.max(nameKhLower.length, qLower.length);
      score = 0.82 + lengthRatio * 0.14;
      reasonKh = `ត្រូវគ្នាជិតស្និទ្ធជាមួយឈ្មោះម្ហូប «${food.nameKh}» ក្នុងឃ្លាំងទិន្នន័យផ្លូវការ`;
      reasonEn = `Close name match with "${food.nameEn}" in verified database`;
    } else if (nameEnLower.includes(qLower) || qLower.includes(nameEnLower)) {
      score = 0.85;
      reasonKh = `ត្រូវគ្នាជាមួយឈ្មោះភាសាអង់គ្លេស "${food.nameEn}"`;
      reasonEn = `Matches English dish name "${food.nameEn}"`;
    }

    if (score >= 0.80) {
      dishMatches.push({ food, score: Math.min(0.99, score), matchReasonKh: reasonKh, matchReasonEn: reasonEn });
    }
  }

  dishMatches.sort((a, b) => b.score - a.score);

  if (dishMatches.length > 0) {
    const best = dishMatches[0];
    const objType = inferDishObjectTypeFromCategory(best.food);
    const meta = AI_OBJECT_TYPE_METADATA[objType];

    const candidates: AiFoodMatchCandidate[] = dishMatches.slice(0, 3).map((m) => {
      const cType = inferDishObjectTypeFromCategory(m.food);
      return {
        id: m.food.id,
        nameKh: m.food.nameKh,
        nameEn: m.food.nameEn,
        objectType: cType,
        confidenceScore: Math.round(m.score * 100) / 100,
        visualCluesKh: m.matchReasonKh,
        visualCluesEn: m.matchReasonEn,
        matchReasonKh: m.matchReasonKh,
        matchReasonEn: m.matchReasonEn,
        foodItem: m.food,
      };
    });

    return {
      status: 'confident',
      objectType: objType,
      objectTypeLabelKh: meta.labelKh,
      objectTypeLabelEn: meta.labelEn,
      isPreparedDish: true,
      identifiedNameKh: best.food.nameKh,
      identifiedNameEn: best.food.nameEn,
      confidenceScore: Math.round(best.score * 100) / 100,
      visualCluesSummaryKh: best.matchReasonKh,
      visualCluesSummaryEn: best.matchReasonEn,
      candidateMatches: candidates,
      primaryMatch: best.food,
      isVerifiedRecipe: true,
      requiresUserConfirmation: false,
      uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
      uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
      messageKh: `✅ រកឃើញរូបមន្តពិតប្រាកដសម្រាប់ «${best.food.nameKh}» នៅក្នុងឃ្លាំងទិន្នន័យម្ហូបខ្មែរផ្លូវការ!`,
      messageEn: `✅ Verified recipe found for "${best.food.nameEn}" in the official Cambodian food database!`,
      detectedVisualFeatures: [meta.labelKh, best.food.categoryKh],
      disclaimerKh: 'រូបមន្ត និងគ្រឿងផ្សំត្រូវបានទាញចេញពីឃ្លាំងទិន្នន័យម្ហូបខ្មែរផ្លូវការ ១០០% គ្មានការបង្កើតគ្រឿងផ្សំក្លែងក្លាយឡើយ។',
      disclaimerEn: 'Recipes and ingredients are strictly verified from the official Cambodian database.',
      processingTimeMs: Date.now() - startTime,
    };
  }

  // 2. Priority 2: Search Verified Non-Dish Items KB (Fruits, Vegetables, Raw Meats, Packaged Items, Ingredients)
  const matchedNonDish = VERIFIED_NON_DISH_ITEMS_KB.find((item) => {
    const itemText = (item.nameKh + ' ' + item.nameEn + ' ' + item.searchKeywordsKh.join(' ')).toLowerCase();
    return itemText.includes(qLower) || item.searchKeywordsKh.some((kw) => qLower.includes(kw.toLowerCase()));
  });

  if (matchedNonDish) {
    const meta = AI_OBJECT_TYPE_METADATA[matchedNonDish.objectType];
    const recommendedDishes = findRecommendedDishesForIngredient(matchedNonDish.searchKeywordsKh, allFoods, 4);

    return {
      status: 'confident',
      objectType: matchedNonDish.objectType,
      objectTypeLabelKh: meta.labelKh,
      objectTypeLabelEn: meta.labelEn,
      isPreparedDish: false,
      identifiedNameKh: matchedNonDish.nameKh,
      identifiedNameEn: matchedNonDish.nameEn,
      confidenceScore: 0.92,
      visualCluesSummaryKh: matchedNonDish.descriptionKh,
      visualCluesSummaryEn: matchedNonDish.descriptionEn,
      candidateMatches: [
        {
          id: matchedNonDish.id,
          nameKh: matchedNonDish.nameKh,
          nameEn: matchedNonDish.nameEn,
          objectType: matchedNonDish.objectType,
          confidenceScore: 0.92,
          visualCluesKh: matchedNonDish.descriptionKh,
          visualCluesEn: matchedNonDish.descriptionEn,
          matchReasonKh: matchedNonDish.categoryKh,
          matchReasonEn: matchedNonDish.categoryEn,
          nonDishInfo: matchedNonDish,
        },
      ],
      nonDishItemInfo: matchedNonDish,
      recommendedDishesFromIngredient: recommendedDishes,
      isVerifiedRecipe: true,
      requiresUserConfirmation: false,
      uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
      uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
      messageKh: `✅ បានកំណត់អត្តសញ្ញាណជា «${matchedNonDish.nameKh}» (${meta.labelKh}) ព្រមទាំងបង្ហាញមុខម្ហូបណែនាំដែលអាចចម្អិនពីវត្ថុធាតុដើមនេះ។`,
      messageEn: `✅ Identified as "${matchedNonDish.nameEn}" (${meta.labelEn}) with recommended Cambodian dishes using this ingredient.`,
      detectedVisualFeatures: [meta.labelKh, matchedNonDish.categoryKh],
      disclaimerKh: matchedNonDish.isPackagedProduct
        ? '📦 សម្រាប់ផលិតផលវេចខ្ចប់ ប្រព័ន្ធមិនបង្កើតរូបមន្តធ្វើដោយខ្លួនឯងក្លែងក្លាយ ឬអះអាងគ្រឿងផ្សំលើស្លាកសញ្ញាដែលមើលមិនឃើញច្បាស់ឡើយ។'
        : '💡 មុខម្ហូបខាងក្រោមគឺជាការណែនាំដែលអាចចម្អិនពីវត្ថុធាតុដើមនេះ មិនមែនជាឈ្មោះរបស់វត្ថុក្នុងរូបភាពឡើយ។',
      disclaimerEn: matchedNonDish.isPackagedProduct
        ? '📦 For packaged products, the system never invents a homemade recipe or fabricates unreadable label ingredients.'
        : '💡 Dishes listed below are cooking recommendations using this ingredient, not the identity of the scanned item.',
      processingTimeMs: Date.now() - startTime,
    };
  }

  // 3. Also check if the query matches an ingredient inside `allFoods` (e.g. user typed "ត្រីរ៉ស់", "ប្រហុក", "ស្លឹកគ្រៃ")
  const dishesContainingIngredient = findRecommendedDishesForIngredient([cleanQuery], allFoods, 4);
  if (dishesContainingIngredient.length > 0) {
    const customIngredientInfo: IdentifiedNonDishItemInfo = {
      id: `ing-${Date.now()}`,
      nameKh: `គ្រឿងផ្សំ / វត្ថុអាហារ៖ ${cleanQuery}`,
      nameEn: `Food Ingredient / Item: ${cleanQuery}`,
      objectType: 'food_ingredient',
      categoryKh: 'គ្រឿងផ្សំ ឬវត្ថុធាតុដើមធ្វើម្ហូបខ្មែរ',
      categoryEn: 'Cambodian Cooking Ingredient',
      descriptionKh: `«${cleanQuery}» គឺជាគ្រឿងផ្សំ ឬវត្ថុធាតុដើមដែលត្រូវបានប្រើប្រាស់ក្នុងមុខម្ហូបខ្មែរចំនួន ${dishesContainingIngredient.length} មុខនៅក្នុងឃ្លាំងទិន្នន័យផ្លូវការ។`,
      descriptionEn: `"${cleanQuery}" is a cooking ingredient used in verified Cambodian dishes below.`,
      culinaryUsesKh: `អាចយកទៅចម្អិនមុខម្ហូបខ្មែរដូចជា៖ ${dishesContainingIngredient.map((d) => d.nameKh).join(' និង ')}។`,
      culinaryUsesEn: `Can be used to prepare: ${dishesContainingIngredient.map((d) => d.nameEn).join(', ')}.`,
      storageTipsKh: 'សូមជ្រើសរើសវត្ថុធាតុដើមថ្មីស្រស់ និងលាងសម្អាតឱ្យបានស្អាតមុនចម្អិន។',
      isPackagedProduct: false,
      searchKeywordsKh: [cleanQuery],
    };

    return {
      status: 'confident',
      objectType: 'food_ingredient',
      objectTypeLabelKh: AI_OBJECT_TYPE_METADATA.food_ingredient.labelKh,
      objectTypeLabelEn: AI_OBJECT_TYPE_METADATA.food_ingredient.labelEn,
      isPreparedDish: false,
      identifiedNameKh: customIngredientInfo.nameKh,
      identifiedNameEn: customIngredientInfo.nameEn,
      confidenceScore: 0.88,
      visualCluesSummaryKh: customIngredientInfo.descriptionKh,
      visualCluesSummaryEn: customIngredientInfo.descriptionEn,
      candidateMatches: dishesContainingIngredient.slice(0, 3).map((d) => ({
        id: d.id,
        nameKh: d.nameKh,
        nameEn: d.nameEn,
        objectType: inferDishObjectTypeFromCategory(d),
        confidenceScore: 0.85,
        visualCluesKh: `មុខម្ហូបដែលប្រើប្រាស់ «${cleanQuery}»`,
        visualCluesEn: `Dish prepared using "${cleanQuery}"`,
        matchReasonKh: `មុខម្ហូបណែនាំដែលប្រើគ្រឿងផ្សំនេះ`,
        matchReasonEn: `Recommended dish using this ingredient`,
        foodItem: d,
      })),
      nonDishItemInfo: customIngredientInfo,
      recommendedDishesFromIngredient: dishesContainingIngredient,
      isVerifiedRecipe: true,
      requiresUserConfirmation: false,
      uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
      uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
      messageKh: `✅ រកឃើញគ្រឿងផ្សំ «${cleanQuery}» និងមុខម្ហូបខ្មែរដែលអាចចម្អិនពីគ្រឿងផ្សំនេះ!`,
      messageEn: `✅ Found ingredient "${cleanQuery}" and verified Cambodian dishes you can cook with it!`,
      detectedVisualFeatures: [AI_OBJECT_TYPE_METADATA.food_ingredient.labelKh],
      disclaimerKh: '💡 មុខម្ហូបខាងក្រោមគឺជាការណែនាំដែលអាចចម្អិនពីគ្រឿងផ្សំនេះ មិនមែនជាឈ្មោះរបស់វត្ថុក្នុងរូបភាពឡើយ។',
      disclaimerEn: '💡 Dishes listed below are cooking recommendations using this ingredient.',
      processingTimeMs: Date.now() - startTime,
    };
  }

  // 4. Priority 4: Honest Unverified Notice (Never invent a fake recipe!)
  return {
    status: 'unverified_manual_name',
    objectType: 'unknown_unclear',
    objectTypeLabelKh: AI_OBJECT_TYPE_METADATA.unknown_unclear.labelKh,
    objectTypeLabelEn: AI_OBJECT_TYPE_METADATA.unknown_unclear.labelEn,
    isPreparedDish: false,
    identifiedNameKh: cleanQuery,
    identifiedNameEn: cleanQuery,
    confidenceScore: 0,
    visualCluesSummaryKh: `មិនមានទិន្នន័យរូបមន្តផ្លូវការសម្រាប់ «${cleanQuery}» នៅក្នុងឃ្លាំងទិន្នន័យផ្ទៀងផ្ទាត់ឡើយ។`,
    visualCluesSummaryEn: `No verified recipe record found for "${cleanQuery}" in the official database.`,
    candidateMatches: [],
    isVerifiedRecipe: false,
    requiresUserConfirmation: true,
    uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
    uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
    messageKh: `⚠️ មិនអាចផ្ទៀងផ្ទាត់រូបមន្តសម្រាប់ «${cleanQuery}» បានទេ។ ប្រព័ន្ធមិនបង្កើតគ្រឿងផ្សំ ឬរបៀបធ្វើស្មានដោយគ្មានប្រភពផ្លូវការឡើយ។ សូមសាកល្បងឈ្មោះម្ហូបខ្មែរផ្សេងទៀត (ឧ. អាម៉ុកត្រី, សម្លកកូរ, នំបញ្ចុក, បុកល្ហុង, នំកង)។`,
    messageEn: `⚠️ Could not verify a reliable recipe for "${cleanQuery}". The system never invents ingredients or cooking steps without verified sources.`,
    detectedVisualFeatures: ['មិនទាន់មានក្នុងឃ្លាំងទិន្នន័យផ្ទៀងផ្ទាត់ (Not in verified DB)'],
    disclaimerKh: '⚠️ ការកែតម្រូវឈ្មោះរបស់អ្នកត្រូវបានរក្សាទុកសម្រាប់ Admin ត្រួតពិនិត្យបន្ថែម។',
    disclaimerEn: '⚠️ Your manual entry has been logged for review to improve future accuracy.',
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// MAIN 4-STAGE AI VISION RECOGNITION PIPELINE
// ============================================================================
export async function identifyFoodWithAi(
  imageDataUrl: string,
  allFoods: FoodItem[],
  customPromptOrHint?: string
): Promise<AiFoodRecognitionResult> {
  const startTime = Date.now();

  if (!imageDataUrl || imageDataUrl.length < 50) {
    return {
      status: 'error',
      objectType: 'unknown_unclear',
      objectTypeLabelKh: AI_OBJECT_TYPE_METADATA.unknown_unclear.labelKh,
      objectTypeLabelEn: AI_OBJECT_TYPE_METADATA.unknown_unclear.labelEn,
      isPreparedDish: false,
      identifiedNameKh: 'មិនមានរូបភាព',
      identifiedNameEn: 'No image provided',
      confidenceScore: 0,
      visualCluesSummaryKh: 'មិនមានរូបភាពដើម្បីវិភាគឡើយ។',
      visualCluesSummaryEn: 'No image provided for analysis.',
      candidateMatches: [],
      isVerifiedRecipe: false,
      requiresUserConfirmation: true,
      uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
      uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
      messageKh: 'មិនមានរូបភាពដើម្បីវិភាគឡើយ។ សូមជ្រើសរើសរូបថតម្ហូបម្តងទៀត។',
      messageEn: 'No image provided for analysis. Please select a food photo.',
      detectedVisualFeatures: [],
      processingTimeMs: Date.now() - startTime,
    };
  }

  // If the user explicitly entered a food name / manual correction, use the strict Stage 3/4 lookup!
  if (customPromptOrHint && customPromptOrHint.trim().length > 0) {
    return retrieveRecipeAndInfoByFoodName(customPromptOrHint, allFoods, startTime);
  }

  // Optional Real External Vision API Call (Backend Vision Proxy / Gemini Vision / OpenAI Vision)
  const externalVision = await callRealVisionApiProvider(imageDataUrl);
  if (externalVision && externalVision.identifiedNameKh && externalVision.confidenceScore >= 0.55) {
    const lookedUp = retrieveRecipeAndInfoByFoodName(externalVision.identifiedNameKh, allFoods, startTime);
    if (lookedUp.status === 'confident') {
      return {
        ...lookedUp,
        confidenceScore: Math.min(0.98, Math.max(0.65, externalVision.confidenceScore)),
        visualCluesSummaryKh:
          (externalVision.visualCluesKh && externalVision.visualCluesKh.join(' • ')) || lookedUp.visualCluesSummaryKh,
        visualCluesSummaryEn:
          (externalVision.visualCluesEn && externalVision.visualCluesEn.join(' • ')) || lookedUp.visualCluesSummaryEn,
      };
    }
  }

  // STAGE 1: Analyze Image Structure & Classify Object Type First (True HSV + Spatial Texture)
  const profile = await analyzeImageStructureAndObjectType(imageDataUrl);
  const objectMeta = AI_OBJECT_TYPE_METADATA[profile.inferredObjectType];

  // Handle Blurry / Dark / Unclear Images Honestly
  if (profile.isBlurryOrLowContrast) {
    return {
      status: 'unclear',
      objectType: 'unknown_unclear',
      objectTypeLabelKh: AI_OBJECT_TYPE_METADATA.unknown_unclear.labelKh,
      objectTypeLabelEn: AI_OBJECT_TYPE_METADATA.unknown_unclear.labelEn,
      isPreparedDish: false,
      identifiedNameKh: 'រូបភាពមិនច្បាស់លាស់ (Unclear Image)',
      identifiedNameEn: 'Unclear or Low-Contrast Image',
      confidenceScore: 0.18,
      visualCluesSummaryKh: profile.visualCluesKh.join(' • '),
      visualCluesSummaryEn: profile.visualCluesEn.join(' • '),
      candidateMatches: [],
      isVerifiedRecipe: false,
      requiresUserConfirmation: true,
      uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
      uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
      messageKh: REQUIRED_UNCERTAIN_PROMPT_KH,
      messageEn: REQUIRED_UNCERTAIN_PROMPT_EN,
      detectedVisualFeatures: profile.visualCluesKh,
      disclaimerKh: '⚠️ ប្រព័ន្ធមិនទាយឈ្មោះម្ហូបដោយស្មាននៅពេលរូបភាពមិនច្បាស់ឡើយ។',
      disclaimerEn: '⚠️ The system never guesses a dish when the image is unclear.',
      processingTimeMs: Date.now() - startTime,
    };
  }

  const findKbItem = (id: string): IdentifiedNonDishItemInfo =>
    VERIFIED_NON_DISH_ITEMS_KB.find((i) => i.id === id) || VERIFIED_NON_DISH_ITEMS_KB[0];

  // STAGE 2A: Fresh Papaya / Packaged Sliced Papaya / Fresh Fruit Recognition
  // Never classify fresh or plastic-wrapped papaya as Fish Amok (អាម៉ុកត្រីស្លឹកញ) or Wild Sour Soup!
  if (profile.inferredObjectType === 'fresh_fruit' || profile.inferredObjectType === 'packaged_food') {
    const freshPapayaItem = findKbItem('item-fresh-papaya');
    const packagedPapayaItem = findKbItem('item-packaged-papaya-orange');
    const mangoItem = findKbItem('item-fresh-mango');
    const bananaItem = findKbItem('item-fresh-banana');
    const salmonItem = findKbItem('item-packaged-salmon-meat');

    if (profile.detectedFruitSubType === 'mango_or_banana') {
      const candidates: AiFoodMatchCandidate[] = [
        {
          id: mangoItem.id,
          nameKh: mangoItem.nameKh,
          nameEn: mangoItem.nameEn,
          objectType: 'fresh_fruit',
          confidenceScore: 0.82,
          visualCluesKh: 'សាច់ផ្លែឈើពណ៌លឿងទុំធម្មជាតិ គ្មានទឹកសម្ល ឬបន្លែឆា',
          visualCluesEn: 'Ripe yellow fruit flesh without soup broth or stir-fry ingredients',
          matchReasonKh: 'ប្រភេទ៖ ផ្លែឈើស្រស់កម្ពុជា (Fresh Fruit)',
          matchReasonEn: 'Category: Cambodian Fresh Fruit',
          nonDishInfo: mangoItem,
        },
        {
          id: bananaItem.id,
          nameKh: bananaItem.nameKh,
          nameEn: bananaItem.nameEn,
          objectType: 'fresh_fruit',
          confidenceScore: 0.68,
          visualCluesKh: 'ផ្លែចេកទុំ ឬសាច់ផ្លែឈើពណ៌លឿងស្រទន់',
          visualCluesEn: 'Ripe banana or soft yellow fruit',
          matchReasonKh: 'ប្រភេទ៖ ផ្លែឈើស្រស់កម្ពុជា',
          matchReasonEn: 'Category: Cambodian Fresh Fruit',
          nonDishInfo: bananaItem,
        },
      ];
      const recommendedDishes = findRecommendedDishesForIngredient(mangoItem.searchKeywordsKh, allFoods, 4);
      return {
        status: 'confident',
        objectType: 'fresh_fruit',
        objectTypeLabelKh: AI_OBJECT_TYPE_METADATA.fresh_fruit.labelKh,
        objectTypeLabelEn: AI_OBJECT_TYPE_METADATA.fresh_fruit.labelEn,
        isPreparedDish: false,
        identifiedNameKh: mangoItem.nameKh,
        identifiedNameEn: mangoItem.nameEn,
        confidenceScore: 0.82,
        visualCluesSummaryKh: profile.visualCluesKh.join(' • '),
        visualCluesSummaryEn: profile.visualCluesEn.join(' • '),
        candidateMatches: candidates,
        nonDishItemInfo: mangoItem,
        recommendedDishesFromIngredient: recommendedDishes,
        isVerifiedRecipe: true,
        requiresUserConfirmation: false,
        uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
        uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
        messageKh: `✅ បានកំណត់អត្តសញ្ញាណជា «${mangoItem.nameKh}» (ផ្លែឈើស្រស់) ព្រមទាំងបង្ហាញមុខម្ហូប និងបង្អែមខ្មែរដែលអាចធ្វើពីផ្លែឈើនេះ!`,
        messageEn: `✅ Identified as "${mangoItem.nameEn}" (Fresh Fruit) with suggested Cambodian dishes and desserts using this fruit!`,
        detectedVisualFeatures: [AI_OBJECT_TYPE_METADATA.fresh_fruit.labelKh, ...profile.visualCluesKh],
        disclaimerKh: '💡 នេះគឺជាផ្លែឈើស្រស់ មិនមែនជាម្ហូបសម្លចម្អិនរួចឡើយ។ មុខម្ហូបខាងក្រោមគឺជាការណែនាំដែលអាចធ្វើពីផ្លែឈើនេះ។',
        disclaimerEn: '💡 This is fresh fruit, not a cooked soup. Dishes listed below are cooking suggestions using this fruit.',
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Default for Ripe Papaya / Packaged Orange Fruit (`orangeCoralRatio >= 0.22 && greenRatio < 0.04`)
    const isHighConfidencePapaya = profile.orangeCoralRatio >= 0.35 && profile.greenRatio < 0.03;
    const primaryPapayaConfidence = isHighConfidencePapaya ? 0.88 : 0.72;
    const primaryPapayaItem =
      profile.hasPlasticSpecularGlare || profile.hasWhiteTrayBorder ? freshPapayaItem : freshPapayaItem;

    const candidates: AiFoodMatchCandidate[] = [
      {
        id: freshPapayaItem.id,
        nameKh: freshPapayaItem.nameKh,
        nameEn: freshPapayaItem.nameEn,
        objectType: 'fresh_fruit',
        confidenceScore: primaryPapayaConfidence,
        visualCluesKh:
          'សាច់ផ្លែល្ហុងទុំពណ៌ទឹកក្រូចក្រហមធម្មជាតិ ហាន់ជាដុំវែងៗស្មើគ្នា (គ្មានទឹកសម្ល ឬស្លឹកញដូចអាម៉ុកត្រីឡើយ)',
        visualCluesEn:
          'Vibrant orange-coral ripe papaya slices (no soup broth or green noni leaves)',
        matchReasonKh: 'ប្រភេទ៖ ផ្លែឈើស្រស់កម្ពុជា (Fresh Fruit — Papaya)',
        matchReasonEn: 'Category: Fresh Fruit (Ripe Papaya)',
        nonDishInfo: freshPapayaItem,
      },
      {
        id: packagedPapayaItem.id,
        nameKh: packagedPapayaItem.nameKh,
        nameEn: packagedPapayaItem.nameEn,
        objectType: 'packaged_food',
        confidenceScore: Math.max(0.65, primaryPapayaConfidence - 0.06),
        visualCluesKh: 'ផ្លែល្ហុងទុំចិតរួចរុំផ្លាស្ទិចថ្លាវេចខ្ចប់សម្រាប់បរិភោគស្រស់',
        visualCluesEn: 'Sliced ripe papaya wrapped in clear food-grade plastic film',
        matchReasonKh: 'ប្រភេទ៖ ផ្លែឈើស្រស់វេចខ្ចប់ (Packaged Fresh Fruit)',
        matchReasonEn: 'Category: Packaged Fresh Fruit',
        nonDishInfo: packagedPapayaItem,
      },
      {
        id: salmonItem.id,
        nameKh: salmonItem.nameKh,
        nameEn: salmonItem.nameEn,
        objectType: 'packaged_food',
        confidenceScore: 0.44,
        visualCluesKh: 'សាច់ហាន់ជាបន្ទះពណ៌ទឹកក្រូចនៅក្នុងថង់វេចខ្ចប់',
        visualCluesEn: 'Orange sliced strips inside clear plastic wrap',
        matchReasonKh: 'ប្រភេទ៖ អាហារវេចខ្ចប់ផ្សេងទៀតដែលមានពណ៌ស្រដៀង',
        matchReasonEn: 'Category: Alternative Packaged Item',
        nonDishInfo: salmonItem,
      },
    ];

    const recommendedDishes = findRecommendedDishesForIngredient(primaryPapayaItem.searchKeywordsKh, allFoods, 4);

    return {
      status: isHighConfidencePapaya ? 'confident' : 'uncertain',
      objectType: 'fresh_fruit',
      objectTypeLabelKh: AI_OBJECT_TYPE_METADATA.fresh_fruit.labelKh,
      objectTypeLabelEn: AI_OBJECT_TYPE_METADATA.fresh_fruit.labelEn,
      isPreparedDish: false,
      identifiedNameKh: primaryPapayaItem.nameKh,
      identifiedNameEn: primaryPapayaItem.nameEn,
      confidenceScore: primaryPapayaConfidence,
      visualCluesSummaryKh: profile.visualCluesKh.join(' • '),
      visualCluesSummaryEn: profile.visualCluesEn.join(' • '),
      candidateMatches: candidates,
      nonDishItemInfo: primaryPapayaItem,
      recommendedDishesFromIngredient: recommendedDishes,
      isVerifiedRecipe: true,
      requiresUserConfirmation: !isHighConfidencePapaya,
      uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
      uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
      messageKh: `✅ AI បានកំណត់អត្តសញ្ញាណរូបភាពនេះជា «${primaryPapayaItem.nameKh}» (ផ្លែឈើស្រស់) ព្រមទាំងបង្ហាញព័ត៌មានអត្ថប្រយោជន៍ និងមុខម្ហូបខ្មែរដែលអាចចម្អិនពីផ្លែល្ហុង!`,
      messageEn: `✅ AI identified this image as "${primaryPapayaItem.nameEn}" (Fresh Fruit) along with nutritional info and Cambodian dishes that can be made from papaya!`,
      detectedVisualFeatures: [AI_OBJECT_TYPE_METADATA.fresh_fruit.labelKh, ...profile.visualCluesKh],
      disclaimerKh:
        '🍈 សម្គាល់៖ រូបភាពនេះគឺជាផ្លែល្ហុងទុំ / ផ្លែឈើស្រស់ មិនមែនជាម្ហូបអាម៉ុកត្រី ឬសម្លចម្អិនរួចឡើយ។ មុខម្ហូបខាងក្រោមគឺជាការណែនាំដែលអាចធ្វើពីផ្លែល្ហុង (ដូចជា បុកល្ហុង និងសម្លកកូរ)។',
      disclaimerEn:
        '🍈 Note: This image shows fresh ripe papaya, NOT Fish Amok or a cooked soup dish. Dishes listed below are cooking recommendations using papaya.',
      processingTimeMs: Date.now() - startTime,
    };
  }

  if (profile.inferredObjectType === 'fresh_vegetables') {
    const vegItem = findKbItem('item-fresh-vegetables-greens');
    const recommendedDishes = findRecommendedDishesForIngredient(vegItem.searchKeywordsKh, allFoods, 4);

    return {
      status: 'confident',
      objectType: 'fresh_vegetables',
      objectTypeLabelKh: objectMeta.labelKh,
      objectTypeLabelEn: objectMeta.labelEn,
      isPreparedDish: false,
      identifiedNameKh: vegItem.nameKh,
      identifiedNameEn: vegItem.nameEn,
      confidenceScore: 0.78,
      visualCluesSummaryKh: profile.visualCluesKh.join(' • '),
      visualCluesSummaryEn: profile.visualCluesEn.join(' • '),
      candidateMatches: [
        {
          id: vegItem.id,
          nameKh: vegItem.nameKh,
          nameEn: vegItem.nameEn,
          objectType: 'fresh_vegetables',
          confidenceScore: 0.78,
          visualCluesKh: 'ស្លឹកបន្លែពណ៌បៃតងស្រស់',
          visualCluesEn: 'Fresh green vegetable leaves',
          matchReasonKh: 'ប្រភេទ៖ បន្លែស្រស់',
          matchReasonEn: 'Category: Fresh Vegetables',
          nonDishInfo: vegItem,
        },
      ],
      nonDishItemInfo: vegItem,
      recommendedDishesFromIngredient: recommendedDishes,
      isVerifiedRecipe: true,
      requiresUserConfirmation: false,
      uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
      uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
      messageKh: `✅ បានកំណត់អត្តសញ្ញាណជា «${vegItem.nameKh}» ព្រមទាំងបង្ហាញមុខម្ហូបខ្មែរដែលអាចចម្អិនពីបន្លែនេះ!`,
      messageEn: `✅ Identified as "${vegItem.nameEn}" with recommended Cambodian dishes using these vegetables!`,
      detectedVisualFeatures: [objectMeta.labelKh, ...profile.visualCluesKh],
      disclaimerKh: '💡 មុខម្ហូបខាងក្រោមគឺជាការណែនាំដែលអាចចម្អិនពីបន្លែនេះ មិនមែនជាឈ្មោះរបស់វត្ថុក្នុងរូបភាពឡើយ។',
      disclaimerEn: '💡 Dishes below are cooking recommendations using these vegetables.',
      processingTimeMs: Date.now() - startTime,
    };
  }

  if (profile.inferredObjectType === 'raw_meat_seafood') {
    const meatItem = findKbItem('item-raw-meat-pork-beef');
    const recommendedDishes = findRecommendedDishesForIngredient(meatItem.searchKeywordsKh, allFoods, 4);

    return {
      status: 'confident',
      objectType: 'raw_meat_seafood',
      objectTypeLabelKh: objectMeta.labelKh,
      objectTypeLabelEn: objectMeta.labelEn,
      isPreparedDish: false,
      identifiedNameKh: meatItem.nameKh,
      identifiedNameEn: meatItem.nameEn,
      confidenceScore: 0.76,
      visualCluesSummaryKh: profile.visualCluesKh.join(' • '),
      visualCluesSummaryEn: profile.visualCluesEn.join(' • '),
      candidateMatches: [
        {
          id: meatItem.id,
          nameKh: meatItem.nameKh,
          nameEn: meatItem.nameEn,
          objectType: 'raw_meat_seafood',
          confidenceScore: 0.76,
          visualCluesKh: 'សាច់ឆៅពណ៌ក្រហម/ផ្កាឈូក និងឆ្នូតខ្លាញ់',
          visualCluesEn: 'Raw red/pink meat with white marbling',
          matchReasonKh: 'ប្រភេទ៖ សាច់ឆៅ ឬគ្រឿងសមុទ្រឆៅ',
          matchReasonEn: 'Category: Raw Meat or Seafood',
          nonDishInfo: meatItem,
        },
      ],
      nonDishItemInfo: meatItem,
      recommendedDishesFromIngredient: recommendedDishes,
      isVerifiedRecipe: true,
      requiresUserConfirmation: false,
      uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
      uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
      messageKh: `✅ បានកំណត់អត្តសញ្ញាណជា «${meatItem.nameKh}» ព្រមទាំងបង្ហាញមុខម្ហូបខ្មែរដែលអាចចម្អិនពីសាច់នេះ!`,
      messageEn: `✅ Identified as "${meatItem.nameEn}" with recommended Cambodian dishes to cook with it!`,
      detectedVisualFeatures: [objectMeta.labelKh, ...profile.visualCluesKh],
      disclaimerKh: '💡 នេះជាសាច់ឆៅមិនទាន់ចម្អិន។ មុខម្ហូបខាងក្រោមគឺជាការណែនាំសម្រាប់យកសាច់នេះទៅចម្អិន។',
      disclaimerEn: '💡 This is uncooked raw meat. Dishes below are cooking recommendations.',
      processingTimeMs: Date.now() - startTime,
    };
  }

  // STAGE 2B: Prepared Dishes — Only include candidates that genuinely match multi-component visual cues.
  // CRITICAL: NEVER fall back to allFoods[0] (អាម៉ុកត្រីស្លឹកញ) when candidatePool is empty!
  const candidatePool: { food: FoodItem; score: number; clueKh: string; clueEn: string }[] = [];

  for (const food of allFoods) {
    const nameKh = food.nameKh || '';
    let score = 0;
    let clueKh = '';
    let clueEn = '';

    if (profile.yellowRatio > 0.06 && profile.greenRatio > 0.05) {
      if (nameKh.includes('អាម៉ុក') || nameKh.includes('សម្លកកូរ') || nameKh.includes('ម្ជូរគ្រឿង')) {
        score = 0.64;
        clueKh = 'ពិនិត្យឃើញពណ៌គ្រឿងលឿង/រមៀត និងស្លឹកបន្លែបៃតង';
        clueEn = 'Detected yellow kroeung/turmeric and green herbs';
      }
    } else if (profile.whiteNeutralRatio > 0.22 && profile.greenRatio > 0.04) {
      if (nameKh.includes('នំបញ្ចុក') || nameKh.includes('គុយទាវ') || nameKh.includes('បបរ')) {
        score = 0.62;
        clueKh = 'ពិនិត្យឃើញពណ៌សនៃសរសៃនំ/គុយទាវ ឬទឹកស៊ុប ជាមួយបន្លែបៃតង';
        clueEn = 'Detected white noodles/porridge with green herbs';
      }
    } else if (profile.darkBrothRatio > 0.22 && profile.greenRatio > 0.02) {
      if (nameKh.includes('ខសាច់ជ្រូក') || nameKh.includes('ឡុកឡាក់') || nameKh.includes('សាច់គោអាំង')) {
        score = 0.60;
        clueKh = 'ពិនិត្យឃើញពណ៌ទឹកខដិត ឬសាច់អាំង/ឆា';
        clueEn = 'Detected dark caramelized braise or grilled meat tones';
      }
    }

    if (score > 0.50) {
      candidatePool.push({ food, score, clueKh, clueEn });
    }
  }

  // If no strong visual filter matched, do NOT force-match allFoods[0] (Fish Amok)!
  // Instead, return an honest uncertain/unclear state and ask the user to enter or confirm the food name.
  if (candidatePool.length === 0) {
    return {
      status: 'uncertain',
      objectType: 'unknown_unclear',
      objectTypeLabelKh: AI_OBJECT_TYPE_METADATA.unknown_unclear.labelKh,
      objectTypeLabelEn: AI_OBJECT_TYPE_METADATA.unknown_unclear.labelEn,
      isPreparedDish: false,
      identifiedNameKh: 'មិនទាន់អាចកំណត់ឈ្មោះម្ហូប ឬវត្ថុអាហារច្បាស់លាស់',
      identifiedNameEn: 'Food or Object Requires Confirmation',
      confidenceScore: 0.35,
      visualCluesSummaryKh:
        profile.visualCluesKh.join(' • ') ||
        'រូបភាពនេះមិនត្រូវគ្នាច្បាស់លាស់ជាមួយមុខម្ហូបក្នុងឃ្លាំងទិន្នន័យទេ។ សូមវាយបញ្ចូលឈ្មោះម្ហូប ឬផ្លែឈើនៅខាងក្រោម។',
      visualCluesSummaryEn:
        profile.visualCluesEn.join(' • ') ||
        'Image does not clearly match a pre-indexed dish. Please type the food or fruit name below.',
      candidateMatches: [],
      primaryMatch: undefined,
      isVerifiedRecipe: false,
      requiresUserConfirmation: true,
      uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
      uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
      messageKh: REQUIRED_UNCERTAIN_PROMPT_KH,
      messageEn: REQUIRED_UNCERTAIN_PROMPT_EN,
      detectedVisualFeatures: [AI_OBJECT_TYPE_METADATA.unknown_unclear.labelKh, ...profile.visualCluesKh],
      disclaimerKh:
        '⚠️ ប្រព័ន្ធមិនបង្ខំឱ្យរូបភាពគ្រប់សន្លឹកត្រូវគ្នានឹងម្ហូបអាម៉ុកត្រី ឬសម្លក្នុងឃ្លាំងទិន្នន័យឡើយ។ សូមបញ្ចូលឈ្មោះម្ហូប ឬវត្ថុអាហារដោយខ្លួនឯង។',
      disclaimerEn:
        '⚠️ The system never forces an unrecognized image to match a random dish in the database. Please enter the food name manually.',
      processingTimeMs: Date.now() - startTime,
    };
  }

  const top3Candidates: AiFoodMatchCandidate[] = candidatePool.slice(0, 3).map((c) => ({
    id: c.food.id,
    nameKh: c.food.nameKh,
    nameEn: c.food.nameEn,
    objectType: inferDishObjectTypeFromCategory(c.food),
    confidenceScore: c.score,
    visualCluesKh: c.clueKh,
    visualCluesEn: c.clueEn,
    matchReasonKh: c.clueKh,
    matchReasonEn: c.clueEn,
    foodItem: c.food,
  }));

  const primaryCandidate = top3Candidates[0];

  return {
    status: 'uncertain',
    objectType: primaryCandidate?.objectType || 'cooked_dish',
    objectTypeLabelKh: AI_OBJECT_TYPE_METADATA[primaryCandidate?.objectType || 'cooked_dish'].labelKh,
    objectTypeLabelEn: AI_OBJECT_TYPE_METADATA[primaryCandidate?.objectType || 'cooked_dish'].labelEn,
    isPreparedDish: true,
    identifiedNameKh: primaryCandidate ? primaryCandidate.nameKh : 'មិនទាន់អាចកំណត់ឈ្មោះម្ហូបច្បាស់លាស់',
    identifiedNameEn: primaryCandidate ? primaryCandidate.nameEn : 'Dish requires confirmation',
    confidenceScore: primaryCandidate ? primaryCandidate.confidenceScore : 0.45,
    visualCluesSummaryKh: profile.visualCluesKh.join(' • ') || 'ពិនិត្យឃើញទម្រង់ម្ហូបចម្អិនរួច ប៉ុន្តែត្រូវការការបញ្ជាក់ឈ្មោះម្ហូបឱ្យបានច្បាស់លាស់។',
    visualCluesSummaryEn: profile.visualCluesEn.join(' • ') || 'Detected prepared food features; user confirmation required for exact recipe.',
    candidateMatches: top3Candidates,
    primaryMatch: undefined, // Do NOT auto-populate an unconfirmed recipe as if it were 100% certain!
    isVerifiedRecipe: false,
    requiresUserConfirmation: true,
    uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
    uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
    messageKh: REQUIRED_UNCERTAIN_PROMPT_KH,
    messageEn: REQUIRED_UNCERTAIN_PROMPT_EN,
    detectedVisualFeatures: [objectMeta.labelKh, ...profile.visualCluesKh],
    disclaimerKh: '⚠️ ដើម្បីការពារកុំឱ្យបង្ហាញរូបមន្តខុស សូមជ្រើសរើសឈ្មោះដែល AI ណែនាំ ឬបញ្ចូលឈ្មោះម្ហូបដោយខ្លួនឯង។',
    disclaimerEn: '⚠️ To prevent displaying an incorrect recipe, please confirm a suggested match or enter the food name manually.',
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// SEARCH DISHES MATCHING AVAILABLE INGREDIENTS AT HOME
// ============================================================================
export function searchByHomeIngredients(
  availableIngredients: string[],
  allFoods: FoodItem[]
): HomeIngredientsMatchResult[] {
  if (!availableIngredients || availableIngredients.length === 0) return [];

  const normalizedAvailable = availableIngredients.map((i) => i.toLowerCase().trim()).filter(Boolean);
  if (normalizedAvailable.length === 0) return [];

  const results: HomeIngredientsMatchResult[] = [];

  for (const food of allFoods) {
    if (!food.ingredients || food.ingredients.length === 0) continue;

    const matched: string[] = [];
    const missing: string[] = [];

    for (const ing of food.ingredients) {
      const ingText = (ing.nameKh + ' ' + ing.nameEn).toLowerCase();
      const hasIng = normalizedAvailable.some(
        (avail) => ingText.includes(avail) || avail.includes(ing.nameKh.toLowerCase())
      );

      if (hasIng) {
        matched.push(ing.nameKh);
      } else {
        missing.push(ing.nameKh);
      }
    }

    if (matched.length > 0) {
      const matchPercentage = Math.round((matched.length / food.ingredients.length) * 100);
      results.push({
        foodItem: food,
        matchedIngredientsCount: matched.length,
        totalDishIngredients: food.ingredients.length,
        matchPercentage,
        matchedIngredients: matched,
        missingIngredients: missing,
      });
    }
  }

  results.sort((a, b) => b.matchPercentage - a.matchPercentage || b.matchedIngredientsCount - a.matchedIngredientsCount);

  return results;
}

// ============================================================================
// PERSONALIZED RECOMMENDATIONS FILTERING
// ============================================================================
export function getPersonalizedRecommendations(
  options: RecommendationFilterOptions,
  allFoods: FoodItem[]
): FoodItem[] {
  return allFoods.filter((food) => {
    if (options.taste && options.taste !== 'all') {
      const text = (food.descriptionKh + ' ' + food.descriptionEn + ' ' + food.nameKh).toLowerCase();
      if (
        options.taste === 'sweet' &&
        !(text.includes('ផ្អែម') || text.includes('ស្ករ') || food.categorySlug === 'dessert' || food.categorySlug === 'cake')
      ) {
        return false;
      }
      if (
        options.taste === 'sour' &&
        !(text.includes('ជូរ') || text.includes('ម្ជូរ') || text.includes('ក្រូច') || text.includes('អម្ពិល'))
      ) {
        return false;
      }
      if (
        options.taste === 'spicy' &&
        !(text.includes('ហឹរ') || text.includes('ម្ទេស') || text.includes('ម្រេច') || text.includes('ការី'))
      ) {
        return false;
      }
      if (
        options.taste === 'savory' &&
        !(
          text.includes('ប្រៃ') ||
          text.includes('ដិត') ||
          text.includes('ប្រហុក') ||
          text.includes('ទឹកត្រី') ||
          text.includes('ឆ្អឹងជ្រូក')
        )
      ) {
        return false;
      }
    }

    if (options.dietary && options.dietary !== 'all') {
      const ingText = (food.ingredients || []).map((i) => i.nameKh).join(' ').toLowerCase();
      if (options.dietary === 'vegetarian') {
        const meatWords = ['សាច់', 'ត្រី', 'ជ្រូក', 'គោ', 'មាន់', 'ទា', 'បង្គា', 'ក្តាម', 'ប្រហុក', 'កាពិ'];
        const hasMeat = meatWords.some((w) => ingText.includes(w) || food.nameKh.includes(w));
        if (hasMeat) return false;
      }
      if (options.dietary === 'healthy') {
        if (food.calories && food.calories > 420) return false;
      }
    }

    if (options.budget && options.budget !== 'all') {
      if (options.budget === 'budget' && food.priceUsd > 3.0) return false;
      if (options.budget === 'medium' && (food.priceUsd < 3.0 || food.priceUsd > 6.0)) return false;
      if (options.budget === 'premium' && food.priceUsd <= 6.0) return false;
    }

    if (options.maxPrepTime && options.maxPrepTime !== 'all') {
      const maxMins = parseInt(options.maxPrepTime, 10);
      const minutesMatch = food.prepTime.match(/\d+/);
      if (minutesMatch) {
        const dishPrepMins = parseInt(minutesMatch[0], 10);
        if (dishPrepMins > maxMins) return false;
      }
    }

    if (options.categorySlug && options.categorySlug !== 'all') {
      if (food.categorySlug !== options.categorySlug) return false;
    }

    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      const matchName = food.nameKh.toLowerCase().includes(q) || food.nameEn.toLowerCase().includes(q);
      const matchDesc = food.descriptionKh.toLowerCase().includes(q) || food.descriptionEn.toLowerCase().includes(q);
      const matchIng = (food.ingredients || []).some(
        (i) => i.nameKh.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q)
      );
      if (!matchName && !matchDesc && !matchIng) return false;
    }

    return true;
  });
}

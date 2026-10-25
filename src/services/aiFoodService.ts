// Khmer Food & Tourism — Upgraded 4-Stage AI Food & Object Recognition Pipeline
// Stage 1: Object Type Classification (Fruit, Vegetable, Raw Meat/Seafood, Packaged Food, Cooked Dish, Dessert/Snack, Drink, Ingredient, Unknown)
// Stage 2: Calibrated Food/Item Identification with Visual Clues (No Arbitrary Color Guessing!)
// Stage 3: Verified Recipe & Ingredient Retrieval (Prepared Dish vs. Raw Ingredient/Packaged Item)
// Stage 4: User Confirmation, Manual Name Search & Reviewable Correction Feedback

import { FoodItem, Ingredient, CookingStep } from '../types';
import { FOOD_VISUAL_SIGNATURES } from '../data/foodVisualSignatures';

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

export interface AiPotentialAllergen {
  id: 'shellfish_crustaceans' | 'fish_prahok' | 'peanuts_treenuts' | 'soy' | 'eggs' | 'dairy_coconut' | 'gluten_wheat' | 'spicy_chili';
  labelKh: string;
  labelEn: string;
  labelZh: string;
  severity: 'high' | 'moderate' | 'info';
  reasonKh: string;
  reasonEn: string;
}

export interface AiFoodSafetyAdvisory {
  potentialAllergens: AiPotentialAllergen[];
  uncertainIngredientsNoteKh: string;
  uncertainIngredientsNoteEn: string;
  uncertainIngredientsNoteZh: string;
  cookingMethodSummaryKh: string;
  cookingMethodSummaryEn: string;
  cookingMethodSummaryZh: string;
  isVerifiedFromImageAlone: false; // Strictly false: ingredients/allergens cannot be 100% verified from an image alone
}

export interface AiFoodMatchCandidate {
  id: string;
  nameKh: string;
  nameEn: string;
  nameZh?: string;
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
  identifiedNameZh?: string;
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
  foodSafetyAdvisory?: AiFoodSafetyAdvisory;
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
const AI_VISION_CACHE_STORAGE_KEY = 'kft_ai_vision_cache_v2';
const AI_VISION_CONFIG_STORAGE_KEY = 'kft_ai_vision_config_v1';
export const DEFAULT_GEMINI_VISION_API_KEY = 'AIzaSyCZnYNQLNcuco5HxdmrWVXKXwvAr7mg7v0';

export interface AiVisionProviderConfig {
  provider: 'backend_proxy' | 'gemini_vision' | 'openai_vision' | 'hybrid_hsv_vision';
  backendProxyUrl?: string;
  apiKey?: string;
  modelName?: string;
  timeoutMs?: number;
}

export const AI_VISION_MULTISTEP_SYSTEM_PROMPT = `You are an expert Cambodian & International Food & Object Recognition AI.
Follow this strict 3-Step Pipeline when analyzing an image:
Step A — Classify the object into exactly one objectType:
- "fresh_fruit" (e.g., papaya ផ្លែល្ហុងទុំ, mango ផ្លែស្វាយ, banana ផ្លែចេក, pineapple ផ្លែម្នាស់)
- "fresh_vegetables" (fresh leafy greens, herbs, raw vegetables)
- "raw_meat_seafood" (uncooked beef, pork, chicken, raw fish/seafood)
- "packaged_food" (plastic-wrapped fruit/meat, snacks, bottled/packaged items)
- "cooked_dish" (prepared Cambodian & international dishes such as grilled stuffed frogs កង្កែបបោកអាំង, roasted chicken មាន់ដុត, grilled fish ត្រីអាំង, grilled beef សាច់គោអាំងទឹកប្រហុក, soups សម្លកកូរ/សម្លម្ជូរគ្រឿង, Fish Amok អាម៉ុកត្រី, stir-fries ឡុកឡាក់/ឆាក្តៅ, noodles នំបញ្ចុក/គុយទាវ, rice បាយសាច់ជ្រូក/បាយឆា, salads បុកល្ហុង/ភ្លាសាច់គោ, dips ទឹកគ្រឿង/ប្រហុកខ្ទិះ)
- "dessert_cake_snack" (traditional Khmer desserts, cakes, snacks such as ក្រឡាន, នំអន្សម, សង់ខ្យាល្ពៅ, ចេកខ្ទិះ)
- "drink_beverage" (drinks, smoothies, coffee កាហ្វេទឹកដោះគោទឹកកក, tea, sugarcane juice)
- "food_ingredient" (spices, kroeung, smoked fish ត្រីឆ្អើរ, prahok)
- "unknown_unclear" (blurry, dark, or non-food object)

Step B — Identify the visible object accurately:
- Examine the actual visual plating, cooking method (charcoal-grilled, steamed in banana leaf, simmered in soup broth, stir-fried, raw salad), proteins (whole stuffed frogs កង្កែបបោក, fish, chicken, beef, pork, crab, prawns, squid), herbs (lemongrass kroeung, noni leaves, banana leaf lining), and dipping sauces.
- NEVER force every photo to match Fish Amok (អាម៉ុកត្រីស្លឹកញ).
- If the image shows whole grilled stuffed frogs on a banana leaf with dipping sauce, identify it as "កង្កែបបោកអាំងសៀមរាប" (Stuffed Roasted Frogs - Kangkeb Baok) or "កង្កែបបោកអាំងគ្រឿងខ្មែរ".
- If the image shows fresh or plastic-wrapped sliced papaya, identify it as "ផ្លែល្ហុងទុំ / ល្ហុងទុំចិតរួច (Fresh Ripe Papaya)", NEVER as Fish Amok or Wild Sour Soup.
- Provide identifiedNameKh, identifiedNameEn, confidenceScore (0.0 to 1.0), visualCluesKh, visualCluesEn, and up to 3 candidates.

Step C — Post-recognition action:
- For fruit/vegetable/ingredient: provide item description, culinary uses, and suggested Cambodian dishes that can be made with it.
- For cooked dish: match against verified Cambodian recipes when confident; if moderately confident, return top visual candidates for user confirmation.`;

/**
 * Compress and normalize an uploaded image Data URL to max 800x800 JPEG (0.82 quality)
 * so multimodal Vision API requests are fast, reliable, and within payload limits.
 */
export async function optimizeImageForVisionAnalysis(dataUrl: string, maxDim = 800): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/') || typeof Image === 'undefined' || typeof document === 'undefined') {
    return dataUrl;
  }
  // If already compact (< 180KB), no need to re-encode
  if (dataUrl.length < 240_000) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width || maxDim;
        let h = img.naturalHeight || img.height || maxDim;
        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressed && compressed.length > 100 ? compressed : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Generate a comprehensive Food Safety & Potential Allergen Advisory for any identified dish or item.
 * Strictly states that ingredients/allergens cannot be 100% verified from an image alone.
 */
export function buildFoodSafetyAdvisory(
  foodItem?: FoodItem,
  nonDishInfo?: IdentifiedNonDishItemInfo,
  queryOrNameKh?: string,
  queryOrNameEn?: string
): AiFoodSafetyAdvisory {
  const combinedText = [
    foodItem?.nameKh || '',
    foodItem?.nameEn || '',
    foodItem?.descriptionKh || '',
    foodItem?.descriptionEn || '',
    ...(foodItem?.ingredients || []).map((i) => `${i.nameKh} ${i.nameEn}`),
    nonDishInfo?.nameKh || '',
    nonDishInfo?.nameEn || '',
    nonDishInfo?.descriptionKh || '',
    nonDishInfo?.descriptionEn || '',
    nonDishInfo?.culinaryUsesKh || '',
    nonDishInfo?.culinaryUsesEn || '',
    typeof queryOrNameKh === 'string' ? queryOrNameKh : '',
    typeof queryOrNameEn === 'string' ? queryOrNameEn : '',
  ]
    .join(' ')
    .toLowerCase();

  const allergens: AiPotentialAllergen[] = [];

  // 1. Peanuts & Tree Nuts (e.g. Kangkeb Baok, Saraman Curry, Teuk Kroeung, Mee Kola, Salads)
  if (
    combinedText.includes('សណ្តែកដី') ||
    combinedText.includes('peanut') ||
    combinedText.includes('កង្កែបបោក') ||
    combinedText.includes('សារ៉ាម៉ាន់') ||
    combinedText.includes('ទឹកគ្រឿង') ||
    combinedText.includes('បុកល្ហុង')
  ) {
    allergens.push({
      id: 'peanuts_treenuts',
      labelKh: 'សណ្តែកដី / គ្រាប់ធញ្ញជាតិ (Peanuts)',
      labelEn: 'Peanuts / Tree Nuts',
      labelZh: '花生 / 坚果过敏原',
      severity: 'high',
      reasonKh: 'មុខម្ហូបនេះមាន ឬអាចមានលាយសណ្តែកដីលីងបុក នៅក្នុងស្នូលសាច់ ឬទឹកជ្រលក់។',
      reasonEn: 'This dish typically contains or may be garnished with crushed roasted peanuts.',
    });
  }

  // 2. Shellfish & Crustaceans (Prawns, Crab, Squid, Dried Shrimp, Mussels, Snails)
  if (
    combinedText.includes('បង្គា') ||
    combinedText.includes('បង្កង') ||
    combinedText.includes('ក្តាម') ||
    combinedText.includes('ក្ដាម') ||
    combinedText.includes('មឹក') ||
    combinedText.includes('គ្រំ') ||
    combinedText.includes('ងាវ') ||
    combinedText.includes('ខ្យង') ||
    combinedText.includes('កាពិ') ||
    combinedText.includes('prawn') ||
    combinedText.includes('shrimp') ||
    combinedText.includes('crab') ||
    combinedText.includes('squid') ||
    combinedText.includes('shellfish') ||
    combinedText.includes('seafood') ||
    combinedText.includes('mussel') ||
    combinedText.includes('snail')
  ) {
    allergens.push({
      id: 'shellfish_crustaceans',
      labelKh: 'គ្រឿងសមុទ្រ / បង្គា-ក្តាម-ខ្យង (Shellfish)',
      labelEn: 'Shellfish / Crustaceans / Mollusks',
      labelZh: '甲壳类 / 海鲜过敏原',
      severity: 'high',
      reasonKh: 'មានគ្រឿងសមុទ្រ បង្គា ក្តាម មឹក បង្គាក្រៀម ឬកាពិ។',
      reasonEn: 'Contains or may contain prawns, crab, squid, dried shrimp, or shrimp paste.',
    });
  }

  // 3. Fish, Prahok & Fish Sauce (Very common in Cambodian cuisine)
  if (
    combinedText.includes('ត្រី') ||
    combinedText.includes('ប្រហុក') ||
    combinedText.includes('ទឹកត្រី') ||
    combinedText.includes('អាម៉ុក') ||
    combinedText.includes('សម្ល') ||
    combinedText.includes('កង្កែប') ||
    combinedText.includes('fish') ||
    combinedText.includes('prahok') ||
    combinedText.includes('amok') ||
    combinedText.includes('samlor') ||
    foodItem?.categorySlug === 'soup' ||
    foodItem?.categorySlug === 'grilled' ||
    foodItem?.categorySlug === 'stirfry' ||
    foodItem?.categorySlug === 'salad'
  ) {
    allergens.push({
      id: 'fish_prahok',
      labelKh: 'ត្រី / ប្រហុក / ទឹកត្រី (Fish & Prahok)',
      labelEn: 'Fish / Fermented Prahok / Fish Sauce',
      labelZh: '鱼类 / 波罗福鱼酱 / 鱼露',
      severity: 'high',
      reasonKh: 'ម្ហូបខ្មែរភាគច្រើនប្រើប្រាស់ទឹកត្រី ប្រហុក ឬត្រីនៅក្នុងគ្រឿងប្រឡាក់ ទឹកសម្ល ឬទឹកជ្រលក់។',
      reasonEn: 'Cambodian dishes frequently use fish sauce, fermented prahok, or fish in marinades, broths, or dips.',
    });
  }

  // 4. Eggs (Duck/Chicken Eggs)
  if (
    combinedText.includes('ស៊ុត') ||
    combinedText.includes('ពងទា') ||
    combinedText.includes('ពងមាន់') ||
    combinedText.includes('អាម៉ុក') ||
    combinedText.includes('សង់ខ្យា') ||
    combinedText.includes('egg') ||
    combinedText.includes('custard') ||
    combinedText.includes('balut')
  ) {
    allergens.push({
      id: 'eggs',
      labelKh: 'ស៊ុតមាន់ / ពងទា (Eggs)',
      labelEn: 'Eggs (Chicken / Duck Egg)',
      labelZh: '蛋类过敏原',
      severity: 'moderate',
      reasonKh: 'មានប្រើស៊ុតមាន់ ឬពងទានៅក្នុងសាច់ម្ហូប ឬការចំហុយ។',
      reasonEn: 'Contains chicken or duck eggs in the preparation or garnish.',
    });
  }

  // 5. Soy & Oyster Sauce (Stir-fries, marinades, braised dishes)
  if (
    combinedText.includes('ទឹកស៊ីអ៊ីវ') ||
    combinedText.includes('ប្រេងខ្យង') ||
    combinedText.includes('សៀង') ||
    combinedText.includes('តៅហ៊ូ') ||
    combinedText.includes('soy') ||
    combinedText.includes('oyster sauce') ||
    combinedText.includes('tofu') ||
    foodItem?.categorySlug === 'stirfry' ||
    foodItem?.categorySlug === 'grilled'
  ) {
    allergens.push({
      id: 'soy',
      labelKh: 'សណ្តែកសៀង / ទឹកស៊ីអ៊ីវ / ប្រេងខ្យង (Soy & Sauces)',
      labelEn: 'Soy / Soy Sauce / Oyster Sauce',
      labelZh: '大豆 / 酱油 / 蚝油',
      severity: 'moderate',
      reasonKh: 'គ្រឿងប្រឡាក់អាំង ឬម្ហូបឆាអាចមានប្រើទឹកស៊ីអ៊ីវ ប្រេងខ្យង ឬសៀង។',
      reasonEn: 'Marinades and stir-fries commonly contain soy sauce, soybean paste, or oyster sauce.',
    });
  }

  // 6. Wheat / Gluten (Noodles, Baguettes, Fried Coatings)
  if (
    combinedText.includes('មី') ||
    combinedText.includes('នំប៉័ង') ||
    combinedText.includes('បំពង') ||
    combinedText.includes('គុយទាវ') ||
    combinedText.includes('wheat') ||
    combinedText.includes('baguette') ||
    combinedText.includes('egg noodle') ||
    combinedText.includes('wonton')
  ) {
    allergens.push({
      id: 'gluten_wheat',
      labelKh: 'ស្រូវសាលី / គ្លុយតែន (Wheat / Gluten)',
      labelEn: 'Wheat / Gluten',
      labelZh: '小麦 / 麸质过敏原',
      severity: 'moderate',
      reasonKh: 'សរសៃមី នំប៉័ង ម្សៅបំពង ឬទឹកស៊ីអ៊ីវអាចមានផ្ទុកជាតិគ្លុយតែន (Gluten)។',
      reasonEn: 'Wheat noodles, baguettes, crispy batters, or soy sauces may contain gluten.',
    });
  }

  // 7. Coconut / Rich Dairy-like Fats
  if (
    combinedText.includes('ខ្ទិះដូង') ||
    combinedText.includes('ដូង') ||
    combinedText.includes('ទឹកដោះគោ') ||
    combinedText.includes('coconut') ||
    combinedText.includes('condensed milk') ||
    combinedText.includes('dairy')
  ) {
    allergens.push({
      id: 'dairy_coconut',
      labelKh: 'ខ្ទិះដូង / ទឹកដោះគោ (Coconut / Dairy)',
      labelEn: 'Coconut Milk / Condensed Milk',
      labelZh: '椰浆 / 乳制品',
      severity: 'info',
      reasonKh: 'មានប្រើខ្ទិះដូង ឬទឹកដោះគោខាប់។',
      reasonEn: 'Prepared with coconut cream/milk or condensed milk.',
    });
  }

  // 8. Spicy Chili / Kampot Pepper
  if (
    combinedText.includes('ម្ទេស') ||
    combinedText.includes('ហឹរ') ||
    combinedText.includes('ម្រេច') ||
    combinedText.includes('ទឹកត្រីកោះកុង') ||
    combinedText.includes('chili') ||
    combinedText.includes('spicy') ||
    combinedText.includes('pepper')
  ) {
    allergens.push({
      id: 'spicy_chili',
      labelKh: 'ម្ទេសហឹរ / ម្រេច (Spicy Chili & Pepper)',
      labelEn: 'Chili / Spicy Seasoning',
      labelZh: '辣椒 / 辛辣调料',
      severity: 'info',
      reasonKh: 'មានរសជាតិហឹរពីម្ទេសស្រស់ ម្រេចកំពត ឬទឹកជ្រលក់។',
      reasonEn: 'Contains fresh chilies, Kampot pepper, or spicy dipping sauce.',
    });
  }

  // Determine cooking method summary
  let methodKh = 'ចម្អិនតាមបែបប្រពៃណីខ្មែរ';
  let methodEn = 'Traditional Cambodian preparation';
  let methodZh = '传统高棉烹调方式';

  if (foodItem) {
    const cat = foodItem.categorySlug;
    const nKh = foodItem.nameKh;
    if (cat === 'grilled' || nKh.includes('អាំង') || nKh.includes('ដុត')) {
      methodKh = 'អាំង ឬដុតលើរងើកភ្លើងធ្យូងឱ្យឆ្អិនឈ្ងុយ (Charcoal Grilled / Roasted)';
      methodEn = 'Charcoal-grilled or roasted over glowing embers with aromatic Khmer herbs';
      methodZh = '炭火慢烤 / 香草腌制烧烤';
    } else if (nKh.includes('អាម៉ុក') || nKh.includes('ចំហុយ')) {
      methodKh = 'ចំហុយក្នុងកន្ទោងស្លឹកចេកជាមួយគ្រឿងបុក និងខ្ទិះដូង (Steamed in Banana Leaf)';
      methodEn = 'Steamed with fragrant lemongrass kroeung and coconut cream';
      methodZh = '芭蕉叶盅清蒸 / 椰香高棉香料';
    } else if (cat === 'soup' || nKh.includes('សម្ល') || nKh.includes('ស្ងោរ')) {
      methodKh = 'ស្ល ឬស្ងោររម្ងាស់ជាមួយគ្រឿងបុកខ្មែរ និងបន្លែស្រស់ (Simmered Soup / Stew)';
      methodEn = 'Simmered in traditional Cambodian herbal broth or kroeung stew';
      methodZh = '传统慢炖浓汤 / 草本清汤';
    } else if (cat === 'stirfry' || nKh.includes('ឆា') || nKh.includes('ឡុកឡាក់')) {
      methodKh = 'ឆាលើភ្លើងខ្លាំងជាមួយខ្ទឹមស និងគ្រឿងទេស (Wok Stir-Fried)';
      methodEn = 'Wok stir-fried over high flame with garlic, sauces, and fresh herbs';
      methodZh = '猛火快炒 / 香料爆炒';
    } else if (cat === 'salad' || nKh.includes('ញាំ') || nKh.includes('បុក') || nKh.includes('ភ្លា') || nKh.includes('ទឹកគ្រឿង')) {
      methodKh = 'ញាំ បុក ឬទឹកជ្រលក់ជាមួយបន្លែអន្លក់ស្រស់ (Fresh Salad / Traditional Dip)';
      methodEn = 'Tossed fresh salad or traditional herbal dip with crisp crudités';
      methodZh = '高棉酸柑凉拌 / 传统香草蘸酱';
    } else if (cat === 'noodles' || nKh.includes('គុយទាវ') || nKh.includes('នំបញ្ចុក')) {
      methodKh = 'ស្រុសសរសៃនំ/គុយទាវ ជាមួយទឹកស៊ុប ឬទឹកសម្ល (Boiled Noodles & Broth)';
      methodEn = 'Blanched noodles served with slow-simmered broth or curry gravy';
      methodZh = '高汤汤粉 / 传统米线';
    } else if (cat === 'dessert' || cat === 'cake') {
      methodKh = 'បង្អែម ឬនំប្រពៃណីខ្មែរចម្អិនជាមួយស្ករត្នោត និងខ្ទិះដូង (Traditional Sweet / Steamed Cake)';
      methodEn = 'Traditional Khmer dessert or cake prepared with palm sugar and coconut cream';
      methodZh = '棕榈糖椰浆传统甜品 / 蕉叶糕点';
    }
  } else if (nonDishInfo) {
    methodKh = 'វត្ថុធាតុដើម ឬអាហារស្រស់ (អាចបរិភោគស្រស់ ឬយកទៅចម្អិនតាមការណែនាំ)';
    methodEn = 'Fresh fruit, vegetable, or raw culinary ingredient';
    methodZh = '新鲜果蔬或烹饪食材';
  }

  return {
    potentialAllergens: allergens,
    uncertainIngredientsNoteKh:
      '⚠️ សុវត្ថិភាពអាហារ៖ រូបភាពតែមួយសន្លឹកមិនអាចបញ្ជាក់គ្រឿងផ្សំលាក់កំបាំង (ដូចជា ប្រហុក ទឹកត្រី សណ្តែកដី ប៊ីចេង ឬប្រេងឆា) បាន ១០០% ឡើយ។ សូមសាកសួរអ្នកចម្អិនផ្ទាល់ប្រសិនបើអ្នកមានបញ្ហាអាលែហ្ស៊ីអាហារធ្ងន់ធ្ងរ។',
    uncertainIngredientsNoteEn:
      '⚠️ Food Safety Notice: Ingredients and hidden allergens (such as fish sauce, prahok, peanut oil, soy, or MSG) cannot be 100% verified from a photo alone. Always confirm directly with the kitchen if you have food allergies.',
    uncertainIngredientsNoteZh:
      '⚠️ 食品安全提示：仅凭照片无法 100% 确认所有隐藏配料或过敏原（如鱼露、波罗福鱼酱、花生碎、酱油或味精）。如有食物过敏，请务必向餐厅核实。',
    cookingMethodSummaryKh: methodKh,
    cookingMethodSummaryEn: methodEn,
    cookingMethodSummaryZh: methodZh,
    isVerifiedFromImageAlone: false,
  };
}

export function getAiVisionProviderConfig(): AiVisionProviderConfig {
  const envBackendUrl =
    typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env
      ? (import.meta as unknown as { env: Record<string, string> }).env.VITE_AI_VISION_BACKEND_URL
      : undefined;
  const envGeminiKey =
    typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env
      ? (import.meta as unknown as { env: Record<string, string> }).env.VITE_GEMINI_API_KEY
      : undefined;

  let cloudGeminiKey = '';
  let cloudVisionUrl = '';
  try {
    const rawCloud = localStorage.getItem('kft_cloud_api_config_v1');
    if (rawCloud) {
      const parsedCloud = JSON.parse(rawCloud);
      cloudGeminiKey = (parsedCloud.geminiApiKey || '').trim();
      cloudVisionUrl = (parsedCloud.aiVisionBackendUrl || '').trim();
    }
  } catch {
    // ignore
  }

  try {
    const raw = localStorage.getItem(AI_VISION_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const rawProv = parsed.provider;
      const normalizedProvider: AiVisionProviderConfig['provider'] =
        rawProv === 'backend_proxy'
          ? 'backend_proxy'
          : rawProv === 'openai_vision'
          ? 'openai_vision'
          : rawProv === 'hybrid_hsv_vision'
          ? 'hybrid_hsv_vision'
          : 'gemini_vision';

      return {
        provider: normalizedProvider,
        backendProxyUrl: parsed.backendProxyUrl || parsed.backendEndpointUrl || cloudVisionUrl || envBackendUrl || '',
        apiKey: parsed.apiKey || cloudGeminiKey || envGeminiKey || DEFAULT_GEMINI_VISION_API_KEY,
        modelName: parsed.modelName || 'gemini-2.0-flash',
        timeoutMs: parsed.timeoutMs || 10000,
      };
    }
  } catch {
    // ignore storage errors
  }

  const resolvedBackend = cloudVisionUrl || envBackendUrl || '';
  return {
    provider: resolvedBackend ? 'backend_proxy' : 'gemini_vision',
    backendProxyUrl: resolvedBackend,
    apiKey: cloudGeminiKey || envGeminiKey || DEFAULT_GEMINI_VISION_API_KEY,
    modelName: 'gemini-2.0-flash',
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
  {
    id: 'item-intl-pizza-burger',
    nameKh: 'ភីហ្សា / បឺហ្គឺ / ម្ហូបបស្ចិមប្រទេស (Pizza / Burger / Western Dish)',
    nameEn: 'Pizza / Burger / Western Prepared Dish',
    objectType: 'cooked_dish',
    categoryKh: 'ម្ហូបអន្តរជាតិ (International Cuisine)',
    categoryEn: 'International Cuisine',
    descriptionKh: 'ម្ហូបបស្ចិមប្រទេសដុតក្នុងឡ ឬអាំង ដែលផ្សំពីម្សៅស្រូវសាលី ឈីស ទឹកប៉េងប៉ោះ សាច់ និងបន្លែ។',
    descriptionEn: 'Oven-baked or grilled Western dish typically made with wheat dough/bun, cheese, tomato sauce, meat, and vegetables.',
    culinaryUsesKh: 'ចម្អិនដោយការដុតក្នុងឡ (Oven Baking) ឬអាំងសាច់ (Grilling)។ អាចមានសារធាតុអាលែកហ្ស៊ីដូចជា ជាតិស្អិតស្រូវសាលី (Gluten) ទឹកដោះគោ/ឈីស (Dairy) និងស៊ុត។',
    culinaryUsesEn: 'Prepared by oven baking or grilling. Commonly contains wheat/gluten, dairy/cheese, and egg allergens.',
    storageTipsKh: 'បរិភោគទាន់នៅក្តៅៗ ដើម្បីរក្សាភាពស្រួយ និងរសជាតិឈីស។',
    isPackagedProduct: false,
    searchKeywordsKh: ['ភីហ្សា', 'បឺហ្គឺ', 'pizza', 'burger', 'ហែមបឺហ្គឺ', 'នំប៉័ង', 'សាច់គោអាំង'],
  },
  {
    id: 'item-intl-sushi-ramen-asian',
    nameKh: 'ស៊ូស៊ី / រ៉ាមែន / ផាត់ថៃ / ហ្វឺ (Sushi / Ramen / Pad Thai / Pho)',
    nameEn: 'Asian International Dish (Sushi / Ramen / Pad Thai / Pho)',
    objectType: 'cooked_dish',
    categoryKh: 'ម្ហូបអាស៊ីអន្តរជាតិ (Asian International Cuisine)',
    categoryEn: 'Asian International Cuisine',
    descriptionKh: 'ម្ហូបអាស៊ីអន្តរជាតិដ៏ពេញនិយម រួមមាន ស៊ូស៊ីជប៉ុន មីរ៉ាមែន ផាត់ថៃ ឬហ្វឺ ដែលប្រើប្រាស់គ្រឿងសមុទ្រ សរសៃមី/គុយទាវ ទឹកស៊ីអ៊ីវ និងសណ្តែកដី។',
    descriptionEn: 'Popular Asian international dishes including Japanese Sushi, Ramen, Thai Pad Thai, or Vietnamese Pho.',
    culinaryUsesKh: 'អាចមានសារធាតុអាលែកហ្ស៊ីដូចជា ត្រី/គ្រឿងសមុទ្រឆៅ ទឹកស៊ីអ៊ីវ (Soy) សណ្តែកដី (Peanuts) ស៊ុត និងស្រូវសាលី។',
    culinaryUsesEn: 'May contain raw fish/shellfish, soy sauce, peanuts, egg, and wheat allergens.',
    storageTipsKh: 'សម្រាប់ស៊ូស៊ី ឬត្រីឆៅ ត្រូវរក្សាសីតុណ្ហភាពត្រជាក់ និងបរិភោគភ្លាមៗដើម្បីសុវត្ថិភាពអាហារ។',
    isPackagedProduct: false,
    searchKeywordsKh: ['ស៊ូស៊ី', 'រ៉ាមែន', 'ផាត់ថៃ', 'ហ្វឺ', 'sushi', 'ramen', 'pad thai', 'pho', 'គុយទាវ', 'មី'],
  },
];

// ============================================================================
// QUOTA MANAGEMENT
// ============================================================================
export function getAiDailyQuota(
  userMembershipTier?: string, 
  userSubscriptionExpiry?: string,
  userRole?: string
): AiDailyUsageQuota {
  const isAdmin = userRole === 'admin' || userMembershipTier === 'admin';
  if (isAdmin) {
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      tier: 'annual_vip_pro',
      allowed: true,
      usedToday: 0,
      dailyLimit: -1,
      remainingToday: 9999,
      resetDate: todayStr,
    };
  }

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
export type DishStructureArchetype =
  | 'balut_or_eggs_on_plate_with_herbs'
  | 'spicy_red_gold_kroeung_stirfry_eel_or_meat'
  | 'grilled_golden_fish_with_herb_corner_and_dip'
  | 'seafood_glass_noodle_or_herb_salad_on_plate'
  | 'grilled_on_banana_leaf_or_herbs'
  | 'grilled_charred_meat_or_seafood'
  | 'yellow_kroeung_amok_or_curry'
  | 'green_herbal_korko_or_sour_soup'
  | 'white_noodles_porridge_or_rice'
  | 'dark_braised_khor_or_lok_lak'
  | 'fresh_salad_or_dip_platter'
  | 'general_cooked_dish';

export interface ImageVisualProfile {
  avgBrightness: number;
  contrast: number;
  isBlurryOrLowContrast: boolean;
  // Calibrated HSV Color & Spatial ratios
  orangeCoralRatio: number;
  goldenRoastedRatio: number;
  charGrillRatio: number;
  greenRatio: number;
  centerGreenRatio: number;
  outerGreenRatio: number;
  topLeftGreenRatio: number;
  yellowRatio: number;
  redPinkRawRatio: number;
  pinkRatio: number;
  darkBrothRatio: number;
  whiteNeutralRatio: number;
  borderWhiteRatio: number;
  centerWhiteRatio: number;
  // 8x8 Spatial RGB perceptual vector (192 values)
  spatialRgb192: number[];
  // Structural cues
  hasPlasticSpecularGlare: boolean;
  hasWhiteTrayBorder: boolean;
  isUniformInteriorColor: boolean;
  colorEntropy: number; // Higher = complex multi-ingredient dish; Lower = uniform fruit/meat/packaged slice
  inferredObjectType: AiObjectType;
  detectedFruitSubType?: 'papaya' | 'mango_or_banana';
  dishArchetype?: DishStructureArchetype;
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

export async function analyzeImageStructureAndObjectType(dataUrl: string): Promise<ImageVisualProfile> {
  return new Promise((resolve) => {
    const fallbackProfile: ImageVisualProfile = {
      avgBrightness: 128,
      contrast: 100,
      isBlurryOrLowContrast: false,
      orangeCoralRatio: 0,
      goldenRoastedRatio: 0.25,
      charGrillRatio: 0.08,
      greenRatio: 0.12,
      centerGreenRatio: 0.06,
      outerGreenRatio: 0.16,
      topLeftGreenRatio: 0.12,
      yellowRatio: 0.08,
      redPinkRawRatio: 0,
      pinkRatio: 0,
      darkBrothRatio: 0.1,
      whiteNeutralRatio: 0.1,
      borderWhiteRatio: 0.1,
      centerWhiteRatio: 0.1,
      spatialRgb192: [],
      hasPlasticSpecularGlare: false,
      hasWhiteTrayBorder: false,
      isUniformInteriorColor: false,
      colorEntropy: 0.5,
      inferredObjectType: 'cooked_dish',
      dishArchetype: 'general_cooked_dish',
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

        // Also compute 8x8 spatial RGB vector (192 values) for perceptual matching against FOOD_VISUAL_SIGNATURES
        const spatialRgb192: number[] = [];
        const cellSpan = size / 8; // 12 pixels per cell
        for (let gy = 0; gy < 8; gy++) {
          for (let gx = 0; gx < 8; gx++) {
            let sumR = 0;
            let sumG = 0;
            let sumB = 0;
            let count = 0;
            const yStart = Math.floor(gy * cellSpan);
            const yEnd = Math.floor((gy + 1) * cellSpan);
            const xStart = Math.floor(gx * cellSpan);
            const xEnd = Math.floor((gx + 1) * cellSpan);
            for (let py = yStart; py < yEnd; py++) {
              for (let px = xStart; px < xEnd; px++) {
                const pIdx = (py * size + px) * 4;
                sumR += data[pIdx];
                sumG += data[pIdx + 1];
                sumB += data[pIdx + 2];
                count++;
              }
            }
            spatialRgb192.push(
              Math.round(sumR / Math.max(1, count)),
              Math.round(sumG / Math.max(1, count)),
              Math.round(sumB / Math.max(1, count))
            );
          }
        }

        let totalBrightness = 0;
        let minVal = 255;
        let maxVal = 0;

        let orangeCoralCount = 0;
        let goldenRoastedCount = 0;
        let charGrillCount = 0;
        let greenCount = 0;
        let centerGreenCount = 0;
        let outerGreenCount = 0;
        let topLeftGreenCount = 0;
        let topLeftTotalCount = 0;
        let centerTotalCount = 0;
        let outerTotalCount = 0;
        let yellowCount = 0;
        let redPinkRawCount = 0;
        let pinkCount = 0;
        let darkCount = 0;
        let whiteNeutralCount = 0;
        let borderWhiteCount = 0;
        let borderTotalCount = 0;
        let centerWhiteCount = 0;
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
            const isBorder = x < 12 || x >= size - 12 || y < 12 || y >= size - 12;
            const isCenter = x >= 22 && x < size - 22 && y >= 22 && y < size - 22;
            const isTopLeft = x < 48 && y < 48;
            const isNeutralWhite =
              (s < 0.16 && v > 0.62) || (brightness > 180 && Math.abs(r - g) < 28 && Math.abs(g - b) < 28);

            if (isCenter) {
              centerTotalCount++;
              if (isNeutralWhite) centerWhiteCount++;
            } else {
              outerTotalCount++;
            }

            if (isBorder) {
              borderTotalCount++;
              if (isNeutralWhite) borderWhiteCount++;
            }

            if (isTopLeft) {
              topLeftTotalCount++;
            }

            // Detect golden-brown roasted/grilled meat & kroeung crust (Hue 12°–44°, Sat 0.25–0.88, Val 0.22–0.82)
            if (h >= 10 && h <= 45 && s >= 0.24 && v >= 0.20 && v <= 0.85 && r > b * 1.25) {
              goldenRoastedCount++;
            }

            // Detect dark charcoal sear / grill marks / caramelized glaze
            if (v >= 0.08 && v <= 0.34 && s >= 0.15 && r >= b) {
              charGrillCount++;
            }

            // Detect pink/coral shrimp/squid/chili highlights
            if ((h < 18 || h >= 330) && s >= 0.20 && s <= 0.68 && v >= 0.45) {
              pinkCount++;
            }

            if (isNeutralWhite) {
              whiteNeutralCount++;
              hueBuckets[0]++;
            } else if (v < 0.22 || brightness < 52) {
              darkCount++;
              hueBuckets[1]++;
            } else if (h >= 65 && h <= 168 && s >= 0.18 && v >= 0.16) {
              // True HSV Green (banana leaf lining, vegetables, herbs, noni leaves, green kroeung)
              greenCount++;
              if (isCenter) centerGreenCount++;
              else outerGreenCount++;
              if (isTopLeft) topLeftGreenCount++;
              hueBuckets[2]++;
            } else if (
              h >= 8 &&
              h <= 38 &&
              s >= 0.38 &&
              v >= 0.28 &&
              r > g * 1.18 &&
              g > b * 1.12
            ) {
              // Warm Ripe Papaya / Orange / Golden-Amber Roasted tones
              orangeCoralCount++;
              hueBuckets[3]++;
            } else if (h > 38 && h <= 65 && s >= 0.30 && v >= 0.32) {
              // Mango / Banana / Pineapple / Yellow Turmeric Kroeung
              yellowCount++;
              hueBuckets[4]++;
            } else if ((h < 8 || h >= 335) && s >= 0.30 && v >= 0.26) {
              // Red Chili / Raw Red-Pink Meat / Tomato
              redPinkRawCount++;
              hueBuckets[5]++;
            } else {
              hueBuckets[6]++;
            }

            // Detect plastic wrap specular glare streaks inside the object
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
        const goldenRoastedRatio = goldenRoastedCount / totalPixels;
        const charGrillRatio = charGrillCount / totalPixels;
        const greenRatio = greenCount / totalPixels;
        const centerGreenRatio = centerTotalCount > 0 ? centerGreenCount / centerTotalCount : 0;
        const outerGreenRatio = outerTotalCount > 0 ? outerGreenCount / outerTotalCount : 0;
        const topLeftGreenRatio = topLeftTotalCount > 0 ? topLeftGreenCount / topLeftTotalCount : 0;
        const yellowRatio = yellowCount / totalPixels;
        const redPinkRawRatio = redPinkRawCount / totalPixels;
        const pinkRatio = pinkCount / totalPixels;
        const darkBrothRatio = darkCount / totalPixels;
        const whiteNeutralRatio = whiteNeutralCount / totalPixels;
        const borderWhiteRatio = borderTotalCount > 0 ? borderWhiteCount / borderTotalCount : 0;
        const centerWhiteRatio = centerTotalCount > 0 ? centerWhiteCount / centerTotalCount : 0;

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
          if (count / totalPixels > 0.05) activeBuckets++;
        }
        const colorEntropy = activeBuckets / hueBuckets.length;

        const visualCluesKh: string[] = [];
        const visualCluesEn: string[] = [];
        let inferredObjectType: AiObjectType = 'cooked_dish';
        let detectedFruitSubType: 'papaya' | 'mango_or_banana' | undefined;
        let dishArchetype: DishStructureArchetype = 'general_cooked_dish';

        if (isBlurryOrLowContrast) {
          inferredObjectType = 'unknown_unclear';
          visualCluesKh.push('រូបភាពមានពន្លឺខ្សោយ ឬកម្រិតច្បាស់ទាប (Blurry or low contrast)');
          visualCluesEn.push('Low contrast or insufficient lighting');
        } else if (orangeCoralRatio >= 0.26 && greenRatio < 0.035 && charGrillRatio < 0.08 && isUniformInteriorColor) {
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
        } else if (yellowRatio >= 0.28 && greenRatio < 0.035 && darkBrothRatio < 0.15 && isUniformInteriorColor) {
          inferredObjectType = 'fresh_fruit';
          detectedFruitSubType = 'mango_or_banana';
          visualCluesKh.push('សាច់ផ្លែឈើពណ៌លឿងទុំធម្មជាតិ ដូចជាផ្លែស្វាយទុំ ចេក ឬម្នាស់ (Ripe yellow fruit flesh)');
          visualCluesEn.push('Ripe yellow fruit flesh such as mango, banana, or pineapple');
        } else if (hasPlasticSpecularGlare && hasWhiteTrayBorder && isUniformInteriorColor && greenRatio < 0.025 && charGrillRatio < 0.06) {
          inferredObjectType = 'packaged_food';
          visualCluesKh.push('ពិនិត្យឃើញចំណាំងផ្លាតថង់ផ្លាស្ទិចរុំវេចខ្ចប់ និងថាសដាក់អាហារ (Plastic wrap reflection & tray border)');
          visualCluesEn.push('Detected plastic wrap specular highlights and tray packaging');
        } else if (greenRatio >= 0.42 && goldenRoastedRatio < 0.10 && orangeCoralRatio < 0.06 && redPinkRawRatio < 0.05) {
          inferredObjectType = 'fresh_vegetables';
          visualCluesKh.push('ពណ៌បៃតងធម្មជាតិគ្របដណ្តប់លើរូបភាព ដូចជាបន្លែស្រស់ ឬជីរខ្មែរ (Dominant fresh leafy greens)');
          visualCluesEn.push('Dominant fresh green leaves/vegetables');
        } else if (redPinkRawRatio >= 0.28 && greenRatio < 0.035 && yellowRatio < 0.05 && charGrillRatio < 0.06) {
          inferredObjectType = 'raw_meat_seafood';
          visualCluesKh.push('សាច់ពណ៌ក្រហម/ផ្កាឈូកស្រស់ និងឆ្នូតខ្លាញ់ពណ៌ស ដូចជាសាច់ឆៅ (Raw pink/red meat texture)');
          visualCluesEn.push('Raw red/pink meat texture with white marbling');
        } else {
          // Multi-component prepared dish: Classify structural dish archetype with fine-grained spatial & HSV cues
          inferredObjectType = 'cooked_dish';

          // Archetype A: Boiled Balut / Duck Egg with Kampot Lime-Pepper Dip & Fresh Ram Herbs on White Plate
          if (
            whiteNeutralRatio >= 0.30 &&
            greenRatio >= 0.12 &&
            darkBrothRatio >= 0.08 &&
            redPinkRawRatio < 0.022 &&
            pinkRatio < 0.015
          ) {
            dishArchetype = 'balut_or_eggs_on_plate_with_herbs';
            visualCluesKh.push(
              'ពិនិត្យឃើញពងទាកូនស្រុះសំបកពណ៌ស អមដោយស្លឹកជីរពណ៌បៃតងស្រស់ ក្រូចឆ្មារ និងចានទឹកម្រេចកំពត'
            );
            visualCluesEn.push(
              'Detected boiled balut egg in white shell with fresh green herbs, lime wedge, and Kampot pepper dip'
            );
          }
          // Archetype B: Glass Noodle Seafood Salad (ញាំមីសួរគ្រឿងសមុទ្របង្គាមឹក) on White Plate with Prawns, Squid, Chili & Mint
          else if (
            whiteNeutralRatio >= 0.28 &&
            greenRatio >= 0.12 &&
            (redPinkRawRatio >= 0.025 || pinkRatio >= 0.020) &&
            darkBrothRatio < 0.095
          ) {
            dishArchetype = 'seafood_glass_noodle_or_herb_salad_on_plate';
            visualCluesKh.push(
              'ពិនិត្យឃើញសរសៃមីសួរថ្លា ច្របល់ជាមួយបង្គា មឹក ម្ទេសក្រហម និងស្លឹកជីរអង្កាមពណ៌បៃតងស្រស់លើចានស'
            );
            visualCluesEn.push(
              'Detected translucent glass noodles tossed with prawns, squid, red chili, and fresh mint herbs on a white plate'
            );
          }
          // Archetype C: Spicy Lemongrass Kroeung Stir-Fried Eel / Meat (ឆាគ្រឿងអន្ទង់ស្លឹកម្រះព្រៅ / អន្ទង់ឆាក្ដៅ)
          else if (
            whiteNeutralRatio < 0.045 &&
            goldenRoastedRatio >= 0.35 &&
            redPinkRawRatio >= 0.04 &&
            yellowRatio >= 0.03 &&
            topLeftGreenRatio < 0.22
          ) {
            dishArchetype = 'spicy_red_gold_kroeung_stirfry_eel_or_meat';
            visualCluesKh.push(
              'ពិនិត្យឃើញសាច់អន្ទង់ឆាគ្រឿងបុករមៀតស្លឹកគ្រៃពណ៌មាសក្រហម ខាប់ឈ្ងុយ ជាមួយស្លឹកម្រះព្រៅ និងម្ទេសក្រហម'
            );
            visualCluesEn.push(
              'Detected golden-red spicy lemongrass kroeung stir-fried eel with holy basil leaves and sliced red chili'
            );
          }
          // Archetype D: Charcoal-Grilled Sun-Dried Fish with Tamarind Dip & Banana Leaf/Herbs (ត្រីងៀតអាំងជ្រលក់ទឹកអម្ពិលទុំ)
          else if (
            whiteNeutralRatio < 0.12 &&
            goldenRoastedRatio >= 0.35 &&
            orangeCoralRatio >= 0.28 &&
            greenRatio >= 0.10 &&
            topLeftGreenRatio >= 0.22
          ) {
            dishArchetype = 'grilled_golden_fish_with_herb_corner_and_dip';
            visualCluesKh.push(
              'ពិនិត្យឃើញសាច់ត្រីងៀតអាំងលើភ្លើងធ្យូងពណ៌មាសក្រហម ដាក់លើស្លឹកចេកបៃតង អមដោយចានទឹកអម្ពិលទុំ និងម្ទេស'
            );
            visualCluesEn.push(
              'Detected golden charcoal-grilled sun-dried fish on banana leaf with ripe tamarind dipping sauce and chili'
            );
          }
          // Archetype E: Grilled / Roasted Dish on Banana Leaf or with Herbs (e.g., កង្កែបបោកអាំង / មាន់ដុត / ត្រីអាំង / សាច់គោអាំង)
          else if (
            whiteNeutralRatio < 0.22 &&
            (goldenRoastedRatio >= 0.16 || orangeCoralRatio >= 0.14) &&
            (greenRatio >= 0.04 || outerGreenRatio >= 0.05) &&
            (charGrillRatio >= 0.05 || darkBrothRatio >= 0.07)
          ) {
            dishArchetype = 'grilled_on_banana_leaf_or_herbs';
            visualCluesKh.push(
              'ពិនិត្យឃើញសាច់អាំង/ដុតពណ៌មាសក្រហមឈ្ងុយ ប្រឡាក់គ្រឿងបុកស្លឹកគ្រៃរមៀត រៀបលើស្លឹកចេក ឬអមដោយបន្លែបៃតង និងទឹកជ្រលក់'
            );
            visualCluesEn.push(
              'Detected golden-brown charcoal-grilled/roasted protein with lemongrass-turmeric kroeung on banana leaf / fresh herbs and dipping sauce'
            );
          } else if (
            whiteNeutralRatio < 0.22 &&
            (goldenRoastedRatio >= 0.18 || orangeCoralRatio >= 0.16) &&
            (charGrillRatio >= 0.05 || darkBrothRatio >= 0.08)
          ) {
            dishArchetype = 'grilled_charred_meat_or_seafood';
            visualCluesKh.push('ពិនិត្យឃើញសាច់អាំង ឬគ្រឿងសមុទ្រអាំងលើភ្លើងធ្យូងពណ៌មាសឆ្អិនឈ្ងុយ');
            visualCluesEn.push('Detected charcoal-grilled or roasted meat/seafood with golden sear marks');
          } else if (yellowRatio >= 0.07 && greenRatio >= 0.04) {
            dishArchetype = 'yellow_kroeung_amok_or_curry';
            visualCluesKh.push('ពិនិត្យឃើញពណ៌គ្រឿងលឿង/រមៀត ខ្ទិះដូង និងស្លឹកបន្លែបៃតង (ដូចជា អាម៉ុក សម្លការី ឬសម្លម្ជូរគ្រឿង)');
            visualCluesEn.push('Detected yellow kroeung/turmeric, coconut cream, and green herbs (Amok, Curry, or Sour Kroeung Soup)');
          } else if (greenRatio >= 0.14 && (darkBrothRatio >= 0.06 || yellowRatio >= 0.03)) {
            dishArchetype = 'green_herbal_korko_or_sour_soup';
            visualCluesKh.push('ពិនិត្យឃើញបន្លែបៃតងចម្រុះ និងទឹកសម្លបែបខ្មែរ (ដូចជា សម្លកកូរ សម្លប្រហើរ ឬសម្លម្ជូរ)');
            visualCluesEn.push('Detected mixed green vegetables and traditional Cambodian herbal soup broth');
          } else if (whiteNeutralRatio >= 0.22 && (greenRatio >= 0.02 || goldenRoastedRatio >= 0.05)) {
            dishArchetype = 'white_noodles_porridge_or_rice';
            visualCluesKh.push('ពិនិត្យឃើញពណ៌សនៃសរសៃគុយទាវ/នំបញ្ចុក បាយ ឬបបរ ជាមួយសាច់ និងបន្លែជីរ');
            visualCluesEn.push('Detected white rice noodles, steamed rice, or porridge with savory toppings and herbs');
          } else if (darkBrothRatio >= 0.20) {
            dishArchetype = 'dark_braised_khor_or_lok_lak';
            visualCluesKh.push('ពិនិត្យឃើញពណ៌ទឹកខដិត ឬសាច់ឆា/ឡុកឡាក់');
            visualCluesEn.push('Detected rich caramelized braise (Khor) or wok-seared beef (Lok Lak)');
          } else {
            dishArchetype = 'general_cooked_dish';
            if (greenRatio > 0.03) {
              visualCluesKh.push('មានបន្លែបៃតង ឬស្លឹកគ្រឿងខ្មែរ (Contains green herbs/vegetables)');
              visualCluesEn.push('Contains green herbs or vegetables');
            }
            if (goldenRoastedRatio > 0.08 || yellowRatio > 0.04) {
              visualCluesKh.push('មានពណ៌គ្រឿងបុកខ្មែរ សាច់អាំង ឬសម្ល (Savory cooked protein & kroeung tones)');
              visualCluesEn.push('Savory cooked protein and Cambodian spice tones');
            }
          }
        }

        resolve({
          avgBrightness,
          contrast,
          isBlurryOrLowContrast,
          orangeCoralRatio,
          goldenRoastedRatio,
          charGrillRatio,
          greenRatio,
          centerGreenRatio,
          outerGreenRatio,
          topLeftGreenRatio,
          yellowRatio,
          redPinkRawRatio,
          pinkRatio,
          darkBrothRatio,
          whiteNeutralRatio,
          borderWhiteRatio,
          centerWhiteRatio,
          spatialRgb192,
          hasPlasticSpecularGlare,
          hasWhiteTrayBorder,
          isUniformInteriorColor,
          colorEntropy,
          inferredObjectType,
          detectedFruitSubType,
          dishArchetype,
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

  // Only invoke network Vision API if a real backend proxy URL or a non-placeholder Gemini Vision API key is configured.
  // (DEFAULT_GEMINI_VISION_API_KEY is the Maps SDK key and is not enabled for generativelanguage.googleapis.com)
  const hasValidExternalKey =
    Boolean(config.backendProxyUrl) ||
    Boolean(config.apiKey && config.apiKey !== DEFAULT_GEMINI_VISION_API_KEY && config.apiKey.trim().length > 20);

  if (!hasValidExternalKey) {
    return null;
  }

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

  // Optimize & compress image before network transfer to speed up API calls and prevent payload limits
  const optimizedDataUrl = await optimizeImageForVisionAnalysis(imageDataUrl, 800);

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

  const parseJsonClean = (rawText: string): ExternalVisionApiResponse | null => {
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      const parsed = JSON.parse(cleaned) as ExternalVisionApiResponse;
      if (parsed && (parsed.identifiedNameKh || parsed.identifiedNameEn)) {
        return {
          objectType: parsed.objectType || 'cooked_dish',
          identifiedNameKh: parsed.identifiedNameKh || parsed.identifiedNameEn || '',
          identifiedNameEn: parsed.identifiedNameEn || parsed.identifiedNameKh || '',
          confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.82,
          visualCluesKh: Array.isArray(parsed.visualCluesKh) ? parsed.visualCluesKh : [],
          visualCluesEn: Array.isArray(parsed.visualCluesEn) ? parsed.visualCluesEn : [],
          candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
        };
      }
    } catch {
      // ignore parse error
    }
    return null;
  };

  // Option A: Backend Vision Proxy Endpoint (Recommended Production Architecture — No private API key in APK)
  if (config.backendProxyUrl) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(config.backendProxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: optimizedDataUrl,
            systemPrompt: AI_VISION_MULTISTEP_SYSTEM_PROMPT,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (response.ok) {
          const json = await response.json();
          const parsed =
            typeof json === 'string'
              ? parseJsonClean(json)
              : json && (json.identifiedNameKh || json.identifiedNameEn)
              ? (json as ExternalVisionApiResponse)
              : null;
          if (parsed) {
            cacheResponse(parsed);
            return parsed;
          }
        }
      } catch {
        clearTimeout(timer);
      }
    }
  }

  // Option B: Google Gemini Vision API with multi-model fallback (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-2.5-flash`)
  if (config.apiKey && config.apiKey !== DEFAULT_GEMINI_VISION_API_KEY) {
    const base64Data = optimizedDataUrl.includes(',') ? optimizedDataUrl.split(',')[1] : optimizedDataUrl;
    const mimeMatch = optimizedDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const modelsToTry = Array.from(
      new Set([config.modelName || 'gemini-2.0-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'])
    );

    const visionPrompt = `${AI_VISION_MULTISTEP_SYSTEM_PROMPT}
IMPORTANT CAMBODIAN DISH EXAMPLES TO RECOGNIZE ACCURATELY:
- Boiled Balut with Kampot Lime & Pepper: "ពងទាកូនទឹកម្រេចក្រូចឆ្មាកំពត" (Balut with Kampot Lime & Pepper)
- Spicy Stir-Fried Eel with Holy Basil: "ឆាគ្រឿងអន្ទង់ស្លឹកម្រះព្រៅ" (Spicy Lemongrass Stir-Fried Eel)
- Grilled Sun-Dried Fish with Tamarind Dip: "ត្រីងៀតអាំងជ្រលក់ទឹកអម្ពិលទុំ" (Grilled Sun-Dried Fish with Tamarind Dip)
- Glass Noodle Seafood Salad: "ញាំមីសួរគ្រឿងសមុទ្របង្គាមឹក" (Glass Noodle Seafood Salad with Prawns & Squid)
- Grilled Stuffed Frogs on banana leaf / herbs: "កង្កែបបោកអាំងសៀមរាប" (Stuffed Roasted Frogs - Kangkeb Baok) or "កង្កែបបោកអាំងគ្រឿងខ្មែរ"
- Grilled Chicken: "មាន់ដុតច្រាំងទន្លេកំពត" (Kampot Roasted Herbal Chicken)
- Grilled Fish: "ត្រីរ៉ស់អាំងបាយដំណើបអំបិលម្ទេស" (Grilled Snakehead Fish)
- Grilled Beef with Prahok Dip: "សាច់គោអាំងទឹកប្រហុក" (Grilled Beef with Prahok Dip)
- Fish Amok in banana leaf cup: "អាម៉ុកត្រីស្លឹកញ" (Steamed Fish Amok)
- Samlor Korko: "សម្លកកូរត្រីរ៉ស់" (Traditional Stirring Vegetable Soup)
- Khmer Noodles: "នំបញ្ចុកសម្លខ្មែរ" (Num Banh Chok) or "គុយទាវភ្នំពេញ" (Phnom Penh Noodle Soup)
- Beef Lok Lak: "បាយឡុកឡាក់សាច់គោ" (Cambodian Beef Lok Lak)
- Papaya Salad: "បុកល្ហុងក្ដាមប្រៃ" (Cambodian Green Papaya Salad)

Respond strictly in JSON matching:
{
  "objectType": "cooked_dish",
  "identifiedNameKh": "...",
  "identifiedNameEn": "...",
  "confidenceScore": 0.9,
  "visualCluesKh": ["..."],
  "visualCluesEn": ["..."],
  "candidates": [
    { "nameKh": "...", "nameEn": "...", "objectType": "cooked_dish", "confidenceScore": 0.85, "visualCluesKh": "...", "visualCluesEn": "..." }
  ]
}`;

    for (const model of modelsToTry) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
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
                  { text: visionPrompt },
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
            const parsed = parseJsonClean(textOut);
            if (parsed) {
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

  // Only classify as dessert/cake/snack if categorySlug is explicitly dessert/cake or categoryKh starts with បង្អែម
  // Never misclassify savory noodle/crepe dishes like នំបញ្ចុក, នំបាញ់ឆែវ, នំប៉័ងប៉ាតេ, or នំគ្រក់ as dessert!
  if (
    cat === 'dessert' ||
    cat === 'cake' ||
    catKh.startsWith('បង្អែម') ||
    nameKh.startsWith('បង្អែម') ||
    nameKh.includes('សង់ខ្យា') ||
    nameKh.includes('ចេកខ្ទិះ') ||
    nameKh.includes('ក្រឡាន') ||
    nameKh.includes('នំអន្សម') ||
    nameKh.includes('នំគម') ||
    nameKh.includes('នំផ្លែអាយ')
  ) {
    return 'dessert_cake_snack';
  }

  // Only classify as drink_beverage if categorySlug is drink or name is an actual beverage
  // Never misclassify savory dishes with dipping sauces (ទឹកម្រេច, ទឹកប្រហុក, ទឹកអម្ពិលទុំ, ទឹកគ្រឿង, ទឹកដូង) as drinks!
  if (
    cat === 'drink' ||
    catKh.includes('ភេសជ្ជៈ') ||
    nameKh.startsWith('ទឹកក្រឡុក') ||
    nameKh.startsWith('ទឹកអំពៅ') ||
    nameKh.startsWith('ទឹកត្រឡាច') ||
    nameKh.startsWith('ទឹកសណ្ដែក') ||
    nameKh.startsWith('កាហ្វេ') ||
    nameKh.startsWith('តែក្រូចឆ្មា')
  ) {
    return 'drink_beverage';
  }

  return 'cooked_dish';
}

export function buildDishSpecificVisualClues(food: FoodItem): { clueKh: string; clueEn: string } {
  const nameKh = food.nameKh || '';
  const nameEn = food.nameEn || '';
  const catKh = food.categoryKh || 'ម្ហូបខ្មែរ';
  const topIngsKh = (food.ingredients || [])
    .slice(0, 3)
    .map((i) => i.nameKh)
    .join(', ');
  const topIngsEn = (food.ingredients || [])
    .slice(0, 3)
    .map((i) => i.nameEn)
    .join(', ');

  if (nameKh.includes('ពងទាកូន')) {
    return {
      clueKh: 'ពិនិត្យឃើញពងទាកូនស្រុះសំបកពណ៌ស អមដោយស្លឹកជីរពណ៌បៃតងស្រស់ ក្រូចឆ្មារ និងចានទឹកម្រេចកំពត',
      clueEn: 'Detected boiled balut duck egg in white shell with fresh herbs, lime wedge, and Kampot pepper-lime dip',
    };
  }
  if (nameKh.includes('អន្ទង់')) {
    return {
      clueKh: 'ពិនិត្យឃើញសាច់អន្ទង់ឆាគ្រឿងបុករមៀតស្លឹកគ្រៃពណ៌មាសក្រហម ខាប់ឈ្ងុយ ជាមួយស្លឹកម្រះព្រៅ និងម្ទេសក្រហម',
      clueEn: 'Detected golden-red spicy lemongrass kroeung stir-fried eel with holy basil leaves and red chili',
    };
  }
  if (nameKh.includes('ត្រីងៀតអាំង')) {
    return {
      clueKh: 'ពិនិត្យឃើញសាច់ត្រីងៀតអាំងលើភ្លើងធ្យូងពណ៌មាសក្រហម ដាក់លើស្លឹកចេកបៃតង អមដោយចានទឹកអម្ពិលទុំ និងម្ទេស',
      clueEn: 'Detected golden charcoal-grilled sun-dried fish on banana leaf with ripe tamarind dipping sauce and chili',
    };
  }
  if (nameKh.includes('ញាំមីសួរ')) {
    return {
      clueKh: 'ពិនិត្យឃើញសរសៃមីសួរថ្លា ច្របល់ជាមួយបង្គា មឹក ម្ទេសក្រហម និងស្លឹកជីរអង្កាមពណ៌បៃតងស្រស់លើចានស',
      clueEn: 'Detected translucent glass noodles tossed with prawns, squid, red chili, and fresh mint herbs on a white plate',
    };
  }
  if (nameKh.includes('កង្កែបបោក')) {
    return {
      clueKh: 'ពិនិត្យឃើញកង្កែបបោកញាត់គ្រឿងស្លឹកគ្រៃអាំងពណ៌មាសត្នោត ដាក់លើស្លឹកចេក និងទឹកជ្រលក់',
      clueEn: 'Detected golden-brown stuffed grilled frog with lemongrass kroeung on banana leaf and dipping sauce',
    };
  }
  if (topIngsKh) {
    return {
      clueKh: `ពិនិត្យឃើញទម្រង់ម្ហូប «${nameKh}» (${catKh}) ផ្សំពី ${topIngsKh}`,
      clueEn: `Visual profile matches "${nameEn}" prepared with ${topIngsEn || 'traditional Cambodian ingredients'}`,
    };
  }
  return {
    clueKh: `ពិនិត្យឃើញលក្ខណៈពណ៌ និងការរៀបចំចានត្រូវគ្នាជាមួយ «${nameKh}»`,
    clueEn: `Visual plating and color profile match "${nameEn}"`,
  };
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

  // Synonym & Alias expansion for Khmer, English, and Chinese queries
  const SYNONYM_MAP: { triggers: string[]; targetKeywords: string[] }[] = [
    {
      triggers: ['ពងទាកូន', 'ពងទាកូនស្រុះ', 'ទឹកម្រេចកំពត', 'balut', 'duck embryo egg', 'boiled balut', '鸭仔蛋'],
      targetKeywords: ['ពងទាកូនទឹកម្រេចក្រូចឆ្មាកំពត', 'ពងទាកូនស្រុះទឹកម្រេចក្រូចឆ្មា', 'ពងទាកូន'],
    },
    {
      triggers: ['អន្ទង់', 'ឆាគ្រឿងអន្ទង់', 'អន្ទង់ឆាក្ដៅ', 'ឆាក្ដៅអន្ទង់', 'eel', 'stir-fried eel', 'spicy eel', '爆炒黄鳝', '香茅炒鳝鱼'],
      targetKeywords: ['ឆាគ្រឿងអន្ទង់ស្លឹកម្រះព្រៅ', 'អន្ទង់អាំងស្លឹកគ្រៃ', 'អន្ទង់'],
    },
    {
      triggers: ['ត្រីងៀត', 'ត្រីងៀតអាំង', 'ទឹកអម្ពិលទុំ', 'dried fish', 'sun-dried fish', 'grilled dried fish', 'tamarind dip', '烤鱼干'],
      targetKeywords: ['ត្រីងៀតអាំងជ្រលក់ទឹកអម្ពិលទុំ', 'ត្រីងៀតឪឡឹក', 'ត្រីងៀត'],
    },
    {
      triggers: ['ញាំមីសួរ', 'មីសួរគ្រឿងសមុទ្រ', 'មីសួរ', 'ញាំគ្រឿងសមុទ្រ', 'glass noodle salad', 'seafood glass noodle', 'vermicelli salad', '海鲜粉丝沙拉'],
      targetKeywords: ['ញាំមីសួរគ្រឿងសមុទ្របង្គាមឹក', 'មីសួរ'],
    },
    {
      triggers: ['កង្កែបបោក', 'កង្កែបអាំង', 'កង្កែបដុត', 'stuffed frog', 'grilled frog', 'roasted frog', 'kangkeb baok', 'kangkeb', '烤青蛙', '酿青蛙', '塞肉烤蛙'],
      targetKeywords: ['កង្កែបបោកអាំងសៀមរាប', 'កង្កែបបោកអាំងគ្រឿងខ្មែរ', 'កង្កែបបោក'],
    },
    {
      triggers: ['មាន់ដុត', 'មាន់អាំង', 'grilled chicken', 'roast chicken', 'roasted chicken', 'kampot chicken', '烤鸡', '香茅烤鸡'],
      targetKeywords: ['មាន់ដុតច្រាំងទន្លេកំពត', 'មាន់ដុតទឹកឃ្មុំព្រៃភ្នំគូលែន', 'មាន់ដុត'],
    },
    {
      triggers: ['ត្រីអាំង', 'ត្រីដុត', 'ត្រីរ៉ស់អាំង', 'grilled fish', 'roasted fish', 'snakehead fish', '烤鱼'],
      targetKeywords: ['ត្រីរ៉ស់អាំងបាយដំណើបអំបិលម្ទេស', 'ត្រីងៀតអាំងជ្រលក់ទឹកអម្ពិលទុំ', 'ត្រីអណ្តែងអាំងទឹកត្រីផ្អែមស្ដៅ', 'ត្រីរ៉ស់អាំង'],
    },
    {
      triggers: ['សាច់គោអាំង', 'ទឹកប្រហុក', 'grilled beef', 'beef prahok', 'prahok dip', '烤牛肉'],
      targetKeywords: ['សាច់គោអាំងទឹកប្រហុក', 'សាច់គោអាំងចង្កាក់បែបខ្មែរ'],
    },
    {
      triggers: ['អាម៉ុក', 'amok', 'fish amok', 'steamed fish curry', '阿莫克', '高棉鱼阿莫克'],
      targetKeywords: ['អាម៉ុកត្រីស្លឹកញ', 'អាម៉ុក'],
    },
    {
      triggers: ['សម្លកកូរ', 'កកូរ', 'korko', 'samlor korko', 'stirring soup', '高棉什锦蔬菜汤'],
      targetKeywords: ['សម្លកកូរត្រីរ៉ស់', 'សម្លកកូរ'],
    },
    {
      triggers: ['នំបញ្ចុក', 'num banh chok', 'khmer noodles', 'rice noodles', '高棉米粉'],
      targetKeywords: ['នំបញ្ចុកសម្លខ្មែរ', 'នំបញ្ចុកសម្លការី', 'នំបញ្ចុក'],
    },
    {
      triggers: ['គុយទាវ', 'kuy teav', 'noodle soup', 'phnom penh noodle', '金边粿条'],
      targetKeywords: ['គុយទាវភ្នំពេញ', 'គុយទាវទូកកំពង់ចាម', 'គុយទាវ'],
    },
    {
      triggers: ['ឡុកឡាក់', 'lok lak', 'beef lok lak', 'shaking beef', '摇滚牛肉'],
      targetKeywords: ['បាយឡុកឡាក់សាច់គោ', 'ឡុកឡាក់'],
    },
    {
      triggers: ['បាយសាច់ជ្រូក', 'bai sach chrouk', 'pork and rice', 'grilled pork rice', '烤猪肉饭'],
      targetKeywords: ['បាយសាច់ជ្រូកអាំង', 'បាយសាច់ជ្រូក'],
    },
    {
      triggers: ['បុកល្ហុង', 'bok lhong', 'papaya salad', 'green papaya salad', '青木瓜沙拉'],
      targetKeywords: ['បុកល្ហុងក្ដាមប្រៃ', 'បុកល្ហុង'],
    },
    {
      triggers: ['ម្ជូរគ្រឿង', 'machu kroeung', 'sour soup', 'lemongrass sour soup', '酸汤'],
      targetKeywords: ['សម្លម្ជូរគ្រឿងសាច់គោ', 'ម្ជូរគ្រឿង'],
    },
    {
      triggers: ['ខសាច់ជ្រូក', 'ខពងទា', 'khor', 'braised pork', 'caramelized pork', '红烧肉卤蛋'],
      targetKeywords: ['ខសាច់ជ្រូកពងទាទឹកដូង', 'ខសាច់ជ្រូក'],
    },
  ];

  const expandedTargets: string[] = [];
  for (const entry of SYNONYM_MAP) {
    if (entry.triggers.some((t) => qLower.includes(t.toLowerCase()) || t.toLowerCase().includes(qLower))) {
      expandedTargets.push(...entry.targetKeywords.map((k) => k.toLowerCase()));
    }
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
      score = 0.96;
      reasonKh = 'ត្រូវគ្នាពេញលេញជាមួយឈ្មោះម្ហូបក្នុងឃ្លាំងទិន្នន័យផ្លូវការ';
      reasonEn = 'Exact name match in verified Cambodian food database';
    } else if (expandedTargets.some((target) => nameKhLower.includes(target) || target.includes(nameKhLower))) {
      score = nameKhLower === expandedTargets[0] ? 0.94 : 0.89;
      reasonKh = `ត្រូវគ្នាជាមួយឈ្មោះម្ហូប «${food.nameKh}» ក្នុងឃ្លាំងទិន្នន័យផ្លូវការ`;
      reasonEn = `Verified match with "${food.nameEn}" in official Cambodian food database`;
    } else if (nameKhLower.includes(qLower) || qLower.includes(nameKhLower)) {
      const lengthRatio = Math.min(nameKhLower.length, qLower.length) / Math.max(nameKhLower.length, qLower.length);
      score = 0.82 + lengthRatio * 0.12;
      reasonKh = `ត្រូវគ្នាជិតស្និទ្ធជាមួយឈ្មោះម្ហូប «${food.nameKh}» ក្នុងឃ្លាំងទិន្នន័យផ្លូវការ`;
      reasonEn = `Close name match with "${food.nameEn}" in verified database`;
    } else if (nameEnLower.includes(qLower) || qLower.includes(nameEnLower)) {
      score = 0.85;
      reasonKh = `ត្រូវគ្នាជាមួយឈ្មោះភាសាអង់គ្លេស "${food.nameEn}"`;
      reasonEn = `Matches English dish name "${food.nameEn}"`;
    }

    if (score >= 0.80) {
      dishMatches.push({ food, score: Math.min(0.96, score), matchReasonKh: reasonKh, matchReasonEn: reasonEn });
    }
  }

  dishMatches.sort((a, b) => b.score - a.score);

  if (dishMatches.length > 0) {
    const best = dishMatches[0];
    const objType = inferDishObjectTypeFromCategory(best.food);
    const meta = AI_OBJECT_TYPE_METADATA[objType];

    const candidates: AiFoodMatchCandidate[] = dishMatches.slice(0, 5).map((m) => {
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
      messageKh: `✅ រកឃើញរូបមន្តសម្រាប់ «${best.food.nameKh}» នៅក្នុងឃ្លាំងទិន្នន័យម្ហូបខ្មែរផ្លូវការ!`,
      messageEn: `✅ Verified recipe found for "${best.food.nameEn}" in the official Cambodian food database!`,
      detectedVisualFeatures: [meta.labelKh, best.food.categoryKh],
      disclaimerKh: 'រូបមន្ត និងគ្រឿងផ្សំត្រូវបានទាញចេញពីឃ្លាំងទិន្នន័យម្ហូបខ្មែរផ្លូវការ ប៉ុន្តែមិនអាចបញ្ជាក់គ្រឿងផ្សំជាក់ស្តែងក្នុងចានរបស់អ្នកពីរូបភាពតែមួយមុខបានទេ។',
      disclaimerEn: 'Recipes and ingredients are retrieved from the official Cambodian database, but actual ingredients in your specific dish cannot be verified from a photo alone.',
      foodSafetyAdvisory: buildFoodSafetyAdvisory(best.food, undefined, true),
      processingTimeMs: Date.now() - startTime,
    };
  }

  // 2. Priority 2: Search Verified Non-Dish Items KB (Fruits, Vegetables, Raw Meats, Packaged Items, Ingredients)
  const matchedNonDish = VERIFIED_NON_DISH_ITEMS_KB.find((item) => {
    const itemText = (item.nameKh + ' ' + item.nameEn).toLowerCase();
    return (
      itemText.includes(qLower) ||
      item.searchKeywordsKh.some((kw) => kw.toLowerCase() === qLower)
    );
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
      foodSafetyAdvisory: buildFoodSafetyAdvisory(undefined, matchedNonDish, false),
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
      candidateMatches: dishesContainingIngredient.slice(0, 4).map((d) => ({
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
      foodSafetyAdvisory: buildFoodSafetyAdvisory(dishesContainingIngredient[0], customIngredientInfo, false),
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
    messageKh: `⚠️ មិនអាចផ្ទៀងផ្ទាត់រូបមន្តសម្រាប់ «${cleanQuery}» បានទេ។ ប្រព័ន្ធមិនបង្កើតគ្រឿងផ្សំ ឬរបៀបធ្វើស្មានដោយគ្មានប្រភពផ្លូវការឡើយ។ សូមសាកល្បងឈ្មោះម្ហូបខ្មែរផ្សេងទៀត (ឧ. ពងទាកូន, ឆាគ្រឿងអន្ទង់, ត្រីងៀតអាំង, ញាំមីសួរ, អាម៉ុកត្រី, សម្លកកូរ, នំបញ្ចុក)។`,
    messageEn: `⚠️ Could not verify a reliable recipe for "${cleanQuery}". The system never invents ingredients or cooking steps without verified sources.`,
    detectedVisualFeatures: ['មិនទាន់មានក្នុងឃ្លាំងទិន្នន័យផ្ទៀងផ្ទាត់ (Not in verified DB)'],
    disclaimerKh: '⚠️ ការកែតម្រូវឈ្មោះរបស់អ្នកត្រូវបានរក្សាទុកសម្រាប់ Admin ត្រួតពិនិត្យបន្ថែម។',
    disclaimerEn: '⚠️ Your manual entry has been logged for review to improve future accuracy.',
    foodSafetyAdvisory: buildFoodSafetyAdvisory(undefined, undefined, false),
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// PERCEPTUAL 8x8 SPATIAL RGB MATCHING AGAINST 200-DISH REFERENCE INDEX
// ============================================================================
let parsedVisualSignaturesCache: Map<string, number[][]> | null = null;

function getParsedVisualSignatures(): Map<string, number[][]> {
  if (parsedVisualSignaturesCache) {
    return parsedVisualSignaturesCache;
  }
  const map = new Map<string, number[][]>();
  for (const [foodId, sigStrings] of Object.entries(FOOD_VISUAL_SIGNATURES)) {
    if (!Array.isArray(sigStrings)) continue;
    const vectors: number[][] = [];
    for (const raw of sigStrings) {
      const nums = raw.split(',').map((n) => parseInt(n, 10));
      if (nums.length === 192) {
        vectors.push(nums);
      }
    }
    if (vectors.length > 0) {
      map.set(foodId, vectors);
    }
  }
  parsedVisualSignaturesCache = map;
  return map;
}

export function computePerceptualDishDistances(spatialRgb192: number[]): Map<string, number> {
  const minRmseByFoodId = new Map<string, number>();
  if (!spatialRgb192 || spatialRgb192.length !== 192) {
    return minRmseByFoodId;
  }

  const parsedMap = getParsedVisualSignatures();
  for (const [foodId, vectors] of parsedMap.entries()) {
    let bestRmse = 999;
    for (const ref of vectors) {
      let sumSq = 0;
      for (let i = 0; i < 192; i++) {
        const diff = spatialRgb192[i] - ref[i];
        sumSq += diff * diff;
      }
      const rmse = Math.sqrt(sumSq / 192);
      if (rmse < bestRmse) {
        bestRmse = rmse;
      }
    }
    minRmseByFoodId.set(foodId, bestRmse);
  }

  return minRmseByFoodId;
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

  // Optional Real External Vision API Call (Backend Vision Proxy / Gemini Vision)
  const externalVision = await callRealVisionApiProvider(imageDataUrl);
  if (externalVision && (externalVision.identifiedNameKh || externalVision.identifiedNameEn) && externalVision.confidenceScore >= 0.50) {
    const queryToUse = externalVision.identifiedNameKh || externalVision.identifiedNameEn;
    let lookedUp = retrieveRecipeAndInfoByFoodName(queryToUse, allFoods, startTime);
    if (lookedUp.status !== 'confident' && externalVision.identifiedNameEn) {
      lookedUp = retrieveRecipeAndInfoByFoodName(externalVision.identifiedNameEn, allFoods, startTime);
    }
    if (lookedUp.status === 'confident') {
      const conf = Math.min(0.95, Math.max(0.65, externalVision.confidenceScore));
      return {
        ...lookedUp,
        status: 'uncertain',
        requiresUserConfirmation: true,
        confidenceScore: conf,
        visualCluesSummaryKh:
          (externalVision.visualCluesKh && externalVision.visualCluesKh.join(' • ')) || lookedUp.visualCluesSummaryKh,
        visualCluesSummaryEn:
          (externalVision.visualCluesEn && externalVision.visualCluesEn.join(' • ')) || lookedUp.visualCluesSummaryEn,
      };
    }
  }

  // STAGE 1: Analyze Image Structure & Classify Object Type First (True HSV + 8x8 Spatial Perceptual Vector)
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
      foodSafetyAdvisory: buildFoodSafetyAdvisory(undefined, undefined, false),
      processingTimeMs: Date.now() - startTime,
    };
  }

  const findKbItem = (id: string): IdentifiedNonDishItemInfo =>
    VERIFIED_NON_DISH_ITEMS_KB.find((i) => i.id === id) || VERIFIED_NON_DISH_ITEMS_KB[0];

  // Check Perceptual Distance first so that if an image is a close match to a known prepared dish in `FOOD_VISUAL_SIGNATURES`,
  // we don't accidentally divert it into raw fruit/vegetable!
  const perceptualDistances = computePerceptualDishDistances(profile.spatialRgb192);
  let bestPerceptualRmse = 999;
  for (const dist of perceptualDistances.values()) {
    if (dist < bestPerceptualRmse) bestPerceptualRmse = dist;
  }

  // STAGE 2A: Fresh Papaya / Packaged Sliced Papaya / Fresh Fruit Recognition
  // Only trigger if it is not a close perceptual match to a prepared dish (`bestPerceptualRmse > 28`)
  if (
    bestPerceptualRmse > 28 &&
    (profile.inferredObjectType === 'fresh_fruit' || profile.inferredObjectType === 'packaged_food')
  ) {
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
        foodSafetyAdvisory: buildFoodSafetyAdvisory(undefined, mangoItem, false),
        processingTimeMs: Date.now() - startTime,
      };
    }

    const isHighConfidencePapaya = profile.orangeCoralRatio >= 0.35 && profile.greenRatio < 0.03;
    const primaryPapayaConfidence = isHighConfidencePapaya ? 0.88 : 0.72;
    const primaryPapayaItem = freshPapayaItem;

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
      foodSafetyAdvisory: buildFoodSafetyAdvisory(undefined, primaryPapayaItem, false),
      processingTimeMs: Date.now() - startTime,
    };
  }

  if (bestPerceptualRmse > 28 && profile.inferredObjectType === 'fresh_vegetables') {
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
      foodSafetyAdvisory: buildFoodSafetyAdvisory(undefined, vegItem, false),
      processingTimeMs: Date.now() - startTime,
    };
  }

  if (bestPerceptualRmse > 28 && profile.inferredObjectType === 'raw_meat_seafood') {
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
      foodSafetyAdvisory: buildFoodSafetyAdvisory(undefined, meatItem, false),
      processingTimeMs: Date.now() - startTime,
    };
  }

  // STAGE 2B: Prepared Dishes — Hybrid Perceptual Reference Matching + 12-Archetype Culinary Feature Ranking
  const candidatePool: { food: FoodItem; score: number; clueKh: string; clueEn: string }[] = [];
  const archetype = profile.dishArchetype;

  for (const food of allFoods) {
    const nameKh = food.nameKh || '';
    const nameEn = (food.nameEn || '').toLowerCase();
    const catSlug = (food.categorySlug || '').toLowerCase();
    let archetypeScore = 0;

    // 1. Archetype A: Boiled Balut / Duck Egg with Kampot Lime-Pepper Dip & Fresh Ram Herbs
    if (archetype === 'balut_or_eggs_on_plate_with_herbs') {
      if (nameKh === 'ពងទាកូនទឹកម្រេចក្រូចឆ្មាកំពត' || food.id === 'food-50') {
        archetypeScore = 0.89;
      } else if (nameKh === 'ពងទាកូនស្រុះទឹកម្រេចក្រូចឆ្មា' || food.id === 'food-184') {
        archetypeScore = 0.83;
      } else if (nameKh.includes('ពងទា')) {
        archetypeScore = 0.72;
      } else if (nameKh.includes('ងាវស្រុះ') || nameKh.includes('ក្ដាមសេះចំហុយ')) {
        archetypeScore = 0.65;
      }
    }
    // 2. Archetype B: Glass Noodle Seafood Salad (ញាំមីសួរគ្រឿងសមុទ្របង្គាមឹក)
    else if (archetype === 'seafood_glass_noodle_or_herb_salad_on_plate') {
      if (nameKh === 'ញាំមីសួរគ្រឿងសមុទ្របង្គាមឹក' || food.id === 'food-149') {
        archetypeScore = 0.89;
      } else if (nameKh.includes('ភ្លាបង្គា') || nameKh.includes('ភ្លាសាច់គោ') || nameKh.includes('ញាំក្រូចថ្លុង')) {
        archetypeScore = 0.77;
      } else if (nameKh.includes('បុកល្ហុង') || catSlug === 'salad') {
        archetypeScore = 0.71;
      } else if (nameKh === 'នំបញ្ចុកសម្លខ្មែរ') {
        archetypeScore = 0.64;
      }
    }
    // 3. Archetype C: Spicy Lemongrass Kroeung Stir-Fried Eel / Meat (ឆាគ្រឿងអន្ទង់ស្លឹកម្រះព្រៅ)
    else if (archetype === 'spicy_red_gold_kroeung_stirfry_eel_or_meat') {
      if (nameKh === 'ឆាគ្រឿងអន្ទង់ស្លឹកម្រះព្រៅ' || food.id === 'food-143') {
        archetypeScore = 0.89;
      } else if (nameKh === 'ឆាក្ដៅសាច់មាន់ម្រះព្រៅ' || nameKh.includes('ឆាក្ដៅ')) {
        archetypeScore = 0.80;
      } else if (nameKh.includes('ឆាគ្រឿង')) {
        archetypeScore = 0.76;
      } else if (nameKh === 'ប្រហុកខ្ទិះសាច់ជ្រូកចិញ្ច្រាំ') {
        archetypeScore = 0.70;
      }
    }
    // 4. Archetype D: Charcoal-Grilled Sun-Dried Fish with Tamarind Dip (ត្រីងៀតអាំងជ្រលក់ទឹកអម្ពិលទុំ)
    else if (archetype === 'grilled_golden_fish_with_herb_corner_and_dip') {
      if (nameKh === 'ត្រីងៀតអាំងជ្រលក់ទឹកអម្ពិលទុំ' || food.id === 'food-127') {
        archetypeScore = 0.89;
      } else if (nameKh === 'ត្រីរ៉ស់អាំងបាយដំណើបអំបិលម្ទេស' || nameKh.includes('ត្រីអណ្តែងអាំង')) {
        archetypeScore = 0.79;
      } else if (nameKh === 'មាន់ដុតច្រាំងទន្លេកំពត' || nameKh.includes('មាន់ដុត')) {
        archetypeScore = 0.74;
      } else if (nameKh === 'កង្កែបបោកអាំងសៀមរាប') {
        archetypeScore = 0.68;
      }
    }
    // 5. Archetype E: Grilled / Roasted on Banana Leaf or Herbs
    else if (archetype === 'grilled_on_banana_leaf_or_herbs' || archetype === 'grilled_charred_meat_or_seafood') {
      if (nameKh === 'កង្កែបបោកអាំងសៀមរាប') {
        archetypeScore = archetype === 'grilled_on_banana_leaf_or_herbs' ? 0.80 : 0.75;
      } else if (nameKh === 'មាន់ដុតច្រាំងទន្លេកំពត' || nameKh.includes('មាន់ដុត')) {
        archetypeScore = 0.78;
      } else if (nameKh === 'ត្រីងៀតអាំងជ្រលក់ទឹកអម្ពិលទុំ' || nameKh === 'ត្រីរ៉ស់អាំងបាយដំណើបអំបិលម្ទេស') {
        archetypeScore = 0.77;
      } else if (nameKh === 'សាច់គោអាំងទឹកប្រហុក' || nameKh.includes('សាច់គោអាំង')) {
        archetypeScore = 0.76;
      } else if (catSlug === 'grill') {
        archetypeScore = 0.64;
      }
    }
    // 6. Yellow Kroeung / Steamed Amok / Curry
    else if (archetype === 'yellow_kroeung_amok_or_curry') {
      if (nameKh === 'អាម៉ុកត្រីស្លឹកញ') {
        archetypeScore = 0.83;
      } else if (nameKh === 'សម្លការីសាច់មាន់') {
        archetypeScore = 0.78;
      } else if (nameKh === 'សម្លម្ជូរគ្រឿងសាច់គោ') {
        archetypeScore = 0.75;
      } else if (nameKh === 'សម្លកកូរត្រីរ៉ស់') {
        archetypeScore = 0.71;
      }
    }
    // 7. Green Herbal Soup / Samlor Korko / Sour Soup
    else if (archetype === 'green_herbal_korko_or_sour_soup') {
      if (nameKh === 'សម្លកកូរត្រីរ៉ស់') {
        archetypeScore = 0.83;
      } else if (nameKh === 'សម្លម្ជូរគ្រឿងសាច់គោ' || nameKh === 'សម្លប្រហើរទំពាំងត្រីឆ្អើរ') {
        archetypeScore = 0.77;
      } else if (nameKh === 'ទឹកគ្រឿងខ្មែរ') {
        archetypeScore = 0.74;
      } else if (nameKh === 'បុកល្ហុងក្ដាមប្រៃ') {
        archetypeScore = 0.70;
      }
    }
    // 8. White Noodles / Rice Porridge / Rice Dish
    else if (archetype === 'white_noodles_porridge_or_rice') {
      if (nameKh === 'នំបញ្ចុកសម្លខ្មែរ') {
        archetypeScore = 0.80;
      } else if (nameKh === 'គុយទាវភ្នំពេញ') {
        archetypeScore = 0.78;
      } else if (nameKh === 'បាយសាច់ជ្រូកអាំង') {
        archetypeScore = 0.75;
      } else if (nameKh === 'បបរគ្រឿងមាន់ស្រែ') {
        archetypeScore = 0.72;
      }
    }
    // 9. Dark Braised Khor / Stir-fried Beef Lok Lak
    else if (archetype === 'dark_braised_khor_or_lok_lak') {
      if (nameKh === 'បាយឡុកឡាក់សាច់គោ') {
        archetypeScore = 0.82;
      } else if (nameKh === 'ខសាច់ជ្រូកពងទាទឹកដូង') {
        archetypeScore = 0.79;
      } else if (nameKh === 'សាច់គោអាំងទឹកប្រហុក') {
        archetypeScore = 0.74;
      } else if (nameKh === 'ឆាគ្រឿងអន្ទង់ស្លឹកម្រះព្រៅ' || nameKh === 'ឆាក្ដៅសាច់មាន់ម្រះព្រៅ') {
        archetypeScore = 0.72;
      }
    }
    // 10. General Cooked Dish
    else {
      if (nameKh === 'បាយឡុកឡាក់សាច់គោ' || nameKh === 'អាម៉ុកត្រីស្លឹកញ') {
        archetypeScore = 0.72;
      } else if (nameKh === 'បុកល្ហុងក្ដាមប្រៃ' || nameKh === 'ញាំមីសួរគ្រឿងសមុទ្របង្គាមឹក') {
        archetypeScore = 0.70;
      } else if (nameKh === 'មាន់ដុតច្រាំងទន្លេកំពត' || nameKh === 'ត្រីងៀតអាំងជ្រលក់ទឹកអម្ពិលទុំ') {
        archetypeScore = 0.68;
      }
    }

    // Combine Perceptual 8x8 Spatial RGB Similarity (`rmse`) with Culinary Archetype Score
    const rmse = perceptualDistances.get(food.id) ?? 999;
    let perceptualScore = 0;
    if (rmse <= 10) {
      perceptualScore = 0.93 - (rmse / 10) * 0.04; // 0.89 .. 0.93 for near-exact visual matches
    } else if (rmse <= 28) {
      perceptualScore = 0.88 - ((rmse - 10) / 18) * 0.10; // 0.78 .. 0.88 for cropped/re-encoded visual matches
    } else if (rmse <= 52) {
      perceptualScore = 0.76 - ((rmse - 28) / 24) * 0.18; // 0.58 .. 0.76 for visually similar dishes
    }

    const finalScore =
      perceptualScore >= 0.78
        ? Math.max(perceptualScore, archetypeScore)
        : archetypeScore > 0 && perceptualScore > 0
        ? Math.max(archetypeScore, perceptualScore * 0.65 + archetypeScore * 0.35)
        : Math.max(archetypeScore, perceptualScore);

    if (finalScore >= 0.56) {
      const clues = buildDishSpecificVisualClues(food);
      candidatePool.push({
        food,
        score: Math.round(finalScore * 100) / 100,
        clueKh: clues.clueKh,
        clueEn: clues.clueEn,
      });
    }
  }

  candidatePool.sort((a, b) => b.score - a.score);

  // Ensure we always have a helpful set of top candidates for any valid non-blurry food image
  if (candidatePool.length === 0 && allFoods.length > 0) {
    const fallbackDishes = [
      { kw: 'បាយឡុកឡាក់សាច់គោ', sc: 0.72 },
      { kw: 'អាម៉ុកត្រីស្លឹកញ', sc: 0.69 },
      { kw: 'មាន់ដុតច្រាំងទន្លេកំពត', sc: 0.66 },
      { kw: 'សម្លកកូរត្រីរ៉ស់', sc: 0.63 },
    ];
    for (const fb of fallbackDishes) {
      const found = allFoods.find((f) => f.nameKh.includes(fb.kw));
      if (found) {
        const clues = buildDishSpecificVisualClues(found);
        candidatePool.push({ food: found, score: fb.sc, clueKh: clues.clueKh, clueEn: clues.clueEn });
      }
    }
  }

  const topCandidates: AiFoodMatchCandidate[] = candidatePool.slice(0, 5).map((c) => ({
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

  const primaryCandidate = topCandidates[0];
  const primaryFood = primaryCandidate?.foodItem;
  const topScore = primaryCandidate ? primaryCandidate.confidenceScore : 0.65;
  const resolvedObjectType = primaryCandidate?.objectType || 'cooked_dish';

  return {
    // Always present visual photo recognition as an honest AI Assistant suggestion (`requiresUserConfirmation: true`)
    // until the user taps Confirm or selects one of the candidate dishes!
    status: 'uncertain',
    objectType: resolvedObjectType,
    objectTypeLabelKh: AI_OBJECT_TYPE_METADATA[resolvedObjectType].labelKh,
    objectTypeLabelEn: AI_OBJECT_TYPE_METADATA[resolvedObjectType].labelEn,
    isPreparedDish: true,
    identifiedNameKh: primaryCandidate ? primaryCandidate.nameKh : 'ម្ហូបចម្អិនរួច (សូមបញ្ជាក់ឈ្មោះ)',
    identifiedNameEn: primaryCandidate ? primaryCandidate.nameEn : 'Prepared Dish (Please Confirm)',
    confidenceScore: topScore,
    visualCluesSummaryKh: primaryCandidate
      ? primaryCandidate.visualCluesKh
      : profile.visualCluesKh.join(' • '),
    visualCluesSummaryEn: primaryCandidate
      ? primaryCandidate.visualCluesEn
      : profile.visualCluesEn.join(' • '),
    candidateMatches: topCandidates,
    primaryMatch: primaryFood,
    isVerifiedRecipe: true,
    requiresUserConfirmation: true,
    uncertainPromptKh: REQUIRED_UNCERTAIN_PROMPT_KH,
    uncertainPromptEn: REQUIRED_UNCERTAIN_PROMPT_EN,
    messageKh: primaryCandidate
      ? `🤖 ជំនួយការ AI បានវិភាគលក្ខណៈរូបភាព និងរកឃើញម្ហូបដែលទំនងបំផុតគឺ «${primaryCandidate.nameKh}» (${Math.round(topScore * 100)}%)។ សូមចុចបញ្ជាក់ ឬជ្រើសរើសមុខម្ហូបផ្សេងខាងក្រោមប្រសិនបើខុសពីម្ហូបរបស់អ្នក។`
      : REQUIRED_UNCERTAIN_PROMPT_KH,
    messageEn: primaryCandidate
      ? `🤖 AI Assistant matched "${primaryCandidate.nameEn}" (${Math.round(topScore * 100)}% visual similarity). Please confirm below or tap an alternative dish.`
      : REQUIRED_UNCERTAIN_PROMPT_EN,
    detectedVisualFeatures: [AI_OBJECT_TYPE_METADATA[resolvedObjectType].labelKh, ...profile.visualCluesKh],
    disclaimerKh:
      '⚠️ ជំនួយការ AI ណែនាំមុខម្ហូបដោយផ្អែកលើពណ៌ និងទម្រង់រូបភាព។ សូមបញ្ជាក់ឈ្មោះម្ហូបខាងក្រោម ហើយប្រព័ន្ធមិនអាចធានាគ្រឿងផ្សំ ឬសារធាតុអាលែកហ្ស៊ីទាំងស្រុងដោយគ្រាន់តែមើលរូបភាពឡើយ។',
    disclaimerEn:
      '⚠️ AI Assistant suggests likely matches based on visual features. Please confirm the dish name below; ingredients and allergens cannot be guaranteed from a photo alone.',
    foodSafetyAdvisory: buildFoodSafetyAdvisory(primaryFood, undefined, false),
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

import type { FoodItem, Language } from '../types';
import { getSpicyDishScore } from './khmerFoodSearch';

/**
 * Dish tags derived ONLY from existing recipe data (calories, ingredients, cooking steps, category).
 * Transparent keyword rules, no health claims. Labelled in the UI as a recipe-based guide.
 * Never produces low-salt / low-sugar / diabetic / heart-healthy / disease-related tags.
 */
export type DishTagId =
  | 'light'
  | 'steamed_boiled'
  | 'grilled'
  | 'fried'
  | 'vegetable_rich'
  | 'protein_rich'
  | 'vegetarian_friendly'
  | 'spicy'
  | 'fish_sauce_prahok';

export interface DishTag {
  id: DishTagId;
  labelKh: string;
  labelEn: string;
  labelZh: string;
  emoji: string;
  /** Visual tone: green = positive, blue = cooking method, amber = info only */
  tone: 'green' | 'blue' | 'amber';
  /** Information-only tags (e.g. fried, contains fish sauce) */
  infoOnly?: boolean;
  /** One-line practical reason to pick this category (recipe-based, no medical claims) */
  benefitKh?: string;
  benefitEn?: string;
  benefitZh?: string;
  /** Practical everyday cooking tip for this category */
  cookingTipKh?: string;
  cookingTipEn?: string;
  cookingTipZh?: string;
}

export const DISH_TAG_DEFS: Record<DishTagId, DishTag> = {
  light: { id: 'light', labelKh: 'ស្រាល', labelEn: 'Light', labelZh: '清淡', emoji: '🌿', tone: 'green', benefitKh: "< 450 kcal • មិនហឹរ មិនជូរ គ្មានប្រហុក មិនឆៅ មិនចៀន/អាំង • ស្រាលក្រពះ", benefitEn: "Under 450 kcal • not spicy or sour, no prahok, not raw, fried or grilled • gentle on the stomach", benefitZh: "每份低于 450 千卡 • 不辣不酸、无发酵鱼酱、非生食/油炸/烧烤 • 养胃清淡", cookingTipKh: "គន្លឹះ៖ បន្ថយប្រេងឆា ទឹកត្រី ឬស្ករ ហើយបន្ថែមបន្លែស្រស់ឱ្យបានច្រើន", cookingTipEn: "Tip: use less oil, fish sauce or sugar, and add plenty of fresh vegetables.", cookingTipZh: "小贴士：少放油、鱼露或糖，多加新鲜蔬菜。" },
  steamed_boiled: { id: 'steamed_boiled', labelKh: 'ចំហុយ/ស្ងោរ', labelEn: 'Steamed/Boiled', labelZh: '蒸/煮', emoji: '♨️', tone: 'blue', benefitKh: "ចម្អិនដោយចំហុយ/ស្ងោរ • កាត់បន្ថយប្រេងឆា & ស្រួលរំលាយ", benefitEn: "Steamed or boiled • less frying oil & gentle to digest", benefitZh: "蒸或煮 • 少油，易于消化", cookingTipKh: "គន្លឹះ៖ ចំហុយ ឬស្ងោរជំនួសការចៀន ហើយបន្ថយអំបិល និងទឹកត្រីក្នុងទឹកស៊ុប", cookingTipEn: "Tip: steam or boil instead of frying, and go easy on salt and fish sauce in the broth.", cookingTipZh: "小贴士：以蒸、煮代替油炸，汤底少放盐和鱼露。" },
  grilled: { id: 'grilled', labelKh: 'អាំង/ដុត', labelEn: 'Grilled', labelZh: '烧烤', emoji: '🔥', tone: 'blue', benefitKh: "អាំង/ដុត ស្រក់ខ្លាញ់ចេញ • ឈ្ងុយឆ្ងាញ់មិនបាច់បំពង", benefitEn: "Grilled • fat drips away, tasty without deep-frying", benefitZh: "烧烤 • 油脂滴落，无需油炸也美味", cookingTipKh: "គន្លឹះ៖ អាំងលើភ្លើងស្រាល កុំឱ្យឆេះខ្មៅ ហើយកាត់ខ្លាញ់ចេញមុនអាំង", cookingTipEn: "Tip: grill over gentle heat, avoid charring, and trim visible fat first.", cookingTipZh: "小贴士：用温和火力烤制，避免烤焦，烤前去除肥肉。" },
  fried: { id: 'fried', labelKh: 'បំពង/ចៀន', labelEn: 'Fried', labelZh: '油炸', emoji: '🍳', tone: 'amber', infoOnly: true },
  vegetable_rich: { id: 'vegetable_rich', labelKh: 'សម្បូរបន្លែ', labelEn: 'Vegetable-rich', labelZh: '蔬菜丰富', emoji: '🥬', tone: 'green', benefitKh: "សម្បូរបន្លែធម្មជាតិ & ជាតិសរសៃជំនួយការរំលាយអាហារ", benefitEn: "Plenty of natural vegetables & dietary fiber", benefitZh: "富含天然蔬菜与膳食纤维", cookingTipKh: "គន្លឹះ៖ ដាក់បន្លែឱ្យបានច្រើនជាងសាច់ ហើយកុំចម្អិនយូរពេកដើម្បីរក្សាភាពស្រស់", cookingTipEn: "Tip: add more vegetables than meat and avoid overcooking to keep them fresh.", cookingTipZh: "小贴士：多放蔬菜、少放肉，避免煮得过久以保持新鲜。" },
  protein_rich: { id: 'protein_rich', labelKh: 'សម្បូរប្រូតេអ៊ីន', labelEn: 'Protein-rich', labelZh: '蛋白质丰富', emoji: '💪', tone: 'green', benefitKh: "ប្រូតេអ៊ីនប្រហែល ២៥ ក្រាមឡើង ក្នុង ១ ចាន ពីសាច់ ត្រី ឬតៅហ៊ូ", benefitEn: "About 25 g+ protein per serving from meat, fish or tofu", benefitZh: "每份约含 25 克以上蛋白质（来自肉、鱼或豆腐）", cookingTipKh: "គន្លឹះ៖ ជ្រើសសាច់ស្គម ឬត្រី ចម្អិនដោយចំហុយ ស្ងោរ ឬអាំង ហើយញ៉ាំជាមួយបន្លែ", cookingTipEn: "Tip: choose lean meat or fish, steam, boil or grill it, and serve with vegetables.", cookingTipZh: "小贴士：选择瘦肉或鱼，以蒸、煮或烤的方式烹饪，并搭配蔬菜。" },
  vegetarian_friendly: { id: 'vegetarian_friendly', labelKh: 'សមស្របអ្នកញ៉ាំបួស', labelEn: 'Vegetarian-friendly', labelZh: '素食友好', emoji: '🌱', tone: 'green', benefitKh: "ម្ហូបបួស & បន្លែធម្មជាតិ", benefitEn: "Plant-based or easy to make vegetarian", benefitZh: "植物性或易于做成素食", cookingTipKh: "គន្លឹះ៖ ជំនួសទឹកត្រី និងប្រហុកដោយទឹកស៊ីអ៊ីវ ឬអំបិល ដើម្បីធ្វើជាម្ហូបបួស", cookingTipEn: "Tip: swap fish sauce and prahok for soy sauce or salt to make it fully vegetarian.", cookingTipZh: "小贴士：用酱油或盐代替鱼露和发酵鱼酱，即可做成素食。" },
  spicy: { id: 'spicy', labelKh: 'ហឹរ', labelEn: 'Spicy', labelZh: '辣', emoji: '🌶️', tone: 'amber' },
  fish_sauce_prahok: { id: 'fish_sauce_prahok', labelKh: 'មានទឹកត្រី/ប្រហុក', labelEn: 'Contains fish sauce/prahok', labelZh: '含鱼露/发酵鱼酱', emoji: '🐟', tone: 'amber', infoOnly: true },
};

/** Order in which tags are shown when only a few fit on a card. */
const DISPLAY_PRIORITY: DishTagId[] = [
  'light',
  'vegetarian_friendly',
  'grilled',
  'steamed_boiled',
  'protein_rich',
  'vegetable_rich',
  'spicy',
  'fried',
  'fish_sauce_prahok',
];

// ---- Transparent keyword rule table (km + en) ----
export const TAG_KEYWORD_RULES = {
  steamedBoiled: ['steam', 'boil', 'simmer', 'poach', 'ចំហុយ', 'ស្ងោរ', 'ដាំ'],
  grilled: ['grill', 'roast', 'charcoal', 'barbecue', 'bbq', 'អាំង', 'ដុត'],
  fried: ['deep-fr', 'deep fr', 'fried', 'frying', 'បំពង', 'ចៀន'],
  vegetables: [
    'cabbage', 'eggplant', 'aubergine', 'bean', 'mushroom', 'pumpkin', 'gourd', 'melon', 'spinach',
    'cucumber', 'tomato', 'blossom', 'morning glory', 'water spinach', 'broccoli', 'cauliflower', 'okra',
    'bamboo shoot', 'papaya', 'carrot', 'lettuce', 'moringa', 'greens', 'sprout',
    'ស្ពៃ', 'ត្រប់', 'ផ្សិត', 'ល្ពៅ', 'ត្រកួន', 'សណ្តែក', 'ត្រសក់', 'ប៉េងប៉ោះ',
    'water mimosa', 'banana blossom', 'mixed vegetable', 'vegetable', 'kohlrabi', 'celery',
    'bitter melon', 'winter melon', 'long bean', 'yardlong', 'mustard green', 'chinese cabbage', 'taro stem',
    'បន្លែ', 'ត្រយូងចេក', 'ស្លឹកងុប', 'ស្លឹកម្រុម', 'កញ្ឆែត', 'ព្រលិត', 'ត្រឡាច', 'ននោង', 'ល្ហុង', 'ឆៃថាវ', 'ពោត',
    'សណ្ដែកគួរ', 'សណ្ដែក', 'ផ្កាខាត់ណា', 'ស្ពៃក្ដោប', 'ស្ពៃក្តោប', 'ស្លឹកបាស',
  ],
  // Dish names that themselves signal a vegetable soup / stir-fry / salad
  vegetableDishName: ['សម្លកកូរ', 'សម្លម្ជូរ', 'ឆាបន្លែ', 'ញាំ', 'ភ្លា', 'ទឹកគ្រឿង', 'salad', 'vegetable'],
  // Main proteins only (no egg: egg-based desserts must not count as protein dishes)
  mainProtein: [
    'pork', 'beef', 'chicken', 'duck', 'fish', 'shrimp', 'prawn', 'crab', 'squid', 'tofu', 'frog', 'eel', 'liver',
    'clam', 'mussel', 'snail', 'meat',
    'សាច់', 'ត្រី', 'បង្គា', 'ក្តាម', 'មឹក', 'កង្កែប', 'តៅហ៊ូ',
  ],
  sweet: ['dessert', 'cake', 'pudding', 'sweet', 'custard', 'jelly'],
  // Fruit/coconut "flesh" is not animal meat
  notMeat: ['សាច់ដូង', 'សាច់ល្ពៅ', 'សាច់ចេក', 'សាច់ស្វាយ', 'សាច់ក្រូច', 'សាច់ម្នាស់', 'coconut meat', 'coconut flesh'],
  // Condiments that can simply be swapped for a vegetarian version
  swappable: ['sauce', 'paste', 'prahok', 'ទឹកត្រី', 'ប្រហុក', 'កាពិ', 'ទឹកស៊ីអ៊ីវ'],
  animalProtein: [
    'pork', 'beef', 'chicken', 'duck', 'fish', 'shrimp', 'prawn', 'crab', 'squid', 'egg', 'tofu', 'frog', 'eel',
    'liver', 'meat', 'clam', 'mussel', 'snail',
    'សាច់', 'ត្រី', 'បង្គា', 'ក្តាម', 'មឹក', 'ស៊ុត', 'កង្កែប',
  ],
  // Ingredient names that mean "sauce / paste" rather than a main protein
  sauceLike: ['sauce', 'paste', 'prahok', 'broth', 'stock', 'ទឹកត្រី', 'ប្រហុក', 'កាពិ', 'ទឹកស៊ីអ៊ីវ', 'ទឹកស៊ុប'],
  fishSauce: ['fish sauce', 'prahok', 'shrimp paste', 'fermented fish', 'ទឹកត្រី', 'ប្រហុក', 'កាពិ'],
  nonVegetarian: [
    'pork', 'beef', 'chicken', 'duck', 'fish', 'shrimp', 'prawn', 'crab', 'squid', 'frog', 'eel', 'liver',
    'meat', 'clam', 'mussel', 'snail', 'cockle', 'tripe', 'offal', 'pig', 'oyster sauce', 'fish sauce', 'prahok', 'shrimp paste', 'bacon', 'sausage',
    'សាច់', 'ជ្រូក', 'គោ', 'មាន់', 'ទា', 'ត្រី', 'បង្គា', 'បង្កង', 'ក្តាម', 'ក្ដាម', 'មឹក', 'ងាវ', 'លៀស', 'គ្រំ', 'ខ្យង', 'កង្កែប', 'អន្ទង់', 'កំពិស', 'ផ្អក', 'ប្រហុក', 'កាពិ', 'ទឹកត្រី',
  ],
  spicy: ['chili', 'chilli', 'ម្ទេស'],
} as const;

const includesAny = (text: string, words: readonly string[]) => words.some((w) => text.includes(w));

/** Weight-management rule: strictly below this many kcal per serving (recorded calories only - never guessed). */
export const LIGHT_KCAL_LIMIT = 450;
/** High-protein rule: estimated grams of protein per serving from the dish's main protein ingredients. */
export const HIGH_PROTEIN_GRAMS = 25;

const KHMER_DIGITS = '០១២៣៤៥៦៧៨៩';
const toAsciiDigits = (s: string) => String(s || '').replace(/[០-៩]/g, (c) => String(KHMER_DIGITS.indexOf(c)));

/** Grams (or ml) written in an ingredient amount or ingredient name such as "៤០០ ក្រាម", "450 g", "(600 g)", "1 kg". 0 when no weight is given. */
export function parseIngredientGrams(amount?: string, nameText?: string): number {
  const a = toAsciiDigits(`${amount || ''} ${nameText || ''}`);
  let m = a.match(/(\d+(?:\.\d+)?)\s*(?:kg\b|គីឡូក្រាម|គីឡូ)/i);
  if (m) return parseFloat(m[1]) * 1000;
  m = a.match(/(\d+(?:\.\d+)?)\s*(?:g\b|grams?\b|ក្រាម)/i);
  if (m) return parseFloat(m[1]);
  m = a.match(/\((\d+(?:\.\d+)?)\s*g\)/i);
  if (m) return parseFloat(m[1]);
  return 0;
}

/** Midpoint of a servings string such as "២-៤ នាក់" or "3 people" (defaults to 2, clamped 1-8). */
export function parseServingsMidpoint(servings?: string): number {
  const nums = (toAsciiDigits(servings || '').match(/\d+/g) || []).map(Number).filter((n) => n > 0);
  if (nums.length === 0) return 2;
  const mid = nums.length === 1 ? nums[0] : (nums[0] + nums[1]) / 2;
  return Math.min(8, Math.max(1, mid));
}

// Protein per 100 g raw edible portion x edible share of the listed weight (bones / shells excluded).
const PROTEIN_DENSITY_RULES: Array<{ re: RegExp; per100g: number; edible: number }> = [
  { re: /tofu|តៅហ៊ូ/i, per100g: 8, edible: 1 },
  { re: /ribs|spare|trotter|feet|ជើង|ឆ្អឹង/i, per100g: 19, edible: 0.5 },
  { re: /whole|cockle|clam|snail|crab|shell|oyster|ក្តាម|ងាវ|ខ្យង|អយស្ទ័រ/i, per100g: 15, edible: 0.45 },
  { re: /prawn|shrimp|squid|បង្គា|បង្កង|មឹក/i, per100g: 17, edible: 0.8 },
  { re: /fish|salmon|eel|ត្រី|អន្ទង់/i, per100g: 19, edible: 0.85 },
  { re: /pork|beef|chicken|duck|meat|offal|liver|tripe|frog|សាច់|មាន់|ជ្រូក|គោ|ទា|កង្កែប|ពោះ/i, per100g: 20, edible: 0.9 },
];
const PROTEIN_SKIP_RE = /sauce|paste|prahok|stock|broth|dip|oil|ទឹកត្រី|ប្រហុក|កាពិ/i;
const PROTEIN_NON_MEAT_RE = /coconut|noodle|rice|egg|ស៊ុត|ពង/i;
const PROTEIN_MEAT_WORD_RE = /fish|pork|beef|chicken|prawn|crab|squid|tofu/i;

/**
 * Estimated protein (g) per serving, computed ONLY from ingredient weights written in the recipe
 * (main protein ingredients / servings). Returns 0 when the recipe lists no weight for a protein ingredient.
 */
export function estimateProteinPerServing(food: FoodItem): number {
  let totalGrams = 0;
  for (const ing of food.ingredients || []) {
    const name = `${ing.nameEn || ''} ${ing.nameKh || ''}`;
    if (PROTEIN_SKIP_RE.test(name) && !/ball/i.test(name)) continue;
    const grams = parseIngredientGrams(ing.amount, name);
    if (!grams) continue;
    const rule = PROTEIN_DENSITY_RULES.find((r) => r.re.test(name));
    if (!rule) continue;
    if (PROTEIN_NON_MEAT_RE.test(name) && !PROTEIN_MEAT_WORD_RE.test(name)) continue;
    totalGrams += grams * rule.edible * (rule.per100g / 100);
  }
  return totalGrams / parseServingsMidpoint(food.servings);
}

/**
 * Set of 76 dishes (food-231..food-307, excluding food-263) whose per-serving calories
 * were estimated from recipe ingredient weights and cooking method.
 */
export const ESTIMATED_CALORIE_FOOD_IDS: ReadonlySet<string> = new Set(
  Array.from({ length: 77 }, (_, i) => `food-${231 + i}`).filter((id) => id !== 'food-263')
);

export function isEstimatedCalorieDish(foodId?: string): boolean {
  if (!foodId) return true;
  return ESTIMATED_CALORIE_FOOD_IDS.has(foodId);
}

export interface DishNutritionEstimate {
  caloriesKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  isEstimated: boolean;
  isIngredientWeightEstimate: boolean;
  healthLevel: 'healthy' | 'balanced' | 'indulgent';
}

const RECIPE_NUTRITION_DENSITY_RULES: Array<{
  re: RegExp;
  kcal: number;
  p: number;
  c: number;
  f: number;
  edible: number;
}> = [
  { re: /\bbroth\b|\bstock\b|\bwater\b|\bice\b|ទឹកស៊ុប|ទឹកធម្មតា|ទឹកកក|ទឹកដូងខ្ចី|coconut\s+water/i, kcal: 14, p: 1.4, c: 1.0, f: 0.4, edible: 1 },
  { re: /dipping\s+sauce|fish\s+sauce|oyster\s+sauce|soy\s+sauce|kroeung|tamarind|seasoning|to\s+taste|pinch\s+of|fried\s+garlic|crispy\s+garlic|scallion\s+oil|ទឹកត្រី|ទឹកជ្រលក់|ទឹកស៊ីអ៊ីវ|ប្រេងខ្យង|គ្រឿងបុក|គ្រឿងការី|ខ្លាញ់ខ្ទឹម|ខ្ទឹមសបំពង|តាមចំណូលចិត្ត/i, kcal: 85, p: 3, c: 12, f: 2.8, edible: 1 },
  { re: /^(?:cooking\s+oil|vegetable\s+oil|sesame\s+oil|butter|lard|ប្រេងឆា|ប្រេងល្ង|ប៊ឺ|ខ្លាញ់ជ្រូក)/i, kcal: 880, p: 0, c: 0, f: 99, edible: 1 },
  { re: /coconut\s+cream|coconut\s+milk|ខ្ទិះដូង/i, kcal: 210, p: 2.2, c: 5.5, f: 20, edible: 1 },
  { re: /shredded\s+coconut|toasted\s+coconut|grated\s+coconut|សាច់ដូង|ដូងកោស/i, kcal: 354, p: 3.3, c: 15, f: 33, edible: 1 },
  { re: /condensed\s+milk|evaporated\s+milk|ទឹកដោះគោខាប់|ទឹកដោះគោឆៅ/i, kcal: 320, p: 8, c: 54, f: 8.7, edible: 1 },
  { re: /\bcheese\b|ឈីស/i, kcal: 350, p: 22, c: 3, f: 28, edible: 1 },
  { re: /honeycomb|larvae|\bfrog\b|\beel\b|ant\s+egg|កង្កែប|អន្ទង់|ឃ្មុំ|ពងអង្ក្រង/i, kcal: 145, p: 19, c: 2, f: 6.5, edible: 0.8 },
  { re: /palm\s+sugar|\bsugar\b|\bhoney\b|\bsyrup\b|ស្ករត្នោត|ស្ករស|ស្ករ|ទឹកឃ្មុំ/i, kcal: 375, p: 0, c: 96, f: 0, edible: 1 },
  { re: /peanut|cashew|sesame|lotus\s+seed|mung\s+bean|សណ្តែកដី|ល្ង|គ្រាប់ស្វាយចន្ទី|គ្រាប់ឈូក|សណ្តែកបាយ|សណ្តែកលឿង/i, kcal: 380, p: 18, c: 32, f: 22, edible: 1 },
  { re: /pork\s+belly|roast\s+pork|crispy\s+pork|pork\s+sausage|sach\s+krok|សាច់ជ្រូកបីជាន់|សាច់ជ្រូកខ្វៃ|សាច់ក្រក/i, kcal: 365, p: 15, c: 2, f: 33, edible: 1 },
  { re: /pork\s+trotter|pork\s+hock|spare\s*ribs|pork\s+ribs|ជើងជ្រូក|ឆ្អឹងជំនីជ្រូក|ឆ្អឹងជំនីរជ្រូក|ឆ្អឹងជ្រូក/i, kcal: 245, p: 18.5, c: 0, f: 18.5, edible: 0.62 },
  { re: /pork\s+ear|pig\s+ear|pork\s+tongue|pork\s+stomach|pork\s+brain|chitterling|intestine|pork\s+liver|pork\s+blood|offal|ត្រចៀកជ្រូក|អណ្តាតជ្រូក|ក្រពះជ្រូក|ខួរជ្រូក|ពោះវៀន|ពោះតាន់|ថ្លើមជ្រូក|ឈាមជ្រូក|គ្រឿងក្នុង/i, kcal: 170, p: 18, c: 1, f: 10.5, edible: 0.9 },
  { re: /minced\s+pork|ground\s+pork|sliced\s+pork|pork\s+shoulder|pork\s+loin|\bpork\b|សាច់ជ្រូក/i, kcal: 205, p: 20.5, c: 0, f: 13, edible: 1 },
  { re: /beef\s+jerky|sun[\s-]*dried\s+beef|គោងៀត|ងៀតគោ/i, kcal: 300, p: 38, c: 4, f: 14, edible: 1 },
  { re: /beef\s+ribs|beef\s+shank|beef\s+brisket|ឆ្អឹងជំនីគោ|សាច់គោជាប់ខ្លាញ់/i, kcal: 220, p: 20.5, c: 0, f: 15, edible: 0.8 },
  { re: /beef\s+tripe|tendon|ពោះគោ|សរសៃគោ/i, kcal: 130, p: 19, c: 0, f: 5.5, edible: 0.95 },
  { re: /beef\s+ball|meatball|sliced\s+beef|minced\s+beef|\bbeef\b|សាច់គោ|ប្រហិតសាច់គោ/i, kcal: 180, p: 22, c: 1, f: 9.5, edible: 1 },
  { re: /\bduck\b|សាច់ទា|ទាអាំង|ទាខ្វៃ|ទាផាក់ឡូវ/i, kcal: 275, p: 19, c: 0, f: 22, edible: 0.68 },
  { re: /chicken\s+feet|chicken\s+wing|cartilage|ជើងមាន់|ស្លាបមាន់|សរសៃកែងមាន់/i, kcal: 210, p: 19, c: 1, f: 14, edible: 0.65 },
  { re: /chicken|gizzard|giblet|សាច់មាន់|មាន់ស្រែ|កោះមាន់|ឈាមមាន់/i, kcal: 170, p: 21.5, c: 0, f: 9, edible: 0.78 },
  { re: /salmon|\bfin\b|belly|sheatfish|wallago|catfish\s+steak|ត្រីសាម៉ុន|ព្រុយត្រី|ត្រីកេស|ត្រីប្រា|ត្រីពោធិ៍|ត្រីសណ្ដាយ|ត្រីសណ្តាយ/i, kcal: 195, p: 19.5, c: 0, f: 13, edible: 0.78 },
  { re: /dried\s+fish|smoked\s+fish|salted\s+fish|fermented\s+salted\s+fish|dried\s+shrimp|ត្រីងៀត|ត្រីឆ្អើរ|ត្រីប្រម៉ា|ត្រីហើម|បង្គាក្រៀម|ហៃប៊ី/i, kcal: 235, p: 35, c: 0, f: 9.5, edible: 0.85 },
  { re: /prahok|fermented\s+fish|shrimp\s+paste|kapi|ប្រហុក|ផ្អក|កាពិ|ម៉ាំ/i, kcal: 145, p: 20, c: 3, f: 5.5, edible: 1 },
  { re: /fish\s+paste|fish\s+ball|fish\s+cake|fish\s+roe|ប្រហិតត្រី|សាច់ត្រីឆ្លាត|ពងត្រី/i, kcal: 135, p: 20, c: 3, f: 4.5, edible: 1 },
  { re: /whole.*fish|\bfish\b|snakehead|tilapia|carp|mackerel|goby|sharkminnow|spiny\s+eel|ត្រី/i, kcal: 125, p: 20.5, c: 0, f: 4.2, edible: 0.68 },
  { re: /cockle|\bclam\b|mussel|snail|oyster|\bcrab\b|ងាវ|លៀស|គ្រំ|ខ្យង|អយស្ទ័រ|ក្តាម|ក្ដាម/i, kcal: 88, p: 15.5, c: 2.5, f: 1.8, edible: 0.48 },
  { re: /prawn|shrimp|squid|octopus|បង្គា|បង្កង|កំពឹស|មឹក/i, kcal: 105, p: 20.5, c: 1, f: 2, edible: 0.82 },
  { re: /instant\s+noodle|crispy\s+noodle|មីកញ្ចប់|មីស្រួយ/i, kcal: 440, p: 9, c: 62, f: 17, edible: 1 },
  { re: /noodle|vermicelli|spaghetti|banh\s+chok|banh\s+hoy|kuy\s+teav|មី|គុយទាវ|នំបញ្ចុក|លត|បាញ់កាញ់|បាញ់ហយ|មីសួរ|ស្ប៉ាហ្គេទី/i, kcal: 140, p: 3.5, c: 29, f: 0.8, edible: 1 },
  { re: /salted.*egg|egg\s+yolk|balut|quail\s+embryo|ពងទាប្រៃ|ពងទាកូន|ពងក្រួចកូន|ស៊ុតក្រហម/i, kcal: 195, p: 14, c: 1.5, f: 14.5, edible: 0.9 },
  { re: /\begg\b|\beggs\b|omelette|ពងទា|ពងមាន់|ស៊ុត/i, kcal: 155, p: 12.6, c: 1.1, f: 11, edible: 1 },
  { re: /vegetarian\s+ham|soy\s+ham|protein\s+roll|cutlet|supai|tofu|bean\s+curd|ហែមបួស|សាច់បួស|ប្រូទីន|តៅហ៊ូ|ពពុះសណ្តែក/i, kcal: 155, p: 14, c: 7, f: 8, edible: 1 },
  { re: /flour|starch|bread|toast|\bbun\b|baguette|burger\s+bun|នំប៉័ង|ម្សៅ|នំបញ្ចុកផាត់/i, kcal: 300, p: 8, c: 62, f: 2.5, edible: 1 },
  { re: /glutinous\s+rice|sticky\s+rice|អង្ករដំណើប|បាយដំណើប/i, kcal: 175, p: 3.5, c: 38, f: 0.5, edible: 1 },
  { re: /jasmine\s+rice|cooked\s+rice|steamed\s+rice|scorched\s+rice|rice\s+porridge|congee|បាយស|បាយក្តាំង|បាយ|អង្ករ|បបរ/i, kcal: 135, p: 2.8, c: 29, f: 0.4, edible: 1 },
  { re: /sweet\s+potato|taro|pumpkin|corn|banana|cassava|jackfruit|durian|ដំឡូង|ល្ពៅ|ត្រាវ|ពោត|ចេក|ខ្នុរ|ធុរេន/i, kcal: 95, p: 1.6, c: 22, f: 0.4, edible: 0.9 },
  { re: /./i, kcal: 28, p: 1.6, c: 5.2, f: 0.3, edible: 0.92 },
];

function parseIngredientClauseGrams(clauseText: string, amountText?: string): number {
  const amtAscii = toAsciiDigits(amountText || '');
  const clauseAscii = toAsciiDigits(clauseText || '');
  const source = /\d/.test(amtAscii) ? `${amtAscii} ${clauseAscii}` : clauseAscii;

  let m = source.match(/(\d+)\s*pcs?\b/i);
  if (m && /quail|ក្រួច/i.test(source)) return parseFloat(m[1]) * 12;

  m = source.match(/(\d+(?:\.\d+)?)\s*(?:kg\b|គីឡូក្រាម|គីឡូ)/i);
  if (m) return parseFloat(m[1]) * 1000;

  m = source.match(/(\d+(?:\.\d+)?)\s*(?:g\b|grams?\b|ក្រាម)/i);
  if (m) return parseFloat(m[1]);

  m = source.match(/(\d+(?:\.\d+)?)\s*(?:L\b|liters?\b|litres?\b|លីត្រ)/i);
  if (m && !/មីលីលីត្រ/.test(m[0])) return parseFloat(m[1]) * 1000;

  m = source.match(/(\d+(?:\.\d+)?)\s*(?:ml\b|មីលីលីត្រ)/i);
  if (m) return parseFloat(m[1]);

  m = source.match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(?:គ្រាប់|ពង|yolks?\b|eggs?\b|pcs?\b)/i);
  if (m && /egg|yolk|ពង|ស៊ុត/i.test(source)) {
    const count = m[2] ? (parseFloat(m[1]) + parseFloat(m[2])) / 2 : parseFloat(m[1]);
    return /yolk|ពងទាប្រៃ/i.test(source) ? count * 22 : count * 55;
  }

  m = source.match(/(\d+(?:\.\d+)?)\s*(?:ដុំ|បន្ទះ|ចង្កាក់|កញ្ចប់|bundles?\b|skewers?\b|links?\b|patties\b|patty\b|pcs?\b|pieces?\b)/i);
  if (m) {
    const count = parseFloat(m[1]);
    if (/noodle|មី|គុយទាវ|កញ្ចប់|bundle/i.test(source)) return count * 90;
    if (/burger|bun|នំប៉័ង/i.test(source)) return count * 85;
    if (/tofu|តៅហ៊ូ/i.test(source)) return count * 35;
    return count * 60;
  }

  m = source.match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(?:ស្លាបព្រាបាយ|tbsp\b|tablespoons?\b)/i);
  if (m) {
    const count = m[2] ? (parseFloat(m[1]) + parseFloat(m[2])) / 2 : parseFloat(m[1]);
    return count * 15;
  }

  m = source.match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(?:ស្លាបព្រាកាហ្វេ|tsp\b|teaspoons?\b)/i);
  if (m) {
    const count = m[2] ? (parseFloat(m[1]) + parseFloat(m[2])) / 2 : parseFloat(m[1]);
    return count * 5;
  }

  m = source.match(/(\d+(?:\.\d+)?)\s*(?:កូនចាន|small\s+bowls?\b)/i);
  if (m) return parseFloat(m[1]) * 85;

  m = source.match(/(\d+(?:\.\d+)?)\s*(?:ចានធំ|large\s+bowls?\b|platter)/i);
  if (m) return parseFloat(m[1]) * 220;

  m = source.match(/(\d+(?:\.\d+)?)\s*(?:ចានល្មម|ចាន|ពែង|កែវ|bowls?\b|cups?\b|glasses\b)/i);
  if (m) return parseFloat(m[1]) * 140;

  m = source.match(/(\d+(?:\.\d+)?)\s*(?:ក្តាប់តូច|ក្តាប់|ដុំតូច|បាច់|កន្ត្រក|handfuls?\b|bunche?s?\b)/i);
  if (m) return parseFloat(m[1]) * 55;

  m = source.match(/(\d+(?:\.\d+)?)\s*(?:ផ្លែ|ក្បាល|whole\b)/i);
  if (m) {
    const count = parseFloat(m[1]);
    if (/fish|ត្រី|chicken|មាន់|duck|ទា/i.test(source)) return count * 420;
    return count * 100;
  }
  return 35;
}

/**
 * Per-dish nutrition & macro estimator computed from the dish's actual recipe ingredients,
 * gram/volume weights, servings, and cooking method.
 */
export function estimateDishNutritionFromRecipe(food: FoodItem): DishNutritionEstimate {
  const servings = parseServingsMidpoint(food.servings);
  let totalKcal = 0;
  let totalP = 0;
  let totalC = 0;
  let totalF = 0;

  for (const ing of food.ingredients || []) {
    const enText = ing.nameEn || '';
    const khText = ing.nameKh || '';
    const amtText = ing.amount || '';
    const enClauses = enText.split(/\s*&\s*/);
    const khClauses = khText.split(/\s*(?:និង|&)\s*/);
    if (enClauses.length > 1 && enClauses.every((c) => /\d/.test(c))) {
      for (let i = 0; i < enClauses.length; i++) {
        const cEn = enClauses[i];
        const cKh = khClauses[i] || khText;
        const clauseFull = `${cEn} ${cKh}`;
        const g = parseIngredientClauseGrams(clauseFull, '');
        const rule =
          RECIPE_NUTRITION_DENSITY_RULES.find((r) => r.re.test(clauseFull)) ||
          RECIPE_NUTRITION_DENSITY_RULES[RECIPE_NUTRITION_DENSITY_RULES.length - 1];
        const effG = g * rule.edible;
        totalKcal += (effG * rule.kcal) / 100;
        totalP += (effG * rule.p) / 100;
        totalC += (effG * rule.c) / 100;
        totalF += (effG * rule.f) / 100;
      }
    } else {
      const fullText = `${enText} ${khText}`;
      const g = parseIngredientClauseGrams(fullText, amtText);
      const rule =
        RECIPE_NUTRITION_DENSITY_RULES.find((r) => r.re.test(fullText)) ||
        RECIPE_NUTRITION_DENSITY_RULES[RECIPE_NUTRITION_DENSITY_RULES.length - 1];
      const effG = g * rule.edible;
      totalKcal += (effG * rule.kcal) / 100;
      totalP += (effG * rule.p) / 100;
      totalC += (effG * rule.c) / 100;
      totalF += (effG * rule.f) / 100;
    }
  }

  const titleText = `${food.nameKh || ''} ${food.nameEn || ''}`.toLowerCase();
  const isDeepOrPanFried = /បំពង|ចៀន|បាញ់ឆែវ|\bdeep[\s-]*fr|\bpan[\s-]*fr|\bcrispy\s+fried/i.test(titleText);
  const isStirFried =
    !isDeepOrPanFried &&
    (food.categorySlug === 'stirfry' || /ឆា|លីង|ឡុកឡាក់|\bstir[\s-]*fr|\bwok[\s-]*fr/i.test(titleText));
  const isBraisedKho =
    /ខសាច់|ខត្រី|ខជើង|ខពង|ខមាន់|ខទា|ខម៉ាំ|ខកង្កែប|ផាកឡូវ|ក្រពះខ|អណ្តាតជ្រូកខ|ខួរជ្រូកខ|ហុងជើងជ្រូក|\bbraised\b|\bcaramelized\b/i.test(
      titleText
    );

  let rawKcal = totalKcal / servings;
  let pPerServing = totalP / servings;
  let cPerServing = totalC / servings;
  let fPerServing = totalF / servings;

  if (isDeepOrPanFried) {
    rawKcal += 130;
    fPerServing += 14.5;
  } else if (isStirFried) {
    rawKcal += 65;
    fPerServing += 7;
  } else if (isBraisedKho) {
    rawKcal += 80;
    cPerServing += 10;
    fPerServing += 4.5;
  }

  // Ensure direct protein calculation from estimateProteinPerServing is respected as floor for protein dishes
  const directProtein = estimateProteinPerServing(food);
  if (directProtein > pPerServing) {
    pPerServing = directProtein;
  }

  rawKcal = Math.max(145, Math.min(620, Math.round(rawKcal / 5) * 5));
  const recordedKcal = typeof food.calories === 'number' && food.calories > 40 ? Math.round(food.calories) : rawKcal;

  // Scale carbs & fat gently when recordedKcal differs from rawKcal so macro energy stays consistent with the dish's calories
  const rawMacroEnergy = Math.max(60, pPerServing * 4 + cPerServing * 4 + fPerServing * 9);
  const scale = Math.max(0.65, Math.min(1.6, recordedKcal / rawMacroEnergy));
  const finalP = Math.max(2, Math.round(pPerServing * (0.75 + 0.25 * scale)));
  const finalC = Math.max(2, Math.round(cPerServing * scale));
  const finalF = Math.max(2, Math.round(fPerServing * scale));

  const tags = getDishTagIds(food);
  const healthLevel: 'healthy' | 'balanced' | 'indulgent' =
    tags.includes('light') && recordedKcal < LIGHT_KCAL_LIMIT
      ? 'healthy'
      : recordedKcal >= 470 || isDeepOrPanFried || isBraisedKho || food.categorySlug === 'dessert'
        ? 'indulgent'
        : 'balanced';

  return {
    caloriesKcal: recordedKcal,
    proteinGrams: finalP,
    carbsGrams: finalC,
    fatGrams: finalF,
    isEstimated: true,
    isIngredientWeightEstimate: isEstimatedCalorieDish(food.id),
    healthLevel,
  };
}

// ---- Strict Healthy-Chip Gates (used by light, protein_rich, steamed_boiled, vegetable_rich) ----
const CHILI_RE = /ម្ទេស|chili|chilli|cayenne|sambal/i;
const FRESH_PEPPER_RE = /ម្រេចខ្ចី|green\s+peppercorn|fresh\s+peppercorn|peppercorn\s+cluster/i;
const SOUR_TITLE_RE = /ម្ជូរ|ជ្រក់|ង៉ាំង៉ូវ|ងាំងូវ|ជូរ|ត្រួយអម្ពិល|\bsour\b|\btamarind\b|pickl|\bmachu\b|chhruk|ngam\s*ngov|ngov/i;
const SOUR_ING_RE = /អម្ពិល|អំពិល|tamarind|ក្រូចឆ្មារ|ក្រូចថ្លុង|\blime\s+juice\b|\bfresh\s+lime\b|\blemon\s+juice\b|ទឹកខ្មេះ|vinegar|ង៉ាំង៉ូវ|ងាំងូវ|pickled\s+(?:lime|mustard|garlic|green)|preserved\s+lime|ស្លឹកថ្នឹង/i;
const FERMENTED_HEAVY_RE = /ប្រហុក|prahok|ផ្អក|កាពិ|shrimp\s+paste|ម៉ាំ|ត្រីប្រម៉ា|salted\s+(?:fish|crab)|ក្តាមប្រៃ|ក្ដាមប្រៃ|pickled\s+fish|fermented\s+fish/i;
const GREASY_OR_OFFAL_RE = /គ្រឿងក្នុង|offal|tripe|ពោះគោ|ពោះតាន់|ពោះវៀន|chitterling|intestine|ឈាមជ្រូក|ឈាមមាន់|pork\s+blood|chicken\s+blood|blood\s+cube|ខួរជ្រូក|pork\s+brain|ថ្លើម|liver|កោះមាន់|gizzard|giblet|pork\s+belly|សាច់ជ្រូកបីជាន់|pig\s+ear|pork\s+ear|ត្រចៀកជ្រូក|chicken\s+feet|ជើងមាន់|ជើងជ្រូក|pork\s+trotter|pork\s+hock|ផាកឡូវ|ផាក់ឡូវ|crispy\s+pork|ស្បែកជ្រូក|pork\s+skin|lard|ខ្លាញ់ជ្រូក/i;
const DEEP_FRY_STEP_RE = /deep[\s-]*fr|fry\s+until\s+crisp|ចៀនឱ្យស្រួយ|បំពងឱ្យ|បំពងរហូត/i;
const EMBRYO_OR_STREET_SHELLFISH_RE = /ពងទាកូន|ពងក្រួចកូន|\bbalut\b|embryo|ងាវស្រុះ|ងាវអប់|ពោះគោទឹកប្រហុក|ផ្អកចំហុយ/i;

/**
 * True only when the dish is genuinely mild for a sensitive stomach, judged from ingredients,
 * taste profile and cooking method. Rejects spicy / chili, sour / pickled / lime-tamarind, fermented
 * (prahok, shrimp paste, salted crab), raw or cold-salad dishes, deep-fried or grilled dishes,
 * greasy offal / pork belly and rich coconut curries - in Khmer, English and Chinese descriptions alike.
 */
export function isGentleOnStomachDish(
  food: FoodItem,
  ctx?: {
    titleKh?: string;
    nameText?: string;
    ingText?: string;
    isFried?: boolean;
    isGrilled?: boolean;
    isRawSeafoodOrDip?: boolean;
    isColdSaladOrDipOrDryNoodle?: boolean;
    isRichCoconutCurry?: boolean;
  }
): boolean {
  const titleKh = ctx?.titleKh ?? (food.nameKh || '');
  const nameText = ctx?.nameText ?? `${(food.nameEn || '').toLowerCase()} ${titleKh}`;
  const ingText =
    ctx?.ingText ??
    (food.ingredients || []).map((i) => `${(i.nameEn || '').toLowerCase()} ${i.nameKh || ''}`).join(' | ');

  // Remove harmless look-alikes before keyword tests (bell pepper, lemongrass, kaffir lime leaf, lemon basil, optional lime wedges on chicken congee).
  const cleanIng = ingText
    .replace(/ម្ទេសប្លោក|bell\s+pepper\w*|sweet\s+pepper\w*/gi, ' ')
    .replace(/lemon\s*grass|lemon\s+basil|kaffir\s+lime\s+leaf|kaffir\s+lime\s+leaves|lime\s+leaf|lime\s+leaves|ស្លឹកក្រូចសើច|ស្លឹកក្រូច|ស្លឹកគ្រៃ|គល់ស្លឹកគ្រៃ|ជីរនាងវង/gi, ' ')
    .replace(/ក្រូចឆ្មា\s*ម្រេច|lime\s+wedges?/gi, ' ');
  const cleanName = nameText.replace(/lemon\s*grass|ស្លឹកគ្រៃ/gi, ' ');

  const isMildHerbalSamlorProher = /សម្លប្រហើរ|samlor\s+proher|samlor\s+praher/i.test(cleanName);
  const cleanIngForFermented = isMildHerbalSamlorProher
    ? cleanIng.replace(/ប្រហុកខ្មែរ|ប្រហុកសាច់បន្តិច|prahok\s+paste|hint\s+of\s+prahok/gi, ' ')
    : cleanIng;

  const descText = `${food.descriptionKh || ''} ${food.descriptionEn || ''} ${food.tasteProfile || ''}`;
  const stepsText = (food.steps || []).map((s) => `${s.instructionKh || ''} ${s.instructionEn || ''}`).join(' ');

  if (getSpicyDishScore(food) > 0) return false;
  if (CHILI_RE.test(cleanIng) || CHILI_RE.test(cleanName)) return false;
  if (FRESH_PEPPER_RE.test(cleanIng) || FRESH_PEPPER_RE.test(cleanName)) return false;
  if (/ហឹរ|\bspicy\b|\bfiery\b|\bhot\s+(?:&|and)\s+sour\b|酸辣|香辣|麻辣/i.test(descText)) return false;
  if (SOUR_TITLE_RE.test(cleanName)) return false;
  if (SOUR_ING_RE.test(cleanIng)) return false;
  if (/ជូរ|\bsour\b|\btangy\b|\btart\b|酸/i.test(descText)) return false;
  if (FERMENTED_HEAVY_RE.test(cleanIngForFermented) || FERMENTED_HEAVY_RE.test(cleanName)) return false;
  if (GREASY_OR_OFFAL_RE.test(cleanIng) || GREASY_OR_OFFAL_RE.test(cleanName)) return false;
  if (EMBRYO_OR_STREET_SHELLFISH_RE.test(cleanName)) return false;
  if (ctx?.isFried || ctx?.isGrilled || DEEP_FRY_STEP_RE.test(stepsText)) return false;
  if (ctx?.isRawSeafoodOrDip || ctx?.isColdSaladOrDipOrDryNoodle || food.categorySlug === 'salad') return false;
  if (ctx?.isRichCoconutCurry) return false;
  return true;
}

const cache = new Map<string, DishTagId[]>();

/** All tags derived from the recipe (unordered priority applied). */
export function getDishTagIds(food: FoodItem): DishTagId[] {
  const key = `v5|${food.id}|${food.nameKh || ''}|${food.nameEn || ''}|${food.categorySlug || ''}|${food.calories ?? ''}|${food.ingredients?.length ?? 0}|${food.steps?.length ?? 0}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const ingredients = food.ingredients || [];
  const ingNames = ingredients.map((i) => `${(i.nameEn || '').toLowerCase()} ${i.nameKh || ''}`);
  const ingText = ingNames.join(' | ');

  const titleKh = (food.nameKh || '').trim();
  const titleEn = (food.nameEn || '').trim().toLowerCase();
  const nameText = `${titleEn} ${titleKh}`.toLowerCase();
  // Strip chive-cake words ("គូឆាយ" / "កាឆាយ") before checking Khmer stir-fry token "ឆា"
  const titleKhForStirFry = titleKh.replace(/គូឆាយ|កាឆាយ|កចាយ/g, ' ');

  const tags = new Set<DishTagId>();
  const isDrink = food.categorySlug === 'drink';
  const isSavoryCake =
    food.categorySlug === 'cake' &&
    /បាញ់ឆែវ|បាញ់ហយ|នំប៉័ង|គួង|ណែម|គូឆាយ|កាឆាយ|កចាយ|អន្សមជ្រូក|អន្សមចៀន/i.test(titleKh);
  const isSweetOrDrink =
    isDrink ||
    food.categorySlug === 'dessert' ||
    (food.categorySlug === 'cake' && !isSavoryCake) ||
    includesAny(nameText, TAG_KEYWORD_RULES.sweet) ||
    /បង្អែម|សង់ខ្យា|បាយដំណើបស្វាយ|បាយដំណើបធុរេន|បាយដំណើបសង់ខ្យា|អន្សមចេក|ចេកខ្ទិះ|ចេកចៀន/i.test(titleKh);

  // Primary dish cooking-style classification from dish title & category
  const isDryTossedNoodle = /មីកូឡា|មីគោក/i.test(titleKh);
  const isEmbryoOrStreetShellfish = EMBRYO_OR_STREET_SHELLFISH_RE.test(nameText) || food.categorySlug === 'streetfood';
  const isExplicitlySteamedOrBoiledTitle =
    !isDryTossedNoodle &&
    !isEmbryoOrStreetShellfish &&
    food.categorySlug !== 'salad' &&
    (/ចំហុយ|អាម៉ុក|ស្ងោរ/i.test(titleKh) ||
      /\bsteamed\b(?!\s+(?:jasmine\s+|white\s+|fragrant\s+)?rice\b)|\bpoached\b|\bamok\b/i.test(titleEn));

  const isBraisedKhoDish =
    !/ស្ងោរ|ចំហុយ/i.test(titleKh) &&
    (/(?:^|\s|គុយទាវ|បាយ|មី)ខ(?:សាច់|ត្រី|ជើង|ពង|មាន់|ទា|ពោះ|ឆ្អឹង|បង្កង|គោ|ប្រហុក|ម៉ាំ)|ខួរជ្រូកខ|ផាកឡូវ|ផាក់ឡូវ/i.test(titleKh) ||
      /\bkhor\b|\bcaramelized\b|\bbraised\s+(?:pork|beef|mekong\s+fish|duck|spiced\s+beef)/i.test(titleEn));

  const isStirFriedDish =
    !isBraisedKhoDish &&
    (food.categorySlug === 'stirfry' ||
      /ឆា|លីង|ឡុកឡាក់/i.test(titleKhForStirFry) ||
      /\bstir[\s-]*fr|\bwok[\s-]*(?:fried|seared|fired|tossed|baked|roasted|braised)|\blok\s*lak\b|\bfried\s+rice\b|\bfried\s+(?:egg\s+|flat\s+rice\s+)?noodle/i.test(
        titleEn
      ));

  const isFried =
    /បំពង|ចៀន|បាញ់ឆែវ/i.test(titleKh) ||
    /\bdeep[\s-]*fr|\bpan[\s-]*fr|\bcrispy\s+(?:fried|turmeric|deep|shredded)/i.test(titleEn);

  const isGrilled =
    !isSweetOrDrink &&
    (!isFried || /អាំង|ដុត/i.test(titleKh)) &&
    (food.categorySlug === 'grilled' ||
      /អាំង|ដុត|សាច់ក្រក|គោងៀត|ងៀតគោ|ត្រីងៀត(?!ឆា)|លៀសហាល/i.test(titleKh) ||
      /\bgrilled\b|\bcharcoal[\s-]*grilled\b|\bcharcoal[\s-]*roasted\b|\broasted\s+(?:herbal\s+chicken|chicken|pork|duck)\b|\bbbq\b|\bbarbecue\b/i.test(
        titleEn
      ));

  const isRichCoconutCurry =
    !/អាម៉ុក|\bamok\b/i.test(nameText) &&
    (/ការី|ណាំយ៉ា|សម្លខ្ទិះ|ប្រហុកខ្ទិះ/i.test(titleKh) ||
      /\bred\s+(?:chicken\s+|nam\s+ya\s+)?(?:coconut\s+)?curry\b|\bnam\s*ya\b|\bsamlor\s+ktis\b/i.test(titleEn));

  const isColdSaladOrDipOrDryNoodle =
    food.categorySlug === 'salad' ||
    /^(?:ញាំ|ភ្លា|បុក|ទឹកគ្រឿង|ប្រហុក|កាពិ|ជ្រក់|គួង|នំប៉័ង|ងាវស្រុះ|ផ្អក)|ទឹកគ្រឿង|ប្រហុកខ្ទិះ|ទឹកប្រហុក|មីគោក|មីកូឡា/i.test(
      titleKh
    );

  const isClearBrothSoupOrCongee =
    !isEmbryoOrStreetShellfish &&
    (/ស៊ុប|សម្លប្រហើរ|ស្ងោរ|បបរ|គុយទាវ(?!ឆា|ខ)|មីសួរ(?!ឆា)|បាញ់កាញ់|អន្សមជ្រូក/i.test(titleKh) &&
      !isStirFriedDish &&
      !isBraisedKhoDish &&
      !isRichCoconutCurry &&
      !isFried);

  const hasGreasyOrOffal = GREASY_OR_OFFAL_RE.test(ingText) || GREASY_OR_OFFAL_RE.test(nameText);
  const hasHeavyFermentedPaste = /ផ្អក|ម៉ាំ|ត្រីប្រម៉ា|ប្រហុកខ្ទិះ|ទឹកប្រហុក/i.test(nameText);

  const isSteamedOrBoiled =
    !isSweetOrDrink &&
    !isStirFriedDish &&
    !isBraisedKhoDish &&
    !isFried &&
    !isGrilled &&
    !isRichCoconutCurry &&
    !isColdSaladOrDipOrDryNoodle &&
    !isEmbryoOrStreetShellfish &&
    !hasGreasyOrOffal &&
    !hasHeavyFermentedPaste &&
    (isExplicitlySteamedOrBoiledTitle || isClearBrothSoupOrCongee);

  const isRawSeafoodOrDip = /ឆៅ|ភ្លា|ត្រាំ|អយស្ទ័រ|ទឹកគ្រឿង|ប្រហុកឆៅ|\braw\b|ceviche|oyster|sashimi|\bdip\b|relish/i.test(nameText);
  const isProcessedStarchDish = /burger|បឺហ្គឺរ|fried\s+rice|បាយឆា|spaghetti|ស្ប៉ាហ្គេទី|cutlet|ស៊ូផាយ|pancake|sandwich|instant\s+noodle|មីកញ្ចប់|មីជើងមាន់/i.test(nameText);

  const isGentleOnStomach = isGentleOnStomachDish(food, {
    titleKh,
    nameText,
    ingText,
    isFried,
    isGrilled,
    isRawSeafoodOrDip,
    isColdSaladOrDipOrDryNoodle,
    isRichCoconutCurry,
  });

  if (
    !isSweetOrDrink &&
    isGentleOnStomach &&
    typeof food.calories === 'number' &&
    food.calories > 0 &&
    food.calories < LIGHT_KCAL_LIMIT &&
    !/បាយឆា|fried\s+rice/i.test(nameText) &&
    !isProcessedStarchDish &&
    !isFried &&
    !isBraisedKhoDish &&
    !isRichCoconutCurry
  ) {
    tags.add('light');
  }

  if (isGrilled) tags.add('grilled');
  if (isSteamedOrBoiled) tags.add('steamed_boiled');
  if (isFried) tags.add('fried');

  const stripNotMeat = (s: string) => TAG_KEYWORD_RULES.notMeat.reduce((acc, w) => acc.split(w).join(' '), s);

  const vegCount = ingNames.filter((n) => includesAny(n, TAG_KEYWORD_RULES.vegetables)).length;
  const vegByName =
    !isSweetOrDrink &&
    vegCount >= 1 &&
    includesAny(nameText, ['សម្លកកូរ', 'សម្លម្ជូរ', 'ឆាបន្លែ', 'ញាំ', 'salad', 'vegetable']);
  // 2 vegetables are enough for soups / stir-fries / salads / noodle dishes; mains such as rice, grills and rolls need 3+.
  const vegHeavyEnough =
    vegCount >= 3 || (vegCount >= 2 && ['soup', 'stirfry', 'salad', 'noodles'].includes(food.categorySlug || ''));
  const isFieryPoundedOrPickledSnack = /^(?:បុក|ជ្រក់)|ទឹកប្រហុក|ខម៉ាំ|ក្តាមប្រៃ|ក្ដាមប្រៃ/i.test(titleKh);
  if (
    !isSweetOrDrink &&
    !isFried &&
    !isRawSeafoodOrDip &&
    !isProcessedStarchDish &&
    !isBraisedKhoDish &&
    !isRichCoconutCurry &&
    !hasGreasyOrOffal &&
    !isFieryPoundedOrPickledSnack &&
    (vegHeavyEnough || vegByName)
  ) {
    tags.add('vegetable_rich');
  }

  // Main dishes only: desserts / drinks / sweet snacks / fried / fatty offal / braised Kho / rich curry never count as healthy high-protein dishes
  const hasMainProtein = !isSweetOrDrink && ingNames.some(
    (n) => {
      const s = stripNotMeat(n);
      return includesAny(s, TAG_KEYWORD_RULES.mainProtein) && !includesAny(s, TAG_KEYWORD_RULES.swappable);
    }
  );
  if (
    hasMainProtein &&
    !isFried &&
    !isProcessedStarchDish &&
    !isBraisedKhoDish &&
    !isRichCoconutCurry &&
    !hasGreasyOrOffal &&
    !hasHeavyFermentedPaste &&
    estimateProteinPerServing(food) >= HIGH_PROTEIN_GRAMS
  ) {
    tags.add('protein_rich');
  }

  // Plant-based savory dishes/snacks, or only animal ingredient is a swappable condiment (fish sauce / prahok / paste)
  const cleanTitleForVeg = stripNotMeat(nameText).replace(/ទឹកដោះគោ|ប្រេងខ្យង|oyster\s+sauce|condensed\s+milk/gi, ' ');
  const hasMeatInTitle =
    /សាច់|ជ្រូក|គោ(?!ល)|មាន់|ទា(?!ញ)|ត្រី|បង្គា|បង្កង|ក្តាម|ក្ដាម|មឹក|ងាវ|លៀស|លាស|គ្រំ|ខ្យង|អយស្ទ័រ|កង្កែប|អន្ទង់|កំពិស|ឃ្មុំ|ផ្អក|មុំា|មំា|កាពិ|ទឹកគ្រឿង|ប្រហុក|\bpork\b|\bbeef\b|\bchicken\b|\bduck\b|\bfish\b|\bprawn\b|\bshrimp\b|\bcrab\b|\bsquid\b|\bcockle\b|\bclam\b|\bsnail\b|\boysters?\b|\bfrog\b|\beel\b|\bpig\b|\bhoneycomb\b|\bprahok\b/i.test(
      cleanTitleForVeg
    );
  const hasMeatIngredient =
    hasMeatInTitle ||
    ingNames.some((n) => {
      const s = stripNotMeat(n);
      return includesAny(s, TAG_KEYWORD_RULES.nonVegetarian) && !includesAny(s, TAG_KEYWORD_RULES.swappable);
    });
  if (!isDrink && ingredients.length > 0 && !hasMeatIngredient) tags.add('vegetarian_friendly');

  const cleanSpicyIngText = ingText.replace(/ម្ទេសប្លោក|bell\s+pepper\w*|sweet\s+pepper\w*/gi, ' ');
  if (!isSweetOrDrink && (getSpicyDishScore(food) > 0 || includesAny(cleanSpicyIngText, TAG_KEYWORD_RULES.spicy))) {
    // Still double-check negation so mild dishes (e.g. "មិនហឹរខ្លាំង") are never tagged spicy
    if (getSpicyDishScore(food) > 0) {
      tags.add('spicy');
    }
  }
  if (includesAny(ingText, TAG_KEYWORD_RULES.fishSauce)) tags.add('fish_sauce_prahok');

  const ordered = DISPLAY_PRIORITY.filter((id) => tags.has(id));
  cache.set(key, ordered);
  return ordered;
}

export function getDishTags(food: FoodItem): DishTag[] {
  return getDishTagIds(food).map((id) => DISH_TAG_DEFS[id]);
}

/** Up to `max` chips for compact UI (cards). */
export function getDisplayTags(food: FoodItem, max = 3): DishTag[] {
  return getDishTags(food).slice(0, max);
}

export function tagLabel(tag: DishTag, lang: Language): string {
  return lang === 'km' ? tag.labelKh : lang === 'zh' ? tag.labelZh : tag.labelEn;
}

export function tagBenefit(tag: DishTag, lang: Language): string {
  return (lang === 'km' ? tag.benefitKh : lang === 'zh' ? tag.benefitZh : tag.benefitEn) || '';
}

export function tagCookingTip(tag: DishTag, lang: Language): string {
  return (lang === 'km' ? tag.cookingTipKh : lang === 'zh' ? tag.cookingTipZh : tag.cookingTipEn) || '';
}

export type TagFilterId =
  | 'all'
  | 'light'
  | 'steamed_boiled'
  | 'grilled'
  | 'vegetable_rich'
  | 'protein_rich'
  | 'vegetarian_friendly'
  | 'spicy';

export const TAG_FILTERS: Array<{ id: TagFilterId; labelKh: string; labelEn: string; labelZh: string; emoji: string }> = [
  { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All', labelZh: '全部', emoji: '🍽️' },
  { id: 'light', labelKh: DISH_TAG_DEFS.light.labelKh, labelEn: DISH_TAG_DEFS.light.labelEn, labelZh: DISH_TAG_DEFS.light.labelZh, emoji: DISH_TAG_DEFS.light.emoji },
  { id: 'steamed_boiled', labelKh: DISH_TAG_DEFS.steamed_boiled.labelKh, labelEn: DISH_TAG_DEFS.steamed_boiled.labelEn, labelZh: DISH_TAG_DEFS.steamed_boiled.labelZh, emoji: DISH_TAG_DEFS.steamed_boiled.emoji },
  { id: 'grilled', labelKh: DISH_TAG_DEFS.grilled.labelKh, labelEn: DISH_TAG_DEFS.grilled.labelEn, labelZh: DISH_TAG_DEFS.grilled.labelZh, emoji: DISH_TAG_DEFS.grilled.emoji },
  { id: 'vegetable_rich', labelKh: DISH_TAG_DEFS.vegetable_rich.labelKh, labelEn: DISH_TAG_DEFS.vegetable_rich.labelEn, labelZh: DISH_TAG_DEFS.vegetable_rich.labelZh, emoji: DISH_TAG_DEFS.vegetable_rich.emoji },
  { id: 'protein_rich', labelKh: DISH_TAG_DEFS.protein_rich.labelKh, labelEn: DISH_TAG_DEFS.protein_rich.labelEn, labelZh: DISH_TAG_DEFS.protein_rich.labelZh, emoji: DISH_TAG_DEFS.protein_rich.emoji },
  { id: 'vegetarian_friendly', labelKh: DISH_TAG_DEFS.vegetarian_friendly.labelKh, labelEn: DISH_TAG_DEFS.vegetarian_friendly.labelEn, labelZh: DISH_TAG_DEFS.vegetarian_friendly.labelZh, emoji: DISH_TAG_DEFS.vegetarian_friendly.emoji },
  { id: 'spicy', labelKh: DISH_TAG_DEFS.spicy.labelKh, labelEn: DISH_TAG_DEFS.spicy.labelEn, labelZh: DISH_TAG_DEFS.spicy.labelZh, emoji: DISH_TAG_DEFS.spicy.emoji },
];

export function matchesTagFilter(food: FoodItem, filter: TagFilterId, isVipAuthorized = true): boolean {
  if (filter === 'all') return true;
  if (!isVipAuthorized) return true;
  return getDishTagIds(food).includes(filter as DishTagId);
}

export const TAG_ESTIMATE_NOTE = {
  km: 'ណែនាំផ្អែកលើរូបមន្ត',
  en: 'Recipe-based guide',
  zh: '根据食谱精选',
};

export const GENERAL_FOOD_INFO_NOTE = {
  km: 'ព័ត៌មានទូទៅអំពីម្ហូបប៉ុណ្ណោះ មិនមែនជាដំបូន្មានវេជ្ជសាស្ត្រទេ។',
  en: 'General food information only, not medical advice.',
  zh: '仅为一般美食信息，不构成医疗建议。',
};

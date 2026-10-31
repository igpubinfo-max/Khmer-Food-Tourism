import type { FoodItem, Language } from '../types';

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
  light: { id: 'light', labelKh: 'ស្រាល', labelEn: 'Light', labelZh: '清淡', emoji: '🌿', tone: 'green', benefitKh: "≤ 450 kcal • ល្អសម្រាប់អាហារស្រាលក្រពះ & រក្សាទម្ងន់", benefitEn: "≤ 450 kcal • great for light meals & balanced eating", benefitZh: "≤ 450 千卡 • 适合清淡餐食与均衡饮食", cookingTipKh: "គន្លឹះ៖ បន្ថយប្រេងឆា ទឹកត្រី ឬស្ករ ហើយបន្ថែមបន្លែស្រស់ឱ្យបានច្រើន", cookingTipEn: "Tip: use less oil, fish sauce or sugar, and add plenty of fresh vegetables.", cookingTipZh: "小贴士：少放油、鱼露或糖，多加新鲜蔬菜。" },
  steamed_boiled: { id: 'steamed_boiled', labelKh: 'ចំហុយ/ស្ងោរ', labelEn: 'Steamed/Boiled', labelZh: '蒸/煮', emoji: '♨️', tone: 'blue', benefitKh: "ចម្អិនដោយចំហុយ/ស្ងោរ • កាត់បន្ថយប្រេងឆា & ស្រួលរំលាយ", benefitEn: "Steamed or boiled • less frying oil & gentle to digest", benefitZh: "蒸或煮 • 少油，易于消化", cookingTipKh: "គន្លឹះ៖ ចំហុយ ឬស្ងោរជំនួសការចៀន ហើយបន្ថយអំបិល និងទឹកត្រីក្នុងទឹកស៊ុប", cookingTipEn: "Tip: steam or boil instead of frying, and go easy on salt and fish sauce in the broth.", cookingTipZh: "小贴士：以蒸、煮代替油炸，汤底少放盐和鱼露。" },
  grilled: { id: 'grilled', labelKh: 'អាំង/ដុត', labelEn: 'Grilled', labelZh: '烧烤', emoji: '🔥', tone: 'blue', benefitKh: "អាំង/ដុត ស្រក់ខ្លាញ់ចេញ • ឈ្ងុយឆ្ងាញ់មិនបាច់បំពង", benefitEn: "Grilled • fat drips away, tasty without deep-frying", benefitZh: "烧烤 • 油脂滴落，无需油炸也美味", cookingTipKh: "គន្លឹះ៖ អាំងលើភ្លើងស្រាល កុំឱ្យឆេះខ្មៅ ហើយកាត់ខ្លាញ់ចេញមុនអាំង", cookingTipEn: "Tip: grill over gentle heat, avoid charring, and trim visible fat first.", cookingTipZh: "小贴士：用温和火力烤制，避免烤焦，烤前去除肥肉。" },
  fried: { id: 'fried', labelKh: 'បំពង/ចៀន', labelEn: 'Fried', labelZh: '油炸', emoji: '🍳', tone: 'amber', infoOnly: true },
  vegetable_rich: { id: 'vegetable_rich', labelKh: 'សម្បូរបន្លែ', labelEn: 'Vegetable-rich', labelZh: '蔬菜丰富', emoji: '🥬', tone: 'green', benefitKh: "សម្បូរបន្លែធម្មជាតិ & ជាតិសរសៃជំនួយការរំលាយអាហារ", benefitEn: "Plenty of natural vegetables & dietary fiber", benefitZh: "富含天然蔬菜与膳食纤维", cookingTipKh: "គន្លឹះ៖ ដាក់បន្លែឱ្យបានច្រើនជាងសាច់ ហើយកុំចម្អិនយូរពេកដើម្បីរក្សាភាពស្រស់", cookingTipEn: "Tip: add more vegetables than meat and avoid overcooking to keep them fresh.", cookingTipZh: "小贴士：多放蔬菜、少放肉，避免煮得过久以保持新鲜。" },
  protein_rich: { id: 'protein_rich', labelKh: 'សម្បូរប្រូតេអ៊ីន', labelEn: 'Protein-rich', labelZh: '蛋白质丰富', emoji: '💪', tone: 'green', benefitKh: "សម្បូរសាច់ត្រី & ប្រូតេអ៊ីនផ្ដល់ថាមពល", benefitEn: "Rich in meat/fish & protein for energy", benefitZh: "富含肉鱼类与蛋白质，补充能量", cookingTipKh: "គន្លឹះ៖ ជ្រើសសាច់ស្គម ឬត្រី ចម្អិនដោយចំហុយ ស្ងោរ ឬអាំង ហើយញ៉ាំជាមួយបន្លែ", cookingTipEn: "Tip: choose lean meat or fish, steam, boil or grill it, and serve with vegetables.", cookingTipZh: "小贴士：选择瘦肉或鱼，以蒸、煮或烤的方式烹饪，并搭配蔬菜。" },
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
    'meat', 'clam', 'mussel', 'snail', 'oyster sauce', 'fish sauce', 'prahok', 'shrimp paste', 'bacon', 'sausage',
    'សាច់', 'ត្រី', 'បង្គា', 'ក្តាម', 'មឹក', 'កង្កែប', 'ប្រហុក', 'កាពិ', 'ទឹកត្រី',
  ],
  spicy: ['chili', 'chilli', 'ម្ទេស'],
} as const;

const includesAny = (text: string, words: readonly string[]) => words.some((w) => text.includes(w));

const cache = new Map<string, DishTagId[]>();

/** All tags derived from the recipe (unordered priority applied). */
export function getDishTagIds(food: FoodItem): DishTagId[] {
  const key = `${food.id}|${food.calories ?? ''}|${food.ingredients?.length ?? 0}|${food.steps?.length ?? 0}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const ingredients = food.ingredients || [];
  const ingNames = ingredients.map((i) => `${(i.nameEn || '').toLowerCase()} ${i.nameKh || ''}`);
  const ingText = ingNames.join(' | ');
  const stepsText = (food.steps || [])
    .map((s) => `${s.instructionEn || ''} ${s.instructionKh || ''}`)
    .join(' ')
    .toLowerCase();
  const nameText = `${food.nameEn || ''} ${food.nameKh || ''}`.toLowerCase();
  // Stir-fry is a quick pan method: do not count it as "deep fried"; also ignore roasted peanuts/rice/sesame in salads
  const methodText = `${nameText} ${stepsText}`
    .replace(/stir-?\s?fr(y|ied)/g, '')
    .replace(/អង្ករលីង|សណ្តែកដីលីង|សណ្ដែកដីលីង|ល្ងលីង|ដូងលីង|គ្រាប់ស្វាយចន្ទីលីង|ម្ទេសឆ្អើរ|ត្រីឆ្អើរ|roasted\s+peanut\w*|toasted\s+peanut\w*|roasted\s+rice|toasted\s+rice|roasted\s+sesame|toasted\s+sesame|toasted\s+coconut|roasted\s+cashew\w*|toasted\s+cashew\w*|roasted\s+chili\w*|dried\s+chili\w*/gi, ' ');

  const tags = new Set<DishTagId>();

  const isFried = includesAny(methodText, TAG_KEYWORD_RULES.fried);
  if (typeof food.calories === 'number' && food.calories > 0 && food.calories <= 450 && !isFried) tags.add('light');

  const isGrilled = food.categorySlug === 'grilled' || includesAny(methodText, TAG_KEYWORD_RULES.grilled);
  if (isGrilled) tags.add('grilled');
  if (includesAny(methodText, TAG_KEYWORD_RULES.steamedBoiled) || food.categorySlug === 'soup') tags.add('steamed_boiled');
  if (isFried) tags.add('fried');

  const stripNotMeat = (s: string) => TAG_KEYWORD_RULES.notMeat.reduce((acc, w) => acc.split(w).join(' '), s);
  const isSweet = food.categorySlug === 'dessert' || food.categorySlug === 'cake' || includesAny(nameText, TAG_KEYWORD_RULES.sweet);

  const vegCount = ingNames.filter((n) => includesAny(n, TAG_KEYWORD_RULES.vegetables)).length;
  const vegByName = !isSweet && (food.categorySlug === 'salad' || includesAny(nameText, TAG_KEYWORD_RULES.vegetableDishName));
  if (vegCount >= 2 || vegByName) tags.add('vegetable_rich');

  // Main dishes only: desserts / sweet snacks never count as protein dishes
  const hasMainProtein = !isSweet && ingNames.some(
    (n) => {
      const s = stripNotMeat(n);
      return includesAny(s, TAG_KEYWORD_RULES.mainProtein) && !includesAny(s, TAG_KEYWORD_RULES.swappable);
    }
  );
  if (hasMainProtein) tags.add('protein_rich');

  // Plant-based, or only animal ingredient is a swappable condiment (fish sauce / prahok / paste)
  const hasMeatIngredient = ingNames.some((n) => {
    const s = stripNotMeat(n);
    return includesAny(s, TAG_KEYWORD_RULES.nonVegetarian) && !includesAny(s, TAG_KEYWORD_RULES.swappable);
  });
  if (ingredients.length > 0 && !hasMeatIngredient) tags.add('vegetarian_friendly');

  if (includesAny(ingText, TAG_KEYWORD_RULES.spicy)) tags.add('spicy');
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

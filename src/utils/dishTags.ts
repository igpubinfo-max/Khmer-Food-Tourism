import type { FoodItem, Language } from '../types';

/**
 * Dish tags derived ONLY from existing recipe data (calories, ingredients, cooking steps, category).
 * Transparent keyword rules, no health claims. Labelled in the UI as "Estimated from the recipe".
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
}

export const DISH_TAG_DEFS: Record<DishTagId, DishTag> = {
  light: { id: 'light', labelKh: 'ស្រាល', labelEn: 'Light', labelZh: '清淡', emoji: '🪶', tone: 'green' },
  steamed_boiled: { id: 'steamed_boiled', labelKh: 'ចំហុយ/ស្ងោរ', labelEn: 'Steamed/Boiled', labelZh: '蒸/煮', emoji: '♨️', tone: 'blue' },
  grilled: { id: 'grilled', labelKh: 'អាំង/ដុត', labelEn: 'Grilled', labelZh: '烧烤', emoji: '🔥', tone: 'blue' },
  fried: { id: 'fried', labelKh: 'បំពង/ចៀន', labelEn: 'Fried', labelZh: '油炸', emoji: '🍳', tone: 'amber', infoOnly: true },
  vegetable_rich: { id: 'vegetable_rich', labelKh: 'សម្បូរបន្លែ', labelEn: 'Vegetable-rich', labelZh: '蔬菜丰富', emoji: '🥬', tone: 'green' },
  protein_rich: { id: 'protein_rich', labelKh: 'សម្បូរប្រូតេអ៊ីន', labelEn: 'Protein-rich', labelZh: '蛋白质丰富', emoji: '💪', tone: 'green' },
  vegetarian_friendly: { id: 'vegetarian_friendly', labelKh: 'សមស្របអ្នកញ៉ាំបួស', labelEn: 'Vegetarian-friendly', labelZh: '素食友好', emoji: '🌱', tone: 'green' },
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
  ],
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
  // Stir-fry is a quick pan method: do not count it as "deep fried"
  const methodText = `${nameText} ${stepsText}`.replace(/stir-?\s?fr(y|ied)/g, '');

  const tags = new Set<DishTagId>();

  if (typeof food.calories === 'number' && food.calories > 0 && food.calories <= 350) tags.add('light');

  const isGrilled = food.categorySlug === 'grilled' || includesAny(methodText, TAG_KEYWORD_RULES.grilled);
  if (isGrilled) tags.add('grilled');
  if (includesAny(methodText, TAG_KEYWORD_RULES.steamedBoiled) || food.categorySlug === 'soup') tags.add('steamed_boiled');
  if (includesAny(methodText, TAG_KEYWORD_RULES.fried)) tags.add('fried');

  const vegCount = ingNames.filter((n) => includesAny(n, TAG_KEYWORD_RULES.vegetables)).length;
  if (vegCount >= 3) tags.add('vegetable_rich');

  const hasMainProtein = ingNames.some(
    (n) => includesAny(n, TAG_KEYWORD_RULES.animalProtein) && !includesAny(n, TAG_KEYWORD_RULES.sauceLike)
  );
  if (hasMainProtein) tags.add('protein_rich');

  if (ingredients.length > 0 && !includesAny(ingText, TAG_KEYWORD_RULES.nonVegetarian) && food.categorySlug !== 'dessert') {
    tags.add('vegetarian_friendly');
  }

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

export function matchesTagFilter(food: FoodItem, filter: TagFilterId): boolean {
  if (filter === 'all') return true;
  return getDishTagIds(food).includes(filter as DishTagId);
}

export const TAG_ESTIMATE_NOTE = {
  km: 'ប៉ាន់ស្មានពីរូបមន្ត',
  en: 'Estimated from the recipe',
  zh: '根据食谱估算',
};

export const GENERAL_FOOD_INFO_NOTE = {
  km: 'ព័ត៌មានទូទៅអំពីម្ហូបប៉ុណ្ណោះ មិនមែនជាដំបូន្មានវេជ្ជសាស្ត្រទេ។',
  en: 'General food information only, not medical advice.',
  zh: '仅为一般美食信息，不构成医疗建议。',
};

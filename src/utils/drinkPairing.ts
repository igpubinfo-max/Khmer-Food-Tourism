import type { FoodItem, Language } from '../types';
import { tr } from './i18n';

/**
 * ម្ហូបអមភេសជ្ជៈ (Drink-Pairing Menu) — VIP special menu.
 *
 * Automatically detects which dishes are real Khmer "kleam" (drinking food) that people order
 * with beer or liquor: charcoal grills, crispy fried bites, spicy-sour salads (ញាំ / ភ្លា),
 * seafood, cured/dried meats and bold stir-fries. Rice plates, noodles, soups, porridge,
 * desserts, cakes and drinks are always excluded so the list stays 100% drinking food.
 * Works on any dish (including ones the Admin adds later) — no manual tagging required.
 */

export type DrinkKind = 'beer' | 'spirits';
export type DrinkKindFilter = 'all' | DrinkKind;

export type PairingFeatureId =
  | 'grilled'
  | 'crispy'
  | 'salad'
  | 'spicy'
  | 'sour'
  | 'seafood'
  | 'cured'
  | 'meaty';

export interface DrinkPairingInfo {
  score: number;
  kinds: DrinkKind[];
  /** Every feature detected (name or description). */
  features: PairingFeatureId[];
  /** Features found in the dish name itself (most reliable for explaining the pairing). */
  nameFeatures: PairingFeatureId[];
  /** Main style of the dish, taken from its category. */
  primary: PairingFeatureId | null;
}

interface FeatureRule {
  id: PairingFeatureId;
  re: RegExp;
  weight: number;
  /** When true the keyword only counts if it appears in the dish name (avoids fish-sauce noise). */
  nameOnly?: boolean;
}

const FEATURE_RULES: FeatureRule[] = [
  { id: 'grilled', re: /អាំង|ដុត|ឆ្អើរ|grill|bbq|barbecue|charcoal|roast|smok/i, weight: 30 },
  { id: 'crispy', re: /បំពង|ចៀន|ស្រួយ|crispy|crunch|deep[- ]?fr|fried/i, weight: 25 },
  { id: 'salad', re: /ញាំ|ភ្លា|បុកល្ហុង|បុកស្វាយ|salad|ceviche/i, weight: 28 },
  { id: 'spicy', re: /ម្ទេស|ហឹរ|ម្រេច|chili|chilli|spicy|pepper/i, weight: 14 },
  { id: 'sour', re: /ជូរ|ក្រូចឆ្មា|អំពិល|lime|sour|tamarind|tangy/i, weight: 10 },
  {
    id: 'seafood',
    re: /ក្តាម|ក្ដាម|បង្គា|មឹក|(?<!ប្រេង)ខ្យង|ងាវ|លៀស|ត្រី|crab|prawn|shrimp|squid|snail|clam|seafood|fish|eel/i,
    weight: 18,
    nameOnly: true,
  },
  { id: 'cured', re: /ក្រក|ងៀត|ក្រៀម|ឆ្អើរ|sausage|jerky|dried|smoked|cured|fermented/i, weight: 24 },
  {
    id: 'meaty',
    re: /សាច់គោ|សាច់ជ្រូក|ឆ្អឹងជំនី|មាន់|កង្កែប|ថ្លើម|beef|pork|rib|chicken|frog|liver/i,
    weight: 10,
    nameOnly: true,
  },
];

const BASE_BY_CATEGORY: Record<string, number> = {
  grilled: 50,
  salad: 42,
  streetfood: 38,
  stirfry: 22,
  specialty: 8,
};

/** Categories that are never drinking food. */
const EXCLUDED_CATEGORIES = new Set(['dessert', 'cake', 'drink', 'rice', 'noodles', 'soup']);

/**
 * Name-level exclusions: rice plates, porridge, sweets, soups, curries.
 * `(?<!្)នំ` skips the cluster inside words such as ភ្នំ (mountain) so only real cakes/sweets (នំ…) are excluded.
 */
const EXCLUDED_NAME_RE =
  /បបរ|បង្អែម|បាយ|គុយទាវ|(?<!្)នំ|ទឹកកក|កាហ្វេ|ស៊ុប|សម្ល|ការី|អាម៉ុក|ទឹកគ្រឿង|ប្រហុកខ្ទិះ|porridge|dessert|\brice\b|noodle|soup|curry|amok|cake|sticky|custard|pudding|teuk kroeung|prahok ktis|congee|breakfast/i;

/** Dips / sauces served as a side for rice meals (only matters for the salad & dip category). */
const DIP_NAME_RE = /\bdip\b|fish herb dip|ទឹកជ្រលក់បន្លែ/i;

/** Plain vegetable dishes are rice side dishes, not drinking food — unless they also contain meat/seafood. */
const VEGETABLE_NAME_RE =
  /okra|eggplant|vegetable|morning glory|broccoli|cauliflower|cabbage|water lily|mushroom|tofu|ត្រកួន|ត្រប់|ព្រលិត|ផ្សិត|បន្លែ|ខាត់ណា|ស្ពៃ|ពោតបារាំង/i;
const PROTEIN_NAME_RE =
  /beef|pork|chicken|prawn|shrimp|fish|squid|frog|crab|snail|clam|giblet|sausage|សាច់|ត្រី|បង្គា|ក្តាម|ក្ដាម|មឹក|មាន់|កង្កែប|ខ្យង|លៀស|គ្រឿងក្នុង/i;

/** Iconic Khmer drinking snacks that always qualify (balut, sausage, dried fish, snails, frog, jerky). */
const CLASSIC_KLEAM_RE =
  /ពងទាកូន|balut|ត្រីងៀត|dried fish|សាច់ក្រក|sausage|jerky|សាច់គោងៀត|គោងៀត|(?<!ប្រេង)ខ្យង|snail|កង្កែប|frog|ជើងមាន់|chicken feet|លៀស|clam/i;

/** Prahok served as a plain rice side (not a drinking snack). */
const PRAHOK_SIDE_RE = /ប្រហុក(?:កប់|អាំង)|prahok.*(?:wrapped|banana leaf|pit)/i;

/** Minimum score per category: stir-fries and snacks need a stronger signal to count as drinking food. */
const MIN_SCORE_BY_CATEGORY: Record<string, number> = { stirfry: 78, streetfood: 70 };

const cache = new Map<string, DrinkPairingInfo | null>();

function nameOf(food: FoodItem): string {
  return `${food.nameKh || ''} ${food.nameEn || ''}`;
}

function descOf(food: FoodItem): string {
  return `${food.descriptionKh || ''} ${food.descriptionEn || ''} ${food.categoryKh || ''} ${food.categoryEn || ''}`;
}

/** Returns pairing info when the dish is genuine drinking food, otherwise null. */
export function getDrinkPairing(food: FoodItem): DrinkPairingInfo | null {
  if (!food) return null;
  const key = `${food.id}|${food.nameKh}|${food.categorySlug}|${food.descriptionEn?.length ?? 0}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  const result = computePairing(food);
  if (cache.size > 2000) cache.clear();
  cache.set(key, result);
  return result;
}

function computePairing(food: FoodItem): DrinkPairingInfo | null {
  const slug = food.categorySlug as string;
  if (EXCLUDED_CATEGORIES.has(slug)) return null;
  const name = nameOf(food);
  if (EXCLUDED_NAME_RE.test(name)) return null;
  if (slug === 'salad' && (DIP_NAME_RE.test(name) || PRAHOK_SIDE_RE.test(name))) return null;
  if (VEGETABLE_NAME_RE.test(name) && !PROTEIN_NAME_RE.test(name)) return null;

  const desc = descOf(food);
  let score = BASE_BY_CATEGORY[slug] ?? 0;
  const features: PairingFeatureId[] = [];
  const nameFeatures: PairingFeatureId[] = [];
  const isClassic = CLASSIC_KLEAM_RE.test(name);
  if (isClassic) {
    score += 80;
    features.push('meaty');
  }

  for (const rule of FEATURE_RULES) {
    if (rule.re.test(name)) {
      score += rule.weight;
      features.push(rule.id);
      nameFeatures.push(rule.id);
    } else if (!rule.nameOnly && rule.re.test(desc)) {
      score += Math.round(rule.weight * 0.55);
      features.push(rule.id);
    }
  }

  const hasStrong = features.some((f) => f === 'grilled' || f === 'crispy' || f === 'salad' || f === 'seafood' || f === 'cured');
  const categoryIsKleam = slug === 'grilled' || slug === 'streetfood' || slug === 'salad';
  if (!hasStrong && !categoryIsKleam && !isClassic) return null;
  if (typeof food.calories === 'number' && food.calories > 650) score -= 10;
  if (score < (MIN_SCORE_BY_CATEGORY[slug] ?? 55)) return null;

  const kinds: DrinkKind[] = [];
  if (features.some((f) => f === 'grilled' || f === 'crispy' || f === 'seafood' || f === 'salad' || f === 'spicy') || categoryIsKleam) {
    kinds.push('beer');
  }
  if (features.some((f) => f === 'cured' || f === 'meaty' || f === 'spicy' || f === 'grilled') ) {
    kinds.push('spirits');
  }
  if (kinds.length === 0) kinds.push('beer');

  const primary: PairingFeatureId | null =
    slug === 'salad' ? 'salad' : slug === 'grilled' ? 'grilled' : slug === 'streetfood' ? 'crispy' : null;

  return {
    score,
    kinds,
    features: Array.from(new Set(features)),
    nameFeatures: Array.from(new Set(nameFeatures)),
    primary,
  };
}

export function isDrinkingFood(food: FoodItem): boolean {
  return getDrinkPairing(food) !== null;
}

export interface RankedPairingDish {
  food: FoodItem;
  info: DrinkPairingInfo;
}

/** Ranks every drinking-food dish, best first (pairing strength + rating). */
export function rankDrinkPairingDishes(
  foods: FoodItem[],
  kind: DrinkKindFilter = 'all'
): RankedPairingDish[] {
  const out: RankedPairingDish[] = [];
  for (const food of foods) {
    const info = getDrinkPairing(food);
    if (!info) continue;
    if (kind !== 'all' && !info.kinds.includes(kind)) continue;
    out.push({ food, info });
  }
  out.sort(
    (a, b) =>
      b.info.score + (b.food.rating || 4.5) * 6 - (a.info.score + (a.food.rating || 4.5) * 6)
  );
  return out;
}

const FEATURE_PHRASE: Record<PairingFeatureId, [string, string, string]> = {
  grilled: [
    'អាំងលើធ្យូង ក្លិនឈ្ងុយឆេះបន្តិច',
    'smoky charcoal-grilled aroma',
    '炭火烧烤的烟熏香气',
  ],
  crispy: [
    'ចៀន/បំពងស្រួយៗ ញ៉ាំលេងបានមិនធុញ',
    'crunchy fried bites you can keep snacking on',
    '酥脆小食，边喝边吃不腻',
  ],
  salad: [
    'ញាំជូរហឹរស្រស់ ជួយឱ្យមាត់ស្រស់ស្រាយ',
    'zesty, tangy salad that refreshes the palate',
    '酸辣爽口的凉拌，解腻开胃',
  ],
  spicy: [
    'ហឹរមុត ផ្គួបស្រាបៀរត្រជាក់បានល្អ',
    'a spicy kick that loves ice-cold beer',
    '香辣过瘾，配冰啤酒绝佳',
  ],
  sour: ['ជូរស្រស់ កាត់ជាតិខ្លាញ់បានល្អ', 'bright sourness cuts through richness', '酸爽解腻'],
  seafood: ['គ្រឿងសមុទ្រ/ត្រីស្រស់ផ្អែម', 'sweet, fresh seafood', '鲜甜海味'],
  cured: [
    'ប្រៃ ទំពារយូរ ជាម្ហូបក្លែមបុរាណ',
    'salty, chewy and savoury — a classic drinking snack',
    '咸香有嚼劲，经典下酒菜',
  ],
  meaty: ['សាច់ឈ្ងុយ សម្បូររសជាតិ', 'rich, hearty meat flavour', '肉香浓郁'],
};

/** Human-readable "why it pairs" sentence (top 2 features, the dish's own style first). */
export function pairingReason(info: DrinkPairingInfo, language: Language): string {
  const order: PairingFeatureId[] = ['grilled', 'crispy', 'cured', 'salad', 'seafood', 'spicy', 'sour', 'meaty'];
  const ranked: PairingFeatureId[] = [];
  const push = (f: PairingFeatureId | null) => {
    if (f && !ranked.includes(f)) ranked.push(f);
  };
  push(info.primary);
  order.filter((f) => info.nameFeatures.includes(f)).forEach(push);
  order.filter((f) => info.features.includes(f)).forEach(push);
  const picked = ranked.slice(0, 2);
  if (picked.length === 0) picked.push('meaty');
  return picked
    .map((f) => tr(language, FEATURE_PHRASE[f][0], FEATURE_PHRASE[f][1], FEATURE_PHRASE[f][2]))
    .join(' • ');
}

export function pairingKindsLabel(kinds: DrinkKind[], language: Language): string {
  const parts: string[] = [];
  if (kinds.includes('beer')) parts.push(tr(language, '🍺 ស្រាបៀរ', '🍺 Beer', '🍺 啤酒'));
  if (kinds.includes('spirits')) parts.push(tr(language, '🥃 ស្រា', '🥃 Liquor & wine', '🥃 烈酒/葡萄酒'));
  return parts.join(' · ');
}

export function drinkDisclaimer(language: Language): string {
  return tr(
    language,
    'សម្រាប់អាយុ ១៨ ឆ្នាំឡើង • ផឹកស្រាត្រូវមានកម្រិត • កុំបើកបរពេលផឹកស្រា',
    '18+ only • Drink responsibly • Never drink and drive',
    '仅限18岁以上 • 理性饮酒 • 酒后严禁驾驶'
  );
}

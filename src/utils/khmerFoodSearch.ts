import { FoodItem } from '../types';
import { getLocalizedFood } from './zhDynamicTranslator';

export type KhmerFlavorIntent =
  | 'spicy'
  | 'sour_spicy'
  | 'sour'
  | 'sweet_sour'
  | 'sweet'
  | 'bitter'
  | 'salty'
  | 'coconut';

export type KhmerCategoryIntent =
  | 'soup'
  | 'clear_soup_steamed'
  | 'stirfry'
  | 'grilled'
  | 'salad'
  | 'noodles'
  | 'rice'
  | 'streetfood'
  | 'dessert'
  | 'cake'
  | 'drink';

export interface ParsedKhmerFoodQuery {
  rawQuery: string;
  normalizedQuery: string;
  coreQuery: string;
  tokens: string[];
  flavorIntents: KhmerFlavorIntent[];
  categoryIntents: KhmerCategoryIntent[];
  isFlavorOnlyQuery: boolean;
  isDrinkExplicitlyRequested: boolean;
}

const NEGATED_SPICE_RE =
  /មិន(?:សូវ)?ហឹរ(?:ខ្លាំង)?|អត់ហឹរ|គ្មានរសជាតិហឹរ|គ្មានម្ទេស|មិនដាក់ម្ទេស|អត់ម្ទេស|\bnot\s+(?:very\s+|too\s+)?spicy\b|\bnon[\s-]*spicy\b|\bmild(?:ly)?(?:\s+spiced)?\b|\bno\s+chili\b/gi;

const LEADING_FRAMING_PREFIX_RE =
  /^(?:ថ្ងៃនេះ|ពេលនេះ|សូម|សុំ|ជួយ|ណែនាំ|ស្វែងរក|ចង់រក|រកមើល|រក|ចង់ញ៉ាំ|ចង់ហូប|ចង់ពិសា|ញ៉ាំ|ហូប|ពិសា|មុខម្ហូប|ម្ហូបអាហារ|ម្ហូបខ្មែរ|ម្ហូប|អាហារខ្មែរ|អាហារ|ប្រភេទម្ហូប|ប្រភេទអាហារ|ប្រភេទ|បែប|ដែលមានរសជាតិ|ដែលមាន|មានរសជាតិ|មាន|រសជាតិ)\s*/u;

const QUERY_STOPWORDS = new Set<string>([
  'រសជាតិ',
  'មុខម្ហូប',
  'ម្ហូបអាហារ',
  'ម្ហូប',
  'អាហារ',
  'ប្រភេទ',
  'បែប',
  'ចង់ញ៉ាំ',
  'ចង់ហូប',
  'ញ៉ាំ',
  'ហូប',
  'ស្វែងរក',
  'រក',
  'ណែនាំ',
  'សុំ',
  'សូម',
  'ជួយ',
  'ដែលមាន',
  'មាន',
  'ខ្លាំង',
  'តិច',
  'តិចៗ',
  'ឆ្ងាញ់',
  'ឆ្ងាញ់ៗ',
  'ខ្មែរ',
  'ថ្ងៃនេះ',
  'taste',
  'flavor',
  'flavour',
  'food',
  'foods',
  'dish',
  'dishes',
  'khmer',
  'cambodian',
  'recommend',
  'craving',
]);

const BEVERAGE_OR_SWEET_NAME_RE =
  /^(?:បង្អែម|ទឹកសណ្តែក|ទឹកអំពៅ|ទឹកដូង|ទឹកត្នោត|កាហ្វេ|តែក្រូចឆ្មា|តែបៃតង|ទឹកក្រឡុក|ទឹកត្រឡាច|ទឹកផ្លែឈើ|ការ៉េម)/i;

const EXPLICIT_SPICY_TITLE_RE =
  /បុកល្ហុង|បុកស្វាយ|បុកកាពិ|បុកត្រប់|បុកសណ្តែក|បុកមី|បុកកន្ទុយហេស|ភ្លា|ឆាក្តៅ|ឆាម្រះព្រៅ|ម្រះព្រៅ|សម្លប្រហុកក្តៅ|សម្លម្ជូរព្រៃ|ទឹកត្រីកោះកុង|អំបិលម្ទេស|លៀសហាល|ក្តាមប្រៃ|ងាវឆាអំពិលទុំ|ហឹរ|ម្ទេស|តុំយ៉ាំ|\bspicy\b|\bchili\b|\bhot\s+basil\b|\bbok\s+lhong\b|\bpapaya\s+salad\b|\bceviche\b|\btom\s+yum\b/i;

const ZESTY_SALAD_OR_CHILI_TITLE_RE =
  /ញាំ|បុក|ភ្លា|ទឹកគ្រឿង|កាពិ|ម្រេចកំពត|\bsalad\b|\bkampot\s+pepper\b/i;

const SPICY_BODY_RE =
  /ហឹរ|ម្ទេស(?!ប្លោក)|ម្រះព្រៅ|\bspicy\b|\bhot\s+chili\b|\bbird'?s[\s-]*eye\s+chili\b|\bthai\s+chili\b|\bfresh\s+chili\b/i;

/**
 * Normalizes Khmer, English, and Chinese food search text:
 * - Strips zero-width characters & collapses punctuation/spaces
 * - Normalizes common Khmer vowel/subscript spelling variations:
 *   e.g. `ហិរ` -> `ហឹរ`, `ស្រដែក` / `សណ្ដែក` -> `សណ្តែក`, `ណ្ដ` -> `ណ្ត`, `ក្ដ` -> `ក្ត`, `ប្ញស្សី`/`ឬស្សី` -> `ឫស្សី`
 */
export function normalizeKhmerFoodText(input?: string): string {
  if (!input) return '';
  return String(input)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
    .replace(/ហិរ/g, 'ហឹរ')
    .replace(/ស្រដែក/g, 'សណ្តែក')
    .replace(/ណ្ដ/g, 'ណ្ត')
    .replace(/ក្ដ/g, 'ក្ត')
    .replace(/ផ្ដ/g, 'ផ្ត')
    .replace(/ស្ដ/g, 'ស្ត')
    .replace(/ម្ដ/g, 'ម្ត')
    .replace(/ឆ្ដ/g, 'ឆ្ត')
    .replace(/ង្ដ/g, 'ង្ត')
    .replace(/ន្ដ/g, 'ន្ត')
    .replace(/អម្ពិល/g, 'អំពិល')
    .replace(/ប្ញស្សី|ឬស្សី/g, 'ឫស្សី')
    .replace(/ក្រូចឆ្មារ/g, 'ក្រូចឆ្មា')
    .replace(/មីសួ(?!រ)/g, 'មីសួរ')
    .replace(/ស្លឹកញរ/g, 'ស្លឹកញ')
    .replace(/ស្លឹកតើយ/g, 'ស្លឹកតយ')
    .replace(/នំបុ័ង/g, 'នំប៉័ង')
    .replace(/កាពិក/g, 'កាពិ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»៖។]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips negated spice phrases (e.g. `មិនហឹរខ្លាំង`, `មិនសូវហឹរ`, `គ្មានម្ទេស`, `not spicy`, `mild`)
 * so mild dishes are never falsely matched as spicy.
 */
export function stripNegatedSpicePhrases(text?: string): string {
  if (!text) return '';
  return normalizeKhmerFoodText(text).replace(NEGATED_SPICE_RE, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Safely checks whether `hay` contains `token` without Khmer subscript Coeng (\u17D2) false positives
 * or short Latin partial-word collisions.
 */
export function includesNormalizedKhmerToken(hay: string, token: string): boolean {
  const t = token.trim().toLowerCase();
  if (!t) return false;
  let idx = hay.indexOf(t);
  const isShortLatin = /^[a-z]{2,4}$/.test(t);
  while (idx !== -1) {
    const prevCode = idx > 0 ? hay.charCodeAt(idx - 1) : 0;
    const nextIdx = idx + t.length;
    const prevIsLatin = idx > 0 && /[a-z0-9]/i.test(hay[idx - 1]);
    const nextIsLatin = nextIdx < hay.length && /[a-z0-9]/i.test(hay[nextIdx]);
    if (prevCode !== 0x17d2 && (!isShortLatin || (!prevIsLatin && !nextIsLatin))) {
      return true;
    }
    idx = hay.indexOf(t, idx + 1);
  }
  return false;
}

export function isBeverageFood(food: FoodItem): boolean {
  if (food.categorySlug === 'drink') return true;
  const normName = normalizeKhmerFoodText(food.nameKh);
  return /^(?:ទឹកសណ្តែក|ទឹកអំពៅ|ទឹកដូង|ទឹកត្នោត|កាហ្វេ|តែក្រូចឆ្មា|តែបៃតង|ទឹកក្រឡុក|ទឹកត្រឡាច|ភេសជ្ជៈ)/.test(
    normName
  );
}

export function isSweetOrBeverageFood(food: FoodItem): boolean {
  if (
    food.categorySlug === 'drink' ||
    food.categorySlug === 'dessert' ||
    food.categorySlug === 'cake'
  ) {
    return true;
  }
  const normName = normalizeKhmerFoodText(food.nameKh);
  return BEVERAGE_OR_SWEET_NAME_RE.test(normName);
}

function peelLeadingFramingPrefixes(normalized: string): string {
  let current = normalized.trim();
  let guard = 0;
  while (guard < 8 && current.length > 0) {
    guard++;
    const match = current.match(LEADING_FRAMING_PREFIX_RE);
    if (!match || !match[0]) break;
    const next = current
      .slice(match[0].length)
      .replace(/^ៗ+\s*/u, '')
      .trim();
    if (next.length < 2) break;
    current = next;
  }
  return current.replace(/ៗ+$/u, '').trim() || normalized;
}

/**
 * Parses a Khmer/English/Chinese food search query into normalized core keywords,
 * flavor intents (`spicy`, `sour_spicy`, `sour`, `sweet`, `bitter`, `salty`, `coconut`),
 * and food category intents.
 */
export function parseKhmerFoodSearchQuery(rawQuery?: string): ParsedKhmerFoodQuery {
  const normalizedQuery = normalizeKhmerFoodText(rawQuery);
  if (!normalizedQuery) {
    return {
      rawQuery: rawQuery || '',
      normalizedQuery: '',
      coreQuery: '',
      tokens: [],
      flavorIntents: [],
      categoryIntents: [],
      isFlavorOnlyQuery: false,
      isDrinkExplicitlyRequested: false,
    };
  }

  const coreQuery = peelLeadingFramingPrefixes(normalizedQuery);
  const rawTokens = coreQuery
    .split(/\s+/)
    .map((tok) => peelLeadingFramingPrefixes(tok))
    .filter((tok) => tok.length > 0);

  const meaningfulTokens = rawTokens.filter((tok) => !QUERY_STOPWORDS.has(tok));
  const tokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

  const joined = `${coreQuery} ${tokens.join(' ')}`.trim();
  const hasNegatedSpiceInQuery = /មិន(?:សូវ)?ហឹរ|អត់ហឹរ|គ្មានម្ទេស|\bnot\s+spicy\b|\bnon[\s-]*spicy\b|\bmild\b/i.test(
    normalizedQuery
  );

  const flavorIntents: KhmerFlavorIntent[] = [];
  const hasSourWord = /ជូរ|ម្ជូរ|\bsour\b|\btangy\b|酸/i.test(joined);
  const hasSweetWord = /ផ្អែម|\bsweet\b|甜/i.test(joined) && !/ទឹកនោមផ្អែម/.test(joined);
  const hasSpicyWord =
    !hasNegatedSpiceInQuery &&
    (/ហឹរ|ម្ទេស|\bspicy\b|\bhot\s+and\s+spicy\b|\bchili\b|辣|香辣|麻辣/i.test(joined) ||
      coreQuery === 'ហឹរ');

  if (hasSourWord && hasSpicyWord) {
    flavorIntents.push('sour_spicy');
  } else if (hasSourWord && hasSweetWord) {
    flavorIntents.push('sweet_sour');
  } else {
    if (hasSpicyWord) flavorIntents.push('spicy');
    if (hasSourWord && !/ម្ជូរ/.test(coreQuery)) flavorIntents.push('sour');
    if (hasSweetWord && !/ទឹកត្រីផ្អែម/.test(coreQuery)) flavorIntents.push('sweet');
  }

  if (/ល្វីង|\bbitter\b|苦/i.test(joined)) {
    flavorIntents.push('bitter');
  }
  if (/ប្រៃ|\bsalty\b|咸/i.test(joined) && !/ពងទាប្រៃ|ត្រីប្រៃ|ក្តាមប្រៃ/.test(coreQuery)) {
    flavorIntents.push('salty');
  }
  if (/ខ្ទិះ|\bcoconut\s*(?:milk|cream)\b|椰奶|椰浆/i.test(joined) && coreQuery.length <= 16) {
    flavorIntents.push('coconut');
  }

  const categoryIntents: KhmerCategoryIntent[] = [];
  if (/^(?:សម្ល|សម្លក្តៅ|ស៊ុប|ទឹកស៊ុប|ម្ជូរ|ការី|កកូរ|ប្រហើរ)|\bsoup\b|\bcurry\b|汤|浓汤/i.test(coreQuery)) {
    categoryIntents.push('soup');
  }
  if (/^(?:ស្ងោរ|ចំហុយ)|\bsteamed\b|\bclear\s+soup\b|清蒸|清汤/i.test(coreQuery)) {
    categoryIntents.push('clear_soup_steamed');
  }
  if (/^(?:ឆា|ម្ហូបឆា)|\bstir[\s-]*fry\b|热炒|小炒/i.test(coreQuery)) {
    categoryIntents.push('stirfry');
  }
  if (/^(?:អាំង|សាច់អាំង|បំពង|ចៀន|ដុត)|\bgrilled\b|\bbbq\b|\broast\b|烧烤/i.test(coreQuery)) {
    categoryIntents.push('grilled');
  }
  if (/^(?:ញាំ|ភ្លា|បុក)|\bsalad\b|凉拌/i.test(coreQuery)) {
    categoryIntents.push('salad');
  }
  if (/^(?:គុយទាវ|មី|នំបញ្ចុក|លត|បាញ់កាញ់|ហ្វឺ)|\bnoodles?\b|粿条|米粉|面条/i.test(coreQuery)) {
    categoryIntents.push('noodles');
  }
  if (/^(?:បាយ|បបរ)|\brice\b|\bporridge\b|\bcongee\b|米饭|炒饭|粥/i.test(coreQuery)) {
    categoryIntents.push('rice');
  }
  if (/^(?:អាហារសម្រន់|សម្រន់|ម្ហូបតាមផ្លូវ)|\bstreet\s*food\b|\bsnacks?\b|街头小吃|小吃/i.test(coreQuery)) {
    categoryIntents.push('streetfood');
  }
  if (/^(?:បង្អែម|បង្អែមខ្មែរ)|\bdesserts?\b|甜品|甜点/i.test(coreQuery)) {
    categoryIntents.push('dessert');
  }
  if (/^(?:នំខ្មែរ|នំបុរាណ|នំ)|\bcakes?\b|\bpastry\b|糕点/i.test(coreQuery) && !/^នំបញ្ចុក|^នំប៉័ង/.test(coreQuery)) {
    categoryIntents.push('cake');
  }

  const isDrinkExplicitlyRequested =
    /ភេសជ្ជៈ|ទឹកសណ្តែក|ទឹកអំពៅ|ទឹកដូង|ទឹកត្នោត|កាហ្វេ|តែក្រូចឆ្មា|តែបៃតង|ទឹកក្រឡុក|ទឹកត្រឡាច|ទឹកផ្លែឈើ|\bdrinks?\b|\bbeverages?\b|\bsoy\s*milk\b|\bsugarcane\b|\bcoconut\s*water\b|\bcoffee\b|\biced\s*tea\b|\bsmoothie\b|饮品|饮料|豆浆|咖啡|柠檬茶/i.test(
      normalizedQuery
    ) && !/ម្ហូបអមភេសជ្ជៈ/.test(normalizedQuery);

  if (isDrinkExplicitlyRequested) {
    categoryIntents.push('drink');
  }

  const strippedFlavorRemainder = coreQuery
    .replace(
      /ជូរហឹរ|ជូរផ្អែម|ហឹរ|ជូរ|ផ្អែម|ល្វីង|ប្រៃ|ខ្ទិះដូង|ខ្ទិះ|ខ្លាំង|តិចៗ|តិច|មុត|ស្រស់ស្រាយ|\bspicy\b|\bsour\b|\bsweet\b|\bbitter\b|\bsalty\b|\bhot\b|\band\b|酸辣|香辣|麻辣|辣|酸|甜|苦|咸/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  const isFlavorOnlyQuery = flavorIntents.length > 0 && strippedFlavorRemainder.length === 0;

  return {
    rawQuery: rawQuery || '',
    normalizedQuery,
    coreQuery,
    tokens,
    flavorIntents,
    categoryIntents,
    isFlavorOnlyQuery,
    isDrinkExplicitlyRequested,
  };
}

/**
 * Evaluates whether a dish genuinely has a spicy taste profile (negation-safe and drink/dessert-safe).
 * Returns 0 if the dish is NOT spicy, or a positive relevance score (130..320) if genuinely spicy.
 */
export function getSpicyDishScore(food: FoodItem): number {
  if (isSweetOrBeverageFood(food)) return 0;

  const rawCombinedDesc = `${food.descriptionKh || ''} ${food.descriptionEn || ''} ${food.tasteProfile || ''}`;
  if (NEGATED_SPICE_RE.test(normalizeKhmerFoodText(rawCombinedDesc))) {
    NEGATED_SPICE_RE.lastIndex = 0;
    return 0;
  }
  NEGATED_SPICE_RE.lastIndex = 0;

  const titleNorm = normalizeKhmerFoodText(`${food.nameKh || ''} ${food.nameEn || ''}`);
  const ingNorm = stripNegatedSpicePhrases(
    [
      ...(food.ingredients || []).map((i) => `${i.nameKh || ''} ${i.nameEn || ''}`),
      ...(food.ingredientsKh || []),
      ...(food.ingredientsEn || []),
    ].join(' ')
  );
  const descNorm = stripNegatedSpicePhrases(rawCombinedDesc);
  const stepsNorm = stripNegatedSpicePhrases(
    (food.steps || []).map((s) => `${s.instructionKh || ''} ${s.instructionEn || ''}`).join(' ')
  );

  if (EXPLICIT_SPICY_TITLE_RE.test(titleNorm)) {
    return 310;
  }
  if (
    (food.categorySlug === 'salad' || ZESTY_SALAD_OR_CHILI_TITLE_RE.test(titleNorm)) &&
    (SPICY_BODY_RE.test(descNorm) || SPICY_BODY_RE.test(ingNorm) || SPICY_BODY_RE.test(stepsNorm))
  ) {
    return 255;
  }
  if (/ហឹរ|\bspicy\b/i.test(descNorm)) {
    return 215;
  }
  if (SPICY_BODY_RE.test(ingNorm)) {
    return 155;
  }
  return 0;
}

/**
 * Scores a single FoodItem against a parsed Khmer/English/Chinese search query.
 * Returns <= 0 when the dish is irrelevant or excluded by strict flavor/category boundaries.
 */
export function scoreFoodForKhmerQuery(food: FoodItem, parsed: ParsedKhmerFoodQuery): number {
  if (!parsed.normalizedQuery) return 0;

  const zhLoc = getLocalizedFood(food, 'zh');
  const titleNorm = normalizeKhmerFoodText(`${food.nameKh || ''} ${food.nameEn || ''} ${zhLoc.name || ''}`);
  const catNorm = normalizeKhmerFoodText(
    `${food.categoryKh || ''} ${food.categoryEn || ''} ${food.categorySlug || ''} ${zhLoc.category || ''}`
  );
  const provNorm = normalizeKhmerFoodText(
    `${food.provinceKh || ''} ${food.provinceEn || ''} ${zhLoc.province || ''}`
  );
  const ingNorm = normalizeKhmerFoodText(
    [
      ...(food.ingredients || []).map((i) => `${i.nameKh || ''} ${i.nameEn || ''}`),
      ...(food.ingredientsKh || []),
      ...(food.ingredientsEn || []),
      ...(zhLoc.ingredients || []),
    ].join(' ')
  );
  const descSafeNorm = stripNegatedSpicePhrases(
    `${food.descriptionKh || ''} ${food.descriptionEn || ''} ${zhLoc.description || ''} ${food.tasteProfile || ''}`
  );

  const wantsSpicy =
    parsed.flavorIntents.includes('spicy') || parsed.flavorIntents.includes('sour_spicy');

  // Strict guardrail 1: Spicy queries NEVER return beverages, soy milk, desserts, or cakes!
  if (wantsSpicy) {
    if (isSweetOrBeverageFood(food)) return -1000;
    const spicyScore = getSpicyDishScore(food);
    if (spicyScore <= 0) return -1000;

    if (parsed.flavorIntents.includes('sour_spicy')) {
      const hasSourSignal =
        /ម្ជូរ|ជូរ|ញាំ|ភ្លា|បុក|តុំយ៉ាំ|ក្រូចឆ្មា|អំពិល|សណ្ដាន់|សណ្តាន់|ក្រសាំង|\bsour\b|\blime\b|\btamarind\b|\bsalad\b|\bceviche\b/i.test(
          `${titleNorm} ${ingNorm} ${descSafeNorm}`
        );
      if (!hasSourSignal && parsed.isFlavorOnlyQuery) return -500;
      return spicyScore + (hasSourSignal ? 70 : 0);
    }

    if (parsed.isFlavorOnlyQuery) {
      return spicyScore;
    }
  }

  // Strict guardrail 2: Non-drink flavor queries (`ជូរ`, `ប្រៃ`, `ល្វីង`) never return soy milk or sweet beverages
  if (
    !parsed.isDrinkExplicitlyRequested &&
    (parsed.flavorIntents.includes('sour') ||
      parsed.flavorIntents.includes('salty') ||
      parsed.flavorIntents.includes('bitter'))
  ) {
    if (isSweetOrBeverageFood(food)) return -1000;
  }

  let score = 0;

  // Flavor intent scoring
  if (parsed.flavorIntents.includes('spicy')) {
    score += getSpicyDishScore(food);
  }
  if (parsed.flavorIntents.includes('sour')) {
    if (/ម្ជូរ|ស្ងោរជ្រក់|ញាំ|ភ្លា|បុកស្វាយ|បុកល្ហុង|តុំយ៉ាំ|អំពិល|\bsour\b|\btamarind\b|\blime\b/i.test(titleNorm)) {
      score += 275;
    } else if (/ជូរ|អំពិល|ក្រូចឆ្មា|សណ្តាន់|ក្រសាំង|ទំពាំងជ្រក់|ស្ពៃជ្រក់|\bsour\b|\btangy\b/i.test(`${descSafeNorm} ${ingNorm}`)) {
      score += 170;
    } else if (parsed.isFlavorOnlyQuery) {
      return -500;
    }
  }
  if (parsed.flavorIntents.includes('sweet_sour')) {
    if (isBeverageFood(food)) return -500;
    if (/ជូរផ្អែម|ឆាជូរផ្អែម|ទឹកត្រីផ្អែម|\bsweet\s*(?:and|&)\s*sour\b/i.test(`${titleNorm} ${descSafeNorm}`)) {
      score += 290;
    } else if (parsed.isFlavorOnlyQuery) {
      return -500;
    }
  }
  if (parsed.flavorIntents.includes('sweet')) {
    if (food.categorySlug === 'dessert' || food.categorySlug === 'cake') {
      score += 290;
    } else if (food.categorySlug === 'drink' && /ផ្អែម|ស្ករត្នោត|ទឹកដោះគោ|ទឹកសណ្តែក|ទឹកអំពៅ|ទឹកដូង/i.test(`${titleNorm} ${descSafeNorm}`)) {
      score += 220;
    } else if (/ផ្អែម|ស្ករត្នោត|ទឹកឃ្មុំ|\bsweet\b|\bhoney\b|\bpalm\s+sugar\b/i.test(titleNorm)) {
      score += 195;
    } else if (parsed.isFlavorOnlyQuery) {
      return -500;
    }
  }
  if (parsed.flavorIntents.includes('bitter')) {
    if (/ម្រះ(?!ព្រៅ)|ស្តៅ|\bbitter\s+melon\b|\bneem\b/i.test(titleNorm)) {
      score += 340;
    } else if (/ស្លឹកញ|\bnoni\b/i.test(titleNorm)) {
      score += 240;
    } else if (/ល្វីង|ម្រះ(?!ព្រៅ)|ស្តៅ|\bbitter\b|\bneem\b/i.test(`${descSafeNorm} ${ingNorm}`)) {
      score += 200;
    } else if (parsed.isFlavorOnlyQuery) {
      return -500;
    }
  }
  if (parsed.flavorIntents.includes('salty')) {
    if (/ប្រៃ|ប្រហុក|ផ្អក|ម៉ាំ|ឆៃប៉ូវ|ងៀត|\bsalted\b|\bprahok\b|\bfermented\b/i.test(titleNorm)) {
      score += 280;
    } else if (/ប្រៃ|ប្រហុក|ផ្អក|ម៉ាំ|ពងទាប្រៃ|ត្រីប្រៃ|\bsalty\b|\bsalted\b/i.test(`${descSafeNorm} ${ingNorm}`)) {
      score += 175;
    } else if (parsed.isFlavorOnlyQuery) {
      return -500;
    }
  }
  if (parsed.flavorIntents.includes('coconut')) {
    if (/ខ្ទិះ|អាម៉ុក|ការី|ណាំយ៉ា|\bcoconut\b|\bamok\b|\bcurry\b/i.test(titleNorm)) {
      score += 265;
    } else if (/ខ្ទិះដូង|ខ្ទិះ|\bcoconut\s+(?:milk|cream)\b/i.test(`${descSafeNorm} ${ingNorm}`)) {
      score += 180;
    } else if (parsed.isFlavorOnlyQuery) {
      return -500;
    }
  }

  // Category intent scoring
  for (const catIntent of parsed.categoryIntents) {
    if (catIntent === 'drink') {
      if (isBeverageFood(food)) score += 260;
    } else if (catIntent === 'dessert') {
      if (food.categorySlug === 'dessert') score += 270;
      else if (food.categorySlug === 'cake') score += 180;
    } else if (catIntent === 'cake') {
      if (food.categorySlug === 'cake') score += 270;
      else if (/^នំ(?!បញ្ចុក|ប៉័ង)/.test(normalizeKhmerFoodText(food.nameKh))) score += 220;
    } else if (catIntent === 'soup') {
      if (food.categorySlug === 'soup') score += 240;
      else if (/^សម្ល|^ស្ងោរ|\bsoup\b|\bcurry\b/i.test(titleNorm)) score += 200;
    } else if (catIntent === 'clear_soup_steamed') {
      if (/ស្ងោរ|ចំហុយ|\bclear\b|\bsteamed\b|\bboiled\b/i.test(titleNorm)) score += 250;
    } else if (catIntent === 'stirfry') {
      if (food.categorySlug === 'stirfry') score += 240;
    } else if (catIntent === 'grilled') {
      if (food.categorySlug === 'grilled') score += 240;
      else if (!isSweetOrBeverageFood(food) && /អាំង|បំពង|ចៀន|ដុត|\bgrilled\b|\bfried\b|\broast\b/i.test(titleNorm)) score += 190;
    } else if (catIntent === 'salad') {
      if (food.categorySlug === 'salad') score += 250;
    } else if (catIntent === 'noodles') {
      if (food.categorySlug === 'noodles') score += 250;
    } else if (catIntent === 'rice') {
      if (food.categorySlug === 'rice') score += 250;
    } else if (catIntent === 'streetfood') {
      if (food.categorySlug === 'streetfood') score += 250;
    }
  }

  // Direct title / keyword matching using coreQuery and meaningful tokens
  if (!parsed.isFlavorOnlyQuery) {
    const qCore = parsed.coreQuery;
    if (qCore.length >= 2) {
      if (titleNorm === qCore || titleNorm.startsWith(qCore)) {
        score += 340;
      } else if (includesNormalizedKhmerToken(titleNorm, qCore)) {
        score += 280;
      } else if (includesNormalizedKhmerToken(provNorm, qCore)) {
        score += 180;
      } else if (includesNormalizedKhmerToken(ingNorm, qCore)) {
        score += 120;
      } else if (includesNormalizedKhmerToken(catNorm, qCore)) {
        score += 95;
      } else if (includesNormalizedKhmerToken(descSafeNorm, qCore)) {
        score += 65;
      }
    }

    let matchedTokenCount = 0;
    for (const tok of parsed.tokens) {
      if (tok.length < 2 || QUERY_STOPWORDS.has(tok)) continue;
      if (includesNormalizedKhmerToken(titleNorm, tok)) {
        score += 135;
        matchedTokenCount++;
      } else if (includesNormalizedKhmerToken(provNorm, tok)) {
        score += 90;
        matchedTokenCount++;
      } else if (includesNormalizedKhmerToken(ingNorm, tok)) {
        score += 55;
        matchedTokenCount++;
      } else if (includesNormalizedKhmerToken(catNorm, tok) && parsed.flavorIntents.length === 0) {
        score += 45;
        matchedTokenCount++;
      } else if (includesNormalizedKhmerToken(descSafeNorm, tok) && parsed.flavorIntents.length === 0) {
        score += 25;
        matchedTokenCount++;
      }
    }

    const activeNonStopTokens = parsed.tokens.filter((t) => t.length >= 2 && !QUERY_STOPWORDS.has(t));
    if (activeNonStopTokens.length > 1) {
      if (matchedTokenCount === activeNonStopTokens.length) {
        score += 85;
      } else if (matchedTokenCount === 0 && score === 0) {
        return 0;
      }
    }
  }

  // Never let generic drink items match a non-drink savory search purely from incidental description words
  if (!parsed.isDrinkExplicitlyRequested && isBeverageFood(food) && score < 200) {
    return 0;
  }

  return score;
}

/**
 * Searches and ranks FoodItem[] accurately for any Khmer, English, or Chinese query.
 */
export function searchKhmerFoods(foods: FoodItem[], rawQuery: string): FoodItem[] {
  const parsed = parseKhmerFoodSearchQuery(rawQuery);
  if (!parsed.normalizedQuery) return [];

  const scored: Array<{ food: FoodItem; score: number }> = [];
  for (const food of foods) {
    const score = scoreFoodForKhmerQuery(food, parsed);
    if (score >= 55) {
      scored.push({ food, score });
    }
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (b.food.rating || 0) - (a.food.rating || 0) ||
      (b.food.reviewCount || 0) - (a.food.reviewCount || 0)
  );

  return scored.map((entry) => entry.food);
}

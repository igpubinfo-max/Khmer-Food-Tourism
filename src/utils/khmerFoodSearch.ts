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

export type KhmerOccasionIntent =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'rainy'
  | 'hot_weather'
  | 'healthy'
  | 'vegetarian'
  | 'general_recommend';

export type ExcludedProteinType = 'pork' | 'beef' | 'chicken' | 'seafood' | 'fish';

export interface ParsedKhmerFoodQuery {
  rawQuery: string;
  normalizedQuery: string;
  coreQuery: string;
  tokens: string[];
  flavorIntents: KhmerFlavorIntent[];
  categoryIntents: KhmerCategoryIntent[];
  occasionIntents?: KhmerOccasionIntent[];
  excludedProteins?: ExcludedProteinType[];
  isFlavorOnlyQuery: boolean;
  isOccasionOnlyQuery?: boolean;
  isDrinkExplicitlyRequested: boolean;
}

const NEGATED_SPICE_RE =
  /មិន(?:សូវ)?ហឹរ(?:ខ្លាំង)?|អត់ហឹរ|គ្មានរសជាតិហឹរ|គ្មានម្ទេស|មិនដាក់ម្ទេស|អត់ម្ទេស|\bnot\s+(?:very\s+|too\s+)?spicy\b|\bnon[\s-]*spicy\b|\bmild(?:ly)?(?:\s+spiced)?\b|\bno\s+chili\b/gi;

const NEGATED_PORK_RE =
  /អត់(?:ដាក់|មាន|ញ៉ាំ|ហូប)?សាច់ជ្រូក|មិន(?:ដាក់|ញ៉ាំ|ហូប|ប្រើ)?សាច់ជ្រូក|គ្មានសាច់ជ្រូក|តមសាច់ជ្រូក|\bno\s+pork\b|\bpork[\s-]*free\b|\bwithout\s+pork\b|不吃猪肉|无猪肉|不要猪肉/gi;

const NEGATED_BEEF_RE =
  /អត់(?:ដាក់|មាន|ញ៉ាំ|ហូប)?សាច់គោ|មិន(?:ដាក់|ញ៉ាំ|ហូប|ប្រើ)?សាច់គោ|គ្មានសាច់គោ|តមសាច់គោ|\bno\s+beef\b|\bbeef[\s-]*free\b|\bwithout\s+beef\b|不吃牛肉|无牛肉|不要牛肉/gi;

const NEGATED_CHICKEN_RE =
  /អត់(?:ដាក់|មាន|ញ៉ាំ|ហូប)?សាច់មាន់|មិន(?:ដាក់|ញ៉ាំ|ហូប|ប្រើ)?សាច់មាន់|គ្មានសាច់មាន់|តមសាច់មាន់|\bno\s+chicken\b|\bwithout\s+chicken\b|不吃鸡肉|不要鸡肉/gi;

const NEGATED_SEAFOOD_RE =
  /អត់(?:ដាក់|មាន|ញ៉ាំ|ហូប)?គ្រឿងសមុទ្រ|មិន(?:ដាក់|ញ៉ាំ|ហូប)?គ្រឿងសមុទ្រ|គ្មានគ្រឿងសមុទ្រ|អាឡែស៊ីគ្រឿងសមុទ្រ|\bno\s+seafood\b|\bwithout\s+seafood\b|不吃海鲜|不要海鲜/gi;

const LEADING_FRAMING_PREFIX_RE =
  /^(?:ថ្ងៃនេះ|ពេលនេះ|ឥឡូវនេះ|សូម|សុំ|ជួយ|ប្រាប់|ណែនាំ|ស្វែងរក|ចង់រក|រកមើល|រក|ចង់ដឹង|ចង់ញ៉ាំ|ចង់ហូប|ចង់ពិសា|គួរញ៉ាំ|គួរហូប|ញ៉ាំ|ហូប|ពិសា|របៀបធ្វើ|វិធីធ្វើ|របៀបចម្អិន|រូបមន្តធ្វើ|រូបមន្ត|គ្រឿងផ្សំធ្វើ|គ្រឿងផ្សំ|មុខម្ហូប|ម្ហូបអាហារ|ម្ហូបខ្មែរ|ម្ហូបប្រចាំ|ម្ហូបល្បីៗ|ម្ហូបល្បី|ម្ហូបឆ្ងាញ់ៗ|ម្ហូបឆ្ងាញ់|ម្ហូប|អាហារខ្មែរ|អាហារ|ប្រភេទម្ហូប|ប្រភេទអាហារ|ប្រភេទ|បែប|ដែលមានរសជាតិ|ដែលមាន|មានរសជាតិ|មាន|រសជាតិ|ឆ្ងាញ់ៗ|ឆ្ងាញ់|ល្បីៗ|ល្បី|នៅខេត្ត|នៅរាជធានី|នៅក្រុង|នៅក្នុង|នៅឯ|នៅ)\s*/u;

const TRAILING_FRAMING_SUFFIX_RE =
  /\s*(?:មានអ្វីខ្លះ|មានអីខ្លះ|អ្វីខ្លះ|ណាខ្លះ|អីខ្លះ|ញ៉ាំអីល្អ|ហូបអីល្អ|ញ៉ាំអ្វីល្អ|ហូបអ្វីល្អ|គួរញ៉ាំអី|គួរហូបអី|ញ៉ាំអី|ហូបអី|ធ្វើម៉េចខ្លះ|ធ្វើម៉េច|ដោយរបៀបណា|ល្អទេ|មែនទេ|អត់ទេ|បានទេ|នៅណាខ្លះ|នៅឯណា|នៅណា|បន្តិចមើល|បន្តិច|ផងណា|ផងចាស|ផងបាទ|ផង|ណា៎|ចាស|បាទ|អីល្អ|ល្អ|អ្វី|អី)$/u;

const MID_SENTENCE_CONNECTOR_RE =
  /ឆ្ងាញ់ៗនៅខេត្ត|ឆ្ងាញ់នៅខេត្ត|ឆ្ងាញ់ៗនៅ|ឆ្ងាញ់នៅ|ល្បីៗនៅខេត្ត|ល្បីនៅខេត្ត|ល្បីៗនៅ|ល្បីនៅ|ប្រចាំខេត្ត|នៅក្នុងខេត្ត|នៅខេត្ត|នៅរាជធានី|នៅក្រុង|នៅជិត|នៅឯ/gu;

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
    .replace(/លៀស/g, 'លាស')
    .replace(/ស្រុស/g, 'ស្រុះ')
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
  let current = normalized
    .replace(MID_SENTENCE_CONNECTOR_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let guard = 0;
  while (guard < 10 && current.length > 0) {
    guard++;
    const prev = current;
    const leadMatch = current.match(LEADING_FRAMING_PREFIX_RE);
    if (leadMatch && leadMatch[0]) {
      const next = current
        .slice(leadMatch[0].length)
        .replace(/^ៗ+\s*/u, '')
        .trim();
      if (next.length >= 2) {
        current = next;
      }
    }
    const trailMatch = current.match(TRAILING_FRAMING_SUFFIX_RE);
    if (trailMatch && trailMatch[0]) {
      const next = current
        .slice(0, current.length - trailMatch[0].length)
        .replace(/ៗ+$/u, '')
        .trim();
      if (next.length >= 2) {
        current = next;
      }
    }
    if (current === prev) break;
  }
  return current.replace(/ៗ+$/u, '').trim() || normalized;
}

const KNOWN_KHMER_FOOD_SUBTOKENS = [
  'សម្លម្ជូរគ្រឿង',
  'សម្លម្ជូរព្រៃ',
  'សម្លម្ជូរព្រលិត',
  'សម្លម្ជូរ',
  'សម្លកកូរ',
  'សម្លការី',
  'សម្លប្រហើរ',
  'សម្លប្រហុក',
  'អាម៉ុកត្រី',
  'អាម៉ុក',
  'នំបញ្ចុក',
  'បាយសាច់ជ្រូក',
  'ឡុកឡាក់',
  'គុយទាវ',
  'បុកល្ហុង',
  'បុកស្វាយ',
  'ប្រហុកខ្ទិះ',
  'ទឹកគ្រឿង',
  'ឆាម្រះព្រៅ',
  'ឆាខាត់ណា',
  'ឆាក្តៅ',
  'ស្ងោរជ្រក់',
  'ត្រីដុត',
  'មាន់ដុត',
  'ក្តាមឆាម្រេច',
  'ម្រេចកំពត',
  'សាច់គោអាំង',
  'ទឹកភ្នែក',
  'ត្រីកញ្ចុះ',
  'ត្រីសណ្តាយ',
  'ត្រីរ៉ស់',
  'ត្រីអណ្តែង',
  'ត្រីងៀត',
  'ត្រីឆ្អើរ',
  'ភ្លាបង្គា',
  'លតអង្ករ',
  'លតឆា',
  'លាសឆា',
  'ងាវស្រុះ',
  'ងាវឆា',
  'ងាវអាំង',
  'សាច់ជ្រូក',
  'សាច់គោ',
  'សាច់មាន់',
  'សាច់ទា',
  'គ្រឿងសមុទ្រ',
  'បង្គា',
  'ក្តាម',
  'មឹក',
  'ងាវ',
  'លាស',
  'ខ្យង',
  'អន្ទង់',
  'កង្កែប',
  'ព្រលិត',
  'ខាត់ណា',
  'ត្រកួន',
  'អំពិលទុំ',
  'ង៉ាំង៉ូវ',
  'ត្រី',
  'លត',
  'បាយឆា',
  'បាយ',
  'បបរ',
  'សម្ល',
  'ស៊ុប',
  'ឆា',
  'អាំង',
  'ស្រុះ',
  'ញាំ',
  'ភ្លា',
  'បង្អែម',
  'ភេសជ្ជៈ',
  'សៀមរាប',
  'ភ្នំពេញ',
  'បាត់ដំបង',
  'កំពត',
  'កែប',
  'ព្រះសីហនុ',
  'កំពង់ចាម',
  'កំពង់ធំ',
  'កំពង់ឆ្នាំង',
  'កំពង់ស្ពឺ',
  'កណ្តាល',
  'តាកែវ',
  'ព្រៃវែង',
  'ស្វាយរៀង',
  'ពោធិ៍សាត់',
  'កោះកុង',
  'ក្រចេះ',
  'ស្ទឹងត្រែង',
  'រតនគិរី',
  'មណ្ឌលគិរី',
  'ព្រះវិហារ',
  'ឧត្តរមានជ័យ',
  'បន្ទាយមានជ័យ',
  'ប៉ៃលិន',
  'ត្បូងឃ្មុំ',
];

const GENERIC_COOKING_METHOD_TOKENS = new Set<string>([
  'សម្ល',
  'ស៊ុប',
  'ស្ងោរ',
  'ឆា',
  'អាំង',
  'ដុត',
  'បំពង',
  'ចៀន',
  'ស្រុះ',
  'ញាំ',
  'ភ្លា',
  'បុក',
  'soup',
  'grilled',
  'fried',
  'salad',
]);

/**
 * Parses a Khmer/English/Chinese food search query into normalized core keywords,
 * flavor intents (`spicy`, `sour_spicy`, `sour`, `sweet`, `bitter`, `salty`, `coconut`),
 * category intents, occasion intents, and excluded protein guardrails.
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
      occasionIntents: [],
      excludedProteins: [],
      isFlavorOnlyQuery: false,
      isOccasionOnlyQuery: false,
      isDrinkExplicitlyRequested: false,
    };
  }

  // 1. Detect excluded proteins BEFORE stripping so "អត់សាច់ជ្រូក" excludes pork instead of matching pork!
  const excludedProteins: ExcludedProteinType[] = [];
  let sanitizedForPositiveSearch = normalizedQuery;

  if (NEGATED_PORK_RE.test(sanitizedForPositiveSearch)) {
    excludedProteins.push('pork');
    sanitizedForPositiveSearch = sanitizedForPositiveSearch.replace(NEGATED_PORK_RE, ' ');
  }
  NEGATED_PORK_RE.lastIndex = 0;

  if (NEGATED_BEEF_RE.test(sanitizedForPositiveSearch)) {
    excludedProteins.push('beef');
    sanitizedForPositiveSearch = sanitizedForPositiveSearch.replace(NEGATED_BEEF_RE, ' ');
  }
  NEGATED_BEEF_RE.lastIndex = 0;

  if (NEGATED_CHICKEN_RE.test(sanitizedForPositiveSearch)) {
    excludedProteins.push('chicken');
    sanitizedForPositiveSearch = sanitizedForPositiveSearch.replace(NEGATED_CHICKEN_RE, ' ');
  }
  NEGATED_CHICKEN_RE.lastIndex = 0;

  if (NEGATED_SEAFOOD_RE.test(sanitizedForPositiveSearch)) {
    excludedProteins.push('seafood');
    sanitizedForPositiveSearch = sanitizedForPositiveSearch.replace(NEGATED_SEAFOOD_RE, ' ');
  }
  NEGATED_SEAFOOD_RE.lastIndex = 0;

  // 2. Detect mealtime / weather / occasion intents
  const occasionIntents: KhmerOccasionIntent[] = [];
  if (/ពេលព្រឹក|អាហារពេលព្រឹក|ព្រឹកនេះ|\bbreakfast\b|\bmorning\s+meal\b|早餐/i.test(normalizedQuery)) {
    occasionIntents.push('breakfast');
    sanitizedForPositiveSearch = sanitizedForPositiveSearch.replace(/ពេលព្រឹក|អាហារពេលព្រឹក|ព្រឹកនេះ|\bbreakfast\b|\bmorning\s+meal\b|早餐/gi, ' ');
  }
  if (/ថ្ងៃត្រង់|អាហារថ្ងៃត្រង់|ពេលថ្ងៃត្រង់|\blunch\b|午餐/i.test(normalizedQuery)) {
    occasionIntents.push('lunch');
    sanitizedForPositiveSearch = sanitizedForPositiveSearch.replace(/ថ្ងៃត្រង់|អាហារថ្ងៃត្រង់|ពេលថ្ងៃត្រង់|\blunch\b|午餐/gi, ' ');
  }
  if (/ពេលល្ងាច|ពេលយប់|អាហារពេលល្ងាច|អាហារពេលយប់|\bdinner\b|\bsupper\b|晚餐/i.test(normalizedQuery)) {
    occasionIntents.push('dinner');
    sanitizedForPositiveSearch = sanitizedForPositiveSearch.replace(/ពេលល្ងាច|ពេលយប់|អាហារពេលល្ងាច|អាហារពេលយប់|\bdinner\b|\bsupper\b|晚餐/gi, ' ');
  }
  if (/មេឃភ្លៀង|ពេលភ្លៀង|ខែវស្សា|មេឃត្រជាក់|អាកាសធាតុត្រជាក់|\brainy\b|\bcold\s+weather\b|下雨|雨天/i.test(normalizedQuery)) {
    occasionIntents.push('rainy');
    sanitizedForPositiveSearch = sanitizedForPositiveSearch.replace(/មេឃភ្លៀង|ពេលភ្លៀង|ខែវស្សា|មេឃត្រជាក់|អាកាសធាតុត្រជាក់|\brainy\b|\bcold\s+weather\b|下雨|雨天/gi, ' ');
  }
  if (/មេឃក្តៅ|អាកាសធាតុក្តៅ|ខែប្រាំង|\bhot\s+weather\b|\bsummer\b|天热/i.test(normalizedQuery)) {
    occasionIntents.push('hot_weather');
    sanitizedForPositiveSearch = sanitizedForPositiveSearch.replace(/មេឃក្តៅ|អាកាសធាតុក្តៅ|ខែប្រាំង|\bhot\s+weather\b|\bsummer\b|天热/gi, ' ');
  }
  if (/ម្ហូបបួស|អាហារបួស|\bvegetarian\b|\bvegan\b|素食/i.test(normalizedQuery)) {
    occasionIntents.push('vegetarian');
    if (!excludedProteins.includes('pork')) excludedProteins.push('pork');
    if (!excludedProteins.includes('beef')) excludedProteins.push('beef');
    if (!excludedProteins.includes('chicken')) excludedProteins.push('chicken');
  }
  if (/សុខភាព|អ្នកជំងឺ|ស្រកគីឡូ|គ្មានខ្លាញ់|\bhealthy\b|\bdiet\b|\blow\s+fat\b|健康|减肥/i.test(normalizedQuery)) {
    occasionIntents.push('healthy');
    sanitizedForPositiveSearch = sanitizedForPositiveSearch.replace(/សុខភាព|អ្នកជំងឺ|ស្រកគីឡូ|គ្មានខ្លាញ់|\bhealthy\b|\bdiet\b|\blow\s+fat\b|健康|减肥/gi, ' ');
  }

  sanitizedForPositiveSearch = sanitizedForPositiveSearch.replace(/\s+/g, ' ').trim();
  const coreQuery = peelLeadingFramingPrefixes(sanitizedForPositiveSearch || normalizedQuery);
  const rawTokens = coreQuery
    .split(/\s+/)
    .map((tok) => peelLeadingFramingPrefixes(tok))
    .filter((tok) => tok.length > 0);

  // Extract embedded subtokens from continuous unspaced Khmer strings
  for (const sub of KNOWN_KHMER_FOOD_SUBTOKENS) {
    if (coreQuery.includes(sub) && !rawTokens.includes(sub)) {
      rawTokens.push(sub);
    }
  }

  const meaningfulTokens = rawTokens.filter(
    (tok) => !QUERY_STOPWORDS.has(tok) && !/^(?:ញ៉ាំអី|ហូបអី|អីល្អ|មានអ្វីខ្លះ|អ្វីខ្លះ|ណាខ្លះ|អីខ្លះ|ថ្ងៃនេះ)$/.test(tok)
  );
  const tokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

  const isGeneralWhatToEatQuestion =
    /ញ៉ាំអី|ហូបអី|ពិសាអី|មុខម្ហូបអី|ម្ហូបអ្វីខ្លះ|ម្ហូបឆ្ងាញ់|ម្ហូបល្បី|ណែនាំម្ហូប|\bwhat\s+to\s+eat\b|\bwhat\s+should\s+i\s+eat\b|\brecommend\b|吃什么|推荐/i.test(
      normalizedQuery
    ) &&
    meaningfulTokens.length === 0;

  if (isGeneralWhatToEatQuestion && occasionIntents.length === 0) {
    occasionIntents.push('general_recommend');
  }

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
  const isOccasionOnlyQuery =
    (occasionIntents.length > 0 || excludedProteins.length > 0) &&
    meaningfulTokens.length === 0 &&
    flavorIntents.length === 0 &&
    categoryIntents.length === 0;

  return {
    rawQuery: rawQuery || '',
    normalizedQuery,
    coreQuery: isOccasionOnlyQuery ? '' : coreQuery,
    tokens: isOccasionOnlyQuery ? [] : tokens,
    flavorIntents,
    categoryIntents,
    occasionIntents,
    excludedProteins,
    isFlavorOnlyQuery,
    isOccasionOnlyQuery,
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
      ...(zhLoc.ingredients || []).map((i) => i.name),
    ].join(' ')
  );
  const descSafeNorm = stripNegatedSpicePhrases(
    `${food.descriptionKh || ''} ${food.descriptionEn || ''} ${zhLoc.description || ''} ${food.tasteProfile || ''}`
  );

  const wantsSpicy =
    parsed.flavorIntents.includes('spicy') || parsed.flavorIntents.includes('sour_spicy');

  // Strict guardrail 0: Excluded proteins (e.g. "អត់សាច់ជ្រូក" / "no pork", "អត់សាច់គោ" / "no beef")
  if (parsed.excludedProteins && parsed.excludedProteins.length > 0) {
    const combinedFoodText = `${titleNorm} ${ingNorm}`;
    if (
      parsed.excludedProteins.includes('pork') &&
      /សាច់ជ្រូក|ជើងជ្រូក|ឆ្អឹងជំនីរជ្រូក|ពោះជ្រូក|ស្លឹកត្រចៀកជ្រូក|ខ្លាញ់ជ្រូក|\bpork\b|\bbacon\b|\blard\b|猪肉|猪蹄|排骨/i.test(
        combinedFoodText
      )
    ) {
      return -1000;
    }
    if (
      parsed.excludedProteins.includes('beef') &&
      /សាច់គោ|ពោះគោ|កន្ទុយគោ|ឆ្អឹងគោ|\bbeef\b|\boxtail\b|牛肉|牛肚/i.test(combinedFoodText)
    ) {
      return -1000;
    }
    if (
      parsed.excludedProteins.includes('chicken') &&
      /សាច់មាន់|មាន់ដុត|មាន់ស្ងោរ|ជើងមាន់|ស្លាបមាន់|\bchicken\b|鸡肉|烤鸡/i.test(combinedFoodText)
    ) {
      return -1000;
    }
    if (
      parsed.excludedProteins.includes('seafood') &&
      /បង្គា|ក្តាម|មឹក|ងាវ|លៀស|គ្រឿងសមុទ្រ|\bshrimp\b|\bprawn\b|\bcrab\b|\bsquid\b|\bclam\b|\bseafood\b|海鲜|虾|蟹|鱿鱼/i.test(
        combinedFoodText
      )
    ) {
      return -1000;
    }
  }

  // Strict guardrail for pure "បាយ" / "rice" queries: do not return curries/soups that merely mention "បាយស" in description
  if (
    parsed.categoryIntents.includes('rice') &&
    (parsed.coreQuery === 'បាយ' || parsed.coreQuery === 'rice' || parsed.coreQuery === '米饭')
  ) {
    const isGenuineRiceDish =
      food.categorySlug === 'rice' ||
      /^(?:បាយ|បបរ|ក្រឡាន)|\bfried\s+rice\b|\brice\b|\bporridge\b|\bcongee\b/i.test(titleNorm);
    if (!isGenuineRiceDish) {
      return -500;
    }
  }

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

  // Occasion / mealtime / weather / dietary intent scoring
  if (parsed.occasionIntents && parsed.occasionIntents.length > 0) {
    for (const occ of parsed.occasionIntents) {
      if (occ === 'breakfast') {
        if (/បាយសាច់ជ្រូក|គុយទាវ|នំបញ្ចុក|បបរ|មីគោក|មីទឹក|បាញ់កាញ់|លតឆា|កាហ្វេ/i.test(titleNorm)) {
          score += 295;
        } else if (food.categorySlug === 'noodles' || food.categorySlug === 'rice') {
          score += 210;
        }
      } else if (occ === 'lunch') {
        if (/សម្លម្ជូរ|សម្លកកូរ|អាម៉ុក|ប្រហុកខ្ទិះ|ទឹកគ្រឿង|ឡុកឡាក់|បាយឆា|ឆាម្រះព្រៅ|ត្រីដុត/i.test(titleNorm)) {
          score += 285;
        } else if (food.categorySlug === 'soup' || food.categorySlug === 'stirfry' || food.categorySlug === 'salad') {
          score += 210;
        }
      } else if (occ === 'dinner') {
        if (/សម្ល|ស៊ុប|ស្ងោរជ្រក់|ត្រីដុត|មាន់ដុត|សាច់គោអាំង|ឡុកឡាក់|អាម៉ុក|ក្តាមឆាម្រេច/i.test(titleNorm)) {
          score += 285;
        } else if (food.categorySlug === 'soup' || food.categorySlug === 'grilled' || food.categorySlug === 'stirfry') {
          score += 210;
        }
      } else if (occ === 'rainy') {
        if (/សម្លម្ជូរ|សម្លកកូរ|ស៊ុប|បបរ|ស្ងោរជ្រក់|គុយទាវ|តុំយ៉ាំ|សម្លប្រហុក|សម្លការី/i.test(titleNorm)) {
          score += 305;
        } else if (food.categorySlug === 'soup') {
          score += 245;
        }
      } else if (occ === 'hot_weather') {
        if (/ញាំ|ភ្លា|បុកល្ហុង|បុកស្វាយ|ស្ងោរជ្រក់|ទឹកគ្រឿង|បង្អែម|ទឹកដូង|ទឹកអំពៅ|តែក្រូចឆ្មា/i.test(titleNorm)) {
          score += 290;
        } else if (food.categorySlug === 'salad' || food.categorySlug === 'dessert' || food.categorySlug === 'drink') {
          score += 225;
        }
      } else if (occ === 'healthy') {
        if (/ទឹកគ្រឿង|សម្លប្រហើរ|សម្លកកូរ|ស្ងោរជ្រក់|ញាំ|ចំហុយ|ត្រីដុត|បបរ/i.test(titleNorm)) {
          score += 285;
        }
      } else if (occ === 'vegetarian') {
        if (!/សាច់ជ្រូក|សាច់គោ|សាច់មាន់|ត្រី|បង្គា|ក្តាម|មឹក|ប្រហុក|ផ្អក/i.test(`${titleNorm} ${ingNorm}`)) {
          score += 280;
        }
      } else if (occ === 'general_recommend') {
        if (/អាម៉ុកត្រី|សម្លកកូរ|នំបញ្ចុក|បាយសាច់ជ្រូក|ឡុកឡាក់|សម្លម្ជូរគ្រឿង|គុយទាវ|ប្រហុកខ្ទិះ|ទឹកគ្រឿង|ក្តាមឆាម្រេច/i.test(titleNorm)) {
          score += 290;
        } else if (!isSweetOrBeverageFood(food) && (food.rating || 0) >= 4.8) {
          score += 210;
        }
      }
    }
  }

  // If the user only specified an excluded protein (e.g. "ម្ហូបអត់សាច់ជ្រូក"), reward savory non-excluded dishes
  if (parsed.excludedProteins && parsed.excludedProteins.length > 0 && parsed.isOccasionOnlyQuery) {
    if (!isSweetOrBeverageFood(food)) {
      score += 220;
    }
  }

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

    const activeNonStopTokens = parsed.tokens.filter((t) => t.length >= 2 && !QUERY_STOPWORDS.has(t));
    const hasSpecificSubjectToken = activeNonStopTokens.some(
      (t) => t !== parsed.coreQuery && !GENERIC_COOKING_METHOD_TOKENS.has(t)
    );

    let matchedTokenCount = 0;
    let matchedSpecificSubjectInTitle = false;
    for (const tok of parsed.tokens) {
      if (tok.length < 2 || QUERY_STOPWORDS.has(tok)) continue;
      const isGenericMethod = GENERIC_COOKING_METHOD_TOKENS.has(tok);
      const titleWeight = isGenericMethod && hasSpecificSubjectToken ? 45 : 220;

      if (includesNormalizedKhmerToken(titleNorm, tok)) {
        score += titleWeight;
        matchedTokenCount++;
        if (!isGenericMethod) matchedSpecificSubjectInTitle = true;
      } else if (includesNormalizedKhmerToken(provNorm, tok)) {
        score += 90;
        matchedTokenCount++;
      } else if (includesNormalizedKhmerToken(ingNorm, tok)) {
        score += isGenericMethod ? 20 : 95;
        matchedTokenCount++;
      } else if (includesNormalizedKhmerToken(catNorm, tok) && parsed.flavorIntents.length === 0) {
        score += 45;
        matchedTokenCount++;
      } else if (includesNormalizedKhmerToken(descSafeNorm, tok) && parsed.flavorIntents.length === 0) {
        score += 25;
        matchedTokenCount++;
      }
    }

    // If the user asked for a specific ingredient + cooking method (e.g. "ងាវអាំង"),
    // ensure dishes containing the specific ingredient in their title ("ងាវស្រុះ", "ងាវឆាអំពិលទុំ")
    // always outrank unrelated dishes that only share the cooking method ("ត្រីងៀតអាំង")!
    if (hasSpecificSubjectToken && matchedSpecificSubjectInTitle) {
      score += 260;
    }

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

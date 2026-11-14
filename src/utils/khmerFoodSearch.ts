import { FoodItem } from '../types';
import { getLocalizedFood } from './zhDynamicTranslator';
import { analyzeSearchQuery, scoreSearchRecord, getCulinarySynonyms, SearchableFields } from './searchEngine';
import { detectDishProvince, getProvinceOptionById } from './foodFilters';

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
  'the',
  'in',
  'at',
  'of',
  'by',
  'to',
  'on',
  'for',
  'with',
  'from',
  'and',
  'or',
  'ដឹ',
  'ឌឺ',
  'សណ្ឋាគារ',
  'ផ្ទះសំណាក់',
  'រីសត',
  'បឹងហ្គាឡូ',
  'hotel',
  'hotels',
  'resort',
  'resorts',
  'guesthouse',
  'hostel',
  'motel',
  'bungalow',
  'villa',
  'boutique',
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
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
    // Reorder decomposed Khmer vowel/diacritic & double-subscript sequences typed on mobile keyboards
    .replace(/\u17C1\u17B6/g, '\u17C4') // េ + ា -> ោ
    .replace(/\u17C1\u17B8/g, '\u17BE') // េ + ី -> ើ
    .replace(/\u17C6\u17BB/g, '\u17BB\u17C6') // ំ + ុ -> ុំ
    .replace(/\u17B6\u17C9/g, '\u17C9\u17B6') // ា + ៉ -> ៉ា
    .replace(/\u17B6\u17CA/g, '\u17CA\u17B6') // ា + ៊ -> ៊ា
    .replace(/\u17D2\u179A\u17D2([\u1780-\u1799\u179B-\u17A2])/g, '\u17D2$1\u17D2\u179A') // អង្រ្កង -> អង្ក្រង
    // Normalize common Khmer culinary spelling variations
    .replace(/សម្លរ/g, 'សម្ល')
    .replace(/ស្ងោ(?!រ)/g, 'ស្ងោរ')
    .replace(/ស្ងោរជ្រក(?!់)/g, 'ស្ងោរជ្រក់')
    .replace(/ប្រហើ(?!រ)/g, 'ប្រហើរ')
    .replace(/អាមុក|ហហ្មុក/g, 'អាម៉ុក')
    .replace(/បាញ់ចុក|បញ្ចក់/g, 'បញ្ចុក')
    .replace(/គុយទៀវ/g, 'គុយទាវ')
    .replace(/បាញ់ឆេវ/g, 'បាញ់ឆែវ')
    .replace(/ឡុកឡាក(?!់)/g, 'ឡុកឡាក់')
    .replace(/ការ៉ី/g, 'ការី')
    .replace(/ម្ចូរ|ម្ជូ(?!រ)/g, 'ម្ជូរ')
    .replace(/កកូ(?!រ)/g, 'កកូរ')
    .replace(/ខ្ទឹះ/g, 'ខ្ទិះ')
    .replace(/ហិរ/g, 'ហឹរ')
    .replace(/ត្រយ៉ូង/g, 'ត្រយូង')
    .replace(/ស្រដែក/g, 'សណ្តែក')
    .replace(/ណ្ដ/g, 'ណ្ត')
    .replace(/ក្ដ/g, 'ក្ត')
    .replace(/ផ្ដ/g, 'ផ្ត')
    .replace(/ស្ដ/g, 'ស្ត')
    .replace(/ម្ដ/g, 'ម្ត')
    .replace(/ប្ដ/g, 'ប្ត')
    .replace(/ឧត្ដ/g, 'ឧត្ត')
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
    .replace(/ឆ្អឹងជំនី(?!រ)/g, 'ឆ្អឹងជំនីរ')
    .replace(/ងាំង៉ូវ/g, 'ង៉ាំង៉ូវ')
    .replace(/សាឡាត់/g, 'សាឡាដ')
    .replace(/ផាកឡូវ/g, 'ផាក់ឡូវ')
    .replace(/មុំា|មំា/g, 'ម៉ាំ')
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
  if (!t || !hay.includes(t)) return false;
  let effectiveHay = hay;
  if (t === 'ត្រី') effectiveHay = hay.replace(/ទឹកត្រី/g, ' ');
  else if (t === 'fish') effectiveHay = hay.replace(/fish\s+sauce/g, ' ');
  else if (t === '鱼') effectiveHay = hay.replace(/鱼露|鱼酱/g, ' ');
  else if (t === 'គោ' || t === 'beef') effectiveHay = hay.replace(/ទឹកដោះគោ/g, ' ');
  else if (t === 'ខ្យង' || t === 'oyster') effectiveHay = hay.replace(/ប្រេងខ្យង|oyster\s+sauce/g, ' ');
  let idx = effectiveHay.indexOf(t);
  const isShortLatin = /^[a-z]{2,4}$/.test(t);
  while (idx !== -1) {
    const prevCode = idx > 0 ? effectiveHay.charCodeAt(idx - 1) : 0;
    const nextIdx = idx + t.length;
    const prevIsLatin = idx > 0 && /[a-z0-9]/i.test(effectiveHay[idx - 1]);
    const nextIsLatin = nextIdx < effectiveHay.length && /[a-z0-9]/i.test(effectiveHay[nextIdx]);
    if (prevCode !== 0x17d2 && (!isShortLatin || (!prevIsLatin && !nextIsLatin))) {
      return true;
    }
    idx = effectiveHay.indexOf(t, idx + 1);
  }
  return false;
}

export const includesKhmerToken = includesNormalizedKhmerToken;

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
  'ប្រហុកចំហុយ',
  'ប្រហុកខ្ទិះ',
  'ប្រហុកដុត',
  'ប្រហុកអាំង',
  'ប្រហុកកប់',
  'ប្រហុក',
  'ផ្អកចំហុយ',
  'ផ្អក',
  'ម៉ាំចំហុយ',
  'ម៉ាំ',
  'ទឹកគ្រឿង',
  'កាពិផាវ',
  'កាពិ',
  'ឆាម្រះព្រៅ',
  'ឆាខាត់ណា',
  'ឆាក្តៅ',
  'ស្ងោរជ្រក់',
  'ចំហុយ',
  'អប់',
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
  'ត្រីក្រាញ់',
  'ត្រីឆ្ពិន',
  'ត្រីប្រា',
  'ត្រីឆ្លាំង',
  'ត្រីកេះ',
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
  'អង្ក្រង',
  'ស្តៅ',
  'ត្រួយអំពិល',
  'ផ្កាស្នោ',
  'កញ្ឆែត',
  'ក្រអៅឈូក',
  'ត្រយូងចេក',
  'ស្លឹកម្រុំ',
  'ស្លឹកញ',
  'ព្រលិត',
  'ខាត់ណា',
  'ត្រកួន',
  'អំពិលទុំ',
  'ង៉ាំង៉ូវ',
  'អន្សម',
  'នំគម',
  'នំអាកោ',
  'ក្រឡាន',
  'សង់ខ្យាល្ពៅ',
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
  'កំពង់សោម',
  'បាញ់ឆែវ',
  'បាញ់ហយ',
  'បាញ់កាញ់',
  'បាញ់ស៊ុង',
  'នំគ្រក់',
  'នំកាឆាយ',
  'នំគូឆាយ',
  'នំត្រាវ',
  'ចេកខ្ទិះ',
  'ចេកចៀន',
  'សង់ខ្យា',
  'បបរគ្រឿង',
  'បបរស',
  'បបរត្រី',
  'បបរមាន់',
  'មីឆា',
  'មីគោក',
  'មីស៊ុប',
  'មីសួរ',
  'មីកូឡា',
  'មី',
  'ហ្វឺ',
  'គុយទាវទូក',
  'គុយទាវខ',
  'ខគោ',
  'ខជើងជ្រូក',
  'ខសាច់ជ្រូក',
  'ខត្រី',
  'ផាក់ឡូវ',
  'ឆាខ្ញី',
  'ឆាគ្រឿង',
  'ឆាត្រកួន',
  'ឆាត្រប់',
  'ឆាផ្សិត',
  'ឆាបន្លែ',
  'ឆាជូរផ្អែម',
  'ស្ងោរម្រះ',
  'ស្ងោរទំពាំង',
  'ស្ងោរត្រឡាច',
  'ភ្លាសាច់គោ',
  'ញាំមីសួរ',
  'ញាំស្វាយ',
  'ញាំផ្កាចេក',
  'បង្កង',
  'កំពិស',
  'គ្រំ',
  'អយស្ទ័រ',
  'ពងទាកូន',
  'ពងទា',
  'សាច់ក្រក',
  'ងៀតគោ',
  'គោងៀត',
  'បាយមាន់',
  'បាយក្តាំង',
  'បាយដំណើប',
  'នំប៉័ងប៉ាតេ',
  'នំប៉័ង',
  'តៅហ៊ូ',
  'ម្ហូបបួស',
  'បួស',
  'ទឹកដូង',
  'ទឹកអំពៅ',
  'ទឹកត្នោត',
  'ទឹកសណ្តែក',
  'ទឹកក្រឡុក',
  'កាហ្វេ',
  'តែក្រូចឆ្មា',
  'តែបៃតង',
  'ដុត',
  'បំពង',
  'ចៀន',
  'ស្ងោរ',
  'បុក',
  'ការី',
  'ម្ជូរ',
  'កកូរ',
  'ប្រហើរ',
  'ជ្រូក',
  'គោ',
  'មាន់',
  'ទា',
  'បន្លែ',
  'ផ្សិត',
  'ទំពាំង',
  'ម្រះព្រៅ',
  'ម្រះ',
  'ត្រប់',
  'ត្រឡាច',
  'ល្ពៅ',
  'ត្រាវ',
  'ល្ហុង',
  'ដូង',
  'ខ្ទិះដូង',
  'ខ្ទិះ',
  'ខ្ញី',
  'ម្រេច',
  'ស្លឹកគ្រៃ',
  'ក្រូចឆ្មា',
  'អំពិល',
  'សណ្តែក',
  'ស្វាយ',
  'ចេក',
  'ធុរេន',
  'បឺរ',
  'ប្រហិត',
].sort((a, b) => b.length - a.length);

const KNOWN_ZH_FOOD_SUBTOKENS = [
  '高棉阿莫克', '阿莫克', '摇滚牛肉', '牛肉粒', '禄拉克', '禄叻',
  '金边粿条', '粿条', '高棉米粉', '高棉米线', '鱼汤米线', '咖喱米线', '米粉', '米线', '河粉',
  '炒银针粉', '银针粉', '歌拉米粉', '歌拉面', '粗米粉', '木薯粉', '粉丝', '冬粉',
  '船面', '云吞面', '干拌面', '炒面', '炒粉', '汤面', '面条', '面',
  '烤猪肉饭', '猪肉饭', '海南鸡饭', '鸡油饭', '鸡饭', '蟹肉炒饭', '蛋炒饭', '炒饭', '竹筒糯米饭', '竹筒饭', '糯米饭', '碎米饭', '米饭', '饭',
  '养生米粥', '养生粥', '鱼片粥', '鱼粥', '鸡粥', '肉粥', '米粥', '白粥', '粥',
  '百蔬浓汤', '什锦蔬菜浓汤', '酸笋汤', '酸鱼汤', '酸牛肉汤', '酸柑鸡汤', '咸柠檬汤', '苦瓜清汤', '苦瓜汤', '冬瓜汤', '草本养生汤', '草本汤', '养生汤',
  '高棉酸汤', '香茅酸汤', '酸汤', '浓汤', '清汤', '热汤', '火锅', '汤',
  '萨拉曼咖喱', '红咖喱', '黄咖喱', '高棉咖喱', '咖喱',
  '波罗福', '发酵鱼酱', '臭鱼酱', '高棉鱼酱', '鱼酱', '蘸酱',
  '青木瓜沙拉', '木瓜沙拉', '生拌牛肉', '生春卷', '炸春卷', '春卷',
  '姜黄煎饼', '高棉煎饼', '小煎饼', '小米饼', '煎饼', '韭菜粿',
  '法棍三明治', '法棍', '三明治', '长筒粽', '香蕉粽', '肉粽', '高棉粽', '粽',
  '南瓜布丁', '南瓜炖蛋', '蒸布丁', '布丁', '西米露', '汤圆', '冰淇淋', '甜品', '甜点', '糕点', '小吃',
  '冰咖啡', '咖啡', '珍珠奶茶', '奶茶', '柠檬茶', '冰红茶', '甘蔗汁', '椰子水', '青椰', '豆浆', '冰沙', '奶昔', '饮品', '饮料',
  '牛肉干', '牛肉丸', '牛腩', '牛肚', '牛肉',
  '五花肉', '猪蹄', '猪脚', '排骨', '猪杂', '猪肉', '腊肠', '香肠',
  '走地鸡', '土鸡', '烤鸡', '鸡肉', '鸡杂', '鸡翅', '鸡',
  '烤鸭', '咸鸭蛋', '毛鸭蛋', '毛蛋', '鸭蛋', '鸭肉', '鸭',
  '黑鱼', '生鱼', '鲶鱼', '湄公鱼', '河鱼', '鲜鱼', '鱼干', '烟熏鱼', '炸鱼', '烤鱼', '鱼丸', '鱼',
  '蓝蟹', '花蟹', '田蟹', '石蟹', '胡椒蟹', '螃蟹', '蟹肉', '蟹',
  '大头虾', '河虾', '海虾', '鲜虾', '大虾', '虾米', '虾',
  '烤鱿鱼', '鱿鱼', '墨鱼', '蛤蜊', '花甲', '河蚬', '血蚶', '青口', '生蚝', '田螺', '海鲜', '河鲜', '田鸡', '青蛙', '鳝鱼', '鳗鱼',
  '贡布胡椒', '青胡椒', '黑胡椒', '胡椒', '香茅', '九层塔', '罗勒', '青柠', '罗望子', '椰浆', '椰奶', '椰丝', '椰香', '椰子',
  '棕榈糖', '蜂蜜', '花生', '大蒜', '蒜蓉', '鲜姜', '子姜', '姜', '辣椒',
  '空心菜', '西兰花', '花椰菜', '苦瓜', '冬瓜', '茄子', '竹笋', '酸笋', '鲜笋',
  '杏鲍菇', '草菇', '鲜菇', '蘑菇', '腐乳', '豆腐', '莲子', '睡莲', '香蕉花', '芭蕉', '香蕉', '青芒果', '芒果', '木瓜', '南瓜', '金瓜', '芋头', '香芋', '牛油果', '火龙果', '甜柚', '柚子',
  '素食', '蔬菜', '时蔬',
  '炭烤', '烧烤', '烤肉', '盐焗', '脆皮', '香煎', '酥炸', '爆炒', '热炒', '小炒', '清蒸', '红烧', '凉拌', '沙拉', '酸辣', '香辣', '麻辣', '烤', '炒', '炸', '蒸',
  '金边', '暹粒', '吴哥', '马德望', '贡布', '白马', '西哈努克', '西港', '国公', '戈公', '蒙多基里', '腊塔纳基里', '磅湛', '磅同', '磅清扬', '磅士卑', '菩萨', '波罗勉', '柴桢', '茶胶', '干丹', '桔井', '上丁', '柏威夏', '班迭棉吉', '奥多棉吉', '拜林', '特本克蒙',
].sort((a, b) => b.length - a.length);

const GENERIC_COOKING_METHOD_TOKENS = new Set<string>([
  'សម្ល',
  'ស៊ុប',
  'ស្ងោរ',
  'ឆា',
  'លីង',
  'អាំង',
  'ដុត',
  'បំពង',
  'ចៀន',
  'ចំហុយ',
  'ស្រុះ',
  'អប់',
  'ញាំ',
  'ភ្លា',
  'បុក',
  'ជ្រក់',
  'ខ',
  'soup',
  'grilled',
  'grill',
  'roast',
  'roasted',
  'fried',
  'stir',
  'fry',
  'steamed',
  'boiled',
  'braised',
  'salad',
  '炭烤',
  '烧烤',
  '爆炒',
  '热炒',
  '小炒',
  '清蒸',
  '红烧',
  '凉拌',
  '沙拉',
  '烤',
  '炒',
  '炸',
  '蒸',
  '汤',
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

  // Decompose continuous unspaced Khmer & Chinese strings into non-overlapping culinary subtokens
  const expandedTokens: string[] = [];
  for (const rt of rawTokens) {
    if (/^[a-z0-9]+$/i.test(rt)) {
      expandedTokens.push(rt);
      continue;
    }
    const isCjk = /[\u3400-\u9FFF]/.test(rt);
    const dict = isCjk ? KNOWN_ZH_FOOD_SUBTOKENS : KNOWN_KHMER_FOOD_SUBTOKENS;
    let rem = rt;
    const parts: string[] = [];
    for (const sub of dict) {
      if (rem.includes(sub)) {
        parts.push(sub);
        rem = rem.split(sub).join(' ').trim();
      }
    }
    const leftovers = rem.split(/\s+/).filter((x) => x.length >= (isCjk ? 1 : 2) && !QUERY_STOPWORDS.has(x));
    if (parts.length >= 2 || (parts.length === 1 && leftovers.length >= 1)) {
      expandedTokens.push(...parts, ...leftovers);
    } else {
      expandedTokens.push(rt);
      for (const p of parts) {
        if (p !== rt) expandedTokens.push(p);
      }
    }
  }
  rawTokens.length = 0;
  for (const et of expandedTokens) {
    if (et && !rawTokens.includes(et)) rawTokens.push(et);
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
interface PrecomputedFoodSearchIndex {
  nameKhNorm: string;
  nameEnNorm: string;
  nameZhNorm: string;
  titleNorm: string;
  catNorm: string;
  provNorm: string;
  ingNorm: string;
  descSafeNorm: string;
  isBeverage: boolean;
  isSweetOrBeverage: boolean;
  headwordMask: number;
  searchFields: SearchableFields;
}

const foodSearchIndexWeakCache = new WeakMap<FoodItem, PrecomputedFoodSearchIndex>();

export function getPrecomputedFoodSearchIndex(food: FoodItem): PrecomputedFoodSearchIndex {
  const cached = foodSearchIndexWeakCache.get(food);
  if (cached) return cached;

  const zhLoc = getLocalizedFood(food, 'zh');
  let provKh = food.provinceKh || '';
  let provFullKh = '';
  let provEn = food.provinceEn || '';
  let provZh = zhLoc.province || '';
  try {
    const pid = detectDishProvince(food);
    if (pid) {
      const pOpt = getProvinceOptionById(pid);
      if (pOpt) {
        provKh = `${provKh} ${pOpt.kh}`;
        provFullKh = pOpt.fullKh;
        provEn = `${provEn} ${pOpt.en}`;
        provZh = `${provZh} ${pOpt.zh}`;
      }
    }
  } catch {
    // ignore if province lookup not ready
  }

  const nameKhNorm = normalizeKhmerFoodText(food.nameKh || '');
  const nameEnNorm = normalizeKhmerFoodText(food.nameEn || '');
  const nameZhNorm = normalizeKhmerFoodText(`${zhLoc.name || ''} ${food.nameZh || ''}`);
  const titleNorm = `${nameKhNorm} ${nameEnNorm} ${nameZhNorm}`.trim();
  const catNorm = normalizeKhmerFoodText(
    `${food.categoryKh || ''} ${food.categoryEn || ''} ${food.categorySlug || ''} ${zhLoc.category || ''}`
  );
  const provNorm = normalizeKhmerFoodText(`${provKh} ${provFullKh} ${provEn} ${provZh}`);
  const ingList = [
    ...(food.ingredients || []).map((i) => `${i.nameKh || ''} ${i.nameEn || ''} ${(i as any).nameZh || ''}`),
    ...(food.ingredientsKh || []),
    ...(food.ingredientsEn || []),
    ...(zhLoc.ingredients || []).map((i) => i.name),
  ];
  const ingNorm = normalizeKhmerFoodText(ingList.join(' '));
  const descSafeNorm = stripNegatedSpicePhrases(
    `${food.descriptionKh || ''} ${food.descriptionEn || ''} ${zhLoc.description || ''} ${food.tasteProfile || ''}`
  );

  const searchFields: SearchableFields = {
    names: [food.nameKh, food.nameEn, zhLoc.name, food.nameZh],
    categories: [food.categoryKh, food.categoryEn, zhLoc.category, food.categorySlug],
    locations: [food.provinceKh, food.provinceEn, zhLoc.province, provKh, provFullKh, provEn, provZh],
    texts: [
      food.descriptionKh,
      food.descriptionEn,
      zhLoc.description,
      food.tasteProfile,
      ...ingList,
    ],
  };

  const isBeverage =
    food.categorySlug === 'drink' ||
    /^(?:ទឹកសណ្តែក|ទឹកអំពៅ|ទឹកដូង|ទឹកត្នោត|កាហ្វេ|តែក្រូចឆ្មា|តែបៃតង|ទឹកក្រឡុក|ទឹកត្រឡាច|ភេសជ្ជៈ)/.test(nameKhNorm);
  const isSweetOrBeverage =
    isBeverage ||
    food.categorySlug === 'dessert' ||
    food.categorySlug === 'cake' ||
    BEVERAGE_OR_SWEET_NAME_RE.test(nameKhNorm);

  let headwordMask = 0;
  for (let i = 0; i < SIGNATURE_DISH_HEADWORD_GROUPS.length; i++) {
    const hwGroup = SIGNATURE_DISH_HEADWORD_GROUPS[i];
    if (hwGroup.some((hw) => includesNormalizedKhmerToken(titleNorm, hw) || includesNormalizedKhmerToken(catNorm, hw))) {
      headwordMask |= 1 << i;
    }
  }

  const entry: PrecomputedFoodSearchIndex = {
    nameKhNorm,
    nameEnNorm,
    nameZhNorm,
    titleNorm,
    catNorm,
    provNorm,
    ingNorm,
    descSafeNorm,
    isBeverage,
    isSweetOrBeverage,
    headwordMask,
    searchFields,
  };
  foodSearchIndexWeakCache.set(food, entry);
  return entry;
}

interface CompiledTokenPlan {
  tok: string;
  variants: string[];
  cjkChars: string[] | null;
  isGenericMethod: boolean;
}

const compiledTokenPlanCache = new Map<string, CompiledTokenPlan>();

function getCompiledTokenPlan(token: string): CompiledTokenPlan {
  const existing = compiledTokenPlanCache.get(token);
  if (existing) return existing;
  const syns = getCulinarySynonyms(token).filter((s) => s.length >= 2);
  const variants = Array.from(new Set([token, ...syns]));
  let cjkChars: string[] | null = null;
  if (/[\u3400-\u9FFF]/.test(token) && token.length >= 2 && token.length <= 6) {
    const chars = Array.from(token).filter((c) => /[\u3400-\u9FFF]/.test(c));
    if (chars.length >= 2) cjkChars = chars;
  }
  const plan: CompiledTokenPlan = {
    tok: token,
    variants,
    cjkChars,
    isGenericMethod: GENERIC_COOKING_METHOD_TOKENS.has(token),
  };
  if (compiledTokenPlanCache.size > 2000) compiledTokenPlanCache.clear();
  compiledTokenPlanCache.set(token, plan);
  return plan;
}

function matchesFieldWithPlan(fieldNorm: string, plan: CompiledTokenPlan): boolean {
  if (!fieldNorm) return false;
  for (let i = 0; i < plan.variants.length; i++) {
    if (includesNormalizedKhmerToken(fieldNorm, plan.variants[i])) {
      return true;
    }
  }
  if (plan.cjkChars) {
    for (let i = 0; i < plan.cjkChars.length; i++) {
      if (!fieldNorm.includes(plan.cjkChars[i])) return false;
    }
    return true;
  }
  return false;
}

const SIGNATURE_DISH_HEADWORD_GROUPS: string[][] = [
  ['អាម៉ុក', 'amok', 'ah mok', 'homok', '阿莫克'],
  ['ឡុកឡាក់', 'lok lak', 'loklak', 'luc lac', '禄叻', '禄拉克', '摇滚牛肉'],
  ['គុយទាវ', 'kuy teav', 'kuyteav', 'koay teow', '粿条'],
  ['នំបញ្ចុក', 'num banh chok', 'nom banh chok', 'banh chok', '高棉米粉', '高棉米线', '鱼汤米线', '咖喱米线'],
  ['លតឆា', 'lort cha', 'lot cha', '银针粉', '炒银针粉'],
  ['មីកូឡា', 'mee kola', 'mi kola', '歌拉面', '歌拉米粉'],
  ['បាញ់ឆែវ', 'banh chao', 'banh xeo', '姜黄煎饼', '高棉煎饼'],
  ['នំគ្រក់', 'num krok', 'nom krok', '椰浆小米饼', '小米饼'],
  ['ក្រឡាន', 'kralan', 'krolan', 'bamboo sticky rice', '竹筒饭', '竹筒糯米饭'],
  ['សង់ខ្យា', 'sangkhya', 'sankhya', 'pumpkin custard', '南瓜布丁', '南瓜炖蛋'],
  ['កកូរ', 'samlor korko', 'somlor korko', 'korko', '百蔬浓汤', '什锦蔬菜浓汤'],
  ['ប្រហើរ', 'samlor proher', 'somlor proher', 'proher', 'praher', '草本浓汤', '草本养生汤'],
  ['ង៉ាំង៉ូវ', 'ngam ngov', 'ngam ngouv', '咸柠檬汤', '酸柑鸡汤'],
  ['បុកល្ហុង', 'bok lhong', 'bok lahong', 'papaya salad', '木瓜沙拉', '青木瓜沙拉'],
  ['ពងទាកូន', 'pong tea kon', 'balut', '毛蛋', '蒸毛蛋', '毛鸭蛋'],
];

export function scoreFoodForKhmerQuery(food: FoodItem, parsed: ParsedKhmerFoodQuery): number {
  if (!parsed.normalizedQuery) return 0;

  const idx = getPrecomputedFoodSearchIndex(food);
  const { nameKhNorm, nameEnNorm, nameZhNorm, titleNorm, catNorm, provNorm, ingNorm, descSafeNorm } = idx;

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

    // Headword guardrail: if the query explicitly asks for a signature dish family (e.g. "fish amok", "beef lok lak", "គុយទាវសាច់គោ", "阿莫克鱼"),
    // require the dish to belong to that signature dish family so random fish/beef dishes don't flood specific dish searches.
    let requiredHeadwordMask = (parsed as any)._headwordMask as number | undefined;
    if (requiredHeadwordMask === undefined) {
      requiredHeadwordMask = 0;
      for (let i = 0; i < SIGNATURE_DISH_HEADWORD_GROUPS.length; i++) {
        const hwGroup = SIGNATURE_DISH_HEADWORD_GROUPS[i];
        if (hwGroup.some((hw) => includesNormalizedKhmerToken(qCore, hw) || parsed.tokens.includes(hw))) {
          requiredHeadwordMask |= 1 << i;
        }
      }
      (parsed as any)._headwordMask = requiredHeadwordMask;
    }
    if (requiredHeadwordMask !== 0 && (idx.headwordMask & requiredHeadwordMask) !== requiredHeadwordMask) {
      return 0;
    }

    if (qCore.length >= 1) {
      const corePlan = getCompiledTokenPlan(qCore);
      if (nameKhNorm === qCore || nameEnNorm === qCore || nameZhNorm === qCore) {
        score += 460;
      } else if (nameKhNorm.startsWith(qCore) || nameEnNorm.startsWith(qCore) || nameZhNorm.startsWith(qCore)) {
        score += 380;
      } else if (matchesFieldWithPlan(titleNorm, corePlan)) {
        score += 290;
      } else if (matchesFieldWithPlan(provNorm, corePlan)) {
        score += 200;
      } else if (matchesFieldWithPlan(ingNorm, corePlan)) {
        score += 150;
      } else if (matchesFieldWithPlan(catNorm, corePlan)) {
        score += 120;
      } else if (matchesFieldWithPlan(descSafeNorm, corePlan)) {
        score += 75;
      }
    }

    let tokenPlans = (parsed as any)._tokenPlans as CompiledTokenPlan[] | undefined;
    if (!tokenPlans) {
      tokenPlans = parsed.tokens
        .filter((t) => (t.length >= 2 || /[\u3400-\u9FFF]/.test(t)) && !QUERY_STOPWORDS.has(t))
        .map(getCompiledTokenPlan);
      (parsed as any)._tokenPlans = tokenPlans;
    }
    const hasSpecificSubjectToken = tokenPlans.some((p) => !p.isGenericMethod);

    let matchedTokenCount = 0;
    let matchedInTitleCount = 0;
    let matchedSpecificSubjectInTitle = false;
    let matchedAnySpecificSubject = false;

    for (let i = 0; i < tokenPlans.length; i++) {
      const plan = tokenPlans[i];
      const isGenericMethod = plan.isGenericMethod;
      const titleWeight = isGenericMethod && hasSpecificSubjectToken ? 55 : 225;

      if (matchesFieldWithPlan(titleNorm, plan)) {
        score += titleWeight;
        matchedTokenCount++;
        matchedInTitleCount++;
        if (!isGenericMethod) {
          matchedSpecificSubjectInTitle = true;
          matchedAnySpecificSubject = true;
        }
      } else if (matchesFieldWithPlan(provNorm, plan)) {
        score += 110;
        matchedTokenCount++;
        if (!isGenericMethod) matchedAnySpecificSubject = true;
      } else if (matchesFieldWithPlan(ingNorm, plan)) {
        score += isGenericMethod ? 20 : 115;
        matchedTokenCount++;
        if (!isGenericMethod) matchedAnySpecificSubject = true;
      } else if (matchesFieldWithPlan(catNorm, plan) && parsed.flavorIntents.length === 0) {
        score += 65;
        matchedTokenCount++;
      } else if (matchesFieldWithPlan(descSafeNorm, plan) && parsed.flavorIntents.length === 0) {
        score += 35;
        matchedTokenCount++;
        if (!isGenericMethod) matchedAnySpecificSubject = true;
      }
    }

    // If the user specified a concrete subject (e.g. "សម្លសាច់គោ", "ត្រីអាំង", "grilled beef", "牛肉汤")
    // and the dish ONLY matched the generic cooking method ("សម្ល", "អាំង", "grilled", "汤") without matching the subject, reject it!
    if (hasSpecificSubjectToken && !matchedAnySpecificSubject && parsed.flavorIntents.length === 0 && parsed.categoryIntents.length === 0) {
      return 0;
    }

    if (hasSpecificSubjectToken && matchedSpecificSubjectInTitle) {
      score += 260;
    }

    if (tokenPlans.length > 1) {
      if (matchedInTitleCount === tokenPlans.length) {
        score += 240;
      } else if (matchedTokenCount === tokenPlans.length) {
        score += 120;
      } else if (matchedTokenCount === 0 && score === 0) {
        return 0;
      }
    }
  }

  // Never let generic drink items match a non-drink savory search purely from incidental description words
  if (!parsed.isDrinkExplicitlyRequested && idx.isBeverage && score < 200) {
    return 0;
  }

  return score;
}

/**
 * Searches and ranks FoodItem[] accurately for any Khmer, English, or Chinese query.
 * Deduplicates by food ID and normalized Khmer name so zero duplicate items are ever returned.
 */
export function searchKhmerFoods(foods: FoodItem[], rawQuery: string): FoodItem[] {
  const parsed = parseKhmerFoodSearchQuery(rawQuery);
  if (!parsed.normalizedQuery) return [];

  // Do not return food dishes when the user explicitly searches for a hotel / resort / guesthouse
  if (
    /(?:\bhotel\b|\bhotels\b|\bresort\b|\bresorts\b|\bguesthouse\b|\bhostel\b|\bbungalow\b|\bmotel\b|សណ្ឋាគារ|ផ្ទះសំណាក់|រីសត|បឹងហ្គាឡូ)/i.test(
      rawQuery
    ) &&
    parsed.flavorIntents.length === 0 &&
    parsed.categoryIntents.length === 0
  ) {
    return [];
  }

  const scored: Array<{ food: FoodItem; score: number }> = [];
  const nameQa = parsed.isFlavorOnlyQuery ? null : analyzeSearchQuery(rawQuery);
  const requireDistinctiveMatch =
    Boolean(nameQa && nameQa.distinctive.length > 0) &&
    parsed.flavorIntents.length === 0 &&
    parsed.categoryIntents.length === 0 &&
    (!parsed.occasionIntents || parsed.occasionIntents.length === 0);

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  const dedupedFoods: FoodItem[] = [];
  for (const food of foods) {
    if (!food || !food.id || !food.nameKh) continue;
    const idKey = String(food.id);
    const idx = getPrecomputedFoodSearchIndex(food);
    const nameKey = idx.nameKhNorm;
    if (seenIds.has(idKey) || (nameKey && seenNames.has(nameKey))) continue;
    seenIds.add(idKey);
    if (nameKey) seenNames.add(nameKey);
    dedupedFoods.push(food);
  }

  const checkProvinceOnlyFalsePositive =
    requireDistinctiveMatch && Boolean(nameQa && nameQa.provinces.length > 0 && nameQa.distinctive.length > 0);

  for (const food of dedupedFoods) {
    let score = scoreFoodForKhmerQuery(food, parsed);
    if (score >= 55 && score < 250 && checkProvinceOnlyFalsePositive && nameQa) {
      const idx = getPrecomputedFoodSearchIndex(food);
      const detail = scoreSearchRecord(nameQa, idx.searchFields);
      if (detail.score === 0) {
        score = 0;
      }
    }
    if (score >= 55) {
      scored.push({ food, score });
    }
  }

  // Typo-tolerant fallback: only invoke fuzzy Levenshtein record scoring if direct + trilingual synonym search found 0 matches,
  // and require the fuzzy match to occur in the dish NAME (detail.matchedInName) so gibberish words never match random descriptions.
  if (scored.length === 0 && nameQa && nameQa.distinctive.length > 0) {
    for (const food of dedupedFoods) {
      const idx = getPrecomputedFoodSearchIndex(food);
      const detail = scoreSearchRecord(nameQa, {
        names: idx.searchFields.names,
        categories: idx.searchFields.categories,
        locations: idx.searchFields.locations,
      });
      if (detail.matchedInName && detail.score >= 240) {
        scored.push({ food, score: 60 + Math.round(detail.score * 0.35) });
      }
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

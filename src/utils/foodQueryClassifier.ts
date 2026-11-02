/**
 * Pure (dependency-free) helpers that decide WHAT KIND of message the user sent, so the food assistant
 * never mistakes a question / criteria sentence for a dish name (e.g. "សម្លដែលមានជាតិស្ករតិច" = "soups that
 * are low in sugar" must NOT become a fake dish called "សម្លដែលមានជាតិស្ករតិច" with a random photo).
 *
 * Deliberately free of imports from services/components so it can be unit-tested in isolation and
 * shared by the offline rules engine and the live LLM engine.
 */

export type ReplyLanguage = 'km' | 'en' | 'zh';

/** Ordinary dish names never contain these: relative pronoun, question words, sentence particles (Khmer). */
const KHMER_QUESTION_MARKERS =
  /ដែល|តើ|អ្វីខ្លះ|អ្វី(?![\u17B6-\u17D3])|ម៉េច|ម្តេច|ម្ដេច|យ៉ាងណា|យ៉ាងម៉េច|ហេតុអ្វី|ព្រោះអី|ប៉ុន្មាន|ពេលណា|ទៅណា|នៅណា|អ្នកណា|ឬទេ|ឬអត់|មានអត់|ឆ្ងាញ់អត់|ជាមួយអ្វី|ញ៉ាំជាមួយ|ផឹកជាមួយ|ត្រូវនឹង|ល្អជាង|ល្អបំផុត|ឆ្ងាញ់ជាង|ខុសគ្នា|ដូចគ្នា|ប្រៀបធៀប|អាចទុក|ទុកបាន|រក្សាទុក|ទូទឹកកក|ផុតកំណត់|ខូចទេ|សុវត្ថិភាព|ប្រវត្តិ|ដើមកំណើត|មកពីណា|កើតមកពី|វប្បធម៌|អត្ថន័យ|កាឡូរី|អាហារូបត្ថម្ភ|វីតាមីន|ប្រូតេអ៊ីន|ជាតិស្ករ|ជាតិប្រៃ|ជាតិខ្លាញ់|មានជាតិ|ស្ករតិច|ខ្លាញ់តិច|ប្រេងតិច|ប្រៃតិច|ហឹរតិច|កាឡូរីទាប|កាឡូរីតិច|គ្មានស្ករ|មិនផ្អែម|ផ្អែមតិច/;

const EN_QUESTION_FRAME = /\b(?:how|what|whats|what's|why|which|where|when|who|can|could|should|would|is|are|was|were|does|do|did|will|difference|between|compare|versus|vs|healthy|healthier|best|better|worse|safe|expire|expires|store|storage|keep|fridge|refrigerat\w*|freez\w*|reheat\w*|leftover\w*|origin|history|culture|pair|pairs|pairing|goes\s+with|calories?|nutrition\w*|protein|carbs?|fat|sodium|vitamin\w*|low|high|less|more|without|free|substitute|replace)\b/i;

const ZH_QUESTION_MARKERS =
  /吗|呢|什么|怎么|如何|为什么|为何|哪个|哪种|哪些|哪家|是否|可以|能不能|能否|多久|多少|热量|卡路里|营养|蛋白质|碳水|保存|储存|冷藏|冷冻|隔夜|历史|起源|由来|文化|搭配|区别|差别|比较|对比|低糖|少糖|无糖|少油|低脂|低盐|清淡|健康|好吃吗/;

/**
 * FACT-type questions (nutrition, storage / food safety, origin / history, "why", pairing, substitution...).
 * These need real reasoning, so the offline rules engine must NOT answer them with a dish card.
 * (Generic "what should I eat?" / "which dish is spicy?" requests are recommendations, not facts.)
 */
const KHMER_KNOWLEDGE_MARKERS =
  /ហេតុអ្វី|ព្រោះអី|ប៉ុន្មានថ្ងៃ|ប៉ុន្មានម៉ោង|ប៉ុន្មានខែ|ជាមួយអ្វី|ផឹកជាមួយ|ប្រៀបធៀបជាមួយ|ខុសគ្នា|ដូចគ្នា|អាចទុក|ទុកបាន|ទុកបានប៉ុន្មាន|រក្សាទុក|ទូទឹកកក|ផុតកំណត់|ខូចទេ|សុវត្ថិភាព|ប្រវត្តិ|ដើមកំណើត|មកពីណា|កើតមកពី|វប្បធម៌|អត្ថន័យ|កាឡូរី|អាហារូបត្ថម្ភ|វីតាមីន|ប្រូតេអ៊ីន|ជាតិស្ករប៉ុន្មាន|ជាតិប្រៃប៉ុន្មាន|ជាតិខ្លាញ់ប៉ុន្មាន|ជំនួសដោយ|ប្រើអ្វីជំនួស/;

const KHMER_KNOWLEDGE_MARKERS_GLOBAL = new RegExp(KHMER_KNOWLEDGE_MARKERS.source, 'g');

const EN_KNOWLEDGE_FRAME =
  /\b(?:why|how\s+long|how\s+many|how\s+much|difference|between|versus|vs|healthier|safe\s+to|expire|expires|store|storage|keep|fridge|refrigerat\w*|freez\w*|reheat\w*|leftover\w*|origin|origins|history|culture|pair|pairing|goes\s+with|calories?|nutrition\w*|protein|carbs?|sodium|vitamin\w*|substitute|replace|alternative\s+to)\b/i;

const ZH_KNOWLEDGE_MARKERS =
  /为什么|为何|多久|多少|热量|卡路里|营养|蛋白质|碳水|保存|储存|冷藏|冷冻|隔夜|历史|起源|由来|文化|搭配|区别|差别|替代|代替/;

/** Message looks like a sentence/question or a "with-constraint" request instead of a bare dish name. */
export function isQuestionOrCriteriaQuery(text: string): boolean {
  const s = (text || '').trim();
  if (!s) return false;
  if (/[?？]/.test(s)) return true;
  if (KHMER_QUESTION_MARKERS.test(s)) return true;
  if (ZH_QUESTION_MARKERS.test(s)) return true;
  const latin = s.replace(/[\u1780-\u17FF\u4E00-\u9FFF]/g, ' ');
  const words = latin.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (words.length >= 2 && EN_QUESTION_FRAME.test(latin)) return true;
  // A real dish name (even in English) is short; a long run of words is a sentence.
  if (words.length > 7) return true;
  return false;
}

/** Message asks for FACTS (not a dish): nutrition, storage, origin, pairing, substitution, "why"... */
export function isKnowledgeQuestion(text: string): boolean {
  const s = (text || '').trim();
  if (!s) return false;
  if (KHMER_KNOWLEDGE_MARKERS.test(s)) return true;
  if (ZH_KNOWLEDGE_MARKERS.test(s)) return true;
  const latin = s.replace(/[\u1780-\u17FF\u4E00-\u9FFF]/g, ' ');
  return EN_KNOWLEDGE_FRAME.test(latin);
}

/**
 * Language the assistant must answer in: the language the USER wrote, falling back to the app language.
 * (A Khmer dish name inside an English sentence must not flip the answer to Khmer.)
 */
export function detectReplyLanguage(text: string, uiLanguage: ReplyLanguage = 'km'): ReplyLanguage {
  const s = text || '';
  const km = (s.match(/[\u1780-\u17FF]/g) || []).length;
  const zh = (s.match(/[\u4E00-\u9FFF]/g) || []).length;
  const en = (s.match(/[A-Za-z]/g) || []).length;
  if (km + zh + en === 0) return uiLanguage;
  const latinWords = s
    .replace(/[\u1780-\u17FF\u4E00-\u9FFF]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z]{2,}/.test(w));
  const englishSentence = latinWords.length >= 3 && EN_QUESTION_FRAME.test(s) && zh === 0;
  if (englishSentence && km <= en * 2) return 'en';
  const scoreKm = km;
  const scoreZh = zh * 3;
  const scoreEn = en * 0.8;
  if (scoreZh > scoreKm && scoreZh >= scoreEn) return 'zh';
  if (scoreKm >= scoreEn) return 'km';
  return 'en';
}

export type DietaryCategoryHint = 'soup' | 'noodles' | 'rice' | 'salad' | 'grilled' | 'stirfry' | 'dessert' | 'drink';

export interface DietaryCriteria {
  lowSugar: boolean;
  lowCalorie: boolean;
  lowFat: boolean;
  lowSalt: boolean;
  notSpicy: boolean;
  categoryHint?: DietaryCategoryHint;
}

const LOW_SUGAR_RE = /ស្ករតិច|ជាតិស្ករតិច|ជាតិស្ករទាប|ស្ករទាប|គ្មានស្ករ|ដោយគ្មានស្ករ|មិនផ្អែម|ផ្អែមតិច|ជាតិផ្អែមតិច|មានជាតិស្ករតិច|low[-\s]*sugar|less\s+sugar|no\s+sugar|sugar[-\s]*free|not\s+too\s+sweet|unsweetened|低糖|少糖|无糖|不太甜/i;
const LOW_CAL_RE = /កាឡូរីតិច|កាឡូរីទាប|ស្រាល|low[-\s]*cal(?:orie)?s?|light\s+meal|diet\s+friendly|低卡|低热量|轻食/i;
const LOW_FAT_RE = /ខ្លាញ់តិច|ប្រេងតិច|មិនខ្លាញ់|ជាតិខ្លាញ់តិច|low[-\s]*fat|less\s+oil|not\s+oily|少油|低脂|清淡/i;
const LOW_SALT_RE = /ប្រៃតិច|អំបិលតិច|ជាតិប្រៃតិច|low[-\s]*salt|low[-\s]*sodium|less\s+salt|少盐|低盐/i;
const NOT_SPICY_RE = /មិនហឹរ|ហឹរតិច|គ្មានម្ទេស|not\s+spicy|mild|no\s+chil+i|不辣|微辣/i;

const CATEGORY_HINT_RULES: Array<{ cat: DietaryCategoryHint; re: RegExp }> = [
  { cat: 'soup', re: /សម្ល|ស៊ុប|ស្ងោរ|soup|stew|broth|汤/i },
  { cat: 'noodles', re: /មី(?![\u17D2])|គុយទាវ|នំបញ្ចុក|noodle|pho|面|粉/i },
  { cat: 'rice', re: /បាយ|បបរ|rice|porridge|congee|饭|粥/i },
  { cat: 'salad', re: /ញាំ|ភ្លា|សាឡាត់|salad|沙拉|凉拌/i },
  { cat: 'grilled', re: /អាំង|ដុត|grill|bbq|烤/i },
  { cat: 'stirfry', re: /ឆា|stir[-\s]*fr|炒/i },
  { cat: 'dessert', re: /បង្អែម|នំ(?!បញ្ចុក)|dessert|sweet\s+snack|甜品|甜点/i },
  { cat: 'drink', re: /ភេសជ្ជៈ|ទឹក(?!ត្រី|ស៊ុប|គ្រឿង)|drink|beverage|juice|饮料|饮品/i },
];

/** Dietary / flavour constraints inside a recommendation request ("soups low in sugar", "less oily noodles"...). */
export function parseDietaryCriteria(text: string): DietaryCriteria | null {
  const s = (text || '').trim();
  if (!s) return null;
  const criteria: DietaryCriteria = {
    lowSugar: LOW_SUGAR_RE.test(s),
    lowCalorie: LOW_CAL_RE.test(s),
    lowFat: LOW_FAT_RE.test(s),
    lowSalt: LOW_SALT_RE.test(s),
    notSpicy: NOT_SPICY_RE.test(s),
  };
  if (!criteria.lowSugar && !criteria.lowCalorie && !criteria.lowFat && !criteria.lowSalt && !criteria.notSpicy) {
    return null;
  }
  // Category word must be taken from the text WITHOUT the criteria phrases (so "ស្ករ"/"ផ្អែម" does not look like a dessert)
  const withoutCriteria = s
    .replace(LOW_SUGAR_RE, ' ')
    .replace(LOW_CAL_RE, ' ')
    .replace(LOW_FAT_RE, ' ')
    .replace(LOW_SALT_RE, ' ')
    .replace(NOT_SPICY_RE, ' ');
  for (const rule of CATEGORY_HINT_RULES) {
    if (rule.re.test(withoutCriteria)) {
      criteria.categoryHint = rule.cat;
      break;
    }
  }
  return criteria;
}

const KHMER_FILLER_WORDS = /តើ|មាន|ហើយ|ដែរ|ទេ|ឬ|នៅក្នុង|ក្នុង|របស់|ប៉ុន្មាន|អ្វីខ្លះ|អ្វី|ម៉េច|ម្តេច|ម្ដេច|ដែល|ជាតិ|បរិមាណ|សម្រាប់|ពី|នៃ|សូម|សុំ|ជួយ|ប្រាប់|[?？!！។«»"']/g;
const EN_FILLER_WORDS = /\b(?:how|many|much|long|what|whats|what's|why|which|when|who|is|are|was|were|does|do|did|can|could|should|would|will|the|a|an|of|in|on|at|for|to|it|its|this|that|i|me|my|you|about|tell|show|give|please|calories?|kcal|nutrition\w*|nutritional|ingredients?|protein|carbs?|fat|sodium|vitamins?|history|origin|origins|culture|difference|between|store|storage|keep|fridge|freeze|reheat|leftovers?|safe|healthy|healthier|good|best)\b/gi;
const ZH_FILLER_WORDS = /[吗呢吧的了]|什么|怎么|如何|为什么|为何|哪个|多久|多少|热量|卡路里|营养|蛋白质|碳水|保存|储存|冷藏|冷冻|历史|起源|由来|文化|区别|差别|可以|能不能|是否|[?？!！。，,]/g;

/**
 * Best-effort: strip question / filler words from a fact question so that the remaining words are (mostly) the dish name.
 * "តើអាម៉ុកត្រីមានកាឡូរីប៉ុន្មាន?" -> "អាម៉ុកត្រី", "How many calories in fish amok?" -> "fish amok".
 */
export function extractDishPhrase(text: string): string {
  return (text || '')
    .replace(KHMER_KNOWLEDGE_MARKERS_GLOBAL, ' ')
    .replace(KHMER_FILLER_WORDS, ' ')
    .replace(EN_FILLER_WORDS, ' ')
    .replace(ZH_FILLER_WORDS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

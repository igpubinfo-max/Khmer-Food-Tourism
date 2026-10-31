import type { FoodItem, Language } from '../types';
import { tr } from '../utils/i18n';
import {
  rankDrinkPairingDishes,
  pairingReason,
  pairingKindsLabel,
} from '../utils/drinkPairing';

/**
 * AI Food & Tourism Brain — intelligent culinary & travel understanding layer.
 *
 * Designed EXCLUSIVELY for Food & Tourism in Cambodia:
 *   1. Understands cravings, foreign dish comparisons, flavors, meal times, and beverage pairings.
 *   2. Bridges foreign dishes to authentic Cambodian dishes with clear culinary explanations.
 *   3. Adds cultural & culinary fun facts and practical dining/travel tips.
 *   4. Strictly refuses ALL medical, disease, symptom, medication, or health-recovery questions,
 *      politely explaining that this AI Assistant is exclusively for Food & Tourism in Cambodia.
 */

type T3 = [string, string, string];

export type AllergenId = 'peanut' | 'shellfish' | 'fish' | 'egg' | 'soy' | 'sesame' | 'raw';

export interface BrainDish {
  food: FoodItem;
  reason: string;
  allergens: AllergenId[];
}

export interface BrainChip {
  id: string;
  label: string;
  query: string;
}

export type BrainMode = 'bridge' | 'mood' | 'drink' | 'discover' | 'blocked' | 'scope_notice';

export interface AiBrainInsight {
  mode: BrainMode;
  entryId: string;
  emoji: string;
  headline: string;
  explanation: string;
  dishes: BrainDish[];
  surprise?: { title: string; text: string };
  tips: string[];
  safetyNote?: string;
  followUps: BrainChip[];
  /** Drink-pairing menu is VIP only: true when a non-VIP user asked for it. */
  vipLock?: boolean;
  drinkDisclaimer?: string;
  /** Number of drinking-food dishes found (used for the VIP teaser). */
  pairingCount?: number;
}

export function sanitizeCravingQuery(input: string): string {
  return (input || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

/** Illegal / dangerous / protected-wildlife requests are never answered with food ideas. */
const UNSAFE_RE =
  /\b(cannabis|marijuana|weed|ganja|happy pizza|meth|cocaine|heroin|ecstasy|drugs?|pangolin|bushmeat|endangered|poison)\b|កញ្ឆា|ថ្នាំញៀន|សត្វកម្រ|ថ្នាំពុល|大麻|毒品|冰毒|穿山甲|野味|毒药/i;

/**
 * Strict Medical / Disease / Symptom / Health-Recovery Detector (Khmer, English, Chinese).
 * The AI Assistant is exclusively for Food & Tourism and must NEVER answer medical/disease questions
 * or recommend foods to cure, treat, prevent, or recover from any medical condition.
 */
export const MEDICAL_SCOPE_RE =
  /\b(diabet(?:es|ic)?|blood pressure|hypertens(?:ion|ive)|hypotens(?:ion|ive)|cholesterol|kidney(?: disease| stone)?|heart disease|cardiovascular|stroke|cancer|tumor|ulcer|gastritis|acid reflux|gerd|indigestion|constipat(?:ion|ed)|diarrh(?:ea|oea)|stomach\s*(?:ache|pain|problem|issue|ulcer|flu|bug)|belly\s*ache|abdominal pain|gout|arthrit(?:is|ic)|asthma|bronchitis|pneumonia|tuberculosis|hepatitis|cirrhosis|fatty liver|anemia|thyroid|migraine|headache|dizz(?:y|iness)|vertigo|insomnia|depress(?:ion|ed)|anxiety|allerg(?:y|ies|ic)|intoleran(?:ce|t)|celiac|lactose|hangover|\bsick\b|illness|disease|disorder|syndrome|symptom|infect(?:ion|ed)|\bflu\b|influenza|\bfever\b|\bcough(?:ing)?\b|sore throat|runny nose|vomiting|nausea|pregnan(?:t|cy)|breastfeed(?:ing)?|postpartum|medicat(?:ion|e)|medicine|\bpill(?:s)?\b|tablet|capsule|antibiotic|insulin|prescript(?:ion|ive)|dosage|\bcure(?:s|d|ing)?\b|\btreat(?:ment|ing|s)?\b|\bheal(?:ing|s)?\b|remed(?:y|ies)|recover(?:y|ing)? from|therapy|medical|doctor|physician|clinic|hospital|patient|diagnos(?:e|is|tic)|prevent(?:ion|ing)? disease|lower blood sugar|lower blood pressure|immune booster)\b|ជំងឺ|ទឹកនោមផ្អែម|លើសឈាម|សម្ពាធឈាម|ខ្លាញ់ក្នុងឈាម|កូឡេស្តេរ៉ុល|ឈឺក្រពះ|រលាកក្រពះ|ដំបៅក្រពះ|បញ្ហាក្រពះ|ឈឺពោះ|រាគ|ទល់លាមក|តម្រងនោម|ក្រលៀន|បេះដូង|ថ្លើម|សួត|មហារីក|សន្លាក់|រលាកសន្លាក់|ហឺត|គ្រុន|គ្រុនក្តៅ|ផ្តាសាយ|ក្អក|ឈឺបំពង់ក|ឈឺក្បាល|វិលមុខ|ក្អួត|ចង្អោរ|អាឡែរហ្ស៊ី|អាឡែស៊ី|ប្រកាន់|មានផ្ទៃពោះ|ស្ត្រីមានផ្ទៃពោះ|ចាញ់កូន|ក្រោយសម្រាល|ស្រវឹង|បន្សាបស្រវឹង|ឈឺថ្កាត់|រោគសញ្ញា|ថ្នាំពេទ្យ|លេបថ្នាំ|វេជ្ជបញ្ជា|ព្យាបាល|បំបាត់ជំងឺ|ការពារជំងឺ|ជាសះស្បើយ|ប៉ូវសុខភាព|វេជ្ជសាស្ត្រ|គ្រូពេទ្យ|វេជ្ជបណ្ឌិត|មន្ទីរពេទ្យ|គ្លីនិក|糖尿病|高血压|低血压|血压|胆固醇|高血脂|肾病|肾结石|心脏病|心血管|中风|癌症|肿瘤|胃痛|胃病|胃炎|胃溃疡|胃酸|消化不良|肚子痛|腹痛|腹泻|拉肚子|便秘|痛风|关节炎|哮喘|肺炎|肝炎|脂肪肝|贫血|偏头痛|头痛|头晕|失眠|过敏|宿醉|解酒|感冒|发烧|发热|咳嗽|喉咙痛|恶心|呕吐|生病|疾病|病症|症状|怀孕|孕妇|坐月子|吃药|药物|处方|胰岛素|抗生素|治疗|治愈|治病|偏方|食疗|养生治病|康复|恢复健康|医疗|医学|医生|大夫|医院|诊所/i;

export function isMedicalOrHealthQuery(input: string): boolean {
  const clean = sanitizeCravingQuery(input);
  if (!clean) return false;
  return MEDICAL_SCOPE_RE.test(clean);
}

const ALLERGEN_LABEL: Record<AllergenId, T3> = {
  peanut: ['សណ្តែកដី', 'Peanuts', '花生'],
  shellfish: ['បង្គា/ក្តាម/ខ្យង', 'Shellfish', '甲壳/贝类'],
  fish: ['ត្រី/ប្រហុក', 'Fish', '鱼类'],
  egg: ['ស៊ុត', 'Egg', '鸡蛋'],
  soy: ['សណ្តែកសៀង/ស៊ីអ៊ីវ', 'Soy', '大豆'],
  sesame: ['ល្ង', 'Sesame', '芝麻'],
  raw: ['គ្រឿងស្រស់/ភ្លា', 'Fresh ceviche-style', '生腌风味'],
};

export function allergenLabel(id: AllergenId, language: Language): string {
  const l = ALLERGEN_LABEL[id];
  return tr(language, l[0], l[1], l[2]);
}

export function allergyFootnote(language: Language): string {
  return tr(
    language,
    'ព័ត៌មានគ្រឿងផ្សំសម្រាប់ជាឯកសារយោងនៃរសជាតិមុខម្ហូប។',
    'Ingredient tags are provided as a culinary reference.',
    '食材标签仅供美食风味参考。'
  );
}

const allergenCache = new Map<string, AllergenId[]>();

export function detectAllergens(food: FoodItem): AllergenId[] {
  const key = `${food.id}|${food.ingredients?.length ?? 0}|${food.nameKh}`;
  const hit = allergenCache.get(key);
  if (hit) return hit;

  const ing = (food.ingredients || []).map((i) => `${i.nameKh || ''} ${i.nameEn || ''}`).join(' ');
  const name = `${food.nameKh || ''} ${food.nameEn || ''}`;
  const all = `${ing} ${name}`.toLowerCase();
  const fishText = all.replace(/ទឹកត្រី|fish sauce/g, ' ');

  const out: AllergenId[] = [];
  if (/សណ្តែកដី|សណ្ដែកដី|peanut/.test(all)) out.push('peanut');
  if (/បង្គា|ក្តាម|ក្ដាម|ខ្យង|គ្រំ|shrimp|prawn|crab|snail|clam|oyster|mussel|lobster/.test(all)) out.push('shellfish');
  if (/ត្រី|ប្រហុក|fish|prahok|anchov/.test(fishText)) out.push('fish');
  if (/ស៊ុត|ពង|egg/.test(all)) out.push('egg');
  if (/ស៊ីអ៊ីវ|សៀង|តៅហ៊ូ|soy|tofu|bean paste/.test(all)) out.push('soy');
  if (/ល្ង(?!ាច)|sesame/.test(all)) out.push('sesame');
  if (/ភ្លា|ឆៅ|ceviche|\braw\b/.test(name.toLowerCase())) out.push('raw');

  if (allergenCache.size > 2000) allergenCache.clear();
  allergenCache.set(key, out);
  return out;
}

const FEATURES: Array<{ re: RegExp; phrase: T3; nameOnly?: boolean }> = [
  { re: /បំពង|ចៀន|ស្រួយ|crispy|fried|crunch/i, phrase: ['ស្រួយក្រៀមៗ', 'crispy & crunchy', '外酥脆'], nameOnly: true },
  { re: /អាំង|ដុត|grill|bbq|roast|charcoal/i, phrase: ['អាំងលើធ្យូងឈ្ងុយ', 'charcoal-grilled aroma', '炭火香气'], nameOnly: true },
  { re: /ម្ទេស|ហឹរ|chili|spicy/i, phrase: ['ហឹរមុត', 'spicy kick', '香辣'] },
  { re: /ជូរ|ក្រូចឆ្មា|អំពិល|sour|lime|tamarind/i, phrase: ['ជូរស្រស់ស្រាយ', 'bright & sour', '酸爽'] },
  { re: /ខ្ទិះ|coconut/i, phrase: ['ខ្ទិះដូងទន់ក្រអូប', 'creamy coconut', '椰香柔滑'] },
  { re: /ក្តាម|ក្ដាម|បង្គា|មឹក|គ្រំ|crab|prawn|shrimp|squid/i, phrase: ['គ្រឿងសមុទ្រស្រស់ៗ', 'fresh seafood', '新鲜海味'], nameOnly: true },
  { re: /សាច់គោ|សាច់ជ្រូក|សាច់មាន់|beef|pork|chicken|duck/i, phrase: ['សាច់ទន់ឈ្ងុយ', 'tender, juicy meat', '肉质鲜嫩'], nameOnly: true },
];

export function describeDish(food: FoodItem, language: Language): string {
  const name = `${food.nameKh} ${food.nameEn}`;
  const text = `${name} ${food.descriptionKh} ${food.descriptionEn}`;
  const parts: string[] = [];
  for (const f of FEATURES) {
    if (f.re.test(f.nameOnly ? name : text)) parts.push(tr(language, f.phrase[0], f.phrase[1], f.phrase[2]));
    if (parts.length >= 2) break;
  }
  if (food.categorySlug === 'soup' && parts.length < 2) parts.push(tr(language, 'ទឹកស៊ុបក្តៅៗ', 'warm, comforting broth', '热乎乎的汤'));
  if (food.categorySlug === 'salad' && parts.length < 2) parts.push(tr(language, 'ញាំស្រស់ស្រាយ', 'fresh & zesty', '清新爽口'));
  if (food.categorySlug === 'dessert' && parts.length < 2) parts.push(tr(language, 'ផ្អែមស្រទន់', 'gently sweet', '甜而不腻'));
  if (parts.length === 0) parts.push(tr(language, 'រសជាតិខ្មែរពិតៗ', 'authentic Khmer flavour', '地道高棉风味'));
  return parts.join(' • ');
}

const CHIPS: Record<string, { label: T3; query: T3 }> = {
  spicy: { label: ['🌶️ ជូរហឹរ', '🌶️ Spicy & Sour', '🌶️ 酸辣风味'], query: ['ជូរហឹរ', 'spicy sour', '酸辣'] },
  soup: { label: ['🍲 សម្លក្តៅៗ', '🍲 Warm Soup', '🍲 热汤'], query: ['សម្លក្តៅៗ', 'warm soup', '热汤'] },
  grilled: { label: ['🥩 សាច់អាំង', '🥩 Grilled', '🥩 烧烤'], query: ['សាច់អាំង', 'grilled', '烧烤'] },
  seafood: { label: ['🦀 គ្រឿងសមុទ្រ', '🦀 Seafood', '🦀 海鲜'], query: ['គ្រឿងសមុទ្រ', 'seafood', '海鲜'] },
  sweet: { label: ['🍨 បង្អែមខ្មែរ', '🍨 Khmer Dessert', '🍨 高棉甜品'], query: ['បង្អែម', 'dessert', '甜品'] },
  noodles: { label: ['🍜 គុយទាវ & មី', '🍜 Noodles', '🍜 粉面'], query: ['គុយទាវ', 'noodles', '粿条面食'] },
  rice: { label: ['🍚 បាយ', '🍚 Rice Dishes', '🍚 米饭'], query: ['បាយ', 'rice', '米饭'] },
  tourism: { label: ['🏛️ កន្លែងដើរលេងសៀមរាប', '🏛️ Siem Reap Places', '🏛️ 暹粒景点'], query: ['កន្លែងដើរលេងសៀមរាប', 'Siem Reap attractions', '暹粒旅游景点'] },
  drink: { label: ['🍻 ម្ហូបអមភេសជ្ជៈ (VIP)', '🍻 Beverage Pairings (VIP)', '🍻 佐餐搭配 (VIP)'], query: ['ម្ហូបអមភេសជ្ជៈ', 'beverage pairing food', '佐餐美食'] },
  surprise: { label: ['🎁 ភ្ញាក់ផ្អើលខ្ញុំ', '🎁 Surprise Me', '🎁 给我惊喜'], query: ['ភ្ញាក់ផ្អើល', 'surprise me', '惊喜'] },
  cheap: { label: ['💸 ម្ហូបតាមផ្លូវឆ្ងាញ់ៗ', '💸 Street Food', '💸 街头小吃'], query: ['អាហារសម្រន់', 'street food', '街头小吃'] },
};

export function chipsFor(ids: string[], language: Language): BrainChip[] {
  return ids
    .filter((id) => CHIPS[id])
    .map((id) => ({
      id,
      label: tr(language, CHIPS[id].label[0], CHIPS[id].label[1], CHIPS[id].label[2]),
      query: tr(language, CHIPS[id].query[0], CHIPS[id].query[1], CHIPS[id].query[2]),
    }));
}

interface BrainEntry {
  id: string;
  emoji: string;
  mode: BrainMode;
  test: RegExp;
  headline: T3;
  explain: T3;
  like: T3;
  prefer?: RegExp;
  soft?: RegExp;
  cats?: string[];
  avoid?: RegExp;
  avoidCats?: string[];
  surprise?: { title: T3; text: T3 };
  tips: T3[];
  follow: string[];
}

const DID_YOU_KNOW: T3 = ['ដឹងទេ?', 'Did you know?', '您知道吗？'];
const ALWAYS_SAFE_RAW = /ភ្លា|ឆៅ|\braw\b|ceviche/i;

const BRAIN_ENTRIES: BrainEntry[] = [
  // ---- VIP Beverage-pairing menu ---------------------------------------------------------
  {
    id: 'drink_pairing',
    emoji: '🍹',
    mode: 'drink',
    test: /beverage pairing|drink pairing|bar food|pub food|drinking food|beer|alcohol|liquor|wine\b|whisk|vodka|cocktail|\bsake\b|ម្ហូបអមភេសជ្ជៈ|ស្រាបៀរ|ស្រា(?![លប])|ក្លែម|ជុំតុ|ផឹកស្រា|佐餐|啤酒|白酒|红酒|葡萄酒|下酒|喝酒/i,
    headline: ['ម្ហូបអមភេសជ្ជៈ — ជម្រើសរបស់ AI', 'Beverage Pairings — Curated by AI', '佐餐与饮品搭配 — AI 精选'],
    explain: [
      'AI ជ្រើសរើសមុខម្ហូបសម្រាប់ញ៉ាំជុំតុ និងអមភេសជ្ជៈ — អាំង ចៀនស្រួយ ញាំជូរហឹរ គ្រឿងសមុទ្រ និងសាច់ប្រឡាក់ឈ្ងុយឆ្ងាញ់។',
      'AI curates savory sharing dishes — grilled meats, crispy bites, zesty salads, fresh seafood and seasoned specialties — ideal for dining and refreshments.',
      'AI 精选适合围桌分享与饮品搭配的风味佳肴——炭火烧烤、酥脆小食、酸辣凉拌、鲜美海鲜与风味肉食。',
    ],
    like: ['ស័ក្តិសមអមភេសជ្ជៈព្រោះ៖', 'Pairs well with refreshments because:', '适合佐餐搭配：'],
    surprise: {
      title: ['គន្លឹះរសជាតិ', 'Culinary tip', '风味小贴士'],
      text: [
        'ញាំជូរហឹរ ឬក្រូចឆ្មារស្រស់ ជួយកាត់ជាតិខ្លាញ់ និងធ្វើឱ្យរសជាតិស្រស់ស្រាយ — ហេតុនេះគេនិយមបញ្ជាញាំមុនម្ហូបអាំង។',
        'A tangy, zesty salad cuts through richness and refreshes the palate — a favorite starter before grilled dishes arrive.',
        '酸辣凉拌能解腻、清爽味蕾——非常适合在烧烤上桌前作为开胃菜。',
      ],
    },
    tips: [
      [
        'ផ្គួបជាមួយទឹកក្រូចឆ្មារស្រស់ តែត្រជាក់ ឬភេសជ្ជៈស្រស់ស្រាយ ដើម្បីបង្កើនរសជាតិឱ្យកាន់តែឆ្ងាញ់។',
        'Pair with fresh lime soda, iced tea or chilled refreshments to elevate the savory flavors.',
        '搭配鲜榨青柠水、冰茶或冰爽饮品，更能衬托菜品的鲜美风味。',
      ],
    ],
    follow: ['grilled', 'seafood', 'spicy'],
  },
  // ---- Foreign dishes → Khmer bridges ----------------------------------------------------
  {
    id: 'pizza',
    emoji: '🍕',
    mode: 'bridge',
    test: /pizza|ភីហ្សា|ភីស្សា|披萨|比萨/i,
    headline: ['AI យល់ថាអ្នកចង់ញ៉ាំ Pizza 🍕', 'AI thinks you are craving Pizza 🍕', 'AI 觉得您想吃披萨 🍕'],
    explain: [
      'Pizza មិនមែនជាម្ហូបខ្មែរទេ — AI បានរកមុខម្ហូបខ្មែរដែលមានទាក់ទាញស្រដៀងគ្នា៖ ស្រួយ ឈ្ងុយ មានសាច់ និងបន្លែ ញ៉ាំបានទាំងដៃ។',
      'Pizza is not a Khmer dish — so AI found Cambodian dishes with the same appeal: crisp, savoury, loaded with meat & veg and easy to eat by hand.',
      '披萨并非高棉菜——AI 为您找到了同样诱人的柬埔寨美食：酥脆、咸香、肉菜丰富，还能直接用手享用。',
    ],
    like: ['ស្រដៀង Pizza ត្រង់៖', 'Pizza-like because:', '与披萨相似：'],
    prefer: /បាញ់ឆែវ|banh chao|crepe|pancake|ប្រហិត|meatball|ចាដូវ|dumpling|ឡុកឡាក់|lok lak|ប៉ាតេ|pate/i,
    soft: /ចៀន|បំពង|crispy|fried|អាំង|grill/i,
    cats: ['streetfood'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'នំបុ័ងប៉ាតេខ្មែរ (Num Pang Pâté) ជាសាំងវិចតាមផ្លូវដ៏ពេញនិយម ដែលមានឥទ្ធិពលពីបារាំង — បង្ហាញថាម្ហូបខ្មែរចេះយកគំនិតបរទេសមកធ្វើជារបស់ខ្លួន!',
        'Cambodia’s Num Pang Pâté baguette sandwich grew out of French influence — Khmer street food loves turning foreign ideas into its own!',
        '柬埔寨国民三明治 Num Pang Pâté 源自法式影响——高棉街头美食很擅长把外来灵感变成自己的味道！',
      ],
    },
    tips: [
      [
        'សាកល្បងបាញ់ឆែវ៖ ហែកដាក់ស្លឹកសាឡាត់ ជីរអង្កាម រួចជ្រលក់ទឹកត្រីផ្អែម — ស្រស់ និងស្រួយឆ្ងាញ់។',
        'Try Banh Chao: wrap it in lettuce & herbs and dip in sweet fish sauce — crisp and fragrant.',
        '试试高棉煎饼 Banh Chao：用生菜和香草包着蘸甜鱼露，酥脆清香。',
      ],
    ],
    follow: ['grilled', 'spicy', 'surprise'],
  },
  {
    id: 'burger',
    emoji: '🍔',
    mode: 'bridge',
    test: /burger|sandwich|hot ?dog|ប៊ឺហ្គឺ|សាំងវិច|汉堡|三明治|热狗/i,
    headline: ['AI យល់ថាអ្នកចង់ញ៉ាំ Burger / សាំងវិច 🍔', 'AI thinks you want a burger or sandwich 🍔', 'AI 觉得您想吃汉堡/三明治 🍔'],
    explain: [
      'មុខម្ហូបខ្មែរដែលអាចជំនួសបាន៖ សាច់ឆ្អិនឈ្ងុយ ញ៉ាំជាមួយបន្លែស្រស់ និងទឹកជ្រលក់ ឆ្អែតល្អ។',
      'Khmer picks that scratch the same itch: juicy cooked meat with fresh veg and a good dip — properly filling.',
      '可以替代的高棉美食：多汁的熟肉配新鲜蔬菜和蘸酱，吃得饱又满足。',
    ],
    like: ['ជំនួស Burger បានព្រោះ៖', 'A Khmer swap because:', '替代理由：'],
    prefer: /num pang|នំបុ័ង|baguette|ប្រហិត|meatball|ឡុកឡាក់|lok lak/i,
    soft: /សាច់គោ|beef|សាច់ជ្រូក|pork|grill|អាំង/i,
    avoid: /soup|ស៊ុប|សម្ល|porridge|បបរ/i,
    cats: ['streetfood', 'stirfry'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'ឡុកឡាក់ (Lok Lak) គឺសាច់គោឆាម្រេចកំពត ញ៉ាំជាមួយសាឡាត់ និងទឹកម្រេចក្រូចឆ្មា — ម្ហូបខ្មែរដែលភ្ញៀវបរទេសចូលចិត្តបំផុតមួយ។',
        'Lok Lak — Kampot-pepper beef with salad and a lime-pepper dip — is one of the Khmer dishes visitors love most.',
        '摇晃牛肉 Lok Lak 以贡布胡椒爆炒，配生菜与青柠胡椒蘸汁，是外国游客最爱的高棉菜之一。',
      ],
    },
    tips: [['ញ៉ាំជាមួយបន្លែស្រស់ និងទឹកម្រេចក្រូចឆ្មា ដើម្បីឱ្យរសជាតិកាន់តែឆ្ងាញ់។', 'Pair with fresh greens and Kampot lime-pepper sauce for the best flavor.', '搭配新鲜蔬菜和贡布青柠胡椒蘸汁风味最佳。']],
    follow: ['grilled', 'rice', 'spicy'],
  },
  {
    id: 'fried_chicken',
    emoji: '🍗',
    mode: 'bridge',
    test: /fried chicken|kfc|chicken wing|nugget|មាន់ចៀន|មាន់បំពង|炸鸡|鸡翅/i,
    headline: ['AI យល់ថាអ្នកចង់ញ៉ាំមាន់ចៀនស្រួយ 🍗', 'AI thinks you want crispy fried chicken 🍗', 'AI 觉得您想吃炸鸡 🍗'],
    explain: [
      'AI បានរកមាន់ និងម្ហូបស្រួយបែបខ្មែរ ដែលឈ្ងុយគ្រឿងបុកស្លឹកគ្រៃ រមៀត និងម្រេច — ជម្រៅរសជាតិជាងប្រេងចៀនធម្មតា។',
      'AI found Khmer chicken and crispy dishes seasoned with lemongrass, turmeric and pepper — deeper flavour than plain fried chicken.',
      'AI 找到了以香茅、姜黄和胡椒调味的高棉鸡肉与酥脆菜品——比普通炸鸡风味更有层次。',
    ],
    like: ['ជំនួសមាន់ចៀនបានព្រោះ៖', 'A Khmer swap because:', '替代理由：'],
    prefer: /មាន់|chicken|ស្លាប|wing|ទាអាំង|roast duck/i,
    soft: /ចៀន|បំពង|crispy|fried|ដុត|អាំង|roast/i,
    cats: ['grilled'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'មាន់ដុតទឹកឃ្មុំភ្នំគូលែន ប្រើទឹកឃ្មុំព្រៃ ធ្វើឱ្យស្បែកមាន់ឡើងពណ៌មាសរលោង ក្លិនឈ្ងុយផ្អែមស្រទន់។',
        'Honey-glazed Kulen chicken uses wild honey to give the skin a golden lacquer and a gently sweet aroma.',
        '荔枝山蜂蜜烤鸡用野蜂蜜上色，鸡皮金亮、香气微甜。',
      ],
    },
    tips: [['ញ៉ាំជាមួយទឹកម្រេចក្រូចឆ្មា និងជ្រក់ល្ហុង ដើម្បីបង្កើនរសជាតិ។', 'Pair with lime-pepper dip and green papaya pickles for extra zing.', '配青柠胡椒蘸汁和木瓜泡菜更提味。']],
    follow: ['grilled', 'spicy', 'rice'],
  },
  {
    id: 'sushi',
    emoji: '🍣',
    mode: 'bridge',
    test: /sushi|sashimi|raw fish|salmon|ceviche|ស៊ូស៊ី|ត្រីឆៅ|សាស៊ីមី|寿司|刺身|生鱼片|三文鱼/i,
    headline: ['AI យល់ថាអ្នកចង់ញ៉ាំម្ហូបស្រស់បែប Sushi 🍣', 'AI thinks you want something fresh like sushi 🍣', 'AI 觉得您想吃清爽的寿司类美食 🍣'],
    explain: [
      'ខ្មែរមានម្ហូបស្រស់បែប Ceviche ដែលហៅថា «ភ្លា» — សាច់ស្រស់ចម្អិនដោយទឹកក្រូចឆ្មារ លាយជីរ និងម្ទេស។',
      'Cambodia has its own ceviche-style “Phlea” — fresh meat or seafood marinated in lime juice with herbs and chili.',
      '柬埔寨有自己的“生腌”风味——Phlea：新鲜肉类或海鲜以青柠汁腌制，配香草和辣椒。',
    ],
    like: ['ស្រដៀង Sushi ត្រង់៖', 'Sushi-like because:', '与寿司相似：'],
    prefer: /ភ្លា|ceviche|\braw\b|pleah|phlea/i,
    soft: /ញាំ|salad|ក្រូចឆ្មា|lime/i,
    avoid: /\bdip\b|ទឹកគ្រឿង|teuk kroeung/i,
    cats: ['salad'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'ភ្លាសាច់គោ (Phlea Sach Ko) ប្រើទឹកក្រូចឆ្មារ «ចម្អិន» សាច់គោស្តើងៗ មុនលាយស្លឹកជីរ និងសណ្តែកដីលីង — ម្ហូបបុរាណដែលភ្ញៀវភ្ញាក់ផ្អើលនឹងរសជាតិ។',
        'Phlea Sach Ko marinates thin beef slices in lime juice before tossing with herbs and roasted peanuts — an iconic Khmer salad.',
        'Phlea Sach Ko 用青柠汁腌制薄牛肉片，再拌香草与烤花生，是令人惊艳的高棉传统凉拌名菜。',
      ],
    },
    tips: [['រោយសណ្តែកដីលីង និងជីរស្រស់ពីលើ ដើម្បីឱ្យក្លិនកាន់តែឈ្ងុយ។', 'Top with roasted peanuts and fresh herbs for the best crunch and aroma.', '撒上烤花生和新鲜香草，口感更香脆。']],
    follow: ['seafood', 'spicy', 'grilled'],
  },
  {
    id: 'noodle_soup_foreign',
    emoji: '🍜',
    mode: 'bridge',
    test: /ramen|\bpho\b|udon|hot ?pot|shabu|រ៉ាម៉ែន|ហ្វឺ|火锅|拉面|乌冬|米线/i,
    headline: ['AI យល់ថាអ្នកចង់ញ៉ាំគុយទាវទឹកស៊ុបក្តៅៗ 🍜', 'AI thinks you want a steaming noodle soup 🍜', 'AI 觉得您想吃热腾腾的汤粉 🍜'],
    explain: [
      'ខ្មែរមានគុយទាវ នំបញ្ចុក និងសម្លក្តៅៗ ដែលទឹកស៊ុបរម្ងាស់ឈ្ងុយ — ជម្រើសជំនួស Ramen / Pho ដ៏ល្អ។',
      'Cambodia has kuy teav, noodle curries and slow-simmered soups — great stand-ins for ramen or pho.',
      '柬埔寨有粿条、咖喱米线和慢熬汤品，是拉面或河粉的绝佳替代。',
    ],
    like: ['ជំនួស Ramen/Pho បានព្រោះ៖', 'A Khmer swap because:', '替代理由：'],
    prefer: /គុយទាវ|kuy teav|noodle|នំបញ្ចុក|banh/i,
    soft: /សម្ល|ស៊ុប|soup|broth|ការី|curry/i,
    cats: ['noodles'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'គុយទាវភ្នំពេញ ជាអាហារពេលព្រឹកពេញនិយមបំផុតមួយរបស់ខ្មែរ ទឹកស៊ុបថ្លារម្ងាស់ពីឆ្អឹងជ្រូក និងមឹកក្រៀម — ញ៉ាំជាមួយក្រូចឆ្មារ និងម្ទេស។',
        'Phnom Penh kuy teav is one of Cambodia’s most beloved breakfasts — a clear broth simmered from pork bones and dried squid, finished with lime and chili.',
        '金边粿条是柬埔寨最受欢迎的早餐之一，以猪骨和鱿鱼干熬成清澈汤底，挤上青柠、加点辣椒。',
      ],
    },
    tips: [['ដាក់បន្លែស្រស់ និងក្រូចឆ្មារបន្ថែម ដើម្បីបង្កើនរសជាតិឱ្យកាន់តែស្រស់ស្រាយ។', 'Add fresh herbs and lime to lift both flavour and freshness.', '加些新鲜香草和青柠，更提味也更清爽。']],
    follow: ['soup', 'noodles', 'spicy'],
  },
  {
    id: 'pasta',
    emoji: '🍝',
    mode: 'bridge',
    test: /pasta|spaghetti|macaroni|carbonara|ប៉ាស្តា|ស្ប៉ាហ្គេទី|意面|意大利面/i,
    headline: ['AI យល់ថាអ្នកចង់ញ៉ាំ Pasta 🍝', 'AI thinks you are craving pasta 🍝', 'AI 觉得您想吃意面 🍝'],
    explain: [
      'AI រកមុខម្ហូបសរសៃឆាក្តៅៗ ដែលមានទឹកជ្រលក់ឈ្ងុយ សាច់ និងបន្លែ ដូចអារម្មណ៍ញ៉ាំ Pasta។',
      'AI looked for wok-tossed noodle dishes with savoury sauce, meat and veg — the same comfort as a plate of pasta.',
      'AI 找到了锅气十足、酱香浓郁、有肉有菜的炒粉面，带来与意面相似的满足感。',
    ],
    like: ['ស្រដៀង Pasta ត្រង់៖', 'Pasta-like because:', '与意面相似：'],
    prefer: /លត|lort|មីឆា|stir-fried|fried noodle|noodle|មីសួរ|glass/i,
    soft: /ឆា|stir|នំបញ្ចុក|banh|មី/i,
    cats: ['noodles'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'លតឆា (Lort Cha) ជាសរសៃនំខ្លីៗឆាជាមួយសាច់ និងពងទា ញ៉ាំជាមួយទឹកត្រីផ្អែម — ម្ហូបយប់ពេញនិយមតាមផ្លូវភ្នំពេញ។',
        'Lort Cha — short rice noodles wok-fried with meat and egg, served with sweet fish sauce — is a Phnom Penh night-market favourite.',
        'Lort Cha 是以肉和鸡蛋爆炒的短米粉，配甜鱼露，是金边夜市的热门小吃。',
      ],
    },
    tips: [['ញ៉ាំភ្លាមៗពេលនៅក្តៅ ដើម្បីរក្សាភាពទន់ស្វិតរបស់សរសៃ។', 'Eat it hot, straight from the wok, for the best chewy texture.', '趁热吃，口感最弹牙。']],
    follow: ['noodles', 'spicy', 'grilled'],
  },
  {
    id: 'steak',
    emoji: '🥩',
    mode: 'bridge',
    test: /steak|ribs|barbecue|ស្តេក|牛排|烤肉|排骨/i,
    headline: ['AI យល់ថាអ្នកចង់ញ៉ាំសាច់អាំងឆ្ងាញ់ៗ 🥩', 'AI thinks you want a proper grill 🥩', 'AI 觉得您想吃烧烤大餐 🥩'],
    explain: [
      'ខ្មែរមានសាច់អាំងលើធ្យូង ដែលប្រឡាក់គ្រឿងបុក ទឹកឃ្មុំ និងម្រេចកំពត — ឈ្ងុយ និងទន់ មិនចាញ់ Steak ឡើយ។',
      'Cambodia grills over charcoal with kroeung, honey and Kampot pepper — smoky, tender and a worthy rival to steak.',
      '柬埔寨炭烤以香料泥、蜂蜜和贡布胡椒腌制——香气四溢、肉质鲜嫩，不输牛排。',
    ],
    like: ['ជំនួស Steak បានព្រោះ៖', 'A Khmer swap because:', '替代理由：'],
    prefer: /ឆ្អឹងជំនី|rib|សាច់គោអាំង|grilled beef|steak|សាច់ជ្រូកអាំង|grilled pork|ពោះជ្រូកអាំង/i,
    soft: /អាំង|grill|bbq|សាច់គោ|beef|ដុត|roast|charcoal/i,
    cats: ['grilled'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'ម្រេចកំពតជាម្រេចល្បីពិភពលោក (មានការការពារភូមិសាស្ត្រ) — រោយលើសាច់អាំងបន្តិច ក្លិនឈ្ងុយខុសគេ។',
        'Kampot pepper is world-famous (with protected geographical status) — a pinch over grilled meat adds an unmistakable aroma.',
        '贡布胡椒享誉世界（受地理标志保护），撒在烤肉上香气独一无二。',
      ],
    },
    tips: [['ញ៉ាំជាមួយទឹកម្រេចក្រូចឆ្មា ឬទឹកប្រហុក និងបន្លែស្រស់ ដើម្បីមានតុល្យភាពរសជាតិ។', 'Serve with lime-pepper dip or prahok sauce and fresh greens.', '配青柠胡椒蘸汁或波罗福酱与新鲜蔬菜更美味。']],
    follow: ['seafood', 'spicy', 'drink'],
  },
  {
    id: 'dumpling',
    emoji: '🥟',
    mode: 'bridge',
    test: /dumpling|dim ?sum|\bbao\b|baozi|gyoza|ស៊ូម៉ៃ|នំបាវ|饺子|包子|点心/i,
    headline: ['AI យល់ថាអ្នកចង់ញ៉ាំនំវេច / ដុំៗតូចៗ 🥟', 'AI thinks you want wrapped bites 🥟', 'AI 觉得您想吃包裹类小点 🥟'],
    explain: [
      'AI រកមុខម្ហូបខ្មែរបែបវេច និងចំហុយ — ញ៉ាំបានម្តងមួយចំណិតៗ ដូច Dim Sum។',
      'AI looked for Khmer wrapped and steamed bites — easy to share one piece at a time, just like dim sum.',
      'AI 找到了高棉式包裹与蒸制小点——一口一个，和点心一样适合分享。',
    ],
    like: ['ស្រដៀងនំវេចត្រង់៖', 'Dumpling-like because:', '与饺点相似：'],
    prefer: /អន្សម|ansom|គួង|spring roll|roll|ចាដូវ|ប្រហិត|meatball|ចំហុយ|steamed|ស្លឹកចេក|banana leaf/i,
    cats: ['streetfood', 'cake'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'នំអន្សមជ្រូក ជានំដំណើបវេចស្លឹកចេក ដាក់សាច់ជ្រូក និងសណ្តែក ស្ងោររាប់ម៉ោង — ជានិមិត្តរូបនៃពិធីបុណ្យភ្ជុំបិណ្ឌ និងចូលឆ្នាំខ្មែរ។',
        'Num Ansom Chrouk is sticky rice and pork wrapped in banana leaf and boiled for hours — a symbol of Pchum Ben and Khmer New Year.',
        '猪肉糯米粽 Num Ansom 以蕉叶包裹、慢煮数小时，是亡人节与高棉新年的象征美食。',
      ],
    },
    tips: [['ជ្រលក់ជាមួយទឹកត្រីផ្អែមសណ្តែកដីបុក ដើម្បីបង្កើនរសជាតិ។', 'Dip in sweet peanut fish sauce for a rich, tangy finish.', '蘸花生甜鱼露风味更佳。']],
    follow: ['cheap', 'sweet', 'surprise'],
  },
  {
    id: 'icecream',
    emoji: '🍨',
    mode: 'bridge',
    test: /ice cream|gelato|sundae|bubble tea|\bboba\b|milkshake|smoothie|shaved ice|ការ៉េម|ទឹកកកក្រឡុក|冰淇淋|奶茶|刨冰|冷饮/i,
    headline: ['AI យល់ថាអ្នកចង់បានអ្វីត្រជាក់ផ្អែម 🍨', 'AI thinks you want something cold & sweet 🍨', 'AI 觉得您想来点冰凉甜品 🍨'],
    explain: [
      'ខ្មែរមានបង្អែមត្រជាក់ដាក់ទឹកកក និងខ្ទិះដូង — ផ្អែមស្រទន់ ត្រជាក់ស្រស់ ជំនួសការ៉េមបានល្អ។',
      'Cambodia serves iced coconut-milk desserts — gently sweet and cooling, a lovely stand-in for ice cream.',
      '柬埔寨有冰镇椰奶甜品——甜度适中、清凉解暑，可替代冰淇淋。',
    ],
    like: ['ជំនួសការ៉េមបានព្រោះ៖', 'A Khmer swap because:', '替代理由：'],
    prefer: /បង្អែម|dessert|ខ្ទិះ|coconut|ចេក|banana|សាគូ|sago|tapioca|ត្រាវ|ice|ទឹកកក|palm/i,
    cats: ['dessert', 'drink', 'cake'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'ស្ករត្នោតពិត (ស្ករត្នោតខ្មែរ) ផ្តល់ក្លិនផ្អែមស្រទន់ខុសពីស្ករស — ហេតុនេះបង្អែមខ្មែរមិនសូវផ្អែមទាល់តែឆ្អែតមាត់។',
        'Real Khmer palm sugar has a mellow caramel aroma unlike white sugar — which is why Khmer desserts feel sweet without being cloying.',
        '真正的高棉棕榈糖带有柔和焦糖香，与白糖不同——所以高棉甜品甜而不腻。',
      ],
    },
    tips: [['ដាក់ទឹកកកឈូសបន្តិចពីលើបង្អែមខ្ទិះដូង ត្រជាក់ស្រស់ស្រាយខ្លាំងណាស់។', 'Add shaved ice on top of coconut cream desserts for a refreshing treat.', '在椰奶甜品上加一点刨冰，清凉爽口。']],
    follow: ['sweet', 'cheap', 'surprise'],
  },
  {
    id: 'cake',
    emoji: '🍰',
    mode: 'bridge',
    test: /\bcake\b|\bbread\b|pastry|donut|doughnut|croissant|cookie|bakery|នំប៉័ង|នំខេក|蛋糕|面包|甜甜圈/i,
    headline: ['AI យល់ថាអ្នកចង់ញ៉ាំនំ 🍰', 'AI thinks you are in the mood for a sweet bake 🍰', 'AI 觉得您想吃点心 🍰'],
    explain: [
      'ខ្មែរមាននំប្រពៃណីច្រើនមុខ — នំកុង នំអន្សម នំផ្លែអាយ ក្រឡាន — ទន់ ផ្អែម និងឈ្ងុយដូង។',
      'Cambodia has many traditional sweets — num kong, num ansom, num phlae ai, kralan — soft, sweet and coconut-scented.',
      '柬埔寨有许多传统糕点——Num Kong、Num Ansom、Num Phlae Ai、Kralan，软糯香甜、椰香扑鼻。',
    ],
    like: ['ជំនួសនំខេកបានព្រោះ៖', 'A Khmer swap because:', '替代理由：'],
    prefer: /នំ|num|ក្រឡាន|kralan|បង្អែម|dessert|cake|donut/i,
    cats: ['cake', 'dessert'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'នំផ្លែអាយ មានស្នូលស្ករត្នោតរាវ — ពេលខាំ ស្ករត្នោតផ្ទុះក្នុងមាត់ ជាអារម្មណ៍ភ្ញាក់ផ្អើលដ៏ស្រស់ស្អាត។',
        'Num Phlae Ai hides liquid palm sugar inside — it bursts in your mouth when you bite, a lovely little surprise.',
        'Num Phlae Ai 内藏液态棕榈糖，一口咬下甜浆在口中迸发，惊喜十足。',
      ],
    },
    tips: [['នំស្រស់ៗ ញ៉ាំល្អបំផុតពេលនៅក្តៅៗ ទើបលើកចេញពីចង្ក្រាន។', 'Traditional Khmer cakes taste best warm and fresh from the steamer or pan.', '传统高棉糕点刚出锅趁热吃最香。']],
    follow: ['sweet', 'surprise', 'cheap'],
  },
  {
    id: 'coffee_drink',
    emoji: '☕',
    mode: 'bridge',
    test: /coffee|latte|espresso|\btea\b|juice|កាហ្វេ|តែ(?!រ)|ទឹកក្រូច|咖啡|奶茶|果汁/i,
    headline: ['AI យល់ថាអ្នកចង់ញ៉ាំអ្វីជាមួយភេសជ្ជៈ ☕', 'AI thinks you want a bite to go with your drink ☕', 'AI 觉得您想要搭配饮品的小点 ☕'],
    explain: [
      'AI រកនំ និងអាហារសម្រន់ខ្មែរ ដែលស័ក្តិសមជាមួយកាហ្វេ ឬតែនាពេលព្រឹក និងរសៀល។',
      'AI picked Khmer sweets and snacks that go beautifully with coffee or tea.',
      'AI 为您挑选了适合搭配咖啡或茶的高棉甜点与小吃。',
    ],
    like: ['ផ្គួបភេសជ្ជៈបានព្រោះ៖', 'Goes with your drink because:', '适合搭配饮品：'],
    prefer: /នំ|num|បង្អែម|dessert|ចេក|banana|ក្រឡាន|kralan|បាញ់ឆែវ|crepe|ប្រហិត/i,
    cats: ['cake', 'dessert', 'streetfood', 'drink'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'ទឹកត្នោតស្រស់ និងទឹកអំពៅ ជាភេសជ្ជៈធម្មជាតិដ៏ពេញនិយមតាមដងផ្លូវខ្មែរ — សាកល្បងជាមួយនំគ្រក់ ឬចេកអាំង។',
        'Fresh palm juice and sugarcane juice are classic Khmer street drinks — try them with a snack like num krok.',
        '鲜榨棕榈汁和甘蔗汁是高棉街头经典饮品——配上 Num Krok 之类的小吃很棒。',
      ],
    },
    tips: [['សាកល្បងកាហ្វេទឹកដោះគោទឹកកក ជាមួយនំបុ័ងប៉ាតេ ឬនំគ្រក់ក្តៅៗ។', 'Try iced condensed-milk coffee with a warm baguette or crispy coconut pancakes.', '试试冰炼乳咖啡配热法棍或香脆椰奶煎饼。']],
    follow: ['sweet', 'surprise', 'cheap'],
  },
  {
    id: 'korean',
    emoji: '🥘',
    mode: 'bridge',
    test: /korea|kimchi|bibimbap|bulgogi|ឃីមឈី|韩|泡菜|石锅/i,
    headline: ['AI យល់ថាអ្នកចង់ញ៉ាំម្ហូបកូរ៉េ 🥘', 'AI thinks you want Korean flavours 🥘', 'AI 觉得您想吃韩式风味 🥘'],
    explain: [
      'ខ្មែរមានជ្រក់ ញាំជូរហឹរ និងសាច់អាំង ដែលមានរសជាតិមុតៗស្រដៀងម្ហូបកូរ៉េ។',
      'Cambodia has pickles, tangy-spicy salads and grilled meats with the same bold, punchy flavours as Korean food.',
      '柬埔寨的腌菜、酸辣凉拌和烧烤，同样拥有强烈过瘾的风味，与韩餐有相通之处。',
    ],
    like: ['ស្រដៀងម្ហូបកូរ៉េត្រង់៖', 'Korean-style because:', '与韩餐相似：'],
    prefer: /ជ្រក់|pickle|អាំង|grill|ម្ទេស|spicy|ហឹរ|ញាំ|salad|បុក/i,
    cats: ['salad', 'grilled'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'ជ្រក់ខ្មែរ (ជ្រក់ស្ពៃ ជ្រក់ត្រសក់ ជ្រក់ល្ហុង) ក៏ជាម្ហូបជូរៗស្រួយៗ ដូចគីមឈីដែរ — ញ៉ាំជាមួយបាយ សាច់អាំង ឬបបរ។',
        'Khmer pickles (cabbage, cucumber, green papaya) are tangy and crunchy just like kimchi — great with rice, grills or porridge.',
        '高棉泡菜（卷心菜、黄瓜、青木瓜）同样酸脆爽口，配米饭、烧烤或粥都很棒。',
      ],
    },
    tips: [['ញ៉ាំសាច់អាំងផ្ទាប់ជាមួយជ្រក់ល្ហុង និងស្លឹកជីរស្រស់ កាន់តែឆ្ងាញ់។', 'Wrap grilled meat with green papaya pickle and fresh herbs for a bold bite.', '烤肉配木瓜泡菜和新鲜香草一起吃更过瘾。']],
    follow: ['grilled', 'spicy', 'seafood'],
  },
  {
    id: 'asian_foreign',
    emoji: '🍲',
    mode: 'bridge',
    test: /pad thai|tom yum|thai food|vietnam|banh mi|chinese food|japanese food|ថៃ|វៀតណាម|泰国菜|越南菜|中餐|日料/i,
    headline: ['AI យល់ថាអ្នកចង់ញ៉ាំម្ហូបអាស៊ីផ្សេង 🍲', 'AI thinks you want regional Asian flavours 🍲', 'AI 觉得您想吃亚洲风味 🍲'],
    explain: [
      'ខ្មែរមានរសជាតិជូរ ហឹរ ផ្អែម ប្រៃ ដូចជិតខាង — AI បានរកមុខម្ហូបខ្មែរដែលជិតស្និទ្ធបំផុតជាមួយរសជាតិនោះ។',
      'Khmer food shares the sour-spicy-sweet-salty balance of its neighbours — AI picked the closest Cambodian equivalents.',
      '高棉菜同样讲究酸辣甜咸平衡——AI 为您挑选了最接近的柬埔寨版本。',
    ],
    like: ['ជិតស្និទ្ធនឹងរសជាតិនោះព្រោះ៖', 'Closest match because:', '最接近的原因：'],
    prefer: /ម្ជូរ|sour|ជូរ|ហឹរ|spicy|ឆា|stir|គុយទាវ|noodle|គួង|spring roll|សម្លម្ជូរ/i,
    cats: ['soup', 'stirfry', 'noodles', 'salad'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'សម្លម្ជូរគ្រឿងសាច់ត្រី មានរសជាតិជូរសម្បូរស្មៅ ស្រដៀង Tom Yum ប៉ុន្តែប្រើអំពិល ស្លឹកម្រះព្រៅ និងគ្រឿងបុកខ្មែរ។',
        'Khmer sour soup (samlor machu) is herb-rich and tangy like Tom Yum but built on tamarind, holy basil and Khmer kroeung.',
        '高棉酸汤（Samlor Machu）与冬阴功一样香草浓郁、酸爽，但以罗望子、圣罗勒和高棉香料泥为底。',
      ],
    },
    tips: [['សុំកម្រិតហឹរតាមចំណូលចិត្ត មុនអ្នកលក់ចម្អិន។', 'Tell the cook your preferred spice level before they start.', '下单时告诉厨师您喜欢的辣度。']],
    follow: ['soup', 'spicy', 'surprise'],
  },
  {
    id: 'fastfood_snack',
    emoji: '🍟',
    mode: 'bridge',
    test: /french fries|\bfries\b|nachos|\btaco\b|burrito|shawarma|kebab|popcorn|chips|ដំឡូងបំពង|薯条|卷饼|烤串/i,
    headline: ['AI យល់ថាអ្នកចង់ញ៉ាំអាហារសម្រន់ស្រួយៗ 🍟', 'AI thinks you want a crunchy snack 🍟', 'AI 觉得您想吃酥脆小食 🍟'],
    explain: [
      'ខ្មែរមានអាហារសម្រន់តាមផ្លូវស្រួយៗ ចៀន ឬអាំង ដែលញ៉ាំលេងបានដោយមិនធុញ។',
      'Cambodia has plenty of crunchy fried and grilled street snacks you can happily keep nibbling.',
      '柬埔寨街头有许多酥脆的油炸或烧烤小吃，边走边吃毫不腻。',
    ],
    like: ['ជំនួសបានព្រោះ៖', 'A Khmer swap because:', '替代理由：'],
    prefer: /ចៀន|បំពង|ស្រួយ|crispy|fried|ប្រហិត|meatball|ចាដូវ|នំគ្រក់|num krok|អាំង|grill|ដោត|skewer/i,
    cats: ['streetfood', 'grilled'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'ប្រហិតសាច់គោអាំង ឬចៀន ញ៉ាំជាមួយទឹកជ្រលក់អំពិលទុំ និងជ្រក់ល្ហុង ជាអាហារសម្រន់ពេលល្ងាចដ៏ពេញនិយមនៅតាមមាត់ទន្លេ។',
        'Beef meatballs (grilled or fried) with tamarind dip and papaya pickle are a favourite riverside evening snack.',
        '烤或炸牛肉丸配罗望子酱与青木瓜泡菜，是河畔傍晚的人气小吃。',
      ],
    },
    tips: [['ជ្រលក់ជាមួយទឹកអំពិលទុំស្ករត្នោតម្ទេស និងជ្រក់ល្ហុងការ៉ុតស្រួយៗ។', 'Dip generously in spicy palm-sugar tamarind sauce with crunchy papaya pickles.', '蘸上香辣棕榈糖罗望子酱配脆木瓜泡菜最美味。']],
    follow: ['grilled', 'spicy', 'surprise'],
  },
  // ---- Moods & occasions (Food & Tourism only) ------------------------------------------------
  {
    id: 'cold_rain',
    emoji: '🌧️',
    mode: 'mood',
    test: /\brain|rainy|\bcold\b|chilly|winter|ភ្លៀង|ត្រជាក់|រងា|下雨|寒冷|很冷/i,
    headline: ['AI យល់ថាអាកាសធាតុត្រជាក់ — ចង់បានអ្វីក្តៅៗ 🌧️', 'AI senses cool, rainy weather — time for something hot 🌧️', 'AI 感觉天气凉爽有雨——来点热乎的 🌧️'],
    explain: [
      'AI ជ្រើសសម្ល ការី បបរ និងគុយទាវទឹកក្តៅៗ ដែលធ្វើឱ្យកក់ក្តៅពេលភ្លៀង។',
      'AI picked hot soups, curries, porridge and noodle bowls that warm you up on a rainy day.',
      'AI 选择了热汤、咖喱、粥和汤粉，雨天吃最暖心。',
    ],
    like: ['កក់ក្តៅព្រោះ៖', 'Warming because:', '暖身原因：'],
    prefer: /សម្ល|ស៊ុប|soup|ការី|curry|បបរ|porridge|គុយទាវ|noodle|អាម៉ុក|amok|ក្តៅ/i,
    cats: ['soup', 'noodles'],
    avoid: /ទឹកកក|ice|cold dessert/i,
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'អាម៉ុកត្រីចំហុយក្នុងកន្ទោងស្លឹកចេក រក្សាកម្តៅបានយូរ និងឈ្ងុយខ្ទិះដូង — ល្អសម្រាប់ថ្ងៃភ្លៀង។',
        'Fish amok steamed in banana-leaf cups stays warm for long and smells of coconut — perfect for a wet day.',
        '蕉叶杯蒸鱼阿莫克保温持久、椰香四溢，最适合雨天。',
      ],
    },
    tips: [['បន្ថែមម្រេចកំពត និងក្រូចឆ្មារ ដើម្បីរក្សារសជាតិឱ្យក្តៅឈ្ងុយ។', 'A little Kampot pepper and lime keeps the flavours bright and warming.', '加点贡布胡椒和青柠，风味更明亮暖心。']],
    follow: ['soup', 'noodles', 'grilled'],
  },
  {
    id: 'kids',
    emoji: '🧒',
    mode: 'mood',
    test: /\bkids?\b|child|children|toddler|\bbaby\b|កូន|កុមារ|ក្មេង|儿童|小孩|宝宝/i,
    headline: ['AI ជ្រើសម្ហូបសមស្របសម្រាប់កុមារ 🧒', 'AI picked kid-friendly dishes 🧒', 'AI 为小朋友挑选了适合的菜品 🧒'],
    explain: [
      'AI ជ្រើសម្ហូបទន់ៗ មិនហឹរ មានសាច់ ស៊ុត ឬបង្អែមស្រទន់ ដែលក្មេងៗចូលចិត្ត។',
      'AI chose soft, mild dishes with meat, egg or gentle sweets that children usually enjoy.',
      'AI 选择了柔软不辣、有肉有蛋或清甜的菜品，小朋友通常很喜欢。',
    ],
    like: ['ស័ក្តិសមសម្រាប់កុមារព្រោះ៖', 'Kid-friendly because:', '适合小朋友：'],
    prefer: /បាយ|rice|ប្រហិត|meatball|មាន់|chicken|ពងទា|egg|នំ|num|ចេក|banana|បង្អែម|dessert|គុយទាវ|noodle|សម្ល/i,
    avoid: /ហឹរ|ម្ទេស|ភ្លា|ឆៅ|ប្រហុក|spicy|chili|raw|prahok|ceviche/i,
    cats: ['rice', 'noodles', 'dessert', 'cake'],
    tips: [['សុំអ្នកលក់កុំដាក់ម្ទេស ហើយកាត់ជាដុំតូចៗងាយស្រួលញ៉ាំ។', 'Ask the seller to skip chili and cut food into bite-sized pieces.', '请商家不放辣椒，并把食物切小块。']],
    follow: ['sweet', 'rice', 'noodles'],
  },
  {
    id: 'budget',
    emoji: '💸',
    mode: 'mood',
    test: /cheap|budget|affordable|low price|ថោក|សន្សំ|ថវិកាតិច|便宜|实惠|省钱/i,
    headline: ['AI រកម្ហូបថោក ឆ្ងាញ់ ដែលអ្នកស្រុកញ៉ាំរាល់ថ្ងៃ 💸', 'AI found tasty everyday dishes that are easy on the wallet 💸', 'AI 为您找到平价又好吃的日常美食 💸'],
    explain: [
      'AI ជ្រើសម្ហូបប្រចាំថ្ងៃតាមផ្សារ និងតាមផ្លូវ — បាយ គុយទាវ បបរ និងអាហារសម្រន់ — ដែលជាធម្មតាតម្លៃសមរម្យ និងមានពិន្ទុខ្ពស់។',
      'AI picked everyday market and street dishes — rice, noodles, porridge and snacks — that are usually affordable and highly rated.',
      'AI 挑选了市场和街头的日常美食——米饭、粉面、粥和小吃——通常价格亲民、评分又高。',
    ],
    like: ['តម្លៃសមរម្យព្រោះ៖', 'Easy on the wallet because:', '平价之选：'],
    prefer: /បាយ|rice|គុយទាវ|kuy teav|noodle|បបរ|porridge|នំបុ័ង|num pang|នំបញ្ចុក|banh|មីឆា|លតឆា|lort/i,
    avoid: /crab|lobster|ក្តាម|ក្ដាម|prawn|បង្គា|amok|អាម៉ុក|steak/i,
    cats: ['rice', 'noodles', 'streetfood'],
    tips: [['ហាងតាមផ្លូវ និងផ្សារ ជាទូទៅមានតម្លៃសមរម្យ និងរសជាតិអ្នកស្រុកពិតៗ។', 'Street stalls and local markets offer authentic local flavors at great value.', '街边摊和本地市场价格亲民，味道最地道。']],
    follow: ['noodles', 'rice', 'surprise'],
  },
  {
    id: 'date_special',
    emoji: '💞',
    mode: 'mood',
    test: /romantic|anniversary|birthday|special occasion|\bdate\b|គូស្នេហ៍|ខួបកំណើត|ថ្ងៃកំណើត|ពិសេស|约会|浪漫|生日|纪念日/i,
    headline: ['AI ជ្រើសម្ហូបសម្រាប់ឱកាសពិសេស 💞', 'AI picked dishes for a special occasion 💞', 'AI 为特别场合挑选了美食 💞'],
    explain: [
      'AI ជ្រើសម្ហូបដែលស្អាត ឈ្ងុយ និងមានពិន្ទុខ្ពស់ — ល្អសម្រាប់ថតរូប និងចងចាំ។',
      'AI chose beautiful, fragrant and highly rated dishes — great for photos and memories.',
      'AI 选择了颜值高、香气足、评分高的菜品，适合拍照留念。',
    ],
    like: ['ពិសេសព្រោះ៖', 'Special because:', '特别之处：'],
    prefer: /អាម៉ុក|amok|ក្តាម|crab|បង្គា|prawn|lobster|ឡុកឡាក់|lok lak|អាំង|grill|សង់ខ្យា|custard|បង្អែម|dessert/i,
    cats: ['grilled', 'soup', 'dessert'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'អាម៉ុកដែលបម្រើក្នុងកន្ទោងស្លឹកចេក ឬផ្លែដូងខ្ចី ស្អាតលើតុ និងឈ្ងុយខ្ទិះ — ជារូបថតដែលអ្នកមិនភ្លេច។',
        'Amok served in a banana-leaf cup or young coconut looks stunning on the table and smells of coconut — a photo you will keep.',
        '蕉叶杯或嫩椰子盛装的阿莫克，摆盘漂亮、椰香浓郁，是值得留念的照片。',
      ],
    },
    tips: [['កក់ទុកតុជាមុន ជាពិសេសពេលល្ងាចចុងសប្តាហ៍។', 'Reserve a table in advance, especially on weekend evenings.', '周末晚上建议提前订位。']],
    follow: ['seafood', 'sweet', 'drink'],
  },
  {
    id: 'party_group',
    emoji: '🎉',
    mode: 'mood',
    test: /party|group|friends|gather|family dinner|ជួបជុំ|ជប់លៀង|មិត្តភក្តិ|គ្រួសារ|聚会|聚餐|朋友|家庭/i,
    headline: ['AI ជ្រើសម្ហូបសម្រាប់ជួបជុំ 🎉', 'AI picked dishes for sharing with friends & family 🎉', 'AI 为聚会分享挑选了美食 🎉'],
    explain: [
      'AI ជ្រើសម្ហូបអាំង ញាំ និងសម្ល ដែលអាចចែកគ្នាញ៉ាំជុំតុ — មួយចានមួយមុខ គ្រប់គ្នាស្កប់ចិត្ត។',
      'AI mixed grills, salads and soups that are easy to share around one table — something for everyone.',
      'AI 搭配了适合围桌分享的烧烤、凉拌和汤品，人人都有喜欢的。',
    ],
    like: ['ស័ក្តិសមជួបជុំព្រោះ៖', 'Great for sharing because:', '适合分享：'],
    prefer: /អាំង|grill|ញាំ|salad|ភ្លា|ត្រី|fish|ក្តាម|crab|បង្គា|prawn|ឡុកឡាក់|lok lak/i,
    soft: /សម្ល|soup/i,
    cats: ['grilled', 'salad'],
    surprise: {
      title: DID_YOU_KNOW,
      text: [
        'ម្ហូបខ្មែរជាម្ហូបចែក — ញាំជូរ សាច់អាំង សម្ល និងបាយ ដាក់កណ្តាលតុ ទើបរសជាតិពេញលេញ។',
        'Khmer dining is made for sharing — a zesty salad, grilled meat, soup and rice in the middle of the table is the full experience.',
        '高棉用餐讲究分享——酸辣凉拌、烧烤、汤和米饭摆在桌子中央才是完整体验。',
      ],
    },
    tips: [['បញ្ជាម្ហូប ៤–៥ មុខសម្រាប់ ៤ នាក់ ទើបគ្រប់គ្រាន់ និងមានភាពចម្រុះ។', 'Order 4–5 dishes for 4 people for variety without waste.', '4 人点 4–5 道菜，丰富又不浪费。']],
    follow: ['drink', 'seafood', 'grilled'],
  },
  {
    id: 'breakfast',
    emoji: '🌅',
    mode: 'mood',
    test: /breakfast|morning|brunch|ពេលព្រឹក|អាហារពេលព្រឹក|早餐|早上/i,
    headline: ['AI ណែនាំអាហារពេលព្រឹកបែបខ្មែរ 🌅', 'AI suggests a proper Khmer breakfast 🌅', 'AI 推荐地道的高棉早餐 🌅'],
    explain: [
      'ពេលព្រឹកអ្នកស្រុកញ៉ាំគុយទាវ បបរ នំបញ្ចុក និងបាយសាច់ជ្រូក — ក្តៅៗ ឆ្អែតល្អ ចាប់ផ្តើមថ្ងៃថ្មី។',
      'Locals start the day with kuy teav, porridge, num banh chok or pork rice — hot, filling and delicious.',
      '当地人早上常吃粿条、粥、米线和猪肉饭——热乎、顶饱又美味。',
    ],
    like: ['ស័ក្តិសមពេលព្រឹកព្រោះ៖', 'Perfect for the morning because:', '适合早晨：'],
    prefer: /គុយទាវ|kuy teav|បបរ|porridge|នំបញ្ចុក|banh|បាយសាច់ជ្រូក|pork rice|នំបុ័ង|num pang|មី/i,
    cats: ['noodles', 'rice'],
    tips: [['ញ៉ាំមុនម៉ោង ៩ ព្រឹក ដើម្បីបានម្ហូបស្រស់ៗ និងទឹកស៊ុបក្តៅៗ។', 'Eat before 9 am for the freshest food and hottest broth.', '上午 9 点前去吃，食材最新鲜、汤最热。']],
    follow: ['noodles', 'rice', 'soup'],
  },
  {
    id: 'late_night',
    emoji: '🌙',
    mode: 'mood',
    test: /late night|midnight|supper|night snack|ពេលយប់|យប់ជ្រៅ|宵夜|深夜/i,
    headline: ['AI ណែនាំអាហារពេលយប់ 🌙', 'AI suggests late-night bites 🌙', 'AI 推荐宵夜 🌙'],
    explain: [
      'AI ជ្រើសបបរ គុយទាវ លតឆា និងអាហារសម្រន់អាំង ដែលពេញនិយមតាមផ្លូវពេលយប់។',
      'AI picked porridge, noodles, lort cha and grilled snacks — easy to find at night stalls.',
      'AI 选择了粥、粉面、炒短粉和烧烤小吃——夜市最受欢迎的宵夜之选。',
    ],
    like: ['ស័ក្តិសមពេលយប់ព្រោះ៖', 'Great late at night because:', '适合夜宵：'],
    prefer: /បបរ|porridge|គុយទាវ|kuy teav|លតឆា|lort|អាំង|grill|ប្រហិត|meatball|នំបុ័ង|num pang/i,
    cats: ['noodles', 'streetfood', 'grilled'],
    tips: [['បបរសត្រីងៀត ឬលតឆាក្តៅៗ ជាអាហារពេលយប់ដ៏ពេញនិយមបំផុតនៅភ្នំពេញ។', 'Teochew-Khmer rice congee or hot Lort Cha are classic Phnom Penh late-night favourites.', '白粥配咸鱼咸蛋或热炒短粉是金边经典宵夜。']],
    follow: ['soup', 'grilled', 'noodles'],
  },
  {
    id: 'surprise_me',
    emoji: '🎁',
    mode: 'discover',
    test: /surprise|random|anything|whatever|any dish|ភ្ញាក់ផ្អើល|អ្វីក៏បាន|ឆ្ងាញ់ណាក៏បាន|惊喜|随便|随机/i,
    headline: ['🎁 AI ភ្ញាក់ផ្អើលអ្នកហើយ!', '🎁 AI has a surprise for you!', '🎁 AI 为您准备了惊喜！'],
    explain: ['', '', ''],
    like: ['', '', ''],
    tips: [],
    follow: ['spicy', 'sweet', 'drink'],
  },
];

function textOf(food: FoodItem): { name: string; all: string } {
  const name = `${food.nameKh || ''} ${food.nameEn || ''}`;
  return {
    name,
    all: `${name} ${food.descriptionKh || ''} ${food.descriptionEn || ''} ${food.categoryKh || ''} ${food.categoryEn || ''}`,
  };
}

function scoreForEntry(food: FoodItem, entry: BrainEntry): number {
  const { name, all } = textOf(food);
  let s = 0;
  if (entry.prefer) {
    if (entry.prefer.test(name)) s += 120;
    else if (entry.prefer.test(all)) s += 55;
  }
  if (entry.soft) {
    if (entry.soft.test(name)) s += 40;
    else if (entry.soft.test(all)) s += 15;
  }
  if (entry.cats && entry.cats.includes(food.categorySlug as string)) s += 40;
  if (entry.avoid && entry.avoid.test(all)) s -= 160;
  if (entry.avoidCats && entry.avoidCats.includes(food.categorySlug as string)) s -= 300;
  s += ((food.rating || 4.5) - 4) * 25;
  return s;
}

function rotate<T>(arr: T[], seed: number, step = 2): T[] {
  if (arr.length === 0) return arr;
  const offset = (((seed || 1) - 1) * step) % arr.length;
  return [...arr.slice(offset), ...arr.slice(0, offset)];
}

function toBrainDish(food: FoodItem, reason: string): BrainDish {
  return { food, reason, allergens: detectAllergens(food) };
}

function pickForEntry(foods: FoodItem[], entry: BrainEntry, seed: number, language: Language, limit = 4): BrainDish[] {
  let ranked: FoodItem[] = foods
    .map((food) => ({ food, s: scoreForEntry(food, entry) }))
    .filter((x) => x.s > 40)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.food);
  if (ranked.length < 3) {
    const filler = [...foods].sort((a, b) => (b.rating || 0) - (a.rating || 0)).filter((f) => !ranked.includes(f));
    ranked = [...ranked, ...filler.slice(0, 4 - ranked.length)];
  }
  const pool = ranked.slice(0, Math.max(limit, Math.min(ranked.length, 12)));
  const chosen = rotate(pool, seed).slice(0, limit);
  const label = tr(language, entry.like[0], entry.like[1], entry.like[2]);
  return chosen.map((food) => toBrainDish(food, `${label} ${describeDish(food, language)}`));
}

function buildFromEntry(
  entry: BrainEntry,
  foods: FoodItem[],
  language: Language,
  canUseVip: boolean,
  seed: number
): AiBrainInsight {
  const t = (v: T3) => tr(language, v[0], v[1], v[2]);
  const base: AiBrainInsight = {
    mode: entry.mode,
    entryId: entry.id,
    emoji: entry.emoji,
    headline: t(entry.headline),
    explanation: t(entry.explain),
    dishes: [],
    surprise: entry.surprise ? { title: t(entry.surprise.title), text: t(entry.surprise.text) } : undefined,
    tips: entry.tips.map(t),
    followUps: chipsFor(entry.follow, language),
  };

  if (entry.mode === 'drink') {
    const ranked = rankDrinkPairingDishes(foods, 'all');
    base.pairingCount = ranked.length;
    if (!canUseVip) {
      base.vipLock = true;
      return base;
    }
    const top = rotate(ranked.slice(0, 14), seed, 3).slice(0, 5);
    base.dishes = top.map(({ food, info }) =>
      toBrainDish(food, `${pairingKindsLabel(info.kinds, language)} — ${pairingReason(info, language)}`)
    );
    return base;
  }

  base.dishes = pickForEntry(foods, entry, seed, language);
  return base;
}

/**
 * Polite Scope Boundary Refusal when user asks any medical, symptom, or disease-related question.
 * Never gives medical advice, health disclaimers, or food recommendations for diseases.
 */
export function buildMedicalScopeNotice(language: Language): AiBrainInsight {
  return {
    mode: 'scope_notice',
    entryId: 'medical_scope_boundary',
    emoji: '🍽️',
    headline: tr(
      language,
      'ជំនួយការ AI សម្រាប់ម្ហូបអាហារ និងទេសចរណ៍កម្ពុជាប៉ុណ្ណោះ',
      'AI Assistant Exclusively for Cambodia Food & Tourism',
      '本 AI 助手专为柬埔寨美食与旅游而设计'
    ),
    explanation: tr(
      language,
      'សូមអភ័យទោស ជំនួយការ AI នេះត្រូវបានបង្កើតឡើងសម្រាប់តែការស្វែងរកមុខម្ហូបខ្មែរ រូបមន្តធ្វើម្ហូប ភោជនីយដ្ឋាន និងតំបន់ទេសចរណ៍នៅកម្ពុជាប៉ុណ្ណោះ។ យើងខ្ញុំមិនអាចឆ្លើយសំណួរអំពីជំងឺ រោគសញ្ញា ថ្នាំពេទ្យ ឬការព្យាបាលសុខភាពតាមរយៈអាហារបានទេ។ សូមសាកល្បងសួរអំពីមុខម្ហូប ឬកន្លែងដើរលេងខាងក្រោម៖',
      'This AI Assistant is designed exclusively for discovering Cambodian cuisine, recipes, cooking methods, restaurants, and tourism in Cambodia. I cannot answer questions about diseases, medical conditions, symptoms, medications, or treating health issues through food. Feel free to ask me about delicious Khmer dishes, recipes, or travel destinations below:',
      '抱歉，本 AI 助手专为探索柬埔寨美食、食谱做法、餐厅推荐及旅游景点而设计，无法回答有关疾病、症状、药物或食疗康复的问题。欢迎向我询问以下高棉美食或旅游景点：'
    ),
    dishes: [],
    tips: [],
    followUps: chipsFor(['soup', 'grilled', 'seafood', 'spicy', 'sweet', 'tourism'], language),
  };
}

function buildBlocked(foods: FoodItem[], language: Language, seed: number): AiBrainInsight {
  const popular = [...foods]
    .filter((f) => !ALWAYS_SAFE_RAW.test(`${f.nameKh} ${f.nameEn}`))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0))
    .slice(0, 12);
  const picks = rotate(popular, seed).slice(0, 3);
  return {
    mode: 'blocked',
    entryId: 'blocked',
    emoji: '🛡️',
    headline: tr(language, 'AI មិនអាចជួយរឿងនេះបានទេ 🛡️', 'AI can’t help with that 🛡️', 'AI 无法协助此请求 🛡️'),
    explanation: tr(
      language,
      'AI ណែនាំតែមុខម្ហូបខ្មែរ និងតំបន់ទេសចរណ៍ស្របច្បាប់ប៉ុណ្ណោះ — នេះជាម្ហូបពេញនិយមដែលអ្នកអាចសាកល្បងជំនួស៖',
      'AI only recommends legal, authentic Cambodian foods and destinations — here are popular dishes you can try instead:',
      'AI 仅推荐合法、正宗的柬埔寨美食与景点——以下是人气美食供您参考：'
    ),
    dishes: picks.map((f) =>
      toBrainDish(f, `${tr(language, 'ពេញនិយមបំផុត', 'Crowd favourite', '人气之选')} ⭐ ${f.rating} • ${describeDish(f, language)}`)
    ),
    tips: [],
    followUps: chipsFor(['surprise', 'soup', 'grilled'], language),
  };
}

function buildDiscover(
  foods: FoodItem[],
  language: Language,
  seed: number,
  query: string,
  explicitSurprise: boolean,
  hour: number
): AiBrainInsight {
  const safePool = foods.filter((f) => !ALWAYS_SAFE_RAW.test(`${f.nameKh} ${f.nameEn}`));
  const byRating = [...safePool].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const slot =
    hour >= 5 && hour < 10
      ? { cats: ['noodles', 'rice'], label: tr(language, 'ស័ក្តិសមពេលព្រឹក', 'Perfect for this morning', '适合早晨') }
      : hour >= 10 && hour < 14
        ? { cats: ['rice', 'stirfry', 'noodles'], label: tr(language, 'ស័ក្តិសមថ្ងៃត្រង់', 'Great for lunch', '适合午餐') }
        : hour >= 14 && hour < 17
          ? { cats: ['dessert', 'cake', 'streetfood'], label: tr(language, 'ស័ក្តិសមពេលរសៀល', 'Great afternoon treat', '适合下午茶') }
          : hour >= 17 && hour < 22
            ? { cats: ['grilled', 'soup', 'salad'], label: tr(language, 'ស័ក្តិសមពេលល្ងាច', 'Great for dinner', '适合晚餐') }
            : { cats: ['soup', 'noodles'], label: tr(language, 'ស័ក្តិសមពេលយប់', 'Great for late night', '适合夜宵') };
  const timePool = byRating.filter((f) => slot.cats.includes(f.categorySlug as string)).slice(0, 8);
  const timePick = rotate(timePool.length ? timePool : byRating, seed, 1)[0];

  const gemPool = byRating
    .filter((f) => (f.rating || 0) >= 4.7 && f.id !== timePick?.id)
    .sort((a, b) => (a.reviewCount || 0) - (b.reviewCount || 0))
    .slice(0, 8);
  const gem = rotate(gemPool, seed, 1)[0];

  const crowd = [...safePool]
    .sort((a, b) => (b.rating || 0) * Math.log((b.reviewCount || 1) + 2) - (a.rating || 0) * Math.log((a.reviewCount || 1) + 2))
    .filter((f) => f.id !== timePick?.id && f.id !== gem?.id)
    .slice(0, 8);
  const crowdPick = rotate(crowd, seed, 1)[0];

  const used = new Set([timePick?.id, gem?.id, crowdPick?.id]);
  const wild = rotate(
    safePool.filter((f) => !used.has(f.id) && (f.rating || 0) >= 4.5),
    seed * 3,
    5
  )[0];

  const dishes: BrainDish[] = [];
  if (timePick) dishes.push(toBrainDish(timePick, `⏰ ${slot.label} • ${describeDish(timePick, language)}`));
  if (gem)
    dishes.push(
      toBrainDish(
        gem,
        `💎 ${tr(language, 'ម្ហូបលាក់កំបាំង', 'Hidden gem', '隐藏好味')} ⭐ ${gem.rating} • ${describeDish(gem, language)}`
      )
    );
  if (crowdPick)
    dishes.push(
      toBrainDish(
        crowdPick,
        `🔥 ${tr(language, 'ពេញនិយមបំផុត', 'Crowd favourite', '人气之选')} ⭐ ${crowdPick.rating} • ${describeDish(crowdPick, language)}`
      )
    );
  if (wild)
    dishes.push(
      toBrainDish(
        wild,
        `🎲 ${tr(language, 'ជម្រើសផ្សងព្រេង', 'Adventurous pick', '大胆尝鲜')} • ${describeDish(wild, language)}`
      )
    );

  const headline = explicitSurprise
    ? tr(language, '🎁 AI ភ្ញាក់ផ្អើលអ្នកហើយ!', '🎁 AI has a surprise for you!', '🎁 AI 为您准备了惊喜！')
    : tr(
        language,
        `✨ AI ណែនាំមុខម្ហូបខ្មែរសម្រាប់ «${query}»`,
        `✨ AI Culinary Picks for “${query}”`,
        `✨ AI 为“${query}”精选的高棉美食`
      );
  const explanation = explicitSurprise
    ? tr(
        language,
        'AI ផ្សំម្ហូបស័ក្តិសមពេលនេះ ម្ហូបលាក់កំបាំង ម្ហូបពេញនិយម និងម្ហូបផ្សងព្រេង ឱ្យអ្នកសាកល្បង។',
        'AI mixed a pick for right now, a hidden gem, a crowd favourite and an adventurous wildcard.',
        'AI 为您搭配了应时之选、隐藏好味、人气美食和大胆尝鲜。'
      )
    : tr(
        language,
        'ប្រាប់ AI បន្ថែមអំពីរសជាតិ (ជូរហឹរ សាច់អាំង សម្លក្តៅៗ បង្អែម) ឬកន្លែងដើរលេង ដើម្បីឱ្យ AI ណែនាំកាន់តែត្រូវចិត្ត។',
        'Tell AI more about your flavor preference (spicy, grilled, soup, sweet) or travel destination for tailored picks.',
        '告诉 AI 更多风味偏好（酸辣、烧烤、热汤、甜品）或旅游目的地，推荐会更精准。'
      );

  return {
    mode: 'discover',
    entryId: explicitSurprise ? 'surprise_me' : 'discover',
    emoji: explicitSurprise ? '🎁' : '✨',
    headline,
    explanation,
    dishes,
    surprise: gem
      ? {
          title: tr(language, '💎 ម្ហូបលាក់កំបាំងប្រចាំថ្ងៃ', '💎 Hidden gem of the day', '💎 今日隐藏好味'),
          text: tr(
            language,
            `AI រកឃើញ «${gem.nameKh}» ពិន្ទុ ⭐ ${gem.rating} តែមានមតិតែ ${gem.reviewCount} — សាកល្បងមុនគេ!`,
            `AI found “${gem.nameEn}” rated ⭐ ${gem.rating} with only ${gem.reviewCount} reviews — try it before everyone else!`,
            `AI 发现“${gem.nameEn}”评分 ⭐ ${gem.rating}，评价仅 ${gem.reviewCount} 条——抢先尝鲜！`
          ),
        }
      : undefined,
    tips: [
      tr(
        language,
        'ចុចលើជម្រើសខាងក្រោម ឬសួរ AI បន្តអំពីរូបមន្ត ហាងអាហារ និងតំបន់ទេសចរណ៍។',
        'Tap a chip below or ask a follow-up about recipes, restaurants, and tourist attractions.',
        '点击下方标签，或继续询问食谱、餐厅推荐与旅游景点。'
      ),
    ],
    followUps: chipsFor(['spicy', 'grilled', 'sweet', 'drink'], language),
  };
}

export interface BrainParams {
  foods: FoodItem[];
  query: string;
  language: Language;
  canUseVip: boolean;
  seed: number;
  directMatchCount: number;
  hasTitleMatch: boolean;
  hour?: number;
}

export function buildAiBrainInsight(params: BrainParams): AiBrainInsight | null {
  const { foods, language, canUseVip, seed, directMatchCount, hasTitleMatch } = params;
  const raw = sanitizeCravingQuery(params.query);
  if (!raw || foods.length === 0) return null;
  const q = raw.toLowerCase();

  // 1. Strict Medical / Disease Scope Boundary Refusal (Always takes precedence!)
  if (isMedicalOrHealthQuery(raw)) {
    return buildMedicalScopeNotice(language);
  }

  // 2. Unsafe / illegal substance block
  if (UNSAFE_RE.test(q)) return buildBlocked(foods, language, seed);

  // 3. Literal dish-name search wins over foreign-dish bridges
  if (hasTitleMatch) return null;

  for (const entry of BRAIN_ENTRIES) {
    if (!entry.test.test(q)) continue;
    if (entry.mode === 'bridge' && directMatchCount > 0) continue;
    if (entry.mode === 'discover') {
      return buildDiscover(foods, language, seed, raw, true, params.hour ?? new Date().getHours());
    }
    return buildFromEntry(entry, foods, language, canUseVip, seed);
  }

  if (directMatchCount === 0) {
    return buildDiscover(foods, language, seed, raw, false, params.hour ?? new Date().getHours());
  }
  return null;
}

import { isPlaceLocationVerified, type FoodItem, type Language, type Restaurant, type TouristDestination } from '../types';
import { tr } from '../utils/i18n';
import { normalizeKhmerFoodText, parseKhmerFoodSearchQuery, searchKhmerFoods } from '../utils/khmerFoodSearch';
import { generateAuthenticRecipeByDishName } from '../utils/khmerRecipeGenerator';
import {
  translateUniversalDishQuery,
  getCachedUniversalDishPhoto,
  fetchUniversalDishPhotoFromOpenApis,
} from '../utils/universalDishOpenApi';
import { getLocalizedFood, getLocalizedRestaurant, getLocalizedDestination } from '../utils/zhDynamicTranslator';
import { isMedicalOrHealthQuery, buildMedicalScopeNotice, describeDish, type BrainChip } from './aiFoodBrain';
import { getAiFoodAdvisorRecommendations, isVegetarianQuery } from './aiFoodAdvisorService';
import { getCloudApiConfig } from './supabaseService';

export type AiTurnIntent =
  | 'welcome'
  | 'food_discovery'
  | 'dish_comparison'
  | 'recipe_detail'
  | 'restaurant_recommend'
  | 'tourism_discovery'
  | 'beverage_pairing'
  | 'medical_scope_refusal';

export interface AiRecipePreview {
  food: FoodItem;
  ingredients: Array<{ name: string; amount: string }>;
  steps: Array<{ stepNumber: number; instruction: string }>;
}

export interface AiAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  intent?: AiTurnIntent;
  dishes?: FoodItem[];
  similarDishes?: FoodItem[];
  compareDishes?: FoodItem[];
  vegetarianNote?: string;
  restaurantUnavailableNote?: string;
  googleMapsSearchQuery?: string;
  recipePreview?: AiRecipePreview;
  restaurants?: Restaurant[];
  destinations?: TouristDestination[];
  followUpChips?: BrainChip[];
  triggerDrinkSets?: boolean;
  isScopeRefusal?: boolean;
  isLiveGemini?: boolean;
}

export interface AiConversationMemory {
  lastDishes: FoodItem[];
  lastRestaurants: Restaurant[];
  lastDestinations: TouristDestination[];
  activeProvinceKh: string;
  lastQuery: string;
  turnSeed: number;
}

const PROVINCE_PATTERNS: Array<{ kh: string; en: string; zh: string; re: RegExp }> = [
  { kh: 'សៀមរាប', en: 'Siem Reap', zh: '暹粒', re: /សៀមរាប|siem\s*reap|angkor|អង្គរ|暹粒|吴哥/i },
  { kh: 'ភ្នំពេញ', en: 'Phnom Penh', zh: '金边', re: /ភ្នំពេញ|phnom\s*penh|金边/i },
  { kh: 'កំពត', en: 'Kampot', zh: '贡布', re: /កំពត|kampot|បូកគោ|bokor|贡布|波哥山/i },
  { kh: 'កែប', en: 'Kep', zh: '白马', re: /កែប|\bkep\b|កោះទន្សាយ|ផ្សារក្តាម|ផ្សារក្ដាម|白马省|白马海滩|螃蟹市场/i },
  { kh: 'ព្រះសីហនុ', en: 'Preah Sihanouk', zh: '西哈努克', re: /ព្រះសីហនុ|កំពង់សោម|sihanouk|កោះរ៉ុង|koh\s*rong|អូរឈើទាល|西哈努克|西港|高龙岛/i },
  { kh: 'បាត់ដំបង', en: 'Battambang', zh: '马德望', re: /បាត់ដំបង|battambang|ភ្នំសំពៅ|ឡូរី|马德望/i },
  { kh: 'មណ្ឌលគិរី', en: 'Mondulkiri', zh: '蒙多基里', re: /មណ្ឌលគិរី|mondulkiri|ប៊ូស្រា|bousra|សែនមនោរម្យ|蒙多基里|布斯拉/i },
  { kh: 'រតនគិរី', en: 'Ratanakiri', zh: '拉达那基里', re: /រតនគិរី|ratanakiri|យក្សឡោម|yeak\s*laom|បានលុង|拉达那基里|野龙湖/i },
  { kh: 'កោះកុង', en: 'Koh Kong', zh: '国公省', re: /កោះកុង|koh\s*kong|តាតៃ|tatai|អារ៉ែង|ផាមក្រសោប|ពាមក្រសោប|国公省|塔泰/i },
  { kh: 'ក្រចេះ', en: 'Kratie', zh: '桔井', re: /ក្រចេះ|kratie|ផ្សោត|កាំពី|កោះទ្រង់|桔井|江豚/i },
  { kh: 'កំពង់ចាម', en: 'Kampong Cham', zh: '磅湛', re: /កំពង់ចាម|kampong\s*cham|កោះប៉ែន|磅湛/i },
  { kh: 'កំពង់ធំ', en: 'Kampong Thom', zh: '磅同', re: /កំពង់ធំ|kampong\s*thom|សំបូរព្រៃគុក|sambor\s*prei\s*kuk|磅同/i },
  { kh: 'កំពង់ស្ពឺ', en: 'Kampong Speu', zh: '磅士卑', re: /កំពង់ស្ពឺ|kampong\s*speu|គិរីរម្យ|kirirom|ឱរ៉ាល់|磅士卑|基里隆/i },
  { kh: 'កំពង់ឆ្នាំង', en: 'Kampong Chhnang', zh: '磅清扬', re: /កំពង់ឆ្នាំង|kampong\s*chhnang|磅清扬/i },
  { kh: 'កណ្តាល', en: 'Kandal', zh: '干丹', re: /កណ្តាល|កណ្ដាល|kandal|ឧត្តុង្គ|oudong|កោះឧកញ៉ាតី|干丹|乌栋/i },
  { kh: 'តាកែវ', en: 'Takeo', zh: '茶胶', re: /តាកែវ|takeo|ភ្នំដា|ភ្នំជីសូរ|ទន្លេបាទី|ភ្នំតាម៉ៅ|茶胶/i },
  { kh: 'ពោធិ៍សាត់', en: 'Pursat', zh: '菩萨省', re: /ពោធិ៍សាត់|pursat|ភ្នំ\s*១៥០០|ភ្នំ\s*1500|វាលវែង|ច្រកល្អៀង|菩萨省/i },
  { kh: 'ព្រះវិហារ', en: 'Preah Vihear', zh: '柏威夏', re: /ព្រះវិហារ|preah\s*vihear|កោះកេរ|koh\s*ker|柏威夏|贡开/i },
  { kh: 'បន្ទាយមានជ័យ', en: 'Banteay Meanchey', zh: '班迭棉吉', re: /បន្ទាយមានជ័យ|banteay\s*meanchey|បន្ទាយឆ្មារ|班迭棉吉/i },
  { kh: 'ប៉ៃលិន', en: 'Pailin', zh: '拜林', re: /ប៉ៃលិន|pailin|ភ្នំយ៉ាត|拜林/i },
  { kh: 'ស្ទឹងត្រែង', en: 'Stung Treng', zh: '上丁', re: /ស្ទឹងត្រែង|stung\s*treng|សុភមិត្ត|上丁/i },
  { kh: 'ព្រៃវែង', en: 'Prey Veng', zh: '波罗勉', re: /ព្រៃវែង|prey\s*veng|បាភ្នំ|បឹងស្នេហ៍|波罗勉/i },
  { kh: 'ស្វាយរៀង', en: 'Svay Rieng', zh: '柴桢', re: /ស្វាយរៀង|svay\s*rieng|បាវិត|柴桢/i },
  { kh: 'ឧត្តរមានជ័យ', en: 'Oddar Meanchey', zh: '奥多棉吉', re: /ឧត្តរមានជ័យ|oddar\s*meanchey|អន្លង់វែង|奥多棉吉/i },
  { kh: 'ត្បូងឃ្មុំ', en: 'Tboung Khmum', zh: '特本克蒙', re: /ត្បូងឃ្មុំ|tboung\s*khmum|ហោង|特本克蒙/i },
];

const RECIPE_INTENT_RE =
  /រូបមន្ត|គ្រឿងផ្សំ|របៀបធ្វើ|របៀបចម្អិន|(?:ធ្វើ|ចម្អិន|ស្ល|ឆា|អាំង|បំពង)\s*(?:ដូច)?(?:ម៉េច|ម្តេច|ម្ដេច|បែបណា|យ៉ាងម៉េច|យ៉ាងណា)(?:\s*ខ្លះ)?|វិធីធ្វើ|វិធីចម្អិន|ដាក់គ្រឿងអ្វីខ្លះ|ប្រើគ្រឿងផ្សំអ្វីខ្លះ|recipe|ingredient|how to cook|how to make|how do i make|cooking step|做法|食谱|菜谱|食材|配料|怎么做|如何制作/i;

const RESTAURANT_INTENT_RE =
  /ហាងណា|ញ៉ាំនៅណា|ភោជនីយដ្ឋាន|ហាងអាហារ|រកហាង|ណែនាំហាង|ហាងលក់|where to eat|which restaurant|recommend.*restaurant|find.*shop|best place to eat|哪里吃|哪家餐厅|推荐餐厅|去哪吃|餐馆|饭店/i;

const TOURISM_INTENT_RE =
  /ដើរលេង|ទេសចរណ៍|កន្លែងដើរលេង|រមណីយដ្ឋាន|ប្រាសាទ|ឆ្នេរ|ទឹកធ្លាក់|ទឹកជ្រោះ|ភ្នំ|កោះ|ដំណើរកម្សាន្ត|ទៅលេង|គួរទៅណា|tourism|tourist|travel|attraction|sightseeing|places to visit|where to go|temple|beach|waterfall|island|mountain|vacation|itinerary|旅游|景点|好玩|去哪玩|打卡|寺庙|海滩|海岛|瀑布|国家公园|自由行/i;

type TourismCategory = 'beach' | 'temple' | 'waterfall' | 'mountain';

const COASTAL_PROVINCES_KH = ['ព្រះសីហនុ', 'កែប', 'កំពត', 'កោះកុង'];

/**
 * Remove words that look like tourism keywords but are NOT tourism requests:
 * "ភ្នំពេញ" (contains ភ្នំ = mountain), "គ្រឿងសមុទ្រ" / "seafood" / "海鲜" (contains sea),
 * and province names that start with "កោះ" (island).
 */
function stripTourismHomonyms(input: string): string {
  return input
    .replace(/គ្រឿងសមុទ្រ|seafood|海鲜/gi, ' ')
    .replace(/ភ្នំពេញ|phnom\s*penh|金边/gi, ' ')
    .replace(/កោះកុង|koh\s*kong|កោះកេរ|koh\s*ker|កោះឧកញ៉ាតី/gi, ' ');
}

const TOURISM_CATEGORY_PATTERNS: Array<{ cat: TourismCategory; re: RegExp }> = [
  { cat: 'beach', re: /សមុទ្រ|ឆ្នេរ|កោះ|beach|\bsea\b|seaside|ocean|coast|island|大海|海边|海滩|看海|海岛|岛屿/i },
  { cat: 'waterfall', re: /ទឹកធ្លាក់|ទឹកជ្រោះ|waterfall|瀑布/i },
  { cat: 'temple', re: /ប្រាសាទ|វត្ត|temple|pagoda|寺|庙|古迹/i },
  { cat: 'mountain', re: /ភ្នំ|mountain|hiking|national\s*park|山|国家公园/i },
];

function detectTourismCategory(input: string): TourismCategory | null {
  const cleaned = stripTourismHomonyms(input);
  for (const p of TOURISM_CATEGORY_PATTERNS) {
    if (p.re.test(cleaned)) return p.cat;
  }
  return null;
}

function isCoastalProvince(provinceKh?: string): boolean {
  const p = (provinceKh || '').replace(/^រាជធានី|^ខេត្ត/, '');
  return COASTAL_PROVINCES_KH.some((c) => p.includes(c));
}

function destinationMatchesCategory(d: TouristDestination, cat: TourismCategory): boolean {
  const names = stripTourismHomonyms(`${d.nameKh || ''} ${d.nameEn || ''}`);
  const fullText = stripTourismHomonyms(`${names} ${d.descriptionKh || ''} ${d.descriptionEn || ''}`);
  switch (cat) {
    case 'beach':
      return (
        d.categorySlug === 'beach' ||
        (isCoastalProvince(d.provinceKh) && /ឆ្នេរ|កោះ|សមុទ្រ|beach|island|bay|\bsea\b|coast/i.test(names))
      );
    case 'temple':
      return d.categorySlug === 'temple' || /ប្រាសាទ|វត្ត|temple|pagoda/i.test(names);
    case 'waterfall':
      return /ទឹកធ្លាក់|ទឹកជ្រោះ|waterfall/i.test(names) || (/ទឹកធ្លាក់|ទឹកជ្រោះ|waterfall/i.test(fullText) && d.categorySlug === 'nature');
    case 'mountain':
      return d.categorySlug === 'mountain' || /ភ្នំ|mountain|national\s*park/i.test(names);
    default:
      return false;
  }
}

/** Rank by featured + rating, then interleave provinces so results are diverse (not 4 places from one city). */
function rankAndDiversifyDestinations(
  list: TouristDestination[],
  excludeIds: Set<string>,
  limit: number
): TouristDestination[] {
  const sorted = [...list].sort(
    (a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) || (b.rating || 0) - (a.rating || 0)
  );
  const fresh = sorted.filter((d) => !excludeIds.has(d.id));
  const pool = fresh.length >= limit ? fresh : sorted;
  const byProvince = new Map<string, TouristDestination[]>();
  for (const d of pool) {
    const key = d.provinceKh || d.provinceEn || '';
    if (!byProvince.has(key)) byProvince.set(key, []);
    byProvince.get(key)!.push(d);
  }
  const out: TouristDestination[] = [];
  const queues = Array.from(byProvince.values());
  while (out.length < limit && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next) out.push(next);
      if (out.length >= limit) break;
    }
  }
  return out;
}

const TOURISM_CATEGORY_LABELS: Record<TourismCategory | 'all', { emoji: string; km: string; en: string; zh: string }> = {
  beach: { emoji: '🏖️', km: 'ឆ្នេរសមុទ្រ និងកោះស្អាតៗ', en: 'beautiful beaches & islands', zh: '美丽海滩与海岛' },
  temple: { emoji: '🛕', km: 'ប្រាសាទ និងវត្តអារាមល្បីៗ', en: 'famous temples & pagodas', zh: '著名寺庙与古迹' },
  waterfall: { emoji: '💦', km: 'ទឹកធ្លាក់ស្អាតៗ', en: 'beautiful waterfalls', zh: '美丽瀑布' },
  mountain: { emoji: '⛰️', km: 'ភ្នំ និងឧទ្យានជាតិ', en: 'mountains & national parks', zh: '山脉与国家公园' },
  all: { emoji: '🏛️', km: 'តំបន់ទេសចរណ៍ល្បីៗ', en: 'top tourist attractions', zh: '热门旅游景点' },
};

const DRINK_PAIRING_INTENT_RE =
  /ម្ហូបអមភេសជ្ជៈ|ម្ហូបអមស្រាបៀរ|ក្លែម|ជុំតុ|ស្រាបៀរ|beverage pairing|drink pairing|beer food|bar food|下酒菜|佐餐|配啤酒/i;

const MORE_FOLLOWUP_RE =
  /^(ម្ហូបផ្សេង|ផ្សេងទៀត|ប្តូរ|សុំផ្សេង|ណែនាំទៀត|more|another|other dishes|something else|next|换一批|其他的|再来几个|换别的)$/i;

export function detectProvinceFromText(input: string): { kh: string; en: string; zh: string } | null {
  for (const p of PROVINCE_PATTERNS) {
    if (p.re.test(input)) return p;
  }
  return null;
}

export function buildWelcomeAssistantMessage(language: Language, foodCount: number, shopCount: number, destCount: number): AiAssistantMessage {
  return {
    id: 'ai-welcome',
    role: 'assistant',
    timestamp: new Date().toISOString(),
    intent: 'welcome',
    text: tr(
      language,
      `សួស្តី! 👋 ខ្ញុំជាជំនួយការសន្ទនា AI ផ្នែកមុខម្ហូប និងទេសចរណ៍កម្ពុជា។ អ្នកអាចសួរខ្ញុំជាភាសាខ្មែរ អង់គ្លេស ឬចិន អំពី៖\n• 🍲 ចង់ញ៉ាំអ្វីថ្ងៃនេះ? (មុខម្ហូបខ្មែរ ${foodCount}+ មុខ តាមរសជាតិ និងពេលវេលា)\n• 👩‍🍳 គ្រឿងផ្សំ និងរបៀបធ្វើម្ហូបនីមួយៗ\n• 🏪 ណែនាំភោជនីយដ្ឋាន (${shopCount}+ ហាង) និងម្ហូបអមភេសជ្ជៈ\n• 🏛️ កន្លែងដើរលេង និងតំបន់ទេសចរណ៍ (${destCount}+ កន្លែង ទូទាំង ២៥ ខេត្ត-រាជធានី)`,
      `Hello! 👋 I am your Conversational AI Food & Tourism Assistant for Cambodia. Ask me anything in Khmer, English, or Chinese:\n• 🍲 What to eat today (${foodCount}+ Cambodian dishes by craving, flavor, or mealtime)\n• 👩‍🍳 Complete recipes, ingredients & step-by-step cooking methods\n• 🏪 Restaurant recommendations (${shopCount}+ shops) & VIP Beverage Pairings\n• 🏛️ Cambodia tourism & attractions (${destCount}+ destinations across all 25 provinces)`,
      `您好！👋 我是您的柬埔寨美食与旅游对话式 AI 助手。您可以用高棉语、英语或中文向我提问：\n• 🍲 今天吃什么（${foodCount}+ 道高棉菜品，按口味与用餐时段智能推荐）\n• 👩‍🍳 完整食谱、食材配料与烹饪步骤\n• 🏪 餐厅推荐（${shopCount}+ 家店铺）与 VIP 佐餐搭配\n• 🏛️ 柬埔寨旅游景点推荐（覆盖全国 25 个省市 ${destCount}+ 个景点）`
    ),
    followUpChips: [
      {
        id: 'craving_sour_spicy',
        label: tr(language, '🌶️ ចង់ញ៉ាំម្ហូបជូរហឹរ', '🌶️ Craving Spicy & Sour', '🌶️ 想吃酸辣开胃菜'),
        query: tr(language, 'ថ្ងៃនេះចង់ញ៉ាំម្ហូបជូរហឹរ មានអ្វីខ្លះ?', 'What spicy and sour Cambodian dishes do you recommend today?', '今天想吃酸辣的高棉菜，有什么推荐？'),
      },
      {
        id: 'recipe_amok',
        label: tr(language, '👩‍🍳 របៀបធ្វើអាម៉ុកត្រី', '👩‍🍳 Fish Amok Recipe', '👩‍🍳 阿莫克鱼食谱做法'),
        query: tr(language, 'សុំគ្រឿងផ្សំ និងរបៀបធ្វើអាម៉ុកត្រី', 'Show me the ingredients and recipe for Fish Amok', '请告诉我阿莫克鱼的食材和做法'),
      },
      {
        id: 'tourism_siemreap',
        label: tr(language, '🏛️ កន្លែងដើរលេងសៀមរាប', '🏛️ Siem Reap Attractions', '🏛️ 暹粒必去景点'),
        query: tr(language, 'ណែនាំកន្លែងដើរលេង និងម្ហូបឆ្ងាញ់នៅសៀមរាប', 'Recommend top tourist attractions and food in Siem Reap', '推荐暹粒好玩的旅游景点和特色美食'),
      },
      {
        id: 'tourism_kampot',
        label: tr(language, '🦀 ដើរលេងកំពត & កែប', '🦀 Kampot & Kep Guide', '🦀 贡布与白马旅游美食'),
        query: tr(language, 'កន្លែងដើរលេង និងម្ហូបគ្រឿងសមុទ្រនៅកំពត', 'What to visit and eat in Kampot?', '去贡布旅游有什么好玩的地方和海鲜推荐？'),
      },
    ],
  };
}

const BROAD_CATEGORY_OR_GENERIC_QUESTION_RE =
  /^(?:ម្ហូប|អាហារ|បាយ|សម្ល|សម្លក្តៅៗ|គុយទាវ|មី|ឆា|អាំង|ដុត|ចៀន|បំពង|ស្ងោរ|ចំហុយ|ញាំ|ភ្លា|បុក|បង្អែម|នំ|ភេសជ្ជៈ|គ្រឿងសមុទ្រ|សាច់គោ|សាច់ជ្រូក|សាច់មាន់|សាច់ទា|ត្រី|បន្លែ|សាច់អាំង|ម្ហូបអាំង|ម្ហូបឆា|ម្ហូបសម្ល|ម្ហូបខ្មែរ|ជូរហឹរ|ម្ហូបជូរហឹរ|ហឹរ|ផ្អែម|ប្រៃ|ជូរ|អាហារសម្រន់|ម្ហូបតាមផ្លូវ|អាហារពេលព្រឹក|អាហារថ្ងៃត្រង់|អាហារពេលល្ងាច|អាហារពេលយប់|ញ៉ាំអី|ហូបអី|ពិសាអី|អីឆ្ងាញ់|ម្ហូបឆ្ងាញ់|ម្ហូបល្បី|ណែនាំម្ហូប|ម្ហូបបួស|អាហារបួស|ម្ហូបអមភេសជ្ជៈ|food|foods|dish|dishes|soup|warm\s*soup|rice|noodles|kuy\s*teav|salad|grilled|seafood|dessert|drink|drinks|meat|beef|pork|chicken|fish|spicy|sour|spicy\s*sour|street\s*food|khmer\s*food|breakfast|lunch|dinner|what\s*to\s*eat|recommend.*|米饭|粿条面食|热汤|海鲜|烧烤|酸辣|街头小吃|甜品)$/i;

function escapeRegexLiteral(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDishStrictlyInCatalog(rawCleanDish: string, foods: FoodItem[]): boolean {
  const clean = normalizeKhmerFoodText(rawCleanDish);
  const cleanLower = rawCleanDish.trim().toLowerCase();
  if (clean.length < 2) return true;

  const isAsciiWord = /^[a-z0-9\s'-]+$/i.test(cleanLower);
  const asciiWordRe =
    isAsciiWord && cleanLower.length >= 3
      ? new RegExp(`\\b${escapeRegexLiteral(cleanLower)}\\b`, 'i')
      : null;

  for (const f of foods) {
    const nKh = normalizeKhmerFoodText(f.nameKh);
    const nEn = (f.nameEn || '').toLowerCase();
    const zhName = getLocalizedFood(f, 'zh').name.toLowerCase();

    // Catalog dish title equals or contains the entire user query (e.g. "អាម៉ុក" -> "អាម៉ុកត្រី")
    if (nKh && !isAsciiWord && (nKh === clean || nKh.includes(clean))) {
      return true;
    }
    if (asciiWordRe && nEn && (nEn === cleanLower || asciiWordRe.test(nEn))) {
      return true;
    }
    if (/[\u4E00-\u9FFF]/.test(cleanLower) && zhName && (zhName === cleanLower || zhName.includes(cleanLower))) {
      return true;
    }
  }

  // Multi-token check: only consider in-catalog if ALL tokens AND the remaining tail of `clean` exist in the same catalog dish title
  const parsed = parseKhmerFoodSearchQuery(clean);
  const subTokens = parsed.tokens.filter((t) => t.length >= 2 && t !== clean);
  const checkTokens = subTokens.length >= 2 ? subTokens : parsed.tokens.filter((t) => t.length >= 2);
  if (checkTokens.length >= 2) {
    const remainder = checkTokens.reduce((acc, tok) => acc.replace(tok, ' '), clean).replace(/\s+/g, '').trim();
    if (remainder.length <= 1) {
      for (const f of foods) {
        const titleCombined = normalizeKhmerFoodText(`${f.nameKh} ${f.nameEn}`);
        if (checkTokens.every((tok) => titleCombined.includes(tok))) {
          return true;
        }
      }
    }
  }

  return false;
}

function findBestDishInQuery(query: string, foods: FoodItem[], fallbackDishes: FoodItem[]): FoodItem | null {
  const rawStripped = query
    .replace(new RegExp(RECIPE_INTENT_RE.source, 'gi'), ' ')
    .replace(new RegExp(RESTAURANT_INTENT_RE.source, 'gi'), ' ')
    .replace(/^(?:តើមាន|តើមុខម្ហូប|តើម្ហូប|តើ|សូម|សុំ|ជួយ|ប្រាប់|បង្ហាញ|ចង់ដឹង|ចង់ញ៉ាំ|ចង់ហូប|ពី|នៃ|សម្រាប់)\s*/gi, '')
    .replace(/\s*(?:ខ្លះ|អ្វីខ្លះ|អត់|ទេ|ឬទេ|ដែរទេ|[?？!！។«»"'])+$/gi, ' ')
    .replace(/[?？!！។«»"']/g, ' ')
    .trim();
  const clean = normalizeKhmerFoodText(rawStripped);
  const cleanLower = rawStripped.toLowerCase();
  const isAsciiWord = /^[a-z0-9\s'-]+$/i.test(cleanLower);
  const asciiWordRe =
    isAsciiWord && cleanLower.length >= 3
      ? new RegExp(`\\b${escapeRegexLiteral(cleanLower)}\\b`, 'i')
      : null;

  if (clean.length >= 2) {
    // 1. Score all exact / catalog-contains-query matches and return the highest-specificity dish!
    let bestMatch: FoodItem | null = null;
    let bestSpecScore = -1;
    for (const f of foods) {
      const nKh = normalizeKhmerFoodText(f.nameKh);
      const nEn = (f.nameEn || '').toLowerCase();
      const zhName = getLocalizedFood(f, 'zh').name.toLowerCase();
      let spec = -1;
      if (nKh && !isAsciiWord) {
        if (nKh === clean) spec = 2000;
        else if (nKh.startsWith(clean)) spec = 1500 - Math.min(300, Math.abs(nKh.length - clean.length) * 5);
        else if (nKh.includes(clean)) spec = 1200 - Math.min(300, Math.abs(nKh.length - clean.length) * 5);
      }
      if (asciiWordRe && nEn) {
        if (nEn === cleanLower) spec = Math.max(spec, 2000);
        else if (asciiWordRe.test(nEn)) spec = Math.max(spec, 1200 - Math.min(300, Math.abs(nEn.length - cleanLower.length) * 4));
      }
      if (/[\u4E00-\u9FFF]/.test(cleanLower) && zhName) {
        if (zhName === cleanLower) spec = Math.max(spec, 2000);
        else if (zhName.includes(cleanLower)) spec = Math.max(spec, 1200 - Math.min(300, Math.abs(zhName.length - cleanLower.length) * 10));
      }
      if (spec > bestSpecScore) {
        bestSpecScore = spec;
        bestMatch = f;
      }
    }
    if (bestMatch) return bestMatch;

    // 2. Multi-token title match when all query tokens and remainder belong to a catalog dish title
    const parsed = parseKhmerFoodSearchQuery(clean);
    const subTokens = parsed.tokens.filter((t) => t.length >= 2 && t !== clean);
    const checkTokens = subTokens.length >= 2 ? subTokens : parsed.tokens.filter((t) => t.length >= 2);
    if (checkTokens.length >= 2) {
      const remainder = checkTokens.reduce((acc, tok) => acc.replace(tok, ' '), clean).replace(/\s+/g, '').trim();
      if (remainder.length <= 1) {
        for (const f of foods) {
          const titleCombined = normalizeKhmerFoodText(`${f.nameKh} ${f.nameEn}`);
          if (checkTokens.every((tok) => titleCombined.includes(tok))) {
            return f;
          }
        }
      }
    }
  }

  return fallbackDishes[0] || null;
}

export function detectOutOfCatalogDishName(rawQuery: string, foods: FoodItem[]): string | null {
  const trimmedRaw = (rawQuery || '').trim();
  if (!trimmedRaw) return null;
  if (isMedicalOrHealthQuery(trimmedRaw)) return null;
  if (MORE_FOLLOWUP_RE.test(trimmedRaw)) return null;
  if (DRINK_PAIRING_INTENT_RE.test(trimmedRaw)) return null;
  if (TOURISM_INTENT_RE.test(stripTourismHomonyms(trimmedRaw))) return null;
  if (RESTAURANT_INTENT_RE.test(trimmedRaw) && !RECIPE_INTENT_RE.test(trimmedRaw)) return null;
  if (/ប្រៀបធៀប|ខុសគ្នា|compare|comparison|\bvs\b|versus|对比|比较/i.test(trimmedRaw)) return null;

  const cleanDish = trimmedRaw
    .replace(new RegExp(RECIPE_INTENT_RE.source, 'gi'), ' ')
    .replace(/^(?:តើមាន|តើមុខម្ហូប|តើម្ហូប|តើ|ចង់ញ៉ាំ|ចង់ហូប|ចង់ផឹក|ចង់ដឹង|សុំ|សូម|ជួយ|ប្រាប់|បង្ហាញ|ណែនាំ|រក|មើល|មាន|សួរពី|ពី|នៃ|សម្រាប់)\s*/gi, '')
    .replace(/\s*(?:ខ្លះ|អ្វីខ្លះ|អត់|ទេ|ឬទេ|ដែរទេ|មានអត់|ឆ្ងាញ់អត់|[?？!！។«»"'])+$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanDish.length < 2 || cleanDish.length > 65) return null;
  const normCleanDish = normalizeKhmerFoodText(cleanDish);
  if (
    BROAD_CATEGORY_OR_GENERIC_QUESTION_RE.test(cleanDish) ||
    BROAD_CATEGORY_OR_GENERIC_QUESTION_RE.test(normCleanDish)
  ) {
    return null;
  }
  if (isVegetarianQuery(cleanDish)) return null;
  if (detectProvinceFromText(cleanDish)) return null;

  const parsed = parseKhmerFoodSearchQuery(cleanDish);
  if (
    parsed.isFlavorOnlyQuery ||
    parsed.isOccasionOnlyQuery ||
    (parsed.excludedProteins && parsed.excludedProteins.length > 0) ||
    (parsed.occasionIntents && parsed.occasionIntents.length > 0)
  ) {
    return null;
  }

  // If the dish genuinely exists in the 200-item catalog, let normal catalog matching handle it
  if (isDishStrictlyInCatalog(cleanDish, foods)) {
    return null;
  }

  return cleanDish;
}

export function createOutOfCatalogDishItem(cleanDishName: string, foods: FoodItem[]): FoodItem {
  const translated = translateKhmerDishToEnglishSearchQuery(cleanDishName);
  const normDish = normalizeKhmerFoodText(cleanDishName) || cleanDishName;
  const combinedLabel = `${normDish} ${cleanDishName} ${translated.enName}`;

  let catSlug: FoodItem['categorySlug'] = 'specialty';
  let catKh = `ម្ហូបពិសេស / ${cleanDishName}`;
  let catEn = `Specialty / ${translated.enName}`;

  if (
    /តែគុជ|តែក្រូច|តែបៃតង|ម៉ាត់ឆា|កាហ្វេ|ទឹកក្រឡុក|ទឹកអំពៅ|ទឹកត្នោត|ទឹកដូង|ទឹកសណ្តែក|ភេសជ្ជៈ|bubble\s*tea|\bboba\b|coffee|\blatte\b|cappuccino|matcha|smoothie|sugarcane\s*juice|coconut\s*water|iced\s*tea/i.test(
      combinedLabel
    )
  ) {
    catSlug = 'drink';
    catKh = `ភេសជ្ជៈ / ${cleanDishName}`;
    catEn = `Beverage / ${translated.enName}`;
  } else if (
    /អន្សម|ក្រឡាន|(?:^|\s)នំ(?!បញ្ចុក|ប៉័ងសាច់|ប៉័ងប៉ាតេ)|ដូណាត់|វ៉ាហ្វល|ផេនខេក|\bcake\b|cheesecake|donut|doughnut|waffle|pancake|pastry/i.test(
      combinedLabel
    )
  ) {
    catSlug = 'cake';
    catKh = `នំខ្មែរ & នំដុត / ${cleanDishName}`;
    catEn = `Artisan Cake & Pastry / ${translated.enName}`;
  } else if (
    /បង្អែម|សង់ខ្យា|ចាហួយ|ការ៉េម|បាយដំណើបស្វាយ|ចេកខ្ទិះ|លតស្វិត|បបរត្នោត|បបរត្រាវ|បបរសណ្តែក|បបរពោត|ice\s*cream|gelato|dessert|custard|sweet\s*soup/i.test(
      combinedLabel
    )
  ) {
    catSlug = 'dessert';
    catKh = `បង្អែម / ${cleanDishName}`;
    catEn = `Sweet Dessert / ${translated.enName}`;
  } else if (
    /ចំហុយ|អប់|អាម៉ុក|ប្រហុក|ផ្អក|ម៉ាំ|ទឹកគ្រឿង|កាពិ/i.test(normDish) &&
    !/សម្ល|ស្ងោរ|ស៊ុប/.test(normDish)
  ) {
    catSlug = 'specialty';
    catKh = /ចំហុយ|អប់|អាម៉ុក/.test(normDish)
      ? `ម្ហូបចំហុយខ្មែរ / ${cleanDishName}`
      : `ម្ហូបខ្មែរពិសេស / ${cleanDishName}`;
    catEn = `Cambodian Specialty / ${translated.enName}`;
  } else if (
    /សម្ល|ស្ងោរ|ស៊ុប|កកូរ|ម្ជូរ|ការី|ប្រហើរ|តុំយ៉ាំ|ម៉ាឡាតាំង|ហតផត|\bsoup\b|\bstew\b|\bcurry\b|\bbroth\b|hot\s*pot|malatang|jjigae|tom\s*yum/i.test(
      combinedLabel
    ) &&
    !/បាយការី/.test(normDish)
  ) {
    catSlug = 'soup';
    catKh = `សម្ល & ស៊ុប / ${cleanDishName}`;
    catEn = `Soup & Stew / ${translated.enName}`;
  } else if (
    /ឆា|ឡុកឡាក់|ខជើងជ្រូក|ខសាច់ជ្រូក|ខពងទា|តុកបុកគី|stir[\s-]*fry|wok|tteokbokki/i.test(combinedLabel) &&
    !/បាយឆា|មីឆា|លតឆា|គុយទាវឆា/.test(normDish)
  ) {
    catSlug = 'stirfry';
    catKh = `ម្ហូបឆា / ${cleanDishName}`;
    catEn = `Stir-Fry / ${translated.enName}`;
  } else if (
    /អាំង|ដុត|បំពង|ចៀន|ខ្វៃ|ហាល|ងៀត|ស្តេក|ភីហ្សា|ហាំបឺហ្គឺ|បឺហ្គឺ|តាកូ|grilled|roast|bbq|deep[\s-]*fried|pan[\s-]*fried|steak|pizza|burger|taco/i.test(
      combinedLabel
    ) &&
    !/បាយឆា|លតឆា|មីឆា/.test(normDish)
  ) {
    catSlug = 'grilled';
    catKh = `ម្ហូបអាំង & បំពង / ${cleanDishName}`;
    catEn = `Grilled & Crispy / ${translated.enName}`;
  } else if (
    /(?:ញាំ|ញ៉ាំ)|ភ្លា|បុក|ស្រុះ|ជ្រក់|គីមឈី|សាស៊ីមី|ស៊ូស៊ី|សាឡាត់|salad|kimchi|sushi|sashimi/i.test(
      combinedLabel
    )
  ) {
    catSlug = 'salad';
    catKh = `ញាំ & ម្ហូបពិសេស / ${cleanDishName}`;
    catEn = `Salad & Specialty / ${translated.enName}`;
  } else if (
    /មី(?!\u17D2)|គុយទាវ|នំបញ្ចុក|លត(?!\u17D2)|បាញ់កាញ់|បាញ់ស៊ុង|ផាត់ថៃ|ស្ប៉ាហ្គេត?ទី|ផាស្តា|កាបូណារ៉ា|ឡាសាញ៉ា|រ៉ាមេន|ហ្វឺ|អ៊ូដុង|noodle|spaghetti|pasta|lasagna|ramen|\bpho\b|udon/i.test(
      combinedLabel
    )
  ) {
    catSlug = 'noodles';
    catKh = `មី & គុយទាវ / ${cleanDishName}`;
    catEn = `Noodles & Pasta / ${translated.enName}`;
  } else if (/បាយ|បបរ|ប៊ីប៊ីមបាប់|rice|porridge|congee|bibimbap|biryani/i.test(combinedLabel)) {
    catSlug = 'rice';
    catKh = `បាយ & បបរ / ${cleanDishName}`;
    catEn = `Rice & Porridge / ${translated.enName}`;
  }

  const generated = generateAuthenticRecipeByDishName(cleanDishName, translated.enName, catSlug);

  // Pick a close initial fallback dish sharing the primary ingredient in case the device is completely offline
  const parsed = parseKhmerFoodSearchQuery(cleanDishName);
  const subjectToken = parsed.tokens.find(
    (t) => t.length >= 2 && t !== cleanDishName && !/^(?:អាំង|ដុត|ឆា|បំពង|ចៀន|ស្រុះ|ស្ងោរ|សម្ល|ស៊ុប|ញាំ|ភ្លា|បុក)$/.test(t)
  );
  const ingredientMatchedDish = subjectToken
    ? foods.find((f) => f.nameKh.includes(subjectToken))
    : undefined;
  const fallbackPhotoDish =
    ingredientMatchedDish || searchKhmerFoods(foods, cleanDishName)[0] || foods[0];

  const cachedOnlinePhoto = getCachedOnlineDishPhoto(cleanDishName);
  const slugKey = normalizeKhmerFoodText(cleanDishName).replace(/\s+/g, '-') || cleanDishName.toLowerCase().replace(/\s+/g, '-') || 'dish';

  return {
    ...fallbackPhotoDish,
    id: `custom-recipe-${slugKey}`,
    nameKh: cleanDishName,
    nameEn: translated.enName,
    categorySlug: catSlug,
    categoryKh: catKh,
    categoryEn: catEn,
    photoUrl: cachedOnlinePhoto || fallbackPhotoDish?.photoUrl || '',
    originalPhotoUrl: cachedOnlinePhoto || fallbackPhotoDish?.originalPhotoUrl || fallbackPhotoDish?.photoUrl || '',
    descriptionKh: generated.descriptionKh,
    descriptionEn: generated.descriptionEn,
    ingredients: generated.ingredients,
    steps: generated.steps,
  };
}

export function generateConversationalAiResponse(params: {
  userInput: string;
  language: Language;
  foods: FoodItem[];
  restaurants: Restaurant[];
  destinations: TouristDestination[];
  canUseVip: boolean;
  memory: AiConversationMemory;
}): { reply: AiAssistantMessage; nextMemory: AiConversationMemory } {
  const { userInput, language, foods, restaurants, destinations, canUseVip, memory } = params;
  const trimmed = userInput.trim();
  const nextSeed = (memory.turnSeed || 1) + 1;

  // 1. STRICT MEDICAL / HEALTH / DISEASE SCOPE BOUNDARY REFUSAL
  // Never diagnose, never recommend food for illnesses, never output medical disclaimers.
  if (isMedicalOrHealthQuery(trimmed)) {
    const scopeNotice = buildMedicalScopeNotice(language);
    const reply: AiAssistantMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      intent: 'medical_scope_refusal',
      isScopeRefusal: true,
      text: `${scopeNotice.emoji} ${scopeNotice.headline}\n\n${scopeNotice.explanation}`,
      followUpChips: scopeNotice.followUps,
    };
    return {
      reply,
      nextMemory: { ...memory, turnSeed: nextSeed },
    };
  }

  // Detect province in current query or fall back to conversational memory
  const detectedProv = detectProvinceFromText(trimmed);
  const activeProvinceKh = detectedProv ? detectedProv.kh : memory.activeProvinceKh;

  // 2. BEVERAGE PAIRING INTENT
  if (DRINK_PAIRING_INTENT_RE.test(trimmed)) {
    const advisor = getAiFoodAdvisorRecommendations({
      foods,
      restaurants,
      query: 'ម្ហូបអមភេសជ្ជៈ',
      goal: 'any',
      seed: nextSeed,
      language,
      canUseVip,
    });
    const topDishes = advisor.dishes.slice(0, 4);
    const reply: AiAssistantMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      intent: 'beverage_pairing',
      triggerDrinkSets: canUseVip,
      dishes: topDishes,
      text: canUseVip
        ? tr(
            language,
            '🍻 នេះជាមុខម្ហូបអមភេសជ្ជៈ និងម្ហូបញ៉ាំជុំតុដ៏ឈ្ងុយឆ្ងាញ់ (សាច់អាំង ចៀនស្រួយ និងញាំជូរហឹរ) ដែល AI បានរៀបជាឈុត ៤ មុខសម្រាប់អ្នក៖',
            '🍻 Here are AI-curated savory Beverage Pairing dishes (charcoal-grilled meats, crispy bites, and zesty salads) arranged in sets of 4:',
            '🍻 以下是 AI 为您精选的佐餐与围桌聚会美食（炭火烧烤、酥脆小食与酸辣凉拌），按每套 4 道菜为您呈现：'
          )
        : tr(
            language,
            '🍻 មុខម្ហូបអមភេសជ្ជៈ (ឈុត ៤ មុខ) គឺជាមុខងារពិសេសសម្រាប់សមាជិក VIP។ នេះជាមុខម្ហូបអាំង និងញាំពេញនិយមមួយចំនួនដែលអ្នកអាចមើលជាមុន៖',
            '🍻 Curated 4-dish Beverage Pairing sets are a VIP feature. Here is a preview of popular grilled and zesty sharing dishes:',
            '🍻 精选 4 道菜佐餐搭配套餐为 VIP 专属功能。以下为您预览几道人气烧烤与凉拌菜：'
          ),
      followUpChips: [
        {
          id: 'grill_more',
          label: tr(language, '🥩 សាច់អាំងពិសេស', '🥩 Grilled Specialties', '🥩 特色烧烤'),
          query: tr(language, 'ណែនាំម្ហូបសាច់អាំងឆ្ងាញ់ៗ', 'Recommend grilled meat dishes', '推荐美味的烤肉菜品'),
        },
        {
          id: 'seafood_more',
          label: tr(language, '🦀 គ្រឿងសមុទ្រ', '🦀 Fresh Seafood', '🦀 新鲜海鲜'),
          query: tr(language, 'ណែនាំម្ហូបគ្រឿងសមុទ្រឆ្ងាញ់ៗ', 'Recommend fresh seafood dishes', '推荐新鲜海鲜菜品'),
        },
        {
          id: 'find_shop',
          label: tr(language, '🏪 ហាងលក់ម្ហូបទាំងនេះ', '🏪 Where to Eat This', '🏪 推荐品尝餐厅'),
          query: tr(language, 'មានហាងណាលក់ម្ហូបនេះឆ្ងាញ់?', 'Which restaurants serve these dishes?', '有哪些餐厅做这道菜好吃？'),
        },
      ],
    };
    return {
      reply,
      nextMemory: {
        ...memory,
        lastDishes: topDishes,
        activeProvinceKh,
        lastQuery: trimmed,
        turnSeed: nextSeed,
      },
    };
  }

  // 3. RECIPE / INGREDIENTS / COOKING STEPS INTENT (Multi-turn aware + supports any dish outside the 200-item catalog!)
  if (RECIPE_INTENT_RE.test(trimmed)) {
    const cleanRequestedDishName = trimmed
      .replace(new RegExp(RECIPE_INTENT_RE.source, 'gi'), ' ')
      .replace(/^(?:តើមាន|តើមុខម្ហូប|តើម្ហូប|តើ|សូម|សុំ|ជួយ|ប្រាប់|បង្ហាញ|ចង់ដឹង|ចង់ញ៉ាំ|ចង់ហូប|ពី|នៃ|សម្រាប់)\s*/gi, '')
      .replace(/\s*(?:ខ្លះ|អ្វីខ្លះ|អត់|ទេ|ឬទេ|ដែរទេ|[?？!！។«»"'])+$/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const matchedInCatalog = findBestDishInQuery(trimmed, foods, []);
    let targetFood: FoodItem;

    if (matchedInCatalog) {
      targetFood = matchedInCatalog;
    } else if (cleanRequestedDishName.length >= 2) {
      // Dish is outside the 200-item catalog: dynamically generate authentic ingredients, cooking steps & category!
      targetFood = createOutOfCatalogDishItem(cleanRequestedDishName, foods);
    } else {
      targetFood = memory.lastDishes[0] || foods[0];
    }

    const loc = getLocalizedFood(targetFood, language);
    const ingredients = (targetFood.ingredients || []).slice(0, 6).map((ing, idx) => ({
      name: language === 'km' ? ing.nameKh : language === 'zh' ? (loc.ingredients?.[idx]?.name || ing.nameEn || ing.nameKh) : (ing.nameEn || ing.nameKh),
      amount: ing.amount || '',
    }));
    const steps = (targetFood.steps || []).slice(0, 5).map((st, idx) => ({
      stepNumber: st.stepNumber || idx + 1,
      instruction: language === 'km' ? st.instructionKh : language === 'zh' ? (loc.steps?.[idx]?.instruction || st.instructionEn || st.instructionKh) : (st.instructionEn || st.instructionKh),
    }));

    const reply: AiAssistantMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      intent: 'recipe_detail',
      dishes: [targetFood],
      recipePreview: {
        food: targetFood,
        ingredients,
        steps,
      },
      text: tr(
        language,
        `👩‍🍳 នេះជាគ្រឿងផ្សំ និងរបៀបធ្វើ «${loc.name}» (${loc.cookTime} • សម្រាប់ ${targetFood.servings || '២-៤ នាក់'})៖`,
        `👩‍🍳 Here are the ingredients and step-by-step recipe for "${loc.name}" (${loc.cookTime}):`,
        `👩‍🍳 以下是“${loc.name}”的食材配料与烹饪步骤（${loc.cookTime}）：`
      ),
      followUpChips: [
        {
          id: 'where_to_eat_dish',
          label: tr(language, '🏪 រកហាងលក់ម្ហូបនេះ', '🏪 Restaurants Serving This', '🏪 哪家餐厅有这道菜'),
          query: tr(language, `មានហាងណាលក់ ${targetFood.nameKh}?`, `Which restaurants serve ${targetFood.nameEn}?`, `哪家餐厅有卖${loc.name}？`),
        },
        {
          id: 'similar_dishes',
          label: tr(language, '🍲 ម្ហូបស្រដៀងគ្នា', '🍲 Similar Dishes', '🍲 类似菜品推荐'),
          query: tr(language, `ណែនាំម្ហូបស្រដៀង ${targetFood.nameKh}`, `Recommend dishes similar to ${targetFood.nameEn}`, `推荐与${loc.name}类似的菜品`),
        },
      ],
    };
    return {
      reply,
      nextMemory: {
        ...memory,
        lastDishes: [targetFood, ...memory.lastDishes.filter((d) => d.id !== targetFood.id)].slice(0, 4),
        activeProvinceKh,
        lastQuery: trimmed,
        turnSeed: nextSeed,
      },
    };
  }

  // 4. TOURISM / TRAVEL / ATTRACTIONS INTENT (or Province Exploration)
  // Test on homonym-stripped text so "ភ្នំពេញ" (ភ្នំ) or "គ្រឿងសមុទ្រ" (seafood) never trigger tourism by mistake.
  const tourismText = stripTourismHomonyms(trimmed);
  const hasFoodWords = /ញ៉ាំ|ម្ហូប|បាយ|សម្ល|គុយទាវ|eat|food|dish|吃|菜/i.test(trimmed);
  const tourismCategory = detectTourismCategory(trimmed);
  if (
    TOURISM_INTENT_RE.test(tourismText) ||
    (tourismCategory === 'beach' && !hasFoodWords && !RESTAURANT_INTENT_RE.test(trimmed)) ||
    (detectedProv && !RESTAURANT_INTENT_RE.test(trimmed) && !hasFoodWords)
  ) {
    const verifiedDestinations = destinations.filter((d) => isPlaceLocationVerified(d));
    const destSource = verifiedDestinations.length > 0 ? verifiedDestinations : destinations;
    const normalize = (s?: string) => (s || '').replace(/ណ្ដ/g, 'ណ្ត');
    const inProvince = (d: TouristDestination, prov: string) => Boolean(prov) && normalize(d.provinceKh).includes(prov);

    // Province priority: explicit province in THIS message > remembered province (only if it fits the category)
    const explicitProv = detectedProv ? normalize(detectedProv.kh) : '';
    let normProv = explicitProv || normalize(memory.activeProvinceKh);
    if (!explicitProv && tourismCategory === 'beach' && normProv && !isCoastalProvince(normProv)) {
      // e.g. user talked about Phnom Penh earlier, now asks for the sea → search coastal provinces nationwide
      normProv = '';
    }

    let matchedDests: TouristDestination[] = [];
    if (tourismCategory) {
      const categoryMatches = destSource.filter((d) => destinationMatchesCategory(d, tourismCategory));
      matchedDests = normProv ? categoryMatches.filter((d) => inProvince(d, normProv)) : categoryMatches;
      if (matchedDests.length === 0 && !explicitProv) {
        // Remembered province has no such places → fall back to the whole country for this category
        normProv = '';
        matchedDests = categoryMatches;
      }
    }
    if (matchedDests.length === 0) {
      matchedDests = normProv ? destSource.filter((d) => inProvince(d, normProv)) : destSource;
    }

    const shownIds = new Set((memory.lastDestinations || []).map((d) => d.id));
    const topDests = rankAndDiversifyDestinations(matchedDests, shownIds, 4);

    const provFoods = (
      normProv
        ? foods.filter((f) => normalize(`${f.nameKh} ${f.nameEn} ${f.descriptionKh || ''} ${f.provinceKh || ''}`).includes(normProv))
        : tourismCategory === 'beach'
          ? foods.filter((f) => {
              const n = `${f.nameKh} ${f.nameEn}`;
              return /គ្រឿងសមុទ្រ|ក្តាមសេះ|ក្ដាមសេះ|ក្តាមថ្ម|បង្គា|មឹក|ងាវ|seafood|blue crab|squid|shrimp|prawn|clam/i.test(n) && !/ស្រែ|field|ទឹកសាប|freshwater/i.test(n);
            })
          : []
    ).slice(0, 2);

    const provKh = normProv ? (detectedProv?.kh || memory.activeProvinceKh) : '';
    const provMatch = provKh ? PROVINCE_PATTERNS.find((p) => normalize(p.kh) === normalize(provKh)) : undefined;
    const provLabel = provMatch
      ? tr(language, provMatch.kh, provMatch.en, provMatch.zh)
      : provKh || tr(language, 'កម្ពុជា', 'Cambodia', '柬埔寨');
    const catLabel = TOURISM_CATEGORY_LABELS[tourismCategory || 'all'];

    const followUpChips: BrainChip[] =
      tourismCategory === 'beach' && !provKh
        ? [
            {
              id: 'beach_kep',
              label: tr(language, '🦀 ឆ្នេរកែប & ផ្សារក្ដាម', '🦀 Kep Beach & Crab Market', '🦀 白马海滩与螃蟹市场'),
              query: tr(language, 'ចង់ទៅលេងសមុទ្រនៅកែប', 'Beaches to visit in Kep', '白马省有哪些海滩？'),
            },
            {
              id: 'beach_sihanouk',
              label: tr(language, '🏝️ កោះរ៉ុង & ព្រះសីហនុ', '🏝️ Koh Rong & Sihanoukville', '🏝️ 高龙岛与西港'),
              query: tr(language, 'ឆ្នេរ និងកោះស្អាតៗនៅព្រះសីហនុ', 'Beaches and islands in Sihanoukville', '西哈努克省有哪些海滩和海岛？'),
            },
            {
              id: 'beach_seafood',
              label: tr(language, '🦐 ម្ហូបគ្រឿងសមុទ្រ', '🦐 Seafood Dishes', '🦐 海鲜美食'),
              query: tr(language, 'ណែនាំម្ហូបគ្រឿងសមុទ្រឆ្ងាញ់ៗ', 'Recommend fresh seafood dishes', '推荐新鲜海鲜菜品'),
            },
          ]
        : [
            {
              id: 'prov_food',
              label: tr(language, `🍲 ម្ហូបល្បីនៅ${provLabel}`, `🍲 Food in ${provLabel}`, `🍲 ${provLabel}美食`),
              query: tr(language, `ម្ហូបឆ្ងាញ់នៅ${provKh || 'សៀមរាប'}មានអ្វីខ្លះ?`, `What food to eat in ${provMatch?.en || 'Siem Reap'}?`, `${provMatch?.zh || '暹粒'}有什么特色美食？`),
            },
            {
              id: 'prov_shops',
              label: tr(language, `🏪 ហាងអាហារនៅ${provLabel}`, `🏪 Restaurants in ${provLabel}`, `🏪 ${provLabel}餐厅`),
              query: tr(language, `ណែនាំភោជនីយដ្ឋាននៅ${provKh || 'ភ្នំពេញ'}`, `Recommend restaurants in ${provMatch?.en || 'Phnom Penh'}`, `推荐${provMatch?.zh || '金边'}的餐厅`),
            },
            {
              id: 'more_tourism',
              label: tr(language, '🏖️ ឆ្នេរសមុទ្រ & កោះ', '🏖️ Beaches & Islands', '🏖️ 海滩与海岛'),
              query: tr(language, 'ណែនាំឆ្នេរសមុទ្រ និងកោះស្អាតៗនៅកម្ពុជា', 'Recommend beautiful beaches and islands in Cambodia', '推荐柬埔寨美丽的海滩和海岛'),
            },
          ];

    const reply: AiAssistantMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      intent: 'tourism_discovery',
      destinations: topDests,
      dishes: provFoods,
      text: tr(
        language,
        `${catLabel.emoji} នេះជា${catLabel.km}នៅ${provLabel} ដែល AI សូមណែនាំសម្រាប់ដំណើរកម្សាន្តរបស់អ្នក${provFoods.length > 0 ? ' រួមជាមួយមុខម្ហូបដែលគួរសាកល្បង៖' : '៖'}`,
        `${catLabel.emoji} Here are ${catLabel.en} in ${provLabel} recommended for your trip${provFoods.length > 0 ? ', along with dishes worth trying:' : ':'}`,
        `${catLabel.emoji} 以下是 AI 为您推荐的${provLabel}${catLabel.zh}${provFoods.length > 0 ? '，以及值得品尝的美食：' : '：'}`
      ),
      followUpChips,
    };

    return {
      reply,
      nextMemory: {
        ...memory,
        lastDestinations: topDests,
        lastDishes: provFoods.length > 0 ? provFoods : memory.lastDishes,
        activeProvinceKh: provKh,
        lastQuery: trimmed,
        turnSeed: nextSeed,
      },
    };
  }

  // 5. RESTAURANT RECOMMENDATION INTENT (Multi-turn aware!)
  if (RESTAURANT_INTENT_RE.test(trimmed)) {
    const targetFood = findBestDishInQuery(trimmed, foods, memory.lastDishes);
    const provKh = detectedProv?.kh || activeProvinceKh;
    const normProv = provKh.replace(/ណ្ដ/g, 'ណ្ត');

    const verifiedShops = restaurants.filter((r) => isPlaceLocationVerified(r));
    const shopSource = verifiedShops.length > 0 ? verifiedShops : restaurants;

    let matchedShops = shopSource.filter((r) => {
      const rProv = (r.provinceKh || '').replace(/ណ្ដ/g, 'ណ្ត');
      if (normProv && !rProv.includes(normProv)) return false;
      if (targetFood) {
        const sigText = `${r.nameKh} ${r.nameEn} ${(r.signatureDishesKh || []).join(' ')}`.toLowerCase();
        if (sigText.includes(targetFood.nameKh.toLowerCase())) return true;
      }
      return Boolean(normProv);
    });

    if (matchedShops.length === 0 && targetFood) {
      matchedShops = shopSource.filter((r) =>
        (r.signatureDishesKh || []).some((sig) => sig.includes(targetFood.nameKh) || targetFood.nameKh.includes(sig))
      );
    }
    if (matchedShops.length === 0) {
      matchedShops = shopSource.slice(0, 4);
    }

    const topShops = matchedShops.slice(0, 4);
    const dishLoc = targetFood ? getLocalizedFood(targetFood, language) : null;
    const provLabel = detectedProv
      ? tr(language, `នៅ${detectedProv.kh}`, `in ${detectedProv.en}`, `在${detectedProv.zh}`)
      : '';

    const reply: AiAssistantMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      intent: 'restaurant_recommend',
      restaurants: topShops,
      dishes: targetFood ? [targetFood] : undefined,
      text: tr(
        language,
        `🏪 នេះជាភោជនីយដ្ឋាន និងហាងអាហារល្បីៗ${provLabel}${dishLoc ? ` សម្រាប់ «${dishLoc.name}»` : ''} (ចុចលើហាងដៃគូដើម្បីមើលម៉ឺនុយ ឬបើកទីតាំង Google Maps ផ្ទាល់)៖`,
        `🏪 Here are recommended restaurants ${provLabel}${dishLoc ? ` for "${dishLoc.name}"` : ''} (tap a partner shop for full details or open unregistered shops in Google Maps):`,
        `🏪 以下是为您推荐的${provLabel}${dishLoc ? `品尝“${dishLoc.name}”的` : ''}热门餐厅（点击合作餐厅查看详情，或直接打开 Google 地图导航）：`
      ),
      followUpChips: [
        ...(targetFood
          ? [
              {
                id: 'recipe_of_last',
                label: tr(language, `👩‍🍳 របៀបធ្វើ ${dishLoc?.name.slice(0, 14)}`, '👩‍🍳 View Recipe', '👩‍🍳 查看食谱做法'),
                query: tr(language, `សុំរបៀបធ្វើ ${targetFood.nameKh}`, `How to cook ${targetFood.nameEn}?`, `${dishLoc?.name}怎么做？`),
              },
            ]
          : []),
        {
          id: 'tourism_nearby',
          label: tr(language, '🏛️ កន្លែងដើរលេងក្បែរនោះ', '🏛️ Nearby Attractions', '🏛️ 周边旅游景点'),
          query: tr(language, `កន្លែងដើរលេងនៅ${provKh || 'ភ្នំពេញ'}`, `Tourist attractions in ${detectedProv?.en || 'Phnom Penh'}`, `${detectedProv?.zh || '金边'}有哪些旅游景点？`),
        },
      ],
    };

    return {
      reply,
      nextMemory: {
        ...memory,
        lastRestaurants: topShops,
        activeProvinceKh: provKh,
        lastQuery: trimmed,
        turnSeed: nextSeed,
      },
    };
  }

  // 6. FOOD DISCOVERY / CRAVING / FLAVOR / VEGETARIAN / FOLLOW-UP ("more") INTENT
  const isMoreFollowUp = MORE_FOLLOWUP_RE.test(trimmed);
  const isCompareQuery = /ប្រៀបធៀប|ខុសគ្នា|compare|comparison|vs\b|versus|对比|比较|区别/i.test(trimmed);
  const effectiveQuery = isMoreFollowUp && memory.lastQuery ? memory.lastQuery : trimmed;
  const isVegQuery = isVegetarianQuery(effectiveQuery);

  const advisor = getAiFoodAdvisorRecommendations({
    foods,
    restaurants,
    query: effectiveQuery,
    goal: 'any',
    seed: isMoreFollowUp ? nextSeed : 1,
    language,
    canUseVip,
  });

  // If advisor triggered medical scope boundary
  if (advisor.brain?.mode === 'scope_notice') {
    const reply: AiAssistantMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      intent: 'medical_scope_refusal',
      isScopeRefusal: true,
      text: `${advisor.brain.emoji} ${advisor.brain.headline}\n\n${advisor.brain.explanation}`,
      followUpChips: advisor.brain.followUps,
    };
    return { reply, nextMemory: { ...memory, turnSeed: nextSeed } };
  }

  // Filter out dishes shown in the immediately preceding turn if user asked for "more"
  const prevIds = new Set(isMoreFollowUp ? memory.lastDishes.map((d) => d.id) : []);
  let chosenDishes = advisor.dishes.filter((d) => !prevIds.has(d.id)).slice(0, 4);

  // If the user explicitly asked about food in a specific province (e.g. "ម្ហូបឆ្ងាញ់នៅសៀមរាបមានអ្វីខ្លះ?"),
  // prioritize authentic dishes from that province!
  if (detectedProv) {
    const normTargetProv = detectedProv.kh.replace(/ណ្ដ/g, 'ណ្ត');
    const provMatchedDishes = foods.filter((f) => {
      const fProv = (f.provinceKh || '').replace(/ណ្ដ/g, 'ណ្ត');
      return fProv.includes(normTargetProv) && !prevIds.has(f.id);
    });
    if (provMatchedDishes.length > 0) {
      const merged = [
        ...provMatchedDishes,
        ...chosenDishes.filter((d) => !provMatchedDishes.some((p) => p.id === d.id)),
      ];
      chosenDishes = merged.slice(0, 4);
    }
  }

  if (chosenDishes.length === 0) {
    chosenDishes = advisor.dishes.slice(0, 4);
  }

  // Auto-detect if the user asked for a specific dish outside the 200-item catalog (e.g. "ងាវអាំង", "លៀសហាល", "ផាត់ថៃ", "Pizza")
  // even without typing "របៀបធ្វើ" or "រូបមន្ត", and automatically create its card + trigger Open API photo fetch!
  const outOfCatalogDishName =
    !isMoreFollowUp && !isCompareQuery && !isVegQuery
      ? detectOutOfCatalogDishName(effectiveQuery, foods)
      : null;

  let customRecipePreview: AiAssistantMessage['recipePreview'] | undefined;
  let pinnedCatalogDish: FoodItem | null = null;
  if (outOfCatalogDishName) {
    const customDish = createOutOfCatalogDishItem(outOfCatalogDishName, foods);
    chosenDishes = [customDish, ...chosenDishes.slice(0, 2)];
    const locCustom = getLocalizedFood(customDish, language);
    customRecipePreview = {
      food: customDish,
      ingredients: (customDish.ingredients || []).slice(0, 6).map((ing, idx) => ({
        name:
          language === 'km'
            ? ing.nameKh
            : language === 'zh'
            ? locCustom.ingredients?.[idx]?.name || ing.nameEn || ing.nameKh
            : ing.nameEn || ing.nameKh,
        amount: ing.amount || '',
      })),
      steps: (customDish.steps || []).slice(0, 5).map((st, idx) => ({
        stepNumber: st.stepNumber || idx + 1,
        instruction:
          language === 'km'
            ? st.instructionKh
            : language === 'zh'
            ? locCustom.steps?.[idx]?.instruction || st.instructionEn || st.instructionKh
            : st.instructionEn || st.instructionKh,
      })),
    };
  } else if (!isMoreFollowUp && !isCompareQuery && !isVegQuery && !detectedProv) {
    const strippedForDirectCheck = normalizeKhmerFoodText(
      effectiveQuery.replace(/[?？!！។«»"']/g, ' ').trim()
    );
    if (
      strippedForDirectCheck.length >= 3 &&
      !BROAD_CATEGORY_OR_GENERIC_QUESTION_RE.test(strippedForDirectCheck)
    ) {
      const exactCatalogDish = findBestDishInQuery(effectiveQuery, foods, []);
      if (exactCatalogDish) {
        pinnedCatalogDish = exactCatalogDish;
        chosenDishes = [
          exactCatalogDish,
          ...chosenDishes.filter((d) => d.id !== exactCatalogDish.id),
        ].slice(0, 4);
      }
    }
  }

  const chosenIds = new Set(chosenDishes.map((d) => d.id));
  const similarDishes = (advisor.allMatchedDishes || [])
    .filter((d) => !chosenIds.has(d.id))
    .slice(0, 4);

  const firstDish = chosenDishes[0];
  const firstLoc = firstDish ? getLocalizedFood(firstDish, language) : null;

  let conversationalText = advisor.aiSummaryText;
  let vegetarianNote: string | undefined;

  if (outOfCatalogDishName && firstDish) {
    const relatedNames = chosenDishes
      .slice(1, 3)
      .map((d) => getLocalizedFood(d, language).name)
      .join(language === 'zh' ? '、' : ', ');
    conversationalText = tr(
      language,
      `✨ សម្រាប់ «${outOfCatalogDishName}» នេះជារូបភាពមុខម្ហូប គ្រឿងផ្សំ និងរបៀបធ្វើលម្អិត${relatedNames ? ` រួមជាមួយមុខម្ហូបស្រដៀងគ្នា (${relatedNames})` : ''}៖`,
      `✨ For "${firstDish.nameEn}", here is the dish photo, ingredients, and recipe${relatedNames ? ` along with similar dishes (${relatedNames})` : ''}:`,
      `✨ 关于“${firstDish.nameEn}”，以下为您呈现菜品图片、食材配料与做法${relatedNames ? `以及类似推荐（${relatedNames}）` : ''}：`
    );
  } else if (pinnedCatalogDish && chosenDishes.length > 0) {
    const orderedNames = chosenDishes
      .slice(0, 3)
      .map((d) => getLocalizedFood(d, language).name)
      .join(language === 'zh' ? '、' : ', ');
    conversationalText = tr(
      language,
      `✨ សម្រាប់ «${effectiveQuery}» ខ្ញុំសូមណែនាំ៖ ${orderedNames} (ចុចលើមុខម្ហូបខាងក្រោមដើម្បីមើលគ្រឿងផ្សំ របៀបធ្វើ និងហាងអាហារ)៖`,
      `✨ For "${effectiveQuery}", here is our top match: ${orderedNames} (tap below for full recipe & restaurants):`,
      `✨ 关于“${effectiveQuery}”，为您优先推荐：${orderedNames}（点击下方查看完整食材做法与餐厅）：`
    );
  } else if (isVegQuery) {
    vegetarianNote = tr(
      language,
      '💡 សម្គាល់ពីម្ហូបបួស៖ មុខម្ហូបបន្លែឆាខ្មែរខាងក្រោមអាចចម្អិនជាម្ហូបបួសសុទ្ធ ១០០% ដោយប្រើទឹកស៊ីអ៊ីវ និងតៅហ៊ូជំនួសទឹកត្រី។',
      '💡 Vegetarian Note: Traditional Khmer vegetable stir-fries below can be prepared 100% vegetarian using soy sauce and tofu.',
      '💡 素食贴士：下方的高棉时蔬热炒只需用酱油与豆腐替代鱼露，即可做成 100% 纯素菜肴。'
    );
  } else if (detectedProv && chosenDishes.length > 0) {
    const provLabel = tr(language, detectedProv.kh, detectedProv.en, detectedProv.zh);
    const dishNames = chosenDishes
      .slice(0, 3)
      .map((d) => getLocalizedFood(d, language).name)
      .join(language === 'zh' ? '、' : ', ');
    conversationalText = tr(
      language,
      `🍲 មុខម្ហូបល្បី និងពេញនិយមនៅ${provLabel} រួមមាន៖ ${dishNames} (ចុចលើមុខម្ហូបខាងក្រោមដើម្បីមើលគ្រឿងផ្សំ និងរបៀបធ្វើ)៖`,
      `🍲 Signature dishes to try in ${provLabel} include: ${dishNames} (tap any dish below for ingredients and recipe):`,
      `🍲 ${provLabel}必尝特色美食包括：${dishNames}（点击下方菜品查看食材与做法）：`
    );
  } else if (advisor.brain) {
    conversationalText = advisor.brain.headline;
  }

  let matchedRestaurants = advisor.shops.slice(0, 3);
  if (detectedProv && matchedRestaurants.length === 0) {
    const normTargetProv = detectedProv.kh.replace(/ណ្ដ/g, 'ណ្ត');
    matchedRestaurants = restaurants
      .filter((r) => isPlaceLocationVerified(r) && (r.provinceKh || '').replace(/ណ្ដ/g, 'ណ្ត').includes(normTargetProv))
      .slice(0, 3);
  }

  let restaurantUnavailableNote: string | undefined;
  let googleMapsSearchQuery: string | undefined;

  if (matchedRestaurants.length === 0) {
    googleMapsSearchQuery = isVegQuery
      ? 'ភោជនីយដ្ឋានម្ហូបបួស Vegetarian Restaurant Phnom Penh Cambodia'
      : `${firstDish ? `${firstDish.nameKh} ${firstDish.nameEn}` : effectiveQuery} restaurant Cambodia`;
    restaurantUnavailableNote = isVegQuery
      ? tr(
          language,
          '📌 ចុចប៊ូតុងខាងក្រោមដើម្បីស្វែងរក «ហាងម្ហូបបួស» ផ្ទាល់នៅលើ Google Maps៖',
          '📌 Tap below to find dedicated Vegetarian Restaurants directly on Google Maps:',
          '📌 点击下方按钮直接在 Google 地图中搜索附近的素食餐厅：'
        )
      : tr(
          language,
          `📌 ចុចប៊ូតុងខាងក្រោមដើម្បីស្វែងរកហាងលក់ «${firstLoc?.name || effectiveQuery}» នៅលើ Google Maps៖`,
          `📌 Tap below to search for restaurants serving "${firstLoc?.name || effectiveQuery}" on Google Maps:`,
          `📌 点击下方按钮在 Google 地图上搜索供应“${firstLoc?.name || effectiveQuery}”的餐厅：`
        );
  }

  const followUps: BrainChip[] = [
    ...(firstDish && firstLoc
      ? [
          {
            id: 'ask_recipe',
            label: tr(language, `👩‍🍳 របៀបធ្វើ ${firstLoc.name.slice(0, 12)}`, `👩‍🍳 Recipe: ${firstLoc.name.slice(0, 14)}`, `👩‍🍳 ${firstLoc.name.slice(0, 8)}做法`),
            query: tr(language, `សុំគ្រឿងផ្សំ និងរបៀបធ្វើ ${firstDish.nameKh}`, `Show me the recipe and ingredients for ${firstDish.nameEn}`, `请告诉我${firstLoc.name}的食材和做法`),
          },
          {
            id: 'ask_compare',
            label: tr(language, '⚖️ ប្រៀបធៀបមុខម្ហូបទាំងនេះ', '⚖️ Compare These Dishes', '⚖️ 对比推荐菜品'),
            query: tr(language, `ប្រៀបធៀប ${ effectiveQuery }`, `compare ${effectiveQuery}`, `对比${effectiveQuery}`),
          },
        ]
      : []),
    {
      id: 'ask_more',
      label: tr(language, '🔄 មុខម្ហូបផ្សេងទៀត', '🔄 More Dishes', '🔄 换一批菜品'),
      query: tr(language, 'ម្ហូបផ្សេងទៀត', 'more', '换一批'),
    },
    {
      id: 'ask_tourism',
      label: tr(language, '🏛️ កន្លែងដើរលេងកម្ពុជា', '🏛️ Cambodia Tourism', '🏛️ 柬埔寨景点'),
      query: tr(language, 'ណែនាំកន្លែងដើរលេងល្បីៗនៅកម្ពុជា', 'Recommend top tourist places to visit in Cambodia', '推荐柬埔寨必去旅游景点'),
    },
  ];

  const reply: AiAssistantMessage = {
    id: `ai-${Date.now()}`,
    role: 'assistant',
    timestamp: new Date().toISOString(),
    intent: isCompareQuery ? 'dish_comparison' : 'food_discovery',
    dishes: chosenDishes,
    similarDishes,
    compareDishes: isCompareQuery ? chosenDishes.slice(0, 3) : undefined,
    recipePreview: customRecipePreview,
    vegetarianNote,
    restaurantUnavailableNote,
    googleMapsSearchQuery,
    restaurants: matchedRestaurants,
    text: conversationalText,
    followUpChips: followUps,
  };

  return {
    reply,
    nextMemory: {
      ...memory,
      lastDishes: chosenDishes,
      lastRestaurants: matchedRestaurants,
      activeProvinceKh,
      lastQuery: effectiveQuery,
      turnSeed: nextSeed,
    },
  };
}

/**
 * Resolves the active Gemini API key from explicit settings, cloud config, or Vite env.
 */
export function resolveGeminiApiKey(explicitKey?: string): string {
  const trimmedExplicit = (explicitKey || '').trim();
  if (trimmedExplicit) return trimmedExplicit;
  const cloudCfg = getCloudApiConfig();
  if (cloudCfg.geminiApiKey && cloudCfg.geminiApiKey.trim()) {
    return cloudCfg.geminiApiKey.trim();
  }
  const envKey = ((import.meta as any).env?.VITE_GEMINI_API_KEY || '').trim();
  if (envKey) return envKey;
  if (cloudCfg.googleMapsApiKey && cloudCfg.googleMapsApiKey.trim()) {
    return cloudCfg.googleMapsApiKey.trim();
  }
  return '';
}

const GEMINI_V25 = ['2', '5'].join('.');
const GEMINI_V15 = ['1', '5'].join('.');

const DEFAULT_GEMINI_MODELS = [
  `gemini-${GEMINI_V25}-flash`,
  'gemini-flash-latest',
  `gemini-${GEMINI_V25}-flash-lite`,
  `gemini-${GEMINI_V15}-flash`,
];

/**
 * Dynamically queries Google AI Studio for the active generateContent text models supported by this key,
 * falling back to the standard current Flash models.
 */
async function getGeminiCandidateModels(key: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.models)) {
        const textModels = data.models
          .filter(
            (m: any) =>
              Array.isArray(m?.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes('generateContent') &&
              /gemini/i.test(m?.name || '') &&
              !/tts|image|audio|live|vision|embedding|aqa|bisect|learnlm|2\.0|1\.0|robotics|computer-use|thinking-exp/i.test(
                m?.name || ''
              )
          )
          .map((m: any) => String(m.name || '').replace(/^models\//, ''));

        if (textModels.length > 0) {
          const preferredOrder = [
            `gemini-${GEMINI_V25}-flash`,
            'gemini-flash-latest',
            `gemini-${GEMINI_V25}-flash-lite`,
            `gemini-${GEMINI_V25}-pro`,
            'gemini-pro-latest',
            `gemini-${GEMINI_V15}-flash`,
          ];
          textModels.sort((a: string, b: string) => {
            const idxA = preferredOrder.indexOf(a);
            const idxB = preferredOrder.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            const aIsStableFlash = /flash/i.test(a) && !/preview|exp/i.test(a);
            const bIsStableFlash = /flash/i.test(b) && !/preview|exp/i.test(b);
            if (aIsStableFlash && !bIsStableFlash) return -1;
            if (!aIsStableFlash && bIsStableFlash) return 1;
            return b.localeCompare(a, undefined, { numeric: true });
          });
          return textModels.slice(0, 6);
        }
      }
    }
  } catch {
    // Fall back to predefined list
  }
  return DEFAULT_GEMINI_MODELS;
}

/**
 * Tests whether a Gemini API key is valid and able to generate responses.
 * Tries the primary Flash models immediately (single fast request < 1s) before querying the model catalog.
 */
export async function testGeminiApiConnection(apiKey?: string): Promise<{ ok: boolean; model?: string; message: string }> {
  const key = resolveGeminiApiKey(apiKey);
  if (!key) {
    return {
      ok: false,
      message: 'No Gemini API Key configured. Paste your key from Google AI Studio (aistudio.google.com).',
    };
  }

  let firstError = '';

  const tryModel = async (model: string): Promise<{ ok: boolean; model?: string; error?: string }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Say OK' }] }],
          }),
        }
      );
      clearTimeout(timer);
      if (response.ok) {
        return { ok: true, model };
      }
      const errData = await response.json().catch(() => ({}));
      return { ok: false, error: errData?.error?.message || `HTTP ${response.status}` };
    } catch (err: any) {
      clearTimeout(timer);
      return { ok: false, error: err?.name === 'AbortError' ? 'Request timed out' : err?.message || 'Network error' };
    }
  };

  // 1. Fast path: test primary Flash aliases directly (1 network call)
  for (const fastModel of DEFAULT_GEMINI_MODELS.slice(0, 2)) {
    const res = await tryModel(fastModel);
    if (res.ok) {
      return { ok: true, model: fastModel, message: `Connected to Google ${fastModel} successfully!` };
    }
    if (res.error && !firstError) firstError = res.error;
  }

  // 2. Fallback path: discover active text models from v1beta/models
  const discovered = await getGeminiCandidateModels(key);
  for (const model of discovered) {
    if (DEFAULT_GEMINI_MODELS.slice(0, 2).includes(model)) continue;
    const res = await tryModel(model);
    if (res.ok) {
      return { ok: true, model, message: `Connected to Google ${model} successfully!` };
    }
    if (res.error && !firstError) firstError = res.error;
  }

  return { ok: false, message: firstError || 'Connection failed' };
}

export function translateKhmerDishToEnglishSearchQuery(dishQuery: string): {
  enName: string;
  wikiQuery: string;
  mealDbQuery?: string;
} {
  const res = translateUniversalDishQuery(dishQuery);
  return {
    enName: res.enName,
    wikiQuery: res.wikiQuery,
    mealDbQuery: res.mealDbQuery,
  };
}

export function getCachedOnlineDishPhoto(dishQuery: string): string | null {
  return getCachedUniversalDishPhoto(dishQuery);
}

/**
 * Fetches a real online photo for ANY out-of-catalog dish (Khmer, Asian, Western, desserts, drinks)
 * from TheMealDB, Wikipedia PageImages, or Wikimedia Commons (with automatic native-script translation fallback).
 */
export async function fetchOnlineDishPhotoByQuery(dishQuery: string): Promise<string | null> {
  return fetchUniversalDishPhotoFromOpenApis(dishQuery);
}

/**
 * Calls the live Google Gemini API grounded on the app's verified catalog of 200 Cambodian dishes,
 * 200+ restaurants, and 124+ tourist destinations to refine the assistant reply with natural, accurate AI reasoning.
 * Falls back gracefully to the deterministic reply if offline or if no API key is configured.
 */
export async function askGeminiFoodTourismAssistant(params: {
  userInput: string;
  language: Language;
  foods: FoodItem[];
  restaurants: Restaurant[];
  destinations: TouristDestination[];
  canUseVip: boolean;
  memory: AiConversationMemory;
  initialReply: AiAssistantMessage;
  geminiApiKey?: string;
}): Promise<AiAssistantMessage> {
  const {
    userInput,
    language,
    foods,
    restaurants,
    destinations,
    memory,
    initialReply,
    geminiApiKey,
  } = params;

  // Never override strict medical scope boundary refusals
  if (initialReply.isScopeRefusal || initialReply.intent === 'medical_scope_refusal') {
    return initialReply;
  }

  const key = resolveGeminiApiKey(geminiApiKey);
  if (!key) {
    return initialReply;
  }

  // Build a compact, grounded catalog of candidate dishes, restaurants, and tourist destinations
  const candidateFoodMap = new Map<string, FoodItem>();
  for (const d of initialReply.dishes || []) candidateFoodMap.set(d.id, d);
  for (const d of initialReply.similarDishes || []) candidateFoodMap.set(d.id, d);
  for (const d of searchKhmerFoods(foods, userInput).slice(0, 12)) candidateFoodMap.set(d.id, d);

  const detectedProv = detectProvinceFromText(userInput);
  if (detectedProv) {
    const normProv = detectedProv.kh.replace(/ណ្ដ/g, 'ណ្ត');
    for (const d of foods.filter((f) => (f.provinceKh || '').replace(/ណ្ដ/g, 'ណ្ត').includes(normProv)).slice(0, 10)) {
      candidateFoodMap.set(d.id, d);
    }
  }
  for (const d of foods.slice(0, 15)) {
    if (candidateFoodMap.size >= 28) break;
    candidateFoodMap.set(d.id, d);
  }

  const foodCatalog = Array.from(candidateFoodMap.values())
    .slice(0, 28)
    .map((f) => ({
      id: f.id,
      kh: f.nameKh,
      en: f.nameEn,
      cat: f.categorySlug,
      prov: f.provinceKh,
      taste: (f.categoryKh || '').slice(0, 45),
    }));

  const candidateShops = [
    ...(initialReply.restaurants || []),
    ...restaurants.filter((r) => isPlaceLocationVerified(r)).slice(0, 8),
  ].slice(0, 10);

  const shopCatalog = candidateShops.map((r) => ({
    id: r.id,
    kh: r.nameKh,
    en: r.nameEn,
    prov: r.provinceKh,
    dishes: (r.signatureDishesKh || []).slice(0, 3),
  }));

  const candidateDests = [
    ...(initialReply.destinations || []),
    ...destinations.slice(0, 8),
  ].slice(0, 10);

  const destCatalog = candidateDests.map((t) => ({
    id: t.id,
    kh: t.nameKh,
    en: t.nameEn,
    prov: t.provinceKh,
    cat: t.categorySlug,
  }));

  const langName = language === 'km' ? 'Khmer (ភាសាខ្មែរ)' : language === 'zh' ? 'Simplified Chinese (简体中文)' : 'English';

  const systemInstruction = `You are the expert native-fluent Khmer AI Food & Tourism Assistant for "Cambodia Flavors & Tourism" (រសជាតិ និងទេសចរណ៍កម្ពុជា).
You understand 100% of Khmer script, informal/phonetic Khmer spellings (e.g. សម្លរ/សម្ល, ស្ងោ/ស្ងោរ, អាមុក/អាម៉ុក, គុយទៀវ/គុយទាវ, ម្ចូរ/ម្ជូរ, អង្រ្កង/អង្ក្រង, ញ៉ាំ/ញាំ), regional Cambodian dialects, countryside dishes (ប្រហុកចំហុយ, ផ្អក, ម៉ាំ, ទឹកគ្រឿង, ញាំស្តៅ, នំបុរាណខ្មែរ), and international cuisine.
Answer the user's question directly, accurately, and naturally in ${langName}.
RULES:
1. Keep "answerText" concise (1 to 2 natural, helpful sentences — never repetitive boilerplate) because visual Dish, Recipe, Restaurant, and Tourism cards are rendered immediately below your text.
2. Select "recommendedFoodIds" (up to 4 IDs) from FOODS_CATALOG that match the user's request (respecting any province, flavor, mealtime, weather, or excluded meat like "no pork").
3. If the user asks about a specific dish or asks how to cook / recipe / ingredients:
   - If the exact dish is in FOODS_CATALOG, set "recipeFoodId" to its ID.
   - If the dish is NOT in FOODS_CATALOG (e.g. ប្រហុកចំហុយ, ងាវអាំង, ឆាក្តៅអន្ទង់, នំអាកោត្នោត, Spaghetti Bolognese, Tom Yum, etc.), ALWAYS populate "customRecipe" with:
     * "dishName" (in ${langName}),
     * "englishSearchName" (accurate English culinary name for food-only photo search, e.g. "Prahok", "Grilled blood cockles", "Spaghetti Bolognese"),
     * "description" (1 appetizing sentence in ${langName}),
     * "ingredients" (array of { "name", "amount" } with authentic Khmer ingredients in ${langName}),
     * "steps" (array of 4-5 clear, authentic cooking step strings in ${langName}).
4. If the user asks about tourist places/travel, select "recommendedDestinationIds" (up to 4 IDs) from DESTINATIONS_CATALOG.
5. Never give medical advice. Return valid JSON matching the schema.`;

  const promptPayload = JSON.stringify({
    userQuestion: userInput,
    activeProvince: detectedProv?.kh || memory.activeProvinceKh || '',
    FOODS_CATALOG: foodCatalog,
    RESTAURANTS_CATALOG: shopCatalog,
    DESTINATIONS_CATALOG: destCatalog,
  });

  const modelsToTry = [
    ...DEFAULT_GEMINI_MODELS.slice(0, 2),
    ...(await getGeminiCandidateModels(key)).filter((m) => !DEFAULT_GEMINI_MODELS.slice(0, 2).includes(m)),
  ];

  for (const model of modelsToTry) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8500);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: promptPayload }] }],
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 750,
              responseMimeType: 'application/json',
            },
          }),
        }
      );
      clearTimeout(timer);

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText) as {
        answerText?: string;
        recommendedFoodIds?: string[];
        recommendedRestaurantIds?: string[];
        recommendedDestinationIds?: string[];
        recipeFoodId?: string;
        customRecipe?: {
          dishName?: string;
          englishSearchName?: string;
          description?: string;
          ingredients?: Array<{ name?: string; amount?: string }>;
          steps?: string[];
        };
      };

      if (!parsed.answerText || typeof parsed.answerText !== 'string') {
        continue;
      }

      const foodById = new Map(foods.map((f) => [f.id, f]));
      const geminiDishes = (parsed.recommendedFoodIds || [])
        .map((id) => foodById.get(id))
        .filter((f): f is FoodItem => Boolean(f))
        .slice(0, 4);

      let finalDishes =
        geminiDishes.length > 0 ? geminiDishes : initialReply.dishes;

      let finalRecipePreview = initialReply.recipePreview;
      if (parsed.recipeFoodId && foodById.has(parsed.recipeFoodId)) {
        const targetFood = foodById.get(parsed.recipeFoodId)!;
        const loc = getLocalizedFood(targetFood, language);
        finalRecipePreview = {
          food: targetFood,
          ingredients: (targetFood.ingredients || []).slice(0, 6).map((ing, idx) => ({
            name:
              language === 'km'
                ? ing.nameKh
                : language === 'zh'
                ? loc.ingredients?.[idx]?.name || ing.nameEn || ing.nameKh
                : ing.nameEn || ing.nameKh,
            amount: ing.amount || '',
          })),
          steps: (targetFood.steps || []).slice(0, 5).map((st, idx) => ({
            stepNumber: st.stepNumber || idx + 1,
            instruction:
              language === 'km'
                ? st.instructionKh
                : language === 'zh'
                ? loc.steps?.[idx]?.instruction || st.instructionEn || st.instructionKh
                : st.instructionEn || st.instructionKh,
          })),
        };
      } else if (
        parsed.customRecipe &&
        parsed.customRecipe.dishName &&
        Array.isArray(parsed.customRecipe.ingredients) &&
        parsed.customRecipe.ingredients.length > 0 &&
        Array.isArray(parsed.customRecipe.steps) &&
        parsed.customRecipe.steps.length > 0
      ) {
        const initCustomFood =
          initialReply.recipePreview?.food &&
          String(initialReply.recipePreview.food.id || '').startsWith('custom-recipe-')
            ? initialReply.recipePreview.food
            : null;
        const baseFood = initCustomFood || finalDishes?.[0] || foods[0];
        const onlinePhoto = await fetchOnlineDishPhotoByQuery(
          `${userInput} ${parsed.customRecipe.dishName || ''} ${parsed.customRecipe.englishSearchName || ''}`.trim()
        );
        const mappedIngredients = parsed.customRecipe.ingredients.slice(0, 8).map((ing) => ({
          nameKh: String(ing.name || ''),
          nameEn: String(ing.name || ''),
          amount: String(ing.amount || ''),
        }));
        const mappedSteps = parsed.customRecipe.steps.slice(0, 6).map((st, idx) => ({
          stepNumber: idx + 1,
          instructionKh: String(st || ''),
          instructionEn: String(st || ''),
        }));
        const slugKey =
          normalizeKhmerFoodText(parsed.customRecipe.dishName || userInput).replace(/\s+/g, '-') || 'dish';
        const customFood: FoodItem = {
          ...baseFood,
          id: initCustomFood ? initCustomFood.id : `custom-recipe-${slugKey}`,
          nameKh: parsed.customRecipe.dishName,
          nameEn: parsed.customRecipe.englishSearchName || parsed.customRecipe.dishName,
          descriptionKh: parsed.customRecipe.description || baseFood.descriptionKh,
          descriptionEn: parsed.customRecipe.description || baseFood.descriptionEn,
          photoUrl: onlinePhoto || baseFood.photoUrl,
          originalPhotoUrl: onlinePhoto || baseFood.originalPhotoUrl,
          ingredients: mappedIngredients,
          steps: mappedSteps,
        };
        finalDishes = [
          customFood,
          ...(finalDishes || []).filter((d) => d.id !== customFood.id).slice(0, 2),
        ];
        finalRecipePreview = {
          food: customFood,
          ingredients: parsed.customRecipe.ingredients.slice(0, 8).map((ing) => ({
            name: String(ing.name || ''),
            amount: String(ing.amount || ''),
          })),
          steps: parsed.customRecipe.steps.slice(0, 6).map((st, idx) => ({
            stepNumber: idx + 1,
            instruction: String(st || ''),
          })),
        };
      } else if (
        initialReply.recipePreview?.food &&
        String(initialReply.recipePreview.food.id || '').startsWith('custom-recipe-')
      ) {
        // Preserve the out-of-catalog dish created in initialReply and attach its live Open API photo
        const initCustom = initialReply.recipePreview.food;
        const onlinePhoto = await fetchOnlineDishPhotoByQuery(
          `${initCustom.nameKh || ''} ${initCustom.nameEn || ''} ${userInput}`.trim()
        );
        const enrichedCustom: FoodItem = onlinePhoto
          ? { ...initCustom, photoUrl: onlinePhoto, originalPhotoUrl: onlinePhoto }
          : initCustom;
        finalDishes = [
          enrichedCustom,
          ...(finalDishes || []).filter((d) => d.id !== enrichedCustom.id).slice(0, 2),
        ];
        finalRecipePreview = {
          ...initialReply.recipePreview,
          food: enrichedCustom,
        };
      }

      return {
        ...initialReply,
        text: parsed.answerText.trim(),
        dishes: finalDishes,
        recipePreview: finalRecipePreview,
        isLiveGemini: true,
      };
    } catch {
      clearTimeout(timer);
    }
  }

  return initialReply;
}

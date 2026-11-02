import { isPlaceLocationVerified, type FoodItem, type Language, type Restaurant, type TouristDestination } from '../types';
import { tr } from '../utils/i18n';
import { normalizeKhmerFoodText, parseKhmerFoodSearchQuery, searchKhmerFoods } from '../utils/khmerFoodSearch';
import { generateAuthenticRecipeByDishName } from '../utils/khmerRecipeGenerator';
import {
  extractDishPhrase,
  isQuestionOrCriteriaQuery,
  isKnowledgeQuestion,
  parseDietaryCriteria,
  type DietaryCriteria,
} from '../utils/foodQueryClassifier';
import {
  translateUniversalDishQuery,
  getCachedUniversalDishPhoto,
  fetchUniversalDishPhotoFromOpenApis,
} from '../utils/universalDishOpenApi';
import { getLocalizedFood, getLocalizedRestaurant, getLocalizedDestination } from '../utils/zhDynamicTranslator';
import { isMedicalOrHealthQuery, buildMedicalScopeNotice, describeDish, type BrainChip } from './aiFoodBrain';
import { getAiFoodAdvisorRecommendations, isVegetarianQuery } from './aiFoodAdvisorService';
import { getCloudApiConfig, DEFAULT_GOOGLE_MAPS_API_KEY } from './supabaseService';

export type AiTurnIntent =
  | 'welcome'
  | 'food_discovery'
  | 'dish_comparison'
  | 'recipe_detail'
  | 'restaurant_recommend'
  | 'tourism_discovery'
  | 'beverage_pairing'
  | 'medical_scope_refusal'
  | 'general_food_qa'
  | 'image_identification'
  | 'clarification'
  | 'off_topic';

export interface AiRecipePreview {
  food: FoodItem;
  ingredients: Array<{ name: string; amount: string }>;
  steps: Array<{ stepNumber: number; instruction: string }>;
}

/** What the vision model actually saw in a user-uploaded photo (validated + confidence-gated in code). */
export interface AiImageAnalysis {
  containsFood: boolean;
  /** Calibrated 0..1 confidence reported by the model. */
  confidence: number;
  dishName?: string;
  dishNameEn?: string;
  alternatives: Array<{ name: string; confidence: number }>;
  visibleIngredients: string[];
  cookingMethod?: string;
  evidence?: string;
  /** true only when confidence >= threshold and the model did not ask for clarification. */
  identified: boolean;
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
  /** User message: thumbnail of the photo the user sent. */
  imagePreviewUrl?: string;
  /** Assistant message: result of analysing the user's photo. */
  imageAnalysis?: AiImageAnalysis;
  /** The assistant is asking the user a question instead of guessing. */
  needsClarification?: boolean;
  /** Placeholder shown while the live AI is still answering. */
  isPending?: boolean;
  /** Where the answer came from. */
  source?: 'llm' | 'rules' | 'notice';
  /** Do not show the big "recommended dish" card for this turn (no verified dish to show). */
  suppressDishCard?: boolean;
  model?: string;
  /** Reason code when the live AI call could not complete (used to show inline key setup UI). */
  failureReason?: 'no_key' | 'auth' | 'network' | 'timeout' | 'quota' | 'blocked' | 'bad_response' | 'unavailable';
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
  { kh: 'បាត់ដំបង', en: 'Battambang', zh: '马德望', re: /បាត់ដំបង|battambang|ភ្នំសំពៅ|马德望/i },
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

/** Rank by featured + rating, then interleave provinces so results are diverse (not 4 places from one city). */
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

export function buildWelcomeAssistantMessage(language: Language, foodCount: number, shopCount: number, _destCount?: number): AiAssistantMessage {
  return {
    id: 'ai-welcome',
    role: 'assistant',
    timestamp: new Date().toISOString(),
    intent: 'welcome',
    text: tr(
      language,
      `សួស្តី! 👋 ខ្ញុំជាជំនួយការ AI ឯកទេសលើ «ម្ហូបអាហារ» ប៉ុណ្ណោះ។ សួរខ្ញុំជាភាសាខ្មែរ អង់គ្លេស ឬចិនបាន៖\n• 📷 ថតរូបម្ហូប ដើម្បីឱ្យខ្ញុំប្រាប់ថាជាម្ហូបអ្វី\n• 🍲 ម្ហូបខ្មែរ និងអន្តរជាតិ (មាន ${foodCount}+ មុខក្នុងបញ្ជីផ្ទៀងផ្ទាត់)\n• 👩‍🍳 រូបមន្ត គ្រឿងផ្សំ វិធីចម្អិន និងអាហារូបត្ថម្ភប្រហាក់ប្រហែល\n• ⚖️ ប្រៀបធៀបម្ហូប ប្រវត្តិ វប្បធម៌ និងការផ្គូផ្គងភេសជ្ជៈ\n• 🧊 ការរក្សាទុក និងសុវត្ថិភាពអាហារ • 🏪 ហាងអាហារ (${shopCount}+ ហាង)`,
      `Hello! 👋 I’m an AI assistant dedicated ONLY to food. Ask me in Khmer, English or Chinese:\n• 📷 Send a food photo and I’ll tell you what it is\n• 🍲 Cambodian & international dishes (${foodCount}+ verified menu items)\n• 👩‍🍳 Recipes, ingredients, cooking methods and approximate nutrition\n• ⚖️ Comparisons, history, culture and drink pairings\n• 🧊 Storage & food safety • 🏪 Restaurants (${shopCount}+ shops)`,
      `您好！👋 我是只专注于「美食」的 AI 助手。可用高棉语、英语或中文提问：\n• 📷 发送美食照片，我来告诉您这是什么菜\n• 🍲 高棉与各国美食（已核实菜单 ${foodCount}+ 道）\n• 👩‍🍳 食谱、食材、烹饪方法与大致营养\n• ⚖️ 菜品对比、历史文化与饮品搭配\n• 🧊 食物保存与食品安全 • 🏪 餐厅推荐（${shopCount}+ 家）`
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
        id: 'storage_soup',
        label: tr(language, '🧊 រក្សាទុកម្ហូបសម្ល', '🧊 Storing leftover soup', '🧊 剩汤如何保存'),
        query: tr(language, 'តើរក្សាទុកម្ហូបសម្លក្នុងទូទឹកកកបានប៉ុន្មានថ្ងៃ?', 'How long can leftover soup stay in the fridge?', '剩下的汤放冰箱能保存几天？'),
      },
      {
        id: 'compare_dishes',
        label: tr(language, '⚖️ ប្រៀបធៀបម្ហូប', '⚖️ Compare dishes', '⚖️ 菜品对比'),
        query: tr(language, 'ប្រៀបធៀបអាម៉ុក និងការីខ្មែរ', 'Compare amok and Khmer red curry', '对比阿莫克和高棉红咖喱'),
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

  if (cleanDish.length < 2 || cleanDish.length > 48) return null;
  // A sentence / question / constraint ("សម្លដែលមានជាតិស្ករតិច", "how long does amok keep?") is NOT a dish name.
  // Treating it as one produced fake recipe cards with unrelated photos.
  if (isQuestionOrCriteriaQuery(cleanDish) || parseDietaryCriteria(cleanDish)) return null;
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

  // IMPORTANT: this item is built from NEUTRAL defaults. It used to spread an unrelated catalog dish
  // (photo, calories, rating, province...), which displayed a wrong picture and invented nutrition/ratings.
  // The photo stays empty until a VERIFIED online photo is found (see universalDishOpenApi).
  void foods;
  const cachedOnlinePhoto = getCachedOnlineDishPhoto(cleanDishName);
  const slugKey = normalizeKhmerFoodText(cleanDishName).replace(/\s+/g, '-') || cleanDishName.toLowerCase().replace(/\s+/g, '-') || 'dish';

  return {
    id: `custom-recipe-${slugKey}`,
    nameKh: cleanDishName,
    nameEn: translated.enName,
    categorySlug: catSlug,
    categoryKh: catKh,
    categoryEn: catEn,
    descriptionKh: generated.descriptionKh,
    descriptionEn: generated.descriptionEn,
    photoUrl: cachedOnlinePhoto || '',
    originalPhotoUrl: cachedOnlinePhoto || '',
    prepTime: '',
    cookTime: '',
    servings: '',
    difficulty: 'medium',
    priceRiel: 0,
    priceUsd: 0,
    ingredients: generated.ingredients,
    steps: generated.steps,
    rating: 0,
    reviewCount: 0,
  };
}

/** "សុំរូបមន្ត ប្រហុកចំហុយ" -> "ប្រហុកចំហុយ" : strips recipe-request words and polite particles. */
function extractRequestedDishName(trimmed: string): string {
  return trimmed
    .replace(new RegExp(RECIPE_INTENT_RE.source, 'gi'), ' ')
    .replace(/^(?:តើមាន|តើមុខម្ហូប|តើម្ហូប|តើ|សូម|សុំ|ជួយ|ប្រាប់|បង្ហាញ|ចង់ដឹង|ចង់ញ៉ាំ|ចង់ហូប|ណែនាំ|ពី|នៃ|សម្រាប់)\s*/gi, '')
    .replace(/\s*(?:ខ្លះ|អ្វីខ្លះ|អត់|ទេ|ឬទេ|ដែរទេ|[?？!！។«»"'])+$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const TEXT_OF_DISH_FOR_CRITERIA = (f: FoodItem): string =>
  [
    f.nameKh,
    f.nameEn,
    f.descriptionKh,
    f.descriptionEn,
    ...(f.ingredients || []).map((i) => `${i.nameKh} ${i.nameEn}`),
  ]
    .filter(Boolean)
    .join(' ');

const SUGAR_IN_RECIPE_RE =
  /ស្ករ|ទឹកឃ្មុំ|ទឹកដោះគោខាប់|\bsugar\b|palm\s*sugar|\bhoney\b|syrup|condensed\s*milk|糖|蜂蜜|炼乳/i;
const OILY_RE = /ចៀន|បំពង|ខ្ទិះ|បីជាន់|\bfried\b|crispy|coconut\s*milk|pork\s*belly|deep|油炸|椰浆|五花/i;

/**
 * Filter the verified catalog by dietary / flavour criteria using ONLY recipe data
 * (ingredient lists, calories). Describes recipe characteristics - never health advice.
 */
export function filterDishesByDietaryCriteria(foods: FoodItem[], criteria: DietaryCriteria): FoodItem[] {
  const matchesCategory = (f: FoodItem): boolean => {
    const hint = criteria.categoryHint;
    if (!hint) return true;
    const title = `${f.nameKh} ${f.nameEn}`;
    switch (hint) {
      case 'soup':
        // Khmer "samlor" family only (the catalog category 'soup' also holds amok, braised dishes and noodle soups)
        return /សម្ល|ស្ងោរ|ស៊ុប|ម្ជូរ|ប្រហើរ|កកូរ|ការី/.test(f.nameKh) && !/^បាយ|^គុយទាវ|^មី|^នំបញ្ចុក/.test(f.nameKh);
      case 'noodles':
        return f.categorySlug === 'noodles';
      case 'rice':
        return f.categorySlug === 'rice';
      case 'salad':
        return f.categorySlug === 'salad';
      case 'grilled':
        return f.categorySlug === 'grilled';
      case 'stirfry':
        return f.categorySlug === 'stirfry';
      case 'dessert':
        return f.categorySlug === 'dessert' || f.categorySlug === 'cake';
      case 'drink':
        return f.categorySlug === 'drink';
      default:
        return true;
    }
  };

  let pool = foods.filter(matchesCategory);
  const wantsSweet = criteria.categoryHint === 'dessert' || criteria.categoryHint === 'drink';
  const strict = pool.filter((f) => {
    const text = TEXT_OF_DISH_FOR_CRITERIA(f);
    if (criteria.lowSugar && !wantsSweet) {
      if (f.categorySlug === 'dessert' || f.categorySlug === 'cake' || f.categorySlug === 'drink') return false;
      if (SUGAR_IN_RECIPE_RE.test((f.ingredients || []).map((i) => `${i.nameKh} ${i.nameEn}`).join(' '))) return false;
    }
    if (criteria.lowFat && OILY_RE.test(text)) return false;
    if (criteria.lowCalorie && (f.calories || 9999) > 350) return false;
    if (criteria.notSpicy && /ហឹរ|ម្ទេស|spicy|chili|chilli|辣/i.test(text)) return false;
    return true;
  });
  if (strict.length > 0) pool = strict;
  else return [];

  return pool.sort((a, b) => {
    if (criteria.lowCalorie) return (a.calories || 9999) - (b.calories || 9999);
    return (b.rating || 0) - (a.rating || 0);
  });
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
  const safeMemory: AiConversationMemory = {
    ...memory,
    lastDishes: Array.isArray(memory?.lastDishes) ? memory.lastDishes : [],
    lastDestinations: Array.isArray(memory?.lastDestinations) ? memory.lastDestinations : [],
    turnSeed: memory?.turnSeed || 1,
  };
  const trimmed = userInput.trim();
  const nextSeed = (safeMemory.turnSeed || 1) + 1;

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
        ...safeMemory,
        lastDishes: topDishes,
        activeProvinceKh,
        lastQuery: trimmed,
        turnSeed: nextSeed,
      },
    };
  }

  // 3. RECIPE / INGREDIENTS / COOKING STEPS INTENT (Multi-turn aware + supports any dish outside the 200-item catalog!)
  // A sentence-like request ("ណែនាំសម្លដែលមានជាតិស្ករតិច") is NOT a dish name: it falls through to the criteria / discovery steps.
  if (
    RECIPE_INTENT_RE.test(trimmed) &&
    (!isQuestionOrCriteriaQuery(extractRequestedDishName(trimmed)) || findBestDishInQuery(trimmed, foods, []))
  ) {
    const cleanRequestedDishName = extractRequestedDishName(trimmed);

    const matchedInCatalog = findBestDishInQuery(trimmed, foods, []);
    let targetFood: FoodItem;

    if (matchedInCatalog) {
      targetFood = matchedInCatalog;
    } else if (cleanRequestedDishName.length >= 2) {
      // Dish is outside the 200-item catalog: dynamically generate authentic ingredients, cooking steps & category!
      targetFood = createOutOfCatalogDishItem(cleanRequestedDishName, foods);
    } else {
      targetFood = safeMemory.lastDishes[0] || foods[0];
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
        ...safeMemory,
        lastDishes: [targetFood, ...safeMemory.lastDishes.filter((d) => d.id !== targetFood.id)].slice(0, 4),
        activeProvinceKh,
        lastQuery: trimmed,
        turnSeed: nextSeed,
      },
    };
  }

  // 4. TOURISM / TRAVEL REQUESTS - this assistant is FOOD-ONLY.
  // Politely redirect (no attractions are recommended here) and, when a province is mentioned,
  // offer that province's signature dishes instead.
  // Test on homonym-stripped text so "ភ្នំពេញ" (ភ្នំ) or "គ្រឿងសមុទ្រ" (seafood) never trigger this by mistake.
  const tourismText = stripTourismHomonyms(trimmed);
  const hasFoodWords = /ញ៉ាំ|ម្ហូប|បាយ|សម្ល|គុយទាវ|eat|food|dish|吃|菜/i.test(trimmed);
  const tourismCategory = detectTourismCategory(trimmed);
  if (
    TOURISM_INTENT_RE.test(tourismText) ||
    (tourismCategory === 'beach' && !hasFoodWords && !RESTAURANT_INTENT_RE.test(trimmed)) ||
    (detectedProv && !RESTAURANT_INTENT_RE.test(trimmed) && !hasFoodWords)
  ) {
    const normalize = (s?: string) => (s || '').replace(/ណ្ដ/g, 'ណ្ត');
    const normProv = detectedProv ? normalize(detectedProv.kh) : '';
    const provFoods = normProv
      ? foods
          .filter((f) => normalize(`${f.nameKh} ${f.nameEn} ${f.descriptionKh || ''} ${f.provinceKh || ''}`).includes(normProv))
          .slice(0, 4)
      : [];
    const provLabel = detectedProv ? tr(language, detectedProv.kh, detectedProv.en, detectedProv.zh) : '';

    const reply: AiAssistantMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      intent: 'off_topic',
      source: 'rules',
      dishes: provFoods.length > 0 ? provFoods : undefined,
      suppressDishCard: provFoods.length === 0,
      text: tr(
        language,
        `🍽️ ជំនួយការនេះឯកទេសតែលើម្ហូបអាហារប៉ុណ្ណោះ — សូមប្រើផ្ទាំង «ទេសចរណ៍» សម្រាប់កន្លែងដើរលេង។${
          provFoods.length > 0 ? ` ខាងក្រោមជាម្ហូបល្បីៗនៅ${provLabel}៖` : ' ខ្ញុំអាចណែនាំម្ហូបតាមខេត្ត ឬហាងអាហារបាន។'
        }`,
        `🍽️ This assistant is food-only — please use the Tourism tab for places to visit.${
          provFoods.length > 0 ? ` Here are signature dishes from ${provLabel}:` : ' I can recommend regional dishes or restaurants.'
        }`,
        `🍽️ 本助手只专注于美食——景点请使用“旅游”页面。${
          provFoods.length > 0 ? `以下是${provLabel}的特色美食：` : '我可以为您推荐各地特色菜或餐厅。'
        }`
      ),
      followUpChips: [
        {
          id: 'prov_food',
          label: tr(language, '🍲 ម្ហូបល្បីតាមខេត្ត', '🍲 Regional dishes', '🍲 各地特色美食'),
          query: tr(language, 'ម្ហូបឆ្ងាញ់នៅសៀមរាបមានអ្វីខ្លះ?', 'What food should I try in Siem Reap?', '暹粒有什么特色美食？'),
        },
        {
          id: 'prov_shops',
          label: tr(language, '🏪 ហាងអាហារ', '🏪 Restaurants', '🏪 餐厅推荐'),
          query: tr(language, 'ណែនាំភោជនីយដ្ឋាននៅភ្នំពេញ', 'Recommend restaurants in Phnom Penh', '推荐金边的餐厅'),
        },
      ],
    };
    return {
      reply,
      nextMemory: {
        ...safeMemory,
        lastDishes: provFoods.length > 0 ? provFoods : safeMemory.lastDishes,
        activeProvinceKh: detectedProv ? detectedProv.kh : safeMemory.activeProvinceKh,
        lastQuery: trimmed,
        turnSeed: nextSeed,
      },
    };
  }

  // 5. RESTAURANT RECOMMENDATION INTENT (Multi-turn aware!)
  if (RESTAURANT_INTENT_RE.test(trimmed)) {
    const targetFood = findBestDishInQuery(trimmed, foods, safeMemory.lastDishes);
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

  // 5b. DIETARY / FLAVOUR CRITERIA ("សម្លដែលមានជាតិស្ករតិច", "low-oil noodles", "not spicy soup")
  // Filter the verified catalog by RECIPE DATA (ingredient list / calories) - never invent a dish and never give health advice.
  const dietaryCriteria = !MORE_FOLLOWUP_RE.test(trimmed) ? parseDietaryCriteria(trimmed) : null;
  if (dietaryCriteria) {
    const matches = filterDishesByDietaryCriteria(foods, dietaryCriteria);
    const top = matches.slice(0, 4);
    const label = [
      dietaryCriteria.lowSugar ? tr(language, 'គ្មានស្ករក្នុងគ្រឿងផ្សំ', 'no sugar in the ingredient list', '配料中不含糖') : '',
      dietaryCriteria.lowCalorie ? tr(language, 'កាឡូរីទាប (≤ ៣៥០ kcal)', 'lower calories (≤ 350 kcal)', '较低热量（≤ 350 千卡）') : '',
      dietaryCriteria.lowFat ? tr(language, 'មិនចៀន/មិនបំពង/គ្មានខ្ទិះ', 'not fried / no coconut milk', '非油炸、不含椰浆') : '',
      dietaryCriteria.notSpicy ? tr(language, 'មិនហឹរ', 'not spicy', '不辣') : '',
    ]
      .filter(Boolean)
      .join(' • ');
    const note = tr(
      language,
      'ℹ️ ការជ្រើសរើសនេះផ្អែកលើបញ្ជីគ្រឿងផ្សំក្នុងរូបមន្តប៉ុណ្ណោះ (មិនមែនជាដំបូន្មានសុខភាពទេ) ហើយហាងនីមួយៗអាចដាក់ខុសគ្នា។',
      'ℹ️ This filter only reads each recipe’s ingredient list (it is not health advice) and restaurants may cook differently.',
      'ℹ️ 此筛选仅依据食谱配料表（并非健康建议），各餐厅做法可能不同。'
    );
    const reply: AiAssistantMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      intent: 'food_discovery',
      source: 'rules',
      dishes: top.length > 0 ? top : undefined,
      similarDishes: matches.slice(4, 8),
      suppressDishCard: top.length === 0,
      text:
        top.length > 0
          ? `${tr(language, '✨ មុខម្ហូបដែលត្រូវនឹងលក្ខខណ្ឌ', '✨ Dishes matching your criteria', '✨ 符合您条件的菜品')} (${label}):\n\n${note}`
          : `${tr(
              language,
              '🔎 ខ្ញុំរកមិនឃើញមុខម្ហូបក្នុងបញ្ជីដែលត្រូវនឹងលក្ខខណ្ឌទាំងអស់នេះទេ',
              '🔎 I couldn’t find a dish in the verified menu that meets all of these criteria',
              '🔎 在已核实的菜单中没有找到同时满足这些条件的菜品'
            )} (${label}).\n\n${tr(
              language,
              'សូមសាកល្បងបន្ធូរលក្ខខណ្ឌមួយ ឬប្រាប់ខ្ញុំពីប្រភេទម្ហូបដែលអ្នកចង់បាន។',
              'Try relaxing one criterion, or tell me which kind of dish you want.',
              '可以放宽一个条件，或告诉我想吃哪一类菜。'
            )}`,
      followUpChips: [
        {
          id: 'crit_not_spicy',
          label: tr(language, '🌿 មិនហឹរ', '🌿 Not spicy', '🌿 不辣'),
          query: tr(language, 'សម្លដែលមិនហឹរ', 'Mild soups that are not spicy', '不辣的汤'),
        },
        {
          id: 'crit_light',
          label: tr(language, '🥗 កាឡូរីទាប', '🥗 Lower calories', '🥗 低热量'),
          query: tr(language, 'ម្ហូបកាឡូរីទាប', 'Lower calorie dishes', '低热量的菜'),
        },
        {
          id: 'crit_more',
          label: tr(language, '🔄 ម្ហូបផ្សេងទៀត', '🔄 More dishes', '🔄 换一批'),
          query: tr(language, 'ម្ហូបផ្សេងទៀត', 'more', '换一批'),
        },
      ],
    };
    return {
      reply,
      nextMemory: {
        ...safeMemory,
        lastDishes: top.length > 0 ? top : safeMemory.lastDishes,
        activeProvinceKh,
        lastQuery: trimmed,
        turnSeed: nextSeed,
      },
    };
  }

  // 5c. FACT QUESTIONS (nutrition, storage, history, "why", substitutions...) need real reasoning.
  // The offline engine must not answer them with an unrelated dish card - it answers only what it can
  // PROVE from the verified catalog and is honest about the rest.
  if (
    isKnowledgeQuestion(trimmed) &&
    !MORE_FOLLOWUP_RE.test(trimmed) &&
    !/ប្រៀបធៀប|ខុសគ្នា|compare|comparison|\bvs\b|versus|对比|比较|区别/i.test(trimmed)
  ) {
    // The dish is somewhere INSIDE a sentence ("តើអាម៉ុកត្រីមានកាឡូរីប៉ុន្មាន?"): strip the question words, then match the catalog.
    const phrase = normalizeKhmerFoodText(extractDishPhrase(trimmed));
    const phraseMatch =
      phrase.length >= 2
        ? searchKhmerFoods(foods, phrase).find(
            (f) => normalizeKhmerFoodText(f.nameKh).includes(phrase) || (f.nameEn || '').toLowerCase().includes(phrase.toLowerCase())
          )
        : undefined;
    const subject = phraseMatch || findBestDishInQuery(trimmed, foods, safeMemory.lastDishes);
    const asksNutrition = /កាឡូរី|អាហារូបត្ថម្ភ|calorie|kcal|nutrition|热量|卡路里|营养/i.test(trimmed);
    const asksIngredients = /គ្រឿងផ្សំ|ingredient|配料|食材|ដាក់អ្វី/i.test(trimmed);
    let factText = '';
    if (subject && (asksNutrition || asksIngredients)) {
      const loc = getLocalizedFood(subject, language);
      const ings = (subject.ingredients || [])
        .slice(0, 8)
        .map((ing, idx) =>
          language === 'km' ? ing.nameKh : language === 'zh' ? loc.ingredients?.[idx]?.name || ing.nameEn || ing.nameKh : ing.nameEn || ing.nameKh
        )
        .join(language === 'zh' ? '、' : ', ');
      factText = tr(
        language,
        `📋 «${loc.name}»៖ ${subject.calories ? `កាឡូរីប្រហែល ${subject.calories} kcal ក្នុងមួយចាន (ប៉ាន់ស្មាន)។ ` : ''}គ្រឿងផ្សំសំខាន់ៗ៖ ${ings || 'មិនទាន់មានទិន្នន័យ'}។`,
        `📋 "${loc.name}": ${subject.calories ? `about ${subject.calories} kcal per serving (approximate). ` : ''}Main ingredients: ${ings || 'not listed'}.`,
        `📋 “${loc.name}”：${subject.calories ? `每份约 ${subject.calories} 千卡（估算）。` : ''}主要食材：${ings || '暂无数据'}。`
      );
    }
    const reply: AiAssistantMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      intent: 'general_food_qa',
      source: 'rules',
      dishes: subject ? [subject] : undefined,
      suppressDishCard: !subject,
      text: `${factText ? `${factText}\n\n` : ''}${tr(
        language,
        '🤖 សំណួរនេះត្រូវការ AI ឆ្លាតវៃដើម្បីឆ្លើយឱ្យបានលម្អិត និងត្រឹមត្រូវ ប៉ុន្តែឥឡូវនេះ AI មិនទាន់តភ្ជាប់ទេ ដូច្នេះខ្ញុំមិនចង់ទាយចម្លើយឱ្យខុសទេ។ សូមព្យាយាមម្តងទៀតពេល AI តភ្ជាប់ ឬសួរអំពីមុខម្ហូបជាក់លាក់។',
        '🤖 A detailed, accurate answer to this needs the live AI, which isn’t connected right now - and I would rather not guess. Please try again when the AI is online, or ask about a specific dish.',
        '🤖 要给出详细且准确的回答需要在线 AI，目前未连接，我不想随意猜测。请在 AI 连接后重试，或询问具体菜品。'
      )}`,
      followUpChips: subject
        ? [
            {
              id: 'fact_recipe',
              label: tr(language, '👩‍🍳 របៀបធ្វើ', '👩‍🍳 Recipe', '👩‍🍳 做法'),
              query: tr(language, `សុំរូបមន្ត ${subject.nameKh}`, `Show me the recipe for ${subject.nameEn}`, `请告诉我${getLocalizedFood(subject, language).name}的做法`),
            },
          ]
        : undefined,
    };
    return {
      reply,
      nextMemory: {
        ...safeMemory,
        lastDishes: subject ? [subject] : safeMemory.lastDishes,
        activeProvinceKh,
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
    return { reply, nextMemory: { ...safeMemory, turnSeed: nextSeed } };
  }

  // Filter out dishes shown in the immediately preceding turn if user asked for "more"
  const prevIds = new Set(isMoreFollowUp ? safeMemory.lastDishes.map((d) => d.id) : []);
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

  // Nothing in the verified menu matches AND it is not a broad request ("ម្ហូបឆ្ងាញ់") nor a nameable dish:
  // say so and ask - never pad the answer with random "popular" dishes (they look like wrong answers).
  const strippedForBroadCheck = normalizeKhmerFoodText(effectiveQuery.replace(/[?？!！។«»"']/g, ' ').trim());
  const isBroadRequest = BROAD_CATEGORY_OR_GENERIC_QUESTION_RE.test(strippedForBroadCheck);
  const hasNoRealMatch =
    !isMoreFollowUp &&
    !isVegQuery &&
    !isCompareQuery &&
    !detectedProv &&
    !isBroadRequest &&
    advisor.totalMatchedCount === 0 &&
    !(advisor.brain && advisor.brain.dishes.length > 0);
  if (hasNoRealMatch && !outOfCatalogDishName && !pinnedCatalogDish) {
    const reply: AiAssistantMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      intent: 'clarification',
      source: 'rules',
      needsClarification: true,
      suppressDishCard: true,
      text: tr(
        language,
        `🔎 ខ្ញុំមិនទាន់ប្រាកដថា «${effectiveQuery}» ជាមុខម្ហូបអ្វីទេ ហើយមិនមានមុខម្ហូបត្រូវគ្នាក្នុងបញ្ជីទេ។ តើអ្នកចង់បានម្ហូបប្រភេទណា (សម្ល ឆា អាំង មី បាយ បង្អែម) ឬមានគ្រឿងផ្សំអ្វី? ប្រាប់ខ្ញុំបន្ថែម ខ្ញុំនឹងជួយរកឱ្យត្រូវ។`,
        `🔎 I’m not sure what dish “${effectiveQuery}” is, and nothing in the menu matches it. What kind of dish do you want (soup, stir-fry, grill, noodles, rice, dessert) or which main ingredient? Tell me a bit more and I’ll find the right one.`,
        `🔎 我不确定“${effectiveQuery}”是什么菜，菜单中也没有匹配项。您想吃哪一类（汤、炒菜、烧烤、面、饭、甜品）或主要食材是什么？告诉我更多信息，我来帮您找。`
      ),
      followUpChips: [
        {
          id: 'clar_soup',
          label: tr(language, '🍲 សម្ល', '🍲 Soups', '🍲 汤类'),
          query: tr(language, 'ណែនាំសម្លឆ្ងាញ់ៗ', 'Recommend tasty soups', '推荐好喝的汤'),
        },
        {
          id: 'clar_grill',
          label: tr(language, '🍖 សាច់អាំង', '🍖 Grilled', '🍖 烧烤'),
          query: tr(language, 'ណែនាំម្ហូបសាច់អាំង', 'Recommend grilled dishes', '推荐烧烤类菜品'),
        },
        {
          id: 'clar_noodle',
          label: tr(language, '🍜 មី & គុយទាវ', '🍜 Noodles', '🍜 面粉类'),
          query: tr(language, 'ណែនាំគុយទាវ និងមី', 'Recommend noodle dishes', '推荐面条粉类'),
        },
      ],
    };
    return {
      reply,
      nextMemory: { ...safeMemory, activeProvinceKh, lastQuery: effectiveQuery, turnSeed: nextSeed },
    };
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
      `✨ សម្រាប់ «${outOfCatalogDishName}» នេះជារូបមន្តទូទៅ គ្រឿងផ្សំ និងរបៀបធ្វើ (អាចខុសគ្នាតាមតំបន់/ហាង)${relatedNames ? ` រួមជាមួយមុខម្ហូបស្រដៀងគ្នា (${relatedNames})` : ''}៖`,
      `✨ For "${firstDish.nameEn}", here is a general guide to the ingredients and method (it varies by region and cook)${relatedNames ? `, plus similar dishes (${relatedNames})` : ''}:`,
      `✨ 关于“${firstDish.nameEn}”，以下是食材与做法的通用参考（各地、各家做法会有差异）${relatedNames ? `，以及类似推荐（${relatedNames}）` : ''}：`
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
 * Never falls back to DEFAULT_GOOGLE_MAPS_API_KEY (which is restricted to Google Maps and rejected by Gemini).
 */
export function resolveGeminiApiKey(explicitKey?: string): string {
  const isUsableGeminiKey = (k?: string): boolean => {
    const trimmed = (k || '').trim();
    return Boolean(trimmed && trimmed !== DEFAULT_GOOGLE_MAPS_API_KEY);
  };
  if (isUsableGeminiKey(explicitKey)) return (explicitKey || '').trim();
  const cloudCfg = getCloudApiConfig();
  if (isUsableGeminiKey(cloudCfg.geminiApiKey)) {
    return cloudCfg.geminiApiKey.trim();
  }
  const envKey = ((import.meta as any).env?.VITE_GEMINI_API_KEY || '').trim();
  if (isUsableGeminiKey(envKey)) return envKey;
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
export async function getGeminiCandidateModels(key: string): Promise<string[]> {
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

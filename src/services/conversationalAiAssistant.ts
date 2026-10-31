import type { FoodItem, Language, Restaurant, TouristDestination } from '../types';
import { tr } from '../utils/i18n';
import { getLocalizedFood, getLocalizedRestaurant, getLocalizedDestination } from '../utils/zhDynamicTranslator';
import { isMedicalOrHealthQuery, buildMedicalScopeNotice, describeDish, type BrainChip } from './aiFoodBrain';
import { getAiFoodAdvisorRecommendations } from './aiFoodAdvisorService';

export type AiTurnIntent =
  | 'welcome'
  | 'food_discovery'
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
  recipePreview?: AiRecipePreview;
  restaurants?: Restaurant[];
  destinations?: TouristDestination[];
  followUpChips?: BrainChip[];
  triggerDrinkSets?: boolean;
  isScopeRefusal?: boolean;
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
  /រូបមន្ត|គ្រឿងផ្សំ|របៀបធ្វើ|ធ្វើម៉េច|ចម្អិនម៉េច|វិធីធ្វើ|recipe|ingredient|how to cook|how to make|how do i make|cooking step|做法|食谱|菜谱|食材|配料|怎么做|如何制作/i;

const RESTAURANT_INTENT_RE =
  /ហាងណា|ញ៉ាំនៅណា|ភោជនីយដ្ឋាន|ហាងអាហារ|រកហាង|ណែនាំហាង|ហាងលក់|where to eat|which restaurant|recommend.*restaurant|find.*shop|best place to eat|哪里吃|哪家餐厅|推荐餐厅|去哪吃|餐馆|饭店/i;

const TOURISM_INTENT_RE =
  /ដើរលេង|ទេសចរណ៍|កន្លែងដើរលេង|រមណីយដ្ឋាន|ប្រាសាទ|ឆ្នេរ|ទឹកធ្លាក់|ទឹកជ្រោះ|ភ្នំ|កោះ|ដំណើរកម្សាន្ត|ទៅលេង|គួរទៅណា|tourism|tourist|travel|attraction|sightseeing|places to visit|where to go|temple|beach|waterfall|island|mountain|vacation|itinerary|旅游|景点|好玩|去哪玩|打卡|寺庙|海滩|海岛|瀑布|国家公园|自由行/i;

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

function findBestDishInQuery(query: string, foods: FoodItem[], fallbackDishes: FoodItem[]): FoodItem | null {
  const clean = query
    .replace(RECIPE_INTENT_RE, ' ')
    .replace(RESTAURANT_INTENT_RE, ' ')
    .replace(/[?？!！។«»"']/g, ' ')
    .trim()
    .toLowerCase();

  if (clean.length >= 2) {
    for (const f of foods) {
      const nKh = (f.nameKh || '').toLowerCase();
      const nEn = (f.nameEn || '').toLowerCase();
      const zhName = getLocalizedFood(f, 'zh').name.toLowerCase();
      if (
        (nKh && (clean.includes(nKh) || nKh.includes(clean))) ||
        (nEn && clean.length >= 3 && (clean.includes(nEn) || nEn.includes(clean))) ||
        (zhName && (clean.includes(zhName) || zhName.includes(clean)))
      ) {
        return f;
      }
    }
    // Check common dish keywords
    if (/អាម៉ុក|amok|阿莫克/i.test(query)) {
      return foods.find((f) => /អាម៉ុក|amok/i.test(`${f.nameKh} ${f.nameEn}`)) || fallbackDishes[0] || foods[0];
    }
    if (/ឡុកឡាក់|lok\s*lak|摇晃牛肉|禄拉克/i.test(query)) {
      return foods.find((f) => /ឡុកឡាក់|lok\s*lak/i.test(`${f.nameKh} ${f.nameEn}`)) || fallbackDishes[0] || foods[0];
    }
    if (/សម្លកកូរ|korko/i.test(query)) {
      return foods.find((f) => /កកូរ|korko/i.test(`${f.nameKh} ${f.nameEn}`)) || fallbackDishes[0] || foods[0];
    }
    if (/សម្លម្ជូរ|machu|酸汤/i.test(query)) {
      return foods.find((f) => /សម្លម្ជូរ|machu/i.test(`${f.nameKh} ${f.nameEn}`)) || fallbackDishes[0] || foods[0];
    }
    if (/នំបញ្ចុក|banh\s*chok|高棉米粉/i.test(query)) {
      return foods.find((f) => /នំបញ្ចុក|banh/i.test(`${f.nameKh} ${f.nameEn}`)) || fallbackDishes[0] || foods[0];
    }
    if (/គុយទាវ|kuy\s*teav|粿条/i.test(query)) {
      return foods.find((f) => /គុយទាវ|kuy\s*teav/i.test(`${f.nameKh} ${f.nameEn}`)) || fallbackDishes[0] || foods[0];
    }
    if (/ក្តាមឆាម្រេច|ក្ដាមឆាម្រេច|pepper\s*crab|胡椒蟹/i.test(query)) {
      return foods.find((f) => /ក្តាម|ក្ដាម|crab/i.test(`${f.nameKh} ${f.nameEn}`)) || fallbackDishes[0] || foods[0];
    }
  }

  return fallbackDishes[0] || null;
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

  // 3. RECIPE / INGREDIENTS / COOKING STEPS INTENT (Multi-turn aware!)
  if (RECIPE_INTENT_RE.test(trimmed)) {
    const targetFood = findBestDishInQuery(trimmed, foods, memory.lastDishes) || foods[0];
    const loc = getLocalizedFood(targetFood, language);
    const ingredients = (targetFood.ingredients || []).slice(0, 6).map((ing, idx) => ({
      name: language === 'km' ? ing.nameKh : language === 'zh' ? (loc.ingredients?.[idx] || ing.nameEn || ing.nameKh) : (ing.nameEn || ing.nameKh),
      amount: ing.amount || '',
    }));
    const steps = (targetFood.steps || []).slice(0, 5).map((st, idx) => ({
      stepNumber: st.stepNumber || idx + 1,
      instruction: language === 'km' ? st.instructionKh : language === 'zh' ? (loc.steps?.[idx] || st.instructionEn || st.instructionKh) : (st.instructionEn || st.instructionKh),
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
  if (TOURISM_INTENT_RE.test(trimmed) || (detectedProv && !RESTAURANT_INTENT_RE.test(trimmed) && !/ញ៉ាំ|ម្ហូប|បាយ|សម្ល|គុយទាវ|eat|food|dish|吃|菜/i.test(trimmed))) {
    const provKh = detectedProv?.kh || activeProvinceKh;
    const normProv = provKh.replace(/ណ្ដ/g, 'ណ្ត');

    let matchedDests = destinations.filter((d) => {
      const dProv = (d.provinceKh || '').replace(/ណ្ដ/g, 'ណ្ត');
      const dText = `${d.nameKh} ${d.nameEn} ${d.descriptionKh || ''} ${d.descriptionEn || ''} ${d.categoryKh || ''}`.toLowerCase();
      if (normProv && dProv.includes(normProv)) {
        if (/ប្រាសាទ|temple|寺/i.test(trimmed)) return /ប្រាសាទ|temple|វត្ត/i.test(dText);
        if (/ឆ្នេរ|កោះ|beach|island|海滩|岛/i.test(trimmed)) return /ឆ្នេរ|កោះ|beach|island|សមុទ្រ/i.test(dText);
        if (/ទឹកធ្លាក់|ទឹកជ្រោះ|waterfall|瀑布/i.test(trimmed)) return /ទឹកធ្លាក់|ទឹកជ្រោះ|waterfall/i.test(dText);
        return true;
      }
      if (!normProv) {
        if (/ប្រាសាទ|temple|寺/i.test(trimmed)) return /ប្រាសាទ|temple/i.test(dText);
        if (/ឆ្នេរ|កោះ|beach|island|海滩|岛/i.test(trimmed)) return /ឆ្នេរ|កោះ|beach|island/i.test(dText);
        if (/ទឹកធ្លាក់|ទឹកជ្រោះ|waterfall|瀑布/i.test(trimmed)) return /ទឹកធ្លាក់|ទឹកជ្រោះ|waterfall/i.test(dText);
        if (/ភ្នំ|mountain|山/i.test(trimmed)) return /ភ្នំ|mountain/i.test(dText);
      }
      return false;
    });

    if (matchedDests.length === 0) {
      matchedDests = normProv
        ? destinations.filter((d) => (d.provinceKh || '').replace(/ណ្ដ/g, 'ណ្ត').includes(normProv))
        : destinations;
    }

    const topDests = matchedDests.slice(0, 4);
    const provFoods = foods
      .filter((f) => {
        if (!normProv) return false;
        const fText = `${f.nameKh} ${f.nameEn} ${f.descriptionKh || ''} ${f.provinceKh || ''}`.replace(/ណ្ដ/g, 'ណ្ត');
        return fText.includes(normProv);
      })
      .slice(0, 2);

    const provLabel = detectedProv
      ? tr(language, detectedProv.kh, detectedProv.en, detectedProv.zh)
      : normProv || tr(language, 'កម្ពុជា', 'Cambodia', '柬埔寨');

    const reply: AiAssistantMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      intent: 'tourism_discovery',
      destinations: topDests,
      dishes: provFoods,
      text: tr(
        language,
        `🏛️ នេះជាតំបន់ទេសចរណ៍ល្បីៗនៅ${provLabel} ដែល AI សូមណែនាំសម្រាប់ដំណើរកម្សាន្តរបស់អ្នក${provFoods.length > 0 ? ' រួមជាមួយមុខម្ហូបប្រចាំតំបន់៖' : '៖'}`,
        `🏛️ Here are top recommended tourist attractions in ${provLabel} for your trip${provFoods.length > 0 ? ', along with signature local dishes:' : ':'}`,
        `🏛️ 以下是 AI 为您推荐的${provLabel}热门旅游景点${provFoods.length > 0 ? '及当地招牌美食：' : '：'}`
      ),
      followUpChips: [
        {
          id: 'prov_food',
          label: tr(language, `🍲 ម្ហូបល្បីនៅ${provLabel}`, `🍲 Food in ${provLabel}`, `🍲 ${provLabel}美食`),
          query: tr(language, `ម្ហូបឆ្ងាញ់នៅ${provKh || 'សៀមរាប'}មានអ្វីខ្លះ?`, `What food to eat in ${detectedProv?.en || 'Siem Reap'}?`, `${detectedProv?.zh || '暹粒'}有什么特色美食？`),
        },
        {
          id: 'prov_shops',
          label: tr(language, `🏪 ហាងអាហារនៅ${provLabel}`, `🏪 Restaurants in ${provLabel}`, `🏪 ${provLabel}餐厅`),
          query: tr(language, `ណែនាំភោជនីយដ្ឋាននៅ${provKh || 'ភ្នំពេញ'}`, `Recommend restaurants in ${detectedProv?.en || 'Phnom Penh'}`, `推荐${detectedProv?.zh || '金边'}的餐厅`),
        },
        {
          id: 'more_tourism',
          label: tr(language, '🏖️ ឆ្នេរសមុទ្រ & កោះ', '🏖️ Beaches & Islands', '🏖️ 海滩与海岛'),
          query: tr(language, 'ណែនាំឆ្នេរសមុទ្រ និងកោះស្អាតៗនៅកម្ពុជា', 'Recommend beautiful beaches and islands in Cambodia', '推荐柬埔寨美丽的海滩和海岛'),
        },
      ],
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

    let matchedShops = restaurants.filter((r) => {
      const rProv = (r.provinceKh || '').replace(/ណ្ដ/g, 'ណ្ត');
      if (normProv && !rProv.includes(normProv)) return false;
      if (targetFood) {
        const sigText = `${r.nameKh} ${r.nameEn} ${(r.signatureDishesKh || []).join(' ')}`.toLowerCase();
        if (sigText.includes(targetFood.nameKh.toLowerCase())) return true;
      }
      return Boolean(normProv);
    });

    if (matchedShops.length === 0 && targetFood) {
      matchedShops = restaurants.filter((r) =>
        (r.signatureDishesKh || []).some((sig) => sig.includes(targetFood.nameKh) || targetFood.nameKh.includes(sig))
      );
    }
    if (matchedShops.length === 0) {
      matchedShops = restaurants.slice(0, 4);
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

  // 6. FOOD DISCOVERY / CRAVING / FLAVOR / FOLLOW-UP ("more") INTENT
  const isMoreFollowUp = MORE_FOLLOWUP_RE.test(trimmed);
  const effectiveQuery = isMoreFollowUp && memory.lastQuery ? memory.lastQuery : trimmed;

  const advisor = getAiFoodAdvisorRecommendations({
    foods,
    restaurants,
    query: effectiveQuery,
    goal: 'any',
    seed: isMoreFollowUp ? nextSeed + 2 : nextSeed,
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
  if (chosenDishes.length === 0) {
    chosenDishes = advisor.dishes.slice(0, 4);
  }

  const firstDish = chosenDishes[0];
  const firstLoc = firstDish ? getLocalizedFood(firstDish, language) : null;

  let conversationalText = advisor.aiSummaryText;
  if (advisor.brain) {
    conversationalText = `${advisor.brain.headline}${advisor.brain.explanation ? `\n${advisor.brain.explanation}` : ''}`;
  } else if (firstDish && firstLoc) {
    const flavorDesc = describeDish(firstDish, language);
    conversationalText = tr(
      language,
      `${advisor.aiSummaryText}\n✨ មុខម្ហូបលេចធ្លោ៖ «${firstLoc.name}» (${flavorDesc})។ ចុចលើមុខម្ហូបខាងក្រោមដើម្បីមើលរូបមន្តពេញ ឬសួរខ្ញុំបន្តអំពីរបៀបធ្វើ និងហាងលក់!`,
      `${advisor.aiSummaryText}\n✨ Highlight: "${firstLoc.name}" (${flavorDesc}). Tap any dish below for its full recipe, or ask me how to cook it or where to eat it!`,
      `${advisor.aiSummaryText}\n✨ 重点推荐：“${firstLoc.name}”（${flavorDesc}）。点击下方菜品可查看完整食谱，也可以继续问我做法或推荐餐厅！`
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
            id: 'ask_shops',
            label: tr(language, '🏪 ហាងលក់ម្ហូបនេះ', '🏪 Where to Eat', '🏪 推荐餐厅'),
            query: tr(language, `មានហាងណាលក់ ${firstDish.nameKh}?`, `Where can I eat ${firstDish.nameEn}?`, `哪里可以吃到${firstLoc.name}？`),
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
    intent: 'food_discovery',
    dishes: chosenDishes,
    restaurants: advisor.shops.slice(0, 2),
    text: conversationalText,
    followUpChips: followUps,
  };

  return {
    reply,
    nextMemory: {
      ...memory,
      lastDishes: chosenDishes,
      lastRestaurants: advisor.shops.slice(0, 2),
      activeProvinceKh,
      lastQuery: effectiveQuery,
      turnSeed: nextSeed,
    },
  };
}

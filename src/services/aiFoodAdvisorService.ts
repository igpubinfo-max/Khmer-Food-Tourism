import { FoodItem, Language, Restaurant } from '../types';
import { getDishTagIds, DishTagId } from '../utils/dishTags';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';
import { tr } from '../utils/i18n';
import { buildAiBrainInsight, buildMedicalScopeNotice, isMedicalOrHealthQuery, type AiBrainInsight } from './aiFoodBrain';

export type AdvisorGoalId =
  | 'any'
  | 'quick_daily'
  | 'khmer_comfort'
  | 'vip_light_cal'
  | 'vip_high_protein'
  | 'vip_group_feast';

export interface QuickCravingChip {
  id: string;
  queryKh: string;
  queryEn: string;
  queryZh: string;
  labelKh: string;
  labelEn: string;
  labelZh: string;
}

export const QUICK_CRAVING_CHIPS: QuickCravingChip[] = [
  {
    id: 'rice',
    queryKh: 'បាយ',
    queryEn: 'rice',
    queryZh: '米饭',
    labelKh: '🍚 បាយ',
    labelEn: '🍚 Rice',
    labelZh: '🍚 米饭/炒饭',
  },
  {
    id: 'noodles',
    queryKh: 'គុយទាវ',
    queryEn: 'noodles',
    queryZh: '粿条面食',
    labelKh: '🍜 គុយទាវ & មី',
    labelEn: '🍜 Noodles',
    labelZh: '🍜 粿条与粉面',
  },
  {
    id: 'soup',
    queryKh: 'សម្លក្តៅៗ',
    queryEn: 'warm soup',
    queryZh: '热汤',
    labelKh: '🍲 សម្លក្តៅៗ',
    labelEn: '🍲 Warm Soup',
    labelZh: '🍲 暖心热汤',
  },
  {
    id: 'seafood',
    queryKh: 'គ្រឿងសមុទ្រ',
    queryEn: 'seafood',
    queryZh: '海鲜',
    labelKh: '🦀 គ្រឿងសមុទ្រ',
    labelEn: '🦀 Seafood',
    labelZh: '🦀 海鲜河鲜',
  },
  {
    id: 'grilled',
    queryKh: 'សាច់អាំង',
    queryEn: 'grilled',
    queryZh: '烧烤',
    labelKh: '🥩 សាច់អាំង & បំពង',
    labelEn: '🥩 Grilled & Crispy',
    labelZh: '🥩 烧烤煎炸',
  },
  {
    id: 'spicy_sour',
    queryKh: 'ជូរហឹរ',
    queryEn: 'spicy sour',
    queryZh: '酸辣',
    labelKh: '🌶️ ជូរហឹរ',
    labelEn: '🌶️ Spicy & Sour',
    labelZh: '🌶️ 开胃酸辣',
  },
  {
    id: 'streetfood',
    queryKh: 'អាហារសម្រន់',
    queryEn: 'street food',
    queryZh: '街头小吃',
    labelKh: '🍢 អាហារសម្រន់',
    labelEn: '🍢 Street Food',
    labelZh: '🍢 街头小吃',
  },
  {
    id: 'dessert',
    queryKh: 'បង្អែម',
    queryEn: 'dessert',
    queryZh: '甜品',
    labelKh: '🍨 បង្អែមខ្មែរ',
    labelEn: '🍨 Sweet Dessert',
    labelZh: '🍨 传统甜品',
  },
  {
    id: 'vegetarian',
    queryKh: 'ម្ហូបបួស',
    queryEn: 'vegetarian',
    queryZh: '素食',
    labelKh: '🥬 ម្ហូបបួស & បន្លែ',
    labelEn: '🥬 Vegetarian & Veggie',
    labelZh: '🥬 素食与蔬菜',
  },
  {
    id: 'drink_pairing',
    queryKh: 'ម្ហូបអមស្រាបៀរ',
    queryEn: 'beer food',
    queryZh: '下酒菜',
    labelKh: '🍻 ម្ហូបអមភេសជ្ជៈ 👑',
    labelEn: '🍻 Drink Pairing 👑',
    labelZh: '🍻 下酒菜 👑',
  },
];

function normalizeSearchText(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/ណ្ដ/g, 'ណ្ត')
    .replace(/ក្ដ/g, 'ក្ត')
    .replace(/ផ្ដ/g, 'ផ្ត')
    .replace(/ស្ដ/g, 'ស្ត')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»៖។]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MEAT_FISH_SEAFOOD_TITLE_RE =
  /សាច់គោ|សាច់ជ្រូក|សាច់មាន់|មាន់|ទា|ត្រី|បង្គា|បង្កង|ក្តាម|ក្ដាម|មឹក|ងាវ|ខ្យង|គ្រំ|អយស្ទ័រ|កង្កែប|អន្ទង់|ពោះគោ|ឆ្អឹងជំនី|ប្រហិត|ប្រហុក|ផ្អក|កាពិ|ពងទាកូន|ងៀត|ក្រក|គ្រឿងសមុទ្រ|\bbeef\b|\bpork\b|\bchicken\b|\bduck\b|\bfish\b|\bprawn\b|\bshrimp\b|\bcrab\b|\bsquid\b|\bclam\b|\bsnail\b|\boyster\b|\bfrog\b|\beel\b|\btripe\b|\brib\b|\bmeatball\b|\bprahok\b|\bseafood\b|\bbalut\b|\bsausage\b|\bjerky\b/i;

export const VEGETARIAN_QUERY_RE =
  /បួស|ម្ហូបបួស|អាហារបួស|គ្មានសាច់|បន្លែសុទ្ធ|vegetarian|vegan|plant[\s-]*based|meatless|meat[\s-]*free|素食|斋菜|纯素|全素/i;

export function isVegetarianQuery(input: string): boolean {
  return VEGETARIAN_QUERY_RE.test(input || '');
}

export type VegetarianDishClass =
  | 'savory_veggie_adaptable'
  | 'plant_based_savory_snack'
  | 'plant_based_sweet'
  | 'none';

export function classifyVegetarianDish(food: FoodItem): VegetarianDishClass {
  const title = `${food.nameKh || ''} ${food.nameEn || ''}`;
  if (MEAT_FISH_SEAFOOD_TITLE_RE.test(title)) {
    return 'none';
  }
  const ingText = (food.ingredients || [])
    .map((i) => `${i.nameKh || ''} ${i.nameEn || ''}`)
    .join(' ');

  // Savory vegetable stir-fries / salads without meat/fish in the dish name (adaptable 100% vegetarian by using soy/mushroom sauce)
  if (
    /^ឆាត្រកួន|^ឆាផ្កាខាត់ណា|^ឆាបន្លែ|^ឆាផ្សិត|^ឆាត្រប់|^ឆាពពុះសណ្តែក|^ឆាតៅហ៊ូ|morning glory|broccoli|vegetable stir/i.test(
      title
    )
  ) {
    return 'savory_veggie_adaptable';
  }

  // Strictly exclude any other dish whose ingredients contain meat, poultry, fish, seafood, or prahok
  if (MEAT_FISH_SEAFOOD_TITLE_RE.test(ingText)) {
    return 'none';
  }

  // Savory or light plant-based traditional Khmer snacks & drinks (Kralan, Num Krok, Ambok, Hot Soy Milk, Steamed Cassava/Pumpkin/Corn)
  if (
    /ក្រឡាន|នំគ្រក់|អំបុក|ទឹកសណ្តែក|ដំឡូងមីចំហុយ|នំល្ពៅចំហុយ|នំពោតចំហុយ|ចេកណាំវ៉ាស្ងោរ|ចេកចៀន|kralan|num krok|ambok|soy milk|cassava/i.test(
      title
    )
  ) {
    return 'plant_based_savory_snack';
  }

  if (food.categorySlug === 'dessert' || food.categorySlug === 'cake' || /^បង្អែម|^នំ/i.test(food.nameKh || '')) {
    return 'plant_based_sweet';
  }

  return 'savory_veggie_adaptable';
}

interface SemanticRule {
  id: string;
  triggerRegex: RegExp;
  matchFood: (f: FoodItem, titleText: string, fullText: string, tags: DishTagId[]) => number;
}

const SEMANTIC_CRAVING_RULES: SemanticRule[] = [
  {
    id: 'rice',
    triggerRegex: /(?:^|\s)(បាយ|បាយឆា|បាយសាច់|rice|fried rice|steamed rice)(?:\s|$)|米饭|炒饭|饭|白饭|猪肉饭|鸡肉饭/i,
    matchFood: (f, titleText) => {
      if (/^បាយ|បាយឆា|បាយសាច់|បាយមាន់|បាយក្ដាំង|បាយក្តាំង|បាយស្រូប|បាយភ្លៅ|បាយត្រី|fried rice|pork rice|chicken rice|rice with/i.test(f.nameKh + ' ' + f.nameEn)) {
        return 220;
      }
      if (f.categorySlug === 'rice') return 180;
      if (titleText.includes('បាយ') || /\brice\b/i.test(f.nameEn)) return 150;
      return 0;
    },
  },
  {
    id: 'porridge',
    triggerRegex: /បបរ|porridge|congee|粥|鸡肉粥|鱼粥|海鲜粥/i,
    matchFood: (f, titleText) => {
      if (/បបរ|porridge|congee/i.test(f.nameKh + ' ' + f.nameEn)) return 210;
      if (titleText.includes('បបរ')) return 170;
      return 0;
    },
  },
  {
    id: 'noodles',
    triggerRegex: /គុយទាវ|មី|នំបញ្ចុក|លត|ហ្វឺ|សរសៃ|noodle|noodles|kuy teav|num banhchok|lort|pho|粿条|面|面条|米粉|粉面|炒面|汤面|高棉米粉/i,
    matchFood: (f, titleText) => {
      if (/គុយទាវ|មី|នំបញ្ចុក|លត|ហ្វឺ|noodle|kuy teav|banhchok|lort|pho|vermicelli/i.test(titleText)) return 190;
      if (f.categorySlug === 'noodles') return 120;
      return 0;
    },
  },
  {
    id: 'soup_warm',
    triggerRegex: /សម្ល|ស៊ុប|ម្ជូរ|កកូរ|ការី|ក្តៅ|ក្ដៅ|ហុត|ទឹកស៊ុប|អាម៉ុក|soup|warm|hot soup|curry|broth|stew|samlor|amok|汤|热汤|暖|咖喱|酸汤|阿莫克|火锅/i,
    matchFood: (f, titleText) => {
      if (/សម្ល|ស៊ុប|ម្ជូរ|កកូរ|ការី|អាម៉ុក|បបរ|ស្ងោរ|soup|curry|samlor|amok|hotpot|broth/i.test(titleText)) return 195;
      if (f.categorySlug === 'soup') return 165;
      return 0;
    },
  },
  {
    id: 'seafood',
    triggerRegex: /គ្រឿងសមុទ្រ|ត្រី|ក្តាម|ក្ដាម|បង្គា|មឹក|ងាវ|ខ្យង|អយស្ទ័រ|seafood|fish|crab|shrimp|prawn|squid|calamari|oyster|shellfish|clam|海鲜|海鮮|鱼|螃蟹|蟹|虾|蝦|鱿鱼|蛤蜊|生蚝/i,
    matchFood: (f, titleText, fullText) => {
      if (f.categorySlug === 'dessert' || f.categorySlug === 'cake') return 0;
      if (/គ្រឿងសមុទ្រ|ត្រី|ក្តាម|ក្ដាម|បង្គា|មឹក|ងាវ|ខ្យង|អយស្ទ័រ|seafood|fish|crab|shrimp|prawn|squid|calamari|oyster|clam/i.test(titleText)) {
        return 200;
      }
      if (/គ្រឿងសមុទ្រ|ក្តាម|ក្ដាម|បង្គា|មឹក|ងាវ|seafood|crab|shrimp|prawn|squid|oyster/i.test(fullText)) {
        return 110;
      }
      return 0;
    },
  },
  {
    id: 'grilled_crispy',
    triggerRegex: /អាំង|បំពង|ចៀន|ស្រួយ|សាច់អាំង|ដុត|grilled|grill|bbq|barbecue|fried|crispy|roast|roasted|烧烤|烤|炸|煎|香脆|脆皮|烤肉|烤鱼|烤鸡/i,
    matchFood: (f, titleText, _fullText, tags) => {
      if (f.categorySlug === 'dessert' || f.categorySlug === 'cake') return 0;
      if (f.categorySlug === 'grilled') return 195;
      if (/អាំង|បំពង|ចៀន|ស្រួយ|ដុត|grilled|fried|crispy|roast|bbq/i.test(titleText)) return 180;
      if (tags.includes('grilled')) return 140;
      return 0;
    },
  },
  {
    id: 'stirfry',
    triggerRegex: /ឆា|ឡុកឡាក់|stir[\s-]*fry|stir[\s-]*fried|lok lak|wok|炒|热炒|小炒|禄拉克/i,
    matchFood: (f, titleText) => {
      if (f.categorySlug === 'stirfry') return 190;
      if (/ឆា|ឡុកឡាក់|stir[\s-]*fr|lok lak/i.test(titleText)) return 175;
      return 0;
    },
  },
  {
    id: 'spicy_sour_salad',
    triggerRegex: /ញាំ|ភ្លា|បុក|ហឹរ|ជូរ|ជូរហឹរ|ម្រេច|កapi|កាពិ|ប្រហុក|ទឹកគ្រឿង|salad|spicy|sour|zesty|chili|pepper|papaya|prahok|凉拌|沙拉|辣|酸|酸辣|青木瓜|胡椒|波罗福/i,
    matchFood: (f, titleText, fullText) => {
      if (f.categorySlug === 'dessert' || f.categorySlug === 'cake') return 0;
      if (f.categorySlug === 'salad') return 195;
      if (/ញាំ|ភ្លា|បុក|ម្ជូរ|ហឹរ|ម្រេច|ក្តៅ|ប្រហុក|ទឹកគ្រឿង|salad|spicy|sour|pepper|prahok|papaya/i.test(titleText)) {
        return 185;
      }
      if (/ហឹរ|ជូរ|ម្រេច|ម្ទេស|spicy|sour|chili/i.test(fullText)) return 95;
      return 0;
    },
  },
  {
    id: 'streetfood_snack',
    triggerRegex: /អាហារសម្រន់|សម្រន់|street\s*food|snack|snacks|បាញ់ឆែវ|នំគ្រក់|ប្រហិត|លតឆា|នំប៉័ង|ពងទាកូន|សាច់ចង្កាក់|街头小吃|小吃/i,
    matchFood: (f, titleText) => {
      if (/នំប៉័ង|លតឆា|ប្រហិត|សាច់ចង្កាក់|នំគ្រក់|បាញ់ឆែវ|ចេកចៀន|ដំឡូង|ពងទាកូន|ខ្យង|ងាវ|បុកល្ហុង|ស្លាបមាន់|ក្រឡាន|គុយទាវកាត់|មីឆា|នំកಚាយ|នំបញ្ចុក|អាំង|បំពង|ចៀន|street|snack|skewer|meatball|pancake|baguette|spring roll|fritter|fried/i.test(titleText)) {
        return 200;
      }
      if (f.categorySlug === 'grilled' || f.categorySlug === 'salad' || f.categorySlug === 'dessert') return 90;
      return 0;
    },
  },
  {
    id: 'drink_pairing',
    triggerRegex: /ម្ហូបអម|ក្លែម|ស្រាបៀរ|ភេសជ្ជៈ|beer\s*food|drink\s*pairing|bar\s*snack|下酒菜|啤酒/i,
    matchFood: (f, titleText, _fullText, tags) => {
      if (f.categorySlug === 'dessert' || f.categorySlug === 'cake' || f.categorySlug === 'rice') return 0;
      if (/អាំង|បំពង|ចៀន|ភ្លា|ញាំ|បុក|ងាវ|ក្តាម|ក្ដាម|បង្គា|មឹក|ស្លាបមាន់|ឆ្អឹងជំនី|គោឡើងភ្នំ|សាច់គោ|ម្រេច|ប្រហុក|grilled|fried|crispy|wings|ribs|salad|ceviche|clam|crab|shrimp|squid|beef/i.test(titleText)) {
        return 210;
      }
      if (f.categorySlug === 'grilled' || f.categorySlug === 'salad' || tags.includes('grilled') || tags.includes('spicy')) {
        return 150;
      }
      return 0;
    },
  },
  {
    id: 'steamed_boiled_style',
    triggerRegex: /ស្ងោរ|ចំហុយ|steamed|boiled|清蒸|水煮/i,
    matchFood: (_f, titleText, _fullText, tags) => {
      let score = 0;
      if (tags.includes('steamed_boiled')) score += 80;
      if (/ស្ងោរ|ចំហុយ|បបរ|សម្លប្រហើរ|steamed|boiled|porridge|clear soup/i.test(titleText)) score += 110;
      return score;
    },
  },
  {
    id: 'vegetarian_plant_based',
    triggerRegex: /បួស|ម្ហូបបួស|អាហារបួស|គ្មានសាច់|បន្លែសុទ្ធ|vegetarian|vegan|plant[\s-]*based|meatless|meat[\s-]*free|素食|斋菜|纯素|全素/i,
    matchFood: (f) => {
      const vClass = classifyVegetarianDish(f);
      if (vClass === 'none') return -999;
      if (vClass === 'savory_veggie_adaptable') return 260;
      if (vClass === 'plant_based_savory_snack') return 245;
      if (vClass === 'plant_based_sweet') return 195;
      return 0;
    },
  },
  {
    id: 'dessert_sweet',
    triggerRegex: /បង្អែម|ផ្អែម|ចេកខ្ទិះ|ល្ពៅ|ត្នោត|ខ្ទិះ|សង់ខ្យា|អន្សម|ក្រឡាន|dessert|desserts|sweet|sweets|cake|pastry|custard|sticky rice|甜品|甜点|甜點|甜|糕点|下午茶|椰奶|南瓜|粽|竹筒饭/i,
    matchFood: (f, titleText) => {
      if (f.categorySlug === 'dessert' || f.categorySlug === 'cake') return 210;
      if (/^បង្អែម|^នំ(?!បញ្ចុក|ប៉័ង)|ចេកខ្ទិះ|សង់ខ្យា|អន្សម|ក្រឡាន|បបរផ្អែម|បាញ់ឌុក|dessert|sweet|cake|custard|pudding/i.test(titleText)) return 185;
      return 0;
    },
  },
  {
    id: 'beef',
    triggerRegex: /សាច់គោ|គោ|beef|steak|牛肉|牛/i,
    matchFood: (_f, titleText, fullText) => {
      if (/សាច់គោ|គោ|beef/i.test(titleText)) return 170;
      if (/សាច់គោ|beef/i.test(fullText)) return 85;
      return 0;
    },
  },
  {
    id: 'pork',
    triggerRegex: /សាច់ជ្រូក|ជ្រូក|ឆ្អឹងជំនី|pork|ribs|猪肉|猪|排骨/i,
    matchFood: (_f, titleText, fullText) => {
      if (/សាច់ជ្រូក|ជ្រូក|ឆ្អឹងជំនី|pork|rib/i.test(titleText)) return 170;
      if (/សាច់ជ្រូក|pork/i.test(fullText)) return 85;
      return 0;
    },
  },
  {
    id: 'chicken_duck',
    triggerRegex: /សាច់មាន់|មាន់|ទា|chicken|poultry|duck|鸡肉|鸡|鸭肉|鸭/i,
    matchFood: (_f, titleText, fullText) => {
      if (/សាច់មាន់|មាន់|ទា|chicken|duck/i.test(titleText)) return 170;
      if (/សាច់មាន់|មាន់|chicken|duck/i.test(fullText)) return 85;
      return 0;
    },
  },
];

export interface AiFoodAdvisorOutput {
  dishes: FoodItem[];
  allMatchedDishes: FoodItem[];
  totalMatchedCount: number;
  shops: Restaurant[];
  hasActiveQuery: boolean;
  aiSummaryText: string;
  /** Smart "AI brain" insight (bridges unknown cravings, moods, VIP drink-pairing, safety…). */
  brain: AiBrainInsight | null;
}

/**
 * Multilingual AI Food & Craving Recommendation Engine.
 * Supports Khmer, English, and Chinese natural language cravings, dish names, ingredients, and nutrition goals.
 */
export function getAiFoodAdvisorRecommendations(params: {
  foods: FoodItem[];
  restaurants: Restaurant[];
  query: string;
  goal: AdvisorGoalId;
  seed: number;
  language: Language;
  canUseVip?: boolean;
}): AiFoodAdvisorOutput {
  const { foods, restaurants, query, goal, seed, language, canUseVip = false } = params;
  const cleanQuery = normalizeSearchText(query);
  const hasActiveQuery = cleanQuery.length > 0;
  let hasTitleMatch = false;

  // Strict Medical / Disease Scope Boundary Refusal: never recommend foods for medical conditions
  if (hasActiveQuery && isMedicalOrHealthQuery(query)) {
    const scopeBrain = buildMedicalScopeNotice(language);
    return {
      dishes: [],
      allMatchedDishes: [],
      totalMatchedCount: 0,
      shops: [],
      hasActiveQuery: true,
      aiSummaryText: scopeBrain.headline,
      brain: scopeBrain,
    };
  }

  // Tokenize query into words (supporting Khmer, English, and Chinese substrings)
  const tokens = cleanQuery
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // Determine which semantic craving rules are triggered by the user's query
  const activeRules = hasActiveQuery
    ? SEMANTIC_CRAVING_RULES.filter((rule) => rule.triggerRegex.test(cleanQuery))
    : [];

  const scoredFoods: Array<{ food: FoodItem; score: number }> = [];

  for (const food of foods) {
    const tags = getDishTagIds(food);
    const zhLoc = getLocalizedFood(food, 'zh');

    const titleText = normalizeSearchText(`${food.nameKh} ${food.nameEn} ${zhLoc.name}`);
    const categoryText = normalizeSearchText(
      `${food.categoryKh || ''} ${food.categorySlug || ''} ${zhLoc.category} ${food.provinceKh || ''} ${food.provinceEn || ''} ${zhLoc.province}`
    );
    const ingredientText = normalizeSearchText(
      `${(food.ingredientsKh || []).join(' ')} ${(food.ingredientsEn || []).join(' ')} ${(zhLoc.ingredients || []).join(' ')}`
    );
    const descText = normalizeSearchText(
      `${food.descriptionKh || ''} ${food.descriptionEn || ''} ${zhLoc.description} ${food.tasteProfile || ''}`
    );
    const fullText = `${titleText} ${categoryText} ${ingredientText} ${descText}`;

    if (hasActiveQuery) {
      let score = 0;

      // 1. Direct query match in title (highest priority)
      if (titleText === cleanQuery || titleText.startsWith(cleanQuery)) {
        score += 290;
        hasTitleMatch = true;
      } else if (titleText.includes(cleanQuery)) {
        score += 240;
        hasTitleMatch = true;
      }

      // 2. Semantic craving rule match (e.g., បាយ / rice / 米饭 / សម្លក្តៅៗ / 海鲜)
      for (const rule of activeRules) {
        score += rule.matchFood(food, titleText, fullText, tags);
      }

      // 3. Token-by-token matching across title, category, ingredients, and description
      let matchedTokens = 0;
      for (const token of tokens) {
        if (titleText.includes(token)) {
          score += 120;
          matchedTokens++;
        } else if (ingredientText.includes(token)) {
          score += 45;
          matchedTokens++;
        } else if (categoryText.includes(token) && activeRules.length === 0) {
          score += 35;
          matchedTokens++;
        } else if (descText.includes(token) && activeRules.length === 0) {
          score += 20;
          matchedTokens++;
        }
      }

      if (tokens.length > 1 && matchedTokens === tokens.length) {
        score += 60;
      }

      // Slight boost if dish also aligns with the selected goal
      if (score > 0 && matchesGoal(food, titleText, fullText, tags, goal)) {
        score += 18;
      }

      if (isVegetarianQuery(query) && classifyVegetarianDish(food) === 'none') {
        score = -999;
      }

      if (score >= 40) {
        scoredFoods.push({ food, score });
      }
    } else {
      // No text query: filter by the selected Daily Goal
      if (matchesGoal(food, titleText, fullText, tags, goal)) {
        const baseScore = 100 + (food.rating || 4.5) * 10;
        scoredFoods.push({ food, score: baseScore });
      }
    }
  }

  // Sort by score descending, with deterministic seed rotation among similarly scored dishes
  scoredFoods.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (Math.abs(scoreDiff) > 15) return scoreDiff;
    const rotA = (a.food.id.charCodeAt(a.food.id.length - 1) * 7 + seed * 13) % 19;
    const rotB = (b.food.id.charCodeAt(b.food.id.length - 1) * 7 + seed * 13) % 19;
    if (rotA !== rotB) return rotA - rotB;
    return (b.food.rating || 0) - (a.food.rating || 0);
  });

  const totalMatchedCount = scoredFoods.length;

  // Smart AI brain: understands foreign dishes, moods, health notes, VIP drink-pairing and unknown cravings.
  const brain = hasActiveQuery
    ? buildAiBrainInsight({
        foods,
        query,
        language,
        canUseVip,
        seed,
        directMatchCount: totalMatchedCount,
        hasTitleMatch,
      })
    : null;

  const allMatchedDishes: FoodItem[] =
    scoredFoods.length > 0
      ? scoredFoods.map((item) => item.food)
      : brain && brain.dishes.length > 0
        ? brain.dishes.map((d) => d.food)
        : [];

  // If the user typed a query that matched dishes, return up to 6 top matches (rotated by seed when Refresh is clicked)
  let topDishes: FoodItem[];
  if (brain && brain.dishes.length > 0) {
    topDishes = brain.dishes.map((d) => d.food);
  } else if (scoredFoods.length > 0) {
    const limit = hasActiveQuery ? 6 : 4;
    if (scoredFoods.length <= limit || seed <= 1) {
      topDishes = scoredFoods.slice(0, limit).map((item) => item.food);
    } else {
      const poolSize = Math.min(scoredFoods.length, 15);
      const topPool = scoredFoods.slice(0, poolSize).map((item) => item.food);
      const offset = ((seed - 1) * 2) % topPool.length;
      topDishes = [...topPool.slice(offset), ...topPool.slice(0, offset)].slice(0, limit);
    }
  } else {
    // Fallback if query had zero exact matches: pick popular dishes rotated by seed
    const fallbackPool = [...foods].sort((a, b) => {
      const ha = (a.id.charCodeAt(a.id.length - 1) + seed * 7) % 13;
      const hb = (b.id.charCodeAt(b.id.length - 1) + seed * 7) % 13;
      return ha - hb || (b.rating || 0) - (a.rating || 0);
    });
    topDishes = fallbackPool.slice(0, 4);
  }

  // Match restaurants serving these dishes or matching the query
  const isVeg = isVegetarianQuery(query);
  const matchedShops = restaurants
    .filter((r) => {
      const hay = normalizeSearchText(
        `${r.nameKh} ${r.nameEn} ${(r.signatureDishesKh || []).join(' ')} ${r.provinceKh} ${r.cuisineType || ''}`
      );
      if (isVeg) {
        return /បួស|បន្លែ|តៅហ៊ូ|vegetarian|vegan|veggie|plant|素食|斋/i.test(hay);
      }
      if (hasActiveQuery && hay.includes(cleanQuery)) return true;
      return topDishes.some((d) =>
        (r.signatureDishesKh || []).some((sig) => {
          const normSig = normalizeSearchText(sig);
          const normDish = normalizeSearchText(d.nameKh);
          return normSig.includes(normDish) || normDish.includes(normSig);
        })
      );
    })
    .slice(0, 3);

  const aiSummaryText = brain
    ? brain.headline
    : buildAiSummaryText({
        hasActiveQuery,
        query: query.trim(),
        totalMatchedCount,
        goal,
        language,
        topDishes,
      });

  return {
    dishes: topDishes,
    allMatchedDishes,
    totalMatchedCount,
    shops: matchedShops,
    hasActiveQuery,
    aiSummaryText,
    brain,
  };
}

function matchesGoal(
  food: FoodItem,
  titleText: string,
  fullText: string,
  tags: DishTagId[],
  goal: AdvisorGoalId
): boolean {
  if (goal === 'quick_daily') {
    return (
      food.categorySlug === 'rice' ||
      food.categorySlug === 'noodles' ||
      food.categorySlug === 'stirfry' ||
      /គុយទាវ|បាយ|មី|នំបញ្ចុក|ឆា|បបរ|noodle|rice|stirfry/i.test(titleText)
    );
  }
  if (goal === 'khmer_comfort') {
    return (
      food.categorySlug === 'soup' ||
      food.categorySlug === 'specialty' ||
      /សម្ល|អាម៉ុក|កកូរ|ម្ជូរ|ប្រហុក|ទឹកគ្រឿង|amok|samlor|soup/i.test(fullText)
    );
  }
  if (goal === 'vip_light_cal') {
    return tags.includes('light') || tags.includes('steamed_boiled') || (food.calories > 0 && food.calories <= 450);
  }
  if (goal === 'vip_high_protein') {
    return tags.includes('protein_rich') || tags.includes('grilled');
  }
  if (goal === 'vip_group_feast') {
    return (
      food.categorySlug === 'grilled' ||
      food.categorySlug === 'soup' ||
      /ស៊ុប|អាំង|ត្រី|គ្រឿងសមុទ្រ|ឈុត|សម្ល|grilled|seafood|soup/i.test(titleText)
    );
  }
  return true;
}

function buildAiSummaryText(params: {
  hasActiveQuery: boolean;
  query: string;
  totalMatchedCount: number;
  goal: AdvisorGoalId;
  language: Language;
  topDishes?: FoodItem[];
}): string {
  const { hasActiveQuery, query, totalMatchedCount, goal, language, topDishes = [] } = params;

  if (hasActiveQuery) {
    if (isVegetarianQuery(query)) {
      return tr(
        language,
        `🥬 ការណែនាំម្ហូបបួស និងអាហាររុក្ខជាតិពី AI សម្រាប់ «${query}»៖\nយើងបានជ្រើសរើសមុខម្ហូបបន្លែស្រស់ អាហារសម្រន់ និងបង្អែមខ្មែរគ្មានសាច់ រួមទាំងគ្រឿងផ្សំ របៀបធ្វើ និងរសជាតិលម្អិតខាងក្រោម៖`,
        `🥬 AI Vegetarian & Plant-Based Culinary Guide for "${query}":\nHere are curated meat-free Cambodian vegetable dishes, traditional plant-based snacks, and desserts with full ingredients, cooking methods, and taste profiles:`,
        `🥬 AI 为您定制的“${query}”高棉素食与植物性美食指南：\n已为您精选无肉时蔬热炒、传统植物性小吃与高棉甜品，并附上详细食材、烹饪方法与风味解析：`
      );
    }
    if (totalMatchedCount > 0) {
      const previewNames = topDishes
        .slice(0, 3)
        .map((d) => getLocalizedFood(d, language).name)
        .join(language === 'zh' ? '、' : ', ');
      return tr(
        language,
        `✨ ការណែនាំមុខម្ហូបពិសេសពី AI សម្រាប់ «${query}»៖\nរួមមាន ${previewNames} និងមុខម្ហូបដែលត្រូវនឹងចំណង់ចំណូលចិត្តរបស់អ្នក ជាមួយគ្រឿងផ្សំ របៀបចម្អិន និងហាងអាហារណែនាំ៖`,
        `✨ AI Personalized Food Recommendations for "${query}":\nFeaturing ${previewNames} — complete with taste profiles, ingredients, cooking methods, and places to eat:`,
        `✨ AI 为您定制的“${query}”美食推荐：\n精选 ${previewNames} 等契合您口味的佳肴，包含风味特色、食材做法及推荐餐厅：`
      );
    }
    return tr(
      language,
      `🤖 មិនមានឈ្មោះម្ហូប «${query}» ផ្ទាល់នៅក្នុងទិន្នន័យទេ តែនេះជាមុខម្ហូបខ្មែរដែលមានរសជាតិស្រដៀងគ្នា ដែល AI សូមណែនាំជំនួស៖`,
      `🤖 "${query}" is not listed directly in our database — here are the closest authentic Cambodian dishes recommended by AI:`,
      `🤖 数据库中暂无直接名为“${query}”的菜品，以下是 AI 为您推荐的风味最相近的正宗高棉美食：`
    );
  }

  const goalDescriptions: Record<Exclude<AdvisorGoalId, 'any'>, [string, string, string]> = {
    quick_daily: [
      '🤖 ណែនាំអាហាររហ័ស ឆ្ងាញ់ និងងាយស្រួលញ៉ាំប្រចាំថ្ងៃ៖',
      '🤖 Recommended quick & tasty everyday meals:',
      '🤖 为您推荐快捷美味的日常餐点：',
    ],
    khmer_comfort: [
      '🤖 ណែនាំសម្លខ្មែរ អាម៉ុក និងម្ហូបប្រពៃណីពេញនិយម៖',
      '🤖 Recommended authentic Cambodian comfort dishes:',
      '🤖 为您推荐正宗高棉家常汤品与传统名菜：',
    ],
    vip_light_cal: [
      '🤖 ណែនាំម្ហូបចំហុយ ស្ងោរ និងសម្លប្រហើររសជាតិដើម៖',
      '🤖 Recommended steamed, boiled & delicate broth dishes:',
      '🤖 为您推荐清蒸、水煮与鲜美清汤美食：',
    ],
    vip_high_protein: [
      '🤖 ណែនាំមុខម្ហូបសាច់អាំង ត្រី និងគ្រឿងសមុទ្រពិសេស៖',
      '🤖 Recommended grilled meats, fish & seafood specialties:',
      '🤖 为您推荐炭火烤肉、鲜鱼与海鲜特色菜：',
    ],
    vip_group_feast: [
      '🤖 ណែនាំមុខម្ហូបឈុតធំ សម្រាប់ជួបជុំគ្រួសារ និងមិត្តភក្តិ៖',
      '🤖 Recommended shareable dishes for family & friends:',
      '🤖 为您推荐适合家庭与朋友聚餐分享的招牌菜：',
    ],
  };

  const [kh, en, zh] = goalDescriptions[goal === 'any' ? 'quick_daily' : goal];
  return tr(language, kh, en, zh);
}

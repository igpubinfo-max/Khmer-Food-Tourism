import { FoodItem, Language, Restaurant } from '../types';
import { getDishTagIds, DishTagId } from '../utils/dishTags';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';
import { tr } from '../utils/i18n';

export type AdvisorGoalId =
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
    id: 'light',
    queryKh: 'អាហារមិនសូវខ្លាញ់',
    queryEn: 'light low oil',
    queryZh: '少油清淡',
    labelKh: '🥗 ស្រាលក្រពះ',
    labelEn: '🥗 Light & Healthy',
    labelZh: '🥗 少油清淡',
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

interface SemanticRule {
  id: string;
  triggerRegex: RegExp;
  matchFood: (f: FoodItem, titleText: string, fullText: string, tags: DishTagId[]) => number;
}

const SEMANTIC_CRAVING_RULES: SemanticRule[] = [
  {
    id: 'rice',
    triggerRegex: /(?:^|\s)(បាយ|បាយឆា|បាយសាច់|rice|fried rice|steamed rice)(?:\s|$)|米饭|炒饭|饭|白饭|猪肉饭|鸡肉饭/i,
    matchFood: (f, titleText, fullText) => {
      if (/^បាយ|បាយឆា|បាយសាច់|បាយមាន់|បាយក្ដាំង|បាយក្តាំង|បាយស្រូប|បាយភ្លៅ|បាយត្រី|fried rice|pork rice|chicken rice|rice with/i.test(f.nameKh + ' ' + f.nameEn)) {
        return 180;
      }
      if (f.categorySlug === 'rice') return 150;
      if (titleText.includes('បាយ') || /\brice\b/i.test(f.nameEn)) return 120;
      if (f.categorySlug === 'stirfry' || f.categorySlug === 'grilled') return 35;
      return fullText.includes('បាយ') ? 15 : 0;
    },
  },
  {
    id: 'porridge',
    triggerRegex: /បបរ|porridge|congee|粥|鸡肉粥|鱼粥|海鲜粥/i,
    matchFood: (f, titleText) => {
      if (/បបរ|porridge|congee/i.test(f.nameKh + ' ' + f.nameEn)) return 190;
      if (titleText.includes('បបរ')) return 150;
      return 0;
    },
  },
  {
    id: 'noodles',
    triggerRegex: /គុយទាវ|មី|នំបញ្ចុក|លត|ហ្វឺ|សរសៃ|noodle|noodles|kuy teav|num banhchok|lort|pho|粿条|面|面条|米粉|粉面|炒面|汤面|高棉米粉/i,
    matchFood: (f, titleText) => {
      if (f.categorySlug === 'noodles') return 170;
      if (/គុយទាវ|មី|នំបញ្ចុក|លត|ហ្វឺ|noodle|kuy teav|banhchok|lort/i.test(titleText)) return 160;
      return 0;
    },
  },
  {
    id: 'soup_warm',
    triggerRegex: /សម្ល|ស៊ុប|ម្ជូរ|កកូរ|ការី|ក្តៅ|ក្ដៅ|ហុត|ទឹកស៊ុប|អាម៉ុក|soup|warm|hot soup|curry|broth|stew|samlor|amok|汤|热汤|暖|咖喱|酸汤|阿莫克|火锅/i,
    matchFood: (f, titleText) => {
      if (f.categorySlug === 'soup') return 165;
      if (/សម្ល|ស៊ុប|ម្ជូរ|កកូរ|ការី|អាម៉ុក|បបរ|soup|curry|samlor|amok|hotpot/i.test(titleText)) return 155;
      return 0;
    },
  },
  {
    id: 'seafood',
    triggerRegex: /គ្រឿងសមុទ្រ|ត្រី|ក្តាម|ក្ដាម|បង្គា|មឹក|ងាវ|ខ្យង|អយស្ទ័រ|seafood|fish|crab|shrimp|prawn|squid|calamari|oyster|shellfish|clam|海鲜|海鮮|鱼|螃蟹|蟹|虾|蝦|鱿鱼|蛤蜊|生蚝/i,
    matchFood: (_f, titleText, fullText) => {
      if (/គ្រឿងសមុទ្រ|ត្រី|ក្តាម|ក្ដាម|បង្គា|មឹក|ងាវ|seafood|fish|crab|shrimp|prawn|squid|calamari|oyster/i.test(titleText)) {
        return 170;
      }
      if (/គ្រឿងសមុទ្រ|ត្រី|ក្តាម|ក្ដាម|បង្គា|មឹក|ងាវ|seafood|fish|crab|shrimp|prawn|squid/i.test(fullText)) {
        return 90;
      }
      return 0;
    },
  },
  {
    id: 'grilled_crispy',
    triggerRegex: /អាំង|បំពង|ចៀន|ស្រួយ|សាច់អាំង|ដុត|grilled|grill|bbq|barbecue|fried|crispy|roast|roasted|烧烤|烤|炸|煎|香脆|脆皮|烤肉|烤鱼|烤鸡/i,
    matchFood: (f, titleText, _fullText, tags) => {
      if (f.categorySlug === 'grilled') return 165;
      if (/អាំង|បំពង|ចៀន|ស្រួយ|ដុត|grilled|fried|crispy|roast|bbq/i.test(titleText)) return 155;
      if (tags.includes('grilled')) return 120;
      return 0;
    },
  },
  {
    id: 'stirfry',
    triggerRegex: /ឆា|ឡុកឡាក់|stir[\s-]*fry|stir[\s-]*fried|lok lak|wok|炒|热炒|小炒|禄拉克/i,
    matchFood: (f, titleText) => {
      if (f.categorySlug === 'stirfry') return 165;
      if (/ឆា|ឡុកឡាក់|stir[\s-]*fr|lok lak/i.test(titleText)) return 155;
      return 0;
    },
  },
  {
    id: 'spicy_sour_salad',
    triggerRegex: /ញាំ|ភ្លា|បុក|ហឹរ|ជូរ|ជូរហឹរ|ម្រេច|កapi|កាពិ|ប្រហុក|ទឹកគ្រឿង|salad|spicy|sour|zesty|chili|pepper|papaya|prahok|凉拌|沙拉|辣|酸|酸辣|青木瓜|胡椒|波罗福/i,
    matchFood: (f, titleText, fullText) => {
      if (f.categorySlug === 'salad') return 160;
      if (/ញាំ|ភ្លា|បុក|ម្ជូរ|ហឹរ|ម្រេច|ក្តៅ|ប្រហុក|ទឹកគ្រឿង|salad|spicy|sour|pepper|prahok|papaya/i.test(titleText)) {
        return 155;
      }
      if (/ហឹរ|ជូរ|ម្រេច|ម្ទេស|spicy|sour|chili/i.test(fullText)) return 85;
      return 0;
    },
  },
  {
    id: 'light_healthy',
    triggerRegex: /មិនសូវខ្លាញ់|ខ្លាញ់តិច|ស្រាលក្រពះ|ស្រាល|សុខភាព|កាឡូរីទាប|ស្ងោរ|ចំហុយ|បន្លែ|បួស|light|low oil|low fat|low calorie|healthy|diet|steamed|boiled|veggie|vegetarian|vegan|clean|清淡|少油|低脂|低卡|健康|轻食|减肥|清蒸|水煮|蔬菜|素食/i,
    matchFood: (f, titleText, _fullText, tags) => {
      let score = 0;
      if (tags.includes('light')) score += 90;
      if (tags.includes('steamed_boiled')) score += 80;
      if (tags.includes('vegetable_rich') || tags.includes('vegetarian_friendly')) score += 70;
      if (/ស្ងោរ|ចំហុយ|បបរ|សម្លប្រហើរ|បន្លែ|steamed|boiled|porridge|clear soup|vegetable/i.test(titleText)) score += 80;
      if (f.calories > 0 && f.calories <= 420) score += 40;
      return score;
    },
  },
  {
    id: 'dessert_sweet',
    triggerRegex: /បង្អែម|នំ|ផ្អែម|សម្រន់|ចេក|ល្ពៅ|ត្នោត|ខ្ទិះ|សង់ខ្យា|អន្សម|ក្រឡាន|dessert|desserts|sweet|sweets|cake|pastry|snack|custard|sticky rice|banana|甜品|甜点|甜點|甜|糕点|小吃|下午茶|椰奶|香蕉|南瓜|粽|竹筒饭/i,
    matchFood: (f, titleText) => {
      if (f.categorySlug === 'dessert' || f.categorySlug === 'cake') return 175;
      if (/បង្អែម|នំ|ចេក|ល្ពៅ|សង់ខ្យា|អន្សម|ក្រឡាន|dessert|sweet|cake|custard/i.test(titleText)) return 160;
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
  totalMatchedCount: number;
  shops: Restaurant[];
  hasActiveQuery: boolean;
  aiSummaryText: string;
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
}): AiFoodAdvisorOutput {
  const { foods, restaurants, query, goal, seed, language } = params;
  const cleanQuery = normalizeSearchText(query);
  const hasActiveQuery = cleanQuery.length > 0;

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
        score += 260;
      } else if (titleText.includes(cleanQuery)) {
        score += 200;
      }

      // 2. Semantic craving rule match (e.g., បាយ / rice / 米饭 / សម្លក្តៅៗ / 海鲜)
      for (const rule of activeRules) {
        score += rule.matchFood(food, titleText, fullText, tags);
      }

      // 3. Token-by-token matching across title, category, ingredients, and description
      let matchedTokens = 0;
      for (const token of tokens) {
        if (titleText.includes(token)) {
          score += 95;
          matchedTokens++;
        } else if (categoryText.includes(token)) {
          score += 65;
          matchedTokens++;
        } else if (ingredientText.includes(token)) {
          score += 45;
          matchedTokens++;
        } else if (descText.includes(token)) {
          // If the user specifically searched for "បាយ" / "rice" / "米饭", don't over-score soups that merely say "ញ៉ាំជាមួយបាយ"
          if (activeRules.some((r) => r.id === 'rice') && food.categorySlug !== 'rice' && !titleText.includes('បាយ')) {
            score += 8;
          } else {
            score += 25;
            matchedTokens++;
          }
        }
      }

      if (tokens.length > 1 && matchedTokens === tokens.length) {
        score += 60;
      }

      // Slight boost if dish also aligns with the selected goal
      if (score > 0 && matchesGoal(food, titleText, fullText, tags, goal)) {
        score += 18;
      }

      if (score >= 25) {
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
    if (Math.abs(scoreDiff) > 25) return scoreDiff;
    const rotA = (a.food.id.charCodeAt(a.food.id.length - 1) * 7 + seed * 13) % 19;
    const rotB = (b.food.id.charCodeAt(b.food.id.length - 1) * 7 + seed * 13) % 19;
    if (rotA !== rotB) return rotA - rotB;
    return (b.food.rating || 0) - (a.food.rating || 0);
  });

  const totalMatchedCount = scoredFoods.length;

  // If the user typed a query that matched dishes, return up to 6 top matches (rotated by seed when Refresh is clicked)
  let topDishes: FoodItem[];
  if (scoredFoods.length > 0) {
    const limit = hasActiveQuery ? 5 : 4;
    if (scoredFoods.length <= limit || seed === 1) {
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
  const matchedShops = restaurants
    .filter((r) => {
      const hay = normalizeSearchText(
        `${r.nameKh} ${r.nameEn} ${(r.signatureDishesKh || []).join(' ')} ${r.provinceKh} ${r.cuisineType || ''}`
      );
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

  const aiSummaryText = buildAiSummaryText({
    hasActiveQuery,
    query: query.trim(),
    totalMatchedCount,
    goal,
    language,
  });

  return {
    dishes: topDishes,
    totalMatchedCount,
    shops: matchedShops.length > 0 ? matchedShops : restaurants.slice(0, 2),
    hasActiveQuery,
    aiSummaryText,
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
}): string {
  const { hasActiveQuery, query, totalMatchedCount, goal, language } = params;

  if (hasActiveQuery) {
    if (totalMatchedCount > 0) {
      return tr(
        language,
        `🤖 AI បានរកឃើញមុខម្ហូបដែលត្រូវនឹង «${query}» ចំនួន ${totalMatchedCount} មុខ សម្រាប់អ្នក៖`,
        `🤖 AI matched ${totalMatchedCount} dish(es) for "${query}":`,
        `🤖 AI 已为您智能匹配 ${totalMatchedCount} 道符合“${query}”的推荐美食：`
      );
    }
    return tr(
      language,
      `🤖 មិនមានឈ្មោះម្ហូប «${query}» ផ្ទាល់ទេ តែនេះជាមុខម្ហូបពេញនិយមដែល AI ណែនាំជំនួស៖`,
      `🤖 No exact match for "${query}" — here are popular AI recommendations instead:`,
      `🤖 未找到“${query}”的直接匹配，AI 为您推荐以下人气美食：`
    );
  }

  const goalDescriptions: Record<AdvisorGoalId, [string, string, string]> = {
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
      '🤖 ណែនាំម្ហូបស្រាលក្រពះ ខ្លាញ់តិច និងកាឡូរីទាប (<450 kcal)៖',
      '🤖 Recommended light, low-oil & low-calorie (<450 kcal) dishes:',
      '🤖 为您推荐少油清淡、低卡路里 (<450 千卡) 美食：',
    ],
    vip_high_protein: [
      '🤖 ណែនាំមុខម្ហូបសម្បូរប្រូតេអ៊ីន និងប៉ូវកម្លាំង៖',
      '🤖 Recommended high-protein & energizing dishes:',
      '🤖 为您推荐高蛋白、补充体力的营养美食：',
    ],
    vip_group_feast: [
      '🤖 ណែនាំមុខម្ហូបឈុតធំ សម្រាប់ជួបជុំគ្រួសារ និងមិត្តភក្តិ៖',
      '🤖 Recommended shareable dishes for family & friends:',
      '🤖 为您推荐适合家庭与朋友聚餐分享的招牌菜：',
    ],
  };

  const [kh, en, zh] = goalDescriptions[goal];
  return tr(language, kh, en, zh);
}

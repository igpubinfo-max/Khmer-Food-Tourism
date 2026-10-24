import { Language, FoodItem, TouristDestination, Restaurant, Ingredient, CookingStep, CommunityPost, CommunityComment } from '../types';
import { CAMBODIA_PROVINCE_ZH_MAP } from './i18n';

/**
 * Convert Khmer numerals (០-៩) to Arabic numerals (0-9)
 */
export function khmerToArabicNumerals(input: string): string {
  if (!input) return '';
  const map: Record<string, string> = {
    '០': '0',
    '១': '1',
    '២': '2',
    '៣': '3',
    '៤': '4',
    '៥': '5',
    '៦': '6',
    '៧': '7',
    '៨': '8',
    '៩': '9',
  };
  return input.replace(/[០-៩]/g, (ch) => map[ch] || ch);
}

/**
 * Format cooking/prep duration (e.g., "៣៥ នាទី" -> "35 mins" in EN / "35 分钟" in ZH)
 */
export function formatDurationByLang(raw: string | undefined, lang: Language): string {
  if (!raw) return lang === 'km' ? '២៥ នាទី' : lang === 'zh' ? '25 分钟' : '25 mins';
  if (lang === 'km') return raw;
  let s = khmerToArabicNumerals(raw);
  if (lang === 'zh') {
    s = s
      .replace(/ម៉ោង/g, ' 小时 ')
      .replace(/នាទី/g, ' 分钟')
      .replace(/\bhours?\b|\bhrs?\b/gi, ' 小时')
      .replace(/\bminutes?\b|\bmins?\b/gi, ' 分钟')
      .replace(/\s+/g, ' ')
      .trim();
    return s;
  }
  // English
  s = s
    .replace(/ម៉ោង/g, ' hrs ')
    .replace(/នាទី/g, ' mins')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

/**
 * Format servings (e.g., "៤-៦ នាក់" -> "4-6 servings" in EN / "4-6 人份" in ZH)
 */
export function formatServingsByLang(raw: string | undefined, lang: Language): string {
  if (!raw) return lang === 'km' ? '៣-៤ នាក់' : lang === 'zh' ? '3-4 人份' : '3-4 servings';
  if (lang === 'km') return raw;
  let s = khmerToArabicNumerals(raw);
  if (lang === 'zh') {
    s = s
      .replace(/នាក់/g, ' 人份')
      .replace(/\bservings?\b|\bpeople\b|\bpersons?\b/gi, ' 人份')
      .replace(/\s+/g, ' ')
      .trim();
    return s;
  }
  s = s
    .replace(/នាក់/g, ' servings')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

/**
 * Format difficulty level ('easy' | 'medium' | 'hard')
 */
export function formatDifficultyByLang(difficulty: 'easy' | 'medium' | 'hard' | undefined, lang: Language): string {
  const d = difficulty || 'medium';
  if (lang === 'km') {
    return d === 'easy' ? 'ងាយ' : d === 'medium' ? 'មធ្យម' : 'ជំនាញ';
  }
  if (lang === 'zh') {
    return d === 'easy' ? '简单' : d === 'medium' ? '中等' : '进阶';
  }
  return d === 'easy' ? 'Easy' : d === 'medium' ? 'Medium' : 'Hard';
}

/**
 * Format ingredient amount/measurement into KM, EN, or ZH
 */
export function formatAmountByLang(raw: string | undefined, lang: Language): string {
  if (!raw) return '';
  if (lang === 'km') return raw;

  let s = khmerToArabicNumerals(raw.trim());

  const unitRules: Array<[RegExp, string, string]> = [
    [/តាមចំណូលចិត្ត/g, 'To taste', '适量'],
    [/សម្រាប់ទឹកជ្រលក់/g, 'For dipping sauce', '蘸酱用'],
    [/សម្រាប់ទឹកញាំ/g, 'For salad dressing', '凉拌汁用'],
    [/សម្រាប់ប្រឡាក់/g, 'For marinade', '腌制用'],
    [/គីឡូក្រាម|គីឡូ/g, 'kg', '公斤'],
    [/ក្រាម/g, 'g', '克'],
    [/មីលីលីត្រ/g, 'ml', '毫升'],
    [/លីត្រ/g, 'L', '升'],
    [/ស្លាបព្រាបាយ/g, 'tbsp', '汤匙'],
    [/ស្លាបព្រាកាហ្វេ/g, 'tsp', '茶匙'],
    [/ចានធំ/g, 'large bowl', '大碗'],
    [/ចានតូច/g, 'small bowl', '小碗'],
    [/ចានល្មម/g, 'medium bowl', '中碗'],
    [/ចាន/g, 'bowl', '碗'],
    [/ថាសធំ/g, 'large platter', '大盘'],
    [/ថាស/g, 'platter', '盘'],
    [/កន្ត្រក|កញ្ច្រែង/g, 'basket', '篮'],
    [/ក្តាប់ធំ/g, 'large handful', '大把'],
    [/ក្តាប់តូច/g, 'small handful', '小把'],
    [/ក្តាប់/g, 'handful', '把'],
    [/ចំណែកធំ/g, 'large portion', '大份'],
    [/បំពង់/g, 'bamboo tubes', '竹筒'],
    [/កញ្ចប់/g, 'pack', '包'],
    [/កំពឹស/g, 'cloves', '瓣'],
    [/ចង្កោម|កួរ|បាច់/g, 'bunch', '束'],
    [/គល់|ដើម/g, 'stalks', '根'],
    [/សន្លឹក|ស្លឹក/g, 'leaves', '片'],
    [/ក្បាល/g, 'whole', '只/条'],
    [/ផ្លែ/g, 'pcs', '个'],
    [/គ្រាប់/g, 'pcs', '颗'],
  ];

  for (const [re, enRep, zhRep] of unitRules) {
    s = s.replace(re, lang === 'zh' ? zhRep : enRep);
  }

  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Exact Food Category translations (English -> Simplified Chinese)
 */
export const FOOD_CATEGORY_ZH_MAP: Record<string, string> = {
  'Signature / Amok': '招牌名菜 / 高棉阿莫克',
  'Soup / Traditional': '传统高棉汤品',
  'Soup / Lemongrass Sour': '香茅酸汤',
  'Curry / Traditional': '传统高棉咖喱',
  'Soup / Herbal': '草本养生汤',
  'Soup / Pickled Lime': '咸柠檬汤',
  'Soup / Wild Sour': '山野酸汤',
  'Stew / Caramelized': '棕榈糖红烧炖菜',
  'Soup / River Fish': '河鱼鲜汤',
  'Soup / Bamboo Shoots': '鲜笋汤',
  'Soup / Sweet & Sour': '高棉酸甜汤',
  'Soup / Field Crab': '稻田蟹酸汤',
  'Soup / Prahok Broth': '波罗福鱼酱浓汤',
  'Soup / Lime Herb': '青柠香草汤',
  'Soup / Winter Melon': '冬瓜排骨汤',
  'Curry / Royal Saraman': '皇家萨拉曼咖喱',
  'Soup / Salted Egg': '咸鸭蛋鱼汤',
  'Soup / Wild Fish Stew': '野生鱼什锦浓汤',
  'Grilled / Signature': '招牌炭烤',
  'Grilled / Traditional': '传统炭烤',
  'Roasted / Specialty': '特色烤物',
  'Grilled / Delicacy': '风味烧烤',
  'Grilled / Seafood': '炭烤海鲜',
  'Grilled / Pork': '炭烤猪肉',
  'Grilled / Prawns': '炭烤大虾',
  'Stir-fry / Special': '特色小炒',
  'Stir-fry / Seafood': '爆炒海鲜',
  'Stir-fry / Spicy': '香辣热炒',
  'Stir-fry / Ginger': '鲜姜小炒',
  'Stir-fry / Vegetables': '时令炒蔬菜',
  'Salad / Raw Beef': '高棉酸柑生拌牛肉',
  'Salad / Green Mango': '青芒果烟熏鱼沙拉',
  'Dip / Fish Prahok': '传统鱼肉香草蘸酱',
  'Dip / Banana Leaf Prahok': '蕉叶烤鱼酱',
  'Salad / Pomelo': '鲜虾柚子沙拉',
  'Breakfast / Noodles': '金边特色汤粉',
  'Traditional / Rice Noodles': '传统咖喱米线',
  'Noodles / Kola Minority': '哥拉族风味拌粉',
  'Noodles / Braised Beef': '红烧牛腩河粉',
  'Street Food / Stir-Fried Noodles': '街头炒面/炒粉',
  'Breakfast / Rice Plates': '高棉经典烤肉饭',
  'Breakfast / Porridge': '高棉养生肉粥',
  'Rice / Crab Fried Rice': '鲜蟹肉炒饭',
  'Desserts / Traditional Sweets': '传统高棉甜点',
  'Snacks / Bamboo Sticky Rice': '竹筒香糯米饭',
  'Traditional / Festival Cake': '传统节庆粽糕',
  'Desserts / Pumpkin Custard': '椰香南瓜炖蛋',
  'Desserts / Coconut Banana': '椰浆西米炖香蕉',
  'Street Food / Sandwiches': '高棉法棍三明治',
  'Street Food / Balut': '贡布胡椒毛蛋',
  'Soup / Forest Sour': '森林风味酸牛肉汤',
  'Soup / Herbal Praher': '鲜笋田螺草本汤',
  'Soup / Tamarind Leaf': '嫩罗望子叶酸鱼汤',
  'Soup / Khmer Curry': '高棉红咖喱汤',
  'Soup / Hot & Sour': '酸辣草菇排骨汤',
  'Soup / Wood-Apple Sour': '木苹果酸鲶鱼汤',
  'Soup / Palm Stew': '棕榈果五花肉炖汤',
  'Soup / Stuffed Melon': '苦瓜酿肉清汤',
  'Soup / Beef Tripe Kroeung': '香茅牛肚酸汤',
  'Soup / Smoked Fish Moringa': '烟熏鱼辣木叶汤',
  'Soup / Lemongrass Chicken': '香茅青柠叶土鸡汤',
  'Soup / River Fish Sour': '湄公河鱼酸汤',
  'Soup / Coconut Pineapple': '椰浆菠萝炖肉汤',
  'Soup / Mushroom Prawn': '草菇鲜虾汤',
  'Soup / Sour Forest Leaf': '山野酸叶土鸡汤',
  'Soup / Winter Melon Broth': '冬瓜肉末清汤',
  'Grilled / Salt-Crusted Fish': '香茅盐烤黑鱼',
  'Grilled / Honey Roast Chicken': '荔枝山蜂蜜烤鸡',
  'Grilled / Stuffed Frog': '香茅酿肉烤田鸡',
  'Grilled / Beef & Prahok Dip': '炭烤牛肉配椰香鱼酱',
  'Grilled / Whole Squid': '炭烤整鱿鱼',
  'Grilled / Mekong River Prawns': '椒盐炭烤湄公河大虾',
  'Grilled / Palm Sugar Pork Ribs': '棕榈糖蒜香烤排骨',
  'Grilled / Catfish & Tamarind': '炭烤鲶鱼配甜罗望子酱',
  'Grilled / Scallion Mussels': '葱油花生烤青口贝',
  'Grilled / Turmeric Wings': '姜黄香茅烤鸡翅',
  'Grilled / Sun-Dried Fish': '炭烤鱼干配罗望子酱',
  'Grilled / Crispy Pork Belly': '椒盐脆皮烤五花肉',
  'Grilled / Kampot Pepper Duck': '贡布黑胡椒烤鸭',
  'Grilled / Vegetables & Prahok': '炭烤秋葵茄子配鱼酱',
  'Stir-Fry / Spicy Cha Kdao': '香茅罗勒辣炒鸡',
  'Stir-Fry / Beef Kroeung': '黄香茅酱长豆炒牛肉',
  'Stir-Fry / Ginger Duck': '子姜爆炒鸭肉',
  'Stir-Fry / Morning Glory': '蒜蓉蚝油炒空心菜',
  'Stir-Fry / Prawns & Broccoli': '鲜虾炒西兰花',
  'Stir-Fry / Kampot Pepper Squid': '贡布青胡椒炒鱿鱼',
  'Stir-Fry / Holy Basil Frog': '九层塔香辣炒田鸡',
  'Stir-Fry / Eggplant & Pork': '肉末豆瓣烧紫茄',
  'Stir-Fry / Mixed Vegetables': '脆皮五花肉炒什锦蔬菜',
  'Braised / Pork Trotters Khor': '棕榈糖红烧猪蹄卤蛋',
  'Stir-Fry / Fermented Tofu Beef': '腐乳杏鲍菇炒牛肉',
  'Stir-Fry / Sweet & Sour Fish': '糖醋脆皮黑鱼',
  'Stir-Fry / Spicy Eel Kroeung': '香茅九层塔辣炒鳝鱼',
  'Stir-Fry / Garlic Prawns & Okra': '蒜香河虾炒秋葵',
  'Stir-Fry / Mushroom Chicken': '平菇炒鸡胸肉',
  'Braised / Coconut Pepper Fish': '椰子水黑胡椒焖河鱼',
  'Salad / Lime-Cured Beef Pleah': '香蕉花酸柑拌牛肉',
  'Salad / Banana Blossom Chicken': '香蕉花手撕鸡沙拉',
  'Salad / Seafood Glass Noodle': '鲜虾鱿鱼粉丝沙拉',
  'Salad / Pomelo & Prawn': '椰丝鲜虾柚子沙拉',
  'Salad / Fresh Prawn Pleah': '苦瓜酸柑生腌河虾',
  'Salad / Neem Flower & Smoked Fish': '苦楝花烟熏鱼五花肉沙拉',
  'Salad / Lemongrass Prawn': '香茅鲜虾肉末沙拉',
  'Dip & Salad / Teuk Kroeung': '皇家高棉鱼肉香草蘸酱配鲜蔬',
  'Dip & Salad / Prahok Ktis': '椰浆肉末鱼酱配时蔬',
  'Salad / Green Papaya Bok Lahong': '高棉腌蟹虾米青木瓜沙拉',
  'Noodles / Nam Ya Curry Noodles': '红咖喱椰香鸡肉米线',
  'Noodles / Boat Noodle Soup': '金边牛肉丸船面',
  'Noodles / Seafood Fried Noodles': '高棉海鲜炒蛋面',
  'Noodles / Prawn Lort Cha': '金边鲜虾煎蛋炒老鼠粉',
  'Noodles / Dry Wonton Noodles': '叉烧脆皮云吞干拌面',
  'Noodles / Kep Seafood Kuy Teav': '白马市海鲜汤粿条',
  'Noodles / Smoked Fish Num Banh Chok': '烟熏鱼草本高棉米线',
  'Noodles / Crab Glass Noodles': '贡布蓝蟹煲粉丝',
  'Noodles / Beef Stew Khor Ko': '高棉五香牛腩粉配法棍',
  'Noodles / Coconut Banh Kanh': '椰香鱼汤粗米粉',
  'Rice / Crab & Salted Egg Rice': '咸蛋黄蓝蟹肉炒饭',
  'Rice / Pork & Braised Egg Rice': '金边炭烤猪肉卤蛋碎米饭',
  'Porridge / Chicken Congee': '高棉香草鸡丝猪血粥',
  'Porridge / Snakehead Fish Congee': '洞里萨湖黑鱼鲜姜粥',
  'Rice / Holy Basil Beef Rice': '九层塔辣炒牛肉煎蛋饭',
  'Rice / Poached Chicken Rice': '高棉白切土鸡姜蓉饭',
  'Rice / Sausage Fried Rice': '高棉莲子腊肠炒饭',
  'Porridge / Teochew-Khmer Congee Set': '咸蛋鱼干菜脯白粥套餐',
  'Rice / Sticky Rice & Beef Jerky': '香脆牛肉干木瓜泡菜糯米饭',
  'Rice / Claypot Seafood Rice': '贡布青胡椒海鲜煲仔饭',
  'Street Food / Num Krok': '香脆椰浆葱花米饼',
  'Street Food / Khmer Banh Chao': '高棉姜黄椰香鲜虾煎饼',
  'Street Food / Spiced Sun-Dried Clams': '金边香辣晒河蚬',
  'Street Food / Grilled Beef Meatballs': '炭烤高棉牛肉丸串',
  'Street Food / Fresh Spring Rolls': '鲜虾花生酱高棉春卷',
  'Street Food / Crispy Fried Spring Rolls': '香酥芋头猪肉炸春卷',
  'Street Food / Crispy Chive Cakes': '香煎韭菜米粿',
  'Street Food / Steamed Pong Tea Koun': '清蒸毛蛋配贡布青柠胡椒',
  'Dessert / Pumpkin Coconut Custard': '整颗南瓜椰香炖蛋',
  'Dessert / Banana Coconut Cream': '椰浆西米炖甜蕉',
  'Traditional Cake / Num Ansom Chrouk': '传统蕉叶猪肉绿豆长粽',
  'Traditional Cake / Pyramid Num Kom': '棕榈糖椰丝金字塔糯米粽',
  'Dessert / Ginger Rice Balls': '姜汁棕榈糖椰浆汤圆',
  'Dessert / Mango Sticky Rice': '高棉熟芒果椰浆糯米饭',
  'Traditional Cake / Num Plae Ai': '爆浆棕榈糖椰丝糯米球',
  'Dessert / Creamy Taro Coconut': '椰浆香芋甜羹',
  'Drink / Sugarcane Kumquat Juice': '鲜榨金桔甘蔗汁',
  'Drink / Cambodian Iced Coffee': '高棉炭焙炼乳冰咖啡',
  'Drink / Fresh Palm Nectar': '冰镇鲜甜棕榈汁',
  'Drink / Avocado Smoothie': '蒙多基里牛油果炼乳冰沙',
  'Drink / Fragrant Young Coconut': '冰镇高棉香水嫩椰',
  'Drink / Honey Lime Iced Tea': '森林野蜂蜜青柠冰茶',
  'Drink / Pandan Soy Milk': '斑兰叶现磨温豆浆',
  'Drink / Red Dragon Fruit Smoothie': '红心火龙果鲜奶冰沙',
};

/**
 * Exact Dish Name translations for the 100 Core Dishes + 100 Additional Dishes
 */
export const EXACT_FOOD_NAME_ZH_MAP: Record<string, string> = {
  'Fish Amok with Noni Leaves': '诺丽叶椰香高棉鱼阿莫克 (Fish Amok)',
  'Authentic Samlor Korko (Cambodian Mixed Stew)': '正宗高棉什锦蔬菜浓汤 (Samlor Korko)',
  'Ripe Palm Fruit Stew with Pork Belly (Samlor Kako Tnot)': '熟棕榈果炖五花肉浓汤 (Samlor Kako Tnot)',
  'Ripe Palm Fruit Stew with Pork Belly (Samlor Korko Tnot)': '熟棕榈果炖五花肉浓汤 (Samlor Korko Tnot)',
  'Samlor Korko with Wild Fish': '高棉野生鱼什锦蔬菜浓汤',
  'Country Duck Red Curry': '高棉乡村红咖喱鸭',
  'Khmer Beef Sour Soup (Samlor Machu Kroeung)': '高棉香茅酸牛肉汤 (Samlor Machu Kroeung)',
  'Khmer Red Chicken Curry (Kari Sach Moan)': '高棉传统红咖喱鸡 (Kari Sach Moan)',
  'Samlor Proher (Herbal Green Fish Soup)': '高棉草本鱼肉蔬菜汤 (Samlor Proher)',
  'Pickled Lime Chicken Soup (Ngam Ngov)': '高棉咸柠檬土鸡汤 (Ngam Ngov)',
  'Wild Sour Soup with Smoked Fish': '烟熏鱼山野酸汤',
  'Caramelized Pork Stew with Eggs (Khor Sach Chrouk)': '棕榈糖红烧五花肉卤蛋 (Khor Sach Chrouk)',
  'Sanday Fish Sour Soup with Young Tamarind': '嫩罗望子鲶鱼酸汤',
  'Bamboo Shoot Soup with Pork': '鲜笋五花肉草本汤',
  'Sweet & Sour Soup with Snakehead Fish': '菠萝番茄酸甜黑鱼汤',
  'Field Crab Sour Soup with Water Mimosa': '水含羞草稻田蟹酸汤',
  'Hot Prahok Beef Soup (Samlor Prahok Kdao)': '热辣波罗福鱼酱牛肉汤',
  'Sour Lemon Herb Chicken Soup (Chhruk Moan)': '青柠香草酸鸡汤 (Chhruk Moan)',
  'Winter Melon Sour Soup with Pork': '冬瓜排骨罗望子酸汤',
  'Royal Saraman Beef Curry': '高棉皇家萨拉曼花生牛肉咖喱',
  'Fish Sour Soup with Salted Duck Egg': '咸鸭蛋姜丝黑鱼酸汤',
  'Samlor Korko with Chhluonh Fish & Green Banana': '青香蕉刺鳅什锦浓汤 (Samlor Korko)',
  'Grilled Beef with Prahok Dipping Sauce': '炭烤牛排配正宗波罗福鱼酱',
  'Grilled Snakehead Fish with Sticky Rice': '香茅盐烤河鱼配糯米饭',
  'Kampot Roasted Herbal Chicken': '贡布黑胡椒蜂蜜香草烤鸡',
  'Stuffed Roasted Frogs (Kangkeb Baok)': '高棉香茅肉末酿烤田鸡 (Kangkeb Baok)',
  'Charcoal Grilled Squid with Green Kampot Pepper': '贡布青胡椒炭烤鲜鱿鱼',
  'Honey Pepper Roasted Pork Belly': '野蜂蜜贡布黑胡椒烤五花肉',
  'Kep Salt & Chili Grilled Prawns': '白马市椒盐炭烤大虎虾',
  'Beef Lok Lak with Kampot Pepper': '贡布黑胡椒高棉摇晃牛肉粒 (Beef Lok Lak)',
  'Fried Flower Crab with Green Kampot Peppercorns': '贡布新鲜青胡椒爆炒兰花蟹',
  'Spicy Lemongrass Basil Chicken (Cha Kdao)': '香茅九层塔辣炒鸡肉 (Cha Kdao)',
  'Stir-Fried Pork with Ginger (Cha Knyei)': '鲜子姜爆炒猪里脊 (Cha Knyei)',
  'Stir-Fried Morning Glory with Garlic (Cha Trakoun)': '蒜蓉蚝油猛火炒空心菜',
  'Khmer Beef Ceviche Salad (Pleah Sach Ko)': '高棉酸柑香茅生拌牛肉沙拉 (Pleah Sach Ko)',
  'Green Mango Salad with Smoked Fish': '青芒果丝拌烟熏鱼沙拉',
  'Teuk Kroeung (Traditional Fish Dip with Crudités)': '高棉传统鱼肉花生蘸酱配鲜蔬拼盘 (Teuk Kroeung)',
  'Banana Leaf Wrapped Grilled Prahok': '蕉叶炭烤五花肉波罗福鱼酱',
  'Pomelo Salad with Fresh Prawns': '烤椰丝鲜虾甜柚沙拉',
  'Phnom Penh Kuyteav (Pork Noodle Soup)': '金边经典猪肉鲜汤粿条 (Kuy Teav)',
  'Nom Banh Chok (Khmer Rice Noodle Curry)': '高棉鱼汤黄咖喱米线 (Nom Banh Chok)',
  'Mee Kola (Steamed Noodles with Dried Shrimp & Egg)': '拜林哥拉族虾米花生拌米粉 (Mee Kola)',
  'Kuyteav Khor Ko (Braised Beef Stew Noodles)': '高棉五香红烧牛腩河粉 (Kuyteav Khor Ko)',
  'Khmer Stir-Fried Noodles with Beef & Egg (Mee Cha)': '高棉煎蛋牛肉炒黄面 (Mee Cha)',
  'Bai Sach Chrouk (Grilled Pork with Broken Rice)': '高棉炭烤椰香猪肉碎米饭 (Bai Sach Chrouk)',
  'Khmer Rice Porridge with Pork & Offal (Babor Kroeung)': '高棉传统香草猪肉鲜粥 (Babor Kroeung)',
  'Fried Rice with Fresh Crab Meat': '白马鲜拆蟹肉茉莉香米炒饭',
  'Num Phlae Ai (Palm Sugar Sticky Rice Dumplings)': '椰丝爆浆棕榈糖糯米球 (Num Phlae Ai)',
  'Kralan (Sticky Rice in Bamboo Tubes)': '黑豆椰奶竹筒香糯米饭 (Kralan)',
  'Num Ansom Chrouk (Savory Pork Sticky Rice Cake)': '高棉传统蕉叶猪肉绿豆长粽 (Num Ansom)',
  'Sangkhya Lapov (Steamed Pumpkin Custard)': '高棉椰香鸭蛋蒸南瓜布丁 (Sangkhya Lapov)',
  'Chek Ktis (Warm Banana in Sweet Coconut Cream)': '斑兰椰浆西米炖甜香蕉 (Chek Ktis)',
  'Num Pang Pate (Khmer Baguette Sandwich)': '高棉秘制肝酱木瓜泡菜法棍三明治 (Num Pang)',
  'Balut with Kampot Lime & Pepper (Pong Tea Kon)': '贡布青柠黑胡椒蒸毛蛋 (Pong Tea Kon)',
  'Wild Forest Sour Beef Soup (Samlor Machu Prey)': '山野森林香茅酸牛肉汤 (Samlor Machu Prey)',
  'Bamboo Shoot & Freshwater Snail Herbal Soup': '鲜笋稻田螺草本养生汤',
  'Young Tamarind Leaf & Snakehead Sour Soup': '嫩罗望子叶黑鱼酸汤',
  'Khmer Red Duck Curry with Sweet Potato': '高棉红薯椰香红咖喱鸭',
  'Hot & Sour Pork Rib Soup with Straw Mushrooms': '草菇青柠酸辣猪排骨汤',
  'Wood-Apple & Walking Catfish Sour Soup': '木苹果睡莲梗鲶鱼酸汤',
  'Stuffed Bitter Melon & Glass Noodle Clear Soup': '苦瓜酿肉粉丝清汤',
  'Cambodian Beef Tripe Sour Kroeung Soup with Morning Glory': '高棉香茅酸牛肚空心菜汤',
  'Smoked River Fish & Moringa Leaf Herbal Soup': '烟熏河鱼辣木叶草本汤',
  'Free-Range Chicken Lemongrass & Kaffir Lime Soup': '香茅青柠叶散养土鸡汤',
  'Mekong Pangasius Fish & Water Spinach Sour Soup': '湄公河巴沙鱼空心菜酸汤',
  'Coconut Cream Pineapple & Pork Belly Curry (Samlor Ktis)': '椰浆菠萝五花肉浓咖喱 (Samlor Ktis)',
  'Straw Mushroom & Fresh Prawn Herbal Soup': '草菇鲜河虾草本清汤',
  'Country Chicken & Sour Forest Leaf Soup': '山野酸叶散养土鸡汤',
  'Winter Melon & Minced Pork Clear Broth Soup': '冬瓜肉丸清炖鲜汤',
  'Salt-Crusted Grilled Snakehead Fish with Lemongrass': '香茅盐焗炭烤黑鱼',
  'Kulen Mountain Honey Glazed Roasted Chicken': '荔枝山野蜂蜜脆皮烤鸡',
  'Stuffed Lemongrass Kroeung Grilled Frog (Kangkaeb Baok)': '香茅香料酿肉炭烤田鸡',
  'Charcoal Grilled Beef with Coconut Prahok Dip': '炭烤嫩牛肉配椰香波罗福蘸酱',
  'Charcoal Grilled Whole Squid with Spicy Koh Kong Sauce': '炭烤整只鲜鱿鱼配国公省酸辣海鲜酱',
  'Grilled Mekong Giant River Prawns with Chili Salt': '椒盐炭烤湄公河大头虾',
  'Palm Sugar & Garlic Charcoal Grilled Pork Ribs': '棕榈糖蒜香炭烤猪肋排',
  'Charcoal Grilled Catfish with Sweet Tamarind Sauce': '炭烤黄颡鱼配甜罗望子蘸酱',
  'Grilled Green Mussels with Scallion Oil & Peanuts': '葱油花生碎炭烤青口贝',
  'Turmeric & Lemongrass Grilled Chicken Wings': '姜黄香茅炭烤鸡全翅',
  'Charcoal Grilled Sun-Dried Fish with Tamarind Dip': '炭烤阳光鱼干配罗望子辣酱',
  'Crispy Grilled Pork Belly with Chili Salt': '椒盐脆皮炭烤五花肉',
  'Kampot Black Pepper Roasted Duck': '贡布黑胡椒脆皮烤鸭',
  'Charcoal Grilled Okra & Eggplant with Savory Prahok Dip': '炭烤秋葵茄子配咸香波罗福鱼酱',
  'Spicy Lemongrass & Holy Basil Stir-Fried Chicken (Cha Kdao)': '香茅九层塔猛火辣炒鸡 (Cha Kdao)',
  'Yellow Kroeung Beef Stir-Fry with Yardlong Beans': '黄香茅酱长豆角爆炒牛肉',
  'Fragrant Young Ginger Stir-Fried Duck (Cha Knhyey)': '嫩子姜爆炒土鸭肉 (Cha Knhyey)',
  'Wok-Fired Morning Glory with Garlic & Oyster Sauce': '蒜香蚝油大火快炒空心菜',
  'Broccoli & Cauliflower Stir-Fry with Fresh River Prawns': '鲜河虾炒西兰花与花椰菜',
  'Wok-Fried Ocean Squid with Fresh Green Kampot Peppercorns': '贡布新鲜青胡椒爆炒海鱿鱼',
  'Spicy Holy Basil & Chili Stir-Fried Field Frog': '九层塔朝天椒爆炒田鸡',
  'Wok-Braised Purple Eggplant with Minced Pork & Soybean Paste': '肉末黄豆酱红烧紫茄子',
  'Cambodian Mixed Vegetable Stir-Fry with Crispy Pork Belly': '脆皮五花肉炒高棉什锦时蔬',
  'Palm Sugar Caramelized Pork Trotters & Duck Eggs (Khor)': '棕榈糖红烧猪蹄卤鸭蛋 (Khor)',
  'Fermented Red Tofu Beef & King Oyster Mushroom Stir-Fry': '红腐乳杏鲍菇爆炒嫩牛肉',
  'Sweet & Sour Crispy Snakehead Fish Stir-Fry': '菠萝糖醋脆皮黑鱼片',
  'Spicy Kroeung Freshwater Eel Stir-Fry with Holy Basil': '香茅九层塔辣炒淡水黄鳝',
  'Garlic River Prawns & Crisp Okra Wok Stir-Fry': '蒜蓉河虾大火快炒脆秋葵',
  'Oyster Mushroom & Chicken Breast Stir-Fry': '鲜平菇蚝油滑炒鸡胸肉',
  'Coconut Water & Black Pepper Braised Mekong Fish': '鲜椰水贡布黑胡椒砂锅焖湄公鱼',
  'Cambodian Lime-Cured Beef Salad with Banana Blossom (Pleah Sach Ko)': '香蕉花酸柑生拌嫩牛肉沙拉',
  'Shredded Chicken & Banana Blossom Herb Salad': '香蕉花手撕土鸡香草沙拉',
  'Glass Noodle Seafood Salad with Prawns & Squid': '鲜虾鱿鱼酸辣粉丝沙拉',
  'Pomelo & Prawn Salad with Toasted Coconut': '烤椰丝鲜虾甜柚沙拉',
  'Fresh River Prawn Ceviche with Crisp Bitter Melon': '脆苦瓜酸柑生腌鲜河虾',
  'Cambodian Neem Flower, Smoked Fish & Pork Belly Salad': '高棉苦楝花拌烟熏鱼与五花肉',
  'Fragrant Lemongrass, Prawn & Minced Pork Salad': '香茅薄荷鲜虾肉末沙拉',
  'Royal Khmer Fish Herb Dip with Fresh Garden Vegetables (Teuk Kroeung)': '皇家高棉鱼肉花生蘸酱配田园鲜蔬',
  'Creamy Coconut & Minced Pork Prahok Dip with Fresh Crudités': '浓香椰浆肉末鱼酱配鲜脆时蔬 (Prahok Ktis)',
  'Cambodian Green Papaya Salad with Salted Field Crab & Dried Shrimp': '高棉咸田蟹虾米春木瓜沙拉 (Bok Lahong)',
  'Khmer Rice Noodles with Red Nam Ya Coconut Chicken Curry': '高棉红咖喱椰香鸡肉米线 (Nam Ya)',
  'Phnom Penh Boat Noodle Soup with Sliced Beef & Meatballs': '金边鲜切牛肉牛丸浓汤船面',
  'Cambodian Wok-Fried Egg Noodles with Fresh Seafood': '高棉猛火海鲜炒鸡蛋面',
  'Phnom Penh Stir-Fried Short Pin Noodles with Prawns & Fried Egg (Lort Cha)': '金边鲜虾煎蛋炒银针粉 (Lort Cha)',
  'Dry Egg Noodles with Char Siu Pork & Crispy Wontons': '蜜汁叉烧脆皮云吞干拌竹升面',
  'Kep Coastal Fresh Seafood Rice Noodle Soup': '白马海岸鲜虾蟹肉海鲜粿条汤',
  'Rice Vermicelli with Smoked Fish & Fermented Herb Broth': '烟熏鱼香草浓汤细米线',
  'Wok-Baked Glass Noodles with Kampot Blue Swimmer Crab': '贡布蓝泳蟹姜葱砂锅粉丝煲',
  'Cambodian Spiced Beef Stew Rice Noodles & Baguette (Kuy Teav Khor Ko)': '高棉五香红烧牛腩粉配脆法棍',
  'Thick Tapioca Rice Noodles in Rich Fish Coconut Gravy (Banh Kanh)': '浓香椰浆鱼汤粗木薯粉 (Banh Kanh)',
  'Blue Swimmer Crab Fried Rice with Golden Salted Duck Egg': '咸蛋黄蓝蟹肉黄金炒饭',
  'Phnom Penh Grilled Pork Rice with Braised Egg & Pickles (Bay Sach Chrouk)': '金边炭烤猪肉卤蛋配酸萝卜碎米饭',
  'Cambodian Herbed Chicken & Pork Blood Rice Porridge (Borbor Kroeung)': '高棉香草土鸡猪血养生米粥',
  'Tonle Sap Snakehead Fish Rice Congee with Fresh Ginger': '洞里萨湖鲜黑鱼片姜丝米粥',
  'Spicy Holy Basil Beef Fried Rice with Crispy Fried Egg': '九层塔香辣牛肉炒饭配脆边煎蛋',
  'Cambodian Poached Free-Range Chicken Rice with Ginger Sauce': '高棉白切散养土鸡油饭配鲜姜酱',
  'Cambodian Lotus & Sweet Chinese Sausage Fried Rice': '高棉鲜莲子甜腊肠荷叶炒饭',
  'Plain Rice Congee with Salted Egg, Dried Fish & Stir-Fried Radish': '潮州风味白粥配咸鸭蛋、鱼干与炒菜脯',
  'Steamed Sticky Rice with Crispy Beef Jerky & Papaya Pickle': '香脆五香牛肉干木瓜泡菜蒸糯米饭',
  'Claypot Baked Seafood Rice with Green Kampot Pepper': '贡布青胡椒海鲜砂锅焗饭',
  'Crispy Coconut & Scallion Rice Pancakes (Num Krok)': '高棉香脆椰浆葱花小米饼 (Num Krok)',
  'Crispy Turmeric Coconut Crepe with Prawn & Pork (Banh Chao)': '高棉姜黄椰香鲜虾猪肉脆煎饼 (Banh Chao)',
  'Phnom Penh Sun-Dried Spiced River Clams (Lies Hal)': '金边街头蒜香辣椒晒河蚬 (Lies Hal)',
  'Grilled Khmer Beef Meatball Skewers with Spicy Tamarind Sauce': '炭烤高棉弹牙牛肉丸串配酸辣罗望子酱',
  'Fresh Cambodian Spring Rolls with Prawn, Pork & Peanut Sauce (Nime Chow)': '高棉鲜虾猪肉生春卷配花生蘸酱',
  'Crispy Fried Taro & Pork Imperial Spring Rolls (Chaornguv)': '香酥芋头猪肉高棉炸春卷',
  'Crispy Pan-Fried Garlic Chive Rice Cakes (Num Kachay)': '高棉香煎脆皮韭菜粿 (Num Kachay)',
  'Steamed Duck Embryo Egg with Vietnamese Coriander & Kampot Pepper Lime': '叻沙叶配贡布黑胡椒青柠蒸毛蛋',
  'Steamed Whole Pumpkin with Coconut Egg Custard (Sangkhya Lapov)': '整颗金瓜椰浆鸭蛋蒸布丁',
  'Simmered Banana in Sweet Coconut Cream with Tapioca Pearls (Chek Ktis)': '浓香椰浆西米露炖芭蕉',
  'Traditional Banana-Leaf Sticky Rice Cake with Pork & Mung Bean (Num Ansom Chrouk)': '传统蕉叶五花肉绿豆长筒粽',
  'Pyramid Sticky Rice Cake with Sweet Palm Sugar Coconut Filling (Num Kom)': '棕榈糖椰丝馅金字塔叶包糯米糕',
  'Glutinous Rice Balls in Ginger Palm Sugar & Coconut Cream (Banh Cha Neuk)': '老姜棕榈糖糖水配椰浆糯米汤圆',
  'Cambodian Sweet Sticky Rice with Ripe Keo Romeat Mango & Coconut Cream': '高棉黄金甜芒椰浆糯米饭',
  'Sticky Rice Balls Bursting with Molten Palm Sugar & Fresh Coconut (Num Plae Ai)': '爆浆棕榈糖鲜椰丝糯米汤圆',
  'Velvety Taro Paste Dessert with Rich Coconut Cream (Borbor Trav)': '浓滑椰浆香芋泥甜品',
  'Freshly Pressed Sugarcane Juice with Kumquat Lime (Teuk Ampov)': '鲜榨金桔青柠甘蔗汁',
  'Cambodian Roasted Iced Condensed Milk Coffee (Kafe Teuk Dos Ko)': '高棉传统炭焙炼乳冰咖啡',
  'Chilled Fresh Sweet Toddy Palm Nectar (Teuk Tnot Ph-aem)': '冰镇天然糖棕鲜甜花蜜饮',
  'Creamy Mondulkiri Avocado & Condensed Milk Smoothie': '蒙多基里高山牛油果炼乳冰沙',
  'Chilled Cambodian Fragrant Young Coconut (Teuk Doung Kra-ob)': '冰镇高棉天然香水青椰',
  'Wild Forest Honey & Fresh Lime Iced Tea (Tae Krouch Chhmar)': '森林野蜂蜜鲜青柠冰红茶',
  'Freshly Stone-Ground Warm Soy Milk with Pandan (Teuk Sandaek)': '斑兰叶清香石磨热豆浆',
  'Red Dragon Fruit & Fresh Milk Tropical Smoothie': '热带红心火龙果鲜奶冰沙',
};

/**
 * Exact Tourist Destination Names (English -> Simplified Chinese)
 */
export const EXACT_DESTINATION_NAME_ZH_MAP: Record<string, string> = {
  'Royal Palace & Silver Pagoda': '金边皇宫与银阁寺',
  'National Museum of Cambodia': '柬埔寨国家博物馆',
  'Wat Phnom Historical Sanctuary': '塔山寺历史圣地 (Wat Phnom)',
  'Independence Monument & Park': '金边独立纪念碑与广场公园',
  'Phnom Penh Riverside & Night Market': '金边皇宫河畔大道与夜市',
  'Tuol Sleng Genocide Museum (S-21)': '吐斯廉屠杀博物馆 (S-21)',
  'Choeung Ek Genocidal Center': '琼邑克纪念馆 (杀人场遗址)',
  'Central Market (Phsar Thmey)': '金边中央市场 (Phsar Thmey)',
  'Majestic Angkor Wat Temple': '雄伟壮观的吴哥窟 (Angkor Wat)',
  'Bayon Temple (Smiles of Angkor)': '巴戎寺 (高棉的微笑)',
  'Ta Prohm Temple (Tomb Raider Temple)': '塔普伦寺 (古墓丽影千年树抱石古寺)',
  'Banteay Srei (Citadel of Women)': '女王宫 (红砂岩精致浮雕古寺)',
  'Phnom Kulen National Park & Waterfall': '荔枝山国家公园与圣山瀑布',
  'Kbal Spean (River of a Thousand Lingas)': '高布斯滨 (水底千林伽遗址)',
  'Bakong Temple (First Temple Mountain)': '巴公寺 (罗洛斯群早期神山寺庙)',
  'Preah Khan Temple': '圣剑寺 (Preah Khan)',
  'Tonle Sap & Kampong Phluk Floating Village': '洞里萨湖与空邦鲁高脚水上浮村',
  'Banteay Kdei & Srah Srang': '斑黛喀蒂寺与皇家浴池',
  'East Mebon & Pre Rup Temples': '东梅奔寺与比粒寺日落古迹',
  'Angkor Night Market & Pub Street Heritage': '暹粒吴哥夜市与酒吧街文化区',
  'Ochheuteal & Otres Beaches': '西哈努克奥彻迭海滩与奥特斯海滩',
  'Koh Rong Island (Sok San Long Beach)': '高龙岛 (Sok San 白沙长滩)',
  'Koh Rong Sanloem & Saracen Bay': '高龙撒冷岛与萨拉森湾碧海沙滩',
  'Ream National Park': '云壤国家森林与红树林公园',
  'Kbal Chhay Waterfall': '西哈努克高巴柴层叠瀑布',
  'Morakot Island & Techo Morakot Bridge': '翡翠岛与德崇翡翠跨海大桥',
  'Koh Koun & Coral Diving Reefs': '小岛珊瑚礁潜水胜地',
  'Koh Dek Koul Island': '铁钉岛生态海岛度假区',
  'Preah Monivong Bokor National Park': '贡布波哥山莫尼旺国家公园',
  'Teuk Chhou Rapids & Kampot River': '贡布德楚溪流浅滩与河畔度假区',
  'Kampot Organic Pepper Plantations (GI)': '贡布有机地理标志胡椒庄园',
  'Phnom Kampong Trach Caves': '贡布磅同溶洞与喀斯特山峰',
  'Mlech Dam & Eco Lake': '贡布姆列水库与山水生态湖',
  'Kampot Green Loop Riverfront & Kayaking': '贡布绿环河畔红树林皮划艇水道',
  'Kampot Traditional Salt Fields': '贡布传统海盐晒盐田风光',
  'Phnom Chhngok Cave Temple': '贡布奇诺山溶洞古砖寺',
  'Kep Beach & Sela Thorani Lady Statue': '白马海滩与海滨女神雕像',
  'Kep Crab Market (Phsar Kdam)': '白马市海滨螃蟹市场 (Phsar Kdam)',
  'Kep National Park Trail': '白马国家公园环山观海步道',
  'Rabbit Island (Koh Tonsay)': '白马兔子岛 (Koh Tonsay)',
  'Phnom Sorsia & White Elephant Cave': '白马索시아山与白象洞圣地',
  'Phnom Sampov & Bat Caves': '马德望森宝山与百万蝙蝠洞',
  'Battambang Bamboo Train (Norry)': '马德望特色竹火车体验 (Norry)',
  'Wat Banan Temple': '马德望巴南山千年古寺',
  'Ek Phnom Temple': '马德望埃克普农古寺与大佛',
  'Wat Kor Ancient Wooden Houses': '马德望瓦哥高棉百年传统木屋村',
  'Kamping Puoy Lotus Lake & Reservoir': '马德望甘平普荷花湖水库',
  'French Colonial Heritage Quarter': '马德望法式殖民风情历史街区',
  'Phnom Krapau Natural Resort': '马德望鳄鱼山自然生态度假区',
  'Tatai Waterfall & River Sanctuary': '国公省塔泰大瀑布与雨林河谷保护区',
  'Peam Krasop Mangrove Sanctuary': '国公省皮姆克索红树林吊桥保护区',
  'Koh Sdach Archipelago (King Island)': '国公省国王岛群岛海钓与珊瑚海岛',
  'Chi Phat Community Eco-Tourism': '国公省奇帕豆蔻山脉社区生态旅游区',
  'Cardamom Rainforest & Wildlife Sanctuary': '豆蔻山脉热带雨林与野生动物保护区',
  'Koh Kong Krao Outer Island': '国公外岛原始海滩秘境',
  'Bousra Waterfall (King of Waterfalls)': '蒙多基里布斯拉双层大瀑布',
  'Keo Seima Wildlife Sanctuary & Elephant Valley': '蒙多基里高西玛野生动物保护区与大象谷',
  'Phnom Doh Kromom Viewpoint': '蒙多基里少女山云海全景台',
  'Sea of Forests (Samot Chheu)': '蒙多基里林海观景台 (Samot Chheu)',
  'Sen Monorom Waterfall': '森莫诺隆溪流瀑布公园',
  'Chrey Thom Waterfall': '蒙多基里大榕树瀑布',
  'Yeak Laom Volcanic Crater Lake': '腊塔纳基里野龙火山口翡翠湖',
  'Cha Ong Waterfall': '腊塔纳基里查翁水帘洞大瀑布',
  'Ka Chanh Waterfall': '腊塔纳基里卡昌热带瀑布',
  'Ka Tieng Waterfall': '腊塔纳基里卡廷丛林瀑布',
  'Virachey National Park': '维拉奇国家原始森林公园',
  'Prasat Preah Vihear (UNESCO World Heritage)': '柏威夏寺 (联合国教科文组织世界遗产悬崖古寺)',
  'Koh Ker Pyramid Temple Complex (UNESCO)': '贡开金字塔寺庙群 (世界文化遗产)',
  'Preah Khan of Kampong Svay (Bakan)': '磅同圣剑寺大型古寺遗址',
  'Kulen Promtep Wildlife Reserve': '荔枝山普隆德野生动物保护区',
  'Preah Nimith Waterfall & Mekong Rapids': '柏威夏与上丁交界湄公河大瀑布',
  'Sambor Prei Kuk (UNESCO World Heritage Site)': '三波坡雷古寺庙群 (真腊王朝世界文化遗产)',
  'Phnom Santuk Holy Mountain & 809 Steps': '磅同山都圣山与809级石阶古寺',
  '30 September Dam & Recreational Lake': '磅同9月30日水坝生态休闲湖',
  'Kuk Nokor Temple': '磅同古诺哥历史古寺',
  'Stung Sen River Biosphere Reserve': '森河生物圈湿地保护区',
  'Koh Pen Bamboo Bridge & Island Retreat': '磅湛竹桥与湄公河沙洲岛度假区',
  'Wat Nokor Bachey Temple': '磅湛诺哥巴彻古寺 (庙中庙奇观)',
  'Phnom Pros & Phnom Srei Legends': '磅湛男人山与女人山历史名胜',
  'Wat Hanchey Hilltop Pagoda': '磅湛韩चे山顶湄公河全景古刹',
  'Luang Preah Sdech Kon Historical Citadel': '甘丹/磅湛斯德贡王历史古城遗址',
  'Chup Historic Rubber Plantation': '特本克蒙朱普百年橡胶园',
  'Traditional Clay Pottery Villages': '磅清扬传统手工红陶文化村',
  'Phnom Neang Kangrei Legend Hill': '磅清扬康蕾仙女山传奇风景名胜',
  'Phnom Santouch Recreational Park': '磅清扬山都奇石生态公园',
  'Chhnok Tru Floating Village': '磅清扬チュ诺特鲁水上浮村',
  'Phnom 1500 (Cardamom Cloud Pass)': '菩萨省1500米云海盘山公路观景台',
  'Chrok La Eang Waterfall': '菩萨省卓拉昂多级森林瀑布',
  'Kampong Luong Floating Town': '菩萨省空邦隆洞里萨湖大型水上城镇',
  'Bak Tra Forest Park': '菩萨省巴特拉森林生态公园',
  'Osom Sanctuary & Cardamom Heartlands': '菩萨省奥松高山鳄鱼与雨林保护区',
  'Phnom Aural (Highest Peak in Cambodia 1,813m)': '奥拉山 (柬埔寨第一高峰 1,813米)',
  'Chambok Community Eco-Tourism & Waterfall': '磅士卑占博社区生态瀑布旅游区',
  'Kirirom National Park (Pine Mountain)': '基里隆国家公园 (高原松林避暑胜地)',
  'Chreav Cascading Waterfalls': '磅士卑奇列层叠山林瀑布',
  'Phnom Sruoch & Techo Dam Scenic Area': '尖山与德崇水库生态风景区',
  'Oudong Mountain & Royal Necropolis': '乌栋山皇家舍利塔与古都遗址',
  'Koh Dach Silk Weaving Island': '金边丝绸岛 (Koh Dach 手工丝绸村)',
  'Phnom Tamao Wildlife Rescue Center': '茶胶省达茅山野生动物救护中心',
  'Phnom Chisor Ancient Temple': '茶胶省奇索山11世纪山顶古寺',
  'Tonle Bati & Ta Prohm of Bati': '茶胶省巴蒂湖水上凉亭与塔普伦古寺',
  'Phnom Da & Asram Maha Rosei (Funan Cradle)': '茶胶省达山与扶南古国石窟遗址',
  'Saang Lotus Lake & Agro-Eco Trail': '干丹省锡安荷花湖生态农业观光区',
  'Kampi Irrawaddy Dolphin Sanctuary': '桔井省甘比湄公河伊洛瓦底江豚保护区',
  'Koh Trong Island Eco Resort & Pomelo Orchards': '桔井省笼岛湄公河生态骑行与甜柚园',
  'Wat Sorsor Mouy Roy (100-Column Pagoda)': '桔井省百柱寺历史名刹',
  'Phnom Sambok Spiritual Hill': '桔井省森宝山湄公河日落古寺',
  'Stung Treng Ramsar Wetlands': '上丁省国际重要拉姆萨尔湄公河湿地',
  'Preah Rumkel Mekong Canyon & Waterfalls': '上丁省湄公河大峡谷与激流瀑布',
  'Banteay Chhmar Great Temple Complex': '班迭棉吉省班迭奇马大型古寺群',
  'Ang Trapaing Thmor Sarus Crane Reserve': '班迭棉吉省昂特拉庞莫赤颈鹤自然保护区',
  'Prasat Ta Moan Thom': '奥多棉吉省达曼通扁担山古寺',
  'Dangrek Mountains & Anlong Veng Historical Trail': '扁担山脉与安隆汶历史文化遗址',
  'Phnom Yat Historical Hilltop Sanctuary, Pailin': '拜林省雅山历史宝石佛塔圣地',
  'O’Tavao Waterfall (Goh Goh Falls)': '拜林省奥达瓦山林清泉瀑布',
  'Tuol Poan Talei Stork Sanctuary (Boeung Romduol)': '波罗勉省万鸟湿地白鹳自然保护区',
  'Prey Basak Historic & Cultural Resort': '柴桢省巴萨森林历史文化生态园',
  'Tsubasa Bridge (Neak Loeung Cable-Stayed Bridge)': '乃良翼桥 (湄公河斜拉跨江大桥)',
  'Ba Phnom Historical Mountain': '波罗勉省巴普农古都圣山名胜',
  'Chaktomuk Riverside Walk Street Phnom Penh': '金边四臂湾河畔步行街',
  'Koh Norea Riverside Promenade Phnom Penh': '金边诺丽亚岛滨江景观大道',
  'Win-Win Memorial Phnom Penh': '金边双赢纪念碑与文化公园',
  'Phnom Bakheng Hilltop Sunset Temple': '暹粒巴肯山日落神庙',
  'La Plantation Kampot Pepper Farm': '贡布 La Plantation 有机胡椒观光庄园',
};

/**
 * Khmer -> English & Chinese translation for Signature Dishes & Khmer Cooking Tips
 */
const KHMER_CULINARY_MAP: Array<[string, string, string]> = [
  ['អាម៉ុកត្រីរស់ពិសេស', 'Special Fresh Fish Amok', '特色鲜鱼阿莫克 (Fish Amok)'],
  ['ក្តាមថ្មចំហុយម្រេចកំពត', 'Steamed Stone Crab with Kampot Pepper', '贡布青胡椒清蒸石蟹'],
  ['សម្លកកូរខ្មែរដើម', 'Authentic Cambodian Samlor Korko Stew', '正宗高棉什锦蔬菜浓汤'],
  ['សាច់គោឡុកឡាក់ម្រេចកំពត', 'Kampot Pepper Beef Lok Lak', '贡布黑胡椒摇晃牛肉粒'],
  ['គុយទាវភ្នំពេញពិសេស', 'Special Phnom Penh Noodle Soup', '金边招牌鲜汤粿条'],
  ['នំបញ្ចុកសម្លខ្មែរ', 'Khmer Rice Noodles with Fish Curry', '高棉鱼汤黄咖喱米线'],
  ['បាយសាច់ជ្រូកអាំងធ្យូង', 'Charcoal Grilled Pork with Broken Rice', '炭烤椰香猪肉碎米饭'],
  ['ក្តាមឆាម្រេចខ្ចីកែប', 'Kep Fried Crab with Green Peppercorns', '白马市青胡椒爆炒鲜蟹'],
  ['ត្រីបំពងទឹកត្រីស្វាយខ្ចី', 'Crispy Fried Fish with Green Mango Sauce', '青芒果鱼露脆皮炸鱼'],
  ['មាន់ដុតទឹកឃ្មុំភ្នំគូលែន', 'Kulen Honey Roasted Chicken', '荔枝山野蜂蜜脆皮烤鸡'],
  ['សម្លម្ជូរគ្រឿងសាច់គោ', 'Cambodian Sour Lemongrass Beef Soup', '高棉香茅酸牛肉汤'],
  ['ប្រហុកខ្ទិះបន្លែស្រស់', 'Creamy Coconut Prahok Dip with Fresh Veggies', '椰浆肉末鱼酱配鲜蔬'],
  ['ទឹកគ្រឿងខ្មែរដើម', 'Traditional Royal Khmer Fish Dip', '传统高棉鱼肉花生香草蘸酱'],
  ['បង្កងទន្លេមេគង្គអាំងអំបិលម្ទេស', 'Grilled Mekong River Prawns with Chili Salt', '椒盐炭烤湄公河大头虾'],
  ['បាញ់ឆែវខ្មែរស្រួយឆ្ងាញ់', 'Crispy Cambodian Turmeric Coconut Crepe', '高棉香脆姜黄椰香煎饼'],
  ['ការីក្រហមសាច់មាន់ខ្មែរ', 'Cambodian Red Chicken Curry', '高棉传统椰香红咖喱鸡'],
  ['ង៉ាំង៉ូវសាច់មាន់ស្រែ', 'Pickled Lime Free-Range Chicken Soup', '咸柠檬散养土鸡汤'],
  ['ភ្លាសាច់គោត្រយូងចេក', 'Cambodian Lime-Cured Beef Salad', '香蕉花酸柑生拌牛肉沙拉'],
  ['បង្អែមសង់ខ្យាល្ពៅ', 'Steamed Pumpkin Coconut Custard', '高棉椰香蒸南瓜布丁'],
  ['ក្រឡានថ្មគោលបាត់ដំបង', 'Battambang Bamboo Sticky Rice', '马德望竹筒香糯米饭'],
  ['អាម៉ុកត្រី', 'Fish Amok', '高棉鱼阿莫克'],
  ['សម្លកកូរ', 'Samlor Korko Stew', '高棉什锦蔬菜浓汤'],
  ['សម្លម្ជូរ', 'Cambodian Sour Soup', '高棉酸汤'],
  ['សម្លការី', 'Khmer Curry', '高棉咖喱'],
  ['ឡុកឡាក់', 'Beef Lok Lak', '摇晃牛肉粒'],
  ['គុយទាវ', 'Phnom Penh Kuy Teav', '金边粿条'],
  ['នំបញ្ចុក', 'Num Banh Chok Rice Noodles', '高棉米线'],
  ['បាយសាច់ជ្រូក', 'Grilled Pork Rice', '烤猪肉碎米饭'],
  ['ប្រហុកខ្ទិះ', 'Prahok Ktis Coconut Dip', '椰浆肉末鱼酱'],
  ['ទឹកគ្រឿង', 'Teuk Kroeung Fish Dip', '高棉鱼肉香草蘸酱'],
  ['ក្តាមឆាម្រេច', 'Kampot Pepper Fried Crab', '贡布胡椒炒蟹'],
  ['មាន់ដុត', 'Roasted Chicken', '脆皮烤鸡'],
  ['ត្រីអាំង', 'Charcoal Grilled Fish', '炭烤鲜鱼'],
  ['សាច់គោអាំង', 'Charcoal Grilled Beef', '炭烤牛肉'],
  ['បង្កងអាំង', 'Grilled River Prawns', '炭烤大头虾'],
  ['មឹកអាំង', 'Charcoal Grilled Squid', '炭烤鲜鱿鱼'],
  ['ឆាក្តៅ', 'Spicy LemongrassBasil Stir-Fry', '香茅罗勒辣炒'],
  ['ឆាខ្ញី', 'Fresh Ginger Stir-Fry', '鲜子姜小炒'],
  ['ឆាត្រកួន', 'Garlic Morning Glory Stir-Fry', '蒜蓉炒空心菜'],
  ['បបរគ្រឿង', 'Cambodian Herbed Rice Porridge', '高棉香草肉粥'],
  ['បាយឆា', 'Cambodian Fried Rice', '高棉炒饭'],
  ['មីឆា', 'Cambodian Stir-Fried Noodles', '高棉炒面'],
  ['លតឆា', 'Phnom Penh Stir-Fried Pin Noodles', '金边炒银针粉'],
  ['នំគ្រក់', 'Crispy Coconut Rice Pancakes', '椰浆葱花小米饼'],
  ['បាញ់ឆែវ', 'Cambodian Crispy Savory Crepe', '高棉香脆煎饼'],
  ['នំប៉័ងប៉ាតេ', 'Cambodian Baguette Sandwich', '高棉肝酱法棍三明治'],
  ['សង់ខ្យាល្ពៅ', 'Steamed Pumpkin Custard', '椰香南瓜炖蛋'],
  ['ចេកខ្ទិះ', 'Banana in Sweet Coconut Cream', '椰浆西米炖香蕉'],
  ['បង្អែមខ្មែរ', 'Traditional Khmer Dessert', '高棉传统甜品'],
  ['កាហ្វេទឹកដោះគោទឹកកក', 'Cambodian Iced Condensed Milk Coffee', '高棉炼乳冰咖啡'],
];

export function translateSignatureDish(dish: string, lang: Language): string {
  if (!dish || lang === 'km') return dish;
  const trimmed = dish.trim();
  for (const [kh, en, zh] of KHMER_CULINARY_MAP) {
    if (trimmed === kh) return lang === 'zh' ? zh : en;
  }
  for (const [kh, en, zh] of KHMER_CULINARY_MAP) {
    if (trimmed.includes(kh)) {
      return lang === 'zh' ? zh : en;
    }
  }
  if (/[\u1780-\u17FF]/.test(trimmed)) {
    return lang === 'zh' ? `特色招牌菜 (${trimmed})` : `Signature Dish (${trimmed})`;
  }
  return lang === 'zh' ? translateDynamicTextToZh(trimmed) : trimmed;
}

/**
 * Phrase & Vocabulary Dictionary for Compositional English -> Simplified Chinese Translation
 * Sorted longest-first at runtime to guarantee accurate multi-word phrase matching.
 */
const CULINARY_AND_TOURISM_PHRASES_EN_TO_ZH: Array<[string, string]> = [
  // Multi-word sentence patterns & descriptions
  ['the undisputed national dish of cambodia', '举世闻名的柬埔寨国菜'],
  ['the traditional royal everyday stew of cambodia', '柬埔寨传统宫廷与家常什锦浓汤'],
  ['is an authentic cambodian culinary dish prepared with', '是一道正宗的柬埔寨传统名菜，精选'],
  ['is an authentic cambodian dish', '是一道正宗的柬埔寨传统佳肴'],
  ['packed with farm vegetables, toasted rice powder, and savory smoked fish or pork belly', '汇集多种新鲜农家时蔬、炒香茉莉米粉，以及咸香浓郁的烟熏鱼或五花肉'],
  ['fresh river fish gently cooked in fragrant lemongrass-turmeric kroeung with rich coconut cream and steamed inside banana leaf cups', '精选鲜嫩河鱼片，佐以芬芳的香茅姜黄高棉香料泥与浓郁椰浆，盛入芭蕉叶盅内慢火清蒸而成'],
  ['classic cambodian sour soup with tender beef ribs, rich yellow kroeung paste, water spinach, and tangy tamarind broth', '经典高棉香茅酸汤，选用软烂牛肋条、浓郁黄香茅酱、鲜嫩空心菜与酸爽罗望子高汤慢炖而成'],
  ['clean fish and slice into fillets. form banana leaf cups', '将鲜鱼洗净切成薄片，并用芭蕉叶折成蒸盅'],
  ['whisk kroeung, coconut cream, prahok, palm sugar, and eggs until smooth', '将高棉香茅酱、浓椰浆、波罗福鱼酱、棕榈糖与鸡蛋搅拌至顺滑均匀'],
  ['gently mix fish into curry, place noni leaves at bottom, and ladle fish on top', '将鱼片轻轻拌入咖喱浆中，在蕉叶盅底铺上嫩诺丽叶，再盛入鱼肉咖喱'],
  ['steam for 25 minutes. drizzle coconut cream and shredded kaffir lime leaves', '上锅蒸25分钟至熟透，淋上浓椰浆并撒上细切青柠叶丝即可享用'],
  ['cut all vegetables. toast uncooked jasmine rice until golden and grind', '将所有蔬菜洗净切好备用；将生茉莉香米干炒至金黄飘香后研磨成细粉'],
  ['sauté kroeung and prahok until fragrant, then add meat to brown', '用少许油将高棉香料泥与波罗福鱼酱煸炒出香味，随后加入肉类翻炒上色入味'],
  ['add harder vegetables, hot water, and toasted rice powder', '先放入较硬的瓜果蔬菜，注入沸水并撒入炒米粉搅拌均匀'],
  ['add leafy greens just before removing from heat and serve', '待蔬菜炖软后，出锅前放入新鲜绿叶菜，调味后即可趁热盛盘'],
  ['sauté kroeung and prahok in oil, add beef and braise gently', '用热油爆香高棉香茅酱与波罗福鱼酱，加入牛肉慢火煸炒入味'],
  ['pour water and simmer until beef becomes fork-tender', '加入适量清水大火烧开，转小火慢炖至牛肉软烂多汁'],
  ['add tamarind paste, water spinach, and eggplant; season to taste', '加入酸罗望子汁、空心菜与茄子，调入鱼露与棕榈糖至酸甜咸鲜平衡'],
  ['grill over medium glowing charcoal, turning evenly until golden brown and smoky', '置于中等炭火上慢烤，适时翻面直至色泽金黄、炭香浓郁'],
  ['plate and serve hot alongside fresh herbs and traditional dipping sauce', '趁热装盘，搭配新鲜高棉香草与传统秘制蘸酱一同享用'],
  ['heat wok over high flame, sauté garlic and aromatics, then stir-fry the protein', '大火烧热铁锅，爆香蒜末与香料，随后放入主料猛火快炒'],
  ['toss in vegetables and sauces, finish with fresh herbs, and serve immediately', '加入配菜与秘制酱汁翻炒均匀，撒入新鲜香草后即可立即出锅'],
  ['whisk fresh lime juice, fish sauce, palm sugar, garlic, and chili for a balanced dressing', '将鲜榨青柠汁、鱼露、棕榈糖、蒜末与辣椒调制成酸甜鲜辣平衡的凉拌汁'],
  ['toss gently with fresh cambodian herbs and roasted peanuts just before serving', '上桌前加入新鲜高棉香草与烤脆花生碎轻轻拌匀即可享用'],
  ['prepare with authentic palm sugar or coconut cream and infuse with natural pandan/herbs', '采用正宗高棉棕榈糖与鲜榨椰浆烹制，并融入天然斑兰叶清香'],
  ['serve chilled or warm according to traditional cambodian style', '可按照传统高棉风味热食或冰镇后享用'],
  ['cook over balanced heat and season to authentic cambodian taste', '以适中火候精心烹调，还原地道高棉传统风味'],
  ['garnish with fresh herbs and serve hot', '点缀新鲜香草并趁热享用'],

  // Ingredients & Culinary Phrases
  ['fresh river snakehead fish fillet', '鲜切河生鱼片（黑鱼片）'],
  ['traditional khmer kroeung paste', '传统高棉香茅香料泥 (Kroeung)'],
  ['kroeung lemongrass paste', '高棉香茅姜黄香料泥'],
  ['kroeung paste and prahok', '高棉香料泥与波罗福发酵鱼酱'],
  ['kroeung paste and toasted rice', '高棉香料泥与炒香米粉'],
  ['kroeung paste and crushed peanuts', '高棉香料泥与烤花生碎'],
  ['kroeung paste with fingerroot', '加入凹唇姜的高棉香料泥'],
  ['kroeung with extra fingerroot', '特添凹唇姜的高棉香茅泥'],
  ['rich coconut cream', '头道浓椰浆'],
  ['thick coconut cream', '醇厚浓椰浆'],
  ['fresh coconut cream', '鲜榨椰浆'],
  ['coconut cream and milk', '浓椰浆与椰奶'],
  ['coconut cream', '浓椰浆'],
  ['coconut milk', '椰奶'],
  ['fresh young coconut water', '新鲜嫩椰子水'],
  ['minced prahok', '细剁波罗福发酵鱼酱'],
  ['finely minced prahok', '精剁波罗福鱼酱'],
  ['cooked prahok paste for sauce', '熟制蘸酱用波罗福鱼酱'],
  ['cooked prahok dressing', '熟制波罗福鱼酱拌汁'],
  ['cooked prahok paste', '熟制波罗福鱼酱'],
  ['toasted prahok paste', '烤香波罗福鱼酱'],
  ['prahok with crushed lemongrass', '波罗福鱼酱配捣碎香茅'],
  ['prahok and fresh chili', '波罗福鱼酱与鲜辣椒'],
  ['prahok paste', '波罗福发酵鱼酱'],
  ['young noni leaves', '嫩诺丽叶'],
  ['pork belly or smoked fish', '五花肉或高棉烟熏鱼'],
  ['toasted roasted rice powder', '炒香茉莉米粉'],
  ['toasted rice powder', '炒香米粉'],
  ['green papaya, green banana, pumpkin, pea eggplant', '青木瓜、青香蕉、南瓜与水茄'],
  ['moringa and ivy gourd leaves', '辣木叶与红瓜叶'],
  ['wild ivy gourd and moringa leaves', '野生红瓜叶与辣木叶'],
  ['ivy gourd leaves, moringa leaves, and lemon basil', '红瓜叶、辣木叶与柠檬罗勒'],
  ['wild ivy gourd greens', '野生红瓜嫩叶'],
  ['beef ribs or beef shank', '牛肋条或牛腱肉'],
  ['beef shank or brisket chunks', '牛腱或牛腩块'],
  ['beef brisket and tendon chunks', '牛腩与牛筋块'],
  ['sliced beef brisket', '鲜切牛腩片'],
  ['thinly sliced marbled beef', '薄切雪花牛肉片'],
  ['tenderloin beef sliced wafer-thin', '极薄鲜切牛里脊片'],
  ['beef tenderloin or sirloin', '牛里脊或西冷牛肉'],
  ['beef tenderloin cubed', '鲜切牛里脊肉粒'],
  ['sliced tender beef', '鲜嫩牛肉片'],
  ['morning glory (water spinach) and eggplant', '空心菜（通心菜）与紫茄'],
  ['round eggplants and water spinach', '圆茄子与空心菜'],
  ['thai round eggplant, water spinach', '脆圆茄与空心菜'],
  ['water spinach and bean sprouts', '空心菜与绿豆芽'],
  ['water spinach or water hyacinth stems', '空心菜或水葫芦嫩茎'],
  ['fresh morning glory cut', '鲜切空心菜段'],
  ['ripe tamarind juice or hog plum leaves', '熟罗望子汁或酸槟榔叶'],
  ['young green tamarind or wild sour leaves', '嫩青罗望子或山野酸叶'],
  ['crushed young tamarind pods', '捣碎嫩罗望子果'],
  ['tamarind pulp and palm sugar', '罗望子果肉与棕榈糖'],
  ['palm sugar and tamarind', '棕榈糖与罗望子'],
  ['tamarind paste', '罗望子酸酱'],
  ['free-range chicken pieces', '散养土鸡块'],
  ['free-range chicken cuts', '散养土鸡切块'],
  ['free-range chicken bite-sized pieces', '散养土鸡丁'],
  ['whole free-range chicken', '整只散养土鸡'],
  ['free-range duck pieces', '散养土鸭块'],
  ['khmer red curry paste and kaffir lime leaves', '高棉红咖喱酱与青柠叶'],
  ['khmer red curry paste', '高棉红咖喱酱'],
  ['sweet potatoes and carrots', '红薯与胡萝卜'],
  ['sweet potatoes, coconut cream, and roasted peanuts', '红薯、浓椰浆与烤花生'],
  ['yardlong beans and onion', '长豆角（豇豆）与洋葱'],
  ['boiled pounded snakehead fish', '水煮捣碎黑鱼肉'],
  ['flaked and pounded snakehead fish', '手撕捣碎黑鱼肉松'],
  ['poached river snakehead fish flaked', '白灼手撕河生鱼肉'],
  ['fresh snakehead fish steaks', '新鲜黑鱼段'],
  ['fresh snakehead fish cuts', '新鲜黑鱼块'],
  ['fresh river snakehead fish', '新鲜河生鱼（黑鱼）'],
  ['luffa gourd, pumpkin, straw mushrooms', '丝瓜、南瓜与草菇'],
  ['pickled whole lime with juice', '陈年咸柠檬连汁'],
  ['straw or dried mushrooms', '草菇或干香菇'],
  ['crispy garlic, scallions, cilantro', '金黄炸蒜酥、葱花与香菜'],
  ['fried garlic, scallions, bean sprouts', '炸蒜酥、葱花与豆芽'],
  ['smoked catfish flaked', '手撕烟熏鲶鱼肉'],
  ['pork belly cut in large chunks', '大块五花肉'],
  ['pork ribs or belly', '猪排骨或五花肉'],
  ['young pork spare ribs', '嫩猪小排'],
  ['pork loin sliced thinly', '薄切猪里脊片'],
  ['thin sliced pork loin or shoulder', '薄切猪里脊或梅花肉'],
  ['minced pork and meatballs', '猪肉末与手打肉丸'],
  ['pork bones and roasted dried squid', '猪筒骨与烤鱿鱼干'],
  ['pork bones and minced pork', '猪骨高汤与猪肉末'],
  ['minced pork belly', '五花肉末'],
  ['minced pork', '猪肉末'],
  ['pork belly strip', '五花肉条'],
  ['pork ribs', '猪排骨'],
  ['hard-boiled duck eggs', '水煮鸭蛋'],
  ['fertilized duck eggs', '新鲜毛鸭蛋'],
  ['cooked salted duck egg', '熟咸鸭蛋'],
  ['fried egg sunny-side up', '溏心荷包蛋'],
  ['duck eggs', '鸭蛋'],
  ['bamboo shoots or winter melon', '鲜竹笋或冬瓜'],
  ['boiled fresh sliced bamboo shoots', '焯水鲜笋片'],
  ['sliced fresh bamboo shoots and straw mushrooms', '鲜笋片与草菇'],
  ['lemongrass stalks, wood-apple, and fresh bamboo shoots', '香茅秆、木苹果与鲜竹笋'],
  ['garlic, kampot black pepper, fish sauce', '大蒜、贡布黑胡椒与鱼露'],
  ['kampot black pepper, salt, lime juice', '贡布黑胡椒、海盐与青柠汁'],
  ['kampot black pepper and lime juice', '贡布黑胡椒与鲜青柠汁'],
  ['kampot black pepper and garlic', '贡布黑胡椒与蒜末'],
  ['crushed kampot black pepper', '现磨贡布黑胡椒碎'],
  ['fresh green kampot peppercorn sprigs', '新鲜贡布青胡椒串'],
  ['fresh green kampot peppercorns', '新鲜贡布青胡椒粒'],
  ['fish sauce, palm sugar, sea salt & kampot pepper', '鱼露、棕榈糖、海盐与贡布胡椒'],
  ['fish sauce, palm sugar, lime, chili', '鱼露、棕榈糖、青柠与辣椒'],
  ['oyster sauce, soy sauce, palm sugar', '蚝油、酱油与棕榈糖'],
  ['coconut milk, garlic, fish sauce, palm sugar', '椰奶、蒜蓉、鱼露与棕榈糖'],
  ['cambodian palm sugar & coconut cream', '高棉棕榈糖与鲜椰浆'],
  ['palm sugar and toasted sesame seeds', '棕榈糖与炒香白芝麻'],
  ['solid palm sugar cubed', '高棉棕榈糖块'],
  ['authentic palm sugar', '正宗高棉棕榈糖'],
  ['palm sugar', '棕榈糖'],
  ['fresh sanday catfish steaks', '新鲜湄公河鲶鱼段'],
  ['fresh walking catfish', '新鲜本地塘鲺（胡子鲶）'],
  ['culantro and holy basil', '刺芫荽与九层塔（圣罗勒）'],
  ['culantro and crispy fried garlic', '刺芫荽与金黄炸蒜酥'],
  ['holy basil and kaffir lime leaves', '九层塔与青柠叶'],
  ['holy basil leaves and fresh chilies', '九层塔叶与鲜辣椒'],
  ['holy basil and bean sprouts', '九层塔与绿豆芽'],
  ['holy basil and bird-eye chili', '九层塔与朝天椒'],
  ['holy basil leaves', '新鲜九层塔叶'],
  ['saw-leaf culantro', '刺芫荽（假芫荽）'],
  ['fresh chilies and premium fish sauce', '鲜辣椒与特级鱼露'],
  ['yanang leaf green extract', '青牛胆叶天然绿汁'],
  ['mushrooms and holy basil', '鲜蘑菇与九层塔'],
  ['ripe pineapple and tomatoes', '成熟菠萝与红番茄'],
  ['young tender tamarind leaves and ripe tomatoes', '嫩罗望子叶与熟番茄'],
  ['pounded fresh field crab broth', '鲜捣稻田蟹浓汤'],
  ['crisp water mimosa shoots', '脆嫩水含羞草'],
  ['hog plum sour leaves', '酸槟榔嫩叶'],
  ['bird eye chilies', '红朝天椒'],
  ['sliced red bird eye chilies', '红朝天椒圈'],
  ['lemongrass, galangal, kaffir lime leaves', '香茅、南姜与青柠叶'],
  ['lemongrass, galangal, and cilantro', '香茅、南姜与香菜'],
  ['finely sliced lemongrass and galangal', '细切香茅丝与南姜丝'],
  ['julienned ginger, lemongrass', '鲜姜丝与香茅丝'],
  ['fresh young ginger shredded', '鲜嫩子姜丝'],
  ['shredded ginger, bean sprouts, lime', '姜丝、豆芽与青柠角'],
  ['kaffir lime leaves thinly sliced', '极细青柠叶丝'],
  ['chili, garlic, kaffir lime leaves', '辣椒、大蒜与青柠叶'],
  ['freshly squeezed lime juice', '鲜榨青柠汁'],
  ['fresh straw mushrooms and lime juice', '鲜草菇与青柠汁'],
  ['lime juice, garlic, chilies, palm sugar', '青柠汁、蒜末、辣椒与棕榈糖'],
  ['lime juice and coriander', '青柠汁与香菜'],
  ['fresh lime juice', '鲜榨青柠汁'],
  ['fresh lime wedges', '新鲜青柠角'],
  ['winter melon chunks', '冬瓜块'],
  ['saraman toasted spice paste', '萨拉曼烘烤香料咖喱酱'],
  ['roasted crushed peanuts', '烤香花生碎'],
  ['crushed roasted peanuts', '香脆烤花生碎'],
  ['crushed peanuts and fresh herbs', '花生碎与新鲜香草'],
  ['crushed peanuts, cucumber, pickled papaya', '花生碎、黄瓜丝与木瓜泡菜'],
  ['toasted peanuts and fresh basil', '烤花生与新鲜罗勒'],
  ['fresh mixed mints and toasted peanuts', '新鲜薄荷叶与烤花生'],
  ['fresh small spiny eel fish', '新鲜小刺鳅鱼'],
  ['green banana and green papaya', '青香蕉与青木瓜'],
  ['raw green banana, eggplant, cucumber, pineapple, herbs', '生青香蕉片、脆茄、黄瓜、菠萝与鲜香草'],
  ['steamed sticky rice', '蒸糯米饭'],
  ['new-crop sticky rice', '新收香糯米'],
  ['glutinous rice flour', '水磨糯米粉'],
  ['glutinous rice', '优质糯米'],
  ['steamed fragrant jasmine rice', '香喷喷的茉莉香米饭'],
  ['chilled cooked jasmine rice', '隔夜冷茉莉香米饭'],
  ['jasmine rice with a touch of sticky rice', '茉莉香米配少许糯米'],
  ['lemongrass stalk for cavity', '塞鱼腹用整根香茅'],
  ['coarse sea salt and chili', '粗海盐与鲜辣椒'],
  ['sea salt, red chilies, garlic', '海盐、红辣椒与大蒜'],
  ['lemongrass turmeric marinade', '香茅姜黄秘制腌料'],
  ['wild honey and fish sauce', '森林野蜂蜜与鱼露'],
  ['wild honey and soy sauce', '森林野蜂蜜与酱油'],
  ['large whole cleaned farm frogs', '处理干净的肥美田鸡'],
  ['cleaned freshwater paddy snails', '洗净挑出的淡水田螺肉'],
  ['fresh whole squids', '整只新鲜海鱿鱼'],
  ['koh kong seafood chili-lime dip', '国公省招牌酸辣青柠海鲜蘸酱'],
  ['fresh ocean tiger prawns', '新鲜深海黑虎虾'],
  ['poached peeled prawns', '白灼去壳鲜虾仁'],
  ['lettuce, tomatoes, red onion slices', '生菜、番茄片与红洋葱圈'],
  ['fresh blue swimmer crabs cleaned and halved', '洗净切半的新鲜蓝泳蟹（兰花蟹）'],
  ['fresh picked crab meat', '手工鲜拆蟹肉'],
  ['minced garlic and oyster sauce', '蒜蓉与特级蚝油'],
  ['minced garlic and scallions', '蒜末与葱花'],
  ['garlic and spring onions', '蒜末与香葱'],
  ['oyster sauce and soy sauce', '蚝油与酱油'],
  ['crushed garlic cloves', '拍碎大蒜瓣'],
  [' roasted garlic, shallots, and chilies', '烤香大蒜、红葱头与辣椒'],
  ['roasted garlic, shallots, and chilies', '烤香大蒜、红葱头与辣椒'],
  ['scallions and palm sugar', '香葱段与棕榈糖'],
  ['fresh lemongrass kroeung', '新鲜现捣香茅酱'],
  ['sweet fermented bean sauce', '甜味黄豆酱'],
  ['crisp green mango shredded', '脆爽青芒果丝'],
  ['assorted raw cambodian vegetables', '高棉时令鲜蔬拼盘'],
  ['banana leaves for parcel', '包裹用新鲜芭蕉叶'],
  ['banana leaves and bamboo ties', '芭蕉叶与竹篾绑绳'],
  ['sweet pomelo segments flaked', '剥好的甜柚果肉'],
  ['toasted shredded coconut', '烤香椰丝'],
  ['freshly shredded coconut', '鲜刨白椰丝'],
  ['fresh khmer rice noodles', '新鲜高棉手工米线'],
  ['fresh rice noodles', '新鲜河粉（粿条）'],
  ['steamed rice noodles', '蒸细米粉'],
  ['fresh yellow egg noodles', '新鲜黄鸡蛋面'],
  ['pounded dried shrimp', '捣碎虾米绒'],
  ['star anise, cloves, five-spice', '八角、丁香与五香粉'],
  ['pickled cucumber and daikon', '酸甜黄瓜与白萝卜泡菜'],
  ['pickled papaya, cucumber, chili sauce', '木瓜泡菜、黄瓜条与甜辣酱'],
  ['cooked blood cubes and pork liver', '熟猪血块与鲜嫩猪肝'],
  ['pandan leaf water', '天然斑兰叶汁'],
  ['tapioca pearls and pandan leaf', '西米露与斑兰叶'],
  ['cooked black beans', '熟黑豆'],
  ['fresh bamboo stalks', '新鲜青竹筒'],
  ['split mung beans soaked', '泡发去皮绿豆仁'],
  ['pork belly seasoned with kampot pepper', '贡布黑胡椒腌制五花肉'],
  ['whole baby kabocha pumpkin', '整颗小金瓜（日本南瓜）'],
  ['ripe small bananas sliced', '切片成熟小芭蕉'],
  ['crispy french baguette', '外酥里嫩法式长棍面包'],
  ['pork liver pâté and homemade butter', '秘制猪肝酱与自制黄油'],
  ['cambodian sausage and cold cuts', '高棉甜腊肠与什锦冷切肉'],
  ['fresh vietnamese coriander / laksa leaves', '新鲜越南香菜（叻沙叶）'],
  ['ripe wood-apple pulp and water lily stems', '成熟木苹果果肉与睡莲嫩茎'],
];

/**
 * Single-word fallback dictionary for any remaining English words in dynamic descriptions/steps
 */
const WORD_FALLBACK_EN_TO_ZH: Record<string, string> = {
  authentic: '正宗',
  traditional: '传统',
  cambodian: '柬埔寨',
  cambodia: '柬埔寨',
  khmer: '高棉',
  royal: '皇家',
  signature: '招牌',
  famous: '著名',
  popular: '热门',
  classic: '经典',
  special: '特色',
  specialty: '特色菜',
  everyday: '家常',
  country: '乡村',
  wild: '野生',
  forest: '山林',
  river: '河鲜',
  ocean: '深海',
  coastal: '海岸',
  mountain: '高山',
  island: '海岛',
  floating: '水上',
  village: '村落',
  ancient: '古老',
  historic: '历史',
  historical: '历史',
  sacred: '神圣',
  sanctuary: '保护区',
  national: '国家',
  park: '公园',
  waterfall: '瀑布',
  waterfalls: '瀑布群',
  temple: '古寺',
  temples: '寺庙群',
  pagoda: '佛塔寺庙',
  palace: '皇宫',
  museum: '博物馆',
  market: '市场',
  night: '夜市',
  beach: '海滩',
  beaches: '海滩',
  lake: '湖泊',
  reservoir: '水库',
  bridge: '大桥',
  cave: '溶洞',
  caves: '溶洞群',
  viewpoint: '观景台',
  sunset: '日落',
  sunrise: '日出',
  resort: '度假区',
  eco: '生态',
  ecotourism: '生态旅游',
  plantation: '庄园',
  plantations: '种植园',
  farm: '农场',
  soup: '汤',
  soups: '汤品',
  stew: '炖汤',
  stews: '炖菜',
  curry: '咖喱',
  curries: '咖喱',
  broth: '高汤',
  clear: '清炖',
  sour: '酸味',
  sweet: '甜味',
  spicy: '香辣',
  hot: '热辣',
  savory: '咸香',
  fragrant: '芬芳',
  aromatic: '飘香',
  aromatics: '香料',
  crispy: '香脆',
  crunchy: '爽脆',
  crisp: '鲜脆',
  tender: '鲜嫩',
  fresh: '新鲜',
  freshly: '鲜制',
  ripe: '成熟',
  young: '鲜嫩',
  raw: '生鲜',
  dried: '干制',
  smoked: '烟熏',
  salted: '咸香',
  fermented: '发酵',
  pickled: '酸泡',
  toasted: '烤香',
  roasted: '烘烤',
  grilled: '炭烤',
  charcoal: '炭火',
  steamed: '清蒸',
  boiled: '白灼',
  poached: '白切',
  braised: '红烧',
  simmered: '慢炖',
  caramelized: '焦糖红烧',
  fried: '香煎',
  stir: '快炒',
  wok: '猛火',
  baked: '砂锅焗',
  stuffed: '酿馅',
  minced: '细剁',
  sliced: '切片',
  shredded: '切丝',
  cubed: '切丁',
  pounded: '捣碎',
  crushed: '压碎',
  flaked: '手撕',
  chilled: '冰镇',
  warm: '温热',
  creamy: '浓滑',
  rich: '浓郁',
  thick: '醇厚',
  velvety: '丝滑',
  golden: '金黄',
  red: '红',
  green: '青绿',
  yellow: '金黄',
  white: '白',
  black: '黑',
  purple: '紫',
  fish: '鲜鱼',
  snakehead: '黑鱼',
  catfish: '鲶鱼',
  eel: '黄鳝',
  prawn: '鲜虾',
  prawns: '大虾',
  shrimp: '虾仁',
  crab: '螃蟹',
  crabs: '螃蟹',
  squid: '鱿鱼',
  clams: '河蚬',
  mussels: '青口贝',
  snail: '田螺',
  snails: '田螺',
  frog: '田鸡',
  frogs: '田鸡',
  seafood: '海鲜',
  beef: '牛肉',
  pork: '猪肉',
  belly: '五花肉',
  ribs: '排骨',
  rib: '肋排',
  trotters: '猪蹄',
  tripe: '牛肚',
  chicken: '土鸡',
  wings: '鸡翅',
  breast: '鸡胸肉',
  duck: '鸭肉',
  meat: '肉类',
  meatballs: '肉丸',
  meatball: '肉丸',
  sausage: '腊肠',
  jerky: '肉干',
  egg: '鸡蛋',
  eggs: '蛋',
  tofu: '豆腐',
  rice: '米饭',
  sticky: '糯米',
  glutinous: '糯米',
  jasmine: '茉莉香米',
  porridge: '米粥',
  congee: '粥',
  noodle: '面条',
  noodles: '米粉/面条',
  vermicelli: '细米线',
  baguette: '法棍面包',
  sandwich: '三明治',
  salad: '沙拉',
  dip: '蘸酱',
  sauce: '酱汁',
  paste: '香料酱',
  dressing: '拌汁',
  vegetable: '蔬菜',
  vegetables: '时令蔬菜',
  greens: '绿叶菜',
  herb: '香草',
  herbs: '香草',
  herbal: '草本',
  lemongrass: '香茅',
  turmeric: '姜黄',
  galangal: '南姜',
  ginger: '鲜姜',
  garlic: '大蒜',
  shallots: '红葱头',
  onion: '洋葱',
  scallion: '香葱',
  scallions: '葱花',
  chive: '韭菜',
  cilantro: '香菜',
  coriander: '香菜',
  culantro: '刺芫荽',
  basil: '罗勒',
  mint: '薄荷',
  pepper: '胡椒',
  peppercorns: '胡椒粒',
  chili: '辣椒',
  chilies: '辣椒',
  lime: '青柠',
  lemon: '柠檬',
  tamarind: '罗望子',
  coconut: '椰子',
  palm: '棕榈',
  sugar: '糖',
  honey: '蜂蜜',
  salt: '盐',
  oil: '食用油',
  water: '水',
  milk: '鲜奶',
  tea: '茶',
  coffee: '咖啡',
  juice: '鲜榨汁',
  smoothie: '冰沙',
  nectar: '花蜜饮',
  dessert: '甜品',
  desserts: '甜点',
  cake: '糕点',
  cakes: '糕饼',
  custard: '炖蛋布丁',
  banana: '香蕉',
  mango: '芒果',
  papaya: '木瓜',
  pineapple: '菠萝',
  pomelo: '甜柚',
  pumpkin: '南瓜',
  taro: '香芋',
  lotus: '莲子',
  avocado: '牛油果',
  sugarcane: '甘蔗',
  kumquat: '金桔',
  pandan: '斑兰叶',
  bamboo: '竹笋',
  shoots: '鲜笋',
  shoot: '笋',
  mushroom: '蘑菇',
  mushrooms: '鲜菇',
  eggplant: '茄子',
  okra: '秋葵',
  cucumber: '黄瓜',
  tomato: '番茄',
  tomatoes: '番茄',
  broccoli: '西兰花',
  cauliflower: '花椰菜',
  radish: '萝卜',
  peanuts: '花生',
  peanut: '花生',
  sesame: '芝麻',
  beans: '豆类',
  mung: '绿豆',
  moringa: '辣木叶',
  noni: '诺丽叶',
  amok: '阿莫克',
  kroeung: '高棉香茅酱',
  prahok: '波罗福鱼酱',
  korko: '什锦浓汤',
  kuyteav: '粿条',
  kralan: '竹筒饭',
  balut: '毛蛋',
  prepare: '准备',
  select: '精选',
  slice: '切片',
  cut: '切好',
  clean: '洗净',
  wash: '清洗',
  boil: '水煮',
  steam: '清蒸',
  fry: '煎炒',
  grill: '炭烤',
  roast: '烘烤',
  simmer: '慢炖',
  braise: '焖烧',
  whisk: '搅拌',
  mix: '拌匀',
  toss: '翻拌',
  add: '加入',
  pour: '倒入',
  season: '调味',
  garnish: '点缀',
  serve: '盛盘享用',
  immediately: '立即',
  minutes: '分钟',
  mins: '分钟',
  hours: '小时',
  free: '免费',
  entry: '门票',
  all: '全部',
  year: '全年',
  round: '四季皆宜',
  morning: '清晨',
  afternoon: '下午',
  evening: '傍晚',
  dry: '旱季',
  season_time: '季节',
};

const SORTED_PHRASES = [...CULINARY_AND_TOURISM_PHRASES_EN_TO_ZH].sort(
  (a, b) => b[0].length - a[0].length
);

/**
 * Translate any dynamic English/Khmer culinary or tourism text into natural Simplified Chinese (简体中文)
 */
export function translateDynamicTextToZh(text: string | undefined): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // 1. Exact matches
  if (EXACT_FOOD_NAME_ZH_MAP[trimmed]) return EXACT_FOOD_NAME_ZH_MAP[trimmed];
  if (FOOD_CATEGORY_ZH_MAP[trimmed]) return FOOD_CATEGORY_ZH_MAP[trimmed];
  if (EXACT_DESTINATION_NAME_ZH_MAP[trimmed]) return EXACT_DESTINATION_NAME_ZH_MAP[trimmed];
  if (CAMBODIA_PROVINCE_ZH_MAP[trimmed]) return CAMBODIA_PROVINCE_ZH_MAP[trimmed];

  // 2. If already contains Chinese characters and no English words, return as-is
  if (/[\u4E00-\u9FFF]/.test(trimmed) && !/[a-zA-Z]{3,}/.test(trimmed)) {
    return trimmed;
  }

  // 3. Check if Khmer text
  if (/[\u1780-\u17FF]/.test(trimmed)) {
    // Convert Khmer numerals & units first
    const convertedUnits = formatAmountByLang(trimmed, 'zh');
    if (convertedUnits !== trimmed && !/[\u1780-\u17FF]/.test(convertedUnits)) {
      return convertedUnits;
    }
    return translateSignatureDish(trimmed, 'zh');
  }

  // 4. Multi-phrase replacement on English string
  let work = trimmed;

  // Normalize common weight/unit suffixes like (400g), (500g), (1kg)
  work = work
    .replace(/\((\d+)\s*g\)/gi, '（$1克）')
    .replace(/\((\d+(?:\.\d+)?)\s*kg\)/gi, '（$1公斤）')
    .replace(/\((\d+)\s*ml\)/gi, '（$1毫升）');

  // Province names embedded in text
  for (const [enProv, zhProv] of Object.entries(CAMBODIA_PROVINCE_ZH_MAP)) {
    if (/^[A-Za-z\s]+$/.test(enProv) && enProv.length >= 3) {
      const re = new RegExp(`\\b${enProv}\\b`, 'gi');
      work = work.replace(re, zhProv);
    }
  }

  // Longest-first culinary & tourism phrases
  for (const [enPhrase, zhPhrase] of SORTED_PHRASES) {
    const escaped = enPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    if (re.test(work)) {
      work = work.replace(re, zhPhrase);
    }
  }

  // Remove English stop-words / connectors between Chinese segments
  work = work
    .replace(/\b(the|a|an|of|with|in|on|for|to|from|by|into|until|over|alongside|and|or|is|are|prepared|packed|using|according|style)\b/gi, (match) => {
      const m = match.toLowerCase();
      if (m === 'and') return '与';
      if (m === 'or') return '或';
      if (m === 'with') return '配';
      return '';
    });

  // Replace remaining individual English words using WORD_FALLBACK_EN_TO_ZH
  work = work.replace(/\b([A-Za-z]+)\b/g, (word) => {
    const lower = word.toLowerCase();
    if (WORD_FALLBACK_EN_TO_ZH[lower]) {
      return WORD_FALLBACK_EN_TO_ZH[lower];
    }
    // Keep official acronyms/brands unchanged
    if (['unesco', 'vip', 'gps', 'aba', 'khqr', 'ai', 'tiktok', 'facebook', 'telegram', 'google', 'maps', 'kcal', 'cal', 'usd', 'gi'].includes(lower)) {
      return word;
    }
    return '';
  });

  // Clean up spacing and punctuation
  work = work
    .replace(/\(\s*\)/g, '')
    .replace(/（\s*）/g, '')
    .replace(/\s*,\s*/g, '、')
    .replace(/\s*\.\s*/g, '。')
    .replace(/\s*;\s*/g, '；')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/([a-zA-Z0-9])\s+([\u4E00-\u9FFF])/g, '$1$2')
    .replace(/([\u4E00-\u9FFF])\s+([\u4E00-\u9FFF])/g, '$1$2')
    .replace(/([\u4E00-\u9FFF])\s+([\u4E00-\u9FFF])/g, '$1$2')
    .replace(/、+/g, '、')
    .replace(/。+/g, '。')
    .replace(/^[、，。；\s]+|[、，\s]+$/g, '')
    .trim();

  return /[\u4E00-\u9FFF]/.test(work) ? work : trimmed;
}

/**
 * Get localized fields for a FoodItem in KM, EN, or ZH
 */
export function getLocalizedFood(food: FoodItem, lang: Language) {
  if (lang === 'km') {
    return {
      name: food.nameKh,
      secondaryName: food.nameEn,
      category: food.categoryKh,
      description: food.descriptionKh,
      prepTime: food.prepTime,
      cookTime: food.cookTime,
      servings: food.servings,
      difficulty: formatDifficultyByLang(food.difficulty, 'km'),
      ingredients: (food.ingredients || []).map((ing: Ingredient) => ({
        name: ing.nameKh,
        amount: ing.amount,
      })),
      steps: (food.steps || []).map((st: CookingStep) => ({
        stepNumber: st.stepNumber,
        instruction: st.instructionKh,
        tip: st.tipKh || '',
      })),
    };
  }

  if (lang === 'en') {
    return {
      name: food.nameEn,
      secondaryName: food.nameKh,
      category: food.categoryEn,
      description: food.descriptionEn,
      prepTime: formatDurationByLang(food.prepTime, 'en'),
      cookTime: formatDurationByLang(food.cookTime, 'en'),
      servings: formatServingsByLang(food.servings, 'en'),
      difficulty: formatDifficultyByLang(food.difficulty, 'en'),
      ingredients: (food.ingredients || []).map((ing: Ingredient) => ({
        name: ing.nameEn,
        amount: formatAmountByLang(ing.amount, 'en'),
      })),
      steps: (food.steps || []).map((st: CookingStep) => ({
        stepNumber: st.stepNumber,
        instruction: st.instructionEn,
        tip: st.tipKh ? '' : '',
      })),
    };
  }

  // Simplified Chinese ('zh')
  const zhName = EXACT_FOOD_NAME_ZH_MAP[food.nameEn] || translateDynamicTextToZh(food.nameEn);
  const zhCategory = FOOD_CATEGORY_ZH_MAP[food.categoryEn] || translateDynamicTextToZh(food.categoryEn);
  const zhDesc = translateDynamicTextToZh(food.descriptionEn);

  return {
    name: zhName,
    secondaryName: food.nameKh,
    category: zhCategory,
    description: zhDesc,
    prepTime: formatDurationByLang(food.prepTime, 'zh'),
    cookTime: formatDurationByLang(food.cookTime, 'zh'),
    servings: formatServingsByLang(food.servings, 'zh'),
    difficulty: formatDifficultyByLang(food.difficulty, 'zh'),
    ingredients: (food.ingredients || []).map((ing: Ingredient) => ({
      name: translateDynamicTextToZh(ing.nameEn),
      amount: formatAmountByLang(ing.amount, 'zh'),
    })),
    steps: (food.steps || []).map((st: CookingStep) => ({
      stepNumber: st.stepNumber,
      instruction: translateDynamicTextToZh(st.instructionEn),
      tip: '',
    })),
  };
}

/**
 * Get localized fields for a TouristDestination in KM, EN, or ZH
 */
export function getLocalizedDestination(dest: TouristDestination, lang: Language) {
  if (lang === 'km') {
    return {
      name: dest.nameKh,
      secondaryName: dest.nameEn,
      category: dest.categoryKh,
      province: dest.provinceKh,
      address: dest.addressKh,
      description: dest.descriptionKh,
      entranceFee: dest.entranceFeeKh || dest.entryFeeKh || 'ឥតគិតថ្លៃ',
      bestTime: dest.bestTimeToVisitKh || 'ពេញមួយឆ្នាំ',
      highlights: dest.highlightsKh || [],
    };
  }

  if (lang === 'en') {
    return {
      name: dest.nameEn,
      secondaryName: dest.nameKh,
      category: dest.categoryEn,
      province: dest.provinceEn,
      address: dest.addressEn,
      description: dest.descriptionEn,
      entranceFee: dest.entranceFeeEn || dest.entryFeeEn || 'Free Entry',
      bestTime: dest.bestTimeToVisitEn || 'All year round',
      highlights: dest.highlightsEn && dest.highlightsEn.length > 0 ? dest.highlightsEn : (dest.highlightsKh || []),
    };
  }

  // Simplified Chinese ('zh')
  const zhName = EXACT_DESTINATION_NAME_ZH_MAP[dest.nameEn] || translateDynamicTextToZh(dest.nameEn);
  const zhProv = CAMBODIA_PROVINCE_ZH_MAP[dest.provinceKh] || CAMBODIA_PROVINCE_ZH_MAP[dest.provinceEn] || dest.provinceEn;
  const zhCat = translateDynamicTextToZh(dest.categoryEn);
  const zhDesc = translateDynamicTextToZh(dest.descriptionEn);
  const rawFee = dest.entranceFeeEn || dest.entryFeeEn || 'Free';
  const zhFee = /free/i.test(rawFee) ? '免费入场' : rawFee.replace(/foreigners/gi, '外宾').replace(/locals/gi, '本地人');
  const rawTime = dest.bestTimeToVisitEn || 'All year round';
  const zhTime = /all year/i.test(rawTime)
    ? '全年皆宜'
    : rawTime
        .replace(/Nov\s*-\s*Apr/gi, '11月至次年4月（旱季）')
        .replace(/Morning\s*&\s*Late Afternoon/gi, '清晨与傍晚最佳')
        .replace(/Dry Season/gi, '旱季最佳');

  return {
    name: zhName,
    secondaryName: dest.nameKh,
    category: zhCat,
    province: zhProv,
    address: `${zhProv} • ${dest.addressEn || dest.addressKh}`,
    description: zhDesc,
    entranceFee: zhFee,
    bestTime: zhTime,
    highlights: (dest.highlightsEn && dest.highlightsEn.length > 0 ? dest.highlightsEn : (dest.highlightsKh || [])).map(
      (h) => translateDynamicTextToZh(h)
    ),
  };
}

/**
 * Get localized fields for a Restaurant in KM, EN, or ZH
 */
export function getLocalizedRestaurant(rest: Restaurant, lang: Language) {
  if (lang === 'km') {
    return {
      name: rest.nameKh,
      secondaryName: rest.nameEn,
      province: rest.provinceKh || 'កម្ពុជា',
      address: rest.addressKh,
      description: rest.descriptionKh,
      signatureDishes: rest.signatureDishesKh || [],
    };
  }

  if (lang === 'en') {
    return {
      name: rest.nameEn || rest.nameKh,
      secondaryName: rest.nameKh,
      province: rest.provinceEn || 'Cambodia',
      address: rest.addressEn || rest.addressKh,
      description: rest.descriptionEn || rest.descriptionKh,
      signatureDishes: (rest.signatureDishesKh || []).map((d) => translateSignatureDish(d, 'en')),
    };
  }

  // Simplified Chinese ('zh')
  const zhProv =
    CAMBODIA_PROVINCE_ZH_MAP[rest.provinceKh] ||
    CAMBODIA_PROVINCE_ZH_MAP[rest.provinceEn] ||
    '柬埔寨';
  const zhDesc = translateDynamicTextToZh(rest.descriptionEn || rest.descriptionKh);

  return {
    name: rest.nameEn ? `${rest.nameEn}` : rest.nameKh,
    secondaryName: rest.nameKh,
    province: zhProv,
    address: `${zhProv} (${rest.addressEn || rest.addressKh})`,
    description: zhDesc,
    signatureDishes: (rest.signatureDishesKh || []).map((d) => translateSignatureDish(d, 'zh')),
  };
}

// ============================================================================
// COMMUNITY FEED & COMMENTS LOCALIZATION (KM / EN / ZH)
// Preserves original post & comment database objects untouched!
// ============================================================================
const COMMUNITY_CATEGORY_MAP: Record<string, { km: string; en: string; zh: string }> = {
  'គ្រឿងសមុទ្រ': { km: 'គ្រឿងសមុទ្រ', en: 'Seafood', zh: '海鲜美食' },
  'Seafood': { km: 'គ្រឿងសមុទ្រ', en: 'Seafood', zh: '海鲜美食' },
  'រូបមន្តម្ហូប': { km: 'រូបមន្តម្ហូប', en: 'Cooking Recipe', zh: '烹饪食谱' },
  'Cooking Recipe': { km: 'រូបមន្តម្ហូប', en: 'Cooking Recipe', zh: '烹饪食谱' },
  'ម្ហូបខ្មែរ': { km: 'ម្ហូបខ្មែរ', en: 'Khmer Food', zh: '高棉美食' },
  'Khmer Food': { km: 'ម្ហូបខ្មែរ', en: 'Khmer Food', zh: '高棉美食' },
  'ហាងអាហារឆ្ងាញ់': { km: 'ហាងអាហារឆ្ងាញ់', en: 'Food Review', zh: '探店点评' },
  'Food Review': { km: 'ហាងអាហារឆ្ងាញ់', en: 'Food Review', zh: '探店点评' },
  'ដំណើរកម្សាន្ត': { km: 'ដំណើរកម្សាន្ត', en: 'Travel / Tour', zh: '旅游打卡' },
  'Travel / Tour': { km: 'ដំណើរកម្សាន្ត', en: 'Travel / Tour', zh: '旅游打卡' },
  'បង្អែម & ភេសជ្ជៈ': { km: 'បង្អែម & ភេសជ្ជៈ', en: 'Dessert & Drink', zh: '甜品与饮品' },
  'Dessert & Drink': { km: 'បង្អែម & ភេសជ្ជៈ', en: 'Dessert & Drink', zh: '甜品与饮品' },
};

const COMMUNITY_LOCATION_MAP: Record<string, { km: string; en: string; zh: string }> = {
  'ផ្សារក្តាមខេត្តកែប': { km: 'ផ្សារក្តាមខេត្តកែប', en: 'Kep Crab Market', zh: '白马省螃蟹市场' },
  'ខេត្តកំពត': { km: 'ខេត្តកំពត', en: 'Kampot Province', zh: '贡布省' },
  'រាជធានីភ្នំពេញ': { km: 'រាជធានីភ្នំពេញ', en: 'Phnom Penh', zh: '金边市' },
  'ខេត្តសៀមរាប': { km: 'ខេត្តសៀមរាប', en: 'Siem Reap Province', zh: '暹粒省' },
  'ខេត្តព្រះសីហនុ': { km: 'ខេត្តព្រះសីហនុ', en: 'Preah Sihanouk', zh: '西哈努克省' },
  'ខេត្តបាត់ដំបង': { km: 'ខេត្តបាត់ដំបង', en: 'Battambang Province', zh: '马德望省' },
  'ខេត្តកែប': { km: 'ខេត្តកែប', en: 'Kep Province', zh: '白马省' },
  'ខេត្តមណ្ឌលគិរី': { km: 'ខេត្តមណ្ឌលគិរី', en: 'Mondulkiri Province', zh: '蒙多基里省' },
  'ខេត្តរតនគិរី': { km: 'ខេត្តរតនគិរី', en: 'Ratanakiri Province', zh: '腊塔纳基里省' },
  'ខេត្តកោះកុង': { km: 'ខេត្តកោះកុង', en: 'Koh Kong Province', zh: '国公省' },
};

const COMMUNITY_AUTHOR_MAP: Record<string, { km: string; en: string; zh: string }> = {
  'អ្នកដំណើរខ្មែរ (Khmer Traveler)': {
    km: 'អ្នកដំណើរខ្មែរ (Khmer Traveler)',
    en: 'Khmer Traveler',
    zh: '高棉旅行家 (Khmer Traveler)',
  },
  'អ្នកដំណើរខ្មែរ': {
    km: 'អ្នកដំណើរខ្មែរ',
    en: 'Khmer Traveler',
    zh: '高棉旅行家',
  },
  'សុខ គីមលី (ម្ចាស់ហាង)': {
    km: 'សុខ គីមលី (ម្ចាស់ហាង)',
    en: 'Sok Kimly (Shop Owner)',
    zh: 'Sok Kimly (店主)',
  },
  'សុខ គីមលី': {
    km: 'សុខ គីមលី',
    en: 'Sok Kimly',
    zh: 'Sok Kimly (店主)',
  },
  'ក្រុមការងាររដ្ឋបាល (Admin)': {
    km: 'ក្រុមការងាររដ្ឋបាល (Admin)',
    en: 'Admin Team',
    zh: '官方管理团队 (Admin)',
  },
};

const COMMUNITY_POST_CONTENT_MAP: Record<
  string,
  { titleEn: string; titleZh: string; descEn: string; descZh: string }
> = {
  'post-1': {
    titleEn: 'Tasting Fresh Kep Crab Stir-Fried with Green Kampot Pepper by the Sea!',
    titleZh: '在白马海边品尝鲜活贡布青胡椒炒花蟹的绝妙体验！',
    descEn:
      'Arrived in Kep Province today—absolutely delicious! Freshly caught blue swimmer crabs from the sea traps with sweet, tender meat stir-fried with fragrant green Kampot peppercorns. Enjoying this while watching the sunset by the ocean is pure happiness!',
    descZh:
      '今天来到白马省，实在太美味了！刚从海笼捞起的鲜活花蟹肉质清甜，搭配香气浓郁、微辣爽口的贡布青胡椒翻炒，一边品尝美食一边欣赏海边日落，真的无比幸福！',
  },
  'post-2': {
    titleEn: 'Sharing the Authentic Traditional Steamed Fish Amok with Noni Leaves Recipe',
    titleZh: '分享传统正宗诺丽叶高棉鱼阿莫克（Fish Amok）秘制食谱',
    descEn:
      'Hello everyone! Today I am sharing how to steam Fish Amok so the fish stays tender and silky: avoid steaming over overly high heat, and always use thick, freshly pressed first-press coconut cream for the most fragrant aroma. Give it a try!',
    descZh:
      '大家好！今天跟大家分享如何蒸出肉质鲜嫩丝滑的鱼阿莫克：秘诀是火候不要太大，并且一定要使用新鲜浓稠的头道椰浆，这样蒸出来才香气扑鼻。大家快来试试吧！',
  },
};

const COMMUNITY_COMMENT_TEXT_MAP: Record<string, { en: string; zh: string }> = {
  'c-1': {
    en: 'Thank you so much for your support! Next time you visit, our restaurant will offer you a special discount.',
    zh: '非常感谢您的支持与光临！下次再来时，本店将为您提供专属优惠折扣。',
  },
  'c-2': {
    en: 'Beautiful photo! Kampot-Kep crabs are truly #1 in Cambodia.',
    zh: '照片拍得太棒了！贡布与白马的螃蟹绝对是全柬埔寨第一名。',
  },
  'c-3': {
    en: 'Great recipe uncle! I will definitely try cooking this over the weekend!',
    zh: '太棒的食谱了大叔，这个周末我一定要照着做做看！',
  },
};

export function localizeRelativeTimestamp(raw: string, lang: Language): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (lang === 'km') return trimmed;

  const arabic = khmerToArabicNumerals(trimmed);

  if (trimmed === 'អម្បាញ់មិញ' || /^just now$/i.test(trimmed)) {
    return lang === 'zh' ? '刚刚' : 'Just now';
  }

  const hoursMatch = arabic.match(/(\d+)\s*(?:ម៉ោងមុន|hours?\s*ago)/i);
  if (hoursMatch) {
    const n = hoursMatch[1];
    return lang === 'zh' ? `${n}小时前` : `${n} ${Number(n) === 1 ? 'hour' : 'hours'} ago`;
  }

  const minsMatch = arabic.match(/(\d+)\s*(?:នាទីមុន|mins?\s*ago|minutes?\s*ago)/i);
  if (minsMatch) {
    const n = minsMatch[1];
    return lang === 'zh' ? `${n}分钟前` : `${n} ${Number(n) === 1 ? 'min' : 'mins'} ago`;
  }

  const daysMatch = arabic.match(/(\d+)\s*(?:ថ្ងៃមុន|days?\s*ago)/i);
  if (daysMatch) {
    const n = daysMatch[1];
    return lang === 'zh' ? `${n}天前` : `${n} ${Number(n) === 1 ? 'day' : 'days'} ago`;
  }

  return arabic;
}

function translateDynamicKhmerOrEnglishPostText(raw: string, lang: Language): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (lang === 'km') return trimmed;

  // Common Khmer phrases in user-submitted posts/comments
  const khPhraseMap: Array<{ kh: string; en: string; zh: string }> = [
    { kh: 'ឆ្ងាញ់ណាស់', en: 'Very delicious', zh: '非常美味' },
    { kh: 'ឆ្ងាញ់មែនទែន', en: 'Truly delicious', zh: '实在太美味了' },
    { kh: 'អរគុណច្រើន', en: 'Thank you very much', zh: '非常感谢' },
    { kh: 'អរគុណបង', en: 'Thank you', zh: '谢谢您' },
    { kh: 'រូបមន្តល្អណាស់', en: 'Great recipe', zh: '非常棒的食谱' },
    { kh: 'រូបភាពស្រស់ស្អាតណាស់', en: 'Beautiful photo', zh: '照片非常漂亮' },
    { kh: 'ម្ហូបខ្មែរ', en: 'Cambodian food', zh: '高棉美食' },
    { kh: 'អាម៉ុកត្រី', en: 'Fish Amok', zh: '高棉鱼阿莫克' },
    { kh: 'ក្តាមសេះឆាម្រេចខ្ចី', en: 'Kep Crab Stir-Fried with Green Kampot Pepper', zh: '贡布青胡椒炒白马花蟹' },
    { kh: 'បាយសាច់ជ្រូក', en: 'Grilled Pork and Rice', zh: '高棉烤猪肉饭' },
    { kh: 'គុយទាវភ្នំពេញ', en: 'Phnom Penh Noodle Soup', zh: '金边粿条汤' },
    { kh: 'នំបញ្ចុកសម្លខ្មែរ', en: 'Num Banh Chok Khmer Noodles', zh: '高棉鱼汤米粉' },
    { kh: 'កង្កែបបោកអាំង', en: 'Stuffed Grilled Frog', zh: '高棉香茅酿烤青蛙' },
    { kh: 'សម្លកកូរ', en: 'Samlor Korko Soup', zh: '高棉传统什锦蔬菜汤' },
    { kh: 'បុកល្ហុង', en: 'Khmer Green Papaya Salad', zh: '高棉青木瓜沙拉' },
  ];

  let work = trimmed;
  for (const item of khPhraseMap) {
    if (work.includes(item.kh)) {
      work = work.split(item.kh).join(lang === 'zh' ? item.zh : item.en);
    }
  }

  if (lang === 'zh') {
    const dynZh = translateDynamicTextToZh(work);
    if (dynZh && /[\u4E00-\u9FFF]/.test(dynZh)) {
      return dynZh;
    }
  }

  return work;
}

export function getLocalizedComment(comment: CommunityComment, lang: Language) {
  if (lang === 'km') {
    return {
      authorName: comment.authorName,
      text: comment.text,
      createdAt: comment.createdAt,
    };
  }

  const authorObj = COMMUNITY_AUTHOR_MAP[comment.authorName];
  const localizedAuthor = authorObj
    ? authorObj[lang]
    : lang === 'zh'
    ? comment.authorName
        .replace(/\(ម្ចាស់ហាង\)/g, '(店主)')
        .replace(/\(Admin\)/gi, '(管理员)')
    : comment.authorName.replace(/\(ម្ចាស់ហាង\)/g, '(Shop Owner)');

  const exactComment = COMMUNITY_COMMENT_TEXT_MAP[comment.id];
  const localizedText = exactComment
    ? exactComment[lang]
    : translateDynamicKhmerOrEnglishPostText(comment.text, lang);

  return {
    authorName: localizedAuthor,
    text: localizedText,
    createdAt: localizeRelativeTimestamp(comment.createdAt, lang),
  };
}

export function getLocalizedCommunityPost(post: CommunityPost, lang: Language) {
  const catObj = COMMUNITY_CATEGORY_MAP[post.categoryTag];
  const localizedCategory = catObj
    ? catObj[lang]
    : lang === 'zh'
    ? translateDynamicTextToZh(post.categoryTag)
    : post.categoryTag;

  const locObj = post.locationName ? COMMUNITY_LOCATION_MAP[post.locationName] : undefined;
  const localizedLocation = !post.locationName
    ? ''
    : locObj
    ? locObj[lang]
    : lang === 'zh'
    ? CAMBODIA_PROVINCE_ZH_MAP[post.locationName] || translateDynamicTextToZh(post.locationName)
    : post.locationName;

  if (lang === 'km') {
    return {
      authorName: post.authorName,
      title: post.titleKh,
      description: post.descriptionKh,
      categoryTag: localizedCategory,
      locationName: localizedLocation,
      createdAt: post.createdAt,
      comments: (post.comments || []).map((c) => ({
        ...c,
        ...getLocalizedComment(c, 'km'),
      })),
    };
  }

  const authorObj = COMMUNITY_AUTHOR_MAP[post.authorName];
  const localizedAuthor = authorObj
    ? authorObj[lang]
    : lang === 'zh'
    ? post.authorName
        .replace(/\(ម្ចាស់ហាង\)/g, '(店主)')
        .replace(/\(Admin\)/gi, '(管理员)')
    : post.authorName.replace(/\(ម្ចាស់ហាង\)/g, '(Shop Owner)');

  const seedContent = COMMUNITY_POST_CONTENT_MAP[post.id];
  const localizedTitle = seedContent
    ? lang === 'zh'
      ? seedContent.titleZh
      : seedContent.titleEn
    : translateDynamicKhmerOrEnglishPostText(post.titleKh, lang);

  const localizedDescription = seedContent
    ? lang === 'zh'
      ? seedContent.descZh
      : seedContent.descEn
    : translateDynamicKhmerOrEnglishPostText(post.descriptionKh, lang);

  return {
    authorName: localizedAuthor,
    title: localizedTitle,
    description: localizedDescription,
    categoryTag: localizedCategory,
    locationName: localizedLocation,
    createdAt: localizeRelativeTimestamp(post.createdAt, lang),
    comments: (post.comments || []).map((c) => ({
      ...c,
      ...getLocalizedComment(c, lang),
    })),
  };
}

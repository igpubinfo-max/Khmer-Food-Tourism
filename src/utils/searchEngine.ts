/**
 * Unified Relevance Search Engine (Khmer / English / Chinese)
 * -----------------------------------------------------------
 * One shared matching + ranking algorithm used by every search box in the app
 * (Google Maps place search, hotels, restaurants, cafés, destinations, nearby places, foods…).
 *
 * Design goals:
 *  1. Exact name  >  name prefix  >  full phrase in name  >  all words in name  >  fuzzy (typo) match
 *     >  alternative names / categories  >  address  >  description.
 *  2. Understand the query: stop-words ("the", "of"…) are ignored, category words ("hotel", "សណ្ឋាគារ")
 *     are soft hints, province words ("Kampot", "កំពត") are location constraints, and every remaining
 *     distinctive word (e.g. "square") MUST be present (exactly or with a small typo) — so unrelated
 *     businesses that merely share "the" or "hotel" are never returned.
 *  3. Typo tolerance via Damerau-Levenshtein for Latin words and a sliding window for Khmer text.
 *  4. Deterministic ordering (score → caller tie-break → original index) so the same keyword always
 *     yields the same result list.
 */

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

const KHMER_SPELLING_VARIANTS: Array<[RegExp, string]> = [
  [/\u17C1\u17B8/g, '\u17BE'],
  [/\u17C1\u17B6/g, '\u17C4'],
  [/\u17C6\u17BB/g, '\u17BB\u17C6'],
  [/\u17B6\u17C9/g, '\u17C9\u17B6'],
  [/\u17B6\u17CA/g, '\u17CA\u17B6'],
  [/\u17D2\u179A\u17D2([\u1780-\u1799\u179B-\u17A2])/g, '\u17D2$1\u17D2\u179A'],
  [/សម្លរ/g, 'សម្ល'],
  [/ស្ងោ(?!រ)/g, 'ស្ងោរ'],
  [/ស្ងោរជ្រក(?!់)/g, 'ស្ងោរជ្រក់'],
  [/ប្រហើ(?!រ)/g, 'ប្រហើរ'],
  [/ហិរ/g, 'ហឹរ'],
  [/ស្រដែក/g, 'សណ្តែក'],
  [/ណ្ដ/g, 'ណ្ត'],
  [/ក្ដ/g, 'ក្ត'],
  [/ផ្ដ/g, 'ផ្ត'],
  [/ស្ដ/g, 'ស្ត'],
  [/ម្ដ/g, 'ម្ត'],
  [/ប្ដ/g, 'ប្ត'],
  [/ឧត្ដ/g, 'ឧត្ត'],
  [/ឆ្ដ/g, 'ឆ្ត'],
  [/ទ្ដ/g, 'ទ្ត'],
  [/ង្ដ/g, 'ង្ត'],
  [/ន្ដ/g, 'ន្ត'],
  [/អម្ពិល/g, 'អំពិល'],
  [/ប្ញស្សី|ឬស្សី/g, 'ឫស្សី'],
  [/ក្រូចឆ្មារ/g, 'ក្រូចឆ្មា'],
  [/មីសួ(?!រ)/g, 'មីសួរ'],
  [/ស្លឹកញរ/g, 'ស្លឹកញ'],
  [/ស្លឹកតើយ/g, 'ស្លឹកតយ'],
  [/នំបុ័ង/g, 'នំប៉័ង'],
  [/អាមុក|ហហ្មុក/g, 'អាម៉ុក'],
  [/គុយទៀវ/g, 'គុយទាវ'],
  [/បាញ់ឆេវ/g, 'បាញ់ឆែវ'],
  [/បាញ់ចុក|បញ្ចក់/g, 'បញ្ចុក'],
  [/ឡុកឡាក(?!់)/g, 'ឡុកឡាក់'],
  [/ការ៉ី/g, 'ការី'],
  [/ម្ចូរ|ម្ជូ(?!រ)/g, 'ម្ជូរ'],
  [/កកូ(?!រ)/g, 'កកូរ'],
  [/ខ្ទឹះ/g, 'ខ្ទិះ'],
  [/ត្រយ៉ូង/g, 'ត្រយូង'],
  [/កាពិក/g, 'កាពិ'],
  [/លៀស/g, 'លាស'],
  [/ស្រុស/g, 'ស្រុះ'],
  [/ឆ្អឹងជំនី(?!រ)/g, 'ឆ្អឹងជំនីរ'],
  [/ងាំង៉ូវ/g, 'ង៉ាំង៉ូវ'],
  [/សាឡាត់/g, 'សាឡាដ'],
  [/ផាកឡូវ/g, 'ផាក់ឡូវ'],
  [/មុំា|មំា/g, 'ម៉ាំ'],
];

/** Lower-case, strip zero-width chars & Latin accents, unify Khmer spelling variants and punctuation. */
export function normalizeSearchText(input?: string | null): string {
  if (!input) return '';
  let s = String(input).replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '').toLowerCase();
  for (const [rx, rep] of KHMER_SPELLING_VARIANTS) s = s.replace(rx, rep);
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s
    .replace(/['’‘`´]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\p{M}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

const KHMER_RX = /[\u1780-\u17FF]/;
const CJK_RX = /[\u3400-\u9FFF]/;
const isNonLatinScript = (s: string) => KHMER_RX.test(s) || CJK_RX.test(s);

// ---------------------------------------------------------------------------
// Query vocabulary
// ---------------------------------------------------------------------------

export const SEARCH_STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'at', 'in', 'on', 'by', 'for', 'to', 'with', 'from', 'near', 'nearby',
  'me', 'my', 'around', 'best', 'top', 'le', 'la', 'les', 'de', 'du', 'des', 'el', 'il',
  'please', 'help', 'find', 'search', 'recommend', 'recommended', 'suggestion', 'suggest',
  'where', 'what', 'which', 'can', 'could', 'should', 'would', 'want', 'looking',
  'eat', 'drink', 'visit', 'stay', 'good', 'nice', 'great', 'delicious', 'yummy', 'tasty',
  'famous', 'popular', 'trending', 'viral', 'beautiful', 'pretty', 'cheap', 'affordable',
  'place', 'places', 'spot', 'spots', 'cambodia', 'cambodian', 'khmer', 'i', 'we', 'is', 'are',
  'ដឹ', 'ឌឺ', 'និង', 'នៅ', 'ក្នុង', 'ជិត', 'ជិតខ្ញុំ', 'របស់', 'ដ៏', 'ល្អ', 'ល្បី', 'ស្អាត', 'ឆ្ងាញ់',
  '的', '在', '和', '附近',
]);

/** Cross-script brand/word transliterations so Khmer queries match English-only names and vice-versa. */
const BRAND_TRANSLITERATION_GROUPS: string[][] = [
  ['square', 'ស្វែរ', 'សឃ្វែរ'],
  ['manna', 'ម៉ាន់ណា', '玛娜'],
  ['malis', 'ម៉ាលីស', 'ម្លិះ', '茉莉'],
  ['romdeng', 'រំដេង', '高良姜'],
  ['kravanh', 'ក្រវាញ', '豆蔻'],
  ['chumnor', 'jomnor', 'ជំនោរ', '微风'],
  ['sovanna', 'សុវណ្ណា', '苏万纳'],
  ['brown', 'ប្រោន'],
  ['brooklyn', 'ប្រ៊ុកលីន', '布鲁克林'],
  ['jaan', 'ចានបាយ'],
  ['kinyei', 'គិនយី'],
  ['nary', 'ណារី', '娜丽'],
  ['amber', 'អេមប៊ឺ'],
  ['bamboo', 'ឫស្សី', 'បែមប៊ូ'],
  ['privilege', 'ព្រីវីលេជ'],
  ['senses', 'សេនស៍'],
  ['sailing', 'សេលីង'],
  ['palace', 'ផាឡេស', 'វាំង'],
  ['bridge', 'ប្រ៊ីជ', 'ស្ពាន'],
  ['paradise', 'ភែរើដាយ', 'ប៉ារ៉ាដាយ'],
  ['rainforest', 'រេនហ្វរេស'],
  ['cinema', 'រោងកុន', 'ស៊ីនេម៉ា'],
  // Cambodian signature dishes & culinary terms (Khmer / English / Romanized / Chinese)
  ['amok', 'ah mok', 'homok', 'fish amok', 'អាម៉ុក', 'អាម៉ុកត្រី', '阿莫克', '阿莫克鱼', '高棉阿莫克'],
  ['lok lak', 'loklak', 'luc lac', 'beef lok lak', 'ឡុកឡាក់', 'ឡុកឡាក់សាច់គោ', '禄叻', '禄拉克', '摇滚牛肉', '牛肉粒'],
  ['kuy teav', 'kuyteav', 'koay teow', 'noodle soup', 'គុយទាវ', 'គុយទាវភ្នំពេញ', '粿条', '金边粿条', '河粉', '汤粉'],
  ['num banh chok', 'nom banh chok', 'banh chok', 'khmer noodles', 'rice vermicelli', 'នំបញ្ចុក', '高棉米粉', '高棉米线', '鱼汤米线', '咖喱米线'],
  ['samlor korko', 'somlor korko', 'korko', 'សម្លកកូរ', 'កកូរ', '百蔬浓汤', '什锦蔬菜浓汤'],
  ['samlor machu', 'somlor machu', 'machu', 'sour soup', 'សម្លម្ជូរ', 'ម្ជូរ', 'ម្ជូរគ្រឿង', 'ម្ជូរព្រៃ', 'ស្ងោរជ្រក់', '酸汤', '高棉酸汤', '香茅酸汤'],
  ['samlor proher', 'somlor proher', 'proher', 'praher', 'សម្លប្រហើរ', 'ប្រហើរ', '草本浓汤', '草本养生汤', '草本汤'],
  ['samlor kari', 'somlor kari', 'khmer curry', 'curry', 'saraman', 'សម្លការី', 'ការី', 'សារ៉ាម៉ាន់', 'ណាំយ៉ា', '咖喱', '红咖喱', '高棉咖喱', '萨拉曼咖喱'],
  ['ngam ngov', 'ngam ngouv', 'pickled lime', 'ង៉ាំង៉ូវ', 'ស្ងោរង៉ាំង៉ូវ', '咸柠檬汤', '酸柑鸡汤', '酸柑'],
  ['prahok', 'prohok', 'prahok ktis', 'ប្រហុក', 'ប្រហុកខ្ទិះ', 'ប្រហុកអាំង', 'ប្រហុកកប់', 'ទឹកប្រហុក', '波罗福', '鱼酱', '高棉鱼酱', '发酵鱼酱', '臭鱼酱'],
  ['teuk kroeung', 'tuk kreung', 'kroeung', 'ទឹកគ្រឿង', 'គ្រឿង', '香草鱼酱', '鱼肉蘸酱', '香茅'],
  ['bai sach chrouk', 'bay sach chrouk', 'pork rice', 'grilled pork rice', 'បាយសាច់ជ្រូក', '猪肉饭', '烤猪肉饭', '炭烤猪肉'],
  ['bai cha', 'bay cha', 'fried rice', 'បាយឆា', '炒饭', '高棉炒饭', '蛋炒饭'],
  ['borbor', 'bobor', 'porridge', 'congee', 'បបរ', 'បបរគ្រឿង', 'បបរស', 'បបរត្រី', 'បបរមាន់', '粥', '米粥', '肉粥', '鱼粥', '鸡粥'],
  ['lort cha', 'lot cha', 'pin noodles', 'លតឆា', '银针粉', '炒银针粉'],
  ['mee cha', 'mi cha', 'fried noodles', 'មីឆា', 'គុយទាវឆា', '炒面', '炒粉', '炒粿条'],
  ['mee kola', 'mi kola', 'មីកូឡា', '歌拉面', '歌拉米粉', '哥拉族'],
  ['mi suor', 'mee suor', 'glass noodles', 'មីសួរ', '粉丝', '冬粉'],
  ['banh chao', 'banh xeo', 'khmer crepe', 'បាញ់ឆែវ', '高棉煎饼', '姜黄煎饼', '脆煎饼', '煎饼'],
  ['num krok', 'nom krok', 'coconut pancakes', 'នំគ្រក់', '椰浆小米饼', '小米饼', '小煎饼'],
  ['kralan', 'krolan', 'bamboo sticky rice', 'ក្រឡាន', '竹筒饭', '竹筒糯米饭', '竹筒香糯米饭'],
  ['num ansom', 'nom ansom', 'ansom', 'អន្សម', 'នំអន្សម', 'អន្សមជ្រូក', 'អន្សមចេក', '高棉粽', '肉粽', '香蕉粽', '长筒粽', '粽'],
  ['sangkhya', 'sankhya', 'pumpkin custard', 'សង់ខ្យា', 'សង់ខ្យាល្ពៅ', '南瓜布丁', '南瓜炖蛋', '蒸布丁'],
  ['chek ktis', 'banana coconut', 'ចេកខ្ទិះ', '椰浆西米露炖芭蕉', '椰浆炖香蕉', '椰奶香蕉'],
  ['bok lhong', 'bok lahong', 'papaya salad', 'បុកល្ហុង', '木瓜沙拉', '青木瓜沙拉'],
  ['pleah', 'pleah sach ko', 'beef ceviche', 'lime cured beef', 'ភ្លា', 'ភ្លាសាច់គោ', '生拌牛肉', '酸柑生拌牛肉'],
  ['nham', 'nhoam', 'khmer salad', 'ញាំ', 'សាឡាដ', '沙拉', '凉拌'],
  ['cha kdao', 'holy basil', 'ឆាក្តៅ', 'ឆាម្រះព្រៅ', 'ឆាគ្រឿង', '九层塔', '辣炒'],
  ['khor', 'khor ko', 'braised pork', 'braised beef', 'ខសាច់ជ្រូក', 'ខជើងជ្រូក', 'ខគោ', 'ផាក់ឡូវ', '红烧', '红烧猪蹄', '红烧牛腩'],
  ['pong tea kon', 'balut', 'ពងទាកូន', '毛蛋', '蒸毛蛋', '毛鸭蛋'],
  ['num pang', 'nom pang', 'baguette', 'sandwich', 'នំប៉័ងប៉ាតេ', 'នំប៉័ង', '法棍', '三明治'],
  ['beef', 'សាច់គោ', 'គោ', 'ងៀតគោ', 'គោងៀត', 'ពោះគោ', '牛肉', '牛腩', '牛肚', '牛肉干'],
  ['pork', 'សាច់ជ្រូក', 'ជ្រូក', 'ឆ្អឹងជំនីរ', 'សាច់ក្រក', '猪肉', '五花肉', '排骨', '猪蹄', '香肠', '腊肠'],
  ['chicken', 'សាច់មាន់', 'មាន់', 'មាន់ដុត', 'មាន់អាំង', '鸡肉', '土鸡', '烤鸡', '走地鸡'],
  ['duck', 'សាច់ទា', 'ទា', 'ទាអាំង', 'ទាដុត', '鸭', '鸭肉', '烤鸭'],
  ['fish', 'ត្រី', 'ត្រីរ៉ស់', 'ត្រីអាំង', 'ត្រីដុត', 'ត្រីបំពង', 'ត្រីងៀត', 'ត្រីឆ្អើរ', '鱼', '鲜鱼', '黑鱼', '鲶鱼', '烤鱼', '炸鱼', '鱼干', '烟熏鱼'],
  ['crab', 'ក្តាម', 'ក្តាមសេះ', 'ក្តាមស្រែ', 'ក្តាមឆាម្រេច', '螃蟹', '蟹', '花蟹', '蓝蟹', '田蟹', '胡椒蟹'],
  ['shrimp', 'prawn', 'prawns', 'បង្គា', 'បង្កង', 'កំពិស', '虾', '大虾', '河虾', '海虾', '大头虾', '虾米'],
  ['squid', 'មឹក', 'មឹកអាំង', 'ឆាមឹក', '鱿鱼', '烤鱿鱼', '墨鱼'],
  ['clam', 'cockle', 'oyster', 'snail', 'ងាវ', 'លាស', 'ខ្យង', 'គ្រំ', 'អយស្ទ័រ', '蛤蜊', '河蚬', '田螺', '生蚝'],
  ['frog', 'កង្កែប', 'កង្កែបបោក', 'កង្កែបអាំង', '田鸡', '烤田鸡'],
  ['eel', 'អន្ទង់', '鳝鱼', '田鳝'],
  ['seafood', 'គ្រឿងសមុទ្រ', '海鲜', '河鲜'],
  ['vegetarian', 'vegan', 'ម្ហូបបួស', 'បួស', 'តៅហ៊ូ', 'tofu', '素食', '豆腐', 'បន្លែ', '蔬菜'],
  ['dessert', 'sweet', 'បង្អែម', '甜品', '甜点', '糖水', '糕点'],
  ['drink', 'beverage', 'smoothie', 'ភេសជ្ជៈ', 'ទឹកក្រឡុក', 'ទឹកអំពៅ', 'ទឹកដូង', 'ទឹកត្នោត', '饮品', '饮料', '冰沙', '甘蔗汁', '椰子', '青椰'],
  ['grilled', 'bbq', 'roast', 'អាំង', 'ដុត', 'សាច់អាំង', '烧烤', '炭烤', '烤肉', '烤'],
  ['soup', 'broth', 'សម្ល', 'ស្ងោរ', 'ស៊ុប', '汤', '清汤', '浓汤'],
  ['stirfry', 'stir fry', 'ឆា', 'លីង', '炒', '小炒', '热炒', '爆炒'],
  ['spicy', 'chili', 'ហឹរ', 'ម្ទេស', '辣', '香辣', '酸辣'],
];

const BRAND_TRANSLIT_MAP = new Map<string, string[]>();
for (const group of BRAND_TRANSLITERATION_GROUPS) {
  const normSet = new Set<string>();
  for (const rawW of group) {
    const nw = normalizeSearchText(rawW);
    if (nw) {
      normSet.add(nw);
      if (nw.includes(' ')) {
        normSet.add(nw.replace(/\s+/g, ''));
      }
    }
  }
  const normGroup = Array.from(normSet);
  for (const w of normGroup) {
    const existing = BRAND_TRANSLIT_MAP.get(w) || [];
    const merged = Array.from(new Set([...existing, ...normGroup.filter((other) => other !== w)]));
    BRAND_TRANSLIT_MAP.set(w, merged);
  }
}

/** Returns normalized multilingual synonyms/transliterations for a word or phrase. */
const culinarySynonymCache = new Map<string, string[]>();

export function getCulinarySynonyms(term: string): string[] {
  if (!term) return [];
  const cached = culinarySynonymCache.get(term);
  if (cached) return cached;
  const norm = normalizeSearchText(term);
  if (!norm) {
    culinarySynonymCache.set(term, []);
    return [];
  }
  const direct = BRAND_TRANSLIT_MAP.get(norm) || [];
  const compact = norm.includes(' ') ? BRAND_TRANSLIT_MAP.get(norm.replace(/\s+/g, '')) || [] : [];
  const res = direct.length > 0 || compact.length > 0 ? Array.from(new Set([...direct, ...compact])) : [];
  if (culinarySynonymCache.size > 2000) culinarySynonymCache.clear();
  culinarySynonymCache.set(term, res);
  return res;
}

/** Category / business-type words → soft hints (never sufficient on their own when a name is typed). */
const CATEGORY_SYNONYM_GROUPS: string[][] = [
  ['hotel', 'hotels', 'lodging', 'accommodation', 'សណ្ឋាគារ', '酒店', '宾馆', '饭店'],
  ['resort', 'resorts', 'resort_hotel', 'រីសត', 'រមណីយដ្ឋាន', '度假村'],
  ['guesthouse', 'guesthouses', 'guest', 'hostel', 'hostels', 'inn', 'lodge', 'homestay', 'bungalow', 'bungalows', 'ផ្ទះសំណាក់', 'បឹងហ្គាឡូ', '客栈', '民宿', '旅馆'],
  ['villa', 'villas', 'boutique', 'suites', 'suite', 'residence', 'apartment', 'apartments', 'វីឡា', '别墅'],
  ['restaurant', 'restaurants', 'eatery', 'dining', 'bistro', 'kitchen', 'food', 'ភោជនីយដ្ឋាន', 'អាហារដ្ឋាន', 'ហាងអាហារ', 'ហាងបាយ', 'ផ្ទះបាយ', '餐厅', '餐馆', '美食'],
  ['cafe', 'cafes', 'coffee', 'coffeeshop', 'coffee_shop', 'kafe', 'កាហ្វេ', 'ហាងកាហ្វេ', '咖啡', '咖啡馆', '咖啡厅', '咖啡店'],
  ['bakery', 'bakeries', 'cake', 'bread', 'នំប៉័ង', 'ហាងនំ', '面包', '蛋糕'],
  ['bar', 'pub', 'lounge', 'club', 'បារ', '酒吧'],
  ['spa', 'massage', 'ម៉ាស្សា', '按摩'],
  ['market', 'mall', 'plaza', 'center', 'centre', 'ផ្សារ', 'ផ្សារទំនើប', '市场', '商场'],
  ['temple', 'pagoda', 'wat', 'ប្រាសាទ', 'វត្ត', '寺庙', '寺'],
  ['waterfall', 'ទឹកធ្លាក់', '瀑布'],
  ['beach', 'island', 'koh', 'ឆ្នេរ', 'កោះ', '海滩', '岛'],
  ['museum', 'សារមន្ទីរ', '博物馆'],
  ['park', 'garden', 'ឧទ្យាន', 'សួន', '公园'],
  ['seafood', 'crab', 'shrimp', 'prawn', 'គ្រឿងសមុទ្រ', 'ក្តាម', 'បង្គា', '海鲜', '螃蟹'],
  ['bbq', 'grill', 'grilled', 'buffet', 'hotpot', 'សាច់អាំង', 'ប៊ូហ្វេ', 'ស៊ុប', '烧烤', '火锅', '自助餐'],
  ['boba', 'bubble', 'matcha', 'milktea', 'តែគុជ', 'ម៉ាត់ឆា', 'មិចឆា', 'តែទឹកដោះគោ', '奶茶', '珍珠奶茶', '抹茶'],
  ['shop', 'store', 'ហាង', '商店'],
];

const CATEGORY_WORD_TO_GROUP = new Map<string, number>();
CATEGORY_SYNONYM_GROUPS.forEach((g, i) => g.forEach((w) => CATEGORY_WORD_TO_GROUP.set(normalizeSearchText(w), i)));

/** Province / city words → canonical province key (Khmer short name). */
const PROVINCE_ALIASES: Array<[string, string[]]> = [
  ['ភ្នំពេញ', ['phnom penh', 'phnompenh', 'ភ្នំពេញ', '金边']],
  ['សៀមរាប', ['siem reap', 'siemreap', 'សៀមរាប', '暹粒']],
  ['កំពត', ['kampot', 'កំពត', '贡布']],
  ['កែប', ['kep', 'kaeb', 'កែប', '白马']],
  ['បាត់ដំបង', ['battambang', 'បាត់ដំបង', '马德望']],
  ['ព្រះសីហនុ', ['sihanoukville', 'preah sihanouk', 'sihanouk', 'kampong som', 'ព្រះសីហនុ', 'កំពង់សោម', '西哈努克']],
  ['កំពង់ចាម', ['kampong cham', 'កំពង់ចាម', '磅湛']],
  ['កំពង់ស្ពឺ', ['kampong speu', 'កំពង់ស្ពឺ', '磅士卑']],
  ['កំពង់ធំ', ['kampong thom', 'កំពង់ធំ', '磅同']],
  ['កំពង់ឆ្នាំង', ['kampong chhnang', 'កំពង់ឆ្នាំង', '磅清扬']],
  ['កណ្តាល', ['kandal', 'កណ្តាល', '干丹']],
  ['តាកែវ', ['takeo', 'តាកែវ', '茶胶']],
  ['ព្រៃវែង', ['prey veng', 'ព្រៃវែង', '波罗勉']],
  ['ស្វាយរៀង', ['svay rieng', 'ស្វាយរៀង', '柴桢']],
  ['ពោធិ៍សាត់', ['pursat', 'ពោធិ៍សាត់', '菩萨']],
  ['កោះកុង', ['koh kong', 'កោះកុង', '戈公']],
  ['មណ្ឌលគិរី', ['mondulkiri', 'mondul kiri', 'មណ្ឌលគិរី', '蒙多基里']],
  ['រតនគិរី', ['ratanakiri', 'rattanakiri', 'រតនគិរី', '腊塔纳基里']],
  ['ក្រចេះ', ['kratie', 'ក្រចេះ', '桔井']],
  ['ស្ទឹងត្រែង', ['stung treng', 'ស្ទឹងត្រែង', '上丁']],
  ['ព្រះវិហារ', ['preah vihear', 'ព្រះវិហារ', '柏威夏']],
  ['ឧត្តរមានជ័យ', ['oddar meanchey', 'ឧត្តរមានជ័យ', '奥多棉吉']],
  ['បន្ទាយមានជ័យ', ['banteay meanchey', 'បន្ទាយមានជ័យ', '班迭棉吉']],
  ['ប៉ៃលិន', ['pailin', 'ប៉ៃលិន', '拜林']],
  ['ត្បូងឃ្មុំ', ['tbong khmum', 'tboung khmum', 'ត្បូងឃ្មុំ', '特本克蒙']],
];

interface ProvinceAliasEntry {
  key: string;
  alias: string;
}
const PROVINCE_ALIAS_LIST: ProvinceAliasEntry[] = PROVINCE_ALIASES.flatMap(([key, aliases]) =>
  aliases.map((a) => ({ key, alias: normalizeSearchText(a) }))
).sort((a, b) => b.alias.length - a.alias.length);

const KHMER_ADMIN_WORDS = ['រាជធានី', 'ខេត្ត', 'ក្រុង', 'ស្រុក', 'ខណ្ឌ', 'សង្កាត់', 'ឃុំ', 'ភូមិ'];

const NON_LATIN_CONVERSATIONAL_FILLERS = [
  'សូមជួយណែនាំ', 'សូមជួយរក', 'ជួយណែនាំ', 'ជួយរក', 'ណែនាំ',
  'ចង់ទៅលេង', 'ចង់ស្នាក់នៅ', 'ចង់ញ៉ាំ', 'ចង់ញាំ', 'ចង់ផឹក', 'ចង់ទៅ', 'ចង់រក',
  'មានកន្លែងណា', 'កន្លែងដើរលេង', 'កន្លែងណា', 'ហាងណា', 'តើមាន', 'នៅឯណា', 'ឯណា',
  'ស្វែងរក', 'រកមើល', 'ដែលឆ្ងាញ់', 'ឆ្ងាញ់ៗ', 'ឆ្ងាញ់', 'ស្អាតៗ', 'ស្អាត',
  'ពេញនិយម', 'ល្បីៗ', 'តម្លៃសមរម្យ', 'ថោកៗ', 'សម្រាប់យុវវ័យ', 'យុវវ័យ',
  'នៅជិតខ្ញុំ', 'ជិតខ្ញុំ', 'ក្នុងខេត្ត', 'នៅខេត្ត', 'នៅក្រុង', 'នៅម្ដុំ', 'នៅម្តុំ', 'ម្តុំ',
  '请帮我找', '帮我找', '推荐一下', '求推荐', '推荐', '想吃', '想喝', '想去', '想住',
  '哪里有', '哪家', '好吃的', '好喝的', '好玩的', '好看的', '好吃', '好喝', '好玩', '著名', '热门', '网红',
].map((w) => normalizeSearchText(w)).filter(Boolean).sort((a, b) => b.length - a.length);

const NON_LATIN_GENERIC_WORDS = CATEGORY_SYNONYM_GROUPS.flat()
  .filter((w) => isNonLatinScript(w))
  .map((w) => normalizeSearchText(w))
  .sort((a, b) => b.length - a.length);

/** Single Latin words that belong to province names (excluded from name-coverage calculations). */
const PROVINCE_LATIN_WORDS = new Set(
  PROVINCE_ALIASES.flatMap(([, aliases]) => aliases)
    .filter((a) => !isNonLatinScript(a))
    .flatMap((a) => normalizeSearchText(a).split(' '))
);

/** Find every canonical province key mentioned in a (location) text. */
export function detectProvinceKeys(text: string): string[] {
  const norm = ` ${normalizeSearchText(text)} `;
  const compact = norm.replace(/\s+/g, '');
  const found = new Set<string>();
  for (const { key, alias } of PROVINCE_ALIAS_LIST) {
    if (alias.length < 3 && !isNonLatinScript(alias)) continue; // skip "pp" etc. in free text
    if (isNonLatinScript(alias) ? compact.includes(alias.replace(/\s+/g, '')) : norm.includes(` ${alias} `)) {
      found.add(key);
    }
  }
  return Array.from(found);
}

// ---------------------------------------------------------------------------
// Query analysis
// ---------------------------------------------------------------------------

export interface AnalyzedSearchQuery {
  raw: string;
  normalized: string;
  /** Normalised query without stop-words (used for phrase matching). */
  phrase: string;
  phraseCompact: string;
  /** Words that MUST match (business / dish / place names). */
  distinctive: string[];
  /** Category hints (hotel, cafe…) — soft. Group ids of CATEGORY_SYNONYM_GROUPS. */
  categoryGroups: number[];
  categoryWords: string[];
  /** Province keys mentioned in the query. */
  provinces: string[];
  isEmpty: boolean;
}

const analysisCache = new Map<string, AnalyzedSearchQuery>();

export function analyzeSearchQuery(rawQuery: string): AnalyzedSearchQuery {
  const raw = String(rawQuery || '');
  const cached = analysisCache.get(raw);
  if (cached) return cached;

  const normalized = normalizeSearchText(raw);
  let working = ` ${normalized} `;
  const provinces = new Set<string>();

  // 1. Province phrases (longest first, so "kampong cham" wins over "cham")
  for (const { key, alias } of PROVINCE_ALIAS_LIST) {
    if (isNonLatinScript(alias)) {
      if (working.includes(alias)) {
        provinces.add(key);
        working = working.split(alias).join(' ');
      }
    } else if (working.includes(` ${alias} `)) {
      provinces.add(key);
      working = working.split(` ${alias} `).join(' ');
    }
  }

  const distinctive: string[] = [];
  const categoryGroups = new Set<number>();
  const categoryWords: string[] = [];

  for (let tok of working.split(/\s+/).filter(Boolean)) {
    if (SEARCH_STOPWORDS.has(tok)) continue;

    if (isNonLatinScript(tok)) {
      // Khmer / Chinese are written without spaces — peel off conversational fillers, admin, category and edge stop words.
      for (const f of NON_LATIN_CONVERSATIONAL_FILLERS) {
        if (tok.includes(f)) tok = tok.split(f).join(' ');
      }
      for (const w of KHMER_ADMIN_WORDS) tok = tok.split(w).join(' ');
      for (const w of NON_LATIN_GENERIC_WORDS) {
        if (tok.includes(w)) {
          const g = CATEGORY_WORD_TO_GROUP.get(w);
          if (g !== undefined) categoryGroups.add(g);
          categoryWords.push(w);
          tok = tok.split(w).join(' ');
        }
      }
      for (let piece of tok.split(/\s+/)) {
        piece = piece.replace(/^(?:នៅ|ក្នុង|ជិត|និង|ដ៏|របស់|的|在)+|(?:នៅ|ក្នុង|ជិត|និង|ដ៏|របស់|ហើយ|ទេ|ដែរ|មែនទេ|的|吗|呢)+$/g, '').trim();
        if ((piece.length >= 2 || CJK_RX.test(piece)) && !SEARCH_STOPWORDS.has(piece)) distinctive.push(piece);
      }
      continue;
    }

    const g = CATEGORY_WORD_TO_GROUP.get(tok);
    if (g !== undefined) {
      categoryGroups.add(g);
      categoryWords.push(tok);
      continue;
    }
    // Single Latin letters / pure numbers of 1 char add noise
    if (tok.length < 2 && !/\d/.test(tok)) continue;
    distinctive.push(tok);
  }

  const phrase = normalized
    .split(' ')
    .filter((t) => t && !SEARCH_STOPWORDS.has(t))
    .join(' ');

  const result: AnalyzedSearchQuery = {
    raw,
    normalized,
    phrase,
    phraseCompact: phrase.replace(/\s+/g, ''),
    distinctive: Array.from(new Set(distinctive)),
    categoryGroups: Array.from(categoryGroups),
    categoryWords: Array.from(new Set(categoryWords)),
    provinces: Array.from(provinces),
    isEmpty: !normalized,
  };
  if (analysisCache.size > 400) analysisCache.clear();
  analysisCache.set(raw, result);
  return result;
}

// ---------------------------------------------------------------------------
// String distance helpers
// ---------------------------------------------------------------------------

/** Optimal-string-alignment Damerau-Levenshtein distance with early exit above `maxDist`. */
export function damerauLevenshtein(a: string, b: string, maxDist = 3): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;
  if (!la) return lb;
  if (!lb) return la;
  let prevPrev = new Array<number>(lb + 1).fill(0);
  let prev = Array.from({ length: lb + 1 }, (_, j) => j);
  let cur = new Array<number>(lb + 1).fill(0);
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prevPrev[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > maxDist) return maxDist + 1;
    [prevPrev, prev, cur] = [prev, cur, prevPrev];
  }
  return prev[lb];
}

function allowedTypos(len: number): number {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  return 2;
}

/** Khmer coeng-safe substring check (prevents "មី" matching inside "ថ្មី"). */
function khmerSafeIncludes(hay: string, needle: string): boolean {
  let idx = hay.indexOf(needle);
  while (idx !== -1) {
    if (idx === 0 || hay.charCodeAt(idx - 1) !== 0x17d2) return true;
    idx = hay.indexOf(needle, idx + 1);
  }
  return false;
}

interface PreparedField {
  norm: string;
  compact: string;
  tokens: string[];
}

function prepareField(text: string): PreparedField {
  const norm = normalizeSearchText(text);
  return {
    norm,
    compact: norm.replace(/\s+/g, ''),
    tokens: norm.split(' ').filter(Boolean),
  };
}

/**
 * Quality (0–1) of the best match of a single query word inside a prepared field.
 * 1.0 exact word · 0.9 Khmer/CJK substring · 0.85 word prefix · 0.75 compact substring
 * · 0.55–0.7 typo match · 0 no match.
 */
function matchTokenInFieldDirect(tok: string, f: PreparedField, allowFuzzy: boolean): number {
  if (!tok || !f.norm) return 0;
  if (tok.includes(' ')) {
    const compactTok = tok.replace(/\s+/g, '');
    if (f.norm.includes(tok)) return 0.95;
    if (compactTok.length >= 3 && f.compact.includes(compactTok)) return 0.9;
    const parts = tok.split(' ').filter((p) => p.length >= 2);
    if (parts.length > 1 && parts.every((p) => f.norm.includes(p))) return 0.86;
    return 0;
  }
  if (isNonLatinScript(tok)) {
    if (khmerSafeIncludes(f.compact, tok)) return f.tokens.includes(tok) ? 1 : 0.9;
    // CJK compound query support (e.g. "阿莫克鱼" matching "高棉阿莫克蒸鱼", "牛肉酸汤" matching "高棉香茅酸牛肉汤")
    if (CJK_RX.test(tok) && tok.length >= 2 && tok.length <= 8) {
      const chars = Array.from(tok).filter((ch) => CJK_RX.test(ch));
      if (chars.length >= 2 && chars.every((ch) => f.compact.includes(ch))) {
        return 0.85;
      }
    }
    if (allowFuzzy && KHMER_RX.test(tok) && tok.length >= 4 && f.compact.length <= 48 && f.compact.includes(tok[0])) {
      const maxD = tok.length >= 8 ? 2 : 1;
      for (let w = tok.length - 1; w <= tok.length + 1; w++) {
        for (let i = 0; i + w <= f.compact.length; i++) {
          if (damerauLevenshtein(tok, f.compact.slice(i, i + w), maxD) <= maxD) return 0.65;
        }
      }
    }
    return 0;
  }

  let best = 0;
  for (const t of f.tokens) {
    if (t === tok) return 1;
    if (tok.length >= 3 && t.startsWith(tok)) best = Math.max(best, 0.85);
    else if (tok.length === 2 && t.startsWith(tok)) best = Math.max(best, 0.65);
    else if (tok.length >= 3 && t.includes(tok)) best = Math.max(best, 0.78);
  }
  if (best >= 0.85) return best;
  if (tok.length >= 4 && f.compact.includes(tok)) best = Math.max(best, 0.75);
  if (best > 0 || !allowFuzzy) return best;

  const maxD = allowedTypos(tok.length);
  if (maxD === 0) return 0;
  for (const t of f.tokens) {
    if (Math.abs(t.length - tok.length) <= maxD) {
      const d = damerauLevenshtein(tok, t, maxD);
      if (d <= maxD) best = Math.max(best, d === 1 ? 0.7 : 0.58);
    }
    // Partially typed word with a typo, e.g. "sqaur" → "square"
    if (t.length > tok.length + 1 && tok.length >= 4) {
      const d = damerauLevenshtein(tok, t.slice(0, tok.length), 1);
      if (d <= 1) best = Math.max(best, 0.55);
    }
  }
  return best;
}

function matchTokenInField(tok: string, f: PreparedField, allowFuzzy: boolean): number {
  const direct = matchTokenInFieldDirect(tok, f, allowFuzzy);
  if (direct >= 0.85) return direct;
  const translits = BRAND_TRANSLIT_MAP.get(tok);
  if (!translits || translits.length === 0) return direct;
  let best = direct;
  for (const alt of translits) {
    best = Math.max(best, matchTokenInFieldDirect(alt, f, false) * 0.95);
  }
  return best;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Quality (0–1) of a single word matched inside free text (exact, prefix, Khmer-safe substring or typo). */
export function matchWordInText(word: string, text: string, allowFuzzy = true): number {
  const w = normalizeSearchText(word);
  if (!w) return 0;
  // Multi-word aliases ("jaan bai") are matched against the space-less text ("jaanbai").
  return matchTokenInField(w.replace(/\s+/g, ''), prepareField(text), allowFuzzy);
}

export interface SearchableFields {
  /** Primary + alternative names (Khmer, English, Chinese, aliases). */
  names: Array<string | undefined | null>;
  /** Category / type labels (e.g. "hotel", "lodging", "ភោជនីយដ្ឋាន"). */
  categories?: Array<string | undefined | null>;
  /** Province, city, address. */
  locations?: Array<string | undefined | null>;
  /** Description, signature dishes, menu, tags… (exact matches only, no typo tolerance). */
  texts?: Array<string | undefined | null>;
}

export interface SearchScoreDetail {
  score: number;
  matchedInName: boolean;
  exactName: boolean;
  provinceMismatch: boolean;
}

const joinFields = (arr?: Array<string | undefined | null>) => (arr || []).filter(Boolean).join(' • ');

/**
 * Score one record against an analysed query. Returns 0 when the record must NOT be shown.
 * Typical scale: 1000 exact name · 900 prefix · 850 phrase · 550-750 all words in name
 * · 300-450 category/location-only queries · 200-260 description-only matches.
 */
export function scoreSearchRecord(q: AnalyzedSearchQuery, fields: SearchableFields): SearchScoreDetail {
  const none: SearchScoreDetail = { score: 0, matchedInName: false, exactName: false, provinceMismatch: false };
  if (q.isEmpty) return { ...none, score: 1 };

  const nameFields = fields.names.filter(Boolean).map((n) => prepareField(String(n)));
  const catField = prepareField(joinFields(fields.categories));
  const locField = prepareField(joinFields(fields.locations));
  const textField = prepareField(joinFields(fields.texts));
  const allNamesField = prepareField(joinFields(fields.names));

  // --- Province constraint -------------------------------------------------
  let provinceBonus = 0;
  let provinceMismatch = false;
  if (q.provinces.length > 0) {
    const recProv = detectProvinceKeys(`${joinFields(fields.locations)} ${joinFields(fields.names)}`);
    if (recProv.some((p) => q.provinces.includes(p))) provinceBonus = 120;
    else if (recProv.length > 0) provinceMismatch = true;
  }

  // --- Phrase matches on names ----------------------------------------------
  let phraseScore = 0;
  let exactName = false;
  if (q.phrase.length >= 1) {
    for (const nf of nameFields) {
      const nameNoStop = nf.tokens.filter((t) => !SEARCH_STOPWORDS.has(t)).join(' ');
      if (nf.norm === q.normalized || nameNoStop === q.phrase) {
        phraseScore = Math.max(phraseScore, 1000);
        exactName = true;
      } else if (nameNoStop.startsWith(q.phrase) || nf.norm.startsWith(q.normalized)) {
        phraseScore = Math.max(phraseScore, 900);
      } else if (` ${nameNoStop} `.includes(` ${q.phrase} `)) {
        phraseScore = Math.max(phraseScore, 860);
      } else if (
        (isNonLatinScript(q.phraseCompact) && q.phraseCompact.length >= 2 && khmerSafeIncludes(nf.compact, q.phraseCompact)) ||
        (!isNonLatinScript(q.phraseCompact) && q.phraseCompact.length >= 3 && nf.compact.includes(q.phraseCompact))
      ) {
        phraseScore = Math.max(phraseScore, 820);
      }
    }
  }

  // --- Distinctive words (ALL required) --------------------------------------
  let tokenScore = 0;
  let matchedInName = phraseScore > 0;
  if (q.distinctive.length > 0) {
    let nameQualitySum = 0;
    let allInName = true;
    let otherQualitySum = 0;
    for (const tok of q.distinctive) {
      let best = 0;
      for (const nf of nameFields) best = Math.max(best, matchTokenInField(tok, nf, true));
      if (best === 0) best = matchTokenInField(tok, allNamesField, true);
      if (best > 0) {
        nameQualitySum += best;
        continue;
      }
      allInName = false;
      const cat = matchTokenInField(tok, catField, true);
      const loc = cat > 0 ? 0 : matchTokenInField(tok, locField, false);
      // Description-only matches are allowed for plain keyword searches ("pool", "sunset") but never when
      // the query looks like a specific business name with a category / province ("The Square Kampot Hotel").
      const allowTextOnly = q.categoryGroups.length === 0 && q.provinces.length === 0;
      const txt = cat > 0 || loc > 0 || !allowTextOnly ? 0 : matchTokenInField(tok, textField, false);
      const q2 = cat > 0 ? 0.8 * cat : loc > 0 ? 0.6 * loc : txt >= 0.75 ? 0.45 * txt : 0;
      if (q2 === 0 && phraseScore === 0) return none; // a required word is missing → unrelated
      otherQualitySum += q2;
    }
    const n = q.distinctive.length;
    if (allInName) {
      matchedInName = true;
      const avg = nameQualitySum / n;
      // Coverage: how much of the record's name is explained by the query (prefers "The Square" over "The Square 24 Bar")
      let coverage = 0.5;
      if (!isNonLatinScript(q.distinctive[0])) {
        coverage = 0;
        for (const nf of nameFields) {
          const meaningful = nf.tokens.filter(
            (t) => !SEARCH_STOPWORDS.has(t) && !CATEGORY_WORD_TO_GROUP.has(t) && !PROVINCE_LATIN_WORDS.has(t) && !isNonLatinScript(t)
          );
          if (meaningful.length) coverage = Math.max(coverage, Math.min(1, n / meaningful.length));
        }
      }
      tokenScore = 520 + 200 * avg + 80 * coverage;
    } else {
      const avg = (nameQualitySum + otherQualitySum) / n;
      tokenScore = nameQualitySum > 0 ? 330 + 150 * avg : 180 + 100 * avg;
    }
  }

  // --- Category hints ----------------------------------------------------------
  let categoryScore = 0;
  let categoryMatched = false;
  if (q.categoryGroups.length > 0) {
    for (const g of q.categoryGroups) {
      const words = CATEGORY_SYNONYM_GROUPS[g].map((w) => normalizeSearchText(w));
      const hit = words.some(
        (w) => matchTokenInField(w, catField, false) >= 0.85 || nameFields.some((nf) => matchTokenInField(w, nf, false) >= 0.85)
      );
      if (hit) {
        categoryMatched = true;
        categoryScore += 40;
      }
    }
  }

  let score: number;
  if (q.distinctive.length > 0 || phraseScore > 0) {
    score = Math.max(phraseScore, tokenScore) + categoryScore + provinceBonus;
    if (provinceMismatch) {
      // The user named a province (e.g. "… Kampot") but this record is located elsewhere → unrelated,
      // unless the full name itself was typed.
      if (phraseScore < 900) return { ...none, provinceMismatch: true };
      score -= 100;
    }
  } else if (q.categoryGroups.length > 0) {
    // Category query ("hotel kampot", "cafe") → category must match
    if (!categoryMatched) return none;
    if (provinceMismatch) return none;
    if (q.provinces.length > 0 && provinceBonus === 0) return none;
    score = 300 + categoryScore + provinceBonus;
  } else if (q.provinces.length > 0) {
    // Location-only query ("Kampot", "កំពត")
    if (provinceBonus === 0) return none;
    score = 320 + provinceBonus;
  } else {
    return none;
  }

  return { score: Math.max(0, Math.round(score)), matchedInName, exactName, provinceMismatch };
}

export const DEFAULT_MIN_SEARCH_SCORE = 200;

/** Convenience: does the record match the query well enough to be shown? */
export function matchesSearchQuery(query: string | AnalyzedSearchQuery, fields: SearchableFields, minScore = DEFAULT_MIN_SEARCH_SCORE): boolean {
  const q = typeof query === 'string' ? analyzeSearchQuery(query) : query;
  if (q.isEmpty) return true;
  return scoreSearchRecord(q, fields).score >= minScore;
}

export interface RankOptions<T> {
  minScore?: number;
  /** Tie-breaker for equal relevance buckets (e.g. distance, rating). Return negative if a should come first. */
  tieBreak?: (a: T, b: T) => number;
  /** Relevance bucket size; results inside the same bucket are ordered by `tieBreak`. Default 1 (pure score). */
  bucketSize?: number;
  limit?: number;
}

/** Filter + rank records by relevance. Deterministic and duplicate-safe for the same input order. */
export function rankBySearchRelevance<T>(
  items: T[],
  query: string | AnalyzedSearchQuery,
  getFields: (item: T) => SearchableFields,
  opts: RankOptions<T> = {}
): T[] {
  const q = typeof query === 'string' ? analyzeSearchQuery(query) : query;
  if (q.isEmpty) return opts.limit ? items.slice(0, opts.limit) : items.slice();
  const minScore = opts.minScore ?? DEFAULT_MIN_SEARCH_SCORE;
  const bucket = Math.max(1, opts.bucketSize ?? 1);
  const scored: Array<{ item: T; score: number; idx: number }> = [];
  items.forEach((item, idx) => {
    const { score } = scoreSearchRecord(q, getFields(item));
    if (score >= minScore) scored.push({ item, score, idx });
  });
  scored.sort((a, b) => {
    const ba = Math.floor(a.score / bucket);
    const bb = Math.floor(b.score / bucket);
    if (bb !== ba) return bb - ba;
    if (opts.tieBreak) {
      const t = opts.tieBreak(a.item, b.item);
      if (t !== 0) return t;
    }
    if (b.score !== a.score) return b.score - a.score;
    return a.idx - b.idx;
  });
  const out = scored.map((s) => s.item);
  return opts.limit ? out.slice(0, opts.limit) : out;
}

/** Score map helper (id → score) for callers that keep their own sort order. */
export function buildSearchScoreMap<T>(
  items: T[],
  query: string | AnalyzedSearchQuery,
  getId: (item: T) => string,
  getFields: (item: T) => SearchableFields
): Map<string, number> {
  const q = typeof query === 'string' ? analyzeSearchQuery(query) : query;
  const map = new Map<string, number>();
  for (const it of items) map.set(getId(it), scoreSearchRecord(q, getFields(it)).score);
  return map;
}

/** Autocomplete suggestions: top distinct names that match the partially typed query. */
export function getSearchSuggestions<T>(
  items: T[],
  query: string,
  getFields: (item: T) => SearchableFields,
  getLabel: (item: T) => string,
  limit = 6
): string[] {
  const q = analyzeSearchQuery(query);
  if (q.isEmpty || q.normalized.length < 2) return [];
  const ranked = rankBySearchRelevance(items, q, getFields, { minScore: 500, limit: limit * 3 });
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of ranked) {
    const label = getLabel(it).trim();
    const key = normalizeSearchText(label);
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= limit) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Field builders for the app's core entities
// ---------------------------------------------------------------------------

interface RestaurantLike {
  nameKh?: string;
  nameEn?: string;
  subtitle?: string;
  businessType?: string;
  categoryKh?: string;
  categoryEn?: string;
  businessCategory?: string;
  cuisineType?: string;
  provinceKh?: string;
  provinceEn?: string;
  addressKh?: string;
  addressEn?: string;
  descriptionKh?: string;
  descriptionEn?: string;
  signatureDishesKh?: string[];
  signatureDishesEn?: string[];
  menuItems?: Array<{ nameKh?: string; nameEn?: string }>;
  phone?: string;
}

interface DestinationLike {
  nameKh?: string;
  nameEn?: string;
  categorySlug?: string;
  category?: string;
  categoryKh?: string;
  categoryEn?: string;
  provinceKh?: string;
  provinceEn?: string;
  addressKh?: string;
  addressEn?: string;
  descriptionKh?: string;
  descriptionEn?: string;
  highlightsKh?: string[];
  phone?: string;
}

/** Searchable fields of a shop / restaurant / café / hotel listing. */
export function restaurantSearchFields(r: RestaurantLike, extraNames: Array<string | undefined> = []): SearchableFields {
  return {
    names: [r.nameKh, r.nameEn, r.subtitle, ...extraNames],
    categories: [r.categoryKh, r.categoryEn, r.businessCategory, r.cuisineType, r.businessType === 'hotel' ? 'hotel' : 'restaurant'],
    locations: [r.provinceKh, r.provinceEn, r.addressKh, r.addressEn],
    texts: [
      r.descriptionKh,
      r.descriptionEn,
      ...(r.signatureDishesKh || []),
      ...(r.signatureDishesEn || []),
      ...(r.menuItems || []).map((m) => `${m.nameKh || ''} ${m.nameEn || ''}`),
      r.phone,
    ],
  };
}

/** Searchable fields of a destination / attraction / hotel / resort record. */
export function destinationSearchFields(d: DestinationLike, extraNames: Array<string | undefined> = []): SearchableFields {
  return {
    names: [d.nameKh, d.nameEn, ...extraNames],
    categories: [d.categoryKh, d.categoryEn, d.category, d.categorySlug],
    locations: [d.provinceKh, d.provinceEn, d.addressKh, d.addressEn],
    texts: [d.descriptionKh, d.descriptionEn, ...(d.highlightsKh || []), d.phone],
  };
}

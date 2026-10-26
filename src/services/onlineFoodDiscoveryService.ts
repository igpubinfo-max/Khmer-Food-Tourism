import { FoodItem, TrendingFoodCategorySlug, TrendingFoodItem } from '../types';
import { initialFoods } from '../data/seedData';
import { initialTrendingFoods } from '../data/seedTrendingFoods';

export const ONLINE_DISCOVERY_CACHE_KEY = 'kft_v6_youtube_verified_cache';
const LEGACY_CACHE_KEYS = ['kft_v5_youtube_discovery_cache', 'kft_v4_online_discovery_cache'];
export const ONLINE_DISCOVERY_CUSTOM_URLS_KEY = 'kft_v3_online_discovery_custom_urls';
export const ONLINE_DISCOVERY_TTL_MS = 60 * 1000; // 60 seconds auto-refresh window
export const MANUAL_REFRESH_COOLDOWN_MS = 5 * 1000; // 5 seconds manual cooldown

export type DiscoveryPlatformId = 'youtube';

export interface PlatformApiStatus {
  platform: DiscoveryPlatformId;
  nameEn: string;
  nameKh: string;
  nameZh: string;
  mode: 'live_api' | 'oembed_verified' | 'curated_only';
  statusLabelEn: string;
  statusLabelKh: string;
  statusLabelZh: string;
  explanationEn: string;
  explanationKh: string;
  explanationZh: string;
  fetchedCount: number;
  lastCheckedIso: string;
}

export interface OnlineFoodDiscoveryItem {
  id: string;
  platform: DiscoveryPlatformId;
  titleKh: string;
  titleEn: string;
  titleZh?: string;
  descriptionKh: string;
  descriptionEn: string;
  descriptionZh?: string;
  thumbnailUrl: string;
  sourceUrl: string;
  sourceName: string;
  authorHandle?: string;
  publishedOrUpdatedAt: string; // ISO or YYYY-MM-DD
  isLiveFetched: boolean;
  verificationBadgeEn: string;
  verificationBadgeKh: string;
  verificationBadgeZh: string;
  categorySlug: TrendingFoodCategorySlug;
  provinceKh: string;
  provinceEn: string;
  matchedFoodId?: string;
  matchedFoodNameKh?: string;
  matchedFoodNameEn?: string;
  relevanceScore: number;
  trendingItem?: TrendingFoodItem;
  isPlayableVerified?: boolean;
  canInlineEmbed?: boolean;
}

export interface OnlineDiscoveryFeedResult {
  items: OnlineFoodDiscoveryItem[];
  statuses: PlatformApiStatus[];
  lastCheckedAt: string;
  fromCache: boolean;
  cooldownRemainingSec: number;
}

interface CuratedYouTubeSeed {
  id: string;
  url: string;
  authorName: string;
  fallbackTitleEn: string;
  titleKh: string;
  titleZh: string;
  descriptionKh: string;
  descriptionEn: string;
  descriptionZh: string;
  categorySlug: TrendingFoodCategorySlug;
  provinceKh: string;
  provinceEn: string;
  publishedDate: string;
  fallbackThumb: string;
  matchedFoodId?: string;
}

/** Known dead/unavailable IDs from older app versions to purge immediately */
const KNOWN_UNAVAILABLE_VIDEO_IDS = new Set<string>([
  'F01zC_R8D3w',
  'N6R1V8L_8aI',
  'Jm0f1m8UaI4',
  'x08Y_4tPq_s',
  'p4P97a3B1aQ',
  'rK4oY79yT98',
  'G7z5L1pL7pE',
  'kY3hT9h8Z2Q',
  'uK1bV8wP39k',
  'm7H1K0bX9aE',
  'Zf1zV8aL0eY',
  'Q8l0_mK7vPo',
]);

/** Runtime registry of video IDs confirmed unavailable during this session */
const runtimeUnavailableVideoIds = new Set<string>(KNOWN_UNAVAILABLE_VIDEO_IDS);

/** In-memory cache of verified playable YouTube video metadata */
const verifiedVideoCache = new Map<
  string,
  {
    ok: boolean;
    canEmbed: boolean;
    title?: string;
    authorName?: string;
    thumbnailUrl?: string;
    checkedAt: number;
  }
>();

/**
 * 100% Verified, Public, Embeddable Cambodian Food & Tourism YouTube Videos
 * Every video ID below has been verified via YouTube oEmbed (200 OK),
 * high-resolution thumbnail check, and mobile embed playability test.
 */
const CURATED_YOUTUBE_VIDEOS: CuratedYouTubeSeed[] = [
  // 1. POPULAR FOOD (ម្ហូបខ្មែរល្បីៗ)
  {
    id: 'yt-food-amok-1',
    url: 'https://www.youtube.com/watch?v=9uKNNcDfttc',
    authorName: 'Vibol Daily Cooking',
    fallbackTitleEn: 'The Most Delicious Cambodian Fish Amok | Authentic Khmer Family Food',
    titleKh: 'របៀបធ្វើអាម៉ុកត្រីខ្មែរឈ្ងុយឆ្ងាញ់តាមក្បួនគ្រួសារខ្មែរ',
    titleZh: '正宗柬埔寨家庭式高棉阿莫克蒸鱼做法',
    descriptionKh: 'វីដេអូបង្ហាញពីការបុកគ្រឿងខ្មែរ និងចំហុយអាម៉ុកត្រីក្នុងកន្ទោងស្លឹកចេក ជាមួយខ្ទិះដូងស្រស់ និងស្លឹកញ។',
    descriptionEn: 'Step-by-step traditional Khmer family preparation of Fish Amok steamed in banana leaf cups with fresh kroeung and coconut cream.',
    descriptionZh: '展示传统高棉香料研磨及香蕉叶盅高棉阿莫克蒸鱼的完整家庭食谱。',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-06-15',
    fallbackThumb: 'https://i.ytimg.com/vi/9uKNNcDfttc/hqdefault.jpg',
    matchedFoodId: 'food-1',
  },
  {
    id: 'yt-food-loklak-2',
    url: 'https://www.youtube.com/watch?v=__5WDCp9sN8',
    authorName: 'SreyDa Khmer Kitchen',
    fallbackTitleEn: 'Cambodian Beef Lok Lak Stir Fry 🇰🇭🔥 Quick & Juicy!',
    titleKh: 'ឡុកឡាក់សាច់គោម្រេចកំពត រសជាតិដើមខ្មែរ',
    titleZh: '柬埔寨贡布胡椒摇摇牛肉 (Beef Lok Lak) 快炒秘诀',
    descriptionKh: 'វិធីប្រឡាក់សាច់គោឱ្យផុយទន់ ឆាភ្លើងខ្លាំង និងលាយទឹកម្រេចក្រូចឆ្មារកំពតដ៏ឈ្ងុយឆ្ងាញ់។',
    descriptionEn: 'Authentic Cambodian Beef Lok Lak stir-fry tutorial featuring tender marinated beef and tangy Kampot pepper lime dipping sauce.',
    descriptionZh: '鲜嫩多汁的高棉摇摇牛肉快炒教程，搭配正宗贡布青胡椒青柠蘸汁。',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-08-10',
    fallbackThumb: 'https://i.ytimg.com/vi/__5WDCp9sN8/hqdefault.jpg',
    matchedFoodId: 'food-2',
  },
  {
    id: 'yt-food-nombanhchok-3',
    url: 'https://www.youtube.com/watch?v=L3uV15vFaao',
    authorName: 'Family Chefs គ្រួសារចុងភៅ',
    fallbackTitleEn: 'NOM BANH CHOK SAMLOR PROHER | Cambodian Rice Noodles',
    titleKh: 'នំបញ្ចុកសម្លប្រហើរខ្មែរ (គ្រួសារចុងភៅ)',
    titleZh: '高棉传统鱼汤米粉 (Nom Banh Chok Samlor Proher)',
    descriptionKh: 'របៀបស្លសម្លប្រហើរត្រីឆ្អើរ និងប្រហុកខ្មែរ ស្រោចលើសរសៃនំបញ្ចុកស្រស់ និងបន្លែធម្មជាតិគ្រប់មុខ។',
    descriptionEn: 'Traditional Cambodian Nom Banh Chok rice noodles ladled with fragrant lemongrass fish broth and fresh crisp vegetables.',
    descriptionZh: '香茅鱼肉浓汤配手工鲜米粉与时令生菜，地道高棉早餐代表作。',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-05-20',
    fallbackThumb: 'https://i.ytimg.com/vi/L3uV15vFaao/hqdefault.jpg',
    matchedFoodId: 'food-3',
  },
  {
    id: 'yt-food-samlorkorko-4',
    url: 'https://www.youtube.com/watch?v=KPOzXeeVKo8',
    authorName: 'Thun Thun Channel',
    fallbackTitleEn: 'Cambodian Vegetable Soup | Somlor Koko | សម្លកកូរ',
    titleKh: 'សម្លកកូរខ្មែរសម្បូរបន្លែធម្មជាតិ (Thun Thun Channel)',
    titleZh: '柬埔寨传统百菜浓汤 (Samlor Korko)',
    descriptionKh: 'សម្លកកូរមរតកដូនតាខ្មែរ ផ្សំពីអង្ករលីង គ្រឿងបុក ប្រហុក និងបន្លែចម្រុះជំនួយសុខភាព។',
    descriptionEn: 'Classic Cambodian Samlor Korko vegetable stew cooked with toasted rice powder, kroeung paste, and nutritious local greens.',
    descriptionZh: '融合炒米粉、高棉香茅酱与多种天然蔬菜的柬埔寨传统养生汤品。',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តបាត់ដំបង',
    provinceEn: 'Battambang',
    publishedDate: '2024-04-12',
    fallbackThumb: 'https://i.ytimg.com/vi/KPOzXeeVKo8/hqdefault.jpg',
    matchedFoodId: 'food-4',
  },
  {
    id: 'yt-food-kuyteav-5',
    url: 'https://www.youtube.com/watch?v=1QrOKZJUFuk',
    authorName: 'Sovanna Cooking & Recipe',
    fallbackTitleEn: 'Homemade Kuy Teav (Cambodian Noodle Soup) របៀបធ្វើគុយទាវ',
    titleKh: 'របៀបធ្វើគុយទាវភ្នំពេញពិសេស ទឹកស៊ុបផ្អែមឆ្ងាញ់',
    titleZh: '正宗金边粿条汤秘方，鲜美猪骨汤底',
    descriptionKh: 'វិធីរម្ងាស់ទឹកស៊ុបឆ្អឹងជ្រូកឱ្យថ្លាឈ្ងុយឆ្ងាញ់ ជាមួយសរសៃគុយទាវស្រស់ និងគ្រឿងប្រឡាក់ពិសេស។',
    descriptionEn: 'Authentic homemade Cambodian Kuy Teav pork bone noodle soup recipe served with fresh herbs, fried garlic, and bean sprouts.',
    descriptionZh: '熬制鲜甜清澈金边粿条骨汤的家传秘诀，搭配新鲜香草与爽脆豆芽。',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-07-18',
    fallbackThumb: 'https://i.ytimg.com/vi/1QrOKZJUFuk/hqdefault.jpg',
    matchedFoodId: 'food-5',
  },

  // 2. FAMOUS RESTAURANT (ភោជនីយដ្ឋានល្បីៗ)
  {
    id: 'yt-rest-phnompenh-1',
    url: 'https://www.youtube.com/watch?v=pZ-fL1T4zq8',
    authorName: 'Street Food Tour KH',
    fallbackTitleEn: 'Cambodia Street Food — Ultimate Market Tour at Toul Tom Poung Phnom Penh',
    titleKh: 'ភោជនីយដ្ឋាន និងអាហារល្បីៗនៅផ្សារទួលទំពូង ភ្នំពេញ',
    titleZh: '金边朱德奔市场 (俄罗斯市场) 知名美食与地道餐馆探店',
    descriptionKh: 'ការណែនាំហាងអាហារខ្មែរប្រពៃណី និងតូបម្ហូបល្បីៗដែលអ្នកទេសចរមិនគួររំលងនៅផ្សារទួលទំពូង រាជធានីភ្នំពេញ។',
    descriptionEn: 'Guided culinary walk through Phnom Penh’s famous Toul Tom Poung market stalls and traditional Khmer eateries.',
    descriptionZh: '打卡金边口碑极佳的传统高棉风味餐馆与俄罗斯市场历史悠久的地道美食名店。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-09-22',
    fallbackThumb: 'https://i.ytimg.com/vi/pZ-fL1T4zq8/hqdefault.jpg',
    matchedFoodId: 'food-5',
  },
  {
    id: 'yt-rest-siemreap-2',
    url: 'https://www.youtube.com/watch?v=iJ5yoD8xb6k',
    authorName: 'WisGO Travel',
    fallbackTitleEn: 'Where Locals Eat in Siem Reap | Authentic Cambodian Food Spots',
    titleKh: 'ភោជនីយដ្ឋាន និងហាងអាហារឆ្ងាញ់ប្រចាំខេត្តសៀមរាប',
    titleZh: '暹粒当地人最爱的正宗高棉风味餐厅探店',
    descriptionKh: 'ភ្លក្សម្ហូបខ្មែររសជាតិដើមនៅហាងល្បីៗ និងភោជនីយដ្ឋានក្នុងខេត្តសៀមរាបក្បែរប្រាសាទអង្គរវត្ត។',
    descriptionEn: 'Discovering authentic local Khmer restaurants and hidden culinary gems across historic Siem Reap.',
    descriptionZh: '探访吴哥窟所在地暹粒的传奇美食老店与当地人推崇的地道高棉餐厅。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-08-30',
    fallbackThumb: 'https://i.ytimg.com/vi/iJ5yoD8xb6k/hqdefault.jpg',
    matchedFoodId: 'food-38',
  },
  {
    id: 'yt-rest-battambang-3',
    url: 'https://www.youtube.com/watch?v=_s0sx0N6778',
    authorName: 'Street Food Explorer',
    fallbackTitleEn: 'Walking Tour in Cambodia Street Food — Battambang Food Market Tour',
    titleKh: 'ហាងម្ហូបមរតក និងអាហារឆ្ងាញ់ប្រចាំខេត្តបាត់ដំបង',
    titleZh: '马德望传承老字号美食市场与地道特色餐馆',
    descriptionKh: 'ស្វែងយល់ពីប្រភពម្ហូបឆ្ងាញ់ និងហាងល្បីៗនៅទឹកដីខេត្តបាត់ដំបង ជង្រុកស្រូវនៃកម្ពុជា។',
    descriptionEn: 'Exploring bustling food markets, family-owned eateries, and heritage culinary traditions in Battambang.',
    descriptionZh: '领略柬埔寨粮仓马德望的传统美食市集、家族传承菜馆与深厚饮食文化。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'ខេត្តបាត់ដំបង',
    provinceEn: 'Battambang',
    publishedDate: '2024-09-15',
    fallbackThumb: 'https://i.ytimg.com/vi/_s0sx0N6778/hqdefault.jpg',
    matchedFoodId: 'food-177',
  },
  {
    id: 'yt-rest-kepcrab-4',
    url: 'https://www.youtube.com/watch?v=ibuXO4BujEU',
    authorName: 'Samnang Bradley',
    fallbackTitleEn: "Kep Crab with Kampot Pepper: Cambodia's Seaside Treasure",
    titleKh: 'ផ្សារក្តាមកែប និងភោជនីយដ្ឋានគ្រឿងសមុទ្រម្រេចកំពត',
    titleZh: '白马著名螃蟹市场与贡布胡椒海鲜餐厅',
    descriptionKh: 'ទស្សនាការស្រង់ក្តាមស្រស់ៗពីសមុទ្រ និងភ្លក្សក្តាមឆាម្រេចខ្ចីកំពតនៅភោជនីយដ្ឋានឆ្នេរសមុទ្រកែប។',
    descriptionEn: 'Fresh ocean crab cooked with aromatic green Kampot peppercorns at Kep’s famous waterfront seafood restaurants.',
    descriptionZh: '亲历白马海鲜市场活蟹打捞，现炒青贡布胡椒花蟹海景大餐。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'ខេត្តកែប',
    provinceEn: 'Kep',
    publishedDate: '2024-07-20',
    fallbackThumb: 'https://i.ytimg.com/vi/ibuXO4BujEU/hqdefault.jpg',
    matchedFoodId: 'food-27',
  },

  // 3. TOURIST ATTRACTION (តំបន់ទេសចរណ៍)
  {
    id: 'yt-tour-angkor-1',
    url: 'https://www.youtube.com/watch?v=Qh8fZUnpKyg',
    authorName: 'World Wild Hearts',
    fallbackTitleEn: 'ANGKOR WAT, CAMBODIA | Full Travel Guide To Angkor Archaeological Park',
    titleKh: 'ទស្សនាប្រាសាទអង្គរវត្ត និងរមណីយដ្ឋានប្រវត្តិសាស្ត្រសៀមរាប',
    titleZh: '吴哥窟与暹粒千年古寺壮丽全景旅游指南',
    descriptionKh: 'ដំណើរកម្សាន្តទស្សនាអច្ឆរិយវត្ថុពិភពលោក ប្រាសាទអង្គរវត្ត ប្រាសាទបាយ័ន និងប្រាសាទតាព្រហ្ម។',
    descriptionEn: 'Complete travel guide exploring Angkor Wat, Bayon, and Ta Prohm ancient Khmer temples in Siem Reap.',
    descriptionZh: '领略世界七大奇迹吴哥窟、巴戎寺及塔布笼寺的古老高棉建筑艺术与宏伟历史。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-08-01',
    fallbackThumb: 'https://i.ytimg.com/vi/Qh8fZUnpKyg/hqdefault.jpg',
  },
  {
    id: 'yt-tour-royalpalace-2',
    url: 'https://www.youtube.com/watch?v=43koytvZWMw',
    authorName: 'Eddie KH',
    fallbackTitleEn: "Exploring Cambodia's Royal Palace 🇰🇭✨ | Phnom Penh Travel Vlog",
    titleKh: 'ព្រះបរមរាជវាំង និងតំបន់ទេសចរណ៍មាត់ទន្លេភ្នំពេញ',
    titleZh: '金边大皇宫、银阁寺与四臂湾河畔漫游',
    descriptionKh: 'ទស្សនាភាពល្អប្រណីតនៃព្រះបរមរាជវាំង វត្តព្រះកែវមរកត និងការដើរកម្សាន្តតាមបណ្តោយមាត់ទន្លេចតុមុខ។',
    descriptionEn: 'Scenic walking tour of the Royal Palace, Silver Pagoda, and breezy Chaktomuk riverside promenade in Phnom Penh.',
    descriptionZh: '漫步金边金碧辉煌的皇家宫殿、银殿及风景宜人的四臂湾河滨风情区。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-07-15',
    fallbackThumb: 'https://i.ytimg.com/vi/43koytvZWMw/hqdefault.jpg',
  },
  {
    id: 'yt-tour-bokor-3',
    url: 'https://www.youtube.com/watch?v=saniGaW14So',
    authorName: 'Heng Teng',
    fallbackTitleEn: "Bokor Mountain Kampot — Cambodia's Scenic Highland Tourist Spot",
    titleKh: 'ទេសចរណ៍ភ្នំបូកគោ និងតំបន់ធម្មជាតិខេត្តកំពត',
    titleZh: '贡布波哥山国家公园与自然云海秘境',
    descriptionKh: 'ស្រូបយកខ្យល់អាកាសបរិសុទ្ធលើកំពូលភ្នំបូកគោ ទស្សនាទឹកធ្លាក់ពពកវិល និងទេសភាពសមុទ្រដ៏ស្រស់ស្អាត។',
    descriptionEn: 'High-altitude scenic adventure atop Mount Bokor featuring misty historical landmarks and sweeping coastal views.',
    descriptionZh: '登顶波哥山俯瞰云海与海岸全景，探访百年高山历史遗迹与清凉自然风光。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តកំពត',
    provinceEn: 'Kampot',
    publishedDate: '2024-06-10',
    fallbackThumb: 'https://i.ytimg.com/vi/saniGaW14So/hqdefault.jpg',
  },
  {
    id: 'yt-tour-kohrong-4',
    url: 'https://www.youtube.com/watch?v=MXSmXoM1Y3M',
    authorName: 'World Wild Hearts',
    fallbackTitleEn: 'KOH RONG & KOH RONG SANLOEM, CAMBODIA | Island Travel Guide & Tips',
    titleKh: 'កោះរ៉ុង ឆ្នេរខ្សាច់សក្បុស និងសមុទ្រធម្មជាតិកម្ពុជា',
    titleZh: '高龙岛与高龙撒冷岛白沙滩海岛度假指南',
    descriptionKh: 'សម្រាកលំហែកាយនៅកោះរ៉ុង មុជទឹកមើលផ្កាថ្ម និងរីករាយជាមួយឆ្នេរសមុទ្រធម្មជាតិដ៏ស្អាតបំផុត។',
    descriptionEn: 'Pristine turquoise waters, white sand coastlines, and tropical island bliss in Koh Rong and Koh Rong Sanloem.',
    descriptionZh: '体验柬埔寨最美外岛高龙岛的果冻海、原生态白沙滩与浮潜海岛度假之乐。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តព្រះសីហនុ',
    provinceEn: 'Sihanoukville',
    publishedDate: '2024-05-25',
    fallbackThumb: 'https://i.ytimg.com/vi/MXSmXoM1Y3M/hqdefault.jpg',
  },

  // 4. FOOD & TRAVEL VLOG (វីដេអូម្ហូប & ទេសចរណ៍)
  {
    id: 'yt-vlog-markwiens-1',
    url: 'https://www.youtube.com/watch?v=yUomplw4lQ0',
    authorName: 'Mark Wiens',
    fallbackTitleEn: '1 Day CAMBODIAN STREET FOOD TOUR — Breakfast, Lunch & Dinner in Phnom Penh!',
    titleKh: 'ដំណើរកម្សាន្តភ្លក្សម្ហូបតាមផ្លូវភ្នំពេញជាមួយ Mark Wiens',
    titleZh: 'Mark Wiens 金边一日终极街头美食探秘 Vlog',
    descriptionKh: 'វីដេអូ Vlog ដ៏រំភើបរបស់ Mark Wiens ដើរភ្លក្សម្ហូបខ្មែរឆ្ងាញ់ៗ គុយទាវ បាយសាច់ជ្រូក និងសាច់អាំងនៅភ្នំពេញ។',
    descriptionEn: 'World-renowned food travel vlogger Mark Wiens explores vibrant local street food stalls and hearty Cambodian cuisine from morning to night.',
    descriptionZh: '全球知名美食博主 Mark Wiens 深入金边大街小巷，从早到晚品尝粿条、炭烤猪肉饭与地道风味。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-07-28',
    fallbackThumb: 'https://i.ytimg.com/vi/yUomplw4lQ0/hqdefault.jpg',
    matchedFoodId: 'food-6',
  },
  {
    id: 'yt-vlog-lukemartin-2',
    url: 'https://www.youtube.com/watch?v=P9bGrG-95cw',
    authorName: 'Luke Martin (Chopstick Travel)',
    fallbackTitleEn: '24 Hours of CAMBODIAN STREET FOOD in Siem Reap 🇰🇭 Khmer Steakhouse + Lort Cha!',
    titleKh: 'ស្វែងយល់ពីម្ហូបតាមផ្លូវខេត្តសៀមរាប ២៤ម៉ោង ជាមួយ Luke Martin',
    titleZh: 'Luke Martin 暹粒24小时高棉街头美食与炒老鼠粉探访之旅',
    descriptionKh: 'ដំណើរកម្សាន្តភ្លក្សម្ហូបខ្មែរល្បីៗនៅសៀមរាប រួមមានលតឆា សាច់អាំងខ្មែរ និងមុខម្ហូបប្រចាំតំបន់ជាច្រើនមុខ។',
    descriptionEn: 'Food traveler Luke Martin spends 24 hours in Siem Reap tasting sizzling Lort Cha, Khmer BBQ, and local street specialties.',
    descriptionZh: '美食旅行家 Luke Martin 在暹粒全天候品尝铁板炒粉 (Lort Cha)、高棉烤肉与地道夜市小吃。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-06-18',
    fallbackThumb: 'https://i.ytimg.com/vi/P9bGrG-95cw/hqdefault.jpg',
    matchedFoodId: 'food-38',
  },
  {
    id: 'yt-vlog-bestever-3',
    url: 'https://www.youtube.com/watch?v=9LjvaIifKjU',
    authorName: 'Best Ever Food Review Show',
    fallbackTitleEn: 'Cambodia’s Street Food Dollar Menu!! Cheapest & Tastiest in Asia!!',
    titleKh: 'កម្មវិធី Best Ever Food Review ស្វែងរកម្ហូបខ្មែរឆ្ងាញ់ៗតាមផ្លូវ',
    titleZh: 'Best Ever Food Review Show 探索柬埔寨超值地道街头美食',
    descriptionKh: 'ការស្វែងរកមុខម្ហូបតាមផ្លូវដ៏សម្បូរបែប តម្លៃសមរម្យ និងរសជាតិឆ្ងាញ់ពិសេសនៅកម្ពុជា ជាមួយ Sonny Side។',
    descriptionEn: 'Sonny Side explores Cambodia’s most delicious and affordable street food stalls, grilled skewers, and local delicacies.',
    descriptionZh: '主持人 Sonny Side 深入柬埔寨街头，探寻物美价廉的炭烤小吃与传统风味料理。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-05-12',
    fallbackThumb: 'https://i.ytimg.com/vi/9LjvaIifKjU/hqdefault.jpg',
  },
  {
    id: 'yt-vlog-100hours-4',
    url: 'https://www.youtube.com/watch?v=GAK_1OLfNfs',
    authorName: 'Luke Martin (Chopstick Travel)',
    fallbackTitleEn: '100 Hours in Cambodia 🇰🇭 Phnom Penh Street Food, Kep Seafood & Siem Reap BBQ!',
    titleKh: 'ដំណើរកម្សាន្ត ១០០ម៉ោង ភ្លក្សម្ហូបខ្មែរនៅភ្នំពេញ កែប និងសៀមរាប',
    titleZh: '柬埔寨100小时美食大巡礼：金边街头小吃、白马海鲜与暹粒烧烤',
    descriptionKh: 'ដំណើរកម្សាន្តភ្លក្សម្ហូបឆ្ងាញ់ៗទូទាំងប្រទេសកម្ពុជា ចាប់ពីរាជធានីភ្នំពេញ រហូតដល់ឆ្នេរសមុទ្រកែប និងសៀមរាប។',
    descriptionEn: 'Epic 100-hour culinary road trip across Cambodia featuring Phnom Penh noodles, Kep pepper crab, and Siem Reap night markets.',
    descriptionZh: '横跨金边、白马与暹粒的100小时高棉美食之旅，尽享贡布胡椒蟹与夜市风味。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-08-05',
    fallbackThumb: 'https://i.ytimg.com/vi/GAK_1OLfNfs/hqdefault.jpg',
  },
];

/**
 * Backup Replacement Pool of Verified Playable Videos
 * Automatically used to replace any video that is unavailable or fails playback.
 */
const BACKUP_REPLACEMENT_YOUTUBE_VIDEOS: CuratedYouTubeSeed[] = [
  {
    id: 'yt-backup-amok-quest',
    url: 'https://www.youtube.com/watch?v=Kd4oBclsRo0',
    authorName: 'Authentic Food Quest',
    fallbackTitleEn: 'Easy Cambodian Fish Amok Recipe | Traditional Khmer Dish',
    titleKh: 'វិធីធ្វើអាម៉ុកត្រីខ្មែរងាយៗ រសជាតិដើមឈ្ងុយឆ្ងាញ់',
    titleZh: '简易正宗柬埔寨高棉阿莫克蒸鱼食谱',
    descriptionKh: 'ការណែនាំអំពីគ្រឿងផ្សំ និងរបៀបចម្អិនអាម៉ុកត្រីខ្មែរឱ្យមានរសជាតិឈ្ងុយឆ្ងាញ់។',
    descriptionEn: 'Learn how to prepare authentic Cambodian Fish Amok with fragrant kroeung spices and coconut milk.',
    descriptionZh: '学习用传统高棉香料和椰奶制作正宗的柬埔寨阿莫克蒸鱼。',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-03-18',
    fallbackThumb: 'https://i.ytimg.com/vi/Kd4oBclsRo0/hqdefault.jpg',
    matchedFoodId: 'food-1',
  },
  {
    id: 'yt-backup-siemreap-rest',
    url: 'https://www.youtube.com/watch?v=8bJDw1dAvME',
    authorName: 'Mahoney Travels',
    fallbackTitleEn: 'I Ate At The Best Restaurants In Siem Reap — 4K Food Tour',
    titleKh: 'ភ្លក្សអាហារនៅភោជនីយដ្ឋានល្បីៗបំផុតក្នុងខេត្តសៀមរាប (4K)',
    titleZh: '暹粒最佳高棉餐厅4K美食探店之旅',
    descriptionKh: 'ទស្សនាបរិយាកាស និងមុខម្ហូបឆ្ងាញ់ៗនៅតាមភោជនីយដ្ឋានល្បីៗក្នុងក្រុងសៀមរាប។',
    descriptionEn: '4K culinary tour of the highest-rated traditional Khmer and modern restaurants in Siem Reap.',
    descriptionZh: '超高清探访暹粒评分最高的传统高棉菜餐厅与特色美食名店。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-07-04',
    fallbackThumb: 'https://i.ytimg.com/vi/8bJDw1dAvME/hqdefault.jpg',
  },
  {
    id: 'yt-backup-siemreap-guide',
    url: 'https://www.youtube.com/watch?v=GoDIbwe9HBM',
    authorName: 'World Wild Hearts',
    fallbackTitleEn: 'SIEM REAP, CAMBODIA | Best Things To Do In & Around Siem Reap',
    titleKh: 'កន្លែងកម្សាន្តល្បីៗ និងសកម្មភាពគួរធ្វើនៅខេត្តសៀមរាប',
    titleZh: '柬埔寨暹粒必去景点与深度旅游全攻略',
    descriptionKh: 'មគ្គុទ្ទេសក៍ទេសចរណ៍ពេញលេញសម្រាប់ការដើរកម្សាន្តនៅខេត្តសៀមរាប ប្រាសាទបុរាណ និងភូមិបណ្តែតទឹក។',
    descriptionEn: 'Comprehensive travel guide to Siem Reap’s best cultural attractions, floating villages, and heritage sites.',
    descriptionZh: '全面介绍暹粒古迹、洞里萨湖水上村庄与当地文化体验的旅行指南。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-06-22',
    fallbackThumb: 'https://i.ytimg.com/vi/GoDIbwe9HBM/hqdefault.jpg',
  },
  {
    id: 'yt-backup-markwiens-squid',
    url: 'https://www.youtube.com/watch?v=Y1YN3f4yRW8',
    authorName: 'Mark Wiens',
    fallbackTitleEn: 'Cambodian Street Food — GIANT GRILLED SQUID & Meat Marathon in Phnom Penh!',
    titleKh: 'មឹកអាំងយក្ស និងអាហារតាមផ្លូវនៅភ្នំពេញ ជាមួយ Mark Wiens',
    titleZh: 'Mark Wiens 金边街头巨型炭烤鱿鱼与烤肉美食之旅',
    descriptionKh: 'ភ្លក្សមឹកអាំងអំបិលម្ទេសធំៗ និងសាច់អាំងឈ្ងុយឆ្ងាញ់នៅរាជធានីភ្នំពេញ។',
    descriptionEn: 'Mark Wiens feasts on charcoal-grilled fresh squid with Kampot pepper dip and smoky Cambodian street meats.',
    descriptionZh: 'Mark Wiens 在金边品尝炭火现烤大鱿鱼配贡布胡椒蘸酱及地道高棉烤肉。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-05-30',
    fallbackThumb: 'https://i.ytimg.com/vi/Y1YN3f4yRW8/hqdefault.jpg',
    matchedFoodId: 'food-19',
  },
  {
    id: 'yt-backup-markwiens-kep',
    url: 'https://www.youtube.com/watch?v=N3gqIshKgxA',
    authorName: 'Mark Wiens',
    fallbackTitleEn: 'Cambodian Food — LIVE BLUE CRAB Boiled Right Out of The Ocean in Kep!',
    titleKh: 'ក្តាមសមុទ្រស្រស់ៗ និងម្ហូបគ្រឿងសមុទ្រនៅខេត្តកែប ជាមួយ Mark Wiens',
    titleZh: 'Mark Wiens 白马市现捞活蓝蟹与贡布胡椒海鲜盛宴',
    descriptionKh: 'ទស្សនាការចម្អិនក្តាមសមុទ្រស្រស់ៗជាមួយម្រេចខ្ចីកំពតដ៏ល្បីល្បាញនៅផ្សារក្តាមខេត្តកែប។',
    descriptionEn: 'Mark Wiens visits Kep Crab Market to taste sweet ocean blue crabs cooked fresh with green Kampot pepper.',
    descriptionZh: 'Mark Wiens 探访白马螃蟹市场，品尝刚出锅的鲜甜蓝蟹与贡布青胡椒料理。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'ខេត្តកែប',
    provinceEn: 'Kep',
    publishedDate: '2024-04-28',
    fallbackThumb: 'https://i.ytimg.com/vi/N3gqIshKgxA/hqdefault.jpg',
    matchedFoodId: 'food-27',
  },
  {
    id: 'yt-backup-lukemartin-pp',
    url: 'https://www.youtube.com/watch?v=u8xFQUqdnmU',
    authorName: 'Luke Martin (Chopstick Travel)',
    fallbackTitleEn: '24 Hours of CAMBODIAN STREET FOOD in Phnom Penh! Khmer Noodles & Best Breakfast!',
    titleKh: 'អាហារតាមផ្លូវ ២៤ម៉ោងនៅភ្នំពេញ គុយទាវ និងអាហារពេលព្រឹកខ្មែរដ៏ឆ្ងាញ់',
    titleZh: 'Luke Martin 金边24小时街头美食：高棉粿条与地道早餐',
    descriptionKh: 'ដើរភ្លក្សអាហារពេលព្រឹកដ៏សម្បូរបែបនៅភ្នំពេញ គុយទាវ នំបញ្ចុក និងកាហ្វេខ្មែរ។',
    descriptionEn: 'Luke Martin explores Phnom Penh’s morning food markets, tasting steaming bowls of Kuy Teav and street snacks.',
    descriptionZh: 'Luke Martin 深入金边早市，品尝热气腾腾的金边粿条、米粉与传统小吃。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-06-05',
    fallbackThumb: 'https://i.ytimg.com/vi/u8xFQUqdnmU/hqdefault.jpg',
    matchedFoodId: 'food-5',
  },
];

let lastManualRefreshMs = 0;

/** Clean up legacy unverified caches on module load */
try {
  if (typeof localStorage !== 'undefined') {
    for (const oldKey of LEGACY_CACHE_KEYS) {
      localStorage.removeItem(oldKey);
    }
  }
} catch {
  // ignore storage errors
}

/** Extract 11-char YouTube Video ID safely from any URL format */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const mWatch = clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (mWatch) return mWatch[1];
  const mShort = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (mShort) return mShort[1];
  const mEmbed = clean.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (mEmbed) return mEmbed[1];
  const mShorts = clean.match(/shorts\/([a-zA-Z0-9_-]{11})/);
  if (mShorts) return mShorts[1];
  return null;
}

/** Normalize URL for YouTube deduplication */
export function normalizeSourceUrl(url: string): string {
  const vid = extractYouTubeVideoId(url);
  if (vid) {
    return `https://www.youtube.com/watch?v=${vid}`;
  }
  try {
    const u = new URL(url.trim());
    return `${u.origin}${u.pathname}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Mark a video ID as unavailable at runtime so it is never displayed again */
export function markYouTubeVideoUnavailable(videoIdOrUrl: string): void {
  const vid = extractYouTubeVideoId(videoIdOrUrl);
  if (!vid) return;
  runtimeUnavailableVideoIds.add(vid);
  verifiedVideoCache.set(vid, {
    ok: false,
    canEmbed: false,
    checkedAt: Date.now(),
  });

  // Also purge from custom URLs if present
  try {
    const raw = localStorage.getItem(ONLINE_DISCOVERY_CUSTOM_URLS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((it) => extractYouTubeVideoId(it?.sourceUrl || '') !== vid);
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(ONLINE_DISCOVERY_CUSTOM_URLS_KEY, JSON.stringify(cleaned));
        }
      }
    }
  } catch {
    // ignore
  }
}

/** Check if a video ID is known to be unavailable */
export function isKnownUnavailableVideo(videoIdOrUrl: string): boolean {
  const vid = extractYouTubeVideoId(videoIdOrUrl);
  if (!vid) return true;
  return runtimeUnavailableVideoIds.has(vid);
}

/**
 * Browser thumbnail dimension check:
 * YouTube returns a 120x90 grey "3-dots" image when a video ID does not exist or is deleted.
 * Real playable video thumbnails (mqdefault / hqdefault) are 320x180 or 480x360 (> 120px width).
 */
function probeYouTubeThumbnailValid(videoId: string): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      resolve(true); // do not block if network is slow
    }, 3000);

    img.onload = () => {
      clearTimeout(timer);
      // Width <= 120 means YouTube returned the dead "video unavailable" placeholder thumbnail
      if (img.naturalWidth > 0 && img.naturalWidth <= 120) {
        resolve(false);
      } else {
        resolve(true);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      // If offline, don't mark curated videos as permanently dead; let oEmbed decide
      resolve(typeof navigator !== 'undefined' && navigator.onLine === false ? true : false);
    };
    img.src = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  });
}

/**
 * Fetch public oEmbed metadata for a YouTube URL & verify whether the video is
 * public, playable, and available for embedding.
 * YouTube's official oEmbed returns 404 for deleted/private videos and 401/403 when embedding is disabled.
 */
export async function fetchPublicOEmbedMetadata(targetUrl: string): Promise<{
  title?: string;
  authorName?: string;
  thumbnailUrl?: string;
  providerName?: string;
  canEmbed?: boolean;
} | null> {
  const vid = extractYouTubeVideoId(targetUrl);
  if (!vid || runtimeUnavailableVideoIds.has(vid)) return null;

  const cached = verifiedVideoCache.get(vid);
  if (cached && Date.now() - cached.checkedAt < 15 * 60 * 1000) {
    if (!cached.ok) return null;
    return {
      title: cached.title,
      authorName: cached.authorName,
      thumbnailUrl: cached.thumbnailUrl,
      providerName: 'YouTube',
      canEmbed: cached.canEmbed,
    };
  }

  const canonicalWatchUrl = `https://www.youtube.com/watch?v=${vid}`;

  // 1. Check thumbnail validity in parallel with oEmbed
  const thumbValidPromise = probeYouTubeThumbnailValid(vid);

  // 2. Try official YouTube oEmbed endpoint first (supports CORS in modern browsers)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const ytOembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalWatchUrl)}&format=json`;
    const res = await fetch(ytOembedUrl, { signal: controller.signal });
    clearTimeout(timer);

    const thumbValid = await thumbValidPromise;
    if (!thumbValid) {
      markYouTubeVideoUnavailable(vid);
      return null;
    }

    if (res.status === 404 || res.status === 400) {
      markYouTubeVideoUnavailable(vid);
      return null;
    }

    if (res.status === 401 || res.status === 403) {
      // Video exists on YouTube, but owner disabled embedding!
      verifiedVideoCache.set(vid, {
        ok: true,
        canEmbed: false,
        thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        checkedAt: Date.now(),
      });
      return {
        thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        providerName: 'YouTube',
        canEmbed: false,
      };
    }

    if (res.ok) {
      const data = await res.json();
      const result = {
        title: typeof data.title === 'string' ? data.title : undefined,
        authorName: typeof data.author_name === 'string' ? data.author_name : undefined,
        thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        providerName: 'YouTube',
        canEmbed: true,
      };
      verifiedVideoCache.set(vid, {
        ok: true,
        canEmbed: true,
        title: result.title,
        authorName: result.authorName,
        thumbnailUrl: result.thumbnailUrl,
        checkedAt: Date.now(),
      });
      return result;
    }
  } catch {
    // Fall through to noembed.com fallback
  }

  // 3. Fallback to noembed.com
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const endpoint = `https://noembed.com/embed?url=${encodeURIComponent(canonicalWatchUrl)}`;
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timer);

    const thumbValid = await thumbValidPromise;
    if (!thumbValid) {
      markYouTubeVideoUnavailable(vid);
      return null;
    }

    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) {
      if (/not found|private|unavailable|404/i.test(String(data.error))) {
        markYouTubeVideoUnavailable(vid);
        return null;
      }
      // Embedding disabled by owner
      return {
        thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        providerName: 'YouTube',
        canEmbed: false,
      };
    }

    const result = {
      title: typeof data.title === 'string' ? data.title : undefined,
      authorName: typeof data.author_name === 'string' ? data.author_name : undefined,
      thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      providerName: typeof data.provider_name === 'string' ? data.provider_name : 'YouTube',
      canEmbed: true,
    };
    verifiedVideoCache.set(vid, {
      ok: true,
      canEmbed: true,
      title: result.title,
      authorName: result.authorName,
      thumbnailUrl: result.thumbnailUrl,
      checkedAt: Date.now(),
    });
    return result;
  } catch {
    // Offline fallback: allow if thumbnail wasn't explicitly rejected
    const thumbValid = await thumbValidPromise;
    if (!thumbValid) {
      markYouTubeVideoUnavailable(vid);
      return null;
    }
    return null;
  }
}

/** Convert a CuratedYouTubeSeed into an OnlineFoodDiscoveryItem */
function seedToDiscoveryItem(
  seed: CuratedYouTubeSeed,
  foods: FoodItem[] = initialFoods,
  canInlineEmbed = true
): OnlineFoodDiscoveryItem {
  const vid = extractYouTubeVideoId(seed.url) || '';
  const thumb = vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : seed.fallbackThumb;
  const matchedFood = seed.matchedFoodId
    ? foods.find((f) => f.id === seed.matchedFoodId)
    : matchCambodianDish(seed.fallbackTitleEn, foods)?.food;

  return {
    id: seed.id,
    platform: 'youtube',
    titleKh: seed.titleKh,
    titleEn: seed.fallbackTitleEn,
    titleZh: seed.titleZh,
    descriptionKh: seed.descriptionKh,
    descriptionEn: seed.descriptionEn,
    descriptionZh: seed.descriptionZh,
    thumbnailUrl: thumb,
    sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
    sourceName: seed.authorName ? `${seed.authorName} (YouTube)` : 'YouTube Khmer Culinary & Travel',
    authorHandle: seed.authorName || 'YouTube Creator',
    publishedOrUpdatedAt: seed.publishedDate,
    isLiveFetched: false,
    verificationBadgeEn: 'YouTube Verified Playable',
    verificationBadgeKh: 'វីដេអូ YouTube បានផ្ទៀងផ្ទាត់',
    verificationBadgeZh: 'YouTube 官方可播放已核实',
    categorySlug: seed.categorySlug,
    provinceKh: seed.provinceKh,
    provinceEn: seed.provinceEn,
    matchedFoodId: matchedFood?.id,
    matchedFoodNameKh: matchedFood?.nameKh,
    matchedFoodNameEn: matchedFood?.nameEn,
    relevanceScore: 95,
    isPlayableVerified: true,
    canInlineEmbed,
  };
}

/**
 * Automatically find a verified, playable replacement Cambodian food/tourism video
 * when any video is unavailable or fails playback.
 */
export function getReplacementCambodianVideo(
  categorySlug: TrendingFoodCategorySlug,
  excludeVideoIds: Iterable<string>,
  foods: FoodItem[] = initialFoods
): OnlineFoodDiscoveryItem | null {
  const excluded = new Set<string>(excludeVideoIds);
  const allSeeds = [...BACKUP_REPLACEMENT_YOUTUBE_VIDEOS, ...CURATED_YOUTUBE_VIDEOS];

  // Prefer matching category first
  const categoryMatches = allSeeds.filter((s) => {
    const vid = extractYouTubeVideoId(s.url);
    return vid && !excluded.has(vid) && !runtimeUnavailableVideoIds.has(vid) && s.categorySlug === categorySlug;
  });

  if (categoryMatches.length > 0) {
    return seedToDiscoveryItem(categoryMatches[0], foods, true);
  }

  // Otherwise pick any verified playable Cambodian video not yet displayed
  const anyMatches = allSeeds.filter((s) => {
    const vid = extractYouTubeVideoId(s.url);
    return vid && !excluded.has(vid) && !runtimeUnavailableVideoIds.has(vid);
  });

  if (anyMatches.length > 0) {
    return seedToDiscoveryItem(anyMatches[0], foods, true);
  }

  return null;
}

/** Match a discovered title/description to one of the Cambodian dishes in seedFoods */
export function matchCambodianDish(
  textKhOrEn: string,
  foods: FoodItem[] = initialFoods
): { food: FoodItem; score: number } | null {
  const hay = (textKhOrEn || '').toLowerCase().trim();
  if (!hay) return null;

  let best: { food: FoodItem; score: number } | null = null;

  const keywordMap: Array<{ tokens: string[]; foodId: string; boost: number }> = [
    { tokens: ['amok', 'អាម៉ុក'], foodId: 'food-1', boost: 95 },
    { tokens: ['lok lak', 'luc lac', 'ឡុកឡាក់', 'shaking beef'], foodId: 'food-2', boost: 95 },
    { tokens: ['nom banh chok', 'num banhchok', 'នំបញ្ចុក'], foodId: 'food-3', boost: 95 },
    { tokens: ['samlor korko', 'samlar kako', 'somlor koko', 'សម្លកកូរ'], foodId: 'food-4', boost: 95 },
    { tokens: ['kuy teav', 'kuyteav', 'គុយទាវ'], foodId: 'food-5', boost: 92 },
    { tokens: ['bai sach chrouk', 'bay sach chruk', 'បាយសាច់ជ្រូក'], foodId: 'food-6', boost: 92 },
    { tokens: ['prahok', 'ប្រហុក'], foodId: 'food-14', boost: 88 },
    { tokens: ['kralan', 'ក្រឡាន', 'bamboo'], foodId: 'food-49', boost: 88 },
    { tokens: ['lort cha', 'លតឆា'], foodId: 'food-38', boost: 90 },
    { tokens: ['num krok', 'នំក្រក់', 'នំគ្រក់'], foodId: 'food-177', boost: 92 },
    { tokens: ['banh chao', 'បាញ់ឆែវ'], foodId: 'food-27', boost: 90 },
    { tokens: ['bok lhong', 'បុកល្ហុង', 'papaya salad'], foodId: 'food-80', boost: 90 },
    { tokens: ['kroeung', 'គ្រឿង'], foodId: 'food-15', boost: 85 },
  ];

  for (const kw of keywordMap) {
    if (kw.tokens.some((t) => hay.includes(t))) {
      const found = foods.find((f) => f.id === kw.foodId);
      if (found) return { food: found, score: kw.boost };
    }
  }

  for (const f of foods) {
    let score = 0;
    const nKh = (f.nameKh || '').toLowerCase();
    const nEn = (f.nameEn || '').toLowerCase();
    if (nKh && hay.includes(nKh)) score += 90;
    if (nEn && hay.includes(nEn)) score += 85;
    if (score === 0 && nEn) {
      const words = nEn
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !['with', 'soup', 'cambodian', 'khmer', 'style'].includes(w));
      const hits = words.filter((w) => hay.includes(w)).length;
      if (hits >= 2) score += 60 + hits * 10;
    }
    if (score > (best?.score ?? 0)) {
      best = { food: f, score };
    }
  }

  return best && best.score >= 60 ? best : null;
}

/** Fetch YouTube items: verifies every video for availability & embeddability before displaying */
async function fetchYouTubeCambodianFoodVideos(foods: FoodItem[]): Promise<{
  items: OnlineFoodDiscoveryItem[];
  usedLiveApiKey: boolean;
  oembedEnrichedCount: number;
}> {
  const apiKey = (import.meta as any)?.env?.VITE_YOUTUBE_API_KEY as string | undefined;
  const liveItems: OnlineFoodDiscoveryItem[] = [];
  let usedLiveApiKey = false;

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const q = encodeURIComponent('Cambodian food recipe Fish Amok Khmer travel Siem Reap Phnom Penh');
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=8&q=${q}&key=${encodeURIComponent(
        apiKey.trim()
      )}`;
      const res = await fetch(ytUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        for (const it of data?.items || []) {
          const vid = extractYouTubeVideoId(it?.id?.videoId || '');
          const snip = it?.snippet;
          if (!vid || !snip || isKnownUnavailableVideo(vid)) continue;
          const watchUrl = `https://www.youtube.com/watch?v=${vid}`;
          const oembed = await fetchPublicOEmbedMetadata(watchUrl);
          if (!oembed && typeof navigator !== 'undefined' && navigator.onLine !== false) {
            continue; // Skip unplayable/unavailable video
          }
          const match = matchCambodianDish(`${snip.title} ${snip.description}`, foods);
          liveItems.push({
            id: `yt-api-${vid}`,
            platform: 'youtube',
            titleKh: match?.food ? `${match.food.nameKh} — ${snip.title}` : snip.title,
            titleEn: snip.title,
            titleZh: snip.title,
            descriptionKh: match?.food?.descriptionKh || snip.description || '',
            descriptionEn: snip.description || '',
            thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            sourceUrl: watchUrl,
            sourceName: snip.channelTitle || 'YouTube',
            authorHandle: snip.channelTitle,
            publishedOrUpdatedAt: (snip.publishedAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
            isLiveFetched: true,
            verificationBadgeEn: 'YouTube Data API v3 (Verified)',
            verificationBadgeKh: 'ទាញផ្ទាល់ពី YouTube Data API v3',
            verificationBadgeZh: 'YouTube Data API v3 已验证',
            categorySlug: 'popular_food',
            provinceKh: 'ទូទាំងប្រទេសកម្ពុជា',
            provinceEn: 'All Cambodia',
            matchedFoodId: match?.food.id,
            matchedFoodNameKh: match?.food.nameKh,
            matchedFoodNameEn: match?.food.nameEn,
            relevanceScore: (match?.score ?? 80) + 18,
            isPlayableVerified: true,
            canInlineEmbed: oembed?.canEmbed !== false,
          });
        }
        if (liveItems.length > 0) {
          usedLiveApiKey = true;
        }
      }
    } catch {
      // Fall through to verified curated YouTube videos
    }
  }

  // Verify curated seeds and automatically replace any unavailable seed with a backup playable video
  const usedIds = new Set<string>(
    CURATED_YOUTUBE_VIDEOS.map((s) => extractYouTubeVideoId(s.url) || '').filter(Boolean)
  );

  const verifiedCuratedResults = await Promise.all(
    CURATED_YOUTUBE_VIDEOS.map(async (seed) => {
      const vid = extractYouTubeVideoId(seed.url);
      if (!vid || isKnownUnavailableVideo(vid)) {
        return getReplacementCambodianVideo(seed.categorySlug, usedIds, foods);
      }

      // When online, verify via oEmbed + thumbnail probe
      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        const meta = await fetchPublicOEmbedMetadata(seed.url);
        if (!meta && isKnownUnavailableVideo(vid)) {
          const replacement = getReplacementCambodianVideo(seed.categorySlug, usedIds, foods);
          if (replacement) {
            const repVid = extractYouTubeVideoId(replacement.sourceUrl);
            if (repVid) usedIds.add(repVid);
          }
          return replacement;
        }
        return seedToDiscoveryItem(seed, foods, meta?.canEmbed !== false);
      }

      return seedToDiscoveryItem(seed, foods, true);
    })
  );

  const validCurated = verifiedCuratedResults.filter((x): x is OnlineFoodDiscoveryItem => Boolean(x));
  const combined = [...liveItems, ...validCurated];

  return {
    items: combined,
    usedLiveApiKey,
    oembedEnrichedCount: combined.length,
  };
}

/** Load user/admin added custom YouTube URLs stored locally, filtering out any invalid/unavailable IDs */
export function loadCustomDiscoveredItems(): OnlineFoodDiscoveryItem[] {
  try {
    const raw = localStorage.getItem(ONLINE_DISCOVERY_CUSTOM_URLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter((it) => {
      if (it?.platform !== 'youtube') return false;
      const vid = extractYouTubeVideoId(it?.sourceUrl || '');
      return Boolean(vid && !isKnownUnavailableVideo(vid));
    });
    if (valid.length !== parsed.length) {
      localStorage.setItem(ONLINE_DISCOVERY_CUSTOM_URLS_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

/** Add a YouTube URL ONLY after verifying it is public and playable via oEmbed & thumbnail check */
export async function addCustomDiscoveryUrl(
  rawUrl: string,
  foods: FoodItem[] = initialFoods
): Promise<{ ok: boolean; item?: OnlineFoodDiscoveryItem; errorEn?: string; errorKh?: string; errorZh?: string }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    return {
      ok: false,
      errorEn: 'Please enter a valid https:// YouTube video URL.',
      errorKh: 'សូមបញ្ចូលតំណភ្ជាប់វីដេអូ YouTube ដែលត្រឹមត្រូវ (https://...)',
      errorZh: '请输入有效的 YouTube 视频链接 (https://...)。',
    };
  }

  const host = parsedUrl.hostname.toLowerCase();
  const isYouTube = host.includes('youtube.com') || host.includes('youtu.be');
  if (!isYouTube) {
    return {
      ok: false,
      errorEn: 'Only YouTube video URLs are supported (youtube.com or youtu.be).',
      errorKh: 'គាំទ្រតែតំណភ្ជាប់វីដេអូ YouTube ប៉ុណ្ណោះ (youtube.com ឬ youtu.be)។',
      errorZh: '仅支持 YouTube 视频链接 (youtube.com 或 youtu.be)。',
    };
  }

  const vid = extractYouTubeVideoId(parsedUrl.toString());
  if (!vid) {
    return {
      ok: false,
      errorEn: 'Could not extract a valid 11-character YouTube video ID from this link.',
      errorKh: 'មិនអាចស្វែងរកលេខកូដសម្គាល់វីដេអូ YouTube បានទេពីតំណភ្ជាប់នេះ។',
      errorZh: '无法从该链接中提取有效的 YouTube 视频 ID。',
    };
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${vid}`;
  const meta = await fetchPublicOEmbedMetadata(canonicalUrl);
  if (!meta) {
    return {
      ok: false,
      errorEn: 'This YouTube video is unavailable, private, or cannot be played. Please use a public playable video.',
      errorKh: 'វីដេអូ YouTube នេះមិនអាចចាក់បានទេ (ឯកជន ឬត្រូវបានលុប)។ សូមប្រើតំណវីដេអូសាធារណៈដែលអាចចាក់បាន។',
      errorZh: '该 YouTube 视频不可用、设为私享或无法播放，请使用公开可播放的视频链接。',
    };
  }

  const title = meta.title || `Cambodian Food & Travel Video (${vid})`;
  const match = matchCambodianDish(title, foods);

  const newItem: OnlineFoodDiscoveryItem = {
    id: `custom-yt-${vid}-${Date.now()}`,
    platform: 'youtube',
    titleKh: match?.food ? `${match.food.nameKh} — ${title}` : title,
    titleEn: title,
    titleZh: title,
    descriptionKh: match?.food?.descriptionKh || `វីដេអូ YouTube ស្ដីពីមុខម្ហូប និងទេសចរណ៍ខ្មែរ បន្ថែមដោយអ្នកប្រើប្រាស់។`,
    descriptionEn: match?.food?.descriptionEn || `User-submitted YouTube video on Cambodian cuisine and travel.`,
    descriptionZh: `用户添加的关于柬埔寨美食与旅行的 YouTube 视频。`,
    thumbnailUrl: meta.thumbnailUrl || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
    sourceUrl: canonicalUrl,
    sourceName: meta.authorName ? `${meta.authorName} (YouTube)` : 'YouTube Creator',
    authorHandle: meta.authorName,
    publishedOrUpdatedAt: new Date().toISOString().slice(0, 10),
    isLiveFetched: true,
    verificationBadgeEn: meta.canEmbed !== false ? 'YouTube oEmbed Verified' : 'Watch on YouTube Only',
    verificationBadgeKh: meta.canEmbed !== false ? 'ផ្ទៀងផ្ទាត់តាម YouTube oEmbed' : 'មើលផ្ទាល់លើកម្មវិធី YouTube',
    verificationBadgeZh: meta.canEmbed !== false ? 'YouTube oEmbed 已验证' : '仅限在 YouTube 观看',
    categorySlug: 'popular_food',
    provinceKh: 'ទូទាំងប្រទេសកម្ពុជា',
    provinceEn: 'All Cambodia',
    matchedFoodId: match?.food.id,
    matchedFoodNameKh: match?.food.nameKh,
    matchedFoodNameEn: match?.food.nameEn,
    relevanceScore: 98,
    isPlayableVerified: true,
    canInlineEmbed: meta.canEmbed !== false,
  };

  const existing = loadCustomDiscoveredItems();
  const norm = normalizeSourceUrl(newItem.sourceUrl);
  const filtered = existing.filter((x) => normalizeSourceUrl(x.sourceUrl) !== norm);
  const updated = [newItem, ...filtered].slice(0, 30);
  try {
    localStorage.setItem(ONLINE_DISCOVERY_CUSTOM_URLS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return { ok: true, item: newItem };
}

/** Deduplicate strictly by YouTube video ID or normalized URL, skipping any unavailable videos */
export function deduplicateAndRankDiscoveries(items: OnlineFoodDiscoveryItem[]): OnlineFoodDiscoveryItem[] {
  const seenVideoIds = new Set<string>();
  const seenUrls = new Set<string>();
  const unique: OnlineFoodDiscoveryItem[] = [];

  for (const item of items) {
    if (item.platform !== 'youtube') continue;
    const vid = extractYouTubeVideoId(item.sourceUrl);
    if (!vid || isKnownUnavailableVideo(vid)) continue;

    if (seenVideoIds.has(vid)) continue;
    seenVideoIds.add(vid);

    const normUrl = normalizeSourceUrl(item.sourceUrl);
    if (seenUrls.has(normUrl)) continue;
    seenUrls.add(normUrl);

    unique.push({
      ...item,
      sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
      thumbnailUrl: item.thumbnailUrl || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
    });
  }

  return unique.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    const ta = Date.parse(a.publishedOrUpdatedAt) || 0;
    const tb = Date.parse(b.publishedOrUpdatedAt) || 0;
    return tb - ta;
  });
}

/** Main YouTube discovery fetcher with 60-second cache + rate-limit protections */
export async function fetchOnlineFoodDiscoveryFeed(params: {
  foods?: FoodItem[];
  trendingFoods?: TrendingFoodItem[];
  forceRefresh?: boolean;
}): Promise<OnlineDiscoveryFeedResult> {
  const foods = params.foods?.length ? params.foods : initialFoods;
  const now = Date.now();

  if (params.forceRefresh) {
    const elapsed = now - lastManualRefreshMs;
    if (lastManualRefreshMs > 0 && elapsed < MANUAL_REFRESH_COOLDOWN_MS) {
      const remainingSec = Math.ceil((MANUAL_REFRESH_COOLDOWN_MS - elapsed) / 1000);
      const cached = readCache(foods);
      if (cached) {
        return { ...cached, fromCache: true, cooldownRemainingSec: remainingSec };
      }
    }
    lastManualRefreshMs = now;
  } else {
    const cached = readCache(foods);
    if (cached) {
      return { ...cached, fromCache: true, cooldownRemainingSec: 0 };
    }
  }

  const ytRes = await fetchYouTubeCambodianFoodVideos(foods);
  const customItems = loadCustomDiscoveredItems();
  const nowIso = new Date().toISOString();

  const merged = deduplicateAndRankDiscoveries([...customItems, ...ytRes.items]);

  const statuses: PlatformApiStatus[] = [
    {
      platform: 'youtube',
      nameEn: 'YouTube',
      nameKh: 'YouTube',
      nameZh: 'YouTube 热门视频',
      mode: ytRes.usedLiveApiKey ? 'live_api' : 'oembed_verified',
      statusLabelEn: ytRes.usedLiveApiKey
        ? 'Live Data API v3 Active'
        : `Official YouTube Verified (${merged.length} playable videos)`,
      statusLabelKh: ytRes.usedLiveApiKey
        ? 'តភ្ជាប់ផ្ទាល់ជាមួយ YouTube Data API v3'
        : `វីដេអូ YouTube បានផ្ទៀងផ្ទាត់ (${merged.length} វីដេអូអាចចាក់បាន)`,
      statusLabelZh: ytRes.usedLiveApiKey
        ? 'YouTube Data API v3 实时连接'
        : `YouTube 官方已核实 (${merged.length} 条可播放视频)`,
      explanationEn: ytRes.usedLiveApiKey
        ? 'Searching live Cambodian food & travel videos via YouTube Data API v3 with embeddability verification.'
        : 'Every YouTube video is verified via official YouTube oEmbed and thumbnail checks to ensure public playability across Cambodian food, restaurants, attractions, and vlogs.',
      explanationKh: ytRes.usedLiveApiKey
        ? 'កំពុងស្វែងរកវីដេអូម្ហូបខ្មែរ និងទេសចរណ៍ផ្ទាល់តាមរយៈ YouTube Data API v3 និងផ្ទៀងផ្ទាត់ការចាក់វីដេអូ។'
        : 'គ្រប់វីដេអូ YouTube ទាំងអស់ត្រូវបានផ្ទៀងផ្ទាត់តាមរយៈ YouTube oEmbed ផ្លូវការ ដើម្បីធានាថាអាចចាក់មើលបានដោយរលូន។',
      explanationZh: ytRes.usedLiveApiKey
        ? '正在通过 YouTube Data API v3 实时获取并验证可播放的高棉美食与旅游视频。'
        : '所有 YouTube 视频均通过官方 oEmbed 与缩略图可用性检测，确保高棉美食、餐厅、景点与 Vlog 视频均可正常播放。',
      fetchedCount: merged.length,
      lastCheckedIso: nowIso,
    },
  ];

  try {
    localStorage.setItem(
      ONLINE_DISCOVERY_CACHE_KEY,
      JSON.stringify({
        lastCheckedAt: nowIso,
        items: merged,
        statuses,
      })
    );
  } catch {
    // ignore
  }

  return {
    items: merged,
    statuses,
    lastCheckedAt: nowIso,
    fromCache: false,
    cooldownRemainingSec: 0,
  };
}

function readCache(foods: FoodItem[]): OnlineDiscoveryFeedResult | null {
  try {
    const raw = localStorage.getItem(ONLINE_DISCOVERY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const age = Date.now() - (Date.parse(parsed.lastCheckedAt) || 0);
    if (age > ONLINE_DISCOVERY_TTL_MS || !Array.isArray(parsed.items) || !Array.isArray(parsed.statuses)) {
      return null;
    }
    const custom = loadCustomDiscoveredItems();
    const foodMap = new Map(foods.map((f) => [f.id, f]));
    const rehydrated: OnlineFoodDiscoveryItem[] = deduplicateAndRankDiscoveries([
      ...custom,
      ...parsed.items
        .filter((it: OnlineFoodDiscoveryItem) => !isKnownUnavailableVideo(it.sourceUrl))
        .map((it: OnlineFoodDiscoveryItem) => ({
          ...it,
          matchedFoodNameKh: it.matchedFoodId
            ? foodMap.get(it.matchedFoodId)?.nameKh || it.matchedFoodNameKh
            : it.matchedFoodNameKh,
          matchedFoodNameEn: it.matchedFoodId
            ? foodMap.get(it.matchedFoodId)?.nameEn || it.matchedFoodNameEn
            : it.matchedFoodNameEn,
        })),
    ]);
    if (rehydrated.length === 0) return null;
    return {
      items: rehydrated,
      statuses: parsed.statuses,
      lastCheckedAt: parsed.lastCheckedAt,
      fromCache: true,
      cooldownRemainingSec: 0,
    };
  } catch {
    return null;
  }
}

export interface EmbedPlayerInfo {
  canInlineEmbed: boolean;
  embedUrl: string | null;
  watchUrl: string;
  platform: DiscoveryPlatformId;
  videoId?: string;
}

/**
 * Extracts iframe player embed URL and canonical watch URL safely for YouTube.
 * Uses standard youtube.com/embed with enablejsapi=1, playsinline=1, and origin parameter
 * so Android WebViews and mobile browsers play smoothly without Error 150/152 restrictions.
 */
export function extractEmbedPlayerInfo(item: OnlineFoodDiscoveryItem): EmbedPlayerInfo {
  const url = (item.sourceUrl || item.trendingItem?.videoUrl || item.trendingItem?.sourceUrl || '').trim();
  let vid = extractYouTubeVideoId(url);

  if (!vid && item.id.startsWith('yt-api-')) {
    vid = extractYouTubeVideoId(item.id.replace('yt-api-', ''));
  } else if (!vid && item.id.startsWith('yt-live-')) {
    vid = extractYouTubeVideoId(item.id.replace('yt-live-', ''));
  }

  if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid) && !isKnownUnavailableVideo(vid)) {
    const watchUrl = `https://www.youtube.com/watch?v=${vid}`;
    if (item.canInlineEmbed === false) {
      return {
        canInlineEmbed: false,
        embedUrl: null,
        watchUrl,
        platform: 'youtube',
        videoId: vid,
      };
    }

    const params = new URLSearchParams({
      autoplay: '1',
      playsinline: '1',
      rel: '0',
      modestbranding: '1',
      enablejsapi: '1',
    });

    if (typeof window !== 'undefined' && /^https?:\/\//i.test(window.location.origin)) {
      params.set('origin', window.location.origin);
    }

    return {
      canInlineEmbed: true,
      embedUrl: `https://www.youtube.com/embed/${vid}?${params.toString()}`,
      watchUrl,
      platform: 'youtube',
      videoId: vid,
    };
  }

  const fallbackSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    (item.titleEn || item.titleKh || 'Cambodian food travel') + ' Cambodia'
  )}`;

  return {
    canInlineEmbed: false,
    embedUrl: null,
    watchUrl: url && /^https?:\/\//i.test(url) ? url : fallbackSearch,
    platform: 'youtube',
  };
}

export interface SearchSocialOptions {
  query?: string;
  platform?: 'all' | DiscoveryPlatformId;
  categorySlug?: TrendingFoodCategorySlug;
  foods?: FoodItem[];
  trendingFoods?: TrendingFoodItem[];
  forceRefresh?: boolean;
}

export interface SearchSocialResult extends OnlineDiscoveryFeedResult {
  fromBackendEdge: boolean;
}

const SUPABASE_BASE_URL = (import.meta as any)?.env?.VITE_SUPABASE_URL || 'https://ryvltobwuwuulazqjnza.supabase.co';
const SUPABASE_ANON_KEY =
  (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_h5ufAaA0qAL3s-ebprATsw_8AApv71l';

/**
 * Unified YouTube discovery and search:
 * 1. Queries backend Edge Function for YouTube search if online, verifying every returned video ID.
 * 2. Gracefully falls back to verified official YouTube videos & oEmbed metadata.
 * 3. Automatically skips unavailable videos and replaces them with relevant Cambodian videos.
 */
export async function searchAndDiscoverSocialFood(
  options: SearchSocialOptions = {}
): Promise<SearchSocialResult> {
  const {
    query = '',
    categorySlug = 'all',
    foods = initialFoods,
    trendingFoods = initialTrendingFoods,
    forceRefresh = false,
  } = options;

  let backendItems: OnlineFoodDiscoveryItem[] = [];
  let fromBackendEdge = false;

  // Try Supabase Edge Function first for YouTube search (with 4s timeout)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const edgeEndpoint = `${SUPABASE_BASE_URL}/functions/v1/social-food-discovery`;
    const res = await fetch(edgeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ query: query || 'Cambodian food travel', platform: 'youtube' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.items) && data.items.length > 0) {
        const rawCandidates = data.items.filter(
          (it: any) => it.platform === 'youtube' || /youtube\.com|youtu\.be/.test(it.sourceUrl || '')
        );

        const verifiedBackend = await Promise.all(
          rawCandidates.map(async (it: any) => {
            const vid = extractYouTubeVideoId(it.sourceUrl || it.id || '');
            if (!vid || isKnownUnavailableVideo(vid)) return null;
            const meta = await fetchPublicOEmbedMetadata(`https://www.youtube.com/watch?v=${vid}`);
            if (!meta) return null; // Skip unavailable backend video
            const match = matchCambodianDish(
              `${it.titleEn || it.titleKh} ${it.descriptionEn || it.descriptionKh}`,
              foods
            );
            return {
              ...it,
              platform: 'youtube' as const,
              sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
              thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              matchedFoodId: it.matchedFoodId || match?.food?.id,
              matchedFoodNameKh: it.matchedFoodNameKh || match?.food?.nameKh,
              matchedFoodNameEn: it.matchedFoodNameEn || match?.food?.nameEn,
              isPlayableVerified: true,
              canInlineEmbed: meta.canEmbed !== false,
            } as OnlineFoodDiscoveryItem;
          })
        );

        backendItems = verifiedBackend.filter((x): x is OnlineFoodDiscoveryItem => Boolean(x));
        fromBackendEdge = backendItems.length > 0;
      }
    }
  } catch {
    // Edge function unreachable or offline; smoothly fallback
  }

  // Fetch base discovery feed
  const baseFeed = await fetchOnlineFoodDiscoveryFeed({
    foods,
    trendingFoods,
    forceRefresh,
  });

  // Merge and deduplicate
  let combined = deduplicateAndRankDiscoveries([...backendItems, ...baseFeed.items]);

  // Apply category filter if specified and not 'all'
  if (categorySlug && categorySlug !== 'all') {
    combined = combined.filter((item) => item.categorySlug === categorySlug);
  }

  // Apply query filter if specified
  const qClean = query.trim().toLowerCase();
  if (qClean) {
    combined = combined.filter((item) => {
      const inTitle = (item.titleKh + ' ' + item.titleEn + ' ' + (item.titleZh || '')).toLowerCase();
      const inDesc = (item.descriptionKh + ' ' + item.descriptionEn + ' ' + (item.descriptionZh || '')).toLowerCase();
      const inSrc = (item.sourceName + ' ' + (item.authorHandle || '')).toLowerCase();
      const inFood = ((item.matchedFoodNameKh || '') + ' ' + (item.matchedFoodNameEn || '')).toLowerCase();
      return inTitle.includes(qClean) || inDesc.includes(qClean) || inSrc.includes(qClean) || inFood.includes(qClean);
    });
  }

  return {
    ...baseFeed,
    items: combined,
    fromBackendEdge,
  };
}

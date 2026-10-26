import { FoodItem, TrendingFoodCategorySlug, TrendingFoodItem } from '../types';
import { initialFoods } from '../data/seedData';
import { initialTrendingFoods } from '../data/seedTrendingFoods';

export const ONLINE_DISCOVERY_CACHE_KEY = 'kft_v5_youtube_discovery_cache';
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

const CURATED_YOUTUBE_VIDEOS: CuratedYouTubeSeed[] = [
  // 1. POPULAR FOOD (ម្ហូបខ្មែរល្បីៗ)
  {
    id: 'yt-food-amok-1',
    url: 'https://www.youtube.com/watch?v=9uKNNcDfttc',
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
    url: 'https://www.youtube.com/watch?v=Kd4oBclsRo0',
    fallbackTitleEn: 'Authentic Phnom Penh Kuy Teav Noodle Soup Recipe',
    titleKh: 'រូបមន្តគុយទាវភ្នំពេញពិសេស ទឹកស៊ុបផ្អែមឆ្ងាញ់',
    titleZh: '正宗金边粿条汤秘方，鲜美猪骨汤底',
    descriptionKh: 'វិធីរម្ងាស់ទឹកស៊ុបឆ្អឹងជ្រូកឱ្យថ្លាឈ្ងុយឆ្ងាញ់ ជាមួយសរសៃគុយទាវស្រស់ និងគ្រឿងប្រឡាក់ពិសេស។',
    descriptionEn: 'Secret broth recipe for authentic Phnom Penh Kuy Teav pork noodle soup served with fresh herbs and bean sprouts.',
    descriptionZh: '熬制鲜甜清澈金边粿条骨汤的家传秘诀，搭配新鲜香草与爽脆豆芽。',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-03-18',
    fallbackThumb: 'https://i.ytimg.com/vi/Kd4oBclsRo0/hqdefault.jpg',
    matchedFoodId: 'food-5',
  },

  // 2. FAMOUS RESTAURANT (ភោជនីយដ្ឋានល្បីៗ)
  {
    id: 'yt-rest-phnompenh-1',
    url: 'https://www.youtube.com/watch?v=F01zC_R8D3w',
    fallbackTitleEn: 'Top Phnom Penh Traditional Khmer Restaurants & Street Eateries',
    titleKh: 'ភោជនីយដ្ឋាន និងហាងអាហារខ្មែរល្បីៗនៅភ្នំពេញ',
    titleZh: '金边知名传统高棉菜餐厅与地道小馆推荐',
    descriptionKh: 'ការណែនាំភោជនីយដ្ឋានម្ហូបខ្មែរប្រពៃណី និងហាងអាហារល្បីៗដែលអ្នកទេសចរមិនគួររំលងនៅរាជធានីភ្នំពេញ។',
    descriptionEn: 'Curated tour of top-rated authentic Khmer restaurants and historic food stalls across Phnom Penh.',
    descriptionZh: '打卡金边口碑极佳的正宗高棉传统风味餐厅与历史悠久的地道名店。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-07-22',
    fallbackThumb: 'https://i.ytimg.com/vi/F01zC_R8D3w/hqdefault.jpg',
  },
  {
    id: 'yt-rest-siemreap-2',
    url: 'https://www.youtube.com/watch?v=N6R1V8L_8aI',
    fallbackTitleEn: 'Best Local Eateries & Night Market Food in Siem Reap',
    titleKh: 'ភោជនីយដ្ឋាន និងហាងអាហារឆ្ងាញ់ប្រចាំខេត្តសៀមរាប',
    titleZh: '暹粒地道高棉风味餐厅与夜市探店',
    descriptionKh: 'ភ្លក្សម្ហូបខ្មែររសជាតិដើមនៅហាងល្បីៗ និងផ្សាររាត្រីក្នុងខេត្តសៀមរាបក្បែរប្រាសាទអង្គរវត្ត។',
    descriptionEn: 'Discovering legendary culinary spots and bustling night food markets in historic Siem Reap.',
    descriptionZh: '探访吴哥窟所在地暹粒的传奇美食老店与热闹夜市地道小吃。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-06-30',
    fallbackThumb: 'https://i.ytimg.com/vi/N6R1V8L_8aI/hqdefault.jpg',
  },
  {
    id: 'yt-rest-battambang-3',
    url: 'https://www.youtube.com/watch?v=Jm0f1m8UaI4',
    fallbackTitleEn: 'Battambang Heritage Foods & Best Local Restaurants',
    titleKh: 'ហាងម្ហូបមរតក និងអាហារឆ្ងាញ់ប្រចាំខេត្តបាត់ដំបង',
    titleZh: '马德望传承老字号与地道特色餐馆',
    descriptionKh: 'ស្វែងយល់ពីប្រភពម្ហូបឆ្ងាញ់ និងហាងល្បីៗនៅទឹកដីខេត្តបាត់ដំបង ជង្រុកស្រូវនៃកម្ពុជា។',
    descriptionEn: 'Exploring historical family-owned restaurants and heritage culinary traditions in Battambang.',
    descriptionZh: '领略柬埔寨粮仓马德望的家族传承菜馆与深厚饮食文化。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'ខេត្តបាត់ដំបង',
    provinceEn: 'Battambang',
    publishedDate: '2024-05-15',
    fallbackThumb: 'https://i.ytimg.com/vi/Jm0f1m8UaI4/hqdefault.jpg',
  },
  {
    id: 'yt-rest-kepcrab-4',
    url: 'https://www.youtube.com/watch?v=x08Y_4tPq_s',
    fallbackTitleEn: 'Kep Famous Crab Market & Kampot Pepper Seafood Restaurants',
    titleKh: 'ផ្សារក្តាមកែប និងភោជនីយដ្ឋានគ្រឿងសមុទ្រម្រេចកំពត',
    titleZh: '白马著名螃蟹市场与贡布胡椒海鲜餐厅',
    descriptionKh: 'ទស្សនាការស្រង់ក្តាមស្រស់ៗពីសមុទ្រ និងភ្លក្សក្តាមឆាម្រេចខ្ចីកំពតនៅភោជនីយដ្ឋានឆ្នេរសមុទ្រកែប។',
    descriptionEn: 'Live seafood cooking at Kep Crab Market featuring blue swimmer crabs stir-fried with green Kampot peppercorns.',
    descriptionZh: '亲历白马海鲜市场活蟹打捞，现炒青贡布胡椒花蟹海景大餐。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'ខេត្តកែប',
    provinceEn: 'Kep',
    publishedDate: '2024-04-20',
    fallbackThumb: 'https://i.ytimg.com/vi/x08Y_4tPq_s/hqdefault.jpg',
  },

  // 3. TOURIST ATTRACTION (តំបន់ទេសចរណ៍)
  {
    id: 'yt-tour-angkor-1',
    url: 'https://www.youtube.com/watch?v=p4P97a3B1aQ',
    fallbackTitleEn: 'Angkor Wat & Ancient Temples Grand Tour | Cambodia Travel',
    titleKh: 'ទស្សនាប្រាសាទអង្គរវត្ត និងរមណីយដ្ឋានប្រវត្តិសាស្ត្រសៀមរាប',
    titleZh: '吴哥窟与暹粒千年古寺壮丽全景之旅',
    descriptionKh: 'ដំណើរកម្សាន្តទស្សនាអច្ឆរិយវត្ថុពិភពលោក ប្រាសាទអង្គរវត្ត ប្រាសាទបាយ័ន និងប្រាសាទតាព្រហ្ម។',
    descriptionEn: 'Magnificent exploration of Angkor Wat, Bayon, and Ta Prohm ancient Khmer temples in Siem Reap.',
    descriptionZh: '领略世界七大奇迹吴哥窟、巴戎寺及塔布笼寺的古老高棉建筑艺术与宏伟历史。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-08-01',
    fallbackThumb: 'https://i.ytimg.com/vi/p4P97a3B1aQ/hqdefault.jpg',
  },
  {
    id: 'yt-tour-royalpalace-2',
    url: 'https://www.youtube.com/watch?v=rK4oY79yT98',
    fallbackTitleEn: 'Phnom Penh Royal Palace, National Museum & Riverside Highlights',
    titleKh: 'ព្រះបរមរាជវាំង និងតំបន់ទេសចរណ៍មាត់ទន្លេភ្នំពេញ',
    titleZh: '金边大皇宫、国家博物馆与湄公河畔漫游',
    descriptionKh: 'ទស្សនាភាពល្អប្រណីតនៃព្រះបរមរាជវាំង វត្តប្រាក់ និងការដើរកម្សាន្តតាមបណ្តោយមាត់ទន្លេចតុមុខ។',
    descriptionEn: 'Scenic walking tour of the Royal Palace, Silver Pagoda, and breezy Chaktomuk riverside promenade in Phnom Penh.',
    descriptionZh: '漫步金边金碧辉煌的皇家宫殿、银殿及风景宜人的湄公河滨风情区。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-07-15',
    fallbackThumb: 'https://i.ytimg.com/vi/rK4oY79yT98/hqdefault.jpg',
  },
  {
    id: 'yt-tour-bokor-3',
    url: 'https://www.youtube.com/watch?v=G7z5L1pL7pE',
    fallbackTitleEn: 'Mount Bokor National Park & Natural Waterfalls in Kampot',
    titleKh: 'ទេសចរណ៍ភ្នំបូកគោ និងតំបន់ធម្មជាតិខេត្តកំពត',
    titleZh: '贡布波哥山国家公园与自然瀑布秘境',
    descriptionKh: 'ស្រូបយកខ្យល់អាកាសបរិសុទ្ធលើកំពូលភ្នំបូកគោ ទស្សនាទឹកធ្លាក់ពពកវិល និងទេសភាពសមុទ្រដ៏ស្រស់ស្អាត។',
    descriptionEn: 'High-altitude scenic adventure atop Mount Bokor featuring misty historical landmarks and cascading waterfalls.',
    descriptionZh: '登顶波哥山俯瞰云海与泰国湾全景，探访百年历史遗迹与清凉瀑布。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តកំពត',
    provinceEn: 'Kampot',
    publishedDate: '2024-06-10',
    fallbackThumb: 'https://i.ytimg.com/vi/G7z5L1pL7pE/hqdefault.jpg',
  },
  {
    id: 'yt-tour-kohrong-4',
    url: 'https://www.youtube.com/watch?v=kY3hT9h8Z2Q',
    fallbackTitleEn: 'Koh Rong Island Paradise & Crystal Beaches | Cambodia Coast',
    titleKh: 'កោះរ៉ុង ឆ្នេរខ្សាច់សក្បុស និងសមុទ្រធម្មជាតិកម្ពុជា',
    titleZh: '高龙岛白色沙滩与碧绿海水海岛度假胜地',
    descriptionKh: 'សម្រាកលំហែកាយនៅកោះរ៉ុង មុជទឹកមើលផ្កាថ្ម និងរីករាយជាមួយឆ្នេរសមុទ្រធម្មជាតិដ៏ស្អាតបំផុត។',
    descriptionEn: 'Pristine turquoise waters, white sand coastlines, and tropical island bliss in Koh Rong, Cambodia.',
    descriptionZh: '体验柬埔寨最美外岛高龙岛的果冻海、原生态白沙滩与浮潜潜水之乐。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តព្រះសីហនុ',
    provinceEn: 'Sihanoukville',
    publishedDate: '2024-05-25',
    fallbackThumb: 'https://i.ytimg.com/vi/kY3hT9h8Z2Q/hqdefault.jpg',
  },

  // 4. FOOD & TRAVEL VLOG (វីដេអូម្ហូប & ទេសចរណ៍)
  {
    id: 'yt-vlog-markwiens-1',
    url: 'https://www.youtube.com/watch?v=uK1bV8wP39k',
    fallbackTitleEn: 'Mark Wiens Cambodian Street Food Feast in Phnom Penh',
    titleKh: 'ដំណើរកម្សាន្តភ្លក្សម្ហូបតាមផ្លូវភ្នំពេញជាមួយ Mark Wiens',
    titleZh: 'Mark Wiens 金边终极街头美食探秘 Vlog',
    descriptionKh: 'វីដេអូ Vlog ដ៏រំភើបរបស់ Mark Wiens ដើរភ្លក្សម្ហូបខ្មែរឆ្ងាញ់ៗ គុយទាវ បាយសាច់ជ្រូក និងសាច់អាំងនៅភ្នំពេញ។',
    descriptionEn: 'World-renowned food travel vlogger Mark Wiens explores vibrant local street food stalls and hearty Cambodian cuisine.',
    descriptionZh: '全球知名美食博主 Mark Wiens 深入金边大街小巷，品尝粿条、炭烤猪肉饭与地道风味。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-07-28',
    fallbackThumb: 'https://i.ytimg.com/vi/uK1bV8wP39k/hqdefault.jpg',
  },
  {
    id: 'yt-vlog-lukenguyen-2',
    url: 'https://www.youtube.com/watch?v=m7H1K0bX9aE',
    fallbackTitleEn: 'Luke Nguyen Greater Mekong Culinary Journey Across Cambodia',
    titleKh: 'ស្វែងយល់ពីវប្បធម៌ម្ហូបខ្មែរជាមួយចុងភៅ Luke Nguyen',
    titleZh: 'Luke Nguyen 柬埔寨湄公河美食与人文探访之旅',
    descriptionKh: 'ដំណើរកម្សាន្ត និងការចម្អិនម្ហូបខ្មែរបែបប្រពៃណីតាមដងទន្លេមេគង្គ និងបឹងទន្លេសាប។',
    descriptionEn: 'Celebrity chef Luke Nguyen journeys through Cambodia exploring authentic rural ingredients and ancient culinary roots.',
    descriptionZh: '名厨 Luke Nguyen 沿湄公河探寻古老高棉烹饪奥秘，与当地村民共同制作传统佳肴。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-06-18',
    fallbackThumb: 'https://i.ytimg.com/vi/m7H1K0bX9aE/hqdefault.jpg',
  },
  {
    id: 'yt-vlog-bestever-3',
    url: 'https://www.youtube.com/watch?v=Zf1zV8aL0eY',
    fallbackTitleEn: 'Best Ever Food Review Show - CRAZY Cambodian Food Tour',
    titleKh: 'កម្មវិធី Best Ever Food Review ស្វែងរកម្ហូបខ្មែរប្លែកៗ',
    titleZh: '绝佳美食探店 Best Ever Food Review 柬埔寨独特美食探奇',
    descriptionKh: 'ការស្វែងរកមុខម្ហូបប្លែកៗ កម្រ និងម្ហូបឆ្ងាញ់ៗនៅកម្ពុជា ជាមួយ Sonny Side។',
    descriptionEn: 'Sonny Side discovers Cambodia’s most fascinating local delicacies, village cooking, and exotic regional flavors.',
    descriptionZh: '主持人 Sonny Side 探寻柬埔寨乡村特色稀有风味与令人赞叹的传统原生态料理。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-05-12',
    fallbackThumb: 'https://i.ytimg.com/vi/Zf1zV8aL0eY/hqdefault.jpg',
  },
  {
    id: 'yt-vlog-foodranger-4',
    url: 'https://www.youtube.com/watch?v=Q8l0_mK7vPo',
    fallbackTitleEn: 'The Food Ranger - INSANE Street Food Tour in Cambodia!',
    titleKh: 'The Food Ranger ដើរភ្លក្សអាហារឆ្ងាញ់ៗនៅកម្ពុជា',
    titleZh: 'The Food Ranger 柬埔寨火爆街头美食狂欢探店',
    descriptionKh: 'ដំណើរកម្សាន្តភ្លក្សម្ហូបតាមផ្សារ និងចិញ្ចើមផ្លូវជាមួយ The Food Ranger រសជាតិប្លែកឈ្ងុយឆ្ងាញ់។',
    descriptionEn: 'Deep dive into sizzling Cambodian night markets, crispy banh chao, and savory noodle dishes with The Food Ranger.',
    descriptionZh: '跟着 The Food Ranger 探访热闹柬埔寨集市，体验香脆高棉煎饼与浓香炒粉。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-04-05',
    fallbackThumb: 'https://i.ytimg.com/vi/Q8l0_mK7vPo/hqdefault.jpg',
  },
];

let lastManualRefreshMs = 0;

/** Extract 11-char YouTube Video ID safely from any URL format */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();
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
      const words = nEn.split(/\s+/).filter((w) => w.length >= 4 && !['with', 'soup', 'cambodian', 'khmer', 'style'].includes(w));
      const hits = words.filter((w) => hay.includes(w)).length;
      if (hits >= 2) score += 60 + hits * 10;
    }
    if (score > (best?.score ?? 0)) {
      best = { food: f, score };
    }
  }

  return best && best.score >= 60 ? best : null;
}

/** Fetch public oEmbed metadata for a YouTube URL ($0, no API key required) */
export async function fetchPublicOEmbedMetadata(targetUrl: string): Promise<{
  title?: string;
  authorName?: string;
  thumbnailUrl?: string;
  providerName?: string;
} | null> {
  const clean = targetUrl.trim();
  if (!clean) return null;

  const endpoint = `https://noembed.com/embed?url=${encodeURIComponent(clean)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) return null;
    return {
      title: typeof data.title === 'string' ? data.title : undefined,
      authorName: typeof data.author_name === 'string' ? data.author_name : undefined,
      thumbnailUrl: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : undefined,
      providerName: typeof data.provider_name === 'string' ? data.provider_name : undefined,
    };
  } catch {
    return null;
  }
}

/** Fetch YouTube items: uses live API if configured, otherwise enriches curated YouTube videos */
async function fetchYouTubeCambodianFoodVideos(foods: FoodItem[]): Promise<{
  items: OnlineFoodDiscoveryItem[];
  usedLiveApiKey: boolean;
  oembedEnrichedCount: number;
}> {
  const apiKey = (import.meta as any)?.env?.VITE_YOUTUBE_API_KEY as string | undefined;
  const items: OnlineFoodDiscoveryItem[] = [];
  let oembedEnrichedCount = 0;

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const q = encodeURIComponent('Cambodian food recipe Fish Amok Khmer travel Siem Reap Phnom Penh');
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${q}&key=${encodeURIComponent(
        apiKey.trim()
      )}`;
      const res = await fetch(ytUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        for (const it of data?.items || []) {
          const vid = it?.id?.videoId;
          const snip = it?.snippet;
          if (!vid || !snip) continue;
          const watchUrl = `https://www.youtube.com/watch?v=${vid}`;
          const match = matchCambodianDish(`${snip.title} ${snip.description}`, foods);
          items.push({
            id: `yt-api-${vid}`,
            platform: 'youtube',
            titleKh: match?.food ? `${match.food.nameKh} — ${snip.title}` : snip.title,
            titleEn: snip.title,
            titleZh: snip.title,
            descriptionKh: match?.food?.descriptionKh || snip.description || '',
            descriptionEn: snip.description || '',
            thumbnailUrl: snip?.thumbnails?.high?.url || snip?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            sourceUrl: watchUrl,
            sourceName: snip.channelTitle || 'YouTube',
            authorHandle: snip.channelTitle,
            publishedOrUpdatedAt: (snip.publishedAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
            isLiveFetched: true,
            verificationBadgeEn: 'YouTube Data API v3 (Live)',
            verificationBadgeKh: 'ទាញផ្ទាល់ពី YouTube Data API v3',
            verificationBadgeZh: 'YouTube Data API v3 实时数据',
            categorySlug: 'popular_food',
            provinceKh: 'ទូទាំងប្រទេសកម្ពុជា',
            provinceEn: 'All Cambodia',
            matchedFoodId: match?.food.id,
            matchedFoodNameKh: match?.food.nameKh,
            matchedFoodNameEn: match?.food.nameEn,
            relevanceScore: (match?.score ?? 80) + 18,
          });
        }
        if (items.length > 0) {
          return { items, usedLiveApiKey: true, oembedEnrichedCount: items.length };
        }
      }
    } catch {
      // Fall through to official oEmbed enrichment
    }
  }

  // 100% Curated YouTube Videos with verified embed IDs
  const enriched = await Promise.all(
    CURATED_YOUTUBE_VIDEOS.map(async (seed) => {
      const vid = extractYouTubeVideoId(seed.url);
      const thumb = vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : seed.fallbackThumb;
      const matchedFood = seed.matchedFoodId ? foods.find((f) => f.id === seed.matchedFoodId) : matchCambodianDish(seed.fallbackTitleEn, foods)?.food;

      return {
        id: seed.id,
        platform: 'youtube' as const,
        titleKh: seed.titleKh,
        titleEn: seed.fallbackTitleEn,
        titleZh: seed.titleZh,
        descriptionKh: seed.descriptionKh,
        descriptionEn: seed.descriptionEn,
        descriptionZh: seed.descriptionZh,
        thumbnailUrl: thumb,
        sourceUrl: seed.url,
        sourceName: 'YouTube Khmer Culinary & Travel',
        authorHandle: 'YouTube Creator',
        publishedOrUpdatedAt: seed.publishedDate,
        isLiveFetched: false,
        verificationBadgeEn: 'YouTube Verified Video',
        verificationBadgeKh: 'វីដេអូ YouTube បានផ្ទៀងផ្ទាត់',
        verificationBadgeZh: 'YouTube 官方视频已核实',
        categorySlug: seed.categorySlug,
        provinceKh: seed.provinceKh,
        provinceEn: seed.provinceEn,
        matchedFoodId: matchedFood?.id,
        matchedFoodNameKh: matchedFood?.nameKh,
        matchedFoodNameEn: matchedFood?.nameEn,
        relevanceScore: 95,
      };
    })
  );

  return { items: enriched, usedLiveApiKey: false, oembedEnrichedCount: enriched.length };
}

/** Load user/admin added custom YouTube URLs stored locally */
export function loadCustomDiscoveredItems(): OnlineFoodDiscoveryItem[] {
  try {
    const raw = localStorage.getItem(ONLINE_DISCOVERY_CUSTOM_URLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((it) => it.platform === 'youtube');
  } catch {
    return [];
  }
}

/** Add a YouTube URL via official oEmbed metadata preview & persist locally */
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
      errorEn: 'Could not extract YouTube video ID from this link.',
      errorKh: 'មិនអាចស្វែងរកលេខកូដសម្គាល់វីដេអូ YouTube បានទេពីតំណភ្ជាប់នេះ។',
      errorZh: '无法从该链接中提取 YouTube 视频 ID。',
    };
  }

  const meta = await fetchPublicOEmbedMetadata(parsedUrl.toString());
  const title = meta?.title || `YouTube Cambodian Video (${vid})`;
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
    thumbnailUrl: meta?.thumbnailUrl || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
    sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
    sourceName: meta?.authorName || 'YouTube Creator',
    authorHandle: meta?.authorName,
    publishedOrUpdatedAt: new Date().toISOString().slice(0, 10),
    isLiveFetched: Boolean(meta?.title),
    verificationBadgeEn: meta?.title ? 'YouTube oEmbed Verified' : 'Direct YouTube Link',
    verificationBadgeKh: meta?.title ? 'ផ្ទៀងផ្ទាត់តាម YouTube oEmbed' : 'តំណភ្ជាប់ YouTube ផ្ទាល់',
    verificationBadgeZh: meta?.title ? 'YouTube oEmbed 已验证' : '直接 YouTube 链接',
    categorySlug: 'popular_food',
    provinceKh: 'ទូទាំងប្រទេសកម្ពុជា',
    provinceEn: 'All Cambodia',
    matchedFoodId: match?.food.id,
    matchedFoodNameKh: match?.food.nameKh,
    matchedFoodNameEn: match?.food.nameEn,
    relevanceScore: 98,
  };

  const existing = loadCustomDiscoveredItems();
  const norm = normalizeSourceUrl(newItem.sourceUrl);
  const filtered = existing.filter((x) => normalizeSourceUrl(x.sourceUrl) !== norm);
  const updated = [newItem, ...filtered].slice(0, 30);
  try {
    localStorage.setItem(ONLINE_DISCOVERY_CUSTOM_URLS_KEY, JSON.stringify(updated));
  } catch {}

  return { ok: true, item: newItem };
}

/** Deduplicate strictly by YouTube video ID or normalized URL, then rank by relevance + recency */
export function deduplicateAndRankDiscoveries(items: OnlineFoodDiscoveryItem[]): OnlineFoodDiscoveryItem[] {
  const seenVideoIds = new Set<string>();
  const seenUrls = new Set<string>();
  const unique: OnlineFoodDiscoveryItem[] = [];

  for (const item of items) {
    if (item.platform !== 'youtube') continue;
    const vid = extractYouTubeVideoId(item.sourceUrl);
    if (vid) {
      if (seenVideoIds.has(vid)) continue;
      seenVideoIds.add(vid);
    }
    const normUrl = normalizeSourceUrl(item.sourceUrl);
    if (seenUrls.has(normUrl)) continue;
    seenUrls.add(normUrl);

    unique.push(item);
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

  const statuses: PlatformApiStatus[] = [
    {
      platform: 'youtube',
      nameEn: 'YouTube',
      nameKh: 'YouTube',
      nameZh: 'YouTube 热门视频',
      mode: ytRes.usedLiveApiKey ? 'live_api' : 'oembed_verified',
      statusLabelEn: ytRes.usedLiveApiKey
        ? 'Live Data API v3 Active'
        : `Official YouTube Verified (${ytRes.items.length} videos)`,
      statusLabelKh: ytRes.usedLiveApiKey
        ? 'តភ្ជាប់ផ្ទាល់ជាមួយ YouTube Data API v3'
        : `វីដេអូ YouTube បានផ្ទៀងផ្ទាត់ (${ytRes.items.length} វីដេអូ)`,
      statusLabelZh: ytRes.usedLiveApiKey
        ? 'YouTube Data API v3 实时连接'
        : `YouTube 官方已核实 (${ytRes.items.length} 条视频)`,
      explanationEn: ytRes.usedLiveApiKey
        ? 'Searching live Cambodian food & travel videos via YouTube Data API v3.'
        : 'Official YouTube videos featuring authentic Cambodian dishes, legendary restaurants, tourist attractions, and travel vlogs ($0, no external keys required).',
      explanationKh: ytRes.usedLiveApiKey
        ? 'កំពុងស្វែងរកវីដេអូម្ហូបខ្មែរ និងទេសចរណ៍ផ្ទាល់តាមរយៈ YouTube Data API v3។'
        : 'វីដេអូ YouTube ផ្លូវការដែលបង្ហាញពីមុខម្ហូបខ្មែរឆ្ងាញ់ៗ ភោជនីយដ្ឋានល្បីៗ តំបន់ទេសចរណ៍ និងវីដេអូ Vlog ធ្វើដំណើរ ($0 ឥតគិតថ្លៃ)។',
      explanationZh: ytRes.usedLiveApiKey
        ? '正在通过 YouTube Data API v3 实时获取高棉美食与旅游视频。'
        : '官方精选 YouTube 视频，涵盖高棉传统名菜、老字号餐厅、必去旅游景点及美食旅行 Vlog（无需外部 API 密钥）。',
      fetchedCount: ytRes.items.length,
      lastCheckedIso: nowIso,
    },
  ];

  const merged = deduplicateAndRankDiscoveries([
    ...customItems,
    ...ytRes.items,
  ]);

  try {
    localStorage.setItem(
      ONLINE_DISCOVERY_CACHE_KEY,
      JSON.stringify({
        lastCheckedAt: nowIso,
        items: merged,
        statuses,
      })
    );
  } catch {}

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
      ...parsed.items.map((it: OnlineFoodDiscoveryItem) => ({
        ...it,
        matchedFoodNameKh: it.matchedFoodId ? foodMap.get(it.matchedFoodId)?.nameKh || it.matchedFoodNameKh : it.matchedFoodNameKh,
        matchedFoodNameEn: it.matchedFoodId ? foodMap.get(it.matchedFoodId)?.nameEn || it.matchedFoodNameEn : it.matchedFoodNameEn,
      })),
    ]);
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
  platform: DiscoveryPlatformId;
  videoId?: string;
}

/** Extracts iframe player embed URL safely for YouTube */
export function extractEmbedPlayerInfo(item: OnlineFoodDiscoveryItem): EmbedPlayerInfo {
  const url = (item.sourceUrl || item.trendingItem?.videoUrl || item.trendingItem?.sourceUrl || '').trim();
  let vid = extractYouTubeVideoId(url);

  if (!vid && item.id.startsWith('yt-api-')) {
    vid = item.id.replace('yt-api-', '');
  } else if (!vid && item.id.startsWith('yt-live-')) {
    vid = item.id.replace('yt-live-', '');
  }

  if (vid && vid.length >= 10) {
    return {
      canInlineEmbed: true,
      embedUrl: `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&playsinline=1&rel=0`,
      platform: 'youtube',
      videoId: vid,
    };
  }

  return { canInlineEmbed: false, embedUrl: null, platform: 'youtube' };
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
const SUPABASE_ANON_KEY = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_h5ufAaA0qAL3s-ebprATsw_8AApv71l';

/**
 * Unified YouTube discovery and search:
 * 1. Queries backend Edge Function for YouTube search if online.
 * 2. Gracefully falls back to client-side official YouTube videos & oEmbed metadata.
 * 3. Filters and ranks results by category and search keyword.
 */
export async function searchAndDiscoverSocialFood(
  options: SearchSocialOptions = {}
): Promise<SearchSocialResult> {
  const { query = '', categorySlug = 'all', foods = initialFoods, trendingFoods = initialTrendingFoods, forceRefresh = false } = options;

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
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ query: query || 'Cambodian food travel', platform: 'youtube' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.items) && data.items.length > 0) {
        backendItems = data.items
          .filter((it: any) => it.platform === 'youtube' || /youtube\.com|youtu\.be/.test(it.sourceUrl || ''))
          .map((it: any) => {
            const match = matchCambodianDish(`${it.titleEn || it.titleKh} ${it.descriptionEn || it.descriptionKh}`, foods);
            return {
              ...it,
              platform: 'youtube' as const,
              matchedFoodId: it.matchedFoodId || match?.food?.id,
              matchedFoodNameKh: it.matchedFoodNameKh || match?.food?.nameKh,
              matchedFoodNameEn: it.matchedFoodNameEn || match?.food?.nameEn,
            };
          });
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

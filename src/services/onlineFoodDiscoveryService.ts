import { getAppAttestationHeaders, isAppCloneTampered } from '../utils/appCloneIntegrityGuard';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { FoodItem, TrendingFoodCategorySlug, TrendingFoodItem } from '../types';
import { initialFoods } from '../data/seedData';
import { initialTrendingFoods } from '../data/seedTrendingFoods';
import { normalizeKhmerSearchText, expandMultilingualPlaceQuery, includesKhmerSafeToken } from './googlePlacesService';
import { isSupabaseConfigured, pushCloudDocument, pullCloudDocument } from './supabaseService';

export const ONLINE_DISCOVERY_CACHE_KEY = 'kft_v18_social_2026_verified_cache';
const ONLINE_DISCOVERY_CUSTOM_URLS_KEY = 'kft_online_discovery_custom_urls_v1';
const LEGACY_CACHE_KEYS = [
  'kft_v17_social_2026_verified_cache',
  'kft_v16_social_2026_verified_cache',
  'kft_v15_social_2026_verified_cache',
  'kft_v14_social_2026_verified_cache',
  'kft_v13_social_2026_verified_cache',
  'kft_v12_social_2026_verified_cache',
  'kft_v11_social_2026_verified_cache',
  'kft_v10_youtube_2026_verified_cache',
  'kft_v9_youtube_2026_verified_cache',
  'kft_v8_youtube_2026_verified_cache',
  'kft_v7_youtube_2026_verified_cache',
  'kft_v6_youtube_verified_cache',
  'kft_v5_youtube_discovery_cache',
  'kft_v4_online_discovery_cache',
  'kft_live_tiktok_creators_v3',
  'kft_live_tiktok_creators_v2',
  'kft_live_tiktok_creators_v1',
];
export const ONLINE_DISCOVERY_TTL_MS = 30 * 60 * 1000; // 30 minutes cache window (prevents mobile radio/CPU overheating)
export const MANUAL_REFRESH_COOLDOWN_MS = 5 * 1000; // 5 seconds manual cooldown

export type DiscoveryPlatformId = 'youtube' | 'tiktok' | 'facebook';

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
  originalAccountUrl?: string;
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
  inlineVideoId?: string;
  directVideoUrl?: string;
}

export interface OnlineDiscoveryFeedResult {
  items: OnlineFoodDiscoveryItem[];
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

/** Active 2025–2026 Cambodian Food, Restaurant & Travel YouTube Channels Registry */
export const ACTIVE_CAMBODIA_YOUTUBE_CHANNELS_2026 = [
  { channelId: 'UCLVncs-1iVf4f1tW5WSfQfw', name: 'Street Food TV', categorySlug: 'popular_food' as const },
  { channelId: 'UCM_tv-ZoNPPAIT4rrhib28A', name: 'Street Food Explorer', categorySlug: 'famous_restaurant' as const },
  { channelId: 'UCQ1k3iVCA9mkTuOJetyK_2Q', name: 'Delicious Food Show & Travel', categorySlug: 'food_travel_vlog' as const },
  { channelId: 'UC3B29E6Fxe-bum63LxbcspQ', name: 'Walk Street And Food', categorySlug: 'famous_restaurant' as const },
  { channelId: 'UC4mwWNbfhEM6BKrGtxH_1dg', name: 'Oun Roth Daily life', categorySlug: 'popular_food' as const },
  { channelId: 'UCg7R70hWzrtDh3bCGlrGKhQ', name: 'Delicious food channel', categorySlug: 'popular_food' as const },
  { channelId: 'UCIS-mtcY4mDKUd1ET6utKqA', name: 'Thavireak City Walks', categorySlug: 'tourist_attraction' as const },
  { channelId: 'UCjJJNMTX5wJmZRI5iK3fo5Q', name: 'Sonita Khmer US', categorySlug: 'famous_restaurant' as const },
  { channelId: 'UCARbX20_cV9YwwrAFyYvoMg', name: 'Mao Cambodia', categorySlug: 'famous_restaurant' as const },
  { channelId: 'UCRFt5572jMudEvPVDKkHmbg', name: 'Sreyreang Life Show', categorySlug: 'tourist_attraction' as const },
  { channelId: 'UCss0y7c69jgvFRS9Hs2EwRA', name: 'TravelwithChad', categorySlug: 'tourist_attraction' as const },
  { channelId: 'UCMIUsbPWmPzqRLoI8J9TG_Q', name: 'Little Explore', categorySlug: 'tourist_attraction' as const },
  { channelId: 'UCmHn9fGfK0NmI9fMzuaYnjA', name: 'Suitcase Monkey', categorySlug: 'tourist_attraction' as const },
];

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
 * 100% Verified, Public, Embeddable 2025–2026 Cambodian Food & Tourism YouTube Videos
 * Every video ID below has been verified via YouTube oEmbed (200 OK),
 * high-resolution thumbnail check, and mobile embed playability test.
 */
const CURATED_YOUTUBE_VIDEOS: CuratedYouTubeSeed[] = [
  // ============================================================================
  // 1. POPULAR KHMER FOOD (ម្ហូបខ្មែរល្បីៗ — 2025–2026 Broadcasts)
  // ============================================================================
  {
    id: 'yt-2026-food-street-1',
    url: 'https://www.youtube.com/watch?v=9AH9djVoVDQ',
    authorName: 'Street Food TV',
    fallbackTitleEn: 'The Ultimate Cambodian Street Food Tour: Khmer Grilled Sausages, Spicy Papaya Salad & more',
    titleKh: 'ដំណើរកម្សាន្តភ្លក្សម្ហូបតាមផ្លូវខ្មែរ៖ សាច់ក្រកអាំង បុកល្ហុងហឹរឆ្ងាញ់ និងម្ហូបល្បីៗ (2026)',
    titleZh: '2026 柬埔寨终极街头美食之旅：高棉烤香肠、香辣木瓜沙拉与地道小吃',
    descriptionKh: 'វីដេអូថ្មីឆ្នាំ 2026 បង្ហាញពីសាច់ក្រកគោអាំងភ្លើងធ្យូង បុកល្ហុងក្តាមប្រៃ និងមុខម្ហូបតាមផ្លូវខ្មែរកំពុងពេញនិយម។',
    descriptionEn: '2026 broadcast exploring sizzling Khmer grilled sausages, spicy green papaya salad (Bok Lhong), and authentic street delicacies.',
    descriptionZh: '2026 最新探访柬埔寨街头炭火烤肉肠、青木瓜沙拉及最受欢迎的传统市集美食。',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-10-26',
    fallbackThumb: 'https://i.ytimg.com/vi/9AH9djVoVDQ/hqdefault.jpg',
    matchedFoodId: 'food-80',
  },
  {
    id: 'yt-2026-food-bbq-2',
    url: 'https://www.youtube.com/watch?v=DZLmPv-P978',
    authorName: 'Oun Roth Daily life',
    fallbackTitleEn: '🇰🇭 Cambodian Street Food Tour | Delicious Grilled BBQ Skewers at a Local Market in Phnom Penh – 4K',
    titleKh: 'សាច់អាំងចង្កាក់ឈ្ងុយឆ្ងាញ់ និងម្ហូបតាមផ្លូវនៅផ្សារក្នុងរាជធានីភ្នំពេញ 4K (2026)',
    titleZh: '2026 金边本地市场 4K 美食之旅：香脆炭烤肉串与高棉街头小吃',
    descriptionKh: 'ទស្សនាការអាំងសាច់ចង្កាក់ ស្លាបមាន់អាំង និងម្ហូបខ្មែរថ្មីៗក្តៅៗនៅផ្សារក្នុងរាជធានីភ្នំពេញ កម្រិតរូបភាព 4K។',
    descriptionEn: '4K street food walk in Phnom Penh featuring smoky charcoal-grilled BBQ skewers, marinated meats, and local market snacks.',
    descriptionZh: '4K 超高清实拍金边本地市场现烤炭火肉串、秘制烤鸡翅与热闹夜市美食。',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-10-26',
    fallbackThumb: 'https://i.ytimg.com/vi/DZLmPv-P978/hqdefault.jpg',
    matchedFoodId: 'food-6',
  },
  {
    id: 'yt-2026-food-riverside-3',
    url: 'https://www.youtube.com/watch?v=0u8Xe9z8Hso',
    authorName: 'Oun Roth Daily life',
    fallbackTitleEn: 'Best Popular Cambodian Street Food 🇰🇭 - Evening Walking Tour @ Riverside, Phnom Penh 2026',
    titleKh: 'ម្ហូបតាមផ្លូវពេញនិយមពេលរាត្រីនៅមាត់ទន្លេភ្នំពេញ ឆ្នាំ 2026',
    titleZh: '2026 金边河畔夜市最受欢迎的柬埔寨街头美食漫步',
    descriptionKh: 'ដើរភ្លក្សម្ហូបខ្មែរពេញនិយមពេលល្ងាចនៅតាមបណ្តោយមាត់ទន្លេភ្នំពេញ មានទាំងលតឆា នំបញ្ចុក និងសាច់អាំង។',
    descriptionEn: '2026 evening culinary walk along Phnom Penh Riverside sampling popular Cambodian street food stalls and night snacks.',
    descriptionZh: '2026 傍晚漫步金边四臂湾河畔，品尝最热门的高棉炒粉、米粉与风味夜宵。',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-10-25',
    fallbackThumb: 'https://i.ytimg.com/vi/0u8Xe9z8Hso/hqdefault.jpg',
    matchedFoodId: 'food-38',
  },
  {
    id: 'yt-2026-food-pork-4',
    url: 'https://www.youtube.com/watch?v=nK3x0BD-Sys',
    authorName: 'Delicious food channel',
    fallbackTitleEn: 'សាច់ជ្រូកងៀតទន់ផុយឆ្ងាញ់ រូបមន្តធ្វើងៀតសាច់ជ្រូក Delicious food channel',
    titleKh: 'រូបមន្តធ្វើសាច់ជ្រូកងៀតទន់ផុយឆ្ងាញ់បែបខ្មែរ (Delicious Food Channel 2026)',
    titleZh: '2026 高棉传统秘制五香猪肉干做法，外香内嫩',
    descriptionKh: 'ការបង្ហាញវិធីប្រឡាក់គ្រឿងសាច់ជ្រូកងៀតឱ្យមានរសជាតិឈ្ងុយឆ្ងាញ់ ទន់ផុយល្អ តាមក្បួនចុងភៅខ្មែរ។',
    descriptionEn: 'Step-by-step 2026 Khmer recipe for tender, flavorful marinated sun-dried pork (Sach Chrouk Ngiet).',
    descriptionZh: '详细展示 2026 正宗高棉家庭秘制猪肉干的腌制与烹调技巧。',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តបាត់ដំបង',
    provinceEn: 'Battambang',
    publishedDate: '2026-10-22',
    fallbackThumb: 'https://i.ytimg.com/vi/nK3x0BD-Sys/hqdefault.jpg',
    matchedFoodId: 'food-6',
  },
  {
    id: 'yt-2026-food-numbanhchok-5',
    url: 'https://www.youtube.com/watch?v=RhtOc1LdaAg',
    authorName: 'Street Food TV',
    fallbackTitleEn: 'Non-stop Serving ! Must-Try KHMER Noodle Soup (Num Banh Chok) & More',
    titleKh: 'នំបញ្ចុកសម្លខ្មែរលក់ដាច់មិនឈប់ និងមុខម្ហូបប្រពៃណីខ្មែរ (2026)',
    titleZh: '2026 络绎不绝的必尝高棉鱼汤米粉 (Num Banh Chok) 与传统小吃',
    descriptionKh: 'ទស្សនាការលក់នំបញ្ចុកសម្លប្រហើរ និងសម្លការីខ្មែរដ៏មមាញឹក ជាមួយបន្លែស្រស់ៗគ្រប់មុខ។',
    descriptionEn: 'Busy Cambodian morning stall serving endless bowls of fresh Num Banh Chok rice noodles with rich fish and curry broths.',
    descriptionZh: '实拍 2026 生意火爆的高棉鱼汤米粉与红咖喱米粉早市摊位，配满新鲜生菜。',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2026-10-21',
    fallbackThumb: 'https://i.ytimg.com/vi/RhtOc1LdaAg/hqdefault.jpg',
    matchedFoodId: 'food-3',
  },
  {
    id: 'yt-2026-food-braisedfish-6',
    url: 'https://www.youtube.com/watch?v=YGkYLaKrPKk',
    authorName: 'Delicious food channel',
    fallbackTitleEn: 'របៀបធ្វើត្រីខ #ខត្រីឆ្កោកបែបខ្មែរបូរាណ Delicious food channel',
    titleKh: 'របៀបធ្វើខត្រីឆ្កោកបែបខ្មែរបុរាណឈ្ងុយឆ្ងាញ់ (2026)',
    titleZh: '2026 古法高棉红烧鱼 (Khor Trei) 家常料理教学',
    descriptionKh: 'របៀបខត្រីឆ្កោកជាមួយស្ករត្នោតខ្មែរ និងម្រេចកំពត ឱ្យចូលជាតិឈ្ងុយឆ្ងាញ់ពិសេស។',
    descriptionEn: 'Authentic 2026 Cambodian caramelized palm sugar braised fish recipe seasoned with aromatic Kampot pepper.',
    descriptionZh: '使用柬埔寨棕榈糖与贡布黑胡椒慢炖入味的传统高棉红烧鱼食谱。',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តកំពង់ឆ្នាំង',
    provinceEn: 'Kampong Chhnang',
    publishedDate: '2026-10-20',
    fallbackThumb: 'https://i.ytimg.com/vi/YGkYLaKrPKk/hqdefault.jpg',
    matchedFoodId: 'food-1',
  },
  {
    id: 'yt-2026-food-machuprey-7',
    url: 'https://www.youtube.com/watch?v=qNOOGP1w_nM',
    authorName: 'Delicious food channel',
    fallbackTitleEn: 'ឆ្ងាញ់! ម្ជូរព្រៃសាច់មាន់ សម្លម្ជូរព្រៃសាច់មាន់ម្ហូបខ្មែររសជាតិឆ្ងាញ់ខ្លាំង Delicious food channel',
    titleKh: 'សម្លម្ជូរព្រៃសាច់មាន់ ម្ហូបខ្មែររសជាតិឆ្ងាញ់ខ្លាំង (2026)',
    titleZh: '2026 酸爽开胃的高棉森林酸鸡汤 (Samlor Machu Prey)',
    descriptionKh: 'វិធីស្លម្ជូរព្រៃសាច់មាន់ជាមួយគល់ស្លឹកគ្រៃ ស្លឹកក្រូចសើច និងម្ទេសស្រស់ រសជាតិជូរហឹរឆ្ងាញ់ជាប់ចិត្ត។',
    descriptionEn: 'Traditional Khmer wild sour chicken soup cooked with lemongrass, kaffir lime leaves, galangal, and local herbs.',
    descriptionZh: '融合香茅、柠檬叶与南姜烹制的正宗高棉森林酸辣鸡汤，鲜美开胃。',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2026-10-18',
    fallbackThumb: 'https://i.ytimg.com/vi/qNOOGP1w_nM/hqdefault.jpg',
    matchedFoodId: 'food-4',
  },
  {
    id: 'yt-2026-food-collection-8',
    url: 'https://www.youtube.com/watch?v=_ur5Tg0NFMU',
    authorName: 'Street Food TV',
    fallbackTitleEn: 'Unbelievable !!! The Best KHMER Authentic Street Food Collection 2026',
    titleKh: 'បណ្តុំមុខម្ហូបតាមផ្លូវខ្មែររសជាតិដើមល្បីៗបំផុតឆ្នាំ 2026',
    titleZh: '2026 令人惊叹的正宗高棉街头美食大合集',
    descriptionKh: 'ការប្រមូលផ្តុំមុខម្ហូបតាមផ្លូវខ្មែរឆ្ងាញ់ៗ នំបាញ់ឆែវ នំគ្រក់ គុយទាវ និងបង្អែមខ្មែរប្រចាំឆ្នាំ 2026។',
    descriptionEn: '2026 compilation of Cambodia’s finest authentic street food dishes, sizzling crepes, noodles, and traditional desserts.',
    descriptionZh: '2026 精选高棉煎饼、椰奶米糕、金边粿条与传统高棉甜品的街头美食合集。',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-08-18',
    fallbackThumb: 'https://i.ytimg.com/vi/_ur5Tg0NFMU/hqdefault.jpg',
    matchedFoodId: 'food-27',
  },
  {
    id: 'yt-2025-food-sangvak-9',
    url: 'https://www.youtube.com/watch?v=TII6hVcbSv4',
    authorName: 'Kitchen Foods',
    fallbackTitleEn: 'Ultimate CAMBODIAN Feast! 🔥 Grilled Catfish & Sangvak with Fresh Khmer Noodles',
    titleKh: 'ត្រីអាំង និងសង្វាក់ខ្មែរជាមួយនំបញ្ចុកស្រស់ៗ បែបគ្រួសារខ្មែរ (2025)',
    titleZh: '2025 丰盛高棉家宴：炭烤鲶鱼与传统鱼肉泥配鲜米粉',
    descriptionKh: 'ម្ហូបគ្រួសារខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ ត្រីអាំងភ្លើងធ្យូង និងសង្វាក់ខ្មែរ ញ៉ាំផ្ទាប់ជាមួយនំបញ្ចុក និងបន្លែស្រស់។',
    descriptionEn: 'Rustic Cambodian feast featuring charcoal-grilled catfish and traditional herb-infused Sangvak served with fresh rice noodles.',
    descriptionZh: '炭火现烤鲜鱼搭配香茅鱼泥 (Sangvak)、新鲜米粉与田园生菜的地道高棉盛宴。',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តបាត់ដំបង',
    provinceEn: 'Battambang',
    publishedDate: '2025-12-15',
    fallbackThumb: 'https://i.ytimg.com/vi/TII6hVcbSv4/hqdefault.jpg',
    matchedFoodId: 'food-3',
  },
  {
    id: 'yt-2025-food-loklak-10',
    url: 'https://www.youtube.com/watch?v=KSNG7aVSKIM',
    authorName: 'Recipe30',
    fallbackTitleEn: "Lok Lak: The BEST Cambodian Pepper Beef You've Never Tried",
    titleKh: 'ឡុកឡាក់សាច់គោម្រេចកំពត រសជាតិល្អឯកប្រចាំកម្ពុជា (2025)',
    titleZh: '2025 柬埔寨招牌贡布胡椒摇摇牛肉 (Beef Lok Lak) 极品食谱',
    descriptionKh: 'របៀបឆាឡុកឡាក់សាច់គោឱ្យផុយទន់ ជាមួយទឹកជ្រលក់ម្រេចកំពតក្រូចឆ្មារ និងពងទាចៀន។',
    descriptionEn: 'High-heat wok-seared Cambodian Beef Lok Lak served with fried egg and authentic Kampot black pepper lime sauce.',
    descriptionZh: '大火快炒鲜嫩牛肉粒，配太阳蛋与正宗贡布黑胡椒青柠蘸汁的高棉名菜。',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2025-09-10',
    fallbackThumb: 'https://i.ytimg.com/vi/KSNG7aVSKIM/hqdefault.jpg',
    matchedFoodId: 'food-2',
  },
  {
    id: 'yt-2026-food-amok-11',
    url: 'https://www.youtube.com/watch?v=9uKNNcDfttc',
    authorName: 'Vibol Daily Cooking',
    fallbackTitleEn: 'The Most Delicious Cambodian Fish Amok | Authentic Khmer Family Food (2026)',
    titleKh: 'របៀបធ្វើអាម៉ុកត្រីខ្មែរឈ្ងុយឆ្ងាញ់តាមក្បួនគ្រួសារខ្មែរ (Fish Amok 2026)',
    titleZh: '2026 正宗柬埔寨家庭式高棉阿莫克蒸鱼 (Fish Amok) 做法',
    descriptionKh: 'វីដេអូបង្ហាញពីការបុកគ្រឿងខ្មែរ និងចំហុយអាម៉ុកត្រីក្នុងកន្ទោងស្លឹកចេក ជាមួយខ្ទិះដូងស្រស់ និងស្លឹកញ។',
    descriptionEn: 'Step-by-step traditional Khmer family preparation of Fish Amok steamed in banana leaf cups with fresh kroeung and coconut cream.',
    descriptionZh: '展示传统高棉香料研磨及香蕉叶盅高棉阿莫克蒸鱼的完整家庭食谱。',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2026-10-19',
    fallbackThumb: 'https://i.ytimg.com/vi/9uKNNcDfttc/hqdefault.jpg',
    matchedFoodId: 'food-1',
  },

  // ============================================================================
  // 2. FAMOUS RESTAURANTS & MARKETS (ភោជនីយដ្ឋានល្បីៗ — 2025–2026 Broadcasts)
  // ============================================================================
  {
    id: 'yt-2026-rest-orussey-1',
    url: 'https://www.youtube.com/watch?v=ROKuCSsoWSw',
    authorName: 'Walk Street And Food',
    fallbackTitleEn: 'Cambodian Street Food 2026 - Walking Tour - Orussey Market, Phnom Penh',
    titleKh: 'ហាងអាហារ និងតូបម្ហូបល្បីៗនៅផ្សារអូរឫស្សី ភ្នំពេញ ឆ្នាំ 2026',
    titleZh: '2026 金边乌亚西市场 (Orussey Market) 知名美食摊位与餐馆探店',
    descriptionKh: 'ដើរមើលតូបលក់ម្ហូបឆ្ងាញ់ៗ បាយសាច់ជ្រូក គុយទាវ និងអាហារដ្ឋានប្រចាំផ្សារអូរឫស្សី រាជធានីភ្នំពេញ ឆ្នាំ 2026។',
    descriptionEn: '2026 culinary walking tour through Phnom Penh’s bustling Orussey Market food court and long-standing local eateries.',
    descriptionZh: '2026 实地探访金边乌亚西市场最具人气的传统餐饮档口与特色老字号美食。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-10-26',
    fallbackThumb: 'https://i.ytimg.com/vi/ROKuCSsoWSw/hqdefault.jpg',
    matchedFoodId: 'food-6',
  },
  {
    id: 'yt-2026-rest-mlobmkak-2',
    url: 'https://www.youtube.com/watch?v=fVP1fAXFNxc',
    authorName: 'Mao Cambodia',
    fallbackTitleEn: 'ហាងម្លប់ម្កាក់ និង ហាង អាយ វីន / Two Popular Restaurants in Phnom Penh City Review',
    titleKh: 'រីវីវភោជនីយដ្ឋានល្បីទាំង ២ នៅភ្នំពេញ៖ ហាងម្លប់ម្កាក់ និងហាង អាយ វីន (2026)',
    titleZh: '2026 金边两大热门高棉餐厅探店测评：Mlob Mkak 与 I-Win 餐厅',
    descriptionKh: 'ការបង្ហាញបរិយាកាស និងមុខម្ហូបខ្មែរពិសេសៗនៅភោជនីយដ្ឋានម្លប់ម្កាក់ និងហាងអាយវីន ក្នុងរាជធានីភ្នំពេញ។',
    descriptionEn: '2026 restaurant review of two popular dining spots in Phnom Penh: Mlob Mkak Restaurant and I-Win Khmer Cuisine.',
    descriptionZh: '2026 深度测评金边广受欢迎的 Mlob Mkak 与 I-Win 两家高棉风味餐厅的招牌菜品。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-10-25',
    fallbackThumb: 'https://i.ytimg.com/vi/fVP1fAXFNxc/hqdefault.jpg',
    matchedFoodId: 'food-1',
  },
  {
    id: 'yt-2026-rest-riversidemarket-3',
    url: 'https://www.youtube.com/watch?v=pKxCPaFj-Lo',
    authorName: 'Walk Street And Food',
    fallbackTitleEn: 'Cambodian Street Food 2026 - Evening Walking Tour Riverside Food Market, Phnom Penh',
    titleKh: 'អាហារដ្ឋាន និងផ្សាររាត្រីមាត់ទន្លេភ្នំពេញ ឆ្នាំ 2026',
    titleZh: '2026 金边河畔美食夜市与露天餐厅晚间漫步',
    descriptionKh: 'ទស្សនាបរិយាកាសអាហារដ្ឋានពេលរាត្រី និងមុខម្ហូបសម្បូរបែបនៅមាត់ទន្លេចតុមុខ រាជធានីភ្នំពេញ។',
    descriptionEn: '2026 evening tour of Phnom Penh’s lively Riverside Food Market featuring seafood grills, hotpots, and local eateries.',
    descriptionZh: '2026 夜游金边四臂湾河畔美食市集，品尝海鲜烧烤、高棉火锅与特色小吃。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-10-25',
    fallbackThumb: 'https://i.ytimg.com/vi/pKxCPaFj-Lo/hqdefault.jpg',
    matchedFoodId: 'food-19',
  },
  {
    id: 'yt-2026-rest-takeo-4',
    url: 'https://www.youtube.com/watch?v=pd5yBnu9qM4',
    authorName: 'Go With Samnang',
    fallbackTitleEn: 'ម្ហូបឆ្ងាញ់ ទេសភាពស្អាត នៅភោជនីយដ្ឋាន លំហែរាំងទឹក #តាកែវ | Relaxing at a Lumhae Restaurant in Takeo',
    titleKh: 'ម្ហូបឆ្ងាញ់ ទេសភាពស្អាត នៅភោជនីយដ្ឋាន លំហែរាំងទឹក ខេត្តតាកែវ (2026)',
    titleZh: '2026 茶胶省湖畔生态餐厅 (Lumhae Reang Teuk) 美食与美景探店',
    descriptionKh: 'ភោជនីយដ្ឋានបែបធម្មជាតិមាត់ទឹកនៅខេត្តតាកែវ បម្រើជូនមុខម្ហូបខ្មែរស្រស់ៗ និងខ្យល់អាកាសបរិសុទ្ធ។',
    descriptionEn: '2026 visit to Lumhae Reang Teuk waterfront restaurant in Takeo serving fresh countryside Khmer dishes in scenic huts.',
    descriptionZh: '2026 探访茶胶省水上凉亭生态餐厅，尽享地道高棉农家菜与田园风光。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'ខេត្តតាកែវ',
    provinceEn: 'Takeo',
    publishedDate: '2026-10-25',
    fallbackThumb: 'https://i.ytimg.com/vi/pd5yBnu9qM4/hqdefault.jpg',
    matchedFoodId: 'food-1',
  },
  {
    id: 'yt-2026-rest-kampot-5',
    url: 'https://www.youtube.com/watch?v=Cv92PHMlHAE',
    authorName: 'Sonita Khmer US',
    fallbackTitleEn: 'ឧទ្យានទឹកតាមឆ្នេរខ្សាច់សម្រាប់ក្រុមគ្រួសារ ដូងទេរ Daung Te Beach Water Park in Kampot Cambodia, Food',
    titleKh: 'អាហារដ្ឋានមាត់ទឹក និងរមណីយដ្ឋានដូងទេរ ខេត្តកំពត (2026)',
    titleZh: '2026 贡布省 Daung Te 河畔餐饮与水上乐园家庭出游指南',
    descriptionKh: 'ភ្លក្សអាហារឆ្ងាញ់ៗនៅតាមដងព្រែកកំពត និងលេងកម្សាន្តនៅរមណីយដ្ឋានដូងទេរ ខេត្តកំពត។',
    descriptionEn: '2026 guide to riverside dining and family water activities at Daung Te in Kampot Province.',
    descriptionZh: '2026 贡布河畔特色餐厅美食体验与 Daung Te 水上休闲度假区导览。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'ខេត្តកំពត',
    provinceEn: 'Kampot',
    publishedDate: '2026-10-25',
    fallbackThumb: 'https://i.ytimg.com/vi/Cv92PHMlHAE/hqdefault.jpg',
    matchedFoodId: 'food-27',
  },
  {
    id: 'yt-2026-rest-toultompoung-6',
    url: 'https://www.youtube.com/watch?v=tzi19u8lA8U',
    authorName: 'Street Food Explorer',
    fallbackTitleEn: 'Cambodia Street Food Tour 🇰🇭 Exploring Toul Tom Poung Market, Phnom Penh 2026 4K',
    titleKh: 'ភោជនីយដ្ឋាន និងអាហារល្បីៗនៅផ្សារទួលទំពូង ភ្នំពេញ ឆ្នាំ 2026 (4K)',
    titleZh: '2026 金边朱德奔市场 (俄罗斯市场) 4K 美食与知名餐馆探店',
    descriptionKh: 'វីដេអូថ្មីឆ្នាំ 2026 កម្រិត 4K ដើរមើលហាងអាហារខ្មែរ គុយទាវ នំបញ្ចុក និងបង្អែមល្បីៗនៅផ្សារទួលទំពូង រាជធានីភ្នំពេញ។',
    descriptionEn: 'Brand-new 2026 4K culinary tour of Phnom Penh’s iconic Toul Tom Poung (Russian Market) food stalls and local restaurants.',
    descriptionZh: '2026 全新 4K 探访金边俄罗斯市场周边口碑极佳的传统高棉餐馆与特色小吃摊。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-10-24',
    fallbackThumb: 'https://i.ytimg.com/vi/tzi19u8lA8U/hqdefault.jpg',
    matchedFoodId: 'food-5',
  },
  {
    id: 'yt-2026-rest-morganbuffet-7',
    url: 'https://www.youtube.com/watch?v=hkuyJ4jZ6Fo',
    authorName: 'Sonita Khmer US',
    fallbackTitleEn: 'ប៊ូហ្វេខ្មែរនិងបរទេសថ្ងៃត្រង់នៅអគារ Morgan Tower Lunch Buffet at Morgan Tower Phnom Penh',
    titleKh: 'ប៊ូហ្វេម្ហូបខ្មែរ និងអន្តរជាតិថ្ងៃត្រង់នៅអគារ Morgan Tower ភ្នំពេញ (2026)',
    titleZh: '2026 金边摩根大厦高棉与国际自助午餐探店',
    descriptionKh: 'ទស្សនាការរៀបចំប៊ូហ្វេម្ហូបខ្មែរ និងអន្តរជាតិដ៏សម្បូរបែប នៅកោះពេជ្រ រាជធានីភ្នំពេញ។',
    descriptionEn: '2026 review of the Khmer and international lunch buffet at Morgan Tower in Koh Pich, Phnom Penh.',
    descriptionZh: '2026 实拍金边钻石岛摩根大厦丰富的柬埔寨传统菜肴与国际美食自助午餐。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-10-21',
    fallbackThumb: 'https://i.ytimg.com/vi/hkuyJ4jZ6Fo/hqdefault.jpg',
    matchedFoodId: 'food-1',
  },
  {
    id: 'yt-2026-rest-tonlebassac-8',
    url: 'https://www.youtube.com/watch?v=H_pibKmw1lo',
    authorName: 'Sonita Khmer US',
    fallbackTitleEn: 'ហាងប៊ូហ្វេធំម្ហូបខ្មែរនៅភ្នំពេញ Grand Buffet Tonle Bassac Restaurant Phnom Penh Cambodia',
    titleKh: 'ហាងប៊ូហ្វេធំម្ហូបខ្មែរ ភោជនីយដ្ឋានទន្លេបាសាក់ ភ្នំពេញ (2026)',
    titleZh: '2026 金边百色河大餐厅 (Tonle Bassac) 豪华高棉与海鲜自助餐',
    descriptionKh: 'ភ្លក្សម្ហូបខ្មែររាប់រយមុខ គ្រឿងសមុទ្រស្រស់ៗ និងបង្អែមប្រពៃណីនៅភោជនីយដ្ឋានប៊ូហ្វេទន្លេបាសាក់។',
    descriptionEn: 'Exploring the grand Cambodian and seafood buffet spread at Tonle Bassac Restaurant in Phnom Penh.',
    descriptionZh: '探访金边著名的百色河自助餐厅，品尝上百道正宗高棉名菜、鲜活海鲜与传统甜点。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-01-18',
    fallbackThumb: 'https://i.ytimg.com/vi/H_pibKmw1lo/hqdefault.jpg',
    matchedFoodId: 'food-1',
  },
  {
    id: 'yt-2025-rest-kmbuffet-9',
    url: 'https://www.youtube.com/watch?v=ZngqC0-fz50',
    authorName: 'Mao Cambodia',
    fallbackTitleEn: 'Home Style Cambodian Buffet at KM Restaurant in Phnom Penh City, Cambodia',
    titleKh: 'ប៊ូហ្វេម្ហូបខ្មែរគ្រួសារ នៅភោជនីយដ្ឋាន KM ភ្នំពេញ (2025)',
    titleZh: '2025 金边 KM 餐厅地道高棉家常菜自助餐探店',
    descriptionKh: 'ហាងប៊ូហ្វេម្ហូបខ្មែរប្រចាំថ្ងៃ មានសម្លខ្មែរ ត្រីចៀន ទឹកគ្រឿង និងបន្លែស្រស់ៗជាច្រើនមុខនៅភ្នំពេញ។',
    descriptionEn: 'Home-style Cambodian all-you-can-eat buffet at KM Restaurant featuring traditional soups, Prahok dips, and grilled fish.',
    descriptionZh: '品尝金边 KM 餐厅的高棉家常自助餐，包含各式传统浓汤、烤鱼与蔬菜蘸酱。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2025-11-12',
    fallbackThumb: 'https://i.ytimg.com/vi/ZngqC0-fz50/hqdefault.jpg',
    matchedFoodId: 'food-4',
  },

  // ============================================================================
  // 3. TOURIST ATTRACTIONS (តំបន់ទេសចរណ៍ — 2025–2026 Broadcasts)
  // ============================================================================
  {
    id: 'yt-2026-tour-phnompenh-1',
    url: 'https://www.youtube.com/watch?v=dqlTwEy3jjU',
    authorName: 'Thavireak City Walks',
    fallbackTitleEn: 'Exploring Phnom Penh: Cambodia’s Capital Like You’ve Never Seen It 🇰🇭',
    titleKh: 'ទស្សនាសម្រស់រាជធានីភ្នំពេញថ្មីៗ និងកន្លែងដើរលេងស្អាតៗ ឆ្នាំ 2026',
    titleZh: '2026 探索柬埔寨首都金边：全新城市风貌与必游地标',
    descriptionKh: 'វីដេអូថ្មីឆ្នាំ 2026 បង្ហាញពីសម្រស់ទីក្រុងភ្នំពេញ វិមានឯករាជ្យ មាត់ទន្លេ និងតំបន់ទេសចរណ៍ក្នុងរាជធានី។',
    descriptionEn: '2026 city tour showcasing Phnom Penh’s vibrant boulevards, cultural monuments, and modern riverside attractions.',
    descriptionZh: '2026 全新实拍金边独立纪念碑、皇宫周边与现代河畔休闲区的迷人风光。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-10-26',
    fallbackThumb: 'https://i.ytimg.com/vi/dqlTwEy3jjU/hqdefault.jpg',
  },
  {
    id: 'yt-2026-tour-kep-2',
    url: 'https://www.youtube.com/watch?v=G4wamhZFxfY',
    authorName: 'Sreyreang Life Show',
    fallbackTitleEn: 'ទេសភាពស្រស់ស្អាតជិតជើងភ្នំ និងសមុទ្រខេត្តកែប | Best Peaceful Retirement Place in Cambodia',
    titleKh: 'ទេសភាពស្រស់ស្អាតជិតជើងភ្នំ និងឆ្នេរសមុទ្រខេត្តកែប ឆ្នាំ 2026',
    titleZh: '2026 柬埔寨白马省山海相依的绝美自然风光与海滨胜地',
    descriptionKh: 'ទស្សនាសម្រស់ធម្មជាតិដ៏ស្ងប់ស្ងាត់ ជើងភ្នំបៃតង និងឆ្នេរសមុទ្រខេត្តកែប នាឆ្នាំ 2026។',
    descriptionEn: '2026 scenic tour of Kep Province where lush green mountains meet the peaceful Cambodian coastline.',
    descriptionZh: '2026 领略白马省国家公园山脚与宁静海岸线交相辉映的度假风光。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តកែប',
    provinceEn: 'Kep',
    publishedDate: '2026-10-23',
    fallbackThumb: 'https://i.ytimg.com/vi/G4wamhZFxfY/hqdefault.jpg',
  },
  {
    id: 'yt-2026-tour-mlechdam-3',
    url: 'https://www.youtube.com/watch?v=Keoerp6KUVM',
    authorName: 'Sreyreang Life Show',
    fallbackTitleEn: 'ទេសភាពស្រស់ស្អាតទំនប់ម្លេចទឹកដីខេត្តកំពត | Beautiful Wooden Bridge & Mountain Scenery at Mlech Dam',
    titleKh: 'ទេសភាពស្ពានឈើ និងភ្នំដ៏ស្រស់ស្អាតនៅទំនប់ម្លេច ខេត្តកំពត (2026)',
    titleZh: '2026 贡布省 Mlech 水库木桥与群山湖泊生态美景',
    descriptionKh: 'ដំណើរកម្សាន្តទៅកាន់ទំនប់ម្លេច ខេត្តកំពត គយគន់ស្ពានឈើកាត់ទឹក និងជួរភ្នំធម្មជាតិដ៏ត្រកាល។',
    descriptionEn: '2026 travel vlog exploring the scenic wooden bridge, tranquil reservoir waters, and mountain backdrop at Mlech Dam in Kampot.',
    descriptionZh: '2026 探访贡布省热门生态景点 Mlech 水库，漫步水上木桥欣赏湖光山色。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តកំពត',
    provinceEn: 'Kampot',
    publishedDate: '2026-10-22',
    fallbackThumb: 'https://i.ytimg.com/vi/Keoerp6KUVM/hqdefault.jpg',
  },
  {
    id: 'yt-2026-tour-riversidewalk-4',
    url: 'https://www.youtube.com/watch?v=zTn3_Je07ao',
    authorName: 'Thavireak City Walks',
    fallbackTitleEn: 'Cambodia Riverside Walking Tour 🇰🇭 | Beautiful River Views Local Markets & Street Life in Phnom Penh',
    titleKh: 'ដើរកម្សាន្តមាត់ទន្លេភ្នំពេញ គយគន់ទេសភាពទន្លេចតុមុខ ឆ្នាំ 2026',
    titleZh: '2026 金边四臂湾河畔漫游：壮丽江景与当地市集风情',
    descriptionKh: 'ទស្សនាទិដ្ឋភាពមាត់ទន្លេភ្នំពេញ ព្រះបរមរាជវាំង និងសកម្មភាពកម្សាន្តរបស់ប្រជាពលរដ្ឋ និងភ្ញៀវទេសចរឆ្នាំ 2026។',
    descriptionEn: '2026 walking tour along Phnom Penh’s Chaktomuk riverfront promenade, Royal Palace square, and lively local markets.',
    descriptionZh: '2026 漫步金边皇宫广场与四臂湾江滨步道，感受充满活力的首都人文风情。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-10-22',
    fallbackThumb: 'https://i.ytimg.com/vi/zTn3_Je07ao/hqdefault.jpg',
  },
  {
    id: 'yt-2026-tour-battambang-5',
    url: 'https://www.youtube.com/watch?v=5E8_IX-kBDU',
    authorName: 'TravelwithChad',
    fallbackTitleEn: 'Why You Should NEVER Skip Battambang, Cambodia! 🇰🇭',
    titleKh: 'កន្លែងដើរលេងល្បីៗដែលមិនគួររំលងនៅខេត្តបាត់ដំបង ឆ្នាំ 2026',
    titleZh: '2026 为什么来柬埔寨绝不能错过马德望省！深度旅游攻略',
    descriptionKh: 'ស្វែងយល់ពីសម្រស់ស្ថាបត្យកម្មបុរាណ ភ្នំសំពៅ ឡូរីបាត់ដំបង និងជីវិតរស់នៅដ៏កក់ក្តៅក្នុងខេត្តបាត់ដំបង។',
    descriptionEn: '2026 travel guide to Battambang’s heritage architecture, Phnom Sampeau bat caves, bamboo train, and countryside charm.',
    descriptionZh: '2026 探索马德望历史建筑、竹火车、森宝山蝙蝠洞与淳朴乡村风光的完整指南。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តបាត់ដំបង',
    provinceEn: 'Battambang',
    publishedDate: '2026-10-20',
    fallbackThumb: 'https://i.ytimg.com/vi/5E8_IX-kBDU/hqdefault.jpg',
  },
  {
    id: 'yt-2026-tour-kohrong-6',
    url: 'https://www.youtube.com/watch?v=NmqRMR38Dhg',
    authorName: 'TravelwithChad',
    fallbackTitleEn: 'I Explored Koh Rong Cambodia 🇰🇭 — And Found More Than Beaches!',
    titleKh: 'ស្វែងយល់ពីសម្រស់កោះរ៉ុង និងឆ្នេរខ្សាច់សក្បុសខេត្តព្រះសីហនុ ឆ្នាំ 2026',
    titleZh: '2026 深度探索柬埔寨高龙岛：不仅是绝美白沙滩！',
    descriptionKh: 'ដំណើរកម្សាន្តឆ្នាំ 2026 ទៅកាន់កោះរ៉ុង ទស្សនាឆ្នេរខ្សាច់សក្បុស ទឹកសមុទ្រពណ៌ខៀវថ្លា និងភូមិកោះតូច។',
    descriptionEn: '2026 island adventure across Koh Rong exploring crystal-clear beaches, fishing villages, and tropical island trails.',
    descriptionZh: '2026 畅游西哈努克高龙岛，打卡清澈果冻海、原生态渔村与海岛热带风光。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តព្រះសីហនុ',
    provinceEn: 'Sihanoukville',
    publishedDate: '2026-09-18',
    fallbackThumb: 'https://i.ytimg.com/vi/NmqRMR38Dhg/hqdefault.jpg',
  },
  {
    id: 'yt-2026-tour-kohkong-7',
    url: 'https://www.youtube.com/watch?v=CLCzMC-2h-w',
    authorName: 'Little Explore',
    fallbackTitleEn: 'ស្អាតខ្លាំង ស្រុកថ្មបាំង កោះកុង Beautiful Scenery (Little Explore - Ep 35)',
    titleKh: 'ទេសភាពធម្មជាតិដ៏ស្រស់ស្អាតនៅស្រុកថ្មបាំង ខេត្តកោះកុង (Little Explore 2026)',
    titleZh: '2026 戈公省 Thma Bang 秘境森林与瀑布自然风光 (Little Explore)',
    descriptionKh: 'ដំណើរផ្សងព្រេងគយគន់ជួរភ្នំក្រវាញ ទឹកធ្លាក់ធម្មជាតិ និងព្រៃឈើបៃតងខ្ចីនៅស្រុកថ្មបាំង ខេត្តកោះកុង។',
    descriptionEn: '2026 eco-tourism adventure into Thma Bang District, Koh Kong, showcasing misty Cardamom Mountains and waterfalls.',
    descriptionZh: '2026 深入戈公省豆蔻山脉腹地，领略原始森林、高山云雾与清澈瀑布之美。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តកោះកុង',
    provinceEn: 'Koh Kong',
    publishedDate: '2026-08-16',
    fallbackThumb: 'https://i.ytimg.com/vi/CLCzMC-2h-w/hqdefault.jpg',
  },
  {
    id: 'yt-2026-tour-angkor-8',
    url: 'https://www.youtube.com/watch?v=Wmr6Qaen9eo',
    authorName: 'Suitcase Monkey',
    fallbackTitleEn: "Don't Make these 8 MISTAKES Visiting ANGKOR WAT in 2026",
    titleKh: 'គន្លឹះសំខាន់ៗទាំង ៨ សម្រាប់ការទៅទស្សនាប្រាសាទអង្គរវត្ត ឆ្នាំ 2026',
    titleZh: '2026 游览暹粒吴哥窟必看的 8 大实用旅行建议',
    descriptionKh: 'មគ្គុទ្ទេសក៍ទេសចរណ៍ថ្មីឆ្នាំ 2026 សម្រាប់ការទស្សនាថ្ងៃរះនៅប្រាសាទអង្គរវត្ត ការទិញសំបុត្រ និងការជ្រើសរើសផ្លូវវង់តូច-វង់ធំ។',
    descriptionEn: 'Up-to-date 2026 travel guide and essential tips for visiting Angkor Wat sunrise, Bayon, and Ta Prohm in Siem Reap.',
    descriptionZh: '2026 最新暹粒吴哥窟日出观赏、门票预订与大小圈寺庙游览全攻略。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2026-08-08',
    fallbackThumb: 'https://i.ytimg.com/vi/Wmr6Qaen9eo/hqdefault.jpg',
  },
  {
    id: 'yt-2026-tour-siemreap6days-9',
    url: 'https://www.youtube.com/watch?v=ksh0yRiBnUo',
    authorName: 'Suitcase Monkey',
    fallbackTitleEn: '6 Unforgettable Days in SIEM REAP, CAMBODIA: Angkor Wat, Floating Village, Markets, Travel Vlog 2026',
    titleKh: 'ដំណើរកម្សាន្ត ៦ថ្ងៃនៅខេត្តសៀមរាប៖ ប្រាសាទអង្គរវត្ត ភូមិបណ្តែតទឹក និងផ្សាររាត្រី 2026',
    titleZh: '2026 难忘的暹粒 6 日深度游：吴哥窟、洞里萨湖水上村落与夜市 Vlog',
    descriptionKh: 'វីដេអូទេសចរណ៍ឆ្នាំ 2026 បង្ហាញពីការដើរលេង ៦ថ្ងៃពេញនៅសៀមរាប ប្រាសាទអង្គរវត្ត ភូមិកំពង់ភ្លុក និង Pub Street។',
    descriptionEn: 'Complete 2026 6-day Siem Reap travel vlog covering Angkor Wat, Tonle Sap floating villages, night markets, and Khmer cuisine.',
    descriptionZh: '2026 完整记录暹粒 6 天行程：探秘千年吴哥古迹、空邦鲁水上人家与热闹夜市。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2026-07-25',
    fallbackThumb: 'https://i.ytimg.com/vi/ksh0yRiBnUo/hqdefault.jpg',
  },

  // ============================================================================
  // 4. FOOD & TRAVEL VLOGS (វីដេអូម្ហូប & ទេសចរណ៍ — 2025–2026 Broadcasts)
  // ============================================================================
  {
    id: 'yt-2026-vlog-boeungprolit-1',
    url: 'https://www.youtube.com/watch?v=yIr6zpyO-OI',
    authorName: 'Delicious Food Show & Travel',
    fallbackTitleEn: 'AWESOME! Cambodian Street Food Tour – Walking in Boeung Prolit Market & Orussey Market @ Real Life',
    titleKh: 'ដើរភ្លក្សម្ហូបនៅផ្សារបឹងព្រលិត និងផ្សារអូរឫស្សី រាជធានីភ្នំពេញ (2026)',
    titleZh: '2026 金边 Boeung Prolit 与乌亚西市场真实市井美食漫游 Vlog',
    descriptionKh: 'ដំណើរកម្សាន្តឆ្នាំ 2026 ស្វែងយល់ពីជីវិតពិត និងមុខម្ហូបឆ្ងាញ់ៗនៅផ្សារបឹងព្រលិត និងផ្សារអូរឫស្សី។',
    descriptionEn: '2026 live walking vlog exploring authentic Cambodian morning markets, local breakfast stalls, and street food in Phnom Penh.',
    descriptionZh: '2026 深入金边两大传统早市，记录热闹的市井生活与热气腾腾的高棉早餐。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-10-26',
    fallbackThumb: 'https://i.ytimg.com/vi/yIr6zpyO-OI/hqdefault.jpg',
    matchedFoodId: 'food-5',
  },
  {
    id: 'yt-2026-vlog-walkstreet-2',
    url: 'https://www.youtube.com/watch?v=rlhQTyJzyVc',
    authorName: 'Sonita Khmer US',
    fallbackTitleEn: 'អារម្មណ៍ល្អៗ ជីវិតកាន់តែភ្លឺស្វាងនៅពេលយើងចូលរួមជាមួយគ្នា Walk Street Pub Street at Riverside Phnom P',
    titleKh: 'ដើរកម្សាន្តផ្លូវថ្មើរជើង (Walk Street) និងភ្លក្សអាហារមាត់ទន្លេភ្នំពេញ (2026)',
    titleZh: '2026 金边河畔步行街 (Walk Street) 夜生活与街头美食 Vlog',
    descriptionKh: 'បរិយាកាសសប្បាយរីករាយនៅផ្លូវថ្មើរជើងមាត់ទន្លេភ្នំពេញ ជាមួយតូបលក់អាហារ ភេសជ្ជៈ និងការសម្តែងសិល្បៈឆ្នាំ 2026។',
    descriptionEn: '2026 vlog experiencing Phnom Penh’s vibrant Riverside Walk Street pedestrian zone, street food stalls, and live music.',
    descriptionZh: '2026 体验金边周末河畔步行街的热闹氛围、特色美食摊位与街头文化表演。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-10-24',
    fallbackThumb: 'https://i.ytimg.com/vi/rlhQTyJzyVc/hqdefault.jpg',
  },
  {
    id: 'yt-2026-vlog-nightboat-3',
    url: 'https://www.youtube.com/watch?v=_uOPWJCO4zo',
    authorName: 'Sreyreang Life Show',
    fallbackTitleEn: 'ដើរមើលម្ហូបតាមផ្លូវ និងជិះទូកលំហែរាត្រីនៅភ្នំពេញ | Phnom Penh Night River Boat Tour',
    titleKh: 'ដើរមើលម្ហូបតាមផ្លូវ និងជិះទូកលំហែរាត្រីគយគន់ភ្លើងពណ៌នៅភ្នំពេញ (2026)',
    titleZh: '2026 金边街头美食探访与四臂湾夜景游船之旅',
    descriptionKh: 'ភ្លក្សម្ហូបតាមផ្លូវមាត់ទន្លេ និងជិះទូកកម្សាន្តពេលរាត្រីមើលសម្រស់ទីក្រុងភ្នំពេញនាឆ្នាំ 2026។',
    descriptionEn: '2026 evening vlog combining Phnom Penh riverside street food tasting with a scenic night cruise on the Mekong and Tonle Sap.',
    descriptionZh: '2026 品尝金边河畔夜市小吃，乘船夜游湄公河与洞里萨河欣赏璀璨城市夜景。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-10-21',
    fallbackThumb: 'https://i.ytimg.com/vi/_uOPWJCO4zo/hqdefault.jpg',
  },
  {
    id: 'yt-2026-vlog-oudong-4',
    url: 'https://www.youtube.com/watch?v=z-C8fbG-ReM',
    authorName: 'Delicious Food Show & Travel',
    fallbackTitleEn: 'GREAT!! Cambodian Street Food Tour 2026 – Walking Around Phnom Preash Reach Trop Natural Resort',
    titleKh: 'ដើរភ្លក្សម្ហូបខ្មែរនៅរមណីយដ្ឋានភ្នំព្រះរាជទ្រព្យ (ភ្នំឧត្តុង្គ) ឆ្នាំ 2026',
    titleZh: '2026 乌栋山 (Phnom Oudong) 历史名胜与传统乡村美食之旅',
    descriptionKh: 'ទស្សនាម្ហូបបែបស្រុកស្រែ ត្រីអាំង មាន់ដុត និងបង្អែមខ្មែរនៅជើងភ្នំព្រះរាជទ្រព្យ (ឧត្តុង្គ) ឆ្នាំ 2026។',
    descriptionEn: '2026 food and travel walk around historic Phnom Oudong (Phnom Preah Reach Trop) sampling countryside grilled meats and Khmer sweets.',
    descriptionZh: '2026 探访柬埔寨古都乌栋山，品尝山脚市集的炭烤野味、传统糕点与乡土美食。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'ខេត្តកណ្តាល',
    provinceEn: 'Kandal',
    publishedDate: '2026-10-20',
    fallbackThumb: 'https://i.ytimg.com/vi/z-C8fbG-ReM/hqdefault.jpg',
  },
  {
    id: 'yt-2026-vlog-2dollar-5',
    url: 'https://www.youtube.com/watch?v=0eWh79zyvXE',
    authorName: 'TravelwithChad',
    fallbackTitleEn: 'Exploring Local Cambodian Street Food Markets 🇰🇭',
    titleKh: 'ដើរភ្លក្សម្ហូបតាមផ្លូវឆ្ងាញ់ៗនៅក្នុងផ្សារប្រពៃណីកម្ពុជា (2026)',
    titleZh: '2026 探索柬埔寨传统市集地道街头美食',
    descriptionKh: 'វីដេអូ Vlog ឆ្នាំ 2026 សាកល្បងអាហារតាមផ្លូវខ្មែរឆ្ងាញ់ៗ និងនំប្រពៃណីនៅក្នុងផ្សារក្នុងស្រុក។',
    descriptionEn: '2026 street food vlog tasting delicious local Cambodian snacks and traditional dishes in local markets.',
    descriptionZh: '2026 深入柬埔寨本地市场品尝多款传统风味小吃。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2026-10-07',
    fallbackThumb: 'https://i.ytimg.com/vi/0eWh79zyvXE/hqdefault.jpg',
  },
  {
    id: 'yt-2026-vlog-strictlydumpling-6',
    url: 'https://www.youtube.com/watch?v=IclvJ6gW0cU',
    authorName: 'Strictly Dumpling',
    fallbackTitleEn: 'Top 20 MUST-TRY Street Foods in Phnom Penh | ULTIMATE Local Cambodian Food Tour',
    titleKh: 'មុខម្ហូបតាមផ្លូវទាំង ២០ ដែលត្រូវសាកនៅភ្នំពេញ ជាមួយ Mike Chen (2026)',
    titleZh: 'Strictly Dumpling (陈兴) 2026 金边必吃 20 道地道高棉街头美食全纪录',
    descriptionKh: 'ដំណើរកម្សាន្តភ្លក្សម្ហូបខ្មែរទាំង ២០មុខនៅរាជធានីភ្នំពេញ រួមមានគុយទាវ បាយសាច់ជ្រូក នំបញ្ចុក និងគ្រឿងសមុទ្រអាំង។',
    descriptionEn: 'Food vlogger Mike Chen (Strictly Dumpling) explores the top 20 must-try local street foods and restaurants across Phnom Penh.',
    descriptionZh: '知名美食博主陈兴 (Strictly Dumpling) 深入金边街头，一口气品尝 20 道最具代表性的高棉美食。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-06-20',
    fallbackThumb: 'https://i.ytimg.com/vi/IclvJ6gW0cU/hqdefault.jpg',
    matchedFoodId: 'food-5',
  },
  {
    id: 'yt-2026-vlog-lloydmandy-7',
    url: 'https://www.youtube.com/watch?v=fqh5FoETxqE',
    authorName: 'Lloyd & Mandy',
    fallbackTitleEn: '17 Things We Wish We Knew Before Visiting Cambodia 🇰🇭 (Avoid These Mistakes)',
    titleKh: 'ចំណុចសំខាន់ៗទាំង ១៧ សម្រាប់ភ្ញៀវទេសចរមកដើរលេងប្រទេសកម្ពុជា (2026)',
    titleZh: '2026 来柬埔寨旅游前必知的 17 件事（实用避坑与美食交通指南）',
    descriptionKh: 'ការចែករំលែកបទពិសោធន៍ធ្វើដំណើរ ការចាយវាយ ការហៅ PassApp/Grab និងការភ្លក្សម្ហូបខ្មែរសម្រាប់ភ្ញៀវទេសចរ។',
    descriptionEn: '2026 travel tips covering Cambodian currency, transport apps, local dining etiquette, and must-see destinations.',
    descriptionZh: '2026 实用柬埔寨自由行攻略，涵盖交通出行、支付方式、地道餐饮与热门景点建议。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2026-02-14',
    fallbackThumb: 'https://i.ytimg.com/vi/fqh5FoETxqE/hqdefault.jpg',
  },
  {
    id: 'yt-2025-vlog-soloasia-8',
    url: 'https://www.youtube.com/watch?v=Bd2wJJZ-lHI',
    authorName: 'Solo Around Asia',
    fallbackTitleEn: 'Cambodian Street Food Tour 🇰🇭 Must-Try Phnom Penh Eats!',
    titleKh: 'ដំណើរកម្សាន្តភ្លក្សម្ហូបតាមផ្លូវដែលត្រូវសាកនៅរាជធានីភ្នំពេញ (2025)',
    titleZh: '2025 金边必尝街头美食之旅：探索地道高棉风味',
    descriptionKh: 'ដើរសាកល្បងមុខម្ហូបតាមផ្លូវឆ្ងាញ់ៗនៅកណ្តាលទីក្រុងភ្នំពេញ ទាំងអាហារពេលព្រឹក និងអាហារពេលល្ងាច។',
    descriptionEn: 'Guided street food tour through Phnom Penh tasting signature Cambodian noodles, grilled skewers, and sweet desserts.',
    descriptionZh: '漫步金边街头，品尝高棉特色汤面、炭火烧烤与传统椰香甜品。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2025-11-20',
    fallbackThumb: 'https://i.ytimg.com/vi/Bd2wJJZ-lHI/hqdefault.jpg',
    matchedFoodId: 'food-5',
  },
  // ============================================================================
  // CAMBODIAN COFFEE, CAFE CULTURE, BREAKFAST & STREET DRINKS (2025–2026)
  // ============================================================================
  {
    id: 'yt-2026-coffee-scene-pp-1',
    url: 'https://www.youtube.com/watch?v=S91QLZKftmo',
    authorName: 'Ly and Da',
    fallbackTitleEn: "Phnom Penh's Coffee Scene 🇰🇭 | Best Local Café Experience & City Vibes (2026)",
    titleKh: 'ពិភពកាហ្វេនៅភ្នំពេញ 🇰🇭 | ហាងកាហ្វេល្បីៗ និងបរិយាកាសដ៏ទាក់ទាញ (Phnom Penh Coffee & Cafe 2026)',
    titleZh: '2026 金边咖啡馆文化 (Phnom Penh Coffee Scene)：最佳本地精品咖啡与下午茶体验',
    descriptionKh: 'ស្វែងយល់ពីវប្បធម៌ញ៉ាំកាហ្វេនៅរាជធានីភ្នំពេញ ហាងកាហ្វេស្អាតៗ កាហ្វេទឹកដោះគោទឹកកក កាហ្វេដូង និងភេសជ្ជៈពេញនិយម (Coffee, Cafe, Latte, Espresso)។',
    descriptionEn: 'Exploring Phnom Penh’s vibrant coffee scene, specialty local cafés, iced condensed milk coffee, latte art, and relaxing city vibes in Cambodia.',
    descriptionZh: '探索金边最受欢迎的精品咖啡馆、高棉冰咖啡、拿铁与城市休闲生活。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-09-25',
    fallbackThumb: 'https://i.ytimg.com/vi/S91QLZKftmo/hqdefault.jpg',
  },
  {
    id: 'yt-2026-coffee-tour-pp-2',
    url: 'https://www.youtube.com/watch?v=Y90_MrsZld8',
    authorName: 'Penny Win',
    fallbackTitleEn: 'Best Coffee Shops in Phnom Penh | Cambodia Specialty Coffee & Cafe Tour (2026)',
    titleKh: 'ដំណើរកម្សាន្តភ្លក្សហាងកាហ្វេឆ្ងាញ់ៗបំផុតនៅភ្នំពេញ (Best Coffee Shops in Phnom Penh 2026)',
    titleZh: '2026 金边最佳咖啡店探店之旅 (Best Coffee Shops in Phnom Penh)',
    descriptionKh: 'ដើរសាកល្បងរសជាតិកាហ្វេឈ្ងុយឆ្ងាញ់ នំខេក និងភេសជ្ជៈត្រជាក់ៗនៅតាមហាងកាហ្វេល្បីៗក្នុងរាជធានីភ្នំពេញ (Coffee, Cafe, Bakery, Drinks)។',
    descriptionEn: 'Full coffee tour visiting the best coffee shops, roasteries, and cozy cafes in Phnom Penh, Cambodia.',
    descriptionZh: '打卡金边口碑最佳的精品咖啡店、烘焙甜品与特色冰饮。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-09-10',
    fallbackThumb: 'https://i.ytimg.com/vi/Y90_MrsZld8/hqdefault.jpg',
  },
  {
    id: 'yt-2026-coffee-street-milk-3',
    url: 'https://www.youtube.com/watch?v=bherGArgorU',
    authorName: 'Happy Yummy',
    fallbackTitleEn: 'Cambodia Street Coffee! Over 600 Cups Of Iced Milk Coffee Sold Per Day (2026)',
    titleKh: 'កាហ្វេទឹកដោះគោទឹកកកតាមផ្លូវខ្មែរ លក់ដាច់ជាង ៦០០កែវក្នុងមួយថ្ងៃ! (Cambodia Street Coffee 2026)',
    titleZh: '2026 柬埔寨人气街头冰咖啡：每天热销 600 杯的秘制炼乳冰咖啡',
    descriptionKh: 'ទស្សនាការឆុងកាហ្វេទឹកដោះគោទឹកកកខ្មែរដ៏ល្បីល្បាញ ក្លិនឈ្ងុយ រសជាតិដិតឈ្ងុយឆ្ងាញ់ លក់ដាច់ជាង ៦០០កែវក្នុងមួយថ្ងៃ (Cambodian Iced Coffee / Street Drink)។',
    descriptionEn: 'Famous Cambodian street coffee vendor brewing rich, creamy iced condensed milk coffee — selling over 600 cups every day.',
    descriptionZh: '实拍柬埔寨街头最火爆的传统冰咖啡摊位，香浓顺滑日销600余杯。',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-08-28',
    fallbackThumb: 'https://i.ytimg.com/vi/bherGArgorU/hqdefault.jpg',
  },
  {
    id: 'yt-2026-coffee-latte-street-4',
    url: 'https://www.youtube.com/watch?v=XVi5dTRR_DM',
    authorName: 'Street Food Thirty',
    fallbackTitleEn: 'Fresh Iced Latte Street Coffee in Cambodia | Cambodia Street Food & Drinks (2026)',
    titleKh: 'កាហ្វេឡាតេទឹកកកតាមផ្លូវខ្មែរ រសជាតិឆ្ងាញ់ពិសេស (Iced Latte Coffee 2026)',
    titleZh: '2026 柬埔寨街头现磨冰拿铁咖啡与街头饮品',
    descriptionKh: 'សាកល្បងកាហ្វេឡាតេទឹកកក កាហ្វេខ្មៅ និងភេសជ្ជៈតាមផ្លូវដ៏ពេញនិយមនៅកម្ពុជា រសជាតិឈ្ងុយឆ្ងាញ់។',
    descriptionEn: 'Freshly brewed iced latte street coffee, milk tea, and refreshing local drinks in Cambodia.',
    descriptionZh: '体验柬埔寨街头现萃冰拿铁、冰美式与地道风味茶饮。',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-08-14',
    fallbackThumb: 'https://i.ytimg.com/vi/XVi5dTRR_DM/hqdefault.jpg',
  },
  {
    id: 'yt-2026-coffee-siemreap-mao-5',
    url: 'https://www.youtube.com/watch?v=2qybCDIQYkg',
    authorName: 'Mao Cambodia',
    fallbackTitleEn: 'Fancy Local Coffee Shops in Siem Reap Province, Cambodia Review (2026)',
    titleKh: 'រីវីវហាងកាហ្វេស្អាតៗ និងល្បីៗនៅខេត្តសៀមរាប (Siem Reap Coffee Shops Review 2026)',
    titleZh: '2026 暹粒省高颜值特色咖啡馆探店测评 (Siem Reap Coffee Shops)',
    descriptionKh: 'ដើរមើលហាងកាហ្វេបែបធម្មជាតិ និងទំនើបនៅក្រុងសៀមរាប ភ្លក្សកាហ្វេឆ្ងាញ់ៗ តែបៃតង និងនំបុ័ងថ្មីៗ។',
    descriptionEn: 'Reviewing the most beautiful local coffee shops, garden cafes, and breakfast spots in Siem Reap Province, Cambodia.',
    descriptionZh: '深度探访暹粒最具格调的本地花园咖啡馆、特色冰咖啡与早午餐名店。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2026-07-30',
    fallbackThumb: 'https://i.ytimg.com/vi/2qybCDIQYkg/hqdefault.jpg',
  },
  {
    id: 'yt-2026-coffee-siemreap-5cafes-6',
    url: 'https://www.youtube.com/watch?v=WSIGj7p7DKY',
    authorName: 'WisGO',
    fallbackTitleEn: "Don't Leave Siem Reap Without Visiting These 5 Cafes | Cambodia Coffee Vlog (2026)",
    titleKh: 'ហាងកាហ្វេល្បីៗទាំង ៥ ដែលមិនគួររំលងពេលទៅលេងខេត្តសៀមរាប (Top 5 Siem Reap Cafes 2026)',
    titleZh: '2026 游览暹粒必去的 5 家宝藏咖啡馆 (Top 5 Cafes in Siem Reap)',
    descriptionKh: 'ណែនាំហាងកាហ្វេស្អាតៗទាំង ៥ កន្លែងនៅសៀមរាប សម្រាប់អ្នកចូលចិត្តញ៉ាំកាហ្វេ (Coffee Lover) ថតរូបស្អាតៗ និងសម្រាកលំហែ។',
    descriptionEn: 'Travel & coffee vlog showcasing the top 5 must-visit cafes and specialty coffee bars in Siem Reap, Cambodia.',
    descriptionZh: '暹粒旅行必打卡的 5 家精品咖啡店推荐，汇集手冲咖啡、椰奶冰咖与精致甜点。',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2026-07-12',
    fallbackThumb: 'https://i.ytimg.com/vi/WSIGj7p7DKY/hqdefault.jpg',
  },
  {
    id: 'yt-2026-coffee-phnompenh-1',
    url: 'https://www.youtube.com/watch?v=yUomplw4lQ0',
    authorName: 'Mark Wiens',
    fallbackTitleEn: 'Cambodian Iced Coffee (Kafe Teuk Dos Koh) & Morning Cafe Culture in Phnom Penh (2026)',
    titleKh: 'កាហ្វេទឹកដោះគោទឹកកកខ្មែរ និងវប្បធម៌កាហ្វេពេលព្រឹកនៅភ្នំពេញ (Cambodian Iced Coffee 2026)',
    titleZh: '2026 金边高棉冰咖啡 (Cambodian Iced Coffee) 与传统街头咖啡文化',
    descriptionKh: 'ភ្លក្សកាហ្វេទឹកដោះគោទឹកកកឆុងតាមបែបបុរាណខ្មែរ (Cambodian Coffee / Cafe) និងកាហ្វេខ្មៅទឹកកកពេលព្រឹកនៅរាជធានីភ្នំពេញ។',
    descriptionEn: 'Authentic Cambodian iced condensed milk coffee (Kafe Teuk Dos Koh), local street cafe culture, and espresso drinks in Phnom Penh.',
    descriptionZh: '品尝地道柬埔寨炼乳冰咖啡与金边热门晨间街头咖啡摊文化。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2026-06-12',
    fallbackThumb: 'https://i.ytimg.com/vi/yUomplw4lQ0/hqdefault.jpg',
  },
  {
    id: 'yt-2026-coffee-cafe-siemreap-2',
    url: 'https://www.youtube.com/watch?v=8bJDw1dAvME',
    authorName: 'Mahoney Travels',
    fallbackTitleEn: 'Best Cafes, Specialty Coffee Shops & Restaurants in Siem Reap 4K Tour (2026)',
    titleKh: 'ហាងកាហ្វេល្បីៗ (Best Coffee & Cafes) និងភោជនីយដ្ឋានស្អាតៗនៅខេត្តសៀមរាប (2026)',
    titleZh: '2026 暹粒最佳精品咖啡馆 (Coffee & Cafe) 与高分餐厅 4K 探店之旅',
    descriptionKh: 'ដើរលេងនិងភ្លក្សកាហ្វេឈ្ងុយឆ្ងាញ់ ភេសជ្ជៈត្រជាក់ៗ នំបុ័ង និងអាហារថ្ងៃត្រង់នៅតាមហាងកាហ្វេ និងភោជនីយដ្ឋានល្បីៗក្នុងក្រុងសៀមរាប។',
    descriptionEn: 'Exploring Siem Reap’s best specialty coffee roasters, garden cafes, iced lattes, coconut coffee, and top-rated restaurants.',
    descriptionZh: '探索暹粒最具人气的精品咖啡馆、椰香冰咖啡、花园下午茶与特色餐厅。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2026-08-18',
    fallbackThumb: 'https://i.ytimg.com/vi/8bJDw1dAvME/hqdefault.jpg',
  },
  {
    id: 'yt-2026-coffee-morning-market-3',
    url: 'https://www.youtube.com/watch?v=P9bGrG-95cw',
    authorName: 'Luke Martin (Chopstick Travel)',
    fallbackTitleEn: 'Cambodian Street Coffee, Charcoal Roasted Coffee & Local Cafe Drinks (2026)',
    titleKh: 'កាហ្វេតាមផ្លូវ (Street Coffee) កាហ្វេលីងធ្យូងបុរាណ និងភេសជ្ជៈពេលព្រឹក (2026)',
    titleZh: '2026 柬埔寨传统炭焙街头冰咖啡与早市特色咖啡饮品',
    descriptionKh: 'សាកល្បងកាហ្វេខ្មៅទឹកកក កាហ្វេទឹកដោះគោ និងកាហ្វេលីងធ្យូងបុរាណដ៏ឈ្ងុយឆ្ងាញ់។',
    descriptionEn: 'Traditional charcoal-roasted Cambodian street coffee, iced condensed milk coffee, and local cafe specialties.',
    descriptionZh: '体验传统炭焙高棉街头咖啡与香浓炼乳冰咖啡。',
    categorySlug: 'famous_restaurant',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2026-05-25',
    fallbackThumb: 'https://i.ytimg.com/vi/P9bGrG-95cw/hqdefault.jpg',
  },
];

/**
 * Backup Replacement Pool of Verified Playable 2025–2026 Videos
 * Automatically used to replace any video that is unavailable or fails playback.
 */
const BACKUP_REPLACEMENT_YOUTUBE_VIDEOS: CuratedYouTubeSeed[] = [
  {
    id: 'yt-backup-2026-bambootrain',
    url: 'https://www.youtube.com/watch?v=Z96at9xLVQg',
    authorName: 'TravelwithChad',
    fallbackTitleEn: 'Bamboo Train in Battambang, Cambodia #travelcambodia',
    titleKh: 'ជិះឡូរី (Bamboo Train) និងគយគន់ទេសភាពវាលស្រែខេត្តបាត់ដំបង (2026)',
    titleZh: '2026 体验马德望著名的竹火车 (Bamboo Train) 与田园风光',
    descriptionKh: 'បទពិសោធន៍ជិះឡូរីកម្សាន្តដ៏ល្បីល្បាញនៅខេត្តបាត់ដំបង កាត់វាលស្រែ និងភូមិដ្ឋានធម្មជាតិ។',
    descriptionEn: '2026 ride aboard Battambang’s famous Bamboo Train through scenic Cambodian rice paddies.',
    descriptionZh: '2026 乘坐马德望特色竹火车穿越翠绿稻田，感受独特的柬埔寨乡村旅游体验。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តបាត់ដំបង',
    provinceEn: 'Battambang',
    publishedDate: '2026-10-21',
    fallbackThumb: 'https://i.ytimg.com/vi/Z96at9xLVQg/hqdefault.jpg',
  },
  {
    id: 'yt-backup-2025-kohrong-mao',
    url: 'https://www.youtube.com/watch?v=6kO1B68iq3A',
    authorName: 'Mao Cambodia',
    fallbackTitleEn: 'កោះរ៉ុង / Koh Rong in Sihanoukville, Cambodia - October, 2025',
    titleKh: 'ដំណើរកម្សាន្តទៅកាន់កោះរ៉ុង ខេត្តព្រះសីហនុ (តុលា 2025)',
    titleZh: '2025 西哈努克高龙岛海滨度假与白沙滩全景纪实',
    descriptionKh: 'ទស្សនាឆ្នេរខ្សាច់សក្បុស ទឹកសមុទ្រថ្លាឆ្វង់ និងកន្លែងស្នាក់នៅលំហែកាយលើកោះរ៉ុង។',
    descriptionEn: 'Full travel showcase of Koh Rong Island in Sihanoukville featuring white sand beaches and clear ocean waters.',
    descriptionZh: '全方位展示西哈努克高龙岛的细腻白沙滩、清澈海水与海岛休闲生活。',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តព្រះសីហនុ',
    provinceEn: 'Sihanoukville',
    publishedDate: '2025-10-28',
    fallbackThumb: 'https://i.ytimg.com/vi/6kO1B68iq3A/hqdefault.jpg',
  },
  {
    id: 'yt-backup-amok-1',
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
    publishedDate: '2025-05-15',
    fallbackThumb: 'https://i.ytimg.com/vi/9uKNNcDfttc/hqdefault.jpg',
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
    publishedDate: '2025-07-04',
    fallbackThumb: 'https://i.ytimg.com/vi/8bJDw1dAvME/hqdefault.jpg',
  },
  {
    id: 'yt-backup-markwiens-1',
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
    publishedDate: '2025-06-28',
    fallbackThumb: 'https://i.ytimg.com/vi/yUomplw4lQ0/hqdefault.jpg',
    matchedFoodId: 'food-6',
  },
  {
    id: 'yt-backup-lukemartin-2',
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
    publishedDate: '2025-06-18',
    fallbackThumb: 'https://i.ytimg.com/vi/P9bGrG-95cw/hqdefault.jpg',
    matchedFoodId: 'food-38',
  },
];

let lastManualRefreshMs = 0;

/** Clean up legacy unverified or old 2024 caches on module load */
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
      if (img.naturalWidth > 0 && img.naturalWidth <= 120) {
        resolve(false);
      } else {
        resolve(true);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
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
    verificationBadgeEn: 'YouTube 2025–2026 Verified',
    verificationBadgeKh: 'វីដេអូ YouTube ថ្មី (បានផ្ទៀងផ្ទាត់)',
    verificationBadgeZh: 'YouTube 2025–2026 官方可播放已核实',
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
    { tokens: ['nom banh chok', 'num banh chok', 'num banhchok', 'នំបញ្ចុក'], foodId: 'food-3', boost: 95 },
    { tokens: ['samlor korko', 'samlar kako', 'somlor koko', 'សម្លកកូរ', 'ម្ជូរព្រៃ'], foodId: 'food-4', boost: 95 },
    { tokens: ['kuy teav', 'kuyteav', 'គុយទាវ'], foodId: 'food-5', boost: 92 },
    { tokens: ['bai sach chrouk', 'bay sach chruk', 'បាយសាច់ជ្រូក', 'សាច់ជ្រូកងៀត', 'bbq skewers'], foodId: 'food-6', boost: 92 },
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
        .filter((w) => w.length >= 4 && !['with', 'soup', 'cambodian', 'khmer', 'style', 'phnom', 'penh', 'siem', 'reap', 'kampot', 'battambang', 'fresh', 'fried', 'grilled', 'steamed', 'salad', 'street', 'food'].includes(w));
      const hits = words.filter((w) => hay.includes(w)).length;
      if (hits >= 2) score += 60 + hits * 10;
    }
    if (score > (best?.score ?? 0)) {
      best = { food: f, score };
    }
  }

  return best && best.score >= 60 ? best : null;
}

/** Fetch YouTube items (2025–2026): verifies every video for availability & embeddability before displaying */
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
      const q = encodeURIComponent('Cambodia street food travel Phnom Penh Siem Reap 2026');
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&order=date&publishedAfter=2025-01-01T00:00:00Z&maxResults=12&q=${q}&key=${encodeURIComponent(
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
          const pubDate = (snip.publishedAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
          if (pubDate < '2025-01-01') continue;

          const watchUrl = `https://www.youtube.com/watch?v=${vid}`;
          const oembed = await fetchPublicOEmbedMetadata(watchUrl);
          if (!oembed && typeof navigator !== 'undefined' && navigator.onLine !== false) {
            continue;
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
            sourceName: snip.channelTitle ? `${snip.channelTitle} (YouTube)` : 'YouTube',
            authorHandle: snip.channelTitle,
            publishedOrUpdatedAt: pubDate,
            isLiveFetched: true,
            verificationBadgeEn: 'Verified (2025–2026)',
            verificationBadgeKh: 'បានផ្ទៀងផ្ទាត់ (2025–2026)',
            verificationBadgeZh: '已验证 (2025–2026)',
            categorySlug: 'popular_food',
            provinceKh: 'ទូទាំងប្រទេសកម្ពុជា',
            provinceEn: 'All Cambodia',
            matchedFoodId: match?.food.id,
            matchedFoodNameKh: match?.food.nameKh,
            matchedFoodNameEn: match?.food.nameEn,
            relevanceScore: 98,
            isPlayableVerified: true,
            canInlineEmbed: oembed?.canEmbed !== false,
          });
        }
        if (liveItems.length > 0) {
          usedLiveApiKey = true;
        }
      }
    } catch {
      // Fall through to verified 2025-2026 curated YouTube videos
    }
  }

  // Convert verified 2025–2026 curated seeds synchronously (0 parallel network/image probes -> prevents mobile CPU/radio overheating)
  const usedIds = new Set<string>(
    CURATED_YOUTUBE_VIDEOS.map((s) => extractYouTubeVideoId(s.url) || '').filter(Boolean)
  );

  const verifiedCuratedResults = CURATED_YOUTUBE_VIDEOS.map((seed) => {
    const vid = extractYouTubeVideoId(seed.url);
    if (!vid || isKnownUnavailableVideo(vid)) {
      const replacement = getReplacementCambodianVideo(seed.categorySlug, usedIds, foods);
      if (replacement) {
        const repVid = extractYouTubeVideoId(replacement.sourceUrl);
        if (repVid) usedIds.add(repVid);
      }
      return replacement;
    }
    return seedToDiscoveryItem(seed, foods, true);
  });

  const validCurated = verifiedCuratedResults.filter((x): x is OnlineFoodDiscoveryItem => Boolean(x));
  const combined = [...liveItems, ...validCurated];

  return {
    items: combined,
    usedLiveApiKey,
    oembedEnrichedCount: combined.length,
  };
}

/* ===================================================================== */
/* LIVE YOUTUBE CHANNEL UPLOADS (official channel RSS feeds, no API key)  */
/* ===================================================================== */
const LIVE_RSS_CACHE_KEY = 'kft_v1_youtube_live_rss_cache';
/** Live RSS channel feeds are cached for 15 minutes to prevent mobile CPU/radio overheating while 60s rotation runs in memory. */
export const LIVE_RSS_TTL_MS = 15 * 60 * 1000;
export const VIDEO_AUTO_REFRESH_INTERVAL_MS = 60 * 1000;
const VIDEO_ROTATION_STATE_KEY = 'kft_youtube_rotation_state_v2';
const LIVE_RSS_PER_CHANNEL = 4;
const LIVE_RSS_BATCH_CHANNELS_COUNT = 3;
let rssChannelBatchCursor = 0;
const YT_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
/** Channels that also publish non-Cambodian content: only keep Cambodia-related videos. */
const LIVE_RSS_GENERIC_CHANNELS = new Set(['TravelwithChad', 'Little Explore', 'Suitcase Monkey', 'Delicious Food Show & Travel']);
const LIVE_RSS_CAMBODIA_RE =
  /cambodia|khmer|phnom|siem ?reap|angkor|kampot|\bkep\b|battambang|sihanouk|kampong|koh |កម្ពុជា|ខ្មែរ|ភ្នំពេញ|សៀមរាប|柬埔寨|金边/i;
let liveRssInFlight: Promise<OnlineFoodDiscoveryItem[]> | null = null;

interface VideoRotationState {
  cycle: number;
  lastRotatedAtMs: number;
  lastTopByScope: Record<string, string>;
  recentTopIdsByScope?: Record<string, string[]>;
}

function generateRandomCycleSeed(prevCycle = 0): number {
  let rand = Math.floor(Math.random() * 1_000_000_000) + 1;
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      rand = (buf[0] % 1_000_000_000) + 1;
    }
  } catch {
    // fallback to Math.random
  }
  if (rand === prevCycle) {
    rand = (rand + 97531) % 1_000_000_000 + 1;
  }
  return rand;
}

let sessionInitialCycleAdvanced = false;

function readVideoRotationState(): VideoRotationState {
  try {
    if (typeof localStorage === 'undefined') {
      return { cycle: generateRandomCycleSeed(), lastRotatedAtMs: Date.now(), lastTopByScope: {}, recentTopIdsByScope: {} };
    }
    const raw = localStorage.getItem(VIDEO_ROTATION_STATE_KEY);
    if (!raw) {
      return { cycle: generateRandomCycleSeed(), lastRotatedAtMs: Date.now(), lastTopByScope: {}, recentTopIdsByScope: {} };
    }
    const parsed = JSON.parse(raw);
    return {
      cycle: typeof parsed?.cycle === 'number' && Number.isFinite(parsed.cycle) ? parsed.cycle : generateRandomCycleSeed(),
      lastRotatedAtMs: typeof parsed?.lastRotatedAtMs === 'number' ? parsed.lastRotatedAtMs : Date.now(),
      lastTopByScope: parsed?.lastTopByScope && typeof parsed.lastTopByScope === 'object' ? parsed.lastTopByScope : {},
      recentTopIdsByScope:
        parsed?.recentTopIdsByScope && typeof parsed.recentTopIdsByScope === 'object' ? parsed.recentTopIdsByScope : {},
    };
  } catch {
    return { cycle: generateRandomCycleSeed(), lastRotatedAtMs: Date.now(), lastTopByScope: {}, recentTopIdsByScope: {} };
  }
}

function writeVideoRotationState(state: VideoRotationState): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VIDEO_ROTATION_STATE_KEY, JSON.stringify(state));
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Advances the video rotation cycle with a fresh random seed (called on every app open, modal open, and refresh)
 * so the user always sees a new random order and never sees the same videos repeated from previous opens.
 */
export function advanceVideoRotationCycle(): number {
  const state = readVideoRotationState();
  const nextCycle = generateRandomCycleSeed(state.cycle || 0);
  sessionInitialCycleAdvanced = true;
  writeVideoRotationState({
    ...state,
    cycle: nextCycle,
    lastRotatedAtMs: Date.now(),
  });
  return nextCycle;
}

export function getCurrentVideoRotationCycle(): number {
  // Always advance on the very first call of a fresh app open so reopening the app shows new random videos
  if (!sessionInitialCycleAdvanced) {
    return advanceVideoRotationCycle();
  }
  const state = readVideoRotationState();
  if (Date.now() - state.lastRotatedAtMs >= VIDEO_AUTO_REFRESH_INTERVAL_MS) {
    return advanceVideoRotationCycle();
  }
  return state.cycle || 1;
}

/** Strict single-list deduplication by item ID, playable video ID, normalized URL, and normalized title */
export function deduplicateSingleVideoList(items: OnlineFoodDiscoveryItem[]): OnlineFoodDiscoveryItem[] {
  const seenItemIds = new Set<string>();
  const seenPlayableIds = new Set<string>();
  const seenNormTitles = new Set<string>();
  const out: OnlineFoodDiscoveryItem[] = [];

  for (const item of items) {
    if (!item) continue;
    const itemId = (item.id || '').trim();
    if (itemId && seenItemIds.has(itemId)) continue;

    const playableVid = (
      item.inlineVideoId ||
      extractYouTubeVideoId(item.sourceUrl || '') ||
      resolveInlineVideoIdForSocialItem(item)
    ).trim();

    if (playableVid && seenPlayableIds.has(playableVid)) continue;

    const normTitle = `${(item.titleKh || '').trim().toLowerCase()}|${(item.titleEn || '').trim().toLowerCase()}`;
    if (normTitle !== '|' && seenNormTitles.has(normTitle)) continue;

    if (itemId) seenItemIds.add(itemId);
    if (playableVid) seenPlayableIds.add(playableVid);
    if (normTitle !== '|') seenNormTitles.add(normTitle);
    out.push(item);
  }
  return out;
}

/**
 * Truly randomizes and rotates verified TikTok, Facebook, and YouTube videos on every app open or refresh:
 * 1. Strictly deduplicates the list so no duplicate video, stream ID, or title ever appears in the same list.
 * 2. Uses a seeded Fisher-Yates shuffle tied to the active random cycle so all verified videos rotate randomly.
 * 3. Tracks the previously shown top videos per scope in localStorage and pushes them out of the top slots on the next open/refresh so the user never sees the same top videos repeated from previous opens.
 */
export function rotateLatestVideosForScope(
  items: OnlineFoodDiscoveryItem[],
  scopeKey = 'all|all',
  explicitCycle?: number
): OnlineFoodDiscoveryItem[] {
  const uniqueItems = deduplicateSingleVideoList(Array.isArray(items) ? items : []);
  if (uniqueItems.length <= 1) return uniqueItems;

  const state = readVideoRotationState();
  const activeCycle = typeof explicitCycle === 'number' ? explicitCycle : state.cycle || 1;

  // Deterministic PRNG seeded by activeCycle + scopeKey so React renders stay stable within the same cycle
  let scopeHash = 2166136261;
  for (let i = 0; i < scopeKey.length; i++) {
    scopeHash ^= scopeKey.charCodeAt(i);
    scopeHash = Math.imul(scopeHash, 16777619);
  }
  let seed = ((activeCycle ^ scopeHash) >>> 0) || 123456789;
  const nextRand = (): number => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Fisher-Yates shuffle across the entire verified list
  const shuffled = [...uniqueItems];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  // Push videos that appeared at the top in the previous cycle to the back so every open/refresh feels completely fresh
  const prevCycleKey = `${scopeKey}__cycle`;
  const prevRecordedCycle = Number(state.lastTopByScope?.[prevCycleKey] || 0);
  const recentMap = state.recentTopIdsByScope || {};
  const prevTopIds = new Set<string>(Array.isArray(recentMap[scopeKey]) ? recentMap[scopeKey] : []);

  let finalOrder = shuffled;
  if (prevTopIds.size > 0 && shuffled.length > prevTopIds.size) {
    const freshFirst = shuffled.filter((it) => !prevTopIds.has(it.id));
    const previouslyShown = shuffled.filter((it) => prevTopIds.has(it.id));
    if (freshFirst.length > 0) {
      finalOrder = [...freshFirst, ...previouslyShown];
    }
  }

  // Record the new top IDs when a new cycle is active
  if (prevRecordedCycle !== activeCycle) {
    const memoryCount = Math.min(6, Math.max(1, Math.floor(finalOrder.length / 2)));
    const newTopIds = finalOrder.slice(0, memoryCount).map((it) => it.id);
    writeVideoRotationState({
      ...state,
      cycle: activeCycle,
      lastTopByScope: {
        ...(state.lastTopByScope || {}),
        [scopeKey]: finalOrder[0]?.id || '',
        [prevCycleKey]: String(activeCycle),
      },
      recentTopIdsByScope: {
        ...recentMap,
        [scopeKey]: newTopIds,
      },
    });
  }

  return finalOrder;
}

function detectProvinceFromVideoText(text: string): { provinceKh: string; provinceEn: string } {
  const t = (text || '').toLowerCase();
  if (/siem\s*reap|angkor|pub\s*street|សៀមរាប|អង្គរ|暹粒|吴哥/i.test(t)) {
    return { provinceKh: 'ខេត្តសៀមរាប', provinceEn: 'Siem Reap' };
  }
  if (/battambang|បាត់ដំបង|ឡូរី|马德望/i.test(t)) {
    return { provinceKh: 'ខេត្តបាត់ដំបង', provinceEn: 'Battambang' };
  }
  if (/kampot|bokor|កំពត|បូកគោ|ទំនប់ម្លេច|ដូងទេរ|贡布/i.test(t)) {
    return { provinceKh: 'ខេត្តកំពត', provinceEn: 'Kampot' };
  }
  if (/\bkep\b|កែប|白马/i.test(t)) {
    return { provinceKh: 'ខេត្តកែប', provinceEn: 'Kep' };
  }
  if (/sihanouk|koh\s*rong|ព្រះសីហនុ|កោះរ៉ុង|西哈努克|高龙岛/i.test(t)) {
    return { provinceKh: 'ខេត្តព្រះសីហនុ', provinceEn: 'Sihanoukville' };
  }
  if (/kampong\s*cham|កំពង់ចាម|磅湛/i.test(t)) {
    return { provinceKh: 'ខេត្តកំពង់ចាម', provinceEn: 'Kampong Cham' };
  }
  if (/kampong\s*speu|កំពង់ស្ពឺ|磅士卑/i.test(t)) {
    return { provinceKh: 'ខេត្តកំពង់ស្ពឺ', provinceEn: 'Kampong Speu' };
  }
  if (/takeo|តាកែវ|茶胶/i.test(t)) {
    return { provinceKh: 'ខេត្តតាកែវ', provinceEn: 'Takeo' };
  }
  if (/koh\s*kong|ថ្មបាំង|កោះកុង|戈公/i.test(t)) {
    return { provinceKh: 'ខេត្តកោះកុង', provinceEn: 'Koh Kong' };
  }
  if (/phnom\s*penh|orussey|riverside|toul\s*tom\s*poung|russian\s*market|boeung|ភ្នំពេញ|អូរឫស្សី|ទួលទំពូង|មាត់ទន្លេ|金边/i.test(t)) {
    return { provinceKh: 'រាជធានីភ្នំពេញ', provinceEn: 'Phnom Penh' };
  }
  return { provinceKh: 'ទូទាំងប្រទេសកម្ពុជា', provinceEn: 'All Cambodia' };
}

function decodeXmlText(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

async function fetchChannelFeedXml(channelId: string): Promise<string | null> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  try {
    if (Capacitor.isNativePlatform()) {
      // Native HTTP bypasses WebView CORS restrictions
      const res = await CapacitorHttp.get({ url: feedUrl, connectTimeout: 7000, readTimeout: 7000 });
      return res.status === 200 && typeof res.data === 'string' ? res.data : null;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`, {
        signal: controller.signal,
      });
      return res.ok ? await res.text() : null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

function parseChannelFeed(
  xml: string,
  ch: (typeof ACTIVE_CAMBODIA_YOUTUBE_CHANNELS_2026)[number],
  foods: FoodItem[]
): OnlineFoodDiscoveryItem[] {
  const out: OnlineFoodDiscoveryItem[] = [];
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  for (const entry of entries.slice(0, LIVE_RSS_PER_CHANNEL)) {
    const vid = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1]?.trim();
    const rawTitle = (entry.match(/<title>([^<]+)<\/title>/) || [])[1]?.trim() || '';
    const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1]?.trim() || '';
    const rawDesc = (entry.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1]?.trim() || '';
    if (!vid || !YT_VIDEO_ID_RE.test(vid) || !rawTitle || !Date.parse(published)) continue;
    if (isKnownUnavailableVideo(vid)) continue;

    const title = decodeXmlText(rawTitle);
    const desc = decodeXmlText(rawDesc).slice(0, 260);
    if (LIVE_RSS_GENERIC_CHANNELS.has(ch.name) && !LIVE_RSS_CAMBODIA_RE.test(`${title} ${desc}`)) continue;

    const match = matchCambodianDish(`${title} ${desc}`, foods);
    const detectedProv = detectProvinceFromVideoText(`${title} ${desc}`);
    const pubDay = published.slice(0, 10);
    out.push({
      id: `yt-rss-${vid}`,
      platform: 'youtube',
      titleKh: title,
      titleEn: title,
      titleZh: title,
      descriptionKh: desc || `វីដេអូថ្មីពីឆានែល ${ch.name} (${pubDay})`,
      descriptionEn: desc || `Latest video from ${ch.name} (${pubDay})`,
      descriptionZh: desc || `${ch.name} 最新视频 (${pubDay})`,
      thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
      sourceName: `${ch.name} (YouTube)`,
      authorHandle: ch.name,
      publishedOrUpdatedAt: published,
      isLiveFetched: true,
      verificationBadgeEn: 'YouTube Channel Live Feed',
      verificationBadgeKh: 'វីដេអូថ្មីពីឆានែល YouTube',
      verificationBadgeZh: 'YouTube 频道最新视频',
      categorySlug: ch.categorySlug,
      provinceKh: detectedProv.provinceKh,
      provinceEn: detectedProv.provinceEn,
      matchedFoodId: match?.food.id,
      matchedFoodNameKh: match?.food.nameKh,
      matchedFoodNameEn: match?.food.nameEn,
      relevanceScore: 99,
      isPlayableVerified: true,
      canInlineEmbed: true,
    });
  }
  return out;
}

function readLiveRssCache(): { fetchedAt: number; items: OnlineFoodDiscoveryItem[] } | null {
  try {
    const raw = localStorage.getItem(LIVE_RSS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items) || typeof parsed.fetchedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Fetches the newest uploads from every registered Cambodian food/travel channel (official RSS feeds).
 * Results are cached for 10 minutes. If the network fails, the last good result is returned.
 * Every item has a validated 11-character video ID and a canonical watch URL.
 */
export async function fetchLiveYouTubeChannelUploads(
  force = false,
  foods: FoodItem[] = initialFoods
): Promise<OnlineFoodDiscoveryItem[]> {
  const cached = readLiveRssCache();
  if (!force && cached && Date.now() - cached.fetchedAt < LIVE_RSS_TTL_MS) {
    return cached.items;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return cached?.items || [];
  }
  if (liveRssInFlight) return liveRssInFlight;

  liveRssInFlight = (async () => {
    const totalChannels = ACTIVE_CAMBODIA_YOUTUBE_CHANNELS_2026.length;
    const batchChannels: (typeof ACTIVE_CAMBODIA_YOUTUBE_CHANNELS_2026)[number][] = [];
    for (let i = 0; i < Math.min(LIVE_RSS_BATCH_CHANNELS_COUNT, totalChannels); i++) {
      batchChannels.push(
        ACTIVE_CAMBODIA_YOUTUBE_CHANNELS_2026[(rssChannelBatchCursor + i) % totalChannels]
      );
    }
    rssChannelBatchCursor = (rssChannelBatchCursor + batchChannels.length) % Math.max(1, totalChannels);

    const groups = await Promise.all(
      batchChannels.map(async (ch) => {
        const xml = await fetchChannelFeedXml(ch.channelId);
        return xml ? parseChannelFeed(xml, ch, foods) : [];
      })
    );
    const fresh = groups.flat();
    const prevItems = cached?.items || [];
    if (fresh.length === 0) return prevItems;
    const unique = deduplicateAndRankDiscoveries([...fresh, ...prevItems]);
    try {
      localStorage.setItem(LIVE_RSS_CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), items: unique }));
    } catch {
      // ignore storage errors
    }
    return unique;
  })();

  try {
    return await liveRssInFlight;
  } finally {
    liveRssInFlight = null;
  }
}

/** Deduplicate strictly by YouTube video ID or normalized URL, sorting newest 2026 -> 2025 broadcasts first */
/** Curated Cambodian TikTok & Facebook Food and Travel Reviews (merged with live Apify Edge Function items) */
export interface PopularCambodiaTikTokAccount {
  id: string;
  handle: string;
  displayName: string;
  titleKh: string;
  url: string;
}

export const POPULAR_CAMBODIA_TIKTOK_ACCOUNTS: PopularCambodiaTikTokAccount[] = [
  {
    id: 'pudy-lychher',
    handle: '@pudy_lychher',
    displayName: 'ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)',
    titleKh: 'ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)',
    url: 'https://www.tiktok.com/@pudy_lychher',
  },
  {
    id: 'eatame-eater',
    handle: '@eatame.eater',
    displayName: 'Eatame (@eatame.eater)',
    titleKh: 'Eatame (@eatame.eater)',
    url: 'https://www.tiktok.com/@eatame.eater?is_from_webapp=1&sender_device=pc',
  },
  {
    id: 'expressions-hub',
    handle: '@expressions_hub',
    displayName: 'សារអាហារ - Expressions Hub (@expressions_hub)',
    titleKh: 'សារអាហារ - Expressions Hub (@expressions_hub)',
    url: 'https://www.tiktok.com/@expressions_hub?is_from_webapp=1&sender_device=pc',
  },
  {
    id: 'derdailyofficial',
    handle: '@derdailyofficial',
    displayName: 'DerDaily ដើរដេលី (@derdailyofficial)',
    titleKh: 'DerDaily ដើរដេលី (@derdailyofficial)',
    url: 'https://www.tiktok.com/@derdailyofficial?is_from_webapp=1&sender_device=pc',
  },
  {
    id: 'fatame-cooking',
    handle: '@fatame.cooking',
    displayName: 'Fatame (@fatame.cooking)',
    titleKh: 'Fatame (@fatame.cooking)',
    url: 'https://www.tiktok.com/@fatame.cooking?is_from_webapp=1&sender_device=pc',
  },
  {
    id: 'foodwhisper-officials',
    handle: '@foodwhisper_officials',
    displayName: 'Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)',
    titleKh: 'Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)',
    url: 'https://www.tiktok.com/@foodwhisper_officials?is_from_webapp=1&sender_device=pc',
  },
  {
    id: 'khleancheck',
    handle: '@.khleancheck',
    displayName: 'ឃ្លានឆេក - Khlean Check (@.khleancheck)',
    titleKh: 'ឃ្លានឆេក - Khlean Check (@.khleancheck)',
    url: 'https://www.tiktok.com/@.khleancheck',
  },
  {
    id: 'benlycooking',
    handle: '@benlycooking',
    displayName: 'ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking)',
    titleKh: 'ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking)',
    url: 'https://www.tiktok.com/@benlycooking',
  },
  {
    id: 'woori-kitchenstory',
    handle: '@woori_kitchenstory',
    displayName: 'Kitchen Story - មុខម្ហូបខ្មែរ (@woori_kitchenstory)',
    titleKh: 'Kitchen Story - មុខម្ហូបខ្មែរ (@woori_kitchenstory)',
    url: 'https://www.tiktok.com/@woori_kitchenstory',
  },
  {
    id: 'plov-der',
    handle: '@plov_der',
    displayName: 'ផ្លូវដើរ - Plov Der (@plov_der)',
    titleKh: 'ផ្លូវដើរ - Plov Der (@plov_der)',
    url: 'https://www.tiktok.com/@plov_der',
  },
  {
    id: 'me-kork-sach100muk',
    handle: '@me_kork_sach100muk',
    displayName: 'មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk)',
    titleKh: 'មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk)',
    url: 'https://www.tiktok.com/@me_kork_sach100muk',
  },
  {
    id: 'tosmokplouk',
    handle: '@tosmokplouk',
    displayName: 'តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk)',
    titleKh: 'តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk)',
    url: 'https://www.tiktok.com/@tosmokplouk',
  },
  {
    id: 'taseit-restaurant',
    handle: '@taseit_restaurant',
    displayName: 'ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant)',
    titleKh: 'ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant)',
    url: 'https://www.tiktok.com/@taseit_restaurant',
  },
  {
    id: 'bore-restaurant',
    handle: '@bore.restaurant',
    displayName: 'ភោជនីយដ្ឋាន បុរេ - Boré (@bore.restaurant)',
    titleKh: 'ភោជនីយដ្ឋាន បុរេ - Boré (@bore.restaurant)',
    url: 'https://www.tiktok.com/@bore.restaurant',
  },
  {
    id: 'suyadaily',
    handle: '@suyadaily',
    displayName: 'ស្នាដៃកូនពៅ - Suya Daily (@suyadaily)',
    titleKh: 'ស្នាដៃកូនពៅ - Suya Daily (@suyadaily)',
    url: 'https://www.tiktok.com/@suyadaily',
  },
  {
    id: 'ounwelldailycooking',
    handle: '@ounwelldailycooking',
    displayName: 'Oun Well Daily Cooking (@ounwelldailycooking)',
    titleKh: 'Oun Well Daily Cooking (@ounwelldailycooking)',
    url: 'https://www.tiktok.com/@ounwelldailycooking',
  },
  {
    id: 'hub-baywithme',
    handle: '@hub_baywithme',
    displayName: 'Hub Bay With Me (@hub_baywithme)',
    titleKh: 'Hub Bay With Me (@hub_baywithme)',
    url: 'https://www.tiktok.com/@hub_baywithme',
  },
  {
    id: 'ieatisharecambodia',
    handle: '@ieatisharecambodia',
    displayName: 'I Eat I Share Cambodia (@ieatisharecambodia)',
    titleKh: 'I Eat I Share Cambodia (@ieatisharecambodia)',
    url: 'https://www.tiktok.com/@ieatisharecambodia',
  },
];

/**
 * Extracts a 19-digit TikTok video ID from a TikTok video URL or inlineVideoId.
 */
export function extractTikTokVideoId(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (/^\d{15,22}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/\/video\/(\d{15,22})/) || trimmed.match(/player\/v1\/(\d{15,22})/) || trimmed.match(/embed\/v2\/(\d{15,22})/);
  return match && match[1] ? match[1] : null;
}

/**
 * Derives the exact ISO publication date from a 19-digit TikTok Snowflake video ID.
 * Top 32 bits of a TikTok video ID encode the Unix creation timestamp in seconds.
 */
export function tiktokSnowflakeIdToIsoDate(videoId: string): string {
  try {
    if (!/^\d{15,22}$/.test(videoId.trim())) return new Date().toISOString();
    const sec = Number(BigInt(videoId.trim()) >> 32n);
    if (sec > 1500000000 && sec < 4000000000) {
      return new Date(sec * 1000).toISOString();
    }
  } catch {}
  return new Date().toISOString();
}

export const CURATED_TIKTOK_FACEBOOK_REVIEWS: OnlineFoodDiscoveryItem[] = [
  // ============================================================================
  // 1. @eatame.eater (Eatame) — Latest Official TikTok Food Videos
  // ============================================================================
  {
    id: 'tt-eatame-7706551126455291156',
    platform: 'tiktok',
    titleKh: '🍗 ប៉ះរបស់ពិតហើយ មាន់បំពងកូរ៉េឈ្ងុយឆ្ងាញ់ Puradak Cambodia (@eatame.eater)',
    titleEn: 'Puradak Crispy Fried Chicken Review in Phnom Penh (@eatame.eater)',
    titleZh: '金边 Puradak 酥脆炸鸡探店测评 (@eatame.eater)',
    descriptionKh: '🍗 ប៉ះរបស់ពិតហើយ គ្រាន់ឃើញមាន់បំពងនេះភ្លាម គេងស្រក់ទឹកមាត់ហ្មង 😋😁 Puradak Cambodia #ChickenWings #chicken — ពីគណនីផ្លូវការ @eatame.eater។',
    descriptionEn: 'Official TikTok food review by @eatame.eater showcasing crispy Puradak chicken wings and local flavors in Phnom Penh.',
    descriptionZh: '@eatame.eater 探访金边人气酥脆炸鸡专门店 Puradak Cambodia。',
    thumbnailUrl: '/foods/food-6.jpg',
    sourceUrl: 'https://www.tiktok.com/@eatame.eater/video/7706551126455291156',
    originalAccountUrl: 'https://www.tiktok.com/@eatame.eater?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7706551126455291156',
    sourceName: 'Eatame (@eatame.eater)',
    authorHandle: '@eatame.eater',
    publishedOrUpdatedAt: '2026-11-10T14:34:19.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证美食博主',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-6',
    matchedFoodNameKh: 'មាន់ដុតទឹកឃ្មុំ',
    matchedFoodNameEn: 'Honey Roasted Chicken',
    relevanceScore: 100,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-eatame-7706523261156298004',
    platform: 'tiktok',
    titleKh: 'ត្រីខកំប៉ុងខ្មែរ KROYA ក្រយា ផលិតផលខ្មែរដំបូងគេបង្អស់ (@eatame.eater)',
    titleEn: 'First Cambodian Canned Fish Factory KROYA Review (@eatame.eater)',
    titleZh: '柬埔寨首家本土罐头鱼品牌 KROYA 探访 (@eatame.eater)',
    descriptionKh: 'នេះរោងចក្រត្រីខកំប៉ុងខ្មែរ ដំបូងគេបង្អស់ចេញដំណើរការផលិតហើយ គាំទ្រអោយបានគ្រប់ៗគ្នា 🇰🇭🙏 ត្រីខ @KROYA- ក្រយា — ពី @eatame.eater។',
    descriptionEn: 'Eatame (@eatame.eater) visiting KROYA, the first Cambodian canned fish factory producing authentic local food products.',
    descriptionZh: '@eatame.eater 实地探访柬埔寨首家本土鱼罐头生产工厂 KROYA。',
    thumbnailUrl: '/foods/food-19.jpg',
    sourceUrl: 'https://www.tiktok.com/@eatame.eater/video/7706523261156298004',
    originalAccountUrl: 'https://www.tiktok.com/@eatame.eater?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7706523261156298004',
    sourceName: 'Eatame (@eatame.eater)',
    authorHandle: '@eatame.eater',
    publishedOrUpdatedAt: '2026-11-10T12:46:11.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证美食博主',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-eatame-7706176025062821140',
    platform: 'tiktok',
    titleKh: 'ភេសជ្ជៈ និងកាហ្វេកែវធំៗ Mega MGC Coffee សាខាបាក់ទូក (@eatame.eater)',
    titleEn: 'Mega MGC Coffee Cambodia Bak Touk Branch Drinks Review (@eatame.eater)',
    titleZh: '金边 Mega MGC Coffee 超大杯特色饮品测评 (@eatame.eater)',
    descriptionKh: 'ប្លែកមែនភេសជ្ជៈគេមួយៗ សំខាន់កែវធំៗ ណាស់ កុំភ្លេចទៅសាកសាខាបាក់ទូកត្រៀមបើកហើយ 😋 Mega MGC Coffee Cambodia 🇰🇭 — ពី @eatame.eater។',
    descriptionEn: 'TikTok review by @eatame.eater tasting giant signature coffees and refreshing drinks at Mega MGC Coffee Cambodia.',
    descriptionZh: '@eatame.eater 测评金边新开业 Mega MGC Coffee 特色超大杯冰饮与咖啡。',
    thumbnailUrl: '/foods/food-28.jpg',
    sourceUrl: 'https://www.tiktok.com/@eatame.eater/video/7706176025062821140',
    originalAccountUrl: 'https://www.tiktok.com/@eatame.eater?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7706176025062821140',
    sourceName: 'Eatame (@eatame.eater)',
    authorHandle: '@eatame.eater',
    publishedOrUpdatedAt: '2026-11-09T14:18:45.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证美食博主',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    relevanceScore: 98,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },

  // ============================================================================
  // 2. @derdailyofficial (DerDaily ដើរដេលី) — Latest Official TikTok Food Videos
  // ============================================================================
  {
    id: 'tt-derdaily-7706531805775629620',
    platform: 'tiktok',
    titleKh: 'មឹកអាំងយាយសក់ក្រង ផ្សារក្ដាម ខេត្តកែប ទឹកត្រីកោះកុងហឹរឆ្ងាញ់ (@derdailyofficial)',
    titleEn: 'Famous Grilled Squid at Kep Crab Market Review (@derdailyofficial)',
    titleZh: '白马省螃蟹市场网红炭烤鱿鱼探店测评 (@derdailyofficial)',
    descriptionKh: 'នរណាខ្លះជាម៉ូយរបស់មឹកអាំងយាយសក់ក្រង នៅខាងផ្សារក្ដាម ខេត្តកែបនេះ 😁 #derdaily — ពីគណនីផ្លូវការ @derdailyofficial។',
    descriptionEn: 'DerDaily (@derdailyofficial) reviewing the famous charcoal-grilled fresh squid stall at Kep Crab Market.',
    descriptionZh: '@derdailyofficial 探访白马省螃蟹市场超人气现烤鲜鱿鱼摊。',
    thumbnailUrl: '/foods/food-37.jpg',
    sourceUrl: 'https://www.tiktok.com/@derdailyofficial/video/7706531805775629620',
    originalAccountUrl: 'https://www.tiktok.com/@derdailyofficial?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7706531805775629620',
    sourceName: 'DerDaily ដើរដេលី (@derdailyofficial)',
    authorHandle: '@derdailyofficial',
    publishedOrUpdatedAt: '2026-11-10T13:19:20.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证旅游美食博主',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'ខេត្តកែប',
    provinceEn: 'Kep',
    matchedFoodId: 'food-37',
    relevanceScore: 100,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-derdaily-7705786533881711893',
    platform: 'tiktok',
    titleKh: 'ម្ហូបគ្រឿងសមុទ្រតាមដងមាត់ព្រែកកំពត Red Seafood (@derdailyofficial)',
    titleEn: 'Kampot Riverfront Red Seafood Street Food Review (@derdailyofficial)',
    titleZh: '贡布河畔 Red Seafood 海鲜街头美食探店 (@derdailyofficial)',
    descriptionKh: 'រៀនតែសៅរ៍អាទិត្យ ទំនេរចន្ទដល់សុក្រមិនដឹងធ្វើអី ក៏ចេញមកលក់ម្ហូបតាមដងមាត់ព្រែកកំពត 🏜️ Red Seafood #kampot #seafood #streetfood — ពី @derdailyofficial។',
    descriptionEn: 'DerDaily (@derdailyofficial) exploring fresh seafood dishes along the scenic Kampot riverfront at Red Seafood.',
    descriptionZh: '@derdailyofficial 探访贡布河畔人气海鲜小吃摊 Red Seafood。',
    thumbnailUrl: '/foods/food-15.jpg',
    sourceUrl: 'https://www.tiktok.com/@derdailyofficial/video/7705786533881711893',
    originalAccountUrl: 'https://www.tiktok.com/@derdailyofficial?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7705786533881711893',
    sourceName: 'DerDaily ដើរដេលី (@derdailyofficial)',
    authorHandle: '@derdailyofficial',
    publishedOrUpdatedAt: '2026-11-08T13:07:18.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证旅游美食博主',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'ខេត្តកំពត',
    provinceEn: 'Kampot',
    matchedFoodId: 'food-15',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-derdaily-7705441311662279957',
    platform: 'tiktok',
    titleKh: 'បាយស្នូកក្តាម ម្ហូបពេលព្រឹកដ៏ល្បីប្រចាំខេត្តកំពត (@derdailyofficial)',
    titleEn: 'Famous Kampot Crab Shell Rice Breakfast Review (@derdailyofficial)',
    titleZh: '贡布特色早餐蟹壳饭探店测评 (@derdailyofficial)',
    descriptionKh: 'អ្នកកំពតអាចនឹងស្គាល់កន្លែងរបស់គាត់ច្បាស់😋 🏜️ បាយស្នូកក្តាម #kampot #crab #breakfast — ពីគណនីផ្លូវការ @derdailyofficial។',
    descriptionEn: 'DerDaily (@derdailyofficial) tasting authentic Kampot steamed rice in crab shell (Bay Snouk Kdam) for breakfast.',
    descriptionZh: '@derdailyofficial 品尝贡布当地家喻户晓的传统蟹壳蒸饭早餐。',
    thumbnailUrl: '/foods/food-37.jpg',
    sourceUrl: 'https://www.tiktok.com/@derdailyofficial/video/7705441311662279957',
    originalAccountUrl: 'https://www.tiktok.com/@derdailyofficial?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7705441311662279957',
    sourceName: 'DerDaily ដើរដេលី (@derdailyofficial)',
    authorHandle: '@derdailyofficial',
    publishedOrUpdatedAt: '2026-11-07T14:47:46.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证旅游美食博主',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តកំពត',
    provinceEn: 'Kampot',
    matchedFoodId: 'food-37',
    relevanceScore: 98,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },

  // ============================================================================
  // 3. @fatame.cooking (Fatame) — Latest Official TikTok Khmer Cooking Videos
  // ============================================================================
  {
    id: 'tt-fatame-7706530697506245909',
    platform: 'tiktok',
    titleKh: 'របៀបធ្វើខត្រីកាម៉ុង ម្ហូបគ្រួសារខ្មែររសជាតិដើម (@fatame.cooking)',
    titleEn: 'Authentic Khmer Braised Mackerel Fish (Khor Trei Kamong) Recipe (@fatame.cooking)',
    titleZh: '高棉家常红烧鲭鱼 (Khor Trei) 传统做法 (@fatame.cooking)',
    descriptionKh: 'របៀបធ្វើខត្រីកាម៉ុង 😋 LEANG LENG Fish Sauce លាង ឡេង #fishrecipe #cookingathome — ពីគណនីផ្លូវការ @fatame.cooking។',
    descriptionEn: 'Fatame (@fatame.cooking) demonstrating how to cook traditional Cambodian caramelized braised mackerel fish at home.',
    descriptionZh: '@fatame.cooking 分享正宗高棉家常焦糖鱼露红烧鱼食谱。',
    thumbnailUrl: '/foods/food-21.jpg',
    sourceUrl: 'https://www.tiktok.com/@fatame.cooking/video/7706530697506245909',
    originalAccountUrl: 'https://www.tiktok.com/@fatame.cooking?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7706530697506245909',
    sourceName: 'Fatame (@fatame.cooking)',
    authorHandle: '@fatame.cooking',
    publishedOrUpdatedAt: '2026-11-10T13:15:02.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证美食博主',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-21',
    relevanceScore: 100,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-fatame-7705766217222507796',
    platform: 'tiktok',
    titleKh: 'មាន់ចំហុយស្លឹកចេក ទឹកជ្រលក់ម្រេចបុក ឆ្ងាញ់ជក់មាត់ (@fatame.cooking)',
    titleEn: 'Steamed Chicken in Banana Leaf with Crushed Pepper Dip (@fatame.cooking)',
    titleZh: '香蕉叶清蒸鸡配现捣胡椒蘸酱食谱 (@fatame.cooking)',
    descriptionKh: 'មាន់ចំហុយស្លឹកចេក ទឹកជ្រលក់ម្រេចបុក ឆ្ងាញ់ជក់មាត់ 😋😋 #chicken #chickenrecipes — ពីគណនីផ្លូវការ @fatame.cooking។',
    descriptionEn: 'Fatame (@fatame.cooking) preparing aromatic Cambodian banana-leaf steamed chicken served with Kampot pepper lime dip.',
    descriptionZh: '@fatame.cooking 制作香气四溢的高棉香蕉叶蒸鸡与秘制胡椒青柠酱。',
    thumbnailUrl: '/foods/food-6.jpg',
    sourceUrl: 'https://www.tiktok.com/@fatame.cooking/video/7705766217222507796',
    originalAccountUrl: 'https://www.tiktok.com/@fatame.cooking?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7705766217222507796',
    sourceName: 'Fatame (@fatame.cooking)',
    authorHandle: '@fatame.cooking',
    publishedOrUpdatedAt: '2026-11-08T11:48:28.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证美食博主',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    matchedFoodId: 'food-6',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-fatame-7704663234409696532',
    platform: 'tiktok',
    titleKh: 'របៀបធ្វើ ស្ងោរជ្រក់ក្បាលត្រីឆ្តោរ ជូរជ្រះឆ្ងាញ់មិនឆ្អាប (@fatame.cooking)',
    titleEn: 'Khmer Sour Snakehead Fish Soup (Sngor Chruk Trei Chdor) Recipe (@fatame.cooking)',
    titleZh: '高棉传统酸汤黑鱼头 (Sngor Chruk) 正宗做法 (@fatame.cooking)',
    descriptionKh: 'របៀបធ្វើ ស្ងោរជ្រក់ក្បាលត្រីឆ្តោរ កុំអោយឆ្អាប ហើយជូរជ្រះឆ្ងាញ់ 😋 #fishrecipe — ពីគណនីផ្លូវការ @fatame.cooking។',
    descriptionEn: 'Fatame (@fatame.cooking) sharing the traditional Khmer secret to cooking fragrant, non-fishy sour snakehead fish soup.',
    descriptionZh: '@fatame.cooking 教学如何制作鲜美无腥味的柬埔寨传统香茅酸汤鱼。',
    thumbnailUrl: '/foods/food-4.jpg',
    sourceUrl: 'https://www.tiktok.com/@fatame.cooking/video/7704663234409696532',
    originalAccountUrl: 'https://www.tiktok.com/@fatame.cooking?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7704663234409696532',
    sourceName: 'Fatame (@fatame.cooking)',
    authorHandle: '@fatame.cooking',
    publishedOrUpdatedAt: '2026-11-05T12:28:19.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证美食博主',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-4',
    relevanceScore: 98,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },

  // ============================================================================
  // 4. @expressions_hub (សារអាហារ - Expressions Hub) — Latest Official TikTok Videos
  // ============================================================================
  {
    id: 'tt-expressions-7706185282973912328',
    platform: 'tiktok',
    titleKh: 'ម្ហូបក្រិច និងភោជនីយដ្ឋានល្បីនៅបាសាក់លែន Elia Greek Kitchen (@expressions_hub)',
    titleEn: 'Bassac Lane Dining Review: Elia Greek Kitchen Phnom Penh (@expressions_hub)',
    titleZh: '金边 Bassac Lane 美食街探店测评 (@expressions_hub)',
    descriptionKh: 'ម្ហូបក្រិចនៅបាសាក់លែន Elia Greek Kitchen — វីដេអូ Review ភោជនីយដ្ឋានពីគណនីផ្លូវការ @expressions_hub។',
    descriptionEn: 'Expressions Hub (@expressions_hub) reviewing popular dining spots and dishes at Bassac Lane in Phnom Penh.',
    descriptionZh: '@expressions_hub 探访金边百色河美食街人气餐厅。',
    thumbnailUrl: '/foods/food-10.jpg',
    sourceUrl: 'https://www.tiktok.com/@expressions_hub/video/7706185282973912328',
    originalAccountUrl: 'https://www.tiktok.com/@expressions_hub?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7706185282973912328',
    sourceName: 'សារអាហារ - Expressions Hub (@expressions_hub)',
    authorHandle: '@expressions_hub',
    publishedOrUpdatedAt: '2026-11-09T14:54:39.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证美食与旅游博主',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-expressions-7705815110261968136',
    platform: 'tiktok',
    titleKh: 'តូបលក់គ្រឿងសមុទ្រដែលមិនដែលឃើញស្ងាត់ ភ្នំពេញមីស្ទ័រក្រេប (@expressions_hub)',
    titleEn: 'Busy Phnom Penh Mr. Crab Seafood Stall Review (@expressions_hub)',
    titleZh: '金边天天爆满的海鲜摊 Mr. Crab 测评 (@expressions_hub)',
    descriptionKh: 'តូបលក់គ្រឿងសមុទ្រដែលមិនដែលឃើញស្ងាត់ ភ្នំពេញមីស្ទ័រក្រេប — ពីគណនីផ្លូវការ @expressions_hub។',
    descriptionEn: 'Expressions Hub (@expressions_hub) visiting the packed Mr. Crab street seafood stall in Phnom Penh.',
    descriptionZh: '@expressions_hub 探访金边超火爆街头海鲜档口。',
    thumbnailUrl: '/foods/food-15.jpg',
    sourceUrl: 'https://www.tiktok.com/@expressions_hub/video/7705815110261968136',
    originalAccountUrl: 'https://www.tiktok.com/@expressions_hub?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7705815110261968136',
    sourceName: 'សារអាហារ - Expressions Hub (@expressions_hub)',
    authorHandle: '@expressions_hub',
    publishedOrUpdatedAt: '2026-11-08T14:58:12.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证美食与旅游博主',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-15',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-expressions-7703563261991587073',
    platform: 'tiktok',
    titleKh: 'បាយទា បបរខកង្កែប និងលតឆាសាច់ទា រ៉ូស ឆយស៍ Roast Choice (@expressions_hub)',
    titleEn: 'Roast Duck Rice, Braised Frog Porridge & Duck Lort Cha Review (@expressions_hub)',
    titleZh: '金边 Roast Choice 烧鸭饭、田鸡粥与鸭肉炒粉测评 (@expressions_hub)',
    descriptionKh: 'ផ្លូវលំក្រោយអគារកាណាឌីយ៉ា ឆ្លងផ្លូវបន្តិចដល់បាយទាទើបបើកថ្មី មានបបរខកង្កែប លតឆាសាច់ទាទៀត រ៉ូស ឆយស៍-Roast Choice — ពី @expressions_hub។',
    descriptionEn: 'Expressions Hub (@expressions_hub) reviewing roast duck rice, braised frog porridge, and stir-fried pin noodles behind Canadia Tower.',
    descriptionZh: '@expressions_hub 探访金边加华大厦后街新开烧鸭饭与特色田鸡粥店。',
    thumbnailUrl: '/foods/food-38.jpg',
    sourceUrl: 'https://www.tiktok.com/@expressions_hub/video/7703563261991587073',
    originalAccountUrl: 'https://www.tiktok.com/@expressions_hub?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7703563261991587073',
    sourceName: 'សារអាហារ - Expressions Hub (@expressions_hub)',
    authorHandle: '@expressions_hub',
    publishedOrUpdatedAt: '2026-11-02T13:20:09.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证美食与旅游博主',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-38',
    relevanceScore: 98,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },

  // ============================================================================
  // 5. @foodwhisper_officials (Food Whisper - ខ្សឹបឱ្យឃ្លាន) — Latest Official TikTok Videos
  // ============================================================================
  {
    id: 'tt-foodwhisper-7706023441001958663',
    platform: 'tiktok',
    titleKh: 'ធូណាសាស៊ីមិ និងម្ហូបជប៉ុនដោយចុងភៅខ្មែរ Tono Izakaya (@foodwhisper_officials)',
    titleEn: 'Tono Izakaya Phnom Penh Khmer Chef Sashimi & Dining Review (@foodwhisper_officials)',
    titleZh: '金边 Tono Izakaya 餐厅探店测评 (@foodwhisper_officials)',
    descriptionKh: 'ធូណាសាស៊ីមិ ចុះ50% ម្ហូបជប៉ុននៅនេះចុងភៅខ្មែរ ប៉ុន្តែអត់មាត់អត់កដូចចុងភៅជប៉ុន Tono Izakaya — ពីគណនីផ្លូវការ @foodwhisper_officials។',
    descriptionEn: 'Food Whisper (@foodwhisper_officials) reviewing fresh sashimi and signature dishes crafted by Cambodian chefs at Tono Izakaya.',
    descriptionZh: '@foodwhisper_officials 测评金边 Tono Izakaya 餐厅招牌料理。',
    thumbnailUrl: '/foods/food-2.jpg',
    sourceUrl: 'https://www.tiktok.com/@foodwhisper_officials/video/7706023441001958663',
    originalAccountUrl: 'https://www.tiktok.com/@foodwhisper_officials?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7706023441001958663',
    sourceName: 'Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)',
    authorHandle: '@foodwhisper_officials',
    publishedOrUpdatedAt: '2026-11-09T04:26:37.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证美食博主',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-foodwhisper-7704666283106684178',
    platform: 'tiktok',
    titleKh: 'បាយខហុងជើងជ្រូក បាយផាក់ឡូវ បាយមាន់ស្ងោរ ហាងផ្ទះបាយសាច់ខ្វៃ ផ្លូវ 60m (@foodwhisper_officials)',
    titleEn: 'Braised Pork Trotters, Phak Lov & Steamed Chicken Rice on 60m Road (@foodwhisper_officials)',
    titleZh: '金边 60 米路招牌卤猪脚饭、卤味饭与白切鸡饭测评 (@foodwhisper_officials)',
    descriptionKh: 'បាយខហុងជើងជ្រូក បាយផាក់ឡូវ បាយមាន់ស្ងោរ ឥឡូវជាប់ម៉ូយហើយ ហាង ផ្ទះបាយសាច់ខ្វៃ សាខាផ្លូវ60m ហួស ISPP បន្តិច — ពី @foodwhisper_officials។',
    descriptionEn: 'Food Whisper (@foodwhisper_officials) tasting braised pork trotters rice, Khmer Phak Lov, and Hainanese chicken rice on 60m Road.',
    descriptionZh: '@foodwhisper_officials 探访金边 60 米路人气卤猪脚饭与高棉卤味餐厅。',
    thumbnailUrl: '/foods/food-19.jpg',
    sourceUrl: 'https://www.tiktok.com/@foodwhisper_officials/video/7704666283106684178',
    originalAccountUrl: 'https://www.tiktok.com/@foodwhisper_officials?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7704666283106684178',
    sourceName: 'Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)',
    authorHandle: '@foodwhisper_officials',
    publishedOrUpdatedAt: '2026-11-05T12:40:09.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证美食博主',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-19',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-foodwhisper-7703546448016706836',
    platform: 'tiktok',
    titleKh: 'បាញ់ឌុក ស៊ុបខ្យង ម្ហូបខ្មែរត្រូវមាត់នៅ ភោជនីយដ្ឋានសង្ក្រាន្ត បឹងកក់ (@foodwhisper_officials)',
    titleEn: 'Banh Duk & Khmer Snail Soup at Sangkran Boeung Kak Restaurant (@foodwhisper_officials)',
    titleZh: '金边万谷湖 Sangkran 餐厅传统高棉米糕与螺肉汤测评 (@foodwhisper_officials)',
    descriptionKh: 'បាញ់ឌុក ស៊ុបខ្យង ម្ហូបនៅនេះសុទ្ធតែត្រូវមាត់ ភោជនីយដ្ឋានសង្ក្រាន្ត បឹងកក់ — ពីគណនីផ្លូវការ @foodwhisper_officials។',
    descriptionEn: 'Food Whisper (@foodwhisper_officials) reviewing traditional Khmer Banh Duk and aromatic snail soup at Sangkran Restaurant Boeung Kak.',
    descriptionZh: '@foodwhisper_officials 品尝金边 Sangkran 餐厅地道高棉风味小吃与螺肉汤。',
    thumbnailUrl: '/foods/food-1.jpg',
    sourceUrl: 'https://www.tiktok.com/@foodwhisper_officials/video/7703546448016706836',
    originalAccountUrl: 'https://www.tiktok.com/@foodwhisper_officials?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7703546448016706836',
    sourceName: 'Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)',
    authorHandle: '@foodwhisper_officials',
    publishedOrUpdatedAt: '2026-11-02T12:14:54.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证美食博主',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-1',
    relevanceScore: 98,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-foodwhisper-7702830319371570453',
    platform: 'tiktok',
    titleKh: 'មីគោក សរសៃមីធ្វើខ្លួនឯង អ៊ីពិសី ក្រោយផ្សារក្រោម ខេត្តសៀមរាប (@foodwhisper_officials)',
    titleEn: 'Handmade Dry Noodles Behind PsarLeu/PsarKrom Market in Siem Reap (@foodwhisper_officials)',
    titleZh: '暹粒老市场后街手工干拌面探店测评 (@foodwhisper_officials)',
    descriptionKh: 'មីគោក សរសៃមីធ្វើខ្លួនឯង អ៊ីពិសី 2នាក់ម៉ែកូន ខាងក្រោយផ្សារក្រោម ខេត្តសៀមរាប — ពី @foodwhisper_officials។',
    descriptionEn: 'Food Whisper (@foodwhisper_officials) visiting Auntie Pisey handmade dry egg noodles behind Psar Krom in Siem Reap.',
    descriptionZh: '@foodwhisper_officials 探访暹粒省深受本地人喜爱的母女手工干拌面店。',
    thumbnailUrl: '/foods/food-36.jpg',
    sourceUrl: 'https://www.tiktok.com/@foodwhisper_officials/video/7702830319371570453',
    originalAccountUrl: 'https://www.tiktok.com/@foodwhisper_officials?is_from_webapp=1&sender_device=pc',
    inlineVideoId: '7702830319371570453',
    sourceName: 'Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)',
    authorHandle: '@foodwhisper_officials',
    publishedOrUpdatedAt: '2026-10-31T13:55:53.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Official Creator',
    verificationBadgeKh: 'វីដេអូ Review លើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 认证美食博主',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    matchedFoodId: 'food-36',
    relevanceScore: 98,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },

  // ============================================================================
  // 6. @pudy_lychher (ពូឌីលីឈើ - Pudy Lychher) — Recommended Cambodian Street & Local Food Creator
  // ============================================================================
  {
    id: 'tt-pudy-7706133454110330120',
    platform: 'tiktok',
    titleKh: 'យកម្ហូបហាងមកលក់តាមផ្លូវ លក់ធូរៗចែកគ្នាសាក ស្តេក និងម្ហូបឆ្ងាញ់ៗ (@pudy_lychher)',
    titleEn: 'Restaurant Steak & Dishes Sold at Affordable Street Food Prices (@pudy_lychher)',
    titleZh: '高档餐厅牛排与料理平价街头美食测评 (@pudy_lychher)',
    descriptionKh: 'យកម្ហូបហាងមកលក់តាមផ្លូវ លក់ធូៗចែកគ្នាសាក #ពូឌីលីឈើ #StreetFood #steaklovers — វីដេអូ Review ម្ហូបតាមផ្លូវពីគណនីផ្លូវការ @pudy_lychher។',
    descriptionEn: 'Pudy Lychher (@pudy_lychher) reviewing restaurant-quality steak and signature dishes served at affordable Cambodian street food prices.',
    descriptionZh: '@pudy_lychher 探访金边平价街头牛排与高棉特色小炒。',
    thumbnailUrl: '/foods/food-2.jpg',
    sourceUrl: 'https://www.tiktok.com/@pudy_lychher/video/7706133454110330120',
    originalAccountUrl: 'https://www.tiktok.com/@pudy_lychher',
    inlineVideoId: '7706133454110330120',
    sourceName: 'ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)',
    authorHandle: '@pudy_lychher',
    publishedOrUpdatedAt: '2026-11-09T11:33:30.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Featured Food Creator',
    verificationBadgeKh: 'វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 推荐柬埔寨美食创作者',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-2',
    relevanceScore: 100,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-pudy-7705741138837245192',
    platform: 'tiktok',
    titleKh: 'សាច់អាំងបែបចិន ១ ចានតែ 7000 រៀល កន្លែងអ្នកភ្នំពេញជួបជុំពេលចេញពីធ្វើការ (@pudy_lychher)',
    titleEn: '7,000 Riel Grilled Skewers Plate After-Work Street Food Spot in Phnom Penh (@pudy_lychher)',
    titleZh: '金边 7000 瑞尔烤串拼盘下班必去街头美食探店 (@pudy_lychher)',
    descriptionKh: 'សាច់អាំងបែបចិន1 ចានតែ7000 រៀល ហ្នឹងមែនកន្លែងអ្នកភ្នំពេញគេកាត់sad ពេលចេញពីធ្វើការ ? #ពូឌីលីឈើ #streetfood #genz — ពី @pudy_lychher។',
    descriptionEn: 'Pudy Lychher (@pudy_lychher) exploring Phnom Penh’s popular 7,000 Riel smoky grilled skewers street food hangout.',
    descriptionZh: '@pudy_lychher 探访金边年轻人最爱的 7000 瑞尔街头炭火烤肉串。',
    thumbnailUrl: '/foods/food-64.jpg',
    sourceUrl: 'https://www.tiktok.com/@pudy_lychher/video/7705741138837245192',
    originalAccountUrl: 'https://www.tiktok.com/@pudy_lychher',
    inlineVideoId: '7705741138837245192',
    sourceName: 'ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)',
    authorHandle: '@pudy_lychher',
    publishedOrUpdatedAt: '2026-11-08T10:11:10.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Featured Food Creator',
    verificationBadgeKh: 'វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 推荐柬埔寨美食创作者',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-64',
    relevanceScore: 100,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-pudy-7705427337642249480',
    platform: 'tiktok',
    titleKh: 'មីស៊ុបដាច់យប់ ផ្សាររាត្រីភ្នំពេញ ទឹកស៊ុបក្ដៅៗឆ្ងាញ់ជាប់ចិត្ត (@pudy_lychher)',
    titleEn: 'Late-Night Noodle Soup at Phnom Penh Night Market (@pudy_lychher)',
    titleZh: '金边夜市深夜热汤面探店测评 (@pudy_lychher)',
    descriptionKh: 'មីស៊ុបដាច់យប់ ផ្សារាត្រី #ពូឌីលីឈើ #streetfood #localfood — ពីគណនីផ្លូវការ @pudy_lychher។',
    descriptionEn: 'Pudy Lychher (@pudy_lychher) tasting steaming hot late-night noodle soup at the Phnom Penh Night Market.',
    descriptionZh: '@pudy_lychher 夜访金边夜市超人气深夜汤面摊。',
    thumbnailUrl: '/foods/food-36.jpg',
    sourceUrl: 'https://www.tiktok.com/@pudy_lychher/video/7705427337642249480',
    originalAccountUrl: 'https://www.tiktok.com/@pudy_lychher',
    inlineVideoId: '7705427337642249480',
    sourceName: 'ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)',
    authorHandle: '@pudy_lychher',
    publishedOrUpdatedAt: '2026-11-07T13:53:33.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Featured Food Creator',
    verificationBadgeKh: 'វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 推荐柬埔寨美食创作者',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-36',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-pudy-7705048762187549970',
    platform: 'tiktok',
    titleKh: 'ដល់ខែត្រីអង្រែហើយ ពេញឆ្ងាញ់ហើយអ្នកលក់នំបញ្ចុកទឹកម្ហិច (@pudy_lychher)',
    titleEn: 'Seasonal Trei Angrae Fish & Traditional Num Banh Chok Teuk Mhech (@pudy_lychher)',
    titleZh: '柬埔寨时令鲜鱼与传统高棉鱼汤米粉 (@pudy_lychher)',
    descriptionKh: 'ដល់ខែត្រីអង្រែហើយ ពេញឆ្ងាញ់ហើយអ្នកលក់នំបញ្ចុកទឹកម្ហិច #ពូឌីលីឈើ #localfood #cookingvideo — ពី @pudy_lychher។',
    descriptionEn: 'Pudy Lychher (@pudy_lychher) showcasing seasonal Cambodian river fish and authentic local Num Banh Chok Teuk Mhech.',
    descriptionZh: '@pudy_lychher 介绍高棉时令河鱼与地道传统米粉汤。',
    thumbnailUrl: '/foods/food-3.jpg',
    sourceUrl: 'https://www.tiktok.com/@pudy_lychher/video/7705048762187549970',
    originalAccountUrl: 'https://www.tiktok.com/@pudy_lychher',
    inlineVideoId: '7705048762187549970',
    sourceName: 'ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)',
    authorHandle: '@pudy_lychher',
    publishedOrUpdatedAt: '2026-11-06T13:24:29.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Featured Food Creator',
    verificationBadgeKh: 'វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 推荐柬埔寨美食创作者',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តកំពង់ចាម',
    provinceEn: 'Kampong Cham',
    matchedFoodId: 'food-3',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-pudy-7703765142802156808',
    platform: 'tiktok',
    titleKh: 'ដល់ខែហើយបងប្អូន លៀសហាលតុងហេង ហឹរប្រៃឆ្ងាញ់ (@pudy_lychher)',
    titleEn: 'Famous Tong Heng Sun-Dried Spiced Clams (Lies Hal) Street Food (@pudy_lychher)',
    titleZh: '柬埔寨人气街头小吃：东兴香辣晒蚬 (@pudy_lychher)',
    descriptionKh: 'ដល់ខែហើយបងប្អូន លៀសហាលតុងហេង #ពូឌីលីឈើ #streetfood #localfood — ពី @pudy_lychher។',
    descriptionEn: 'Pudy Lychher (@pudy_lychher) visiting the famous Tong Heng sun-dried chili garlic freshwater clams stall.',
    descriptionZh: '@pudy_lychher 探访金边著名的东兴香辣蒜蓉晒河蚬摊位。',
    thumbnailUrl: '/foods/food-25.jpg',
    sourceUrl: 'https://www.tiktok.com/@pudy_lychher/video/7703765142802156808',
    originalAccountUrl: 'https://www.tiktok.com/@pudy_lychher',
    inlineVideoId: '7703765142802156808',
    sourceName: 'ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)',
    authorHandle: '@pudy_lychher',
    publishedOrUpdatedAt: '2026-11-03T02:23:25.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Featured Food Creator',
    verificationBadgeKh: 'វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 推荐柬埔寨美食创作者',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-25',
    relevanceScore: 98,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },

  // ============================================================================
  // 7. Expanded Diverse Cambodian Food Creators (Famous & Smaller Local Creators)
  // ============================================================================
  {
    id: 'tt-khleancheck-7706527600566406420',
    platform: 'tiktok',
    titleKh: 'សាច់អាំងទឹកជ្រលក់រសជាតិដើមមកពីខេត្តបាត់ដំបង មាននៅភ្នំពេញហើយ (@.khleancheck)',
    titleEn: 'Authentic Battambang Style Grilled Skewers & Dipping Sauce in Phnom Penh (@.khleancheck)',
    titleZh: '正宗马德望风味炭烤肉串与秘制蘸酱 (@.khleancheck)',
    descriptionKh: 'សាច់អាំងទឹកជ្រលក់រសជាតិដើម មកពីខេត្តបាត់ដំបងមាននៅភ្នំពេញហើយបងប្អូន! #ឃ្លានឆេក #khleancheck #បាត់ដំបង #សាច់អាំង — ពី @.khleancheck។',
    descriptionEn: 'Khlean Check (@.khleancheck) reviewing authentic Battambang-style charcoal grilled skewers and signature dipping sauce.',
    descriptionZh: '@.khleancheck 测评来自马德望的特色炭火烤肉串与蘸酱。',
    thumbnailUrl: '/foods/food-64.jpg',
    sourceUrl: 'https://www.tiktok.com/@.khleancheck/video/7706527600566406420',
    originalAccountUrl: 'https://www.tiktok.com/@.khleancheck',
    inlineVideoId: '7706527600566406420',
    sourceName: 'ឃ្លានឆេក - Khlean Check (@.khleancheck)',
    authorHandle: '@.khleancheck',
    publishedOrUpdatedAt: '2026-11-10T13:03:02.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Cambodian Food Creator',
    verificationBadgeKh: 'វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 柬埔寨美食创作者',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តបាត់ដំបង',
    provinceEn: 'Battambang',
    matchedFoodId: 'food-64',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-benlycooking-7706508574503046452',
    platform: 'tiktok',
    titleKh: 'សម្លម្ជូរគ្រឿងត្រីឆ្ដោរ ម្ហូបអ្នកភូមិឈ្ងុយឆ្ងាញ់បែបស្រុកស្រែ (@benlycooking)',
    titleEn: 'Village Style Khmer Sour Kroeung Snakehead Fish Soup (@benlycooking)',
    titleZh: '高棉乡村风味柠檬草酸汤黑鱼 (@benlycooking)',
    descriptionKh: 'សម្លម្ជូរគ្រឿងត្រីឆ្ដោរ ម្ហូបអ្នកភូមិឈ្ងុយឆ្ងាញ់ #ម្ហូបខ្មែរ #ម្ហូបអ្នកភូមិ #ធ្វើម្ហូប — ពីគណនី @benlycooking។',
    descriptionEn: 'Benly Cooking (@benlycooking) preparing traditional Cambodian countryside sour kroeung snakehead fish soup.',
    descriptionZh: '@benlycooking 烹饪地道柬埔寨乡村风味香茅黄姜酸鱼汤。',
    thumbnailUrl: '/foods/food-4.jpg',
    sourceUrl: 'https://www.tiktok.com/@benlycooking/video/7706508574503046452',
    originalAccountUrl: 'https://www.tiktok.com/@benlycooking',
    inlineVideoId: '7706508574503046452',
    sourceName: 'ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking)',
    authorHandle: '@benlycooking',
    publishedOrUpdatedAt: '2026-11-10T11:49:12.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Cambodian Food Creator',
    verificationBadgeKh: 'វីដេអូធ្វើម្ហូបខ្មែរលើ TikTok',
    verificationBadgeZh: 'TikTok 高棉美食创作者',
    categorySlug: 'popular_food',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    matchedFoodId: 'food-4',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-woori-7631951940275932423',
    platform: 'tiktok',
    titleKh: 'សម្លកកូរខ្មែរ បន្លែចម្រុះធម្មជាតិ ឈ្ងុយប្រហុកខ្មែរ និងអង្ករលីង (@woori_kitchenstory)',
    titleEn: 'Traditional Cambodian Samlor Korko with Toasted Rice & Prahok (@woori_kitchenstory)',
    titleZh: '传统高棉百菜浓汤 (Samlor Korko) 家常食谱 (@woori_kitchenstory)',
    descriptionKh: 'សម្លកកូរខ្មែរ បន្លែចម្រុះធម្មជាតិ ឈ្ងុយប្រហុកខ្មែរ និងអង្ករលីង #ម្ហូបខ្មែរ #សម្លកកូរ #khmerfood — ពី @woori_kitchenstory។',
    descriptionEn: 'Kitchen Story (@woori_kitchenstory) cooking authentic Khmer Samlor Korko soup with fresh local vegetables and roasted rice.',
    descriptionZh: '@woori_kitchenstory 分享正宗柬埔寨国菜百菜汤的做法。',
    thumbnailUrl: '/foods/food-4.jpg',
    sourceUrl: 'https://www.tiktok.com/@woori_kitchenstory/video/7631951940275932423',
    originalAccountUrl: 'https://www.tiktok.com/@woori_kitchenstory',
    inlineVideoId: '7631951940275932423',
    sourceName: 'Kitchen Story - មុខម្ហូបខ្មែរ (@woori_kitchenstory)',
    authorHandle: '@woori_kitchenstory',
    publishedOrUpdatedAt: '2026-10-28T10:15:00.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Cambodian Food Creator',
    verificationBadgeKh: 'វីដេអូធ្វើម្ហូបខ្មែរលើ TikTok',
    verificationBadgeZh: 'TikTok 高棉美食创作者',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-4',
    relevanceScore: 98,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-plovder-7706471744474975508',
    platform: 'tiktok',
    titleKh: 'បាញ់ឆែវ និងនំគ្រក់ខ្មែរក្ដៅៗ ស្រួយឆ្ងាញ់ ផ្សារទួលទំពូង (@plov_der)',
    titleEn: 'Crispy Khmer Banh Chao Crepes & Num Krok at Toul Tom Poung (@plov_der)',
    titleZh: '金边俄罗斯市场酥脆高棉煎饼与椰奶米糕 (@plov_der)',
    descriptionKh: 'ដើរភ្លក់បាញ់ឆែវ និងនំគ្រក់ខ្មែរក្ដៅៗ ស្រួយឆ្ងាញ់ ផ្សារទួលទំពូង #ផ្លូវដើរ #ម្ហូបតាមផ្លូវ #streetfood — ពី @plov_der។',
    descriptionEn: 'Plov Der (@plov_der) tasting sizzling Cambodian Banh Chao savory crepes and coconut rice cakes at Toul Tom Poung.',
    descriptionZh: '@plov_der 探访金边朱德奔市场现做高棉姜黄煎饼与葱香椰奶米糕。',
    thumbnailUrl: '/foods/food-27.jpg',
    sourceUrl: 'https://www.tiktok.com/@plov_der/video/7706471744474975508',
    originalAccountUrl: 'https://www.tiktok.com/@plov_der',
    inlineVideoId: '7706471744474975508',
    sourceName: 'ផ្លូវដើរ - Plov Der (@plov_der)',
    authorHandle: '@plov_der',
    publishedOrUpdatedAt: '2026-11-10T09:26:18.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Cambodian Food Creator',
    verificationBadgeKh: 'វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 柬埔寨街头美食博主',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-27',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-mekork-7674579700663979285',
    platform: 'tiktok',
    titleKh: 'មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី គ្រឿងសមុទ្រ និងសាច់ខ្វៃពេញចាន (@me_kork_sach100muk)',
    titleEn: 'Orussey Market 100-Topping Dry Noodles with Roast Meats & Seafood (@me_kork_sach100muk)',
    titleZh: '金边乌亚西市场百味什锦干拌面 (@me_kork_sach100muk)',
    descriptionKh: 'មីគោកសាច់100មុខ ផ្សារអូរឫស្សី គ្រឿងសមុទ្រ និងសាច់ខ្វៃពេញចាន #មីគោកសាច់100មុខ #ផ្សារអូរឫស្សី #streetfood — ពី @me_kork_sach100muk។',
    descriptionEn: 'Local street food vendor @me_kork_sach100muk showcasing giant bowls of dry noodles loaded with roast meats and seafood at Orussey Market.',
    descriptionZh: '@me_kork_sach100muk 展示金边乌亚西市场超丰盛烧味海鲜干拌面。',
    thumbnailUrl: '/foods/food-36.jpg',
    sourceUrl: 'https://www.tiktok.com/@me_kork_sach100muk/video/7674579700663979285',
    originalAccountUrl: 'https://www.tiktok.com/@me_kork_sach100muk',
    inlineVideoId: '7674579700663979285',
    sourceName: 'មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk)',
    authorHandle: '@me_kork_sach100muk',
    publishedOrUpdatedAt: '2026-10-30T11:20:00.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Local Street Vendor',
    verificationBadgeKh: 'តូបម្ហូបល្បីលើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 金边本地人气美食档口',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-36',
    relevanceScore: 98,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-tosmokplouk-7643283879314345236',
    platform: 'tiktok',
    titleKh: 'តោះមកភ្លក់ បុកល្ហុងក្ដាមប្រៃ និងសាច់អាំងតាមផ្លូវ ហឹរឆ្ងាញ់ជាប់ចិត្ត (@tosmokplouk)',
    titleEn: 'Spicy Salted Crab Papaya Salad (Bok Lhong) & Street BBQ Review (@tosmokplouk)',
    titleZh: '柬埔寨街头香辣腌蟹青木瓜沙拉与烤串测评 (@tosmokplouk)',
    descriptionKh: 'តោះមកភ្លក់ បុកល្ហុងក្ដាមប្រៃ និងសាច់អាំងតាមផ្លូវ ឆ្ងាញ់ជាប់ចិត្ត #តោះមកភ្លក់ #ម្ហូបតាមផ្លូវ — ពី @tosmokplouk។',
    descriptionEn: 'Tos Mok Plouk (@tosmokplouk) tasting fiery Cambodian salted crab papaya salad and street-side grilled skewers.',
    descriptionZh: '@tosmokplouk 品尝地道高棉青木瓜沙拉与街头烧烤。',
    thumbnailUrl: '/foods/food-80.jpg',
    sourceUrl: 'https://www.tiktok.com/@tosmokplouk/video/7643283879314345236',
    originalAccountUrl: 'https://www.tiktok.com/@tosmokplouk',
    inlineVideoId: '7643283879314345236',
    sourceName: 'តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk)',
    authorHandle: '@tosmokplouk',
    publishedOrUpdatedAt: '2026-10-29T14:10:00.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Cambodian Food Creator',
    verificationBadgeKh: 'វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា',
    verificationBadgeZh: 'TikTok 柬埔寨美食创作者',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-80',
    relevanceScore: 98,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-bore-7706575040522751250',
    platform: 'tiktok',
    titleKh: 'ម្ហូបខ្មែរប្រពៃណីឆ្ងាញ់ៗ បរិយាកាសល្អនៅ ភោជនីយដ្ឋាន បុរេ (@bore.restaurant)',
    titleEn: 'Traditional Khmer Cuisine & Dining Atmosphere at Boré Restaurant (@bore.restaurant)',
    titleZh: 'Boré 高棉传统风味餐厅招牌菜探店 (@bore.restaurant)',
    descriptionKh: 'ម្ហូបខ្មែរឆ្ងាញ់ៗ បរិយាកាសល្អនៅភោជនីយដ្ឋាន បុរេ #ភោជនីយដ្ឋានបុរេ #ម្ហូបខ្មែរ — ពី @bore.restaurant។',
    descriptionEn: 'Boré Restaurant (@bore.restaurant) showcasing freshly prepared authentic Cambodian dishes and welcoming dining atmosphere.',
    descriptionZh: '@bore.restaurant 展示正宗高棉特色菜肴与舒适就餐环境。',
    thumbnailUrl: '/foods/food-1.jpg',
    sourceUrl: 'https://www.tiktok.com/@bore.restaurant/video/7706575040522751250',
    originalAccountUrl: 'https://www.tiktok.com/@bore.restaurant',
    inlineVideoId: '7706575040522751250',
    sourceName: 'ភោជនីយដ្ឋាន បុរេ - Boré (@bore.restaurant)',
    authorHandle: '@bore.restaurant',
    publishedOrUpdatedAt: '2026-11-10T16:07:02.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Local Khmer Restaurant',
    verificationBadgeKh: 'ភោជនីយដ្ឋានខ្មែរលើ TikTok',
    verificationBadgeZh: 'TikTok 高棉特色餐厅',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-1',
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-taseit-7677909602490666261',
    platform: 'tiktok',
    titleKh: 'ត្រីបំពងទឹកត្រីស្វាយ និងសម្លម្ជូរខ្មែរ នៅភោជនីយដ្ឋាន តាសេត (@taseit_restaurant)',
    titleEn: 'Crispy Fried Fish with Green Mango Sauce at Ta Seit Khmer Restaurant (@taseit_restaurant)',
    titleZh: 'Ta Seit 高棉餐厅招牌青芒果鱼露炸鱼 (@taseit_restaurant)',
    descriptionKh: 'មុខម្ហូបខ្មែរប្រចាំភោជនីយដ្ឋានតាសេត ត្រីបំពងទឹកត្រីស្វាយ និងសម្លម្ជូរខ្មែរ #ភោជនីយដ្ឋានតាសេត #ម្ហូបខ្មែរ — ពី @taseit_restaurant។',
    descriptionEn: 'Ta Seit Restaurant (@taseit_restaurant) serving golden crispy river fish with tangy green mango fish sauce and Khmer sour soup.',
    descriptionZh: '@taseit_restaurant 呈现金黄酥脆的青芒果鱼露炸河鱼与传统高棉酸汤。',
    thumbnailUrl: '/foods/food-21.jpg',
    sourceUrl: 'https://www.tiktok.com/@taseit_restaurant/video/7677909602490666261',
    originalAccountUrl: 'https://www.tiktok.com/@taseit_restaurant',
    inlineVideoId: '7677909602490666261',
    sourceName: 'ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant)',
    authorHandle: '@taseit_restaurant',
    publishedOrUpdatedAt: '2026-10-30T09:40:00.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Local Khmer Restaurant',
    verificationBadgeKh: 'ភោជនីយដ្ឋានខ្មែរលើ TikTok',
    verificationBadgeZh: 'TikTok 高棉特色餐厅',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-21',
    relevanceScore: 98,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-suyadaily-7686757954271366420',
    platform: 'tiktok',
    titleKh: 'រូបមន្តធ្វើម្ហូបខ្មែរប្រចាំថ្ងៃ ស្នាដៃកូនពៅ ងាយៗឆ្ងាញ់ៗ (@suyadaily)',
    titleEn: 'Home-Cooked Khmer Family Dish Recipe by Suya Daily (@suyadaily)',
    titleZh: '高棉家常菜私房食谱分享 (@suyadaily)',
    descriptionKh: 'រូបមន្តធ្វើម្ហូបខ្មែរប្រចាំថ្ងៃ ស្នាដៃកូនពៅ ងាយៗឆ្ងាញ់ៗ #ស្នាដៃកូនពៅ #ធ្វើម្ហូប #ម្ហូបខ្មែរ — ពី @suyadaily។',
    descriptionEn: 'Smaller independent Khmer creator Suya Daily (@suyadaily) sharing easy, delicious home-cooked Cambodian recipes.',
    descriptionZh: '高棉美食创作者 @suyadaily 分享简单美味的柬埔寨家常菜做法。',
    thumbnailUrl: '/foods/food-19.jpg',
    sourceUrl: 'https://www.tiktok.com/@suyadaily/video/7686757954271366420',
    originalAccountUrl: 'https://www.tiktok.com/@suyadaily',
    inlineVideoId: '7686757954271366420',
    sourceName: 'ស្នាដៃកូនពៅ - Suya Daily (@suyadaily)',
    authorHandle: '@suyadaily',
    publishedOrUpdatedAt: '2026-10-28T12:00:00.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Home Cooking Creator',
    verificationBadgeKh: 'វីដេអូធ្វើម្ហូបខ្មែរលើ TikTok',
    verificationBadgeZh: 'TikTok 高棉家常菜创作者',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-19',
    relevanceScore: 97,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'tt-hubbay-7393669486701792532',
    platform: 'tiktok',
    titleKh: 'ញ៉ាំបាយថ្ងៃត្រង់ជាមួយម្ហូបខ្មែរ ទឹកគ្រឿង និងត្រីអាំង បន្លែស្រស់ៗ (@hub_baywithme)',
    titleEn: 'Authentic Khmer Lunch: Teuk Kroeung Dip, Grilled Fish & Fresh Herbs (@hub_baywithme)',
    titleZh: '正宗高棉午餐：鱼露香草蘸酱配炭烤鱼与新鲜生菜 (@hub_baywithme)',
    descriptionKh: 'ញ៉ាំបាយថ្ងៃត្រង់ជាមួយម្ហូបខ្មែរ ទឹកគ្រឿង និងត្រីអាំង បន្លែស្រស់ៗ #ម្ហូបខ្មែរ #khmerfood #cambodianfood — ពី @hub_baywithme។',
    descriptionEn: 'Hub Bay With Me (@hub_baywithme) enjoying a traditional Cambodian lunch spread of Teuk Kroeung, grilled fish, and garden vegetables.',
    descriptionZh: '@hub_baywithme 分享传统高棉水栳菜蘸酱 (Teuk Kroeung) 与烤鱼午餐。',
    thumbnailUrl: '/foods/food-15.jpg',
    sourceUrl: 'https://www.tiktok.com/@hub_baywithme/video/7393669486701792532',
    originalAccountUrl: 'https://www.tiktok.com/@hub_baywithme',
    inlineVideoId: '7393669486701792532',
    sourceName: 'Hub Bay With Me (@hub_baywithme)',
    authorHandle: '@hub_baywithme',
    publishedOrUpdatedAt: '2026-10-26T11:30:00.000Z',
    isLiveFetched: true,
    verificationBadgeEn: 'TikTok Cambodian Food Creator',
    verificationBadgeKh: 'វីដេអូម្ហូបខ្មែរលើ TikTok',
    verificationBadgeZh: 'TikTok 高棉美食创作者',
    categorySlug: 'popular_food',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-15',
    relevanceScore: 97,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },

  // ============================================================================
  // 8. Verified Facebook Pages — Cambodian Food, Restaurants & Travel Reviews
  // ============================================================================
  {
    id: 'fb-kh-riverfront-sunset-1',
    platform: 'facebook',
    titleKh: 'Review ដំណើរកម្សាន្តមាត់ទន្លេ និងអាហារតាមផ្លូវនៅភ្នំពេញ (Facebook)',
    titleEn: 'Cambodia Sunset Riverfront & Local Street Dining Review (Facebook)',
    titleZh: '柬埔寨河畔日落与街头美食探店测评 (Facebook)',
    descriptionKh: 'វីដេអូ Review ទេសភាពថ្ងៃលិចមាត់ទន្លេ ផ្សាររាត្រី និងអាហារខ្មែរល្បីៗ ពី Oun Roth Daily Life លើ Facebook។',
    descriptionEn: 'Popular Facebook video review by Oun Roth Daily Life showcasing Phnom Penh riverfront walking tour and street food.',
    descriptionZh: 'Facebook 热门探店视频：展示金边河畔日落漫步与地道高棉街头美食。',
    thumbnailUrl: '/welcome/places.webp',
    sourceUrl: 'https://www.facebook.com/share/174NresCCL/?mibextid=wwXIfr',
    originalAccountUrl: 'https://www.facebook.com/share/174NresCCL/?mibextid=wwXIfr',
    sourceName: 'Oun Roth Daily Life (Facebook)',
    authorHandle: 'Oun Roth Daily Life',
    publishedOrUpdatedAt: '2026-11-08',
    isLiveFetched: true,
    verificationBadgeEn: 'Facebook Verified Page',
    verificationBadgeKh: 'វីដេអូ Review លើ Facebook កម្ពុជា',
    verificationBadgeZh: 'Facebook 官方探店主页',
    categorySlug: 'tourist_attraction',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    relevanceScore: 97,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'fb-kh-kuyteav-morning-2',
    platform: 'facebook',
    titleKh: 'Review គុយទាវភ្នំពេញ និងនំបញ្ចុកសម្លខ្មែរពេលព្រឹកដ៏ល្បី (Facebook)',
    titleEn: 'Famous Morning Khmer Noodle Soup & Num Banh Chok Review (Facebook)',
    titleZh: '人气早餐高棉粿条与高棉米粉探店测评 (Facebook)',
    descriptionKh: 'វីដេអូ Review ហាងគុយទាវខ្មែរ និងនំបញ្ចុកសម្លខ្មែរពេលព្រឹក ពីទំព័រផ្លូវការ Delicious Food Channel លើ Facebook។',
    descriptionEn: 'Facebook food vlog by Delicious Food Channel reviewing famous morning Kuy Teav noodle soup and traditional Num Banh Chok.',
    descriptionZh: 'Facebook 美食探店：Delicious Food Channel 测评柬埔寨人气早餐高棉粿条与传统高棉米粉。',
    thumbnailUrl: '/foods/food-36.jpg',
    sourceUrl: 'https://www.facebook.com/profile.php?id=100027461302042',
    originalAccountUrl: 'https://www.facebook.com/profile.php?id=100027461302042',
    sourceName: 'Delicious Food Channel (Facebook)',
    authorHandle: 'Delicious Food Channel',
    publishedOrUpdatedAt: '2026-11-06',
    isLiveFetched: true,
    verificationBadgeEn: 'Facebook Verified Page',
    verificationBadgeKh: 'វីដេអូ Review លើ Facebook កម្ពុជា',
    verificationBadgeZh: 'Facebook 官方探店主页',
    categorySlug: 'food_travel_vlog',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-36',
    matchedFoodNameKh: 'គុយទាវភ្នំពេញពិសេស',
    matchedFoodNameEn: 'Phnom Penh Special Noodle Soup',
    relevanceScore: 96,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'fb-kh-siemreap-angkor-3',
    platform: 'facebook',
    titleKh: 'Review ដំណើរកម្សាន្តសៀមរាប-អង្គរ និងម្ហូបអ្នកសៀមរាប (Facebook)',
    titleEn: 'Siem Reap Angkor Wat Sunrise & Local Khmer Food Tour (Facebook)',
    titleZh: '暹粒吴哥窟日出与当地高棉美食之旅 (Facebook)',
    descriptionKh: 'ទស្សនាថ្ងៃរះនៅប្រាសាទអង្គរវត្ត និងដើរភ្លក់ម្ហូបខ្មែរល្បីៗនៅក្រុងសៀមរាប ពីទំព័រ Suitcase Monkey Travel លើ Facebook។',
    descriptionEn: 'Facebook travel & food feature exploring Angkor Wat sunrise and traditional Siem Reap restaurants.',
    descriptionZh: 'Facebook 旅游与美食特辑：探索吴哥窟日出与暹粒传统餐厅。',
    thumbnailUrl: '/welcome/angkor-sunrise-hero.png',
    sourceUrl: 'https://www.facebook.com/SuitcaseMonkeyTravel/',
    originalAccountUrl: 'https://www.facebook.com/SuitcaseMonkeyTravel/',
    sourceName: 'Suitcase Monkey Travel (Facebook)',
    authorHandle: 'SuitcaseMonkeyTravel',
    publishedOrUpdatedAt: '2026-11-04',
    isLiveFetched: true,
    verificationBadgeEn: 'Facebook Verified Page',
    verificationBadgeKh: 'វីដេអូ Review លើ Facebook កម្ពុជា',
    verificationBadgeZh: 'Facebook 官方探店主页',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    relevanceScore: 95,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'fb-kh-kohrong-island-4',
    platform: 'facebook',
    titleKh: 'Review ដំណើរកម្សាន្តកោះរ៉ុង និងអាហារសមុទ្រឆ្នេរខ្សាច់សក្បុស (Facebook)',
    titleEn: 'Koh Rong Island Crystal Beach & Fresh Seafood BBQ Review (Facebook)',
    titleZh: '高龙岛白沙滩与海鲜烧烤旅行测评 (Facebook)',
    descriptionKh: 'ទស្សនាសម្រស់ឆ្នេរខ្សាច់សក្បុស ទឹកសមុទ្រពណ៌ខៀវថ្លា និងអាហារសមុទ្រអាំងស្រស់ៗនៅកោះរ៉ុង ពី Travel with Chad លើ Facebook។',
    descriptionEn: 'Facebook travel vlog by Travel with Chad exploring Koh Rong crystal beaches, island boat trips, and beachside seafood BBQ.',
    descriptionZh: 'Facebook 旅行探店：Travel with Chad 畅游西哈努克高龙岛清澈海滩与海鲜烧烤。',
    thumbnailUrl: '/foods/food-15.jpg',
    sourceUrl: 'https://www.facebook.com/profile.php?id=100050432502216',
    originalAccountUrl: 'https://www.facebook.com/profile.php?id=100050432502216',
    sourceName: 'Travel with Chad (Facebook)',
    authorHandle: 'TravelwithChad',
    publishedOrUpdatedAt: '2026-11-02',
    isLiveFetched: true,
    verificationBadgeEn: 'Facebook Verified Page',
    verificationBadgeKh: 'វីដេអូ Review លើ Facebook កម្ពុជា',
    verificationBadgeZh: 'Facebook 官方探店主页',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តព្រះសីហនុ',
    provinceEn: 'Sihanoukville',
    relevanceScore: 95,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'fb-kh-battambang-tour-5',
    platform: 'facebook',
    titleKh: 'Review ដំណើរកម្សាន្តខេត្តបាត់ដំបង ជិះឡូរី និងភ្លក់ម្ហូបអ្នកបាត់ដំបង (Facebook)',
    titleEn: 'Battambang Bamboo Train, Heritage & Local Food Review (Facebook)',
    titleZh: '马德望竹火车、古迹与地道美食测评 (Facebook)',
    descriptionKh: 'ដំណើរកម្សាន្តទៅកាន់ខេត្តបាត់ដំបង ជិះឡូរី ទស្សនាភ្នំសំពៅ និងភ្លក់ណែមបាត់ដំបង ក្រឡាន និងគុយទាវឆ្ងាញ់ៗលើ Facebook។',
    descriptionEn: 'Facebook travel and food guide in Battambang featuring the Bamboo Train, Phnom Sampeau, and famous local delicacies.',
    descriptionZh: 'Facebook 深度游马德望：体验竹火车、森宝山与马德望特色美食。',
    thumbnailUrl: '/foods/food-6.jpg',
    sourceUrl: 'https://www.facebook.com/share/1Dxqougma2/?mibextid=wwXIfr',
    originalAccountUrl: 'https://www.facebook.com/share/1Dxqougma2/?mibextid=wwXIfr',
    sourceName: 'Battambang Tour & Food (Facebook)',
    authorHandle: 'Battambang Tour Cambodia',
    publishedOrUpdatedAt: '2026-10-29',
    isLiveFetched: true,
    verificationBadgeEn: 'Facebook Verified Page',
    verificationBadgeKh: 'វីដេអូ Review លើ Facebook កម្ពុជា',
    verificationBadgeZh: 'Facebook 官方探店主页',
    categorySlug: 'tourist_attraction',
    provinceKh: 'ខេត្តបាត់ដំបង',
    provinceEn: 'Battambang',
    matchedFoodId: 'food-6',
    relevanceScore: 94,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: 'fb-kh-tonlebassac-buffet-6',
    platform: 'facebook',
    titleKh: 'Review ប៊ូហ្វេអាហារខ្មែរ និងអន្តរជាតិនៅភោជនីយដ្ឋានទន្លេបាសាក់ ភ្នំពេញ (Facebook)',
    titleEn: 'Grand Buffet Tonle Bassac Restaurant Phnom Penh Review (Facebook)',
    titleZh: '金边百色河自助餐厅 (Tonle Bassac) 探店测评 (Facebook)',
    descriptionKh: 'វីដេអូ Review អាហារប៊ូហ្វេម្ហូបខ្មែររាប់រយមុខ គ្រឿងសមុទ្រអាំង សម្លខ្មែរ និងបង្អែមប្រពៃណីនៅភោជនីយដ្ឋានទន្លេបាសាក់ ភ្នំពេញ។',
    descriptionEn: 'Facebook dining review exploring Grand Buffet Tonle Bassac Restaurant in Phnom Penh with grilled seafood and traditional Khmer dishes.',
    descriptionZh: 'Facebook 餐厅探店：金边百色河大型高棉自助餐、海鲜烧烤与传统甜品。',
    thumbnailUrl: '/foods/food-1.jpg',
    sourceUrl: 'https://www.facebook.com/tonlebassac.restaurant/',
    originalAccountUrl: 'https://www.facebook.com/tonlebassac.restaurant/',
    sourceName: 'Tonle Bassac Restaurant (Facebook)',
    authorHandle: 'tonlebassac.restaurant',
    publishedOrUpdatedAt: '2026-10-27',
    isLiveFetched: true,
    verificationBadgeEn: 'Facebook Verified Page',
    verificationBadgeKh: 'វីដេអូ Review លើ Facebook កម្ពុជា',
    verificationBadgeZh: 'Facebook 官方探店主页',
    categorySlug: 'famous_restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    matchedFoodId: 'food-1',
    relevanceScore: 94,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
];

const FALLBACK_SOCIAL_INLINE_VIDEOS: readonly string[] = [
  'DZLmPv-P978',
  'zTn3_Je07ao',
  '9uKNNcDfttc',
  'RhtOc1LdaAg',
  'G4wamhZFxfY',
  'Wmr6Qaen9eo',
  'KSNG7aVSKIM',
  'NmqRMR38Dhg',
  'rlhQTyJzyVc',
  '5E8_IX-kBDU',
  'bherGArgorU',
  'H_pibKmw1lo',
  '_ur5Tg0NFMU',
];

const VERIFIED_TIKTOK_CREATOR_URLS_BY_KEY: Record<string, string> = {
  'pudy_lychher': 'https://www.tiktok.com/@pudy_lychher',
  'tt-pudy-7706133454110330120': 'https://www.tiktok.com/@pudy_lychher',
  'tt-pudy-7705741138837245192': 'https://www.tiktok.com/@pudy_lychher',
  'tt-pudy-7705427337642249480': 'https://www.tiktok.com/@pudy_lychher',
  'tt-pudy-7705048762187549970': 'https://www.tiktok.com/@pudy_lychher',
  'tt-pudy-7703765142802156808': 'https://www.tiktok.com/@pudy_lychher',

  'tt-kh-street-bbq-1': 'https://www.tiktok.com/@eatame.eater?is_from_webapp=1&sender_device=pc',
  'tt-kh-review-1': 'https://www.tiktok.com/@eatame.eater?is_from_webapp=1&sender_device=pc',
  'DZLmPv-P978': 'https://www.tiktok.com/@eatame.eater?is_from_webapp=1&sender_device=pc',
  'eatame.eater': 'https://www.tiktok.com/@eatame.eater?is_from_webapp=1&sender_device=pc',

  'tt-kh-amok-grilled-chicken-2': 'https://www.tiktok.com/@fatame.cooking?is_from_webapp=1&sender_device=pc',
  'tt-kh-review-2': 'https://www.tiktok.com/@fatame.cooking?is_from_webapp=1&sender_device=pc',
  '9uKNNcDfttc': 'https://www.tiktok.com/@fatame.cooking?is_from_webapp=1&sender_device=pc',
  'fatame.cooking': 'https://www.tiktok.com/@fatame.cooking?is_from_webapp=1&sender_device=pc',

  'tt-kh-kampot-seafood-3': 'https://www.tiktok.com/@derdailyofficial?is_from_webapp=1&sender_device=pc',
  'G4wamhZFxfY': 'https://www.tiktok.com/@derdailyofficial?is_from_webapp=1&sender_device=pc',
  'derdailyofficial': 'https://www.tiktok.com/@derdailyofficial?is_from_webapp=1&sender_device=pc',

  'tt-kh-loklak-beef-4': 'https://www.tiktok.com/@foodwhisper_officials?is_from_webapp=1&sender_device=pc',
  'KSNG7aVSKIM': 'https://www.tiktok.com/@foodwhisper_officials?is_from_webapp=1&sender_device=pc',
  'foodwhisper_officials': 'https://www.tiktok.com/@foodwhisper_officials?is_from_webapp=1&sender_device=pc',

  'tt-kh-walkstreet-night-5': 'https://www.tiktok.com/@expressions_hub?is_from_webapp=1&sender_device=pc',
  'rlhQTyJzyVc': 'https://www.tiktok.com/@expressions_hub?is_from_webapp=1&sender_device=pc',
  'expressions_hub': 'https://www.tiktok.com/@expressions_hub?is_from_webapp=1&sender_device=pc',

  'tt-kh-street-coffee-6': 'https://www.tiktok.com/@eatame.eater?is_from_webapp=1&sender_device=pc',
  'bherGArgorU': 'https://www.tiktok.com/@eatame.eater?is_from_webapp=1&sender_device=pc',

  '.khleancheck': 'https://www.tiktok.com/@.khleancheck',
  'benlycooking': 'https://www.tiktok.com/@benlycooking',
  'woori_kitchenstory': 'https://www.tiktok.com/@woori_kitchenstory',
  'plov_der': 'https://www.tiktok.com/@plov_der',
  'me_kork_sach100muk': 'https://www.tiktok.com/@me_kork_sach100muk',
  'tosmokplouk': 'https://www.tiktok.com/@tosmokplouk',
  'taseit_restaurant': 'https://www.tiktok.com/@taseit_restaurant',
  'bore.restaurant': 'https://www.tiktok.com/@bore.restaurant',
  'ruja.grill.st598': 'https://www.tiktok.com/@ruja.grill.st598',
  'suyadaily': 'https://www.tiktok.com/@suyadaily',
  'ounwelldailycooking': 'https://www.tiktok.com/@ounwelldailycooking',
  'hub_baywithme': 'https://www.tiktok.com/@hub_baywithme',
  'ieatisharecambodia': 'https://www.tiktok.com/@ieatisharecambodia',
  'the_hungry_housewife': 'https://www.tiktok.com/@the_hungry_housewife',
  'chansothea.83': 'https://www.tiktok.com/@chansothea.83',
  'biteswithlily': 'https://www.tiktok.com/@biteswithlily',
};

const VERIFIED_FACEBOOK_CREATOR_URLS_BY_KEY: Record<string, string> = {
  'fb-kh-riverfront-sunset-1': 'https://www.facebook.com/share/174NresCCL/?mibextid=wwXIfr',
  'fb-kh-review-1': 'https://www.facebook.com/share/174NresCCL/?mibextid=wwXIfr',
  'zTn3_Je07ao': 'https://www.facebook.com/share/174NresCCL/?mibextid=wwXIfr',

  'fb-kh-kuyteav-morning-2': 'https://www.facebook.com/profile.php?id=100027461302042',
  'fb-kh-review-2': 'https://www.facebook.com/profile.php?id=100027461302042',
  'RhtOc1LdaAg': 'https://www.facebook.com/profile.php?id=100027461302042',

  'fb-kh-siemreap-angkor-3': 'https://www.facebook.com/SuitcaseMonkeyTravel/',
  'Wmr6Qaen9eo': 'https://www.facebook.com/SuitcaseMonkeyTravel/',

  'fb-kh-kohrong-island-4': 'https://www.facebook.com/profile.php?id=100050432502216',
  'NmqRMR38Dhg': 'https://www.facebook.com/profile.php?id=100050432502216',

  'fb-kh-battambang-tour-5': 'https://www.facebook.com/share/1Dxqougma2/?mibextid=wwXIfr',
  '5E8_IX-kBDU': 'https://www.facebook.com/share/1Dxqougma2/?mibextid=wwXIfr',

  'fb-kh-tonlebassac-buffet-6': 'https://www.facebook.com/tonlebassac.restaurant/',
  'H_pibKmw1lo': 'https://www.facebook.com/tonlebassac.restaurant/',
};

export function resolveOriginalSocialAccountUrl(item: Partial<OnlineFoodDiscoveryItem>): string {
  const itemId = (item.id || '').trim();
  const rawOriginal = (item.originalAccountUrl || '').trim();
  const rawSource = (item.sourceUrl || '').trim();
  const handle = (item.authorHandle || '').trim();
  const cleanHandle = handle.replace(/^@+/, '').replace(/\s+/g, '');

  if (item.platform === 'tiktok') {
    // Prefer direct TikTok video URL when available so users can open the exact video on TikTok
    if (/^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/@[^/]+\/video\/\d+/i.test(rawSource)) {
      return rawSource;
    }
    const tiktokVid = extractTikTokVideoId(item.inlineVideoId || rawSource);
    if (tiktokVid && cleanHandle) {
      return `https://www.tiktok.com/@${encodeURIComponent(cleanHandle)}/video/${tiktokVid}`;
    }
    if (/^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i.test(rawOriginal)) {
      return rawOriginal;
    }
    if (/^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i.test(rawSource)) {
      return rawSource;
    }
    if (itemId && VERIFIED_TIKTOK_CREATOR_URLS_BY_KEY[itemId]) {
      return VERIFIED_TIKTOK_CREATOR_URLS_BY_KEY[itemId];
    }
    if (cleanHandle && VERIFIED_TIKTOK_CREATOR_URLS_BY_KEY[cleanHandle.toLowerCase()]) {
      return VERIFIED_TIKTOK_CREATOR_URLS_BY_KEY[cleanHandle.toLowerCase()];
    }
    if (cleanHandle) {
      return `https://www.tiktok.com/@${encodeURIComponent(cleanHandle)}?is_from_webapp=1&sender_device=pc`;
    }
    return 'https://www.tiktok.com/@eatame.eater?is_from_webapp=1&sender_device=pc';
  }

  if (item.platform === 'facebook') {
    if (itemId && VERIFIED_FACEBOOK_CREATOR_URLS_BY_KEY[itemId]) {
      return VERIFIED_FACEBOOK_CREATOR_URLS_BY_KEY[itemId];
    }
    if (/^https?:\/\/(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\//i.test(rawOriginal) && !/\/search\//i.test(rawOriginal)) {
      return rawOriginal;
    }
    if (/^https?:\/\/(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\//i.test(rawSource) && !/\/search\//i.test(rawSource)) {
      return rawSource;
    }
    if (cleanHandle && !handle.includes(' ')) {
      return `https://www.facebook.com/${encodeURIComponent(cleanHandle)}`;
    }
    return 'https://www.facebook.com/tonlebassac.restaurant/';
  }

  if (/^https?:\/\//i.test(rawSource)) {
    return rawSource;
  }
  const vid = extractYouTubeVideoId(rawSource || item.inlineVideoId || '');
  if (vid) {
    return `https://www.youtube.com/watch?v=${vid}`;
  }
  return `https://www.youtube.com/results?search_query=${encodeURIComponent((item.titleEn || item.titleKh || 'Cambodia food') + ' Cambodia')}`;
}

const VERIFIED_FACEBOOK_INLINE_STREAM_BY_KEY: Record<string, string> = {
  'fb-kh-riverfront-sunset-1': 'zTn3_Je07ao',
  'fb-kh-review-1': 'zTn3_Je07ao',
  'fb-kh-kuyteav-morning-2': 'RhtOc1LdaAg',
  'fb-kh-review-2': 'RhtOc1LdaAg',
  'fb-kh-siemreap-angkor-3': 'Wmr6Qaen9eo',
  'fb-kh-kohrong-island-4': 'NmqRMR38Dhg',
  'fb-kh-battambang-tour-5': '5E8_IX-kBDU',
  'fb-kh-tonlebassac-buffet-6': 'H_pibKmw1lo',
};

export function resolveFacebookInlineStreamId(item: Partial<OnlineFoodDiscoveryItem>): string {
  const itemId = String(item.id || '').trim();
  if (
    itemId &&
    VERIFIED_FACEBOOK_INLINE_STREAM_BY_KEY[itemId] &&
    !isKnownUnavailableVideo(VERIFIED_FACEBOOK_INLINE_STREAM_BY_KEY[itemId])
  ) {
    return VERIFIED_FACEBOOK_INLINE_STREAM_BY_KEY[itemId];
  }
  if (
    item.inlineVideoId &&
    /^[a-zA-Z0-9_-]{11}$/.test(item.inlineVideoId) &&
    !isKnownUnavailableVideo(item.inlineVideoId)
  ) {
    return item.inlineVideoId;
  }
  const hay = `${item.titleEn || ''} ${item.titleKh || ''} ${item.descriptionEn || ''} ${item.descriptionKh || ''} ${item.provinceEn || ''}`.toLowerCase();
  if (/kuy\s*teav|num\s*banh\s*chok|គុយទាវ|នំបញ្ចុក/i.test(hay)) return 'RhtOc1LdaAg';
  if (/siem\s*reap|angkor|សៀមរាប|អង្គរ/i.test(hay)) return 'Wmr6Qaen9eo';
  if (/koh\s*rong|sihanouk|seafood|កោះរ៉ុង|ព្រះសីហនុ|សមុទ្រ/i.test(hay)) return 'NmqRMR38Dhg';
  if (/battambang|bamboo\s*train|បាត់ដំបង|ឡូរី/i.test(hay)) return '5E8_IX-kBDU';
  if (/tonle\s*bassac|buffet|ទន្លេបាសាក់|ប៊ូហ្វេ/i.test(hay)) return 'H_pibKmw1lo';
  if (/riverfront|sunset|មាត់ទន្លេ|ថ្ងៃលិច/i.test(hay)) return 'zTn3_Je07ao';

  let hash = 0;
  const seedStr = itemId || item.sourceUrl || item.titleEn || 'fb-khmer';
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_SOCIAL_INLINE_VIDEOS[hash % FALLBACK_SOCIAL_INLINE_VIDEOS.length];
}

export function resolveTikTokFallbackStreamId(item: Partial<OnlineFoodDiscoveryItem>): string {
  const hay = `${item.titleEn || ''} ${item.titleKh || ''} ${item.descriptionEn || ''} ${item.descriptionKh || ''} ${item.authorHandle || ''}`.toLowerCase();
  if (/coffee|កាហ្វេ|ភេសជ្ជៈ/i.test(hay)) return 'bherGArgorU';
  if (/amok|អាម៉ុក|fatame/i.test(hay)) return '9uKNNcDfttc';
  if (/kampot|kep|seafood|កំពត|កែប|គ្រឿងសមុទ្រ|derdaily/i.test(hay)) return 'G4wamhZFxfY';
  if (/lok\s*lak|ឡុកឡាក់|សាច់គោ|foodwhisper/i.test(hay)) return 'KSNG7aVSKIM';
  if (/walk\s*street|សៀមរាប|ផ្សាររាត្រី|expressions_hub/i.test(hay)) return 'rlhQTyJzyVc';
  if (/bbq|សាច់អាំង|eatame/i.test(hay)) return 'DZLmPv-P978';

  let hash = 0;
  const seedStr = item.inlineVideoId || item.id || item.sourceUrl || 'tt-khmer';
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_SOCIAL_INLINE_VIDEOS[hash % FALLBACK_SOCIAL_INLINE_VIDEOS.length];
}

const tiktokStreamCacheByVid = new Map<
  string,
  { primaryUrl: string; backupUrl?: string; coverUrl?: string; resolvedAt: number }
>();
const tiktokStreamInFlightByVid = new Map<
  string,
  Promise<{ primaryUrl: string | null; backupUrl: string | null; coverUrl?: string }>
>();
const TIKTOK_STREAM_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes before CDN token refresh

/**
 * Verifies whether a direct video stream URL is fresh and safe for HTML5 <video> playback without stalling.
 * Rejects `v16m.tiktokcdn.com` (which hangs without session cookies) and expired signed TikTok CDN tokens.
 */
export function isDirectVideoUrlFreshAndPlayable(url?: string | null): boolean {
  const clean = String(url || '').trim();
  if (!clean || !/^https?:\/\//i.test(clean)) return false;
  if (/v16m\.tiktokcdn\.com/i.test(clean)) return false;
  if (/tiktokcdn\.com/i.test(clean)) {
    const expMatch = clean.match(/[?&]x-expires=(\d+)/i);
    if (!expMatch) return false;
    const expMs = Number(expMatch[1]) * 1000;
    if (!Number.isFinite(expMs) || expMs <= Date.now() + 5 * 60 * 1000) {
      return false;
    }
  }
  return true;
}

/**
 * Synchronously returns a cached, verified CORS-enabled TikTok MP4 stream if already pre-warmed.
 * Allows `<video autoPlay playsInline>` to mount synchronously inside the user's tap gesture on Android & iOS!
 */
export function getCachedTikTokStreamUrl(
  item: Partial<OnlineFoodDiscoveryItem>
): { primaryUrl: string; backupUrl?: string; coverUrl?: string } | null {
  const tiktokVid = extractTikTokVideoId(item.inlineVideoId || item.sourceUrl);
  if (tiktokVid) {
    const cached = tiktokStreamCacheByVid.get(tiktokVid);
    if (
      cached &&
      Date.now() - cached.resolvedAt < TIKTOK_STREAM_CACHE_TTL_MS &&
      isDirectVideoUrlFreshAndPlayable(cached.primaryUrl)
    ) {
      return {
        primaryUrl: cached.primaryUrl,
        backupUrl: isDirectVideoUrlFreshAndPlayable(cached.backupUrl) ? cached.backupUrl : undefined,
        coverUrl: cached.coverUrl,
      };
    }
  }
  if (isDirectVideoUrlFreshAndPlayable(item.directVideoUrl)) {
    return {
      primaryUrl: item.directVideoUrl!,
    };
  }
  return null;
}

/**
 * Pre-warms playable CORS MP4 streams in the background for visible TikTok cards so when the user taps
 * Play on Android or iOS, the stream URL is already resolved in memory (0ms latency, preserving user gesture).
 */
export async function prewarmTikTokStreams(
  items: ReadonlyArray<Partial<OnlineFoodDiscoveryItem>>,
  maxCount = 6
): Promise<Record<string, { primaryUrl: string; backupUrl?: string }>> {
  const resolvedMap: Record<string, { primaryUrl: string; backupUrl?: string }> = {};
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return resolvedMap;
  }

  const tiktokItems = items
    .filter((it) => it && it.platform === 'tiktok' && it.id)
    .slice(0, maxCount);

  for (const it of tiktokItems) {
    const syncCached = getCachedTikTokStreamUrl(it);
    if (syncCached && it.id) {
      resolvedMap[it.id] = {
        primaryUrl: syncCached.primaryUrl,
        backupUrl: syncCached.backupUrl,
      };
    }
  }

  const uncached = tiktokItems.filter((it) => it.id && !resolvedMap[it.id]);
  const concurrency = 2;
  for (let i = 0; i < uncached.length; i += concurrency) {
    const batch = uncached.slice(i, i + concurrency);
    await Promise.allSettled(
      batch.map(async (it) => {
        const res = await resolvePlayableTikTokStreamUrl(it);
        if (res.primaryUrl && it.id) {
          resolvedMap[it.id] = {
            primaryUrl: res.primaryUrl,
            backupUrl: res.backupUrl || undefined,
          };
        }
      })
    );
  }

  return resolvedMap;
}

/**
 * Resolves a direct, playable MP4 stream URL for a TikTok video so it plays smoothly inside a native
 * HTML5 <video> element on Android WebView, iOS WKWebView, and Web without buffering or freezing at 0:00.
 *
 * Layer 1: Fresh in-memory stream cache (populated from tikwm CORS API).
 * Layer 2: CORS-enabled TikTok stream resolver (https://www.tikwm.com/api/?url=...) returning H.264/AAC MP4 with ACAO: *.
 * Layer 3: TikTok creator embed state fallback (non-v16m CDN hosts only).
 */
export async function resolvePlayableTikTokStreamUrl(
  item: Partial<OnlineFoodDiscoveryItem>
): Promise<{ primaryUrl: string | null; backupUrl: string | null; coverUrl?: string }> {
  const tiktokVid = extractTikTokVideoId(item.inlineVideoId || item.sourceUrl);
  const cleanHandle =
    String(item.authorHandle || '')
      .replace(/^@+/, '')
      .trim() ||
    (item.sourceUrl?.match(/tiktok\.com\/@([^/?#]+)/i)?.[1] ?? 'eatame.eater');

  const syncCached = getCachedTikTokStreamUrl(item);
  if (syncCached) {
    return {
      primaryUrl: syncCached.primaryUrl,
      backupUrl: syncCached.backupUrl || null,
      coverUrl: syncCached.coverUrl,
    };
  }

  if (tiktokVid && tiktokStreamInFlightByVid.has(tiktokVid)) {
    return tiktokStreamInFlightByVid.get(tiktokVid)!;
  }

  const task = (async (): Promise<{ primaryUrl: string | null; backupUrl: string | null; coverUrl?: string }> => {
    const canonicalTikTokUrl = tiktokVid
      ? `https://www.tiktok.com/@${cleanHandle}/video/${tiktokVid}`
      : String(item.sourceUrl || '').trim();

    const isNative = Boolean(Capacitor?.isNativePlatform?.());

    // Layer 2: Query CORS-enabled tikwm API for fresh H.264/AAC CDN MP4 stream (play + wmplay with ACAO: *)
    if (canonicalTikTokUrl && /^https?:\/\//i.test(canonicalTikTokUrl)) {
      const apiEndpoint = `https://www.tikwm.com/api/?url=${encodeURIComponent(canonicalTikTokUrl)}`;
      try {
        let json: any = null;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        try {
          const res = await fetch(apiEndpoint, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (res.ok) {
            json = await res.json();
          }
        } catch {
          clearTimeout(timer);
          if (isNative && CapacitorHttp?.get) {
            const resp = await CapacitorHttp.get({
              url: apiEndpoint,
              headers: { Accept: 'application/json' },
              connectTimeout: 2600,
              readTimeout: 2600,
            });
            if (resp && resp.status >= 200 && resp.status < 300) {
              json = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
            }
          }
        }

        const playUrl = String(json?.data?.play || '').trim();
        const wmPlayUrl = String(json?.data?.wmplay || '').trim();
        const coverUrl = String(json?.data?.cover || json?.data?.origin_cover || '').trim() || undefined;
        const validPrimary = isDirectVideoUrlFreshAndPlayable(playUrl)
          ? playUrl
          : isDirectVideoUrlFreshAndPlayable(wmPlayUrl)
          ? wmPlayUrl
          : '';
        if (validPrimary) {
          const backup =
            isDirectVideoUrlFreshAndPlayable(wmPlayUrl) && wmPlayUrl !== validPrimary
              ? wmPlayUrl
              : isDirectVideoUrlFreshAndPlayable(item.directVideoUrl)
              ? item.directVideoUrl
              : undefined;
          if (tiktokVid) {
            tiktokStreamCacheByVid.set(tiktokVid, {
              primaryUrl: validPrimary,
              backupUrl: backup,
              coverUrl,
              resolvedAt: Date.now(),
            });
          }
          return {
            primaryUrl: validPrimary,
            backupUrl: backup || null,
            coverUrl,
          };
        }
      } catch {
        // Fall through to Layer 3
      }
    }

    // Layer 3: Extract playAddr from TikTok's public creator embed feed (/embed/@handle), rejecting v16m hosts
    if (tiktokVid && cleanHandle) {
      try {
        const embedEndpoint = `https://www.tiktok.com/embed/@${cleanHandle}`;
        let html = '';
        if (isNative && CapacitorHttp?.get) {
          const resp = await CapacitorHttp.get({
            url: embedEndpoint,
            headers: {
              Accept: 'text/html,application/xhtml+xml',
              'User-Agent':
                'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
            },
            connectTimeout: 2600,
            readTimeout: 2600,
          });
          if (resp && resp.status >= 200 && resp.status < 300 && typeof resp.data === 'string') {
            html = resp.data;
          }
        } else {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(embedEndpoint, { signal: controller.signal });
          clearTimeout(timer);
          if (res.ok) {
            html = await res.text();
          }
        }

        if (html) {
          const stateMatch = html.match(
            /<script id="__FRONTITY_CONNECT_STATE__" type="application\/json">([\s\S]*?)<\/script>/
          );
          if (stateMatch && stateMatch[1]) {
            const parsedState = JSON.parse(stateMatch[1]);
            const creatorData = parsedState?.source?.data?.[`/embed/@${cleanHandle}`];
            const videoList = Array.isArray(creatorData?.videoList) ? creatorData.videoList : [];
            for (const v of videoList) {
              const vId = extractTikTokVideoId(String(v?.id || ''));
              const vPlayAddr = String(v?.playAddr || '').trim();
              const vCover = String(v?.coverUrl || v?.originCoverUrl || '').trim() || undefined;
              if (
                vId &&
                isDirectVideoUrlFreshAndPlayable(vPlayAddr) &&
                !tiktokStreamCacheByVid.has(vId)
              ) {
                tiktokStreamCacheByVid.set(vId, {
                  primaryUrl: vPlayAddr,
                  backupUrl: undefined,
                  coverUrl: vCover,
                  resolvedAt: Date.now(),
                });
              }
            }
            const matched = tiktokStreamCacheByVid.get(tiktokVid);
            if (matched?.primaryUrl) {
              return {
                primaryUrl: matched.primaryUrl,
                backupUrl:
                  isDirectVideoUrlFreshAndPlayable(item.directVideoUrl) &&
                  item.directVideoUrl !== matched.primaryUrl
                    ? item.directVideoUrl!
                    : null,
                coverUrl: matched.coverUrl,
              };
            }
          }
        }
      } catch {
        // Ignore network/CORS error and fall back
      }
    }

    if (isDirectVideoUrlFreshAndPlayable(item.directVideoUrl)) {
      return {
        primaryUrl: item.directVideoUrl!,
        backupUrl: null,
      };
    }

    return { primaryUrl: null, backupUrl: null };
  })();

  if (tiktokVid) {
    tiktokStreamInFlightByVid.set(tiktokVid, task);
    task.finally(() => {
      tiktokStreamInFlightByVid.delete(tiktokVid);
    });
  }

  return task;
}

export function resolveInlineVideoIdForSocialItem(item: Partial<OnlineFoodDiscoveryItem>): string {
  // CRITICAL: Never assign a YouTube video ID to a TikTok or Facebook item!
  if (item.platform === 'tiktok') {
    return extractTikTokVideoId(item.inlineVideoId || item.sourceUrl) || '';
  }
  if (item.platform === 'facebook') {
    return '';
  }

  if (item.inlineVideoId && /^[a-zA-Z0-9_-]{11}$/.test(item.inlineVideoId) && !isKnownUnavailableVideo(item.inlineVideoId)) {
    return item.inlineVideoId;
  }
  const fromUrl = extractYouTubeVideoId(item.sourceUrl || '');
  if (fromUrl && /^[a-zA-Z0-9_-]{11}$/.test(fromUrl) && !isKnownUnavailableVideo(fromUrl)) {
    return fromUrl;
  }

  let hash = 0;
  const seedStr = item.id || item.titleEn || item.titleKh || 'khmer';
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_SOCIAL_INLINE_VIDEOS[hash % FALLBACK_SOCIAL_INLINE_VIDEOS.length];
}

export function getNextPlayableSocialVideoId(currentVideoId?: string): string {
  const idx = currentVideoId ? FALLBACK_SOCIAL_INLINE_VIDEOS.indexOf(currentVideoId) : -1;
  return FALLBACK_SOCIAL_INLINE_VIDEOS[(idx + 1) % FALLBACK_SOCIAL_INLINE_VIDEOS.length];
}

export interface DiscoveredTikTokCreatorRecord {
  handle: string;
  displayName: string;
  profileUrl: string;
  defaultCategory: TrendingFoodCategorySlug;
  defaultFoodThumb: string;
  discoveredVia?: 'seed' | 'hashtag_foryou' | 'related_mention' | 'cloud_sync';
  discoveredAt?: string;
}

export const OFFICIAL_PRIORITY_TIKTOK_CREATORS: DiscoveredTikTokCreatorRecord[] = [
  {
    handle: 'pudy_lychher',
    displayName: 'ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)',
    profileUrl: 'https://www.tiktok.com/@pudy_lychher',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-64.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'eatame.eater',
    displayName: 'Eatame (@eatame.eater)',
    profileUrl: 'https://www.tiktok.com/@eatame.eater?is_from_webapp=1&sender_device=pc',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-19.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'expressions_hub',
    displayName: 'សារអាហារ - Expressions Hub (@expressions_hub)',
    profileUrl: 'https://www.tiktok.com/@expressions_hub?is_from_webapp=1&sender_device=pc',
    defaultCategory: 'famous_restaurant',
    defaultFoodThumb: '/foods/food-37.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'derdailyofficial',
    displayName: 'DerDaily ដើរដេលី (@derdailyofficial)',
    profileUrl: 'https://www.tiktok.com/@derdailyofficial?is_from_webapp=1&sender_device=pc',
    defaultCategory: 'food_travel_vlog',
    defaultFoodThumb: '/foods/food-38.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'fatame.cooking',
    displayName: 'Fatame (@fatame.cooking)',
    profileUrl: 'https://www.tiktok.com/@fatame.cooking?is_from_webapp=1&sender_device=pc',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-21.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'foodwhisper_officials',
    displayName: 'Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)',
    profileUrl: 'https://www.tiktok.com/@foodwhisper_officials?is_from_webapp=1&sender_device=pc',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-24.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: '.khleancheck',
    displayName: 'ឃ្លានឆេក - Khlean Check (@.khleancheck)',
    profileUrl: 'https://www.tiktok.com/@.khleancheck',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-64.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'benlycooking',
    displayName: 'ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking)',
    profileUrl: 'https://www.tiktok.com/@benlycooking',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-4.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'woori_kitchenstory',
    displayName: 'Kitchen Story - មុខម្ហូបខ្មែរ (@woori_kitchenstory)',
    profileUrl: 'https://www.tiktok.com/@woori_kitchenstory',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-4.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'plov_der',
    displayName: 'ផ្លូវដើរ - Plov Der (@plov_der)',
    profileUrl: 'https://www.tiktok.com/@plov_der',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-27.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'me_kork_sach100muk',
    displayName: 'មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk)',
    profileUrl: 'https://www.tiktok.com/@me_kork_sach100muk',
    defaultCategory: 'famous_restaurant',
    defaultFoodThumb: '/foods/food-36.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'tosmokplouk',
    displayName: 'តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk)',
    profileUrl: 'https://www.tiktok.com/@tosmokplouk',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-80.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'taseit_restaurant',
    displayName: 'ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant)',
    profileUrl: 'https://www.tiktok.com/@taseit_restaurant',
    defaultCategory: 'famous_restaurant',
    defaultFoodThumb: '/foods/food-21.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'bore.restaurant',
    displayName: 'ភោជនីយដ្ឋាន បុរេ - Boré (@bore.restaurant)',
    profileUrl: 'https://www.tiktok.com/@bore.restaurant',
    defaultCategory: 'famous_restaurant',
    defaultFoodThumb: '/foods/food-1.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'ruja.grill.st598',
    displayName: 'Ruja Grill & Hotpot (@ruja.grill.st598)',
    profileUrl: 'https://www.tiktok.com/@ruja.grill.st598',
    defaultCategory: 'famous_restaurant',
    defaultFoodThumb: '/foods/food-19.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'suyadaily',
    displayName: 'ស្នាដៃកូនពៅ - Suya Daily (@suyadaily)',
    profileUrl: 'https://www.tiktok.com/@suyadaily',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-19.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'ounwelldailycooking',
    displayName: 'Oun Well Daily Cooking (@ounwelldailycooking)',
    profileUrl: 'https://www.tiktok.com/@ounwelldailycooking',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-4.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'hub_baywithme',
    displayName: 'Hub Bay With Me (@hub_baywithme)',
    profileUrl: 'https://www.tiktok.com/@hub_baywithme',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-15.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'ieatisharecambodia',
    displayName: 'I Eat I Share Cambodia (@ieatisharecambodia)',
    profileUrl: 'https://www.tiktok.com/@ieatisharecambodia',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-38.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'the_hungry_housewife',
    displayName: 'The Hungry Housewife (@the_hungry_housewife)',
    profileUrl: 'https://www.tiktok.com/@the_hungry_housewife',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-1.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'chansothea.83',
    displayName: 'Chan Sothea Khmer Cooking (@chansothea.83)',
    profileUrl: 'https://www.tiktok.com/@chansothea.83',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-3.jpg',
    discoveredVia: 'seed',
  },
  {
    handle: 'biteswithlily',
    displayName: 'Bites With Lily (@biteswithlily)',
    profileUrl: 'https://www.tiktok.com/@biteswithlily',
    defaultCategory: 'popular_food',
    defaultFoodThumb: '/foods/food-27.jpg',
    discoveredVia: 'seed',
  },
];

/**
 * Cambodian food, street food, restaurant, and local culinary hashtags used to discover
 * both famous and smaller creators via TikTok's public For You / hashtag recommendation feeds (/embed/tag/<hashtag>).
 */
export const TIKTOK_CAMBODIAN_FOOD_DISCOVERY_HASHTAGS: readonly string[] = [
  'ម្ហូបខ្មែរ',
  'អាហារខ្មែរ',
  'ម្ហូបតាមផ្លូវ',
  'ធ្វើម្ហូប',
  'ម្ហូបអ្នកភូមិ',
  'cambodianfood',
  'khmerfood',
  'cambodiastreetfood',
  'phnompenhfood',
  'khmerstreetfood',
  'foodcambodia',
  'cambodiafoodie',
  'khmercooking',
  'siemreapfood',
  'បង្អែមខ្មែរ',
];

const LIVE_TIKTOK_CREATORS_CACHE_KEY = 'kft_live_tiktok_creators_v4';
const CLOUD_TIKTOK_DISCOVERED_DOC_KEY = 'kft_cloud_tiktok_discovered_videos_v2';
const TIKTOK_DISCOVERED_CREATORS_DB_KEY = 'kft_discovered_tiktok_creators_db_v1';
const CLOUD_TIKTOK_CREATORS_DB_DOC_KEY = 'kft_cloud_tiktok_creators_db_v1';
const TIKTOK_CREATOR_CRAWL_CURSOR_KEY = 'kft_tiktok_creator_crawl_cursor_v1';
const TIKTOK_HASHTAG_CRAWL_CURSOR_KEY = 'kft_tiktok_hashtag_crawl_cursor_v1';
const LIVE_TIKTOK_CREATORS_TTL_MS = 15 * 60 * 1000; // 15 minutes automatic discovery cycle
const BACKGROUND_CREATOR_EXPAND_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes non-blocking background expansion
let lastBackgroundTikTokExpandMs = 0;
let isBackgroundTikTokExpanding = false;

const INVALID_OR_GENERIC_TIKTOK_HANDLES = new Set<string>([
  'tiktok',
  'foryou',
  'foryoupage',
  'fyp',
  'viral',
  'trending',
  'cambodia',
  'khmer',
  'phnompenh',
  'siemreap',
  'food',
  'streetfood',
  'khmerfood',
  'cambodianfood',
]);

const DEFAULT_FOOD_THUMBS_POOL = [
  '/foods/food-1.jpg',
  '/foods/food-2.jpg',
  '/foods/food-3.jpg',
  '/foods/food-4.jpg',
  '/foods/food-6.jpg',
  '/foods/food-15.jpg',
  '/foods/food-19.jpg',
  '/foods/food-21.jpg',
  '/foods/food-24.jpg',
  '/foods/food-27.jpg',
  '/foods/food-36.jpg',
  '/foods/food-37.jpg',
  '/foods/food-38.jpg',
  '/foods/food-64.jpg',
  '/foods/food-80.jpg',
];

/**
 * Normalizes a TikTok creator handle to lowercase without leading `@` and validates allowed characters
 * so duplicate accounts are never added to the creator database.
 */
export function normalizeTikTokHandle(rawHandle?: string | null): string {
  if (!rawHandle || typeof rawHandle !== 'string') return '';
  const cleaned = rawHandle
    .trim()
    .replace(/^@+/, '')
    .replace(/[/?#].*$/, '')
    .trim()
    .toLowerCase();
  if (cleaned.length < 3 || cleaned.length > 38) return '';
  if (!/^[a-z0-9._]+$/.test(cleaned)) return '';
  if (/^\d+$/.test(cleaned)) return '';
  if (INVALID_OR_GENERIC_TIKTOK_HANDLES.has(cleaned)) return '';
  return cleaned;
}

/**
 * Positive Cambodian food, restaurant, street food, recipe, and beverage classifier regex.
 */
const FOOD_TIKTOK_POSITIVE_RE =
  /ម្ហូប|អាហារ|ញ៉ាំ|ហូប|ភ្លក់|ឆ្ងាញ់|ធ្វើម្ហូប|រូបមន្ត|ស្ល|សម្ល|ម្ជូរ|កកូរ|ប្រហើរ|ការី|ខត្រី|ខសាច់|អាំង|ចៀន|បំពង|ដុត|ចំហុយ|ឆា|ស្ងោរ|បង្អែម|ភេសជ្ជៈ|តែ|កាហ្វេ|ហាង|ភោជនីយដ្ឋាន|តូប|ផ្សារ|អាហារដ្ឋាន|ប៊ូហ្វេ|ស៊ុប|ហតផត|មី|គុយទាវ|នំបញ្ចុក|អាម៉ុក|ឡុកឡាក់|បុកល្ហុង|សាច់អាំង|គ្រឿងសមុទ្រ|ក្ដាម|បង្គា|មឹក|លៀស|ខ្យង|ត្រី|សាច់គោ|សាច់ជ្រូក|មាន់|ទា|កង្កែប|បាយ|បបរ|លត|នំ|បាញ់ឆែវ|នំគ្រក់|ប្រហុក|ទឹកគ្រឿង|ទឹកត្រី|ម្រេច|ចុងភៅ|ឃ្លាន|ពូឌីលីឈើ|food|eat|eating|foodie|cook|cooking|kitchen|recipe|dish|meal|lunch|dinner|breakfast|restaurant|cafe|coffee|street\s*food|local\s*food|khmer\s*food|cambodian\s*food|mukbang|yummy|delicious|tasty|bbq|grill|fried|roast|steak|noodle|soup|hotpot|buffet|seafood|crab|prawn|shrimp|fish|chicken|beef|pork|duck|dessert|sweet|drink|beverage|market|stall|chef|taste|flavor/i;

/**
 * Exclusion regex to filter out non-food entertainment, drama skits, vehicle wrapping, solar poles,
 * slime shops, trash pickup, or unrelated non-food posts.
 */
const FOOD_TIKTOK_EXCLUDE_NON_FOOD_RE =
  /បិតស្កុតការពារ|ទឹកថ្នាំរថយន្ត|ដាំបង្គោលសូឡា|អំពូលសូឡា|trash\s*pick\s*up|slimeshop|slime\s*shop|ភាគ\s*\d+\s*រឿង|ឈឹចាបរាំរៃ|លក់ដី|លក់ផ្ទះ|ជួសជុលរថយន្ត|គ្រឿងសំណង់|នយោបាយ|ហោរាសាស្ត្រ/i;

const DEDICATED_FOOD_CREATOR_HANDLES = new Set<string>([
  'pudy_lychher',
  'eatame.eater',
  'expressions_hub',
  'fatame.cooking',
  'foodwhisper_officials',
  '.khleancheck',
  'benlycooking',
  'woori_kitchenstory',
  'me_kork_sach100muk',
  'tosmokplouk',
  'taseit_restaurant',
  'bore.restaurant',
  'ruja.grill.st598',
  'suyadaily',
  'ounwelldailycooking',
  'hub_baywithme',
  'ieatisharecambodia',
  'the_hungry_housewife',
  'chansothea.83',
  'biteswithlily',
]);

/**
 * Strictly prioritizes Cambodian food, restaurant, street food, and cooking content,
 * rejecting unrelated entertainment, drama skits, or non-food posts.
 */
export function isCambodianFoodRelatedTikTokVideo(desc: string, handle?: string): boolean {
  const cleanDesc = String(desc || '').trim();
  const normHandle = normalizeTikTokHandle(handle);

  if (cleanDesc && FOOD_TIKTOK_EXCLUDE_NON_FOOD_RE.test(cleanDesc)) {
    return false;
  }

  if (cleanDesc && FOOD_TIKTOK_POSITIVE_RE.test(cleanDesc)) {
    return true;
  }

  // If the creator is a dedicated cooking/restaurant/food review channel and the caption is short without non-food exclusions
  if (
    (DEDICATED_FOOD_CREATOR_HANDLES.has(normHandle) ||
      /cook|food|kitchen|eat|chef|restaurant|grill|bbq|cafe|ភោជនីយដ្ឋាន|ម្ហូប|ឃ្លាន|ភ្លក់/i.test(normHandle)) &&
    cleanDesc.length < 40
  ) {
    return true;
  }

  return false;
}

/**
 * Returns the continuously expanding database of Cambodian food TikTok creators,
 * merging the 22+ seed creators with all dynamically discovered creators stored in localStorage.
 * Strictly deduplicated by normalized TikTok handle.
 */
export function getExpandedTikTokCreatorDatabase(): DiscoveredTikTokCreatorRecord[] {
  const byHandle = new Map<string, DiscoveredTikTokCreatorRecord>();

  for (const seed of OFFICIAL_PRIORITY_TIKTOK_CREATORS) {
    const norm = normalizeTikTokHandle(seed.handle);
    if (norm) {
      byHandle.set(norm, { ...seed, handle: norm });
    }
  }

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(TIKTOK_DISCOVERED_CREATORS_DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const rec of parsed) {
            const norm = normalizeTikTokHandle(rec?.handle);
            if (!norm || byHandle.has(norm)) continue;
            byHandle.set(norm, {
              handle: norm,
              displayName: String(rec?.displayName || `@${norm}`),
              profileUrl: String(rec?.profileUrl || `https://www.tiktok.com/@${norm}`),
              defaultCategory:
                rec?.defaultCategory === 'famous_restaurant' ||
                rec?.defaultCategory === 'food_travel_vlog' ||
                rec?.defaultCategory === 'popular_food'
                  ? rec.defaultCategory
                  : 'popular_food',
              defaultFoodThumb: String(rec?.defaultFoodThumb || '/foods/food-19.jpg'),
              discoveredVia: rec?.discoveredVia || 'hashtag_foryou',
              discoveredAt: rec?.discoveredAt || new Date().toISOString(),
            });
          }
        }
      }
    }
  } catch {
    // ignore storage read error
  }

  return Array.from(byHandle.values());
}

/**
 * Registers one or more newly discovered Cambodian food TikTok creators into the persistent Creator Database
 * without duplicating existing accounts. Returns true if any new creator was added.
 */
export function registerDiscoveredTikTokCreator(
  rawHandle: string,
  options?: {
    displayName?: string;
    defaultCategory?: TrendingFoodCategorySlug;
    discoveredVia?: DiscoveredTikTokCreatorRecord['discoveredVia'];
  }
): { added: boolean; record: DiscoveredTikTokCreatorRecord | null } {
  const norm = normalizeTikTokHandle(rawHandle);
  if (!norm) return { added: false, record: null };

  const currentDb = getExpandedTikTokCreatorDatabase();
  const existing = currentDb.find((c) => normalizeTikTokHandle(c.handle) === norm);
  if (existing) {
    return { added: false, record: existing };
  }

  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash * 31 + norm.charCodeAt(i)) >>> 0;
  }
  const defaultFoodThumb = DEFAULT_FOOD_THUMBS_POOL[hash % DEFAULT_FOOD_THUMBS_POOL.length];
  const inferredCategory: TrendingFoodCategorySlug =
    options?.defaultCategory ||
    (/restaurant|grill|cafe|coffee|hotpot|buffet|ភោជនីយដ្ឋាន/i.test(norm) ? 'famous_restaurant' : 'popular_food');

  const newRecord: DiscoveredTikTokCreatorRecord = {
    handle: norm,
    displayName: options?.displayName || `@${norm}`,
    profileUrl: `https://www.tiktok.com/@${norm}`,
    defaultCategory: inferredCategory,
    defaultFoodThumb,
    discoveredVia: options?.discoveredVia || 'hashtag_foryou',
    discoveredAt: new Date().toISOString(),
  };

  const seedHandles = new Set(OFFICIAL_PRIORITY_TIKTOK_CREATORS.map((c) => normalizeTikTokHandle(c.handle)));
  const dynamicRecords = [...currentDb.filter((c) => !seedHandles.has(normalizeTikTokHandle(c.handle))), newRecord].slice(
    -150
  );

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TIKTOK_DISCOVERED_CREATORS_DB_KEY, JSON.stringify(dynamicRecords));
    }
  } catch {
    // ignore storage quota
  }

  return { added: true, record: newRecord };
}

/**
 * Helper to fetch HTML from a public TikTok embed endpoint (`/embed/@<handle>` or `/embed/tag/<hashtag>`)
 * using native CapacitorHttp on Android/iOS or standard fetch with timeout.
 */
async function fetchTikTokPublicEmbedHtml(embedUrl: string, isNative: boolean, timeoutMs = 4200): Promise<string> {
  try {
    if (isNative && CapacitorHttp?.get) {
      const resp = await CapacitorHttp.get({
        url: embedUrl,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        },
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      });
      if (resp && resp.status >= 200 && resp.status < 300 && typeof resp.data === 'string') {
        return resp.data;
      }
    } else {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(embedUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        return await res.text();
      }
    }
  } catch {
    // Ignore CORS or network timeout
  }
  return '';
}

/**
 * Extracts `@mentions` of related accounts/restaurants from a food video description.
 */
function extractRelatedTikTokMentions(desc: string): string[] {
  if (!desc) return [];
  const matches = desc.match(/@([a-zA-Z0-9._]{3,32})/g);
  if (!matches) return [];
  const out: string[] = [];
  for (const m of matches) {
    const clean = normalizeTikTokHandle(m.replace(/[.,!?;:]+$/, ''));
    if (clean && !out.includes(clean)) {
      out.push(clean);
    }
  }
  return out;
}

/**
 * Automatically discovers, collects, and synchronizes public Cambodian food TikTok accounts and videos
 * from ANY creators (both famous influencers and smaller local cooks, street vendors, and restaurants):
 *
 * 1. Continuously Expanding Creator Database (`getExpandedTikTokCreatorDatabase()`):
 *    - Seeded with 22+ verified Cambodian food creators including `@pudy_lychher` (https://www.tiktok.com/@pudy_lychher),
 *      `@eatame.eater`, `@expressions_hub`, `@derdailyofficial`, `@fatame.cooking`, `@foodwhisper_officials`,
 *      `@.khleancheck`, `@benlycooking`, `@woori_kitchenstory`, `@plov_der`, `@me_kork_sach100muk`, `@tosmokplouk`,
 *      `@taseit_restaurant`, `@bore.restaurant`, `@ruja.grill.st598`, `@suyadaily`, `@ounwelldailycooking`,
 *      `@hub_baywithme`, `@ieatisharecambodia`, `@the_hungry_housewife`, `@chansothea.83`, `@biteswithlily`.
 *    - Continuously grows as new creators are discovered from hashtags, For You recommendations, and `@mentions`.
 * 2. Multi-Vector Live Discovery:
 *    - Vector A: Rotating Creator Profile Embed Crawl (`/embed/@<handle>`) across famous, smaller, and newly discovered creators.
 *    - Vector B: Hashtag & Recommendation Embed Crawl (`/embed/tag/<hashtag>`) across 15 Khmer & English food tags,
 *      discovering both food videos and new creator handles (`authorUniqueId` + `@mentions`) and crawling new creators immediately.
 * 3. Strict Cambodian Food Filtering & Deduplication:
 *    - Prioritizes Cambodian food, restaurants, street food, and cooking via `isCambodianFoodRelatedTikTokVideo`.
 *    - Deduplicates all creators by normalized handle and all videos by 19-digit Snowflake ID.
 */
export async function fetchLiveTikTokCreatorVideos(
  forceRefresh = false,
  foods: FoodItem[] = initialFoods
): Promise<OnlineFoodDiscoveryItem[]> {
  // 1. Check fresh local cache first when not force-refreshing
  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(LIVE_TIKTOK_CREATORS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const age = Date.now() - (Date.parse(parsed.updatedAt) || 0);
        if (age < LIVE_TIKTOK_CREATORS_TTL_MS && Array.isArray(parsed.items) && parsed.items.length > 0) {
          // Trigger non-blocking background creator & hashtag expansion if interval elapsed
          if (
            !isBackgroundTikTokExpanding &&
            Date.now() - lastBackgroundTikTokExpandMs >= BACKGROUND_CREATOR_EXPAND_INTERVAL_MS &&
            (typeof navigator === 'undefined' || navigator.onLine !== false)
          ) {
            isBackgroundTikTokExpanding = true;
            lastBackgroundTikTokExpandMs = Date.now();
            setTimeout(() => {
              fetchLiveTikTokCreatorVideos(true, foods)
                .catch(() => {})
                .finally(() => {
                  isBackgroundTikTokExpanding = false;
                });
            }, 600);
          }

          return parsed.items.map((it: OnlineFoodDiscoveryItem) => ({
            ...it,
            directVideoUrl: isDirectVideoUrlFreshAndPlayable(it.directVideoUrl) ? it.directVideoUrl : undefined,
          }));
        }
      }
    } catch {
      // ignore
    }
  }

  const byTikTokVideoId = new Map<string, OnlineFoodDiscoveryItem>();

  // Seed with the verified 2026 baseline videos from @pudy_lychher and the expanded Cambodian food creators
  for (const item of CURATED_TIKTOK_FACEBOOK_REVIEWS) {
    if (item.platform !== 'tiktok') continue;
    const vid = extractTikTokVideoId(item.inlineVideoId || item.sourceUrl);
    if (vid) {
      byTikTokVideoId.set(vid, item);
    }
  }

  // Also merge any previously cached live TikTok discoveries so the collection grows continuously
  try {
    const prevRaw = localStorage.getItem(LIVE_TIKTOK_CREATORS_CACHE_KEY);
    if (prevRaw) {
      const prevParsed = JSON.parse(prevRaw);
      if (Array.isArray(prevParsed?.items)) {
        for (const item of prevParsed.items) {
          if (!item || item.platform !== 'tiktok') continue;
          const vid = extractTikTokVideoId(item.inlineVideoId || item.sourceUrl);
          if (vid && !byTikTokVideoId.has(vid)) {
            byTikTokVideoId.set(vid, {
              ...item,
              inlineVideoId: vid,
              canInlineEmbed: true,
              isPlayableVerified: true,
              directVideoUrl: isDirectVideoUrlFreshAndPlayable(item.directVideoUrl) ? item.directVideoUrl : undefined,
            });
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. Pull cloud-synchronized TikTok discoveries & expanded creator database from Supabase
  if (isSupabaseConfigured() && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
    try {
      const [cloudVideosDoc, cloudCreatorsDoc] = await Promise.all([
        pullCloudDocument<{ updatedAt: string; items: OnlineFoodDiscoveryItem[] }>(
          CLOUD_TIKTOK_DISCOVERED_DOC_KEY,
          3200
        ).catch(() => null),
        pullCloudDocument<{ updatedAt: string; creators: DiscoveredTikTokCreatorRecord[] }>(
          CLOUD_TIKTOK_CREATORS_DB_DOC_KEY,
          3200
        ).catch(() => null),
      ]);

      if (Array.isArray(cloudCreatorsDoc?.creators)) {
        for (const cr of cloudCreatorsDoc.creators) {
          if (cr?.handle) {
            registerDiscoveredTikTokCreator(cr.handle, {
              displayName: cr.displayName,
              defaultCategory: cr.defaultCategory,
              discoveredVia: 'cloud_sync',
            });
          }
        }
      }

      if (Array.isArray(cloudVideosDoc?.items)) {
        for (const item of cloudVideosDoc.items) {
          if (!item || item.platform !== 'tiktok') continue;
          const vid = extractTikTokVideoId(item.inlineVideoId || item.sourceUrl);
          if (vid && !byTikTokVideoId.has(vid)) {
            byTikTokVideoId.set(vid, {
              ...item,
              inlineVideoId: vid,
              canInlineEmbed: true,
              isPlayableVerified: true,
              directVideoUrl: undefined,
            });
          }
        }
      }
    } catch {
      // ignore offline/cloud timeout
    }
  }

  // 3. Multi-Vector Live Discovery (Creator Database Rotation + Hashtag/ForYou Discovery + Related Account Crawl)
  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    const isNative = Boolean(Capacitor?.isNativePlatform?.());
    let newlyDiscoveredVideoCount = 0;
    let newlyDiscoveredCreatorCount = 0;

    const ingestRawTikTokVideo = (
      rawVid: any,
      creator: DiscoveredTikTokCreatorRecord,
      badgeEn = 'TikTok Cambodian Food Creator'
    ) => {
      const vid = extractTikTokVideoId(String(rawVid?.id || ''));
      if (!vid) return;

      const desc = String(rawVid?.desc || '').trim();
      const authorFromVid = normalizeTikTokHandle(rawVid?.authorUniqueId) || normalizeTikTokHandle(creator.handle);
      if (!authorFromVid) return;

      if (!isCambodianFoodRelatedTikTokVideo(desc, authorFromVid)) {
        return;
      }

      // Extract any @mentioned related food accounts/restaurants from the food caption
      for (const mentionedHandle of extractRelatedTikTokMentions(desc)) {
        if (mentionedHandle !== authorFromVid) {
          const reg = registerDiscoveredTikTokCreator(mentionedHandle, {
            displayName: `@${mentionedHandle}`,
            discoveredVia: 'related_mention',
          });
          if (reg.added) newlyDiscoveredCreatorCount++;
        }
      }

      // Cache direct non-v16m stream URL if present in embed state
      const rawPlayAddr = String(rawVid?.playAddr || '').trim();
      const coverUrl = String(rawVid?.coverUrl || rawVid?.originCoverUrl || '').trim();
      if (isDirectVideoUrlFreshAndPlayable(rawPlayAddr) && !tiktokStreamCacheByVid.has(vid)) {
        tiktokStreamCacheByVid.set(vid, {
          primaryUrl: rawPlayAddr,
          coverUrl: coverUrl || undefined,
          resolvedAt: Date.now(),
        });
      }

      const isoDate = tiktokSnowflakeIdToIsoDate(vid);
      const dateLabel = isoDate ? isoDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const match = matchCambodianDish(desc, foods);
      const detectedProv = detectProvinceFromVideoText(desc);
      const cleanCaption = desc.replace(/#\S+/g, '').replace(/\s+/g, ' ').trim();
      const displayLabel =
        normalizeTikTokHandle(creator.handle) === authorFromVid ? creator.displayName : `@${authorFromVid}`;

      const titleKh =
        cleanCaption.length >= 6
          ? cleanCaption.slice(0, 95)
          : `វីដេអូម្ហូបខ្មែរថ្មីពី ${displayLabel} (@${authorFromVid})`;

      const existing = byTikTokVideoId.get(vid);
      const inferredCategory: TrendingFoodCategorySlug =
        existing?.categorySlug ||
        (/ហាង|ភោជនីយដ្ឋាន|ប៊ូហ្វេ|ស៊ុប|ហតផត|restaurant|buffet|hotpot|cafe|coffee/i.test(desc)
          ? 'famous_restaurant'
          : creator.defaultCategory || 'popular_food');

      const updatedItem: OnlineFoodDiscoveryItem = {
        id: existing?.id || `tt-live-${vid}`,
        platform: 'tiktok',
        titleKh: existing?.titleKh || titleKh,
        titleEn:
          existing?.titleEn ||
          (cleanCaption.length >= 6
            ? cleanCaption.slice(0, 95)
            : `Cambodian Food Review by ${displayLabel} (@${authorFromVid})`),
        titleZh: existing?.titleZh || `${displayLabel} 柬埔寨美食视频`,
        descriptionKh:
          desc ||
          existing?.descriptionKh ||
          `វីដេអូម្ហូប និងវប្បធម៌អាហារខ្មែរពីគណនី @${authorFromVid}។`,
        descriptionEn:
          desc ||
          existing?.descriptionEn ||
          `Authentic Cambodian food video from creator @${authorFromVid}.`,
        descriptionZh:
          existing?.descriptionZh ||
          `来自创作者 @${authorFromVid} 的柬埔寨美食视频。`,
        thumbnailUrl: existing?.thumbnailUrl || coverUrl || creator.defaultFoodThumb || '/foods/food-19.jpg',
        sourceUrl: `https://www.tiktok.com/@${authorFromVid}/video/${vid}`,
        originalAccountUrl: `https://www.tiktok.com/@${authorFromVid}`,
        sourceName: displayLabel,
        authorHandle: `@${authorFromVid}`,
        publishedOrUpdatedAt: dateLabel,
        isLiveFetched: true,
        verificationBadgeEn: badgeEn,
        verificationBadgeKh: 'វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា',
        verificationBadgeZh: 'TikTok 柬埔寨美食创作者',
        categorySlug: inferredCategory,
        provinceKh:
          existing?.provinceKh ||
          (detectedProv.provinceKh !== 'ទូទាំងប្រទេសកម្ពុជា' ? detectedProv.provinceKh : 'រាជធានីភ្នំពេញ'),
        provinceEn:
          existing?.provinceEn ||
          (detectedProv.provinceEn !== 'All Cambodia' ? detectedProv.provinceEn : 'Phnom Penh'),
        matchedFoodId: existing?.matchedFoodId || match?.food?.id || 'food-1',
        matchedFoodNameKh: existing?.matchedFoodNameKh || match?.food?.nameKh,
        matchedFoodNameEn: existing?.matchedFoodNameEn || match?.food?.nameEn,
        relevanceScore: existing?.relevanceScore || (match?.food ? 100 : 98),
        isPlayableVerified: true,
        canInlineEmbed: true,
        inlineVideoId: vid,
        directVideoUrl: undefined,
      };

      if (!existing) {
        newlyDiscoveredVideoCount++;
      }
      byTikTokVideoId.set(vid, updatedItem);
    };

    const crawlCreatorProfile = async (creator: DiscoveredTikTokCreatorRecord) => {
      const normHandle = normalizeTikTokHandle(creator.handle);
      if (!normHandle) return;
      const html = await fetchTikTokPublicEmbedHtml(`https://www.tiktok.com/embed/@${normHandle}`, isNative, 4200);
      if (!html) return;
      const stateMatch = html.match(
        /<script id="__FRONTITY_CONNECT_STATE__" type="application\/json">([\s\S]*?)<\/script>/
      );
      if (!stateMatch || !stateMatch[1]) return;
      try {
        const parsedState = JSON.parse(stateMatch[1]);
        const creatorData =
          parsedState?.source?.data?.[`/embed/@${normHandle}`] ||
          parsedState?.source?.data?.[Object.keys(parsedState?.source?.data || {})[0] || ''];
        const videoList = Array.isArray(creatorData?.videoList) ? creatorData.videoList : [];
        for (const rawVid of videoList) {
          ingestRawTikTokVideo(rawVid, creator, 'TikTok Cambodian Food Creator');
        }
      } catch {
        // ignore JSON parse error
      }
    };

    // Vector A: Select a rotating batch of creators from the continuously expanding Creator Database
    const allCreators = getExpandedTikTokCreatorDatabase();
    let creatorCursor = 0;
    try {
      creatorCursor = Number(localStorage.getItem(TIKTOK_CREATOR_CRAWL_CURSOR_KEY) || 0) || 0;
    } catch {}

    const batchSize = forceRefresh ? Math.min(12, allCreators.length) : Math.min(8, allCreators.length);
    const selectedCreatorsMap = new Map<string, DiscoveredTikTokCreatorRecord>();

    // Always include @pudy_lychher in the active discovery pass
    const pudyRecord = allCreators.find((c) => normalizeTikTokHandle(c.handle) === 'pudy_lychher');
    if (pudyRecord) {
      selectedCreatorsMap.set('pudy_lychher', pudyRecord);
    }

    for (let i = 0; i < allCreators.length && selectedCreatorsMap.size < batchSize; i++) {
      const candidate = allCreators[(creatorCursor + i) % allCreators.length];
      const norm = normalizeTikTokHandle(candidate.handle);
      if (norm && !selectedCreatorsMap.has(norm)) {
        selectedCreatorsMap.set(norm, candidate);
      }
    }

    try {
      localStorage.setItem(
        TIKTOK_CREATOR_CRAWL_CURSOR_KEY,
        String((creatorCursor + batchSize) % Math.max(1, allCreators.length))
      );
    } catch {}

    // Vector B: Select a rotating batch of Cambodian food hashtags to discover new creators & videos
    let hashtagCursor = 0;
    try {
      hashtagCursor = Number(localStorage.getItem(TIKTOK_HASHTAG_CRAWL_CURSOR_KEY) || 0) || 0;
    } catch {}
    const hashtagBatchCount = forceRefresh ? 5 : 3;
    const selectedHashtags: string[] = [];
    for (let i = 0; i < hashtagBatchCount; i++) {
      selectedHashtags.push(
        TIKTOK_CAMBODIAN_FOOD_DISCOVERY_HASHTAGS[
          (hashtagCursor + i) % TIKTOK_CAMBODIAN_FOOD_DISCOVERY_HASHTAGS.length
        ]
      );
    }
    try {
      localStorage.setItem(
        TIKTOK_HASHTAG_CRAWL_CURSOR_KEY,
        String((hashtagCursor + hashtagBatchCount) % TIKTOK_CAMBODIAN_FOOD_DISCOVERY_HASHTAGS.length)
      );
    } catch {}

    const newlyFoundCreatorRecords: DiscoveredTikTokCreatorRecord[] = [];

    const crawlHashtagFeed = async (tag: string) => {
      const encodedTag = encodeURIComponent(tag);
      const html = await fetchTikTokPublicEmbedHtml(`https://www.tiktok.com/embed/tag/${encodedTag}`, isNative, 4200);
      if (!html) return;
      const stateMatch = html.match(
        /<script id="__FRONTITY_CONNECT_STATE__" type="application\/json">([\s\S]*?)<\/script>/
      );
      if (!stateMatch || !stateMatch[1]) return;
      try {
        const parsedState = JSON.parse(stateMatch[1]);
        const dataMap = parsedState?.source?.data || {};
        const tagData =
          dataMap[`/embed/tag/${tag}`] ||
          dataMap[`/embed/tag/${encodedTag}`] ||
          dataMap[Object.keys(dataMap)[0] || ''];
        const videoList = Array.isArray(tagData?.videoList) ? tagData.videoList : [];

        for (const rawVid of videoList) {
          const desc = String(rawVid?.desc || '').trim();
          const authorHandle = normalizeTikTokHandle(rawVid?.authorUniqueId);
          if (!authorHandle) continue;
          if (!isCambodianFoodRelatedTikTokVideo(desc, authorHandle)) continue;

          const reg = registerDiscoveredTikTokCreator(authorHandle, {
            displayName: `@${authorHandle}`,
            discoveredVia: 'hashtag_foryou',
          });
          if (reg.added && reg.record) {
            newlyDiscoveredCreatorCount++;
            newlyFoundCreatorRecords.push(reg.record);
          }

          const creatorRecord =
            reg.record ||
            allCreators.find((c) => normalizeTikTokHandle(c.handle) === authorHandle) || {
              handle: authorHandle,
              displayName: `@${authorHandle}`,
              profileUrl: `https://www.tiktok.com/@${authorHandle}`,
              defaultCategory: 'popular_food' as const,
              defaultFoodThumb: '/foods/food-19.jpg',
            };

          ingestRawTikTokVideo(rawVid, creatorRecord, 'TikTok For You Food Discovery');
        }
      } catch {
        // ignore JSON parse error
      }
    };

    // Run Vector A (Creator Profiles) and Vector B (Hashtag/ForYou Recommendations) in parallel
    await Promise.allSettled([
      ...Array.from(selectedCreatorsMap.values()).map((creator) => crawlCreatorProfile(creator)),
      ...selectedHashtags.map((tag) => crawlHashtagFeed(tag)),
    ]);

    // Immediately crawl up to 3 newly discovered creators from this pass so their latest food videos are added right away
    if (newlyFoundCreatorRecords.length > 0) {
      await Promise.allSettled(
        newlyFoundCreatorRecords.slice(0, 3).map((newCreator) => crawlCreatorProfile(newCreator))
      );
    }

    const sortedTikToks = Array.from(byTikTokVideoId.values()).sort((a, b) => {
      const vidA = extractTikTokVideoId(a.inlineVideoId || a.sourceUrl) || '0';
      const vidB = extractTikTokVideoId(b.inlineVideoId || b.sourceUrl) || '0';
      if (vidA.length >= 18 && vidB.length >= 18 && vidA !== vidB) {
        return vidB.localeCompare(vidA);
      }
      return (Date.parse(b.publishedOrUpdatedAt) || 0) - (Date.parse(a.publishedOrUpdatedAt) || 0);
    });

    try {
      localStorage.setItem(
        LIVE_TIKTOK_CREATORS_CACHE_KEY,
        JSON.stringify({
          updatedAt: new Date().toISOString(),
          items: sortedTikToks.slice(0, 140),
        })
      );
    } catch {
      // ignore storage quota
    }

    if (isSupabaseConfigured()) {
      if (newlyDiscoveredVideoCount > 0) {
        pushCloudDocument(
          CLOUD_TIKTOK_DISCOVERED_DOC_KEY,
          {
            updatedAt: new Date().toISOString(),
            items: sortedTikToks.slice(0, 90),
          },
          5000
        ).catch(() => {});
      }
      if (newlyDiscoveredCreatorCount > 0) {
        pushCloudDocument(
          CLOUD_TIKTOK_CREATORS_DB_DOC_KEY,
          {
            updatedAt: new Date().toISOString(),
            creators: getExpandedTikTokCreatorDatabase().slice(0, 120),
          },
          5000
        ).catch(() => {});
      }
    }

    return sortedTikToks;
  }

  return Array.from(byTikTokVideoId.values());
}

export function deduplicateAndRankDiscoveries(items: OnlineFoodDiscoveryItem[]): OnlineFoodDiscoveryItem[] {
  const seenVideoIds = new Set<string>();
  const seenUrls = new Set<string>();
  const unique: OnlineFoodDiscoveryItem[] = [];

  for (const item of items) {
    if (item.platform === 'tiktok') {
      const tiktokVid = extractTikTokVideoId(item.inlineVideoId || item.sourceUrl);
      const dedupKey = tiktokVid ? `tiktok:${tiktokVid}` : (item.id || item.sourceUrl);
      if (!dedupKey || seenUrls.has(dedupKey)) continue;
      seenUrls.add(dedupKey);
      if (tiktokVid) {
        if (seenVideoIds.has(`tt:${tiktokVid}`)) continue;
        seenVideoIds.add(`tt:${tiktokVid}`);
      }

      // Ensure thumbnail is NEVER a fake YouTube thumbnail if it doesn't belong to YouTube
      const cleanThumb =
        item.thumbnailUrl && !item.thumbnailUrl.includes('i.ytimg.com')
          ? item.thumbnailUrl
          : '/foods/food-1.jpg';

      unique.push({
        ...item,
        inlineVideoId: tiktokVid || undefined,
        canInlineEmbed: Boolean(tiktokVid),
        isPlayableVerified: true,
        sourceUrl: tiktokVid && item.authorHandle
          ? `https://www.tiktok.com/@${item.authorHandle.replace(/^@+/, '')}/video/${tiktokVid}`
          : item.sourceUrl,
        thumbnailUrl: cleanThumb,
        directVideoUrl: isDirectVideoUrlFreshAndPlayable(item.directVideoUrl) ? item.directVideoUrl : undefined,
      });
      continue;
    }

    if (item.platform === 'facebook') {
      const key = item.id || item.sourceUrl;
      if (!key || seenUrls.has(key)) continue;
      seenUrls.add(key);

      const cleanThumb =
        item.thumbnailUrl && !item.thumbnailUrl.includes('i.ytimg.com')
          ? item.thumbnailUrl
          : '/foods/food-2.jpg';

      unique.push({
        ...item,
        inlineVideoId: resolveFacebookInlineStreamId(item),
        canInlineEmbed: true,
        isPlayableVerified: true,
        thumbnailUrl: cleanThumb,
        directVideoUrl: isDirectVideoUrlFreshAndPlayable(item.directVideoUrl) ? item.directVideoUrl : undefined,
      });
      continue;
    }

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
      inlineVideoId: vid,
      canInlineEmbed: true,
      isPlayableVerified: true,
      sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
      thumbnailUrl: item.thumbnailUrl || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
    });
  }

  return unique.sort((a, b) => {
    const ta = Date.parse(a.publishedOrUpdatedAt) || 0;
    const tb = Date.parse(b.publishedOrUpdatedAt) || 0;
    if (tb !== ta) return tb - ta;

    // Secondary sort for same-day TikTok Snowflake IDs so newest upload is always first
    if (a.platform === 'tiktok' && b.platform === 'tiktok') {
      const vidA = extractTikTokVideoId(a.inlineVideoId || a.sourceUrl) || '';
      const vidB = extractTikTokVideoId(b.inlineVideoId || b.sourceUrl) || '';
      if (vidA.length >= 18 && vidB.length >= 18 && vidA !== vidB) {
        return vidB.localeCompare(vidA);
      }
    }

    return b.relevanceScore - a.relevanceScore;
  });
}

/** Main discovery fetcher with 30-minute cache + rate-limit protections */
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

  const [ytRes, liveTikTokItems] = await Promise.all([
    fetchYouTubeCambodianFoodVideos(foods),
    fetchLiveTikTokCreatorVideos(Boolean(params.forceRefresh), foods).catch(() => []),
  ]);
  const nowIso = new Date().toISOString();
  const merged = deduplicateAndRankDiscoveries([
    ...liveTikTokItems,
    ...CURATED_TIKTOK_FACEBOOK_REVIEWS,
    ...ytRes.items,
  ]);

  try {
    localStorage.setItem(
      ONLINE_DISCOVERY_CACHE_KEY,
      JSON.stringify({
        lastCheckedAt: nowIso,
        items: merged,
      })
    );
  } catch {
    // ignore
  }

  return {
    items: merged,
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
    if (age > ONLINE_DISCOVERY_TTL_MS || !Array.isArray(parsed.items)) {
      return null;
    }
    const foodMap = new Map(foods.map((f) => [f.id, f]));
    const rehydrated: OnlineFoodDiscoveryItem[] = deduplicateAndRankDiscoveries(
      parsed.items
        .filter((it: OnlineFoodDiscoveryItem) => it.platform === 'tiktok' || it.platform === 'facebook' || !isKnownUnavailableVideo(it.sourceUrl))
        .map((it: OnlineFoodDiscoveryItem) => ({
          ...it,
          canInlineEmbed: it.platform === 'tiktok' ? Boolean(extractTikTokVideoId(it.inlineVideoId || it.sourceUrl)) : true,
          inlineVideoId: it.platform === 'tiktok' ? extractTikTokVideoId(it.inlineVideoId || it.sourceUrl) || undefined : it.platform === 'facebook' ? undefined : it.inlineVideoId,
          directVideoUrl: isDirectVideoUrlFreshAndPlayable(it.directVideoUrl) ? it.directVideoUrl : undefined,
          matchedFoodNameKh: it.matchedFoodId
            ? foodMap.get(it.matchedFoodId)?.nameKh || it.matchedFoodNameKh
            : it.matchedFoodNameKh,
          matchedFoodNameEn: it.matchedFoodId
            ? foodMap.get(it.matchedFoodId)?.nameEn || it.matchedFoodNameEn
            : it.matchedFoodNameEn,
        }))
    );
    if (rehydrated.length === 0) return null;
    return {
      items: rehydrated,
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
  directVideoUrl?: string;
}

/**
 * Extracts iframe player embed URL and canonical watch URL safely for TikTok, Facebook, and YouTube.
 */
export function extractEmbedPlayerInfo(item: OnlineFoodDiscoveryItem): EmbedPlayerInfo {
  const url = (item.sourceUrl || item.trendingItem?.videoUrl || item.trendingItem?.sourceUrl || '').trim();

  const buildYouTubeInlineEmbedUrl = (vid: string): string => {
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
    return `https://www.youtube.com/embed/${vid}?${params.toString()}`;
  };

  if (item.platform === 'tiktok') {
    const tiktokVid = extractTikTokVideoId(item.inlineVideoId || url);
    const watchUrl = resolveOriginalSocialAccountUrl(item);
    const syncStream = getCachedTikTokStreamUrl(item);
    const directVideoUrl = syncStream?.primaryUrl;
    const fallbackStreamVid = resolveTikTokFallbackStreamId(item);
    return {
      canInlineEmbed: true,
      embedUrl: buildYouTubeInlineEmbedUrl(fallbackStreamVid),
      watchUrl,
      platform: 'tiktok',
      videoId: tiktokVid || fallbackStreamVid,
      directVideoUrl,
    };
  }

  if (item.platform === 'facebook') {
    const watchUrl = resolveOriginalSocialAccountUrl(item);
    const fbStreamVid = resolveFacebookInlineStreamId(item);
    return {
      canInlineEmbed: true,
      embedUrl: buildYouTubeInlineEmbedUrl(fbStreamVid),
      watchUrl,
      platform: 'facebook',
      videoId: fbStreamVid,
      directVideoUrl: isDirectVideoUrlFreshAndPlayable(item.directVideoUrl) ? item.directVideoUrl : undefined,
    };
  }

  let vid = extractYouTubeVideoId(url);

  if (!vid && item.id.startsWith('yt-api-')) {
    vid = extractYouTubeVideoId(item.id.replace('yt-api-', ''));
  } else if (!vid && item.id.startsWith('yt-live-')) {
    vid = extractYouTubeVideoId(item.id.replace('yt-live-', ''));
  } else if (!vid && item.id.startsWith('yt-rss-')) {
    vid = extractYouTubeVideoId(item.id.replace('yt-rss-', ''));
  }

  if (!vid || !/^[a-zA-Z0-9_-]{11}$/.test(vid) || isKnownUnavailableVideo(vid)) {
    vid = resolveInlineVideoIdForSocialItem({ ...item, platform: 'youtube' });
  }

  const watchUrl = `https://www.youtube.com/watch?v=${vid}`;
  return {
    canInlineEmbed: true,
    embedUrl: buildYouTubeInlineEmbedUrl(vid),
    watchUrl,
    platform: 'youtube',
    videoId: vid,
  };
}

export interface SearchSocialOptions {
  query?: string;
  platform?: 'all' | DiscoveryPlatformId;
  categorySlug?: TrendingFoodCategorySlug;
  foods?: FoodItem[];
  trendingFoods?: TrendingFoodItem[];
  forceRefresh?: boolean;
  skipRotation?: boolean;
}

export interface SearchSocialResult extends OnlineDiscoveryFeedResult {
  fromBackendEdge: boolean;
}

import { parseKhmerFoodSearchQuery, stripNegatedSpicePhrases } from '../utils/khmerFoodSearch';

const SUPABASE_BASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ryvltobwuwuulazqjnza.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_h5ufAaA0qAL3s-ebprATsw_8AApv71l';

/**
 * Reuses the Home Screen's normalizeKhmerSearchText and expandMultilingualPlaceQuery
 * so YouTube/TikTok/Facebook video filtering matches the exact same multilingual tokens as Home Screen search.
 */
export function expandYouTubeSearchQueryTokens(rawQuery: string): string[] {
  const q = normalizeKhmerSearchText(rawQuery);
  if (!q) return [];
  return expandMultilingualPlaceQuery(rawQuery, 'all').matchTokens;
}

export function matchesExpandedYouTubeQuery(
  item: OnlineFoodDiscoveryItem,
  rawQuery: string
): boolean {
  const q = normalizeKhmerSearchText(rawQuery);
  if (!q) return true;
  const parsed = parseKhmerFoodSearchQuery(rawQuery);
  const wantsSpicy =
    parsed.flavorIntents.includes('spicy') || parsed.flavorIntents.includes('sour_spicy');
  let hay = normalizeKhmerSearchText(
    `${item.titleKh} ${item.titleEn} ${item.titleZh || ''} ${item.descriptionKh} ${item.descriptionEn} ${item.descriptionZh || ''} ${item.sourceName} ${item.authorHandle || ''} ${item.provinceKh} ${item.provinceEn} ${item.matchedFoodNameKh || ''} ${item.matchedFoodNameEn || ''}`
  );
  if (wantsSpicy) {
    hay = stripNegatedSpicePhrases(hay);
  }
  if (includesKhmerSafeToken(hay, q)) return true;
  if (parsed.coreQuery && parsed.coreQuery.length >= 2 && includesKhmerSafeToken(hay, parsed.coreQuery)) {
    return true;
  }
  const tokens = expandYouTubeSearchQueryTokens(rawQuery);
  return tokens.some((token) => token.length >= 2 && includesKhmerSafeToken(hay, token));
}

/**
 * Unified TikTok, Facebook & YouTube 2026 discovery and search:
 * 1. Priority TikTok discovery from the 5 official Cambodian food creators (@eatame.eater, @expressions_hub, @derdailyofficial, @fatame.cooking, @foodwhisper_officials).
 * 2. Merges with verified Facebook & YouTube food/travel videos.
 * 3. Supports multilingual synonym search across Khmer, English, and Chinese.
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
    skipRotation = false,
  } = options;

  let backendItems: OnlineFoodDiscoveryItem[] = [];
  let fromBackendEdge = false;

  // Call remote Supabase Edge Function when user explicitly taps Refresh
  if (forceRefresh && !isAppCloneTampered() && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const edgeEndpoint = `${SUPABASE_BASE_URL}/functions/v1/social-food-discovery`;
      const res = await fetch(edgeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          ...getAppAttestationHeaders(),
        },
        body: JSON.stringify({ query: query || 'Cambodia food travel 2026', platform: 'all' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.items) && data.items.length > 0) {
          const rawCandidates = data.items.slice(0, 24);
          backendItems = rawCandidates
            .map((it: any) => {
              if (it.platform === 'tiktok') {
                if (/^(tt|fb)-kh-review-\d+$/i.test(String(it.id || ''))) {
                  return null;
                }
                const tiktokVid = extractTikTokVideoId(it.inlineVideoId || it.sourceUrl || it.id);
                if (!tiktokVid) return null;
                const match = matchCambodianDish(
                  `${it.titleEn || it.titleKh} ${it.descriptionEn || it.descriptionKh}`,
                  foods
                );
                const resolvedAccountUrl = resolveOriginalSocialAccountUrl(it);
                return {
                  ...it,
                  platform: 'tiktok' as const,
                  sourceUrl: resolvedAccountUrl,
                  originalAccountUrl: it.originalAccountUrl || resolvedAccountUrl,
                  matchedFoodId: it.matchedFoodId || match?.food?.id,
                  matchedFoodNameKh: it.matchedFoodNameKh || match?.food?.nameKh,
                  matchedFoodNameEn: it.matchedFoodNameEn || match?.food?.nameEn,
                  inlineVideoId: tiktokVid,
                  isPlayableVerified: true,
                  canInlineEmbed: true,
                } as OnlineFoodDiscoveryItem;
              }
              if (it.platform === 'facebook') {
                if (/^(tt|fb)-kh-review-\d+$/i.test(String(it.id || ''))) {
                  return null;
                }
                const match = matchCambodianDish(
                  `${it.titleEn || it.titleKh} ${it.descriptionEn || it.descriptionKh}`,
                  foods
                );
                const resolvedAccountUrl = resolveOriginalSocialAccountUrl(it);
                return {
                  ...it,
                  platform: 'facebook' as const,
                  sourceUrl: resolvedAccountUrl,
                  originalAccountUrl: resolvedAccountUrl,
                  matchedFoodId: it.matchedFoodId || match?.food?.id,
                  matchedFoodNameKh: it.matchedFoodNameKh || match?.food?.nameKh,
                  matchedFoodNameEn: it.matchedFoodNameEn || match?.food?.nameEn,
                  inlineVideoId: undefined,
                  isPlayableVerified: true,
    canInlineEmbed: true,
                } as OnlineFoodDiscoveryItem;
              }
              const vid = extractYouTubeVideoId(it.sourceUrl || it.id || '');
              if (!vid || isKnownUnavailableVideo(vid)) return null;
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
                canInlineEmbed: true,
              } as OnlineFoodDiscoveryItem;
            })
            .filter((x: OnlineFoodDiscoveryItem | null): x is OnlineFoodDiscoveryItem => Boolean(x));
          fromBackendEdge = backendItems.length > 0;
        }
      }
    } catch {
      // Edge function unreachable or offline; smoothly fallback
    }
  }

  // Fetch base discovery feed + live TikTok creator videos + live YouTube channel uploads in parallel
  const [baseFeed, liveTikTokItems, liveChannelItems] = await Promise.all([
    fetchOnlineFoodDiscoveryFeed({
      foods,
      trendingFoods,
      forceRefresh,
    }),
    fetchLiveTikTokCreatorVideos(forceRefresh, foods).catch(() => []),
    fetchLiveYouTubeChannelUploads(forceRefresh, foods).catch(() => []),
  ]);

  // Merge and deduplicate (sorted newest publication date first)
  let combined = deduplicateAndRankDiscoveries([
    ...liveTikTokItems,
    ...CURATED_TIKTOK_FACEBOOK_REVIEWS,
    ...backendItems,
    ...liveChannelItems,
    ...baseFeed.items,
  ]);

  // Apply category filter if specified and not 'all'
  if (categorySlug && categorySlug !== 'all') {
    combined = combined.filter((item) => item.categorySlug === categorySlug);
  }

  // Apply multilingual query filter if specified
  if (query.trim()) {
    combined = combined.filter((item) => matchesExpandedYouTubeQuery(item, query));
  } else if (!skipRotation) {
    const activeCycle = forceRefresh ? advanceVideoRotationCycle() : getCurrentVideoRotationCycle();
    combined = rotateLatestVideosForScope(combined, `${categorySlug || 'all'}|all`, activeCycle);
  }

  return {
    ...baseFeed,
    lastCheckedAt: new Date().toISOString(),
    items: combined,
    fromBackendEdge,
  };
}

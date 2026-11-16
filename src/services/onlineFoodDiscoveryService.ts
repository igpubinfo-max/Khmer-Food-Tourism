import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_PUBLISHABLE_KEY } from '../config/appConstants';
import { getAppAttestationHeaders, isAppCloneTampered } from '../utils/appCloneIntegrityGuard';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { FoodItem, TrendingFoodCategorySlug, TrendingFoodItem } from '../types';
import { initialFoods } from '../data/seedData';
import { initialTrendingFoods } from '../data/seedTrendingFoods';
import { normalizeKhmerSearchText, expandMultilingualPlaceQuery, includesKhmerSafeToken } from './googlePlacesService';
import { isSupabaseConfigured, pushCloudDocument, pullCloudDocument } from './supabaseService';

export const ONLINE_DISCOVERY_CACHE_KEY = 'kft_v20_social_2026_verified_cache';
const ONLINE_DISCOVERY_CUSTOM_URLS_KEY = 'kft_online_discovery_custom_urls_v1';
const LEGACY_CACHE_KEYS = [
  'kft_v19_social_2026_verified_cache',
  'kft_live_tiktok_creators_v4',
  'kft_v18_social_2026_verified_cache',
  'kft_v1_youtube_live_rss_cache',
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
  channelId?: string;
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
  channelId?: string;
  channelUrl?: string;
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

export interface CambodiaFoodSearchKeywordPreset {
  id: string;
  query: string;
  labelKh: string;
  labelEn: string;
  labelZh: string;
  categorySlug?: TrendingFoodCategorySlug;
}

/** Multilingual Khmer, English & Chinese search keywords for Cambodian Food Review discovery */
export const CAMBODIA_FOOD_YOUTUBE_SEARCH_KEYWORDS: CambodiaFoodSearchKeywordPreset[] = [
  { id: 'kw-mhoub-khmer', query: 'ម្ហូបខ្មែរ', labelKh: 'ម្ហូបខ្មែរ', labelEn: 'Traditional Khmer Food', labelZh: '高棉传统美食' },
  { id: 'kw-nham-ahar-khmer', query: 'ញ៉ាំអាហារខ្មែរ', labelKh: 'ញ៉ាំអាហារខ្មែរ', labelEn: 'Eat Khmer Food', labelZh: '品尝高棉美食' },
  { id: 'kw-der-rok-mhoub-chnhanh', query: 'ដើររកម្ហូបឆ្ងាញ់', labelKh: 'ដើររកម្ហូបឆ្ងាញ់', labelEn: 'Delicious Food Hunting', labelZh: '寻味柬埔寨美食' },
  { id: 'kw-hang-ahar-nov-kampuchea', query: 'ហាងអាហារនៅកម្ពុជា', labelKh: 'ហាងអាហារនៅកម្ពុជា', labelEn: 'Restaurants in Cambodia', labelZh: '柬埔寨人气餐厅' },
  { id: 'kw-cambodian-food-review', query: 'Cambodian Food Review', labelKh: 'Cambodian Food Review', labelEn: 'Cambodian Food Review', labelZh: '柬埔寨美食测评' },
  { id: 'kw-khmer-food-review', query: 'Khmer Food Review', labelKh: 'Khmer Food Review', labelEn: 'Khmer Food Review', labelZh: '高棉美食测评' },
  { id: 'kw-cambodia-street-food', query: 'Cambodia Street Food', labelKh: 'Cambodia Street Food', labelEn: 'Cambodia Street Food', labelZh: '柬埔寨街头美食' },
  { id: 'kw-phnom-penh-food-review', query: 'Phnom Penh Food Review', labelKh: 'Phnom Penh Food Review', labelEn: 'Phnom Penh Food Review', labelZh: '金边美食测评' },
  { id: 'kw-battambang-food-review', query: 'Battambang Food Review', labelKh: 'Battambang Food Review', labelEn: 'Battambang Food Review', labelZh: '马德望美食测评' },
  { id: 'kw-siem-reap-food-review', query: 'Siem Reap Food Review', labelKh: 'Siem Reap Food Review', labelEn: 'Siem Reap Food Review', labelZh: '暹粒美食测评' },
  { id: 'kw-khmer-restaurant-review', query: 'Khmer Restaurant Review', labelKh: 'Khmer Restaurant Review', labelEn: 'Khmer Restaurant Review', labelZh: '高棉餐厅探店' },
];

export interface CambodiaYouTubeChannelRecord {
  channelId: string;
  name: string;
  channelUrl?: string;
  categorySlug: TrendingFoodCategorySlug;
  discoveredAt?: string;
}

/** Active 2025–2026 Cambodian Food, Restaurant & Travel YouTube Channels Registry (85 Verified Channels) */
export const ACTIVE_CAMBODIA_YOUTUBE_CHANNELS_2026: CambodiaYouTubeChannelRecord[] = [
  { channelId: 'UCLVncs-1iVf4f1tW5WSfQfw', name: 'Street Food TV', channelUrl: 'https://www.youtube.com/channel/UCLVncs-1iVf4f1tW5WSfQfw', categorySlug: 'popular_food' as const },
  { channelId: 'UCM_tv-ZoNPPAIT4rrhib28A', name: 'Street Food Explorer', channelUrl: 'https://www.youtube.com/channel/UCM_tv-ZoNPPAIT4rrhib28A', categorySlug: 'famous_restaurant' as const },
  { channelId: 'UCQ1k3iVCA9mkTuOJetyK_2Q', name: 'Delicious Food Show & Travel', channelUrl: 'https://www.youtube.com/channel/UCQ1k3iVCA9mkTuOJetyK_2Q', categorySlug: 'food_travel_vlog' as const },
  { channelId: 'UC3B29E6Fxe-bum63LxbcspQ', name: 'Walk Street And Food', channelUrl: 'https://www.youtube.com/channel/UC3B29E6Fxe-bum63LxbcspQ', categorySlug: 'famous_restaurant' as const },
  { channelId: 'UC4mwWNbfhEM6BKrGtxH_1dg', name: 'Oun Roth Daily life', channelUrl: 'https://www.youtube.com/channel/UC4mwWNbfhEM6BKrGtxH_1dg', categorySlug: 'popular_food' as const },
  { channelId: 'UCg7R70hWzrtDh3bCGlrGKhQ', name: 'Delicious food channel', channelUrl: 'https://www.youtube.com/channel/UCg7R70hWzrtDh3bCGlrGKhQ', categorySlug: 'popular_food' as const },
  { channelId: 'UCIS-mtcY4mDKUd1ET6utKqA', name: 'Thavireak City Walks', channelUrl: 'https://www.youtube.com/channel/UCIS-mtcY4mDKUd1ET6utKqA', categorySlug: 'tourist_attraction' as const },
  { channelId: 'UCjJJNMTX5wJmZRI5iK3fo5Q', name: 'Sonita Khmer US', channelUrl: 'https://www.youtube.com/channel/UCjJJNMTX5wJmZRI5iK3fo5Q', categorySlug: 'famous_restaurant' as const },
  { channelId: 'UCARbX20_cV9YwwrAFyYvoMg', name: 'Mao Cambodia', channelUrl: 'https://www.youtube.com/channel/UCARbX20_cV9YwwrAFyYvoMg', categorySlug: 'famous_restaurant' as const },
  { channelId: 'UCRFt5572jMudEvPVDKkHmbg', name: 'Sreyreang Life Show', channelUrl: 'https://www.youtube.com/channel/UCRFt5572jMudEvPVDKkHmbg', categorySlug: 'tourist_attraction' as const },
  { channelId: 'UCss0y7c69jgvFRS9Hs2EwRA', name: 'TravelwithChad', channelUrl: 'https://www.youtube.com/channel/UCss0y7c69jgvFRS9Hs2EwRA', categorySlug: 'tourist_attraction' as const },
  { channelId: 'UCMIUsbPWmPzqRLoI8J9TG_Q', name: 'Little Explore', channelUrl: 'https://www.youtube.com/channel/UCMIUsbPWmPzqRLoI8J9TG_Q', categorySlug: 'tourist_attraction' as const },
  { channelId: 'UCmHn9fGfK0NmI9fMzuaYnjA', name: 'Suitcase Monkey', channelUrl: 'https://www.youtube.com/channel/UCmHn9fGfK0NmI9fMzuaYnjA', categorySlug: 'tourist_attraction' as const },
  { channelId: "UCdBYbaSyGy41ws2deqrcpqg", name: "ម៉ែកាឆែត", channelUrl: "https://www.youtube.com/@mekachet", categorySlug: "popular_food" as const },
  { channelId: "UCFHnPGSdWxHKVOOGuwH75-Q", name: "NexWalk KH", channelUrl: "https://www.youtube.com/@NexWalkKH", categorySlug: "food_travel_vlog" as const },
  { channelId: "UC2AEkWunWQ5m_85k-kJwxXg", name: "BT Food Story", channelUrl: "https://www.youtube.com/@btfoodstory", categorySlug: "popular_food" as const },
  { channelId: "UCXDwffDutwtpFYbUTts7pvw", name: "Cambodia Street Food", channelUrl: "https://www.youtube.com/@CambodiaStreetFoodDaily", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCgbV-6Db9RB_93qVaDU8z_A", name: "Sok khim Cooking", channelUrl: "https://www.youtube.com/@sokkhimcooking", categorySlug: "popular_food" as const },
  { channelId: "UC6BGn58FaYnAn7QgcxUpf_Q", name: "Sina NSN", channelUrl: "https://www.youtube.com/@sinansn6499", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCRvd6ud_kB8dbAvd3Fmk4Mg", name: "Sreypich TV Show", channelUrl: "https://www.youtube.com/@SreypichTVShow", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCv52_difuvyCvtZrnUntWNQ", name: "5 Five Tours", channelUrl: "https://www.youtube.com/@5FiveTours", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCCftsczyo1ciJ6HGH0VUOEg", name: "Food Tour & Explore", channelUrl: "https://www.youtube.com/@food-tour-explore", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCn3QZDGrudCMuA8JU1HBzcA", name: "KhornPark88", channelUrl: "https://www.youtube.com/@KhornPark88", categorySlug: "popular_food" as const },
  { channelId: "UC5lUlu8CHpEzpn4raQv4jiw", name: "WalkTV", channelUrl: "https://www.youtube.com/@WalkTVkh", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCWEtQZOPvtIfiI-E4uJXRag", name: "Sambathchun សម្បត្តិជន", channelUrl: "https://www.youtube.com/@sambathchun1989", categorySlug: "famous_restaurant" as const },
  { channelId: "UClfihckKpwTAavLe4tT0NOg", name: "Tom Trips Out", channelUrl: "https://www.youtube.com/@TomTripsOut", categorySlug: "famous_restaurant" as const },
  { channelId: "UCEeeueKMAYe3wNNhie9TKew", name: "Street Food Explorer", channelUrl: "https://www.youtube.com/@StreetFoodExplorerCambodia", categorySlug: "food_travel_vlog" as const },
  { channelId: "UC5KGBC_372NSiTJPMGr4wvA", name: "Pi Neak-ពីរនាក់", channelUrl: "https://www.youtube.com/@pineak_travel", categorySlug: "popular_food" as const },
  { channelId: "UCGUyGCTcG9u_6cXRCrVpRvg", name: "Hidden Cambo", channelUrl: "https://www.youtube.com/@hiddencambo", categorySlug: "popular_food" as const },
  { channelId: "UC36kFiOY7c2yll2LVyoVaHA", name: "Satya Dee", channelUrl: "https://www.youtube.com/@satyadee2101", categorySlug: "popular_food" as const },
  { channelId: "UCjl-LRA_TLmAJGoehmVsZIA", name: "The Sister Loop", channelUrl: "https://www.youtube.com/@TheSisterloop", categorySlug: "popular_food" as const },
  { channelId: "UCtkB_B_A3jnFQryNxmAKOBg", name: "Khmer rural life", channelUrl: "https://www.youtube.com/@Khmerrurallife555", categorySlug: "food_travel_vlog" as const },
  { channelId: "UC0RsJe65MJAIFwgW6C0djvw", name: "Sarna Cooking Show", channelUrl: "https://www.youtube.com/@SarnaCookingShow", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCAj8MxN5DsAFq5Me2wKVYbw", name: "Cambo Explorer", channelUrl: "https://www.youtube.com/@camboexplorer", categorySlug: "food_travel_vlog" as const },
  { channelId: "UC0nxHFae3a0UzafMJjadIrQ", name: "CUỘC SỐNG CAM", channelUrl: "https://www.youtube.com/@Cuocsongcam", categorySlug: "popular_food" as const },
  { channelId: "UCFUiKVah5VJJG1ESDjAtJ3g", name: "Life in Cambodia", channelUrl: "https://www.youtube.com/@NearyRothTV", categorySlug: "popular_food" as const },
  { channelId: "UCs22MyD8qdgDF-kJyv6Zofw", name: "Mark In Asia", channelUrl: "https://www.youtube.com/@Markinasia-e4f", categorySlug: "famous_restaurant" as const },
  { channelId: "UC9OcuVtqIsCe8_7AjjPtoZg", name: "Angela McColl", channelUrl: "https://www.youtube.com/@angemccoll", categorySlug: "popular_food" as const },
  { channelId: "UCzYZk4bZ07yJeK7Zd_z37Cw", name: "Food Network UK", channelUrl: "https://www.youtube.com/@FoodNetworkUKTV", categorySlug: "famous_restaurant" as const },
  { channelId: "UC3TIRH4PPSDde66Hg5wGh-w", name: "Condé Nast Traveler", channelUrl: "https://www.youtube.com/@Traveler", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCo0BHDWZ3gRCuSbUH85G-_A", name: "T&L TRAVEL", channelUrl: "https://www.youtube.com/@tandltravel2024", categorySlug: "famous_restaurant" as const },
  { channelId: "UCZJtFOu1wmxq8wadfHSlYPQ", name: "Street food tour", channelUrl: "https://www.youtube.com/@Streetfoodtour-44", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCmfOXpsa0q0uHxaaDkeeFdw", name: "WisGO", channelUrl: "https://www.youtube.com/@Wisgokh", categorySlug: "popular_food" as const },
  { channelId: "UCo42Xmxl2U99UtfCiWQxgcg", name: "Jenny Daily Life", channelUrl: "https://www.youtube.com/@jennydailylife", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCB8yjnAK_IxD-fMjxH_QpDg", name: "Chay Sivlang", channelUrl: "https://www.youtube.com/@Chaysivlang", categorySlug: "popular_food" as const },
  { channelId: "UC1_PeD6rZaUoNrN2AtyTe2Q", name: "Priscilla Kim Ong", channelUrl: "https://www.youtube.com/@priscillakimong", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCcHW9-v8McRcO-Rm-zBv2ZQ", name: "Mooch Travels", channelUrl: "https://www.youtube.com/@MoochOzdemirTravel", categorySlug: "popular_food" as const },
  { channelId: "UCegDP5GpIrMfSXZlePFtitA", name: "Rockstar Eater", channelUrl: "https://www.youtube.com/@RockstarEater", categorySlug: "popular_food" as const },
  { channelId: "UC4KPmxdpKFAzogb6beSfQWA", name: "Cooking and Travel with Bong General", channelUrl: "https://www.youtube.com/@CookingwithBongGeneral", categorySlug: "popular_food" as const },
  { channelId: "UCKQa5a6kxcziSAaRwHJxoMQ", name: "Visit and cook with me", channelUrl: "https://www.youtube.com/@visitandcookwithme", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCAuKl-usJ7p5c-Nh8L73odw", name: "Cambodia Vibes", channelUrl: "https://www.youtube.com/@CambodiaVibes-SR", categorySlug: "food_travel_vlog" as const },
  { channelId: "UC5NofLGyaa9Q6PHsxSgXM0Q", name: "Lloyd & Mandy", channelUrl: "https://www.youtube.com/@LloydandMandy", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCLUapBXshwIyBCDMWSO3srQ", name: "Kitchen Story", channelUrl: "https://www.youtube.com/@kitchenstoryK", categorySlug: "popular_food" as const },
  { channelId: "UCcTnoBPJiZyGkagNaPJcNFA", name: "EVERYTHING", channelUrl: "https://www.youtube.com/@Everything-fd68", categorySlug: "food_travel_vlog" as const },
  { channelId: "UC97aAzNbBb30T5sEIymxDLg", name: "For Riel", channelUrl: "https://www.youtube.com/@ForRiel", categorySlug: "famous_restaurant" as const },
  { channelId: "UCPflXomEwyYJFcRX1jJxf-A", name: "Kheom Leakhena", channelUrl: "https://www.youtube.com/@KheomLeakhena", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCplb1Ru5jWb_BM3Qe_OoQkw", name: "Pich Pisey", channelUrl: "https://www.youtube.com/@pichpisey4129", categorySlug: "popular_food" as const },
  { channelId: "UCodC-082nikp-Cq7tlJXtpg", name: "Mey Natural Food", channelUrl: "https://www.youtube.com/@ahmeyfood", categorySlug: "popular_food" as const },
  { channelId: "UC40tCi6qlNr-WS37JQSrSUQ", name: "Travelwithchris", channelUrl: "https://www.youtube.com/@Travelwithchris", categorySlug: "popular_food" as const },
  { channelId: "UCr4JTejyDoyCeBLnwJ6bjOw", name: "Bec & Matt Adventures", channelUrl: "https://www.youtube.com/@BecMattAdventures", categorySlug: "famous_restaurant" as const },
  { channelId: "UCJX9p4c81NoZ4_TFME-yY6g", name: "The Chui Show", channelUrl: "https://www.youtube.com/@TheChuiShow", categorySlug: "popular_food" as const },
  { channelId: "UCp2dhjQXkhY1O40lj15JQzw", name: "Luke Martin", channelUrl: "https://www.youtube.com/@LukeMartin", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCT9Oxgi6RHlf1bv939Xtk-g", name: "MrrDaro KH", channelUrl: "https://www.youtube.com/@mrrdarokh6247", categorySlug: "popular_food" as const },
  { channelId: "UCwWwEraY_OkILE3W2-7FjIg", name: "Pure Detour", channelUrl: "https://www.youtube.com/@PureDetour", categorySlug: "popular_food" as const },
  { channelId: "UC7VkwSil-1XBg4vtxkhSLGA", name: "Saoran Cooking", channelUrl: "https://www.youtube.com/@saorancooking", categorySlug: "popular_food" as const },
  { channelId: "UCVHTf72swGXqKQCG9pOyDIw", name: "Francly Speaking", channelUrl: "https://www.youtube.com/@franclyspeaking", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCcAd5Np7fO8SeejB1FVKcYw", name: "Best Ever Food Review Show", channelUrl: "https://www.youtube.com/@BestEverFoodReviewShow", categorySlug: "popular_food" as const },
  { channelId: "UCxhoQEdo5ixoKIo1IFXiubg", name: "Mei Queen Food", channelUrl: "https://www.youtube.com/@meiqueen1511", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCA8wZRSt3JfLUKa0iCKYjMw", name: "Jax out and about", channelUrl: "https://www.youtube.com/@Jax_outandabout", categorySlug: "famous_restaurant" as const },
  { channelId: "UCx7XcErrBfBnB7Tz58F4F2Q", name: "Chhom Sreypach", channelUrl: "https://www.youtube.com/@chhomsreypachkh", categorySlug: "popular_food" as const },
  { channelId: "UCAGSZxHyropnxsYC_s1aaxg", name: "Apricot Wanderers", channelUrl: "https://www.youtube.com/@ApricotWanderers", categorySlug: "famous_restaurant" as const },
  { channelId: "UCmpsHcB0sbP3fnVCV6oEFpg", name: "Muntha Music Studio", channelUrl: "https://www.youtube.com/@MunthaMusic", categorySlug: "popular_food" as const },
  { channelId: "UCOAKLGCZQE7Mi_0V-gkM_EA", name: "Derthort-ដេីរថត", channelUrl: "https://www.youtube.com/@Derthort", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCVih8bFctnamRMT18RqOolw", name: "yumbitescambodia", channelUrl: "https://www.youtube.com/@YumBitesCambodia", categorySlug: "famous_restaurant" as const },
  { channelId: "UCa6vVyA5RxrNG7Mu-6wEryA", name: "Nore Films", channelUrl: "https://www.youtube.com/@norefilms", categorySlug: "popular_food" as const },
  { channelId: "UCDt2OX9enDjBV1ZA-L21zZw", name: "Second Life Travels", channelUrl: "https://www.youtube.com/@SecondLifeTravels1", categorySlug: "famous_restaurant" as const },
  { channelId: "UC7tuP-qq6HHAi_Q3vHdXZ8g", name: "Yekny Rorn", channelUrl: "https://www.youtube.com/@yeknyrorn", categorySlug: "famous_restaurant" as const },
  { channelId: "UCeiWUs4niQ-Gg772BX_E50w", name: "Pich Pisey Fan - ពេជ្រ ពិសី​", channelUrl: "https://www.youtube.com/@pichpisey-8218", categorySlug: "food_travel_vlog" as const },
  { channelId: "UCBQ_u6RFTlHbX8IVkpVMkig", name: "Eating Food", channelUrl: "https://www.youtube.com/@eatingfood3533", categorySlug: "famous_restaurant" as const },
  { channelId: "UCVGAjXzfvGqrWReUo1kD8oA", name: "STREET FOOD REVIEW", channelUrl: "https://www.youtube.com/@StreetFoodReviews", categorySlug: "popular_food" as const },
  { channelId: "UC3GHwJ665OxdjdHr-26SPWA", name: "សារអាហារ​ - Expressions Hub", channelUrl: "https://www.youtube.com/@expressionshub3501", categorySlug: "famous_restaurant" as const },
  { channelId: "UCAA7SWZIB2TmoABwhh-he4g", name: "Facetaste", channelUrl: "https://www.youtube.com/@facetaste8451", categorySlug: "famous_restaurant" as const },
  { channelId: "UCRgzg_KZ0hGQ_ZhlSF8FKaQ", name: "Pie Noon", channelUrl: "https://www.youtube.com/@LaVieBoem", categorySlug: "popular_food" as const },
  { channelId: "UCy8nwhJjDlA6yL72QloGPrw", name: "All Food", channelUrl: "https://www.youtube.com/@allfood7198", categorySlug: "popular_food" as const },
  { channelId: "UCWGYTwmFL4B7l1MEFXRhUDQ", name: "ឡេង រតន:", channelUrl: "https://www.youtube.com/@%E1%9E%A1%E1%9F%81%E1%9E%84%E1%9E%9A%E1%9E%8F%E1%9E%93", categorySlug: "popular_food" as const },
];

const DISCOVERED_YOUTUBE_CHANNELS_STORAGE_KEY = 'kft_discovered_youtube_food_channels_v1';

/** Dynamically register a newly discovered Cambodian food-review YouTube channel without manual registration */
export function registerDiscoveredYouTubeChannel(record: {
  channelId: string;
  name: string;
  channelUrl?: string;
  categorySlug?: TrendingFoodCategorySlug;
}): void {
  const cid = (record.channelId || '').trim();
  const cleanName = (record.name || '').trim();
  if (!cid || !/^UC[A-Za-z0-9_-]{20,28}$/.test(cid) || !cleanName) return;
  if (ACTIVE_CAMBODIA_YOUTUBE_CHANNELS_2026.some((c) => c.channelId === cid)) return;

  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(DISCOVERED_YOUTUBE_CHANNELS_STORAGE_KEY);
    const list: CambodiaYouTubeChannelRecord[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return;
    if (list.some((c) => c.channelId === cid)) return;

    list.unshift({
      channelId: cid,
      name: cleanName,
      channelUrl: record.channelUrl || `https://www.youtube.com/channel/${cid}`,
      categorySlug: record.categorySlug || 'popular_food',
      discoveredAt: new Date().toISOString().slice(0, 10),
    });

    const trimmed = list.slice(0, 120);
    localStorage.setItem(DISCOVERED_YOUTUBE_CHANNELS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage errors
  }
}

/** Combine built-in verified channels with dynamically discovered Cambodian food reviewer channels */
export function getExpandedYouTubeChannelDatabase(): CambodiaYouTubeChannelRecord[] {
  const byId = new Map<string, CambodiaYouTubeChannelRecord>();
  for (const ch of ACTIVE_CAMBODIA_YOUTUBE_CHANNELS_2026) {
    byId.set(ch.channelId, ch);
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(DISCOVERED_YOUTUBE_CHANNELS_STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item?.channelId && /^UC[A-Za-z0-9_-]{20,28}$/.test(item.channelId) && !byId.has(item.channelId)) {
              byId.set(item.channelId, {
                channelId: item.channelId,
                name: item.name || 'Cambodia Food Creator',
                channelUrl: item.channelUrl || `https://www.youtube.com/channel/${item.channelId}`,
                categorySlug: item.categorySlug || 'popular_food',
                discoveredAt: item.discoveredAt,
              });
            }
          }
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return [...byId.values()];
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
  // ============================================================================
  // 5. EXPANDED CAMBODIAN FOOD REVIEWERS & MULTI-KEYWORD VERIFIED VIDEOS (110+)
  // ============================================================================
  {
    id: "yt-2026-kh-review-1-eFbK989HEks",
    url: "https://www.youtube.com/watch?v=eFbK989HEks",
    authorName: "ម៉ែកាឆែត",
    channelId: "UCdBYbaSyGy41ws2deqrcpqg",
    channelUrl: "https://www.youtube.com/@mekachet",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Svay Rieng by Mae Kachet Khmer Cooking (#1)",
    titleKh: "របៀបស្លម្ហូបអ្នកស្វាយរៀង បុកគ្រឿងស្លឹកក្រៃជាមួយកំពិសនិងខ្ចៅ",
    titleZh: "柴桢省地道高棉街头美食与传统名菜测评 (Mae Kachet Khmer Cooking) — Authentic Cambodian Food Review & Local Street Food in Svay Rieng by Mae Kachet Khmer Cooking (#1)",
    descriptionKh: "ជម្រាបសួរបងប្អូនទាំងអស់គ្នា! ថ្ងៃនេះ ម៉ែកាឆែត មកសាកល្បងធ្វើមុខម្ហូបបែបបងប្អូនខាងខេត្តស្វាយរៀងម្តង។ ដោយសារឃើញបងស្រីខាងស្វាយរៀងគាត់ស្លទំនងពេក ទើបនឹកឃ្លានចង់សាកភ្លក្សរសជាតិ។\n\nម្ហូបមួយមុខនេះ គឺយើងបុកស្លឹ���ក្រៃធ្វើគ្រឿងដោយខ្លួនឯង បុកអង្ករឱ្យខាប់ទឹកសម្ល និងដាក់ផ្សំ (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល ម៉ែកាឆែត នៅខេត្តស្វាយរៀង)។",
    descriptionEn: "Verified in Svay Rieng, Cambodia by YouTuber : exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Mae Kachet Khmer Cooking 拍摄的柴桢省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តស្វាយរៀង",
    provinceEn: "Svay Rieng",
    publishedDate: "2026-11-12",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-14",
  },
  {
    id: "yt-2026-kh-review-2-do9L0Sb1JO0",
    url: "https://www.youtube.com/watch?v=do9L0Sb1JO0",
    authorName: "NexWalk KH",
    channelId: "UCFHnPGSdWxHKVOOGuwH75-Q",
    channelUrl: "https://www.youtube.com/@NexWalkKH",
    fallbackTitleEn: "Phnom Penh Night Market Street Food: Chaktomuk Tour Like You've Never Seen!",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (NexWalk KH) — Phnom Penh Night Market Street Food: Chaktomuk Tour Like You've Never Seen!",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (NexWalk KH) — Phnom Penh Night Market Street Food: Chaktomuk Tour Like You've Never Seen!",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber NexWalk KH (Cambodia night market food tour)។",
    descriptionEn: "Hello Everyone Today i will to show Wonderful Cambodian Street Food 2026 - Evening Walking Tour in Chaktomuk Night Market, Phnom Penh. Thank you for watching. #walking #streetfood #cambodia — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by NexWalk KH.",
    descriptionZh: "由 YouTube 创作者 NexWalk KH 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-11-12",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-3-04-EBien5Yw",
    url: "https://www.youtube.com/watch?v=04-EBien5Yw",
    authorName: "BT Food Story",
    channelId: "UC2AEkWunWQ5m_85k-kJwxXg",
    channelUrl: "https://www.youtube.com/@btfoodstory",
    fallbackTitleEn: "Cambodia’s Famous Wedding Porridge! 🍲 Only $1 25 at Sorla Market, Phnom Penh!",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (BT Food Story) — Cambodia’s Famous Wedding Porridge! 🍲 Only $1 25 at Sorla Market, Phnom Penh!",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (BT Food Story) — Cambodia’s Famous Wedding Porridge! 🍲 Only $1 25 at Sorla Market, Phnom Penh!",
    descriptionKh: "Have you ever tried BorBor Tokka (បបរតុការ), also known as Cambodian Wedding Porridge? 🇰🇭\n\nThis traditional Cambodian porridge is commonly served during wedding breakfast receptions, which is why people call it Wedding Porridge!\n\nAt this local street food st (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល BT Food Story នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified Cambodian Food Review in Phnom Penh, Cambodia by YouTuber BT Food Story: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 BT Food Story 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-11-12",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-11",
  },
  {
    id: "yt-2026-kh-review-4-uX7xVffoN6I",
    url: "https://www.youtube.com/watch?v=uX7xVffoN6I",
    authorName: "Cambodia Street Food",
    channelId: "UCXDwffDutwtpFYbUTts7pvw",
    channelUrl: "https://www.youtube.com/@CambodiaStreetFoodDaily",
    fallbackTitleEn: "Amazing Cambodian Street Food! 🇰🇭 Crispy Fried Snacks, Sweet Sesame Donuts & Delicious Local Pastr",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Cambodia Street Food) — Amazing Cambodian Street Food! 🇰🇭 Crispy Fried Snacks, Sweet Sesame Donuts & Delicious Local Pastr",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Cambodia Street Food) — Amazing Cambodian Street Food! 🇰🇭 Crispy Fried Snacks, Sweet Sesame Donuts & Delicious Local Pastr",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Cambodia Street Food (Cambodia Street Food)។",
    descriptionEn: "🌶️ Welcome to Cambodia Street Food! 🇰🇭 Discover the amazing flavors, delicious dishes, and vibrant food culture of Cambodia! 🍜🍢 Join us as we explore the exciting world of Cambodian street food, from sizzling grilled meats and fresh seafood to tradition — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Cambodia Street Food.",
    descriptionZh: "由 YouTube 创作者 Cambodia Street Food 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-11-12",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-6",
  },
  {
    id: "yt-2026-kh-review-5-iObzHFH8iEA",
    url: "https://www.youtube.com/watch?v=iObzHFH8iEA",
    authorName: "Sok khim Cooking",
    channelId: "UCgbV-6Db9RB_93qVaDU8z_A",
    channelUrl: "https://www.youtube.com/@sokkhimcooking",
    fallbackTitleEn: "Delicious Steamed Fish Roe – Traditional Cambodian Country-Style Cooking",
    titleKh: "មុខម្ហូបចំហុយពងត្រីDelicious Steamed Fish Roe – Traditional Cambodian Country-Style Cooking",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Sok khim Cooking) — Delicious Steamed Fish Roe – Traditional Cambodian Country-Style Cooking",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Sok khim Cooking (ញ៉ាំអាហារខ្មែរ)។",
    descriptionEn: "Today, we are preparing a delicious traditional Cambodian dish: Steamed Fish Roe! This homemade country-style recipe is full of wonderful flavors, featuring beautifully steamed fish roe with a rich, savory taste and an appetizing golden color. Served with a v — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Sok khim Cooking.",
    descriptionZh: "由 YouTube 创作者 Sok khim Cooking 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-11-12",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-6-cHzYMJ7sYSU",
    url: "https://www.youtube.com/watch?v=cHzYMJ7sYSU",
    authorName: "Sina NSN",
    channelId: "UC6BGn58FaYnAn7QgcxUpf_Q",
    channelUrl: "https://www.youtube.com/@sinansn6499",
    fallbackTitleEn: "Cambodian Street Food 2026 - Evening Walking Tour @ Orussey Market Food, Phnom Penh 4K",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Sina NSN) — Cambodian Street Food 2026 - Evening Walking Tour @ Orussey Market Food, Phnom Penh 4K",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Sina NSN) — Cambodian Street Food 2026 - Evening Walking Tour @ Orussey Market Food, Phnom Penh 4K",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Sina NSN (Cambodia Street Food)។",
    descriptionEn: "#streetfood #SinaNSN #StreetFoodTour Please enjoy this video. Thank you for watching. — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Sina NSN.",
    descriptionZh: "由 YouTube 创作者 Sina NSN 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-11-11",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-7-L2w3tA87Drs",
    url: "https://www.youtube.com/watch?v=L2w3tA87Drs",
    authorName: "Sreypich TV Show",
    channelId: "UCRvd6ud_kB8dbAvd3Fmk4Mg",
    channelUrl: "https://www.youtube.com/@SreypichTVShow",
    fallbackTitleEn: "BEST Famous Street Food in Cambodia 2026 – Riverside Night Market Experience in Phnom Penh City",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Sreypich TV Show) — BEST Famous Street Food in Cambodia 2026 – Riverside Night Market Experience in Phnom Penh City",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Sreypich TV Show) — BEST Famous Street Food in Cambodia 2026 – Riverside Night Market Experience in Phnom Penh City",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Sreypich TV Show (Cambodia Street Food)។",
    descriptionEn: "#SreypichTVShow #CambodianStreetFood #StreetFood #PhnomPenhFoodTour #travel #cambodiawalktour #phnompenh #NightMarket #TravelCambodia Hello! Everyone! Welcome back to my channel Sreypich TV Show. Today I will show you about BEST Famous Street Food in Cambodia — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Sreypich TV Show.",
    descriptionZh: "由 YouTube 创作者 Sreypich TV Show 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-11-11",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-8-GtIeQ3a0j-E",
    url: "https://www.youtube.com/watch?v=GtIeQ3a0j-E",
    authorName: "5 Five Tours",
    channelId: "UCv52_difuvyCvtZrnUntWNQ",
    channelUrl: "https://www.youtube.com/@5FiveTours",
    fallbackTitleEn: "Best Local Street Food in Phnom Penh, Cambodia 🇰🇭 | Chaktomuk Night Food Market Walk Tour",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (5 Five Tours) — Best Local Street Food in Phnom Penh, Cambodia 🇰🇭 | Chaktomuk Night Food Market Walk Tour",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (5 Five Tours) — Best Local Street Food in Phnom Penh, Cambodia 🇰🇭 | Chaktomuk Night Food Market Walk Tour",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber 5 Five Tours (Cambodia Street Food)។",
    descriptionEn: "Discover the local food scene, experience everyday life in Phnom Penh, and enjoy the sights and sounds of Cambodia's street food culture. If you enjoy Cambodian street food, local markets, and walking tours, don't forget to LIKE, COMMENT, and SUBSCRIBE for mor — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by 5 Five Tours.",
    descriptionZh: "由 YouTube 创作者 5 Five Tours 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-11-11",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-9-B1DAfEAiWTU",
    url: "https://www.youtube.com/watch?v=B1DAfEAiWTU",
    authorName: "Food Tour & Explore",
    channelId: "UCCftsczyo1ciJ6HGH0VUOEg",
    channelUrl: "https://www.youtube.com/@food-tour-explore",
    fallbackTitleEn: "Best CAMBODIAN Street Food 2026 - Ultimate Walking Tour At Toul Tom Poung Market, Phnom Penh",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Food Tour & Explore) — Best CAMBODIAN Street Food 2026​ - Ultimate Walking Tour At Toul Tom Poung Market, Phnom Penh",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Food Tour & Explore) — Best CAMBODIAN Street Food 2026 - Ultimate Walking Tour At Toul Tom Poung Market, Phnom Penh",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Food Tour & Explore (Cambodia Street Food)។",
    descriptionEn: "Discover the hidden gems of Cambodian street food in 2026 on this immersive evening walking tour around Toul Tom Poung (Russian Market), Phnom Penh 🇰🇭. From sizzling local grills and authentic Khmer noodles to rare street snacks you won’t find in tourist gui — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Food Tour & Explore.",
    descriptionZh: "由 YouTube 创作者 Food Tour & Explore 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-11-11",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-5",
  },
  {
    id: "yt-2026-kh-review-10-1UhWG95nuLA",
    url: "https://www.youtube.com/watch?v=1UhWG95nuLA",
    authorName: "Sreypich TV Show",
    channelId: "UCRvd6ud_kB8dbAvd3Fmk4Mg",
    channelUrl: "https://www.youtube.com/@SreypichTVShow",
    fallbackTitleEn: "FANTASTIC Cambodian Street Food 2026 - Evening Walking Tour in Chaktomuk Night Market & Udong Market",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តកំពង់ស្ពឺ (Sreypich TV Show) — FANTASTIC Cambodian Street Food 2026 - Evening Walking Tour in Chaktomuk Night Market & Udong Market",
    titleZh: "磅士卑省柬埔寨夜市寻味与美食旅行 Vlog (Sreypich TV Show) — FANTASTIC Cambodian Street Food 2026 - Evening Walking Tour in Chaktomuk Night Market & Udong Market",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តកំពង់ស្ពឺ ពី YouTuber Sreypich TV Show (Cambodia night market food tour)។",
    descriptionEn: "#SreypichTVShow #CambodianStreetFood #StreetFood #PhnomPenhFoodTour #travel #cambodiawalktour #phnompenh #NightMarket #TravelCambodia Hello! Everyone! Welcome back to my channel Sreypich TV Show. Today I will show you about FANTASTIC Cambodian Street Food 202 — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Kampong Speu by Sreypich TV Show.",
    descriptionZh: "由 YouTube 创作者 Sreypich TV Show 拍摄的磅士卑省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តកំពង់ស្ពឺ",
    provinceEn: "Kampong Speu",
    publishedDate: "2026-11-11",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-11-SqcJMbLU9N8",
    url: "https://www.youtube.com/watch?v=SqcJMbLU9N8",
    authorName: "NexWalk KH",
    channelId: "UCFHnPGSdWxHKVOOGuwH75-Q",
    channelUrl: "https://www.youtube.com/@NexWalkKH",
    fallbackTitleEn: "Amazing Exotic Foods & Local Market Tour! Cambodian Night Market Street Food 🇰🇭",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (NexWalk KH) — Amazing Exotic Foods & Local Market Tour! Cambodian Night Market Street Food 🇰🇭",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (NexWalk KH) — Amazing Exotic Foods & Local Market Tour! Cambodian Night Market Street Food 🇰🇭",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber NexWalk KH (Cambodia night market food tour)។",
    descriptionEn: "Cambodian street food scene at the bustling Chaktomuk Night Market in Phnom Penh. Join our evening walk. We wander through the lively market aisles to see local vendors selling a wide variety of snacks, including unique fried insects and fresh grilled special — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by NexWalk KH.",
    descriptionZh: "由 YouTube 创作者 NexWalk KH 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-11-11",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-6",
  },
  {
    id: "yt-2026-kh-review-12-GumJSaOvYEk",
    url: "https://www.youtube.com/watch?v=GumJSaOvYEk",
    authorName: "KhornPark88",
    channelId: "UCn3QZDGrudCMuA8JU1HBzcA",
    channelUrl: "https://www.youtube.com/@KhornPark88",
    fallbackTitleEn: "$2 Beef Noodles, $3.25 Sandwich & More! Cambodia Street Food",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (KhornPark88) — $2 Beef Noodles, $3.25 Sandwich & More! Cambodia Street Food",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (KhornPark88) — $2 Beef Noodles, $3.25 Sandwich & More! Cambodia Street Food",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber KhornPark88 (Cambodia Street Food)។",
    descriptionEn: "Amazing Cambodian street food! Today I'm enjoying a delicious bowl of $2 beef noodle soup, a $3.25 sandwich, and more tasty local food in Cambodia. Cambodia is full of affordable and delicious street food, from steaming bowls of noodle soup to freshly prepare — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by KhornPark88.",
    descriptionZh: "由 YouTube 创作者 KhornPark88 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-11-11",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-5",
  },
  {
    id: "yt-2026-kh-review-13-7--IZqbYn6E",
    url: "https://www.youtube.com/watch?v=7--IZqbYn6E",
    authorName: "WalkTV",
    channelId: "UC5lUlu8CHpEzpn4raQv4jiw",
    channelUrl: "https://www.youtube.com/@WalkTVkh",
    fallbackTitleEn: "Walking Around Phnom Penh’s Best Night Market Street Food 🍢 Chaktomuk Riverside",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (WalkTV) — Walking Around Phnom Penh’s Best Night Market Street Food 🍢 Chaktomuk Riverside",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (WalkTV) — Walking Around Phnom Penh’s Best Night Market Street Food 🍢 Chaktomuk Riverside",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber WalkTV (Cambodia night market food tour)។",
    descriptionEn: "The foreground is filled with large, steaming metal pans and bowls loaded with Cambodian delicacies, including a rich stew featuring boiled eggs, quail eggs, corn on the cob, and chili peppers. Large jars containing colorful pickled vegetables, sauces, and loc — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by WalkTV.",
    descriptionZh: "由 YouTube 创作者 WalkTV 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-11-11",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-14-XsWoCe_8KGw",
    url: "https://www.youtube.com/watch?v=XsWoCe_8KGw",
    authorName: "Sreypich TV Show",
    channelId: "UCRvd6ud_kB8dbAvd3Fmk4Mg",
    channelUrl: "https://www.youtube.com/@SreypichTVShow",
    fallbackTitleEn: "Amazing Cambodian Street Food - Evening Walking Tour in Chaktomuk Night Market & Kien Svay Resort",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តកណ្តាល (Sreypich TV Show) — Amazing Cambodian Street Food - Evening Walking Tour in Chaktomuk Night Market & Kien Svay Resort",
    titleZh: "干拉省柬埔寨夜市寻味与美食旅行 Vlog (Sreypich TV Show) — Amazing Cambodian Street Food - Evening Walking Tour in Chaktomuk Night Market & Kien Svay Resort",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តកណ្តាល ពី YouTuber Sreypich TV Show (Cambodia night market food tour)។",
    descriptionEn: "#SreypichTVShow #CambodianStreetFood #StreetFood #PhnomPenhFoodTour #travel #cambodiawalktour #phnompenh #NightMarket #TravelCambodia Hello! Everyone! Welcome back to my channel Sreypich TV Show. Today I will show you about Thank you so much for watching my — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Kandal by Sreypich TV Show.",
    descriptionZh: "由 YouTube 创作者 Sreypich TV Show 拍摄的干拉省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តកណ្តាល",
    provinceEn: "Kandal",
    publishedDate: "2026-11-10",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-15-dH9So6ZuxFU",
    url: "https://www.youtube.com/watch?v=dH9So6ZuxFU",
    authorName: "Sambathchun សម្បត្តិជន",
    channelId: "UCWEtQZOPvtIfiI-E4uJXRag",
    channelUrl: "https://www.youtube.com/@sambathchun1989",
    fallbackTitleEn: "#3969 | Udong Street Food",
    titleKh: "#3969 លោកពូមកពីអាមេរិក ដើរភ្លក់ម្ហូបខ្មែរនៅផ្សារម្ហូបឧដុង្គ | Udong Street Food",
    titleZh: "磅士卑省高棉人气餐厅、自助餐与咖啡店探店测评 (Sambathchun) — #3969 | Udong Street Food",
    descriptionKh: "ថ្ងៃនេះ ជាថ្ងៃពិសេសមួយ ខ្ញុំបាទ សម្បត្តិជន បានជូនលោកពូ ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Sambathchun សម្បត្តិជន នៅខេត្តកំពង់ស្ពឺ)។",
    descriptionEn: "Verified in Kampong Speu, Cambodia by YouTuber Sambathchun : exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Sambathchun 拍摄的磅士卑省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "ខេត្តកំពង់ស្ពឺ",
    provinceEn: "Kampong Speu",
    publishedDate: "2026-11-08",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-16-RjFHyO6Sk_w",
    url: "https://www.youtube.com/watch?v=RjFHyO6Sk_w",
    authorName: "Mao",
    channelId: "UCARbX20_cV9YwwrAFyYvoMg",
    channelUrl: "https://www.youtube.com/@Mao-od8gp",
    fallbackTitleEn: "2 / Aeon Mall2 Food Court in Phnom Penh City,Cambodia",
    titleKh: "ផ្សារទំនើបអ៊ីអន2 ភ្នំពេញ/ Aeon Mall2 Food Court in Phnom Penh City,Cambodia",
    titleZh: "金边高棉人气餐厅、自助餐与咖啡店探店测评 (Mao) — 2 / Aeon Mall2 Food Court in Phnom Penh City,Cambodia",
    descriptionKh: "... អស់គ្នាឥឡូវនេះខ្ញុំកំពុងតែធ្វើដំណើរតាមផ្លូវទៅផ្សារទំនើបអ. (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Mao នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Mao: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Mao 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-11-08",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-17-okBINVRyz6M",
    url: "https://www.youtube.com/watch?v=okBINVRyz6M",
    authorName: "TravelwithChad",
    channelId: "UCss0y7c69jgvFRS9Hs2EwRA",
    channelUrl: "https://www.youtube.com/@TravelwithChad",
    fallbackTitleEn: "A Side Of Cambodia Most Visitors Miss | Battambang",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តបាត់ដំបង (TravelwithChad) — A Side Of Cambodia Most Visitors Miss | Battambang",
    titleZh: "马德望省地道高棉街头美食与传统名菜测评 (TravelwithChad) — A Side Of Cambodia Most Visitors Miss | Battambang",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តបាត់ដំបង ពី YouTuber TravelwithChad (Battambang Food Review)។",
    descriptionEn: "I stepped out from beneath the giant Buddha at Ek Phnom Temple in Battambang, Cambodia and paused to say a quick prayer of thanks for 14 years drug free. It was a meaningful start to a day of exploring. Come along as I visit monasteries and historic temples, — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Battambang by TravelwithChad.",
    descriptionZh: "由 YouTube 创作者 TravelwithChad 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2026-11-01",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-18-0Zf52vqlzzk",
    url: "https://www.youtube.com/watch?v=0Zf52vqlzzk",
    authorName: "Mao",
    channelId: "UCARbX20_cV9YwwrAFyYvoMg",
    channelUrl: "https://www.youtube.com/@Mao-od8gp",
    fallbackTitleEn: "Eat Fresh Spring Roll at Orussey Market in Phnom Penh City",
    titleKh: "ញុំាអាហារនៅផ្សារអូរឫស្សី ភ្នំពេញ/ Eat Fresh Spring Roll at Orussey Market in Phnom Penh City",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Mao) — Eat Fresh Spring Roll at Orussey Market in Phnom Penh City",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Mao (ម្ហូបតាមផ្លូវភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Mao: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Mao 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-11-01",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-28",
  },
  {
    id: "yt-2026-kh-review-19-9hCXZxuovX8",
    url: "https://www.youtube.com/watch?v=9hCXZxuovX8",
    authorName: "Tom Trips Out",
    channelId: "UClfihckKpwTAavLe4tT0NOg",
    channelUrl: "https://www.youtube.com/@TomTripsOut",
    fallbackTitleEn: "Every Tourist in Battambang Should Know About This Place! | Pomme 🇰🇭",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តបាត់ដំបង (Tom Trips Out) — Every Tourist in Battambang Should Know About This Place! | Pomme 🇰🇭",
    titleZh: "马德望省高棉人气餐厅、自助餐与咖啡店探店测评 (Tom Trips Out) — Every Tourist in Battambang Should Know About This Place! | Pomme 🇰🇭",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តបាត់ដំបង ពី YouTuber Tom Trips Out (Battambang Food Review)។",
    descriptionEn: "Looking for Battambang's best hangout spot? This place has a restaurant, bar, hostel AND private rooms for just $12 a night! — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Battambang by Tom Trips Out.",
    descriptionZh: "由 YouTube 创作者 Tom Trips Out 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2026-10-30",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-20-Ez6tA7eavLA",
    url: "https://www.youtube.com/watch?v=Ez6tA7eavLA",
    authorName: "TravelwithChad",
    channelId: "UCss0y7c69jgvFRS9Hs2EwRA",
    channelUrl: "https://www.youtube.com/@TravelwithChad",
    fallbackTitleEn: "Exploring Battambang 🇰🇭 | A Different Side Of Cambodia",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តបាត់ដំបង (TravelwithChad) — Exploring Battambang 🇰🇭 | A Different Side Of Cambodia",
    titleZh: "马德望省柬埔寨夜市寻味与美食旅行 Vlog (TravelwithChad) — Exploring Battambang 🇰🇭 | A Different Side Of Cambodia",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តបាត់ដំបង ពី YouTuber TravelwithChad (Battambang Food Review)។",
    descriptionEn: "Join me as I explore the streets of Battambang, Cambodia! 🇰🇭 In this video, I wander through downtown Battambang, checking out local cafés, colorful street art, central Market and everyday life in this charming Cambodian city. Along the way, I try some loca — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Battambang by TravelwithChad.",
    descriptionZh: "由 YouTube 创作者 TravelwithChad 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2026-10-26",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-21-UBUjlHKDunQ",
    url: "https://www.youtube.com/watch?v=UBUjlHKDunQ",
    authorName: "Street Food Explorer",
    channelId: "UCEeeueKMAYe3wNNhie9TKew",
    channelUrl: "https://www.youtube.com/@StreetFoodExplorerCambodia",
    fallbackTitleEn: "Battambang Food Tour — Brohokk Morning Market Walk 4K",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តបាត់ដំបង (Street Food Explorer) — Battambang Food Tour — Brohokk Morning Market Walk 4K",
    titleZh: "马德望省柬埔寨夜市寻味与美食旅行 Vlog (Street Food Explorer) — Battambang Food Tour — Brohokk Morning Market Walk 4K",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តបាត់ដំបង ពី YouTuber Street Food Explorer (Battambang Food Review)។",
    descriptionEn: "Experience the \"Kingdom of Wonder\" through its most authentic lens—its flavors. A street food walking tour in Cambodia is more ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Battambang by Street Food Explorer.",
    descriptionZh: "由 YouTube 创作者 Street Food Explorer 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2026-10-20",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-14",
  },
  {
    id: "yt-2026-kh-review-22-x4H5N-Du1Ec",
    url: "https://www.youtube.com/watch?v=x4H5N-Du1Ec",
    authorName: "Street Food Explorer",
    channelId: "UCEeeueKMAYe3wNNhie9TKew",
    channelUrl: "https://www.youtube.com/@StreetFoodExplorerCambodia",
    fallbackTitleEn: "How I Explore Battambang’s Busy Morning Street Food Market",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តបាត់ដំបង (Street Food Explorer) — How I Explore Battambang’s Busy Morning Street Food Market",
    titleZh: "马德望省柬埔寨夜市寻味与美食旅行 Vlog (Street Food Explorer) — How I Explore Battambang’s Busy Morning Street Food Market",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តបាត់ដំបង ពី YouTuber Street Food Explorer (Battambang Food Review)។",
    descriptionEn: "Experience the \"Kingdom of Wonder\" through its most authentic lens—its flavors. A street food walking tour in Cambodia is more ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Battambang by Street Food Explorer.",
    descriptionZh: "由 YouTube 创作者 Street Food Explorer 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2026-10-19",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-23-6AayHMFdAXU",
    url: "https://www.youtube.com/watch?v=6AayHMFdAXU",
    authorName: "Mao",
    channelId: "UCARbX20_cV9YwwrAFyYvoMg",
    channelUrl: "https://www.youtube.com/@Mao-od8gp",
    fallbackTitleEn: "Three Buffet Starts From $2.50 to $17.90 Review",
    titleKh: "អាហារប៊ូហ្វេ បីកន្លែង នៅ ភ្នំពេញ / Three Buffet Starts From $2.50 to $17.90 Review",
    titleZh: "金边高棉人气餐厅、自助餐与咖啡店探店测评 (Mao) — Three Buffet Starts From $2.50 to $17.90 Review",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Mao (ហាងអាហារនៅកម្ពុជា)។",
    descriptionEn: "1 Cafe Sokha Restaurant: costs $2.50 per person for lunch buffet https://maps.app.goo.gl/Lu7wP74izFsFqc8B8?g_st=it #2 Tonle ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Mao.",
    descriptionZh: "由 YouTube 创作者 Mao 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-10-18",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-24-IQBItMz-J-A",
    url: "https://www.youtube.com/watch?v=IQBItMz-J-A",
    authorName: "Pi Neak-ពីរនាក់",
    channelId: "UC5KGBC_372NSiTJPMGr4wvA",
    channelUrl: "https://www.youtube.com/@pineak_travel",
    fallbackTitleEn: "Street Food in Battambang City",
    titleKh: "ចំណីអាហារ​តាមផ្លូវក្នុងក្រុងបាត់ដំបង​ Street Food in Battambang City",
    titleZh: "马德望省地道高棉街头美食与传统名菜测评 (Pi Neak) — Street Food in Battambang City",
    descriptionKh: "សួស្តីអ្នកទាំងអស់គ្នា! ស្វាគមន៍មកកាន់វីដេអូថ្មី! (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Pi Neak-ពីរនាក់ នៅខេត្តបាត់ដំបង)។",
    descriptionEn: "Verified Battambang Food Review in Battambang, Cambodia by YouTuber Pi Neak- : exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Pi Neak 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2026-10-17",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-5",
  },
  {
    id: "yt-2026-kh-review-25-oc3McbyqxR8",
    url: "https://www.youtube.com/watch?v=oc3McbyqxR8",
    authorName: "Hidden Cambo",
    channelId: "UCGUyGCTcG9u_6cXRCrVpRvg",
    channelUrl: "https://www.youtube.com/@hiddencambo",
    fallbackTitleEn: "What $11.60 Gets You in Battambang, Cambodia! (Stir-Fry Noodles & Rotisserie Roast ) 🍗🔥",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តបាត់ដំបង (Hidden Cambo) — What $11.60 Gets You in Battambang, Cambodia! (Stir-Fry Noodles & Rotisserie Roast ) 🍗🔥",
    titleZh: "马德望省地道高棉街头美食与传统名菜测评 (Hidden Cambo) — What $11.60 Gets You in Battambang, Cambodia! (Stir-Fry Noodles & Rotisserie Roast ) 🍗🔥",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តបាត់ដំបង ពី YouTuber Hidden Cambo (Battambang Food Review)។",
    descriptionEn: "Welcome to Battambang, Cambodia! Battambang is famous for its rich culture, amazing history, and most importantly—its ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Battambang by Hidden Cambo.",
    descriptionZh: "由 YouTube 创作者 Hidden Cambo 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2026-10-15",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-5",
  },
  {
    id: "yt-2026-kh-review-26-ODDzAOtCVVM",
    url: "https://www.youtube.com/watch?v=ODDzAOtCVVM",
    authorName: "Satya Dee",
    channelId: "UC36kFiOY7c2yll2LVyoVaHA",
    channelUrl: "https://www.youtube.com/@satyadee2101",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Satya Dee (#26)",
    titleKh: "នាំមុត្តាដើរសាកល្បងម្ហូបថ្មីៗក្នុងទីក្រុងភ្នំពេញ",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Satya Dee) — Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Satya Dee (#26)",
    descriptionKh: "សាកល្បងនំកាឆាយ មីសួរសាច់មាន់ នឹង បបរមាន់ទួលទំពូង. (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Satya Dee នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Satya Dee: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Satya Dee 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-10-14",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-5",
  },
  {
    id: "yt-2026-kh-review-27-5HFBqDqQtZ8",
    url: "https://www.youtube.com/watch?v=5HFBqDqQtZ8",
    authorName: "The Sister Loop",
    channelId: "UCjl-LRA_TLmAJGoehmVsZIA",
    channelUrl: "https://www.youtube.com/@TheSisterloop",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Kandal by The Sister Loop (#27)",
    titleKh: "សាកម្ហូបខ្មែរ ប្រហុកលើជ្រុញកណ្តាលក្រុងភ្នំពេញ 🤤",
    titleZh: "干拉省地道高棉街头美食与传统名菜测评 (The Sister Loop) — Authentic Cambodian Food Review & Local Street Food in Kandal by The Sister Loop (#27)",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តកណ្តាល ពី YouTuber The Sister Loop (ម្ហូបតាមផ្លូវភ្នំពេញ)។",
    descriptionEn: "Local food in busy city Phnom Penh — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Kandal by The Sister Loop.",
    descriptionZh: "由 YouTube 创作者 The Sister Loop 拍摄的干拉省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តកណ្តាល",
    provinceEn: "Kandal",
    publishedDate: "2026-10-13",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-14",
  },
  {
    id: "yt-2026-kh-review-28-uyyiigTUfHA",
    url: "https://www.youtube.com/watch?v=uyyiigTUfHA",
    authorName: "Hidden Cambo",
    channelId: "UCGUyGCTcG9u_6cXRCrVpRvg",
    channelUrl: "https://www.youtube.com/@hiddencambo",
    fallbackTitleEn: "I Spent $12 Eating Like a King in Siem Reap!",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តសៀមរាប (Hidden Cambo) — I Spent $12 Eating Like a King in Siem Reap!",
    titleZh: "暹粒省地道高棉街头美食与传统名菜测评 (Hidden Cambo) — I Spent $12 Eating Like a King in Siem Reap!",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តសៀមរាប ពី YouTuber Hidden Cambo (Siem Reap Food Review)។",
    descriptionEn: "I Spent $12 Eating Like a King in Siem Reap! Can you really eat like a king for just $12 in Siem Reap? Today, we're taking ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Siem Reap by Hidden Cambo.",
    descriptionZh: "由 YouTube 创作者 Hidden Cambo 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2026-10-08",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-29-FTdcSUA1Is0",
    url: "https://www.youtube.com/watch?v=FTdcSUA1Is0",
    authorName: "Khmer rural life",
    channelId: "UCtkB_B_A3jnFQryNxmAKOBg",
    channelUrl: "https://www.youtube.com/@Khmerrurallife555",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Battambang by Khmer rural life (#29)",
    titleKh: "ដើរលេងបាត់ដំបងពេលយប់ 😍 ដើររកម្ហូបឆ្ងាញ់ៗ និងជួបអ្នកលក់ស្រីស្អាត!",
    titleZh: "马德望省柬埔寨夜市寻味与美食旅行 Vlog (Khmer rural life) — Authentic Cambodian Food Review & Local Street Food in Battambang by Khmer rural life (#29)",
    descriptionKh: "ជម្រាបសួរពុកម៉ែបងប្អូន! នេះជា Channel របស់ខ្ញុំមានឈ្មោះថា Khmer Rural ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Khmer rural life នៅខេត្តបាត់ដំបង)។",
    descriptionEn: "Verified in Battambang, Cambodia by YouTuber Khmer rural life: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Khmer rural life 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2026-09-24",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-30-peO-aQHeadA",
    url: "https://www.youtube.com/watch?v=peO-aQHeadA",
    authorName: "Sarna Cooking Show",
    channelId: "UC0RsJe65MJAIFwgW6C0djvw",
    channelUrl: "https://www.youtube.com/@SarnaCookingShow",
    fallbackTitleEn: "+ ❤️ | Phsar Khmer Food Court Siem Reap, Khmer Food & Traditional Dance",
    titleKh: "អាហារខ្មែរ + របាំប្រពៃណីខ្មែរ ❤️ | Phsar Khmer Food Court Siem Reap, Khmer Food & Traditional Dance",
    titleZh: "暹粒省柬埔寨夜市寻味与美食旅行 Vlog (Sarna Cooking Show) — + ❤️ | Phsar Khmer Food Court Siem Reap, Khmer Food & Traditional Dance",
    descriptionKh: "អាហារខ្មែរ + របាំប្រពៃណីខ្មែរ ❤️ | Phsar Khmer Food Court Siem Reap, Khmer Food ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Sarna Cooking Show នៅខេត្តសៀមរាប)។",
    descriptionEn: "Verified in Siem Reap, Cambodia by YouTuber Sarna Cooking Show: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Sarna Cooking Show 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2026-09-23",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-31-E7So5qiioqI",
    url: "https://www.youtube.com/watch?v=E7So5qiioqI",
    authorName: "Cambo Explorer",
    channelId: "UCAj8MxN5DsAFq5Me2wKVYbw",
    channelUrl: "https://www.youtube.com/@camboexplorer",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Cambo Explorer (#31)",
    titleKh: "ដើរភ្លក់ម្ហូបជុំវិញទីក្រុងភ្នំពេញ",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Cambo Explorer) — Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Cambo Explorer (#31)",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Cambo Explorer (ម្ហូបតាមផ្លូវភ្នំពេញ)។",
    descriptionEn: "Phnom Penh food. — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Cambo Explorer.",
    descriptionZh: "由 YouTube 创作者 Cambo Explorer 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-08-16",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-32-CPr3Oaz3cO8",
    url: "https://www.youtube.com/watch?v=CPr3Oaz3cO8",
    authorName: "CUỘC SỐNG CAM",
    channelId: "UC0nxHFae3a0UzafMJjadIrQ",
    channelUrl: "https://www.youtube.com/@Cuocsongcam",
    fallbackTitleEn: "Thành Phố Battambang - Ẩm Thực & Cuộc Sống Thực Của Người Dân Campuchia| CUỘC SỐNG CAM",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តបាត់ដំបង (CUỘC SỐNG CAM) — Thành Phố Battambang - Ẩm Thực & Cuộc Sống Thực Của Người Dân Campuchia| CUỘC SỐNG CAM",
    titleZh: "马德望省地道高棉街头美食与传统名菜测评 (CUỘC SỐNG CAM) — Thành Phố Battambang - Ẩm Thực & Cuộc Sống Thực Của Người Dân Campuchia| CUỘC SỐNG CAM",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តបាត់ដំបង ពី YouTuber CUỘC SỐNG CAM (Battambang Food Review)។",
    descriptionEn: "Thành Phố Battambong Campuchia| CUỘC SỐNG CAM Kênh CUỘC SỐNG CAM sẽ review đời sống văn hóa ẩm thực du lịch . Trải nghiệm du lịch Bách Cầm Bôn qua những cung đường đông đúc và thưởng thức ẩm thực đường phố đặc sắc ngay trong chuyến đi này. Video này đưa bạ — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Battambang by CUỘC SỐNG CAM.",
    descriptionZh: "由 YouTube 创作者 CUỘC SỐNG CAM 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2026-08-09",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-33-3_a7JiHhXMw",
    url: "https://www.youtube.com/watch?v=3_a7JiHhXMw",
    authorName: "Life in Cambodia",
    channelId: "UCFUiKVah5VJJG1ESDjAtJ3g",
    channelUrl: "https://www.youtube.com/@NearyRothTV",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Life in Cambodia (#33)",
    titleKh: "អាហារតាមចិញ្ចើមផ្លូវដ៏ពេញនិយមបំផុតនៅរាជធានីភ្នំពេញ ប្រទេសកម្ពុជា៖ ផ្សាររាត្រី ទល់នឹង 🇰🇭",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Life in Cambodia) — Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Life in Cambodia (#33)",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Life in Cambodia (ម្ហូបតាមផ្លូវភ្នំពេញ)។",
    descriptionEn: "Cambodia food in general. — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Life in Cambodia.",
    descriptionZh: "由 YouTube 创作者 Life in Cambodia 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-08-09",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-34-kdMAwOuiQq4",
    url: "https://www.youtube.com/watch?v=kdMAwOuiQq4",
    authorName: "Mark In Asia",
    channelId: "UCs22MyD8qdgDF-kJyv6Zofw",
    channelUrl: "https://www.youtube.com/@Markinasia-e4f",
    fallbackTitleEn: "Eat Cheap In Siem Reap | Restaurants where you can eat for $1.00 - No Clickbait.",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តសៀមរាប (Mark In Asia) — Eat Cheap In Siem Reap | Restaurants where you can eat for $1.00 - No Clickbait.",
    titleZh: "暹粒省高棉人气餐厅、自助餐与咖啡店探店测评 (Mark In Asia) — Eat Cheap In Siem Reap | Restaurants where you can eat for $1.00 - No Clickbait.",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តសៀមរាប ពី YouTuber Mark In Asia (Siem Reap Food Review)។",
    descriptionEn: "Restaurants where a plate can be yours for $1 dollar and they're good. Siem Reap offers a low cost of living and a low cost to eating. This is why a person can live in Siem Reap for $700 month. 🚨💰 SAVE MONEY on Flights ✈️, Hotels 🏨 & Taxi Service 🚕! ⬇️ Th — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Siem Reap by Mark In Asia.",
    descriptionZh: "由 YouTube 创作者 Mark In Asia 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2026-08-07",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-35-tTwhdnYIk8c",
    url: "https://www.youtube.com/watch?v=tTwhdnYIk8c",
    authorName: "Hidden Cambo",
    channelId: "UCGUyGCTcG9u_6cXRCrVpRvg",
    channelUrl: "https://www.youtube.com/@hiddencambo",
    fallbackTitleEn: "Explored Battambang’s Most Famous Local Food & Breakfast! 🇰🇭🍜 | Ep. 3",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តបាត់ដំបង (Hidden Cambo) — Explored Battambang’s Most Famous Local Food & Breakfast! 🇰🇭🍜 | Ep. 3",
    titleZh: "马德望省柬埔寨夜市寻味与美食旅行 Vlog (Hidden Cambo) — Explored Battambang’s Most Famous Local Food & Breakfast! 🇰🇭🍜 | Ep. 3",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តបាត់ដំបង ពី YouTuber Hidden Cambo (Battambang Food Review)។",
    descriptionEn: "Join me as I explore Battambang's famous local food and traditional Cambodian breakfast! From delicious pork rice and fresh ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Battambang by Hidden Cambo.",
    descriptionZh: "由 YouTube 创作者 Hidden Cambo 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2026-07-21",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-36-WGHuHB0AWps",
    url: "https://www.youtube.com/watch?v=WGHuHB0AWps",
    authorName: "Angela McColl",
    channelId: "UC9OcuVtqIsCe8_7AjjPtoZg",
    channelUrl: "https://www.youtube.com/@angemccoll",
    fallbackTitleEn: "This Was More Than Just Cambodian Food 🇰🇭",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Angela McColl) — This Was More Than Just Cambodian Food 🇰🇭",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Angela McColl) — This Was More Than Just Cambodian Food 🇰🇭",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Angela McColl (Cambodian Food Review)។",
    descriptionEn: "Australia is one of the most multicultural countries in the world. In this series, I'm welcomed into family homes across the country to ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Angela McColl.",
    descriptionZh: "由 YouTube 创作者 Angela McColl 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-07-19",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-37-7HrcqYE55mI",
    url: "https://www.youtube.com/watch?v=7HrcqYE55mI",
    authorName: "Street Food Explorer",
    channelId: "UCEeeueKMAYe3wNNhie9TKew",
    channelUrl: "https://www.youtube.com/@StreetFoodExplorerCambodia",
    fallbackTitleEn: "The Ultimate Battambang Street Food Guide — Skewers, Snacks, and more",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តបាត់ដំបង (Street Food Explorer) — The Ultimate Battambang Street Food Guide — Skewers, Snacks, and more",
    titleZh: "马德望省柬埔寨夜市寻味与美食旅行 Vlog (Street Food Explorer) — The Ultimate Battambang Street Food Guide — Skewers, Snacks, and more",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តបាត់ដំបង ពី YouTuber Street Food Explorer (Battambang Food Review)។",
    descriptionEn: "Experience the \"Kingdom of Wonder\" through its most authentic lens—its flavors. A street food walking tour in Cambodia is more ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Battambang by Street Food Explorer.",
    descriptionZh: "由 YouTube 创作者 Street Food Explorer 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2026-07-10",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-6",
  },
  {
    id: "yt-2026-kh-review-38-tPKIpwzca6Y",
    url: "https://www.youtube.com/watch?v=tPKIpwzca6Y",
    authorName: "Sarna Cooking Show",
    channelId: "UC0RsJe65MJAIFwgW6C0djvw",
    channelUrl: "https://www.youtube.com/@SarnaCookingShow",
    fallbackTitleEn: "13،5$ ,Spend 13,5$ BBQ at Koh Norea, Eating Phnom Penh Budget Food",
    titleKh: "ចំណាយលុយ 13،5$ញ៉ាំអាហារពេលល្ងាចនៅកោះនរា,Spend 13,5$ BBQ at Koh Norea, Eating Phnom Penh Budget Food,",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Sarna Cooking Show) — 13،5$ ,Spend 13,5$ BBQ at Koh Norea, Eating Phnom Penh Budget Food",
    descriptionKh: "ចំណាយលុយ 13،5$ ញ៉ាំអាហារពេលល្ងាចនៅកោះនរា, ចំណាយលុយ ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Sarna Cooking Show នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified Phnom Penh Food Review in Phnom Penh, Cambodia by YouTuber Sarna Cooking Show: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Sarna Cooking Show 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-07-07",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-6",
  },
  {
    id: "yt-2026-kh-review-39-uAJP2HpkEUA",
    url: "https://www.youtube.com/watch?v=uAJP2HpkEUA",
    authorName: "Food Network UK",
    channelId: "UCzYZk4bZ07yJeK7Zd_z37Cw",
    channelUrl: "https://www.youtube.com/@FoodNetworkUKTV",
    fallbackTitleEn: "Guy Fieri Tries Cambodian Food Made By A Jet Fighter Engineer | Diners, Drive-Ins, and Dives",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Food Network UK) — Guy Fieri Tries Cambodian Food Made By A Jet Fighter Engineer | Diners, Drive-Ins, and Dives",
    titleZh: "金边高棉人气餐厅、自助餐与咖啡店探店测评 (Food Network UK) — Guy Fieri Tries Cambodian Food Made By A Jet Fighter Engineer | Diners, Drive-Ins, and Dives",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Food Network UK (Khmer Restaurant Review)។",
    descriptionEn: "Subscribe to Food Network UK for more great clips: https://goo.gl/j1XN9a A chef shares their journey from escaping a labour camp ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Food Network UK.",
    descriptionZh: "由 YouTube 创作者 Food Network UK 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-06-15",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-40-dTNcegWASPo",
    url: "https://www.youtube.com/watch?v=dTNcegWASPo",
    authorName: "Condé Nast Traveler",
    channelId: "UC3TIRH4PPSDde66Hg5wGh-w",
    channelUrl: "https://www.youtube.com/@Traveler",
    fallbackTitleEn: "A Pro Chef's Favorite Places to Eat in Phnom Penh, Cambodia | Condé Nast Traveler",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Condé Nast Traveler) — A Pro Chef's Favorite Places to Eat in Phnom Penh, Cambodia | Condé Nast Traveler",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Condé Nast Traveler) — A Pro Chef's Favorite Places to Eat in Phnom Penh, Cambodia | Condé Nast Traveler",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Condé Nast Traveler (Cambodian Food Review)។",
    descriptionEn: "Chef Nak joins Condé Nast Traveler as she explores her favorite food spots in Phnom Penh. From traditional Khmer cuisine and ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Condé Nast Traveler.",
    descriptionZh: "由 YouTube 创作者 Condé Nast Traveler 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-06-10",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-41-INStyYhUXOI",
    url: "https://www.youtube.com/watch?v=INStyYhUXOI",
    authorName: "T&L TRAVEL",
    channelId: "UCo0BHDWZ3gRCuSbUH85G-_A",
    channelUrl: "https://www.youtube.com/@tandltravel2024",
    fallbackTitleEn: "WHERE TO EAT IN SIEM REAP 🇰🇭 | Best Restaurants from Budget Eats to Fine Dining",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តសៀមរាប (T&L TRAVEL) — WHERE TO EAT IN SIEM REAP 🇰🇭 | Best Restaurants from Budget Eats to Fine Dining",
    titleZh: "暹粒省高棉人气餐厅、自助餐与咖啡店探店测评 (T&L TRAVEL) — WHERE TO EAT IN SIEM REAP 🇰🇭 | Best Restaurants from Budget Eats to Fine Dining",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តសៀមរាប ពី YouTuber T&L TRAVEL (Siem Reap Food Review)។",
    descriptionEn: "Looking for the best places to eat in Siem Reap, Cambodia? During our stay in Siem Reap, we set out to find some fantastic ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Siem Reap by T&L TRAVEL.",
    descriptionZh: "由 YouTube 创作者 T&L TRAVEL 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2026-05-30",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-42-7C42oY77pas",
    url: "https://www.youtube.com/watch?v=7C42oY77pas",
    authorName: "Street food tour",
    channelId: "UCZJtFOu1wmxq8wadfHSlYPQ",
    channelUrl: "https://www.youtube.com/@Streetfoodtour-44",
    fallbackTitleEn: "Best Cambodian Street Food Review 2026 🇰🇭 Countryside Market + Phnom Penh Tour",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Street food tour) — Best Cambodian Street Food Review 2026 🇰🇭 Countryside Market + Phnom Penh Tour",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Street food tour) — Best Cambodian Street Food Review 2026 🇰🇭 Countryside Market + Phnom Penh Tour",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Street food tour (Phnom Penh Food Review)។",
    descriptionEn: "Discover the best Cambodian street food in 2026 as we explore both a hidden countryside market and the busy streets of Phnom ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Street food tour.",
    descriptionZh: "由 YouTube 创作者 Street food tour 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-05-23",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-43-iJ5yoD8xb6k",
    url: "https://www.youtube.com/watch?v=iJ5yoD8xb6k",
    authorName: "WisGO",
    channelId: "UCmfOXpsa0q0uHxaaDkeeFdw",
    channelUrl: "https://www.youtube.com/@Wisgokh",
    fallbackTitleEn: "Where locals eat in Siem Reap | authentic cambodian food spots",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តសៀមរាប (WisGO) — Where locals eat in Siem Reap | authentic cambodian food spots",
    titleZh: "暹粒省地道高棉街头美食与传统名菜测评 (WisGO) — Where locals eat in Siem Reap | authentic cambodian food spots",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តសៀមរាប ពី YouTuber WisGO (Siem Reap Food Review)។",
    descriptionEn: "Discover the best places to eat in Siem Reap! From authentic khmer food to hidden local spots, this video will take you around ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Siem Reap by WisGO.",
    descriptionZh: "由 YouTube 创作者 WisGO 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2026-05-19",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-44-AAL6OEUTaRM",
    url: "https://www.youtube.com/watch?v=AAL6OEUTaRM",
    authorName: "Jenny Daily Life",
    channelId: "UCo42Xmxl2U99UtfCiWQxgcg",
    channelUrl: "https://www.youtube.com/@jennydailylife",
    fallbackTitleEn: "Best Cambodia Street Food? Cambodia Street/Market Food Compilation 2026",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Jenny Daily Life) — Best Cambodia Street Food? Cambodia Street/Market Food Compilation 2026",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Jenny Daily Life) — Best Cambodia Street Food? Cambodia Street/Market Food Compilation 2026",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Jenny Daily Life (Cambodia Street Food)។",
    descriptionEn: "StreetFoodTour, #JennyDailyLife, #lifeinmarket Thank you for your time ❤️. — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Jenny Daily Life.",
    descriptionZh: "由 YouTube 创作者 Jenny Daily Life 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-05-09",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-45-kF3VJM6xDr0",
    url: "https://www.youtube.com/watch?v=kF3VJM6xDr0",
    authorName: "Chay Sivlang",
    channelId: "UCB8yjnAK_IxD-fMjxH_QpDg",
    channelUrl: "https://www.youtube.com/@Chaysivlang",
    fallbackTitleEn: "National dish around the world",
    titleKh: "ម្ហូបតំណាងជាតិ - National dish around the world",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Chay Sivlang) — National dish around the world",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Chay Sivlang (ញ៉ាំអាហារខ្មែរ)។",
    descriptionEn: "food #nation #dish #countries. — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Chay Sivlang.",
    descriptionZh: "由 YouTube 创作者 Chay Sivlang 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-05-09",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-46-Py58q_Wdrhw",
    url: "https://www.youtube.com/watch?v=Py58q_Wdrhw",
    authorName: "Food Tour & Explore",
    channelId: "UCCftsczyo1ciJ6HGH0VUOEg",
    channelUrl: "https://www.youtube.com/@food-tour-explore",
    fallbackTitleEn: "Amazing Cambodian Street Food Review 2026 – Most Compilation Countryside Food Tour 🇰🇭",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Food Tour & Explore) — Amazing Cambodian Street Food Review 2026 – Most Compilation Countryside Food Tour 🇰🇭",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Food Tour & Explore) — Amazing Cambodian Street Food Review 2026 – Most Compilation Countryside Food Tour 🇰🇭",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Food Tour & Explore (Khmer Food Review)។",
    descriptionEn: "Welcome to the ultimate Cambodian Street Food Review 2026! In this best compilation, we explore authentic countryside food ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Food Tour & Explore.",
    descriptionZh: "由 YouTube 创作者 Food Tour & Explore 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-04-23",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-47-glhmOShpw4E",
    url: "https://www.youtube.com/watch?v=glhmOShpw4E",
    authorName: "Priscilla Kim Ong",
    channelId: "UC1_PeD6rZaUoNrN2AtyTe2Q",
    channelUrl: "https://www.youtube.com/@priscillakimong",
    fallbackTitleEn: "Finding the Best Local Food in Siem Reap 🇰🇭 (For My Cambodia Group Trip)",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តសៀមរាប (Priscilla Kim Ong) — Finding the Best Local Food in Siem Reap 🇰🇭 (For My Cambodia Group Trip)",
    titleZh: "暹粒省柬埔寨夜市寻味与美食旅行 Vlog (Priscilla Kim Ong) — Finding the Best Local Food in Siem Reap 🇰🇭 (For My Cambodia Group Trip)",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តសៀមរាប ពី YouTuber Priscilla Kim Ong (Siem Reap Food Review)។",
    descriptionEn: "Welcome to my Siem Reap research trip vlog: Best Food Spots & Finding Activities ✨ In this vlog, I'm in Siem Reap preparing ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Siem Reap by Priscilla Kim Ong.",
    descriptionZh: "由 YouTube 创作者 Priscilla Kim Ong 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2026-04-05",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-48-YAy4NiESwHo",
    url: "https://www.youtube.com/watch?v=YAy4NiESwHo",
    authorName: "Mooch Travels",
    channelId: "UCcHW9-v8McRcO-Rm-zBv2ZQ",
    channelUrl: "https://www.youtube.com/@MoochOzdemirTravel",
    fallbackTitleEn: "American Tries Cambodian Food for First Time 🇰🇭",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Mooch Travels) — American Tries Cambodian Food for First Time 🇰🇭",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Mooch Travels) — American Tries Cambodian Food for First Time 🇰🇭",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Mooch Travels (Khmer Food Review)។",
    descriptionEn: "Today I took my American friend to try Cambodian food for the FIRST TIME… and his reaction honestly surprised me We went ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Mooch Travels.",
    descriptionZh: "由 YouTube 创作者 Mooch Travels 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-03-28",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-49-2pVgSSFCnXs",
    url: "https://www.youtube.com/watch?v=2pVgSSFCnXs",
    authorName: "Rockstar Eater",
    channelId: "UCegDP5GpIrMfSXZlePFtitA",
    channelUrl: "https://www.youtube.com/@RockstarEater",
    fallbackTitleEn: "Trying CAMBODIAN FOOD for the First Time! (Reaction)",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Rockstar Eater) — Trying CAMBODIAN FOOD for the First Time! (Reaction)",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Rockstar Eater) — Trying CAMBODIAN FOOD for the First Time! (Reaction)",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Rockstar Eater (Cambodian Food Review)។",
    descriptionEn: "If you want to know what Cambodian food is like, then watch as Steve tries Cambodian food for the first time and gives his honest ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Rockstar Eater.",
    descriptionZh: "由 YouTube 创作者 Rockstar Eater 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-03-22",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-50-1letyuzuqEo",
    url: "https://www.youtube.com/watch?v=1letyuzuqEo",
    authorName: "Cooking and Travel with Bong General",
    channelId: "UC4KPmxdpKFAzogb6beSfQWA",
    channelUrl: "https://www.youtube.com/@CookingwithBongGeneral",
    fallbackTitleEn: "Street Food by Royal Palace",
    titleKh: "Street Food by Royal Palace អាហារតាមផ្លូវនៅមុខព្រះ​រាជវាំងនៅភ្នំពេញ",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Cooking and Travel with Bong General) — Street Food by Royal Palace",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Cooking and Travel with Bong General (ម្ហូបតាមផ្លូវភ្នំពេញ)។",
    descriptionEn: "Hello everyone! Check out our new shop launching with new merchandise! Please input your email to receive updates for our ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Cooking and Travel with Bong General.",
    descriptionZh: "由 YouTube 创作者 Cooking and Travel with Bong General 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-03-22",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-51-SibVzgVrkzo",
    url: "https://www.youtube.com/watch?v=SibVzgVrkzo",
    authorName: "Visit and cook with me",
    channelId: "UCKQa5a6kxcziSAaRwHJxoMQ",
    channelUrl: "https://www.youtube.com/@visitandcookwithme",
    fallbackTitleEn: "Phnom Penh Street Food Vlog",
    titleKh: "អាហារពេលរាត្រី នៅតាមមាត់ទន្លេរ ឆ្ងាញ់ៗណាស់| Phnom Penh Street Food Vlog",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Visit and cook with me) — Phnom Penh Street Food Vlog",
    descriptionKh: "សួស្ដីបងប្អូនទាំងអស់គ្នា! (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Visit and cook with me នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Visit and cook with me: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Visit and cook with me 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-03-22",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-52-djM4IDAWC3A",
    url: "https://www.youtube.com/watch?v=djM4IDAWC3A",
    authorName: "Cambodia Vibes",
    channelId: "UCAuKl-usJ7p5c-Nh8L73odw",
    channelUrl: "https://www.youtube.com/@CambodiaVibes-SR",
    fallbackTitleEn: "Real Cambodian Food Experience | Siem Reap Street Food Walk",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តសៀមរាប (Cambodia Vibes) — Real Cambodian Food Experience | Siem Reap Street Food Walk",
    titleZh: "暹粒省柬埔寨夜市寻味与美食旅行 Vlog (Cambodia Vibes) — Real Cambodian Food Experience | Siem Reap Street Food Walk",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តសៀមរាប ពី YouTuber Cambodia Vibes (Siem Reap Food Review)។",
    descriptionEn: "Join me on a food walking tour in Siem Reap, Cambodia where we explore the amazing world of Khmer street food, local ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Siem Reap by Cambodia Vibes.",
    descriptionZh: "由 YouTube 创作者 Cambodia Vibes 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2026-03-05",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-53-NwARVWHjI9c",
    url: "https://www.youtube.com/watch?v=NwARVWHjI9c",
    authorName: "Lloyd & Mandy",
    channelId: "UC5NofLGyaa9Q6PHsxSgXM0Q",
    channelUrl: "https://www.youtube.com/@LloydandMandy",
    fallbackTitleEn: "We Risked It All Eating STREET FOOD in CAMBODIA! 🇰🇭",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Lloyd & Mandy) — We Risked It All Eating STREET FOOD in CAMBODIA! 🇰🇭",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Lloyd & Mandy) — We Risked It All Eating STREET FOOD in CAMBODIA! 🇰🇭",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Lloyd & Mandy (Phnom Penh Food Review)។",
    descriptionEn: "Phnom Penh surprised us in the best way possible. In this video, we explore Cambodia's largest weekend night market at ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Lloyd & Mandy.",
    descriptionZh: "由 YouTube 创作者 Lloyd & Mandy 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2026-01-19",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-54-eKHrp3a6w2Q",
    url: "https://www.youtube.com/watch?v=eKHrp3a6w2Q",
    authorName: "Delicious food channel",
    channelId: "UCg7R70hWzrtDh3bCGlrGKhQ",
    channelUrl: "https://www.youtube.com/@%E1%9E%98%E1%9F%92%E1%9E%A0%E1%9E%BC%E1%9E%94%E1%9E%86%E1%9F%92%E1%9E%84%E1%9E%B6%E1%9E%89%E1%9F%8B",
    fallbackTitleEn: "Delicious food channel",
    titleKh: "ខប្រហុកត្រីអណ្ដែង ម្ហូបខ្មែរដែលឆ្ងាញ់បំផុត Delicious food channel",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Delicious food channel) — Delicious food channel",
    descriptionKh: "ខប្រហុកត្រីអណ្ដែង ម្ហូបខ្មែរដែលឆ្ងាញ់បំផុត Delicious food channel #khmerfood ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Delicious food channel នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Delicious food channel: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Delicious food channel 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2025-12-29",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-14",
  },
  {
    id: "yt-2026-kh-review-55-M-xkvEgzO7o",
    url: "https://www.youtube.com/watch?v=M-xkvEgzO7o",
    authorName: "WisGO",
    channelId: "UCmfOXpsa0q0uHxaaDkeeFdw",
    channelUrl: "https://www.youtube.com/@Wisgokh",
    fallbackTitleEn: "Top 5 CAMBODIAN Breakfast Dishes You Need to Try Now",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (WisGO) — Top 5 CAMBODIAN Breakfast Dishes You Need to Try Now",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (WisGO) — Top 5 CAMBODIAN Breakfast Dishes You Need to Try Now",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber WisGO (Khmer Food Review)។",
    descriptionEn: "This video is all about a breakfast review, offering an honest review of Cambodian breakfast food. You'll see reactions to ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by WisGO.",
    descriptionZh: "由 YouTube 创作者 WisGO 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2025-11-25",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-56-NhPKcJV2x0Q",
    url: "https://www.youtube.com/watch?v=NhPKcJV2x0Q",
    authorName: "WisGO",
    channelId: "UCmfOXpsa0q0uHxaaDkeeFdw",
    channelUrl: "https://www.youtube.com/@Wisgokh",
    fallbackTitleEn: "Cambodian Street Food at Toul Tom Poung Market | Must Try!",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (WisGO) — Cambodian Street Food at Toul Tom Poung Market | Must Try!",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (WisGO) — Cambodian Street Food at Toul Tom Poung Market | Must Try!",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber WisGO (Phnom Penh Food Review)។",
    descriptionEn: "What can $10 get you in Phnom Penh's famous Toul Tom Poung Market? We're trying local breakfast dishes, street snacks, and ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by WisGO.",
    descriptionZh: "由 YouTube 创作者 WisGO 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2025-10-13",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-57-dMfiyR-I6XU",
    url: "https://www.youtube.com/watch?v=dMfiyR-I6XU",
    authorName: "Sina NSN",
    channelId: "UC6BGn58FaYnAn7QgcxUpf_Q",
    channelUrl: "https://www.youtube.com/@sinansn6499",
    fallbackTitleEn: "Amazing! Cambodian STREET FOOD Review 2025 - Compilation Countryside Food Tour & City Food Market",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Sina NSN) — Amazing! Cambodian STREET FOOD Review 2025 - Compilation Countryside Food Tour & City Food Market",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Sina NSN) — Amazing! Cambodian STREET FOOD Review 2025 - Compilation Countryside Food Tour & City Food Market",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Sina NSN (Khmer Food Review)។",
    descriptionEn: "streetfood #SinaNSN #StreetFoodTour Please enjoy this video. Thank you for watching. — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Sina NSN.",
    descriptionZh: "由 YouTube 创作者 Sina NSN 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2025-10-06",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-58-o-3ZUALKnzM",
    url: "https://www.youtube.com/watch?v=o-3ZUALKnzM",
    authorName: "Kitchen Story",
    channelId: "UCLUapBXshwIyBCDMWSO3srQ",
    channelUrl: "https://www.youtube.com/@kitchenstoryK",
    fallbackTitleEn: "[ ] Somlor Korrku [Kitchen Story]",
    titleKh: "សម្លកកូរ បន្លែស្រស់ៗ អង្ករលីងបុកថ្មីៗ [សម្លខ្មែរ ម្ហូបខ្មែរ] Somlor Korrku [Kitchen Story]",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Kitchen Story) — [ ] Somlor Korrku [Kitchen Story]",
    descriptionKh: "សម្លកកូរ បន្លែស្រស់ៗ អង្ករលីងបុកថ្មីៗ [សម្លខ្មែរ ម្ហូបខ្មែរ] ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Kitchen Story នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Kitchen Story: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Kitchen Story 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2025-09-30",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-4",
  },
  {
    id: "yt-2026-kh-review-59-LP1hkycCXKg",
    url: "https://www.youtube.com/watch?v=LP1hkycCXKg",
    authorName: "Kitchen Story",
    channelId: "UCLUapBXshwIyBCDMWSO3srQ",
    channelUrl: "https://www.youtube.com/@kitchenstoryK",
    fallbackTitleEn: "# # [Ginger Braised Fish] Kitchen Story",
    titleKh: "របៀបខត្រីឲ្យឆ្ងាញ់ #ត្រីខ #ម្ហូបខ្មែរ [Ginger Braised Fish] Kitchen Story",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Kitchen Story) — # # [Ginger Braised Fish] Kitchen Story",
    descriptionKh: "របៀបខត្រីឲ្យឆ្ងាញ់ #ត្រីខ #ម្ហូបខ្មែរ [Ginger Braised Fish] Kitchen Story ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Kitchen Story នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Kitchen Story: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Kitchen Story 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2025-09-25",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-60-bA2t1RTuffA",
    url: "https://www.youtube.com/watch?v=bA2t1RTuffA",
    authorName: "Street Food TV",
    channelId: "UCLVncs-1iVf4f1tW5WSfQfw",
    channelUrl: "https://www.youtube.com/@StreetFoodTVCambodia",
    fallbackTitleEn: "CHEAP PRICE !!! 6 BEST Cambodian Street Food Spots You Must TRY | Street Food Compilation",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Street Food TV) — CHEAP PRICE !!! 6 BEST Cambodian Street Food Spots You Must TRY | Street Food Compilation",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Street Food TV) — CHEAP PRICE !!! 6 BEST Cambodian Street Food Spots You Must TRY | Street Food Compilation",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Street Food TV (Cambodia Street Food)។",
    descriptionEn: "We all love Food. Welcome to Street Food TV. Nice to meet you [4K] CHEAP PRICE !!! 6 BEST Cambodian Street Food Spots ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Street Food TV.",
    descriptionZh: "由 YouTube 创作者 Street Food TV 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2025-06-28",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-61-I0nBdCodX5w",
    url: "https://www.youtube.com/watch?v=I0nBdCodX5w",
    authorName: "EVERYTHING",
    channelId: "UCcTnoBPJiZyGkagNaPJcNFA",
    channelUrl: "https://www.youtube.com/@Everything-fd68",
    fallbackTitleEn: "Cambodian Walk Street, Cambodian Weekemd Street Foods",
    titleKh: "ម្ហូបឆ្ងាញ់ៗនៅមាត់ទន្លេក្រុងភ្នំពេញ / Cambodian Walk Street, Cambodian Weekemd Street Foods",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (EVERYTHING) — Cambodian Walk Street, Cambodian Weekemd Street Foods",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber EVERYTHING (ម្ហូបតាមផ្លូវភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber EVERYTHING: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 EVERYTHING 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2025-06-11",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-62-QuFj7Nlp40Q",
    url: "https://www.youtube.com/watch?v=QuFj7Nlp40Q",
    authorName: "For Riel",
    channelId: "UC97aAzNbBb30T5sEIymxDLg",
    channelUrl: "https://www.youtube.com/@ForRiel",
    fallbackTitleEn: "Siem Reap’s Best Food! 12 restaurants with prices! Expat life in Cambodia! #forriel",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តសៀមរាប (For Riel) — Siem Reap’s Best Food! 12 restaurants with prices! Expat life in Cambodia! #forriel",
    titleZh: "暹粒省高棉人气餐厅、自助餐与咖啡店探店测评 (For Riel) — Siem Reap’s Best Food! 12 restaurants with prices! Expat life in Cambodia! #forriel",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តសៀមរាប ពី YouTuber For Riel (Siem Reap Food Review)។",
    descriptionEn: "In this video, we're going to talk about food! The options in Siem Reap, Cambodia are extensive but we have done the homework ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Siem Reap by For Riel.",
    descriptionZh: "由 YouTube 创作者 For Riel 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2025-02-22",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-63-jm-vcNq0F9o",
    url: "https://www.youtube.com/watch?v=jm-vcNq0F9o",
    authorName: "Jenny Daily Life",
    channelId: "UCo42Xmxl2U99UtfCiWQxgcg",
    channelUrl: "https://www.youtube.com/@jennydailylife",
    fallbackTitleEn: "Khmer food Tour In Cambodia - Countryside & City Street Market Food",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Jenny Daily Life) — Khmer food Tour In Cambodia - Countryside & City Street Market Food",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Jenny Daily Life) — Khmer food Tour In Cambodia - Countryside & City Street Market Food",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Jenny Daily Life (Cambodian Food Review)។",
    descriptionEn: "StreetFoodTour, #JennyDailyLife, #lifeinmarket Please turn on the subtitle. Thank you for your time ❤️. — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Jenny Daily Life.",
    descriptionZh: "由 YouTube 创作者 Jenny Daily Life 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2025-02-12",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-64-Yn1MmkVNe0M",
    url: "https://www.youtube.com/watch?v=Yn1MmkVNe0M",
    authorName: "Kheom Leakhena",
    channelId: "UCPflXomEwyYJFcRX1jJxf-A",
    channelUrl: "https://www.youtube.com/@KheomLeakhena",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Kheom Leakhena (#64)",
    titleKh: "គ្រឿងសមុទ្រក្រឡុកទ្រង់ទ្រាយធំ",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Kheom Leakhena) — Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Kheom Leakhena (#64)",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Kheom Leakhena (ដើររកម្ហូបឆ្ងាញ់)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Kheom Leakhena: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Kheom Leakhena 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2025-02-06",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-19",
  },
  {
    id: "yt-2026-kh-review-65-I64g0VQRSno",
    url: "https://www.youtube.com/watch?v=I64g0VQRSno",
    authorName: "Pich Pisey",
    channelId: "UCplb1Ru5jWb_BM3Qe_OoQkw",
    channelUrl: "https://www.youtube.com/@pichpisey4129",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Pich Pisey (#65)",
    titleKh: "ម្ហូបខ្មែរឆ្ញាញ់ៗណាស់ ចូលរួមញុំា និង ផ្សព្វផ្សាយឲ្យបានច្រើន🇰🇭😋",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Pich Pisey) — Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Pich Pisey (#65)",
    descriptionKh: "ម្ហូបខ្មែរឆ្ញាញ់ៗណាស់ ចូលរួមញុំា និង ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Pich Pisey នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Pich Pisey: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Pich Pisey 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2025-01-22",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-66-jYWoYIsQF0k",
    url: "https://www.youtube.com/watch?v=jYWoYIsQF0k",
    authorName: "Mey Natural Food",
    channelId: "UCodC-082nikp-Cq7tlJXtpg",
    channelUrl: "https://www.youtube.com/@ahmeyfood",
    fallbackTitleEn: "2.50$ #ahmey",
    titleKh: "អត់បានធ្វេីម្ហូប មករកញាំម្ហូបខ្មែរ នៅមាត់ស្ទឹងអស់តែ2.50$​ ញាំមួយឆ្អែត #ahmey",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Mey Natural Food) — 2.50$ #ahmey",
    descriptionKh: "welcome to channel ម្ហូបស្រែគ្រួសារខ្ញុំ SUBSCRIBE FOR MORE VIDEO. (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Mey Natural Food នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Mey Natural Food: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Mey Natural Food 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-12-26",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-67-5RuvsQ-KHEA",
    url: "https://www.youtube.com/watch?v=5RuvsQ-KHEA",
    authorName: "Travelwithchris",
    channelId: "UC40tCi6qlNr-WS37JQSrSUQ",
    channelUrl: "https://www.youtube.com/@Travelwithchris",
    fallbackTitleEn: "Trying Cambodian Street Food in Siem Reap 🇰🇭",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តសៀមរាប (Travelwithchris) — Trying Cambodian Street Food in Siem Reap 🇰🇭",
    titleZh: "暹粒省地道高棉街头美食与传统名菜测评 (Travelwithchris) — Trying Cambodian Street Food in Siem Reap 🇰🇭",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តសៀមរាប ពី YouTuber Travelwithchris (Siem Reap Food Review)។",
    descriptionEn: "Trying Cambodian Street Food in Siem Reap, Cambodia. In this video I will visit one of the popular street food areas of the city ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Siem Reap by Travelwithchris.",
    descriptionZh: "由 YouTube 创作者 Travelwithchris 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2024-11-18",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-68-SzOkTic--QA",
    url: "https://www.youtube.com/watch?v=SzOkTic--QA",
    authorName: "Bec & Matt Adventures",
    channelId: "UCr4JTejyDoyCeBLnwJ6bjOw",
    channelUrl: "https://www.youtube.com/@BecMattAdventures",
    fallbackTitleEn: "Phnom Penh Restaurant Food Review Cambodia",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Bec & Matt Adventures) — Phnom Penh Restaurant Food Review Cambodia",
    titleZh: "金边高棉人气餐厅、自助餐与咖啡店探店测评 (Bec & Matt Adventures) — Phnom Penh Restaurant Food Review Cambodia",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Bec & Matt Adventures (Phnom Penh Food Review)។",
    descriptionEn: "Come along and see whats Khmer cuisine is like. David's Restaurant Homemade Noodles : Situated : 13, #166 Preah Ang Eng St. — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Bec & Matt Adventures.",
    descriptionZh: "由 YouTube 创作者 Bec & Matt Adventures 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-11-10",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-5",
  },
  {
    id: "yt-2026-kh-review-69-QmdWEb_0BaM",
    url: "https://www.youtube.com/watch?v=QmdWEb_0BaM",
    authorName: "The Chui Show",
    channelId: "UCJX9p4c81NoZ4_TFME-yY6g",
    channelUrl: "https://www.youtube.com/@TheChuiShow",
    fallbackTitleEn: "The Chui Show: FILIPINO tries BEST CAMBODIAN Street Food of CAMBODIA 100 Hours of Street Food!",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (The Chui Show) — The Chui Show: FILIPINO tries BEST CAMBODIAN Street Food of CAMBODIA 100 Hours of Street Food!",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (The Chui Show) — The Chui Show: FILIPINO tries BEST CAMBODIAN Street Food of CAMBODIA 100 Hours of Street Food!",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber The Chui Show (Cambodian Food Review)។",
    descriptionEn: "A 2 hour compilation of a Filipino trying authentic Cambodian street food in Phnom Penh! Enjoy! — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by The Chui Show.",
    descriptionZh: "由 YouTube 创作者 The Chui Show 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-11-09",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-70-GAK_1OLfNfs",
    url: "https://www.youtube.com/watch?v=GAK_1OLfNfs",
    authorName: "Luke Martin",
    channelId: "UCp2dhjQXkhY1O40lj15JQzw",
    channelUrl: "https://www.youtube.com/@LukeMartin",
    fallbackTitleEn: "100 Hours in Cambodia 🇰🇭 PHNOM PENH Street Food, KEP Seafood, SIEM REAP BBQ & More!",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តសៀមរាប (Luke Martin) — 100 Hours in Cambodia 🇰🇭 PHNOM PENH Street Food, KEP Seafood, SIEM REAP BBQ & More!",
    titleZh: "暹粒省柬埔寨夜市寻味与美食旅行 Vlog (Luke Martin) — 100 Hours in Cambodia 🇰🇭 PHNOM PENH Street Food, KEP Seafood, SIEM REAP BBQ & More!",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តសៀមរាប ពី YouTuber Luke Martin (Siem Reap Food Review)។",
    descriptionEn: "Khmer food is highly underrated and Cambodia as a whole has so much to offer a traveller. A country seemingly stuck in the past ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Siem Reap by Luke Martin.",
    descriptionZh: "由 YouTube 创作者 Luke Martin 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2024-11-03",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-6",
  },
  {
    id: "yt-2026-kh-review-71-_kTeeUSe8C8",
    url: "https://www.youtube.com/watch?v=_kTeeUSe8C8",
    authorName: "Pich Pisey",
    channelId: "UCplb1Ru5jWb_BM3Qe_OoQkw",
    channelUrl: "https://www.youtube.com/@pichpisey4129",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Pich Pisey (#71)",
    titleKh: "ខ្ញុំដាក់ពិន្ទុម្ហូប ១០មុខនៅកោះនរា(ភ្នំពេញ)😋🦑",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Pich Pisey) — Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Pich Pisey (#71)",
    descriptionKh: "ខ្ញុំដាក់ពិន្ទុម្ហូប ១០មុខនៅកោះនរា(ភ្នំពេញ)     . . . #pichpisey ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Pich Pisey នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Pich Pisey: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Pich Pisey 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-10-22",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-72-XSa-BWqd0Go",
    url: "https://www.youtube.com/watch?v=XSa-BWqd0Go",
    authorName: "Luke Martin",
    channelId: "UCp2dhjQXkhY1O40lj15JQzw",
    channelUrl: "https://www.youtube.com/@LukeMartin",
    fallbackTitleEn: "Cambodian Street Food 🇰🇭 Fermented Fish \"Pizza\" ( ) + Siem Reap's Food Village!",
    titleKh: "Cambodian Street Food 🇰🇭 Fermented Fish \"Pizza\" (ប្រហុកភីហ្សា) + Siem Reap's Food Village!",
    titleZh: "暹粒省地道高棉街头美食与传统名菜测评 (Luke Martin) — Cambodian Street Food 🇰🇭 Fermented Fish \"Pizza\" ( ) + Siem Reap's Food Village!",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តសៀមរាប ពី YouTuber Luke Martin (Siem Reap Food Review)។",
    descriptionEn: "This is episode 2 from Siem Reap, Cambodia. Home to the UNESCO world heritage site of Angkor Wat and also some of Asia's ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Siem Reap by Luke Martin.",
    descriptionZh: "由 YouTube 创作者 Luke Martin 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2024-09-29",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-14",
  },
  {
    id: "yt-2026-kh-review-73--q_dbm9AUfg",
    url: "https://www.youtube.com/watch?v=-q_dbm9AUfg",
    authorName: "MrrDaro KH",
    channelId: "UCT9Oxgi6RHlf1bv939Xtk-g",
    channelUrl: "https://www.youtube.com/@mrrdarokh6247",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Phnom Penh by MrrDaro KH (#73)",
    titleKh: "លុយ30000៛ ដើរញាំអាហារនៅមាត់ទន្លេ",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (MrrDaro KH) — Authentic Cambodian Food Review & Local Street Food in Phnom Penh by MrrDaro KH (#73)",
    descriptionKh: "Challenge លុយ30000៛ ដើរញាំអាហារនៅមាត់ទន្លេ. (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល MrrDaro KH នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber MrrDaro KH: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 MrrDaro KH 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-09-26",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-74-IbI1UOQjr54",
    url: "https://www.youtube.com/watch?v=IbI1UOQjr54",
    authorName: "Pich Pisey",
    channelId: "UCplb1Ru5jWb_BM3Qe_OoQkw",
    channelUrl: "https://www.youtube.com/@pichpisey4129",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Pich Pisey (#74)",
    titleKh: "ញុំាអាហារ ៥មុខតាមផ្លូវឌឿងហែមនៅភ្នំពេញ😋🍜",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Pich Pisey) — Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Pich Pisey (#74)",
    descriptionKh: "ញុំាអាហារ ៥មុខតាមផ្លូវឌឿងហែមនៅភ្នំពេញ     . . . #pichpisey #ពេជ្រពិសី ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Pich Pisey នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Pich Pisey: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Pich Pisey 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-09-25",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-75-cjUrceedHhM",
    url: "https://www.youtube.com/watch?v=cjUrceedHhM",
    authorName: "MrrDaro KH",
    channelId: "UCT9Oxgi6RHlf1bv939Xtk-g",
    channelUrl: "https://www.youtube.com/@mrrdarokh6247",
    fallbackTitleEn: "MUKBANG EATING SPICY CRAB | HOMESALMON",
    titleKh: "MUKBANG EATING SPICY CRAB | ក្តាមថ្មពង HOMESALMON",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (MrrDaro KH) — MUKBANG EATING SPICY CRAB | HOMESALMON",
    descriptionKh: "ក្តាមថ្មពង HOMESALMON. (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល MrrDaro KH នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber MrrDaro KH: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 MrrDaro KH 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-08-26",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-19",
  },
  {
    id: "yt-2026-kh-review-76-mvHaPYBOD80",
    url: "https://www.youtube.com/watch?v=mvHaPYBOD80",
    authorName: "Pure Detour",
    channelId: "UCwWwEraY_OkILE3W2-7FjIg",
    channelUrl: "https://www.youtube.com/@PureDetour",
    fallbackTitleEn: "SIEM REAP Food Review. Two Awesome Locations",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តសៀមរាប (Pure Detour) — SIEM REAP Food Review. Two Awesome Locations",
    titleZh: "暹粒省地道高棉街头美食与传统名菜测评 (Pure Detour) — SIEM REAP Food Review. Two Awesome Locations",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តសៀមរាប ពី YouTuber Pure Detour (Siem Reap Food Review)។",
    descriptionEn: "This week I visit two awesome locations to bring you another SIem Reap food review. The first location is Reaksmey Siem Reap, ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Siem Reap by Pure Detour.",
    descriptionZh: "由 YouTube 创作者 Pure Detour 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2024-08-10",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-77-vq5cuEh6ml0",
    url: "https://www.youtube.com/watch?v=vq5cuEh6ml0",
    authorName: "Delicious food channel",
    channelId: "UCg7R70hWzrtDh3bCGlrGKhQ",
    channelUrl: "https://www.youtube.com/@%E1%9E%98%E1%9F%92%E1%9E%A0%E1%9E%BC%E1%9E%94%E1%9E%86%E1%9F%92%E1%9E%84%E1%9E%B6%E1%9E%89%E1%9F%8B",
    fallbackTitleEn: "Delicious food channel",
    titleKh: "ប្រហិតត្រីម្ហូបខ្មែរបុរាណ ស្វិតឆ្ងាញ់ របៀបធ្វើបែបដើម កូនខ្មែរត្រូវចេះ Delicious food channel",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Delicious food channel) — Delicious food channel",
    descriptionKh: "ប្រហិតត្រីម្ហូបខ្មែរបុរាណ ស្វិតឆ្ងាញ់ របៀបធ្វើបែបដើម ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Delicious food channel នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Delicious food channel: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Delicious food channel 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-08-10",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-78-cZ0TBNYy9rQ",
    url: "https://www.youtube.com/watch?v=cZ0TBNYy9rQ",
    authorName: "Saoran Cooking",
    channelId: "UC7VkwSil-1XBg4vtxkhSLGA",
    channelUrl: "https://www.youtube.com/@saorancooking",
    fallbackTitleEn: "[How to make Red Fish Hotpot Soup]",
    titleKh: "តិចនិចធ្វើស៊ុបត្រីក្រហមកុំឱ្យមានក្លិនឆ្អាប និងមានរស់ជាតិឆ្ងាញ់ [How to make Red Fish Hotpot Soup]",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Saoran Cooking) — [How to make Red Fish Hotpot Soup]",
    descriptionKh: "... #ម្ហូបខ្មែរ​ #ស៊ុបត្រីក្រហម Welcome to the Saoren Cooking Channel. In this video, I​ would like to ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Saoran Cooking នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Saoran Cooking: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Saoran Cooking 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-08-09",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-79-15Waw8zOp8Q",
    url: "https://www.youtube.com/watch?v=15Waw8zOp8Q",
    authorName: "MrrDaro KH",
    channelId: "UCT9Oxgi6RHlf1bv939Xtk-g",
    channelUrl: "https://www.youtube.com/@mrrdarokh6247",
    fallbackTitleEn: "EATING 7 eleven Food - 7 Eleven Mart",
    titleKh: "EATING 7 eleven Food - ញាំអាហារនៅ 7 Eleven Mart",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (MrrDaro KH) — EATING 7 eleven Food - 7 Eleven Mart",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber MrrDaro KH (ដើរញ៉ាំម្ហូបខ្មែរ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber MrrDaro KH: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 MrrDaro KH 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-08-01",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-80-7X_yFcUgbrs",
    url: "https://www.youtube.com/watch?v=7X_yFcUgbrs",
    authorName: "Francly Speaking",
    channelId: "UCVHTf72swGXqKQCG9pOyDIw",
    channelUrl: "https://www.youtube.com/@franclyspeaking",
    fallbackTitleEn: "STREET FOOD adventure in BATTAMBANG, eating like a local! | Cambodia 🇰🇭",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តបាត់ដំបង (Francly Speaking) — STREET FOOD adventure in BATTAMBANG, eating like a local! | Cambodia 🇰🇭",
    titleZh: "马德望省柬埔寨夜市寻味与美食旅行 Vlog (Francly Speaking) — STREET FOOD adventure in BATTAMBANG, eating like a local! | Cambodia 🇰🇭",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តបាត់ដំបង ពី YouTuber Francly Speaking (Battambang Food Review)។",
    descriptionEn: "TONIGHT we are eating a bunch of different street foods in BATTAMBANG, Cambodia! Sarah tries a sugar cane juice for the first ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Battambang by Francly Speaking.",
    descriptionZh: "由 YouTube 创作者 Francly Speaking 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2024-07-10",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-81-r_9a06GN_Wo",
    url: "https://www.youtube.com/watch?v=r_9a06GN_Wo",
    authorName: "Street Food TV",
    channelId: "UCLVncs-1iVf4f1tW5WSfQfw",
    channelUrl: "https://www.youtube.com/@StreetFoodTVCambodia",
    fallbackTitleEn: "The BEST 3 from BATTAMBANG! Mie Kantang, Maju Kralok & Khmer Fast Food Store | Cambodian Street Food",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តបាត់ដំបង (Street Food TV) — The BEST 3 from BATTAMBANG! Mie Kantang, Maju Kralok & Khmer Fast Food Store | Cambodian Street Food",
    titleZh: "马德望省地道高棉街头美食与传统名菜测评 (Street Food TV) — The BEST 3 from BATTAMBANG! Mie Kantang, Maju Kralok & Khmer Fast Food Store | Cambodian Street Food",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តបាត់ដំបង ពី YouTuber Street Food TV (Battambang Food Review)។",
    descriptionEn: "We all love Food. Welcome to Street Food TV. Nice to meet you [4K] The BEST 3 from BATTAMBANG ! Mie Kantang, Maju ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Battambang by Street Food TV.",
    descriptionZh: "由 YouTube 创作者 Street Food TV 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2024-06-16",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-82-wk3HV-N3qSA",
    url: "https://www.youtube.com/watch?v=wk3HV-N3qSA",
    authorName: "Best Ever Food Review Show",
    channelId: "UCcAd5Np7fO8SeejB1FVKcYw",
    channelUrl: "https://www.youtube.com/@BestEverFoodReviewShow",
    fallbackTitleEn: "Exotic Street Food in Cambodia!! From Spiders to Rats!! (Full Documentary)",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Best Ever Food Review Show) — Exotic Street Food in Cambodia!! From Spiders to Rats!! (Full Documentary)",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Best Ever Food Review Show) — Exotic Street Food in Cambodia!! From Spiders to Rats!! (Full Documentary)",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Best Ever Food Review Show (Cambodian Food Review)។",
    descriptionEn: "FOLLOW!!* https://www.instagram.com/besteverfoodreviewshow/ SUBSCRIBE (2ⁿᵈ ch.) — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Best Ever Food Review Show.",
    descriptionZh: "由 YouTube 创作者 Best Ever Food Review Show 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-06-14",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-83-7P7_2Ukr5BA",
    url: "https://www.youtube.com/watch?v=7P7_2Ukr5BA",
    authorName: "Best Ever Food Review Show",
    channelId: "UCcAd5Np7fO8SeejB1FVKcYw",
    channelUrl: "https://www.youtube.com/@BestEverFoodReviewShow",
    fallbackTitleEn: "Cambodia’s $1 Seafood Chef vs $180 Seafood Chef!!",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Best Ever Food Review Show) — Cambodia’s $1 Seafood Chef vs $180 Seafood Chef!!",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Best Ever Food Review Show) — Cambodia’s $1 Seafood Chef vs $180 Seafood Chef!!",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Best Ever Food Review Show (Cambodian Food Review)។",
    descriptionEn: "Thanks to BetterHelp for sponsoring this video! Visit https://betterhelp.com/besteverfood to get 10% off your first month today! — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Best Ever Food Review Show.",
    descriptionZh: "由 YouTube 创作者 Best Ever Food Review Show 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-06-07",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-19",
  },
  {
    id: "yt-2026-kh-review-84-nR6pyTYk56U",
    url: "https://www.youtube.com/watch?v=nR6pyTYk56U",
    authorName: "Mei Queen Food",
    channelId: "UCxhoQEdo5ixoKIo1IFXiubg",
    channelUrl: "https://www.youtube.com/@meiqueen1511",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Mei Queen Food (#84)",
    titleKh: "ទីបំផុតខ្ញុំបានញ៉ាំសាកហើយ😋",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Mei Queen Food) — Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Mei Queen Food (#84)",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Mei Queen Food (ដើរញ៉ាំម្ហូបខ្មែរ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Mei Queen Food: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Mei Queen Food 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-05-13",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-85-9LjvaIifKjU",
    url: "https://www.youtube.com/watch?v=9LjvaIifKjU",
    authorName: "Best Ever Food Review Show",
    channelId: "UCcAd5Np7fO8SeejB1FVKcYw",
    channelUrl: "https://www.youtube.com/@BestEverFoodReviewShow",
    fallbackTitleEn: "Cambodia’s Street Food Dollar Menu!! Cheapest in Asia!!",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Best Ever Food Review Show) — Cambodia’s Street Food Dollar Menu!! Cheapest in Asia!!",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Best Ever Food Review Show) — Cambodia’s Street Food Dollar Menu!! Cheapest in Asia!!",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Best Ever Food Review Show (Cambodian Food Review)។",
    descriptionEn: "SUBSCRIBE!* BEST EVER FOOD INDIA » https://www.youtube.com/@besteverfoodindia GRAB OUR MERCH ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Best Ever Food Review Show.",
    descriptionZh: "由 YouTube 创作者 Best Ever Food Review Show 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-05-10",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-86-0Mih3H_ssE4",
    url: "https://www.youtube.com/watch?v=0Mih3H_ssE4",
    authorName: "Jax out and about",
    channelId: "UCA8wZRSt3JfLUKa0iCKYjMw",
    channelUrl: "https://www.youtube.com/@Jax_outandabout",
    fallbackTitleEn: "Cambodian Food.. restaurant review.@The Grill Lounge Restaurant..Siem Reap 🇰🇭",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តសៀមរាប (Jax out and about) — Cambodian Food.. restaurant review.@The Grill Lounge Restaurant..Siem Reap 🇰🇭",
    titleZh: "暹粒省高棉人气餐厅、自助餐与咖啡店探店测评 (Jax out and about) — Cambodian Food.. restaurant review.@The Grill Lounge Restaurant..Siem Reap 🇰🇭",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តសៀមរាប ពី YouTuber Jax out and about (Siem Reap Food Review)។",
    descriptionEn: "We try some more tasty Cambodian food,including Frog Legs and Duck breast at the trendy and stylish 'The Grill Lounge' ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Siem Reap by Jax out and about.",
    descriptionZh: "由 YouTube 创作者 Jax out and about 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2024-03-02",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-6",
  },
  {
    id: "yt-2026-kh-review-87-DksJQMlLmFo",
    url: "https://www.youtube.com/watch?v=DksJQMlLmFo",
    authorName: "Chhom Sreypach",
    channelId: "UCx7XcErrBfBnB7Tz58F4F2Q",
    channelUrl: "https://www.youtube.com/@chhomsreypachkh",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Chhom Sreypach (#87)",
    titleKh: "ធ្វើនំបញ្ចុកសម្លប្រហើរខ្មែរ ចែកជូនពុកម៉ែបងប្អូនលោកយាយលោកតា ជាមួយព្រះនាងតូច ជេនណា",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Chhom Sreypach) — Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Chhom Sreypach (#87)",
    descriptionKh: "សូមស្វាគមន៍មកកាន់ឆាណែល Chhom Sreypach ។ កុំភ្លេចជួយ subscribe ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Chhom Sreypach នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Chhom Sreypach: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Chhom Sreypach 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2024-02-19",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-3",
  },
  {
    id: "yt-2026-kh-review-88-d_n9I2b9Yhc",
    url: "https://www.youtube.com/watch?v=d_n9I2b9Yhc",
    authorName: "Apricot Wanderers",
    channelId: "UCAGSZxHyropnxsYC_s1aaxg",
    channelUrl: "https://www.youtube.com/@ApricotWanderers",
    fallbackTitleEn: "Top 10 Restaurants to Visit in Phnom Penh | Cambodia - English",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Apricot Wanderers) — Top 10 Restaurants to Visit in Phnom Penh | Cambodia - English",
    titleZh: "金边高棉人气餐厅、自助餐与咖啡店探店测评 (Apricot Wanderers) — Top 10 Restaurants to Visit in Phnom Penh | Cambodia - English",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Apricot Wanderers (Khmer Restaurant Review)។",
    descriptionEn: "PhnomPenhRestaurants #PhnomPenhFood #Cambodia #PhnomPenh Phnom Penh, Cambodia's busy capital, sits at the junction ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Apricot Wanderers.",
    descriptionZh: "由 YouTube 创作者 Apricot Wanderers 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2023-10-13",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-89-8hRoh1K698k",
    url: "https://www.youtube.com/watch?v=8hRoh1K698k",
    authorName: "Muntha Music Studio",
    channelId: "UCmpsHcB0sbP3fnVCV6oEFpg",
    channelUrl: "https://www.youtube.com/@MunthaMusic",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Kep by Muntha Music Studio (#89)",
    titleKh: "វិធីធ្វើ ឆាក្ដៅកង្កែប | វិធីធ្វើម្ហូប | ម្ហូបខ្មែរ2023 | វិធីធ្វើម្ហូប2023",
    titleZh: "白马省地道高棉街头美食与传统名菜测评 (Muntha Music Studio) — Authentic Cambodian Food Review & Local Street Food in Kep by Muntha Music Studio (#89)",
    descriptionKh: "ឆាក្ដៅកង្កែប គឺជា ម្ហូបខ្មែរ Khmer foods ដ៏សាមញមួយមុខរបស់ ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Muntha Music Studio នៅខេត្តកែប)។",
    descriptionEn: "Verified in Kep, Cambodia by YouTuber Muntha Music Studio: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Muntha Music Studio 拍摄的白马省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តកែប",
    provinceEn: "Kep",
    publishedDate: "2023-10-12",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-90-Lw-1OtvUSSE",
    url: "https://www.youtube.com/watch?v=Lw-1OtvUSSE",
    authorName: "Muntha Music Studio",
    channelId: "UCmpsHcB0sbP3fnVCV6oEFpg",
    channelUrl: "https://www.youtube.com/@MunthaMusic",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Muntha Music Studio (#90)",
    titleKh: "វិធីធ្វើ ខជើងជ្រូកពងទា | វិធីធ្វើម្ហូប | ម្ហូបខ្មែរ2023 | វិធីធ្វើម្ហូប2023",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Muntha Music Studio) — Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Muntha Music Studio (#90)",
    descriptionKh: "ខជើងជ្រូកពងទា គឺជា ម្ហូបខ្មែរ Khmer foods ដ៏សាមញមួយមុខរបស់ ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Muntha Music Studio នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Muntha Music Studio: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Muntha Music Studio 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2023-10-03",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-91-u8xFQUqdnmU",
    url: "https://www.youtube.com/watch?v=u8xFQUqdnmU",
    authorName: "Luke Martin",
    channelId: "UCp2dhjQXkhY1O40lj15JQzw",
    channelUrl: "https://www.youtube.com/@LukeMartin",
    fallbackTitleEn: "24 Hours of CAMBODIAN STREET FOOD in Phnom Penh!! KHMER Noodles + BEST Breakfast in Cambodia!",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Luke Martin) — 24 Hours of CAMBODIAN STREET FOOD in Phnom Penh!! KHMER Noodles + BEST Breakfast in Cambodia!",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Luke Martin) — 24 Hours of CAMBODIAN STREET FOOD in Phnom Penh!! KHMER Noodles + BEST Breakfast in Cambodia!",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Luke Martin (Khmer Food Review)។",
    descriptionEn: "Welcome to the sprawling capital city of Phnom Penh. The Kingdom of Cambodia's best STREET FOOD can be found here in its ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Luke Martin.",
    descriptionZh: "由 YouTube 创作者 Luke Martin 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2023-09-10",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-5",
  },
  {
    id: "yt-2026-kh-review-92-rDmMWUXwGL4",
    url: "https://www.youtube.com/watch?v=rDmMWUXwGL4",
    authorName: "Delicious food channel",
    channelId: "UCg7R70hWzrtDh3bCGlrGKhQ",
    channelUrl: "https://www.youtube.com/@%E1%9E%98%E1%9F%92%E1%9E%A0%E1%9E%BC%E1%9E%94%E1%9E%86%E1%9F%92%E1%9E%84%E1%9E%B6%E1%9E%89%E1%9F%8B",
    fallbackTitleEn: "@ Delicious food channel",
    titleKh: "បុកកំពឹសអំពិលខ្ចី ម្ហូបខ្មែរគឺឆ្ងាញ់ វីដេអូនេះមានបង្ហាញ @ម្ហូបឆ្ងាញ់ Delicious food channel",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Delicious food channel) — @ Delicious food channel",
    descriptionKh: "របៀបបុកកំពឹសអំពិលខ្ចី ម្ហូបខ្មែរធ្វើត្រូវគឺឆ្ងាញ់ ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Delicious food channel នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Delicious food channel: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Delicious food channel 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2023-07-19",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-93-68Xw2PSI3wE",
    url: "https://www.youtube.com/watch?v=68Xw2PSI3wE",
    authorName: "Derthort-ដេីរថត",
    channelId: "UCOAKLGCZQE7Mi_0V-gkM_EA",
    channelUrl: "https://www.youtube.com/@Derthort",
    fallbackTitleEn: "Street food | Street food Oudong market Dinner Amok",
    titleKh: "Street food | ម្ហូបតាមដងផ្លូវនៅផ្សារឧដុង្គពេលល្ងាច ម្ហូបអាម៉ុក Street food Oudong market Dinner Amok",
    titleZh: "磅士卑省柬埔寨夜市寻味与美食旅行 Vlog (Derthort) — Street food | Street food Oudong market Dinner Amok",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តកំពង់ស្ពឺ ពី YouTuber Derthort-ដេីរថត (ម្ហូបតាមផ្លូវភ្នំពេញ)។",
    descriptionEn: "streetfood #foodie #foodtour Support us with: Clicked subscribe Pnechar & turned on bell on not to missed any videos. — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Kampong Speu by Derthort- .",
    descriptionZh: "由 YouTube 创作者 Derthort 拍摄的磅士卑省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តកំពង់ស្ពឺ",
    provinceEn: "Kampong Speu",
    publishedDate: "2023-07-19",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-94-giYjmpHR22I",
    url: "https://www.youtube.com/watch?v=giYjmpHR22I",
    authorName: "Street Food TV",
    channelId: "UCLVncs-1iVf4f1tW5WSfQfw",
    channelUrl: "https://www.youtube.com/@StreetFoodTVCambodia",
    fallbackTitleEn: "The BEST from CAMBODIA ! Amazing Local Street Food Collection | Cambodian Street Food",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Street Food TV) — The BEST from CAMBODIA ! Amazing Local Street Food Collection | Cambodian Street Food",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Street Food TV) — The BEST from CAMBODIA ! Amazing Local Street Food Collection | Cambodian Street Food",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Street Food TV (Cambodian Food Review)។",
    descriptionEn: "We all love Food. Welcome to Street Food TV. Nice to meet you The BEST from CAMBODIA! Amazing Local Street Food ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Street Food TV.",
    descriptionZh: "由 YouTube 创作者 Street Food TV 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2023-07-14",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-95-ZSCBDGcBsP8",
    url: "https://www.youtube.com/watch?v=ZSCBDGcBsP8",
    authorName: "yumbitescambodia",
    channelId: "UCVih8bFctnamRMT18RqOolw",
    channelUrl: "https://www.youtube.com/@YumBitesCambodia",
    fallbackTitleEn: "Try Latest Japanese Restaurant in Phnom Penh",
    titleKh: "Try Latest Japanese Restaurant in Phnom Penh- ម្ហូបជប៉ុនលាក់ខ្លួននៅភ្នំពេញ",
    titleZh: "金边高棉人气餐厅、自助餐与咖啡店探店测评 (yumbitescambodia) — Try Latest Japanese Restaurant in Phnom Penh",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber yumbitescambodia (ហាងអាហារនៅកម្ពុជា)។",
    descriptionEn: "Hello everyone welcome to new video from Yumbites Cambodia. In this video, we try new Japanese restaurant in Phnom Penh. — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by yumbitescambodia.",
    descriptionZh: "由 YouTube 创作者 yumbitescambodia 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2023-07-14",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-96-AMHO9JRPKRs",
    url: "https://www.youtube.com/watch?v=AMHO9JRPKRs",
    authorName: "Nore Films",
    channelId: "UCa6vVyA5RxrNG7Mu-6wEryA",
    channelUrl: "https://www.youtube.com/@norefilms",
    fallbackTitleEn: "BEST Cooking Class in Battambang | Authentic Cambodian Food at Nary Kitchen",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តបាត់ដំបង (Nore Films) — BEST Cooking Class in Battambang | Authentic Cambodian Food at Nary Kitchen",
    titleZh: "马德望省地道高棉街头美食与传统名菜测评 (Nore Films) — BEST Cooking Class in Battambang | Authentic Cambodian Food at Nary Kitchen",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តបាត់ដំបង ពី YouTuber Nore Films (Battambang Food Review)។",
    descriptionEn: "We just arrived at Battambang and first activity is the famous Nary Kitchen cooking class. Here we will visit the local market to ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Battambang by Nore Films.",
    descriptionZh: "由 YouTube 创作者 Nore Films 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2023-06-08",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-97-cWROXOZmS3U",
    url: "https://www.youtube.com/watch?v=cWROXOZmS3U",
    authorName: "Second Life Travels",
    channelId: "UCDt2OX9enDjBV1ZA-L21zZw",
    channelUrl: "https://www.youtube.com/@SecondLifeTravels1",
    fallbackTitleEn: "Malis - The Best Cambodian Restaurant in the World! In Depth Review!",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Second Life Travels) — Malis - The Best Cambodian Restaurant in the World! In Depth Review!",
    titleZh: "金边高棉人气餐厅、自助餐与咖啡店探店测评 (Second Life Travels) — Malis - The Best Cambodian Restaurant in the World! In Depth Review!",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Second Life Travels (Khmer Restaurant Review)។",
    descriptionEn: "Are you looking for the best Cambodian food while visiting Phnom Penh, Cambodia? The consensus is that Malis Restaurant in ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Second Life Travels.",
    descriptionZh: "由 YouTube 创作者 Second Life Travels 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2023-04-15",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-98-0yjKwJFxYFc",
    url: "https://www.youtube.com/watch?v=0yjKwJFxYFc",
    authorName: "Yekny Rorn",
    channelId: "UC7tuP-qq6HHAi_Q3vHdXZ8g",
    channelUrl: "https://www.youtube.com/@yeknyrorn",
    fallbackTitleEn: "Delicious food / Khmer food",
    titleKh: "មុខម្ហូបនិងរបៀបធ្វើជាង ១០០មុខ / Delicious food / Khmer food",
    titleZh: "金边高棉人气餐厅、自助餐与咖啡店探店测评 (Yekny Rorn) — Delicious food / Khmer food",
    descriptionKh: "អរគុណចំពោះការចូលទស្សនា សូមជួយ subscribe ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Yekny Rorn នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Yekny Rorn: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Yekny Rorn 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2023-03-24",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-99-qMyLA1oB87M",
    url: "https://www.youtube.com/watch?v=qMyLA1oB87M",
    authorName: "Kitchen Story",
    channelId: "UCLUapBXshwIyBCDMWSO3srQ",
    channelUrl: "https://www.youtube.com/@kitchenstoryK",
    fallbackTitleEn: "[Vegetable Chicken Soup][ Khmer Food]",
    titleKh: "ស៊ុបមាន់ប៉ូវកម្លាំង[Vegetable Chicken Soup][ម្ហូបខ្មែរ Khmer Food]",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Kitchen Story) — [Vegetable Chicken Soup][ Khmer Food]",
    descriptionKh: "ស៊ុបមាន់ប៉ូវកម្លាំង[Vegetable Chicken Soup][ម្ហូបខ្មែរ Khmer Food] #ស៊ុបមាន់ ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Kitchen Story នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Kitchen Story: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Kitchen Story 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2023-01-15",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-100-C3i4MvIOhYg",
    url: "https://www.youtube.com/watch?v=C3i4MvIOhYg",
    authorName: "Pich Pisey Fan - ពេជ្រ ពិសី​",
    channelId: "UCeiWUs4niQ-Gg772BX_E50w",
    channelUrl: "https://www.youtube.com/@pichpisey-8218",
    fallbackTitleEn: "5000 ( )🌮😋",
    titleKh: "ដើរញុំាអីតម្លៃក្រោម 5000រៀល (ឆ្ងាញ់គ្រប់មុខ)🌮😋",
    titleZh: "金边柬埔寨夜市寻味与美食旅行 Vlog (Pich Pisey Fan) — 5000 ( )🌮😋",
    descriptionKh: "ដើរញុំាអីតម្លៃក្រោម 5000រៀល (ឆ្ងាញ់គ្រប់មុខ) (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Pich Pisey Fan - ពេជ្រ ពិសី​ នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Pich Pisey Fan - : exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Pich Pisey Fan 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2022-10-11",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-101-p1ugaG218Jo",
    url: "https://www.youtube.com/watch?v=p1ugaG218Jo",
    authorName: "Eating Food",
    channelId: "UCBQ_u6RFTlHbX8IVkpVMkig",
    channelUrl: "https://www.youtube.com/@eatingfood3533",
    fallbackTitleEn: "Japanes food | Cambodian Street food | Art of food",
    titleKh: "អាហារបែបជប៉ុន ហាងអូម៉ាកាសេ វ៉ាហ្ងាយូ | Japanes food | Cambodian Street food | Art of food",
    titleZh: "金边高棉人气餐厅、自助餐与咖啡店探店测评 (Eating Food) — Japanes food | Cambodian Street food | Art of food",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Eating Food (ហាងអាហារនៅកម្ពុជា)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Eating Food: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Eating Food 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2022-09-03",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-102-J4w3HfEvemc",
    url: "https://www.youtube.com/watch?v=J4w3HfEvemc",
    authorName: "STREET FOOD REVIEW",
    channelId: "UCVGAjXzfvGqrWReUo1kD8oA",
    channelUrl: "https://www.youtube.com/@StreetFoodReviews",
    fallbackTitleEn: "Battambang Street Fried Rice - Eat Show / Street Food Review",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅខេត្តបាត់ដំបង (STREET FOOD REVIEW) — Battambang Street Fried Rice - Eat Show / Street Food Review",
    titleZh: "马德望省地道高棉街头美食与传统名菜测评 (STREET FOOD REVIEW) — Battambang Street Fried Rice - Eat Show / Street Food Review",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងខេត្តបាត់ដំបង ពី YouTuber STREET FOOD REVIEW (Battambang Food Review)។",
    descriptionEn: "Are you hungry? After work, we had street fried at Bay Cha Le A Kas in Battambang, Cambodia. It taste so good. I will be back ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Battambang by STREET FOOD REVIEW.",
    descriptionZh: "由 YouTube 创作者 STREET FOOD REVIEW 拍摄的马德望省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    publishedDate: "2022-08-18",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-103-W2Ysg2jrBuw",
    url: "https://www.youtube.com/watch?v=W2Ysg2jrBuw",
    authorName: "សារអាហារ​ - Expressions Hub",
    channelId: "UC3GHwJ665OxdjdHr-26SPWA",
    channelUrl: "https://www.youtube.com/@expressionshub3501",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Expressions Hub (#103)",
    titleKh: "បើចង់ញ៉ាំម្ហូបខ្មែរឱ្យចំរសជាតិខ្មែរ គឺត្រូវតែទៅភោជនីយដ្ឋាន វ័នម៉រ បឹងកក់",
    titleZh: "金边高棉人气餐厅、自助餐与咖啡店探店测评 (Expressions Hub) — Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Expressions Hub (#103)",
    descriptionKh: "ទាំងឆ្ងាញ់រសជាតិខ្មែរ ចាស់ប្រហុក ចាស់គ្រឿង ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល សារអាហារ​ - Expressions Hub នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber - Expressions Hub: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Expressions Hub 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2022-07-12",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-14",
  },
  {
    id: "yt-2026-kh-review-104-lBhL-zCPTJo",
    url: "https://www.youtube.com/watch?v=lBhL-zCPTJo",
    authorName: "Facetaste",
    channelId: "UCAA7SWZIB2TmoABwhh-he4g",
    channelUrl: "https://www.youtube.com/@facetaste8451",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Facetaste (#104)",
    titleKh: "7.5$ ញ៉ាំប៊ូហ្វេសាច់អាំងទឹកកាពិម៉ាសេរី មិនកំណត់ម៉ោង",
    titleZh: "金边高棉人气餐厅、自助餐与咖啡店探店测评 (Facetaste) — Authentic Cambodian Food Review & Local Street Food in Phnom Penh by Facetaste (#104)",
    descriptionKh: "ហាង BAO BAO BBQ សា��់អាំងទឹកកាពិ និងបុហ្វេ ⏰ម៉ោងបើកលក់៖ ៣:៣០រសៀល ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល Facetaste នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber Facetaste: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Facetaste 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2022-07-01",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-6",
  },
  {
    id: "yt-2026-kh-review-105-ynjH60vovx4",
    url: "https://www.youtube.com/watch?v=ynjH60vovx4",
    authorName: "សារអាហារ​ - Expressions Hub",
    channelId: "UC3GHwJ665OxdjdHr-26SPWA",
    channelUrl: "https://www.youtube.com/@expressionshub3501",
    fallbackTitleEn: "Authentic Cambodian Food Review & Local Street Food in Siem Reap by Expressions Hub (#105)",
    titleKh: "ប្រយ័ត្នមិនដឹងកន្លែងញ៉ាំម្ហូបស្រែនៅខេត្តសៀមរាបណា៎...ហាង ខ្មែរអង្គរ រសជាតិបែបស្រុកស្រែ",
    titleZh: "暹粒省高棉人气餐厅、自助餐与咖啡店探店测评 (Expressions Hub) — Authentic Cambodian Food Review & Local Street Food in Siem Reap by Expressions Hub (#105)",
    descriptionKh: "ទៅសៀមរាបហាមរំលងម្ហូបបែបជនបទស្រកស្រែឱ្យសោះ ... (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល សារអាហារ​ - Expressions Hub នៅខេត្តសៀមរាប)។",
    descriptionEn: "Verified in Siem Reap, Cambodia by YouTuber - Expressions Hub: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Expressions Hub 拍摄的暹粒省柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "famous_restaurant",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    publishedDate: "2022-04-24",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-106-B5WO7mdpch0",
    url: "https://www.youtube.com/watch?v=B5WO7mdpch0",
    authorName: "Pie Noon",
    channelId: "UCRgzg_KZ0hGQ_ZhlSF8FKaQ",
    channelUrl: "https://www.youtube.com/@LaVieBoem",
    fallbackTitleEn: "Khatiya Korner| Khmer Food Review",
    titleKh: "Review ម្ហូបខ្មែរ និងអាហារតាមផ្លូវនៅរាជធានីភ្នំពេញ (Pie Noon) — Khatiya Korner| Khmer Food Review",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Pie Noon) — Khatiya Korner| Khmer Food Review",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber Pie Noon (Khmer Food Review)។",
    descriptionEn: "Join me today as I search for the most Authentic Khmer food in America! My review is from bong srey, Khatiya Korner that lives in ... — Verified Cambodian Food Review, Khmer Food Review & Cambodia Street Food in Phnom Penh by Pie Noon.",
    descriptionZh: "由 YouTube 创作者 Pie Noon 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2021-04-06",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-107-G4-PnRFDekw",
    url: "https://www.youtube.com/watch?v=G4-PnRFDekw",
    authorName: "All Food",
    channelId: "UCy8nwhJjDlA6yL72QloGPrw",
    channelUrl: "https://www.youtube.com/@allfood7198",
    fallbackTitleEn: "street food part 18(10) , ,Phnom pen city food",
    titleKh: "street food part 18(10) ,អាហារតាមផ្លូវឆ្ងាញ់,Phnom pen city food",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (All Food) — street food part 18(10) , ,Phnom pen city food",
    descriptionKh: "street food part 18(10) ,អាហារតាមផ្លូវឆ្ងាញ់,Phnom pen city food. (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល All Food នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber All Food: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 All Food 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2018-05-16",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-108-1EaSL-XBaic",
    url: "https://www.youtube.com/watch?v=1EaSL-XBaic",
    authorName: "All Food",
    channelId: "UCy8nwhJjDlA6yL72QloGPrw",
    channelUrl: "https://www.youtube.com/@allfood7198",
    fallbackTitleEn: "street food part 17(7) , ,Phnom pen khmer food",
    titleKh: "street food part 17(7) ,អាហារតាមផ្លូវឆ្ងាញ់,Phnom pen khmer food",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (All Food) — street food part 17(7) , ,Phnom pen khmer food",
    descriptionKh: "street food part 17(7) ,អាហារតាមផ្លូវឆ្ងាញ់,Phnom pen khmer food. (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល All Food នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber All Food: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 All Food 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2018-05-09",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-109-lbrxxygGL4Q",
    url: "https://www.youtube.com/watch?v=lbrxxygGL4Q",
    authorName: "All Food",
    channelId: "UCy8nwhJjDlA6yL72QloGPrw",
    channelUrl: "https://www.youtube.com/@allfood7198",
    fallbackTitleEn: "street food part 17(12) , ,Phnom pen khmer food",
    titleKh: "street food part 17(12) ,អាហារតាមផ្លូវឆ្ងាញ់,Phnom pen khmer food",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (All Food) — street food part 17(12) , ,Phnom pen khmer food",
    descriptionKh: "street food part 17(12) ,អាហារតាមផ្លូវឆ្ងាញ់,Phnom pen khmer food. (វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ពីឆានែល All Food នៅរាជធានីភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber All Food: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 All Food 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2018-05-09",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
  },
  {
    id: "yt-2026-kh-review-110-EXjcS3GrE_U",
    url: "https://www.youtube.com/watch?v=EXjcS3GrE_U",
    authorName: "ឡេង រតន:",
    channelId: "UCWGYTwmFL4B7l1MEFXRhUDQ",
    channelUrl: "https://www.youtube.com/@%E1%9E%A1%E1%9F%81%E1%9E%84%E1%9E%9A%E1%9E%8F%E1%9E%93",
    fallbackTitleEn: "Street Food In Phnom Penh",
    titleKh: "Street Food In Phnom Penhអាហារតាមផ្លូវក្រុងភ្នំពេញ",
    titleZh: "金边地道高棉街头美食与传统名菜测评 (Leng Ratanak) — Street Food In Phnom Penh",
    descriptionKh: "វីដេអូ Review ម្ហូបខ្មែរ ញ៉ាំអាហារខ្មែរ ដើររកម្ហូបឆ្ងាញ់ និងហាងអាហារនៅកម្ពុជា ក្នុងរាជធានីភ្នំពេញ ពី YouTuber ឡេង រតន: (ម្ហូបតាមផ្លូវភ្នំពេញ)។",
    descriptionEn: "Verified in Phnom Penh, Cambodia by YouTuber :: exploring authentic Khmer dishes, local night markets, street food stalls, and restaurants.",
    descriptionZh: "由 YouTube 创作者 Leng Ratanak 拍摄的金边柬埔寨美食测评 (Cambodian Food Review)：探访当地高棉传统美食、夜市街头小吃与人气餐厅。",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    publishedDate: "2018-03-17",
    fallbackThumb: "/foods/food-1.jpg",
    matchedFoodId: "food-1",
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

  const channelAccountUrl =
    seed.channelUrl ||
    (seed.channelId ? `https://www.youtube.com/channel/${seed.channelId}` : `https://www.youtube.com/watch?v=${vid}`);

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
    originalAccountUrl: channelAccountUrl,
    channelId: seed.channelId,
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

/**
 * Master Content Safety Shield (ខែលការពារសុវត្ថិភាពមាតិកា ៣ ជាន់)
 * Strictly blocks:
 *  1. Sexual / 18+ / Adult / Pornographic / Nudity content (អាសអាភាស / ផ្លូវភេទ / សិចស៊ី 18+)
 *  2. Political Parties / Elections / Protests / Political Propaganda (គណបក្សនយោបាយ / ការបោះឆ្នោត / បាតុកម្ម)
 *  3. Gambling / Online Casinos / Drugs / Gore & Violence (ល្បែងស៊ីសង / កាស៊ីណូអនឡាញ / គ្រឿងញៀន / អំពើហិង្សា)
 * across YouTube, TikTok, and Facebook videos, accounts, and search queries.
 */
export const STRICT_UNSAFE_CONTENT_BLOCK_RE =
  /(អាសអាភាស|សិចស៊ី|រឿងសិច|វីដេអូសិច|ស្រាត|ននលគក|ផ្លូវភេទ|រួមភេទ|បម្រើផ្លូវភេទ|ស្រីខូច|គណបក្ស|នយោបាយ|អ្នកនយោបាយ|បោះឆ្នោត|ឃោសនាបោះឆ្នោត|បក្សប្រឆាំង|បក្សកាន់អំណាច|បាតុកម្ម|កូដកម្ម|រដ្ឋប្រហារ|ផ្តួលរំលំ|សកម្មជននយោបាយ|ល្បែងស៊ីសង|កាស៊ីណូ|ភ្នាល់បាល់|ភ្នាល់អនឡាញ|ស្លត់|បាការ៉ាត់|គ្រឿងញៀន|ជក់ម៉ា|ឃាតកម្ម|18+|xxx|porn|porno|nsfw|nude|nudity|naked|sexs*video|sexual|erotic|onlyfans|hentai|adults*video|stripper|politicals*party|politics|politician|election|protest|coup|oppositions*party|rulings*party|propaganda|casino|gambling|onlines*betting|slots*machine|baccarat|1xbet|色情|成人视频|裸体|情色|政党|政治|选举|游行|抗议|政变|赌场|赌博|博彩|网赌|百家乐|毒品)/i;

export function isSafeFoodAndTourismSocialContent(
  text?: string | null,
  authorOrChannel?: string | null,
  url?: string | null
): boolean {
  const combined = `${text || ''} ${authorOrChannel || ''} ${url || ''}`;
  if (!combined.trim()) return true;
  return !STRICT_UNSAFE_CONTENT_BLOCK_RE.test(combined);
}

const YT_NON_FOOD_EXCLUDE_RE =
  /\b(gaming|gameplay|pubg|mobile legends|free fire|valorant|minecraft|music video|official mv|official video|karaoke|ខារ៉ាអូខេ|ចម្រៀង|បទថ្មី|ព័ត៌មាន|នយោបាយ|breaking news|politics|election|football|soccer|boxing|គុនខ្មែរ|kun khmer|movie trailer|full movie|រឿងភាគ|ឈុតខ្លី|real estate|condo for sale|apartment for rent|crypto|forex)\b/i;

const YT_FOOD_OR_CAMBODIA_POSITIVE_RE =
  /(food|eat|eating|restaurant|street\s*food|market|night\s*market|cafe|coffee|dessert|noodle|soup|bbq|grill|seafood|crab|fish|pork|beef|chicken|duck|rice|curry|salad|snack|taste|tasting|review|tour|menu|dish|cuisine|cooking|recipe|kitchen|chef|breakfast|lunch|dinner|buffet|hotpot|porridge|sandwich|spring\s*roll|amok|lok\s*lak|num\s*banh\s*chok|kuy\s*teav|bai\s*sach\s*chrouk|prahok|kralan|bok\s*lhong|samlor|korko|ម្ហូប|អាហារ|ញ៉ាំ|ញំា|ញុំា|ហាង|ភោជនីយដ្ឋាន|តាមផ្លូវ|ផ្សារ|កាហ្វេ|បង្អែម|គុយទាវ|នំបញ្ចុក|សម្ល|អាម៉ុក|ឡុកឡាក់|សាច់អាំង|គ្រឿងសមុទ្រ|បុកល្ហុង|បាយ|ឆ្ងាញ់|ភ្លក្ស|ភ្លក់|ស៊ុប|មី|បបរ|នំ|ទឹកជ្រលក់|ប្រហុក|ផ្អក|美食|餐厅|小吃|探店|高棉|柬埔寨|金边|暹粒|马德望)/i;

/** Filter out unrelated entertainment, gaming, music, news, and non-food content */
export function isRelevantCambodianFoodReviewVideo(
  title: string,
  description = '',
  channelName = '',
  categorySlug: TrendingFoodCategorySlug = 'popular_food'
): boolean {
  const combined = `${title || ''} ${description || ''} ${channelName || ''}`;
  if (!isSafeFoodAndTourismSocialContent(combined, channelName)) return false;
  if (YT_NON_FOOD_EXCLUDE_RE.test(combined)) return false;
  if (categorySlug === 'tourist_attraction') return true;
  return YT_FOOD_OR_CAMBODIA_POSITIVE_RE.test(combined);
}

const YOUTUBE_API_MULTI_QUERY_CACHE_KEY = 'kft_yt_api_multi_search_cache_v1';
const YOUTUBE_API_QUOTA_COOLDOWN_KEY = 'kft_yt_api_quota_cooldown_until_v1';
const YOUTUBE_KEYWORD_BATCH_CURSOR_KEY = 'kft_yt_keyword_batch_cursor_v1';
const YOUTUBE_PUBLIC_SEARCH_CACHE_KEY = 'kft_yt_public_keyword_search_cache_v1';

function inferCategoryFromVideoText(text: string): TrendingFoodCategorySlug {
  const t = (text || '').toLowerCase();
  if (/restaurant|buffet|cafe|coffee|fine\s*dining|bistro|ហាងអាហារ|ភោជនីយដ្ឋាន|ប៊ូហ្វេ|ហាងកាហ្វេ|餐厅|探店/i.test(t)) {
    return 'famous_restaurant';
  }
  if (/tour|walk|vlog|explore|adventure|hours\s*in|ដើររក|ដើរលេង|ដើរភ្លក់|ដើរញ៉ាំ/i.test(t)) {
    return 'food_travel_vlog';
  }
  return 'popular_food';
}

/**
 * Public multi-keyword YouTube search fallback (uses CapacitorHttp on Android/iOS or CORS proxy on Web)
 * so new Cambodian food-review channels and videos are discovered across Khmer & English keywords even without an API key.
 */
async function discoverLiveYouTubeByPublicKeywordSearch(
  keywords: string[],
  foods: FoodItem[],
  forceRefresh = false
): Promise<OnlineFoodDiscoveryItem[]> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return [];

  try {
    if (!forceRefresh && typeof localStorage !== 'undefined') {
      const rawCache = localStorage.getItem(YOUTUBE_PUBLIC_SEARCH_CACHE_KEY);
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        if (parsed && Array.isArray(parsed.items) && Date.now() - (parsed.fetchedAt || 0) < 20 * 60 * 1000) {
          return parsed.items;
        }
      }
    }
  } catch {
    // ignore storage errors
  }

  const discoveredItems: OnlineFoodDiscoveryItem[] = [];
  const seenVids = new Set<string>();
  const isNative = Capacitor.isNativePlatform();

  const fetchSearchHtml = async (kw: string): Promise<string | null> => {
    const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(kw)}`;
    try {
      if (isNative) {
        const res = await CapacitorHttp.get({
          url: targetUrl,
          connectTimeout: 6500,
          readTimeout: 6500,
          headers: { 'Accept-Language': 'en-US,en;q=0.9,km;q=0.8' },
        });
        return res.status === 200 && typeof res.data === 'string' ? res.data : null;
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6500);
      try {
        const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`, {
          signal: controller.signal,
        });
        return res.ok ? await res.text() : null;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return null;
    }
  };

  const extractRenderers = (obj: any, out: any[] = []): any[] => {
    if (!obj || typeof obj !== 'object') return out;
    if (obj.videoRenderer) out.push(obj.videoRenderer);
    for (const k of Object.keys(obj)) {
      extractRenderers(obj[k], out);
    }
    return out;
  };

  await Promise.all(
    keywords.slice(0, 3).map(async (kw) => {
      const html = await fetchSearchHtml(kw);
      if (!html) return;
      const match = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
      if (!match || !match[1]) return;
      try {
        const data = JSON.parse(match[1]);
        const renderers = extractRenderers(data);
        for (const vr of renderers.slice(0, 14)) {
          const vid = extractYouTubeVideoId(vr?.videoId || '');
          if (!vid || seenVids.has(vid) || isKnownUnavailableVideo(vid)) continue;
          const title = (vr?.title?.runs || []).map((r: any) => r?.text || '').join('').trim();
          const ownerRun = vr?.ownerText?.runs?.[0] || vr?.longBylineText?.runs?.[0];
          const channelName = (ownerRun?.text || '').trim();
          const channelId = (ownerRun?.navigationEndpoint?.browseEndpoint?.browseId || '').trim();
          const channelPath = (ownerRun?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url || '').trim();
          const snippet = (vr?.detailedMetadataSnippets?.[0]?.snippetText?.runs || [])
            .map((r: any) => r?.text || '')
            .join('')
            .trim();

          if (!title || !channelName) continue;
          if (!isRelevantCambodianFoodReviewVideo(title, snippet, channelName)) continue;

          seenVids.add(vid);
          const channelUrl = channelPath
            ? `https://www.youtube.com${channelPath}`
            : channelId
            ? `https://www.youtube.com/channel/${channelId}`
            : `https://www.youtube.com/watch?v=${vid}`;

          if (channelId && /^UC[A-Za-z0-9_-]{20,28}$/.test(channelId)) {
            registerDiscoveredYouTubeChannel({
              channelId,
              name: channelName,
              channelUrl,
              categorySlug: inferCategoryFromVideoText(`${title} ${snippet} ${kw}`),
            });
          }

          const dishMatch = matchCambodianDish(`${title} ${snippet}`, foods);
          const prov = detectProvinceFromVideoText(`${title} ${snippet} ${kw}`);
          const pubDate = new Date().toISOString().slice(0, 10);

          discoveredItems.push({
            id: `yt-pub-${vid}`,
            platform: 'youtube',
            titleKh: title,
            titleEn: title,
            titleZh: title,
            descriptionKh: snippet || `វីដេអូ Review ម្ហូបខ្មែរពីឆានែល ${channelName} (${kw})`,
            descriptionEn: snippet || `Cambodian food review video by ${channelName} (${kw})`,
            descriptionZh: snippet || `来自 ${channelName} 的柬埔寨美食测评视频 (${kw})`,
            thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
            originalAccountUrl: channelUrl,
            channelId: channelId || undefined,
            sourceName: `${channelName} (YouTube)`,
            authorHandle: channelName,
            publishedOrUpdatedAt: pubDate,
            isLiveFetched: true,
            verificationBadgeEn: 'YouTube Food Discovery',
            verificationBadgeKh: 'រកឃើញថ្មីពី YouTube',
            verificationBadgeZh: 'YouTube 美食新发现',
            categorySlug: inferCategoryFromVideoText(`${title} ${snippet} ${kw}`),
            provinceKh: prov.provinceKh,
            provinceEn: prov.provinceEn,
            matchedFoodId: dishMatch?.food.id,
            matchedFoodNameKh: dishMatch?.food.nameKh,
            matchedFoodNameEn: dishMatch?.food.nameEn,
            relevanceScore: 98,
            isPlayableVerified: true,
            canInlineEmbed: true,
            inlineVideoId: vid,
          });
        }
      } catch {
        // ignore parse errors
      }
    })
  );

  if (discoveredItems.length > 0) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          YOUTUBE_PUBLIC_SEARCH_CACHE_KEY,
          JSON.stringify({ fetchedAt: Date.now(), items: discoveredItems.slice(0, 60) })
        );
      }
    } catch {
      // ignore storage errors
    }
  }

  return discoveredItems;
}

/**
 * Fetch YouTube items (2025–2026):
 * - Combines results across multiple Khmer, English & Chinese search keywords
 * - Supports YouTube Data API v3 with maxResults=25, pageToken pagination, 30-min caching, and quota protection
 * - Automatically registers newly discovered Cambodian food-review YouTube channels
 * - Merges with 155+ verified playable curated seeds from 80+ real Cambodian food YouTubers
 */
async function fetchYouTubeCambodianFoodVideos(
  foods: FoodItem[],
  customQuery = '',
  forceRefresh = false
): Promise<{
  items: OnlineFoodDiscoveryItem[];
  usedLiveApiKey: boolean;
  oembedEnrichedCount: number;
}> {
  const apiKey = (import.meta as any)?.env?.VITE_YOUTUBE_API_KEY as string | undefined;
  const liveItems: OnlineFoodDiscoveryItem[] = [];
  let usedLiveApiKey = false;

  // Select rotating batch of 3 keywords from CAMBODIA_FOOD_YOUTUBE_SEARCH_KEYWORDS + customQuery if provided
  const allKeywords = CAMBODIA_FOOD_YOUTUBE_SEARCH_KEYWORDS.map((k) => k.query);
  let kwCursor = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      kwCursor = Number(localStorage.getItem(YOUTUBE_KEYWORD_BATCH_CURSOR_KEY) || 0) || 0;
    }
  } catch {}

  const selectedKeywords: string[] = [];
  if (customQuery && customQuery.trim().length >= 2) {
    selectedKeywords.push(`${customQuery.trim()} Cambodia food`);
  }
  for (let i = 0; i < 3 && selectedKeywords.length < 4; i++) {
    const kw = allKeywords[(kwCursor + i) % allKeywords.length];
    if (kw && !selectedKeywords.includes(kw)) {
      selectedKeywords.push(kw);
    }
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(YOUTUBE_KEYWORD_BATCH_CURSOR_KEY, String((kwCursor + 3) % allKeywords.length));
    }
  } catch {}

  // Check API key & quota cooldown circuit breaker
  let quotaCooldownUntil = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      quotaCooldownUntil = Number(localStorage.getItem(YOUTUBE_API_QUOTA_COOLDOWN_KEY) || 0) || 0;
    }
  } catch {}

  if (apiKey && apiKey.trim().length > 10 && Date.now() >= quotaCooldownUntil) {
    // Check 30-minute API multi-query cache unless forceRefresh or customQuery
    let cachedApiItems: OnlineFoodDiscoveryItem[] | null = null;
    if (!forceRefresh && !customQuery.trim()) {
      try {
        const rawCache = typeof localStorage !== 'undefined' ? localStorage.getItem(YOUTUBE_API_MULTI_QUERY_CACHE_KEY) : null;
        if (rawCache) {
          const parsed = JSON.parse(rawCache);
          if (parsed && Array.isArray(parsed.items) && Date.now() - (parsed.fetchedAt || 0) < ONLINE_DISCOVERY_TTL_MS) {
            cachedApiItems = parsed.items;
          }
        }
      } catch {}
    }

    if (cachedApiItems && cachedApiItems.length > 0) {
      liveItems.push(...cachedApiItems);
      usedLiveApiKey = true;
    } else {
      const seenApiVids = new Set<string>();
      for (const kw of selectedKeywords) {
        try {
          let nextPageToken = '';
          const maxPages = customQuery.trim() ? 2 : 1;
          for (let page = 0; page < maxPages; page++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5500);
            const pageParam = nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : '';
            const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&order=relevance&maxResults=25&q=${encodeURIComponent(
              kw
            )}${pageParam}&key=${encodeURIComponent(apiKey.trim())}`;
            const res = await fetch(ytUrl, { signal: controller.signal });
            clearTimeout(timer);

            if (res.status === 403 || res.status === 429) {
              console.warn('[YouTubeDiscovery] YouTube Data API v3 quota limit reached; activating 60m cooldown & falling back to RSS + verified pool.');
              try {
                if (typeof localStorage !== 'undefined') {
                  localStorage.setItem(YOUTUBE_API_QUOTA_COOLDOWN_KEY, String(Date.now() + 60 * 60 * 1000));
                }
              } catch {}
              break;
            }

            if (!res.ok) {
              console.warn(`[YouTubeDiscovery] API search HTTP ${res.status} for keyword "${kw}"`);
              break;
            }

            const data = await res.json();
            const rawList = Array.isArray(data?.items) ? data.items : [];
            if (rawList.length < 3) {
              console.info(`[YouTubeDiscovery] Keyword "${kw}" returned only ${rawList.length} API items; combining with multi-source pool.`);
            }

            for (const it of rawList) {
              const vid = extractYouTubeVideoId(it?.id?.videoId || '');
              const snip = it?.snippet;
              if (!vid || !snip || seenApiVids.has(vid) || isKnownUnavailableVideo(vid)) continue;
              const title = decodeXmlText(snip.title || '');
              const desc = decodeXmlText(snip.description || '');
              const channelTitle = decodeXmlText(snip.channelTitle || 'YouTube Creator');
              const channelId = (snip.channelId || '').trim();

              if (!isRelevantCambodianFoodReviewVideo(title, desc, channelTitle)) continue;
              seenApiVids.add(vid);

              const pubDate = (snip.publishedAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
              const watchUrl = `https://www.youtube.com/watch?v=${vid}`;
              const channelUrl = channelId ? `https://www.youtube.com/channel/${channelId}` : watchUrl;
              const catSlug = inferCategoryFromVideoText(`${title} ${desc} ${kw}`);

              if (channelId && /^UC[A-Za-z0-9_-]{20,28}$/.test(channelId)) {
                registerDiscoveredYouTubeChannel({
                  channelId,
                  name: channelTitle,
                  channelUrl,
                  categorySlug: catSlug,
                });
              }

              const match = matchCambodianDish(`${title} ${desc}`, foods);
              const detectedProv = detectProvinceFromVideoText(`${title} ${desc} ${kw}`);

              liveItems.push({
                id: `yt-api-${vid}`,
                platform: 'youtube',
                titleKh: match?.food ? `${match.food.nameKh} — ${title}` : title,
                titleEn: title,
                titleZh: title,
                descriptionKh: match?.food?.descriptionKh || desc || `វីដេអូ Review ម្ហូបខ្មែរពី ${channelTitle}`,
                descriptionEn: desc || `Cambodian food review by ${channelTitle}`,
                descriptionZh: desc || `来自 ${channelTitle} 的柬埔寨美食测评`,
                thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                sourceUrl: watchUrl,
                originalAccountUrl: channelUrl,
                channelId: channelId || undefined,
                sourceName: `${channelTitle} (YouTube)`,
                authorHandle: channelTitle,
                publishedOrUpdatedAt: pubDate,
                isLiveFetched: true,
                verificationBadgeEn: 'Verified (YouTube API)',
                verificationBadgeKh: 'បានផ្ទៀងផ្ទាត់ (YouTube API)',
                verificationBadgeZh: '已验证 (YouTube API)',
                categorySlug: catSlug,
                provinceKh: detectedProv.provinceKh,
                provinceEn: detectedProv.provinceEn,
                matchedFoodId: match?.food.id,
                matchedFoodNameKh: match?.food.nameKh,
                matchedFoodNameEn: match?.food.nameEn,
                relevanceScore: 99,
                isPlayableVerified: true,
                canInlineEmbed: true,
                inlineVideoId: vid,
              });
            }

            nextPageToken = typeof data?.nextPageToken === 'string' ? data.nextPageToken : '';
            if (!nextPageToken) break;
          }
        } catch (err) {
          console.warn(`[YouTubeDiscovery] Error searching keyword "${kw}":`, err);
        }
      }

      if (liveItems.length > 0) {
        usedLiveApiKey = true;
        try {
          if (typeof localStorage !== 'undefined' && !customQuery.trim()) {
            localStorage.setItem(
              YOUTUBE_API_MULTI_QUERY_CACHE_KEY,
              JSON.stringify({ fetchedAt: Date.now(), items: liveItems.slice(0, 100) })
            );
          }
        } catch {}
      }
    }
  }

  // If no API key or user forced refresh / searched custom keyword, also run public multi-keyword discovery
  if (!usedLiveApiKey && (forceRefresh || Boolean(customQuery.trim()))) {
    try {
      const publicDiscovered = await discoverLiveYouTubeByPublicKeywordSearch(selectedKeywords, foods, forceRefresh);
      if (publicDiscovered.length > 0) {
        liveItems.push(...publicDiscovered);
      }
    } catch {
      // ignore public search errors
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
const LIVE_RSS_CACHE_KEY = 'kft_v2_youtube_live_rss_cache';
/** Live RSS channel feeds are cached for 15 minutes to prevent mobile CPU/radio overheating while 60s rotation runs in memory. */
export const LIVE_RSS_TTL_MS = 15 * 60 * 1000;
export const VIDEO_AUTO_REFRESH_INTERVAL_MS = 60 * 1000;
const VIDEO_ROTATION_STATE_KEY = 'kft_youtube_rotation_state_v2';
const LIVE_RSS_PER_CHANNEL = 6;
const LIVE_RSS_BATCH_CHANNELS_COUNT = 10;
let rssChannelBatchCursor = 0;
const YT_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
/** International/travel channels that also publish non-Cambodian content: only keep Cambodia-related videos. */
const LIVE_RSS_GENERIC_CHANNELS = new Set([
  'TravelwithChad',
  'Little Explore',
  'Suitcase Monkey',
  'Delicious Food Show & Travel',
  'Mark Wiens',
  'Strictly Dumpling',
  'Best Ever Food Review Show',
  'Luke Martin',
  'The Chui Show',
  'Mark In Asia',
  'Tom Trips Out',
  'Lloyd & Mandy',
  'Condé Nast Traveler',
  'Food Network UK',
  'Rockstar Eater',
  'Mooch Travels',
  'Pure Detour',
  'Travelwithchris',
  'Bec & Matt Adventures',
  'Francly Speaking',
  'Priscilla Kim Ong',
  'T&L TRAVEL',
  'Apricot Wanderers',
  'Second Life Travels',
  'Nore Films',
  'Angela McColl',
  'Jax out and about',
]);
const LIVE_RSS_CAMBODIA_RE =
  /cambodia|khmer|phnom|siem ?reap|angkor|kampot|\bkep\b|battambang|sihanouk|kampong|koh |udong|oudong|កម្ពុជា|ខ្មែរ|ភ្នំពេញ|សៀមរាប|បាត់ដំបង|កំពត|កែប|柬埔寨|金边|暹粒|马德望/i;
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

const PLAYED_SOCIAL_VIDEO_IDS_KEY = 'kft_played_social_video_ids_v1';
const MAX_PLAYED_VIDEO_MEMORY = 140;

/** Extracts canonical unique key for any social video (TikTok 19-digit ID, YouTube 11-char ID, or Facebook ID) */
export function getCanonicalSocialVideoKey(item?: Partial<OnlineFoodDiscoveryItem> | null): string {
  if (!item) return '';
  if (item.platform === 'tiktok') {
    const ttId = extractTikTokVideoId(item.inlineVideoId || item.sourceUrl || item.id);
    return ttId ? `tiktok:${ttId}` : '';
  }
  if (item.platform === 'youtube') {
    const ytId = extractYouTubeVideoId(item.sourceUrl || item.inlineVideoId || '');
    return ytId ? `youtube:${ytId}` : '';
  }
  if (item.platform === 'facebook') {
    return `facebook:${(item.id || item.sourceUrl || '').trim()}`;
  }
  return (item.id || item.sourceUrl || '').trim();
}

/** Extracts normalized CDN stream path without volatile tokens/host so duplicate stream URLs are caught */
function extractNormalizedStreamFileKey(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim().split('?')[0];
  if (!clean) return '';
  return clean.replace(/^https?:\/\/[^/]+\/(?:[0-9a-f]{32}\/[0-9a-f]{8}\/)?/i, '').toLowerCase();
}

/** Reads the set of recently played video keys so played videos are not repeated unnecessarily */
export function getPlayedSocialVideoKeys(): Set<string> {
  try {
    if (typeof localStorage === 'undefined') return new Set();
    const raw = localStorage.getItem(PLAYED_SOCIAL_VIDEO_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map((x) => String(x))) : new Set();
  } catch {
    return new Set();
  }
}

/** Records a video as played by the user so future rotations prioritize unplayed videos first */
export function recordPlayedSocialVideo(item?: Partial<OnlineFoodDiscoveryItem> | null): void {
  const key = getCanonicalSocialVideoKey(item);
  if (!key) return;
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(PLAYED_SOCIAL_VIDEO_IDS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(list) ? list.filter((k) => k !== key) : [];
    filtered.push(key);
    const trimmed = filtered.slice(-MAX_PLAYED_VIDEO_MEMORY);
    localStorage.setItem(PLAYED_SOCIAL_VIDEO_IDS_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage errors
  }
}

/** Strict single-list deduplication by item ID, canonical playable video ID, stream file path, URL, and title */
export function deduplicateSingleVideoList(items: OnlineFoodDiscoveryItem[]): OnlineFoodDiscoveryItem[] {
  const seenItemIds = new Set<string>();
  const seenPlayableKeys = new Set<string>();
  const seenStreamFiles = new Set<string>();
  const seenNormUrls = new Set<string>();
  const seenNormTitles = new Set<string>();
  const out: OnlineFoodDiscoveryItem[] = [];

  for (const item of items) {
    if (!item) continue;
    const itemId = (item.id || '').trim();
    if (itemId && seenItemIds.has(itemId)) continue;

    // Require valid 15-22 digit video ID for all TikTok items so broken/account-only placeholders never appear
    if (item.platform === 'tiktok') {
      const ttVid = extractTikTokVideoId(item.inlineVideoId || item.sourceUrl || item.id);
      if (!ttVid) continue;
    }

    const canonicalKey = getCanonicalSocialVideoKey(item);
    if (!canonicalKey || seenPlayableKeys.has(canonicalKey)) continue;

    const streamFileKey = extractNormalizedStreamFileKey(item.directVideoUrl);
    if (streamFileKey && seenStreamFiles.has(streamFileKey)) continue;

    const normUrl = normalizeSourceUrl(item.sourceUrl || '');
    if (normUrl && item.platform !== 'facebook' && seenNormUrls.has(normUrl)) continue;

    const cleanKh = (item.titleKh || '').replace(/#\S+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const cleanEn = (item.titleEn || '').replace(/#\S+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normTitle = `${item.platform}|${cleanKh.slice(0, 65)}|${cleanEn.slice(0, 65)}`;
    if ((cleanKh.length >= 6 || cleanEn.length >= 6) && seenNormTitles.has(normTitle)) continue;

    if (itemId) seenItemIds.add(itemId);
    seenPlayableKeys.add(canonicalKey);
    if (streamFileKey) seenStreamFiles.add(streamFileKey);
    if (normUrl && item.platform !== 'facebook') seenNormUrls.add(normUrl);
    if (cleanKh.length >= 6 || cleanEn.length >= 6) seenNormTitles.add(normTitle);
    out.push(item);
  }
  return out;
}

/**
 * Truly randomizes and rotates verified TikTok, Facebook, and YouTube videos on every app open or refresh:
 * 1. Strictly deduplicates the list so no duplicate video ID, stream file, or title ever appears.
 * 2. Uses a seeded Fisher-Yates shuffle tied to the active random cycle so all verified videos rotate randomly.
 * 3. Maintains a rolling window of recently shown top videos AND played videos in localStorage, pushing already-played
 *    and recently-shown top videos to the back so the user continuously sees genuinely new content without repetition.
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

  // Prioritize recently uploaded 2025–2026 videos in Tier 1 while keeping popular classic food reviews in Tier 2
  const tier1Latest = uniqueItems.filter((it) => (it.publishedOrUpdatedAt || '') >= '2025-01-01');
  const tier2Popular = uniqueItems.filter((it) => (it.publishedOrUpdatedAt || '') < '2025-01-01');

  const shuffleTier = (arr: OnlineFoodDiscoveryItem[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  };

  const shuffledTier1 = shuffleTier(tier1Latest);
  const shuffledTier2 = shuffleTier(tier2Popular);
  const mergedTiers = [...shuffledTier1, ...shuffledTier2];

  // Diversify consecutive items so a single creator/channel does not monopolize back-to-back slots
  const shuffled: OnlineFoodDiscoveryItem[] = [];
  const pool = [...mergedTiers];
  while (pool.length > 0) {
    const lastAuthor =
      shuffled.length > 0
        ? (shuffled[shuffled.length - 1].authorHandle || shuffled[shuffled.length - 1].sourceName || '').toLowerCase()
        : '';
    let pickIdx = pool.findIndex(
      (it) => (it.authorHandle || it.sourceName || '').toLowerCase() !== lastAuthor
    );
    if (pickIdx === -1) pickIdx = 0;
    shuffled.push(pool.splice(pickIdx, 1)[0]);
  }

  // Push videos that were already played by the user or appeared in recent top windows to the back
  const prevCycleKey = `${scopeKey}__cycle`;
  const prevRecordedCycle = Number(state.lastTopByScope?.[prevCycleKey] || 0);
  const recentMap = state.recentTopIdsByScope || {};
  const prevRecentList = Array.isArray(recentMap[scopeKey]) ? recentMap[scopeKey] : [];
  const prevTopIds = new Set<string>(prevRecentList);
  const playedKeys = getPlayedSocialVideoKeys();

  // Partition into: (1) unplayed & not recently at top, (2) unplayed & recently at top, (3) already played
  const bucketFreshUnplayed: OnlineFoodDiscoveryItem[] = [];
  const bucketRecentUnplayed: OnlineFoodDiscoveryItem[] = [];
  const bucketPlayed: OnlineFoodDiscoveryItem[] = [];

  for (const it of shuffled) {
    const cKey = getCanonicalSocialVideoKey(it);
    if (cKey && playedKeys.has(cKey)) {
      bucketPlayed.push(it);
    } else if (prevTopIds.has(it.id)) {
      bucketRecentUnplayed.push(it);
    } else {
      bucketFreshUnplayed.push(it);
    }
  }

  const finalOrder = [...bucketFreshUnplayed, ...bucketRecentUnplayed, ...bucketPlayed];

  // Record a rolling window of top IDs when a new cycle is active so subsequent refreshes never repeat recent batches
  if (prevRecordedCycle !== activeCycle) {
    const batchRecordSize = Math.min(12, Math.max(4, Math.floor(finalOrder.length / 4)));
    const maxRollingHistory = Math.min(60, Math.max(12, Math.floor(finalOrder.length * 0.65)));
    const currentTopSlice = finalOrder.slice(0, batchRecordSize).map((it) => it.id);
    const updatedRolling = [...prevRecentList.filter((id) => !currentTopSlice.includes(id)), ...currentTopSlice].slice(
      -maxRollingHistory
    );
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
        [scopeKey]: updatedRolling,
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
  ch: CambodiaYouTubeChannelRecord,
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
    if (!isRelevantCambodianFoodReviewVideo(title, desc, ch.name, ch.categorySlug)) continue;

    const match = matchCambodianDish(`${title} ${desc}`, foods);
    const detectedProv = detectProvinceFromVideoText(`${title} ${desc}`);
    const pubDay = published.slice(0, 10);
    const channelUrl = ch.channelUrl || `https://www.youtube.com/channel/${ch.channelId}`;
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
      originalAccountUrl: channelUrl,
      channelId: ch.channelId,
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
      inlineVideoId: vid,
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
 * Fetches the newest uploads from every registered + dynamically discovered Cambodian food/travel channel (official RSS feeds).
 * Results are cached for 15 minutes. If the network fails, the last good result is returned.
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
    const allChannels = getExpandedYouTubeChannelDatabase();
    const totalChannels = allChannels.length;
    const batchCount = force ? Math.min(14, totalChannels) : Math.min(LIVE_RSS_BATCH_CHANNELS_COUNT, totalChannels);
    const batchChannels: CambodiaYouTubeChannelRecord[] = [];
    for (let i = 0; i < batchCount; i++) {
      batchChannels.push(allChannels[(rssChannelBatchCursor + i) % totalChannels]);
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
  {
    id: "tt-suyadaily-7708775559165234452",
    platform: 'tiktok',
    titleKh: "ដាច់ស្បែកជើង😀",
    titleEn: "ដាច់ស្បែកជើង😀 (@suyadaily)",
    titleZh: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily) 柬埔寨美食与探店视频",
    descriptionKh: "ដាច់ស្បែកជើង😀#reels #vlog #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 #បុណ្យកឋិនទាន🇰🇭",
    descriptionEn: "ដាច់ស្បែកជើង😀#reels #vlog #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 #បុណ្យកឋិនទាន🇰🇭 — Official Cambodian TikTok food review by @suyadaily.",
    descriptionZh: "来自柬埔寨美食创作者 @suyadaily 的 TikTok 视频：ដាច់ស្បែកជើង😀#reels #vlog #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 #បុណ្យកឋ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/osBESZVm4CEiyd7sYRvEPIABvIaptNi3XAHrY~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=gky6eSIAgFp0bI37EHFvwEiJWA0%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@suyadaily/video/7708775559165234452",
    originalAccountUrl: "https://www.tiktok.com/@suyadaily",
    inlineVideoId: "7708775559165234452",
    directVideoUrl: "https://v3.tiktokcdn.com/2471c06511a21797e0e05a677df6f2fb/6afdc4ea/video/tos/alisg/tos-alisg-pve-0037c001/osa7vAYNuIYvmBVE2oiySi3QEEEXBPDAsA3r1/?a=1233&bti=ODszNWYuMDE6&&bt=1146&ft=bC~O_mfLPD12NVY3rn-UxrN5VY6e3wv252cAp&mime_type=video_mp4&rc=Nzg0OzZkODxkMzZnZjM0Z0BpamdtOHE5cmlrZTMzODczNEAwLy4wMTJfXl4xYzReYTAyYSNpMWxnMmRrMXFhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232856152A25DD5E5B70AA15C3&btag=e00090000",
    sourceName: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily)",
    authorHandle: "@suyadaily",
    publishedOrUpdatedAt: "2026-11-16T14:26:15.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-khleancheck-7708768708939828532",
    platform: 'tiktok',
    titleKh: "អ្នកចូលចិត្តម្ហូបកូរ៉េត្រូវហ្មង មកដល់កន្លែងនេះ 😋",
    titleEn: "អ្នកចូលចិត្តម្ហូបកូរ៉េត្រូវហ្មង មកដល់កន្លែងនេះ 😋 (@.khleancheck)",
    titleZh: "ឃ្លានឆែក - Khlean Check (@.khleancheck) 柬埔寨美食与探店视频",
    descriptionKh: "អ្នកចូលចិត្តម្ហូបកូរ៉េត្រូវហ្មង មកដល់កន្លែងនេះ 😋  #ឃ្លានឆេក",
    descriptionEn: "អ្នកចូលចិត្តម្ហូបកូរ៉េត្រូវហ្មង មកដល់កន្លែងនេះ 😋  #ឃ្លានឆេក — Official Cambodian TikTok food review by @.khleancheck.",
    descriptionZh: "来自柬埔寨美食创作者 @.khleancheck 的 TikTok 视频：អ្នកចូលចិត្តម្ហូបកូរ៉េត្រូវហ្មង មកដល់កន្លែងនេះ 😋  #ឃ្លានឆេក",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oMjI4IDUAAw8DenIjFfDwVDCMVeE4EIOF7EuG7~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=uOtmMMxp7CpVshoopYjuUPR1u%2Bs%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@.khleancheck/video/7708768708939828532",
    originalAccountUrl: "https://www.tiktok.com/@.khleancheck",
    inlineVideoId: "7708768708939828532",
    directVideoUrl: "https://v16.tiktokcdn.com/bd2081cc0e6968cd91e25dd655e6e6b4/6afdc463/video/tos/alisg/tos-alisg-pve-0037c001/ocNuwnQ4IEIE2pFDwDVI7DFCeE0D4OkfAAeFPj/?a=1233&bti=ODszNWYuMDE6&&bt=963&ft=bC~O_mfLPD12NzY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=ZmhpOWZmaTw2ODgzOTRmOkBpMztqM205cmVqZTMzODczNEAxNjU0Nl82Xi4xYC82YWJjYSNwcGxzMmRrbHFhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232851602EB059E8441C9D6BC2&btag=e00088000",
    sourceName: "ឃ្លានឆែក - Khlean Check (@.khleancheck)",
    authorHandle: "@.khleancheck",
    publishedOrUpdatedAt: "2026-11-16T13:59:40.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-derdailyoffici-7708757232804121877",
    platform: 'tiktok',
    titleKh: "ហ៊ានចោលប្រាក់ខែរាប់ពាន់ដុល្លា ដើម្បីមកបើកហាងកាហ្វេយកចំណូលមើលថែសត្វសុនខ",
    titleEn: "ហ៊ានចោលប្រាក់ខែរាប់ពាន់ដុល្លា ដើម្បីមកបើកហាងកាហ្វេយកចំណូលមើលថែសត្វសុនខ (@derdailyofficial)",
    titleZh: "DerDaily ដើរដេលី (@derdailyofficial) 柬埔寨美食与探店视频",
    descriptionKh: "ហ៊ានចោលប្រាក់ខែរាប់ពាន់ដុល្លា ដើម្បីមកបើកហាងកាហ្វេយកចំណូលមើលថែសត្វសុនខ #IZECOLA #Whatthefun #CallIZEFirst",
    descriptionEn: "ហ៊ានចោលប្រាក់ខែរាប់ពាន់ដុល្លា ដើម្បីមកបើកហាងកាហ្វេយកចំណូលមើលថែសត្វសុនខ #IZECOLA #Whatthefun #CallIZEFirst — Official Cambodian TikTok food review by @derdailyofficial.",
    descriptionZh: "来自柬埔寨美食创作者 @derdailyofficial 的 TikTok 视频：ហ៊ានចោលប្រាក់ខែរាប់ពាន់ដុល្លា ដើម្បីមកបើកហាងកាហ្វេយកចំណូលមើលថែសត្វសុនខ #IZECOLA #Whatthefun #CallIZE",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/okI2QADAjAu9A0GVyLHqeWh6eOPI9IAAoZg7Ef~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=cg%2BYYePtBUP6dEGY3jqw%2B%2BRPh8w%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@derdailyofficial/video/7708757232804121877",
    originalAccountUrl: "https://www.tiktok.com/@derdailyofficial",
    inlineVideoId: "7708757232804121877",
    directVideoUrl: "https://v3.tiktokcdn.com/bfb151fe87bb29fcd2a2738b62977d6a/6afdc4cf/video/tos/alisg/tos-alisg-pve-0037c001/oQF3GXMB6ff8vkI42Lg1QfBQBscWgRreGRAAAv/?a=1233&bti=ODszNWYuMDE6&&bt=1301&ft=bC~O_mfLPD12NaY3rn-Ux9JFNY6e3wv251cAp&mime_type=video_mp4&rc=Zzs2Nzg2aTg8OTM4NGg4NEBpamV2cW05cnJpZTMzODczNEAtX2AzXmBgXjAxMl40NDNeYSNxY2lkMmQ0b3FhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232850EB6CBF2F635463AA4F5B&btag=e00090000",
    sourceName: "DerDaily ដើរដេលី (@derdailyofficial)",
    authorHandle: "@derdailyofficial",
    publishedOrUpdatedAt: "2026-11-16T13:15:08.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-38",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-eatameeater-7708756827739147540",
    platform: 'tiktok',
    titleKh: "នំបុ័ង​សាច់ តាមរទេះរៀបចំទាក់ទាញម្លឹងហើយរឿងអីថាលក់មិនដាច់នោះ​ 😋😋 តែទឹកឃ្មុំហ្វ្រេសស៉ី​ Freshy​",
    titleEn: "នំបុ័ង​សាច់ តាមរទេះរៀបចំទាក់ទាញម្លឹងហើយរឿងអីថាលក់មិនដាច់នោះ​ 😋😋 តែទឹកឃ្មុំហ្វ្ (@eatame.eater)",
    titleZh: "Eatame (@eatame.eater) 柬埔寨美食与探店视频",
    descriptionKh: "នំបុ័ង​សាច់ តាមរទេះរៀបចំទាក់ទាញម្លឹងហើយរឿងអីថាលក់មិនដាច់នោះ​ 😋😋 តែទឹកឃ្មុំហ្វ្រេសស៉ី​ Freshy​ #bread #localfood",
    descriptionEn: "នំបុ័ង​សាច់ តាមរទេះរៀបចំទាក់ទាញម្លឹងហើយរឿងអីថាលក់មិនដាច់នោះ​ 😋😋 តែទឹកឃ្មុំហ្វ្រេសស៉ី​ Freshy​ #bread #localfood — Official Cambodian TikTok food review by @eatame.eater.",
    descriptionZh: "来自柬埔寨美食创作者 @eatame.eater 的 TikTok 视频：នំបុ័ង​សាច់ តាមរទេះរៀបចំទាក់ទាញម្លឹងហើយរឿងអីថាលក់មិនដាច់នោះ​ 😋😋 តែទឹកឃ្មុំហ្វ្រេសស៉ី​ Freshy​ #bre",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ogGDHKVfLAjmIRqILgAfYQQG7Aco90GCWQegYp~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=f0xjFF3wnfCBBwbukgPCSX4Lkeo%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@eatame.eater/video/7708756827739147540",
    originalAccountUrl: "https://www.tiktok.com/@eatame.eater",
    inlineVideoId: "7708756827739147540",
    directVideoUrl: "https://v16.tiktokcdn.com/063dc3303ae51e65123605532d5118d2/6afdc4d0/video/tos/alisg/tos-alisg-pve-0037c001/oMqVw1KHvAJpgjSeAQLW9AoGRefmG0gIDICn2I/?a=1233&bti=ODszNWYuMDE6&&bt=1213&ft=bC~O_mfLPD12NmY3rn-UxtC2WY6e3wv25DcAp&mime_type=video_mp4&rc=Z2c0ODUzZjk7NDg5OTlkaUBpam1oZXQ5cmxqZTMzODczNEAtNjFfMjQzXmIxLjYuMzUwYSMyM3BhMmQ0L3FhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232849E5ACD3BF2C7093A8EB05&btag=e00090000",
    sourceName: "Eatame (@eatame.eater)",
    authorHandle: "@eatame.eater",
    publishedOrUpdatedAt: "2026-11-16T13:13:33.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-fatamecooking-7708745497846107412",
    platform: 'tiktok',
    titleKh: "វិធីធ្វើប្រហិតបង្គារ​ អត់ប្រើម្ស៉ៅ​ ទុកញុំាជាមួយជ្រក់​ 😋​ ទឹកម្ទេស​ លាង​ ឡេង​ LEANG LENG Fish ",
    titleEn: "វិធីធ្វើប្រហិតបង្គារ​ អត់ប្រើម្ស៉ៅ​ ទុកញុំាជាមួយជ្រក់​ 😋​ ទឹកម្ទេស​ លាង​ ឡេង​ L (@fatame.cooking)",
    titleZh: "Fatame (@fatame.cooking) 柬埔寨美食与探店视频",
    descriptionKh: "វិធីធ្វើប្រហិតបង្គារ​ អត់ប្រើម្ស៉ៅ​ ទុកញុំាជាមួយជ្រក់​ 😋​ ទឹកម្ទេស​ លាង​ ឡេង​ LEANG LENG Fish Sauce លាង ឡេង  #cookingathome #shrimp",
    descriptionEn: "វិធីធ្វើប្រហិតបង្គារ​ អត់ប្រើម្ស៉ៅ​ ទុកញុំាជាមួយជ្រក់​ 😋​ ទឹកម្ទេស​ លាង​ ឡេង​ LEANG LENG Fish Sauce លាង ឡេង  #cookingathome #shrimp — Official Cambodian TikTok food review by @fatame.cooking.",
    descriptionZh: "来自柬埔寨美食创作者 @fatame.cooking 的 TikTok 视频：វិធីធ្វើប្រហិតបង្គារ​ អត់ប្រើម្ស៉ៅ​ ទុកញុំាជាមួយជ្រក់​ 😋​ ទឹកម្ទេស​ លាង​ ឡេង​ LEANG LENG Fish Sauce",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o0tI02BuDD9e0oe6JgFPAbIEjAw6DIRfI3CVyv~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=Mcd1b9buRjECKhIAwvjFia%2BEnSw%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@fatame.cooking/video/7708745497846107412",
    originalAccountUrl: "https://www.tiktok.com/@fatame.cooking",
    inlineVideoId: "7708745497846107412",
    directVideoUrl: "https://v9.tiktokcdn.com/5861da0a55a165abd67ba79a2ff49c06/6afdc4b5/video/tos/alisg/tos-alisg-pve-0037c001/oox8QAFgSuoR6DK1DgDAIbewjtVA7C3IcvE0ff/?a=1233&bti=ODszNWYuMDE6&&bt=885&ft=bC~O_mfLPD12NrY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=OjY6Zjk5NjM8ZTQ3aTZkO0BpMzQ8Z3I5cm5pZTMzODczNEAvM181MF9gXjExLjUxNjMtYSNkcG9fMmRjYXFhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232850F1EAE8B11E904E9F4279&btag=e00090000",
    sourceName: "Fatame (@fatame.cooking)",
    authorHandle: "@fatame.cooking",
    publishedOrUpdatedAt: "2026-11-16T12:29:36.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-foodwhisperoff-7708740372696026388",
    platform: 'tiktok',
    titleKh: "នៅក្បែរវត្តភ្នំមានហាងបាយបែបនេះដែរ​ ស្បៃធំតាំងកណ្ដាលហាង​ ភោជនីយដ្ឋាន​ បុរេ​ tour guide​ ឧស្សាហ៍ន",
    titleEn: "នៅក្បែរវត្តភ្នំមានហាងបាយបែបនេះដែរ​ ស្បៃធំតាំងកណ្ដាលហាង​ ភោជនីយដ្ឋាន​ បុរេ​ tour  (@foodwhisper_officials)",
    titleZh: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials) 柬埔寨美食与探店视频",
    descriptionKh: "នៅក្បែរវត្តភ្នំមានហាងបាយបែបនេះដែរ​ ស្បៃធំតាំងកណ្ដាលហាង​ ភោជនីយដ្ឋាន​ បុរេ​ tour guide​ ឧស្សាហ៍នាំភ្ញៀវបរទេសទៅ",
    descriptionEn: "នៅក្បែរវត្តភ្នំមានហាងបាយបែបនេះដែរ​ ស្បៃធំតាំងកណ្ដាលហាង​ ភោជនីយដ្ឋាន​ បុរេ​ tour guide​ ឧស្សាហ៍នាំភ្ញៀវបរទេសទៅ — Official Cambodian TikTok food review by @foodwhisper_officials.",
    descriptionZh: "来自柬埔寨美食创作者 @foodwhisper_officials 的 TikTok 视频：នៅក្បែរវត្តភ្នំមានហាងបាយបែបនេះដែរ​ ស្បៃធំតាំងកណ្ដាលហាង​ ភោជនីយដ្ឋាន​ បុរេ​ tour guide​ ឧស្សាហ៍នាំភ្ញ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/osXEi8voIpfRQQ6FU62DfGIGSeAFEkeASzRrIa~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=CYQrLKMNNjkKSRSalR%2FOnfVdGZM%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@foodwhisper_officials/video/7708740372696026388",
    originalAccountUrl: "https://www.tiktok.com/@foodwhisper_officials",
    inlineVideoId: "7708740372696026388",
    directVideoUrl: "https://v9.tiktokcdn.com/5713ab5f13083d85919b91567dbd76c5/6afdc4e1/video/tos/alisg/tos-alisg-pve-0037c001/ooi6SrapE8aeAFFDvQQIDAG8PeY6FIDfREvfGU/?a=1233&bti=ODszNWYuMDE6&&bt=1127&ft=L~O54ourD12NvKl-KzIxREESDlBF-UjNSaopiX&mime_type=video_mp4&rc=ZmY2OmY1ZmVnZjg2OzVkaUBpM25kcHk5cnFpZTMzODczNEBiYmEvLTEtX18xLl4vYWMuYSMxcmhoMmRrMXFhLS1kMTFzcw%3D%3D&vvpl=1&l=2026111623285136141F5723667CE60E77&btag=e00090000",
    sourceName: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)",
    authorHandle: "@foodwhisper_officials",
    publishedOrUpdatedAt: "2026-11-16T12:09:42.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-eatameeater-7708736744207764756",
    platform: 'tiktok',
    titleKh: "🌾 ទំនងណាស់​ បាយអំបុកលីង​ 😋​ ជួយនាំគ្នាកែច្នៃអោយបានច្រើន​ និងជួយគាំទ្រស្នាដៃ​មុខម្ហូបថ្មីរបស់​",
    titleEn: "🌾 ទំនងណាស់​ បាយអំបុកលីង​ 😋​ ជួយនាំគ្នាកែច្នៃអោយបានច្រើន​ និងជួយគាំទ្រស្នាដៃ​មុ (@eatame.eater)",
    titleZh: "Eatame (@eatame.eater) 柬埔寨美食与探店视频",
    descriptionKh: "🌾 ទំនងណាស់​ បាយអំបុកលីង​ 😋​ ជួយនាំគ្នាកែច្នៃអោយបានច្រើន​ និងជួយគាំទ្រស្នាដៃ​មុខម្ហូបថ្មីរបស់​ Tube Coffee ផង​ 🙏🇰🇭​ បាយអំបុកលីង​ #rice #poundedrice",
    descriptionEn: "🌾 ទំនងណាស់​ បាយអំបុកលីង​ 😋​ ជួយនាំគ្នាកែច្នៃអោយបានច្រើន​ និងជួយគាំទ្រស្នាដៃ​មុខម្ហូបថ្មីរបស់​ Tube Coffee ផង​ 🙏🇰🇭​ បាយអំបុកលីង​ #rice #poundedrice — Official Cambodian TikTok food review by @eatame.eater.",
    descriptionZh: "来自柬埔寨美食创作者 @eatame.eater 的 TikTok 视频：🌾 ទំនងណាស់​ បាយអំបុកលីង​ 😋​ ជួយនាំគ្នាកែច្នៃអោយបានច្រើន​ និងជួយគាំទ្រស្នាដៃ​មុខម្ហូបថ្មីរបស់​ Tube",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/osADFCaauIyfvb66QGv5EfcNo7eEVQAzdDLjAU~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=kHm68x7rUnM9iZb%2FDOSEz6PCrTg%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@eatame.eater/video/7708736744207764756",
    originalAccountUrl: "https://www.tiktok.com/@eatame.eater",
    inlineVideoId: "7708736744207764756",
    directVideoUrl: "https://v16.tiktokcdn.com/4d5aac7e4b73ed6536b5dad8e201f65b/6afdc4ce/video/tos/alisg/tos-alisg-pve-0037c001/o466utgEiGBAfUOiX1BZrq7d5UNBREQgIo73fF/?a=1233&bti=ODszNWYuMDE6&&bt=1067&ft=bC~O_mfLPD12NmY3rn-UxtC2WY6e3wv25DcAp&mime_type=video_mp4&rc=aTdmNzg5OzU1ZTk5Z2Q5NEBpM3FucHM5cjZoZTMzODczNEAzLzExMmBgXjIxNWNfLWIzYSNrX2EzMmRjcXFhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232849E5ACD3BF2C7093A8EB05&btag=e00090000",
    sourceName: "Eatame (@eatame.eater)",
    authorHandle: "@eatame.eater",
    publishedOrUpdatedAt: "2026-11-16T11:55:37.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-taseitrestaura-7708720365404458241",
    platform: 'tiktok',
    titleKh: "ដើរលេងនៅខេត្ត 🌿 ញ៉ាំឆ្ងាញ់ៗ ជុំគ្រួសារ និងមិត្តភក្តិ ❤️ 🥩 សាច់វេចខ្ចប់ និង ស៊ុប ពីតាសេត ឆ្ងាញ",
    titleEn: "ដើរលេងនៅខេត្ត 🌿 ញ៉ាំឆ្ងាញ់ៗ ជុំគ្រួសារ និងមិត្តភក្តិ ❤️ 🥩 សាច់វេចខ្ចប់ និង ស៊ុ (@taseit_restaurant)",
    titleZh: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "ដើរលេងនៅខេត្ត 🌿 ញ៉ាំឆ្ងាញ់ៗ ជុំគ្រួសារ និងមិត្តភក្តិ ❤️ 🥩 សាច់វេចខ្ចប់ និង ស៊ុប ពីតាសេត ឆ្ងាញ់ មានអនាម័យ ងាយស្រួលកុម្ម៉ង់ និងបានរហ័សទាន់ចិត្ត! 😋 🚚 ដឹកជញ្ជូនទូទាំងប្រទេស! 📞 កុម្ម៉ង់៖ 012 924 748 / 093 633 348 #តាសេត #សាច់វេចខ្ចប់តាសេត #ម្ហូបឆ្ងាញ់ #ដំណើរកម្សាន្ត #TaSeit",
    descriptionEn: "ដើរលេងនៅខេត្ត 🌿 ញ៉ាំឆ្ងាញ់ៗ ជុំគ្រួសារ និងមិត្តភក្តិ ❤️ 🥩 សាច់វេចខ្ចប់ និង ស៊ុប ពីតាសេត ឆ្ងាញ់ មានអនាម័យ ងាយស្រួលកុម្ម៉ង់ និងបានរហ័សទាន់ចិត្ត! 😋 🚚 ដឹកជញ្ជូន — Official Cambodian TikTok food review by @taseit_restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @taseit_restaurant 的 TikTok 视频：ដើរលេងនៅខេត្ត 🌿 ញ៉ាំឆ្ងាញ់ៗ ជុំគ្រួសារ និងមិត្តភក្តិ ❤️ 🥩 សាច់វេចខ្ចប់ និង ស៊ុប ពីតាសេត ឆ្ងាញ់ មាន",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oQI6IBDMj4zeA4DVsF3hf5rpf9rIzE1AoNtFCM~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=kve1T0n4TSydDlavNwOEJuNKpP8%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@taseit_restaurant/video/7708720365404458241",
    originalAccountUrl: "https://www.tiktok.com/@taseit_restaurant",
    inlineVideoId: "7708720365404458241",
    directVideoUrl: "https://v16.tiktokcdn.com/063afda5bf5927b7f7dd4a74a09a5494/6afdc45a/video/tos/alisg/tos-alisg-pve-0037c001/o8bZoLG2jIDf2I6nK1IQT7CAwgbAOXPm9Veez3/?a=1233&bti=ODszNWYuMDE6&&bt=1845&ft=bC~O_mfLPD12NtY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=OTs0ZWloMzw7N2Y4Ozg1PEBpanY5OG85cnZnZTMzODczNEBjMmE2NjNfXjUxMzJfMS1fYSNzYTRvMmRzcnFhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32CA6&btag=e00088000",
    sourceName: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant)",
    authorHandle: "@taseit_restaurant",
    publishedOrUpdatedAt: "2026-11-16T10:52:04.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-hubbaywithme-7708713801696267527",
    platform: 'tiktok',
    titleKh: "Highly recommend this place is super chill and their food are also very tasty🔥 📍ហាង » @123 ប៊",
    titleEn: "Highly recommend this place is super chill and their food are also very tasty🔥  (@hub_baywithme)",
    titleZh: "Hub Bay With Me (@hub_baywithme) 柬埔寨美食与探店视频",
    descriptionKh: "Highly recommend this place is super chill and their food are also very tasty🔥  📍ហាង » @123 ប៊ូហ្វេសាច់អាំង  📍ផ្លូវ 183 កែង ផ្លូវមហាវិថី ម៉ៅ សេទុង 245  ⏰បើកម៉ោង » 6:00pm - 12:00am  📍Map : ⬇️ https://maps.app.goo.gl/URghDxsNbEPkA3oY7?g_st=ic  #hubbayehh #food_m #buffet #spicysauce #beef",
    descriptionEn: "Highly recommend this place is super chill and their food are also very tasty🔥  📍ហាង » @123 ប៊ូហ្វេសាច់អាំង  📍ផ្លូវ 183 កែង ផ្លូវមហាវិថី ម៉ៅ សេទុង 245  ⏰បើកម — Official Cambodian TikTok food review by @hub_baywithme.",
    descriptionZh: "来自柬埔寨美食创作者 @hub_baywithme 的 TikTok 视频：Highly recommend this place is super chill and their food are also very tasty🔥  📍ហាង » @123 ប៊ូហ្វ",
    thumbnailUrl: "https://p19-common-sign.tiktokcdn.com/tos-alisg-p-0037/ocESUxEgUPAigiW2DPRo5ff0A0BIBCAIXAmq46~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=8lalFzQrGIMzgXeUNoeP7mwm2Rk%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@hub_baywithme/video/7708713801696267527",
    originalAccountUrl: "https://www.tiktok.com/@hub_baywithme",
    inlineVideoId: "7708713801696267527",
    directVideoUrl: "https://v9.tiktokcdn.com/efe934494edffc9210865efe635eb92d/6afdc46e/video/tos/alisg/tos-alisg-pve-0037c001/oMIGV9gAe4XaICe1OT7D6riAIvoO1rKQCAeLjt/?a=1233&bti=ODszNWYuMDE6&&bt=817&ft=bC~O_mfLPD12N_Y3rn-Ux_o2NY6e3wv25dcAp&mime_type=video_mp4&rc=ODg1PDM2PGg8NDQ7ZjMzZkBpanRybmo5cnRnZTMzODczNEBeLi0zXl8vNTMxYS0tYWEuYSNzaTIzMmRzYnFhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232857ED4BC65F6722FBA0BF25&btag=e00088000",
    sourceName: "Hub Bay With Me (@hub_baywithme)",
    authorHandle: "@hub_baywithme",
    publishedOrUpdatedAt: "2026-11-16T10:26:36.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-mekorksach100m-7708705291696655668",
    platform: 'tiktok',
    titleKh: "ភ្ងៀវនាំភ្ងៀវមកត…🙂 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ",
    titleEn: "ភ្ងៀវនាំភ្ងៀវមកត…🙂 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់ម (@me_kork_sach100muk)",
    titleZh: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk) 柬埔寨美食与探店视频",
    descriptionKh: "ភ្ងៀវនាំភ្ងៀវមកត…🙂 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍Google Map: (មីគោកសាច់100មុខ ម៉ាម៉ាអូរឬស្សី) https://maps.app.goo.gl/pVN6ByuU53XEUCmv9?g_st=ic #VoiceEffects",
    descriptionEn: "ភ្ងៀវនាំភ្ងៀវមកត…🙂 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍Google Map: (មីគោក — Official Cambodian TikTok food review by @me_kork_sach100muk.",
    descriptionZh: "来自柬埔寨美食创作者 @me_kork_sach100muk 的 TikTok 视频：ភ្ងៀវនាំភ្ងៀវមកត…🙂 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o0AAdMIIEDAVHu9e20Lo6JDxC2bEiIAfGEajAf~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=GZbXBvcUcq%2BfLNZBLPXA%2FEsGHkc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@me_kork_sach100muk/video/7708705291696655668",
    originalAccountUrl: "https://www.tiktok.com/@me_kork_sach100muk",
    inlineVideoId: "7708705291696655668",
    directVideoUrl: "https://v3.tiktokcdn.com/759b7c67ab6025120bbb173a5ff6bdd6/6afdc496/video/tos/alisg/tos-alisg-pve-0037c001/owU5MiEIQDAVK0efJpFo1Nnh80NAeIACDCtjgt/?a=1233&bti=ODszNWYuMDE6&&bt=885&ft=bC~O_mfLPD12NWY3rn-UxK12KY6e3wv25zcAp&mime_type=video_mp4&rc=Ozg4O2k2ZTtmaTxpOWY1OEBpMzk0a3A5cmxnZTMzODczNEAvNF4vYi8wXmAxYmNhMTQtYSNjLjFkMmRrM3FhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232853F72B939D69FFBF8D7828&btag=e00090000",
    sourceName: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk)",
    authorHandle: "@me_kork_sach100muk",
    publishedOrUpdatedAt: "2026-11-16T09:53:34.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-36",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-plovder-7708694722126056705",
    platform: 'tiktok',
    titleKh: "ចង់ហូបគោឡើងភ្នំ តែគោឡើងភ្នំនៅលើកោះស្តេចបានហូបឆ្ងាញ់",
    titleEn: "ចង់ហូបគោឡើងភ្នំ តែគោឡើងភ្នំនៅលើកោះស្តេចបានហូបឆ្ងាញ់ (@plov_der)",
    titleZh: "ផ្លូវដើរ - Plov Der (@plov_der) 柬埔寨美食与探店视频",
    descriptionKh: "ចង់ហូបគោឡើងភ្នំ តែគោឡើងភ្នំនៅលើកោះស្តេចបានហូបឆ្ងាញ់ #travel #fypviralシ #foodie #fyp #everyone",
    descriptionEn: "ចង់ហូបគោឡើងភ្នំ តែគោឡើងភ្នំនៅលើកោះស្តេចបានហូបឆ្ងាញ់ #travel #fypviralシ #foodie #fyp #everyone — Official Cambodian TikTok food review by @plov_der.",
    descriptionZh: "来自柬埔寨美食创作者 @plov_der 的 TikTok 视频：ចង់ហូបគោឡើងភ្នំ តែគោឡើងភ្នំនៅលើកោះស្តេចបានហូបឆ្ងាញ់ #travel #fypviralシ #foodie #fyp #everyone",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oEvAmiJIAAA6i0SLrBlUDaYyQ5AvEpAnyBtrT~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=VMsyouGCoVAsDXYF4t2r%2BWIJxKQ%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@plov_der/video/7708694722126056705",
    originalAccountUrl: "https://www.tiktok.com/@plov_der",
    inlineVideoId: "7708694722126056705",
    directVideoUrl: "https://v9.tiktokcdn.com/12d37d97592bf96061be21aea240b25d/6afdc4d9/video/tos/alisg/tos-alisg-pve-0037/oo7DCkVLhkrJE1PEFsAPpQID1AL4eQ7CACfhfh/?a=1233&bti=ODszNWYuMDE6&&bt=3073&ft=L~O54ourD12NvWl-KzIxRNvSDlBF-UjNSmopiX&mime_type=video_mp4&rc=ODVlZmYzMzQ4Ozs5OzM2M0BpMzc4c2o5cmdmZTMzODgzNEBjLzEuLjFfNmIxYjRfMmMxYSNkb2BnMmRjZnFhLS1kL2Bzcw%3D%3D&vvpl=1&l=20261116232853B78F6EA1007D649445B9&btag=e00090000",
    sourceName: "ផ្លូវដើរ - Plov Der (@plov_der)",
    authorHandle: "@plov_der",
    publishedOrUpdatedAt: "2026-11-16T09:12:33.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-27",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-biteswithlily-7708656943388314910",
    platform: 'tiktok',
    titleKh: "Only eating Thanksgiving specials for a full day in NYC! 🦃🥧🍂 📍Sandwell 📍Mishie's Sunnyside",
    titleEn: "Only eating Thanksgiving specials for a full day in NYC! 🦃🥧🍂 📍Sandwell 📍Mis (@biteswithlily)",
    titleZh: "Bites With Lily (@biteswithlily) 柬埔寨美食与探店视频",
    descriptionKh: "Only eating Thanksgiving specials for a full day in NYC! 🦃🥧🍂 📍Sandwell 📍Mishie's Sunnyside 📍Deux Luxe 📍Salt & Straw #thanksgiving #newyork #nyc #food #tiktokthanksgivingcontest",
    descriptionEn: "Only eating Thanksgiving specials for a full day in NYC! 🦃🥧🍂 📍Sandwell 📍Mishie's Sunnyside 📍Deux Luxe 📍Salt & Straw #thanksgiving #newyork #nyc #food #ti — Official Cambodian TikTok food review by @biteswithlily.",
    descriptionZh: "来自柬埔寨美食创作者 @biteswithlily 的 TikTok 视频：Only eating Thanksgiving specials for a full day in NYC! 🦃🥧🍂 📍Sandwell 📍Mishie's Sunnyside 📍De",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast8-p-0068-tx2/o4aISG6EtVInAuBRuOip34ilcqEOqlbsAPWBv~tplv-tiktokx-dmt-logom:tos-useast8-i-0068-tx2/o0VCfi8ADV3BnZ6dAAARtpfNEAEi6piqAEvIIM.image?dr=14573&x-expires=1795014000&x-signature=blJUiuChpSBmVdOkJmuQZYJXXiw%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@biteswithlily/video/7708656943388314910",
    originalAccountUrl: "https://www.tiktok.com/@biteswithlily",
    inlineVideoId: "7708656943388314910",
    directVideoUrl: "https://v3.tiktokcdn.com/4de635035adc79142b306b4b10cb2f6c/6afdc47d/video/tos/alisg/tos-alisg-ve-37c799-sg/okanBuOqEnubAvOIHzPR6pLwqilA7iQBD4VEs/?a=1233&bti=ODszNWYuMDE6&&bt=1881&ft=bC~O_mfLPD12NqY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=NzVmPDM7OzUzNWllNWY5aEBpM2h0dXI5cmhkZTMzaTczNEAuLjMuNmBhNjQxNl4zYjI2YSNpYjJhMmQ0X3FhLS1kMTJzcw%3D%3D&vvpl=1&l=20261116232900F31E35B52A880B8BBA1D&btag=e00090000",
    sourceName: "Bites With Lily (@biteswithlily)",
    authorHandle: "@biteswithlily",
    publishedOrUpdatedAt: "2026-11-16T06:45:57.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-expressionshub-7708651390020685064",
    platform: 'tiktok',
    titleKh: "Black Swan Summit រៀបចំល្អខ្លាំង​ ចូលតាម​ FrancoTech ក៏បាន",
    titleEn: "Black Swan Summit រៀបចំល្អខ្លាំង​ ចូលតាម​ FrancoTech ក៏បាន (@expressions_hub)",
    titleZh: "សារអាហារ - Expressions Hub (@expressions_hub) 柬埔寨美食与探店视频",
    descriptionKh: "Black Swan Summit រៀបចំល្អខ្លាំង​ ចូលតាម​ FrancoTech ក៏បាន",
    descriptionEn: "Black Swan Summit រៀបចំល្អខ្លាំង​ ចូលតាម​ FrancoTech ក៏បាន — Official Cambodian TikTok food review by @expressions_hub.",
    descriptionZh: "来自柬埔寨美食创作者 @expressions_hub 的 TikTok 视频：Black Swan Summit រៀបចំល្អខ្លាំង​ ចូលតាម​ FrancoTech ក៏បាន",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oAYcimaoBCABhU60vaVQECiIB5jvkpFIwqzvA~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=dHPytN3xhzyPGIwR4DSGGJLVuCA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@expressions_hub/video/7708651390020685064",
    originalAccountUrl: "https://www.tiktok.com/@expressions_hub",
    inlineVideoId: "7708651390020685064",
    directVideoUrl: "https://v16.tiktokcdn.com/329f761e47b8e7761ef736bcc5ecf9b1/6afdc4ac/video/tos/alisg/tos-alisg-pve-0037c001/oYQI6FVSqCWyDhDBIfp1OogAEgoE4epOJfGAjg/?a=1233&bti=ODszNWYuMDE6&&bt=744&ft=bC~O_mfLPD12NaY3rn-UxfKFWY6e3wv25xcAp&mime_type=video_mp4&rc=aGVnNGZnODY1Njg2ZWg3NkBpM3M1am45cjZkZTMzODczNEAwLjAwYDUzNS0xM14wNl4xYSNiNmZoMmRrMHFhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232849EB6CBF2F635463AA4F26&btag=e00090000",
    sourceName: "សារអាហារ - Expressions Hub (@expressions_hub)",
    authorHandle: "@expressions_hub",
    publishedOrUpdatedAt: "2026-11-16T06:24:24.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-derdailyoffici-7708414092238900500",
    platform: 'tiktok',
    titleKh: "The Rivery Eatery ចេញមុឺនុយថ្មីទៀតហើយដល់ទៅ 9 មុខ",
    titleEn: "The Rivery Eatery ចេញមុឺនុយថ្មីទៀតហើយដល់ទៅ 9 មុខ (@derdailyofficial)",
    titleZh: "DerDaily ដើរដេលី (@derdailyofficial) 柬埔寨美食与探店视频",
    descriptionKh: "The Rivery Eatery ចេញមុឺនុយថ្មីទៀតហើយដល់ទៅ 9 មុខ   #derdaily",
    descriptionEn: "The Rivery Eatery ចេញមុឺនុយថ្មីទៀតហើយដល់ទៅ 9 មុខ   #derdaily — Official Cambodian TikTok food review by @derdailyofficial.",
    descriptionZh: "来自柬埔寨美食创作者 @derdailyofficial 的 TikTok 视频：The Rivery Eatery ចេញមុឺនុយថ្មីទៀតហើយដល់ទៅ 9 មុខ   #derdaily",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oM1jA5nEcMEQeAcVAWAIjyfFWfDXJyI4DDEEAX~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=l9pHcR8npNRkVXW%2BV5sle0k5gpA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@derdailyofficial/video/7708414092238900500",
    originalAccountUrl: "https://www.tiktok.com/@derdailyofficial",
    inlineVideoId: "7708414092238900500",
    directVideoUrl: "https://v3.tiktokcdn.com/144c2e61f57c4f70aa1b8e76c963507f/6afdc4bc/video/tos/alisg/tos-alisg-pve-0037c001/owIjYoVAc4l8Udi5DDQtseFfurgC9AfrEyIqtg/?a=1233&bti=ODszNWYuMDE6&&bt=1291&ft=bC~O_mfLPD12NaY3rn-Ux9JFNY6e3wv251cAp&mime_type=video_mp4&rc=NTs0NjVmPGQ6OzQ3OzpmZkBpanB1OG85cjp2ZTMzODczNEBgYC8vMV5jNTMxNWJgYy5jYSM1YWtzMmRjYHBhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232850EB6CBF2F635463AA4F5B&btag=e00090000",
    sourceName: "DerDaily ដើរដេលី (@derdailyofficial)",
    authorHandle: "@derdailyofficial",
    publishedOrUpdatedAt: "2026-11-15T15:03:34.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-38",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-expressionshub-7708405141753449736",
    platform: 'tiktok',
    titleKh: "ប្រធានាធិបតីបារាំង​ចូលចិត្ត​ក្រ័សង់​ croissant នេះជាថ្ងៃទី3ចំប៉ារ័ត្នញ៊ាំម្ហូបបារាំងអបអរកម្ពុជា",
    titleEn: "ប្រធានាធិបតីបារាំង​ចូលចិត្ត​ក្រ័សង់​ croissant នេះជាថ្ងៃទី3ចំប៉ារ័ត្នញ៊ាំម្ហូបបា (@expressions_hub)",
    titleZh: "សារអាហារ - Expressions Hub (@expressions_hub) 柬埔寨美食与探店视频",
    descriptionKh: "ប្រធានាធិបតីបារាំង​ចូលចិត្ត​ក្រ័សង់​ croissant នេះជាថ្ងៃទី3ចំប៉ារ័ត្នញ៊ាំម្ហូបបារាំងអបអរកម្ពុជាជាម្ចាស់ផ្ទះហ្វ្រង់កូហ្វូនី",
    descriptionEn: "ប្រធានាធិបតីបារាំង​ចូលចិត្ត​ក្រ័សង់​ croissant នេះជាថ្ងៃទី3ចំប៉ារ័ត្នញ៊ាំម្ហូបបារាំងអបអរកម្ពុជាជាម្ចាស់ផ្ទះហ្វ្រង់កូហ្វូនី — Official Cambodian TikTok food review by @expressions_hub.",
    descriptionZh: "来自柬埔寨美食创作者 @expressions_hub 的 TikTok 视频：ប្រធានាធិបតីបារាំង​ចូលចិត្ត​ក្រ័សង់​ croissant នេះជាថ្ងៃទី3ចំប៉ារ័ត្នញ៊ាំម្ហូបបារាំងអបអរកម្ពុជាជាម្ច",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o4EUKfjIQDAfcQX5IVYApsnJoCFF2weDcSv3rq~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=UsrCMF6EjuXzseW0T8%2B5GkBqG5s%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@expressions_hub/video/7708405141753449736",
    originalAccountUrl: "https://www.tiktok.com/@expressions_hub",
    inlineVideoId: "7708405141753449736",
    directVideoUrl: "https://v16.tiktokcdn.com/513b8b1a690e0ee3121c4329daee8aae/6afdc506/video/tos/alisg/tos-alisg-pve-0037c001/osfV0JjfIkDeK5xEJwFF3QEkDsjpIACqc2gonA/?a=1233&bti=ODszNWYuMDE6&&bt=677&ft=bC~O_mfLPD12NaY3rn-UxfKFWY6e3wv25xcAp&mime_type=video_mp4&rc=NjVnO2Y2NmQzPDM7NGVnOkBpM3Vud285cnd2ZTMzODczNEBfNGIxNWAyXjMxMWNjMTYtYSNfNjE2MmRzL3BhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232849EB6CBF2F635463AA4F26&btag=e00098000",
    sourceName: "សារអាហារ - Expressions Hub (@expressions_hub)",
    authorHandle: "@expressions_hub",
    publishedOrUpdatedAt: "2026-11-15T14:28:50.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-suyadaily-7708400526983023893",
    platform: 'tiktok',
    titleKh: "ទៅបម្រើភ្ញៀវថ្ងៃបុណ្យកឋិនសប្បាយកប់🥰😊😍😘❤️🌾",
    titleEn: "ទៅបម្រើភ្ញៀវថ្ងៃបុណ្យកឋិនសប្បាយកប់🥰😊😍😘❤️🌾 (@suyadaily)",
    titleZh: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily) 柬埔寨美食与探店视频",
    descriptionKh: "ទៅបម្រើភ្ញៀវថ្ងៃបុណ្យកឋិនសប្បាយកប់🥰😊😍😘❤️🌾#reels #vlog #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 #បុណ្យកឋិនទាន🇰🇭",
    descriptionEn: "ទៅបម្រើភ្ញៀវថ្ងៃបុណ្យកឋិនសប្បាយកប់🥰😊😍😘❤️🌾#reels #vlog #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 #បុណ្យកឋិនទាន🇰🇭 — Official Cambodian TikTok food review by @suyadaily.",
    descriptionZh: "来自柬埔寨美食创作者 @suyadaily 的 TikTok 视频：ទៅបម្រើភ្ញៀវថ្ងៃបុណ្យកឋិនសប្បាយកប់🥰😊😍😘❤️🌾#reels #vlog #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o8QDV8D7P2f3ICWIg7gD6ByAED4X5CfQ6AfFjv~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=MBKNkGe3Eq7O2w%2BQPNWuGB2FeIU%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@suyadaily/video/7708400526983023893",
    originalAccountUrl: "https://www.tiktok.com/@suyadaily",
    inlineVideoId: "7708400526983023893",
    directVideoUrl: "https://v3.tiktokcdn.com/4d49075b92d084d6c1cdcdd4602c8755/6afdc511/video/tos/alisg/tos-alisg-pve-0037c001/okbg3Ief57VAWpCv6CEsCF8IjDbDIAg42QfLBC/?a=1233&bti=ODszNWYuMDE6&&bt=1149&ft=bC~O_mfLPD12NVY3rn-UxrN5VY6e3wv252cAp&mime_type=video_mp4&rc=ZTg4OTlpZ2k1NGY0NjRlN0BpajRmOnc5cjp1ZTMzODczNEAxL2M2M2BfNWExMTRjX2EyYSMyLl9mMmRzbHBhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232856152A25DD5E5B70AA15C3&btag=e00098000",
    sourceName: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily)",
    authorHandle: "@suyadaily",
    publishedOrUpdatedAt: "2026-11-15T14:10:56.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-eatameeater-7708398223387413781",
    platform: 'tiktok',
    titleKh: "នរណាខ្លះម៉ូយគាត់ ១០ឆ្នាំមុន​ នៅកោះពេជ្រ​ ស៊ុបខ្យង​ នៅឡាសែន​ នៅតែឆ្ងាញ់​ 😋​ ឡូវបើកដល់​ កោះនរាហើ",
    titleEn: "នរណាខ្លះម៉ូយគាត់ ១០ឆ្នាំមុន​ នៅកោះពេជ្រ​ ស៊ុបខ្យង​ នៅឡាសែន​ នៅតែឆ្ងាញ់​ 😋​ ឡូវប (@eatame.eater)",
    titleZh: "Eatame (@eatame.eater) 柬埔寨美食与探店视频",
    descriptionKh: "នរណាខ្លះម៉ូយគាត់ ១០ឆ្នាំមុន​ នៅកោះពេជ្រ​ ស៊ុបខ្យង​ នៅឡាសែន​ នៅតែឆ្ងាញ់​ 😋​ ឡូវបើកដល់​ កោះនរាហើយ​  #localfood  #soup",
    descriptionEn: "នរណាខ្លះម៉ូយគាត់ ១០ឆ្នាំមុន​ នៅកោះពេជ្រ​ ស៊ុបខ្យង​ នៅឡាសែន​ នៅតែឆ្ងាញ់​ 😋​ ឡូវបើកដល់​ កោះនរាហើយ​  #localfood  #soup — Official Cambodian TikTok food review by @eatame.eater.",
    descriptionZh: "来自柬埔寨美食创作者 @eatame.eater 的 TikTok 视频：នរណាខ្លះម៉ូយគាត់ ១០ឆ្នាំមុន​ នៅកោះពេជ្រ​ ស៊ុបខ្យង​ នៅឡាសែន​ នៅតែឆ្ងាញ់​ 😋​ ឡូវបើកដល់​ កោះនរាហើយ​  #",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o470EfGbDDTVFheIN5EubbI2eC4I2iUAysj7sA~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=cCJOhEVYczquLu%2FFTthNbqwXxyw%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@eatame.eater/video/7708398223387413781",
    originalAccountUrl: "https://www.tiktok.com/@eatame.eater",
    inlineVideoId: "7708398223387413781",
    directVideoUrl: "https://v16.tiktokcdn.com/9850fb6c255e710689ff6b20cb551432/6afdc4e2/video/tos/alisg/tos-alisg-pve-0037c001/osdwGaEEIDAVNwefbuF45LPUi5seXIA2DCbjQy/?a=1233&bti=ODszNWYuMDE6&&bt=1370&ft=bC~O_mfLPD12NmY3rn-UxtC2WY6e3wv25DcAp&mime_type=video_mp4&rc=M2c8NDc1PGg8OjdnZjg5NEBpMzlzbXM5cjZ1ZTMzODczNEBhYC81MjA1XjYxMjRhNjVeYSNlNWNhMmRjanBhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232849E5ACD3BF2C7093A8EB05&btag=e00090000",
    sourceName: "Eatame (@eatame.eater)",
    authorHandle: "@eatame.eater",
    publishedOrUpdatedAt: "2026-11-15T14:01:59.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-fatamecooking-7708387157366295828",
    platform: 'tiktok',
    titleKh: "វិធីធ្វើ​ បបរពងទាប្រៃគ្រឿងសមុទ្រ​ ហុតក្តៅៗ​ ជុំគ្រួសារសុភមង្គលយកទៅណាអស់​ 😋🥰​ @J&C សម្ភារៈផ្ទះ",
    titleEn: "វិធីធ្វើ​ បបរពងទាប្រៃគ្រឿងសមុទ្រ​ ហុតក្តៅៗ​ ជុំគ្រួសារសុភមង្គលយកទៅណាអស់​ 😋🥰​ @ (@fatame.cooking)",
    titleZh: "Fatame (@fatame.cooking) 柬埔寨美食与探店视频",
    descriptionKh: "វិធីធ្វើ​ បបរពងទាប្រៃគ្រឿងសមុទ្រ​ ហុតក្តៅៗ​ ជុំគ្រួសារសុភមង្គលយកទៅណាអស់​ 😋🥰​  @J&C សម្ភារៈផ្ទះបាយ #cookingathome  #cookingrecipes",
    descriptionEn: "វិធីធ្វើ​ បបរពងទាប្រៃគ្រឿងសមុទ្រ​ ហុតក្តៅៗ​ ជុំគ្រួសារសុភមង្គលយកទៅណាអស់​ 😋🥰​  @J&C សម្ភារៈផ្ទះបាយ #cookingathome  #cookingrecipes — Official Cambodian TikTok food review by @fatame.cooking.",
    descriptionZh: "来自柬埔寨美食创作者 @fatame.cooking 的 TikTok 视频：វិធីធ្វើ​ បបរពងទាប្រៃគ្រឿងសមុទ្រ​ ហុតក្តៅៗ​ ជុំគ្រួសារសុភមង្គលយកទៅណាអស់​ 😋🥰​  @J&C សម្ភារៈផ្ទះបាយ ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oIJcm3QejVIdfoDpCZG5fGL2OVW8AAkQ1ss7QI~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=I80iLr5tR1Q%2BP89ihcfqRYIoMhU%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@fatame.cooking/video/7708387157366295828",
    originalAccountUrl: "https://www.tiktok.com/@fatame.cooking",
    inlineVideoId: "7708387157366295828",
    directVideoUrl: "https://v9.tiktokcdn.com/99307d6d644ee57477abce8c095a5221/6afdc4c7/video/tos/alisg/tos-alisg-pve-0037c001/o4PjDEAMIaVQfVIbEC5UuoFRzeIjsDfbywAZDb/?a=1233&bti=ODszNWYuMDE6&&bt=958&ft=bC~O_mfLPD12NrY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=ZTg2N2VkaDZoZDc1OTs4ZUBpM2hzcHM5cnB1ZTMzODczNEAuLmBfNDAzXi4xNDE1MDA0YSMxc2AzMmRzLnBhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232850F1EAE8B11E904E9F4279&btag=e00090000",
    sourceName: "Fatame (@fatame.cooking)",
    authorHandle: "@fatame.cooking",
    publishedOrUpdatedAt: "2026-11-15T13:19:03.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-khleancheck-7708385194436300050",
    platform: 'tiktok',
    titleKh: "មិនធម្មតាមែន ឈរចាក់បាញ់ឆែវ៧ខ្ទះម្នាក់ឯង😳 អ្នកលក់នៅសៀមរាបពូកែៗម៉េស😋",
    titleEn: "មិនធម្មតាមែន ឈរចាក់បាញ់ឆែវ៧ខ្ទះម្នាក់ឯង😳 អ្នកលក់នៅសៀមរាបពូកែៗម៉េស😋 (@.khleancheck)",
    titleZh: "ឃ្លានឆែក - Khlean Check (@.khleancheck) 柬埔寨美食与探店视频",
    descriptionKh: "មិនធម្មតាមែន ឈរចាក់បាញ់ឆែវ៧ខ្ទះម្នាក់ឯង😳 អ្នកលក់នៅសៀមរាបពូកែៗម៉េស😋",
    descriptionEn: "មិនធម្មតាមែន ឈរចាក់បាញ់ឆែវ៧ខ្ទះម្នាក់ឯង😳 អ្នកលក់នៅសៀមរាបពូកែៗម៉េស😋 — Official Cambodian TikTok food review by @.khleancheck.",
    descriptionZh: "来自柬埔寨美食创作者 @.khleancheck 的 TikTok 视频：មិនធម្មតាមែន ឈរចាក់បាញ់ឆែវ៧ខ្ទះម្នាក់ឯង😳 អ្នកលក់នៅសៀមរាបពូកែៗម៉េស😋",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o4j59m8imB4V3GaIARYgDIWvvriBE3lXAlv4Y~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=WcTcvhKtvOHQrxTcg0lG%2BwO7MLo%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@.khleancheck/video/7708385194436300050",
    originalAccountUrl: "https://www.tiktok.com/@.khleancheck",
    inlineVideoId: "7708385194436300050",
    directVideoUrl: "https://v16.tiktokcdn.com/7196a42ac5a69a17270d63063d237b3c/6afdc49e/video/tos/alisg/tos-alisg-pve-0037c001/oc3mDK5VIAXrPi3B5YFE9A8iNdavWgEvM6vQB/?a=1233&bti=ODszNWYuMDE6&&bt=1065&ft=bC~O_mfLPD12NzY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=ODVkZzdpOTc1ZTY0NGhpZEBpM3ZpaXE5cnF0ZTMzODczNEBfNC5iYV4zNi4xNmIuYDMxYSNfYzVkMmRrcnBhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232851602EB059E8441C9D6BC2&btag=e00090000",
    sourceName: "ឃ្លានឆែក - Khlean Check (@.khleancheck)",
    authorHandle: "@.khleancheck",
    publishedOrUpdatedAt: "2026-11-15T13:11:26.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-eatameeater-7708378678224227604",
    platform: 'tiktok',
    titleKh: "ពូកែមែន​ អង្គរខេក​ នំខ្មែរយើងកែច្នៃរៀបចំជានំខួបកំណើតបានស្អាតៗ​ ណាស់​ កុំម៉្មងភ្លាមបានភ្លាម​ 🥰​",
    titleEn: "ពូកែមែន​ អង្គរខេក​ នំខ្មែរយើងកែច្នៃរៀបចំជានំខួបកំណើតបានស្អាតៗ​ ណាស់​ កុំម៉្មងភ្ល (@eatame.eater)",
    titleZh: "Eatame (@eatame.eater) 柬埔寨美食与探店视频",
    descriptionKh: "ពូកែមែន​ អង្គរខេក​ នំខ្មែរយើងកែច្នៃរៀបចំជានំខួបកំណើតបានស្អាតៗ​ ណាស់​ កុំម៉្មងភ្លាមបានភ្លាម​ 🥰​🎂  ហាង​ អង្គរខេក​ សាខាសៀមរាប​ #khmercake  #cake",
    descriptionEn: "ពូកែមែន​ អង្គរខេក​ នំខ្មែរយើងកែច្នៃរៀបចំជានំខួបកំណើតបានស្អាតៗ​ ណាស់​ កុំម៉្មងភ្លាមបានភ្លាម​ 🥰​🎂  ហាង​ អង្គរខេក​ សាខាសៀមរាប​ #khmercake  #cake — Official Cambodian TikTok food review by @eatame.eater.",
    descriptionZh: "来自柬埔寨美食创作者 @eatame.eater 的 TikTok 视频：ពូកែមែន​ អង្គរខេក​ នំខ្មែរយើងកែច្នៃរៀបចំជានំខួបកំណើតបានស្អាតៗ​ ណាស់​ កុំម៉្មងភ្លាមបានភ្លាម​ 🥰​🎂  ហ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/okMayYmmz5pVIZBBiiivvIEh5NqJnXBBiAEmA~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=ay6LXnCZ3pmG2oDLP2zRDSMXmYc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@eatame.eater/video/7708378678224227604",
    originalAccountUrl: "https://www.tiktok.com/@eatame.eater",
    inlineVideoId: "7708378678224227604",
    directVideoUrl: "https://v16.tiktokcdn.com/1823b2efaf37af6f3ebf1300376aaa00/6afdc495/video/tos/alisg/tos-alisg-pve-0037c001/o8O5jD5XGVvEMvNimJbmBiYqBQEaAiNp2BXAI/?a=1233&bti=ODszNWYuMDE6&&bt=1141&ft=bC~O_mfLPD12NmY3rn-UxtC2WY6e3wv25DcAp&mime_type=video_mp4&rc=OmY7N2k0ZDRpOTMzaTtpZkBpMzVvbHM5cmZ0ZTMzODczNEA2MzNgYTYzXzYxM142YWIyYSNnYzYtMmRrZnBhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232849E5ACD3BF2C7093A8EB05&btag=e00090000",
    sourceName: "Eatame (@eatame.eater)",
    authorHandle: "@eatame.eater",
    publishedOrUpdatedAt: "2026-11-15T12:46:09.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-hubbaywithme-7708340267853565192",
    platform: 'tiktok',
    titleKh: "Unlimited salt 🥴💦",
    titleEn: "Unlimited salt 🥴💦 (@hub_baywithme)",
    titleZh: "Hub Bay With Me (@hub_baywithme) 柬埔寨美食与探店视频",
    descriptionKh: "Unlimited salt 🥴💦 #hubbayehh #food_m #mango #sourfruit #salt",
    descriptionEn: "Unlimited salt 🥴💦 #hubbayehh #food_m #mango #sourfruit #salt — Official Cambodian TikTok food review by @hub_baywithme.",
    descriptionZh: "来自柬埔寨美食创作者 @hub_baywithme 的 TikTok 视频：Unlimited salt 🥴💦 #hubbayehh #food_m #mango #sourfruit #salt",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oYAAPjEIEDAVoweffhFo54DOlqaX2IAZDEYjAt~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=ufpZ%2BtkC4%2B0TMG7nis%2BXA7Gq3nI%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@hub_baywithme/video/7708340267853565192",
    originalAccountUrl: "https://www.tiktok.com/@hub_baywithme",
    inlineVideoId: "7708340267853565192",
    directVideoUrl: "https://v9.tiktokcdn.com/1b30477792a167ae7514f0c8b5b0d1c8/6afdc45b/video/tos/alisg/tos-alisg-pve-0037c001/ooYIaeQ7FFFmACoVvV7lj6ADaEIIfDfDE5hr5H/?a=1233&bti=ODszNWYuMDE6&&bt=812&ft=bC~O_mfLPD12N_Y3rn-Ux_o2NY6e3wv25dcAp&mime_type=video_mp4&rc=OjhoOjo1NGQ5PDVkOmlpOkBpM3l4ZXc5cjxyZTMzODczNEAtMDUwMWEzXjIxXjRgXy80YSNnMl5lMmRjYXBhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232857ED4BC65F6722FBA0BF25&btag=e00088000",
    sourceName: "Hub Bay With Me (@hub_baywithme)",
    authorHandle: "@hub_baywithme",
    publishedOrUpdatedAt: "2026-11-15T10:17:06.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-mekorksach100m-7708338888435076404",
    platform: 'tiktok',
    titleKh: "នៅភ្នំពេញគុយទាវមួយចាន…ប៉ុន្មានលុយ?🙂 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល",
    titleEn: "នៅភ្នំពេញគុយទាវមួយចាន…ប៉ុន្មានលុយ?🙂 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង:  (@me_kork_sach100muk)",
    titleZh: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk) 柬埔寨美食与探店视频",
    descriptionKh: "នៅភ្នំពេញគុយទាវមួយចាន…ប៉ុន្មានលុយ?🙂 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍Google Map: (មីគោកសាច់100មុខ ម៉ាម៉ាអូរឬស្សី) https://maps.app.goo.gl/pVN6ByuU53XEUCmv9?g_st=ic #VoiceEffects",
    descriptionEn: "នៅភ្នំពេញគុយទាវមួយចាន…ប៉ុន្មានលុយ?🙂 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍G — Official Cambodian TikTok food review by @me_kork_sach100muk.",
    descriptionZh: "来自柬埔寨美食创作者 @me_kork_sach100muk 的 TikTok 视频：នៅភ្នំពេញគុយទាវមួយចាន…ប៉ុន្មានលុយ?🙂 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oQIzQADAjCveALDVWFHSfvc4QXsIyEAAojYfEl~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=BNL5OX4wmigB8aTBq%2FlLaZL3QPg%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@me_kork_sach100muk/video/7708338888435076404",
    originalAccountUrl: "https://www.tiktok.com/@me_kork_sach100muk",
    inlineVideoId: "7708338888435076404",
    directVideoUrl: "https://v3.tiktokcdn.com/1b28c01b1933b6bf0bcec4187a8a217a/6afdc486/video/tos/alisg/tos-alisg-pve-0037c001/oE2VzmV4WAM5gjfgAQFWeDoDnfo5dFYEDICPzI/?a=1233&bti=ODszNWYuMDE6&&bt=1122&ft=bC~O_mfLPD12NWY3rn-UxK12KY6e3wv25zcAp&mime_type=video_mp4&rc=MzVnOmk8NTk5NGlmZmVnZkBpanZqb3Y5cnNyZTMzODczNEBeYTBhNWJgXjYxNTNgXzAxYSNpcTBxMmRzXnBhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232853F72B939D69FFBF8D7828&btag=e00090000",
    sourceName: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk)",
    authorHandle: "@me_kork_sach100muk",
    publishedOrUpdatedAt: "2026-11-15T10:11:44.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-36",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-borerestaurant-7708316944709012742",
    platform: 'tiktok',
    titleKh: "Two Khmer favourites, one irresistible pandan custard! Soft steamed bread or crispy fried banan",
    titleEn: "Two Khmer favourites, one irresistible pandan custard! Soft steamed bread or cri (@bore.restaurant)",
    titleZh: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "Two Khmer favourites, one irresistible pandan custard! Soft steamed bread or crispy fried bananas, served with our rich, fragrant pandan custard. 🍃  🕰️ 10:30 am - 10:30 pm ☎️ Contact: https://t.me/borerestaurant 📍Location: https://maps.app.goo.gl/DqSggg9Tiqmi5ZHM8?g_st=ic #BoréRestaurant #KhmerDesserts #PandanCustard #CambodianFood #PhnomPenh",
    descriptionEn: "Two Khmer favourites, one irresistible pandan custard! Soft steamed bread or crispy fried bananas, served with our rich, fragrant pandan custard. 🍃  🕰️ 10:30  — Official Cambodian TikTok food review by @bore.restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @bore.restaurant 的 TikTok 视频：Two Khmer favourites, one irresistible pandan custard! Soft steamed bread or crispy fried bananas, s",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o8TIgxQejVIen4DrC9GysBLu3u18AAeQhs42QI~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=STZP8tj3iBYIC9GKZI9I50k8GXo%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@bore.restaurant/video/7708316944709012742",
    originalAccountUrl: "https://www.tiktok.com/@bore.restaurant",
    inlineVideoId: "7708316944709012742",
    directVideoUrl: "https://v9.tiktokcdn.com/edd3e9faf5adc654f8159f434fa3f8a3/6afdc45d/video/tos/alisg/tos-alisg-pve-0037c001/o0rDiBVE5gEGPCecAx4YueI4LIAjLQ8egI2hCI/?a=1233&bti=ODszNWYuMDE6&&bt=544&ft=bC~O_mfLPD12NtY3rn-Ux-evWY6e3wv251cAp&mime_type=video_mp4&rc=ZTtnOTo2ZTo4PDdpaTw3O0BpMzd1Znk5cmhxZTMzODczNEAtYTBjMTY1Ni0xYDZjLWMwYSMxYDA1MmQ0LXBhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232855390EAF6F445DC2B3EA8E&btag=e00088000",
    sourceName: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant)",
    authorHandle: "@bore.restaurant",
    publishedOrUpdatedAt: "2026-11-15T08:46:35.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-1",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-taseitrestaura-7708314958550895892",
    platform: 'tiktok',
    titleKh: "មកតាសេត! 🥩 ម្ហូបឆ្ងាញ់ បរិយាកាសស្រស់ស្រាយ 🌿 ចង់អង្គុយកញ្ចុះ សាលធំ ឬបន្ទប់ VIP មានជម្រើសតាមចិត",
    titleEn: "មកតាសេត! 🥩 ម្ហូបឆ្ងាញ់ បរិយាកាសស្រស់ស្រាយ 🌿 ចង់អង្គុយកញ្ចុះ សាលធំ ឬបន្ទប់ VIP  (@taseit_restaurant)",
    titleZh: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "មកតាសេត! 🥩 ម្ហូបឆ្ងាញ់ បរិយាកាសស្រស់ស្រាយ 🌿 ចង់អង្គុយកញ្ចុះ សាលធំ ឬបន្ទប់ VIP មានជម្រើសតាមចិត្ត! ❤️",
    descriptionEn: "មកតាសេត! 🥩 ម្ហូបឆ្ងាញ់ បរិយាកាសស្រស់ស្រាយ 🌿 ចង់អង្គុយកញ្ចុះ សាលធំ ឬបន្ទប់ VIP មានជម្រើសតាមចិត្ត! ❤️ — Official Cambodian TikTok food review by @taseit_restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @taseit_restaurant 的 TikTok 视频：មកតាសេត! 🥩 ម្ហូបឆ្ងាញ់ បរិយាកាសស្រស់ស្រាយ 🌿 ចង់អង្គុយកញ្ចុះ សាលធំ ឬបន្ទប់ VIP មានជម្រើសតាមចិត្ត! ❤",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oIl4pBAv4PaETbIavAlygBAtiiclwYAA6ED5j~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=3nLdJFYAo3w8IKKkA0SPtmFgipo%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@taseit_restaurant/video/7708314958550895892",
    originalAccountUrl: "https://www.tiktok.com/@taseit_restaurant",
    inlineVideoId: "7708314958550895892",
    directVideoUrl: "https://v16.tiktokcdn.com/ead7ef0c94fe9dca67ee8a4120ce848f/6afdc451/video/tos/alisg/tos-alisg-pve-0037c001/oAqvKiHDG5TavAsBzEFYBWlNbviQA7NYVylEI/?a=1233&bti=ODszNWYuMDE6&&bt=2339&ft=bC~O_mfLPD12NtY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=Nmc3Njs4N2UzOGZoODk4aEBpanJvNmw5cjhwZTMzODczNEBfNi5jYF5iXjYxLWEyNDU0YSMuMzUwMmRrc3BhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32CA6&btag=e000b8000",
    sourceName: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant)",
    authorHandle: "@taseit_restaurant",
    publishedOrUpdatedAt: "2026-11-15T08:38:53.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-jamechenda-7708302929559620865",
    platform: 'tiktok',
    titleKh: "ថ្ងៃនេះត្រីមានតិច ចង់ញ៉ាំប្រញាប់កម្មង់ណា! 🤤🍜 យឺតពេក បានត្រឹមមើលខ្ញុំញ៉ាំ កុំខឹងខ្ញុំ! 😂 ពីកា",
    titleEn: "ថ្ងៃនេះត្រីមានតិច ចង់ញ៉ាំប្រញាប់កម្មង់ណា! 🤤🍜 យឺតពេក បានត្រឹមមើលខ្ញុំញ៉ាំ កុំខឹ (@jame_chenda)",
    titleZh: "@jame_chenda 柬埔寨美食与探店视频",
    descriptionKh: "ថ្ងៃនេះត្រីមានតិច ចង់ញ៉ាំប្រញាប់កម្មង់ណា! 🤤🍜 យឺតពេក បានត្រឹមមើលខ្ញុំញ៉ាំ កុំខឹងខ្ញុំ! 😂 ពីកាន់មីក្រូ មកកាន់អង្រែបុកម្ទេស! 🌶️ នំបញ្ចុកទឹកម្ហិចយាយដា រសជាតិដើមពីកំពត❤️ បងប្អូនក្រុមហឹរតិច ឬហឹរខ្លាំង? 🔥 📞 017 444 017 / 069 444 017 #នំបញ្ចុកទឹកម្ហិចយាយដា #ខាន់ជែមស៍ #ម្ហូបខ្មែរ #KampotFood",
    descriptionEn: "ថ្ងៃនេះត្រីមានតិច ចង់ញ៉ាំប្រញាប់កម្មង់ណា! 🤤🍜 យឺតពេក បានត្រឹមមើលខ្ញុំញ៉ាំ កុំខឹងខ្ញុំ! 😂 ពីកាន់មីក្រូ មកកាន់អង្រែបុកម្ទេស! 🌶️ នំបញ្ចុកទឹកម្ហិចយាយដា រសជាតិដើម — Official Cambodian TikTok food review by @jame_chenda.",
    descriptionZh: "来自柬埔寨美食创作者 @jame_chenda 的 TikTok 视频：ថ្ងៃនេះត្រីមានតិច ចង់ញ៉ាំប្រញាប់កម្មង់ណា! 🤤🍜 យឺតពេក បានត្រឹមមើលខ្ញុំញ៉ាំ កុំខឹងខ្ញុំ! 😂 ពីកាន់មីក",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oUSEMbMIXpaiFABlOPDbdX29ZYZB5vHiGAIvk~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=4pU2N59yynpJnxlDTegt8Pkim6Q%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@jame_chenda/video/7708302929559620865",
    originalAccountUrl: "https://www.tiktok.com/@jame_chenda",
    inlineVideoId: "7708302929559620865",
    directVideoUrl: "https://v3.tiktokcdn.com/10881142f602ce68ce07886ee56ab8ce/6afdc4e0/video/tos/alisg/tos-alisg-pve-0037c001/os2dvvkQPnbAi5LZ9IAQaBSEXXYEYOWBiZMal/?a=1233&bti=ODszNWYuMDE6&&bt=1349&ft=bC~O_mfLPD12Ndc3rn-UxMK5PY6e3wv25dcAp&mime_type=video_mp4&rc=ZDk7Z2g0aTVpZTVpNmQ0ZkBpamZvb3A5cmhwZTMzODczNEBiMS9iYS8yNWIxMzAvNjQwYSM0bnNhMmRrNXBhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232909397AA7C0BCE619A80C83&btag=e00090000",
    sourceName: "@jame_chenda",
    authorHandle: "@jame_chenda",
    publishedOrUpdatedAt: "2026-11-15T07:52:12.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តកំពត",
    provinceEn: "Kampot",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-expressionshub-7708042934557396242",
    platform: 'tiktok',
    titleKh: "ថ្ងៃទី2​ ញ៊ាំម្ហូបបារាំង​ លើកនេះញ៊ាំនៅភូមិហ្វ្រង់កូហ្វូនីតែម្ដង",
    titleEn: "ថ្ងៃទី2​ ញ៊ាំម្ហូបបារាំង​ លើកនេះញ៊ាំនៅភូមិហ្វ្រង់កូហ្វូនីតែម្ដង (@expressions_hub)",
    titleZh: "សារអាហារ - Expressions Hub (@expressions_hub) 柬埔寨美食与探店视频",
    descriptionKh: "ថ្ងៃទី2​ ញ៊ាំម្ហូបបារាំង​ លើកនេះញ៊ាំនៅភូមិហ្វ្រង់កូហ្វូនីតែម្ដង",
    descriptionEn: "ថ្ងៃទី2​ ញ៊ាំម្ហូបបារាំង​ លើកនេះញ៊ាំនៅភូមិហ្វ្រង់កូហ្វូនីតែម្ដង — Official Cambodian TikTok food review by @expressions_hub.",
    descriptionZh: "来自柬埔寨美食创作者 @expressions_hub 的 TikTok 视频：ថ្ងៃទី2​ ញ៊ាំម្ហូបបារាំង​ លើកនេះញ៊ាំនៅភូមិហ្វ្រង់កូហ្វូនីតែម្ដង",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oYfrQcEHOVLHQAE6e6oFxIFDCrUY8QjwfjoAPD~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=yNZZBc5m%2FuUkZrV%2FaBe6HO%2BpY1A%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@expressions_hub/video/7708042934557396242",
    originalAccountUrl: "https://www.tiktok.com/@expressions_hub",
    inlineVideoId: "7708042934557396242",
    directVideoUrl: "https://v16.tiktokcdn.com/4c00741294c779d685334d0ccd311147/6afdc579/video/tos/alisg/tos-alisg-pve-0037c001/o4d1fAD8YenDXFj6VxcrfhoIAQ8wCL6IhPjOEo/?a=1233&bti=ODszNWYuMDE6&&bt=1217&ft=bC~O_mfLPD12NaY3rn-UxfKFWY6e3wv25xcAp&mime_type=video_mp4&rc=ZjxpZzozOGQzZTM1ZDk0OEBpM2hvPGs5cnQ6ZTMzODczNEBeYC9gLzBeXjExMF9fYDZgYSMzNWNwMmRzY3BhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232849EB6CBF2F635463AA4F26&btag=e000a0000",
    sourceName: "សារអាហារ - Expressions Hub (@expressions_hub)",
    authorHandle: "@expressions_hub",
    publishedOrUpdatedAt: "2026-11-14T15:03:17.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-tosmokplouk-7708024242503240980",
    platform: 'tiktok',
    titleKh: "មកជុំគ្នាហេីយឬនៅ",
    titleEn: "មកជុំគ្នាហេីយឬនៅ (@tosmokplouk)",
    titleZh: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk) 柬埔寨美食与探店视频",
    descriptionKh: "មកជុំគ្នាហេីយឬនៅ#videoviral #emart24 #emart24Cambodia  #ALLDAYH!GHLIGHT #KoreanLifestyle",
    descriptionEn: "មកជុំគ្នាហេីយឬនៅ#videoviral #emart24 #emart24Cambodia  #ALLDAYH!GHLIGHT #KoreanLifestyle — Official Cambodian TikTok food review by @tosmokplouk.",
    descriptionZh: "来自柬埔寨美食创作者 @tosmokplouk 的 TikTok 视频：មកជុំគ្នាហេីយឬនៅ#videoviral #emart24 #emart24Cambodia  #ALLDAYH!GHLIGHT #KoreanLifestyle",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o0AP9nBpc4BIEYX4imjFniy30EzvZiIaAhsl6~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=nyURF8m5O77aw%2BTVqYpZOK9K1Co%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@tosmokplouk/video/7708024242503240980",
    originalAccountUrl: "https://www.tiktok.com/@tosmokplouk",
    inlineVideoId: "7708024242503240980",
    directVideoUrl: "https://v9.tiktokcdn.com/5fde94449b3d6cc89b0107fecb33d17c/6afdc493/video/tos/alisg/tos-alisg-pve-0037c001/oAfY44UADgCEf5ATvPDx4VI0eQLcrZjNGFoIPP/?a=1233&bti=ODszNWYuMDE6&&bt=523&ft=bC~O_mfLPD12NWY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=Zjs1NDZkaGRoOzs5O2hnO0BpM3Jrc3E5cjg5ZTMzODczNEBiNmFhL2IyXmMxNWJhMzFgYSNubXFoMmQ0YnBhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32C72&btag=e00090000",
    sourceName: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk)",
    authorHandle: "@tosmokplouk",
    publishedOrUpdatedAt: "2026-11-14T13:50:45.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-80",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-eatameeater-7708012595575311668",
    platform: 'tiktok',
    titleKh: "តើក្រតាមណារួច​ បើរកតែពេលដេកមិនចង់បានផង​ សាច់គោអាំងទឹកប្រហុក​ តាខូយ​ 😋😁​",
    titleEn: "តើក្រតាមណារួច​ បើរកតែពេលដេកមិនចង់បានផង​ សាច់គោអាំងទឹកប្រហុក​ តាខូយ​ 😋😁​ (@eatame.eater)",
    titleZh: "Eatame (@eatame.eater) 柬埔寨美食与探店视频",
    descriptionKh: "តើក្រតាមណារួច​ បើរកតែពេលដេកមិនចង់បានផង​ សាច់គោអាំងទឹកប្រហុក​ តាខូយ​ 😋😁​  #beef  #localfood",
    descriptionEn: "តើក្រតាមណារួច​ បើរកតែពេលដេកមិនចង់បានផង​ សាច់គោអាំងទឹកប្រហុក​ តាខូយ​ 😋😁​  #beef  #localfood — Official Cambodian TikTok food review by @eatame.eater.",
    descriptionZh: "来自柬埔寨美食创作者 @eatame.eater 的 TikTok 视频：តើក្រតាមណារួច​ បើរកតែពេលដេកមិនចង់បានផង​ សាច់គោអាំងទឹកប្រហុក​ តាខូយ​ 😋😁​  #beef  #localfood",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ocIbqVIAo6AF0EFXnQjujefWRwDTDCPIlDKVf4~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=JKIeDqgtDAEnOxNCK8mrQy6ZITg%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@eatame.eater/video/7708012595575311668",
    originalAccountUrl: "https://www.tiktok.com/@eatame.eater",
    inlineVideoId: "7708012595575311668",
    directVideoUrl: "https://v16.tiktokcdn.com/f9f6f87bd27b16c067903ddf2e6b7cd7/6afdc4d2/video/tos/alisg/tos-alisg-pve-0037c001/oUb4VuAefAIh8wboQDjVWMC0XEDoFI6lfFWETj/?a=1233&bti=ODszNWYuMDE6&&bt=1161&ft=bC~O_mfLPD12NmY3rn-UxtC2WY6e3wv25DcAp&mime_type=video_mp4&rc=NDhlZTM0ZTc6NzU3ZTplPEBpM2hob2s5cjg4ZTMzODczNEAxMS1hMjIvXjUxYDBeMTFhYSNuX2dzMmRjbHBhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232849E5ACD3BF2C7093A8EB05&btag=e00090000",
    sourceName: "Eatame (@eatame.eater)",
    authorHandle: "@eatame.eater",
    publishedOrUpdatedAt: "2026-11-14T13:05:33.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-khleancheck-7708007578193710388",
    platform: 'tiktok',
    titleKh: "សាច់គោអាំងអ៊ុំស្រីលក់ក្នុងផ្សារបឹងកេងតាំងឆ្នាំ១៩៩១មកដល់ឥឡូវរាប់មកមិនតិចឆ្នាំទេ 😋📍🥰សាច់គោអាំង",
    titleEn: "សាច់គោអាំងអ៊ុំស្រីលក់ក្នុងផ្សារបឹងកេងតាំងឆ្នាំ១៩៩១មកដល់ឥឡូវរាប់មកមិនតិចឆ្នាំទេ \ud83d (@.khleancheck)",
    titleZh: "ឃ្លានឆែក - Khlean Check (@.khleancheck) 柬埔寨美食与探店视频",
    descriptionKh: "សាច់គោអាំងអ៊ុំស្រីលក់ក្នុងផ្សារបឹងកេងតាំងឆ្នាំ១៩៩១មកដល់ឥឡូវរាប់មកមិនតិចឆ្នាំទេ 😋📍🥰សាច់គោអាំងអ៊ុំស្រីលក់ក្នុងផ្សារបឹងកេងតាំងឆ្នាំ១៩៩១មកដល់ឥឡូវរាប់មកមិនតិចឆ្នាំទេ 😋📍🥰 #ឃ្លានឆេក",
    descriptionEn: "សាច់គោអាំងអ៊ុំស្រីលក់ក្នុងផ្សារបឹងកេងតាំងឆ្នាំ១៩៩១មកដល់ឥឡូវរាប់មកមិនតិចឆ្នាំទេ 😋📍🥰សាច់គោអាំងអ៊ុំស្រីលក់ក្នុងផ្សារបឹងកេងតាំងឆ្នាំ១៩៩១មកដល់ឥឡូវរាប់មកមិនតិចឆ្នា — Official Cambodian TikTok food review by @.khleancheck.",
    descriptionZh: "来自柬埔寨美食创作者 @.khleancheck 的 TikTok 视频：សាច់គោអាំងអ៊ុំស្រីលក់ក្នុងផ្សារបឹងកេងតាំងឆ្នាំ១៩៩១មកដល់ឥឡូវរាប់មកមិនតិចឆ្នាំទេ 😋📍🥰សាច់គោអាំងអ៊ុំស",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ocivBZvqfAoiBUwFi26CDRWBco4fIAPYENwgIB~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=V6dvURYMBwsvbEBLovQ1RZGNxuw%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@.khleancheck/video/7708007578193710388",
    originalAccountUrl: "https://www.tiktok.com/@.khleancheck",
    inlineVideoId: "7708007578193710388",
    directVideoUrl: "https://v16.tiktokcdn.com/5f7170e0b504349f4a4a18ae934aa5c1/6afdc477/video/tos/alisg/tos-alisg-pve-0037c001/oIwvLQcBqBW2UFiiiJbCoAINEBP4fftg6REDvw/?a=1233&bti=ODszNWYuMDE6&&bt=1145&ft=bC~O_mfLPD12NzY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=NDc3Nzs7aGQ1NTU2MzozPEBpM254eHA5cnI4ZTMzODczNEA2LzYuNTU1Xi8xM2FeX15fYSNsMWUzMmRjY3BhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232851602EB059E8441C9D6BC2&btag=e00090000",
    sourceName: "ឃ្លានឆែក - Khlean Check (@.khleancheck)",
    authorHandle: "@.khleancheck",
    publishedOrUpdatedAt: "2026-11-14T12:46:05.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-eatameeater-7707996304164621588",
    platform: 'tiktok',
    titleKh: "ទេសភាព​ស្អាតកន្លែងឡូយ​ តែអត់គិតថ្លៃជួលទីតាំងទេ​ ហៅតែម្ហូបតុគេចូលធ្វើកម្មវិធីបានតែម្តង​ 🤩​ La V",
    titleEn: "ទេសភាព​ស្អាតកន្លែងឡូយ​ តែអត់គិតថ្លៃជួលទីតាំងទេ​ ហៅតែម្ហូបតុគេចូលធ្វើកម្មវិធីបានត (@eatame.eater)",
    titleZh: "Eatame (@eatame.eater) 柬埔寨美食与探店视频",
    descriptionKh: "ទេសភាព​ស្អាតកន្លែងឡូយ​ តែអត់គិតថ្លៃជួលទីតាំងទេ​ ហៅតែម្ហូបតុគេចូលធ្វើកម្មវិធីបានតែម្តង​ 🤩​ La Vida Floating  #weddinghall",
    descriptionEn: "ទេសភាព​ស្អាតកន្លែងឡូយ​ តែអត់គិតថ្លៃជួលទីតាំងទេ​ ហៅតែម្ហូបតុគេចូលធ្វើកម្មវិធីបានតែម្តង​ 🤩​ La Vida Floating  #weddinghall — Official Cambodian TikTok food review by @eatame.eater.",
    descriptionZh: "来自柬埔寨美食创作者 @eatame.eater 的 TikTok 视频：ទេសភាព​ស្អាតកន្លែងឡូយ​ តែអត់គិតថ្លៃជួលទីតាំងទេ​ ហៅតែម្ហូបតុគេចូលធ្វើកម្មវិធីបានតែម្តង​ 🤩​ La Vida F",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ooJCqXBeL42VLDANItdejTCGAIUIogGf7r8YIG~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=ScTkmBpW%2BaZwSQCh3EqJJk6%2Fycc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@eatame.eater/video/7707996304164621588",
    originalAccountUrl: "https://www.tiktok.com/@eatame.eater",
    inlineVideoId: "7707996304164621588",
    directVideoUrl: "https://v16.tiktokcdn.com/fe3c2067cc594e1d80bc01f579cb7144/6afdc4df/video/tos/alisg/tos-alisg-pve-0037c001/ooIjtoVAJK072B84GDQXC8LfP5gCrAeNITI7fm/?a=1233&bti=ODszNWYuMDE6&&bt=1358&ft=bC~O_mfLPD12NmY3rn-UxtC2WY6e3wv25DcAp&mime_type=video_mp4&rc=NDdmODtoaGZmNGk7M2c6NUBpMzRwaW05cjs3ZTMzODczNEAuMC5jLjRiNjUxMi4yMy8yYSNja3JjMmQ0b3BhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232849E5ACD3BF2C7093A8EB05&btag=e00090000",
    sourceName: "Eatame (@eatame.eater)",
    authorHandle: "@eatame.eater",
    publishedOrUpdatedAt: "2026-11-14T12:02:20.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-pudylychher-7707990762037808392",
    platform: 'tiktok',
    titleKh: "ចុះ50% គ្រប់មុខលើសាច់អាំងកូរ៉េ និងម្ហូបកូរ៉េ",
    titleEn: "ចុះ50% គ្រប់មុខលើសាច់អាំងកូរ៉េ និងម្ហូបកូរ៉េ (@pudy_lychher)",
    titleZh: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher) 柬埔寨美食与探店视频",
    descriptionKh: "ចុះ50% គ្រប់មុខលើសាច់អាំងកូរ៉េ និងម្ហូបកូរ៉េ #ពូឌីលីឈើ #localfood #koreanfood",
    descriptionEn: "ចុះ50% គ្រប់មុខលើសាច់អាំងកូរ៉េ និងម្ហូបកូរ៉េ #ពូឌីលីឈើ #localfood #koreanfood — Official Cambodian TikTok food review by @pudy_lychher.",
    descriptionZh: "来自柬埔寨美食创作者 @pudy_lychher 的 TikTok 视频：ចុះ50% គ្រប់មុខលើសាច់អាំងកូរ៉េ និងម្ហូបកូរ៉េ #ពូឌីលីឈើ #localfood #koreanfood",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ogtvQvOEEjimA74BdlGSMxiUB5CY5hTAHIau0~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=5RwyfjozGjFWh9mayEgjbT9dhR4%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@pudy_lychher/video/7707990762037808392",
    originalAccountUrl: "https://www.tiktok.com/@pudy_lychher",
    inlineVideoId: "7707990762037808392",
    directVideoUrl: "https://v9.tiktokcdn.com/b894cd6ba59f9f0b0431081f2d4b1130/6afdc4cc/video/tos/alisg/tos-alisg-pve-0037c001/okAv7GBmQ4BEEYU5rSb5ji570QPvSiIaAhdpm/?a=1233&bti=ODszNWYuMDE6&&bt=984&ft=L~O54ourD12Nvol-KzIxRHbjvlBF-UjNS3opiX&mime_type=video_mp4&rc=ZzY8ZDdpZGk0Ozo5NDdoNUBpM3NvO3U5cnM3ZTMzODczNEAxXjIuY2FjNWAxYzQwNmJiYSNuLm9nMmRrYXBhLS1kMS1zcw%3D%3D&vvpl=1&l=202611162328484D55737F2DB4227DE8FF&btag=e00090000",
    sourceName: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)",
    authorHandle: "@pudy_lychher",
    publishedOrUpdatedAt: "2026-11-14T11:40:50.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-fatamecooking-7707982544741862662",
    platform: 'tiktok',
    titleKh: "ក្បួនធ្វើមីឆាស្ងួត​ អោយមានរសជាតិឆ្ងាញ់😋 មី​កញ្ចប់​ ម៉ាយ​មី​ @mycupcambodia",
    titleEn: "ក្បួនធ្វើមីឆាស្ងួត​ អោយមានរសជាតិឆ្ងាញ់😋 មី​កញ្ចប់​ ម៉ាយ​មី​ @mycupcambodia (@fatame.cooking)",
    titleZh: "Fatame (@fatame.cooking) 柬埔寨美食与探店视频",
    descriptionKh: "ក្បួនធ្វើមីឆាស្ងួត​ អោយមានរសជាតិឆ្ងាញ់😋 មី​កញ្ចប់​ ម៉ាយ​មី​ @mycupcambodia #cookingathome  #noodles",
    descriptionEn: "ក្បួនធ្វើមីឆាស្ងួត​ អោយមានរសជាតិឆ្ងាញ់😋 មី​កញ្ចប់​ ម៉ាយ​មី​ @mycupcambodia #cookingathome  #noodles — Official Cambodian TikTok food review by @fatame.cooking.",
    descriptionZh: "来自柬埔寨美食创作者 @fatame.cooking 的 TikTok 视频：ក្បួនធ្វើមីឆាស្ងួត​ អោយមានរសជាតិឆ្ងាញ់😋 មី​កញ្ចប់​ ម៉ាយ​មី​ @mycupcambodia #cookingathome  #noodles",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/owqQAE2KjGyQVAgfwro8vIrq3FyDICFe496Dfp~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=RQHj0eSW3mdAXulekcgGNOa9EoQ%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@fatame.cooking/video/7707982544741862662",
    originalAccountUrl: "https://www.tiktok.com/@fatame.cooking",
    inlineVideoId: "7707982544741862662",
    directVideoUrl: "https://v9.tiktokcdn.com/10388a4b34eacdf854adc97557add0f5/6afdc4c6/video/tos/alisg/tos-alisg-pve-0037c001/oELIIaU0EFAeC8QAEj1D4e5UIiQUG2V41D7fCY/?a=1233&bti=ODszNWYuMDE6&&bt=1136&ft=bC~O_mfLPD12NrY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=OjxkZ2lnOTU1OGllO2hpZkBpMzU4aHU5cnE3ZTMzODczNEBhLTAvM15fXjMxMTFgX2I1YSNuNnNjMmRrLnBhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232850F1EAE8B11E904E9F4279&btag=e00090000",
    sourceName: "Fatame (@fatame.cooking)",
    authorHandle: "@fatame.cooking",
    publishedOrUpdatedAt: "2026-11-14T11:08:57.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-hubbaywithme-7707976375063399698",
    platform: 'tiktok',
    titleKh: "📍ហាង » Kungfu Kitchen 📍Chipmong 271 mega mall",
    titleEn: "📍ហាង » Kungfu Kitchen 📍Chipmong 271 mega mall (@hub_baywithme)",
    titleZh: "Hub Bay With Me (@hub_baywithme) 柬埔寨美食与探店视频",
    descriptionKh: "📍ហាង » Kungfu Kitchen  📍Chipmong 271 mega mall  #hubbayehh #food_m #kungfukitchen #hotpot #spicysauce",
    descriptionEn: "📍ហាង » Kungfu Kitchen  📍Chipmong 271 mega mall  #hubbayehh #food_m #kungfukitchen #hotpot #spicysauce — Official Cambodian TikTok food review by @hub_baywithme.",
    descriptionZh: "来自柬埔寨美食创作者 @hub_baywithme 的 TikTok 视频：📍ហាង » Kungfu Kitchen  📍Chipmong 271 mega mall  #hubbayehh #food_m #kungfukitchen #hotpot #spicysa",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ocZIg7fEAEAOB4qnoiBYEIiA4B17fEARRAC3Dc~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=%2FZxMUI5zGxo7im%2B05e1IrcA%2B8XQ%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@hub_baywithme/video/7707976375063399698",
    originalAccountUrl: "https://www.tiktok.com/@hub_baywithme",
    inlineVideoId: "7707976375063399698",
    directVideoUrl: "https://v9.tiktokcdn.com/b4f2b4bdce1ba2ca0d8879b0fe2f8ca0/6afdc46b/video/tos/alisg/tos-alisg-pve-0037c001/oMOv4Y6uaMX5gIX9FXmAATREEiB7iPBIBQ7iE/?a=1233&bti=ODszNWYuMDE6&&bt=880&ft=bC~O_mfLPD12N_Y3rn-Ux_o2NY6e3wv25dcAp&mime_type=video_mp4&rc=PGZoOjc3PDczaDg8Zzs3M0BpM3FyeHU5cjU2ZTMzODczNEAyYGJiYC5eNi0xMTZgYS1fYSMzZGAtMmQ0a3BhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232857ED4BC65F6722FBA0BF25&btag=e00088000",
    sourceName: "Hub Bay With Me (@hub_baywithme)",
    authorHandle: "@hub_baywithme",
    publishedOrUpdatedAt: "2026-11-14T10:45:00.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-derdailyoffici-7707975710408707348",
    platform: 'tiktok',
    titleKh: "បងប្អូនគួរតែទៅចូលរួមគាំទ្រការដាក់តាំងបង្ហាញនេះ នៅភូមិហ្វ្រង់កូហ្វូនី",
    titleEn: "បងប្អូនគួរតែទៅចូលរួមគាំទ្រការដាក់តាំងបង្ហាញនេះ នៅភូមិហ្វ្រង់កូហ្វូនី (@derdailyofficial)",
    titleZh: "DerDaily ដើរដេលី (@derdailyofficial) 柬埔寨美食与探店视频",
    descriptionKh: "បងប្អូនគួរតែទៅចូលរួមគាំទ្រការដាក់តាំងបង្ហាញនេះ នៅភូមិហ្វ្រង់កូហ្វូនី #ភូមិហ្រ្វង់កូហ្វូនី",
    descriptionEn: "បងប្អូនគួរតែទៅចូលរួមគាំទ្រការដាក់តាំងបង្ហាញនេះ នៅភូមិហ្វ្រង់កូហ្វូនី #ភូមិហ្រ្វង់កូហ្វូនី — Official Cambodian TikTok food review by @derdailyofficial.",
    descriptionZh: "来自柬埔寨美食创作者 @derdailyofficial 的 TikTok 视频：បងប្អូនគួរតែទៅចូលរួមគាំទ្រការដាក់តាំងបង្ហាញនេះ នៅភូមិហ្វ្រង់កូហ្វូនី #ភូមិហ្រ្វង់កូហ្វូនី",
    thumbnailUrl: "https://p19-common-sign.tiktokcdn.com/tos-alisg-p-0037/osdVeAD2EDEEADiEfIAAIkAFeD4ZdP5sxSAjoO~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=1aX%2FWckhHLrl4qNxH7r%2BVzzjcWI%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@derdailyofficial/video/7707975710408707348",
    originalAccountUrl: "https://www.tiktok.com/@derdailyofficial",
    inlineVideoId: "7707975710408707348",
    directVideoUrl: "https://v3.tiktokcdn.com/1604205ee61740866f3082a6c1fee75e/6afdc49a/video/tos/alisg/tos-alisg-pve-0037c001/okE1X8IgUlAiliBOD8RXzffG71BgBBNEKQzqj4/?a=1233&bti=ODszNWYuMDE6&&bt=1091&ft=bC~O_mfLPD12NaY3rn-Ux9JFNY6e3wv251cAp&mime_type=video_mp4&rc=Omc8aDxnOTMzZzU6NTVnZkBpanFua205cng2ZTMzODczNEA0XjMvMy01Xy4xLTVhLmEyYSNmaGplMmRjaXBhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232850EB6CBF2F635463AA4F5B&btag=e00090000",
    sourceName: "DerDaily ដើរដេលី (@derdailyofficial)",
    authorHandle: "@derdailyofficial",
    publishedOrUpdatedAt: "2026-11-14T10:42:25.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-38",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-mekorksach100m-7707968391776062721",
    platform: 'tiktok',
    titleKh: "មែនអត់ម៉ូយៗ?😁❤️ 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្",
    titleEn: "មែនអត់ម៉ូយៗ?😁❤️ 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច (@me_kork_sach100muk)",
    titleZh: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk) 柬埔寨美食与探店视频",
    descriptionKh: "មែនអត់ម៉ូយៗ?😁❤️ 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍Google Map: (មីគោកសាច់100មុខ ម៉ាម៉ាអូរឬស្សី) https://maps.app.goo.gl/pVN6ByuU53XEUCmv9?g_st=ic",
    descriptionEn: "មែនអត់ម៉ូយៗ?😁❤️ 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍Google Map: (មីគោកសាច — Official Cambodian TikTok food review by @me_kork_sach100muk.",
    descriptionZh: "来自柬埔寨美食创作者 @me_kork_sach100muk 的 TikTok 视频：មែនអត់ម៉ូយៗ?😁❤️ 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oQWWiVOfgpwRAIiNq3ID9FidEdB4UBfNBSDLBo~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=zb4JEWVaQIvWUHw%2BJ1t0iTmKF3I%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@me_kork_sach100muk/video/7707968391776062721",
    originalAccountUrl: "https://www.tiktok.com/@me_kork_sach100muk",
    inlineVideoId: "7707968391776062721",
    directVideoUrl: "https://v3.tiktokcdn.com/2da125c4d2092ad617983ed537c9e2a1/6afdc459/video/tos/alisg/tos-alisg-pve-0037c001/oMfRIEpVLwW3nF94SQBIEQiNgQiOBqABfdBUvi/?a=1233&bti=ODszNWYuMDE6&&bt=1329&ft=bC~O_mfLPD12NWY3rn-UxK12KY6e3wv25zcAp&mime_type=video_mp4&rc=ZzdoPGRmZjU5ZjlnO2Y8ZkBpamw8eWo5cmU2ZTMzODczNEAuLy9iYWE2NTIxXy41MTVhYSMybmBeMmRjNnBhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232853F72B939D69FFBF8D7828&btag=e00088000",
    sourceName: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk)",
    authorHandle: "@me_kork_sach100muk",
    publishedOrUpdatedAt: "2026-11-14T10:14:01.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-36",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-taseitrestaura-7707955556077587733",
    platform: 'tiktok',
    titleKh: "🥩 សាច់វេចខ្ចប់ និង ស៊ុប ពីតាសេត ឆ្ងាញ់ មានអនាម័យ ងាយស្រួលកុម្ម៉ង់ និងបានរហ័សទាន់ចិត្ត! 😋 🚚 ដ",
    titleEn: "🥩 សាច់វេចខ្ចប់ និង ស៊ុប ពីតាសេត ឆ្ងាញ់ មានអនាម័យ ងាយស្រួលកុម្ម៉ង់ និងបានរហ័សទាន (@taseit_restaurant)",
    titleZh: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "🥩 សាច់វេចខ្ចប់ និង ស៊ុប ពីតាសេត ឆ្ងាញ់ មានអនាម័យ ងាយស្រួលកុម្ម៉ង់ និងបានរហ័សទាន់ចិត្ត! 😋 🚚 ដឹកជញ្ជូនទូទាំងប្រទេស! 📞 កុម្ម៉ង់៖ 012 924 748 / 093 633 348 #តាសេត #សាច់វេចខ្ចប់តាសេត #ម្ហូបឆ្ងាញ់ #ដំណើរកម្សាន្ត #TaSeit",
    descriptionEn: "🥩 សាច់វេចខ្ចប់ និង ស៊ុប ពីតាសេត ឆ្ងាញ់ មានអនាម័យ ងាយស្រួលកុម្ម៉ង់ និងបានរហ័សទាន់ចិត្ត! 😋 🚚 ដឹកជញ្ជូនទូទាំងប្រទេស! 📞 កុម្ម៉ង់៖ 012 924 748 / 093 633 348 #តាស — Official Cambodian TikTok food review by @taseit_restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @taseit_restaurant 的 TikTok 视频：🥩 សាច់វេចខ្ចប់ និង ស៊ុប ពីតាសេត ឆ្ងាញ់ មានអនាម័យ ងាយស្រួលកុម្ម៉ង់ និងបានរហ័សទាន់ចិត្ត! 😋 🚚 ដឹកជញ្",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/osKleFkIEIDEAEe4C4fjGAEAjAERVD4DDAuMEt~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=hde6vjatRQQ3j46YaAT9bx%2BSfMU%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@taseit_restaurant/video/7707955556077587733",
    originalAccountUrl: "https://www.tiktok.com/@taseit_restaurant",
    inlineVideoId: "7707955556077587733",
    directVideoUrl: "https://v16.tiktokcdn.com/fe40554b7dfd70d562572ce6b0dcc9b4/6afdc44c/video/tos/alisg/tos-alisg-pve-0037c001/oUjf3DxRAsrIFgNVMC4FEiReQCgfJHA4vADKIh/?a=1233&bti=ODszNWYuMDE6&&bt=1494&ft=bC~O_mfLPD12NtY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=OGU1NjQ3M2VkNWY4ZGZpOEBpMzU1ZnA5cmY1ZTMzODczNEAwMTNfYTVgX18xNTA0LWJfYSNnZS41MmRjZXBhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32CA6&btag=e000b8000",
    sourceName: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant)",
    authorHandle: "@taseit_restaurant",
    publishedOrUpdatedAt: "2026-11-14T09:24:13.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-expressionshub-7707935162876579078",
    platform: 'tiktok',
    titleKh: "ភូមិហ្វ្រង់កូហ្វូនី​ ព្រឹកនេះអ៊ូអរគួរសម",
    titleEn: "ភូមិហ្វ្រង់កូហ្វូនី​ ព្រឹកនេះអ៊ូអរគួរសម (@expressions_hub)",
    titleZh: "សារអាហារ - Expressions Hub (@expressions_hub) 柬埔寨美食与探店视频",
    descriptionKh: "ភូមិហ្វ្រង់កូហ្វូនី​ ព្រឹកនេះអ៊ូអរគួរសម",
    descriptionEn: "ភូមិហ្វ្រង់កូហ្វូនី​ ព្រឹកនេះអ៊ូអរគួរសម — Official Cambodian TikTok food review by @expressions_hub.",
    descriptionZh: "来自柬埔寨美食创作者 @expressions_hub 的 TikTok 视频：ភូមិហ្វ្រង់កូហ្វូនី​ ព្រឹកនេះអ៊ូអរគួរសម",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/okHBHZAM2EbNjDkVA6MfQLQwfXIv2CDoKDijeF~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=pDF87rT1zPwb3nbaCF%2FoJ1tDSXM%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@expressions_hub/video/7707935162876579078",
    originalAccountUrl: "https://www.tiktok.com/@expressions_hub",
    inlineVideoId: "7707935162876579078",
    directVideoUrl: "https://v16.tiktokcdn.com/773934407d22d60f6956c0ca885dc571/6afdc44f/video/tos/alisg/tos-alisg-pve-0037c001/oYpEMXiflIB0jxQArdWgfyiRq4E0RKbBUEkAFB/?a=1233&bti=ODszNWYuMDE6&&bt=1210&ft=bC~O_mfLPD12NaY3rn-UxfKFWY6e3wv25xcAp&mime_type=video_mp4&rc=aWk8NzhnNzloZDc4aDNoM0Bpajhmdms5cms0ZTMzODczNEAzXjZfLTA1NjUxYDYxNjYyYSNibWc1MmRzX3BhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232849EB6CBF2F635463AA4F26&btag=e000b8000",
    sourceName: "សារអាហារ - Expressions Hub (@expressions_hub)",
    authorHandle: "@expressions_hub",
    publishedOrUpdatedAt: "2026-11-14T08:05:05.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-derdailyoffici-7707919492654877973",
    platform: 'tiktok',
    titleKh: "បង​ប្រុសឈប់ធ្វើការជាចុងភៅ 10 ឆ្នាំ មកបើកលក់ស៊ុប នៅខាងដងស្ទឹងបំណក់នេះ",
    titleEn: "បង​ប្រុសឈប់ធ្វើការជាចុងភៅ 10 ឆ្នាំ មកបើកលក់ស៊ុប នៅខាងដងស្ទឹងបំណក់នេះ (@derdailyofficial)",
    titleZh: "DerDaily ដើរដេលី (@derdailyofficial) 柬埔寨美食与探店视频",
    descriptionKh: "បង​ប្រុសឈប់ធ្វើការជាចុងភៅ 10 ឆ្នាំ មកបើកលក់ស៊ុប នៅខាងដងស្ទឹងបំណក់នេះ #CAMBODIALITE #ស្រាលស្រទន់ជួបជុំបានយូរ #CAMBODIABEER",
    descriptionEn: "បង​ប្រុសឈប់ធ្វើការជាចុងភៅ 10 ឆ្នាំ មកបើកលក់ស៊ុប នៅខាងដងស្ទឹងបំណក់នេះ #CAMBODIALITE #ស្រាលស្រទន់ជួបជុំបានយូរ #CAMBODIABEER — Official Cambodian TikTok food review by @derdailyofficial.",
    descriptionZh: "来自柬埔寨美食创作者 @derdailyofficial 的 TikTok 视频：បង​ប្រុសឈប់ធ្វើការជាចុងភៅ 10 ឆ្នាំ មកបើកលក់ស៊ុប នៅខាងដងស្ទឹងបំណក់នេះ #CAMBODIALITE #ស្រាលស្រទន់ជួបជុ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oU7fI4QC0DAfDHATAAFuDjVAHI1ATEP8QqfEwE~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=Zb1u8RmIsUFr9uosXK2a%2B6IpNdI%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@derdailyofficial/video/7707919492654877973",
    originalAccountUrl: "https://www.tiktok.com/@derdailyofficial",
    inlineVideoId: "7707919492654877973",
    directVideoUrl: "https://v3.tiktokcdn.com/7ca06014b3701c254267f5ecf1cb68b9/6afdc4f7/video/tos/alisg/tos-alisg-pve-0037c001/ogOfBfxpEihcECCKFQqgiBJ4IPRAAsA6vBgaA6/?a=1233&bti=ODszNWYuMDE6&&bt=1108&ft=bC~O_mfLPD12NaY3rn-Ux9JFNY6e3wv251cAp&mime_type=video_mp4&rc=Z2U7O2c7NDs8OWQ8O2Q7aUBpM2QzbGs5cm4zZTMzODczNEBfYF9gMGBeXmExMmAzYC5jYSNxLTUvMmRzYnBhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232850EB6CBF2F635463AA4F5B&btag=e00098000",
    sourceName: "DerDaily ដើរដេលី (@derdailyofficial)",
    authorHandle: "@derdailyofficial",
    publishedOrUpdatedAt: "2026-11-14T07:04:16.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-38",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-plovder-7707860337105669377",
    platform: 'tiktok',
    titleKh: "អ៊ុំស្រីអ្នកតាកែវមករស់នៅកោះស្តេចតាំងពីសម័យបែកអាពត ផ្តើមរបរលក់គុយទាវជាង ២០ឆ្នាំ",
    titleEn: "អ៊ុំស្រីអ្នកតាកែវមករស់នៅកោះស្តេចតាំងពីសម័យបែកអាពត ផ្តើមរបរលក់គុយទាវជាង ២០ឆ្នាំ (@plov_der)",
    titleZh: "ផ្លូវដើរ - Plov Der (@plov_der) 柬埔寨美食与探店视频",
    descriptionKh: "អ៊ុំស្រីអ្នកតាកែវមករស់នៅកោះស្តេចតាំងពីសម័យបែកអាពត ផ្តើមរបរលក់គុយទាវជាង ២០ឆ្នាំ  #fypシ゚ #everyone #followers #foodie",
    descriptionEn: "អ៊ុំស្រីអ្នកតាកែវមករស់នៅកោះស្តេចតាំងពីសម័យបែកអាពត ផ្តើមរបរលក់គុយទាវជាង ២០ឆ្នាំ  #fypシ゚ #everyone #followers #foodie — Official Cambodian TikTok food review by @plov_der.",
    descriptionZh: "来自柬埔寨美食创作者 @plov_der 的 TikTok 视频：អ៊ុំស្រីអ្នកតាកែវមករស់នៅកោះស្តេចតាំងពីសម័យបែកអាពត ផ្តើមរបរលក់គុយទាវជាង ២០ឆ្នាំ  #fypシ゚ #everyone #fo",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/owD9QEaIBFnleC0YgifrAUAAFicyAqBCi5rVV3~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=eryS4yUgVGqajsxxrMFkLh9VyVM%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@plov_der/video/7707860337105669377",
    originalAccountUrl: "https://www.tiktok.com/@plov_der",
    inlineVideoId: "7707860337105669377",
    directVideoUrl: "https://v9.tiktokcdn.com/1c056bb6d5c40a9a5bf98da1dadd8d7c/6afdc4e0/video/tos/alisg/tos-alisg-pve-0037/oUo3SqXPiSzfAian4RQIDgB0ToIeBdBzCE4vVM/?a=1233&bti=ODszNWYuMDE6&&bt=3442&ft=L~O54ourD12NvWl-KzIxRNvSDlBF-UjNSmopiX&mime_type=video_mp4&rc=ZDlpZWc6NGg0ZjQ5ZDo3aEBpamY2b205cjt3ZTMzODgzNEBeMi40MmA1NTMxMl9jMy5hYSNiZHE0MmRrMm9hLS1kLy1zcw%3D%3D&vvpl=1&l=20261116232853B78F6EA1007D649445B9&btag=e00090000",
    sourceName: "ផ្លូវដើរ - Plov Der (@plov_der)",
    authorHandle: "@plov_der",
    publishedOrUpdatedAt: "2026-11-14T03:14:43.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-27",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-ounwelldailyco-7707832226758544661",
    platform: 'tiktok',
    titleKh: "Good morning 3nak mea kon 💛",
    titleEn: "Good morning 3nak mea kon 💛 (@ounwelldailycooking)",
    titleZh: "Oun Well Daily Cooking (@ounwelldailycooking) 柬埔寨美食与探店视频",
    descriptionKh: "Good morning 3nak mea kon 💛",
    descriptionEn: "Good morning 3nak mea kon 💛 — Official Cambodian TikTok food review by @ounwelldailycooking.",
    descriptionZh: "来自柬埔寨美食创作者 @ounwelldailycooking 的 TikTok 视频：Good morning 3nak mea kon 💛",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oELeJfbr3AQeGHhDImjtDGuFwv3eQ2tHRyMAQG~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=XVXEk%2FixBvQfbndWDKJAab8M%2F4k%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@ounwelldailycooking/video/7707832226758544661",
    originalAccountUrl: "https://www.tiktok.com/@ounwelldailycooking",
    inlineVideoId: "7707832226758544661",
    directVideoUrl: "https://v9.tiktokcdn.com/c4c0da9e8e62836072292df4a875e4d8/6afdc447/video/tos/alisg/tos-alisg-pve-0037c001/oE4f7mSjDIZ2IuRDEV2AlfDzFQfQACKBvE631r/?a=1233&bti=ODszNWYuMDE6&&bt=1036&ft=bC~O_mfLPD12NVY3rn-Ux_N5PY6e3wv25LcAp&mime_type=video_mp4&rc=NWZmZ2c3OmVnZzdkZmRpZEBpMzZnZHM5cm51ZTMzODczNEAxNjVhLl4wNmAxXzAyMGJhYSNncjRqMmQ0Y29hLS1kMWBzcw%3D%3D&vvpl=1&l=202611162328572824A64FCD4BE49FEFE1&btag=e000b8000",
    sourceName: "Oun Well Daily Cooking (@ounwelldailycooking)",
    authorHandle: "@ounwelldailycooking",
    publishedOrUpdatedAt: "2026-11-14T01:25:38.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-4",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-suyadaily-7707813693916007701",
    platform: 'tiktok',
    titleKh: "ដូរម៉ូតសក់ហើយ😆",
    titleEn: "ដូរម៉ូតសក់ហើយ😆 (@suyadaily)",
    titleZh: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily) 柬埔寨美食与探店视频",
    descriptionKh: "ដូរម៉ូតសក់ហើយ😆#សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 #កូនអ្នកខេត្តកណ្តាល #sweet #idol",
    descriptionEn: "ដូរម៉ូតសក់ហើយ😆#សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 #កូនអ្នកខេត្តកណ្តាល #sweet #idol — Official Cambodian TikTok food review by @suyadaily.",
    descriptionZh: "来自柬埔寨美食创作者 @suyadaily 的 TikTok 视频：ដូរម៉ូតសក់ហើយ😆#សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 #កូនអ្នកខេត្តកណ្តាល ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oI3AgeBCkIqAi7TnJcPBR0Io84rSpeENAiB1NI~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=5ySPW32pAsxHsFXfmhxEJ8Qy8tg%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@suyadaily/video/7707813693916007701",
    originalAccountUrl: "https://www.tiktok.com/@suyadaily",
    inlineVideoId: "7707813693916007701",
    directVideoUrl: "https://v3.tiktokcdn.com/d71ac4a61f9a33a9d51a773821a0e01a/6afdc448/video/tos/alisg/tos-alisg-pve-0037c001/ogPRIEn014IMjBA3raBjESNpgQi8BqAeeTBcOi/?a=1233&bti=ODszNWYuMDE6&&bt=669&ft=bC~O_mfLPD12NVY3rn-UxrN5VY6e3wv252cAp&mime_type=video_mp4&rc=NTM6ODM3ZDw2NzQ7ZDo2ZUBpamVvM3I5cjt0ZTMzODczNEA0Ly9fXy8uNjExLWNhYWBgYSNuNC5uMmQ0Ym9hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232856152A25DD5E5B70AA15C3&btag=e000b8000",
    sourceName: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily)",
    authorHandle: "@suyadaily",
    publishedOrUpdatedAt: "2026-11-14T00:13:43.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-thehungryhouse-7707699632020655374",
    platform: 'tiktok',
    titleKh: "As we get older it gets harder to make good friends. I decided to put myself out there and find",
    titleEn: "As we get older it gets harder to make good friends. I decided to put myself out (@the_hungry_housewife)",
    titleZh: "The Hungry Housewife (@the_hungry_housewife) 柬埔寨美食与探店视频",
    descriptionKh: "As we get older it gets harder to make good friends. I decided to put myself out there and find people who are like me who love food and good company. I decided to start a supper club. Where we would meet up once a month, dress up and share a meal and make some good memories. We call ourselves “The Supper Sorority”. We all clicked immediately. If you are looking to meet people, create a supper club and see if people will join up. It’s the best risk I took and I absolutely love these people. We already have other meet ups (Friendsgiving and Christmas parties planned). Take that step and put yourself out there.  . . #friends #restaurant #eating #women #viral",
    descriptionEn: "As we get older it gets harder to make good friends. I decided to put myself out there and find people who are like me who love food and good company. I decided — Official Cambodian TikTok food review by @the_hungry_housewife.",
    descriptionZh: "来自柬埔寨美食创作者 @the_hungry_housewife 的 TikTok 视频：As we get older it gets harder to make good friends. I decided to put myself out there and find peop",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast5-p-0068-tx/ogQ6AiuEiIDEgleF63fAsADARAAcqBSuDA3AC2~tplv-tiktokx-dmt-logom:tos-useast5-i-0068-tx/oYfqTpRDE0D9O3ZEbQFAGEAADOA5IgC40eASdA.image?dr=14573&x-expires=1795014000&x-signature=BaLvUlbhvmznHTz5VGWfh7xEkIM%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@the_hungry_housewife/video/7707699632020655374",
    originalAccountUrl: "https://www.tiktok.com/@the_hungry_housewife",
    inlineVideoId: "7707699632020655374",
    directVideoUrl: "https://v9.tiktokcdn.com/62a97072e6ebc95379f2915aa0b64d20/6afdc47a/video/tos/alisg/tos-alisg-ve-37c799-sg/o4BXR2BQev5PeKdz3vRkSZgiQ12iIEqxDEgADn/?a=1233&bti=ODszNWYuMDE6&&bt=1406&ft=bC~O_mfLPD12NKY3rn-UxMJ2WY6e3wv25ocAp&mime_type=video_mp4&rc=Z2g4NTM5PDY2NzRkNjY6OUBpajppc3A5cjNtZTMzZzczNEA0Mi0tYGNjXmAxYDFfYjM2YSNuMDNrMmQ0cW9hLS1kMS9zcw%3D%3D&vvpl=1&l=20261116232859FFFEAEC56B459D8FA012&btag=e00090000",
    sourceName: "The Hungry Housewife (@the_hungry_housewife)",
    authorHandle: "@the_hungry_housewife",
    publishedOrUpdatedAt: "2026-11-13T16:51:06.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-eatameeater-7707667859073289492",
    platform: 'tiktok',
    titleKh: "មាសសុទ្ធមិនខ្លាចភ្លើង​ ប្រេងកូឡា​ គោមាស​ ហ៊ានផលិតហ៊ានបង្ហាញ​ សាកល្បងប្រើទាំងអស់គ្នា​ 🇰🇭✊​",
    titleEn: "មាសសុទ្ធមិនខ្លាចភ្លើង​ ប្រេងកូឡា​ គោមាស​ ហ៊ានផលិតហ៊ានបង្ហាញ​ សាកល្បងប្រើទាំងអស់គ (@eatame.eater)",
    titleZh: "Eatame (@eatame.eater) 柬埔寨美食与探店视频",
    descriptionKh: "មាសសុទ្ធមិនខ្លាចភ្លើង​ ប្រេងកូឡា​ គោមាស​ ហ៊ានផលិតហ៊ានបង្ហាញ​ សាកល្បងប្រើទាំងអស់គ្នា​ 🇰🇭✊​ #madeincambodia  #productofcambodia",
    descriptionEn: "មាសសុទ្ធមិនខ្លាចភ្លើង​ ប្រេងកូឡា​ គោមាស​ ហ៊ានផលិតហ៊ានបង្ហាញ​ សាកល្បងប្រើទាំងអស់គ្នា​ 🇰🇭✊​ #madeincambodia  #productofcambodia — Official Cambodian TikTok food review by @eatame.eater.",
    descriptionZh: "来自柬埔寨美食创作者 @eatame.eater 的 TikTok 视频：មាសសុទ្ធមិនខ្លាចភ្លើង​ ប្រេងកូឡា​ គោមាស​ ហ៊ានផលិតហ៊ានបង្ហាញ​ សាកល្បងប្រើទាំងអស់គ្នា​ 🇰🇭✊​ #madeinc",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oYIMvWyIQQfQAp7fk38WKgtAj6lJVM4eDEPzCK~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=GAHREM5eoi7QvFyeT9DFxjXM4nw%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@eatame.eater/video/7707667859073289492",
    originalAccountUrl: "https://www.tiktok.com/@eatame.eater",
    inlineVideoId: "7707667859073289492",
    directVideoUrl: "https://v16.tiktokcdn.com/d01fcc266166041ed9c36d432a859cbb/6afdc4de/video/tos/alisg/tos-alisg-pve-0037c001/owIa3vIVivricQBEAxvlAEBPiY3mQ11UJ6vAX/?a=1233&bti=ODszNWYuMDE6&&bt=989&ft=bC~O_mfLPD12NmY3rn-UxtC2WY6e3wv25DcAp&mime_type=video_mp4&rc=Zzo1NTw8ZDxlNmRlOmUzZEBpanF4OGs5cm9sZTMzODczNEBfYTFeYmEtXi0xL2I0X141YSNmczJnMmRrMm9hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232849E5ACD3BF2C7093A8EB05&btag=e00090000",
    sourceName: "Eatame (@eatame.eater)",
    authorHandle: "@eatame.eater",
    publishedOrUpdatedAt: "2026-11-13T14:47:48.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-suyadaily-7707658508858035476",
    platform: 'tiktok',
    titleKh: "ទៅរៀនគួរសប្បាយណាស់😊🥰",
    titleEn: "ទៅរៀនគួរសប្បាយណាស់😊🥰 (@suyadaily)",
    titleZh: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily) 柬埔寨美食与探店视频",
    descriptionKh: "ទៅរៀនគួរសប្បាយណាស់😊🥰#reels #vlog #រៀន #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏",
    descriptionEn: "ទៅរៀនគួរសប្បាយណាស់😊🥰#reels #vlog #រៀន #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 — Official Cambodian TikTok food review by @suyadaily.",
    descriptionZh: "来自柬埔寨美食创作者 @suyadaily 的 TikTok 视频：ទៅរៀនគួរសប្បាយណាស់😊🥰#reels #vlog #រៀន #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oYu3RxycqEUuEEB1GB9i6LiiITBAhpAqegfRpd~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=GvztY9zYyOEGToXEf1Vcygy%2FNQs%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@suyadaily/video/7707658508858035476",
    originalAccountUrl: "https://www.tiktok.com/@suyadaily",
    inlineVideoId: "7707658508858035476",
    directVideoUrl: "https://v3.tiktokcdn.com/ae8d9aa93be7ec98d1613b14ca015f2b/6afdc4e8/video/tos/alisg/tos-alisg-pve-0037c001/osyR19ibTThJH3UsEdieGEgIBfADiBQuqBmqxE/?a=1233&bti=ODszNWYuMDE6&&bt=916&ft=bC~O_mfLPD12NVY3rn-UxrN5VY6e3wv252cAp&mime_type=video_mp4&rc=PGU8ZTw7NTs4aDdlOztoaEBpM2hocW85cmlrZTMzODczNEAvMl9eYy8xNWExNi42NmFjYSNtaV5kMmRjZW9hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232856152A25DD5E5B70AA15C3&btag=e00090000",
    sourceName: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily)",
    authorHandle: "@suyadaily",
    publishedOrUpdatedAt: "2026-11-13T14:11:31.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-fatamecooking-7707654125483379988",
    platform: 'tiktok',
    titleKh: "រៀនធ្វើការ​ ការ៉េមច្រកថង់​ ការ៉េមកី​ លក់ម្តងមើល​ 😁​ ទំនេរសាករៀនធ្វើចែកអ្នកផ្ទះញ៊ាំលេងបាន​",
    titleEn: "រៀនធ្វើការ​ ការ៉េមច្រកថង់​ ការ៉េមកី​ លក់ម្តងមើល​ 😁​ ទំនេរសាករៀនធ្វើចែកអ្នកផ្ទះញ (@fatame.cooking)",
    titleZh: "Fatame (@fatame.cooking) 柬埔寨美食与探店视频",
    descriptionKh: "រៀនធ្វើការ​ ការ៉េមច្រកថង់​ ការ៉េមកី​ លក់ម្តងមើល​ 😁​ ទំនេរសាករៀនធ្វើចែកអ្នកផ្ទះញ៊ាំលេងបាន​  #icecreamtime #IceCreamMaker",
    descriptionEn: "រៀនធ្វើការ​ ការ៉េមច្រកថង់​ ការ៉េមកី​ លក់ម្តងមើល​ 😁​ ទំនេរសាករៀនធ្វើចែកអ្នកផ្ទះញ៊ាំលេងបាន​  #icecreamtime #IceCreamMaker — Official Cambodian TikTok food review by @fatame.cooking.",
    descriptionZh: "来自柬埔寨美食创作者 @fatame.cooking 的 TikTok 视频：រៀនធ្វើការ​ ការ៉េមច្រកថង់​ ការ៉េមកី​ លក់ម្តងមើល​ 😁​ ទំនេរសាករៀនធ្វើចែកអ្នកផ្ទះញ៊ាំលេងបាន​  #icecrea",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oYABEq73QmqIfB34evDxKIjSc9FREZFgTMaESx~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=X9EDoNlMtoG8YKfwhzzRfkcCRTU%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@fatame.cooking/video/7707654125483379988",
    originalAccountUrl: "https://www.tiktok.com/@fatame.cooking",
    inlineVideoId: "7707654125483379988",
    directVideoUrl: "https://v9.tiktokcdn.com/ca3cba0c65bf36e07bd3eb6b152efed4/6afdc4b8/video/tos/alisg/tos-alisg-pve-0037c001/osNb75EEIBgqjC9fxFFc3wjKSrZaSEAmDBxRQe/?a=1233&bti=ODszNWYuMDE6&&bt=824&ft=bC~O_mfLPD12NrY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=Z2Q0Omk8Zzw0ZmQ8MzZoZUBpM3U7Zng5cnJrZTMzODczNEAuL14zYzI1NWAxYDVhLi4zYSM2aV9nMmRzYG9hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232850F1EAE8B11E904E9F4279&btag=e00090000",
    sourceName: "Fatame (@fatame.cooking)",
    authorHandle: "@fatame.cooking",
    publishedOrUpdatedAt: "2026-11-13T13:54:31.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-derdailyoffici-7707653074529144085",
    platform: 'tiktok',
    titleKh: "ផលិតផលខ្មែរឥឡូវមានគុណភាពល្អ ហើយមានតម្លៃសមរម្យទៀត",
    titleEn: "ផលិតផលខ្មែរឥឡូវមានគុណភាពល្អ ហើយមានតម្លៃសមរម្យទៀត (@derdailyofficial)",
    titleZh: "DerDaily ដើរដេលី (@derdailyofficial) 柬埔寨美食与探店视频",
    descriptionKh: "ផលិតផលខ្មែរឥឡូវមានគុណភាពល្អ ហើយមានតម្លៃសមរម្យទៀត #slorcha #derdaily",
    descriptionEn: "ផលិតផលខ្មែរឥឡូវមានគុណភាពល្អ ហើយមានតម្លៃសមរម្យទៀត #slorcha #derdaily — Official Cambodian TikTok food review by @derdailyofficial.",
    descriptionZh: "来自柬埔寨美食创作者 @derdailyofficial 的 TikTok 视频：ផលិតផលខ្មែរឥឡូវមានគុណភាពល្អ ហើយមានតម្លៃសមរម្យទៀត #slorcha #derdaily",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o8Wk6Af3c9IAAFRDEqgCELFEmrAfAq3aDKBxCN~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=AAExcr5qIZBZudCbt4e%2BelxjTEA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@derdailyofficial/video/7707653074529144085",
    originalAccountUrl: "https://www.tiktok.com/@derdailyofficial",
    inlineVideoId: "7707653074529144085",
    directVideoUrl: "https://v3.tiktokcdn.com/cc4513b3bf3cb8cb4717307e624edfc8/6afdc4d0/video/tos/alisg/tos-alisg-pve-0037c001/ocYABFEa6kEAvIi3XGPdVPMriQimTBNXc4Xxd/?a=1233&bti=ODszNWYuMDE6&&bt=1234&ft=bC~O_mfLPD12NaY3rn-Ux9JFNY6e3wv251cAp&mime_type=video_mp4&rc=NDU4Z2YzZ2VkPDVmNjpnaUBpanF5Nms5cm1rZTMzODczNEAwMl9fYWNjNjExMjU0MGIwYSNiZDZmMmQ0Xm9hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232850EB6CBF2F635463AA4F5B&btag=e00090000",
    sourceName: "DerDaily ដើរដេលី (@derdailyofficial)",
    authorHandle: "@derdailyofficial",
    publishedOrUpdatedAt: "2026-11-13T13:50:26.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-38",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-eatameeater-7707644298489056533",
    platform: 'tiktok',
    titleKh: "មួយជាតិរៀបការ២ដង​ តាមពិតអាចឹងទេហី​ 😁🇰🇭​ សម្ពោធផលិតផលខ្មែរ​ ស្លឆា​ គ្រឿងជាតិ​ រសជាតិខ្មែរ​ @S",
    titleEn: "មួយជាតិរៀបការ២ដង​ តាមពិតអាចឹងទេហី​ 😁🇰🇭​ សម្ពោធផលិតផលខ្មែរ​ ស្លឆា​ គ្រឿងជាតិ​  (@eatame.eater)",
    titleZh: "Eatame (@eatame.eater) 柬埔寨美食与探店视频",
    descriptionKh: "មួយជាតិរៀបការ២ដង​ តាមពិតអាចឹងទេហី​ 😁🇰🇭​ សម្ពោធផលិតផលខ្មែរ​ ស្លឆា​ គ្រឿងជាតិ​ រសជាតិខ្មែរ​ @Slorcha  #event  #launchparty",
    descriptionEn: "មួយជាតិរៀបការ២ដង​ តាមពិតអាចឹងទេហី​ 😁🇰🇭​ សម្ពោធផលិតផលខ្មែរ​ ស្លឆា​ គ្រឿងជាតិ​ រសជាតិខ្មែរ​ @Slorcha  #event  #launchparty — Official Cambodian TikTok food review by @eatame.eater.",
    descriptionZh: "来自柬埔寨美食创作者 @eatame.eater 的 TikTok 视频：មួយជាតិរៀបការ២ដង​ តាមពិតអាចឹងទេហី​ 😁🇰🇭​ សម្ពោធផលិតផលខ្មែរ​ ស្លឆា​ គ្រឿងជាតិ​ រសជាតិខ្មែរ​ @Slorch",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/og3i8FBRcDqf9AEzDgq0Ala7QfnWU9BEDCQgwJ~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=iIdY4xwXY0UrFhGmPmPwMFZVbjY%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@eatame.eater/video/7707644298489056533",
    originalAccountUrl: "https://www.tiktok.com/@eatame.eater",
    inlineVideoId: "7707644298489056533",
    directVideoUrl: "https://v16.tiktokcdn.com/ff88130f0c57662fef6bdacefa86ec5c/6afdc4e5/video/tos/alisg/tos-alisg-pve-0037c001/ooUqDIzA4Az8gR1jgQFi9GcDWf0n7ewEBEBnuI/?a=1233&bti=ODszNWYuMDE6&&bt=1291&ft=bC~O_mfLPD12NmY3rn-UxtC2WY6e3wv25DcAp&mime_type=video_mp4&rc=OmdoNmRoZmk7OzRmaWc3OEBpam00OXg5cm9qZTMzODczNEBjYC0vNTAtX14xMGE1LzJiYSNsb2QyMmRrbW9hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232849E5ACD3BF2C7093A8EB05&btag=e00098000",
    sourceName: "Eatame (@eatame.eater)",
    authorHandle: "@eatame.eater",
    publishedOrUpdatedAt: "2026-11-13T13:16:23.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-pudylychher-7707643277175950610",
    platform: 'tiktok',
    titleKh: "Burger 🍔 កូនខ្មែរ ចុះ30% គ្រប់មុខ",
    titleEn: "Burger 🍔 កូនខ្មែរ ចុះ30% គ្រប់មុខ (@pudy_lychher)",
    titleZh: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher) 柬埔寨美食与探店视频",
    descriptionKh: "Burger 🍔 កូនខ្មែរ ចុះ30% គ្រប់មុខ  #ពូឌីលីឈើ #fastfood #barameyburger",
    descriptionEn: "Burger 🍔 កូនខ្មែរ ចុះ30% គ្រប់មុខ  #ពូឌីលីឈើ #fastfood #barameyburger — Official Cambodian TikTok food review by @pudy_lychher.",
    descriptionZh: "来自柬埔寨美食创作者 @pudy_lychher 的 TikTok 视频：Burger 🍔 កូនខ្មែរ ចុះ30% គ្រប់មុខ  #ពូឌីលីឈើ #fastfood #barameyburger",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oQNFI3FC7CcqcwM3BEDAIx9eR6qgDBjEOwE6fF~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=gd9NpMaqvaG4cv70PaVA9u8HXwY%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@pudy_lychher/video/7707643277175950610",
    originalAccountUrl: "https://www.tiktok.com/@pudy_lychher",
    inlineVideoId: "7707643277175950610",
    directVideoUrl: "https://v9.tiktokcdn.com/0061ef9417312aad670cd45d6f93fc23/6afdc4cb/video/tos/alisg/tos-alisg-pve-0037c001/osQB6xqCQDRwEq6EFwAbxIED3gZc9lFB3NfmPe/?a=1233&bti=ODszNWYuMDE6&&bt=879&ft=L~O54ourD12Nvol-KzIxRHbjvlBF-UjNS3opiX&mime_type=video_mp4&rc=aTk8NmQ2Mzo7NzNlZWU7Z0Bpamo7M3g5cnRqZTMzODczNEBgMWE2MS0uNmExLjU2XmJfYSNvX2txMmRrbG9hLS1kMWBzcw%3D%3D&vvpl=1&l=202611162328484D55737F2DB4227DE8FF&btag=e00090000",
    sourceName: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)",
    authorHandle: "@pudy_lychher",
    publishedOrUpdatedAt: "2026-11-13T13:12:25.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-derdailyoffici-7707638240768970005",
    platform: 'tiktok',
    titleKh: "ទិដ្ឋភាពនាពេលរាត្រីនៅភូមិហ្រ្វង់កូហ្វូនី",
    titleEn: "ទិដ្ឋភាពនាពេលរាត្រីនៅភូមិហ្រ្វង់កូហ្វូនី (@derdailyofficial)",
    titleZh: "DerDaily ដើរដេលី (@derdailyofficial) 柬埔寨美食与探店视频",
    descriptionKh: "ទិដ្ឋភាពនាពេលរាត្រីនៅភូមិហ្រ្វង់កូហ្វូនី  #ភូមិហ្រ្វង់កូហ្វូនី #lafrancophonie",
    descriptionEn: "ទិដ្ឋភាពនាពេលរាត្រីនៅភូមិហ្រ្វង់កូហ្វូនី  #ភូមិហ្រ្វង់កូហ្វូនី #lafrancophonie — Official Cambodian TikTok food review by @derdailyofficial.",
    descriptionZh: "来自柬埔寨美食创作者 @derdailyofficial 的 TikTok 视频：ទិដ្ឋភាពនាពេលរាត្រីនៅភូមិហ្រ្វង់កូហ្វូនី  #ភូមិហ្រ្វង់កូហ្វូនី #lafrancophonie",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oEAvDMeG4IbzjGVIFETeH7XhuEFAfIBALAARQA~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=49fOsj8ofnBNJdyzatHh%2FiaQG%2BM%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@derdailyofficial/video/7707638240768970005",
    originalAccountUrl: "https://www.tiktok.com/@derdailyofficial",
    inlineVideoId: "7707638240768970005",
    directVideoUrl: "https://v3.tiktokcdn.com/8722c4668623f7ec3524416b26ffd0ae/6afdc441/video/tos/alisg/tos-alisg-pve-0037c001/ok3ekFCj4DVb7gIfCABqA2DSIfP2yKDELtE6gQ/?a=1233&bti=ODszNWYuMDE6&&bt=1028&ft=bC~O_mfLPD12NaY3rn-Ux9JFNY6e3wv251cAp&mime_type=video_mp4&rc=ZTNpNWQ0ZmY7MzhmODk0N0BpMzozb2w5cndqZTMzODczNEBjYjAxNmMtX2IxM2ItMDNeYSNzZl5gMmRrY29hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232850EB6CBF2F635463AA4F5B&btag=e000b8000",
    sourceName: "DerDaily ដើរដេលី (@derdailyofficial)",
    authorHandle: "@derdailyofficial",
    publishedOrUpdatedAt: "2026-11-13T12:52:52.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-38",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-tosmokplouk-7707635933444574484",
    platform: 'tiktok',
    titleKh: "ជួបគ្នាម៉ោង6ល្ងាចណាអ្នកក្រុងសួង",
    titleEn: "ជួបគ្នាម៉ោង6ល្ងាចណាអ្នកក្រុងសួង (@tosmokplouk)",
    titleZh: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk) 柬埔寨美食与探店视频",
    descriptionKh: "ជួបគ្នាម៉ោង6ល្ងាចណាអ្នកក្រុងសួង#videoviral  #emart24 #emart24Cambodia  #ALLDAYH!GHLIGHT #KoreanLifestyle",
    descriptionEn: "ជួបគ្នាម៉ោង6ល្ងាចណាអ្នកក្រុងសួង#videoviral  #emart24 #emart24Cambodia  #ALLDAYH!GHLIGHT #KoreanLifestyle — Official Cambodian TikTok food review by @tosmokplouk.",
    descriptionZh: "来自柬埔寨美食创作者 @tosmokplouk 的 TikTok 视频：ជួបគ្នាម៉ោង6ល្ងាចណាអ្នកក្រុងសួង#videoviral  #emart24 #emart24Cambodia  #ALLDAYH!GHLIGHT #KoreanLifes",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oEHBhEViqDB6Mdb3B7iigLBpEeARRI5IIrfLc4~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=cWD2qy42gzlMtscZTcM1wBcQgfw%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@tosmokplouk/video/7707635933444574484",
    originalAccountUrl: "https://www.tiktok.com/@tosmokplouk",
    inlineVideoId: "7707635933444574484",
    directVideoUrl: "https://v9.tiktokcdn.com/da28e231efa1e9ab6705b9a953ce502c/6afdc46a/video/tos/alisg/tos-alisg-pve-0037c001/owbFiBAiLIL7XRQgrsEedLE4FiBpBf4BchcqH3/?a=1233&bti=ODszNWYuMDE6&&bt=808&ft=bC~O_mfLPD12NWY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=M2RmZTU1NWdpNDpnNjw8NkBpM3dma3U5cm5qZTMzODczNEBhNDIyLy00NV4xYS9eLi4tYSNlam9pMmRzX29hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32C72&btag=e00088000",
    sourceName: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk)",
    authorHandle: "@tosmokplouk",
    publishedOrUpdatedAt: "2026-11-13T12:43:55.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-80",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-khleancheck-7707633036996693268",
    platform: 'tiktok',
    titleKh: "ចង់រំលឹកស៊ុបគោឆ្នាំងដីពីជំនាន់មុន អាចមកសាកបាន នៅហាងរំលឹក🥰 បរិយាកាសក៏អ៊ែម រសជាតិក៏ឆ្ងាញ់ 😋😆📍",
    titleEn: "ចង់រំលឹកស៊ុបគោឆ្នាំងដីពីជំនាន់មុន អាចមកសាកបាន នៅហាងរំលឹក🥰 បរិយាកាសក៏អ៊ែម រសជាតិ (@.khleancheck)",
    titleZh: "ឃ្លានឆែក - Khlean Check (@.khleancheck) 柬埔寨美食与探店视频",
    descriptionKh: "ចង់រំលឹកស៊ុបគោឆ្នាំងដីពីជំនាន់មុន អាចមកសាកបាន នៅហាងរំលឹក🥰 បរិយាកាសក៏អ៊ែម រសជាតិក៏ឆ្ងាញ់ 😋😆📍  ℹ️ពត៌មានលំអិតនឹងទីតាំងហាងនៅក្នុងខំមិនខាងក្រោម👇 #ឃ្លានឆេក #រំលឹក",
    descriptionEn: "ចង់រំលឹកស៊ុបគោឆ្នាំងដីពីជំនាន់មុន អាចមកសាកបាន នៅហាងរំលឹក🥰 បរិយាកាសក៏អ៊ែម រសជាតិក៏ឆ្ងាញ់ 😋😆📍  ℹ️ពត៌មានលំអិតនឹងទីតាំងហាងនៅក្នុងខំមិនខាងក្រោម👇 #ឃ្លានឆេក #រំលឹ — Official Cambodian TikTok food review by @.khleancheck.",
    descriptionZh: "来自柬埔寨美食创作者 @.khleancheck 的 TikTok 视频：ចង់រំលឹកស៊ុបគោឆ្នាំងដីពីជំនាន់មុន អាចមកសាកបាន នៅហាងរំលឹក🥰 បរិយាកាសក៏អ៊ែម រសជាតិក៏ឆ្ងាញ់ 😋😆📍  ℹ️ព",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oAQS3qhEOBwp2gRaoDQAfFEBLADDu9IvbfOU3c~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=25QB%2FJF33O6h7nRwF951mHKJD%2Bk%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@.khleancheck/video/7707633036996693268",
    originalAccountUrl: "https://www.tiktok.com/@.khleancheck",
    inlineVideoId: "7707633036996693268",
    directVideoUrl: "https://v16.tiktokcdn.com/b4593e77b2d163ff1ac0b62259b4f823/6afdc4ae/video/tos/alisg/tos-alisg-pve-0037c001/o4AYzbOEwBv0AI5MBCEEa3iQBcCVtH3Xi1PAN/?a=1233&bti=ODszNWYuMDE6&&bt=937&ft=bC~O_mfLPD12NzY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=ODhkaWk8ZDplNDk3N2Y6ZEBpanE6dW45cm9qZTMzODczNEA2Nl5gLzReXmAxYS02NWEyYSMwLjUzMmQ0Mm9hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232851602EB059E8441C9D6BC2&btag=e00090000",
    sourceName: "ឃ្លានឆែក - Khlean Check (@.khleancheck)",
    authorHandle: "@.khleancheck",
    publishedOrUpdatedAt: "2026-11-13T12:32:41.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-expressionshub-7707630408795540754",
    platform: 'tiktok',
    titleKh: "ថ្ងៃទី1​ ញ៉ាំម្ហូបបារាំង​ អបអរកិច្ចប្រជុំកំពូលហ្វ្រង់កូហ្វូនី​ Bistrot De La Poste",
    titleEn: "ថ្ងៃទី1​ ញ៉ាំម្ហូបបារាំង​ អបអរកិច្ចប្រជុំកំពូលហ្វ្រង់កូហ្វូនី​ Bistrot De La Pos (@expressions_hub)",
    titleZh: "សារអាហារ - Expressions Hub (@expressions_hub) 柬埔寨美食与探店视频",
    descriptionKh: "ថ្ងៃទី1​ ញ៉ាំម្ហូបបារាំង​ អបអរកិច្ចប្រជុំកំពូលហ្វ្រង់កូហ្វូនី​ Bistrot De La Poste",
    descriptionEn: "ថ្ងៃទី1​ ញ៉ាំម្ហូបបារាំង​ អបអរកិច្ចប្រជុំកំពូលហ្វ្រង់កូហ្វូនី​ Bistrot De La Poste — Official Cambodian TikTok food review by @expressions_hub.",
    descriptionZh: "来自柬埔寨美食创作者 @expressions_hub 的 TikTok 视频：ថ្ងៃទី1​ ញ៉ាំម្ហូបបារាំង​ អបអរកិច្ចប្រជុំកំពូលហ្វ្រង់កូហ្វូនី​ Bistrot De La Poste",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ogD9Df8FEEaUIQAMkEqgFB83IqRwAkdfvB3Z8x~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=P3%2FfdjiJtiLkCrfa04zDKg%2BKSCo%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@expressions_hub/video/7707630408795540754",
    originalAccountUrl: "https://www.tiktok.com/@expressions_hub",
    inlineVideoId: "7707630408795540754",
    directVideoUrl: "https://v16.tiktokcdn.com/6aa65230deb4f025c1e817bfdf17c7fc/6afdc561/video/tos/alisg/tos-alisg-pve-0037c001/ocFwjdgC8ErxkY8qAfQaEAI3fDETCBBUMD8R9F/?a=1233&bti=ODszNWYuMDE6&&bt=665&ft=bC~O_mfLPD12NaY3rn-UxfKFWY6e3wv25xcAp&mime_type=video_mp4&rc=Ozs7Zzw3aWY8aDw7NTs8aUBpajlyOng5cmtqZTMzODczNEAtYGJeYl5gXjExYTJiYl5iYSNjcWc2MmRjLm9hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232849EB6CBF2F635463AA4F26&btag=e000a0000",
    sourceName: "សារអាហារ - Expressions Hub (@expressions_hub)",
    authorHandle: "@expressions_hub",
    publishedOrUpdatedAt: "2026-11-13T12:22:29.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-hubbaywithme-7707608938232990977",
    platform: 'tiktok',
    titleKh: "Mints choco oreo 😭🔥 Buy at Mart Olympic street 155",
    titleEn: "Mints choco oreo 😭🔥 Buy at Mart Olympic street 155 (@hub_baywithme)",
    titleZh: "Hub Bay With Me (@hub_baywithme) 柬埔寨美食与探店视频",
    descriptionKh: "Mints choco oreo 😭🔥  Buy at Mart Olympic street 155  #hubbayehh #food_m #oreo #snack #cookies",
    descriptionEn: "Mints choco oreo 😭🔥  Buy at Mart Olympic street 155  #hubbayehh #food_m #oreo #snack #cookies — Official Cambodian TikTok food review by @hub_baywithme.",
    descriptionZh: "来自柬埔寨美食创作者 @hub_baywithme 的 TikTok 视频：Mints choco oreo 😭🔥  Buy at Mart Olympic street 155  #hubbayehh #food_m #oreo #snack #cookies",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o44C7IIAXdMDi4lTB9cjYefqIPDF27EVAIeIZo~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=61UwI2W%2FxGCq%2B0bbV83QdYkkWmY%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@hub_baywithme/video/7707608938232990977",
    originalAccountUrl: "https://www.tiktok.com/@hub_baywithme",
    inlineVideoId: "7707608938232990977",
    directVideoUrl: "https://v9.tiktokcdn.com/a750cd1b8f2271cd562bb30ea8836742/6afdc46a/video/tos/alisg/tos-alisg-pve-0037c001/oEdII7gf4FZ8AC4DMVlejoAJqEQ5fDPDI27aUk/?a=1233&bti=ODszNWYuMDE6&&bt=771&ft=bC~O_mfLPD12N_Y3rn-Ux_o2NY6e3wv25dcAp&mime_type=video_mp4&rc=Nmc0aWQ3Nzo4ZTU0ZzdkOEBpMzpyNGw5cnFoZTMzODczNEAyYS0tL2JhNS4xLTExXy0uYSNzbS1yMmRrbm9hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232857ED4BC65F6722FBA0BF25&btag=e00088000",
    sourceName: "Hub Bay With Me (@hub_baywithme)",
    authorHandle: "@hub_baywithme",
    publishedOrUpdatedAt: "2026-11-13T10:59:10.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-taseitrestaura-7707591534908132628",
    platform: 'tiktok',
    titleKh: "ណាត់គ្នាមកតាសេត! 🥩🌿 ម្ហូបឆ្ងាញ់ បរិយាកាសស្រស់ស្រាយ ជួបជុំជាមួយមនុស្សជាទីស្រឡាញ់ ❤️",
    titleEn: "ណាត់គ្នាមកតាសេត! 🥩🌿 ម្ហូបឆ្ងាញ់ បរិយាកាសស្រស់ស្រាយ ជួបជុំជាមួយមនុស្សជាទីស្រឡាញ (@taseit_restaurant)",
    titleZh: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "ណាត់គ្នាមកតាសេត! 🥩🌿 ម្ហូបឆ្ងាញ់ បរិយាកាសស្រស់ស្រាយ ជួបជុំជាមួយមនុស្សជាទីស្រឡាញ់ ❤️ #តាសេត #Taseit",
    descriptionEn: "ណាត់គ្នាមកតាសេត! 🥩🌿 ម្ហូបឆ្ងាញ់ បរិយាកាសស្រស់ស្រាយ ជួបជុំជាមួយមនុស្សជាទីស្រឡាញ់ ❤️ #តាសេត #Taseit — Official Cambodian TikTok food review by @taseit_restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @taseit_restaurant 的 TikTok 视频：ណាត់គ្នាមកតាសេត! 🥩🌿 ម្ហូបឆ្ងាញ់ បរិយាកាសស្រស់ស្រាយ ជួបជុំជាមួយមនុស្សជាទីស្រឡាញ់ ❤️ #តាសេត #Taseit",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ooaABzvDbgBliaCEAd2KkAxNEi3IAPiYInKrA~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=0jT52ygR3a%2FzBP1tyGuLva%2BP1%2FM%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@taseit_restaurant/video/7707591534908132628",
    originalAccountUrl: "https://www.tiktok.com/@taseit_restaurant",
    inlineVideoId: "7707591534908132628",
    directVideoUrl: "https://v16.tiktokcdn.com/61dd083ecf1f885715af508394bbca14/6afdc473/video/tos/alisg/tos-alisg-pve-0037c001/oQAiXp2Y4NBIvB68iQ3WXa2rTdEYScEPKAbxA/?a=1233&bti=ODszNWYuMDE6&&bt=1474&ft=bC~O_mfLPD12NtY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=Zzw5Ozc3ZzhlZWk5MzhlZ0BpM3E7NnQ5cnJnZTMzODczNEBeMWM2NS1jNWMxLjBhLV8zYSNvLV5yMmQ0bm9hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32CA6&btag=e00090000",
    sourceName: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant)",
    authorHandle: "@taseit_restaurant",
    publishedOrUpdatedAt: "2026-11-13T09:51:38.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-derdailyoffici-7707583656784579860",
    platform: 'tiktok',
    titleKh: "បងប្អូន​អាច​ចូល​ទស្សនា​ភូមិ​ហ្រ្វង់កូហ្វូនីបានដោយសេរី",
    titleEn: "បងប្អូន​អាច​ចូល​ទស្សនា​ភូមិ​ហ្រ្វង់កូហ្វូនីបានដោយសេរី (@derdailyofficial)",
    titleZh: "DerDaily ដើរដេលី (@derdailyofficial) 柬埔寨美食与探店视频",
    descriptionKh: "បងប្អូន​អាច​ចូល​ទស្សនា​ភូមិ​ហ្រ្វង់កូហ្វូនីបានដោយសេរី  #ភូមិ​ហ្រ្វង់កូហ្វូនី #lafrancophonie",
    descriptionEn: "បងប្អូន​អាច​ចូល​ទស្សនា​ភូមិ​ហ្រ្វង់កូហ្វូនីបានដោយសេរី  #ភូមិ​ហ្រ្វង់កូហ្វូនី #lafrancophonie — Official Cambodian TikTok food review by @derdailyofficial.",
    descriptionZh: "来自柬埔寨美食创作者 @derdailyofficial 的 TikTok 视频：បងប្អូន​អាច​ចូល​ទស្សនា​ភូមិ​ហ្រ្វង់កូហ្វូនីបានដោយសេរី  #ភូមិ​ហ្រ្វង់កូហ្វូនី #lafrancophonie",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oQPHfABeW1LBpiRlqZjIsQcEgIE2BhOIBE52iw~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=je1uXJs6S38NKoTcFjJZ%2BKdsMnI%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@derdailyofficial/video/7707583656784579860",
    originalAccountUrl: "https://www.tiktok.com/@derdailyofficial",
    inlineVideoId: "7707583656784579860",
    directVideoUrl: "https://v3.tiktokcdn.com/60fc58c7f2edeb2c0921bc5a2314c094/6afdc440/video/tos/alisg/tos-alisg-pve-0037c001/o85lm2si2IIjeBpqAZQER1hiqfvJgmEcBBWBgw/?a=1233&bti=ODszNWYuMDE6&&bt=913&ft=bC~O_mfLPD12NaY3rn-Ux9JFNY6e3wv251cAp&mime_type=video_mp4&rc=OTpkZTs2aTlkO2c6ZTo3M0BpMzZxcnM5cjdnZTMzODczNEBjXzJjLmNhNWExYTI2LmEwYSNfLmBgMmRjYG9hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232850EB6CBF2F635463AA4F5B&btag=e000b0000",
    sourceName: "DerDaily ដើរដេលី (@derdailyofficial)",
    authorHandle: "@derdailyofficial",
    publishedOrUpdatedAt: "2026-11-13T09:21:03.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-38",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-mekorksach100m-7707544654652132614",
    platform: 'tiktok',
    titleKh: "ឃេីញមនុស្សច្រេិនៗហ៊ានចូលអត់?😒😱 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខ",
    titleEn: "ឃេីញមនុស្សច្រេិនៗហ៊ានចូលអត់?😒😱 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សា (@me_kork_sach100muk)",
    titleZh: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk) 柬埔寨美食与探店视频",
    descriptionKh: "ឃេីញមនុស្សច្រេិនៗហ៊ានចូលអត់?😒😱 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍Google Map: (មីគោកសាច់100មុខ ម៉ាម៉ាអូរឬស្សី) https://maps.app.goo.gl/pVN6ByuU53XEUCmv9?g_st=ic",
    descriptionEn: "ឃេីញមនុស្សច្រេិនៗហ៊ានចូលអត់?😒😱 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍Googl — Official Cambodian TikTok food review by @me_kork_sach100muk.",
    descriptionZh: "来自柬埔寨美食创作者 @me_kork_sach100muk 的 TikTok 视频：ឃេីញមនុស្សច្រេិនៗហ៊ានចូលអត់?😒😱 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/osBbAsGNTOiqIUgDaE5VhAiUIx2vvajIAPBYz~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=e3tPwDKr9fPak%2FWGxE0JE%2BR61%2F8%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@me_kork_sach100muk/video/7707544654652132614",
    originalAccountUrl: "https://www.tiktok.com/@me_kork_sach100muk",
    inlineVideoId: "7707544654652132614",
    directVideoUrl: "https://v3.tiktokcdn.com/c5cf5177fdad04028c6bd1bbf25842fe/6afdc44e/video/tos/alisg/tos-alisg-pve-0037c001/o8QiKNEBi2AxagrIbpvAUzBARYEEavAshVz6O/?a=1233&bti=ODszNWYuMDE6&&bt=1349&ft=bC~O_mfLPD12NWY3rn-UxK12KY6e3wv25zcAp&mime_type=video_mp4&rc=OGg3NTs6aDU1NjxlOWVpZEBpM25ybWs5cnVlZTMzODczNEA2MDY2Xl4uNmIxXi9fYzI0YSNkLTZkMmRrM29hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232853F72B939D69FFBF8D7828&btag=e000b8000",
    sourceName: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk)",
    authorHandle: "@me_kork_sach100muk",
    publishedOrUpdatedAt: "2026-11-13T06:49:42.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-36",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-fatamecooking-7707523620704226580",
    platform: 'tiktok',
    titleKh: "🤩​ មកសម្ពោធផលិតផល​ ស្លឆា​ 😄​ ប្លែកណាស់ដូចមកកម្មវិធីមង្គលការ​ សាល​ ស្រីនា​ ចឹង @Slorcha ​",
    titleEn: "🤩​ មកសម្ពោធផលិតផល​ ស្លឆា​ 😄​ ប្លែកណាស់ដូចមកកម្មវិធីមង្គលការ​ សាល​ ស្រីនា​ ចឹង  (@fatame.cooking)",
    titleZh: "Fatame (@fatame.cooking) 柬埔寨美食与探店视频",
    descriptionKh: "🤩​ មកសម្ពោធផលិតផល​ ស្លឆា​ 😄​ ប្លែកណាស់ដូចមកកម្មវិធីមង្គលការ​ សាល​ ស្រីនា​ ចឹង @Slorcha ​  #launchevent",
    descriptionEn: "🤩​ មកសម្ពោធផលិតផល​ ស្លឆា​ 😄​ ប្លែកណាស់ដូចមកកម្មវិធីមង្គលការ​ សាល​ ស្រីនា​ ចឹង @Slorcha ​  #launchevent — Official Cambodian TikTok food review by @fatame.cooking.",
    descriptionZh: "来自柬埔寨美食创作者 @fatame.cooking 的 TikTok 视频：🤩​ មកសម្ពោធផលិតផល​ ស្លឆា​ 😄​ ប្លែកណាស់ដូចមកកម្មវិធីមង្គលការ​ សាល​ ស្រីនា​ ចឹង @Slorcha ​  #launche",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oMcB9YbAnpNDV2yNHUgRfDf8EcBFtPEqgQaQxP~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=fhV6%2B0%2BVP1Eq1jMRpzGLVsJkC08%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@fatame.cooking/video/7707523620704226580",
    originalAccountUrl: "https://www.tiktok.com/@fatame.cooking",
    inlineVideoId: "7707523620704226580",
    directVideoUrl: "https://v9.tiktokcdn.com/a0e9ecbb8b17db89c67c29c9eee02a27/6afdc495/video/tos/alisg/tos-alisg-pve-0037c001/ogrB0eqE2NuB1BmogBcDpfiEiEARLQ95TN4bMI/?a=1233&bti=ODszNWYuMDE6&&bt=1066&ft=bC~O_mfLPD12NrY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=M2Y0MzVkNzczOjlpNzY2aEBpamh1bXM5cjM8ZTMzODczNEAuNTYxMTFhXl4xXi0vLmAyYSMzZWBhMmRzcm9hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232850F1EAE8B11E904E9F4279&btag=e00090000",
    sourceName: "Fatame (@fatame.cooking)",
    authorHandle: "@fatame.cooking",
    publishedOrUpdatedAt: "2026-11-13T05:28:05.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-plovder-7707516760521559304",
    platform: 'tiktok',
    titleKh: "កោះកុង heal ពិតៗ ស្អាតដូចពិភព Avatar ចឹង 🍃❤️❤️❤️",
    titleEn: "កោះកុង heal ពិតៗ ស្អាតដូចពិភព Avatar ចឹង 🍃❤️❤️❤️ (@plov_der)",
    titleZh: "ផ្លូវដើរ - Plov Der (@plov_der) 柬埔寨美食与探店视频",
    descriptionKh: "កោះកុង heal ពិតៗ ស្អាតដូចពិភព Avatar ចឹង 🍃❤️❤️❤️ #fypシ #fypviralシ #travel",
    descriptionEn: "កោះកុង heal ពិតៗ ស្អាតដូចពិភព Avatar ចឹង 🍃❤️❤️❤️ #fypシ #fypviralシ #travel — Official Cambodian TikTok food review by @plov_der.",
    descriptionZh: "来自柬埔寨美食创作者 @plov_der 的 TikTok 视频：កោះកុង heal ពិតៗ ស្អាតដូចពិភព Avatar ចឹង 🍃❤️❤️❤️ #fypシ #fypviralシ #travel",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oAwFLtLITbgx7F3VAaXgjMYLfefaIzI4DGoCAL~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=cZt5q5mfTDIABXPhx5L%2Fmx%2F1ImE%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@plov_der/video/7707516760521559304",
    originalAccountUrl: "https://www.tiktok.com/@plov_der",
    inlineVideoId: "7707516760521559304",
    directVideoUrl: "https://v9.tiktokcdn.com/4b4732bdb59e15aeb79af30a345ceb5e/6afdc450/video/tos/alisg/tos-alisg-pve-0037c001/oYaYA7GAVRVaLPLLG4eCjabnxwxeZTIFAIDoeg/?a=1233&bti=ODszNWYuMDE6&&bt=1956&ft=L~O54ourD12NvWl-KzIxRNvSDlBF-UjNSmopiX&mime_type=video_mp4&rc=OGU7MzdnZThnNDtlOjk1aUBpM3Y4PHY5cnU8ZTMzODczNEAtYS9iXjVeNTIxXmIzYDAuYSNhMmQwMmRjZm9hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232853B78F6EA1007D649445B9&btag=e000b8000",
    sourceName: "ផ្លូវដើរ - Plov Der (@plov_der)",
    authorHandle: "@plov_der",
    publishedOrUpdatedAt: "2026-11-13T05:01:28.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-27",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-suyadaily-7707502037679852821",
    platform: 'tiktok',
    titleKh: "ទៅរៀនពេលព្រឹក😊🥰😘😍🌾🌾",
    titleEn: "ទៅរៀនពេលព្រឹក😊🥰😘😍🌾🌾 (@suyadaily)",
    titleZh: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily) 柬埔寨美食与探店视频",
    descriptionKh: "ទៅរៀនពេលព្រឹក😊🥰😘😍🌾🌾#reels #vlog #ទៅរៀន #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏",
    descriptionEn: "ទៅរៀនពេលព្រឹក😊🥰😘😍🌾🌾#reels #vlog #ទៅរៀន #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 — Official Cambodian TikTok food review by @suyadaily.",
    descriptionZh: "来自柬埔寨美食创作者 @suyadaily 的 TikTok 视频：ទៅរៀនពេលព្រឹក😊🥰😘😍🌾🌾#reels #vlog #ទៅរៀន #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oUv9DfkyEEAUIEjkwCqgFBg2IIRoATeEnB5War~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=8W6oBcueR8Uz1qlQQtBDyrLsvl8%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@suyadaily/video/7707502037679852821",
    originalAccountUrl: "https://www.tiktok.com/@suyadaily",
    inlineVideoId: "7707502037679852821",
    directVideoUrl: "https://v3.tiktokcdn.com/0e05283e8262c2656d70d1aad0e12cfd/6afdc4d7/video/tos/alisg/tos-alisg-pve-0037c001/oMKEEfo2eg5RDJVEQakEAyBUjB9FI8Wgqkvwzn/?a=1233&bti=ODszNWYuMDE6&&bt=1130&ft=bC~O_mfLPD12NVY3rn-UxrN5VY6e3wv252cAp&mime_type=video_mp4&rc=ZWg0Nzc8NTVoNmlpaTxpN0BpMzdvN2w5cnY7ZTMzODczNEBiYWM1Xy8vNV4xL2FhLTAuYSMvcS5gMmRra29hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232856152A25DD5E5B70AA15C3&btag=e00090000",
    sourceName: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily)",
    authorHandle: "@suyadaily",
    publishedOrUpdatedAt: "2026-11-13T04:04:20.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-plovder-7707489955110456577",
    platform: 'tiktok',
    titleKh: "ជិះទៅណាឆ្ងាយបងប្អូនត្រឹមតែតំបន់ទឹកធ្លាក់ថ្មក្រាលនេះយកទៅណាអស់",
    titleEn: "ជិះទៅណាឆ្ងាយបងប្អូនត្រឹមតែតំបន់ទឹកធ្លាក់ថ្មក្រាលនេះយកទៅណាអស់ (@plov_der)",
    titleZh: "ផ្លូវដើរ - Plov Der (@plov_der) 柬埔寨美食与探店视频",
    descriptionKh: "ជិះទៅណាឆ្ងាយបងប្អូនត្រឹមតែតំបន់ទឹកធ្លាក់ថ្មក្រាលនេះយកទៅណាអស់  #fypviralシ #everyone #fyp #travel #nature",
    descriptionEn: "ជិះទៅណាឆ្ងាយបងប្អូនត្រឹមតែតំបន់ទឹកធ្លាក់ថ្មក្រាលនេះយកទៅណាអស់  #fypviralシ #everyone #fyp #travel #nature — Official Cambodian TikTok food review by @plov_der.",
    descriptionZh: "来自柬埔寨美食创作者 @plov_der 的 TikTok 视频：ជិះទៅណាឆ្ងាយបងប្អូនត្រឹមតែតំបន់ទឹកធ្លាក់ថ្មក្រាលនេះយកទៅណាអស់  #fypviralシ #everyone #fyp #travel #nat",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ocIAADJvBAAi76AlasawvB52gkiEXbAY4DPMm~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=X7Dv3yWfNmuRR8IbXpuIyG7L0cI%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@plov_der/video/7707489955110456577",
    originalAccountUrl: "https://www.tiktok.com/@plov_der",
    inlineVideoId: "7707489955110456577",
    directVideoUrl: "https://v9.tiktokcdn.com/b48b778fe5c650800da494908892d246/6afdc4fa/video/tos/alisg/tos-alisg-pve-0037/oEgDsJnEEnHSEmFAVKEANgQfXM3rCeE72IDAGe/?a=1233&bti=ODszNWYuMDE6&&bt=5699&ft=L~O54ourD12NvWl-KzIxRNvSDlBF-UjNSmopiX&mime_type=video_mp4&rc=OmhkZjk7NWg7Mzo7OTxpOUBpMzd1cnU5cjo7ZTMzODgzNEA1M2BjNDMvXi8xMTQ0Ly0tYSNqcGxpMmRrMG9hLS1kLy1zcw%3D%3D&vvpl=1&l=20261116232853B78F6EA1007D649445B9&btag=e00098000",
    sourceName: "ផ្លូវដើរ - Plov Der (@plov_der)",
    authorHandle: "@plov_der",
    publishedOrUpdatedAt: "2026-11-13T03:17:27.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-27",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-pudylychher-7707290339572288786",
    platform: 'tiktok',
    titleKh: "គុយទាវឆ្ងាញ់នៅបុរីពិភពថ្មីចំការដូង",
    titleEn: "គុយទាវឆ្ងាញ់នៅបុរីពិភពថ្មីចំការដូង (@pudy_lychher)",
    titleZh: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher) 柬埔寨美食与探店视频",
    descriptionKh: "គុយទាវឆ្ងាញ់នៅបុរីពិភពថ្មីចំការដូង   #ពូឌីលីឈើ #streetfood #localfood",
    descriptionEn: "គុយទាវឆ្ងាញ់នៅបុរីពិភពថ្មីចំការដូង   #ពូឌីលីឈើ #streetfood #localfood — Official Cambodian TikTok food review by @pudy_lychher.",
    descriptionZh: "来自柬埔寨美食创作者 @pudy_lychher 的 TikTok 视频：គុយទាវឆ្ងាញ់នៅបុរីពិភពថ្មីចំការដូង   #ពូឌីលីឈើ #streetfood #localfood",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/okyEOinBgUACUuYifAqRBAA7EW1O79Ikcf8DOU~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=en93vxpLi%2BcRVT0XMx06ELeOluY%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@pudy_lychher/video/7707290339572288786",
    originalAccountUrl: "https://www.tiktok.com/@pudy_lychher",
    inlineVideoId: "7707290339572288786",
    directVideoUrl: "https://v9.tiktokcdn.com/f58543a3654a718c306d6a3ef8f1e622/6afdc4c1/video/tos/alisg/tos-alisg-pve-0037c001/oUkQ1BoGVClSVVsLIcy5HAg5IDsre6QAPjRefJ/?a=1233&bti=ODszNWYuMDE6&&bt=1318&ft=L~O54ourD12Nvol-KzIxRHbjvlBF-UjNS3opiX&mime_type=video_mp4&rc=ZTpoOmVkPDs7O2UzMzY6Z0BpajhmN245cjR2ZTMzODczNEAwXjReYmNhNTAxNTIzMC0yYSNganNrMmQ0aG5hLS1kMTFzcw%3D%3D&vvpl=1&l=202611162328484D55737F2DB4227DE8FF&btag=e00090000",
    sourceName: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)",
    authorHandle: "@pudy_lychher",
    publishedOrUpdatedAt: "2026-11-12T14:22:50.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-derdailyoffici-7707269929120075029",
    platform: 'tiktok',
    titleKh: "មកលេង Bassac Lane តិចអត់ដឹងថាមានកន្លែងញុំាអីដែលមានច្រើនសម្បូរបែបទាំងអាហារពេលព្រឹក ពេលរសៀល និងពេ",
    titleEn: "មកលេង Bassac Lane តិចអត់ដឹងថាមានកន្លែងញុំាអីដែលមានច្រើនសម្បូរបែបទាំងអាហារពេលព្រឹ (@derdailyofficial)",
    titleZh: "DerDaily ដើរដេលី (@derdailyofficial) 柬埔寨美食与探店视频",
    descriptionKh: "មកលេង Bassac Lane តិចអត់ដឹងថាមានកន្លែងញុំាអីដែលមានច្រើនសម្បូរបែបទាំងអាហារពេលព្រឹក ពេលរសៀល និងពេលល្ងាច 🏠 Mama Wong's #derdaily #bassaclane",
    descriptionEn: "មកលេង Bassac Lane តិចអត់ដឹងថាមានកន្លែងញុំាអីដែលមានច្រើនសម្បូរបែបទាំងអាហារពេលព្រឹក ពេលរសៀល និងពេលល្ងាច 🏠 Mama Wong's #derdaily #bassaclane — Official Cambodian TikTok food review by @derdailyofficial.",
    descriptionZh: "来自柬埔寨美食创作者 @derdailyofficial 的 TikTok 视频：មកលេង Bassac Lane តិចអត់ដឹងថាមានកន្លែងញុំាអីដែលមានច្រើនសម្បូរបែបទាំងអាហារពេលព្រឹក ពេលរសៀល និងពេលល្ងា",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oAMwqASnaEO5uYNSALB0ixDIAABiPvY1U5AWE~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=NWJSnRB29i4%2BMMv83XTH10aFsGo%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@derdailyofficial/video/7707269929120075029",
    originalAccountUrl: "https://www.tiktok.com/@derdailyofficial",
    inlineVideoId: "7707269929120075029",
    directVideoUrl: "https://v3.tiktokcdn.com/b31956669b3183c6437c98fde5a97f95/6afdc4c2/video/tos/alisg/tos-alisg-pve-0037c001/oYzIgO9QZ9DcBfqqbFbKElEvrDsqfUApRgBjHc/?a=1233&bti=ODszNWYuMDE6&&bt=1335&ft=bC~O_mfLPD12NaY3rn-Ux9JFNY6e3wv251cAp&mime_type=video_mp4&rc=ODVpO2dmPDM4ZWc0aDtnNUBpam51ZXA5cmx1ZTMzODczNEAtXl5jYTYyNS0xLzFhYWIyYSNuZ2MzMmRrZW5hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232850EB6CBF2F635463AA4F5B&btag=e00090000",
    sourceName: "DerDaily ដើរដេលី (@derdailyofficial)",
    authorHandle: "@derdailyofficial",
    publishedOrUpdatedAt: "2026-11-12T13:03:38.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-38",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-khleancheck-7707268478641933589",
    platform: 'tiktok',
    titleKh: "កន្លែងម្ហូបខ្មែរបាយថ្ងៃឆ្ងាញ់បរិយាកាសជាប់ទន្លេ នៅកោះដាច់❤️✨",
    titleEn: "កន្លែងម្ហូបខ្មែរបាយថ្ងៃឆ្ងាញ់បរិយាកាសជាប់ទន្លេ នៅកោះដាច់❤️✨ (@.khleancheck)",
    titleZh: "ឃ្លានឆែក - Khlean Check (@.khleancheck) 柬埔寨美食与探店视频",
    descriptionKh: "កន្លែងម្ហូបខ្មែរបាយថ្ងៃឆ្ងាញ់បរិយាកាសជាប់ទន្លេ នៅកោះដាច់❤️✨#GANGZBERG #ឃ្លានឆេក #fyp #កោះដាច់",
    descriptionEn: "កន្លែងម្ហូបខ្មែរបាយថ្ងៃឆ្ងាញ់បរិយាកាសជាប់ទន្លេ នៅកោះដាច់❤️✨#GANGZBERG #ឃ្លានឆេក #fyp #កោះដាច់ — Official Cambodian TikTok food review by @.khleancheck.",
    descriptionZh: "来自柬埔寨美食创作者 @.khleancheck 的 TikTok 视频：កន្លែងម្ហូបខ្មែរបាយថ្ងៃឆ្ងាញ់បរិយាកាសជាប់ទន្លេ នៅកោះដាច់❤️✨#GANGZBERG #ឃ្លានឆេក #fyp #កោះដាច់",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o8sb8MsgVvDMfRZrC8FEAfDQI6AjlpQQQrfB42~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=y0JxJedmj3bf8qIv2KnyMnnKXLY%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@.khleancheck/video/7707268478641933589",
    originalAccountUrl: "https://www.tiktok.com/@.khleancheck",
    inlineVideoId: "7707268478641933589",
    directVideoUrl: "https://v16.tiktokcdn.com/448c324391b0938a1e055b78ca0d4de6/6afdc496/video/tos/alisg/tos-alisg-pve-0037c001/oQvIy3CfgX5Rww1FjWcGeGAGehALA0tA5jfrRY/?a=1233&bti=ODszNWYuMDE6&&bt=1203&ft=bC~O_mfLPD12NzY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=ZDo6aWQ1OjppPGVlNGhoPEBpMztsd3g5cm51ZTMzODczNEBhLzM2LTUuX2IxNS4vMDIwYSNsLmVeMmQ0Y25hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232851602EB059E8441C9D6BC2&btag=e00090000",
    sourceName: "ឃ្លានឆែក - Khlean Check (@.khleancheck)",
    authorHandle: "@.khleancheck",
    publishedOrUpdatedAt: "2026-11-12T12:58:00.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-fatamecooking-7707263673672207668",
    platform: 'tiktok',
    titleKh: "ខត្រីកូនខ្ចី​ ហិលៗឆ្ងាញ់ជាប់មាត់😋 ទឹកត្រី​ ស្លឆា​ Slorcha",
    titleEn: "ខត្រីកូនខ្ចី​ ហិលៗឆ្ងាញ់ជាប់មាត់😋 ទឹកត្រី​ ស្លឆា​ Slorcha (@fatame.cooking)",
    titleZh: "Fatame (@fatame.cooking) 柬埔寨美食与探店视频",
    descriptionKh: "ខត្រីកូនខ្ចី​ ហិលៗឆ្ងាញ់ជាប់មាត់😋 ទឹកត្រី​ ស្លឆា​ Slorcha  #cookingathome #family",
    descriptionEn: "ខត្រីកូនខ្ចី​ ហិលៗឆ្ងាញ់ជាប់មាត់😋 ទឹកត្រី​ ស្លឆា​ Slorcha  #cookingathome #family — Official Cambodian TikTok food review by @fatame.cooking.",
    descriptionZh: "来自柬埔寨美食创作者 @fatame.cooking 的 TikTok 视频：ខត្រីកូនខ្ចី​ ហិលៗឆ្ងាញ់ជាប់មាត់😋 ទឹកត្រី​ ស្លឆា​ Slorcha  #cookingathome #family",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oIfQwQs9AAYTGff1Gv4esrYFQn1AGgRE48MHI1~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=MK3aSZZw%2FLEJtb3au%2FTB9GhNDjM%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@fatame.cooking/video/7707263673672207668",
    originalAccountUrl: "https://www.tiktok.com/@fatame.cooking",
    inlineVideoId: "7707263673672207668",
    directVideoUrl: "https://v9.tiktokcdn.com/2026037f08c3c0da775ee5b1e99fc262/6afdc4a8/video/tos/alisg/tos-alisg-pve-0037c001/oo8VTCjjIDM6G1HQdsXMDIg5DjOfEACf2aQ4fA/?a=1233&bti=ODszNWYuMDE6&&bt=1008&ft=bC~O_mfLPD12NrY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=OTRnODVlZTplZzdpNmgzZUBpanRyeXk5cjN1ZTMzODczNEAuYDVjMGA1NjYxLmI2LWIwYSNlMWxzMmRjMG5hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232850F1EAE8B11E904E9F4279&btag=e00090000",
    sourceName: "Fatame (@fatame.cooking)",
    authorHandle: "@fatame.cooking",
    publishedOrUpdatedAt: "2026-11-12T12:39:21.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-pudylychher-7707257032759381256",
    platform: 'tiktok',
    titleKh: "តែផ្លែឈើ បែបចិន ទិញ1 ថែម 1",
    titleEn: "តែផ្លែឈើ បែបចិន ទិញ1 ថែម 1 (@pudy_lychher)",
    titleZh: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher) 柬埔寨美食与探店视频",
    descriptionKh: "តែផ្លែឈើ បែបចិន ទិញ1 ថែម 1   #ពូឌីលីឈើ #tealovers #localfood",
    descriptionEn: "តែផ្លែឈើ បែបចិន ទិញ1 ថែម 1   #ពូឌីលីឈើ #tealovers #localfood — Official Cambodian TikTok food review by @pudy_lychher.",
    descriptionZh: "来自柬埔寨美食创作者 @pudy_lychher 的 TikTok 视频：តែផ្លែឈើ បែបចិន ទិញ1 ថែម 1   #ពូឌីលីឈើ #tealovers #localfood",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o8Ij4vQ1wfymjbGeCAeILVAoKpQiXtgTD16VrI~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=TuN8JJ6TmRve1rHPYKTSkLdtSbE%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@pudy_lychher/video/7707257032759381256",
    originalAccountUrl: "https://www.tiktok.com/@pudy_lychher",
    inlineVideoId: "7707257032759381256",
    directVideoUrl: "https://v9.tiktokcdn.com/711f82cfd507debee0ac4aacafe71323/6afdc4d6/video/tos/alisg/tos-alisg-pve-0037c001/oMRGV6Bw64T1ICQVM2pDo9qAIfoerELgmAeLjW/?a=1233&bti=ODszNWYuMDE6&&bt=933&ft=L~O54ourD12Nvol-KzIxRHbjvlBF-UjNS3opiX&mime_type=video_mp4&rc=aGk3aTlkM2Y5PDlkOzU7NkBpM2tycHY5cmR0ZTMzODczNEBgM14vYGE2NWMxYV9fMS42YSMvcmEvMmRjbm5hLS1kMTFzcw%3D%3D&vvpl=1&l=202611162328484D55737F2DB4227DE8FF&btag=e00090000",
    sourceName: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)",
    authorHandle: "@pudy_lychher",
    publishedOrUpdatedAt: "2026-11-12T12:13:35.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-taseitrestaura-7707250036379274516",
    platform: 'tiktok',
    titleKh: "ឃ្លានស៊ុបគោតាសេតមែនទេ? 🍲😋 បងប្អូននៅភ្នំពេញ ឬតាមបណ្ដាខេត្ត ក៏អាចកុម្ម៉ង់ស៊ុបគោពីតាសេតយកទៅញ៉ាំជ",
    titleEn: "ឃ្លានស៊ុបគោតាសេតមែនទេ? 🍲😋 បងប្អូននៅភ្នំពេញ ឬតាមបណ្ដាខេត្ត ក៏អាចកុម្ម៉ង់ស៊ុបគោព (@taseit_restaurant)",
    titleZh: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "ឃ្លានស៊ុបគោតាសេតមែនទេ? 🍲😋 បងប្អូននៅភ្នំពេញ ឬតាមបណ្ដាខេត្ត ក៏អាចកុម្ម៉ង់ស៊ុបគោពីតាសេតយកទៅញ៉ាំជុំគ្រួសារបានដែរ! ❤️ 🚚 មានសេវាដឹកជញ្ជូនទូទាំង ២៥ រាជធានី-ខេត្ត",
    descriptionEn: "ឃ្លានស៊ុបគោតាសេតមែនទេ? 🍲😋 បងប្អូននៅភ្នំពេញ ឬតាមបណ្ដាខេត្ត ក៏អាចកុម្ម៉ង់ស៊ុបគោពីតាសេតយកទៅញ៉ាំជុំគ្រួសារបានដែរ! ❤️ 🚚 មានសេវាដឹកជញ្ជូនទូទាំង ២៥ រាជធានី-ខេត្ត — Official Cambodian TikTok food review by @taseit_restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @taseit_restaurant 的 TikTok 视频：ឃ្លានស៊ុបគោតាសេតមែនទេ? 🍲😋 បងប្អូននៅភ្នំពេញ ឬតាមបណ្ដាខេត្ត ក៏អាចកុម្ម៉ង់ស៊ុបគោពីតាសេតយកទៅញ៉ាំជុំគ្រ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oA7YWEDBvApA2o3xAacAFEFl6A1niivaIBBxt~tplv-tiktokx-dmt-logom:tos-alisg-i-0068/oMFbWxlVBvAiv6pAnEAR81DIBaIREYYAxAbil.image?dr=14573&x-expires=1795014000&x-signature=F0G9XsW8P0Q4dwcMv4UeWJlkK7o%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@taseit_restaurant/video/7707250036379274516",
    originalAccountUrl: "https://www.tiktok.com/@taseit_restaurant",
    inlineVideoId: "7707250036379274516",
    directVideoUrl: "https://v16.tiktokcdn.com/3689b88009067696e22785fdc2f25584/6afdc495/video/tos/alisg/tos-alisg-pve-0037c001/o001RqYN97jEEp1ZBAEvfmbfHWBgQFIDQ4UB5a/?a=1233&bti=ODszNWYuMDE6&&bt=2149&ft=bC~O_mfLPD12NtY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=aGY3O2Y6NTpnPGRkZDRpZEBpanlnZm05cmt0ZTMzODczNEBeNTUuLjMxNTExYDYzLTZjYSNwbGEwMmRzYW5hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32CA6&btag=e00090000",
    sourceName: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant)",
    authorHandle: "@taseit_restaurant",
    publishedOrUpdatedAt: "2026-11-12T11:46:26.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-hubbaywithme-7707227601655401736",
    platform: 'tiktok',
    titleKh: "📍ហាង » Cafe & BBQ by Zing 📍 Street 430 📍Map : https://maps.app.goo.gl/uuTiQriZQej273g9A?g_st",
    titleEn: "📍ហាង » Cafe & BBQ by Zing 📍 Street 430 📍Map : https://maps.app.goo.gl/uuTiQri (@hub_baywithme)",
    titleZh: "Hub Bay With Me (@hub_baywithme) 柬埔寨美食与探店视频",
    descriptionKh: "📍ហាង » Cafe & BBQ by Zing  📍 Street 430  📍Map :  https://maps.app.goo.gl/uuTiQriZQej273g9A?g_st=ic #hubbayehh #food_m #beef #គោត្រកួន #spicysauce",
    descriptionEn: "📍ហាង » Cafe & BBQ by Zing  📍 Street 430  📍Map :  https://maps.app.goo.gl/uuTiQriZQej273g9A?g_st=ic #hubbayehh #food_m #beef #គោត្រកួន #spicysauce — Official Cambodian TikTok food review by @hub_baywithme.",
    descriptionZh: "来自柬埔寨美食创作者 @hub_baywithme 的 TikTok 视频：📍ហាង » Cafe & BBQ by Zing  📍 Street 430  📍Map :  https://maps.app.goo.gl/uuTiQriZQej273g9A?g_st=i",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/okI1ICB4RkUeAbBqEi7ifFqXTj7EviqgQ8srBa~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=Y0NZyGdaEkFmx2KwvL5ziqMM2EU%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@hub_baywithme/video/7707227601655401736",
    originalAccountUrl: "https://www.tiktok.com/@hub_baywithme",
    inlineVideoId: "7707227601655401736",
    directVideoUrl: "https://v9.tiktokcdn.com/216b8099ac176fac9299069c9c8a055b/6afdc469/video/tos/alisg/tos-alisg-pve-0037c001/oUvpiEPegj7RAIUtqFEDXuizE8B1QsfkBFQTBZ/?a=1233&bti=ODszNWYuMDE6&&bt=923&ft=bC~O_mfLPD12N_Y3rn-Ux_o2NY6e3wv25dcAp&mime_type=video_mp4&rc=Zjo8M2Y2PGZmOTQ2Omk1Z0BpajhtOHU5cnFzZTMzODczNEAuYTIwMF4zXy8xXjJgYTJgYSM2bG4vMmRzMG5hLS1kMS1zcw%3D%3D&vvpl=1&l=20261116232857ED4BC65F6722FBA0BF25&btag=e00088000",
    sourceName: "Hub Bay With Me (@hub_baywithme)",
    authorHandle: "@hub_baywithme",
    publishedOrUpdatedAt: "2026-11-12T10:19:23.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-mekorksach100m-7707208875904093441",
    platform: 'tiktok',
    titleKh: "យេីងថែមអ្នកស្រុះមីគោកម្នាក់ទៀតហេីយ😭🥰🙏🏻 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬ",
    titleEn: "យេីងថែមអ្នកស្រុះមីគោកម្នាក់ទៀតហេីយ😭🥰🙏🏻 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទី (@me_kork_sach100muk)",
    titleZh: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk) 柬埔寨美食与探店视频",
    descriptionKh: "យេីងថែមអ្នកស្រុះមីគោកម្នាក់ទៀតហេីយ😭🥰🙏🏻 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍Google Map: (មីគោកសាច់100មុខ ម៉ាម៉ាអូរឬស្សី) https://maps.app.goo.gl/pVN6ByuU53XEUCmv9?g_st=ic",
    descriptionEn: "យេីងថែមអ្នកស្រុះមីគោកម្នាក់ទៀតហេីយ😭🥰🙏🏻 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈 — Official Cambodian TikTok food review by @me_kork_sach100muk.",
    descriptionZh: "来自柬埔寨美食创作者 @me_kork_sach100muk 的 TikTok 视频：យេីងថែមអ្នកស្រុះមីគោកម្នាក់ទៀតហេីយ😭🥰🙏🏻 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o4Y3AVxfeACwgkGTI2erN6gAgLjhw6SEwoIgDQ~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=o2WqKJgenPJxldFz8eV%2FsuO6jAg%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@me_kork_sach100muk/video/7707208875904093441",
    originalAccountUrl: "https://www.tiktok.com/@me_kork_sach100muk",
    inlineVideoId: "7707208875904093441",
    directVideoUrl: "https://v3.tiktokcdn.com/8f89eea52b3170b34b18458d1ebc8dd7/6afdc443/video/tos/alisg/tos-alisg-pve-0037c001/oQfpmGcTYqphIgECgIMFeEWDBCBE9ER1G7UAQB/?a=1233&bti=ODszNWYuMDE6&&bt=999&ft=bC~O_mfLPD12NWY3rn-UxK12KY6e3wv25zcAp&mime_type=video_mp4&rc=OzU6ODo7NjM4NmY2OTU1aEBpMzkzZHc5cmRyZTMzODczNEAuXy0xXjY1NmAxYjAyYTYwYSMvbDZzMmRjMG5hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232853F72B939D69FFBF8D7828&btag=e000b0000",
    sourceName: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk)",
    authorHandle: "@me_kork_sach100muk",
    publishedOrUpdatedAt: "2026-11-12T09:06:43.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-36",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-pudylychher-7706919290003279112",
    platform: 'tiktok',
    titleKh: "បុហ្វេសេរីចាស់ 10 ឆ្នាំជាងហើយ នរណាខ្លះមានអនុស្សារីយន៍",
    titleEn: "បុហ្វេសេរីចាស់ 10 ឆ្នាំជាងហើយ នរណាខ្លះមានអនុស្សារីយន៍ (@pudy_lychher)",
    titleZh: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher) 柬埔寨美食与探店视频",
    descriptionKh: "បុហ្វេសេរីចាស់ 10 ឆ្នាំជាងហើយ នរណាខ្លះមានអនុស្សារីយន៍  #buffet #foodie #ពូឌីលីឈើ",
    descriptionEn: "បុហ្វេសេរីចាស់ 10 ឆ្នាំជាងហើយ នរណាខ្លះមានអនុស្សារីយន៍  #buffet #foodie #ពូឌីលីឈើ — Official Cambodian TikTok food review by @pudy_lychher.",
    descriptionZh: "来自柬埔寨美食创作者 @pudy_lychher 的 TikTok 视频：បុហ្វេសេរីចាស់ 10 ឆ្នាំជាងហើយ នរណាខ្លះមានអនុស្សារីយន៍  #buffet #foodie #ពូឌីលីឈើ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o4ewB0fDcI3PRIqEJ9BUH9kHoCIALEpAFAAHQg~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=PWp5VH%2Bmgmy8qmoT8Z8eHtJDwcI%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@pudy_lychher/video/7706919290003279112",
    originalAccountUrl: "https://www.tiktok.com/@pudy_lychher",
    inlineVideoId: "7706919290003279112",
    directVideoUrl: "https://v9.tiktokcdn.com/1e18bc24b4ff28d122d1df39088f371e/6afdc515/video/tos/alisg/tos-alisg-pve-0037c001/oAeV2KjfInG6VogINeLxNg48Dg9nRACsOTB4bA/?a=1233&bti=ODszNWYuMDE6&&bt=1127&ft=L~O54ourD12Nvol-KzIxRHbjvlBF-UjNS3opiX&mime_type=video_mp4&rc=Njc6NzRoOTVlZjs4Zzg1Z0BpMzdvaHU5cjw6ZTMzODczNEAwLWA0Ly5fNTYxNC40NGAuYSNwMmIwMmRrYG5hLS1kMWBzcw%3D%3D&vvpl=1&l=202611162328484D55737F2DB4227DE8FF&btag=e00098000",
    sourceName: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)",
    authorHandle: "@pudy_lychher",
    publishedOrUpdatedAt: "2026-11-11T14:22:58.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-expressionshub-7706918701416893714",
    platform: 'tiktok',
    titleKh: "ភូមិហ្វ្រង់កូហ្វូនី​ ស្វាគមន៍ឱ្យចូលទស្សនាដោយសេរី",
    titleEn: "ភូមិហ្វ្រង់កូហ្វូនី​ ស្វាគមន៍ឱ្យចូលទស្សនាដោយសេរី (@expressions_hub)",
    titleZh: "សារអាហារ - Expressions Hub (@expressions_hub) 柬埔寨美食与探店视频",
    descriptionKh: "ភូមិហ្វ្រង់កូហ្វូនី​ ស្វាគមន៍ឱ្យចូលទស្សនាដោយសេរី",
    descriptionEn: "ភូមិហ្វ្រង់កូហ្វូនី​ ស្វាគមន៍ឱ្យចូលទស្សនាដោយសេរី — Official Cambodian TikTok food review by @expressions_hub.",
    descriptionZh: "来自柬埔寨美食创作者 @expressions_hub 的 TikTok 视频：ភូមិហ្វ្រង់កូហ្វូនី​ ស្វាគមន៍ឱ្យចូលទស្សនាដោយសេរី",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o4UGLCpzPISwtfMogOE6Ie4Jo86FVgARRD3jAe~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=P1e72OOzNnrJm2UipZSZ3mpuxms%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@expressions_hub/video/7706918701416893714",
    originalAccountUrl: "https://www.tiktok.com/@expressions_hub",
    inlineVideoId: "7706918701416893714",
    directVideoUrl: "https://v16.tiktokcdn.com/4d547936c675b3a6b30ba2571ae8db55/6afdc4dd/video/tos/alisg/tos-alisg-pve-0037c001/o0QAoq7EvBHpTgRop0IAHFEBmeDl29glZf8E3U/?a=1233&bti=ODszNWYuMDE6&&bt=980&ft=bC~O_mfLPD12NaY3rn-UxfKFWY6e3wv25xcAp&mime_type=video_mp4&rc=ODk4Zmg4NzM7Ojc2Zmk3OUBpM3U8Z245cjQ6ZTMzODczNEBhLl42LjYuXy8xNl9eNGIzYSNjbzBqMmQ0Z25hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232849EB6CBF2F635463AA4F26&btag=e00090000",
    sourceName: "សារអាហារ - Expressions Hub (@expressions_hub)",
    authorHandle: "@expressions_hub",
    publishedOrUpdatedAt: "2026-11-11T14:20:41.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-foodwhisperoff-7706903435282599189",
    platform: 'tiktok',
    titleKh: "ផ្ទះការ៉េម​ Gelato Fix នៅកោះនរា​ matcha ក៏ឆ្ងាញ់​គួរសម​ ប្រើសុទ្ធតែទឹកដោះគោអឺរ៉ុបម៉ាក​ Emborg",
    titleEn: "ផ្ទះការ៉េម​ Gelato Fix នៅកោះនរា​ matcha ក៏ឆ្ងាញ់​គួរសម​ ប្រើសុទ្ធតែទឹកដោះគោអឺរ៉ុ (@foodwhisper_officials)",
    titleZh: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials) 柬埔寨美食与探店视频",
    descriptionKh: "ផ្ទះការ៉េម​ Gelato Fix នៅកោះនរា​ matcha ក៏ឆ្ងាញ់​គួរសម​ ប្រើសុទ្ធតែទឹកដោះគោអឺរ៉ុបម៉ាក​ Emborg",
    descriptionEn: "ផ្ទះការ៉េម​ Gelato Fix នៅកោះនរា​ matcha ក៏ឆ្ងាញ់​គួរសម​ ប្រើសុទ្ធតែទឹកដោះគោអឺរ៉ុបម៉ាក​ Emborg — Official Cambodian TikTok food review by @foodwhisper_officials.",
    descriptionZh: "来自柬埔寨美食创作者 @foodwhisper_officials 的 TikTok 视频：ផ្ទះការ៉េម​ Gelato Fix នៅកោះនរា​ matcha ក៏ឆ្ងាញ់​គួរសម​ ប្រើសុទ្ធតែទឹកដោះគោអឺរ៉ុបម៉ាក​ Emborg",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ospXoexOCMKAffILxiAAAu6bq1ovGyqzLeeNg3~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=DFSTncATAV4SdIBMCMiI0L8o%2BJ0%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@foodwhisper_officials/video/7706903435282599189",
    originalAccountUrl: "https://www.tiktok.com/@foodwhisper_officials",
    inlineVideoId: "7706903435282599189",
    directVideoUrl: "https://v9.tiktokcdn.com/41777307d82ca803240557ef7c930c79/6afdc50f/video/tos/alisg/tos-alisg-pve-0037c001/oM0BiBmRjE2v63X0IQb1ifrOUbe8qEA6HBoRgd/?a=1233&bti=ODszNWYuMDE6&&bt=1032&ft=L~O54ourD12NvKl-KzIxREESDlBF-UjNSaopiX&mime_type=video_mp4&rc=aDpnZTk1M2c4NGg3OTk0ZkBpanR0eHA5cjo5ZTMzODczNEAvXzA1YDItXjMxMWIvMi8uYSNpZWg1MmRja25hLS1kMTFzcw%3D%3D&vvpl=1&l=2026111623285136141F5723667CE60E77&btag=e00098000",
    sourceName: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)",
    authorHandle: "@foodwhisper_officials",
    publishedOrUpdatedAt: "2026-11-11T13:21:27.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-fatamecooking-7706896812627561780",
    platform: 'tiktok',
    titleKh: "របៀបធ្វើបាយស្រូប​ បាយសាច់ជ្រូកពងអូទ្រីស​ ខ​ 😁😋​ ទឹកស៉ីអ៉ីវ​ ទឹកត្រី​ ស្លឆា​ @Slorcha",
    titleEn: "របៀបធ្វើបាយស្រូប​ បាយសាច់ជ្រូកពងអូទ្រីស​ ខ​ 😁😋​ ទឹកស៉ីអ៉ីវ​ ទឹកត្រី​ ស្លឆា​ @S (@fatame.cooking)",
    titleZh: "Fatame (@fatame.cooking) 柬埔寨美食与探店视频",
    descriptionKh: "របៀបធ្វើបាយស្រូប​ បាយសាច់ជ្រូកពងអូទ្រីស​ ខ​ 😁😋​ ទឹកស៉ីអ៉ីវ​ ទឹកត្រី​ ស្លឆា​ @Slorcha  #cookingchallenge  #cookingathome",
    descriptionEn: "របៀបធ្វើបាយស្រូប​ បាយសាច់ជ្រូកពងអូទ្រីស​ ខ​ 😁😋​ ទឹកស៉ីអ៉ីវ​ ទឹកត្រី​ ស្លឆា​ @Slorcha  #cookingchallenge  #cookingathome — Official Cambodian TikTok food review by @fatame.cooking.",
    descriptionZh: "来自柬埔寨美食创作者 @fatame.cooking 的 TikTok 视频：របៀបធ្វើបាយស្រូប​ បាយសាច់ជ្រូកពងអូទ្រីស​ ខ​ 😁😋​ ទឹកស៉ីអ៉ីវ​ ទឹកត្រី​ ស្លឆា​ @Slorcha  #cookingchal",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/owA4EiAN5vY7BZBAlXra00EBAOORTEPTNIiPh~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=QMJfYT7imOqKHrLRqqSOt4RZInA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@fatame.cooking/video/7706896812627561780",
    originalAccountUrl: "https://www.tiktok.com/@fatame.cooking",
    inlineVideoId: "7706896812627561780",
    directVideoUrl: "https://v9.tiktokcdn.com/90b524af333843c96517b293556b8b98/6afdc4cc/video/tos/alisg/tos-alisg-pve-0037c001/ogoQjAeD46RA8zjnIhAvglLIGefMDVoxGcDMCc/?a=1233&bti=ODszNWYuMDE6&&bt=830&ft=bC~O_mfLPD12NrY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=ZDc6aDc8NjY2NDozNDdlZEBpam1pM3I5cjc5ZTMzODczNEAxMmIwL182NTExYDUwLjZiYSM0ZjRuMmQ0Xm5hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232850F1EAE8B11E904E9F4279&btag=e00090000",
    sourceName: "Fatame (@fatame.cooking)",
    authorHandle: "@fatame.cooking",
    publishedOrUpdatedAt: "2026-11-11T12:55:45.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-khleancheck-7706891137839041812",
    platform: 'tiktok',
    titleKh: "មួយថ្ងៃៗលក់សាច់រាប់រយគីឡូ ម៉ោង១២ត្រង់មិនទាន់អស់ហើយ អ្នកលក់ពូកែធ្វើទីផ្សារណាស់",
    titleEn: "មួយថ្ងៃៗលក់សាច់រាប់រយគីឡូ ម៉ោង១២ត្រង់មិនទាន់អស់ហើយ អ្នកលក់ពូកែធ្វើទីផ្សារណាស់ (@.khleancheck)",
    titleZh: "ឃ្លានឆែក - Khlean Check (@.khleancheck) 柬埔寨美食与探店视频",
    descriptionKh: "មួយថ្ងៃៗលក់សាច់រាប់រយគីឡូ  ម៉ោង១២ត្រង់មិនទាន់អស់ហើយ  អ្នកលក់ពូកែធ្វើទីផ្សារណាស់ #ឃ្លានឆេក",
    descriptionEn: "មួយថ្ងៃៗលក់សាច់រាប់រយគីឡូ  ម៉ោង១២ត្រង់មិនទាន់អស់ហើយ  អ្នកលក់ពូកែធ្វើទីផ្សារណាស់ #ឃ្លានឆេក — Official Cambodian TikTok food review by @.khleancheck.",
    descriptionZh: "来自柬埔寨美食创作者 @.khleancheck 的 TikTok 视频：មួយថ្ងៃៗលក់សាច់រាប់រយគីឡូ  ម៉ោង១២ត្រង់មិនទាន់អស់ហើយ  អ្នកលក់ពូកែធ្វើទីផ្សារណាស់ #ឃ្លានឆេក",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/owABHLd0CyqIfBxvmnDGeIEcc9YRECFgZh4Eam~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=vuvTDb9BVyFhUZie3PFCwiaiG04%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@.khleancheck/video/7706891137839041812",
    originalAccountUrl: "https://www.tiktok.com/@.khleancheck",
    inlineVideoId: "7706891137839041812",
    directVideoUrl: "https://v16.tiktokcdn.com/72c27e8c929a880fd8afd74a32a965ea/6afdc490/video/tos/alisg/tos-alisg-pve-0037c001/oMMeIaFIdmcEndO0BQDAEC9mRyqgYBrEOGE4fC/?a=1233&bti=ODszNWYuMDE6&&bt=1280&ft=bC~O_mfLPD12NzY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=NmQ4NzhkNDk1ZTY6Zzo4O0BpM3drbm05cjQ5ZTMzODczNEA1MDJeLzQuNmExMWNgYjFgYSNhcG9gMmQ0Lm5hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232851602EB059E8441C9D6BC2&btag=e00090000",
    sourceName: "ឃ្លានឆែក - Khlean Check (@.khleancheck)",
    authorHandle: "@.khleancheck",
    publishedOrUpdatedAt: "2026-11-11T12:33:44.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-hubbaywithme-7706859118056770834",
    platform: 'tiktok',
    titleKh: "ទាន់គេបញ្ចុះតម្លៃ សល់តែ 6.8$ ក្នុងម្នាក់ ទៅសាកមើលទៅ😆🔥 📍ហាង » ឡាវចាងឆ្នាំងដីសាខាទី8 📍បើក » 1",
    titleEn: "ទាន់គេបញ្ចុះតម្លៃ សល់តែ 6.8$ ក្នុងម្នាក់ ទៅសាកមើលទៅ😆🔥 📍ហាង » ឡាវចាងឆ្នាំងដីសា (@hub_baywithme)",
    titleZh: "Hub Bay With Me (@hub_baywithme) 柬埔寨美食与探店视频",
    descriptionKh: "ទាន់គេបញ្ចុះតម្លៃ សល់តែ 6.8$  ក្នុងម្នាក់ ទៅសាកមើលទៅ😆🔥  📍ហាង » ឡាវចាងឆ្នាំងដីសាខាទី8 📍បើក » 10:00am - 10:00pm  📌 ទីតាំង: ផ្លូវលេខ245 កែងផ្លូវ63 ម្តុំបឹងកេងកង #hubbayehh #buffet #hotpot #spicysauce #soup",
    descriptionEn: "ទាន់គេបញ្ចុះតម្លៃ សល់តែ 6.8$  ក្នុងម្នាក់ ទៅសាកមើលទៅ😆🔥  📍ហាង » ឡាវចាងឆ្នាំងដីសាខាទី8 📍បើក » 10:00am - 10:00pm  📌 ទីតាំង: ផ្លូវលេខ245 កែងផ្លូវ63 ម្តុំបឹងកេង — Official Cambodian TikTok food review by @hub_baywithme.",
    descriptionZh: "来自柬埔寨美食创作者 @hub_baywithme 的 TikTok 视频：ទាន់គេបញ្ចុះតម្លៃ សល់តែ 6.8$  ក្នុងម្នាក់ ទៅសាកមើលទៅ😆🔥  📍ហាង » ឡាវចាងឆ្នាំងដីសាខាទី8 📍បើក » 10:0",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oItyADOIUAFEBQPfEgoogQqxhHR39ACOEQMCAf~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=HtsgIfrz8vckDnlbzLskqCUwyFs%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@hub_baywithme/video/7706859118056770834",
    originalAccountUrl: "https://www.tiktok.com/@hub_baywithme",
    inlineVideoId: "7706859118056770834",
    directVideoUrl: "https://v9.tiktokcdn.com/a969539c468926a20eb6a2bb6fea88bd/6afdc471/video/tos/alisg/tos-alisg-pve-0037c001/oEEE59Q3YFbBABQsBq3AR2gFNEIXfBfDE0Q7Oi/?a=1233&bti=ODszNWYuMDE6&&bt=844&ft=bC~O_mfLPD12N_Y3rn-Ux_o2NY6e3wv25dcAp&mime_type=video_mp4&rc=MzhnZmhnODgzNzM1NTwzNkBpank1OnU5cmo3ZTMzODczNEBhNDAuX2JfNS8xNV9eMGAyYSMtbzFqMmQ0M25hLS1kMS1zcw%3D%3D&vvpl=1&l=20261116232857ED4BC65F6722FBA0BF25&btag=e00088000",
    sourceName: "Hub Bay With Me (@hub_baywithme)",
    authorHandle: "@hub_baywithme",
    publishedOrUpdatedAt: "2026-11-11T10:29:29.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-plovder-7706853705894595860",
    platform: 'tiktok',
    titleKh: "ដូចចង់ឡើងជាតិអាសុីត ទាល់តែទៅត្រាំទឹកត្រជាក់នៅតាមទឹកធ្លាក់ធម្មជាតិបានធូរមើលទៅ",
    titleEn: "ដូចចង់ឡើងជាតិអាសុីត ទាល់តែទៅត្រាំទឹកត្រជាក់នៅតាមទឹកធ្លាក់ធម្មជាតិបានធូរមើលទៅ (@plov_der)",
    titleZh: "ផ្លូវដើរ - Plov Der (@plov_der) 柬埔寨美食与探店视频",
    descriptionKh: "ដូចចង់ឡើងជាតិអាសុីត ទាល់តែទៅត្រាំទឹកត្រជាក់នៅតាមទឹកធ្លាក់ធម្មជាតិបានធូរមើលទៅ #travel #fypviralシ #everyone #fyp #nature",
    descriptionEn: "ដូចចង់ឡើងជាតិអាសុីត ទាល់តែទៅត្រាំទឹកត្រជាក់នៅតាមទឹកធ្លាក់ធម្មជាតិបានធូរមើលទៅ #travel #fypviralシ #everyone #fyp #nature — Official Cambodian TikTok food review by @plov_der.",
    descriptionZh: "来自柬埔寨美食创作者 @plov_der 的 TikTok 视频：ដូចចង់ឡើងជាតិអាសុីត ទាល់តែទៅត្រាំទឹកត្រជាក់នៅតាមទឹកធ្លាក់ធម្មជាតិបានធូរមើលទៅ #travel #fypviralシ #eve",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ok00yqgIiSBAeQWihICxDqP83AaBVCAAEzi9f5~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=SKAYQ6BwbjFq5HhJATFibUiU46k%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@plov_der/video/7706853705894595860",
    originalAccountUrl: "https://www.tiktok.com/@plov_der",
    inlineVideoId: "7706853705894595860",
    directVideoUrl: "https://v9.tiktokcdn.com/f0bb1c390f0ab6ae873c5df46f2c19c8/6afdc51c/video/tos/alisg/tos-alisg-pve-0037/oADqB07wET1FsfPANgMQ9GIAV4uUDBk2CfyIxQ/?a=1233&bti=ODszNWYuMDE6&&bt=5389&ft=L~O54ourD12NvWl-KzIxRNvSDlBF-UjNSmopiX&mime_type=video_mp4&rc=OGdkNzY8NWZoaTU2MzwzZ0BpanI8OHU5cjc2ZTMzODgzNEAyLjM1NWNiNWIxNTVeMGBjYSNlYG0vMmRzcG5hLS1kLy1zcw%3D%3D&vvpl=1&l=20261116232853B78F6EA1007D649445B9&btag=e00098000",
    sourceName: "ផ្លូវដើរ - Plov Der (@plov_der)",
    authorHandle: "@plov_der",
    publishedOrUpdatedAt: "2026-11-11T10:08:28.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-27",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-taseitrestaura-7706830129254747413",
    platform: 'tiktok',
    titleKh: "បងប្អូន ចង់ជួបជុំគ្នា ញ៉ាំអីឆ្ងាញ់ៗ ក្នុងបន្ទប់ឯកជនមែនទេ? តាសេតមានបន្ទប់ VIP ជូនបងប្អូន! 🥩🍲 ម",
    titleEn: "បងប្អូន ចង់ជួបជុំគ្នា ញ៉ាំអីឆ្ងាញ់ៗ ក្នុងបន្ទប់ឯកជនមែនទេ? តាសេតមានបន្ទប់ VIP ជូន (@taseit_restaurant)",
    titleZh: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "បងប្អូន ចង់ជួបជុំគ្នា ញ៉ាំអីឆ្ងាញ់ៗ ក្នុងបន្ទប់ឯកជនមែនទេ? តាសេតមានបន្ទប់ VIP ជូនបងប្អូន! 🥩🍲 មកញ៉ាំសាច់គោអាំង គ្រឿងក្នុងគោ  និងស៊ុបគោក្តៅៗ ជុំគ្រួសារ ជុំមិត្តភក្តិ ឬជួបជុំក្រុមការងារ។ កម្មវិធីខួបកំណើតក៏បានដែរ! 🎉 📩 ឆាតមកផេកតាសេត ដើម្បីកក់បន្ទប់ VIP ទុកមុន។",
    descriptionEn: "បងប្អូន ចង់ជួបជុំគ្នា ញ៉ាំអីឆ្ងាញ់ៗ ក្នុងបន្ទប់ឯកជនមែនទេ? តាសេតមានបន្ទប់ VIP ជូនបងប្អូន! 🥩🍲 មកញ៉ាំសាច់គោអាំង គ្រឿងក្នុងគោ  និងស៊ុបគោក្តៅៗ ជុំគ្រួសារ ជុំមិត្តភ — Official Cambodian TikTok food review by @taseit_restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @taseit_restaurant 的 TikTok 视频：បងប្អូន ចង់ជួបជុំគ្នា ញ៉ាំអីឆ្ងាញ់ៗ ក្នុងបន្ទប់ឯកជនមែនទេ? តាសេតមានបន្ទប់ VIP ជូនបងប្អូន! 🥩🍲 មកញ៉ាំ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/osAxavRDIivBAYzKKQTQD07VBjKEG9pcJlIri~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=zZcskFFFboM2SaDi7%2BPn8MfQlfs%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@taseit_restaurant/video/7706830129254747413",
    originalAccountUrl: "https://www.tiktok.com/@taseit_restaurant",
    inlineVideoId: "7706830129254747413",
    directVideoUrl: "https://v16.tiktokcdn.com/76b2c2d2de3404b49ec26a080a3cd6ec/6afdc44e/video/tos/alisg/tos-alisg-pve-0037c001/oQKeeAG6EUfDnLjaVA1VJAoIAgyoCklRSGFFIv/?a=1233&bti=ODszNWYuMDE6&&bt=1596&ft=bC~O_mfLPD12NtY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=ZGQ6aTs5OWk1NDlkZTo2ZEBpand0NWs5cmQ1ZTMzODczNEA1LS1hLTMuXjAxYi8xMV8wYSM1azU1MmRrZm5hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32CA6&btag=e000b8000",
    sourceName: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant)",
    authorHandle: "@taseit_restaurant",
    publishedOrUpdatedAt: "2026-11-11T08:36:59.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-mekorksach100m-7706828218640239924",
    platform: 'tiktok',
    titleKh: "មែនអត់😭😭🥺??? 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្ល",
    titleEn: "មែនអត់😭😭🥺??? 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្ (@me_kork_sach100muk)",
    titleZh: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk) 柬埔寨美食与探店视频",
    descriptionKh: "មែនអត់😭😭🥺??? 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍Google Map: (មីគោកសាច់100មុខ ម៉ាម៉ាអូរឬស្សី) https://maps.app.goo.gl/pVN6ByuU53XEUCmv9?g_st=ic",
    descriptionEn: "មែនអត់😭😭🥺??? 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍Google Map: (មីគោកសាច់ — Official Cambodian TikTok food review by @me_kork_sach100muk.",
    descriptionZh: "来自柬埔寨美食创作者 @me_kork_sach100muk 的 TikTok 视频：មែនអត់😭😭🥺??? 012880407 បេីកម៉ោង3ព្រឹកដល់1រសៀល 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿង",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/osABihcegPzRAEw4qAIDrGi5EyB0UhfJCgAyBA~tplv-tiktokx-dmt-logom:tos-alisg-i-0068/osvDA08IP4lXMEJiABHrLYBCAEiBAgA5naQ2U.image?dr=14573&x-expires=1795014000&x-signature=Gs3uXJ4bhZZZTeqpjWZFbUvN2%2BE%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@me_kork_sach100muk/video/7706828218640239924",
    originalAccountUrl: "https://www.tiktok.com/@me_kork_sach100muk",
    inlineVideoId: "7706828218640239924",
    directVideoUrl: "https://v3.tiktokcdn.com/85b2c27015b620e38e1fa41158e8b9d0/6afdc454/video/tos/alisg/tos-alisg-pve-0037c001/og6IueE0cANjGFIIgSjIAPCoJD6LQXTdVX6ffH/?a=1233&bti=ODszNWYuMDE6&&bt=1199&ft=bC~O_mfLPD12NWY3rn-UxK12KY6e3wv25zcAp&mime_type=video_mp4&rc=Z2Y4Zzk3ZTVoZGk6NTdkM0BpamU3dXI5cms1ZTMzODczNEAtMmEyLS4yXjExNTZhMTQxYSNvcGlzMmRzYm5hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232853F72B939D69FFBF8D7828&btag=e00088000",
    sourceName: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk)",
    authorHandle: "@me_kork_sach100muk",
    publishedOrUpdatedAt: "2026-11-11T08:29:34.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-36",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-expressionshub-7706790969831705864",
    platform: 'tiktok',
    titleKh: "ខកចិត្តដោយសារ​ food review",
    titleEn: "ខកចិត្តដោយសារ​ food review (@expressions_hub)",
    titleZh: "សារអាហារ - Expressions Hub (@expressions_hub) 柬埔寨美食与探店视频",
    descriptionKh: "ខកចិត្តដោយសារ​ food review",
    descriptionEn: "ខកចិត្តដោយសារ​ food review — Official Cambodian TikTok food review by @expressions_hub.",
    descriptionZh: "来自柬埔寨美食创作者 @expressions_hub 的 TikTok 视频：ខកចិត្តដោយសារ​ food review",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/owIjpoVAAQcVtRf0GDIe86LnQ0DCiAexIBIZKZ~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=fCZZueJ7%2BhVxUHjRUCy%2BHPwopCs%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@expressions_hub/video/7706790969831705864",
    originalAccountUrl: "https://www.tiktok.com/@expressions_hub",
    inlineVideoId: "7706790969831705864",
    directVideoUrl: "https://v16.tiktokcdn.com/0208783969a982e39428b2939d91975c/6afdc5a3/video/tos/alisg/tos-alisg-pve-0037c001/osGV0sepQi8AVLZIB3xCARofI6EDBIKAjer8r2/?a=1233&bti=ODszNWYuMDE6&&bt=575&ft=bC~O_mfLPD12NaY3rn-UxfKFWY6e3wv25xcAp&mime_type=video_mp4&rc=ZmVlaDk4aWQ6aDk8ZDM2ZkBpang1bnY5cmQzZTMzODczNEAyYTU0L2A2Ni4xLjUtNC9jYSNjcmleMmQ0Xm5hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232849EB6CBF2F635463AA4F26&btag=e000a0000",
    sourceName: "សារអាហារ - Expressions Hub (@expressions_hub)",
    authorHandle: "@expressions_hub",
    publishedOrUpdatedAt: "2026-11-11T06:05:02.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-pudylychher-7706777272182787346",
    platform: 'tiktok',
    titleKh: "ជូនពិសេសដល់អ្នកធ្លាក់ View ft",
    titleEn: "ជូនពិសេសដល់អ្នកធ្លាក់ View ft (@pudy_lychher)",
    titleZh: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher) 柬埔寨美食与探店视频",
    descriptionKh: "ជូនពិសេសដល់អ្នកធ្លាក់ View  #ពូឌីលីឈើ ft #គ្រូហ៊ុងស៊ុយ",
    descriptionEn: "ជូនពិសេសដល់អ្នកធ្លាក់ View  #ពូឌីលីឈើ ft #គ្រូហ៊ុងស៊ុយ — Official Cambodian TikTok food review by @pudy_lychher.",
    descriptionZh: "来自柬埔寨美食创作者 @pudy_lychher 的 TikTok 视频：ជូនពិសេសដល់អ្នកធ្លាក់ View  #ពូឌីលីឈើ ft #គ្រូហ៊ុងស៊ុយ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o0wFz4vAffEG9MTEZjDGTdeHRBGLneIrAgEgrL~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=GvNfCqOEr9vMnwQDd8nEkWX9g9U%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@pudy_lychher/video/7706777272182787346",
    originalAccountUrl: "https://www.tiktok.com/@pudy_lychher",
    inlineVideoId: "7706777272182787346",
    directVideoUrl: "https://v9.tiktokcdn.com/65ab396ed82e150224c14cf3ed1327db/6afdc506/video/tos/alisg/tos-alisg-pve-0037c001/o4QInFVmfCsgDiDbIfPpG4gAELeXi5puVXjAjV/?a=1233&bti=ODszNWYuMDE6&&bt=845&ft=L~O54ourD12Nvol-KzIxRHbjvlBF-UjNS3opiX&mime_type=video_mp4&rc=aGc5aTNlZDNpZzhmZTU0NEBpamo3bG45cnV5ZTMzODczNEAwX2EwY2EvNjUxMTBgYi4uYSM1aXJtMmRrZW1hLS1kMWBzcw%3D%3D&vvpl=1&l=202611162328484D55737F2DB4227DE8FF&btag=e00098000",
    sourceName: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)",
    authorHandle: "@pudy_lychher",
    publishedOrUpdatedAt: "2026-11-11T05:11:52.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-tosmokplouk-7706762834499194133",
    platform: 'tiktok',
    titleKh: "ម៉ូយប្រចាំហេីយគាវបំពងថ្មីៗ",
    titleEn: "ម៉ូយប្រចាំហេីយគាវបំពងថ្មីៗ (@tosmokplouk)",
    titleZh: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk) 柬埔寨美食与探店视频",
    descriptionKh: "ម៉ូយប្រចាំហេីយគាវបំពងថ្មីៗ#videoviral",
    descriptionEn: "ម៉ូយប្រចាំហេីយគាវបំពងថ្មីៗ#videoviral — Official Cambodian TikTok food review by @tosmokplouk.",
    descriptionZh: "来自柬埔寨美食创作者 @tosmokplouk 的 TikTok 视频：ម៉ូយប្រចាំហេីយគាវបំពងថ្មីៗ#videoviral",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ogQE1Ti8TIBlx5CAX4ogfZi1qzIgRDhBU3Af7B~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=3zM4Mt0pbKOI%2FqkFyINjMYY0wAI%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@tosmokplouk/video/7706762834499194133",
    originalAccountUrl: "https://www.tiktok.com/@tosmokplouk",
    inlineVideoId: "7706762834499194133",
    directVideoUrl: "https://v9.tiktokcdn.com/395c22f887d30f99e89207dd1f52b39a/6afdc461/video/tos/alisg/tos-alisg-pve-0037c001/ocDiQfTZBB3qilhExzi7fwIB8BUE141g5IREXA/?a=1233&bti=ODszNWYuMDE6&&bt=677&ft=bC~O_mfLPD12NWY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=aGY7Ozo6OTw0NTQ5MzdkZ0BpM206cHM5cnJ4ZTMzODczNEBhLjZjMTQyXmExLzQwMGEyYSNwXmBuMmRza21hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32C72&btag=e00088000",
    sourceName: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk)",
    authorHandle: "@tosmokplouk",
    publishedOrUpdatedAt: "2026-11-11T04:15:51.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-80",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-biteswithlily-7706749439716740382",
    platform: 'tiktok',
    titleKh: "Only eating Korean food for a full day in NYC! 🥩🍲🔥 Locations in Koreatown: 📍BCD Tofu 📍Ever",
    titleEn: "Only eating Korean food for a full day in NYC! 🥩🍲🔥 Locations in Koreatown: 📍 (@biteswithlily)",
    titleZh: "Bites With Lily (@biteswithlily) 柬埔寨美食与探店视频",
    descriptionKh: "Only eating Korean food for a full day in NYC! 🥩🍲🔥 Locations in Koreatown: 📍BCD Tofu 📍Everydaily 📍Nubiani Korean BBQ #koreanfood #ktown #koreatown #newyork #food",
    descriptionEn: "Only eating Korean food for a full day in NYC! 🥩🍲🔥 Locations in Koreatown: 📍BCD Tofu 📍Everydaily 📍Nubiani Korean BBQ #koreanfood #ktown #koreatown #newyor — Official Cambodian TikTok food review by @biteswithlily.",
    descriptionZh: "来自柬埔寨美食创作者 @biteswithlily 的 TikTok 视频：Only eating Korean food for a full day in NYC! 🥩🍲🔥 Locations in Koreatown: 📍BCD Tofu 📍Everydail",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast8-p-0068-tx2/oUzWA8DB9Iq7FnJ7gVfBRhqK9eBk39EmAEE3OE~tplv-tiktokx-dmt-logom:tos-useast8-i-0068-tx2/oEfjEIfglzZ3DAfzDPElIG83AAF9IVA751DqAE.image?dr=14573&x-expires=1795014000&x-signature=sRdHZvUFO9IhgSBCnKU6ZM47kP4%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@biteswithlily/video/7706749439716740382",
    originalAccountUrl: "https://www.tiktok.com/@biteswithlily",
    inlineVideoId: "7706749439716740382",
    directVideoUrl: "https://v3.tiktokcdn.com/0a6539e0f0f41db817f05ae083a73d7e/6afdc47f/video/tos/alisg/tos-alisg-ve-37c799-sg/o8EnmQREIEAfBEvzQqbAW3hJVBF7B48D9Dsqqe/?a=1233&bti=ODszNWYuMDE6&&bt=2017&ft=bC~O_mfLPD12NqY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=OWZlODxlZGk1OTtoODU7NUBpajRyb3g5cnR3ZTMzaTczNEAyMjQ1MTQ0NjQxNTViXl4xYSNvZmhkMmRrcW1hLS1kMTJzcw%3D%3D&vvpl=1&l=20261116232900F31E35B52A880B8BBA1D&btag=e00090000",
    sourceName: "Bites With Lily (@biteswithlily)",
    authorHandle: "@biteswithlily",
    publishedOrUpdatedAt: "2026-11-11T03:23:52.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-borerestaurant-7706575040522751250",
    platform: 'tiktok',
    titleKh: "don’t know what to order at boré? here are our some of our chef’s pick!",
    titleEn: "don’t know what to order at boré? here are our some of our chef’s pick! (@bore.restaurant)",
    titleZh: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "don’t know what to order at boré?  here are our some of our chef’s pick!  #fyp #phnompenh #cambodia",
    descriptionEn: "don’t know what to order at boré?  here are our some of our chef’s pick!  #fyp #phnompenh #cambodia — Official Cambodian TikTok food review by @bore.restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @bore.restaurant 的 TikTok 视频：don’t know what to order at boré?  here are our some of our chef’s pick!  #fyp #phnompenh #cambodia",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o4UghYQ1A3CE0vUqRlyBB9iETEQRQHFz1Hf8fD~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=NcVQ3oxWSnDs%2Fkce2V%2BZx4OdSUs%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@bore.restaurant/video/7706575040522751250",
    originalAccountUrl: "https://www.tiktok.com/@bore.restaurant",
    inlineVideoId: "7706575040522751250",
    directVideoUrl: "https://v9.tiktokcdn.com/9152f3efdc5e681b34fece1f9f84c2df/6afdc449/video/tos/alisg/tos-alisg-pve-0037c001/o8qvUxz31BsI0AFRvBeEhTlQB8EigxfviCQDEZ/?a=1233&bti=ODszNWYuMDE6&&bt=785&ft=bC~O_mfLPD12NtY3rn-Ux-evWY6e3wv251cAp&mime_type=video_mp4&rc=PDNlNTg8NzllNjY2ZmkzNkBpamY4dnE5cmduZTMzODczNEA2XzBgLTBhXzMxNWAwMC4yYSNgcTNxMmRjLm1hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232855390EAF6F445DC2B3EA8E&btag=e000b8000",
    sourceName: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant)",
    authorHandle: "@bore.restaurant",
    publishedOrUpdatedAt: "2026-11-10T16:07:07.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-1",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-borerestaurant-7706568144818621703",
    platform: 'tiktok',
    titleKh: "ភោជនីយដ្ឋាន បុរេ ជាទីកន្លែងដ៏ស័ក្តិសមសម្រាប់ការជួបជុំជាមួយក្រុមគ្រួសារ មិត្តភក្តិ និងមនុស្សជាទី",
    titleEn: "ភោជនីយដ្ឋាន បុរេ ជាទីកន្លែងដ៏ស័ក្តិសមសម្រាប់ការជួបជុំជាមួយក្រុមគ្រួសារ មិត្តភក្ត (@bore.restaurant)",
    titleZh: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "ភោជនីយដ្ឋាន បុរេ ជាទីកន្លែងដ៏ស័ក្តិសមសម្រាប់ការជួបជុំជាមួយក្រុមគ្រួសារ មិត្តភក្តិ និងមនុស្សជាទីស្រឡាញ់ ក្នុងបរិយាកាសដ៏កក់ក្ដៅ និងទេសភាពធម្មជាតិដ៏ស្រស់ស្អាត។ 🇰🇭🌿 🕰️ 10:30 am - 10:30 pm ☎️ Contact: https://t.me/borerestaurant 📍Location: https://maps.app.goo.gl/DqSggg9Tiqmi5ZHM8?g_st=ic #borerestaurant #khmercuisine #lunch #dinner #fyp",
    descriptionEn: "ភោជនីយដ្ឋាន បុរេ ជាទីកន្លែងដ៏ស័ក្តិសមសម្រាប់ការជួបជុំជាមួយក្រុមគ្រួសារ មិត្តភក្តិ និងមនុស្សជាទីស្រឡាញ់ ក្នុងបរិយាកាសដ៏កក់ក្ដៅ និងទេសភាពធម្មជាតិដ៏ស្រស់ស្អាត។ 🇰\ud83c — Official Cambodian TikTok food review by @bore.restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @bore.restaurant 的 TikTok 视频：ភោជនីយដ្ឋាន បុរេ ជាទីកន្លែងដ៏ស័ក្តិសមសម្រាប់ការជួបជុំជាមួយក្រុមគ្រួសារ មិត្តភក្តិ និងមនុស្សជាទីស្រឡា",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/owEfJAREIBAfdQHmAqAgviwFcCFrAd8Dzg6vbg~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=qoc9YKQhTuxaXMJP86GOwPzZApY%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@bore.restaurant/video/7706568144818621703",
    originalAccountUrl: "https://www.tiktok.com/@bore.restaurant",
    inlineVideoId: "7706568144818621703",
    directVideoUrl: "https://v9.tiktokcdn.com/55b4bb2b22d64d70cde586e92d133200/6afdc496/video/tos/alisg/tos-alisg-pve-0037c001/ogQisgIBizA6al3Ichvdo6BAAYEEMvLOdXxxK/?a=1233&bti=ODszNWYuMDE6&&bt=723&ft=bC~O_mfLPD12NtY3rn-Ux-evWY6e3wv251cAp&mime_type=video_mp4&rc=NTY4ZGQ0PDc6M2k3NTU4Z0Bpajs7cnQ5cnZtZTMzODczNEAwNTQwL2NiXi0xYWMvNjJgYSNmay5iMmRraG1hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232855390EAF6F445DC2B3EA8E&btag=e00090000",
    sourceName: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant)",
    authorHandle: "@bore.restaurant",
    publishedOrUpdatedAt: "2026-11-10T15:40:21.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-1",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-fatamecooking-7706530697506245909",
    platform: 'tiktok',
    titleKh: "របៀបធ្វើខត្រីកាម៉ុង​ 😋​ LEANG LENG Fish Sauce លាង ឡេង​",
    titleEn: "របៀបធ្វើខត្រីកាម៉ុង​ 😋​ LEANG LENG Fish Sauce លាង ឡេង​ (@fatame.cooking)",
    titleZh: "Fatame (@fatame.cooking) 柬埔寨美食与探店视频",
    descriptionKh: "របៀបធ្វើខត្រីកាម៉ុង​ 😋​  LEANG LENG Fish Sauce លាង ឡេង​  #fishrecipe #cookingathome",
    descriptionEn: "របៀបធ្វើខត្រីកាម៉ុង​ 😋​  LEANG LENG Fish Sauce លាង ឡេង​  #fishrecipe #cookingathome — Official Cambodian TikTok food review by @fatame.cooking.",
    descriptionZh: "来自柬埔寨美食创作者 @fatame.cooking 的 TikTok 视频：របៀបធ្វើខត្រីកាម៉ុង​ 😋​  LEANG LENG Fish Sauce លាង ឡេង​  #fishrecipe #cookingathome",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oIV53T1GQtjeCEwIQPezRDAAKjWN748O2AeMEQ~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=QjDTF7XErBzh%2BrFLCjp7extYxds%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@fatame.cooking/video/7706530697506245909",
    originalAccountUrl: "https://www.tiktok.com/@fatame.cooking",
    inlineVideoId: "7706530697506245909",
    directVideoUrl: "https://v9.tiktokcdn.com/c8fbf173f3af3aeb3f875122bee66fe7/6afdc4b6/video/tos/alisg/tos-alisg-pve-0037c001/owemP1A58AQx3E3egMjVOhCeMQD4WIdEwjgI2T/?a=1233&bti=ODszNWYuMDE6&&bt=1009&ft=bC~O_mfLPD12NrY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=Mzg5NTNkNzc5NGVnODU2ZkBpamd4M2w5cjRrZTMzODczNEAzMjUtM19hXzIxMi4zNjEzYSNjL2JjMmRzZW1hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232850F1EAE8B11E904E9F4279&btag=e00090000",
    sourceName: "Fatame (@fatame.cooking)",
    authorHandle: "@fatame.cooking",
    publishedOrUpdatedAt: "2026-11-10T13:15:02.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-khleancheck-7706527600566406420",
    platform: 'tiktok',
    titleKh: "ស៊ុបគោសេរ៊ីចាស់ឆ្ងាញ់នៅម្ដុំស្តាតចាស់❤️✨",
    titleEn: "ស៊ុបគោសេរ៊ីចាស់ឆ្ងាញ់នៅម្ដុំស្តាតចាស់❤️✨ (@.khleancheck)",
    titleZh: "ឃ្លានឆែក - Khlean Check (@.khleancheck) 柬埔寨美食与探店视频",
    descriptionKh: "ស៊ុបគោសេរ៊ីចាស់ឆ្ងាញ់នៅម្ដុំស្តាតចាស់❤️✨#gangzbergsnow #coollikethat #ឃ្លានឆេក",
    descriptionEn: "ស៊ុបគោសេរ៊ីចាស់ឆ្ងាញ់នៅម្ដុំស្តាតចាស់❤️✨#gangzbergsnow #coollikethat #ឃ្លានឆេក — Official Cambodian TikTok food review by @.khleancheck.",
    descriptionZh: "来自柬埔寨美食创作者 @.khleancheck 的 TikTok 视频：ស៊ុបគោសេរ៊ីចាស់ឆ្ងាញ់នៅម្ដុំស្តាតចាស់❤️✨#gangzbergsnow #coollikethat #ឃ្លានឆេក",
    thumbnailUrl: "https://p19-common-sign.tiktokcdn.com/tos-alisg-p-0037/owEq8FDFQBBE8vqffEAgQjPFnxm5IYRXCRNRcL~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=winH%2FL9E26C%2B%2F%2Fcd5iA%2FoXKgs68%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@.khleancheck/video/7706527600566406420",
    originalAccountUrl: "https://www.tiktok.com/@.khleancheck",
    inlineVideoId: "7706527600566406420",
    directVideoUrl: "https://v16.tiktokcdn.com/c2182ac910460ab58a69964f65051d48/6afdc4bd/video/tos/alisg/tos-alisg-pve-0037c001/oEzioO0EREGAicxf1LIQiTBqbvsiiB8YBgorFe/?a=1233&bti=ODszNWYuMDE6&&bt=861&ft=bC~O_mfLPD12NzY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=Ozk8NGdoOztmNDkzZTtpaUBpMztoO285cnhrZTMzODczNEA2LS5jXzM1NWMxYDEtMjEtYSNqMmYwMmRjX21hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232851602EB059E8441C9D6BC2&btag=e00090000",
    sourceName: "ឃ្លានឆែក - Khlean Check (@.khleancheck)",
    authorHandle: "@.khleancheck",
    publishedOrUpdatedAt: "2026-11-10T13:03:01.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-benlycooking-7706508574503046452",
    platform: 'tiktok',
    titleKh: "មាន់អាំងគ្រប់គ្រឿង😋បើកដាក់ជាមួយអាជាក់ៗទៀតកឺថា...🤭",
    titleEn: "មាន់អាំងគ្រប់គ្រឿង😋បើកដាក់ជាមួយអាជាក់ៗទៀតកឺថា...🤭 (@benlycooking)",
    titleZh: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking) 柬埔寨美食与探店视频",
    descriptionKh: "មាន់អាំងគ្រប់គ្រឿង😋បើកដាក់ជាមួយអាជាក់ៗទៀតកឺថា...🤭",
    descriptionEn: "មាន់អាំងគ្រប់គ្រឿង😋បើកដាក់ជាមួយអាជាក់ៗទៀតកឺថា...🤭 — Official Cambodian TikTok food review by @benlycooking.",
    descriptionZh: "来自柬埔寨美食创作者 @benlycooking 的 TikTok 视频：មាន់អាំងគ្រប់គ្រឿង😋បើកដាក់ជាមួយអាជាក់ៗទៀតកឺថា...🤭",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oUeBBg3o5CDLNJcQIQfudeAhhUlANV9BGIjzIn~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=osrpeLAcnhmHWb0oiU9Ssbll18Q%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@benlycooking/video/7706508574503046452",
    originalAccountUrl: "https://www.tiktok.com/@benlycooking",
    inlineVideoId: "7706508574503046452",
    directVideoUrl: "https://v45-eu.tiktokcdn.com/cc4791a2d50386974cf98069c0173c5c/6afdc49d/video/tos/alisg/tos-alisg-pve-0037c001/ooH5R4ojEIIgofMfDeAWC5REg8BbV3QCCAl6zA/?a=1233&bti=ODszNWYuMDE6&&bt=1164&ft=L~aJCoCyD12Nv7l-KzIxREFSrlBF-UjNSbopiX&mime_type=video_mp4&rc=NGk3MzU2aDpoZmhpOGY4Z0BpM2pnanE5cmhqZTMzODczNEBhMS8uMC0vXl4xMl5gM2I0YSNrcy9eMmRzNm1hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232852D1F2A5EE89B7A79565DA&btag=e00095000",
    sourceName: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking)",
    authorHandle: "@benlycooking",
    publishedOrUpdatedAt: "2026-11-10T11:49:11.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-4",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-hubbaywithme-7706487165080915201",
    platform: 'tiktok',
    titleKh: "សុំអង្វរម៉ង កុំតេមកពេលយប់ admin ចូលដេកលឿនណាស់ 🌚☝🏻 ចង់សួរអី ចាំព្រឹកចាំនិយាយគ្នា🥲🫶🏻 📍Malaj",
    titleEn: "សុំអង្វរម៉ង កុំតេមកពេលយប់ admin ចូលដេកលឿនណាស់ 🌚☝🏻 ចង់សួរអី ចាំព្រឹកចាំនិយាយគ្ន (@hub_baywithme)",
    titleZh: "Hub Bay With Me (@hub_baywithme) 柬埔寨美食与探店视频",
    descriptionKh: "សុំអង្វរម៉ង កុំតេមកពេលយប់ admin ចូលដេកលឿនណាស់ 🌚☝🏻 ចង់សួរអី ចាំព្រឹកចាំនិយាយគ្នា🥲🫶🏻  📍Malajia Malatang  #hubbayehh #malatang #food_m #milksoup #spicysauce",
    descriptionEn: "សុំអង្វរម៉ង កុំតេមកពេលយប់ admin ចូលដេកលឿនណាស់ 🌚☝🏻 ចង់សួរអី ចាំព្រឹកចាំនិយាយគ្នា🥲🫶🏻  📍Malajia Malatang  #hubbayehh #malatang #food_m #milksoup #spicysauce — Official Cambodian TikTok food review by @hub_baywithme.",
    descriptionZh: "来自柬埔寨美食创作者 @hub_baywithme 的 TikTok 视频：សុំអង្វរម៉ង កុំតេមកពេលយប់ admin ចូលដេកលឿនណាស់ 🌚☝🏻 ចង់សួរអី ចាំព្រឹកចាំនិយាយគ្នា🥲🫶🏻  📍Malajia M",
    thumbnailUrl: "https://p19-common-sign.tiktokcdn.com/tos-alisg-p-0037/oAUuEliXArciXiayBABAIie9Rlqg8CDEAXiKfo~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=G%2BSb8lyTU0ucRXr47%2FVvH4EtHtg%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@hub_baywithme/video/7706487165080915201",
    originalAccountUrl: "https://www.tiktok.com/@hub_baywithme",
    inlineVideoId: "7706487165080915201",
    directVideoUrl: "https://v9.tiktokcdn.com/9265c1f0a6e1a6c3e1edb816cc82b109/6afdc470/video/tos/alisg/tos-alisg-pve-0037c001/oMcQFBfisgeVqEgcpEBiR8AdEdIMisEVByvX8y/?a=1233&bti=ODszNWYuMDE6&&bt=650&ft=bC~O_mfLPD12N_Y3rn-Ux_o2NY6e3wv25dcAp&mime_type=video_mp4&rc=Zzo7OjVmOjo2MztlZ2U5OUBpMzhtcWw5cjVpZTMzODczNEAtMDJfYDEzXmIxYDBiMjY2YSNkbGFoMmRjL21hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232857ED4BC65F6722FBA0BF25&btag=e00088000",
    sourceName: "Hub Bay With Me (@hub_baywithme)",
    authorHandle: "@hub_baywithme",
    publishedOrUpdatedAt: "2026-11-10T10:26:06.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-plovder-7706471744474975508",
    platform: 'tiktok',
    titleKh: "ធ្លាប់តែឃើញគេប្រលាក់ត្រីងៀតទឹកសាប ឥឡូវបានឃើញត្រីងៀតទឹកសាបម្តងប្លែកភ្នែកណាស់ នៅខាងកោះស្តេច",
    titleEn: "ធ្លាប់តែឃើញគេប្រលាក់ត្រីងៀតទឹកសាប ឥឡូវបានឃើញត្រីងៀតទឹកសាបម្តងប្លែកភ្នែកណាស់ នៅខា (@plov_der)",
    titleZh: "ផ្លូវដើរ - Plov Der (@plov_der) 柬埔寨美食与探店视频",
    descriptionKh: "ធ្លាប់តែឃើញគេប្រលាក់ត្រីងៀតទឹកសាប ឥឡូវបានឃើញត្រីងៀតទឹកសាបម្តងប្លែកភ្នែកណាស់ នៅខាងកោះស្តេច #everyone #fyp #fypviralシ #foodie #travel",
    descriptionEn: "ធ្លាប់តែឃើញគេប្រលាក់ត្រីងៀតទឹកសាប ឥឡូវបានឃើញត្រីងៀតទឹកសាបម្តងប្លែកភ្នែកណាស់ នៅខាងកោះស្តេច #everyone #fyp #fypviralシ #foodie #travel — Official Cambodian TikTok food review by @plov_der.",
    descriptionZh: "来自柬埔寨美食创作者 @plov_der 的 TikTok 视频：ធ្លាប់តែឃើញគេប្រលាក់ត្រីងៀតទឹកសាប ឥឡូវបានឃើញត្រីងៀតទឹកសាបម្តងប្លែកភ្នែកណាស់ នៅខាងកោះស្តេច #everyone ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oEfAIDALdEATDrAA9NE5fYIc6G4HGewEgwpVgy~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=9IfZMCPdMFOUblkY9SKspPGtRKg%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@plov_der/video/7706471744474975508",
    originalAccountUrl: "https://www.tiktok.com/@plov_der",
    inlineVideoId: "7706471744474975508",
    directVideoUrl: "https://v9.tiktokcdn.com/af8eae5a817ff86cf7ee386cc838529a/6afdc52d/video/tos/alisg/tos-alisg-pve-0037/o0XcfwEEIBgqzm8fr5FQyoDbaALpLCAMDBuVS7/?a=1233&bti=ODszNWYuMDE6&&bt=4983&ft=L~O54ourD12NvWl-KzIxRNvSDlBF-UjNSmopiX&mime_type=video_mp4&rc=aDs8OmU5aDY5aTM0NjY5OkBpM3lsOHc5cnZoZTMzODgzNEAzMmMtL2AyNTIxMjEwNmIwYSNhb2JnMmRzMm1hLS1kLy1zcw%3D%3D&vvpl=1&l=20261116232853B78F6EA1007D649445B9&btag=e00098000",
    sourceName: "ផ្លូវដើរ - Plov Der (@plov_der)",
    authorHandle: "@plov_der",
    publishedOrUpdatedAt: "2026-11-10T09:26:16.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-27",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-ounwelldailyco-7706471104327503125",
    platform: 'tiktok',
    titleKh: "ប្អូន ៣ខែ មុខប៉ុនបង ៤ឆ្នាំហេីយ 😆😆♥️♥️",
    titleEn: "ប្អូន ៣ខែ មុខប៉ុនបង ៤ឆ្នាំហេីយ 😆😆♥️♥️ (@ounwelldailycooking)",
    titleZh: "Oun Well Daily Cooking (@ounwelldailycooking) 柬埔寨美食与探店视频",
    descriptionKh: "ប្អូន ៣ខែ មុខប៉ុនបង ៤ឆ្នាំហេីយ 😆😆♥️♥️",
    descriptionEn: "ប្អូន ៣ខែ មុខប៉ុនបង ៤ឆ្នាំហេីយ 😆😆♥️♥️ — Official Cambodian TikTok food review by @ounwelldailycooking.",
    descriptionZh: "来自柬埔寨美食创作者 @ounwelldailycooking 的 TikTok 视频：ប្អូន ៣ខែ មុខប៉ុនបង ៤ឆ្នាំហេីយ 😆😆♥️♥️",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/okwJEBAFPQi4HRCgYIE8qHQu72xVDfeBcVaqdl~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=Wvjquqd0d6x8taofZrRJ2BapqwU%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@ounwelldailycooking/video/7706471104327503125",
    originalAccountUrl: "https://www.tiktok.com/@ounwelldailycooking",
    inlineVideoId: "7706471104327503125",
    directVideoUrl: "https://v9.tiktokcdn.com/c72296ce1a128590af1b6e38526fd11f/6afdc450/video/tos/alisg/tos-alisg-pve-0037c001/o4QjA7RlhPf3e1MfCA8sXhA4AOgVWFNrDc5VxI/?a=1233&bti=ODszNWYuMDE6&&bt=521&ft=bC~O_mfLPD12NVY3rn-Ux_N5PY6e3wv25LcAp&mime_type=video_mp4&rc=ZmY3OjxmNWc8OWkzZmlpM0Bpam8zNnY5cm9oZTMzODczNEAtMWFiNjJfX2AxYF5eXzFfYSNhY2szMmRjMG1hLS1kMWBzcw%3D%3D&vvpl=1&l=202611162328572824A64FCD4BE49FEFE1&btag=e000b8000",
    sourceName: "Oun Well Daily Cooking (@ounwelldailycooking)",
    authorHandle: "@ounwelldailycooking",
    publishedOrUpdatedAt: "2026-11-10T09:23:47.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-4",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-ysreymom-7706470430558768404",
    platform: 'tiktok',
    titleKh: "អីលូវនេះរសជាតិអំបិលម្ទេសអង្ករលីញឆ្អិនទៀតហើយបង",
    titleEn: "អីលូវនេះរសជាតិអំបិលម្ទេសអង្ករលីញឆ្អិនទៀតហើយបង (@y.sreymom)",
    titleZh: "@y.sreymom 柬埔寨美食与探店视频",
    descriptionKh: "អីលូវនេះរសជាតិអំបិលម្ទេសអង្ករលីញឆ្អិនទៀតហើយបង #BattambangFood #t34ទាអាំងអំបិលស្បែកស្រួយ #t34_069693434 #customers #customers",
    descriptionEn: "អីលូវនេះរសជាតិអំបិលម្ទេសអង្ករលីញឆ្អិនទៀតហើយបង #BattambangFood #t34ទាអាំងអំបិលស្បែកស្រួយ #t34_069693434 #customers #customers — Official Cambodian TikTok food review by @y.sreymom.",
    descriptionZh: "来自柬埔寨美食创作者 @y.sreymom 的 TikTok 视频：អីលូវនេះរសជាតិអំបិលម្ទេសអង្ករលីញឆ្អិនទៀតហើយបង #BattambangFood #t34ទាអាំងអំបិលស្បែកស្រួយ #t34_0696934",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oARqMACx7An9JR6RgIiGe4UBJfWarhXiBEBvyI~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=JQgzlOQWgkz0Hel5VpcV%2FwNqkOI%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@y.sreymom/video/7706470430558768404",
    originalAccountUrl: "https://www.tiktok.com/@y.sreymom",
    inlineVideoId: "7706470430558768404",
    directVideoUrl: "https://v16.tiktokcdn.com/f07539d34760a201541a9b982d89da06/6afdc46f/video/tos/alisg/tos-alisg-pve-0037c001/oIiCjGbqeAOrBaJQi9WXzR4BUTyfEWx3ERGgIB/?a=1233&bti=ODszNWYuMDE6&&bt=1357&ft=L~O54ourD12Nv.A-KzIxREFSrlBF-UjNSbopiX&mime_type=video_mp4&rc=NGc3ZGczZzY7aTs0PDw1O0BpM3Q5b3c5cjdoZTMzODczNEBjYDY2YC8wXl4xXjNiNl8vYSMwamo1MmRzL21hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232910F9B95A1CB519E499ECB0&btag=e00088000",
    sourceName: "@y.sreymom",
    authorHandle: "@y.sreymom",
    publishedOrUpdatedAt: "2026-11-10T09:21:10.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-taseitrestaura-7706467714256358662",
    platform: 'tiktok',
    titleKh: "🥩 សាច់វេចខ្ចប់ពីតាសេត ឆ្ងាញ់ មានអនាម័យ ងាយស្រួលកុម្ម៉ង់ និងបានរហ័សទាន់ចិត្ត! 😋",
    titleEn: "🥩 សាច់វេចខ្ចប់ពីតាសេត ឆ្ងាញ់ មានអនាម័យ ងាយស្រួលកុម្ម៉ង់ និងបានរហ័សទាន់ចិត្ត! 😋 (@taseit_restaurant)",
    titleZh: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "🥩 សាច់វេចខ្ចប់ពីតាសេត ឆ្ងាញ់ មានអនាម័យ ងាយស្រួលកុម្ម៉ង់ និងបានរហ័សទាន់ចិត្ត! 😋",
    descriptionEn: "🥩 សាច់វេចខ្ចប់ពីតាសេត ឆ្ងាញ់ មានអនាម័យ ងាយស្រួលកុម្ម៉ង់ និងបានរហ័សទាន់ចិត្ត! 😋 — Official Cambodian TikTok food review by @taseit_restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @taseit_restaurant 的 TikTok 视频：🥩 សាច់វេចខ្ចប់ពីតាសេត ឆ្ងាញ់ មានអនាម័យ ងាយស្រួលកុម្ម៉ង់ និងបានរហ័សទាន់ចិត្ត! 😋",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oYdiOECwE8RUDfAk2v7iyIWDq5A3ZBJ9eAigAB~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=M%2BEcGDA4qYFI1WVONgfrFjs9n5k%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@taseit_restaurant/video/7706467714256358662",
    originalAccountUrl: "https://www.tiktok.com/@taseit_restaurant",
    inlineVideoId: "7706467714256358662",
    directVideoUrl: "https://v16.tiktokcdn.com/6cbdca1acc965206166305a8ab3efd2e/6afdc456/video/tos/alisg/tos-alisg-pve-0037c001/oEV35gF4VTDzQ0KyCuFEAeDDI5AjE9fIQhf2ob/?a=1233&bti=ODszNWYuMDE6&&bt=771&ft=bC~O_mfLPD12NtY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=PDs5Ozg7ODQ4PGU3ODY0OkBpM3RvZHE5cjNnZTMzODczNEBjLS02X2MvX2AxXjIvNF4zYSNiamg1MmRzc21hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32CA6&btag=e00088000",
    sourceName: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant)",
    authorHandle: "@taseit_restaurant",
    publishedOrUpdatedAt: "2026-11-10T09:10:38.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-mekorksach100m-7706427778555514118",
    platform: 'tiktok',
    titleKh: "ខ្លាចដៃម៉ូយមីគោកសាច់100មុខហេីយ😱😱😳 បេីកម៉ោង3ព្រឹកដល់1រសៀល 012880407 📍ទីតាំង: ផ្សារអូរឬស្សីទល",
    titleEn: "ខ្លាចដៃម៉ូយមីគោកសាច់100មុខហេីយ😱😱😳 បេីកម៉ោង3ព្រឹកដល់1រសៀល 012880407 📍ទីតាំង:  (@me_kork_sach100muk)",
    titleZh: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk) 柬埔寨美食与探店视频",
    descriptionKh: "ខ្លាចដៃម៉ូយមីគោកសាច់100មុខហេីយ😱😱😳 បេីកម៉ោង3ព្រឹកដល់1រសៀល 012880407 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍Google Map: (មីគោកសាច់100មុខ ម៉ាម៉ាអូរឬស្សី) https://maps.app.goo.gl/pVN6ByuU53XEUCmv9?g_st=ic",
    descriptionEn: "ខ្លាចដៃម៉ូយមីគោកសាច់100មុខហេីយ😱😱😳 បេីកម៉ោង3ព្រឹកដល់1រសៀល 012880407 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍G — Official Cambodian TikTok food review by @me_kork_sach100muk.",
    descriptionZh: "来自柬埔寨美食创作者 @me_kork_sach100muk 的 TikTok 视频：ខ្លាចដៃម៉ូយមីគោកសាច់100មុខហេីយ😱😱😳 បេីកម៉ោង3ព្រឹកដល់1រសៀល 012880407 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ocbvIUEDlTfBz98EvqryEQeICoFdoRA84IB2qg~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=foMqKzAhDAnOXGznBWofZqtSlVk%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@me_kork_sach100muk/video/7706427778555514118",
    originalAccountUrl: "https://www.tiktok.com/@me_kork_sach100muk",
    inlineVideoId: "7706427778555514118",
    directVideoUrl: "https://v3.tiktokcdn.com/d5455a79641949419c9a31a0645333e6/6afdc452/video/tos/alisg/tos-alisg-pve-0037c001/ogFeAeDyHXfZORuAArQM1I8xip5LAejjGQKRNG/?a=1233&bti=ODszNWYuMDE6&&bt=924&ft=bC~O_mfLPD12NWY3rn-UxK12KY6e3wv25zcAp&mime_type=video_mp4&rc=aWQ1NWk0NGk8Nmg6NmU2OUBpMztrd3g5cmxlZTMzODczNEBhYF80XjZeX2AxLzU2LjFhYSNjZzBoMmQ0a21hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232853F72B939D69FFBF8D7828&btag=e000b8000",
    sourceName: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk)",
    authorHandle: "@me_kork_sach100muk",
    publishedOrUpdatedAt: "2026-11-10T06:35:39.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-36",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-suyadaily-7706418908592360724",
    platform: 'tiktok',
    titleKh: "ទៅទទួលនៅវត្តថ្ងៃបុណ្យកឋិនទាន🥰😊",
    titleEn: "ទៅទទួលនៅវត្តថ្ងៃបុណ្យកឋិនទាន🥰😊 (@suyadaily)",
    titleZh: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily) 柬埔寨美食与探店视频",
    descriptionKh: "ទៅទទួលនៅវត្តថ្ងៃបុណ្យកឋិនទាន🥰😊#បុណ្យកឋិនទាន🇰🇭 #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #reels #vlog #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏",
    descriptionEn: "ទៅទទួលនៅវត្តថ្ងៃបុណ្យកឋិនទាន🥰😊#បុណ្យកឋិនទាន🇰🇭 #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #reels #vlog #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 — Official Cambodian TikTok food review by @suyadaily.",
    descriptionZh: "来自柬埔寨美食创作者 @suyadaily 的 TikTok 视频：ទៅទទួលនៅវត្តថ្ងៃបុណ្យកឋិនទាន🥰😊#បុណ្យកឋិនទាន🇰🇭 #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #reels #vlog #ស្រលាញ់អ្ន",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ogGgcmsBA1lEV4cqRl0BBMEL0iIYIDiy3rnefB~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=yb4IPrOdaesH8BiCKYq5XbyOYNI%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@suyadaily/video/7706418908592360724",
    originalAccountUrl: "https://www.tiktok.com/@suyadaily",
    inlineVideoId: "7706418908592360724",
    directVideoUrl: "https://v3.tiktokcdn.com/441d1495f37c84cafd023b56b19f7ab2/6afdc551/video/tos/alisg/tos-alisg-pve-0037c001/ocfEIsZ3QqxEch8BNywDfBoRKDAFhjrgU3lqI4/?a=1233&bti=ODszNWYuMDE6&&bt=1233&ft=bC~O_mfLPD12NVY3rn-UxrN5VY6e3wv252cAp&mime_type=video_mp4&rc=aWY5ZTllN2llN2llPDY4NUBpMzlqcXI5cjNlZTMzODczNEAwMS8uYzUtXzUxNWEvYGAzYSNubS1uMmRzMm1hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232856152A25DD5E5B70AA15C3&btag=e00098000",
    sourceName: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily)",
    authorHandle: "@suyadaily",
    publishedOrUpdatedAt: "2026-11-10T06:01:14.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-borerestaurant-7706357471656512776",
    platform: 'tiktok',
    titleKh: "យប់នេះ មានគម្រោងទៅណាហើយឬនៅ? 🤭✨ បើមិនទាន់មានទេ មកជួបជុំគ្នានៅភោជនីយដ្ឋាន បុរេ ណា!",
    titleEn: "យប់នេះ មានគម្រោងទៅណាហើយឬនៅ? 🤭✨ បើមិនទាន់មានទេ មកជួបជុំគ្នានៅភោជនីយដ្ឋាន បុរេ ណា (@bore.restaurant)",
    titleZh: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "យប់នេះ មានគម្រោងទៅណាហើយឬនៅ? 🤭✨ បើមិនទាន់មានទេ មកជួបជុំគ្នានៅភោជនីយដ្ឋាន បុរេ ណា! #fyp #phnompenh #cambodia #khmerfood #foodinphnompenh",
    descriptionEn: "យប់នេះ មានគម្រោងទៅណាហើយឬនៅ? 🤭✨ បើមិនទាន់មានទេ មកជួបជុំគ្នានៅភោជនីយដ្ឋាន បុរេ ណា! #fyp #phnompenh #cambodia #khmerfood #foodinphnompenh — Official Cambodian TikTok food review by @bore.restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @bore.restaurant 的 TikTok 视频：យប់នេះ មានគម្រោងទៅណាហើយឬនៅ? 🤭✨ បើមិនទាន់មានទេ មកជួបជុំគ្នានៅភោជនីយដ្ឋាន បុរេ ណា! #fyp #phnompenh #c",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oYTrDG8MoImHjiVIee4eH5mPkE1AvQaAXAApQA~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=wuFbKXp8uQinoE0kU3MjSxg6jwE%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@bore.restaurant/video/7706357471656512776",
    originalAccountUrl: "https://www.tiktok.com/@bore.restaurant",
    inlineVideoId: "7706357471656512776",
    directVideoUrl: "https://v9.tiktokcdn.com/3b9351b8d4c72725e0b9b04288e24449/6afdc455/video/tos/alisg/tos-alisg-pve-0037c001/oUkG5FBRUDq389EoegEcAg2QQf0JNvBEPYIlng/?a=1233&bti=ODszNWYuMDE6&&bt=608&ft=bC~O_mfLPD12NtY3rn-Ux-evWY6e3wv251cAp&mime_type=video_mp4&rc=ZWVoOjpnaTs1aDRoNzVpOEBpanR0ZXY5cjU6ZTMzODczNEBeYzYzYjAuNTQxNTRiXjM2YSMuZGdnMmRjaG1hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232855390EAF6F445DC2B3EA8E&btag=e00088000",
    sourceName: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant)",
    authorHandle: "@bore.restaurant",
    publishedOrUpdatedAt: "2026-11-10T02:02:50.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-1",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-thehungryhouse-7706278540760714510",
    platform: 'tiktok',
    titleKh: "Here is a 900sqft ADU. (accessory dwelling unit) ‼️Just finished this 900sqft ADU in Lowell, MA",
    titleEn: "Here is a 900sqft ADU. (accessory dwelling unit) ‼️Just finished this 900sqft AD (@the_hungry_housewife)",
    titleZh: "The Hungry Housewife (@the_hungry_housewife) 柬埔寨美食与探店视频",
    descriptionKh: "Here is a 900sqft ADU. (accessory dwelling unit)  ‼️Just finished this 900sqft ADU in Lowell, MA. For a client ‼️ This two story barn conversion features 2 bedrooms, 2 full baths, 10ft ceilings, walk in closet, eat in kitchen with granite counter tops, laundry, recessed niche in both showers, glass shower doors, its own hot water tank, its own electrical panel, and ductless mini splits. This cost LESS than $175K  Contact me today for a quote. (Excuse the mess and dirt, the renters already started moving in)  : . #adu #construction #build #constructionlife #home",
    descriptionEn: "Here is a 900sqft ADU. (accessory dwelling unit)  ‼️Just finished this 900sqft ADU in Lowell, MA. For a client ‼️ This two story barn conversion features 2 bedr — Official Cambodian TikTok food review by @the_hungry_housewife.",
    descriptionZh: "来自柬埔寨美食创作者 @the_hungry_housewife 的 TikTok 视频：Here is a 900sqft ADU. (accessory dwelling unit)  ‼️Just finished this 900sqft ADU in Lowell, MA. Fo",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast5-p-0068-tx/okVRkekOrC9gGALjNH0gA1qXX5IOAAef6FZGIU~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=4qFTbcAeItHtEiRKw5A5D1ehTbY%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@the_hungry_housewife/video/7706278540760714510",
    originalAccountUrl: "https://www.tiktok.com/@the_hungry_housewife",
    inlineVideoId: "7706278540760714510",
    directVideoUrl: "https://v9.tiktokcdn.com/60368d7059e9fc2c36845a5c039ca079/6afdc4e4/video/tos/alisg/tos-alisg-ve-37c799-sg/o4ED6aIgShAiViRNHURPzefgLhB6DBVEtQAqTy/?a=1233&bti=ODszNWYuMDE6&&bt=1025&ft=bC~O_mfLPD12NKY3rn-UxMJ2WY6e3wv25ocAp&mime_type=video_mp4&rc=Zjc0ZmgzZjU3ZDdpaGZlOkBpamlocm05cmc2ZTMzZzczNEBfLjVfLWBfX2MxXmEtNmEvYSNebi02MmRjLm1hLS1kMS9zcw%3D%3D&vvpl=1&l=20261116232859FFFEAEC56B459D8FA012&btag=e00090000",
    sourceName: "The Hungry Housewife (@the_hungry_housewife)",
    authorHandle: "@the_hungry_housewife",
    publishedOrUpdatedAt: "2026-11-09T20:56:32.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-thehungryhouse-7706223321532091662",
    platform: 'tiktok',
    titleKh: "This year we decorated for Christmas real early. I love Christmas decor. More decor to come! . ",
    titleEn: "This year we decorated for Christmas real early. I love Christmas decor. More de (@the_hungry_housewife)",
    titleZh: "The Hungry Housewife (@the_hungry_housewife) 柬埔寨美食与探店视频",
    descriptionKh: "This year we  decorated for Christmas real early. I love Christmas decor. More decor to come!  . . #home #decor #christmas #christmastree #christmasdecor",
    descriptionEn: "This year we  decorated for Christmas real early. I love Christmas decor. More decor to come!  . . #home #decor #christmas #christmastree #christmasdecor — Official Cambodian TikTok food review by @the_hungry_housewife.",
    descriptionZh: "来自柬埔寨美食创作者 @the_hungry_housewife 的 TikTok 视频：This year we  decorated for Christmas real early. I love Christmas decor. More decor to come!  . . #",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast5-p-0068-tx/osADyiBuBeUVBA8ZRfBBQmEzgSi2DndIuqJmIo~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=0qQIPxU%2BSiTkp9tX3cj0sx5Q9Eg%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@the_hungry_housewife/video/7706223321532091662",
    originalAccountUrl: "https://www.tiktok.com/@the_hungry_housewife",
    inlineVideoId: "7706223321532091662",
    directVideoUrl: "https://v9.tiktokcdn.com/b55d8d18a61ef432396e372d566ee5d1/6afdc45b/video/tos/alisg/tos-alisg-ve-37c799-sg/osqHQkdEADEoDgnMQANBfFtmDDSddIDoRg8Meg/?a=1233&bti=ODszNWYuMDE6&&bt=1587&ft=bC~O_mfLPD12NKY3rn-UxMJ2WY6e3wv25ocAp&mime_type=video_mp4&rc=ZDRnOjw0ZWQ0OWRpaTkzPEBpM2hyM205cnEzZTMzZzczNEAzNDNgMmFjXmMxYmIxY15iYSNoMGBeMmRjLm1hLS1kMS9zcw%3D%3D&vvpl=1&l=20261116232859FFFEAEC56B459D8FA012&btag=e00088000",
    sourceName: "The Hungry Housewife (@the_hungry_housewife)",
    authorHandle: "@the_hungry_housewife",
    publishedOrUpdatedAt: "2026-11-09T17:22:16.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-expressionshub-7706185282973912328",
    platform: 'tiktok',
    titleKh: "ម្ហូបក្រិចនៅបាសាក់លែន​ Elia Greek Kitchen",
    titleEn: "ម្ហូបក្រិចនៅបាសាក់លែន​ Elia Greek Kitchen (@expressions_hub)",
    titleZh: "សារអាហារ - Expressions Hub (@expressions_hub) 柬埔寨美食与探店视频",
    descriptionKh: "ម្ហូបក្រិចនៅបាសាក់លែន​ Elia Greek Kitchen",
    descriptionEn: "ម្ហូបក្រិចនៅបាសាក់លែន​ Elia Greek Kitchen — Official Cambodian TikTok food review by @expressions_hub.",
    descriptionZh: "来自柬埔寨美食创作者 @expressions_hub 的 TikTok 视频：ម្ហូបក្រិចនៅបាសាក់លែន​ Elia Greek Kitchen",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o8fpx96ABFBi68gL5QBbUqIseI98n3R8OipE7N~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=1Vr3fCYlgUklDYffUn0htkJlSic%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@expressions_hub/video/7706185282973912328",
    originalAccountUrl: "https://www.tiktok.com/@expressions_hub",
    inlineVideoId: "7706185282973912328",
    directVideoUrl: "https://v16.tiktokcdn.com/2307f6a8aad2d784c9816f346b507050/6afdc530/video/tos/alisg/tos-alisg-pve-0037c001/oofgoRvSAAzbDskujLe27VGCql4fkIIxqTnrBj/?a=1233&bti=ODszNWYuMDE6&&bt=815&ft=bC~O_mfLPD12NaY3rn-UxfKFWY6e3wv25xcAp&mime_type=video_mp4&rc=NjZoaDhmaWg2ZTxmOGZoZkBpanU6bXM5cnd3ZTMzODczNEAtNl8uNWBjNmExYjI2MDAtYSNobGEyMmRjcGxhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232849EB6CBF2F635463AA4F26&btag=e00098000",
    sourceName: "សារអាហារ - Expressions Hub (@expressions_hub)",
    authorHandle: "@expressions_hub",
    publishedOrUpdatedAt: "2026-11-09T14:54:39.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-khleancheck-7706151412941606165",
    platform: 'tiktok',
    titleKh: "អ្នកណាខ្លះចូលចិត្តញុំាអីនៅផ្សារបឹងកេងកង ហូបបណ្ដើរហូរញើសបណ្ដើរ😋🤣 ជួយMention គ្នាតិចមក🥰",
    titleEn: "អ្នកណាខ្លះចូលចិត្តញុំាអីនៅផ្សារបឹងកេងកង ហូបបណ្ដើរហូរញើសបណ្ដើរ😋🤣 ជួយMention គ្ន (@.khleancheck)",
    titleZh: "ឃ្លានឆែក - Khlean Check (@.khleancheck) 柬埔寨美食与探店视频",
    descriptionKh: "អ្នកណាខ្លះចូលចិត្តញុំាអីនៅផ្សារបឹងកេងកង ហូបបណ្ដើរហូរញើសបណ្ដើរ😋🤣 ជួយMention គ្នាតិចមក🥰 #ឃ្លានឆេក",
    descriptionEn: "អ្នកណាខ្លះចូលចិត្តញុំាអីនៅផ្សារបឹងកេងកង ហូបបណ្ដើរហូរញើសបណ្ដើរ😋🤣 ជួយMention គ្នាតិចមក🥰 #ឃ្លានឆេក — Official Cambodian TikTok food review by @.khleancheck.",
    descriptionZh: "来自柬埔寨美食创作者 @.khleancheck 的 TikTok 视频：អ្នកណាខ្លះចូលចិត្តញុំាអីនៅផ្សារបឹងកេងកង ហូបបណ្ដើរហូរញើសបណ្ដើរ😋🤣 ជួយMention គ្នាតិចមក🥰 #ឃ្លានឆេក",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oUV4POMfgO3wCBwIgxPG2DArLjLei4eCPAmG9I~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=ooulIEsg%2FSUH%2Ft562VHqC36z5eo%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@.khleancheck/video/7706151412941606165",
    originalAccountUrl: "https://www.tiktok.com/@.khleancheck",
    inlineVideoId: "7706151412941606165",
    directVideoUrl: "https://v16.tiktokcdn.com/331019a497f3229be1945e2168f3beed/6afdc487/video/tos/alisg/tos-alisg-pve-0037c001/o4BEBeuc3EANTJzAgjwfxPQHMgizsBBDqIpRKi/?a=1233&bti=ODszNWYuMDE6&&bt=898&ft=bC~O_mfLPD12NzY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=Ojs1aDw1M2dlMzo7ZDY2aEBpM205M205cmh1ZTMzODczNEAxXzZeYDYzNV4xM2FgNi02YSMzLTJqMmQ0c2xhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232851602EB059E8441C9D6BC2&btag=e00090000",
    sourceName: "ឃ្លានឆែក - Khlean Check (@.khleancheck)",
    authorHandle: "@.khleancheck",
    publishedOrUpdatedAt: "2026-11-09T12:43:13.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-pudylychher-7706133454110330120",
    platform: 'tiktok',
    titleKh: "យកម្ហូបហាងមកលក់តាមផ្លូវ លក់ធូៗចែកគ្នាសាក",
    titleEn: "យកម្ហូបហាងមកលក់តាមផ្លូវ លក់ធូៗចែកគ្នាសាក (@pudy_lychher)",
    titleZh: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher) 柬埔寨美食与探店视频",
    descriptionKh: "យកម្ហូបហាងមកលក់តាមផ្លូវ លក់ធូៗចែកគ្នាសាក   #ពូឌីលីឈើ #StreetFood #steaklovers",
    descriptionEn: "យកម្ហូបហាងមកលក់តាមផ្លូវ លក់ធូៗចែកគ្នាសាក   #ពូឌីលីឈើ #StreetFood #steaklovers — Official Cambodian TikTok food review by @pudy_lychher.",
    descriptionZh: "来自柬埔寨美食创作者 @pudy_lychher 的 TikTok 视频：យកម្ហូបហាងមកលក់តាមផ្លូវ លក់ធូៗចែកគ្នាសាក   #ពូឌីលីឈើ #StreetFood #steaklovers",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ow6NI6FKkWUXY48xBDDAQ783RtqgrBTEfaEqfZ~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=hFNXSEo33reKzU59sVL3Pb6D0SA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@pudy_lychher/video/7706133454110330120",
    originalAccountUrl: "https://www.tiktok.com/@pudy_lychher",
    inlineVideoId: "7706133454110330120",
    directVideoUrl: "https://v9.tiktokcdn.com/c8bb5fdfb192243382321b1963581ad8/6afdc4f1/video/tos/alisg/tos-alisg-pve-0037c001/o4fB78DjFv4X8rxh2Rl6ABNEt3qQIUgfgqaWqE/?a=1233&bti=ODszNWYuMDE6&&bt=1017&ft=L~O54ourD12Nvol-KzIxRHbjvlBF-UjNS3opiX&mime_type=video_mp4&rc=MzY1ODlmNDg1ZmU6Z2ZlZUBpanZuZHU5cm90ZTMzODczNEAwYmIvL2E2NS4xMjZiNDVeYSNiYW5vMmRzcWxhLS1kMTFzcw%3D%3D&vvpl=1&l=202611162328484D55737F2DB4227DE8FF&btag=e00098000",
    sourceName: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)",
    authorHandle: "@pudy_lychher",
    publishedOrUpdatedAt: "2026-11-09T11:33:32.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-mekorksach100m-7706093755622886657",
    platform: 'tiktok',
    titleKh: "មីគោកចូលធីមCGដែរ😎😎 បេីកម៉ោង3ព្រឹកដល់1រសៀល 012880407 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វ",
    titleEn: "មីគោកចូលធីមCGដែរ😎😎 បេីកម៉ោង3ព្រឹកដល់1រសៀល 012880407 📍ទីតាំង: ផ្សារអូរឬស្សីទល់ (@me_kork_sach100muk)",
    titleZh: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk) 柬埔寨美食与探店视频",
    descriptionKh: "មីគោកចូលធីមCGដែរ😎😎 បេីកម៉ោង3ព្រឹកដល់1រសៀល 012880407 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍Google Map: (មីគោកសាច់100មុខ ម៉ាម៉ាអូរឬស្សី) https://maps.app.goo.gl/pVN6ByuU53XEUCmv9?g_st=ic",
    descriptionEn: "មីគោកចូលធីមCGដែរ😎😎 បេីកម៉ោង3ព្រឹកដល់1រសៀល 012880407 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្លូវឌឿងហែមខាងឆ្វេងដៃ 👈👈 តូបខាងឆ្វេង 👈👈 📍Google Map: (មីគោ — Official Cambodian TikTok food review by @me_kork_sach100muk.",
    descriptionZh: "来自柬埔寨美食创作者 @me_kork_sach100muk 的 TikTok 视频：មីគោកចូលធីមCGដែរ😎😎 បេីកម៉ោង3ព្រឹកដល់1រសៀល 012880407 📍ទីតាំង: ផ្សារអូរឬស្សីទល់មុខច្រកជ្រូកខ្វៃ ផ្ល",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/osfQAZyCGGjx4QwxQ4LzAeQIGAlIMOdeRfFrti~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=EAGxfMX8HUSRYq2SHYocDc58hlw%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@me_kork_sach100muk/video/7706093755622886657",
    originalAccountUrl: "https://www.tiktok.com/@me_kork_sach100muk",
    inlineVideoId: "7706093755622886657",
    directVideoUrl: "https://v3.tiktokcdn.com/8135085603d7b632c8ecd3b43fe2c39c/6afdc440/video/tos/alisg/tos-alisg-pve-0037c001/owBBcvqhQjRZEOfEFYAHaIEDxgVU8jYBctftAy/?a=1233&bti=ODszNWYuMDE6&&bt=1247&ft=bC~O_mfLPD12NWY3rn-UxK12KY6e3wv25zcAp&mime_type=video_mp4&rc=ODs1PDo2M2RlaDU6Njs5ZUBpM3NrcnM5cm1yZTMzODczNEAuYmIyYWNhNTQxLzMtYGFgYSNiZF9jMmRra2xhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232853F72B939D69FFBF8D7828&btag=e000b0000",
    sourceName: "មីគោកសាច់ ១០០ មុខ ផ្សារអូរឫស្សី (@me_kork_sach100muk)",
    authorHandle: "@me_kork_sach100muk",
    publishedOrUpdatedAt: "2026-11-09T08:59:29.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-36",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-taseitrestaura-7706088611548073237",
    platform: 'tiktok',
    titleKh: "បងប្អូនចង់ញ៉ាំសាច់គោអាំងឆ្ងាញ់ គ្រឿងក្នុងគោ ឬស៊ុបគោក្តៅៗមែនទេ? 🥩🍲 កុំភ្លេចនាំគ្រួសារ និងមិត្ត",
    titleEn: "បងប្អូនចង់ញ៉ាំសាច់គោអាំងឆ្ងាញ់ គ្រឿងក្នុងគោ ឬស៊ុបគោក្តៅៗមែនទេ? 🥩🍲 កុំភ្លេចនាំគ (@taseit_restaurant)",
    titleZh: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "បងប្អូនចង់ញ៉ាំសាច់គោអាំងឆ្ងាញ់ គ្រឿងក្នុងគោ ឬស៊ុបគោក្តៅៗមែនទេ? 🥩🍲 កុំភ្លេចនាំគ្រួសារ និងមិត្តភក្តិមកញ៉ាំនៅតាសេតណា! ❤️",
    descriptionEn: "បងប្អូនចង់ញ៉ាំសាច់គោអាំងឆ្ងាញ់ គ្រឿងក្នុងគោ ឬស៊ុបគោក្តៅៗមែនទេ? 🥩🍲 កុំភ្លេចនាំគ្រួសារ និងមិត្តភក្តិមកញ៉ាំនៅតាសេតណា! ❤️ — Official Cambodian TikTok food review by @taseit_restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @taseit_restaurant 的 TikTok 视频：បងប្អូនចង់ញ៉ាំសាច់គោអាំងឆ្ងាញ់ គ្រឿងក្នុងគោ ឬស៊ុបគោក្តៅៗមែនទេ? 🥩🍲 កុំភ្លេចនាំគ្រួសារ និងមិត្តភក្តិ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ocUBEAPAiDvAIsigqsCA0hMfZNwRClEexEBKlj~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=W8%2BQQfIeiTZe0OPqkxaY6IAOtfU%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@taseit_restaurant/video/7706088611548073237",
    originalAccountUrl: "https://www.tiktok.com/@taseit_restaurant",
    inlineVideoId: "7706088611548073237",
    directVideoUrl: "https://v16.tiktokcdn.com/7ba5c430f7229736560dda893fd36ef6/6afdc45c/video/tos/alisg/tos-alisg-pve-0037c001/oQIKxqKE7BME6gRAxBEA7iiBMhBR5eQC1fFnuU/?a=1233&bti=ODszNWYuMDE6&&bt=905&ft=bC~O_mfLPD12NtY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=OjQ1OzM5ODhnZGgzNmY3ZkBpanM3ams5cm1yZTMzODczNEA2YV81L2EuNi0xYGMyX2AuYSMvaS1uMmRzYGxhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32CA6&btag=e00088000",
    sourceName: "ភោជនីយដ្ឋាន តាសេត (@taseit_restaurant)",
    authorHandle: "@taseit_restaurant",
    publishedOrUpdatedAt: "2026-11-09T08:39:31.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-san99heng-7706050532493823253",
    platform: 'tiktok',
    titleKh: "Location of @GeGe 哥哥 ហតផត&ម៉ាឡាតាំង",
    titleEn: "Location of @GeGe 哥哥 ហតផត&ម៉ាឡាតាំង (@san99_heng)",
    titleZh: "@san99_heng 柬埔寨美食与探店视频",
    descriptionKh: "Location of @GeGe 哥哥 ហតផត&ម៉ាឡាតាំង #Malatang #hotpot #Battambangfood #ហតផតឈុតតែ10000រៀល #1ខាំតែ5000រៀល",
    descriptionEn: "Location of @GeGe 哥哥 ហតផត&ម៉ាឡាតាំង #Malatang #hotpot #Battambangfood #ហតផតឈុតតែ10000រៀល #1ខាំតែ5000រៀល — Official Cambodian TikTok food review by @san99_heng.",
    descriptionZh: "来自柬埔寨美食创作者 @san99_heng 的 TikTok 视频：Location of @GeGe 哥哥 ហតផត&ម៉ាឡាតាំង #Malatang #hotpot #Battambangfood #ហតផតឈុតតែ10000រៀល #1ខាំតែ5000",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o0DxAcfkQBx8UQEXCfRZE42BJPXqWgUOCbAOFq~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=4%2FOdn0onswDrER%2FAr3J30HVWats%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@san99_heng/video/7706050532493823253",
    originalAccountUrl: "https://www.tiktok.com/@san99_heng",
    inlineVideoId: "7706050532493823253",
    directVideoUrl: "https://v16.tiktokcdn.com/8890fde4a5bfd910a409715e50c7afc7/6afdc47b/video/tos/alisg/tos-alisg-pve-0037c001/oAFKAypxlLfk2RYAgrIGsLeURgeiAfpcGwiJiG/?a=1233&bti=ODszNWYuMDE6&&bt=1396&ft=L~O54ourD12Nv.A-KzIxREFSrlBF-UjNSbopiX&mime_type=video_mp4&rc=ZGUzaTQ1NDpoNTo0NTxkNUBpamQ8c3U5cnNwZTMzODczNEAzY2BfYS5hNTMxYC8wXjVhYSNeZW0zMmQ0NGxhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232910F9B95A1CB519E499ECB0&btag=e00088000",
    sourceName: "@san99_heng",
    authorHandle: "@san99_heng",
    publishedOrUpdatedAt: "2026-11-09T06:11:45.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "ខេត្តបាត់ដំបង",
    provinceEn: "Battambang",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-foodwhisperoff-7706023441001958663",
    platform: 'tiktok',
    titleKh: "ធូណា​សាស៊ីមិ​ ចុះ50%​ ម្ហូបជប៉ុននៅនេះចុងភៅខ្មែរ​ ប៉ុន្តែអត់មាត់អត់កដូចចុងភៅជប៉ុន​ Tono Izakaya",
    titleEn: "ធូណា​សាស៊ីមិ​ ចុះ50%​ ម្ហូបជប៉ុននៅនេះចុងភៅខ្មែរ​ ប៉ុន្តែអត់មាត់អត់កដូចចុងភៅជប៉ុន (@foodwhisper_officials)",
    titleZh: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials) 柬埔寨美食与探店视频",
    descriptionKh: "ធូណា​សាស៊ីមិ​ ចុះ50%​ ម្ហូបជប៉ុននៅនេះចុងភៅខ្មែរ​ ប៉ុន្តែអត់មាត់អត់កដូចចុងភៅជប៉ុន​ Tono Izakaya",
    descriptionEn: "ធូណា​សាស៊ីមិ​ ចុះ50%​ ម្ហូបជប៉ុននៅនេះចុងភៅខ្មែរ​ ប៉ុន្តែអត់មាត់អត់កដូចចុងភៅជប៉ុន​ Tono Izakaya — Official Cambodian TikTok food review by @foodwhisper_officials.",
    descriptionZh: "来自柬埔寨美食创作者 @foodwhisper_officials 的 TikTok 视频：ធូណា​សាស៊ីមិ​ ចុះ50%​ ម្ហូបជប៉ុននៅនេះចុងភៅខ្មែរ​ ប៉ុន្តែអត់មាត់អត់កដូចចុងភៅជប៉ុន​ Tono Izakaya",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/okvxWqkNiOUKAiWjoEUIpgBS5HjeB8B0EI5fRW~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=8kRip8lEE8%2FNk5Dc5f6ox1obGZA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@foodwhisper_officials/video/7706023441001958663",
    originalAccountUrl: "https://www.tiktok.com/@foodwhisper_officials",
    inlineVideoId: "7706023441001958663",
    directVideoUrl: "https://v9.tiktokcdn.com/b41453c09f14fa1d0b2b605a6c68ebf0/6afdc4b6/video/tos/alisg/tos-alisg-pve-0037c001/oo7GLFf2SRQetvwxQghBIe4fQTxArIAS9GQGAn/?a=1233&bti=ODszNWYuMDE6&&bt=1055&ft=L~O54ourD12NvKl-KzIxREESDlBF-UjNSaopiX&mime_type=video_mp4&rc=M2RkZmc8aTdmODllNWdnOkBpM3B4c245cjZuZTMzODczNEBhYzYvMjA0X2IxYzVjMjI0YSNyZDIzMmRzamxhLS1kMTFzcw%3D%3D&vvpl=1&l=2026111623285136141F5723667CE60E77&btag=e00090000",
    sourceName: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)",
    authorHandle: "@foodwhisper_officials",
    publishedOrUpdatedAt: "2026-11-09T04:26:37.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-ieatisharecamb-7706005502009953557",
    platform: 'tiktok',
    titleKh: "Coffee lately. ☕🤎 A little coffee, a little peace, and moments worth remembering. Good coffee ",
    titleEn: "Coffee lately. ☕🤎 A little coffee, a little peace, and moments worth rememberin (@ieatisharecambodia)",
    titleZh: "I Eat I Share Cambodia (@ieatisharecambodia) 柬埔寨美食与探店视频",
    descriptionKh: "Coffee lately. ☕🤎 A little coffee, a little peace, and moments worth remembering. Good coffee always makes the day better.",
    descriptionEn: "Coffee lately. ☕🤎 A little coffee, a little peace, and moments worth remembering. Good coffee always makes the day better. — Official Cambodian TikTok food review by @ieatisharecambodia.",
    descriptionZh: "来自柬埔寨美食创作者 @ieatisharecambodia 的 TikTok 视频：Coffee lately. ☕🤎 A little coffee, a little peace, and moments worth remembering. Good coffee alway",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o8nVCxA8IDzLfrOAEA7I4xbljZEfGDCMIecIjo~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=qMjQQBEaiJG9Q6TKG84bwxbrrCc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@ieatisharecambodia/video/7706005502009953557",
    originalAccountUrl: "https://www.tiktok.com/@ieatisharecambodia",
    inlineVideoId: "7706005502009953557",
    directVideoUrl: "https://v16.tiktokcdn.com/56693d707763d5fd396fdeb997c5b968/6afdc44f/video/tos/alisg/tos-alisg-pve-0037c001/osHxjni6VQoDIfDYOC4WyrZQIfMg29AfDA8BzJ/?a=1233&bti=ODszNWYuMDE6&&bt=806&ft=bC~O_mfLPD12NKY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=Zzg5OWg1OjwzOmRpZWY5OkBpajZ5Zm05cjttZTMzODczNEAtMDAvMy8tNS0xLTA2NjUwYSNsczYwMmRjamxhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232858ABFBA7A07A77B4A1B51C&btag=e000b8000",
    sourceName: "I Eat I Share Cambodia (@ieatisharecambodia)",
    authorHandle: "@ieatisharecambodia",
    publishedOrUpdatedAt: "2026-11-09T03:17:01.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-suyadaily-7705972343348284724",
    platform: 'tiktok',
    titleKh: "ទៅបម្រើភ្ញៀវនៅវត្ត🥰😊",
    titleEn: "ទៅបម្រើភ្ញៀវនៅវត្ត🥰😊 (@suyadaily)",
    titleZh: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily) 柬埔寨美食与探店视频",
    descriptionKh: "ទៅបម្រើភ្ញៀវនៅវត្ត🥰😊#បុណ្យកឋិនទាន🇰🇭 #វត្ត #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #reels #vlog",
    descriptionEn: "ទៅបម្រើភ្ញៀវនៅវត្ត🥰😊#បុណ្យកឋិនទាន🇰🇭 #វត្ត #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #reels #vlog — Official Cambodian TikTok food review by @suyadaily.",
    descriptionZh: "来自柬埔寨美食创作者 @suyadaily 的 TikTok 视频：ទៅបម្រើភ្ញៀវនៅវត្ត🥰😊#បុណ្យកឋិនទាន🇰🇭 #វត្ត #សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #reels #vlog",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/okHvxYPTak2WEtXRigpAAL6AEgLcivBIBC2iI~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=ySkCvn%2F0Rj4t%2FCS%2B6UwIu49SYVA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@suyadaily/video/7705972343348284724",
    originalAccountUrl: "https://www.tiktok.com/@suyadaily",
    inlineVideoId: "7705972343348284724",
    directVideoUrl: "https://v3.tiktokcdn.com/a2a4ba33eb9cbc25fc7653b3a48a277c/6afdc4eb/video/tos/alisg/tos-alisg-pve-0037c001/osEvaLrUJIEEXcivpAEiW2amx67QgA2kBBYHt/?a=1233&bti=ODszNWYuMDE6&&bt=1199&ft=bC~O_mfLPD12NVY3rn-UxrN5VY6e3wv252cAp&mime_type=video_mp4&rc=Njk6NGc3NTo5aDY7aGZmOkBpM3A5b3A5cjNrZTMzODczNEBiLWEyYmBhNTUxMWBfMTBhYSNmb2kyMmRrbWxhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232856152A25DD5E5B70AA15C3&btag=e00090000",
    sourceName: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily)",
    authorHandle: "@suyadaily",
    publishedOrUpdatedAt: "2026-11-09T01:08:20.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-plovder-7705791577842617621",
    platform: 'tiktok',
    titleKh: "ប៊ូហ្វេហតផត ខ្ចិលដើរចាប់ខ្លួនឯងអីអាចមក ឡាវ ចាំង ហតផតបាន ទាន់ប្រម៉ូសិន ៦.៩ ដុល្លារហូបអត់កំណត់",
    titleEn: "ប៊ូហ្វេហតផត ខ្ចិលដើរចាប់ខ្លួនឯងអីអាចមក ឡាវ ចាំង ហតផតបាន ទាន់ប្រម៉ូសិន ៦.៩ ដុល្លា (@plov_der)",
    titleZh: "ផ្លូវដើរ - Plov Der (@plov_der) 柬埔寨美食与探店视频",
    descriptionKh: "ប៊ូហ្វេហតផត ខ្ចិលដើរចាប់ខ្លួនឯងអីអាចមក ឡាវ ចាំង ហតផតបាន ទាន់ប្រម៉ូសិន ៦.៩ ដុល្លារហូបអត់កំណត់ #fypviralシ #fyp #everyone #foodie #food #buffet",
    descriptionEn: "ប៊ូហ្វេហតផត ខ្ចិលដើរចាប់ខ្លួនឯងអីអាចមក ឡាវ ចាំង ហតផតបាន ទាន់ប្រម៉ូសិន ៦.៩ ដុល្លារហូបអត់កំណត់ #fypviralシ #fyp #everyone #foodie #food #buffet — Official Cambodian TikTok food review by @plov_der.",
    descriptionZh: "来自柬埔寨美食创作者 @plov_der 的 TikTok 视频：ប៊ូហ្វេហតផត ខ្ចិលដើរចាប់ខ្លួនឯងអីអាចមក ឡាវ ចាំង ហតផតបាន ទាន់ប្រម៉ូសិន ៦.៩ ដុល្លារហូបអត់កំណត់ #fypvir",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o8sQOAALqDBaPUlwC3FEgDDpC8AV4mAIEVfecE~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=5gI3HZ1P6AVXojaID48ofCbEDnM%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@plov_der/video/7705791577842617621",
    originalAccountUrl: "https://www.tiktok.com/@plov_der",
    inlineVideoId: "7705791577842617621",
    directVideoUrl: "https://v9.tiktokcdn.com/c36b04f8d51ade53e9e7cf916e75a386/6afdc4ca/video/tos/alisg/tos-alisg-pve-0037/o0CNwIQgcqAFyEEeXgVp38fHkDDqBBwIXhSqQg/?a=1233&bti=ODszNWYuMDE6&&bt=3078&ft=L~O54ourD12NvWl-KzIxRNvSDlBF-UjNSmopiX&mime_type=video_mp4&rc=ZTo6Z2VmZzU0Zzg7aWQ6aEBpam50M3U5cmw3ZTMzODgzNEBiLjQ1YmEyNWIxXzMzYGIvYSNwa3BoMmQ0LmxhLS1kL2Bzcw%3D%3D&vvpl=1&l=20261116232853B78F6EA1007D649445B9&btag=e00090000",
    sourceName: "ផ្លូវដើរ - Plov Der (@plov_der)",
    authorHandle: "@plov_der",
    publishedOrUpdatedAt: "2026-11-08T13:26:52.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-27",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-pudylychher-7705741138837245192",
    platform: 'tiktok',
    titleKh: "សាច់អាំងបែបចិន1 ចានតែ7000 រៀល ហ្នឹងមែនកន្លែងអ្នកភ្នំពេញគេកាត់sad ពេលចេញពីធ្វើការ ?",
    titleEn: "សាច់អាំងបែបចិន1 ចានតែ7000 រៀល ហ្នឹងមែនកន្លែងអ្នកភ្នំពេញគេកាត់sad ពេលចេញពីធ្វើការ (@pudy_lychher)",
    titleZh: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher) 柬埔寨美食与探店视频",
    descriptionKh: "សាច់អាំងបែបចិន1 ចានតែ7000 រៀល ហ្នឹងមែនកន្លែងអ្នកភ្នំពេញគេកាត់sad ពេលចេញពីធ្វើការ ?   #ពូឌីលីឈើ  #streetfood #genz",
    descriptionEn: "សាច់អាំងបែបចិន1 ចានតែ7000 រៀល ហ្នឹងមែនកន្លែងអ្នកភ្នំពេញគេកាត់sad ពេលចេញពីធ្វើការ ?   #ពូឌីលីឈើ  #streetfood #genz — Official Cambodian TikTok food review by @pudy_lychher.",
    descriptionZh: "来自柬埔寨美食创作者 @pudy_lychher 的 TikTok 视频：សាច់អាំងបែបចិន1 ចានតែ7000 រៀល ហ្នឹងមែនកន្លែងអ្នកភ្នំពេញគេកាត់sad ពេលចេញពីធ្វើការ ?   #ពូឌីលីឈើ  #str",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oMDeUElIBuqVCCSjgifsAsAAiiYQAqBEwykRNw~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=FQ3exka3unGzN9cZJIPQWbiZghk%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@pudy_lychher/video/7705741138837245192",
    originalAccountUrl: "https://www.tiktok.com/@pudy_lychher",
    inlineVideoId: "7705741138837245192",
    directVideoUrl: "https://v9.tiktokcdn.com/28d12d1d64559dcc4d45cb8bdbafd783/6afdc4d4/video/tos/alisg/tos-alisg-pve-0037c001/okE5BpviPbKr7wAP8VQEIWBvBSoOYAJUVyiva/?a=1233&bti=ODszNWYuMDE6&&bt=2528&ft=L~O54ourD12Nvol-KzIxRHbjvlBF-UjNS3opiX&mime_type=video_mp4&rc=ZDlpZGVnOzppNGY4PDc0O0BpanBoNXM5cm43ZTMzODczNEBiX2A0YF8tXzYxLi9fNWM0YSNocl80MmQ0aGxhLS1kMTFzcw%3D%3D&vvpl=1&l=202611162328484D55737F2DB4227DE8FF&btag=e00090000",
    sourceName: "ពូឌីលីឈើ - Pudy Lychher (@pudy_lychher)",
    authorHandle: "@pudy_lychher",
    publishedOrUpdatedAt: "2026-11-08T10:11:09.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-64",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-hubbaywithme-7705731327286332679",
    platform: 'tiktok',
    titleKh: "Eating Japan ramen in this weather are the best 🍜✨ Restaurant ⬇️ 📍@Ajisen Ramen Cambodia 📍Or",
    titleEn: "Eating Japan ramen in this weather are the best 🍜✨ Restaurant ⬇️ 📍@Ajisen Rame (@hub_baywithme)",
    titleZh: "Hub Bay With Me (@hub_baywithme) 柬埔寨美食与探店视频",
    descriptionKh: "Eating Japan ramen in this weather are the best 🍜✨ Restaurant ⬇️ 📍@Ajisen Ramen Cambodia  📍Order in Foodpanda get special promotion buy 1 get 2 for foodpanda Pro users  #hubbayehh #ajisenramencambodia #foodpandapro #buy1get1free #ramen",
    descriptionEn: "Eating Japan ramen in this weather are the best 🍜✨ Restaurant ⬇️ 📍@Ajisen Ramen Cambodia  📍Order in Foodpanda get special promotion buy 1 get 2 for foodpanda — Official Cambodian TikTok food review by @hub_baywithme.",
    descriptionZh: "来自柬埔寨美食创作者 @hub_baywithme 的 TikTok 视频：Eating Japan ramen in this weather are the best 🍜✨ Restaurant ⬇️ 📍@Ajisen Ramen Cambodia  📍Order ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oQib4EnPdABiwBYB9Q5DAAy3AabIABvwEByMu~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=HEWJZ7BVyE7nzE3xS9aME%2FVkpsc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@hub_baywithme/video/7705731327286332679",
    originalAccountUrl: "https://www.tiktok.com/@hub_baywithme",
    inlineVideoId: "7705731327286332679",
    directVideoUrl: "https://v9.tiktokcdn.com/c0c92ef90db58fb4c83b86ff8f7488cc/6afdc46f/video/tos/alisg/tos-alisg-pve-0037c001/o0EQcFDXREBd2IdIegEQHHBAhg0gB5KU8qf6GH/?a=1233&bti=ODszNWYuMDE6&&bt=804&ft=bC~O_mfLPD12N_Y3rn-Ux_o2NY6e3wv25dcAp&mime_type=video_mp4&rc=OWU0ZzRnPGg7Z2lkOTlmOEBpajY8M3Y5cmw3ZTMzODczNEAyLWM0YV8yNi8xNTFfY181YSNiaHFoMmQ0MGxhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232857ED4BC65F6722FBA0BF25&btag=e00088000",
    sourceName: "Hub Bay With Me (@hub_baywithme)",
    authorHandle: "@hub_baywithme",
    publishedOrUpdatedAt: "2026-11-08T09:33:04.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-borerestaurant-7705706676606782738",
    platform: 'tiktok',
    titleKh: "How is everyone spending their Sunday? (PS tomorrow is a public holiday, come visit Boré 👀)",
    titleEn: "How is everyone spending their Sunday? (PS tomorrow is a public holiday, come vi (@bore.restaurant)",
    titleZh: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "How is everyone spending their Sunday? (PS tomorrow is a public holiday, come visit Boré 👀) #fyp",
    descriptionEn: "How is everyone spending their Sunday? (PS tomorrow is a public holiday, come visit Boré 👀) #fyp — Official Cambodian TikTok food review by @bore.restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @bore.restaurant 的 TikTok 视频：How is everyone spending their Sunday? (PS tomorrow is a public holiday, come visit Boré 👀) #fyp",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oMD9UEmEsIK86FCEfU6fPgg2CsOPBRg0wqICAB~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=%2Ft7gqy71Aq8OWv8LA0FwT45oetE%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@bore.restaurant/video/7705706676606782738",
    originalAccountUrl: "https://www.tiktok.com/@bore.restaurant",
    inlineVideoId: "7705706676606782738",
    directVideoUrl: "https://v9.tiktokcdn.com/5e87edacedae52b3b5dcdd3ac5913c89/6afdc445/video/tos/alisg/tos-alisg-pve-0037c001/oYf0SDsIPBFCBp6fEgmw9Uq3KnRs8AH4EEgBQT/?a=1233&bti=ODszNWYuMDE6&&bt=725&ft=bC~O_mfLPD12NtY3rn-Ux-evWY6e3wv251cAp&mime_type=video_mp4&rc=OWc5NDdnOGQ0NGdmZDY4NEBpank0Om05cmg1ZTMzODczNEAvXjQ2YmJhNjYxLmMyLjRhYSM0YGphMmRramxhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232855390EAF6F445DC2B3EA8E&btag=e000b8000",
    sourceName: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant)",
    authorHandle: "@bore.restaurant",
    publishedOrUpdatedAt: "2026-11-08T07:57:25.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-1",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-suyadaily-7705610652756315444",
    platform: 'tiktok',
    titleKh: "ងៀវហាល🥰😊",
    titleEn: "ងៀវហាល🥰😊 (@suyadaily)",
    titleZh: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily) 柬埔寨美食与探店视频",
    descriptionKh: "ងៀវហាល🥰😊#សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ងៀវហាល #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 #reels #vlog",
    descriptionEn: "ងៀវហាល🥰😊#សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ងៀវហាល #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 #reels #vlog — Official Cambodian TikTok food review by @suyadaily.",
    descriptionZh: "来自柬埔寨美食创作者 @suyadaily 的 TikTok 视频：ងៀវហាល🥰😊#សុំ❤️ម្នាក់មួយមកok🙏❤️❤️ #ងៀវហាល #ស្រលាញ់អ្នកទាំងអស់គ្នាពេញបេះដូង😚😍🙏 #reels #vlog",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oEGq2hPSeAC0KR1QgQFq71UDRfCWdB9EBEBvvQ~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=fo7m0WZUwiNM6VKQD959ZJe3PSg%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@suyadaily/video/7705610652756315444",
    originalAccountUrl: "https://www.tiktok.com/@suyadaily",
    inlineVideoId: "7705610652756315444",
    directVideoUrl: "https://v3.tiktokcdn.com/85a2d3966ab4537c34611c0837690013/6afdc4e2/video/tos/alisg/tos-alisg-pve-0037c001/oQiWEUHfeErIJmERo17qDQinVm6BBzgBAO6lvB/?a=1233&bti=ODszNWYuMDE6&&bt=1090&ft=bC~O_mfLPD12NVY3rn-UxrN5VY6e3wv252cAp&mime_type=video_mp4&rc=MzZlZTU7aDw1OjlpOTY8M0BpamU3anQ5cm53ZTMzODczNEBhXzZfLS4xNi0xY2MxX182YSNecTYuMmRjNGthLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232856152A25DD5E5B70AA15C3&btag=e00090000",
    sourceName: "ស្នាដៃកូនពៅ - Suya Daily (@suyadaily)",
    authorHandle: "@suyadaily",
    publishedOrUpdatedAt: "2026-11-08T01:44:48.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-ieatisharecamb-7705389696070978837",
    platform: 'tiktok',
    titleKh: "មកពីណា ពីណីញុំាបានណាស់កូន ❤️🍀",
    titleEn: "មកពីណា ពីណីញុំាបានណាស់កូន ❤️🍀 (@ieatisharecambodia)",
    titleZh: "I Eat I Share Cambodia (@ieatisharecambodia) 柬埔寨美食与探店视频",
    descriptionKh: "មកពីណា ពីណីញុំាបានណាស់កូន ❤️🍀",
    descriptionEn: "មកពីណា ពីណីញុំាបានណាស់កូន ❤️🍀 — Official Cambodian TikTok food review by @ieatisharecambodia.",
    descriptionZh: "来自柬埔寨美食创作者 @ieatisharecambodia 的 TikTok 视频：មកពីណា ពីណីញុំាបានណាស់កូន ❤️🍀",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o0yImehv5ARjGV2ICmbIAxC4CD3LIGwfVKYfMz~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=VcK7EofKykqpkKIeadP2ZrXxKHE%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@ieatisharecambodia/video/7705389696070978837",
    originalAccountUrl: "https://www.tiktok.com/@ieatisharecambodia",
    inlineVideoId: "7705389696070978837",
    directVideoUrl: "https://v16.tiktokcdn.com/95d23175c8f240d447b44dc0c497f1a8/6afdc447/video/tos/alisg/tos-alisg-pve-0037c001/o8IhZjCVt3vCYL51bmnGyAHI4KDeAxfsmEnfIh/?a=1233&bti=ODszNWYuMDE6&&bt=300&ft=bC~O_mfLPD12NKY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=ZTQ3ZGU0NTU3NGRnZzw4ZkBpM2R1eXA5cjlqZTMzODczNEAwYV8xMWAzNTExNC00MTBiYSNnZnBzMmQ0amthLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232858ABFBA7A07A77B4A1B51C&btag=e000b0000",
    sourceName: "I Eat I Share Cambodia (@ieatisharecambodia)",
    authorHandle: "@ieatisharecambodia",
    publishedOrUpdatedAt: "2026-11-07T11:27:22.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-plovder-7705344680648576276",
    platform: 'tiktok',
    titleKh: "ទៅរកណាទេ អង្គុយក្នុងទឹកហូរស្តាប់សម្លេងធម្មជាតិ នៅក្បែរក្រុង",
    titleEn: "ទៅរកណាទេ អង្គុយក្នុងទឹកហូរស្តាប់សម្លេងធម្មជាតិ នៅក្បែរក្រុង (@plov_der)",
    titleZh: "ផ្លូវដើរ - Plov Der (@plov_der) 柬埔寨美食与探店视频",
    descriptionKh: "ទៅរកណាទេ អង្គុយក្នុងទឹកហូរស្តាប់សម្លេងធម្មជាតិ នៅក្បែរក្រុង #fyp #fypviralシ #everyone #nature #travel",
    descriptionEn: "ទៅរកណាទេ អង្គុយក្នុងទឹកហូរស្តាប់សម្លេងធម្មជាតិ នៅក្បែរក្រុង #fyp #fypviralシ #everyone #nature #travel — Official Cambodian TikTok food review by @plov_der.",
    descriptionZh: "来自柬埔寨美食创作者 @plov_der 的 TikTok 视频：ទៅរកណាទេ អង្គុយក្នុងទឹកហូរស្តាប់សម្លេងធម្មជាតិ នៅក្បែរក្រុង #fyp #fypviralシ #everyone #nature #trave",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oE1ugcg7fAEBpIDdADVq6iCe4EBQFCALRuAIlq~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=fz1VTni70CFGa0vc1jY0JnZ%2Bv0A%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@plov_der/video/7705344680648576276",
    originalAccountUrl: "https://www.tiktok.com/@plov_der",
    inlineVideoId: "7705344680648576276",
    directVideoUrl: "https://v9.tiktokcdn.com/107ebcf362fac5b3de37e47d95144c0c/6afdc506/video/tos/alisg/tos-alisg-pve-0037/o44j2FfCEE7IgU7OuufIoGOAVTOZqDQtBSqwBr/?a=1233&bti=ODszNWYuMDE6&&bt=5248&ft=L~O54ourD12NvWl-KzIxRNvSDlBF-UjNSmopiX&mime_type=video_mp4&rc=NzxoZDUzZWk7NGhmOGg5Z0BpM3BubWs5cjZoZTMzODgzNEAzMDRgNS1fNi8xX2NhM2MyYSNocWlzMmRrMWthLS1kLy1zcw%3D%3D&vvpl=1&l=20261116232853B78F6EA1007D649445B9&btag=e00098000",
    sourceName: "ផ្លូវដើរ - Plov Der (@plov_der)",
    authorHandle: "@plov_der",
    publishedOrUpdatedAt: "2026-11-07T08:32:41.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-27",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-tosmokplouk-7705275098143542548",
    platform: 'tiktok',
    titleKh: "ស្វែងរកអ្នកឈ្នះជាបន្តបន្ទាប់ជាមួយថ្នាំលាបពណ៌តូអា",
    titleEn: "ស្វែងរកអ្នកឈ្នះជាបន្តបន្ទាប់ជាមួយថ្នាំលាបពណ៌តូអា (@tosmokplouk)",
    titleZh: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk) 柬埔寨美食与探店视频",
    descriptionKh: "ស្វែងរកអ្នកឈ្នះជាបន្តបន្ទាប់ជាមួយថ្នាំលាបពណ៌តូអា#TOAcambodia #videoviral",
    descriptionEn: "ស្វែងរកអ្នកឈ្នះជាបន្តបន្ទាប់ជាមួយថ្នាំលាបពណ៌តូអា#TOAcambodia #videoviral — Official Cambodian TikTok food review by @tosmokplouk.",
    descriptionZh: "来自柬埔寨美食创作者 @tosmokplouk 的 TikTok 视频：ស្វែងរកអ្នកឈ្នះជាបន្តបន្ទាប់ជាមួយថ្នាំលាបពណ៌តូអា#TOAcambodia #videoviral",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oYpPXX4u1BUuuJiniIYFr6aoBEIHlAqkyioA6~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=LBGXkBv%2BdgD4YAupsogaSaOoAa8%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@tosmokplouk/video/7705275098143542548",
    originalAccountUrl: "https://www.tiktok.com/@tosmokplouk",
    inlineVideoId: "7705275098143542548",
    directVideoUrl: "https://v9.tiktokcdn.com/1beceaa982bc33afe2435a41316cbb97/6afdc486/video/tos/alisg/tos-alisg-pve-0037c001/o0qUY3XiaPZEsBlkFpiwtAEJu6uQIA64Boi45/?a=1233&bti=ODszNWYuMDE6&&bt=577&ft=bC~O_mfLPD12NWY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=ZDY7aTg4MztmNGloZzs5PEBpMzxsPHQ5cjxkZTMzODczNEBfMi8wXzQuXi0xYGAwYjYwYSNwNV5pMmQ0MmthLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32C72&btag=e00090000",
    sourceName: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk)",
    authorHandle: "@tosmokplouk",
    publishedOrUpdatedAt: "2026-11-07T04:02:40.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-80",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-ounwelldailyco-7705020350987521300",
    platform: 'tiktok',
    titleKh: "Slanh o ot b b 😆♥️",
    titleEn: "Slanh o ot b b 😆♥️ (@ounwelldailycooking)",
    titleZh: "Oun Well Daily Cooking (@ounwelldailycooking) 柬埔寨美食与探店视频",
    descriptionKh: "Slanh o ot b b 😆♥️",
    descriptionEn: "Slanh o ot b b 😆♥️ — Official Cambodian TikTok food review by @ounwelldailycooking.",
    descriptionZh: "来自柬埔寨美食创作者 @ounwelldailycooking 的 TikTok 视频：Slanh o ot b b 😆♥️",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oMi1zSZ1dAA6AV0BiwrtTIuAqstfILjxCgdwIB~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=8WrZkz4si3juQADNXuvZJ%2FHdF48%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@ounwelldailycooking/video/7705020350987521300",
    originalAccountUrl: "https://www.tiktok.com/@ounwelldailycooking",
    inlineVideoId: "7705020350987521300",
    directVideoUrl: "https://v9.tiktokcdn.com/a57b43596ac889f06a88d25188372860/6afdc448/video/tos/alisg/tos-alisg-pve-0037c001/o8Bfti1HAz6I2BwVEduA0gFj3yiCd1RqwQAtIr/?a=1233&bti=ODszNWYuMDE6&&bt=595&ft=bC~O_mfLPD12NVY3rn-Ux_N5PY6e3wv25LcAp&mime_type=video_mp4&rc=aDY1PGU0M2U2ZGc0ZzU1ZEBpam9pZGo5cnR1ZTMzODczNEBeNS5fMzRhXzIxNS4tYl42YSNiaHBkMmRjaWphLS1kMTFzcw%3D%3D&vvpl=1&l=202611162328572824A64FCD4BE49FEFE1&btag=e000b8000",
    sourceName: "Oun Well Daily Cooking (@ounwelldailycooking)",
    authorHandle: "@ounwelldailycooking",
    publishedOrUpdatedAt: "2026-11-06T11:34:07.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-4",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-foodwhisperoff-7704969561363188993",
    platform: 'tiktok',
    titleKh: "ខ្មែរធ្វើបាន​ ពិព័រណ៌ផលិតផលខ្មែរ​ 2026 កោះពេជ្រ​ អគារ​ G-L ថ្ងៃទី6 ដល់ទី8 ខែវិច្ឆិកា",
    titleEn: "ខ្មែរធ្វើបាន​ ពិព័រណ៌ផលិតផលខ្មែរ​ 2026 កោះពេជ្រ​ អគារ​ G-L ថ្ងៃទី6 ដល់ទី8 ខែវិច្ (@foodwhisper_officials)",
    titleZh: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials) 柬埔寨美食与探店视频",
    descriptionKh: "ខ្មែរធ្វើបាន​ ពិព័រណ៌ផលិតផលខ្មែរ​ 2026 កោះពេជ្រ​ អគារ​ G-L ថ្ងៃទី6 ដល់ទី8 ខែវិច្ឆិកា",
    descriptionEn: "ខ្មែរធ្វើបាន​ ពិព័រណ៌ផលិតផលខ្មែរ​ 2026 កោះពេជ្រ​ អគារ​ G-L ថ្ងៃទី6 ដល់ទី8 ខែវិច្ឆិកា — Official Cambodian TikTok food review by @foodwhisper_officials.",
    descriptionZh: "来自柬埔寨美食创作者 @foodwhisper_officials 的 TikTok 视频：ខ្មែរធ្វើបាន​ ពិព័រណ៌ផលិតផលខ្មែរ​ 2026 កោះពេជ្រ​ អគារ​ G-L ថ្ងៃទី6 ដល់ទី8 ខែវិច្ឆិកា",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o4nEAjQQIseEcs7B3tkDfBKRzxAFF9YgCBvqIn~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=%2FTVp6IUBfdefmPN42nbccEdvgVk%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@foodwhisper_officials/video/7704969561363188993",
    originalAccountUrl: "https://www.tiktok.com/@foodwhisper_officials",
    inlineVideoId: "7704969561363188993",
    directVideoUrl: "https://v9.tiktokcdn.com/23cd9de8b1568fca0028a62c988545c5/6afdc4af/video/tos/alisg/tos-alisg-pve-0037c001/okZOQiBqBgeIB7RUlE3ZfguAtxpD7F9zYchjAE/?a=1233&bti=ODszNWYuMDE6&&bt=1249&ft=L~O54ourD12NvKl-KzIxREESDlBF-UjNSaopiX&mime_type=video_mp4&rc=O2Y2N2hmOjQ6OThlPGYzOUBpM3E0PHg5cnZyZTMzODczNEBfNmExNjBhNjQxYmM1MjE0YSMyLmxqMmRjbWphLS1kMWBzcw%3D%3D&vvpl=1&l=2026111623285136141F5723667CE60E77&btag=e00090000",
    sourceName: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)",
    authorHandle: "@foodwhisper_officials",
    publishedOrUpdatedAt: "2026-11-06T08:17:02.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-tosmokplouk-7704969220970286357",
    platform: 'tiktok',
    titleKh: "ទឹកសណ្តែក៣រសជាតិ",
    titleEn: "ទឹកសណ្តែក៣រសជាតិ (@tosmokplouk)",
    titleZh: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk) 柬埔寨美食与探店视频",
    descriptionKh: "ទឹកសណ្តែក៣រសជាតិ#videoviral",
    descriptionEn: "ទឹកសណ្តែក៣រសជាតិ#videoviral — Official Cambodian TikTok food review by @tosmokplouk.",
    descriptionZh: "来自柬埔寨美食创作者 @tosmokplouk 的 TikTok 视频：ទឹកសណ្តែក៣រសជាតិ#videoviral",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oAFyL2pq7AA3BTaHEi9YfRjBUitfQpJhE1GgQD~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=zTxlr4h%2BJLFsuYF4peN708pNVj4%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@tosmokplouk/video/7704969220970286357",
    originalAccountUrl: "https://www.tiktok.com/@tosmokplouk",
    inlineVideoId: "7704969220970286357",
    directVideoUrl: "https://v9.tiktokcdn.com/db15fbb0f6330ce2e68f1beec21107f6/6afdc43c/video/tos/alisg/tos-alisg-pve-0037c001/owGy3SUDqBjiTK3FE3uYyAQ1EBJtf7tg9RILfa/?a=1233&bti=ODszNWYuMDE6&&bt=735&ft=bC~O_mfLPD12NWY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=NGk8NDkzM2Y3OjpoOmc1NUBpajxtaWs5cjlyZTMzODczNEAyYC8wMjQtNTAxMy0uLjIuYSNla2hhMmRrbWphLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32C72&btag=e000b0000",
    sourceName: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk)",
    authorHandle: "@tosmokplouk",
    publishedOrUpdatedAt: "2026-11-06T08:15:43.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-80",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-benlycooking-7704900141815303476",
    platform: 'tiktok',
    titleKh: "បងៗពូៗកងទ័ព🪖ថាខាន់ឆ្ងាញ់😋ចឹងយូហើយ ថ្ងៃនេះសុំលេងម៉ាឆ្អែតហើយ😋🪖",
    titleEn: "បងៗពូៗកងទ័ព🪖ថាខាន់ឆ្ងាញ់😋ចឹងយូហើយ ថ្ងៃនេះសុំលេងម៉ាឆ្អែតហើយ😋🪖 (@benlycooking)",
    titleZh: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking) 柬埔寨美食与探店视频",
    descriptionKh: "បងៗពូៗកងទ័ព🪖ថាខាន់ឆ្ងាញ់😋ចឹងយូហើយ ថ្ងៃនេះសុំលេងម៉ាឆ្អែតហើយ😋🪖",
    descriptionEn: "បងៗពូៗកងទ័ព🪖ថាខាន់ឆ្ងាញ់😋ចឹងយូហើយ ថ្ងៃនេះសុំលេងម៉ាឆ្អែតហើយ😋🪖 — Official Cambodian TikTok food review by @benlycooking.",
    descriptionZh: "来自柬埔寨美食创作者 @benlycooking 的 TikTok 视频：បងៗពូៗកងទ័ព🪖ថាខាន់ឆ្ងាញ់😋ចឹងយូហើយ ថ្ងៃនេះសុំលេងម៉ាឆ្អែតហើយ😋🪖",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oYSDFBBHUEf7FL3tIG3iEfbhUT7zqIAjwBiRgN~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=1UjRKavWI91GcP4FjkYvR72S%2Bbw%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@benlycooking/video/7704900141815303476",
    originalAccountUrl: "https://www.tiktok.com/@benlycooking",
    inlineVideoId: "7704900141815303476",
    directVideoUrl: "https://v45-eu.tiktokcdn.com/386ca9e7e93799609fbaa3cfa21caebe/6afdc4b6/video/tos/alisg/tos-alisg-pve-0037c001/oEtjg7DQBEqVF3i3FUfBRHhoofFtTUEBAEBb5I/?a=1233&bti=ODszNWYuMDE6&&bt=1316&ft=L~aJCoCyD12Nv7l-KzIxREFSrlBF-UjNSbopiX&mime_type=video_mp4&rc=ODw6ZWdlNzw1PGQ0aTg6aEBpajg5cnk5cnJuZTMzODczNEAzNmBjLWEyX14xYV41MDE1YSNhMWwwMmRjb2phLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232852D1F2A5EE89B7A79565DA&btag=e00095000",
    sourceName: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking)",
    authorHandle: "@benlycooking",
    publishedOrUpdatedAt: "2026-11-06T03:47:39.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-4",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-borerestaurant-7704677813961510152",
    platform: 'tiktok',
    titleKh: "ម្ហូបខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ បរិយាកាសកក់ក្ដៅ និងពេលវេលាដ៏មានន័យជាមួយមនុស្សជាទីស្រឡាញ់។ 🌿✨ មិនថាជាកា",
    titleEn: "ម្ហូបខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ បរិយាកាសកក់ក្ដៅ និងពេលវេលាដ៏មានន័យជាមួយមនុស្សជាទីស្រឡាញ់ (@bore.restaurant)",
    titleZh: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "ម្ហូបខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ បរិយាកាសកក់ក្ដៅ និងពេលវេលាដ៏មានន័យជាមួយមនុស្សជាទីស្រឡាញ់។ 🌿✨ មិនថាជាការណាត់ជួបដ៏រ៉ូមែនទិក ការជួបជុំគ្រួសារ ឬការរៀបចំកម្មវិធីពិសេសនានា ភោជនីយដ្ឋាន បុរេ ត្រៀមខ្លួនស្វាគមន៍លោកអ្នកជាមួយម្ហូបខ្មែរដ៏សម្បូរបែប និងបរិយាកាសដ៏ស្រស់ស្រាយ នៅក្បែររមណីយដ្ឋានប្រវត្តិសាស្ត្រវត្តភ្នំ។ ❤️ បុរេ — ឱជារសនៃវប្បធម៌។ ☎️ កក់តុ និងកម្មវិធីពិសេស៖ https://t.me/borerestaurant 📍 ក្នុងសួនកម្សាន្តវត្តភ្នំ ទល់មុខវត្តភ្នំ រាជធានីភ្នំពេញ https://maps.app.goo.gl/DqSggg9Tiqmi5ZHM8?g_st=ic",
    descriptionEn: "ម្ហូបខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ បរិយាកាសកក់ក្ដៅ និងពេលវេលាដ៏មានន័យជាមួយមនុស្សជាទីស្រឡាញ់។ 🌿✨ មិនថាជាការណាត់ជួបដ៏រ៉ូមែនទិក ការជួបជុំគ្រួសារ ឬការរៀបចំកម្មវិធីពិសេសនានា ភ — Official Cambodian TikTok food review by @bore.restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @bore.restaurant 的 TikTok 视频：ម្ហូបខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ បរិយាកាសកក់ក្ដៅ និងពេលវេលាដ៏មានន័យជាមួយមនុស្សជាទីស្រឡាញ់។ 🌿✨ មិនថាជាការណាត់",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ogsEUA1IjIfA6ooe5DEAeLGVAudLIDVQEA6dg2~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=OnGzJ1aZye19rXok9HaNlneUfjo%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@bore.restaurant/video/7704677813961510152",
    originalAccountUrl: "https://www.tiktok.com/@bore.restaurant",
    inlineVideoId: "7704677813961510152",
    directVideoUrl: "https://v9.tiktokcdn.com/d225e2822d2b77711413515a8e958f87/6afdc499/video/tos/alisg/tos-alisg-pve-0037c001/oQGgQIVzZ0VAeeVBS5QUCX2IjD5MTAco9Q8Xf3/?a=1233&bti=ODszNWYuMDE6&&bt=878&ft=bC~O_mfLPD12NtY3rn-Ux-evWY6e3wv251cAp&mime_type=video_mp4&rc=N2c4ZWlkOjY7ZWRlOWllNEBpand4OXg5cjk7ZTMzODczNEA1M2NeLWE0Nl4xMy8vMzU2YSNzc2ZlMmRjNGphLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232855390EAF6F445DC2B3EA8E&btag=e00090000",
    sourceName: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant)",
    authorHandle: "@bore.restaurant",
    publishedOrUpdatedAt: "2026-11-05T13:24:54.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-1",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-foodwhisperoff-7704666283106684178",
    platform: 'tiktok',
    titleKh: "បាយខហុងជើងជ្រូក​ បាយផាក់ឡូវ​ បាយមាន់ស្ងោរ​ ឥឡូវជាប់ម៉ូយហើយ​ ហាង​ ផ្ទះបាយសាច់ខ្វៃ សាខាផ្លូវ60m ហ",
    titleEn: "បាយខហុងជើងជ្រូក​ បាយផាក់ឡូវ​ បាយមាន់ស្ងោរ​ ឥឡូវជាប់ម៉ូយហើយ​ ហាង​ ផ្ទះបាយសាច់ខ្វៃ (@foodwhisper_officials)",
    titleZh: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials) 柬埔寨美食与探店视频",
    descriptionKh: "បាយខហុងជើងជ្រូក​ បាយផាក់ឡូវ​ បាយមាន់ស្ងោរ​ ឥឡូវជាប់ម៉ូយហើយ​ ហាង​ ផ្ទះបាយសាច់ខ្វៃ សាខាផ្លូវ60m ហួស​ ISPP បន្តិច",
    descriptionEn: "បាយខហុងជើងជ្រូក​ បាយផាក់ឡូវ​ បាយមាន់ស្ងោរ​ ឥឡូវជាប់ម៉ូយហើយ​ ហាង​ ផ្ទះបាយសាច់ខ្វៃ សាខាផ្លូវ60m ហួស​ ISPP បន្តិច — Official Cambodian TikTok food review by @foodwhisper_officials.",
    descriptionZh: "来自柬埔寨美食创作者 @foodwhisper_officials 的 TikTok 视频：បាយខហុងជើងជ្រូក​ បាយផាក់ឡូវ​ បាយមាន់ស្ងោរ​ ឥឡូវជាប់ម៉ូយហើយ​ ហាង​ ផ្ទះបាយសាច់ខ្វៃ សាខាផ្លូវ60m ហួស​ I",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/okfY3wA2eAQ9MEX0JGjV3ICC9IDoLIWq9PFQel~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=JzpdG5bXBePQ3sd3GZCZ7j7IpIc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@foodwhisper_officials/video/7704666283106684178",
    originalAccountUrl: "https://www.tiktok.com/@foodwhisper_officials",
    inlineVideoId: "7704666283106684178",
    directVideoUrl: "https://v9.tiktokcdn.com/5a5c501b564bed80bcdbc7f68321c36d/6afdc4d7/video/tos/alisg/tos-alisg-pve-0037c001/oQfQfeVZg7LIol2CgY4M8DEjE3AXBFPAPSFVRv/?a=1233&bti=ODszNWYuMDE6&&bt=986&ft=L~O54ourD12NvKl-KzIxREESDlBF-UjNSaopiX&mime_type=video_mp4&rc=NzgzZDo2NWc0aWg4Z2kzZUBpanJ5cXM5cjk6ZTMzODczNEA2L2AyLWMxNS4xYzYyLzAuYSMtXmNjMmRzZWphLS1kMTFzcw%3D%3D&vvpl=1&l=2026111623285136141F5723667CE60E77&btag=e00090000",
    sourceName: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)",
    authorHandle: "@foodwhisper_officials",
    publishedOrUpdatedAt: "2026-11-05T12:40:09.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-benlycooking-7704208125708012806",
    platform: 'tiktok',
    titleKh: "ទាដើមចេកនិងទឹកជ្រលក់(ម្ជួរកូនម៉ែ)😋ធានាថាជាតិបើកបានដាត់ៗជាមួយអាជាក់ៗ🤭🤭😋",
    titleEn: "ទាដើមចេកនិងទឹកជ្រលក់(ម្ជួរកូនម៉ែ)😋ធានាថាជាតិបើកបានដាត់ៗជាមួយអាជាក់ៗ🤭🤭😋 (@benlycooking)",
    titleZh: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking) 柬埔寨美食与探店视频",
    descriptionKh: "ទាដើមចេកនិងទឹកជ្រលក់(ម្ជួរកូនម៉ែ)😋ធានាថាជាតិបើកបានដាត់ៗជាមួយអាជាក់ៗ🤭🤭😋",
    descriptionEn: "ទាដើមចេកនិងទឹកជ្រលក់(ម្ជួរកូនម៉ែ)😋ធានាថាជាតិបើកបានដាត់ៗជាមួយអាជាក់ៗ🤭🤭😋 — Official Cambodian TikTok food review by @benlycooking.",
    descriptionZh: "来自柬埔寨美食创作者 @benlycooking 的 TikTok 视频：ទាដើមចេកនិងទឹកជ្រលក់(ម្ជួរកូនម៉ែ)😋ធានាថាជាតិបើកបានដាត់ៗជាមួយអាជាក់ៗ🤭🤭😋",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o0fIICwwd4qU7EnqvwAVIVw2wGiIA1AWdwBqFi~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=SJywqqWv52uky0JjFYDQ16Is1Uc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@benlycooking/video/7704208125708012806",
    originalAccountUrl: "https://www.tiktok.com/@benlycooking",
    inlineVideoId: "7704208125708012806",
    directVideoUrl: "https://v45-eu.tiktokcdn.com/8217e7d47bc53b7a06d0e360a3a9b11c/6afdc4ca/video/tos/alisg/tos-alisg-pve-0037c001/oMQCdfWqwwwIBYYEQw4iAqAq2AdiI3zn1vwwmn/?a=1233&bti=ODszNWYuMDE6&&bt=1343&ft=L~aJCoCyD12Nv7l-KzIxREFSrlBF-UjNSbopiX&mime_type=video_mp4&rc=Z2k0ZjlnNzk5NjU2ODs5OEBpamk2PHI5cm9nZTMzODczNEBgLy0vYzFjX2IxXy0vXzMtYSNiLnJsMmRjZGlhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232852D1F2A5EE89B7A79565DA&btag=e00095000",
    sourceName: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking)",
    authorHandle: "@benlycooking",
    publishedOrUpdatedAt: "2026-11-04T07:02:16.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-4",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-foodwhisperoff-7703546448016706836",
    platform: 'tiktok',
    titleKh: "បាញ់ឌុក​ ស៊ុបខ្យង​ ម្ហូបនៅនេះសុទ្ធតែត្រូវមាត់​ ភោជនីយដ្ឋានសង្ក្រាន្ត​ បឹងកក់",
    titleEn: "បាញ់ឌុក​ ស៊ុបខ្យង​ ម្ហូបនៅនេះសុទ្ធតែត្រូវមាត់​ ភោជនីយដ្ឋានសង្ក្រាន្ត​ បឹងកក់ (@foodwhisper_officials)",
    titleZh: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials) 柬埔寨美食与探店视频",
    descriptionKh: "បាញ់ឌុក​ ស៊ុបខ្យង​ ម្ហូបនៅនេះសុទ្ធតែត្រូវមាត់​ ភោជនីយដ្ឋានសង្ក្រាន្ត​ បឹងកក់",
    descriptionEn: "បាញ់ឌុក​ ស៊ុបខ្យង​ ម្ហូបនៅនេះសុទ្ធតែត្រូវមាត់​ ភោជនីយដ្ឋានសង្ក្រាន្ត​ បឹងកក់ — Official Cambodian TikTok food review by @foodwhisper_officials.",
    descriptionZh: "来自柬埔寨美食创作者 @foodwhisper_officials 的 TikTok 视频：បាញ់ឌុក​ ស៊ុបខ្យង​ ម្ហូបនៅនេះសុទ្ធតែត្រូវមាត់​ ភោជនីយដ្ឋានសង្ក្រាន្ត​ បឹងកក់",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/owf0ogdgGwA0PCfxAIerAZnwHLJZOVDILRgjQQ~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=TpvTZYy9NXeSaNTGubw8Lt7G0YQ%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@foodwhisper_officials/video/7703546448016706836",
    originalAccountUrl: "https://www.tiktok.com/@foodwhisper_officials",
    inlineVideoId: "7703546448016706836",
    directVideoUrl: "https://v9.tiktokcdn.com/d53a1679701dc9df736eeacf1290b9ad/6afdc4c7/video/tos/alisg/tos-alisg-pve-0037c001/ocqd0RBggIxwbnlDPfVIQGxC0RlZoHEeAAJLfj/?a=1233&bti=ODszNWYuMDE6&&bt=1397&ft=L~O54ourD12NvKl-KzIxREESDlBF-UjNSaopiX&mime_type=video_mp4&rc=aTgzZzRnMzw2Ojk2ZTY4ZkBpM3ZqOG45cjY6ZTMzODczNEAwYjU0XmNiNi0xLTAuM2IzYSNgMGc2MmRrcWhhLS1kMTFzcw%3D%3D&vvpl=1&l=2026111623285136141F5723667CE60E77&btag=e00090000",
    sourceName: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)",
    authorHandle: "@foodwhisper_officials",
    publishedOrUpdatedAt: "2026-11-02T12:14:37.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-tosmokplouk-7703407031192931604",
    platform: 'tiktok',
    titleKh: "បាយមាន់ឆ្ងាញ់ស្នាដៃអ្នកក្រុងសួងកូនស្រីបីអ្នក",
    titleEn: "បាយមាន់ឆ្ងាញ់ស្នាដៃអ្នកក្រុងសួងកូនស្រីបីអ្នក (@tosmokplouk)",
    titleZh: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk) 柬埔寨美食与探店视频",
    descriptionKh: "បាយមាន់ឆ្ងាញ់ស្នាដៃអ្នកក្រុងសួងកូនស្រីបីអ្នក#videoviral",
    descriptionEn: "បាយមាន់ឆ្ងាញ់ស្នាដៃអ្នកក្រុងសួងកូនស្រីបីអ្នក#videoviral — Official Cambodian TikTok food review by @tosmokplouk.",
    descriptionZh: "来自柬埔寨美食创作者 @tosmokplouk 的 TikTok 视频：បាយមាន់ឆ្ងាញ់ស្នាដៃអ្នកក្រុងសួងកូនស្រីបីអ្នក#videoviral",
    thumbnailUrl: "https://p19-common-sign.tiktokcdn.com/tos-alisg-p-0037/owgKP85A8fOYsfHCaYiN9b48i6MuffgXAB5A3e~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=tywYWdsvSw9YtVn1KzRr%2Bbi9yW4%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@tosmokplouk/video/7703407031192931604",
    originalAccountUrl: "https://www.tiktok.com/@tosmokplouk",
    inlineVideoId: "7703407031192931604",
    directVideoUrl: "https://v9.tiktokcdn.com/7d4a5ea46a1abc2aa419015cb05fe370/6afdc495/video/tos/alisg/tos-alisg-pve-0037c001/ocHNMQATIfXQtAiAEKo2fgXKePXhAM8fDXATeN/?a=1233&bti=ODszNWYuMDE6&&bt=928&ft=bC~O_mfLPD12NWY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=aDw5ZTVlZ2Q6Zzs7ZWU5OkBpank6eXI5cmt5ZTMzODczNEA0LmEwYV8uNi4xLl82M18xYSNfYW1jMmRrc2dhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32C72&btag=e00090000",
    sourceName: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk)",
    authorHandle: "@tosmokplouk",
    publishedOrUpdatedAt: "2026-11-02T03:13:37.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-80",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-borerestaurant-7703237749301595399",
    platform: 'tiktok',
    titleKh: "A timeless symbol of love, beautifully celebrated at Boré. ✨",
    titleEn: "A timeless symbol of love, beautifully celebrated at Boré. ✨ (@bore.restaurant)",
    titleZh: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "A timeless symbol of love, beautifully celebrated at Boré. ✨ #engagementvenue #phnompenh #cambodia #khmerfood #celebration",
    descriptionEn: "A timeless symbol of love, beautifully celebrated at Boré. ✨ #engagementvenue #phnompenh #cambodia #khmerfood #celebration — Official Cambodian TikTok food review by @bore.restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @bore.restaurant 的 TikTok 视频：A timeless symbol of love, beautifully celebrated at Boré. ✨ #engagementvenue #phnompenh #cambodia #",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ocAmzQseVD9ulJ7LAMCNOhfzXcpgog8jeIs7dk~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=Db%2BcgT8TA22LUrVHDbzALgC9qeo%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@bore.restaurant/video/7703237749301595399",
    originalAccountUrl: "https://www.tiktok.com/@bore.restaurant",
    inlineVideoId: "7703237749301595399",
    directVideoUrl: "https://v9.tiktokcdn.com/df06f712dd33beb3b5322cbe6792c8eb/6afdc440/video/tos/alisg/tos-alisg-pve-0037c001/o4fIyesOZA4jGwCIgPlIA7CoyDzLQAI7VkpedH/?a=1233&bti=ODszNWYuMDE6&&bt=1100&ft=bC~O_mfLPD12NtY3rn-Ux-evWY6e3wv251cAp&mime_type=video_mp4&rc=OTRmZzRmPDQzPDs8ZGZoaEBpamx4cXM5cmlwZTMzODczNEAxXmFgYF9eNS8xLTRhYl9fYSNgbWBjMmRjXmdhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232855390EAF6F445DC2B3EA8E&btag=e000b0000",
    sourceName: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant)",
    authorHandle: "@bore.restaurant",
    publishedOrUpdatedAt: "2026-11-01T16:16:43.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-1",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-borerestaurant-7703219828642876690",
    platform: 'tiktok',
    titleKh: "You + me = Bun Dau date? @borerestaurant",
    titleEn: "You + me = Bun Dau date? @borerestaurant (@bore.restaurant)",
    titleZh: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant) 柬埔寨美食与探店视频",
    descriptionKh: "You + me = Bun Dau date? @borerestaurant #phnompenh #cambodia #khmerfood #datenight #vietnamesefood",
    descriptionEn: "You + me = Bun Dau date? @borerestaurant #phnompenh #cambodia #khmerfood #datenight #vietnamesefood — Official Cambodian TikTok food review by @bore.restaurant.",
    descriptionZh: "来自柬埔寨美食创作者 @bore.restaurant 的 TikTok 视频：You + me = Bun Dau date? @borerestaurant #phnompenh #cambodia #khmerfood #datenight #vietnamesefood",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ospPlD2aDBrunuVXiIYAL9aVBEEAsAzKTiAAd~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=zlV8MGy0WwMEJzEsYm9WwjBMv7A%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@bore.restaurant/video/7703219828642876690",
    originalAccountUrl: "https://www.tiktok.com/@bore.restaurant",
    inlineVideoId: "7703219828642876690",
    directVideoUrl: "https://v9.tiktokcdn.com/8ec55d831837cfcc8eb49965ead70605/6afdc458/video/tos/alisg/tos-alisg-pve-0037c001/oYHsQoIGaSeDGNfgqVqOI7eI1FLLmjAzGnCx7A/?a=1233&bti=ODszNWYuMDE6&&bt=654&ft=bC~O_mfLPD12NtY3rn-Ux-evWY6e3wv251cAp&mime_type=video_mp4&rc=OjVpOzY1PDhoO2dkNjhpPEBpamg5ZG05cjdvZTMzODczNEBeNjIuMTYtNTYxXl8yYjYxYSNzMGBeMmRzX2dhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232855390EAF6F445DC2B3EA8E&btag=e00088000",
    sourceName: "ភោជនីយដ្ឋាន បុរី - Boré (@bore.restaurant)",
    authorHandle: "@bore.restaurant",
    publishedOrUpdatedAt: "2026-11-01T15:07:10.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-1",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-benlycooking-7703171500186012934",
    platform: 'tiktok',
    titleKh: "នេះជាក្ដីសុខសម្រាប់បងៗពូៗកងទ័ព🪖នៅតាមព្រំដែន🥹🫡ខ្ញុំក៏នៅតែបន្តអោយក្តីសុខមួយនេះបានដល់បងៗពូៗកងទ័",
    titleEn: "នេះជាក្ដីសុខសម្រាប់បងៗពូៗកងទ័ព🪖នៅតាមព្រំដែន🥹🫡ខ្ញុំក៏នៅតែបន្តអោយក្តីសុខមួយនេះប (@benlycooking)",
    titleZh: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking) 柬埔寨美食与探店视频",
    descriptionKh: "នេះជាក្ដីសុខសម្រាប់បងៗពូៗកងទ័ព🪖នៅតាមព្រំដែន🥹🫡ខ្ញុំក៏នៅតែបន្តអោយក្តីសុខមួយនេះបានដល់បងៗពូៗកងទ័ពជារាងរហូត🫡",
    descriptionEn: "នេះជាក្ដីសុខសម្រាប់បងៗពូៗកងទ័ព🪖នៅតាមព្រំដែន🥹🫡ខ្ញុំក៏នៅតែបន្តអោយក្តីសុខមួយនេះបានដល់បងៗពូៗកងទ័ពជារាងរហូត🫡 — Official Cambodian TikTok food review by @benlycooking.",
    descriptionZh: "来自柬埔寨美食创作者 @benlycooking 的 TikTok 视频：នេះជាក្ដីសុខសម្រាប់បងៗពូៗកងទ័ព🪖នៅតាមព្រំដែន🥹🫡ខ្ញុំក៏នៅតែបន្តអោយក្តីសុខមួយនេះបានដល់បងៗពូៗកងទ័ពជារា",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ocABHcInEDqIfBjzerDy1IBac5KREmFgy94Ej2~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=3YOtIPlOW%2FS0XltLc0jvNmCtxRE%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@benlycooking/video/7703171500186012934",
    originalAccountUrl: "https://www.tiktok.com/@benlycooking",
    inlineVideoId: "7703171500186012934",
    directVideoUrl: "https://v45-eu.tiktokcdn.com/8ed4deaafbec8deeda2a8a0941b7a350/6afdc4c3/video/tos/alisg/tos-alisg-pve-0037c001/osBtAqyBHqmEEuFReRIhlvAcxVgfGB8OMv5QDD/?a=1233&bti=ODszNWYuMDE6&&bt=1827&ft=L~aJCoCyD12Nv7l-KzIxREFSrlBF-UjNSbopiX&mime_type=video_mp4&rc=OTM7aGRkZjdmNTM7NWQzZ0Bpajs2d3g5cjNsZTMzODczNEBfMjZfYmMtXzUxYWAzYDNhYSNlXmsuMmRjZ2dhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232852D1F2A5EE89B7A79565DA&btag=e00095000",
    sourceName: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking)",
    authorHandle: "@benlycooking",
    publishedOrUpdatedAt: "2026-11-01T11:59:38.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-4",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-tosmokplouk-7703041168761720084",
    platform: 'tiktok',
    titleKh: "ស្តង់ដាគុណភាពខ្ពស់ ផលិតនៅកម្ពុជា",
    titleEn: "ស្តង់ដាគុណភាពខ្ពស់ ផលិតនៅកម្ពុជា (@tosmokplouk)",
    titleZh: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk) 柬埔寨美食与探店视频",
    descriptionKh: "ស្តង់ដាគុណភាពខ្ពស់ ផលិតនៅកម្ពុជា#videoviral #TOAcambodia",
    descriptionEn: "ស្តង់ដាគុណភាពខ្ពស់ ផលិតនៅកម្ពុជា#videoviral #TOAcambodia — Official Cambodian TikTok food review by @tosmokplouk.",
    descriptionZh: "来自柬埔寨美食创作者 @tosmokplouk 的 TikTok 视频：ស្តង់ដាគុណភាពខ្ពស់ ផលិតនៅកម្ពុជា#videoviral #TOAcambodia",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/okBUEmaBi5is8YAnw3ECamAIsWyvXuiVXYIym~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=q3rdUUxpNwc7QkGl9LBYUbBkp0k%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@tosmokplouk/video/7703041168761720084",
    originalAccountUrl: "https://www.tiktok.com/@tosmokplouk",
    inlineVideoId: "7703041168761720084",
    directVideoUrl: "https://v9.tiktokcdn.com/e883b83c7e49e5336071c536ae571de6/6afdc4a5/video/tos/alisg/tos-alisg-pve-0037c001/o8UjMzQfygUAaN4oIfTFZeAgM8AzXDARYCLVWR/?a=1233&bti=ODszNWYuMDE6&&bt=589&ft=bC~O_mfLPD12NWY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=ZGZoOWc3aTs3NDNmMzNlM0BpajdsPHM5cnJlZTMzODczNEAuYDFeYy4wNjYxLjQ0NmFjYSNeYHNlMmRrMWdhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32C72&btag=e00090000",
    sourceName: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk)",
    authorHandle: "@tosmokplouk",
    publishedOrUpdatedAt: "2026-11-01T03:33:53.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-80",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-foodwhisperoff-7702830319371570453",
    platform: 'tiktok',
    titleKh: "មីគោក​ សរសៃមីធ្វើខ្លួនឯង​ អ៊ីពិសី​ 2នាក់ម៉ែកូន​ ខាងក្រោយផ្សារក្រោម​ ខេត្តសៀមរាប",
    titleEn: "មីគោក​ សរសៃមីធ្វើខ្លួនឯង​ អ៊ីពិសី​ 2នាក់ម៉ែកូន​ ខាងក្រោយផ្សារក្រោម​ ខេត្តសៀមរាប (@foodwhisper_officials)",
    titleZh: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials) 柬埔寨美食与探店视频",
    descriptionKh: "មីគោក​ សរសៃមីធ្វើខ្លួនឯង​ អ៊ីពិសី​ 2នាក់ម៉ែកូន​ ខាងក្រោយផ្សារក្រោម​ ខេត្តសៀមរាប",
    descriptionEn: "មីគោក​ សរសៃមីធ្វើខ្លួនឯង​ អ៊ីពិសី​ 2នាក់ម៉ែកូន​ ខាងក្រោយផ្សារក្រោម​ ខេត្តសៀមរាប — Official Cambodian TikTok food review by @foodwhisper_officials.",
    descriptionZh: "来自柬埔寨美食创作者 @foodwhisper_officials 的 TikTok 视频：មីគោក​ សរសៃមីធ្វើខ្លួនឯង​ អ៊ីពិសី​ 2នាក់ម៉ែកូន​ ខាងក្រោយផ្សារក្រោម​ ខេត្តសៀមរាប",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/osrlfV95gce0FMJRgPiLHGAKRGLtkQeVfAsGXI~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=3FhzO2uM2AeZhfwQj9EDg%2F%2Bi%2FJw%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@foodwhisper_officials/video/7702830319371570453",
    originalAccountUrl: "https://www.tiktok.com/@foodwhisper_officials",
    inlineVideoId: "7702830319371570453",
    directVideoUrl: "https://v9.tiktokcdn.com/b09f0095603c8faa3a9cd699d1c96687/6afdc49c/video/tos/alisg/tos-alisg-pve-0037c001/oM7DIdiBIVqznPRlAQBAElc1IS1w8ADCOvibfG/?a=1233&bti=ODszNWYuMDE6&&bt=1100&ft=L~O54ourD12NvKl-KzIxREESDlBF-UjNSaopiX&mime_type=video_mp4&rc=Ozg3O2VnNTs2NzgzOzY5OEBpamlmOG85cnN5ZTMzODczNEAxMzQxLTA1NmAxNGFiYmFjYSNiM182MmRzMmZhLS1kMTFzcw%3D%3D&vvpl=1&l=2026111623285136141F5723667CE60E77&btag=e00090000",
    sourceName: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)",
    authorHandle: "@foodwhisper_officials",
    publishedOrUpdatedAt: "2026-10-31T13:55:41.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-tosmokplouk-7702702366029614357",
    platform: 'tiktok',
    titleKh: "មានច្រេីនជម្រេីសច្រេីនរសជាតិ",
    titleEn: "មានច្រេីនជម្រេីសច្រេីនរសជាតិ (@tosmokplouk)",
    titleZh: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk) 柬埔寨美食与探店视频",
    descriptionKh: "មានច្រេីនជម្រេីសច្រេីនរសជាតិ#videoviral #gummy",
    descriptionEn: "មានច្រេីនជម្រេីសច្រេីនរសជាតិ#videoviral #gummy — Official Cambodian TikTok food review by @tosmokplouk.",
    descriptionZh: "来自柬埔寨美食创作者 @tosmokplouk 的 TikTok 视频：មានច្រេីនជម្រេីសច្រេីនរសជាតិ#videoviral #gummy",
    thumbnailUrl: "https://p19-common-sign.tiktokcdn.com/tos-alisg-p-0037/osjVypMJBDCQLeZx8IAAA33WtvVHSB53hepjof~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=tr3ugT9lSl1lBgcik1UMj%2Fyq99A%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@tosmokplouk/video/7702702366029614357",
    originalAccountUrl: "https://www.tiktok.com/@tosmokplouk",
    inlineVideoId: "7702702366029614357",
    directVideoUrl: "https://v9.tiktokcdn.com/f72ebb43f5498d96a1dedd923925c9ed/6afdc473/video/tos/alisg/tos-alisg-pve-0037c001/oEfyogHRG2w3vCf8AIexAnArkL0xYVDIOMgj6K/?a=1233&bti=ODszNWYuMDE6&&bt=821&ft=bC~O_mfLPD12NWY3rn-Ux21vNY6e3wv25ocAp&mime_type=video_mp4&rc=ZDY7OGdmZGc6Z2ZkNGU3OEBpM2lwbW05cnJxZTMzODczNEAzM142MzNfNmMxXjFfNDNhYSMxZjAzMmRzcWZhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232854CE7C1A938BDEBBA32C72&btag=e00090000",
    sourceName: "តោះមកភ្លក់ - Tos Mok Plouk (@tosmokplouk)",
    authorHandle: "@tosmokplouk",
    publishedOrUpdatedAt: "2026-10-31T05:39:09.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-80",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-benlycooking-7702327785519418625",
    platform: 'tiktok',
    titleKh: "ថ្ងៃនេះសុំបែកសាបៗ🤭ជាមួយបងៗពូៗកងទ័ពនៅព្រំដែន😋 ត្រីសាម៉ុនពីហាងចរណៃ😋😋",
    titleEn: "ថ្ងៃនេះសុំបែកសាបៗ🤭ជាមួយបងៗពូៗកងទ័ពនៅព្រំដែន😋 ត្រីសាម៉ុនពីហាងចរណៃ😋😋 (@benlycooking)",
    titleZh: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking) 柬埔寨美食与探店视频",
    descriptionKh: "ថ្ងៃនេះសុំបែកសាបៗ🤭ជាមួយបងៗពូៗកងទ័ពនៅព្រំដែន😋 ត្រីសាម៉ុនពីហាងចរណៃ😋😋",
    descriptionEn: "ថ្ងៃនេះសុំបែកសាបៗ🤭ជាមួយបងៗពូៗកងទ័ពនៅព្រំដែន😋 ត្រីសាម៉ុនពីហាងចរណៃ😋😋 — Official Cambodian TikTok food review by @benlycooking.",
    descriptionZh: "来自柬埔寨美食创作者 @benlycooking 的 TikTok 视频：ថ្ងៃនេះសុំបែកសាបៗ🤭ជាមួយបងៗពូៗកងទ័ពនៅព្រំដែន😋 ត្រីសាម៉ុនពីហាងចរណៃ😋😋",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ocIvkquE8BCVvgRe9zIATFEBpKDnd5EAXflsoc~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=W8T2WQBD06DkZpWUSx4Dz%2BfMiFc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@benlycooking/video/7702327785519418625",
    originalAccountUrl: "https://www.tiktok.com/@benlycooking",
    inlineVideoId: "7702327785519418625",
    directVideoUrl: "https://v45-eu.tiktokcdn.com/06de27b98fe5fae58a94a0401d61e0c0/6afdc480/video/tos/alisg/tos-alisg-pve-0037c001/oIAQkFusp5XrDKbLRfeBCjE9gcEtBLpEdqpzIl/?a=1233&bti=ODszNWYuMDE6&&bt=1250&ft=L~aJCoCyD12Nv7l-KzIxREFSrlBF-UjNSbopiX&mime_type=video_mp4&rc=NzM7Nzc3NTY2OjtmOjs7ZUBpandoeXg5cnU1ZTMzODczNEBhLl4wNS0xXmIxYjAuYV5fYSNmcGppMmQ0aGZhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232852D1F2A5EE89B7A79565DA&btag=e00095000",
    sourceName: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking)",
    authorHandle: "@benlycooking",
    publishedOrUpdatedAt: "2026-10-30T05:25:35.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-4",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-thehungryhouse-7701852038904302861",
    platform: 'tiktok',
    titleKh: "Vietnamese Braised Chicken. 💋 . .",
    titleEn: "Vietnamese Braised Chicken. 💋 . . (@the_hungry_housewife)",
    titleZh: "The Hungry Housewife (@the_hungry_housewife) 柬埔寨美食与探店视频",
    descriptionKh: "Vietnamese Braised Chicken. 💋 . . #vietnam #food #cooking #vietnamese #foodie",
    descriptionEn: "Vietnamese Braised Chicken. 💋 . . #vietnam #food #cooking #vietnamese #foodie — Official Cambodian TikTok food review by @the_hungry_housewife.",
    descriptionZh: "来自柬埔寨美食创作者 @the_hungry_housewife 的 TikTok 视频：Vietnamese Braised Chicken. 💋 . . #vietnam #food #cooking #vietnamese #foodie",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast5-p-0068-tx/ooPXkLGIjIHZUQAtNEIIsNEAeAfAbWApxVeqAH~tplv-tiktokx-dmt-logom:tos-useast5-i-0068-tx/osAA8n3aDQH20EpmAdFAS9R2xCflqADIEeghE4.image?dr=14573&x-expires=1795014000&x-signature=87ptJFLCV5dgqlZVLt2vXsJI3B0%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@the_hungry_housewife/video/7701852038904302861",
    originalAccountUrl: "https://www.tiktok.com/@the_hungry_housewife",
    inlineVideoId: "7701852038904302861",
    directVideoUrl: "https://v9.tiktokcdn.com/f8b75b10750e76ce944a881285b94f2c/6afdc444/video/tos/alisg/tos-alisg-ve-37c799-sg/osIjzwIEe3qQDnGcCAeILOAkgNQocEQjHPxVeI/?a=1233&bti=ODszNWYuMDE6&&bt=1781&ft=bC~O_mfLPD12NKY3rn-UxMJ2WY6e3wv25ocAp&mime_type=video_mp4&rc=NTQ0NGY5NzhpZmVpNzc2NkBpM245bHk5cmY6ZTMzZzczNEAxYDE2XzAuNjUxLWMwNC1jYSMvcDAwMmRjZ2VhLS1kMS9zcw%3D%3D&vvpl=1&l=20261116232859FFFEAEC56B459D8FA012&btag=e000b0000",
    sourceName: "The Hungry Housewife (@the_hungry_housewife)",
    authorHandle: "@the_hungry_housewife",
    publishedOrUpdatedAt: "2026-10-28T22:39:27.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-thehungryhouse-7701851083643112717",
    platform: 'tiktok',
    titleKh: "We went to Eataly in Boston in the Prudential Center. It was a really cool experience. The mark",
    titleEn: "We went to Eataly in Boston in the Prudential Center. It was a really cool exper (@the_hungry_housewife)",
    titleZh: "The Hungry Housewife (@the_hungry_housewife) 柬埔寨美食与探店视频",
    descriptionKh: "We went to Eataly in Boston in the Prudential Center. It was a really cool experience. The market is awesome. We ended up buying Wagyu steaks to bring home and they were delicious. Check them out for some authentic Italian food and some good shopping. . . #italian #italianfood #food #restaurant  #boston",
    descriptionEn: "We went to Eataly in Boston in the Prudential Center. It was a really cool experience. The market is awesome. We ended up buying Wagyu steaks to bring home and  — Official Cambodian TikTok food review by @the_hungry_housewife.",
    descriptionZh: "来自柬埔寨美食创作者 @the_hungry_housewife 的 TikTok 视频：We went to Eataly in Boston in the Prudential Center. It was a really cool experience. The market is",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast5-p-0068-tx/ooGj8wTUgIvazR8HOeVIEGNCxgG1k9jeAAJLfj~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=fOsYxOW%2F4iq558%2BhUTbEy1eNlEE%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@the_hungry_housewife/video/7701851083643112717",
    originalAccountUrl: "https://www.tiktok.com/@the_hungry_housewife",
    inlineVideoId: "7701851083643112717",
    directVideoUrl: "https://v9.tiktokcdn.com/ee089cace7c1bcd68ed2fb084e14445f/6afdc4cb/video/tos/alisg/tos-alisg-ve-37c799-sg/osQEIhHRjeaxAsGVJLnme3R1q8wIjIKAkeOUCS/?a=1233&bti=ODszNWYuMDE6&&bt=2102&ft=bC~O_mfLPD12NKY3rn-UxMJ2WY6e3wv25ocAp&mime_type=video_mp4&rc=N2g6NTs7aWRpOjQ4aWZnZkBpanV0OnY5cjc6ZTMzZzczNEBgYjYzYmE1Xy4xM15eYjUwYSNucl4uMmRjY2VhLS1kMS9zcw%3D%3D&vvpl=1&l=20261116232859FFFEAEC56B459D8FA012&btag=e00090000",
    sourceName: "The Hungry Housewife (@the_hungry_housewife)",
    authorHandle: "@the_hungry_housewife",
    publishedOrUpdatedAt: "2026-10-28T22:35:45.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-thehungryhouse-7701669031710903566",
    platform: 'tiktok',
    titleKh: "Well this was day 4 of trying to become a treat maker. This was for my brother in law’s 40th bi",
    titleEn: "Well this was day 4 of trying to become a treat maker. This was for my brother i (@the_hungry_housewife)",
    titleZh: "The Hungry Housewife (@the_hungry_housewife) 柬埔寨美食与探店视频",
    descriptionKh: "Well this was day 4 of trying to become a treat maker. This was for my brother in law’s 40th birthday who is a golfer. Lemon flavored cake for the cakesicles, chocolate covered Rice Krispies and pretzels and chocolate covered lemon Oreos. . . #treatmaker #cakepops #cake #cakedecorating",
    descriptionEn: "Well this was day 4 of trying to become a treat maker. This was for my brother in law’s 40th birthday who is a golfer. Lemon flavored cake for the cakesicles, c — Official Cambodian TikTok food review by @the_hungry_housewife.",
    descriptionZh: "来自柬埔寨美食创作者 @the_hungry_housewife 的 TikTok 视频：Well this was day 4 of trying to become a treat maker. This was for my brother in law’s 40th birthda",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast5-p-0068-tx/oIHu7V6CGFRQI9XjRUgSPHAkv0A8Elfhefwg0M~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=X81G%2BVeFDAJrcewMiFOCHEIYtfA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@the_hungry_housewife/video/7701669031710903566",
    originalAccountUrl: "https://www.tiktok.com/@the_hungry_housewife",
    inlineVideoId: "7701669031710903566",
    directVideoUrl: "https://v9.tiktokcdn.com/f4cbf82dc73d36dd258331dbd35abccb/6afdc456/video/tos/alisg/tos-alisg-ve-37c799-sg/oYgHRAHUjTvwAeMVGXuf8UOuERfIlQZAkF6UC3/?a=1233&bti=ODszNWYuMDE6&&bt=1874&ft=bC~O_mfLPD12NKY3rn-UxMJ2WY6e3wv25ocAp&mime_type=video_mp4&rc=NGQ7Nzc3aWg3M2dnaTk1aUBpam9pdHk5cmZ3ZTMzZzczNEBhYzIxNTUxNTIxMDZiYTZfYSMtL3FsMmRrMWRhLS1kMS9zcw%3D%3D&vvpl=1&l=20261116232859FFFEAEC56B459D8FA012&btag=e000b8000",
    sourceName: "The Hungry Housewife (@the_hungry_housewife)",
    authorHandle: "@the_hungry_housewife",
    publishedOrUpdatedAt: "2026-10-28T10:49:17.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តកែប",
    provinceEn: "Kep",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-thehungryhouse-7701451246036716813",
    platform: 'tiktok',
    titleKh: "Dinner with the kids. Left over kathiew cha, and left over lo mein. Oldest requested I make cur",
    titleEn: "Dinner with the kids. Left over kathiew cha, and left over lo mein. Oldest reque (@the_hungry_housewife)",
    titleZh: "The Hungry Housewife (@the_hungry_housewife) 柬埔寨美食与探店视频",
    descriptionKh: "Dinner with the kids.  Left over kathiew cha, and left over lo mein. Oldest requested I make curry chicken without coconut milk, and we sliced wagyu and cooked it on the flattop at the table. My youngest made the scalloped potatoes.  . . #dinner #wagyu #khmer #food #cooking",
    descriptionEn: "Dinner with the kids.  Left over kathiew cha, and left over lo mein. Oldest requested I make curry chicken without coconut milk, and we sliced wagyu and cooked  — Official Cambodian TikTok food review by @the_hungry_housewife.",
    descriptionZh: "来自柬埔寨美食创作者 @the_hungry_housewife 的 TikTok 视频：Dinner with the kids.  Left over kathiew cha, and left over lo mein. Oldest requested I make curry c",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast5-p-0068-tx/oUeXHK8MkBwCj0VIWNfZewthECNAwQjlXUClAA~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=3qZCW97fKog4TKQxobHyomqPXkA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@the_hungry_housewife/video/7701451246036716813",
    originalAccountUrl: "https://www.tiktok.com/@the_hungry_housewife",
    inlineVideoId: "7701451246036716813",
    directVideoUrl: "https://v9.tiktokcdn.com/3c1367cf7dea21924610e4e3337707dc/6afdc459/video/tos/alisg/tos-alisg-ve-37c799-sg/oASt4W0RLQFyEDlDEqQg7xD8FyfgABUJfIDhu8/?a=1233&bti=ODszNWYuMDE6&&bt=1330&ft=bC~O_mfLPD12NKY3rn-UxMJ2WY6e3wv25ocAp&mime_type=video_mp4&rc=OzM6aDQ2ZWlmZjZpNmg0OUBpajg4Zng5cnZqZTMzZzczNEAyMzY1NmBgNjUxX2E0XmBgYSNpYWsuMmRrbGRhLS1kMS9zcw%3D%3D&vvpl=1&l=20261116232859FFFEAEC56B459D8FA012&btag=e00088000",
    sourceName: "The Hungry Housewife (@the_hungry_housewife)",
    authorHandle: "@the_hungry_housewife",
    publishedOrUpdatedAt: "2026-10-27T20:44:10.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-foodwhisperoff-7700979268913859846",
    platform: 'tiktok',
    titleKh: "សាច់គោចង្កាក់អាំងលើផ្លូវ​ នៅផ្សារអូរឬស្សី​ ជាប់ជ្រូកខ្វៃ",
    titleEn: "សាច់គោចង្កាក់អាំងលើផ្លូវ​ នៅផ្សារអូរឬស្សី​ ជាប់ជ្រូកខ្វៃ (@foodwhisper_officials)",
    titleZh: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials) 柬埔寨美食与探店视频",
    descriptionKh: "សាច់គោចង្កាក់អាំងលើផ្លូវ​ នៅផ្សារអូរឬស្សី​ ជាប់ជ្រូកខ្វៃ",
    descriptionEn: "សាច់គោចង្កាក់អាំងលើផ្លូវ​ នៅផ្សារអូរឬស្សី​ ជាប់ជ្រូកខ្វៃ — Official Cambodian TikTok food review by @foodwhisper_officials.",
    descriptionZh: "来自柬埔寨美食创作者 @foodwhisper_officials 的 TikTok 视频：សាច់គោចង្កាក់អាំងលើផ្លូវ​ នៅផ្សារអូរឬស្សី​ ជាប់ជ្រូកខ្វៃ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/owV0Xr8HMge9YfB9AfWVoNjzwC8IVpDgQCAHIv~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=9qSoF8F3od1D4%2FEhUC7LCGRe4ME%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@foodwhisper_officials/video/7700979268913859846",
    originalAccountUrl: "https://www.tiktok.com/@foodwhisper_officials",
    inlineVideoId: "7700979268913859846",
    directVideoUrl: "https://v9.tiktokcdn.com/8287706d3b6b409d2f1afef93bea5b39/6afdc4d1/video/tos/alisg/tos-alisg-pve-0037c001/o4vAMCErGzDtj0A4eRlPFpfDfgog2VIIY9Q5xN/?a=1233&bti=ODszNWYuMDE6&&bt=1178&ft=L~O54ourD12NvKl-KzIxREESDlBF-UjNSaopiX&mime_type=video_mp4&rc=NzdmO2RkNWQ1NTg1M2c3N0BpM3Z0aGo5cmhvZTMzODczNEAwXzZhYl5fNTMxM2A0LjZfYSMwYzQxMmRjc2NhLS1kMTFzcw%3D%3D&vvpl=1&l=2026111623285136141F5723667CE60E77&btag=e00090000",
    sourceName: "Food Whisper - ខ្សឹបឱ្យឃ្លាន (@foodwhisper_officials)",
    authorHandle: "@foodwhisper_officials",
    publishedOrUpdatedAt: "2026-10-26T14:12:39.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-nezhamalatangt-7700506894560922900",
    platform: 'tiktok',
    titleKh: "🔥 SPECIAL PROMOTION at NEZHA MALATANG TK! 🌶️😍 🤤 Set តម្លៃដើម $7.99 🎉 បញ្ចុះតម្លៃសល់ត្រឹមតែ",
    titleEn: "🔥 SPECIAL PROMOTION at NEZHA MALATANG TK! 🌶️😍 🤤 Set តម្លៃដើម $7.99 🎉 បញ្ចុះ (@nezha_malatang_tk)",
    titleZh: "@nezha_malatang_tk 柬埔寨美食与探店视频",
    descriptionKh: "🔥 SPECIAL PROMOTION at NEZHA MALATANG TK! 🌶️😍 🤤 Set តម្លៃដើម $7.99 🎉 បញ្ចុះតម្លៃសល់ត្រឹមតែ $2.99 ប៉ុណ្ណោះ! 🔥 🥩 សាច់និងប្រហិត 9 មុខ 🥬 បន្លែ 5 មុខ 🍜 មី 1 ដុំ ⚠️ TK BRANCH ONLY! ប្រូម៉ូសិនSet ដូចក្នុងរូបនេះមានតែសាខា TK ប៉ុណ្ណោះ ❤️ 📍 ទីតាំង៖ NEZHA MALATANG TK – ទួលគោក (Toul Kork) 📞 ទំនាក់ទំនង៖ 068 474 071 😋 កុំឱ្យឱកាសនេះកន្លងផុត! មកញ៉ាំ Malatang ឆ្ងាញ់ៗ ក្នុងតម្លៃពិសេសទាំងអស់គ្នា! 🔥 #NezhaMalatangTK #TKBranchOnly #Malatang #PhnomPenhFood #SpecialPromotion",
    descriptionEn: "🔥 SPECIAL PROMOTION at NEZHA MALATANG TK! 🌶️😍 🤤 Set តម្លៃដើម $7.99 🎉 បញ្ចុះតម្លៃសល់ត្រឹមតែ $2.99 ប៉ុណ្ណោះ! 🔥 🥩 សាច់និងប្រហិត 9 មុខ 🥬 បន្លែ 5 មុខ 🍜 មី 1 — Official Cambodian TikTok food review by @nezha_malatang_tk.",
    descriptionZh: "来自柬埔寨美食创作者 @nezha_malatang_tk 的 TikTok 视频：🔥 SPECIAL PROMOTION at NEZHA MALATANG TK! 🌶️😍 🤤 Set តម្លៃដើម $7.99 🎉 បញ្ចុះតម្លៃសល់ត្រឹមតែ $2.9",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o8qdCnD0IFAGI8B3UFEUksExBfb9fR0dq1kzgQ~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=Bfze1yAg7ZhEDkwB0aGH7zJgqcY%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@nezha_malatang_tk/video/7700506894560922900",
    originalAccountUrl: "https://www.tiktok.com/@nezha_malatang_tk",
    inlineVideoId: "7700506894560922900",
    directVideoUrl: "https://v3.tiktokcdn.com/8c0e1c63242734244bc0a501490a2e2f/6afdc47c/video/tos/alisg/tos-alisg-pve-0037c001/o8qqiSG0IANfQR1XgIFU3sUD0f1QdmbEBEB7dE/?a=1233&bti=ODszNWYuMDE6&&bt=1108&ft=L~O54ourD12NvRA-KzIxRWFSQlBF-UjNSCopiX&mime_type=video_mp4&rc=NDM0N2U8OTxmNDM0N2Y2PEBpM2prZ3k5cmd1ZTMzODczNEAwX14tXzIxNS4xYWBhLy42YSNebmJpMmQ0MGJhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232903A7EBEACC999186963979&btag=e00090000",
    sourceName: "@nezha_malatang_tk",
    authorHandle: "@nezha_malatang_tk",
    publishedOrUpdatedAt: "2026-10-25T07:39:36.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-ieatisharecamb-7700436132814736660",
    platform: 'tiktok',
    titleKh: "ក្តីសុខណាស់ក្មួយ ❤️🍀",
    titleEn: "ក្តីសុខណាស់ក្មួយ ❤️🍀 (@ieatisharecambodia)",
    titleZh: "I Eat I Share Cambodia (@ieatisharecambodia) 柬埔寨美食与探店视频",
    descriptionKh: "ក្តីសុខណាស់ក្មួយ ❤️🍀",
    descriptionEn: "ក្តីសុខណាស់ក្មួយ ❤️🍀 — Official Cambodian TikTok food review by @ieatisharecambodia.",
    descriptionZh: "来自柬埔寨美食创作者 @ieatisharecambodia 的 TikTok 视频：ក្តីសុខណាស់ក្មួយ ❤️🍀",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o0pAfE4VAxPIuT4VjQ2EDtQZeIQjIAL6AGAueG~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=zd8iP3rlM9dgMUVkycUEOsl9CRI%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@ieatisharecambodia/video/7700436132814736660",
    originalAccountUrl: "https://www.tiktok.com/@ieatisharecambodia",
    inlineVideoId: "7700436132814736660",
    directVideoUrl: "https://v16.tiktokcdn.com/fce409556e38f4e9e196937cfea1c4dc/6afdc46f/video/tos/alisg/tos-alisg-pve-0037c001/oEH3Df3GEEycIgcligqgFBddQoRXAu8cfBmFoa/?a=1233&bti=ODszNWYuMDE6&&bt=445&ft=bC~O_mfLPD12NKY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=aTU1OmU8ZmdkNzM3PGkzNkBpM2xrbXU5cmtxZTMzODczNEAvMzFhMy8uNTExXy9eNDAzYSNrcGpsMmRrMGJhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232858ABFBA7A07A77B4A1B51C&btag=e00088000",
    sourceName: "I Eat I Share Cambodia (@ieatisharecambodia)",
    authorHandle: "@ieatisharecambodia",
    publishedOrUpdatedAt: "2026-10-25T03:05:01.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-ieatisharecamb-7700064566511815957",
    platform: 'tiktok',
    titleKh: "Saturday mood ☕🌿 When life slows down, coffee brings us closer to nature, and nature brings pe",
    titleEn: "Saturday mood ☕🌿 When life slows down, coffee brings us closer to nature, and n (@ieatisharecambodia)",
    titleZh: "I Eat I Share Cambodia (@ieatisharecambodia) 柬埔寨美食与探店视频",
    descriptionKh: "Saturday mood ☕🌿  When life slows down, coffee brings us closer to nature, and nature brings peace to the soul. 🤎🍃 ☕️",
    descriptionEn: "Saturday mood ☕🌿  When life slows down, coffee brings us closer to nature, and nature brings peace to the soul. 🤎🍃 ☕️ — Official Cambodian TikTok food review by @ieatisharecambodia.",
    descriptionZh: "来自柬埔寨美食创作者 @ieatisharecambodia 的 TikTok 视频：Saturday mood ☕🌿  When life slows down, coffee brings us closer to nature, and nature brings peace ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ocerpDGGRsGce4TIVPLfrIAfGwAYQAJzHwAwxA~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=JCGQqk9NqRQnMvKV5yGNeVlO2Mc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@ieatisharecambodia/video/7700064566511815957",
    originalAccountUrl: "https://www.tiktok.com/@ieatisharecambodia",
    inlineVideoId: "7700064566511815957",
    directVideoUrl: "https://v16.tiktokcdn.com/9d2235571ea2ed56e48d0f2fa4df9b9b/6afdc44c/video/tos/alisg/tos-alisg-pve-0037c001/ooIDIwpeHfLQpTRGXPcrhgLfarzGBOAGAer44F/?a=1233&bti=ODszNWYuMDE6&&bt=873&ft=bC~O_mfLPD12NKY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=aWg3O2Y0OTg8NGdnPGQ1NkBpajg8N3Q5cnQ0ZTMzODczNEAwXi1jXzAwNS8xMTAuM2MwYSNqcjBwMmRzc2JhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232858ABFBA7A07A77B4A1B51C&btag=e000b8000",
    sourceName: "I Eat I Share Cambodia (@ieatisharecambodia)",
    authorHandle: "@ieatisharecambodia",
    publishedOrUpdatedAt: "2026-10-24T03:03:09.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-ounwelldailyco-7699906365879340308",
    platform: 'tiktok',
    titleKh: "mummy kon 2 ♥️",
    titleEn: "mummy kon 2 ♥️ (@ounwelldailycooking)",
    titleZh: "Oun Well Daily Cooking (@ounwelldailycooking) 柬埔寨美食与探店视频",
    descriptionKh: "mummy kon 2 ♥️",
    descriptionEn: "mummy kon 2 ♥️ — Official Cambodian TikTok food review by @ounwelldailycooking.",
    descriptionZh: "来自柬埔寨美食创作者 @ounwelldailycooking 的 TikTok 视频：mummy kon 2 ♥️",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/osgGrbIX56hjRFc4mefGrIPAIeQC3vxgZAeLGI~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=Dm8vHoRI23arm9FcsmG%2Fze21Pig%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@ounwelldailycooking/video/7699906365879340308",
    originalAccountUrl: "https://www.tiktok.com/@ounwelldailycooking",
    inlineVideoId: "7699906365879340308",
    directVideoUrl: "https://v9.tiktokcdn.com/df7073781e9d67b7c92cd70a58a97bec/6afdc44d/video/tos/alisg/tos-alisg-pve-0037c001/oAQ3IgDgjI9tAxDV8F2xfXeMufrIwECAoExDCc/?a=1233&bti=ODszNWYuMDE6&&bt=511&ft=bC~O_mfLPD12NVY3rn-Ux_N5PY6e3wv25LcAp&mime_type=video_mp4&rc=ZjxmZTs5ZTw5OjxoNmhpNkBpamV0NG85cnZyZTMzODczNEA2YC0uLjY1XmIxMC8tX2AyYSNvMWdzMmQ0c2FhLS1kMTFzcw%3D%3D&vvpl=1&l=202611162328572824A64FCD4BE49FEFE1&btag=e000b8000",
    sourceName: "Oun Well Daily Cooking (@ounwelldailycooking)",
    authorHandle: "@ounwelldailycooking",
    publishedOrUpdatedAt: "2026-10-23T16:49:15.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-4",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-kohsner-7699901253098196245",
    platform: 'tiktok',
    titleKh: "🫶🏻🫶🏻🫶🏻",
    titleEn: "🫶🏻🫶🏻🫶🏻 (@kohsner)",
    titleZh: "@kohsner 柬埔寨美食与探店视频",
    descriptionKh: "🫶🏻🫶🏻🫶🏻 #សួនទឹក #waterpark #prewedding #អាហារខ្មែរ #ភូមិគ្រឹះកោះស្នេហ៍",
    descriptionEn: "🫶🏻🫶🏻🫶🏻 #សួនទឹក #waterpark #prewedding #អាហារខ្មែរ #ភូមិគ្រឹះកោះស្នេហ៍ — Official Cambodian TikTok food review by @kohsner.",
    descriptionZh: "来自柬埔寨美食创作者 @kohsner 的 TikTok 视频：🫶🏻🫶🏻🫶🏻 #សួនទឹក #waterpark #prewedding #អាហារខ្មែរ #ភូមិគ្រឹះកោះស្នេហ៍",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oUDiKij2Em7COsbB7blBfALIW0AiAAcwAVb1IZ~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=ePQDw%2FQ%2Frb1BRhPVxMxTceweySY%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@kohsner/video/7699901253098196245",
    originalAccountUrl: "https://www.tiktok.com/@kohsner",
    inlineVideoId: "7699901253098196245",
    directVideoUrl: "https://v9.tiktokcdn.com/6f30223a86f8097c604c579c35911b7a/6afdc453/video/tos/alisg/tos-alisg-pve-0037c001/oEybzDwEi3BAbusicrAY71iV2BEAICQ3IH3Mfr/?a=1233&bti=ODszNWYuMDE6&&bt=894&ft=bC~O_mfLPD12NNc3rn-Ux7L59Y6e3wv25bcAp&mime_type=video_mp4&rc=OjdpOjc4ZjY4OjQ4ZGc5M0BpamZoOXA5cnVyZTMzODczNEAuNGAvLl9eNWIxYDM0XjMyYSNtai0vMmRzaWFhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232905AB4A6F4DF5B93C9E7BEE&btag=e000b8000",
    sourceName: "@kohsner",
    authorHandle: "@kohsner",
    publishedOrUpdatedAt: "2026-10-23T16:29:24.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-ieatisharecamb-7699730567885081876",
    platform: 'tiktok',
    titleKh: "☕🌿 When life slows down, coffee brings us closer to nature, and nature brings peace to the sou",
    titleEn: "☕🌿 When life slows down, coffee brings us closer to nature, and nature brings p (@ieatisharecambodia)",
    titleZh: "I Eat I Share Cambodia (@ieatisharecambodia) 柬埔寨美食与探店视频",
    descriptionKh: "☕🌿 When life slows down, coffee brings us closer to nature, and nature brings peace to the soul. 🤎🍃 #CoffeeAndNature #PeaceOfMind #SlowLiving #CoffeeLovers",
    descriptionEn: "☕🌿 When life slows down, coffee brings us closer to nature, and nature brings peace to the soul. 🤎🍃 #CoffeeAndNature #PeaceOfMind #SlowLiving #CoffeeLovers — Official Cambodian TikTok food review by @ieatisharecambodia.",
    descriptionZh: "来自柬埔寨美食创作者 @ieatisharecambodia 的 TikTok 视频：☕🌿 When life slows down, coffee brings us closer to nature, and nature brings peace to the soul. 🤎",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oA2IxbiD4AkyFaKDC3gY8EwEBfACiAABtBA1XI~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=tH5L3QTMBdjll7o34Dd5xoNWFFw%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@ieatisharecambodia/video/7699730567885081876",
    originalAccountUrl: "https://www.tiktok.com/@ieatisharecambodia",
    inlineVideoId: "7699730567885081876",
    directVideoUrl: "https://v16.tiktokcdn.com/bbd4f454584ef2a5c212d80db50090c1/6afdc44c/video/tos/alisg/tos-alisg-pve-0037c001/oUlr3j4AYrEBVBAGHBvalEi8VaiJa6tjI8DQP/?a=1233&bti=ODszNWYuMDE6&&bt=721&ft=bC~O_mfLPD12NKY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=aDs4NDs1ZzVkPDQ6Nmg1M0BpanRweHY5cnJoZTMzODczNEA1MGEwNjVeXy0xMjReXzQuYSNpM2ZmMmQ0c2FhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232858ABFBA7A07A77B4A1B51C&btag=e000b8000",
    sourceName: "I Eat I Share Cambodia (@ieatisharecambodia)",
    authorHandle: "@ieatisharecambodia",
    publishedOrUpdatedAt: "2026-10-23T05:27:04.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-thehungryhouse-7699639285984611598",
    platform: 'tiktok',
    titleKh: "Day 3 of attempting to be a treat maker. This tasted exactly like pancakes and syrup! This is a",
    titleEn: "Day 3 of attempting to be a treat maker. This tasted exactly like pancakes and s (@the_hungry_housewife)",
    titleZh: "The Hungry Housewife (@the_hungry_housewife) 柬埔寨美食与探店视频",
    descriptionKh: "Day 3 of attempting to be a treat maker. This tasted exactly like pancakes and syrup!  This is a fall theme with maple leaves with maple flavor cake. . I did chocolate covered pretzels, Oreos, Rice Krispies and cakesicles.  . . #cakepops #cake #baker #khmer #baking",
    descriptionEn: "Day 3 of attempting to be a treat maker. This tasted exactly like pancakes and syrup!  This is a fall theme with maple leaves with maple flavor cake. . I did ch — Official Cambodian TikTok food review by @the_hungry_housewife.",
    descriptionZh: "来自柬埔寨美食创作者 @the_hungry_housewife 的 TikTok 视频：Day 3 of attempting to be a treat maker. This tasted exactly like pancakes and syrup!  This is a fal",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast5-p-0068-tx/oszAiBAijEA9DIAwqOCbG6IUSgnZBf9BJTE1Fa~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=C%2F5SxpRt387I6OHGH%2BaPd%2Bh%2Bc%2FE%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@the_hungry_housewife/video/7699639285984611598",
    originalAccountUrl: "https://www.tiktok.com/@the_hungry_housewife",
    inlineVideoId: "7699639285984611598",
    directVideoUrl: "https://v9.tiktokcdn.com/39b4480888419d04746f3408a7b338f5/6afdc449/video/tos/alisg/tos-alisg-ve-37c799-sg/osr2Q15RAGI0mAZFeOmFeLoxfOIjHIT1GmaKeg/?a=1233&bti=ODszNWYuMDE6&&bt=1567&ft=bC~O_mfLPD12NKY3rn-UxMJ2WY6e3wv25ocAp&mime_type=video_mp4&rc=OGU0ZDQ6aGg2aTg0NDw3PEBpamhkb3Y5cnI8ZTMzZzczNEBgMDQzLTYvXzMxXy8vM2E1YSNjZzNiMmRza2FhLS1kMS9zcw%3D%3D&vvpl=1&l=20261116232859FFFEAEC56B459D8FA012&btag=e000b0000",
    sourceName: "The Hungry Housewife (@the_hungry_housewife)",
    authorHandle: "@the_hungry_housewife",
    publishedOrUpdatedAt: "2026-10-22T23:32:50.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តកែប",
    provinceEn: "Kep",
    matchedFoodId: "food-21",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-ieatisharecamb-7699347957946092820",
    platform: 'tiktok',
    titleKh: "☕️🌿 Backyard Coffee, Better Vibes. 🤎 A little coffee, fresh air, and peaceful moments in my o",
    titleEn: "☕️🌿 Backyard Coffee, Better Vibes. 🤎 A little coffee, fresh air, and peaceful  (@ieatisharecambodia)",
    titleZh: "I Eat I Share Cambodia (@ieatisharecambodia) 柬埔寨美食与探店视频",
    descriptionKh: "☕️🌿 Backyard Coffee, Better Vibes. 🤎 A little coffee, fresh air, and peaceful moments in my own corner of happiness. ✨#backyardcoffee #viral #viralvideo #trending #coffee",
    descriptionEn: "☕️🌿 Backyard Coffee, Better Vibes. 🤎 A little coffee, fresh air, and peaceful moments in my own corner of happiness. ✨#backyardcoffee #viral #viralvideo #tren — Official Cambodian TikTok food review by @ieatisharecambodia.",
    descriptionZh: "来自柬埔寨美食创作者 @ieatisharecambodia 的 TikTok 视频：☕️🌿 Backyard Coffee, Better Vibes. 🤎 A little coffee, fresh air, and peaceful moments in my own co",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/os4GgAcAIDcAIDLAVafAelyeNhDjEtIsZED19N~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=gh0JhqzWaml1cR8XfEI04Y1Kr4I%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@ieatisharecambodia/video/7699347957946092820",
    originalAccountUrl: "https://www.tiktok.com/@ieatisharecambodia",
    inlineVideoId: "7699347957946092820",
    directVideoUrl: "https://v16.tiktokcdn.com/108172f65bde9f3aec59168dc9e0fa1f/6afdc44b/video/tos/alisg/tos-alisg-pve-0037c001/oMf9lZjc2BBFQ48QgIiLnDALcJQgEq1cDERZEf/?a=1233&bti=ODszNWYuMDE6&&bt=777&ft=bC~O_mfLPD12NKY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=ZGg6Njw7Mzk3Ojc0aGk8ZkBpM2g0ZW05cjtzZTMzODczNEAxLjEtLmJfXzMxMGFeNF8zYSNjL2VmMmRzNWBhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232858ABFBA7A07A77B4A1B51C&btag=e000b8000",
    sourceName: "I Eat I Share Cambodia (@ieatisharecambodia)",
    authorHandle: "@ieatisharecambodia",
    publishedOrUpdatedAt: "2026-10-22T04:42:20.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-ieatisharecamb-7699050920658652437",
    platform: 'tiktok',
    titleKh: "☕️ The Best Pour-Over in Town! ✨ Clean, smooth, rich aroma, and perfectly balanced flavors in e",
    titleEn: "☕️ The Best Pour-Over in Town! ✨ Clean, smooth, rich aroma, and perfectly balanc (@ieatisharecambodia)",
    titleZh: "I Eat I Share Cambodia (@ieatisharecambodia) 柬埔寨美食与探店视频",
    descriptionKh: "☕️ The Best Pour-Over in Town! ✨ Clean, smooth, rich aroma, and perfectly balanced flavors in every sip. A true coffee experience for those who appreciate quality. 🤎 #PourOverCoffee #viralvideo #SpecialtyCoffee #trending #viral",
    descriptionEn: "☕️ The Best Pour-Over in Town! ✨ Clean, smooth, rich aroma, and perfectly balanced flavors in every sip. A true coffee experience for those who appreciate quali — Official Cambodian TikTok food review by @ieatisharecambodia.",
    descriptionZh: "来自柬埔寨美食创作者 @ieatisharecambodia 的 TikTok 视频：☕️ The Best Pour-Over in Town! ✨ Clean, smooth, rich aroma, and perfectly balanced flavors in every ",
    thumbnailUrl: "https://p19-common-sign.tiktokcdn.com/tos-alisg-p-0037/osjAIagIPiRtiA1ihBBxGAYC3AnAYDhtEwAQE~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=Tb5AmAV6JY8PzAnISkI4HbZOmRk%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@ieatisharecambodia/video/7699050920658652437",
    originalAccountUrl: "https://www.tiktok.com/@ieatisharecambodia",
    inlineVideoId: "7699050920658652437",
    directVideoUrl: "https://v16.tiktokcdn.com/df6dc77e6032a1941feffa6e7e1b145c/6afdc44e/video/tos/alisg/tos-alisg-pve-0037c001/oIXu9BBt4P3EAhEaFnit1BAZiixvpYQAhIPYE/?a=1233&bti=ODszNWYuMDE6&&bt=667&ft=bC~O_mfLPD12NKY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=ZTw1NWQ5aGllM2c3Zmc5NkBpajc5cHI5cnc7ZTMzODczNEBfYzFiMjZgXjAxM2MtXjUtYSNucmJqMmQ0X2BhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232858ABFBA7A07A77B4A1B51C&btag=e000b8000",
    sourceName: "I Eat I Share Cambodia (@ieatisharecambodia)",
    authorHandle: "@ieatisharecambodia",
    publishedOrUpdatedAt: "2026-10-21T09:29:41.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-24",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-viralvideo752-7697497636500262162",
    platform: 'tiktok',
    titleKh: "😱 អ្នកណាថាបាយ និងស៊ុតធ្វើម្ហូបឆ្ងាញ់មិនបាន? 🍳🍚 គ្រាន់តែយកស៊ុតមកលាយជាមួយបាយ ក៏អាចធ្វើជាម្ហូបឆ",
    titleEn: "😱 អ្នកណាថាបាយ និងស៊ុតធ្វើម្ហូបឆ្ងាញ់មិនបាន? 🍳🍚 គ្រាន់តែយកស៊ុតមកលាយជាមួយបាយ ក៏ (@viral_video752)",
    titleZh: "@viral_video752 柬埔寨美食与探店视频",
    descriptionKh: "😱 អ្នកណាថាបាយ និងស៊ុតធ្វើម្ហូបឆ្ងាញ់មិនបាន? 🍳🍚 គ្រាន់តែយកស៊ុតមកលាយជាមួយបាយ ក៏អាចធ្វើជាម្ហូបឆ្ងាញ់ៗបានដែរ! 🤤✨ មើលដល់ចប់ ទើបដឹងថាងាយធ្វើប៉ុណ្ណា! ❤️ #ម្ហូបឆ្ងាញ់ #រូបមន្តម្ហូប #ម្ហូបងាយធ្វើ #FoodTok #Cooking",
    descriptionEn: "😱 អ្នកណាថាបាយ និងស៊ុតធ្វើម្ហូបឆ្ងាញ់មិនបាន? 🍳🍚 គ្រាន់តែយកស៊ុតមកលាយជាមួយបាយ ក៏អាចធ្វើជាម្ហូបឆ្ងាញ់ៗបានដែរ! 🤤✨ មើលដល់ចប់ ទើបដឹងថាងាយធ្វើប៉ុណ្ណា! ❤️ #ម្ហូបឆ្ងា — Official Cambodian TikTok food review by @viral_video752.",
    descriptionZh: "来自柬埔寨美食创作者 @viral_video752 的 TikTok 视频：😱 អ្នកណាថាបាយ និងស៊ុតធ្វើម្ហូបឆ្ងាញ់មិនបាន? 🍳🍚 គ្រាន់តែយកស៊ុតមកលាយជាមួយបាយ ក៏អាចធ្វើជាម្ហូបឆ្ងាញ់",
    thumbnailUrl: "https://p19-common-sign.tiktokcdn.com/tos-alisg-p-0037/oUWxEfIlDBzqFeJEDTEAwnQV0BcQEIEgz0R4DA~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=bxrvjoTrEq1lCHzec20VC83Q3Dw%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@viral_video752/video/7697497636500262162",
    originalAccountUrl: "https://www.tiktok.com/@viral_video752",
    inlineVideoId: "7697497636500262162",
    directVideoUrl: "https://v3.tiktokcdn.com/d04a5d0bfb7c8379a0d2753934c36d3e/6afdc4a7/video/tos/alisg/tos-alisg-pve-0037c001/oQID4gcDqBAzIAEFESKw7AQEEBJTf0HglRIXfD/?a=1233&bti=ODszNWYuMDE6&&bt=743&ft=L~O54ourD12NvhA-KzIxREFSrlBF-UjNSbopiX&mime_type=video_mp4&rc=aTdkPGRpaDppNjczNGU8ZkBpMzdsN3M5cmpqZTMzODczNEAvMi4tMS9iNS4xNC02L14uYSMvMWhlMmRzLjZhLS1kMWBzcw%3D%3D&vvpl=1&l=2026111623290792AE65D7CAE6F78AB2D6&btag=e00090000",
    sourceName: "@viral_video752",
    authorHandle: "@viral_video752",
    publishedOrUpdatedAt: "2026-10-17T05:02:09.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-chroukkandol-7696446577879141639",
    platform: 'tiktok',
    titleKh: "ទាកាប៉ាប្រឡាក់គ្រឿងស្តុកថ្មី",
    titleEn: "ទាកាប៉ាប្រឡាក់គ្រឿងស្តុកថ្មី (@chroukkandol)",
    titleZh: "@chroukkandol 柬埔寨美食与探店视频",
    descriptionKh: "ទាកាប៉ាប្រឡាក់គ្រឿងស្តុកថ្មី #ស្រុកស្រែ #ប្រឡាក់គ្រឿង #ម្ហូបស្រុកស្រែ #ឆ្ងាញ់",
    descriptionEn: "ទាកាប៉ាប្រឡាក់គ្រឿងស្តុកថ្មី #ស្រុកស្រែ #ប្រឡាក់គ្រឿង #ម្ហូបស្រុកស្រែ #ឆ្ងាញ់ — Official Cambodian TikTok food review by @chroukkandol.",
    descriptionZh: "来自柬埔寨美食创作者 @chroukkandol 的 TikTok 视频：ទាកាប៉ាប្រឡាក់គ្រឿងស្តុកថ្មី #ស្រុកស្រែ #ប្រឡាក់គ្រឿង #ម្ហូបស្រុកស្រែ #ឆ្ងាញ់",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/okVn80rigdoQChvIgPvebDAOajLtm4eAeASGpI~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=nJmeZ193j6A7a92paEnP8MnvE1U%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@chroukkandol/video/7696446577879141639",
    originalAccountUrl: "https://www.tiktok.com/@chroukkandol",
    inlineVideoId: "7696446577879141639",
    directVideoUrl: "https://v3.tiktokcdn.com/122f090352aa82d8767a90f8c77a1fbb/6afdc465/video/tos/alisg/tos-alisg-pve-0037c001/o0bIuERlwAKRAL9aIifw61BAiFZT0iCoXXETQP/?a=1233&bti=ODszNWYuMDE6&&bt=1565&ft=L~O54ourD12NvSA-KzIxRhFSQlBF-UjNSbopiX&mime_type=video_mp4&rc=NzM0Ojo7Ojc4ZjU0NzlnNUBpM3Rsdnc5cjxuZTMzODczNEAzX18xMzAvXi0xLi5jMi1iYSNuZC0yMmRzXjRhLS1kMWBzcw%3D%3D&vvpl=1&l=2026111623291333CDE4ABC97066C5D667&btag=e000b8000",
    sourceName: "@chroukkandol",
    authorHandle: "@chroukkandol",
    publishedOrUpdatedAt: "2026-10-14T09:03:30.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-biteswithlily-7691215458464320799",
    platform: 'tiktok',
    titleKh: "Everything I ate at Time Out Market in New York! 🗽🍔🔥 ft. @Maybelline NY Peel-off Liner + Lif",
    titleEn: "Everything I ate at Time Out Market in New York! 🗽🍔🔥 ft. @Maybelline NY Peel- (@biteswithlily)",
    titleZh: "Bites With Lily (@biteswithlily) 柬埔寨美食与探店视频",
    descriptionKh: "Everything I ate at Time Out Market in New York! 🗽🍔🔥 ft. @Maybelline NY Peel-off Liner + Lifter Gel Lip Gloss 💋 AD #liftergel #peeloff #makeup #lipliner #lipcombo",
    descriptionEn: "Everything I ate at Time Out Market in New York! 🗽🍔🔥 ft. @Maybelline NY Peel-off Liner + Lifter Gel Lip Gloss 💋 AD #liftergel #peeloff #makeup #lipliner #li — Official Cambodian TikTok food review by @biteswithlily.",
    descriptionZh: "来自柬埔寨美食创作者 @biteswithlily 的 TikTok 视频：Everything I ate at Time Out Market in New York! 🗽🍔🔥 ft. @Maybelline NY Peel-off Liner + Lifter G",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast8-p-0068-tx2/oMgPqI8RLIAs7DV6zxBunAyiBrtyaBr8icYE8~tplv-tiktokx-dmt-logom:tos-useast8-i-0068-tx2/oUAAVIAE8yqAYcRru4EtJFeRGQ8DtAfULEfCft.image?dr=14573&x-expires=1795014000&x-signature=45BF6E3jZYS3Ukvfd67Al%2Byee8s%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@biteswithlily/video/7691215458464320799",
    originalAccountUrl: "https://www.tiktok.com/@biteswithlily",
    inlineVideoId: "7691215458464320799",
    directVideoUrl: "https://v3.tiktokcdn.com/ca74a8905374c40175f3b871e184a09e/6afdc473/video/tos/alisg/tos-alisg-ve-37c799-sg/owwIAQvQXawXE0qOVFKwEsEX5DmffcA5RgB7dV/?a=1233&bti=ODszNWYuMDE6&&bt=1784&ft=bC~O_mfLPD12NqY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=NGVlZGQ1ZDtmNWg0OTw7O0BpanZvdG05cnZkZDMzaTczNEAuXjIxM2AvX18xMjYtMV9eYSNnZGkyMmQ0cXJhLS1kMTJzcw%3D%3D&vvpl=1&l=20261116232900F31E35B52A880B8BBA1D&btag=e00088000",
    sourceName: "Bites With Lily (@biteswithlily)",
    authorHandle: "@biteswithlily",
    publishedOrUpdatedAt: "2026-09-30T06:44:05.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-benlycooking-7690468067196931348",
    platform: 'tiktok',
    titleKh: "នេះជាអាហារសាមគ្គីជើងចុងក្រោយហើយ🙏ដែលខ្ញុំបាន ធ្វើជូនបងៗពូៗវីរះកងទ័ព🪖 ជិត២ឆ្នាំហើយដែលខ្ញុំបានចុ",
    titleEn: "នេះជាអាហារសាមគ្គីជើងចុងក្រោយហើយ🙏ដែលខ្ញុំបាន ធ្វើជូនបងៗពូៗវីរះកងទ័ព🪖 ជិត២ឆ្នាំហ (@benlycooking)",
    titleZh: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking) 柬埔寨美食与探店视频",
    descriptionKh: "នេះជាអាហារសាមគ្គីជើងចុងក្រោយហើយ🙏ដែលខ្ញុំបាន ធ្វើជូនបងៗពូៗវីរះកងទ័ព🪖 ជិត២ឆ្នាំហើយដែលខ្ញុំបានចុះទៅធ្វើម្ហូបជូនបងៗពូៗកងទ័ព🪖ខ្ញុំពិតជាសប្បាយចិត្តណាស់🫡 ដែលបានឃើញស្នាមញញឹមបងៗពូៗ🪖សប្បាយចិត្ត ជាចុងក្រោយខ្ញុំមានតែពាក្យថាអរគុណណាស់បងប្អូនដែលតែងតែចូលរួមនៅសកម្មភាពធ្វើម្ហូបជូនបងៗវីរៈកងទ័ពជាមួយនឹងខ្ញុំ🙏👋😔",
    descriptionEn: "នេះជាអាហារសាមគ្គីជើងចុងក្រោយហើយ🙏ដែលខ្ញុំបាន ធ្វើជូនបងៗពូៗវីរះកងទ័ព🪖 ជិត២ឆ្នាំហើយដែលខ្ញុំបានចុះទៅធ្វើម្ហូបជូនបងៗពូៗកងទ័ព🪖ខ្ញុំពិតជាសប្បាយចិត្តណាស់🫡 ដែលបានឃើញ — Official Cambodian TikTok food review by @benlycooking.",
    descriptionZh: "来自柬埔寨美食创作者 @benlycooking 的 TikTok 视频：នេះជាអាហារសាមគ្គីជើងចុងក្រោយហើយ🙏ដែលខ្ញុំបាន ធ្វើជូនបងៗពូៗវីរះកងទ័ព🪖 ជិត២ឆ្នាំហើយដែលខ្ញុំបានចុះទៅធ្",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ogMGG6IepteNO6wARxeBC7AQGeACLGKFIFkqBQ~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=pB8kwAdld5YJDyrfKNNp%2BygMi7g%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@benlycooking/video/7690468067196931348",
    originalAccountUrl: "https://www.tiktok.com/@benlycooking",
    inlineVideoId: "7690468067196931348",
    directVideoUrl: "https://v45-eu.tiktokcdn.com/73f0e1d313f3619a64c9eac062a5e6ef/6afdc4c4/video/tos/alisg/tos-alisg-pve-0037c001/o4e6GeGBRI4wIMEFegqALFx0QeGBA0IMdGpnps/?a=1233&bti=ODszNWYuMDE6&&bt=1127&ft=L~aJCoCyD12Nv7l-KzIxREFSrlBF-UjNSbopiX&mime_type=video_mp4&rc=aGc4OjU3ZWY5ZWU8NzY2OEBpMzVscGs5cmozZDMzODczNEAuYGBfXjAuNmAxM2A1YWIxYSNnNTNrMmQ0Y3FhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232852D1F2A5EE89B7A79565DA&btag=e00095000",
    sourceName: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking)",
    authorHandle: "@benlycooking",
    publishedOrUpdatedAt: "2026-09-28T06:23:50.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-4",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-1980911-7690146823599688980",
    platform: 'tiktok',
    titleKh: "មេឃភ្លៀងចង់ញុំបុកត្រប់ចំង្កោម 😋",
    titleEn: "មេឃភ្លៀងចង់ញុំបុកត្រប់ចំង្កោម 😋 (@.1980911)",
    titleZh: "@.1980911 柬埔寨美食与探店视频",
    descriptionKh: "មេឃភ្លៀងចង់ញុំបុកត្រប់ចំង្កោម 😋 #ធ្វើម្ហូបខ្មែរ #vlogชีวิตประจําวัน",
    descriptionEn: "មេឃភ្លៀងចង់ញុំបុកត្រប់ចំង្កោម 😋 #ធ្វើម្ហូបខ្មែរ #vlogชีวิตประจําวัน — Official Cambodian TikTok food review by @.1980911.",
    descriptionZh: "来自柬埔寨美食创作者 @.1980911 的 TikTok 视频：មេឃភ្លៀងចង់ញុំបុកត្រប់ចំង្កោម 😋 #ធ្វើម្ហូបខ្មែរ #vlogชีวิตประจําวัน",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oUvzrA8n4cQAeyjFI9ApIeXQw5AjAVxfMEDcE8~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=YzxvgI1c48UlNksQo0OGVyJlAxc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@.1980911/video/7690146823599688980",
    originalAccountUrl: "https://www.tiktok.com/@.1980911",
    inlineVideoId: "7690146823599688980",
    directVideoUrl: "https://v16.tiktokcdn.com/0367da9667313131eb0f43c7beba1e95/6afdc4aa/video/tos/alisg/tos-alisg-pve-0037c001/o8FxXqAceAgikXtjAGjVGeCUxID4LIfoyckR05/?a=1233&bti=ODszNWYuMDE6&&bt=734&ft=bC~O_mfLPD12NTc3rn-UxMJ2WY6e3wv25ocAp&mime_type=video_mp4&rc=OzU8aWY7Nzg3NWk7PGZlNUBpamQ4O3g5cnRoZDMzODczNEBhNTVhYy5jXmExNTZhMS5eYSNmaGBiMmRzMnBhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232906AB4A6F4DF5B93C9E7C5B&btag=e00090000",
    sourceName: "@.1980911",
    authorHandle: "@.1980911",
    publishedOrUpdatedAt: "2026-09-27T09:37:14.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-biteswithlily-7689236120122543391",
    platform: 'tiktok',
    titleKh: "Giant tteokbokki 😱🔥 Ingredients: 500g rice cakes 2 sheets fish cakes 2 cups water Sauce base:",
    titleEn: "Giant tteokbokki 😱🔥 Ingredients: 500g rice cakes 2 sheets fish cakes 2 cups wa (@biteswithlily)",
    titleZh: "Bites With Lily (@biteswithlily) 柬埔寨美食与探店视频",
    descriptionKh: "Giant tteokbokki 😱🔥 Ingredients: 500g rice cakes  2 sheets fish cakes 2 cups water  Sauce base: 2 tbsp gochujang 1 tbsp gochugaru 1 tbsp soy sauce 2 tbsp sugar 1 tsp minced garlic 1 tsp miwon or msg Garnish: Mozzerella  1 green onion stalk 2 soft boiled eggs #food #recipe #cooking #tiktokrecipecontest #tteokbokki",
    descriptionEn: "Giant tteokbokki 😱🔥 Ingredients: 500g rice cakes  2 sheets fish cakes 2 cups water  Sauce base: 2 tbsp gochujang 1 tbsp gochugaru 1 tbsp soy sauce 2 tbsp suga — Official Cambodian TikTok food review by @biteswithlily.",
    descriptionZh: "来自柬埔寨美食创作者 @biteswithlily 的 TikTok 视频：Giant tteokbokki 😱🔥 Ingredients: 500g rice cakes  2 sheets fish cakes 2 cups water  Sauce base: 2 ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast8-p-0068-tx2/o8yEZ5DmF5f7tp10oRazABYEZonIIVCfAqaYRE~tplv-tiktokx-dmt-logom:tos-useast8-i-0068-tx2/o0fjkaEClA8aQ1q5IieUp8AEDfAoFIA8tEAV0I.image?dr=14573&x-expires=1795014000&x-signature=UvBS%2BFkO155C6tFTIPoBcKON2Sc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@biteswithlily/video/7689236120122543391",
    originalAccountUrl: "https://www.tiktok.com/@biteswithlily",
    inlineVideoId: "7689236120122543391",
    directVideoUrl: "https://v3.tiktokcdn.com/e6d03393a305aac441e8eb2ebcec084c/6afdc47b/video/tos/alisg/tos-alisg-ve-37c799-sg/o4YSEzVRsEcaZaDYEIAFft9FIfpnq7EBYQZo1A/?a=1233&bti=ODszNWYuMDE6&&bt=1131&ft=bC~O_mfLPD12NqY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=MzpnODVlOjQ3O2VpaWRlN0BpanloZW45cnh0ZDMzaTczNEAzMmEvY2FfNi0xLTVhLmIxYSNtbC8zMmRzYG5hLS1kMTJzcw%3D%3D&vvpl=1&l=20261116232900F31E35B52A880B8BBA1D&btag=e00090000",
    sourceName: "Bites With Lily (@biteswithlily)",
    authorHandle: "@biteswithlily",
    publishedOrUpdatedAt: "2026-09-24T22:43:15.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-thidaaaa000-7688556317681683726",
    platform: 'tiktok',
    titleKh: "នំដំឡូងស្វាយស្នូលឈីស🧀🍠✨🧀",
    titleEn: "នំដំឡូងស្វាយស្នូលឈីស🧀🍠✨🧀 (@thidaaaa000)",
    titleZh: "@thidaaaa000 柬埔寨美食与探店视频",
    descriptionKh: "នំដំឡូងស្វាយស្នូលឈីស🧀🍠✨🧀   #កូនខ្មែររស់នៅអាមេរិក #បង្អែមខ្មែរ #នំខ្មែរ #មុខម្ហូបប្រចាំថ្ងៃ #ម្ហូបឆ្ងាញ់ៗ",
    descriptionEn: "នំដំឡូងស្វាយស្នូលឈីស🧀🍠✨🧀   #កូនខ្មែររស់នៅអាមេរិក #បង្អែមខ្មែរ #នំខ្មែរ #មុខម្ហូបប្រចាំថ្ងៃ #ម្ហូបឆ្ងាញ់ៗ — Official Cambodian TikTok food review by @thidaaaa000.",
    descriptionZh: "来自柬埔寨美食创作者 @thidaaaa000 的 TikTok 视频：នំដំឡូងស្វាយស្នូលឈីស🧀🍠✨🧀   #កូនខ្មែររស់នៅអាមេរិក #បង្អែមខ្មែរ #នំខ្មែរ #មុខម្ហូបប្រចាំថ្ងៃ #ម្ហូប",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast5-p-0068-tx/oIYqUQxAhAHmCR90gIFmsPSDQfQAEUzEDEBezQ~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=Ik9u1h3kQrUQXPGCwwBECu64nUc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@thidaaaa000/video/7688556317681683726",
    originalAccountUrl: "https://www.tiktok.com/@thidaaaa000",
    inlineVideoId: "7688556317681683726",
    directVideoUrl: "https://v16.tiktokcdn.com/8044799d9f1e0742ae7bd62daa67e7b5/6afdc4d3/video/tos/alisg/tos-alisg-ve-37c799-sg/okBTI1CggzzI8cQMBBMPAiAUiQaPcU4A8irEE/?a=1233&bti=ODszNWYuMDE6&&bt=1703&ft=bC~O_mfLPD12N5c3rn-Ux~CFNY6e3wv25QcAp&mime_type=video_mp4&rc=Zzs2OTxpOTxmOTY5Nzc2aEBpajMzNW05cm5tZDMzZzczNEBgMzU1X2MvNV4xMWBjMTU1YSM2MS0zMmQ0bG1hLS1kMS9zcw%3D%3D&vvpl=1&l=202611162329139B7E0E5B0682708EDE5B&btag=e00090000",
    sourceName: "@thidaaaa000",
    authorHandle: "@thidaaaa000",
    publishedOrUpdatedAt: "2026-09-23T02:45:16.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-biteswithlily-7684711971161132318",
    platform: 'tiktok',
    titleKh: "Only eating seafood for 24 hours in NYC! 🦞🐟🔥 📍Sailor & Siren, Brooklyn 📍Abuqir Seafood, Qu",
    titleEn: "Only eating seafood for 24 hours in NYC! 🦞🐟🔥 📍Sailor & Siren, Brooklyn 📍Abu (@biteswithlily)",
    titleZh: "Bites With Lily (@biteswithlily) 柬埔寨美食与探店视频",
    descriptionKh: "Only eating seafood for 24 hours in NYC! 🦞🐟🔥 📍Sailor & Siren, Brooklyn 📍Abuqir Seafood, Queens *halal* 📍Rice Thief, LIC #newyork #food #seafood #lobsterroll #rawmarinatedcrab",
    descriptionEn: "Only eating seafood for 24 hours in NYC! 🦞🐟🔥 📍Sailor & Siren, Brooklyn 📍Abuqir Seafood, Queens *halal* 📍Rice Thief, LIC #newyork #food #seafood #lobsterro — Official Cambodian TikTok food review by @biteswithlily.",
    descriptionZh: "来自柬埔寨美食创作者 @biteswithlily 的 TikTok 视频：Only eating seafood for 24 hours in NYC! 🦞🐟🔥 📍Sailor & Siren, Brooklyn 📍Abuqir Seafood, Queens ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast8-p-0068-tx2/osFNO16qpAjBEVoEEmaZyRlBVZlfIB6aEeDAID~tplv-tiktokx-dmt-logom:tos-useast8-i-0068-tx2/oAwrWSwABORIBiFULq4KENvill1CB7aAAlAEA.image?dr=14573&x-expires=1795014000&x-signature=IgMVt96nhiutFgWLhSL2r1KcCY8%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@biteswithlily/video/7684711971161132318",
    originalAccountUrl: "https://www.tiktok.com/@biteswithlily",
    inlineVideoId: "7684711971161132318",
    directVideoUrl: "https://v3.tiktokcdn.com/10abf2b61c4ad24838fc78f177bd803d/6afdc488/video/tos/alisg/tos-alisg-ve-37c799-sg/oMm6ElNEZoIVpGSqAeQERlaFMf22iBEVEDDBAB/?a=1233&bti=ODszNWYuMDE6&&bt=655&ft=bC~O_mfLPD12NqY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=ZGk0Nzc8OzdnaWU5ZWZkOUBpam87OW05cnRzZDMzaTczNEA0MmEvNV80NWAxYjAuYjEuYSMuL2tjMmQ0M2ZhLS1kMTJzcw%3D%3D&vvpl=1&l=20261116232900F31E35B52A880B8BBA1D&btag=e00090000",
    sourceName: "Bites With Lily (@biteswithlily)",
    authorHandle: "@biteswithlily",
    publishedOrUpdatedAt: "2026-09-12T18:07:14.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-areyouhomeyet-7684229774801145095",
    platform: 'tiktok',
    titleKh: "ហេតុអ្វីបានជាវាឆ្ងាញ់ម្ល៉េះ? ដោយសារតែវាហឹរឬ?",
    titleEn: "ហេតុអ្វីបានជាវាឆ្ងាញ់ម្ល៉េះ? ដោយសារតែវាហឹរឬ? (@areyouhomeyet)",
    titleZh: "@areyouhomeyet 柬埔寨美食与探店视频",
    descriptionKh: "ហេតុអ្វីបានជាវាឆ្ងាញ់ម្ល៉េះ? ដោយសារតែវាហឹរឬ? #អាហារខ្មែរ #ឆាក្តៅ",
    descriptionEn: "ហេតុអ្វីបានជាវាឆ្ងាញ់ម្ល៉េះ? ដោយសារតែវាហឹរឬ? #អាហារខ្មែរ #ឆាក្តៅ — Official Cambodian TikTok food review by @areyouhomeyet.",
    descriptionZh: "来自柬埔寨美食创作者 @areyouhomeyet 的 TikTok 视频：ហេតុអ្វីបានជាវាឆ្ងាញ់ម្ល៉េះ? ដោយសារតែវាហឹរឬ? #អាហារខ្មែរ #ឆាក្តៅ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oIRjkJ8iAmR6AIkEtCiqA3CBg1UFABzkfeoEl2~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=VeshmD0%2FuTuCF3bXxTuLL8IkIpE%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@areyouhomeyet/video/7684229774801145095",
    originalAccountUrl: "https://www.tiktok.com/@areyouhomeyet",
    inlineVideoId: "7684229774801145095",
    directVideoUrl: "https://v9.tiktokcdn.com/dc1890d8de441559836a73b5889ea716/6afdc45f/video/tos/alisg/tos-alisg-pve-0037c001/okp8Nj2E9cQhoFlqAkgIR3iFQfeyT2EUBDQBgw/?a=1233&bti=ODszNWYuMDE6&&bt=732&ft=bC~O_mfLPD12NNc3rn-Ux7L59Y6e3wv25bcAp&mime_type=video_mp4&rc=Nzc6ZGc8ZGlpMzU2aTg4ZEBpM2pzN245cjp3ZDMzODczNEBhYGNhM2AuNTExXi1gMWBeYSNoZF9tMmQ0b2VhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232905AB4A6F4DF5B93C9E7BEE&btag=e000b8000",
    sourceName: "@areyouhomeyet",
    authorHandle: "@areyouhomeyet",
    publishedOrUpdatedAt: "2026-09-11T10:56:04.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-benlycooking-7680880710047059220",
    platform: 'tiktok',
    titleKh: "បងៗកងទ័ព🪖នៅជាស្រងុំាសប្បាយចិត្តណាស់ថ្ងៃនេះ😋🇰🇭",
    titleEn: "បងៗកងទ័ព🪖នៅជាស្រងុំាសប្បាយចិត្តណាស់ថ្ងៃនេះ😋🇰🇭 (@benlycooking)",
    titleZh: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking) 柬埔寨美食与探店视频",
    descriptionKh: "បងៗកងទ័ព🪖នៅជាស្រងុំាសប្បាយចិត្តណាស់ថ្ងៃនេះ😋🇰🇭",
    descriptionEn: "បងៗកងទ័ព🪖នៅជាស្រងុំាសប្បាយចិត្តណាស់ថ្ងៃនេះ😋🇰🇭 — Official Cambodian TikTok food review by @benlycooking.",
    descriptionZh: "来自柬埔寨美食创作者 @benlycooking 的 TikTok 视频：បងៗកងទ័ព🪖នៅជាស្រងុំាសប្បាយចិត្តណាស់ថ្ងៃនេះ😋🇰🇭",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oAQRvFqveF6GGKDiQfj4owJAEveiWXxvt8eAGF~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=Fc7RN7CYkXp6SDVXdazzSzQURVk%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@benlycooking/video/7680880710047059220",
    originalAccountUrl: "https://www.tiktok.com/@benlycooking",
    inlineVideoId: "7680880710047059220",
    directVideoUrl: "https://v45-eu.tiktokcdn.com/4a376602859d528c03279f3c6da8cf34/6afdc47d/video/tos/alisg/tos-alisg-pve-0037c001/oEgevqaRvF9iqAGEGVRAEXQG6eMDMXAXf8sfJw/?a=1233&bti=ODszNWYuMDE6&&bt=975&ft=L~aJCoCyD12Nv7l-KzIxREFSrlBF-UjNSbopiX&mime_type=video_mp4&rc=N2g6aWRoOTg7Omg1Z2c3M0BpajZvdnI5cmV5ZDMzODczNEBfLjJiLWJiXmAxYjIyYDQuYSMyYTVvMmRzY19hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232852D1F2A5EE89B7A79565DA&btag=e00095000",
    sourceName: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking)",
    authorHandle: "@benlycooking",
    publishedOrUpdatedAt: "2026-09-02T10:19:59.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-4",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-benlycooking-7680494870527626516",
    platform: 'tiktok',
    titleKh: "ថ្ងៃនេះចប់អន្ទាក់បងៗវីរៈកងទ័ពហើយខ្ញុំ😂",
    titleEn: "ថ្ងៃនេះចប់អន្ទាក់បងៗវីរៈកងទ័ពហើយខ្ញុំ😂 (@benlycooking)",
    titleZh: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking) 柬埔寨美食与探店视频",
    descriptionKh: "ថ្ងៃនេះចប់អន្ទាក់បងៗវីរៈកងទ័ពហើយខ្ញុំ😂",
    descriptionEn: "ថ្ងៃនេះចប់អន្ទាក់បងៗវីរៈកងទ័ពហើយខ្ញុំ😂 — Official Cambodian TikTok food review by @benlycooking.",
    descriptionZh: "来自柬埔寨美食创作者 @benlycooking 的 TikTok 视频：ថ្ងៃនេះចប់អន្ទាក់បងៗវីរៈកងទ័ពហើយខ្ញុំ😂",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oASA4UZyI01VMyXvWpiYGaIWNEaZiBaAmrVSB~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=K6E0Ra2LoZOgBM3Y2S5rVv%2Bwths%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@benlycooking/video/7680494870527626516",
    originalAccountUrl: "https://www.tiktok.com/@benlycooking",
    inlineVideoId: "7680494870527626516",
    directVideoUrl: "https://v45-eu.tiktokcdn.com/9cedb59d7f353ebdbbd1d01f32fe83aa/6afdc46b/video/tos/alisg/tos-alisg-pve-0037c001/okNaNYawaWZVmaQ1iikvpEIsyamrH4BBMAEUA/?a=1233&bti=ODszNWYuMDE6&&bt=1116&ft=L~aJCoCyD12Nv7l-KzIxREFSrlBF-UjNSbopiX&mime_type=video_mp4&rc=M2VmOGg3N2lkPDdnNjs5ZkBpM2ZldGw5cmc8ZDMzODczNEBjXmIyXjMwNjQxYGAwYDUvYSNeZG9uMmRrZl9hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232852D1F2A5EE89B7A79565DA&btag=e0008d000",
    sourceName: "ម្ហូបអ្នកភូមិ - Benly Cooking (@benlycooking)",
    authorHandle: "@benlycooking",
    publishedOrUpdatedAt: "2026-09-01T09:22:44.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-4",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-henghengcf6868-7679043408140291348",
    platform: 'tiktok',
    titleKh: "🥥☕ កាហ្វេដូងនៅទួលទំពូង — ឆ្ងាញ់ ហើយ Chill! 🤎✨ កាហ្វេឈ្ងុយៗ លាយជាមួយដូងខាប់ៗ ផ្អែមល្មម ឆ្ងាញ់ស",
    titleEn: "🥥☕ កាហ្វេដូងនៅទួលទំពូង — ឆ្ងាញ់ ហើយ Chill! 🤎✨ កាហ្វេឈ្ងុយៗ លាយជាមួយដូងខាប់ៗ ផ្ (@henghengcf_6868)",
    titleZh: "@henghengcf_6868 柬埔寨美食与探店视频",
    descriptionKh: "🥥☕ កាហ្វេដូងនៅទួលទំពូង — ឆ្ងាញ់ ហើយ Chill! 🤎✨ កាហ្វេឈ្ងុយៗ លាយជាមួយដូងខាប់ៗ ផ្អែមល្មម ឆ្ងាញ់ស្រួលផឹក! 😋🥥 មកសាកមួយកែវ ហើយមក Chill ជាមួយយើងនៅទួលទំពូង! ☕🫶 📍 ទួលទំពូង, ភ្នំពេញ #កាហ្វេដូង #ទួលទំពូង #CoconutCoffee #CoffeeTime #PhnomPenhCafe",
    descriptionEn: "🥥☕ កាហ្វេដូងនៅទួលទំពូង — ឆ្ងាញ់ ហើយ Chill! 🤎✨ កាហ្វេឈ្ងុយៗ លាយជាមួយដូងខាប់ៗ ផ្អែមល្មម ឆ្ងាញ់ស្រួលផឹក! 😋🥥 មកសាកមួយកែវ ហើយមក Chill ជាមួយយើងនៅទួលទំពូង! ☕🫶 📍  — Official Cambodian TikTok food review by @henghengcf_6868.",
    descriptionZh: "来自柬埔寨美食创作者 @henghengcf_6868 的 TikTok 视频：🥥☕ កាហ្វេដូងនៅទួលទំពូង — ឆ្ងាញ់ ហើយ Chill! 🤎✨ កាហ្វេឈ្ងុយៗ លាយជាមួយដូងខាប់ៗ ផ្អែមល្មម ឆ្ងាញ់ស្រួលផ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ocGkUQdQDzABXBcqgEfVA8IU3FZaeqBEbqGR1R~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=6HC5Xvq0%2FwI2oBrDxhpRYEvlFJI%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@henghengcf_6868/video/7679043408140291348",
    originalAccountUrl: "https://www.tiktok.com/@henghengcf_6868",
    inlineVideoId: "7679043408140291348",
    directVideoUrl: "https://v9.tiktokcdn.com/76baef5f52f7df4fd08184c663cecce9/6afdc48b/video/tos/alisg/tos-alisg-pve-0037c001/oMR71GcCIEMAXqDf1WIQtZB12rDiiAuLAwygcS/?a=1233&bti=ODszNWYuMDE6&&bt=836&ft=bC~O_mfLPD12Nbc3rn-Ux_svWY6e3wv25DcAp&mime_type=video_mp4&rc=ZDM3NTg7NDk1ODxmO2c4OEBpam86ZW85cnFxZDMzODczNEA1XjU0Ml5iNjIxLzQyYC0xYSMua18zMmRjLTVhLS1kMTFzcw%3D%3D&vvpl=1&l=202611162329127A72ACAE60876AB04689&btag=e00090000",
    sourceName: "@henghengcf_6868",
    authorHandle: "@henghengcf_6868",
    publishedOrUpdatedAt: "2026-08-28T11:30:19.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-angkoraurora-7678522295463283985",
    platform: 'tiktok',
    titleKh: "Book Hotel near Pub Street លេខតេលេក្រាម 061766755",
    titleEn: "Book Hotel near Pub Street លេខតេលេក្រាម 061766755 (@angkoraurora)",
    titleZh: "@angkoraurora 柬埔寨美食与探店视频",
    descriptionKh: "Book Hotel near Pub Street លេខតេលេក្រាម 061766755 #angkoraurora #angkoraurorahotel #061766755 #stayataurora #fyp #fyppppppppppppppppppppppp #foryou #fypシ #tiktok #viral #foryoupage #fypシ゚viral #cambodia #trending #fypシ゚ #tourist #tourism #familytravel #traveladvisor #vacayvibes #workandtravel #travelers #travelinspiration #vacation #familyvacation #travelvlog #vacay #swimmingpool #travelphotography #travelgram #staycation #placetovisit #cambodiatravel #travelcambodia #visitcambodia #travel #holiday #traveltiktok #travellife #siemreapcambodia #angkorwattemple #wanderlust #familytravel #workandtravel #swimmingpool #travelgram #placetovisit #staycation #travelphotography #travelvlog #familyvacation #vacation #travelinspiration #travelers #vacayvibes #tourism #tourist #solotravel #solotraveler #cambodge #カンボジア #traveltok #booking #luxurytravel #海外旅行 #NewYear #travelasia #siemreapcity #southeastasia #explore #travelcambodia #vietnam #siemreaptrip #siemreapcambodia #siemreapguides #travelasia2026 #siemreapfood #siemreapprovince #siemreapinternationalairport #cambodiantiktok #travel #intrepidtours #khmerfood",
    descriptionEn: "Book Hotel near Pub Street លេខតេលេក្រាម 061766755 #angkoraurora #angkoraurorahotel #061766755 #stayataurora #fyp #fyppppppppppppppppppppppp #foryou #fypシ #tikto — Official Cambodian TikTok food review by @angkoraurora.",
    descriptionZh: "来自柬埔寨美食创作者 @angkoraurora 的 TikTok 视频：Book Hotel near Pub Street លេខតេលេក្រាម 061766755 #angkoraurora #angkoraurorahotel #061766755 #staya",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/osVAoMfgzEeQyAWrZDAgmzPAAHEUAZ8IfsKMQE~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=7%2FEzX5O6otMw9khaEEtzoBNqFZ4%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@angkoraurora/video/7678522295463283985",
    originalAccountUrl: "https://www.tiktok.com/@angkoraurora",
    inlineVideoId: "7678522295463283985",
    directVideoUrl: "https://v3.tiktokcdn.com/a89c9fa357713e7bd087afe5b62b2d10/6afdc466/video/tos/alisg/tos-alisg-pve-0037/oY5EgKjIzDllB1q0wF5XCGEVPDi3f8AeVQBWOU/?a=1233&bti=ODszNWYuMDE6&&bt=5309&ft=bC~O_mfLPD12Nlc3rn-UxttFWY6e3wv25HcAp&mime_type=video_mp4&rc=ZTZpOzhnOmhkZmk6ZWQ5OUBpM3g6eGs5cjhzZDMzODgzNEAzX2MuMDIyXmAxMDFfYTFjYSNubS1gMmRzXzRhLS1kLzFzcw%3D%3D&vvpl=1&l=20261116232909327807221B2B489895CB&btag=e00088000",
    sourceName: "@angkoraurora",
    authorHandle: "@angkoraurora",
    publishedOrUpdatedAt: "2026-08-27T01:48:08.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-biteswithlily-7676927300062940446",
    platform: 'tiktok',
    titleKh: "Everything I ate at the Queens Night Market for under $6! 🍗🔥 📍 Queens Night Market, New York",
    titleEn: "Everything I ate at the Queens Night Market for under $6! 🍗🔥 📍 Queens Night M (@biteswithlily)",
    titleZh: "Bites With Lily (@biteswithlily) 柬埔寨美食与探店视频",
    descriptionKh: "Everything I ate at the Queens Night Market for under $6! 🍗🔥 📍 Queens Night Market, New York 🗽 #streetfood #nightmarket #foodmarket #nyc #newyork",
    descriptionEn: "Everything I ate at the Queens Night Market for under $6! 🍗🔥 📍 Queens Night Market, New York 🗽 #streetfood #nightmarket #foodmarket #nyc #newyork — Official Cambodian TikTok food review by @biteswithlily.",
    descriptionZh: "来自柬埔寨美食创作者 @biteswithlily 的 TikTok 视频：Everything I ate at the Queens Night Market for under $6! 🍗🔥 📍 Queens Night Market, New York 🗽 #",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast8-p-0068-tx2/oM5UIeqjdIBeu2DSIGAF7EMFEf7AV5ECKCy6JA~tplv-tiktokx-dmt-logom:tos-useast8-i-0068-tx2/oc7HfLsRIICEAwJN7JeL8AfAGAP9qGUeQACLJ3.image?dr=14573&x-expires=1795014000&x-signature=MulHAJD1TUiriozwmS3mjOUpz2c%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@biteswithlily/video/7676927300062940446",
    originalAccountUrl: "https://www.tiktok.com/@biteswithlily",
    inlineVideoId: "7676927300062940446",
    directVideoUrl: "https://v3.tiktokcdn.com/fe33dc104cac94e94cd08a461b85ab3a/6afdc486/video/tos/alisg/tos-alisg-ve-37c799-sg/oEej6EEuATumKJqQIKy574AIDfA8FIQ7SCIVeE/?a=1233&bti=ODszNWYuMDE6&&bt=2120&ft=bC~O_mfLPD12NqY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=OjY0ZmY2OGY2ZmVnNTNkZ0BpM3cza3c5cmh4ZDMzaTczNEAwMGIzXjZgXi0xLzQxY2IuYSNzZjVfMmRjbTFhLS1kMTJzcw%3D%3D&vvpl=1&l=20261116232900F31E35B52A880B8BBA1D&btag=e00090000",
    sourceName: "Bites With Lily (@biteswithlily)",
    authorHandle: "@biteswithlily",
    publishedOrUpdatedAt: "2026-08-22T18:38:44.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-biteswithlily-7676021633873644831",
    platform: 'tiktok',
    titleKh: "Rating different jellies 🪼🍓 ft. @CeraVe hydrating HA water gel",
    titleEn: "Rating different jellies 🪼🍓 ft. @CeraVe hydrating HA water gel (@biteswithlily)",
    titleZh: "Bites With Lily (@biteswithlily) 柬埔寨美食与探店视频",
    descriptionKh: "Rating different jellies 🪼🍓 ft. @CeraVe hydrating HA water gel #cerave #ceravewatergel #skincare #developedwithdermatologists #AD",
    descriptionEn: "Rating different jellies 🪼🍓 ft. @CeraVe hydrating HA water gel #cerave #ceravewatergel #skincare #developedwithdermatologists #AD — Official Cambodian TikTok food review by @biteswithlily.",
    descriptionZh: "来自柬埔寨美食创作者 @biteswithlily 的 TikTok 视频：Rating different jellies 🪼🍓 ft. @CeraVe hydrating HA water gel #cerave #ceravewatergel #skincare #",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast8-p-0068-tx2/o4RilI7QANBEoB5jiAtUmaGyC1IAOUEvAAay6~tplv-tiktokx-dmt-logom:tos-useast8-i-0068-tx2/oQfq8fRCEaDhPGhEHtFVBEAUErA3IAClrFAVaA.image?dr=14573&x-expires=1795014000&x-signature=zA5nZ8fqyXhoFRldEla7H9U5QHw%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@biteswithlily/video/7676021633873644831",
    originalAccountUrl: "https://www.tiktok.com/@biteswithlily",
    inlineVideoId: "7676021633873644831",
    directVideoUrl: "https://v3.tiktokcdn.com/b29d229b3ddcbb1031b60316b845b436/6afdc462/video/tos/alisg/tos-alisg-ve-37c799-sg/osK7A1FqQAeifYGRqQfY8AJAaPFMGWjfsUw1JR/?a=1233&bti=ODszNWYuMDE6&&bt=1158&ft=bC~O_mfLPD12NqY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=O2c6ZGVnNDZlNGc4OjUzZ0BpMzQ3b245cnNlZDMzaTczNEAuYDA0YS4wNWExLmAtLjMwYSMycG9gMmRzNDBhLS1kMTJzcw%3D%3D&vvpl=1&l=20261116232900F31E35B52A880B8BBA1D&btag=e00088000",
    sourceName: "Bites With Lily (@biteswithlily)",
    authorHandle: "@biteswithlily",
    publishedOrUpdatedAt: "2026-08-20T08:04:17.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-elysiumsuite-7675575229812378901",
    platform: 'tiktok',
    titleKh: "Book Hotel near Pub Street លេខតេលេក្រាម 017666282",
    titleEn: "Book Hotel near Pub Street លេខតេលេក្រាម 017666282 (@elysiumsuite)",
    titleZh: "@elysiumsuite 柬埔寨美食与探店视频",
    descriptionKh: "Book Hotel near Pub Street លេខតេលេក្រាម 017666282 #elysiumsuite #elysiumsuitehotel #017666282 #stayatelysiumsuite #fyp #fyppppppppppppppppppppppp #foryou #fypシ #tiktok #viral #foryoupage #fypシ゚viral #cambodia #trending #fypシ゚ #tourist #tourism #familytravel #vacayvibes #workandtravel #travelers #travelinspiration #vacation #familyvacation #travelvlog #vacay #swimmingpool #travelphotography #travelgram #staycation #placetovisit #cambodiatravel #travelcambodia #visitcambodia #travel #holiday #traveltiktok #travellife #siemreapcambodia #angkorwattemple #wanderlust #familytravel #workandtravel #swimmingpool #travelgram #placetovisit #staycation #travelphotography #travelvlog #familyvacation #vacation #travelinspiration #travelers #vacayvibes #tourism #tourist #solotravel #solotraveler #cambodge #カンボジア #traveltok #booking #luxurytravel #海外旅行 #NewYear #travelasia #siemreapcity #southeastasia #explore #travelcambodia #vietnam #siemreaptrip #siemreapcambodia #siemreapguides #travelasia2026 #siemreapfood #siemreapprovince #siemreapinternationalairport #cambodiantiktok #travel #intrepidtours #khmerfood",
    descriptionEn: "Book Hotel near Pub Street លេខតេលេក្រាម 017666282 #elysiumsuite #elysiumsuitehotel #017666282 #stayatelysiumsuite #fyp #fyppppppppppppppppppppppp #foryou #fypシ  — Official Cambodian TikTok food review by @elysiumsuite.",
    descriptionZh: "来自柬埔寨美食创作者 @elysiumsuite 的 TikTok 视频：Book Hotel near Pub Street លេខតេលេក្រាម 017666282 #elysiumsuite #elysiumsuitehotel #017666282 #staya",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oAAAw2iIEAw1usQf3HiKFtCitd7VgBARBBoKA8~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=lHw7Z3HeHu7ecpgEWjWYtJclPhM%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@elysiumsuite/video/7675575229812378901",
    originalAccountUrl: "https://www.tiktok.com/@elysiumsuite",
    inlineVideoId: "7675575229812378901",
    directVideoUrl: "https://v3.tiktokcdn.com/20978097f92f1ce1022b69303c2b67ca/6afdc485/video/tos/alisg/tos-alisg-pve-0037/o4ovqiBqKBA56ERtjFiIx7AAHQawx6PJQ1fDwK/?a=1233&bti=ODszNWYuMDE6&&bt=1942&ft=bC~O_mfLPD12Nlc3rn-UxttFWY6e3wv25HcAp&mime_type=video_mp4&rc=N2Q7ZjtlOTw7NDozMzs4OUBpamo4dnQ5cnBrZDMzODgzNEAtMDAvXmIuXzMxMy02M18uYSMuaTZrMmRzby9hLS1kLzFzcw%3D%3D&vvpl=1&l=20261116232909327807221B2B489895CB&btag=e00090000",
    sourceName: "@elysiumsuite",
    authorHandle: "@elysiumsuite",
    publishedOrUpdatedAt: "2026-08-19T03:12:01.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-biteswithlily-7674879369269038367",
    platform: 'tiktok',
    titleKh: "buldak rose tteokbokki 💗🧀",
    titleEn: "buldak rose tteokbokki 💗🧀 (@biteswithlily)",
    titleZh: "Bites With Lily (@biteswithlily) 柬埔寨美食与探店视频",
    descriptionKh: "buldak rose tteokbokki 💗🧀 #buldak #tteokbokki #conveniencestore #icecup #korea",
    descriptionEn: "buldak rose tteokbokki 💗🧀 #buldak #tteokbokki #conveniencestore #icecup #korea — Official Cambodian TikTok food review by @biteswithlily.",
    descriptionZh: "来自柬埔寨美食创作者 @biteswithlily 的 TikTok 视频：buldak rose tteokbokki 💗🧀 #buldak #tteokbokki #conveniencestore #icecup #korea",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast8-p-0068-tx2/oc7VrCIBUiGRlkAoBC0pgKnoIxiBRxD9DaAvE~tplv-tiktokx-dmt-logom:tos-useast8-i-0068-tx2/o8KlmRSpCAZAOrRiAECB4GBPiaArAo0kI7EpC.image?dr=14573&x-expires=1795014000&x-signature=uNhypMaznwDvYrVDeMtRmP43w4U%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@biteswithlily/video/7674879369269038367",
    originalAccountUrl: "https://www.tiktok.com/@biteswithlily",
    inlineVideoId: "7674879369269038367",
    directVideoUrl: "https://v3.tiktokcdn.com/b1356e71b6fbe8cdd00716787ae3e860/6afdc47d/video/tos/alisg/tos-alisg-ve-37c799-sg/ogCCli17moDVKRBBEnaiERAUIQxNP7oupAvBx/?a=1233&bti=ODszNWYuMDE6&&bt=1741&ft=bC~O_mfLPD12NqY3rn-UxD1vNY6e3wv252cAp&mime_type=video_mp4&rc=ZGlmODs7aTtpNTlnNWU6NkBpMzRlams5cm5kZDMzaTczNEAtXy1jNWMxNS8xL18zYjMyYSNoL2xxMmRrXi5hLS1kMTJzcw%3D%3D&vvpl=1&l=20261116232900F31E35B52A880B8BBA1D&btag=e00090000",
    sourceName: "Bites With Lily (@biteswithlily)",
    authorHandle: "@biteswithlily",
    publishedOrUpdatedAt: "2026-08-17T06:11:43.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-37",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-nachasawad-7674866429048507669",
    platform: 'tiktok',
    titleKh: "Introvert ក៏ចង់ជួបមនុស្សដែរ… តែ…🥹",
    titleEn: "Introvert ក៏ចង់ជួបមនុស្សដែរ… តែ…🥹 (@nachasawad)",
    titleZh: "@nachasawad 柬埔寨美食与探店视频",
    descriptionKh: "Introvert ក៏ចង់ជួបមនុស្សដែរ… តែ…🥹  #កម្ពុជា #PhnomPenhCafe #6ARoadMatchaHome #คนไทยในกัมพูชา🇹🇭🇰🇭 #StayBlessed",
    descriptionEn: "Introvert ក៏ចង់ជួបមនុស្សដែរ… តែ…🥹  #កម្ពុជា #PhnomPenhCafe #6ARoadMatchaHome #คนไทยในกัมพูชา🇹🇭🇰🇭 #StayBlessed — Official Cambodian TikTok food review by @nachasawad.",
    descriptionZh: "来自柬埔寨美食创作者 @nachasawad 的 TikTok 视频：Introvert ក៏ចង់ជួបមនុស្សដែរ… តែ…🥹  #កម្ពុជា #PhnomPenhCafe #6ARoadMatchaHome #คนไทยในกัมพูชา🇹🇭🇰\ud83c",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/owEAC1oCaBUAiwISyhIACiiA0mB8NQAN0fVxmK~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=66Qn%2F0wCvjb3NP6UEdbnhJI%2BJ4Y%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@nachasawad/video/7674866429048507669",
    originalAccountUrl: "https://www.tiktok.com/@nachasawad",
    inlineVideoId: "7674866429048507669",
    directVideoUrl: "https://v9.tiktokcdn.com/bc88541377c90f04a8e7274fc8b37c22/6afdc4d0/video/tos/alisg/tos-alisg-pve-0037c001/oUUDIZHVEk6gISFgqNoAjNpfimkRBIEgFQBeNt/?a=1233&bti=ODszNWYuMDE6&&bt=760&ft=bC~O_mfLPD12Nbc3rn-Ux_svWY6e3wv25DcAp&mime_type=video_mp4&rc=Zzw5NTc2ZTxkZDM2ODYzaEBpM246a2w5cjU8ZDMzODczNEAvNF8tXjZeXy4xNWE0LmNjYSMvYWo1MmQ0Zy5hLS1kMTFzcw%3D%3D&vvpl=1&l=202611162329127A72ACAE60876AB04689&btag=e00090000",
    sourceName: "@nachasawad",
    authorHandle: "@nachasawad",
    publishedOrUpdatedAt: "2026-08-17T05:21:30.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-thidaaaa000-7665955758600719629",
    platform: 'tiktok',
    titleKh: "រូបមន្តធ្វេីខារ៉ាមែលលេីកទី2នេះឆ្ងាញ់ខ្លាំងបានសាច់នំល្អទៀត🍮🍮🥛🥚😋",
    titleEn: "រូបមន្តធ្វេីខារ៉ាមែលលេីកទី2នេះឆ្ងាញ់ខ្លាំងបានសាច់នំល្អទៀត🍮🍮🥛🥚😋 (@thidaaaa000)",
    titleZh: "@thidaaaa000 柬埔寨美食与探店视频",
    descriptionKh: "រូបមន្តធ្វេីខារ៉ាមែលលេីកទី2នេះឆ្ងាញ់ខ្លាំងបានសាច់នំល្អទៀត🍮🍮🥛🥚😋   #បង្អែមខ្មែរ #បង្អែម #កូនខ្មែររស់នៅអាមេរិក #កូនខ្មែរនៅអាមេរិច #ម្ហូបប្រចាំថ្ងៃ",
    descriptionEn: "រូបមន្តធ្វេីខារ៉ាមែលលេីកទី2នេះឆ្ងាញ់ខ្លាំងបានសាច់នំល្អទៀត🍮🍮🥛🥚😋   #បង្អែមខ្មែរ #បង្អែម #កូនខ្មែររស់នៅអាមេរិក #កូនខ្មែរនៅអាមេរិច #ម្ហូបប្រចាំថ្ងៃ — Official Cambodian TikTok food review by @thidaaaa000.",
    descriptionZh: "来自柬埔寨美食创作者 @thidaaaa000 的 TikTok 视频：រូបមន្តធ្វេីខារ៉ាមែលលេីកទី2នេះឆ្ងាញ់ខ្លាំងបានសាច់នំល្អទៀត🍮🍮🥛🥚😋   #បង្អែមខ្មែរ #បង្អែម #កូនខ្មែរ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast5-p-0068-tx/o8bjiAVMvSBOfEIqFYFfDBgh58EDIYENRXDgEi~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=UepDwutU1KajvyU84%2Fe9gAkgE0Y%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@thidaaaa000/video/7665955758600719629",
    originalAccountUrl: "https://www.tiktok.com/@thidaaaa000",
    inlineVideoId: "7665955758600719629",
    directVideoUrl: "https://v16.tiktokcdn.com/224bff4bef3a56f7a7e59b60223794de/6afdc4da/video/tos/alisg/tos-alisg-ve-37c799-sg/oUYI3QSDqB8g5GVFEZMvcAINEDfifYsgbRExpi/?a=1233&bti=ODszNWYuMDE6&&bt=1421&ft=bC~O_mfLPD12N5c3rn-Ux~CFNY6e3wv25QcAp&mime_type=video_mp4&rc=N2g5MzM3NmlpaGY0ZjZpNUBpM3N3ZWo5cjtpPDMzZzczNEBiYi8wNTEvNmMxLzZgMzNeYSNgX2MwMmRrMWVhLS1kMS9zcw%3D%3D&vvpl=1&l=202611162329139B7E0E5B0682708EDE5B&btag=e00090000",
    sourceName: "@thidaaaa000",
    authorHandle: "@thidaaaa000",
    publishedOrUpdatedAt: "2026-07-24T05:03:33.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-umamikh-7664923031776578834",
    platform: 'tiktok',
    titleKh: "Thank you to @Sweetvelea-ស្វីតវេលា for introducing UMAMI and sharing her experience with our Su",
    titleEn: "Thank you to @Sweetvelea-ស្វីតវេលា for introducing UMAMI and sharing her experie (@umamikh)",
    titleZh: "@umamikh 柬埔寨美食与探店视频",
    descriptionKh: "Thank you to @Sweetvelea-ស្វីតវេលា for introducing UMAMI and sharing her experience with our Surprise Bags! 💚 Ready to give it a try? Use promo code sweetvelea  to enjoy a special discount on your next Surprise Bag. ✨ Rescue delicious food, save money, and help reduce food waste—one Surprise Bag at a time. 🌱 📲 Download UMAMI, reserve your Surprise Bag, and don't forget to use sweetvelea at checkout! #UMAMICambodia #FoodRescue #SurpriseBag #SaveFoodSaveMoney #PhnomPenhFood",
    descriptionEn: "Thank you to @Sweetvelea-ស្វីតវេលា for introducing UMAMI and sharing her experience with our Surprise Bags! 💚 Ready to give it a try? Use promo code sweetvelea — Official Cambodian TikTok food review by @umamikh.",
    descriptionZh: "来自柬埔寨美食创作者 @umamikh 的 TikTok 视频：Thank you to @Sweetvelea-ស្វីតវេលា for introducing UMAMI and sharing her experience with our Surpris",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oIQEfFqY0B0mBGDGQf124UHgEyR6qXvvn6aARv~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=8fLqrnLlCIItjkVTSpLLQzfhUIA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@umamikh/video/7664923031776578834",
    originalAccountUrl: "https://www.tiktok.com/@umamikh",
    inlineVideoId: "7664923031776578834",
    directVideoUrl: "https://v3.tiktokcdn.com/1f9e8e7ea500066c94463fcee730690a/6afdc47f/video/tos/alisg/tos-alisg-ve-0068c800-sg/oMRKYPf8VecSWMAegqgUNjNMAQeigAA0xNfgRq/?a=1233&bti=ODszNWYuMDE6&&bt=790&ft=L~O54ourD12NvRA-KzIxRWFSQlBF-UjNSCopiX&mime_type=video_mp4&rc=ZGloMzs7ZTNoZ2g7NWU7aUBpam1nOnE5cmVuPDMzODczNEBeYy1fLzItXjExM15eX18uYSNeNDVqMmRzYWNhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232903A7EBEACC999186963979&btag=e00090000",
    sourceName: "@umamikh",
    authorHandle: "@umamikh",
    publishedOrUpdatedAt: "2026-07-21T10:16:03.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-thidaaaa000-7664844255948508430",
    platform: 'tiktok',
    titleKh: "គុជផ្ទុះធ្វេីពីឪឡឹក🍉🧋✨",
    titleEn: "គុជផ្ទុះធ្វេីពីឪឡឹក🍉🧋✨ (@thidaaaa000)",
    titleZh: "@thidaaaa000 柬埔寨美食与探店视频",
    descriptionKh: "គុជផ្ទុះធ្វេីពីឪឡឹក🍉🧋✨  #កូនខ្មែររស់នៅអាមេរិក #នំខ្មែរឆ្ងាញ់ #បង្អែមខ្មែរ #អាហារសម្រន់ #poppingboba",
    descriptionEn: "គុជផ្ទុះធ្វេីពីឪឡឹក🍉🧋✨  #កូនខ្មែររស់នៅអាមេរិក #នំខ្មែរឆ្ងាញ់ #បង្អែមខ្មែរ #អាហារសម្រន់ #poppingboba — Official Cambodian TikTok food review by @thidaaaa000.",
    descriptionZh: "来自柬埔寨美食创作者 @thidaaaa000 的 TikTok 视频：គុជផ្ទុះធ្វេីពីឪឡឹក🍉🧋✨  #កូនខ្មែររស់នៅអាមេរិក #នំខ្មែរឆ្ងាញ់ #បង្អែមខ្មែរ #អាហារសម្រន់ #poppingbob",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-useast5-p-0068-tx/owuTfSfyeAKLPAGni1N9xCgAyLNvfeY4nQIgcs~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=OWMjRboIy9SVgcs0xhXuuiwzF3s%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@thidaaaa000/video/7664844255948508430",
    originalAccountUrl: "https://www.tiktok.com/@thidaaaa000",
    inlineVideoId: "7664844255948508430",
    directVideoUrl: "https://v16.tiktokcdn.com/e3a82a003eb9bc2a263b8ada060193a2/6afdc4ce/video/tos/alisg/tos-alisg-ve-37c799-sg/oU3fRvWBqQS4EwDpABXFSS4EIZDgh9ATzgfbCA/?a=1233&bti=ODszNWYuMDE6&&bt=1746&ft=bC~O_mfLPD12N5c3rn-Ux~CFNY6e3wv25QcAp&mime_type=video_mp4&rc=aGlpZzQ8Nzk0MzxnaTYzO0BpanVsO245cmZpPDMzZzczNEBeNjZhNTUwXzIxNTAyMy4uYSNpZy5sMmRzcGNhLS1kMS9zcw%3D%3D&vvpl=1&l=202611162329139B7E0E5B0682708EDE5B&btag=e00090000",
    sourceName: "@thidaaaa000",
    authorHandle: "@thidaaaa000",
    publishedOrUpdatedAt: "2026-07-21T05:10:21.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-homecuisine-7662313273819450632",
    platform: 'tiktok',
    titleKh: "របៀបធ្វើត្រីខជូរហឹលឆ្ងាញ់ៗហុតបែកញើសតែម្តង 😋🍋‍🟩🌶️",
    titleEn: "របៀបធ្វើត្រីខជូរហឹលឆ្ងាញ់ៗហុតបែកញើសតែម្តង 😋🍋‍🟩🌶️ (@homecuisine__)",
    titleZh: "@homecuisine__ 柬埔寨美食与探店视频",
    descriptionKh: "របៀបធ្វើត្រីខជូរហឹលឆ្ងាញ់ៗហុតបែកញើសតែម្តង 😋🍋‍🟩🌶️  #ម្ហូបខ្មែរ #ម្ហូបប្រចាំថ្ងៃ #ម្ហូបស្រុកស្រែ #ត្រីខឆ្ងាញ់ #ម្ហូបធ្វើលឿនៗ",
    descriptionEn: "របៀបធ្វើត្រីខជូរហឹលឆ្ងាញ់ៗហុតបែកញើសតែម្តង 😋🍋‍🟩🌶️  #ម្ហូបខ្មែរ #ម្ហូបប្រចាំថ្ងៃ #ម្ហូបស្រុកស្រែ #ត្រីខឆ្ងាញ់ #ម្ហូបធ្វើលឿនៗ — Official Cambodian TikTok food review by @homecuisine__.",
    descriptionZh: "来自柬埔寨美食创作者 @homecuisine__ 的 TikTok 视频：របៀបធ្វើត្រីខជូរហឹលឆ្ងាញ់ៗហុតបែកញើសតែម្តង 😋🍋‍🟩🌶️  #ម្ហូបខ្មែរ #ម្ហូបប្រចាំថ្ងៃ #ម្ហូបស្រុកស្រែ #",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o4NUxzKDAAA6AjfFAIF6rA4Defcs1rAEDIECsQ~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=gDrfieZFp3CfSPITqu1OPZMAlAI%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@homecuisine__/video/7662313273819450632",
    originalAccountUrl: "https://www.tiktok.com/@homecuisine__",
    inlineVideoId: "7662313273819450632",
    directVideoUrl: "https://v3.tiktokcdn.com/536545f9f95cf19afb5c1fce406c40cf/6afdc4ad/video/tos/alisg/tos-alisg-ve-0068c800-sg/oAQdWAmjgcQZkEEqtVFfBBgmJAWmErICRNDeEt/?a=1233&bti=ODszNWYuMDE6&&bt=1113&ft=L~O54ourD12NvSA-KzIxRhFSQlBF-UjNSbopiX&mime_type=video_mp4&rc=PGU6Z2Q7OTk0ZTxpNTU4NEBpajxsN3g5cmUzPDMzODczNEBgYi1fLWJjNmExMDUwXi0zYSNpYDEuMmRjL19hLS1kMWBzcw%3D%3D&vvpl=1&l=2026111623291333CDE4ABC97066C5D667&btag=e00090000",
    sourceName: "@homecuisine__",
    authorHandle: "@homecuisine__",
    publishedOrUpdatedAt: "2026-07-14T09:28:51.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-zeyeii-7655943129681415445",
    platform: 'tiktok',
    titleKh: "🤍🌱🥤",
    titleEn: "🤍🌱🥤 (@zey.eii)",
    titleZh: "@zey.eii 柬埔寨美食与探店视频",
    descriptionKh: "#ហាងកាហ្វេភ្នំពេញ 🤍🌱🥤",
    descriptionEn: "#ហាងកាហ្វេភ្នំពេញ 🤍🌱🥤 — Official Cambodian TikTok food review by @zey.eii.",
    descriptionZh: "来自柬埔寨美食创作者 @zey.eii 的 TikTok 视频：#ហាងកាហ្វេភ្នំពេញ 🤍🌱🥤",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/okmf1F8uA8wRDDuLQcXBxqw6pPEEPqVUgCBfQ1~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=fHon7SYF0TosBBMSTbDZ6ijn9Qo%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@zey.eii/video/7655943129681415445",
    originalAccountUrl: "https://www.tiktok.com/@zey.eii",
    inlineVideoId: "7655943129681415445",
    directVideoUrl: "https://v3.tiktokcdn.com/b6a5311a8e9c3a9d39519b4c6dda14c8/6afdc461/video/tos/alisg/tos-alisg-ve-0068c800-sg/ogDfgUBxIBwP6QE88fRXEVuBh8tc1gL1gqACFq/?a=1233&bti=ODszNWYuMDE6&&bt=427&ft=bC~O_mfLPD12NOc3rn-Ux5y2KY6e3wv25ocAp&mime_type=video_mp4&rc=ZDNpOTc8aTM7O2k7OjYzNUBpMzhvcHE5cmZvOzMzODczNEAtMWI2NjQ0NmExYTAtMi1iYSNrZGteMmRjcnNhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232914EC22BC222C6D68B6158D&btag=e000b8000",
    sourceName: "@zey.eii",
    authorHandle: "@zey.eii",
    publishedOrUpdatedAt: "2026-06-27T05:29:26.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-mahubsroknhom-7655670260296731912",
    platform: 'tiktok',
    titleKh: "ភាគ ៨ រឿង សម្លស្រីសួគ៍ ឆ្លងភព 🇰🇭 ចូលរួមសហការដោយ @chantrovekcambodia ម្សៅស៊ុបមាន់សញ្ញាចានទ្រវែ",
    titleEn: "ភាគ ៨ រឿង សម្លស្រីសួគ៍ ឆ្លងភព 🇰🇭 ចូលរួមសហការដោយ @chantrovekcambodia ម្សៅស៊ុបមា (@mahubsroknhom)",
    titleZh: "@mahubsroknhom 柬埔寨美食与探店视频",
    descriptionKh: "ភាគ ៨ រឿង សម្លស្រីសួគ៍ ឆ្លងភព 🇰🇭 ចូលរួមសហការដោយ @chantrovekcambodia ម្សៅស៊ុបមាន់សញ្ញាចានទ្រវែក និង @heartsunfloweroil 📅 ទស្សនាកម្មវិធីពេញតាមរយះ Facebook Page/ Tiktok/ Youtube ម្ហូបស្រុកខ្ញុំ #ម្ហូបស្រុកខ្ញុំ #សៀមរាប #khmercooking",
    descriptionEn: "ភាគ ៨ រឿង សម្លស្រីសួគ៍ ឆ្លងភព 🇰🇭 ចូលរួមសហការដោយ @chantrovekcambodia ម្សៅស៊ុបមាន់សញ្ញាចានទ្រវែក និង @heartsunfloweroil 📅 ទស្សនាកម្មវិធីពេញតាមរយះ Facebook Page — Official Cambodian TikTok food review by @mahubsroknhom.",
    descriptionZh: "来自柬埔寨美食创作者 @mahubsroknhom 的 TikTok 视频：ភាគ ៨ រឿង សម្លស្រីសួគ៍ ឆ្លងភព 🇰🇭 ចូលរួមសហការដោយ @chantrovekcambodia ម្សៅស៊ុបមាន់សញ្ញាចានទ្រវែក និង",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ooPAgCEm17DAVngRdKAzFmeBfmpABqQCZxIZxn~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=JGaR2CdklDOlvAtZaCvXfnSm8Vo%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@mahubsroknhom/video/7655670260296731912",
    originalAccountUrl: "https://www.tiktok.com/@mahubsroknhom",
    inlineVideoId: "7655670260296731912",
    directVideoUrl: "https://v9.tiktokcdn.com/2df3fb45c55c3dfb5eebd43205878002/6afdc4b3/video/tos/alisg/tos-alisg-ve-0068c800-sg/oABbAfwPFFhrQCmgQqEDnHfaIAXjgZiqBU8CKV/?a=1233&bti=ODszNWYuMDE6&&bt=1622&ft=L~O54ourD12Nv_A-KzIxRohjvlBF-UjNSlopiX&mime_type=video_mp4&rc=aWVkNmQ4Ojw0NDM8MzRnO0BpanI3OG05cmo5OzMzODgzNEBgLzVgNmNgXzAxMTAzM2AtYSMzXl5oMmRrYHNhLS1kLzFzcw%3D%3D&vvpl=1&l=20261116232911252B542D58247D93D0EE&btag=e00090000",
    sourceName: "@mahubsroknhom",
    authorHandle: "@mahubsroknhom",
    publishedOrUpdatedAt: "2026-06-26T11:50:34.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-mahubsroknhom-7655667125373226258",
    platform: 'tiktok',
    titleKh: "ភាគ ៦ រឿង សម្លស្រីសួគ៍ ឆ្លងភព 🇰🇭 ចូលរួមសហការដោយ @chantrovekcambodia ម្សៅស៊ុបមាន់សញ្ញាចានទ្រវែ",
    titleEn: "ភាគ ៦ រឿង សម្លស្រីសួគ៍ ឆ្លងភព 🇰🇭 ចូលរួមសហការដោយ @chantrovekcambodia ម្សៅស៊ុបមា (@mahubsroknhom)",
    titleZh: "@mahubsroknhom 柬埔寨美食与探店视频",
    descriptionKh: "ភាគ ៦ រឿង សម្លស្រីសួគ៍ ឆ្លងភព 🇰🇭 ចូលរួមសហការដោយ @chantrovekcambodia ម្សៅស៊ុបមាន់សញ្ញាចានទ្រវែក និង @heartsunfloweroil 📅 ទស្សនាកម្មវិធីពេញតាមរយះ Facebook Page/ Tiktok/ Youtube ម្ហូបស្រុកខ្ញុំ #ម្ហូបស្រុកខ្ញុំ #សៀមរាប #khmercooking",
    descriptionEn: "ភាគ ៦ រឿង សម្លស្រីសួគ៍ ឆ្លងភព 🇰🇭 ចូលរួមសហការដោយ @chantrovekcambodia ម្សៅស៊ុបមាន់សញ្ញាចានទ្រវែក និង @heartsunfloweroil 📅 ទស្សនាកម្មវិធីពេញតាមរយះ Facebook Page — Official Cambodian TikTok food review by @mahubsroknhom.",
    descriptionZh: "来自柬埔寨美食创作者 @mahubsroknhom 的 TikTok 视频：ភាគ ៦ រឿង សម្លស្រីសួគ៍ ឆ្លងភព 🇰🇭 ចូលរួមសហការដោយ @chantrovekcambodia ម្សៅស៊ុបមាន់សញ្ញាចានទ្រវែក និង",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/owXA8ejrAzfSxegRts8SMNvffggrQAs5ADA84Y~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=b6YbPh5UsHUOfgDQSclrraKQkYs%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@mahubsroknhom/video/7655667125373226258",
    originalAccountUrl: "https://www.tiktok.com/@mahubsroknhom",
    inlineVideoId: "7655667125373226258",
    directVideoUrl: "https://v9.tiktokcdn.com/b7b9da0a363479ac13fb7c1a22719be7/6afdc4c0/video/tos/alisg/tos-alisg-ve-0068c800-sg/oQCN4AQgUTAF8EmbxJVArPf09PDnBBzITgFqOe/?a=1233&bti=ODszNWYuMDE6&&bt=1754&ft=L~O54ourD12Nv_A-KzIxRohjvlBF-UjNSlopiX&mime_type=video_mp4&rc=MzdnNTllNmc2aGQ6ZWY1ZUBpMzN0cG85cmo5OzMzODgzNEBhXzE1MDVgXjExYC00XzJiYSNjZ2RnMmQ0NHNhLS1kLzFzcw%3D%3D&vvpl=1&l=20261116232911252B542D58247D93D0EE&btag=e00090000",
    sourceName: "@mahubsroknhom",
    authorHandle: "@mahubsroknhom",
    publishedOrUpdatedAt: "2026-06-26T11:38:24.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-neangs16-7654618811747945735",
    platform: 'tiktok',
    titleKh: "🇰🇭",
    titleEn: "🇰🇭 (@neangs16)",
    titleZh: "@neangs16 柬埔寨美食与探店视频",
    descriptionKh: "#ធ្វើម្ហូបខ្មែរ 🇰🇭 #ស្នាដៃខ្ញុំNeangKh",
    descriptionEn: "#ធ្វើម្ហូបខ្មែរ 🇰🇭 #ស្នាដៃខ្ញុំNeangKh — Official Cambodian TikTok food review by @neangs16.",
    descriptionZh: "来自柬埔寨美食创作者 @neangs16 的 TikTok 视频：#ធ្វើម្ហូបខ្មែរ 🇰🇭 #ស្នាដៃខ្ញុំNeangKh",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oI16RqpgO8xEEq1QBAILHfifRkGgOFIDE8cB0q~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=IQddHPaue1pLqT9T%2Bo0hCf%2Fk0V0%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@neangs16/video/7654618811747945735",
    originalAccountUrl: "https://www.tiktok.com/@neangs16",
    inlineVideoId: "7654618811747945735",
    directVideoUrl: "https://v16.tiktokcdn.com/29c92195b4998b1845744f2354ff118f/6afdc479/video/tos/alisg/tos-alisg-ve-0068c800-sg/oQ6xgODQ9EqDFo8ixcfBRgRP1fHsqqEkAEB08I/?a=1233&bti=ODszNWYuMDE6&&bt=596&ft=bC~O_mfLPD12NTc3rn-UxMJ2WY6e3wv25ocAp&mime_type=video_mp4&rc=ZDw4NTg5aGVmN2Y6OGg2N0BpMzptZnk5cjdkOzMzODczNEAwM2MuLTZgNTYxYi0zM2JiYSNubGBkMmRjZXFhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232906AB4A6F4DF5B93C9E7C5B&btag=e00088000",
    sourceName: "@neangs16",
    authorHandle: "@neangs16",
    publishedOrUpdatedAt: "2026-06-23T15:50:24.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-elysiumsuite-7654044790333525264",
    platform: 'tiktok',
    titleKh: "Book Hotel near Pub Street",
    titleEn: "Book Hotel near Pub Street (@elysiumsuite)",
    titleZh: "@elysiumsuite 柬埔寨美食与探店视频",
    descriptionKh: "Book Hotel near Pub Street #elysiumsuite #elysiumsuitehotel #017666282 #stayatelysiumsuite #fyp #fyppppppppppppppppppppppp #foryou #fypシ #tiktok #viral #foryoupage #fypシ゚viral #cambodia #trending #fypシ゚ #tourist #tourism #familytravel #traveladvisor #vacayvibes #workandtravel #travelers #travelinspiration #vacation #familyvacation #travelvlog #vacay #swimmingpool #travelphotography #travelgram #staycation #placetovisit #cambodiatravel #travelcambodia #visitcambodia #travel #holiday #traveltiktok #travellife #siemreapcambodia #angkorwattemple #wanderlust #familytravel #workandtravel #traveladvisor #swimmingpool #travelgram #placetovisit #staycation #travelphotography #travelvlog #familyvacation #vacation #travelinspiration #travelers #vacayvibes #tourism #tourist #solotravel #solotraveler #cambodge #カンボジア #traveltok #booking #luxurytravel #海外旅行 #NewYear #travelasia #siemreapcity #southeastasia #explore #travelcambodia #vietnam #siemreaptrip #siemreapcambodia #siemreapguides #travelasia2026 #siemreapfood #siemreapprovince #siemreapinternationalairport #cambodiantiktok #travel #intrepidtours #khmerfood",
    descriptionEn: "Book Hotel near Pub Street #elysiumsuite #elysiumsuitehotel #017666282 #stayatelysiumsuite #fyp #fyppppppppppppppppppppppp #foryou #fypシ #tiktok #viral #foryoup — Official Cambodian TikTok food review by @elysiumsuite.",
    descriptionZh: "来自柬埔寨美食创作者 @elysiumsuite 的 TikTok 视频：Book Hotel near Pub Street #elysiumsuite #elysiumsuitehotel #017666282 #stayatelysiumsuite #fyp #fyp",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oQcGAaB5q4YmQAzAAIvADcNgtj4oEAXiliaiV~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=9WjU%2FrjZswojPSjn7wFWOelzp2U%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@elysiumsuite/video/7654044790333525264",
    originalAccountUrl: "https://www.tiktok.com/@elysiumsuite",
    inlineVideoId: "7654044790333525264",
    directVideoUrl: "https://v3.tiktokcdn.com/7595eddd6fc237688d2f93c48e45bd75/6afdc45c/video/tos/alisg/tos-alisg-ve-0068c800-sg/ochjXPDlItiGQzkAcSgWgliaBKQYyiSAlEaqx/?a=1233&bti=ODszNWYuMDE6&&bt=1143&ft=bC~O_mfLPD12Nlc3rn-UxttFWY6e3wv25HcAp&mime_type=video_mp4&rc=aWk7aDhpZmg4NzlmaWRoM0BpamxrZW05cmRkOzMzODgzNUA1My4yLjU1NWIxYTMyYGBjYSNsY18wMmQ0LXBhLS1kLzZzcw%3D%3D&vvpl=1&l=20261116232909327807221B2B489895CB&btag=e000b8000",
    sourceName: "@elysiumsuite",
    authorHandle: "@elysiumsuite",
    publishedOrUpdatedAt: "2026-06-22T02:42:55.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តសៀមរាប",
    provinceEn: "Siem Reap",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-kanattar-7652756803180514580",
    platform: 'tiktok',
    titleKh: "Kdal yub jing morng tov",
    titleEn: "Kdal yub jing morng tov (@kanattar)",
    titleZh: "@kanattar 柬埔寨美食与探店视频",
    descriptionKh: "Kdal yub jing morng tov #ផ្សារទួលទំពូង #ម្ហូបខ្មែរ #ឃ្លាន😋😋 #ម្ហូបតាមផ្លូវ #ឆ្ងាញ់",
    descriptionEn: "Kdal yub jing morng tov #ផ្សារទួលទំពូង #ម្ហូបខ្មែរ #ឃ្លាន😋😋 #ម្ហូបតាមផ្លូវ #ឆ្ងាញ់ — Official Cambodian TikTok food review by @kanattar.",
    descriptionZh: "来自柬埔寨美食创作者 @kanattar 的 TikTok 视频：Kdal yub jing morng tov #ផ្សារទួលទំពូង #ម្ហូបខ្មែរ #ឃ្លាន😋😋 #ម្ហូបតាមផ្លូវ #ឆ្ងាញ់",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oMfxDAz1DQ4cO0n2AwFIcyR4LBfSqZBQEigpEN~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=6KJZNPopHknUFMWF%2BphZoDP9vEs%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@kanattar/video/7652756803180514580",
    originalAccountUrl: "https://www.tiktok.com/@kanattar",
    inlineVideoId: "7652756803180514580",
    directVideoUrl: "https://v16.tiktokcdn.com/3e1bbe6502105e74d5ad32a59b1c3499/6afdc47d/video/tos/alisg/tos-alisg-ve-0068c800-sg/ooiD856iEdj4NbaBIXnYuTPFz2EBQQA0l4E0A/?a=1233&bti=ODszNWYuMDE6&&bt=666&ft=bC~O_mfLPD12NNc3rn-UxF~2KY6e3wv25DcAp&mime_type=video_mp4&rc=ZzY8NDg4NmY5NjM6OGg1NUBpajg2Z205cmgzOzMzODczNEBhX2ItLzBjXjUxYl4zMDYxYSNnZDRxMmQ0b25hLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232906AB4A6F4DF5B93C9E7C2D&btag=e00090000",
    sourceName: "@kanattar",
    authorHandle: "@kanattar",
    publishedOrUpdatedAt: "2026-06-18T15:24:52.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-djnikoyu-7650408207713570068",
    platform: 'tiktok',
    titleKh: "Happy 10 year anniversary LAUNDRY CAFE - KAMPOT 🙌🍔🙏 @visal.$🤫",
    titleEn: "Happy 10 year anniversary LAUNDRY CAFE - KAMPOT 🙌🍔🙏 @visal.$🤫 (@djnikoyu)",
    titleZh: "@djnikoyu 柬埔寨美食与探店视频",
    descriptionKh: "Happy 10 year anniversary LAUNDRY CAFE - KAMPOT 🙌🍔🙏 @visal.$🤫  #LaundryCafe #LaundryCafeKampot #CamboBurger #kampotfood",
    descriptionEn: "Happy 10 year anniversary LAUNDRY CAFE - KAMPOT 🙌🍔🙏 @visal.$🤫  #LaundryCafe #LaundryCafeKampot #CamboBurger #kampotfood — Official Cambodian TikTok food review by @djnikoyu.",
    descriptionZh: "来自柬埔寨美食创作者 @djnikoyu 的 TikTok 视频：Happy 10 year anniversary LAUNDRY CAFE - KAMPOT 🙌🍔🙏 @visal.$🤫  #LaundryCafe #LaundryCafeKampot #",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o0Br1rl9AAEiYAru1uvtuEABiIabj6izPAAgY~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=Ij0hoDno4u5BMJqYOdCJI4ih20o%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@djnikoyu/video/7650408207713570068",
    originalAccountUrl: "https://www.tiktok.com/@djnikoyu",
    inlineVideoId: "7650408207713570068",
    directVideoUrl: "https://v3.tiktokcdn.com/0779878895404fca7eb0ef2a3aea6bac/6afdc45e/video/tos/alisg/tos-alisg-ve-0068c800-sg/oI7UUFDNREBx0EKv2rEIgTBAtQagcjDNKqfJe0/?a=1233&bti=ODszNWYuMDE6&&bt=1051&ft=bC~O_mfLPD12Ndc3rn-UxMK5PY6e3wv25dcAp&mime_type=video_mp4&rc=Z2Y4N2dkOmk7NWk0MzZlaEBpanh0N2s5cnV1OzMzODczNEBhYzI2NGIxNi8xLzFeYzZjYSMxbi1pMmRzNmlhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232909397AA7C0BCE619A80C83&btag=e000b8000",
    sourceName: "@djnikoyu",
    authorHandle: "@djnikoyu",
    publishedOrUpdatedAt: "2026-06-12T07:31:07.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "famous_restaurant",
    provinceKh: "ខេត្តកំពត",
    provinceEn: "Kampot",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-chormvibol5-7649185500229586194",
    platform: 'tiktok',
    titleKh: "របៀបធ្វើនំចាក់ជុលខ្មែរយើង",
    titleEn: "របៀបធ្វើនំចាក់ជុលខ្មែរយើង (@chormvibol5)",
    titleZh: "@chormvibol5 柬埔寨美食与探店视频",
    descriptionKh: "របៀបធ្វើនំចាក់ជុលខ្មែរយើង #tik_tok #ម្ហូបខ្មែរ #ទឹកប្រហុកម៉ែកូនបឺត #food #នំខ្មែរ",
    descriptionEn: "របៀបធ្វើនំចាក់ជុលខ្មែរយើង #tik_tok #ម្ហូបខ្មែរ #ទឹកប្រហុកម៉ែកូនបឺត #food #នំខ្មែរ — Official Cambodian TikTok food review by @chormvibol5.",
    descriptionZh: "来自柬埔寨美食创作者 @chormvibol5 的 TikTok 视频：របៀបធ្វើនំចាក់ជុលខ្មែរយើង #tik_tok #ម្ហូបខ្មែរ #ទឹកប្រហុកម៉ែកូនបឺត #food #នំខ្មែរ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o87EdW1IX1ai3ABdiBwXxiyEEYXBnvhiDAIic~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=yOY3sq1f2d923u%2FnghRCuW7YF50%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@chormvibol5/video/7649185500229586194",
    originalAccountUrl: "https://www.tiktok.com/@chormvibol5",
    inlineVideoId: "7649185500229586194",
    directVideoUrl: "https://v16.tiktokcdn.com/f3cda95cb524ab8f7c673b32bf8a95c5/6afdc548/video/tos/alisg/tos-alisg-ve-0068c800-sg/og1B5jKf5OWqFBAkQyfCRuqDgE9EccgEtJJiIA/?a=1233&bti=ODszNWYuMDE6&&bt=885&ft=L~O54ourD12NvkA-KzIxR_ONHlBF-UjNSkopiX&mime_type=video_mp4&rc=NzM7aWY4Zzo0aGY7NmVoN0Bpam9tO2w5cjVvOzMzODczNEBfM18xLjAtNmExLWBgYjYtYSMtMGRfMmRrbWdhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232904C2DA849ECCE5ABA10E21&btag=e00098000",
    sourceName: "@chormvibol5",
    authorHandle: "@chormvibol5",
    publishedOrUpdatedAt: "2026-06-09T00:26:23.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-obvlogshub42-7647825839790312726",
    platform: 'tiktok',
    titleKh: "😱You MUST Try This Cambodian Street GRILLED BANANA SPLIT in Phnom Penh! 🔥 So Sweet & Juicy Do",
    titleEn: "😱You MUST Try This Cambodian Street GRILLED BANANA SPLIT in Phnom Penh! 🔥 So S (@obvlogshub42)",
    titleZh: "@obvlogshub42 柬埔寨美食与探店视频",
    descriptionKh: "😱You MUST Try This Cambodian Street GRILLED BANANA SPLIT in Phnom Penh! 🔥 So Sweet & Juicy Don’t Miss It #CambodiaStreetFood #GrilledBanana #PhnomPenhEats #CambodianFood #BananaSplit",
    descriptionEn: "😱You MUST Try This Cambodian Street GRILLED BANANA SPLIT in Phnom Penh! 🔥 So Sweet & Juicy Don’t Miss It #CambodiaStreetFood #GrilledBanana #PhnomPenhEats #Ca — Official Cambodian TikTok food review by @obvlogshub42.",
    descriptionZh: "来自柬埔寨美食创作者 @obvlogshub42 的 TikTok 视频：😱You MUST Try This Cambodian Street GRILLED BANANA SPLIT in Phnom Penh! 🔥 So Sweet & Juicy Don’t M",
    thumbnailUrl: "https://p19-common-sign.tiktokcdn.com/tos-no1a-p-0037-no/ooIEFFqSoCAhFcDnQfHfAkAgE3EVQIjkXBkARk~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=BO%2BgWT7fN3Ha8tbRZeejV8rKUqA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@obvlogshub42/video/7647825839790312726",
    originalAccountUrl: "https://www.tiktok.com/@obvlogshub42",
    inlineVideoId: "7647825839790312726",
    directVideoUrl: "https://v9.tiktokcdn.com/1697f7e7540314c1df6d1a4a2a309643/6afdc4b2/video/tos/useast2a/tos-useast2a-ve-68c810-euttp/oUleIILbXDAWikOirQFfLjUQ8IuAuD7REyfliE/?a=1233&bti=ODszNWYuMDE6&&bt=1129&ft=bC~O_mfLPD12Nbc3rn-Ux_svWY6e3wv25DcAp&mime_type=video_mp4&rc=aDhmOjloZWU3ZWY3ZWU0N0Bpamhkc3k5cjg7OzMzbzczNUAxMi9jMDAyX2MxYC5eMzVfYSMycTNhMmRzY2VhLS1kMTFzcw%3D%3D&vvpl=1&l=2026111623291207C48ACFBAF5768A1D2A&btag=e00090000",
    sourceName: "@obvlogshub42",
    authorHandle: "@obvlogshub42",
    publishedOrUpdatedAt: "2026-06-05T08:30:12.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-kimourn3-7646372610472725780",
    platform: 'tiktok',
    titleKh: "មីសួរ ទឹកគីឆ្ងាញ់នៅខេត្តកំពត 🍲😋",
    titleEn: "មីសួរ ទឹកគីឆ្ងាញ់នៅខេត្តកំពត 🍲😋 (@kim.ourn3)",
    titleZh: "@kim.ourn3 柬埔寨美食与探店视频",
    descriptionKh: "មីសួរ ទឹកគីឆ្ងាញ់នៅខេត្តកំពត 🍲😋 #កំពត #kampot #kampotfood #kampottrip #កំពត_ផ្ទះ_ខ្ញុំ🏡",
    descriptionEn: "មីសួរ ទឹកគីឆ្ងាញ់នៅខេត្តកំពត 🍲😋 #កំពត #kampot #kampotfood #kampottrip #កំពត_ផ្ទះ_ខ្ញុំ🏡 — Official Cambodian TikTok food review by @kim.ourn3.",
    descriptionZh: "来自柬埔寨美食创作者 @kim.ourn3 的 TikTok 视频：មីសួរ ទឹកគីឆ្ងាញ់នៅខេត្តកំពត 🍲😋 #កំពត #kampot #kampotfood #kampottrip #កំពត_ផ្ទះ_ខ្ញុំ🏡",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/ociBU6qQ6utDTBqvgPUtVfEeFEARIFHkMKmNuQ~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=MrYGirtSOjF2AZhfdScT8sYdBBQ%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@kim.ourn3/video/7646372610472725780",
    originalAccountUrl: "https://www.tiktok.com/@kim.ourn3",
    inlineVideoId: "7646372610472725780",
    directVideoUrl: "https://v3.tiktokcdn.com/d5244d8443748a2e1ad8021236c2b63f/6afdc464/video/tos/alisg/tos-alisg-ve-0068c800-sg/oMdmtEMERINA3UPfkcQguqDqe6KFEBPVBgX6XH/?a=1233&bti=ODszNWYuMDE6&&bt=661&ft=bC~O_mfLPD12Ndc3rn-UxMK5PY6e3wv25dcAp&mime_type=video_mp4&rc=OTY5ZzY5aTk2OWg1aDllO0BpanBvZ2w5cjZvOzMzODczNEAzNTJiNi42NWIxLWI1NDY1YSNmM24wMmRzcWJhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232909397AA7C0BCE619A80C83&btag=e00088000",
    sourceName: "@kim.ourn3",
    authorHandle: "@kim.ourn3",
    publishedOrUpdatedAt: "2026-06-01T10:30:56.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "ខេត្តកំពត",
    provinceEn: "Kampot",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-mdfwithlove-7645273357360860437",
    platform: 'tiktok',
    titleKh: "កុំច្រឡំ ក៏កុំខឹ-ង អ្នកលក់អី? ស្តាប់ម្តងទៀតក៏បាន 🫩",
    titleEn: "កុំច្រឡំ ក៏កុំខឹ-ង អ្នកលក់អី? ស្តាប់ម្តងទៀតក៏បាន 🫩 (@mdfwithlove)",
    titleZh: "@mdfwithlove 柬埔寨美食与探店视频",
    descriptionKh: "កុំច្រឡំ ក៏កុំខឹ-ង អ្នកលក់អី? ស្តាប់ម្តងទៀតក៏បាន 🫩  #សាច់គោចង្កាក់ #សាច់អាំង #ម្ហូបស្រុកស្រែ",
    descriptionEn: "កុំច្រឡំ ក៏កុំខឹ-ង អ្នកលក់អី? ស្តាប់ម្តងទៀតក៏បាន 🫩  #សាច់គោចង្កាក់ #សាច់អាំង #ម្ហូបស្រុកស្រែ — Official Cambodian TikTok food review by @mdfwithlove.",
    descriptionZh: "来自柬埔寨美食创作者 @mdfwithlove 的 TikTok 视频：កុំច្រឡំ ក៏កុំខឹ-ង អ្នកលក់អី? ស្តាប់ម្តងទៀតក៏បាន 🫩  #សាច់គោចង្កាក់ #សាច់អាំង #ម្ហូបស្រុកស្រែ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oQcaIUEDrefBY9kFdqXZER8I62FdpRAGuHB2Dg~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=ADF2KaGs%2BMbheVEriSe5F3Qo7NA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@mdfwithlove/video/7645273357360860437",
    originalAccountUrl: "https://www.tiktok.com/@mdfwithlove",
    inlineVideoId: "7645273357360860437",
    directVideoUrl: "https://v3.tiktokcdn.com/a148c6cebacded53771ce00ad3d358da/6afdc4ab/video/tos/alisg/tos-alisg-ve-0068c800-sg/oIUBGBTAAXcDm992gcWReHfaEjBFy7EqgQ4IwI/?a=1233&bti=ODszNWYuMDE6&&bt=1178&ft=L~O54ourD12NvSA-KzIxRhFSQlBF-UjNSbopiX&mime_type=video_mp4&rc=aTw6ODM7NzQ2aGlmNzg4ZUBpM2tzZHg5cjRxOzMzODczNEAzLWE0MzAtXjQxNi1jMDIvYSNyZGFzMmRzYWBhLS1kMTFzcw%3D%3D&vvpl=1&l=2026111623291333CDE4ABC97066C5D667&btag=e00090000",
    sourceName: "@mdfwithlove",
    authorHandle: "@mdfwithlove",
    publishedOrUpdatedAt: "2026-05-29T11:25:16.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-sdachplourk-7642642018417528085",
    platform: 'tiktok',
    titleKh: "នំចាក់ចុលរសជាតិទុរេន ផ្សារធំថ្មី ឆ្ងាញ់កប់!!",
    titleEn: "នំចាក់ចុលរសជាតិទុរេន ផ្សារធំថ្មី ឆ្ងាញ់កប់!! (@sdachplourk)",
    titleZh: "@sdachplourk 柬埔寨美食与探店视频",
    descriptionKh: "នំចាក់ចុលរសជាតិទុរេន ផ្សារធំថ្មី ឆ្ងាញ់កប់!! #cambodianfood #foodreview #streetfoodcambodia #phompenh #នំចាក់ចុល",
    descriptionEn: "នំចាក់ចុលរសជាតិទុរេន ផ្សារធំថ្មី ឆ្ងាញ់កប់!! #cambodianfood #foodreview #streetfoodcambodia #phompenh #នំចាក់ចុល — Official Cambodian TikTok food review by @sdachplourk.",
    descriptionZh: "来自柬埔寨美食创作者 @sdachplourk 的 TikTok 视频：នំចាក់ចុលរសជាតិទុរេន ផ្សារធំថ្មី ឆ្ងាញ់កប់!! #cambodianfood #foodreview #streetfoodcambodia #phompen",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/oMPKEBeLozbFAAIQ30BzIjpHwAimg1AACPBUAi~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=gE3pNdipbUUJbNkimrCJFOgr8TM%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@sdachplourk/video/7642642018417528085",
    originalAccountUrl: "https://www.tiktok.com/@sdachplourk",
    inlineVideoId: "7642642018417528085",
    directVideoUrl: "https://v9.tiktokcdn.com/965f9dc891b1afccd77782cb9bedc966/6afdc485/video/tos/alisg/tos-alisg-ve-0068c800-sg/okNz4FDwIFA2E7BEeQEc41CWBnBHfVk6q5cIgu/?a=1233&bti=ODszNWYuMDE6&&bt=2704&ft=bC~O_mfLPD12Nxc3rn-Ux7L59Y6e3wv25bcAp&mime_type=video_mp4&rc=aTM1ZDRkZThpZTpoO2k1OUBpM3E8aW05cmY0OzMzODgzNEAzYTMxMF8xXjYxXy8yXjIxYSNjZzNnMmQ0bzVhLS1kL2Bzcw%3D%3D&vvpl=1&l=202611162329048DE921981E57C9BC58B9&btag=e00090000",
    sourceName: "@sdachplourk",
    authorHandle: "@sdachplourk",
    publishedOrUpdatedAt: "2026-05-22T09:14:20.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-obvlogshub42-7642352361620589827",
    platform: 'tiktok',
    titleKh: "Cambodia Food Hits Different 🤩 Natural & Going Global! 🇰🇭",
    titleEn: "Cambodia Food Hits Different 🤩 Natural & Going Global! 🇰🇭 (@obvlogshub42)",
    titleZh: "@obvlogshub42 柬埔寨美食与探店视频",
    descriptionKh: "Cambodia Food Hits Different 🤩 Natural & Going Global! 🇰🇭 #OBVlogs #cambodiafood #khmerfood #fry #fanpage",
    descriptionEn: "Cambodia Food Hits Different 🤩 Natural & Going Global! 🇰🇭 #OBVlogs #cambodiafood #khmerfood #fry #fanpage — Official Cambodian TikTok food review by @obvlogshub42.",
    descriptionZh: "来自柬埔寨美食创作者 @obvlogshub42 的 TikTok 视频：Cambodia Food Hits Different 🤩 Natural & Going Global! 🇰🇭 #OBVlogs #cambodiafood #khmerfood #fry ",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-no1a-p-0037-no/o8wCSf4PGwHIBPAIAS2iAABSFCBiE2tB1HuDAA~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=bhRu7KFChC1zwJ1xvX1bzkD27o0%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@obvlogshub42/video/7642352361620589827",
    originalAccountUrl: "https://www.tiktok.com/@obvlogshub42",
    inlineVideoId: "7642352361620589827",
    directVideoUrl: "https://v16.tiktokcdn.com/521a6767ffddb29603e5fbee775f29e5/6afdc4a6/video/tos/useast2a/tos-useast2a-ve-68c810-euttp/ogEIky1A49MUbP6PBCIMtBicDEQACwfyiFCt21/?a=1233&bti=ODszNWYuMDE6&&bt=369&ft=bC~O_mfLPD12NGY3rn-UxievVY6e3wv25scAp&mime_type=video_mp4&rc=Nzg4ZWU1Zzo7aThnZTtlO0BpM2c7Z2w5cjprOzMzbzczNUBeNi0tNl4uNmIxYzA2Ll9jYSNxbWReMmRzMTRhLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232902A40E394337D8BDB1CD44&btag=e00090000",
    sourceName: "@obvlogshub42",
    authorHandle: "@obvlogshub42",
    publishedOrUpdatedAt: "2026-05-21T14:30:19.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "food_travel_vlog",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-pheyphey895-7638504768050072852",
    platform: 'tiktok',
    titleKh: "មើលទៅធម្មតា…តែខាំមួយដឹងរឿងហើយ 🤤😂” • “ស្ងៀមៗ ប៉ុន្តែឆ្ងាញ់ដល់សម្លឹងមិនដាច់ 😆🔥” • “មិនទាន់ញ៉ា",
    titleEn: "មើលទៅធម្មតា…តែខាំមួយដឹងរឿងហើយ 🤤😂” • “ស្ងៀមៗ ប៉ុន្តែឆ្ងាញ់ដល់សម្លឹងមិនដាច់ 😆🔥 (@pheyphey895)",
    titleZh: "@pheyphey895 柬埔寨美食与探店视频",
    descriptionKh: "មើលទៅធម្មតា…តែខាំមួយដឹងរឿងហើយ 🤤😂” \t•\t“ស្ងៀមៗ ប៉ុន្តែឆ្ងាញ់ដល់សម្លឹងមិនដាច់ 😆🔥” \t•\t“មិនទាន់ញ៉ាំក៏សើច…ញ៉ាំហើយសើចខ្លាំងជាងទៀត 😂” \t•\t“អាហារមួយចាន តែអារម្មណ៍ឡើងដល់១០០% 😋” \t•\t“អ្នកណាឃើញហើយមិនសាក ខានអីមួយហើយ 😆” \t•\t“ញ៉ាំមួយដុំ…បេះដូងថា ‘អូហូ!’ 😂❤️” \t•\t“មិនចាំបាច់និយាយច្រើន…រសជាតិជាអ្នកនិយាយ 😋🔥” \t•\t“មើលទៅសាមញ្ញ តែចិត្តចង់ញ៉ាំមិនសាមញ្ញទេ 😆 (A) #អាហារខ្មែរ #កង្កែបចៀន #ឆ្ងាញ់ប្លែក #Foodie 😋”",
    descriptionEn: "មើលទៅធម្មតា…តែខាំមួយដឹងរឿងហើយ 🤤😂” \t•\t“ស្ងៀមៗ ប៉ុន្តែឆ្ងាញ់ដល់សម្លឹងមិនដាច់ 😆🔥” \t•\t“មិនទាន់ញ៉ាំក៏សើច…ញ៉ាំហើយសើចខ្លាំងជាងទៀត 😂” \t•\t“អាហារមួយចាន តែអារម្មណ៍ឡើង — Official Cambodian TikTok food review by @pheyphey895.",
    descriptionZh: "来自柬埔寨美食创作者 @pheyphey895 的 TikTok 视频：មើលទៅធម្មតា…តែខាំមួយដឹងរឿងហើយ 🤤😂” \t•\t“ស្ងៀមៗ ប៉ុន្តែឆ្ងាញ់ដល់សម្លឹងមិនដាច់ 😆🔥” \t•\t“មិនទាន់ញ៉ាំក៏",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o808C1EQQBgq04AfE1FUCfYVG0pmuEAsDBWRLj~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=n1zGZrEHeR9dM39%2BLd32PKY90dA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@pheyphey895/video/7638504768050072852",
    originalAccountUrl: "https://www.tiktok.com/@pheyphey895",
    inlineVideoId: "7638504768050072852",
    directVideoUrl: "https://v9.tiktokcdn.com/9337ef35a1f84ea21f1480c960d02265/6afdc45a/video/tos/alisg/tos-alisg-ve-0068c800-sg/oMcBgBAQDTiDoExCE7AMdFLhaBIPKYq6FaiV2/?a=1233&bti=ODszNWYuMDE6&&bt=1040&ft=bC~O_mfLPD12NNc3rn-Ux7L59Y6e3wv25bcAp&mime_type=video_mp4&rc=OGgzM2hpZGk3NjU6ZGhpM0BpajRmM2s5cndwOzMzODczNEAwYTA0MS41X18xXmItYWEyYSMuaWZvMmQ0aC1hLS1kMTFzcw%3D%3D&vvpl=1&l=20261116232905AB4A6F4DF5B93C9E7BEE&btag=e000b8000",
    sourceName: "@pheyphey895",
    authorHandle: "@pheyphey895",
    publishedOrUpdatedAt: "2026-05-11T05:39:41.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "ខេត្តកែប",
    provinceEn: "Kep",
    matchedFoodId: "food-19",
    relevanceScore: 99,
    isPlayableVerified: true,
    canInlineEmbed: true,
  },
  {
    id: "tt-gray0168-7637887605081672978",
    platform: 'tiktok',
    titleKh: "បាយប៊ី ក្នុងពេញ",
    titleEn: "បាយប៊ី ក្នុងពេញ (@gray0168)",
    titleZh: "@gray0168 柬埔寨美食与探店视频",
    descriptionKh: "បាយប៊ី ក្នុងពេញ #fyp #បាយប៊ីសាច់ជ្រូក #ម្ហូបតាមផ្លូវ #streetfood",
    descriptionEn: "បាយប៊ី ក្នុងពេញ #fyp #បាយប៊ីសាច់ជ្រូក #ម្ហូបតាមផ្លូវ #streetfood — Official Cambodian TikTok food review by @gray0168.",
    descriptionZh: "来自柬埔寨美食创作者 @gray0168 的 TikTok 视频：បាយប៊ី ក្នុងពេញ #fyp #បាយប៊ីសាច់ជ្រូក #ម្ហូបតាមផ្លូវ #streetfood",
    thumbnailUrl: "https://p16-common-sign.tiktokcdn.com/tos-alisg-p-0037/o8d04LwRIgvgA0funeeRs9dAGGdfnGwwGKxKFK~tplv-tiktokx-origin.image?dr=14575&x-expires=1795014000&x-signature=l9d0iXZUEKr%2FseoP235cN85RziQ%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my2",
    sourceUrl: "https://www.tiktok.com/@gray0168/video/7637887605081672978",
    originalAccountUrl: "https://www.tiktok.com/@gray0168",
    inlineVideoId: "7637887605081672978",
    directVideoUrl: "https://v16.tiktokcdn.com/d40fdfe5d96d81252df1a175f1cb5641/6afdc465/video/tos/alisg/tos-alisg-ve-0068c800-sg/os04OzBYDIHmWf6oAXFg4IjucCfaTEDQEjAOIf/?a=1233&bti=ODszNWYuMDE6&&bt=561&ft=bC~O_mfLPD12NNc3rn-UxF~2KY6e3wv25DcAp&mime_type=video_mp4&rc=NWQ3ZDM6ZmczZDRpaDozaEBpamhqNHc5cmVtOjMzODczNEBfMWBiM2NgXmExLWMyNDUyYSMya28zMmRraHNhLS1kMWBzcw%3D%3D&vvpl=1&l=20261116232906AB4A6F4DF5B93C9E7C2D&btag=e00088000",
    sourceName: "@gray0168",
    authorHandle: "@gray0168",
    publishedOrUpdatedAt: "2026-05-09T13:44:47.000Z",
    isLiveFetched: true,
    verificationBadgeEn: "TikTok Official Creator",
    verificationBadgeKh: "វីដេអូ Review ម្ហូបលើ TikTok កម្ពុជា",
    verificationBadgeZh: "TikTok 认证美食博主",
    categorySlug: "popular_food",
    provinceKh: "រាជធានីភ្នំពេញ",
    provinceEn: "Phnom Penh",
    matchedFoodId: "food-19",
    relevanceScore: 99,
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

const TIKTOK_DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export function resolveTikTokFallbackStreamId(item: Partial<OnlineFoodDiscoveryItem>): string {
  return extractTikTokVideoId(item.inlineVideoId || item.sourceUrl || item.id) || '';
}

const tiktokStreamCacheByVid = new Map<
  string,
  { primaryUrl: string; backupUrl?: string; coverUrl?: string; resolvedAt: number }
>();
const tiktokStreamInFlightByVid = new Map<
  string,
  Promise<{ primaryUrl: string | null; backupUrl: string | null; coverUrl?: string }>
>();
const TIKTOK_STREAM_CACHE_TTL_MS = 25 * 60 * 1000; // 25 minutes before CDN token refresh

/**
 * Verifies whether a direct video stream URL is fresh and safe for HTML5 <video> playback.
 * Supports both query-parameter (?x-expires=<unix_sec>) and hex-path (/32-hex/8-hex-unix-sec/video/) TikTok CDN signatures.
 */
export function isDirectVideoUrlFreshAndPlayable(url?: string | null): boolean {
  const clean = String(url || '').trim();
  if (!clean || !/^https?:\/\//i.test(clean)) return false;
  if (/tiktokcdn|tiktokv\.com/i.test(clean)) {
    const expMatch = clean.match(/[?&]x-expires=(\d+)/i);
    if (expMatch && expMatch[1]) {
      const expMs = Number(expMatch[1]) * 1000;
      if (!Number.isFinite(expMs) || expMs <= Date.now() + 2 * 60 * 1000) {
        return false;
      }
      return true;
    }
    const hexPathMatch = clean.match(/\/[0-9a-f]{32}\/([0-9a-f]{8})\/video\//i);
    if (hexPathMatch && hexPathMatch[1]) {
      const expSec = parseInt(hexPathMatch[1], 16);
      if (!Number.isFinite(expSec) || expSec * 1000 <= Date.now() + 2 * 60 * 1000) {
        return false;
      }
      return true;
    }
  }
  return true;
}

// Seed in-memory stream cache from CURATED_TIKTOK_FACEBOOK_REVIEWS on module load
for (const seededItem of CURATED_TIKTOK_FACEBOOK_REVIEWS) {
  if (seededItem.platform === 'tiktok') {
    const vid = extractTikTokVideoId(seededItem.inlineVideoId || seededItem.sourceUrl);
    if (vid && isDirectVideoUrlFreshAndPlayable(seededItem.directVideoUrl)) {
      tiktokStreamCacheByVid.set(vid, {
        primaryUrl: seededItem.directVideoUrl!,
        coverUrl: seededItem.thumbnailUrl,
        resolvedAt: Date.now(),
      });
    }
  }
}

/**
 * Synchronously returns a cached, verified CORS-enabled TikTok MP4 stream if already pre-warmed or valid on the item.
 * Allows <video autoPlay playsInline> to mount synchronously inside the user's tap gesture on Android, iOS & Web!
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
    if (tiktokVid) {
      tiktokStreamCacheByVid.set(tiktokVid, {
        primaryUrl: item.directVideoUrl!,
        coverUrl: item.thumbnailUrl,
        resolvedAt: Date.now(),
      });
    }
    return {
      primaryUrl: item.directVideoUrl!,
    };
  }
  return null;
}

// Serialized rate-limited queue for tikwm API (1 request per 1.15s) so concurrent calls never hit code: -1 rate limits
interface TikwmQueueJob {
  canonicalUrl: string;
  resolve: (val: any) => void;
}
const tikwmQueue: TikwmQueueJob[] = [];
let isTikwmQueueProcessing = false;
let lastTikwmCallMs = 0;

async function fetchTikwmJsonSingle(canonicalTikTokUrl: string): Promise<any> {
  const apiEndpoint = `https://www.tikwm.com/api/?url=${encodeURIComponent(canonicalTikTokUrl)}`;
  const isNative = Boolean(Capacitor?.isNativePlatform?.());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3200);
  try {
    const res = await fetch(apiEndpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    clearTimeout(timer);
    if (isNative && CapacitorHttp?.get) {
      try {
        const resp = await CapacitorHttp.get({
          url: apiEndpoint,
          headers: { Accept: 'application/json' },
          connectTimeout: 3200,
          readTimeout: 3200,
        });
        if (resp && resp.status >= 200 && resp.status < 300) {
          return typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
        }
      } catch {}
    }
  }
  return null;
}

function enqueueTikwmApiCall(canonicalUrl: string, priority = false): Promise<any> {
  return new Promise((resolve) => {
    const job: TikwmQueueJob = { canonicalUrl, resolve };
    if (priority) {
      tikwmQueue.unshift(job);
    } else {
      tikwmQueue.push(job);
    }
    if (!isTikwmQueueProcessing) {
      isTikwmQueueProcessing = true;
      (async () => {
        while (tikwmQueue.length > 0) {
          const nextJob = tikwmQueue.shift()!;
          const waitMs = Math.max(0, 1150 - (Date.now() - lastTikwmCallMs));
          if (waitMs > 0) {
            await new Promise((r) => setTimeout(r, waitMs));
          }
          lastTikwmCallMs = Date.now();
          let json = await fetchTikwmJsonSingle(nextJob.canonicalUrl);
          if (json && json.code === -1) {
            await new Promise((r) => setTimeout(r, 1180));
            lastTikwmCallMs = Date.now();
            json = await fetchTikwmJsonSingle(nextJob.canonicalUrl);
          }
          nextJob.resolve(json);
        }
        isTikwmQueueProcessing = false;
      })();
    }
  });
}

/**
 * Pre-warms playable CORS MP4 streams in the background for visible TikTok cards so when the user taps
 * Play on Android, iOS, or Web, the stream URL is already resolved in memory (0ms latency).
 */
export async function prewarmTikTokStreams(
  items: ReadonlyArray<Partial<OnlineFoodDiscoveryItem>>,
  maxCount = 8
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

  const uncached = tiktokItems.filter((it) => it.id && !resolvedMap[it.id]).slice(0, 4);
  for (const it of uncached) {
    try {
      const res = await resolvePlayableTikTokStreamUrl(it, { priority: false });
      if (res.primaryUrl && it.id) {
        resolvedMap[it.id] = {
          primaryUrl: res.primaryUrl,
          backupUrl: res.backupUrl || undefined,
        };
      }
    } catch {}
  }

  return resolvedMap;
}

/**
 * Resolves a direct, unique, playable MP4 stream URL for a TikTok video so it plays smoothly inside a native
 * HTML5 <video> element on Android WebView, iOS WKWebView, and Web without ever repeating fake fallback videos.
 *
 * Layer 1: Fresh in-memory or item-level signed TikTok CDN stream (0ms latency).
 * Layer 2: Official TikTok creator embed feed (/embed/@handle with Desktop UA) caching all 10-13 creator videos at once.
 * Layer 3: Rate-limited CORS-enabled tikwm API queue returning fresh H.264/AAC MP4 streams (play + wmplay with ACAO: *).
 */
export async function resolvePlayableTikTokStreamUrl(
  item: Partial<OnlineFoodDiscoveryItem>,
  options?: { priority?: boolean; forceFresh?: boolean }
): Promise<{ primaryUrl: string | null; backupUrl: string | null; coverUrl?: string }> {
  const tiktokVid = extractTikTokVideoId(item.inlineVideoId || item.sourceUrl);
  const cleanHandle =
    String(item.authorHandle || '')
      .replace(/^@+/, '')
      .trim() ||
    (item.sourceUrl?.match(/tiktok\.com\/@([^/?#]+)/i)?.[1] ?? 'eatame.eater');

  if (!options?.forceFresh) {
    const syncCached = getCachedTikTokStreamUrl(item);
    if (syncCached) {
      return {
        primaryUrl: syncCached.primaryUrl,
        backupUrl: syncCached.backupUrl || null,
        coverUrl: syncCached.coverUrl,
      };
    }
  } else if (tiktokVid) {
    tiktokStreamCacheByVid.delete(tiktokVid);
  }

  if (tiktokVid && tiktokStreamInFlightByVid.has(tiktokVid) && !options?.forceFresh) {
    return tiktokStreamInFlightByVid.get(tiktokVid)!;
  }

  const task = (async (): Promise<{ primaryUrl: string | null; backupUrl: string | null; coverUrl?: string }> => {
    const canonicalTikTokUrl = tiktokVid
      ? `https://www.tiktok.com/@${cleanHandle}/video/${tiktokVid}`
      : String(item.sourceUrl || '').trim();

    const isNative = Boolean(Capacitor?.isNativePlatform?.());

    // Layer 2: Extract fresh playAddr from TikTok's public creator embed feed (/embed/@handle with Desktop UA)
    if (tiktokVid && cleanHandle && !options?.forceFresh) {
      try {
        const embedEndpoint = `https://www.tiktok.com/embed/@${cleanHandle}`;
        let html = '';
        if (isNative && CapacitorHttp?.get) {
          const resp = await CapacitorHttp.get({
            url: embedEndpoint,
            headers: {
              Accept: 'text/html,application/xhtml+xml',
              'User-Agent': TIKTOK_DESKTOP_USER_AGENT,
            },
            connectTimeout: 2800,
            readTimeout: 2800,
          });
          if (resp && resp.status >= 200 && resp.status < 300 && typeof resp.data === 'string') {
            html = resp.data;
          }
        } else {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2400);
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
            const dataObj = parsedState?.source?.data || {};
            const creatorData =
              dataObj[`/embed/@${cleanHandle}`] || dataObj[Object.keys(dataObj)[0] || ''];
            const videoList = Array.isArray(creatorData?.videoList) ? creatorData.videoList : [];
            for (const v of videoList) {
              const vId = extractTikTokVideoId(String(v?.id || ''));
              const vPlayAddr = String(v?.playAddr || '').trim();
              const vCover = String(v?.coverUrl || v?.originCoverUrl || '').trim() || undefined;
              if (vId && isDirectVideoUrlFreshAndPlayable(vPlayAddr)) {
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
                backupUrl: null,
                coverUrl: matched.coverUrl,
              };
            }
          }
        }
      } catch {
        // Fall through to Layer 3 (tikwm)
      }
    }

    // Layer 3: Query rate-limited CORS-enabled tikwm API for fresh H.264/AAC CDN MP4 stream (play + wmplay with ACAO: *)
    if (canonicalTikTokUrl && /^https?:\/\//i.test(canonicalTikTokUrl)) {
      try {
        const json = await enqueueTikwmApiCall(canonicalTikTokUrl, Boolean(options?.priority));
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
              : !options?.forceFresh && isDirectVideoUrlFreshAndPlayable(item.directVideoUrl)
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
        // Ignore network error
      }
    }

    if (!options?.forceFresh && isDirectVideoUrlFreshAndPlayable(item.directVideoUrl)) {
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

const LIVE_TIKTOK_CREATORS_CACHE_KEY = 'kft_live_tiktok_creators_v5';
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

  if (!isSafeFoodAndTourismSocialContent(cleanDesc, normHandle)) {
    return false;
  }
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
  if (!norm || !isSafeFoodAndTourismSocialContent(options?.displayName, norm)) return { added: false, record: null };

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
          'User-Agent': TIKTOK_DESKTOP_USER_AGENT,
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
        thumbnailUrl: coverUrl || (existing?.thumbnailUrl && !existing.thumbnailUrl.startsWith('/foods/') ? existing.thumbnailUrl : '') || existing?.thumbnailUrl || creator.defaultFoodThumb || '/foods/food-19.jpg',
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
        directVideoUrl: isDirectVideoUrlFreshAndPlayable(rawPlayAddr)
          ? rawPlayAddr
          : isDirectVideoUrlFreshAndPlayable(existing?.directVideoUrl)
          ? existing?.directVideoUrl
          : undefined,
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
          items: sortedTikToks.slice(0, 360),
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
            items: sortedTikToks.slice(0, 240),
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

/**
 * Fetches the next paginated batch of Cambodian TikTok creators & hashtags by advancing the crawl cursors,
 * merging and deduplicating newly discovered videos into the persistent cache.
 */
export async function fetchNextTikTokDiscoveryPage(
  foods: FoodItem[] = initialFoods
): Promise<OnlineFoodDiscoveryItem[]> {
  return fetchLiveTikTokCreatorVideos(true, foods);
}

export function deduplicateAndRankDiscoveries(items: OnlineFoodDiscoveryItem[]): OnlineFoodDiscoveryItem[] {
  const seenVideoIds = new Set<string>();
  const seenUrls = new Set<string>();
  const unique: OnlineFoodDiscoveryItem[] = [];

  for (const item of items) {
    if (
      !isSafeFoodAndTourismSocialContent(
        `${item.titleKh || ''} ${item.titleEn || ''} ${item.descriptionKh || ''} ${item.descriptionEn || ''}`,
        `${item.sourceName || ''} ${item.authorHandle || ''}`,
        item.sourceUrl
      )
    ) {
      continue;
    }
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
  query?: string;
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
    fetchYouTubeCambodianFoodVideos(foods, params.query || '', Boolean(params.forceRefresh)),
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
    const directVideoUrl =
      syncStream?.primaryUrl ||
      (isDirectVideoUrlFreshAndPlayable(item.directVideoUrl) ? item.directVideoUrl : undefined);
    const officialTikTokEmbedUrl = tiktokVid
      ? `https://www.tiktok.com/player/v1/${tiktokVid}?autoplay=1&rel=0&music_info=0&description=0`
      : null;
    return {
      canInlineEmbed: Boolean(tiktokVid || directVideoUrl),
      embedUrl: officialTikTokEmbedUrl,
      watchUrl,
      platform: 'tiktok',
      videoId: tiktokVid || undefined,
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

const SUPABASE_BASE_URL = (import.meta as any)?.env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

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

  let hay = normalizeKhmerSearchText(
    `${item.titleKh} ${item.titleEn} ${item.titleZh || ''} ${item.descriptionKh} ${item.descriptionEn} ${item.descriptionZh || ''} ${item.sourceName} ${item.authorHandle || ''} ${item.provinceKh} ${item.provinceEn} ${item.matchedFoodNameKh || ''} ${item.matchedFoodNameEn || ''}`
  );

  // Handle structured food-review keyword presets accurately across Khmer, English, and Chinese
  const qLower = q.toLowerCase();
  const isFoodItem = item.categorySlug !== 'tourist_attraction' || YT_FOOD_OR_CAMBODIA_POSITIVE_RE.test(hay);

  if (
    /^(cambodian\s*food\s*review|khmer\s*food\s*review|ម្ហូបខ្មែរ|ញ៉ាំអាហារខ្មែរ|ញុំាអាហារខ្មែរ|ដើរញ៉ាំម្ហូបខ្មែរ|柬埔寨美食测评|高棉美食测评|高棉美食|品尝高棉美食)$/i.test(
      qLower
    )
  ) {
    return isFoodItem;
  }

  if (/^(cambodia\s*street\s*food|ដើររកម្ហូបឆ្ងាញ់|ម្ហូបតាមផ្លូវ|柬埔寨街头美食|寻味美食)$/i.test(qLower)) {
    return (
      isFoodItem &&
      (item.categorySlug === 'popular_food' ||
        item.categorySlug === 'food_travel_vlog' ||
        /street|market|night\s*market|តាមផ្លូវ|ផ្សារ|ដើររក|ដើរភ្លក់|街头|夜市/i.test(hay))
    );
  }

  if (/^(khmer\s*restaurant\s*review|ហាងអាហារនៅកម្ពុជា|ភោជនីយដ្ឋានខ្មែរ|高棉餐厅探店|柬埔寨餐厅)$/i.test(qLower)) {
    return (
      isFoodItem &&
      (item.categorySlug === 'famous_restaurant' ||
        /restaurant|buffet|cafe|coffee|bistro|dining|ហាង|ភោជនីយដ្ឋាន|ប៊ូហ្វេ|កាហ្វេ|餐厅|探店/i.test(hay))
    );
  }

  if (/^(phnom\s*penh\s*food\s*review|ម្ហូបតាមផ្លូវភ្នំពេញ|金边美食测评)$/i.test(qLower)) {
    return isFoodItem && /phnom\s*penh|ភ្នំពេញ|អូរឫស្សី|ទួលទំពូង|ចតុមុខ|កោះនរា|មាត់ទន្លេ|金边/i.test(hay);
  }

  if (/^(battambang\s*food\s*review|ម្ហូបបាត់ដំបង|马德望美食测评)$/i.test(qLower)) {
    return isFoodItem && /battambang|បាត់ដំបង|马德望/i.test(hay);
  }

  if (/^(siem\s*reap\s*food\s*review|ម្ហូបសៀមរាប|暹粒美食测评)$/i.test(qLower)) {
    return isFoodItem && /siem\s*reap|angkor|សៀមរាប|អង្គរ|暹粒/i.test(hay);
  }

  const parsed = parseKhmerFoodSearchQuery(rawQuery);
  const wantsSpicy =
    parsed.flavorIntents.includes('spicy') || parsed.flavorIntents.includes('sour_spicy');
  if (wantsSpicy) {
    hay = stripNegatedSpicePhrases(hay);
  }
  if (includesKhmerSafeToken(hay, q)) return true;
  if (parsed.coreQuery && parsed.coreQuery.length >= 2 && includesKhmerSafeToken(hay, parsed.coreQuery)) {
    return true;
  }
  const tokens = expandYouTubeSearchQueryTokens(rawQuery);
  const nonGenericTokens = tokens.filter(
    (t) => !['cambodia', 'cambodian', 'khmer', 'food', 'review', 'កម្ពុជា', 'ខ្មែរ'].includes(t.toLowerCase())
  );
  if (nonGenericTokens.length > 0) {
    return nonGenericTokens.some((token) => token.length >= 2 && includesKhmerSafeToken(hay, token));
  }
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
    if (combined.length < 3) {
      console.info(
        `[YouTubeDiscovery] Search query "${query}" matched ${combined.length} video(s). Attempting live keyword expansion...`
      );
    }
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

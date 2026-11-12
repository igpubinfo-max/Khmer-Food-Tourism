import {
  getDestinationGoogleExternalUrl,
  getRestaurantGoogleExternalUrl,
  isHotelBusinessRecord,
  isAdminAccount,
  isPlaceLocationVerified,
  isUserOwnerOfRestaurantRecord,
  isUserVipActive,
  isUserOnConsumerFreeTrial,
  getConsumerVipPricingCatalog,
  resolveFoodPhotoUrl,
  type FoodItem,
  type Language,
  type Restaurant,
  type TouristDestination,
  type TrendingFoodItem,
  type TripPlan,
  type User,
} from '../types';
import { tr } from '../utils/i18n';
import { getLocalizedDestination, getLocalizedFood, getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { isMedicalOrHealthQuery, type BrainChip } from './aiFoodBrain';

export type AiAgentUserRole = 'normal_user' | 'shop_owner' | 'admin';

export type AiAgentToolName =
  | 'search_verified_shops'
  | 'search_verified_hotels'
  | 'search_food_database'
  | 'find_nearby_restaurants'
  | 'get_shop_details'
  | 'get_google_maps_directions'
  | 'recommend_khmer_food'
  | 'create_travel_itinerary'
  | 'analyze_food_nutrition'
  | 'search_trending_youtube_videos'
  | 'add_to_favorites'
  | 'update_own_shop_profile';

export interface AiAgentMcpToolDefinition {
  name: AiAgentToolName;
  titleKh: string;
  titleEn: string;
  minRole: AiAgentUserRole;
  requiresConfirmation: boolean;
  zeroCostLocal: boolean;
}

export const AI_AGENT_MCP_TOOL_CATALOG: AiAgentMcpToolDefinition[] = [
  {
    name: 'search_verified_shops',
    titleKh: 'ស្វែងរកហាងអាហារ និងហាងកាហ្វេផ្ទៀងផ្ទាត់',
    titleEn: 'Search Verified Restaurants & Cafes',
    minRole: 'normal_user',
    requiresConfirmation: false,
    zeroCostLocal: true,
  },
  {
    name: 'search_verified_hotels',
    titleKh: 'ស្វែងរកសណ្ឋាគារ និងរីសតផ្ទៀងផ្ទាត់',
    titleEn: 'Search Verified Hotels & Resorts',
    minRole: 'normal_user',
    requiresConfirmation: false,
    zeroCostLocal: true,
  },
  {
    name: 'find_nearby_restaurants',
    titleKh: 'ស្វែងរកហាង និងកន្លែងជិតខ្ញុំ (GPS)',
    titleEn: 'Find Nearby Restaurants & Places (GPS)',
    minRole: 'normal_user',
    requiresConfirmation: false,
    zeroCostLocal: true,
  },
  {
    name: 'recommend_khmer_food',
    titleKh: 'ណែនាំមុខម្ហូបខ្មែរ (ព្រឹក/ថ្ងៃត្រង់/ល្ងាច)',
    titleEn: 'Recommend Cambodian Dishes',
    minRole: 'normal_user',
    requiresConfirmation: false,
    zeroCostLocal: true,
  },
  {
    name: 'create_travel_itinerary',
    titleKh: 'រៀបចំផែនការដើរលេង និងថវិកា',
    titleEn: 'Create Travel Itinerary & Budget',
    minRole: 'normal_user',
    requiresConfirmation: false,
    zeroCostLocal: true,
  },
  {
    name: 'analyze_food_nutrition',
    titleKh: 'វិភាគកាឡូរី និងអាហារូបត្ថម្ភប្រហាក់ប្រហែល',
    titleEn: 'Analyze Food Calories & Nutrition',
    minRole: 'normal_user',
    requiresConfirmation: false,
    zeroCostLocal: true,
  },
  {
    name: 'search_trending_youtube_videos',
    titleKh: 'ស្វែងរកម្ហូប និងហាងកំពុងល្បី (Trending Videos)',
    titleEn: 'Discover Trending Food & Videos',
    minRole: 'normal_user',
    requiresConfirmation: false,
    zeroCostLocal: true,
  },
  {
    name: 'get_google_maps_directions',
    titleKh: 'បង្ហាញផ្លូវធ្វើដំណើរ Google Maps ($0 Deep Link)',
    titleEn: 'Google Maps Directions ($0 Deep Link)',
    minRole: 'normal_user',
    requiresConfirmation: false,
    zeroCostLocal: true,
  },
  {
    name: 'add_to_favorites',
    titleKh: 'រក្សាទុកចូលបញ្ជីចូលចិត្ត (Wishlist)',
    titleEn: 'Save Dish, Shop or Hotel to Favorites',
    minRole: 'normal_user',
    requiresConfirmation: false,
    zeroCostLocal: true,
  },
  {
    name: 'update_own_shop_profile',
    titleKh: 'ជំនួយការម្ចាស់ហាង/សណ្ឋាគារកែប្រែព័ត៌មានផ្ទាល់ខ្លួន',
    titleEn: 'Shop & Hotel Owner Profile Assistant',
    minRole: 'shop_owner',
    requiresConfirmation: true,
    zeroCostLocal: true,
  },
];

export interface AiAgentHotelCardItem {
  id: string;
  sourceType: 'restaurant_hotel' | 'destination_hotel';
  nameKh: string;
  nameEn: string;
  provinceKh: string;
  provinceEn: string;
  addressKh: string;
  addressEn: string;
  photoUrl: string;
  priceDisplay: string;
  phone?: string;
  rating: number;
  isVerified: boolean;
  latitude: number;
  longitude: number;
  mapUrl: string;
  distanceKm?: number;
  restaurantRecord?: Restaurant;
  destinationRecord?: TouristDestination;
}

export interface AiAgentNutritionReport {
  dishId?: string;
  dishNameKh: string;
  dishNameEn: string;
  photoUrl?: string;
  caloriesKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  healthLevel: 'healthy' | 'balanced' | 'indulgent';
  healthBadgeLabel: string;
  keyIngredients: string[];
  summaryNote: string;
}

export interface AiAgentOwnerFieldChange {
  field: 'openingHours' | 'phone' | 'priceRange' | 'description';
  labelKh: string;
  labelEn: string;
  oldValue: string;
  newValue: string;
}

export interface AiAgentPendingOwnerUpdate {
  actionId: string;
  businessId: string;
  businessNameKh: string;
  businessNameEn: string;
  isHotel: boolean;
  changes: AiAgentOwnerFieldChange[];
  patch: Partial<Restaurant>;
}

export interface AiAgentFavoriteCandidate {
  id: string;
  type: 'food' | 'restaurant' | 'destination';
  nameKh: string;
  nameEn: string;
  photoUrl: string;
  categoryKh?: string;
  provinceKh?: string;
  priceDisplay?: string;
  rating?: number;
}

export interface AiAgentDirectionsTarget {
  placeName: string;
  province: string;
  distanceKm?: number;
  mapUrl: string;
}

export interface AiAgentToolResult {
  handled: boolean;
  toolName: AiAgentToolName;
  userRole: AiAgentUserRole;
  latencyMs: number;
  fromCache: boolean;
  estimatedCostUsd: number;
  headline: string;
  shops?: Restaurant[];
  shopDistancesKm?: Record<string, number>;
  hotels?: AiAgentHotelCardItem[];
  attractions?: TouristDestination[];
  dishes?: FoodItem[];
  itinerary?: TripPlan;
  nutrition?: AiAgentNutritionReport;
  trendingItems?: TrendingFoodItem[];
  directionsTarget?: AiAgentDirectionsTarget;
  favoriteCandidate?: AiAgentFavoriteCandidate;
  pendingOwnerUpdate?: AiAgentPendingOwnerUpdate;
  blockedReason?: string;
  followUpChips: BrainChip[];
}

export interface AiAgentAuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: AiAgentUserRole;
  toolName: AiAgentToolName;
  queryPreview: string;
  latencyMs: number;
  fromCache: boolean;
  status: 'ok' | 'confirm_required' | 'blocked' | 'rate_limited' | 'error';
  note?: string;
}

export interface AiAgentTelemetrySnapshot {
  totalRequests: number;
  cacheHits: number;
  totalLatencyMs: number;
  estimatedTotalCostUsd: number;
  blockedRequests: number;
  failedRequests: number;
  toolCounts: Record<string, number>;
  topSearchedFoods: Record<string, number>;
  topSearchedShops: Record<string, number>;
  activeUserIds: string[];
  recentAuditLogs: AiAgentAuditEntry[];
  lastUpdatedAt: string;
}

const TELEMETRY_STORAGE_KEY = 'kft_ai_agent_telemetry_v1';
const MAX_AUDIT_LOGS = 80;
const MAX_CACHE_ENTRIES = 120;
const CACHE_TTL_MS = 10 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 25;

// In-memory LRU Cache & Sliding-Window Rate Limiter (Zero battery/network overhead)
const responseCache = new Map<string, { expiresAt: number; result: AiAgentToolResult }>();
const userRateBuckets = new Map<string, number[]>();

const PROVINCE_DIRECTORY: Array<{
  kh: string;
  en: string;
  zh: string;
  lat: number;
  lng: number;
  re: RegExp;
}> = [
  { kh: 'ភ្នំពេញ', en: 'Phnom Penh', zh: '金边', lat: 11.5564, lng: 104.9282, re: /ភ្នំពេញ|phnom\s*penh|金边/i },
  { kh: 'សៀមរាប', en: 'Siem Reap', zh: '暹粒', lat: 13.3633, lng: 103.8564, re: /សៀមរាប|siem\s*reap|អង្គរ|angkor|暹粒|吴哥/i },
  { kh: 'ព្រះសីហនុ', en: 'Preah Sihanouk', zh: '西哈努克', lat: 10.6253, lng: 103.5234, re: /ព្រះសីហនុ|កំពង់សោម|sihanouk|កោះរ៉ុង|koh\s*rong|西哈努克|西港|高龙岛/i },
  { kh: 'កំពត', en: 'Kampot', zh: '贡布', lat: 10.6104, lng: 104.1815, re: /កំពត|kampot|បូកគោ|bokor|贡布|波哥/i },
  { kh: 'កែប', en: 'Kep', zh: '白马', lat: 10.4833, lng: 104.3167, re: /កែប|\bkep\b|កោះទន្សាយ|ផ្សារក្តាម|ផ្សារក្ដាម|白马/i },
  { kh: 'បាត់ដំបង', en: 'Battambang', zh: '马德望', lat: 13.0957, lng: 103.2022, re: /បាត់ដំបង|battambang|马德望/i },
  { kh: 'មណ្ឌលគិរី', en: 'Mondulkiri', zh: '蒙多基里', lat: 12.4558, lng: 107.1881, re: /មណ្ឌលគិរី|mondulkiri|ប៊ូស្រា|សែនមនោរម្យ|蒙多基里/i },
  { kh: 'រតនគិរី', en: 'Ratanakiri', zh: '拉达那基里', lat: 13.7394, lng: 106.9872, re: /រតនគិរី|ratanakiri|យក្សឡោម|បានលុង|拉达那基里/i },
  { kh: 'កោះកុង', en: 'Koh Kong', zh: '国公', lat: 11.6153, lng: 102.9838, re: /កោះកុង|koh\s*kong|តាតៃ|ដារ៉ាសាគរ|国公/i },
  { kh: 'កំពង់ចាម', en: 'Kampong Cham', zh: '磅湛', lat: 11.9934, lng: 105.4635, re: /កំពង់ចាម|kampong\s*cham|磅湛/i },
  { kh: 'កំពង់ឆ្នាំង', en: 'Kampong Chhnang', zh: '磅清扬', lat: 12.25, lng: 104.6667, re: /កំពង់ឆ្នាំង|kampong\s*chhnang|磅清扬/i },
  { kh: 'កំពង់ស្ពឺ', en: 'Kampong Speu', zh: '磅士卑', lat: 11.4533, lng: 104.5208, re: /កំពង់ស្ពឺ|kampong\s*speu|គិរីរម្យ|ភ្នំឱរ៉ាល់|ខ្នងផ្សារ|磅士卑|基里隆/i },
  { kh: 'កំពង់ធំ', en: 'Kampong Thom', zh: '磅同', lat: 12.7111, lng: 104.8887, re: /កំពង់ធំ|kampong\s*thom|សំបូរព្រៃគុក|磅同/i },
  { kh: 'កណ្តាល', en: 'Kandal', zh: '干丹', lat: 11.4833, lng: 104.95, re: /កណ្តាល|កណ្ដាល|kandal|តាខ្មៅ|干丹/i },
  { kh: 'ក្រចេះ', en: 'Kratie', zh: '桔井', lat: 12.4881, lng: 106.0188, re: /ក្រចេះ|kratie|កាំពី|ផ្សោត|桔井/i },
  { kh: 'ព្រះវិហារ', en: 'Preah Vihear', zh: '柏威夏', lat: 13.8073, lng: 104.9805, re: /ព្រះវិហារ|preah\s*vihear|កោះកេរ|柏威夏/i },
  { kh: 'ពោធិ៍សាត់', en: 'Pursat', zh: '菩萨', lat: 12.5388, lng: 103.9192, re: /ពោធិ៍សាត់|pursat|វាលវែង|ភ្នំ១៥០០|菩萨省/i },
  { kh: 'ព្រៃវែង', en: 'Prey Veng', zh: '波罗勉', lat: 11.4868, lng: 105.3253, re: /ព្រៃវែង|prey\s*veng|波罗勉/i },
  { kh: 'ស្វាយរៀង', en: 'Svay Rieng', zh: '柴桢', lat: 11.0879, lng: 105.7993, re: /ស្វាយរៀង|svay\s*rieng|បាវិត|柴桢/i },
  { kh: 'តាកែវ', en: 'Takeo', zh: '茶胶', lat: 10.9908, lng: 104.785, re: /តាកែវ|takeo|ភ្នំដា|ទន្លេបាទី|茶胶/i },
  { kh: 'បន្ទាយមានជ័យ', en: 'Banteay Meanchey', zh: '卜迭棉芷', lat: 13.5859, lng: 102.9737, re: /បន្ទាយមានជ័យ|banteay\s*meanchey|ប៉ោយប៉ែត|សិរីសោភ័ណ|卜迭棉芷/i },
  { kh: 'ប៉ៃលិន', en: 'Pailin', zh: '拜林', lat: 12.8489, lng: 102.6093, re: /ប៉ៃលិន|pailin|拜林/i },
  { kh: 'ឧត្តរមានជ័យ', en: 'Oddar Meanchey', zh: '奥多棉芷', lat: 14.1817, lng: 103.5176, re: /ឧត្តរមានជ័យ|oddar\s*meanchey|អន្លង់វែង|奥多棉芷/i },
  { kh: 'ស្ទឹងត្រែង', en: 'Stung Treng', zh: '上丁', lat: 13.5259, lng: 105.9683, re: /ស្ទឹងត្រែង|stung\s*treng|上丁/i },
  { kh: 'ត្បូងឃ្មុំ', en: 'Tbong Khmum', zh: '特本克蒙', lat: 11.8891, lng: 105.659, re: /ត្បូងឃ្មុំ|tbong\s*khmum|特本克蒙/i },
];

export function detectAgentProvince(text: string): (typeof PROVINCE_DIRECTORY)[number] | null {
  for (const p of PROVINCE_DIRECTORY) {
    if (p.re.test(text)) return p;
  }
  return null;
}

export function resolveAiAgentUserRole(user: User | null | undefined, restaurants: Restaurant[]): AiAgentUserRole {
  if (!user) return 'normal_user';
  if (
    user.role === 'admin' ||
    user.id === 'admin-authorized-single' ||
    user.username === 'admin' ||
    user.username === 'cheasavuth'
  ) {
    return 'admin';
  }
  if (
    user.role === 'owner' ||
    restaurants.some((r) => isUserOwnerOfRestaurantRecord(user, r))
  ) {
    return 'shop_owner';
  }
  return 'normal_user';
}

export function getOwnedBusinessesForUser(user: User | null | undefined, restaurants: Restaurant[]): Restaurant[] {
  if (!user) return [];
  return restaurants.filter((r) => isUserOwnerOfRestaurantRecord(user, r));
}

function defaultTelemetry(): AiAgentTelemetrySnapshot {
  return {
    totalRequests: 0,
    cacheHits: 0,
    totalLatencyMs: 0,
    estimatedTotalCostUsd: 0,
    blockedRequests: 0,
    failedRequests: 0,
    toolCounts: {},
    topSearchedFoods: {},
    topSearchedShops: {},
    activeUserIds: [],
    recentAuditLogs: [],
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function loadAiAgentTelemetry(): AiAgentTelemetrySnapshot {
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) return defaultTelemetry();
    const parsed = JSON.parse(raw) as Partial<AiAgentTelemetrySnapshot>;
    return {
      ...defaultTelemetry(),
      ...parsed,
      toolCounts: parsed.toolCounts || {},
      topSearchedFoods: parsed.topSearchedFoods || {},
      topSearchedShops: parsed.topSearchedShops || {},
      activeUserIds: Array.isArray(parsed.activeUserIds) ? parsed.activeUserIds.slice(-500) : [],
      recentAuditLogs: Array.isArray(parsed.recentAuditLogs) ? parsed.recentAuditLogs.slice(0, MAX_AUDIT_LOGS) : [],
    };
  } catch {
    return defaultTelemetry();
  }
}

function saveAiAgentTelemetry(snapshot: AiAgentTelemetrySnapshot): void {
  try {
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota errors safely
  }
}

export function resetAiAgentTelemetry(): AiAgentTelemetrySnapshot {
  const fresh = defaultTelemetry();
  responseCache.clear();
  saveAiAgentTelemetry(fresh);
  return fresh;
}

export function recordAiAgentTelemetryEvent(params: {
  user: User | null | undefined;
  userRole: AiAgentUserRole;
  toolName: AiAgentToolName;
  query: string;
  latencyMs: number;
  fromCache?: boolean;
  estimatedCostUsd?: number;
  status?: AiAgentAuditEntry['status'];
  matchedFoodNames?: string[];
  matchedShopNames?: string[];
  note?: string;
}): void {
  const snap = loadAiAgentTelemetry();
  snap.totalRequests += 1;
  if (params.fromCache) snap.cacheHits += 1;
  snap.totalLatencyMs += Math.max(1, Math.round(params.latencyMs || 1));
  snap.estimatedTotalCostUsd = Number((snap.estimatedTotalCostUsd + (params.estimatedCostUsd || 0)).toFixed(5));
  if (params.status === 'blocked' || params.status === 'rate_limited') {
    snap.blockedRequests += 1;
  }
  if (params.status === 'error') {
    snap.failedRequests += 1;
  }
  snap.toolCounts[params.toolName] = (snap.toolCounts[params.toolName] || 0) + 1;

  for (const foodName of params.matchedFoodNames || []) {
    const clean = foodName.trim();
    if (clean) {
      snap.topSearchedFoods[clean] = (snap.topSearchedFoods[clean] || 0) + 1;
    }
  }
  for (const shopName of params.matchedShopNames || []) {
    const clean = shopName.trim();
    if (clean) {
      snap.topSearchedShops[clean] = (snap.topSearchedShops[clean] || 0) + 1;
    }
  }

  const userId = params.user?.id || 'guest';
  if (!snap.activeUserIds.includes(userId)) {
    snap.activeUserIds = [...snap.activeUserIds.slice(-499), userId];
  }

  const entry: AiAgentAuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName: params.user?.name || params.user?.username || 'Guest User',
    userRole: params.userRole,
    toolName: params.toolName,
    queryPreview: (params.query || '').trim().slice(0, 90),
    latencyMs: Math.max(1, Math.round(params.latencyMs || 1)),
    fromCache: Boolean(params.fromCache),
    status: params.status || 'ok',
    note: params.note,
  };
  snap.recentAuditLogs = [entry, ...snap.recentAuditLogs].slice(0, MAX_AUDIT_LOGS);
  snap.lastUpdatedAt = entry.timestamp;
  saveAiAgentTelemetry(snap);
}

function checkRateLimit(userKey: string): boolean {
  const now = Date.now();
  const prev = (userRateBuckets.get(userKey) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (prev.length >= RATE_LIMIT_MAX_REQUESTS) {
    userRateBuckets.set(userKey, prev);
    return false;
  }
  prev.push(now);
  userRateBuckets.set(userKey, prev);
  return true;
}

const DAILY_AI_USAGE_STORAGE_KEY = 'kft_daily_ai_tier_usage_v1';

export function checkAndIncrementDailyTierAiQuota(user?: User | null): {
  allowed: boolean;
  usedToday: number;
  dailyLimit: number;
  isFreeTrial: boolean;
} {
  if (isAdminAccount(user)) {
    return { allowed: true, usedToday: 0, dailyLimit: 9999, isFreeTrial: false };
  }
  const catalog = getConsumerVipPricingCatalog();
  const isFreeTrial = isUserOnConsumerFreeTrial(user);
  const isPaidVip = isUserVipActive(user) && !isFreeTrial;
  const dailyLimit = isPaidVip
    ? catalog.paidAiDailyLimit
    : isFreeTrial
    ? catalog.trialAiDailyLimit
    : 5;
  const todayKey = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const bucketKey = `${user?.id || 'guest'}:${todayKey}`;

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DAILY_AI_USAGE_STORAGE_KEY) : null;
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const used = Math.max(0, Number(map[bucketKey]) || 0);
    if (used >= dailyLimit) {
      return { allowed: false, usedToday: used, dailyLimit, isFreeTrial };
    }
    map[bucketKey] = used + 1;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DAILY_AI_USAGE_STORAGE_KEY, JSON.stringify(map));
    }
    return { allowed: true, usedToday: used + 1, dailyLimit, isFreeTrial };
  } catch {
    return { allowed: true, usedToday: 1, dailyLimit, isFreeTrial };
  }
}

function computeHaversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return 9999;
  }
  if (Math.abs(lat1) < 0.01 || Math.abs(lat2) < 0.01) return 9999;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildAgentRoleChips(
  language: Language,
  user: User | null | undefined,
  restaurants: Restaurant[]
): BrainChip[] {
  const role = resolveAiAgentUserRole(user, restaurants);
  const owned = getOwnedBusinessesForUser(user, restaurants);
  const baseChips: BrainChip[] = [
    {
      id: 'agent_hotels_sr',
      label: tr(language, '🏨 សណ្ឋាគារសៀមរាប', '🏨 Siem Reap Hotels', '🏨 暹粒核实酒店'),
      query: tr(language, 'ស្វែងរកសណ្ឋាគារនៅសៀមរាប', 'Find verified hotels in Siem Reap', '查找暹粒已核实的酒店'),
    },
    {
      id: 'agent_trip_kampot',
      label: tr(language, '🗺️ ផែនការដើរលេងកំពត ២ថ្ងៃ', '🗺️ 2-Day Kampot Trip', '🗺️ 贡布2日游行程'),
      query: tr(language, 'រៀបផែនការដើរលេងកំពត ២ ថ្ងៃ ថវិកាមធ្យម', 'Create a 2-day travel itinerary for Kampot with medium budget', '规划贡布2天中等预算旅行行程'),
    },
    {
      id: 'agent_nearby_shops',
      label: tr(language, '📍 ហាងអាហារជិតខ្ញុំ', '📍 Nearby Restaurants', '📍 附近核实餐厅'),
      query: tr(language, 'ស្វែងរកហាងអាហារ និងហាងកាហ្វេជិតខ្ញុំ', 'Find verified restaurants and coffee shops near me', '查找我附近的已核实餐厅和咖啡馆'),
    },
    {
      id: 'agent_nutrition_amok',
      label: tr(language, '🥗 កាឡូរីអាម៉ុកត្រី', '🥗 Fish Amok Calories', '🥗 阿莫克鱼热量营养'),
      query: tr(language, 'វិភាគកាឡូរី និងអាហារូបត្ថម្ភ អាម៉ុកត្រី', 'Analyze calories and nutrition of Fish Amok', '分析阿莫克鱼的热量和营养成分'),
    },
    {
      id: 'agent_trending_food',
      label: tr(language, '🔥 ម្ហូបកំពុងល្បី YouTube', '🔥 Trending Food Videos', '🔥 热门美食视频'),
      query: tr(language, 'បង្ហាញម្ហូប និងហាងកំពុងល្បីលើ YouTube', 'Show trending Cambodian food and coffee shops on YouTube', '展示热门高棉美食与探店视频'),
    },
  ];

  if (role === 'shop_owner' && owned.length > 0) {
    const myBiz = owned[0];
    const isHotel = isHotelBusinessRecord(myBiz);
    baseChips.unshift({
      id: 'agent_owner_assist',
      label: isHotel
        ? tr(language, '🛠️ ជំនួយការម្ចាស់សណ្ឋាគារ', '🛠️ Hotel Owner AI', '🛠️ 酒店店主助手')
        : tr(language, '🛠️ ជំនួយការម្ចាស់ហាង', '🛠️ Shop Owner AI', '🛠️ 店铺管理助手'),
      query: isHotel
        ? tr(
            language,
            `ជួយកែម៉ោងបើកសណ្ឋាគាររបស់ខ្ញុំ ទៅជា 24 ម៉ោង`,
            `Update my hotel opening hours to Open 24 Hours`,
            `将我的酒店营业时间更新为 24 小时营业`
          )
        : tr(
            language,
            `ជួយកែម៉ោងបើកហាងរបស់ខ្ញុំ ទៅជា 07:00 AM - 09:30 PM`,
            `Update my shop opening hours to 07:00 AM - 09:30 PM`,
            `将我的店铺营业时间修改为 07:00 AM - 09:30 PM`
          ),
    });
  }

  return baseChips;
}

// Intent Detectors (Multilingual KM / EN / ZH)
const OWNER_UPDATE_INTENT_RE =
  /(?:ហាងរបស់ខ្ញុំ|ហាងខ្ញុំ|សណ្ឋាគាររបស់ខ្ញុំ|សណ្ឋាគារខ្ញុំ|កែប្រែហាង|កែម៉ោងបើក|ប្តូរម៉ោងបើក|ប្ដូរម៉ោងបើក|កែលេខទូរស័ព្ទហាង|ប្តូរលេខទូរស័ព្ទហាង|កែតម្លៃបន្ទប់|សរសេរពិពណ៌នាហាង|កែព័ត៌មានហាង|my\s+(?:shop|store|restaurant|cafe|hotel|resort)|update\s+(?:my\s+)?(?:shop|store|restaurant|hotel|opening\s*hours)|change\s+(?:my\s+)?(?:shop|hotel)\s+(?:hours|phone|price|description)|修改我的(?:店铺|餐厅|酒店)|更新(?:我的)?(?:店铺|酒店|营业时间))/i;

const HOTEL_SEARCH_INTENT_RE =
  /(?:សណ្ឋាគារ|ផ្ទះសំណាក់|រីសត|បឹងកាឡូ|កន្លែងស្នាក់នៅ|បន្ទប់គេង|\bhotel\b|\bhotels\b|\bresort\b|\bresorts\b|\bguesthouse\b|\bbungalow\b|\baccommodation\b|\bwhere\s+to\s+stay\b|酒店|度假村|宾馆|民宿|住宿)/i;

const ITINERARY_INTENT_RE =
  /(?:ផែនការដើរលេង|ផែនការកម្សាន្ត|រៀបផែនការ|កម្មវិធីដើរលេង|ដើរលេង\s*[១២៣៤៥៦៧1-7]\s*ថ្ងៃ|[១២៣៤៥៦៧1-7]\s*ថ្ងៃ\s*[១២៣៤៥៦1-6]?\s*យប់|\bitinerary\b|\btrip\s*plan\b|\btravel\s*plan\b|\bplan\s+a\s+(?:\d+[-\s]*day\s+)?trip\b|\b\d+[-\s]*day\s+(?:trip|tour|itinerary)\b|旅游行程|旅行计划|行程规划|[1-7一二三四五六七]\s*日游|[1-7一二三四五六七]\s*天行程)/i;

const TRENDING_VIDEO_INTENT_RE =
  /(?:កំពុងល្បី|ម្ហូបល្បី|ហាងល្បី|វីដេអូម្ហូប|ល្បីលើ\s*(?:youtube|tiktok|facebook|បណ្តាញសង្គម)|\byoutube\b|\btrending\s+(?:food|dishes|restaurants|shops|videos|coffee)\b|\bviral\s+(?:food|dishes|shops)\b|网红美食|热门美食|热门探店|油管美食|抖音热门)/i;

const NUTRITION_INTENT_RE =
  /(?:កាឡូរី|អាហារូបត្ថម្ភ|ប្រូតេអ៊ីន|កាបូអ៊ីដ្រាត|ជាតិខ្លាញ់|ប៉ុន្មានកាឡូរី|វិភាគអាហារូបត្ថម្ភ|\bcalorie\b|\bcalories\b|\bkcal\b|\bnutrition\b|\bnutritional\b|\bprotein\b|\bmacros\b|热量|卡路里|营养成分|蛋白质)/i;

const NEARBY_INTENT_RE =
  /(?:ជិតខ្ញុំ|នៅជិតខ្ញុំ|ជិតទីនេះ|ហាងជិតបំផុត|កន្លែងជិតខ្ញុំ|\bnear\s+me\b|\bnearby\b|\bclosest\s+(?:restaurant|shop|cafe|coffee|hotel|food)\b|\baround\s+me\b|我附近|附近餐厅|附近咖啡|离我最近)/i;

const DIRECTIONS_INTENT_RE =
  /(?:ផ្លូវទៅ|ប្រាប់ផ្លូវទៅ|នាំផ្លូវទៅ|ទីតាំងផែនទីនៃ|បើកផែនទីទៅ|\bdirections\s+to\b|\bnavigate\s+to\b|\bhow\s+to\s+get\s+to\b|\bgoogle\s*maps\s+(?:to|for)\b|导航到|怎么去|路线去)/i;

const FAVORITE_SAVE_INTENT_RE =
  /(?:រក្សាទុកចូលបញ្ជីចូលចិត្ត|ដាក់ចូលបញ្ជីចូលចិត្ត|រក្សាទុក\s+.+\s*ចូល\s*wishlist|\badd\s+.+\s+to\s+(?:my\s+)?(?:favorites|favourites|wishlist)\b|\bsave\s+.+\s+to\s+(?:favorites|wishlist)\b|收藏|加入心愿单|添加到收藏)/i;

const VERIFIED_SHOP_FINDER_RE =
  /(?:ហាងកាហ្វេ|កាហ្វេឆ្ងាញ់|រកហាង|ស្វែងរកហាង|ហាងអាហារនៅ|ភោជនីយដ្ឋាននៅ|\bcoffee\s*shop\b|\bcafes?\s+in\b|\bfind\s+(?:verified\s+)?(?:restaurants?|shops?|cafes?)\b|\bverified\s+(?:restaurants?|shops?)\b|咖啡馆|咖啡店|查找餐厅|核实餐厅)/i;

function parseKhmerOrArabicDigits(raw: string): number | null {
  const khMap: Record<string, string> = {
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
    一: '1',
    二: '2',
    两: '2',
    三: '3',
    四: '4',
    五: '5',
    六: '6',
    七: '7',
  };
  const normalized = raw.replace(/[០-៩一二两三四五六七]/g, (ch) => khMap[ch] || ch);
  const m = normalized.match(/\b([1-7])\s*(?:ថ្ងៃ|យប់|days?|nights?|天|日)?/i) || normalized.match(/([1-7])\s*(?:ថ្ងៃ|days?|天|日)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? Math.min(7, Math.max(1, n)) : null;
}

function estimateDishNutrition(dish: FoodItem, language: Language): AiAgentNutritionReport {
  const text = `${dish.nameKh} ${dish.nameEn} ${dish.categoryKh} ${dish.categoryEn} ${dish.descriptionEn}`.toLowerCase();
  let kcal = typeof dish.calories === 'number' && dish.calories > 40 ? dish.calories : 380;
  let protein = 22;
  let carbs = 38;
  let fat = 14;
  let healthLevel: 'healthy' | 'balanced' | 'indulgent' = 'balanced';

  if (!dish.calories || dish.calories <= 40) {
    if (/សម្លម្ជូរ|ស្ងោរ|ភ្លា|ញាំ|បន្លែ|ត្រីចំហុយ|អាម៉ុក|sour\s*soup|salad|steamed|amok/.test(text)) {
      kcal = 295;
      protein = 24;
      carbs = 20;
      fat = 11;
      healthLevel = 'healthy';
    } else if (/គុយទាវ|នំបញ្ចុក|បបរ|មី|noodle|porridge|num\s*banh\s*chok|kuy\s*teav/.test(text)) {
      kcal = 390;
      protein = 21;
      carbs = 52;
      fat = 10;
      healthLevel = 'balanced';
    } else if (/បាយសាច់ជ្រូក|ឡុកឡាក់|ឆា|អាំង|ការី|lok\s*lak|pork\s*rice|curry|grilled|stir[-\s]*fry/.test(text)) {
      kcal = 520;
      protein = 28;
      carbs = 56;
      fat = 19;
      healthLevel = 'balanced';
    } else if (/បង្អែម|ចេកខ្ទិះ|ទឹកក្រឡុក|បំពង|ចៀន|ខ្ទិះ|dessert|sweet|smoothie|crispy|fried|coconut\s*cream/.test(text)) {
      kcal = 460;
      protein = 7;
      carbs = 66;
      fat = 18;
      healthLevel = 'indulgent';
    }
  } else {
    if (kcal <= 340) {
      protein = 23;
      carbs = 26;
      fat = 10;
      healthLevel = 'healthy';
    } else if (kcal >= 540) {
      protein = 25;
      carbs = 58;
      fat = 22;
      healthLevel = 'indulgent';
    }
  }

  const ingredients =
    dish.ingredients && dish.ingredients.length > 0
      ? dish.ingredients
          .slice(0, 5)
          .map((ing) => (language === 'km' ? ing.nameKh || ing.nameEn : ing.nameEn || ing.nameKh))
          .filter(Boolean)
      : (language === 'km' ? dish.ingredientsKh : dish.ingredientsEn)?.slice(0, 5) || [];

  const locFood = getLocalizedFood(dish, language);
  const healthBadgeLabel =
    healthLevel === 'healthy'
      ? tr(language, '🌿 ស្រាល និងសម្បូរជីវជាតិ', '🌿 Light & Nutrient-Rich', '🌿 清淡均衡')
      : healthLevel === 'balanced'
      ? tr(language, '⚖️ ថាមពលសមតុល្យប្រចាំថ្ងៃ', '⚖️ Balanced Daily Meal', '⚖️ 营养均衡正餐')
      : tr(language, '🔥 ថាមពលខ្ពស់ (គួរញ៉ាំសមល្មម)', '🔥 Rich & Energizing (Enjoy Moderately)', '🔥 热量较高（建议适量享用）');

  const summaryNote =
    healthLevel === 'healthy'
      ? tr(
          language,
          'សម្បូរប្រូតេអ៊ីន និងបន្លែធម្មជាតិ ស័ក្តិសមសម្រាប់អាហារថ្ងៃត្រង់ ឬល្ងាចស្រាលៗ។ (តម្លៃប៉ាន់ស្មានសម្រាប់ ១ ចាន)',
          'Rich in lean protein and fresh herbs — great for a light lunch or dinner. (Estimated per 1 serving)',
          '富含优质蛋白与新鲜香草蔬菜，非常适合清淡午餐或晚餐。（单人份估算值）'
        )
      : healthLevel === 'balanced'
      ? tr(
          language,
          'ផ្តល់ថាមពលសមតុល្យរវាងប្រូតេអ៊ីន និងកាបូអ៊ីដ្រាត។ អាចបន្ថែមបន្លែស្រស់ដើម្បីកាន់តែល្អ។ (តម្លៃប៉ាន់ស្មានសម្រាប់ ១ ចាន)',
          'Provides balanced protein and energy. Pair with fresh greens for extra fiber. (Estimated per 1 serving)',
          '提供均衡的蛋白质与碳水能量，搭配新鲜蔬菜更佳。（单人份估算值）'
        )
      : tr(
          language,
          'មានរសជាតិឈ្ងុយឆ្ងាញ់ពីខ្ទិះដូង ស្ករ ឬការចៀន។ គួរញ៉ាំក្នុងបរិមាណសមល្មម និងផឹកទឹកឆ្អិនឱ្យគ្រប់គ្រាន់។ (តម្លៃប៉ាន់ស្មាន)',
          'Prepared with rich coconut cream, natural sugars, or frying. Enjoy in moderation with plenty of water. (Estimated)',
          '含有浓郁椰浆、糖分或煎炸风味，建议适量享用并多喝水。（单人份估算值）'
        );

  return {
    dishId: dish.id,
    dishNameKh: dish.nameKh,
    dishNameEn: locFood.name,
    photoUrl: (resolveFoodPhotoUrl(dish.photoUrl) || dish.photoUrl),
    caloriesKcal: kcal,
    proteinGrams: protein,
    carbsGrams: carbs,
    fatGrams: fat,
    healthLevel,
    healthBadgeLabel,
    keyIngredients: ingredients,
    summaryNote,
  };
}

function buildHotelCardsCatalog(
  restaurants: Restaurant[],
  destinations: TouristDestination[],
  provinceKhFilter?: string,
  keyword?: string,
  userLat?: number | null,
  userLng?: number | null
): AiAgentHotelCardItem[] {
  const kw = (keyword || '')
    .replace(HOTEL_SEARCH_INTENT_RE, ' ')
    .replace(/នៅ|ក្នុង|ខេត្ត|ក្រុង|ជិត|តម្លៃ|ល្អ|ស្អាត|បំផុត|\bin\b|\bat\b|\bnear\b|\bbest\b|\bverified\b|\bfind\b|\bsearch\b/gi, ' ')
    .trim()
    .toLowerCase();

  const items: AiAgentHotelCardItem[] = [];
  const seenNames = new Set<string>();

  for (const r of restaurants) {
    if (!isHotelBusinessRecord(r)) continue;
    if ((r as any).isSuspended || r.status === 'rejected') continue;
    if (provinceKhFilter && !r.provinceKh.includes(provinceKhFilter) && !(r.addressKh || '').includes(provinceKhFilter)) {
      continue;
    }
    const hay = `${r.nameKh} ${r.nameEn} ${r.provinceKh} ${r.provinceEn} ${r.addressKh} ${r.addressEn} ${r.descriptionEn}`.toLowerCase();
    if (kw && kw.length >= 2 && !hay.includes(kw)) {
      const provMatch = detectAgentProvince(kw);
      if (!provMatch) continue;
    }
    const dedupeKey = `${(r.nameEn || r.nameKh).toLowerCase().trim()}|${r.provinceKh}`;
    if (seenNames.has(dedupeKey)) continue;
    seenNames.add(dedupeKey);

    const dist =
      userLat != null && userLng != null ? computeHaversineKm(userLat, userLng, r.latitude, r.longitude) : undefined;
    const originCoords = userLat != null && userLng != null ? { lat: userLat, lng: userLng } : null;
    const mapUrl =
      getRestaurantGoogleExternalUrl(r, 'maps', originCoords) ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.nameEn || r.nameKh}, ${r.provinceEn || r.provinceKh}, Cambodia`)}`;

    items.push({
      id: r.id,
      sourceType: 'restaurant_hotel',
      nameKh: r.nameKh,
      nameEn: r.nameEn || r.nameKh,
      provinceKh: r.provinceKh,
      provinceEn: r.provinceEn || r.provinceKh,
      addressKh: r.addressKh || r.provinceKh,
      addressEn: r.addressEn || r.provinceEn || r.provinceKh,
      photoUrl: r.photoUrl || r.profileImage || '/destinations/dest-1.jpg',
      priceDisplay:
        r.priceRange ||
        (r.promotionalPrice ? `$${r.promotionalPrice}/night` : r.priceLevel === '$$$' ? '$65–$150/night' : '$25–$60/night'),
      phone: r.phone || undefined,
      rating: r.rating || 4.6,
      isVerified: Boolean(r.isVerified || r.membershipTier === 'premium' || isPlaceLocationVerified(r)),
      latitude: r.latitude,
      longitude: r.longitude,
      mapUrl,
      distanceKm: dist !== undefined && dist < 500 ? Number(dist.toFixed(1)) : undefined,
      restaurantRecord: r,
    });
  }

  for (const d of destinations) {
    if (d.categorySlug !== 'hotel') continue;
    if (provinceKhFilter && !d.provinceKh.includes(provinceKhFilter) && !(d.addressKh || '').includes(provinceKhFilter)) {
      continue;
    }
    const hay = `${d.nameKh} ${d.nameEn} ${d.provinceKh} ${d.provinceEn} ${d.addressKh} ${d.addressEn} ${d.descriptionEn}`.toLowerCase();
    if (kw && kw.length >= 2 && !hay.includes(kw)) {
      const provMatch = detectAgentProvince(kw);
      if (!provMatch) continue;
    }
    const dedupeKey = `${(d.nameEn || d.nameKh).toLowerCase().trim()}|${d.provinceKh}`;
    if (seenNames.has(dedupeKey)) continue;
    seenNames.add(dedupeKey);

    const dist =
      userLat != null && userLng != null ? computeHaversineKm(userLat, userLng, d.latitude, d.longitude) : undefined;
    const originCoords = userLat != null && userLng != null ? { lat: userLat, lng: userLng } : null;
    const mapUrl =
      getDestinationGoogleExternalUrl(d, 'maps', originCoords) ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.nameEn || d.nameKh}, ${d.provinceEn || d.provinceKh}, Cambodia`)}`;

    items.push({
      id: d.id,
      sourceType: 'destination_hotel',
      nameKh: d.nameKh,
      nameEn: d.nameEn || d.nameKh,
      provinceKh: d.provinceKh,
      provinceEn: d.provinceEn || d.provinceKh,
      addressKh: d.addressKh || d.provinceKh,
      addressEn: d.addressEn || d.provinceEn || d.provinceKh,
      photoUrl: d.photoUrl || '/destinations/dest-1.jpg',
      priceDisplay: d.priceRange || d.entranceFeeEn || d.entranceFeeKh || '$30–$85/night',
      phone: d.phone || undefined,
      rating: d.rating || 4.5,
      isVerified: Boolean(isPlaceLocationVerified(d) || d.photoUrl),
      latitude: d.latitude,
      longitude: d.longitude,
      mapUrl,
      distanceKm: dist !== undefined && dist < 500 ? Number(dist.toFixed(1)) : undefined,
      destinationRecord: d,
    });
  }

  return items.sort((a, b) => {
    if (a.distanceKm !== undefined && b.distanceKm !== undefined && a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }
    if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
    if (a.sourceType !== b.sourceType) return a.sourceType === 'restaurant_hotel' ? -1 : 1;
    return (b.rating || 0) - (a.rating || 0);
  });
}

function buildOwnerUpdateProposal(
  rawQuery: string,
  targetShop: Restaurant,
  language: Language
): AiAgentPendingOwnerUpdate {
  const changes: AiAgentOwnerFieldChange[] = [];
  const patch: Partial<Restaurant> = {};
  const isHotel = isHotelBusinessRecord(targetShop);

  // 1. Opening hours extraction (e.g., "07:00 AM - 09:30 PM", "24 ម៉ោង", "Open 24 Hours", "6ព្រឹក ដល់ 10យប់")
  const hoursMatch =
    rawQuery.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|ព្រឹក|ល្ងាច|យប់)?\s*(?:-|–|ដល់|to)\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|ព្រឹក|ល្ងាច|យប់)?)/i) ||
    rawQuery.match(/(24\s*(?:ម៉ោង|hours?|hrs)|open\s*24\s*hours|24\/7)/i);

  if (hoursMatch) {
    const newHours = hoursMatch[1].trim();
    patch.openingHoursKh = newHours;
    patch.openingHoursEn = newHours;
    changes.push({
      field: 'openingHours',
      labelKh: 'ម៉ោងបើកដំណើរការ',
      labelEn: 'Opening Hours',
      oldValue: targetShop.openingHoursKh || targetShop.openingHoursEn || '07:00 AM - 09:00 PM',
      newValue: newHours,
    });
  }

  // 2. Phone number extraction
  const phoneMatch = rawQuery.match(/(?:\+?855|0)\s*\d{2}[\s-]?\d{3}[\s-]?\d{3,4}/);
  if (phoneMatch) {
    const newPhone = phoneMatch[0].replace(/\s+/g, ' ').trim();
    patch.phone = newPhone;
    changes.push({
      field: 'phone',
      labelKh: 'លេខទូរស័ព្ទទំនាក់ទំនង',
      labelEn: 'Contact Phone',
      oldValue: targetShop.phone || '—',
      newValue: newPhone,
    });
  }

  // 3. Room rate / price range extraction
  const priceMatch = rawQuery.match(/(\$\d+(?:\s*[-–]\s*\$\d+)?(?:\s*\/\s*(?:night|យប់))?)/i);
  if (priceMatch) {
    const newPrice = priceMatch[1].trim();
    patch.priceRange = newPrice;
    changes.push({
      field: 'priceRange',
      labelKh: isHotel ? 'តម្លៃបន្ទប់ក្នុង ១ យប់' : 'កម្រិតតម្លៃមុខម្ហូប',
      labelEn: isHotel ? 'Room Rate' : 'Price Range',
      oldValue: targetShop.priceRange || targetShop.priceLevel || '$$',
      newValue: newPrice,
    });
  }

  // 4. Smart bilingual business description draft if requested or if no specific field matched
  if (changes.length === 0 || /ពិពណ៌នា|description|ណែនាំហាង|ប្រូហ្វាល់|profile|简介|介绍/i.test(rawQuery)) {
    const newDescKh = isHotel
      ? `${targetShop.nameKh} ជាកន្លែងស្នាក់នៅស្អាត ផាសុកភាព និងសុវត្ថិភាពនៅ${targetShop.provinceKh} ផ្តល់ជូនបន្ទប់ធំទូលាយ សេវាកម្មរួសរាយរាក់ទាក់ និងទីតាំងងាយស្រួលធ្វើដំណើរ។`
      : `${targetShop.nameKh} បម្រើជូនមុខម្ហូប និងភេសជ្ជៈឈ្ងុយឆ្ងាញ់ប្រចាំ${targetShop.provinceKh} ចម្អិនថ្មីៗប្រកបដោយអនាម័យ សេវាកម្មរហ័ស និងបរិយាកាសកក់ក្តៅសម្រាប់គ្រួសារ និងមិត្តភក្តិ។`;
    const newDescEn = isHotel
      ? `${targetShop.nameEn || targetShop.nameKh} offers clean, comfortable, and welcoming accommodation in ${targetShop.provinceEn || targetShop.provinceKh} with convenient access to local dining and attractions.`
      : `${targetShop.nameEn || targetShop.nameKh} serves freshly prepared specialties and beverages in ${targetShop.provinceEn || targetShop.provinceKh}, featuring hygienic preparation and warm hospitality.`;
    patch.descriptionKh = newDescKh;
    patch.descriptionEn = newDescEn;
    changes.push({
      field: 'description',
      labelKh: isHotel ? 'ការពិពណ៌នាសណ្ឋាគារ (ខ្មែរ + EN)' : 'ការពិពណ៌នាហាង (ខ្មែរ + EN)',
      labelEn: isHotel ? 'Hotel Description (KM + EN)' : 'Shop Description (KM + EN)',
      oldValue: (language === 'km' ? targetShop.descriptionKh : targetShop.descriptionEn) || '—',
      newValue: language === 'km' ? newDescKh : newDescEn,
    });
  }

  patch.updatedAt = new Date().toISOString();

  return {
    actionId: `owner-upd-${Date.now()}`,
    businessId: targetShop.id,
    businessNameKh: targetShop.nameKh,
    businessNameEn: targetShop.nameEn || targetShop.nameKh,
    isHotel,
    changes,
    patch,
  };
}

export function tryExecuteAiAgentTurn(params: {
  userInput: string;
  language: Language;
  currentUser: User | null | undefined;
  foods: FoodItem[];
  restaurants: Restaurant[];
  destinations: TouristDestination[];
  trendingFoods: TrendingFoodItem[];
  activeProvinceKh?: string;
  userCoords?: { lat: number; lng: number } | null;
  isVipVerified?: boolean;
  generateAiTripPlan: (
    provinceKh: string,
    durationDays: number,
    budgetLevel: 'budget' | 'medium' | 'luxury',
    companion: 'solo' | 'couple' | 'friends' | 'family'
  ) => TripPlan;
}): AiAgentToolResult | null {
  const startedAt = performance.now();
  const trimmed = (params.userInput || '').trim();
  if (!trimmed) return null;

  // Never intercept medical queries — let existing strict medical scope boundary handle them
  if (isMedicalOrHealthQuery(trimmed)) {
    return null;
  }

  const {
    language,
    currentUser,
    foods,
    restaurants,
    destinations,
    trendingFoods,
    activeProvinceKh,
    userCoords,
    generateAiTripPlan,
  } = params;

  const userRole = resolveAiAgentUserRole(currentUser, restaurants);
  const rateKey = currentUser?.id || 'guest-device';

  // Public AI Assistant access enabled for all users (Free, Guest, and VIP)

  // Check rate limit first on agent intents
  const isAgentCandidate =
    OWNER_UPDATE_INTENT_RE.test(trimmed) ||
    FAVORITE_SAVE_INTENT_RE.test(trimmed) ||
    ITINERARY_INTENT_RE.test(trimmed) ||
    HOTEL_SEARCH_INTENT_RE.test(trimmed) ||
    TRENDING_VIDEO_INTENT_RE.test(trimmed) ||
    NUTRITION_INTENT_RE.test(trimmed) ||
    NEARBY_INTENT_RE.test(trimmed) ||
    DIRECTIONS_INTENT_RE.test(trimmed) ||
    VERIFIED_SHOP_FINDER_RE.test(trimmed);

  if (!isAgentCandidate) {
    return null;
  }

  const dailyQuota = checkAndIncrementDailyTierAiQuota(currentUser);
  if (!dailyQuota.allowed) {
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    recordAiAgentTelemetryEvent({
      user: currentUser,
      userRole,
      toolName: 'recommend_khmer_food',
      query: trimmed,
      latencyMs,
      status: 'rate_limited',
      note: `Daily AI quota reached (${dailyQuota.usedToday}/${dailyQuota.dailyLimit}) for ${dailyQuota.isFreeTrial ? 'Free Trial 7D' : 'Paid VIP'}`,
    });
    return {
      handled: true,
      toolName: 'recommend_khmer_food',
      userRole,
      latencyMs,
      fromCache: false,
      estimatedCostUsd: 0,
      blockedReason: 'rate_limited',
      headline: dailyQuota.isFreeTrial
        ? tr(
            language,
            `⏳ អ្នកបានប្រើប្រាស់កូតា AI សម្រាប់ការសាកល្បងឥតគិតថ្លៃ 7 ថ្ងៃ គ្រប់ចំនួន ${dailyQuota.dailyLimit} ដងសម្រាប់ថ្ងៃនេះហើយ។ សូមដំឡើងទៅជាសមាជិក VIP បង់ប្រាក់ ដើម្បីទទួលបានរហូតដល់ 80 ដង/ថ្ងៃ!`,
            `⏳ You have reached your Free Trial limit of ${dailyQuota.dailyLimit} AI requests for today. Upgrade to Paid VIP for up to 80 AI requests/day!`,
            `⏳ 您今日的 7 天免费试用 AI 配额（${dailyQuota.dailyLimit} 次/日）已用完。升级付费 VIP 可享每日 80 次！`
          )
        : tr(
            language,
            `⏳ អ្នកបានប្រើប្រាស់កូតា AI ប្រចាំថ្ងៃគ្រប់ចំនួន ${dailyQuota.dailyLimit} ដងសម្រាប់ថ្ងៃនេះហើយ។ កូតានឹងបើកឡើងវិញនៅថ្ងៃស្អែក!`,
            `⏳ You have reached your daily quota of ${dailyQuota.dailyLimit} AI requests for today. Your quota resets tomorrow!`,
            `⏳ 您今日的 AI 配额（${dailyQuota.dailyLimit} 次/日）已用完，明日将自动重置！`
          ),
      followUpChips: buildAgentRoleChips(language, currentUser, restaurants).slice(0, 4),
    };
  }

  if (!checkRateLimit(rateKey)) {
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    recordAiAgentTelemetryEvent({
      user: currentUser,
      userRole,
      toolName: 'search_verified_shops',
      query: trimmed,
      latencyMs,
      status: 'rate_limited',
      note: 'Exceeded 25 requests/minute protection threshold',
    });
    return {
      handled: true,
      toolName: 'search_verified_shops',
      userRole,
      latencyMs,
      fromCache: false,
      estimatedCostUsd: 0,
      blockedReason: 'rate_limited',
      headline: tr(
        language,
        '⏳ សូមរង់ចាំបន្តិច (លើសកម្រិត 25 សំណើក្នុង ១ នាទី) ដើម្បីការពារប្រព័ន្ធ និងសន្សំថាមពលថ្មទូរស័ព្ទ។ សូមសាកល្បងម្តងទៀតក្នុងរយៈពេលប៉ុន្មានវិនាទីទៀត។',
        '⏳ Rate limit reached (max 25 requests/minute) to keep the app fast and battery-friendly. Please try again in a few seconds.',
        '⏳ 请求过于频繁（每分钟最多 25 次），请几秒后再试。'
      ),
      followUpChips: buildAgentRoleChips(language, currentUser, restaurants).slice(0, 4),
    };
  }

  // Check LRU Cache for read-only tools (never cache owner mutations or GPS-specific turns)
  const canUseCache = !OWNER_UPDATE_INTENT_RE.test(trimmed) && !FAVORITE_SAVE_INTENT_RE.test(trimmed) && !userCoords;
  const cacheKey = `${language}|${userRole}|${activeProvinceKh || ''}|${trimmed.toLowerCase()}`;
  if (canUseCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
      const cachedResult: AiAgentToolResult = {
        ...cached.result,
        latencyMs,
        fromCache: true,
      };
      recordAiAgentTelemetryEvent({
        user: currentUser,
        userRole,
        toolName: cachedResult.toolName,
        query: trimmed,
        latencyMs,
        fromCache: true,
        status: 'ok',
      });
      return cachedResult;
    }
  }

  const saveToCache = (res: AiAgentToolResult) => {
    if (!canUseCache) return;
    if (responseCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = responseCache.keys().next().value;
      if (oldestKey) responseCache.delete(oldestKey);
    }
    responseCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      result: res,
    });
  };

  const detectedProv = detectAgentProvince(trimmed);
  const targetProvKh = detectedProv?.kh || activeProvinceKh || '';

  // =========================================================================
  // TOOL 1: update_own_shop_profile (Shop / Hotel Owner Assistant + Confirmation)
  // =========================================================================
  if (OWNER_UPDATE_INTENT_RE.test(trimmed)) {
    const ownedList = getOwnedBusinessesForUser(currentUser, restaurants);
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));

    if (!currentUser || (ownedList.length === 0 && userRole !== 'admin')) {
      recordAiAgentTelemetryEvent({
        user: currentUser,
        userRole,
        toolName: 'update_own_shop_profile',
        query: trimmed,
        latencyMs,
        status: 'blocked',
        note: 'Permission denied: user does not own any registered shop/hotel',
      });
      return {
        handled: true,
        toolName: 'update_own_shop_profile',
        userRole,
        latencyMs,
        fromCache: false,
        estimatedCostUsd: 0,
        blockedReason: 'not_shop_owner',
        headline: tr(
          language,
          '🔒 សិទ្ធិការពារសុវត្ថិភាព៖ មុខងារ «ជំនួយការម្ចាស់ហាង និងសណ្ឋាគារ» អនុញ្ញាតសម្រាប់តែគណនីម្ចាស់ហាង ឬម្ចាស់សណ្ឋាគារដែលបានចុះឈ្មោះផ្ទាល់ខ្លួនប៉ុណ្ណោះ។ AI មិនអាចកែប្រែទិន្នន័យហាងរបស់អ្នកដទៃបានឡើយ។',
          '🔒 Security Guardrail: The AI Shop & Hotel Owner Assistant is restricted to verified owners managing their own registered business. AI never modifies another owner’s listing.',
          '🔒 安全权限限制：「店主与酒店管理 AI 助手」仅限已认证的店铺或酒店所有者修改自己的商户资料。'
        ),
        followUpChips: buildAgentRoleChips(language, currentUser, restaurants).slice(0, 4),
      };
    }

    // Match owned shop mentioned in query or default to owner's primary shop
    const matchedOwned =
      ownedList.find(
        (r) =>
          trimmed.toLowerCase().includes((r.nameEn || '').toLowerCase()) ||
          trimmed.includes(r.nameKh) ||
          trimmed.includes(r.id)
      ) ||
      ownedList[0] ||
      restaurants.find((r) => trimmed.includes(r.id));

    if (!matchedOwned) {
      return {
        handled: true,
        toolName: 'update_own_shop_profile',
        userRole,
        latencyMs,
        fromCache: false,
        estimatedCostUsd: 0,
        headline: tr(
          language,
          'សូមបញ្ជាក់ឈ្មោះហាង ឬសណ្ឋាគារដែលអ្នកចង់កែប្រែព័ត៌មាន។',
          'Please specify which shop or hotel profile you would like to draft updates for.',
          '请说明您要更新哪家店铺或酒店的资料。'
        ),
        followUpChips: buildAgentRoleChips(language, currentUser, restaurants).slice(0, 4),
      };
    }

    const proposal = buildOwnerUpdateProposal(trimmed, matchedOwned, language);
    recordAiAgentTelemetryEvent({
      user: currentUser,
      userRole,
      toolName: 'update_own_shop_profile',
      query: trimmed,
      latencyMs,
      status: 'confirm_required',
      matchedShopNames: [matchedOwned.nameKh],
      note: `Drafted ${proposal.changes.length} field update(s) for ${matchedOwned.id}; awaiting explicit owner confirmation`,
    });

    return {
      handled: true,
      toolName: 'update_own_shop_profile',
      userRole,
      latencyMs,
      fromCache: false,
      estimatedCostUsd: 0,
      pendingOwnerUpdate: proposal,
      headline: tr(
        language,
        `🛠️ ជំនួយការម្ចាស់អាជីវកម្មបានរៀបចំសេចក្តីព្រាងកែប្រែសម្រាប់ «${matchedOwned.nameKh}» រួចរាល់ហើយ។ សូមពិនិត្យផ្ទៀងផ្ទាត់ និងចុច «បញ្ជាក់ និងរក្សាទុក» ខាងក្រោម ទើបប្រព័ន្ធកែប្រែទិន្នន័យពិតប្រាកដ៖`,
        `🛠️ Your Shop/Hotel AI Assistant drafted an update for "${matchedOwned.nameEn || matchedOwned.nameKh}". Please review the changes below and tap "Confirm & Apply" before any database record is modified:`,
        `🛠️ 商户 AI 助手已为「${matchedOwned.nameEn || matchedOwned.nameKh}」生成修改草稿。请核对以下内容并点击「确认并保存」后才会正式生效：`
      ),
      followUpChips: buildAgentRoleChips(language, currentUser, restaurants).slice(0, 4),
    };
  }

  // =========================================================================
  // TOOL 2: add_to_favorites (Save Dish / Shop / Hotel / Attraction to Wishlist)
  // =========================================================================
  if (FAVORITE_SAVE_INTENT_RE.test(trimmed)) {
    const cleaned = trimmed
      .replace(/រក្សាទុក|ដាក់ចូល|បញ្ជីចូលចិត្ត|ចូល|ក្នុង|wishlist|favorites?|favourites?|add|save|to|my|收藏|加入心愿单|添加到/gi, ' ')
      .trim()
      .toLowerCase();

    let candidate: AiAgentFavoriteCandidate | undefined;
    const matchedDish = foods.find(
      (f) =>
        cleaned &&
        (f.nameKh.toLowerCase().includes(cleaned) ||
          cleaned.includes(f.nameKh.toLowerCase()) ||
          f.nameEn.toLowerCase().includes(cleaned) ||
          cleaned.includes(f.nameEn.toLowerCase()))
    );
    if (matchedDish) {
      candidate = {
        id: matchedDish.id,
        type: 'food',
        nameKh: matchedDish.nameKh,
        nameEn: matchedDish.nameEn,
        photoUrl: (resolveFoodPhotoUrl(matchedDish.photoUrl) || matchedDish.photoUrl),
        categoryKh: matchedDish.categoryKh,
        provinceKh: matchedDish.provinceKh,
        priceDisplay: matchedDish.priceUsd ? `$${matchedDish.priceUsd.toFixed(2)}` : undefined,
        rating: matchedDish.rating,
      };
    } else {
      const matchedShop = restaurants.find(
        (r) =>
          !(r as any).isSuspended &&
          cleaned &&
          (r.nameKh.toLowerCase().includes(cleaned) ||
            (r.nameEn || '').toLowerCase().includes(cleaned))
      );
      if (matchedShop) {
        candidate = {
          id: matchedShop.id,
          type: 'restaurant',
          nameKh: matchedShop.nameKh,
          nameEn: matchedShop.nameEn || matchedShop.nameKh,
          photoUrl: matchedShop.photoUrl || '/foods/amok.jpg',
          categoryKh: matchedShop.categoryKh,
          provinceKh: matchedShop.provinceKh,
          priceDisplay: matchedShop.priceRange || matchedShop.priceLevel,
          rating: matchedShop.rating,
        };
      } else {
        const matchedDest = destinations.find(
          (d) =>
            cleaned &&
            (d.nameKh.toLowerCase().includes(cleaned) ||
              (d.nameEn || '').toLowerCase().includes(cleaned))
        );
        if (matchedDest) {
          candidate = {
            id: matchedDest.id,
            type: 'destination',
            nameKh: matchedDest.nameKh,
            nameEn: matchedDest.nameEn || matchedDest.nameKh,
            photoUrl: matchedDest.photoUrl || '/destinations/dest-1.jpg',
            categoryKh: matchedDest.categoryKh,
            provinceKh: matchedDest.provinceKh,
            rating: matchedDest.rating,
          };
        }
      }
    }

    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    if (candidate) {
      recordAiAgentTelemetryEvent({
        user: currentUser,
        userRole,
        toolName: 'add_to_favorites',
        query: trimmed,
        latencyMs,
        status: 'ok',
        matchedFoodNames: candidate.type === 'food' ? [candidate.nameKh] : undefined,
        matchedShopNames: candidate.type !== 'food' ? [candidate.nameKh] : undefined,
      });
      return {
        handled: true,
        toolName: 'add_to_favorites',
        userRole,
        latencyMs,
        fromCache: false,
        estimatedCostUsd: 0,
        favoriteCandidate: candidate,
        headline: tr(
          language,
          `❤️ បានរកឃើញ «${candidate.nameKh}»! ចុចប៊ូតុងខាងក្រោមដើម្បីរក្សាទុកចូលបញ្ជីចូលចិត្ត (Wishlist) របស់អ្នក៖`,
          `❤️ Found "${candidate.nameEn}"! Tap the button below to save it to your Favorites / Wishlist:`,
          `❤️ 已找到「${candidate.nameEn}」！点击下方按钮即可加入您的收藏夹：`
        ),
        followUpChips: buildAgentRoleChips(language, currentUser, restaurants).slice(0, 4),
      };
    }
  }

  // =========================================================================
  // TOOL 3: create_travel_itinerary (AI Travel Planner + Budget + Hotels)
  // =========================================================================
  if (ITINERARY_INTENT_RE.test(trimmed)) {
    const prov = detectedProv || PROVINCE_DIRECTORY.find((p) => p.kh === activeProvinceKh) || PROVINCE_DIRECTORY[1]; // default Siem Reap
    const days = parseKhmerOrArabicDigits(trimmed) || 2;
    const budgetLevel: 'budget' | 'medium' | 'luxury' =
      /ប្រណីត|លំដាប់ខ្ពស់|luxury|vip|5[-\s]*star|豪华|高端/i.test(trimmed)
        ? 'luxury'
        : /សន្សំសំចៃ|ថោក|តិច|budget|cheap|backpack|穷游|省钱|经济/i.test(trimmed)
        ? 'budget'
        : 'medium';
    const companion: 'solo' | 'couple' | 'friends' | 'family' =
      /គ្រួសារ|កូន|ឪពុកម្តាយ|family|kids|家庭|亲子/i.test(trimmed)
        ? 'family'
        : /គូស្នេហ៍|ពីរនាក់|couple|honeymoon|情侣|夫妻/i.test(trimmed)
        ? 'couple'
        : /មិត្តភក្តិ|ក្រុម|friends|group|朋友|闺蜜/i.test(trimmed)
        ? 'friends'
        : 'friends';

    const plan = generateAiTripPlan(prov.kh, days, budgetLevel, companion);
    const provHotels = buildHotelCardsCatalog(restaurants, destinations, prov.kh).slice(0, 3);
    const provAttractions = destinations
      .filter((d) => d.categorySlug !== 'hotel' && d.provinceKh.includes(prov.kh))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);

    const provLabel = language === 'km' ? prov.kh : language === 'zh' ? prov.zh : prov.en;
    const budgetLabel =
      budgetLevel === 'budget'
        ? tr(language, 'សន្សំសំចៃ', 'Budget', '经济型')
        : budgetLevel === 'luxury'
        ? tr(language, 'ប្រណីត', 'Luxury', '豪华型')
        : tr(language, 'មធ្យម', 'Medium', '舒适型');

    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const result: AiAgentToolResult = {
      handled: true,
      toolName: 'create_travel_itinerary',
      userRole,
      latencyMs,
      fromCache: false,
      estimatedCostUsd: 0,
      itinerary: plan,
      hotels: provHotels,
      attractions: provAttractions,
      headline: tr(
        language,
        `🗺️ ផែនការធ្វើដំណើរកម្សាន្តខេត្ត${provLabel} រយៈពេល ${days} ថ្ងៃ (កម្រិតថវិកា៖ ${budgetLabel} • ប៉ាន់ស្មានសរុបប្រហែល $${plan.totalEstimatedCostUsd}) រួមមានតំបន់ទេសចរណ៍ អាហារប្រចាំតំបន់ និងសណ្ឋាគារណែនាំ៖`,
        `🗺️ ${days}-Day ${provLabel} Travel Itinerary (${budgetLabel} tier • Est. total ~$${plan.totalEstimatedCostUsd}) with daily dining, routes, and verified hotels:`,
        `🗺️ ${provLabel} ${days}日游智能行程规划（${budgetLabel} • 预计总预算约 $${plan.totalEstimatedCostUsd}），含景点路线、特色美食与核实酒店：`
      ),
      followUpChips: [
        {
          id: `hotels_${prov.en}`,
          label: tr(language, `🏨 សណ្ឋាគារនៅ${prov.kh}`, `🏨 Hotels in ${prov.en}`, `🏨 ${prov.zh}酒店`),
          query: tr(language, `ស្វែងរកសណ្ឋាគារនៅ${prov.kh}`, `Find verified hotels in ${prov.en}`, `查找${prov.zh}已核实的酒店`),
        },
        {
          id: `shops_${prov.en}`,
          label: tr(language, `🍽️ ហាងអាហារនៅ${prov.kh}`, `🍽️ Restaurants in ${prov.en}`, `🍽️ ${prov.zh}餐厅`),
          query: tr(language, `ស្វែងរកហាងអាហារនៅ${prov.kh}`, `Find verified restaurants in ${prov.en}`, `查找${prov.zh}已核实的餐厅`),
        },
        ...buildAgentRoleChips(language, currentUser, restaurants).slice(2, 4),
      ],
    };

    recordAiAgentTelemetryEvent({
      user: currentUser,
      userRole,
      toolName: 'create_travel_itinerary',
      query: trimmed,
      latencyMs,
      status: 'ok',
      matchedShopNames: provHotels.slice(0, 2).map((h) => h.nameKh),
    });
    saveToCache(result);
    return result;
  }

  // =========================================================================
  // TOOL 4: search_verified_hotels (Hotels, Resorts & Guesthouses across 25 Provinces)
  // =========================================================================
  if (HOTEL_SEARCH_INTENT_RE.test(trimmed)) {
    const matchedHotels = buildHotelCardsCatalog(
      restaurants,
      destinations,
      targetProvKh || undefined,
      trimmed,
      userCoords?.lat,
      userCoords?.lng
    ).slice(0, 6);

    const fallbackHotels =
      matchedHotels.length > 0
        ? matchedHotels
        : buildHotelCardsCatalog(restaurants, destinations, undefined, undefined, userCoords?.lat, userCoords?.lng).slice(0, 6);

    const provLabel = detectedProv
      ? language === 'km'
        ? detectedProv.kh
        : language === 'zh'
        ? detectedProv.zh
        : detectedProv.en
      : targetProvKh || tr(language, 'ទូទាំងប្រទេសកម្ពុជា', 'Cambodia', '柬埔寨');

    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const result: AiAgentToolResult = {
      handled: true,
      toolName: 'search_verified_hotels',
      userRole,
      latencyMs,
      fromCache: false,
      estimatedCostUsd: 0,
      hotels: fallbackHotels,
      headline:
        matchedHotels.length > 0
          ? tr(
              language,
              `🏨 រកឃើញសណ្ឋាគារ និងរីសតផ្ទៀងផ្ទាត់នៅ ${provLabel} ចំនួន ${matchedHotels.length} កន្លែង (មានរូបភាព តម្លៃប៉ាន់ស្មាន និងទីតាំង Google Maps)៖`,
              `🏨 Found ${matchedHotels.length} verified hotels & resorts in ${provLabel} with photos, estimated rates, and Google Maps navigation:`,
              `🏨 在${provLabel}为您找到 ${matchedHotels.length} 家已核实酒店与度假村（含照片、参考房价与地图导航）：`
            )
          : tr(
              language,
              `🏨 បង្ហាញសណ្ឋាគារ និងរីសតពេញនិយមក្នុងប្រព័ន្ធ Cambodia Flavors & Tourism (អាចចុចមើលទីតាំងលើផែនទីផ្ទាល់)៖`,
              `🏨 Top verified hotels & resorts in Cambodia Flavors & Tourism (tap any hotel for details or Google Maps):`,
              `🏨 为您推荐 Cambodia Flavors & Tourism 热门核实酒店与度假村：`
            ),
      followUpChips: [
        {
          id: 'plan_trip_after_hotel',
          label: tr(language, '🗺️ រៀបផែនការដើរលេង ២ថ្ងៃ', '🗺️ Create 2-Day Itinerary', '🗺️ 生成2日游行程'),
          query: tr(
            language,
            `រៀបផែនការដើរលេង ${detectedProv?.kh || 'សៀមរាប'} ២ ថ្ងៃ`,
            `Create a 2-day travel itinerary for ${detectedProv?.en || 'Siem Reap'}`,
            `规划${detectedProv?.zh || '暹粒'} 2日游行程`
          ),
        },
        ...buildAgentRoleChips(language, currentUser, restaurants).slice(2, 5),
      ],
    };

    recordAiAgentTelemetryEvent({
      user: currentUser,
      userRole,
      toolName: 'search_verified_hotels',
      query: trimmed,
      latencyMs,
      status: 'ok',
      matchedShopNames: fallbackHotels.slice(0, 3).map((h) => h.nameKh),
    });
    saveToCache(result);
    return result;
  }

  // =========================================================================
  // TOOL 5: get_google_maps_directions ($0 Google Maps Deep Link)
  // =========================================================================
  if (DIRECTIONS_INTENT_RE.test(trimmed)) {
    const placeQuery = trimmed
      .replace(DIRECTIONS_INTENT_RE, ' ')
      .replace(/[?？!！។«»"']/g, ' ')
      .trim();

    const lowerQ = placeQuery.toLowerCase();
    const matchedShop = restaurants.find(
      (r) =>
        !(r as any).isSuspended &&
        lowerQ &&
        (r.nameKh.toLowerCase().includes(lowerQ) ||
          lowerQ.includes(r.nameKh.toLowerCase()) ||
          (r.nameEn || '').toLowerCase().includes(lowerQ) ||
          lowerQ.includes((r.nameEn || '').toLowerCase()))
    );
    const matchedDest = !matchedShop
      ? destinations.find(
          (d) =>
            lowerQ &&
            (d.nameKh.toLowerCase().includes(lowerQ) ||
              lowerQ.includes(d.nameKh.toLowerCase()) ||
              (d.nameEn || '').toLowerCase().includes(lowerQ) ||
              lowerQ.includes((d.nameEn || '').toLowerCase()))
        )
      : undefined;

    const placeName = matchedShop
      ? getLocalizedRestaurant(matchedShop, language).name
      : matchedDest
      ? getLocalizedDestination(matchedDest, language).name
      : placeQuery || tr(language, 'ភ្នំពេញ', 'Phnom Penh', '金边');

    const province = matchedShop
      ? matchedShop.provinceKh
      : matchedDest
      ? matchedDest.provinceKh
      : detectedProv?.kh || 'កម្ពុជា';

    const lat = matchedShop?.latitude || matchedDest?.latitude || 0;
    const lng = matchedShop?.longitude || matchedDest?.longitude || 0;
    const canonicalShopDir = matchedShop ? getRestaurantGoogleExternalUrl(matchedShop, 'directions', userCoords) : '';
    const canonicalDestDir = !canonicalShopDir && matchedDest ? getDestinationGoogleExternalUrl(matchedDest, 'directions', userCoords) : '';
    const originSuffix =
      userCoords && Number.isFinite(userCoords.lat) && Number.isFinite(userCoords.lng)
        ? `&origin=${Number(userCoords.lat.toFixed(6))},${Number(userCoords.lng.toFixed(6))}`
        : '';
    const mapUrl =
      canonicalShopDir ||
      canonicalDestDir ||
      (lat && lng
        ? `https://www.google.com/maps/dir/?api=1&destination=${Number(lat.toFixed(6))},${Number(lng.toFixed(6))}${originSuffix}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${placeName}, ${province}, Cambodia`)}${originSuffix}`);

    const dist =
      userCoords && lat && lng ? computeHaversineKm(userCoords.lat, userCoords.lng, lat, lng) : undefined;

    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const result: AiAgentToolResult = {
      handled: true,
      toolName: 'get_google_maps_directions',
      userRole,
      latencyMs,
      fromCache: false,
      estimatedCostUsd: 0,
      directionsTarget: {
        placeName,
        province,
        distanceKm: dist !== undefined && dist < 500 ? Number(dist.toFixed(1)) : undefined,
        mapUrl,
      },
      shops: matchedShop && !isHotelBusinessRecord(matchedShop) ? [matchedShop] : undefined,
      attractions: matchedDest ? [matchedDest] : undefined,
      headline: tr(
        language,
        `🧭 ផ្លូវធ្វើដំណើរទៅកាន់ «${placeName}» រួចរាល់ហើយ! ចុចប៊ូតុងខាងក្រោមដើម្បីបើកការនាំផ្លូវផ្ទាល់លើ Google Maps ($0 ឥតគិតថ្លៃ)៖`,
        `🧭 Directions to "${placeName}" are ready! Tap below to launch turn-by-turn navigation in Google Maps:`,
        `🧭 前往「${placeName}」的路线已准备好！点击下方按钮打开 Google 地图导航：`
      ),
      followUpChips: buildAgentRoleChips(language, currentUser, restaurants).slice(0, 4),
    };

    recordAiAgentTelemetryEvent({
      user: currentUser,
      userRole,
      toolName: 'get_google_maps_directions',
      query: trimmed,
      latencyMs,
      status: 'ok',
      matchedShopNames: [placeName],
    });
    return result;
  }

  // =========================================================================
  // TOOL 6: analyze_food_nutrition (Calories, Macros & Healthy Eating Assistant)
  // =========================================================================
  if (NUTRITION_INTENT_RE.test(trimmed)) {
    const cleaned = trimmed
      .replace(NUTRITION_INTENT_RE, ' ')
      .replace(/តើ|មាន|ប៉ុន្មាន|នៃ|របស់|មុខម្ហូប|ម្ហូប|ជួយ|វិភាគ|ក្នុង|១ចាន|\bof\b|\bin\b|\bhows+many\b|\banalyze\b|\bcheck\b|[?？!！។]/gi, ' ')
      .trim()
      .toLowerCase();

    const matchedDish =
      foods.find(
        (f) =>
          cleaned.length >= 2 &&
          (f.nameKh.toLowerCase().includes(cleaned) ||
            cleaned.includes(f.nameKh.toLowerCase()) ||
            f.nameEn.toLowerCase().includes(cleaned) ||
            cleaned.includes(f.nameEn.toLowerCase()))
      ) ||
      foods.find((f) => /អាម៉ុក|amok/i.test(`${f.nameKh} ${f.nameEn}`)) ||
      foods[0];

    if (matchedDish) {
      const report = estimateDishNutrition(matchedDish, language);
      const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
      const result: AiAgentToolResult = {
        handled: true,
        toolName: 'analyze_food_nutrition',
        userRole,
        latencyMs,
        fromCache: false,
        estimatedCostUsd: 0,
        nutrition: report,
        dishes: [matchedDish],
        headline: tr(
          language,
          `🥗 របាយការណ៍វិភាគកាឡូរី និងអាហារូបត្ថម្ភប្រហាក់ប្រហែលសម្រាប់ «${matchedDish.nameKh}» (១ ចាន)៖`,
          `🥗 Estimated Nutrition & Calorie Breakdown for "${report.dishNameEn}" (1 serving):`,
          `🥗「${report.dishNameEn}」（单人份）热量与营养成分估算报告：`
        ),
        followUpChips: [
          {
            id: 'nutri_kuyteav',
            label: tr(language, '🥗 កាឡូរីគុយទាវ', '🥗 Kuy Teav Calories', '🥗 金边粉热量'),
            query: tr(language, 'វិភាគកាឡូរី គុយទាវភ្នំពេញ', 'Analyze calories and nutrition of Phnom Penh Kuy Teav', '分析金边粿条的热量和营养'),
          },
          {
            id: 'nutri_loklak',
            label: tr(language, '🥗 កាឡូរីបាយឡុកឡាក់', '🥗 Beef Lok Lak Calories', '🥗 摇滚牛肉热量'),
            query: tr(language, 'វិភាគកាឡូរី បាយឡុកឡាក់សាច់គោ', 'Analyze calories and nutrition of Beef Lok Lak', '分析高棉摇滚牛肉饭的热量'),
          },
          ...buildAgentRoleChips(language, currentUser, restaurants).slice(0, 2),
        ],
      };

      recordAiAgentTelemetryEvent({
        user: currentUser,
        userRole,
        toolName: 'analyze_food_nutrition',
        query: trimmed,
        latencyMs,
        status: 'ok',
        matchedFoodNames: [matchedDish.nameKh],
      });
      saveToCache(result);
      return result;
    }
  }

  // =========================================================================
  // TOOL 7: search_trending_youtube_videos (Trending Cambodian Food & Coffee)
  // =========================================================================
  if (TRENDING_VIDEO_INTENT_RE.test(trimmed)) {
    const filteredTrending = trendingFoods
      .filter((item) => {
        if (!targetProvKh) return true;
        return (item.provinceKh || '').includes(targetProvKh);
      })
      .slice(0, 5);

    const finalTrending = filteredTrending.length > 0 ? filteredTrending : trendingFoods.slice(0, 5);
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const result: AiAgentToolResult = {
      handled: true,
      toolName: 'search_trending_youtube_videos',
      userRole,
      latencyMs,
      fromCache: false,
      estimatedCostUsd: 0,
      trendingItems: finalTrending,
      headline: tr(
        language,
        `🔥 មុខម្ហូប ហាងកាហ្វេ និងវីដេអូកំពុងល្បីខ្លាំង (Trending Food & YouTube Discovery) ចំនួន ${finalTrending.length} កន្លែង៖`,
        `🔥 Top ${finalTrending.length} Trending Cambodian Foods, Coffee Spots & Videos:`,
        `🔥 精选 ${finalTrending.length} 个柬埔寨热门美食、网红咖啡馆与探店视频：`
      ),
      followUpChips: buildAgentRoleChips(language, currentUser, restaurants).slice(0, 4),
    };

    recordAiAgentTelemetryEvent({
      user: currentUser,
      userRole,
      toolName: 'search_trending_youtube_videos',
      query: trimmed,
      latencyMs,
      status: 'ok',
      matchedFoodNames: finalTrending.slice(0, 2).map((t) => t.foodNameKh),
      matchedShopNames: finalTrending.slice(0, 2).map((t) => t.restaurantNameKh),
    });
    saveToCache(result);
    return result;
  }

  // =========================================================================
  // TOOL 8: find_nearby_restaurants / search_verified_shops
  // =========================================================================
  if (NEARBY_INTENT_RE.test(trimmed) || VERIFIED_SHOP_FINDER_RE.test(trimmed)) {
    const isNearbyMode = NEARBY_INTENT_RE.test(trimmed);
    const wantsCoffee = /កាហ្វេ|coffee|cafe|latte|espresso|matcha|咖啡/i.test(trimmed);
    const refLat = userCoords?.lat ?? detectedProv?.lat ?? 11.5564;
    const refLng = userCoords?.lng ?? detectedProv?.lng ?? 104.9282;

    const activeShops = restaurants.filter(
      (r) => !isHotelBusinessRecord(r) && !(r as any).isSuspended && r.status !== 'rejected'
    );

    const shopDistancesKm: Record<string, number> = {};
    const scored = activeShops
      .map((r) => {
        let score = 0;
        if (r.isVerified || isPlaceLocationVerified(r)) score += 30;
        if (r.membershipTier === 'premium') score += 20;
        if (targetProvKh && (r.provinceKh.includes(targetProvKh) || (r.addressKh || '').includes(targetProvKh))) {
          score += 50;
        }
        const hay = `${r.nameKh} ${r.nameEn} ${r.categoryKh || ''} ${r.categoryEn || ''} ${(r.signatureDishesKh || []).join(' ')} ${r.descriptionEn || ''}`.toLowerCase();
        if (wantsCoffee && /កាហ្វេ|coffee|cafe|ភេសជ្ជៈ|bakery|tea/.test(hay)) {
          score += 45;
        } else if (wantsCoffee) {
          score -= 15;
        }
        const dist = computeHaversineKm(refLat, refLng, r.latitude, r.longitude);
        if (dist < 500) {
          shopDistancesKm[r.id] = Number(dist.toFixed(1));
        }
        if (isNearbyMode && dist < 500) {
          score += Math.max(0, 60 - dist * 4);
        }
        score += (r.rating || 4.2) * 3;
        return { r, score, dist };
      })
      .filter((item) => !targetProvKh || isNearbyMode || item.r.provinceKh.includes(targetProvKh) || item.score >= 45)
      .sort((a, b) => (isNearbyMode && userCoords ? a.dist - b.dist : b.score - a.score))
      .slice(0, 6);

    const topShops = scored.map((s) => s.r);
    const toolName: AiAgentToolName = isNearbyMode ? 'find_nearby_restaurants' : 'search_verified_shops';
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));

    const provText = detectedProv
      ? language === 'km'
        ? detectedProv.kh
        : language === 'zh'
        ? detectedProv.zh
        : detectedProv.en
      : targetProvKh || tr(language, 'តំបន់របស់អ្នក', 'your area', '您所在区域');

    const result: AiAgentToolResult = {
      handled: true,
      toolName,
      userRole,
      latencyMs,
      fromCache: false,
      estimatedCostUsd: 0,
      shops: topShops,
      shopDistancesKm,
      headline: isNearbyMode
        ? tr(
            language,
            `📍 ហាងអាហារ និងហាងកាហ្វេផ្ទៀងផ្ទាត់ដែលនៅជិតអ្នកបំផុត (${topShops.length} កន្លែង) រួមជាមួយចម្ងាយ និងផ្លូវទៅហាង៖`,
            `📍 Found ${topShops.length} verified restaurants & coffee shops closest to your location with Google Maps directions:`,
            `📍 为您找到距离最近的 ${topShops.length} 家已核实餐厅与咖啡馆（含距离与导航）：`
          )
        : tr(
            language,
            `🍽️ រកឃើញ${wantsCoffee ? 'ហាងកាហ្វេ និងភេសជ្ជៈ' : 'ហាងអាហារ'}ផ្ទៀងផ្ទាត់នៅ ${provText} ចំនួន ${topShops.length} ហាង៖`,
            `🍽️ Top ${topShops.length} verified ${wantsCoffee ? 'coffee shops & cafes' : 'restaurants'} in ${provText}:`,
            `🍽️ 在${provText}为您精选 ${topShops.length} 家已核实${wantsCoffee ? '咖啡馆' : '餐厅'}：`
          ),
      followUpChips: buildAgentRoleChips(language, currentUser, restaurants).slice(0, 4),
    };

    recordAiAgentTelemetryEvent({
      user: currentUser,
      userRole,
      toolName,
      query: trimmed,
      latencyMs,
      status: 'ok',
      matchedShopNames: topShops.slice(0, 3).map((s) => s.nameKh),
    });
    if (!userCoords) saveToCache(result);
    return result;
  }

  return null;
}

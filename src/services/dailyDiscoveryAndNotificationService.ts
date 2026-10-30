import {
  AppNotification,
  DailyDiscoveryCategory,
  DailyDiscoveryItem,
  FoodItem,
  Restaurant,
  TouristDestination,
} from '../types';

const SUPABASE_URL = 'https://ryvltobwuwuulazqjnza.supabase.co';
const SUPABASE_KEY = 'sb_publishable_h5ufAaA0qAL3s-ebprATsw_8AApv71l';
const KV_TABLE = 'kft_app_kv_store';

const DAILY_CACHE_KEY = 'kft_daily_discoveries_cache_v2';
const SEEN_ITEMS_KEY = 'kft_daily_seen_items_v2';
const DISMISSED_ITEMS_KEY = 'kft_daily_dismissed_items_v2';
const NOTIF_PREFS_KEY = 'kft_notification_prefs_v1';

export interface NotificationPreferences {
  promo: boolean;
  new_spot: boolean;
  event: boolean;
  local_news: boolean;
  daily_dish: boolean;
  system: boolean;
  preferredProvinceKh: string; // 'all' or specific provinceKh
  onlyUnread: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  promo: true,
  new_spot: true,
  event: true,
  local_news: true,
  daily_dish: true,
  system: true,
  preferredProvinceKh: 'all',
  onlyUnread: false,
};

export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(NOTIF_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_NOTIFICATION_PREFS };
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

export function loadSeenDiscoveryIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_ITEMS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

export function markDiscoveryItemSeen(id: string): Set<string> {
  const seen = loadSeenDiscoveryIds();
  seen.add(id);
  try {
    localStorage.setItem(SEEN_ITEMS_KEY, JSON.stringify(Array.from(seen).slice(-300)));
  } catch {}
  return seen;
}

export function clearSeenDiscoveryHistory(): void {
  try {
    localStorage.removeItem(SEEN_ITEMS_KEY);
    localStorage.removeItem(DISMISSED_ITEMS_KEY);
  } catch {}
}

export function loadDismissedDiscoveryIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_ITEMS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

export function dismissDiscoveryItem(id: string): Set<string> {
  const dismissed = loadDismissedDiscoveryIds();
  dismissed.add(id);
  try {
    localStorage.setItem(DISMISSED_ITEMS_KEY, JSON.stringify(Array.from(dismissed).slice(-300)));
  } catch {}
  return dismissed;
}

// Coordinates for Cambodian provinces for accurate location-based recommendations
export const CAMBODIA_PROVINCE_COORDS: Record<string, { lat: number; lng: number; nameEn: string }> = {
  'រាជធានីភ្នំពេញ': { lat: 11.5564, lng: 104.9282, nameEn: 'Phnom Penh' },
  'ខេត្តសៀមរាប': { lat: 13.3633, lng: 103.8564, nameEn: 'Siem Reap' },
  'ខេត្តព្រះសីហនុ': { lat: 10.6275, lng: 103.5221, nameEn: 'Preah Sihanouk' },
  'ខេត្តកំពត': { lat: 10.5942, lng: 104.1640, nameEn: 'Kampot' },
  'ខេត្តកែប': { lat: 10.4829, lng: 104.3167, nameEn: 'Kep' },
  'ខេត្តបាត់ដំបង': { lat: 13.0957, lng: 103.2022, nameEn: 'Battambang' },
  'ខេត្តកណ្តាល': { lat: 11.4833, lng: 104.9500, nameEn: 'Kandal' },
  'ខេត្តកំពង់ចាម': { lat: 11.9934, lng: 105.4635, nameEn: 'Kampong Cham' },
  'ខេត្តមណ្ឌលគិរី': { lat: 12.4558, lng: 107.1881, nameEn: 'Mondulkiri' },
  'ខេត្តរតនគិរី': { lat: 13.7394, lng: 106.9872, nameEn: 'Ratanakiri' },
  'ខេត្តកោះកុង': { lat: 11.6153, lng: 102.9838, nameEn: 'Koh Kong' },
  'ខេត្តព្រះវិហារ': { lat: 13.8073, lng: 104.9805, nameEn: 'Preah Vihear' },
  'ខេត្តកំពង់ធំ': { lat: 12.7111, lng: 104.8887, nameEn: 'Kampong Thom' },
  'ខេត្តកំពង់ស្ពឺ': { lat: 11.4533, lng: 104.5208, nameEn: 'Kampong Speu' },
  'ខេត្តពោធិ៍សាត់': { lat: 12.5388, lng: 103.9192, nameEn: 'Pursat' },
  'ខេត្តក្រចេះ': { lat: 12.4881, lng: 106.0188, nameEn: 'Kratie' },
  'ខេត្តតាកែវ': { lat: 10.9908, lng: 104.7850, nameEn: 'Takeo' },
  'ខេត្តកំពង់ឆ្នាំង': { lat: 12.2500, lng: 104.6667, nameEn: 'Kampong Chhnang' },
  'ខេត្តព្រៃវែង': { lat: 11.4868, lng: 105.3253, nameEn: 'Prey Veng' },
  'ខេត្តស្វាយរៀង': { lat: 11.0879, lng: 105.7993, nameEn: 'Svay Rieng' },
  'ខេត្តបន្ទាយមានជ័យ': { lat: 13.5859, lng: 102.9737, nameEn: 'Banteay Meanchey' },
  'ខេត្តប៉ៃលិន': { lat: 12.8489, lng: 102.6093, nameEn: 'Pailin' },
  'ខេត្តឧត្តរមានជ័យ': { lat: 14.1818, lng: 103.5176, nameEn: 'Oddar Meanchey' },
  'ខេត្តស្ទឹងត្រែង': { lat: 13.5259, lng: 105.9683, nameEn: 'Stung Treng' },
  'ខេត្តត្បូងឃ្មុំ': { lat: 11.8891, lng: 105.6540, nameEn: 'Tboung Khmum' },
};

export function calculateDistanceKm(
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number
): number | null {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    Number.isNaN(lat1) ||
    Number.isNaN(lon1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  ) {
    return null;
  }
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function formatRelativeTimestamp(isoString: string, lang: 'km' | 'en' | 'zh' = 'km'): string {
  if (!isoString) return '';
  const ts = Date.parse(isoString);
  if (Number.isNaN(ts)) return isoString.slice(0, 10);
  const diffMs = Math.max(0, Date.now() - ts);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const datePart = new Date(ts).toISOString().slice(0, 10);

  if (diffMins < 5) {
    if (lang === 'km') return `អម្បាញ់មិញនេះ • ${datePart}`;
    if (lang === 'zh') return `刚刚更新 • ${datePart}`;
    return `Just now • ${datePart}`;
  }
  if (diffMins < 60) {
    if (lang === 'km') return `${diffMins} នាទីមុន • ${datePart}`;
    if (lang === 'zh') return `${diffMins} 分钟前 • ${datePart}`;
    return `${diffMins}m ago • ${datePart}`;
  }
  if (diffHours < 24) {
    if (lang === 'km') return `${diffHours} ម៉ោងមុន • ${datePart}`;
    if (lang === 'zh') return `${diffHours} 小时前 • ${datePart}`;
    return `${diffHours}h ago • ${datePart}`;
  }
  if (diffDays === 1) {
    if (lang === 'km') return `ម្សិលមិញ • ${datePart}`;
    if (lang === 'zh') return `昨天 • ${datePart}`;
    return `Yesterday • ${datePart}`;
  }
  if (diffDays < 7) {
    if (lang === 'km') return `${diffDays} ថ្ងៃមុន • ${datePart}`;
    if (lang === 'zh') return `${diffDays} 天前 • ${datePart}`;
    return `${diffDays}d ago • ${datePart}`;
  }
  return datePart;
}

function getIsoHoursAgo(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
}

/**
 * Curated & Real-Time Base Feed of Cambodian Events, Promotions, Local News, New Spots & Dishes
 */
export function buildCuratedCambodiaDiscoveryItems(
  foods: FoodItem[],
  restaurants: Restaurant[],
  destinations: TouristDestination[]
): DailyDiscoveryItem[] {
  const items: DailyDiscoveryItem[] = [];

  // 1. Dynamically surface newest / recently updated Destinations (including recently updated temples & eco-spots)
  const sortedDests = [...destinations].sort((a, b) => {
    const ta = a.photoUpdatedAt ? Date.parse(a.photoUpdatedAt) : 0;
    const tb = b.photoUpdatedAt ? Date.parse(b.photoUpdatedAt) : 0;
    return tb - ta;
  });

  const featuredDestIds = ['dest-229', 'dest-240', 'dest-104', 'dest-107', 'dest-90', 'dest-91', 'dest-87', 'dest-9', 'dest-29', 'dest-1'];
  const pickedDests: TouristDestination[] = [];
  const usedDestIds = new Set<string>();

  for (const id of featuredDestIds) {
    const found = destinations.find((d) => d.id === id);
    if (found && !usedDestIds.has(found.id)) {
      pickedDests.push(found);
      usedDestIds.add(found.id);
    }
  }
  for (const d of sortedDests) {
    if (pickedDests.length >= 10) break;
    if (!usedDestIds.has(d.id)) {
      pickedDests.push(d);
      usedDestIds.add(d.id);
    }
  }

  pickedDests.forEach((d, idx) => {
    const mapUrl =
      d.mapUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.nameEn || d.nameKh)}`;
    items.push({
      id: `disc-dest-${d.id}`,
      category: 'attraction',
      titleKh: `✨ ទីតាំងទេសចរណ៍ពេញនិយម៖ ${d.nameKh}`,
      titleEn: `✨ Trending Attraction: ${d.nameEn}`,
      titleZh: `✨ 热门旅游景点：${d.nameEn}`,
      summaryKh:
        d.descriptionKh ||
        `ស្វែងយល់ពីសម្រស់ធម្មជាតិ និងវប្បធម៌នៅ ${d.nameKh} (${d.provinceKh}) ជាមួយរូបភាពថ្មីច្បាស់កម្រិត HD និងផែនទីធ្វើដំណើរ។`,
      summaryEn:
        d.descriptionEn ||
        `Discover ${d.nameEn} in ${d.provinceEn} with newly updated HD photos and GPS directions.`,
      photoUrl: d.photoUrl || `/destinations/${d.id}.jpg`,
      provinceKh: d.provinceKh || 'ខេត្តសៀមរាប',
      provinceEn: d.provinceEn || 'Siem Reap',
      addressKh: d.addressKh,
      latitude: d.latitude,
      longitude: d.longitude,
      publishedAt: d.photoUpdatedAt || getIsoHoursAgo(idx * 3 + 1),
      sourceName: idx % 2 === 0 ? 'Ministry of Tourism & Cloud Sync' : 'Google Maps & Public Travel Review',
      sourceUrl: mapUrl,
      sourcePlatform: idx % 2 === 0 ? 'supabase_live' : 'google_maps',
      targetType: 'destination',
      targetId: d.id,
      rating: d.rating || 4.8,
      isNewToday: idx < 5,
      tagsKh: [d.categoryKh || 'ទេសចរណ៍', d.provinceKh || 'កម្ពុជា'],
      tagsEn: [d.categoryEn || 'Tourism', d.provinceEn || 'Cambodia'],
    });
  });

  // 2. Dynamically surface Newest & VIP Approved Restaurants / Shops
  const approvedRests = restaurants.filter((r) => r.status === 'approved' || !r.status);
  const sortedRests = [...approvedRests].sort((a, b) => {
    const aVip = a.membershipTier === 'premium' ? 1 : 0;
    const bVip = b.membershipTier === 'premium' ? 1 : 0;
    if (aVip !== bVip) return bVip - aVip;
    const ta = a.updatedAt ? Date.parse(a.updatedAt) : a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.updatedAt ? Date.parse(b.updatedAt) : b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  });

  sortedRests.slice(0, 10).forEach((r, idx) => {
    const sourceLink =
      r.facebookUrl ||
      r.telegramUrl ||
      r.mapUrl ||
      `https://www.google.com/maps/search/?api=1&query=${r.latitude || 11.5564},${r.longitude || 104.9282}`;
    items.push({
      id: `disc-rest-${r.id}`,
      category: 'restaurant',
      titleKh: `🏪 ហាងឆ្ងាញ់គួរសាក៖ ${r.nameKh}`,
      titleEn: `🏪 Featured Restaurant & Shop: ${r.nameEn || r.nameKh}`,
      titleZh: `🏪 精选推荐餐厅：${r.nameEn || r.nameKh}`,
      summaryKh:
        r.descriptionKh ||
        `ភោជនីយដ្ឋាន ${r.nameKh} មានបម្រើមុខម្ហូបពិសេស (${(r.signatureDishesKh || []).slice(0, 3).join(', ')}) នៅ ${r.addressKh || r.provinceKh}។`,
      summaryEn:
        r.descriptionEn ||
        `${r.nameEn || r.nameKh} serves authentic signature dishes in ${r.provinceEn || r.provinceKh}. Open ${r.openingHoursEn || 'daily'}.`,
      photoUrl: r.photoUrl || '/Shop/rest-1.jpg',
      provinceKh: r.provinceKh || 'រាជធានីភ្នំពេញ',
      provinceEn: r.provinceEn || 'Phnom Penh',
      addressKh: r.addressKh,
      latitude: r.latitude,
      longitude: r.longitude,
      publishedAt: r.updatedAt || r.createdAt || getIsoHoursAgo(idx * 2 + 1),
      sourceName: r.facebookUrl ? 'Facebook Official Page' : 'Google Maps Verified Listing',
      sourceUrl: sourceLink,
      sourcePlatform: r.membershipTier === 'premium' ? 'vip_partner' : 'google_maps',
      targetType: 'restaurant',
      targetId: r.id,
      priceDisplay: r.priceLevel || '$$',
      rating: r.rating || 4.8,
      isNewToday: idx < 4,
      tagsKh: ['ភោជនីយដ្ឋាន', r.provinceKh || 'ភ្នំពេញ', ...(r.signatureDishesKh || []).slice(0, 2)],
      tagsEn: ['Restaurant', r.provinceEn || 'Phnom Penh'],
    });
  });

  // 3. Active Promotions & Partner Deals (Multiple Real Restaurant Promos)
  const promoConfigs = [
    {
      id: 'disc-promo-kimly-kep',
      restId: 'rest-19',
      discount: 15,
      titleKh: '🏷️ បញ្ចុះតម្លៃ 15% នៅភោជនីយដ្ឋាន គីមលី គ្រឿងសមុទ្រកែប',
      titleEn: '🏷️ 15% OFF at Kimly Seafood Restaurant (Kep Crab Market)',
      titleZh: '🏷️ 白马金莉海鲜餐厅 (Kimly Seafood) 专属 85 折优惠',
      summaryKh: 'ផ្តល់ជូនការបញ្ចុះតម្លៃ 15% លើឈុតក្តាមឆាម្រេចខ្ចីកំពត និងបង្គាអាំង សម្រាប់សមាជិកកម្មវិធី Discover Cambodia Food & Tourism រៀងរាល់ថ្ងៃចុងសប្តាហ៍!',
      summaryEn: 'Enjoy 15% off fresh Kampot green pepper crab and grilled prawns at Kep Crab Market when showing the app!',
      provinceKh: 'ខេត្តកែប',
      provinceEn: 'Kep',
      lat: 10.4829,
      lng: 104.3167,
      hoursAgo: 2,
    },
    {
      id: 'disc-promo-malis-pp',
      restId: 'rest-1',
      discount: 20,
      titleKh: '🏷️ ប្រូម៉ូសិនអាហារពេលព្រឹក 20% នៅភោជនីយដ្ឋាន ម៉ាលីស (Malis)',
      titleEn: '🏷️ 20% OFF Traditional Khmer Breakfast Set at Malis Phnom Penh',
      titleZh: '🏷️ 金边 Malis 餐厅传统高棉早餐套餐 8 折优惠',
      summaryKh: 'ទទួលបានការបញ្ចុះតម្លៃ 20% សម្រាប់ឈុតគុយទាវភ្នំពេញ នំបញ្ចុកសម្លខ្មែរ និងកាហ្វេទឹកដោះគោ ចាប់ពីម៉ោង 6:30 ដល់ 10:00 ព្រឹក។',
      summaryEn: 'Save 20% on signature Phnom Penh Kuy Teav, Fish Amok & Khmer iced coffee breakfast sets from 6:30 AM to 10:00 AM.',
      provinceKh: 'រាជធានីភ្នំពេញ',
      provinceEn: 'Phnom Penh',
      lat: 11.5542,
      lng: 104.9285,
      hoursAgo: 4,
    },
    {
      id: 'disc-promo-chanrey-sr',
      restId: 'rest-4',
      discount: 15,
      titleKh: '🏷️ បញ្ចុះតម្លៃ 15% ឈុតម្ហូបខ្មែរគ្រួសារ នៅចាន់រី ទ្រី (សៀមរាប)',
      titleEn: '🏷️ 15% OFF Family Khmer Dining Set at Chanrey Tree (Siem Reap)',
      titleZh: '🏷️ 暹粒 Chanrey Tree 餐厅家庭高棉套餐 85 折优惠',
      summaryKh: 'បញ្ចុះតម្លៃពិសេស 15% សម្រាប់ភ្ញៀវទេសចរដែលកក់តុញ៉ាំអាហារពេលល្ងាចតាមរយៈកម្មវិធី នៅក្បែរស្ទឹងសៀមរាប។',
      summaryEn: 'Get 15% off riverside dinner reservations featuring Amok, Samlor Korko, and Smoked Fish Salad in Siem Reap.',
      provinceKh: 'ខេត្តសៀមរាប',
      provinceEn: 'Siem Reap',
      lat: 13.3558,
      lng: 103.8569,
      hoursAgo: 7,
    },
    {
      id: 'disc-promo-rusty-kampot',
      restId: 'rest-12',
      discount: 10,
      titleKh: '🏷️ ថែមជូនភេសជ្ជៈឥតគិតថ្លៃ & បញ្ចុះតម្លៃ 10% នៅខេត្តកំពត',
      titleEn: '🏷️ 10% OFF + Free Fresh Drink at Kampot Riverside Eatery',
      titleZh: '🏷️ 贡布河畔餐厅 9 折优惠并赠特调饮品',
      summaryKh: 'រីករាយជាមួយម្ហូបគ្រឿងសមុទ្រ និងសាច់គោឆាម្រេចកំពត ជាមួយការបញ្ចុះតម្លៃ 10% និងថែមជូនទឹកអំពៅ ឬទឹកដូងស្រស់ ១ កែវ។',
      summaryEn: 'Enjoy 10% off Kampot pepper beef & seafood dishes plus a complimentary fresh coconut or sugarcane drink.',
      provinceKh: 'ខេត្តកំពត',
      provinceEn: 'Kampot',
      lat: 10.6095,
      lng: 104.1782,
      hoursAgo: 11,
    },
  ];

  for (const p of promoConfigs) {
    const matchedRest = restaurants.find((r) => r.id === p.restId) || restaurants[0];
    items.push({
      id: p.id,
      category: 'promotion',
      titleKh: p.titleKh,
      titleEn: p.titleEn,
      titleZh: p.titleZh,
      summaryKh: p.summaryKh,
      summaryEn: p.summaryEn,
      photoUrl: matchedRest?.photoUrl || '/Shop/rest-1.jpg',
      provinceKh: p.provinceKh,
      provinceEn: p.provinceEn,
      latitude: p.lat,
      longitude: p.lng,
      publishedAt: getIsoHoursAgo(p.hoursAgo),
      sourceName: 'VIP Partner Shop Promotion',
      sourceUrl: matchedRest?.mapUrl || 'https://www.google.com/maps',
      sourcePlatform: 'vip_partner',
      targetType: 'restaurant',
      targetId: matchedRest?.id || p.restId,
      discountPercent: p.discount,
      priceDisplay: `-${p.discount}% OFF`,
      rating: matchedRest?.rating || 4.9,
      isNewToday: p.hoursAgo <= 8,
      tagsKh: ['ប្រូម៉ូសិន', `បញ្ចុះតម្លៃ ${p.discount}%`, p.provinceKh],
      tagsEn: ['Promotion', `${p.discount}% OFF`, p.provinceEn],
    });
  }

  // 4. Upcoming Cambodian Festivals, Food Fairs & Cultural Events
  const eventItems: DailyDiscoveryItem[] = [
    {
      id: 'disc-event-water-festival',
      category: 'event',
      titleKh: '🎉 ព្រឹត្តិការណ៍ពិព័រណ៍ម្ហូបអាហារខ្មែរ & បុណ្យអុំទូកមាត់ទន្លេភ្នំពេញ',
      titleEn: '🎉 Phnom Penh Riverside Khmer Food Fair & Water Festival Showcase',
      titleZh: '🎉 金边河畔高棉美食博览会与送水节盛典',
      summaryKh: 'ស្តង់ម្ហូបអាហារប្រពៃណីខ្មែរជាង ១៥០ ស្តង់ ពីគ្រប់ខេត្ត-ក្រុង ការប្រគំតន្ត្រី និងការបង្ហាញទូកង នៅតាមបណ្តោយមាត់ទន្លេមុខព្រះបរមរាជវាំង។',
      summaryEn: 'Over 150 regional Cambodian street food stalls, cultural performances, illuminated floats, and boat race exhibitions along Sisowath Quay.',
      photoUrl: '/destinations/dest-1.jpg',
      provinceKh: 'រាជធានីភ្នំពេញ',
      provinceEn: 'Phnom Penh',
      latitude: 11.5637,
      longitude: 104.9313,
      publishedAt: getIsoHoursAgo(3),
      sourceName: 'Ministry of Tourism Cambodia (Official FB)',
      sourceUrl: 'https://www.facebook.com/motcambodia',
      sourcePlatform: 'facebook_public',
      targetType: 'destination',
      targetId: 'dest-1',
      priceDisplay: 'ចូលរួមដោយសេរី ($0)',
      rating: 5.0,
      isNewToday: true,
      tagsKh: ['ព្រឹត្តិការណ៍ជាតិ', 'ពិព័រណ៍ម្ហូបអាហារ', 'រាជធានីភ្នំពេញ'],
      tagsEn: ['Festival', 'Street Food Fair', 'Phnom Penh'],
    },
    {
      id: 'disc-event-siemreap-night-food',
      category: 'event',
      titleKh: '🏮 ផ្សាររាត្រីម្ហូបខ្មែរ & សិល្បៈអង្គរ នៅមាត់ស្ទឹងសៀមរាប',
      titleEn: '🏮 Siem Reap Riverside Night Food Street & Cultural Walk',
      titleZh: '🏮 暹粒河畔夜市美食街与文化艺术展',
      summaryKh: 'ភ្លក្សអាហារតាមផ្លូវសៀមរាប នំបញ្ចុកទឹកប្រហុក សាច់គោអាំងចង្កាក់ បង្អែមខ្មែរ និងទស្សនារបាំប្រពៃណី រៀងរាល់ល្ងាចម៉ោង ៥:០០ ដល់ ១១:០០ យប់។',
      summaryEn: 'Experience authentic Siem Reap street food, Nom Banh Chok, grilled skewers, Khmer desserts, and live traditional music every evening along the river.',
      photoUrl: '/destinations/dest-9.jpg',
      provinceKh: 'ខេត្តសៀមរាប',
      provinceEn: 'Siem Reap',
      latitude: 13.3545,
      longitude: 103.8552,
      publishedAt: getIsoHoursAgo(6),
      sourceName: 'Visit Siem Reap Official & TikTok Viral',
      sourceUrl: 'https://www.tourismcambodia.com',
      sourcePlatform: 'tiktok_public',
      targetType: 'destination',
      targetId: 'dest-9',
      priceDisplay: 'ចូលរួមដោយសេរី ($0)',
      rating: 4.9,
      isNewToday: true,
      tagsKh: ['ផ្សាររាត្រី', 'អាហារតាមផ្លូវ', 'ខេត្តសៀមរាប'],
      tagsEn: ['Night Market', 'Siem Reap', 'Cultural Event'],
    },
    {
      id: 'disc-event-kampot-seafood-fest',
      category: 'event',
      titleKh: '🦀 ពិធីបុណ្យគ្រឿងសមុទ្រ & ម្រេចកំពត-កែប ចុងសប្តាហ៍នេះ',
      titleEn: '🦀 Kampot-Kep Fresh Seafood & GI Pepper Culinary Weekend',
      titleZh: '🦀 贡布-白马鲜活海鲜与地理标志胡椒美食节',
      summaryKh: 'ជួបជាមួយមេចុងភៅឆ្នើមៗ ចម្អិនម្ហូបគ្រឿងសមុទ្រស្រស់ៗផ្ទាល់ៗ ការបញ្ចុះតម្លៃកញ្ចុះមាត់ទឹក និងការជិះទូកមើលថ្ងៃលិចនៅព្រែកកំពត។',
      summaryEn: 'Live cooking demonstrations with Kampot GI pepper, fresh crab tastings, sunset river cruises, and riverside dining promotions.',
      photoUrl: '/destinations/dest-29.jpg',
      provinceKh: 'ខេត្តកំពត',
      provinceEn: 'Kampot',
      latitude: 10.5942,
      longitude: 104.1640,
      publishedAt: getIsoHoursAgo(9),
      sourceName: 'Cambodia Culinary & Tourism Board',
      sourceUrl: 'https://www.tourismcambodia.com',
      sourcePlatform: 'tourism_ministry',
      targetType: 'destination',
      targetId: 'dest-29',
      priceDisplay: 'ឥតគិតថ្លៃ ($0)',
      rating: 4.8,
      isNewToday: false,
      tagsKh: ['ពិធីបុណ្យសមុទ្រ', 'ម្រេចកំពត', 'ខេត្តកំពត'],
      tagsEn: ['Seafood Festival', 'Kampot', 'Weekend Event'],
    },
  ];
  items.push(...eventItems);

  // 5. Local Tourism & Culinary News Updates
  const newsItems: DailyDiscoveryItem[] = [
    {
      id: 'disc-news-koh-ker-unesco',
      category: 'local_news',
      titleKh: '📰 ព័ត៌មានទេសចរណ៍៖ ផ្លូវធ្វើដំណើរទៅកាន់ប្រាសាទកោះកេរ និងព្រះវិហារ កាន់តែងាយស្រួល',
      titleEn: '📰 Local Travel News: Upgraded Road Access & Visitor Facilities at Koh Ker & Preah Vihear',
      titleZh: '📰 本地旅游资讯：贡开与柏威夏古寺道路及游客设施全面升级',
      summaryKh: 'ភ្ញៀវទេសចរជាតិ និងអន្តរជាតិកំពុងពេញនិយមធ្វើដំណើរទស្សនាប្រាសាទកោះកេរ (បេតិកភណ្ឌពិភពលោក) និងប្រាសាទព្រះវិហារ ជាមួយផ្លូវកៅស៊ូស្អាត និងកន្លែងសម្រាកញ៉ាំអាហារខ្មែរ។',
      summaryEn: 'Travelers can now enjoy smooth highway access, new rest stops, and authentic local eateries when visiting UNESCO World Heritage sites Koh Ker and Preah Vihear.',
      photoUrl: '/destinations/dest-87.jpg',
      provinceKh: 'ខេត្តព្រះវិហារ',
      provinceEn: 'Preah Vihear',
      latitude: 13.7830,
      longitude: 104.5370,
      publishedAt: getIsoHoursAgo(5),
      sourceName: 'Ministry of Tourism Cambodia News',
      sourceUrl: 'https://www.tourismcambodia.com',
      sourcePlatform: 'tourism_ministry',
      targetType: 'destination',
      targetId: 'dest-87',
      rating: 4.9,
      isNewToday: true,
      tagsKh: ['ព័ត៌មានទេសចរណ៍', 'បេតិកភណ្ឌពិភពលោក', 'ខេត្តព្រះវិហារ'],
      tagsEn: ['Travel News', 'UNESCO Heritage', 'Preah Vihear'],
    },
    {
      id: 'disc-news-knong-phsar-cloud',
      category: 'local_news',
      titleKh: '☁️ វីដេអូ និងរូបភាពថ្មី៖ សមុទ្រពពកលើភ្នំខ្នងផ្សារ កំពុងទាក់ទាញអ្នកទេសចរយ៉ាងច្រើន',
      titleEn: '☁️ Viral Update: Sea of Clouds at Knong Phsar Peak Draws Eco-Travelers',
      titleZh: '☁️ 热门资讯：农帕萨山云海日出吸引大批生态旅游爱好者',
      summaryKh: 'រដូវកាលទស្សនាសមុទ្រពពក និងថ្ងៃរះលើកំពូលភ្នំខ្នងផ្សារ មានអាកាសធាតុត្រជាក់ស្រួល រួមជាមួយសេវាបោះតង់ និងម្ហូបអាហារសហគមន៍តំបន់ភ្នំ។',
      summaryEn: 'Cool mountain breezes and breathtaking sunrise cloud views make Knong Phsar Cambodia’s #1 trending eco-camping destination this week.',
      photoUrl: '/destinations/dest-229.jpg',
      provinceKh: 'ខេត្តកំពង់ស្ពឺ',
      provinceEn: 'Kampong Speu',
      latitude: 11.4680,
      longitude: 104.1520,
      publishedAt: getIsoHoursAgo(1),
      sourceName: 'TikTok & Facebook Cambodia Travel Community',
      sourceUrl: 'https://www.google.com/maps/search/?api=1&query=Knong+Phsar+Cambodia',
      sourcePlatform: 'tiktok_public',
      targetType: 'destination',
      targetId: 'dest-229',
      rating: 5.0,
      isNewToday: true,
      tagsKh: ['សមុទ្រពពក', 'ភ្នំខ្នងផ្សារ', 'ពេញនិយមលើ TikTok/FB'],
      tagsEn: ['Viral Spot', 'Eco-Tourism', 'Kampong Speu'],
    },
  ];
  items.push(...newsItems);

  // 6. Featured Daily Authentic Khmer Dishes
  const signatureFoodIds = ['food-1', 'food-2', 'food-50', 'food-143', 'food-127', 'food-149'];
  signatureFoodIds.forEach((fid, idx) => {
    const food = foods.find((f) => f.id === fid);
    if (!food) return;
    items.push({
      id: `disc-food-${food.id}`,
      category: 'food',
      titleKh: `🍲 មុខម្ហូបខ្មែរប្រចាំថ្ងៃ៖ ${food.nameKh}`,
      titleEn: `🍲 Featured Khmer Dish: ${food.nameEn}`,
      titleZh: `🍲 每日精选高棉菜品：${food.nameEn}`,
      summaryKh:
        food.descriptionKh ||
        `ស្វែងយល់ពីគ្រឿងផ្សំ និងវិធីចម្អិន «${food.nameKh}» តាមក្បួនដើមខ្មែរពិតៗ។`,
      summaryEn:
        food.descriptionEn ||
        `Learn how to prepare authentic ${food.nameEn} with step-by-step recipe instructions.`,
      photoUrl: food.photoUrl || `/foods/${food.id}.jpg`,
      provinceKh: 'ទូទាំងប្រទេសកម្ពុជា',
      provinceEn: 'All Cambodia',
      latitude: 11.5564,
      longitude: 104.9282,
      publishedAt: getIsoHoursAgo(idx * 4 + 2),
      sourceName: 'Khmer Culinary Heritage Archive',
      sourceUrl: `https://en.wikipedia.org/wiki/Cambodian_cuisine`,
      sourcePlatform: 'wikimedia_api',
      targetType: 'food',
      targetId: food.id,
      priceDisplay: food.calories ? `${food.calories} kcal` : undefined,
      rating: food.rating || 4.9,
      isNewToday: idx < 3,
      tagsKh: [food.categoryKh || 'ម្ហូបខ្មែរ', 'រូបមន្តចម្អិន'],
      tagsEn: [food.categoryEn || 'Khmer Dish', 'Authentic Recipe'],
    });
  });

  return deduplicateAndSortDiscoveries(items);
}

/**
 * Removes any duplicate items (by id, targetId+category, or normalized title)
 * and sorts newest items first.
 */
export function deduplicateAndSortDiscoveries(items: DailyDiscoveryItem[]): DailyDiscoveryItem[] {
  const seenIds = new Set<string>();
  const seenTitleKeys = new Set<string>();
  const result: DailyDiscoveryItem[] = [];

  for (const item of items) {
    if (!item || !item.id || !item.titleKh) continue;
    const normTitle = `${item.category}:${item.titleKh.replace(/\s+/g, '').toLowerCase()}`;
    if (seenIds.has(item.id) || seenTitleKeys.has(normTitle)) continue;
    seenIds.add(item.id);
    seenTitleKeys.add(normTitle);
    result.push(item);
  }

  return result.sort((a, b) => {
    const ta = Date.parse(a.publishedAt) || 0;
    const tb = Date.parse(b.publishedAt) || 0;
    return tb - ta;
  });
}

/**
 * Fetches live dynamic updates from:
 * 1. Open-Meteo Public Weather API (for real-time Cambodia destination travel advisories)
 * 2. Supabase `kft_app_kv_store` (for newly updated destinations, restaurants & cloud announcements)
 * Merges with curated feed, caches in localStorage, and handles offline/network errors gracefully.
 */
export async function fetchDynamicDailyDiscoveries(params: {
  foods: FoodItem[];
  restaurants: Restaurant[];
  destinations: TouristDestination[];
  forceRefresh?: boolean;
}): Promise<{
  items: DailyDiscoveryItem[];
  lastSyncedAt: string;
  fromCache: boolean;
}> {
  const baseItems = buildCuratedCambodiaDiscoveryItems(
    params.foods,
    params.restaurants,
    params.destinations
  );

  // Check recent cache (10 minutes TTL unless forceRefresh is true)
  if (!params.forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(DAILY_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        const ageMs = Date.now() - (Date.parse(cached.lastSyncedAt) || 0);
        if (ageMs < 10 * 60 * 1000 && Array.isArray(cached.liveExtras)) {
          const merged = deduplicateAndSortDiscoveries([...cached.liveExtras, ...baseItems]);
          return {
            items: merged,
            lastSyncedAt: cached.lastSyncedAt,
            fromCache: true,
          };
        }
      }
    } catch {}
  }

  const liveExtras: DailyDiscoveryItem[] = [];

  // 1. Live Open-Meteo Cambodia Tourism Weather Advisory (0 API key required, fast & reliable)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const weatherRes = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=13.3633,10.5942&longitude=103.8564,104.1640&current_weather=true',
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (weatherRes.ok) {
      const wData = await weatherRes.json();
      const srWeather = Array.isArray(wData) ? wData[0]?.current_weather : wData?.current_weather;
      if (srWeather && typeof srWeather.temperature === 'number') {
        const tempC = Math.round(srWeather.temperature);
        liveExtras.push({
          id: `disc-live-weather-sr-${new Date().toISOString().slice(0, 10)}`,
          category: 'local_news',
          titleKh: `🌤️ បច្ចុប្បន្នភាពអាកាសធាតុទេសចរណ៍៖ ខេត្តសៀមរាប & អង្គរ (${tempC}°C)`,
          titleEn: `🌤️ Live Tourism Weather Update: Siem Reap & Angkor (${tempC}°C)`,
          titleZh: `🌤️ 实时旅游天气资讯：暹粒与吴哥窟 (${tempC}°C)`,
          summaryKh: `សីតុណ្ហភាពបច្ចុប្បន្ននៅតំបន់អង្គរ ខេត្តសៀមរាប គឺ ${tempC}°C (ល្បឿនខ្យល់ ${srWeather.windspeed || 8} km/h) អំណោយផលល្អសម្រាប់ការដើរកម្សាន្តប្រាសាទ និងភ្លក្សម្ហូបខ្មែរ។`,
          summaryEn: `Current temperature at Angkor, Siem Reap is ${tempC}°C (wind ${srWeather.windspeed || 8} km/h) — great conditions for temple sightseeing and outdoor dining today.`,
          photoUrl: '/destinations/dest-9.jpg',
          provinceKh: 'ខេត្តសៀមរាប',
          provinceEn: 'Siem Reap',
          latitude: 13.3633,
          longitude: 103.8564,
          publishedAt: new Date().toISOString(),
          sourceName: 'Open-Meteo Live Weather API',
          sourceUrl: 'https://open-meteo.com',
          sourcePlatform: 'open_meteo',
          targetType: 'destination',
          targetId: 'dest-9',
          rating: 5.0,
          isNewToday: true,
          tagsKh: ['អាកាសធាតុផ្ទាល់ (Live)', 'ខេត្តសៀមរាប', 'ព័ត៌មានថ្ងៃនេះ'],
          tagsEn: ['Live Weather', 'Siem Reap', 'Travel Advisory'],
        });
      }
    }
  } catch {
    // Graceful fallback if offline
  }

  // 2. Live Supabase Cloud Newly Updated Places (`kft_app_kv_store`)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const supRes = await fetch(
      `${SUPABASE_URL}/rest/v1/${KV_TABLE}?select=key,updated_at&order=updated_at.desc&limit=8`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (supRes.ok) {
      const rows = await supRes.json();
      if (Array.isArray(rows)) {
        for (const r of rows) {
          if (typeof r.key === 'string' && r.key.startsWith('kft_ov_dest_')) {
            const destId = r.key.replace('kft_ov_dest_', '');
            const dest = params.destinations.find((d) => d.id === destId);
            if (dest) {
              liveExtras.push({
                id: `disc-cloud-dest-${dest.id}`,
                category: 'attraction',
                titleKh: `🆕 រូបភាព និងព័ត៌មានថ្មីពី Cloud៖ ${dest.nameKh}`,
                titleEn: `🆕 Newly Updated on Cloud: ${dest.nameEn}`,
                titleZh: `🆕 云端最新更新景点：${dest.nameEn}`,
                summaryKh:
                  dest.descriptionKh ||
                  `ទីតាំងទេសចរណ៍ ${dest.nameKh} (${dest.provinceKh}) ទើបតែត្រូវបានធ្វើបច្ចុប្បន្នភាពរូបភាពថ្មីច្បាស់កម្រិត HD នៅលើប្រព័ន្ធ Cloud។`,
                summaryEn:
                  dest.descriptionEn ||
                  `${dest.nameEn} (${dest.provinceEn}) was recently updated with verified HD photos on our live server.`,
                photoUrl: dest.photoUrl || `/destinations/${dest.id}.jpg`,
                provinceKh: dest.provinceKh || 'ខេត្តសៀមរាប',
                provinceEn: dest.provinceEn || 'Siem Reap',
                addressKh: dest.addressKh,
                latitude: dest.latitude,
                longitude: dest.longitude,
                publishedAt: r.updated_at || new Date().toISOString(),
                sourceName: 'Supabase Live Cloud Sync',
                sourceUrl:
                  dest.mapUrl ||
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.nameEn || dest.nameKh)}`,
                sourcePlatform: 'supabase_live',
                targetType: 'destination',
                targetId: dest.id,
                rating: dest.rating || 4.9,
                isNewToday: true,
                tagsKh: ['ទើបកែប្រែថ្មី (Live)', dest.provinceKh || 'កម្ពុជា'],
                tagsEn: ['Live Cloud Update', dest.provinceEn || 'Cambodia'],
              });
            }
          }
        }
      }
    }
  } catch {
    // Graceful fallback if offline
  }

  const nowIso = new Date().toISOString();
  try {
    localStorage.setItem(
      DAILY_CACHE_KEY,
      JSON.stringify({
        lastSyncedAt: nowIso,
        liveExtras,
      })
    );
  } catch {}

  const merged = deduplicateAndSortDiscoveries([...liveExtras, ...baseItems]);
  return {
    items: merged,
    lastSyncedAt: nowIso,
    fromCache: false,
  };
}

/**
 * Generates a rich, diverse, non-duplicate list of 12+ actionable Notifications
 * with images, timestamps, source links, and accurate target deep-links.
 */
let cachedNotifFoods: FoodItem[] | null = null; let cachedNotifRests: Restaurant[] | null = null; let cachedNotifDests: TouristDestination[] | null = null; let cachedNotifList: AppNotification[] | null = null;
export function buildDynamicNotificationsList(
  foods: FoodItem[],
  restaurants: Restaurant[],
  destinations: TouristDestination[]
): AppNotification[] {
  if (cachedNotifList && cachedNotifFoods === foods && cachedNotifRests === restaurants && cachedNotifDests === destinations) return cachedNotifList;
  const getRelDate = (daysAgo: number) =>
    new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];
  const getRelIso = (hoursAgo: number) =>
    new Date(Date.now() - hoursAgo * 3600000).toISOString();

  const dest229 = destinations.find((d) => d.id === 'dest-229');
  const dest240 = destinations.find((d) => d.id === 'dest-240');
  const dest104 = destinations.find((d) => d.id === 'dest-104');
  const dest90 = destinations.find((d) => d.id === 'dest-90');
  const rest19 = restaurants.find((r) => r.id === 'rest-19') || restaurants[0];
  const rest1 = restaurants.find((r) => r.id === 'rest-1') || restaurants[1];
  const rest4 = restaurants.find((r) => r.id === 'rest-4') || restaurants[2];
  const food1 = foods.find((f) => f.id === 'food-1') || foods[0];
  const food143 = foods.find((f) => f.id === 'food-143') || foods[1];
  const food149 = foods.find((f) => f.id === 'food-149') || foods[2];

  const list: AppNotification[] = [
    {
      id: 'notif-1',
      titleKh: '🏷️ ប្រូម៉ូសិនពិសេស VIP 15% — គីមលី គ្រឿងសមុទ្រកែប',
      titleEn: '🏷️ VIP Partner 15% Discount — Kimly Seafood Kep',
      titleZh: '🏷️ VIP 合作餐厅 85 折优惠 (减 15%) — 白马金莉海鲜餐厅',
      messageKh: 'ភោជនីយដ្ឋាន គីមលី គ្រឿងសមុទ្រកែប បញ្ចុះតម្លៃ 15% លើមុខម្ហូបក្តាមឆាម្រេចខ្ចី និងបង្គាអាំង សម្រាប់សមាជិកកម្មវិធីនៅចុងសប្តាហ៍នេះ!',
      messageEn: 'Kimly Seafood Restaurant (Kep) offers 15% off Kampot pepper crab and grilled prawns for App members this weekend!',
      messageZh: '白马金莉海鲜餐厅 (Kimly Seafood Kep) 本周末为应用会员提供 85 折 (减 15%) 专属优惠！',
      type: 'promo',
      date: getRelDate(0),
      timestampIso: getRelIso(1),
      isRead: false,
      targetType: 'restaurant',
      targetId: rest19?.id || 'rest-19',
      discountPercent: 15,
      photoUrl: rest19?.photoUrl || '/Shop/rest-19.jpg',
      provinceKh: 'ខេត្តកែប',
      provinceEn: 'Kep',
      sourceName: 'VIP Partner Shop',
      sourceUrl: rest19?.mapUrl || 'https://www.google.com/maps',
      latitude: 10.4829,
      longitude: 104.3167,
    },
    {
      id: 'notif-2',
      titleKh: '☁️ កន្លែង Review ល្បីថ្មីលើ TikTok & FB៖ ភ្នំខ្នងផ្សារ',
      titleEn: '☁️ Trending Viral Spot on TikTok & FB: Knong Phsar Sea of Clouds',
      titleZh: '☁️ TikTok 与 Facebook 热门打卡地：农帕萨山云海',
      messageKh: 'ភ្នំខ្នងផ្សារ សមុទ្រពពក កំពុងមានការ Review យ៉ាងកក្រើកលើ TikTok និង Facebook ជាមួយរូបភាពថ្មីច្បាស់កម្រិត HD!',
      messageEn: 'Knong Phsar Mountain & Sea of Clouds is trending on TikTok & Facebook right now with newly updated HD photos!',
      messageZh: '农帕萨山云海 (Knong Phsar Sea of Clouds) 正在 TikTok 和 Facebook 上火爆刷屏！',
      type: 'new_spot',
      date: getRelDate(0),
      timestampIso: getRelIso(2),
      isRead: false,
      targetType: 'destination',
      targetId: 'dest-229',
      photoUrl: dest229?.photoUrl || '/destinations/dest-229.jpg',
      provinceKh: dest229?.provinceKh || 'ខេត្តកំពង់ស្ពឺ',
      provinceEn: dest229?.provinceEn || 'Kampong Speu',
      sourceName: 'TikTok & Facebook Public Review',
      sourceUrl: dest229?.mapUrl || 'https://www.google.com/maps/search/?api=1&query=Knong+Phsar',
      latitude: dest229?.latitude || 11.468,
      longitude: dest229?.longitude || 104.152,
    },
    {
      id: 'notif-3',
      titleKh: '🍲 មុខម្ហូបខ្មែរឆ្នើមប្រចាំថ្ងៃ៖ អាម៉ុកត្រីអន្លក់ស្លឹកញ',
      titleEn: '🍲 Daily Authentic Khmer Dish: Fish Amok with Noni Leaves',
      titleZh: '🍲 每日精选正宗高棉美食：诺丽叶阿莫克蒸鱼',
      messageKh: 'ថ្ងៃនេះសាកល្បងភ្លក្ស «អាម៉ុកត្រីអន្លក់ស្លឹកញ» រសជាតិដើមខ្មែរពិតៗ និងមើលរូបមន្តចម្អិនលម្អិតជាជំហានៗ!',
      messageEn: 'Try authentic Cambodian Fish Amok with Noni leaves today and view the full step-by-step recipe!',
      messageZh: '今日推荐品尝正宗柬埔寨“诺丽叶阿莫克蒸鱼 (Fish Amok)”，点击查看完整食谱与做法！',
      type: 'daily_dish',
      date: getRelDate(0),
      timestampIso: getRelIso(3),
      isRead: false,
      targetType: 'food',
      targetId: 'food-1',
      photoUrl: food1?.photoUrl || '/foods/food-1.jpg',
      provinceKh: 'ទូទាំងប្រទេសកម្ពុជា',
      provinceEn: 'All Cambodia',
      sourceName: 'Khmer Culinary Heritage',
      sourceUrl: 'https://en.wikipedia.org/wiki/Fish_amok',
      latitude: 11.5564,
      longitude: 104.9282,
    },
    {
      id: 'notif-4',
      titleKh: '🎉 ព្រឹត្តិការណ៍ថ្មី៖ ពិព័រណ៍ម្ហូបអាហារខ្មែរ & បុណ្យអុំទូកមាត់ទន្លេភ្នំពេញ',
      titleEn: '🎉 Upcoming Event: Phnom Penh Riverside Khmer Food Fair & Water Festival',
      titleZh: '🎉 节庆活动：金边河畔高棉美食博览会与送水节盛典',
      messageKh: 'សូមអញ្ជើញចូលរួមទស្សនា និងភ្លក្សម្ហូបខ្មែរជាង ១៥០ ស្តង់ នៅតាមបណ្តោយមាត់ទន្លេមុខព្រះបរមរាជវាំង ចូលរួមដោយសេរី!',
      messageEn: 'Explore over 150 regional Khmer food stalls, boat race showcases, and evening concerts along the Phnom Penh Riverside!',
      messageZh: '欢迎前往金边皇宫河畔体验 150 多个高棉传统美食摊位、龙舟展示与夜间音乐会！',
      type: 'event',
      date: getRelDate(0),
      timestampIso: getRelIso(4),
      isRead: false,
      targetType: 'destination',
      targetId: 'dest-1',
      photoUrl: '/destinations/dest-1.jpg',
      provinceKh: 'រាជធានីភ្នំពេញ',
      provinceEn: 'Phnom Penh',
      sourceName: 'Ministry of Tourism Cambodia',
      sourceUrl: 'https://www.facebook.com/motcambodia',
      latitude: 11.5637,
      longitude: 104.9313,
    },
    {
      id: 'notif-5',
      titleKh: '🏷️ បញ្ចុះតម្លៃ 20% អាហារពេលព្រឹក — ភោជនីយដ្ឋាន ម៉ាលីស (ភ្នំពេញ)',
      titleEn: '🏷️ 20% OFF Khmer Breakfast Set — Malis Restaurant Phnom Penh',
      titleZh: '🏷️ 金边 Malis 餐厅传统高棉早餐套餐 8 折优惠 (减 20%)',
      messageKh: 'បញ្ចុះតម្លៃ 20% លើឈុតគុយទាវភ្នំពេញ និងនំបញ្ចុកសម្លខ្មែរ ចាប់ពីម៉ោង 6:30 ដល់ 10:00 ព្រឹក សម្រាប់អ្នកប្រើកម្មវិធី។',
      messageEn: 'Enjoy 20% off signature Phnom Penh Kuy Teav and Nom Banh Chok breakfast sets from 6:30 AM to 10:00 AM.',
      messageZh: '上午 6:30 至 10:00 享用金边粿条与高棉米粉早餐套餐可享 8 折优惠。',
      type: 'promo',
      date: getRelDate(0),
      timestampIso: getRelIso(5),
      isRead: false,
      targetType: 'restaurant',
      targetId: rest1?.id || 'rest-1',
      discountPercent: 20,
      photoUrl: rest1?.photoUrl || '/Shop/rest-1.jpg',
      provinceKh: 'រាជធានីភ្នំពេញ',
      provinceEn: 'Phnom Penh',
      sourceName: 'Malis Official Partner',
      sourceUrl: rest1?.mapUrl || 'https://www.google.com/maps',
      latitude: 11.5542,
      longitude: 104.9285,
    },
    {
      id: 'notif-6',
      titleKh: `🆕 រូបភាពទីតាំងទេសចរណ៍ថ្មី៖ ${dest240?.nameKh || 'តំបន់ទេសចរណ៍ធម្មជាតិ'}`,
      titleEn: `🆕 Newly Updated Attraction: ${dest240?.nameEn || 'Cambodia Eco-Attraction'}`,
      titleZh: `🆕 最新更新旅游景点：${dest240?.nameEn || '生态旅游景点'}`,
      messageKh: `រូបភាព និងព័ត៌មានលម្អិតរបស់ «${dest240?.nameKh || 'តំបន់ទេសចរណ៍'}» ត្រូវបានធ្វើបច្ចុប្បន្នភាពថ្មីនៅលើប្រព័ន្ធ Cloud ចុចដើម្បីមើលឥឡូវនេះ!`,
      messageEn: `New high-resolution photos and visitor guide details for "${dest240?.nameEn || 'Eco-Attraction'}" are now live!`,
      messageZh: `“${dest240?.nameEn || '生态景点'}”的高清图片与游览指南已在云端更新，点击立即查看！`,
      type: 'new_spot',
      date: getRelDate(0),
      timestampIso: getRelIso(6),
      isRead: false,
      targetType: 'destination',
      targetId: dest240?.id || 'dest-240',
      photoUrl: dest240?.photoUrl || '/destinations/dest-240.jpg',
      provinceKh: dest240?.provinceKh || 'ខេត្តកោះកុង',
      provinceEn: dest240?.provinceEn || 'Koh Kong',
      sourceName: 'Supabase Cloud Media Sync',
      sourceUrl: dest240?.mapUrl || 'https://www.google.com/maps',
      latitude: dest240?.latitude || 11.6153,
      longitude: dest240?.longitude || 102.9838,
    },
    {
      id: 'notif-7',
      titleKh: '📰 ព័ត៌មានទេសចរណ៍៖ ផ្លូវធ្វើដំណើរថ្មីទៅកាន់ប្រាសាទកោះកេរ & ព្រះវិហារ',
      titleEn: '📰 Tourism News: Upgraded Highway Access to Koh Ker & Preah Vihear Temples',
      titleZh: '📰 文旅资讯：前往贡开与柏威夏世界遗产古寺的道路全面升级',
      messageKh: 'ការធ្វើដំណើរទៅទស្សនាប្រាសាទកោះកេរ និងប្រាសាទព្រះវិហារ កាន់តែងាយស្រួលជាមួយផ្លូវកៅស៊ូថ្មី និងអាហារដ្ឋានសហគមន៍ខ្មែរ។',
      messageEn: 'Visiting UNESCO World Heritage sites Koh Ker and Preah Vihear is now faster and more comfortable with upgraded roads and local dining stops.',
      messageZh: '前往世界遗产贡开与柏威夏古寺的公路及沿途高棉餐饮驿站已全面升级。',
      type: 'local_news',
      date: getRelDate(1),
      timestampIso: getRelIso(14),
      isRead: true,
      targetType: 'destination',
      targetId: dest90?.id || 'dest-90',
      photoUrl: dest90?.photoUrl || '/destinations/dest-90.jpg',
      provinceKh: dest90?.provinceKh || 'ខេត្តព្រះវិហារ',
      provinceEn: dest90?.provinceEn || 'Preah Vihear',
      sourceName: 'Ministry of Tourism Cambodia',
      sourceUrl: 'https://www.tourismcambodia.com',
      latitude: dest90?.latitude || 13.8073,
      longitude: dest90?.longitude || 104.9805,
    },
    {
      id: 'notif-8',
      titleKh: '🏷️ បញ្ចុះតម្លៃ 15% ឈុតអាហារពេលល្ងាច — ចាន់រី ទ្រី (សៀមរាប)',
      titleEn: '🏷️ 15% OFF Riverside Khmer Dinner — Chanrey Tree Siem Reap',
      titleZh: '🏷️ 暹粒 Chanrey Tree 河畔高棉晚餐 85 折优惠',
      messageKh: 'ទទួលបានការបញ្ចុះតម្លៃ 15% សម្រាប់ឈុតម្ហូបខ្មែរគ្រួសារ នៅភោជនីយដ្ឋាន ចាន់រី ទ្រី មាត់ស្ទឹងសៀមរាប។',
      messageEn: 'Get 15% off authentic Khmer family dinner sets along the Siem Reap River at Chanrey Tree Restaurant.',
      messageZh: '在暹粒河畔 Chanrey Tree 餐厅享用正宗高棉家庭晚餐套餐可享 85 折优惠。',
      type: 'promo',
      date: getRelDate(1),
      timestampIso: getRelIso(18),
      isRead: true,
      targetType: 'restaurant',
      targetId: rest4?.id || 'rest-4',
      discountPercent: 15,
      photoUrl: rest4?.photoUrl || '/Shop/rest-4.jpg',
      provinceKh: 'ខេត្តសៀមរាប',
      provinceEn: 'Siem Reap',
      sourceName: 'VIP Partner Shop',
      sourceUrl: rest4?.mapUrl || 'https://www.google.com/maps',
      latitude: 13.3558,
      longitude: 103.8569,
    },
    {
      id: 'notif-9',
      titleKh: '🍲 មុខម្ហូបពិសេសគួរសាក៖ ឆាគ្រឿងអន្ទង់ស្លឹកម្រះព្រៅ និង ញាំមីសួរគ្រឿងសមុទ្រ',
      titleEn: '🍲 Chef Recommendation: Spicy Kroeung Eel & Glass Noodle Seafood Salad',
      titleZh: '🍲 主厨推荐食谱：圣罗勒香茅炒鳝鱼与海鲜粉丝沙拉',
      messageKh: 'ស្វែងយល់ពីវិធីចម្អិន «ឆាគ្រឿងអន្ទង់ស្លឹកម្រះព្រៅ» និង «ញាំមីសួរគ្រឿងសមុទ្របង្គាមឹក» ដែលទើបបន្ថែមរូបមន្តថ្មីក្នុងកម្មវិធី!',
      messageEn: 'Check out the authentic recipes for Spicy Holy Basil Kroeung Eel Stir-Fry and Glass Noodle Seafood Salad!',
      messageZh: '查看最新更新的“圣罗勒香茅炒鳝鱼”与“鲜虾鱿鱼粉丝沙拉”正宗高棉食谱！',
      type: 'daily_dish',
      date: getRelDate(1),
      timestampIso: getRelIso(22),
      isRead: true,
      targetType: 'food',
      targetId: food143?.id || 'food-143',
      photoUrl: food143?.photoUrl || '/foods/food-143.jpg',
      provinceKh: 'ទូទាំងប្រទេសកម្ពុជា',
      provinceEn: 'All Cambodia',
      sourceName: 'Discover Cambodia Kitchen',
      sourceUrl: 'https://en.wikipedia.org/wiki/Cambodian_cuisine',
      latitude: 11.5564,
      longitude: 104.9282,
    },
    {
      id: 'notif-10',
      titleKh: `🏛️ ទីតាំងទេសចរណ៍ប្រវត្តិសាស្ត្រ៖ ${dest104?.nameKh || 'ប្រាសាទបុរាណខ្មែរ'}`,
      titleEn: `🏛️ Heritage Spotlight: ${dest104?.nameEn || 'Ancient Khmer Temple'}`,
      titleZh: `🏛️ 历史文化古迹推荐：${dest104?.nameEn || '高棉古寺'}`,
      messageKh: `ទស្សនារូបភាពថ្មី និងព័ត៌មានផែនទី GPS នៃ «${dest104?.nameKh || 'ប្រាសាទបុរាណ'}» សម្រាប់ដំណើរកម្សាន្តចុងសប្តាហ៍របស់អ្នក។`,
      messageEn: `Explore newly updated photos and GPS route directions for "${dest104?.nameEn || 'Ancient Temple'}" for your weekend trip.`,
      messageZh: `查看最新更新的“${dest104?.nameEn || '高棉古迹'}”高清照片与周末自驾 GPS 导航路线。`,
      type: 'new_spot',
      date: getRelDate(2),
      timestampIso: getRelIso(36),
      isRead: true,
      targetType: 'destination',
      targetId: dest104?.id || 'dest-104',
      photoUrl: dest104?.photoUrl || '/destinations/dest-104.jpg',
      provinceKh: dest104?.provinceKh || 'ខេត្តសៀមរាប',
      provinceEn: dest104?.provinceEn || 'Siem Reap',
      sourceName: 'Cambodia Heritage Guide',
      sourceUrl: dest104?.mapUrl || 'https://www.google.com/maps',
      latitude: dest104?.latitude || 13.3633,
      longitude: dest104?.longitude || 103.8564,
    },
    {
      id: 'notif-11',
      titleKh: '🦀 ព្រឹត្តិការណ៍ចុងសប្តាហ៍៖ ពិធីបុណ្យគ្រឿងសមុទ្រ & ម្រេចកំពត-កែប',
      titleEn: '🦀 Weekend Event: Kampot-Kep Fresh Seafood & GI Pepper Culinary Fair',
      titleZh: '🦀 周末活动：贡布-白马鲜活海鲜与胡椒美食节',
      messageKh: 'រីករាយជាមួយការភ្លក្សម្ហូបគ្រឿងសមុទ្រស្រស់ៗ ការជិះទូកមើលថ្ងៃលិចនៅព្រែកកំពត និងប្រូម៉ូសិនកញ្ចុះមាត់ទឹក!',
      messageEn: 'Enjoy fresh crab tastings, Kampot river sunset cruises, and special discounts at waterside resorts this weekend!',
      messageZh: '本周末前往贡布与白马品尝鲜活海鲜、体验日落游船与河畔度假村特惠！',
      type: 'event',
      date: getRelDate(2),
      timestampIso: getRelIso(42),
      isRead: true,
      targetType: 'destination',
      targetId: 'dest-29',
      photoUrl: '/destinations/dest-29.jpg',
      provinceKh: 'ខេត្តកំពត',
      provinceEn: 'Kampot',
      sourceName: 'Kampot Tourism Board',
      sourceUrl: 'https://www.tourismcambodia.com',
      latitude: 10.5942,
      longitude: 104.164,
    },
    {
      id: 'notif-12',
      titleKh: '🤖 មុខងារថ្មី៖ ជំនួយការ AI ស្កេនសម្គាល់មុខម្ហូបខ្មែរ ២០០ មុខ',
      titleEn: '🤖 Upgraded Feature: AI Cambodian Food Assistant (200+ Dishes)',
      titleZh: '🤖 功能升级：AI 高棉美食识别助手（支持 200+ 道菜品）',
      messageKh: 'ឥឡូវនេះអ្នកអាចថតរូប ឬបង្ហោះរូបភាពម្ហូបខ្មែរ ដើម្បីឱ្យ AI ជួយស្វែងរកឈ្មោះម្ហូប និងរូបមន្តចម្អិនភ្លាមៗ!',
      messageEn: 'Snap or upload any Cambodian food photo to get instant ranked dish matches, confidence scores, and authentic recipes!',
      messageZh: '现在拍照或上传任何柬埔寨美食图片，即可获取 AI 菜品匹配排名、置信度评分与正宗食谱！',
      type: 'system',
      date: getRelDate(2),
      timestampIso: getRelIso(48),
      isRead: true,
      targetType: 'food',
      targetId: food149?.id || 'food-149',
      photoUrl: food149?.photoUrl || '/foods/food-149.jpg',
      provinceKh: 'ទូទាំងប្រទេសកម្ពុជា',
      provinceEn: 'All Cambodia',
      sourceName: 'Discover Cambodia Updates',
    },
  ];

  cachedNotifFoods = foods; cachedNotifRests = restaurants; cachedNotifDests = destinations; cachedNotifList = list;
  return list;
}

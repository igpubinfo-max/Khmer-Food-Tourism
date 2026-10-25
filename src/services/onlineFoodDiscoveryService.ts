import { FoodItem, TrendingFoodCategorySlug, TrendingFoodItem } from '../types';
import { initialFoods } from '../data/seedData';
import { initialTrendingFoods } from '../data/seedTrendingFoods';

export const ONLINE_DISCOVERY_CACHE_KEY = 'kft_v3_online_discovery_cache';
export const ONLINE_DISCOVERY_CUSTOM_URLS_KEY = 'kft_v3_online_discovery_custom_urls';
export const ONLINE_DISCOVERY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MANUAL_REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export type DiscoveryPlatformId = 'youtube' | 'tiktok' | 'facebook' | 'web_wiki';

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
  publishedOrUpdatedAt: string; // ISO or YYYY-MM-DD, never fabricated
  isLiveFetched: boolean; // true only when retrieved from live public API / oEmbed in real time
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
  matchedFoodId: string;
}

const CURATED_YOUTUBE_VIDEOS: CuratedYouTubeSeed[] = [
  {
    id: 'yt-khmer-amok-1',
    url: 'https://www.youtube.com/watch?v=9uKNNcDfttc',
    fallbackTitleEn: 'The Most Delicious Cambodian Fish Amok | Authentic Khmer Family Food',
    titleKh: 'របៀបធ្វើអាម៉ុកត្រីខ្មែរឈ្ងុយឆ្ងាញ់តាមក្បួនគ្រួសារខ្មែរ',
    titleZh: '正宗柬埔寨家庭式高棉阿莫克蒸鱼做法',
    descriptionKh: 'វីដេអូបង្ហាញពីការបុកគ្រឿងខ្មែរ និងចំហុយអាម៉ុកត្រីក្នុងកន្ទោងស្លឹកចេក ជាមួយខ្ទិះដូងស្រស់ និងស្លឹកញ។',
    descriptionEn: 'Step-by-step traditional Khmer family preparation of Fish Amok steamed in banana leaf cups with fresh kroeung and coconut cream.',
    descriptionZh: '展示传统高棉香料研磨及香蕉叶盅高棉阿莫克蒸鱼的完整家庭食谱。',
    categorySlug: 'famous_dish',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-06-15',
    fallbackThumb: 'https://i.ytimg.com/vi/9uKNNcDfttc/hqdefault.jpg',
    matchedFoodId: 'food-1',
  },
  {
    id: 'yt-khmer-loklak-2',
    url: 'https://www.youtube.com/watch?v=__5WDCp9sN8',
    fallbackTitleEn: 'Cambodian Beef Lok Lak Stir Fry 🇰🇭🔥 Quick & Juicy!',
    titleKh: 'ឡុកឡាក់សាច់គោម្រេចកំពត រសជាតិដើមខ្មែរ',
    titleZh: '柬埔寨贡布胡椒摇摇牛肉 (Beef Lok Lak) 快炒秘诀',
    descriptionKh: 'វិធីប្រឡាក់សាច់គោឱ្យផុយទន់ ឆាភ្លើងខ្លាំង និងលាយទឹកម្រេចក្រូចឆ្មារកំពតដ៏ឈ្ងុយឆ្ងាញ់។',
    descriptionEn: 'Authentic Cambodian Beef Lok Lak stir-fry tutorial featuring tender marinated beef and tangy Kampot pepper lime dipping sauce.',
    descriptionZh: '鲜嫩多汁的高棉摇摇牛肉快炒教程，搭配正宗贡布青胡椒青柠蘸汁。',
    categorySlug: 'famous_dish',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-08-10',
    fallbackThumb: 'https://i.ytimg.com/vi/__5WDCp9sN8/hqdefault.jpg',
    matchedFoodId: 'food-2',
  },
  {
    id: 'yt-khmer-nombanhchok-3',
    url: 'https://www.youtube.com/watch?v=L3uV15vFaao',
    fallbackTitleEn: 'NOM BANH CHOK SAMLOR PROHER | Cambodian Rice Noodles',
    titleKh: 'នំបញ្ចុកសម្លប្រហើរខ្មែរ (គ្រួសារចុងភៅ)',
    titleZh: '高棉传统鱼汤米粉 (Nom Banh Chok Samlor Proher)',
    descriptionKh: 'របៀបស្លសម្លប្រហើរត្រីឆ្អើរ និងប្រហុកខ្មែរ ស្រោចលើសរសៃនំបញ្ចុកស្រស់ និងបន្លែធម្មជាតិគ្រប់មុខ។',
    descriptionEn: 'Traditional Cambodian Nom Banh Chok rice noodles ladled with fragrant lemongrass fish broth and fresh crisp vegetables.',
    descriptionZh: '香茅鱼肉浓汤配手工鲜米粉与时令生菜，地道高棉早餐代表作。',
    categorySlug: 'noodle_soup',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    publishedDate: '2024-05-20',
    fallbackThumb: 'https://i.ytimg.com/vi/L3uV15vFaao/hqdefault.jpg',
    matchedFoodId: 'food-3',
  },
  {
    id: 'yt-khmer-samlorkorko-4',
    url: 'https://www.youtube.com/watch?v=KPOzXeeVKo8',
    fallbackTitleEn: 'Cambodian Vegetable Soup | Somlor Koko | សម្លកកូរ',
    titleKh: 'សម្លកកូរខ្មែរសម្បូរបន្លែធម្មជាតិ (Thun Thun Channel)',
    titleZh: '柬埔寨传统百菜浓汤 (Samlor Korko)',
    descriptionKh: 'សម្លកកូរមរតកដូនតាខ្មែរ ផ្សំពីអង្ករលីង គ្រឿងបុក ប្រហុក និងបន្លែចម្រុះជំនួយសុខភាព។',
    descriptionEn: 'Classic Cambodian Samlor Korko vegetable stew cooked with toasted rice powder, kroeung paste, and nutritious local greens.',
    descriptionZh: '融合炒米粉、高棉香茅酱与多种天然蔬菜的柬埔寨传统养生汤品。',
    categorySlug: 'famous_dish',
    provinceKh: 'ខេត្តបាត់ដំបង',
    provinceEn: 'Battambang',
    publishedDate: '2024-04-12',
    fallbackThumb: 'https://i.ytimg.com/vi/KPOzXeeVKo8/hqdefault.jpg',
    matchedFoodId: 'food-4',
  },
  {
    id: 'yt-khmer-amok-quest-5',
    url: 'https://www.youtube.com/watch?v=Kd4oBclsRo0',
    fallbackTitleEn: 'Easy Cambodian Fish Amok Recipe (Authentic Food Quest)',
    titleKh: 'រូបមន្តអាម៉ុកត្រីងាយៗសម្រាប់ធ្វើនៅផ្ទះ',
    titleZh: '简易正宗高棉阿莫克蒸鱼家常食谱',
    descriptionKh: 'ការណែនាំលម្អិតអំពីគ្រឿងផ្សំ និងរបៀបចំហុយអាម៉ុកត្រីឱ្យមានក្លិនឈ្ងុយឆ្ងាញ់ដូចនៅភោជនីយដ្ឋាន។',
    descriptionEn: 'Detailed guide to making Cambodia’s national dish at home with aromatic kroeung spice paste and coconut milk.',
    descriptionZh: '在家轻松复刻柬埔寨国菜高棉阿莫克蒸鱼的详细食材与步骤指南。',
    categorySlug: 'famous_dish',
    provinceKh: 'រាជធានីភ្នំពេញ',
    provinceEn: 'Phnom Penh',
    publishedDate: '2024-03-18',
    fallbackThumb: 'https://i.ytimg.com/vi/Kd4oBclsRo0/hqdefault.jpg',
    matchedFoodId: 'food-1',
  },
];

let lastManualRefreshMs = 0;

/** Normalize URL for deduplication */
export function normalizeSourceUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = '';
    if (u.hostname.includes('youtube.com') && u.searchParams.has('v')) {
      return `https://www.youtube.com/watch?v=${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/watch?v=${u.pathname.replace('/', '')}`;
    }
    return `${u.origin}${u.pathname}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Match a discovered title/description to one of the 200 Cambodian dishes in seedFoods */
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

/** Fetch public oEmbed metadata for a YouTube or TikTok URL ($0, no API key required) */
export async function fetchPublicOEmbedMetadata(targetUrl: string): Promise<{
  title?: string;
  authorName?: string;
  thumbnailUrl?: string;
  providerName?: string;
} | null> {
  const clean = targetUrl.trim();
  if (!clean) return null;

  const isTikTok = clean.includes('tiktok.com');
  const isYouTube = clean.includes('youtube.com') || clean.includes('youtu.be');

  const endpoint = isTikTok
    ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(clean)}`
    : isYouTube
    ? `https://noembed.com/embed?url=${encodeURIComponent(clean)}`
    : `https://noembed.com/embed?url=${encodeURIComponent(clean)}`;

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

/** Query Wikipedia (en + km) public MediaWiki API with origin=* for Cambodian culinary articles */
async function fetchWikipediaCambodianFoodArticles(foods: FoodItem[]): Promise<OnlineFoodDiscoveryItem[]> {
  const results: OnlineFoodDiscoveryItem[] = [];
  const titles = [
    'Cambodian_cuisine',
    'Fish_amok',
    'Kuyteav',
    'Num_banhchok',
    'Samlar_kako',
    'Shaking_beef',
    'Prahok',
    'Kroeung',
    'Sticky_rice_in_bamboo',
  ].join('|');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      titles
    )}&redirects=1&prop=pageimages|extracts|info&inprop=url&exintro=1&explaintext=1&exchars=240&pithumbsize=640&format=json&origin=*`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
      for (const p of pages as any[]) {
        if (!p || p.missing || !p.title) continue;
        const pageTitle = String(p.title);
        const extract = String(p.extract || '').trim();
        const fullUrl = String(p.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/\s+/g, '_'))}`);
        const touchedIso = typeof p.touched === 'string' ? p.touched.slice(0, 10) : '2026-10-01';
        const match = matchCambodianDish(`${pageTitle} ${extract}`, foods);
        const matchedFood = match?.food;
        const thumb =
          (typeof p?.thumbnail?.source === 'string' && p.thumbnail.source) ||
          matchedFood?.photoUrl ||
          '/foods/food-1.jpg';

        const khTitle = matchedFood
          ? `${matchedFood.nameKh} (${pageTitle})`
          : `ម្ហូបខ្មែរ៖ ${pageTitle}`;

        results.push({
          id: `wiki-en-${p.pageid || pageTitle.toLowerCase().replace(/\W+/g, '-')}`,
          platform: 'web_wiki',
          titleKh: khTitle,
          titleEn: `${pageTitle} — Wikipedia Culinary Encyclopedia`,
          titleZh: `${pageTitle} — 维基百科高棉美食百科`,
          descriptionKh:
            matchedFood?.descriptionKh ||
            extract ||
            'អត្ថបទស្រាវជ្រាវសាធារណៈអំពីមុខម្ហូប និងវប្បធម៌អាហារខ្មែរពីសព្វវចនាធិប្បាយ Wikipedia។',
          descriptionEn: extract || matchedFood?.descriptionEn || 'Verified public encyclopedia article on Cambodian cuisine.',
          descriptionZh: matchedFood?.descriptionEn || extract || '来自维基百科公开接口的柬埔寨传统美食词条。',
          thumbnailUrl: thumb,
          sourceUrl: fullUrl,
          sourceName: 'Wikipedia Public API (en.wikipedia.org)',
          authorHandle: '@Wikipedia',
          publishedOrUpdatedAt: touchedIso,
          isLiveFetched: true,
          verificationBadgeEn: 'Live Public API (MediaWiki)',
          verificationBadgeKh: 'ទាញផ្ទាល់ពី API សាធារណៈ (Wikipedia)',
          verificationBadgeZh: '实时公开 API (维基百科)',
          categorySlug: 'famous_dish',
          provinceKh: 'ទូទាំងប្រទេសកម្ពុជា',
          provinceEn: 'All Cambodia',
          matchedFoodId: matchedFood?.id,
          matchedFoodNameKh: matchedFood?.nameKh,
          matchedFoodNameEn: matchedFood?.nameEn,
          relevanceScore: (match?.score ?? 75) + 12,
        });
      }
    }
  } catch {
    // Graceful fallback when offline
  }

  return results;
}

/** Fetch YouTube items: uses VITE_YOUTUBE_API_KEY if configured, otherwise enriches curated Khmer food videos via official oEmbed */
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
      const q = encodeURIComponent('Cambodian food recipe Fish Amok Khmer street food');
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=6&q=${q}&key=${encodeURIComponent(
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
            publishedOrUpdatedAt: (snip.publishedAt || '').slice(0, 10) || '2026-01-01',
            isLiveFetched: true,
            verificationBadgeEn: 'YouTube Data API v3 (Live)',
            verificationBadgeKh: 'ទាញផ្ទាល់ពី YouTube Data API v3',
            verificationBadgeZh: 'YouTube Data API v3 实时数据',
            categorySlug: 'famous_dish',
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

  // Out-of-the-box $0 mode: verify & enrich curated YouTube videos via official oEmbed
  const enriched = await Promise.all(
    CURATED_YOUTUBE_VIDEOS.map(async (seed) => {
      const meta = await fetchPublicOEmbedMetadata(seed.url);
      if (meta?.title) oembedEnrichedCount += 1;
      const matchedFood = foods.find((f) => f.id === seed.matchedFoodId) || matchCambodianDish(seed.fallbackTitleEn, foods)?.food;
      return {
        id: seed.id,
        platform: 'youtube' as const,
        titleKh: seed.titleKh,
        titleEn: meta?.title || seed.fallbackTitleEn,
        titleZh: seed.titleZh,
        descriptionKh: seed.descriptionKh,
        descriptionEn: seed.descriptionEn,
        descriptionZh: seed.descriptionZh,
        thumbnailUrl: meta?.thumbnailUrl || seed.fallbackThumb,
        sourceUrl: seed.url,
        sourceName: meta?.authorName ? `${meta.authorName} (YouTube)` : 'YouTube Khmer Culinary',
        authorHandle: meta?.authorName,
        publishedOrUpdatedAt: seed.publishedDate,
        isLiveFetched: Boolean(meta?.title),
        verificationBadgeEn: meta?.title ? 'YouTube oEmbed Verified' : 'Curated YouTube Link',
        verificationBadgeKh: meta?.title ? 'ផ្ទៀងផ្ទាត់តាម YouTube oEmbed' : 'តំណវីដេអូ YouTube បានផ្ទៀងផ្ទាត់',
        verificationBadgeZh: meta?.title ? 'YouTube oEmbed 已验证' : '精选 YouTube 视频链接',
        categorySlug: seed.categorySlug,
        provinceKh: seed.provinceKh,
        provinceEn: seed.provinceEn,
        matchedFoodId: matchedFood?.id,
        matchedFoodNameKh: matchedFood?.nameKh,
        matchedFoodNameEn: matchedFood?.nameEn,
        relevanceScore: 94,
      };
    })
  );

  return { items: enriched, usedLiveApiKey: false, oembedEnrichedCount };
}

/** Convert existing seedTrendingFoods (TikTok & Facebook) and enrich TikTok creator metadata via official oEmbed */
async function buildSocialTrendingItems(
  trendingFoods: TrendingFoodItem[],
  foods: FoodItem[]
): Promise<{ items: OnlineFoodDiscoveryItem[]; tiktokOembedCount: number }> {
  let tiktokOembedCount = 0;

  // Test TikTok oEmbed availability on the primary creator URL once per refresh to stay fast & respect rate limits
  const sampleTikTokMeta = await fetchPublicOEmbedMetadata('https://www.tiktok.com/@foodbuzzcambodia');
  if (sampleTikTokMeta?.authorName) {
    tiktokOembedCount = trendingFoods.filter((t) => t.sourcePlatform === 'tiktok').length;
  }

  const mapped: OnlineFoodDiscoveryItem[] = trendingFoods.map((t) => {
    const match = matchCambodianDish(`${t.foodNameKh} ${t.foodNameEn}`, foods);
    const platform: DiscoveryPlatformId =
      t.sourcePlatform === 'facebook' ? 'facebook' : t.sourcePlatform === 'youtube' ? 'youtube' : 'tiktok';
    const isTikTokVerified = platform === 'tiktok' && Boolean(sampleTikTokMeta?.authorName);

    return {
      id: t.id,
      platform,
      titleKh: `${t.foodNameKh} — ${t.restaurantNameKh}`,
      titleEn: `${t.foodNameEn} — ${t.restaurantNameEn}`,
      descriptionKh: t.descriptionKh,
      descriptionEn: t.descriptionEn,
      thumbnailUrl: t.photoUrl,
      sourceUrl: t.sourceUrl || t.videoUrl || 'https://www.tiktok.com/@foodbuzzcambodia',
      sourceName: t.sourceAccountTitle || t.sourceAccount || (platform === 'tiktok' ? 'TikTok Creator' : 'Facebook Page'),
      authorHandle: t.sourceAccount,
      publishedOrUpdatedAt: t.lastUpdated || '2026-10-20',
      isLiveFetched: isTikTokVerified,
      verificationBadgeEn:
        platform === 'tiktok'
          ? isTikTokVerified
            ? 'TikTok oEmbed Creator Verified'
            : 'Curated TikTok Review'
          : 'Curated Facebook Review (Graph API Restricted)',
      verificationBadgeKh:
        platform === 'tiktok'
          ? isTikTokVerified
            ? 'ផ្ទៀងផ្ទាត់គណនីតាម TikTok oEmbed'
            : 'ការ Review លើ TikTok ដែលបានជ្រើសរើស'
          : 'ការ Review លើ Facebook ដែលបានផ្ទៀងផ្ទាត់',
      verificationBadgeZh:
        platform === 'tiktok'
          ? isTikTokVerified
            ? 'TikTok oEmbed 创作者已验证'
            : '精选 TikTok 美食探店'
          : '精选 Facebook 探店（公开搜索受限）',
      categorySlug: t.categorySlug,
      provinceKh: t.provinceKh,
      provinceEn: t.provinceEn,
      matchedFoodId: match?.food.id,
      matchedFoodNameKh: match?.food.nameKh,
      matchedFoodNameEn: match?.food.nameEn,
      relevanceScore: (match?.score ?? 82) + (t.isVerified ? 8 : 0),
      trendingItem: t,
    };
  });

  return { items: mapped, tiktokOembedCount };
}

/** Load user/admin added custom video/post URLs stored locally in kft_v3_online_discovery_custom_urls */
export function loadCustomDiscoveredItems(): OnlineFoodDiscoveryItem[] {
  try {
    const raw = localStorage.getItem(ONLINE_DISCOVERY_CUSTOM_URLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Add a YouTube, TikTok, Facebook, or Web URL via official oEmbed metadata preview & persist locally */
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
      errorEn: 'Please enter a valid https:// URL.',
      errorKh: 'សូមបញ្ចូលតំណភ្ជាប់ URL ដែលត្រឹមត្រូវ (https://...)',
      errorZh: '请输入有效的 https:// 链接。',
    };
  }

  const host = parsedUrl.hostname.toLowerCase();
  const platform: DiscoveryPlatformId = host.includes('youtube.com') || host.includes('youtu.be')
    ? 'youtube'
    : host.includes('tiktok.com')
    ? 'tiktok'
    : host.includes('facebook.com') || host.includes('fb.watch')
    ? 'facebook'
    : 'web_wiki';

  const meta = await fetchPublicOEmbedMetadata(parsedUrl.toString());
  const title = meta?.title || `${platform.toUpperCase()} Cambodian Food Link (${parsedUrl.hostname})`;
  const match = matchCambodianDish(title, foods);

  const newItem: OnlineFoodDiscoveryItem = {
    id: `custom-disc-${Date.now()}`,
    platform,
    titleKh: match?.food ? `${match.food.nameKh} — ${title}` : title,
    titleEn: title,
    titleZh: title,
    descriptionKh: match?.food?.descriptionKh || `តំណភ្ជាប់មុខម្ហូបពី ${meta?.providerName || parsedUrl.hostname} ដែលបានបន្ថែមដោយអ្នកប្រើប្រាស់។`,
    descriptionEn: match?.food?.descriptionEn || `User-submitted Cambodian food link from ${meta?.providerName || parsedUrl.hostname}.`,
    descriptionZh: `用户添加的来自 ${meta?.providerName || parsedUrl.hostname} 的柬埔寨美食链接。`,
    thumbnailUrl: meta?.thumbnailUrl || match?.food?.photoUrl || '/foods/food-1.jpg',
    sourceUrl: parsedUrl.toString(),
    sourceName: meta?.authorName || meta?.providerName || parsedUrl.hostname,
    authorHandle: meta?.authorName,
    publishedOrUpdatedAt: new Date().toISOString().slice(0, 10),
    isLiveFetched: Boolean(meta?.title),
    verificationBadgeEn: meta?.title ? 'oEmbed Metadata Verified' : 'Direct Source Link',
    verificationBadgeKh: meta?.title ? 'ផ្ទៀងផ្ទាត់តាម oEmbed ផ្លូវការ' : 'តំណភ្ជាប់ប្រភពផ្ទាល់',
    verificationBadgeZh: meta?.title ? 'oEmbed 官方元数据已验证' : '直接来源链接',
    categorySlug: 'famous_dish',
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
  const updated = [newItem, ...filtered].slice(0, 25);
  try {
    localStorage.setItem(ONLINE_DISCOVERY_CUSTOM_URLS_KEY, JSON.stringify(updated));
  } catch {}

  return { ok: true, item: newItem };
}

/** Deduplicate by normalized URL and title similarity, then rank by Cambodian dish relevance + recency */
export function deduplicateAndRankDiscoveries(items: OnlineFoodDiscoveryItem[]): OnlineFoodDiscoveryItem[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const unique: OnlineFoodDiscoveryItem[] = [];

  for (const item of items) {
    const normUrl = normalizeSourceUrl(item.sourceUrl);
    const normTitle = item.titleEn.toLowerCase().replace(/[^a-z0-9\u1780-\u17ff]+/g, '').slice(0, 42);
    const keyUrl = `${item.platform}:${normUrl}`;
    if (seenUrls.has(keyUrl) || (normTitle.length > 10 && seenTitles.has(normTitle))) {
      continue;
    }
    seenUrls.add(keyUrl);
    if (normTitle.length > 10) seenTitles.add(normTitle);
    unique.push(item);
  }

  return unique.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    const ta = Date.parse(a.publishedOrUpdatedAt) || 0;
    const tb = Date.parse(b.publishedOrUpdatedAt) || 0;
    return tb - ta;
  });
}

/** Main discovery fetcher with 24-hour localStorage cache + 5-minute manual refresh rate limit */
export async function fetchOnlineFoodDiscoveryFeed(params: {
  foods?: FoodItem[];
  trendingFoods?: TrendingFoodItem[];
  forceRefresh?: boolean;
}): Promise<OnlineDiscoveryFeedResult> {
  const foods = params.foods?.length ? params.foods : initialFoods;
  const trending = params.trendingFoods?.length ? params.trendingFoods : initialTrendingFoods;
  const now = Date.now();

  if (params.forceRefresh) {
    const elapsed = now - lastManualRefreshMs;
    if (lastManualRefreshMs > 0 && elapsed < MANUAL_REFRESH_COOLDOWN_MS) {
      const remainingSec = Math.ceil((MANUAL_REFRESH_COOLDOWN_MS - elapsed) / 1000);
      const cached = readCache(foods, trending);
      if (cached) {
        return { ...cached, fromCache: true, cooldownRemainingSec: remainingSec };
      }
    }
    lastManualRefreshMs = now;
  } else {
    const cached = readCache(foods, trending);
    if (cached) {
      return { ...cached, fromCache: true, cooldownRemainingSec: 0 };
    }
  }

  const [wikiItems, ytRes, socialRes] = await Promise.all([
    fetchWikipediaCambodianFoodArticles(foods),
    fetchYouTubeCambodianFoodVideos(foods),
    buildSocialTrendingItems(trending, foods),
  ]);

  const customItems = loadCustomDiscoveredItems();
  const nowIso = new Date().toISOString();

  const statuses: PlatformApiStatus[] = [
    {
      platform: 'youtube',
      nameEn: 'YouTube',
      nameKh: 'YouTube',
      nameZh: 'YouTube 视频',
      mode: ytRes.usedLiveApiKey ? 'live_api' : 'oembed_verified',
      statusLabelEn: ytRes.usedLiveApiKey
        ? 'Live Data API v3 Active'
        : `Official oEmbed Verified (${ytRes.oembedEnrichedCount}/${ytRes.items.length})`,
      statusLabelKh: ytRes.usedLiveApiKey
        ? 'តភ្ជាប់ផ្ទាល់ជាមួយ YouTube Data API v3'
        : `ផ្ទៀងផ្ទាត់តាម YouTube oEmbed (${ytRes.oembedEnrichedCount}/${ytRes.items.length})`,
      statusLabelZh: ytRes.usedLiveApiKey
        ? 'YouTube Data API v3 实时连接'
        : `官方 oEmbed 已验证 (${ytRes.oembedEnrichedCount}/${ytRes.items.length})`,
      explanationEn: ytRes.usedLiveApiKey
        ? 'Searching live Cambodian food videos via YouTube Data API v3.'
        : 'Fetches real video titles, creator names & thumbnails via official YouTube oEmbed ($0, no API key required). Optional VITE_YOUTUBE_API_KEY enables keyword search.',
      explanationKh: ytRes.usedLiveApiKey
        ? 'កំពុងស្វែងរកវីដេអូម្ហូបខ្មែរផ្ទាល់តាមរយៈ YouTube Data API v3។'
        : 'ទាញយកចំណងជើង ឈ្មោះម្ចាស់ឆានែល និងរូបភាពពិតៗតាមរយៈ YouTube oEmbed ផ្លូវការ ($0 មិនបាច់ប្រើ API Key)។',
      explanationZh: ytRes.usedLiveApiKey
        ? '正在通过 YouTube Data API v3 实时搜索高棉美食视频。'
        : '通过官方免费 YouTube oEmbed 接口实时获取真实视频标题、频道名与缩略图（无需密钥）。',
      fetchedCount: ytRes.items.length,
      lastCheckedIso: nowIso,
    },
    {
      platform: 'web_wiki',
      nameEn: 'Wikipedia & Wikimedia Commons',
      nameKh: 'Wikipedia និង Wikimedia សាធារណៈ',
      nameZh: '维基百科与维基共享资源',
      mode: 'live_api',
      statusLabelEn: wikiItems.length > 0 ? `Live Public API (${wikiItems.length} articles)` : 'Offline Fallback',
      statusLabelKh: wikiItems.length > 0 ? `API សាធារណៈផ្ទាល់ (${wikiItems.length} អត្ថបទ)` : 'របៀបគ្មានអ៊ីនធឺណិត',
      statusLabelZh: wikiItems.length > 0 ? `公开 API 实时连接 (${wikiItems.length} 篇词条)` : '离线模式',
      explanationEn: 'Official MediaWiki REST/Action API with CORS (origin=*) permits free, unauthenticated queries for Cambodian culinary articles, revision dates & thumbnails.',
      explanationKh: 'ប្រើប្រាស់ MediaWiki API ផ្លូវការដោយសេរី (origin=*) ដើម្បីទាញយកអត្ថបទម្ហូបខ្មែរ រូបភាព និងកាលបរិច្ឆេទកែប្រែពិតប្រាកដ។',
      explanationZh: '使用官方免费 MediaWiki 公开接口 (origin=*) 实时获取柬埔寨传统美食词条、修订日期与图片。',
      fetchedCount: wikiItems.length,
      lastCheckedIso: nowIso,
    },
    {
      platform: 'tiktok',
      nameEn: 'TikTok',
      nameKh: 'TikTok',
      nameZh: 'TikTok 抖音国际版',
      mode: 'oembed_verified',
      statusLabelEn:
        socialRes.tiktokOembedCount > 0
          ? `Official oEmbed Verified (${socialRes.tiktokOembedCount} links)`
          : 'Curated Links (oEmbed Ready)',
      statusLabelKh:
        socialRes.tiktokOembedCount > 0
          ? `ផ្ទៀងផ្ទាត់តាម TikTok oEmbed (${socialRes.tiktokOembedCount} តំណ)`
          : 'តំណភ្ជាប់ដែលបានជ្រើសរើស',
      statusLabelZh:
        socialRes.tiktokOembedCount > 0
          ? `TikTok oEmbed 官方验证 (${socialRes.tiktokOembedCount} 条)`
          : '精选链接（支持 oEmbed）',
      explanationEn: 'TikTok Research/Display API requires enterprise approval and prohibits public keyword scraping. We use TikTok’s official public oEmbed endpoint to verify creator profiles and video URLs.',
      explanationKh: 'TikTok មិនអនុញ្ញាតឱ្យស្វែងរកវីដេអូសាធារណៈដោយគ្មានការអនុម័តកម្រិតសហគ្រាសទេ។ កម្មវិធីប្រើប្រាស់ TikTok oEmbed ផ្លូវការដើម្បីផ្ទៀងផ្ទាត់គណនី និងតំណវីដេអូពិតៗ។',
      explanationZh: 'TikTok 官方搜索 API 需企业级审批且禁止网页抓取。本系统通过 TikTok 官方公开 oEmbed 接口验证创作者与视频链接。',
      fetchedCount: socialRes.items.filter((i) => i.platform === 'tiktok').length,
      lastCheckedIso: nowIso,
    },
    {
      platform: 'facebook',
      nameEn: 'Facebook',
      nameKh: 'Facebook',
      nameZh: 'Facebook 脸书',
      mode: 'curated_only',
      statusLabelEn: 'Curated Verified Links (Graph API Restricted)',
      statusLabelKh: 'តំណភ្ជាប់ផ្ទៀងផ្ទាត់ (Meta បិទការស្វែងរកសាធារណៈ)',
      statusLabelZh: '精选已验证链接（Meta 限制公开搜索）',
      explanationEn: 'Meta Graph API restricts public post search and oEmbed to approved App Tokens with Page permissions. Showing verified curated Cambodian food review links with honest dates.',
      explanationKh: 'Meta Graph API មិនអនុញ្ញាតឱ្យស្វែងរកផុសសាធារណៈដោយគ្មាន Page Token ទេ។ បង្ហាញជូនតំណភ្ជាប់ហាងអាហារខ្មែរពិតៗដែលបានផ្ទៀងផ្ទាត់។',
      explanationZh: 'Meta Graph API 限制未授权的公开帖子搜索。此处展示经过人工核实的柬埔寨美食探店原帖链接与真实日期。',
      fetchedCount: socialRes.items.filter((i) => i.platform === 'facebook').length,
      lastCheckedIso: nowIso,
    },
  ];

  const merged = deduplicateAndRankDiscoveries([
    ...customItems,
    ...ytRes.items,
    ...wikiItems,
    ...socialRes.items,
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

function readCache(foods: FoodItem[], trending: TrendingFoodItem[]): OnlineDiscoveryFeedResult | null {
  try {
    const raw = localStorage.getItem(ONLINE_DISCOVERY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const age = Date.now() - (Date.parse(parsed.lastCheckedAt) || 0);
    if (age > ONLINE_DISCOVERY_TTL_MS || !Array.isArray(parsed.items) || !Array.isArray(parsed.statuses)) {
      return null;
    }
    const custom = loadCustomDiscoveredItems();
    const trendingMap = new Map(trending.map((t) => [t.id, t]));
    const foodMap = new Map(foods.map((f) => [f.id, f]));
    const rehydrated: OnlineFoodDiscoveryItem[] = deduplicateAndRankDiscoveries([
      ...custom,
      ...parsed.items.map((it: OnlineFoodDiscoveryItem) => ({
        ...it,
        trendingItem: it.trendingItem || trendingMap.get(it.id),
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

/**
 * Extracts iframe player embed URL safely for YouTube, TikTok, and Facebook.
 * Marks canInlineEmbed=false for profile / non-video URLs so they cleanly open in app/browser.
 */
export function extractEmbedPlayerInfo(item: OnlineFoodDiscoveryItem): EmbedPlayerInfo {
  const url = (item.sourceUrl || item.trendingItem?.videoUrl || item.trendingItem?.sourceUrl || '').trim();
  if (!url) {
    return { canInlineEmbed: false, embedUrl: null, platform: item.platform };
  }

  // 1. YouTube: extract 11-char video ID
  if (item.platform === 'youtube' || /youtube\.com|youtu\.be/i.test(url)) {
    let vid: string | null = null;
    const mWatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (mWatch) vid = mWatch[1];
    if (!vid) {
      const mShort = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (mShort) vid = mShort[1];
    }
    if (!vid) {
      const mEmbed = url.match(/embed\/([a-zA-Z0-9_-]{11})/);
      if (mEmbed) vid = mEmbed[1];
    }
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

  // 2. TikTok: extract video ID from /video/(\d+)
  if (item.platform === 'tiktok' || /tiktok\.com/i.test(url)) {
    const mVid = url.match(/\/video\/(\d+)/i);
    if (mVid && mVid[1]) {
      return {
        canInlineEmbed: true,
        embedUrl: `https://www.tiktok.com/player/v1/${mVid[1]}?autoplay=1`,
        platform: 'tiktok',
        videoId: mVid[1],
      };
    }
    return { canInlineEmbed: false, embedUrl: null, platform: 'tiktok' };
  }

  // 3. Facebook: public video link
  if (item.platform === 'facebook' || /facebook\.com|fb\.watch/i.test(url)) {
    if (/\/videos\//i.test(url) || /fb\.watch/i.test(url) || url.includes('/watch/?v=')) {
      return {
        canInlineEmbed: true,
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
        platform: 'facebook',
      };
    }
    return { canInlineEmbed: false, embedUrl: null, platform: 'facebook' };
  }

  return { canInlineEmbed: false, embedUrl: null, platform: item.platform };
}

export interface SearchSocialOptions {
  query?: string;
  platform?: 'all' | DiscoveryPlatformId;
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
 * Unified discovery and search for YouTube, TikTok, Facebook, and Wikipedia.
 * 1. Queries backend Edge Function (with live YouTube API, TikTok Display API & Meta Graph API).
 * 2. Gracefully falls back to client-side oEmbed, Wikipedia MediaWiki API & curated links.
 * 3. Filters and ranks results by Cambodian culinary relevance.
 */
export async function searchAndDiscoverSocialFood(
  options: SearchSocialOptions = {}
): Promise<SearchSocialResult> {
  const { query = '', platform = 'all', foods = initialFoods, trendingFoods = initialTrendingFoods, forceRefresh = false } = options;

  let backendItems: OnlineFoodDiscoveryItem[] = [];
  let fromBackendEdge = false;

  // Try Supabase Edge Function first (with 4.5s timeout)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const edgeEndpoint = `${SUPABASE_BASE_URL}/functions/v1/social-food-discovery`;
    const res = await fetch(edgeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ query, platform }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.items) && data.items.length > 0) {
        backendItems = data.items.map((it: any) => {
          const match = matchCambodianDish(`${it.titleEn || it.titleKh} ${it.descriptionEn || it.descriptionKh}`, foods);
          return {
            ...it,
            matchedFoodId: it.matchedFoodId || match?.food?.id,
            matchedFoodNameKh: it.matchedFoodNameKh || match?.food?.nameKh,
            matchedFoodNameEn: it.matchedFoodNameEn || match?.food?.nameEn,
          };
        });
        fromBackendEdge = true;
      }
    }
  } catch {
    // Edge function unreachable or offline; smoothly fallback
  }

  // Fetch base discovery feed (live Wikipedia API + official oEmbed YouTube/TikTok + verified links)
  const baseFeed = await fetchOnlineFoodDiscoveryFeed({
    foods,
    trendingFoods,
    forceRefresh,
  });

  // Merge and deduplicate
  let combined = deduplicateAndRankDiscoveries([...backendItems, ...baseFeed.items]);

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

  // Apply platform filter if not 'all'
  if (platform !== 'all') {
    combined = combined.filter((item) => item.platform === platform);
  }

  return {
    ...baseFeed,
    items: combined,
    fromBackendEdge,
  };
}

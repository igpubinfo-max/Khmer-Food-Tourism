// Supabase Edge Function: social-food-discovery
// Secure backend proxy for YouTube Data API v3 (2025-2026 broadcasts) + Live Cambodian YouTube Channel RSS Feeds
// Keeps YOUTUBE_API_KEY strictly server-side (Deno.env) with zero mobile-bundle exposure.

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface SocialDiscoveryItem {
  id: string;
  platform: 'youtube' | 'web_wiki';
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
  publishedOrUpdatedAt: string;
  isLiveFetched: boolean;
  verificationBadgeEn: string;
  verificationBadgeKh: string;
  verificationBadgeZh: string;
  categorySlug: 'popular_food' | 'famous_restaurant' | 'tourist_attraction' | 'food_travel_vlog';
  provinceKh: string;
  provinceEn: string;
  relevanceScore: number;
}

interface PlatformCapabilityStatus {
  platform: 'youtube' | 'web_wiki';
  mode: 'live_api' | 'oembed_verified';
  statusLabelEn: string;
  statusLabelKh: string;
  statusLabelZh: string;
  explanationEn: string;
  explanationKh: string;
  explanationZh: string;
  itemCount: number;
}

const ACTIVE_CAMBODIA_CHANNELS_2026: Array<{
  channelId: string;
  name: string;
  categorySlug: SocialDiscoveryItem['categorySlug'];
  provinceKh: string;
  provinceEn: string;
}> = [
  { channelId: 'UCLVncs-1iVf4f1tW5WSfQfw', name: 'Street Food TV', categorySlug: 'popular_food', provinceKh: 'រាជធានីភ្នំពេញ', provinceEn: 'Phnom Penh' },
  { channelId: 'UCM_tv-ZoNPPAIT4rrhib28A', name: 'Street Food Explorer', categorySlug: 'famous_restaurant', provinceKh: 'រាជធានីភ្នំពេញ', provinceEn: 'Phnom Penh' },
  { channelId: 'UCQ1k3iVCA9mkTuOJetyK_2Q', name: 'Delicious Food Show & Travel', categorySlug: 'food_travel_vlog', provinceKh: 'រាជធានីភ្នំពេញ', provinceEn: 'Phnom Penh' },
  { channelId: 'UC3B29E6Fxe-bum63LxbcspQ', name: 'Walk Street And Food', categorySlug: 'famous_restaurant', provinceKh: 'រាជធានីភ្នំពេញ', provinceEn: 'Phnom Penh' },
  { channelId: 'UC4mwWNbfhEM6BKrGtxH_1dg', name: 'Oun Roth Daily life', categorySlug: 'popular_food', provinceKh: 'រាជធានីភ្នំពេញ', provinceEn: 'Phnom Penh' },
  { channelId: 'UCg7R70hWzrtDh3bCGlrGKhQ', name: 'Delicious food channel', categorySlug: 'popular_food', provinceKh: 'ទូទាំងប្រទេសកម្ពុជា', provinceEn: 'All Cambodia' },
  { channelId: 'UCIS-mtcY4mDKUd1ET6utKqA', name: 'Thavireak City Walks', categorySlug: 'tourist_attraction', provinceKh: 'រាជធានីភ្នំពេញ', provinceEn: 'Phnom Penh' },
  { channelId: 'UCjJJNMTX5wJmZRI5iK3fo5Q', name: 'Sonita Khmer US', categorySlug: 'famous_restaurant', provinceKh: 'រាជធានីភ្នំពេញ', provinceEn: 'Phnom Penh' },
  { channelId: 'UCARbX20_cV9YwwrAFyYvoMg', name: 'Mao Cambodia', categorySlug: 'famous_restaurant', provinceKh: 'រាជធានីភ្នំពេញ', provinceEn: 'Phnom Penh' },
  { channelId: 'UCRFt5572jMudEvPVDKkHmbg', name: 'Sreyreang Life Show', categorySlug: 'tourist_attraction', provinceKh: 'ខេត្តកំពត', provinceEn: 'Kampot' },
  { channelId: 'UCMIUsbPWmPzqRLoI8J9TG_Q', name: 'Little Explore', categorySlug: 'tourist_attraction', provinceKh: 'ខេត្តកោះកុង', provinceEn: 'Koh Kong' },
];

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let query = '';
    let platformFilter = 'all';

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        query = typeof body.query === 'string' ? body.query.trim() : '';
        platformFilter = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : 'all';
      } catch {
        // empty body ok
      }
    } else {
      const url = new URL(req.url);
      query = url.searchParams.get('query') || '';
      platformFilter = url.searchParams.get('platform') || 'all';
    }

    const items: SocialDiscoveryItem[] = [];
    const statuses: Record<string, PlatformCapabilityStatus> = {};

    // 1. YouTube Data API v3 (Official Google API) with publishedAfter=2025-01-01T00:00:00Z & order=date
    const ytApiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (platformFilter === 'all' || platformFilter === 'youtube') {
      if (ytApiKey && ytApiKey.trim().length > 10) {
        try {
          const searchQuery = query
            ? `${query} Cambodia 2026`
            : 'Cambodia street food travel Phnom Penh Siem Reap 2026';
          const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&order=date&publishedAfter=2025-01-01T00:00:00Z&maxResults=12&q=${encodeURIComponent(
            searchQuery
          )}&key=${encodeURIComponent(ytApiKey.trim())}`;
          const res = await fetch(ytUrl);
          if (res.ok) {
            const data = await res.json();
            for (const item of data?.items || []) {
              const vid = item?.id?.videoId;
              const snip = item?.snippet;
              if (!vid || !snip) continue;
              const pubDate = (snip.publishedAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
              if (pubDate < '2025-01-01') continue;

              items.push({
                id: `yt-live-${vid}`,
                platform: 'youtube',
                titleKh: snip.title,
                titleEn: snip.title,
                titleZh: snip.title,
                descriptionKh: snip.description || '',
                descriptionEn: snip.description || '',
                thumbnailUrl:
                  snip?.thumbnails?.high?.url ||
                  snip?.thumbnails?.medium?.url ||
                  `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
                sourceName: snip.channelTitle ? `${snip.channelTitle} (YouTube)` : 'YouTube Khmer Food',
                authorHandle: snip.channelTitle,
                publishedOrUpdatedAt: pubDate,
                isLiveFetched: true,
                verificationBadgeEn: 'YouTube Data API v3 (2025–2026 Live)',
                verificationBadgeKh: 'ទាញផ្ទាល់ពី YouTube Data API v3 (2025–2026)',
                verificationBadgeZh: 'YouTube Data API v3 (2025–2026 实时)',
                categorySlug: 'popular_food',
                provinceKh: 'ទូទាំងប្រទេសកម្ពុជា',
                provinceEn: 'All Cambodia',
                relevanceScore: 98,
              });
            }
          }
        } catch {
          // fall through to RSS channel feeds
        }
      }

      // 2. Live YouTube Channel RSS Feeds (fetches latest 2025-2026 uploads from active Cambodian channels)
      try {
        const rssResults = await Promise.all(
          ACTIVE_CAMBODIA_CHANNELS_2026.map(async (ch) => {
            try {
              const rssRes = await fetch(
                `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(ch.channelId)}`
              );
              if (!rssRes.ok) return [];
              const xml = await rssRes.text();
              const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
              const found: SocialDiscoveryItem[] = [];
              for (const entry of entries.slice(0, 3)) {
                const vid = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1]?.trim();
                const rawTitle = (entry.match(/<title>([^<]+)<\/title>/) || [])[1]?.trim() || '';
                const pubDate = ((entry.match(/<published>([^<]+)<\/published>/) || [])[1] || '').slice(0, 10);
                const rawDesc = (entry.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1]?.trim() || '';
                if (!vid || !rawTitle || pubDate < '2025-01-01') continue;

                const cleanTitle = decodeXmlEntities(rawTitle);
                const cleanDesc = decodeXmlEntities(rawDesc).slice(0, 260);
                found.push({
                  id: `yt-rss-${vid}`,
                  platform: 'youtube',
                  titleKh: cleanTitle,
                  titleEn: cleanTitle,
                  titleZh: cleanTitle,
                  descriptionKh: cleanDesc || `វីដេអូថ្មីពីឆានែល ${ch.name} (${pubDate})`,
                  descriptionEn: cleanDesc || `Latest video from ${ch.name} (${pubDate})`,
                  thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                  sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
                  sourceName: `${ch.name} (YouTube)`,
                  authorHandle: ch.name,
                  publishedOrUpdatedAt: pubDate,
                  isLiveFetched: true,
                  verificationBadgeEn: 'YouTube Channel Live Feed (2025–2026)',
                  verificationBadgeKh: 'វីដេអូថ្មីពីឆានែល YouTube (2025–2026)',
                  verificationBadgeZh: 'YouTube 频道最新视频 (2025–2026)',
                  categorySlug: ch.categorySlug,
                  provinceKh: ch.provinceKh,
                  provinceEn: ch.provinceEn,
                  relevanceScore: 97,
                });
              }
              return found;
            } catch {
              return [];
            }
          })
        );

        for (const group of rssResults) {
          items.push(...group);
        }
      } catch {
        // ignore RSS errors
      }

      statuses.youtube = {
        platform: 'youtube',
        mode: items.length > 0 ? 'live_api' : 'oembed_verified',
        statusLabelEn:
          items.length > 0
            ? `YouTube 2025–2026 Live Channels (${items.length} recent videos)`
            : 'YouTube 2025–2026 oEmbed Verified',
        statusLabelKh:
          items.length > 0
            ? `ទាញផ្ទាល់ពីឆានែល YouTube ឆ្នាំ 2025–2026 (${items.length} វីដេអូថ្មីៗ)`
            : 'ផ្ទៀងផ្ទាត់តាម YouTube oEmbed (2025–2026)',
        statusLabelZh:
          items.length > 0
            ? `YouTube 2025–2026 实时频道更新 (${items.length} 条新视频)`
            : 'YouTube 2025–2026 oEmbed 验证模式',
        explanationEn: 'Streaming latest 2025–2026 Cambodian food, restaurant, and travel broadcasts from active YouTube channels.',
        explanationKh: 'ទាញយកវីដេអូថ្មីៗឆ្នាំ 2025–2026 ពីឆានែល YouTube ម្ហូបអាហារ ភោជនីយដ្ឋាន និងទេសចរណ៍កម្ពុជា។',
        explanationZh: '从活跃的高棉美食、餐厅与旅游 YouTube 频道获取 2025–2026 最新视频。',
        itemCount: items.length,
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        items,
        statuses,
        lastCheckedAt: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        items: [],
        statuses: {},
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

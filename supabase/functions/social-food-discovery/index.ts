// Supabase Edge Function: social-food-discovery
// Secure backend proxy for YouTube Data API v3 (Official Google API)
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
  categorySlug: 'famous_dish' | 'street_food' | 'noodle_soup' | 'cafe_drink' | 'dessert_snack' | 'unusual_local';
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

    // YouTube Data API v3 (Official Google API) with videoEmbeddable=true
    const ytApiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (platformFilter === 'all' || platformFilter === 'youtube') {
      if (ytApiKey && ytApiKey.trim().length > 10) {
        try {
          const searchQuery = query ? `${query} Cambodian food` : 'Cambodian food recipe Fish Amok Khmer';
          const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=8&q=${encodeURIComponent(
            searchQuery
          )}&key=${encodeURIComponent(ytApiKey.trim())}`;
          const res = await fetch(ytUrl);
          if (res.ok) {
            const data = await res.json();
            for (const item of data?.items || []) {
              const vid = item?.id?.videoId;
              const snip = item?.snippet;
              if (!vid || !snip) continue;
              items.push({
                id: `yt-live-${vid}`,
                platform: 'youtube',
                titleKh: snip.title,
                titleEn: snip.title,
                titleZh: snip.title,
                descriptionKh: snip.description || '',
                descriptionEn: snip.description || '',
                thumbnailUrl: snip?.thumbnails?.high?.url || snip?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                sourceUrl: `https://www.youtube.com/watch?v=${vid}`,
                sourceName: snip.channelTitle ? `${snip.channelTitle} (YouTube)` : 'YouTube Khmer Food',
                authorHandle: snip.channelTitle,
                publishedOrUpdatedAt: (snip.publishedAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
                isLiveFetched: true,
                verificationBadgeEn: 'YouTube Data API v3 (Live Backend)',
                verificationBadgeKh: 'ទាញផ្ទាល់ពី YouTube Data API v3',
                verificationBadgeZh: 'YouTube Data API v3 实时后端连接',
                categorySlug: 'famous_dish',
                provinceKh: 'ទូទាំងប្រទេសកម្ពុជា',
                provinceEn: 'All Cambodia',
                relevanceScore: 98,
              });
            }
            statuses.youtube = {
              platform: 'youtube',
              mode: 'live_api',
              statusLabelEn: 'YouTube Data API v3 (Active)',
              statusLabelKh: 'តភ្ជាប់ផ្ទាល់ជាមួយ YouTube Data API v3',
              statusLabelZh: 'YouTube Data API v3 实时连接',
              explanationEn: 'Server-side YouTube Data API v3 proxy returned authentic embeddable video listings.',
              explanationKh: 'ប្រព័ន្ធបម្រើការបានទាញយកវីដេអូពិតប្រាកដពី YouTube Data API v3។',
              explanationZh: '服务端代理通过官方 YouTube Data API v3 成功返回真实可嵌入视频内容。',
              itemCount: items.filter((i) => i.platform === 'youtube').length,
            };
          }
        } catch {
          // fallback status handled below
        }
      }

      if (!statuses.youtube) {
        statuses.youtube = {
          platform: 'youtube',
          mode: 'oembed_verified',
          statusLabelEn: 'YouTube oEmbed / Fallback Ready',
          statusLabelKh: 'ផ្ទៀងផ្ទាត់តាម YouTube oEmbed',
          statusLabelZh: 'YouTube oEmbed 验证模式',
          explanationEn: 'No server-side YOUTUBE_API_KEY secret configured. Client uses official YouTube oEmbed.',
          explanationKh: 'មិនទាន់កំណត់ YOUTUBE_API_KEY លើ Server ទេ។ ប្រើប្រាស់ YouTube oEmbed ផ្លូវការ។',
          explanationZh: '服务器端尚未配置 YOUTUBE_API_KEY，客户端将使用官方 YouTube oEmbed 接口。',
          itemCount: 0,
        };
      }
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

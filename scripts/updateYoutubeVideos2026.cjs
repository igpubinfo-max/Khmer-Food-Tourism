#!/usr/bin/env node
/**
 * Script: scripts/updateYoutubeVideos2026.cjs
 * Purpose: Automatically fetches and verifies the latest 2025-2026 Cambodian food,
 *          restaurant, and tourism videos from active YouTube channels via official
 *          YouTube RSS feeds + official YouTube oEmbed playability verification.
 * Usage:   node scripts/updateYoutubeVideos2026.cjs
 */

const https = require('https');

const ACTIVE_CHANNELS = [
  { channelId: 'UCLVncs-1iVf4f1tW5WSfQfw', name: 'Street Food TV', category: 'popular_food' },
  { channelId: 'UCM_tv-ZoNPPAIT4rrhib28A', name: 'Street Food Explorer', category: 'famous_restaurant' },
  { channelId: 'UCQ1k3iVCA9mkTuOJetyK_2Q', name: 'Delicious Food Show & Travel', category: 'food_travel_vlog' },
  { channelId: 'UC3B29E6Fxe-bum63LxbcspQ', name: 'Walk Street And Food', category: 'famous_restaurant' },
  { channelId: 'UC4mwWNbfhEM6BKrGtxH_1dg', name: 'Oun Roth Daily life', category: 'popular_food' },
  { channelId: 'UCg7R70hWzrtDh3bCGlrGKhQ', name: 'Delicious food channel', category: 'popular_food' },
  { channelId: 'UCIS-mtcY4mDKUd1ET6utKqA', name: 'Thavireak City Walks', category: 'tourist_attraction' },
  { channelId: 'UCjJJNMTX5wJmZRI5iK3fo5Q', name: 'Sonita Khmer US', category: 'famous_restaurant' },
  { channelId: 'UCARbX20_cV9YwwrAFyYvoMg', name: 'Mao Cambodia', category: 'famous_restaurant' },
  { channelId: 'UCRFt5572jMudEvPVDKkHmbg', name: 'Sreyreang Life Show', category: 'tourist_attraction' },
  { channelId: 'UCss0y7c69jgvFRS9Hs2EwRA', name: 'TravelwithChad', category: 'tourist_attraction' },
  { channelId: 'UCMIUsbPWmPzqRLoI8J9TG_Q', name: 'Little Explore', category: 'tourist_attraction' },
  { channelId: 'UCmHn9fGfK0NmI9fMzuaYnjA', name: 'Suitcase Monkey', category: 'tourist_attraction' },
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            fetchUrl(res.headers.location).then(resolve).catch(reject);
            return;
          }
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => resolve({ status: res.statusCode, body }));
        }
      )
      .on('error', reject);
  });
}

async function verifyOembedPlayable(videoId) {
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const res = await fetchUrl(oembedUrl);
    return res.status === 200;
  } catch {
    return false;
  }
}

(async () => {
  console.log('=== Fetching & Verifying Latest 2025-2026 Cambodian YouTube Channel Videos ===\n');
  const verifiedVideos = [];

  for (const ch of ACTIVE_CHANNELS) {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`;
      const res = await fetchUrl(rssUrl);
      if (res.status !== 200) continue;

      const entries = [...res.body.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
      for (const entry of entries.slice(0, 4)) {
        const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
        const title = (entry.match(/<title>([^<]+)<\/title>/) || [])[1];
        const published = ((entry.match(/<published>([^<]+)<\/published>/) || [])[1] || '').slice(0, 10);

        if (!videoId || published < '2025-01-01') continue;
        const playable = await verifyOembedPlayable(videoId);
        if (playable) {
          verifiedVideos.push({
            videoId,
            publishedDate: published,
            channel: ch.name,
            category: ch.category,
            title: title.replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
            url: `https://www.youtube.com/watch?v=${videoId}`,
          });
        }
      }
    } catch (err) {
      console.warn(`Warning fetching channel ${ch.name}:`, err.message);
    }
  }

  verifiedVideos.sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
  console.log(`Total verified playable 2025-2026 videos found: ${verifiedVideos.length}\n`);
  for (const v of verifiedVideos.slice(0, 25)) {
    console.log(`[${v.publishedDate}] (${v.category}) ${v.channel}: ${v.title} -> ${v.url}`);
  }
})();

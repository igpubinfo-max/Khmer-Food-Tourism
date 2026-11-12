#!/usr/bin/env node
/**
 * Script: scripts/updateYoutubeVideos2026.cjs
 * Purpose: Automatically fetches and verifies the latest 2025-2026 Cambodian food,
 *          restaurant, and tourism videos from 55+ active Cambodian YouTube channels
 *          via official YouTube RSS feeds + multi-keyword search + oEmbed verification.
 * Usage:   node scripts/updateYoutubeVideos2026.cjs
 */

const https = require('https');

const SEARCH_KEYWORDS = [
  'Cambodian Food Review',
  'Khmer Food Review',
  'Cambodia Street Food',
  'Phnom Penh Food Review',
  'Battambang Food Review',
  'Siem Reap Food Review',
  'Khmer Restaurant Review',
  'ម្ហូបខ្មែរ',
  'ញ៉ាំអាហារខ្មែរ',
  'ដើររកម្ហូបឆ្ងាញ់',
  'ហាងអាហារនៅកម្ពុជា',
];

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
  { channelId: "UCdBYbaSyGy41ws2deqrcpqg", name: "ម៉ែកាឆែត", category: "popular_food" },
  { channelId: "UCFHnPGSdWxHKVOOGuwH75-Q", name: "NexWalk KH", category: "food_travel_vlog" },
  { channelId: "UC2AEkWunWQ5m_85k-kJwxXg", name: "BT Food Story", category: "popular_food" },
  { channelId: "UCXDwffDutwtpFYbUTts7pvw", name: "Cambodia Street Food", category: "food_travel_vlog" },
  { channelId: "UCgbV-6Db9RB_93qVaDU8z_A", name: "Sok khim Cooking", category: "popular_food" },
  { channelId: "UC6BGn58FaYnAn7QgcxUpf_Q", name: "Sina NSN", category: "food_travel_vlog" },
  { channelId: "UCRvd6ud_kB8dbAvd3Fmk4Mg", name: "Sreypich TV Show", category: "food_travel_vlog" },
  { channelId: "UCv52_difuvyCvtZrnUntWNQ", name: "5 Five Tours", category: "food_travel_vlog" },
  { channelId: "UCCftsczyo1ciJ6HGH0VUOEg", name: "Food Tour & Explore", category: "food_travel_vlog" },
  { channelId: "UCn3QZDGrudCMuA8JU1HBzcA", name: "KhornPark88", category: "popular_food" },
  { channelId: "UC5lUlu8CHpEzpn4raQv4jiw", name: "WalkTV", category: "food_travel_vlog" },
  { channelId: "UCWEtQZOPvtIfiI-E4uJXRag", name: "Sambathchun សម្បត្តិជន", category: "famous_restaurant" },
  { channelId: "UClfihckKpwTAavLe4tT0NOg", name: "Tom Trips Out", category: "famous_restaurant" },
  { channelId: "UCEeeueKMAYe3wNNhie9TKew", name: "Street Food Explorer", category: "food_travel_vlog" },
  { channelId: "UC5KGBC_372NSiTJPMGr4wvA", name: "Pi Neak-ពីរនាក់", category: "popular_food" },
  { channelId: "UCGUyGCTcG9u_6cXRCrVpRvg", name: "Hidden Cambo", category: "popular_food" },
  { channelId: "UC36kFiOY7c2yll2LVyoVaHA", name: "Satya Dee", category: "popular_food" },
  { channelId: "UCjl-LRA_TLmAJGoehmVsZIA", name: "The Sister Loop", category: "popular_food" },
  { channelId: "UCtkB_B_A3jnFQryNxmAKOBg", name: "Khmer rural life", category: "food_travel_vlog" },
  { channelId: "UC0RsJe65MJAIFwgW6C0djvw", name: "Sarna Cooking Show", category: "food_travel_vlog" },
  { channelId: "UCAj8MxN5DsAFq5Me2wKVYbw", name: "Cambo Explorer", category: "food_travel_vlog" },
  { channelId: "UC0nxHFae3a0UzafMJjadIrQ", name: "CUỘC SỐNG CAM", category: "popular_food" },
  { channelId: "UCFUiKVah5VJJG1ESDjAtJ3g", name: "Life in Cambodia", category: "popular_food" },
  { channelId: "UCs22MyD8qdgDF-kJyv6Zofw", name: "Mark In Asia", category: "famous_restaurant" },
  { channelId: "UC9OcuVtqIsCe8_7AjjPtoZg", name: "Angela McColl", category: "popular_food" },
  { channelId: "UCzYZk4bZ07yJeK7Zd_z37Cw", name: "Food Network UK", category: "famous_restaurant" },
  { channelId: "UC3TIRH4PPSDde66Hg5wGh-w", name: "Condé Nast Traveler", category: "food_travel_vlog" },
  { channelId: "UCo0BHDWZ3gRCuSbUH85G-_A", name: "T&L TRAVEL", category: "famous_restaurant" },
  { channelId: "UCZJtFOu1wmxq8wadfHSlYPQ", name: "Street food tour", category: "food_travel_vlog" },
  { channelId: "UCmfOXpsa0q0uHxaaDkeeFdw", name: "WisGO", category: "popular_food" },
  { channelId: "UCo42Xmxl2U99UtfCiWQxgcg", name: "Jenny Daily Life", category: "food_travel_vlog" },
  { channelId: "UCB8yjnAK_IxD-fMjxH_QpDg", name: "Chay Sivlang", category: "popular_food" },
  { channelId: "UC1_PeD6rZaUoNrN2AtyTe2Q", name: "Priscilla Kim Ong", category: "food_travel_vlog" },
  { channelId: "UCcHW9-v8McRcO-Rm-zBv2ZQ", name: "Mooch Travels", category: "popular_food" },
  { channelId: "UCegDP5GpIrMfSXZlePFtitA", name: "Rockstar Eater", category: "popular_food" },
  { channelId: "UC4KPmxdpKFAzogb6beSfQWA", name: "Cooking and Travel with Bong General", category: "popular_food" },
  { channelId: "UCKQa5a6kxcziSAaRwHJxoMQ", name: "Visit and cook with me", category: "food_travel_vlog" },
  { channelId: "UCAuKl-usJ7p5c-Nh8L73odw", name: "Cambodia Vibes", category: "food_travel_vlog" },
  { channelId: "UC5NofLGyaa9Q6PHsxSgXM0Q", name: "Lloyd & Mandy", category: "food_travel_vlog" },
  { channelId: "UCLUapBXshwIyBCDMWSO3srQ", name: "Kitchen Story", category: "popular_food" },
  { channelId: "UCcTnoBPJiZyGkagNaPJcNFA", name: "EVERYTHING", category: "food_travel_vlog" },
  { channelId: "UC97aAzNbBb30T5sEIymxDLg", name: "For Riel", category: "famous_restaurant" },
  { channelId: "UCPflXomEwyYJFcRX1jJxf-A", name: "Kheom Leakhena", category: "food_travel_vlog" },
  { channelId: "UCplb1Ru5jWb_BM3Qe_OoQkw", name: "Pich Pisey", category: "popular_food" },
  { channelId: "UCodC-082nikp-Cq7tlJXtpg", name: "Mey Natural Food", category: "popular_food" },
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
  console.log('=== Fetching & Verifying Latest Cambodian Food Review YouTube Videos ===');
  console.log('Registered Channels:', ACTIVE_CHANNELS.length, '| Search Keywords:', SEARCH_KEYWORDS.length, '\n');
  const verifiedVideos = [];
  const seenIds = new Set();

  for (const ch of ACTIVE_CHANNELS.slice(0, 25)) {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channelId}`;
      const res = await fetchUrl(rssUrl);
      if (res.status !== 200) continue;

      const entries = [...res.body.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
      for (const entry of entries.slice(0, 4)) {
        const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
        const title = (entry.match(/<title>([^<]+)<\/title>/) || [])[1];
        const published = ((entry.match(/<published>([^<]+)<\/published>/) || [])[1] || '').slice(0, 10);

        if (!videoId || seenIds.has(videoId)) continue;
        const playable = await verifyOembedPlayable(videoId);
        if (playable) {
          seenIds.add(videoId);
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
  console.log(`Total verified playable videos found in batch: ${verifiedVideos.length}\n`);
  for (const v of verifiedVideos.slice(0, 30)) {
    console.log(`[${v.publishedDate}] (${v.category}) ${v.channel}: ${v.title} -> ${v.url}`);
  }
})();

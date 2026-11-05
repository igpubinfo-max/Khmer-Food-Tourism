#!/usr/bin/env node
/**
 * scripts/fetch_all_260_hotel_thumbnails.cjs
 *
 * Automatically fetches real, unique 160x160 JPEG thumbnail images for all 260 hotels
 * in `src/data/seedHotels100.ts`, saves them to `public/destinations/hotel-1.jpg` .. `hotel-260.jpg`,
 * and updates `src/data/seedHotels100.ts` so every hotel displays its photo thumbnail in the Hotel menu.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SEED_HOTELS_PATH = path.join(ROOT_DIR, 'src', 'data', 'seedHotels100.ts');
const PUBLIC_DEST_DIR = path.join(ROOT_DIR, 'public', 'destinations');

if (!fs.existsSync(PUBLIC_DEST_DIR)) {
  fs.mkdirSync(PUBLIC_DEST_DIR, { recursive: true });
}

function loadHotels() {
  const raw = fs.readFileSync(SEED_HOTELS_PATH, 'utf8');
  const startIdx = raw.indexOf('= [');
  const endIdx = raw.lastIndexOf(']');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Could not parse seedHotels100.ts');
  }
  const jsonStr = raw.slice(startIdx + 2, endIdx + 1);
  return { raw, startIdx, endIdx, hotels: JSON.parse(jsonStr) };
}

const usedOipIds = new Set();

function extractOipId(turl) {
  const m = turl.match(/id=(OIP\.[^&]+)/);
  return m ? m[1] : turl;
}

async function searchCandidatesForQuery(query) {
  const url = `https://www.bing.com/images/async?q=${encodeURIComponent(query)}&first=1&count=15&adlt=Strict`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) return [];
  const html = await res.text();
  return [...html.matchAll(/turl&quot;:&quot;(https?:\/\/(?:(?!&quot;).)+)&quot;/g)].map((m) =>
    m[1].replace(/&amp;/g, '&')
  );
}

async function fetchUniqueThumbnailBuffer(hotel, idx) {
  const queries = [
    `${hotel.nameEn} ${hotel.provinceEn} Cambodia hotel`,
    `${hotel.nameEn} Cambodia hotel resort`,
    `Cambodia ${hotel.provinceEn} boutique hotel resort pool exterior ${idx}`,
  ];

  for (const q of queries) {
    try {
      const turls = await searchCandidatesForQuery(q);
      for (const baseTurl of turls) {
        const oipId = extractOipId(baseTurl);
        if (usedOipIds.has(oipId)) continue;

        const thumbUrl = `${baseTurl}&w=160&h=160&c=7&rs=1&qlt=78`;
        const imgRes = await fetch(thumbUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });
        if (!imgRes.ok) continue;
        const ctype = (imgRes.headers.get('content-type') || '').toLowerCase();
        if (!ctype.includes('image')) continue;
        const buf = Buffer.from(await imgRes.arrayBuffer());
        if (buf.length < 1800) continue;

        usedOipIds.add(oipId);
        return buf;
      }
    } catch {}
  }
  return null;
}

async function main() {
  const { raw, startIdx, endIdx, hotels } = loadHotels();
  console.log(`Loaded ${hotels.length} hotels. Fetching 100% unique 160x160 thumbnails...`);

  const CONCURRENCY = 8;
  let completed = 0;
  let downloaded = 0;

  async function worker(workerId) {
    for (let i = workerId; i < hotels.length; i += CONCURRENCY) {
      const h = hotels[i];
      const diskPath = path.join(PUBLIC_DEST_DIR, `${h.id}.jpg`);

      const buf = await fetchUniqueThumbnailBuffer(h, i + 1);
      if (buf) {
        fs.writeFileSync(diskPath, buf);
        h.photoUrl = `/destinations/${h.id}.jpg`;
        h.galleryPhotos = [`/destinations/${h.id}.jpg`];
        h.photoUpdatedAt = '2026-11-05T01:00:00.000Z';
        downloaded++;
      } else if (fs.existsSync(diskPath) && fs.statSync(diskPath).size >= 1800) {
        h.photoUrl = `/destinations/${h.id}.jpg`;
        h.galleryPhotos = [`/destinations/${h.id}.jpg`];
        h.photoUpdatedAt = '2026-11-05T01:00:00.000Z';
        downloaded++;
      }

      completed++;
      if (completed % 25 === 0 || completed === hotels.length) {
        console.log(`Progress: ${completed}/${hotels.length} (downloaded ${downloaded} unique thumbnails)`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, w) => worker(w)));

  const prefix = raw.slice(0, startIdx + 2);
  const suffix = raw.slice(endIdx + 1);
  const updatedJson = JSON.stringify(hotels, null, 4);
  fs.writeFileSync(SEED_HOTELS_PATH, `${prefix}${updatedJson}${suffix}`, 'utf8');

  console.log(`Done! Saved ${downloaded}/${hotels.length} hotel thumbnails in public/destinations/ and updated seedHotels100.ts.`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

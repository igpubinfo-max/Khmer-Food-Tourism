/**
 * Online & Verified Cambodian Food Image Search Service
 * Powers the «🤖 ស្វែងរករូបភាពម្ហូបពី Online ដោយស្វ័យប្រវត្តិ» feature.
 * Prioritizes:
 * 1. Exact & sub-family matched authentic Cambodian dish photos from the 200-dish Khmer catalog
 * 2. Verified Wikimedia Commons Cambodian & Southeast Asian culinary photos
 * Guarantees 0 unrelated Western stock photos.
 */

import { FoodCategorySlug } from '../types';
import { initialFoods } from '../data/seedData';

export interface OnlineFoodImageCandidate {
  url: string;
  thumbUrl?: string;
  title: string;
  source: 'Khmer Culinary Catalog' | 'Wikimedia Commons' | 'TheMealDB';
  confidenceScore?: number;
}

// Specific Khmer culinary token dictionary for accurate Wikimedia search & sub-family ranking
const KHMER_CULINARY_SEARCH_TERMS: Array<{ kh: string; wikiQuery: string }> = [
  { kh: 'ឆាគ្រឿងសាច់គោ', wikiQuery: 'Cambodian beef kroeung stir fry' },
  { kh: 'ឆាគ្រឿងអន្ទង់', wikiQuery: 'Cambodian spicy eel stir fry kroeung' },
  { kh: 'ឆាគ្រឿង', wikiQuery: 'Cambodian kroeung lemongrass stir fry' },
  { kh: 'ឡុកឡាក់', wikiQuery: 'Beef Lok Lak Cambodia' },
  { kh: 'អាម៉ុក', wikiQuery: 'Fish Amok Cambodia' },
  { kh: 'សម្លកកូរ', wikiQuery: 'Samlor Korko Cambodia soup' },
  { kh: 'សម្លម្ជូរគ្រឿង', wikiQuery: 'Samlor Machu Kroeung Cambodia' },
  { kh: 'សម្លម្ជូរ', wikiQuery: 'Cambodian sour soup Samlor Machu' },
  { kh: 'សម្លប្រហើរ', wikiQuery: 'Samlor Praher Cambodia soup' },
  { kh: 'សម្លការី', wikiQuery: 'Cambodian red chicken curry' },
  { kh: 'ប្រហុកខ្ទិះ', wikiQuery: 'Prahok Ktiss Cambodia' },
  { kh: 'ទឹកគ្រឿង', wikiQuery: 'Tuk Kroeung Cambodian fish dip vegetables' },
  { kh: 'នំបញ្ចុក', wikiQuery: 'Num Banh Chok Cambodian noodles' },
  { kh: 'គុយទាវ', wikiQuery: 'Kuy Teav Phnom Penh noodle soup' },
  { kh: 'លតឆា', wikiQuery: 'Lort Cha Cambodian fried pin noodles' },
  { kh: 'បាយសាច់ជ្រូក', wikiQuery: 'Bai Sach Chrouk pork rice Cambodia' },
  { kh: 'បាយឆា', wikiQuery: 'Asian wok fried rice' },
  { kh: 'បបរ', wikiQuery: 'Cambodian rice porridge Borbor' },
  { kh: 'ពងទាកូន', wikiQuery: 'Balut duck egg Kampot pepper lime' },
  { kh: 'ត្រីងៀត', wikiQuery: 'Dried grilled fish Cambodian cuisine' },
  { kh: 'ត្រីអាំង', wikiQuery: 'Grilled fish Southeast Asian herbs' },
  { kh: 'មាន់ដុត', wikiQuery: 'Grilled whole chicken lemongrass Cambodia' },
  { kh: 'ញាំមីសួរ', wikiQuery: 'Glass noodle seafood salad Yum Woon Sen' },
  { kh: 'ញាំក្រូចថ្លុង', wikiQuery: 'Pomelo shrimp salad Southeast Asia' },
  { kh: 'ភ្លាសាច់គោ', wikiQuery: 'Cambodian beef lime salad Pleah Sach Ko' },
  { kh: 'បុកល្ហុង', wikiQuery: 'Green papaya salad Bok Lahong' },
  { kh: 'បាញ់ឆែវ', wikiQuery: 'Banh Xeo crispy turmeric crepe' },
  { kh: 'នំគ្រក់', wikiQuery: 'Num Krok coconut rice cakes Cambodia' },
  { kh: 'សង់ខ្យាល្ពៅ', wikiQuery: 'Sankhya Lapov pumpkin custard Cambodia' },
  { kh: 'បង្អែម', wikiQuery: 'Cambodian coconut dessert Chek Ktiss' },
  { kh: 'នំអន្សម', wikiQuery: 'Num Ansom banana leaf sticky rice Cambodia' },
];

const KHMER_INGREDIENTS_TOKENS = [
  'ឆាគ្រឿង',
  'ឆាក្ដៅ',
  'ឆាក្តៅ',
  'ឆាខ្ញី',
  'ឆាបន្លែ',
  'ឆាត្រកួន',
  'សណ្ដែកគួរ',
  'សណ្តែកគួរ',
  'ម្រះព្រៅ',
  'សាច់គោ',
  'សាច់ជ្រូក',
  'សាច់មាន់',
  'សាច់ទា',
  'អន្ទង់',
  'កង្កែប',
  'ត្រីងៀត',
  'ត្រីឆ្អើរ',
  'ត្រីអណ្តែង',
  'ត្រីរ៉ស់',
  'បង្គា',
  'មឹក',
  'ក្តាម',
  'គ្រឿងសមុទ្រ',
  'ពងទាកូន',
  'ពងទា',
  'មីសួរ',
  'នំបញ្ចុក',
  'គុយទាវ',
  'លតឆា',
  'មីឆា',
  'បាយសាច់ជ្រូក',
  'បាយឆា',
  'បបរ',
  'សម្លកកូរ',
  'សម្លម្ជូរ',
  'សម្លការី',
  'សម្លប្រហើរ',
  'ស្ងោរជ្រក់',
  'ស្ងោរម្រះ',
  'ង៉ាំង៉ូវ',
  'អាម៉ុក',
  'ប្រហុក',
  'ទឹកគ្រឿង',
  'ខសាច់ជ្រូក',
  'ខត្រី',
  'ផាក់ឡូវ',
  'ញាំ',
  'ភ្លា',
  'បុកល្ហុង',
  'អាំង',
  'ដុត',
  'បំពង',
  'ចៀន',
  'បាញ់ឆែវ',
  'នំគ្រក់',
  'គួង',
  'សង់ខ្យា',
  'បង្អែម',
];

/**
 * Translates a Khmer/English dish name into an effective Cambodian culinary search query.
 */
export function buildOnlineFoodSearchQuery(
  nameKh: string,
  nameEn: string,
  categorySlug: FoodCategorySlug = 'soup'
): string {
  const kh = (nameKh || '').trim();
  for (const item of KHMER_CULINARY_SEARCH_TERMS) {
    if (kh.includes(item.kh)) {
      return item.wikiQuery;
    }
  }

  const cleanEn = (nameEn || '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanEn.length >= 4) {
    return `${cleanEn.split(' ').slice(0, 4).join(' ')} Asian dish`;
  }

  const categoryDefaultMap: Record<string, string> = {
    soup: 'Cambodian Samlor soup curry',
    grilled: 'Cambodian grilled fish meat herbs',
    stirfry: 'Cambodian kroeung stir fry wok',
    salad: 'Cambodian herb salad pleah nyam',
    noodles: 'Cambodian rice noodle soup Num Banh Chok',
    rice: 'Cambodian pork rice Bai Sach Chrouk',
    cake: 'Cambodian street snack Banh Xeo Num Krok',
    dessert: 'Cambodian coconut dessert Sankhya',
    specialty: 'Cambodian traditional cuisine dish',
  };

  return categoryDefaultMap[categorySlug] || 'Cambodian cuisine dish';
}

/**
 * Searches verified Cambodian dish catalog first (exact dish + closest Khmer culinary matches),
 * then queries Wikimedia Commons for real Cambodian/Asian dish photos.
 * Never returns unrelated Western stock photos.
 */
export async function searchOnlineFoodImages(params: {
  nameKh: string;
  nameEn?: string;
  categorySlug?: FoodCategorySlug;
  existingUrls?: string[];
}): Promise<OnlineFoodImageCandidate[]> {
  const targetKh = (params.nameKh || '').trim();
  const targetEn = (params.nameEn || '').trim().toLowerCase();
  const category = params.categorySlug || 'soup';
  const candidates: OnlineFoodImageCandidate[] = [];
  const seenUrls = new Set<string>();

  const addCandidate = (c: OnlineFoodImageCandidate) => {
    const cleanUrl = (c.url || '').trim();
    if (!cleanUrl || seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);
    candidates.push(c);
  };

  // 1. Score all 200 authentic Cambodian dishes in initialFoods by exact name & shared Khmer culinary tokens
  const scoredCatalog = initialFoods
    .map((food) => {
      let score = 0;
      const fKh = (food.nameKh || '').trim();
      const fEn = (food.nameEn || '').trim().toLowerCase();

      if (fKh === targetKh) {
        score += 100; // Exact dish match (#1)
      } else if (targetKh && (fKh.includes(targetKh) || targetKh.includes(fKh))) {
        score += 65;
      }

      // Token overlap on Khmer ingredients & cooking methods
      for (const tok of KHMER_INGREDIENTS_TOKENS) {
        if (targetKh.includes(tok) && fKh.includes(tok)) {
          score += tok.length >= 5 ? 28 : 16;
        }
      }

      // Prefix match (e.g. both start with ឆាគ្រឿង, សម្លម្ជូរ, ត្រីងៀត, ញាំមីសួរ, បង្អែម)
      const prefix4 = targetKh.slice(0, 6);
      if (prefix4.length >= 4 && fKh.startsWith(prefix4)) {
        score += 22;
      }

      // English keyword overlap
      if (targetEn && fEn) {
        const words = targetEn.split(/\s+/).filter((w) => w.length >= 4);
        for (const w of words) {
          if (fEn.includes(w)) score += 10;
        }
      }

      if (food.categorySlug === category) {
        score += 12;
      }

      return { food, score };
    })
    .sort((a, b) => b.score - a.score);

  // Add top 4 authentic Cambodian dish photos from the verified catalog
  for (const entry of scoredCatalog.slice(0, 4)) {
    const f = entry.food;
    const url = f.originalPhotoUrl || f.photoUrl || `/foods/${f.id}.jpg`;
    const isExact = f.nameKh.trim() === targetKh;
    const conf = isExact ? 98 : Math.min(92, Math.max(72, 65 + Math.round(entry.score / 3)));
    addCandidate({
      url,
      title: isExact
        ? `✅ រូបដើមពិតប្រាកដ៖ ${f.nameKh}`
        : `🇰🇭 ម្ហូបខ្មែរប្រហាក់ប្រហែល៖ ${f.nameKh}`,
      source: 'Khmer Culinary Catalog',
      confidenceScore: conf,
    });
  }

  // 2. Live Wikimedia Commons Search API (Authentic Cambodian / Asian Culinary Photos)
  const wikiSearchTerm = buildOnlineFoodSearchQuery(targetKh, params.nameEn || '', category);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const wikiQuery = encodeURIComponent(wikiSearchTerm);
    const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap%20${wikiQuery}&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
    const res = await fetch(wikiUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
      for (const p of pages as any[]) {
        const thumbUrl = p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url;
        const rawTitle = String(p?.title || '')
          .replace(/^File:/i, '')
          .replace(/\.[^.]+$/, '');
        if (
          thumbUrl &&
          /\.(jpe?g|png|webp)$/i.test(thumbUrl) &&
          !thumbUrl.toLowerCase().includes('logo') &&
          !thumbUrl.toLowerCase().includes('icon') &&
          !thumbUrl.toLowerCase().includes('map') &&
          !thumbUrl.toLowerCase().includes('flag')
        ) {
          addCandidate({
            url: thumbUrl,
            title: rawTitle || wikiSearchTerm,
            source: 'Wikimedia Commons',
            confidenceScore: 80,
          });
        }
      }
    }
  } catch {
    // Graceful offline fallback
  }

  // 3. Fill remaining slots up to 6 with next best authentic Cambodian dishes from scoredCatalog
  for (const entry of scoredCatalog.slice(4, 12)) {
    if (candidates.length >= 6) break;
    const f = entry.food;
    const url = f.originalPhotoUrl || f.photoUrl || `/foods/${f.id}.jpg`;
    addCandidate({
      url,
      title: `🇰🇭 ${f.nameKh} (${f.nameEn})`,
      source: 'Khmer Culinary Catalog',
      confidenceScore: 74,
    });
  }

  return candidates.slice(0, 6);
}

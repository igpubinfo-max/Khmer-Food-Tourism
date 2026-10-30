import type { FoodCategorySlug, Language } from '../../types';

export const FALLBACK_IMG = '/welcome/hero-bg.webp';

/** Resolves a photo URL for Home cards (cache-busts bundled /foods/ assets, falls back to the hero image). */
export const resolveHomePhoto = (url?: string): string => {
  if (!url) return FALLBACK_IMG;
  return url.startsWith('/foods/') && !url.includes('?') ? `${url}?v=20261029v3` : url;
};

export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export const getMealSlot = (date: Date = new Date()): MealSlot => {
  const h = date.getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 10 && h < 14) return 'lunch';
  if (h >= 14 && h < 17) return 'snack';
  return 'dinner';
};

export const MEAL_CATEGORIES: Record<MealSlot, FoodCategorySlug[]> = {
  breakfast: ['noodles', 'rice', 'soup'],
  lunch: ['rice', 'stirfry', 'soup'],
  snack: ['dessert', 'cake', 'salad'],
  dinner: ['grilled', 'soup', 'specialty', 'stirfry'],
};

export const getMealHint = (slot: MealSlot, lang: Language): string => {
  const hints: Record<MealSlot, [string, string, string]> = {
    breakfast: [
      'ព្រឹកនេះ សាកល្បងមុខម្ហូបស្រាលៗ ដើម្បីចាប់ផ្តើមថ្ងៃថ្មី',
      'Start your morning with something light and delicious',
      '用一份清爽美味的早餐开启美好的一天',
    ],
    lunch: [
      'ម៉ោងបាយថ្ងៃត្រង់ហើយ! នេះជាមុខម្ហូបដែលគួរសាកល្បង',
      "It's lunchtime — here are dishes worth trying",
      '午餐时间到了，为您精选这些美味',
    ],
    snack: [
      'ពេលរសៀល ញ៉ាំបង្អែម ឬនំស្រាលៗ ឆ្ងាញ់ណាស់',
      'Afternoon craving? Sweet treats and light bites',
      '下午茶时间，来点甜品和小吃吧',
    ],
    dinner: [
      'ពេលល្ងាចនេះ ជ្រើសរើសមុខម្ហូបក្តៅៗ ឆ្ងាញ់ៗ សម្រាប់អាហារពេលល្ងាច',
      'Dinner time — pick something warm and satisfying',
      '晚餐时间，选一道暖心美味吧',
    ],
  };
  const [km, en, zh] = hints[slot];
  return lang === 'km' ? km : lang === 'zh' ? zh : en;
};

/** Small deterministic PRNG so picks stay stable during a session/day but still vary day to day. */
export const seededShuffle = <T,>(list: T[], seed: number): T[] => {
  const a = [...list];
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Khmer headings use the decorative Moul face; Latin/Chinese headings use a clean heavy sans so they never fall back to an odd glyph set. */
export const headingFont = (lang: Language): string => (lang === 'km' ? 'font-moul' : 'font-extrabold tracking-tight');

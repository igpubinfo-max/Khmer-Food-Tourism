import type { FoodItem } from '../types';
import { getCambodiaHolidaysForYear, type DynamicCambodiaHoliday, type Tri } from './guideContent';

/**
 * Festival food collections: dishes that Cambodian families traditionally prepare for a festival.
 *
 * Rules:
 *  - Only REAL catalog dishes are referenced (by id). A dish that is not in the catalog is simply not listed - we never
 *    invent a dish, a photo or a recipe. Add more ids here as new dishes are added to the catalog.
 *  - The same dish may belong to several festivals (e.g. Khor and Num Ansom are cooked for both Khmer New Year and Pchum Ben).
 *  - Festival dates are NOT stored here: they come from `getCambodiaHolidaysForYear` (guideContent), so they roll over yearly.
 */
export type FestivalFoodId = 'pchum-ben' | 'khmer-new-year';

export const FESTIVAL_FOOD_IDS: Record<FestivalFoodId, readonly string[]> = {
  // Pchum Ben (from the traditional Pchum Ben set menus): shown in the order of the sets.
  'pchum-ben': [
    'food-155', // ប្រហុកខ្ទិះ (Creamy coconut & minced pork prahok dip with fresh vegetables)
    'food-140', // ខជើងជ្រូកពងទាស្ករត្នោត (Palm-sugar braised pork trotters & eggs)
    'food-4', //   សម្លការីសាច់មាន់ខ្មែរ (Khmer chicken curry)
    'food-148', // ញាំត្រយូងចេកសាច់មាន់ហែក (Banana blossom & shredded chicken salad)
    'food-54', //  សាច់ជ្រូកចិញ្ច្រាំ ត្រីប្រម៉ា (Steamed minced pork with salted fish)
    'food-1', //   អាម៉ុកត្រី (Fish amok)
    'food-3', //   សម្លម្ជូរគ្រឿងសាច់គោ (Khmer beef sour soup)
  ],
  // Khmer New Year
  'khmer-new-year': [
    'food-187', // នំអន្សមជ្រូក
    'food-91', //  នំអន្សមចេក
    'food-8', //   ខសាច់ជ្រូកពងទា
  ],
};

export const FESTIVAL_FOOD_TITLES: Record<FestivalFoodId, Tri> = {
  'pchum-ben': { km: 'ម្ហូបបុណ្យភ្ជុំបិណ្ឌ', en: 'Pchum Ben Foods', zh: '亡人节传统美食' },
  'khmer-new-year': { km: 'ម្ហូបបុណ្យចូលឆ្នាំខ្មែរ', en: 'Khmer New Year Foods', zh: '高棉新年传统美食' },
};

/** The festival section appears on Home this many days before the festival starts (and while it is ongoing). */
export const FESTIVAL_PROMO_WINDOW_DAYS = 45;

export function hasFestivalFoods(festivalId: string): festivalId is FestivalFoodId {
  return Object.prototype.hasOwnProperty.call(FESTIVAL_FOOD_IDS, festivalId);
}

/** Resolve the festival's dishes from the live catalog, keeping the curated order and skipping anything missing. */
export function resolveFestivalFoods(festivalId: string, foods: FoodItem[]): FoodItem[] {
  if (!hasFestivalFoods(festivalId)) return [];
  const byId = new Map<string, FoodItem>();
  for (const f of foods) if (f && f.id) byId.set(f.id, f);
  const out: FoodItem[] = [];
  for (const id of FESTIVAL_FOOD_IDS[festivalId]) {
    const f = byId.get(id);
    if (f && f.nameKh) out.push(f);
  }
  return out;
}

/** The nearest festival that has a food collection and is ongoing or starting within the promo window. */
export function pickFestivalInSeason(
  now: Date = new Date(),
  windowDays: number = FESTIVAL_PROMO_WINDOW_DAYS
): DynamicCambodiaHoliday | null {
  const list = getCambodiaHolidaysForYear(now); // already sorted by days until start
  return list.find((h) => hasFestivalFoods(h.id) && (h.isOngoingToday || h.daysUntil <= windowDays)) ?? null;
}

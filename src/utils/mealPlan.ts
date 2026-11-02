import type { FoodItem } from '../types';
import { getDishTagIds } from './dishTags';
import { isAuthenticCambodianDishForMealTime } from './cambodianMealHabits';

/**
 * Daily 3-meal idea built ONLY from recipe data (calories + tags). In-memory, no storage keys.
 * Neutral suggestion, not a diet or medical plan.
 */
export interface MealPlan {
  breakfast: FoodItem | null;
  lunch: FoodItem | null;
  dinner: FoodItem | null;
  totalKcal: number;
}

const isSweet = (f: FoodItem) => f.categorySlug === 'dessert' || f.categorySlug === 'cake';
const kcal = (f: FoodItem) => (typeof f.calories === 'number' ? f.calories : 0);

// Small deterministic hash so each shuffle seed gives a different but stable ordering
function hash(str: string, seed: number): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function pick(pool: FoodItem[], seed: number, used: Set<string>): FoodItem | null {
  const sorted = pool
    .filter((f) => !used.has(f.id))
    .sort((a, b) => hash(a.id, seed) - hash(b.id, seed));
  const chosen = sorted[0] || null;
  if (chosen) used.add(chosen.id);
  return chosen;
}

export function buildMealPlan(foods: FoodItem[], seed: number, isVipAuthorized = true): MealPlan {
  if (!isVipAuthorized) {
    return { breakfast: null, lunch: null, dinner: null, totalKcal: 0 };
  }
  const mains = foods.filter((f) => !isSweet(f) && kcal(f) > 0 && !!f.photoUrl);
  const used = new Set<string>();

  const breakfastPool = (max: number) =>
    mains.filter((f) => kcal(f) <= max && isAuthenticCambodianDishForMealTime(f, 'breakfast'));
  const lunchPool = (max: number) =>
    mains.filter((f) => {
      if (kcal(f) > max || !isAuthenticCambodianDishForMealTime(f, 'lunch')) return false;
      const tags = getDishTagIds(f);
      return tags.includes('vegetable_rich') || tags.includes('protein_rich') || f.categorySlug === 'soup';
    });
  const dinnerPool = (max: number) =>
    mains.filter((f) => {
      if (kcal(f) > max || !isAuthenticCambodianDishForMealTime(f, 'dinner')) return false;
      const tags = getDishTagIds(f);
      return tags.includes('steamed_boiled') || tags.includes('grilled') || tags.includes('vegetable_rich');
    });

  const breakfast =
    pick(breakfastPool(420), seed, used) ||
    pick(breakfastPool(550), seed, used) ||
    pick(mains.filter((f) => isAuthenticCambodianDishForMealTime(f, 'breakfast')), seed, used);
  const lunch =
    pick(lunchPool(600), seed + 1, used) ||
    pick(mains.filter((f) => isAuthenticCambodianDishForMealTime(f, 'lunch')), seed + 1, used) ||
    pick(mains, seed + 1, used);
  const dinner =
    pick(dinnerPool(420), seed + 2, used) ||
    pick(dinnerPool(550), seed + 2, used) ||
    pick(mains.filter((f) => isAuthenticCambodianDishForMealTime(f, 'dinner')), seed + 2, used);

  return {
    breakfast,
    lunch,
    dinner,
    totalKcal: kcal(breakfast || ({} as FoodItem)) + kcal(lunch || ({} as FoodItem)) + kcal(dinner || ({} as FoodItem)),
  };
}

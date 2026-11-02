import { resolveFoodPhotoUrl } from '../types';

/**
 * Dishes that are NOT part of the verified 200-dish catalog (created on the fly from a user's request
 * or by the AI assistant). They must never borrow another dish's photo, rating or calories.
 */
export const GENERATED_DISH_PREFIXES = ['custom-recipe-', 'ai-dish-'] as const;

export function isGeneratedDishId(id?: string | null): boolean {
  const s = String(id || '');
  return GENERATED_DISH_PREFIXES.some((p) => s.startsWith(p));
}

/** http(s) / data / blob / bundled-asset photo that can actually be displayed. */
export function hasRenderablePhoto(url?: string | null): boolean {
  const s = String(url || '').trim();
  return /^(https?:|data:image\/|blob:)/i.test(s) || s.startsWith('/foods/');
}

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#064E3B"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="320" height="200" fill="url(#g)"/><g fill="none" stroke="#fbbf24" stroke-width="5" stroke-linecap="round" opacity=".9"><path d="M120 62v34c0 8 6 14 14 14v36"/><path d="M134 62v34"/><path d="M148 62v34c0 8-6 14-14 14"/><path d="M196 62c-14 8-20 26-20 44h20v40"/></g><text x="160" y="182" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#a7f3d0">No verified photo</text></svg>`;

/** Neutral placeholder shown instead of a wrong / random food picture. */
export const FOOD_PHOTO_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

/** `onError` handler for <img>: catalog dishes fall back to the app default, generated dishes to the neutral placeholder. */
export function fallbackPhotoFor(dishId?: string | null): string {
  return isGeneratedDishId(dishId) ? FOOD_PHOTO_PLACEHOLDER : '/foods/food-1.jpg';
}

/** <img src> for any dish: generated dishes without a verified photo show the placeholder (never another dish). */
export function foodPhotoSrc(food: { id?: string; photoUrl?: string; photoUpdatedAt?: string }): string {
  if (isGeneratedDishId(food.id) && !hasRenderablePhoto(food.photoUrl)) return FOOD_PHOTO_PLACEHOLDER;
  return resolveFoodPhotoUrl(food.photoUrl, food.photoUpdatedAt);
}

import type { FoodItem } from '../types';

export type NearMeTabType = 'restaurants' | 'destinations';

export interface NearMeLaunchOptions {
  tab?: NearMeTabType;
  query?: string;
  food?: FoodItem | null;
}

interface KftNearMeWindow extends Window {
  __kft_near_me_initial_tab?: NearMeTabType;
  __kft_near_me_initial_query?: string;
  __kft_near_me_initial_food?: FoodItem;
}

/**
 * Centralized Near Me launcher (CHG-11 / DUP-01).
 * Sets initial tab/query/food state consistently across all 6 entry points and opens NearMeModal.
 */
export function openNearMeModal(
  setIsNearMeModalOpen: (open: boolean) => void,
  options: NearMeLaunchOptions = {}
): void {
  const tab: NearMeTabType = options.tab || 'restaurants';
  if (typeof window !== 'undefined') {
    const w = window as unknown as KftNearMeWindow;
    w.__kft_near_me_initial_tab = tab;
    w.__kft_near_me_initial_query = options.query;
    w.__kft_near_me_initial_food = options.food || undefined;
    window.dispatchEvent(new CustomEvent('kft:near-me-tab', { detail: tab }));
  }
  setIsNearMeModalOpen(true);
}

/**
 * Consumes and clears any pending Near Me launch parameters when NearMeModal opens.
 */
export function consumeNearMeInitialState(): {
  hasState: boolean;
  tab: NearMeTabType;
  food: FoodItem | null;
  query: string;
} {
  if (typeof window === 'undefined') {
    return { hasState: false, tab: 'restaurants', food: null, query: '' };
  }
  const w = window as unknown as KftNearMeWindow;
  const initTab = w.__kft_near_me_initial_tab;
  const initFood = w.__kft_near_me_initial_food;
  const initQuery = w.__kft_near_me_initial_query;
  const hasState = initTab !== undefined || initFood !== undefined || initQuery !== undefined;

  if (hasState) {
    w.__kft_near_me_initial_tab = undefined;
    w.__kft_near_me_initial_food = undefined;
    w.__kft_near_me_initial_query = undefined;
  }

  return {
    hasState,
    tab: initTab === 'destinations' ? 'destinations' : 'restaurants',
    food: initFood && typeof initFood === 'object' ? initFood : null,
    query: typeof initQuery === 'string' ? initQuery : '',
  };
}

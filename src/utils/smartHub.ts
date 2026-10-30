import { isAdminAccount, isUserVipActive, type User } from '../types';
import type { TagFilterId } from './dishTags';

/**
 * Smart Menu & Healthy Dish Nutrition Filter access helper —
 * reserved for active VIP members and System Administrators.
 * Basic features (Nearby Food Search, Nearby Places, Food Recommendations,
 * Daily Food Discovery, and Map Navigation) remain 100% Free for all users.
 */
export function hasSpecialAndHealthyFoodVipAccess(user?: User | null): boolean {
  return Boolean(user && (isUserVipActive(user) || isAdminAccount(user)));
}

/**
 * In-memory handoff from the Smart Menu to the Food tab: "open Food with this tag pre-selected".
 */
export const TAG_FILTER_EVENT = 'kft:set-tag-filter';
let pending: TagFilterId | null = null;

export function requestTagFilter(id: TagFilterId, user?: User | null): boolean {
  if (!hasSpecialAndHealthyFoodVipAccess(user)) {
    return false;
  }
  pending = id;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(TAG_FILTER_EVENT, { detail: id }));
  return true;
}

/** Returns (and clears) a tag filter requested before FoodView mounted. */
export function consumePendingTagFilter(user?: User | null): TagFilterId | null {
  const p = pending;
  pending = null;
  if (!hasSpecialAndHealthyFoodVipAccess(user)) return null;
  return p;
}

export const SMART_HUB_EVENT = 'kft:open-smart-hub';
export function openSmartHub(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SMART_HUB_EVENT));
}

import type { User } from '../types';
import type { TagFilterId } from './dishTags';

/**
 * Smart Menu & Healthy Food access helper — open to all signed-in users so
 * discovery features never unexpectedly redirect to the VIP payment submission modal.
 */
export function hasSpecialAndHealthyFoodVipAccess(_user?: User | null): boolean {
  return true;
}

/**
 * In-memory handoff from the Smart Menu to the Food tab: "open Food with this tag pre-selected".
 */
export const TAG_FILTER_EVENT = 'kft:set-tag-filter';
let pending: TagFilterId | null = null;

export function requestTagFilter(id: TagFilterId, _user?: User | null): boolean {
  pending = id;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(TAG_FILTER_EVENT, { detail: id }));
  return true;
}

/** Returns (and clears) a tag filter requested before FoodView mounted. */
export function consumePendingTagFilter(_user?: User | null): TagFilterId | null {
  const p = pending;
  pending = null;
  return p;
}

export const SMART_HUB_EVENT = 'kft:open-smart-hub';
export function openSmartHub(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SMART_HUB_EVENT));
}

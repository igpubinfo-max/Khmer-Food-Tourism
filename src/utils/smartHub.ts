import { isUserVipActive, type User } from '../types';
import type { TagFilterId } from './dishTags';

/**
 * Authoritative VIP subscription verification for Special Menu & Healthy Food features.
 * Enforces active, verified VIP membership (or admin role) in both service helpers and UI.
 */
export function hasSpecialAndHealthyFoodVipAccess(user?: User | null): boolean {
  if (!user) return false;
  return Boolean(isUserVipActive(user) || user.role === 'admin');
}

/**
 * In-memory handoff from the Smart Menu to the Food tab: "open Food with this tag pre-selected".
 * Restricted to verified VIP accounts; returns false and blocks state change for free users.
 */
export const TAG_FILTER_EVENT = 'kft:set-tag-filter';
let pending: TagFilterId | null = null;

export function requestTagFilter(id: TagFilterId, user?: User | null): boolean {
  if (id !== 'all' && user !== undefined && !hasSpecialAndHealthyFoodVipAccess(user)) {
    return false;
  }
  pending = id;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(TAG_FILTER_EVENT, { detail: id }));
  return true;
}

/** Returns (and clears) a tag filter requested before FoodView mounted, verifying VIP access if user is provided. */
export function consumePendingTagFilter(user?: User | null): TagFilterId | null {
  const p = pending;
  pending = null;
  if (p && p !== 'all' && user !== undefined && !hasSpecialAndHealthyFoodVipAccess(user)) {
    return null;
  }
  return p;
}

export const SMART_HUB_EVENT = 'kft:open-smart-hub';
export function openSmartHub(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SMART_HUB_EVENT));
}

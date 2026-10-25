import type { TagFilterId } from './dishTags';

/**
 * In-memory handoff from the Smart Menu to the Food tab: "open Food with this tag pre-selected".
 * No storage keys are used.
 */
export const TAG_FILTER_EVENT = 'kft:set-tag-filter';
let pending: TagFilterId | null = null;

export function requestTagFilter(id: TagFilterId): void {
  pending = id;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(TAG_FILTER_EVENT, { detail: id }));
}

/** Returns (and clears) a tag filter requested before FoodView mounted. */
export function consumePendingTagFilter(): TagFilterId | null {
  const p = pending;
  pending = null;
  return p;
}

export const SMART_HUB_EVENT = 'kft:open-smart-hub';
export function openSmartHub(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SMART_HUB_EVENT));
}

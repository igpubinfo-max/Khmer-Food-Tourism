/**
 * Lightweight engagement tracker used for a one-time, gentle rating prompt.
 *
 * - Counts "meaningful actions" (favorite, share, check-in).
 * - After the 5th action it fires a single window event ('kft:rate-prompt').
 * - It stores ONE tiny, separate localStorage entry. It never reads or writes
 *   vault / wishlist / bookmark / photo keys.
 */
const ENGAGEMENT_KEY = 'kft_engagement_v1';
export const RATE_PROMPT_THRESHOLD = 5;
export const RATE_PROMPT_EVENT = 'kft:rate-prompt';

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.khmerfood.tourism';

interface EngagementState {
  count: number;
  prompted: boolean;
}

function read(): EngagementState {
  try {
    const raw = localStorage.getItem(ENGAGEMENT_KEY);
    if (!raw) return { count: 0, prompted: false };
    const parsed = JSON.parse(raw) as Partial<EngagementState>;
    return { count: Number(parsed.count) || 0, prompted: Boolean(parsed.prompted) };
  } catch {
    return { count: 0, prompted: false };
  }
}

function write(state: EngagementState) {
  try {
    localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable: silently skip (prompt simply never shows)
  }
}

export type MeaningfulAction = 'favorite' | 'share' | 'check_in';

/** Call after a user completes a meaningful action. Safe to call anywhere. */
export function recordMeaningfulAction(_action: MeaningfulAction): void {
  const state = read();
  if (state.prompted) return;
  state.count += 1;
  if (state.count >= RATE_PROMPT_THRESHOLD) {
    state.prompted = true; // shown once only
    write(state);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(RATE_PROMPT_EVENT));
    }
    return;
  }
  write(state);
}

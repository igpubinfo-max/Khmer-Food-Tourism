import { useEffect, useState } from 'react';
import { isUserVipActive, parseSafeDateMs, resolveUserActualVipPlanDays, type User } from '../types';
import { toLocalDayKey } from './dailyHabit';

/**
 * "Taste 30 dishes -> 30 days of VIP" reward program.
 *
 * What counts as a successful food check-in: tapping "I tried it" (Food Passport) on a dish that has NOT been counted before
 * for this account. Two rules keep it honest:
 *  - each dish counts once per account (un-stamping and re-stamping never adds progress),
 *  - at most FOOD_CHECKIN_DAILY_CAP new dishes count per calendar day (so 30 takes at least 10 days).
 *
 * Tracking is a small per-account ledger on the device. The reward itself is granted exactly once per account: the account
 * record (`User.foodCheckInRewardAt`, synced to the cloud) and a deterministic reward transaction are the authoritative
 * guards, so wiping app data or switching device can never produce a second reward.
 */
export const FOOD_CHECKIN_REWARD_TARGET = 30;
export const FOOD_CHECKIN_REWARD_VIP_DAYS = 30;
export const FOOD_CHECKIN_DAILY_CAP = 3;
export const FOOD_CHECKIN_LEDGER_KEY = 'kft_v3_food_checkin_ledger_v1';
export const FOOD_CHECKIN_CHANGED_EVENT = 'kft:food-checkin-changed';

export interface CheckInEntry {
  foodId: string;
  /** Local calendar day the check-in was counted on, `YYYY-MM-DD`. */
  day: string;
  at: string;
}

export interface CheckInLedger {
  entries: CheckInEntry[];
  /** Set once the VIP reward was granted (local copy of the account-level guard). */
  grantedAt?: string;
}

export type CheckInOutcome =
  | { kind: 'counted'; progress: number; todayCount: number }
  | { kind: 'reached'; progress: number }
  | { kind: 'duplicate'; progress: number }
  | { kind: 'daily_cap'; progress: number }
  | { kind: 'already_granted' }
  | { kind: 'ineligible' };

export const emptyLedger = (): CheckInLedger => ({ entries: [] });

/** Never trust stored data: keep only well-formed entries, one per dish, at most TARGET of them. */
export function sanitizeLedger(raw: unknown): CheckInLedger {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<CheckInLedger>;
  const seen = new Set<string>();
  const entries: CheckInEntry[] = [];
  for (const e of Array.isArray(r.entries) ? r.entries : []) {
    if (!e || typeof e.foodId !== 'string' || !e.foodId || typeof e.day !== 'string' || seen.has(e.foodId)) continue;
    seen.add(e.foodId);
    entries.push({ foodId: e.foodId, day: e.day, at: typeof e.at === 'string' ? e.at : '' });
    if (entries.length >= FOOD_CHECKIN_REWARD_TARGET) break;
  }
  return { entries, grantedAt: typeof r.grantedAt === 'string' && r.grantedAt ? r.grantedAt : undefined };
}

export const ledgerProgress = (l: CheckInLedger): number => l.entries.length;

export const ledgerTodayCount = (l: CheckInLedger, day: string): number => l.entries.filter((e) => e.day === day).length;

/** Pure transition for one "I tried it" tap. */
export function applyCheckIn(
  ledger: CheckInLedger,
  foodId: string,
  now: Date = new Date()
): { ledger: CheckInLedger; outcome: CheckInOutcome } {
  const l = sanitizeLedger(ledger);
  if (l.grantedAt) return { ledger: l, outcome: { kind: 'already_granted' } };
  const progress = ledgerProgress(l);
  // Target already reached but the grant did not complete (e.g. app closed in between): ask for the grant again.
  if (progress >= FOOD_CHECKIN_REWARD_TARGET) return { ledger: l, outcome: { kind: 'reached', progress } };
  if (l.entries.some((e) => e.foodId === foodId)) return { ledger: l, outcome: { kind: 'duplicate', progress } };
  const day = toLocalDayKey(now);
  if (ledgerTodayCount(l, day) >= FOOD_CHECKIN_DAILY_CAP) return { ledger: l, outcome: { kind: 'daily_cap', progress } };

  const next: CheckInLedger = { ...l, entries: [...l.entries, { foodId, day, at: now.toISOString() }] };
  const nextProgress = ledgerProgress(next);
  if (nextProgress >= FOOD_CHECKIN_REWARD_TARGET) return { ledger: next, outcome: { kind: 'reached', progress: nextProgress } };
  return { ledger: next, outcome: { kind: 'counted', progress: nextProgress, todayCount: ledgerTodayCount(next, day) } };
}

/* --------------------------------- storage --------------------------------- */

function readAll(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(FOOD_CHECKIN_LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Ledger of one account. Legacy ids are merged so a changed canonical id never loses progress. */
export function loadLedgerForUser(userId: string, legacyIds: string[] = []): CheckInLedger {
  const all = readAll();
  const seen = new Set<string>();
  const entries: CheckInEntry[] = [];
  let grantedAt: string | undefined;
  for (const id of [userId, ...legacyIds]) {
    if (!id) continue;
    const l = sanitizeLedger(all[id]);
    grantedAt = grantedAt || l.grantedAt;
    for (const e of l.entries) {
      if (seen.has(e.foodId)) continue;
      seen.add(e.foodId);
      entries.push(e);
    }
  }
  return sanitizeLedger({ entries, grantedAt });
}

export function saveLedgerForUser(userId: string, ledger: CheckInLedger): void {
  if (!userId) return;
  try {
    const all = readAll();
    all[userId] = sanitizeLedger(ledger);
    localStorage.setItem(FOOD_CHECKIN_LEDGER_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable: progress simply is not persisted
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(FOOD_CHECKIN_CHANGED_EVENT));
}

export function markLedgerGranted(userId: string, legacyIds: string[] = [], at: string = new Date().toISOString()): void {
  const l = loadLedgerForUser(userId, legacyIds);
  saveLedgerForUser(userId, { ...l, grantedAt: l.grantedAt || at });
}

/* ------------------------------ VIP window math ------------------------------ */

export interface RewardVipWindow {
  /** The member already had active VIP when the reward was earned. */
  wasVipActive: boolean;
  startDate: string;
  expiryDate: string;
  durationDays: number;
}

/**
 * When does the rewarded VIP run? New / expired VIP: `rewardDays` from now. Active VIP: `rewardDays` ADDED to the current
 * expiry (original start date and plan length are kept). It can only ever extend a membership, never shorten a paid one.
 */
export function computeRewardVipWindow(
  user: User,
  now: Date = new Date(),
  rewardDays: number = FOOD_CHECKIN_REWARD_VIP_DAYS
): RewardVipWindow {
  const dayMs = 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();
  const wasVipActive = isUserVipActive(user);
  const existingExpiryMs = parseSafeDateMs(user.subscriptionExpiryDate || user.vipExpiresAt);
  const baseMs = wasVipActive && existingExpiryMs > nowMs ? existingExpiryMs : nowMs;
  const startDate =
    wasVipActive && user.subscriptionStartDate && parseSafeDateMs(user.subscriptionStartDate) > 0
      ? user.subscriptionStartDate
      : now.toISOString();
  return {
    wasVipActive,
    startDate,
    expiryDate: new Date(baseMs + rewardDays * dayMs).toISOString(),
    durationDays: wasVipActive ? resolveUserActualVipPlanDays(user) : rewardDays,
  };
}

/* ------------------- synchronous hand-off from the stamp button ------------------- */

type StampHandler = (foodId: string) => CheckInOutcome;
let stampHandler: StampHandler | null = null;

/** Registered by the app shell (knows the signed-in user). The stamp button stays free of any context subscription. */
export function setFoodCheckInHandler(handler: StampHandler | null): void {
  stampHandler = handler;
}

/** Called right after a dish was stamped. Returns what happened so the button can show an accurate message. */
export function reportFoodStamped(foodId: string): CheckInOutcome {
  try {
    return stampHandler ? stampHandler(foodId) : { kind: 'ineligible' };
  } catch {
    return { kind: 'ineligible' };
  }
}

/* ----------------------------------- UI hook ----------------------------------- */

export interface FoodCheckInProgress {
  progress: number;
  target: number;
  todayCount: number;
  dailyCap: number;
  granted: boolean;
}

export function useFoodCheckInProgress(userId?: string, legacyIds: string[] = [], rewardGrantedAt?: string): FoodCheckInProgress {
  const read = (): FoodCheckInProgress => {
    const l = userId ? loadLedgerForUser(userId, legacyIds) : emptyLedger();
    return {
      progress: ledgerProgress(l),
      target: FOOD_CHECKIN_REWARD_TARGET,
      todayCount: ledgerTodayCount(l, toLocalDayKey()),
      dailyCap: FOOD_CHECKIN_DAILY_CAP,
      granted: Boolean(l.grantedAt || rewardGrantedAt),
    };
  };
  const [state, setState] = useState<FoodCheckInProgress>(read);
  const legacyKey = legacyIds.join('|');
  useEffect(() => {
    const refresh = () => setState(read());
    refresh();
    window.addEventListener(FOOD_CHECKIN_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(FOOD_CHECKIN_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, legacyKey, rewardGrantedAt]);
  return state;
}

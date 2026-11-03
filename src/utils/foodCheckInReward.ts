import { useEffect, useState } from 'react';
import { isUserVipActive, parseSafeDateMs, resolveUserActualVipPlanDays, type User } from '../types';

/**
 * "Taste 30 dishes -> 30 days of VIP" reward program with strict anti-cheat rules:
 *
 * 1. Authoritative Internet Server Time (no device `new Date()` trust):
 *    - Daily check-in dates are derived strictly from verified internet server time
 *      (Cloudflare/Supabase `/cdn-cgi/trace` epoch timestamp or HTTP `Date` header)
 *      anchored to a monotonic session timer (`performance.now()`), converted to
 *      Cambodia Standard Time (`UTC+7`, `YYYY-MM-DD`).
 *    - Changing the phone's system date, time, or timezone cannot advance or repeat days.
 *
 * 2. Max 1 Check-In per Server Day (`FOOD_CHECKIN_DAILY_CAP = 1`):
 *    - At most 1 dish per server calendar day counts toward the 30-point reward
 *      (requiring 30 distinct server days and 30 distinct dishes).
 *    - Un-stamping and re-stamping the same dish never adds points.
 *
 * 3. One-Time Reward Lock (Local + Supabase Cloud by User ID and Email):
 *    - Granted strictly once per user account, recorded in local storage and synced to
 *      Supabase Cloud indexed by both canonical/legacy `userId` and normalized `email`.
 */
export const FOOD_CHECKIN_REWARD_TARGET = 30;
export const FOOD_CHECKIN_REWARD_VIP_DAYS = 30;
export const FOOD_CHECKIN_DAILY_CAP = 1;
export const FOOD_CHECKIN_LEDGER_KEY = 'kft_v3_food_checkin_ledger_v1';
export const FOOD_CHECKIN_CLAIMS_KEY = 'kft_v3_food_checkin_reward_claims_v1';
export const FOOD_CHECKIN_CLOUD_CLAIMS_KEY = 'kft_cloud_food_checkin_reward_claims_v1';
export const FOOD_CHECKIN_CHANGED_EVENT = 'kft:food-checkin-changed';

/** Cambodia Standard Time offset (UTC+7) so changing device timezone cannot shift the day boundary. */
const CAMBODIA_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
/** Monotonic anchor validity window (10 minutes) before requiring a fresh server time check. */
const SERVER_CLOCK_TTL_MS = 10 * 60 * 1000;
const MIN_VALID_SERVER_EPOCH_MS = Date.UTC(2025, 0, 1);
const MAX_VALID_SERVER_EPOCH_MS = Date.UTC(2100, 0, 1);

const SERVER_TIME_ENDPOINTS: readonly string[] = [
  'https://ryvltobwuwuulazqjnza.supabase.co/cdn-cgi/trace',
  'https://www.cloudflare.com/cdn-cgi/trace',
  'https://1.1.1.1/cdn-cgi/trace',
  'https://igpubinfo-max.github.io/Khmer-Food-Tourism/version.json',
];

export interface CheckInEntry {
  foodId: string;
  /** Verified server calendar day (`YYYY-MM-DD` in UTC+7). */
  day: string;
  at: string;
}

export interface CheckInLedger {
  entries: CheckInEntry[];
  /** Set once the VIP reward was granted (local copy of the account-level guard). */
  grantedAt?: string;
}

export interface RewardClaimRegistry {
  byUserId: Record<string, string>;
  byEmail: Record<string, string>;
  updatedAt?: string;
}

export type CheckInOutcome =
  | { kind: 'counted'; progress: number; todayCount: number }
  | { kind: 'reached'; progress: number }
  | { kind: 'duplicate'; progress: number }
  | { kind: 'daily_cap'; progress: number }
  | { kind: 'unverified_time'; progress: number }
  | { kind: 'already_granted' }
  | { kind: 'ineligible' };

export const emptyLedger = (): CheckInLedger => ({ entries: [] });

/* ----------------------- Server time verification ----------------------- */

interface ServerClockAnchor {
  serverEpochMs: number;
  perfNowMs: number;
}

let serverClockAnchor: ServerClockAnchor | null = null;
let inFlightClockSync: Promise<number | null> | null = null;

function monotonicNowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return 0;
}

function isValidServerEpochMs(ms: unknown): ms is number {
  return typeof ms === 'number' && Number.isFinite(ms) && ms >= MIN_VALID_SERVER_EPOCH_MS && ms <= MAX_VALID_SERVER_EPOCH_MS;
}

/**
 * Converts a verified server timestamp (`Date` or epoch ms) into a `YYYY-MM-DD` day key
 * in Cambodia Standard Time (`UTC+7`). Never falls back to device `new Date()`.
 */
export function toServerDayKey(serverTime: Date | number): string {
  const ms = typeof serverTime === 'number' ? serverTime : serverTime.getTime();
  if (!Number.isFinite(ms)) return '';
  const kh = new Date(ms + CAMBODIA_UTC_OFFSET_MS);
  const y = kh.getUTCFullYear();
  const m = String(kh.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kh.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Extracts a verified server epoch timestamp (ms) from a trace/JSON body or HTTP `Date` header.
 */
export function parseServerTimeResponse(bodyText: string, dateHeader?: string | null): number | null {
  if (typeof bodyText === 'string' && bodyText.trim()) {
    // 1. Cloudflare / Supabase `/cdn-cgi/trace` format: `ts=1793686806.000`
    const traceMatch = bodyText.match(/(?:^|\n)ts=(\d{10}(?:\.\d+)?)/);
    if (traceMatch) {
      const ms = Math.round(Number(traceMatch[1]) * 1000);
      if (isValidServerEpochMs(ms)) return ms;
    }
    // 2. JSON payload with `unixtime`, `epochMs`, `utc_datetime`, or `datetime`
    if (bodyText.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(bodyText) as Record<string, unknown>;
        if (typeof parsed.epochMs === 'number' && isValidServerEpochMs(parsed.epochMs)) {
          return Math.round(parsed.epochMs);
        }
        if (typeof parsed.unixtime === 'number' && isValidServerEpochMs(parsed.unixtime * 1000)) {
          return Math.round(parsed.unixtime * 1000);
        }
        const iso = typeof parsed.utc_datetime === 'string' ? parsed.utc_datetime : typeof parsed.datetime === 'string' ? parsed.datetime : '';
        if (iso) {
          const parsedIso = Date.parse(iso);
          if (isValidServerEpochMs(parsedIso)) return parsedIso;
        }
      } catch {
        // ignore non-JSON body
      }
    }
  }
  if (typeof dateHeader === 'string' && dateHeader.trim()) {
    const parsedHeader = Date.parse(dateHeader);
    if (isValidServerEpochMs(parsedHeader)) return parsedHeader;
  }
  return null;
}

/**
 * Returns the current verified server timestamp in ms using the monotonic anchor,
 * or `null` if server time has not been verified (or the anchor expired).
 * Strictly never falls back to `Date.now()` or `new Date()`.
 */
export function getVerifiedServerNowMs(): number | null {
  if (!serverClockAnchor) return null;
  const delta = monotonicNowMs() - serverClockAnchor.perfNowMs;
  if (!Number.isFinite(delta) || delta < -1000 || delta > SERVER_CLOCK_TTL_MS) {
    serverClockAnchor = null;
    return null;
  }
  return serverClockAnchor.serverEpochMs + Math.max(0, Math.round(delta));
}

/**
 * Test / internal helper to seed or clear the verified server clock anchor.
 */
export function setVerifiedServerClock(serverEpochMs: number | null): void {
  if (serverEpochMs === null || !isValidServerEpochMs(serverEpochMs)) {
    serverClockAnchor = null;
    return;
  }
  serverClockAnchor = {
    serverEpochMs: Math.round(serverEpochMs),
    perfNowMs: monotonicNowMs(),
  };
}

/**
 * Queries authoritative internet endpoints to verify the true current server time.
 * Safe to call repeatedly; concurrent calls share the same in-flight promise.
 */
export async function syncVerifiedServerClock(customFetch?: typeof fetch): Promise<number | null> {
  const existing = getVerifiedServerNowMs();
  if (existing !== null && !customFetch) return existing;
  if (inFlightClockSync && !customFetch) return inFlightClockSync;

  const fetcher = customFetch || (typeof fetch === 'function' ? fetch : null);
  if (!fetcher) return null;

  const run = (async (): Promise<number | null> => {
    for (const url of SERVER_TIME_ENDPOINTS) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;
      try {
        const res = await fetcher(`${url}${url.includes('?') ? '&' : '?'} _t=${Math.random().toString(36).slice(2)}`.replace(' ', ''), {
          method: 'GET',
          cache: 'no-store',
          signal: controller?.signal,
        });
        if (!res || !res.ok) continue;
        const dateHeader = res.headers && typeof res.headers.get === 'function' ? res.headers.get('date') : null;
        const text = typeof res.text === 'function' ? await res.text() : '';
        const verifiedMs = parseServerTimeResponse(text, dateHeader);
        if (verifiedMs !== null) {
          setVerifiedServerClock(verifiedMs);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(FOOD_CHECKIN_CHANGED_EVENT));
          }
          return verifiedMs;
        }
      } catch {
        // try next endpoint
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    return null;
  })();

  if (!customFetch) {
    inFlightClockSync = run.finally(() => {
      inFlightClockSync = null;
    });
    return inFlightClockSync;
  }
  return run;
}

/* -------------------------- Ledger & counting rules -------------------------- */

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Never trust stored data:
 *  - keep only well-formed entries (`foodId` and `YYYY-MM-DD` `day`),
 *  - each dish (`foodId`) counts at most once per account,
 *  - each server day (`day`) counts at most `FOOD_CHECKIN_DAILY_CAP` (1) dish,
 *  - at most `FOOD_CHECKIN_REWARD_TARGET` (30) entries total.
 */
export function sanitizeLedger(raw: unknown): CheckInLedger {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<CheckInLedger>;
  const seenFoods = new Set<string>();
  const dayCounts = new Map<string, number>();
  const entries: CheckInEntry[] = [];
  for (const e of Array.isArray(r.entries) ? r.entries : []) {
    if (!e || typeof e.foodId !== 'string' || !e.foodId || typeof e.day !== 'string' || !DAY_KEY_RE.test(e.day)) {
      continue;
    }
    if (seenFoods.has(e.foodId)) continue;
    const countForDay = dayCounts.get(e.day) || 0;
    if (countForDay >= FOOD_CHECKIN_DAILY_CAP) continue;
    seenFoods.add(e.foodId);
    dayCounts.set(e.day, countForDay + 1);
    entries.push({ foodId: e.foodId, day: e.day, at: typeof e.at === 'string' ? e.at : '' });
    if (entries.length >= FOOD_CHECKIN_REWARD_TARGET) break;
  }
  return { entries, grantedAt: typeof r.grantedAt === 'string' && r.grantedAt ? r.grantedAt : undefined };
}

export const ledgerProgress = (l: CheckInLedger): number => l.entries.length;

export const ledgerTodayCount = (l: CheckInLedger, day: string): number =>
  day ? l.entries.filter((e) => e.day === day).length : 0;

/**
 * Pure transition for one "I tried it" tap.
 * Requires a verified server timestamp (`verifiedServerTime` or an active `getVerifiedServerNowMs()` anchor).
 * Never falls back to device `new Date()`.
 */
export function applyCheckIn(
  ledger: CheckInLedger,
  foodId: string,
  verifiedServerTime?: Date | number | null
): { ledger: CheckInLedger; outcome: CheckInOutcome } {
  const l = sanitizeLedger(ledger);
  if (l.grantedAt) return { ledger: l, outcome: { kind: 'already_granted' } };
  const progress = ledgerProgress(l);
  // Target already reached: ask for the grant again without adding extra entries.
  if (progress >= FOOD_CHECKIN_REWARD_TARGET) return { ledger: l, outcome: { kind: 'reached', progress } };
  if (!foodId || typeof foodId !== 'string') return { ledger: l, outcome: { kind: 'ineligible' } };
  if (l.entries.some((e) => e.foodId === foodId)) return { ledger: l, outcome: { kind: 'duplicate', progress } };

  const resolvedMs =
    verifiedServerTime instanceof Date
      ? verifiedServerTime.getTime()
      : typeof verifiedServerTime === 'number'
        ? verifiedServerTime
        : getVerifiedServerNowMs();

  if (resolvedMs === null || !isValidServerEpochMs(resolvedMs)) {
    return { ledger: l, outcome: { kind: 'unverified_time', progress } };
  }

  const day = toServerDayKey(resolvedMs);
  if (!DAY_KEY_RE.test(day)) {
    return { ledger: l, outcome: { kind: 'unverified_time', progress } };
  }

  if (ledgerTodayCount(l, day) >= FOOD_CHECKIN_DAILY_CAP) {
    return { ledger: l, outcome: { kind: 'daily_cap', progress } };
  }

  const next: CheckInLedger = {
    ...l,
    entries: [...l.entries, { foodId, day, at: new Date(resolvedMs).toISOString() }],
  };
  const nextProgress = ledgerProgress(next);
  if (nextProgress >= FOOD_CHECKIN_REWARD_TARGET) {
    return { ledger: next, outcome: { kind: 'reached', progress: nextProgress } };
  }
  return {
    ledger: next,
    outcome: { kind: 'counted', progress: nextProgress, todayCount: ledgerTodayCount(next, day) },
  };
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
  const entries: CheckInEntry[] = [];
  let grantedAt: string | undefined;
  for (const id of [userId, ...legacyIds]) {
    if (!id) continue;
    const l = sanitizeLedger(all[id]);
    grantedAt = grantedAt || l.grantedAt;
    for (const e of l.entries) {
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

export function markLedgerGranted(userId: string, legacyIds: string[] = [], at?: string): void {
  const verifiedMs = getVerifiedServerNowMs();
  const fallbackIso = at || (verifiedMs ? new Date(verifiedMs).toISOString() : 'granted');
  const l = loadLedgerForUser(userId, legacyIds);
  saveLedgerForUser(userId, { ...l, grantedAt: l.grantedAt || fallbackIso });
}

/* ---------------- One-Time Reward Lock (User ID + Email) ---------------- */

export function normalizeRewardEmail(email?: string | null): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function sanitizeClaimRegistry(raw: unknown): RewardClaimRegistry {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<RewardClaimRegistry>;
  const byUserId: Record<string, string> = {};
  const byEmail: Record<string, string> = {};
  if (r.byUserId && typeof r.byUserId === 'object') {
    for (const [k, v] of Object.entries(r.byUserId)) {
      if (k && typeof v === 'string' && v) byUserId[k.trim()] = v;
    }
  }
  if (r.byEmail && typeof r.byEmail === 'object') {
    for (const [k, v] of Object.entries(r.byEmail)) {
      const nk = normalizeRewardEmail(k);
      if (nk && typeof v === 'string' && v) byEmail[nk] = v;
    }
  }
  return {
    byUserId,
    byEmail,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined,
  };
}

export function loadLocalClaimRegistry(): RewardClaimRegistry {
  try {
    const raw = localStorage.getItem(FOOD_CHECKIN_CLAIMS_KEY);
    return raw ? sanitizeClaimRegistry(JSON.parse(raw)) : { byUserId: {}, byEmail: {} };
  } catch {
    return { byUserId: {}, byEmail: {} };
  }
}

export function saveLocalClaimRegistry(reg: RewardClaimRegistry): RewardClaimRegistry {
  const clean = sanitizeClaimRegistry(reg);
  try {
    localStorage.setItem(FOOD_CHECKIN_CLAIMS_KEY, JSON.stringify(clean));
  } catch {
    // ignore storage quota errors
  }
  return clean;
}

export function mergeClaimRegistries(
  first?: RewardClaimRegistry | null,
  second?: RewardClaimRegistry | null
): RewardClaimRegistry {
  const a = sanitizeClaimRegistry(first);
  const b = sanitizeClaimRegistry(second);
  return {
    byUserId: { ...b.byUserId, ...a.byUserId },
    byEmail: { ...b.byEmail, ...a.byEmail },
    updatedAt: a.updatedAt || b.updatedAt,
  };
}

export interface RewardIdentityCheck {
  userId?: string;
  legacyIds?: string[];
  email?: string | null;
  foodCheckInRewardAt?: string;
}

/**
 * Checks if this user (by `userId`, `legacyIds`, OR normalized `email`) has ever claimed
 * the 30-day VIP food check-in reward across the user record, local ledger, local claim
 * registry, or Supabase Cloud claim registry.
 */
export function findExistingRewardClaimAt(
  identity: RewardIdentityCheck,
  cloudRegistry?: RewardClaimRegistry | null
): string | undefined {
  if (typeof identity.foodCheckInRewardAt === 'string' && identity.foodCheckInRewardAt) {
    return identity.foodCheckInRewardAt;
  }
  const ids = [identity.userId, ...(identity.legacyIds || [])].filter(
    (id): id is string => typeof id === 'string' && Boolean(id.trim())
  );
  if (identity.userId) {
    const ledger = loadLedgerForUser(identity.userId, identity.legacyIds || []);
    if (ledger.grantedAt) return ledger.grantedAt;
  }
  const merged = mergeClaimRegistries(loadLocalClaimRegistry(), cloudRegistry);
  for (const id of ids) {
    if (merged.byUserId[id]) return merged.byUserId[id];
  }
  const normEmail = normalizeRewardEmail(identity.email);
  if (normEmail && merged.byEmail[normEmail]) {
    return merged.byEmail[normEmail];
  }
  return undefined;
}

export function hasClaimedFoodCheckInReward(
  identity: RewardIdentityCheck,
  cloudRegistry?: RewardClaimRegistry | null
): boolean {
  return Boolean(findExistingRewardClaimAt(identity, cloudRegistry));
}

/**
 * Records a one-time reward claim locally (both in the claim registry by `userId` + `email`
 * and in the user's ledger) and returns the merged registry ready to sync to Supabase Cloud.
 */
export function recordFoodCheckInRewardClaim(
  identity: RewardIdentityCheck,
  atIso: string,
  cloudRegistry?: RewardClaimRegistry | null
): RewardClaimRegistry {
  const merged = mergeClaimRegistries(loadLocalClaimRegistry(), cloudRegistry);
  const effectiveAt = findExistingRewardClaimAt(identity, merged) || atIso;
  const ids = [identity.userId, ...(identity.legacyIds || [])].filter(
    (id): id is string => typeof id === 'string' && Boolean(id.trim())
  );
  for (const id of ids) {
    if (!merged.byUserId[id]) merged.byUserId[id] = effectiveAt;
  }
  const normEmail = normalizeRewardEmail(identity.email);
  if (normEmail && !merged.byEmail[normEmail]) {
    merged.byEmail[normEmail] = effectiveAt;
  }
  merged.updatedAt = effectiveAt;
  const saved = saveLocalClaimRegistry(merged);
  if (identity.userId) {
    markLedgerGranted(identity.userId, identity.legacyIds || [], effectiveAt);
  }
  return saved;
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
 * When does the rewarded VIP run? New / expired VIP: `rewardDays` from `now`. Active VIP: `rewardDays` ADDED to the current
 * expiry (original start date and plan length are kept). It can only ever extend a membership, never shorten a paid one.
 */
export function computeRewardVipWindow(
  user: User,
  now: Date,
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
  serverTimeVerified: boolean;
}

export function useFoodCheckInProgress(
  userId?: string,
  legacyIds: string[] = [],
  rewardGrantedAt?: string,
  userEmail?: string
): FoodCheckInProgress {
  const read = (): FoodCheckInProgress => {
    const l = userId ? loadLedgerForUser(userId, legacyIds) : emptyLedger();
    const verifiedMs = getVerifiedServerNowMs();
    const serverDay = verifiedMs !== null ? toServerDayKey(verifiedMs) : '';
    const claimed = userId
      ? hasClaimedFoodCheckInReward({
          userId,
          legacyIds,
          email: userEmail,
          foodCheckInRewardAt: rewardGrantedAt,
        })
      : Boolean(rewardGrantedAt);
    return {
      progress: ledgerProgress(l),
      target: FOOD_CHECKIN_REWARD_TARGET,
      todayCount: serverDay ? ledgerTodayCount(l, serverDay) : 0,
      dailyCap: FOOD_CHECKIN_DAILY_CAP,
      granted: Boolean(l.grantedAt || claimed),
      serverTimeVerified: verifiedMs !== null,
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
  }, [userId, legacyKey, rewardGrantedAt, userEmail]);
  return state;
}

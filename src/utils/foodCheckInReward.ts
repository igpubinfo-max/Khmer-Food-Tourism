import { useEffect, useState } from 'react';
import {
  getAuthoritativeServerNowMs,
  isAdminAccount,
  isUserVipActive,
  parseSafeDateMs,
  resolveUserActualVipPlanDays,
  setAuthoritativeServerNowMs,
  type User,
} from '../types';

/**
 * "Taste 30 dishes -> 30 days of VIP" & Free 30-Day VIP Trial system with strict anti-cheat rules:
 *
 * 1. Authoritative Internet Server Time (no device `new Date()` trust):
 *    - Daily check-in dates and remaining trial days are derived strictly from verified internet
 *      server time anchored to a monotonic session timer (`performance.now()`), converted to
 *      Cambodia Standard Time (`UTC+7`, `YYYY-MM-DD`).
 *    - Changing the phone's system date, time, or timezone cannot advance, repeat, or extend days.
 *
 * 2. Max 1 Check-In per Server Day (`FOOD_CHECKIN_DAILY_CAP = 1`):
 *    - At most 1 dish per server calendar day counts toward the 30-point reward
 *      (requiring 30 distinct server days and 30 distinct dishes).
 *    - Un-stamping and re-stamping the same dish never adds points.
 *
 * 3. Permanent Backend Free Trial & One-Time Reward Lock (Local + Cloud by User ID and Email):
 *    - Stored permanently on the `User` record (`freeTrialActivated`, `freeTrialActivatedAt`,
 *      `freeTrialExpiresAt`, `foodCheckInRewardAt`, `foodCheckInLedger`) and synced to
 *      Supabase & Secondary Cloud indexed by canonical/legacy `userId` and normalized `email`.
 *    - Preserves original activation date, expiry date, and remaining days across app updates,
 *      reinstallations, and device changes.
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
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Authoritative server time endpoints ordered with CORS-enabled JSON time APIs first
 * so Capacitor Android/iOS WebViews (`Origin: https://localhost`) and browsers always succeed.
 */
const SERVER_TIME_ENDPOINTS: readonly string[] = [
  'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Phnom_Penh',
  'https://ntfy.sh/kft_cloud_sync_v270_prod_9482/json?poll=1&since=all',
  'https://ryvltobwuwuulazqjnza.supabase.co/cdn-cgi/trace',
  'https://www.cloudflare.com/cdn-cgi/trace',
  'https://1.1.1.1/cdn-cgi/trace',
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

export interface FreeTrialClaimWindow {
  activatedAt: string;
  expiresAt: string;
  durationDays: number;
}

export interface RewardClaimRegistry {
  byUserId: Record<string, string>;
  byEmail: Record<string, string>;
  trialsByUserId?: Record<string, FreeTrialClaimWindow>;
  trialsByEmail?: Record<string, FreeTrialClaimWindow>;
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
  return (
    typeof ms === 'number' &&
    Number.isFinite(ms) &&
    ms >= MIN_VALID_SERVER_EPOCH_MS &&
    ms <= MAX_VALID_SERVER_EPOCH_MS
  );
}

export function isRealIsoTimestamp(raw?: string | null): boolean {
  if (!raw || typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'granted') return false;
  const ms = parseSafeDateMs(trimmed);
  return ms >= Date.UTC(2024, 0, 1) && ms <= MAX_VALID_SERVER_EPOCH_MS;
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
 * Extracts a verified server epoch timestamp (ms) from a trace/JSON/NDJSON body or HTTP `Date` header.
 */
export function parseServerTimeResponse(bodyText: string, dateHeader?: string | null): number | null {
  if (typeof bodyText === 'string' && bodyText.trim()) {
    const trimmed = bodyText.trim();
    // 1. Cloudflare / Supabase `/cdn-cgi/trace` format: `ts=1793686806.000`
    const traceMatch = trimmed.match(/(?:^|\n)ts=(\d{10}(?:\.\d+)?)/);
    if (traceMatch) {
      const ms = Math.round(Number(traceMatch[1]) * 1000);
      if (isValidServerEpochMs(ms)) return ms;
    }

    // 2. JSON or NDJSON payload (timeapi.io, worldtimeapi, ntfy.sh)
    if (trimmed.startsWith('{')) {
      const lines = trimmed.split(/\r?\n/).filter(Boolean);
      let latestNtfyTimeMs: number | null = null;
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as Record<string, unknown>;
          if (typeof parsed.epochMs === 'number' && isValidServerEpochMs(parsed.epochMs)) {
            return Math.round(parsed.epochMs);
          }
          if (typeof parsed.unixtime === 'number' && isValidServerEpochMs(parsed.unixtime * 1000)) {
            return Math.round(parsed.unixtime * 1000);
          }
          // timeapi.io structured fields: year, month, day, hour, minute, seconds, milliSeconds, timeZone
          if (
            typeof parsed.year === 'number' &&
            typeof parsed.month === 'number' &&
            typeof parsed.day === 'number' &&
            typeof parsed.hour === 'number' &&
            typeof parsed.minute === 'number'
          ) {
            const sec = typeof parsed.seconds === 'number' ? parsed.seconds : 0;
            const msPart = typeof parsed.milliSeconds === 'number' ? parsed.milliSeconds : 0;
            const tz = typeof parsed.timeZone === 'string' ? parsed.timeZone : '';
            const offsetMs = tz === 'Asia/Phnom_Penh' ? CAMBODIA_UTC_OFFSET_MS : 0;
            const computedUtcMs =
              Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, sec, msPart) - offsetMs;
            if (isValidServerEpochMs(computedUtcMs)) {
              return Math.round(computedUtcMs);
            }
          }
          const rawIso =
            typeof parsed.utc_datetime === 'string'
              ? parsed.utc_datetime
              : typeof parsed.datetime === 'string'
                ? parsed.datetime
                : typeof parsed.dateTime === 'string'
                  ? parsed.dateTime
                  : typeof parsed.currentDateTime === 'string'
                    ? parsed.currentDateTime
                    : '';
          if (rawIso) {
            const hasZone = /Z$|[+-]\d{2}:?\d{2}$/i.test(rawIso.trim());
            const tz = typeof parsed.timeZone === 'string' ? parsed.timeZone : '';
            const isoWithZone =
              !hasZone && tz === 'Asia/Phnom_Penh'
                ? `${rawIso.trim()}+07:00`
                : !hasZone
                  ? `${rawIso.trim()}Z`
                  : rawIso.trim();
            const parsedIso = Date.parse(isoWithZone);
            if (isValidServerEpochMs(parsedIso)) return parsedIso;
          }
          // ntfy.sh message `time` field (unix seconds)
          if (typeof parsed.time === 'number' && isValidServerEpochMs(parsed.time * 1000)) {
            const candidateMs = Math.round(parsed.time * 1000);
            if (latestNtfyTimeMs === null || candidateMs > latestNtfyTimeMs) {
              latestNtfyTimeMs = candidateMs;
            }
          }
        } catch {
          // ignore malformed line
        }
      }
      if (latestNtfyTimeMs !== null && isValidServerEpochMs(latestNtfyTimeMs)) {
        return latestNtfyTimeMs;
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
 * Also updates the global authoritative server clock in `types/index.ts`.
 */
export function setVerifiedServerClock(serverEpochMs: number | null): void {
  if (serverEpochMs === null || !isValidServerEpochMs(serverEpochMs)) {
    serverClockAnchor = null;
    return;
  }
  const cleanMs = Math.round(serverEpochMs);
  serverClockAnchor = {
    serverEpochMs: cleanMs,
    perfNowMs: monotonicNowMs(),
  };
  setAuthoritativeServerNowMs(cleanMs);
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
      const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
      try {
        const res = await fetcher(`${url}${url.includes('?') ? '&' : '?'}_t=${Math.random().toString(36).slice(2)}`, {
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

    // Fallback CORS-enabled POST ping to ntfy.sh which returns exact current server unix epoch in JSON `{"time": ...}`
    if (!customFetch) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
      try {
        const pingRes = await fetcher('https://ntfy.sh/kft_server_clock_ping_v1', {
          method: 'POST',
          body: 'ping',
          cache: 'no-store',
          signal: controller?.signal,
        });
        if (pingRes && pingRes.ok) {
          const text = typeof pingRes.text === 'function' ? await pingRes.text() : '';
          const verifiedMs = parseServerTimeResponse(text, null);
          if (verifiedMs !== null) {
            setVerifiedServerClock(verifiedMs);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent(FOOD_CHECKIN_CHANGED_EVENT));
            }
            return verifiedMs;
          }
        }
      } catch {
        // ignore ping failure
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
  if (l.grantedAt && isRealIsoTimestamp(l.grantedAt)) return { ledger: l, outcome: { kind: 'already_granted' } };
  if (l.grantedAt === 'granted') return { ledger: l, outcome: { kind: 'already_granted' } };
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

/** Ledger of one account. Legacy ids and optional cloud user ledger are merged so progress is never lost across app updates or device changes. */
export function loadLedgerForUser(
  userId: string,
  legacyIds: string[] = [],
  cloudUserLedger?: CheckInLedger | null
): CheckInLedger {
  const all = readAll();
  const entries: CheckInEntry[] = [];
  let grantedAt: string | undefined;
  if (cloudUserLedger) {
    const cl = sanitizeLedger(cloudUserLedger);
    if (cl.grantedAt && isRealIsoTimestamp(cl.grantedAt)) {
      grantedAt = cl.grantedAt;
    }
    for (const e of cl.entries) {
      entries.push(e);
    }
  }
  for (const id of [userId, ...legacyIds]) {
    if (!id) continue;
    const l = sanitizeLedger(all[id]);
    if (l.grantedAt) {
      if (!grantedAt || (grantedAt === 'granted' && isRealIsoTimestamp(l.grantedAt))) {
        grantedAt = l.grantedAt;
      }
    }
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
  const verifiedMs = getVerifiedServerNowMs() || getAuthoritativeServerNowMs();
  const fallbackIso =
    at && isRealIsoTimestamp(at)
      ? at
      : at || (verifiedMs ? new Date(verifiedMs).toISOString() : new Date().toISOString());
  const l = loadLedgerForUser(userId, legacyIds);
  const nextGrantedAt =
    l.grantedAt && isRealIsoTimestamp(l.grantedAt) ? l.grantedAt : fallbackIso;
  saveLedgerForUser(userId, { ...l, grantedAt: nextGrantedAt });
}

/* ---------------- One-Time Reward & Free Trial Lock (User ID + Email) ---------------- */

export function normalizeRewardEmail(email?: string | null): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function sanitizeTrialWindowMap(raw: unknown): Record<string, FreeTrialClaimWindow> {
  const out: Record<string, FreeTrialClaimWindow> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!k || !v || typeof v !== 'object') continue;
    const w = v as Partial<FreeTrialClaimWindow>;
    if (typeof w.activatedAt === 'string' && w.activatedAt && typeof w.expiresAt === 'string' && w.expiresAt) {
      out[k.trim()] = {
        activatedAt: w.activatedAt,
        expiresAt: w.expiresAt,
        durationDays: typeof w.durationDays === 'number' && w.durationDays >= 1 ? w.durationDays : FOOD_CHECKIN_REWARD_VIP_DAYS,
      };
    }
  }
  return out;
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
  const trialsByUserId = sanitizeTrialWindowMap(r.trialsByUserId);
  const rawTrialsByEmail = sanitizeTrialWindowMap(r.trialsByEmail);
  const trialsByEmail: Record<string, FreeTrialClaimWindow> = {};
  for (const [k, v] of Object.entries(rawTrialsByEmail)) {
    const nk = normalizeRewardEmail(k);
    if (nk) trialsByEmail[nk] = v;
  }
  return {
    byUserId,
    byEmail,
    ...(Object.keys(trialsByUserId).length > 0 ? { trialsByUserId } : {}),
    ...(Object.keys(trialsByEmail).length > 0 ? { trialsByEmail } : {}),
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

function pickBetterClaimTimestamp(a?: string, b?: string): string | undefined {
  if (isRealIsoTimestamp(a) && isRealIsoTimestamp(b)) {
    return parseSafeDateMs(a) <= parseSafeDateMs(b) ? a : b;
  }
  if (isRealIsoTimestamp(a)) return a;
  if (isRealIsoTimestamp(b)) return b;
  return a || b;
}

export function mergeClaimRegistries(
  first?: RewardClaimRegistry | null,
  second?: RewardClaimRegistry | null
): RewardClaimRegistry {
  const a = sanitizeClaimRegistry(first);
  const b = sanitizeClaimRegistry(second);
  const byUserId: Record<string, string> = { ...b.byUserId };
  for (const [k, v] of Object.entries(a.byUserId)) {
    byUserId[k] = pickBetterClaimTimestamp(v, byUserId[k]) || v;
  }
  const byEmail: Record<string, string> = { ...b.byEmail };
  for (const [k, v] of Object.entries(a.byEmail)) {
    byEmail[k] = pickBetterClaimTimestamp(v, byEmail[k]) || v;
  }
  const trialsByUserId: Record<string, FreeTrialClaimWindow> = {
    ...(b.trialsByUserId || {}),
    ...(a.trialsByUserId || {}),
  };
  const trialsByEmail: Record<string, FreeTrialClaimWindow> = {
    ...(b.trialsByEmail || {}),
    ...(a.trialsByEmail || {}),
  };
  return {
    byUserId,
    byEmail,
    ...(Object.keys(trialsByUserId).length > 0 ? { trialsByUserId } : {}),
    ...(Object.keys(trialsByEmail).length > 0 ? { trialsByEmail } : {}),
    updatedAt: a.updatedAt || b.updatedAt,
  };
}

export interface RewardIdentityCheck {
  userId?: string;
  legacyIds?: string[];
  email?: string | null;
  foodCheckInRewardAt?: string;
  freeTrialActivatedAt?: string;
  freeTrialExpiresAt?: string;
}

/**
 * Checks if this user (by `userId`, `legacyIds`, OR normalized `email`) has ever claimed
 * the 30-day VIP food check-in reward / Free Trial across the user record, local ledger,
 * local claim registry, or Supabase Cloud claim registry.
 */
export function findExistingRewardClaimAt(
  identity: RewardIdentityCheck,
  cloudRegistry?: RewardClaimRegistry | null
): string | undefined {
  if (isRealIsoTimestamp(identity.freeTrialActivatedAt)) {
    return identity.freeTrialActivatedAt;
  }
  if (isRealIsoTimestamp(identity.foodCheckInRewardAt)) {
    return identity.foodCheckInRewardAt;
  }
  const ids = [identity.userId, ...(identity.legacyIds || [])].filter(
    (id): id is string => typeof id === 'string' && Boolean(id.trim())
  );
  const merged = mergeClaimRegistries(loadLocalClaimRegistry(), cloudRegistry);
  for (const id of ids) {
    if (merged.trialsByUserId?.[id]?.activatedAt && isRealIsoTimestamp(merged.trialsByUserId[id].activatedAt)) {
      return merged.trialsByUserId[id].activatedAt;
    }
    if (merged.byUserId[id] && isRealIsoTimestamp(merged.byUserId[id])) {
      return merged.byUserId[id];
    }
  }
  const normEmail = normalizeRewardEmail(identity.email);
  if (normEmail) {
    if (merged.trialsByEmail?.[normEmail]?.activatedAt && isRealIsoTimestamp(merged.trialsByEmail[normEmail].activatedAt)) {
      return merged.trialsByEmail[normEmail].activatedAt;
    }
    if (merged.byEmail[normEmail] && isRealIsoTimestamp(merged.byEmail[normEmail])) {
      return merged.byEmail[normEmail];
    }
  }
  if (identity.userId) {
    const ledger = loadLedgerForUser(identity.userId, identity.legacyIds || []);
    if (ledger.grantedAt && isRealIsoTimestamp(ledger.grantedAt)) return ledger.grantedAt;
    if (ledger.grantedAt) return ledger.grantedAt;
  }
  if (typeof identity.foodCheckInRewardAt === 'string' && identity.foodCheckInRewardAt) {
    return identity.foodCheckInRewardAt;
  }
  for (const id of ids) {
    if (merged.byUserId[id]) return merged.byUserId[id];
  }
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
 * Records a one-time reward / Free Trial claim locally (both in the claim registry by `userId` + `email`
 * and in the user's ledger) and returns the merged registry ready to sync to Supabase Cloud.
 */
export function recordFoodCheckInRewardClaim(
  identity: RewardIdentityCheck,
  atIso: string,
  cloudRegistry?: RewardClaimRegistry | null,
  expiresAtIso?: string,
  durationDays: number = FOOD_CHECKIN_REWARD_VIP_DAYS
): RewardClaimRegistry {
  const merged = mergeClaimRegistries(loadLocalClaimRegistry(), cloudRegistry);
  const existingAt = findExistingRewardClaimAt(identity, merged);
  const effectiveAt =
    pickBetterClaimTimestamp(existingAt, atIso) ||
    new Date(getAuthoritativeServerNowMs()).toISOString();
  const startMs = parseSafeDateMs(effectiveAt) || getAuthoritativeServerNowMs();
  const effectiveExpiresIso =
    expiresAtIso && isRealIsoTimestamp(expiresAtIso)
      ? expiresAtIso
      : identity.freeTrialExpiresAt && isRealIsoTimestamp(identity.freeTrialExpiresAt)
        ? identity.freeTrialExpiresAt
        : new Date(startMs + durationDays * DAY_MS).toISOString();

  const ids = [identity.userId, ...(identity.legacyIds || [])].filter(
    (id): id is string => typeof id === 'string' && Boolean(id.trim())
  );
  const trialsByUserId: Record<string, FreeTrialClaimWindow> = { ...(merged.trialsByUserId || {}) };
  const trialsByEmail: Record<string, FreeTrialClaimWindow> = { ...(merged.trialsByEmail || {}) };
  const windowRecord: FreeTrialClaimWindow = {
    activatedAt: effectiveAt,
    expiresAt: effectiveExpiresIso,
    durationDays,
  };

  for (const id of ids) {
    merged.byUserId[id] = pickBetterClaimTimestamp(merged.byUserId[id], effectiveAt) || effectiveAt;
    if (!trialsByUserId[id] || !isRealIsoTimestamp(trialsByUserId[id].activatedAt)) {
      trialsByUserId[id] = windowRecord;
    }
  }
  const normEmail = normalizeRewardEmail(identity.email);
  if (normEmail) {
    merged.byEmail[normEmail] = pickBetterClaimTimestamp(merged.byEmail[normEmail], effectiveAt) || effectiveAt;
    if (!trialsByEmail[normEmail] || !isRealIsoTimestamp(trialsByEmail[normEmail].activatedAt)) {
      trialsByEmail[normEmail] = windowRecord;
    }
  }
  merged.trialsByUserId = trialsByUserId;
  merged.trialsByEmail = trialsByEmail;
  merged.updatedAt = new Date(getAuthoritativeServerNowMs()).toISOString();
  const saved = saveLocalClaimRegistry(merged);
  if (identity.userId) {
    markLedgerGranted(identity.userId, identity.legacyIds || [], effectiveAt);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FOOD_CHECKIN_CHANGED_EVENT));
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
    expiryDate: new Date(baseMs + rewardDays * DAY_MS).toISOString(),
    durationDays: wasVipActive ? resolveUserActualVipPlanDays(user) : rewardDays,
  };
}

/* ---------------- Authoritative Free Trial Status & Reconciliation ---------------- */

export interface UserFreeTrialStatus {
  state: 'guest' | 'admin' | 'eligible' | 'active' | 'expired';
  hasEverActivated: boolean;
  isVipActive: boolean;
  activatedAt?: string;
  expiresAt?: string;
  remainingDays: number;
  totalDays: number;
  checkInProgress: number;
  checkInTarget: number;
  needsBackendHeal: boolean;
}

/**
 * Computes the authoritative Free 30-Day VIP Trial status for a user using verified server time.
 * Preserves original activation date, expiry date, and remaining days across app updates,
 * reinstallations, and device changes.
 */
export function getFreeTrialStatus(
  user?: User | null,
  cloudRegistry?: RewardClaimRegistry | null
): UserFreeTrialStatus {
  if (!user) {
    return {
      state: 'guest',
      hasEverActivated: false,
      isVipActive: false,
      remainingDays: 0,
      totalDays: FOOD_CHECKIN_REWARD_VIP_DAYS,
      checkInProgress: 0,
      checkInTarget: FOOD_CHECKIN_REWARD_TARGET,
      needsBackendHeal: false,
    };
  }
  if (isAdminAccount(user)) {
    return {
      state: 'admin',
      hasEverActivated: false,
      isVipActive: false,
      remainingDays: 0,
      totalDays: FOOD_CHECKIN_REWARD_VIP_DAYS,
      checkInProgress: 0,
      checkInTarget: FOOD_CHECKIN_REWARD_TARGET,
      needsBackendHeal: false,
    };
  }

  const nowServerMs = getAuthoritativeServerNowMs();
  const legacyIds = user.legacyIds || [];
  const normEmail = normalizeRewardEmail(user.email);
  const ledger = loadLedgerForUser(user.id, legacyIds, user.foodCheckInLedger);
  const mergedReg = mergeClaimRegistries(loadLocalClaimRegistry(), cloudRegistry);

  // 1. Resolve any stored trial window from registry (by userId, legacyIds, or email)
  let regWindow: FreeTrialClaimWindow | undefined;
  for (const id of [user.id, ...legacyIds]) {
    if (id && mergedReg.trialsByUserId?.[id]) {
      regWindow = mergedReg.trialsByUserId[id];
      break;
    }
  }
  if (!regWindow && normEmail && mergedReg.trialsByEmail?.[normEmail]) {
    regWindow = mergedReg.trialsByEmail[normEmail];
  }

  // 2. Resolve earliest valid activation timestamp across all sources
  const rawClaimAt = findExistingRewardClaimAt(
    {
      userId: user.id,
      legacyIds,
      email: user.email,
      foodCheckInRewardAt: user.foodCheckInRewardAt,
      freeTrialActivatedAt: user.freeTrialActivatedAt,
      freeTrialExpiresAt: user.freeTrialExpiresAt,
    },
    mergedReg
  );

  const totalDays = FOOD_CHECKIN_REWARD_VIP_DAYS;
  const ref = String(user.transactionRef || '').trim();
  const isRewardOrTrialRef =
    ref.startsWith('REWARD-FOODCHECKIN') ||
    ref.startsWith('FREE-TRIAL-') ||
    ref.startsWith('VIP-TRIAL-');

  const subExpMs = parseSafeDateMs(user.subscriptionExpiryDate || user.vipExpiresAt);
  const isDirectVipActiveRecord =
    user.subscriptionStatus !== 'cancelled' &&
    user.paymentStatus !== 'cancelled' &&
    (user.membershipTier === 'premium_vip' || user.subscriptionStatus === 'active' || user.vipStatus === 'active') &&
    subExpMs > nowServerMs;

  const hasExplicitTrialRecord = Boolean(
    user.freeTrialActivated ||
      isRealIsoTimestamp(user.freeTrialActivatedAt) ||
      isRealIsoTimestamp(user.foodCheckInRewardAt) ||
      isRealIsoTimestamp(rawClaimAt) ||
      regWindow ||
      isRewardOrTrialRef ||
      isDirectVipActiveRecord
  );

  const userStartMs = hasExplicitTrialRecord
    ? parseSafeDateMs(
        user.freeTrialActivatedAt ||
          (isRealIsoTimestamp(user.foodCheckInRewardAt) ? user.foodCheckInRewardAt : undefined) ||
          regWindow?.activatedAt ||
          (isRealIsoTimestamp(rawClaimAt) ? rawClaimAt : undefined) ||
          user.subscriptionStartDate
      )
    : 0;

  const rawTrialExpMs = parseSafeDateMs(user.freeTrialExpiresAt || regWindow?.expiresAt);
  // Strictly enforce a 30-day Free Trial window from activation so paid 90-day plans never inflate Free Trial beyond 30 days
  const effectiveStartMs =
    userStartMs > 0
      ? userStartMs
      : rawTrialExpMs > 0
        ? rawTrialExpMs - totalDays * DAY_MS
        : isDirectVipActiveRecord && subExpMs > 0
          ? subExpMs - totalDays * DAY_MS
          : 0;

  const effectiveExpMs =
    rawTrialExpMs > 0 && (effectiveStartMs <= 0 || rawTrialExpMs - effectiveStartMs <= 32 * DAY_MS)
      ? rawTrialExpMs
      : effectiveStartMs > 0 && hasExplicitTrialRecord
        ? effectiveStartMs + totalDays * DAY_MS
        : 0;

  const activatedAtIso = effectiveStartMs > 0 ? new Date(effectiveStartMs).toISOString() : undefined;
  const expiresAtIso = effectiveExpMs > 0 ? new Date(effectiveExpMs).toISOString() : undefined;

  // Case A: Active 30-Day Free Trial (server time < 30-day trial expiry time)
  if (
    hasExplicitTrialRecord &&
    effectiveExpMs > nowServerMs &&
    user.subscriptionStatus !== 'cancelled' &&
    user.paymentStatus !== 'cancelled'
  ) {
    const remainingDays = Math.min(totalDays, Math.max(1, Math.ceil((effectiveExpMs - nowServerMs) / DAY_MS)));
    const needsBackendHeal = Boolean(
      !user.freeTrialActivated ||
        !user.freeTrialActivatedAt ||
        !user.freeTrialExpiresAt ||
        !user.subscriptionExpiryDate ||
        user.membershipTier !== 'premium_vip' ||
        user.subscriptionStatus !== 'active'
    );
    return {
      state: 'active',
      hasEverActivated: true,
      isVipActive: true,
      activatedAt: activatedAtIso,
      expiresAt: expiresAtIso,
      remainingDays,
      totalDays,
      checkInProgress: FOOD_CHECKIN_REWARD_TARGET,
      checkInTarget: FOOD_CHECKIN_REWARD_TARGET,
      needsBackendHeal,
    };
  }

  // Case B: Previously activated Free Trial that has genuinely expired by server time
  if (hasExplicitTrialRecord && effectiveExpMs > 0 && effectiveExpMs <= nowServerMs) {
    const needsBackendHeal = Boolean(
      !user.freeTrialActivated || !user.freeTrialActivatedAt || !user.freeTrialExpiresAt
    );
    return {
      state: 'expired',
      hasEverActivated: true,
      isVipActive: false,
      activatedAt: activatedAtIso,
      expiresAt: expiresAtIso,
      remainingDays: 0,
      totalDays: FOOD_CHECKIN_REWARD_VIP_DAYS,
      checkInProgress: FOOD_CHECKIN_REWARD_TARGET,
      checkInTarget: FOOD_CHECKIN_REWARD_TARGET,
      needsBackendHeal,
    };
  }

  // Case C: Eligible (never activated, or stuck on a legacy ungranted 'granted' placeholder with 0 expiry)
  const stuckOnLegacyPlaceholder = rawClaimAt === 'granted' && effectiveExpMs <= 0;
  return {
    state: 'eligible',
    hasEverActivated: false,
    isVipActive: false,
    remainingDays: 0,
    totalDays: FOOD_CHECKIN_REWARD_VIP_DAYS,
    checkInProgress: ledgerProgress(ledger),
    checkInTarget: FOOD_CHECKIN_REWARD_TARGET,
    needsBackendHeal: stuckOnLegacyPlaceholder,
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
  trialState: UserFreeTrialStatus['state'];
  remainingDays: number;
  totalDays: number;
  activatedAt?: string;
  expiresAt?: string;
}

export function useFoodCheckInProgress(
  userId?: string,
  legacyIds: string[] = [],
  rewardGrantedAt?: string,
  userEmail?: string,
  userObj?: User | null
): FoodCheckInProgress {
  const read = (): FoodCheckInProgress => {
    const l = userId ? loadLedgerForUser(userId, legacyIds, userObj?.foodCheckInLedger) : emptyLedger();
    const verifiedMs = getVerifiedServerNowMs();
    const authoritativeMs = verifiedMs ?? getAuthoritativeServerNowMs();
    const serverDay = authoritativeMs ? toServerDayKey(authoritativeMs) : '';
    const trialStatus = userObj
      ? getFreeTrialStatus(userObj)
      : userId
        ? getFreeTrialStatus({
            id: userId,
            name: '',
            email: userEmail || '',
            role: 'user',
            avatar: '',
            createdAt: '',
            legacyIds,
            foodCheckInRewardAt: rewardGrantedAt,
          })
        : null;
    const claimed = trialStatus
      ? trialStatus.hasEverActivated
      : userId
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
      granted: Boolean(claimed || (l.grantedAt && isRealIsoTimestamp(l.grantedAt))),
      serverTimeVerified: verifiedMs !== null,
      trialState: trialStatus?.state || (userId ? 'eligible' : 'guest'),
      remainingDays: trialStatus?.remainingDays || 0,
      totalDays: trialStatus?.totalDays || FOOD_CHECKIN_REWARD_VIP_DAYS,
      activatedAt: trialStatus?.activatedAt,
      expiresAt: trialStatus?.expiresAt,
    };
  };
  const [state, setState] = useState<FoodCheckInProgress>(read);
  const legacyKey = legacyIds.join('|');
  const userExpKey = userObj?.subscriptionExpiryDate || userObj?.freeTrialExpiresAt || '';
  useEffect(() => {
    const refresh = () => {
      setState((prev) => {
        const next = read();
        if (
          prev.progress === next.progress &&
          prev.target === next.target &&
          prev.todayCount === next.todayCount &&
          prev.dailyCap === next.dailyCap &&
          prev.granted === next.granted &&
          prev.serverTimeVerified === next.serverTimeVerified &&
          prev.trialState === next.trialState &&
          prev.remainingDays === next.remainingDays &&
          prev.totalDays === next.totalDays &&
          prev.expiresAt === next.expiresAt
        ) {
          return prev;
        }
        return next;
      });
    };
    refresh();
    window.addEventListener(FOOD_CHECKIN_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(FOOD_CHECKIN_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, legacyKey, rewardGrantedAt, userEmail, userExpKey]);
  return state;
}

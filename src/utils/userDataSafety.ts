/**
 * User Data Safety — PURE rules (no network, no React, no imports) shared by the app, the Supabase
 * sync layer, and the Node verification scripts (scripts/verifyUserDataSafety.mjs).
 *
 * Root-cause context (audited 2026-11):
 *  - The whole user list used to live in ONE JSON document (`kft_cloud_users_v2`) that every admin action
 *    rewrote from whatever (possibly incomplete) local list that device happened to have => lost updates.
 *  - A failed/402 cloud read looked identical to "no users", so a freshly updated/wiped admin device
 *    could overwrite the central list with its tiny local list.
 *  - Prefix reads were capped at 1000 rows with no pagination (silent truncation above 1000 users).
 *
 * These helpers make those failure modes impossible to repeat silently.
 */

export const USER_AGGREGATE_KEYS = ['kft_cloud_users_v1', 'kft_cloud_users_v2'] as const;
export const USER_ATOMIC_PREFIX = 'kft_user_';
/** Aggregate documents above this size are never pushed (atomic `kft_user_<id>` rows are the source of truth). */
export const MAX_AGGREGATE_USERS = 2500;
/** Shrink guard only applies once the server list has at least this many users. */
export const SHRINK_GUARD_MIN_BASELINE = 5;
/** Refuse an aggregate write that would remove more than this fraction of the last-known server list. */
export const SHRINK_GUARD_MAX_LOSS_RATIO = 0.2;
export const PREFIX_PAGE_SIZE = 1000;
export const MAX_PREFIX_PAGES = 200; // 200k rows hard ceiling

export function isUserAggregateKey(key: string): boolean {
  return (USER_AGGREGATE_KEYS as readonly string[]).includes(key);
}

/** Keys whose loss would lose accounts / VIP / registration history. */
export function isUserCriticalKey(key: string): boolean {
  if (!key) return false;
  if (key.startsWith(USER_ATOMIC_PREFIX)) return true;
  return (
    isUserAggregateKey(key) ||
    key === 'kft_cloud_vip_backup_v1' ||
    key === 'kft_cloud_deleted_users_v1' ||
    key === 'kft_cloud_transactions_v1'
  );
}

export type AggregatePushReason =
  | 'ok'
  | 'not_aggregate'
  | 'not_array'
  | 'too_large_skip'
  | 'shrink_blocked'
  | 'destructive_override';

export interface AggregatePushDecision {
  allow: boolean;
  /** true when the caller should treat the write as satisfied without sending it (e.g. too large). */
  treatAsSuccess: boolean;
  reason: AggregatePushReason;
  detail: string;
}

/**
 * Decide whether a whole-list user aggregate write may be sent to the server.
 * `baselineCount` = number of users the SERVER last reported for this aggregate (0 when unknown/never read).
 */
export function evaluateAggregatePush(params: {
  key: string;
  payload: unknown;
  baselineCount: number;
  allowDestructive?: boolean;
}): AggregatePushDecision {
  const { key, payload, baselineCount, allowDestructive } = params;
  if (!isUserAggregateKey(key)) {
    return { allow: true, treatAsSuccess: false, reason: 'not_aggregate', detail: 'not a user aggregate key' };
  }
  if (!Array.isArray(payload)) {
    return { allow: false, treatAsSuccess: false, reason: 'not_array', detail: 'aggregate payload must be an array' };
  }
  if (allowDestructive) {
    return { allow: true, treatAsSuccess: false, reason: 'destructive_override', detail: 'explicit admin override' };
  }
  if (payload.length > MAX_AGGREGATE_USERS) {
    return {
      allow: false,
      treatAsSuccess: true,
      reason: 'too_large_skip',
      detail: `aggregate has ${payload.length} users (> ${MAX_AGGREGATE_USERS}); atomic rows are authoritative`,
    };
  }
  const base = Math.max(0, Math.floor(baselineCount || 0));
  if (base >= SHRINK_GUARD_MIN_BASELINE) {
    const floor = Math.ceil(base * (1 - SHRINK_GUARD_MAX_LOSS_RATIO));
    if (payload.length < floor) {
      return {
        allow: false,
        treatAsSuccess: false,
        reason: 'shrink_blocked',
        detail: `refusing to replace ${base} server users with ${payload.length} (min allowed ${floor})`,
      };
    }
  }
  return { allow: true, treatAsSuccess: false, reason: 'ok', detail: 'ok' };
}

export interface ShrinkAssessment {
  level: 'ok' | 'warn' | 'critical';
  baseline: number;
  current: number;
  lost: number;
  lostRatio: number;
}

/** Compare current user count against the highest count this install has ever confirmed. */
export function assessUserCountShrink(baseline: number, current: number): ShrinkAssessment {
  const b = Math.max(0, Math.floor(baseline || 0));
  const c = Math.max(0, Math.floor(current || 0));
  const lost = Math.max(0, b - c);
  const lostRatio = b > 0 ? lost / b : 0;
  let level: ShrinkAssessment['level'] = 'ok';
  if (b >= SHRINK_GUARD_MIN_BASELINE && c < Math.ceil(b * (1 - SHRINK_GUARD_MAX_LOSS_RATIO))) level = 'critical';
  else if (lost > 0 && b >= 2) level = 'warn';
  return { level, baseline: b, current: c, lost, lostRatio };
}

export interface CursorPlan {
  mode: 'full' | 'delta';
  sinceIso?: string;
  reason: string;
}

/**
 * Admin devices only download CHANGED user rows (delta) once they hold a trustworthy local copy.
 * A suspiciously small local list (wiped / freshly updated device) forces a FULL paginated re-pull.
 */
export function planUserCursorSync(params: {
  cursorIso?: string | null;
  localCount: number;
  baselineCount: number;
  overlapMs?: number;
}): CursorPlan {
  const { cursorIso, localCount, baselineCount } = params;
  const overlap = params.overlapMs ?? 120_000;
  const cursorMs = cursorIso ? Date.parse(cursorIso) : NaN;
  if (!Number.isFinite(cursorMs)) return { mode: 'full', reason: 'no cursor yet' };
  const base = Math.max(0, Math.floor(baselineCount || 0));
  const local = Math.max(0, Math.floor(localCount || 0));
  if (base >= SHRINK_GUARD_MIN_BASELINE && local < Math.ceil(base * 0.9)) {
    return { mode: 'full', reason: `local copy (${local}) smaller than last confirmed (${base}) - full re-pull` };
  }
  return { mode: 'delta', sinceIso: new Date(Math.max(0, cursorMs - overlap)).toISOString(), reason: 'delta since cursor' };
}

export interface UserIntegrityIssue {
  code:
    | 'duplicate_id'
    | 'duplicate_email'
    | 'missing_id'
    | 'missing_created_at'
    | 'vip_flag_but_expired'
    | 'vip_active_without_expiry'
    | 'current_user_missing_from_list';
  severity: 'info' | 'warn' | 'critical';
  message: string;
  ids?: string[];
}

export interface UserIntegrityReport {
  stats: {
    total: number;
    vipActive: number;
    freeUsers: number;
    owners: number;
    duplicateIds: number;
    duplicateEmails: number;
    missingCreatedAt: number;
  };
  issues: UserIntegrityIssue[];
}

const parseMs = (v: unknown): number => {
  if (typeof v !== 'string' || !v) return 0;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : 0;
};

/** Pure structural audit of a user list (works on 50k users in O(n)). */
export function analyzeUserListIntegrity(users: any[], nowMs: number, currentUserId?: string | null): UserIntegrityReport {
  const list = Array.isArray(users) ? users : [];
  const idCount = new Map<string, number>();
  const emailCount = new Map<string, number>();
  let vipActive = 0;
  let owners = 0;
  let missingCreatedAt = 0;
  const missingId: string[] = [];
  const vipExpired: string[] = [];
  const vipNoExpiry: string[] = [];
  const noCreated: string[] = [];

  for (const u of list) {
    if (!u || typeof u !== 'object') continue;
    const id = String(u.id || '').trim();
    if (!id) {
      missingId.push(String(u.email || u.name || '?'));
      continue;
    }
    idCount.set(id, (idCount.get(id) || 0) + 1);
    const email = String(u.email || '').trim().toLowerCase();
    if (email) emailCount.set(email, (emailCount.get(email) || 0) + 1);
    if (u.role === 'owner') owners++;
    if (!u.createdAt && !u.registeredAtIso) {
      missingCreatedAt++;
      noCreated.push(id);
    }
    const flagged = u.membershipTier === 'premium_vip' || u.subscriptionStatus === 'active' || u.vipStatus === 'active';
    const cancelled = u.subscriptionStatus === 'cancelled' || Boolean(u.vipCancelledAt);
    if (flagged && !cancelled) {
      const exp = parseMs(u.subscriptionExpiryDate) || parseMs(u.vipExpiresAt);
      if (!exp) vipNoExpiry.push(id);
      else if (exp <= nowMs) vipExpired.push(id);
      else vipActive++;
    }
  }

  const dupIds = Array.from(idCount.entries()).filter(([, n]) => n > 1).map(([k]) => k);
  const dupEmails = Array.from(emailCount.entries()).filter(([, n]) => n > 1).map(([k]) => k);
  const issues: UserIntegrityIssue[] = [];
  if (missingId.length) issues.push({ code: 'missing_id', severity: 'critical', message: `${missingId.length} user record(s) have no id`, ids: missingId.slice(0, 20) });
  if (dupIds.length) issues.push({ code: 'duplicate_id', severity: 'critical', message: `${dupIds.length} duplicated user id(s)`, ids: dupIds.slice(0, 20) });
  if (dupEmails.length) issues.push({ code: 'duplicate_email', severity: 'warn', message: `${dupEmails.length} email(s) used by more than one record`, ids: dupEmails.slice(0, 20) });
  if (noCreated.length) issues.push({ code: 'missing_created_at', severity: 'warn', message: `${noCreated.length} user(s) have no registration date`, ids: noCreated.slice(0, 20) });
  if (vipExpired.length) issues.push({ code: 'vip_flag_but_expired', severity: 'info', message: `${vipExpired.length} user(s) still flagged VIP after expiry`, ids: vipExpired.slice(0, 20) });
  if (vipNoExpiry.length) issues.push({ code: 'vip_active_without_expiry', severity: 'warn', message: `${vipNoExpiry.length} active VIP(s) with no expiry date`, ids: vipNoExpiry.slice(0, 20) });
  if (currentUserId && !list.some((u) => u && (u.id === currentUserId || (Array.isArray(u.legacyIds) && u.legacyIds.includes(currentUserId))))) {
    issues.push({ code: 'current_user_missing_from_list', severity: 'critical', message: 'signed-in user is missing from the user list', ids: [currentUserId] });
  }

  return {
    stats: {
      total: list.length,
      vipActive,
      freeUsers: Math.max(0, list.length - vipActive),
      owners,
      duplicateIds: dupIds.length,
      duplicateEmails: dupEmails.length,
      missingCreatedAt,
    },
    issues,
  };
}

export interface OutboxEntry {
  key: string;
  payload: unknown;
  queuedAt: string;
  attempts: number;
}

/** Latest-write-wins per key, oldest non-user entries evicted first when the queue is full. */
export function mergeOutboxEntry(queue: OutboxEntry[], entry: OutboxEntry, maxEntries = 300): OutboxEntry[] {
  const next = queue.filter((e) => e.key !== entry.key);
  next.push(entry);
  if (next.length <= maxEntries) return next;
  const overflow = next.length - maxEntries;
  const evictable = next.filter((e) => !e.key.startsWith(USER_ATOMIC_PREFIX));
  const evictKeys = new Set(evictable.slice(0, overflow).map((e) => e.key));
  let result = next.filter((e) => !evictKeys.has(e.key));
  if (result.length > maxEntries) result = result.slice(result.length - maxEntries);
  return result;
}

/** Offsets for paginated prefix pulls. */
export function buildPageOffsets(totalRows: number, pageSize = PREFIX_PAGE_SIZE): number[] {
  const total = Math.max(0, Math.floor(totalRows));
  const out: number[] = [];
  for (let off = 0; off < total && out.length < MAX_PREFIX_PAGES; off += pageSize) out.push(off);
  return out;
}

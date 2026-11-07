/**
 * User Data Integrity Store & Service (localStorage-backed, no network imports so it can be used from
 * main.tsx, supabaseService.ts, AppContext and the admin panel without circular dependencies).
 *
 *  - high-water mark of confirmed users (detects silent list shrinkage after an update)
 *  - last-known SERVER aggregate size (drives the "never shrink the central list" write guard)
 *  - incremental sync cursor for admin delta pulls
 *  - ring-buffer integrity / error log (admin-visible)
 *  - upgrade audit log (before/after counts for every version change)
 */
import {
  assessUserCountShrink,
  analyzeUserListIntegrity,
  type ShrinkAssessment,
  type UserIntegrityReport,
} from '../utils/userDataSafety';

const K_HIGH_WATER = 'kft_user_highwater_v1';
const K_SERVER_AGG = 'kft_user_server_agg_count_v1';
const K_CURSOR = 'kft_user_sync_cursor_v1';
const K_LOG = 'kft_integrity_log_v1';
const K_UPGRADE_AUDIT = 'kft_upgrade_audit_log_v1';
const MAX_LOG = 200;

export interface IntegrityLogEntry {
  at: string;
  level: 'info' | 'warn' | 'critical';
  code: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface UserHighWater {
  count: number;
  vipCount: number;
  at: string;
}

function ls(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = ls()?.getItem(key);
    if (!raw || raw === 'undefined' || raw === 'null') return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    ls()?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function logIntegrityEvent(
  level: IntegrityLogEntry['level'],
  code: string,
  message: string,
  data?: Record<string, unknown>
): void {
  const log = readJson<IntegrityLogEntry[]>(K_LOG, []);
  log.unshift({ at: new Date().toISOString(), level, code, message, data });
  if (log.length > MAX_LOG) log.length = MAX_LOG;
  writeJson(K_LOG, log);
  if (level !== 'info') {
    try {
      console.warn(`[user-data-integrity:${level}] ${code}: ${message}`, data || '');
    } catch {
      /* ignore */
    }
  }
}

export function readIntegrityLog(): IntegrityLogEntry[] {
  return readJson<IntegrityLogEntry[]>(K_LOG, []);
}

export function clearIntegrityLog(): void {
  writeJson(K_LOG, []);
}

export function readUserHighWater(): UserHighWater {
  return readJson<UserHighWater>(K_HIGH_WATER, { count: 0, vipCount: 0, at: '' });
}

/** Raise the confirmed high-water mark (never lowers it automatically). */
export function noteConfirmedUserCount(count: number, vipCount = 0): void {
  const hw = readUserHighWater();
  if (count > hw.count || vipCount > hw.vipCount) {
    writeJson(K_HIGH_WATER, {
      count: Math.max(hw.count, count),
      vipCount: Math.max(hw.vipCount, vipCount),
      at: new Date().toISOString(),
    });
  }
}

/** Admin deliberately removed users: lower the baseline so the shrink alarm does not fire. */
export function resetUserHighWater(count: number, vipCount = 0): void {
  writeJson(K_HIGH_WATER, { count, vipCount, at: new Date().toISOString() });
  writeJson(K_SERVER_AGG, count);
}

export function readServerAggregateCount(): number {
  const n = readJson<number>(K_SERVER_AGG, 0);
  return typeof n === 'number' && n > 0 ? n : 0;
}

export function noteServerAggregateCount(count: number): void {
  writeJson(K_SERVER_AGG, Math.max(0, Math.floor(count)));
}

export function readUserSyncCursor(): string | null {
  return readJson<string | null>(K_CURSOR, null);
}

export function writeUserSyncCursor(iso: string | null): void {
  writeJson(K_CURSOR, iso);
}

export function recordUpgradeAudit(entry: {
  from: string;
  to: string;
  usersBefore: number;
  usersAfter: number;
  vipBefore: number;
  vipAfter: number;
}): void {
  const log = readJson<any[]>(K_UPGRADE_AUDIT, []);
  log.unshift({ ...entry, at: new Date().toISOString() });
  if (log.length > 40) log.length = 40;
  writeJson(K_UPGRADE_AUDIT, log);
  const lost = entry.usersBefore - entry.usersAfter;
  if (lost > 0 || entry.vipAfter < entry.vipBefore) {
    logIntegrityEvent('critical', 'upgrade_lost_users', `Upgrade ${entry.from} -> ${entry.to} reduced users ${entry.usersBefore} -> ${entry.usersAfter}, VIP ${entry.vipBefore} -> ${entry.vipAfter}`, entry);
  } else {
    logIntegrityEvent('info', 'upgrade_ok', `Upgrade ${entry.from} -> ${entry.to}: users ${entry.usersBefore} -> ${entry.usersAfter}, VIP ${entry.vipBefore} -> ${entry.vipAfter}`);
  }
}

export function readUpgradeAudit(): any[] {
  return readJson<any[]>(K_UPGRADE_AUDIT, []);
}

export interface UserIntegrityCheckResult {
  shrink: ShrinkAssessment;
  report: UserIntegrityReport;
  highWater: UserHighWater;
}

/**
 * Local integrity pass: structural audit + high-water shrink detection. Logs everything it finds.
 * Safe to call on every boot / sync (O(n)).
 */
export function runUserDataIntegrityCheck(users: any[], currentUserId?: string | null): UserIntegrityCheckResult {
  const report = analyzeUserListIntegrity(users, Date.now(), currentUserId);
  const hw = readUserHighWater();
  const shrink = assessUserCountShrink(hw.count, report.stats.total);

  if (shrink.level === 'critical') {
    logIntegrityEvent('critical', 'user_list_shrunk', `User list shrank ${shrink.baseline} -> ${shrink.current} (-${Math.round(shrink.lostRatio * 100)}%). Possible data loss - do not push to server; re-pull from server/backup.`, { ...shrink });
  } else if (shrink.level === 'warn') {
    logIntegrityEvent('warn', 'user_list_decreased', `User count decreased ${shrink.baseline} -> ${shrink.current}`, { ...shrink });
  } else {
    noteConfirmedUserCount(report.stats.total, report.stats.vipActive);
  }
  for (const issue of report.issues) {
    if (issue.severity !== 'info') logIntegrityEvent(issue.severity, issue.code, issue.message, { ids: issue.ids });
  }
  return { shrink, report, highWater: readUserHighWater() };
}

const K_ATOMIC_PENDING = 'kft_user_atomic_pending_v1';

/** Ids of legacy users that still need their atomic `kft_user_<id>` row created (admin-device bookkeeping). */
export function readAtomicBackfillPending(): string[] {
  const v = readJson<string[]>(K_ATOMIC_PENDING, []);
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
}

export function writeAtomicBackfillPending(ids: string[]): void {
  if (ids.length === 0) {
    try {
      ls()?.removeItem(K_ATOMIC_PENDING);
    } catch {
      /* ignore */
    }
    return;
  }
  writeJson(K_ATOMIC_PENDING, ids);
}

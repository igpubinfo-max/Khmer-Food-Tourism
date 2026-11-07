/**
 * Pure helpers shared by the Edge Functions (no Deno globals => unit-tested from Node: `npm run test:edge`).
 * Only erasable TypeScript syntax is used so Node can load this file directly.
 */

/** A user id may only contain characters that are safe inside a PostgREST filter / kv key. */
export function safeUserId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const id = raw.trim();
  return /^[A-Za-z0-9_.@:+-]{3,128}$/.test(id) ? id : null;
}

export function userKvKey(id: string): string {
  return `kft_user_${id}`;
}

/**
 * Server-side twin of the app's VIP rule: active premium_vip, not cancelled, and not past its expiry.
 * (The expiry is re-checked on purpose - a stale 'active' flag must not unlock paid AI features.)
 */
export function isVipActive(u: unknown, nowMs: number = Date.now()): boolean {
  if (!u || typeof u !== 'object') return false;
  const r = u as Record<string, unknown>;
  if (r.membershipTier !== 'premium_vip') return false;
  if (r.subscriptionStatus !== 'active') return false;
  if (r.vipCancelledAt) return false;
  const exp = r.subscriptionExpiryDate;
  if (typeof exp === 'string' && exp) {
    const t = Date.parse(exp);
    if (Number.isFinite(t) && t <= nowMs) return false;
  }
  return true;
}

export interface QuotaDecision {
  allowed: boolean;
  limit: number;
  used: number;
}

/** `used` is the counter value AFTER this call was counted. */
export function decideQuota(used: number, limit: number): QuotaDecision {
  return { allowed: used <= limit, limit, used };
}

export function envInt(raw: string | undefined, fallback: number, min = 1, max = 100000): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** Hex SHA-256 (works in Deno and Node 20+ via WebCrypto). */
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Sliding-window limiter, per edge isolate (best effort; daily DB counters are the hard limit). */
export class WindowLimiter {
  limit: number;
  windowMs: number;
  hits: Map<string, number[]>;
  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.hits = new Map();
  }
  allow(key: string, now: number = Date.now()): boolean {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) || []).filter((t) => t > cutoff);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) if (v.every((t) => t <= cutoff)) this.hits.delete(k);
    }
    return true;
  }
}

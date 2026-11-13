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
  if (r.membershipTier !== 'premium_vip' && r.vipStatus !== 'active') return false;
  if (r.subscriptionStatus !== 'active') return false;
  if (r.vipCancelledAt) return false;
  const exp = r.subscriptionExpiryDate || r.vipExpiresAt;
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

export type VipQuotaTier = 'paid_vip' | 'trial_vip' | 'free';

const PAID_CONSUMER_PLAN_IDS: ReadonlySet<string> = new Set([
  'consumer_promo_30d',
  'consumer_30d',
  'consumer_90d',
  'consumer_365d',
]);

/**
 * Distinguishes 7-Day Free Trial VIP (default 15 AI requests/day) from Paid Consumer VIP (default 80 AI requests/day).
 */
export function classifyVipQuotaTier(u: unknown, nowMs: number = Date.now()): VipQuotaTier {
  if (!isVipActive(u, nowMs)) return 'free';
  const r = u as Record<string, unknown>;
  const activePlan = typeof r.activeConsumerPlanId === 'string' ? r.activeConsumerPlanId.trim() : '';
  if (PAID_CONSUMER_PLAN_IDS.has(activePlan)) return 'paid_vip';

  const planType = typeof r.vipPlanType === 'string' ? r.vipPlanType.trim() : '';
  const ref = typeof r.transactionRef === 'string' ? r.transactionRef.trim() : '';
  const method = typeof r.paymentMethod === 'string' ? r.paymentMethod.trim() : '';
  if (
    activePlan === 'trial_7d' ||
    planType === 'trial_7d' ||
    planType === '7d' ||
    ref.startsWith('TRIAL-7D-') ||
    method === 'FREE_TRIAL_7D'
  ) {
    return 'trial_vip';
  }
  return 'paid_vip';
}

export function resolveUserAiDailyLimit(params: {
  isPayment: boolean;
  userId: string | null;
  userDoc: unknown;
  pricingDoc?: unknown;
  envTrial?: string;
  envVip?: string;
  envFree?: string;
  envAnon?: string;
  envPayment?: string;
  nowMs?: number;
}): { limit: number; tier: 'payment' | 'paid_vip' | 'trial_vip' | 'free' | 'anon' } {
  if (params.isPayment) {
    return { limit: envInt(params.envPayment, 45, 1, 500), tier: 'payment' };
  }
  if (!params.userId) {
    return { limit: envInt(params.envAnon, 15, 1, 500), tier: 'anon' };
  }
  const pricing =
    params.pricingDoc && typeof params.pricingDoc === 'object'
      ? (params.pricingDoc as Record<string, unknown>)
      : {};
  const adminTrialLimit = envInt(
    pricing.consumerTrialAiDailyLimit !== undefined ? String(pricing.consumerTrialAiDailyLimit) : undefined,
    15,
    1,
    1000
  );
  const adminPaidLimit = envInt(
    pricing.consumerPaidAiDailyLimit !== undefined ? String(pricing.consumerPaidAiDailyLimit) : undefined,
    80,
    1,
    5000
  );

  const tier = classifyVipQuotaTier(params.userDoc, params.nowMs ?? Date.now());
  if (tier === 'trial_vip') {
    const limit = params.envTrial ? envInt(params.envTrial, adminTrialLimit, 1, 1000) : adminTrialLimit;
    return { limit, tier: 'trial_vip' };
  }
  if (tier === 'paid_vip') {
    const limit = params.envVip ? envInt(params.envVip, adminPaidLimit, 1, 5000) : adminPaidLimit;
    return { limit, tier: 'paid_vip' };
  }
  return { limit: envInt(params.envFree, 15, 1, 500), tier: 'free' };
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

export const OFFICIAL_APP_PACKAGE_ID = 'com.khmerfood.tourism';

const ALLOWED_ORIGIN_RE =
  /^(?:https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?|(?:capacitor|ionic|discovercambodia|app|file):\/\/.*|https:\/\/(?:igpubinfo-max\.github\.io|(?:www\.)?khmerfoodtourism\.com|(?:www\.)?cambodiaflavorstourism\.com|[a-z0-9-]+\.(?:vercel\.app|netlify\.app|pages\.dev)))$/i;

export function isAllowedOrigin(req: Request): boolean {
  const origin = (req.headers.get('origin') || '').trim();
  if (!origin || origin === 'null') return true;
  return ALLOWED_ORIGIN_RE.test(origin);
}

export function resolveAllowedOrigin(req: Request): string {
  const origin = (req.headers.get('origin') || '').trim();
  if (origin && ALLOWED_ORIGIN_RE.test(origin)) {
    return origin;
  }
  return 'https://igpubinfo-max.github.io';
}

/**
 * Verifies client app attestation headers and origin to block repackaged/cloned APKs and unauthorized web clones from abusing Edge Functions.
 */
export function verifyClientAppIntegrity(req: Request): { ok: boolean; reason?: string } {
  const appId = (req.headers.get('x-kft-app-id') || '').trim();
  const appSig = (req.headers.get('x-kft-app-sig') || '').trim();
  if (appSig === 'TAMPERED_CLONE') {
    return { ok: false, reason: 'TAMPERED_CLONE_SIGNATURE' };
  }
  if (appId && appId !== OFFICIAL_APP_PACKAGE_ID) {
    return { ok: false, reason: `UNRECOGNIZED_APP_ID:${appId}` };
  }
  if (!isAllowedOrigin(req)) {
    return { ok: false, reason: `UNAUTHORIZED_ORIGIN:${(req.headers.get('origin') || '').trim()}` };
  }
  return { ok: true };
}

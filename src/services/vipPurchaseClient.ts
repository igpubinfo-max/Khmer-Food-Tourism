import { getAppAttestationHeaders, isAppCloneTampered } from '../utils/appCloneIntegrityGuard';
import { getAdminToken } from './adminAuthClient';
import { getCloudApiConfig } from './supabaseService';

/**
 * Client of the `vip-purchase` Edge Function:
 *   1. `claimConsumerTrialOnServer`: activates the 1-time 7-Day Consumer Free Trial (Android/Web only) with
 *      Two-Line Anti-Abuse protection (normalized Gmail/+855 Phone SHA-256 OR salted Device SHA-256).
 *   2. `verifyVipPurchaseOnServer`: server-side ABA/KHQR receipt check (screenshots + PDFs) for ALL Consumer VIP & Shop plans.
 *   3. `fetchCentralizedPaymentRegistryAndAudit` / `adminApproveAndLockTransactionOnServer` / `adminRejectTransactionOnServer`:
 *      centralized used-Trx database enforcement and complete payment audit log for Admin Portal.
 *
 * "unavailable" (not deployed / unreachable / unexpected response) lets the caller fall back safely during roll-out.
 */

export interface ServerVipGrant {
  startIso: string;
  expiryIso: string;
  days: number;
  planType: string;
  trxId: string;
  planId?: string;
  shopId?: string;
  category?: 'consumer' | 'shop';
}

export interface UsedAbaTransactionRecord {
  trx_key: string;
  raw_trx_id: string;
  txn_id?: string | null;
  user_id: string;
  user_email?: string | null;
  amount_usd: number | string;
  duration_days?: number | null;
  transaction_date?: string | null;
  payment_status: string;
  statement_matched: boolean;
  approved_by: string;
  used_at: string;
}

export interface PaymentAuditLogRecord {
  id: number;
  created_at: string;
  event_type: string;
  txn_id?: string | null;
  trx_key?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  amount_usd?: number | string | null;
  plan_id?: string | null;
  duration_days?: number | null;
  payment_status?: string | null;
  actor: string;
  details?: Record<string, unknown> | null;
}

export interface ServerPaymentReceiptRecord {
  id: number;
  created_at: string;
  user_id: string;
  user_email?: string | null;
  txn_id?: string | null;
  trx_key?: string | null;
  image_hash: string;
  amount_usd?: number | string | null;
  plan_days?: number | null;
  status: string;
  payment_status?: string | null;
  transaction_date?: string | null;
  is_modified_or_fake?: boolean;
  statement_matched?: boolean;
  reviewed_by?: string | null;
  approved_at?: string | null;
}

export type ServerPurchaseOutcome =
  | { kind: 'verified'; report: Record<string, unknown>; grant: ServerVipGrant }
  | { kind: 'pending'; report: Record<string, unknown> }
  | { kind: 'rejected'; report: Record<string, unknown> }
  | { kind: 'unavailable' };

export type ServerTrialClaimOutcome =
  | { kind: 'granted'; grant: ServerVipGrant }
  | {
      kind: 'already_claimed';
      reason: string;
      messageKh: string;
      messageEn: string;
    }
  | { kind: 'unavailable' };

export async function verifyVipPurchaseOnServer(params: {
  userId: string;
  durationDays: number;
  receiptDataUrl: string;
  submittedTrxId?: string;
  planId?: string;
  shopId?: string;
  email?: string;
  phone?: string;
  deviceHash?: string | null;
  identityHashes?: string[];
}): Promise<ServerPurchaseOutcome> {
  // STRICT RULE: Never call remote auto-grant on receipt submission; all payments must remain PENDING until Admin approval.
  if (Boolean(1)) return { kind: 'unavailable' };
  if (isAppCloneTampered()) return { kind: 'unavailable' };
  const cfg = getCloudApiConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || typeof fetch === 'undefined') return { kind: 'unavailable' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000); // vision model + database writes
  try {
    const res = await fetch(`${cfg.supabaseUrl.replace(/\/+$/, '')}/functions/v1/vip-purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        'x-kft-user-id': params.userId,
        ...getAppAttestationHeaders(),
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    if (res.headers.get('x-vip-purchase') !== '1' || res.status !== 200) return { kind: 'unavailable' };
    const data = await res.json().catch(() => null);
    if (!data || data.ok !== true || !data.report || typeof data.report !== 'object') return { kind: 'unavailable' };
    if (data.decision === 'verified' && data.grant && typeof data.grant.expiryIso === 'string') {
      return { kind: 'verified', report: data.report, grant: data.grant as ServerVipGrant };
    }
    if (data.decision === 'rejected') return { kind: 'rejected', report: data.report };
    return { kind: 'pending', report: data.report };
  } catch {
    return { kind: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

export async function claimConsumerTrialOnServer(params: {
  userId: string;
  email?: string;
  phone?: string;
  deviceHash?: string | null;
  identityHashes?: string[];
  platform?: 'android' | 'web' | 'ios';
}): Promise<ServerTrialClaimOutcome> {
  const cfg = getCloudApiConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || typeof fetch === 'undefined') return { kind: 'unavailable' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${cfg.supabaseUrl.replace(/\/+$/, '')}/functions/v1/vip-purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        'x-kft-user-id': params.userId,
        ...getAppAttestationHeaders(),
      },
      body: JSON.stringify({
        action: 'claim_trial',
        ...params,
      }),
      signal: controller.signal,
    });
    if (res.headers.get('x-vip-purchase') !== '1' || res.status !== 200) return { kind: 'unavailable' };
    const data = await res.json().catch(() => null);
    if (!data || data.ok !== true) return { kind: 'unavailable' };
    if (data.decision === 'trial_granted' && data.grant && typeof data.grant.expiryIso === 'string') {
      return { kind: 'granted', grant: data.grant as ServerVipGrant };
    }
    if (data.decision === 'already_claimed') {
      return {
        kind: 'already_claimed',
        reason: String(data.reason || 'claimed'),
        messageKh:
          typeof data.messageKh === 'string' && data.messageKh
            ? data.messageKh
            : 'ការសាកល្បងឥតគិតថ្លៃ 7 ថ្ងៃត្រូវបានប្រើរួចហើយ។',
        messageEn:
          typeof data.messageEn === 'string' && data.messageEn
            ? data.messageEn
            : 'The one-time 7-day free trial has already been used.',
      };
    }
    return { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCentralizedPaymentRegistryAndAudit(): Promise<{
  ok: boolean;
  usedTransactions: UsedAbaTransactionRecord[];
  auditLogs: PaymentAuditLogRecord[];
  receipts: ServerPaymentReceiptRecord[];
}> {
  const adminToken = getAdminToken();
  const cfg = getCloudApiConfig();
  if (!adminToken || !cfg.supabaseUrl || !cfg.supabaseAnonKey || typeof fetch === 'undefined') {
    return { ok: false, usedTransactions: [], auditLogs: [], receipts: [] };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${cfg.supabaseUrl.replace(/\/+$/, '')}/functions/v1/vip-purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        'x-kft-admin-token': adminToken,
        ...getAppAttestationHeaders(),
      },
      body: JSON.stringify({
        action: 'get_payment_registry_and_audit',
        adminToken,
      }),
      signal: controller.signal,
    });
    if (res.status !== 200) return { ok: false, usedTransactions: [], auditLogs: [], receipts: [] };
    const data = await res.json().catch(() => null);
    if (!data || data.ok !== true) return { ok: false, usedTransactions: [], auditLogs: [], receipts: [] };
    return {
      ok: true,
      usedTransactions: Array.isArray(data.usedTransactions) ? data.usedTransactions : [],
      auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs : [],
      receipts: Array.isArray(data.receipts) ? data.receipts : [],
    };
  } catch {
    return { ok: false, usedTransactions: [], auditLogs: [], receipts: [] };
  } finally {
    clearTimeout(timer);
  }
}

export async function adminApproveAndLockTransactionOnServer(params: {
  txnId: string;
  trxId: string;
  targetUserId: string;
  targetEmail?: string;
  adminActor: string;
  verifiedUsd: number;
  durationDays: number;
  planId?: string;
  transactionDate?: string;
  statementMatched?: boolean;
  statementRowRef?: string;
}): Promise<{
  kind: 'approved_and_locked' | 'already_used' | 'invalid_trx_id' | 'unavailable';
  trxKey?: string;
  usedByUserId?: string;
  usedByEmail?: string;
  messageKh?: string;
  messageEn?: string;
}> {
  const adminToken = getAdminToken();
  const cfg = getCloudApiConfig();
  if (!adminToken || !cfg.supabaseUrl || !cfg.supabaseAnonKey || typeof fetch === 'undefined') {
    return { kind: 'unavailable' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${cfg.supabaseUrl.replace(/\/+$/, '')}/functions/v1/vip-purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        'x-kft-admin-token': adminToken,
        ...getAppAttestationHeaders(),
      },
      body: JSON.stringify({
        action: 'admin_approve_transaction',
        adminToken,
        ...params,
      }),
      signal: controller.signal,
    });
    if (res.status !== 200) return { kind: 'unavailable' };
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object') return { kind: 'unavailable' };
    if (data.decision === 'approved_and_locked') {
      return { kind: 'approved_and_locked', trxKey: data.trxKey };
    }
    if (data.decision === 'already_used') {
      return {
        kind: 'already_used',
        usedByUserId: data.usedByUserId,
        usedByEmail: data.usedByEmail,
        messageKh: data.messageKh,
        messageEn: data.messageEn,
      };
    }
    if (data.decision === 'invalid_trx_id') {
      return {
        kind: 'invalid_trx_id',
        messageKh: data.messageKh,
        messageEn: data.messageEn,
      };
    }
    return { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

export async function adminRejectTransactionOnServer(params: {
  txnId: string;
  trxId?: string;
  targetUserId: string;
  targetEmail?: string;
  adminActor: string;
  verifiedUsd: number;
  durationDays: number;
  planId?: string;
  reason?: string;
}): Promise<boolean> {
  const adminToken = getAdminToken();
  const cfg = getCloudApiConfig();
  if (!adminToken || !cfg.supabaseUrl || !cfg.supabaseAnonKey || typeof fetch === 'undefined') {
    return false;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${cfg.supabaseUrl.replace(/\/+$/, '')}/functions/v1/vip-purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        'x-kft-admin-token': adminToken,
        ...getAppAttestationHeaders(),
      },
      body: JSON.stringify({
        action: 'admin_reject_transaction',
        adminToken,
        ...params,
      }),
      signal: controller.signal,
    });
    return res.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
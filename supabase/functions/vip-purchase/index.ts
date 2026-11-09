// Supabase Edge Function: vip-purchase
// Server-side check of:
//   1. 1-Time 7-Day Consumer Free Trial claims (action: 'claim_trial') enforced via Two-Line Anti-Abuse
//      (normalized Gmail/+855 Phone SHA-256 identity_hash OR salted Android/Web device_hash).
//   2. ABA / KHQR payment receipts for ALL Consumer VIP plans ($0.99 win-back, $2.99/30d, $6.99/90d, $19.99/365d)
//      and Independent Shop Subscription plans ($6.99/30d, $59.99/365d, $49.99 Early-Bird first 50 shops).
//
// DEFAULT = MANUAL APPROVAL: nothing paid is activated automatically unless VIP_AUTO_APPROVE=true is set.
// Every receipt is stored as `pending` together with the AI pre-check so the admin can approve hundreds of
// Consumer + Shop payments in 5 seconds via the ABA Statement Matcher (Excel .xlsx / CSV) or 1-Click AI Approve.
//
// Deploy:  supabase functions deploy vip-purchase --no-verify-jwt --project-ref ryvltobwuwuulazqjnza

import { verifyToken } from '../_shared/admin-token.ts';
import { geminiEndpoints, shouldTryNextEndpoint } from '../food-ai/endpoint.ts';
import { WindowLimiter, envInt, safeUserId, userKvKey, verifyClientAppIntegrity } from '../_shared/common.ts';
import { computeServerIdentityHashes, sanitizeHexHash, validateCambodiaPhoneForRegistration } from '../_shared/identity-normalize.ts';
import { createAbaReceiptVisionAdapter } from '../_shared/payment-adapter.ts';
import {
  applyShopSubscriptionGrant,
  applyTrial7dGrant,
  applyVipGrant,
  buildReport,
  computeVipWindow,
  isValidTrxKey,
  normalizeTrxKey,
  resolveOfficialServerPlan,
  resolvePlan,
  type ExtractedReceipt,
  type OfficialPaidPlanId,
  type PricingDoc,
  type ReceiptDecision,
} from '../_shared/receipt-rules.ts';
import { background, getSecurityConfig, logUsage, readUserDoc, restInsert, restPatch, restSelectRows, usageHit, writeKv } from '../_shared/supa.ts';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kft-user-id, x-kft-admin-token, x-kft-app-id, x-kft-app-platform, x-kft-app-sig',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'x-vip-purchase',
  'x-vip-purchase': '1',
};
const burst = new WindowLimiter(8, 60_000);
const MAX_BODY = 7 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
const receiptAdapter = createAbaReceiptVisionAdapter();

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return req.headers.get('cf-connecting-ip') || fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

const PROMPT = `Analyze this Cambodian ABA Bank / KHQR payment receipt image and return ONLY a JSON object with these exact keys:
{
  "isAbaReceipt": boolean,
  "trxId": string or null (the Trx. ID / Reference number printed on the receipt),
  "amountUsd": number or null (the numeric payment amount, positive, e.g. 2.99 or 6.99),
  "currency": "USD" or "KHR",
  "recipientName": string or null (the recipient account name shown on the receipt),
  "recipientAccount": string or null (the "To account" number),
  "transactionDate": string or null (the "Transaction date" exactly as printed, e.g. "Oct 23, 2025 06:31 PM"),
  "senderName": string or null (the "From" name),
  "paymentStatus": "completed" | "pending" | "failed" | "unknown",
  "isModifiedOrFake": boolean (true if fonts/digits/layers look edited, photoshopped, overlaid, or fake),
  "tamperReason": string or null (reason if isModifiedOrFake is true, otherwise null)
}
Read ONLY what is printed. Never guess or invent a value; use null when it is not visible.`;

async function extractWithGemini(apiKey: string, mime: string, b64: string): Promise<ExtractedReceipt | null> {
  for (const model of MODELS) {
    for (const t of geminiEndpoints(apiKey, model)) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);
      try {
        const res = await fetch(t.url, {
          method: 'POST',
          headers: t.headers,
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: PROMPT }, { inlineData: { mimeType: mime, data: b64 } }] }],
            generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 800 },
          }),
        });
        if (res.status === 200) {
          const data = await res.json();
          const text = (data?.candidates?.[0]?.content?.parts || [])
            .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
            .map((p: { text: string }) => p.text)
            .join('');
          const m = /\{[\s\S]*\}/.exec(text);
          if (!m) continue;
          const p = JSON.parse(m[0]);
          const num =
            typeof p.amountUsd === 'number'
              ? Math.abs(p.amountUsd)
              : p.amountUsd
                ? Math.abs(parseFloat(String(p.amountUsd)))
                : undefined;
          return {
            isAbaReceipt: Boolean(p.isAbaReceipt),
            trxId: p.trxId ? String(p.trxId).trim() : undefined,
            amountUsd: num !== undefined && Number.isFinite(num) ? num : undefined,
            currency: p.currency ? String(p.currency) : 'USD',
            recipientName: p.recipientName ? String(p.recipientName).trim() : undefined,
            recipientAccount: p.recipientAccount ? String(p.recipientAccount).trim() : undefined,
            transactionDate: p.transactionDate ? String(p.transactionDate).trim() : undefined,
            senderName: p.senderName ? String(p.senderName).trim() : undefined,
            paymentStatus:
              typeof p.paymentStatus === 'string' && ['completed', 'pending', 'failed', 'unknown'].includes(p.paymentStatus.toLowerCase())
                ? (p.paymentStatus.toLowerCase() as 'completed' | 'pending' | 'failed' | 'unknown')
                : 'completed',
            isModifiedOrFake: Boolean(p.isModifiedOrFake),
            tamperReason: p.tamperReason ? String(p.tamperReason).trim() : undefined,
          };
        }
        if (!shouldTryNextEndpoint(res.status)) break;
      } catch {
        /* timeout / parse error -> next */
      } finally {
        clearTimeout(timer);
      }
    }
  }
  return null;
}

function parseDataUrl(s: unknown): { mime: string; b64: string; bytes: Uint8Array } | null {
  if (typeof s !== 'string') return null;
  const m = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/.exec(s.replace(/\s+/g, ''));
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    const minBytes = m[1] === 'application/pdf' ? 400 : 2000;
    if (bin.length > MAX_IMAGE_BYTES || bin.length < minBytes) return null;
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { mime: m[1], b64: m[2], bytes };
  } catch {
    return null;
  }
}

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hasExistingClaim(
  claimType: 'trial_7d' | 'consumer_promo_30d',
  userId: string,
  identityHashes: string[],
  deviceHash: string | null
): Promise<'user' | 'identity' | 'device' | null> {
  const byUser = await restSelectRows(
    `kft_trial_promo_claims?claim_type=eq.${claimType}&user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`
  );
  if (byUser && byUser[0]) return 'user';

  for (const idHash of identityHashes) {
    const byId = await restSelectRows(
      `kft_trial_promo_claims?claim_type=eq.${claimType}&identity_hash=eq.${encodeURIComponent(idHash)}&select=id&limit=1`
    );
    if (byId && byId[0]) return 'identity';
  }

  if (deviceHash) {
    const byDev = await restSelectRows(
      `kft_trial_promo_claims?claim_type=eq.${claimType}&device_hash=eq.${encodeURIComponent(deviceHash)}&select=id&limit=1`
    );
    if (byDev && byDev[0]) return 'device';
  }

  return null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const appIntegrity = verifyClientAppIntegrity(req);
  if (!appIntegrity.ok) return json(403, { ok: false, error: 'CLONED_APP_BLOCKED' });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

  const started = Date.now();
  const ip = clientIp(req);
  if (!burst.allow(ip)) return json(429, { ok: false, error: 'RATE_LIMITED' });
  if (Number(req.headers.get('content-length') || '0') > MAX_BODY) return json(413, { ok: false, error: 'TOO_LARGE' });

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return json(413, { ok: false, error: 'TOO_LARGE' });
    body = JSON.parse(text);
  } catch {
    return json(400, { ok: false, error: 'BAD_REQUEST' });
  }

  // 1-Time 7-Day Consumer Free Trial (Android & Web only; does not require Gemini vision)
  if (body.action === 'get_payment_registry_and_audit') {
    return handleAdminGetPaymentRegistryAndAudit(req, body);
  }
  if (body.action === 'admin_approve_transaction') {
    return handleAdminApproveTransaction(req, body, ip);
  }
  if (body.action === 'admin_reject_transaction') {
    return handleAdminRejectTransaction(req, body, ip);
  }
  if (body.action === 'claim_trial') {
    return handleClaimTrial(body, started, ip);
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) return json(503, { ok: false, error: 'NOT_CONFIGURED' });

  const userId = safeUserId(body.userId);
  if (!userId) return json(400, { ok: false, error: 'BAD_USER' });
  const img = parseDataUrl(body.receiptDataUrl);
  if (!img) return json(400, { ok: false, error: 'BAD_IMAGE' });

  const used = await usageHit(userId, 'vip_purchase', 1);
  if (used !== null && used > envInt(Deno.env.get('VIP_PURCHASE_DAILY_LIMIT'), 8, 1, 100)) {
    return json(429, { ok: false, error: 'DAILY_LIMIT' });
  }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const [userDoc, pricing] = await Promise.all([readUserDoc(userKvKey(userId)), readUserDoc('kft_cloud_admin_vip_pricing_v2')]);

  const requestedPlanId = typeof body.planId === 'string' && body.planId.trim() ? body.planId.trim() : null;
  const shopId = typeof body.shopId === 'string' && body.shopId.trim() ? safeUserId(body.shopId.trim()) : null;

  const officialPlan = requestedPlanId ? resolveOfficialServerPlan(pricing as PricingDoc | null, requestedPlanId) : null;
  const legacyPlan = !requestedPlanId
    ? resolvePlan(pricing as PricingDoc | null, typeof body.durationDays === 'number' ? body.durationDays : Number(body.durationDays))
    : null;

  const plan = officialPlan || legacyPlan;
  if (!plan) return json(400, { ok: false, error: 'UNKNOWN_PLAN' });
  if (officialPlan && officialPlan.category === 'shop' && !shopId) {
    return json(400, { ok: false, error: 'SHOP_ID_REQUIRED' });
  }

  // Enforce Two-Line Eligibility on 1-time $0.99 Win-Back Promo (must have used & expired 7d trial first, never claimed twice)
  const storedUser = userDoc && typeof userDoc === 'object' ? (userDoc as Record<string, unknown>) : {};
  const deviceHash = sanitizeHexHash(body.deviceHash);
  const idInfo = await computeServerIdentityHashes({
    email: storedUser.email ?? body.email,
    phone: storedUser.phone ?? body.phone,
    clientIdentityHashes: body.identityHashes,
  });

  if (officialPlan && officialPlan.planId === 'consumer_promo_30d') {
    if (!deviceHash) {
      return json(400, { ok: false, error: 'DEVICE_REQUIRED' });
    }
    if (idInfo.isDisposableEmail) {
      return json(400, { ok: false, error: 'DISPOSABLE_EMAIL_NOT_ALLOWED' });
    }
    if (storedUser.promo099Used === true) {
      return json(400, { ok: false, error: 'PROMO_ALREADY_CLAIMED' });
    }
    const trialExpRaw = storedUser.freeTrialExpiresAt || storedUser.subscriptionExpiryDate || storedUser.vipExpiresAt;
    const hadTrial = Boolean(storedUser.freeTrialActivated || storedUser.freeTrialActivatedAt || storedUser.freeTrialExpiresAt);
    const trialExpMs = typeof trialExpRaw === 'string' ? Date.parse(trialExpRaw) : NaN;
    if (!hadTrial || !Number.isFinite(trialExpMs) || trialExpMs > nowMs) {
      return json(400, { ok: false, error: 'PROMO_REQUIRES_EXPIRED_TRIAL' });
    }
    const priorPromo = await hasExistingClaim('consumer_promo_30d', userId, idInfo.identityHashes, deviceHash);
    if (priorPromo) {
      return json(400, { ok: false, error: 'PROMO_ALREADY_CLAIMED' });
    }
  }

  const imageHash = await sha256Bytes(img.bytes);
  const finish = (decision: ReceiptDecision, extra: Record<string, unknown>): Response => {
    background(logUsage({ user_key: userId, kind: 'vip_purchase', provider: 'gemini', status: decision === 'verified' ? 200 : 202, ms: Date.now() - started, note: officialPlan ? `${decision}:${officialPlan.planId}` : decision }));
    return json(200, { ok: true, decision, ...extra });
  };

  const userEmail = typeof (storedUser.email ?? body.email) === 'string' ? String(storedUser.email ?? body.email).trim() : null;

  // Same screenshot or PDF seen before across ANY account? (anti-replay in both kft_payment_receipts and kft_used_aba_transactions)
  const [seenReceipt, seenUsedImg] = await Promise.all([
    restSelectRows(`kft_payment_receipts?image_hash=eq.${imageHash}&select=status,user_id,trx_key&limit=1`),
    restSelectRows(`kft_used_aba_transactions?image_hash=eq.${imageHash}&select=trx_key,user_id&limit=1`),
  ]);
  if ((seenReceipt && seenReceipt[0]) || (seenUsedImg && seenUsedImg[0])) {
    const prevOwner = (seenUsedImg && seenUsedImg[0]?.user_id) || (seenReceipt && seenReceipt[0]?.user_id) || null;
    await recordPaymentAuditLog({
      event_type: 'rejected_duplicate_image',
      trx_key: (seenUsedImg && seenUsedImg[0]?.trx_key) || (seenReceipt && seenReceipt[0]?.trx_key) || null,
      image_hash: imageHash,
      user_id: userId,
      user_email: userEmail,
      amount_usd: plan.priceUsd,
      plan_id: officialPlan?.planId || null,
      duration_days: plan.days,
      payment_status: 'duplicate_image',
      actor: `user:${userId}`,
      ip_address: ip,
      details: { previousOwnerUserId: prevOwner, crossAccountAttempt: Boolean(prevOwner && prevOwner !== userId) },
    });
    const report = buildReport({
      decision: 'rejected',
      evaluation: null,
      extracted: null,
      duplicate: true,
      nowIso,
      noteKh: '❌ វិក្កយបត្រនេះត្រូវបានប្រើរួចហើយ (មិនអនុញ្ញាតឲ្យប្រើស្ទួនឡើយ)',
      noteEn: '❌ This receipt file (screenshot/PDF) has already been used and cannot be reused.',
    });
    return finish('rejected', { report });
  }

  const lastVerifiedPaymentAtMs = await findLastVerifiedPaymentMs(userId, storedUser);
  const extracted = await extractWithGemini(geminiKey, img.mime, img.b64);
  const checkOutcome = receiptAdapter.verify({
    extractedReceipt: extracted,
    expectedAmountUsd: plan.priceUsd,
    expectedDays: plan.days,
    submittedTrxId: typeof body.submittedTrxId === 'string' ? body.submittedTrxId : '',
    nowMs,
    lastVerifiedPaymentAtMs,
  });

  const patchPlanAndShopColumns = () => {
    background(
      restPatch(`kft_payment_receipts?image_hash=eq.${imageHash}`, {
        ...(officialPlan ? { plan_id: officialPlan.planId, shop_id: shopId || null } : {}),
        user_email: userEmail,
        payment_status: extracted?.paymentStatus || 'unknown',
        transaction_date: extracted?.transactionDate || null,
        is_modified_or_fake: Boolean(extracted?.isModifiedOrFake),
      })
    );
  };

  if (checkOutcome.aiUnavailable || !extracted || !checkOutcome.evaluation) {
    await restInsert('kft_payment_receipts', {
      user_id: userId,
      image_hash: imageHash,
      plan_days: plan.days,
      amount_usd: plan.priceUsd,
      status: 'pending',
      reasons: ['ai_unavailable'],
      grant_info: officialPlan ? { planId: officialPlan.planId, shopId: shopId || null, category: officialPlan.category } : null,
    });
    patchPlanAndShopColumns();
    await recordPaymentAuditLog({
      event_type: 'pending_manual_review',
      image_hash: imageHash,
      user_id: userId,
      user_email: userEmail,
      amount_usd: plan.priceUsd,
      plan_id: officialPlan?.planId || null,
      duration_days: plan.days,
      payment_status: 'ai_unavailable',
      actor: `user:${userId}`,
      ip_address: ip,
      details: { reason: 'ai_unavailable', mime: img.mime },
    });
    const report = buildReport({
      decision: 'pending',
      evaluation: null,
      extracted: null,
      duplicate: false,
      nowIso,
      noteKh: '⏳ បានទទួលវិក្កយបត្រ។ រដ្ឋបាលនឹងផ្ទៀងផ្ទាត់ និងបើកកញ្ចប់ជូនលោកអ្នក។',
      noteEn: '⏳ Receipt received. An administrator will verify it against the bank statement and activate your plan.',
    });
    return finish('pending', { report });
  }

  const evaluation = checkOutcome.evaluation;

  let dupTrx = false;
  let dupOwnerUserId: string | null = null;
  if (evaluation.trxKey) {
    const [usedRows, receiptRows] = await Promise.all([
      restSelectRows(`kft_used_aba_transactions?trx_key=eq.${encodeURIComponent(evaluation.trxKey)}&select=trx_key,user_id,user_email&limit=1`),
      restSelectRows(`kft_payment_receipts?trx_key=eq.${encodeURIComponent(evaluation.trxKey)}&status=in.(verified,pending)&select=id,user_id&limit=1`),
    ]);
    if (usedRows && usedRows[0]) {
      dupTrx = true;
      dupOwnerUserId = String(usedRows[0].user_id || '');
    } else if (receiptRows && receiptRows[0]) {
      dupTrx = true;
      dupOwnerUserId = String(receiptRows[0].user_id || '');
    }
  }
  const autoApprove = Deno.env.get('VIP_AUTO_APPROVE') === 'true';

  const baseRow = {
    user_id: userId,
    image_hash: imageHash,
    trx_key: evaluation.trxKey || null,
    amount_usd: extracted.amountUsd ?? null,
    plan_days: plan.days,
    extracted,
  };

  if (autoApprove && evaluation.allPassed && !dupTrx && userDoc && typeof userDoc === 'object') {
    const isShopPlan = Boolean(officialPlan && officialPlan.category === 'shop' && shopId);
    const win = computeVipWindow((userDoc as Record<string, unknown>).subscriptionExpiryDate, plan.days, nowMs);
    const grant = {
      startIso: win.startIso,
      expiryIso: win.expiryIso,
      days: plan.days,
      planType: plan.planType,
      trxId: evaluation.trxKey,
      ...(officialPlan ? { planId: officialPlan.planId, category: officialPlan.category, shopId: shopId || undefined } : {}),
    };
    const usedIns = await restInsert('kft_used_aba_transactions', {
      trx_key: evaluation.trxKey,
      raw_trx_id: extracted.trxId || evaluation.trxKey,
      user_id: userId,
      user_email: userEmail,
      image_hash: imageHash,
      amount_usd: plan.priceUsd,
      plan_id: officialPlan?.planId || null,
      duration_days: plan.days,
      transaction_date: extracted.transactionDate || null,
      payment_status: extracted.paymentStatus || 'completed',
      statement_matched: false,
      approved_by: 'ai_auto_approve',
      used_at: nowIso,
    });
    const ins = usedIns.status === 409 ? usedIns : await restInsert('kft_payment_receipts', { ...baseRow, status: 'verified', grant_info: grant });
    if (ins.status === 409) {
      await recordPaymentAuditLog({
        event_type: 'rejected_duplicate_trx',
        trx_key: evaluation.trxKey,
        image_hash: imageHash,
        user_id: userId,
        user_email: userEmail,
        amount_usd: extracted.amountUsd ?? plan.priceUsd,
        plan_id: officialPlan?.planId || null,
        duration_days: plan.days,
        payment_status: extracted.paymentStatus || 'completed',
        actor: `user:${userId}`,
        ip_address: ip,
        details: { conflict409: true },
      });
      const report = buildReport({
        decision: 'rejected',
        evaluation,
        extracted,
        duplicate: true,
        nowIso,
        noteKh: '❌ លេខប្រតិបត្តិការ ABA នេះត្រូវបានប្រើរួចហើយ',
        noteEn: '❌ This ABA transaction ID has already been used.',
      });
      return finish('rejected', { report });
    }
    if (ins.status >= 200 && ins.status < 300) {
      patchPlanAndShopColumns();
      let ok = false;
      if (isShopPlan && officialPlan && shopId) {
        ok = await activateShopOnServer(shopId, officialPlan.planId, plan.days, evaluation.trxKey, nowMs, pricing as PricingDoc | null);
      } else {
        ok = await writeKv(userKvKey(userId), applyVipGrant(userDoc as Record<string, unknown>, { ...grant, planId: officialPlan?.planId }));
        if (ok && officialPlan?.planId === 'consumer_promo_30d') {
          await recordTrialOrPromoClaim('consumer_promo_30d', userId, idInfo.identityHashes, deviceHash, win.expiryIso, { trxId: evaluation.trxKey });
        }
      }
      if (ok) {
        await recordPaymentAuditLog({
          event_type: 'auto_verified',
          trx_key: evaluation.trxKey,
          image_hash: imageHash,
          user_id: userId,
          user_email: userEmail,
          amount_usd: plan.priceUsd,
          plan_id: officialPlan?.planId || null,
          duration_days: plan.days,
          payment_status: extracted.paymentStatus || 'completed',
          actor: 'ai_auto_approve',
          ip_address: ip,
          details: { grant },
        });
        const report = buildReport({
          decision: 'verified',
          evaluation,
          extracted,
          duplicate: false,
          nowIso,
          noteKh: `✅ ផ្ទៀងផ្ទាត់ 100%៖ អ្នកទទួលត្រឹមត្រូវ ចំនួន ${plan.priceUsd.toFixed(2)} USD លេខប្រតិបត្តិការ (${evaluation.trxKey}) ហើយកញ្ចប់ត្រូវបានបើក!`,
          noteEn: `✅ 100% verified: recipient, amount ${plan.priceUsd.toFixed(2)} USD, Trx. ID (${evaluation.trxKey}) and date. Plan activated!`,
        });
        return finish('verified', { report, grant });
      }
      await restPatch(`kft_payment_receipts?image_hash=eq.${imageHash}`, { status: 'pending', reasons: ['grant_write_failed'] });
    }
  }

  const hardFail =
    dupTrx ||
    !evaluation.notModifiedOrFake ||
    !evaluation.paymentStatusOk ||
    (extracted.isAbaReceipt && (!evaluation.checks.recipient.passed || !evaluation.checks.amount.passed || !evaluation.checks.date.passed || !evaluation.checks.trxId.passed));
  const decision: ReceiptDecision = hardFail ? 'rejected' : 'pending';
  const readyForAdmin = decision === 'pending' && evaluation.allPassed && !dupTrx;
  await restInsert('kft_payment_receipts', {
    ...baseRow,
    status: decision === 'rejected' ? 'rejected' : 'pending',
    grant_info: officialPlan ? { planId: officialPlan.planId, shopId: shopId || null, category: officialPlan.category } : null,
    reasons: readyForAdmin
      ? ['ai_checks_passed_awaiting_admin_statement_check']
      : Object.entries(evaluation.checks)
          .filter(([, c]) => !c.passed)
          .map(([k]) => k)
          .concat(dupTrx ? ['duplicate_trx'] : [])
          .concat(!evaluation.notModifiedOrFake ? ['modified_or_fake_receipt'] : [])
          .concat(!evaluation.paymentStatusOk ? ['payment_status_not_completed'] : []),
  });
  patchPlanAndShopColumns();

  const auditEventType = dupTrx
    ? 'rejected_duplicate_trx'
    : !evaluation.notModifiedOrFake || !evaluation.paymentStatusOk
      ? 'rejected_fake_or_modified'
      : !evaluation.checks.date.passed && extracted.isAbaReceipt
        ? 'rejected_old_receipt'
        : decision === 'rejected'
          ? 'rejected_mismatch'
          : 'pending_manual_review';

  await recordPaymentAuditLog({
    event_type: auditEventType,
    trx_key: evaluation.trxKey || null,
    image_hash: imageHash,
    user_id: userId,
    user_email: userEmail,
    amount_usd: extracted.amountUsd ?? plan.priceUsd,
    plan_id: officialPlan?.planId || null,
    duration_days: plan.days,
    payment_status: extracted.paymentStatus || 'unknown',
    actor: `user:${userId}`,
    ip_address: ip,
    details: {
      decision,
      dupTrx,
      dupOwnerUserId,
      crossAccountDuplicateAttempt: Boolean(dupTrx && dupOwnerUserId && dupOwnerUserId !== userId),
      isModifiedOrFake: Boolean(extracted.isModifiedOrFake),
      tamperReason: extracted.tamperReason || null,
      transactionDate: extracted.transactionDate || null,
      lastVerifiedPaymentAtMs,
    },
  });

  const failedKh = Object.values(evaluation.checks)
    .filter((c) => !c.passed)
    .map((c) => c.reasonKh)
    .concat(evaluation.statusAndTamperReasonKh ? [evaluation.statusAndTamperReasonKh] : [])
    .concat(dupTrx ? ['❌ លេខប្រតិបត្តិការ ABA នេះត្រូវបានប្រើរួចហើយ (មួយប្រតិបត្តិការបើក VIP បានតែម្តងគត់)'] : [])
    .join(' | ');
  const failedEn = Object.values(evaluation.checks)
    .filter((c) => !c.passed)
    .map((c) => c.reasonEn)
    .concat(evaluation.statusAndTamperReasonEn ? [evaluation.statusAndTamperReasonEn] : [])
    .concat(dupTrx ? ['❌ This ABA Transaction ID has already been used (one transaction can only activate/renew VIP once)'] : [])
    .join(' | ');
  const report = buildReport({
    decision,
    evaluation,
    extracted,
    duplicate: dupTrx,
    nowIso,
    noteKh:
      decision === 'rejected'
        ? `🚫 ការផ្ទៀងផ្ទាត់បដិសេធ៖ ${failedKh}`
        : readyForAdmin
          ? '⏳ បានទទួលវិក្កយបត្រ ហើយការពិនិត្យដោយ AI ជាប់ទាំងអស់ (អ្នកទទួល ចំនួន កាលបរិច្ឆេទ លេខប្រតិបត្តិការ)។ រដ្ឋបាលនឹងផ្ទៀងផ្ទាត់ជាមួយ statement ធនាគារ ហើយបើកកញ្ចប់ជូនលោកអ្នក។'
          : '⏳ បានទទួលវិក្កយបត្រ។ រដ្ឋបាលនឹងផ្ទៀងផ្ទាត់ និងបើកកញ្ចប់ជូនលោកអ្នក។',
    noteEn:
      decision === 'rejected'
        ? `🚫 Payment verification rejected: ${failedEn}`
        : readyForAdmin
          ? '⏳ Receipt received and the AI pre-check passed (recipient, amount, date, Trx. ID). An administrator will match it against the bank statement and activate your plan.'
          : '⏳ Receipt received. An administrator will verify it and activate your plan.',
  });
  return finish(decision, { report });
});

async function recordTrialOrPromoClaim(
  claimType: 'trial_7d' | 'consumer_promo_30d',
  userId: string,
  identityHashes: string[],
  deviceHash: string | null,
  expiresIso: string,
  meta: Record<string, unknown>
): Promise<{ conflict: boolean }> {
  const primaryIdentity = identityHashes[0] || null;
  const ins = await restInsert('kft_trial_promo_claims', {
    claim_type: claimType,
    user_id: userId,
    identity_hash: primaryIdentity,
    device_hash: deviceHash,
    expires_at: expiresIso,
    meta: {
      ...meta,
      extraIdentityHashes: identityHashes.slice(1),
    },
  });
  return { conflict: ins.status === 409 };
}

async function activateShopOnServer(
  shopId: string,
  planId: OfficialPaidPlanId,
  days: number,
  trxId: string,
  nowMs: number,
  pricing: PricingDoc | null
): Promise<boolean> {
  const customList = await readUserDoc('kft_cloud_custom_restaurants_v1');
  if (!Array.isArray(customList)) return false;
  let found = false;
  const startIso = new Date(nowMs).toISOString();
  const updatedList = customList.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const rec = item as Record<string, unknown>;
    if (String(rec.id || '') !== shopId) return item;
    found = true;
    return applyShopSubscriptionGrant(rec, { startIso, days, planId, trxId, nowMs }).updatedShop;
  });
  if (!found) return false;
  const saved = await writeKv('kft_cloud_custom_restaurants_v1', updatedList);
  if (saved && planId === 'shop_earlybird_365d' && pricing && typeof pricing === 'object') {
    const prevCount = Math.max(0, Math.floor(Number(pricing.shopEarlyBirdClaimedCount) || 0));
    background(writeKv('kft_cloud_admin_vip_pricing_v2', { ...pricing, shopEarlyBirdClaimedCount: prevCount + 1 }));
  }
  return saved;
}

async function handleClaimTrial(body: Record<string, unknown>, started: number, ip = 'unknown'): Promise<Response> {
  if (body.platform === 'ios') {
    return json(200, {
      ok: true,
      decision: 'already_claimed',
      reason: 'ios_blocked',
      messageKh: 'កម្មវិធីលើ iOS បើកជូនប្រើប្រាស់ដោយឥតគិតថ្លៃរួចហើយ។',
      messageEn: 'All features are already free on iOS.',
    });
  }

  const userId = safeUserId(body.userId);
  if (!userId) return json(400, { ok: false, error: 'BAD_USER' });

  const used = await usageHit(userId, 'trial_claim', 1);
  if (used !== null && used > 5) {
    return json(429, { ok: false, error: 'DAILY_LIMIT' });
  }

  const targetKvKey = `kft_user_${userId}`;
  const [rawUser, rawPricing] = await Promise.all([
    readUserDoc(targetKvKey),
    readUserDoc('kft_cloud_admin_vip_pricing_v2'),
  ]);
  const pricing = (rawPricing && typeof rawPricing === 'object' ? rawPricing : {}) as PricingDoc;
  if (pricing.consumerVipEnabled === false) {
    return json(200, {
      ok: true,
      decision: 'already_claimed',
      reason: 'disabled',
      messageKh: 'ការសាកល្បង VIP ត្រូវបានផ្អាកជាបណ្ដោះអាសន្ន។',
      messageEn: 'Free trial is temporarily paused.',
    });
  }

  const stored = rawUser && typeof rawUser === 'object' ? (rawUser as Record<string, unknown>) : { id: userId };
  if (
    stored.freeTrialActivated === true ||
    Boolean(stored.freeTrialActivatedAt) ||
    Boolean(stored.freeTrialExpiresAt) ||
    Boolean(stored.subscriptionExpiryDate) ||
    Boolean(stored.vipExpiresAt)
  ) {
    return json(200, {
      ok: true,
      decision: 'already_claimed',
      reason: 'user',
      messageKh: 'គណនីនេះធ្លាប់បានប្រើការសាកល្បងឥតគិតថ្លៃរួចហើយ (ម្តងគត់)។',
      messageEn: 'This account has already used its one-time free trial.',
    });
  }

  const deviceHash = sanitizeHexHash(body.deviceHash);
  if (!deviceHash) {
    return json(200, {
      ok: true,
      decision: 'already_claimed',
      reason: 'device_required',
      messageKh: '⚠️ មិនអាចផ្ទៀងផ្ទាត់ឧបករណ៍បានទេ។ សូមបើកកម្មវិធីម្ដងទៀត រួចសាកល្បងម្ដងទៀត។',
      messageEn: '⚠️ Could not verify device identity. Please reopen the app and try again.',
    });
  }

  const candidatePhoneRaw = stored.phone ?? body.phone;
  if (typeof candidatePhoneRaw === 'string' && candidatePhoneRaw.trim().length > 0) {
    const phoneCheck = validateCambodiaPhoneForRegistration(candidatePhoneRaw);
    if (!phoneCheck.valid) {
      return json(200, {
        ok: true,
        decision: 'already_claimed',
        reason: 'invalid_phone',
        messageKh: phoneCheck.messageKh,
        messageEn: phoneCheck.messageEn,
      });
    }
  }

  const idInfo = await computeServerIdentityHashes({
    email: stored.email ?? body.email,
    phone: stored.phone ?? body.phone,
    clientIdentityHashes: body.identityHashes,
  });

  if (!idInfo.identityHashes || idInfo.identityHashes.length === 0) {
    return json(200, {
      ok: true,
      decision: 'already_claimed',
      reason: 'identity_required',
      messageKh: '⚠️ សូមចូលគណនីដោយប្រើលេខទូរស័ព្ទ ឬ Google ជាមុនសិន ដើម្បីបើកការសាកល្បងឥតគិតថ្លៃ 7 ថ្ងៃ។',
      messageEn: '⚠️ Please sign in with a valid phone number or Google account first to claim your 7-day free trial.',
    });
  }

  if (idInfo.isDisposableEmail) {
    return json(200, {
      ok: true,
      decision: 'already_claimed',
      reason: 'disposable_email',
      messageKh: 'សូមប្រើលេខទូរស័ព្ទ ឬអ៊ីមែលផ្លូវការ (មិនអនុញ្ញាតអ៊ីមែលបណ្ដោះអាសន្នសម្រាប់សាកល្បងឥតគិតថ្លៃឡើយ)។',
      messageEn: 'Please sign in with a valid phone number or Google/email account (disposable emails are not eligible for free trial).',
    });
  }

  const existingReason = await hasExistingClaim('trial_7d', userId, idInfo.identityHashes, deviceHash);
  if (existingReason) {
    const msgKh =
      existingReason === 'device'
        ? 'ឧបករណ៍នេះធ្លាប់បានប្រើការសាកល្បងឥតគិតថ្លៃ 7 ថ្ងៃរួចហើយ (ម្តងគត់ក្នុងមួយឧបករណ៍)។ ការមើលម្ហូប ហាង សណ្ឋាគារ តំបន់ទេសចរណ៍ និងផែនទី នៅតែ FREE ជារៀងរហូត!'
        : 'គណនី ឬលេខទូរស័ព្ទ/អ៊ីមែលនេះធ្លាប់បានប្រើការសាកល្បងឥតគិតថ្លៃ 7 ថ្ងៃរួចហើយ។';
    const msgEn =
      existingReason === 'device'
        ? 'This device has already used its one-time 7-day free trial. Core browsing & maps remain 100% FREE forever!'
        : 'This account or phone/email has already used its one-time 7-day free trial.';
    return json(200, { ok: true, decision: 'already_claimed', reason: existingReason, messageKh: msgKh, messageEn: msgEn });
  }

  if (ip && ip !== 'unknown') {
    const ipUsed = await usageHit(`ip:${ip}`, 'trial_ip', 1);
    if (ipUsed !== null && ipUsed > envInt(Deno.env.get('TRIAL_IP_DAILY_LIMIT'), 2, 1, 20)) {
      return json(200, {
        ok: true,
        decision: 'already_claimed',
        reason: 'ip_rate_limited',
        messageKh: '⚠️ បណ្ដាញអ៊ីនធឺណិត (IP) នេះបានបើកការសាកល្បងឥតគិតថ្លៃគ្រប់កំណត់ប្រចាំថ្ងៃហើយ (២ ដង/ថ្ងៃ)។',
        messageEn: '⚠️ Daily free-trial limit reached for this network (IP).',
      });
    }
  }

  const trialDays = Math.min(60, Math.max(1, Math.round(Number(pricing.consumerTrialDays) || 7)));
  const nowMs = Date.now();
  const startIso = new Date(nowMs).toISOString();
  const expiryIso = new Date(nowMs + trialDays * 86_400_000).toISOString();
  const trxId = `TRIAL-7D-${nowMs.toString(36).toUpperCase()}`;

  const claimRes = await recordTrialOrPromoClaim('trial_7d', userId, idInfo.identityHashes, deviceHash, expiryIso, {
    platform: typeof body.platform === 'string' ? body.platform.slice(0, 20) : 'unknown',
    trxId,
  });
  if (claimRes.conflict) {
    return json(200, {
      ok: true,
      decision: 'already_claimed',
      reason: 'device',
      messageKh: 'ការសាកល្បងឥតគិតថ្លៃ 7 ថ្ងៃត្រូវបានប្រើរួចហើយលើគណនី ឬឧបករណ៍នេះ។',
      messageEn: 'The one-time 7-day free trial has already been claimed on this account or device.',
    });
  }

  const grant = { startIso, expiryIso, days: trialDays, planType: 'trial_7d', planId: 'trial_7d', trxId };
  const ok = await writeKv(targetKvKey, applyTrial7dGrant(stored, { startIso, expiryIso, days: trialDays, trxId }));
  background(logUsage({ user_key: userId, kind: 'trial_claim', provider: 'server', status: ok ? 200 : 500, ms: Date.now() - started, note: ok ? 'granted' : 'kv_write_failed' }));
  if (!ok) {
    return json(500, { ok: false, error: 'WRITE_FAILED' });
  }
  return json(200, { ok: true, decision: 'trial_granted', grant });
}


async function recordPaymentAuditLog(entry: {
  event_type: string;
  txn_id?: string | null;
  trx_key?: string | null;
  image_hash?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  amount_usd?: number | null;
  plan_id?: string | null;
  duration_days?: number | null;
  payment_status?: string | null;
  actor: string;
  ip_address?: string | null;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await restInsert('kft_payment_audit_log', {
      event_type: entry.event_type,
      txn_id: entry.txn_id || null,
      trx_key: entry.trx_key || null,
      image_hash: entry.image_hash || null,
      user_id: entry.user_id || null,
      user_email: entry.user_email || null,
      amount_usd: typeof entry.amount_usd === 'number' && Number.isFinite(entry.amount_usd) ? entry.amount_usd : null,
      plan_id: entry.plan_id || null,
      duration_days: typeof entry.duration_days === 'number' && Number.isFinite(entry.duration_days) ? entry.duration_days : null,
      payment_status: entry.payment_status || null,
      actor: entry.actor || 'system',
      ip_address: entry.ip_address || null,
      details: entry.details || {},
    });
  } catch {
    /* audit log best-effort */
  }
}

async function findLastVerifiedPaymentMs(userId: string, storedUser: Record<string, unknown>): Promise<number | null> {
  let latestMs = 0;
  try {
    const [usedRows, recRows] = await Promise.all([
      restSelectRows(`kft_used_aba_transactions?user_id=eq.${encodeURIComponent(userId)}&order=used_at.desc&select=used_at&limit=1`),
      restSelectRows(`kft_payment_receipts?user_id=eq.${encodeURIComponent(userId)}&status=eq.verified&order=created_at.desc&select=created_at,approved_at&limit=1`),
    ]);
    if (usedRows && usedRows[0]?.used_at) {
      const ms = Date.parse(String(usedRows[0].used_at));
      if (Number.isFinite(ms) && ms > latestMs) latestMs = ms;
    }
    if (recRows && recRows[0]) {
      const raw = recRows[0].approved_at || recRows[0].created_at;
      const ms = raw ? Date.parse(String(raw)) : NaN;
      if (Number.isFinite(ms) && ms > latestMs) latestMs = ms;
    }
  } catch {
    /* ignore */
  }
  if (storedUser.paymentMethod !== 'FREE_TRIAL_7D' && typeof storedUser.subscriptionStartDate === 'string') {
    const ms = Date.parse(storedUser.subscriptionStartDate);
    if (Number.isFinite(ms) && ms > latestMs) latestMs = ms;
  }
  return latestMs > 0 ? latestMs : null;
}

async function verifyAdminRequest(req: Request, bodyToken: unknown): Promise<boolean> {
  const secret = await getSecurityConfig('admin_token_secret');
  if (!secret || secret.length < 32) return false;
  const tok = req.headers.get('x-kft-admin-token') || (typeof bodyToken === 'string' ? bodyToken : '');
  const res = await verifyToken(secret, tok, 'admin');
  return res.ok;
}

async function handleAdminGetPaymentRegistryAndAudit(req: Request, body: Record<string, unknown>): Promise<Response> {
  if (!(await verifyAdminRequest(req, body.adminToken))) {
    return json(401, { ok: false, error: 'ADMIN_AUTH_REQUIRED' });
  }
  const [usedTransactions, auditLogs, receipts] = await Promise.all([
    restSelectRows('kft_used_aba_transactions?select=*&order=used_at.desc&limit=500'),
    restSelectRows('kft_payment_audit_log?select=*&order=created_at.desc&limit=500'),
    restSelectRows('kft_payment_receipts?select=id,created_at,user_id,user_email,txn_id,trx_key,image_hash,amount_usd,plan_days,status,payment_status,transaction_date,is_modified_or_fake,statement_matched,reviewed_by,approved_at&order=created_at.desc&limit=300'),
  ]);
  return json(200, {
    ok: true,
    usedTransactions: usedTransactions || [],
    auditLogs: auditLogs || [],
    receipts: receipts || [],
  });
}

async function handleAdminApproveTransaction(req: Request, body: Record<string, unknown>, ip: string): Promise<Response> {
  if (!(await verifyAdminRequest(req, body.adminToken))) {
    return json(401, { ok: false, error: 'ADMIN_AUTH_REQUIRED' });
  }
  const rawTrxId = typeof body.trxId === 'string' ? body.trxId.trim() : '';
  const trxKey = normalizeTrxKey(rawTrxId);
  const txnId = typeof body.txnId === 'string' ? body.txnId.trim() : '';
  const targetUserId = safeUserId(body.targetUserId) || String(body.targetUserId || 'unknown').slice(0, 80);
  const targetEmail = typeof body.targetEmail === 'string' ? body.targetEmail.trim() : null;
  const adminActor = typeof body.adminActor === 'string' && body.adminActor.trim() ? body.adminActor.trim().slice(0, 80) : 'admin';
  const verifiedUsd = Number(body.verifiedUsd) || 0;
  const durationDays = Math.max(1, Math.round(Number(body.durationDays) || 30));
  const planId = typeof body.planId === 'string' ? body.planId.trim() : null;
  const transactionDate = typeof body.transactionDate === 'string' ? body.transactionDate.trim() : null;
  const statementMatched = Boolean(body.statementMatched);
  const statementRowRef = typeof body.statementRowRef === 'string' ? body.statementRowRef.trim() : null;

  if (!trxKey || !isValidTrxKey(trxKey)) {
    await recordPaymentAuditLog({
      event_type: 'admin_blocked_duplicate',
      txn_id: txnId || null,
      trx_key: rawTrxId || null,
      user_id: targetUserId,
      user_email: targetEmail,
      amount_usd: verifiedUsd,
      plan_id: planId,
      duration_days: durationDays,
      payment_status: 'invalid_trx_id',
      actor: adminActor,
      ip_address: ip,
      details: { reason: 'missing_or_placeholder_trx_id', rawTrxId },
    });
    return json(200, {
      ok: true,
      decision: 'invalid_trx_id',
      messageKh: '🚫 មិនអាចអនុម័តបានទេ៖ គ្មានលេខប្រតិបត្តិការ ABA (Trx. ID) ពិតប្រាកដឡើយ។',
      messageEn: '🚫 Cannot approve: missing or placeholder ABA Transaction ID (Trx. ID).',
    });
  }

  const [existingUsed, existingReceipts] = await Promise.all([
    restSelectRows(`kft_used_aba_transactions?trx_key=eq.${encodeURIComponent(trxKey)}&select=trx_key,user_id,user_email,txn_id,used_at&limit=1`),
    restSelectRows(`kft_payment_receipts?trx_key=eq.${encodeURIComponent(trxKey)}&select=status,user_id,user_email,txn_id,is_modified_or_fake,payment_status&limit=5`),
  ]);

  const tamperedReceipt = (existingReceipts || []).find((r) => r.is_modified_or_fake === true);
  if (tamperedReceipt) {
    await recordPaymentAuditLog({
      event_type: 'rejected_fake_or_modified',
      txn_id: txnId || null,
      trx_key: trxKey,
      user_id: targetUserId,
      user_email: targetEmail,
      amount_usd: verifiedUsd,
      plan_id: planId,
      duration_days: durationDays,
      payment_status: 'tampered_receipt',
      actor: adminActor,
      ip_address: ip,
      details: { reason: 'receipt_flagged_modified_or_fake' },
    });
    return json(200, {
      ok: true,
      decision: 'invalid_trx_id',
      messageKh: '🚫 មិនអាចអនុម័តបានទេ៖ វិក្កយបត្រនេះត្រូវបានរកឃើញថាកែប្រែ ឬក្លែងបន្លំ!',
      messageEn: '🚫 Cannot approve: this receipt was flagged as modified or fake!',
    });
  }

  const verifiedReceipt = (existingReceipts || []).find((r) => r.status === 'verified');
  if ((existingUsed && existingUsed[0]) || verifiedReceipt) {
    const prevUser = String((existingUsed && existingUsed[0]?.user_id) || verifiedReceipt?.user_id || '');
    const prevEmail = String((existingUsed && existingUsed[0]?.user_email) || verifiedReceipt?.user_email || prevUser);
    await recordPaymentAuditLog({
      event_type: 'admin_blocked_duplicate',
      txn_id: txnId || null,
      trx_key: trxKey,
      user_id: targetUserId,
      user_email: targetEmail,
      amount_usd: verifiedUsd,
      plan_id: planId,
      duration_days: durationDays,
      payment_status: 'already_used',
      actor: adminActor,
      ip_address: ip,
      details: {
        usedByUserId: prevUser,
        usedByEmail: prevEmail,
        crossAccountAttempt: prevUser !== targetUserId,
      },
    });
    return json(200, {
      ok: true,
      decision: 'already_used',
      usedByUserId: prevUser,
      usedByEmail: prevEmail,
      messageKh: `🚫 លេខប្រតិបត្តិការ ABA (${trxKey}) ត្រូវបានប្រើរួចហើយដោយគណនី ${prevEmail}! មួយប្រតិបត្តិការបើក VIP បានតែម្តងគត់។`,
      messageEn: `🚫 ABA Transaction ID (${trxKey}) has already been used by account ${prevEmail}! One transaction can only activate/renew VIP once.`,
    });
  }

  const nowIso = new Date().toISOString();
  const ins = await restInsert('kft_used_aba_transactions', {
    trx_key: trxKey,
    raw_trx_id: rawTrxId || trxKey,
    txn_id: txnId || null,
    user_id: targetUserId,
    user_email: targetEmail,
    amount_usd: verifiedUsd,
    plan_id: planId,
    duration_days: durationDays,
    transaction_date: transactionDate,
    payment_status: 'completed',
    statement_matched: statementMatched,
    statement_row_ref: statementRowRef,
    approved_by: adminActor,
    used_at: nowIso,
  });

  if (ins.status === 409) {
    await recordPaymentAuditLog({
      event_type: 'admin_blocked_duplicate',
      txn_id: txnId || null,
      trx_key: trxKey,
      user_id: targetUserId,
      user_email: targetEmail,
      amount_usd: verifiedUsd,
      plan_id: planId,
      duration_days: durationDays,
      payment_status: 'conflict_409',
      actor: adminActor,
      ip_address: ip,
      details: { conflict409: true },
    });
    return json(200, {
      ok: true,
      decision: 'already_used',
      messageKh: `🚫 លេខប្រតិបត្តិការ ABA (${trxKey}) ត្រូវបានប្រើរួចហើយ!`,
      messageEn: `🚫 ABA Transaction ID (${trxKey}) has already been used!`,
    });
  }

  await restPatch(`kft_payment_receipts?trx_key=eq.${encodeURIComponent(trxKey)}`, {
    status: 'verified',
    reviewed_at: nowIso,
    approved_at: nowIso,
    reviewed_by: adminActor,
    statement_matched: statementMatched,
    txn_id: txnId || null,
    user_email: targetEmail,
  });

  // Also persist Consumer VIP grant onto the stored kft_user_<id> record with service_role
  // so verifyUserVipStatusFromBackend and food-ai immediately recognize the user's active VIP.
  if (targetUserId && targetUserId !== 'unknown' && (!planId || !planId.startsWith('shop_'))) {
    try {
      const existingDoc = await readUserDoc(userKvKey(targetUserId));
      const baseDoc = existingDoc && typeof existingDoc === 'object' ? (existingDoc as Record<string, unknown>) : { id: targetUserId, email: targetEmail || '' };
      const win = computeVipWindow(baseDoc.subscriptionExpiryDate, durationDays, Date.now());
      const planType = durationDays >= 300 ? 'annual' : 'quarterly';
      const updatedDoc = applyVipGrant(baseDoc, {
        startIso: win.startIso,
        expiryIso: win.expiryIso,
        days: durationDays,
        planType,
        trxId: trxKey,
        ...(planId ? { planId: planId as OfficialPaidPlanId } : {}),
      });
      await writeKv(userKvKey(targetUserId), updatedDoc);
    } catch {
      // non-fatal; client also syncs atomic user record
    }
  }

  if (statementMatched) {
    await recordPaymentAuditLog({
      event_type: 'statement_matched',
      txn_id: txnId || null,
      trx_key: trxKey,
      user_id: targetUserId,
      user_email: targetEmail,
      amount_usd: verifiedUsd,
      plan_id: planId,
      duration_days: durationDays,
      payment_status: 'completed',
      actor: adminActor,
      ip_address: ip,
      details: { statementRowRef },
    });
  }

  await recordPaymentAuditLog({
    event_type: 'admin_approved',
    txn_id: txnId || null,
    trx_key: trxKey,
    user_id: targetUserId,
    user_email: targetEmail,
    amount_usd: verifiedUsd,
    plan_id: planId,
    duration_days: durationDays,
    payment_status: 'completed',
    actor: adminActor,
    ip_address: ip,
    details: { statementMatched, statementRowRef },
  });

  return json(200, { ok: true, decision: 'approved_and_locked', trxKey });
}

async function handleAdminRejectTransaction(req: Request, body: Record<string, unknown>, ip: string): Promise<Response> {
  if (!(await verifyAdminRequest(req, body.adminToken))) {
    return json(401, { ok: false, error: 'ADMIN_AUTH_REQUIRED' });
  }
  const rawTrxId = typeof body.trxId === 'string' ? body.trxId.trim() : '';
  const trxKey = normalizeTrxKey(rawTrxId);
  const txnId = typeof body.txnId === 'string' ? body.txnId.trim() : '';
  const targetUserId = safeUserId(body.targetUserId) || String(body.targetUserId || 'unknown').slice(0, 80);
  const targetEmail = typeof body.targetEmail === 'string' ? body.targetEmail.trim() : null;
  const adminActor = typeof body.adminActor === 'string' && body.adminActor.trim() ? body.adminActor.trim().slice(0, 80) : 'admin';
  const verifiedUsd = Number(body.verifiedUsd) || 0;
  const durationDays = Math.max(1, Math.round(Number(body.durationDays) || 30));
  const planId = typeof body.planId === 'string' ? body.planId.trim() : null;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : 'admin_rejected';

  if (trxKey) {
    await restPatch(`kft_payment_receipts?trx_key=eq.${encodeURIComponent(trxKey)}`, {
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminActor,
    });
  }

  await recordPaymentAuditLog({
    event_type: 'admin_rejected',
    txn_id: txnId || null,
    trx_key: trxKey || rawTrxId || null,
    user_id: targetUserId,
    user_email: targetEmail,
    amount_usd: verifiedUsd,
    plan_id: planId,
    duration_days: durationDays,
    payment_status: 'rejected',
    actor: adminActor,
    ip_address: ip,
    details: { reason },
  });

  return json(200, { ok: true, decision: 'rejected' });
}

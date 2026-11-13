/**
 * Pure server-side rules for checking an ABA / KHQR payment receipt (shared with unit tests, no Deno globals).
 * Port of the on-device checks in src/services/aiPaymentVerificationService.ts, hardened:
 *   - a Trx ID MUST be read from the receipt (the old "invent a reference from the image fingerprint" fallback is gone)
 *   - the receipt date must be inside a short window (not older than 14 days, not in the future)
 *   - price / duration come from the SERVER copy of the VIP pricing, never from the client
 */

export const OFFICIAL_RECIPIENT_ACCOUNTS = ['000056833', '003787096', '095245959', '012719946'];
export const RECEIPT_MAX_AGE_DAYS = 14;

export interface ExtractedReceipt {
  isAbaReceipt: boolean;
  trxId?: string;
  amountUsd?: number;
  currency?: string;
  recipientName?: string;
  recipientAccount?: string;
  transactionDate?: string;
  senderName?: string;
  paymentStatus?: 'completed' | 'pending' | 'failed' | 'unknown';
  isModifiedOrFake?: boolean;
  tamperReason?: string;
}

export interface CheckItem {
  passed: boolean;
  expected: string;
  detected: string;
  reasonKh: string;
  reasonEn: string;
}

export interface Evaluation {
  checks: { recipient: CheckItem; amount: CheckItem; trxId: CheckItem; date: CheckItem };
  allPassed: boolean;
  trxKey: string; // upper-case, no spaces ('' when none)
  paymentStatusOk: boolean;
  notModifiedOrFake: boolean;
  statusAndTamperReasonKh?: string;
  statusAndTamperReasonEn?: string;
}

export function isOfficialRecipient(recipientName?: string, recipientAccount?: string): boolean {
  const cleanName = (recipientName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanAcc = (recipientAccount || '').replace(/\D+/g, '');
  const nameMatched = cleanName.includes('SAVUTH') || (cleanName.includes('CHEA') && cleanName.includes('SAVUTH')) || cleanName.includes('KIM SENG') || cleanName.includes('KIMSENG') || (cleanName.includes('CHEA') && cleanName.includes('SENG'));
  const accMatched = OFFICIAL_RECIPIENT_ACCOUNTS.some((acc) => cleanAcc.length >= 8 && cleanAcc.includes(acc));
  if (cleanName && !nameMatched) return false; // another person's name is shown
  if (cleanAcc && cleanAcc.length >= 8 && !accMatched) return false; // another person's account is shown
  return nameMatched || accMatched;
}

export function normalizeTrxKey(v: unknown): string {
  const raw = typeof v === 'string' ? v.trim() : '';
  const stripped = raw.replace(/^(?:Trx\.?\s*ID|Transaction\s*ID|Tx\.?\s*ID|Ref(?:erence)?\.?\s*(?:No|ID|#)?|ABA\s*Ref)\s*[:.\-#\s]*/i, '').trim();
  if (!stripped || /^ABA-(?:KHQR|STORE|SHOP|SLOT|VIP|PAY|TXN)[-\w]*/i.test(stripped) || /^ABA-\d{4,8}$/i.test(stripped) || /^ADMIN-VIP-/i.test(stripped) || /^TXN-(?:STORE|SHOP|VIP|REST|ADM)[-\w]*/i.test(stripped) || /^AUTO/i.test(stripped) || /^SUP-/i.test(stripped)) return '';
  return raw.replace(/[^0-9A-Za-z-]/g, '').toUpperCase();
}

export function isValidTrxKey(trxKey: string): boolean {
  return /^[0-9A-Z-]{8,28}$/.test(trxKey) && /\d{2,}/.test(trxKey);
}

/** Ignore auto-generated placeholders the app may put in the "reference" box. */
export function cleanSubmittedTrx(v: unknown): string {
  return normalizeTrxKey(v);
}

export function evaluateReceipt(input: {
  extracted: ExtractedReceipt;
  expectedAmountUsd: number;
  expectedDays: number;
  submittedTrxId?: string;
  nowMs: number;
  lastVerifiedPaymentAtMs?: number | null;
}): Evaluation {
  const { extracted, expectedAmountUsd, expectedDays, nowMs } = input;
  const userTrx = cleanSubmittedTrx(input.submittedTrxId);

  // recipient
  const shownRecipient = [extracted.recipientName, extracted.recipientAccount ? `(${extracted.recipientAccount})` : ''].filter(Boolean).join(' ').trim();
  const recipientOk = extracted.isAbaReceipt && isOfficialRecipient(extracted.recipientName, extracted.recipientAccount);
  const recipient: CheckItem = {
    passed: recipientOk,
    expected: 'CHEA SAVUTH / SAVUTH CHEA (000 056 833)',
    detected: shownRecipient || '-',
    reasonKh: recipientOk ? `✅ ឈ្មោះគណនីអ្នកទទួលត្រូវគ្នា៖ ${shownRecipient}` : `❌ អ្នកទទួលលើវិក្កយបត្រ (${shownRecipient || 'មិនឃើញ'}) មិនមែនគណនីផ្លូវការ`,
    reasonEn: recipientOk ? `✅ Recipient matches: ${shownRecipient}` : `❌ Receipt recipient (${shownRecipient || 'not found'}) is not the official account`,
  };

  // amount
  const amt = extracted.amountUsd;
  const amountOk = typeof amt === 'number' && Number.isFinite(amt) && Math.abs(amt - expectedAmountUsd) < 0.05 && (extracted.currency || 'USD').toUpperCase() === 'USD';
  const amount: CheckItem = {
    passed: amountOk,
    expected: `$${expectedAmountUsd.toFixed(2)} USD (${expectedDays} days)`,
    detected: typeof amt === 'number' ? `$${amt.toFixed(2)} ${extracted.currency || 'USD'}` : '-',
    reasonKh: amountOk ? `✅ ចំនួនទឹកប្រាក់ត្រូវគ្នា៖ $${(amt as number).toFixed(2)} USD` : `❌ ចំនួនទឹកប្រាក់លើវិក្កយបត្រមិនត្រូវនឹងកញ្ចប់ VIP ($${expectedAmountUsd.toFixed(2)} USD)`,
    reasonEn: amountOk ? `✅ Amount matches: $${(amt as number).toFixed(2)} USD` : `❌ Receipt amount does not match the VIP plan ($${expectedAmountUsd.toFixed(2)} USD)`,
  };

  // date
  let dateOk = false;
  let dateNote = 'no date found';
  if (extracted.transactionDate) {
    const ms = Date.parse(extracted.transactionDate);
    if (Number.isFinite(ms)) {
      const ageDays = (nowMs - ms) / 86_400_000;
      const priorMs = input.lastVerifiedPaymentAtMs;
      if (ageDays > RECEIPT_MAX_AGE_DAYS) dateNote = `too old (${Math.round(ageDays)} days)`;
      else if (ageDays < -1.5) dateNote = 'date is in the future';
      else if (typeof priorMs === 'number' && Number.isFinite(priorMs) && priorMs > 0 && ms <= priorMs) {
        dateNote = 'receipt date is on or before previous VIP activation (cannot reuse old receipt for renewal)';
      } else {
        dateOk = true;
        dateNote = 'recent';
      }
    } else dateNote = 'unreadable date';
  }
  const date: CheckItem = {
    passed: dateOk,
    expected: `within ${RECEIPT_MAX_AGE_DAYS} days`,
    detected: extracted.transactionDate || '-',
    reasonKh: dateOk ? `✅ កាលបរិច្ឆេទត្រឹមត្រូវ៖ ${extracted.transactionDate}` : `❌ កាលបរិច្ឆេទលើវិក្កយបត្រមិនអាចទទួលយក (${dateNote})`,
    reasonEn: dateOk ? `✅ Valid date: ${extracted.transactionDate}` : `❌ Receipt date not accepted (${dateNote})`,
  };

  // trx id (must come from the receipt itself)
  const trxKey = normalizeTrxKey(extracted.trxId);
  const formatOk = /^[0-9A-Z-]{8,28}$/.test(trxKey) && /\d{2,}/.test(trxKey);
  const matchesUser = !userTrx || !trxKey || normalizeTrxKey(userTrx) === trxKey;
  const trxOk = Boolean(trxKey) && formatOk && matchesUser;
  const trx: CheckItem = {
    passed: trxOk,
    expected: userTrx ? `Trx. ID: ${userTrx}` : 'Valid Trx. ID on the receipt',
    detected: trxKey ? `Trx. ID: ${trxKey}` : '-',
    reasonKh: trxOk ? `✅ លេខប្រតិបត្តិការត្រឹមត្រូវ៖ ${trxKey}` : !matchesUser ? '❌ លេខប្រតិបត្តិការដែលបានបញ្ចូលមិនត្រូវនឹងវិក្កយបត្រ' : '❌ មិនអាចអានលេខប្រតិបត្តិការលើវិក្កយបត្រ',
    reasonEn: trxOk ? `✅ Valid Trx. ID: ${trxKey}` : !matchesUser ? '❌ Submitted Trx. ID does not match the receipt' : '❌ Could not read a Trx. ID from the receipt',
  };

  const rawStatus = String(extracted.paymentStatus || 'completed').trim().toLowerCase();
  const paymentStatusOk = rawStatus !== 'pending' && rawStatus !== 'failed';
  const notModifiedOrFake = extracted.isModifiedOrFake !== true;
  let statusAndTamperReasonKh: string | undefined;
  let statusAndTamperReasonEn: string | undefined;
  if (!notModifiedOrFake) {
    statusAndTamperReasonKh = `❌ រុកឃើញវិក្កយបត្រកែប្រែ ឬក្លែងបន្លំ (${extracted.tamperReason || "Modified/Fake receipt"})`;
    statusAndTamperReasonEn = `? Modified, edited, or fake receipt detected (${extracted.tamperReason || 'visual tampering detected'})`;
  } else if (!paymentStatusOk) {
    statusAndTamperReasonKh = `❌ ស្ថានភាពការទូទាត់គឺ "${extracted.paymentStatus}" — អនុញ្ញាតតែប្រតិបត្តិការជោគជ័យ (Completed) ប៉ុណ្ណោះ`;
    statusAndTamperReasonEn = `? Payment status is "${extracted.paymentStatus}" ? only Completed/Successful ABA transfers are accepted`;
  }

  return {
    checks: { recipient, amount, trxId: trx, date },
    allPassed: recipientOk && amountOk && dateOk && trxOk && paymentStatusOk && notModifiedOrFake,
    trxKey,
    paymentStatusOk,
    notModifiedOrFake,
    statusAndTamperReasonKh,
    statusAndTamperReasonEn,
  };
}

// ------------------------------------------------------------------ plans and VIP window
export interface PricingDoc {
  vipShortDurationDays?: number;
  vipShortPriceUsd?: number;
  vipLongDurationDays?: number;
  vipLongPriceUsd?: number;
  // Consumer VIP & AI Quotas
  consumerVipEnabled?: boolean;
  consumerTrialDays?: number;
  consumerTrialAiDailyLimit?: number;
  consumerPaidAiDailyLimit?: number;
  consumerPromo30dPriceUsd?: number;
  consumerPromo30dDays?: number;
  consumer30dPriceUsd?: number;
  consumer30dDays?: number;
  consumer90dPriceUsd?: number;
  consumer90dDays?: number;
  consumer365dPriceUsd?: number;
  consumer365dDays?: number;
  // Independent All-Inclusive Shop Plans (No Lifetime)
  shopMonthlyPriceUsd?: number;
  shopMonthlyDays?: number;
  shopYearlyPriceUsd?: number;
  shopYearlyDays?: number;
  shopEarlyBirdEnabled?: boolean;
  shopEarlyBirdYearlyPriceUsd?: number;
  shopEarlyBirdMaxShops?: number;
  shopEarlyBirdClaimedCount?: number;
  shopPayAfterApproval?: boolean;
}
export interface ResolvedPlan {
  planType: 'quarterly' | 'annual';
  days: number;
  priceUsd: number;
}

export type OfficialPaidPlanId =
  | 'consumer_promo_30d'
  | 'consumer_30d'
  | 'consumer_90d'
  | 'consumer_365d'
  | 'shop_30d'
  | 'shop_365d'
  | 'shop_earlybird_365d';

export interface OfficialResolvedPlan {
  planId: OfficialPaidPlanId;
  category: 'consumer' | 'shop';
  planType: 'quarterly' | 'annual';
  days: number;
  priceUsd: number;
}

function resolvePositivePrice(val: unknown, fallback: number): number | null {
  if (val === undefined || val === null) return fallback;
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function resolvePositiveDays(val: unknown, fallback: number): number | null {
  if (val === undefined || val === null) return fallback;
  const n = Number(val);
  if (!Number.isFinite(n) || n < 1 || n > 3650) return null;
  return Math.round(n);
}

/**
 * Resolves an explicit paid planId (Consumer VIP or Independent Shop Plan) from SERVER pricing.
 * Returns null for unknown planIds, 'trial_7d' ($0 uses action: 'claim_trial'), or disabled <= 0 prices.
 * Automatically falls back from shop_earlybird_365d ($49.99) to shop_365d ($59.99) once the 50-shop cap is reached.
 */
export function resolveOfficialServerPlan(
  p: PricingDoc | null | undefined,
  rawPlanId: unknown
): OfficialResolvedPlan | null {
  if (typeof rawPlanId !== 'string' || !rawPlanId.trim()) return null;
  const doc: PricingDoc = p && typeof p === 'object' ? p : {};
  const id = rawPlanId.trim();

  switch (id) {
    case 'consumer_promo_30d': {
      if (doc.consumerVipEnabled === false) return null;
      const priceUsd = resolvePositivePrice(doc.consumerPromo30dPriceUsd, 0.99);
      const days = resolvePositiveDays(doc.consumerPromo30dDays, 30);
      return priceUsd && days ? { planId: 'consumer_promo_30d', category: 'consumer', planType: 'quarterly', days, priceUsd } : null;
    }
    case 'consumer_30d': {
      if (doc.consumerVipEnabled === false) return null;
      const priceUsd = resolvePositivePrice(doc.consumer30dPriceUsd, 2.99);
      const days = resolvePositiveDays(doc.consumer30dDays, 30);
      return priceUsd && days ? { planId: 'consumer_30d', category: 'consumer', planType: 'quarterly', days, priceUsd } : null;
    }
    case 'consumer_90d': {
      if (doc.consumerVipEnabled === false) return null;
      const priceUsd = resolvePositivePrice(doc.consumer90dPriceUsd, 6.99);
      const days = resolvePositiveDays(doc.consumer90dDays, 90);
      return priceUsd && days ? { planId: 'consumer_90d', category: 'consumer', planType: 'annual', days, priceUsd } : null;
    }
    case 'consumer_365d': {
      if (doc.consumerVipEnabled === false) return null;
      const priceUsd = resolvePositivePrice(doc.consumer365dPriceUsd, 19.99);
      const days = resolvePositiveDays(doc.consumer365dDays, 365);
      return priceUsd && days ? { planId: 'consumer_365d', category: 'consumer', planType: 'annual', days, priceUsd } : null;
    }
    case 'shop_30d': {
      const priceUsd = resolvePositivePrice(doc.shopMonthlyPriceUsd, 6.99);
      const days = resolvePositiveDays(doc.shopMonthlyDays, 30);
      return priceUsd && days ? { planId: 'shop_30d', category: 'shop', planType: 'quarterly', days, priceUsd } : null;
    }
    case 'shop_365d': {
      const priceUsd = resolvePositivePrice(doc.shopYearlyPriceUsd, 59.99);
      const days = resolvePositiveDays(doc.shopYearlyDays, 365);
      return priceUsd && days ? { planId: 'shop_365d', category: 'shop', planType: 'annual', days, priceUsd } : null;
    }
    case 'shop_earlybird_365d': {
      const ebEnabled = doc.shopEarlyBirdEnabled !== false;
      const maxShops = resolvePositiveDays(doc.shopEarlyBirdMaxShops, 50) ?? 50;
      const claimed = Math.max(0, Math.floor(Number(doc.shopEarlyBirdClaimedCount) || 0));
      const days = resolvePositiveDays(doc.shopYearlyDays, 365);
      if (!days) return null;
      if (ebEnabled && claimed < maxShops) {
        const ebPrice = resolvePositivePrice(doc.shopEarlyBirdYearlyPriceUsd, 49.99);
        return ebPrice ? { planId: 'shop_earlybird_365d', category: 'shop', planType: 'annual', days, priceUsd: ebPrice } : null;
      }
      // Cap reached or Early-Bird toggled off -> fall back to standard $59.99 annual shop plan
      const stdPrice = resolvePositivePrice(doc.shopYearlyPriceUsd, 59.99);
      return stdPrice ? { planId: 'shop_365d', category: 'shop', planType: 'annual', days, priceUsd: stdPrice } : null;
    }
    default:
      return null;
  }
}

/** short plan = "quarterly" in the app's vocabulary, long plan = "annual". Matched by duration; null when unknown. */
export function resolvePlan(p: PricingDoc | null | undefined, durationDays: unknown): ResolvedPlan | null {
  if (!p || typeof durationDays !== 'number' || !Number.isFinite(durationDays)) return null;
  const shortDays = Number(p.vipShortDurationDays);
  const shortPrice = Number(p.vipShortPriceUsd);
  const longDays = Number(p.vipLongDurationDays);
  const longPrice = Number(p.vipLongPriceUsd);
  const yearlyDays = Number(p.consumer365dDays);
  const yearlyPrice = Number(p.consumer365dPriceUsd);
  const d = Math.round(durationDays);
  if (shortDays >= 1 && shortPrice > 0 && d === Math.round(shortDays)) return { planType: 'quarterly', days: Math.round(shortDays), priceUsd: shortPrice };
  if (longDays >= 1 && longPrice > 0 && d === Math.round(longDays)) return { planType: 'annual', days: Math.round(longDays), priceUsd: longPrice };
  if (yearlyDays >= 1 && yearlyPrice > 0 && d === Math.round(yearlyDays)) return { planType: 'annual', days: Math.round(yearlyDays), priceUsd: yearlyPrice };
  return null;
}

/** New VIP window: starts now, ends `days` after the later of (now, current expiry) - renewals stack. */
export function computeVipWindow(existingExpiryIso: unknown, days: number, nowMs: number): { startIso: string; expiryIso: string } {
  const existing = typeof existingExpiryIso === 'string' ? Date.parse(existingExpiryIso) : NaN;
  const base = Number.isFinite(existing) && existing > nowMs ? existing : nowMs;
  return { startIso: new Date(nowMs).toISOString(), expiryIso: new Date(base + days * 86_400_000).toISOString() };
}

/** Writes ONLY the entitlement fields onto the stored user document. */
export function applyVipGrant(
  doc: Record<string, unknown>,
  g: { startIso: string; expiryIso: string; days: number; planType: string; trxId: string; planId?: OfficialPaidPlanId }
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ...doc,
    membershipTier: 'premium_vip',
    subscriptionStatus: 'active',
    vipStatus: 'active',
    paymentStatus: 'verified',
    paymentMethod: 'KHQR',
    subscriptionStartDate: g.startIso,
    subscriptionExpiryDate: g.expiryIso,
    vipExpiresAt: g.expiryIso,
    vipPlanDays: g.days,
    vipPlanType: g.planType,
    transactionRef: g.trxId,
    freeTrialActivated: false,
  };
  if (g.planId) {
    out.activeConsumerPlanId = g.planId;
    if (g.planId === 'consumer_promo_30d') {
      out.promo099Used = true;
      out.promo099ClaimedAt = g.startIso;
    }
  }
  delete out.vipCancelledAt;
  delete out.freeTrialExpiresAt;
  delete out.freeTrialDurationDays;
  return out;
}

/** Writes the 1-time 7-Day Free Trial onto the stored user document (server-authoritative). */
export function applyTrial7dGrant(
  doc: Record<string, unknown>,
  g: { startIso: string; expiryIso: string; days: number; trxId: string }
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ...doc,
    membershipTier: 'premium_vip',
    subscriptionStatus: 'active',
    vipStatus: 'active',
    paymentStatus: 'verified',
    paymentMethod: 'FREE_TRIAL_7D',
    subscriptionStartDate: g.startIso,
    subscriptionExpiryDate: g.expiryIso,
    vipExpiresAt: g.expiryIso,
    vipPlanDays: g.days,
    vipPlanType: 'trial_7d',
    activeConsumerPlanId: 'trial_7d',
    freeTrialActivated: true,
    freeTrialActivatedAt: g.startIso,
    freeTrialExpiresAt: g.expiryIso,
    freeTrialDurationDays: g.days,
    transactionRef: g.trxId,
  };
  delete out.vipCancelledAt;
  return out;
}

/**
 * Applies an Independent All-Inclusive Shop Subscription (30d / 365d / Early-Bird 365d) onto a shop record,
 * stacking onto any remaining active shop subscription time without modifying the owner's Consumer VIP status.
 */
export function applyShopSubscriptionGrant(
  shopDoc: Record<string, unknown>,
  g: { startIso: string; days: number; planId: OfficialPaidPlanId; trxId: string; nowMs: number }
): { updatedShop: Record<string, unknown>; expiryIso: string } {
  const existingExp =
    shopDoc.shopSubscriptionExpiresAt ||
    shopDoc.subscriptionExpiresAt ||
    shopDoc.membershipExpiresAt;
  const win = computeVipWindow(existingExp, g.days, g.nowMs);
  const updatedShop: Record<string, unknown> = {
    ...shopDoc,
    membershipTier: 'premium',
    isFeatured: true,
    isPromotedBadge: true,
    shopPaymentStatus: 'active',
    activeShopPlanId: g.planId,
    shopSubscriptionStartedAt: g.startIso,
    shopSubscriptionExpiresAt: win.expiryIso,
    subscriptionExpiresAt: win.expiryIso,
    membershipExpiresAt: win.expiryIso,
    lastShopPaymentRef: g.trxId,
    lastShopPaidAt: g.startIso,
  };
  return { updatedShop, expiryIso: win.expiryIso };
}

export type ReceiptDecision = 'verified' | 'pending' | 'rejected';

/** Report in the exact shape of the app's AbaReceiptVerificationReport so the existing UI/admin screens keep working. */
export function buildReport(args: {
  decision: ReceiptDecision;
  evaluation: Evaluation | null;
  extracted: ExtractedReceipt | null;
  duplicate: boolean;
  noteKh: string;
  noteEn: string;
  nowIso: string;
}): Record<string, unknown> {
  const { decision, evaluation, extracted, duplicate, noteKh, noteEn, nowIso } = args;
  const blank: CheckItem = { passed: false, expected: '-', detected: '-', reasonKh: '⏳ រង់ចាំរដ្ឋបាលពិនិត្យ', reasonEn: '⏳ Awaiting administrator review' };
  const c = evaluation?.checks;
  const statusOrTamperFailed = Boolean(evaluation && (!evaluation.paymentStatusOk || !evaluation.notModifiedOrFake));
  const antiReplayPassed = !duplicate && !statusOrTamperFailed;
  const antiReplay: CheckItem = {
    passed: antiReplayPassed,
    expected: 'Unique unused ABA Transaction & Receipt',
    detected: !antiReplayPassed
      ? duplicate
        ? 'Duplicate receipt / Trx ID'
        : !evaluation?.notModifiedOrFake
          ? 'Modified / Fake Receipt'
          : `Status: ${extracted?.paymentStatus || 'incomplete'}`
      : 'មិនធ្លាប់ប្រើពីមុន',
    reasonKh: !antiReplayPassed
      ? duplicate
        ? '❌ វិក្កយបត្រ ឬលេខប្រតិបត្តិការនេះត្រូវបានប្រើរួចហើយ!'
        : evaluation?.statusAndTamperReasonKh || '❌ វិក្កយបត្រមិនត្រឹមត្រូវ ឬកែប្រែក្លែងបន្លំ!'
      : '✅ វិក្កយបត្រ និងលេខប្រតិបត្តិការមិនធ្លាប់ប្រើពីមុន',
    reasonEn: !antiReplayPassed
      ? duplicate
        ? '? This transaction ID or receipt image has already been used!'
        : evaluation?.statusAndTamperReasonEn || '? Receipt failed authenticity or payment status check!'
      : '? Receipt and Trx. ID have not been used before',
  };
  const passedCount = [c?.recipient.passed, c?.amount.passed, c?.trxId.passed, c?.date.passed, antiReplay.passed].filter(Boolean).length;
  return {
    status: decision === 'verified' ? 'verified' : decision === 'rejected' ? 'rejected_mismatch' : 'flagged_manual_review',
    canAutoApprove: decision === 'verified',
    verifiedAt: nowIso.replace('T', ' ').slice(0, 16),
    verificationMethod: extracted ? 'hybrid_ai_and_transaction' : 'manual_fallback',
    confidenceScore: Math.round((passedCount / 5) * 100),
    summaryKh: noteKh,
    summaryEn: noteEn,
    extractedReceipt: extracted
      ? {
          isAbaReceipt: extracted.isAbaReceipt,
          trxId: extracted.trxId,
          amountUsd: extracted.amountUsd,
          currency: extracted.currency,
          recipientName: extracted.recipientName,
          recipientAccount: extracted.recipientAccount,
          transactionDate: extracted.transactionDate,
          senderName: extracted.senderName,
          paymentStatus: extracted.paymentStatus,
          isModifiedOrFake: extracted.isModifiedOrFake,
          tamperReason: extracted.tamperReason,
        }
      : undefined,
    checks: { recipient: c?.recipient || blank, amount: c?.amount || blank, trxId: c?.trxId || blank, date: c?.date || blank, antiReplay },
  };
}

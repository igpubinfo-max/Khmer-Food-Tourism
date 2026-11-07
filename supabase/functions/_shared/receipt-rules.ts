/**
 * Pure server-side rules for checking an ABA / KHQR payment receipt (shared with unit tests, no Deno globals).
 * Port of the on-device checks in src/services/aiPaymentVerificationService.ts, hardened:
 *   - a Trx ID MUST be read from the receipt (the old "invent a reference from the image fingerprint" fallback is gone)
 *   - the receipt date must be inside a short window (not older than 14 days, not in the future)
 *   - price / duration come from the SERVER copy of the VIP pricing, never from the client
 */

export const OFFICIAL_RECIPIENT_ACCOUNTS = ['095245959', '012719946'];
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
}

export function isOfficialRecipient(recipientName?: string, recipientAccount?: string): boolean {
  const cleanName = (recipientName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanAcc = (recipientAccount || '').replace(/\D+/g, '');
  const nameMatched = cleanName.includes('KIM SENG') || cleanName.includes('KIMSENG') || (cleanName.includes('CHEA') && cleanName.includes('SENG'));
  const accMatched = OFFICIAL_RECIPIENT_ACCOUNTS.some((acc) => cleanAcc.length >= 8 && cleanAcc.includes(acc));
  if (cleanName && !nameMatched) return false; // another person's name is shown
  if (cleanAcc && cleanAcc.length >= 8 && !accMatched) return false; // another person's account is shown
  return nameMatched || accMatched;
}

export function normalizeTrxKey(v: unknown): string {
  return typeof v === 'string' ? v.replace(/\s+/g, '').toUpperCase() : '';
}

/** Ignore auto-generated placeholders the app may put in the "reference" box. */
export function cleanSubmittedTrx(v: unknown): string {
  const raw = typeof v === 'string' ? v.trim() : '';
  if (!raw || /^ABA-KHQR-/i.test(raw) || /^ABA-\d{6}$/i.test(raw) || /^AUTO/i.test(raw)) return '';
  return raw;
}

export function evaluateReceipt(input: {
  extracted: ExtractedReceipt;
  expectedAmountUsd: number;
  expectedDays: number;
  submittedTrxId?: string;
  nowMs: number;
}): Evaluation {
  const { extracted, expectedAmountUsd, expectedDays, nowMs } = input;
  const userTrx = cleanSubmittedTrx(input.submittedTrxId);

  // recipient
  const shownRecipient = [extracted.recipientName, extracted.recipientAccount ? `(${extracted.recipientAccount})` : ''].filter(Boolean).join(' ').trim();
  const recipientOk = extracted.isAbaReceipt && isOfficialRecipient(extracted.recipientName, extracted.recipientAccount);
  const recipient: CheckItem = {
    passed: recipientOk,
    expected: 'Kim Seng / CHEA KIMSENG (095 245 959)',
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
      if (ageDays > RECEIPT_MAX_AGE_DAYS) dateNote = `too old (${Math.round(ageDays)} days)`;
      else if (ageDays < -1.5) dateNote = 'date is in the future';
      else {
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

  return { checks: { recipient, amount, trxId: trx, date }, allPassed: recipientOk && amountOk && dateOk && trxOk, trxKey };
}

// ------------------------------------------------------------------ plans and VIP window
export interface PricingDoc {
  vipShortDurationDays?: number;
  vipShortPriceUsd?: number;
  vipLongDurationDays?: number;
  vipLongPriceUsd?: number;
}
export interface ResolvedPlan {
  planType: 'quarterly' | 'annual';
  days: number;
  priceUsd: number;
}

/** short plan = "quarterly" in the app's vocabulary, long plan = "annual". Matched by duration; null when unknown. */
export function resolvePlan(p: PricingDoc | null | undefined, durationDays: unknown): ResolvedPlan | null {
  if (!p || typeof durationDays !== 'number' || !Number.isFinite(durationDays)) return null;
  const shortDays = Number(p.vipShortDurationDays);
  const shortPrice = Number(p.vipShortPriceUsd);
  const longDays = Number(p.vipLongDurationDays);
  const longPrice = Number(p.vipLongPriceUsd);
  const d = Math.round(durationDays);
  if (shortDays >= 1 && shortPrice > 0 && d === Math.round(shortDays)) return { planType: 'quarterly', days: Math.round(shortDays), priceUsd: shortPrice };
  if (longDays >= 1 && longPrice > 0 && d === Math.round(longDays)) return { planType: 'annual', days: Math.round(longDays), priceUsd: longPrice };
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
  g: { startIso: string; expiryIso: string; days: number; planType: string; trxId: string }
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
  };
  delete out.vipCancelledAt;
  return out;
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
  const antiReplay: CheckItem = {
    passed: !duplicate,
    expected: 'Unique unused ABA Transaction & Receipt',
    detected: duplicate ? 'Duplicate receipt / Trx ID' : 'មិនធ្លាប់ប្រើពីមុន',
    reasonKh: duplicate ? '❌ វិក្កយបត្រ ឬលេខប្រតិបត្តិការនេះត្រូវបានប្រើប្រាស់រួចហើយ!' : '✅ វិក្កយបត្រ និងលេខប្រតិបត្តិការមិនធ្លាប់ប្រើពីមុន',
    reasonEn: duplicate ? '❌ This transaction ID or receipt image has already been used!' : '✅ Receipt and Trx. ID have not been used before',
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
        }
      : undefined,
    checks: { recipient: c?.recipient || blank, amount: c?.amount || blank, trxId: c?.trxId || blank, date: c?.date || blank, antiReplay },
  };
}

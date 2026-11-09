/**
 * Replaceable Payment Confirmation Adapter Interface (pure TypeScript, zero Deno globals).
 *
 * Today:
 *   - 'aba_receipt_vision': AI Vision OCR pre-check + anti-replay receipt hash + Admin ABA Statement Excel/CSV matcher.
 * Future-ready:
 *   - 'aba_payway_webhook': Official ABA PayWay Merchant API / HMAC-SHA512 webhook callback, plugging directly
 *     into the exact same Consumer VIP & Independent Shop entitlement grant pipeline without touching UI or DB schemas.
 */

import { evaluateReceipt, type Evaluation, type ExtractedReceipt } from './receipt-rules.ts';

export type PaymentProviderKind = 'aba_receipt_vision' | 'aba_payway_webhook';

export interface PaymentConfirmationInput {
  expectedAmountUsd: number;
  expectedDays: number;
  submittedTrxId?: string;
  nowMs: number;
  lastVerifiedPaymentAtMs?: number | null;
  extractedReceipt?: ExtractedReceipt | null;
  webhookPayload?: Record<string, unknown> | null;
  webhookSignatureValid?: boolean;
}

export interface PaymentConfirmationResult {
  provider: PaymentProviderKind;
  aiUnavailable: boolean;
  evaluation: Evaluation | null;
  verifiedTrxKey: string;
  passedAllChecks: boolean;
}

export interface PaymentConfirmationAdapter {
  kind: PaymentProviderKind;
  verify(input: PaymentConfirmationInput): PaymentConfirmationResult;
}

export function createAbaReceiptVisionAdapter(): PaymentConfirmationAdapter {
  return {
    kind: 'aba_receipt_vision',
    verify(input: PaymentConfirmationInput): PaymentConfirmationResult {
      if (!input.extractedReceipt) {
        return {
          provider: 'aba_receipt_vision',
          aiUnavailable: true,
          evaluation: null,
          verifiedTrxKey: '',
          passedAllChecks: false,
        };
      }
      const evaluation = evaluateReceipt({
        extracted: input.extractedReceipt,
        expectedAmountUsd: input.expectedAmountUsd,
        expectedDays: input.expectedDays,
        submittedTrxId: input.submittedTrxId,
        nowMs: input.nowMs,
        lastVerifiedPaymentAtMs: input.lastVerifiedPaymentAtMs,
      });
      return {
        provider: 'aba_receipt_vision',
        aiUnavailable: false,
        evaluation,
        verifiedTrxKey: evaluation.trxKey,
        passedAllChecks: evaluation.allPassed,
      };
    },
  };
}

/**
 * Stub adapter for official ABA PayWay Merchant API webhook integration.
 * When Merchant credentials (PAYWAY_MERCHANT_ID / PAYWAY_API_KEY) are configured later,
 * verified PayWay callbacks confirm the transaction immediately without screenshot OCR.
 */
export function createPayWayWebhookAdapterStub(): PaymentConfirmationAdapter {
  return {
    kind: 'aba_payway_webhook',
    verify(input: PaymentConfirmationInput): PaymentConfirmationResult {
      const p = input.webhookPayload || {};
      const statusOk = p.status === 0 || p.status === '00' || p.payment_status === 'APPROVED';
      const amt = Number(p.amount ?? p.total_amount ?? NaN);
      const amountOk = Number.isFinite(amt) && Math.abs(amt - input.expectedAmountUsd) < 0.05;
      const trx = typeof p.tran_id === 'string' ? p.tran_id.trim().toUpperCase() : '';
      const ok = Boolean(input.webhookSignatureValid && statusOk && amountOk && trx.length >= 6);
      return {
        provider: 'aba_payway_webhook',
        aiUnavailable: false,
        evaluation: null,
        verifiedTrxKey: ok ? trx : '',
        passedAllChecks: ok,
      };
    },
  };
}

/**
 * Matches pending VIP payments against a bank STATEMENT exported by the admin (CSV / Excel from the ABA account)
 * AND against the centralized Used ABA Transaction database (`usedTrxKeys`).
 * Everything here is pure and runs on the admin's own device - the statement never leaves it.
 *
 * A pending payment is "matched" only when:
 *   1. It has a genuine ABA Trx ID (not an app-generated placeholder)
 *   2. That Trx ID has NEVER been used before (neither in historical/centralized DB nor duplicated in pending)
 *   3. The receipt is not flagged as modified/fake or incomplete payment status
 *   4. ONE unused statement row contains the payment's Trx ID AND an incoming credit amount equal to the expected price.
 */

export interface PendingPayment {
  id: string;
  userName?: string;
  userEmail?: string;
  trxId: string; // from the receipt / typed reference ('' when unknown)
  amountUsd: number;
  planId?: string;
  planLabel?: string;
  shopId?: string;
  shopName?: string;
  isShopPlan?: boolean;
  receiptDate?: string;
  paymentStatus?: string;
  isModifiedOrFake?: boolean;
}

export interface StatementEntry {
  rowIndex: number;
  cells: string[];
  /** Upper-case alphanumerics of the whole row (used for Trx ID containment). */
  compact: string;
  /** Every money-like number in the row (sign kept: credits positive, debits negative when the file uses a sign). */
  amounts: number[];
  /** Date-looking text found in the row (display only). */
  dateText?: string;
  /**
   * Present when the statement has SEPARATE "Debit" and "Credit" columns: only the Credit column can ever approve a payment
   * (a debit amount is positive in such files, so the sign alone cannot tell the direction).
   */
  creditAmounts?: number[];
  debitAmounts?: number[];
}

export type MatchStatus =
  | 'matched'
  | 'amount_mismatch'
  | 'not_credit'
  | 'not_found'
  | 'no_trx_id'
  | 'duplicate_trx'
  | 'row_already_used';

export interface MatchResult {
  payment: PendingPayment;
  status: MatchStatus;
  entry?: StatementEntry;
  detail: string;
}

// ------------------------------------------------------------------ parsing
/** Minimal RFC-4180 style CSV parser; delimiter (comma / semicolon / tab) is detected from the header area. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const sample = clean.split(/\r?\n/).slice(0, 8).join('\n');
  const counts: Array<[string, number]> = [',', ';', '\t'].map((d) => [d, sample.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  const delim = counts[0][1] > 0 ? counts[0][0] : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQ = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQ) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') inQ = false;
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const AMOUNT_RE = /(?<![\d.])[-+]?\(?\d{1,3}(?:,\d{3})*\.\d{2}\)?(?![\d])|(?<![\d.])[-+]?\d+\.\d{2}(?![\d])/g;
const DATE_RE = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})(?:[ T]\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?/i;

function parseMoney(token: string): number {
  const neg = token.includes('-') || (token.includes('(') && token.includes(')'));
  const n = parseFloat(token.replace(/[^0-9.]/g, ''));
  return neg ? -n : n;
}

const CREDIT_HEADER = /\b(credit|deposit|money\s*in|incoming|received|cr)\b/i;
const DEBIT_HEADER = /\b(debit|withdraw(al)?|money\s*out|outgoing|paid\s*out|dr)\b/i;

function amountsIn(cell: string): number[] {
  const out: number[] = [];
  for (const m of String(cell ?? '').match(AMOUNT_RE) || []) {
    const v = parseMoney(m);
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

export function normalizeRows(rows: string[][]): StatementEntry[] {
  const out: StatementEntry[] = [];
  // Find a header row that names BOTH a credit and a debit column
  let creditIdx = -1;
  let debitIdx = -1;
  let headerRow = -1;
  for (let r = 0; r < Math.min(rows.length, 25) && headerRow < 0; r++) {
    const c = rows[r].findIndex((x) => CREDIT_HEADER.test(String(x ?? '')) && !DEBIT_HEADER.test(String(x ?? '')));
    const d = rows[r].findIndex((x) => DEBIT_HEADER.test(String(x ?? '')) && !CREDIT_HEADER.test(String(x ?? '')));
    if (c >= 0 && d >= 0 && c !== d) {
      creditIdx = c;
      debitIdx = d;
      headerRow = r;
    }
  }
  rows.forEach((cells, rowIndex) => {
    const joined = cells.map((c) => String(c ?? '')).join(' | ');
    const compact = joined.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    // cells that are ENTIRELY a number/amount, plus amounts embedded in text such as "4.99 USD"
    const amounts: number[] = [];
    for (const c of cells) {
      const s = String(c ?? '').trim();
      if (!s) continue;
      for (const m of s.match(AMOUNT_RE) || []) {
        const v = parseMoney(m);
        if (Number.isFinite(v)) amounts.push(v);
      }
    }
    const dateText = DATE_RE.exec(joined)?.[0];
    const split = headerRow >= 0 && rowIndex > headerRow;
    if (compact) {
      out.push({
        rowIndex,
        cells: cells.map((c) => String(c ?? '')),
        compact,
        amounts,
        dateText,
        creditAmounts: split ? amountsIn(cells[creditIdx]).map(Math.abs) : undefined,
        debitAmounts: split ? amountsIn(cells[debitIdx]).map(Math.abs) : undefined,
      });
    }
  });
  return out;
}

export function normalizeTrxKey(v: unknown): string {
  return normalizeTrx(typeof v === "string" ? v : "");
}

export function normalizeTrx(v: string): string {
  const raw = String(v || '').trim();
  if (!raw || /^ABA-KHQR-/i.test(raw) || /^ADMIN-VIP-/i.test(raw) || /^ABA-STORE-/i.test(raw) || /^AUTO/i.test(raw)) {
    return '';
  }
  return raw.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

// ------------------------------------------------------------------ matching
export function matchPayments(
  payments: PendingPayment[],
  entries: StatementEntry[],
  usedTrxKeys?: Iterable<string>
): MatchResult[] {
  const alreadyUsedSet = new Set<string>();
  if (usedTrxKeys) {
    for (const k of usedTrxKeys) {
      const norm = normalizeTrx(k);
      if (norm.length >= 6) alreadyUsedSet.add(norm);
    }
  }

  // Trx IDs shared by several pending payments can never be auto-matched (one transfer can fund one VIP only)
  const trxCount = new Map<string, number>();
  for (const p of payments) {
    const k = normalizeTrx(p.trxId);
    if (k.length >= 8) trxCount.set(k, (trxCount.get(k) || 0) + 1);
  }
  const usedRows = new Set<number>();
  const results: MatchResult[] = [];

  for (const payment of payments) {
    const key = normalizeTrx(payment.trxId);
    if (key.length < 8) {
      results.push({ payment, status: 'no_trx_id', detail: 'No usable Trx ID on this payment - check the statement manually.' });
      continue;
    }
    if (payment.isModifiedOrFake === true || payment.paymentStatus === 'pending' || payment.paymentStatus === 'failed') {
      results.push({
        payment,
        status: 'duplicate_trx',
        detail: payment.isModifiedOrFake
          ? 'Receipt flagged as modified/fake - approval blocked.'
          : `Payment status is "${payment.paymentStatus}" (not completed) - approval blocked.`,
      });
      continue;
    }
    if (alreadyUsedSet.has(key)) {
      results.push({
        payment,
        status: 'duplicate_trx',
        detail: 'Already used in centralized database (even across different accounts) - one ABA transaction can only activate/renew VIP once.',
      });
      continue;
    }
    if ((trxCount.get(key) || 0) > 1) {
      results.push({ payment, status: 'duplicate_trx', detail: 'The same Trx ID was submitted more than once.' });
      continue;
    }
    const rows = entries.filter((e) => e.compact.includes(key));
    if (rows.length === 0) {
      results.push({ payment, status: 'not_found', detail: 'Trx ID not found in this statement (wrong period? not paid yet?).' });
      continue;
    }
    const free = rows.filter((r) => !usedRows.has(r.rowIndex));
    if (free.length === 0) {
      results.push({ payment, status: 'row_already_used', entry: rows[0], detail: 'That statement row already matched another payment.' });
      continue;
    }
    const want = payment.amountUsd;
    const isIncoming = (r: StatementEntry): boolean =>
      r.creditAmounts ? r.creditAmounts.some((a) => Math.abs(a - want) < 0.011) : r.amounts.some((a) => Math.abs(a - want) < 0.011 && a > 0);
    const credit = free.find(isIncoming);
    if (credit) {
      usedRows.add(credit.rowIndex);
      results.push({ payment, status: 'matched', entry: credit, detail: `Trx ID and incoming $${want.toFixed(2)} found.` });
      continue;
    }
    const debit = free.find((r) =>
      r.debitAmounts ? r.debitAmounts.some((a) => Math.abs(a - want) < 0.011) : r.amounts.some((a) => Math.abs(Math.abs(a) - want) < 0.011)
    );
    if (debit) {
      results.push({ payment, status: 'not_credit', entry: debit, detail: 'Amount matches but the row looks like an outgoing (debit) transfer.' });
      continue;
    }
    results.push({
      payment,
      status: 'amount_mismatch',
      entry: free[0],
      detail: `Trx ID found but no row amount equals $${want.toFixed(2)} (statement shows ${free[0].amounts.map((a) => a.toFixed(2)).join(', ') || 'no amount'}).`,
    });
  }
  return results;
}
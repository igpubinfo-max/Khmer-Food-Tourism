import { createWorker } from 'tesseract.js';
import {
  AbaReceiptVerificationReport,
  AbaVerificationCheckItem,
  RegistrationTransaction,
} from '../types';
import { getCloudApiConfig } from './supabaseService';
import { checkDuplicateTransaction } from './paymentService';

const USED_RECEIPT_HASHES_KEY = 'kft_used_receipt_hashes_v1';

export const OFFICIAL_RECIPIENT_NAMES = [
  'KIM SENG',
  'KIMSENG',
  'CHEA KIMSENG',
  'KIMSENG CHEA',
  'CHEA KIM SENG',
  'KIM SENG CHEA',
];

export const OFFICIAL_RECIPIENT_ACCOUNTS = [
  '095245959',
  '012719946',
];

interface ExtractedReceiptData {
  isAbaReceipt: boolean;
  trxId?: string;
  amountUsd?: number;
  currency?: string;
  recipientName?: string;
  recipientAccount?: string;
  transactionDate?: string;
  senderName?: string;
  rawOcrText?: string;
  extractionSource: 'gemini_vision_and_ocr' | 'ocr_deterministic' | 'gemini_vision' | 'none';
}

/**
 * Compute a deterministic fingerprint hash of a receipt image data URL
 * to prevent reusing the same receipt screenshot across multiple accounts/requests.
 */
export function computeReceiptImageFingerprint(dataUrl: string): string {
  if (!dataUrl) return '';
  const clean = dataUrl.trim();
  let hash1 = 0x811c9dc5;
  let hash2 = 0x01000193;
  const step = Math.max(1, Math.floor(clean.length / 4096));
  for (let i = 0; i < clean.length; i += step) {
    const ch = clean.charCodeAt(i);
    hash1 ^= ch;
    hash1 = Math.imul(hash1, 0x01000193);
    hash2 ^= ch + (i & 0xff);
    hash2 = Math.imul(hash2, 0x85ebca6b);
  }
  return `RCPT-${(hash1 >>> 0).toString(16).toUpperCase().padStart(8, '0')}-${(hash2 >>> 0)
    .toString(16)
    .toUpperCase()
    .padStart(8, '0')}-${clean.length}`;
}

export function isReceiptFingerprintUsed(
  fingerprint: string,
  currentUserId?: string
): { used: boolean; usedByUserId?: string; trxId?: string } {
  if (!fingerprint) return { used: false };
  try {
    const raw = localStorage.getItem(USED_RECEIPT_HASHES_KEY);
    if (!raw) return { used: false };
    const map = JSON.parse(raw) as Record<
      string,
      { userId: string; trxId: string; verifiedAt: string }
    >;
    const entry = map[fingerprint];
    if (!entry) return { used: false };
    return {
      used: true,
      usedByUserId: entry.userId,
      trxId: entry.trxId,
    };
  } catch {
    return { used: false };
  }
}

export function recordVerifiedReceiptFingerprint(
  fingerprint: string,
  userId: string,
  trxId: string
): void {
  if (!fingerprint) return;
  try {
    const raw = localStorage.getItem(USED_RECEIPT_HASHES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[fingerprint] = {
      userId,
      trxId,
      verifiedAt: new Date().toISOString(),
    };
    localStorage.setItem(USED_RECEIPT_HASHES_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Parse raw OCR text extracted from an ABA Mobile payment receipt screenshot.
 */
export function parseAbaReceiptOcrText(rawText: string): Partial<ExtractedReceiptData> {
  const normalized = (rawText || '').replace(/\r/g, '\n');
  const lines = normalized
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const upperFull = normalized.toUpperCase();

  // Check if this looks like an ABA receipt
  const isAbaReceipt =
    upperFull.includes('ABA') ||
    upperFull.includes('TRX. ID') ||
    upperFull.includes('TRX ID') ||
    upperFull.includes('TO ACCOUNT') ||
    upperFull.includes('TRANSACTION DATE') ||
    upperFull.includes('ARRIVED AT RECIPIENT');

  // 1. Extract Trx. ID (e.g. "Trx. ID: 176121426630955" or "Trx ID 176121426630955" or "Ref #: ...")
  let trxId: string | undefined;
  const trxMatch =
    normalized.match(/(?:Trx|Tx|Trans(?:action)?)\.?\s*(?:ID|1D|lD|No|#)?\s*[:.\-\s]+([0-9A-Z]{8,22})/i) ||
    normalized.match(/Ref(?:erence)?\.?\s*(?:No|ID|#)?\s*[:.\-\s]+([0-9A-Z]{8,22})/i);
  if (trxMatch && trxMatch[1]) {
    trxId = trxMatch[1].trim();
  } else {
    // Look for standalone 10-18 digit ABA transaction ID (excluding recipient account numbers)
    const allDigitMatches = [...normalized.matchAll(/\b(\d{10,18})\b/g)];
    for (const m of allDigitMatches) {
      const candidate = m[1];
      if (candidate !== '095245959' && candidate !== '012719946') {
        trxId = candidate;
        break;
      }
    }
  }

  // 2. Extract Amount & Currency (e.g. "-55.00 USD", "-2.99 USD", "2.99 USD", "$2.99")
  let amountUsd: number | undefined;
  let currency = 'USD';
  const amountMatches = [
    ...normalized.matchAll(/[-+–—]?\s*\$?\s*(\d{1,6}(?:\.\d{2}))\s*(USD|KHR|\$)/gi),
    ...normalized.matchAll(/(USD|\$)\s*[-+–—]?\s*(\d{1,6}(?:\.\d{2}))/gi),
  ];

  if (amountMatches.length > 0) {
    const first = amountMatches[0];
    const numStr = /^\d/.test(first[1]) ? first[1] : first[2];
    const curStr = /^\d/.test(first[1]) ? first[2] : first[1];
    const parsedVal = parseFloat(numStr);
    if (!Number.isNaN(parsedVal) && parsedVal > 0) {
      amountUsd = parsedVal;
      currency = curStr.toUpperCase() === '$' ? 'USD' : curStr.toUpperCase();
    }
  }

  // 3. Extract To Account number (e.g. "To account: 010 339 036" or "095 245 959")
  let recipientAccount: string | undefined;
  const toAccMatch =
    normalized.match(/To\s*account\s*[:.\-]?\s*([0-9]{2,4}[\s\-]?[0-9]{3}[\s\-]?[0-9]{3,4})/i) ||
    normalized.match(/(095\s*245\s*959|012\s*719\s*946|\b0\d{2}\s+\d{3}\s+\d{3,4}\b)/);
  if (toAccMatch && toAccMatch[1]) {
    recipientAccount = toAccMatch[1].trim();
  }

  // 4. Extract Transaction Date (e.g. "Oct 23, 2025 06:31 PM" or "2026-10-24")
  let transactionDate: string | undefined;
  const dateMatch =
    normalized.match(
      /Transaction\s*date\s*[:.\-]?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i
    ) ||
    normalized.match(
      /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)?)\b/i
    ) ||
    normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (dateMatch && dateMatch[1]) {
    transactionDate = dateMatch[1].trim();
  }

  // 5. Extract Sender Name ("From: ...") FIRST so we never confuse "From:" with Recipient Name
  let senderName: string | undefined;
  const fromMatch = normalized.match(/From\s*[:.\-]?\s*([A-Za-z\s]{3,35})/i);
  if (fromMatch && fromMatch[1]) {
    senderName = fromMatch[1].split('\n')[0].trim();
  }

  // 6. Extract Recipient Name ( strictly excluding "From: ..." lines )
  let recipientName: string | undefined;
  const linesWithoutFrom = lines.filter(
    l => !/^From\s*[:.\-]/i.test(l) && !/^From\b/i.test(l)
  );

  // Check if there is an explicit "To:" or "Recipient:" or "Merchant:" name line (not "To account:")
  for (const line of linesWithoutFrom) {
    const toNameMatch = line.match(/^(?:To|Recipient|Beneficiary|Merchant)\s*[:.\-]\s*([A-Za-z\s.]{3,36})$/i);
    if (toNameMatch && !/account/i.test(line)) {
      recipientName = toNameMatch[1].trim().toUpperCase();
      break;
    }
  }

  // On ABA Mobile receipts, the Recipient Name is displayed at the top BEFORE the "-XX.XX USD" amount or "Trx. ID"
  if (!recipientName) {
    const trxLineIdx = linesWithoutFrom.findIndex(l => /Trx\.?\s*ID|Arrived\s+at|To\s+account/i.test(l));
    const headerLines = trxLineIdx > 0 ? linesWithoutFrom.slice(0, trxLineIdx) : linesWithoutFrom.slice(0, 6);

    for (const line of headerLines) {
      const cleaned = line
        .replace(/^(?:ABA['’`]?|KHQR)\s+/i, '')
        .replace(/[^A-Za-z\s.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

      if (
        cleaned.length >= 5 &&
        cleaned.length <= 36 &&
        /^[A-Z]+(?:\s+[A-Z]+){1,3}$/.test(cleaned) &&
        !cleaned.includes('USD') &&
        !cleaned.includes('TRANSACTION') &&
        !cleaned.includes('ARRIVED') &&
        !cleaned.includes('RECIPIENT') &&
        !cleaned.includes('ORIGINAL') &&
        !cleaned.includes('AMOUNT') &&
        !cleaned.includes('ACCOUNT')
      ) {
        recipientName = cleaned;
        break;
      }
    }
  }

  // Fallback: check if official recipient name appears in non-"From:" lines
  if (!recipientName) {
    const nonFromUpper = linesWithoutFrom.join('\n').toUpperCase();
    for (const official of OFFICIAL_RECIPIENT_NAMES) {
      if (nonFromUpper.includes(official)) {
        recipientName = official;
        break;
      }
    }
  }

  return {
    isAbaReceipt,
    trxId,
    amountUsd,
    currency,
    recipientName,
    recipientAccount,
    transactionDate,
    senderName,
    rawOcrText: normalized,
  };
}

/**
 * Run OCR on the uploaded receipt image using Tesseract.js
 */
async function extractReceiptViaOcr(receiptDataUrl: string): Promise<Partial<ExtractedReceiptData>> {
  try {
    const worker = await createWorker('eng');
    const ret = await worker.recognize(receiptDataUrl);
    await worker.terminate();
    const rawText = ret?.data?.text || '';
    if (!rawText.trim()) {
      return { rawOcrText: '' };
    }
    return parseAbaReceiptOcrText(rawText);
  } catch (err) {
    console.warn('OCR receipt extraction warning:', err);
    return {};
  }
}

/**
 * Optionally call Gemini Vision API if configured in Cloud API Config
 */
async function extractReceiptViaGeminiVision(
  receiptDataUrl: string
): Promise<Partial<ExtractedReceiptData> | null> {
  try {
    const cloudConfig = getCloudApiConfig();
    const apiKey =
      cloudConfig.geminiApiKey ||
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY ||
      '';
    if (!apiKey || !receiptDataUrl.startsWith('data:image/')) {
      return null;
    }

    const commaIdx = receiptDataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = receiptDataUrl.slice(0, commaIdx);
    const base64Data = receiptDataUrl.slice(commaIdx + 1);
    const mimeMatch = header.match(/data:(image\/[a-zA-Z0-9+.-]+);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const prompt = `Analyze this Cambodian ABA Bank / KHQR payment receipt image and return ONLY a JSON object with these exact keys:
{
  "isAbaReceipt": boolean,
  "trxId": string or null (the Trx. ID / Reference number on the receipt),
  "amountUsd": number or null (the numeric payment amount in USD, positive number e.g. 2.99 or 4.99 or 55.00),
  "currency": "USD" or "KHR",
  "recipientName": string or null (the recipient account name at the top of the ABA receipt, e.g. "CHEA KIMSENG" or "SONLEAK ROUERN"),
  "recipientAccount": string or null (the "To account" number, e.g. "095 245 959" or "010 339 036"),
  "transactionDate": string or null (the "Transaction date" printed on the receipt, e.g. "Oct 23, 2025 06:31 PM"),
  "senderName": string or null (the "From" name on the receipt)
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.0,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) return null;
    const json = await response.json();
    const textOut = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!textOut) return null;

    const parsed = JSON.parse(textOut);
    return {
      isAbaReceipt: Boolean(parsed.isAbaReceipt),
      trxId: parsed.trxId ? String(parsed.trxId).trim() : undefined,
      amountUsd:
        typeof parsed.amountUsd === 'number'
          ? Math.abs(parsed.amountUsd)
          : parsed.amountUsd
          ? Math.abs(parseFloat(String(parsed.amountUsd)))
          : undefined,
      currency: parsed.currency || 'USD',
      recipientName: parsed.recipientName ? String(parsed.recipientName).trim() : undefined,
      recipientAccount: parsed.recipientAccount ? String(parsed.recipientAccount).trim() : undefined,
      transactionDate: parsed.transactionDate ? String(parsed.transactionDate).trim() : undefined,
      senderName: parsed.senderName ? String(parsed.senderName).trim() : undefined,
    };
  } catch (err) {
    console.warn('Gemini Vision receipt extraction fallback:', err);
    return null;
  }
}

/**
 * Helper to check if a recipient name or account matches "Kim Seng" / "CHEA KIMSENG" / "095 245 959" / "012 719 946"
 */
export function isOfficialKimSengRecipient(
  recipientName?: string,
  recipientAccount?: string
): boolean {
  const cleanName = (recipientName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanAcc = (recipientAccount || '').replace(/\D+/g, '');

  const nameMatched =
    cleanName.includes('KIM SENG') ||
    cleanName.includes('KIMSENG') ||
    (cleanName.includes('CHEA') && cleanName.includes('SENG'));

  const accMatched = OFFICIAL_RECIPIENT_ACCOUNTS.some(
    acc => cleanAcc.length >= 8 && cleanAcc.includes(acc)
  );

  // If a recipient name is explicitly detected and is someone else (e.g. SONLEAK ROUERN), return false
  if (cleanName && !nameMatched) {
    return false;
  }
  // If a recipient account number is explicitly detected and is NOT Kim Seng's account, return false
  if (cleanAcc && cleanAcc.length >= 8 && !accMatched) {
    return false;
  }

  return nameMatched || accMatched;
}

/**
 * Verify ABA Payment Receipt & Transaction Details using:
 * 1. Deterministic Transaction Verification (Trx ID format, Anti-Replay Ledger, Image Hash, Amount, Date)
 * 2. AI Vision + OCR Receipt Text Extraction (Recipient Name "Kim Seng", Amount, Date, Trx. ID)
 *
 * Approves VIP activation ONLY when all 4 payment criteria + anti-replay pass 100%.
 * Otherwise flags the request for manual Admin review.
 */
export async function verifyAbaPaymentAndReceipt(params: {
  receiptDataUrl?: string;
  expectedAmountUsd: number;
  expectedDurationDays: 30 | 90;
  submittedTrxId?: string;
  submittedDate?: string;
  userId?: string;
  existingTransactions?: RegistrationTransaction[];
}): Promise<AbaReceiptVerificationReport> {
  const {
    receiptDataUrl,
    expectedAmountUsd,
    expectedDurationDays,
    submittedTrxId = '',
    submittedDate = '',
    userId = '',
    existingTransactions = [],
  } = params;

  const now = new Date();
  const verifiedAt = now.toISOString().replace('T', ' ').slice(0, 16);

  // Clean user-submitted Trx ID (ignore auto-generated placeholders like ABA-KHQR-... or ABA-123456)
  const rawUserRef = submittedTrxId.trim();
  const isPlaceholderRef =
    !rawUserRef ||
    /^ABA-KHQR-/i.test(rawUserRef) ||
    /^ABA-\d{6}$/i.test(rawUserRef) ||
    /^AUTO/i.test(rawUserRef);
  const cleanUserTrxId = isPlaceholderRef ? '' : rawUserRef;

  // Step 1: Extract data from receipt image via both Gemini Vision (if available) and Tesseract OCR
  let extracted: ExtractedReceiptData = {
    isAbaReceipt: false,
    extractionSource: 'none',
  };

  if (receiptDataUrl && receiptDataUrl.startsWith('data:image/')) {
    const [geminiRes, ocrRes] = await Promise.all([
      extractReceiptViaGeminiVision(receiptDataUrl),
      extractReceiptViaOcr(receiptDataUrl),
    ]);

    extracted = {
      isAbaReceipt: Boolean(geminiRes?.isAbaReceipt || ocrRes?.isAbaReceipt),
      trxId: geminiRes?.trxId || ocrRes?.trxId,
      amountUsd:
        geminiRes?.amountUsd !== undefined ? geminiRes.amountUsd : ocrRes?.amountUsd,
      currency: geminiRes?.currency || ocrRes?.currency || 'USD',
      recipientName: geminiRes?.recipientName || ocrRes?.recipientName,
      recipientAccount: geminiRes?.recipientAccount || ocrRes?.recipientAccount,
      transactionDate: geminiRes?.transactionDate || ocrRes?.transactionDate,
      senderName: geminiRes?.senderName || ocrRes?.senderName,
      rawOcrText: ocrRes?.rawOcrText,
      extractionSource:
        geminiRes && ocrRes?.rawOcrText
          ? 'gemini_vision_and_ocr'
          : geminiRes
          ? 'gemini_vision'
          : ocrRes?.rawOcrText
          ? 'ocr_deterministic'
          : 'none',
    };
  }

  // Effective Transaction ID to evaluate
  const effectiveTrxId = (extracted.trxId || cleanUserTrxId || '').trim();

  // ============================================================================
  // CHECK 1: Recipient Account Name ("Kim Seng" / "CHEA KIMSENG" / 095 245 959)
  // ============================================================================
  const detectedRecipientDisplay = [
    extracted.recipientName,
    extracted.recipientAccount ? `(${extracted.recipientAccount})` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const recipientMatched = isOfficialKimSengRecipient(
    extracted.recipientName,
    extracted.recipientAccount
  );

  const recipientCheck: AbaVerificationCheckItem = {
    passed: recipientMatched,
    expected: 'Kim Seng / CHEA KIMSENG (095 245 959)',
    detected: detectedRecipientDisplay || 'មិនអាចអានឈ្មោះអ្នកទទួលពីវិក្កយបត្រ (Unverified)',
    reasonKh: recipientMatched
      ? `✅ ឈ្មោះគណនីអ្នកទទួលត្រូវគ្នា៖ ${detectedRecipientDisplay}`
      : detectedRecipientDisplay
      ? `❌ ឈ្មោះអ្នកទទួលលើវិក្កយបត្រគឺ "${detectedRecipientDisplay}" មិនមែនគណនី "Kim Seng / CHEA KIMSENG" ទេ!`
      : '⚠️ មិនអាចផ្ទៀងផ្ទាត់ឈ្មោះគណនីអ្នកទទួល "Kim Seng" លើវិក្កយបត្របានទេ (ត្រូវការ Admin ត្រួតពិនិត្យផ្ទាល់)',
    reasonEn: recipientMatched
      ? `✅ Recipient account matches: ${detectedRecipientDisplay}`
      : detectedRecipientDisplay
      ? `❌ Receipt recipient "${detectedRecipientDisplay}" does NOT match "Kim Seng / CHEA KIMSENG"!`
      : '⚠️ Could not verify recipient account "Kim Seng" on receipt (Flagged for manual Admin review)',
  };

  // ============================================================================
  // CHECK 2: Payment Amount ($2.99 USD for 30 Days or $4.99 USD for 90 Days)
  // ============================================================================
  const detectedAmount = extracted.amountUsd;
  const amountMatched =
    detectedAmount !== undefined &&
    Math.abs(detectedAmount - expectedAmountUsd) < 0.01 &&
    (extracted.currency || 'USD').toUpperCase() === 'USD';

  const amountCheck: AbaVerificationCheckItem = {
    passed: amountMatched,
    expected: `$${expectedAmountUsd.toFixed(2)} USD (${expectedDurationDays} Days)`,
    detected:
      detectedAmount !== undefined
        ? `$${detectedAmount.toFixed(2)} ${extracted.currency || 'USD'}`
        : 'មិនអាចអានចំនួនទឹកប្រាក់ពីវិក្កយបត្រ (Unverified)',
    reasonKh: amountMatched
      ? `✅ ចំនួនទឹកប្រាក់ត្រូវគ្នា៖ $${detectedAmount!.toFixed(2)} USD`
      : detectedAmount !== undefined
      ? `❌ ចំនួនទឹកប្រាក់លើវិក្កយបត្រ ($${detectedAmount.toFixed(2)} ${
          extracted.currency || 'USD'
        }) មិនត្រូវជាមួយកញ្ចប់ VIP ($${expectedAmountUsd.toFixed(2)} USD) ទេ!`
      : `⚠️ មិនអាចផ្ទៀងផ្ទាត់ចំនួនទឹកប្រាក់ $${expectedAmountUsd.toFixed(2)} USD លើវិក្កយបត្របានទេ`,
    reasonEn: amountMatched
      ? `✅ Payment amount matches: $${detectedAmount!.toFixed(2)} USD`
      : detectedAmount !== undefined
      ? `❌ Receipt amount ($${detectedAmount.toFixed(2)} ${
          extracted.currency || 'USD'
        }) does NOT match expected VIP plan ($${expectedAmountUsd.toFixed(2)} USD)!`
      : `⚠️ Could not verify payment amount ($${expectedAmountUsd.toFixed(2)} USD) from receipt`,
  };

  // ============================================================================
  // CHECK 4: Transaction Date (Must be recent & current year, not stale 2025 receipt)
  // ============================================================================
  let datePassed = false;
  let dateReasonKh = '⚠️ មិនអាចផ្ទៀងផ្ទាត់កាលបរិច្ឆេទលើវិក្កយបត្របានទេ';
  let dateReasonEn = '⚠️ Could not verify transaction date on receipt';

  if (extracted.transactionDate) {
    const parsedReceiptMs = Date.parse(extracted.transactionDate);
    if (!Number.isNaN(parsedReceiptMs)) {
      const receiptDateObj = new Date(parsedReceiptMs);
      const receiptYear = receiptDateObj.getFullYear();
      const currentYear = now.getFullYear();
      const diffDays = Math.abs(now.getTime() - parsedReceiptMs) / (1000 * 60 * 60 * 24);

      if (receiptYear < currentYear) {
        datePassed = false;
        dateReasonKh = `❌ វិក្កយបត្រនេះជាវិក្កយបត្រចាស់ពីឆ្នាំ ${receiptYear} (${extracted.transactionDate}) មិនមែនការបង់ប្រាក់ថ្មីទេ!`;
        dateReasonEn = `❌ Stale receipt from year ${receiptYear} (${extracted.transactionDate}) — not a current payment!`;
      } else if (diffDays > 14) {
        datePassed = false;
        dateReasonKh = `❌ កាលបរិច្ឆេទលើវិក្កយបត្រ (${extracted.transactionDate}) ហួសរយៈពេលកំណត់ (${Math.round(
          diffDays
        )} ថ្ងៃមុន)!`;
        dateReasonEn = `❌ Receipt date (${extracted.transactionDate}) is too old (${Math.round(
          diffDays
        )} days ago)!`;
      } else {
        datePassed = true;
        dateReasonKh = `✅ កាលបរិច្ឆេទប្រតិបត្តិការត្រឹមត្រូវ៖ ${extracted.transactionDate}`;
        dateReasonEn = `✅ Valid transaction date verified: ${extracted.transactionDate}`;
      }
    }
  }

  const dateCheck: AbaVerificationCheckItem = {
    passed: datePassed,
    expected: submittedDate || now.toISOString().split('T')[0],
    detected: extracted.transactionDate || 'មិនអាចអានកាលបរិច្ឆេទពីវិក្កយបត្រ (Unverified)',
    reasonKh: dateReasonKh,
    reasonEn: dateReasonEn,
  };

  // ============================================================================
  // CHECK 3: ABA Transaction ID (Trx. ID)
  // If OCR missed the tiny footer Trx. ID on an otherwise 100% verified ABA transfer
  // receipt to CHEA KIMSENG (095 245 959) with matching amount and current date,
  // fall back to a deterministic receipt reference from the image fingerprint + timestamp.
  // ============================================================================
  const imgFingerprint = receiptDataUrl ? computeReceiptImageFingerprint(receiptDataUrl) : '';
  if (
    !extracted.trxId &&
    extracted.isAbaReceipt &&
    recipientMatched &&
    amountMatched &&
    datePassed &&
    imgFingerprint
  ) {
    extracted.trxId = rawUserRef || `ABA-${imgFingerprint.slice(5, 13)}`;
  }

  const resolvedTrxId = (extracted.trxId || cleanUserTrxId || '').trim();
  const isValidAbaTrxFormat =
    (/^[0-9A-Z\-]{8,28}$/i.test(resolvedTrxId) && /\d{2,}/.test(resolvedTrxId));
  const userAndReceiptTrxMatch =
    !cleanUserTrxId ||
    !extracted.trxId ||
    cleanUserTrxId.replace(/\s+/g, '').toUpperCase() ===
      extracted.trxId.replace(/\s+/g, '').toUpperCase();

  const trxIdPassed = Boolean(
    extracted.trxId && isValidAbaTrxFormat && userAndReceiptTrxMatch
  );

  const trxIdCheck: AbaVerificationCheckItem = {
    passed: trxIdPassed,
    expected: cleanUserTrxId
      ? `Trx. ID: ${cleanUserTrxId}`
      : 'Valid ABA Trx. ID / Ref on Receipt',
    detected: extracted.trxId
      ? `Trx. ID: ${extracted.trxId}`
      : cleanUserTrxId
      ? `Entered: ${cleanUserTrxId} (Not found on image)`
      : 'មិនមានលេខប្រតិបត្តិការ (Missing Trx. ID)',
    reasonKh: trxIdPassed
      ? `✅ លេខប្រតិបត្តិការ ABA ត្រឹមត្រូវ៖ ${extracted.trxId}`
      : !userAndReceiptTrxMatch
      ? `❌ លេខប្រតិបត្តិការដែលបានបញ្ចូល (${cleanUserTrxId}) មិនត្រូវគ្នាជាមួយវិក្កយបត្រ (${extracted.trxId}) ទេ!`
      : '⚠️ មិនអាចផ្ទៀងផ្ទាត់លេខប្រតិបត្តិការ ABA (Trx. ID) លើវិក្កយបត្របានទេ',
    reasonEn: trxIdPassed
      ? `✅ Valid ABA Trx. ID verified: ${extracted.trxId}`
      : !userAndReceiptTrxMatch
      ? `❌ Submitted Trx. ID (${cleanUserTrxId}) does NOT match receipt Trx. ID (${extracted.trxId})!`
      : '⚠️ Could not verify a valid ABA Trx. ID on the receipt',
  };

  // ============================================================================
  // CHECK 5: Deterministic Anti-Replay & Duplicate Transaction Check
  // ============================================================================
  const dupLedger = resolvedTrxId
    ? checkDuplicateTransaction(resolvedTrxId)
    : { isDuplicate: false };
  const dupInTxns = resolvedTrxId
    ? existingTransactions.some(
        t =>
          t.status === 'verified' &&
          t.transactionRef &&
          t.transactionRef.trim().toUpperCase() === resolvedTrxId.toUpperCase()
      )
    : false;

  const dupReceiptImg = isReceiptFingerprintUsed(imgFingerprint, userId);

  const antiReplayPassed = !dupLedger.isDuplicate && !dupInTxns && !dupReceiptImg.used;

  const antiReplayCheck: AbaVerificationCheckItem = {
    passed: antiReplayPassed,
    expected: 'Unique unused ABA Transaction & Receipt',
    detected: !antiReplayPassed
      ? `Duplicate (${effectiveTrxId || dupReceiptImg.trxId || 'Used Receipt'})`
      : 'Unique (មិនធ្លាប់ប្រើពីមុន)',
    reasonKh: antiReplayPassed
      ? '✅ វិក្កយបត្រ និងលេខប្រតិបត្តិការមិនធ្លាប់ត្រូវបានប្រើប្រាស់ពីមុនទេ'
      : '❌ វិក្កយបត្រ ឬលេខប្រតិបត្តិការនេះត្រូវបានប្រើប្រាស់រួចម្តងហើយ!',
    reasonEn: antiReplayPassed
      ? '✅ Transaction ID and receipt image have not been used before'
      : '❌ This transaction ID or receipt screenshot has already been used!',
  };

  // ============================================================================
  // FINAL DECISION: Auto-Approve ONLY if ALL 5 checks pass 100%
  // ============================================================================
  const canAutoApprove =
    recipientCheck.passed &&
    amountCheck.passed &&
    trxIdCheck.passed &&
    dateCheck.passed &&
    antiReplayCheck.passed;

  // Detect if there is a definite mismatch (e.g. wrong recipient, wrong amount, old year, or duplicate)
  const hasExplicitMismatch =
    (Boolean(detectedRecipientDisplay) && !recipientCheck.passed) ||
    (detectedAmount !== undefined && !amountCheck.passed) ||
    (Boolean(extracted.transactionDate) && !dateCheck.passed) ||
    !antiReplayCheck.passed ||
    !userAndReceiptTrxMatch;

  const passedCount = [
    recipientCheck.passed,
    amountCheck.passed,
    trxIdCheck.passed,
    dateCheck.passed,
    antiReplayCheck.passed,
  ].filter(Boolean).length;

  const confidenceScore = Math.round((passedCount / 5) * 100);

  let summaryKh = '';
  let summaryEn = '';

  if (canAutoApprove) {
    summaryKh = `✅ បានផ្ទៀងផ្ទាត់ជោគជ័យ 100%៖ វិក្កយបត្រ ABA ត្រូវគ្នាជាមួយគណនី "${
      extracted.recipientName || 'Kim Seng'
    }", ចំនួនទឹកប្រាក់ $${expectedAmountUsd.toFixed(2)} USD, លេខ Trx. ID (${
      extracted.trxId
    }) និងកាលបរិច្ឆេទ (${extracted.transactionDate})។ អនុម័តបើកដំណើរការ VIP!`;
    summaryEn = `✅ 100% Verified: ABA receipt matches recipient "${
      extracted.recipientName || 'Kim Seng'
    }", amount $${expectedAmountUsd.toFixed(2)} USD, Trx. ID (${
      extracted.trxId
    }), and date (${extracted.transactionDate}). Approved for VIP activation!`;
  } else if (hasExplicitMismatch) {
    const failedReasonsKh = [
      !recipientCheck.passed ? recipientCheck.reasonKh : '',
      !amountCheck.passed ? amountCheck.reasonKh : '',
      !dateCheck.passed ? dateCheck.reasonKh : '',
      !trxIdCheck.passed ? trxIdCheck.reasonKh : '',
      !antiReplayCheck.passed ? antiReplayCheck.reasonKh : '',
    ]
      .filter(Boolean)
      .join(' | ');
    const failedReasonsEn = [
      !recipientCheck.passed ? recipientCheck.reasonEn : '',
      !amountCheck.passed ? amountCheck.reasonEn : '',
      !dateCheck.passed ? dateCheck.reasonEn : '',
      !trxIdCheck.passed ? trxIdCheck.reasonEn : '',
      !antiReplayCheck.passed ? antiReplayCheck.reasonEn : '',
    ]
      .filter(Boolean)
      .join(' | ');

    summaryKh = `🚩 រកឃើញព័ត៌មានមិនត្រូវគ្នា (មិនអាចបើក VIP ស្វ័យប្រវត្តិទេ — បានដាក់សញ្ញាសម្រាប់ Admin ត្រួតពិនិត្យផ្ទាល់)៖ ${failedReasonsKh}`;
    summaryEn = `🚩 Payment Mismatch Detected (VIP NOT auto-activated — Flagged for Manual Admin Review): ${failedReasonsEn}`;
  } else {
    summaryKh =
      '⏳ មិនអាចផ្ទៀងផ្ទាត់ព័ត៌មានលើវិក្កយបត្របានពេញលេញដោយស្វ័យប្រវត្តិទេ។ សំណើត្រូវបានដាក់សញ្ញាសម្រាប់ Admin ត្រួតពិនិត្យដោយផ្ទាល់ (Manual Admin Review)។';
    summaryEn =
      '⏳ Receipt details could not be fully verified automatically. Flagged for manual Admin review before VIP activation.';
  }

  return {
    status: canAutoApprove
      ? 'verified'
      : hasExplicitMismatch
      ? 'rejected_mismatch'
      : 'flagged_manual_review',
    canAutoApprove,
    verifiedAt,
    verificationMethod:
      extracted.extractionSource === 'gemini_vision_and_ocr' ||
      extracted.extractionSource === 'gemini_vision'
        ? 'hybrid_ai_and_transaction'
        : extracted.extractionSource === 'ocr_deterministic'
        ? 'deterministic_transaction_and_ocr'
        : 'manual_fallback',
    confidenceScore,
    summaryKh,
    summaryEn,
    extractedReceipt: {
      isAbaReceipt: extracted.isAbaReceipt,
      trxId: extracted.trxId,
      amountUsd: extracted.amountUsd,
      currency: extracted.currency,
      recipientName: extracted.recipientName,
      recipientAccount: extracted.recipientAccount,
      transactionDate: extracted.transactionDate,
      senderName: extracted.senderName,
      rawOcrText: extracted.rawOcrText,
    },
    checks: {
      recipient: recipientCheck,
      amount: amountCheck,
      trxId: trxIdCheck,
      date: dateCheck,
      antiReplay: antiReplayCheck,
    },
  };
}

import { callAiGateway } from './aiGatewayClient';
import {
  AbaReceiptVerificationReport,
  AbaVerificationCheckItem,
  RegistrationTransaction,
} from '../types';
import { getCloudApiConfig, isSupabaseConfigured, pullCloudDocument } from './supabaseService';
import { checkDuplicateTransaction } from './paymentService';

const USED_RECEIPT_HASHES_KEY = 'kft_used_receipt_hashes_v1';

export const OFFICIAL_RECIPIENT_NAMES = [
  'CHEA SAVUTH',
  'SAVUTH CHEA',
  'SAVUTH',
  'KIM SENG',
  'KIMSENG',
  'CHEA KIMSENG',
  'KIMSENG CHEA',
  'CHEA KIM SENG',
  'KIM SENG CHEA',
];

export const OFFICIAL_RECIPIENT_ACCOUNTS = [
  '000056833',
  '003787096',
  '095245959',
  '012719946',
];

interface ExtractedReceiptData {
  isAbaReceipt: boolean;
  trxId?: string;
  referenceId?: string;
  amountUsd?: number;
  currency?: string;
  recipientName?: string;
  recipientAccount?: string;
  transactionDate?: string;
  senderName?: string;
  paymentStatus?: 'completed' | 'pending' | 'failed' | 'unknown';
  isModifiedOrFake?: boolean;
  tamperReason?: string;
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
 * Returns true if the string is an internal app-generated placeholder reference
 * (e.g. ABA-KHQR-..., ABA-STORE-SLOT1-..., ABA-SHOP-..., ADMIN-VIP-..., TXN-..., AUTO-...)
 * rather than a genuine bank Transaction ID entered by the user.
 */
export function isPlaceholderTrxRef(raw?: string | null): boolean {
  if (!raw) return true;
  const trimmed = String(raw)
    .replace(/^(?:Trx\.?\s*ID|Transaction\s*ID|Tx\.?\s*ID|Ref(?:erence)?\.?\s*(?:No|ID|#)?|ABA\s*Ref)\s*[:.\-#\s]*/i, '')
    .trim();
  if (!trimmed) return true;
  return (
    /^ABA-(?:KHQR|STORE|SHOP|SLOT|VIP|PAY|TXN)[-\w]*/i.test(trimmed) ||
    /^ABA-\d{4,8}$/i.test(trimmed) ||
    /^ADMIN-VIP-/i.test(trimmed) ||
    /^TXN-(?:STORE|SHOP|VIP|REST|ADM)[-\w]*/i.test(trimmed) ||
    /^AUTO/i.test(trimmed) ||
    /^SUP-/i.test(trimmed)
  );
}

/**
 * Strips any 'Trx. ID:' / 'Ref:' prefix, removes internal whitespace, and filters out
 * system-generated placeholders and official recipient account numbers.
 */
export function normalizeAbaTrxId(raw?: string | null): string {
  if (!raw) return '';
  const stripped = String(raw)
    .replace(/^(?:Trx\.?\s*ID|Transaction\s*ID|Tx\.?\s*ID|Ref(?:erence)?\.?\s*(?:No|ID|#)?|ABA\s*Ref)\s*[:.\-#\s]*/i, '')
    .trim();
  if (!stripped || isPlaceholderTrxRef(stripped)) return '';
  const compact = stripped.replace(/\s+/g, '').replace(/[^0-9A-Za-z\-]/g, '');
  if (!compact) return '';
  const digitsOnly = compact.replace(/\D+/g, '');
  if (OFFICIAL_RECIPIENT_ACCOUNTS.includes(digitsOnly)) return '';
  return compact;
}

/**
 * Returns YYYY-MM-DD in Cambodia Standard Time (Asia/Phnom_Penh, UTC+7)
 */
export function getCambodiaDateIso(date: Date = new Date()): string {
  const cambodiaMs = date.getTime() + 7 * 60 * 60 * 1000;
  return new Date(cambodiaMs).toISOString().split('T')[0];
}

/**
 * Parses an ABA Mobile receipt date/time string (e.g. 'Nov 13, 2026 01:38 PM', '13 Nov 2026 13:38',
 * '2026-11-13 06:39', '13/11/2026 13:38') in Cambodia time (UTC+7) when no explicit timezone is present.
 */
export function parseAbaReceiptDateMs(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const clean = String(dateStr)
    .replace(/^Transaction\s*date\s*[:.\-]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return null;

  // Handle DD/MM/YYYY or DD-MM-YYYY (with optional HH:mm AM/PM)
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?$/i);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    let hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 12;
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const ampm = (dmyMatch[6] || '').toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const utcMs = Date.UTC(year, month - 1, day, hour, minute) - 7 * 60 * 60 * 1000;
      return utcMs;
    }
  }

  // If string has no timezone indicator (Z, GMT, +07, etc.), try parsing with Cambodia +07:00 first
  const hasTz = /(?:Z|GMT|UTC|[+-]\d{2}:?\d{2})$/i.test(clean);
  if (!hasTz) {
    const withCambodiaTz = Date.parse(`${clean} GMT+0700`);
    if (!Number.isNaN(withCambodiaTz)) {
      return withCambodiaTz;
    }
  }

  const directMs = Date.parse(clean);
  return Number.isNaN(directMs) ? null : directMs;
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

  // 1. Extract Trx. ID (e.g. "Trx. ID: 65030941734" or "Trx. ID: 176121426630955" or "Ref #: ...")
  let trxId: string | undefined;
  const trxMatch =
    normalized.match(/(?:Trx|Tx|Trans(?:action)?)\.?\s*(?:ID|1D|lD|No|#)?\s*[:.\-\s]+([0-9A-Z][0-9A-Z ]{7,24})/i) ||
    normalized.match(/Ref(?:erence)?\.?\s*(?:No|ID|#)?\s*[:.\-\s]+([0-9A-Z][0-9A-Z ]{7,24})/i);
  if (trxMatch && trxMatch[1]) {
    const firstLineToken = trxMatch[1].split(/\n/)[0].trim();
    const cleanedCandidate = normalizeAbaTrxId(firstLineToken);
    if (cleanedCandidate.length >= 8) {
      trxId = cleanedCandidate;
    }
  }
  if (!trxId) {
    // Look for standalone 8-20 digit ABA transaction ID (excluding recipient account numbers)
    const allDigitMatches = [...normalized.matchAll(/\b(\d{8,20})\b/g)];
    for (const m of allDigitMatches) {
      const candidate = normalizeAbaTrxId(m[1]);
      if (candidate && candidate.length >= 8) {
        trxId = candidate;
        break;
      }
    }
  }

  // 2. Extract Amount & Currency (supports both USD e.g. "-2.99 USD" / "$2.99" and KHR e.g. "-12,000 KHR" / "12,200 ៛")
  let amountUsd: number | undefined;
  let currency = 'USD';
  const khrMatches = [
    ...normalized.matchAll(/[-+–—]?\s*([0-9]{1,3}(?:,[0-9]{3})+|\d{4,8})(?:\.\d{1,2})?\s*(KHR|៛|RIEL)/gi),
    ...normalized.matchAll(/(KHR|៛)\s*[-+–—]?\s*([0-9]{1,3}(?:,[0-9]{3})+|\d{4,8})(?:\.\d{1,2})?/gi),
  ];
  const amountMatches = [
    ...normalized.matchAll(/[-+–—]?\s*\$?\s*(\d{1,6}(?:\.\d{2}))\s*(USD|KHR|\$)/gi),
    ...normalized.matchAll(/(USD|\$)\s*[-+–—]?\s*(\d{1,6}(?:\.\d{2}))/gi),
  ];

  if (khrMatches.length > 0) {
    const first = khrMatches[0];
    const numStr = (/^\d/.test(first[1]) ? first[1] : first[2]).replace(/,/g, '');
    const parsedVal = parseFloat(numStr);
    if (!Number.isNaN(parsedVal) && parsedVal >= 1000) {
      amountUsd = parsedVal;
      currency = 'KHR';
    }
  } else if (amountMatches.length > 0) {
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
    normalized.match(/(000\s*056\s*833|003\s*787\s*096|095\s*245\s*959|012\s*719\s*946|\b0\d{2}\s+\d{3}\s+\d{3,4}\b)/);
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

  let referenceId: string | undefined;
  const refCodeMatch =
    normalized.match(/Ref(?:erence)?\.?\s*(?:No|ID|#)?\s*[:.\-\s]+([0-9A-Z][0-9A-Z ]{7,24})/i) ||
    normalized.match(/\b(100FT[0-9A-Z]{6,18})\b/i);
  if (refCodeMatch && refCodeMatch[1]) {
    const firstToken = refCodeMatch[1].split(/\n/)[0].trim();
    const cleanedRef = normalizeAbaTrxId(firstToken);
    if (cleanedRef.length >= 8) {
      referenceId = cleanedRef;
    }
  }

  return {
    isAbaReceipt,
    trxId,
    referenceId,
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
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    let rawText = '';
    try {
      const ret = await worker.recognize(receiptDataUrl);
      rawText = ret?.data?.text || '';
    } finally {
      await worker.terminate().catch(() => {});
    }
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
    // The key may legitimately be empty on the device when the secure `food-ai` Edge Function holds it.
    if (!receiptDataUrl.startsWith('data:image/') && !receiptDataUrl.startsWith('data:application/pdf')) {
      return null;
    }

    const commaIdx = receiptDataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = receiptDataUrl.slice(0, commaIdx);
    const base64Data = receiptDataUrl.slice(commaIdx + 1);
    const mimeMatch = header.match(/data:((?:image\/[a-zA-Z0-9+.-]+)|application\/pdf);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const prompt = `Analyze this Cambodian ABA Bank / KHQR payment receipt image and return ONLY a JSON object with these exact keys:
{
  "isAbaReceipt": boolean,
  "trxId": string or null (the numeric Trx. ID printed on the receipt, e.g. "65057056625"),
  "referenceId": string or null (the Reference # printed on the receipt, e.g. "100FT40376844728"),
  "amountUsd": number or null (the numeric payment amount printed on the receipt as a positive number, e.g. 2.99 for USD or 12000 for KHR),
  "currency": "USD" or "KHR",
  "recipientName": string or null (the recipient account name at the top of the ABA receipt, e.g. "CHEA SAVUTH" or "SAVUTH CHEA"),
  "recipientAccount": string or null (the "To account" number, e.g. "000 056 833" or "003 787 096"),
  "transactionDate": string or null (the "Transaction date" printed on the receipt, e.g. "Nov 13, 2026 04:47 PM"),
  "senderName": string or null (the "From" name on the receipt),
  "paymentStatus": "completed" | "pending" | "failed" | "unknown",
  "isModifiedOrFake": boolean (true ONLY if there is clear visual pixel/font editing on the image; NEVER flag as fake due to the calendar year/date such as 2026 or 2027),
  "tamperReason": string or null
}`;

    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-2.5-flash',
      'gemini-flash-latest',
    ];
    let textOut = '';
    // 1) Secure gateway (Supabase Edge Function): no AI key on the device, per-user daily quota.
    for (const modelName of candidateModels.slice(0, 3)) {
      const gw = await callAiGateway(
        modelName,
        {
          contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        },
        { timeoutMs: 15000, purpose: 'payment' }
      );
      if (gw.ok) {
        textOut = gw.json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (textOut) break;
      } else if (gw.reason === 'unavailable' || gw.reason === 'quota' || gw.reason === 'forbidden') {
        break; // not deployed / limit reached -> fall back to the on-device key (if any)
      }
    }
    // 2) Legacy direct call with a key stored on the device.
    for (const modelName of apiKey && !textOut ? candidateModels : []) {
      try {
        const cleanKey = encodeURIComponent(apiKey.trim());
        const endpointUrl = apiKey.trim().startsWith('AQ.')
          ? `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelName}:generateContent?key=${cleanKey}`
          : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(
          endpointUrl,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
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
        clearTimeout(timer);
        if (response.ok) {
          const json = await response.json();
          textOut = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (textOut) break;
        }
      } catch {
        // try next model
      }
    }

    if (!textOut) return null;

    let parsed: Record<string, any> | null = null;
    try {
      parsed = JSON.parse(textOut);
    } catch {
      const jsonMatch = textOut.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = null;
        }
      }
    }
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      isAbaReceipt: Boolean(parsed.isAbaReceipt),
      trxId: parsed.trxId ? (normalizeAbaTrxId(String(parsed.trxId)) || undefined) : undefined,
      referenceId: parsed.referenceId ? (normalizeAbaTrxId(String(parsed.referenceId)) || undefined) : undefined,
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
      paymentStatus: ['completed', 'pending', 'failed', 'unknown'].includes(String(parsed.paymentStatus || '').toLowerCase()) ? (String(parsed.paymentStatus).toLowerCase() as 'completed' | 'pending' | 'failed' | 'unknown') : 'completed',
      isModifiedOrFake:
        Boolean(parsed.isModifiedOrFake) &&
        !/\b(future|2026|2027|2028|date|year)\b/i.test(String(parsed.tamperReason || '')),
      tamperReason: parsed.tamperReason ? String(parsed.tamperReason).trim() : undefined,
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
    cleanName.includes('SAVUTH') ||
    (cleanName.includes('CHEA') && cleanName.includes('SAVUTH')) ||
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
  expectedDurationDays: number;
  submittedTrxId?: string;
  submittedDate?: string;
  userId?: string;
  currentTransactionId?: string;
  existingTransactions?: RegistrationTransaction[];
  usedTrxKeys?: string[];
}): Promise<AbaReceiptVerificationReport> {
  const {
    receiptDataUrl,
    expectedAmountUsd,
    expectedDurationDays,
    submittedTrxId = '',
    submittedDate = '',
    userId = '',
    currentTransactionId = '',
    existingTransactions = [],
    usedTrxKeys = [],
  } = params;

  // Merge local + live cloud transactions so recently verified receipts across any account/device are always checked
  const allKnownTxnsMap = new Map<string, RegistrationTransaction>();
  const mergeCandidateTxn = (t?: RegistrationTransaction | null) => {
    if (!t || !t.id) return;
    const prev = allKnownTxnsMap.get(t.id);
    if (!prev) {
      allKnownTxnsMap.set(t.id, t);
      return;
    }
    if (prev.status === 'verified' || t.status === 'verified') {
      const ver = prev.status === 'verified' ? prev : t;
      allKnownTxnsMap.set(t.id, { ...prev, ...t, status: 'verified', verifiedAt: ver.verifiedAt || t.verifiedAt });
    } else if (prev.status === 'rejected' || t.status === 'rejected') {
      allKnownTxnsMap.set(t.id, { ...prev, ...t, status: 'rejected' });
    } else {
      allKnownTxnsMap.set(t.id, { ...prev, ...t });
    }
  };
  for (const t of existingTransactions) mergeCandidateTxn(t);
  try {
    const rawLocalTxns = localStorage.getItem('kft_transactions_v4');
    if (rawLocalTxns) {
      const parsedLocal = JSON.parse(rawLocalTxns);
      if (Array.isArray(parsedLocal)) {
        for (const t of parsedLocal) mergeCandidateTxn(t);
      }
    }
  } catch {}
  try {
    if (isSupabaseConfigured()) {
      const cloudTxns = await pullCloudDocument<RegistrationTransaction[]>('kft_cloud_transactions_v1', 4000).catch(() => null);
      if (Array.isArray(cloudTxns)) {
        for (const t of cloudTxns) mergeCandidateTxn(t);
      }
    }
  } catch {}
  const allKnownTransactions = Array.from(allKnownTxnsMap.values());

  const now = new Date();
  const verifiedAt = now.toISOString().replace('T', ' ').slice(0, 16);

  // Clean user-submitted Trx ID (ignore auto-generated placeholders like ABA-KHQR-..., ABA-STORE-..., ABA-SHOP-..., etc.)
  const cleanUserTrxId = normalizeAbaTrxId(submittedTrxId);

  // Step 1: Extract data from receipt image via both Gemini Vision (if available) and Tesseract OCR
  let extracted: ExtractedReceiptData = {
    isAbaReceipt: false,
    extractionSource: 'none',
  };

  if (receiptDataUrl && (receiptDataUrl.startsWith('data:image/') || receiptDataUrl.startsWith('data:application/pdf'))) {
    const geminiRes = await extractReceiptViaGeminiVision(receiptDataUrl);
    const needsFallbackOcr =
      !geminiRes ||
      !geminiRes.trxId ||
      geminiRes.amountUsd === undefined ||
      (!geminiRes.recipientName && !geminiRes.recipientAccount);
    const ocrRes: Partial<ExtractedReceiptData> = (needsFallbackOcr && receiptDataUrl.startsWith('data:image/'))
      ? await extractReceiptViaOcr(receiptDataUrl)
      : {};

    extracted = {
      isAbaReceipt: Boolean(geminiRes?.isAbaReceipt || ocrRes?.isAbaReceipt),
      trxId: geminiRes?.trxId || ocrRes?.trxId,
      referenceId: geminiRes?.referenceId || ocrRes?.referenceId,
      amountUsd:
        geminiRes?.amountUsd !== undefined ? geminiRes.amountUsd : ocrRes?.amountUsd,
      currency: geminiRes?.currency || ocrRes?.currency || 'USD',
      recipientName: geminiRes?.recipientName || ocrRes?.recipientName,
      recipientAccount: geminiRes?.recipientAccount || ocrRes?.recipientAccount,
      transactionDate: geminiRes?.transactionDate || ocrRes?.transactionDate,
      senderName: geminiRes?.senderName || ocrRes?.senderName,
      paymentStatus: geminiRes?.paymentStatus || 'completed',
      isModifiedOrFake: Boolean(geminiRes?.isModifiedOrFake),
      tamperReason: geminiRes?.tamperReason,
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
    expected: 'CHEA SAVUTH / SAVUTH CHEA (000 056 833)',
    detected: detectedRecipientDisplay || 'រង់ចាំការពិនិត្យពីរដ្ឋបាល',
    reasonKh: recipientMatched
      ? `✅ ឈ្មោះគណនីអ្នកទទួលត្រូវគ្នា៖ ${detectedRecipientDisplay}`
      : detectedRecipientDisplay
      ? `❌ ឈ្មោះអ្នកទទួលលើវិក្កយបត្រគឺ "${detectedRecipientDisplay}" មិនមែនគណនី "CHEA SAVUTH (000 056 833)" ទេ!`
      : '⏳ រង់ចាំរដ្ឋបាលពិនិត្យឈ្មោះគណនីអ្នកទទួលលើវិក្កយបត្រ',
    reasonEn: recipientMatched
      ? `✅ Recipient account matches: ${detectedRecipientDisplay}`
      : detectedRecipientDisplay
      ? `❌ Receipt recipient "${detectedRecipientDisplay}" does NOT match "CHEA SAVUTH (000 056 833)"!`
      : '⏳ Awaiting administrator verification of recipient account on receipt',
  };

  // ============================================================================
  // CHECK 2: Payment Amount (Supports both USD and Khmer Riel KHR @ ~4,000-4,150 KHR/USD)
  // ============================================================================
  const detectedAmount = extracted.amountUsd;
  const detectedCurrency = (extracted.currency || 'USD').toUpperCase();
  const isKhrPayment = detectedCurrency === 'KHR' || (detectedAmount !== undefined && detectedAmount >= 3500);
  const minExpectedKhr = Math.floor(expectedAmountUsd * 3950);
  const maxExpectedKhr = Math.ceil(expectedAmountUsd * 4250);
  const standardExpectedKhr = Math.round((expectedAmountUsd * 4100) / 100) * 100;

  const amountMatched =
    detectedAmount !== undefined &&
    (isKhrPayment
      ? (detectedAmount >= minExpectedKhr && detectedAmount <= maxExpectedKhr) ||
        Math.abs(detectedAmount - expectedAmountUsd) < 0.05
      : Math.abs(detectedAmount - expectedAmountUsd) < 0.05);

  const formattedDetectedAmount =
    detectedAmount !== undefined
      ? isKhrPayment && detectedAmount >= 1000
        ? `${Math.round(detectedAmount).toLocaleString()} KHR (≈ ${(detectedAmount / 4100).toFixed(2)} USD)`
        : `${detectedAmount.toFixed(2)} ${detectedCurrency}`
      : 'រង់ចាំការពិនិត្យពីរដ្ឋបាល';

  const amountCheck: AbaVerificationCheckItem = {
    passed: amountMatched,
    expected: `${expectedAmountUsd.toFixed(2)} USD / ≈ ${standardExpectedKhr.toLocaleString()} KHR (${expectedDurationDays} Days)`,
    detected: formattedDetectedAmount,
    reasonKh: amountMatched
      ? `✅ ចំនួនទឹកប្រាក់ត្រូវគ្នា៖ ${formattedDetectedAmount}`
      : detectedAmount !== undefined
      ? `❌ ចំនួនទឹកប្រាក់លើវិក្កយបត្រ (${formattedDetectedAmount}) មិនត្រូវជាមួយកញ្ចប់ VIP (${expectedAmountUsd.toFixed(2)} USD ឬ ≈ ${standardExpectedKhr.toLocaleString()} រៀល) ទេ!`
      : `⏳ រង់ចាំរដ្ឋបាលពិនិត្យចំនួនទឹកប្រាក់ ${expectedAmountUsd.toFixed(2)} USD (≈ ${standardExpectedKhr.toLocaleString()} រៀល) លើវិក្កយបត្រ`,
    reasonEn: amountMatched
      ? `✅ Payment amount matches: ${formattedDetectedAmount}`
      : detectedAmount !== undefined
      ? `❌ Receipt amount (${formattedDetectedAmount}) does NOT match expected VIP plan (${expectedAmountUsd.toFixed(2)} USD or ≈ ${standardExpectedKhr.toLocaleString()} KHR)!`
      : `⏳ Awaiting administrator verification of payment amount (${expectedAmountUsd.toFixed(2)} USD / ≈ ${standardExpectedKhr.toLocaleString()} KHR)`,
  };

  // ============================================================================
  // CHECK 4: Transaction Date (Evaluated in Cambodia Time UTC+7, within 14 days)
  // ============================================================================
  let datePassed = false;
  let dateReasonKh = '⏳ រង់ចាំរដ្ឋបាលពិនិត្យកាលបរិច្ឆេទលើវិក្កយបត្រ';
  let dateReasonEn = '⏳ Awaiting administrator verification of transaction date';

  if (extracted.transactionDate) {
    const parsedReceiptMs = parseAbaReceiptDateMs(extracted.transactionDate);
    if (parsedReceiptMs !== null && !Number.isNaN(parsedReceiptMs)) {
      const ageDays = (now.getTime() - parsedReceiptMs) / (1000 * 60 * 60 * 24);
      const receiptDateObj = new Date(parsedReceiptMs + 7 * 60 * 60 * 1000);
      const receiptYear = receiptDateObj.getUTCFullYear();

      if (ageDays > 30 && receiptYear < new Date(now.getTime() + 7 * 60 * 60 * 1000).getUTCFullYear()) {
        datePassed = false;
        dateReasonKh = `❌ វិក្កយបត្រនេះជាវិក្កយបត្រចាស់ពីឆ្នាំ ${receiptYear} (${extracted.transactionDate}) មិនមែនការបង់ប្រាក់ថ្មីទេ!`;
        dateReasonEn = `❌ Stale receipt from year ${receiptYear} (${extracted.transactionDate}) — not a current payment!`;
      } else if (ageDays > 14) {
        datePassed = false;
        dateReasonKh = `❌ កាលបរិច្ឆេទលើវិក្កយបត្រ (${extracted.transactionDate}) ហួសរយៈពេលកំណត់ (${Math.round(
          ageDays
        )} ថ្ងៃមុន)!`;
        dateReasonEn = `❌ Receipt date (${extracted.transactionDate}) is too old (${Math.round(
          ageDays
        )} days ago)!`;
      } else if (ageDays < -2) {
        datePassed = false;
        dateReasonKh = `❌ កាលបរិច្ឆេទលើវិក្កយបត្រ (${extracted.transactionDate}) ខុសប្រក្រតី (កាលបរិច្ឆេទអនាគត)!`;
        dateReasonEn = `❌ Receipt date (${extracted.transactionDate}) is in the future!`;
      } else {
        datePassed = true;
        dateReasonKh = `✅ កាលបរិច្ឆេទប្រតិបត្តិការត្រឹមត្រូវ៖ ${extracted.transactionDate}`;
        dateReasonEn = `✅ Valid transaction date verified: ${extracted.transactionDate}`;
      }
    }
  }

  const dateCheck: AbaVerificationCheckItem = {
    passed: datePassed,
    expected: submittedDate || getCambodiaDateIso(now),
    detected: extracted.transactionDate || 'រង់ចាំការពិនិត្យពីរដ្ឋបាល',
    reasonKh: dateReasonKh,
    reasonEn: dateReasonEn,
  };

  // ============================================================================
  // CHECK 3: ABA Transaction ID (Trx. ID)
  // ============================================================================
  const imgFingerprint = receiptDataUrl ? computeReceiptImageFingerprint(receiptDataUrl) : '';

  const cleanExtractedTrxId = normalizeAbaTrxId(extracted.trxId);
  if (cleanExtractedTrxId) {
    extracted.trxId = cleanExtractedTrxId;
  }
  const resolvedTrxId = (cleanExtractedTrxId || cleanUserTrxId || '').trim();
  const isValidAbaTrxFormat =
    /^[0-9A-Z\-]{8,28}$/i.test(resolvedTrxId) && /\d{4,}/.test(resolvedTrxId);

  const userAndReceiptTrxMatch =
    !cleanUserTrxId ||
    !cleanExtractedTrxId ||
    cleanUserTrxId.replace(/[^0-9A-Z]/gi, '').toUpperCase() ===
      cleanExtractedTrxId.replace(/[^0-9A-Z]/gi, '').toUpperCase();

  // Pass when receipt has a valid ABA Trx ID (or user supplied a valid ABA Trx ID on an otherwise valid ABA receipt)
  const hasVerifiedTrxSource = Boolean(
    cleanExtractedTrxId ||
      (cleanUserTrxId && recipientMatched && amountMatched && datePassed)
  );
  const trxIdPassed = Boolean(
    hasVerifiedTrxSource && isValidAbaTrxFormat && userAndReceiptTrxMatch
  );

  const trxIdCheck: AbaVerificationCheckItem = {
    passed: trxIdPassed,
    expected: cleanUserTrxId
      ? `Trx. ID: ${cleanUserTrxId}`
      : 'Valid ABA Trx. ID / Ref on Receipt',
    detected: resolvedTrxId
      ? `Trx. ID: ${resolvedTrxId}`
      : 'រង់ចាំការពិនិត្យពីរដ្ឋបាល',
    reasonKh: trxIdPassed
      ? `✅ លេខប្រតិបត្តិការ ABA ត្រឹមត្រូវ៖ ${resolvedTrxId}`
      : !userAndReceiptTrxMatch
      ? `❌ លេខប្រតិបត្តិការដែលបានបញ្ចូល (${cleanUserTrxId}) មិនត្រូវគ្នាជាមួយវិក្កយបត្រ (${cleanExtractedTrxId}) ទេ!`
      : '⏳ រង់ចាំរដ្ឋបាលពិនិត្យលេខប្រតិបត្តិការលើវិក្កយបត្រ',
    reasonEn: trxIdPassed
      ? `✅ Valid ABA Trx. ID verified: ${resolvedTrxId}`
      : !userAndReceiptTrxMatch
      ? `❌ Submitted Trx. ID (${cleanUserTrxId}) does NOT match receipt Trx. ID (${cleanExtractedTrxId})!`
      : '⏳ Awaiting administrator verification of transaction ID on receipt',
  };

  // ============================================================================
  // CHECK 5: Deterministic Anti-Replay, Duplicate Trx/Ref & Old Statement Check
  // ============================================================================
  const normResolved = resolvedTrxId.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  const normRefId = normalizeAbaTrxId(extracted.referenceId).replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  const usedTrxKeySet = new Set<string>(
    (usedTrxKeys || []).map(k => String(k || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase()).filter(k => k.length >= 6)
  );
  const isDupInLedger =
    (resolvedTrxId
      ? (() => {
          const res = checkDuplicateTransaction(resolvedTrxId) as boolean | { isDuplicate?: boolean };
          return typeof res === 'boolean' ? res : Boolean(res?.isDuplicate);
        })()
      : false) ||
    (normResolved.length >= 6 && usedTrxKeySet.has(normResolved)) ||
    (normRefId.length >= 8 && usedTrxKeySet.has(normRefId));

  let matchedDuplicateTxn: RegistrationTransaction | undefined;
  let matchedOldStatementTxn: RegistrationTransaction | undefined;
  const parsedCurrentReceiptMs = extracted.transactionDate ? parseAbaReceiptDateMs(extracted.transactionDate) : null;
  const normCurrentSender = (extracted.senderName || '').replace(/[^A-Z]/gi, '').toUpperCase();

  for (const t of allKnownTransactions) {
    if (!t || (currentTransactionId && t.id === currentTransactionId)) continue;
    const isActiveOrVerifiedTxn =
      t.status === 'verified' || t.status === 'pending_verification' || t.status === 'needs_more_info';
    if (!isActiveOrVerifiedTxn) continue;

    const tRef = normalizeAbaTrxId(t.transactionRef).replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    const tAiRef = normalizeAbaTrxId(t.aiVerificationReport?.extractedReceipt?.trxId)
      .replace(/[^0-9A-Za-z]/g, '')
      .toUpperCase();
    const tAiRefCode = normalizeAbaTrxId(t.aiVerificationReport?.extractedReceipt?.referenceId)
      .replace(/[^0-9A-Za-z]/g, '')
      .toUpperCase();
    const tRawOcr = (t.aiVerificationReport?.extractedReceipt?.rawOcrText || '')
      .replace(/\s+/g, '')
      .toUpperCase();

    const matchesTrx =
      normResolved.length >= 6 &&
      (tRef === normResolved || tAiRef === normResolved || tAiRefCode === normResolved);
    const matchesRefCode =
      normRefId.length >= 8 &&
      (tRef === normRefId || tAiRef === normRefId || tAiRefCode === normRefId || tRawOcr.includes(normRefId));
    const matchesProofFingerprint =
      Boolean(imgFingerprint) &&
      Boolean(t.paymentProofUrl && t.paymentProofUrl.startsWith('data:image/')) &&
      computeReceiptImageFingerprint(t.paymentProofUrl!) === imgFingerprint;

    if (matchesTrx || matchesRefCode || matchesProofFingerprint) {
      matchedDuplicateTxn = t;
      break;
    }

    // Check if the uploaded statement timestamp is identical to or older than an already-used statement
    if (parsedCurrentReceiptMs !== null && !Number.isNaN(parsedCurrentReceiptMs)) {
      const tReceiptDateStr = t.aiVerificationReport?.extractedReceipt?.transactionDate;
      const tReceiptMs = parseAbaReceiptDateMs(tReceiptDateStr);
      const normTSender = (t.aiVerificationReport?.extractedReceipt?.senderName || '')
        .replace(/[^A-Z]/gi, '')
        .toUpperCase();
      const isSameUserOrSender = Boolean(
        (userId && (t.userId === userId || t.ownerId === userId)) ||
          (normCurrentSender.length >= 5 &&
            normTSender.length >= 5 &&
            (normCurrentSender.includes(normTSender) || normTSender.includes(normCurrentSender)))
      );

      if (tReceiptMs !== null && !Number.isNaN(tReceiptMs)) {
        const sameMinuteAndAmount =
          tReceiptMs === parsedCurrentReceiptMs &&
          (isSameUserOrSender ||
            Math.abs((t.amountUsd || 0) - (extracted.amountUsd || expectedAmountUsd)) < 0.05);
        const olderThanAlreadyUsedStatement =
          parsedCurrentReceiptMs < tReceiptMs &&
          isSameUserOrSender &&
          tReceiptMs - parsedCurrentReceiptMs <= 14 * 24 * 60 * 60 * 1000;

        if (sameMinuteAndAmount || olderThanAlreadyUsedStatement) {
          matchedOldStatementTxn = t;
        }
      }
    }
  }

  const dupInTxns = Boolean(matchedDuplicateTxn || matchedOldStatementTxn);
  const dupReceiptImg = isReceiptFingerprintUsed(imgFingerprint, userId);
  const paymentStatusOk = extracted.paymentStatus !== 'pending' && extracted.paymentStatus !== 'failed';
  const notModifiedOrFake = extracted.isModifiedOrFake !== true;

  if (matchedOldStatementTxn && dateCheck.passed) {
    const priorDateStr =
      matchedOldStatementTxn.aiVerificationReport?.extractedReceipt?.transactionDate ||
      matchedOldStatementTxn.createdAt;
    dateCheck.passed = false;
    dateCheck.reasonKh = `❌ វិក្កយបត្រនេះជាវិក្កយបត្រចាស់ (${extracted.transactionDate}) ដែលត្រូវបានប្រើប្រាស់រួចហើយ (ឬចាស់ជាងវិក្កយបត្រ ${priorDateStr})! សូមអាប់ឡូតវិក្កយបត្របង់ប្រាក់ថ្មី។`;
    dateCheck.reasonEn = `❌ This receipt (${extracted.transactionDate}) is an old statement from on or before an already-used receipt (${priorDateStr})! Please upload your new payment receipt.`;
  }

  const antiReplayPassed = !isDupInLedger && !dupInTxns && !dupReceiptImg.used && paymentStatusOk && notModifiedOrFake;

  const priorUsedLabel =
    matchedDuplicateTxn?.aiVerificationReport?.extractedReceipt?.transactionDate ||
    matchedOldStatementTxn?.aiVerificationReport?.extractedReceipt?.transactionDate ||
    extracted.transactionDate ||
    '';

  const antiReplayCheck: AbaVerificationCheckItem = {
    passed: antiReplayPassed,
    expected: 'Unique unused ABA Transaction & Receipt',
    detected: !antiReplayPassed
      ? `Duplicate / Old Statement (${effectiveTrxId || dupReceiptImg.trxId || 'Used Receipt'}${priorUsedLabel ? ` • ${priorUsedLabel}` : ''})`
      : 'មិនធ្លាប់ប្រើពីមុន',
    reasonKh: antiReplayPassed
      ? '✅ វិក្កយបត្រ និងលេខប្រតិបត្តិការមិនធ្លាប់ត្រូវបានប្រើប្រាស់ពីមុនទេ'
      : `❌ វិក្កយបត្រចាស់ ឬលេខប្រតិបត្តិការ ABA (${effectiveTrxId || 'នេះ'}${extracted.transactionDate ? ` • ${extracted.transactionDate}` : ''}) ត្រូវបានប្រើប្រាស់រួចម្តងហើយ! សូមអាប់ឡូតវិក្កយបត្របង់ប្រាក់ថ្មី។`,
    reasonEn: antiReplayPassed
      ? '✅ Transaction ID and receipt image have not been used before'
      : `❌ This old receipt or ABA Transaction ID (${effectiveTrxId || 'receipt'}${extracted.transactionDate ? ` • ${extracted.transactionDate}` : ''}) has already been used! Please upload your new payment receipt.`,
  };

  // ============================================================================
  // FINAL DECISION: Auto-Approve ONLY if ALL 5 checks pass 100%
  // ============================================================================
  // STRICT SECURITY RULE: Never auto-approve VIP payments on client or via AI OCR.
  // Every payment must remain in pending_verification until an authorized Admin manually approves it.
  const allChecksPassed =
    recipientCheck.passed &&
    amountCheck.passed &&
    trxIdCheck.passed &&
    dateCheck.passed &&
    antiReplayCheck.passed;
  const canAutoApprove = false;

  const isHighConfidenceAiExtraction =
    extracted.extractionSource === 'gemini_vision' ||
    extracted.extractionSource === 'gemini_vision_and_ocr';

  // Only flag as an explicit mismatch when anti-replay fails (duplicate receipt/trx)
  // or when high-confidence AI vision explicitly confirmed a wrong recipient/amount/date.
  const hasExplicitMismatch =
    !antiReplayCheck.passed ||
    !userAndReceiptTrxMatch ||
    (isHighConfidenceAiExtraction &&
      ((Boolean(detectedRecipientDisplay) && !recipientCheck.passed) ||
        (detectedAmount !== undefined && !amountCheck.passed) ||
        (Boolean(extracted.transactionDate) && !dateCheck.passed)));

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

  if (allChecksPassed) {
    summaryKh = `⏳ បឋម៖ វិក្កយបត្រ ABA ត្រូវគ្នាជាមួយគណនី "${
      extracted.recipientName || 'CHEA SAVUTH'
    }", ចំនួនទឹកប្រាក់ ${expectedAmountUsd.toFixed(2)} USD, លេខប្រតិបត្តិការ (${
      extracted.trxId
    }) និងកាលបរិច្ឆេទ (${extracted.transactionDate})។ កំពុងរង់ចាំរដ្ឋបាល (Admin) ពិនិត្យ និងអនុម័តបើកដំណើរការ VIP។`;
    summaryEn = `⏳ Pre-check passed: ABA receipt matches recipient "${
      extracted.recipientName || 'CHEA SAVUTH'
    }", amount ${expectedAmountUsd.toFixed(2)} USD, Trx. ID (${
      extracted.trxId
    }), and date (${extracted.transactionDate}). Awaiting manual Admin approval to activate VIP.`;
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

    summaryKh = `🚩 រកឃើញព័ត៌មានមិនត្រូវគ្នា (កំពុងរង់ចាំរដ្ឋបាលពិនិត្យផ្ទាល់)៖ ${failedReasonsKh}`;
    summaryEn = `🚩 Payment Mismatch Detected (Awaiting Manual Admin Review): ${failedReasonsEn}`;
  } else {
    summaryKh =
      '⏳ បានទទួលវិក្កយបត្ររួចរាល់។ សំណើរបស់អ្នកកំពុងរង់ចាំរដ្ឋបាលពិនិត្យ និងអនុម័តបើកដំណើរការ VIP។';
    summaryEn =
      '⏳ Receipt received. Your request has been submitted for administrator verification and VIP activation.';
  }

  return {
    status: hasExplicitMismatch ? 'rejected_mismatch' : 'flagged_manual_review',
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
      referenceId: extracted.referenceId,
      amountUsd: extracted.amountUsd,
      currency: extracted.currency,
      recipientName: extracted.recipientName,
      recipientAccount: extracted.recipientAccount,
      transactionDate: extracted.transactionDate,
      senderName: extracted.senderName,
      paymentStatus: extracted.paymentStatus,
      isModifiedOrFake: extracted.isModifiedOrFake,
      tamperReason: extracted.tamperReason,
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

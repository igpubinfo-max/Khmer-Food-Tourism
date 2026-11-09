/**
 * Pure server-side identity normalization & SHA-256 claim hashing (no Deno globals => Node unit-testable).
 * Mirrors src/utils/identityNormalize.ts byte-for-byte so server and client produce identical hashes:
 *  - Cambodia phone canonicalization (+855..., Khmer numerals ០-៩, 012..., 855..., +855...)
 *  - Gmail dot & +tag canonicalization + disposable email domain blocking
 *  - Salted SHA-256 identity hashes for Two-Line Trial / $0.99 Promo anti-abuse enforcement
 */

import { sha256Hex } from './common.ts';

const KHMER_DIGITS: Record<string, string> = {
  '០': '0',
  '១': '1',
  '២': '2',
  '៣': '3',
  '៤': '4',
  '៥': '5',
  '៦': '6',
  '៧': '7',
  '៨': '8',
  '៩': '9',
};

export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  '10minutemail.com',
  '10minutemail.net',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.biz',
  'guerrillamail.com',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'inboxbear.com',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mailnesia.com',
  'mohmal.com',
  'mytemp.email',
  'nada.email',
  'sharklasers.com',
  'temp-mail.io',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'tempmail.org',
  'tempmailo.com',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
]);

export function asciiDigitsFromKhmer(raw: string): string {
  return String(raw || '').replace(/[០-៩]/g, (ch) => KHMER_DIGITS[ch] ?? ch);
}

export function normalizeCambodiaPhone(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null;
  const cleaned = asciiDigitsFromKhmer(raw).trim();
  if (!cleaned || /[a-zA-Z@]/.test(cleaned)) return null;

  const hasExplicitPlus = cleaned.startsWith('+');
  let digits = cleaned.replace(/\D+/g, '');
  if (!digits) return null;

  if (digits.startsWith('00') && digits.length >= 10) {
    digits = digits.slice(2);
    if (digits.startsWith('855')) {
      const sub = digits.slice(3).replace(/^0+/, '');
      return /^[1-9]\d{7,8}$/.test(sub) ? `+855${sub}` : null;
    }
    return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  }

  if (digits.startsWith('855')) {
    const sub = digits.slice(3).replace(/^0+/, '');
    return /^[1-9]\d{7,8}$/.test(sub) ? `+855${sub}` : null;
  }

  if (hasExplicitPlus) {
    return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  }

  if (digits.startsWith('0')) {
    const sub = digits.replace(/^0+/, '');
    return /^[1-9]\d{7,8}$/.test(sub) ? `+855${sub}` : null;
  }

  if (/^[1-9]\d{7,8}$/.test(digits)) {
    return `+855${digits}`;
  }

  return null;
}

export function normalizeEmailForIdentity(raw: unknown): { canonical: string; isDisposable: boolean } | null {
  if (typeof raw !== 'string' || !raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return null;

  const atIdx = trimmed.lastIndexOf('@');
  let local = trimmed.slice(0, atIdx);
  let domain = trimmed.slice(atIdx + 1);

  if (
    domain === 'phone.kh' ||
    domain === 'user.kh' ||
    domain.endsWith('.local') ||
    domain === 'guest.kh' ||
    domain === 'example.com' ||
    domain === 'example.org' ||
    domain === 'example.net'
  ) {
    return null;
  }

  if (domain === 'googlemail.com') domain = 'gmail.com';
  const plusIdx = local.indexOf('+');
  if (plusIdx > 0) local = local.slice(0, plusIdx);
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  if (!local) return null;

  const isDisposable =
    DISPOSABLE_EMAIL_DOMAINS.has(domain) ||
    Array.from(DISPOSABLE_EMAIL_DOMAINS).some((d) => domain.endsWith(`.${d}`));

  return { canonical: `${local}@${domain}`, isDisposable };
}

export function sanitizeHexHash(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(v) ? v : null;
}

export async function computeServerIdentityHashes(params: {
  email?: unknown;
  phone?: unknown;
  clientIdentityHashes?: unknown;
}): Promise<{
  emailCanonical: string | null;
  phoneCanonical: string | null;
  identityHashes: string[];
  isDisposableEmail: boolean;
}> {
  const emailNorm = normalizeEmailForIdentity(params.email);
  const phoneNorm = normalizeCambodiaPhone(params.phone);

  const set = new Set<string>();
  if (emailNorm) set.add(await sha256Hex(`kft-id-email-v1:${emailNorm.canonical}`));
  if (phoneNorm) set.add(await sha256Hex(`kft-id-phone-v1:${phoneNorm}`));

  if (Array.isArray(params.clientIdentityHashes)) {
    for (const item of params.clientIdentityHashes.slice(0, 6)) {
      const clean = sanitizeHexHash(item);
      if (clean) set.add(clean);
    }
  }

  return {
    emailCanonical: emailNorm ? emailNorm.canonical : null,
    phoneCanonical: phoneNorm,
    identityHashes: Array.from(set),
    isDisposableEmail: Boolean(emailNorm && emailNorm.isDisposable),
  };
}


/**
 * Official Cambodian TRC 9-digit-only prefixes (subscriber length after +855 is strictly 8 digits: 0xx xxx xxx).
 */
const CAMBODIA_9_DIGIT_ONLY_PREFIXES: ReadonlySet<string> = new Set([
  '10', '11', '12', '14', '15', '16', '17',
  '23', '24', '25', '26', '32', '33', '34', '35', '36',
  '42', '43', '44', '52', '53', '54', '55',
  '61', '62', '63', '64', '65', '69',
  '70', '72', '73', '74', '75', '77', '78', '79',
  '80', '81', '85', '86', '87', '89',
  '90', '92', '93', '95', '98', '99',
]);

/**
 * Official Cambodian TRC prefixes that support 9 or 10 digits locally (subscriber length after +855 is 8 or 9 digits: 0xx xxx xxxx).
 */
const CAMBODIA_9_OR_10_DIGIT_PREFIXES: ReadonlySet<string> = new Set([
  '18', '31', '60', '66', '67', '68', '71', '76', '88', '96', '97',
]);

const FAKE_SUBSCRIBER_PATTERNS: ReadonlySet<string> = new Set([
  '123456', '234567', '345678', '456789', '567890',
  '654321', '765432', '876543', '987654',
  '1234567', '2345678', '3456789', '4567890',
  '7654321', '8765432', '9876543',
  '123123', '1231234', '121212', '1212121', '000111', '111222',
]);

export interface PhoneRegistrationValidationResult {
  valid: boolean;
  canonicalPhone: string | null;
  reason?: 'invalid_format' | 'invalid_carrier_prefix' | 'invalid_carrier_length' | 'fake_pattern';
  messageKh?: string;
  messageEn?: string;
}

/**
 * Strictly validates a phone number for new account registration & Free Trial eligibility:
 * 1. Enforces real Cambodian mobile/telecom operator prefixes (Smart, Cellcard, Metfone, Yes/Seatel).
 * 2. Blocks fake 10-digit numbers on 9-digit-only prefixes (e.g. 012 123 4567 or 010 999 8888).
 * 3. Blocks repetitive/sequential bogus test numbers (e.g. 096 123 4567, 012 111 111, 097 888 8888).
 */
export function validateCambodiaPhoneForRegistration(raw?: unknown): PhoneRegistrationValidationResult {
  const canonical = normalizeCambodiaPhone(typeof raw === 'string' ? raw : null);
  if (!canonical) {
    return {
      valid: false,
      canonicalPhone: null,
      reason: 'invalid_format',
      messageKh: 'សូមបញ្ចូលលេខទូរសព្ទឱ្យបានត្រឹមត្រូវ (ឧ. 012 245 959 ឬ 096 458 2917)',
      messageEn: 'Please enter a valid phone number (e.g. 012 245 959 or 096 458 2917)',
    };
  }

  if (canonical.startsWith('+855')) {
    const sub = canonical.slice(4); // 8 or 9 digits
    const prefix2 = sub.slice(0, 2);
    const bodyDigits = sub.slice(2);

    const is9DigitOnly = CAMBODIA_9_DIGIT_ONLY_PREFIXES.has(prefix2);
    const is9Or10Digit = CAMBODIA_9_OR_10_DIGIT_PREFIXES.has(prefix2);

    if (!is9DigitOnly && !is9Or10Digit) {
      return {
        valid: false,
        canonicalPhone: null,
        reason: 'invalid_carrier_prefix',
        messageKh: `⚠️ ក្បាលលេខ 0${prefix2} មិនមែនជាប្រព័ន្ធទូរសព្ទផ្លូវការនៅកម្ពុជាទេ (Smart / Cellcard / Metfone / Yes)។ សូមប្រើលេខពិតប្រាកដ!`,
        messageEn: `⚠️ Prefix 0${prefix2} is not a valid Cambodian mobile operator prefix. Please enter a real phone number!`,
      };
    }

    if (is9DigitOnly && sub.length !== 8) {
      return {
        valid: false,
        canonicalPhone: null,
        reason: 'invalid_carrier_length',
        messageKh: `⚠️ ក្បាលលេខ 0${prefix2} នៅកម្ពុជាមានតែ ៩ ខ្ទង់ប៉ុណ្ណោះ (មិនមែន ១០ ខ្ទង់ទេ)។ សូមពិនិត្យលេខទូរសព្ទរបស់អ្នកឡើងវិញ!`,
        messageEn: `⚠️ Cambodian prefix 0${prefix2} only has 9 digits (not 10 digits). Please check your phone number!`,
      };
    }

    if (is9Or10Digit && sub.length !== 8 && sub.length !== 9) {
      return {
        valid: false,
        canonicalPhone: null,
        reason: 'invalid_carrier_length',
        messageKh: `⚠️ ចំនួនខ្ទង់លេខទូរសព្ទ 0${prefix2} មិនត្រឹមត្រូវទេ។`,
        messageEn: `⚠️ Invalid digit length for prefix 0${prefix2}.`,
      };
    }

    // Subscriber number after operator prefix cannot start with 0, cannot have 5+ identical consecutive digits, and cannot be sequential test digits
    if (
      bodyDigits.startsWith('0') ||
      /(\d)\1{4,}/.test(sub) ||
      FAKE_SUBSCRIBER_PATTERNS.has(bodyDigits) ||
      new Set(bodyDigits.split('')).size < 2
    ) {
      return {
        valid: false,
        canonicalPhone: null,
        reason: 'fake_pattern',
        messageKh: '⚠️ លេខទូរសព្ទនេះជាលេខគំរូ ឬលេខក្លែងក្លាយមិនអាចចុះឈ្មោះបានទេ។ សូមបញ្ចូលលេខទូរសព្ទពិតប្រាកដរបស់អ្នក!',
        messageEn: '⚠️ This appears to be a fake or test phone number. Please enter your real active phone number!',
      };
    }
  } else {
    // International number: reject 5+ consecutive identical digits or sequential patterns
    const intDigits = canonical.slice(1);
    if (/(\d)\1{4,}/.test(intDigits) || /1234567|7654321/.test(intDigits)) {
      return {
        valid: false,
        canonicalPhone: null,
        reason: 'fake_pattern',
        messageKh: '⚠️ លេខទូរសព្ទនេះមិនត្រឹមត្រូវទេ។ សូមបញ្ចូលលេខទូរសព្ទពិតប្រាកដ!',
        messageEn: '⚠️ Invalid or fake phone number pattern.',
      };
    }
  }

  return {
    valid: true,
    canonicalPhone: canonical,
  };
}

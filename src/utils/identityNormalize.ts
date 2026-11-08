/**
 * Canonical Identity Normalization & SHA-256 Hashing Utilities
 * Used for:
 *  1. Cambodia Phone Number canonicalization (+855...) so 012345678, 85512345678, +855 12 345 678, and Khmer numerals match identically.
 *  2. Gmail dot / +tag normalization & disposable email blocking for Two-Line Trial Abuse Protection.
 *  3. Privacy-safe one-way SHA-256 hashing before sending claim identifiers to the server.
 */

const KHMER_DIGIT_MAP: Record<string, string> = {
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
  return String(raw || '').replace(/[០-៩]/g, (ch) => KHMER_DIGIT_MAP[ch] ?? ch);
}

/**
 * Normalizes a Cambodia (or international) phone number into canonical E.164 format.
 * Examples:
 *  - "012 345 678"      -> "+85512345678"
 *  - "85512345678"      -> "+85512345678"
 *  - "855012345678"     -> "+85512345678"
 *  - "+855 12-345-678"  -> "+85512345678"
 *  - "០១២ ៣៤៥ ៦៧៨"      -> "+85512345678"
 *  - "12345678"         -> "+85512345678"
 * Returns null if the input is not a valid phone number.
 */
export function normalizeCambodiaPhone(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = asciiDigitsFromKhmer(raw).trim();
  if (!cleaned) return null;

  // Reject strings containing @ or letters
  if (/[a-zA-Z@]/.test(cleaned)) return null;

  const hasExplicitPlus = cleaned.startsWith('+');
  let digits = cleaned.replace(/\D+/g, '');
  if (!digits) return null;

  // International 00 prefix -> treat like +
  if (digits.startsWith('00') && digits.length >= 10) {
    digits = digits.slice(2);
    if (digits.startsWith('855')) {
      const sub = digits.slice(3).replace(/^0+/, '');
      if (/^[1-9]\d{7,8}$/.test(sub)) return `+855${sub}`;
      return null;
    }
    if (/^[1-9]\d{7,14}$/.test(digits)) return `+${digits}`;
    return null;
  }

  // Cambodia country code 855...
  if (digits.startsWith('855')) {
    const sub = digits.slice(3).replace(/^0+/, '');
    if (/^[1-9]\d{7,8}$/.test(sub)) {
      return `+855${sub}`;
    }
    return null;
  }

  // Non-Cambodia explicit +E.164 (e.g. +1..., +66..., +84..., +86...)
  if (hasExplicitPlus) {
    if (/^[1-9]\d{7,14}$/.test(digits)) {
      return `+${digits}`;
    }
    return null;
  }

  // Local Cambodia format starting with 0 (e.g. 012345678 or 0961234567 — 9 or 10 digits)
  if (digits.startsWith('0')) {
    const sub = digits.replace(/^0+/, '');
    if (/^[1-9]\d{7,8}$/.test(sub)) {
      return `+855${sub}`;
    }
    return null;
  }

  // Local Cambodia subscriber digits entered without leading 0 (e.g. 12345678 or 961234567)
  if (/^[1-9]\d{7,8}$/.test(digits)) {
    return `+855${digits}`;
  }

  return null;
}

export function getCanonicalPhoneDigits(raw?: string | null): string | null {
  const e164 = normalizeCambodiaPhone(raw);
  return e164 ? e164.slice(1) : null;
}

export function formatCambodiaPhoneDisplay(raw?: string | null): string {
  const e164 = normalizeCambodiaPhone(raw);
  if (!e164) return String(raw || '').trim();
  if (e164.startsWith('+855')) {
    const sub = e164.slice(4);
    if (sub.length === 8) {
      return `0${sub.slice(0, 2)} ${sub.slice(2, 5)} ${sub.slice(5)}`;
    }
    if (sub.length === 9) {
      return `0${sub.slice(0, 2)} ${sub.slice(2, 5)} ${sub.slice(5)}`;
    }
    return `0${sub}`;
  }
  return e164;
}

/**
 * Normalizes an email address for anti-abuse identity matching:
 *  - Lowercases & trims
 *  - Rejects internal synthetic domains (@phone.kh, @user.kh, @guest.local, etc.)
 *  - Collapses @googlemail.com -> @gmail.com, strips Gmail dots and +tags
 *  - Strips +tags on other domains
 *  - Flags disposable email domains
 */
export function normalizeEmailForIdentity(
  raw?: string | null
): { canonical: string; isDisposable: boolean } | null {
  if (!raw || typeof raw !== 'string') return null;
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

  if (domain === 'googlemail.com') {
    domain = 'gmail.com';
  }

  const plusIdx = local.indexOf('+');
  if (plusIdx > 0) {
    local = local.slice(0, plusIdx);
  }
  if (domain === 'gmail.com') {
    local = local.replace(/\./g, '');
  }
  if (!local) return null;

  const isDisposable =
    DISPOSABLE_EMAIL_DOMAINS.has(domain) ||
    Array.from(DISPOSABLE_EMAIL_DOMAINS).some((d) => domain.endsWith(`.${d}`));

  return {
    canonical: `${local}@${domain}`,
    isDisposable,
  };
}

export function isDisposableEmailAddress(raw?: string | null): boolean {
  const norm = normalizeEmailForIdentity(raw);
  return Boolean(norm?.isDisposable);
}

/**
 * Pure-JS SHA-256 fallback only if crypto.subtle is unavailable (e.g. plain HTTP LAN testing).
 */
function sha256FallbackHex(ascii: string): string {
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words: number[] = [];
  const utf8 = unescape(encodeURIComponent(ascii));
  const asciiBitLength = utf8.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let str = utf8 + '\x80';
  while ((str.length % 64) - 56) str += '\x00';
  for (let i = 0; i < str.length; i++) {
    const j = str.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export async function sha256Hex(input: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fall back to pure JS SHA-256
  }
  return sha256FallbackHex(input);
}

export async function computeIdentityClaimHashes(params: {
  email?: string | null;
  phone?: string | null;
}): Promise<{
  emailCanonical: string | null;
  phoneCanonical: string | null;
  emailHash: string | null;
  phoneHash: string | null;
  identityHashes: string[];
  isDisposableEmail: boolean;
}> {
  const emailNorm = normalizeEmailForIdentity(params.email);
  const phoneNorm = normalizeCambodiaPhone(params.phone);

  const emailHash = emailNorm ? await sha256Hex(`kft-id-email-v1:${emailNorm.canonical}`) : null;
  const phoneHash = phoneNorm ? await sha256Hex(`kft-id-phone-v1:${phoneNorm}`) : null;
  const identityHashes = [emailHash, phoneHash].filter((v): v is string => Boolean(v));

  return {
    emailCanonical: emailNorm?.canonical ?? null,
    phoneCanonical: phoneNorm,
    emailHash,
    phoneHash,
    identityHashes,
    isDisposableEmail: Boolean(emailNorm?.isDisposable),
  };
}

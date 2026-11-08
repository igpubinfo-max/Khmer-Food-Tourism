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

/**
 * Official ABA Bank / NBC Bakong Dynamic EMVCo KHQR Generator & Deep-Link Builder
 *
 * Recipient: CHEA SAVUTH
 * USD Account: 000 056 833 (000056833)
 * KHR Account: 003 787 096 (003787096)
 * ABA P2P Customer ID: D08414927BBF (Code: 260824)
 *
 * Ensures every selected VIP or Shop/Hotel package ($2.99, $6.99, $19.99, $49.99, $0.99)
 * generates a valid EMVCo dynamic KHQR payload (Point of Initiation = 12, Currency = 840 USD,
 * Tag 54 = exact package amount, Tag 63 = valid CRC-16/CCITT-FALSE checksum) and passes the
 * pre-filled amount directly to ABA Mobile via the official ABA P2P deep-link protocol.
 */

export const ABA_OFFICIAL_MERCHANT = {
  accountName: 'CHEA SAVUTH',
  usdAccount: '000056833',
  usdAccountFormatted: '000 056 833',
  khrAccount: '003787096',
  khrAccountFormatted: '003 787 096',
  bakongAccountId: 'abaakhppxxx@abaa',
  acquiringBank: 'ABA Bank',
  p2pCustomerId: 'D08414927BBF',
  p2pCode: '260824',
  merchantCity: 'Phnom Penh',
  countryCode: 'KH',
  mcc: '5999',
  usdCurrencyCode: '840',
  androidPackage: 'com.paygo24.ibank',
  iosAppStoreUrl: 'https://itunes.apple.com/al/app/aba-mobile-bank/id968860649?mt=8',
  googlePlayUrl: 'https://play.google.com/store/apps/details?id=com.paygo24.ibank',
} as const;

/**
 * Exact decoded EMVCo KHQR strings from the 4 official ABA Bank QR images
 * generated in ABA Mobile for CHEA SAVUTH (USD Account 000 056 833).
 */
export const OFFICIAL_ABA_KHQR_STRINGS_BY_AMOUNT: Record<string, string> = {
  '2.99':
    '00020101021229450016abaakhppxxx@abaa01090000568330208ABA Bank40390006abaP2P0112D08414927BBF020900005683352045999530384054042.995802KH5911CHEA SAVUTH6010Phnom Penh993400131794541002019011318260770020196304270A',
  '6.99':
    '00020101021229450016abaakhppxxx@abaa01090000568330208ABA Bank40390006abaP2P0112D08414927BBF020900005683352045999530384054046.995802KH5911CHEA SAVUTH6010Phnom Penh9934001317945410751950113182607707519563045428',
  '19.99':
    '00020101021229450016abaakhppxxx@abaa01090000568330208ABA Bank40390006abaP2P0112D08414927BBF0209000056833520459995303840540519.995802KH5911CHEA SAVUTH6010Phnom Penh993400131794541103536011318260771035366304D560',
  '49.99':
    '00020101021229450016abaakhppxxx@abaa01090000568330208ABA Bank40390006abaP2P0112D08414927BBF0209000056833520459995303840540549.995802KH5911CHEA SAVUTH6010Phnom Penh9934001317945411559620113182607715596263041087',
};

/**
 * Computes EMVCo CRC-16/CCITT-FALSE (polynomial 0x1021, initial value 0xFFFF)
 * and returns a 4-character uppercase hexadecimal string.
 */
export function computeEmvCoCrc16(payloadWithoutCrcValue: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payloadWithoutCrcValue.length; i++) {
    crc ^= (payloadWithoutCrcValue.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEmvTlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Normalizes a numeric or string USD package price into a strict 2-decimal string (e.g. "2.99").
 */
export function normalizeAbaAmountUsd(amountUsd: number | string): string {
  const parsed = typeof amountUsd === 'number' ? amountUsd : parseFloat(String(amountUsd).trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ABA KHQR payment amount: ${String(amountUsd)}`);
  }
  return parsed.toFixed(2);
}

/**
 * Generates a dynamic EMVCo ABA KHQR payload for CHEA SAVUTH (USD Account 000056833)
 * with the exact USD package amount locked in Tag 54 and a valid CRC16 checksum in Tag 63.
 */
export function generateDynamicAbaKhqrPayload(
  amountUsd: number | string,
  createdAtMs: number = Date.now()
): string {
  const amountStr = normalizeAbaAmountUsd(amountUsd);
  const createdMs = Math.max(1000000000000, Math.trunc(createdAtMs));
  const expiresMs = createdMs + 31536000000; // +365 days validity window matching ABA Mobile format
  const createdStr = String(createdMs).padStart(13, '0').slice(0, 13);
  const expiresStr = String(expiresMs).padStart(13, '0').slice(0, 13);

  const tag29Value =
    formatEmvTlv('00', ABA_OFFICIAL_MERCHANT.bakongAccountId) +
    formatEmvTlv('01', ABA_OFFICIAL_MERCHANT.usdAccount) +
    formatEmvTlv('02', ABA_OFFICIAL_MERCHANT.acquiringBank);

  const tag40Value =
    formatEmvTlv('00', 'abaP2P') +
    formatEmvTlv('01', ABA_OFFICIAL_MERCHANT.p2pCustomerId) +
    formatEmvTlv('02', ABA_OFFICIAL_MERCHANT.usdAccount);

  const tag99Value =
    formatEmvTlv('00', createdStr) +
    formatEmvTlv('01', expiresStr);

  const payloadWithoutCrc =
    '000201' + // Tag 00: Payload Format Indicator (01)
    '010212' + // Tag 01: Point of Initiation Method (12 = Dynamic QR with amount locked)
    formatEmvTlv('29', tag29Value) + // Tag 29: Bakong Merchant Account Info
    formatEmvTlv('40', tag40Value) + // Tag 40: ABA P2P Routing Info (D08414927BBF / 000056833)
    formatEmvTlv('52', ABA_OFFICIAL_MERCHANT.mcc) + // Tag 52: MCC (5999)
    formatEmvTlv('53', ABA_OFFICIAL_MERCHANT.usdCurrencyCode) + // Tag 53: Transaction Currency (840 = USD)
    formatEmvTlv('54', amountStr) + // Tag 54: Exact Pre-Filled Package Amount in USD
    formatEmvTlv('58', ABA_OFFICIAL_MERCHANT.countryCode) + // Tag 58: Country Code (KH)
    formatEmvTlv('59', ABA_OFFICIAL_MERCHANT.accountName) + // Tag 59: Merchant Name (CHEA SAVUTH)
    formatEmvTlv('60', ABA_OFFICIAL_MERCHANT.merchantCity) + // Tag 60: Merchant City (Phnom Penh)
    formatEmvTlv('99', tag99Value) + // Tag 99: Creation & Expiration Timestamps
    '6304'; // Tag 63 header (4-char CRC16 follows)

  const crc = computeEmvCoCrc16(payloadWithoutCrc);
  return payloadWithoutCrc + crc;
}

/**
 * Verifies the CRC-16/CCITT-FALSE checksum of an EMVCo KHQR string.
 */
export function verifyAbaKhqrPayloadCrc(khqrPayload: string): boolean {
  if (!khqrPayload || typeof khqrPayload !== 'string' || khqrPayload.length < 20) {
    return false;
  }
  const crcTagIndex = khqrPayload.length - 8;
  if (khqrPayload.slice(crcTagIndex, crcTagIndex + 4) !== '6304') {
    return false;
  }
  const bodyWithHeader = khqrPayload.slice(0, crcTagIndex + 4);
  const actualCrc = khqrPayload.slice(crcTagIndex + 4).toUpperCase();
  const expectedCrc = computeEmvCoCrc16(bodyWithHeader);
  return actualCrc === expectedCrc;
}

/**
 * Parses top-level EMVCo TLV tags and extracts the locked transaction amount (Tag 54) and currency (Tag 53).
 */
export function parseAbaKhqrSummary(khqrPayload: string): {
  isValidCrc: boolean;
  pointOfInitiation: string | null;
  currencyCode: string | null;
  amountUsd: string | null;
  merchantName: string | null;
  usdAccount: string | null;
} {
  const isValidCrc = verifyAbaKhqrPayloadCrc(khqrPayload);
  const tags: Record<string, string> = {};
  let idx = 0;
  while (idx + 4 <= khqrPayload.length) {
    const tag = khqrPayload.slice(idx, idx + 2);
    const len = parseInt(khqrPayload.slice(idx + 2, idx + 4), 10);
    if (Number.isNaN(len) || len < 0 || idx + 4 + len > khqrPayload.length) {
      break;
    }
    tags[tag] = khqrPayload.slice(idx + 4, idx + 4 + len);
    idx += 4 + len;
  }
  return {
    isValidCrc,
    pointOfInitiation: tags['01'] || null,
    currencyCode: tags['53'] || null,
    amountUsd: tags['54'] || null,
    merchantName: tags['59'] || null,
    usdAccount:
      tags['29']?.includes(ABA_OFFICIAL_MERCHANT.usdAccount) ||
      tags['40']?.includes(ABA_OFFICIAL_MERCHANT.usdAccount)
        ? ABA_OFFICIAL_MERCHANT.usdAccount
        : null,
  };
}

export interface AbaDynamicPaymentBundle {
  amountUsd: number;
  amountStr: string;
  khqrString: string;
  officialStaticKhqrString: string;
  abaDeepLinkUri: string;
  androidIntentUri: string;
  paymentUrl: string;
  desktopQrWebUrl: string;
}

/**
 * Builds the complete dynamic ABA KHQR payment bundle (EMVCo KHQR string, native
 * abamobilebank:// deep link, Android Intent URI, and PayWay dynamic link) with
 * the exact package amount pre-filled so users never have to manually enter the amount.
 */
export function buildAbaDynamicPaymentBundle(amountUsd: number | string): AbaDynamicPaymentBundle {
  const amountStr = normalizeAbaAmountUsd(amountUsd);
  const numericAmount = parseFloat(amountStr);
  const khqrString = generateDynamicAbaKhqrPayload(amountStr);
  const officialStaticKhqrString = OFFICIAL_ABA_KHQR_STRINGS_BY_AMOUNT[amountStr] || khqrString;

  const queryParams =
    `type=p2p` +
    `&aba-id=${encodeURIComponent(ABA_OFFICIAL_MERCHANT.p2pCustomerId)}` +
    `&id=${encodeURIComponent(ABA_OFFICIAL_MERCHANT.p2pCustomerId)}` +
    `&userid=${encodeURIComponent(ABA_OFFICIAL_MERCHANT.p2pCustomerId)}` +
    `&code=${encodeURIComponent(ABA_OFFICIAL_MERCHANT.p2pCode)}` +
    `&amount=${encodeURIComponent(amountStr)}` +
    `&acc=${encodeURIComponent(ABA_OFFICIAL_MERCHANT.usdAccount)}` +
    `&usdAcc=${encodeURIComponent(ABA_OFFICIAL_MERCHANT.usdAccount)}` +
    `&ccy=USD` +
    `&dynamic=true` +
    `&link_action=abaqr` +
    `&qrcode=${encodeURIComponent(khqrString)}`;

  const abaDeepLinkUri = `abamobilebank://ababank.com?${queryParams}`;

  // Mobile web PayWay link without dynamic=true triggers ABA's native P2P deep link with pre-filled amount
  const paymentUrl =
    `https://link.payway.com.kh/aba?id=${encodeURIComponent(ABA_OFFICIAL_MERCHANT.p2pCustomerId)}` +
    `&aba-id=${encodeURIComponent(ABA_OFFICIAL_MERCHANT.p2pCustomerId)}` +
    `&userid=${encodeURIComponent(ABA_OFFICIAL_MERCHANT.p2pCustomerId)}` +
    `&code=${encodeURIComponent(ABA_OFFICIAL_MERCHANT.p2pCode)}` +
    `&amount=${encodeURIComponent(amountStr)}` +
    `&acc=${encodeURIComponent(ABA_OFFICIAL_MERCHANT.usdAccount)}` +
    `&usdAcc=${encodeURIComponent(ABA_OFFICIAL_MERCHANT.usdAccount)}` +
    `&ccy=USD` +
    `&link_action=abaqr`;

  const desktopQrWebUrl = `${paymentUrl}&dynamic=true`;

  const androidIntentUri =
    `intent://ababank.com?${queryParams}` +
    `#Intent;package=${ABA_OFFICIAL_MERCHANT.androidPackage};` +
    `S.browser_fallback_url=${encodeURIComponent(paymentUrl)};` +
    `scheme=abamobilebank;end;`;

  return {
    amountUsd: numericAmount,
    amountStr,
    khqrString,
    officialStaticKhqrString,
    abaDeepLinkUri,
    androidIntentUri,
    paymentUrl,
    desktopQrWebUrl,
  };
}

/**
 * Launches ABA Mobile with the dynamically generated KHQR and pre-filled package amount.
 * Handles Capacitor Android/iOS native plugin as well as mobile/desktop browsers.
 */
export async function launchAbaMobileWithDynamicKhqr(
  amountUsd: number | string
): Promise<{
  launched: boolean;
  method: string;
  bundle: AbaDynamicPaymentBundle;
  openedMarket?: boolean;
}> {
  const bundle = buildAbaDynamicPaymentBundle(amountUsd);

  try {
    const { Capacitor, registerPlugin } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const NativeAbaLauncher = registerPlugin<any>('NativeAbaLauncher');
      if (NativeAbaLauncher && typeof NativeAbaLauncher.openAbaMobile === 'function') {
        const res = await NativeAbaLauncher.openAbaMobile({
          amount: bundle.amountStr,
          khqrString: bundle.khqrString,
          deepLinkUri: bundle.abaDeepLinkUri,
          intentUri: bundle.androidIntentUri,
          paymentUrl: bundle.paymentUrl,
          account: ABA_OFFICIAL_MERCHANT.usdAccount,
          abaId: ABA_OFFICIAL_MERCHANT.p2pCustomerId,
          code: ABA_OFFICIAL_MERCHANT.p2pCode,
        });
        if (res?.success) {
          return {
            launched: true,
            method: res.method || 'native_aba_p2p_deeplink',
            bundle,
          };
        }
        if (res?.reason && String(res.reason).includes('market')) {
          return {
            launched: false,
            method: 'market_fallback',
            bundle,
            openedMarket: true,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Native ABA launcher fallback:', err);
  }

  // Browser / WebView fallback with pre-filled amount
  if (typeof window !== 'undefined') {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isAndroid = /android/i.test(ua);
    const isIos = /iphone|ipad|ipod/i.test(ua);

    if (isAndroid) {
      try {
        window.location.href = bundle.androidIntentUri;
        return { launched: true, method: 'web_android_intent', bundle };
      } catch {
        window.location.href = bundle.abaDeepLinkUri;
        return { launched: true, method: 'web_aba_scheme', bundle };
      }
    }

    if (isIos) {
      try {
        window.location.href = bundle.abaDeepLinkUri;
        return { launched: true, method: 'web_ios_scheme', bundle };
      } catch {
        window.location.href = bundle.paymentUrl;
        return { launched: true, method: 'web_payway_url', bundle };
      }
    }

    // Desktop browser: open dynamic PayWay KHQR page with amount pre-filled
    try {
      window.open(bundle.desktopQrWebUrl, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = bundle.desktopQrWebUrl;
    }
  }

  return {
    launched: true,
    method: 'web_payway_dynamic_qr',
    bundle,
  };
}

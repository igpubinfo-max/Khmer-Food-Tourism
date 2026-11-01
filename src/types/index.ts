export const APP_VERSION = 'v2.5.0';
export const APP_VERSION_NAME = '2.5.0';
declare const __KFT_BUILD_CODE__: number | undefined;
export const APP_BUILD_CODE: number = typeof __KFT_BUILD_CODE__ === 'number' ? __KFT_BUILD_CODE__ : 1310;
export const APP_RELEASE_DATE = '2026-11-01';

/**
 * Authoritative baseline timestamp for the verified bundled 200-dish food photo library (`public/foods/*.jpg`).
 * Any stale cached/cloud food photo override older than this baseline (or using legacy auto-scraped external placeholders)
 * is strictly rejected and purged so old food pictures never reappear.
 */
export const SEED_FOOD_PHOTO_BASELINE_ISO = '2026-10-31T10:30:00.000Z';
export const SEED_FOOD_PHOTO_BASELINE_MS = Date.parse(SEED_FOOD_PHOTO_BASELINE_ISO);

/**
 * Per-dish baked photo timestamps for dishes updated via the PC Excel Photo Insert Template.
 * Guarantees that newly baked `/foods/food-*.jpg` assets immediately supersede any older local/cloud override
 * from before the Excel import, while preserving any newer edits made after this timestamp.
 */
export const EXCEL_BAKED_FOOD_PHOTO_TIMESTAMPS: Record<string, string> = {
  'food-2': '2026-11-01T06:08:28.084Z',
  'food-38': '2026-11-01T06:08:28.084Z',
  'food-47': '2026-11-01T06:08:28.084Z',
  'food-82': '2026-11-01T06:08:28.084Z',
  'food-86': '2026-11-01T06:08:28.084Z',
  'food-88': '2026-11-01T06:08:28.084Z',
  'food-89': '2026-11-01T06:08:28.084Z',
  'food-96': '2026-11-01T06:08:28.084Z',
  'food-101': '2026-11-01T06:09:56.357Z',
  'food-102': '2026-11-01T06:09:56.357Z',
  'food-103': '2026-11-01T06:09:56.357Z',
  'food-104': '2026-11-01T06:09:56.357Z',
  'food-105': '2026-11-01T06:09:56.357Z',
  'food-106': '2026-11-01T06:09:56.357Z',
  'food-107': '2026-11-01T06:09:56.357Z',
  'food-108': '2026-11-01T06:09:56.357Z',
  'food-109': '2026-11-01T06:09:56.357Z',
  'food-110': '2026-11-01T06:09:56.357Z',
  'food-111': '2026-11-01T06:09:56.357Z',
  'food-112': '2026-11-01T06:09:56.357Z',
  'food-113': '2026-11-01T06:09:56.357Z',
  'food-114': '2026-11-01T06:09:56.357Z',
  'food-115': '2026-11-01T06:09:56.357Z',
  'food-116': '2026-11-01T06:09:56.357Z',
  'food-117': '2026-11-01T06:09:56.357Z',
  'food-118': '2026-11-01T06:09:56.357Z',
  'food-119': '2026-11-01T06:09:56.357Z',
  'food-120': '2026-11-01T06:09:56.357Z',
  'food-121': '2026-11-01T06:09:56.357Z',
  'food-122': '2026-11-01T06:09:56.357Z',
  'food-123': '2026-11-01T06:09:56.357Z',
  'food-124': '2026-11-01T06:09:56.357Z',
  'food-125': '2026-11-01T06:09:56.357Z',
  'food-126': '2026-11-01T06:09:56.357Z',
  'food-127': '2026-11-01T06:09:56.357Z',
  'food-128': '2026-11-01T06:09:56.357Z',
  'food-129': '2026-11-01T06:09:56.357Z',
  'food-130': '2026-11-01T06:09:56.357Z',
  'food-131': '2026-11-01T06:09:56.357Z',
  'food-132': '2026-11-01T06:09:56.357Z',
  'food-133': '2026-11-01T06:09:56.357Z',
  'food-134': '2026-11-01T06:09:56.357Z',
  'food-135': '2026-11-01T06:09:56.357Z',
  'food-136': '2026-11-01T06:09:56.357Z',
  'food-137': '2026-11-01T06:09:56.357Z',
  'food-138': '2026-11-01T06:09:56.357Z',
  'food-139': '2026-11-01T06:09:56.357Z',
  'food-140': '2026-11-01T06:09:56.357Z',
  'food-141': '2026-11-01T06:09:56.357Z',
  'food-142': '2026-11-01T06:09:56.357Z',
  'food-143': '2026-11-01T06:09:56.357Z',
  'food-144': '2026-11-01T06:09:56.357Z',
  'food-145': '2026-11-01T06:09:56.357Z',
  'food-146': '2026-11-01T06:09:56.357Z',
  'food-147': '2026-11-01T06:09:56.357Z',
  'food-148': '2026-11-01T06:09:56.357Z',
  'food-149': '2026-11-01T06:09:56.357Z',
  'food-150': '2026-11-01T06:09:56.357Z',
  'food-151': '2026-11-01T06:09:56.357Z',
  'food-152': '2026-11-01T06:09:56.357Z',
  'food-153': '2026-11-01T06:09:56.357Z',
  'food-154': '2026-11-01T06:09:56.357Z',
  'food-155': '2026-11-01T06:09:56.357Z',
  'food-156': '2026-11-01T06:09:56.357Z',
  'food-157': '2026-11-01T06:09:56.357Z',
  'food-158': '2026-11-01T06:09:56.357Z',
  'food-159': '2026-11-01T06:09:56.357Z',
  'food-160': '2026-11-01T06:09:56.357Z',
  'food-161': '2026-11-01T06:09:56.357Z',
  'food-162': '2026-11-01T06:09:56.357Z',
  'food-163': '2026-11-01T06:09:56.357Z',
  'food-164': '2026-11-01T06:09:56.357Z',
  'food-165': '2026-11-01T06:09:56.357Z',
  'food-166': '2026-11-01T06:09:56.357Z',
  'food-167': '2026-11-01T06:09:56.357Z',
  'food-168': '2026-11-01T06:09:56.357Z',
  'food-169': '2026-11-01T06:09:56.357Z',
  'food-170': '2026-11-01T06:09:56.357Z',
  'food-171': '2026-11-01T06:09:56.357Z',
  'food-172': '2026-11-01T06:09:56.357Z',
  'food-173': '2026-11-01T06:09:56.357Z',
  'food-174': '2026-11-01T06:09:56.357Z',
  'food-175': '2026-11-01T06:09:56.357Z',
  'food-176': '2026-11-01T06:09:56.357Z',
  'food-177': '2026-11-01T06:09:56.357Z',
  'food-178': '2026-11-01T06:09:56.357Z',
  'food-179': '2026-11-01T06:09:56.357Z',
  'food-180': '2026-11-01T06:09:56.357Z',
  'food-181': '2026-11-01T06:09:56.357Z',
  'food-182': '2026-11-01T06:09:56.357Z',
  'food-183': '2026-11-01T06:09:56.357Z',
  'food-184': '2026-11-01T06:09:56.357Z',
  'food-185': '2026-11-01T06:09:56.357Z',
  'food-186': '2026-11-01T06:09:56.357Z',
  'food-187': '2026-11-01T06:09:56.357Z',
  'food-188': '2026-11-01T06:09:56.357Z',
  'food-189': '2026-11-01T06:09:56.357Z',
  'food-190': '2026-11-01T06:09:56.357Z',
  'food-191': '2026-11-01T06:09:56.357Z',
  'food-192': '2026-11-01T06:09:56.357Z',
  'food-193': '2026-11-01T06:09:56.357Z',
  'food-194': '2026-11-01T06:09:56.357Z',
  'food-195': '2026-11-01T06:09:56.357Z',
  'food-196': '2026-11-01T06:09:56.357Z',
  'food-197': '2026-11-01T06:09:56.357Z',
  'food-198': '2026-11-01T06:09:56.357Z',
  'food-199': '2026-11-01T06:09:56.357Z',
  'food-200': '2026-11-01T06:09:56.357Z',
};

export interface AuthModalInitialView {
  mode: 'main' | 'email';
  emailTab: 'register' | 'login';
  requireEmailForVip?: boolean;
}

/**
 * Deterministic lightweight FNV-1a 32-bit hex signature for photo revision ledger & cache-busting.
 */
export const computeFastPhotoSignature = (input?: string): string => {
  if (!input || typeof input !== 'string') return '0';
  let h = 0x811c9dc5;
  const len = input.length;
  // Sample prefix + middle + suffix + full length for huge base64 strings in O(1), or full scan for <=4096 chars
  if (len <= 4096) {
    for (let i = 0; i < len; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  } else {
    const midStart = Math.max(0, (len >> 1) - 512);
    const tailStart = Math.max(0, len - 1024);
    for (let i = 0; i < 1024; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    for (let i = midStart; i < midStart + 1024; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    for (let i = tailStart; i < len; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= len;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
};

/**
 * Strictly audited, 100%-verified unique authentic shop photos in `public/Shop/`.
 * Every entry below has been visually verified to belong exclusively to that exact restaurant.
 * All other seed restaurants default to `""` and render the neutral `<DefaultShopIcon />` until a verified shop photo is uploaded.
 */
export const VERIFIED_SEED_SHOP_PHOTO_MAP: Record<string, string> = {
  'rest-1': '/Shop/rest-1.jpg',
  'rest-2': '/Shop/rest-2.jpg',
  'rest-5': '/Shop/rest-5.jpg',
  'rest-7': '/Shop/rest-7.jpg',
  'rest-8': '/Shop/rest-8.jpg',
  'rest-9': '/Shop/rest-9.jpg',
  'rest-10': '/Shop/rest-10.jpg',
  'rest-11': '/Shop/rest-11.jpg',
  'rest-12': '/Shop/rest-12.jpg',
  'rest-13': '/Shop/rest-13.jpg',
  'rest-15': '/Shop/rest-15.jpg',
  'rest-18': '/Shop/rest-18.jpg',
  'rest-20': '/Shop/rest-20.jpg',
  'rest-21': '/Shop/rest-21.jpg',
  'rest-25': '/Shop/rest-25.jpg',
};

/**
 * Clean, neutral vector storefront SVG data-URI used only where a standalone image URL string is required
 * (e.g., system notifications) when a shop does not yet have a verified photo. Never displays another shop's photo.
 */
export const NEUTRAL_DEFAULT_SHOP_ICON_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">' +
      '<rect width="120" height="120" rx="24" fill="#0F2922"/>' +
      '<rect x="6" y="6" width="108" height="108" rx="19" stroke="#10B981" stroke-opacity="0.28" stroke-width="2"/>' +
      '<path d="M30 46L36 32H84L90 46" stroke="#34D399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M28 46H92V51C92 55.4183 88.4183 59 84 59C79.5817 59 76 55.4183 76 51C76 55.4183 72.4183 59 68 59C63.5817 59 60 55.4183 60 51C60 55.4183 56.4183 59 52 59C47.5817 59 44 55.4183 44 51C44 55.4183 40.4183 59 36 59C31.5817 59 28 55.4183 28 51V46Z" fill="#065F46" stroke="#34D399" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M35 59V86H85V59" stroke="#A7F3D0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="52" y="68" width="16" height="18" rx="2" stroke="#FBBF24" stroke-width="3.5"/>' +
      '<line x1="28" y1="86" x2="92" y2="86" stroke="#34D399" stroke-width="4" stroke-linecap="round"/>' +
    '</svg>'
  );

/**
 * Strictly validate and sanitize a restaurant's shop image URL so that:
 * 1. Cloned, duplicated, unrelated scenery/beach, or another shop's `/Shop/rest-*.jpg` image is NEVER assigned.
 * 2. `/Shop/culinary-placeholder.jpg`, `/foods/...`, `/restaurants/...`, and generic stock URLs are rejected (`""`).
 * 3. Only the 16 verified `/Shop/rest-*.jpg` pairs (for their exact `restaurantId`) or genuine custom/cloud uploads are kept.
 */
export const sanitizeRestaurantShopPhoto = (
  restaurantId?: string | null,
  rawUrl?: string | null
): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/svg+xml')) return '';

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('/foods/') ||
    lower.startsWith('/restaurants/') ||
    lower.includes('culinary-placeholder.jpg') ||
    lower.includes('unsplash.com') ||
    lower.includes('loremflickr.com') ||
    lower.includes('picsum.photos') ||
    lower.includes('themealdb.com') ||
    lower.includes('placehold.co') ||
    lower.includes('via.placeholder.com')
  ) {
    return '';
  }

  const noQuery = trimmed.split('?')[0].split('#')[0];
  const isCloudStorage = noQuery.includes('/storage/v1/object/');
  const shopMatch = !isCloudStorage ? noQuery.match(/(\/Shop\/[^/]+)$/i) : null;
  if (shopMatch || noQuery.startsWith('/Shop/') || noQuery.startsWith('/shop/')) {
    const shopFile = (shopMatch ? shopMatch[1] : noQuery).replace(/^\/shop\//i, '/Shop/');
    const normId = (restaurantId || '').trim();
    if (/^\/Shop\/rest-chumnor-kbal-koh-[a-z0-9-]+\.jpg$/i.test(shopFile)) {
      return /chumnor|kbal-koh/i.test(normId) ? shopFile : '';
    }
    const verifiedPath = normId ? VERIFIED_SEED_SHOP_PHOTO_MAP[normId] : undefined;
    return verifiedPath && verifiedPath === shopFile ? verifiedPath : '';
  }

  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('capacitor://')
  ) {
    return trimmed;
  }

  return '';
};

export const sanitizeRestaurantGalleryPhotos = (
  restaurantId?: string | null,
  urls?: string[] | null,
  primaryPhoto?: string | null
): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();
  const cleanPrimary = sanitizeRestaurantShopPhoto(restaurantId, primaryPhoto);
  if (cleanPrimary) {
    seen.add(cleanPrimary);
    result.push(cleanPrimary);
  }
  if (Array.isArray(urls)) {
    for (const u of urls) {
      const clean = sanitizeRestaurantShopPhoto(restaurantId, u);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        result.push(clean);
      }
    }
  }
  return result;
};

/**
 * Resolve any Food, Shop, or Destination photo URL with an always-fresh build + update cache-buster
 * so Android WebView and browser HTTP caches never display outdated static or cloud-hosted pictures.
 */
export const resolveFoodPhotoUrl = (photoUrl?: string, photoUpdatedAt?: string): string => {
  if (!photoUrl || typeof photoUrl !== 'string') return '';
  const trimmed = photoUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  const revSuffix = photoUpdatedAt ? `_${computeFastPhotoSignature(photoUpdatedAt)}` : '';
  if (
    trimmed.startsWith('/foods/') ||
    trimmed.startsWith('/Shop/') ||
    trimmed.startsWith('/destinations/')
  ) {
    const basePath = trimmed.split('?')[0];
    return `${basePath}?v=${APP_BUILD_CODE}${revSuffix}`;
  }
  if (
    (trimmed.startsWith('https://') || trimmed.startsWith('http://')) &&
    trimmed.includes('/storage/v1/object/public/') &&
    photoUpdatedAt &&
    !trimmed.includes('v=')
  ) {
    const sep = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${sep}v=${APP_BUILD_CODE}${revSuffix}`;
  }
  return trimmed;
};

/**
 * Verify that the signed-in user possesses a genuine, authenticated email account
 * (strictly excluding guest sessions, empty emails, placeholder domains, and phone-only synthetic accounts).
 */
export const hasAuthenticatedEmailAccount = (user?: Partial<User> | null): boolean => {
  if (!user || typeof user !== 'object') return false;
  const rawUser = user as Record<string, unknown>;
  if (rawUser.isGuest === true || rawUser.role === 'guest' || rawUser.authProvider === 'guest') {
    return false;
  }
  if (typeof user.id === 'string' && (user.id === 'guest' || user.id.startsWith('guest-'))) {
    return false;
  }
  if (typeof user.email !== 'string') return false;
  const trimmed = user.email.trim().toLowerCase();
  if (!trimmed || trimmed.length < 5) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return false;
  if (
    trimmed.endsWith('@phone.kh') ||
    trimmed.endsWith('@user.kh') ||
    trimmed.endsWith('@guest.local') ||
    trimmed.endsWith('@guest.kh') ||
    trimmed.endsWith('@local') ||
    trimmed.endsWith('@placeholder.local') ||
    trimmed.endsWith('@placeholder.com') ||
    trimmed.endsWith('@temp.local') ||
    trimmed.endsWith('@test.local') ||
    trimmed.endsWith('@invalid.local') ||
    trimmed.endsWith('@noreply.local') ||
    trimmed.endsWith('@anonymous.local') ||
    trimmed.endsWith('@example.com') ||
    trimmed.endsWith('@example.org') ||
    trimmed.endsWith('@example.net')
  ) {
    return false;
  }
  const [localPart, domainPart] = trimmed.split('@');
  if (
    /^\+?\d{6,}$/.test(localPart || '') &&
    (domainPart?.endsWith('.kh') || domainPart?.endsWith('.local'))
  ) {
    return false;
  }
  if (
    user.authProvider === 'phone' &&
    (!Array.isArray(user.linkedProviders) ||
      (!user.linkedProviders.includes('email') && !user.linkedProviders.includes('google')))
  ) {
    return false;
  }
  return true;
};

export type LocationVerificationStatus = 'verified' | 'needs_admin_review';

export interface GoogleMapsPlaceMetadata {
  placeId: string;
  fetchedAt: string;
  originalName: string;
  formattedAddress: string;
  province: string;
  latitude: number;
  longitude: number;
  googleMapsUri: string;
  rating?: number;
  userRatingCount?: number;
  phone?: string;
  websiteUri?: string;
  openHours?: string;
  photoUrls?: string[];
  photoAttributions?: string[];
  hasOfficialGooglePhoto?: boolean;
  types?: string[];
}

export interface DeletedUserRecord {
  id: string;
  email: string;
  phone?: string;
  username?: string;
  name: string;
  deletedAt: string;
  deletedBy: string;
  permanentlyDeleted?: boolean;
  snapshotUser?: User;
}

export const VIP_ANNUAL_PRICE_USD = 6.99;
export const VIP_SUBSCRIPTION_DAYS = 60;
export const VIP_QUARTERLY_PRICE_USD = 4.99;
export const VIP_QUARTERLY_DAYS = 30;
export const DEFAULT_ADDITIONAL_STORE_FEE_USD = 5.0;
export const DEFAULT_INCLUDED_FREE_STORES = 1;

export type VipPlanType = 'quarterly' | 'annual';

export interface VipPlanConfig {
  id: VipPlanType;
  nameEn: string;
  nameKh: string;
  priceUsd: number;
  durationDays: number;
  labelEn: string;
  labelKh: string;
  priceKhrDisplay?: string;
}

export const VIP_PLANS: Record<'quarterly' | 'annual', VipPlanConfig> = {
  quarterly: {
    id: 'quarterly',
    nameEn: 'VIP 1 Month (30 Days)',
    nameKh: 'VIP ១ ខែ (30 ថ្ងៃ)',
    priceUsd: VIP_QUARTERLY_PRICE_USD,
    durationDays: VIP_QUARTERLY_DAYS,
    labelEn: `VIP 1 Month / ${VIP_QUARTERLY_DAYS} Days ($${VIP_QUARTERLY_PRICE_USD.toFixed(2)} USD)`,
    labelKh: `VIP ១ ខែ / ${VIP_QUARTERLY_DAYS} ថ្ងៃ ($${VIP_QUARTERLY_PRICE_USD.toFixed(2)} USD)`,
    priceKhrDisplay: `${Math.round(VIP_QUARTERLY_PRICE_USD * 4100).toLocaleString()} រៀល`
  },
  annual: {
    id: 'annual',
    nameEn: 'VIP 2 Months (60 Days)',
    nameKh: 'VIP ២ ខែ (60 ថ្ងៃ)',
    priceUsd: VIP_ANNUAL_PRICE_USD,
    durationDays: VIP_SUBSCRIPTION_DAYS,
    labelEn: `VIP 2 Months / ${VIP_SUBSCRIPTION_DAYS} Days ($${VIP_ANNUAL_PRICE_USD.toFixed(2)} USD)`,
    labelKh: `VIP ២ ខែ / ${VIP_SUBSCRIPTION_DAYS} ថ្ងៃ ($${VIP_ANNUAL_PRICE_USD.toFixed(2)} USD)`,
    priceKhrDisplay: `${Math.round(VIP_ANNUAL_PRICE_USD * 4100).toLocaleString()} រៀល`
  }
};

export type Language = 'km' | 'en' | 'zh';

export type UserRole = 'user' | 'owner' | 'admin';

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone?: string;
  bio?: string;
  restaurantName?: string;
  passwordHash?: string;
  isVerified?: boolean;
  verifiedAt?: string;
  authProvider?: 'google' | 'phone' | 'email';
  linkedProviders?: ('google' | 'phone' | 'email')[];
  createdAt: string;
  registeredAtIso?: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
  googleSub?: string;
  legacyIds?: string[];

  // Premium VIP Subscription ($2.99 for 10 days or $4.99 for 90 days, configurable by Admin)
  membershipTier?: 'free' | 'premium_vip';
  subscriptionStartDate?: string;
  subscriptionExpiryDate?: string;
  subscriptionStatus?: 'active' | 'expired' | 'pending' | 'cancelled';
  paymentStatus?: 'verified' | 'pending_verification' | 'needs_more_info' | 'failed' | 'cancelled' | 'paid_pending_approval' | 'waiting_for_payment';
  paymentMethod?: 'GooglePlayBilling' | 'KHQR' | 'Bakong' | 'Card' | 'Manual' | 'BankTransfer';
  transactionRef?: string;
  autoRenew?: boolean;
  vipCancelledAt?: string;
  isDisabled?: boolean;
  disabledAt?: string;
  restoredAt?: string;

  // Additional Store Slots purchased beyond the 1st free VIP store ($10 per additional store)
  paidAdditionalStoreSlots?: number;
  additionalStorePaymentIds?: string[];

  // Connected Social Accounts (TikTok & Facebook)
  socialAccounts?: UserSocialAccounts;

  // Anti-Tamper & Security Integrity Seal
  integritySeal?: string;
  vipStatus?: 'active' | 'expired' | 'none';
  vipPlanType?: string;
  vipExpiresAt?: string;
  approvedStoresCount?: number;
}

export interface ConnectedSocialAccount {
  connected: boolean;
  username: string;
  handle?: string;
  displayName: string;
  avatarUrl?: string;
  profileUrl?: string;
  connectedAt?: string;
  followersCount?: string;
}

export interface UserSocialAccounts {
  tiktok?: ConnectedSocialAccount;
  facebook?: ConnectedSocialAccount;
}

export interface VipBenefitItem {
  id: number;
  titleKh: string;
  titleEn: string;
  descriptionKh: string;
  descriptionEn: string;
  descKh?: string;
  descEn?: string;
  iconName?: string;
  category?: 'profile' | 'promotion' | 'reach' | 'analytics';
}

export const TEN_VIP_BENEFITS: VipBenefitItem[] = [
  {
    id: 1,
    titleKh: 'ទម្រង់ហាងកម្រិតខ្ពស់',
    titleEn: 'Enhanced Restaurant Profile',
    descriptionKh: 'កែប្រែទម្រង់ហាងជាមួយ Theme មាស និងផ្លាកសញ្ញាបញ្ជាក់ផ្លូវការ Iconic VIP',
    descriptionEn: 'Customized golden theme, verified iconic badge, and custom branding for your restaurant.',
    iconName: 'Sparkles',
    category: 'profile'
  },
  {
    id: 2,
    titleKh: 'រូបថតច្រើនសន្លឹក និងមុខម្ហូបរហូតដល់ ២០ មុខ',
    titleEn: 'More Food Photos & Menu Items',
    descriptionKh: 'បង្ហោះមុខម្ហូបក្នុងបញ្ជីបានរហូតដល់ ២០ មុខ ព្រមទាំងរូបថត Gallery ច្រើនសន្លឹក',
    descriptionEn: 'Add up to 20 menu items (free accounts limited to 5) with high-res photo gallery.',
    iconName: 'UtensilsCrossed',
    category: 'profile'
  },
  {
    id: 3,
    titleKh: 'បង្ហោះវីដេអូផ្សព្វផ្សាយម្ហូប',
    titleEn: 'Food Promotional Video Uploads',
    descriptionKh: 'ភ្ជាប់វីដេអូផ្សព្វផ្សាយម្ហូប YouTube, TikTok ឬ MP4 លើទំព័រហាងផ្ទាល់',
    descriptionEn: 'Embed promotional video clips (YouTube, TikTok, MP4) directly on restaurant cards.',
    iconName: 'Video',
    category: 'promotion'
  },
  {
    id: 4,
    titleKh: 'ផ្លាកសញ្ញា VIP ពណ៌មាស',
    titleEn: 'Premium VIP Badge',
    descriptionKh: 'បង្ហាញផ្លាកសញ្ញា VIP ពណ៌មាសលើកម្រង Profile, Comments និងកាតហាង',
    descriptionEn: 'Distinguished golden VIP badge on your profile, comments, reviews, and restaurant listings.',
    iconName: 'Crown',
    category: 'profile'
  },
  {
    id: 5,
    titleKh: 'ទីតាំងផ្សព្វផ្សាយលើទំព័រដើម',
    titleEn: 'Additional Promotional Placement',
    descriptionKh: 'ទទួលបានការផ្សព្វផ្សាយលើគេក្នុងទំព័រដើម Home Screen និងបញ្ជី Top Recommended',
    descriptionEn: 'Prime featured spot on the home page carousel and top recommendations section.',
    iconName: 'Flame',
    category: 'promotion'
  },
  {
    id: 6,
    titleKh: 'ទីតាំងលេចធ្លោលើផែនទី',
    titleEn: 'Restaurant Location on the Map',
    descriptionKh: 'សម្គាល់ទីតាំងហាងដោយ Pin ពណ៌មាសលើផែនទី GPS និងប៊ូតុងនាំផ្លូវ 1-Tap Directions',
    descriptionEn: 'Highlighted golden map pin with instant turn-by-turn navigation for visitors.',
    iconName: 'MapPin',
    category: 'reach'
  },
  {
    id: 7,
    titleKh: 'ប៊ូតុងទំនាក់ទំនងរហ័ស',
    titleEn: 'Quick Contact Buttons',
    descriptionKh: 'ប៊ូតុងទាក់ទងរហ័ស ហៅទូរស័ព្ទ (Call), Telegram និង Facebook ដោយផ្ទាល់លើកាតហាង',
    descriptionEn: 'One-tap direct contact buttons for Phone Call, Telegram chat, and Facebook page.',
    iconName: 'Zap',
    category: 'reach'
  },
  {
    id: 8,
    titleKh: 'ស្ថិតិអ្នកចូលមើលហាង',
    titleEn: 'Profile View & Contact Click Statistics',
    descriptionKh: 'ផ្ទាំងគ្រប់គ្រងមើលចំនួនអ្នកទស្សនាហាង ចំនួនអ្នកចុច Call និងចំនួនអ្នកចុច Map',
    descriptionEn: 'Detailed real-time analytics dashboard on visitor views, calls, and direction clicks.',
    iconName: 'BarChart3',
    category: 'analytics'
  },
  {
    id: 9,
    titleKh: 'តំណភ្ជាប់ចែករំលែកទំព័រហាង',
    titleEn: 'Shareable Restaurant Profile Link',
    descriptionKh: 'តំណភ្ជាប់ Deep Link ផ្ទាល់ខ្លួន ចម្លង និងចែករំលែកទៅបណ្តាញសង្គម Telegram និង Facebook',
    descriptionEn: 'Direct custom deep-link to share your profile across Telegram, Facebook, and WhatsApp.',
    iconName: 'Share2',
    category: 'reach'
  },
  {
    id: 10,
    titleKh: 'អាទិភាពខ្ពស់ក្នុងការស្វែងរក',
    titleEn: 'Improved Search Visibility & Priority Ranking',
    descriptionKh: 'ទទួលបានអាទិភាពបង្ហាញលើគេពេលអតិថិជនស្វែងរកមុខម្ហូប និងឈ្មោះហាងក្នុងកម្មវិធី',
    descriptionEn: 'Algorithm boost ensuring your listings appear at the top of search and filter queries.',
    iconName: 'Search',
    category: 'promotion'
  }
];

export type FoodCategorySlug = 
  | 'soup' 
  | 'grilled' 
  | 'stirfry' 
  | 'salad' 
  | 'dessert' 
  | 'cake'
  | 'noodles' 
  | 'rice' 
  | 'specialty'
  | 'streetfood'
  | 'drink';

export interface Ingredient {
  nameKh: string;
  nameEn: string;
  amount: string;
}

export interface CookingStep {
  stepNumber: number;
  instructionKh: string;
  instructionEn: string;
  tipKh?: string;
}

export interface FoodItem {
  id: string;
  nameKh: string;
  nameEn: string;
  categorySlug: FoodCategorySlug;
  categoryKh: string;
  categoryEn: string;
  descriptionKh: string;
  descriptionEn: string;
  photoUrl: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  calories?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priceRiel: number;
  priceUsd: number;
  ingredients: Ingredient[];
  steps: CookingStep[];
  rating: number;
  reviewCount: number;
  provinceKh?: string;
  provinceEn?: string;
  isFeatured?: boolean;
  imageAuditStatus?: 'verified' | 'replaced' | 'flagged_review';
  imageAuditNote?: string;
  originalPhotoUrl?: string;
  isCustomPhoto?: boolean;
  photoUpdatedAt?: string;
  googlePlaceId?: string;
  dataSource?: 'seed' | 'admin' | 'google_maps';
  googleMapsMeta?: GoogleMapsPlaceMetadata;
  isAdminEdited?: boolean;
  adminEditedAt?: string;
  locationVerificationStatus?: LocationVerificationStatus;
  locationNeedsReview?: boolean;
  locationReviewNote?: string;
  locationVerifiedAt?: string;
}

export type KhmerFoodPrimaryGroup = 'samlor' | 'cha' | 'sngor' | 'bong_aem';

export interface KhmerFoodPrimaryCategoryMeta {
  id: KhmerFoodPrimaryGroup;
  order: number;
  nameKh: string;
  shortNameKh: string;
  nameEn: string;
  subtitleKh: string;
  subtitleEn: string;
  emoji: string;
}

export const KHMER_FOOD_PRIMARY_CATEGORIES: KhmerFoodPrimaryCategoryMeta[] = [
  {
    id: 'samlor',
    order: 1,
    nameKh: 'សម្ល និងការី',
    shortNameKh: 'សម្ល',
    nameEn: 'Samlor & Curries',
    subtitleKh: 'សម្លខ្មែរ សម្លកកូរ សម្លការី សម្លម្ជូរ អាម៉ុក ប្រហុកខ្ទិះ និងខ',
    subtitleEn: 'Traditional Khmer Samlor, Curries, Amok, Stews & Braised Dishes',
    emoji: '🍲'
  },
  {
    id: 'cha',
    order: 2,
    nameKh: 'ឆា អាំង និងញាំ',
    shortNameKh: 'ឆា',
    nameEn: 'Stir-Fry & Savory',
    subtitleKh: 'ម្ហូបឆា ឡុកឡាក់ ឆាគ្រឿង ឆាក្តៅ មីឆា បាយឆា និងម្ហូបអាំង/ញាំ',
    subtitleEn: 'Wok Stir-Fries, Lok Lak, Fried Noodles/Rice, Grilled & Salads',
    emoji: '🥘'
  },
  {
    id: 'sngor',
    order: 3,
    nameKh: 'ស្ងោរ ស៊ុប និងបបរ',
    shortNameKh: 'ស្ងោរ',
    nameEn: 'Boiled Soups & Broths',
    subtitleKh: 'ស្ងោរជ្រក់ ស្ងោរម្រះ ស្ងោរង៉ាំង៉ូវ ស៊ុប បបរ និងគុយទាវទឹក',
    subtitleEn: 'Clear Boiled Soups, Herbal Broths, Hotpots, Porridges & Noodle Soups',
    emoji: '🥣'
  },
  {
    id: 'bong_aem',
    order: 4,
    nameKh: 'បង្អែម និងនំខ្មែរ',
    shortNameKh: 'បង្អែម',
    nameEn: 'Khmer Desserts & Cakes',
    subtitleKh: 'បង្អែមខ្មែរ សង់ខ្យា ចេកខ្ទិះ នំប្រពៃណីខ្មែរ និងភេសជ្ជៈផ្អែម',
    subtitleEn: 'Traditional Khmer Sweet Desserts, Custard, Pudding & Sweet Cakes',
    emoji: '🍨'
  }
];

export function classifyKhmerFoodPrimaryGroup(food: Pick<FoodItem, 'nameKh' | 'nameEn' | 'categorySlug' | 'categoryKh'>): KhmerFoodPrimaryGroup {
  const kh = (food.nameKh || '').trim();
  const en = (food.nameEn || '').toLowerCase();
  const slug = food.categorySlug;

  // 1. Check explicit prefix in Khmer name first for 100% accuracy on named dishes
  if (kh.startsWith('បង្អែម') || kh.includes('សង់ខ្យា') || kh.includes('ចេកខ្ទិះ') || kh.includes('ទឹកកកឈូស') || kh.includes('ចាហួយ') || kh.includes('បាញ់ឌុក') || kh.includes('បាញ់ចានឿក') || kh.includes('តៅហ៊ូទឹកស្ករ')) {
    return 'bong_aem';
  }
  if (kh.startsWith('ស្ងោរ') || kh.startsWith('ស៊ុប') || kh.startsWith('បបរ') || kh.includes('ស្ងោរ') || kh.includes('ង៉ាំង៉ូវ') || kh.includes('ឆ្នាំងភ្លើង') || kh.includes('យ៉ាវហន')) {
    // Exclude sweet dessert porridges like បង្អែមបបរ
    if (!kh.includes('បង្អែម') && slug !== 'dessert') {
      return 'sngor';
    }
  }
  if (kh.startsWith('សម្ល') || kh.includes('សម្ល') || kh.includes('ការី') || kh.includes('អាម៉ុក') || kh.includes('កកូរ') || kh.includes('ម្ជូរគ្រឿង') || kh.includes('ម្ជូរយួន') || kh.includes('ប្រហើរ') || kh.includes('ប្រហុកខ្ទិះ') || kh.includes('ប្រហុកគ្រឿង') || kh.includes('ប្រហុកចិញ្ច្រាំ') || kh.includes('ទឹកគ្រឿង') || kh.includes('កាពិផាវ') || kh.includes('ណាំយ៉ា') || kh.startsWith('ខ') || kh.includes('ខសាច់') || kh.includes('ខត្រី') || kh.includes('ខជើងជ្រូក') || kh.includes('ផាក់ឡូវ')) {
    return 'samlor';
  }
  if (kh.startsWith('ឆា') || kh.includes('ឆា') || kh.includes('ឡុកឡាក់')) {
    return 'cha';
  }

  // 2. Check Desserts, Drinks & Traditional Sweet Cakes
  if (slug === 'dessert' || slug === 'drink') {
    return 'bong_aem';
  }
  if (slug === 'cake') {
    // Savory street cakes like បាញ់ឆែវ, នំប៉័ងប៉ាតេ, គួង, ណែម, នំអន្សមជ្រូកចៀន go to 'cha' (savory/pan-fried), while sweet cakes go to 'bong_aem'
    if (kh.includes('បាញ់ឆែវ') || kh.includes('បាញ់ហយ') || kh.includes('នំប៉័ង') || kh.includes('គួង') || kh.includes('ណែម') || kh.includes('គូឆាយ') || kh.includes('កចាយ') || kh.includes('អន្សមជ្រូក')) {
      return 'cha';
    }
    return 'bong_aem';
  }
  if (slug === 'streetfood') {
    if (
      kh.startsWith('បង្អែម') ||
      kh.includes('ស្ករត្នោត') ||
      kh.includes('ខ្ទិះដូង') && !kh.includes('ស្លឹកខ្ទឹម') && !kh.includes('ប្រហុក') ||
      kh.includes('នំក្រូច') ||
      kh.includes('នំកង') ||
      kh.includes('នំពុម្ព') ||
      kh.includes('ក្រឡាន') ||
      kh.includes('ការ៉េម')
    ) {
      return 'bong_aem';
    }
  }

  // 3. Check Noodle dishes: noodle soups with broth go to 'sngor' or 'samlor', stir-fried noodles go to 'cha'
  if (slug === 'noodles') {
    if (kh.includes('នំបញ្ចុក')) {
      return 'samlor';
    }
    if (kh.includes('ឆា') || en.includes('fried') || en.includes('stir')) {
      return 'cha';
    }
    return 'sngor';
  }

  // 4. Check Soup categorySlug: separate Samlor/Curry from Sngor/Clear Boiled Soup
  if (slug === 'soup') {
    if (en.includes('curry') || en.includes('samlor') || en.includes('korko') || en.includes('machu') || en.includes('amok') || kh.includes('ម្ជូរ')) {
      return 'samlor';
    }
    return 'sngor';
  }

  // 5. All remaining Stir-fry, Grilled, Pan-fried, Rice, Salads -> 'cha'
  return 'cha';
}

export function getFoodSubGroupSortKey(food: FoodItem, group: KhmerFoodPrimaryGroup): string {
  const kh = (food.nameKh || '').trim();
  if (group === 'samlor') {
    if (kh.startsWith('សម្ល')) return `1_${kh}`;
    if (kh.includes('ការី') || kh.includes('អាម៉ុក')) return `2_${kh}`;
    if (kh.includes('ប្រហុក') || kh.includes('ទឹកគ្រឿង') || kh.includes('កាពិ')) return `3_${kh}`;
    if (kh.startsWith('ខ') || kh.includes('ផាក់ឡូវ')) return `4_${kh}`;
    return `5_${kh}`;
  }
  if (group === 'cha') {
    if (kh.startsWith('ឆា')) return `1_${kh}`;
    if (kh.includes('ឆា') || kh.includes('ឡុកឡាក់')) return `2_${kh}`;
    if (kh.includes('អាំង') || kh.includes('ដុត') || kh.includes('បំពង') || kh.includes('ចៀន')) return `3_${kh}`;
    if (kh.includes('ញាំ') || kh.includes('ភ្លា') || kh.includes('បុក')) return `4_${kh}`;
    return `5_${kh}`;
  }
  if (group === 'sngor') {
    if (kh.startsWith('ស្ងោរ')) return `1_${kh}`;
    if (kh.includes('ស្ងោរ')) return `2_${kh}`;
    if (kh.startsWith('ស៊ុប') || kh.includes('ឆ្នាំងភ្លើង')) return `3_${kh}`;
    if (kh.startsWith('បបរ')) return `4_${kh}`;
    return `5_${kh}`;
  }
  // bong_aem
  if (kh.startsWith('បង្អែម')) return `1_${kh}`;
  if (kh.includes('សង់ខ្យា') || kh.includes('ចេកខ្ទិះ') || kh.includes('បាញ់ឌុក')) return `2_${kh}`;
  if (kh.startsWith('នំ')) return `3_${kh}`;
  return `4_${kh}`;
}

export function organizeAndDeduplicateFoods(items: FoodItem[]): FoodItem[] {
  const byId = new Map<string, FoodItem>();
  const byNormName = new Map<string, FoodItem>();

  for (const raw of items) {
    if (!raw || !raw.id || !raw.nameKh) continue;
    const normKh = raw.nameKh.replace(/\s+/g, '').trim();
    const existingById = byId.get(raw.id);
    const existingByName = byNormName.get(normKh);
    const existing = existingById || existingByName;

    if (!existing) {
      byId.set(raw.id, raw);
      byNormName.set(normKh, raw);
    } else {
      // Prefer item with custom Admin photo or newer photoUpdatedAt
      const keepNew =
        (raw.isCustomPhoto && !existing.isCustomPhoto) ||
        (raw.photoUpdatedAt && (!existing.photoUpdatedAt || raw.photoUpdatedAt > existing.photoUpdatedAt));
      if (keepNew) {
        byId.delete(existing.id);
        byId.set(raw.id, raw);
        byNormName.set(normKh, raw);
      }
    }
  }

  const groupOrder: Record<KhmerFoodPrimaryGroup, number> = {
    samlor: 1,
    cha: 2,
    sngor: 3,
    bong_aem: 4
  };

  return Array.from(byId.values()).sort((a, b) => {
    const ga = classifyKhmerFoodPrimaryGroup(a);
    const gb = classifyKhmerFoodPrimaryGroup(b);
    if (groupOrder[ga] !== groupOrder[gb]) {
      return groupOrder[ga] - groupOrder[gb];
    }
    const ka = getFoodSubGroupSortKey(a, ga);
    const kb = getFoodSubGroupSortKey(b, gb);
    return ka.localeCompare(kb, 'km');
  });
}

export type RestaurantPriceLevel = '$' | '$$' | '$$$' | '$$$$';

export type PaymentStatus = 'unpaid' | 'pending_verification' | 'verified' | 'rejected' | 'waived' | 'free_trial';

export type MembershipTier = 'free' | 'premium';

export interface RestaurantMenuItem {
  id: string;
  restaurantId: string;
  nameKh: string;
  nameEn?: string;
  priceRiel: number;
  priceUsd: number;
  photoUrl: string;
  descriptionKh?: string;
  descriptionEn?: string;
  categoryKh?: string;
  isAvailable?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface RestaurantReview {
  id: string;
  restaurantId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  comment?: string;
  createdAt: string;
}

export interface AbaVerificationCheckItem {
  passed: boolean;
  expected: string;
  detected: string;
  reasonKh: string;
  reasonEn: string;
}

export interface AbaReceiptVerificationReport {
  status: 'verified' | 'flagged_manual_review' | 'rejected_mismatch';
  canAutoApprove: boolean;
  verifiedAt: string;
  verificationMethod: 'hybrid_ai_and_transaction' | 'deterministic_transaction_and_ocr' | 'manual_fallback';
  confidenceScore: number;
  summaryKh: string;
  summaryEn: string;
  extractedReceipt?: {
    isAbaReceipt: boolean;
    trxId?: string;
    amountUsd?: number;
    currency?: string;
    recipientName?: string;
    recipientAccount?: string;
    transactionDate?: string;
    senderName?: string;
    rawOcrText?: string;
  };
  checks: {
    trxId: AbaVerificationCheckItem;
    amount: AbaVerificationCheckItem;
    date: AbaVerificationCheckItem;
    recipient: AbaVerificationCheckItem;
    antiReplay: AbaVerificationCheckItem;
  };
}

export type TransactionType = 'restaurant_registration' | 'user_vip_upgrade' | 'additional_store_slot';

export interface RegistrationTransaction {
  id: string; // e.g. "TXN-20261020-001", "TXN-VIP-20261021-001", or "TXN-STORE-20261024-001"
  type?: TransactionType;
  restaurantId?: string;
  restaurantNameKh?: string;
  restaurantNameEn?: string;
  ownerId?: string;
  ownerName?: string;
  ownerPhone?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  planType?: 'quarterly' | 'annual' | 'additional_store';
  storeSlotNumber?: number;
  amountUsd: number;
  currency?: 'USD' | 'KHR';
  durationDays?: number; // e.g. 10 or 90 days (configurable by Admin)
  membershipTier?: 'premium' | 'premium_vip';
  status: 'pending_verification' | 'verified' | 'rejected' | 'needs_more_info' | 'failed' | 'cancelled';
  paymentMethod: 'KHQR' | 'Bakong' | 'BankTransfer' | 'Manual' | 'GooglePlayBilling' | 'Card';
  transactionRef: string;
  paymentProofUrl?: string;
  paymentProofUploadedAt?: string;
  paymentProofFileName?: string;
  paymentProofMimeType?: string;
  adminRequestNote?: string;
  paymentToken?: string;
  verificationSignature?: string;
  createdAt: string;
  expiresAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
  aiVerificationReport?: AbaReceiptVerificationReport;
}

export type AiStoreCategoryDecision = 'approved' | 'pending_review' | 'rejected';

export type DetectedBusinessSubCategory =
  | 'restaurant'
  | 'food_stall'
  | 'cafe_bakery_dessert'
  | 'noodle_rice_soup_eatery'
  | 'grocery_raw_goods'
  | 'clothing_fashion'
  | 'electronics_mobile'
  | 'cosmetics_salon'
  | 'pharmacy_medical'
  | 'hardware_construction'
  | 'auto_motorcycle'
  | 'real_estate_finance'
  | 'non_food_other'
  | 'uncertain_ambiguous';

export interface AiStoreCategoryVerificationReport {
  decision: AiStoreCategoryDecision;
  isFoodBusiness: boolean;
  detectedCategory: DetectedBusinessSubCategory;
  detectedType?: string;
  detectedCategoryLabelKh: string;
  detectedCategoryLabelEn: string;
  confidenceScore: number; // 0 to 100
  isBypassAttempt: boolean;
  reasonKh: string;
  reasonEn: string;
  matchedFoodSignals: string[];
  flaggedNonFoodSignals: string[];
  photoAnalysisSummaryKh: string;
  photoAnalysisSummaryEn: string;
  verificationToken: string;
  verifiedAt: string;
  verifiedByModel: 'hybrid_gemini_and_rules_v1' | 'deterministic_semantic_guard_v1' | 'admin_manual_override';
}

export interface ShopPhotoReplacementRequest {
  newPhotoUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  adminDecision?: 'approved' | 'rejected';
  rejectionReason?: string;
  submittedByUserId?: string;
  submittedByName?: string;
}

export interface Restaurant {
  id: string;
  nameKh: string;
  nameEn: string;
  subtitle?: string;
  categoryKh?: string;
  categoryEn?: string;
  descriptionKh: string;
  descriptionEn: string;
  photoUrl: string;
  profileImage?: string; // Shop Profile Picture (Logo / Storefront)
  galleryPhotos?: string[];
  foodImages?: string[]; // Multiple Food Photos uploaded by shop owner
  addressKh: string;
  addressEn: string;
  provinceKh: string;
  provinceEn: string;
  phone: string;
  openingHoursKh: string;
  openingHoursEn: string;
  priceLevel: RestaurantPriceLevel;
  mapUrl: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  reviews?: RestaurantReview[];
  signatureDishesKh: string[];
  signatureDishesEn?: string[];
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  status: 'approved' | 'pending' | 'rejected';
  isVerified: boolean;
  isFeatured?: boolean;
  
  // Membership & Menu Items ($0 Free Listing vs VIP $2.99/30d or $4.99/90d)
  membershipTier?: MembershipTier; // 'free' ($0) or 'premium' ($2.99 / $4.99)
  membershipExpiresAt?: string; // ISO 8601 date timestamp (30 or 90 days from activation)
  subscriptionExpiresAt?: string;
  menuItems?: RestaurantMenuItem[]; // Up to 20 items for active Premium restaurants
  
  // 10 VIP Benefits tracking & Analytics
  analytics?: {
    views?: number;
    phoneClicks?: number;
    mapClicks?: number;
    shareClicks?: number;
  };
  
  // VIP 10 Benefits Media & Quick Contacts
  promoVideoUrl?: string; // YouTube, TikTok, or direct MP4 video link
  telegramUrl?: string;
  facebookUrl?: string;
  websiteUrl?: string;
  businessCategory?: string;

  paymentStatus?: PaymentStatus;
  paymentTransactionId?: string;
  paymentDate?: string;
  promotionalPrice?: number;
  isPromoted?: boolean;
  isFreeTrial?: boolean;
  freeTrialExpiry?: string;
  created_at?: string;
  createdAt?: string;
  updatedAt?: string;
  isCustomPhoto?: boolean;
  photoUpdatedAt?: string;

  // Google Maps Platform Source Separation & Admin Override Protection
  googlePlaceId?: string;
  dataSource?: 'seed' | 'admin' | 'vip_owner' | 'google_maps';
  googleMapsMeta?: GoogleMapsPlaceMetadata;
  isAdminEdited?: boolean;
  adminEditedAt?: string;

  // AI Business Category Verification (Food vs Non-Food Store Gate)
  aiCategoryVerification?: AiStoreCategoryVerificationReport;

  // Store Slot & Replacement Tracking
  storeSlotNumber?: number;
  replacedFromRestaurantId?: string;
  replacedAt?: string;
  approvedAt?: string;
  featuredFromAt?: string;
  featuredUntilAt?: string;

  // Shop Photo Replacement Workflow (Pending Admin Review & Approval)
  pendingPhotoReplacement?: ShopPhotoReplacementRequest;

  // GPS & Google Maps Location Audit & Verification Status
  locationVerificationStatus?: LocationVerificationStatus;
  locationNeedsReview?: boolean;
  locationReviewNote?: string;
  locationVerifiedAt?: string;
}

// Helper to resolve original created_at ISO timestamp for chronological sorting
export const getRestaurantCreatedAtIso = (r?: Partial<Restaurant> | null): string => {
  if (!r) return '2026-01-01T00:00:00.000Z';
  const raw = r.created_at || r.createdAt;
  if (raw && typeof raw === 'string') {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  const idStr = String(r.id || '');
  const seedMatch = idStr.match(/^rest-(\d+)$/);
  if (seedMatch) {
    const n = parseInt(seedMatch[1], 10);
    if (n >= 1 && n <= 1000) {
      return new Date(Date.UTC(2026, 0, 1, 0, n, 0)).toISOString();
    }
    if (n > 1000000000000) {
      return new Date(n).toISOString();
    }
  }
  const tsMatch = idStr.match(/(\d{13})/);
  if (tsMatch) {
    const ts = parseInt(tsMatch[1], 10);
    if (!Number.isNaN(ts)) {
      return new Date(ts).toISOString();
    }
  }
  if (r.paymentDate) {
    const pd = Date.parse(r.paymentDate);
    if (!Number.isNaN(pd)) {
      return new Date(pd).toISOString();
    }
  }
  return '2026-06-01T00:00:00.000Z';
};

export const getRestaurantCreatedAtMs = (r?: Partial<Restaurant> | null): number => {
  const iso = getRestaurantCreatedAtIso(r);
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
};

// Sort restaurants in chronological order: earlier-added restaurants first, newly added restaurants afterward
export const sortRestaurantsChronologically = (list: Restaurant[]): Restaurant[] => {
  return [...list].sort((a, b) => {
    const timeDiff = getRestaurantCreatedAtMs(a) - getRestaurantCreatedAtMs(b);
    if (timeDiff !== 0) return timeDiff;
    const aNum = parseInt(String(a.id || '').replace(/\D+/g, ''), 10);
    const bNum = parseInt(String(b.id || '').replace(/\D+/g, ''), 10);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) {
      return aNum - bNum;
    }
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
};

// Helper to identify built-in seed restaurants (rest-1 to rest-9999) vs user custom/VIP restaurants (rest-<13-digit-timestamp>-... / rest-vip-...)
export const isSeedRestaurantId = (id: string | number): boolean => {
  const str = String(id || '');
  const match = str.match(/^rest-(\d+)$/);
  if (!match) return false;
  const num = parseInt(match[1], 10);
  return num >= 1 && num <= 9999;
};

export const isCustomRestaurant = (restaurant?: Restaurant | null): boolean => {
  if (!restaurant || !restaurant.id) return false;
  return !isSeedRestaurantId(restaurant.id);
};

/**
 * Strictly verified unique restaurant storefront/dining photos bundled in `public/Shop/`.
 * All other cloned/shared/mismatched `/Shop/rest-*.jpg` and `culinary-placeholder.jpg` files
 * have been purged and must render the neutral DefaultShopIcon unless a genuine custom photo is uploaded.
 */
export const STRICTLY_VERIFIED_UNIQUE_SHOP_IDS = new Set<string>(
  Object.keys(VERIFIED_SEED_SHOP_PHOTO_MAP)
);

export const sanitizeVerifiedShopPhotoUrl = (shopId?: string | number | null, rawUrl?: string | null): string =>
  sanitizeRestaurantShopPhoto(shopId != null ? String(shopId) : undefined, rawUrl);

/**
 * Validates whether a user/owner-entered URL is a genuine Google Maps link
 * (e.g. `https://maps.app.goo.gl/...`, `https://goo.gl/maps/...`, `https://www.google.com/maps/...`, `https://maps.google.com/...`).
 */
export const isValidGoogleMapsUrl = (rawUrl?: string | null): boolean => {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (host === 'maps.app.goo.gl') return parsed.pathname.length > 1;
    if (host === 'goo.gl' && path.startsWith('/maps')) return true;
    if (
      (host === 'www.google.com' ||
        host === 'google.com' ||
        host === 'maps.google.com' ||
        host.endsWith('.google.com')) &&
      (path.startsWith('/maps') || parsed.searchParams.has('q') || parsed.searchParams.has('query'))
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Extracts valid Cambodia GPS coordinates (`latitude`, `longitude`) when embedded inside a Google Maps URL.
 */
export const extractCoordsFromGoogleMapsUrl = (
  rawUrl?: string | null
): { latitude: number; longitude: number } | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  })();
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /[?&](?:query|q|destination|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
  ];
  for (const rx of patterns) {
    const m = decoded.match(rx);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (isValidCambodiaCoordinates(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }
  return null;
};

// Safe cross-platform date parser (normalizes "YYYY-MM-DD HH:mm" and "YYYY-MM-DD" across strict Android/iOS WebViews)
export const parseSafeDateMs = (raw?: string | null): number => {
  if (!raw || typeof raw !== 'string') return 0;
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  let normalized = trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    normalized = `${trimmed}T23:59:59`;
  } else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const withT = trimmed.replace(/\s+/, 'T');
    normalized = withT.length === 16 ? `${withT}:00` : withT;
  }
  const parsed = Date.parse(normalized);
  if (!Number.isNaN(parsed)) return parsed;
  const fallback = new Date(trimmed).getTime();
  return Number.isNaN(fallback) ? 0 : fallback;
};

// Helper to determine whether a restaurant has a registered app partner owner account.
// Note: ALL shops (both registered and unregistered) are displayed and fully openable inside the app by all users without VIP restrictions.
export const isGpipRegisteredRestaurant = (restaurant?: Partial<Restaurant> | null): boolean => {
  if (!restaurant || !restaurant.id) return false;
  const rId = String(restaurant.id);
  const hasRealOwner =
    Boolean(restaurant.ownerId && restaurant.ownerId !== 'owner-1' && !restaurant.ownerId.startsWith('seed-')) ||
    Boolean(restaurant.ownerEmail && restaurant.ownerEmail.trim().length > 0);

  if (restaurant.dataSource === 'vip_owner') return true;
  if (restaurant.replacedFromRestaurantId && hasRealOwner) return true;

  if (isSeedRestaurantId(rId)) {
    return hasRealOwner;
  }

  if (
    !hasRealOwner &&
    (restaurant.dataSource === 'google_maps' || rId.startsWith('gmap-') || rId.startsWith('gplace'))
  ) {
    return false;
  }

  return hasRealOwner;
};

export const isValidCambodiaCoordinates = (
  lat?: number | null,
  lng?: number | null
): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0) &&
    lat >= 9.8 &&
    lat <= 14.8 &&
    lng >= 102.3 &&
    lng <= 107.7
  );
};

/**
 * Validates whether a Google Place ID is an official Google Maps identifier
 * rather than a synthetic human-readable internal directory string.
 */
export const isValidOfficialGooglePlaceId = (placeId?: string | null): boolean => {
  if (!placeId || typeof placeId !== 'string') return false;
  const trimmed = placeId.trim();
  if (/^0x[0-9a-f]{10,20}:0x[0-9a-f]{10,20}$/i.test(trimmed)) {
    return true;
  }
  if (!/^ChIJ[A-Za-z0-9_-]{21,32}$/.test(trimmed)) {
    return false;
  }
  // Reject human-readable synthetic IDs ending with KH or containing concatenated English words
  if (/KH$/.test(trimmed)) return false;
  if (/(PhnomPenh|SiemReap|Battambang|Kampot|Kep|KienSvay|Sihanouk|Cambodia|Restaurant|Kitchen|Cafe|Pizza|Coffee)/.test(trimmed)) {
    return false;
  }
  return true;
};

export const isPlaceLocationVerified = (
  place?: {
    latitude?: number | null;
    longitude?: number | null;
    lat?: number | null;
    lng?: number | null;
    mapUrl?: string | null;
    locationNeedsReview?: boolean;
    locationVerificationStatus?: LocationVerificationStatus;
  } | null
): boolean => {
  if (!place) return false;
  if (place.locationNeedsReview === true || place.locationVerificationStatus === 'needs_admin_review') {
    return false;
  }
  const lat = typeof place.latitude === 'number' ? place.latitude : place.lat;
  const lng = typeof place.longitude === 'number' ? place.longitude : place.lng;
  if (isValidCambodiaCoordinates(lat, lng)) {
    return true;
  }
  if (isValidGoogleMapsUrl(place.mapUrl)) {
    return true;
  }
  return false;
};

/**
 * Strict runtime guardrail for Cambodia restaurants & food shops:
 * Rejects unverified, incomplete, fake, (0, 0), locationNeedsReview: true,
 * out-of-Cambodia coordinates, fake Place IDs, or missing/broken mapUrl entries so they
 * can NEVER be displayed in RestaurantView, HomeView, NearMeModal, or search results.
 */
export const isStrictVerifiedCambodiaRestaurant = (
  restaurant?: Partial<Restaurant> | null
): boolean => {
  if (!restaurant || typeof restaurant !== 'object') return false;
  if (!restaurant.id || typeof restaurant.id !== 'string') return false;
  if (restaurant.id.startsWith('food-') || restaurant.id.startsWith('dest-')) return false;
  const nameKh = (restaurant.nameKh || '').trim();
  const nameEn = (restaurant.nameEn || '').trim();
  if (!nameKh && !nameEn) return false;
  // Always display registered / user-submitted / admin-approved shops even if GPS is still pending review
  if (isGpipRegisteredRestaurant(restaurant) || restaurant.isAdminEdited) {
    return true;
  }
  if (
    restaurant.locationNeedsReview === true ||
    restaurant.locationVerificationStatus === 'needs_admin_review'
  ) {
    return false;
  }
  if (!isValidCambodiaCoordinates(restaurant.latitude, restaurant.longitude)) {
    return false;
  }
  const address = (restaurant.addressKh || restaurant.addressEn || '').trim();
  const province = (restaurant.provinceKh || restaurant.provinceEn || '').trim();
  if (!address || !province) return false;
  return true;
};

export const buildCanonicalGoogleMapsPinUrl = (
  lat: number,
  lng: number,
  googlePlaceId?: string | null
): string => {
  const latFixed = Number(lat.toFixed(6));
  const lngFixed = Number(lng.toFixed(6));
  if (isValidOfficialGooglePlaceId(googlePlaceId)) {
    const cleanId = googlePlaceId!.trim();
    if (cleanId.startsWith('0x')) {
      return `https://www.google.com/maps?q=${latFixed},${lngFixed}&ftid=${encodeURIComponent(cleanId)}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${latFixed},${lngFixed}&query_place_id=${encodeURIComponent(cleanId)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${latFixed},${lngFixed}`;
};

export const buildCanonicalGoogleMapsDirectionsUrl = (
  lat: number,
  lng: number,
  origin?: { lat: number; lng: number } | null,
  googlePlaceId?: string | null
): string => {
  const latFixed = Number(lat.toFixed(6));
  const lngFixed = Number(lng.toFixed(6));
  let url = `https://www.google.com/maps/dir/?api=1&destination=${latFixed},${lngFixed}`;
  if (origin && isValidCambodiaCoordinates(origin.lat, origin.lng)) {
    url += `&origin=${Number(origin.lat.toFixed(6))},${Number(origin.lng.toFixed(6))}`;
  }
  if (isValidOfficialGooglePlaceId(googlePlaceId) && googlePlaceId!.trim().startsWith('ChIJ')) {
    url += `&destination_place_id=${encodeURIComponent(googlePlaceId!.trim())}`;
  }
  return url;
};

export const openExternalUrlNativeSafe = (url: string): void => {
  if (!url || typeof window === 'undefined') return;
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.() && cap?.Plugins?.NativeAbaLauncher?.openExternalUrl) {
    cap.Plugins.NativeAbaLauncher.openExternalUrl({ url }).catch(() => {
      window.open(url, '_blank', 'noopener,noreferrer');
    });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const notifyUnverifiedLocationBlocked = (placeName?: string): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('kft:unverified-location-blocked', {
        detail: { placeName: placeName || '' },
      })
    );
  }
};

export const getRestaurantGoogleExternalUrl = (
  restaurant: Partial<Restaurant>,
  mode: 'search' | 'maps' | 'directions' = 'maps',
  origin?: { lat: number; lng: number } | null
): string => {
  const name = (restaurant.nameKh || restaurant.nameEn || '').trim();
  const province = (restaurant.provinceKh || restaurant.provinceEn || '').trim();
  const query = [name, province, 'Cambodia'].filter(Boolean).join(' ');

  if (mode === 'search') {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  // Strictly block unverified or flagged locations from opening incorrect/estimated map pins
  if (!isPlaceLocationVerified(restaurant)) {
    return '';
  }

  const lat = restaurant.latitude!;
  const lng = restaurant.longitude!;
  const hasValidCoords = isValidCambodiaCoordinates(lat, lng);
  const placeId = restaurant.googlePlaceId || restaurant.googleMapsMeta?.placeId;

  if (mode === 'directions') {
    if (hasValidCoords) {
      return buildCanonicalGoogleMapsDirectionsUrl(lat, lng, origin, placeId);
    }
    if (isValidGoogleMapsUrl(restaurant.mapUrl)) {
      return restaurant.mapUrl!.trim();
    }
    return '';
  }

  // Honor explicit verified Google Maps links added by Admin or Shop Owner
  if (
    (restaurant.isAdminEdited || restaurant.dataSource === 'vip_owner' || Boolean(restaurant.ownerId)) &&
    isValidGoogleMapsUrl(restaurant.mapUrl)
  ) {
    return restaurant.mapUrl!.trim();
  }

  const metaUri = restaurant.googleMapsMeta?.googleMapsUri;
  if (metaUri && metaUri.startsWith('http') && isValidOfficialGooglePlaceId(placeId)) {
    return metaUri;
  }

  if (hasValidCoords) {
    return buildCanonicalGoogleMapsPinUrl(lat, lng, placeId);
  }

  if (isValidGoogleMapsUrl(restaurant.mapUrl)) {
    return restaurant.mapUrl!.trim();
  }

  return '';
};

export const openRestaurantGoogleExternal = (
  restaurant: Partial<Restaurant>,
  mode: 'search' | 'maps' | 'directions' = 'maps',
  origin?: { lat: number; lng: number } | null
): boolean => {
  const url = getRestaurantGoogleExternalUrl(restaurant, mode, origin);
  if (!url) {
    notifyUnverifiedLocationBlocked(restaurant.nameKh || restaurant.nameEn);
    return false;
  }
  openExternalUrlNativeSafe(url);
  return true;
};

export const getDestinationGoogleExternalUrl = (
  destination: Partial<TouristDestination>,
  mode: 'maps' | 'directions' = 'maps',
  origin?: { lat: number; lng: number } | null
): string => {
  if (!isPlaceLocationVerified(destination)) {
    return '';
  }
  const lat = destination.latitude!;
  const lng = destination.longitude!;
  const placeId = destination.googlePlaceId || destination.googleMapsMeta?.placeId;

  if (mode === 'directions') {
    return buildCanonicalGoogleMapsDirectionsUrl(lat, lng, origin, placeId);
  }

  if (
    destination.isAdminEdited &&
    destination.mapUrl &&
    destination.mapUrl.includes('maps.app.goo.gl')
  ) {
    return destination.mapUrl.trim();
  }

  return buildCanonicalGoogleMapsPinUrl(lat, lng, placeId);
};

export const openDestinationGoogleExternal = (
  destination: Partial<TouristDestination>,
  mode: 'maps' | 'directions' = 'maps',
  origin?: { lat: number; lng: number } | null
): boolean => {
  const url = getDestinationGoogleExternalUrl(destination, mode, origin);
  if (!url) {
    notifyUnverifiedLocationBlocked(destination.nameKh || destination.nameEn);
    return false;
  }
  openExternalUrlNativeSafe(url);
  return true;
};

export const getTrendingFoodGoogleExternalUrl = (
  item: Partial<TrendingFoodItem>,
  mode: 'maps' | 'directions' = 'maps',
  origin?: { lat: number; lng: number } | null
): string => {
  if (!isPlaceLocationVerified(item)) {
    return '';
  }
  const lat = item.latitude!;
  const lng = item.longitude!;
  if (mode === 'directions') {
    return buildCanonicalGoogleMapsDirectionsUrl(lat, lng, origin);
  }
  return buildCanonicalGoogleMapsPinUrl(lat, lng);
};

export const openTrendingFoodGoogleExternal = (
  item: Partial<TrendingFoodItem>,
  mode: 'maps' | 'directions' = 'maps',
  origin?: { lat: number; lng: number } | null
): boolean => {
  const url = getTrendingFoodGoogleExternalUrl(item, mode, origin);
  if (!url) {
    notifyUnverifiedLocationBlocked(item.restaurantNameKh || item.foodNameKh);
    return false;
  }
  openExternalUrlNativeSafe(url);
  return true;
};

// Helper to compute genuine customer rating & review count (VIP status never inflates rating)
export const getRestaurantRatingSummary = (
  restaurant?: Partial<Restaurant> | null
): { hasReviews: boolean; averageRating: number; reviewCount: number } => {
  if (!restaurant) {
    return { hasReviews: false, averageRating: 0, reviewCount: 0 };
  }

  const genuineReviews = Array.isArray(restaurant.reviews)
    ? restaurant.reviews.filter(
        (rev) => rev && typeof rev.rating === 'number' && rev.rating >= 1 && rev.rating <= 5
      )
    : [];

  // For custom/VIP user-registered shops (not seed and not imported with Google Maps rating), ONLY genuine customer reviews count
  const isGoogleMapsImportedWithReviews =
    (restaurant.dataSource === 'google_maps' || String(restaurant.id || '').startsWith('gmap-') || Boolean(restaurant.googlePlaceId)) &&
    typeof restaurant.rating === 'number' &&
    restaurant.rating > 0 &&
    typeof restaurant.reviewCount === 'number' &&
    restaurant.reviewCount > 0;

  if (!isSeedRestaurantId(restaurant.id || '') && !isGoogleMapsImportedWithReviews) {
    if (genuineReviews.length === 0) {
      return { hasReviews: false, averageRating: 0, reviewCount: 0 };
    }
    const sum = genuineReviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = Math.round((sum / genuineReviews.length) * 10) / 10;
    return {
      hasReviews: true,
      averageRating: avg,
      reviewCount: genuineReviews.length,
    };
  }

  // For built-in seed restaurants: if genuine reviews exist, merge with seed or use genuine
  if (genuineReviews.length > 0) {
    const baseCount = typeof restaurant.reviewCount === 'number' && restaurant.reviewCount > genuineReviews.length
      ? restaurant.reviewCount - genuineReviews.length
      : 0;
    const baseRating = typeof restaurant.rating === 'number' && restaurant.rating > 0 ? restaurant.rating : 4.5;
    const totalCount = baseCount + genuineReviews.length;
    const sumGenuine = genuineReviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = Math.round(((baseRating * baseCount + sumGenuine) / totalCount) * 10) / 10;
    return {
      hasReviews: true,
      averageRating: avg,
      reviewCount: totalCount,
    };
  }

  const seedCount = typeof restaurant.reviewCount === 'number' ? restaurant.reviewCount : 0;
  const seedRating = typeof restaurant.rating === 'number' ? restaurant.rating : 0;
  if (seedCount > 0 && seedRating > 0) {
    return {
      hasReviews: true,
      averageRating: Math.round(seedRating * 10) / 10,
      reviewCount: seedCount,
    };
  }

  return { hasReviews: false, averageRating: 0, reviewCount: 0 };
};

// Helper to determine if a restaurant has an active Premium membership
export const isRestaurantPremiumActive = (restaurant?: Restaurant | null): boolean => {
  if (!restaurant) return false;
  if (restaurant.membershipTier !== 'premium') return false;
  if (restaurant.paymentStatus !== 'verified') return false;
  if (!restaurant.membershipExpiresAt) return false;
  const expiryTime = parseSafeDateMs(restaurant.membershipExpiresAt);
  return expiryTime > Date.now();
};

export type VipAccountState = 'admin' | 'approved_vip' | 'pending_vip' | 'expired_vip' | 'regular_unpaid';

// Helper to strictly identify an Administrator account (separate from VIP customer accounts)
export const isAdminAccount = (user?: User | null): boolean => {
  if (!user) return false;
  return (
    user.role === 'admin' ||
    user.id === 'admin-authorized-single' ||
    user.username === 'admin' ||
    user.username === 'cheasavuth'
  );
};

// Helper to determine if a user has an active, admin-approved Premium VIP subscription (strictly for VIP customers, NOT Admin)
export const isUserVipActive = (user?: User | null): boolean => {
  if (!user) return false;
  // Administrators use administrative privileges and are strictly separated from consumer VIP accounts
  if (isAdminAccount(user)) {
    return false;
  }
  if (user.isDisabled) {
    return false;
  }
  if (
    user.subscriptionStatus === 'cancelled' ||
    user.subscriptionStatus === 'expired' ||
    user.paymentStatus === 'cancelled' ||
    (user.paymentStatus as string) === 'rejected'
  ) {
    return false;
  }
  const hasVipTierOrActiveStatus =
    user.membershipTier === 'premium_vip' ||
    user.subscriptionStatus === 'active' ||
    user.vipStatus === 'active';
  const isVerifiedVipRecord =
    user.paymentStatus === 'verified' ||
    (user.membershipTier === 'premium_vip' &&
      (user.subscriptionStatus === 'active' || user.vipStatus === 'active' || !user.subscriptionStatus));

  if (!hasVipTierOrActiveStatus || !isVerifiedVipRecord) {
    return false;
  }

  const rawExpiry = user.subscriptionExpiryDate || user.vipExpiresAt;
  if (rawExpiry) {
    const expiryTime = parseSafeDateMs(rawExpiry);
    if (expiryTime > Date.now()) {
      return true;
    }
    if (expiryTime > 0 && expiryTime <= Date.now()) {
      return false;
    }
  }

  // Fallback for legacy/migrated active VIP records where expiry timestamp was omitted
  if (user.membershipTier === 'premium_vip' && user.subscriptionStatus === 'active') {
    const startMs = parseSafeDateMs(
      user.subscriptionStartDate || user.verifiedAt || user.lastLoginAt || user.registeredAtIso
    );
    if (startMs <= 0 || startMs + 30 * 24 * 60 * 60 * 1000 > Date.now()) {
      return true;
    }
  }
  return false;
};

// Helper to classify user's exact VIP state (Admin, Approved VIP, Pending Admin Approval, Expired VIP, or Regular Unpaid)
export const getVipAccountState = (user?: User | null): VipAccountState => {
  if (!user) return 'regular_unpaid';
  if (isAdminAccount(user)) {
    return 'admin';
  }
  if (isUserVipActive(user)) {
    return 'approved_vip';
  }
  // Check if pending verification/approval (takes precedence over old expired date if user submitted a renewal!)
  if (
    user.subscriptionStatus === 'pending' ||
    user.paymentStatus === 'paid_pending_approval' ||
    user.paymentStatus === 'pending_verification' ||
    user.paymentStatus === 'needs_more_info'
  ) {
    return 'pending_vip';
  }
  // Check if expired
  const rawExpiry = user.subscriptionExpiryDate || user.vipExpiresAt;
  if (rawExpiry) {
    const expiryTime = parseSafeDateMs(rawExpiry);
    if (expiryTime > 0 && expiryTime <= Date.now()) {
      return 'expired_vip';
    }
  }
  if (user.subscriptionStatus === 'expired') {
    return 'expired_vip';
  }
  return 'regular_unpaid';
};

// Helper to calculate remaining days in VIP subscription (strictly for VIP users, 0 for Admin)
export const getVipRemainingDays = (user?: User | null): number => {
  if (!user || isAdminAccount(user)) return 0;
  if (!isUserVipActive(user)) return 0;
  const rawExpiry = user.subscriptionExpiryDate || user.vipExpiresAt;
  if (!rawExpiry) return 30;
  const expMs = parseSafeDateMs(rawExpiry);
  if (expMs <= 0) return 30;
  const diffMs = expMs - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

// AI Trending Food Section Types (Strictly Food Places only: Street Food, Cafés, Desserts, Famous & Unusual Dishes)
export type TrendingFoodCategorySlug = 
  | 'all'
  | 'street_food' 
  | 'dessert_snack' 
  | 'cafe_drink' 
  | 'noodle_soup' 
  | 'famous_dish' 
  | 'unusual_local'
  | 'popular_food'
  | 'famous_restaurant'
  | 'tourist_attraction'
  | 'food_travel_vlog';

export interface TrendingFoodItem {
  id: string;
  foodNameKh: string;
  foodNameEn: string;
  restaurantNameKh: string;
  restaurantNameEn: string;
  photoUrl: string;
  categorySlug: TrendingFoodCategorySlug;
  categoryKh: string;
  categoryEn: string;
  descriptionKh: string;
  descriptionEn: string;
  provinceKh: string;
  provinceEn: string;
  addressKh: string;
  addressEn: string;
  phone?: string;
  priceDisplay?: string;
  sourcePlatform: 'tiktok' | 'facebook' | 'youtube' | 'local_discovery';
  sourceAccount?: string;
  sourceAccountTitle?: string;
  sourceUrl?: string;
  socialHashtag?: string;
  socialViews?: string;
  socialLikes?: string;
  reviewerQuoteKh?: string;
  reviewerQuoteEn?: string;
  reviewerName?: string;
  latitude: number;
  longitude: number;
  mapUrl?: string;
  lastUpdated: string;
  isVerified: boolean;
  viewCount?: number;
  landmarkNameKh?: string;
  landmarkNameEn?: string;
  videoUrl?: string;
  matchedFoodId?: string;
  fallbackFoodIds?: string[];
  isCustomPhoto?: boolean;
  photoUpdatedAt?: string;
  locationVerificationStatus?: LocationVerificationStatus;
  locationNeedsReview?: boolean;
  locationReviewNote?: string;
  locationVerifiedAt?: string;
}

// AI Smart Check-in & Auto Add Restaurant Types
export interface AiCheckInSubmission {
  id: string;
  userId: string;
  userName: string;
  restaurantNameKh: string;
  restaurantNameEn: string;
  foodCategoryKh: string;
  foodCategoryEn: string;
  signatureDishes: string[];
  photoUrl: string;
  latitude: number;
  longitude: number;
  addressKh: string;
  addressEn: string;
  provinceKh: string;
  provinceEn: string;
  phone?: string;
  aiDescriptionKh: string;
  aiDescriptionEn: string;
  checkInTime: string;
  confidenceScore: number; // 0.0 to 1.0
  status: 'approved' | 'pending' | 'rejected' | 'merged';
  matchedExistingRestaurantId?: string;
  verificationSource: 'ai_vision_ocr' | 'gps_spatial' | 'user_assisted' | 'admin_verified';
  adminNotes?: string;
  isFoodOnlyPhoto?: boolean;
}

export type DestinationCategorySlug = 'temple' | 'nature' | 'mountain' | 'beach' | 'resort';

export interface TouristDestination {
  id: string;
  nameKh: string;
  nameEn: string;
  categorySlug: DestinationCategorySlug;
  categoryKh: string;
  categoryEn: string;
  descriptionKh: string;
  descriptionEn: string;
  photoUrl: string;
  galleryPhotos?: string[];
  provinceKh: string;
  provinceEn: string;
  addressKh: string;
  addressEn: string;
  entranceFeeKh: string;
  entranceFeeEn: string;
  entryFeeKh?: string;
  entryFeeEn?: string;
  bestTimeToVisitKh: string;
  bestTimeToVisitEn: string;
  mapUrl: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  highlightsKh: string[];
  isFeatured?: boolean;
  isTrendingSocial?: boolean; // Viral on TikTok & Facebook
  socialPlatform?: 'tiktok' | 'facebook' | 'all';
  socialHashtag?: string; // e.g. "#KnongPhsar #SeaOfClouds"
  socialViews?: string; // e.g. "2.4M+ Views"
  socialLikes?: string; // e.g. "185K Likes"
  socialHighlightKh?: string;
  socialHighlightEn?: string;
  reviewerQuoteKh?: string; // e.g. "ទេសភាពស្អាតដូចឋានសួគ៌ ពេលព្រឹកពពកហោះកាត់ជើង!"
  reviewerQuoteEn?: string;
  reviewerName?: string;
  isCustomPhoto?: boolean;
  photoUpdatedAt?: string;
  googlePlaceId?: string;
  dataSource?: 'seed' | 'admin' | 'google_maps';
  googleMapsMeta?: GoogleMapsPlaceMetadata;
  isAdminEdited?: boolean;
  adminEditedAt?: string;
  locationVerificationStatus?: LocationVerificationStatus;
  locationNeedsReview?: boolean;
  locationReviewNote?: string;
  locationVerifiedAt?: string;
}

// User Wishlist Item & Custom Lists (បញ្ជីកន្លែងដែលចង់ទៅ)
export interface WishlistItem {
  id: string; // matches FoodItem.id, Restaurant.id, or TouristDestination.id
  type: 'food' | 'restaurant' | 'destination';
  nameKh: string;
  nameEn: string;
  photoUrl: string;
  categoryKh?: string;
  provinceKh?: string;
  priceDisplay?: string;
  rating?: number;
  addedAt: string;
}

export interface Wishlist {
  id: string;
  userId: string;
  nameKh: string;
  nameEn: string;
  emoji: string;
  isDefault?: boolean;
  items: WishlistItem[];
  createdAt: string;
}

// AI Trip Planner (ផែនការដើរលេង AI ដោយស្វ័យប្រវត្តិ)
export interface TripPlanActivity {
  timePeriod: 'morning' | 'lunch' | 'afternoon' | 'dinner';
  titleKh: string;
  titleEn: string;
  descKh: string;
  descEn: string;
  placeNameKh?: string;
  dishNameKh?: string;
  photoUrl?: string;
  estimatedCostUsd: number;
}

export interface TripPlanDay {
  dayNumber: number;
  titleKh: string;
  titleEn: string;
  activities: TripPlanActivity[];
  dayEstimatedCostUsd: number;
}

export interface TripPlan {
  id: string;
  userId: string;
  provinceKh: string;
  provinceEn: string;
  durationDays: number;
  budgetLevel: 'budget' | 'medium' | 'luxury';
  companion: 'solo' | 'couple' | 'friends' | 'family';
  totalEstimatedCostUsd: number;
  days: TripPlanDay[];
  createdAt: string;
}

// Helpful Notifications (ការជូនដំណឹងដែលមានប្រយោជន៍)
export interface AppNotification {
  id: string;
  titleKh: string;
  titleEn: string;
  titleZh?: string;
  messageKh: string;
  messageEn: string;
  messageZh?: string;
  type: 'promo' | 'new_spot' | 'discount' | 'daily_dish' | 'event' | 'local_news' | 'system';
  date: string;
  timestampIso?: string;
  isRead: boolean;
  targetType?: 'restaurant' | 'destination' | 'food' | 'daily_discovery' | 'external';
  targetId?: string;
  discountPercent?: number;
  photoUrl?: string;
  provinceKh?: string;
  provinceEn?: string;
  sourceName?: string;
  sourceUrl?: string;
  latitude?: number;
  longitude?: number;
}

export type DailyDiscoveryCategory =
  | 'all'
  | 'restaurant'
  | 'attraction'
  | 'promotion'
  | 'event'
  | 'local_news'
  | 'food';

export interface DailyDiscoveryItem {
  id: string;
  category: Exclude<DailyDiscoveryCategory, 'all'>;
  titleKh: string;
  titleEn: string;
  titleZh?: string;
  summaryKh: string;
  summaryEn: string;
  summaryZh?: string;
  photoUrl: string;
  provinceKh: string;
  provinceEn: string;
  addressKh?: string;
  latitude?: number;
  longitude?: number;
  publishedAt: string; // ISO 8601 timestamp
  sourceName: string;
  sourceUrl: string;
  sourcePlatform: 'supabase_live' | 'google_maps' | 'facebook_public' | 'tiktok_public' | 'tourism_ministry' | 'wikimedia_api' | 'open_meteo' | 'vip_partner';
  targetType: 'restaurant' | 'destination' | 'food' | 'external';
  targetId?: string;
  discountPercent?: number;
  priceDisplay?: string;
  rating?: number;
  isNewToday?: boolean;
  tagsKh?: string[];
  tagsEn?: string[];
}

export interface AppSettings {
  apkDownloadUrl: string;
  playStoreUrl: string;
  appStoreUrl: string;
  iosAppStoreUrl: string;
  iosTestFlightUrl: string;
  supportQrImageUrl: string;
  supportBankName: string;
  supportAccountName: string;
  supportMessageKh: string;
  supportMessageEn: string;
  adminPasswordHash: string;
  isAdminInitialized: boolean;
  promotionalFeeUsd: number;
  promotionalFeeEnabled: boolean;
  promotionPeriodKh: string;
  promotionPeriodEn: string;

  // Dynamic Admin-Configurable VIP Packages & Store Management Fees
  vipShortDurationDays?: number; // Default: 10 days
  vipShortPriceUsd?: number; // Default: $2.99
  vipShortNameKh?: string; // Default: "កញ្ចប់ VIP 10 ថ្ងៃ"
  vipShortNameEn?: string; // Default: "VIP 10 Days"
  vipLongDurationDays?: number; // Default: 90 days
  vipLongPriceUsd?: number; // Default: $4.99
  vipLongNameKh?: string; // Default: "កញ្ចប់ VIP 90 ថ្ងៃ"
  vipLongNameEn?: string; // Default: "VIP 90 Days"
  additionalStoreFeeUsd?: number; // Default: $10.00 per additional store beyond the 1st
  includedFreeStoresPerVip?: number; // Default: 1 store included with VIP
  vipFeaturedRotationEnabled?: boolean; // Default: true (enable VIP shop featured top rotation)
  vipFeaturedDurationDays?: number; // Default: 1 day per featured slot
  vipFeaturedManualSchedule?: ManualFeaturedSlot[]; // Admin-scheduled Top Listing slots (shop + start date + duration)
  vipBenefitsList?: VipBenefitItem[]; // Configurable VIP benefits list
  settingsVersion?: number; // Monotonically increasing server configuration version
  settingsUpdatedAt?: string;
  settingsUpdatedBy?: string;
}

// User–Admin Two-Way Support & Payment Verification System
export type SupportTicketStatus = 'pending' | 'replied' | 'resolved';

export interface SupportTicketMessage {
  id: string;
  senderRole: 'user' | 'admin';
  senderId: string;
  senderName: string;
  message: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  username: string;
  userEmail?: string;
  userPhone?: string;
  paymentPlanId: 'quarterly' | 'annual' | 'additional_store';
  paymentPlanLabel: string; // e.g. "VIP 10 Days ($2.99)" or "VIP 90 Days ($4.99)" or "Additional Store (+$10.00)"
  amountUsd: number;
  durationDays: number;
  paymentDate: string;
  paymentRef: string;
  receiptUrl?: string;
  status: SupportTicketStatus; // 'pending' | 'replied' | 'resolved'
  vipApproved?: boolean;
  vipApprovedAt?: string;
  unreadByAdmin?: boolean;
  unreadByUser?: boolean;
  messages: SupportTicketMessage[];
  createdAt: string;
  updatedAt: string;
  aiVerificationReport?: AbaReceiptVerificationReport;
}

/**
 * Helper to load persisted AppSettings from localStorage when not explicitly passed
 */
export const getStoredAppSettingsFallback = (): Partial<AppSettings> => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('kft_settings_v3');
      localStorage.removeItem('kft_settings_v4');
      const raw = localStorage.getItem('kft_settings_v5');
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {
    // ignore storage errors
  }
  return {};
};

/**
 * Resolve dynamic VIP plans from centralized Admin settings (with safe defaults: 30 days @ $9.99, 90 days @ $24.99)
 */
export const getDynamicVipPlans = (
  settings?: Partial<AppSettings> | null
): Record<'quarterly' | 'annual', VipPlanConfig> => {
  const s = settings || getStoredAppSettingsFallback();
  const ver = Number(s.settingsVersion || 0);
  const isLegacyCorrupted =
    ver < 25 &&
    (Number(s.vipShortPriceUsd) === 9.99 ||
      Number(s.vipLongPriceUsd) === 24.99 ||
      (Number(s.vipShortDurationDays) === 3 && Number(s.vipLongDurationDays) === 9));

  const rawShortDays = Number(s.vipShortDurationDays);
  let shortDays =
    Number.isFinite(rawShortDays) && rawShortDays >= 1
      ? Math.round(rawShortDays)
      : VIP_QUARTERLY_DAYS;

  const rawShortPrice = Number(s.vipShortPriceUsd);
  let shortPrice =
    Number.isFinite(rawShortPrice) && rawShortPrice > 0
      ? Math.round(rawShortPrice * 100) / 100
      : VIP_QUARTERLY_PRICE_USD;

  const rawLongDays = Number(s.vipLongDurationDays);
  let longDays =
    Number.isFinite(rawLongDays) && rawLongDays >= 1
      ? Math.round(rawLongDays)
      : VIP_SUBSCRIPTION_DAYS;

  const rawLongPrice = Number(s.vipLongPriceUsd);
  let longPrice =
    Number.isFinite(rawLongPrice) && rawLongPrice > 0
      ? Math.round(rawLongPrice * 100) / 100
      : VIP_ANNUAL_PRICE_USD;

  if (isLegacyCorrupted) {
    if (shortPrice === 9.99) shortPrice = VIP_QUARTERLY_PRICE_USD;
    if (shortDays === 3) shortDays = VIP_QUARTERLY_DAYS;
    if (longPrice === 24.99) longPrice = VIP_ANNUAL_PRICE_USD;
    if (longDays === 9 || longDays === 90) longDays = VIP_SUBSCRIPTION_DAYS;
  }

  const shortNameKhRaw = (s.vipShortNameKh || '').trim();
  const shortNameEnRaw = (s.vipShortNameEn || '').trim();
  const longNameKhRaw = (s.vipLongNameKh || '').trim();
  const longNameEnRaw = (s.vipLongNameEn || '').trim();

  const shortNameKh =
    !shortNameKhRaw || /^VIP\s+\d+\s*(ថ្ងៃ|\?+)$/i.test(shortNameKhRaw)
      ? shortDays === 30
        ? 'VIP ១ ខែ (30 ថ្ងៃ)'
        : `VIP ${shortDays} ថ្ងៃ`
      : shortNameKhRaw;
  const shortNameEn =
    !shortNameEnRaw || /^VIP\s+\d+\s*Days?$/i.test(shortNameEnRaw)
      ? shortDays === 30
        ? 'VIP 1 Month (30 Days)'
        : `VIP ${shortDays} Days`
      : shortNameEnRaw;
  const longNameKh =
    !longNameKhRaw || /^VIP\s+\d+\s*(ថ្ងៃ|\?+)$/i.test(longNameKhRaw)
      ? longDays === 60
        ? 'VIP ២ ខែ (60 ថ្ងៃ)'
        : `VIP ${longDays} ថ្ងៃ`
      : longNameKhRaw;
  const longNameEn =
    !longNameEnRaw || /^VIP\s+\d+\s*Days?$/i.test(longNameEnRaw)
      ? longDays === 60
        ? 'VIP 2 Months (60 Days)'
        : `VIP ${longDays} Days`
      : longNameEnRaw;

  return {
    quarterly: {
      id: 'quarterly',
      nameEn: shortNameEn,
      nameKh: shortNameKh,
      priceUsd: shortPrice,
      durationDays: shortDays,
      labelEn: `${shortNameEn} ($${shortPrice.toFixed(2)} USD / ${shortDays} days)`,
      labelKh: `${shortNameKh} ($${shortPrice.toFixed(2)} USD / ${shortDays} ថ្ងៃ)`,
      priceKhrDisplay: `${Math.round(shortPrice * 4100).toLocaleString()} រៀល`,
    },
    annual: {
      id: 'annual',
      nameEn: longNameEn,
      nameKh: longNameKh,
      priceUsd: longPrice,
      durationDays: longDays,
      labelEn: `${longNameEn} ($${longPrice.toFixed(2)} USD / ${longDays} days)`,
      labelKh: `${longNameKh} ($${longPrice.toFixed(2)} USD / ${longDays} ថ្ងៃ)`,
      priceKhrDisplay: `${Math.round(longPrice * 4100).toLocaleString()} រៀល`,
    },
  };
};

/**
 * Resolve dynamic VIP benefits list from centralized Admin settings
 */
export const getDynamicVipBenefits = (
  settings?: Partial<AppSettings> | null
): VipBenefitItem[] => {
  const s = settings || getStoredAppSettingsFallback();
  if (Array.isArray(s.vipBenefitsList) && s.vipBenefitsList.length > 0) {
    return s.vipBenefitsList.map((b, idx) => ({
      ...b,
      id: b.id || idx + 1,
      descriptionKh: b.descriptionKh || b.descKh || '',
      descriptionEn: b.descriptionEn || b.descEn || '',
      descKh: b.descKh || b.descriptionKh || '',
      descEn: b.descEn || b.descriptionEn || '',
    }));
  }
  return TEN_VIP_BENEFITS.map((b) => ({
    ...b,
    descKh: b.descriptionKh,
    descEn: b.descriptionEn,
  }));
};

/**
 * Resolve dynamic additional-store fee (default $10.00 per additional store beyond the 1st)
 */
export const getAdditionalStoreFeeUsd = (
  settings?: Partial<AppSettings> | null
): number => {
  const s = settings || getStoredAppSettingsFallback();
  const rawVal = Number(s.additionalStoreFeeUsd);
  if (
    s.additionalStoreFeeUsd !== undefined &&
    s.additionalStoreFeeUsd !== null &&
    Number.isFinite(rawVal) &&
    rawVal >= 0
  ) {
    const val = Math.round(rawVal * 100) / 100;
    if (Number(s.settingsVersion || 0) < 15 && val === 10.0) return DEFAULT_ADDITIONAL_STORE_FEE_USD;
    return val;
  }
  return DEFAULT_ADDITIONAL_STORE_FEE_USD;
};

export interface UserStoreQuotaSummary {
  isAdmin: boolean;
  isVipActive: boolean;
  includedFreeStores: number;
  paidAdditionalStoreSlots: number;
  paidAdditionalStores: number;
  totalAllowedStores: number;
  usedStoresCount: number;
  remainingAvailableSlots: number;
  additionalStoreFeeUsd: number;
  ownedStores: Restaurant[];
  verifiedAdditionalStoreTransactions: RegistrationTransaction[];
  pendingAdditionalStoreTransaction: RegistrationTransaction | null;
  pendingAdditionalStorePayments: number;
  nextStoreSlotNumber: number;
  canCreateNewStoreWithoutPayment: boolean;
  canAddWithoutNewPayment: boolean;
  canReplaceExistingStoreForFree: boolean;
  canReplaceExistingFree: boolean;
  canEditExistingFree: boolean;
}

/**
 * Compute authoritative store limits, used stores, paid additional store slots, and pending payment state for a user
 */
export const getUserStoreQuotaSummary = (
  user?: User | null,
  restaurants?: Restaurant[] | null,
  transactions?: RegistrationTransaction[] | null,
  settings?: Partial<AppSettings> | null
): UserStoreQuotaSummary => {
  const s = settings || getStoredAppSettingsFallback();
  const additionalStoreFeeUsd = getAdditionalStoreFeeUsd(s);

  if (!user) {
    return {
      isAdmin: false,
      isVipActive: false,
      includedFreeStores: 0,
      paidAdditionalStoreSlots: 0,
      paidAdditionalStores: 0,
      totalAllowedStores: 0,
      usedStoresCount: 0,
      remainingAvailableSlots: 0,
      additionalStoreFeeUsd,
      ownedStores: [],
      verifiedAdditionalStoreTransactions: [],
      pendingAdditionalStoreTransaction: null,
      pendingAdditionalStorePayments: 0,
      nextStoreSlotNumber: 1,
      canCreateNewStoreWithoutPayment: false,
      canAddWithoutNewPayment: false,
      canReplaceExistingStoreForFree: false,
      canReplaceExistingFree: false,
      canEditExistingFree: false,
    };
  }

  const isAdmin =
    user.role === 'admin' ||
    user.id === 'admin-authorized-single' ||
    user.username === 'admin' ||
    user.username === 'cheasavuth';
  const isVipActive = isUserVipActive(user);

  const userIdSet = new Set<string>([
    user.id,
    ...(Array.isArray(user.legacyIds) ? user.legacyIds : []),
  ]);
  const userEmailLower = (user.email || '').toLowerCase().trim();
  const userPhoneClean = (user.phone || '').replace(/[\s-+]/g, '');

  const ownedStores = Array.isArray(restaurants)
    ? restaurants.filter((r) => {
        if (!r || isSeedRestaurantId(r.id)) return false;
        if (r.ownerId && userIdSet.has(r.ownerId)) return true;
        if (userEmailLower && r.ownerEmail && r.ownerEmail.toLowerCase().trim() === userEmailLower) {
          return true;
        }
        if (
          userPhoneClean.length >= 7 &&
          r.ownerPhone &&
          r.ownerPhone.replace(/[\s-+]/g, '') === userPhoneClean
        ) {
          return true;
        }
        return false;
      })
    : [];

  const userAdditionalTxns = Array.isArray(transactions)
    ? transactions.filter((t) => {
        if (!t || t.type !== 'additional_store_slot') return false;
        if ((t.userId && userIdSet.has(t.userId)) || (t.ownerId && userIdSet.has(t.ownerId))) return true;
        if (userEmailLower && t.userEmail && t.userEmail.toLowerCase().trim() === userEmailLower) {
          return true;
        }
        if (
          userPhoneClean.length >= 7 &&
          t.ownerPhone &&
          t.ownerPhone.replace(/[\s-+]/g, '') === userPhoneClean
        ) {
          return true;
        }
        return false;
      })
    : [];

  const verifiedAdditionalStoreTransactions = userAdditionalTxns.filter(
    (t) => t.status === 'verified'
  );
  const pendingAdditionalStoreTxns = userAdditionalTxns.filter(
    (t) => t.status === 'pending_verification' || t.status === 'needs_more_info'
  );
  const pendingAdditionalStoreTransaction = pendingAdditionalStoreTxns[0] || null;

  // Strictly bind paid additional store slots to verified additional_store_slot transactions
  const paidAdditionalStoreSlots = Array.isArray(transactions)
    ? verifiedAdditionalStoreTransactions.length
    : typeof user.paidAdditionalStoreSlots === 'number' && user.paidAdditionalStoreSlots > 0
    ? user.paidAdditionalStoreSlots
    : 0;

  // Only the 1st shop is included with an active VIP subscription; each additional shop requires a separate verified payment
  const includedFreeStores = isAdmin
    ? 9999
    : isVipActive
    ? DEFAULT_INCLUDED_FREE_STORES
    : 0;

  const totalAllowedStores = isAdmin
    ? 9999
    : isVipActive
    ? includedFreeStores + paidAdditionalStoreSlots
    : 0;
  const usedStoresCount = ownedStores.length;
  const remainingAvailableSlots = Math.max(0, totalAllowedStores - usedStoresCount);
  const canCreateNewStoreWithoutPayment = isAdmin || (isVipActive && remainingAvailableSlots > 0);
  const canReplaceExistingStoreForFree = isAdmin || (isVipActive && usedStoresCount > 0);
  const canEditExistingFree = true;

  return {
    isAdmin,
    isVipActive,
    includedFreeStores,
    paidAdditionalStoreSlots,
    paidAdditionalStores: paidAdditionalStoreSlots,
    totalAllowedStores,
    usedStoresCount,
    remainingAvailableSlots,
    additionalStoreFeeUsd,
    ownedStores,
    verifiedAdditionalStoreTransactions,
    pendingAdditionalStoreTransaction,
    pendingAdditionalStorePayments: pendingAdditionalStoreTxns.length,
    nextStoreSlotNumber: Math.max(totalAllowedStores + 1, usedStoresCount + 1),
    canCreateNewStoreWithoutPayment,
    canAddWithoutNewPayment: canCreateNewStoreWithoutPayment,
    canReplaceExistingStoreForFree,
    canReplaceExistingFree: canReplaceExistingStoreForFree,
    canEditExistingFree,
  };
};

// ============================================================================
// VIP SHOP FEATURED ROTATION SYSTEM
// ============================================================================
export const DEFAULT_VIP_FEATURED_DURATION_DAYS = 1;
const VIP_ROTATION_EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0);

/**
 * Admin-scheduled Top Listing slot: pins one specific shop to the top of the directory
 * from `startAt` for `durationDays` days. Takes priority over automatic rotation.
 */
export interface ManualFeaturedSlot {
  id: string;
  restaurantId: string;
  startAt: string; // ISO timestamp
  durationDays: number; // 1..365
  createdAt?: string;
}

export const MAX_MANUAL_FEATURED_SLOTS = 200;

export const getManualFeaturedSlotEndMs = (slot: ManualFeaturedSlot): number =>
  Date.parse(slot.startAt) + Math.max(1, Number(slot.durationDays) || 1) * 24 * 60 * 60 * 1000;

/** Drop malformed slots and clamp values so corrupted settings can never break the listing. */
export const sanitizeManualFeaturedSchedule = (raw: unknown): ManualFeaturedSlot[] => {
  if (!Array.isArray(raw)) return [];
  const out: ManualFeaturedSlot[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Partial<ManualFeaturedSlot>;
    const restaurantId = typeof s.restaurantId === 'string' ? s.restaurantId.trim() : '';
    const startMs = typeof s.startAt === 'string' ? Date.parse(s.startAt) : Number.NaN;
    const days = Math.round(Number(s.durationDays));
    if (!restaurantId || Number.isNaN(startMs) || !Number.isFinite(days) || days < 1) continue;
    out.push({
      id: typeof s.id === 'string' && s.id ? s.id : `mfs-${startMs}-${restaurantId}`,
      restaurantId,
      startAt: new Date(startMs).toISOString(),
      durationDays: Math.min(365, days),
      createdAt: typeof s.createdAt === 'string' ? s.createdAt : undefined,
    });
    if (out.length >= MAX_MANUAL_FEATURED_SLOTS) break;
  }
  return out;
};

export interface VipFeaturedRotationConfig {
  enabled: boolean;
  durationDays: number;
  durationMs: number;
}

export const getVipFeaturedRotationConfig = (
  settings?: Partial<AppSettings> | null
): VipFeaturedRotationConfig => {
  const s = settings || getStoredAppSettingsFallback();
  const enabled = s.vipFeaturedRotationEnabled !== false;
  const rawDays = Number(s.vipFeaturedDurationDays);
  const durationDays =
    Number.isFinite(rawDays) && rawDays >= 1
      ? Math.min(365, Math.round(rawDays))
      : DEFAULT_VIP_FEATURED_DURATION_DAYS;
  return {
    enabled,
    durationDays,
    durationMs: durationDays * 24 * 60 * 60 * 1000,
  };
};

export const getRestaurantApprovedAtMs = (r?: Partial<Restaurant> | null): number => {
  if (!r) return 0;
  const raw = r.approvedAt || r.featuredFromAt || r.created_at || r.createdAt;
  if (raw && typeof raw === 'string') {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return getRestaurantCreatedAtMs(r);
};

export const isRestaurantEligibleForVipRotation = (
  restaurant?: Restaurant | null,
  users?: User[] | null
): boolean => {
  if (!restaurant || !restaurant.id) return false;
  if (isSeedRestaurantId(restaurant.id)) return false;
  if (String(restaurant.id).startsWith('food-') || String(restaurant.id).startsWith('dest-')) {
    return false;
  }
  if (restaurant.status && restaurant.status !== 'approved') {
    return false;
  }
  if (
    restaurant.aiCategoryVerification?.detectedType &&
    restaurant.aiCategoryVerification.detectedType !== 'restaurant'
  ) {
    return false;
  }

  // Check if owner is an active VIP member or if the shop itself has an active premium tier
  if (Array.isArray(users) && users.length > 0 && restaurant.ownerId) {
    const owner = users.find(
      (u) =>
        u.id === restaurant.ownerId ||
        (Array.isArray(u.legacyIds) && u.legacyIds.includes(restaurant.ownerId!))
    );
    if (owner) {
      if (owner.isDisabled) return false;
      if (isUserVipActive(owner) || isAdminAccount(owner)) return true;
      // If owner's VIP subscription has explicitly expired, shop is not eligible for VIP rotation
      if (owner.subscriptionExpiryDate) {
        const exp = Date.parse(owner.subscriptionExpiryDate);
        if (!Number.isNaN(exp) && exp <= Date.now()) {
          return false;
        }
      }
    }
  }

  if (isRestaurantPremiumActive(restaurant)) return true;
  if (restaurant.membershipTier === 'premium' || restaurant.dataSource === 'vip_owner' || restaurant.isFeatured) {
    if (restaurant.membershipExpiresAt) {
      const exp = Date.parse(restaurant.membershipExpiresAt);
      if (!Number.isNaN(exp) && exp <= Date.now()) {
        return false;
      }
    }
    return true;
  }

  return false;
};

export interface VipFeaturedShopSlotInfo {
  restaurant: Restaurant;
  reason: 'manual_schedule' | 'new_shop_boost' | 'rotation_slot';
  slotStartIso: string;
  slotEndIso: string;
  remainingMs: number;
  remainingHours: number;
  queueIndex: number;
}

export interface VipFeaturedRotationState {
  config: VipFeaturedRotationConfig;
  eligibleQueue: Restaurant[];
  currentlyFeatured: VipFeaturedShopSlotInfo[];
  currentlyFeaturedIds: Set<string>;
  primaryFeaturedShop: VipFeaturedShopSlotInfo | null;
  nextRotatingShop: Restaurant | null;
  currentSlotIndex: number;
  slotStartIso: string;
  slotEndIso: string;
}

/**
 * Deterministically compute the active VIP Featured Shop Rotation state across all devices using server/ISO timestamps.
 * - Newly approved VIP shops are featured at the top for `durationDays` (1 day by default) from their `approvedAt` timestamp.
 * - After the initial window (and continuously), eligible VIP shops rotate fairly in registration/approval order for `durationDays` per slot.
 */
export const getVipFeaturedRotationState = (
  restaurants?: Restaurant[] | null,
  users?: User[] | null,
  settings?: Partial<AppSettings> | null,
  nowMs: number = Date.now()
): VipFeaturedRotationState => {
  const config = getVipFeaturedRotationConfig(settings);
  const list = Array.isArray(restaurants) ? restaurants : [];

  // Sort eligible VIP shops strictly in registration/approval order
  const eligibleQueue = list
    .filter((r) => isRestaurantEligibleForVipRotation(r, users))
    .sort((a, b) => {
      const diff = getRestaurantApprovedAtMs(a) - getRestaurantApprovedAtMs(b);
      if (diff !== 0) return diff;
      return String(a.id).localeCompare(String(b.id));
    });

  const elapsedSinceEpoch = Math.max(0, nowMs - VIP_ROTATION_EPOCH_MS);
  const currentSlotIndex = Math.floor(elapsedSinceEpoch / config.durationMs);
  const slotStartMs = VIP_ROTATION_EPOCH_MS + currentSlotIndex * config.durationMs;
  const slotEndMs = slotStartMs + config.durationMs;
  const slotStartIso = new Date(slotStartMs).toISOString();
  const slotEndIso = new Date(slotEndMs).toISOString();

  // 0. Admin manual schedule (highest priority, works even when automatic rotation is disabled)
  const manualFeatured: VipFeaturedShopSlotInfo[] = [];
  const manualSeen = new Set<string>();
  const manualSchedule = sanitizeManualFeaturedSchedule(
    (settings || getStoredAppSettingsFallback()).vipFeaturedManualSchedule
  )
    .filter((slot) => {
      const startMs = Date.parse(slot.startAt);
      return nowMs >= startMs && nowMs < getManualFeaturedSlotEndMs(slot);
    })
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  for (const slot of manualSchedule) {
    if (manualSeen.has(slot.restaurantId)) continue;
    const shop = list.find((r) => r && r.id === slot.restaurantId);
    if (!shop) continue;
    manualSeen.add(slot.restaurantId);
    const endMs = getManualFeaturedSlotEndMs(slot);
    const remMs = Math.max(0, endMs - nowMs);
    manualFeatured.push({
      restaurant: shop,
      reason: 'manual_schedule',
      slotStartIso: slot.startAt,
      slotEndIso: new Date(endMs).toISOString(),
      remainingMs: remMs,
      remainingHours: Math.max(1, Math.ceil(remMs / (1000 * 60 * 60))),
      queueIndex: eligibleQueue.findIndex((r) => r.id === shop.id),
    });
  }

  if (!config.enabled || eligibleQueue.length === 0) {
    return {
      config,
      eligibleQueue,
      currentlyFeatured: manualFeatured,
      currentlyFeaturedIds: new Set<string>(manualFeatured.map((m) => m.restaurant.id)),
      primaryFeaturedShop: manualFeatured[0] || null,
      nextRotatingShop: null,
      currentSlotIndex,
      slotStartIso,
      slotEndIso,
    };
  }

  const currentlyFeatured: VipFeaturedShopSlotInfo[] = [];
  const currentlyFeaturedIds = new Set<string>(manualFeatured.map((m) => m.restaurant.id));

  // 1. Check for newly added approved VIP shops within their initial `durationDays` top-listing window
  for (let i = 0; i < eligibleQueue.length; i++) {
    const shop = eligibleQueue[i];
    if (currentlyFeaturedIds.has(shop.id)) continue;
    const approvedMs = getRestaurantApprovedAtMs(shop);
    const explicitUntilMs = shop.featuredUntilAt ? Date.parse(shop.featuredUntilAt) : Number.NaN;
    // Always compute dynamic window from approvedMs + config.durationMs so Admin duration changes take effect immediately
    const boostEndMs =
      approvedMs > 0
        ? approvedMs + config.durationMs
        : !Number.isNaN(explicitUntilMs)
        ? explicitUntilMs
        : 0;

    if (approvedMs > 0 && nowMs >= approvedMs && nowMs < boostEndMs) {
      const remMs = Math.max(0, boostEndMs - nowMs);
      currentlyFeatured.push({
        restaurant: shop,
        reason: 'new_shop_boost',
        slotStartIso: new Date(approvedMs).toISOString(),
        slotEndIso: new Date(boostEndMs).toISOString(),
        remainingMs: remMs,
        remainingHours: Math.max(1, Math.ceil(remMs / (1000 * 60 * 60))),
        queueIndex: i,
      });
      currentlyFeaturedIds.add(shop.id);
    }
  }

  // Sort newly added shops so the most recently registered approved shop is first
  currentlyFeatured.sort(
    (a, b) => getRestaurantApprovedAtMs(b.restaurant) - getRestaurantApprovedAtMs(a.restaurant)
  );

  // 2. Fair Round-Robin Rotation in Registration/Approval Order
  const rotatingQueueIndex = currentSlotIndex % eligibleQueue.length;
  const rotatingShop = eligibleQueue[rotatingQueueIndex];
  if (rotatingShop && !currentlyFeaturedIds.has(rotatingShop.id)) {
    const remMs = Math.max(0, slotEndMs - nowMs);
    currentlyFeatured.push({
      restaurant: rotatingShop,
      reason: 'rotation_slot',
      slotStartIso,
      slotEndIso,
      remainingMs: remMs,
      remainingHours: Math.max(1, Math.ceil(remMs / (1000 * 60 * 60))),
      queueIndex: rotatingQueueIndex,
    });
    currentlyFeaturedIds.add(rotatingShop.id);
  }

  const nextRotatingShop =
    eligibleQueue.length > 1
      ? eligibleQueue[(rotatingQueueIndex + 1) % eligibleQueue.length]
      : eligibleQueue[0] || null;

  return {
    config,
    eligibleQueue,
    currentlyFeatured: [...manualFeatured, ...currentlyFeatured],
    currentlyFeaturedIds,
    primaryFeaturedShop: manualFeatured[0] || currentlyFeatured[0] || null,
    nextRotatingShop,
    currentSlotIndex,
    slotStartIso,
    slotEndIso,
  };
};

/**
 * Sort a list of restaurants so that currently featured VIP shops (from initial 1-day new-shop boost or fair round-robin rotation)
 * appear at the very top of the relevant listing, while preserving the order of all other restaurants.
 */
export const sortRestaurantsWithVipRotation = (
  restaurants: Restaurant[],
  users?: User[] | null,
  settings?: Partial<AppSettings> | null,
  nowMs: number = Date.now()
): Restaurant[] => {
  if (!Array.isArray(restaurants) || restaurants.length <= 1) {
    return Array.isArray(restaurants) ? [...restaurants] : [];
  }
  const rotation = getVipFeaturedRotationState(restaurants, users, settings, nowMs);
  if (rotation.currentlyFeatured.length === 0) {
    return [...restaurants];
  }

  const featuredOrderMap = new Map<string, number>();
  rotation.currentlyFeatured.forEach((item, idx) => {
    featuredOrderMap.set(item.restaurant.id, idx);
  });

  const topFeatured: Restaurant[] = [];
  const verifiedLocRestList: Restaurant[] = [];
  const reviewLocRestList: Restaurant[] = [];
  for (const r of restaurants) {
    if (featuredOrderMap.has(r.id)) {
      topFeatured.push(r);
    } else if (isPlaceLocationVerified(r)) {
      verifiedLocRestList.push(r);
    } else {
      reviewLocRestList.push(r);
    }
  }

  topFeatured.sort(
    (a, b) => (featuredOrderMap.get(a.id) ?? 999) - (featuredOrderMap.get(b.id) ?? 999)
  );

  return [...topFeatured, ...verifiedLocRestList, ...reviewLocRestList];
};

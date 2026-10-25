export const APP_VERSION = 'v2.1.0';
export const APP_VERSION_NAME = '2.1.0';
export const APP_BUILD_CODE = 82;
export const APP_RELEASE_DATE = '2026-10-25';

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

export const VIP_ANNUAL_PRICE_USD = 24.99;
export const VIP_SUBSCRIPTION_DAYS = 90;
export const VIP_QUARTERLY_PRICE_USD = 9.99;
export const VIP_QUARTERLY_DAYS = 30;
export const DEFAULT_ADDITIONAL_STORE_FEE_USD = 10.0;
export const DEFAULT_INCLUDED_FREE_STORES = 1;

export interface VipPlanConfig {
  id: 'quarterly' | 'annual';
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
    nameEn: 'VIP 30 Days',
    nameKh: 'VIP 30 ថ្ងៃ',
    priceUsd: 9.99,
    durationDays: 30,
    labelEn: 'VIP 30 Days ($9.99 / 30 days)',
    labelKh: 'VIP 30 ថ្ងៃ ($9.99 / 30 ថ្ងៃ)',
    priceKhrDisplay: '៤០,៩៥៩ រៀល'
  },
  annual: {
    id: 'annual',
    nameEn: 'VIP 90 Days',
    nameKh: 'VIP 90 ថ្ងៃ',
    priceUsd: 24.99,
    durationDays: 90,
    labelEn: 'VIP 90 Days ($24.99 / 90 days)',
    labelKh: 'VIP 90 ថ្ងៃ ($24.99 / 90 ថ្ងៃ)',
    priceKhrDisplay: '១០២,៤៥៩ រៀល'
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
    titleKh: 'ទម្រង់ហាងកម្រិតខ្ពស់ (Enhanced Restaurant Profile)',
    titleEn: 'Enhanced Restaurant Profile',
    descriptionKh: 'កែប្រែទម្រង់ហាងជាមួយ Theme មាស និងផ្លាកសញ្ញាបញ្ជាក់ផ្លូវការ Iconic VIP',
    descriptionEn: 'Customized golden theme, verified iconic badge, and custom branding for your restaurant.',
    iconName: 'Sparkles',
    category: 'profile'
  },
  {
    id: 2,
    titleKh: 'រូបថតច្រើនសន្លឹក & មុខម្ហូបរហូតដល់ ២០ មុខ (More Photos & Menu Items)',
    titleEn: 'More Food Photos & Menu Items',
    descriptionKh: 'បង្ហោះមុខម្ហូបក្នុងបញ្ជីបានរហូតដល់ ២០ មុខ ព្រមទាំងរូបថត Gallery ច្រើនសន្លឹក',
    descriptionEn: 'Add up to 20 menu items (free accounts limited to 5) with high-res photo gallery.',
    iconName: 'UtensilsCrossed',
    category: 'profile'
  },
  {
    id: 3,
    titleKh: 'បង្ហោះវីដេអូផ្សព្វផ្សាយម្ហូប (Food Promotional Video Uploads)',
    titleEn: 'Food Promotional Video Uploads',
    descriptionKh: 'ភ្ជាប់វីដេអូផ្សព្វផ្សាយម្ហូប YouTube, TikTok ឬ MP4 លើទំព័រហាងផ្ទាល់',
    descriptionEn: 'Embed promotional video clips (YouTube, TikTok, MP4) directly on restaurant cards.',
    iconName: 'Video',
    category: 'promotion'
  },
  {
    id: 4,
    titleKh: 'ផ្លាកសញ្ញា VIP Badge មាស (Premium VIP Badge)',
    titleEn: 'Premium VIP Badge',
    descriptionKh: 'បង្ហាញផ្លាកសញ្ញា VIP ពណ៌មាសលើកម្រង Profile, Comments និងកាតហាង',
    descriptionEn: 'Distinguished golden VIP badge on your profile, comments, reviews, and restaurant listings.',
    iconName: 'Crown',
    category: 'profile'
  },
  {
    id: 5,
    titleKh: 'ទីតាំងផ្សព្វផ្សាយពិសេស (Additional Promotional Placement)',
    titleEn: 'Additional Promotional Placement',
    descriptionKh: 'ទទួលបានការផ្សព្វផ្សាយលើគេក្នុងទំព័រដើម Home Screen និងបញ្ជី Top Recommended',
    descriptionEn: 'Prime featured spot on the home page carousel and top recommendations section.',
    iconName: 'Flame',
    category: 'promotion'
  },
  {
    id: 6,
    titleKh: 'ទីតាំងច្បាស់លាស់លើផែនទី (Restaurant Location on Map)',
    titleEn: 'Restaurant Location on the Map',
    descriptionKh: 'សម្គាល់ទីតាំងហាងដោយ Pin ពណ៌មាសលើផែនទី GPS និងប៊ូតុងនាំផ្លូវ 1-Tap Directions',
    descriptionEn: 'Highlighted golden map pin with instant turn-by-turn navigation for visitors.',
    iconName: 'MapPin',
    category: 'reach'
  },
  {
    id: 7,
    titleKh: 'ប៊ូតុងទាក់ទងរហ័ស (Quick Contact Buttons)',
    titleEn: 'Quick Contact Buttons',
    descriptionKh: 'ប៊ូតុងទាក់ទងរហ័ស ហៅទូរស័ព្ទ (Call), Telegram និង Facebook ដោយផ្ទាល់លើកាតហាង',
    descriptionEn: 'One-tap direct contact buttons for Phone Call, Telegram chat, and Facebook page.',
    iconName: 'Zap',
    category: 'reach'
  },
  {
    id: 8,
    titleKh: 'ស្ថិតិអ្នកចូលទស្សនា & ចុចមើល (Profile View & Click Statistics)',
    titleEn: 'Profile View & Contact Click Statistics',
    descriptionKh: 'ផ្ទាំងគ្រប់គ្រងមើលចំនួនអ្នកទស្សនាហាង ចំនួនអ្នកចុច Call និងចំនួនអ្នកចុច Map',
    descriptionEn: 'Detailed real-time analytics dashboard on visitor views, calls, and direction clicks.',
    iconName: 'BarChart3',
    category: 'analytics'
  },
  {
    id: 9,
    titleKh: 'តំណភ្ជាប់ចែករំលែកផ្ទាល់ (Shareable Restaurant Profile Link)',
    titleEn: 'Shareable Restaurant Profile Link',
    descriptionKh: 'តំណភ្ជាប់ Deep Link ផ្ទាល់ខ្លួន ចម្លង និងចែករំលែកទៅបណ្តាញសង្គម Telegram និង Facebook',
    descriptionEn: 'Direct custom deep-link to share your profile across Telegram, Facebook, and WhatsApp.',
    iconName: 'Share2',
    category: 'reach'
  },
  {
    id: 10,
    titleKh: 'ចំណាត់ថ្នាក់ខ្ពស់ក្នុងការស្វែងរក (Improved Search Visibility)',
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
  | 'specialty';

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
    nameKh: 'សម្ល (Samlor & Curries)',
    shortNameKh: 'សម្ល',
    nameEn: 'Samlor & Curries',
    subtitleKh: 'សម្លខ្មែរ សម្លកកូរ សម្លការី សម្លម្ជូរ អាម៉ុក ប្រហុកខ្ទិះ និងខ',
    subtitleEn: 'Traditional Khmer Samlor, Curries, Amok, Stews & Braised Dishes',
    emoji: '🍲'
  },
  {
    id: 'cha',
    order: 2,
    nameKh: 'ឆា (Stir-Fry & Savory)',
    shortNameKh: 'ឆា',
    nameEn: 'Stir-Fry & Savory',
    subtitleKh: 'ម្ហូបឆា ឡុកឡាក់ ឆាគ្រឿង ឆាក្តៅ មីឆា បាយឆា និងម្ហូបអាំង/ញាំ',
    subtitleEn: 'Wok Stir-Fries, Lok Lak, Fried Noodles/Rice, Grilled & Salads',
    emoji: '🥘'
  },
  {
    id: 'sngor',
    order: 3,
    nameKh: 'ស្ងោរ (Boiled Soups & Broths)',
    shortNameKh: 'ស្ងោរ',
    nameEn: 'Boiled Soups & Broths',
    subtitleKh: 'ស្ងោរជ្រក់ ស្ងោរម្រះ ស្ងោរង៉ាំង៉ូវ ស៊ុប បបរ និងគុយទាវទឹក',
    subtitleEn: 'Clear Boiled Soups, Herbal Broths, Hotpots, Porridges & Noodle Soups',
    emoji: '🥣'
  },
  {
    id: 'bong_aem',
    order: 4,
    nameKh: 'បង្អែម (Khmer Desserts)',
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

  // 2. Check Desserts & Traditional Sweet Cakes
  if (slug === 'dessert') {
    return 'bong_aem';
  }
  if (slug === 'cake') {
    // Savory street cakes like បាញ់ឆែវ, នំប៉័ងប៉ាតេ, គួង, ណែម go to 'cha' (savory/pan-fried), while sweet cakes go to 'bong_aem'
    if (kh.includes('បាញ់ឆែវ') || kh.includes('បាញ់ហយ') || kh.includes('នំប៉័ង') || kh.includes('គួង') || kh.includes('ណែម') || kh.includes('គូឆាយ')) {
      return 'cha';
    }
    return 'bong_aem';
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

export interface Restaurant {
  id: string;
  nameKh: string;
  nameEn: string;
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

// Helper to identify built-in seed restaurants (rest-1 to rest-250) vs user custom/VIP restaurants
export const isSeedRestaurantId = (id: string | number): boolean => {
  const str = String(id || '');
  const match = str.match(/^rest-(\d+)$/);
  if (!match) return false;
  const num = parseInt(match[1], 10);
  return num >= 1 && num <= 250;
};

export const isCustomRestaurant = (restaurant?: Restaurant | null): boolean => {
  if (!restaurant || !restaurant.id) return false;
  return !isSeedRestaurantId(restaurant.id);
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
  const expiryTime = new Date(restaurant.membershipExpiresAt).getTime();
  return !isNaN(expiryTime) && expiryTime > Date.now();
};

export type VipAccountState = 'admin' | 'approved_vip' | 'pending_vip' | 'expired_vip' | 'regular_unpaid';

// Helper to determine if a user has an active, admin-approved Premium VIP subscription (Admin always has lifetime active VIP)
export const isUserVipActive = (user?: User | null): boolean => {
  if (!user) return false;
  // System Admin always has lifetime active VIP access
  if (
    user.role === 'admin' || 
    user.id === 'admin-authorized-single' || 
    user.username === 'admin' || 
    user.username === 'cheasavuth'
  ) {
    return true;
  }
  if (user.isDisabled) {
    return false;
  }
  // VIP users must meet ALL criteria:
  // 1. Membership tier must be 'premium_vip'
  // 2. Subscription status must be 'active' (NOT pending, NOT expired, NOT cancelled)
  // 3. Payment status must be 'verified' (approved by admin / verified payment)
  // 4. Must have a valid subscriptionExpiryDate strictly in the future (> Date.now())
  if (
    user.membershipTier === 'premium_vip' &&
    user.subscriptionStatus === 'active' &&
    user.paymentStatus === 'verified' &&
    user.subscriptionExpiryDate
  ) {
    const expiryTime = new Date(user.subscriptionExpiryDate).getTime();
    if (!isNaN(expiryTime) && expiryTime > Date.now()) {
      return true;
    }
  }
  return false;
};

// Helper to classify user's exact VIP state (Admin, Approved VIP, Pending Admin Approval, Expired VIP, or Regular Unpaid)
export const getVipAccountState = (user?: User | null): VipAccountState => {
  if (!user) return 'regular_unpaid';
  if (
    user.role === 'admin' || 
    user.id === 'admin-authorized-single' || 
    user.username === 'admin' || 
    user.username === 'cheasavuth'
  ) {
    return 'admin';
  }
  if (isUserVipActive(user)) {
    return 'approved_vip';
  }
  // Check if expired
  if (user.subscriptionExpiryDate) {
    const expiryTime = new Date(user.subscriptionExpiryDate).getTime();
    if (!isNaN(expiryTime) && expiryTime <= Date.now()) {
      return 'expired_vip';
    }
  }
  if (user.subscriptionStatus === 'expired') {
    return 'expired_vip';
  }
  // Check if pending verification/approval
  if (
    user.subscriptionStatus === 'pending' ||
    user.paymentStatus === 'paid_pending_approval' ||
    user.paymentStatus === 'pending_verification' ||
    user.paymentStatus === 'needs_more_info'
  ) {
    return 'pending_vip';
  }
  return 'regular_unpaid';
};

// Helper to calculate remaining days in VIP subscription
export const getVipRemainingDays = (user?: User | null): number => {
  if (!user) return 0;
  if (
    user.role === 'admin' || 
    user.id === 'admin-authorized-single' || 
    user.username === 'admin' || 
    user.username === 'cheasavuth'
  ) {
    return 9999;
  }
  if (!isUserVipActive(user) || !user?.subscriptionExpiryDate) return 0;
  const diffMs = new Date(user.subscriptionExpiryDate).getTime() - Date.now();
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
  | 'unusual_local';

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

export interface CommentItem {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  titleKh: string;
  descriptionKh: string;
  photoUrl: string;
  categoryTag: string;
  locationName: string;
  likesCount: number;
  likedByUserIds: string[];
  comments: CommentItem[];
  createdAt: string;
  status: 'approved' | 'pending' | 'flagged';
}

export interface ReportedItem {
  id: string;
  postId: string;
  reason: string;
  reporterName: string;
  createdAt: string;
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
  const isObsoleteLegacyDefault =
    Number(s.settingsVersion || 0) < 13 &&
    (Number(s.vipShortPriceUsd) === 2.99 || Number(s.vipLongPriceUsd) === 4.99);

  const shortDays =
    !isObsoleteLegacyDefault && typeof s.vipShortDurationDays === 'number' && s.vipShortDurationDays >= 1
      ? Math.round(s.vipShortDurationDays)
      : VIP_QUARTERLY_DAYS;
  const shortPrice =
    !isObsoleteLegacyDefault && typeof s.vipShortPriceUsd === 'number' && s.vipShortPriceUsd > 0
      ? Math.round(s.vipShortPriceUsd * 100) / 100
      : VIP_QUARTERLY_PRICE_USD;
  const shortNameKh = (s.vipShortNameKh || '').trim() || `VIP ${shortDays} ថ្ងៃ`;
  const shortNameEn = (s.vipShortNameEn || '').trim() || `VIP ${shortDays} Days`;

  const longDays =
    !isObsoleteLegacyDefault && typeof s.vipLongDurationDays === 'number' && s.vipLongDurationDays >= 1
      ? Math.round(s.vipLongDurationDays)
      : VIP_SUBSCRIPTION_DAYS;
  const longPrice =
    !isObsoleteLegacyDefault && typeof s.vipLongPriceUsd === 'number' && s.vipLongPriceUsd > 0
      ? Math.round(s.vipLongPriceUsd * 100) / 100
      : VIP_ANNUAL_PRICE_USD;
  const longNameKh = (s.vipLongNameKh || '').trim() || `VIP ${longDays} ថ្ងៃ`;
  const longNameEn = (s.vipLongNameEn || '').trim() || `VIP ${longDays} Days`;

  return {
    quarterly: {
      id: 'quarterly',
      nameEn: shortNameEn,
      nameKh: shortNameKh,
      priceUsd: shortPrice,
      durationDays: shortDays,
      labelEn: `${shortNameEn} ($${shortPrice.toFixed(2)} / ${shortDays} days)`,
      labelKh: `${shortNameKh} ($${shortPrice.toFixed(2)} / ${shortDays} ថ្ងៃ)`,
      priceKhrDisplay: `${Math.round(shortPrice * 4100).toLocaleString()} រៀល`,
    },
    annual: {
      id: 'annual',
      nameEn: longNameEn,
      nameKh: longNameKh,
      priceUsd: longPrice,
      durationDays: longDays,
      labelEn: `${longNameEn} ($${longPrice.toFixed(2)} / ${longDays} days)`,
      labelKh: `${longNameKh} ($${longPrice.toFixed(2)} / ${longDays} ថ្ងៃ)`,
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
  if (typeof s.additionalStoreFeeUsd === 'number' && s.additionalStoreFeeUsd >= 0) {
    return Math.round(s.additionalStoreFeeUsd * 100) / 100;
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
  const includedFreeBase =
    typeof s.includedFreeStoresPerVip === 'number' && s.includedFreeStoresPerVip >= 1
      ? Math.round(s.includedFreeStoresPerVip)
      : DEFAULT_INCLUDED_FREE_STORES;

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

  const userEmailLower = (user.email || '').toLowerCase().trim();
  const userPhoneClean = (user.phone || '').replace(/[\s-+]/g, '');

  const ownedStores = Array.isArray(restaurants)
    ? restaurants.filter((r) => {
        if (!r || isSeedRestaurantId(r.id)) return false;
        if (r.ownerId && r.ownerId === user.id) return true;
        if (userEmailLower && r.ownerEmail && r.ownerEmail.toLowerCase().trim() === userEmailLower) {
          return true;
        }
        return false;
      })
    : [];

  const userAdditionalTxns = Array.isArray(transactions)
    ? transactions.filter((t) => {
        if (!t || t.type !== 'additional_store_slot') return false;
        if (t.userId === user.id || t.ownerId === user.id) return true;
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

  const paidAdditionalStoreSlots = Math.max(
    typeof user.paidAdditionalStoreSlots === 'number' ? user.paidAdditionalStoreSlots : 0,
    verifiedAdditionalStoreTransactions.length
  );

  const includedFreeStores = isAdmin ? 9999 : isVipActive ? includedFreeBase : 0;
  const totalAllowedStores = isAdmin
    ? 9999
    : isVipActive
    ? includedFreeStores + paidAdditionalStoreSlots
    : 0;
  const usedStoresCount = ownedStores.length;
  const remainingAvailableSlots = Math.max(0, totalAllowedStores - usedStoresCount);
  const canCreateNewStoreWithoutPayment = isAdmin || (isVipActive && remainingAvailableSlots > 0);
  const canReplaceExistingStoreForFree = isAdmin || (isVipActive && usedStoresCount > 0);
  const canEditExistingFree = isAdmin || isVipActive;

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

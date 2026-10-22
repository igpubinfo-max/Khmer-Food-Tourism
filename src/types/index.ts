export const APP_VERSION = 'v1.7.7';
export const APP_VERSION_NAME = '1.7.7';
export const APP_BUILD_CODE = 49;
export const APP_RELEASE_DATE = '2026-10-23';

export const VIP_ANNUAL_PRICE_USD = 4.99;
export const VIP_SUBSCRIPTION_DAYS = 90;
export const VIP_QUARTERLY_PRICE_USD = 2.99;
export const VIP_QUARTERLY_DAYS = 30;

export interface VipPlanConfig {
  id: 'quarterly' | 'annual';
  nameEn: string;
  nameKh: string;
  priceUsd: number;
  durationDays: 30 | 90;
  labelEn: string;
  labelKh: string;
}

export const VIP_PLANS: Record<'quarterly' | 'annual', VipPlanConfig> = {
  quarterly: {
    id: 'quarterly',
    nameEn: 'VIP 30 Days',
    nameKh: 'កញ្ចប់ VIP 30 ថ្ងៃ',
    priceUsd: 2.99,
    durationDays: 30,
    labelEn: 'VIP 30 Days ($2.99 / 30 days)',
    labelKh: 'VIP 30 ថ្ងៃ ($2.99 / 30 ថ្ងៃ)'
  },
  annual: {
    id: 'annual',
    nameEn: 'VIP 90 Days',
    nameKh: 'កញ្ចប់ VIP 90 ថ្ងៃ',
    priceUsd: 4.99,
    durationDays: 90,
    labelEn: 'VIP 90 Days ($4.99 / 90 days)',
    labelKh: 'VIP 90 ថ្ងៃ ($4.99 / 90 ថ្ងៃ)'
  }
};

export type Language = 'km' | 'en';

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

  // Premium VIP Subscription ($2.99 for 30 days or $4.99 for 90 days)
  membershipTier?: 'free' | 'premium_vip';
  subscriptionStartDate?: string;
  subscriptionExpiryDate?: string;
  subscriptionStatus?: 'active' | 'expired' | 'pending' | 'cancelled';
  paymentStatus?: 'verified' | 'pending_verification' | 'needs_more_info' | 'failed' | 'cancelled' | 'paid_pending_approval' | 'waiting_for_payment';
  paymentMethod?: 'GooglePlayBilling' | 'KHQR' | 'Bakong' | 'Card' | 'Manual' | 'BankTransfer';
  transactionRef?: string;
  autoRenew?: boolean;

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
  iconName: string;
  category: 'profile' | 'promotion' | 'reach' | 'analytics';
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
  createdAt: string;
  updatedAt?: string;
}

export type TransactionType = 'restaurant_registration' | 'user_vip_upgrade';

export interface RegistrationTransaction {
  id: string; // e.g. "TXN-20261020-001" or "TXN-VIP-20261021-001"
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
  planType?: 'quarterly' | 'annual';
  amountUsd: number;
  currency?: 'USD' | 'KHR';
  durationDays?: number; // 30 or 90 days
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
  signatureDishesKh: string[];
  ownerId?: string;
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

// Helper to determine if a restaurant has an active Premium membership
export const isRestaurantPremiumActive = (restaurant?: Restaurant | null): boolean => {
  if (!restaurant) return false;
  if (restaurant.membershipTier !== 'premium') return false;
  if (!restaurant.membershipExpiresAt) return false;
  return new Date(restaurant.membershipExpiresAt).getTime() > Date.now();
};

// Helper to determine if a user has an active Premium VIP subscription
export const isUserVipActive = (user?: User | null): boolean => {
  if (!user) return false;
  if (user.membershipTier !== 'premium_vip') return false;
  if (!user.subscriptionExpiryDate) return false;
  return new Date(user.subscriptionExpiryDate).getTime() > Date.now();
};

// Helper to calculate remaining days in VIP subscription
export const getVipRemainingDays = (user?: User | null): number => {
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
  messageKh: string;
  messageEn: string;
  type: 'promo' | 'new_spot' | 'discount' | 'system';
  date: string;
  isRead: boolean;
  targetType?: 'restaurant' | 'destination' | 'food';
  targetId?: string;
  discountPercent?: number;
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
  paymentPlanId: 'quarterly' | 'annual';
  paymentPlanLabel: string; // "VIP 30 Days ($2.99)" or "VIP 90 Days ($4.99)"
  amountUsd: number;
  durationDays: 30 | 90;
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
}

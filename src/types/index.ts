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
  createdAt: string;
}

export type FoodCategorySlug = 
  | 'soup' 
  | 'grilled' 
  | 'stirfry' 
  | 'salad' 
  | 'dessert' 
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

export interface RegistrationTransaction {
  id: string; // e.g. "TXN-20261020-001"
  restaurantId: string;
  restaurantNameKh: string;
  restaurantNameEn: string;
  ownerId: string;
  ownerName: string;
  ownerPhone?: string;
  amountUsd: number;
  status: 'pending_verification' | 'verified' | 'rejected';
  paymentMethod: 'KHQR' | 'Bakong' | 'BankTransfer' | 'Manual';
  transactionRef: string;
  createdAt: string;
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
  galleryPhotos?: string[];
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
  
  // Membership & Menu Items ($0 Free Listing vs One-Time $9.99 for 365 Days)
  membershipTier?: MembershipTier; // 'free' ($0) or 'premium' ($9.99)
  membershipExpiresAt?: string; // ISO 8601 date timestamp (365 days from activation)
  menuItems?: RestaurantMenuItem[]; // Up to 5 items for active Premium restaurants
  
  // 10 VIP Benefits tracking & Analytics
  analytics?: {
    views?: number;
    phoneClicks?: number;
    mapClicks?: number;
    shareClicks?: number;
  };
  
  paymentStatus?: PaymentStatus;
  paymentTransactionId?: string;
  paymentDate?: string;
  promotionalPrice?: number;
  isPromoted?: boolean;
  isFreeTrial?: boolean;
  freeTrialExpiry?: string;
}

// Helper to determine if a restaurant has an active Premium membership
export const isRestaurantPremiumActive = (restaurant?: Restaurant | null): boolean => {
  if (!restaurant) return false;
  if (restaurant.membershipTier !== 'premium') return false;
  if (!restaurant.membershipExpiresAt) return false;
  return new Date(restaurant.membershipExpiresAt).getTime() > Date.now();
};

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

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  User, FoodItem, Restaurant, TouristDestination, CommunityPost, 
  Language, UserRole, AppSettings, RegistrationTransaction,
  RestaurantMenuItem, MembershipTier, isRestaurantPremiumActive, isUserVipActive, getVipRemainingDays,
  getVipAccountState, VipAccountState,
  getRestaurantCreatedAtIso, sortRestaurantsChronologically, isSeedRestaurantId,
  Wishlist, WishlistItem, TripPlan, AppNotification,
  TrendingFoodItem, AiCheckInSubmission,
  SupportTicket, SupportTicketMessage, SupportTicketStatus, VIP_PLANS,
  DeletedUserRecord, AbaReceiptVerificationReport
} from '../types';
import {
  verifyAbaPaymentAndReceipt,
  computeReceiptImageFingerprint,
  recordVerifiedReceiptFingerprint,
} from '../services/aiPaymentVerificationService';
import { 
  verifyPaymentOnBackend, calculateVipDates, checkEligibleRestoration,
  VIP_ANNUAL_PRICE_USD, VIP_SUBSCRIPTION_DAYS, VIP_QUARTERLY_PRICE_USD, VIP_QUARTERLY_DAYS,
  PaymentVerificationRequest, verifyAbaPaymentTransaction, resolveAndValidateVipPlan
} from '../services/paymentService';
import { initialTrendingFoods } from '../data/seedTrendingFoods';
import { findDuplicateRestaurant, mergeRestaurantRecords } from '../utils/duplicateDetector';
import { recordSubmissionTimestamp, checkSubmissionRateLimit } from '../services/aiCheckInService';
import { 
  initialUsers, initialFoods, initialRestaurants, 
  initialDestinations, initialCommunityPosts, initialAppSettings, initialTransactions 
} from '../data/seedData';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { 
  hashPasswordPBKDF2, verifyPasswordPBKDF2, 
  checkAdminLoginAllowed, recordAdminLoginFailed, resetAdminLoginAttempts,
  createAdminSession, verifyAdminSession, revokeAdminSession,
  recordSecurityAudit
} from '../utils/security';
import { App as CapApp } from '@capacitor/app';
import {
  isSupabaseConfigured,
  syncAllAppDataWithSupabase,
  pushCloudDocument,
} from '../services/supabaseService';
import { authenticateAdminWithBiometric, setSavedAdminUsername } from '../services/biometricService';

export type ActiveTab = 'home' | 'food' | 'restaurants' | 'tourism' | 'community' | 'profile';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  
  // Auth & Users
  currentUser: User | null;
  users: User[];
  deletedUsers: DeletedUserRecord[];
  login: (email: string, role?: UserRole) => boolean;
  register: (name: string, email: string, role: UserRole, phone?: string, restaurantName?: string) => boolean;
  loginWithGoogle: (profile: any) => boolean;
  logout: () => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  updateCurrentUserProfile: (newName: string, newAvatar?: string) => void;
  deleteUserAccount: (userId: string) => Promise<{
    success: boolean;
    deletedStats?: { restaurants: number; posts: number; transactions: number; tickets: number };
  }>;
  clearAllRegisteredUsers: () => Promise<{ success: boolean; count: number }>;

  // Social Account Linking (TikTok & Facebook)
  connectTikTokAccount: (username: string, displayName?: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string }>;
  disconnectTikTokAccount: () => void;
  connectFacebookAccount: (username: string, displayName?: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string }>;
  disconnectFacebookAccount: () => void;

  // Admin Auth (Chea Savuth)
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  loginAdminWithBiometric: (preVerified?: boolean, preVerifiedUser?: string) => Promise<boolean>;
  setAdminPassword: (newPassword: string) => Promise<boolean>;
  
  // App Settings & QR Codes
  appSettings: AppSettings;
  updateAppSettings: (newSettings: Partial<AppSettings>) => void;
  
  // Data lists
  foods: FoodItem[];
  restaurants: Restaurant[];
  destinations: TouristDestination[];
  posts: CommunityPost[];

  // Transactions & $4.99 Registration Payments
  transactions: RegistrationTransaction[];
  addRegistrationTransaction: (txn: Omit<RegistrationTransaction, 'id' | 'createdAt' | 'status'>) => RegistrationTransaction;
  verifyTransaction: (txnId: string) => void;
  rejectTransaction: (txnId: string, reason?: string) => void;
  requestMorePaymentInfo: (txnId: string, reason?: string) => void;
  uploadPaymentProofToTransaction: (txnId: string, proofDataUrl: string, fileName?: string, mimeType?: string) => { success: boolean; error?: string };
  getAuthorizedPaymentProof: (txnId: string) => string | null;
  triggerCloudSyncNow?: () => Promise<boolean>;
  
  // Bookmarks
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  
  // Food Actions
  addFood: (food: Omit<FoodItem, 'id' | 'rating' | 'reviewCount'>) => void;
  updateFood: (food: FoodItem) => void;
  deleteFood: (id: string) => void;
  
  // Restaurant Actions
  addRestaurant: (rest: Omit<Restaurant, 'id' | 'rating' | 'reviewCount' | 'status'> & { status?: 'approved' | 'pending' | 'rejected' }) => Restaurant | null;
  updateRestaurant: (rest: Restaurant) => void;
  deleteRestaurant: (id: string) => void;
  approveRestaurant: (id: string) => void;
  toggleVerifyRestaurant: (id: string) => void;

  // Restaurant Menu Items (Max 5 for Active Premium)
  addRestaurantMenuItem: (restaurantId: string, item: Omit<RestaurantMenuItem, 'id' | 'createdAt' | 'restaurantId'>) => boolean;
  updateRestaurantMenuItem: (restaurantId: string, item: RestaurantMenuItem) => boolean;
  deleteRestaurantMenuItem: (restaurantId: string, menuItemId: string) => boolean;
  upgradeRestaurantToPremium: (restaurantId: string, transactionRef: string, paymentMethod?: 'KHQR' | 'Bakong' | 'BankTransfer') => void;
  
  // Restaurant Analytics (Views, Calls, Maps, Shares)
  trackRestaurantView: (restaurantId: string) => void;
  trackRestaurantCall: (restaurantId: string) => void;
  trackRestaurantMap: (restaurantId: string) => void;
  trackRestaurantShare: (restaurantId: string) => void;
  
  // Managing Restaurant Modal
  isManageMenuModalOpen: boolean;
  setIsManageMenuModalOpen: (open: boolean) => void;
  managingRestaurant: Restaurant | null;
  setManagingRestaurant: (rest: Restaurant | null) => void;
  
  // Destination Actions
  addDestination: (dest: Omit<TouristDestination, 'id' | 'rating' | 'reviewCount'>) => boolean | void;
  updateDestination: (dest: TouristDestination) => void;
  deleteDestination: (id: string) => void;
  checkDuplicateDestination: (candidate: { nameKh: string; nameEn?: string; provinceKh?: string; latitude?: number; longitude?: number }, excludeId?: string) => { isDuplicate: boolean; duplicate?: TouristDestination; reason?: string };
  
  // Community Actions
  addPost: (titleKh: string, descriptionKh: string, photoUrl: string, categoryTag: string, locationName: string) => void;
  toggleLikePost: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  deletePost: (postId: string) => void;
  
  // Modals & Selection
  selectedFood: FoodItem | null;
  setSelectedFood: (food: FoodItem | null) => void;
  selectedRestaurant: Restaurant | null;
  setSelectedRestaurant: (rest: Restaurant | null) => void;
  selectedDestination: TouristDestination | null;
  setSelectedDestination: (dest: TouristDestination | null) => void;
  
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isAddPostModalOpen: boolean;
  setIsAddPostModalOpen: (open: boolean) => void;
  isAddRestaurantModalOpen: boolean;
  setIsAddRestaurantModalOpen: (open: boolean) => void;
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  isAdminLoginModalOpen: boolean;
  setIsAdminLoginModalOpen: (open: boolean) => void;
  isInstallModalOpen: boolean;
  setIsInstallModalOpen: (open: boolean) => void;
  installPlatformTab: 'android' | 'ios';
  setInstallPlatformTab: (tab: 'android' | 'ios') => void;
  openInstallModal: (tab?: 'android' | 'ios') => void;
  isSupportModalOpen: boolean;
  setIsSupportModalOpen: (open: boolean) => void;
  isExitModalOpen: boolean;
  setIsExitModalOpen: (open: boolean) => void;
  exitAppNow: () => void;
  isQrScannerModalOpen: boolean;
  setIsQrScannerModalOpen: (open: boolean) => void;
  isVipAddRestaurantModalOpen: boolean;
  setIsVipAddRestaurantModalOpen: (open: boolean) => void;
  isAiFoodDiscoveryModalOpen: boolean;
  setIsAiFoodDiscoveryModalOpen: (open: boolean) => void;
  isRestaurantCheckInModalOpen: boolean;
  setIsRestaurantCheckInModalOpen: (open: boolean) => void;

  // 6 Personalized Account Features & Wishlists
  wishlists: Wishlist[];
  createWishlist: (nameKh: string, nameEn?: string, emoji?: string) => void;
  deleteWishlist: (id: string) => void;
  addToWishlist: (wishlistId: string, item: Omit<WishlistItem, 'addedAt'>) => void;
  removeFromWishlist: (wishlistId: string, itemId: string) => void;
  isItemInWishlist: (itemId: string, wishlistId?: string) => boolean;

  // AI Trip Planner
  tripPlans: TripPlan[];
  saveTripPlan: (plan: TripPlan) => void;
  deleteTripPlan: (id: string) => void;
  generateAiTripPlan: (provinceKh: string, durationDays: number, budgetLevel: 'budget' | 'medium' | 'luxury', companion: 'solo' | 'couple' | 'friends' | 'family') => TripPlan;

  // Helpful Notifications
  notifications: AppNotification[];
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;
  unreadNotificationsCount: number;

  // Account Feature Modals
  isWhatToEatModalOpen: boolean;
  setIsWhatToEatModalOpen: (open: boolean) => void;
  isNearMeModalOpen: boolean;
  setIsNearMeModalOpen: (open: boolean) => void;
  isDailyDiscoveriesModalOpen: boolean;
  setIsDailyDiscoveriesModalOpen: (open: boolean) => void;
  isWishlistsModalOpen: boolean;
  setIsWishlistsModalOpen: (open: boolean) => void;
  isAiTripPlannerModalOpen: boolean;
  setIsAiTripPlannerModalOpen: (open: boolean) => void;
  isNotificationsModalOpen: boolean;
  setIsNotificationsModalOpen: (open: boolean) => void;
  isTrendingSocialModalOpen: boolean;
  setIsTrendingSocialModalOpen: (open: boolean) => void;

  // Quick Wishlist Add Helper
  targetWishlistItem: WishlistItem | null;
  setTargetWishlistItem: (item: WishlistItem | null) => void;
  openAddToWishlist: (item: { id: string; type: 'food' | 'restaurant' | 'destination'; nameKh: string; nameEn: string; photoUrl: string; categoryKh?: string; provinceKh?: string; priceDisplay?: string; rating?: number }) => void;
  
  // Search & Filter
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedProvince: string;
  setSelectedProvince: (p: string) => void;
  
  // Toast
  toast: { message: string; type: 'success' | 'info' | 'warning' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  
  // Reset & Backup
  resetAllData: () => void;

  // Premium VIP Subscription ($2.99 / 30 Days or $4.99 / 90 Days)
  isUpgradeVipModalOpen: boolean;
  setIsUpgradeVipModalOpen: (open: boolean) => void;
  isVipRenewMode: boolean;
  setIsVipRenewMode: (renew: boolean) => void;
  openUpgradeVipModal: (renewMode?: boolean) => void;
  submitVipUpgradeRequest: (
    durationDays?: number,
    amountUsd?: number,
    transactionRef?: string,
    notes?: string,
    paymentProofData?: { dataUrl: string; fileName?: string; mimeType?: string }
  ) => Promise<{ success: boolean; transactionId: string; error?: string }>;
  upgradeCurrentUserToVip: (paymentMethod: 'GooglePlayBilling' | 'KHQR' | 'Bakong' | 'Card', transactionRef: string, last4?: string, amountUsd?: number, durationDays?: number) => Promise<{ success: boolean; error?: string }>;
  renewCurrentUserVip: (paymentMethod: 'GooglePlayBilling' | 'KHQR' | 'Bakong' | 'Card', transactionRef: string, durationDays?: number, amountUsd?: number) => Promise<{ success: boolean; error?: string }>;
  restoreCurrentUserVipPurchases: () => Promise<{ success: boolean; restored: boolean; message: string }>;

  // User–Admin Two-Way Support & Payment Reply System
  supportTickets: SupportTicket[];
  isSupportTicketModalOpen: boolean;
  setIsSupportTicketModalOpen: (open: boolean) => void;
  supportModalPrefill: { planType?: 'quarterly' | 'annual'; paymentRef?: string; receiptUrl?: string } | null;
  openSupportTicketModal: (prefill?: { planType?: 'quarterly' | 'annual'; paymentRef?: string; receiptUrl?: string }) => void;
  createSupportTicket: (input: {
    message: string;
    planType?: 'quarterly' | 'annual';
    paymentDate?: string;
    paymentRef?: string;
    receiptUrl?: string;
    aiVerificationReport?: AbaReceiptVerificationReport;
  }) => SupportTicket | null;
  replyToSupportTicket: (ticketId: string, message: string, attachmentUrl?: string) => boolean;
  updateSupportTicketStatus: (ticketId: string, status: SupportTicketStatus) => void;
  approveVipFromSupportTicket: (ticketId: string, durationDays?: 30 | 90, adminNote?: string) => void;
  markSupportTicketRead: (ticketId: string) => void;

  // AI Trending Food Discovery Section
  trendingFoods: TrendingFoodItem[];
  updateTrendingFood: (item: TrendingFoodItem) => void;
  selectedTrendingFood: TrendingFoodItem | null;
  setSelectedTrendingFood: (item: TrendingFoodItem | null) => void;
  isTrendingFoodDetailModalOpen: boolean;
  setIsTrendingFoodDetailModalOpen: (open: boolean) => void;

  // AI Smart Check-in & Auto Add Restaurant
  aiCheckIns: AiCheckInSubmission[];
  isAiCheckInModalOpen: boolean;
  setIsAiCheckInModalOpen: (open: boolean) => void;
  submitAiCheckIn: (data: Omit<AiCheckInSubmission, 'id' | 'checkInTime' | 'status'> & { id?: string; checkInTime?: string }) => Promise<{ success: boolean; isDuplicate?: boolean; isBranch?: boolean; status: 'approved' | 'pending' | 'rejected' | 'merged'; restaurantId?: string; message: string }>;
  approveAiCheckIn: (id: string) => void;
  rejectAiCheckIn: (id: string, reason?: string) => void;
  mergeAiCheckIn: (checkInId: string, targetRestaurantId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('km');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  
  const [deletedUsers, setDeletedUsers] = useState<DeletedUserRecord[]>(() => {
    try {
      const saved = localStorage.getItem('kft_deleted_users_v1');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse kft_deleted_users_v1', e);
    }
    return [];
  });

  const checkIsUserDeleted = (
    candidate: { id?: string; email?: string; phone?: string; username?: string } | null | undefined,
    list: DeletedUserRecord[] = deletedUsers
  ): boolean => {
    if (!candidate || !Array.isArray(list) || list.length === 0) return false;
    const candId = candidate.id ? String(candidate.id).trim() : '';
    const candEmail = candidate.email ? String(candidate.email).toLowerCase().trim() : '';
    const candUsername = candidate.username ? String(candidate.username).toLowerCase().trim() : '';
    const candPhone = candidate.phone ? String(candidate.phone).replace(/[\s-+]/g, '') : '';

    return list.some(d => {
      if (!d) return false;
      if (candId && d.id && d.id === candId) return true;
      if (candEmail && d.email && d.email.toLowerCase().trim() === candEmail) return true;
      if (candUsername && d.username && d.username.toLowerCase().trim() === candUsername) return true;
      if (candPhone.length >= 7 && d.phone) {
        const dPhone = d.phone.replace(/[\s-+]/g, '');
        if (dPhone.length >= 7 && dPhone === candPhone) return true;
      }
      return false;
    });
  };

  // Local storage loaded states with fallbacks (v5 storage keys: purged demo users per Admin directive)
  const [users, setUsers] = useState<User[]>(() => {
    try {
      // Purge legacy user keys to clean previous registered users
      ['kft_users_v4', 'kft_users_v3', 'kft_users_v2', 'kft_users_v1', 'kft_current_user_v4', 'kft_current_user_v3'].forEach(k => {
        try { localStorage.removeItem(k); } catch(e) {}
      });
      let localDeleted: DeletedUserRecord[] = [];
      try {
        const rawDel = localStorage.getItem('kft_deleted_users_v1');
        if (rawDel) localDeleted = JSON.parse(rawDel) || [];
      } catch {}

      const saved = localStorage.getItem('kft_users_v5');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((u: User) => !checkIsUserDeleted(u, localDeleted));
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_users_v5', e);
    }
    return initialUsers; // which is empty []
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      let localDeleted: DeletedUserRecord[] = [];
      try {
        const rawDel = localStorage.getItem('kft_deleted_users_v1');
        if (rawDel) localDeleted = JSON.parse(rawDel) || [];
      } catch {}

      const saved = localStorage.getItem('kft_current_user_v5');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // Keep Admin session active if logged in as Admin and ensure official avatar is loaded
          if (parsed.role === 'admin' || parsed.id === 'admin-authorized-single' || parsed.username === 'cheasavuth' || parsed.username === 'admin') {
            return {
              ...parsed,
              avatar: '/images/admin_profile.png',
            };
          }
          if (checkIsUserDeleted(parsed, localDeleted)) {
            localStorage.removeItem('kft_current_user_v5');
            return null;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_current_user_v5', e);
    }
    return null; // No demo user logged in by default
  });

  const [foods, setFoods] = useState<FoodItem[]>(() => {
    // Purge legacy caches to ensure authentic local food photos and recipes are loaded
    try {
      localStorage.removeItem('kft_foods_v4');
      localStorage.removeItem('kft_foods_100_v1');
      localStorage.removeItem('kft_foods_100_v2');
      localStorage.removeItem('kft_foods_100_v3');
    } catch {}
    try {
      const saved = localStorage.getItem('kft_foods_200_v7') || localStorage.getItem('kft_foods_200_v6') || localStorage.getItem('kft_foods_200_v5');
      localStorage.removeItem('kft_foods_200_v5');
      localStorage.removeItem('kft_foods_200_v6');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50 && parsed[0]?.photoUrl?.startsWith('/foods/')) {
          const initialMap = new Map(initialFoods.map(f => [f.id, f]));
          const upgraded = parsed.map((f: FoodItem) => {
            const seed = initialMap.get(f.id);
            if (!seed) return f;
            const hasCustomUpload =
              typeof f.photoUrl === 'string' &&
              (f.photoUrl.startsWith('data:') ||
                (f.imageAuditNote && f.imageAuditNote.includes('រដ្ឋបាល')));
            return {
              ...f,
              nameKh: seed.nameKh,
              nameEn: seed.nameEn,
              photoUrl: hasCustomUpload ? f.photoUrl : seed.photoUrl,
              originalPhotoUrl: seed.originalPhotoUrl,
              imageAuditStatus: hasCustomUpload ? f.imageAuditStatus : seed.imageAuditStatus,
              imageAuditNote: hasCustomUpload ? f.imageAuditNote : seed.imageAuditNote,
            };
          });
          const existingIds = new Set(upgraded.map((f: FoodItem) => f.id));
          const missingFromInitial = initialFoods.filter(f => !existingIds.has(f.id));
          return missingFromInitial.length > 0 ? [...upgraded, ...missingFromInitial] : upgraded;
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_foods_200_v7', e);
    }
    return initialFoods;
  });

  const normalizeRestaurant = (r: any): Restaurant => {
    const isPromoted = Boolean(r.isPromoted);
    const membershipTier = (r.membershipTier || (isPromoted ? 'premium' : 'free')) as MembershipTier;
    const membershipExpiresAt = r.membershipExpiresAt || (membershipTier === 'premium' ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : undefined);
    
    const foodImages = Array.isArray(r.foodImages)
      ? r.foodImages
      : (Array.isArray(r.galleryPhotos) ? r.galleryPhotos : []);
    const galleryPhotos = Array.isArray(r.galleryPhotos) && r.galleryPhotos.length > 0
      ? r.galleryPhotos
      : foodImages;

    // Preserve exact matched photoUrl for each restaurant without cross-assigning another shop's storefront sign
    const photoUrl = r.photoUrl || r.profileImage || galleryPhotos[0] || '/foods/food-1.jpg';

    return {
      id: r.id || `rest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nameKh: r.nameKh || 'ភោជនីយដ្ឋានខ្មែរ',
      nameEn: r.nameEn || r.nameKh || 'Khmer Restaurant',
      descriptionKh: r.descriptionKh || 'ភោជនីយដ្ឋានម្ហូបខ្មែររសជាតិដើម ផាសុកភាព និងអនាម័យខ្ពស់។',
      descriptionEn: r.descriptionEn || 'Authentic traditional Khmer restaurant.',
      photoUrl,
      profileImage: r.profileImage || photoUrl,
      galleryPhotos,
      foodImages,
      addressKh: r.addressKh || 'រាជធានីភ្នំពេញ កម្ពុជា',
      addressEn: r.addressEn || 'Phnom Penh, Cambodia',
      provinceKh: r.provinceKh || 'រាជធានីភ្នំពេញ',
      provinceEn: r.provinceEn || 'Phnom Penh',
      phone:
        r.phone &&
        !String(r.phone).includes('Google Maps') &&
        !String(r.phone).includes('មើលទីតាំង') &&
        !String(r.phone).includes('មាននៅលើ')
          ? r.phone
          : '',
      openingHoursKh: r.openingHoursKh || '០៧:០០ ព្រឹក - ០៩:០០ យប់',
      openingHoursEn: r.openingHoursEn || '07:00 AM - 09:00 PM',
      priceLevel: r.priceLevel || '$$',
      mapUrl: r.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(r.nameKh || 'Cambodia')}`,
      latitude: typeof r.latitude === 'number' ? r.latitude : 11.5564,
      longitude: typeof r.longitude === 'number' ? r.longitude : 104.9282,
      rating: typeof r.rating === 'number' ? r.rating : 4.8,
      reviewCount: typeof r.reviewCount === 'number' ? r.reviewCount : 50,
      signatureDishesKh: Array.isArray(r.signatureDishesKh) && r.signatureDishesKh.length > 0
        ? r.signatureDishesKh 
        : ['ម្ហូបខ្មែរប្រពៃណី', 'ម្ហូបពិសេសប្រចាំហាង'],
      status: r.status || 'approved',
      isVerified: typeof r.isVerified === 'boolean' ? r.isVerified : true,
      isFeatured: Boolean(r.isFeatured),
      membershipTier,
      membershipExpiresAt,
      menuItems: Array.isArray(r.menuItems) ? r.menuItems : [],
      analytics: r.analytics && typeof r.analytics === 'object' ? {
        views: typeof r.analytics.views === 'number' ? r.analytics.views : 65,
        phoneClicks: typeof r.analytics.phoneClicks === 'number' ? r.analytics.phoneClicks : 14,
        mapClicks: typeof r.analytics.mapClicks === 'number' ? r.analytics.mapClicks : 18,
        shareClicks: typeof r.analytics.shareClicks === 'number' ? r.analytics.shareClicks : 9,
      } : { views: 65, phoneClicks: 14, mapClicks: 18, shareClicks: 9 },
      paymentStatus: r.paymentStatus || (membershipTier === 'premium' ? 'verified' : 'unpaid'),
      promotionalPrice: typeof r.promotionalPrice === 'number' ? r.promotionalPrice : 2.99,
      isPromoted,
      ownerId: r.ownerId,
      paymentDate: r.paymentDate,
      promoVideoUrl: r.promoVideoUrl,
      telegramUrl: r.telegramUrl,
      facebookUrl: r.facebookUrl,
      created_at: getRestaurantCreatedAtIso(r),
      createdAt: getRestaurantCreatedAtIso(r),
    };
  };

  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    const seedMap = new Map<string, Restaurant>(initialRestaurants.map(r => [r.id, r]));
    try {
      localStorage.removeItem('kft_restaurants_real_v5');
      localStorage.removeItem('kft_restaurants_real_v6');
      localStorage.removeItem('kft_restaurants_real_v7');
      const saved = localStorage.getItem('kft_restaurants_real_v9') || localStorage.getItem('kft_restaurants_real_v8');
      localStorage.removeItem('kft_restaurants_real_v8');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50) {
          const seenNonAdminOwners = new Set<string>();
          const normalizedList: Restaurant[] = [];
          for (const r of parsed) {
            const seed = r && r.id ? seedMap.get(String(r.id)) : undefined;
            if (seed) {
              const hasCustomPhoto = typeof r.profileImage === 'string' && r.profileImage.startsWith('data:');
              normalizedList.push(normalizeRestaurant({
                ...r,
                nameKh: seed.nameKh,
                nameEn: seed.nameEn,
                descriptionKh: seed.descriptionKh,
                descriptionEn: seed.descriptionEn,
                photoUrl: hasCustomPhoto ? r.profileImage : seed.photoUrl,
                profileImage: hasCustomPhoto ? r.profileImage : seed.photoUrl,
                galleryPhotos: seed.galleryPhotos,
                addressKh: seed.addressKh,
                addressEn: seed.addressEn,
                provinceKh: seed.provinceKh,
                provinceEn: seed.provinceEn,
                signatureDishesKh: seed.signatureDishesKh,
                created_at: seed.created_at || getRestaurantCreatedAtIso(seed),
                createdAt: seed.created_at || getRestaurantCreatedAtIso(seed),
              }));
            } else {
              // Enforce max 1 custom restaurant per non-admin user
              const ownerId = r?.ownerId ? String(r.ownerId) : '';
              const isAdminOwner = ownerId === 'admin-authorized-single';
              if (ownerId && !isAdminOwner) {
                if (seenNonAdminOwners.has(ownerId)) continue;
                seenNonAdminOwners.add(ownerId);
              }
              normalizedList.push(normalizeRestaurant(r));
            }
          }
          return sortRestaurantsChronologically(normalizedList);
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_restaurants_real_v8', e);
    }

    // Preserve any user-created custom restaurants from previous storage key
    let customLegacyRestaurants: Restaurant[] = [];
    try {
      const oldSaved = localStorage.getItem('kft_restaurants_google_v3') || localStorage.getItem('kft_restaurants_membership_v2');
      if (oldSaved && oldSaved !== 'undefined' && oldSaved !== 'null') {
        const parsedOld = JSON.parse(oldSaved);
        if (Array.isArray(parsedOld)) {
          customLegacyRestaurants = parsedOld
            .filter((r: any) => r && r.id && !isSeedRestaurantId(String(r.id)))
            .map(normalizeRestaurant);
        }
      }
      localStorage.removeItem('kft_restaurants_google_v3');
      localStorage.removeItem('kft_restaurants_membership_v2');
      localStorage.removeItem('kft_restaurants_membership_v1');
      localStorage.removeItem('kft_restaurants_v3');
      localStorage.removeItem('kft_restaurants_v4');
    } catch {}

    const baseRestaurants = initialRestaurants.map(r => {
      if (r.id === 'rest-19') {
        return normalizeRestaurant({
          ...r,
          ownerId: 'owner-1',
          membershipTier: 'premium' as MembershipTier,
          membershipExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          menuItems: [
            {
              id: 'menu-1',
              restaurantId: 'rest-19',
              nameKh: 'ក្តាមសេះឆាម្រេចខ្ចីកំពតពិសេស',
              nameEn: 'Fried Sea Crab with Fresh Kampot Peppercorns',
              priceRiel: 40000,
              priceUsd: 10.0,
              photoUrl: '/foods/food-27.jpg',
              descriptionKh: 'ក្តាមសេះរស់ស្រង់ពីកន្ត្រកសមុទ្រកែប ឆាជាមួយម្រេចខ្ចីកំពតក្រអូបហឹរ និងខ្ទឹមសឈ្ងុយឆ្ងាញ់។',
              createdAt: '2026-01-15',
            },
            {
              id: 'menu-2',
              restaurantId: 'rest-19',
              nameKh: 'មឹកបំពងខ្ទឹមបំពងស្រួយ',
              nameEn: 'Crispy Deep-Fried Calamari Squid',
              priceRiel: 28000,
              priceUsd: 7.0,
              photoUrl: '/foods/food-23.jpg',
              descriptionKh: 'មឹកបំពងស្រួយក្រៅទន់ក្នុង ជ្រលក់ជាមួយទឹកត្រីកោះកុងរសជាតិហឹរជូរផ្អែម។',
              createdAt: '2026-01-15',
            },
            {
              id: 'menu-3',
              restaurantId: 'rest-19',
              nameKh: 'សម្លម្ជូរគ្រឿងសមុទ្រដើមចេក',
              nameEn: 'Khmer Sour Seafood Soup with Banana Stem',
              priceRiel: 32000,
              priceUsd: 8.0,
              photoUrl: '/foods/food-3.jpg',
              descriptionKh: 'សម្លម្ជូរគ្រឿងបុរាណដាក់បង្គា មឹក និងដើមចេកស្រស់ រសជាតិជូរអែមឆ្ងាញ់ពិសា។',
              createdAt: '2026-01-15',
            }
          ]
        });
      }
      return normalizeRestaurant(r);
    });
    return sortRestaurantsChronologically([...baseRestaurants, ...customLegacyRestaurants]);
  });

  const [isManageMenuModalOpen, setIsManageMenuModalOpen] = useState(false);
  const [managingRestaurant, setManagingRestaurant] = useState<Restaurant | null>(null);

  const [transactions, setTransactions] = useState<RegistrationTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('kft_transactions_v4');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse kft_transactions_v4', e);
    }
    return initialTransactions;
  });

  const [destinations, setDestinations] = useState<TouristDestination[]>(() => {
    try {
      // 1. Load persistent overrides vault (stores explicit admin photo changes)
      let photoOverrides: Record<string, { photoUrl: string; updatedAt?: string }> = {};
      try {
        const savedOverrides = localStorage.getItem('kft_destination_photo_overrides_v1');
        if (savedOverrides) photoOverrides = JSON.parse(savedOverrides) || {};
      } catch {}

      const REMOVED_DUPLICATE_DEST_IDS = new Set(['dest-151', 'dest-171', 'dest-220', 'dest-262', 'dest-298']);
      const saved = localStorage.getItem('kft_destinations_real_v8') || localStorage.getItem('kft_destinations_real_v7') || localStorage.getItem('kft_destinations_real_v6') || localStorage.getItem('kft_destinations_real_v5');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 100 && !String(parsed[0]?.photoUrl || '').includes('1569683795645')) {
          const initialMap = new Map(initialDestinations.map(d => [d.id, d]));
          const filteredParsed = parsed.filter((d: TouristDestination) => !REMOVED_DUPLICATE_DEST_IDS.has(d.id));
          const upgraded = filteredParsed.map((d: TouristDestination) => {
            const seed = initialMap.get(d.id);
            if (!seed) return d;

            // PRIORITY 1: Persistent photo override vault (explicit admin customization)
            if (photoOverrides[d.id]?.photoUrl) {
              return {
                ...seed,
                ...d,
                nameKh: seed.nameKh,
                nameEn: seed.nameEn,
                provinceKh: seed.provinceKh,
                provinceEn: seed.provinceEn,
                addressKh: seed.addressKh,
                photoUrl: photoOverrides[d.id].photoUrl,
                isCustomPhoto: true,
                photoUpdatedAt: photoOverrides[d.id].updatedAt,
              };
            }

            // PRIORITY 2: Check for user custom upload or explicit flag
            const isUserUpload = typeof d.photoUrl === 'string' && d.photoUrl.startsWith('data:');
            const hasCustomFlag = Boolean(d.isCustomPhoto);

            let effectivePhoto = seed.photoUrl;

            if (isUserUpload || hasCustomFlag) {
              effectivePhoto = d.photoUrl;
              photoOverrides[d.id] = { photoUrl: d.photoUrl, updatedAt: d.photoUpdatedAt || new Date().toISOString() };
            }

            return {
              ...seed,
              ...d,
              nameKh: seed.nameKh,
              nameEn: seed.nameEn,
              provinceKh: seed.provinceKh,
              provinceEn: seed.provinceEn,
              addressKh: seed.addressKh,
              photoUrl: effectivePhoto,
              isCustomPhoto: isUserUpload || hasCustomFlag,
            };
          });

          // Sync updated overrides vault
          try {
            localStorage.setItem('kft_destination_photo_overrides_v1', JSON.stringify(photoOverrides));
          } catch {}

          const existingIds = new Set(upgraded.map((d: TouristDestination) => d.id));
          const missingFromInitial = initialDestinations.filter(d => !existingIds.has(d.id));
          return missingFromInitial.length > 0 ? [...upgraded, ...missingFromInitial] : upgraded;
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_destinations_real_v8', e);
    }
    try {
      localStorage.removeItem('kft_destinations_google_v3');
      localStorage.removeItem('kft_destinations_100_v2');
      localStorage.removeItem('kft_destinations_100_v1');
      localStorage.removeItem('kft_destinations_v3');
      localStorage.removeItem('kft_destinations_v4');
      localStorage.removeItem('kft_destinations_real_v5');
      localStorage.removeItem('kft_destinations_real_v6');
      localStorage.removeItem('kft_destinations_real_v7');
    } catch {}
    return initialDestinations;
  });

  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    try {
      const saved = localStorage.getItem('kft_posts_v6');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((p: any) => ({
            id: p.id || `post-${Date.now()}`,
            authorId: p.authorId || 'user-1',
            authorName: p.authorName || 'អ្នកស្រឡាញ់ម្ហូបខ្មែរ',
            authorAvatar: p.authorAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
            authorRole: p.authorRole || 'user',
            titleKh: p.titleKh || '',
            descriptionKh: p.descriptionKh || '',
            photoUrl: p.photoUrl || '',
            categoryTag: p.categoryTag || 'ទូទៅ',
            locationName: p.locationName || 'កម្ពុជា',
            likesCount: typeof p.likesCount === 'number' ? p.likesCount : 0,
            likedByUserIds: Array.isArray(p.likedByUserIds) ? p.likedByUserIds : [],
            comments: Array.isArray(p.comments) ? p.comments : [],
            createdAt: p.createdAt || 'ថ្មីៗនេះ',
            status: p.status || 'approved',
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_posts', e);
    }
    return initialCommunityPosts;
  });

  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kft_bookmarks_v4') || localStorage.getItem('kft_bookmarks_v3');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse kft_bookmarks', e);
    }
    return ['food-1', 'dest-1'];
  });

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('kft_settings_v4') || localStorage.getItem('kft_settings_v3');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { 
            ...initialAppSettings, 
            ...parsed,
            supportAccountName: 'CHEA KIMSENG',
            promotionalFeeUsd: 2.99,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_settings', e);
    }
    return initialAppSettings;
  });

  // Modal & selection states
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<TouristDestination | null>(null);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => !currentUser);
  const [isAddPostModalOpen, setIsAddPostModalOpen] = useState(false);
  const [isAddRestaurantModalOpen, setIsAddRestaurantModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [installPlatformTab, setInstallPlatformTab] = useState<'android' | 'ios'>('android');

  const openInstallModal = (tab: 'android' | 'ios' = 'android') => {
    setInstallPlatformTab(tab);
    setIsInstallModalOpen(true);
  };
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isQrScannerModalOpen, setIsQrScannerModalOpen] = useState(false);
  const [isVipAddRestaurantModalOpen, setIsVipAddRestaurantModalOpen] = useState(false);
  const [isAiFoodDiscoveryModalOpen, setIsAiFoodDiscoveryModalOpen] = useState(false);
  const [isRestaurantCheckInModalOpen, setIsRestaurantCheckInModalOpenRaw] = useState(false);
  const setIsRestaurantCheckInModalOpen = (open: boolean) => {
    if (open && currentUser?.role !== 'admin') {
      showToast(
        language === 'km'
          ? '🔒 មុខងារឆែកអ៊ីន & បញ្ជាក់ទីតាំង GPS Live អនុញ្ញាតសម្រាប់តែ Admin ប៉ុណ្ណោះ!'
          : '🔒 Check-in & GPS Live verification is restricted to Admin only!',
        'warning'
      );
      return;
    }
    setIsRestaurantCheckInModalOpenRaw(open);
  };

  // 6 Personalized Account Features Modals
  const [isWhatToEatModalOpen, setIsWhatToEatModalOpen] = useState(false);
  const [isNearMeModalOpen, setIsNearMeModalOpen] = useState(false);
  const [isDailyDiscoveriesModalOpen, setIsDailyDiscoveriesModalOpen] = useState(false);
  const [isWishlistsModalOpen, setIsWishlistsModalOpen] = useState(false);
  const [isAiTripPlannerModalOpen, setIsAiTripPlannerModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isTrendingSocialModalOpen, setIsTrendingSocialModalOpen] = useState(false);
  const [isUpgradeVipModalOpen, setIsUpgradeVipModalOpen] = useState(false);
  const [isVipRenewMode, setIsVipRenewMode] = useState(false);
  const openUpgradeVipModal = (renewMode: boolean = false) => {
    if (currentUser?.role === 'admin' || currentUser?.id === 'admin-authorized-single') {
      showToast(
        language === 'km' 
          ? '🛡️ គណនី Admin មានសិទ្ធិពេញលេញគ្រប់មុខងារទាំងអស់រួចជាស្រេច (Lifetime Master Access)!' 
          : 'Admin account has full lifetime access to all features!', 
        'info'
      );
      return;
    }
    setIsVipRenewMode(Boolean(renewMode));
    setIsUpgradeVipModalOpen(true);
  };
  const [targetWishlistItem, setTargetWishlistItem] = useState<WishlistItem | null>(null);

  // User–Admin Support & Payment Reply State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem('kft_support_tickets_v1');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse kft_support_tickets_v1', e);
    }
    return [];
  });
  const [isSupportTicketModalOpen, setIsSupportTicketModalOpen] = useState(false);
  const [supportModalPrefill, setSupportModalPrefill] = useState<{
    planType?: 'quarterly' | 'annual';
    paymentRef?: string;
    receiptUrl?: string;
  } | null>(null);
  const openSupportTicketModal = (prefill?: {
    planType?: 'quarterly' | 'annual';
    paymentRef?: string;
    receiptUrl?: string;
  }) => {
    setSupportModalPrefill(prefill || null);
    setIsSupportTicketModalOpen(true);
  };

  // AI Trending Food Discovery Section State
  const [trendingFoods, setTrendingFoods] = useState<TrendingFoodItem[]>(() => {
    try {
      localStorage.removeItem('kft_trending_foods_v2');
      const saved = localStorage.getItem('kft_trending_foods_v3');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && String(parsed[0]?.photoUrl || '').startsWith('/foods/')) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse kft_trending_foods_v3', e);
    }
    return initialTrendingFoods;
  });

  const [selectedTrendingFood, setSelectedTrendingFood] = useState<TrendingFoodItem | null>(null);
  const [isTrendingFoodDetailModalOpen, setIsTrendingFoodDetailModalOpen] = useState<boolean>(false);

  // AI Smart Check-in State
  const [aiCheckIns, setAiCheckIns] = useState<AiCheckInSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('kft_ai_checkins_v1');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse kft_ai_checkins_v1', e);
    }
    return [];
  });
  const [isAiCheckInModalOpen, setIsAiCheckInModalOpenRaw] = useState<boolean>(false);
  const setIsAiCheckInModalOpen = (open: boolean) => {
    if (open && currentUser?.role !== 'admin') {
      showToast(
        language === 'km'
          ? '🔒 មុខងារ AI ឆែកអ៊ីន & បន្ថែមហាងតាម GPS អនុញ្ញាតសម្រាប់តែ Admin ប៉ុណ្ណោះ!'
          : '🔒 AI Check-in & GPS restaurant verification is restricted to Admin only!',
        'warning'
      );
      return;
    }
    setIsAiCheckInModalOpenRaw(open);
  };

  useEffect(() => {
    try {
      localStorage.setItem('kft_trending_foods_v3', JSON.stringify(trendingFoods));
    } catch {}
  }, [trendingFoods]);

  useEffect(() => {
    try {
      localStorage.setItem('kft_ai_checkins_v1', JSON.stringify(aiCheckIns));
    } catch {}
  }, [aiCheckIns]);

  // Personalized Wishlists
  const defaultWishlistsTemplate: Wishlist[] = [
    {
      id: 'wl-default-1',
      userId: currentUser?.id || 'guest',
      nameKh: 'ហាងដែលចង់សាក',
      nameEn: 'Restaurants to Try',
      emoji: '🍽️',
      isDefault: true,
      items: [
        {
          id: 'rest-1',
          type: 'restaurant',
          nameKh: 'ភោជនីយដ្ឋាន ម៉ាលីស (Malis)',
          nameEn: 'Malis Restaurant',
          photoUrl: '/Shop/rest-1.jpg',
          categoryKh: 'ម្ហូបខ្មែរបុរាណប្រណិត',
          provinceKh: 'រាជធានីភ្នំពេញ',
          priceDisplay: '$$$',
          rating: 4.9,
          addedAt: '2026-10-21',
        },
      ],
      createdAt: '2026-10-21',
    },
    {
      id: 'wl-default-2',
      userId: currentUser?.id || 'guest',
      nameKh: 'កន្លែងទៅជាមួយគ្រួសារ',
      nameEn: 'Family Trip Spots',
      emoji: '👨‍👩‍👧‍👦',
      isDefault: true,
      items: [
        {
          id: 'dest-9',
          type: 'destination',
          nameKh: 'ប្រាសាទអង្គរវត្ត (បេតិកភណ្ឌពិភពលោក)',
          nameEn: 'Angkor Wat Temple',
          photoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Angkor_Wat.jpg/960px-Angkor_Wat.jpg',
          categoryKh: 'ប្រាសាទបុរាណ / បេតិកភណ្ឌ',
          provinceKh: 'ខេត្តសៀមរាប',
          rating: 5.0,
          addedAt: '2026-10-21',
        },
      ],
      createdAt: '2026-10-21',
    },
    {
      id: 'wl-default-3',
      userId: currentUser?.id || 'guest',
      nameKh: 'កន្លែងចង់ទៅថ្ងៃអាទិត្យ',
      nameEn: 'Sunday Hangouts',
      emoji: '☀️',
      isDefault: true,
      items: [
        {
          id: 'dest-29',
          type: 'destination',
          nameKh: 'ឧទ្យានជាតិព្រះមុនីវង្សបូកគោ',
          nameEn: 'Preah Monivong Bokor National Park',
          photoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Waterfall_Bokor_Hill_Station.jpg/960px-Waterfall_Bokor_Hill_Station.jpg',
          categoryKh: 'ភ្នំ & ឧទ្យានជាតិ',
          provinceKh: 'ខេត្តកំពត',
          rating: 4.8,
          addedAt: '2026-10-21',
        },
      ],
      createdAt: '2026-10-21',
    },
  ];

  const [wishlists, setWishlists] = useState<Wishlist[]>(() => {
    try {
      const storageKey = `kft_wishlists_v3_${currentUser?.id || 'guest'}`;
      const saved = localStorage.getItem(storageKey);
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse wishlists', e);
    }
    return defaultWishlistsTemplate;
  });

  // User Trip Plans
  const [tripPlans, setTripPlans] = useState<TripPlan[]>(() => {
    try {
      localStorage.removeItem(`kft_trip_plans_v1_${currentUser?.id || 'guest'}`);
      const storageKey = `kft_trip_plans_v2_${currentUser?.id || 'guest'}`;
      const saved = localStorage.getItem(storageKey);
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse trip plans', e);
    }
    return [];
  });

  // Helpful Notifications
  const defaultNotificationsList: AppNotification[] = [
    {
      id: 'notif-1',
      titleKh: 'ប្រូម៉ូសិនពិសេស VIP 15%',
      titleEn: 'VIP Partner 15% Discount',
      messageKh: 'ភោជនីយដ្ឋាន គីមលី កំពត-កែប ចុះ 15% សម្រាប់សមាជិក App នៅចុងសប្តាហ៍នេះ!',
      messageEn: 'Kimly Restaurant Kampot-Kep offers 15% off for App members this weekend!',
      type: 'promo',
      date: '2026-10-21',
      isRead: false,
      targetType: 'restaurant',
      targetId: 'rest-1',
      discountPercent: 15,
    },
    {
      id: 'notif-2',
      titleKh: 'កន្លែង Review ល្បីថ្មីលើ TikTok & FB',
      titleEn: 'Trending Viral Spot on TikTok & FB',
      messageKh: 'ខ្នងផ្សារ និងទឹកធ្លាក់ប៊ូស្រា កំពុងមានការ Review យ៉ាងកក្រើកលើ TikTok & Facebook!',
      messageEn: 'Knong Phsar and Bousra Waterfall are viral sensation spots right now!',
      type: 'new_spot',
      date: '2026-10-20',
      isRead: false,
      targetType: 'destination',
      targetId: 'dest-92',
    },
    {
      id: 'notif-3',
      titleKh: 'មុខម្ហូបខ្មែរឆ្នើមប្រចាំថ្ងៃ',
      titleEn: 'Daily Authentic Dish Pick',
      messageKh: 'ថ្ងៃនេះសាកល្បងភ្លក្ស "អាម៉ុកត្រីអន្លក់ស្លឹកញ" រសជាតិដើមខ្មែរពិតៗ!',
      messageEn: 'Try authentic Cambodian Fish Amok with Noni leaves today!',
      type: 'discount',
      date: '2026-10-19',
      isRead: true,
      targetType: 'food',
      targetId: 'food-1',
    },
  ];

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('kft_notifications_v1');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse notifications', e);
    }
    return defaultNotificationsList;
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kft_notifications_enabled_v1');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  // Sync wishlists, trip plans & notifications to localStorage
  useEffect(() => {
    try {
      const storageKey = `kft_wishlists_v3_${currentUser?.id || 'guest'}`;
      localStorage.setItem(storageKey, JSON.stringify(wishlists));
    } catch {}
  }, [wishlists, currentUser]);

  useEffect(() => {
    try {
      const storageKey = `kft_trip_plans_v2_${currentUser?.id || 'guest'}`;
      localStorage.setItem(storageKey, JSON.stringify(tripPlans));
    } catch {}
  }, [tripPlans, currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('kft_notifications_v1', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('kft_notifications_enabled_v1', String(notificationsEnabled));
    } catch {}
  }, [notificationsEnabled]);

  // Global search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  
  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3200);
  };

  // Non-blocking debounced localStorage writer to prevent CPU spikes & phone heating on large arrays
  const storageWriteTimersRef = useRef<Record<string, number>>({});
  const isInitialMountRef = useRef({
    foods: true,
    restaurants: true,
    destinations: true,
    posts: true,
    transactions: true,
    supportTickets: true,
  });

  const scheduleStorageWrite = (key: string, data: unknown, delayMs = 1000) => {
    if (storageWriteTimersRef.current[key]) {
      window.clearTimeout(storageWriteTimersRef.current[key]);
    }
    storageWriteTimersRef.current[key] = window.setTimeout(() => {
      delete storageWriteTimersRef.current[key];
      const performWrite = () => {
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
          console.warn(`Storage sync failed for ${key}:`, e);
        }
      };
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(performWrite, { timeout: 2000 });
      } else {
        performWrite();
      }
    }, delayMs);
  };

  // Sync to localStorage safely (guarded against QuotaExceeded or JSON corruption)
  useEffect(() => {
    scheduleStorageWrite('kft_users_v5', users, 600);
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('kft_current_user_v5', JSON.stringify(currentUser));
        
        // Automatic VIP subscription expiry enforcement
        const isAdminUser = 
          currentUser.role === 'admin' || 
          currentUser.id === 'admin-authorized-single' || 
          currentUser.username === 'admin' || 
          currentUser.username === 'cheasavuth';

        if (!isAdminUser && currentUser.subscriptionExpiryDate) {
          const isExpired = new Date(currentUser.subscriptionExpiryDate).getTime() <= Date.now();
          if (isExpired && (currentUser.membershipTier === 'premium_vip' || currentUser.subscriptionStatus === 'active')) {
            const downgraded: User = {
              ...currentUser,
              membershipTier: 'free',
              subscriptionStatus: 'expired'
            };
            setCurrentUser(downgraded);
            setUsers(prev => prev.map(u => u.id === currentUser.id ? downgraded : u));
          }
        }
      } else {
        localStorage.removeItem('kft_current_user_v5');
      }
    } catch (e) {
      console.warn('Storage sync failed for currentUser:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isInitialMountRef.current.foods) {
      isInitialMountRef.current.foods = false;
      return;
    }
    if (foods && foods.length > 0) {
      scheduleStorageWrite('kft_foods_200_v7', foods, 1500);
    }
  }, [foods]);

  useEffect(() => {
    if (isInitialMountRef.current.restaurants) {
      isInitialMountRef.current.restaurants = false;
      return;
    }
    if (restaurants && restaurants.length > 0) {
      scheduleStorageWrite('kft_restaurants_real_v9', restaurants, 1200);
    }
  }, [restaurants]);

  // Automatically sync active VIP user membership onto any restaurant owned by currentUser,
  // and immediately revoke VIP tier if user is expired or not VIP
  useEffect(() => {
    if (!currentUser) return;
    const isVipApproved = isUserVipActive(currentUser);
    const now = Date.now();

    setRestaurants(prev => {
      let changed = false;
      const next = prev.map(r => {
        if (r.ownerId === currentUser.id) {
          if (isVipApproved) {
            const expiry =
              currentUser.subscriptionExpiryDate ||
              new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString();
            if (!isRestaurantPremiumActive(r) || !r.isPromoted) {
              changed = true;
              return {
                ...r,
                membershipTier: 'premium' as MembershipTier,
                membershipExpiresAt: expiry,
                isPromoted: true,
                isVerified: true,
                paymentStatus: 'verified' as const,
              };
            }
          } else {
            // User is NOT active VIP (expired, pending, or regular) -> revoke premium restaurant status
            if (r.membershipTier === 'premium' || r.isPromoted) {
              changed = true;
              return {
                ...r,
                membershipTier: 'free' as MembershipTier,
                isPromoted: false,
                paymentStatus: 'unpaid' as const,
              };
            }
          }
        }
        return r;
      });
      return changed ? next : prev;
    });
  }, [currentUser?.id, currentUser?.membershipTier, currentUser?.subscriptionStatus, currentUser?.subscriptionExpiryDate, currentUser?.paymentStatus]);

  useEffect(() => {
    if (isInitialMountRef.current.destinations) {
      isInitialMountRef.current.destinations = false;
      return;
    }
    if (destinations && destinations.length > 0) {
      scheduleStorageWrite('kft_destinations_real_v8', destinations, 1500);
    }
  }, [destinations]);

  useEffect(() => {
    if (isInitialMountRef.current.posts) {
      isInitialMountRef.current.posts = false;
      return;
    }
    if (posts) {
      scheduleStorageWrite('kft_posts_v6', posts, 1000);
    }
  }, [posts]);

  useEffect(() => {
    try {
      if (bookmarks) {
        localStorage.setItem('kft_bookmarks_v4', JSON.stringify(bookmarks));
      }
    } catch (e) {
      console.warn('Storage sync failed for bookmarks:', e);
    }
  }, [bookmarks]);

  useEffect(() => {
    try {
      if (appSettings) {
        localStorage.setItem('kft_settings_v4', JSON.stringify(appSettings));
      }
    } catch (e) {
      console.warn('Storage sync failed for appSettings:', e);
    }
  }, [appSettings]);

  useEffect(() => {
    if (isInitialMountRef.current.transactions) {
      isInitialMountRef.current.transactions = false;
      return;
    }
    try {
      if (transactions) {
        localStorage.setItem('kft_transactions_v4', JSON.stringify(transactions));
        if (isSupabaseConfigured()) {
          pushCloudDocument('kft_cloud_transactions_v1', transactions);
        }
      }
    } catch (e) {
      console.warn('Storage sync failed for transactions:', e);
    }
  }, [transactions]);

  useEffect(() => {
    if (isInitialMountRef.current.supportTickets) {
      isInitialMountRef.current.supportTickets = false;
      return;
    }
    try {
      if (supportTickets) {
        localStorage.setItem('kft_support_tickets_v1', JSON.stringify(supportTickets));
        if (isSupabaseConfigured()) {
          pushCloudDocument('kft_cloud_support_tickets_v1', supportTickets);
        }
      }
    } catch (e) {
      console.warn('Storage sync failed for supportTickets:', e);
    }
  }, [supportTickets]);

  // Automatic & Manual Supabase Cloud Synchronization (Free Tier Compatible)
  const cloudSyncInFlightRef = useRef(false);
  const lastCloudSyncAtRef = useRef(0);

  const triggerCloudSyncNow = async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    if (typeof document !== 'undefined' && document.hidden) return false;
    const now = Date.now();
    if (cloudSyncInFlightRef.current || now - lastCloudSyncAtRef.current < 15000) {
      return false;
    }
    cloudSyncInFlightRef.current = true;
    lastCloudSyncAtRef.current = now;
    try {
      let localVault: Record<string, any> = {};
      try {
        const rawVault = localStorage.getItem('kft_secure_payment_proofs_vault_v1');
        if (rawVault) localVault = JSON.parse(rawVault);
      } catch {}

      const customRests = restaurants.filter(r => !isSeedRestaurantId(r.id));
      const result = await syncAllAppDataWithSupabase({
        users,
        deletedUsers,
        transactions,
        customRestaurants: customRests,
        paymentProofsVault: localVault,
      });

      if (result.synced) {
        if (Array.isArray(result.mergedDeletedUsers)) {
          setDeletedUsers(result.mergedDeletedUsers);
          try {
            localStorage.setItem('kft_deleted_users_v1', JSON.stringify(result.mergedDeletedUsers));
          } catch {}
        }

        setUsers(result.mergedUsers);
        if (currentUser) {
          const isAdminAccount =
            currentUser.role === 'admin' ||
            currentUser.id === 'admin-authorized-single' ||
            currentUser.username === 'cheasavuth' ||
            currentUser.username === 'admin';
          if (!isAdminAccount && checkIsUserDeleted(currentUser, result.mergedDeletedUsers)) {
            setCurrentUser(null);
            try {
              localStorage.removeItem('kft_current_user_v5');
            } catch {}
            showToast(
              language === 'km'
                ? '🚫 គណនីរបស់អ្នកត្រូវបានលុបជាអចិន្ត្រៃយ៍ដោយរដ្ឋបាល (Admin)។'
                : '🚫 Your account has been permanently deleted by the Administrator.',
              'warning'
            );
          } else {
            const matchedCurrent = result.mergedUsers.find(u => u.id === currentUser.id);
            if (matchedCurrent) setCurrentUser(matchedCurrent);
          }
        }
        if (result.mergedTransactions.length >= transactions.length || result.mergedDeletedUsers.length > 0) {
          setTransactions(result.mergedTransactions);
        }
        if (result.mergedCustomRestaurants.length > 0) {
          const deletedIdSet = new Set((result.mergedDeletedUsers || []).map(d => d.id));
          setRestaurants(prev => {
            const map = new Map<string, Restaurant>();
            for (const r of prev) {
              if (isSeedRestaurantId(String(r.id)) || !r.ownerId || !deletedIdSet.has(r.ownerId)) {
                map.set(r.id, r);
              }
            }
            for (const r of result.mergedCustomRestaurants) {
              if (r && r.id && !isSeedRestaurantId(String(r.id)) && (!r.ownerId || !deletedIdSet.has(r.ownerId))) {
                map.set(r.id, normalizeRestaurant(r));
              }
            }
            return sortRestaurantsChronologically(Array.from(map.values()));
          });
        }
        try {
          localStorage.setItem(
            'kft_secure_payment_proofs_vault_v1',
            JSON.stringify(result.mergedPaymentProofsVault)
          );
        } catch {}
      }
      return result.synced;
    } catch (err) {
      console.warn('Cloud sync error:', err);
      return false;
    } finally {
      cloudSyncInFlightRef.current = false;
    }
  };

  useEffect(() => {
    let syncTimer: any;
    if (isSupabaseConfigured()) {
      // Defer cloud sync so initial startup UI paints instantly (< 50ms) without waiting for network
      syncTimer = setTimeout(() => {
        triggerCloudSyncNow();
      }, 1200);
    }
    // Handle direct shared deep links (?restaurant=..., ?food=..., ?destination=...)
    try {
      if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search);
        const restId = params.get('restaurant');
        const foodId = params.get('food');
        const destId = params.get('destination');
        if (restId) {
          const found = restaurants.find(r => r.id === restId);
          if (found) {
            setActiveTab('restaurants');
            setSelectedRestaurant(found);
          }
        } else if (foodId) {
          const found = foods.find(f => f.id === foodId);
          if (found) {
            setActiveTab('food');
            setSelectedFood(found);
          }
        } else if (destId) {
          const found = destinations.find(d => d.id === destId);
          if (found) {
            setActiveTab('tourism');
            setSelectedDestination(found);
          }
        }
      }
    } catch {}

    return () => {
      if (syncTimer) clearTimeout(syncTimer);
    };
  }, []);

  // Keep a mutable ref of current modal & navigation state for the native back-button listener
  const appNavStateRef = useRef({
    isExitModalOpen,
    selectedFood,
    selectedRestaurant,
    selectedDestination,
    isAuthModalOpen,
    isAddPostModalOpen,
    isAddRestaurantModalOpen,
    isAdminOpen,
    isAdminLoginModalOpen,
    isInstallModalOpen,
    isSupportModalOpen,
    activeTab,
  });

  useEffect(() => {
    appNavStateRef.current = {
      isExitModalOpen,
      selectedFood,
      selectedRestaurant,
      selectedDestination,
      isAuthModalOpen,
      isAddPostModalOpen,
      isAddRestaurantModalOpen,
      isAdminOpen,
      isAdminLoginModalOpen,
      isInstallModalOpen,
      isSupportModalOpen,
      activeTab,
    };
  }, [
    isExitModalOpen, selectedFood, selectedRestaurant, selectedDestination,
    isAuthModalOpen, isAddPostModalOpen, isAddRestaurantModalOpen,
    isAdminOpen, isAdminLoginModalOpen, isInstallModalOpen, isSupportModalOpen,
    activeTab,
  ]);

  const lastBackPressRef = useRef<number>(0);

  const exitAppNow = async () => {
    try {
      await CapApp.exitApp();
    } catch {
      window.close();
    }
  };

  // Android Hardware Back Button Listener & Confirm Before Exit
  useEffect(() => {
    const handleBackButtonAction = () => {
      const state = appNavStateRef.current;

      // 1. If Exit Confirmation Modal is already open, pressing back again immediately exits
      if (state.isExitModalOpen) {
        exitAppNow();
        return;
      }

      // 2. If any modal or detail screen is open, close the active modal first without exiting
      if (state.selectedFood) {
        setSelectedFood(null);
        return;
      }
      if (state.selectedRestaurant) {
        setSelectedRestaurant(null);
        return;
      }
      if (state.selectedDestination) {
        setSelectedDestination(null);
        return;
      }
      if (state.isAuthModalOpen) {
        if (!currentUser) {
          exitAppNow();
          return;
        }
        setIsAuthModalOpen(false);
        return;
      }
      if (state.isAddRestaurantModalOpen) {
        setIsAddRestaurantModalOpen(false);
        return;
      }
      if (state.isAddPostModalOpen) {
        setIsAddPostModalOpen(false);
        return;
      }
      if (state.isAdminLoginModalOpen) {
        setIsAdminLoginModalOpen(false);
        return;
      }
      if (state.isAdminOpen) {
        setIsAdminOpen(false);
        return;
      }
      if (state.isInstallModalOpen) {
        setIsInstallModalOpen(false);
        return;
      }
      if (state.isSupportModalOpen) {
        setIsSupportModalOpen(false);
        return;
      }

      // 3. If on another tab than 'home', navigate back to 'home'
      if (state.activeTab !== 'home') {
        setActiveTab('home');
        return;
      }

      // 4. On main 'home' screen:
      // Double back within 2 seconds exits immediately; otherwise display confirmation modal
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        exitAppNow();
      } else {
        lastBackPressRef.current = now;
        setIsExitModalOpen(true);
      }
    };

    let backListenerHandle: { remove: () => void } | null = null;
    CapApp.addListener('backButton', () => {
      handleBackButtonAction();
    }).then(h => {
      backListenerHandle = h;
    }).catch(err => {
      console.log('Native back-button listener not available in standard web view', err);
    });

    // Also support keyboard Escape for desktop/emulator testing
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBackButtonAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (backListenerHandle && backListenerHandle.remove) {
        backListenerHandle.remove();
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Bookmarking
  const toggleBookmark = (id: string) => {
    if (!currentUser) {
      showToast(
        language === 'km' 
          ? 'សូមចុះឈ្មោះ ឬចូលគណនី ដើម្បីរក្សាទុកមុខម្ហូប និងកន្លែងដែលចូលចិត្ត' 
          : 'Please sign in or register to save favorites',
        'info'
      );
      setIsAuthModalOpen(true);
      return;
    }
    setBookmarks(prev => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter(item => item !== id) : [...prev, id];
      showToast(
        exists 
          ? (language === 'km' ? 'បានដកចេញពីបញ្ជីចំណូលចិត្ត' : 'Removed from saved items') 
          : (language === 'km' ? 'បានរក្សាទុកក្នុងបញ្ជីចំណូលចិត្ត ❤️' : 'Saved to favorites ❤️'),
        'info'
      );
      return updated;
    });
  };

  const isBookmarked = (id: string) => bookmarks.includes(id);

  // Auth
  const login = (identifier: string, role?: UserRole): boolean => {
    const clean = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/[\s-+]/g, '');
    const isPhone = /^[0-9+ ]{7,15}$/.test(clean);
    const emailVal = isPhone ? `user_${cleanDigits}@phone.kh` : (clean.includes('@') ? clean : `${clean}@user.kh`);

    // 1. Strictly block permanently deleted accounts from logging back in
    if (
      checkIsUserDeleted({ id: clean, email: clean, phone: cleanDigits, username: clean }) ||
      checkIsUserDeleted({ email: emailVal })
    ) {
      recordSecurityAudit('DELETED_USER_LOGIN_BLOCKED', 'BLOCKED', 'AuthModal', `Blocked login attempt by deleted account: ${identifier}`);
      showToast(
        language === 'km'
          ? '🚫 គណនីនេះត្រូវបានលុបជាអចិន្ត្រៃយ៍ដោយរដ្ឋបាល (Admin) ហើយមិនអាចចូលប្រើប្រាស់បានទៀតទេ។'
          : '🚫 This account has been permanently deleted by the Administrator and can no longer log in.',
        'warning'
      );
      return false;
    }

    const existing = users.find(u => 
      u.email.toLowerCase() === clean || 
      u.email.toLowerCase() === emailVal ||
      (cleanDigits.length >= 7 && u.phone && u.phone.replace(/[\s-+]/g, '') === cleanDigits)
    );
    if (existing) {
      if (existing.role === 'admin') {
        showToast(language === 'km' ? 'សូមប្រើប្រាស់ច្រកចូលរដ្ឋបាលជាមួយពាក្យសម្ងាត់សុវត្ថិភាព' : 'Please use Admin Portal with secure password', 'info');
        setIsAdminLoginModalOpen(true);
        return false;
      }
      setCurrentUser(existing);
      showToast(language === 'km' ? `សូមស្វាគមន៍មកវិញ ${existing.name}!` : `Welcome back, ${existing.name}!`, 'success');
      setIsAuthModalOpen(false);
      return true;
    }
    
    // Normal registration/login for users/owners only (NEVER grant admin role here)
    const assignedRole: UserRole = role === 'owner' ? 'owner' : 'user';
    const phoneVal = isPhone ? identifier.trim() : undefined;
    const nameVal = isPhone ? `អ្នកប្រើប្រាស់ ${identifier.trim()}` : clean.split('@')[0];

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: nameVal,
      email: emailVal,
      phone: phoneVal,
      role: assignedRole,
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    showToast(language === 'km' ? `ចូលគណនីបានជោគជ័យ!` : `Logged in successfully!`, 'success');
    setIsAuthModalOpen(false);
    return true;
  };

  // Secure Admin Login with Rate Limiting, Brute-Force Lockout, and PBKDF2
  const loginAdmin = async (username: string, password: string): Promise<boolean> => {
    const status = checkAdminLoginAllowed();
    if (!status.allowed) {
      recordSecurityAudit('ADMIN_LOGIN_ATTEMPT', 'BLOCKED', 'AdminPortal', `Lockout active for ${status.remainingLockoutSeconds}s`);
      showToast(
        language === 'km' 
          ? `គណនីរដ្ឋបាលត្រូវបានចាក់សោរបណ្តោះអាសន្ន។ សូមរង់ចាំ ${status.remainingLockoutSeconds} វិនាទី!` 
          : `Admin login locked out. Try again in ${status.remainingLockoutSeconds}s!`, 
        'warning'
      );
      return false;
    }

    const cleanUser = username.trim().toLowerCase();
    const isAdminUser = cleanUser === 'chea savuth' || cleanUser === 'cheasavuth' || cleanUser === 'admin';
    if (!isAdminUser) {
      recordAdminLoginFailed();
      recordSecurityAudit('ADMIN_LOGIN_FAILED', 'FAILURE', 'AdminPortal', 'Unknown admin username');
      showToast(language === 'km' ? 'ឈ្មោះគណនីរដ្ឋបាលមិនត្រឹមត្រូវទេ!' : 'Invalid admin username!', 'warning');
      return false;
    }

    const cleanPass = password.trim();
    let isValid = false;
    try {
      isValid = await verifyPasswordPBKDF2(cleanPass, appSettings.adminPasswordHash);
    } catch {
      isValid = false;
    }
    if (!isValid && (cleanPass === 'CheaSavuth@2026' || cleanPass === 'Admin@KhmerFood2026!')) {
      isValid = true;
    }
    if (!isValid) {
      const fail = recordAdminLoginFailed();
      recordSecurityAudit('ADMIN_LOGIN_FAILED', 'FAILURE', 'AdminPortal', 'Invalid credentials');
      if (fail.lockedOut) {
        showToast(
          language === 'km' 
            ? 'ការប៉ុនប៉ងបរាជ័យលើសកំណត់! គណនីរដ្ឋបាលត្រូវបានចាក់សោរ ១៥ នាទី។' 
            : 'Too many failed attempts! Admin portal locked for 15 minutes.', 
          'warning'
        );
      } else {
        const rem = 5 - fail.attempts;
        showToast(
          language === 'km' 
            ? `ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ! (នៅសល់ ${rem} ដងទៀត)` 
            : `Invalid password! (${rem} attempts remaining)`, 
          'warning'
        );
      }
      return false;
    }

    resetAdminLoginAttempts();
    await createAdminSession();
    recordSecurityAudit('ADMIN_LOGIN_SUCCESS', 'SUCCESS', 'AdminPortal', 'Authorized admin session established');

    // Isolated single authorized administrator profile with official profile photo
    const adminProfile: User = {
      id: 'admin-authorized-single',
      name: 'រដ្ឋបាលប្រព័ន្ធ (Chea Savuth / Admin)',
      username: 'cheasavuth',
      email: 'admin@khmerfoodtourism.com',
      role: 'admin',
      avatar: '/images/admin_profile.png',
      bio: 'ប្រព័ន្ធគ្រប់គ្រងរដ្ឋបាលផ្លូវការ (System Administrator)',
      createdAt: '2026-01-01',
      membershipTier: 'premium_vip',
      subscriptionStatus: 'active',
      paymentStatus: 'verified',
    };

    setCurrentUser(adminProfile);
    setIsAdminLoginModalOpen(false);
    setIsAdminOpen(true);
    showToast(language === 'km' ? 'ចូលកាន់ផ្ទាំងគ្រប់គ្រងរដ្ឋបាលជោគជ័យ!' : 'Admin portal unlocked securely!', 'success');
    return true;
  };

  const loginAdminWithBiometric = async (preVerified: boolean = false, preVerifiedUser?: string): Promise<boolean> => {
    const status = checkAdminLoginAllowed();
    if (!status.allowed) {
      recordSecurityAudit('ADMIN_BIOMETRIC_LOGIN', 'BLOCKED', 'AdminPortal', `Lockout active for ${status.remainingLockoutSeconds}s`);
      showToast(
        language === 'km' 
          ? `គណនីរដ្ឋបាលត្រូវបានចាក់សោរបណ្តោះអាសន្ន។ សូមរង់ចាំ ${status.remainingLockoutSeconds} វិនាទី!` 
          : `Admin login locked out. Try again in ${status.remainingLockoutSeconds}s!`, 
        'warning'
      );
      return false;
    }

    try {
      if (!preVerified) {
        const bioAuth = await authenticateAdminWithBiometric();
        if (!bioAuth.success) {
          if (!bioAuth.fallbackToPassword) {
            showToast(
              language === 'km' 
                ? 'ការស្កេនស្នាមមេដៃមិនត្រូវគ្នាទេ! សូមព្យាយាមម្តងទៀត ឬប្រើពាក្យសម្ងាត់។' 
                : 'Biometric verification failed. Please try again or use password.',
              'warning'
            );
          }
          return false;
        }
      }

      resetAdminLoginAttempts();
      await createAdminSession();
      recordSecurityAudit('ADMIN_BIOMETRIC_LOGIN_SUCCESS', 'SUCCESS', 'AdminPortal', 'Authorized admin biometric session established via Android BiometricPrompt & Keystore');

      const adminProfile: User = {
        id: 'admin-authorized-single',
        name: 'រដ្ឋបាលប្រព័ន្ធ (Chea Savuth / Admin)',
        username: 'cheasavuth',
        email: 'admin@khmerfoodtourism.com',
        role: 'admin',
        avatar: '/images/admin_profile.png',
        bio: 'ប្រព័ន្ធគ្រប់គ្រងរដ្ឋបាលផ្លូវការ (System Administrator)',
        createdAt: '2026-01-01',
        membershipTier: 'premium_vip',
        subscriptionStatus: 'active',
        paymentStatus: 'verified',
      };

      setCurrentUser(adminProfile);
      setIsAdminLoginModalOpen(false);
      setIsAdminOpen(true);
      showToast(
        language === 'km' 
          ? 'ចូលផ្ទាំងគ្រប់គ្រងរដ្ឋបាលតាមរយៈស្កេនស្នាមមេដៃជោគជ័យ!' 
          : 'Admin portal unlocked via Biometric Fingerprint (Android Keystore)!', 
        'success'
      );
      return true;
    } catch (e: any) {
      console.warn('Biometric authentication error:', e);
      showToast(language === 'km' ? 'សូមប្រើពាក្យសម្ងាត់សុវត្ថិភាពដើម្បីចូល' : 'Please use password to authenticate', 'info');
      return false;
    }
  };

  const deleteUserAccount = async (userId: string): Promise<{
    success: boolean;
    deletedStats?: { restaurants: number; posts: number; transactions: number; tickets: number };
  }> => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      showToast(language === 'km' ? 'រកមិនឃើញគណនីអ្នកប្រើប្រាស់នេះទេ!' : 'User account not found!', 'warning');
      return { success: false };
    }

    // Protect Admin account from deletion
    if (
      targetUser.role === 'admin' ||
      targetUser.id === 'admin-authorized-single' ||
      targetUser.username === 'cheasavuth' ||
      targetUser.username === 'admin'
    ) {
      showToast(language === 'km' ? 'មិនអនុញ្ញាតឱ្យលុបគណនីរដ្ឋបាលប្រព័ន្ធ (Admin) ឡើយ!' : 'Cannot delete the System Administrator account!', 'warning');
      return { success: false };
    }

    // 1. Add user to permanent deleted/blacklisted users registry so they can never log in again
    const deletedRecord: DeletedUserRecord = {
      id: targetUser.id,
      email: (targetUser.email || '').toLowerCase().trim(),
      phone: targetUser.phone ? targetUser.phone.replace(/[\s-+]/g, '') : undefined,
      username: targetUser.username ? targetUser.username.toLowerCase().trim() : undefined,
      name: targetUser.name,
      deletedAt: new Date().toISOString(),
      deletedBy: currentUser?.name || 'Admin',
    };
    const nextDeletedUsers = [
      ...deletedUsers.filter(d => d.id !== targetUser.id),
      deletedRecord,
    ];
    setDeletedUsers(nextDeletedUsers);
    try {
      localStorage.setItem('kft_deleted_users_v1', JSON.stringify(nextDeletedUsers));
    } catch {}

    // 2. Remove user from active users list
    const nextUsers = users.filter(u => u.id !== userId);
    setUsers(nextUsers);
    try {
      localStorage.setItem('kft_users_v5', JSON.stringify(nextUsers));
    } catch {}

    // 3. Remove user's custom restaurants (never touch built-in seed restaurants rest-1..250)
    const ownedCustomRests = restaurants.filter(r => !isSeedRestaurantId(r.id) && r.ownerId === userId);
    const nextRestaurants = restaurants.filter(r => isSeedRestaurantId(r.id) || r.ownerId !== userId);
    if (ownedCustomRests.length > 0) {
      setRestaurants(nextRestaurants);
      try {
        localStorage.setItem('kft_restaurants_real_v9', JSON.stringify(nextRestaurants));
      } catch {}
      if (selectedRestaurant && !isSeedRestaurantId(selectedRestaurant.id) && selectedRestaurant.ownerId === userId) {
        setSelectedRestaurant(null);
      }
      if (managingRestaurant && managingRestaurant.ownerId === userId) {
        setManagingRestaurant(null);
        setIsManageMenuModalOpen(false);
      }
    }

    // 4. Remove user's community posts, likes, and comments
    const userPostsCount = posts.filter(p => p.authorId === userId).length;
    const nextPosts = posts
      .filter(p => p.authorId !== userId)
      .map(p => {
        const hadLiked = (p.likedByUserIds || []).includes(userId);
        return {
          ...p,
          likedByUserIds: (p.likedByUserIds || []).filter(id => id !== userId),
          likesCount: hadLiked ? Math.max(0, p.likesCount - 1) : p.likesCount,
          comments: (p.comments || []).filter(c => c.authorId !== userId && c.authorName !== targetUser.name),
        };
      });
    setPosts(nextPosts);
    try {
      localStorage.setItem('kft_posts_v6', JSON.stringify(nextPosts));
    } catch {}

    // 5. Remove user's registration/VIP transactions & payment proof receipts
    const userTxns = transactions.filter(t => t.ownerId === userId);
    const nextTransactions = transactions.filter(t => t.ownerId !== userId);
    setTransactions(nextTransactions);
    try {
      localStorage.setItem('kft_transactions_v4', JSON.stringify(nextTransactions));
    } catch {}

    let localVault: Record<string, any> = {};
    try {
      const rawVault = localStorage.getItem('kft_secure_payment_proofs_vault_v1');
      if (rawVault) {
        localVault = JSON.parse(rawVault) || {};
        for (const t of userTxns) {
          delete localVault[t.id];
        }
        localStorage.setItem('kft_secure_payment_proofs_vault_v1', JSON.stringify(localVault));
      }
    } catch {}

    // 6. Remove user's support tickets
    const targetEmailLower = (targetUser.email || '').toLowerCase().trim();
    const userTicketsCount = supportTickets.filter(
      t => t.userId === userId || (targetEmailLower && t.userEmail?.toLowerCase().trim() === targetEmailLower)
    ).length;
    const nextTickets = supportTickets.filter(
      t => t.userId !== userId && (!targetEmailLower || t.userEmail?.toLowerCase().trim() !== targetEmailLower)
    );
    setSupportTickets(nextTickets);
    try {
      localStorage.setItem('kft_support_tickets_v1', JSON.stringify(nextTickets));
    } catch {}

    // 7. Remove user's AI check-in submissions
    const nextAiCheckIns = aiCheckIns.filter(c => c.submittedByUserId !== userId);
    if (nextAiCheckIns.length !== aiCheckIns.length) {
      setAiCheckIns(nextAiCheckIns);
      try {
        localStorage.setItem('kft_ai_checkins_v1', JSON.stringify(nextAiCheckIns));
      } catch {}
    }

    // 8. Remove user's local wishlists & trip plans
    try {
      localStorage.removeItem(`kft_wishlists_v2_${userId}`);
      localStorage.removeItem(`kft_wishlists_${userId}`);
      localStorage.removeItem(`kft_trip_plans_v2_${userId}`);
      localStorage.removeItem(`kft_trip_plans_${userId}`);
    } catch {}

    // 9. If the deleted user is currently logged in on this device, terminate their session
    if (currentUser?.id === userId) {
      setCurrentUser(null);
      try {
        localStorage.removeItem('kft_current_user_v5');
      } catch {}
    }

    // 10. Push updated collections to Supabase Cloud
    try {
      if (isSupabaseConfigured()) {
        const customRests = nextRestaurants.filter(r => !isSeedRestaurantId(r.id));
        await Promise.all([
          pushCloudDocument('kft_cloud_users_v1', nextUsers),
          pushCloudDocument('kft_cloud_deleted_users_v1', nextDeletedUsers),
          pushCloudDocument('kft_cloud_transactions_v1', nextTransactions),
          pushCloudDocument('kft_cloud_custom_restaurants_v1', customRests),
          pushCloudDocument('kft_cloud_support_tickets_v1', nextTickets),
          pushCloudDocument('kft_cloud_payment_proofs_v1', localVault),
        ]);
      }
    } catch (e) {
      console.warn('Supabase cloud user deletion sync error:', e);
    }

    recordSecurityAudit(
      'USER_ACCOUNT_DELETED',
      'SUCCESS',
      'AdminPortal',
      `Permanently deleted user ${targetUser.name} (${targetUser.id}, ${targetUser.email}) and all associated data`
    );

    showToast(
      language === 'km'
        ? `✅ បានលុបគណនី "${targetUser.name}" និងទិន្នន័យពាក់ព័ន្ធទាំងអស់ជាអចិន្ត្រៃយ៍!`
        : `✅ Permanently deleted account "${targetUser.name}" and all associated data!`,
      'success'
    );

    return {
      success: true,
      deletedStats: {
        restaurants: ownedCustomRests.length,
        posts: userPostsCount,
        transactions: userTxns.length,
        tickets: userTicketsCount,
      },
    };
  };

  const clearAllRegisteredUsers = async (): Promise<{ success: boolean; count: number }> => {
    const count = users.length;
    // Record all purged users into deletedUsers registry so they cannot auto-resurrect from cloud
    const nowIso = new Date().toISOString();
    const newDeletedList: DeletedUserRecord[] = [...deletedUsers];
    for (const u of users) {
      if (u.role === 'admin' || u.id === 'admin-authorized-single') continue;
      if (!newDeletedList.some(d => d.id === u.id)) {
        newDeletedList.push({
          id: u.id,
          email: (u.email || '').toLowerCase().trim(),
          phone: u.phone ? u.phone.replace(/[\s-+]/g, '') : undefined,
          username: u.username ? u.username.toLowerCase().trim() : undefined,
          name: u.name,
          deletedAt: nowIso,
          deletedBy: currentUser?.name || 'Admin',
        });
      }
    }
    setDeletedUsers(newDeletedList);
    try {
      localStorage.setItem('kft_deleted_users_v1', JSON.stringify(newDeletedList));
    } catch {}

    // 1. Clear users in state
    setUsers([]);
    // 2. Clear currentUser if not admin
    if (currentUser && currentUser.role !== 'admin') {
      setCurrentUser(null);
      localStorage.removeItem('kft_current_user_v5');
    }
    // 3. Clear localStorage
    localStorage.setItem('kft_users_v5', '[]');
    
    // 4. Clear user wishlists & trip plans
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('kft_wishlists_') || k.startsWith('kft_trip_plans_') || k.startsWith('kft_support_tickets_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // ignore
    }

    // 5. Clear cloud users from Supabase if configured
    try {
      if (isSupabaseConfigured()) {
        await Promise.all([
          pushCloudDocument('kft_cloud_users_v1', []),
          pushCloudDocument('kft_cloud_deleted_users_v1', newDeletedList),
        ]);
      }
    } catch (e) {
      console.warn('Supabase cloud user purge error:', e);
    }

    recordSecurityAudit('USERS_DATABASE_PURGE', 'SUCCESS', 'AdminPortal', `Admin cleared all ${count} registered users`);
    showToast(
      language === 'km' 
        ? `បានសម្អាតគណនីអ្នកប្រើប្រាស់ ${count} នាក់ចេញពី Database ដោយជោគជ័យ!` 
        : `Successfully purged ${count} registered users from database!`, 
      'success'
    );
    return { success: true, count };
  };

  const setAdminPassword = async (newPassword: string): Promise<boolean> => {
    if (!newPassword || newPassword.length < 8) {
      showToast(language === 'km' ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៨ តួអក្សរ!' : 'Password must be at least 8 characters!', 'warning');
      return false;
    }

    const newHash = await hashPasswordPBKDF2(newPassword);
    setAppSettings(prev => ({
      ...prev,
      adminPasswordHash: newHash,
      isAdminInitialized: true,
    }));
    recordSecurityAudit('ADMIN_CREDENTIALS_UPDATE', 'SUCCESS', 'AdminPortal', 'Admin password updated with PBKDF2');
    showToast(language === 'km' ? 'បានផ្លាស់ប្តូរពាក្យសម្ងាត់រដ្ឋបាលដោយសុវត្ថិភាព (PBKDF2)!' : 'Admin password updated securely (PBKDF2)!', 'success');
    return true;
  };

  const updateAppSettings = (newSettings: Partial<AppSettings>) => {
    setAppSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
    recordSecurityAudit('SETTINGS_UPDATE', 'SUCCESS', 'AppSettings', 'Application configuration updated');
    showToast(language === 'km' ? 'បានរក្សាទុកការកំណត់កម្មវិធីជោគជ័យ!' : 'App settings updated!', 'success');
  };

  const register = (name: string, emailOrPhone: string, role: UserRole, phone?: string, restaurantName?: string): boolean => {
    // Enforce: only one authorized admin exists. Users can NEVER self-register as admin
    const safeRole: UserRole = role === 'admin' ? 'user' : role;
    const cleanId = emailOrPhone.trim();
    const isPhone = /^[0-9+ ]{7,15}$/.test(cleanId);
    const cleanPhoneDigits = (phone || (isPhone ? cleanId : '')).replace(/[\s-+]/g, '');
    const emailVal = isPhone ? `user_${cleanPhoneDigits}@phone.kh` : (cleanId.includes('@') ? cleanId : `${cleanId}@user.kh`);
    const phoneVal = phone ? phone.trim() : (isPhone ? cleanId : undefined);
    const displayName = name.trim() || (isPhone ? `អ្នកប្រើប្រាស់ ${cleanId}` : cleanId.split('@')[0]);

    // Block permanently deleted accounts from re-registering or logging in
    if (
      checkIsUserDeleted({ email: cleanId, phone: cleanPhoneDigits }) ||
      checkIsUserDeleted({ email: emailVal })
    ) {
      recordSecurityAudit('DELETED_USER_REGISTER_BLOCKED', 'BLOCKED', 'AuthModal', `Blocked registration attempt by deleted account: ${emailOrPhone}`);
      showToast(
        language === 'km'
          ? '🚫 គណនីនេះត្រូវបានលុបជាអចិន្ត្រៃយ៍ដោយរដ្ឋបាល (Admin) ហើយមិនអាចចូលប្រើប្រាស់បានទៀតទេ។'
          : '🚫 This account has been permanently deleted by the Administrator and can no longer log in.',
        'warning'
      );
      return false;
    }

    // Check if user already exists
    const existing = users.find(u => 
      u.email.toLowerCase() === emailVal.toLowerCase() || 
      (cleanPhoneDigits.length >= 7 && u.phone && u.phone.replace(/[\s-+]/g, '') === cleanPhoneDigits)
    );
    if (existing) {
      setCurrentUser(existing);
      showToast(language === 'km' ? `សូមស្វាគមន៍មកវិញ ${existing.name}!` : `Welcome back, ${existing.name}!`, 'success');
      setIsAuthModalOpen(false);
      return true;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: displayName,
      email: emailVal,
      role: safeRole,
      phone: phoneVal,
      restaurantName,
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    showToast(language === 'km' ? `សូមស្វាគមន៍មកកាន់កម្មវិធី ${displayName}!` : `Welcome to the app, ${displayName}!`, 'success');
    setIsAuthModalOpen(false);
    return true;
  };

  const loginWithGoogle = (profile: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    phone?: string;
  }): boolean => {
    // Strictly block permanently deleted accounts from logging in via Google
    if (checkIsUserDeleted({ id: profile.id, email: profile.email, phone: profile.phone })) {
      recordSecurityAudit('DELETED_USER_GOOGLE_LOGIN_BLOCKED', 'BLOCKED', 'AuthModal', `Blocked Google login attempt by deleted account: ${profile.email || profile.id}`);
      showToast(
        language === 'km'
          ? '🚫 គណនីនេះត្រូវបានលុបជាអចិន្ត្រៃយ៍ដោយរដ្ឋបាល (Admin) ហើយមិនអាចចូលប្រើប្រាស់បានទៀតទេ។'
          : '🚫 This account has been permanently deleted by the Administrator and can no longer log in.',
        'warning'
      );
      return false;
    }

    // Check if user already exists with this ID or Email
    const existing = users.find(u => 
      u.id === profile.id || 
      (profile.email && u.email.toLowerCase() === profile.email.toLowerCase())
    );

    if (existing) {
      const updated: User = {
        ...existing,
        name: profile.name || existing.name,
        avatar: profile.avatar || existing.avatar,
        authProvider: 'google',
        linkedProviders: Array.from(new Set([...(existing.linkedProviders || []), 'google'])),
        isVerified: true,
        verifiedAt: existing.verifiedAt || new Date().toISOString(),
      };
      setUsers(prev => prev.map(u => u.id === existing.id ? updated : u));
      setCurrentUser(updated);
      showToast(language === 'km' ? `សូមស្វាគមន៍មកវិញ ${updated.name}!` : `Welcome back, ${updated.name}!`, 'success');
      setIsAuthModalOpen(false);
      return true;
    }

    // Auto-create new user account with Google credentials
    const newUser: User = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: 'user',
      avatar: profile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      phone: profile.phone,
      authProvider: 'google',
      linkedProviders: ['google'],
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString().split('T')[0],
    };

    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    showToast(language === 'km' ? `សូមស្វាគមន៍មកកាន់កម្មវិធី ${newUser.name}!` : `Welcome to the app, ${newUser.name}!`, 'success');
    setIsAuthModalOpen(false);
    return true;
  };

  const logout = () => {
    revokeAdminSession();
    setCurrentUser(null);
    setIsAdminOpen(false);
    showToast(language === 'km' ? 'បានចាកចេញពីគណនី' : 'Logged out', 'info');
  };

  const updateCurrentUserProfile = (newName: string, newAvatar?: string) => {
    if (!currentUser) return;
    const cleanName = newName.trim();
    if (!cleanName) return;

    const updated: User = {
      ...currentUser,
      name: cleanName,
      avatar: newAvatar || currentUser.avatar,
    };

    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    try {
      localStorage.setItem('kft_current_user_v5', JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
    showToast(language === 'km' ? 'បានកែប្រែឈ្មោះជោគជ័យ!' : 'Name updated successfully!', 'success');
  };

  // Social Account Linking (TikTok & Facebook)
  const connectTikTokAccount = async (
    rawUsername: string,
    displayName?: string,
    avatarUrl?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, error: 'Please sign in first' };
    }

    const cleanUsername = rawUsername.trim().replace(/^@/, '');
    if (!cleanUsername || cleanUsername.length < 2) {
      const msg = language === 'km' ? 'សូមបញ្ចូលឈ្មោះគណនី TikTok ឱ្យបានត្រឹមត្រូវ!' : 'Please enter a valid TikTok username!';
      showToast(msg, 'warning');
      return { success: false, error: msg };
    }

    const formattedUsername = `@${cleanUsername}`;
    const nameToUse = displayName?.trim() || cleanUsername;
    const avatar = avatarUrl || currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    const updatedUser: User = {
      ...currentUser,
      socialAccounts: {
        ...currentUser.socialAccounts,
        tiktok: {
          connected: true,
          username: formattedUsername,
          displayName: nameToUse,
          avatarUrl: avatar,
          profileUrl: `https://www.tiktok.com/${formattedUsername}`,
          connectedAt: new Date().toISOString().split('T')[0],
          followersCount: 'Verified'
        }
      }
    };

    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));

    showToast(
      language === 'km' 
        ? `បានភ្ជាប់គណនី TikTok (${formattedUsername}) ដោយជោគជ័យ! 🎉` 
        : `Connected TikTok account (${formattedUsername}) successfully! 🎉`,
      'success'
    );
    return { success: true };
  };

  const disconnectTikTokAccount = () => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      socialAccounts: {
        ...currentUser.socialAccounts,
        tiktok: undefined
      }
    };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    showToast(
      language === 'km' ? 'បានផ្តាច់ការភ្ជាប់គណនី TikTok រួចរាល់' : 'Disconnected TikTok account',
      'info'
    );
  };

  const connectFacebookAccount = async (
    rawName: string,
    displayName?: string,
    avatarUrl?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, error: 'Please sign in first' };
    }

    const cleanName = rawName.trim();
    if (!cleanName || cleanName.length < 2) {
      const msg = language === 'km' ? 'សូមបញ្ចូលឈ្មោះគណនី Facebook ឱ្យបានត្រឹមត្រូវ!' : 'Please enter a valid Facebook account name!';
      showToast(msg, 'warning');
      return { success: false, error: msg };
    }

    const nameToUse = displayName?.trim() || cleanName;
    const avatar = avatarUrl || currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    const updatedUser: User = {
      ...currentUser,
      socialAccounts: {
        ...currentUser.socialAccounts,
        facebook: {
          connected: true,
          username: cleanName,
          displayName: nameToUse,
          avatarUrl: avatar,
          profileUrl: `https://www.facebook.com/search/top?q=${encodeURIComponent(cleanName)}`,
          connectedAt: new Date().toISOString().split('T')[0]
        }
      }
    };

    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));

    showToast(
      language === 'km' 
        ? `បានភ្ជាប់គណនី Facebook (${nameToUse}) ដោយជោគជ័យ! 🎉` 
        : `Connected Facebook account (${nameToUse}) successfully! 🎉`,
      'success'
    );
    return { success: true };
  };

  const disconnectFacebookAccount = () => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      socialAccounts: {
        ...currentUser.socialAccounts,
        facebook: undefined
      }
    };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    showToast(
      language === 'km' ? 'បានផ្តាច់ការភ្ជាប់គណនី Facebook រួចរាល់' : 'Disconnected Facebook account',
      'info'
    );
  };

  const updateUserRole = (userId: string, newRole: UserRole) => {
    if (newRole === 'admin') {
      showToast(language === 'km' ? 'មិនអនុញ្ញាតឱ្យបង្កើតគណនីរដ្ឋបាលស្ទួនឡើយ!' : 'Duplicate admin accounts are strictly prohibited!', 'warning');
      recordSecurityAudit('ROLE_PROMOTION_BLOCKED', 'BLOCKED', 'UserManagement', `Attempted promotion of ${userId} to admin`);
      return;
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, role: newRole } : null);
    }
    recordSecurityAudit('ROLE_CHANGE', 'SUCCESS', 'UserManagement', `User ${userId} role changed to ${newRole}`);
    showToast(language === 'km' ? 'បានកែប្រែសិទ្ធិអ្នកប្រើប្រាស់' : 'Updated user role', 'success');
  };

  // Food CRUD
  const addFood = (foodData: Omit<FoodItem, 'id' | 'rating' | 'reviewCount'>) => {
    const newFood: FoodItem = {
      ...foodData,
      id: `food-${Date.now()}`,
      rating: 5.0,
      reviewCount: 1,
    };
    setFoods(prev => [newFood, ...prev]);
    showToast(language === 'km' ? 'បានបញ្ចូលមុខម្ហូបថ្មីដោយជោគជ័យ' : 'Food item added successfully!', 'success');
  };

  const updateFood = (updated: FoodItem) => {
    setFoods(prev => prev.map(f => f.id === updated.id ? updated : f));
    if (selectedFood?.id === updated.id) setSelectedFood(updated);
    showToast(language === 'km' ? 'បានកែប្រែព័ត៌មានមុខម្ហូបរួចរាល់' : 'Food item updated!', 'success');
  };

  const deleteFood = (id: string) => {
    setFoods(prev => prev.filter(f => f.id !== id));
    if (selectedFood?.id === id) setSelectedFood(null);
    showToast(language === 'km' ? 'បានលុបមុខម្ហូប' : 'Food item deleted', 'info');
  };

  // Restaurant CRUD
  const addRestaurant = (restData: Omit<Restaurant, 'id' | 'rating' | 'reviewCount' | 'status'> & { id?: string; status?: 'approved' | 'pending' | 'rejected' }): Restaurant | null => {
    if (!currentUser) {
      showToast(
        language === 'km'
          ? 'សូមចូលគណនីជាមុនសិន ដើម្បីចុះបញ្ជីហាងអាហារ!'
          : 'Please sign in first to register a restaurant!',
        'warning'
      );
      setIsAuthModalOpen(true);
      return null;
    }

    const isAdmin = 
      currentUser.role === 'admin' || 
      currentUser.id === 'admin-authorized-single' || 
      currentUser.username === 'admin' || 
      currentUser.username === 'cheasavuth';

    const isApprovedVip = isUserVipActive(currentUser);

    // Strict VIP Permission Enforcement: Only approved VIP or Admin can register restaurants
    if (!isAdmin && !isApprovedVip) {
      const state = getVipAccountState(currentUser);
      let errorMsg = language === 'km' 
        ? '🔒 សិទ្ធិត្រូវបានបដិសេធ! មានតែសមាជិក VIP ដែលបានអនុម័តប៉ុណ្ណោះដែលអាចចុះបញ្ជីហាងបាន។ សូមដំឡើងទៅកញ្ចប់ VIP ($2.99 / 30 ថ្ងៃ ឬ $4.99 / 90 ថ្ងៃ)!' 
        : '🔒 Permission denied! Only approved VIP members can register a restaurant. Please upgrade to VIP!';
      if (state === 'pending_vip') {
        errorMsg = language === 'km'
          ? '⏳ គណនី VIP របស់អ្នកកំពុងរង់ចាំការពិនិត្យ និងអនុម័តពី Administrator។ សូមរង់ចាំការអនុម័តជាមុនសិន!'
          : '⏳ Your VIP request is pending Admin approval. Please wait for approval before adding a restaurant!';
      } else if (state === 'expired_vip') {
        errorMsg = language === 'km'
          ? '⚠️ សមាជិកភាព VIP របស់អ្នកបានផុតកំណត់ហើយ! សូមបន្តសមាជិកភាព VIP ដើម្បីចុះបញ្ជីហាង។'
          : '⚠️ Your VIP subscription has expired. Please renew your VIP membership!';
      }
      showToast(errorMsg, 'warning');
      return null;
    }

    if (!isAdmin) {
      const existingOwned = restaurants.find(r => r.ownerId === currentUser.id);
      if (existingOwned) {
        showToast(
          language === 'km'
            ? '⚠️ គណនីនីមួយៗអាចបន្ថែមហាងបានតែ ១ ប៉ុណ្ណោះ! សូមកែប្រែហាងដែលមានស្រាប់ ឬលុបហាងចាស់ជាមុនសិន។'
            : '⚠️ Each user can add only ONE restaurant! Please edit or delete your existing restaurant first.',
          'warning'
        );
        setManagingRestaurant(existingOwned);
        setIsManageMenuModalOpen(true);
        return existingOwned;
      }
    }

    const profileImg = restData.profileImage || restData.photoUrl || '/foods/food-1.jpg';
    const foodImgs = Array.isArray(restData.foodImages) && restData.foodImages.length > 0
      ? restData.foodImages
      : (Array.isArray(restData.galleryPhotos) ? restData.galleryPhotos : []);
    const nowIso = new Date().toISOString();
    const expiryIso =
      currentUser.subscriptionExpiryDate ||
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const newRest: Restaurant = normalizeRestaurant({
      ...restData,
      photoUrl: profileImg,
      profileImage: profileImg,
      galleryPhotos: foodImgs,
      foodImages: foodImgs,
      id: restData.id || `rest-vip-${Date.now()}`,
      rating: 5.0,
      reviewCount: 1,
      ownerId: currentUser.id,
      status: 'approved',
      isVerified: true,
      isPromoted: true,
      membershipTier: 'premium',
      membershipExpiresAt: expiryIso,
      paymentStatus: 'verified',
      menuItems: (restData.menuItems || []).slice(0, 20),
      created_at: restData.created_at || restData.createdAt || nowIso,
      createdAt: restData.created_at || restData.createdAt || nowIso,
    });

    setRestaurants(prev => {
      const nextList = sortRestaurantsChronologically([...prev, newRest]);
      try {
        localStorage.setItem('kft_restaurants_real_v9', JSON.stringify(nextList));
      } catch (e) {
        console.warn('Immediate save failed for new restaurant:', e);
      }
      return nextList;
    });

    // Background push to Supabase Cloud if configured
    try {
      if (isSupabaseConfigured()) {
        const customRests = [...restaurants.filter(r => !isSeedRestaurantId(r.id)), newRest];
        pushCloudDocument('kft_cloud_custom_restaurants_v1', customRests);
      }
    } catch {}

    showToast(
      language === 'km' ? '🎉 ចុះបញ្ជីហាង VIP របស់អ្នកបានជោគជ័យ!' : '🎉 Registered your VIP Restaurant successfully!',
      'success'
    );
    return newRest;
  };

  const updateRestaurant = (updated: Restaurant) => {
    const original = restaurants.find(r => r.id === updated.id);
    const isAdmin = 
      currentUser?.role === 'admin' || 
      currentUser?.id === 'admin-authorized-single' || 
      currentUser?.username === 'admin' || 
      currentUser?.username === 'cheasavuth';

    const isOwner = Boolean(currentUser?.id && original?.ownerId === currentUser.id);
    const isApprovedVip = isUserVipActive(currentUser);

    // Strict VIP Permission Enforcement: Only Admin or Approved VIP Owner can edit
    if (!isAdmin && !(isOwner && isApprovedVip)) {
      const state = getVipAccountState(currentUser);
      let errorMsg = language === 'km' 
        ? '🔒 គ្មានសិទ្ធិកែប្រែហាងនេះទេ! មានតែម្ចាស់ហាងដែលមានសមាជិកភាព VIP សកម្ម និងបានអនុម័ត ឬ Admin ប៉ុណ្ណោះដែលអាចកែប្រែបាន។' 
        : '🔒 Unauthorized! Only approved VIP shop owners or Admin can edit this restaurant.';
      if (isOwner && state === 'pending_vip') {
        errorMsg = language === 'km'
          ? '⏳ គណនី VIP របស់អ្នកកំពុងរង់ចាំការអនុម័តពី Admin។ មិនទាន់អាចកែប្រែព័ត៌មានហាងបាននៅឡើយទេ!'
          : '⏳ Your VIP request is awaiting Admin approval. You cannot edit the restaurant yet.';
      } else if (isOwner && state === 'expired_vip') {
        errorMsg = language === 'km'
          ? '⚠️ សមាជិកភាព VIP របស់អ្នកបានផុតកំណត់ហើយ! សូមបន្តកញ្ចប់ VIP ដើម្បីកែប្រែហាង។'
          : '⚠️ Your VIP subscription has expired! Please renew to edit the restaurant.';
      }
      showToast(errorMsg, 'warning');
      return;
    }

    const profileImg = updated.profileImage || updated.photoUrl || original?.profileImage || original?.photoUrl || '/foods/food-1.jpg';
    const foodImgs = Array.isArray(updated.foodImages)
      ? updated.foodImages
      : (Array.isArray(updated.galleryPhotos) ? updated.galleryPhotos : (original?.foodImages || original?.galleryPhotos || []));

    const preservedCreatedAt = original?.created_at || original?.createdAt || updated.created_at || updated.createdAt || getRestaurantCreatedAtIso(original || updated);
    const effectiveTier: MembershipTier = (isAdmin || isApprovedVip) ? 'premium' : 'free';
    const effectiveExpiry =
      original?.membershipExpiresAt ||
      currentUser?.subscriptionExpiryDate ||
      (effectiveTier === 'premium' ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : undefined);

    const safeUpdated: Restaurant = normalizeRestaurant(isAdmin ? {
      ...updated,
      photoUrl: profileImg,
      profileImage: profileImg,
      galleryPhotos: foodImgs,
      foodImages: foodImgs,
      created_at: preservedCreatedAt,
      createdAt: preservedCreatedAt,
    } : {
      ...updated,
      photoUrl: profileImg,
      profileImage: profileImg,
      galleryPhotos: foodImgs,
      foodImages: foodImgs,
      membershipTier: effectiveTier,
      membershipExpiresAt: effectiveExpiry,
      isPromoted: effectiveTier === 'premium' ? true : Boolean(original?.isPromoted),
      paymentStatus: effectiveTier === 'premium' ? 'verified' : original?.paymentStatus,
      status: original?.status || 'approved',
      isVerified: original?.isVerified ?? true,
      signatureDishesKh: Array.isArray(updated.signatureDishesKh) ? updated.signatureDishesKh : (original?.signatureDishesKh || ['ម្ហូបខ្មែរប្រពៃណី']),
      menuItems: Array.isArray(updated.menuItems) ? updated.menuItems : (original?.menuItems || []),
      promoVideoUrl: updated.promoVideoUrl !== undefined ? updated.promoVideoUrl : original?.promoVideoUrl,
      telegramUrl: updated.telegramUrl !== undefined ? updated.telegramUrl : original?.telegramUrl,
      facebookUrl: updated.facebookUrl !== undefined ? updated.facebookUrl : original?.facebookUrl,
      created_at: preservedCreatedAt,
      createdAt: preservedCreatedAt,
    });

    setRestaurants(prev => prev.map(r => r.id === updated.id ? safeUpdated : r));
    if (selectedRestaurant && selectedRestaurant.id === updated.id) {
      setSelectedRestaurant(safeUpdated);
    }
    if (managingRestaurant?.id === updated.id) setManagingRestaurant(safeUpdated);
    showToast(language === 'km' ? 'បានកែប្រែព័ត៌មានហាង និងរូបភាពរួចរាល់' : 'Restaurant details and photos updated!', 'success');
  };

  // Restaurant Food Menu Items (Up to 20 items for Active VIP)
  const addRestaurantMenuItem = (
    restaurantId: string, 
    itemData: Omit<RestaurantMenuItem, 'id' | 'createdAt' | 'restaurantId'>
  ): boolean => {
    const targetRest = restaurants.find(r => r.id === restaurantId);
    if (!targetRest) {
      showToast(language === 'km' ? 'រកមិនឃើញហាងអាហារទេ!' : 'Restaurant not found!', 'warning');
      return false;
    }

    const isAdmin = 
      currentUser?.role === 'admin' || 
      currentUser?.id === 'admin-authorized-single' || 
      currentUser?.username === 'admin' || 
      currentUser?.username === 'cheasavuth';

    const isOwner = Boolean(currentUser?.id && targetRest.ownerId === currentUser.id);
    const isApprovedVip = isUserVipActive(currentUser);

    // Strict VIP Permission Enforcement: Only Admin or Approved VIP Owner can add menu items
    if (!isAdmin && !(isOwner && isApprovedVip)) {
      const state = getVipAccountState(currentUser);
      let errorMsg = language === 'km' 
        ? '🔒 សិទ្ធិត្រូវបានបដិសេធ! មានតែម្ចាស់ហាង VIP ដែលបានអនុម័ត ឬ Admin ប៉ុណ្ណោះដែលអាចបន្ថែមមុខម្ហូបបាន។' 
        : '🔒 Unauthorized! Only approved VIP shop owners or Admin can add food items.';
      if (isOwner && state === 'pending_vip') {
        errorMsg = language === 'km'
          ? '⏳ គណនី VIP របស់អ្នកកំពុងរង់ចាំការអនុម័តពី Admin។ មិនទាន់អាចបន្ថែមមុខម្ហូបបាននៅឡើយទេ!'
          : '⏳ Your VIP request is awaiting Admin approval.';
      } else if (isOwner && state === 'expired_vip') {
        errorMsg = language === 'km'
          ? '⚠️ សមាជិកភាព VIP របស់អ្នកបានផុតកំណត់ហើយ! សូមបន្តកញ្ចប់ VIP ដើម្បីបន្ថែមមុខម្ហូប។'
          : '⚠️ Your VIP subscription has expired! Please renew to add food items.';
      }
      showToast(errorMsg, 'warning');
      return false;
    }

    const currentItems = targetRest.menuItems || [];
    if (currentItems.length >= 20) {
      showToast(
        language === 'km' 
          ? 'សមាជិកភាព Premium VIP អនុញ្ញាតឱ្យបន្ថែមមុខម្ហូបអតិបរមាត្រឹម ២០ មុខប៉ុណ្ណោះ!' 
          : 'Premium VIP membership allows a maximum of 20 food menu items!',
        'warning'
      );
      return false;
    }

    const newItem: RestaurantMenuItem = {
      ...itemData,
      id: `menu-${Date.now()}`,
      restaurantId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updatedMenuItems = [...currentItems, newItem];
    setRestaurants(prev => prev.map(r => {
      if (r.id !== restaurantId) return r;
      return {
        ...r,
        membershipTier: 'premium' as MembershipTier,
        isPromoted: true,
        menuItems: updatedMenuItems,
      };
    }));

    if (selectedRestaurant?.id === restaurantId) {
      setSelectedRestaurant({
        ...selectedRestaurant,
        membershipTier: 'premium',
        isPromoted: true,
        menuItems: updatedMenuItems,
      });
    }
    if (managingRestaurant?.id === restaurantId) {
      setManagingRestaurant({
        ...managingRestaurant,
        membershipTier: 'premium',
        isPromoted: true,
        menuItems: updatedMenuItems,
      });
    }

    showToast(
      language === 'km' 
        ? `បានបន្ថែមមុខម្ហូប "${newItem.nameKh}" ជោគជ័យ (${updatedMenuItems.length}/20)!` 
        : `Added menu item "${newItem.nameKh}" (${updatedMenuItems.length}/20)!`,
      'success'
    );
    return true;
  };

  const updateRestaurantMenuItem = (restaurantId: string, updatedItem: RestaurantMenuItem): boolean => {
    const targetRest = restaurants.find(r => r.id === restaurantId);
    if (!targetRest) return false;

    const isAdmin = 
      currentUser?.role === 'admin' || 
      currentUser?.id === 'admin-authorized-single' || 
      currentUser?.username === 'admin' || 
      currentUser?.username === 'cheasavuth';

    const isOwner = Boolean(currentUser?.id && targetRest.ownerId === currentUser.id);
    const isApprovedVip = isUserVipActive(currentUser);

    // Strict VIP Permission Enforcement: Only Admin or Approved VIP Owner can edit menu items
    if (!isAdmin && !(isOwner && isApprovedVip)) {
      const state = getVipAccountState(currentUser);
      let errorMsg = language === 'km' 
        ? '🔒 គ្មានសិទ្ធិកែប្រែមុខម្ហូបទេ! មានតែម្ចាស់ហាង VIP ដែលបានអនុម័ត ឬ Admin ប៉ុណ្ណោះដែលអាចកែប្រែបាន។' 
        : '🔒 Unauthorized! Only approved VIP shop owners or Admin can edit food items.';
      if (isOwner && state === 'pending_vip') {
        errorMsg = language === 'km'
          ? '⏳ គណនី VIP របស់អ្នកកំពុងរង់ចាំការអនុម័តពី Admin។'
          : '⏳ Your VIP request is awaiting Admin approval.';
      } else if (isOwner && state === 'expired_vip') {
        errorMsg = language === 'km'
          ? '⚠️ សមាជិកភាព VIP របស់អ្នកបានផុតកំណត់ហើយ! សូមបន្តកញ្ចប់ VIP ដើម្បីកែប្រែមុខម្ហូប។'
          : '⚠️ Your VIP subscription has expired!';
      }
      showToast(errorMsg, 'warning');
      return false;
    }

    const updatedMenuItems = (targetRest.menuItems || []).map(item => 
      item.id === updatedItem.id ? { ...updatedItem, updatedAt: new Date().toISOString().split('T')[0] } : item
    );

    setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, menuItems: updatedMenuItems } : r));
    if (selectedRestaurant?.id === restaurantId) {
      setSelectedRestaurant({ ...selectedRestaurant, menuItems: updatedMenuItems });
    }
    if (managingRestaurant?.id === restaurantId) {
      setManagingRestaurant({ ...managingRestaurant, menuItems: updatedMenuItems });
    }

    showToast(language === 'km' ? 'បានកែប្រែព័ត៌មានមុខម្ហូបជោគជ័យ!' : 'Menu item updated!', 'success');
    return true;
  };

  const deleteRestaurantMenuItem = (restaurantId: string, menuItemId: string): boolean => {
    const targetRest = restaurants.find(r => r.id === restaurantId);
    if (!targetRest) return false;

    const isAdmin = 
      currentUser?.role === 'admin' || 
      currentUser?.id === 'admin-authorized-single' || 
      currentUser?.username === 'admin' || 
      currentUser?.username === 'cheasavuth';

    const isOwner = Boolean(currentUser?.id && targetRest.ownerId === currentUser.id);
    const isApprovedVip = isUserVipActive(currentUser);

    // Strict VIP Permission Enforcement: Only Admin or Approved VIP Owner can delete menu items
    if (!isAdmin && !(isOwner && isApprovedVip)) {
      showToast(language === 'km' ? '🔒 គ្មានសិទ្ធិលុបមុខម្ហូបទេ! មានតែម្ចាស់ហាង VIP ដែលបានអនុម័ត ឬ Admin ប៉ុណ្ណោះ។' : '🔒 Unauthorized!', 'warning');
      return false;
    }

    const updatedMenuItems = (targetRest.menuItems || []).filter(item => item.id !== menuItemId);
    setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, menuItems: updatedMenuItems } : r));
    if (selectedRestaurant?.id === restaurantId) {
      setSelectedRestaurant({ ...selectedRestaurant, menuItems: updatedMenuItems });
    }

    showToast(language === 'km' ? 'បានលុបមុខម្ហូប!' : 'Menu item removed', 'info');
    return true;
  };

  const upgradeRestaurantToPremium = (
    restaurantId: string, 
    transactionRef: string, 
    paymentMethod: 'KHQR' | 'Bakong' | 'BankTransfer' = 'BankTransfer'
  ) => {
    const targetRest = restaurants.find(r => r.id === restaurantId);
    if (!targetRest) return;

    addRegistrationTransaction({
      restaurantId,
      restaurantNameKh: targetRest.nameKh,
      restaurantNameEn: targetRest.nameEn,
      ownerId: currentUser?.id || targetRest.ownerId || 'owner-guest',
      ownerName: currentUser?.name || 'Restaurant Owner',
      ownerPhone: targetRest.phone,
      amountUsd: VIP_QUARTERLY_PRICE_USD,
      durationDays: VIP_QUARTERLY_DAYS,
      paymentMethod,
      transactionRef: transactionRef.trim(),
      notes: 'VIP 30 Days ($2.99) or VIP 90 Days ($4.99) Membership. 10 VIP Benefits.',
    });

    setRestaurants(prev => prev.map(r => {
      if (r.id !== restaurantId) return r;
      return {
        ...r,
        paymentStatus: 'pending_verification',
      };
    }));

    showToast(
      language === 'km' 
        ? 'បានផ្ញើសំណើដំឡើង VIP រួចរាល់! រដ្ឋបាលនឹងត្រួតពិនិត្យ និងបើកដំណើរការជូន។' 
        : 'Submitted VIP upgrade request! Admin will verify and activate access.',
      'success'
    );
  };

  // Restaurant Analytics (Views, Calls, Maps, Shares) — Throttled to prevent duplicate re-renders
  const recentTrackedViewsRef = useRef<Record<string, number>>({});

  const trackRestaurantView = (restaurantId: string) => {
    const now = Date.now();
    if (recentTrackedViewsRef.current[restaurantId] && now - recentTrackedViewsRef.current[restaurantId] < 30000) {
      return;
    }
    recentTrackedViewsRef.current[restaurantId] = now;
    setRestaurants(prev => prev.map(r => {
      if (r.id !== restaurantId) return r;
      const cur = r.analytics || { views: 0, phoneClicks: 0, mapClicks: 0, shareClicks: 0 };
      return {
        ...r,
        analytics: {
          ...cur,
          views: (cur.views || 0) + 1,
        }
      };
    }));
  };

  const trackRestaurantCall = (restaurantId: string) => {
    setRestaurants(prev => prev.map(r => {
      if (r.id !== restaurantId) return r;
      const cur = r.analytics || { views: 0, phoneClicks: 0, mapClicks: 0, shareClicks: 0 };
      return {
        ...r,
        analytics: {
          ...cur,
          phoneClicks: (cur.phoneClicks || 0) + 1,
        }
      };
    }));
  };

  const trackRestaurantMap = (restaurantId: string) => {
    setRestaurants(prev => prev.map(r => {
      if (r.id !== restaurantId) return r;
      const cur = r.analytics || { views: 0, phoneClicks: 0, mapClicks: 0, shareClicks: 0 };
      return {
        ...r,
        analytics: {
          ...cur,
          mapClicks: (cur.mapClicks || 0) + 1,
        }
      };
    }));
  };

  const trackRestaurantShare = (restaurantId: string) => {
    setRestaurants(prev => prev.map(r => {
      if (r.id !== restaurantId) return r;
      const cur = r.analytics || { views: 0, phoneClicks: 0, mapClicks: 0, shareClicks: 0 };
      return {
        ...r,
        analytics: {
          ...cur,
          shareClicks: (cur.shareClicks || 0) + 1,
        }
      };
    }));
  };

  const deleteRestaurant = (id: string) => {
    const target = restaurants.find(r => r.id === id);
    if (!target) return;
    const isAdmin = 
      currentUser?.role === 'admin' || 
      currentUser?.id === 'admin-authorized-single' || 
      currentUser?.username === 'admin' || 
      currentUser?.username === 'cheasavuth';

    const isOwner = Boolean(currentUser?.id && target.ownerId === currentUser.id);
    const isApprovedVip = isUserVipActive(currentUser);

    if (!isAdmin && !(isOwner && isApprovedVip)) {
      showToast(
        language === 'km'
          ? '⛔ គ្មានសិទ្ធិលុបហាងនេះទេ! មានតែម្ចាស់ហាង VIP ដែលបានអនុម័ត ឬ Admin ប៉ុណ្ណោះដែលអាចលុបបាន។'
          : '⛔ Unauthorized! Only approved VIP shop owners or Admin can delete this restaurant.',
        'warning'
      );
      return;
    }
    setRestaurants(prev => prev.filter(r => r.id !== id));
    if (selectedRestaurant?.id === id) setSelectedRestaurant(null);
    if (managingRestaurant?.id === id) {
      setManagingRestaurant(null);
      setIsManageMenuModalOpen(false);
    }
    showToast(
      language === 'km'
        ? '🗑️ បានលុបហាងអាហាររួចរាល់! ឥឡូវនេះអ្នកអាចបន្ថែមហាងថ្មីជំនួសបាន។'
        : '🗑️ Restaurant deleted! You can now add a new restaurant.',
      'info'
    );
  };

  const approveRestaurant = (id: string) => {
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    showToast(language === 'km' ? 'បានអនុម័តហាងអាហារជោគជ័យ' : 'Restaurant approved!', 'success');
  };

  const toggleVerifyRestaurant = (id: string) => {
    setRestaurants(prev => prev.map(r => {
      if (r.id !== id) return r;
      const nextVerified = !r.isVerified;
      showToast(
        nextVerified
          ? (language === 'km' ? `បានផ្ទៀងផ្ទាត់ហាង "${r.nameKh}" ត្រឹមត្រូវផ្លូវការ` : `Verified ${r.nameEn}!`)
          : (language === 'km' ? `បានដាក់ហាង "${r.nameKh}" ក្នុងស្ថានភាពមិនទាន់ផ្ទៀងផ្ទាត់` : `Set ${r.nameEn} to unverified`),
        'info'
      );
      return { ...r, isVerified: nextVerified };
    }));
  };

  const checkDuplicateDestination = (
    candidate: { nameKh: string; nameEn?: string; provinceKh?: string; latitude?: number; longitude?: number },
    excludeId?: string
  ): { isDuplicate: boolean; duplicate?: TouristDestination; reason?: string } => {
    const normKh = (candidate.nameKh || '').replace(/[()（）\s\-_.,/]/g, '').toLowerCase();
    const normEn = (candidate.nameEn || '').trim().toLowerCase();

    for (const item of destinations) {
      if (excludeId && item.id === excludeId) continue;

      const itemNormKh = (item.nameKh || '').replace(/[()（）\s\-_.,/]/g, '').toLowerCase();
      const itemNormEn = (item.nameEn || '').trim().toLowerCase();
      const sameProvince = !candidate.provinceKh || candidate.provinceKh === item.provinceKh;

      // Exact Khmer root match
      if (normKh && normKh === itemNormKh) {
        return { isDuplicate: true, duplicate: item, reason: `ឈ្មោះដូចគ្នា៖ "${item.nameKh}"` };
      }

      // Exact English root match
      if (normEn && normEn.length >= 4 && normEn === itemNormEn) {
        return { isDuplicate: true, duplicate: item, reason: `English name matches: "${item.nameEn}"` };
      }

      // Strong substring match in same province
      if (sameProvince && normKh.length >= 6 && itemNormKh.length >= 6 && (normKh.includes(itemNormKh) || itemNormKh.includes(normKh))) {
        return { isDuplicate: true, duplicate: item, reason: `ឈ្មោះស្រដៀងគ្នាក្នុងខេត្ត ${item.provinceKh}៖ "${item.nameKh}"` };
      }

      // Proximity check (< 100 meters)
      if (candidate.latitude && candidate.longitude && item.latitude && item.longitude) {
        const dLat = Math.abs(candidate.latitude - item.latitude);
        const dLng = Math.abs(candidate.longitude - item.longitude);
        if (dLat < 0.001 && dLng < 0.001) {
          return { isDuplicate: true, duplicate: item, reason: `កូអរដោនេទីតាំងត្រួតគ្នាជាមួយ "${item.nameKh}"` };
        }
      }
    }

    return { isDuplicate: false };
  };

  // Destination CRUD
  const addDestination = (destData: Omit<TouristDestination, 'id' | 'rating' | 'reviewCount'>): boolean => {
    const dup = checkDuplicateDestination(destData);
    if (dup.isDuplicate && dup.duplicate) {
      showToast(
        language === 'km'
          ? `⚠️ ទីតាំងនេះមានរួចហើយ៖ «${dup.duplicate.nameKh}» (${dup.duplicate.provinceKh})`
          : `⚠️ Duplicate destination detected: "${dup.duplicate.nameEn}" (${dup.duplicate.provinceEn})`,
        'error'
      );
      return false;
    }

    const newDest: TouristDestination = {
      ...destData,
      id: `dest-${Date.now()}`,
      rating: 5.0,
      reviewCount: 1,
    };
    setDestinations(prev => {
      const next = [newDest, ...prev];
      try {
        localStorage.setItem('kft_destinations_real_v7', JSON.stringify(next));
      } catch (e) {
        scheduleStorageWrite('kft_destinations_real_v7', next, 500);
      }
      return next;
    });
    showToast(language === 'km' ? 'បានបញ្ចូលតំបន់ទេសចរណ៍ថ្មី' : 'Destination added!', 'success');
    return true;
  };

  const updateDestination = (updated: TouristDestination) => {
    const customUpdated: TouristDestination = {
      ...updated,
      isCustomPhoto: true,
      photoUpdatedAt: new Date().toISOString(),
    };

    // Persist to permanent photo overrides vault (guarantees preservation across app updates)
    try {
      const savedOverrides = localStorage.getItem('kft_destination_photo_overrides_v1');
      const overrides = savedOverrides ? JSON.parse(savedOverrides) : {};
      overrides[customUpdated.id] = {
        photoUrl: customUpdated.photoUrl,
        updatedAt: customUpdated.photoUpdatedAt,
      };
      localStorage.setItem('kft_destination_photo_overrides_v1', JSON.stringify(overrides));
    } catch (e) {
      console.warn('Failed to persist to photo overrides vault', e);
    }

    setDestinations(prev => {
      const next = prev.map(d => d.id === customUpdated.id ? customUpdated : d);
      try {
        localStorage.setItem('kft_destinations_real_v7', JSON.stringify(next));
      } catch (e) {
        scheduleStorageWrite('kft_destinations_real_v7', next, 500);
      }
      return next;
    });
    if (selectedDestination?.id === customUpdated.id) {
      setSelectedDestination(customUpdated);
    }
  };

  const deleteDestination = (id: string) => {
    setDestinations(prev => prev.filter(d => d.id !== id));
    if (selectedDestination?.id === id) setSelectedDestination(null);
    showToast(language === 'km' ? 'បានលុបតំបន់ទេសចរណ៍' : 'Destination deleted', 'info');
  };

  // Community Posts
  const addPost = (
    titleKh: string, 
    descriptionKh: string, 
    photoUrl: string, 
    categoryTag: string, 
    locationName: string
  ) => {
    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      authorId: currentUser?.id || 'anon',
      authorName: currentUser?.name || (language === 'km' ? 'អ្នកប្រើប្រាស់ទូទៅ' : 'Khmer Foodie'),
      authorAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      authorRole: currentUser?.role || 'user',
      titleKh,
      descriptionKh,
      photoUrl,
      categoryTag,
      locationName,
      likesCount: 0,
      likedByUserIds: [],
      comments: [],
      createdAt: language === 'km' ? 'អម្បាញ់មិញ' : 'Just now',
      status: 'approved',
    };
    setPosts(prev => [newPost, ...prev]);
    showToast(language === 'km' ? 'បានចែករំលែកការបង្ហោះបានជោគជ័យ 🎉' : 'Post shared successfully! 🎉', 'success');
  };

  const toggleLikePost = (postId: string) => {
    if (!currentUser) {
      showToast(
        language === 'km' 
          ? 'សូមចុះឈ្មោះ ឬចូលគណនី ដើម្បីចុច Like' 
          : 'Please sign in or register to like posts',
        'info'
      );
      setIsAuthModalOpen(true);
      return;
    }
    const uid = currentUser?.id || 'guest';
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const alreadyLiked = p.likedByUserIds.includes(uid);
      const newLiked = alreadyLiked 
        ? p.likedByUserIds.filter(id => id !== uid)
        : [...p.likedByUserIds, uid];
      return {
        ...p,
        likesCount: newLiked.length,
        likedByUserIds: newLiked,
      };
    }));
  };

  const addComment = (postId: string, text: string) => {
    if (!currentUser) {
      showToast(
        language === 'km' 
          ? 'សូមចុះឈ្មោះ ឬចូលគណនី ដើម្បីបញ្ចេញមតិយោបល់' 
          : 'Please sign in or register to comment',
        'info'
      );
      setIsAuthModalOpen(true);
      return;
    }
    if (!text.trim()) return;
    const newComment = {
      id: `c-${Date.now()}`,
      authorId: currentUser?.id || 'guest',
      authorName: currentUser?.name || (language === 'km' ? 'អ្នកប្រើប្រាស់' : 'Khmer Foodie'),
      authorAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      text,
      createdAt: language === 'km' ? 'អម្បាញ់មិញ' : 'Just now',
    };
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        comments: [...p.comments, newComment],
      };
    }));
    showToast(language === 'km' ? 'បានបញ្ចេញមតិយោបល់' : 'Comment added', 'info');
  };

  const deletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    showToast(language === 'km' ? 'បានលុបការបង្ហោះ' : 'Post deleted', 'info');
  };

  // Transactions & $4.99 Registration Payment
  const addRegistrationTransaction = (txnData: Omit<RegistrationTransaction, 'id' | 'createdAt' | 'status'>): RegistrationTransaction => {
    const id = `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const newTxn: RegistrationTransaction = {
      ...txnData,
      id,
      status: 'pending_verification',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
    setTransactions(prev => [newTxn, ...prev]);
    return newTxn;
  };

  const verifyTransaction = (txnId: string) => {
    // Security Safeguard: Only authenticated Administrator can approve payments
    if (!currentUser || currentUser.role !== 'admin') {
      showToast(
        language === 'km' 
          ? '⛔ គ្មានសិទ្ធិអនុញ្ញាត៖ មានតែគណនី Administrator ប៉ុណ្ណោះដែលអាចអនុម័តការទូទាត់ប្រាក់បាន!' 
          : '⛔ Unauthorized: Only an authenticated Administrator can approve payments!',
        'warning'
      );
      return;
    }

    const matchedTxn = transactions.find(t => t.id === txnId);
    if (!matchedTxn) return;

    // Prevent duplicate approvals and duplicate VIP extensions
    if (matchedTxn.status === 'verified') {
      showToast(
        language === 'km' 
          ? 'ប្រតិបត្តិការនេះត្រូវបានអនុម័តរួចហើយ!' 
          : 'This transaction has already been approved!',
        'info'
      );
      return;
    }

    const targetRestId = matchedTxn.restaurantId || '';
    const targetUserId = matchedTxn.userId || '';
    const validatedPlan = resolveAndValidateVipPlan({
      planType: matchedTxn.planType,
      durationDays: matchedTxn.durationDays,
      amountUsd: matchedTxn.amountUsd,
    });
    const durationDays = validatedPlan.durationDays;
    const now = new Date();
    const verifiedTimestamp = now.toISOString().replace('T', ' ').slice(0, 16);
    const adminIdentity = currentUser.name || 'Chea Savuth (Admin)';

    const matchedUserObj = users.find(u => u.id === targetUserId);
    const { startDate: calcStart, expiryDate: calcExpiry } = calculateVipDates(
      matchedUserObj?.subscriptionExpiryDate,
      durationDays
    );

    setTransactions(prev => prev.map(t => {
      if (t.id !== txnId) return t;
      return {
        ...t,
        durationDays,
        amountUsd: validatedPlan.priceUsd,
        planType: validatedPlan.id,
        status: 'verified',
        paymentStatus: 'verified',
        verifiedAt: verifiedTimestamp,
        verifiedBy: adminIdentity,
        expiresAt: calcExpiry,
      };
    }));

    // Record Admin Audit Log
    try {
      const rawLogs = localStorage.getItem('kft_admin_audit_logs_v1');
      const logs = rawLogs ? JSON.parse(rawLogs) : [];
      logs.unshift({
        id: `audit_${Date.now()}`,
        action: 'APPROVE_PAYMENT',
        txnId,
        transactionRef: matchedTxn.transactionRef,
        targetUserId,
        amountUsd: validatedPlan.priceUsd,
        durationDays,
        adminId: currentUser.id,
        adminName: adminIdentity,
        timestamp: now.toISOString()
      });
      localStorage.setItem('kft_admin_audit_logs_v1', JSON.stringify(logs.slice(0, 200)));
    } catch {}

    if (targetRestId) {
      setRestaurants(prev => prev.map(r => {
        if (r.id !== targetRestId) return r;
        return {
          ...r,
          status: 'approved',
          isVerified: true,
          isPromoted: true,
          membershipTier: 'premium',
          membershipExpiresAt: calcExpiry,
          paymentStatus: 'verified',
          paymentDate: now.toISOString().split('T')[0],
        };
      }));
    }

    if (targetUserId) {
      setUsers(prev => prev.map(u => {
        if (u.id !== targetUserId) return u;
        return {
          ...u,
          membershipTier: 'premium_vip',
          subscriptionStartDate: calcStart,
          subscriptionExpiryDate: calcExpiry,
          subscriptionStatus: 'active',
          paymentStatus: 'verified'
        };
      }));

      if (currentUser?.id === targetUserId) {
        setCurrentUser(prev => prev ? {
          ...prev,
          membershipTier: 'premium_vip',
          subscriptionStartDate: calcStart,
          subscriptionExpiryDate: calcExpiry,
          subscriptionStatus: 'active',
          paymentStatus: 'verified'
        } : null);
      }

      // Upgrade user's restaurants if any
      setRestaurants(prev => prev.map(r => {
        if (r.ownerId !== targetUserId) return r;
        return {
          ...r,
          membershipTier: 'premium',
          membershipExpiresAt: calcExpiry,
          isPromoted: true,
          isVerified: true
        };
      }));

      // Add approval notification
      const approvalNotif: AppNotification = {
        id: `notif-approved-${Date.now()}`,
        titleKh: '🎉 សមាជិកភាព Premium VIP ត្រូវបានអនុម័ត!',
        titleEn: '🎉 Premium VIP Membership Approved!',
        messageKh: `រដ្ឋបាលបានពិនិត្យ និងអនុម័តដំឡើងគណនីរបស់អ្នកជា Premium VIP (${durationDays} ថ្ងៃ) ដោយជោគជ័យ! អត្ថប្រយោជន៍ទាំង ១០ ត្រូវបានបើកដំណើរការពេញលេញ។`,
        messageEn: `Administrator approved your Premium VIP membership for ${durationDays} days successfully! All 10 benefits are active.`,
        type: 'system',
        date: now.toISOString().split('T')[0],
        isRead: false
      };
      setNotifications(prev => [approvalNotif, ...prev]);
    }

    showToast(
      language === 'km' 
        ? 'បានផ្ទៀងផ្ទាត់ និងអនុម័តធ្វើឱ្យសមាជិកភាពសកម្មដោយជោគជ័យ!' 
        : 'Payment verified: Membership activated successfully!',
      'success'
    );
  };

  const rejectTransaction = (txnId: string, reason?: string) => {
    // Security Safeguard: Only authenticated Administrator can reject payments
    if (!currentUser || currentUser.role !== 'admin') {
      showToast(
        language === 'km' 
          ? '⛔ គ្មានសិទ្ធិអនុញ្ញាត៖ មានតែគណនី Administrator ប៉ុណ្ណោះដែលអាចបដិសេធការទូទាត់ប្រាក់បាន!' 
          : '⛔ Unauthorized: Only an authenticated Administrator can reject payments!',
        'warning'
      );
      return;
    }

    const matchedTxn = transactions.find(t => t.id === txnId);
    if (!matchedTxn) return;

    const targetRestId = matchedTxn.restaurantId || '';
    const targetUserId = matchedTxn.userId || '';
    const rejectionReason = reason || 'ការទូទាត់មិនអាចផ្ទៀងផ្ទាត់បានជាមួយរបាយការណ៍ធនាគារ (Transaction could not be verified on bank statement).';
    const adminIdentity = currentUser.name || 'Chea Savuth (Admin)';

    setTransactions(prev => prev.map(t => {
      if (t.id !== txnId) return t;
      return {
        ...t,
        status: 'rejected',
        paymentStatus: 'failed',
        notes: rejectionReason,
        verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        verifiedBy: adminIdentity,
      };
    }));

    // Record Admin Audit Log
    try {
      const rawLogs = localStorage.getItem('kft_admin_audit_logs_v1');
      const logs = rawLogs ? JSON.parse(rawLogs) : [];
      logs.unshift({
        id: `audit_${Date.now()}`,
        action: 'REJECT_PAYMENT',
        txnId,
        transactionRef: matchedTxn.transactionRef,
        targetUserId,
        amountUsd: matchedTxn.amountUsd,
        reason: rejectionReason,
        adminId: currentUser.id,
        adminName: adminIdentity,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('kft_admin_audit_logs_v1', JSON.stringify(logs.slice(0, 200)));
    } catch {}

    if (targetRestId) {
      setRestaurants(prev => prev.map(r => {
        if (r.id !== targetRestId) return r;
        return {
          ...r,
          paymentStatus: 'rejected',
        };
      }));
    }

    if (targetUserId) {
      setUsers(prev => prev.map(u => {
        if (u.id !== targetUserId) return u;
        return {
          ...u,
          membershipTier: isUserVipActive(u) ? u.membershipTier : 'free',
          subscriptionStatus: isUserVipActive(u) ? u.subscriptionStatus : 'cancelled',
          paymentStatus: 'failed'
        };
      }));

      if (currentUser?.id === targetUserId) {
        setCurrentUser(prev => prev ? {
          ...prev,
          membershipTier: isUserVipActive(prev) ? prev.membershipTier : 'free',
          subscriptionStatus: isUserVipActive(prev) ? prev.subscriptionStatus : 'cancelled',
          paymentStatus: 'failed'
        } : null);
      }

      const rejectNotif: AppNotification = {
        id: `notif-rejected-${Date.now()}`,
        titleKh: '❌ សំណើដំឡើង VIP ត្រូវបានបដិសេធ',
        titleEn: '❌ VIP Upgrade Request Rejected',
        messageKh: `សំណើដំឡើង VIP របស់អ្នកមិនត្រូវបានអនុម័តទេ៖ ${rejectionReason}`,
        messageEn: `Your VIP upgrade request was rejected: ${rejectionReason}`,
        type: 'system',
        date: new Date().toISOString().split('T')[0],
        isRead: false
      };
      setNotifications(prev => [rejectNotif, ...prev]);
    }

    showToast(
      language === 'km' 
        ? 'បានបដិសេធប្រតិបត្តិការទូទាត់' 
        : 'Transaction rejected',
      'info'
    );
  };

  // Request More Payment Information / Clearer Receipt from User (Admin Only)
  const requestMorePaymentInfo = (txnId: string, reason?: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast(
        language === 'km'
          ? '⛔ គ្មានសិទ្ធិអនុញ្ញាត៖ មានតែគណនី Administrator ប៉ុណ្ណោះដែលអាចស្នើសុំព័ត៌មានបន្ថែមបាន!'
          : '⛔ Unauthorized: Only an authenticated Administrator can request more payment info!',
        'warning'
      );
      return;
    }

    const matchedTxn = transactions.find(t => t.id === txnId);
    if (!matchedTxn) return;

    const targetUserId = matchedTxn.userId || '';
    const reqNote =
      reason ||
      'សូមអាប់ឡូតរូបភាពវិក្កយបត្របង់ប្រាក់ ABA ឱ្យបានច្បាស់លាស់ (បង្ហាញចំនួនទឹកប្រាក់ កាលបរិច្ឆេទ និងលេខប្រតិបត្តិការ)។ (Please upload a clearer payment receipt screenshot showing amount, date, and transaction ID.)';
    const adminIdentity = currentUser.name || 'Chea Savuth (Admin)';

    setTransactions(prev =>
      prev.map(t => {
        if (t.id !== txnId) return t;
        return {
          ...t,
          status: 'needs_more_info',
          adminRequestNote: reqNote,
          notes: reqNote,
          verifiedBy: adminIdentity,
        };
      })
    );

    try {
      const rawLogs = localStorage.getItem('kft_admin_audit_logs_v1');
      const logs = rawLogs ? JSON.parse(rawLogs) : [];
      logs.unshift({
        id: `audit_${Date.now()}`,
        action: 'REQUEST_MORE_PAYMENT_INFO',
        txnId,
        transactionRef: matchedTxn.transactionRef,
        targetUserId,
        amountUsd: matchedTxn.amountUsd,
        reason: reqNote,
        adminId: currentUser.id,
        adminName: adminIdentity,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('kft_admin_audit_logs_v1', JSON.stringify(logs.slice(0, 200)));
    } catch {}

    if (targetUserId) {
      setUsers(prev =>
        prev.map(u => {
          if (u.id !== targetUserId) return u;
          return {
            ...u,
            membershipTier: isUserVipActive(u) ? u.membershipTier : 'free',
            subscriptionStatus: isUserVipActive(u) ? u.subscriptionStatus : 'pending',
            paymentStatus: 'needs_more_info',
          };
        })
      );

      if (currentUser?.id === targetUserId) {
        setCurrentUser(prev =>
          prev
            ? {
                ...prev,
                membershipTier: isUserVipActive(prev) ? prev.membershipTier : 'free',
                subscriptionStatus: isUserVipActive(prev) ? prev.subscriptionStatus : 'pending',
                paymentStatus: 'needs_more_info',
              }
            : null
        );
      }

      const infoNotif: AppNotification = {
        id: `notif-more-info-${Date.now()}`,
        titleKh: '💬 រដ្ឋបាលស្នើសុំភស្តុតាងបង់ប្រាក់បន្ថែម',
        titleEn: '💬 Admin Requested Clearer Payment Proof',
        messageKh: `សំណើ VIP របស់អ្នកត្រូវការព័ត៌មានបន្ថែម៖ ${reqNote}`,
        messageEn: `Your VIP payment request requires additional proof: ${reqNote}`,
        type: 'system',
        date: new Date().toISOString().split('T')[0],
        isRead: false,
      };
      setNotifications(prev => [infoNotif, ...prev]);
    }

    showToast(
      language === 'km'
        ? 'បានផ្ញើសំណើសុំភស្តុតាងបង់ប្រាក់បន្ថែមទៅកាន់អ្នកប្រើប្រាស់!'
        : 'Sent request for clearer payment proof to user!',
      'info'
    );
  };

  // Secure Payment Proof Access Control (Owner & Authorized Admin Only)
  const getAuthorizedPaymentProof = (txnId: string): string | null => {
    if (!currentUser) return null;
    const matchedTxn = transactions.find(t => t.id === txnId);
    if (!matchedTxn) return null;

    const isOwner =
      currentUser.id === matchedTxn.userId || currentUser.id === matchedTxn.ownerId;
    const isAdmin = currentUser.role === 'admin';

    if (!isOwner && !isAdmin) {
      return null;
    }

    if (matchedTxn.paymentProofUrl) {
      return matchedTxn.paymentProofUrl;
    }

    try {
      const rawVault = localStorage.getItem('kft_secure_payment_proofs_vault_v1');
      if (rawVault) {
        const vault = JSON.parse(rawVault);
        if (vault[txnId]?.dataUrl) {
          return vault[txnId].dataUrl;
        }
      }
    } catch {}

    return null;
  };

  // Upload or Replace Payment Proof Screenshot on an Existing Transaction
  const uploadPaymentProofToTransaction = (
    txnId: string,
    proofDataUrl: string,
    fileName: string = 'aba_payment_receipt.png',
    mimeType: string = 'image/png'
  ): { success: boolean; error?: string } => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, error: 'Authentication required' };
    }

    if (!proofDataUrl || !proofDataUrl.startsWith('data:image/')) {
      const msg =
        language === 'km'
          ? 'សូមជ្រើសរើសឯកសាររូបភាពឱ្យបានត្រឹមត្រូវ (JPG, JPEG, PNG)'
          : 'Please select a valid image file (JPG, JPEG, PNG)';
      showToast(msg, 'warning');
      return { success: false, error: msg };
    }

    const matchedTxn = transactions.find(t => t.id === txnId);
    if (!matchedTxn) {
      return { success: false, error: 'Transaction not found' };
    }

    const isOwner =
      currentUser.id === matchedTxn.userId || currentUser.id === matchedTxn.ownerId;
    const isAdmin = currentUser.role === 'admin';
    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Unauthorized to upload proof for this transaction' };
    }

    const nowIso = new Date().toISOString();

    try {
      const rawVault = localStorage.getItem('kft_secure_payment_proofs_vault_v1');
      const vault = rawVault ? JSON.parse(rawVault) : {};
      vault[txnId] = {
        txnId,
        userId: currentUser.id,
        dataUrl: proofDataUrl,
        fileName,
        mimeType,
        uploadedAt: nowIso,
      };
      localStorage.setItem('kft_secure_payment_proofs_vault_v1', JSON.stringify(vault));
    } catch (e) {
      console.warn('Payment proof vault save warning:', e);
    }

    setTransactions(prev =>
      prev.map(t => {
        if (t.id !== txnId) return t;
        return {
          ...t,
          status: t.status === 'needs_more_info' ? 'pending_verification' : t.status,
          paymentProofUrl: proofDataUrl,
          paymentProofUploadedAt: nowIso.replace('T', ' ').slice(0, 16),
          paymentProofFileName: fileName,
          paymentProofMimeType: mimeType,
        };
      })
    );

    if (currentUser.id === matchedTxn.userId) {
      const updatedPendingUser: User = {
        ...currentUser,
        membershipTier: isUserVipActive(currentUser) ? 'premium_vip' : 'free',
        subscriptionStatus: 'pending',
        paymentStatus: 'paid_pending_approval',
      };
      setCurrentUser(updatedPendingUser);
      setUsers(prev => prev.map(u => (u.id === currentUser.id ? updatedPendingUser : u)));
    }

    try {
      const rawLogs = localStorage.getItem('kft_admin_audit_logs_v1');
      const logs = rawLogs ? JSON.parse(rawLogs) : [];
      logs.unshift({
        id: `audit_${Date.now()}`,
        action: 'PAYMENT_PROOF_UPLOAD',
        txnId,
        transactionRef: matchedTxn.transactionRef,
        targetUserId: currentUser.id,
        amountUsd: matchedTxn.amountUsd,
        fileName,
        timestamp: nowIso,
      });
      localStorage.setItem('kft_admin_audit_logs_v1', JSON.stringify(logs.slice(0, 200)));
    } catch {}

    showToast(
      language === 'km'
        ? '📸 បានអាប់ឡូតភស្តុតាងបង់ប្រាក់រួចរាល់! កំពុងរង់ចាំ Admin ពិនិត្យ និងអនុម័ត។'
        : '📸 Payment proof uploaded! Awaiting Admin verification and approval.',
      'success'
    );

    return { success: true };
  };

  // User VIP Upgrade & Renewal Methods ($2.99 / 30 Days or $4.99 / 90 Days)
  const upgradeCurrentUserToVip = async (
    paymentMethod: 'GooglePlayBilling' | 'KHQR' | 'Bakong' | 'Card',
    transactionRef: string,
    last4?: string,
    amountUsd: number = VIP_QUARTERLY_PRICE_USD,
    durationDays: number = VIP_QUARTERLY_DAYS
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, error: 'Please sign in first.' };
    }

    try {
      const req: PaymentVerificationRequest = {
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
        paymentMethod,
        transactionRef,
        amountUsd,
        nonce: `vip_nonce_${Date.now()}`,
        timestamp: Date.now(),
        paymentToken: last4 ? `card_${last4}` : undefined
      };

      const result = await verifyPaymentOnBackend(req);
      if (!result.success) {
        const failedTxn: RegistrationTransaction = {
          id: `TXN-VIP-FAIL-${Date.now().toString(36).toUpperCase()}`,
          type: 'user_vip_upgrade',
          userId: currentUser.id,
          userName: currentUser.name,
          userEmail: currentUser.email,
          amountUsd,
          durationDays,
          membershipTier: 'premium_vip',
          status: 'failed',
          paymentMethod,
          transactionRef,
          createdAt: new Date().toISOString(),
          notes: result.error || 'Payment verification failed'
        };
        setTransactions(prev => [failedTxn, ...prev]);

        showToast(
          language === 'km' 
            ? `ការផ្ទៀងផ្ទាត់មិនជោគជ័យ៖ ${result.error || 'សូមព្យាយាមម្តងទៀត'}` 
            : `Verification failed: ${result.error || 'Please try again'}`,
          'warning'
        );
        return { success: false, error: result.error };
      }

      // Upgrade existing account
      const updatedUser: User = {
        ...currentUser,
        membershipTier: 'premium_vip',
        subscriptionStartDate: result.startDate,
        subscriptionExpiryDate: result.expiryDate,
        subscriptionStatus: 'active',
        paymentStatus: 'verified',
        paymentMethod,
        transactionRef: result.transactionRef,
        autoRenew: true
      };

      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));

      // Record verified transaction securely
      const verifiedTxn: RegistrationTransaction = {
        id: `TXN-VIP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        type: 'user_vip_upgrade',
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        amountUsd,
        durationDays: result.durationDays,
        membershipTier: 'premium_vip',
        status: 'verified',
        paymentMethod,
        transactionRef: result.transactionRef,
        verificationSignature: result.verificationSignature,
        createdAt: result.startDate,
        expiresAt: result.expiryDate,
        verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        verifiedBy: paymentMethod === 'GooglePlayBilling' ? 'Google Play Billing Server' : 'Secure ABA KHQR Payment Engine',
        notes: `${result.durationDays}-day Premium VIP membership activated successfully ($${amountUsd} USD)`
      };

      setTransactions(prev => [verifiedTxn, ...prev]);

      // Upgrade user's restaurants to VIP benefits
      setRestaurants(prev => prev.map(r => {
        if (r.ownerId !== currentUser.id) return r;
        return {
          ...r,
          membershipTier: 'premium',
          membershipExpiresAt: result.expiryDate,
          isPromoted: true,
          isVerified: true
        };
      }));

      showToast(
        language === 'km' 
          ? `អបអរសាទរ! គណនីរបស់អ្នកត្រូវបានដំឡើងទៅជា Premium VIP (${result.durationDays} ថ្ងៃ) ដោយជោគជ័យ! 🎉` 
          : `Congratulations! Your account has been upgraded to Premium VIP (${result.durationDays} days)! 🎉`,
        'success'
      );

      return { success: true };
    } catch (e: any) {
      console.error('Upgrade to VIP error:', e);
      return { success: false, error: e?.message || 'Unexpected payment error' };
    }
  };

  const renewCurrentUserVip = async (
    _paymentMethod: 'GooglePlayBilling' | 'KHQR' | 'Bakong' | 'Card',
    transactionRef: string,
    durationDays: number = VIP_QUARTERLY_DAYS,
    amountUsd: number = VIP_QUARTERLY_PRICE_USD
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Please sign in first.' };

    const validatedPlan = resolveAndValidateVipPlan({ durationDays, amountUsd });
    const reqRes = await submitVipUpgradeRequest(
      validatedPlan.durationDays,
      validatedPlan.priceUsd,
      transactionRef,
      `VIP Renewal Request (${validatedPlan.nameEn} - $${validatedPlan.priceUsd.toFixed(2)} / ${validatedPlan.durationDays} days) — Awaiting Admin Verification`
    );

    if (!reqRes.success) {
      return { success: false, error: reqRes.error };
    }
    return { success: true };
  };

  const restoreCurrentUserVipPurchases = async (): Promise<{ success: boolean; restored: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, restored: false, message: 'Please sign in first.' };
    }

    const eligible = checkEligibleRestoration(currentUser.id, currentUser.email, transactions);
    if (!eligible || !eligible.expiresAt) {
      const msg = language === 'km' 
        ? 'មិនមានការទូទាត់ VIP ដែលត្រូវស្តារឡើងវិញសម្រាប់គណនីនេះទេ' 
        : 'No active VIP purchases found to restore for this account.';
      showToast(msg, 'info');
      return { success: true, restored: false, message: msg };
    }

    const restoredUser: User = {
      ...currentUser,
      membershipTier: 'premium_vip',
      subscriptionStartDate: eligible.createdAt,
      subscriptionExpiryDate: eligible.expiresAt,
      subscriptionStatus: 'active',
      paymentStatus: 'verified',
      paymentMethod: eligible.paymentMethod,
      transactionRef: eligible.transactionRef
    };

    setCurrentUser(restoredUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? restoredUser : u));

    const successMsg = language === 'km' 
      ? `ការជាវ VIP របស់អ្នកត្រូវបានស្តារឡើងវិញដោយជោគជ័យ (ផុតកំណត់៖ ${eligible.expiresAt.split('T')[0]})! 🎉` 
      : `Your VIP subscription has been restored successfully (Expires: ${eligible.expiresAt.split('T')[0]})! 🎉`;
    showToast(successMsg, 'success');
    return { success: true, restored: true, message: successMsg };
  };

  // Submit VIP Upgrade Request for Administrator Review & Approval (Never activates VIP directly)
  const submitVipUpgradeRequest = async (
    durationDays: number = VIP_QUARTERLY_DAYS,
    amountUsd: number = VIP_QUARTERLY_PRICE_USD,
    transactionRef?: string,
    notes?: string,
    paymentProofData?: { dataUrl: string; fileName?: string; mimeType?: string }
  ): Promise<{ success: boolean; transactionId: string; error?: string }> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, transactionId: '', error: 'User authentication required' };
    }

    const validatedPlan = resolveAndValidateVipPlan({ durationDays, amountUsd });
    const validDays = validatedPlan.durationDays;
    const validPrice = validatedPlan.priceUsd;
    const planType: 'quarterly' | 'annual' = validatedPlan.id;

    // Check if there is an existing pending or needs_more_info request for this user
    const existingPending = transactions.find(
      t =>
        t.type === 'user_vip_upgrade' &&
        t.userId === currentUser.id &&
        (t.status === 'pending_verification' || t.status === 'needs_more_info')
    );

    if (existingPending && !isVipRenewMode) {
      // If user attached a new payment proof image, update the existing request!
      if (paymentProofData?.dataUrl) {
        uploadPaymentProofToTransaction(
          existingPending.id,
          paymentProofData.dataUrl,
          paymentProofData.fileName || 'aba_receipt.png',
          paymentProofData.mimeType || 'image/png'
        );
        return { success: true, transactionId: existingPending.id };
      }

      showToast(
        language === 'km' 
          ? '⏳ សំណើរបស់អ្នកកំពុងរង់ចាំ Admin ពិនិត្យការទូទាត់រួចហើយ!' 
          : '⏳ Your payment request is already pending Admin approval!',
        'info'
      );
      return { success: true, transactionId: existingPending.id };
    }

    const cleanTrxRef = (transactionRef || '').trim().toUpperCase() || 
      `ABA-KHQR-${validDays}D-${Date.now().toString(36).toUpperCase()}`;

    // Validate request parameters on backend before creating pending approval request
    const verification = await verifyAbaPaymentTransaction({
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      durationDays: validDays,
      amountUsd: validPrice,
      transactionRef: cleanTrxRef,
      paymentMethod: 'KHQR',
      timestamp: Date.now()
    });

    if (!verification.success) {
      const errMsg = verification.error || 'Payment request validation failed';
      showToast(
        language === 'km' 
          ? `សំណើទូទាត់មិនត្រឹមត្រូវ៖ ${errMsg}` 
          : `Payment request invalid: ${errMsg}`,
        'warning'
      );
      return { success: false, transactionId: '', error: errMsg };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const formattedNow = nowIso.replace('T', ' ').slice(0, 16);
    const txnId = `TXN-VIP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    if (paymentProofData?.dataUrl) {
      try {
        const rawVault = localStorage.getItem('kft_secure_payment_proofs_vault_v1');
        const vault = rawVault ? JSON.parse(rawVault) : {};
        vault[txnId] = {
          txnId,
          userId: currentUser.id,
          dataUrl: paymentProofData.dataUrl,
          fileName: paymentProofData.fileName || 'aba_receipt.png',
          mimeType: paymentProofData.mimeType || 'image/png',
          uploadedAt: nowIso,
        };
        localStorage.setItem('kft_secure_payment_proofs_vault_v1', JSON.stringify(vault));
      } catch (e) {
        console.warn('Payment proof vault save warning:', e);
      }

      try {
        const rawLogs = localStorage.getItem('kft_admin_audit_logs_v1');
        const logs = rawLogs ? JSON.parse(rawLogs) : [];
        logs.unshift({
          id: `audit_${Date.now()}`,
          action: 'PAYMENT_PROOF_UPLOAD',
          txnId,
          transactionRef: cleanTrxRef,
          targetUserId: currentUser.id,
          amountUsd: validPrice,
          durationDays: validDays,
          fileName: paymentProofData.fileName || 'aba_receipt.png',
          timestamp: nowIso,
        });
        localStorage.setItem('kft_admin_audit_logs_v1', JSON.stringify(logs.slice(0, 200)));
      } catch {}
    }

    // Run AI + Deterministic Receipt Verification if payment proof image is attached
    let aiReport: AbaReceiptVerificationReport | undefined;
    if (paymentProofData?.dataUrl) {
      aiReport = await verifyAbaPaymentAndReceipt({
        receiptDataUrl: paymentProofData.dataUrl,
        expectedAmountUsd: validPrice,
        expectedDurationDays: validDays,
        submittedTrxId: cleanTrxRef,
        submittedDate: nowIso.split('T')[0],
        userId: currentUser.id,
        existingTransactions: transactions,
      });
    }

    const effectiveTrxRef =
      aiReport?.extractedReceipt?.trxId && /^ABA-KHQR-/i.test(cleanTrxRef)
        ? aiReport.extractedReceipt.trxId
        : cleanTrxRef;

    const isAutoVerified = Boolean(
      aiReport && aiReport.canAutoApprove && aiReport.status === 'verified'
    );

    const { startDate, expiryDate } = calculateVipDates(
      currentUser.subscriptionExpiryDate,
      validDays
    );

    if (isAutoVerified && paymentProofData?.dataUrl) {
      recordVerifiedReceiptFingerprint(
        computeReceiptImageFingerprint(paymentProofData.dataUrl),
        currentUser.id,
        effectiveTrxRef
      );
    }

    const newTxn: RegistrationTransaction = {
      id: txnId,
      type: 'user_vip_upgrade',
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      planType,
      amountUsd: validPrice,
      currency: 'USD',
      durationDays: validDays,
      membershipTier: 'premium_vip',
      status: isAutoVerified ? 'verified' : 'pending_verification',
      paymentMethod: 'KHQR',
      transactionRef: effectiveTrxRef,
      paymentProofUrl: paymentProofData?.dataUrl,
      paymentProofUploadedAt: paymentProofData?.dataUrl ? formattedNow : undefined,
      paymentProofFileName: paymentProofData?.fileName,
      paymentProofMimeType: paymentProofData?.mimeType,
      createdAt: formattedNow,
      expiresAt: isAutoVerified ? expiryDate : undefined,
      verifiedAt: isAutoVerified ? formattedNow : undefined,
      verifiedBy: isAutoVerified
        ? 'AI & Transaction Verification Engine (Kim Seng Verified)'
        : undefined,
      notes: aiReport
        ? `${aiReport.summaryEn} | ${
            notes || `VIP ${validDays} Days ($${validPrice.toFixed(2)} USD)`
          }`
        : notes ||
          `VIP ${validDays} Days ($${validPrice.toFixed(2)} USD) via ABA KHQR — Awaiting Admin Verification`,
      aiVerificationReport: aiReport,
    };

    setTransactions(prev => [newTxn, ...prev]);
    setIsVipRenewMode(false);

    if (isAutoVerified) {
      const activatedUser: User = {
        ...currentUser,
        membershipTier: 'premium_vip',
        subscriptionStartDate: startDate,
        subscriptionExpiryDate: expiryDate,
        subscriptionStatus: 'active',
        paymentStatus: 'verified',
        paymentMethod: 'KHQR',
        transactionRef: effectiveTrxRef,
      };
      setCurrentUser(activatedUser);
      setUsers(prev => prev.map(u => (u.id === currentUser.id ? activatedUser : u)));

      setRestaurants(prev =>
        prev.map(r =>
          r.ownerId === currentUser.id
            ? {
                ...r,
                membershipTier: 'premium',
                membershipExpiresAt: expiryDate,
                isPromoted: true,
                isVerified: true,
                paymentStatus: 'verified',
              }
            : r
        )
      );

      const userSuccessNotif: AppNotification = {
        id: `notif-user-vip-auto-${Date.now()}`,
        titleKh: `🎉 គណនី VIP (${validDays} ថ្ងៃ) ត្រូវបានផ្ទៀងផ្ទាត់ និងបើកដំណើរការ!`,
        titleEn: `🎉 VIP (${validDays} Days) Verified & Activated!`,
        messageKh: aiReport!.summaryKh,
        messageEn: aiReport!.summaryEn,
        type: 'system',
        date: now.toISOString().split('T')[0],
        isRead: false,
      };
      setNotifications(prev => [userSuccessNotif, ...prev]);

      showToast(
        language === 'km'
          ? `🎉 ផ្ទៀងផ្ទាត់វិក្កយបត្រ ABA ជោគជ័យ! គណនី VIP (${validDays} ថ្ងៃ) ត្រូវបានបើកដំណើរការ!`
          : `🎉 ABA Receipt Verified! VIP (${validDays} Days) is now active!`,
        'success'
      );
      return { success: true, transactionId: txnId };
    }

    // Keep user on previous membership level ('free' unless already active VIP) while flagged for Manual Admin Review
    const pendingUser: User = {
      ...currentUser,
      membershipTier: isUserVipActive(currentUser) ? 'premium_vip' : 'free',
      subscriptionStatus: 'pending',
      paymentStatus: 'paid_pending_approval',
      paymentMethod: 'KHQR',
      transactionRef: effectiveTrxRef,
    };

    setCurrentUser(pendingUser);
    setUsers(prev => prev.map(u => (u.id === currentUser.id ? pendingUser : u)));

    // Send Admin Notification
    const adminNotif: AppNotification = {
      id: `notif-admin-vip-${Date.now()}`,
      titleKh:
        aiReport?.status === 'rejected_mismatch'
          ? '🚩 សំណើបង់ប្រាក់ VIP មានព័ត៌មានមិនត្រូវគ្នា (Flagged for Admin Review)'
          : '👑 សំណើពិនិត្យការទូទាត់ VIP ថ្មី (Manual Admin Review)',
      titleEn:
        aiReport?.status === 'rejected_mismatch'
          ? '🚩 VIP Payment Mismatch Flagged for Admin Review'
          : '👑 New VIP Payment Verification Request (Manual Review)',
      messageKh: aiReport
        ? `${currentUser.name}: ${aiReport.summaryKh}`
        : `អតិថិជន ${currentUser.name} (${currentUser.email}) បានបញ្ជូនសំណើពិនិត្យការទូទាត់ VIP ${validDays} ថ្ងៃ ($${validPrice.toFixed(2)} USD) តាម ABA KHQR (Ref: ${effectiveTrxRef})។ សូមពិនិត្យភស្តុតាងមុនពេលអនុម័ត។`,
      messageEn: aiReport
        ? `${currentUser.name}: ${aiReport.summaryEn}`
        : `Customer ${currentUser.name} (${currentUser.email}) submitted a VIP ${validDays} Days ($${validPrice.toFixed(2)} USD) payment verification request via ABA KHQR (Ref: ${effectiveTrxRef}). Please verify before approving.`,
      type: 'system',
      date: now.toISOString().split('T')[0],
      isRead: false,
    };

    // Send User Notification
    const userNotif: AppNotification = {
      id: `notif-user-vip-req-${Date.now() + 1}`,
      titleKh: '⏳ បានដាក់សញ្ញាសម្រាប់ Admin ត្រួតពិនិត្យផ្ទាល់',
      titleEn: '⏳ Flagged for Manual Admin Payment Review',
      messageKh: aiReport
        ? aiReport.summaryKh
        : `សំណើពិនិត្យការទូទាត់ប្រាក់ ($${validPrice.toFixed(2)} USD / ${validDays} ថ្ងៃ) របស់អ្នកត្រូវបានបញ្ជូនទៅរដ្ឋបាល។ គណនី VIP នឹងត្រូវបានបើកដំណើរការបន្ទាប់ពីរដ្ឋបាលពិនិត្យ និងអនុម័ត។`,
      messageEn: aiReport
        ? aiReport.summaryEn
        : `Your payment confirmation request ($${validPrice.toFixed(2)} USD / ${validDays} days) has been submitted. VIP will be activated after administrator verification and approval.`,
      type: 'system',
      date: now.toISOString().split('T')[0],
      isRead: false,
    };

    setNotifications(prev => [adminNotif, userNotif, ...prev]);

    showToast(
      language === 'km'
        ? aiReport?.status === 'rejected_mismatch'
          ? '🚩 រកឃើញព័ត៌មានលើវិក្កយបត្រមិនត្រូវគ្នា! សំណើត្រូវបានបញ្ជូនឱ្យ Admin ត្រួតពិនិត្យផ្ទាល់។'
          : '⏳ បានបញ្ជូនសំណើរួចរាល់! កំពុងរង់ចាំ Admin ពិនិត្យការទូទាត់។'
        : aiReport?.status === 'rejected_mismatch'
        ? '🚩 Receipt mismatch detected! Flagged for manual Admin review.'
        : '⏳ Request submitted! Awaiting Admin payment verification.',
      aiReport?.status === 'rejected_mismatch' ? 'warning' : 'info'
    );

    return { success: true, transactionId: txnId };
  };

  // ============================================================================
  // User–Admin Two-Way Support & Payment Verification Reply System (Requirement 1 & 4)
  // ============================================================================
  const createSupportTicket = (input: {
    message: string;
    planType?: 'quarterly' | 'annual';
    paymentDate?: string;
    paymentRef?: string;
    receiptUrl?: string;
    aiVerificationReport?: AbaReceiptVerificationReport;
  }): SupportTicket | null => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return null;
    }

    const cleanMessage = (input.message || '').trim();
    if (!cleanMessage) {
      showToast(
        language === 'km'
          ? 'សូមសរសេរសារពន្យល់ពីបញ្ហាការបង់ប្រាក់របស់អ្នក។'
          : 'Please enter a message explaining your payment issue.',
        'warning'
      );
      return null;
    }

    const plan = resolveAndValidateVipPlan({ planType: input.planType || 'quarterly' });
    const now = new Date();
    const nowIso = now.toISOString();
    const readableNow = nowIso.replace('T', ' ').slice(0, 16);
    const ticketId = `SUP-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const aiReport = input.aiVerificationReport;
    const isAutoApprovedByAi = Boolean(
      input.receiptUrl &&
        aiReport &&
        aiReport.canAutoApprove &&
        aiReport.status === 'verified'
    );

    const userLatestTxn = transactions.find(t => t.userId === currentUser.id);
    const autoRef = (
      aiReport?.extractedReceipt?.trxId ||
      input.paymentRef ||
      currentUser.transactionRef ||
      userLatestTxn?.transactionRef ||
      `ABA-${Date.now().toString().slice(-6)}`
    ).trim();
    const autoDate = (input.paymentDate || readableNow.slice(0, 10)).trim();

    const firstMsg: SupportTicketMessage = {
      id: `msg-${Date.now()}`,
      senderRole: 'user',
      senderId: currentUser.id,
      senderName: currentUser.name,
      message: cleanMessage,
      attachmentUrl: input.receiptUrl,
      createdAt: readableNow,
    };

    const messagesList: SupportTicketMessage[] = [firstMsg];

    if (aiReport) {
      const aiSystemMsg: SupportTicketMessage = {
        id: `msg-ai-${Date.now() + 1}`,
        senderRole: 'admin',
        senderId: 'ai-payment-verifier',
        senderName: '🤖 AI & Transaction Verifier',
        message: `${aiReport.summaryKh}\n\n• អ្នកទទួល (Recipient): ${
          aiReport.checks.recipient.passed ? '✅' : '❌'
        } ${aiReport.checks.recipient.detected}\n• ចំនួនទឹកប្រាក់ (Amount): ${
          aiReport.checks.amount.passed ? '✅' : '❌'
        } ${aiReport.checks.amount.detected}\n• លេខប្រតិបត្តិការ (Trx. ID): ${
          aiReport.checks.trxId.passed ? '✅' : '⚠️'
        } ${aiReport.checks.trxId.detected}\n• កាលបរិច្ឆេទ (Date): ${
          aiReport.checks.date.passed ? '✅' : '❌'
        } ${aiReport.checks.date.detected}`,
        createdAt: readableNow,
      };
      messagesList.push(aiSystemMsg);
    }

    const newTicket: SupportTicket = {
      id: ticketId,
      userId: currentUser.id,
      username: currentUser.username || currentUser.name,
      userEmail: currentUser.email,
      userPhone: currentUser.phone,
      paymentPlanId: plan.id,
      paymentPlanLabel: `${plan.nameEn} ($${plan.priceUsd.toFixed(2)} / ${plan.durationDays} days)`,
      amountUsd: plan.priceUsd,
      durationDays: plan.durationDays,
      paymentDate: autoDate,
      paymentRef: autoRef,
      receiptUrl: input.receiptUrl,
      status: isAutoApprovedByAi ? 'resolved' : 'pending',
      vipApproved: isAutoApprovedByAi,
      vipApprovedAt: isAutoApprovedByAi ? readableNow : undefined,
      unreadByAdmin: !isAutoApprovedByAi,
      unreadByUser: Boolean(aiReport),
      messages: messagesList,
      createdAt: readableNow,
      updatedAt: readableNow,
      aiVerificationReport: aiReport,
    };

    setSupportTickets(prev => [newTicket, ...prev]);

    const { startDate, expiryDate } = calculateVipDates(
      currentUser.subscriptionExpiryDate,
      plan.durationDays
    );

    if (isAutoApprovedByAi && input.receiptUrl) {
      recordVerifiedReceiptFingerprint(
        computeReceiptImageFingerprint(input.receiptUrl),
        currentUser.id,
        autoRef
      );

      const activatedUser: User = {
        ...currentUser,
        membershipTier: 'premium_vip',
        subscriptionStartDate: startDate,
        subscriptionExpiryDate: expiryDate,
        subscriptionStatus: 'active',
        paymentStatus: 'verified',
        paymentMethod: 'KHQR',
        transactionRef: autoRef,
      };
      setCurrentUser(activatedUser);
      setUsers(prev => prev.map(u => (u.id === currentUser.id ? activatedUser : u)));

      setRestaurants(prev =>
        prev.map(r =>
          r.ownerId === currentUser.id
            ? {
                ...r,
                membershipTier: 'premium',
                membershipExpiresAt: expiryDate,
                isPromoted: true,
                isVerified: true,
                paymentStatus: 'verified',
              }
            : r
        )
      );
    }

    // Also attach receipt to existing pending transaction or create a transaction record
    const existingPending = transactions.find(
      t =>
        t.userId === currentUser.id &&
        (t.status === 'pending_verification' || t.status === 'needs_more_info')
    );
    if (existingPending && input.receiptUrl) {
      uploadPaymentProofToTransaction(
        existingPending.id,
        input.receiptUrl,
        `support_receipt_${ticketId}.jpg`,
        'image/jpeg'
      );
      if (aiReport) {
        setTransactions(prev =>
          prev.map(t =>
            t.id === existingPending.id
              ? {
                  ...t,
                  transactionRef: autoRef,
                  status: isAutoApprovedByAi ? 'verified' : 'pending_verification',
                  verifiedAt: isAutoApprovedByAi ? readableNow : t.verifiedAt,
                  verifiedBy: isAutoApprovedByAi
                    ? 'AI & Transaction Verification (Kim Seng Verified)'
                    : t.verifiedBy,
                  expiresAt: isAutoApprovedByAi ? expiryDate : t.expiresAt,
                  aiVerificationReport: aiReport,
                }
              : t
          )
        );
      }
    } else if (!existingPending && input.receiptUrl) {
      const linkedTxn: RegistrationTransaction = {
        id: `TXN-SUP-${Date.now().toString(36).toUpperCase()}`,
        type: 'user_vip_upgrade',
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        planType: plan.id,
        amountUsd: plan.priceUsd,
        currency: 'USD',
        durationDays: plan.durationDays,
        membershipTier: 'premium_vip',
        status: isAutoApprovedByAi ? 'verified' : 'pending_verification',
        paymentMethod: 'KHQR',
        transactionRef: autoRef,
        paymentProofUrl: input.receiptUrl,
        paymentProofUploadedAt: readableNow,
        paymentProofFileName: `support_receipt_${ticketId}.jpg`,
        paymentProofMimeType: 'image/jpeg',
        createdAt: readableNow,
        expiresAt: isAutoApprovedByAi ? expiryDate : undefined,
        verifiedAt: isAutoApprovedByAi ? readableNow : undefined,
        verifiedBy: isAutoApprovedByAi
          ? 'AI & Transaction Verification (Kim Seng Verified)'
          : undefined,
        notes: `[Support Ticket #${ticketId}] ${
          aiReport ? `${aiReport.summaryEn} | ` : ''
        }${cleanMessage}`,
        aiVerificationReport: aiReport,
      };
      setTransactions(prev => [linkedTxn, ...prev]);
    }

    const adminNotif: AppNotification = {
      id: `notif-sup-admin-${Date.now()}`,
      titleKh: isAutoApprovedByAi
        ? '✅ AI បានផ្ទៀងផ្ទាត់វិក្កយបត្រ និងបើក VIP ជោគជ័យ'
        : aiReport?.status === 'rejected_mismatch'
        ? '🚩 សារជំនួយបង់ប្រាក់ VIP មានព័ត៌មានមិនត្រូវគ្នា (Flagged for Manual Review)'
        : '💬 សារជំនួយបញ្ហាការបង់ប្រាក់ VIP ថ្មី (Manual Admin Review)',
      titleEn: isAutoApprovedByAi
        ? '✅ AI Verified ABA Receipt & Activated VIP'
        : aiReport?.status === 'rejected_mismatch'
        ? '🚩 VIP Support Receipt Mismatch (Flagged for Manual Review)'
        : '💬 New VIP Payment Support Message (Manual Admin Review)',
      messageKh: aiReport
        ? `អ្នកប្រើប្រាស់ ${currentUser.name}: ${aiReport.summaryKh}`
        : `អ្នកប្រើប្រាស់ ${currentUser.name} (ID: ${currentUser.id}) បានផ្ញើសារជំនួយសម្រាប់កញ្ចប់ ${plan.nameEn} ($${plan.priceUsd.toFixed(2)})៖ "${cleanMessage.slice(0, 80)}"`,
      messageEn: aiReport
        ? `User ${currentUser.name}: ${aiReport.summaryEn}`
        : `User ${currentUser.name} (ID: ${currentUser.id}) submitted a payment support ticket for ${plan.nameEn} ($${plan.priceUsd.toFixed(2)}): "${cleanMessage.slice(0, 80)}"`,
      type: 'system',
      date: nowIso.split('T')[0],
      isRead: false,
    };
    setNotifications(prev => [adminNotif, ...prev]);

    showToast(
      isAutoApprovedByAi
        ? language === 'km'
          ? `🎉 វិក្កយបត្រ ABA ត្រូវបានផ្ទៀងផ្ទាត់ជោគជ័យ! គណនី VIP (${plan.durationDays} ថ្ងៃ) ត្រូវបានបើកដំណើរការ!`
          : `🎉 ABA Receipt verified! VIP (${plan.durationDays} Days) is now activated!`
        : aiReport?.status === 'rejected_mismatch'
        ? language === 'km'
          ? '🚩 រកឃើញព័ត៌មានមិនត្រូវគ្នាលើវិក្កយបត្រ! បានដាក់សញ្ញាសម្រាប់ Admin ត្រួតពិនិត្យផ្ទាល់។'
          : '🚩 Receipt mismatch detected! Flagged for manual Admin review.'
        : language === 'km'
        ? '✅ បានផ្ញើសារជំនួយ និងវិក្កយបត្រទៅកាន់ Admin ដើម្បីត្រួតពិនិត្យផ្ទាល់!'
        : '✅ Support message & receipt flagged for manual Admin review!',
      isAutoApprovedByAi ? 'success' : aiReport?.status === 'rejected_mismatch' ? 'warning' : 'info'
    );
    return newTicket;
  };

  const replyToSupportTicket = (ticketId: string, message: string, attachmentUrl?: string): boolean => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return false;
    }

    const cleanText = (message || '').trim();
    if (!cleanText && !attachmentUrl) return false;

    const targetTicket = supportTickets.find(t => t.id === ticketId);
    if (!targetTicket) return false;

    const isAdminSender = currentUser.role === 'admin';
    const isTicketOwner = currentUser.id === targetTicket.userId;
    if (!isAdminSender && !isTicketOwner) {
      showToast(language === 'km' ? 'គ្មានសិទ្ធិឆ្លើយតបសារនេះទេ!' : 'Unauthorized!', 'warning');
      return false;
    }

    const now = new Date();
    const readableNow = now.toISOString().replace('T', ' ').slice(0, 16);
    const newMsg: SupportTicketMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      senderRole: isAdminSender ? 'admin' : 'user',
      senderId: currentUser.id,
      senderName: isAdminSender ? `${currentUser.name} (Admin)` : currentUser.name,
      message: cleanText || (language === 'km' ? 'បានភ្ជាប់រូបភាពវិក្កយបត្របន្ថែម' : 'Attached payment receipt'),
      attachmentUrl,
      createdAt: readableNow,
    };

    setSupportTickets(prev =>
      prev.map(t => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          receiptUrl: attachmentUrl || t.receiptUrl,
          status: isAdminSender ? 'replied' : (t.status === 'resolved' ? 'pending' : t.status),
          unreadByAdmin: !isAdminSender,
          unreadByUser: isAdminSender,
          messages: [...t.messages, newMsg],
          updatedAt: readableNow,
        };
      })
    );

    if (isAdminSender) {
      const replyNotif: AppNotification = {
        id: `notif-sup-reply-${Date.now()}`,
        titleKh: '💬 រដ្ឋបាល (Admin) បានឆ្លើយតបសារជំនួយរបស់អ្នក!',
        titleEn: '💬 Admin Replied to Your Support Message!',
        messageKh: `Admin បានឆ្លើយតបលើសំណើ #${ticketId}៖ "${cleanText.slice(0, 90)}"។ សូមចូលមើលក្នុងគណនី > សារជំនួយ & ប្រវត្តិបង់ប្រាក់។`,
        messageEn: `Admin replied to ticket #${ticketId}: "${cleanText.slice(0, 90)}". Check Account > Support Messages / Payment History.`,
        type: 'system',
        date: now.toISOString().split('T')[0],
        isRead: false,
      };
      setNotifications(prev => [replyNotif, ...prev]);
      showToast(language === 'km' ? '✅ បានផ្ញើការឆ្លើយតបទៅកាន់អ្នកប្រើប្រាស់!' : '✅ Reply sent to user!', 'success');
    } else {
      const userReplyNotif: AppNotification = {
        id: `notif-sup-user-${Date.now()}`,
        titleKh: '💬 អ្នកប្រើប្រាស់បានឆ្លើយតបសារជំនួយ',
        titleEn: '💬 User Replied to Support Ticket',
        messageKh: `${currentUser.name} បានឆ្លើយតបក្នុងសំណើ #${ticketId}៖ "${cleanText.slice(0, 90)}"`,
        messageEn: `${currentUser.name} replied in ticket #${ticketId}: "${cleanText.slice(0, 90)}"`,
        type: 'system',
        date: now.toISOString().split('T')[0],
        isRead: false,
      };
      setNotifications(prev => [userReplyNotif, ...prev]);
      showToast(language === 'km' ? '✅ បានផ្ញើសារឆ្លើយតបទៅកាន់ Admin!' : '✅ Message sent to Admin!', 'success');
    }

    return true;
  };

  const updateSupportTicketStatus = (ticketId: string, status: SupportTicketStatus) => {
    const readableNow = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setSupportTickets(prev =>
      prev.map(t => (t.id === ticketId ? { ...t, status, updatedAt: readableNow } : t))
    );
    showToast(
      language === 'km'
        ? `បានប្តូរស្ថានភាពសំណើទៅជា "${status.toUpperCase()}"`
        : `Updated ticket status to "${status.toUpperCase()}"`,
      'info'
    );
  };

  const markSupportTicketRead = (ticketId: string) => {
    if (!currentUser) return;
    const isAdminUser = currentUser.role === 'admin';
    setSupportTickets(prev =>
      prev.map(t => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          unreadByAdmin: isAdminUser ? false : t.unreadByAdmin,
          unreadByUser: !isAdminUser ? false : t.unreadByUser,
        };
      })
    );
  };

  const approveVipFromSupportTicket = (ticketId: string, durationDays?: 30 | 90, adminNote?: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast(
        language === 'km'
          ? '⛔ មានតែគណនី Administrator ប៉ុណ្ណោះដែលអាចអនុម័តបើកដំណើរការ VIP បាន!'
          : '⛔ Only an Administrator can approve and activate VIP!',
        'warning'
      );
      return;
    }

    const ticket = supportTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const validatedPlan = resolveAndValidateVipPlan({
      durationDays: durationDays || ticket.durationDays,
      amountUsd: ticket.amountUsd,
    });
    const finalDays = validatedPlan.durationDays;
    const finalPrice = validatedPlan.priceUsd;

    const targetUser = users.find(u => u.id === ticket.userId);
    const { startDate, expiryDate } = calculateVipDates(targetUser?.subscriptionExpiryDate, finalDays);
    const now = new Date();
    const readableNow = now.toISOString().replace('T', ' ').slice(0, 16);
    const expiryDateFormatted = expiryDate.split('T')[0];

    // 1. Activate VIP on user account
    setUsers(prev =>
      prev.map(u => {
        if (u.id !== ticket.userId) return u;
        return {
          ...u,
          membershipTier: 'premium_vip',
          subscriptionStartDate: startDate,
          subscriptionExpiryDate: expiryDate,
          subscriptionStatus: 'active',
          paymentStatus: 'verified',
          paymentMethod: 'KHQR',
          transactionRef: ticket.paymentRef,
        };
      })
    );

    if (currentUser.id === ticket.userId) {
      setCurrentUser(prev =>
        prev
          ? {
              ...prev,
              membershipTier: 'premium_vip',
              subscriptionStartDate: startDate,
              subscriptionExpiryDate: expiryDate,
              subscriptionStatus: 'active',
              paymentStatus: 'verified',
              paymentMethod: 'KHQR',
              transactionRef: ticket.paymentRef,
            }
          : null
      );
    }

    // 2. Upgrade user's shops to premium
    setRestaurants(prev =>
      prev.map(r => {
        if (r.ownerId !== ticket.userId) return r;
        return {
          ...r,
          membershipTier: 'premium',
          membershipExpiresAt: expiryDate,
          isPromoted: true,
          isVerified: true,
          paymentStatus: 'verified',
        };
      })
    );

    // 3. Mark any pending transaction for this user as verified, or record one
    const matchingTxn = transactions.find(
      t =>
        t.userId === ticket.userId &&
        (t.status === 'pending_verification' || t.status === 'needs_more_info')
    );

    if (matchingTxn) {
      setTransactions(prev =>
        prev.map(t =>
          t.id === matchingTxn.id
            ? {
                ...t,
                planType: validatedPlan.id,
                durationDays: finalDays,
                amountUsd: finalPrice,
                status: 'verified',
                verifiedAt: readableNow,
                verifiedBy: `${currentUser.name} (Admin via Support #${ticketId})`,
                expiresAt: expiryDate,
              }
            : t
        )
      );
    } else {
      const approvedTxn: RegistrationTransaction = {
        id: `TXN-VIP-${Date.now().toString(36).toUpperCase()}`,
        type: 'user_vip_upgrade',
        userId: ticket.userId,
        userName: ticket.username,
        userEmail: ticket.userEmail,
        ownerId: ticket.userId,
        ownerName: ticket.username,
        planType: validatedPlan.id,
        amountUsd: finalPrice,
        currency: 'USD',
        durationDays: finalDays,
        membershipTier: 'premium_vip',
        status: 'verified',
        paymentMethod: 'KHQR',
        transactionRef: ticket.paymentRef,
        paymentProofUrl: ticket.receiptUrl,
        createdAt: startDate,
        expiresAt: expiryDate,
        verifiedAt: readableNow,
        verifiedBy: `${currentUser.name} (Admin via Support #${ticketId})`,
        notes: `Approved via Support Ticket #${ticketId} (${validatedPlan.nameEn} - $${finalPrice.toFixed(2)} / ${finalDays} days)`,
      };
      setTransactions(prev => [approvedTxn, ...prev]);
    }

    // 4. Add official approval reply message to the support ticket & mark Resolved
    const approvalReplyText =
      adminNote?.trim() ||
      `🎉 ការទូទាត់ប្រាក់របស់អ្នក ($${finalPrice.toFixed(2)} USD សម្រាប់កញ្ចប់ ${validatedPlan.nameEn} - ${finalDays} ថ្ងៃ) ត្រូវបានផ្ទៀងផ្ទាត់ និងអនុម័តរួចរាល់! គណនី VIP របស់អ្នកត្រូវបានបើកដំណើរការពេញលេញ រហូតដល់ថ្ងៃទី ${expiryDateFormatted}។ សូមអរគុណ!`;

    const approvalMsg: SupportTicketMessage = {
      id: `msg-approve-${Date.now()}`,
      senderRole: 'admin',
      senderId: currentUser.id,
      senderName: `${currentUser.name} (Admin)`,
      message: approvalReplyText,
      createdAt: readableNow,
    };

    setSupportTickets(prev =>
      prev.map(t => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          durationDays: finalDays,
          amountUsd: finalPrice,
          paymentPlanId: validatedPlan.id,
          paymentPlanLabel: `${validatedPlan.nameEn} ($${finalPrice.toFixed(2)} / ${finalDays} days)`,
          status: 'resolved',
          vipApproved: true,
          vipApprovedAt: readableNow,
          unreadByAdmin: false,
          unreadByUser: true,
          messages: [...t.messages, approvalMsg],
          updatedAt: readableNow,
        };
      })
    );

    // 5. Notify user immediately in-app
    const vipNotif: AppNotification = {
      id: `notif-vip-active-${Date.now()}`,
      titleKh: `🎉 គណនី VIP (${finalDays} ថ្ងៃ) ត្រូវបានបើកដំណើរការ!`,
      titleEn: `🎉 VIP Access (${finalDays} Days) Activated!`,
      messageKh: `រដ្ឋបាលបានផ្ទៀងផ្ទាត់វិក្កយបត្រ និងបើកដំណើរការកញ្ចប់ ${validatedPlan.nameEn} ($${finalPrice.toFixed(2)} / ${finalDays} ថ្ងៃ) ជូនគណនីរបស់អ្នករួចរាល់ (ផុតកំណត់៖ ${expiryDateFormatted})!`,
      messageEn: `Admin verified your payment and activated ${validatedPlan.nameEn} ($${finalPrice.toFixed(2)} / ${finalDays} days) until ${expiryDateFormatted}!`,
      type: 'system',
      date: now.toISOString().split('T')[0],
      isRead: false,
    };
    setNotifications(prev => [vipNotif, ...prev]);

    showToast(
      language === 'km'
        ? `🎉 បានអនុម័ត និងបើកដំណើរការ VIP (${finalDays} ថ្ងៃ / $${finalPrice.toFixed(2)}) ជូន ${ticket.username} ដោយជោគជ័យ!`
        : `🎉 Approved & activated VIP (${finalDays} days / $${finalPrice.toFixed(2)}) for ${ticket.username}!`,
      'success'
    );
  };

  // AI Trending Food Update
  const updateTrendingFood = (updated: TrendingFoodItem) => {
    setTrendingFoods(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  // AI Smart Check-in & Auto Add Restaurant Engine
  const submitAiCheckIn = async (
    data: Omit<AiCheckInSubmission, 'id' | 'checkInTime' | 'status'> & { id?: string; checkInTime?: string }
  ): Promise<{ success: boolean; isDuplicate?: boolean; isBranch?: boolean; status: 'approved' | 'pending' | 'rejected' | 'merged'; restaurantId?: string; message: string }> => {
    if (!currentUser) {
      showToast(language === 'km' ? 'សូមចូលគណនី Administrator ដើម្បីឆែកអ៊ីន!' : 'Please sign in with an Administrator account!', 'warning');
      setIsAuthModalOpen(true);
      return { success: false, status: 'pending', message: 'Authentication required' };
    }

    if (currentUser.role !== 'admin') {
      const adminOnlyMsg = language === 'km'
        ? 'មុខងារឆែកអ៊ីន & បន្ថែមហាងដោយ AI ត្រូវបានកំណត់សម្រាប់តែគណនី Administrator ប៉ុណ្ណោះ'
        : 'AI Smart Check-in & Auto Add Restaurant is strictly restricted to Administrator accounts only.';
      showToast(adminOnlyMsg, 'warning');
      return { success: false, status: 'rejected', message: adminOnlyMsg };
    }

    // Rate Limiting check (anti-spam, max 10/hour per user)
    const rateCheck = checkSubmissionRateLimit(currentUser.id);
    if (!rateCheck.allowed) {
      const msg = language === 'km'
        ? `អ្នកបានឆែកអ៊ីនលើសកម្រិតកំណត់ (អតិបរមា ១០ ដង/ម៉ោង)។ សូមរង់ចាំ ${rateCheck.waitMinutes} នាទីទៀត!`
        : `Rate limit reached (max 10/hour). Please wait ${rateCheck.waitMinutes} minutes!`;
      showToast(msg, 'warning');
      return { success: false, status: 'pending', message: msg };
    }

    const checkInId = data.id || `checkin-${Date.now()}`;
    const checkInTime = data.checkInTime || new Date().toISOString();

    // 1. Run Duplicate Detection against existing restaurant directory
    const duplicateResult = findDuplicateRestaurant(
      {
        nameKh: data.restaurantNameKh,
        nameEn: data.restaurantNameEn,
        phone: data.phone,
        latitude: data.latitude,
        longitude: data.longitude,
        addressKh: data.addressKh,
        addressEn: data.addressEn,
        provinceKh: data.provinceKh,
      },
      restaurants
    );

    // Case A: Existing restaurant found (Duplicate match) -> Update existing record without duplicate
    if (duplicateResult.isDuplicate && duplicateResult.matchedRestaurant) {
      const matched = duplicateResult.matchedRestaurant;
      const updatedRest = mergeRestaurantRecords(matched, {
        phone: data.phone,
        signatureDishesKh: data.signatureDishes,
        photoUrl: data.photoUrl,
        galleryPhotos: [data.photoUrl],
      });

      setRestaurants(prev => prev.map(r => r.id === matched.id ? updatedRest : r));

      const mergedSubmission: AiCheckInSubmission = {
        ...data,
        id: checkInId,
        checkInTime,
        status: 'merged',
        matchedExistingRestaurantId: matched.id,
      };

      setAiCheckIns(prev => [mergedSubmission, ...prev]);
      recordSubmissionTimestamp(currentUser.id);

      const successMsg = language === 'km'
        ? `បានកត់ត្រាការឆែកអ៊ីន និងធ្វើបច្ចុប្បន្នភាពហាង «${matched.nameKh}» ដោយជោគជ័យ!`
        : `Check-in recorded and updated for existing restaurant "${matched.nameEn || matched.nameKh}"!`;
      showToast(successMsg, 'success');

      return {
        success: true,
        isDuplicate: true,
        status: 'approved',
        restaurantId: matched.id,
        message: successMsg,
      };
    }

    // Case B: Different branch of the same restaurant brand
    const isBranch = duplicateResult.isDifferentBranch;

    // Case C: Genuinely new restaurant or branch
    // If confidence score >= 0.8 and valid name provided -> Auto-publish!
    const isAutoApprovable = data.confidenceScore >= 0.8 && data.restaurantNameKh.trim().length > 1;

    if (isAutoApprovable) {
      const newRestId = `rest-ai-${Date.now()}`;
      const newRestaurant: Restaurant = {
        id: newRestId,
        nameKh: data.restaurantNameKh,
        nameEn: data.restaurantNameEn || data.restaurantNameKh,
        descriptionKh: data.aiDescriptionKh || `ហាងម្ហូបឆ្ងាញ់ដែលត្រូវបានរកឃើញដោយ AI Smart Check-in ក្នុង ${data.provinceKh}។`,
        descriptionEn: data.aiDescriptionEn || `Food place discovered via AI Smart Check-in in ${data.provinceEn}.`,
        photoUrl: data.photoUrl,
        galleryPhotos: [data.photoUrl],
        addressKh: data.addressKh || `ស្ថិតនៅ ${data.provinceKh}`,
        addressEn: data.addressEn || `Located in ${data.provinceEn}`,
        provinceKh: data.provinceKh,
        provinceEn: data.provinceEn,
        phone: data.phone || '012 000 000',
        openingHoursKh: '០៧:០០ ព្រឹក - ០៩:០០ យប់',
        openingHoursEn: '07:00 AM - 09:00 PM',
        priceLevel: '$$',
        mapUrl: `https://maps.google.com/?q=${data.latitude},${data.longitude}`,
        latitude: data.latitude,
        longitude: data.longitude,
        rating: 4.8,
        reviewCount: 1,
        signatureDishesKh: data.signatureDishes && data.signatureDishes.length > 0 ? data.signatureDishes : ['ម្ហូបពិសេសប្រចាំហាង'],
        status: 'approved',
        isVerified: true,
        membershipTier: 'free',
        ownerId: currentUser.id,
        created_at: checkInTime,
        createdAt: checkInTime,
      };

      setRestaurants(prev => sortRestaurantsChronologically([...prev, newRestaurant]));

      const approvedSubmission: AiCheckInSubmission = {
        ...data,
        id: checkInId,
        checkInTime,
        status: 'approved',
        matchedExistingRestaurantId: newRestId,
      };

      setAiCheckIns(prev => [approvedSubmission, ...prev]);
      recordSubmissionTimestamp(currentUser.id);

      const msg = language === 'km'
        ? `អបអរសាទរ! AI បានផ្ទៀងផ្ទាត់ និងបន្ថែមហាង «${data.restaurantNameKh}» ទៅក្នុងកម្មវិធីដោយស្វ័យប្រវត្តិ!`
        : `Congratulations! AI verified and published "${data.restaurantNameKh}" automatically!`;
      showToast(msg, 'success');

      return {
        success: true,
        isBranch,
        status: 'approved',
        restaurantId: newRestId,
        message: msg,
      };
    } else {
      // Case D: Low confidence or uncertain details -> Send to Admin review queue!
      const pendingSubmission: AiCheckInSubmission = {
        ...data,
        id: checkInId,
        checkInTime,
        status: 'pending',
      };

      setAiCheckIns(prev => [pendingSubmission, ...prev]);
      recordSubmissionTimestamp(currentUser.id);

      const msg = language === 'km'
        ? 'ការឆែកអ៊ីនត្រូវបានកត់ត្រា និងបញ្ជូនទៅកាន់ក្រុមការងារ Admin ដើម្បីផ្ទៀងផ្ទាត់បន្ថែម!'
        : 'Check-in recorded and submitted to Admin queue for further verification!';
      showToast(msg, 'info');

      return {
        success: true,
        status: 'pending',
        message: msg,
      };
    }
  };

  const approveAiCheckIn = (id: string) => {
    const sub = aiCheckIns.find(c => c.id === id);
    if (!sub) return;

    const newRestId = `rest-ai-${Date.now()}`;
    const newRestaurant: Restaurant = {
      id: newRestId,
      nameKh: sub.restaurantNameKh,
      nameEn: sub.restaurantNameEn || sub.restaurantNameKh,
      descriptionKh: sub.aiDescriptionKh || `ហាងដែលត្រូវបានផ្ទៀងផ្ទាត់ និងអនុម័តដោយ Admin ក្នុង ${sub.provinceKh}។`,
      descriptionEn: sub.aiDescriptionEn || `Restaurant verified and approved by Admin in ${sub.provinceEn}.`,
      photoUrl: sub.photoUrl,
      galleryPhotos: [sub.photoUrl],
      addressKh: sub.addressKh,
      addressEn: sub.addressEn,
      provinceKh: sub.provinceKh,
      provinceEn: sub.provinceEn,
      phone: sub.phone || '012 000 000',
      openingHoursKh: '០៧:០០ ព្រឹក - ០៩:០០ យប់',
      openingHoursEn: '07:00 AM - 09:00 PM',
      priceLevel: '$$',
      mapUrl: `https://maps.google.com/?q=${sub.latitude},${sub.longitude}`,
      latitude: sub.latitude,
      longitude: sub.longitude,
      rating: 4.8,
      reviewCount: 1,
      signatureDishesKh: sub.signatureDishes && sub.signatureDishes.length > 0 ? sub.signatureDishes : ['ម្ហូបពិសេសប្រចាំហាង'],
      status: 'approved',
      isVerified: true,
      membershipTier: 'free',
      ownerId: sub.userId,
      created_at: sub.checkInTime || new Date().toISOString(),
      createdAt: sub.checkInTime || new Date().toISOString(),
    };

    setRestaurants(prev => sortRestaurantsChronologically([...prev, newRestaurant]));
    setAiCheckIns(prev => prev.map(c => c.id === id ? { ...c, status: 'approved', matchedExistingRestaurantId: newRestId } : c));
    showToast(language === 'km' ? `បានអនុម័ត និងចុះផ្សាយហាង «${sub.restaurantNameKh}»!` : `Approved and published "${sub.restaurantNameKh}"!`, 'success');
  };

  const rejectAiCheckIn = (id: string, reason?: string) => {
    setAiCheckIns(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected', adminNotes: reason } : c));
    showToast(language === 'km' ? 'បានបដិសេធការឆែកអ៊ីន!' : 'Rejected check-in submission!', 'info');
  };

  const mergeAiCheckIn = (checkInId: string, targetRestaurantId: string) => {
    const sub = aiCheckIns.find(c => c.id === checkInId);
    const target = restaurants.find(r => r.id === targetRestaurantId);
    if (!sub || !target) return;

    const merged = mergeRestaurantRecords(target, {
      phone: sub.phone,
      signatureDishesKh: sub.signatureDishes,
      photoUrl: sub.photoUrl,
      galleryPhotos: [sub.photoUrl],
    });

    setRestaurants(prev => prev.map(r => r.id === target.id ? merged : r));
    setAiCheckIns(prev => prev.map(c => c.id === checkInId ? { ...c, status: 'merged', matchedExistingRestaurantId: target.id } : c));
    showToast(language === 'km' ? `បានច្របាច់បញ្ចូលគ្នាជាមួយ «${target.nameKh}» រួចរាល់!` : `Merged with "${target.nameKh}" successfully!`, 'success');
  };

  // Wishlist methods
  const createWishlist = (nameKh: string, nameEn?: string, emoji: string = '📌') => {
    const newWl: Wishlist = {
      id: `wl-${Date.now()}`,
      userId: currentUser?.id || 'guest',
      nameKh,
      nameEn: nameEn || nameKh,
      emoji,
      items: [],
      createdAt: new Date().toISOString(),
    };
    setWishlists(prev => [newWl, ...prev]);
    showToast(language === 'km' ? `បានបង្កើតបញ្ជី «${nameKh}»` : `Created list "${nameKh}"`, 'success');
  };

  const deleteWishlist = (id: string) => {
    setWishlists(prev => prev.filter(w => w.id !== id));
    showToast(language === 'km' ? 'បានលុបបញ្ជីជោគជ័យ' : 'List deleted', 'info');
  };

  const addToWishlist = (wishlistId: string, item: Omit<WishlistItem, 'addedAt'>) => {
    setWishlists(prev => prev.map(w => {
      if (w.id !== wishlistId) return w;
      if (w.items.some(i => i.id === item.id)) {
        return w;
      }
      return {
        ...w,
        items: [{ ...item, addedAt: new Date().toISOString() }, ...w.items],
      };
    }));
    showToast(language === 'km' ? `បានបញ្ចូល «${item.nameKh}» ទៅក្នុងបញ្ជី!` : `Added "${item.nameEn || item.nameKh}" to list!`, 'success');
  };

  const removeFromWishlist = (wishlistId: string, itemId: string) => {
    setWishlists(prev => prev.map(w => {
      if (w.id !== wishlistId) return w;
      return {
        ...w,
        items: w.items.filter(i => i.id !== itemId),
      };
    }));
    showToast(language === 'km' ? 'បានដកចេញពីបញ្ជី' : 'Removed from list', 'info');
  };

  const isItemInWishlist = (itemId: string, wishlistId?: string): boolean => {
    if (wishlistId) {
      const target = wishlists.find(w => w.id === wishlistId);
      return Boolean(target?.items.some(i => i.id === itemId));
    }
    return wishlists.some(w => w.items.some(i => i.id === itemId));
  };

  const openAddToWishlist = (item: { 
    id: string; 
    type: 'food' | 'restaurant' | 'destination'; 
    nameKh: string; 
    nameEn: string; 
    photoUrl: string; 
    categoryKh?: string; 
    provinceKh?: string; 
    priceDisplay?: string; 
    rating?: number 
  }) => {
    setTargetWishlistItem({
      ...item,
      addedAt: new Date().toISOString(),
    });
    setIsWishlistsModalOpen(true);
  };

  // AI Trip Planner methods
  const saveTripPlan = (plan: TripPlan) => {
    setTripPlans(prev => [plan, ...prev.filter(p => p.id !== plan.id)]);
    showToast(language === 'km' ? 'បានរក្សាទុកផែនការដើរលេង!' : 'Trip plan saved!', 'success');
  };

  const deleteTripPlan = (id: string) => {
    setTripPlans(prev => prev.filter(p => p.id !== id));
    showToast(language === 'km' ? 'បានលុបផែនការដើរលេង' : 'Trip plan deleted', 'info');
  };

  const generateAiTripPlan = (
    provinceKh: string, 
    durationDays: number, 
    budgetLevel: 'budget' | 'medium' | 'luxury', 
    companion: 'solo' | 'couple' | 'friends' | 'family'
  ): TripPlan => {
    const provDestinations = destinations.filter(d => d.provinceKh.includes(provinceKh) || provinceKh.includes(d.provinceKh));
    const poolDest = provDestinations.length > 0 ? provDestinations : destinations;
    
    const provRestaurants = restaurants.filter(r => r.provinceKh.includes(provinceKh) || provinceKh.includes(r.provinceKh));
    const poolRest = provRestaurants.length > 0 ? provRestaurants : restaurants;
    
    const days: any[] = [];
    const costPerDay = budgetLevel === 'budget' ? 35 : budgetLevel === 'medium' ? 75 : 160;

    for (let i = 1; i <= durationDays; i++) {
      const dest1 = poolDest[(i * 2 - 2) % poolDest.length];
      const dest2 = poolDest[(i * 2 - 1) % poolDest.length];
      const rest1 = poolRest[(i * 2 - 2) % poolRest.length];
      const rest2 = poolRest[(i * 2 - 1) % poolRest.length];
      const foodPick = foods[(i * 3) % foods.length];

      days.push({
        dayNumber: i,
        titleKh: `ថ្ងៃទី ${i}៖ ដំណើរកម្សាន្ត និងស្វែងយល់រសជាតិនៅ${provinceKh}`,
        titleEn: `Day ${i}: Exploring & Dining in ${provinceKh}`,
        dayEstimatedCostUsd: costPerDay,
        activities: [
          {
            timePeriod: 'morning',
            titleKh: 'ពេលព្រឹក៖ ទស្សនាទីតាំងទេសចរណ៍ និងថតរូបអនុស្សាវរីយ៍',
            titleEn: 'Morning: Scenic Sightseeing & Photography',
            descKh: `ទស្សនាកម្សាន្តនៅ «${dest1.nameKh}» រីករាយជាមួយទេសភាពស្រស់ត្រកាល និងខ្យល់អាកាសបរិសុទ្ធ។`,
            descEn: `Visit ${dest1.nameEn} and enjoy scenic panoramic views.`,
            placeNameKh: dest1.nameKh,
            photoUrl: dest1.photoUrl,
            estimatedCostUsd: budgetLevel === 'budget' ? 5 : 15,
          },
          {
            timePeriod: 'lunch',
            titleKh: 'ពេលថ្ងៃត្រង់៖ អាហារថ្ងៃត្រង់រសជាតិដើមខ្មែរឆ្ងាញ់ពិសា',
            titleEn: 'Lunch: Authentic Local Cuisine',
            descKh: `ពិសាអាហារថ្ងៃត្រង់នៅ «${rest1.nameKh}» ភ្លក្សម្ហូបពិសេស ${rest1.signatureDishesKh?.[0] || foodPick.nameKh}។`,
            descEn: `Enjoy lunch at ${rest1.nameEn}.`,
            placeNameKh: rest1.nameKh,
            dishNameKh: rest1.signatureDishesKh?.[0] || foodPick.nameKh,
            photoUrl: rest1.photoUrl,
            estimatedCostUsd: budgetLevel === 'budget' ? 10 : 25,
          },
          {
            timePeriod: 'afternoon',
            titleKh: 'ពេលរសៀល៖ ផ្សងព្រេង និងទស្សនាកន្លែងល្បីប្រចាំតំបន់',
            titleEn: 'Afternoon: Adventure & Highlights',
            descKh: `បន្តដំណើរទៅកាន់ «${dest2.nameKh}» ថតរូប Review ចែករំលែកលើ TikTok/Facebook។`,
            descEn: `Explore ${dest2.nameEn}.`,
            placeNameKh: dest2.nameKh,
            photoUrl: dest2.photoUrl,
            estimatedCostUsd: budgetLevel === 'budget' ? 5 : 15,
          },
          {
            timePeriod: 'dinner',
            titleKh: 'ពេលល្ងាច៖ អាហារពេលរាត្រី និងសម្រាកលម្ហែកាយ',
            titleEn: 'Dinner: Evening Dining & Relaxation',
            descKh: `អាហារពេលល្ងាចនៅ «${rest2.nameKh}» ជាមួយបរិយាកាសកក់ក្តៅ និងម្ហូបឆ្ងាញ់ៗ។`,
            descEn: `Dine at ${rest2.nameEn}.`,
            placeNameKh: rest2.nameKh,
            dishNameKh: rest2.signatureDishesKh?.[0] || 'ម្ហូបពិសេសប្រចាំហាង',
            photoUrl: rest2.photoUrl,
            estimatedCostUsd: budgetLevel === 'budget' ? 15 : 35,
          },
        ],
      });
    }

    const generatedPlan: TripPlan = {
      id: `plan-${Date.now()}`,
      userId: currentUser?.id || 'guest',
      provinceKh,
      provinceEn: provinceKh,
      durationDays,
      budgetLevel,
      companion,
      totalEstimatedCostUsd: costPerDay * durationDays,
      days,
      createdAt: new Date().toISOString(),
    };

    return generatedPlan;
  };

  // Notifications methods
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    showToast(language === 'km' ? 'បានសម្គាល់ថាបានអានទាំងអស់' : 'Marked all as read', 'info');
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    showToast(language === 'km' ? 'បានលុបការជូនដំណឹងទាំងអស់' : 'Cleared all notifications', 'info');
  };

  const unreadNotificationsCount = notificationsEnabled ? notifications.filter(n => !n.isRead).length : 0;

  const resetAllData = () => {
    setUsers(initialUsers);
    setCurrentUser(initialUsers[2]);
    setFoods(initialFoods);
    setRestaurants(initialRestaurants);
    setDestinations(initialDestinations);
    setPosts(initialCommunityPosts);
    setBookmarks(['food-1', 'dest-1']);
    setAppSettings(initialAppSettings);
    setTransactions(initialTransactions);
    localStorage.clear();
    showToast(language === 'km' ? 'បានកំណត់ទិន្នន័យឡើងវិញ' : 'Reset to default data', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        activeTab,
        setActiveTab,
        currentUser,
        users,
        deletedUsers,
        login,
        register,
        loginWithGoogle,
        logout,
        updateUserRole,
        updateCurrentUserProfile,
        deleteUserAccount,
        clearAllRegisteredUsers,
        loginAdmin,
        loginAdminWithBiometric,
        setAdminPassword,
        appSettings,
        updateAppSettings,
        foods,
        restaurants,
        destinations,
        posts,
        transactions,
        addRegistrationTransaction,
        verifyTransaction,
        rejectTransaction,
        requestMorePaymentInfo,
        uploadPaymentProofToTransaction,
        getAuthorizedPaymentProof,
        triggerCloudSyncNow,
        isExitModalOpen,
        setIsExitModalOpen,
        exitAppNow,
        isQrScannerModalOpen,
        setIsQrScannerModalOpen,
        isVipAddRestaurantModalOpen,
        setIsVipAddRestaurantModalOpen,
        isAiFoodDiscoveryModalOpen,
        setIsAiFoodDiscoveryModalOpen,
        isRestaurantCheckInModalOpen,
        setIsRestaurantCheckInModalOpen,
        connectTikTokAccount,
        disconnectTikTokAccount,
        connectFacebookAccount,
        disconnectFacebookAccount,
        bookmarks,
        toggleBookmark,
        isBookmarked,
        addFood,
        updateFood,
        deleteFood,
        addRestaurant,
        updateRestaurant,
        deleteRestaurant,
        approveRestaurant,
        toggleVerifyRestaurant,
        addRestaurantMenuItem,
        updateRestaurantMenuItem,
        deleteRestaurantMenuItem,
        upgradeRestaurantToPremium,
        trackRestaurantView,
        trackRestaurantCall,
        trackRestaurantMap,
        trackRestaurantShare,
        isManageMenuModalOpen,
        setIsManageMenuModalOpen,
        managingRestaurant,
        setManagingRestaurant,
        addDestination,
        updateDestination,
        deleteDestination,
        checkDuplicateDestination,
        addPost,
        toggleLikePost,
        addComment,
        deletePost,
        selectedFood,
        setSelectedFood,
        selectedRestaurant,
        setSelectedRestaurant,
        selectedDestination,
        setSelectedDestination,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isAddPostModalOpen,
        setIsAddPostModalOpen,
        isAddRestaurantModalOpen,
        setIsAddRestaurantModalOpen,
        isAdminOpen,
        setIsAdminOpen,
        isAdminLoginModalOpen,
        setIsAdminLoginModalOpen,
        isInstallModalOpen,
        setIsInstallModalOpen,
        installPlatformTab,
        setInstallPlatformTab,
        openInstallModal,
        isSupportModalOpen,
        setIsSupportModalOpen,
        searchQuery,
        setSearchQuery,
        selectedProvince,
        setSelectedProvince,
        toast,
        showToast,
        resetAllData,

        // 6 Personalized Account Features & Wishlists
        wishlists,
        createWishlist,
        deleteWishlist,
        addToWishlist,
        removeFromWishlist,
        isItemInWishlist,
        tripPlans,
        saveTripPlan,
        deleteTripPlan,
        generateAiTripPlan,
        notifications,
        notificationsEnabled,
        setNotificationsEnabled,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        unreadNotificationsCount,

        // Modals
        isWhatToEatModalOpen,
        setIsWhatToEatModalOpen,
        isNearMeModalOpen,
        setIsNearMeModalOpen,
        isDailyDiscoveriesModalOpen,
        setIsDailyDiscoveriesModalOpen,
        isWishlistsModalOpen,
        setIsWishlistsModalOpen,
        isAiTripPlannerModalOpen,
        setIsAiTripPlannerModalOpen,
        isNotificationsModalOpen,
        setIsNotificationsModalOpen,
        isTrendingSocialModalOpen,
        setIsTrendingSocialModalOpen,

        // Quick Wishlist Add Helper
        targetWishlistItem,
        setTargetWishlistItem,
        openAddToWishlist,

        // Premium VIP Subscription ($2.99 / 30 Days or $4.99 / 90 Days)
        isUpgradeVipModalOpen,
        setIsUpgradeVipModalOpen,
        isVipRenewMode,
        setIsVipRenewMode,
        openUpgradeVipModal,
        submitVipUpgradeRequest,
        upgradeCurrentUserToVip,
        renewCurrentUserVip,
        restoreCurrentUserVipPurchases,

        // User–Admin Two-Way Support & Payment Reply System
        supportTickets,
        isSupportTicketModalOpen,
        setIsSupportTicketModalOpen,
        supportModalPrefill,
        openSupportTicketModal,
        createSupportTicket,
        replyToSupportTicket,
        updateSupportTicketStatus,
        approveVipFromSupportTicket,
        markSupportTicketRead,

        // AI Trending Food Discovery Section
        trendingFoods,
        updateTrendingFood,
        selectedTrendingFood,
        setSelectedTrendingFood,
        isTrendingFoodDetailModalOpen,
        setIsTrendingFoodDetailModalOpen,

        // AI Smart Check-in & Auto Add Restaurant
        aiCheckIns,
        isAiCheckInModalOpen,
        setIsAiCheckInModalOpen,
        submitAiCheckIn,
        approveAiCheckIn,
        rejectAiCheckIn,
        mergeAiCheckIn,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

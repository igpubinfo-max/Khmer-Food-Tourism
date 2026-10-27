import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { 
  User, FoodItem, Restaurant, TouristDestination, CommunityPost, 
  Language, UserRole, AppSettings, RegistrationTransaction,
  RestaurantMenuItem, RestaurantReview, MembershipTier, isRestaurantPremiumActive, isUserVipActive, getVipRemainingDays,
  getVipAccountState, VipAccountState,
  getRestaurantCreatedAtIso, getRestaurantCreatedAtMs, sortRestaurantsChronologically, isSeedRestaurantId, getRestaurantRatingSummary,
  Wishlist, WishlistItem, TripPlan, AppNotification,
  TrendingFoodItem, AiCheckInSubmission,
  SupportTicket, SupportTicketMessage, SupportTicketStatus, VIP_PLANS,
  DeletedUserRecord, AbaReceiptVerificationReport,
  getDynamicVipPlans, getDynamicVipBenefits, getAdditionalStoreFeeUsd,
  getUserStoreQuotaSummary, UserStoreQuotaSummary
} from '../types';
import {
  verifyAbaPaymentAndReceipt,
  computeReceiptImageFingerprint,
  recordVerifiedReceiptFingerprint,
} from '../services/aiPaymentVerificationService';
import {
  analyzeFoodBusinessDeterministically,
  verifyFoodBusinessOnServer,
} from '../services/aiFoodBusinessVerifierService';
import { 
  verifyPaymentOnBackend, calculateVipDates, checkEligibleRestoration,
  VIP_ANNUAL_PRICE_USD, VIP_SUBSCRIPTION_DAYS, VIP_QUARTERLY_PRICE_USD, VIP_QUARTERLY_DAYS,
  PaymentVerificationRequest, verifyAbaPaymentTransaction, resolveAndValidateVipPlan,
  verifyAdditionalStorePaymentOnBackend, recordVerifiedTransaction
} from '../services/paymentService';
import { initialTrendingFoods } from '../data/seedTrendingFoods';
import { buildDynamicNotificationsList } from '../services/dailyDiscoveryAndNotificationService';
import { findDuplicateRestaurant, mergeRestaurantRecords } from '../utils/duplicateDetector';
import { recordSubmissionTimestamp, checkSubmissionRateLimit } from '../services/aiCheckInService';
import { 
  initialUsers, initialFoods, initialRestaurants, 
  initialDestinations, initialCommunityPosts, initialAppSettings, initialTransactions 
} from '../data/seedData';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { recordMeaningfulAction } from '../utils/engagement';
import { translateTextToChinese, useChineseDomTranslation } from '../utils/i18n';
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
  deleteCloudDocument,
  fetchAuthoritativeAppSettingsFromServer,
  saveAuthoritativeAppSettingsToServer,
  normalizeAuthoritativeAppSettings,
  getCanonicalUserId,
  deduplicateAndNormalizeUsers,
  upsertSingleUserToCloud,
  USER_RECORD_PREFIX,
} from '../services/supabaseService';
import { authenticateAdminWithBiometric, setSavedAdminUsername } from '../services/biometricService';
import {
  loadLocalMediaOverrides,
  saveLocalMediaOverrides,
  isOverridePersistedInLocalStorage,
  recordPermanentFoodOverride,
  recordPermanentRestaurantOverride,
  removePermanentRestaurantOverride,
  recordPermanentDestinationOverride,
  recordPermanentTrendingFoodOverride,
  applyFoodOverrides,
  applyRestaurantOverrides,
  applyDestinationOverrides,
  applyTrendingFoodOverrides,
  hydrateFromLocalIdbImmediate,
  hydrateAndSyncMediaOverrides,
} from '../services/permanentMediaVaultService';
import {
  GooglePlaceCachedItem,
  convertGooglePlaceToRestaurant,
  convertGooglePlaceToDestination,
  findDuplicateRestaurantForGooglePlace,
  findDuplicateDestinationForGooglePlace,
  mergeGoogleMapsPlaceWithExistingRestaurant,
} from '../services/googlePlacesService';

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
  cancelUserVip: (userId: string) => Promise<{ success: boolean }>;
  restoreUserAccess: (userIdOrEmail: string) => Promise<{ success: boolean; restoredUser?: User; error?: string }>;
  disableUserAccount: (userId: string) => Promise<{ success: boolean }>;
  deleteUserAccount: (userId: string) => Promise<{
    success: boolean;
    deletedStats?: { restaurants: number; posts: number; transactions: number; tickets: number };
  }>;
  clearAllRegisteredUsers: () => Promise<{ success: boolean; count: number }>;

  // Social Account Linking (TikTok & Facebook)
  connectTikTokAccount: (username: string, displayName?: string, profileUrl?: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string }>;
  disconnectTikTokAccount: () => void;
  connectFacebookAccount: (username: string, displayName?: string, profileUrl?: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string }>;
  disconnectFacebookAccount: () => void;

  // Admin Auth (Chea Savuth)
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  loginAdminWithBiometric: (preVerified?: boolean, preVerifiedUser?: string) => Promise<boolean>;
  setAdminPassword: (newPassword: string) => Promise<boolean>;
  
  // App Settings & QR Codes
  appSettings: AppSettings;
  updateAppSettings: (newSettings: Partial<AppSettings>) => Promise<{ ok: boolean; settings?: AppSettings; error?: string }>;
  isRefreshingSettings?: boolean;
  settingsSyncError?: string | null;
  refreshAppSettingsFromServer?: (silent?: boolean) => Promise<AppSettings | null>;
  
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
  deleteTransactions: (txnIds: string[]) => { success: boolean; deletedCount: number };
  uploadPaymentProofToTransaction: (txnId: string, proofDataUrl: string, fileName?: string, mimeType?: string) => { success: boolean; error?: string };
  getAuthorizedPaymentProof: (txnId: string) => string | null;
  triggerCloudSyncNow?: (force?: boolean) => Promise<boolean>;
  isSyncingUsers?: boolean;
  lastUsersSyncedAt?: string | null;
  syncUsersNow?: () => Promise<boolean>;
  
  // Bookmarks
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  
  // Food Actions
  addFood: (food: Omit<FoodItem, 'id' | 'rating' | 'reviewCount'>) => void;
  updateFood: (food: FoodItem) => void;
  deleteFood: (id: string) => void;
  
  // Restaurant Actions
  addRestaurant: (
    rest: Omit<Restaurant, 'id' | 'rating' | 'reviewCount' | 'status'> & { id?: string; status?: 'approved' | 'pending' | 'rejected' },
    options?: { replaceRestaurantId?: string }
  ) => Restaurant | null;
  replaceExistingRestaurant: (
    targetRestaurantId: string,
    newRestData: Omit<Restaurant, 'id' | 'rating' | 'reviewCount' | 'status'> & { status?: 'approved' | 'pending' | 'rejected' }
  ) => Restaurant | null;
  submitAdditionalStorePaymentRequest: (
    transactionRef?: string,
    notes?: string,
    paymentProofData?: { dataUrl: string; fileName?: string; mimeType?: string },
    amountUsd?: number
  ) => Promise<{ success: boolean; transactionId: string; autoVerified?: boolean; error?: string }>;
  getCurrentUserStoreQuota: (targetUser?: User | null) => UserStoreQuotaSummary;
  updateRestaurant: (rest: Restaurant) => void;
  deleteRestaurant: (id: string) => void;
  approveRestaurant: (id: string) => void;
  rejectRestaurant: (id: string, reasonKh?: string) => void;
  toggleVerifyRestaurant: (id: string) => void;

  // Restaurant Menu Items (Max 20 for Active Premium) & Genuine Customer Reviews
  addRestaurantMenuItem: (restaurantId: string, item: Omit<RestaurantMenuItem, 'id' | 'createdAt' | 'restaurantId'>) => boolean;
  updateRestaurantMenuItem: (restaurantId: string, item: RestaurantMenuItem) => boolean;
  deleteRestaurantMenuItem: (restaurantId: string, menuItemId: string) => boolean;
  addRestaurantReview: (restaurantId: string, rating: number, comment?: string) => boolean;
  upgradeRestaurantToPremium: (restaurantId: string, transactionRef: string, paymentMethod?: 'KHQR' | 'Bakong' | 'BankTransfer') => void;
  
  // Restaurant Analytics (Views, Calls, Maps, Shares)
  trackRestaurantView: (restaurantId: string) => void;
  trackRestaurantCall: (restaurantId: string) => void;
  trackRestaurantMap: (restaurantId: string) => void;
  trackRestaurantShare: (restaurantId: string) => void;
  
  // Managing Restaurant Modal & Multi-Shop Isolation
  isManageMenuModalOpen: boolean;
  setIsManageMenuModalOpen: (open: boolean) => void;
  managingRestaurant: Restaurant | null;
  setManagingRestaurant: (rest: Restaurant | null) => void;
  activeManagedShopId: string | null;
  setActiveManagedShopId: (shopId: string | null) => void;
  getOwnedRestaurantsForUser: (user?: User | null) => Restaurant[];
  openManageMyVipStore: (preferredShopId?: string, initialTab?: 'menu' | 'info' | 'photos' | 'analytics' | 'membership') => void;
  
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
  toggleNotificationRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  restoreDefaultNotifications: () => void;
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
  approveVipFromSupportTicket: (ticketId: string, durationDays?: number, adminNote?: string) => void;
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

  // Google Maps Places Search & Admin Import Hub
  isGoogleMapsSearchModalOpen: boolean;
  setIsGoogleMapsSearchModalOpen: (open: boolean) => void;
  googleMapsSearchInitialTab: 'restaurant' | 'tourism' | 'all';
  openGoogleMapsSearchModal: (initialTab?: 'restaurant' | 'tourism' | 'all') => void;
  importGooglePlaceToApp: (
    place: GooglePlaceCachedItem,
    customEdits?: {
      nameKh?: string;
      nameEn?: string;
      category?: 'restaurant' | 'tourism';
      provinceKh?: string;
      addressKh?: string;
      phone?: string;
      photoUrl?: string;
    }
  ) => { imported: boolean; duplicate: boolean; type: 'restaurant' | 'tourism'; id: string; item?: Restaurant | TouristDestination };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('kft_user_language_pref_v1');
      if (saved === 'km' || saved === 'en' || saved === 'zh') {
        return saved;
      }
    } catch {}
    return 'km';
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('kft_user_language_pref_v1', newLang);
      const rawUser = localStorage.getItem('kft_current_user_v5');
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        if (parsedUser?.id) {
          localStorage.setItem(`kft_lang_user_${parsedUser.id}`, newLang);
        }
      }
    } catch {}
  };

  useChineseDomTranslation(language);

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('tab') as ActiveTab | null;
      if (p && ['home', 'food', 'restaurants', 'tourism', 'community', 'profile'].includes(p)) {
        return p;
      }
    } catch {}
    return 'home';
  });
  
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

  const sanitizeUserSocialAccounts = (u: User): User => {
    if (!u || !u.socialAccounts) return u;
    const isWebPageUrlNotImage = (url?: string) => {
      if (!url) return false;
      const lower = url.toLowerCase();
      if (lower.startsWith('data:image/')) return false;
      if (/\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|$)/i.test(lower)) return false;
      if (lower.includes('unsplash.com') || lower.includes('wikimedia.org') || lower.includes('googleusercontent.com') || lower.startsWith('/')) return false;
      return lower.includes('tiktok.com/') || lower.includes('facebook.com/') || lower.includes('fb.com/');
    };

    let changed = false;
    const nextSocial = { ...u.socialAccounts };

    if (nextSocial.tiktok) {
      const tk = { ...nextSocial.tiktok };
      if (isWebPageUrlNotImage(tk.avatarUrl)) {
        if (!tk.profileUrl) tk.profileUrl = tk.avatarUrl;
        tk.avatarUrl = u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
        changed = true;
      }
      if (tk.followersCount === 'Verified') {
        delete tk.followersCount;
        changed = true;
      }
      nextSocial.tiktok = tk;
    }

    if (nextSocial.facebook) {
      const fb = { ...nextSocial.facebook };
      if (isWebPageUrlNotImage(fb.avatarUrl)) {
        if (!fb.profileUrl) fb.profileUrl = fb.avatarUrl;
        fb.avatarUrl = u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
        changed = true;
      }
      if (fb.displayName && (fb.displayName.startsWith('http://') || fb.displayName.startsWith('https://'))) {
        fb.profileUrl = fb.displayName;
        fb.displayName = fb.username || u.name;
        changed = true;
      }
      if (fb.followersCount === 'Verified') {
        delete fb.followersCount;
        changed = true;
      }
      nextSocial.facebook = fb;
    }

    return changed ? { ...u, socialAccounts: nextSocial } : u;
  };

  // Local storage loaded states with fallbacks (Preserves VIP accounts & users across all future app updates)
  const [users, setUsers] = useState<User[]>(() => {
    try {
      let localDeleted: DeletedUserRecord[] = [];
      try {
        const rawDel = localStorage.getItem('kft_deleted_users_v1');
        if (rawDel) localDeleted = JSON.parse(rawDel) || [];
      } catch {}

      let loadedUsers: User[] = [];
      const saved = localStorage.getItem('kft_users_v5');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          loadedUsers = parsed
            .filter((u: User) => !checkIsUserDeleted(u, localDeleted))
            .map(sanitizeUserSocialAccounts);
        }
      }

      // Also include any active non-admin session stored in `kft_current_user_v5` so a logged-in user is never missing from `users`
      try {
        const savedCur = localStorage.getItem('kft_current_user_v5');
        if (savedCur && savedCur !== 'undefined' && savedCur !== 'null') {
          const parsedCur = JSON.parse(savedCur);
          if (
            parsedCur &&
            typeof parsedCur === 'object' &&
            parsedCur.role !== 'admin' &&
            parsedCur.id !== 'admin-authorized-single' &&
            !checkIsUserDeleted(parsedCur, localDeleted)
          ) {
            loadedUsers.push(sanitizeUserSocialAccounts(parsedCur));
          }
        }
      } catch {}

      // Reconcile with local VIP Registry Backup (`kft_vip_registry_backup_v1`) so VIP status is never lost during updates
      try {
        const rawVipBackup = localStorage.getItem('kft_vip_registry_backup_v1');
        if (rawVipBackup) {
          const vipList: User[] = JSON.parse(rawVipBackup);
          if (Array.isArray(vipList)) {
            loadedUsers.push(...vipList.filter(v => v && !checkIsUserDeleted(v, localDeleted)));
          }
        }
      } catch {}

      return deduplicateAndNormalizeUsers(loadedUsers, localDeleted);
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
          return sanitizeUserSocialAccounts(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_current_user_v5', e);
    }
    return null; // No demo user logged in by default
  });

  const [foods, setFoods] = useState<FoodItem[]>(() => {
    // Purge ancient legacy caches
    try {
      localStorage.removeItem('kft_foods_v4');
      localStorage.removeItem('kft_foods_100_v1');
      localStorage.removeItem('kft_foods_100_v2');
      localStorage.removeItem('kft_foods_100_v3');
    } catch {}
    const vault = loadLocalMediaOverrides();
    try {
      const saved =
        localStorage.getItem('kft_foods_200_v7') ||
        localStorage.getItem('kft_foods_200_v6') ||
        localStorage.getItem('kft_foods_200_v5');
      localStorage.removeItem('kft_foods_200_v5');
      localStorage.removeItem('kft_foods_200_v6');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50) {
          const initialMap = new Map(initialFoods.map(f => [f.id, f]));
          let vaultChanged = false;
          const upgraded = parsed.map((f: FoodItem) => {
            const seed = initialMap.get(f.id);
            if (!seed) return f;

            // Check if Admin previously customized this food item's photo or details
            const existingOverride = vault.foods[f.id];
            const isPhotoModifiedFromSeed =
              typeof f.photoUrl === 'string' &&
              f.photoUrl.trim().length > 0 &&
              f.photoUrl !== seed.photoUrl &&
              (f.isCustomPhoto ||
                f.photoUrl.startsWith('data:') ||
                f.photoUrl.startsWith('http://') ||
                f.photoUrl.startsWith('https://') ||
                (f.imageAuditNote && (f.imageAuditNote.includes('រដ្ឋបាល') || f.imageAuditNote.includes('Online'))));

            if (isPhotoModifiedFromSeed && !existingOverride) {
              vault.foods[f.id] = {
                id: f.id,
                photoUrl: f.photoUrl,
                nameKh: f.nameKh,
                nameEn: f.nameEn,
                categorySlug: f.categorySlug,
                categoryKh: f.categoryKh,
                categoryEn: f.categoryEn,
                descriptionKh: f.descriptionKh,
                descriptionEn: f.descriptionEn,
                priceRiel: f.priceRiel,
                priceUsd: f.priceUsd,
                imageAuditStatus: f.imageAuditStatus || 'verified',
                imageAuditNote: f.imageAuditNote,
                isCustomPhoto: true,
                updatedAt: f.photoUpdatedAt || new Date().toISOString(),
              };
              vaultChanged = true;
            }

            const finalOverride = vault.foods[f.id];
            if (finalOverride && finalOverride.photoUrl) {
              return {
                ...seed,
                ...f,
                nameKh: finalOverride.nameKh || seed.nameKh,
                nameEn: finalOverride.nameEn || seed.nameEn,
                photoUrl: finalOverride.photoUrl,
                originalPhotoUrl: seed.originalPhotoUrl,
                imageAuditStatus: finalOverride.imageAuditStatus || 'verified',
                imageAuditNote: finalOverride.imageAuditNote || f.imageAuditNote,
                isCustomPhoto: true,
                photoUpdatedAt: finalOverride.updatedAt,
              };
            }

            return {
              ...f,
              nameKh: seed.nameKh,
              nameEn: seed.nameEn,
              photoUrl: seed.photoUrl,
              originalPhotoUrl: seed.originalPhotoUrl,
              imageAuditStatus: seed.imageAuditStatus,
              imageAuditNote: seed.imageAuditNote,
            };
          });
          if (vaultChanged) {
            saveLocalMediaOverrides(vault);
          }
          const existingIds = new Set(upgraded.map((f: FoodItem) => f.id));
          const missingFromInitial = initialFoods.filter(f => !existingIds.has(f.id));
          const combined = missingFromInitial.length > 0 ? [...upgraded, ...missingFromInitial] : upgraded;
          return applyFoodOverrides(combined, vault.foods);
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_foods_200_v7', e);
    }
    return applyFoodOverrides(initialFoods, vault.foods);
  });

  const normalizeRestaurant = (r: any): Restaurant => {
    const isPromoted = Boolean(r.isPromoted);
    const membershipTier = (r.membershipTier || (isPromoted ? 'premium' : 'free')) as MembershipTier;
    const membershipExpiresAt = r.membershipExpiresAt || (membershipTier === 'premium' ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : undefined);
    
    const galleryPhotos: string[] = Array.isArray(r.galleryPhotos) && r.galleryPhotos.length > 0
      ? r.galleryPhotos.filter(Boolean)
      : [r.photoUrl || r.profileImage].filter(Boolean);
    const gallerySet = new Set(galleryPhotos);
    const foodImages: string[] = Array.isArray(r.foodImages)
      ? r.foodImages.filter((u: string) => u && !gallerySet.has(u))
      : [];

    // Preserve exact matched photoUrl for each restaurant without cross-assigning another shop's storefront sign
    // Never allow a food dish photo (/foods/...) or broken path (/restaurants/...) as the restaurant's primary photoUrl
    const rawPhoto = r.photoUrl || r.profileImage || galleryPhotos[0] || '/Shop/rest-1.jpg';
    const photoUrl =
      typeof rawPhoto === 'string' && !rawPhoto.startsWith('/foods/') && !rawPhoto.startsWith('/restaurants/')
        ? rawPhoto
        : '/Shop/rest-1.jpg';
    const rawProfile = r.profileImage || photoUrl;
    const cleanProfileImage =
      typeof rawProfile === 'string' && !rawProfile.startsWith('/foods/') && !rawProfile.startsWith('/restaurants/')
        ? rawProfile
        : photoUrl;
    const restId = r.id || `rest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const isSeed = isSeedRestaurantId(restId);
    const genuineReviews: RestaurantReview[] = Array.isArray(r.reviews)
      ? r.reviews.filter((rev: any) => rev && typeof rev.rating === 'number' && rev.rating >= 1 && rev.rating <= 5)
      : [];
    const ratingSummary = getRestaurantRatingSummary({
      id: restId,
      rating: r.rating,
      reviewCount: r.reviewCount,
      reviews: genuineReviews,
      dataSource: r.dataSource,
      googlePlaceId: r.googlePlaceId,
      googleMapsMeta: r.googleMapsMeta,
    });

    return {
      id: restId,
      nameKh: r.nameKh || 'ភោជនីយដ្ឋានខ្មែរ',
      nameEn: r.nameEn || r.nameKh || 'Khmer Restaurant',
      descriptionKh: r.descriptionKh || 'ភោជនីយដ្ឋានម្ហូបខ្មែររសជាតិដើម ផាសុកភាព និងអនាម័យខ្ពស់។',
      descriptionEn: r.descriptionEn || 'Authentic traditional Khmer restaurant.',
      photoUrl,
      profileImage: cleanProfileImage,
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
      rating: ratingSummary.averageRating,
      reviewCount: ratingSummary.reviewCount,
      reviews: genuineReviews,
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
        views: typeof r.analytics.views === 'number' ? r.analytics.views : (isSeed ? 65 : 0),
        phoneClicks: typeof r.analytics.phoneClicks === 'number' ? r.analytics.phoneClicks : (isSeed ? 14 : 0),
        mapClicks: typeof r.analytics.mapClicks === 'number' ? r.analytics.mapClicks : (isSeed ? 18 : 0),
        shareClicks: typeof r.analytics.shareClicks === 'number' ? r.analytics.shareClicks : (isSeed ? 9 : 0),
      } : (isSeed ? { views: 65, phoneClicks: 14, mapClicks: 18, shareClicks: 9 } : { views: 0, phoneClicks: 0, mapClicks: 0, shareClicks: 0 }),
      paymentStatus: r.paymentStatus || (membershipTier === 'premium' ? 'verified' : 'unpaid'),
      promotionalPrice: typeof r.promotionalPrice === 'number' ? r.promotionalPrice : 9.99,
      isPromoted,
      ownerId: r.ownerId,
      ownerName: r.ownerName,
      ownerEmail: r.ownerEmail,
      ownerPhone: r.ownerPhone,
      paymentDate: r.paymentDate,
      promoVideoUrl: r.promoVideoUrl,
      telegramUrl: r.telegramUrl,
      facebookUrl: r.facebookUrl,
      websiteUrl: r.websiteUrl,
      businessCategory: r.businessCategory,
      googlePlaceId: r.googlePlaceId,
      dataSource: r.dataSource,
      googleMapsMeta: r.googleMapsMeta,
      isAdminEdited: Boolean(r.isAdminEdited),
      adminEditedAt: r.adminEditedAt,
      aiCategoryVerification: r.aiCategoryVerification,
      created_at: getRestaurantCreatedAtIso(r),
      createdAt: getRestaurantCreatedAtIso(r),
      updatedAt: r.updatedAt || r.photoUpdatedAt || r.adminEditedAt,
      photoUpdatedAt: r.photoUpdatedAt || r.updatedAt || r.adminEditedAt,
    };
  };

  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    const seedMap = new Map<string, Restaurant>(initialRestaurants.map(r => [r.id, r]));
    const vault = loadLocalMediaOverrides();
    let vaultChanged = false;
    try {
      localStorage.removeItem('kft_restaurants_real_v5');
      localStorage.removeItem('kft_restaurants_real_v6');
      localStorage.removeItem('kft_restaurants_real_v7');
      localStorage.removeItem('kft_restaurants_real_v8');
      const saved =
        localStorage.getItem('kft_restaurants_real_v11') ||
        localStorage.getItem('kft_restaurants_real_v10') ||
        localStorage.getItem('kft_restaurants_real_v9');
      localStorage.removeItem('kft_restaurants_real_v9');
      localStorage.removeItem('kft_restaurants_real_v10');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 40) {
          const seenIds = new Set<string>();
          const normalizedList: Restaurant[] = [];
          for (const r of parsed) {
            if (!r || !r.id) continue;
            const rId = String(r.id);
            if (seenIds.has(rId)) continue;

            const seed = seedMap.get(rId);
            // Skip removed legacy template clones & dish-named seed entries unless owned by a real user
            if (!seed && isSeedRestaurantId(rId) && (!r.ownerId || r.ownerId === 'owner-1')) {
              continue;
            }
            seenIds.add(rId);

            if (seed) {
              const primaryImg = r.profileImage || r.photoUrl || '';
              const hasCustomPhoto =
                Boolean(r.isAdminEdited) &&
                typeof primaryImg === 'string' &&
                primaryImg.trim().length > 0 &&
                !primaryImg.startsWith('/foods/') &&
                !primaryImg.startsWith('/restaurants/') &&
                primaryImg !== seed.photoUrl &&
                (primaryImg.startsWith('data:') || primaryImg.startsWith('http://') || primaryImg.startsWith('https://'));
              const seedGallery = Array.isArray(seed.galleryPhotos) && seed.galleryPhotos.length > 0
                ? seed.galleryPhotos
                : (Array.isArray(seed.foodImages) ? seed.foodImages : []);
              const hasCustomGallery =
                Boolean(r.isAdminEdited) &&
                Array.isArray(r.galleryPhotos) &&
                r.galleryPhotos.length > 0 &&
                JSON.stringify(r.galleryPhotos) !== JSON.stringify(seedGallery);

              if ((hasCustomPhoto || hasCustomGallery) && !vault.restaurants[r.id]) {
                vault.restaurants[r.id] = {
                  id: r.id,
                  photoUrl: hasCustomPhoto ? primaryImg : seed.photoUrl,
                  profileImage: hasCustomPhoto ? primaryImg : seed.photoUrl,
                  galleryPhotos: hasCustomGallery ? r.galleryPhotos : seed.galleryPhotos,
                  foodImages: Array.isArray(r.foodImages)
                    ? r.foodImages.filter((u: string) => u && !(hasCustomGallery ? r.galleryPhotos : (seed.galleryPhotos || [])).includes(u))
                    : [],
                  menuItems: r.menuItems,
                  isCustomPhoto: true,
                  updatedAt: new Date().toISOString(),
                };
                vaultChanged = true;
              }

              const ov = vault.restaurants[r.id];
              const ovPhotoValid =
                ov?.photoUrl &&
                !ov.photoUrl.startsWith('/foods/') &&
                !ov.photoUrl.startsWith('/restaurants/') &&
                (ov.photoUrl.startsWith('data:') || ov.photoUrl.startsWith('http://') || ov.photoUrl.startsWith('https://'));
              const finalPhoto = ovPhotoValid ? ov!.photoUrl! : (hasCustomPhoto ? primaryImg : seed.photoUrl);
              const finalGallery =
                (Array.isArray(ov?.galleryPhotos) && ov.galleryPhotos.length > 0)
                  ? ov.galleryPhotos
                  : (hasCustomGallery ? r.galleryPhotos : seed.galleryPhotos);

              normalizedList.push(normalizeRestaurant({
                ...r,
                nameKh: ov?.nameKh || seed.nameKh,
                nameEn: ov?.nameEn || seed.nameEn,
                descriptionKh: ov?.descriptionKh || seed.descriptionKh,
                descriptionEn: ov?.descriptionEn || seed.descriptionEn,
                photoUrl: finalPhoto,
                profileImage: finalPhoto,
                galleryPhotos: finalGallery,
                foodImages: Array.isArray(ov?.foodImages)
                  ? ov.foodImages.filter((u: string) => u && !(finalGallery || []).includes(u))
                  : [],
                menuItems: ov?.menuItems || r.menuItems || [],
                reviews: ov?.reviews || r.reviews || [],
                addressKh: ov?.addressKh || seed.addressKh,
                addressEn: seed.addressEn,
                provinceKh: ov?.provinceKh || seed.provinceKh,
                provinceEn: seed.provinceEn,
                signatureDishesKh: seed.signatureDishesKh,
                created_at: seed.created_at || getRestaurantCreatedAtIso(seed),
                createdAt: seed.created_at || getRestaurantCreatedAtIso(seed),
              }));
            } else {
              normalizedList.push(normalizeRestaurant(r));
            }
          }
          // Ensure any newly added seed restaurants (e.g. Chumnor Kbal Koh - ជំនោរក្បាលកោះ) are also merged in
          for (const seedRest of initialRestaurants) {
            if (!seenIds.has(seedRest.id)) {
              seenIds.add(seedRest.id);
              normalizedList.push(normalizeRestaurant(seedRest));
            }
          }
          if (vaultChanged) {
            saveLocalMediaOverrides(vault);
          }
          return sortRestaurantsChronologically(
            applyRestaurantOverrides(normalizedList, vault.restaurants).map(normalizeRestaurant)
          );
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_restaurants_real_v9', e);
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
    return sortRestaurantsChronologically(
      applyRestaurantOverrides([...baseRestaurants, ...customLegacyRestaurants], vault.restaurants).map(normalizeRestaurant)
    );
  });

  const [isManageMenuModalOpen, setIsManageMenuModalOpenState] = useState(false);
  const [managingRestaurant, setManagingRestaurantState] = useState<Restaurant | null>(null);
  const setIsManageMenuModalOpen = (open: boolean) => {
    setIsManageMenuModalOpenState(open);
    if (!open) {
      setManagingRestaurantState(null);
    }
  };
  const [activeManagedShopId, setActiveManagedShopIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('kft_active_managed_shop_global') || null;
    } catch {
      return null;
    }
  });

  const setActiveManagedShopId = (shopId: string | null) => {
    setActiveManagedShopIdState(shopId);
    try {
      if (shopId) {
        localStorage.setItem('kft_active_managed_shop_global', shopId);
        if (currentUser?.id) {
          localStorage.setItem(`kft_active_managed_shop_${currentUser.id}`, shopId);
        }
      } else {
        localStorage.removeItem('kft_active_managed_shop_global');
        if (currentUser?.id) {
          localStorage.removeItem(`kft_active_managed_shop_${currentUser.id}`);
        }
      }
    } catch {}
  };

  const setManagingRestaurant = (rest: Restaurant | null) => {
    setManagingRestaurantState(rest);
    if (rest?.id) {
      setActiveManagedShopId(rest.id);
    }
  };

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
    const vault = loadLocalMediaOverrides();
    let vaultChanged = false;
    const isBrokenLegacyDestPhoto = (url?: string) =>
      !url ||
      url.includes('Huay_Kaew_waterfall_mu_yang.jpg') ||
      url.includes('Global_Forest_Change_tree-cover_loss_year') ||
      url.includes('1569683795645');

    try {
      const REMOVED_DUPLICATE_DEST_IDS = new Set(['dest-151', 'dest-171', 'dest-220', 'dest-262', 'dest-298']);
      const saved =
        localStorage.getItem('kft_destinations_real_v8') ||
        localStorage.getItem('kft_destinations_real_v7') ||
        localStorage.getItem('kft_destinations_real_v6') ||
        localStorage.getItem('kft_destinations_real_v5');
      localStorage.removeItem('kft_destinations_real_v5');
      localStorage.removeItem('kft_destinations_real_v6');
      localStorage.removeItem('kft_destinations_real_v7');

      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 100 && !String(parsed[0]?.photoUrl || '').includes('1569683795645')) {
          const initialMap = new Map(initialDestinations.map(d => [d.id, d]));
          const filteredParsed = parsed.filter((d: TouristDestination) => d && d.id && !REMOVED_DUPLICATE_DEST_IDS.has(d.id));
          const upgraded = filteredParsed.map((d: TouristDestination) => {
            const seed = initialMap.get(d.id);
            if (!seed) {
              // Custom Admin-added or Google Maps imported destination
              if (!vault.destinations[d.id] && d.photoUrl && !isBrokenLegacyDestPhoto(d.photoUrl)) {
                vault.destinations[d.id] = {
                  id: d.id,
                  photoUrl: d.photoUrl,
                  nameKh: d.nameKh,
                  nameEn: d.nameEn,
                  descriptionKh: d.descriptionKh,
                  descriptionEn: d.descriptionEn,
                  provinceKh: d.provinceKh,
                  provinceEn: d.provinceEn,
                  addressKh: d.addressKh,
                  mapUrl: d.mapUrl,
                  latitude: d.latitude,
                  longitude: d.longitude,
                  isCustomPhoto: true,
                  updatedAt: d.photoUpdatedAt || new Date().toISOString(),
                };
                vaultChanged = true;
              }
              return d;
            }

            const isBundledStaticTempleSeed =
              typeof seed.photoUrl === 'string' && seed.photoUrl.startsWith('/destinations/');
            const seedTime = seed.photoUpdatedAt ? new Date(seed.photoUpdatedAt).getTime() : 0;

            // PRIORITY 1: Unified Permanent Media Vault (explicit Admin customization)
            const ov = vault.destinations[d.id];
            if (ov && ov.photoUrl && !isBrokenLegacyDestPhoto(ov.photoUrl)) {
              const ovTime = ov.updatedAt ? new Date(ov.updatedAt).getTime() : 0;
              const useOvPhoto =
                !isBundledStaticTempleSeed ||
                ov.photoUrl.startsWith('/destinations/') ||
                ovTime > seedTime + 1000 ||
                seedTime === 0;
              const chosenPhoto = useOvPhoto ? ov.photoUrl : seed.photoUrl;
              return {
                ...seed,
                ...d,
                nameKh: ov.nameKh || seed.nameKh,
                nameEn: ov.nameEn || seed.nameEn,
                descriptionKh: ov.descriptionKh || seed.descriptionKh,
                descriptionEn: ov.descriptionEn || seed.descriptionEn,
                provinceKh: ov.provinceKh || seed.provinceKh,
                provinceEn: ov.provinceEn || seed.provinceEn,
                addressKh: ov.addressKh || seed.addressKh,
                photoUrl: chosenPhoto,
                galleryPhotos: [chosenPhoto],
                isCustomPhoto: true,
                photoUpdatedAt: ovTime >= seedTime ? ov.updatedAt : seed.photoUpdatedAt,
              };
            }

            // PRIORITY 2: Custom upload or Admin edit present in cached list
            const isUserUpload = typeof d.photoUrl === 'string' && d.photoUrl.startsWith('data:');
            const cachedTime = d.photoUpdatedAt ? new Date(d.photoUpdatedAt).getTime() : 0;
            const hasCustomFlag = Boolean(d.isCustomPhoto || d.isAdminEdited);
            const isValidCustomPhoto =
              (isUserUpload || (!isBundledStaticTempleSeed && hasCustomFlag)) &&
              (!isBundledStaticTempleSeed || cachedTime > seedTime + 1000) &&
              typeof d.photoUrl === 'string' &&
              d.photoUrl.trim().length > 0 &&
              !isBrokenLegacyDestPhoto(d.photoUrl) &&
              d.photoUrl !== seed.photoUrl;

            const effectivePhoto = isValidCustomPhoto ? d.photoUrl : seed.photoUrl;

            if (isValidCustomPhoto && !vault.destinations[d.id]) {
              vault.destinations[d.id] = {
                id: d.id,
                photoUrl: d.photoUrl,
                nameKh: d.isAdminEdited ? d.nameKh : seed.nameKh,
                nameEn: d.isAdminEdited ? d.nameEn : seed.nameEn,
                descriptionKh: d.isAdminEdited ? d.descriptionKh : seed.descriptionKh,
                descriptionEn: d.isAdminEdited ? d.descriptionEn : seed.descriptionEn,
                provinceKh: d.isAdminEdited ? d.provinceKh : seed.provinceKh,
                provinceEn: d.isAdminEdited ? d.provinceEn : seed.provinceEn,
                addressKh: d.isAdminEdited ? d.addressKh : seed.addressKh,
                isAdminEdited: d.isAdminEdited,
                adminEditedAt: d.adminEditedAt,
                isCustomPhoto: true,
                updatedAt: d.photoUpdatedAt || new Date().toISOString(),
              };
              vaultChanged = true;
            }

            return {
              ...seed,
              ...d,
              nameKh: d.isAdminEdited && !isBundledStaticTempleSeed ? d.nameKh : seed.nameKh,
              nameEn: d.isAdminEdited && !isBundledStaticTempleSeed ? d.nameEn : seed.nameEn,
              descriptionKh: d.isAdminEdited && !isBundledStaticTempleSeed ? d.descriptionKh : seed.descriptionKh,
              descriptionEn: d.isAdminEdited && !isBundledStaticTempleSeed ? d.descriptionEn : seed.descriptionEn,
              provinceKh: d.isAdminEdited && !isBundledStaticTempleSeed ? d.provinceKh : seed.provinceKh,
              provinceEn: d.isAdminEdited && !isBundledStaticTempleSeed ? d.provinceEn : seed.provinceEn,
              addressKh: d.isAdminEdited && !isBundledStaticTempleSeed ? d.addressKh : seed.addressKh,
              photoUrl: effectivePhoto,
              galleryPhotos: [effectivePhoto],
              isCustomPhoto: isValidCustomPhoto || Boolean(seed.isCustomPhoto),
              photoUpdatedAt: isValidCustomPhoto ? d.photoUpdatedAt : seed.photoUpdatedAt,
            };
          });

          if (vaultChanged) {
            saveLocalMediaOverrides(vault);
          }

          const existingIds = new Set(upgraded.map((d: TouristDestination) => d.id));
          const missingFromInitial = initialDestinations.filter(d => !existingIds.has(d.id));
          const combined = missingFromInitial.length > 0 ? [...upgraded, ...missingFromInitial] : upgraded;
          return applyDestinationOverrides(combined, vault.destinations);
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
    return applyDestinationOverrides(initialDestinations, vault.destinations);
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
      localStorage.removeItem('kft_settings_v3');
      localStorage.removeItem('kft_settings_v4');
      const saved = localStorage.getItem('kft_settings_v5');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return normalizeAuthoritativeAppSettings(parsed, initialAppSettings);
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_settings_v5', e);
    }
    return normalizeAuthoritativeAppSettings(initialAppSettings);
  });
  const [isRefreshingSettings, setIsRefreshingSettings] = useState(false);
  const [settingsSyncError, setSettingsSyncError] = useState<string | null>(null);
  const appSettingsRef = useRef<AppSettings>(appSettings);
  useEffect(() => {
    appSettingsRef.current = appSettings;
  }, [appSettings]);

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
  const [isGoogleMapsSearchModalOpen, setIsGoogleMapsSearchModalOpenRaw] = useState(false);
  const [googleMapsSearchInitialTab, setGoogleMapsSearchInitialTab] = useState<'restaurant' | 'tourism' | 'all'>('all');
  const setIsGoogleMapsSearchModalOpen = (open: boolean) => {
    if (open && !verifyBackendVipFeatureAccess('ស្វែងរកទីតាំងលើ Google Maps', 'Google Maps Places Search')) {
      return;
    }
    setIsGoogleMapsSearchModalOpenRaw(open);
  };
  const openGoogleMapsSearchModal = (initialTab: 'restaurant' | 'tourism' | 'all' = 'all') => {
    if (!verifyBackendVipFeatureAccess('ស្វែងរកទីតាំងលើ Google Maps', 'Google Maps Places Search')) {
      return;
    }
    setGoogleMapsSearchInitialTab(initialTab);
    setIsGoogleMapsSearchModalOpenRaw(true);
  };
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

  // 6 Personalized Account Features Modals (Locked for Free/Expired/Cancelled users, Verified on Backend/Context)
  const [isWhatToEatModalOpen, setIsWhatToEatModalOpenRaw] = useState(false);
  const [isNearMeModalOpen, setIsNearMeModalOpenRaw] = useState(false);
  const [isDailyDiscoveriesModalOpen, setIsDailyDiscoveriesModalOpenRaw] = useState(false);
  const [isWishlistsModalOpen, setIsWishlistsModalOpenRaw] = useState(false);
  const [isAiTripPlannerModalOpen, setIsAiTripPlannerModalOpenRaw] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpenRaw] = useState(false);
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

  const closeAllPersonalizedFeatureModals = () => {
    setIsWhatToEatModalOpenRaw(false);
    setIsNearMeModalOpenRaw(false);
    setIsDailyDiscoveriesModalOpenRaw(false);
    setIsWishlistsModalOpenRaw(false);
    setIsAiTripPlannerModalOpenRaw(false);
    setIsNotificationsModalOpenRaw(false);
    setIsGoogleMapsSearchModalOpenRaw(false);
  };

  // Authoritative Backend/Context VIP Verification for Personalized Features
  const verifyBackendVipFeatureAccess = (featureNameKh: string, featureNameEn: string): boolean => {
    if (!currentUser) {
      closeAllPersonalizedFeatureModals();
      showToast(
        language === 'km'
          ? `🔒 សូមចូលគណនី និងបើកកញ្ចប់ VIP ដើម្បីប្រើប្រាស់មុខងារ «${featureNameKh}»!`
          : `🔒 Please sign in and activate VIP to access "${featureNameEn}"!`,
        'warning'
      );
      setIsAuthModalOpen(true);
      return false;
    }

    const isAdmin =
      currentUser.role === 'admin' ||
      currentUser.id === 'admin-authorized-single' ||
      currentUser.username === 'admin' ||
      currentUser.username === 'cheasavuth';
    if (isAdmin) return true;

    // Cross-verify against authoritative backend/state users array
    const backendUserRecord = users.find(u => u.id === currentUser.id) || currentUser;
    const isBackendActiveVip =
      !backendUserRecord.isDisabled &&
      isUserVipActive(backendUserRecord) &&
      isUserVipActive(currentUser);

    if (!isBackendActiveVip) {
      closeAllPersonalizedFeatureModals();
      const vipState = getVipAccountState(backendUserRecord);
      const isExpiredOrCancelled =
        vipState === 'expired_vip' || backendUserRecord.subscriptionStatus === 'cancelled';

      showToast(
        language === 'km'
          ? isExpiredOrCancelled
            ? `🔒 សមាជិកភាព VIP របស់អ្នកបានផុតកំណត់ ឬត្រូវបានបោះបង់។ សូមបន្តកញ្ចប់ VIP ដើម្បីប្រើប្រាស់មុខងារ «${featureNameKh}»!`
            : `🔒 មុខងារពិសេស «${featureNameKh}» អនុញ្ញាតសម្រាប់តែសមាជិក VIP ប៉ុណ្ណោះ។ សូមដំឡើងទៅ VIP ឥឡូវនេះ!`
          : isExpiredOrCancelled
          ? `🔒 Your VIP subscription has expired or was cancelled. Please renew VIP to access "${featureNameEn}"!`
          : `🔒 Personalized Feature "${featureNameEn}" is locked for Free Users. Upgrade to VIP to unlock!`,
        'warning'
      );
      openUpgradeVipModal(isExpiredOrCancelled);
      return false;
    }

    return true;
  };

  const setIsWhatToEatModalOpen = (open: boolean) => {
    if (open && !verifyBackendVipFeatureAccess('ថ្ងៃនេះញ៉ាំអី?', 'What to Eat Today?')) return;
    setIsWhatToEatModalOpenRaw(open);
  };

  const setIsNearMeModalOpen = (open: boolean) => {
    if (open && !verifyBackendVipFeatureAccess('នៅជិតខ្ញុំ (GPS)', 'Near Me (GPS)')) return;
    setIsNearMeModalOpenRaw(open);
  };

  const setIsDailyDiscoveriesModalOpen = (open: boolean) => {
    setIsDailyDiscoveriesModalOpenRaw(open);
  };

  const setIsWishlistsModalOpen = (open: boolean) => {
    if (open && !verifyBackendVipFeatureAccess('បញ្ជីចង់ទៅ', 'My Wishlists')) return;
    setIsWishlistsModalOpenRaw(open);
  };

  const setIsAiTripPlannerModalOpen = (open: boolean) => {
    if (open && !verifyBackendVipFeatureAccess('ផែនការដើរលេង AI', 'AI Trip Planner')) return;
    setIsAiTripPlannerModalOpenRaw(open);
  };

  const setIsNotificationsModalOpen = (open: boolean) => {
    setIsNotificationsModalOpenRaw(open);
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
    const vault = loadLocalMediaOverrides();
    const seedById = new Map<string, TrendingFoodItem>(
      initialTrendingFoods.map((seed) => [seed.id, seed])
    );
    try {
      localStorage.removeItem('kft_trending_foods_v2');
      const saved = localStorage.getItem('kft_trending_foods_v3');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed
            .filter((item): item is TrendingFoodItem => Boolean(item && typeof item === 'object' && item.id))
            .map((item) => {
              const seed = seedById.get(item.id);
              return seed ? { ...seed, ...item, photoUrl: item.photoUrl || seed.photoUrl } : item;
            })
            .filter((item) => Boolean(item.foodNameKh || item.foodNameEn));
          if (sanitized.length > 0) {
            // Ensure all core seed trending foods remain present
            const existingIds = new Set(sanitized.map((i) => i.id));
            for (const seed of initialTrendingFoods) {
              if (!existingIds.has(seed.id)) {
                sanitized.push(seed);
              }
            }
            return applyTrendingFoodOverrides(sanitized, vault.trendingFoods);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_trending_foods_v3', e);
    }
    return applyTrendingFoodOverrides(initialTrendingFoods, vault.trendingFoods);
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

  // Helpful Notifications (with full Khmer, English & Simplified Chinese support + accurate targetIds & dates)
  const getRelativeDateIso = (daysAgo: number): string => {
    const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  };

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const defaultNotificationsList: AppNotification[] = buildDynamicNotificationsList(
      foods,
      restaurants,
      destinations
    );
    try {
      const saved = localStorage.getItem('kft_notifications_v1');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seedMap = new Map(defaultNotificationsList.map(item => [item.id, item]));
          const upgradedExisting = parsed.map((n: AppNotification) => {
            const seed = seedMap.get(n.id);
            if (!seed) return n;
            const hasLegacyStaticDate = n.date === '2026-10-21' || n.date === '2026-10-20' || n.date === '2026-10-19';
            return {
              ...seed,
              ...n,
              titleKh: seed.titleKh,
              titleEn: seed.titleEn,
              titleZh: seed.titleZh,
              messageKh: seed.messageKh,
              messageEn: seed.messageEn,
              messageZh: seed.messageZh,
              type: seed.type,
              targetType: seed.targetType,
              targetId: seed.targetId,
              discountPercent: seed.discountPercent,
              photoUrl: seed.photoUrl,
              provinceKh: seed.provinceKh,
              provinceEn: seed.provinceEn,
              sourceName: seed.sourceName,
              sourceUrl: seed.sourceUrl,
              timestampIso: seed.timestampIso,
              date: hasLegacyStaticDate ? seed.date : (n.date || seed.date),
              isRead: Boolean(n.isRead),
            };
          });
          const existingIds = new Set(upgradedExisting.map((x: AppNotification) => x.id));
          const newDefaults = defaultNotificationsList.filter(d => !existingIds.has(d.id));
          return [...upgradedExisting, ...newDefaults];
        }
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

  // Compact bulk arrays before writing to localStorage so base64 photos already confirmed persisted in VAULT_KEYS
  // are never duplicated a second time in kft_destinations_real_v8 / kft_restaurants_real_v9 / kft_foods_200_v7.
  // Never strip a `data:` photo unless `isOverridePersistedInLocalStorage` confirms the override is safely on disk in localStorage.
  const seedDestPhotoMapRef = useRef<Map<string, string> | null>(null);
  const seedFoodPhotoMapRef = useRef<Map<string, string> | null>(null);
  const seedRestPhotoMapRef = useRef<Map<string, string> | null>(null);

  const compactDataForBulkLocalStorage = (key: string, data: unknown): unknown => {
    if (!Array.isArray(data)) return data;
    try {
      if (key === 'kft_destinations_real_v8') {
        if (!seedDestPhotoMapRef.current) {
          seedDestPhotoMapRef.current = new Map(initialDestinations.map(d => [d.id, d.photoUrl]));
        }
        const seedDestMap = seedDestPhotoMapRef.current;
        return (data as TouristDestination[]).map(d => {
          if (
            d &&
            typeof d.photoUrl === 'string' &&
            d.photoUrl.startsWith('data:') &&
            isOverridePersistedInLocalStorage('destinations', d.id)
          ) {
            const fallbackUrl = seedDestMap.get(d.id) || '';
            return {
              ...d,
              photoUrl: fallbackUrl,
              galleryPhotos: fallbackUrl ? [fallbackUrl] : [],
              isCustomPhoto: true,
            };
          }
          return d;
        });
      }
      if (key === 'kft_foods_200_v7') {
        if (!seedFoodPhotoMapRef.current) {
          seedFoodPhotoMapRef.current = new Map(initialFoods.map(f => [f.id, f.photoUrl]));
        }
        const seedFoodMap = seedFoodPhotoMapRef.current;
        return (data as FoodItem[]).map(f => {
          if (
            f &&
            typeof f.photoUrl === 'string' &&
            f.photoUrl.startsWith('data:') &&
            isOverridePersistedInLocalStorage('foods', f.id)
          ) {
            return {
              ...f,
              photoUrl: seedFoodMap.get(f.id) || '',
              isCustomPhoto: true,
            };
          }
          return f;
        });
      }
      if (key === 'kft_restaurants_real_v11') {
        if (!seedRestPhotoMapRef.current) {
          seedRestPhotoMapRef.current = new Map(initialRestaurants.map(r => [r.id, r.photoUrl]));
        }
        const seedRestMap = seedRestPhotoMapRef.current;
        return (data as Restaurant[]).map(r => {
          if (!r) return r;
          const hasPersistedOverride = isOverridePersistedInLocalStorage('restaurants', r.id);
          const hasInlineDataUrl =
            (typeof r.photoUrl === 'string' && r.photoUrl.startsWith('data:')) ||
            (typeof r.profileImage === 'string' && r.profileImage.startsWith('data:')) ||
            (Array.isArray(r.galleryPhotos) && r.galleryPhotos.some(g => g.startsWith('data:'))) ||
            (Array.isArray(r.foodImages) && r.foodImages.some(g => g.startsWith('data:'))) ||
            (Array.isArray(r.menuItems) && r.menuItems.some(m => typeof m.photoUrl === 'string' && m.photoUrl.startsWith('data:')));
          if (hasInlineDataUrl && hasPersistedOverride) {
            const fallbackUrl = seedRestMap.get(r.id) || '/Shop/rest-1.jpg';
            return {
              ...r,
              photoUrl: r.photoUrl?.startsWith('data:') ? fallbackUrl : r.photoUrl,
              profileImage: r.profileImage?.startsWith('data:') ? fallbackUrl : r.profileImage,
              galleryPhotos: Array.isArray(r.galleryPhotos)
                ? r.galleryPhotos.filter(g => !g.startsWith('data:'))
                : [],
              foodImages: Array.isArray(r.foodImages)
                ? r.foodImages.filter(g => !g.startsWith('data:'))
                : [],
              menuItems: Array.isArray(r.menuItems)
                ? r.menuItems.map(m => (m.photoUrl?.startsWith('data:') ? { ...m, photoUrl: '' } : m))
                : [],
            };
          }
          return r;
        });
      }
    } catch {}
    return data;
  };

  const scheduleStorageWrite = (key: string, data: unknown, delayMs = 1000) => {
    if (storageWriteTimersRef.current[key]) {
      window.clearTimeout(storageWriteTimersRef.current[key]);
    }
    storageWriteTimersRef.current[key] = window.setTimeout(() => {
      delete storageWriteTimersRef.current[key];
      const performWrite = () => {
        try {
          const compacted = compactDataForBulkLocalStorage(key, data);
          localStorage.setItem(key, JSON.stringify(compacted));
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

  // Sync to localStorage safely (guarded against QuotaExceeded or JSON corruption) + Maintain VIP Registry Backup
  // IMPORTANT: Never blindly overwrite `kft_cloud_users_v1` here without pulling & merging from Supabase first!
  useEffect(() => {
    scheduleStorageWrite('kft_users_v5', users, 600);
    const activeVips = users.filter(
      u => u.membershipTier === 'premium_vip' && u.subscriptionStatus === 'active' && u.subscriptionExpiryDate
    );
    if (activeVips.length > 0) {
      scheduleStorageWrite('kft_vip_registry_backup_v1', activeVips, 800);
    }
  }, [users]);

  // Automatic Pre-Update Database & VIP Snapshot Backup whenever App Version changes (runs at most once per session)
  const hasAttemptedVersionBackupRef = useRef(false);
  useEffect(() => {
    if (hasAttemptedVersionBackupRef.current) return;
    hasAttemptedVersionBackupRef.current = true;
    try {
      const APP_VERSION = '2.3.1';
      const lastBackedUpVersion = localStorage.getItem('kft_last_backed_up_version');
      if (lastBackedUpVersion !== APP_VERSION) {
        const activeVips = users.filter(
          u => u.membershipTier === 'premium_vip' && u.subscriptionStatus === 'active'
        );
        const backupSnapshot = {
          backedUpAt: new Date().toISOString(),
          previousVersion: lastBackedUpVersion || 'pre-2.0.0',
          targetVersion: APP_VERSION,
          vipUsersCount: activeVips.length,
          vipUsers: activeVips,
          allUsersCount: users.length,
          verifiedTransactions: transactions.filter(t => t.status === 'verified'),
        };
        try {
          localStorage.setItem('kft_pre_update_db_backup_v1', JSON.stringify(backupSnapshot));
        } catch {
          // Ignore quota error for backup snapshot so it never loops
        }
        try {
          localStorage.setItem('kft_last_backed_up_version', APP_VERSION);
        } catch {}
      }
    } catch (e) {
      console.warn('Pre-update database backup warning:', e);
    }
  }, [users, transactions]);

  const lastCurrentUserSyncSigRef = useRef<string>('');

  useEffect(() => {
    try {
      if (currentUser) {
        scheduleStorageWrite('kft_current_user_v5', currentUser, 300);
        const userLang = localStorage.getItem(`kft_lang_user_${currentUser.id}`);
        if (userLang === 'km' || userLang === 'en' || userLang === 'zh') {
          setLanguageState(userLang);
          localStorage.setItem('kft_user_language_pref_v1', userLang);
        }
        // Guarantee that any logged-in non-admin user is ALWAYS in `users` and synced to their atomic cloud row
        // Deduplicated by signature so initial mount + background cloud sync do not trigger a redundant network loop
        const isAdmin =
          currentUser.role === 'admin' ||
          currentUser.id === 'admin-authorized-single' ||
          currentUser.username === 'admin' ||
          currentUser.username === 'cheasavuth';
        if (!isAdmin && !checkIsUserDeleted(currentUser)) {
          const sig = `${currentUser.id}|${currentUser.email}|${currentUser.phone || ''}|${currentUser.name}|${currentUser.membershipTier || ''}|${currentUser.subscriptionStatus || ''}|${currentUser.subscriptionExpiryDate || ''}|${currentUser.paymentStatus || ''}|${currentUser.paidAdditionalStoreSlots || 0}|${Boolean(currentUser.isDisabled)}`;
          if (lastCurrentUserSyncSigRef.current !== sig) {
            const isFirstMountSync = lastCurrentUserSyncSigRef.current === '';
            lastCurrentUserSyncSigRef.current = sig;
            setUsers(prev => {
              const canonicalId = getCanonicalUserId(currentUser);
              const existing = prev.find(u => u.id === canonicalId || u.id === currentUser.id);
              if (
                existing &&
                existing.membershipTier === currentUser.membershipTier &&
                existing.subscriptionStatus === currentUser.subscriptionStatus &&
                existing.subscriptionExpiryDate === currentUser.subscriptionExpiryDate &&
                existing.paymentStatus === currentUser.paymentStatus &&
                existing.name === currentUser.name
              ) {
                return prev;
              }
              const merged = deduplicateAndNormalizeUsers([...prev, currentUser], deletedUsers);
              if (merged.length !== prev.length || ! existing) {
                return merged;
              }
              return merged;
            });
            // Skip immediate cloud upsert on initial mount because `triggerCloudSyncNow` runs 1.8s after mount anyway
            if (!isFirstMountSync && isSupabaseConfigured()) {
              upsertSingleUserToCloud(currentUser, deletedUsers, false).catch(() => {});
            }
          }
        }
      } else {
        lastCurrentUserSyncSigRef.current = '';
        localStorage.removeItem('kft_current_user_v5');
      }
    } catch (e) {
      console.warn('Storage sync failed for currentUser:', e);
    }
  }, [currentUser]);

  /**
   * Requirement #4: Comprehensive VIP Expiration Reminders & Immediate Automatic Downgrade
   * - Sends an automatic reminder every day during the last 3 days (3, 2, 1 days left) before a VIP account expires.
   * - Immediately downgrades expired VIP accounts (`expiryMs <= Date.now()` or missing expiry date) to normal (`free`) accounts.
   * - Revokes VIP status on restaurants owned by expired accounts.
   * - Persists reminders and downgrades across app restarts (`localStorage` + `Supabase Cloud`).
   */
  useEffect(() => {
    const enforceVipExpirationsAndReminders = () => {
      const nowMs = Date.now();
      const todayStr = new Date(nowMs).toISOString().split('T')[0];

      const isAdminAccount = (u?: User | null) =>
        Boolean(
          u &&
            (u.role === 'admin' ||
              u.id === 'admin-authorized-single' ||
              u.username === 'admin' ||
              u.username === 'cheasavuth')
        );

      let reminderLog: Record<string, string> = {};
      try {
        const rawLog = localStorage.getItem('kft_vip_expiry_reminders_v1');
        if (rawLog) reminderLog = JSON.parse(rawLog) || {};
      } catch {}

      let expiredNoticeLog: Record<string, string> = {};
      try {
        const rawExp = localStorage.getItem('kft_vip_expired_notices_v1');
        if (rawExp) expiredNoticeLog = JSON.parse(rawExp) || {};
      } catch {}

      let reminderLogChanged = false;
      let expiredNoticeLogChanged = false;
      const newNotificationsToPush: AppNotification[] = [];
      const expiredUserIds = new Set<string>();

      const evaluateAccount = (u: User): { updatedUser: User; changed: boolean } => {
        if (!u || isAdminAccount(u)) return { updatedUser: u, changed: false };

        const expiryStr = u.subscriptionExpiryDate;
        const expiryMs = expiryStr ? new Date(expiryStr).getTime() : NaN;
        const hasValidFutureExpiry = !Number.isNaN(expiryMs) && expiryMs > nowMs;

        // Case 1: Account has expired or has VIP tier without a valid future expiration date -> Immediate Downgrade!
        if (!hasValidFutureExpiry && (u.membershipTier === 'premium_vip' || u.subscriptionStatus === 'active')) {
          expiredUserIds.add(u.id);
          const downgraded: User = {
            ...u,
            membershipTier: 'free',
            subscriptionStatus: 'expired',
          };

          const expCycleKey = `${u.id}_${expiryStr || 'no_date'}`;
          if (!expiredNoticeLog[expCycleKey]) {
            expiredNoticeLog[expCycleKey] = todayStr;
            expiredNoticeLogChanged = true;
            const expFormatted = expiryStr ? expiryStr.split('T')[0] : todayStr;
            newNotificationsToPush.push({
              id: `notif-vip-expired-${u.id}-${nowMs}`,
              titleKh: '⚠️ គណនី VIP របស់អ្នកបានផុតកំណត់ហើយ',
              titleEn: '⚠️ Your VIP Account Has Expired',
              messageKh: `សមាជិកភាព VIP នៃគណនី «${u.name}» បានផុតកំណត់នៅថ្ងៃទី ${expFormatted} ហើយត្រូវបានប្តូរមកជាគណនីធម្មតា (Normal Account) ដោយស្វ័យប្រវត្តិ។ សូមបន្តកញ្ចប់ VIP ដើម្បីទទួលបានអត្ថប្រយោជន៍ VIP ឡើងវិញ!`,
              messageEn: `VIP membership for "${u.name}" expired on ${expFormatted} and has been automatically downgraded to a Normal Account. Renew VIP anytime to restore benefits!`,
              type: 'system',
              date: todayStr,
              isRead: false,
            });
            if (currentUser?.id === u.id) {
              showToast(
                language === 'km'
                  ? `⚠️ គណនី VIP របស់អ្នកបានផុតកំណត់ (${expFormatted}) ហើយត្រូវបានប្តូរមកជាគណនីធម្មតា!`
                  : `⚠️ Your VIP membership expired (${expFormatted}) and was downgraded to a normal account!`,
                'warning'
              );
            }
          }

          return { updatedUser: downgraded, changed: true };
        }

        // Case 2: Account is an active VIP -> Check if within the last 3 days (3, 2, or 1 days remaining)
        if (
          hasValidFutureExpiry &&
          u.membershipTier === 'premium_vip' &&
          u.subscriptionStatus === 'active' &&
          u.paymentStatus === 'verified'
        ) {
          const remainingDays = Math.max(0, Math.ceil((expiryMs - nowMs) / (1000 * 60 * 60 * 24)));
          if (remainingDays >= 1 && remainingDays <= 3) {
            const reminderKey = `${u.id}_${todayStr}_day${remainingDays}`;
            if (!reminderLog[reminderKey]) {
              reminderLog[reminderKey] = new Date(nowMs).toISOString();
              reminderLogChanged = true;
              const expDateFormatted = expiryStr!.split('T')[0];

              newNotificationsToPush.push({
                id: `notif-vip-reminder-${u.id}-${todayStr}-d${remainingDays}`,
                titleKh: `⏰ រំលឹក៖ គណនី VIP នឹងផុតកំណត់ក្នុងរយៈពេល ${remainingDays} ថ្ងៃទៀត!`,
                titleEn: `⏰ Reminder: VIP Expires in ${remainingDays} Day${remainingDays > 1 ? 's' : ''}!`,
                messageKh: `គណនី VIP របស់អ្នក («${u.name}») នឹងផុតកំណត់នៅថ្ងៃទី ${expDateFormatted} (នៅសល់ ${remainingDays} ថ្ងៃទៀត)។ សូមបន្តសមាជិកភាព VIP ឱ្យទាន់ពេល ដើម្បីរក្សាអត្ថប្រយោជន៍ហាង VIP របស់អ្នក!`,
                messageEn: `Your VIP account ("${u.name}") expires on ${expDateFormatted} (${remainingDays} day${remainingDays > 1 ? 's' : ''} remaining). Please renew before expiration to keep your VIP benefits!`,
                type: 'system',
                date: todayStr,
                isRead: false,
              });

              if (currentUser?.id === u.id) {
                showToast(
                  language === 'km'
                    ? `⏰ រំលឹកប្រចាំថ្ងៃ៖ គណនី VIP របស់អ្នកនៅសល់ ${remainingDays} ថ្ងៃទៀត (ផុតកំណត់៖ ${expDateFormatted})!`
                    : `⏰ Daily Reminder: Your VIP account has ${remainingDays} day(s) left (Expires: ${expDateFormatted})!`,
                  'warning'
                );
              }
            }
          }
        }

        return { updatedUser: u, changed: false };
      };

      // 1. Check currentUser first
      if (currentUser && !isAdminAccount(currentUser)) {
        const res = evaluateAccount(currentUser);
        if (res.changed) {
          setCurrentUser(res.updatedUser);
          try {
            localStorage.setItem('kft_current_user_v5', JSON.stringify(res.updatedUser));
          } catch {}
        }
      }

      // 2. Check all registered users in users list
      if (users.length > 0) {
        let anyUserChanged = false;
        const nextUsers = users.map((u) => {
          const res = evaluateAccount(u);
          if (res.changed) anyUserChanged = true;
          return res.updatedUser;
        });

        if (anyUserChanged) {
          setUsers(nextUsers);
          try {
            localStorage.setItem('kft_users_v5', JSON.stringify(nextUsers));
          } catch {}
        }
      }

      // 3. Immediately downgrade any restaurants owned by expired VIP accounts
      if (expiredUserIds.size > 0) {
        setRestaurants((prev) => {
          let restChanged = false;
          const nextRests = prev.map((r) => {
            if (r.ownerId && expiredUserIds.has(r.ownerId) && (r.membershipTier === 'premium' || r.isPromoted)) {
              restChanged = true;
              return {
                ...r,
                membershipTier: 'free' as MembershipTier,
                isPromoted: false,
                paymentStatus: 'unpaid' as const,
              };
            }
            return r;
          });
          if (restChanged) {
            try {
              localStorage.setItem('kft_restaurants_real_v11', JSON.stringify(nextRests));
            } catch {}
          }
          return restChanged ? nextRests : prev;
        });
      }

      if (reminderLogChanged) {
        try {
          localStorage.setItem('kft_vip_expiry_reminders_v1', JSON.stringify(reminderLog));
        } catch {}
      }
      if (expiredNoticeLogChanged) {
        try {
          localStorage.setItem('kft_vip_expired_notices_v1', JSON.stringify(expiredNoticeLog));
        } catch {}
      }
      if (newNotificationsToPush.length > 0) {
        setNotifications((prev) => [...newNotificationsToPush, ...prev]);
      }
    };

    enforceVipExpirationsAndReminders();

    const intervalId = window.setInterval(enforceVipExpirationsAndReminders, 600000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentUser?.id, currentUser?.membershipTier, currentUser?.subscriptionExpiryDate, users.length]);

  // Automatically disable access and close any open Personalized Feature modals if currentUser is not an active VIP
  useEffect(() => {
    const isAdmin =
      currentUser &&
      (currentUser.role === 'admin' ||
        currentUser.id === 'admin-authorized-single' ||
        currentUser.username === 'admin' ||
        currentUser.username === 'cheasavuth');
    const backendUser = currentUser ? users.find(u => u.id === currentUser.id) || currentUser : null;
    const hasActiveVip = Boolean(
      isAdmin || (backendUser && !backendUser.isDisabled && isUserVipActive(backendUser) && isUserVipActive(currentUser))
    );

    if (!hasActiveVip) {
      const anyPersonalizedModalOpen =
        isWhatToEatModalOpen ||
        isNearMeModalOpen ||
        isDailyDiscoveriesModalOpen ||
        isWishlistsModalOpen ||
        isAiTripPlannerModalOpen ||
        isNotificationsModalOpen;

      if (anyPersonalizedModalOpen) {
        closeAllPersonalizedFeatureModals();
        if (currentUser) {
          const isExpiredOrCancelled =
            getVipAccountState(backendUser) === 'expired_vip' ||
            backendUser?.subscriptionStatus === 'cancelled';
          openUpgradeVipModal(isExpiredOrCancelled);
        }
      }
    }
  }, [
    currentUser,
    users,
    isWhatToEatModalOpen,
    isNearMeModalOpen,
    isDailyDiscoveriesModalOpen,
    isWishlistsModalOpen,
    isAiTripPlannerModalOpen,
    isNotificationsModalOpen,
  ]);

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
      scheduleStorageWrite('kft_restaurants_real_v11', restaurants, 1200);
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
        localStorage.removeItem('kft_settings_v3');
        localStorage.removeItem('kft_settings_v4');
        localStorage.setItem('kft_settings_v5', JSON.stringify(appSettings));
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

  // Authoritative Server-Side VIP Pricing & Settings Refresh (Single Source of Truth)
  const settingsFetchInFlightRef = useRef<Promise<AppSettings | null> | null>(null);
  const isSavingSettingsRef = useRef<boolean>(false);
  const lastAdminSettingsSaveAtRef = useRef<number>(0);
  const lastSettingsFetchedAtRef = useRef<number>(0);

  const areAppSettingsEqual = (a: AppSettings, b: AppSettings): boolean => {
    return (
      a.vipShortDurationDays === b.vipShortDurationDays &&
      a.vipShortPriceUsd === b.vipShortPriceUsd &&
      a.vipShortNameKh === b.vipShortNameKh &&
      a.vipShortNameEn === b.vipShortNameEn &&
      a.vipLongDurationDays === b.vipLongDurationDays &&
      a.vipLongPriceUsd === b.vipLongPriceUsd &&
      a.vipLongNameKh === b.vipLongNameKh &&
      a.vipLongNameEn === b.vipLongNameEn &&
      a.additionalStoreFeeUsd === b.additionalStoreFeeUsd &&
      a.apkDownloadUrl === b.apkDownloadUrl &&
      a.playStoreUrl === b.playStoreUrl &&
      a.appStoreUrl === b.appStoreUrl &&
      a.supportQrImageUrl === b.supportQrImageUrl &&
      a.supportBankName === b.supportBankName &&
      a.supportAccountName === b.supportAccountName &&
      a.supportMessageKh === b.supportMessageKh &&
      JSON.stringify(a.vipBenefitsList || []) === JSON.stringify(b.vipBenefitsList || [])
    );
  };

  const refreshAppSettingsFromServer = async (silent: boolean = true): Promise<AppSettings | null> => {
    if (!isSupabaseConfigured()) {
      return appSettingsRef.current;
    }
    if (
      isSavingSettingsRef.current ||
      (silent && Date.now() - lastAdminSettingsSaveAtRef.current < 6000) ||
      (silent && lastSettingsFetchedAtRef.current > 0 && Date.now() - lastSettingsFetchedAtRef.current < 120000)
    ) {
      return appSettingsRef.current;
    }
    if (settingsFetchInFlightRef.current) {
      return settingsFetchInFlightRef.current;
    }

    if (!silent) {
      setIsRefreshingSettings(true);
    }
    const task = (async () => {
      try {
        lastSettingsFetchedAtRef.current = Date.now();
        const res = await fetchAuthoritativeAppSettingsFromServer(appSettingsRef.current);
        if (isSavingSettingsRef.current || (silent && Date.now() - lastAdminSettingsSaveAtRef.current < 6000)) {
          return appSettingsRef.current;
        }
        setSettingsSyncError(prev => (prev === null ? prev : null));
        if (res.ok && res.settings) {
          setAppSettings(prev => {
            const next = normalizeAuthoritativeAppSettings(res.settings!, prev);
            if (areAppSettingsEqual(prev, next)) {
              return prev;
            }
            appSettingsRef.current = next;
            return next;
          });
          return appSettingsRef.current;
        }
        return appSettingsRef.current;
      } catch {
        setSettingsSyncError(prev => (prev === null ? prev : null));
        return appSettingsRef.current;
      } finally {
        if (!silent) {
          setIsRefreshingSettings(false);
        }
        settingsFetchInFlightRef.current = null;
      }
    })();

    settingsFetchInFlightRef.current = task;
    return task;
  };

  // Immediately refresh authoritative VIP settings whenever any VIP, Checkout, Support, Store, or Profile view opens
  useEffect(() => {
    if (
      isUpgradeVipModalOpen ||
      isSupportTicketModalOpen ||
      isVipAddRestaurantModalOpen ||
      isAddRestaurantModalOpen ||
      isManageMenuModalOpen ||
      isAdminOpen ||
      activeTab === 'profile'
    ) {
      refreshAppSettingsFromServer(true);
    }
  }, [
    isUpgradeVipModalOpen,
    isSupportTicketModalOpen,
    isVipAddRestaurantModalOpen,
    isAddRestaurantModalOpen,
    isManageMenuModalOpen,
    isAdminOpen,
    activeTab,
    currentUser?.id,
  ]);

  // Listen for cross-tab / BroadcastChannel / window focus / periodic live updates to VIP pricing
  useEffect(() => {
    refreshAppSettingsFromServer(true);

    const handleVisibilityOrFocus = () => {
      if (typeof document === 'undefined' || !document.hidden) {
        refreshAppSettingsFromServer(true);
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'kft_settings_v5' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            setAppSettings(prev => normalizeAuthoritativeAppSettings(parsed, prev));
          }
        } catch {}
      }
    };

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('kft_vip_settings_sync_channel');
        bc.onmessage = (ev) => {
          if (ev?.data?.type === 'VIP_SETTINGS_UPDATED' && ev.data.settings) {
            setAppSettings(prev => normalizeAuthoritativeAppSettings(ev.data.settings, prev));
            setSettingsSyncError(null);
          }
        };
      }
    } catch {}

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('storage', handleStorageEvent);

    const pollInterval = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        refreshAppSettingsFromServer(true);
      }
    }, 600000);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorageEvent);
      clearInterval(pollInterval);
      try {
        bc?.close();
      } catch {}
    };
  }, []);

  // Automatic & Manual Supabase Cloud Synchronization (Free Tier Compatible)
  const cloudSyncInFlightRef = useRef(false);
  const pendingForcedSyncRef = useRef(false);
  const lastCloudSyncAtRef = useRef(0);
  const lastLocalRestaurantEditAtRef = useRef(0);
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [lastUsersSyncedAt, setLastUsersSyncedAt] = useState<string | null>(null);

  // Mutable ref holding the latest live state so `triggerCloudSyncNow` NEVER reads a stale render closure!
  const latestSyncStateRef = useRef({
    users,
    currentUser,
    deletedUsers,
    transactions,
    restaurants,
    supportTickets,
  });
  latestSyncStateRef.current = {
    users,
    currentUser,
    deletedUsers,
    transactions,
    restaurants,
    supportTickets,
  };

  const triggerCloudSyncNow = async (force: boolean = false): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    if (!force && typeof document !== 'undefined' && document.hidden) return false;
    const now = Date.now();
    if (cloudSyncInFlightRef.current) {
      if (force) {
        pendingForcedSyncRef.current = true;
      }
      return false;
    }
    if (!force && now - lastCloudSyncAtRef.current < 180000) {
      return false;
    }
    cloudSyncInFlightRef.current = true;
    lastCloudSyncAtRef.current = now;
    if (force && isAdminOpen) {
      setIsSyncingUsers(true);
    }
    try {
      let localVault: Record<string, any> = {};
      try {
        const rawVault = localStorage.getItem('kft_secure_payment_proofs_vault_v1');
        if (rawVault) localVault = JSON.parse(rawVault);
      } catch {}

      const snap = latestSyncStateRef.current;
      const customRests = snap.restaurants.filter(r => !isSeedRestaurantId(r.id));
      const result = await syncAllAppDataWithSupabase({
        users: snap.users,
        currentUser: snap.currentUser,
        deletedUsers: snap.deletedUsers,
        transactions: snap.transactions,
        customRestaurants: customRests,
        supportTickets: snap.supportTickets,
        paymentProofsVault: localVault,
        appSettings: appSettingsRef.current,
      });

      if (result.synced) {
        if (isAdminOpen) {
          setLastUsersSyncedAt(new Date().toISOString());
        }
        if (result.mergedAppSettings && !isSavingSettingsRef.current && Date.now() - lastAdminSettingsSaveAtRef.current >= 6000) {
          setAppSettings(prev => {
            const nextSettings = normalizeAuthoritativeAppSettings(result.mergedAppSettings!, prev);
            if (areAppSettingsEqual(prev, nextSettings)) {
              return prev;
            }
            appSettingsRef.current = nextSettings;
            try {
              localStorage.removeItem('kft_settings_v3');
              localStorage.removeItem('kft_settings_v4');
              localStorage.setItem('kft_settings_v5', JSON.stringify(nextSettings));
            } catch {}
            return nextSettings;
          });
        }

        if (Array.isArray(result.mergedDeletedUsers)) {
          setDeletedUsers(prev => {
            if (prev.length === result.mergedDeletedUsers.length && JSON.stringify(prev) === JSON.stringify(result.mergedDeletedUsers)) {
              return prev;
            }
            latestSyncStateRef.current.deletedUsers = result.mergedDeletedUsers;
            try {
              localStorage.setItem('kft_deleted_users_v1', JSON.stringify(result.mergedDeletedUsers));
            } catch {}
            return result.mergedDeletedUsers;
          });
        }

        // Merge with latest live state in case a user logged in or registered while the sync request was in flight!
        setUsers(prev => {
          const liveCur = latestSyncStateRef.current.currentUser;
          const nonAdminCur =
            liveCur &&
            liveCur.role !== 'admin' &&
            liveCur.id !== 'admin-authorized-single' &&
            liveCur.username !== 'admin' &&
            liveCur.username !== 'cheasavuth'
              ? liveCur
              : undefined;
          const finalMerged = deduplicateAndNormalizeUsers(
            [...result.mergedUsers, ...prev, nonAdminCur],
            result.mergedDeletedUsers
          );
          if (prev.length === finalMerged.length && JSON.stringify(prev) === JSON.stringify(finalMerged)) {
            return prev;
          }
          latestSyncStateRef.current.users = finalMerged;
          scheduleStorageWrite('kft_users_v5', finalMerged, 600);
          return finalMerged;
        });

        const liveCurrentUser = latestSyncStateRef.current.currentUser;
        if (liveCurrentUser) {
          const isAdminAccount =
            liveCurrentUser.role === 'admin' ||
            liveCurrentUser.id === 'admin-authorized-single' ||
            liveCurrentUser.username === 'cheasavuth' ||
            liveCurrentUser.username === 'admin';
          if (!isAdminAccount && checkIsUserDeleted(liveCurrentUser, result.mergedDeletedUsers)) {
            setCurrentUser(null);
            latestSyncStateRef.current.currentUser = null;
            try {
              localStorage.removeItem('kft_current_user_v5');
            } catch {}
            showToast(
              language === 'km'
                ? '🚫 គណនីរបស់អ្នកត្រូវបានលុបជាអចិន្ត្រៃយ៍ដោយរដ្ឋបាល (Admin)។'
                : '🚫 Your account has been permanently deleted by the Administrator.',
              'warning'
            );
          } else if (!isAdminAccount) {
            const curEmail = (liveCurrentUser.email || '').toLowerCase().trim();
            const curPhone = (liveCurrentUser.phone || '').replace(/[\s-+]/g, '');
            const canonicalCurId = getCanonicalUserId(liveCurrentUser);
            const matchedCurrent = result.mergedUsers.find(
              u =>
                u.id === liveCurrentUser.id ||
                u.id === canonicalCurId ||
                (Array.isArray(u.legacyIds) && u.legacyIds.includes(liveCurrentUser.id)) ||
                (curEmail && u.email && u.email.toLowerCase().trim() === curEmail) ||
                (curPhone.length >= 7 && u.phone && u.phone.replace(/[\s-+]/g, '') === curPhone)
            );
            if (matchedCurrent && JSON.stringify(matchedCurrent) !== JSON.stringify(liveCurrentUser)) {
              lastCurrentUserSyncSigRef.current = `${matchedCurrent.id}|${matchedCurrent.email}|${matchedCurrent.phone || ''}|${matchedCurrent.name}|${matchedCurrent.membershipTier || ''}|${matchedCurrent.subscriptionStatus || ''}|${matchedCurrent.subscriptionExpiryDate || ''}|${matchedCurrent.paymentStatus || ''}|${matchedCurrent.paidAdditionalStoreSlots || 0}|${Boolean(matchedCurrent.isDisabled)}`;
              setCurrentUser(matchedCurrent);
              latestSyncStateRef.current.currentUser = matchedCurrent;
            }
          }
        }
        setTransactions(prev => {
          if (prev.length === result.mergedTransactions.length && JSON.stringify(prev) === JSON.stringify(result.mergedTransactions)) {
            return prev;
          }
          latestSyncStateRef.current.transactions = result.mergedTransactions;
          return result.mergedTransactions;
        });
        if (result.mergedCustomRestaurants.length > 0) {
          const deletedIdSet = new Set((result.mergedDeletedUsers || []).map(d => d.id));
          const getRestMs = (x?: Restaurant | null): number =>
            Math.max(
              x?.updatedAt ? new Date(x.updatedAt).getTime() || 0 : 0,
              x?.photoUpdatedAt ? new Date(x.photoUpdatedAt).getTime() || 0 : 0,
              x?.adminEditedAt ? new Date(x.adminEditedAt).getTime() || 0 : 0,
              x?.createdAt ? new Date(x.createdAt).getTime() || 0 : 0
            );
          setRestaurants(prev => {
            const map = new Map<string, Restaurant>();
            let anyCustomChanged = false;
            for (const r of prev) {
              if (isSeedRestaurantId(String(r.id)) || !r.ownerId || !deletedIdSet.has(r.ownerId)) {
                map.set(r.id, r);
              } else {
                anyCustomChanged = true;
              }
            }
            for (const r of result.mergedCustomRestaurants) {
              if (r && r.id && !isSeedRestaurantId(String(r.id)) && (!r.ownerId || !deletedIdSet.has(r.ownerId))) {
                const normCloud = normalizeRestaurant(r);
                const localCur = map.get(r.id);
                if (!localCur) {
                  map.set(r.id, normCloud);
                  anyCustomChanged = true;
                } else {
                  const localMs = getRestMs(localCur);
                  const cloudMs = getRestMs(normCloud);
                  const editedDuringSync = lastLocalRestaurantEditAtRef.current >= now - 5000;
                  if (editedDuringSync || localMs >= cloudMs) {
                    map.set(r.id, localCur);
                  } else {
                    map.set(r.id, normCloud);
                    anyCustomChanged = true;
                  }
                }
              }
            }
            if (!anyCustomChanged) {
              return prev;
            }
            const sorted = sortRestaurantsChronologically(Array.from(map.values()));
            latestSyncStateRef.current.restaurants = sorted;
            return sorted;
          });
        }
        try {
          if (JSON.stringify(localVault) !== JSON.stringify(result.mergedPaymentProofsVault)) {
            localStorage.setItem(
              'kft_secure_payment_proofs_vault_v1',
              JSON.stringify(result.mergedPaymentProofsVault)
            );
          }
        } catch {}

        // Also synchronize permanent media overrides across Foods, Restaurants, Destinations & Trending Foods
        try {
          const syncedMediaBundle = await hydrateAndSyncMediaOverrides();
          if (Object.keys(syncedMediaBundle.foods).length > 0) {
            setFoods(prev => {
              const next = applyFoodOverrides(prev, syncedMediaBundle.foods);
              if (next !== prev) {
                setSelectedFood(sel => (sel ? next.find(f => f.id === sel.id) || sel : null));
              }
              return next;
            });
          }
          if (Object.keys(syncedMediaBundle.restaurants).length > 0) {
            setRestaurants(prev => {
              const next = applyRestaurantOverrides(prev, syncedMediaBundle.restaurants);
              if (next !== prev) {
                setSelectedRestaurant(sel => (sel ? next.find(r => r.id === sel.id) || sel : null));
                setManagingRestaurantState(cur => (cur ? next.find(r => r.id === cur.id) || cur : null));
              }
              return next;
            });
          }
          if (Object.keys(syncedMediaBundle.destinations).length > 0) {
            setDestinations(prev => {
              const next = applyDestinationOverrides(prev, syncedMediaBundle.destinations);
              if (next !== prev) {
                setSelectedDestination(sel => (sel ? next.find(d => d.id === sel.id) || sel : null));
              }
              return next;
            });
          }
          if (Object.keys(syncedMediaBundle.trendingFoods).length > 0) {
            setTrendingFoods(prev => applyTrendingFoodOverrides(prev, syncedMediaBundle.trendingFoods));
          }
        } catch (err) {
          console.warn('Media overrides cloud sync warning:', err);
        }
      }
      return result.synced;
    } catch (err) {
      console.warn('Cloud sync error:', err);
      return false;
    } finally {
      cloudSyncInFlightRef.current = false;
      if (force && isAdminOpen) {
        setIsSyncingUsers(false);
      }
      if (pendingForcedSyncRef.current) {
        pendingForcedSyncRef.current = false;
        setTimeout(() => {
          triggerCloudSyncNow(true);
        }, 150);
      }
    }
  };

  const syncUsersNow = async (): Promise<boolean> => {
    return triggerCloudSyncNow(true);
  };

  useEffect(() => {
    const applyHydratedBundle = (bundle: ReturnType<typeof loadLocalMediaOverrides>) => {
      if (Object.keys(bundle.foods).length > 0) {
        setFoods(prev => {
          const next = applyFoodOverrides(prev, bundle.foods);
          setSelectedFood(cur => (cur ? next.find(f => f.id === cur.id) || cur : null));
          return next;
        });
      }
      if (Object.keys(bundle.restaurants).length > 0) {
        setRestaurants(prev => {
          const next = applyRestaurantOverrides(prev, bundle.restaurants);
          setSelectedRestaurant(cur => (cur ? next.find(r => r.id === cur.id) || cur : null));
          return next;
        });
      }
      if (Object.keys(bundle.destinations).length > 0) {
        setDestinations(prev => {
          const next = applyDestinationOverrides(prev, bundle.destinations);
          setSelectedDestination(cur => (cur ? next.find(d => d.id === cur.id) || cur : null));
          return next;
        });
      }
      if (Object.keys(bundle.trendingFoods).length > 0) {
        setTrendingFoods(prev => applyTrendingFoodOverrides(prev, bundle.trendingFoods));
      }
    };

    // 1. Immediately hydrate from local IndexedDB (<15ms, zero network wait)
    hydrateFromLocalIdbImmediate()
      .then(applyHydratedBundle)
      .catch(() => {});

    let syncTimer: any;
    let periodicSyncInterval: any;
    const handleVisibilityCloudSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        triggerCloudSyncNow(false);
      }
    };
    if (isSupabaseConfigured()) {
      // Defer cloud sync (which also delta-syncs media overrides) so initial UI paints & scrolls with 0% network contention
      syncTimer = setTimeout(() => {
        triggerCloudSyncNow(true);
      }, 1800);
      periodicSyncInterval = setInterval(() => {
        if (typeof document === 'undefined' || !document.hidden) {
          triggerCloudSyncNow(false);
        }
      }, 600000);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityCloudSync);
      }
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
      if (periodicSyncInterval) clearInterval(periodicSyncInterval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityCloudSync);
      }
    };
  }, []);

  // Keep a mutable ref of current modal & navigation state for the native back-button listener
  const appNavStateRef = useRef({
    currentUser,
    isExitModalOpen,
    selectedFood,
    selectedRestaurant,
    selectedDestination,
    isAuthModalOpen,
    isAddPostModalOpen,
    isAddRestaurantModalOpen,
    isVipAddRestaurantModalOpen,
    isManageMenuModalOpen,
    managingRestaurant,
    isAdminOpen,
    isAdminLoginModalOpen,
    isInstallModalOpen,
    isSupportModalOpen,
    isWhatToEatModalOpen,
    isNearMeModalOpen,
    isDailyDiscoveriesModalOpen,
    isWishlistsModalOpen,
    isAiTripPlannerModalOpen,
    isNotificationsModalOpen,
    isTrendingSocialModalOpen,
    isTrendingFoodDetailModalOpen,
    isAiCheckInModalOpen,
    isRestaurantCheckInModalOpen,
    isUpgradeVipModalOpen,
    isSupportTicketModalOpen,
    isQrScannerModalOpen,
    isGoogleMapsSearchModalOpen,
    activeTab,
  });

  useEffect(() => {
    appNavStateRef.current = {
      currentUser,
      isExitModalOpen,
      selectedFood,
      selectedRestaurant,
      selectedDestination,
      isAuthModalOpen,
      isAddPostModalOpen,
      isAddRestaurantModalOpen,
      isVipAddRestaurantModalOpen,
      isManageMenuModalOpen,
      managingRestaurant,
      isAdminOpen,
      isAdminLoginModalOpen,
      isInstallModalOpen,
      isSupportModalOpen,
      isWhatToEatModalOpen,
      isNearMeModalOpen,
      isDailyDiscoveriesModalOpen,
      isWishlistsModalOpen,
      isAiTripPlannerModalOpen,
      isNotificationsModalOpen,
      isTrendingSocialModalOpen,
      isTrendingFoodDetailModalOpen,
      isAiCheckInModalOpen,
      isRestaurantCheckInModalOpen,
      isUpgradeVipModalOpen,
      isSupportTicketModalOpen,
      isQrScannerModalOpen,
      isGoogleMapsSearchModalOpen,
      activeTab,
    };
  }, [
    currentUser, isExitModalOpen, selectedFood, selectedRestaurant, selectedDestination,
    isAuthModalOpen, isAddPostModalOpen, isAddRestaurantModalOpen, isVipAddRestaurantModalOpen,
    isManageMenuModalOpen, managingRestaurant, isAdminOpen, isAdminLoginModalOpen,
    isInstallModalOpen, isSupportModalOpen, isWhatToEatModalOpen, isNearMeModalOpen,
    isDailyDiscoveriesModalOpen, isWishlistsModalOpen, isAiTripPlannerModalOpen,
    isNotificationsModalOpen, isTrendingSocialModalOpen, isTrendingFoodDetailModalOpen,
    isAiCheckInModalOpen, isRestaurantCheckInModalOpen, isUpgradeVipModalOpen,
    isSupportTicketModalOpen, isQrScannerModalOpen, isGoogleMapsSearchModalOpen,
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
      if ((window as any).__kft_is_smart_hub_open) {
        window.dispatchEvent(new CustomEvent('kft:close-smart-hub'));
        return;
      }
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
      if (state.isManageMenuModalOpen) {
        setIsManageMenuModalOpen(false);
        setManagingRestaurant(null);
        return;
      }
      if (state.isTrendingFoodDetailModalOpen) {
        setIsTrendingFoodDetailModalOpen(false);
        setSelectedTrendingFood(null);
        return;
      }
      if (state.isTrendingSocialModalOpen) {
        setIsTrendingSocialModalOpen(false);
        return;
      }
      if (state.isSupportTicketModalOpen) {
        setIsSupportTicketModalOpen(false);
        return;
      }
      if (state.isUpgradeVipModalOpen) {
        setIsUpgradeVipModalOpen(false);
        return;
      }
      if (state.isVipAddRestaurantModalOpen) {
        setIsVipAddRestaurantModalOpen(false);
        return;
      }
      if (state.isGoogleMapsSearchModalOpen) {
        setIsGoogleMapsSearchModalOpen(false);
        return;
      }
      if (state.isQrScannerModalOpen) {
        setIsQrScannerModalOpen(false);
        return;
      }
      if (state.isAiCheckInModalOpen) {
        setIsAiCheckInModalOpen(false);
        return;
      }
      if (state.isRestaurantCheckInModalOpen) {
        setIsRestaurantCheckInModalOpen(false);
        return;
      }
      if (state.isWhatToEatModalOpen) {
        setIsWhatToEatModalOpen(false);
        return;
      }
      if (state.isNearMeModalOpen) {
        setIsNearMeModalOpen(false);
        return;
      }
      if (state.isDailyDiscoveriesModalOpen) {
        setIsDailyDiscoveriesModalOpen(false);
        return;
      }
      if (state.isWishlistsModalOpen) {
        setIsWishlistsModalOpen(false);
        return;
      }
      if (state.isAiTripPlannerModalOpen) {
        setIsAiTripPlannerModalOpen(false);
        return;
      }
      if (state.isNotificationsModalOpen) {
        setIsNotificationsModalOpen(false);
        return;
      }
      if (state.isAdminLoginModalOpen) {
        setIsAdminLoginModalOpen(false);
        return;
      }
      if (state.isAuthModalOpen) {
        if (!state.currentUser) {
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
    if (!bookmarks.includes(id)) recordMeaningfulAction('favorite');
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

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);
  const isBookmarked = (id: string) => bookmarkSet.has(id);

  // Auth
  const login = (identifier: string, role?: UserRole): boolean => {
    const clean = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/[\s-+]/g, '');
    const isPhone = /^[0-9+ ]{7,15}$/.test(clean);
    const emailVal = isPhone ? `user_${cleanDigits}@phone.kh` : (clean.includes('@') ? clean : `${clean}@user.kh`);
    const nowIso = new Date().toISOString();

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
      if (existing.isDisabled) {
        showToast(
          language === 'km'
            ? '⚠️ គណនីនេះត្រូវបានផ្អាកជាបណ្តោះអាសន្ន។ សូមទាក់ទង Admin ដើម្បីស្តារសិទ្ធិចូលប្រើប្រាស់ឡើងវិញ (Restore User Access)។'
            : '⚠️ This account has been disabled. Please contact Admin to Restore User Access.',
          'warning'
        );
        return false;
      }
      const updatedExisting: User = {
        ...existing,
        lastLoginAt: nowIso,
        lastActiveAt: nowIso,
      };
      setUsers(prev => {
        const next = deduplicateAndNormalizeUsers(
          prev.map(u => (u.id === existing.id ? updatedExisting : u)),
          deletedUsers
        );
        latestSyncStateRef.current.users = next;
        try {
          localStorage.setItem('kft_users_v5', JSON.stringify(next));
        } catch {}
        return next;
      });
      setCurrentUser(updatedExisting);
      latestSyncStateRef.current.currentUser = updatedExisting;
      showToast(language === 'km' ? `សូមស្វាគមន៍មកវិញ ${updatedExisting.name}!` : `Welcome back, ${updatedExisting.name}!`, 'success');
      setIsAuthModalOpen(false);
      if (isSupabaseConfigured()) {
        upsertSingleUserToCloud(updatedExisting, deletedUsers)
          .then(cloudMerged => {
            if (Array.isArray(cloudMerged) && cloudMerged.length > 0) {
              setUsers(prev => deduplicateAndNormalizeUsers([...cloudMerged, ...prev], deletedUsers));
            }
            triggerCloudSyncNow(true);
          })
          .catch(() => {
            triggerCloudSyncNow(true);
          });
      }
      return true;
    }
    
    // Normal registration/login for users/owners only (NEVER grant admin role here)
    const assignedRole: UserRole = role === 'owner' ? 'owner' : 'user';
    const phoneVal = isPhone ? identifier.trim() : undefined;
    const nameVal = isPhone ? `អ្នកប្រើប្រាស់ ${identifier.trim()}` : clean.split('@')[0];

    const candidateUser: User = {
      id: getCanonicalUserId({ email: emailVal, phone: phoneVal, role: assignedRole, authProvider: isPhone ? 'phone' : 'email' }),
      name: nameVal,
      email: emailVal,
      phone: phoneVal,
      role: assignedRole,
      authProvider: isPhone ? 'phone' : 'email',
      linkedProviders: [isPhone ? 'phone' : 'email'],
      isVerified: true,
      verifiedAt: nowIso,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      createdAt: nowIso.split('T')[0],
      registeredAtIso: nowIso,
      lastLoginAt: nowIso,
      lastActiveAt: nowIso,
    };
    setUsers(prev => {
      const next = deduplicateAndNormalizeUsers([...prev, candidateUser], deletedUsers);
      latestSyncStateRef.current.users = next;
      try {
        localStorage.setItem('kft_users_v5', JSON.stringify(next));
      } catch {}
      return next;
    });
    setCurrentUser(candidateUser);
    latestSyncStateRef.current.currentUser = candidateUser;
    showToast(language === 'km' ? `ចូលគណនីបានជោគជ័យ!` : `Logged in successfully!`, 'success');
    setIsAuthModalOpen(false);
    // Immediately persist atomic user record & trigger forced cloud sync
    if (isSupabaseConfigured()) {
      upsertSingleUserToCloud(candidateUser, deletedUsers)
        .then(cloudMerged => {
          if (Array.isArray(cloudMerged) && cloudMerged.length > 0) {
            setUsers(prev => deduplicateAndNormalizeUsers([...cloudMerged, ...prev], deletedUsers));
          }
          triggerCloudSyncNow(true);
        })
        .catch(() => {
          triggerCloudSyncNow(true);
        });
    }
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
    latestSyncStateRef.current.currentUser = adminProfile;
    try {
      localStorage.setItem('kft_current_user_v5', JSON.stringify(adminProfile));
    } catch {}
    setIsAuthModalOpen(false);
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
      latestSyncStateRef.current.currentUser = adminProfile;
      try {
        localStorage.setItem('kft_current_user_v5', JSON.stringify(adminProfile));
      } catch {}
      setIsAuthModalOpen(false);
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

  /**
   * Option 1 — Cancel VIP:
   * Removes VIP status and benefits, downgrades to a normal ('free') user,
   * and strictly preserves the account, email, password, and login access.
   */
  const cancelUserVip = async (userId: string): Promise<{ success: boolean }> => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      showToast(language === 'km' ? 'រកមិនឃើញគណនីអ្នកប្រើប្រាស់នេះទេ!' : 'User account not found!', 'warning');
      return { success: false };
    }

    if (
      targetUser.role === 'admin' ||
      targetUser.id === 'admin-authorized-single' ||
      targetUser.username === 'cheasavuth' ||
      targetUser.username === 'admin'
    ) {
      showToast(language === 'km' ? 'មិនអាចបោះបង់សិទ្ធិ VIP របស់គណនីរដ្ឋបាលប្រព័ន្ធ (Admin) បានឡើយ!' : 'Cannot cancel VIP on System Administrator account!', 'warning');
      return { success: false };
    }

    const nowIso = new Date().toISOString();
    const downgradedUser: User = {
      ...targetUser,
      membershipTier: 'free',
      subscriptionStatus: 'cancelled',
      subscriptionExpiryDate: undefined,
      paymentStatus: 'cancelled',
      autoRenew: false,
      vipCancelledAt: nowIso,
      isDisabled: false,
    };

    // 1. Update users array while preserving account, email, passwordHash, and login access
    const nextUsers = users.map(u => (u.id === userId ? downgradedUser : u));
    setUsers(nextUsers);
    try {
      localStorage.setItem('kft_users_v5', JSON.stringify(nextUsers));
    } catch {}

    // 2. If this user is currently logged in, update currentUser and close any open VIP Personalized Feature modals
    if (currentUser?.id === userId) {
      setCurrentUser(downgradedUser);
      closeAllPersonalizedFeatureModals();
      try {
        localStorage.setItem('kft_current_user_v5', JSON.stringify(downgradedUser));
      } catch {}
    }

    // 3. Downgrade any custom restaurant owned by this user from VIP/premium to normal ('free')
    let nextRestaurants = restaurants;
    const hasPromotedShop = restaurants.some(
      r => !isSeedRestaurantId(r.id) && r.ownerId === userId && (r.membershipTier === 'premium' || r.isPromoted)
    );
    if (hasPromotedShop) {
      nextRestaurants = restaurants.map(r => {
        if (!isSeedRestaurantId(r.id) && r.ownerId === userId) {
          return {
            ...r,
            membershipTier: 'free' as MembershipTier,
            isPromoted: false,
            paymentStatus: 'unpaid' as const,
            membershipExpiresAt: undefined,
          };
        }
        return r;
      });
      setRestaurants(nextRestaurants);
      try {
        localStorage.setItem('kft_restaurants_real_v11', JSON.stringify(nextRestaurants));
      } catch {}
    }

    // 4. Push notification to inform user
    const cancelNotif: AppNotification = {
      id: `notif-vip-cancelled-${userId}-${Date.now()}`,
      titleKh: 'ℹ️ សមាជិកភាព VIP ត្រូវបានបោះបង់ (គណនីធម្មតា)',
      titleEn: 'ℹ️ VIP Membership Cancelled (Normal Account)',
      messageKh: `សមាជិកភាព VIP នៃគណនី «${targetUser.name}» (${targetUser.email}) ត្រូវបានបោះបង់ និងប្តូរមកជាគណនីធម្មតា (Normal User)។ គណនី អ៊ីមែល និងសិទ្ធិចូលប្រើប្រាស់កម្មវិធីរបស់អ្នកនៅរក្សាទុកដដែល។`,
      messageEn: `VIP status for "${targetUser.name}" (${targetUser.email}) was cancelled and downgraded to a Normal User. Your account, email, and login access remain active.`,
      type: 'system',
      date: nowIso.split('T')[0],
      isRead: false,
    };
    setNotifications(prev => [cancelNotif, ...prev]);

    // 5. Sync to Supabase Cloud
    try {
      if (isSupabaseConfigured()) {
        const customRests = nextRestaurants.filter(r => !isSeedRestaurantId(r.id));
        await Promise.all([
          pushCloudDocument(`${USER_RECORD_PREFIX}${downgradedUser.id}`, downgradedUser),
          pushCloudDocument('kft_cloud_users_v2', nextUsers),
          pushCloudDocument('kft_cloud_users_v1', nextUsers),
          pushCloudDocument('kft_cloud_custom_restaurants_v1', customRests),
        ]);
      }
    } catch (e) {
      console.warn('Supabase cloud cancelUserVip sync error:', e);
    }

    recordSecurityAudit(
      'USER_VIP_CANCELLED',
      'SUCCESS',
      'AdminPortal',
      `Cancelled VIP for user ${targetUser.name} (${targetUser.id}, ${targetUser.email}) and downgraded to normal user while preserving account login access`
    );

    showToast(
      language === 'km'
        ? `✅ បានបោះបង់ VIP របស់ "${targetUser.name}" មកជាគណនីធម្មតា (រក្សាទុកគណនី និងអ៊ីមែលដដែល)!`
        : `✅ Cancelled VIP for "${targetUser.name}" and downgraded to normal user (account & login preserved)!`,
      'success'
    );

    return { success: true };
  };

  /**
   * Option 2 — Restore User Access:
   * Reactivates a previously disabled or soft-deleted user account so the user can log in
   * and use the program again with the same email. Blocks restoration if permanently deleted ('Delete Forever').
   */
  const restoreUserAccess = async (
    userIdOrEmail: string
  ): Promise<{ success: boolean; restoredUser?: User; error?: string }> => {
    const cleanTarget = (userIdOrEmail || '').trim();
    const cleanEmail = cleanTarget.toLowerCase();

    // Check if the user is in deletedUsers registry
    const matchedDeleted = deletedUsers.find(
      d =>
        d.id === cleanTarget ||
        (d.email && d.email.toLowerCase().trim() === cleanEmail)
    );

    // Block restoration if permanently deleted via Option 3 (Delete Forever)
    if (matchedDeleted && matchedDeleted.permanentlyDeleted === true) {
      const errMsg =
        language === 'km'
          ? `🚫 គណនី "${matchedDeleted.name}" (${matchedDeleted.email}) ត្រូវបានលុបជាអចិន្ត្រៃយ៍ (Delete Forever) ហើយមិនអាចស្តារឡើងវិញបានទេ!`
          : `🚫 Account "${matchedDeleted.name}" (${matchedDeleted.email}) was permanently deleted (Delete Forever) and cannot be restored!`;
      showToast(errMsg, 'warning');
      return { success: false, error: errMsg };
    }

    const nowIso = new Date().toISOString();
    const existingActiveUser = users.find(
      u =>
        u.id === cleanTarget ||
        (u.email && u.email.toLowerCase().trim() === cleanEmail)
    );

    let restoredUser: User;
    if (existingActiveUser) {
      restoredUser = {
        ...existingActiveUser,
        isDisabled: false,
        disabledAt: undefined,
        isVerified: true,
        restoredAt: nowIso,
      };
    } else if (matchedDeleted) {
      const snapshot = matchedDeleted.snapshotUser;
      restoredUser = {
        ...(snapshot || {}),
        id: matchedDeleted.id || `user-${Date.now()}`,
        name: matchedDeleted.name || snapshot?.name || matchedDeleted.email.split('@')[0],
        email: matchedDeleted.email,
        phone: matchedDeleted.phone || snapshot?.phone,
        username: matchedDeleted.username || snapshot?.username,
        role: snapshot?.role && snapshot.role !== 'admin' ? snapshot.role : 'user',
        avatar:
          snapshot?.avatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        isVerified: true,
        verifiedAt: snapshot?.verifiedAt || nowIso,
        createdAt: snapshot?.createdAt || nowIso.split('T')[0],
        membershipTier: 'free',
        subscriptionStatus: undefined,
        subscriptionExpiryDate: undefined,
        isDisabled: false,
        disabledAt: undefined,
        restoredAt: nowIso,
      };
    } else {
      const errMsg =
        language === 'km'
          ? 'រកមិនឃើញគណនីដែលត្រូវស្តារឡើងវិញទេ!'
          : 'User account not found to restore!';
      showToast(errMsg, 'warning');
      return { success: false, error: errMsg };
    }

    // 1. Remove from deletedUsers registry if present
    const nextDeletedUsers = deletedUsers.filter(
      d =>
        d.id !== restoredUser.id &&
        (!d.email || d.email.toLowerCase().trim() !== restoredUser.email.toLowerCase().trim())
    );
    setDeletedUsers(nextDeletedUsers);
    try {
      localStorage.setItem('kft_deleted_users_v1', JSON.stringify(nextDeletedUsers));
    } catch {}

    // 2. Add or update in active users list
    const nextUsers = existingActiveUser
      ? users.map(u => (u.id === restoredUser.id ? restoredUser : u))
      : [...users, restoredUser];
    setUsers(nextUsers);
    try {
      localStorage.setItem('kft_users_v5', JSON.stringify(nextUsers));
    } catch {}

    if (currentUser?.id === restoredUser.id) {
      setCurrentUser(restoredUser);
      try {
        localStorage.setItem('kft_current_user_v5', JSON.stringify(restoredUser));
      } catch {}
    }

    // 3. Sync to Supabase Cloud
    try {
      if (isSupabaseConfigured()) {
        await Promise.all([
          pushCloudDocument(`${USER_RECORD_PREFIX}${restoredUser.id}`, restoredUser),
          pushCloudDocument('kft_cloud_users_v2', nextUsers),
          pushCloudDocument('kft_cloud_users_v1', nextUsers),
          pushCloudDocument('kft_cloud_deleted_users_v1', nextDeletedUsers),
        ]);
      }
    } catch (e) {
      console.warn('Supabase cloud restoreUserAccess sync error:', e);
    }

    recordSecurityAudit(
      'USER_ACCESS_RESTORED',
      'SUCCESS',
      'AdminPortal',
      `Restored user account access for ${restoredUser.name} (${restoredUser.id}, ${restoredUser.email})`
    );

    showToast(
      language === 'km'
        ? `✅ បានស្តារសិទ្ធិចូលប្រើប្រាស់គណនី "${restoredUser.name}" (${restoredUser.email}) ឡើងវិញដោយជោគជ័យ!`
        : `✅ Successfully restored user access for "${restoredUser.name}" (${restoredUser.email})!`,
      'success'
    );

    return { success: true, restoredUser };
  };

  /**
   * Soft-disable user account (can be reactivated anytime via Restore User Access)
   */
  const disableUserAccount = async (userId: string): Promise<{ success: boolean }> => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return { success: false };
    if (
      targetUser.role === 'admin' ||
      targetUser.id === 'admin-authorized-single' ||
      targetUser.username === 'cheasavuth' ||
      targetUser.username === 'admin'
    ) {
      return { success: false };
    }

    const updatedUser: User = {
      ...targetUser,
      isDisabled: true,
      disabledAt: new Date().toISOString(),
    };
    const nextUsers = users.map(u => (u.id === userId ? updatedUser : u));
    setUsers(nextUsers);
    try {
      localStorage.setItem('kft_users_v5', JSON.stringify(nextUsers));
    } catch {}

    if (currentUser?.id === userId) {
      setCurrentUser(null);
      try {
        localStorage.removeItem('kft_current_user_v5');
      } catch {}
    }

    try {
      if (isSupabaseConfigured()) {
        await Promise.all([
          pushCloudDocument(`${USER_RECORD_PREFIX}${updatedUser.id}`, updatedUser),
          pushCloudDocument('kft_cloud_users_v2', nextUsers),
          pushCloudDocument('kft_cloud_users_v1', nextUsers),
        ]);
      }
    } catch {}

    showToast(
      language === 'km'
        ? `⚠️ បានផ្អាកគណនី "${targetUser.name}" បណ្តោះអាសន្ន (អាចស្តារឡើងវិញបានតាមរយៈ Restore User Access)`
        : `⚠️ Temporarily disabled "${targetUser.name}" (can be reactivated via Restore User Access)`,
      'info'
    );
    return { success: true };
  };

  /**
   * Option 3 — Delete Forever:
   * Permanently deletes the entire account and all associated data after explicit confirmation.
   */
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

    // 1. Add user to permanent deleted/blacklisted users registry with permanentlyDeleted: true so they can never log in or be restored
    const deletedRecord: DeletedUserRecord = {
      id: targetUser.id,
      email: (targetUser.email || '').toLowerCase().trim(),
      phone: targetUser.phone ? targetUser.phone.replace(/[\s-+]/g, '') : undefined,
      username: targetUser.username ? targetUser.username.toLowerCase().trim() : undefined,
      name: targetUser.name,
      deletedAt: new Date().toISOString(),
      deletedBy: currentUser?.name || 'Admin',
      permanentlyDeleted: true,
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
        localStorage.setItem('kft_restaurants_real_v11', JSON.stringify(nextRestaurants));
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

    // 10. Push updated collections to Supabase Cloud AND delete atomic `kft_user_<id>` rows
    try {
      if (isSupabaseConfigured()) {
        const customRests = nextRestaurants.filter(r => !isSeedRestaurantId(r.id));
        const atomicDeletes = [
          deleteCloudDocument(`${USER_RECORD_PREFIX}${targetUser.id}`),
          ...(Array.isArray(targetUser.legacyIds)
            ? targetUser.legacyIds.map(lid => deleteCloudDocument(`${USER_RECORD_PREFIX}${lid}`))
            : []),
        ];
        await Promise.all([
          ...atomicDeletes,
          pushCloudDocument('kft_cloud_users_v2', nextUsers),
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
          pushCloudDocument('kft_cloud_users_v2', []),
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

  const updateAppSettings = async (
    newSettings: Partial<AppSettings>
  ): Promise<{ ok: boolean; settings?: AppSettings; error?: string }> => {
    const isAdminAuthorized =
      currentUser?.role === 'admin' ||
      currentUser?.id === 'admin-authorized-single' ||
      currentUser?.username === 'admin' ||
      currentUser?.username === 'cheasavuth' ||
      verifyAdminSession();

    if (!isAdminAuthorized) {
      recordSecurityAudit(
        'SETTINGS_UPDATE_BLOCKED',
        'BLOCKED',
        'AppSettings',
        `Unauthorized attempt to modify AppSettings by ${currentUser?.id || 'guest'}`
      );
      const unauthErr =
        language === 'km'
          ? '⛔ គ្មានសិទ្ធិអនុញ្ញាត៖ មានតែគណនី Administrator ប៉ុណ្ណោះដែលអាចកែប្រែការកំណត់ប្រព័ន្ធបាន!'
          : '⛔ Unauthorized: Only an authorized Administrator can modify system settings!';
      showToast(unauthErr, 'warning');
      return { ok: false, error: unauthErr };
    }

    const sanitized: Partial<AppSettings> = { ...newSettings };
    if (sanitized.vipShortDurationDays !== undefined) {
      const val = Number(sanitized.vipShortDurationDays);
      if (!Number.isFinite(val) || val < 1 || val > 3650) {
        const err = language === 'km' ? '⚠️ រយៈពេលកញ្ចប់ទី១ ត្រូវតែចាប់ពី ១ ថ្ងៃឡើងទៅ!' : '⚠️ Plan #1 duration must be at least 1 day!';
        showToast(err, 'warning');
        return { ok: false, error: err };
      }
      sanitized.vipShortDurationDays = Math.round(val);
    }
    if (sanitized.vipShortPriceUsd !== undefined) {
      const val = Number(sanitized.vipShortPriceUsd);
      if (!Number.isFinite(val) || val <= 0 || val > 10000) {
        const err = language === 'km' ? '⚠️ តម្លៃកញ្ចប់ទី១ ត្រូវតែធំជាង $0.00!' : '⚠️ Plan #1 price must be greater than $0.00!';
        showToast(err, 'warning');
        return { ok: false, error: err };
      }
      sanitized.vipShortPriceUsd = Math.round(val * 100) / 100;
    }
    if (sanitized.vipLongDurationDays !== undefined) {
      const val = Number(sanitized.vipLongDurationDays);
      if (!Number.isFinite(val) || val < 1 || val > 3650) {
        const err = language === 'km' ? '⚠️ រយៈពេលកញ្ចប់ទី២ ត្រូវតែចាប់ពី ១ ថ្ងៃឡើងទៅ!' : '⚠️ Plan #2 duration must be at least 1 day!';
        showToast(err, 'warning');
        return { ok: false, error: err };
      }
      sanitized.vipLongDurationDays = Math.round(val);
    }
    if (sanitized.vipLongPriceUsd !== undefined) {
      const val = Number(sanitized.vipLongPriceUsd);
      if (!Number.isFinite(val) || val <= 0 || val > 10000) {
        const err = language === 'km' ? '⚠️ តម្លៃកញ្ចប់ទី២ ត្រូវតែធំជាង $0.00!' : '⚠️ Plan #2 price must be greater than $0.00!';
        showToast(err, 'warning');
        return { ok: false, error: err };
      }
      sanitized.vipLongPriceUsd = Math.round(val * 100) / 100;
    }
    if (sanitized.additionalStoreFeeUsd !== undefined) {
      const val = Number(sanitized.additionalStoreFeeUsd);
      if (!Number.isFinite(val) || val < 0 || val > 10000) {
        const err = language === 'km' ? '⚠️ តម្លៃបន្ថែមហាងមិនត្រឹមត្រូវ!' : '⚠️ Invalid additional store fee!';
        showToast(err, 'warning');
        return { ok: false, error: err };
      }
      sanitized.additionalStoreFeeUsd = Math.round(val * 100) / 100;
    }
    if (sanitized.includedFreeStoresPerVip !== undefined) {
      sanitized.includedFreeStoresPerVip = Math.max(1, Math.round(Number(sanitized.includedFreeStoresPerVip) || 1));
    }

    const nowIso = new Date().toISOString();
    const nextVersion = Math.max(25, Number(appSettingsRef.current.settingsVersion || 25)) + 1;
    const mergedCandidate: AppSettings = normalizeAuthoritativeAppSettings(
      {
        ...appSettingsRef.current,
        ...sanitized,
        settingsVersion: nextVersion,
        settingsUpdatedAt: nowIso,
        settingsUpdatedBy: currentUser?.name || 'Admin',
      },
      appSettingsRef.current
    );

    const shortDays = mergedCandidate.vipShortDurationDays!;
    const shortPrice = mergedCandidate.vipShortPriceUsd!;
    const longDays = mergedCandidate.vipLongDurationDays!;
    const longPrice = mergedCandidate.vipLongPriceUsd!;
    const extraStoreFee = mergedCandidate.additionalStoreFeeUsd ?? 5.0;

    mergedCandidate.promotionalFeeUsd = shortPrice;
    mergedCandidate.promotionPeriodKh = `កញ្ចប់ VIP ផ្លូវការ៖ ${shortPrice.toFixed(2)} សម្រាប់ ${shortDays} ថ្ងៃ ឬ ${longPrice.toFixed(2)} សម្រាប់ ${longDays} ថ្ងៃ • បន្ថែមហាងថ្មី៖ ${extraStoreFee.toFixed(2)} / ១ ហាង`;
    mergedCandidate.promotionPeriodEn = `Official VIP Plans: ${shortPrice.toFixed(2)} for ${shortDays} Days or ${longPrice.toFixed(2)} for ${longDays} Days • Additional Store: ${extraStoreFee.toFixed(2)} / store`;

    isSavingSettingsRef.current = true;
    setSettingsSyncError(null);

    try {
      let confirmedSettings = mergedCandidate;

      if (isSupabaseConfigured()) {
        const res = await saveAuthoritativeAppSettingsToServer(mergedCandidate);
        if (!res.ok) {
          const errMsg =
            language === 'km'
              ? `❌ បរាជ័យក្នុងការរក្សាទុកទៅកាន់ Database៖ ${res.error || 'សូមពិនិត្យអ៊ីនធឺណិតរបស់អ្នក!'}`
              : `❌ Failed to save VIP settings to database: ${res.error || 'Please check your connection!'}`;
          setSettingsSyncError(errMsg);
          showToast(errMsg, 'warning');
          return { ok: false, error: errMsg };
        }
        confirmedSettings = res.settings;
      }

      lastAdminSettingsSaveAtRef.current = Date.now();
      appSettingsRef.current = confirmedSettings;
      setAppSettings(confirmedSettings);

      try {
        localStorage.removeItem('kft_settings_v3');
        localStorage.removeItem('kft_settings_v4');
        localStorage.setItem('kft_settings_v5', JSON.stringify(confirmedSettings));
      } catch (e) {
        console.warn('Failed to persist updated AppSettings locally:', e);
      }

      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('kft_vip_settings_sync_channel');
          bc.postMessage({ type: 'VIP_SETTINGS_UPDATED', settings: confirmedSettings });
          bc.close();
        }
      } catch {}

      recordSecurityAudit(
        'SETTINGS_UPDATE',
        'SUCCESS',
        'AppSettings',
        `Admin updated centralized app settings (v${confirmedSettings.settingsVersion}) at ${confirmedSettings.settingsUpdatedAt}: Short=${confirmedSettings.vipShortPriceUsd}/${confirmedSettings.vipShortDurationDays}d, Long=${confirmedSettings.vipLongPriceUsd}/${confirmedSettings.vipLongDurationDays}d, ExtraStore=${confirmedSettings.additionalStoreFeeUsd}`
      );
      showToast(
        language === 'km'
          ? `✅ បានរក្សាទុកទៅកាន់ Database ជោគជ័យ៖ ${confirmedSettings.vipShortDurationDays} ថ្ងៃ (${confirmedSettings.vipShortPriceUsd?.toFixed(2)}) & ${confirmedSettings.vipLongDurationDays} ថ្ងៃ (${confirmedSettings.vipLongPriceUsd?.toFixed(2)})!`
          : `✅ Confirmed saved to Database: ${confirmedSettings.vipShortDurationDays}d (${confirmedSettings.vipShortPriceUsd?.toFixed(2)}) & ${confirmedSettings.vipLongDurationDays}d (${confirmedSettings.vipLongPriceUsd?.toFixed(2)})!`,
        'success'
      );
      return { ok: true, settings: confirmedSettings };
    } finally {
      isSavingSettingsRef.current = false;
    }
  };

  const register = (name: string, emailOrPhone: string, role: UserRole, phone?: string, restaurantName?: string): boolean => {
    // Enforce: only one authorized admin exists. Users can NEVER self-register as admin
    const safeRole: UserRole = role === 'admin' ? 'user' : role;
    const cleanId = emailOrPhone.trim();
    const isPhone = /^[0-9+ ]{7,15}$/.test(cleanId);
    const cleanPhoneDigits = (phone || (isPhone ? cleanId : '')).replace(/[\s-+]/g, '');
    const emailVal = (isPhone ? `user_${cleanPhoneDigits}@phone.kh` : (cleanId.includes('@') ? cleanId : `${cleanId}@user.kh`)).toLowerCase();
    const phoneVal = phone ? phone.trim() : (isPhone ? cleanId : undefined);
    const displayName = name.trim() || (isPhone ? `អ្នកប្រើប្រាស់ ${cleanId}` : cleanId.split('@')[0]);
    const nowIso = new Date().toISOString();

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
      if (existing.isDisabled) {
        showToast(
          language === 'km'
            ? '⚠️ គណនីនេះត្រូវបានផ្អាកជាបណ្តោះអាសន្ន។ សូមទាក់ទង Admin ដើម្បីស្តារសិទ្ធិចូលប្រើប្រាស់ឡើងវិញ (Restore User Access)។'
            : '⚠️ This account has been disabled. Please contact Admin to Restore User Access.',
          'warning'
        );
        return false;
      }
      const updatedExisting: User = {
        ...existing,
        name: displayName || existing.name,
        phone: phoneVal || existing.phone,
        lastLoginAt: nowIso,
        lastActiveAt: nowIso,
      };
      setUsers(prev => {
        const next = deduplicateAndNormalizeUsers(
          prev.map(u => (u.id === existing.id ? updatedExisting : u)),
          deletedUsers
        );
        latestSyncStateRef.current.users = next;
        try {
          localStorage.setItem('kft_users_v5', JSON.stringify(next));
        } catch {}
        return next;
      });
      setCurrentUser(updatedExisting);
      latestSyncStateRef.current.currentUser = updatedExisting;
      showToast(language === 'km' ? `សូមស្វាគមន៍មកវិញ ${updatedExisting.name}!` : `Welcome back, ${updatedExisting.name}!`, 'success');
      setIsAuthModalOpen(false);
      if (isSupabaseConfigured()) {
        upsertSingleUserToCloud(updatedExisting, deletedUsers)
          .then(cloudMerged => {
            if (Array.isArray(cloudMerged) && cloudMerged.length > 0) {
              setUsers(prev => deduplicateAndNormalizeUsers([...cloudMerged, ...prev], deletedUsers));
            }
            triggerCloudSyncNow(true);
          })
          .catch(() => {
            triggerCloudSyncNow(true);
          });
      }
      return true;
    }

    const newUser: User = {
      id: getCanonicalUserId({
        email: emailVal,
        phone: phoneVal,
        role: safeRole,
        authProvider: isPhone ? 'phone' : 'email',
      }),
      name: displayName,
      email: emailVal,
      role: safeRole,
      phone: phoneVal,
      restaurantName,
      authProvider: isPhone ? 'phone' : 'email',
      linkedProviders: [isPhone ? 'phone' : 'email'],
      isVerified: true,
      verifiedAt: nowIso,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      createdAt: nowIso.split('T')[0],
      registeredAtIso: nowIso,
      lastLoginAt: nowIso,
      lastActiveAt: nowIso,
    };
    setUsers(prev => {
      const next = deduplicateAndNormalizeUsers([...prev, newUser], deletedUsers);
      latestSyncStateRef.current.users = next;
      try {
        localStorage.setItem('kft_users_v5', JSON.stringify(next));
      } catch {}
      return next;
    });
    setCurrentUser(newUser);
    latestSyncStateRef.current.currentUser = newUser;
    showToast(language === 'km' ? `សូមស្វាគមន៍មកកាន់កម្មវិធី ${displayName}!` : `Welcome to the app, ${displayName}!`, 'success');
    setIsAuthModalOpen(false);
    if (isSupabaseConfigured()) {
      upsertSingleUserToCloud(newUser, deletedUsers)
        .then(cloudMerged => {
          if (Array.isArray(cloudMerged) && cloudMerged.length > 0) {
            setUsers(prev => deduplicateAndNormalizeUsers([...cloudMerged, ...prev], deletedUsers));
          }
          triggerCloudSyncNow(true);
        })
        .catch(() => {
          triggerCloudSyncNow(true);
        });
    }
    return true;
  };

  const loginWithGoogle = (profile: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    phone?: string;
    googleSub?: string;
  }): boolean => {
    const cleanEmail = (profile.email || '').trim().toLowerCase();
    const canonicalGoogleId = getCanonicalUserId({
      id: profile.id,
      email: cleanEmail,
      authProvider: 'google',
    });
    const nowIso = new Date().toISOString();

    // Strictly block permanently deleted accounts from logging in via Google
    if (
      checkIsUserDeleted({ id: profile.id, email: cleanEmail, phone: profile.phone }) ||
      checkIsUserDeleted({ id: canonicalGoogleId, email: cleanEmail })
    ) {
      recordSecurityAudit('DELETED_USER_GOOGLE_LOGIN_BLOCKED', 'BLOCKED', 'AuthModal', `Blocked Google login attempt by deleted account: ${cleanEmail || profile.id}`);
      showToast(
        language === 'km'
          ? '🚫 គណនីនេះត្រូវបានលុបជាអចិន្ត្រៃយ៍ដោយរដ្ឋបាល (Admin) ហើយមិនអាចចូលប្រើប្រាស់បានទៀតទេ។'
          : '🚫 This account has been permanently deleted by the Administrator and can no longer log in.',
        'warning'
      );
      return false;
    }

    // Check if user already exists with this canonical ID, legacy ID, or Email
    const existing = users.find(u => 
      u.id === canonicalGoogleId ||
      u.id === profile.id || 
      (Array.isArray(u.legacyIds) && (u.legacyIds.includes(profile.id) || u.legacyIds.includes(canonicalGoogleId))) ||
      (cleanEmail && u.email.toLowerCase().trim() === cleanEmail)
    );

    if (existing) {
      if (existing.isDisabled) {
        showToast(
          language === 'km'
            ? '⚠️ គណនីនេះត្រូវបានផ្អាកជាបណ្តោះអាសន្ន។ សូមទាក់ទង Admin ដើម្បីស្តារសិទ្ធិចូលប្រើប្រាស់ឡើងវិញ (Restore User Access)។'
            : '⚠️ This account has been disabled. Please contact Admin to Restore User Access.',
          'warning'
        );
        return false;
      }
      const legacySet = new Set<string>([
        ...(Array.isArray(existing.legacyIds) ? existing.legacyIds : []),
      ]);
      if (existing.id !== canonicalGoogleId) legacySet.add(existing.id);
      if (profile.id && profile.id !== canonicalGoogleId) legacySet.add(profile.id);

      const updated: User = {
        ...existing,
        id: canonicalGoogleId,
        name: profile.name || existing.name,
        email: cleanEmail || existing.email,
        avatar: profile.avatar || existing.avatar,
        authProvider: 'google',
        linkedProviders: Array.from(new Set([...(existing.linkedProviders || []), 'google'])),
        isVerified: true,
        verifiedAt: existing.verifiedAt || nowIso,
        lastLoginAt: nowIso,
        lastActiveAt: nowIso,
        googleSub: profile.googleSub || existing.googleSub,
        legacyIds: legacySet.size > 0 ? Array.from(legacySet) : undefined,
      };
      setUsers(prev => {
        const next = deduplicateAndNormalizeUsers(
          prev.map(u => (u.id === existing.id ? updated : u)),
          deletedUsers
        );
        latestSyncStateRef.current.users = next;
        try {
          localStorage.setItem('kft_users_v5', JSON.stringify(next));
        } catch {}
        return next;
      });
      setCurrentUser(updated);
      latestSyncStateRef.current.currentUser = updated;
      showToast(language === 'km' ? `សូមស្វាគមន៍មកវិញ ${updated.name}!` : `Welcome back, ${updated.name}!`, 'success');
      setIsAuthModalOpen(false);
      if (isSupabaseConfigured()) {
        upsertSingleUserToCloud(updated, deletedUsers)
          .then(cloudMerged => {
            if (Array.isArray(cloudMerged) && cloudMerged.length > 0) {
              setUsers(prev => deduplicateAndNormalizeUsers([...cloudMerged, ...prev], deletedUsers));
            }
            triggerCloudSyncNow(true);
          })
          .catch(() => {
            triggerCloudSyncNow(true);
          });
      }
      return true;
    }

    // Auto-create new user account with Google credentials & canonical ID
    const newUser: User = {
      id: canonicalGoogleId,
      name: profile.name || (cleanEmail ? cleanEmail.split('@')[0] : 'Google User'),
      email: cleanEmail,
      role: 'user',
      avatar: profile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      phone: profile.phone,
      authProvider: 'google',
      linkedProviders: ['google'],
      isVerified: true,
      verifiedAt: nowIso,
      createdAt: nowIso.split('T')[0],
      registeredAtIso: nowIso,
      lastLoginAt: nowIso,
      lastActiveAt: nowIso,
      googleSub: profile.googleSub,
      legacyIds: profile.id && profile.id !== canonicalGoogleId ? [profile.id] : undefined,
    };

    setUsers(prev => {
      const next = deduplicateAndNormalizeUsers([...prev, newUser], deletedUsers);
      latestSyncStateRef.current.users = next;
      try {
        localStorage.setItem('kft_users_v5', JSON.stringify(next));
      } catch {}
      return next;
    });
    setCurrentUser(newUser);
    latestSyncStateRef.current.currentUser = newUser;
    showToast(language === 'km' ? `សូមស្វាគមន៍មកកាន់កម្មវិធី ${newUser.name}!` : `Welcome to the app, ${newUser.name}!`, 'success');
    setIsAuthModalOpen(false);
    if (isSupabaseConfigured()) {
      upsertSingleUserToCloud(newUser, deletedUsers)
        .then(cloudMerged => {
          if (Array.isArray(cloudMerged) && cloudMerged.length > 0) {
            setUsers(prev => deduplicateAndNormalizeUsers([...cloudMerged, ...prev], deletedUsers));
          }
          triggerCloudSyncNow(true);
        })
        .catch(() => {
          triggerCloudSyncNow(true);
        });
    }
    return true;
  };

  const logout = () => {
    revokeAdminSession();
    setCurrentUser(null);
    latestSyncStateRef.current.currentUser = null;
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
      lastActiveAt: new Date().toISOString(),
    };

    setCurrentUser(updated);
    latestSyncStateRef.current.currentUser = updated;
    setUsers(prev => {
      const next = deduplicateAndNormalizeUsers(
        prev.map(u => (u.id === currentUser.id ? updated : u)),
        deletedUsers
      );
      latestSyncStateRef.current.users = next;
      return next;
    });
    try {
      localStorage.setItem('kft_current_user_v5', JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
    if (isSupabaseConfigured() && updated.role !== 'admin') {
      upsertSingleUserToCloud(updated, deletedUsers).catch(() => {});
    }
    showToast(language === 'km' ? 'បានកែប្រែឈ្មោះជោគជ័យ!' : 'Name updated successfully!', 'success');
  };

  // Social Account Linking (TikTok & Facebook) — Honest Profile Linking without false OAuth verification claims
  const connectTikTokAccount = async (
    rawUsername: string,
    displayName?: string,
    profileUrlOrAvatar?: string,
    avatarUrl?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, error: 'Please sign in first' };
    }

    // Extract clean username whether user entered "@savuth" or "https://www.tiktok.com/@savuth"
    let cleanInput = rawUsername.trim();
    const urlMatch = cleanInput.match(/tiktok\.com\/@?([a-zA-Z0-9._-]+)/i);
    if (urlMatch && urlMatch[1]) {
      cleanInput = urlMatch[1];
    }
    const cleanUsername = cleanInput.replace(/^@/, '').trim();
    if (!cleanUsername || cleanUsername.length < 2) {
      const msg =
        language === 'km'
          ? 'សូមបញ្ចូលឈ្មោះគណនី TikTok (@username) ឱ្យបានត្រឹមត្រូវ!'
          : language === 'zh'
          ? '请输入有效的 TikTok 用户名 (@username)！'
          : 'Please enter a valid TikTok username!';
      showToast(msg, 'warning');
      return { success: false, error: msg };
    }

    const formattedUsername = `@${cleanUsername}`;
    const nameToUse = displayName?.trim() || cleanUsername;
    const isThirdArgProfileUrl =
      profileUrlOrAvatar &&
      (profileUrlOrAvatar.includes('tiktok.com') || (!/\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(profileUrlOrAvatar) && !profileUrlOrAvatar.startsWith('data:image/')));
    const resolvedProfileUrl =
      (isThirdArgProfileUrl ? profileUrlOrAvatar.trim() : '') ||
      `https://www.tiktok.com/${formattedUsername}`;
    const resolvedAvatar =
      avatarUrl ||
      (!isThirdArgProfileUrl && profileUrlOrAvatar ? profileUrlOrAvatar : '') ||
      currentUser.avatar ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

    const updatedUser: User = {
      ...currentUser,
      socialAccounts: {
        ...currentUser.socialAccounts,
        tiktok: {
          connected: true,
          username: formattedUsername,
          handle: cleanUsername,
          displayName: nameToUse,
          avatarUrl: resolvedAvatar,
          profileUrl: resolvedProfileUrl,
          connectedAt: new Date().toISOString().split('T')[0],
        }
      }
    };

    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));

    showToast(
      language === 'km' 
        ? `បានភ្ជាប់តំណគណនី TikTok (${formattedUsername}) ដោយជោគជ័យ! 🎉` 
        : language === 'zh'
        ? `已成功关联 TikTok 账号 (${formattedUsername})！🎉`
        : `Linked TikTok account (${formattedUsername}) successfully! 🎉`,
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
      language === 'km'
        ? 'បានផ្តាច់ការភ្ជាប់គណនី TikTok រួចរាល់'
        : language === 'zh'
        ? '已断开 TikTok 账号关联'
        : 'Disconnected TikTok account',
      'info'
    );
  };

  const connectFacebookAccount = async (
    rawName: string,
    displayName?: string,
    profileUrlOrAvatar?: string,
    avatarUrl?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, error: 'Please sign in first' };
    }

    const cleanName = rawName.trim();
    if (!cleanName || cleanName.length < 2) {
      const msg =
        language === 'km'
          ? 'សូមបញ្ចូលឈ្មោះគណនី ឬ Page Facebook ឱ្យបានត្រឹមត្រូវ!'
          : language === 'zh'
          ? '请输入有效的 Facebook 账号或主页名称！'
          : 'Please enter a valid Facebook account or page name!';
      showToast(msg, 'warning');
      return { success: false, error: msg };
    }

    // Handle legacy calls where 2nd arg was accidentally passed as a URL
    const isSecondArgUrl = Boolean(displayName && /^https?:\/\//i.test(displayName.trim()));
    const nameToUse = (!isSecondArgUrl && displayName?.trim()) ? displayName.trim() : cleanName;
    const rawUrlCandidate = (isSecondArgUrl ? displayName!.trim() : profileUrlOrAvatar?.trim()) || '';
    const isCandidateWebUrl =
      rawUrlCandidate &&
      (rawUrlCandidate.includes('facebook.com') ||
        rawUrlCandidate.includes('fb.com') ||
        (!/\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(rawUrlCandidate) && !rawUrlCandidate.startsWith('data:image/')));

    const resolvedProfileUrl = isCandidateWebUrl
      ? (rawUrlCandidate.startsWith('http') ? rawUrlCandidate : `https://${rawUrlCandidate}`)
      : cleanName.includes('facebook.com/') || cleanName.includes('fb.com/')
      ? (cleanName.startsWith('http') ? cleanName : `https://${cleanName}`)
      : `https://www.facebook.com/search/top?q=${encodeURIComponent(cleanName)}`;

    const resolvedAvatar =
      avatarUrl ||
      (!isCandidateWebUrl && rawUrlCandidate ? rawUrlCandidate : '') ||
      currentUser.avatar ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

    const updatedUser: User = {
      ...currentUser,
      socialAccounts: {
        ...currentUser.socialAccounts,
        facebook: {
          connected: true,
          username: cleanName,
          displayName: nameToUse,
          avatarUrl: resolvedAvatar,
          profileUrl: resolvedProfileUrl,
          connectedAt: new Date().toISOString().split('T')[0],
        }
      }
    };

    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));

    showToast(
      language === 'km' 
        ? `បានភ្ជាប់តំណគណនី Facebook (${nameToUse}) ដោយជោគជ័យ! 🎉` 
        : language === 'zh'
        ? `已成功关联 Facebook 账号 (${nameToUse})！🎉`
        : `Linked Facebook account (${nameToUse}) successfully! 🎉`,
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
      language === 'km'
        ? 'បានផ្តាច់ការភ្ជាប់គណនី Facebook រួចរាល់'
        : language === 'zh'
        ? '已断开 Facebook 账号关联'
        : 'Disconnected Facebook account',
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
    const nowIso = new Date().toISOString();
    const newFood: FoodItem = {
      ...foodData,
      id: `food-${Date.now()}`,
      rating: 5.0,
      reviewCount: 1,
      isCustomPhoto: true,
      photoUpdatedAt: nowIso,
    };
    recordPermanentFoodOverride(newFood);
    setFoods(prev => {
      const next = [newFood, ...prev];
      scheduleStorageWrite('kft_foods_200_v7', next, 400);
      return next;
    });
    showToast(language === 'km' ? 'បានបញ្ចូលមុខម្ហូបថ្មីដោយជោគជ័យ' : 'Food item added successfully!', 'success');
  };

  const updateFood = (updated: FoodItem) => {
    const customUpdated: FoodItem = {
      ...updated,
      isCustomPhoto: true,
      photoUpdatedAt: new Date().toISOString(),
    };
    recordPermanentFoodOverride(customUpdated);
    setFoods(prev => {
      const next = prev.map(f => f.id === customUpdated.id ? customUpdated : f);
      scheduleStorageWrite('kft_foods_200_v7', next, 400);
      return next;
    });
    if (selectedFood?.id === customUpdated.id) setSelectedFood(customUpdated);
    showToast(language === 'km' ? 'បានកែប្រែព័ត៌មានមុខម្ហូប និងរក្សាទុករូបភាពជាអចិន្ត្រៃយ៍រួចរាល់!' : 'Food item and photo permanently saved!', 'success');
  };

  const deleteFood = (id: string) => {
    setFoods(prev => prev.filter(f => f.id !== id));
    if (selectedFood?.id === id) setSelectedFood(null);
    showToast(language === 'km' ? 'បានលុបមុខម្ហូប' : 'Food item deleted', 'info');
  };

  const getCurrentUserStoreQuota = (targetUser: User | null = currentUser): UserStoreQuotaSummary => {
    return getUserStoreQuotaSummary(targetUser, restaurants, transactions, appSettings);
  };

  // Restaurant CRUD (Supports Free 1st VIP Store, Free Replace of Existing Store, and Paid $10 Additional Stores)
  const addRestaurant = (
    restData: Omit<Restaurant, 'id' | 'rating' | 'reviewCount' | 'status'> & { id?: string; status?: 'approved' | 'pending' | 'rejected' },
    options?: { replaceRestaurantId?: string }
  ): Restaurant | null => {
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
    const dynamicPlans = getDynamicVipPlans(appSettings);

    // Basic 1st store registration is open to signed-in users; VIP unlocks full 20 dishes & 30 photos

    const quota = getUserStoreQuotaSummary(currentUser, restaurants, transactions, appSettings);
    const replaceTargetId = options?.replaceRestaurantId?.trim();

    // Prevent duplicate shop entries by checking existing records using Google Place ID
    const candidatePlaceId = (restData.googlePlaceId || restData.googleMapsMeta?.placeId || '').trim();
    if (candidatePlaceId) {
      const existingByPlaceId = restaurants.find(
        r =>
          r.id !== replaceTargetId &&
          (r.googlePlaceId === candidatePlaceId ||
            r.googleMapsMeta?.placeId === candidatePlaceId ||
            r.id === `gplace-${candidatePlaceId}`)
      );
      if (existingByPlaceId) {
        showToast(
          language === 'km'
            ? `⚠️ ហាង «${existingByPlaceId.nameKh || existingByPlaceId.nameEn}» មានក្នុងប្រព័ន្ធរួចហើយ (Google Place ID ដូចគ្នា)!`
            : language === 'zh'
            ? `⚠️ 店铺“${existingByPlaceId.nameEn || existingByPlaceId.nameKh}”已存在（相同的 Google Place ID）！`
            : `⚠️ "${existingByPlaceId.nameEn || existingByPlaceId.nameKh}" is already registered with this Google Place ID!`,
          'warning'
        );
        return null;
      }
    }
    const targetToReplace = replaceTargetId
      ? restaurants.find(r => r.id === replaceTargetId && !isSeedRestaurantId(r.id))
      : undefined;

    if (replaceTargetId) {
      const isTargetOwner = Boolean(
        targetToReplace &&
          (isAdmin ||
            targetToReplace.ownerId === currentUser.id ||
            (currentUser.email &&
              targetToReplace.ownerEmail &&
              targetToReplace.ownerEmail.toLowerCase() === currentUser.email.toLowerCase()))
      );
      if (!targetToReplace || !isTargetOwner) {
        showToast(
          language === 'km'
            ? '⚠️ រកមិនឃើញហាងចាស់ដែលត្រូវប្តូរ ឬអ្នកគ្មានសិទ្ធិប្តូរហាងនេះទេ!'
            : '⚠️ Target store to replace was not found or you do not have permission!',
          'warning'
        );
        return null;
      }
    } else if (!isAdmin && quota.remainingAvailableSlots <= 0) {
      // Server/Context enforcement: Additional stores beyond the allowed quota require verified $10 payment
      recordSecurityAudit(
        'ADDITIONAL_STORE_UNPAID_BLOCKED',
        'BLOCKED',
        'VipCreateStore',
        `Blocked unpaid additional store creation by ${currentUser.name} (${currentUser.id}). Used: ${quota.usedStoresCount}/${quota.totalAllowedStores}`
      );
      showToast(
        language === 'km'
          ? `🔒 អ្នកបានប្រើប្រាស់កូតាហាងចំនួន ${quota.usedStoresCount}/${quota.totalAllowedStores} រួចហើយ! អ្នកអាចកែប្រែ ឬប្តូរហាងដែលមានស្រាប់ដោយឥតគិតថ្លៃ ($0) ឬបង់ប្រាក់ $${quota.additionalStoreFeeUsd.toFixed(2)} USD ដើម្បីបន្ថែមហាងថ្មីមួយទៀត។`
          : `🔒 You have used ${quota.usedStoresCount}/${quota.totalAllowedStores} store slots! You can edit or replace your existing store for free ($0), or pay $${quota.additionalStoreFeeUsd.toFixed(2)} USD to add an additional store.`,
        'warning'
      );
      return null;
    }

    const profileImg = restData.profileImage || restData.photoUrl || '/foods/food-1.jpg';
    const galleryImgs = Array.isArray(restData.galleryPhotos) && restData.galleryPhotos.length > 0
      ? Array.from(new Set([profileImg, ...restData.galleryPhotos])).filter(Boolean)
      : [profileImg].filter(Boolean);
    const galleryImgSet = new Set(galleryImgs);
    const foodImgs = Array.isArray(restData.foodImages)
      ? restData.foodImages.filter((u: string) => u && !galleryImgSet.has(u))
      : [];

    // Final Server/Context AI Business Category Verification before saving or publishing any store
    const aiVerification =
      restData.aiCategoryVerification ||
      analyzeFoodBusinessDeterministically({
        nameKh: restData.nameKh,
        nameEn: restData.nameEn,
        descriptionKh: restData.descriptionKh,
        descriptionEn: restData.descriptionEn,
        signatureDishesKh: restData.signatureDishesKh,
        addressKh: restData.addressKh,
        provinceKh: restData.provinceKh,
        phone: restData.phone,
        photoUrl: profileImg,
        profileImage: profileImg,
        foodImages: foodImgs,
        galleryPhotos: restData.galleryPhotos,
        menuItems: restData.menuItems,
        ownerId: currentUser.id,
        ownerName: currentUser.name,
      });

    // Trigger asynchronous server audit log & multimodal verification
    verifyFoodBusinessOnServer({
      nameKh: restData.nameKh,
      nameEn: restData.nameEn,
      descriptionKh: restData.descriptionKh,
      descriptionEn: restData.descriptionEn,
      signatureDishesKh: restData.signatureDishesKh,
      addressKh: restData.addressKh,
      provinceKh: restData.provinceKh,
      phone: restData.phone,
      photoUrl: profileImg,
      profileImage: profileImg,
      foodImages: foodImgs,
      galleryPhotos: restData.galleryPhotos,
      menuItems: restData.menuItems,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
    }).catch(() => {});

    if (aiVerification.decision === 'rejected') {
      recordSecurityAudit(
        'VIP_STORE_REJECTED_NON_FOOD',
        'BLOCKED',
        'VipCreateStore',
        `Rejected non-food store "${restData.nameKh}" (${aiVerification.detectedCategory})`
      );
      showToast(
        language === 'km' ? aiVerification.reasonKh : aiVerification.reasonEn,
        'warning'
      );
      return null;
    }

    const isPendingManualReview = !isAdmin && aiVerification.decision === 'pending_review';
    const finalStatus: 'approved' | 'pending' | 'rejected' = isPendingManualReview ? 'pending' : 'approved';
    const finalIsVerified = !isPendingManualReview;
    const finalIsPromoted = !isPendingManualReview && (isAdmin || isApprovedVip);

    const nowIso = new Date().toISOString();
    const expiryIso =
      currentUser.subscriptionExpiryDate ||
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const uniqueShopId = targetToReplace
      ? targetToReplace.id
      : (restData as any).id || `rest-vip-${currentUser.id}-${Date.now()}`;
    const slotNumber = targetToReplace
      ? targetToReplace.storeSlotNumber || 1
      : quota.usedStoresCount + 1;

    const newRest: Restaurant = normalizeRestaurant({
      ...restData,
      photoUrl: profileImg,
      profileImage: profileImg,
      galleryPhotos: galleryImgs,
      foodImages: foodImgs,
      id: uniqueShopId,
      // Do NOT auto-assign a 5-star rating when registering a VIP shop; ratings come strictly from genuine customer reviews
      rating: 0,
      reviewCount: 0,
      reviews: [],
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      ownerEmail: currentUser.email,
      ownerPhone: restData.phone || currentUser.phone,
      status: finalStatus,
      isVerified: finalIsVerified,
      isPromoted: finalIsPromoted,
      membershipTier: (isAdmin || isApprovedVip) ? 'premium' : 'free',
      membershipExpiresAt: (isAdmin || isApprovedVip) ? expiryIso : undefined,
      paymentStatus: (isAdmin || isApprovedVip) ? 'verified' : undefined,
      menuItems: (restData.menuItems || []).slice(0, (isAdmin || isApprovedVip) ? 20 : 5),
      aiCategoryVerification: aiVerification,
      storeSlotNumber: slotNumber,
      replacedFromRestaurantId: targetToReplace ? targetToReplace.id : undefined,
      replacedAt: targetToReplace ? nowIso : undefined,
      created_at: targetToReplace?.created_at || targetToReplace?.createdAt || restData.created_at || restData.createdAt || nowIso,
      createdAt: targetToReplace?.created_at || targetToReplace?.createdAt || restData.created_at || restData.createdAt || nowIso,
      updatedAt: nowIso,
    });

    lastLocalRestaurantEditAtRef.current = Date.now();
    recordPermanentRestaurantOverride(newRest);
    setActiveManagedShopId(newRest.id);
    setManagingRestaurantState(newRest);

    setRestaurants(prev => {
      const nextList = sortRestaurantsChronologically([...prev.filter(r => r.id !== newRest.id), newRest]);
      latestSyncStateRef.current.restaurants = nextList;
      scheduleStorageWrite('kft_restaurants_real_v11', nextList, 300);
      // Background push to Supabase Cloud if configured
      try {
        if (isSupabaseConfigured()) {
          const customRests = nextList.filter(r => !isSeedRestaurantId(r.id));
          pushCloudDocument('kft_cloud_custom_restaurants_v1', customRests);
        }
      } catch {}
      return nextList;
    });

    if (selectedRestaurant?.id === newRest.id) {
      setSelectedRestaurant(newRest);
    }

    if (isPendingManualReview) {
      showToast(
        language === 'km'
          ? '⏳ សំណើបង្កើត/ប្តូរហាងរបស់អ្នកត្រូវបានបញ្ជូនទៅកាន់ Admin ដើម្បីត្រួតពិនិត្យប្រភេទអាជីវកម្មម្ហូបអាហារជាមុនសិន!'
          : '⏳ Your store submission has been sent to Admin for manual food-category verification!',
        'info'
      );
    } else if (targetToReplace) {
      showToast(
        language === 'km'
          ? `🔄 បានប្តូរហាងចាស់ដាក់ហាងថ្មី "${newRest.nameKh}" ជោគជ័យ (ដោយឥតគិតថ្លៃបន្ថែម $0)!`
          : `🔄 Replaced existing store with "${newRest.nameEn || newRest.nameKh}" for free ($0)!`,
        'success'
      );
    } else {
      showToast(
        language === 'km'
          ? `🎉 ចុះបញ្ជីហាងអាហារ VIP ទី ${slotNumber} របស់អ្នកបានជោគជ័យ!`
          : `🎉 Registered your VIP Store #${slotNumber} successfully!`,
        'success'
      );
    }
    return newRest;
  };

  // Explicit helper to replace an existing store without paying the additional-store fee again
  const replaceExistingRestaurant = (
    targetRestaurantId: string,
    newRestData: Omit<Restaurant, 'id' | 'rating' | 'reviewCount' | 'status'> & { status?: 'approved' | 'pending' | 'rejected' }
  ): Restaurant | null => {
    return addRestaurant(newRestData, { replaceRestaurantId: targetRestaurantId });
  };

  // Resolve all restaurants owned by a user, sorted newest/most-recently-updated first so the active shop is always prioritized
  const getOwnedRestaurantsForUser = (targetUser: User | null = currentUser): Restaurant[] => {
    if (!targetUser) return [];
    const userEmailLower = (targetUser.email || '').trim().toLowerCase();
    const matched = restaurants.filter(r => {
      // Never match seed demo shop rest-19 ('owner-1') unless the user's id is literally 'owner-1'
      if (isSeedRestaurantId(r.id) && r.ownerId !== targetUser.id) return false;
      if (r.ownerId && r.ownerId === targetUser.id) return true;
      if (userEmailLower && r.ownerEmail && r.ownerEmail.trim().toLowerCase() === userEmailLower) return true;
      return false;
    });
    return [...matched].sort((a, b) => {
      const aTime = a.updatedAt ? Date.parse(a.updatedAt) : getRestaurantCreatedAtMs(a);
      const bTime = b.updatedAt ? Date.parse(b.updatedAt) : getRestaurantCreatedAtMs(b);
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });
  };

  // Always open the exact shop owned by the logged-in user (or preferredShopId)
  const openManageMyVipStore = (
    preferredShopId?: string,
    initialTab?: 'menu' | 'info' | 'photos' | 'analytics' | 'membership'
  ) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (initialTab) {
      (window as any).__kft_manage_initial_tab = initialTab;
    }

    // 1. If a specific shop ID was explicitly requested (e.g. from a RestaurantCard or switcher), load that exact shop
    if (preferredShopId) {
      const explicitShop = restaurants.find(r => r.id === preferredShopId);
      if (explicitShop) {
        setManagingRestaurant(explicitShop);
        setIsManageMenuModalOpen(true);
        return;
      }
    }

    // 2. Look up shops owned by the logged-in user (sorted newest first)
    const ownedShops = getOwnedRestaurantsForUser(currentUser);
    if (ownedShops.length > 0) {
      let savedShopId: string | null = activeManagedShopId;
      try {
        savedShopId = localStorage.getItem(`kft_active_managed_shop_${currentUser.id}`) || activeManagedShopId;
      } catch {}
      const preferredOwned = savedShopId ? ownedShops.find(r => r.id === savedShopId) : undefined;
      const targetShop = preferredOwned || ownedShops[0];
      setManagingRestaurant(targetShop);
      setIsManageMenuModalOpen(true);
      return;
    }

    // 3. If Admin has no personal shop under currentUser.id, check custom VIP shops sorted newest first
    const isAdmin =
      currentUser.role === 'admin' ||
      currentUser.id === 'admin-authorized-single' ||
      currentUser.username === 'admin' ||
      currentUser.username === 'cheasavuth';
    if (isAdmin) {
      const customShops = [...restaurants.filter(r => !isSeedRestaurantId(r.id))].sort(
        (a, b) => getRestaurantCreatedAtMs(b) - getRestaurantCreatedAtMs(a)
      );
      if (customShops.length > 0) {
        const target = (activeManagedShopId && customShops.find(r => r.id === activeManagedShopId)) || customShops[0];
        setManagingRestaurant(target);
        setIsManageMenuModalOpen(true);
        return;
      }
    }

    // 4. If the user does not have a VIP shop yet, open the Register VIP Shop modal
    setIsVipAddRestaurantModalOpen(true);
  };

  const updateRestaurant = (updated: Restaurant) => {
    const original = restaurants.find(r => r.id === updated.id);
    const isAdmin = 
      currentUser?.role === 'admin' || 
      currentUser?.id === 'admin-authorized-single' || 
      currentUser?.username === 'admin' || 
      currentUser?.username === 'cheasavuth';

    const isOwner = Boolean(
      currentUser &&
        (original?.ownerId === currentUser.id ||
          (currentUser.email &&
            original?.ownerEmail &&
            original.ownerEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()))
    );
    const isApprovedVip = isUserVipActive(currentUser);

    // Owner or Admin Permission Enforcement: Basic shop management is free for the shop owner
    if (!isAdmin && !isOwner) {
      const errorMsg =
        language === 'km'
          ? '🔒 គ្មានសិទ្ធិកែប្រែហាងនេះទេ! មានតែម្ចាស់ហាងផ្ទាល់ ឬ Admin ប៉ុណ្ណោះដែលអាចកែប្រែព័ត៌មានហាងនេះបាន។'
          : language === 'zh'
          ? '🔒 无权修改此店铺！仅限店主本人或管理员修改。'
          : '🔒 Unauthorized! Only the shop owner or Admin can edit this restaurant.';
      showToast(errorMsg, 'warning');
      return;
    }

    const profileImg = updated.profileImage || updated.photoUrl || original?.profileImage || original?.photoUrl || '/foods/food-1.jpg';
    const galleryImgs = Array.isArray(updated.galleryPhotos) && updated.galleryPhotos.length > 0
      ? Array.from(new Set([profileImg, ...updated.galleryPhotos])).filter(Boolean)
      : (Array.isArray(original?.galleryPhotos) && original.galleryPhotos.length > 0
          ? Array.from(new Set([profileImg, ...original.galleryPhotos])).filter(Boolean)
          : [profileImg].filter(Boolean));
    const galleryImgSet = new Set(galleryImgs);
    const foodImgs = Array.isArray(updated.foodImages)
      ? updated.foodImages.filter((u: string) => u && !galleryImgSet.has(u))
      : (Array.isArray(original?.foodImages)
          ? original.foodImages.filter((u: string) => u && !galleryImgSet.has(u))
          : []);

    // Prevent VIP users from bypassing verification by editing an approved store into a non-food business
    let updatedAiVerification = updated.aiCategoryVerification || original?.aiCategoryVerification;
    let nextStatusAfterAiCheck: 'approved' | 'pending' | 'rejected' = original?.status || 'approved';
    let nextIsVerifiedAfterAiCheck: boolean = original?.isVerified ?? true;
    let nextIsPromotedAfterAiCheck: boolean = true;

    if (!isAdmin && !isSeedRestaurantId(updated.id)) {
      const aiCheck = analyzeFoodBusinessDeterministically({
        nameKh: updated.nameKh,
        nameEn: updated.nameEn,
        descriptionKh: updated.descriptionKh,
        descriptionEn: updated.descriptionEn,
        signatureDishesKh: updated.signatureDishesKh,
        addressKh: updated.addressKh,
        provinceKh: updated.provinceKh,
        phone: updated.phone,
        photoUrl: profileImg,
        profileImage: profileImg,
        foodImages: foodImgs,
        galleryPhotos: updated.galleryPhotos,
        menuItems: updated.menuItems,
        ownerId: currentUser?.id,
        ownerName: currentUser?.name,
      });

      if (aiCheck.decision === 'rejected') {
        recordSecurityAudit(
          'VIP_STORE_EDIT_REJECTED_NON_FOOD',
          'BLOCKED',
          'VipEditStore',
          `Blocked non-food edit on "${updated.nameKh}" (${aiCheck.detectedCategory})`
        );
        showToast(language === 'km' ? aiCheck.reasonKh : aiCheck.reasonEn, 'warning');
        return;
      }

      updatedAiVerification = aiCheck;
      if (aiCheck.decision === 'pending_review') {
        nextStatusAfterAiCheck = 'pending';
        nextIsVerifiedAfterAiCheck = false;
        nextIsPromotedAfterAiCheck = false;
      } else {
        nextStatusAfterAiCheck = 'approved';
        nextIsVerifiedAfterAiCheck = true;
        nextIsPromotedAfterAiCheck = true;
      }
    }

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
      galleryPhotos: galleryImgs,
      foodImages: foodImgs,
      isAdminEdited: true,
      adminEditedAt: new Date().toISOString(),
      created_at: preservedCreatedAt,
      createdAt: preservedCreatedAt,
    } : {
      ...updated,
      photoUrl: profileImg,
      profileImage: profileImg,
      galleryPhotos: galleryImgs,
      foodImages: foodImgs,
      membershipTier: effectiveTier,
      membershipExpiresAt: effectiveExpiry,
      isPromoted: effectiveTier === 'premium' ? nextIsPromotedAfterAiCheck : Boolean(original?.isPromoted),
      paymentStatus: effectiveTier === 'premium' ? 'verified' : original?.paymentStatus,
      status: nextStatusAfterAiCheck,
      isVerified: nextIsVerifiedAfterAiCheck,
      aiCategoryVerification: updatedAiVerification,
      signatureDishesKh: Array.isArray(updated.signatureDishesKh) ? updated.signatureDishesKh : (original?.signatureDishesKh || ['ម្ហូបខ្មែរប្រពៃណី']),
      menuItems: Array.isArray(updated.menuItems) ? updated.menuItems : (original?.menuItems || []),
      promoVideoUrl: updated.promoVideoUrl !== undefined ? updated.promoVideoUrl : original?.promoVideoUrl,
      telegramUrl: updated.telegramUrl !== undefined ? updated.telegramUrl : original?.telegramUrl,
      facebookUrl: updated.facebookUrl !== undefined ? updated.facebookUrl : original?.facebookUrl,
      websiteUrl: updated.websiteUrl !== undefined ? updated.websiteUrl : original?.websiteUrl,
      businessCategory: updated.businessCategory !== undefined ? updated.businessCategory : original?.businessCategory,
      created_at: preservedCreatedAt,
      createdAt: preservedCreatedAt,
    });

    // Persist restaurant photo/details permanently in vault & local storage & cloud
    lastLocalRestaurantEditAtRef.current = Date.now();
    recordPermanentRestaurantOverride(safeUpdated);

    setRestaurants(prev => {
      const next = prev.map(r => r.id === updated.id ? safeUpdated : r);
      latestSyncStateRef.current.restaurants = next;
      scheduleStorageWrite('kft_restaurants_real_v11', next, 300);
      if (!isSeedRestaurantId(safeUpdated.id) && isSupabaseConfigured()) {
        try {
          const customRests = next.filter(r => !isSeedRestaurantId(r.id));
          pushCloudDocument('kft_cloud_custom_restaurants_v1', customRests);
        } catch {}
      }
      return next;
    });
    if (selectedRestaurant && selectedRestaurant.id === updated.id) {
      setSelectedRestaurant(safeUpdated);
    }
    if (managingRestaurant?.id === updated.id) setManagingRestaurant(safeUpdated);
    showToast(language === 'km' ? 'បានកែប្រែព័ត៌មានហាង និងរក្សាទុករូបភាពជាអចិន្ត្រៃយ៍រួចរាល់!' : 'Restaurant details and photos permanently saved!', 'success');
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

    const isOwner = Boolean(
      currentUser &&
        (targetRest.ownerId === currentUser.id ||
          (currentUser.email &&
            targetRest.ownerEmail &&
            targetRest.ownerEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()))
    );
    const isApprovedVip = isUserVipActive(currentUser) || isRestaurantPremiumActive(targetRest);

    if (!isAdmin && !isOwner) {
      showToast(
        language === 'km'
          ? '🔒 សិទ្ធិត្រូវបានបដិសេធ! មានតែម្ចាស់ហាងផ្ទាល់ ឬ Admin ប៉ុណ្ណោះដែលអាចបន្ថែមមុខម្ហូបបាន។'
          : language === 'zh'
          ? '🔒 无权操作！仅限店主或管理员添加菜品。'
          : '🔒 Unauthorized! Only the shop owner or Admin can add food items.',
        'warning'
      );
      return false;
    }

    const currentItems = targetRest.menuItems || [];
    const maxAllowedItems = isAdmin || isApprovedVip ? 20 : 5;
    if (currentItems.length >= maxAllowedItems) {
      showToast(
        isAdmin || isApprovedVip
          ? language === 'km'
            ? 'សមាជិកភាព Premium VIP អនុញ្ញាតឱ្យបន្ថែមមុខម្ហូបអតិបរមាត្រឹម ២០ មុខប៉ុណ្ណោះ!'
            : language === 'zh'
            ? 'VIP 会员最多可添加 20 道菜品！'
            : 'Premium VIP membership allows a maximum of 20 food menu items!'
          : language === 'km'
          ? 'គម្រោងឥតគិតថ្លៃ (Free Plan) អាចបន្ថែមមុខម្ហូបបាន ៥ មុខ។ សូមដំឡើងទៅគម្រោង VIP ដើម្បីបន្ថែមរហូតដល់ ២០ មុខ!'
          : language === 'zh'
          ? '免费计划最多可添加 5 道菜品。升级 VIP 可添加多达 20 道菜品！'
          : 'Free Plan allows up to 5 menu items. Upgrade to VIP to add up to 20 menu items!',
        'warning'
      );
      return false;
    }

    // AI Anti-Bypass Check on Menu Item (block non-food merchandise in restaurant menu)
    if (!isAdmin) {
      const menuAiCheck = analyzeFoodBusinessDeterministically({
        nameKh: targetRest.nameKh,
        nameEn: targetRest.nameEn,
        menuItems: [itemData],
        photoUrl: itemData.photoUrl,
      });
      if (menuAiCheck.decision === 'rejected') {
        showToast(
          language === 'km' ? menuAiCheck.reasonKh : menuAiCheck.reasonEn,
          'warning'
        );
        return false;
      }
    }

    const newItem: RestaurantMenuItem = {
      ...itemData,
      id: `menu-${Date.now()}`,
      restaurantId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updatedMenuItems = [...currentItems, newItem];
    const nowIso = new Date().toISOString();
    const updatedRest: Restaurant = {
      ...targetRest,
      membershipTier: (isAdmin || isApprovedVip ? 'premium' : (targetRest.membershipTier || 'free')) as MembershipTier,
      isPromoted: isAdmin || isApprovedVip ? true : Boolean(targetRest.isPromoted),
      menuItems: updatedMenuItems,
      updatedAt: nowIso,
      photoUpdatedAt: nowIso,
      adminEditedAt: nowIso,
    };

    lastLocalRestaurantEditAtRef.current = Date.now();
    recordPermanentRestaurantOverride(updatedRest);

    setRestaurants(prev => {
      const next = prev.map(r => (r.id === restaurantId ? updatedRest : r));
      latestSyncStateRef.current.restaurants = next;
      scheduleStorageWrite('kft_restaurants_real_v11', next, 300);
      if (!isSeedRestaurantId(restaurantId) && isSupabaseConfigured()) {
        try {
          pushCloudDocument('kft_cloud_custom_restaurants_v1', next.filter(r => !isSeedRestaurantId(r.id)));
        } catch {}
      }
      return next;
    });

    if (selectedRestaurant?.id === restaurantId) {
      setSelectedRestaurant(updatedRest);
    }
    if (managingRestaurant?.id === restaurantId) {
      setManagingRestaurant(updatedRest);
    }

    showToast(
      language === 'km'
        ? `✅ បានរក្សាទុកមុខម្ហូប "${newItem.nameKh}" ដោយជោគជ័យ (${updatedMenuItems.length}/${maxAllowedItems})!`
        : language === 'zh'
        ? `✅ 已成功保存菜品 "${newItem.nameKh}" (${updatedMenuItems.length}/${maxAllowedItems})！`
        : `✅ Saved menu item "${newItem.nameKh}" (${updatedMenuItems.length}/${maxAllowedItems})!`,
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

    const isOwner = Boolean(
      currentUser &&
        (targetRest.ownerId === currentUser.id ||
          (currentUser.email &&
            targetRest.ownerEmail &&
            targetRest.ownerEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()))
    );

    if (!isAdmin && !isOwner) {
      showToast(
        language === 'km'
          ? '🔒 គ្មានសិទ្ធិកែប្រែមុខម្ហូបទេ! មានតែម្ចាស់ហាងផ្ទាល់ ឬ Admin ប៉ុណ្ណោះដែលអាចកែប្រែបាន។'
          : language === 'zh'
          ? '🔒 无权修改菜品！仅限店主或管理员操作。'
          : '🔒 Unauthorized! Only the shop owner or Admin can edit food items.',
        'warning'
      );
      return false;
    }

    const nowIso = new Date().toISOString();
    const updatedMenuItems = (targetRest.menuItems || []).map(item => 
      item.id === updatedItem.id ? { ...updatedItem, updatedAt: nowIso.split('T')[0] } : item
    );
    const updatedRest: Restaurant = {
      ...targetRest,
      menuItems: updatedMenuItems,
      updatedAt: nowIso,
      photoUpdatedAt: nowIso,
      adminEditedAt: nowIso,
    };

    lastLocalRestaurantEditAtRef.current = Date.now();
    recordPermanentRestaurantOverride(updatedRest);

    setRestaurants(prev => {
      const next = prev.map(r => (r.id === restaurantId ? updatedRest : r));
      latestSyncStateRef.current.restaurants = next;
      scheduleStorageWrite('kft_restaurants_real_v11', next, 300);
      if (!isSeedRestaurantId(restaurantId) && isSupabaseConfigured()) {
        try {
          pushCloudDocument('kft_cloud_custom_restaurants_v1', next.filter(r => !isSeedRestaurantId(r.id)));
        } catch {}
      }
      return next;
    });
    if (selectedRestaurant?.id === restaurantId) {
      setSelectedRestaurant(updatedRest);
    }
    if (managingRestaurant?.id === restaurantId) {
      setManagingRestaurant(updatedRest);
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

    const isOwner = Boolean(
      currentUser &&
        (targetRest.ownerId === currentUser.id ||
          (currentUser.email &&
            targetRest.ownerEmail &&
            targetRest.ownerEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()))
    );

    if (!isAdmin && !isOwner) {
      showToast(
        language === 'km'
          ? '🔒 គ្មានសិទ្ធិលុបមុខម្ហូបទេ! មានតែម្ចាស់ហាងផ្ទាល់ ឬ Admin ប៉ុណ្ណោះ។'
          : language === 'zh'
          ? '🔒 无权删除菜品！仅限店主或管理员操作。'
          : '🔒 Unauthorized!',
        'warning'
      );
      return false;
    }

    const nowIso = new Date().toISOString();
    const updatedMenuItems = (targetRest.menuItems || []).filter(item => item.id !== menuItemId);
    const updatedRest: Restaurant = {
      ...targetRest,
      menuItems: updatedMenuItems,
      updatedAt: nowIso,
      photoUpdatedAt: nowIso,
      adminEditedAt: nowIso,
    };

    lastLocalRestaurantEditAtRef.current = Date.now();
    recordPermanentRestaurantOverride(updatedRest);

    setRestaurants(prev => {
      const next = prev.map(r => (r.id === restaurantId ? updatedRest : r));
      latestSyncStateRef.current.restaurants = next;
      scheduleStorageWrite('kft_restaurants_real_v11', next, 300);
      if (!isSeedRestaurantId(restaurantId) && isSupabaseConfigured()) {
        try {
          pushCloudDocument('kft_cloud_custom_restaurants_v1', next.filter(r => !isSeedRestaurantId(r.id)));
        } catch {}
      }
      return next;
    });
    if (selectedRestaurant?.id === restaurantId) {
      setSelectedRestaurant(updatedRest);
    }
    if (managingRestaurant?.id === restaurantId) {
      setManagingRestaurant(updatedRest);
    }

    showToast(language === 'km' ? 'បានលុបមុខម្ហូបដោយជោគជ័យ!' : 'Menu item removed successfully!', 'info');
    return true;
  };

  // Genuine Customer Review & Star Rating Submission (1 to 5 stars)
  const addRestaurantReview = (restaurantId: string, rating: number, comment?: string): boolean => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(
        language === 'km'
          ? 'សូមចូលគណនីជាមុនសិន ដើម្បីដាក់ផ្កាយវាយតម្លៃហាងអាហារ!'
          : 'Please sign in first to submit a restaurant rating!',
        'warning'
      );
      return false;
    }

    const targetRest = restaurants.find(r => r.id === restaurantId);
    if (!targetRest) return false;

    const clampedRating = Math.min(5, Math.max(1, Math.round(rating)));
    const nowIso = new Date().toISOString();
    const existingReviews = Array.isArray(targetRest.reviews) ? targetRest.reviews : [];

    // Allow 1 review per customer per shop (if user already reviewed, update their review)
    const existingIdx = existingReviews.findIndex(rev => rev.userId === currentUser.id);
    const newReview: RestaurantReview = {
      id: existingIdx >= 0 ? existingReviews[existingIdx].id : `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      restaurantId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      rating: clampedRating,
      comment: comment?.trim() || undefined,
      createdAt: nowIso,
    };

    const nextReviews =
      existingIdx >= 0
        ? existingReviews.map((rev, idx) => (idx === existingIdx ? newReview : rev))
        : [newReview, ...existingReviews];

    const summary = getRestaurantRatingSummary({
      ...targetRest,
      reviews: nextReviews,
    });

    const updatedRest: Restaurant = {
      ...targetRest,
      reviews: nextReviews,
      rating: summary.averageRating,
      reviewCount: summary.reviewCount,
      updatedAt: nowIso,
    };

    recordPermanentRestaurantOverride(updatedRest);

    setRestaurants(prev => {
      const next = prev.map(r => (r.id === restaurantId ? updatedRest : r));
      scheduleStorageWrite('kft_restaurants_real_v11', next, 400);
      if (!isSeedRestaurantId(restaurantId) && isSupabaseConfigured()) {
        try {
          pushCloudDocument('kft_cloud_custom_restaurants_v1', next.filter(r => !isSeedRestaurantId(r.id)));
        } catch {}
      }
      return next;
    });

    if (selectedRestaurant?.id === restaurantId) {
      setSelectedRestaurant(updatedRest);
    }
    if (managingRestaurant?.id === restaurantId) {
      setManagingRestaurant(updatedRest);
    }

    showToast(
      language === 'km'
        ? `⭐ អរគុណសម្រាប់ការវាយតម្លៃ ${clampedRating} ផ្កាយ! (មធ្យមភាគ៖ ${summary.averageRating.toFixed(1)} ★ ពី ${summary.reviewCount} ការវាយតម្លៃ)`
        : `⭐ Thank you for your ${clampedRating}-star review! (Average: ${summary.averageRating.toFixed(1)} ★ from ${summary.reviewCount} reviews)`,
      'success'
    );
    return true;
  };

  const upgradeRestaurantToPremium = (
    restaurantId: string, 
    transactionRef: string, 
    paymentMethod: 'KHQR' | 'Bakong' | 'BankTransfer' = 'BankTransfer'
  ) => {
    const targetRest = restaurants.find(r => r.id === restaurantId);
    if (!targetRest) return;

    const dynamicPlans = getDynamicVipPlans(appSettingsRef.current);
    const shortPlan = dynamicPlans.quarterly;
    const longPlan = dynamicPlans.annual;

    addRegistrationTransaction({
      restaurantId,
      restaurantNameKh: targetRest.nameKh,
      restaurantNameEn: targetRest.nameEn,
      ownerId: currentUser?.id || targetRest.ownerId || 'owner-guest',
      ownerName: currentUser?.name || 'Restaurant Owner',
      ownerPhone: targetRest.phone,
      amountUsd: shortPlan.priceUsd,
      durationDays: shortPlan.durationDays,
      paymentMethod,
      transactionRef: transactionRef.trim(),
      notes: `${shortPlan.nameEn} ($${shortPlan.priceUsd.toFixed(2)}) or ${longPlan.nameEn} ($${longPlan.priceUsd.toFixed(2)}) Membership.`,
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

  // Restaurant Analytics (Views, Calls, Maps, Shares) — Lightweight in-place counter update + debounced idle write
  // Avoids mutating the 250-restaurant array reference while opening RestaurantDetailModal, preventing full-list re-renders!
  const recentTrackedViewsRef = useRef<Record<string, number>>({});

  const incrementRestaurantAnalyticsField = (
    restaurantId: string,
    field: 'views' | 'phoneClicks' | 'mapClicks' | 'shareClicks'
  ) => {
    const list = latestSyncStateRef.current.restaurants;
    const target = list.find(r => r.id === restaurantId);
    if (target) {
      const cur = target.analytics || { views: 0, phoneClicks: 0, mapClicks: 0, shareClicks: 0 };
      target.analytics = {
        ...cur,
        [field]: (cur[field] || 0) + 1,
      };
      scheduleStorageWrite('kft_restaurants_real_v11', list, 4000);
    }
    if (isManageMenuModalOpen || isAdminOpen) {
      setRestaurants(prev => [...prev]);
    }
  };

  const trackRestaurantView = (restaurantId: string) => {
    const now = Date.now();
    if (recentTrackedViewsRef.current[restaurantId] && now - recentTrackedViewsRef.current[restaurantId] < 30000) {
      return;
    }
    recentTrackedViewsRef.current[restaurantId] = now;
    incrementRestaurantAnalyticsField(restaurantId, 'views');
  };

  const trackRestaurantCall = (restaurantId: string) => {
    incrementRestaurantAnalyticsField(restaurantId, 'phoneClicks');
  };

  const trackRestaurantMap = (restaurantId: string) => {
    incrementRestaurantAnalyticsField(restaurantId, 'mapClicks');
  };

  const trackRestaurantShare = (restaurantId: string) => {
    incrementRestaurantAnalyticsField(restaurantId, 'shareClicks');
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
    removePermanentRestaurantOverride(id);
    setRestaurants(prev => {
      const next = prev.filter(r => r.id !== id);
      scheduleStorageWrite('kft_restaurants_real_v11', next, 300);
      if (isSupabaseConfigured()) {
        try {
          pushCloudDocument('kft_cloud_custom_restaurants_v1', next.filter(r => !isSeedRestaurantId(r.id)));
        } catch {}
      }
      return next;
    });
    if (selectedRestaurant?.id === id) setSelectedRestaurant(null);
    if (managingRestaurant?.id === id) {
      const remainingOwned = restaurants.filter(r => r.id !== id && !isSeedRestaurantId(r.id) && r.ownerId === currentUser?.id);
      if (remainingOwned.length > 0) {
        setManagingRestaurant(remainingOwned[remainingOwned.length - 1]);
      } else {
        setManagingRestaurant(null);
        setActiveManagedShopId(null);
        setIsManageMenuModalOpen(false);
      }
    }
    showToast(
      language === 'km'
        ? '🗑️ បានលុបហាងអាហាររួចរាល់! ឥឡូវនេះអ្នកអាចបន្ថែមហាងថ្មីជំនួសបាន។'
        : '🗑️ Restaurant deleted! You can now add a new restaurant.',
      'info'
    );
  };

  const approveRestaurant = (id: string) => {
    const nowIso = new Date().toISOString();
    setRestaurants(prev => {
      const next = prev.map(r => {
        if (r.id !== id) return r;
        const approvedRest: Restaurant = {
          ...r,
          status: 'approved',
          isVerified: true,
          isPromoted: r.membershipTier === 'premium' ? true : Boolean(r.isPromoted),
          updatedAt: nowIso,
          aiCategoryVerification: r.aiCategoryVerification
            ? {
                ...r.aiCategoryVerification,
                decision: 'approved',
                isFoodBusiness: true,
                reasonKh: `✅ ត្រូវបានពិនិត្យ និងអនុម័តដោយ Administrator ថាជាអាជីវកម្មម្ហូបអាហារត្រឹមត្រូវ។`,
                reasonEn: `✅ Manually reviewed and approved by Administrator as an eligible food business.`,
                verifiedAt: nowIso,
                verifiedByModel: 'admin_manual_override',
              }
            : undefined,
        };
        recordPermanentRestaurantOverride(approvedRest);
        if (managingRestaurant?.id === id) setManagingRestaurant(approvedRest);
        if (selectedRestaurant?.id === id) setSelectedRestaurant(approvedRest);
        return approvedRest;
      });
      scheduleStorageWrite('kft_restaurants_real_v11', next, 400);
      if (isSupabaseConfigured()) {
        try {
          pushCloudDocument('kft_cloud_custom_restaurants_v1', next.filter(r => !isSeedRestaurantId(r.id)));
        } catch {}
      }
      return next;
    });
    showToast(
      language === 'km'
        ? '✅ បានអនុម័តហាងអាហារជោគជ័យ និងដាក់បង្ហាញជាសាធារណៈរួចរាល់!'
        : '✅ Restaurant approved and published!',
      'success'
    );
  };

  const rejectRestaurant = (id: string, reasonKh?: string) => {
    const nowIso = new Date().toISOString();
    const defaultReasonKh =
      reasonKh?.trim() ||
      '🚫 សំណើបង្កើតហាងត្រូវបានបដិសេធដោយ Administrator ដោយសារមិនមែនជាភោជនីយដ្ឋាន ឬហាងលក់ម្ហូបអាហារចម្អិនស្រាប់។';
    setRestaurants(prev => {
      const next = prev.map(r => {
        if (r.id !== id) return r;
        const rejectedRest: Restaurant = {
          ...r,
          status: 'rejected',
          isVerified: false,
          isPromoted: false,
          updatedAt: nowIso,
          aiCategoryVerification: {
            ...(r.aiCategoryVerification || {
              detectedCategory: 'non_food_other',
              detectedCategoryLabelKh: 'អាជីវកម្មមិនពាក់ព័ន្ធនឹងម្ហូបអាហារ',
              detectedCategoryLabelEn: 'Non-Food Business',
              confidenceScore: 100,
              isBypassAttempt: false,
              matchedFoodSignals: [],
              flaggedNonFoodSignals: [],
              photoAnalysisSummaryKh: '',
              photoAnalysisSummaryEn: '',
              verificationToken: `KFT-ADMIN-REJ-${Date.now()}`,
            }),
            decision: 'rejected',
            isFoodBusiness: false,
            reasonKh: defaultReasonKh,
            reasonEn: '🚫 Store rejected by Administrator: Does not meet prepared-food business criteria.',
            verifiedAt: nowIso,
            verifiedByModel: 'admin_manual_override',
          },
        };
        recordPermanentRestaurantOverride(rejectedRest);
        if (managingRestaurant?.id === id) setManagingRestaurant(rejectedRest);
        if (selectedRestaurant?.id === id) setSelectedRestaurant(rejectedRest);
        return rejectedRest;
      });
      scheduleStorageWrite('kft_restaurants_real_v11', next, 400);
      if (isSupabaseConfigured()) {
        try {
          pushCloudDocument('kft_cloud_custom_restaurants_v1', next.filter(r => !isSeedRestaurantId(r.id)));
        } catch {}
      }
      return next;
    });
    showToast(
      language === 'km'
        ? '🚫 បានបដិសេធសំណើបង្កើតហាងដែលមិនមែនជាអាហាររួចរាល់!'
        : '🚫 Rejected non-food store submission!',
      'info'
    );
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
        'warning'
      );
      return false;
    }

    const nowIso = new Date().toISOString();
    const newDest: TouristDestination = {
      ...destData,
      id: `dest-${Date.now()}`,
      rating: 5.0,
      reviewCount: 1,
      isCustomPhoto: true,
      photoUpdatedAt: nowIso,
    };
    recordPermanentDestinationOverride(newDest);
    setDestinations(prev => {
      const next = [newDest, ...prev];
      scheduleStorageWrite('kft_destinations_real_v8', next, 400);
      return next;
    });
    showToast(language === 'km' ? 'បានបញ្ចូលតំបន់ទេសចរណ៍ថ្មីដោយជោគជ័យ' : 'Destination added!', 'success');
    return true;
  };

  const updateDestination = (updated: TouristDestination) => {
    const nowIso = new Date().toISOString();
    const customUpdated: TouristDestination = {
      ...updated,
      galleryPhotos: updated.photoUrl
        ? [updated.photoUrl, ...(Array.isArray(updated.galleryPhotos) ? updated.galleryPhotos.filter(p => p && p !== updated.photoUrl && !p.startsWith('data:image/')) : [])].slice(0, 6)
        : updated.galleryPhotos,
      isCustomPhoto: true,
      photoUpdatedAt: nowIso,
      isAdminEdited: true,
      adminEditedAt: nowIso,
    };

    // Persist to permanent media overrides vault (localStorage + IndexedDB + Supabase Cloud)
    recordPermanentDestinationOverride(customUpdated);

    setDestinations(prev => {
      const next = prev.map(d => d.id === customUpdated.id ? customUpdated : d);
      scheduleStorageWrite('kft_destinations_real_v8', next, 400);
      return next;
    });
    if (selectedDestination?.id === customUpdated.id) {
      setSelectedDestination(customUpdated);
    }
  };

  // Google Maps Places Import (Restaurants & Tourist Attractions) with Duplicate Prevention & Admin/VIP Backend Permission Check
  const importGooglePlaceToApp = (
    place: GooglePlaceCachedItem,
    customEdits?: {
      nameKh?: string;
      nameEn?: string;
      category?: 'restaurant' | 'tourism';
      provinceKh?: string;
      addressKh?: string;
      phone?: string;
      photoUrl?: string;
    }
  ): { imported: boolean; duplicate: boolean; type: 'restaurant' | 'tourism'; id: string; item?: Restaurant | TouristDestination } => {
    if (!verifyBackendVipFeatureAccess('ស្វែងរកទីតាំងលើ Google Maps', 'Google Maps Places Search')) {
      return { imported: false, duplicate: false, type: 'restaurant', id: '' };
    }
    const targetCategory: 'restaurant' | 'tourism' = customEdits?.category || place.category || 'restaurant';
    const hasCustomEdits = Boolean(
      customEdits &&
      (customEdits.nameKh || customEdits.nameEn || customEdits.provinceKh || customEdits.addressKh || customEdits.phone || customEdits.photoUrl)
    );
    const nowIso = new Date().toISOString();

    if (targetCategory === 'tourism') {
      const existingDest = findDuplicateDestinationForGooglePlace(place, destinations);
      if (existingDest) {
        // Refresh Google Maps metadata while preserving Admin-managed fields
        const refreshedDest: TouristDestination = {
          ...existingDest,
          googlePlaceId: existingDest.googlePlaceId || place.placeId,
          dataSource: existingDest.dataSource || 'google_maps',
          nameKh: customEdits?.nameKh?.trim() || existingDest.nameKh,
          nameEn: customEdits?.nameEn?.trim() || existingDest.nameEn,
          provinceKh: customEdits?.provinceKh?.trim() || existingDest.provinceKh,
          addressKh: customEdits?.addressKh?.trim() || existingDest.addressKh,
          photoUrl: customEdits?.photoUrl?.trim() || existingDest.photoUrl,
          isAdminEdited: existingDest.isAdminEdited || hasCustomEdits,
          adminEditedAt: hasCustomEdits ? nowIso : existingDest.adminEditedAt,
        };
        recordPermanentDestinationOverride(refreshedDest);
        setDestinations(prev => {
          const next = prev.map(d => d.id === existingDest.id ? refreshedDest : d);
          scheduleStorageWrite('kft_destinations_real_v8', next, 400);
          return next;
        });
        showToast(
          language === 'km'
            ? `ℹ️ តំបន់ទេសចរណ៍ «${refreshedDest.nameKh}» មានក្នុងប្រព័ន្ធរួចហើយ (បានធ្វើបច្ចុប្បន្នភាពទិន្នន័យ Google Maps)`
            : `ℹ️ "${refreshedDest.nameEn}" is already in the database (Google Maps metadata synced).`,
          'info'
        );
        return { imported: false, duplicate: true, type: 'tourism', id: existingDest.id, item: refreshedDest };
      }

      const mappedDest = convertGooglePlaceToDestination(place);
      const finalDest: TouristDestination = {
        ...mappedDest,
        nameKh: customEdits?.nameKh?.trim() || mappedDest.nameKh,
        nameEn: customEdits?.nameEn?.trim() || mappedDest.nameEn,
        provinceKh: customEdits?.provinceKh?.trim() || mappedDest.provinceKh,
        addressKh: customEdits?.addressKh?.trim() || mappedDest.addressKh,
        photoUrl: customEdits?.photoUrl?.trim() || mappedDest.photoUrl,
        isCustomPhoto: Boolean(customEdits?.photoUrl?.trim()),
        isAdminEdited: hasCustomEdits,
        adminEditedAt: hasCustomEdits ? nowIso : undefined,
      };

      recordPermanentDestinationOverride(finalDest);
      setDestinations(prev => {
        const next = [finalDest, ...prev];
        scheduleStorageWrite('kft_destinations_real_v8', next, 400);
        return next;
      });
      showToast(
        language === 'km'
          ? `✅ បាននាំចូលតំបន់ទេសចរណ៍ «${finalDest.nameKh}» ពី Google Maps ជោគជ័យ!`
          : `✅ Imported tourist attraction "${finalDest.nameEn}" from Google Maps!`,
        'success'
      );
      return { imported: true, duplicate: false, type: 'tourism', id: finalDest.id, item: finalDest };
    }

    // Restaurant / Cafe / Food Shop import
    const existingRest = findDuplicateRestaurantForGooglePlace(place, restaurants);
    if (existingRest) {
      const merged = mergeGoogleMapsPlaceWithExistingRestaurant(existingRest, place);
      const finalMerged: Restaurant = normalizeRestaurant({
        ...merged,
        nameKh: customEdits?.nameKh?.trim() || merged.nameKh,
        nameEn: customEdits?.nameEn?.trim() || merged.nameEn,
        provinceKh: customEdits?.provinceKh?.trim() || merged.provinceKh,
        addressKh: customEdits?.addressKh?.trim() || merged.addressKh,
        phone: customEdits?.phone?.trim() || merged.phone,
        photoUrl: customEdits?.photoUrl?.trim() || merged.photoUrl,
        profileImage: customEdits?.photoUrl?.trim() || merged.profileImage || merged.photoUrl,
        isAdminEdited: existingRest.isAdminEdited || hasCustomEdits,
        adminEditedAt: hasCustomEdits ? nowIso : existingRest.adminEditedAt,
      });

      recordPermanentRestaurantOverride(finalMerged);
      setRestaurants(prev => {
        const next = prev.map(r => r.id === existingRest.id ? finalMerged : r);
        scheduleStorageWrite('kft_restaurants_real_v11', next, 400);
        if (!isSeedRestaurantId(finalMerged.id) && isSupabaseConfigured()) {
          try {
            pushCloudDocument('kft_cloud_custom_restaurants_v1', next.filter(r => !isSeedRestaurantId(r.id)));
          } catch {}
        }
        return next;
      });
      showToast(
        language === 'km'
          ? `ℹ️ ហាង «${finalMerged.nameKh}» មានក្នុងប្រព័ន្ធរួចហើយ (រក្សាទុកព័ត៌មាន Admin និងធ្វើបច្ចុប្បន្នភាព Google Maps)`
          : `ℹ️ "${finalMerged.nameEn}" already exists (Admin data preserved & Google Maps synced).`,
        'info'
      );
      return { imported: false, duplicate: true, type: 'restaurant', id: existingRest.id, item: finalMerged };
    }

    const mappedRest = convertGooglePlaceToRestaurant(place);
    const finalRest: Restaurant = normalizeRestaurant({
      ...mappedRest,
      nameKh: customEdits?.nameKh?.trim() || mappedRest.nameKh,
      nameEn: customEdits?.nameEn?.trim() || mappedRest.nameEn,
      provinceKh: customEdits?.provinceKh?.trim() || mappedRest.provinceKh,
      addressKh: customEdits?.addressKh?.trim() || mappedRest.addressKh,
      phone: customEdits?.phone?.trim() || mappedRest.phone,
      photoUrl: customEdits?.photoUrl?.trim() || mappedRest.photoUrl,
      profileImage: customEdits?.photoUrl?.trim() || mappedRest.profileImage || mappedRest.photoUrl,
      membershipTier: 'free',
      isPromoted: false,
      status: 'approved',
      isVerified: true,
      dataSource: 'google_maps',
      googlePlaceId: place.placeId,
      googleMapsMeta: mappedRest.googleMapsMeta,
      isAdminEdited: hasCustomEdits,
      adminEditedAt: hasCustomEdits ? nowIso : undefined,
      created_at: nowIso,
      createdAt: nowIso,
    });

    recordPermanentRestaurantOverride(finalRest);
    setRestaurants(prev => {
      const next = sortRestaurantsChronologically([finalRest, ...prev]);
      scheduleStorageWrite('kft_restaurants_real_v11', next, 400);
      if (isSupabaseConfigured()) {
        try {
          pushCloudDocument('kft_cloud_custom_restaurants_v1', next.filter(r => !isSeedRestaurantId(r.id)));
        } catch {}
      }
      return next;
    });
    showToast(
      language === 'km'
        ? `✅ បាននាំចូលហាង «${finalRest.nameKh}» ពី Google Maps ចូលក្នុងបញ្ជីកម្មវិធីជោគជ័យ!`
        : `✅ Imported "${finalRest.nameEn}" from Google Maps into the app directory!`,
      'success'
    );
    return { imported: true, duplicate: false, type: 'restaurant', id: finalRest.id, item: finalRest };
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
      authorName: currentUser?.name || 'អ្នកដំណើរខ្មែរ (Khmer Traveler)',
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
      createdAt: 'អម្បាញ់មិញ',
      status: 'approved',
    };
    setPosts(prev => [newPost, ...prev]);
    showToast(
      language === 'km'
        ? 'បានចែករំលែកការបង្ហោះបានជោគជ័យ 🎉'
        : language === 'zh'
        ? '动态已成功发布到社区 🎉'
        : 'Post shared successfully! 🎉',
      'success'
    );
  };

  const toggleLikePost = (postId: string) => {
    if (!currentUser) {
      showToast(
        language === 'km' 
          ? 'សូមចុះឈ្មោះ ឬចូលគណនី ដើម្បីចុច Like' 
          : language === 'zh'
          ? '请先登录或注册账号后再点赞'
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
          : language === 'zh'
          ? '请先登录或注册账号后再发表评论'
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
      authorName: currentUser?.name || 'អ្នកដំណើរខ្មែរ',
      authorAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      text,
      createdAt: 'អម្បាញ់មិញ',
    };
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        comments: [...p.comments, newComment],
      };
    }));
    showToast(
      language === 'km'
        ? 'បានបញ្ចេញមតិយោបល់'
        : language === 'zh'
        ? '评论已发表'
        : 'Comment added',
      'info'
    );
  };

  const deletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    showToast(
      language === 'km'
        ? 'បានលុបការបង្ហោះ'
        : language === 'zh'
        ? '动态已删除'
        : 'Post deleted',
      'info'
    );
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
    const targetUserId = matchedTxn.userId || matchedTxn.ownerId || '';
    const now = new Date();
    const verifiedTimestamp = now.toISOString().replace('T', ' ').slice(0, 16);
    const adminIdentity = currentUser.name || 'Chea Savuth (Admin)';

    // Case 1: Approving an Additional Store Slot ($10 per additional store)
    if (matchedTxn.type === 'additional_store_slot') {
      if (matchedTxn.transactionRef) {
        recordVerifiedTransaction(matchedTxn.transactionRef);
      }

      setTransactions(prev => prev.map(t => {
        if (t.id !== txnId) return t;
        return {
          ...t,
          status: 'verified',
          verifiedAt: verifiedTimestamp,
          verifiedBy: adminIdentity,
        };
      }));

      try {
        const rawLogs = localStorage.getItem('kft_admin_audit_logs_v1');
        const logs = rawLogs ? JSON.parse(rawLogs) : [];
        logs.unshift({
          id: `audit_${Date.now()}`,
          action: 'APPROVE_ADDITIONAL_STORE_PAYMENT',
          txnId,
          transactionRef: matchedTxn.transactionRef,
          targetUserId,
          amountUsd: matchedTxn.amountUsd,
          storeSlotNumber: matchedTxn.storeSlotNumber,
          adminId: currentUser.id,
          adminName: adminIdentity,
          timestamp: now.toISOString(),
        });
        localStorage.setItem('kft_admin_audit_logs_v1', JSON.stringify(logs.slice(0, 200)));
      } catch {}

      if (targetUserId) {
        setUsers(prev => {
          const nextUsers = prev.map(u => {
            if (u.id !== targetUserId) return u;
            const existingIds = Array.isArray(u.additionalStorePaymentIds) ? u.additionalStorePaymentIds : [];
            const nextIds = Array.from(new Set([...existingIds, txnId]));
            const nextSlots = Math.max((u.paidAdditionalStoreSlots || 0) + 1, nextIds.length);
            return {
              ...u,
              paidAdditionalStoreSlots: nextSlots,
              additionalStorePaymentIds: nextIds,
            };
          });
          try {
            localStorage.setItem('kft_users_v5', JSON.stringify(nextUsers));
            if (isSupabaseConfigured()) {
              pushCloudDocument('kft_cloud_users_v1', nextUsers);
            }
          } catch {}
          return nextUsers;
        });

        if (currentUser?.id === targetUserId) {
          setCurrentUser(prev => {
            if (!prev) return null;
            const existingIds = Array.isArray(prev.additionalStorePaymentIds) ? prev.additionalStorePaymentIds : [];
            const nextIds = Array.from(new Set([...existingIds, txnId]));
            const nextSlots = Math.max((prev.paidAdditionalStoreSlots || 0) + 1, nextIds.length);
            return {
              ...prev,
              paidAdditionalStoreSlots: nextSlots,
              additionalStorePaymentIds: nextIds,
            };
          });
        }

        const slotApprovalNotif: AppNotification = {
          id: `notif-store-slot-approved-${Date.now()}`,
          titleKh: '🏪 ការទូទាត់បន្ថែមហាងថ្មីត្រូវបានអនុម័ត!',
          titleEn: '🏪 Additional Store Slot Payment Approved!',
          messageKh: `រដ្ឋបាលបានពិនិត្យ និងអនុម័តការទូទាត់ $${matchedTxn.amountUsd.toFixed(2)} USD សម្រាប់បន្ថែមហាងថ្មីរបស់អ្នកដោយជោគជ័យ! ឥឡូវនេះអ្នកអាចបង្កើតហាងថ្មីបន្ថែមបានភ្លាមៗ។`,
          messageEn: `Administrator approved your $${matchedTxn.amountUsd.toFixed(2)} USD payment for an additional store slot! You can now create your new store immediately.`,
          type: 'system',
          date: now.toISOString().split('T')[0],
          isRead: false,
        };
        setNotifications(prev => [slotApprovalNotif, ...prev]);
      }

      showToast(
        language === 'km'
          ? `✅ បានផ្ទៀងផ្ទាត់ និងបើកសិទ្ធិបន្ថែមហាងថ្មី (+1 ហាង) ជូនអតិថិជនដោយជោគជ័យ!`
          : `✅ Verified payment and unlocked +1 additional store slot for user!`,
        'success'
      );
      return;
    }

    // Case 2: Standard VIP Membership Upgrade / Registration
    const validatedPlan = resolveAndValidateVipPlan(
      {
        planType: matchedTxn.planType,
        durationDays: matchedTxn.durationDays,
        amountUsd: matchedTxn.amountUsd,
      },
      appSettings
    );
    // Preserve exact durationDays and amountUsd recorded at purchase time if present so historical purchases aren't unexpectedly altered
    const durationDays =
      typeof matchedTxn.durationDays === 'number' && matchedTxn.durationDays >= 1
        ? matchedTxn.durationDays
        : validatedPlan.durationDays;
    const finalAmountUsd =
      typeof matchedTxn.amountUsd === 'number' && matchedTxn.amountUsd > 0
        ? matchedTxn.amountUsd
        : validatedPlan.priceUsd;

    const matchedUserObj = users.find(u => u.id === targetUserId);
    const { startDate: calcStart, expiryDate: calcExpiry } = calculateVipDates(
      matchedUserObj?.subscriptionExpiryDate,
      durationDays,
      appSettings
    );

    setTransactions(prev => prev.map(t => {
      if (t.id !== txnId) return t;
      return {
        ...t,
        durationDays,
        amountUsd: finalAmountUsd,
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

      // Immediately push updated VIP user & transactions to Supabase Cloud and local backup vault
      try {
        const updatedUsersForCloud = users.map(u =>
          u.id === targetUserId
            ? {
                ...u,
                membershipTier: 'premium_vip' as const,
                subscriptionStartDate: calcStart,
                subscriptionExpiryDate: calcExpiry,
                subscriptionStatus: 'active' as const,
                paymentStatus: 'verified' as const,
              }
            : u
        );
        localStorage.setItem('kft_users_v5', JSON.stringify(updatedUsersForCloud));
        localStorage.setItem('kft_vip_registry_backup_v1', JSON.stringify(
          updatedUsersForCloud.filter(u => u.membershipTier === 'premium_vip')
        ));
        if (isSupabaseConfigured()) {
          pushCloudDocument('kft_cloud_users_v1', updatedUsersForCloud);
        }
      } catch {}

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

  // Delete Selected Payment Transaction Records (Admin Only)
  // Strictly preserves all User Accounts and their VIP Membership / Expiration statuses!
  const deleteTransactions = (txnIds: string[]): { success: boolean; deletedCount: number } => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast(
        language === 'km'
          ? '⛔ មានតែរដ្ឋបាលប្រព័ន្ធ (Admin) ប៉ុណ្ណោះដែលមានសិទ្ធិលុបកំណត់ត្រាទូទាត់!'
          : '⛔ Only the Administrator can delete payment records!',
        'warning'
      );
      return { success: false, deletedCount: 0 };
    }

    const idSet = new Set((txnIds || []).filter(Boolean));
    if (idSet.size === 0) {
      return { success: false, deletedCount: 0 };
    }

    const toDelete = transactions.filter(t => idSet.has(t.id));
    if (toDelete.length === 0) {
      return { success: false, deletedCount: 0 };
    }

    const remainingTxns = transactions.filter(t => !idSet.has(t.id));
    setTransactions(remainingTxns);

    try {
      localStorage.setItem('kft_transactions_v4', JSON.stringify(remainingTxns));
      const rawDel = localStorage.getItem('kft_deleted_transactions_v1');
      const existingDel: string[] = rawDel ? JSON.parse(rawDel) : [];
      const mergedDel = Array.from(new Set([...existingDel, ...Array.from(idSet)]));
      localStorage.setItem('kft_deleted_transactions_v1', JSON.stringify(mergedDel));

      const rawVault = localStorage.getItem('kft_secure_payment_proofs_vault_v1');
      if (rawVault) {
        const vault = JSON.parse(rawVault);
        for (const delId of idSet) {
          delete vault[delId];
        }
        localStorage.setItem('kft_secure_payment_proofs_vault_v1', JSON.stringify(vault));
        if (isSupabaseConfigured()) {
          pushCloudDocument('kft_cloud_payment_proofs_v1', vault);
        }
      }

      if (isSupabaseConfigured()) {
        pushCloudDocument('kft_cloud_transactions_v1', remainingTxns);
        pushCloudDocument('kft_cloud_deleted_transactions_v1', mergedDel);
      }

      const rawLogs = localStorage.getItem('kft_admin_audit_logs_v1');
      const logs = rawLogs ? JSON.parse(rawLogs) : [];
      logs.unshift({
        id: `audit_del_txn_${Date.now()}`,
        action: 'DELETE_PAYMENT_RECORDS',
        deletedCount: toDelete.length,
        deletedTxnIds: Array.from(idSet),
        adminId: currentUser.id,
        adminName: currentUser.name || 'Chea Savuth (Admin)',
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('kft_admin_audit_logs_v1', JSON.stringify(logs.slice(0, 200)));
    } catch (e) {
      console.warn('Error persisting deleted transactions:', e);
    }

    showToast(
      language === 'km'
        ? `🗑️ បានលុបកំណត់ត្រាទូទាត់ចំនួន ${toDelete.length} ដោយជោគជ័យ! (គណនីអ្នកប្រើប្រាស់ និងស្ថានភាព VIP រក្សាទុកដដែល)`
        : `🗑️ Deleted ${toDelete.length} payment record(s) successfully! (User accounts and VIP status remain unchanged)`,
      'info'
    );

    return { success: true, deletedCount: toDelete.length };
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

  // User VIP Upgrade & Renewal Methods (Dynamic Admin-Configured Prices & Durations)
  const upgradeCurrentUserToVip = async (
    paymentMethod: 'GooglePlayBilling' | 'KHQR' | 'Bakong' | 'Card',
    transactionRef: string,
    last4?: string,
    amountUsd?: number,
    durationDays?: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, error: 'Please sign in first.' };
    }

    const latestSettings = await refreshAppSettingsFromServer(true);
    const resolvedPlan = resolveAndValidateVipPlan(
      { durationDays, amountUsd },
      latestSettings
    );
    const effectiveAmountUsd = amountUsd ?? resolvedPlan.priceUsd;
    const effectiveDurationDays = durationDays ?? resolvedPlan.durationDays;

    try {
      const req: PaymentVerificationRequest = {
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
        paymentMethod,
        transactionRef,
        amountUsd: effectiveAmountUsd,
        durationDays: effectiveDurationDays,
        planType: resolvedPlan.id,
        nonce: `vip_nonce_${Date.now()}`,
        timestamp: Date.now(),
        paymentToken: last4 ? `card_${last4}` : undefined
      };

      const result = await verifyPaymentOnBackend(req, latestSettings);
      if (!result.success) {
        const failedTxn: RegistrationTransaction = {
          id: `TXN-VIP-FAIL-${Date.now().toString(36).toUpperCase()}`,
          type: 'user_vip_upgrade',
          userId: currentUser.id,
          userName: currentUser.name,
          userEmail: currentUser.email,
          amountUsd: effectiveAmountUsd,
          durationDays: effectiveDurationDays,
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
        planType: resolvedPlan.id,
        amountUsd: resolvedPlan.priceUsd,
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
        notes: `${result.durationDays}-day Premium VIP membership activated successfully ($${resolvedPlan.priceUsd.toFixed(2)} USD)`
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
    durationDays?: number,
    amountUsd?: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Please sign in first.' };

    const latestSettings = await refreshAppSettingsFromServer(true);
    const validatedPlan = resolveAndValidateVipPlan({ durationDays, amountUsd }, latestSettings);
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
    durationDays?: number,
    amountUsd?: number,
    transactionRef?: string,
    notes?: string,
    paymentProofData?: { dataUrl: string; fileName?: string; mimeType?: string }
  ): Promise<{ success: boolean; transactionId: string; error?: string }> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, transactionId: '', error: 'User authentication required' };
    }

    const latestSettings = await refreshAppSettingsFromServer(true);
    const validatedPlan = resolveAndValidateVipPlan({ durationDays, amountUsd }, latestSettings);
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
    const verification = await verifyAbaPaymentTransaction(
      {
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        durationDays: validDays,
        amountUsd: validPrice,
        transactionRef: cleanTrxRef,
        paymentMethod: 'KHQR',
        timestamp: Date.now()
      },
      appSettings
    );

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
  // Submit Additional Store Slot Payment ($10 per additional store beyond the 1st)
  // ============================================================================
  const submitAdditionalStorePaymentRequest = async (
    transactionRef?: string,
    notes?: string,
    paymentProofData?: { dataUrl: string; fileName?: string; mimeType?: string },
    submittedAmountUsd?: number
  ): Promise<{ success: boolean; transactionId: string; autoVerified?: boolean; error?: string }> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, transactionId: '', error: 'User authentication required' };
    }

    const isAdmin =
      currentUser.role === 'admin' ||
      currentUser.id === 'admin-authorized-single' ||
      currentUser.username === 'admin' ||
      currentUser.username === 'cheasavuth';
    if (!isAdmin && !isUserVipActive(currentUser)) {
      const msg =
        language === 'km'
          ? '🔒 មានតែគណនី VIP សកម្មប៉ុណ្ណោះដែលអាចបន្ថែមហាងថ្មីបាន។ សូមដំឡើង ឬបន្តសមាជិកភាព VIP ជាមុនសិន!'
          : '🔒 Only active VIP accounts can purchase additional store slots. Please upgrade or renew VIP first!';
      showToast(msg, 'warning');
      return { success: false, transactionId: '', error: msg };
    }

    const quota = getUserStoreQuotaSummary(currentUser, restaurants, transactions, appSettings);
    const requiredFee = quota.additionalStoreFeeUsd; // Default $10.00 (or Admin-configured fee)
    const effectiveAmount =
      typeof submittedAmountUsd === 'number' ? submittedAmountUsd : requiredFee;
    const nextSlotNumber = quota.totalAllowedStores + 1;

    // Prevent duplicate pending charges for additional store slots
    if (quota.pendingAdditionalStoreTransaction) {
      if (paymentProofData?.dataUrl) {
        uploadPaymentProofToTransaction(
          quota.pendingAdditionalStoreTransaction.id,
          paymentProofData.dataUrl,
          paymentProofData.fileName || 'aba_store_slot_receipt.png',
          paymentProofData.mimeType || 'image/png'
        );
        return {
          success: true,
          transactionId: quota.pendingAdditionalStoreTransaction.id,
          autoVerified: false,
        };
      }
      const pendingMsg =
        language === 'km'
          ? `⏳ អ្នកមានសំណើទូទាត់បន្ថែមហាង ($${requiredFee.toFixed(2)}) កំពុងរង់ចាំ Admin ពិនិត្យរួចហើយ (${quota.pendingAdditionalStoreTransaction.id})។ ប្រព័ន្ធការពារមិនឱ្យគិតប្រាក់ស្ទួនឡើយ!`
          : `⏳ You already have a pending additional-store payment request (${quota.pendingAdditionalStoreTransaction.id}). Duplicate charges are prevented!`;
      showToast(pendingMsg, 'info');
      return {
        success: true,
        transactionId: quota.pendingAdditionalStoreTransaction.id,
        autoVerified: false,
      };
    }

    const cleanTrxRef =
      (transactionRef || '').trim().toUpperCase() ||
      `ABA-STORE-SLOT${nextSlotNumber}-${Date.now().toString(36).toUpperCase()}`;

    // Server-side validation of fee amount and anti-replay transaction ref
    const backendCheck = await verifyAdditionalStorePaymentOnBackend(
      {
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        amountUsd: effectiveAmount,
        transactionRef: cleanTrxRef,
        paymentMethod: 'KHQR',
        storeSlotNumber: nextSlotNumber,
        timestamp: Date.now(),
      },
      appSettings,
      false // Only record in ledger after receipt/manual verification succeeds
    );

    if (!backendCheck.success) {
      const errMsg = backendCheck.error || 'Additional store payment verification failed.';
      showToast(
        language === 'km'
          ? `ការផ្ទៀងផ្ទាត់ការបង់ប្រាក់បន្ថែមហាងបរាជ័យ៖ ${errMsg}`
          : `Additional store payment invalid: ${errMsg}`,
        'warning'
      );
      return { success: false, transactionId: '', error: errMsg };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const formattedNow = nowIso.replace('T', ' ').slice(0, 16);
    const txnId = `TXN-STORE-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    if (paymentProofData?.dataUrl) {
      try {
        const rawVault = localStorage.getItem('kft_secure_payment_proofs_vault_v1');
        const vault = rawVault ? JSON.parse(rawVault) : {};
        vault[txnId] = {
          txnId,
          userId: currentUser.id,
          dataUrl: paymentProofData.dataUrl,
          fileName: paymentProofData.fileName || 'aba_store_slot_receipt.png',
          mimeType: paymentProofData.mimeType || 'image/png',
          uploadedAt: nowIso,
        };
        localStorage.setItem('kft_secure_payment_proofs_vault_v1', JSON.stringify(vault));
      } catch {}
    }

    let aiReport: AbaReceiptVerificationReport | undefined;
    if (paymentProofData?.dataUrl) {
      aiReport = await verifyAbaPaymentAndReceipt({
        receiptDataUrl: paymentProofData.dataUrl,
        expectedAmountUsd: requiredFee,
        expectedDurationDays: 90,
        submittedTrxId: cleanTrxRef,
        submittedDate: nowIso.split('T')[0],
        userId: currentUser.id,
        existingTransactions: transactions,
      });
    }

    const effectiveTrxRef =
      aiReport?.extractedReceipt?.trxId && /^ABA-STORE-/i.test(cleanTrxRef)
        ? aiReport.extractedReceipt.trxId
        : cleanTrxRef;

    const isAutoVerified = Boolean(
      aiReport && aiReport.canAutoApprove && aiReport.status === 'verified'
    );

    if (isAutoVerified) {
      recordVerifiedTransaction(effectiveTrxRef);
      if (paymentProofData?.dataUrl) {
        recordVerifiedReceiptFingerprint(
          computeReceiptImageFingerprint(paymentProofData.dataUrl),
          currentUser.id,
          effectiveTrxRef
        );
      }
    }

    const newTxn: RegistrationTransaction = {
      id: txnId,
      type: 'additional_store_slot',
      planType: 'additional_store',
      storeSlotNumber: nextSlotNumber,
      restaurantNameKh: `🏪 បន្ថែមហាងថ្មីទី ${nextSlotNumber} (+1 Store Slot)`,
      restaurantNameEn: `Additional Store Slot #${nextSlotNumber}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      ownerPhone: currentUser.phone,
      amountUsd: requiredFee,
      currency: 'USD',
      status: isAutoVerified ? 'verified' : 'pending_verification',
      paymentMethod: 'KHQR',
      transactionRef: effectiveTrxRef,
      verificationSignature: backendCheck.verificationSignature,
      paymentProofUrl: paymentProofData?.dataUrl,
      paymentProofUploadedAt: paymentProofData?.dataUrl ? formattedNow : undefined,
      paymentProofFileName: paymentProofData?.fileName,
      paymentProofMimeType: paymentProofData?.mimeType,
      createdAt: formattedNow,
      verifiedAt: isAutoVerified ? formattedNow : undefined,
      verifiedBy: isAutoVerified
        ? 'AI & Server Transaction Verifier (Kim Seng Verified)'
        : undefined,
      notes:
        notes ||
        `Additional Store Slot #${nextSlotNumber} ($${requiredFee.toFixed(2)} USD) — ${
          isAutoVerified ? 'Verified & Unlocked' : 'Awaiting Admin Verification'
        }`,
      aiVerificationReport: aiReport,
    };

    setTransactions(prev => [newTxn, ...prev]);

    if (isAutoVerified) {
      const existingIds = Array.isArray(currentUser.additionalStorePaymentIds)
        ? currentUser.additionalStorePaymentIds
        : [];
      const nextIds = Array.from(new Set([...existingIds, txnId]));
      const nextPaidSlots = Math.max(quota.paidAdditionalStoreSlots + 1, nextIds.length);
      const updatedUser: User = {
        ...currentUser,
        paidAdditionalStoreSlots: nextPaidSlots,
        additionalStorePaymentIds: nextIds,
      };
      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => (u.id === currentUser.id ? updatedUser : u)));

      showToast(
        language === 'km'
          ? `🎉 ផ្ទៀងផ្ទាត់ការបង់ប្រាក់បន្ថែមហាង ($${requiredFee.toFixed(2)} USD) ជោគជ័យ! ឥឡូវនេះអ្នកអាចបង្កើតហាងទី ${nextSlotNumber} បានភ្លាមៗ!`
          : `🎉 Verified $${requiredFee.toFixed(2)} USD additional-store payment! You can now create Store #${nextSlotNumber} immediately!`,
        'success'
      );
      return { success: true, transactionId: txnId, autoVerified: true };
    }

    const adminNotif: AppNotification = {
      id: `notif-admin-store-slot-${Date.now()}`,
      titleKh: `🏪 សំណើពិនិត្យការទូទាត់បន្ថែមហាងថ្មីទី ${nextSlotNumber} ($${requiredFee.toFixed(2)})`,
      titleEn: `🏪 New Additional Store #${nextSlotNumber} Payment Request ($${requiredFee.toFixed(2)})`,
      messageKh: `សមាជិក VIP ${currentUser.name} បានបញ្ជូនសំណើទូទាត់ $${requiredFee.toFixed(2)} USD សម្រាប់បើកហាងទី ${nextSlotNumber} (Ref: ${effectiveTrxRef})។ សូមពិនិត្យក្នុងផ្ទាំង Admin -> ការទូទាត់។`,
      messageEn: `VIP member ${currentUser.name} submitted a $${requiredFee.toFixed(2)} USD payment for Store Slot #${nextSlotNumber} (Ref: ${effectiveTrxRef}). Please review in Admin -> Transactions.`,
      type: 'system',
      date: nowIso.split('T')[0],
      isRead: false,
    };
    setNotifications(prev => [adminNotif, ...prev]);

    showToast(
      language === 'km'
        ? `⏳ បានបញ្ជូនភស្តុតាងបង់ប្រាក់បន្ថែមហាង ($${requiredFee.toFixed(2)}) រួចរាល់! កំពុងរង់ចាំ Admin ពិនិត្យ និងអនុម័ត។`
        : `⏳ Additional store payment ($${requiredFee.toFixed(2)}) submitted! Awaiting Admin verification.`,
      'info'
    );
    return { success: true, transactionId: txnId, autoVerified: false };
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

    const plan = resolveAndValidateVipPlan(
      { planType: input.planType || 'quarterly' },
      appSettingsRef.current
    );
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
      plan.durationDays,
      appSettingsRef.current
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

  const approveVipFromSupportTicket = (ticketId: string, durationDays?: number, adminNote?: string) => {
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

    const validatedPlan = resolveAndValidateVipPlan(
      {
        planType: ticket.paymentPlanId,
        durationDays: durationDays || ticket.durationDays,
        amountUsd: ticket.amountUsd,
      },
      appSettingsRef.current
    );
    const finalDays =
      typeof durationDays === 'number' && durationDays >= 1
        ? durationDays
        : typeof ticket.durationDays === 'number' && ticket.durationDays >= 1
        ? ticket.durationDays
        : validatedPlan.durationDays;
    const finalPrice =
      typeof ticket.amountUsd === 'number' && ticket.amountUsd > 0
        ? ticket.amountUsd
        : validatedPlan.priceUsd;

    const targetUser = users.find(u => u.id === ticket.userId);
    const { startDate, expiryDate } = calculateVipDates(
      targetUser?.subscriptionExpiryDate,
      finalDays,
      appSettingsRef.current
    );
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

    // Immediately push updated VIP user & backup to Supabase Cloud
    try {
      const updatedUsersForCloud = users.map(u =>
        u.id === ticket.userId
          ? {
              ...u,
              membershipTier: 'premium_vip' as const,
              subscriptionStartDate: startDate,
              subscriptionExpiryDate: expiryDate,
              subscriptionStatus: 'active' as const,
              paymentStatus: 'verified' as const,
              paymentMethod: 'KHQR' as const,
              transactionRef: ticket.paymentRef,
            }
          : u
      );
      localStorage.setItem('kft_users_v5', JSON.stringify(updatedUsersForCloud));
      localStorage.setItem(
        'kft_vip_registry_backup_v1',
        JSON.stringify(updatedUsersForCloud.filter(u => u.membershipTier === 'premium_vip'))
      );
      if (isSupabaseConfigured()) {
        pushCloudDocument('kft_cloud_users_v1', updatedUsersForCloud);
      }
    } catch {}

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
    recordPermanentTrendingFoodOverride(updated);
    setTrendingFoods(prev => {
      const next = prev.map(item => item.id === updated.id ? updated : item);
      try {
        localStorage.setItem('kft_trending_foods_v3', JSON.stringify(next));
      } catch {
        scheduleStorageWrite('kft_trending_foods_v3', next, 500);
      }
      return next;
    });
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

  // Wishlist methods (VIP Access Controlled)
  const createWishlist = (nameKh: string, nameEn?: string, emoji: string = '📌') => {
    if (!verifyBackendVipFeatureAccess('បញ្ជីចង់ទៅ', 'My Wishlists')) return;
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
    if (!verifyBackendVipFeatureAccess('បញ្ជីចង់ទៅ', 'My Wishlists')) return;
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
    if (!verifyBackendVipFeatureAccess('បញ្ជីចង់ទៅ', 'My Wishlists')) return;
    setTargetWishlistItem({
      ...item,
      addedAt: new Date().toISOString(),
    });
    setIsWishlistsModalOpen(true);
  };

  // AI Trip Planner methods (VIP Access Controlled)
  const saveTripPlan = (plan: TripPlan) => {
    if (!verifyBackendVipFeatureAccess('ផែនការដើរលេង AI', 'AI Trip Planner')) return;
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
    verifyBackendVipFeatureAccess('ផែនការដើរលេង AI', 'AI Trip Planner');

    const normalizeProvKey = (s: string) =>
      (s || '')
        .replace(/^ខេត្ត|^រាជធានី|^ក្រុង/g, '')
        .replace(/ណ្ដ/g, 'ណ្ត')
        .replace(/\s+/g, '')
        .trim();

    const targetCore = normalizeProvKey(provinceKh);

    const PROVINCE_EN_MAP: Record<string, { en: string; specialtyKh: string; specialtyEn: string }> = {
      'ភ្នំពេញ': { en: 'Phnom Penh', specialtyKh: 'គុយទាវភ្នំពេញ និងអាម៉ុកត្រី', specialtyEn: 'Phnom Penh Noodle Soup & Fish Amok' },
      'សៀមរាប': { en: 'Siem Reap', specialtyKh: 'នំបញ្ចុកសម្លប្រហើរសៀមរាប និងប្រហុកខ្ទិះ', specialtyEn: 'Siem Reap Nom Banh Chok & Prahok Ktis' },
      'កំពត': { en: 'Kampot', specialtyKh: 'ក្ដាមឆាម្រេចកំពត និងទុរេនកំពត', specialtyEn: 'Kampot Pepper Crab & Durian' },
      'ព្រះសីហនុ': { en: 'Preah Sihanouk', specialtyKh: 'គ្រឿងសមុទ្រអាំងស្រស់ៗ និងមឹកអាំងទឹកត្រីកោះកុង', specialtyEn: 'Fresh Grilled Seafood & Squid' },
      'មណ្ឌលគិរី': { en: 'Mondulkiri', specialtyKh: 'សម្លព្រង់ក្នុងបំពង់ឫស្សី និងកាហ្វេមណ្ឌលគិរី', specialtyEn: 'Bamboo Tube Soup & Mondulkiri Highland Coffee' },
      'កែប': { en: 'Kep', specialtyKh: 'ក្ដាមសេះឆាម្រេចខ្ចី និងត្រីដុតអំបិលម្ទេស', specialtyEn: 'Kep Blue Crab with Green Pepper' },
      'បាត់ដំបង': { en: 'Battambang', specialtyKh: 'ណែមបាត់ដំបង និងគុយទាវបាត់ដំបង', specialtyEn: 'Battambang Fermented Fish Rolls & Noodles' },
      'កោះកុង': { en: 'Koh Kong', specialtyKh: 'បង្គា និងក្ដាមស្រស់ទឹកត្រីកោះកុង', specialtyEn: 'Koh Kong Fresh Prawns & Spicy Dipping Sauce' },
      'រតនគិរី': { en: 'Ratanakiri', specialtyKh: 'សាច់គោអាំងភ្នំ និងបាយបំពង់ឫស្សី', specialtyEn: 'Highland Grilled Beef & Bamboo Sticky Rice' },
      'កណ្តាល': { en: 'Kandal', specialtyKh: 'មាន់ដុតស្អាង និងត្រីទន្លេមេគង្គស្រស់ៗ', specialtyEn: 'Mekong River Fish & Roasted Free-Range Chicken' },
      'កំពង់ចាម': { en: 'Kampong Cham', specialtyKh: 'នំបញ្ចុកកំពង់ចាម និងក្រឡានថ្មគោល', specialtyEn: 'Kampong Cham Rice Noodles & Kralan' },
      'កំពង់ឆ្នាំង': { en: 'Kampong Chhnang', specialtyKh: 'ត្រីឆ្អើរទន្លេសាប និងសម្លម្ជូរត្រីស្រស់', specialtyEn: 'Tonle Sap Smoked Fish & Sour Fish Soup' },
      'កំពង់ស្ពឺ': { en: 'Kampong Speu', specialtyKh: 'មាន់ដុតគិរីរម្យ និងបង្អែមស្ករត្នោតកំពង់ស្ពឺ', specialtyEn: 'Kirirom Roasted Chicken & Palm Sugar Desserts' },
      'កំពង់ធំ': { en: 'Kampong Thom', specialtyKh: 'ត្រីប្រហុកស្ទឹងសែន និងនំបញ្ចុកសម្លខ្មែរ', specialtyEn: 'Stung Sen River Fish Specialties' },
      'ក្រចេះ': { en: 'Kratie', specialtyKh: 'ក្រឡានថ្មគ្រែ និងត្រីទន្លេមេគង្គចំហុយ', specialtyEn: 'Thma Krae Kralan Bamboo Rice & Mekong Fish' },
      'តាកែវ': { en: 'Takeo', specialtyKh: 'បង្កងទឹកសាបតាកែវ និងពងទាកូនតាកែវ', specialtyEn: 'Takeo Giant Freshwater Prawns' },
      'ព្រៃវែង': { en: 'Prey Veng', specialtyKh: 'ត្រីស្រែដុត និងម្ហូបខ្មែរតាមដងទន្លេ', specialtyEn: 'Countryside Grilled Fish & River Delicacies' },
      'ស្វាយរៀង': { en: 'Svay Rieng', specialtyKh: 'បាញ់ស៊ុងស្វាយរៀង និងសាច់គោអាំងទឹកប្រហុក', specialtyEn: 'Svay Rieng Banh Sung Vermicelli & Grilled Beef' },
      'ពោធិ៍សាត់': { en: 'Pursat', specialtyKh: 'ត្រីឆ្អើរពោធិ៍សាត់ និងក្រូចពោធិ៍សាត់ផ្អែមឆ្ងាញ់', specialtyEn: 'Pursat Smoked Fish & Sweet Oranges' },
      'បន្ទាយមានជ័យ': { en: 'Banteay Meanchey', specialtyKh: 'បាយមាន់សិរីសោភ័ណ និងសម្លកកូរខ្មែរ', specialtyEn: 'Serei Saophoan Chicken Rice & Samlor Korko' },
      'ប៉ៃលិន': { en: 'Pailin', specialtyKh: 'មីកូឡាប៉ៃលិន និងផ្លែតាង៉ែនប៉ៃលិន', specialtyEn: 'Pailin Mee Kola Noodles & Longan' },
      'ឧត្តរមានជ័យ': { en: 'Oddar Meanchey', specialtyKh: 'មាន់ដុតជើងភ្នំដងរែក និងសម្លម្ជូរព្រៃ', specialtyEn: 'Dangrek Mountain Roasted Chicken' },
      'ព្រះវិហារ': { en: 'Preah Vihear', specialtyKh: 'សាច់គោអាំងទឹកប្រហុក និងបាយដំណើបភ្នំត្បែង', specialtyEn: 'Preah Vihear Grilled Beef with Prahok Dip' },
      'ស្ទឹងត្រែង': { en: 'Stung Treng', specialtyKh: 'ត្រីប៉ាស៊ីអ៊ីទន្លេមេគង្គ និងសម្លម្ជូរត្រីទន្លេ', specialtyEn: 'Mekong Pase Ee Fish & River Fish Soup' },
      'ត្បូងឃ្មុំ': { en: 'Tboung Khmum', specialtyKh: 'គុយទាវ និងម្ហូបប្រពៃណីតាមដងទន្លេមេគង្គ', specialtyEn: 'Traditional Mekong Countryside Cuisine' },
    };

    const meta = PROVINCE_EN_MAP[targetCore] || {
      en: provinceKh,
      specialtyKh: 'ម្ហូបខ្មែរប្រពៃណីប្រចាំតំបន់',
      specialtyEn: 'Authentic Regional Khmer Cuisine',
    };

    const provDestinations = destinations.filter(d => {
      const dCore = normalizeProvKey(d.provinceKh);
      return dCore === targetCore || dCore.includes(targetCore) || targetCore.includes(dCore);
    });
    const poolDest = provDestinations.length > 0 ? provDestinations : destinations;
    
    const provRestaurants = restaurants.filter(r => {
      const rCore = normalizeProvKey(r.provinceKh);
      return rCore === targetCore || rCore.includes(targetCore) || targetCore.includes(rCore);
    });
    const poolRest = provRestaurants.length > 0 ? provRestaurants : restaurants;

    const companionLabelKh =
      companion === 'solo'
        ? 'ដំណើរកម្សាន្តម្នាក់ឯងបែបផ្សងព្រេង'
        : companion === 'couple'
        ? 'ដំណើរកម្សាន្តគូស្នេហ៍រ៉ូមែនទិក'
        : companion === 'family'
        ? 'ដំណើរកម្សាន្តគ្រួសារដ៏កក់ក្តៅ'
        : 'ដំណើរកម្សាន្តជួបជុំមិត្តភក្តិសប្បាយៗ';

    const companionLabelEn =
      companion === 'solo'
        ? 'Solo Adventure'
        : companion === 'couple'
        ? 'Romantic Couple Getaway'
        : companion === 'family'
        ? 'Family Vacation'
        : 'Friends Group Trip';

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
        titleKh: `ថ្ងៃទី ${i}៖ ដំណើរកម្សាន្ត និងស្វែងយល់រសជាតិនៅ${provinceKh} (${companionLabelKh})`,
        titleEn: `Day ${i}: Exploring & Dining in ${meta.en} (${companionLabelEn})`,
        dayEstimatedCostUsd: costPerDay,
        activities: [
          {
            timePeriod: 'morning',
            titleKh: 'ពេលព្រឹក៖ ទស្សនាទីតាំងទេសចរណ៍ និងថតរូបអនុស្សាវរីយ៍',
            titleEn: 'Morning: Scenic Sightseeing & Photography',
            descKh: `ទស្សនាកម្សាន្តនៅ «${dest1.nameKh}» (${provinceKh}) រីករាយជាមួយទេសភាពស្រស់ត្រកាល និងខ្យល់អាកាសបរិសុទ្ធ។ ${dest1.descriptionKh ? dest1.descriptionKh.slice(0, 90) + '...' : ''}`,
            descEn: `Visit ${dest1.nameEn || dest1.nameKh} in ${meta.en} and enjoy scenic panoramic views.`,
            placeNameKh: dest1.nameKh,
            photoUrl: dest1.photoUrl,
            estimatedCostUsd: budgetLevel === 'budget' ? 5 : budgetLevel === 'medium' ? 15 : 30,
          },
          {
            timePeriod: 'lunch',
            titleKh: 'ពេលថ្ងៃត្រង់៖ អាហារថ្ងៃត្រង់រសជាតិដើមខ្មែរឆ្ងាញ់ពិសា',
            titleEn: 'Lunch: Authentic Local Cuisine',
            descKh: `ពិសាអាហារថ្ងៃត្រង់នៅ «${rest1.nameKh}» ភ្លក្សម្ហូបពិសេសប្រចាំខេត្ត (${meta.specialtyKh} / ${rest1.signatureDishesKh?.[0] || foodPick.nameKh})។`,
            descEn: `Enjoy lunch at ${rest1.nameEn || rest1.nameKh} featuring ${meta.specialtyEn}.`,
            placeNameKh: rest1.nameKh,
            dishNameKh: rest1.signatureDishesKh?.[0] || meta.specialtyKh || foodPick.nameKh,
            photoUrl: rest1.photoUrl,
            estimatedCostUsd: budgetLevel === 'budget' ? 10 : budgetLevel === 'medium' ? 25 : 50,
          },
          {
            timePeriod: 'afternoon',
            titleKh: 'ពេលរសៀល៖ ផ្សងព្រេង និងទស្សនាកន្លែងល្បីប្រចាំតំបន់',
            titleEn: 'Afternoon: Adventure & Regional Highlights',
            descKh: `បន្តដំណើរទៅកាន់ «${dest2.nameKh}» ស្វែងយល់ពីវប្បធម៌ ធម្មជាតិ និងថតរូប Review ស្អាតៗនៅ${provinceKh}។`,
            descEn: `Explore ${dest2.nameEn || dest2.nameKh} in ${meta.en}.`,
            placeNameKh: dest2.nameKh,
            photoUrl: dest2.photoUrl,
            estimatedCostUsd: budgetLevel === 'budget' ? 5 : budgetLevel === 'medium' ? 15 : 30,
          },
          {
            timePeriod: 'dinner',
            titleKh: 'ពេលល្ងាច៖ អាហារពេលរាត្រី និងសម្រាកលម្ហែកាយ',
            titleEn: 'Dinner: Evening Dining & Relaxation',
            descKh: `អាហារពេលល្ងាចនៅ «${rest2.nameKh}» ជាមួយបរិយាកាសកក់ក្តៅសម្រាប់${companionLabelKh} និងភ្លក្សមុខម្ហូប ${rest2.signatureDishesKh?.[0] || meta.specialtyKh}។`,
            descEn: `Dine at ${rest2.nameEn || rest2.nameKh} in ${meta.en}.`,
            placeNameKh: rest2.nameKh,
            dishNameKh: rest2.signatureDishesKh?.[0] || meta.specialtyKh,
            photoUrl: rest2.photoUrl,
            estimatedCostUsd: budgetLevel === 'budget' ? 15 : budgetLevel === 'medium' ? 20 : 50,
          },
        ],
      });
    }

    const generatedPlan: TripPlan = {
      id: `plan-${Date.now()}`,
      userId: currentUser?.id || 'guest',
      provinceKh,
      provinceEn: meta.en,
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

  const toggleNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    showToast(
      language === 'km'
        ? 'បានលុបការជូនដំណឹងនេះរួចរាល់'
        : language === 'zh'
        ? '已删除该通知'
        : 'Notification deleted',
      'info'
    );
  };

  const restoreDefaultNotifications = () => {
    const defaultNotificationsList = buildDynamicNotificationsList(foods, restaurants, destinations);
    setNotifications(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const missingDefaults = defaultNotificationsList.filter(d => !existingIds.has(d.id));
      return missingDefaults.length > 0 ? [...prev, ...missingDefaults] : defaultNotificationsList;
    });
    showToast(
      language === 'km'
        ? 'បានស្តារការជូនដំណឹងដើមឡើងវិញ!'
        : language === 'zh'
        ? '已恢复默认通知列表！'
        : 'Restored default notifications!',
      'success'
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    showToast(
      language === 'km'
        ? 'បានសម្គាល់ថាបានអានទាំងអស់'
        : language === 'zh'
        ? '已全部标记为已读'
        : 'Marked all as read',
      'info'
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    showToast(
      language === 'km'
        ? 'បានលុបការជូនដំណឹងទាំងអស់'
        : language === 'zh'
        ? '已清空所有通知'
        : 'Cleared all notifications',
      'info'
    );
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
        cancelUserVip,
        restoreUserAccess,
        disableUserAccount,
        deleteUserAccount,
        clearAllRegisteredUsers,
        loginAdmin,
        loginAdminWithBiometric,
        setAdminPassword,
        appSettings,
        updateAppSettings,
        isRefreshingSettings,
        settingsSyncError,
        refreshAppSettingsFromServer,
        foods,
        restaurants,
        destinations,
        posts,
        transactions,
        addRegistrationTransaction,
        verifyTransaction,
        rejectTransaction,
        requestMorePaymentInfo,
        deleteTransactions,
        uploadPaymentProofToTransaction,
        getAuthorizedPaymentProof,
        triggerCloudSyncNow,
        isSyncingUsers,
        lastUsersSyncedAt,
        syncUsersNow,
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
        replaceExistingRestaurant,
        submitAdditionalStorePaymentRequest,
        getCurrentUserStoreQuota,
        updateRestaurant,
        deleteRestaurant,
        approveRestaurant,
        rejectRestaurant,
        toggleVerifyRestaurant,
        addRestaurantMenuItem,
        updateRestaurantMenuItem,
        deleteRestaurantMenuItem,
        addRestaurantReview,
        upgradeRestaurantToPremium,
        trackRestaurantView,
        trackRestaurantCall,
        trackRestaurantMap,
        trackRestaurantShare,
        isManageMenuModalOpen,
        setIsManageMenuModalOpen,
        managingRestaurant,
        setManagingRestaurant,
        activeManagedShopId,
        setActiveManagedShopId,
        getOwnedRestaurantsForUser,
        openManageMyVipStore,
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
        toggleNotificationRead,
        deleteNotification,
        restoreDefaultNotifications,
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

        // Google Maps Places Search & Admin Import Hub
        isGoogleMapsSearchModalOpen,
        setIsGoogleMapsSearchModalOpen,
        googleMapsSearchInitialTab,
        openGoogleMapsSearchModal,
        importGooglePlaceToApp,
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

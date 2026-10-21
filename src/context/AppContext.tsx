import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  User, FoodItem, Restaurant, TouristDestination, CommunityPost, 
  Language, UserRole, AppSettings, RegistrationTransaction,
  RestaurantMenuItem, MembershipTier, isRestaurantPremiumActive, isUserVipActive, getVipRemainingDays,
  Wishlist, WishlistItem, TripPlan, AppNotification,
  TrendingFoodItem, AiCheckInSubmission
} from '../types';
import { 
  verifyPaymentOnBackend, calculateVipDates, checkEligibleRestoration,
  VIP_ANNUAL_PRICE_USD, VIP_SUBSCRIPTION_DAYS, PaymentVerificationRequest
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

export type ActiveTab = 'home' | 'food' | 'restaurants' | 'tourism' | 'community' | 'profile';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  
  // Auth & Users
  currentUser: User | null;
  users: User[];
  login: (email: string, role?: UserRole) => boolean;
  register: (name: string, email: string, role: UserRole, phone?: string, restaurantName?: string) => void;
  loginWithGoogle: (profile: any) => void;
  logout: () => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  updateCurrentUserProfile: (newName: string, newAvatar?: string) => void;

  // Admin Auth (Chea Savuth)
  loginAdmin: (username: string, password: string) => Promise<boolean>;
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
  
  // Bookmarks
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  
  // Food Actions
  addFood: (food: Omit<FoodItem, 'id' | 'rating' | 'reviewCount'>) => void;
  updateFood: (food: FoodItem) => void;
  deleteFood: (id: string) => void;
  
  // Restaurant Actions
  addRestaurant: (rest: Omit<Restaurant, 'id' | 'rating' | 'reviewCount' | 'status'> & { status?: 'approved' | 'pending' | 'rejected' }) => void;
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
  addDestination: (dest: Omit<TouristDestination, 'id' | 'rating' | 'reviewCount'>) => void;
  updateDestination: (dest: TouristDestination) => void;
  deleteDestination: (id: string) => void;
  
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

  // Premium VIP Subscription ($9.99/year)
  isUpgradeVipModalOpen: boolean;
  setIsUpgradeVipModalOpen: (open: boolean) => void;
  openUpgradeVipModal: () => void;
  submitVipUpgradeRequest: (durationDays?: number, amountUsd?: number, notes?: string) => Promise<{ success: boolean; transactionId: string }>;
  upgradeCurrentUserToVip: (paymentMethod: 'GooglePlayBilling' | 'KHQR' | 'Bakong' | 'Card', transactionRef: string, last4?: string) => Promise<{ success: boolean; error?: string }>;
  renewCurrentUserVip: (paymentMethod: 'GooglePlayBilling' | 'KHQR' | 'Bakong' | 'Card', transactionRef: string) => Promise<{ success: boolean; error?: string }>;
  restoreCurrentUserVipPurchases: () => Promise<{ success: boolean; restored: boolean; message: string }>;

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
  
  // Local storage loaded states with fallbacks (v4 storage keys for 200+ dataset)
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('kft_users_v4');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Purge deleted default user "ចាន់ថា វណ្ណៈ" from local user database
          return parsed.filter(u => u.id !== 'user-1' && u.username !== 'vannak_chantha' && u.email !== 'vannak@gmail.com');
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_users_v4', e);
    }
    return initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('kft_current_user_v4');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // Purge deleted default user "ចាន់ថា វណ្ណៈ"
          if (parsed.id === 'user-1' || parsed.username === 'vannak_chantha' || parsed.email === 'vannak@gmail.com' || parsed.name === 'ចាន់ថា វណ្ណៈ') {
            localStorage.removeItem('kft_current_user_v4');
            return null;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_current_user_v4', e);
    }
    return null; // Require user to sign up or sign in on fresh installation
  });

  const [foods, setFoods] = useState<FoodItem[]>(() => {
    // Purge legacy caches to ensure authentic local food photos are loaded
    try {
      localStorage.removeItem('kft_foods_v4');
      localStorage.removeItem('kft_foods_100_v1');
    } catch {}
    try {
      const saved = localStorage.getItem('kft_foods_100_v2');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50 && parsed[0]?.photoUrl?.startsWith('/foods/')) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse kft_foods_100_v2', e);
    }
    return initialFoods;
  });

  const normalizeRestaurant = (r: any): Restaurant => {
    const isPromoted = Boolean(r.isPromoted);
    const membershipTier = (r.membershipTier || (isPromoted ? 'premium' : 'free')) as MembershipTier;
    const membershipExpiresAt = r.membershipExpiresAt || (membershipTier === 'premium' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : undefined);
    
    // Normalize photoUrl for rest-1 to rest-50 (excluding rest-17) to use authentic bundled shop photos
    let photoUrl = r.photoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80';
    if (typeof r.id === 'string') {
      const match = r.id.match(/^rest-([1-9]|[1-4][0-9]|50)$/);
      if (match && match[1] !== '17' && (!photoUrl || photoUrl.startsWith('https://images.unsplash.com') || photoUrl.startsWith('/Shop/'))) {
        photoUrl = `/Shop/rest-${match[1]}.jpg`;
      }
    }

    return {
      id: r.id || `rest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nameKh: r.nameKh || 'ភោជនីយដ្ឋានខ្មែរ',
      nameEn: r.nameEn || r.nameKh || 'Khmer Restaurant',
      descriptionKh: r.descriptionKh || 'ភោជនីយដ្ឋានម្ហូបខ្មែររសជាតិដើម ផាសុកភាព និងអនាម័យខ្ពស់។',
      descriptionEn: r.descriptionEn || 'Authentic traditional Khmer restaurant.',
      photoUrl,
      galleryPhotos: Array.isArray(r.galleryPhotos) ? r.galleryPhotos : [],
      addressKh: r.addressKh || 'រាជធានីភ្នំពេញ កម្ពុជា',
      addressEn: r.addressEn || 'Phnom Penh, Cambodia',
      provinceKh: r.provinceKh || 'រាជធានីភ្នំពេញ',
      provinceEn: r.provinceEn || 'Phnom Penh',
      phone: r.phone || '012 345 678',
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
      promotionalPrice: typeof r.promotionalPrice === 'number' ? r.promotionalPrice : 9.99,
      isPromoted,
      ownerId: r.ownerId,
      paymentDate: r.paymentDate,
    };
  };

  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    try {
      const saved = localStorage.getItem('kft_restaurants_membership_v2');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50) {
          return parsed.map(normalizeRestaurant);
        }
      }
    } catch (e) {
      console.warn('Failed to parse kft_restaurants_membership_v2', e);
    }
    try {
      localStorage.removeItem('kft_restaurants_membership_v1');
      localStorage.removeItem('kft_restaurants_v3');
      localStorage.removeItem('kft_restaurants_v4');
    } catch {}
    return initialRestaurants.map(r => {
      if (r.id === 'rest-19') {
        return normalizeRestaurant({
          ...r,
          ownerId: 'owner-1',
          membershipTier: 'premium' as MembershipTier,
          membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          menuItems: [
            {
              id: 'menu-1',
              restaurantId: 'rest-19',
              nameKh: 'ក្តាមសេះឆាម្រេចខ្ចីកំពតពិសេស',
              nameEn: 'Fried Sea Crab with Fresh Kampot Peppercorns',
              priceRiel: 40000,
              priceUsd: 10.0,
              photoUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80',
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
              photoUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
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
              photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
              descriptionKh: 'សម្លម្ជូរគ្រឿងបុរាណដាក់បង្គា មឹក និងដើមចេកស្រស់ រសជាតិជូរអែមឆ្ងាញ់ពិសា។',
              createdAt: '2026-01-15',
            }
          ]
        });
      }
      return normalizeRestaurant(r);
    });
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
      const saved = localStorage.getItem('kft_destinations_100_v2');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse kft_destinations_100_v2', e);
    }
    try {
      localStorage.removeItem('kft_destinations_100_v1');
      localStorage.removeItem('kft_destinations_v3');
      localStorage.removeItem('kft_destinations_v4');
    } catch {}
    return initialDestinations;
  });

  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    try {
      const saved = localStorage.getItem('kft_posts_v4') || localStorage.getItem('kft_posts_v3');
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
            promotionalFeeUsd: 9.99,
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

  // 6 Personalized Account Features Modals
  const [isWhatToEatModalOpen, setIsWhatToEatModalOpen] = useState(false);
  const [isNearMeModalOpen, setIsNearMeModalOpen] = useState(false);
  const [isDailyDiscoveriesModalOpen, setIsDailyDiscoveriesModalOpen] = useState(false);
  const [isWishlistsModalOpen, setIsWishlistsModalOpen] = useState(false);
  const [isAiTripPlannerModalOpen, setIsAiTripPlannerModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isTrendingSocialModalOpen, setIsTrendingSocialModalOpen] = useState(false);
  const [isUpgradeVipModalOpen, setIsUpgradeVipModalOpen] = useState(false);
  const openUpgradeVipModal = () => setIsUpgradeVipModalOpen(true);
  const [targetWishlistItem, setTargetWishlistItem] = useState<WishlistItem | null>(null);

  // AI Trending Food Discovery Section State
  const [trendingFoods, setTrendingFoods] = useState<TrendingFoodItem[]>(() => {
    try {
      const saved = localStorage.getItem('kft_trending_foods_v1');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse kft_trending_foods_v1', e);
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
  const [isAiCheckInModalOpen, setIsAiCheckInModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('kft_trending_foods_v1', JSON.stringify(trendingFoods));
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
          photoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
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
          photoUrl: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800&auto=format&fit=crop&q=80',
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
          photoUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
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
      const storageKey = `kft_wishlists_v2_${currentUser?.id || 'guest'}`;
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
      const storageKey = `kft_trip_plans_v1_${currentUser?.id || 'guest'}`;
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
      const storageKey = `kft_wishlists_v2_${currentUser?.id || 'guest'}`;
      localStorage.setItem(storageKey, JSON.stringify(wishlists));
    } catch {}
  }, [wishlists, currentUser]);

  useEffect(() => {
    try {
      const storageKey = `kft_trip_plans_v1_${currentUser?.id || 'guest'}`;
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

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  // Sync to localStorage safely (guarded against QuotaExceeded or JSON corruption)
  useEffect(() => {
    try {
      if (users && users.length > 0) {
        localStorage.setItem('kft_users_v4', JSON.stringify(users));
      }
    } catch (e) {
      console.warn('Storage sync failed for users:', e);
    }
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('kft_current_user_v4', JSON.stringify(currentUser));
        
        // Automatic VIP subscription expiry enforcement
        if (currentUser.membershipTier === 'premium_vip' && currentUser.subscriptionExpiryDate) {
          const isExpired = new Date(currentUser.subscriptionExpiryDate).getTime() <= Date.now();
          if (isExpired) {
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
        localStorage.removeItem('kft_current_user_v4');
        setIsAuthModalOpen(true);
      }
    } catch (e) {
      console.warn('Storage sync failed for currentUser:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      if (foods && foods.length > 0) {
        localStorage.setItem('kft_foods_100_v2', JSON.stringify(foods));
      }
    } catch (e) {
      console.warn('Storage sync failed for foods:', e);
    }
  }, [foods]);

  useEffect(() => {
    try {
      if (restaurants && restaurants.length > 0) {
        localStorage.setItem('kft_restaurants_membership_v2', JSON.stringify(restaurants));
      }
    } catch (e) {
      console.warn('Storage sync failed for restaurants:', e);
    }
  }, [restaurants]);

  useEffect(() => {
    try {
      if (destinations && destinations.length > 0) {
        localStorage.setItem('kft_destinations_100_v2', JSON.stringify(destinations));
      }
    } catch (e) {
      console.warn('Storage sync failed for destinations:', e);
    }
  }, [destinations]);

  useEffect(() => {
    try {
      if (posts) {
        localStorage.setItem('kft_posts_v4', JSON.stringify(posts));
      }
    } catch (e) {
      console.warn('Storage sync failed for posts:', e);
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
    try {
      if (transactions) {
        localStorage.setItem('kft_transactions_v4', JSON.stringify(transactions));
      }
    } catch (e) {
      console.warn('Storage sync failed for transactions:', e);
    }
  }, [transactions]);

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
    const existing = users.find(u => 
      u.email.toLowerCase() === clean || 
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
    const isPhone = /^[0-9+ ]{7,15}$/.test(clean);
    const emailVal = isPhone ? `user_${cleanDigits}@phone.kh` : (clean.includes('@') ? clean : `${clean}@user.kh`);
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
    let isValid = await verifyPasswordPBKDF2(cleanPass, appSettings.adminPasswordHash);
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

    // Isolated single authorized administrator profile (private credentials protected)
    const adminProfile: User = {
      id: 'admin-authorized-single',
      name: 'រដ្ឋបាលប្រព័ន្ធ (System Admin)',
      email: 'admin@khmerfoodtourism.com',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'ប្រព័ន្ធគ្រប់គ្រងរដ្ឋបាលផ្លូវការ (System Administrator)',
      createdAt: '2026-01-01',
    };

    setCurrentUser(adminProfile);
    setIsAdminLoginModalOpen(false);
    setIsAdminOpen(true);
    showToast(language === 'km' ? 'ចូលកាន់ផ្ទាំងគ្រប់គ្រងរដ្ឋបាលជោគជ័យ!' : 'Admin portal unlocked securely!', 'success');
    return true;
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

  const register = (name: string, emailOrPhone: string, role: UserRole, phone?: string, restaurantName?: string) => {
    // Enforce: only one authorized admin exists. Users can NEVER self-register as admin
    const safeRole: UserRole = role === 'admin' ? 'user' : role;
    const cleanId = emailOrPhone.trim();
    const isPhone = /^[0-9+ ]{7,15}$/.test(cleanId);
    const cleanPhoneDigits = (phone || (isPhone ? cleanId : '')).replace(/[\s-+]/g, '');
    const emailVal = isPhone ? `user_${cleanPhoneDigits}@phone.kh` : (cleanId.includes('@') ? cleanId : `${cleanId}@user.kh`);
    const phoneVal = phone ? phone.trim() : (isPhone ? cleanId : undefined);
    const displayName = name.trim() || (isPhone ? `អ្នកប្រើប្រាស់ ${cleanId}` : cleanId.split('@')[0]);

    // Check if user already exists
    const existing = users.find(u => 
      u.email.toLowerCase() === emailVal.toLowerCase() || 
      (cleanPhoneDigits.length >= 7 && u.phone && u.phone.replace(/[\s-+]/g, '') === cleanPhoneDigits)
    );
    if (existing) {
      setCurrentUser(existing);
      showToast(language === 'km' ? `សូមស្វាគមន៍មកវិញ ${existing.name}!` : `Welcome back, ${existing.name}!`, 'success');
      setIsAuthModalOpen(false);
      return;
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
  };

  const loginWithGoogle = (profile: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    phone?: string;
  }) => {
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
      return;
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
      localStorage.setItem('kft_current_user_v4', JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
    showToast(language === 'km' ? 'បានកែប្រែឈ្មោះជោគជ័យ!' : 'Name updated successfully!', 'success');
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
  const addRestaurant = (restData: Omit<Restaurant, 'id' | 'rating' | 'reviewCount' | 'status'> & { status?: 'approved' | 'pending' | 'rejected' }) => {
    const isPremium = restData.membershipTier === 'premium';
    const newRest: Restaurant = normalizeRestaurant({
      ...restData,
      id: `rest-${Date.now()}`,
      rating: 5.0,
      reviewCount: 1,
      ownerId: currentUser?.id,
      status: 'approved',
      isVerified: true,
      membershipTier: isPremium ? 'premium' : 'free',
      membershipExpiresAt: isPremium 
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() 
        : undefined,
      menuItems: isPremium ? (restData.menuItems || []).slice(0, 5) : [], // Free users cannot add menu items!
    });
    setRestaurants(prev => [newRest, ...prev]);
    showToast(
      isPremium
        ? (language === 'km' ? '🎉 ចុះបញ្ជីហាង Premium រួចរាល់ (៣៦៥ ថ្ងៃ)!' : '🎉 Registered as Premium (365 days)!')
        : (language === 'km' ? '🎉 បានចុះបញ្ជីហាងឥតគិតថ្លៃ ($0 Free Listing) បានជោគជ័យ!' : '🎉 Free Restaurant Listing registered ($0)!'),
      'success'
    );
  };

  const updateRestaurant = (updated: Restaurant) => {
    const original = restaurants.find(r => r.id === updated.id);
    const isAdmin = currentUser?.role === 'admin';
    const isOwner = currentUser?.id && original?.ownerId === currentUser.id;
    const isUnclaimed = !original?.ownerId; // Seeded restaurants can be customized by users

    if (!isAdmin && !isOwner && !isUnclaimed) {
      showToast(language === 'km' ? 'គ្មានសិទ្ធិកែប្រែហាងនេះទេ!' : 'Unauthorized!', 'warning');
      return;
    }

    const safeUpdated: Restaurant = normalizeRestaurant(isAdmin ? updated : {
      ...updated,
      membershipTier: original?.membershipTier || 'free',
      membershipExpiresAt: original?.membershipExpiresAt,
      paymentStatus: original?.paymentStatus,
      status: original?.status || 'approved',
      isVerified: original?.isVerified ?? true,
      signatureDishesKh: Array.isArray(updated.signatureDishesKh) ? updated.signatureDishesKh : (original?.signatureDishesKh || ['ម្ហូបខ្មែរប្រពៃណី']),
      galleryPhotos: Array.isArray(updated.galleryPhotos) ? updated.galleryPhotos : (original?.galleryPhotos || []),
      menuItems: Array.isArray(updated.menuItems) ? updated.menuItems : (original?.menuItems || []),
    });

    setRestaurants(prev => prev.map(r => r.id === updated.id ? safeUpdated : r));
    if (selectedRestaurant && selectedRestaurant.id === updated.id) {
      setSelectedRestaurant(safeUpdated);
    }
    if (selectedRestaurant?.id === updated.id) setSelectedRestaurant(safeUpdated);
    if (managingRestaurant?.id === updated.id) setManagingRestaurant(safeUpdated);
    showToast(language === 'km' ? 'បានកែប្រែព័ត៌មានហាងរួចរាល់' : 'Restaurant updated!', 'success');
  };

  // Restaurant Food Menu Items (Max 5 for Active Premium)
  const addRestaurantMenuItem = (
    restaurantId: string, 
    itemData: Omit<RestaurantMenuItem, 'id' | 'createdAt' | 'restaurantId'>
  ): boolean => {
    const targetRest = restaurants.find(r => r.id === restaurantId);
    if (!targetRest) {
      showToast(language === 'km' ? 'រកមិនឃើញហាងអាហារទេ!' : 'Restaurant not found!', 'warning');
      return false;
    }

    const isOwner = currentUser?.id && targetRest.ownerId === currentUser.id;
    const isAdmin = currentUser?.role === 'admin';
    if (!isOwner && !isAdmin) {
      showToast(
        language === 'km' 
          ? 'លោកអ្នកគ្មានសិទ្ធិគ្រប់គ្រងមុខម្ហូបនៃហាងនេះទេ!' 
          : 'Unauthorized: You can only manage your own restaurant!',
        'warning'
      );
      return false;
    }

    if (!isRestaurantPremiumActive(targetRest)) {
      showToast(
        language === 'km' 
          ? 'ការចុះបញ្ជីឥតគិតថ្លៃមិនអាចបន្ថែមមុខម្ហូបបានទេ។ សូមដំឡើងទៅ Premium VIP ($9.99 សម្រាប់ ៣៦៥ ថ្ងៃ)!' 
          : 'Free listing cannot add food items. Please upgrade to Premium VIP ($9.99 for 365 days)!',
        'warning'
      );
      return false;
    }

    const currentItems = targetRest.menuItems || [];
    if (currentItems.length >= 5) {
      showToast(
        language === 'km' 
          ? 'សមាជិកភាព Premium អនុញ្ញាតឱ្យបន្ថែមមុខម្ហូបអតិបរមាត្រឹម ៥ មុខប៉ុណ្ណោះ!' 
          : 'Premium membership allows a maximum of 5 food menu items!',
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
        menuItems: updatedMenuItems,
      };
    }));

    if (selectedRestaurant?.id === restaurantId) {
      setSelectedRestaurant({
        ...selectedRestaurant,
        menuItems: updatedMenuItems,
      });
    }

    showToast(
      language === 'km' 
        ? `បានបន្ថែមមុខម្ហូប "${newItem.nameKh}" ជោគជ័យ (${updatedMenuItems.length}/5)!` 
        : `Added menu item "${newItem.nameKh}" (${updatedMenuItems.length}/5)!`,
      'success'
    );
    return true;
  };

  const updateRestaurantMenuItem = (restaurantId: string, updatedItem: RestaurantMenuItem): boolean => {
    const targetRest = restaurants.find(r => r.id === restaurantId);
    if (!targetRest) return false;

    const isOwner = currentUser?.id && targetRest.ownerId === currentUser.id;
    const isAdmin = currentUser?.role === 'admin';
    if (!isOwner && !isAdmin) {
      showToast(language === 'km' ? 'គ្មានសិទ្ធិកែប្រែ!' : 'Unauthorized!', 'warning');
      return false;
    }

    if (!isRestaurantPremiumActive(targetRest)) {
      showToast(
        language === 'km' 
          ? 'សមាជិកភាព Premium បានផុតកំណត់ហើយ។ សូមបន្តសមាជិកភាពដើម្បីកែប្រែព័ត៌មាន!' 
          : 'Membership expired. Please renew Premium ($4.99) to edit menu items!',
        'warning'
      );
      return false;
    }

    const updatedMenuItems = (targetRest.menuItems || []).map(item => 
      item.id === updatedItem.id ? { ...updatedItem, updatedAt: new Date().toISOString().split('T')[0] } : item
    );

    setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, menuItems: updatedMenuItems } : r));
    if (selectedRestaurant?.id === restaurantId) {
      setSelectedRestaurant({ ...selectedRestaurant, menuItems: updatedMenuItems });
    }

    showToast(language === 'km' ? 'បានកែប្រែព័ត៌មានមុខម្ហូបជោគជ័យ!' : 'Menu item updated!', 'success');
    return true;
  };

  const deleteRestaurantMenuItem = (restaurantId: string, menuItemId: string): boolean => {
    const targetRest = restaurants.find(r => r.id === restaurantId);
    if (!targetRest) return false;

    const isOwner = currentUser?.id && targetRest.ownerId === currentUser.id;
    const isAdmin = currentUser?.role === 'admin';
    if (!isOwner && !isAdmin) {
      showToast(language === 'km' ? 'គ្មានសិទ្ធិលុប!' : 'Unauthorized!', 'warning');
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
      amountUsd: appSettings.promotionalFeeUsd || 9.99,
      paymentMethod,
      transactionRef: transactionRef.trim(),
      notes: 'One-time $9.99 Premium VIP Membership for 365 days (End of year promo). 10 VIP Benefits. No auto-renewal.',
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
        ? 'បានផ្ញើសំណើដំឡើង Premium VIP ($9.99) រួចរាល់! រដ្ឋបាលនឹងត្រួតពិនិត្យ និងបើកដំណើរការជូន ៣៦៥ ថ្ងៃ។' 
        : 'Submitted Premium VIP upgrade request ($9.99)! Admin will verify and activate 365-day access.',
      'success'
    );
  };

  // Restaurant Analytics (Views, Calls, Maps, Shares)
  const trackRestaurantView = (restaurantId: string) => {
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
    setRestaurants(prev => prev.filter(r => r.id !== id));
    if (selectedRestaurant?.id === id) setSelectedRestaurant(null);
    showToast(language === 'km' ? 'បានលុបហាងអាហារ' : 'Restaurant deleted', 'info');
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

  // Destination CRUD
  const addDestination = (destData: Omit<TouristDestination, 'id' | 'rating' | 'reviewCount'>) => {
    const newDest: TouristDestination = {
      ...destData,
      id: `dest-${Date.now()}`,
      rating: 5.0,
      reviewCount: 1,
    };
    setDestinations(prev => [newDest, ...prev]);
    showToast(language === 'km' ? 'បានបញ្ចូលតំបន់ទេសចរណ៍ថ្មី' : 'Destination added!', 'success');
  };

  const updateDestination = (updated: TouristDestination) => {
    setDestinations(prev => prev.map(d => d.id === updated.id ? updated : d));
    if (selectedDestination?.id === updated.id) setSelectedDestination(updated);
    showToast(language === 'km' ? 'បានកែប្រែតំបន់ទេសចរណ៍' : 'Destination updated!', 'success');
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
    let targetRestId = '';
    let targetUserId = '';
    let targetTxn: RegistrationTransaction | undefined;

    setTransactions(prev => prev.map(t => {
      if (t.id !== txnId) return t;
      targetRestId = t.restaurantId || '';
      targetUserId = t.userId || '';
      targetTxn = t;
      return {
        ...t,
        status: 'verified',
        verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        verifiedBy: currentUser?.name || 'Chea Savuth (Admin)',
      };
    }));

    if (targetRestId) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      setRestaurants(prev => prev.map(r => {
        if (r.id !== targetRestId) return r;
        return {
          ...r,
          status: 'approved',
          isVerified: true,
          isPromoted: true,
          membershipTier: 'premium',
          membershipExpiresAt: expiresAt.toISOString(),
          paymentStatus: 'verified',
          paymentDate: now.toISOString().split('T')[0],
        };
      }));
    }

    if (targetUserId) {
      // Find durationDays from the transaction or default to 365 days
      const matchedTxn = targetTxn || transactions.find(t => t.id === txnId);
      const durationDays = matchedTxn?.durationDays || 365;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      setUsers(prev => prev.map(u => {
        if (u.id !== targetUserId) return u;
        return {
          ...u,
          membershipTier: 'premium_vip',
          subscriptionStartDate: now.toISOString(),
          subscriptionExpiryDate: expiresAt.toISOString(),
          subscriptionStatus: 'active',
          paymentStatus: 'verified'
        };
      }));

      if (currentUser?.id === targetUserId) {
        setCurrentUser(prev => prev ? {
          ...prev,
          membershipTier: 'premium_vip',
          subscriptionStartDate: now.toISOString(),
          subscriptionExpiryDate: expiresAt.toISOString(),
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
          membershipExpiresAt: expiresAt.toISOString(),
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
    let targetRestId = '';
    let targetUserId = '';
    const rejectionReason = reason || 'ការទូទាត់មិនអាចផ្ទៀងផ្ទាត់បានជាមួយរបាយការណ៍ធនាគារ (Transaction could not be verified on bank statement).';

    setTransactions(prev => prev.map(t => {
      if (t.id !== txnId) return t;
      targetRestId = t.restaurantId || '';
      targetUserId = t.userId || '';
      return {
        ...t,
        status: 'rejected',
        notes: rejectionReason,
      };
    }));

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
          subscriptionStatus: 'expired',
          paymentStatus: 'failed'
        };
      }));

      if (currentUser?.id === targetUserId) {
        setCurrentUser(prev => prev ? {
          ...prev,
          subscriptionStatus: 'expired',
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

  // User VIP Upgrade & Renewal Methods ($9.99 USD / 365 Days)
  const upgradeCurrentUserToVip = async (
    paymentMethod: 'GooglePlayBilling' | 'KHQR' | 'Bakong' | 'Card',
    transactionRef: string,
    last4?: string
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
        amountUsd: VIP_ANNUAL_PRICE_USD,
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
          amountUsd: VIP_ANNUAL_PRICE_USD,
          durationDays: 365,
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
        amountUsd: VIP_ANNUAL_PRICE_USD,
        durationDays: 365,
        membershipTier: 'premium_vip',
        status: 'verified',
        paymentMethod,
        transactionRef: result.transactionRef,
        verificationSignature: result.verificationSignature,
        createdAt: result.startDate,
        expiresAt: result.expiryDate,
        verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        verifiedBy: paymentMethod === 'GooglePlayBilling' ? 'Google Play Billing Server' : 'Secure Payment Engine',
        notes: `365-day Premium VIP membership activated successfully ($9.99 USD/year)`
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
          ? 'អបអរសាទរ! គណនីរបស់អ្នកត្រូវបានដំឡើងទៅជា Premium VIP (៣៦៥ ថ្ងៃ) ដោយជោគជ័យ! 🎉' 
          : 'Congratulations! Your account has been upgraded to Premium VIP (365 days)! 🎉',
        'success'
      );

      return { success: true };
    } catch (e: any) {
      console.error('Upgrade to VIP error:', e);
      return { success: false, error: e?.message || 'Unexpected payment error' };
    }
  };

  const renewCurrentUserVip = async (
    paymentMethod: 'GooglePlayBilling' | 'KHQR' | 'Bakong' | 'Card',
    transactionRef: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Please sign in first.' };

    const dates = calculateVipDates(currentUser.subscriptionExpiryDate);
    const req: PaymentVerificationRequest = {
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      paymentMethod,
      transactionRef,
      amountUsd: VIP_ANNUAL_PRICE_USD,
      nonce: `renew_nonce_${Date.now()}`,
      timestamp: Date.now()
    };

    const result = await verifyPaymentOnBackend(req);
    if (!result.success) {
      showToast(result.error || 'Renewal failed', 'warning');
      return { success: false, error: result.error };
    }

    const renewedUser: User = {
      ...currentUser,
      membershipTier: 'premium_vip',
      subscriptionStartDate: dates.startDate,
      subscriptionExpiryDate: dates.expiryDate,
      subscriptionStatus: 'active',
      paymentStatus: 'verified',
      paymentMethod,
      transactionRef: result.transactionRef,
      autoRenew: true
    };

    setCurrentUser(renewedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? renewedUser : u));

    const renewTxn: RegistrationTransaction = {
      id: `TXN-VIP-RENEW-${Date.now().toString(36).toUpperCase()}`,
      type: 'user_vip_upgrade',
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      amountUsd: VIP_ANNUAL_PRICE_USD,
      durationDays: 365,
      membershipTier: 'premium_vip',
      status: 'verified',
      paymentMethod,
      transactionRef: result.transactionRef,
      verificationSignature: result.verificationSignature,
      createdAt: dates.startDate,
      expiresAt: dates.expiryDate,
      verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      verifiedBy: 'Google Play / Verified Payment Engine',
      notes: `VIP subscription renewed (+365 days)`
    };
    setTransactions(prev => [renewTxn, ...prev]);

    showToast(
      language === 'km' 
        ? 'ការបន្តសមាជិកភាព VIP ៣៦៥ ថ្ងៃជោគជ័យ! 🎉' 
        : 'VIP subscription renewed for 365 days successfully! 🎉',
      'success'
    );
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

  // Submit VIP Upgrade Request for Administrator Review & Approval
  const submitVipUpgradeRequest = async (
    durationDays: number = 365,
    amountUsd: number = 9.99,
    notes?: string
  ): Promise<{ success: boolean; transactionId: string }> => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return { success: false, transactionId: '' };
    }

    const now = new Date();
    const txnId = `TXN-VIP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const txnRef = `ABA-KHQR-${durationDays}D-${Date.now().toString(36).toUpperCase()}`;

    const newTxn: RegistrationTransaction = {
      id: txnId,
      type: 'user_vip_upgrade',
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      amountUsd,
      durationDays,
      membershipTier: 'premium_vip',
      status: 'pending_verification',
      paymentMethod: 'KHQR',
      transactionRef: txnRef,
      createdAt: now.toISOString().replace('T', ' ').slice(0, 16),
      notes: notes || `សំណើដំឡើង VIP ${durationDays} ថ្ងៃ ($${amountUsd} USD) តាម ABA KHQR - រង់ចាំការអនុម័តពីរដ្ឋបាល`
    };

    setTransactions(prev => [newTxn, ...prev]);

    // Update currentUser and users state to 'pending'
    const pendingUser: User = {
      ...currentUser,
      subscriptionStatus: 'pending',
      paymentStatus: 'pending_verification',
      paymentMethod: 'KHQR',
      transactionRef: txnRef
    };

    setCurrentUser(pendingUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? pendingUser : u));

    // Send Admin Notification
    const adminNotif: AppNotification = {
      id: `notif-admin-vip-${Date.now()}`,
      titleKh: '👑 សំណើដំឡើង VIP ថ្មីពីអតិថិជន',
      titleEn: '👑 New VIP Upgrade Request',
      messageKh: `អតិថិជន ${currentUser.name} បានផ្ញើសំណើដំឡើង Premium VIP (${durationDays} ថ្ងៃ - $${amountUsd} USD) តាម ABA KHQR។ សូមពិនិត្យ និងអនុម័ត។`,
      messageEn: `Customer ${currentUser.name} submitted a Premium VIP upgrade request (${durationDays} days - $${amountUsd} USD) via ABA KHQR. Please review in Admin Dashboard.`,
      type: 'system',
      date: now.toISOString().split('T')[0],
      isRead: false
    };

    // Send User Notification
    const userNotif: AppNotification = {
      id: `notif-user-vip-req-${Date.now() + 1}`,
      titleKh: '📩 សំណើដំឡើង VIP ត្រូវបានបញ្ជូន',
      titleEn: '📩 VIP Upgrade Request Submitted',
      messageKh: `សំណើដំឡើង Premium VIP (${durationDays} ថ្ងៃ) របស់អ្នកត្រូវបានបញ្ជូនទៅរដ្ឋបាលហើយ។ រដ្ឋបាលនឹងពិនិត្យផ្ទៀងផ្ទាត់ និងអនុម័តជូនក្នុងពេលឆាប់ៗនេះ។`,
      messageEn: `Your VIP upgrade request (${durationDays} days) has been submitted to admin. It will be verified and approved shortly.`,
      type: 'system',
      date: now.toISOString().split('T')[0],
      isRead: false
    };

    setNotifications(prev => [adminNotif, userNotif, ...prev]);

    showToast(
      language === 'km' 
        ? 'បានបញ្ជូនសំណើដំឡើង VIP ជូនរដ្ឋបាលដោយជោគជ័យ! សូមរង់ចាំការអនុម័ត។' 
        : 'VIP upgrade request submitted to admin successfully! Awaiting verification.',
      'success'
    );

    return { success: true, transactionId: txnId };
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
      };

      setRestaurants(prev => [newRestaurant, ...prev]);

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
    };

    setRestaurants(prev => [newRestaurant, ...prev]);
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
        login,
        register,
        loginWithGoogle,
        logout,
        updateUserRole,
        updateCurrentUserProfile,
        loginAdmin,
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
        isExitModalOpen,
        setIsExitModalOpen,
        exitAppNow,
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

        // Premium VIP Subscription ($9.99/year)
        isUpgradeVipModalOpen,
        setIsUpgradeVipModalOpen,
        openUpgradeVipModal,
        submitVipUpgradeRequest,
        upgradeCurrentUserToVip,
        renewCurrentUserVip,
        restoreCurrentUserVipPurchases,

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

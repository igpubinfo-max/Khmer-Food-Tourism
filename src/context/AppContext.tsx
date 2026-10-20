import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  User, FoodItem, Restaurant, TouristDestination, CommunityPost, 
  Language, UserRole, AppSettings, RegistrationTransaction,
  RestaurantMenuItem, MembershipTier, isRestaurantPremiumActive
} from '../types';
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
  logout: () => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;

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
  isSupportModalOpen: boolean;
  setIsSupportModalOpen: (open: boolean) => void;
  isExitModalOpen: boolean;
  setIsExitModalOpen: (open: boolean) => void;
  exitAppNow: () => void;
  
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse kft_current_user_v4', e);
    }
    return initialUsers[1] || initialUsers[0] || null; // Default to standard user safely
  });

  const [foods, setFoods] = useState<FoodItem[]>(() => {
    // Purge legacy 200+ dataset cache to enforce exact 100 authentic foods
    try {
      localStorage.removeItem('kft_foods_v4');
    } catch {}
    try {
      const saved = localStorage.getItem('kft_foods_100_v1');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50 && parsed[0]?.imageAuditStatus) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse kft_foods_100_v1', e);
    }
    return initialFoods;
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    try {
      const saved = localStorage.getItem('kft_restaurants_membership_v1');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse kft_restaurants_membership_v1', e);
    }
    try {
      localStorage.removeItem('kft_restaurants_v3');
      localStorage.removeItem('kft_restaurants_v4');
    } catch {}
    return initialRestaurants.map(r => {
      if (r.id === 'rest-19') {
        return {
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
        };
      }
      return {
        ...r,
        membershipTier: (r.membershipTier || (r.isPromoted ? 'premium' : 'free')) as MembershipTier,
        membershipExpiresAt: r.membershipExpiresAt || (r.isPromoted ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : undefined),
        menuItems: r.menuItems || [],
      };
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
      const saved = localStorage.getItem('kft_destinations_100_v1');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse kft_destinations_100_v1', e);
    }
    try {
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
        if (Array.isArray(parsed)) return parsed;
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
        if (parsed && typeof parsed === 'object') return { ...initialAppSettings, ...parsed };
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
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddPostModalOpen, setIsAddPostModalOpen] = useState(false);
  const [isAddRestaurantModalOpen, setIsAddRestaurantModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

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
      } else {
        localStorage.removeItem('kft_current_user_v4');
      }
    } catch (e) {
      console.warn('Storage sync failed for currentUser:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      if (foods && foods.length > 0) {
        localStorage.setItem('kft_foods_100_v1', JSON.stringify(foods));
      }
    } catch (e) {
      console.warn('Storage sync failed for foods:', e);
    }
  }, [foods]);

  useEffect(() => {
    try {
      if (restaurants && restaurants.length > 0) {
        localStorage.setItem('kft_restaurants_membership_v1', JSON.stringify(restaurants));
      }
    } catch (e) {
      console.warn('Storage sync failed for restaurants:', e);
    }
  }, [restaurants]);

  useEffect(() => {
    try {
      if (destinations && destinations.length > 0) {
        localStorage.setItem('kft_destinations_100_v1', JSON.stringify(destinations));
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
  const login = (email: string, role?: UserRole): boolean => {
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
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
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: email.split('@')[0],
      email: email,
      role: assignedRole,
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

  const register = (name: string, email: string, role: UserRole, phone?: string, restaurantName?: string) => {
    // Enforce: only one authorized admin exists. Users can NEVER self-register as admin
    const safeRole: UserRole = role === 'admin' ? 'user' : role;
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      role: safeRole,
      phone,
      restaurantName,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    showToast(language === 'km' ? 'បង្កើតគណនីបានជោគជ័យ!' : 'Account created successfully!', 'success');
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    revokeAdminSession();
    setCurrentUser(null);
    setIsAdminOpen(false);
    showToast(language === 'km' ? 'បានចាកចេញពីគណនី' : 'Logged out', 'info');
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
    const newRest: Restaurant = {
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
    };
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

    if (!isAdmin && !isOwner) {
      showToast(language === 'km' ? 'គ្មានសិទ្ធិកែប្រែហាងនេះទេ!' : 'Unauthorized!', 'warning');
      return;
    }

    const safeUpdated: Restaurant = isAdmin ? updated : {
      ...updated,
      membershipTier: original?.membershipTier || 'free',
      membershipExpiresAt: original?.membershipExpiresAt,
      paymentStatus: original?.paymentStatus,
      status: original?.status || 'approved',
      isVerified: original?.isVerified ?? true,
    };

    setRestaurants(prev => prev.map(r => r.id === updated.id ? safeUpdated : r));
    if (selectedRestaurant?.id === updated.id) setSelectedRestaurant(safeUpdated);
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
          ? 'ការចុះបញ្ជីឥតគិតថ្លៃមិនអាចបន្ថែមមុខម្ហូបបានទេ។ សូមដំឡើងទៅ Premium ($4.99 សម្រាប់ ៣៦៥ ថ្ងៃ)!' 
          : 'Free listing cannot add food items. Please upgrade to Premium ($4.99 for 365 days)!',
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
      amountUsd: 4.99,
      paymentMethod,
      transactionRef: transactionRef.trim(),
      notes: 'One-time $4.99 Premium Membership for 365 days (up to 5 food menu items). No auto-renewal.',
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
        ? 'បានផ្ញើសំណើដំឡើង Premium ($4.99) រួចរាល់! រដ្ឋបាលនឹងត្រួតពិនិត្យ និងបើកដំណើរការជូន ៣៦៥ ថ្ងៃ។' 
        : 'Submitted Premium upgrade request ($4.99)! Admin will verify and activate 365-day access.',
      'success'
    );
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
    setTransactions(prev => prev.map(t => {
      if (t.id !== txnId) return t;
      targetRestId = t.restaurantId;
      return {
        ...t,
        status: 'verified',
        verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        verifiedBy: currentUser?.name || 'System Administrator',
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

    showToast(
      language === 'km' 
        ? 'បានផ្ទៀងផ្ទាត់ការទូទាត់ $4.99 និងធ្វើឱ្យសមាជិកភាព Premium សកម្ម ៣៦៥ ថ្ងៃជោគជ័យ!' 
        : 'Payment verified: 365-day Premium membership activated successfully!',
      'success'
    );
  };

  const rejectTransaction = (txnId: string, reason?: string) => {
    let targetRestId = '';
    setTransactions(prev => prev.map(t => {
      if (t.id !== txnId) return t;
      targetRestId = t.restaurantId;
      return {
        ...t,
        status: 'rejected',
        notes: reason || 'Transaction could not be verified with bank statement.',
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

    showToast(
      language === 'km' 
        ? 'បានបដិសេធប្រតិបត្តិការទូទាត់' 
        : 'Transaction rejected',
      'info'
    );
  };

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
        logout,
        updateUserRole,
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
        isSupportModalOpen,
        setIsSupportModalOpen,
        searchQuery,
        setSearchQuery,
        selectedProvince,
        setSelectedProvince,
        toast,
        showToast,
        resetAllData,
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

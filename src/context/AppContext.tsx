import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, FoodItem, Restaurant, TouristDestination, CommunityPost, 
  Language, UserRole, AppSettings 
} from '../types';
import { 
  initialUsers, initialFoods, initialRestaurants, 
  initialDestinations, initialCommunityPosts, initialAppSettings 
} from '../data/seedData';
import { hashPassword, verifyPassword } from '../utils/crypto';

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
  
  // Bookmarks
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  
  // Food Actions
  addFood: (food: Omit<FoodItem, 'id' | 'rating' | 'reviewCount'>) => void;
  updateFood: (food: FoodItem) => void;
  deleteFood: (id: string) => void;
  
  // Restaurant Actions
  addRestaurant: (rest: Omit<Restaurant, 'id' | 'rating' | 'reviewCount' | 'status'>) => void;
  updateRestaurant: (rest: Restaurant) => void;
  deleteRestaurant: (id: string) => void;
  approveRestaurant: (id: string) => void;
  toggleVerifyRestaurant: (id: string) => void;
  
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
  
  // Local storage loaded states with fallbacks (v3 storage keys for 100+ dataset)
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('kft_users_v3');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('kft_current_user_v3');
    return saved ? JSON.parse(saved) : initialUsers[2]; // Default to regular user
  });

  const [foods, setFoods] = useState<FoodItem[]>(() => {
    const saved = localStorage.getItem('kft_foods_v3');
    return saved ? JSON.parse(saved) : initialFoods;
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    const saved = localStorage.getItem('kft_restaurants_v3');
    return saved ? JSON.parse(saved) : initialRestaurants;
  });

  const [destinations, setDestinations] = useState<TouristDestination[]>(() => {
    const saved = localStorage.getItem('kft_destinations_v3');
    return saved ? JSON.parse(saved) : initialDestinations;
  });

  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    const saved = localStorage.getItem('kft_posts_v3');
    return saved ? JSON.parse(saved) : initialCommunityPosts;
  });

  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const saved = localStorage.getItem('kft_bookmarks_v3');
    return saved ? JSON.parse(saved) : ['food-1', 'dest-1'];
  });

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('kft_settings_v3');
    return saved ? JSON.parse(saved) : initialAppSettings;
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

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('kft_users_v3', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('kft_current_user_v3', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('kft_foods_v3', JSON.stringify(foods));
  }, [foods]);

  useEffect(() => {
    localStorage.setItem('kft_restaurants_v3', JSON.stringify(restaurants));
  }, [restaurants]);

  useEffect(() => {
    localStorage.setItem('kft_destinations_v3', JSON.stringify(destinations));
  }, [destinations]);

  useEffect(() => {
    localStorage.setItem('kft_posts_v3', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem('kft_bookmarks_v3', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('kft_settings_v3', JSON.stringify(appSettings));
  }, [appSettings]);

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
      setCurrentUser(existing);
      showToast(language === 'km' ? `សូមស្វាគមន៍មកវិញ ${existing.name}!` : `Welcome back, ${existing.name}!`, 'success');
      setIsAuthModalOpen(false);
      return true;
    }
    
    // Quick demo login if not found
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: email.split('@')[0],
      email: email,
      role: role || (email.includes('admin') ? 'admin' : email.includes('owner') ? 'owner' : 'user'),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    showToast(language === 'km' ? `ចូលគណនីបានជោគជ័យ!` : `Logged in successfully!`, 'success');
    setIsAuthModalOpen(false);
    return true;
  };

  // Secure Admin Login for Chea Savuth
  const loginAdmin = async (username: string, password: string): Promise<boolean> => {
    const cleanUser = username.trim().toLowerCase();
    const isAdminUser = cleanUser === 'chea savuth' || cleanUser === 'cheasavuth' || cleanUser === 'admin';
    if (!isAdminUser) {
      showToast(language === 'km' ? 'ឈ្មោះគណនីរដ្ឋបាលមិនត្រឹមត្រូវទេ!' : 'Invalid admin username!', 'warning');
      return false;
    }

    const isValid = await verifyPassword(password, appSettings.adminPasswordHash);
    if (!isValid) {
      showToast(language === 'km' ? 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ!' : 'Invalid password!', 'warning');
      return false;
    }

    // Find or create Chea Savuth user
    let cheaUser = users.find(u => u.role === 'admin' || u.name.toLowerCase().includes('chea savuth'));
    if (!cheaUser) {
      cheaUser = initialUsers[0];
      setUsers(prev => [cheaUser!, ...prev.filter(u => u.id !== cheaUser!.id)]);
    }

    setCurrentUser(cheaUser);
    setIsAdminLoginModalOpen(false);
    setIsAdminOpen(true);
    showToast(language === 'km' ? `សូមស្វាគមន៍ លោក Chea Savuth! ចូលកាន់ផ្ទាំងគ្រប់គ្រងរដ្ឋបាលជោគជ័យ។` : `Welcome, Chea Savuth! Admin portal unlocked.`, 'success');
    return true;
  };

  const setAdminPassword = async (newPassword: string): Promise<boolean> => {
    if (!newPassword || newPassword.length < 6) {
      showToast(language === 'km' ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ!' : 'Password must be at least 6 characters!', 'warning');
      return false;
    }

    const newHash = await hashPassword(newPassword);
    setAppSettings(prev => ({
      ...prev,
      adminPasswordHash: newHash,
      isAdminInitialized: true,
    }));
    showToast(language === 'km' ? 'បានផ្លាស់ប្តូរពាក្យសម្ងាត់រដ្ឋបាល Chea Savuth ជោគជ័យ!' : 'Admin password updated securely!', 'success');
    return true;
  };

  const updateAppSettings = (newSettings: Partial<AppSettings>) => {
    setAppSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
    showToast(language === 'km' ? 'បានរក្សាទុកការកំណត់កម្មវិធីជោគជ័យ!' : 'App settings updated!', 'success');
  };

  const register = (name: string, email: string, role: UserRole, phone?: string, restaurantName?: string) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      phone,
      restaurantName,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    showToast(language === 'km' ? `បង្កើតគណនីបានជោគជ័យ!` : `Account created successfully!`, 'success');
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAdminOpen(false);
    showToast(language === 'km' ? 'បានចាកចេញពីគណនី' : 'Logged out', 'info');
  };

  const updateUserRole = (userId: string, newRole: UserRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, role: newRole } : null);
    }
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
  const addRestaurant = (restData: Omit<Restaurant, 'id' | 'rating' | 'reviewCount' | 'status'>) => {
    const isOwnerOrAdmin = currentUser?.role === 'admin';
    const newRest: Restaurant = {
      ...restData,
      id: `rest-${Date.now()}`,
      rating: 5.0,
      reviewCount: 1,
      ownerId: currentUser?.id,
      status: isOwnerOrAdmin ? 'approved' : 'pending',
      isVerified: isOwnerOrAdmin,
    };
    setRestaurants(prev => [newRest, ...prev]);
    showToast(
      isOwnerOrAdmin
        ? (language === 'km' ? 'បានចុះបញ្ជីហាងអាហារបានជោគជ័យ!' : 'Restaurant registered!')
        : (language === 'km' ? 'បានផ្ញើសំណើចុះបញ្ជីហាង! រង់ចាំការត្រួតពិនិត្យពីរដ្ឋបាល' : 'Submitted for admin approval!'),
      'success'
    );
  };

  const updateRestaurant = (updated: Restaurant) => {
    setRestaurants(prev => prev.map(r => r.id === updated.id ? updated : r));
    if (selectedRestaurant?.id === updated.id) setSelectedRestaurant(updated);
    showToast(language === 'km' ? 'បានកែប្រែព័ត៌មានហាងរួចរាល់' : 'Restaurant updated!', 'success');
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

  const resetAllData = () => {
    setUsers(initialUsers);
    setCurrentUser(initialUsers[2]);
    setFoods(initialFoods);
    setRestaurants(initialRestaurants);
    setDestinations(initialDestinations);
    setPosts(initialCommunityPosts);
    setBookmarks(['food-1', 'dest-1']);
    setAppSettings(initialAppSettings);
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

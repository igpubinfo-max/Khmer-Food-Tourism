import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TrendingFoodCategorySlug, TrendingFoodItem, isUserVipActive } from '../types';
import { 
  Sparkles, ChevronRight, Utensils, Store, Compass, 
  MapPin, Heart, Flame, QrCode, Download, ShieldCheck,
  Apple, Smartphone, Bot, Calendar, Bookmark, Bell, 
  UtensilsCrossed, MessageSquareQuote, Camera, Phone,
  Share2, Navigation, Eye, ExternalLink, Play, Shuffle, Search, RefreshCw,
  Crown, Plus, Edit2, CheckCircle2, X, Tag, ChefHat, Copy, Video, Check
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { 
    foods, restaurants, destinations, setActiveTab, 
    language, setSelectedProvince, posts,
    currentUser, setIsAuthModalOpen,
    setIsInstallModalOpen, setIsSupportModalOpen,
    openInstallModal, setSelectedDestination,
    setIsWhatToEatModalOpen, setIsNearMeModalOpen,
    setIsDailyDiscoveriesModalOpen, setIsWishlistsModalOpen,
    setIsAiTripPlannerModalOpen, setIsNotificationsModalOpen,
    setIsTrendingSocialModalOpen, unreadNotificationsCount,
    trendingFoods, setSelectedTrendingFood, setIsTrendingFoodDetailModalOpen,
    setIsAiCheckInModalOpen, showToast,
    searchQuery: globalSearchQuery, setSearchQuery: setGlobalSearchQuery,
    setSelectedFood, setSelectedRestaurant,
    setIsVipAddRestaurantModalOpen, setIsManageMenuModalOpen, setManagingRestaurant,
    openUpgradeVipModal
  } = useApp();

  const isKm = language === 'km';
  const isVip = isUserVipActive(currentUser);
  const myRestaurants = useMemo(() => {
    return currentUser ? restaurants.filter(r => r.ownerId === currentUser.id) : [];
  }, [restaurants, currentUser]);

  // Active category filter, local search query, and AI random seed for AI Trending Food on Home
  const [selectedCategory, setSelectedCategory] = useState<TrendingFoodCategorySlug>('all');
  const [trendingSearchQuery, setTrendingSearchQuery] = useState<string>('');
  const [randomSeed, setRandomSeed] = useState<number>(0);

  // Search results tab filter when global search is active
  const [searchTab, setSearchTab] = useState<'all' | 'food' | 'restaurants' | 'tourism'>('all');

  // AI Viral Content Generator State
  const [aiViralIndex, setAiViralIndex] = useState<number>(0);
  const [hasCopiedCaption, setHasCopiedCaption] = useState<boolean>(false);

  // Authentic Cambodian viral food concepts pool for AI generator
  const viralAiIdeas = useMemo(() => [
    {
      foodNameKh: 'នំក្រក់ពិសេស និងសាច់អាំងបាត់ដំបង',
      foodNameEn: 'Battambang Crispy Num Krok & Beef Skewers',
      provinceKh: 'ខេត្តបាត់ដំបង',
      provinceEn: 'Battambang',
      accountHandle: currentUser?.socialAccounts?.tiktok?.handle ? `@${currentUser.socialAccounts.tiktok.handle}` : '@cheakimseng',
      verifiedCreator: currentUser?.name || 'Chea Kimseng Foodie',
      hookKh: '🔥 តើអ្នកធ្លាប់ភ្លក្សនំក្រក់ពិសេសនៅបាត់ដំបងក្បែរលោកតាដំបងក្រញូងហើយឬនៅ? ក្លិនឈ្ងុយខ្ទិះដូង ស្រួយស្រឹបមិនអាចបំភ្លេចបាន!',
      hookEn: '🔥 Have you ever tasted authentic Battambang Num Krok near the Ta Dumbong shrine? Crispy coconut perfection!',
      captionKh: 'រសជាតិមរតកដើមនំក្រក់ក្តៅៗស្រួយក្រៅទន់ក្នុង ជ្រលក់ទឹកត្រីផ្អែមពិសេស និងសាច់អាំងប្រឡាក់គ្រឿងល្មៀតឈ្ងុយឆ្ងាញ់! មើលហើយចង់ហោះទៅបាត់ដំបងភ្លាមៗ 😋📍',
      captionEn: 'Golden crispy Num Krok hot off the cast iron pan, served with authentic sweet fish sauce & lemongrass beef skewers! 😋📍',
      hashtags: '#KhmerFood #BattambangEats #NumKrok #CambodianStreetFood #TikTokFoodCambodia #អាហារខ្មែរ #ទេសចរណ៍បាត់ដំបង',
      videoConceptKh: 'ប្លង់ ១: ចាក់ម្សៅខ្ទិះលើខ្ទះដែកក្តៅៗមានផ្សែងហុយ -> ប្លង់ ២: លើកនំក្រក់ស្រួយជ្រលក់ទឹកត្រីផ្អែម -> ប្លង់ ៣: បង្ហាញរូបលោកតាដំបងក្រញូងតំណាងខេត្តបាត់ដំបង',
      videoConceptEn: 'Shot 1: Sizzling coconut batter poured into cast-iron pan -> Shot 2: Dipping hot crispy cake into sweet chili sauce -> Shot 3: Ta Dumbong landmark cutaway',
    },
    {
      foodNameKh: 'ក្តាមថ្មឆាម្រេចខ្ចីកំពត និងមឹកបំពងម្សៅកែប',
      foodNameEn: 'Kampot Fresh Green Pepper Crab & Kep Squid',
      provinceKh: 'ខេត្តកំពត & កែប',
      provinceEn: 'Kampot & Kep',
      accountHandle: currentUser?.socialAccounts?.tiktok?.handle ? `@${currentUser.socialAccounts.tiktok.handle}` : '@cheakimseng',
      verifiedCreator: currentUser?.name || 'Chea Kimseng Foodie',
      hookKh: '🦀 កំពតមិនមែនមានតែទុរេនទេ! មកភ្លក្សក្តាមសមុទ្រស្រស់ឆាជាមួយម្រេចខ្ចីកំពត GI ហឹរឈ្ងុយជាប់មាត់!',
      hookEn: '🦀 Fresh mud crab wok-fried with world-famous GI Kampot green peppercorns!',
      captionKh: 'សាច់ក្តាមផ្អែមស្រស់ៗពីផ្សារក្តាមកែប ឆាជាមួយម្រេចខ្ចីកំពតពិតៗ ហឹរប្រហើរឈ្ងុយឆ្ងាញ់ខ្លាំង! ធានាថាញ៉ាំបាយអស់ ៣ ចានមិនដឹងខ្លួន! 🤤🌊',
      captionEn: 'Sweet fresh sea crab tossed with fragrant Kampot green peppercorns right by the sea! Absolute Cambodian pride 🤤🌊',
      hashtags: '#KampotPepperCrab #KepCrabMarket #CambodiaSeafood #KhmerFoodie #TikTokCambodia #ម្រេចកំពត #ក្តាមឆាម្រេចខ្ចី',
      videoConceptKh: 'ប្លង់ ១: ស្រង់ក្តាមស្រស់ៗពីកន្ត្រកទឹកសមុទ្រ -> ប្លង់ ២: ភ្លើងឆាបឆាជាមួយម្រេចខ្ចី -> ប្លង់ ៣: បង្ហាញទេសភាពឆ្នេរសមុទ្រកែប និងផ្សារក្តាម',
      videoConceptEn: 'Shot 1: Pulling fresh crab baskets from the sea -> Shot 2: Wok fire flaring with peppercorns -> Shot 3: Kep Crab Market seaside sunset',
    },
    {
      foodNameKh: 'នំបញ្ចុកសម្លការីសៀមរាប និងប្រហុកអាំងស្លឹកចេក',
      foodNameEn: 'Siem Reap Curry Nom Banh Chok & Grilled Prahok',
      provinceKh: 'ខេត្តសៀមរាប',
      provinceEn: 'Siem Reap',
      accountHandle: currentUser?.socialAccounts?.tiktok?.handle ? `@${currentUser.socialAccounts.tiktok.handle}` : '@cheakimseng',
      verifiedCreator: currentUser?.name || 'Chea Kimseng Foodie',
      hookKh: '🍜 មកដល់សៀមរាបអង្គរ បើមិនបានញ៉ាំនំបញ្ចុកទឹកសម្លការីព្រះវិហារ និងប្រហុកខ្ចប់ស្លឹកចេក ដូចមិនទាន់មកដល់!',
      hookEn: '🍜 Visiting Angkor without fresh Siem Reap Nom Banh Chok is incomplete!',
      captionKh: 'សរសៃនំបញ្ចុកបុកដៃស្រស់ៗស្រុះទឹកក្តៅ ស្រោចទឹកសម្លការីក្រហមដូងខ្ទិះរោយជីរគ្រប់មុខ និងប្រហុកអាំងឈ្ងុយសាយភាយ! រសជាតិប្រពៃណីពិតៗ ❤️',
      captionEn: 'Handmade rice noodles ladled with fragrant coconut curry, fresh herbs, and roasted prahok in banana leaves! ❤️',
      hashtags: '#SiemReapEats #NomBanhChok #AngkorFood #KhmerTraditionalDish #FoodReviewCambodia #នំបញ្ចុកសៀមរាប',
      videoConceptKh: 'ប្លង់ ១: ចាប់សរសៃនំបញ្ចុកសស្គុសដាក់ចាន -> ប្លង់ ២: ស្រោចទឹកសម្លការីក្តៅហុយផ្សែង -> ប្លង់ ៣: ប្លង់ស្វាគមន៍មុខប្រាសាទអង្គរវត្ត',
      videoConceptEn: 'Shot 1: Plating silky fresh rice noodles -> Shot 2: Ladling rich golden coconut curry -> Shot 3: Iconic Angkor Wat panorama',
    },
    {
      foodNameKh: 'គុយទាវភ្នំពេញពិសេស និងកាហ្វេទឹកដោះគោទឹកកកបុរាណ',
      foodNameEn: 'Phnom Penh Kuy Teav & Traditional Iced Milk Coffee',
      provinceKh: 'រាជធានីភ្នំពេញ',
      provinceEn: 'Phnom Penh',
      accountHandle: currentUser?.socialAccounts?.tiktok?.handle ? `@${currentUser.socialAccounts.tiktok.handle}` : '@cheakimseng',
      verifiedCreator: currentUser?.name || 'Chea Kimseng Foodie',
      hookKh: '🥣 អាហារពេលព្រឹកលេខ ១ របស់ប្រជាជនខ្មែរ! គុយទាវភ្នំពេញទឹកស៊ុបឆ្អឹងជ្រូកផ្អែមថ្លាឈ្វេង!',
      hookEn: '🥣 Number 1 Cambodian morning staple! Clear sweet pork bone broth Kuy Teav Phnom Penh!',
      captionKh: 'ចាប់ផ្តើមព្រឹកព្រលឹមជាមួយគុយទាវភ្នំពេញគ្រឿងក្នុងពិសេស ខ្ទឹមលីងឈ្ងុយ និងកាហ្វេទឹកដោះគោកូរហុយផ្សែង! រសជាតិកម្រិតរាជធានី 💯☕',
      captionEn: 'Start your morning in Phnom Penh with iconic Kuy Teav and artisan condensed milk iced coffee! 💯☕',
      hashtags: '#PhnomPenhFood #KuyTeavPhnomPenh #KhmerBreakfast #CambodianCoffee #ភ្នំពេញ #គុយទាវខ្មែរ',
      videoConceptKh: 'ប្លង់ ១: ស្រង់សរសៃគុយទាវឡើង -> ប្លង់ ២: ចាក់ទឹកស៊ុបពុះក្តៅស្រោចលើសាច់ -> ប្លង់ ៣: ចាក់ទឹកដោះគោចូលកាហ្វេខ្មៅទឹកកក',
      videoConceptEn: 'Shot 1: Lifting bouncy rice noodles -> Shot 2: Pouring crystal clear boiling broth -> Shot 3: Swirling iced milk coffee',
    }
  ], [currentUser]);

  const currentViralIdea = viralAiIdeas[aiViralIndex % viralAiIdeas.length];

  const handleNextAiIdea = () => {
    setAiViralIndex(prev => prev + 1);
    setHasCopiedCaption(false);
    showToast(
      isKm 
        ? '🤖 AI បានបង្កើតគំនិតវីដេអូ Viral ថ្មីសម្រាប់មុខម្ហូបខ្មែរ!' 
        : '🤖 AI generated a new viral Khmer food concept!',
      'success'
    );
  };

  const handleCopyCaption = () => {
    const fullText = `${currentViralIdea.hookKh}\n\n${currentViralIdea.captionKh}\n\n${currentViralIdea.hashtags}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullText).then(() => {
        setHasCopiedCaption(true);
        showToast(isKm ? 'បានចម្លង Caption & Hashtags រួចរាល់!' : 'Caption & Hashtags copied!', 'success');
        setTimeout(() => setHasCopiedCaption(false), 2500);
      }).catch(() => {});
    }
  };

  // Global Search Filtering across Foods, Restaurants, and Destinations
  const searchResults = useMemo(() => {
    const q = (globalSearchQuery || '').toLowerCase().trim();
    if (!q) return null;

    const matchedFoods = foods.filter(f => 
      f.nameKh.toLowerCase().includes(q) ||
      f.nameEn.toLowerCase().includes(q) ||
      (f.descriptionKh && f.descriptionKh.toLowerCase().includes(q)) ||
      (f.categoryKh && f.categoryKh.toLowerCase().includes(q)) ||
      (f.ingredients && f.ingredients.some(i => i.nameKh.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q)))
    );

    const matchedRestaurants = restaurants.filter(r =>
      r.nameKh.toLowerCase().includes(q) ||
      r.nameEn.toLowerCase().includes(q) ||
      (r.addressKh && r.addressKh.toLowerCase().includes(q)) ||
      (r.provinceKh && r.provinceKh.toLowerCase().includes(q)) ||
      (r.signatureDishesKh && r.signatureDishesKh.some(d => d.toLowerCase().includes(q)))
    );

    const matchedDestinations = destinations.filter(d =>
      d.nameKh.toLowerCase().includes(q) ||
      d.nameEn.toLowerCase().includes(q) ||
      (d.descriptionKh && d.descriptionKh.toLowerCase().includes(q)) ||
      (d.provinceKh && d.provinceKh.toLowerCase().includes(q)) ||
      (d.categoryKh && d.categoryKh.toLowerCase().includes(q))
    );

    const totalCount = matchedFoods.length + matchedRestaurants.length + matchedDestinations.length;

    return {
      foods: matchedFoods,
      restaurants: matchedRestaurants,
      destinations: matchedDestinations,
      totalCount
    };
  }, [globalSearchQuery, foods, restaurants, destinations]);

  const handleAiRandomize = () => {
    setRandomSeed(prev => prev + 1);
    showToast(
      isKm 
        ? '✨ AI បាន Random វីដេអូ និងមុខម្ហូបល្បីៗថ្មីៗជូនលោកអ្នក!' 
        : '✨ AI randomly rotated fresh trending videos for you!',
      'success'
    );
  };

  // Filter trending foods by category and search, then apply AI random shuffle
  const displayTrendingFoods = useMemo(() => {
    let pool = trendingFoods.filter(item => {
      const matchCat = selectedCategory === 'all' || item.categorySlug === selectedCategory;
      if (!matchCat) return false;
      if (!trendingSearchQuery.trim()) return true;
      const q = trendingSearchQuery.toLowerCase().trim();
      return (
        item.foodNameKh.toLowerCase().includes(q) ||
        item.foodNameEn.toLowerCase().includes(q) ||
        item.restaurantNameKh.toLowerCase().includes(q) ||
        item.provinceKh.toLowerCase().includes(q) ||
        (item.landmarkNameKh && item.landmarkNameKh.toLowerCase().includes(q))
      );
    });

    if (pool.length <= 4) return pool;

    if (randomSeed > 0) {
      const copy = [...pool];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, 4);
    }

    return pool.slice(0, 4);
  }, [trendingFoods, selectedCategory, trendingSearchQuery, randomSeed]);

  const quickCategories = [
    { labelKh: 'ម្ហូបពិសេស', labelEn: 'Signature', icon: '🍲', tab: 'food' },
    { labelKh: 'ភោជនីយដ្ឋាន', labelEn: 'Restaurants', icon: '🏪', tab: 'restaurants' },
    { labelKh: 'ប្រាសាទបុរាណ', labelEn: 'Temples', icon: '🏛️', tab: 'tourism' },
    { labelKh: 'ឆ្នេរសមុទ្រ', labelEn: 'Beaches', icon: '🏝️', tab: 'tourism' },
    { labelKh: 'ទឹកធ្លាក់ & ភ្នំ', labelEn: 'Nature', icon: '🏞️', tab: 'tourism' },
  ];

  const foodCategoryChips: { id: TrendingFoodCategorySlug; labelKh: string; labelEn: string; icon: string }[] = [
    { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All', icon: '🔥' },
    { id: 'street_food', labelKh: 'អាហារតាមផ្លូវ', labelEn: 'Street Food', icon: '🍢' },
    { id: 'famous_dish', labelKh: 'មុខម្ហូបល្បីៗ', labelEn: 'Famous', icon: '🍲' },
    { id: 'cafe_drink', labelKh: 'កាហ្វេ & ភេសជ្ជៈ', labelEn: 'Café', icon: '☕' },
    { id: 'dessert_snack', labelKh: 'បង្អែម', labelEn: 'Desserts', icon: '🍨' },
    { id: 'unusual_local', labelKh: 'ម្ហូបប្លែកៗ', labelEn: 'Unusual', icon: '✨' },
  ];

  const handleOpenFoodDetail = (item: TrendingFoodItem) => {
    setSelectedTrendingFood(item);
    setIsTrendingFoodDetailModalOpen(true);
  };

  const handleOpenVideo = (e: React.MouseEvent, item: TrendingFoodItem) => {
    e.stopPropagation();
    const url = item.videoUrl || item.sourceUrl;
    if (url) {
      window.open(url, '_blank');
    } else {
      handleOpenFoodDetail(item);
    }
  };

  const handleCall = (e: React.MouseEvent, phone?: string) => {
    e.stopPropagation();
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    } else {
      showToast(isKm ? 'មិនមានលេខទូរស័ព្ទសម្រាប់ហាងនេះទេ' : 'No phone number available', 'info');
    }
  };

  const handleMap = (e: React.MouseEvent, item: TrendingFoodItem) => {
    e.stopPropagation();
    if (item.mapUrl) {
      window.open(item.mapUrl, '_blank');
    } else if (item.latitude && item.longitude) {
      window.open(`https://maps.google.com/?q=${item.latitude},${item.longitude}`, '_blank');
    }
  };

  const handleShare = (e: React.MouseEvent, item: TrendingFoodItem) => {
    e.stopPropagation();
    const text = isKm
      ? `🔥 មុខម្ហូបល្បីលើ TikTok & FB៖ ${item.foodNameKh} នៅ ${item.restaurantNameKh} (${item.provinceKh})!`
      : `🔥 Trending Food: ${item.foodNameEn} at ${item.restaurantNameEn} (${item.provinceEn})!`;
    if (navigator.share) {
      navigator.share({ title: item.foodNameKh, text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      showToast(isKm ? 'បានចម្លងព័ត៌មានរួចរាល់!' : 'Copied info to clipboard!', 'success');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-5 pb-24 font-khmer">
      {/* 1. Fast Global Top Search Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            placeholder={isKm ? 'ស្វែងរកមុខម្ហូប, គ្រឿងផ្សំ, ហាងអាហារ, ឬទីតាំងទេសចរណ៍...' : 'Search food, dishes, ingredients, restaurants, places...'}
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-500/30 text-slate-900 dark:text-white placeholder-slate-400 text-xs shadow-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-khmer transition"
          />
          {globalSearchQuery && (
            <button
              onClick={() => setGlobalSearchQuery('')}
              className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              title={isKm ? 'សម្អាតការស្វែងរក' : 'Clear search'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Global Live Search Results Dropdown/Panel */}
      {searchResults && (
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border-2 border-emerald-500 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5">
              <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                {isKm ? `លទ្ធផលស្វែងរក (${searchResults.totalCount})` : `Search Results (${searchResults.totalCount})`}
              </h3>
            </div>
            <button
              onClick={() => setGlobalSearchQuery('')}
              className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-0.5"
            >
              <span>{isKm ? 'បិទការស្វែងរក' : 'Close'}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Result Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <button
              onClick={() => setSearchTab('all')}
              className={`px-3 py-1 rounded-xl font-bold transition text-[11px] ${
                searchTab === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {isKm ? `ទាំងអស់ (${searchResults.totalCount})` : `All (${searchResults.totalCount})`}
            </button>
            <button
              onClick={() => setSearchTab('food')}
              className={`px-3 py-1 rounded-xl font-bold transition text-[11px] flex items-center gap-1 ${
                searchTab === 'food'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>🍲</span>
              <span>{isKm ? `មុខម្ហូប (${searchResults.foods.length})` : `Dishes (${searchResults.foods.length})`}</span>
            </button>
            <button
              onClick={() => setSearchTab('restaurants')}
              className={`px-3 py-1 rounded-xl font-bold transition text-[11px] flex items-center gap-1 ${
                searchTab === 'restaurants'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>🏪</span>
              <span>{isKm ? `ហាងអាហារ (${searchResults.restaurants.length})` : `Restaurants (${searchResults.restaurants.length})`}</span>
            </button>
            <button
              onClick={() => setSearchTab('tourism')}
              className={`px-3 py-1 rounded-xl font-bold transition text-[11px] flex items-center gap-1 ${
                searchTab === 'tourism'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>🏛️</span>
              <span>{isKm ? `ទេសចរណ៍ (${searchResults.destinations.length})` : `Places (${searchResults.destinations.length})`}</span>
            </button>
          </div>

          {/* Results List */}
          <div className="space-y-2 max-h-[360px] overflow-y-auto no-scrollbar pt-1">
            {searchResults.totalCount === 0 ? (
              <div className="py-8 text-center text-slate-500 space-y-2.5">
                <Search className="w-8 h-8 mx-auto text-slate-400 stroke-1" />
                <p className="text-xs">
                  {isKm 
                    ? `រកមិនឃើញលទ្ធផលត្រូវនឹង "${globalSearchQuery}" ទេ` 
                    : `No results found for "${globalSearchQuery}"`}
                </p>
                <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1 text-[11px]">
                  <span className="text-slate-400">{isKm ? 'សាកល្បង៖' : 'Try:'}</span>
                  {['សម្លការី', 'នំបញ្ចុក', 'អាម៉ុក', 'បាត់ដំបង', 'សៀមរាប'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setGlobalSearchQuery(tag)}
                      className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-200"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Foods */}
                {(searchTab === 'all' || searchTab === 'food') && searchResults.foods.map((food) => (
                  <div
                    key={`food-${food.id}`}
                    onClick={() => setSelectedFood(food)}
                    className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-slate-600 flex items-center justify-between gap-3 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={food.photoUrl} alt={food.nameKh} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-bold">
                            🍲 មុខម្ហូប
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-emerald-600">
                            {isKm ? food.nameKh : food.nameEn}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {isKm ? food.descriptionKh : food.descriptionEn}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
                  </div>
                ))}

                {/* Restaurants */}
                {(searchTab === 'all' || searchTab === 'restaurants') && searchResults.restaurants.map((rest) => (
                  <div
                    key={`rest-${rest.id}`}
                    onClick={() => setSelectedRestaurant(rest)}
                    className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-slate-600 flex items-center justify-between gap-3 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={rest.photoUrl} alt={rest.nameKh} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-bold">
                            🏪 ហាងអាហារ
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-emerald-600">
                            {isKm ? rest.nameKh : rest.nameEn}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          📍 {rest.addressKh} • 📞 {rest.phone}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
                  </div>
                ))}

                {/* Destinations */}
                {(searchTab === 'all' || searchTab === 'tourism') && searchResults.destinations.map((dest) => (
                  <div
                    key={`dest-${dest.id}`}
                    onClick={() => setSelectedDestination(dest)}
                    className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-slate-600 flex items-center justify-between gap-3 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={dest.photoUrl} alt={dest.nameKh} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-[9px] font-bold">
                            🏛️ ទេសចរណ៍
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-emerald-600">
                            {isKm ? dest.nameKh : dest.nameEn}
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          📍 {dest.provinceKh} ({dest.categoryKh})
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition" />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero Banner (Clean Deep Emerald) */}
      <div className="relative rounded-3xl overflow-hidden shadow-md bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#047857] text-white p-5 border border-emerald-600/30">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-emerald-100 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>{isKm ? 'មរតកវប្បធម៌ខ្មែរ' : 'Cambodian Heritage'}</span>
            </div>
            <span className="text-[10px] bg-[#10B981] text-white px-2 py-0.5 rounded-full font-bold shadow-xs">
              100+ Dishes & Shops
            </span>
          </div>

          {currentUser && (
            <div className="flex items-center gap-2 pt-1 pb-0.5 animate-in fade-in">
              <span className="text-sm sm:text-base font-bold font-khmer text-emerald-200 flex items-center gap-1.5 drop-shadow-sm flex-wrap">
                <span>{isKm ? 'សួស្តី,' : 'Hello,'}</span>
                <span className="text-white text-base sm:text-xl font-bold font-moul underline decoration-emerald-400 decoration-2">{currentUser.name}</span>
                <span>👋</span>
              </span>
            </div>
          )}

          <h2 className="font-moul text-lg sm:text-xl text-white leading-snug drop-shadow-sm">
            {isKm 
              ? 'ភ្លក្សរសជាតិម្ហូបខ្មែរ និងទស្សនាសម្រស់កម្ពុជា' 
              : 'Taste Khmer Flavors & Discover Cambodia'}
          </h2>

          <p className="text-xs text-emerald-100 leading-relaxed font-normal">
            {isKm
              ? 'ស្វែងរកមុខម្ហូបប្រពៃណី ១០០+ មុខ រូបមន្តចម្អិន ភោជនីយដ្ឋាន ១០០+ ហាង និងតំបន់ទេសចរណ៍ស្រស់ត្រកាលទូទាំងប្រទេស'
              : 'Discover 100+ authentic Khmer dishes, cooking recipes, 100+ restaurants, and breathtaking destinations.'}
          </p>

          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('food')}
              className="px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1 font-khmer"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>{isKm ? 'មើលមុខម្ហូប' : 'Explore Food'}</span>
            </button>

            <button
              onClick={() => openInstallModal('android')}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-xs border border-white/20 transition flex items-center gap-1.5 font-khmer"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
              <span>{isKm ? 'ដំឡើង APK' : 'Install APK'}</span>
            </button>

            <button
              onClick={() => openInstallModal('ios')}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-xs border border-white/20 transition flex items-center gap-1.5 font-khmer"
            >
              <Apple className="w-3.5 h-3.5 text-emerald-200" />
              <span>{isKm ? 'សម្រាប់ iOS' : 'For iOS'}</span>
            </button>

            <button
              onClick={() => setIsSupportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#065F46] hover:bg-[#047857] text-white font-medium text-xs border border-emerald-400/40 shadow-xs transition flex items-center gap-1.5 font-khmer"
            >
              <Heart className="w-3.5 h-3.5 fill-white text-white" />
              <span>{isKm ? 'ជួយគាំទ្រ' : 'Support'}</span>
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* 3. VIP Restaurant Management Showcase Card on Home (Restored & Highly Potential) */}
      {(isVip || currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-amber-600/20 border-2 border-amber-400/80 shadow-md space-y-3 font-khmer">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-md">
                <Crown className="w-6 h-6 fill-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-moul text-xs sm:text-sm text-slate-900 dark:text-white">
                    {isKm ? 'ផ្ទាំងគ្រប់គ្រងហាង VIP' : 'VIP Restaurant Management'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-950 shadow-2xs">
                    🌟 VIP Active
                  </span>
                </div>
                <p className="text-[10px] text-amber-800 dark:text-amber-300 font-bold mt-0.5">
                  {isKm 
                    ? 'គណនី VIP សក្តានុពលខ្ពស់ • សិទ្ធិបន្ថែម & គ្រប់គ្រងហាងពេញលេញ' 
                    : 'Super Potential VIP Account • Full Restaurant & Menu Management'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsVipAddRestaurantModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-bold text-xs shadow-xs transition flex items-center gap-1 shrink-0 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isKm ? 'បន្ថែមហាង VIP' : 'Add Store'}</span>
            </button>
          </div>

          {/* User's Owned Restaurants on Home */}
          <div className="space-y-2 pt-1">
            {myRestaurants.length === 0 ? (
              <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-2xl border border-amber-300/50 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-700 dark:text-slate-200">
                  {isKm ? '💡 លោកអ្នកមិនទាន់បានបន្ថែមហាងនៅឡើយទេ។ ចុចប៊ូតុងដើម្បីបង្កើតហាង VIP ដំបូងរបស់អ្នក!' : 'You have not added any restaurant yet. Click Add to list your VIP shop!'}
                </div>
                <button
                  onClick={() => setIsVipAddRestaurantModalOpen(true)}
                  className="px-3 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl text-[11px] font-bold shrink-0 transition"
                >
                  {isKm ? '+ បន្ថែមហាង' : '+ Add Shop'}
                </button>
              </div>
            ) : (
              myRestaurants.map((shop) => (
                <div 
                  key={shop.id}
                  className="p-3 bg-white/85 dark:bg-slate-800/85 rounded-2xl border border-amber-300/60 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={shop.photoUrl} alt={shop.nameKh} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {isKm ? shop.nameKh : shop.nameEn}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        📍 {shop.addressKh} • 📞 {shop.phone}
                      </p>
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                        {shop.menuItems?.length || 0} / 5 មុខម្ហូបក្នុងហាង
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setManagingRestaurant(shop);
                        setIsManageMenuModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold shadow-xs transition flex items-center gap-1"
                      title={isKm ? 'គ្រប់គ្រងមុខម្ហូប & ព័ត៌មាន' : 'Manage Menu & Details'}
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{isKm ? 'គ្រប់គ្រង' : 'Manage'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* App Installation & Support Interactive Showcase Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-[#064E3B] dark:text-emerald-400 shadow-2xs shrink-0 border border-emerald-200/60">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-[#0F172A] dark:text-white text-xs sm:text-sm font-khmer">
              {isKm ? 'ដំឡើងកម្មវិធីទូរស័ព្ទដៃ' : 'Install Mobile App'}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-khmer line-clamp-1">
              {isKm ? 'ទាញយក Android APK ឬដំឡើងលើ Apple iOS' : 'Download Android APK or install on Apple iOS'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => openInstallModal('android')}
            className="flex items-center gap-1 px-2.5 py-2 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl shadow-xs transition text-xs font-bold font-khmer"
            title={isKm ? 'ដំឡើង Android APK' : 'Install APK'}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
            <span>APK</span>
          </button>
          <button
            onClick={() => openInstallModal('ios')}
            className="flex items-center gap-1 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-xs transition text-xs font-bold font-khmer border border-slate-700"
            title={isKm ? 'ដំឡើងលើ iPhone (iOS)' : 'Install on iOS'}
          >
            <Apple className="w-3.5 h-3.5 text-slate-200" />
            <span>iOS</span>
          </button>
          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="p-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl shadow-xs transition"
            title={isKm ? 'ជួយឧបត្ថម្ភ KHQR' : 'Support'}
          >
            <Heart className="w-4 h-4 fill-white" />
          </button>
        </div>
      </div>

      {/* Quick Category Icons */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-1">
        {quickCategories.map((cat, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(cat.tab as any)}
            className="flex flex-col items-center p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs min-w-[70px] hover:border-emerald-500 transition active:scale-95"
          >
            <span className="text-xl mb-1">{cat.icon}</span>
            <span className="text-[10px] font-bold text-[#0F172A] dark:text-slate-200 text-center">
              {isKm ? cat.labelKh : cat.labelEn}
            </span>
          </button>
        ))}
      </div>

      {/* 6 Personalized Account Features Suite (មជ្ឈមណ្ឌលផ្ទាល់ខ្លួនសម្រាប់គណនី) */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950 via-[#064E3B] to-slate-900 text-white border border-emerald-500/40 shadow-sm space-y-3 font-khmer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <div>
              <h3 className="font-moul text-xs sm:text-sm text-white flex items-center gap-1.5">
                <span>{isKm ? 'សេវាកម្មផ្ទាល់ខ្លួន (Member Hub)' : 'Personalized Member Hub'}</span>
              </h3>
              <p className="text-[10px] text-emerald-200">
                {currentUser 
                  ? (isKm ? `គណនី៖ ${currentUser.name}` : `Account: ${currentUser.name}`)
                  : (isKm ? 'ចូលគណនីដើម្បីរីករាយមុខងារពិសេសទាំង ៦' : 'Sign in to unlock all 6 account features')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Food Check-in Quick Button inside Member Hub (Administrator Only) */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setIsAiCheckInModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-[10px] font-bold shadow-md flex items-center gap-1 active:scale-95 transition"
                title={isKm ? 'ឆែកអ៊ីន & បន្ថែមហាងដោយ AI (Administrator Only)' : 'AI Food Check-in (Admin Only)'}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isKm ? 'ឆែកអ៊ីន AI' : 'AI Check-in'}</span>
              </button>
            )}

            {!currentUser && (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-stone-900 rounded-xl text-[10px] font-black shadow-xs transition"
              >
                {isKm ? 'ចូលគណនី' : 'Sign In'}
              </button>
            )}
          </div>
        </div>

        {/* 6 Feature Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* A. ថ្ងៃនេះញ៉ាំអ្វី? (High Priority) */}
          <button
            onClick={() => setIsWhatToEatModalOpen(true)}
            className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-400/50 hover:border-amber-400 text-left transition group active:scale-95 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xl">🍲</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-stone-900 text-[9px] font-black shadow-xs">
                {isKm ? 'អាទិភាពខ្ពស់ ⭐' : 'High Priority ⭐'}
              </span>
            </div>
            <div className="text-xs font-bold text-white group-hover:text-amber-300">
              {isKm ? 'ថ្ងៃនេះញ៉ាំអ្វី?' : 'What to Eat Today?'}
            </div>
            <div className="text-[10px] text-amber-200/80 line-clamp-1 mt-0.5">
              {isKm ? 'ជ្រើសរើសម្ហូបតាមថវិកា' : 'Smart meal match'}
            </div>
          </button>

          {/* B. នៅជិតខ្ញុំ */}
          <button
            onClick={() => setIsNearMeModalOpen(true)}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition group active:scale-95"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xl">📍</span>
              <span className="text-[10px] font-mono text-emerald-300 font-bold">GPS</span>
            </div>
            <div className="text-xs font-bold text-white group-hover:text-emerald-300">
              {isKm ? 'នៅជិតខ្ញុំ' : 'Near Me'}
            </div>
            <div className="text-[10px] text-slate-300 line-clamp-1 mt-0.5">
              {isKm ? 'រកហាង & កន្លែងក្បែរខ្លួន' : 'Places & distances'}
            </div>
          </button>

          {/* C. កន្លែងថ្មីប្រចាំថ្ងៃ */}
          <button
            onClick={() => setIsDailyDiscoveriesModalOpen(true)}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition group active:scale-95"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xl">✨</span>
              <span className="text-[9px] text-amber-300 font-bold">Daily</span>
            </div>
            <div className="text-xs font-bold text-white group-hover:text-emerald-300">
              {isKm ? 'កន្លែងថ្មីប្រចាំថ្ងៃ' : 'Daily Picks'}
            </div>
            <div className="text-[10px] text-slate-300 line-clamp-1 mt-0.5">
              {isKm ? 'ស្វែងយល់ថ្ងៃនេះ' : 'Daily hidden gems'}
            </div>
          </button>

          {/* D. បញ្ជីកន្លែងដែលចង់ទៅ */}
          <button
            onClick={() => setIsWishlistsModalOpen(true)}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition group active:scale-95"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xl">📑</span>
              <span className="text-[9px] text-emerald-300 font-bold">Lists</span>
            </div>
            <div className="text-xs font-bold text-white group-hover:text-emerald-300">
              {isKm ? 'បញ្ជីកន្លែងចង់ទៅ' : 'Wishlists'}
            </div>
            <div className="text-[10px] text-slate-300 line-clamp-1 mt-0.5">
              {isKm ? 'ហាងចង់សាក គ្រួសារ' : 'Custom trip lists'}
            </div>
          </button>

          {/* E. ផែនការដើរលេង AI */}
          <button
            onClick={() => setIsAiTripPlannerModalOpen(true)}
            className="p-3 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-600/30 border border-teal-400/40 text-left transition group active:scale-95"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xl">🤖</span>
              <span className="px-1.5 py-0.2 rounded-full bg-teal-400/30 text-teal-200 text-[9px] font-bold">
                Smart AI
              </span>
            </div>
            <div className="text-xs font-bold text-white group-hover:text-teal-300">
              {isKm ? 'ផែនការដើរលេង AI' : 'AI Trip Planner'}
            </div>
            <div className="text-[10px] text-teal-200/80 line-clamp-1 mt-0.5">
              {isKm ? 'AI រៀបចំផ្លូវស្វ័យប្រវត្តិ' : 'Automated itinerary'}
            </div>
          </button>

          {/* F. ការជូនដំណឹងដែលមានប្រយោជន៍ */}
          <button
            onClick={() => setIsNotificationsModalOpen(true)}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition group active:scale-95 relative"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xl">🔔</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse">
                  {unreadNotificationsCount} ថ្មី
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-white group-hover:text-emerald-300">
              {isKm ? 'ការជូនដំណឹង' : 'Notifications'}
            </div>
            <div className="text-[10px] text-slate-300 line-clamp-1 mt-0.5">
              {isKm ? 'ប្រូម៉ូសិនហាង & បញ្ចុះតម្លៃ' : 'Promos & updates'}
            </div>
          </button>
        </div>
      </div>

      {/* REQUIREMENTS 1 & 2: DEDICATED AI TRENDING FOOD SECTION (TIKTOK & FB REVIEW) */}
      {/* Placed directly below the complete Account/Profile section */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 text-white border border-rose-500/40 shadow-md space-y-3 font-khmer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>TikTok & FB Review</span>
            </span>
            <div>
              <h3 className="font-moul text-xs sm:text-sm text-white">
                {isKm ? 'អាហារល្បីលើ TikTok & FB' : 'Trending Food on TikTok & FB'}
              </h3>
              <p className="text-[10px] text-pink-200">
                {isKm ? 'វីដេអូពេញនិយម និងរូបភាពទីតាំងតំណាងខេត្ត' : 'Viral food videos & iconic provincial landmarks'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAiRandomize}
              className="px-2 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-stone-900 text-[10px] font-bold shadow-xs flex items-center gap-1 active:scale-95 transition"
              title={isKm ? 'AI Random ជ្រើសរើសវីដេអូល្បីៗថ្មីៗ' : 'AI Random Trending Videos'}
            >
              <Shuffle className="w-3 h-3" />
              <span>{isKm ? 'AI Random' : 'AI Shuffle'}</span>
            </button>
            <button
              onClick={() => setIsTrendingSocialModalOpen(true)}
              className="text-xs font-bold text-pink-300 hover:text-white flex items-center gap-0.5"
            >
              <span>{isKm ? 'មើលទាំងអស់' : 'View All'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category Filter Chips for Trending Food */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {foodCategoryChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => setSelectedCategory(chip.id)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
                selectedCategory === chip.id
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-white/10 text-pink-200 hover:text-white border border-white/10'
              }`}
            >
              <span>{chip.icon}</span>
              <span>{isKm ? chip.labelKh : chip.labelEn}</span>
            </button>
          ))}
        </div>

        {/* AI Smart Search Box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-pink-300" />
          <input
            type="text"
            value={trendingSearchQuery}
            onChange={(e) => setTrendingSearchQuery(e.target.value)}
            placeholder={isKm ? "ស្វែងរកវីដេអូ ឬទីតាំងខេត្តដោយ AI..." : "Search viral food or province by AI..."}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/10 text-white placeholder-pink-200/60 border border-white/15 text-[11px] focus:outline-none focus:border-rose-400"
          />
        </div>

        {/* REQUIREMENT 5: DEDICATED AI TIKTOK VIRAL FOOD GENERATOR & TRENDING DATA ENGINE */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-black/80 via-rose-950/70 to-slate-900 border border-rose-400/50 space-y-3 font-khmer shadow-md text-xs">
          {/* Header row with Creator Account & Live Status */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-rose-500/30">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-moul text-xs text-white">
                    {isKm ? 'AI TikTok Viral Food Creator' : 'AI TikTok Viral Creator'}
                  </h4>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[8px] font-mono font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live TikTok Connected</span>
                  </span>
                </div>
                <p className="text-[10px] text-pink-200 truncate mt-0.5">
                  🎵 {isKm ? 'គណនីទិន្នន័យ៖' : 'Source:'} <span className="font-bold text-amber-300">{currentViralIdea.accountHandle}</span> ({currentViralIdea.verifiedCreator})
                </p>
              </div>
            </div>

            <button
              onClick={handleNextAiIdea}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-stone-900 font-bold text-[10px] shadow-xs flex items-center gap-1 shrink-0 transition active:scale-95"
              title={isKm ? 'បង្កើតគំនិត AI ថ្មី' : 'Generate New Idea'}
            >
              <RefreshCw className="w-3 h-3" />
              <span>{isKm ? 'គំនិតថ្មី' : 'New Idea'}</span>
            </button>
          </div>

          {/* AI Generated Viral Content Breakdown */}
          <div className="space-y-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
            {/* Viral Hook */}
            <div>
              <div className="text-[10px] font-bold text-pink-300 flex items-center gap-1">
                <span>💡</span>
                <span>{isKm ? 'ចំណងជើងទាក់ទាញ (AI Viral Hook):' : 'AI Viral Hook:'}</span>
              </div>
              <p className="text-[11px] font-bold text-white mt-0.5 leading-snug bg-black/40 p-2 rounded-lg border border-rose-500/30">
                "{isKm ? currentViralIdea.hookKh : currentViralIdea.hookEn}"
              </p>
            </div>

            {/* AI Caption & Hashtags */}
            <div>
              <div className="text-[10px] font-bold text-pink-300 flex items-center gap-1">
                <span>📝</span>
                <span>{isKm ? 'អត្ថបទបង្ហោះ & Hashtags (AI Caption):' : 'AI Caption & Hashtags:'}</span>
              </div>
              <p className="text-[10px] text-slate-200 mt-0.5 leading-relaxed bg-black/30 p-2 rounded-lg">
                {isKm ? currentViralIdea.captionKh : currentViralIdea.captionEn}
              </p>
              <p className="text-[9px] font-mono text-amber-300 mt-1 break-words">
                {currentViralIdea.hashtags}
              </p>
            </div>

            {/* 3-Shot Video Concept */}
            <div>
              <div className="text-[10px] font-bold text-teal-300 flex items-center gap-1">
                <Video className="w-3 h-3 text-teal-300" />
                <span>{isKm ? 'ប្លង់ថតវីដេអូ AI (3-Shot Video Concept):' : '3-Shot Video Concept:'}</span>
              </div>
              <p className="text-[10px] text-teal-100 mt-0.5 leading-relaxed bg-teal-950/40 p-2 rounded-lg border border-teal-500/30">
                🎬 {isKm ? currentViralIdea.videoConceptKh : currentViralIdea.videoConceptEn}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={handleCopyCaption}
              className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-[10px] transition flex items-center justify-center gap-1 shadow-xs ${
                hasCopiedCaption
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
              }`}
            >
              {hasCopiedCaption ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{hasCopiedCaption ? (isKm ? 'បានចម្លងរួចរាល់!' : 'Copied!') : (isKm ? 'ចម្លង Caption & Tags' : 'Copy Caption')}</span>
            </button>

            <a
              href={`https://www.tiktok.com/search?q=${encodeURIComponent(currentViralIdea.foodNameKh)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isKm ? 'មើលលើ TikTok' : 'Watch TikTok'}</span>
            </a>
          </div>
        </div>

        {/* 4 Trending Video Panels Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {displayTrendingFoods.map((food) => (
            <div
              key={food.id}
              onClick={() => handleOpenFoodDetail(food)}
              className="group relative rounded-2xl overflow-hidden aspect-4/3 bg-slate-800 border border-white/15 cursor-pointer shadow-sm hover:scale-[1.02] transition duration-200 flex flex-col justify-between"
            >
              {/* Landmark background photo */}
              <img 
                src={food.photoUrl} 
                alt={food.foodNameKh} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                loading="lazy" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />
              
              {/* Badges on top: Platform & Views */}
              <div className="relative z-10 p-2 flex items-center justify-between gap-1">
                {food.sourcePlatform === 'tiktok' ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-black/85 text-pink-300 border border-pink-500/40 text-[8px] font-black shadow-xs flex items-center gap-1">
                    <span>🎵</span>
                    <span>TikTok</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-600/90 text-white text-[8px] font-black shadow-xs flex items-center gap-1">
                    <span>📘</span>
                    <span>FB Reel</span>
                  </span>
                )}

                {/* Viral Sharing Account or Views */}
                <span className="px-1.5 py-0.5 rounded-full bg-black/75 text-amber-300 text-[8px] font-bold border border-amber-400/30 font-mono truncate max-w-[55%]">
                  {food.sourceAccount || `👁️ ${food.socialViews || 'Viral'}`}
                </span>
              </div>

              {/* Center Play Button Overlay to Watch Trending Video from Sharing Account */}
              <div className="relative z-10 flex flex-col items-center justify-center -mt-1">
                <button
                  onClick={(e) => handleOpenVideo(e, food)}
                  className="px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-[9px] font-bold shadow-lg flex items-center gap-1 active:scale-95 transition border border-white/20"
                  title={isKm ? `ចុចមើលវីដេអូល្បីពី ${food.sourceAccount || food.sourcePlatform}` : 'Watch Viral Video'}
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{food.sourceAccount ? `មើល ${food.sourceAccount}` : (food.sourcePlatform === 'tiktok' ? 'វីដេអូ TikTok' : 'វីដេអូ FB')}</span>
                </button>
              </div>

              {/* Location / Village scenery indicator with Landmark name */}
              <span 
                className="absolute bottom-1 right-1.5 z-10 bg-black/80 text-emerald-300 text-[7px] px-1.5 py-0.5 rounded-xs font-khmer select-none shadow-xs border border-emerald-500/30 line-clamp-1 max-w-[85%]"
                title={isKm ? 'រូបភាពទីតាំង / ភូមិដ្ឋាន' : 'Location / Village Scenery'}
              >
                {isKm 
                  ? `📍 ${food.landmarkNameKh ? food.landmarkNameKh.split('(')[0].trim() : food.provinceKh} (រូបភាពទីតាំង / ភូមិដ្ឋាន)`
                  : `📍 ${food.landmarkNameEn || food.provinceEn} (Location)`}
              </span>

              {/* Title & Info on bottom */}
              <div className="relative z-10 p-2">
                <h4 className="font-bold text-white text-xs line-clamp-1 leading-snug drop-shadow">
                  {isKm ? food.foodNameKh : food.foodNameEn}
                </h4>
                <p className="text-[9px] text-pink-200 line-clamp-1">
                  🏪 {isKm ? food.restaurantNameKh : food.restaurantNameEn}
                </p>
                <div className="flex items-center justify-between mt-1 text-[8px] text-pink-300">
                  <span className="truncate max-w-[70%]">📍 {isKm ? food.provinceKh : food.provinceEn}</span>
                  {food.priceDisplay && <span className="font-mono font-bold text-amber-300 shrink-0">{food.priceDisplay.split('/')[0]}</span>}
                </div>

                {/* Quick 4-Action Bar on Card: Video, Map, Call, Share */}
                <div className="grid grid-cols-4 gap-1 pt-1.5">
                  <button
                    onClick={(e) => handleOpenVideo(e, food)}
                    className="py-1 px-0.5 bg-rose-600/80 hover:bg-rose-500 text-white rounded-md text-[8px] font-bold flex items-center justify-center gap-0.5 transition"
                    title={isKm ? 'មើលវីដេអូ' : 'Play Video'}
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>{isKm ? 'វីដេអូ' : 'Play'}</span>
                  </button>

                  <button
                    onClick={(e) => handleMap(e, food)}
                    className="py-1 px-0.5 bg-white/20 hover:bg-white/30 text-white rounded-md text-[8px] font-bold flex items-center justify-center gap-0.5 transition"
                    title={isKm ? 'នាំផ្លូវ' : 'Map'}
                  >
                    <Navigation className="w-2.5 h-2.5 text-emerald-300" />
                    <span>{isKm ? 'ផ្លូវ' : 'Map'}</span>
                  </button>

                  <button
                    onClick={(e) => handleCall(e, food.phone)}
                    className="py-1 px-0.5 bg-white/20 hover:bg-white/30 text-white rounded-md text-[8px] font-bold flex items-center justify-center gap-0.5 transition"
                    title={isKm ? 'ទូរស័ព្ទ' : 'Call'}
                  >
                    <Phone className="w-2.5 h-2.5 text-emerald-300" />
                    <span>{isKm ? 'Call' : 'Call'}</span>
                  </button>

                  <button
                    onClick={(e) => handleShare(e, food)}
                    className="py-1 px-0.5 bg-white/20 hover:bg-white/30 text-white rounded-md text-[8px] font-bold flex items-center justify-center gap-0.5 transition"
                    title={isKm ? 'ចែករំលែក' : 'Share'}
                  >
                    <Share2 className="w-2.5 h-2.5 text-pink-300" />
                    <span>{isKm ? 'Share' : 'Share'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setIsTrendingSocialModalOpen(true)}
            className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-pink-200 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>{isKm ? 'ស្វែងយល់មុខម្ហូបល្បីៗទាំងអស់' : 'Explore All Viral Foods'}</span>
          </button>

          <button
            onClick={handleAiRandomize}
            className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-stone-900 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            title={isKm ? 'ប្តូរវីដេអូល្បីៗដោយ AI' : 'Randomize Videos with AI'}
          >
            <Shuffle className="w-3.5 h-3.5 text-stone-900" />
            <span>{isKm ? 'ប្តូរវីដេអូ AI' : 'Shuffle AI'}</span>
          </button>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setIsAiCheckInModalOpen(true)}
              className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              title={isKm ? 'ឆែកអ៊ីន & បន្ថែមហាងដោយ AI (Administrator Only)' : 'AI Food Check-in (Admin Only)'}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-200" />
              <span>{isKm ? 'ឆែកអ៊ីន & បន្ថែមហាង' : 'Check in & Add'}</span>
            </button>
          )}
        </div>
      </div>



      {/* Section 4: Community Highlights */}
      {posts.length > 0 && (
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#064E3B] dark:text-emerald-400 flex items-center gap-1.5 font-khmer">
              <Heart className="w-4 h-4 text-rose-500 fill-current" />
              {isKm ? 'ការចែករំលែកថ្មីៗពីសហគមន៍' : 'Recent Community Stories'}
            </span>
            <button
              onClick={() => setActiveTab('community')}
              className="text-xs font-semibold text-[#064E3B] dark:text-emerald-400 hover:underline font-khmer"
            >
              {isKm ? 'ចូលរួម' : 'Join Feed'}
            </button>
          </div>
          <p className="text-xs text-[#0F172A] dark:text-slate-300 font-khmer">
            {posts[0].titleKh}
          </p>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { RestaurantCard } from './RestaurantCard';
import { TouristCard } from './TouristCard';
import { isRestaurantPremiumActive, TrendingFoodCategorySlug, TrendingFoodItem } from '../types';
import { 
  Sparkles, ChevronRight, Utensils, Store, Compass, 
  MapPin, Heart, Flame, QrCode, Download, ShieldCheck,
  Apple, Smartphone, Bot, Calendar, Bookmark, Bell, 
  UtensilsCrossed, MessageSquareQuote, Camera, Phone,
  Share2, Navigation, Eye, ExternalLink
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
    setIsAiCheckInModalOpen, showToast
  } = useApp();

  const isKm = language === 'km';
  const featuredFoods = foods.slice(0, 4);

  // Active category filter for AI Trending Food on Home
  const [selectedCategory, setSelectedCategory] = useState<TrendingFoodCategorySlug>('all');

  // Filter trending foods by category for Home showcase
  const displayTrendingFoods = trendingFoods
    .filter(item => selectedCategory === 'all' || item.categorySlug === selectedCategory)
    .slice(0, 4);

  // Benefits 1 & 8: Dedicated Premium VIP Showcase & Featured sorting
  const premiumVipRestaurants = restaurants.filter(r => isRestaurantPremiumActive(r));
  const otherRestaurants = restaurants.filter(r => !isRestaurantPremiumActive(r));
  const featuredRestaurants = [...premiumVipRestaurants, ...otherRestaurants].slice(0, 3);
  const featuredDestinations = destinations.slice(0, 3);

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
    <div className="max-w-md mx-auto px-4 py-3 space-y-6 pb-24">
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
                {isKm ? 'ហាងអាហារឆ្ងាញ់ៗ ប្លែកៗ និងល្បីបំផុតលើបណ្តាញសង្គម' : 'Viral restaurants, street food, cafés & unique dishes'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTrendingSocialModalOpen(true)}
            className="text-xs font-bold text-pink-300 hover:text-white flex items-center gap-0.5"
          >
            <span>{isKm ? 'មើលទាំងអស់' : 'View All'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
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

        {/* 4 Trending Food Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {displayTrendingFoods.map((food) => (
            <div
              key={food.id}
              onClick={() => handleOpenFoodDetail(food)}
              className="group relative rounded-2xl overflow-hidden aspect-4/3 bg-slate-800 border border-white/15 cursor-pointer shadow-sm hover:scale-[1.02] transition duration-200 flex flex-col justify-between"
            >
              <img 
                src={food.photoUrl} 
                alt={food.foodNameKh} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                loading="lazy" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
              
              {/* Badges on top */}
              <div className="relative z-10 p-2 flex items-center justify-between">
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600/95 text-white text-[8px] font-black shadow-xs">
                  {food.socialViews || 'Viral'}
                </span>
                {food.socialLikes && (
                  <span className="px-1.5 py-0.5 rounded-full bg-black/60 text-rose-300 text-[8px] font-bold">
                    ❤️ {food.socialLikes}
                  </span>
                )}
              </div>

              {/* Location / Village scenery indicator */}
              <span className="absolute bottom-1 right-1.5 z-10 bg-black/70 text-white/90 text-[7px] px-1.5 py-0.5 rounded-xs font-khmer select-none shadow-xs">
                {isKm ? 'រូបភាពទីតាំង / ភូមិដ្ឋាន' : 'Location / Village Scenery'}
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
                  <span>📍 {isKm ? food.provinceKh : food.provinceEn}</span>
                  {food.priceDisplay && <span className="font-mono font-bold text-amber-300">{food.priceDisplay.split('/')[0]}</span>}
                </div>

                {/* Quick 3-Action Bar on Card */}
                <div className="grid grid-cols-3 gap-1 pt-1.5">
                  <button
                    onClick={(e) => handleMap(e, food)}
                    className="py-1 px-1 bg-white/20 hover:bg-white/30 text-white rounded-md text-[8px] font-bold flex items-center justify-center gap-0.5 transition"
                    title={isKm ? 'នាំផ្លូវ' : 'Map'}
                  >
                    <Navigation className="w-2.5 h-2.5 text-emerald-300" />
                    <span>{isKm ? 'ផ្លូវ' : 'Map'}</span>
                  </button>

                  <button
                    onClick={(e) => handleCall(e, food.phone)}
                    className="py-1 px-1 bg-white/20 hover:bg-white/30 text-white rounded-md text-[8px] font-bold flex items-center justify-center gap-0.5 transition"
                    title={isKm ? 'ទូរស័ព្ទ' : 'Call'}
                  >
                    <Phone className="w-2.5 h-2.5 text-emerald-300" />
                    <span>{isKm ? 'Call' : 'Call'}</span>
                  </button>

                  <button
                    onClick={(e) => handleShare(e, food)}
                    className="py-1 px-1 bg-white/20 hover:bg-white/30 text-white rounded-md text-[8px] font-bold flex items-center justify-center gap-0.5 transition"
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

      {/* Section 1: Featured Khmer Food */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 rounded-full bg-[#064E3B]" />
            <h3 className="font-moul text-xs sm:text-sm text-[#0F172A] dark:text-white">
              {isKm ? `មុខម្ហូបខ្មែរល្បីៗ (សរុប ${foods.length}+ មុខ)` : `Famous Khmer Dishes (${foods.length}+ total)`}
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('food')}
            className="flex items-center gap-0.5 text-xs font-semibold text-[#064E3B] dark:text-emerald-400 hover:text-[#059669]"
          >
            <span>{isKm ? 'មើលទាំងអស់' : 'View all'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {featuredFoods.map((f) => (
            <FoodCard key={f.id} food={f} />
          ))}
        </div>
      </div>

      {/* Benefit 8: Dedicated Premium VIP Promotion Section */}
      {premiumVipRestaurants.length > 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#064E3B] to-[#047857] text-white border border-emerald-500/40 shadow-sm space-y-3 font-khmer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-stone-900 text-[10px] font-bold shadow-xs">
                ⭐ VIP
              </span>
              <div>
                <h3 className="font-moul text-xs sm:text-sm text-white">
                  {isKm ? 'ភោជនីយដ្ឋានឆ្នើម VIP (Featured VIP)' : 'Featured VIP Restaurants'}
                </h3>
                <p className="text-[10px] text-emerald-200">
                  {isKm ? 'ហាងដៃគូឆ្នើមផ្លូវការ និងសមាជិកភាព VIP' : 'Official partner restaurants & active VIP members'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('restaurants')}
              className="text-xs font-bold text-emerald-200 hover:text-white flex items-center gap-0.5"
            >
              <span>{isKm ? 'ទាំងអស់' : 'All'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {premiumVipRestaurants.slice(0, 2).map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Recommended Restaurants */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 rounded-full bg-[#059669]" />
            <h3 className="font-moul text-xs sm:text-sm text-[#0F172A] dark:text-white">
              {isKm ? `ភោជនីយដ្ឋានឆ្នើមៗ (សរុប ${restaurants.length}+ ហាង)` : `Featured Restaurants (${restaurants.length}+ shops)`}
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('restaurants')}
            className="flex items-center gap-0.5 text-xs font-semibold text-[#064E3B] dark:text-emerald-400 hover:text-[#059669]"
          >
            <span>{isKm ? 'មើលទាំងអស់' : 'View all'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {featuredRestaurants.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      </div>

      {/* Section 3: Tourist Destinations (Completely separated from Food Discovery) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 rounded-full bg-[#10B981]" />
            <h3 className="font-moul text-xs sm:text-sm text-[#0F172A] dark:text-white">
              {isKm ? 'តំបន់ទេសចរណ៍ស្រស់ត្រកាល' : 'Must-Visit Destinations'}
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('tourism')}
            className="flex items-center gap-0.5 text-xs font-semibold text-[#064E3B] dark:text-emerald-400 hover:text-[#059669]"
          >
            <span>{isKm ? 'មើលទាំងអស់' : 'View all'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {featuredDestinations.map((d) => (
            <TouristCard key={d.id} destination={d} />
          ))}
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

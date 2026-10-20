import React from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { RestaurantCard } from './RestaurantCard';
import { TouristCard } from './TouristCard';
import { 
  Sparkles, ChevronRight, Utensils, Store, Compass, 
  MapPin, Heart, Flame, QrCode, Download, ShieldCheck,
  Apple, Smartphone
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { 
    foods, restaurants, destinations, setActiveTab, 
    language, setSelectedProvince, posts,
    setIsInstallModalOpen, setIsSupportModalOpen,
    openInstallModal
  } = useApp();

  const isKm = language === 'km';
  const featuredFoods = foods.slice(0, 4);
  const featuredRestaurants = restaurants.slice(0, 3);
  const featuredDestinations = destinations.slice(0, 3);

  const quickCategories = [
    { labelKh: 'ម្ហូបពិសេស', labelEn: 'Signature', icon: '🍲', tab: 'food' },
    { labelKh: 'ភោជនីយដ្ឋាន', labelEn: 'Restaurants', icon: '🏪', tab: 'restaurants' },
    { labelKh: 'ប្រាសាទបុរាណ', labelEn: 'Temples', icon: '🏛️', tab: 'tourism' },
    { labelKh: 'ឆ្នេរសមុទ្រ', labelEn: 'Beaches', icon: '🏝️', tab: 'tourism' },
    { labelKh: 'ទឹកធ្លាក់ & ភ្នំ', labelEn: 'Nature', icon: '🏞️', tab: 'tourism' },
  ];

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

      {/* Section 3: Tourist Destinations */}
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

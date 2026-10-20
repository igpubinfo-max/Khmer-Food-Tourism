import React from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { RestaurantCard } from './RestaurantCard';
import { TouristCard } from './TouristCard';
import { 
  Sparkles, ChevronRight, Utensils, Store, Compass, 
  MapPin, Heart, Flame, QrCode, Download, ShieldCheck
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { 
    foods, restaurants, destinations, setActiveTab, 
    language, setSelectedProvince, posts,
    setIsInstallModalOpen, setIsSupportModalOpen
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
      {/* Hero Banner (Professional Dark Forest Green) */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg bg-gradient-to-br from-[#0B3D2E] via-[#14532D] to-[#0B3D2E] text-white p-5 border border-[#228B4E]/30">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#228B4E]/40 border border-[#A7DCA5]/40 text-[#A7DCA5] text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isKm ? 'មរតកវប្បធម៌ខ្មែរ' : 'Cambodian Heritage'}</span>
            </div>
            <span className="text-[10px] bg-[#34A853] text-white px-2 py-0.5 rounded-full font-bold">
              100+ Dishes & Shops
            </span>
          </div>

          <h2 className="font-moul text-lg sm:text-xl text-white leading-snug drop-shadow-sm">
            {isKm 
              ? 'ភ្លក្សរសជាតិម្ហូបខ្មែរ និងទស្សនាសម្រស់កម្ពុជា' 
              : 'Taste Khmer Flavors & Discover Cambodia'}
          </h2>

          <p className="text-xs text-[#A7DCA5] leading-relaxed font-normal">
            {isKm
              ? 'ស្វែងរកមុខម្ហូបប្រពៃណី ១០០+ មុខ រូបមន្តចម្អិន ភោជនីយដ្ឋាន ១០០+ ហាង និងតំបន់ទេសចរណ៍ស្រស់ត្រកាលទូទាំងប្រទេស'
              : 'Discover 100+ authentic Khmer dishes, cooking recipes, 100+ restaurants, and breathtaking destinations.'}
          </p>

          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('food')}
              className="px-4 py-2 rounded-xl bg-[#34A853] hover:bg-[#228B4E] text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1 font-khmer"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>{isKm ? 'មើលមុខម្ហូប' : 'Explore Food'}</span>
            </button>

            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-xs border border-[#A7DCA5]/40 transition flex items-center gap-1.5 font-khmer"
            >
              <QrCode className="w-3.5 h-3.5 text-[#A7DCA5]" />
              <span>{isKm ? 'ដំឡើង APK' : 'Install APK'}</span>
            </button>

            <button
              onClick={() => setIsSupportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#14532D] hover:bg-[#228B4E] text-white font-medium text-xs border border-[#228B4E]/60 shadow transition flex items-center gap-1.5 font-khmer"
            >
              <Heart className="w-3.5 h-3.5 fill-[#A7DCA5] text-[#A7DCA5]" />
              <span>{isKm ? 'ជួយគាំទ្រ' : 'Support'}</span>
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-[#34A853]/15 blur-2xl pointer-events-none" />
      </div>

      {/* App Installation & Support Interactive Showcase Card */}
      <div className="bg-[#EAF6EC] dark:bg-[#0B3D2E]/50 rounded-3xl p-4 border border-[#A7DCA5]/60 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B3D2E] to-[#14532D] flex items-center justify-center text-[#A7DCA5] shadow-md shrink-0 border border-[#228B4E]/40">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-[#183326] dark:text-stone-100 text-xs sm:text-sm font-khmer">
              {isKm ? 'ដំឡើងកម្មវិធី ឬជួយឧបត្ថម្ភ' : 'Install App or Support Us'}
            </h4>
            <p className="text-[11px] text-[#183326]/80 dark:text-stone-300 font-khmer line-clamp-1">
              {isKm ? 'ស្កេន QR Code ទាញយក Android APK ឬបរិច្ចាគ KHQR' : 'Scan to download APK or donate via Bakong KHQR'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="p-2 bg-[#14532D] hover:bg-[#0B3D2E] text-white rounded-xl shadow-xs transition"
            title={isKm ? 'ដំឡើង APK' : 'Install'}
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="p-2 bg-[#34A853] hover:bg-[#228B4E] text-white rounded-xl shadow-xs transition"
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
            className="flex flex-col items-center p-2 rounded-2xl bg-white dark:bg-stone-800 border border-[#A7DCA5]/40 dark:border-stone-700/60 shadow-2xs min-w-[70px] hover:border-[#34A853] transition"
          >
            <span className="text-xl mb-1">{cat.icon}</span>
            <span className="text-[10px] font-bold text-[#183326] dark:text-stone-300 text-center">
              {isKm ? cat.labelKh : cat.labelEn}
            </span>
          </button>
        ))}
      </div>

      {/* Section 1: Featured Khmer Food (100+ total) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 rounded-full bg-[#14532D]" />
            <h3 className="font-moul text-xs sm:text-sm text-[#183326] dark:text-stone-100">
              {isKm ? `មុខម្ហូបខ្មែរល្បីៗ (សរុប ${foods.length}+ មុខ)` : `Famous Khmer Dishes (${foods.length}+ total)`}
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('food')}
            className="flex items-center gap-0.5 text-xs font-semibold text-[#14532D] dark:text-[#A7DCA5] hover:text-[#228B4E]"
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

      {/* Section 2: Recommended Restaurants (100+ total) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 rounded-full bg-[#228B4E]" />
            <h3 className="font-moul text-xs sm:text-sm text-[#183326] dark:text-stone-100">
              {isKm ? `ភោជនីយដ្ឋានឆ្នើមៗ (សរុប ${restaurants.length}+ ហាង)` : `Featured Restaurants (${restaurants.length}+ shops)`}
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('restaurants')}
            className="flex items-center gap-0.5 text-xs font-semibold text-[#14532D] dark:text-[#A7DCA5] hover:text-[#228B4E]"
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
            <div className="w-2 h-5 rounded-full bg-[#34A853]" />
            <h3 className="font-moul text-xs sm:text-sm text-[#183326] dark:text-stone-100">
              {isKm ? 'តំបន់ទេសចរណ៍ស្រស់ត្រកាល' : 'Must-Visit Destinations'}
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('tourism')}
            className="flex items-center gap-0.5 text-xs font-semibold text-[#14532D] dark:text-[#A7DCA5] hover:text-[#228B4E]"
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
        <div className="p-4 rounded-3xl bg-[#EAF6EC] dark:bg-stone-800 border border-[#A7DCA5]/60 dark:border-stone-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#14532D] dark:text-[#A7DCA5] flex items-center gap-1.5 font-khmer">
              <Heart className="w-4 h-4 text-rose-500 fill-current" />
              {isKm ? 'ការចែករំលែកថ្មីៗពីសហគមន៍' : 'Recent Community Stories'}
            </span>
            <button
              onClick={() => setActiveTab('community')}
              className="text-xs font-semibold text-[#14532D] dark:text-[#A7DCA5] hover:underline font-khmer"
            >
              {isKm ? 'ចូលរួម' : 'Join Feed'}
            </button>
          </div>
          <p className="text-xs text-[#183326] dark:text-stone-300 font-khmer">
            {posts[0].titleKh}
          </p>
        </div>
      )}
    </div>
  );
};

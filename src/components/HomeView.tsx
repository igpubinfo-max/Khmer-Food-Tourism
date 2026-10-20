import React from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { RestaurantCard } from './RestaurantCard';
import { TouristCard } from './TouristCard';
import { 
  Sparkles, ChevronRight, Utensils, Store, Compass, 
  MapPin, Heart, Flame
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { 
    foods, restaurants, destinations, setActiveTab, 
    language, setSelectedProvince, posts 
  } = useApp();

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
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg bg-gradient-to-br from-amber-800 via-amber-900 to-amber-950 text-white p-5">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'km' ? 'មរតកវប្បធម៌ខ្មែរ' : 'Cambodian Heritage'}</span>
          </div>

          <h2 className="font-moul text-lg sm:text-xl text-amber-200 leading-snug drop-shadow-sm">
            {language === 'km' 
              ? 'ភ្លក្សរសជាតិម្ហូបខ្មែរ និងទស្សនាសម្រស់កម្ពុជា' 
              : 'Taste Khmer Flavors & Discover Cambodia'}
          </h2>

          <p className="text-xs text-amber-100/80 leading-relaxed font-normal">
            {language === 'km'
              ? 'ស្វែងរកមុខម្ហូបប្រពៃណី រូបមន្តចម្អិន ភោជនីយដ្ឋានឆ្ងាញ់ៗ និងតំបន់ទេសចរណ៍ស្រស់ត្រកាលទូទាំងប្រទេស'
              : 'Discover traditional recipes, authentic restaurants, and breathtaking destinations across Cambodia.'}
          </p>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('food')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>{language === 'km' ? 'មើលមុខម្ហូប' : 'Explore Food'}</span>
            </button>

            <button
              onClick={() => setActiveTab('tourism')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20 transition"
            >
              <span>{language === 'km' ? 'កន្លែងដើរលេង' : 'Destinations'}</span>
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
      </div>

      {/* Quick Category Icons */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-1">
        {quickCategories.map((cat, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(cat.tab as any)}
            className="flex flex-col items-center p-2 rounded-2xl bg-white dark:bg-stone-800 border border-amber-100/80 dark:border-stone-700/60 shadow-2xs min-w-[70px] hover:border-amber-400 transition"
          >
            <span className="text-xl mb-1">{cat.icon}</span>
            <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 text-center">
              {language === 'km' ? cat.labelKh : cat.labelEn}
            </span>
          </button>
        ))}
      </div>

      {/* Section 1: Featured Khmer Food */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 rounded-full bg-amber-600" />
            <h3 className="font-moul text-xs sm:text-sm text-stone-900 dark:text-stone-100">
              {language === 'km' ? 'មុខម្ហូបខ្មែរល្បីៗ' : 'Famous Khmer Dishes'}
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('food')}
            className="flex items-center gap-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
          >
            <span>{language === 'km' ? 'មើលទាំងអស់' : 'View all'}</span>
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
            <div className="w-2 h-5 rounded-full bg-emerald-600" />
            <h3 className="font-moul text-xs sm:text-sm text-stone-900 dark:text-stone-100">
              {language === 'km' ? 'ភោជនីយដ្ឋានឆ្នើមៗ' : 'Featured Restaurants'}
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('restaurants')}
            className="flex items-center gap-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
          >
            <span>{language === 'km' ? 'មើលទាំងអស់' : 'View all'}</span>
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
            <div className="w-2 h-5 rounded-full bg-blue-600" />
            <h3 className="font-moul text-xs sm:text-sm text-stone-900 dark:text-stone-100">
              {language === 'km' ? 'តំបន់ទេសចរណ៍ស្រស់ត្រកាល' : 'Must-Visit Destinations'}
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('tourism')}
            className="flex items-center gap-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
          >
            <span>{language === 'km' ? 'មើលទាំងអស់' : 'View all'}</span>
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
        <div className="p-4 rounded-3xl bg-amber-50 dark:bg-stone-800 border border-amber-200/60 dark:border-stone-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500 fill-current" />
              {language === 'km' ? 'ការចែករំលែកថ្មីៗពីសហគមន៍' : 'Recent Community Stories'}
            </span>
            <button
              onClick={() => setActiveTab('community')}
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              {language === 'km' ? 'ចូលរួម' : 'Join Feed'}
            </button>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-300">
            {posts[0].titleKh}
          </p>
        </div>
      )}
    </div>
  );
};

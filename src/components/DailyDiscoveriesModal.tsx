import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Calendar, Sparkles, RefreshCw, ChefHat, Store, 
  Mountain, Star, MapPin, ChevronRight, Heart 
} from 'lucide-react';

export const DailyDiscoveriesModal: React.FC = () => {
  const { 
    isDailyDiscoveriesModalOpen, setIsDailyDiscoveriesModalOpen,
    foods, restaurants, destinations, language,
    setSelectedFood, setSelectedRestaurant, setSelectedDestination,
    openAddToWishlist 
  } = useApp();

  const isKm = language === 'km';
  const [shuffleKey, setShuffleKey] = useState(0);

  // Today's date string
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  // Compute deterministic daily seed from date string + shuffleKey
  const dailySeed = useMemo(() => {
    let hash = 0;
    const str = `${todayStr}-${shuffleKey}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }, [todayStr, shuffleKey]);

  // Daily Featured Hidden Gem Restaurant
  const dailyRestaurant = useMemo(() => {
    if (restaurants.length === 0) return null;
    return restaurants[dailySeed % restaurants.length];
  }, [restaurants, dailySeed]);

  // Daily 2 Featured Dishes
  const dailyFoods = useMemo(() => {
    if (foods.length === 0) return [];
    const idx1 = (dailySeed + 3) % foods.length;
    const idx2 = (dailySeed + 7) % foods.length;
    return [foods[idx1], foods[idx2]];
  }, [foods, dailySeed]);

  // Daily Featured Tourist Destination
  const dailyDestination = useMemo(() => {
    if (destinations.length === 0) return null;
    return destinations[(dailySeed + 11) % destinations.length];
  }, [destinations, dailySeed]);

  if (!isDailyDiscoveriesModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#064E3B] to-[#047857] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-moul text-sm text-white">
                  {isKm ? 'កន្លែងថ្មីប្រចាំថ្ងៃ' : 'Daily Discoveries'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-900 text-[10px] font-bold shadow-xs">
                  {isKm ? 'ស្វែងយល់ថ្ងៃនេះ' : 'Explore Today'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-khmer">
                {isKm ? 'ហាងថ្មី ម្ហូបថ្មី និងទីតាំងប្លែកៗដែលមិនទាន់ស្គាល់' : 'Daily curated hidden gems & authentic dishes'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDailyDiscoveriesModalOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date & Refresh Bar */}
        <div className="p-3 bg-emerald-50/70 dark:bg-slate-800/80 border-b border-emerald-100 dark:border-slate-800 flex items-center justify-between shrink-0 font-khmer">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#064E3B] dark:text-emerald-400">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{isKm ? `ការណែនាំពិសេសសម្រាប់ថ្ងៃទី ${todayStr}` : `Curated for ${todayStr}`}</span>
          </div>

          <button
            onClick={() => setShuffleKey(prev => prev + 1)}
            className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 border border-emerald-200 dark:border-slate-600 rounded-xl text-[11px] font-bold shadow-2xs hover:bg-emerald-50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isKm ? 'ប្តូរថ្មី' : 'Shuffle'}</span>
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar font-khmer">
          {/* 1. Daily Hidden Gem Restaurant */}
          {dailyRestaurant && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A] dark:text-white">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>{isKm ? 'ហាងឆ្នើមគួរស្គាល់ប្រចាំថ្ងៃ' : 'Daily Featured Hidden Gem Restaurant'}</span>
              </div>

              <div 
                onClick={() => {
                  setSelectedRestaurant(dailyRestaurant);
                  setIsDailyDiscoveriesModalOpen(false);
                }}
                className="group relative rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-xs hover:border-emerald-500 cursor-pointer transition"
              >
                <div className="relative aspect-16/9 w-full overflow-hidden bg-slate-100">
                  <img src={dailyRestaurant.photoUrl} alt={dailyRestaurant.nameKh} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-amber-400 text-stone-900 text-[10px] font-black shadow-xs">
                    {isKm ? 'ហាងថ្មីគួរស្គាល់' : 'Featured Gem'}
                  </span>
                  <span className="absolute bottom-1 right-2 bg-black/60 text-white/80 text-[7px] px-1 rounded-xs">
                    {isKm ? 'រូបតំណាង' : 'Sample'}
                  </span>
                  <div className="absolute bottom-2.5 left-3 right-3 text-white">
                    <h4 className="font-bold text-sm sm:text-base leading-snug drop-shadow">
                      {isKm ? dailyRestaurant.nameKh : dailyRestaurant.nameEn}
                    </h4>
                    <p className="text-[11px] text-emerald-300 truncate">
                      {dailyRestaurant.provinceKh} • {dailyRestaurant.priceLevel}
                    </p>
                  </div>
                </div>

                <div className="p-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold">{dailyRestaurant.rating} ({dailyRestaurant.reviewCount}+ reviews)</span>
                  </div>
                  <span className="text-[#064E3B] dark:text-emerald-400 font-bold flex items-center gap-0.5">
                    {isKm ? 'មើលព័ត៌មាន' : 'View'} <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Daily Dishes of the Day (2 picks) */}
          {dailyFoods.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A] dark:text-white">
                <ChefHat className="w-4 h-4 text-emerald-600" />
                <span>{isKm ? 'មុខម្ហូបថ្មីប្រចាំថ្ងៃ (សាកល្បងភ្លក្ស)' : 'Dishes of the Day to Try'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {dailyFoods.map(food => (
                  <div
                    key={food.id}
                    onClick={() => {
                      setSelectedFood(food);
                      setIsDailyDiscoveriesModalOpen(false);
                    }}
                    className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:border-emerald-500 cursor-pointer transition space-y-2"
                  >
                    <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100">
                      <img src={food.photoUrl} alt={food.nameKh} className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute bottom-0.5 right-1 bg-black/60 text-white/80 text-[7px] px-1 rounded-xs">
                        {isKm ? 'រូបតំណាង' : 'Sample'}
                      </span>
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-[#0F172A] dark:text-white truncate">
                        {isKm ? food.nameKh : food.nameEn}
                      </h5>
                      <div className="text-[11px] font-bold text-[#064E3B] dark:text-emerald-400 font-mono">
                        {food.priceRiel.toLocaleString()} ៛
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Daily Tourist Destination to Discover */}
          {dailyDestination && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A] dark:text-white">
                <Mountain className="w-4 h-4 text-emerald-600" />
                <span>{isKm ? 'ទីតាំងទេសចរណ៍ស្វែងយល់ថ្ងៃនេះ' : 'Destination of the Day'}</span>
              </div>

              <div 
                onClick={() => {
                  setSelectedDestination(dailyDestination);
                  setIsDailyDiscoveriesModalOpen(false);
                }}
                className="group relative rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-xs hover:border-emerald-500 cursor-pointer transition"
              >
                <div className="relative aspect-16/9 w-full overflow-hidden bg-slate-100">
                  <img src={dailyDestination.photoUrl} alt={dailyDestination.nameKh} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-xs">
                    {dailyDestination.provinceKh}
                  </span>
                  <span className="absolute bottom-1 right-2 bg-black/60 text-white/80 text-[7px] px-1 rounded-xs">
                    {isKm ? 'រូបតំណាង' : 'Sample'}
                  </span>
                  <div className="absolute bottom-2.5 left-3 right-3 text-white">
                    <h4 className="font-bold text-sm sm:text-base leading-snug drop-shadow">
                      {isKm ? dailyDestination.nameKh : dailyDestination.nameEn}
                    </h4>
                    <p className="text-[11px] text-emerald-300 truncate">
                      {dailyDestination.categoryKh}
                    </p>
                  </div>
                </div>

                <div className="p-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {dailyDestination.entranceFeeKh}
                  </span>
                  <span className="text-[#064E3B] dark:text-emerald-400 font-bold flex items-center gap-0.5">
                    {isKm ? 'ស្វែងយល់លម្អិត' : 'Discover'} <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
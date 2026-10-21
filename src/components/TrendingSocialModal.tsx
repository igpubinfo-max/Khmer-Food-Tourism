import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Flame, Heart, MapPin, Eye, ExternalLink, 
  ChevronRight, Navigation, MessageSquareQuote, Sparkles,
  Phone, Share2, Calendar, UtensilsCrossed, Filter
} from 'lucide-react';
import { TrendingFoodCategorySlug, TrendingFoodItem } from '../types';

export const TrendingSocialModal: React.FC = () => {
  const { 
    isTrendingSocialModalOpen, 
    setIsTrendingSocialModalOpen,
    trendingFoods, 
    language, 
    setSelectedTrendingFood, 
    setIsTrendingFoodDetailModalOpen,
    showToast,
    openAddToWishlist 
  } = useApp();

  const isKm = language === 'km';
  const [platformFilter, setPlatformFilter] = useState<'all' | 'tiktok' | 'facebook'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TrendingFoodCategorySlug>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');

  if (!isTrendingSocialModalOpen) return null;

  // Filter items based on platform, category, and province
  const filteredFoods = trendingFoods.filter(item => {
    if (platformFilter !== 'all' && item.sourcePlatform !== platformFilter) return false;
    if (categoryFilter !== 'all' && item.categorySlug !== categoryFilter) return false;
    if (provinceFilter !== 'all' && item.provinceKh !== provinceFilter && item.provinceEn !== provinceFilter) return false;
    return true;
  });

  const categories: { id: TrendingFoodCategorySlug; labelKh: string; labelEn: string; icon: string }[] = [
    { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All', icon: '🔥' },
    { id: 'street_food', labelKh: 'អាហារតាមផ្លូវ', labelEn: 'Street Food', icon: '🍢' },
    { id: 'famous_dish', labelKh: 'មុខម្ហូបល្បីប្រចាំតំបន់', labelEn: 'Famous', icon: '🍲' },
    { id: 'cafe_drink', labelKh: 'កាហ្វេ & ភេសជ្ជៈ', labelEn: 'Café & Drinks', icon: '☕' },
    { id: 'dessert_snack', labelKh: 'បង្អែម & សម្រន់', labelEn: 'Desserts', icon: '🍨' },
    { id: 'noodle_soup', labelKh: 'គុយទាវ & ស៊ុប', labelEn: 'Noodles', icon: '🍜' },
    { id: 'unusual_local', labelKh: 'ម្ហូបប្លែកៗ & កម្រ', labelEn: 'Unusual & Rare', icon: '✨' },
  ];

  const provinces = [
    { id: 'all', labelKh: 'គ្រប់ខេត្ត/ក្រុង', labelEn: 'All Provinces' },
    { id: 'រាជធានីភ្នំពេញ', labelKh: 'ភ្នំពេញ', labelEn: 'Phnom Penh' },
    { id: 'ខេត្តសៀមរាប', labelKh: 'សៀមរាប', labelEn: 'Siem Reap' },
    { id: 'ខេត្តបាត់ដំបង', labelKh: 'បាត់ដំបង', labelEn: 'Battambang' },
    { id: 'ខេត្តកំពត', labelKh: 'កំពត', labelEn: 'Kampot' },
    { id: 'ខេត្តកែប', labelKh: 'កែប', labelEn: 'Kep' },
    { id: 'ខេត្តកោះកុង', labelKh: 'កោះកុង', labelEn: 'Koh Kong' },
    { id: 'ខេត្តកំពង់ចាម', labelKh: 'កំពង់ចាម', labelEn: 'Kampong Cham' },
    { id: 'ខេត្តកំពង់ស្ពឺ', labelKh: 'កំពង់ស្ពឺ', labelEn: 'Kampong Speu' },
  ];

  const handleOpenDetail = (food: TrendingFoodItem) => {
    setSelectedTrendingFood(food);
    setIsTrendingFoodDetailModalOpen(true);
  };

  const handleCall = (phone?: string) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    } else {
      showToast(isKm ? 'មិនមានលេខទូរស័ព្ទសម្រាប់ហាងនេះទេ' : 'No phone number available', 'info');
    }
  };

  const handleMap = (food: TrendingFoodItem) => {
    if (food.mapUrl) {
      window.open(food.mapUrl, '_blank');
    } else if (food.latitude && food.longitude) {
      window.open(`https://maps.google.com/?q=${food.latitude},${food.longitude}`, '_blank');
    }
  };

  const handleShare = (food: TrendingFoodItem) => {
    const text = isKm
      ? `🔥 មុខម្ហូបល្បីលើ TikTok & FB៖ ${food.foodNameKh} នៅ ${food.restaurantNameKh} (${food.provinceKh})!`
      : `🔥 Trending Food: ${food.foodNameEn} at ${food.restaurantNameEn} (${food.provinceEn})!`;
    if (navigator.share) {
      navigator.share({ title: food.foodNameKh, text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      showToast(isKm ? 'បានចម្លងព័ត៌មានរួចរាល់!' : 'Copied info to clipboard!', 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with TikTok & FB Vibrant Theme */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-rose-500/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-moul text-xs sm:text-sm text-white">
                  {isKm ? 'កន្លែង Review ល្បីលើ TikTok & FB' : 'Viral Food Review Spots'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold shadow-xs">
                  TikTok & FB Review 🔥
                </span>
              </div>
              <p className="text-[11px] text-pink-200 font-khmer">
                {isKm 
                  ? 'ហាងអាហារឆ្ងាញ់ៗ ប្លែកៗ និងល្បីល្បាញពេញនិយមបំផុត' 
                  : 'Delicious, unusual, famous, & trending food places in Cambodia'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTrendingSocialModalOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-pink-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar 1: Platform */}
        <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 shrink-0 font-khmer text-xs overflow-x-auto no-scrollbar">
          {[
            { id: 'all', labelKh: '🔥 ទាំងអស់', labelEn: '🔥 All' },
            { id: 'tiktok', labelKh: '🎵 TikTok Viral', labelEn: '🎵 TikTok' },
            { id: 'facebook', labelKh: '👥 Facebook Trending', labelEn: '👥 Facebook' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setPlatformFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition text-xs ${
                platformFilter === f.id
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              {isKm ? f.labelKh : f.labelEn}
            </button>
          ))}
        </div>

        {/* Filter Bar 2: Categories */}
        <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar font-khmer text-xs shrink-0">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
                categoryFilter === c.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <span>{c.icon}</span>
              <span>{isKm ? c.labelKh : c.labelEn}</span>
            </button>
          ))}
        </div>

        {/* Filter Bar 3: Province Selector */}
        <div className="px-3 py-1.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar font-khmer text-xs shrink-0">
          <span className="text-[10px] text-slate-400 font-bold shrink-0">📍 {isKm ? 'ទីតាំង៖' : 'City:'}</span>
          {provinces.map(p => (
            <button
              key={p.id}
              onClick={() => setProvinceFilter(p.id)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition ${
                provinceFilter === p.id
                  ? 'bg-rose-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isKm ? p.labelKh : p.labelEn}
            </button>
          ))}
        </div>

        {/* List of Trending Food Places */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar font-khmer text-xs">
          {filteredFoods.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-500" />
              <p>{isKm ? 'មិនមានមុខម្ហូបត្រូវនឹងការស្វែងរកនេះទេ' : 'No food spots matching this filter'}</p>
            </div>
          ) : (
            filteredFoods.map(food => (
              <div
                key={food.id}
                className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-3 transition hover:shadow-md"
              >
                {/* Media Picture Banner */}
                <div 
                  onClick={() => handleOpenDetail(food)}
                  className="group relative aspect-16/9 w-full overflow-hidden bg-slate-900 cursor-pointer"
                >
                  <img 
                    src={food.photoUrl} 
                    alt={food.foodNameKh}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Views / Likes badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black shadow-xs flex items-center gap-1">
                      <Flame className="w-3 h-3 fill-current" />
                      <span>{food.socialViews || 'Viral'}</span>
                    </span>
                    {food.socialLikes && (
                      <span className="px-2 py-0.5 rounded-full bg-black/60 text-pink-200 text-[9px] font-bold backdrop-blur-xs">
                        ❤️ {food.socialLikes}
                      </span>
                    )}
                  </div>

                  {/* Representative Sample Label */}
                  <span className="absolute bottom-2 right-2.5 bg-black/60 text-white/80 text-[7px] px-1 rounded-xs select-none">
                    {isKm ? 'រូបតំណាង' : 'Sample'}
                  </span>

                  {/* Food name & Restaurant banner */}
                  <div className="absolute bottom-2.5 left-3 right-14">
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-600/90 text-white text-[8px] font-bold">
                      {isKm ? food.categoryKh : food.categoryEn}
                    </span>
                    <h4 className="font-moul text-sm text-white drop-shadow mt-0.5 leading-snug truncate">
                      {isKm ? food.foodNameKh : food.foodNameEn}
                    </h4>
                    <p className="text-[10px] text-pink-200 font-bold truncate">
                      🏪 {isKm ? food.restaurantNameKh : food.restaurantNameEn} • {isKm ? food.provinceKh : food.provinceEn}
                    </p>
                  </div>
                </div>

                {/* Content details */}
                <div className="p-3 pt-0 space-y-2">
                  {/* Quote if available */}
                  {food.reviewerQuoteKh && (
                    <p className="text-[11px] text-slate-700 dark:text-pink-100 italic line-clamp-2 bg-rose-50/60 dark:bg-rose-950/20 p-2 rounded-xl border border-rose-100 dark:border-rose-900/40">
                      "{isKm ? food.reviewerQuoteKh : (food.reviewerQuoteEn || food.reviewerQuoteKh)}"
                    </p>
                  )}

                  {/* Address and price */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 truncate max-w-[70%]">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{isKm ? food.addressKh : food.addressEn}</span>
                    </span>
                    {food.priceDisplay && (
                      <span className="font-bold text-[#064E3B] dark:text-emerald-400 font-mono">
                        {food.priceDisplay}
                      </span>
                    )}
                  </div>

                  {/* Last updated */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{isKm ? 'ធ្វើបច្ចុប្បន្នភាព៖' : 'Updated:'} {food.lastUpdated}</span>
                    </span>
                    {food.sourceUrl && (
                      <a
                        href={food.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-500 hover:text-pink-600 font-bold flex items-center gap-0.5"
                      >
                        <span>{isKm ? 'ប្រភពដើម' : 'Source'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* 4 Action Buttons: View Details, Map, Call, Share */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <button
                      onClick={() => handleOpenDetail(food)}
                      className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-[#064E3B] dark:text-emerald-300 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 transition"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{isKm ? 'លម្អិត' : 'Detail'}</span>
                    </button>

                    <button
                      onClick={() => handleMap(food)}
                      className="py-1.5 px-2 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs transition"
                    >
                      <Navigation className="w-3 h-3 text-emerald-300" />
                      <span>{isKm ? 'នាំផ្លូវ' : 'Map'}</span>
                    </button>

                    <button
                      onClick={() => handleCall(food.phone)}
                      className={`py-1.5 px-2 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 transition ${
                        food.phone 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Phone className="w-3 h-3" />
                      <span>{isKm ? 'ទូរស័ព្ទ' : 'Call'}</span>
                    </button>

                    <button
                      onClick={() => handleShare(food)}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 transition border border-slate-200 dark:border-slate-600"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>{isKm ? 'ចែករំលែក' : 'Share'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

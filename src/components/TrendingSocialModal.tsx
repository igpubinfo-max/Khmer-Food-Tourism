import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Flame, Heart, Star, MapPin, Eye, ExternalLink, 
  ChevronRight, Navigation, MessageSquareQuote, Sparkles 
} from 'lucide-react';
import { TouristDestination } from '../types';

export const TrendingSocialModal: React.FC = () => {
  const { 
    isTrendingSocialModalOpen, setIsTrendingSocialModalOpen,
    destinations, language, setSelectedDestination, openAddToWishlist 
  } = useApp();

  const isKm = language === 'km';
  const [platformFilter, setPlatformFilter] = useState<'all' | 'tiktok' | 'facebook'>('all');

  if (!isTrendingSocialModalOpen) return null;

  // Filter only trending social spots
  const trendingSpots = destinations.filter(d => {
    if (!d.isTrendingSocial) return false;
    if (platformFilter === 'all') return true;
    if (d.socialPlatform === 'all') return true;
    return d.socialPlatform === platformFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
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
                  {isKm ? 'កន្លែង Review ល្បីលើ TikTok & FB' : 'Viral Review Spots'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold shadow-xs">
                  Trending 🔥
                </span>
              </div>
              <p className="text-[11px] text-pink-200 font-khmer">
                {isKm ? 'កន្លែងដើរលេងដែលគេចូលចិត្តទៅ Review និងចែករំលែក' : 'Most reviewed & shared destinations on TikTok & FB'}
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

        {/* Filter subtabs */}
        <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 shrink-0 font-khmer text-xs">
          {[
            { id: 'all', labelKh: '🔥 ទាំងអស់', labelEn: '🔥 All' },
            { id: 'tiktok', labelKh: '🎵 TikTok Viral', labelEn: '🎵 TikTok' },
            { id: 'facebook', labelKh: '👥 Facebook Review', labelEn: '👥 Facebook' },
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

        {/* List of Viral Review Destinations */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar font-khmer">
          {trendingSpots.map(dest => (
            <div
              key={dest.id}
              className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-3"
            >
              {/* Media Picture Banner */}
              <div 
                onClick={() => {
                  setSelectedDestination(dest);
                  setIsTrendingSocialModalOpen(false);
                }}
                className="group relative aspect-16/10 w-full overflow-hidden bg-slate-900 cursor-pointer"
              >
                <img 
                  src={dest.photoUrl} 
                  alt={dest.nameKh} 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                {/* Viral views counter & platform badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 text-white text-[10px] font-black shadow-xs flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{dest.socialViews || '3.5M+ Views'}</span>
                  </span>
                  {dest.socialLikes && (
                    <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-rose-300 text-[10px] font-bold">
                      ❤️ {dest.socialLikes}
                    </span>
                  )}
                </div>

                {/* Sample label */}
                <span className="absolute bottom-2 right-2 bg-black/60 text-white/80 text-[7px] px-1 rounded-xs">
                  {isKm ? 'រូបតំណាង' : 'Sample'}
                </span>

                {/* Title overlay */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h4 className="font-moul text-sm sm:text-base leading-snug drop-shadow">
                    {isKm ? dest.nameKh : dest.nameEn}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-pink-300 font-mono">
                    <span>{dest.socialHashtag || dest.provinceKh}</span>
                  </div>
                </div>
              </div>

              {/* Reviewer Quote & Details */}
              <div className="px-4 pb-4 space-y-3">
                {/* Reviewer quote bubble */}
                {dest.reviewerQuoteKh && (
                  <div className="p-3 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-400">
                      <MessageSquareQuote className="w-4 h-4 shrink-0" />
                      <span>{dest.reviewerName || 'Reviewer Top Pick'}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 italic leading-relaxed">
                      "{isKm ? dest.reviewerQuoteKh : (dest.reviewerQuoteEn || dest.reviewerQuoteKh)}"
                    </p>
                  </div>
                )}

                {/* Social Highlight text */}
                {dest.socialHighlightKh && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isKm ? dest.socialHighlightKh : (dest.socialHighlightEn || dest.socialHighlightKh)}
                  </p>
                )}

                {/* Bottom actions: Directions + Wishlist + Details */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => {
                      setSelectedDestination(dest);
                      setIsTrendingSocialModalOpen(false);
                    }}
                    className="flex-1 py-2 px-3 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1"
                  >
                    <span>{isKm ? 'ស្វែងយល់លម្អិត' : 'View Destination'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={dest.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(dest.nameKh + ' ' + dest.provinceKh)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 rounded-xl transition"
                    title={isKm ? 'នាំផ្លូវ' : 'Map Route'}
                  >
                    <Navigation className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => openAddToWishlist({
                      id: dest.id,
                      type: 'destination',
                      nameKh: dest.nameKh,
                      nameEn: dest.nameEn,
                      photoUrl: dest.photoUrl,
                      categoryKh: dest.categoryKh,
                      provinceKh: dest.provinceKh,
                      rating: dest.rating,
                    })}
                    className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-slate-700 text-rose-600 rounded-xl transition"
                    title={isKm ? 'ដាក់ក្នុងបញ្ជី' : 'Add to Wishlist'}
                  >
                    <Heart className="w-4 h-4 fill-rose-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
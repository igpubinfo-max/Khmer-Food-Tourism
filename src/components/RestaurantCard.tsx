import React from 'react';
import { Restaurant, isRestaurantPremiumActive } from '../types';
import { useApp } from '../context/AppContext';
import { MapPin, Phone, Star, Clock, Navigation, CheckCircle2, AlertCircle, Sparkles, Share2 } from 'lucide-react';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  const { 
    language, setSelectedRestaurant, showToast,
    trackRestaurantView, trackRestaurantCall, trackRestaurantMap, trackRestaurantShare 
  } = useApp();
  const isKm = language === 'km';
  const isPremium = isRestaurantPremiumActive(restaurant);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackRestaurantShare(restaurant.id);
    const shareUrl = `${window.location.origin}/?restaurant=${restaurant.id}`;
    if (navigator.share) {
      navigator.share({
        title: isKm ? restaurant.nameKh : restaurant.nameEn,
        text: isKm ? `សូមចូលមើល ${restaurant.nameKh} ក្នុងកម្មវិធី Khmer Food & Tourism!` : `Check out ${restaurant.nameEn}!`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      showToast(isKm ? 'បានចម្លងតំណភ្ជាប់ហាងជោគជ័យ!' : 'Restaurant link copied to clipboard!', 'success');
    }
  };

  return (
    <div 
      onClick={() => {
        trackRestaurantView(restaurant.id);
        setSelectedRestaurant(restaurant);
      }}
      className={`group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col ${
        isPremium 
          ? 'border-2 border-emerald-500/80 ring-1 ring-emerald-400/30' 
          : 'border border-slate-200/90 dark:border-slate-700/80'
      }`}
    >
      {/* Cover image */}
      <div className="relative aspect-16/9 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
        <img 
          src={restaurant.photoUrl} 
          alt={isKm ? restaurant.nameKh : restaurant.nameEn}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Province pill */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#064E3B]/90 backdrop-blur-md text-emerald-100 border border-emerald-400/30 shadow-xs font-khmer">
            {isKm ? restaurant.provinceKh : restaurant.provinceEn}
          </span>
        </div>

        {/* Verification & Membership Badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 flex-wrap justify-end">
          {isRestaurantPremiumActive(restaurant) ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#064E3B] to-[#059669] text-white border border-emerald-300/40 shadow-xs flex items-center gap-1 font-khmer">
              <Sparkles className="w-3 h-3 text-emerald-200" />
              <span>⭐ {isKm ? 'Premium VIP' : 'Premium'}</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800/85 backdrop-blur-md text-slate-100 border border-slate-600/40 shadow-xs flex items-center gap-1 font-khmer">
              <span>🏷️ {isKm ? 'ឥតគិតថ្លៃ' : 'Free'}</span>
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow-xs flex items-center gap-1 font-khmer ${
            restaurant.isVerified
              ? 'bg-[#059669]/95 text-white border border-emerald-300/40'
              : 'bg-slate-700/90 text-slate-200 border border-slate-600/40'
          }`}>
            {restaurant.isVerified ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-white" />
                <span>{isKm ? 'ផ្ទៀងផ្ទាត់រួច' : 'Verified'}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-slate-300" />
                <span>{isKm ? 'គំរូ / មិនទាន់ផ្ទៀងផ្ទាត់' : 'Sample'}</span>
              </>
            )}
          </span>

          <span className="px-2 py-0.5 rounded-md bg-[#064E3B]/90 backdrop-blur-md text-emerald-100 text-xs font-bold border border-emerald-400/30">
            {restaurant.priceLevel}
          </span>
        </div>

        {/* Hours badge */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#064E3B]/90 backdrop-blur-sm text-white text-[10px] font-khmer border border-emerald-400/30">
          <Clock className="w-3 h-3 text-emerald-300" />
          <span>{isKm ? restaurant.openingHoursKh : restaurant.openingHoursEn}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-start justify-between gap-1 mb-1">
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white group-hover:text-[#059669] transition line-clamp-1 font-khmer">
              {isKm ? restaurant.nameKh : restaurant.nameEn}
            </h3>
          </div>

          <div className="flex items-start gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-2 line-clamp-1 font-khmer">
            <MapPin className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
            <span>{isKm ? restaurant.addressKh : restaurant.addressEn}</span>
          </div>

          {/* Signature dishes tags */}
          <div className="flex flex-wrap gap-1 mb-2.5">
            {restaurant.signatureDishesKh.slice(0, 2).map((dish, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-[10px] font-medium border border-slate-200/80 dark:border-slate-600/60 font-khmer">
                🍽️ {dish}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-semibold text-xs">
            <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
            <span>{restaurant.rating}</span>
            <span className="text-slate-400 text-[10px]">({restaurant.reviewCount})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={`tel:${restaurant.phone}`}
              onClick={(e) => {
                e.stopPropagation();
                trackRestaurantCall(restaurant.id);
              }}
              className="p-1.5 rounded-lg bg-emerald-50 text-[#064E3B] hover:bg-[#064E3B] hover:text-white dark:bg-emerald-950/40 dark:text-emerald-300 transition"
              title={isKm ? 'ហៅទូរស័ព្ទទៅហាង' : 'Call restaurant'}
            >
              <Phone className="w-3.5 h-3.5" />
            </a>

            <a
              href={restaurant.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                trackRestaurantMap(restaurant.id);
              }}
              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white dark:bg-blue-950/40 dark:text-blue-300 transition"
              title={isKm ? 'មើលលើ Google Maps' : 'Open in Google Maps'}
            >
              <Navigation className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 transition"
              title={isKm ? 'ចែករំលែកតំណភ្ជាប់ហាង' : 'Share restaurant'}
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

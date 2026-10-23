import React from 'react';
import { Restaurant, isRestaurantPremiumActive } from '../types';
import { useApp } from '../context/AppContext';
import { MapPin, Phone, Star, Navigation, CheckCircle2, AlertCircle, Sparkles, Share2 } from 'lucide-react';
import { sanitizeDialablePhone, resolveRestaurantPhoneOnDemand } from '../services/googlePlacesService';
import { shareRichContent } from '../utils/androidMediaHelper';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

const RestaurantCardInner: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  const { 
    language, setSelectedRestaurant, showToast,
    trackRestaurantView, trackRestaurantCall, trackRestaurantMap, trackRestaurantShare 
  } = useApp();
  const isKm = language === 'km';
  const isPremium = isRestaurantPremiumActive(restaurant);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackRestaurantShare(restaurant.id);
    shareRichContent(
      {
        title: isKm ? restaurant.nameKh : restaurant.nameEn,
        nameKh: restaurant.nameKh,
        nameEn: restaurant.nameEn,
        description: isKm ? restaurant.descriptionKh : restaurant.descriptionEn,
        location: isKm
          ? `${restaurant.addressKh} (${restaurant.provinceKh})`
          : `${restaurant.addressEn} (${restaurant.provinceEn})`,
        phone: restaurant.phone,
        priceDisplay: restaurant.priceLevel,
        signatureDishes: restaurant.signatureDishesKh,
        photoUrl: restaurant.photoUrl,
        mapUrl: restaurant.mapUrl,
        itemType: 'restaurant',
        itemId: restaurant.id,
        isKm,
      },
      showToast
    );
  };

  return (
    <div 
      onClick={() => {
        trackRestaurantView(restaurant.id);
        setSelectedRestaurant(restaurant);
      }}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '280px' }}
      className={`group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-colors duration-150 cursor-pointer flex flex-col ${
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
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />

        {/* Province pill */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#064E3B]/95 text-emerald-100 border border-emerald-400/30 shadow-xs font-khmer">
            {isKm ? (restaurant.provinceKh || 'កម្ពុជា') : (restaurant.provinceEn || 'Cambodia')}
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
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/90 text-slate-100 border border-slate-600/40 shadow-xs flex items-center gap-1 font-khmer">
              <span>🏷️ {isKm ? 'ឥតគិតថ្លៃ' : 'Free'}</span>
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs flex items-center gap-1 font-khmer ${
            restaurant.isVerified
              ? 'bg-[#059669] text-white border border-emerald-300/40'
              : 'bg-slate-800/95 text-slate-200 border border-slate-600/40'
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

          <span className="px-2 py-0.5 rounded-md bg-[#064E3B]/95 text-emerald-100 text-xs font-bold border border-emerald-400/30">
            {restaurant.priceLevel || '$$'}
          </span>
        </div>

        {/* Reference Image Label (រូបភាពយោង) */}
        <div className="absolute bottom-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-black/70 text-[9px] text-white/90 font-khmer border border-white/20 select-none pointer-events-none shadow-xs z-10">
          <span>{isKm ? 'រូបភាពយោង' : 'Reference photo'}</span>
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
            {(restaurant.signatureDishesKh || []).slice(0, 2).map((dish, i) => (
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
            <span>{restaurant.rating ?? 4.8}</span>
            <span className="text-slate-400 text-[10px]">({restaurant.reviewCount ?? 0})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                trackRestaurantCall(restaurant.id);
                const dialable = sanitizeDialablePhone(restaurant.phone);
                if (dialable) {
                  window.location.href = `tel:${dialable}`;
                  return;
                }
                const found = await resolveRestaurantPhoneOnDemand(
                  restaurant.nameKh || restaurant.nameEn,
                  restaurant.provinceKh
                );
                const cleanFound = sanitizeDialablePhone(found);
                if (cleanFound) {
                  window.location.href = `tel:${cleanFound}`;
                  return;
                }
                showToast(
                  isKm
                    ? 'ហាងនេះមិនបានដាក់លេខទូរស័ព្ទលើផែនទីទេ — កំពុងបើកទីតាំងលើ Google Maps!'
                    : 'Phone number not listed on map — opening Google Maps!',
                  'warning'
                );
                if (restaurant.mapUrl) {
                  window.open(restaurant.mapUrl, '_blank');
                }
              }}
              className="p-1.5 rounded-lg bg-emerald-50 text-[#064E3B] hover:bg-[#064E3B] hover:text-white dark:bg-emerald-950/40 dark:text-emerald-300 transition"
              title={isKm ? 'ហៅទូរស័ព្ទទៅហាង' : 'Call restaurant'}
            >
              <Phone className="w-3.5 h-3.5" />
            </button>

            <a
              href={restaurant.mapUrl || '#'}
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

export const RestaurantCard = React.memo(RestaurantCardInner);

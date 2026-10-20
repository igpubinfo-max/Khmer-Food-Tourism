import React from 'react';
import { Restaurant, isRestaurantPremiumActive } from '../types';
import { useApp } from '../context/AppContext';
import { MapPin, Phone, Star, Clock, Navigation, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  const { language, setSelectedRestaurant } = useApp();
  const isKm = language === 'km';

  return (
    <div 
      onClick={() => setSelectedRestaurant(restaurant)}
      className="group bg-white dark:bg-[#0B3D2E]/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-[#A7DCA5]/50 dark:border-[#228B4E]/40 transition-all duration-200 cursor-pointer flex flex-col"
    >
      {/* Cover image */}
      <div className="relative aspect-16/9 w-full overflow-hidden bg-stone-100 dark:bg-stone-700">
        <img 
          src={restaurant.photoUrl} 
          alt={isKm ? restaurant.nameKh : restaurant.nameEn}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Province pill */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#0B3D2E]/85 backdrop-blur-md text-[#A7DCA5] border border-[#228B4E]/30 shadow font-khmer">
            {isKm ? restaurant.provinceKh : restaurant.provinceEn}
          </span>
        </div>

        {/* Verification & Membership Badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 flex-wrap justify-end">
          {isRestaurantPremiumActive(restaurant) ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#14532D] to-[#228B4E] text-[#A7DCA5] border border-[#A7DCA5]/40 shadow flex items-center gap-1 font-khmer">
              <Sparkles className="w-3 h-3 text-[#A7DCA5]" />
              <span>⭐ {isKm ? 'Premium VIP' : 'Premium'}</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0B3D2E]/80 backdrop-blur-md text-[#EAF6EC] border border-[#228B4E]/30 shadow flex items-center gap-1 font-khmer">
              <span>🏷️ {isKm ? 'ឥតគិតថ្លៃ' : 'Free'}</span>
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow flex items-center gap-1 font-khmer ${
            restaurant.isVerified
              ? 'bg-[#228B4E]/95 text-white border border-[#A7DCA5]/40'
              : 'bg-[#14532D]/90 text-[#A7DCA5] border border-[#228B4E]/40'
          }`}>
            {restaurant.isVerified ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-white" />
                <span>{isKm ? 'ផ្ទៀងផ្ទាត់រួច' : 'Verified'}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-[#A7DCA5]" />
                <span>{isKm ? 'គំរូ / មិនទាន់ផ្ទៀងផ្ទាត់' : 'Sample'}</span>
              </>
            )}
          </span>

          <span className="px-2 py-0.5 rounded-md bg-[#0B3D2E]/80 backdrop-blur-md text-[#A7DCA5] text-xs font-bold border border-[#228B4E]/30">
            {restaurant.priceLevel}
          </span>
        </div>

        {/* Hours badge */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0B3D2E]/85 backdrop-blur-sm text-white text-[10px] font-khmer border border-[#228B4E]/30">
          <Clock className="w-3 h-3 text-[#34A853]" />
          <span>{isKm ? restaurant.openingHoursKh : restaurant.openingHoursEn}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-start justify-between gap-1 mb-1">
            <h3 className="font-bold text-sm text-[#183326] dark:text-stone-100 group-hover:text-[#228B4E] transition line-clamp-1 font-khmer">
              {isKm ? restaurant.nameKh : restaurant.nameEn}
            </h3>
          </div>

          <div className="flex items-start gap-1 text-[11px] text-stone-500 dark:text-stone-400 mb-2 line-clamp-1 font-khmer">
            <MapPin className="w-3.5 h-3.5 text-[#228B4E] shrink-0 mt-0.5" />
            <span>{isKm ? restaurant.addressKh : restaurant.addressEn}</span>
          </div>

          {/* Signature dishes tags */}
          <div className="flex flex-wrap gap-1 mb-2.5">
            {restaurant.signatureDishesKh.slice(0, 2).map((dish, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-[#EAF6EC] dark:bg-[#0B3D2E]/50 text-[#14532D] dark:text-[#A7DCA5] text-[10px] font-medium border border-[#A7DCA5]/50 font-khmer">
                🍽️ {dish}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#A7DCA5]/30 dark:border-[#228B4E]/20">
          <div className="flex items-center gap-1 text-[#228B4E] font-semibold text-xs">
            <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>{restaurant.rating}</span>
            <span className="text-stone-400 text-[10px]">({restaurant.reviewCount})</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${restaurant.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-[#EAF6EC] text-[#14532D] hover:bg-[#A7DCA5]/30 dark:bg-[#0B3D2E]/60 dark:text-[#A7DCA5] transition"
              title="ទូរស័ព្ទទៅកាន់ហាង"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>

            <a
              href={restaurant.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-[#EAF6EC] text-[#228B4E] hover:bg-[#A7DCA5]/30 dark:bg-[#0B3D2E]/60 dark:text-[#A7DCA5] transition"
              title="មើលលើ Google Maps"
            >
              <Navigation className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

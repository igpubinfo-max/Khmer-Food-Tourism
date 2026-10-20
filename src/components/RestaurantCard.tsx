import React from 'react';
import { Restaurant } from '../types';
import { useApp } from '../context/AppContext';
import { MapPin, Phone, Star, Clock, Navigation } from 'lucide-react';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  const { language, setSelectedRestaurant } = useApp();

  return (
    <div 
      onClick={() => setSelectedRestaurant(restaurant)}
      className="group bg-white dark:bg-stone-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-amber-100/70 dark:border-stone-700/60 transition-all duration-200 cursor-pointer flex flex-col"
    >
      {/* Cover image */}
      <div className="relative aspect-16/9 w-full overflow-hidden bg-stone-100 dark:bg-stone-700">
        <img 
          src={restaurant.photoUrl} 
          alt={language === 'km' ? restaurant.nameKh : restaurant.nameEn}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Province pill */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-900/80 backdrop-blur-md text-amber-200 shadow">
            {language === 'km' ? restaurant.provinceKh : restaurant.provinceEn}
          </span>
        </div>

        {/* Price level */}
        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-amber-300 text-xs font-bold">
          {restaurant.priceLevel}
        </div>

        {/* Hours badge */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-950/75 backdrop-blur-sm text-stone-200 text-[10px]">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{language === 'km' ? restaurant.openingHoursKh : restaurant.openingHoursEn}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-start justify-between gap-1 mb-1">
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-amber-800 transition line-clamp-1">
              {language === 'km' ? restaurant.nameKh : restaurant.nameEn}
            </h3>
          </div>

          <div className="flex items-start gap-1 text-[11px] text-stone-500 dark:text-stone-400 mb-2 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>{language === 'km' ? restaurant.addressKh : restaurant.addressEn}</span>
          </div>

          {/* Signature dishes tags */}
          <div className="flex flex-wrap gap-1 mb-2.5">
            {restaurant.signatureDishesKh.slice(0, 2).map((dish, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-stone-700/60 text-amber-800 dark:text-amber-300 text-[10px] font-medium border border-amber-200/50 dark:border-stone-600">
                🍽️ {dish}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-700/60">
          <div className="flex items-center gap-1 text-amber-600 font-semibold text-xs">
            <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>{restaurant.rating}</span>
            <span className="text-stone-400 text-[10px]">({restaurant.reviewCount})</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${restaurant.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
              title="ទូរស័ព្ទទៅកាន់ហាង"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>

            <a
              href={restaurant.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 transition"
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

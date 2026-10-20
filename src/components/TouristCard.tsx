import React from 'react';
import { TouristDestination } from '../types';
import { useApp } from '../context/AppContext';
import { MapPin, Star, Heart, Ticket, Camera } from 'lucide-react';

interface TouristCardProps {
  destination: TouristDestination;
}

export const TouristCard: React.FC<TouristCardProps> = ({ destination }) => {
  const { language, setSelectedDestination, isBookmarked, toggleBookmark, currentUser } = useApp();
  const bookmarked = isBookmarked(destination.id);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div 
      onClick={() => setSelectedDestination(destination)}
      className="group bg-white dark:bg-stone-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-amber-100/70 dark:border-stone-700/60 transition-all duration-200 cursor-pointer flex flex-col"
    >
      {/* Cover image */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-stone-100 dark:bg-stone-700">
        <img 
          src={destination.photoUrl} 
          alt={language === 'km' ? destination.nameKh : destination.nameEn}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Province pill */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-900/80 backdrop-blur-md text-amber-200 shadow">
            {language === 'km' ? destination.provinceKh : destination.provinceEn}
          </span>
        </div>

        {/* Admin Change Photo Shortcut */}
        {isAdmin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDestination(destination);
            }}
            className="absolute top-2.5 right-11 p-2 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md backdrop-blur-md transition-transform active:scale-90"
            title={language === 'km' ? 'ប្តូររូបភាព' : 'Change Photo'}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Bookmark Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(destination.id);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-transform active:scale-90 ${
            bookmarked 
              ? 'bg-rose-500 text-white shadow-md' 
              : 'bg-white/80 dark:bg-stone-900/80 text-stone-600 hover:text-rose-500'
          }`}
          title="រក្សាទុក"
        >
          <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
        </button>

        {/* Category tag */}
        <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-stone-950/75 backdrop-blur-sm text-stone-200 text-[10px]">
          {language === 'km' ? destination.categoryKh : destination.categoryEn}
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-amber-800 transition line-clamp-1 mb-1">
            {language === 'km' ? destination.nameKh : destination.nameEn}
          </h3>

          <div className="flex items-start gap-1 text-[11px] text-stone-500 dark:text-stone-400 mb-2 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>{language === 'km' ? destination.addressKh : destination.addressEn}</span>
          </div>

          <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed mb-2.5">
            {language === 'km' ? destination.descriptionKh : destination.descriptionEn}
          </p>
        </div>

        {/* Bottom meta */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-700/60 text-[11px]">
          <div className="flex items-center gap-1 text-amber-600 font-semibold">
            <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>{destination.rating}</span>
            <span className="text-stone-400 text-[10px]">({destination.reviewCount})</span>
          </div>

          <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium text-[10px]">
            <Ticket className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{language === 'km' ? destination.entranceFeeKh : destination.entranceFeeEn}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

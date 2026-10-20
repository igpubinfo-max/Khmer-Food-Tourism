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
      className="group bg-white dark:bg-[#0B3D2E]/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-[#A7DCA5]/50 dark:border-[#228B4E]/40 transition-all duration-200 cursor-pointer flex flex-col"
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
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#0B3D2E]/85 text-[#A7DCA5] border border-[#228B4E]/30 shadow">
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
            className="absolute top-2.5 right-11 p-2 rounded-full bg-[#34A853] hover:bg-[#228B4E] text-white shadow-md backdrop-blur-md transition-transform active:scale-90"
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
        <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#0B3D2E]/85 backdrop-blur-sm text-[#A7DCA5] text-[10px] border border-[#228B4E]/30">
          {language === 'km' ? destination.categoryKh : destination.categoryEn}
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-bold text-sm text-[#183326] dark:text-stone-100 group-hover:text-[#228B4E] transition line-clamp-1 mb-1">
            {language === 'km' ? destination.nameKh : destination.nameEn}
          </h3>

          <div className="flex items-start gap-1 text-[11px] text-stone-500 dark:text-stone-400 mb-2 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-[#228B4E] shrink-0 mt-0.5" />
            <span>{language === 'km' ? destination.addressKh : destination.addressEn}</span>
          </div>

          <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed mb-2.5">
            {language === 'km' ? destination.descriptionKh : destination.descriptionEn}
          </p>
        </div>

        {/* Bottom meta */}
        <div className="flex items-center justify-between pt-2 border-t border-[#A7DCA5]/30 dark:border-[#228B4E]/20 text-[11px]">
          <div className="flex items-center gap-1 text-[#228B4E] font-semibold">
            <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>{destination.rating}</span>
            <span className="text-stone-400 text-[10px]">({destination.reviewCount})</span>
          </div>

          <div className="flex items-center gap-1 text-[#14532D] dark:text-[#A7DCA5] font-medium text-[10px]">
            <Ticket className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{language === 'km' ? destination.entranceFeeKh : destination.entranceFeeEn}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

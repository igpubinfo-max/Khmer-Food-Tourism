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
      className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/90 dark:border-slate-700/80 transition-all duration-200 cursor-pointer flex flex-col"
    >
      {/* Cover image */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
        <img 
          src={destination.photoUrl} 
          alt={language === 'km' ? destination.nameKh : destination.nameEn}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Province pill & Viral Social Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#064E3B]/90 backdrop-blur-md text-emerald-100 border border-emerald-400/30 shadow-xs">
            {language === 'km' ? destination.provinceKh : destination.provinceEn}
          </span>
          {destination.isTrendingSocial && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 text-white border border-white/30 shadow-xs flex items-center gap-1 font-khmer">
              <span>🔥 {destination.socialViews || 'TikTok & FB'}</span>
            </span>
          )}
        </div>

        {/* Admin Change Photo Shortcut */}
        {isAdmin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDestination(destination);
            }}
            className="absolute top-2.5 right-11 p-2 rounded-full bg-[#10B981] hover:bg-[#059669] text-white shadow-md backdrop-blur-md transition-transform active:scale-90"
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
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 hover:text-rose-500'
          }`}
          title="រក្សាទុក"
        >
          <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
        </button>

        {/* Category tag */}
        <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#064E3B]/90 backdrop-blur-sm text-emerald-100 text-[10px] border border-emerald-400/30">
          {language === 'km' ? destination.categoryKh : destination.categoryEn}
        </div>

        {/* Sample / Representative Image Label (រូបតំណាង) */}
        <div className="absolute bottom-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] text-white/90 font-khmer border border-white/20 select-none pointer-events-none shadow-xs z-10">
          <span>{language === 'km' ? 'រូបតំណាង' : 'Sample photo'}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-bold text-sm text-[#0F172A] dark:text-white group-hover:text-[#059669] transition line-clamp-1 mb-1">
            {language === 'km' ? destination.nameKh : destination.nameEn}
          </h3>

          <div className="flex items-start gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-2 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
            <span>{language === 'km' ? destination.addressKh : destination.addressEn}</span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2.5">
            {language === 'km' ? destination.descriptionKh : destination.descriptionEn}
          </p>
        </div>

        {/* Bottom meta */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-semibold">
            <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
            <span>{destination.rating ?? 4.8}</span>
            <span className="text-slate-400 text-[10px]">({destination.reviewCount ?? 0})</span>
          </div>

          <div className="flex items-center gap-1 text-[#064E3B] dark:text-emerald-400 font-medium text-[10px]">
            <Ticket className="w-3 h-3" />
            <span>{language === 'km' ? (destination.entranceFeeKh || destination.entryFeeKh || 'ឥតគិតថ្លៃ') : (destination.entranceFeeEn || destination.entryFeeEn || 'Free')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

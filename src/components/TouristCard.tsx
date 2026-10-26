import React, { useMemo } from 'react';
import { TouristDestination } from '../types';
import { useApp } from '../context/AppContext';
import { MapPin, Star, Heart, Ticket, Edit2 } from 'lucide-react';
import { tr } from '../utils/i18n';
import { getLocalizedDestination } from '../utils/zhDynamicTranslator';

interface TouristCardProps {
  destination: TouristDestination;
}

const TouristCardInner: React.FC<TouristCardProps> = ({ destination }) => {
  const { language, setSelectedDestination, isBookmarked, toggleBookmark, currentUser } = useApp();
  const bookmarked = isBookmarked(destination.id);
  const isAdmin = currentUser?.role === 'admin';
  const loc = useMemo(() => getLocalizedDestination(destination, language), [destination, language]);

  return (
    <div 
      onClick={() => setSelectedDestination(destination)}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '260px' }}
      className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/90 dark:border-slate-700/80 transition-colors duration-150 cursor-pointer flex flex-col"
    >
      {/* Cover image */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
        <img 
          src={destination.photoUrl} 
          alt={loc.name}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.fallback) {
              target.dataset.fallback = '1';
              target.src = '/welcome/places.webp';
            }
          }}
        />

        {/* Province pill & Viral Social Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#064E3B]/95 text-emerald-100 border border-emerald-400/30 shadow-xs">
            {loc.province}
          </span>
          {destination.isTrendingSocial && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 text-white border border-white/30 shadow-xs flex items-center gap-1 font-khmer">
              <span>
                🔥{' '}
                {destination.socialViews
                  ? language === 'km'
                    ? destination.socialViews.replace(/views/gi, 'ដង').replace(/M\+/gi, 'លាន+')
                    : language === 'zh'
                    ? destination.socialViews.replace(/views/gi, '次浏览').replace(/M\+/gi, '百万+')
                    : destination.socialViews
                  : 'TikTok & FB'}
              </span>
            </span>
          )}
        </div>

        {/* Admin Edit Shortcut */}
        {isAdmin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              (window as any).__kft_open_dest_edit = true;
              setSelectedDestination(destination);
            }}
            className="absolute top-2.5 right-11 p-2 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md transition-transform active:scale-90"
            title={tr(language, 'កែប្រែព័ត៌មានតំបន់ទេសចរណ៍', 'Edit Destination (Admin)', '编辑景点信息（管理员）')}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Bookmark Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(destination.id);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full transition-transform active:scale-90 ${
            bookmarked 
              ? 'bg-rose-500 text-white shadow-md' 
              : 'bg-white/95 dark:bg-slate-900/95 text-slate-600 hover:text-rose-500'
          }`}
          title={tr(language, 'រក្សាទុក', 'Save', '收藏')}
        >
          <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
        </button>

        {/* Category tag */}
        <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#064E3B]/95 text-emerald-100 text-xs font-bold border border-emerald-400/30">
          {loc.category}
        </div>

        {/* Reference Image Label (រូបភាពយោង) */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/55 backdrop-blur-xs text-[8px] sm:text-[9px] text-white/85 font-khmer border border-white/15 select-none pointer-events-none shadow-2xs z-10">
          <span>{tr(language, 'រូបភាពយោង', 'Reference photo', '参考图片')}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-[#0F172A] dark:text-white group-hover:text-[#059669] transition line-clamp-2 leading-snug mb-1.5">
            {loc.name}
          </h3>

          <div className="flex items-start gap-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-2 line-clamp-1">
            <MapPin className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
            <span>{loc.address}</span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-3">
            {loc.description}
          </p>
        </div>

        {/* Bottom meta */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs sm:text-sm">
          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-bold">
            <Star className="w-4 h-4 fill-current text-amber-500" />
            <span>{destination.rating ?? 4.8}</span>
            <span className="text-slate-400 text-xs">({destination.reviewCount ?? 0})</span>
          </div>

          <div className="flex items-center gap-1 text-[#064E3B] dark:text-emerald-400 font-bold text-xs">
            <Ticket className="w-3.5 h-3.5" />
            <span>{loc.entranceFee}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TouristCard = React.memo(TouristCardInner);

import React from 'react';
import { FoodItem } from '../types';
import { useApp } from '../context/AppContext';
import { Star, Heart, Flame, Share2 } from 'lucide-react';
import { shareRichContent } from '../utils/androidMediaHelper';

interface FoodCardProps {
  food: FoodItem;
}

export const FoodCard: React.FC<FoodCardProps> = ({ food }) => {
  const { language, setSelectedFood, isBookmarked, toggleBookmark, showToast } = useApp();
  const bookmarked = isBookmarked(food.id);
  const isKm = language === 'km';

  const handleShareFood = (e: React.MouseEvent) => {
    e.stopPropagation();
    shareRichContent(
      {
        title: isKm ? food.nameKh : food.nameEn,
        nameKh: food.nameKh,
        nameEn: food.nameEn,
        description: isKm ? food.descriptionKh : food.descriptionEn,
        location: isKm ? `${food.categoryKh} • កម្ពុជា` : `${food.categoryEn} • Cambodia`,
        priceDisplay: `${food.priceRiel.toLocaleString()} ៛ ($${food.priceUsd.toFixed(2)})`,
        signatureDishes: (food.ingredients || []).slice(0, 4).map(i => (isKm ? i.nameKh : i.nameEn)),
        photoUrl: food.photoUrl,
        itemType: 'food',
        itemId: food.id,
        isKm,
      },
      showToast
    );
  };

  return (
    <div 
      onClick={() => setSelectedFood(food)}
      className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/90 dark:border-slate-700/80 transition-all duration-200 cursor-pointer flex flex-col"
    >
      {/* Image container */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
        <img 
          src={food.photoUrl} 
          alt={language === 'km' ? food.nameKh : food.nameEn}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Category tag */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#064E3B]/90 backdrop-blur-md text-emerald-100 border border-emerald-400/30 shadow-xs">
            {language === 'km' ? food.categoryKh : food.categoryEn}
          </span>
        </div>

        {/* Bookmark Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(food.id);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-transform active:scale-90 ${
            bookmarked 
              ? 'bg-rose-500 text-white shadow-md' 
              : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:text-rose-500'
          }`}
          title="រក្សាទុក"
        >
          <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
        </button>

        {/* Reference Image Label (រូបភាពយោង) */}
        <div className="absolute bottom-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] text-white/90 font-khmer border border-white/20 select-none pointer-events-none shadow-xs">
          <span>{language === 'km' ? 'រូបភាពយោង' : 'Reference photo'}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white group-hover:text-[#059669] transition line-clamp-1">
              {language === 'km' ? food.nameKh : food.nameEn}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2.5">
            {language === 'km' ? food.descriptionKh : food.descriptionEn}
          </p>
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-semibold">
            <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
            <span>{food.rating ?? 4.8}</span>
            <span className="text-slate-400 text-[10px]">({food.reviewCount ?? 0})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 text-slate-500 text-[10px]">
              <Flame className="w-3 h-3 text-orange-500" />
              <span>{food.calories ?? 320} kcal</span>
            </div>
            <button
              type="button"
              onClick={handleShareFood}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 transition"
              title={isKm ? 'ចែករំលែកមុខម្ហូប' : 'Share dish'}
            >
              <Share2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

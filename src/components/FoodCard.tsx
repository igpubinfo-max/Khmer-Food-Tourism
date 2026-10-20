import React from 'react';
import { FoodItem } from '../types';
import { useApp } from '../context/AppContext';
import { Clock, Star, Heart, Flame } from 'lucide-react';

interface FoodCardProps {
  food: FoodItem;
}

export const FoodCard: React.FC<FoodCardProps> = ({ food }) => {
  const { language, setSelectedFood, isBookmarked, toggleBookmark } = useApp();
  const bookmarked = isBookmarked(food.id);

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

        {/* Cook Time pill */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#064E3B]/90 backdrop-blur-sm text-white text-[10px] font-medium font-khmer border border-emerald-400/30">
          <Clock className="w-3 h-3 text-emerald-300" />
          <span>{food.cookTime}</span>
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
            <span>{food.rating}</span>
            <span className="text-slate-400 text-[10px]">({food.reviewCount})</span>
          </div>

          <div className="flex items-center gap-1 text-slate-500 text-[10px]">
            <Flame className="w-3 h-3 text-orange-500" />
            <span>{food.calories} kcal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

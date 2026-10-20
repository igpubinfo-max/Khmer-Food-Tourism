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
      className="group bg-white dark:bg-[#0B3D2E]/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-[#A7DCA5]/50 dark:border-[#228B4E]/40 transition-all duration-200 cursor-pointer flex flex-col"
    >
      {/* Image container */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-stone-100 dark:bg-stone-700">
        <img 
          src={food.photoUrl} 
          alt={language === 'km' ? food.nameKh : food.nameEn}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Category tag */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#0B3D2E]/85 backdrop-blur-md text-[#A7DCA5] border border-[#228B4E]/30 shadow">
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
              : 'bg-white/85 dark:bg-[#0B3D2E]/85 text-stone-600 dark:text-stone-300 hover:text-rose-500'
          }`}
          title="រក្សាទុក"
        >
          <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
        </button>

        {/* Cook Time pill */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0B3D2E]/85 backdrop-blur-sm text-white text-[10px] font-medium font-khmer border border-[#228B4E]/30">
          <Clock className="w-3 h-3 text-[#34A853]" />
          <span>{food.cookTime}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <h3 className="font-bold text-sm text-[#183326] dark:text-stone-100 group-hover:text-[#228B4E] transition line-clamp-1">
              {language === 'km' ? food.nameKh : food.nameEn}
            </h3>
          </div>
          <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed mb-2.5">
            {language === 'km' ? food.descriptionKh : food.descriptionEn}
          </p>
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between pt-2 border-t border-[#A7DCA5]/30 dark:border-[#228B4E]/20 text-[11px]">
          <div className="flex items-center gap-1 text-[#228B4E] font-semibold">
            <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>{food.rating}</span>
            <span className="text-stone-400 text-[10px]">({food.reviewCount})</span>
          </div>

          <div className="flex items-center gap-1 text-stone-500 text-[10px]">
            <Flame className="w-3 h-3 text-orange-500" />
            <span>{food.calories} kcal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

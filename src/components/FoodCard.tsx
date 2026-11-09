import React, { useMemo } from 'react';
import { FoodItem, resolveFoodPhotoUrl, handleFoodImageError } from '../types';
import { useApp } from '../context/AppContext';
import { Star, Heart, Utensils, Edit2 } from 'lucide-react';
import { tr } from '../utils/i18n';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';
import { getDisplayTags, tagLabel } from '../utils/dishTags';
import { PassportStampButton } from './PassportStampButton';
import { DishTagIcon } from './icons/HandcraftedIcons';
import { FOOD_WATERMARK_TEXT, isUrlWatermarkedAtPixelLevel } from '../utils/foodWatermark';

import type { Language } from '../types';

interface FoodCardProps {
  food: FoodItem;
}

interface FoodCardViewProps {
  food: FoodItem;
  language: Language;
  bookmarked: boolean;
  isAdmin: boolean;
  setSelectedFood: (f: FoodItem | null) => void;
  toggleBookmark: (id: string) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

const FoodCardView: React.FC<FoodCardViewProps> = React.memo(({
  food,
  language,
  bookmarked,
  isAdmin,
  setSelectedFood,
  toggleBookmark,
  showToast,
}) => {
  const loc = useMemo(() => getLocalizedFood(food, language), [food, language]);
  const tags = useMemo(() => getDisplayTags(food, 3), [food]);

  const resolvedPhotoUrl = useMemo(() => {
    // Grid cards show a resized copy (Supabase Image Transformation); onError below falls back to original/seed file.
    return resolveFoodPhotoUrl(food.photoUrl, food.photoUpdatedAt, 720, food.id) || '/welcome/hero-bg.webp';
  }, [food.photoUrl, food.photoUpdatedAt, food.id]);
  const fullPhotoUrl = useMemo(
    () => resolveFoodPhotoUrl(food.photoUrl, food.photoUpdatedAt, undefined, food.id) || '/welcome/hero-bg.webp',
    [food.photoUrl, food.photoUpdatedAt, food.id]
  );

  return (
    <div 
      onClick={() => setSelectedFood(food)}

      className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/90 dark:border-slate-700/80 transition-colors duration-150 cursor-pointer flex flex-col"
    >
      {/* Image container */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
        <img 
          src={resolvedPhotoUrl} 
          alt={loc.name}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => handleFoodImageError(e, food.id, fullPhotoUrl)}
        />
        
        {/* Category tag */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#064E3B]/95 text-emerald-100 border border-emerald-400/30 shadow-xs">
            {loc.category}
          </span>
        </div>

        {/* Admin Edit Shortcut */}
        {isAdmin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              (window as any).__kft_open_food_edit = true;
              setSelectedFood(food);
            }}
            className="absolute top-2.5 right-11 p-2 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md transition-transform active:scale-90"
            title={tr(language, 'កែប្រែព័ត៌មានម្ហូប', 'Edit Food (Admin)', '编辑菜品信息（管理员）')}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Bookmark Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(food.id);
          }}
          className={`absolute top-1.5 right-1.5 w-10 h-10 flex items-center justify-center rounded-full transition-transform active:scale-90 ${
            bookmarked 
              ? 'bg-rose-500 text-white shadow-md' 
              : 'bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 hover:text-rose-500'
          }`}
          aria-pressed={bookmarked}
          title={tr(language, 'រក្សាទុក', 'Save', '收藏')}
        >
          <Heart className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
        </button>
        {/* Watermark fallback only for external URLs not watermarked at pixel level */}
        {!isUrlWatermarkedAtPixelLevel(resolveFoodPhotoUrl(food)) && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/40 backdrop-blur-xs text-[8px] sm:text-[9px] font-medium text-white/80 border border-white/15 select-none pointer-events-none shadow-2xs">
            <span>{FOOD_WATERMARK_TEXT}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <div className="mb-2">
            <h3 className="font-extrabold text-lg sm:text-xl text-[#0F172A] dark:text-white group-hover:text-[#059669] transition leading-snug line-clamp-2">
              {loc.name}
            </h3>
          </div>
          {loc.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3 leading-relaxed">
              {loc.description}
            </p>
          )}
          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {displayTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-[11px] font-semibold"
                >
                  <DishTagIcon tag={tag} className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {tagLabel(tag, language)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/60 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-bold">
              <Star className="w-4 h-4 fill-current text-amber-500" />
              <span>{food.rating ?? 4.8}</span>
              <span className="text-slate-400 text-xs">({food.reviewCount ?? 0})</span>
            </div>
            {typeof food.calories === 'number' && food.calories > 0 && (
              <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400">
                <Utensils className="w-4 h-4" />
                {food.calories} {tr(language, 'គីឡូកាឡូរី', 'kcal', '千卡')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <PassportStampButton foodId={food.id} language={language} showToast={showToast} />
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.food === next.food &&
  prev.language === next.language &&
  prev.bookmarked === next.bookmarked &&
  prev.isAdmin === next.isAdmin
);

const FoodCardInner: React.FC<FoodCardProps> = ({ food }) => {
  const { language, setSelectedFood, isBookmarked, toggleBookmark, showToast, currentUser } = useApp();
  const bookmarked = isBookmarked(food.id);
  const isAdmin = currentUser?.role === 'admin';
  return (
    <FoodCardView
      food={food}
      language={language}
      bookmarked={bookmarked}
      isAdmin={isAdmin}
      setSelectedFood={setSelectedFood}
      toggleBookmark={toggleBookmark}
      showToast={showToast}
    />
  );
};

export const FoodCard = React.memo(FoodCardInner);

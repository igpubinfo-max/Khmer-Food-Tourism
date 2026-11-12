import React from 'react';
import { FoodItem, Language, resolveFoodPhotoUrl, handleFoodImageError } from '../types';
import { useApp } from '../context/AppContext';
import { Heart, Star, Utensils, Edit2, ChevronRight } from 'lucide-react';
import { tr } from '../utils/i18n';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';
import { FOOD_WATERMARK_BADGE_CLASS, FOOD_WATERMARK_TEXT, isUrlWatermarkedAtPixelLevel } from '../utils/foodWatermark';

interface FoodCardProps {
  food: FoodItem;
}

interface FoodCardViewProps {
  food: FoodItem;
  language: Language;
  bookmarked: boolean;
  isAdmin: boolean;
  setSelectedFood: (f: FoodItem) => void;
  toggleBookmark: (id: string) => void;
}

const FoodCardView = React.memo<FoodCardViewProps>(
  ({ food, language, bookmarked, isAdmin, setSelectedFood, toggleBookmark }) => {
    const loc = getLocalizedFood(food, language);
    const resolvedPhotoUrl = resolveFoodPhotoUrl(food.photoUrl, food.photoUpdatedAt, 480, food.id);
    const ratingVal = food.rating ?? 4.8;
    const reviewCountVal = food.reviewCount && food.reviewCount > 0 ? food.reviewCount : 98;

    return (
      <div
        onClick={() => setSelectedFood(food)}
        style={{
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
        }}
        className="kft-cv-card bg-white rounded-[22px] p-2.5 sm:p-3.5 border border-slate-200/80 hover:border-emerald-600/40 hover:shadow-md transition-all cursor-pointer group flex items-center gap-2.5 min-[360px]:gap-3 sm:gap-3.5 font-khmer"
      >
        {/* Left Dish Image Container: +20% larger size & 100% locked 1:1 square aspect ratio across every card */}
        <div className="relative w-[41%] min-w-[110px] max-w-[186px] aspect-square self-center rounded-[16px] overflow-hidden bg-slate-100 border border-slate-200/60 shrink-0">
          <img
            src={resolvedPhotoUrl}
            onError={(e) => handleFoodImageError(e, food.id, food.photoUrl)}
            alt={loc.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />

          {/* Admin Quick Edit Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFood(food);
              }}
              className="absolute top-1.5 left-1.5 z-10 p-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-stone-900 shadow-md transition-transform active:scale-90"
              title={tr(language, 'កែប្រែព័ត៌មានម្ហូប (Admin)', 'Edit Dish (Admin)', '编辑菜品信息（管理员）')}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Top-Right Unified Circle Heart Bookmark Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(food.id);
            }}
            className="kft-btn-fav absolute top-2 right-2"
            aria-pressed={bookmarked}
            title={tr(language, 'រក្សាទុក', 'Save', '收藏')}
          >
            <Heart className={`w-4 h-4 ${bookmarked ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} strokeWidth={2.2} />
          </button>

          {/* Khmer ownership watermark (applied once) */}
          {!isUrlWatermarkedAtPixelLevel(resolvedPhotoUrl) && (
            <div className={FOOD_WATERMARK_BADGE_CLASS}>
              <span>{FOOD_WATERMARK_TEXT}</span>
            </div>
          )}
        </div>

        {/* Right Content Column: balanced height & consistent alignment beside the square image */}
        <div className="flex-1 min-w-0 self-stretch flex flex-col justify-between py-0.5">
          <div>
            <h3
              style={{ fontSize: 'clamp(16px, 4.35vw, 20.5px)' }}
              className="font-khmer font-extrabold text-[#0F172A] group-hover:text-[#1B5E3A] transition leading-[1.68] py-0.5 line-clamp-2 break-words"
            >
              {loc.name}
            </h3>
            {loc.description && (
              <p
                style={{ fontSize: 'clamp(13.2px, 3.55vw, 15.8px)' }}
                className="text-slate-600 line-clamp-2 sm:line-clamp-3 mt-0.5 leading-[1.65] min-h-[3.3em] break-words"
              >
                {loc.description}
              </p>
            )}
          </div>

          <div className="mt-1.5 space-y-1.5">
            {/* Star Rating Row */}
            <div className="flex items-center gap-1 text-xs font-extrabold text-[#0F172A]">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span>{ratingVal}</span>
              <span className="text-slate-500 font-semibold">({reviewCountVal})</span>
            </div>

            {/* Unified Green Action Pill Button: [🍴 មើលលម្អិត >] */}
            <div>
              <span className="kft-btn-details max-w-full">
                <Utensils className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">{tr(language, 'មើលលម្អិត', 'View Details', '查看详情')}</span>
                <ChevronRight className="w-3.5 h-3.5 text-white/90 shrink-0" />
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.food === next.food &&
    prev.language === next.language &&
    prev.bookmarked === next.bookmarked &&
    prev.isAdmin === next.isAdmin
);

const FoodCardInner: React.FC<FoodCardProps> = ({ food }) => {
  const { language, setSelectedFood, isBookmarked, toggleBookmark, currentUser } = useApp();
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
    />
  );
};

export const FoodCard = React.memo(FoodCardInner);
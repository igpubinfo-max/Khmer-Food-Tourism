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
    const resolvedPhotoUrl = resolveFoodPhotoUrl(food.photoUrl, food.photoUpdatedAt, 400, food.id);
    const ratingVal = food.rating ?? 4.8;
    const reviewCountVal = food.reviewCount && food.reviewCount > 0 ? food.reviewCount : 98;

    return (
      <div
        onClick={() => setSelectedFood(food)}
        style={{
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
        }}
        className="kft-cv-card bg-white rounded-[22px] p-2.5 border border-slate-200/80 hover:border-emerald-600/40 hover:shadow-md transition-all cursor-pointer group flex items-center gap-3.5 font-khmer"
      >
        {/* Left Dish Image Container */}
        <div className="relative w-[118px] min-[360px]:w-[138px] sm:w-[154px] h-[118px] sm:h-[128px] rounded-[16px] overflow-hidden bg-slate-200 shrink-0">
          <img
            src={resolvedPhotoUrl}
            onError={(e) => handleFoodImageError(e, food.id, food.photoUrl)}
            alt={loc.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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

          {/* Top-Right Dark Circle Heart Bookmark Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(food.id);
            }}
            className={`absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full transition-transform active:scale-90 cursor-pointer ${
              bookmarked
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-black/55 hover:bg-black/75 text-white border border-white/25'
            }`}
            aria-pressed={bookmarked}
            title={tr(language, 'រក្សាទុក', 'Save', '收藏')}
          >
            <Heart className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Khmer ownership watermark (applied once) */}
          {!isUrlWatermarkedAtPixelLevel(resolvedPhotoUrl) && (
            <div className={FOOD_WATERMARK_BADGE_CLASS}>
              <span>{FOOD_WATERMARK_TEXT}</span>
            </div>
          )}
        </div>

        {/* Right Content Column */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <h3 className="font-khmer font-extrabold text-[15.5px] sm:text-[16.5px] text-[#0F172A] group-hover:text-[#1B5E3A] transition leading-[1.65] py-0.5 line-clamp-2">
              {loc.name}
            </h3>
            {loc.description && (
              <p className="text-[12px] text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                {loc.description}
              </p>
            )}
          </div>

          <div className="mt-2 space-y-1.5">
            {/* Star Rating Row */}
            <div className="flex items-center gap-1 text-xs font-extrabold text-[#0F172A]">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span>{ratingVal}</span>
              <span className="text-slate-500 font-semibold">({reviewCountVal})</span>
            </div>

            {/* Dark Green Action Pill Button: [🍴 មើលលម្អិត >] */}
            <div>
              <span
                style={{
                  background: 'linear-gradient(180deg, #2E7D52 0%, #1B5E3A 100%)',
                }}
                className="inline-flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-full text-white text-xs font-bold shadow-2xs transition"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{tr(language, 'មើលលម្អិត', 'View Details', '查看详情')}</span>
                </span>
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

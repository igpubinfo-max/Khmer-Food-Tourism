import React, { useMemo } from 'react';
import { FoodItem } from '../types';
import { useApp } from '../context/AppContext';
import { Star, Heart, Flame, Share2, Edit2 } from 'lucide-react';
import { shareRichContent } from '../utils/androidMediaHelper';
import { tr } from '../utils/i18n';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';
import { getDishNutritionProfile } from '../services/aiFoodService';

interface FoodCardProps {
  food: FoodItem;
}

const FoodCardInner: React.FC<FoodCardProps> = ({ food }) => {
  const { language, setSelectedFood, isBookmarked, toggleBookmark, showToast, currentUser } = useApp();
  const bookmarked = isBookmarked(food.id);
  const isKm = language === 'km';
  const isAdmin = currentUser?.role === 'admin';
  const loc = useMemo(() => getLocalizedFood(food, language), [food, language]);
  const nutrition = useMemo(() => getDishNutritionProfile(food), [food]);
  const kcal = food.calories ?? nutrition.caloriesKcal;
  const sodiumLabel =
    nutrition.sodiumLevel === 'low'
      ? tr(language, 'ទាប', 'Low', '低')
      : nutrition.sodiumLevel === 'high'
      ? tr(language, 'ខ្ពស់', 'High', '高')
      : tr(language, 'មធ្យម', 'Med', '中');

  const handleShareFood = (e: React.MouseEvent) => {
    e.stopPropagation();
    shareRichContent(
      {
        title: loc.name,
        nameKh: food.nameKh,
        nameEn: food.nameEn,
        description: loc.description,
        location: tr(language, `${food.categoryKh} • កម្ពុជា`, `${food.categoryEn} • Cambodia`, `${loc.category} • 柬埔寨`),
        priceDisplay: `${food.priceRiel.toLocaleString()} ៛ ($${(food.priceUsd ?? 0).toFixed(2)})`,
        signatureDishes: loc.ingredients.slice(0, 4).map(i => i.name),
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
      style={{ contentVisibility: 'auto', containIntrinsicSize: '340px' }}
      className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/90 dark:border-slate-700/80 transition-colors duration-150 cursor-pointer flex flex-col"
    >
      {/* Image container */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
        <img 
          src={food.photoUrl} 
          alt={loc.name}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        
        {/* Category tag */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#064E3B]/95 text-emerald-100 border border-emerald-400/30 shadow-xs">
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
            title={tr(language, 'កែប្រែព័ត៌មានម្ហូប (Admin)', 'Edit Food (Admin)', '编辑菜品信息（管理员）')}
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

        {/* Reference Image Label (រូបភាពយោង) */}
        <div className="absolute bottom-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-black/70 text-[9px] text-white/90 font-khmer border border-white/20 select-none pointer-events-none shadow-xs">
          <span>{tr(language, 'រូបភាពយោង', 'Reference photo', '参考图片')}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <div className="mb-1">
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-white group-hover:text-[#059669] transition line-clamp-1">
              {loc.name}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
              {language === 'km' ? food.nameEn : language === 'en' ? food.nameKh : `${food.nameKh} · ${food.nameEn}`}
            </p>
          </div>
          <p className="text-xs font-bold text-[#064E3B] dark:text-emerald-300 mb-2">
            💰 ${(food.priceUsd ?? 0).toFixed(2)} <span className="text-slate-400 font-medium">· {food.priceRiel.toLocaleString()} ៛</span>
          </p>

          {/* 3 key nutrition facts (estimates; calories use the dish's stored value when available) */}
          <div className="grid grid-cols-3 gap-1 mb-2.5" title={tr(language, 'តម្លៃប៉ាន់ស្មាន', 'Approximate values', '数值为估算')}>
            <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 px-1 py-1 text-center">
              <div className="text-[11px] font-bold text-orange-700 dark:text-orange-300">{kcal}</div>
              <div className="text-[9px] text-slate-500">{tr(language, 'កាឡូរី', 'kcal', '千卡')}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-1 py-1 text-center">
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">≈{nutrition.proteinG}g</div>
              <div className="text-[9px] text-slate-500">{tr(language, 'ប្រូតេអ៊ីន', 'protein', '蛋白质')}</div>
            </div>
            <div className="rounded-lg bg-sky-50 dark:bg-sky-950/30 px-1 py-1 text-center">
              <div className="text-[11px] font-bold text-sky-700 dark:text-sky-300">{sodiumLabel}</div>
              <div className="text-[9px] text-slate-500">{tr(language, 'ជាតិប្រៃ', 'sodium', '钠')}</div>
            </div>
          </div>
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-semibold">
            <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
            <span>{food.rating ?? 4.8}</span>
            <span className="text-slate-400 text-[10px]">({food.reviewCount ?? 0})</span>
          </div>

          <button
            type="button"
            onClick={handleShareFood}
            className="min-w-[44px] min-h-[36px] px-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 transition flex items-center justify-center gap-1 text-[11px] font-semibold"
            title={tr(language, 'ចែករំលែកមុខម្ហូប', 'Share dish', '分享菜品')}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{tr(language, 'ចែក', 'Share', '分享')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const FoodCard = React.memo(FoodCardInner);

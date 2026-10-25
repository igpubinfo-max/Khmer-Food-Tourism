import React, { useMemo } from 'react';
import { FoodItem } from '../types';
import { useApp } from '../context/AppContext';
import { Star, Heart, Flame, Share2, Edit2 } from 'lucide-react';
import { shareRichContent } from '../utils/androidMediaHelper';
import { tr } from '../utils/i18n';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';
import { getDisplayTags, tagLabel } from '../utils/dishTags';
import { PassportStampButton } from './PassportStampButton';

interface FoodCardProps {
  food: FoodItem;
}

const FoodCardInner: React.FC<FoodCardProps> = ({ food }) => {
  const { language, setSelectedFood, isBookmarked, toggleBookmark, showToast, currentUser } = useApp();
  const bookmarked = isBookmarked(food.id);
  const isKm = language === 'km';
  const isAdmin = currentUser?.role === 'admin';
  const loc = useMemo(() => getLocalizedFood(food, language), [food, language]);
  const tags = useMemo(() => getDisplayTags(food, 3), [food]);

  const handleShareFood = (e: React.MouseEvent) => {
    e.stopPropagation();
    shareRichContent(
      {
        title: loc.name,
        nameKh: food.nameKh,
        nameEn: food.nameEn,
        description: loc.description,
        location: tr(language, `${food.categoryKh} • កម្ពុជា`, `${food.categoryEn} • Cambodia`, `${loc.category} • 柬埔寨`),
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
      style={{ contentVisibility: 'auto', containIntrinsicSize: '360px' }}
      className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/90 dark:border-slate-700/80 transition-colors duration-150 cursor-pointer flex flex-col"
    >
      {/* Image container */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
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
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <div className="mb-1.5">
            <h3 className="font-bold text-base text-[#0F172A] dark:text-white group-hover:text-[#059669] transition line-clamp-1">
              {loc.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              {language === 'km' ? food.nameEn : language === 'en' ? food.nameKh : `${food.nameKh} · ${food.nameEn}`}
            </p>
          </div>
          {loc.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-2.5 leading-relaxed">
              {loc.description}
            </p>
          )}
          {/* Up to 3 recipe-derived tags (estimated from the recipe, no health claims) */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5" title={tr(language, 'ប៉ាន់ស្មានពីរូបមន្ត', 'Estimated from the recipe', '根据食谱估算')}>
              {tags.map((tg) => (
                <span
                  key={tg.id}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    tg.tone === 'green'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : tg.tone === 'blue'
                      ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                      : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                  }`}
                >
                  {tg.emoji} {tagLabel(tg, language)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200 font-semibold">
              <Star className="w-4 h-4 fill-current text-amber-500" />
              <span>{food.rating ?? 4.8}</span>
              <span className="text-slate-400 text-[11px]">({food.reviewCount ?? 0})</span>
            </div>
            {typeof food.calories === 'number' && food.calories > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                <Flame className="w-3.5 h-3.5" />
                {food.calories} kcal
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <PassportStampButton foodId={food.id} language={language} showToast={showToast} />
            <button
              type="button"
              onClick={handleShareFood}
              className="min-w-[44px] min-h-[36px] px-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 transition flex items-center justify-center gap-1 text-xs font-semibold"
              title={tr(language, 'ចែករំលែកមុខម្ហូប', 'Share dish', '分享菜品')}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{tr(language, 'ចែក', 'Share', '分享')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FoodCard = React.memo(FoodCardInner);

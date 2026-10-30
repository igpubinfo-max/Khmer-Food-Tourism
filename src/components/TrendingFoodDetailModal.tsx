import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, MapPin, Phone, Share2, ExternalLink,
  Calendar, Sparkles, Navigation, Bookmark, MessageSquareQuote, Play, Utensils, ChefHat
} from 'lucide-react';
import { shareRichContent } from '../utils/androidMediaHelper';
import { tr, translateProvince } from '../utils/i18n';
import { translateDynamicTextToZh, sanitizeStrictLanguageText } from '../utils/zhDynamicTranslator';
import { extractYouTubeVideoId, isKnownUnavailableVideo } from '../services/onlineFoodDiscoveryService';

export const TrendingFoodDetailModal: React.FC = () => {
  const { 
    selectedTrendingFood, 
    setSelectedTrendingFood, 
    isTrendingFoodDetailModalOpen, 
    setIsTrendingFoodDetailModalOpen,
    foods,
    setSelectedFood,
    setActiveTab,
    language,
    showToast,
    openAddToWishlist
  } = useApp();

  const isKm = language === 'km';

  const matchedFood = useMemo(() => {
    if (!selectedTrendingFood || !Array.isArray(foods) || foods.length === 0) return null;
    if (selectedTrendingFood.matchedFoodId) {
      const byExplicitId = foods.find((f) => f && f.id === selectedTrendingFood.matchedFoodId);
      if (byExplicitId) return byExplicitId;
    }
    if (Array.isArray(selectedTrendingFood.fallbackFoodIds)) {
      for (const fid of selectedTrendingFood.fallbackFoodIds) {
        const found = foods.find((f) => f && f.id === fid);
        if (found) return found;
      }
    }
    const pUrl = selectedTrendingFood.photoUrl || '';
    const idMatch = pUrl.match(/\/foods\/(food-\d+)\./i);
    if (idMatch?.[1]) {
      const byId = foods.find((f) => f && f.id === idMatch[1]);
      if (byId) return byId;
    }
    if (pUrl) {
      const byPhoto = foods.find((f) => f && f.photoUrl === pUrl);
      if (byPhoto) return byPhoto;
    }
    const kh = (selectedTrendingFood.foodNameKh || '').trim();
    const en = (selectedTrendingFood.foodNameEn || '').trim().toLowerCase();
    return (
      foods.find(
        (f) =>
          f &&
          ((kh && f.nameKh && (f.nameKh.includes(kh) || kh.includes(f.nameKh))) ||
            (en && f.nameEn && (f.nameEn.toLowerCase().includes(en) || en.includes(f.nameEn.toLowerCase()))))
      ) || null
    );
  }, [selectedTrendingFood, foods]);

  if (!isTrendingFoodDetailModalOpen || !selectedTrendingFood) return null;

  const item = selectedTrendingFood;
  const safeFoodKh = item.foodNameKh || item.foodNameEn || 'ម្ហូបខ្មែរ';
  const safeFoodEn = item.foodNameEn || item.foodNameKh || 'Khmer Food';
  const safeCatKh = item.categoryKh || 'មុខម្ហូបពេញនិយម';
  const safeCatEn = item.categoryEn || 'Trending Food';
  const safeDescKh = item.descriptionKh || item.descriptionEn || '';
  const safeDescEn = item.descriptionEn || item.descriptionKh || '';
  const safeRestKh = item.restaurantNameKh || item.restaurantNameEn || '';
  const safeRestEn = item.restaurantNameEn || item.restaurantNameKh || '';
  const safeAddrKh = item.addressKh || item.provinceKh || '';
  const safeAddrEn = item.addressEn || item.provinceEn || '';

  const rawFoodName =
    language === 'km'
      ? safeFoodKh
      : language === 'zh'
      ? translateDynamicTextToZh(safeFoodEn) || safeFoodEn
      : safeFoodEn;
  const displayFoodName = sanitizeStrictLanguageText(rawFoodName, language) || safeFoodKh;

  const rawCat =
    language === 'km'
      ? safeCatKh
      : language === 'zh'
      ? translateDynamicTextToZh(safeCatEn) || safeCatEn
      : safeCatEn;
  const displayCat = sanitizeStrictLanguageText(rawCat, language) || safeCatKh;

  const displayProv = translateProvince(item.provinceKh || item.provinceEn || 'កម្ពុជា', language);

  const rawDesc =
    language === 'km'
      ? safeDescKh
      : language === 'zh'
      ? translateDynamicTextToZh(safeDescEn) || safeDescEn
      : safeDescEn;
  const displayDesc = sanitizeStrictLanguageText(rawDesc, language) || safeDescKh;

  const displayRestName = sanitizeStrictLanguageText(
    language === 'km'
      ? safeRestKh
      : language === 'zh'
      ? translateDynamicTextToZh(safeRestEn) || safeRestEn
      : safeRestEn,
    language
  ) || safeRestKh;

  const displayAddress = sanitizeStrictLanguageText(
    language === 'km'
      ? safeAddrKh
      : language === 'zh'
      ? translateDynamicTextToZh(safeAddrEn) || safeAddrEn
      : safeAddrEn,
    language
  ) || safeAddrKh;

  const vid = extractYouTubeVideoId(item.videoUrl || item.sourceUrl || '');
  const youtubeWatchUrl =
    vid && !isKnownUnavailableVideo(vid)
      ? `https://www.youtube.com/watch?v=${vid}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(
          `${safeFoodEn} ${item.provinceEn || 'Cambodia'} Khmer food`
        )}`;

  const handleClose = () => {
    setIsTrendingFoodDetailModalOpen(false);
    setSelectedTrendingFood(null);
  };

  const handleOpenFullRecipe = () => {
    if (!matchedFood) return;
    setIsTrendingFoodDetailModalOpen(false);
    setSelectedTrendingFood(null);
    setSelectedFood(matchedFood);
  };

  const handleBrowseFoodCategory = () => {
    handleClose();
    setActiveTab('food');
  };

  const handleCall = () => {
    if (item.phone) {
      window.open(`tel:${item.phone}`, '_self');
    } else {
      showToast(tr(language, 'មិនមានលេខទូរស័ព្ទសម្រាប់ហាងនេះទេ', 'No phone number available', '该店铺暂无联系电话'), 'info');
    }
  };

  const handleOpenMap = () => {
    if (item.mapUrl) {
      window.open(item.mapUrl, '_blank', 'noopener,noreferrer');
    } else if (item.latitude && item.longitude) {
      window.open(`https://maps.google.com/?q=${item.latitude},${item.longitude}`, '_blank', 'noopener,noreferrer');
    } else {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(safeRestKh + ' ' + (item.provinceKh || 'Cambodia'))}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = () => {
    const mapLink =
      item.mapUrl ||
      (item.latitude && item.longitude
        ? `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
        : undefined);
    shareRichContent(
      {
        title: isKm
          ? `${safeFoodKh} — ${safeRestKh}`
          : `${safeFoodEn} — ${safeRestEn}`,
        nameKh: `${safeFoodKh} (${safeRestKh})`,
        nameEn: `${safeFoodEn} (${safeRestEn})`,
        description: isKm ? safeDescKh : safeDescEn,
        location: isKm
          ? `${safeAddrKh} (${item.provinceKh || ''})`
          : `${safeAddrEn} (${item.provinceEn || ''})`,
        phone: item.phone,
        photoUrl: item.photoUrl,
        mapUrl: mapLink,
        itemType: 'trending',
        itemId: item.id,
        isKm,
      },
      showToast
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero Photo Banner */}
        <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-950 shrink-0">
          <img 
            src={
              (() => {
                const rawUrl =
                  matchedFood?.photoUrl &&
                  (matchedFood.isCustomPhoto ||
                    matchedFood.photoUrl.startsWith('data:') ||
                    matchedFood.photoUrl.startsWith('http'))
                    ? matchedFood.photoUrl
                    : item.photoUrl || matchedFood?.photoUrl || '/welcome/hero-bg.webp';
                return rawUrl.startsWith('/foods/') && !rawUrl.includes('?')
                  ? `${rawUrl}?v=20261029v3`
                  : rawUrl;
              })()
            } 
            alt={displayFoodName}
            decoding="async"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/welcome/hero-bg.webp';
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label={tr(language, 'បិទ', 'Close', '关闭')}
            className="absolute top-3 right-3 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition backdrop-blur-xs cursor-pointer z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* YouTube Trending Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-xl bg-red-600 text-white text-[11px] font-bold shadow-md flex items-center gap-1">
              <Play className="w-3 h-3 fill-current" />
              <span>{tr(language, 'វីដេអូពេញនិយម', 'Featured Video', '热门视频')}</span>
            </span>
            {item.socialViews && (
              <span className="px-2 py-0.5 rounded-lg bg-black/60 text-pink-200 text-[10px] font-bold backdrop-blur-xs">
                👁️ {item.socialViews}
              </span>
            )}
            {item.socialLikes && (
              <span className="px-2 py-0.5 rounded-lg bg-black/60 text-rose-300 text-[10px] font-bold backdrop-blur-xs">
                ❤️ {item.socialLikes}
              </span>
            )}
          </div>

          {/* Location / Village Scenery Label */}
          <span className="absolute bottom-2.5 right-3 z-10 bg-black/55 backdrop-blur-xs text-white/85 text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded font-khmer border border-white/15 select-none pointer-events-none shadow-2xs">
            {tr(language, 'រូបភាពយោង', 'Reference photo', '参考图片')}
          </span>

          {/* Title overlay */}
          <div className="absolute bottom-3 left-3 right-24 font-khmer">
            <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold">
              {displayCat}
            </span>
            <h3 className="font-moul text-base sm:text-lg text-white drop-shadow mt-1 leading-snug">
              {displayFoodName}
            </h3>
            <p className="text-xs text-emerald-200 font-bold truncate">
              🏪 {displayRestName}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-khmer text-xs sm:text-sm">
          {/* Quick Recipe & Category Navigation Actions */}
          <div className="grid grid-cols-1 gap-2">
            {matchedFood && (
              <button
                type="button"
                onClick={handleOpenFullRecipe}
                className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#064E3B] via-emerald-700 to-teal-700 hover:brightness-105 text-white font-bold flex items-center justify-between shadow-sm transition active:scale-[0.98] cursor-pointer"
              >
                <span className="flex items-center gap-2 text-left">
                  <ChefHat className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    {tr(
                      language,
                      'មើលរូបមន្តចម្អិន និងគ្រឿងផ្សំលម្អិត',
                      'View Full Cooking Recipe & Ingredients',
                      '查看完整烹饪食谱与配料'
                    )}
                  </span>
                </span>
                <Utensils className="w-4 h-4 text-amber-300 shrink-0" />
              </button>
            )}
            <button
              type="button"
              onClick={handleBrowseFoodCategory}
              className="w-full py-2 px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-[#064E3B] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 font-bold flex items-center justify-between transition active:scale-[0.98] cursor-pointer text-xs"
            >
              <span className="flex items-center gap-2">
                <Utensils className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {tr(
                    language,
                    'មើលមុខម្ហូបខ្មែរទាំងអស់ក្នុងផ្ទាំងម្ហូប',
                    'Browse All Khmer Dishes in Food Tab',
                    '在美食页浏览全部高棉菜品'
                  )}
                </span>
              </span>
              <span className="text-[11px] font-extrabold">→</span>
            </button>
          </div>

          {/* Reviewer Highlight Quote */}
          {item.reviewerQuoteKh && (
            <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5">
              <MessageSquareQuote className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-800 dark:text-rose-100 italic leading-relaxed text-xs sm:text-sm">
                  "{language === 'km' ? item.reviewerQuoteKh : language === 'zh' ? translateDynamicTextToZh(item.reviewerQuoteEn || item.reviewerQuoteKh) : (item.reviewerQuoteEn || item.reviewerQuoteKh)}"
                </p>
                {item.reviewerName && (
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold block mt-1">
                    — {item.reviewerName}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>{tr(language, 'អំពីមុខម្ហូបនេះ', 'About This Dish', '菜品介绍')}</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
              {displayDesc}
            </p>
          </div>

          {/* Info Card: Location, Price, Last Updated */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  {displayProv}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {displayAddress}
                </span>
              </div>
            </div>

            {item.lastUpdated && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{tr(language, 'កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាព៖', 'Last Updated:', '更新时间：')}</span>
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {item.lastUpdated}
                </span>
              </div>
            )}
          </div>

          {/* Watch on YouTube Button */}
          <a
            href={youtubeWatchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-between transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 fill-current text-white" />
              <span className="font-bold">
                {tr(language, 'មើលវីដេអូលើ YouTube', 'Watch on YouTube', '在 YouTube 上观看视频')}
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-white/90" />
          </a>
        </div>

        {/* Action Footer: 4 Action Buttons */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 grid grid-cols-4 gap-2 font-khmer text-xs shrink-0">
          {/* 1. Map */}
          <button
            type="button"
            onClick={handleOpenMap}
            className="py-2.5 px-1 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl shadow-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer"
          >
            <Navigation className="w-4 h-4 text-emerald-300" />
            <span className="text-[10px]">{tr(language, 'នាំផ្លូវ', 'Map', '地图导航')}</span>
          </button>

          {/* 2. Call */}
          <button
            type="button"
            onClick={handleCall}
            className={`py-2.5 px-1 rounded-xl shadow-xs font-bold flex flex-col items-center justify-center gap-1 transition ${
              item.phone 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' 
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span className="text-[10px]">{tr(language, 'ទូរស័ព្ទ', 'Call', '拨打电话')}</span>
          </button>

          {/* 3. Share */}
          <button
            type="button"
            onClick={handleShare}
            className="py-2.5 px-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-[10px]">{tr(language, 'ចែករំលែក', 'Share', '分享')}</span>
          </button>

          {/* 4. Save / Wishlist */}
          <button
            type="button"
            onClick={() => {
              openAddToWishlist({
                id: item.id,
                type: 'food',
                nameKh: safeFoodKh,
                nameEn: safeFoodEn,
                photoUrl: item.photoUrl || '/welcome/hero-bg.webp',
                categoryKh: safeCatKh,
                provinceKh: item.provinceKh || 'កម្ពុជា',
              });
            }}
            className="py-2.5 px-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer"
          >
            <Bookmark className="w-4 h-4 fill-white text-white" />
            <span className="text-[10px]">{tr(language, 'រក្សាទុក', 'Save', '收藏')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

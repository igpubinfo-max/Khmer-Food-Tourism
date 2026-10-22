import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, MapPin, Phone, Share2, ExternalLink, Flame, 
  Calendar, Heart, Sparkles, Navigation, Bookmark, MessageSquareQuote 
} from 'lucide-react';
import { shareRichContent } from '../utils/androidMediaHelper';

export const TrendingFoodDetailModal: React.FC = () => {
  const { 
    selectedTrendingFood, 
    setSelectedTrendingFood, 
    isTrendingFoodDetailModalOpen, 
    setIsTrendingFoodDetailModalOpen,
    language,
    showToast,
    openAddToWishlist
  } = useApp();

  const isKm = language === 'km';

  if (!isTrendingFoodDetailModalOpen || !selectedTrendingFood) return null;

  const item = selectedTrendingFood;

  const handleClose = () => {
    setIsTrendingFoodDetailModalOpen(false);
    setSelectedTrendingFood(null);
  };

  const handleCall = () => {
    if (item.phone) {
      window.open(`tel:${item.phone}`, '_self');
    } else {
      showToast(isKm ? 'មិនមានលេខទូរស័ព្ទសម្រាប់ហាងនេះទេ' : 'No phone number available', 'info');
    }
  };

  const handleOpenMap = () => {
    if (item.mapUrl) {
      window.open(item.mapUrl, '_blank');
    } else if (item.latitude && item.longitude) {
      window.open(`https://maps.google.com/?q=${item.latitude},${item.longitude}`, '_blank');
    } else {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(item.restaurantNameKh + ' ' + item.provinceKh)}`, '_blank');
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
          ? `${item.foodNameKh} — ${item.restaurantNameKh}`
          : `${item.foodNameEn} — ${item.restaurantNameEn}`,
        nameKh: `${item.foodNameKh} (${item.restaurantNameKh})`,
        nameEn: `${item.foodNameEn} (${item.restaurantNameEn})`,
        description: isKm ? item.descriptionKh : item.descriptionEn,
        location: isKm
          ? `${item.addressKh} (${item.provinceKh})`
          : `${item.addressEn} (${item.provinceEn})`,
        phone: item.phone,
        priceDisplay: item.priceDisplay,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Hero Photo Banner */}
        <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-950 shrink-0">
          <img 
            src={item.photoUrl} 
            alt={item.foodNameKh}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition backdrop-blur-xs"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Social views & Platform Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[11px] font-bold shadow-md flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{item.sourcePlatform === 'tiktok' ? 'TikTok Viral' : 'Facebook Trending'}</span>
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
          <span className="absolute bottom-2 right-3 bg-black/70 text-white/90 text-[8px] px-2 py-0.5 rounded-sm font-khmer shadow-sm">
            {isKm ? 'រូបភាពទីតាំង / ភូមិដ្ឋាន' : 'Location / Village Scenery'}
          </span>

          {/* Title overlay */}
          <div className="absolute bottom-3 left-3 right-16 font-khmer">
            <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[9px] font-bold">
              {isKm ? item.categoryKh : item.categoryEn}
            </span>
            <h3 className="font-moul text-base sm:text-lg text-white drop-shadow mt-1 leading-snug">
              {isKm ? item.foodNameKh : item.foodNameEn}
            </h3>
            <p className="text-xs text-emerald-200 font-bold truncate">
              🏪 {isKm ? item.restaurantNameKh : item.restaurantNameEn}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-khmer text-xs">
          {/* Reviewer Highlight Quote */}
          {item.reviewerQuoteKh && (
            <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5">
              <MessageSquareQuote className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-800 dark:text-rose-100 italic leading-relaxed text-xs">
                  "{isKm ? item.reviewerQuoteKh : (item.reviewerQuoteEn || item.reviewerQuoteKh)}"
                </p>
                {item.reviewerName && (
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-1">
                    — {item.reviewerName}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>{isKm ? 'ការពិពណ៌នាអំពីមុខម្ហូប' : 'Food Description'}</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
              {isKm ? item.descriptionKh : item.descriptionEn}
            </p>
          </div>

          {/* Info Card: Location, Price, Last Updated */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  {isKm ? item.provinceKh : item.provinceEn}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isKm ? item.addressKh : item.addressEn}
                </span>
              </div>
            </div>

            {item.priceDisplay && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400">
                  {isKm ? 'តម្លៃប្រហាក់ប្រហែល៖' : 'Estimated Price:'}
                </span>
                <span className="font-bold text-[#064E3B] dark:text-emerald-400 font-mono">
                  {item.priceDisplay}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/60">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{isKm ? 'កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាព៖' : 'Last Updated:'}</span>
              </span>
              <span className="font-mono text-slate-600 dark:text-slate-300">
                {item.lastUpdated}
              </span>
            </div>
          </div>

          {/* Source Link if Available */}
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-between transition border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <span className="font-bold">
                  {isKm ? 'មើលវីដេអូ ឬការ Review ដើមលើបណ្តាញសង្គម' : 'View Original Social Review'}
                </span>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>
          )}
        </div>

        {/* Action Footer: 4 Action Buttons */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 grid grid-cols-4 gap-2 font-khmer text-xs shrink-0">
          {/* 1. Map */}
          <button
            onClick={handleOpenMap}
            className="py-2.5 px-1 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl shadow-xs font-bold flex flex-col items-center justify-center gap-1 transition"
          >
            <Navigation className="w-4 h-4 text-emerald-300" />
            <span className="text-[10px]">{isKm ? 'នាំផ្លូវ' : 'Map'}</span>
          </button>

          {/* 2. Call */}
          <button
            onClick={handleCall}
            className={`py-2.5 px-1 rounded-xl shadow-xs font-bold flex flex-col items-center justify-center gap-1 transition ${
              item.phone 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span className="text-[10px]">{isKm ? 'ទូរស័ព្ទ' : 'Call'}</span>
          </button>

          {/* 3. Share */}
          <button
            onClick={handleShare}
            className="py-2.5 px-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 font-bold flex flex-col items-center justify-center gap-1 transition"
          >
            <Share2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-[10px]">{isKm ? 'ចែករំលែក' : 'Share'}</span>
          </button>

          {/* 4. Save / Wishlist */}
          <button
            onClick={() => {
              openAddToWishlist({
                id: item.id,
                type: 'food',
                nameKh: item.foodNameKh,
                nameEn: item.foodNameEn,
                photoUrl: item.photoUrl,
                categoryKh: item.categoryKh,
                provinceKh: item.provinceKh,
                priceDisplay: item.priceDisplay,
              });
            }}
            className="py-2.5 px-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs font-bold flex flex-col items-center justify-center gap-1 transition"
          >
            <Bookmark className="w-4 h-4 fill-white text-white" />
            <span className="text-[10px]">{isKm ? 'រក្សាទុក' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

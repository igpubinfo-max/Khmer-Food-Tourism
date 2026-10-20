import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, MapPin, Phone, Star, Clock, ExternalLink, 
  Send, Share2, UtensilsCrossed, Sparkles
} from 'lucide-react';

export const RestaurantDetailModal: React.FC = () => {
  const { selectedRestaurant, setSelectedRestaurant, language, showToast } = useApp();

  if (!selectedRestaurant) return null;

  const handleShareTelegram = () => {
    const text = encodeURIComponent(`សូមណែនាំហាងអាហារឆ្ងាញ់៖ ${selectedRestaurant.nameKh} (${selectedRestaurant.nameEn})\n📍 ${selectedRestaurant.addressKh}\n📞 ${selectedRestaurant.phone}`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${selectedRestaurant.nameKh} - ${selectedRestaurant.mapUrl}`);
    showToast(language === 'km' ? 'បានចម្លងព័ត៌មានហាង!' : 'Restaurant info copied!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-stone-900 w-full max-w-lg h-[90vh] sm:h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Controls */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          <button
            onClick={() => setSelectedRestaurant(null)}
            className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white shadow pointer-events-auto transition active:scale-90"
            title="បិទ"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 pointer-events-auto">
            <a
              href={`tel:${selectedRestaurant.phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{language === 'km' ? 'ហៅទូរស័ព្ទ' : 'Call'}</span>
            </a>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 no-scrollbar pb-6">
          {/* Hero Image */}
          <div className="relative h-60 sm:h-64 w-full bg-stone-800">
            <img 
              src={selectedRestaurant.photoUrl} 
              alt={selectedRestaurant.nameKh}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-amber-950 shadow">
                  {language === 'km' ? selectedRestaurant.provinceKh : selectedRestaurant.provinceEn}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-black/60 text-amber-300 text-[10px] font-bold">
                  {selectedRestaurant.priceLevel}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-moul leading-snug drop-shadow">
                {language === 'km' ? selectedRestaurant.nameKh : selectedRestaurant.nameEn}
              </h2>
              <p className="text-xs text-amber-200/90 font-medium">
                {language === 'km' ? selectedRestaurant.nameEn : selectedRestaurant.nameKh}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* Quick action bar */}
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={selectedRestaurant.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition active:scale-95"
              >
                <MapPin className="w-4 h-4" />
                <span>{language === 'km' ? 'នាំផ្លូវលើ Maps' : 'Google Maps'}</span>
                <ExternalLink className="w-3 h-3 opacity-75" />
              </a>

              <a
                href={`tel:${selectedRestaurant.phone}`}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>{selectedRestaurant.phone}</span>
              </a>
            </div>

            {/* Address & Hours */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700 space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-200">
                    {language === 'km' ? 'អាសយដ្ឋាន' : 'Address'}
                  </p>
                  <p className="text-stone-600 dark:text-stone-400">
                    {language === 'km' ? selectedRestaurant.addressKh : selectedRestaurant.addressEn}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2 border-t border-stone-200 dark:border-stone-700">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-200">
                    {language === 'km' ? 'ម៉ោងបើកដំណើរការ' : 'Opening Hours'}
                  </p>
                  <p className="text-stone-600 dark:text-stone-400">
                    {language === 'km' ? selectedRestaurant.openingHoursKh : selectedRestaurant.openingHoursEn}
                  </p>
                </div>
              </div>
            </div>

            {/* Signature Dishes */}
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-2 flex items-center gap-1.5">
                <UtensilsCrossed className="w-4 h-4 text-amber-600" />
                {language === 'km' ? 'មុខម្ហូបប្រចាំហាង (Signature Dishes)' : 'Signature Menus'}
              </h3>
              
              <div className="grid grid-cols-1 gap-2">
                {selectedRestaurant.signatureDishesKh.map((dish, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50/70 dark:bg-stone-800 border border-amber-200/50 dark:border-stone-700 text-xs text-amber-950 dark:text-amber-200"
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-medium">{dish}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {language === 'km' ? 'អំពីភោជនីយដ្ឋាន' : 'About the Restaurant'}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50/70 dark:bg-stone-800/40 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800">
                {language === 'km' ? selectedRestaurant.descriptionKh : selectedRestaurant.descriptionEn}
              </p>
            </div>

            {/* Social Share Bar */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-700">
              <p className="text-xs font-semibold text-stone-500 mb-2.5 text-center">
                {language === 'km' ? 'ចែករំលែកទីតាំងហាងនេះ' : 'Share this restaurant'}
              </p>
              
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleShareTelegram}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#229ED9] text-white text-xs font-bold shadow hover:brightness-105"
                >
                  <Send className="w-3.5 h-3.5" />
                  Telegram
                </button>

                <button
                  onClick={handleShareFacebook}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1877F2] text-white text-xs font-bold shadow hover:brightness-105"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Facebook
                </button>

                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-medium border border-stone-300 dark:border-stone-600"
                >
                  {language === 'km' ? 'ចម្លង' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

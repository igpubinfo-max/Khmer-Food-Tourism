import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, MapPin, Phone, Star, Clock, ExternalLink, 
  Send, Share2, UtensilsCrossed, Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react';
import { isRestaurantPremiumActive } from '../types';

export const RestaurantDetailModal: React.FC = () => {
  const { 
    selectedRestaurant, 
    setSelectedRestaurant, 
    language, 
    showToast,
    currentUser,
    setManagingRestaurant,
    setIsManageMenuModalOpen
  } = useApp();

  if (!selectedRestaurant) return null;

  const isKm = language === 'km';
  const isPremiumActive = isRestaurantPremiumActive(selectedRestaurant);
  const isOwner = currentUser?.id && selectedRestaurant.ownerId === currentUser.id;

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
    showToast(isKm ? 'បានចម្លងព័ត៌មានហាង!' : 'Restaurant info copied!', 'success');
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
              <span>{isKm ? 'ហៅទូរស័ព្ទ' : 'Call'}</span>
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0B3D2E]/85 text-[#A7DCA5] border border-[#228B4E]/30 shadow font-khmer">
                  {isKm ? selectedRestaurant.provinceKh : selectedRestaurant.provinceEn}
                </span>

                {isPremiumActive ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#14532D] to-[#228B4E] text-[#A7DCA5] border border-[#A7DCA5]/40 shadow flex items-center gap-1 font-khmer">
                    <Sparkles className="w-3 h-3 text-[#A7DCA5]" />
                    <span>⭐ {isKm ? 'សមាជិកភាព VIP Premium' : 'Premium Member'}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0B3D2E]/80 text-[#EAF6EC] border border-[#228B4E]/30 shadow font-khmer">
                    🏷️ {isKm ? 'ចុះបញ្ជីឥតគិតថ្លៃ ($0)' : 'Free Listing ($0)'}
                  </span>
                )}

                <span className="px-2 py-0.5 rounded-md bg-[#0B3D2E]/80 text-[#A7DCA5] text-[10px] font-bold border border-[#228B4E]/30">
                  {selectedRestaurant.priceLevel}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold font-moul leading-snug drop-shadow text-white">
                {isKm ? selectedRestaurant.nameKh : selectedRestaurant.nameEn}
              </h2>
              <p className="text-xs text-[#A7DCA5] font-medium">
                {isKm ? selectedRestaurant.nameEn : selectedRestaurant.nameKh}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* Owner Management Control Bar */}
            {isOwner && (
              <div className="p-3.5 bg-[#EAF6EC] dark:bg-[#0B3D2E]/60 rounded-2xl border-2 border-[#A7DCA5] flex items-center justify-between font-khmer">
                <div>
                  <div className="font-bold text-xs text-[#14532D] dark:text-[#A7DCA5] flex items-center gap-1.5">
                    <span>👑</span>
                    <span>{isKm ? 'លោកអ្នកជាម្ចាស់ហាងនេះ' : 'You are the owner of this restaurant'}</span>
                  </div>
                  <div className="text-[10px] text-[#183326]/70 dark:text-stone-300">
                    {isKm 
                      ? `មុខម្ហូបក្នុងហាង៖ ${(selectedRestaurant.menuItems || []).length}/5 មុខ (អតិបរមា ៥ មុខ)` 
                      : `Menu items: ${(selectedRestaurant.menuItems || []).length}/5 (Max 5)`}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setManagingRestaurant(selectedRestaurant);
                    setIsManageMenuModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#14532D] hover:bg-[#0B3D2E] text-white font-bold text-xs shadow flex items-center gap-1.5 transition active:scale-95"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#A7DCA5]" />
                  <span>{isKm ? 'គ្រប់គ្រងមុខម្ហូប' : 'Manage Menu'}</span>
                </button>
              </div>
            )}

            {/* Quick action bar */}
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={selectedRestaurant.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition active:scale-95 font-khmer"
              >
                <MapPin className="w-4 h-4" />
                <span>{isKm ? 'នាំផ្លូវលើ Maps' : 'Google Maps'}</span>
                <ExternalLink className="w-3 h-3 opacity-75" />
              </a>

              <a
                href={`tel:${selectedRestaurant.phone}`}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#228B4E] hover:bg-[#14532D] text-white text-xs font-bold shadow transition active:scale-95 font-mono"
              >
                <Phone className="w-4 h-4" />
                <span>{selectedRestaurant.phone}</span>
              </a>
            </div>

            {/* Address & Hours */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-800/80 border border-[#A7DCA5]/40 dark:border-stone-700 space-y-2.5 text-xs font-khmer">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#228B4E] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#183326] dark:text-stone-200">
                    {isKm ? 'អាសយដ្ឋាន' : 'Address'}
                  </p>
                  <p className="text-stone-600 dark:text-stone-400">
                    {isKm ? selectedRestaurant.addressKh : selectedRestaurant.addressEn}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2 border-t border-[#A7DCA5]/30 dark:border-stone-700">
                <Clock className="w-4 h-4 text-[#228B4E] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#183326] dark:text-stone-200">
                    {isKm ? 'ម៉ោងបើកដំណើរការ' : 'Opening Hours'}
                  </p>
                  <p className="text-stone-600 dark:text-stone-400">
                    {isKm ? selectedRestaurant.openingHoursKh : selectedRestaurant.openingHoursEn}
                  </p>
                </div>
              </div>
            </div>

            {/* Restaurant Food Menu Items (Up to 5 items added by Premium owner) */}
            {selectedRestaurant.menuItems && selectedRestaurant.menuItems.length > 0 ? (
              <div className="space-y-3 font-khmer">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#183326] dark:text-stone-100 text-sm flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-[#228B4E]" />
                    <span>
                      {isKm 
                        ? `មុខម្ហូបពិសេសក្នុងហាង (${selectedRestaurant.menuItems.length} មុខ)` 
                        : `Restaurant Food Menu (${selectedRestaurant.menuItems.length})`}
                    </span>
                  </h3>
                  {isOwner && (
                    <button
                      onClick={() => {
                        setManagingRestaurant(selectedRestaurant);
                        setIsManageMenuModalOpen(true);
                      }}
                      className="text-[#14532D] dark:text-[#A7DCA5] font-bold text-xs hover:underline"
                    >
                      {isKm ? '+ កែប្រែ / បន្ថែម' : '+ Edit / Add'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {selectedRestaurant.menuItems.map((item, i) => (
                    <div 
                      key={item.id || i}
                      className="p-3 rounded-2xl bg-white dark:bg-stone-800 border border-[#A7DCA5]/50 dark:border-stone-700 shadow-xs flex items-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-[#A7DCA5]/30 dark:border-stone-700">
                        <img src={item.photoUrl} alt={item.nameKh} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-[#183326] dark:text-stone-100 text-xs truncate">
                            {item.nameKh}
                          </h4>
                          <span className="text-[#14532D] font-bold font-mono text-xs ml-2">${item.priceUsd.toFixed(2)}</span>
                        </div>
                        {item.nameEn && (
                          <p className="text-[10px] text-stone-500 truncate">{item.nameEn}</p>
                        )}
                        <p className="text-[10px] text-[#228B4E] font-mono">({item.priceRiel.toLocaleString()} ៛)</p>
                        {item.descriptionKh && (
                          <p className="text-[10px] text-stone-600 dark:text-stone-300 line-clamp-1 mt-0.5">
                            {item.descriptionKh}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Fallback Signature Dishes */
              <div className="font-khmer">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-[#183326] dark:text-stone-100 text-sm flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-[#228B4E]" />
                    <span>{isKm ? 'មុខម្ហូបប្រចាំហាង (Signature Dishes)' : 'Signature Menus'}</span>
                  </h3>
                  {isOwner && (
                    <button
                      onClick={() => {
                        setManagingRestaurant(selectedRestaurant);
                        setIsManageMenuModalOpen(true);
                      }}
                      className="text-[#14532D] dark:text-[#A7DCA5] font-bold text-xs hover:underline"
                    >
                      {isKm ? '+ គ្រប់គ្រងមុខម្ហូប' : '+ Manage Menu'}
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {selectedRestaurant.signatureDishesKh.map((dish, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#EAF6EC] dark:bg-stone-800 border border-[#A7DCA5]/50 dark:border-stone-700 text-xs text-[#14532D] dark:text-[#A7DCA5]"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#14532D] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-medium">{dish}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="font-khmer">
              <h3 className="font-bold text-[#183326] dark:text-stone-100 text-sm mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#228B4E]" />
                <span>{isKm ? 'អំពីភោជនីយដ្ឋាន' : 'About the Restaurant'}</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50/70 dark:bg-stone-800/40 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800">
                {isKm ? selectedRestaurant.descriptionKh : selectedRestaurant.descriptionEn}
              </p>
            </div>

            {/* Social Share Bar */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-700 font-khmer">
              <p className="text-xs font-semibold text-stone-500 mb-2.5 text-center">
                {isKm ? 'ចែករំលែកទីតាំងហាងនេះ' : 'Share this restaurant'}
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
                  {isKm ? 'ចម្លង' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

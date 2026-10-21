import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, MapPin, Phone, Star, Clock, ExternalLink, 
  Send, Share2, UtensilsCrossed, Sparkles, CheckCircle2, AlertCircle, Copy, Camera
} from 'lucide-react';
import { isRestaurantPremiumActive } from '../types';
import { RestaurantImageModal } from './RestaurantImageModal';

export const RestaurantDetailModal: React.FC = () => {
  const { 
    selectedRestaurant, 
    setSelectedRestaurant, 
    language, 
    showToast,
    currentUser,
    setManagingRestaurant,
    setIsManageMenuModalOpen,
    trackRestaurantView,
    trackRestaurantCall,
    trackRestaurantMap,
    trackRestaurantShare,
    updateRestaurant
  } = useApp();

  const [activePhoto, setActivePhoto] = useState<string>('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    if (selectedRestaurant) {
      setActivePhoto(selectedRestaurant.photoUrl);
      trackRestaurantView(selectedRestaurant.id);
    }
  }, [selectedRestaurant?.id]);

  if (!selectedRestaurant) return null;

  const isKm = language === 'km';
  const isPremiumActive = isRestaurantPremiumActive(selectedRestaurant);
  const isOwner = currentUser?.id && selectedRestaurant.ownerId === currentUser.id;

  const allPhotos = [
    selectedRestaurant.photoUrl,
    ...(selectedRestaurant.galleryPhotos || [])
  ].filter((url, index, self) => url && self.indexOf(url) === index);

  const handleShare = () => {
    trackRestaurantShare(selectedRestaurant.id);
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://khmerfoodtourism.com';
    const shareUrl = `${origin}/?restaurant=${selectedRestaurant.id}`;
    if (navigator.share) {
      navigator.share({
        title: isKm ? selectedRestaurant.nameKh : selectedRestaurant.nameEn,
        text: isKm 
          ? `សូមណែនាំហាងអាហារឆ្ងាញ់៖ ${selectedRestaurant.nameKh} 📍 ${selectedRestaurant.addressKh} 📞 ${selectedRestaurant.phone}`
          : `Check out ${selectedRestaurant.nameEn}!`,
        url: shareUrl,
      }).catch(() => {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast(isKm ? 'បានចម្លងតំណភ្ជាប់ហាងជោគជ័យ!' : 'Restaurant link copied to clipboard!', 'success');
      }).catch(() => {});
    } else {
      showToast(isKm ? 'បានចម្លងតំណភ្ជាប់ហាងជោគជ័យ!' : 'Restaurant link copied to clipboard!', 'success');
    }
  };

  const handleShareTelegram = () => {
    trackRestaurantShare(selectedRestaurant.id);
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://khmerfoodtourism.com';
    const shareUrl = `${origin}/?restaurant=${selectedRestaurant.id}`;
    const text = encodeURIComponent(
      isKm
        ? `សូមណែនាំហាងអាហារឆ្ងាញ់៖ ${selectedRestaurant.nameKh}\n📍 ${selectedRestaurant.addressKh}\n📞 ${selectedRestaurant.phone}`
        : `Check out ${selectedRestaurant.nameEn}!\n📍 ${selectedRestaurant.addressEn}\n📞 ${selectedRestaurant.phone}`
    );
    const encUrl = encodeURIComponent(shareUrl);
    window.open(`https://t.me/share/url?url=${encUrl}&text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    trackRestaurantShare(selectedRestaurant.id);
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://khmerfoodtourism.com';
    const shareUrl = `${origin}/?restaurant=${selectedRestaurant.id}`;
    const encUrl = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encUrl}`, '_blank');
  };

  const handleCopyLink = () => {
    handleShare();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg h-[90vh] sm:h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-slate-200/80 dark:border-slate-800"
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
            <button
              type="button"
              onClick={() => setIsImageModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold shadow transition active:scale-95 font-khmer border border-white/20"
              title={isKm ? 'ប្តូររូបភាពហាងផ្ទាល់ខ្លួន' : 'Change Shop Photo'}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isKm ? 'ប្តូររូបភាព' : 'Change Photo'}</span>
            </button>
            <a
              href={`tel:${selectedRestaurant.phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold shadow transition active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{isKm ? 'ហៅទូរស័ព្ទ' : 'Call'}</span>
            </a>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 no-scrollbar pb-6">
          {/* Hero Image */}
          <div className="relative h-60 sm:h-64 w-full bg-slate-800">
            <img 
              src={activePhoto || selectedRestaurant.photoUrl} 
              alt={selectedRestaurant.nameKh}
              className="w-full h-full object-cover transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#064E3B]/90 text-emerald-100 border border-emerald-400/30 shadow-xs font-khmer">
                  {isKm ? selectedRestaurant.provinceKh : selectedRestaurant.provinceEn}
                </span>

                {isPremiumActive ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#064E3B] to-[#059669] text-white border border-emerald-300/40 shadow-xs flex items-center gap-1 font-khmer">
                    <Sparkles className="w-3 h-3 text-emerald-200" />
                    <span>⭐ {isKm ? 'សមាជិកភាព VIP Premium (៣៦៥ ថ្ងៃ)' : 'VIP Premium Member (365 Days)'}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800/85 text-slate-100 border border-slate-600/40 shadow-xs font-khmer">
                    🏷️ {isKm ? 'ចុះបញ្ជីឥតគិតថ្លៃ ($0)' : 'Free Listing ($0)'}
                  </span>
                )}

                <span className="px-2 py-0.5 rounded-md bg-[#064E3B]/90 text-emerald-100 text-[10px] font-bold border border-emerald-400/30">
                  {selectedRestaurant.priceLevel}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold font-moul leading-snug drop-shadow text-white">
                {isKm ? selectedRestaurant.nameKh : selectedRestaurant.nameEn}
              </h2>
              <p className="text-xs text-emerald-200 font-medium">
                {isKm ? selectedRestaurant.nameEn : selectedRestaurant.nameKh}
              </p>
            </div>

            {/* Sample / Representative Image Label (រូបតំណាង) */}
            <div className="absolute bottom-2.5 right-3 z-10 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] text-white/90 font-khmer border border-white/20 select-none pointer-events-none shadow-xs">
              <span>{isKm ? 'រូបតំណាង' : 'Sample photo'}</span>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* Owner Management Control Bar */}
            {isOwner && (
              <div className="p-3.5 bg-emerald-50 dark:bg-slate-800 rounded-2xl border-2 border-emerald-500/60 flex items-center justify-between font-khmer">
                <div>
                  <div className="font-bold text-xs text-[#064E3B] dark:text-emerald-400 flex items-center gap-1.5">
                    <span>👑</span>
                    <span>{isKm ? 'ផ្ទាំងគ្រប់គ្រងម្ចាស់ហាង' : 'Owner Management Hub'}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-300">
                    {isKm 
                      ? `មុខម្ហូប៖ ${(selectedRestaurant.menuItems || []).length}/5 មុខ | រូបភាពហាង៖ ${allPhotos.length} សន្លឹក` 
                      : `Menu: ${(selectedRestaurant.menuItems || []).length}/5 | Photos: ${allPhotos.length}`}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setManagingRestaurant(selectedRestaurant);
                    setIsManageMenuModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow flex items-center gap-1.5 transition active:scale-95"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{isKm ? 'គ្រប់គ្រងហាង & មុខម្ហូប' : 'Manage Store & Menu'}</span>
                </button>
              </div>
            )}

            {/* Quick action bar: Maps, Call, and Share (Benefit 9) */}
            <div className="grid grid-cols-3 gap-2">
              <a
                href={selectedRestaurant.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackRestaurantMap(selectedRestaurant.id)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition active:scale-95 font-khmer"
              >
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{isKm ? 'ផែនទី' : 'Maps'}</span>
              </a>

              <a
                href={`tel:${selectedRestaurant.phone}`}
                onClick={() => trackRestaurantCall(selectedRestaurant.id)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold shadow transition active:scale-95 font-mono"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span className="truncate">{isKm ? 'ហៅទូរស័ព្ទ' : 'Call'}</span>
              </a>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow transition active:scale-95 font-khmer"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{isKm ? 'ចែករំលែក' : 'Share'}</span>
              </button>
            </div>

            {/* Gallery Photos & Replace Photo Button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0F172A] dark:text-white font-khmer flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#059669]" />
                  <span>{isKm ? `រូបភាពហាង (${allPhotos.length} សន្លឹក)` : `Shop Photos (${allPhotos.length})`}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#059669] hover:brightness-110 text-white font-khmer font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{isKm ? 'ប្តូររូបភាពហាង' : 'Change Photo'}</span>
                </button>
              </div>
              {allPhotos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {allPhotos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhoto(photo)}
                      className={`relative w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                        (activePhoto || selectedRestaurant.photoUrl) === photo 
                          ? 'border-[#064E3B] ring-2 ring-[#059669]' 
                          : 'border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img src={photo} alt="gallery" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Address & Hours */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 space-y-2.5 text-xs font-khmer shadow-2xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#0F172A] dark:text-white">
                    {isKm ? 'អាសយដ្ឋាន' : 'Address'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {isKm ? selectedRestaurant.addressKh : selectedRestaurant.addressEn}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                <Clock className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#0F172A] dark:text-white">
                    {isKm ? 'ម៉ោងបើកដំណើរការ' : 'Opening Hours'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {isKm ? selectedRestaurant.openingHoursKh : selectedRestaurant.openingHoursEn}
                  </p>
                </div>
              </div>
            </div>

            {/* Restaurant Food Menu Items */}
            {selectedRestaurant.menuItems && selectedRestaurant.menuItems.length > 0 ? (
              <div className="space-y-3 font-khmer">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#0F172A] dark:text-white text-sm flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-[#059669]" />
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
                      className="text-[#064E3B] dark:text-emerald-400 font-bold text-xs hover:underline"
                    >
                      {isKm ? '+ កែប្រែ / បន្ថែម' : '+ Edit / Add'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {selectedRestaurant.menuItems.map((item, i) => (
                    <div 
                      key={item.id || i}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-xs flex items-center gap-3"
                    >
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 dark:border-slate-700">
                        <img src={item.photoUrl} alt={item.nameKh} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 right-0 bg-black/65 text-white/90 text-[7px] px-1 rounded-tl-sm font-khmer select-none">
                          {isKm ? 'រូបតំណាង' : 'Sample'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-[#0F172A] dark:text-white text-xs truncate">
                            {item.nameKh}
                          </h4>
                          <span className="text-[#064E3B] dark:text-emerald-400 font-bold font-mono text-xs ml-2">${item.priceUsd.toFixed(2)}</span>
                        </div>
                        {item.nameEn && (
                          <p className="text-[10px] text-slate-500 truncate">{item.nameEn}</p>
                        )}
                        <p className="text-[10px] text-slate-500 font-mono">({item.priceRiel.toLocaleString()} ៛)</p>
                        {item.descriptionKh && (
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">
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
                  <h3 className="font-bold text-[#0F172A] dark:text-white text-sm flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-[#059669]" />
                    <span>{isKm ? 'មុខម្ហូបប្រចាំហាង (Signature Dishes)' : 'Signature Menus'}</span>
                  </h3>
                  {isOwner && (
                    <button
                      onClick={() => {
                        setManagingRestaurant(selectedRestaurant);
                        setIsManageMenuModalOpen(true);
                      }}
                      className="text-[#064E3B] dark:text-emerald-400 font-bold text-xs hover:underline"
                    >
                      {isKm ? '+ គ្រប់គ្រងមុខម្ហូប' : '+ Manage Menu'}
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {(selectedRestaurant.signatureDishesKh || []).map((dish, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#064E3B] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
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
              <h3 className="font-bold text-[#0F172A] dark:text-white text-sm mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#059669]" />
                <span>{isKm ? 'អំពីភោជនីយដ្ឋាន' : 'About the Restaurant'}</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-700">
                {isKm ? selectedRestaurant.descriptionKh : selectedRestaurant.descriptionEn}
              </p>
            </div>

            {/* Social Share Bar */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 font-khmer">
              <p className="text-xs font-semibold text-slate-500 mb-2.5 text-center">
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
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-300 dark:border-slate-700"
                >
                  {isKm ? 'ចម្លង' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Image Replacement Modal */}
      <RestaurantImageModal
        restaurant={selectedRestaurant}
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSave={(updated) => {
          updateRestaurant(updated);
          setActivePhoto(updated.photoUrl);
          showToast(isKm ? 'បានផ្លាស់ប្តូររូបភាពហាងជោគជ័យ!' : 'Restaurant photo updated successfully!', 'success');
        }}
        isKm={isKm}
      />
    </div>
  );
};

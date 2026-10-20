import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Heart, MapPin, Calendar, Ticket, ExternalLink, 
  Send, Share2, Sparkles, Compass, Camera
} from 'lucide-react';
import { TouristImageModal } from './TouristImageModal';

export const TouristDetailModal: React.FC = () => {
  const { 
    selectedDestination, setSelectedDestination, updateDestination,
    language, isBookmarked, toggleBookmark, showToast, currentUser 
  } = useApp();

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  if (!selectedDestination) return null;

  const isAdmin = currentUser?.role === 'admin';
  const bookmarked = isBookmarked(selectedDestination.id);

  const handleShareTelegram = () => {
    const text = encodeURIComponent(`សូមទស្សនាតំបន់ទេសចរណ៍ស្រស់ត្រកាលកម្ពុជា៖ ${selectedDestination.nameKh} (${selectedDestination.nameEn})\n📍 ${selectedDestination.provinceKh}\n${selectedDestination.descriptionKh}`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${selectedDestination.nameKh} - ${selectedDestination.mapUrl}`);
    showToast(language === 'km' ? 'បានចម្លងព័ត៌មានទីតាំងទេសចរណ៍!' : 'Destination link copied!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg h-[90vh] sm:h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-slate-200/80 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Controls */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          <button
            onClick={() => setSelectedDestination(null)}
            className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white shadow pointer-events-auto transition active:scale-90"
            title="បិទ"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 pointer-events-auto">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsImageModalOpen(true)}
                className="py-1.5 px-3 rounded-full bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-lg backdrop-blur-md transition active:scale-90 flex items-center gap-1.5 border border-white/20"
                title={language === 'km' ? 'ផ្លាស់ប្តូររូបភាព' : 'Change Photo'}
              >
                <Camera className="w-3.5 h-3.5 text-white" />
                <span className="font-khmer">{language === 'km' ? 'ប្តូររូបភាព' : 'Change Photo'}</span>
              </button>
            )}

            <button
              onClick={() => toggleBookmark(selectedDestination.id)}
              className={`p-2.5 rounded-full backdrop-blur-md shadow transition active:scale-90 ${
                bookmarked ? 'bg-rose-500 text-white' : 'bg-black/50 hover:bg-black/70 text-white'
              }`}
              title="រក្សាទុក"
            >
              <Heart className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 no-scrollbar pb-6">
          {/* Hero Image */}
          <div className="relative h-64 sm:h-72 w-full bg-slate-800">
            <img 
              src={selectedDestination.photoUrl} 
              alt={selectedDestination.nameKh}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#064E3B] text-emerald-100 border border-emerald-400/40 shadow mb-2 inline-block">
                {language === 'km' ? selectedDestination.categoryKh : selectedDestination.categoryEn}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-moul leading-snug drop-shadow text-white">
                {language === 'km' ? selectedDestination.nameKh : selectedDestination.nameEn}
              </h2>
              <p className="text-xs text-emerald-200 font-medium">
                {language === 'km' ? selectedDestination.nameEn : selectedDestination.nameKh}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* Direct Google Maps Action Button */}
            <div>
              <a
                href={selectedDestination.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md transition active:scale-98"
              >
                <Compass className="w-4 h-4" />
                <span>{language === 'km' ? 'បើកមើលលើ Google Maps & នាំផ្លូវ' : 'Open in Google Maps & Get Directions'}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>

            {/* Quick Info Cards: Fees & Best Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fee Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 space-y-1">
                <div className="flex items-center gap-2 text-[#064E3B] dark:text-emerald-400 font-bold text-xs">
                  <Ticket className="w-4 h-4 text-[#059669]" />
                  <span>{language === 'km' ? 'សំបុត្រចូលទស្សនា' : 'Entrance Fee'}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                  {language === 'km' ? selectedDestination.entranceFeeKh : selectedDestination.entranceFeeEn}
                </p>
              </div>

              {/* Best Time Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 space-y-1">
                <div className="flex items-center gap-2 text-[#064E3B] dark:text-emerald-400 font-bold text-xs">
                  <Calendar className="w-4 h-4 text-[#059669]" />
                  <span>{language === 'km' ? 'ពេលវេលាល្អបំផុតដើម្បីមកលេង' : 'Best Time to Visit'}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                  {language === 'km' ? selectedDestination.bestTimeToVisitKh : selectedDestination.bestTimeToVisitEn}
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 flex items-start gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#0F172A] dark:text-white">
                  {language === 'km' ? 'ទីតាំងភូមិសាស្ត្រ' : 'Location Address'}
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  {language === 'km' ? selectedDestination.addressKh : selectedDestination.addressEn}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-bold text-[#0F172A] dark:text-white text-sm mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#059669]" />
                {language === 'km' ? 'ប្រវត្តិ និងទិដ្ឋភាពទូទៅ' : 'Overview & History'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-700">
                {language === 'km' ? selectedDestination.descriptionKh : selectedDestination.descriptionEn}
              </p>
            </div>

            {/* Highlights List */}
            {selectedDestination.highlightsKh && selectedDestination.highlightsKh.length > 0 && (
              <div>
                <h3 className="font-bold text-[#0F172A] dark:text-white text-sm mb-2">
                  {language === 'km' ? 'ចំណុចលេចធ្លោមិនគួររំលង' : 'Key Highlights'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedDestination.highlightsKh || []).map((hl, i) => (
                    <div 
                      key={i}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                      <span className="font-medium text-[#0F172A] dark:text-slate-200">{hl}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Share Bar */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 mb-2.5 text-center">
                {language === 'km' ? 'ចែករំលែកតំបន់ទេសចរណ៍នេះ' : 'Share this destination'}
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
                  {language === 'km' ? 'ចម្លង' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Destination Photo Upload / Replace Modal for Admin */}
      <TouristImageModal
        destination={selectedDestination}
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSave={(updatedDest) => {
          updateDestination(updatedDest);
          setSelectedDestination(updatedDest);
          showToast(language === 'km' ? `បានផ្លាស់ប្តូររូបភាពសម្រាប់ "${updatedDest.nameKh}" ជោគជ័យ!` : `Updated photo for "${updatedDest.nameEn}"!`, 'success');
        }}
        isKm={language === 'km'}
      />
    </div>
  );
};

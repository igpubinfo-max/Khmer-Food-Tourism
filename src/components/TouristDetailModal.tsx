import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Heart, MapPin, Calendar, Ticket, ExternalLink, 
  Send, Share2, Sparkles, Compass
} from 'lucide-react';

export const TouristDetailModal: React.FC = () => {
  const { selectedDestination, setSelectedDestination, language, isBookmarked, toggleBookmark, showToast } = useApp();

  if (!selectedDestination) return null;

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
        className="bg-white dark:bg-stone-900 w-full max-w-lg h-[90vh] sm:h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
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

          <button
            onClick={() => toggleBookmark(selectedDestination.id)}
            className={`p-2.5 rounded-full backdrop-blur-md shadow pointer-events-auto transition active:scale-90 ${
              bookmarked ? 'bg-rose-500 text-white' : 'bg-black/50 hover:bg-black/70 text-white'
            }`}
            title="រក្សាទុក"
          >
            <Heart className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 no-scrollbar pb-6">
          {/* Hero Image */}
          <div className="relative h-64 sm:h-72 w-full bg-stone-800">
            <img 
              src={selectedDestination.photoUrl} 
              alt={selectedDestination.nameKh}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-amber-950 shadow mb-2 inline-block">
                {language === 'km' ? selectedDestination.categoryKh : selectedDestination.categoryEn}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-moul leading-snug drop-shadow">
                {language === 'km' ? selectedDestination.nameKh : selectedDestination.nameEn}
              </h2>
              <p className="text-xs text-amber-200/90 font-medium">
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
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800 space-y-1">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <Ticket className="w-4 h-4 text-emerald-600" />
                  <span>{language === 'km' ? 'សំបុត្រចូលទស្សនា' : 'Entrance Fee'}</span>
                </div>
                <p className="text-xs text-emerald-950 dark:text-emerald-200 font-medium leading-relaxed">
                  {language === 'km' ? selectedDestination.entranceFeeKh : selectedDestination.entranceFeeEn}
                </p>
              </div>

              {/* Best Time Card */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800 space-y-1">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>{language === 'km' ? 'ពេលវេលាល្អបំផុតដើម្បីមកលេង' : 'Best Time to Visit'}</span>
                </div>
                <p className="text-xs text-amber-950 dark:text-amber-200 font-medium leading-relaxed">
                  {language === 'km' ? selectedDestination.bestTimeToVisitKh : selectedDestination.bestTimeToVisitEn}
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700 flex items-start gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-stone-900 dark:text-stone-200">
                  {language === 'km' ? 'ទីតាំងភូមិសាស្ត្រ' : 'Location Address'}
                </p>
                <p className="text-stone-600 dark:text-stone-400">
                  {language === 'km' ? selectedDestination.addressKh : selectedDestination.addressEn}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {language === 'km' ? 'ប្រវត្តិ និងទិដ្ឋភាពទូទៅ' : 'Overview & History'}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50/70 dark:bg-stone-800/40 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800">
                {language === 'km' ? selectedDestination.descriptionKh : selectedDestination.descriptionEn}
              </p>
            </div>

            {/* Highlights List */}
            {selectedDestination.highlightsKh && selectedDestination.highlightsKh.length > 0 && (
              <div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-2">
                  {language === 'km' ? 'ចំណុចលេចធ្លោមិនគួររំលង' : 'Key Highlights'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedDestination.highlightsKh.map((hl, i) => (
                    <div 
                      key={i}
                      className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 text-xs flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="font-medium text-stone-800 dark:text-stone-200">{hl}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Share Bar */}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-700">
              <p className="text-xs font-semibold text-stone-500 mb-2.5 text-center">
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

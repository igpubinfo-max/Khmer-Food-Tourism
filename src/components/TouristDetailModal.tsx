import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Heart, MapPin, Calendar, Ticket, ExternalLink, 
  Send, Share2, Sparkles, Compass, Camera, Bookmark, Edit2, Save
} from 'lucide-react';
import { TouristImageModal } from './TouristImageModal';
import { TouristDestination } from '../types';
import { tr } from '../utils/i18n';
import { getLocalizedDestination } from '../utils/zhDynamicTranslator';
import {
  formatRichShareText,
  copyTextNativeOrWeb,
} from '../utils/androidMediaHelper';

export const TouristDetailModal: React.FC = () => {
  const { 
    selectedDestination, setSelectedDestination, updateDestination,
    language, isBookmarked, toggleBookmark, showToast, currentUser,
    openAddToWishlist
  } = useApp();

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isEditingAdminDest, setIsEditingAdminDest] = useState(false);

  // Admin editable destination fields
  const [editNameKh, setEditNameKh] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editCategoryKh, setEditCategoryKh] = useState('');
  const [editCategoryEn, setEditCategoryEn] = useState('');
  const [editProvinceKh, setEditProvinceKh] = useState('');
  const [editProvinceEn, setEditProvinceEn] = useState('');
  const [editAddressKh, setEditAddressKh] = useState('');
  const [editAddressEn, setEditAddressEn] = useState('');
  const [editEntranceFeeKh, setEditEntranceFeeKh] = useState('');
  const [editEntranceFeeEn, setEditEntranceFeeEn] = useState('');
  const [editBestTimeKh, setEditBestTimeKh] = useState('');
  const [editBestTimeEn, setEditBestTimeEn] = useState('');
  const [editMapUrl, setEditMapUrl] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editDescriptionKh, setEditDescriptionKh] = useState('');
  const [editDescriptionEn, setEditDescriptionEn] = useState('');
  const [editHighlightsText, setEditHighlightsText] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (selectedDestination) {
      setEditNameKh(selectedDestination.nameKh || '');
      setEditNameEn(selectedDestination.nameEn || '');
      setEditCategoryKh(selectedDestination.categoryKh || '');
      setEditCategoryEn(selectedDestination.categoryEn || '');
      setEditProvinceKh(selectedDestination.provinceKh || '');
      setEditProvinceEn(selectedDestination.provinceEn || '');
      setEditAddressKh(selectedDestination.addressKh || '');
      setEditAddressEn(selectedDestination.addressEn || '');
      setEditEntranceFeeKh(selectedDestination.entranceFeeKh || 'ឥតគិតថ្លៃ');
      setEditEntranceFeeEn(selectedDestination.entranceFeeEn || 'Free Entry');
      setEditBestTimeKh(selectedDestination.bestTimeToVisitKh || 'ពេញមួយឆ្នាំ');
      setEditBestTimeEn(selectedDestination.bestTimeToVisitEn || 'All year round');
      setEditMapUrl(selectedDestination.mapUrl || '');
      setEditPhotoUrl(selectedDestination.photoUrl || '');
      setEditDescriptionKh(selectedDestination.descriptionKh || '');
      setEditDescriptionEn(selectedDestination.descriptionEn || '');
      setEditHighlightsText((selectedDestination.highlightsKh || []).join(', '));
    }
    if ((window as any).__kft_open_dest_edit && isAdmin) {
      setIsEditingAdminDest(true);
      (window as any).__kft_open_dest_edit = undefined;
    }
  }, [
    selectedDestination?.id,
    selectedDestination?.photoUrl,
    selectedDestination?.nameKh,
    selectedDestination?.descriptionKh,
    isAdmin
  ]);

  if (!selectedDestination) return null;
  const loc = getLocalizedDestination(selectedDestination, language);

  const handleSaveAdminDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDestination) return;

    const highlights = editHighlightsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const customPhotoFlag = editPhotoUrl.trim() !== '' ? true : selectedDestination.isCustomPhoto;
    const updated: TouristDestination = {
      ...selectedDestination,
      nameKh: editNameKh.trim() || selectedDestination.nameKh,
      nameEn: editNameEn.trim() || selectedDestination.nameEn,
      categoryKh: editCategoryKh.trim() || selectedDestination.categoryKh,
      categoryEn: editCategoryEn.trim() || selectedDestination.categoryEn,
      provinceKh: editProvinceKh.trim() || selectedDestination.provinceKh,
      provinceEn: editProvinceEn.trim() || selectedDestination.provinceEn,
      addressKh: editAddressKh.trim() || selectedDestination.addressKh,
      addressEn: editAddressEn.trim() || selectedDestination.addressEn,
      entranceFeeKh: editEntranceFeeKh.trim() || selectedDestination.entranceFeeKh,
      entranceFeeEn: editEntranceFeeEn.trim() || selectedDestination.entranceFeeEn,
      bestTimeToVisitKh: editBestTimeKh.trim() || selectedDestination.bestTimeToVisitKh,
      bestTimeToVisitEn: editBestTimeEn.trim() || selectedDestination.bestTimeToVisitEn,
      mapUrl: editMapUrl.trim() || selectedDestination.mapUrl,
      photoUrl: editPhotoUrl.trim() || selectedDestination.photoUrl,
      descriptionKh: editDescriptionKh.trim() || selectedDestination.descriptionKh,
      descriptionEn: editDescriptionEn.trim() || selectedDestination.descriptionEn,
      highlightsKh: highlights.length > 0 ? highlights : selectedDestination.highlightsKh,
      isCustomPhoto: customPhotoFlag,
      photoUpdatedAt: new Date().toISOString(),
    };

    updateDestination(updated);
    setSelectedDestination(updated);
    setIsEditingAdminDest(false);
    showToast(
      language === 'km'
        ? `✅ បានកែប្រែព័ត៌មានតំបន់ទេសចរណ៍ «${updated.nameKh}» រួចរាល់!`
        : `✅ Updated destination details for "${updated.nameEn}"!`,
      'success'
    );
  };
  const bookmarked = isBookmarked(selectedDestination.id);

  const isKm = language === 'km';
  const sharePayload = {
    title: isKm ? selectedDestination.nameKh : selectedDestination.nameEn,
    nameKh: selectedDestination.nameKh,
    nameEn: selectedDestination.nameEn,
    description: isKm ? selectedDestination.descriptionKh : selectedDestination.descriptionEn,
    location: isKm
      ? `${selectedDestination.addressKh} (${selectedDestination.provinceKh})`
      : `${selectedDestination.addressEn} (${selectedDestination.provinceEn})`,
    priceDisplay: isKm ? selectedDestination.entranceFeeKh : selectedDestination.entranceFeeEn,
    signatureDishes: selectedDestination.highlightsKh,
    photoUrl: selectedDestination.photoUrl,
    mapUrl: selectedDestination.mapUrl,
    itemType: 'destination' as const,
    itemId: selectedDestination.id,
    isKm,
  };

  const handleShareTelegram = () => {
    const { fullText, directLink } = formatRichShareText(sharePayload);
    const text = encodeURIComponent(fullText);
    const url = encodeURIComponent(selectedDestination.mapUrl || directLink);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    const { fullText, directLink } = formatRichShareText(sharePayload);
    const url = encodeURIComponent(selectedDestination.mapUrl || directLink);
    const quote = encodeURIComponent(fullText);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, '_blank');
  };

  const handleCopyLink = async () => {
    const { fullText, title } = formatRichShareText(sharePayload);
    const ok = await copyTextNativeOrWeb(fullText, title);
    if (ok) {
      showToast(language === 'km' ? 'បានចម្លងព័ត៌មានទីតាំងទេសចរណ៍!' : 'Destination details & link copied!', 'success');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setSelectedDestination(null)}
    >
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
              <>
                <button
                  type="button"
                  onClick={() => setIsEditingAdminDest(!isEditingAdminDest)}
                  className="py-1.5 px-3 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-lg backdrop-blur-md transition active:scale-90 flex items-center gap-1.5 border border-white/60"
                  title={isKm ? 'កែប្រែព័ត៌មាន & រូបភាព (Admin)' : 'Edit Details & Photos (Admin)'}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="font-khmer">{isEditingAdminDest ? (isKm ? 'មើលធម្មតា' : 'View') : (isKm ? 'កែប្រែ (Admin)' : 'Edit')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(true)}
                  className="py-1.5 px-3 rounded-full bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-lg backdrop-blur-md transition active:scale-90 flex items-center gap-1.5 border border-white/20"
                  title={language === 'km' ? 'ផ្លាស់ប្តូររូបភាព' : 'Change Photo'}
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <span className="font-khmer">{language === 'km' ? 'ប្តូររូបភាព' : 'Change Photo'}</span>
                </button>
              </>
            )}

            <button
              onClick={() => openAddToWishlist({
                id: selectedDestination.id,
                type: 'destination',
                nameKh: selectedDestination.nameKh,
                nameEn: selectedDestination.nameEn,
                photoUrl: selectedDestination.photoUrl,
                categoryKh: selectedDestination.categoryKh,
                provinceKh: selectedDestination.provinceKh,
                rating: selectedDestination.rating,
              })}
              className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md shadow transition active:scale-90 text-amber-300"
              title={language === 'km' ? 'ដាក់ក្នុងបញ្ជីចង់ទៅ' : 'Add to Wishlist'}
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>

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
        <div className="overflow-y-auto flex-1 no-scrollbar pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
          {isEditingAdminDest ? (
            /* ADMIN EDIT DESTINATION FORM */
            <form onSubmit={handleSaveAdminDestination} className="p-4 sm:p-6 space-y-4 font-khmer pt-16">
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-400/60 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Edit2 className="w-4 h-4 text-amber-600" />
                    <span>{isKm ? 'កែប្រែព័ត៌មានតំបន់ទេសចរណ៍ (Admin Edit)' : 'Admin Destination Editor'}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">ID: {selectedDestination.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingAdminDest(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold"
                >
                  {isKm ? 'បោះបង់' : 'Cancel'}
                </button>
              </div>

              {/* Photo */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="block font-bold text-xs text-slate-800 dark:text-slate-200">
                  {isKm ? 'រូបភាពតំបន់ទេសចរណ៍ (Photo URL / Upload)' : 'Destination Photo'}
                </label>
                <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-slate-900 border border-amber-400/50">
                  <img
                    key={editPhotoUrl || selectedDestination.photoUrl}
                    src={editPhotoUrl || selectedDestination.photoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editPhotoUrl}
                    onChange={(e) => setEditPhotoUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setIsImageModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isKm ? 'ប្តូររូបភាព' : 'Upload Photo'}</span>
                  </button>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'ឈ្មោះតំបន់ទេសចរណ៍ (ភាសាខ្មែរ) *' : 'Name (Khmer) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editNameKh}
                    onChange={(e) => setEditNameKh(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'ឈ្មោះតំបន់ទេសចរណ៍ (English)' : 'Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={editNameEn}
                    onChange={(e) => setEditNameEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* Category & Province */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'ប្រភេទតំបន់ទេសចរណ៍' : 'Category'}
                  </label>
                  <input
                    type="text"
                    value={editCategoryKh}
                    onChange={(e) => setEditCategoryKh(e.target.value)}
                    placeholder="ប្រាសាទបុរាណ, ទឹកធ្លាក់, ឆ្នេរសមុទ្រ..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'រាជធានី-ខេត្ត (Province)' : 'Province'}
                  </label>
                  <input
                    type="text"
                    value={editProvinceKh}
                    onChange={(e) => setEditProvinceKh(e.target.value)}
                    placeholder="ខេត្តសៀមរាប, កំពត..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* Address & Google Maps URL */}
              <div className="space-y-2">
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'អាសយដ្ឋាន / ទីតាំងជាក់ស្តែង' : 'Address / Location'}
                  </label>
                  <input
                    type="text"
                    value={editAddressKh}
                    onChange={(e) => setEditAddressKh(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'តំណភ្ជាប់ផែនទី (Google Maps Link)' : 'Google Maps URL'}
                  </label>
                  <input
                    type="text"
                    value={editMapUrl}
                    onChange={(e) => setEditMapUrl(e.target.value)}
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Entrance fee & Best time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'តម្លៃសំបុត្រ (Entrance Fee)' : 'Entrance Fee'}
                  </label>
                  <input
                    type="text"
                    value={editEntranceFeeKh}
                    onChange={(e) => setEditEntranceFeeKh(e.target.value)}
                    placeholder="ឥតគិតថ្លៃ ឬ $2"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'ពេលវេលាល្អសម្រាប់ដើរលេង' : 'Best Time to Visit'}
                  </label>
                  <input
                    type="text"
                    value={editBestTimeKh}
                    onChange={(e) => setEditBestTimeKh(e.target.value)}
                    placeholder="ពេលព្រឹក / ពេញមួយឆ្នាំ"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Highlights */}
              <div>
                <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                  {isKm ? 'ចំណុចពិសេស (បំបែកដោយក្បៀស ,)' : 'Highlights (comma separated)'}
                </label>
                <input
                  type="text"
                  value={editHighlightsText}
                  onChange={(e) => setEditHighlightsText(e.target.value)}
                  placeholder="ទស្សនាប្រាសាទ, ថតរូបថ្ងៃលិច, ជិះទូកកម្សាន្ត"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                  {isKm ? 'ការពិពណ៌នាតំបន់ទេសចរណ៍' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  value={editDescriptionKh}
                  onChange={(e) => setEditDescriptionKh(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white leading-relaxed"
                />
              </div>

              {/* Save & Cancel */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingAdminDest(false)}
                  className="py-3 px-4 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
                >
                  {isKm ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-[#064E3B] to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-emerald-300" />
                  <span>{isKm ? 'រក្សាទុកការកែប្រែ' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          ) : (
          <>
          {/* Hero Image */}
          <div className="relative h-64 sm:h-72 w-full bg-slate-800">
            <img 
              key={selectedDestination.photoUrl}
              src={selectedDestination.photoUrl} 
              alt={loc.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            
            <div className="absolute bottom-3.5 left-4 right-24 text-white">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#064E3B] text-emerald-100 border border-emerald-400/40 shadow mb-2 inline-block">
                {loc.category}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold font-moul leading-snug drop-shadow text-white">
                {loc.name}
              </h2>
            </div>

            {/* Reference Image Label (រូបភាពយោង) */}
            <div className="absolute bottom-2.5 right-3 z-10 px-1.5 py-0.5 rounded bg-black/55 backdrop-blur-xs text-[8px] sm:text-[9px] text-white/85 font-khmer border border-white/15 select-none pointer-events-none shadow-2xs">
              <span>{tr(language, 'រូបភាពយោង', 'Reference photo', '参考图片')}</span>
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
                <span>{tr(language, 'បើកមើលលើ Google Maps & នាំផ្លូវ', 'Open in Google Maps & Get Directions', '在 Google 地图中打开并导航')}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>

            {/* Viral TikTok & Facebook Trending Card */}
            {selectedDestination.isTrendingSocial && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-indigo-500/10 border border-pink-500/30 space-y-1.5 font-khmer">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <span>🔥</span>
                    <span>{tr(language, 'កន្លែងដើរលេងល្បីលើ TikTok & Facebook', 'Viral & Trending on TikTok & FB', 'TikTok 与 Facebook 热门网红打卡点')}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-xs">
                    {selectedDestination.socialViews || 'Trending'}
                  </span>
                </div>
                {selectedDestination.socialHashtag && (
                  <p className="text-[11px] font-semibold text-pink-600 dark:text-pink-400 font-mono">
                    {selectedDestination.socialHashtag}
                  </p>
                )}
                {loc.socialHighlight && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {loc.socialHighlight}
                  </p>
                )}
              </div>
            )}

            {/* Quick Info Cards: Fees & Best Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fee Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 space-y-1">
                <div className="flex items-center gap-2 text-[#064E3B] dark:text-emerald-400 font-bold text-xs">
                  <Ticket className="w-4 h-4 text-[#059669]" />
                  <span>{tr(language, 'សំបុត្រចូលទស្សនា', 'Entrance Fee', '门票费用')}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                  {loc.entranceFee}
                </p>
              </div>

              {/* Best Time Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 space-y-1">
                <div className="flex items-center gap-2 text-[#064E3B] dark:text-emerald-400 font-bold text-xs">
                  <Calendar className="w-4 h-4 text-[#059669]" />
                  <span>{tr(language, 'ពេលវេលាល្អបំផុតដើម្បីមកលេង', 'Best Time to Visit', '最佳游览时间')}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                  {loc.bestTime}
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 flex items-start gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#0F172A] dark:text-white">
                  {tr(language, 'ទីតាំងភូមិសាស្ត្រ', 'Location Address', '详细地址')}
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  {loc.address}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-bold text-[#0F172A] dark:text-white text-base mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#059669]" />
                {tr(language, 'ប្រវត្តិ និងទិដ្ឋភាពទូទៅ', 'Overview & History', '历史与景点介绍')}
              </h3>
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-700">
                {loc.description}
              </p>
            </div>

            {/* Highlights List */}
            {loc.highlights && loc.highlights.length > 0 && (
              <div>
                <h3 className="font-bold text-[#0F172A] dark:text-white text-base mb-2">
                  {tr(language, 'ចំណុចលេចធ្លោមិនគួររំលង', 'Key Highlights', '精彩亮点推荐')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {loc.highlights.map((hl, i) => (
                    <div 
                      key={i}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs sm:text-sm flex items-center gap-2"
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
                {tr(language, 'ចែករំលែកតំបន់ទេសចរណ៍នេះ', 'Share this destination', '分享此旅游景点')}
              </p>
              
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleShareTelegram}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#229ED9] text-white text-xs font-bold shadow hover:brightness-105 transition active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  Telegram
                </button>

                <button
                  type="button"
                  onClick={handleShareFacebook}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1877F2] text-white text-xs font-bold shadow hover:brightness-105 transition active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Facebook
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-300 dark:border-slate-700 transition active:scale-95"
                >
                  {tr(language, 'ចម្លង', 'Copy', '复制链接')}
                </button>
              </div>
            </div>
          </div>
          </>
          )}
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
          setEditPhotoUrl(updatedDest.photoUrl);
          showToast(
            language === 'km' 
              ? `✅ បានផ្លាស់ប្តូររូបភាពសម្រាប់ «${updatedDest.nameKh}» ជោគជ័យ!` 
              : `✅ Updated photo for "${updatedDest.nameEn}"!`, 
            'success'
          );
        }}
        isKm={language === 'km'}
      />
    </div>
  );
};

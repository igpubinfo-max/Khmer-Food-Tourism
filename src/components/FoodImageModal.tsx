import React, { useState, useRef, useEffect } from 'react';
import { FoodItem } from '../types';
import { 
  X, Upload, Image as ImageIcon, Check, RefreshCw, 
  AlertTriangle, CheckCircle2, Eye, Sliders, Smartphone, Sparkles, Search, Globe 
} from 'lucide-react';
import { searchOnlineFoodImages, OnlineFoodImageCandidate } from '../services/onlineFoodImageService';

interface FoodImageModalProps {
  food: FoodItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFood: FoodItem) => void;
  isKm: boolean;
}

// Compress and resize images smoothly client-side
const compressImageFile = (
  file: File, 
  maxWidth = 1000, 
  maxHeight = 750, 
  quality = 0.84
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        // Fill white background for transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const webp = canvas.toDataURL('image/webp', quality);
          if (webp.startsWith('data:image/webp')) {
            resolve(webp);
            return;
          }
        } catch {}
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to parse image file'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk'));
    reader.readAsDataURL(file);
  });
};

export const FoodImageModal: React.FC<FoodImageModalProps> = ({
  food,
  isOpen,
  onClose,
  onSave,
  isKm,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [photoUrl, setPhotoUrl] = useState('');
  const [auditStatus, setAuditStatus] = useState<'verified' | 'flagged_review' | 'replaced'>('verified');
  const [auditNote, setAuditNote] = useState('');
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineCandidates, setOnlineCandidates] = useState<OnlineFoodImageCandidate[]>([]);

  useEffect(() => {
    if (food) {
      setPhotoUrl(food.photoUrl || '');
      setUrlInput(food.photoUrl || '');
      setAuditStatus(food.imageAuditStatus || 'verified');
      setAuditNote(food.imageAuditNote || '');
      setFitMode('cover');
      setErrorMsg('');
      setOnlineCandidates([]);
    }
  }, [food, isOpen]);

  if (!isOpen || !food) return null;

  const handleSearchOnlineImages = async () => {
    setErrorMsg('');
    setIsSearchingOnline(true);
    try {
      const results = await searchOnlineFoodImages({
        nameKh: food.nameKh,
        nameEn: food.nameEn,
        categorySlug: food.categorySlug,
        existingUrls: food.photoUrl ? [food.photoUrl] : [],
      });
      setOnlineCandidates(results);
      if (results.length > 0) {
        setPhotoUrl(results[0].url);
        setUrlInput(results[0].url);
        setAuditStatus('verified');
        setAuditNote(isKm ? `រូបភាពស្វែងរកពី Online ដោយស្វ័យប្រវត្តិ (${results[0].source})` : `Auto-matched online photo (${results[0].source})`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isKm ? 'មិនអាចស្វែងរករូបភាពពី Online បានទេ' : 'Failed to search online food images'));
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMsg(isKm ? 'សូមជ្រើសរើសប្រភេទរូបភាព JPG, PNG ឬ WebP ប៉ុណ្ណោះ' : 'Please select a JPG, PNG, or WebP image');
      return;
    }

    // Validate size (max 12MB before compression)
    if (file.size > 12 * 1024 * 1024) {
      setErrorMsg(isKm ? 'ទំហំរូបភាពធំពេក (អតិបរមា 12MB)' : 'File size is too large (max 12MB)');
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);
    try {
      const compressedDataUrl = await compressImageFile(file);
      setPhotoUrl(compressedDataUrl);
      setUrlInput('');
      setAuditStatus('verified');
      setAuditNote(
        isKm 
          ? `រូបភាពបានបញ្ចូលដោយរដ្ឋបាលពីទូរស័ព្ទ/កុំព្យូទ័រ (${(compressedDataUrl.length / 1024).toFixed(0)} KB)` 
          : `Custom photo uploaded by admin (${(compressedDataUrl.length / 1024).toFixed(0)} KB)`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing image');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setPhotoUrl(urlInput.trim());
    setAuditStatus('verified');
    setAuditNote(isKm ? 'រូបភាពតំណភ្ជាប់ URL កំណត់ដោយរដ្ឋបាល' : 'Image URL set by administrator');
  };

  const handleResetToDefault = () => {
    const defaultUrl = food.originalPhotoUrl || `/foods/${food.id}.jpg`;
    setPhotoUrl(defaultUrl);
    setUrlInput(defaultUrl);
    setAuditStatus('verified');
    setAuditNote(isKm ? 'បានកំណត់ទៅរូបភាពដើមពិតប្រាកដពី Magnific' : 'Reset to authentic food image');
  };

  const handleSave = () => {
    if (!photoUrl.trim()) {
      setErrorMsg(isKm ? 'សូមបញ្ចូលរូបភាព ឬជ្រើសរើសឯកសារ' : 'Please provide an image URL or choose a file');
      return;
    }

    const updated: FoodItem = {
      ...food,
      photoUrl: photoUrl.trim(),
      imageAuditStatus: auditStatus,
      imageAuditNote: auditNote.trim() || (auditStatus === 'verified' ? (isKm ? 'បានផ្ទៀងផ្ទាត់ដោយរដ្ឋបាល' : 'Verified by admin') : (isKm ? 'រង់ចាំពិនិត្យ' : 'Pending review')),
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#064E3B] text-white flex items-center justify-between border-b border-[#047857]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-emerald-200">
                {food.id}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-khmer">
                {food.categoryKh}
              </span>
            </div>
            <h3 className="font-bold text-sm sm:text-base font-khmer truncate text-white">
              {food.nameKh}
            </h3>
            <p className="text-[11px] text-emerald-200 truncate">
              {food.nameEn}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-khmer flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Live Mobile Card Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0F172A] dark:text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#059669]" />
                {isKm ? 'ការបង្ហាញរូបភាពក្នុងកម្មវិធី (Live App Preview)' : 'Live Mobile Card Preview'}
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setFitMode('cover')}
                  className={`px-2 py-0.5 rounded-md font-bold transition ${
                    fitMode === 'cover' ? 'bg-[#064E3B] text-white' : 'text-slate-500'
                  }`}
                >
                  {isKm ? 'ពេញស៊ុម (Cover)' : 'Cover'}
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode('contain')}
                  className={`px-2 py-0.5 rounded-md font-bold transition ${
                    fitMode === 'contain' ? 'bg-[#064E3B] text-white' : 'text-slate-500'
                  }`}
                >
                  {isKm ? 'រូបពេញ (Contain)' : 'Fit'}
                </button>
              </div>
            </div>

            {/* Mobile Card Mockup */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/60 shadow-xs max-w-sm mx-auto">
              <div className="relative aspect-[16/10] bg-slate-900 flex items-center justify-center overflow-hidden">
                {photoUrl ? (
                  <img 
                    src={photoUrl} 
                    alt={food.nameKh} 
                    className={`w-full h-full transition-all duration-200 ${
                      fitMode === 'cover' ? 'object-cover' : 'object-contain'
                    }`}
                  />
                ) : (
                  <div className="text-center text-slate-400 p-4">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span>{isKm ? 'មិនទាន់មានរូបភាព' : 'No photo selected'}</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-[#064E3B]/80 backdrop-blur-xs text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  {food.categoryKh}
                </div>
              </div>
              <div className="p-3">
                <h4 className="font-bold text-[#0F172A] dark:text-slate-100 text-xs">
                  {food.nameKh}
                </h4>
                <p className="text-[10px] text-slate-500">
                  {food.nameEn}
                </p>
              </div>
            </div>
          </div>

          {/* Option 1: File Upload / Phone Gallery Picker */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0F172A] dark:text-slate-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#059669]" />
                {isKm ? '១. ជ្រើសរើសរូបពីទូរស័ព្ទ / កុំព្យូទ័រ' : '1. Upload Photo from Phone Gallery'}
              </span>
              <span className="text-[10px] text-slate-400">JPG, PNG, WebP</span>
            </div>

            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleFileChange}
              className="hidden" 
            />

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 transition active:scale-98 disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-emerald-300" />
              <span>
                {isProcessing 
                  ? (isKm ? 'កំពុងដំណើរការ និងបង្រួមរូបភាព...' : 'Optimizing image...') 
                  : (isKm ? 'ជ្រើសរើសរូបថតពីទូរស័ព្ទ ឬកុំព្យូទ័រ' : 'Choose Photo from Device Gallery')}
              </span>
            </button>
            <p className="text-[10px] text-slate-500 text-center">
              {isKm 
                ? 'ប្រព័ន្ធនឹងបង្រួមទំហំរូបភាពស្វ័យប្រវត្ត (WebP/JPEG) ដើម្បីឱ្យកម្មវិធីដំណើរការលឿននិងមិនគាំង' 
                : 'Auto-compressed to high-performance WebP for fast offline loading'}
            </p>
          </div>

          {/* Option 2: Auto Online Food Image Search + Direct URL Input */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[#0F172A] dark:text-slate-200 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-600" />
                {isKm ? '២. ស្វែងរករូបភាពម្ហូបពី Online ឬបញ្ចូល URL' : '2. Auto Online Food Photo Search or Web URL'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                FREE API
              </span>
            </div>

            <button
              type="button"
              disabled={isSearchingOnline}
              onClick={handleSearchOnlineImages}
              className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 text-amber-300 ${isSearchingOnline ? 'animate-spin' : ''}`} />
              <span>
                {isSearchingOnline
                  ? (isKm ? 'កំពុងស្វែងរករូបភាពម្ហូបពី Online...' : 'Searching online food photos...')
                  : (isKm ? '🤖 ស្វែងរករូបភាពម្ហូបពី Online ដោយស្វ័យប្រវត្តិ' : '🤖 Auto-Search Matching Food Photos Online')}
              </span>
            </button>

            {onlineCandidates.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
                  {isKm
                    ? `✨ រកឃើញរូបភាពម្ហូបពី Online ចំនួន ${onlineCandidates.length} សន្លឹក (ចុចជ្រើសរើស)៖`
                    : `✨ Found ${onlineCandidates.length} matching online photos (tap to select):`}
                </span>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {onlineCandidates.map((cand, idx) => {
                    const isSelected = photoUrl === cand.url;
                    return (
                      <button
                        key={`${cand.url}-${idx}`}
                        type="button"
                        onClick={() => {
                          setPhotoUrl(cand.url);
                          setUrlInput(cand.url);
                          setAuditStatus('verified');
                          setAuditNote(
                            isKm
                              ? `រូបភាពជ្រើសរើសពី Online (${cand.source})`
                              : `Online photo selected (${cand.source})`
                          );
                        }}
                        className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition cursor-pointer group ${
                          isSelected
                            ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        <img
                          src={cand.thumbUrl || cand.url}
                          alt={cand.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[9px] px-1.5 py-0.5 truncate">
                          {cand.source}
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3.5 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold transition shrink-0 active:scale-95"
              >
                {isKm ? 'មើល' : 'Apply'}
              </button>
            </div>
          </div>

          {/* Audit Status & Verification Note */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-[#0F172A] dark:text-slate-300 block">
              {isKm ? 'ស្ថានភាពផ្ទៀងផ្ទាត់រូបភាព (Audit Status):' : 'Verification Status:'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuditStatus('verified')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                  auditStatus === 'verified'
                    ? 'bg-emerald-50 border-[#059669] text-[#064E3B] dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-[#059669]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                <span>{isKm ? '✓ ផ្ទៀងផ្ទាត់ត្រឹមត្រូវ' : '✓ Verified Authentic'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAuditStatus('flagged_review')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                  auditStatus === 'flagged_review'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-amber-300'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{isKm ? '⚠️ រង់ចាំពិនិត្យ' : '⚠️ Pending Review'}</span>
              </button>
            </div>

            <div className="pt-1">
              <label className="text-[11px] text-slate-500 block mb-1">
                {isKm ? 'កំណត់ចំណាំសវនកម្ម (Audit Note):' : 'Audit Note / Source:'}
              </label>
              <input 
                type="text"
                value={auditNote}
                onChange={e => setAuditNote(e.target.value)}
                placeholder={isKm ? 'ឧទាហរណ៍៖ រូបថតម្ហូបដើមពីហាង...' : 'e.g., Authentic traditional photo...'}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] font-khmer"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 font-khmer">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold text-xs flex items-center gap-1 transition"
            title="កំណត់រូបភាពលំនាំដើមឡើងវិញ"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isKm ? 'កំណត់រូបដើម' : 'Reset'}</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300 transition"
            >
              {isKm ? 'បោះបង់' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/20 transition active:scale-95"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>{isKm ? 'រក្សាទុករូបភាព' : 'Save Photo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

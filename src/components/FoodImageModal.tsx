import React, { useState, useRef, useEffect } from 'react';
import { FoodItem } from '../types';
import { 
  X, Upload, Image as ImageIcon, Check, RefreshCw, 
  AlertTriangle, CheckCircle2, Eye, Sliders, Smartphone, Sparkles 
} from 'lucide-react';

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
  const [auditStatus, setAuditStatus] = useState<'verified' | 'flagged_review'>('verified');
  const [auditNote, setAuditNote] = useState('');
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (food) {
      setPhotoUrl(food.photoUrl || '');
      setUrlInput(food.photoUrl || '');
      setAuditStatus(food.imageAuditStatus || 'verified');
      setAuditNote(food.imageAuditNote || '');
      setFitMode('cover');
      setErrorMsg('');
    }
  }, [food, isOpen]);

  if (!isOpen || !food) return null;

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
    const defaultUrl = food.originalPhotoUrl || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80&dish=${food.id}`;
    setPhotoUrl(defaultUrl);
    setUrlInput(defaultUrl);
    setAuditStatus('flagged_review');
    setAuditNote(isKm ? 'បានកំណត់រូបភាពលំនាំដើមឡើងវិញ' : 'Reset to default image');
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
        className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-stone-200 dark:border-stone-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-700 to-amber-900 text-white flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/25 text-amber-200">
                {food.id}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-100 font-khmer">
                {food.categoryKh}
              </span>
            </div>
            <h3 className="font-bold text-sm sm:text-base font-khmer truncate">
              {food.nameKh}
            </h3>
            <p className="text-[11px] text-amber-200/90 truncate">
              {food.nameEn}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
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
              <span className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                {isKm ? 'ការបង្ហាញរូបភាពក្នុងកម្មវិធី (Live App Preview)' : 'Live Mobile Card Preview'}
              </span>
              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setFitMode('cover')}
                  className={`px-2 py-0.5 rounded-md font-bold transition ${
                    fitMode === 'cover' ? 'bg-amber-600 text-white' : 'text-stone-500'
                  }`}
                >
                  {isKm ? 'ពេញស៊ុម (Cover)' : 'Cover'}
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode('contain')}
                  className={`px-2 py-0.5 rounded-md font-bold transition ${
                    fitMode === 'contain' ? 'bg-amber-600 text-white' : 'text-stone-500'
                  }`}
                >
                  {isKm ? 'រូបពេញ (Contain)' : 'Fit'}
                </button>
              </div>
            </div>

            {/* Mobile Card Mockup */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden bg-stone-50 dark:bg-stone-800/60 shadow-xs max-w-sm mx-auto">
              <div className="relative aspect-[16/10] bg-stone-900 flex items-center justify-center overflow-hidden">
                {photoUrl ? (
                  <img 
                    src={photoUrl} 
                    alt={food.nameKh} 
                    className={`w-full h-full transition-all duration-200 ${
                      fitMode === 'cover' ? 'object-cover' : 'object-contain'
                    }`}
                  />
                ) : (
                  <div className="text-center text-stone-400 p-4">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span>{isKm ? 'មិនទាន់មានរូបភាព' : 'No photo selected'}</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {food.categoryKh}
                </div>
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {food.cookTime || '២៥ នាទី'}
                </div>
              </div>
              <div className="p-3">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                  {food.nameKh}
                </h4>
                <p className="text-[10px] text-stone-500">
                  {food.nameEn}
                </p>
              </div>
            </div>
          </div>

          {/* Option 1: File Upload / Phone Gallery Picker */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-stone-800/80 border border-amber-200/80 dark:border-stone-700">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-600" />
                {isKm ? '១. ជ្រើសរើសរូបពីទូរស័ព្ទ / កុំព្យូទ័រ' : '1. Upload Photo from Phone Gallery'}
              </span>
              <span className="text-[10px] text-stone-400">JPG, PNG, WebP</span>
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
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-98 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>
                {isProcessing 
                  ? (isKm ? 'កំពុងដំណើរការ និងបង្រួមរូបភាព...' : 'Optimizing image...') 
                  : (isKm ? 'ជ្រើសរើសរូបថតពីទូរស័ព្ទ ឬកុំព្យូទ័រ' : 'Choose Photo from Device Gallery')}
              </span>
            </button>
            <p className="text-[10px] text-stone-500 text-center">
              {isKm 
                ? 'ប្រព័ន្ធនឹងបង្រួមទំហំរូបភាពស្វ័យប្រវត្ត (WebP/JPEG) ដើម្បីឱ្យកម្មវិធីដំណើរការលឿននិងមិនគាំង' 
                : 'Auto-compressed to high-performance WebP for fast offline loading'}
            </p>
          </div>

          {/* Option 2: Direct URL Input */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
            <span className="font-bold text-stone-700 dark:text-stone-300 block">
              {isKm ? '២. ឬ បញ្ចូលតំណភ្ជាប់ URL រូបភាព (Image URL):' : '2. Or Enter Direct Image Web URL:'}
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3.5 py-2 rounded-xl bg-stone-700 hover:bg-stone-800 text-white font-bold transition shrink-0"
              >
                {isKm ? 'មើល' : 'Apply'}
              </button>
            </div>
          </div>

          {/* Audit Status & Verification Note */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
            <span className="font-bold text-stone-700 dark:text-stone-300 block">
              {isKm ? 'ស្ថានភាពផ្ទៀងផ្ទាត់រូបភាព (Audit Status):' : 'Verification Status:'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuditStatus('verified')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                  auditStatus === 'verified'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'border-stone-200 dark:border-stone-700 text-stone-500 hover:border-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isKm ? '✓ ផ្ទៀងផ្ទាត់ត្រឹមត្រូវ' : '✓ Verified Authentic'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAuditStatus('flagged_review')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                  auditStatus === 'flagged_review'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'border-stone-200 dark:border-stone-700 text-stone-500 hover:border-amber-300'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{isKm ? '⚠️ រង់ចាំពិនិត្យ' : '⚠️ Pending Review'}</span>
              </button>
            </div>

            <div className="pt-1">
              <label className="text-[11px] text-stone-500 block mb-1">
                {isKm ? 'កំណត់ចំណាំសវនកម្ម (Audit Note):' : 'Audit Note / Source:'}
              </label>
              <input 
                type="text"
                value={auditNote}
                onChange={e => setAuditNote(e.target.value)}
                placeholder={isKm ? 'ឧទាហរណ៍៖ រូបថតម្ហូបដើមពីហាង...' : 'e.g., Authentic traditional photo...'}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs focus:outline-none focus:border-amber-500 font-khmer"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 font-khmer">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-semibold text-xs flex items-center gap-1 transition"
            title="កំណត់រូបភាពលំនាំដើមឡើងវិញ"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isKm ? 'កំណត់រូបដើម' : 'Reset'}</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold hover:bg-stone-300 transition"
            >
              {isKm ? 'បោះបង់' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-md transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{isKm ? 'រក្សាទុករូបភាព' : 'Save Photo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

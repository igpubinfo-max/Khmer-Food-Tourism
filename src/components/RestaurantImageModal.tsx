import React, { useState, useRef, useEffect } from 'react';
import { Restaurant } from '../types';
import { 
  X, Upload, Image as ImageIcon, Check, RefreshCw, 
  MapPin, Camera, Trash2, Star, Sparkles
} from 'lucide-react';

interface RestaurantImageModalProps {
  restaurant: Restaurant | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRest: Restaurant) => void;
  isKm: boolean;
}

// Client-side image compression & resizing for smooth mobile experience
const compressImageFile = (
  file: File, 
  maxWidth = 1200, 
  maxHeight = 800, 
  quality = 0.85
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

export const RestaurantImageModal: React.FC<RestaurantImageModalProps> = ({
  restaurant,
  isOpen,
  onClose,
  onSave,
  isKm,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);

  useEffect(() => {
    if (restaurant && isOpen) {
      setPhotoUrl(restaurant.photoUrl || '');
      setUrlInput(restaurant.photoUrl || '');
      setGallery(restaurant.galleryPhotos || []);
      setErrorMsg('');
    }
  }, [restaurant, isOpen]);

  if (!isOpen || !restaurant) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg(isKm ? 'សូមជ្រើសរើសឯកសាររូបភាពត្រឹមត្រូវ (JPG, PNG, WEBP)' : 'Please select a valid image file');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg(isKm ? 'ទំហំរូបភាពធំជាង ១៥MB សូមជ្រើសរូបភាពផ្សេង' : 'Image exceeds 15MB limit');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg('');
      const compressedDataUrl = await compressImageFile(file, 1280, 800, 0.85);
      setPhotoUrl(compressedDataUrl);
      setUrlInput('');
    } catch {
      setErrorMsg(isKm ? 'មានបញ្ហាក្នុងការអានរូបភាព សូមសាកល្បងម្ដងទៀត' : 'Failed to read image file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image/')) {
      setErrorMsg(isKm ? 'តំណភ្ជាប់ត្រូវចាប់ផ្ដើមដោយ https://' : 'URL must start with https://');
      return;
    }
    setPhotoUrl(trimmed);
    setErrorMsg('');
  };

  const handleSetMainPhoto = (url: string) => {
    setPhotoUrl(url);
  };

  const handleRemoveGalleryPhoto = (idx: number) => {
    setGallery(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddCurrentToGallery = () => {
    if (!photoUrl) return;
    if (!gallery.includes(photoUrl)) {
      setGallery(prev => [...prev, photoUrl]);
    }
  };

  const handleSave = () => {
    if (!photoUrl) {
      setErrorMsg(isKm ? 'សូមបញ្ចូលរូបភាពមុនពេលរក្សាទុក' : 'Please provide a photo before saving');
      return;
    }

    const updatedGallery = [photoUrl, ...gallery].filter((url, idx, self) => url && self.indexOf(url) === idx);

    const updatedRestaurant: Restaurant = {
      ...restaurant,
      photoUrl: photoUrl,
      galleryPhotos: updatedGallery,
    };

    onSave(updatedRestaurant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 font-khmer">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/90 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-[#064E3B] to-[#047857] text-white">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/10 text-emerald-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-moul leading-tight">
                {isKm ? 'ប្តូររូបភាពហាងផ្ទាល់ខ្លួន' : 'Replace Restaurant Photo'}
              </h2>
              <p className="text-[11px] text-emerald-100 line-clamp-1">
                {isKm ? restaurant.nameKh : restaurant.nameEn}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/90 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4 no-scrollbar">
          {/* Live Preview Card */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>{isKm ? 'ទិដ្ឋភាពរូបភាពថ្មី (Preview)' : 'Live Image Preview'}</span>
              <span className="text-[10px] text-slate-400">16:9 Landscape</span>
            </div>

            <div className="relative aspect-16/9 w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner group">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Restaurant Preview" 
                  className="w-full h-full object-cover transition-all duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <ImageIcon className="w-10 h-10 mb-2 stroke-1" />
                  <span className="text-xs">{isKm ? 'មិនទាន់មានរូបភាព' : 'No image selected'}</span>
                </div>
              )}

              {/* Sample label overlay */}
              <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] text-white/90 border border-white/20 select-none pointer-events-none">
                <span>{isKm ? 'រូបតំណាងហាង' : 'Store photo'}</span>
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs">{isKm ? 'កំពុងដំណើរការរូបភាព...' : 'Processing image...'}</span>
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️ {errorMsg}</span>
            </div>
          )}

          {/* Option 1: Upload from Phone / PC */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isKm ? 'ជម្រើសទី ១៖ ជ្រើសរើសរូបភាពពីទូរស័ព្ទ / កុំព្យូទ័រ' : 'Option 1: Upload from Device'}
            </span>
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden" 
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-[#059669]/60 hover:border-[#059669] bg-emerald-50/50 dark:bg-slate-800 hover:bg-emerald-50 text-[#064E3B] dark:text-emerald-300 flex items-center justify-center gap-2 font-bold text-xs transition active:scale-98 cursor-pointer shadow-xs"
            >
              <Upload className="w-4 h-4 text-[#059669]" />
              <span>{isKm ? 'ចុចទីនេះដើម្បីជ្រើសរើសរូបភាពពី Gallery / File' : 'Click to Browse Files / Photos'}</span>
            </button>
          </div>

          {/* Option 2: Image URL */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isKm ? 'ជម្រើសទី ២៖ បញ្ចូលតំណភ្ជាប់រូបភាព (Image URL)' : 'Option 2: Paste Image URL'}
            </span>

            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/restaurant-photo.jpg"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669] outline-none"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition active:scale-95 shrink-0"
              >
                {isKm ? 'មើល' : 'Preview'}
              </button>
            </div>
          </div>

          {/* Existing Gallery Photos */}
          {gallery.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {isKm ? `រូបភាពដែលមានស្រាប់ (${gallery.length} សន្លឹក)` : `Existing Gallery Photos (${gallery.length})`}
                </span>
                <span className="text-[10px] text-slate-500">
                  {isKm ? 'ចុចលើរូបដើម្បីដាក់ជារូបមុខហាង' : 'Tap to set as cover'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {gallery.map((imgUrl, i) => (
                  <div key={i} className="relative group aspect-16/10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100">
                    <img 
                      src={imgUrl} 
                      alt="gallery" 
                      onClick={() => handleSetMainPhoto(imgUrl)}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                    />
                    {photoUrl === imgUrl && (
                      <span className="absolute top-1 left-1 p-1 bg-[#059669] text-white rounded-full text-[8px]">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryPhoto(i)}
                      className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 transition"
                      title={isKm ? 'លុបរូប' : 'Delete'}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {isKm ? 'បោះបង់' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isProcessing || !photoUrl}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#059669] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-emerald-950/20 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isKm ? 'រក្សាទុករូបភាព' : 'Save New Photo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

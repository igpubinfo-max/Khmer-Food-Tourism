import React, { useState, useRef, useEffect } from 'react';
import { TouristDestination } from '../types';
import { 
  X, Upload, Image as ImageIcon, Check, RefreshCw, 
  MapPin, Sliders, Smartphone, Sparkles, CheckCircle2
} from 'lucide-react';

interface TouristImageModalProps {
  destination: TouristDestination | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedDest: TouristDestination) => void;
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
        // Fill white background for transparent images
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

export const TouristImageModal: React.FC<TouristImageModalProps> = ({
  destination,
  isOpen,
  onClose,
  onSave,
  isKm,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [photoUrl, setPhotoUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileDetails, setFileDetails] = useState<{ origSize: string; compSize: string } | null>(null);

  useEffect(() => {
    if (destination) {
      setPhotoUrl(destination.photoUrl || '');
      setUrlInput(destination.photoUrl || '');
      setFitMode('cover');
      setErrorMsg('');
      setFileDetails(null);
    }
  }, [destination, isOpen]);

  if (!isOpen || !destination) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMsg(isKm ? 'សូមជ្រើសរើសប្រភេទរូបភាព JPG, PNG ឬ WebP ប៉ុណ្ណោះ' : 'Please select a JPG, PNG, or WebP image');
      return;
    }

    // Validate size (max 15MB before compression)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg(isKm ? 'ទំហំរូបភាពធំពេក (អតិបរមា 15MB)' : 'File size is too large (max 15MB)');
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);
    try {
      const origMb = (file.size / (1024 * 1024)).toFixed(2);
      const compressedDataUrl = await compressImageFile(file);
      const compKb = (compressedDataUrl.length * 0.75 / 1024).toFixed(0);
      
      setPhotoUrl(compressedDataUrl);
      setUrlInput('');
      setFileDetails({
        origSize: `${origMb} MB`,
        compSize: `${compKb} KB`,
      });
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
    setFileDetails(null);
    setErrorMsg('');
  };

  const handleResetToDefault = () => {
    const defaultUrl = `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80&dest=${destination.id}`;
    setPhotoUrl(defaultUrl);
    setUrlInput(defaultUrl);
    setFileDetails(null);
    setErrorMsg('');
  };

  const handleSave = () => {
    if (!photoUrl.trim()) {
      setErrorMsg(isKm ? 'សូមបញ្ចូលរូបភាព ឬជ្រើសរើសឯកសារ' : 'Please provide an image URL or choose a file');
      return;
    }

    const updated: TouristDestination = {
      ...destination,
      photoUrl: photoUrl.trim(),
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-amber-300/40"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-gradient-to-r from-amber-900 via-stone-900 to-amber-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-moul text-sm text-amber-200">
                {isKm ? 'ផ្លាស់ប្តូររូបភាពកន្លែងទេសចរណ៍' : 'Change Destination Photo'}
              </h3>
              <p className="text-[11px] text-amber-200/80 font-khmer flex items-center gap-1">
                <span>{destination.nameKh}</span>
                <span>•</span>
                <span className="text-amber-300 font-bold">{destination.provinceKh}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 no-scrollbar">
          {/* Destination Summary Card */}
          <div className="p-3 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-stone-900 dark:text-stone-100 font-khmer">
                {destination.nameKh} ({destination.nameEn})
              </div>
              <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 font-khmer">
                <MapPin className="w-3 h-3 text-amber-600" />
                <span>{destination.provinceKh} • {destination.categoryKh}</span>
              </div>
            </div>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              {destination.id}
            </span>
          </div>

          {/* Large Image Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 dark:text-stone-200 font-khmer flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>{isKm ? 'ការមើលរូបភាពជាក់ស្តែង (Live Preview)' : 'Live Preview'}</span>
              </label>

              {/* Fit Mode Toggle */}
              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setFitMode('cover')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    fitMode === 'cover' ? 'bg-amber-600 text-white' : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Cover
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode('contain')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    fitMode === 'contain' ? 'bg-amber-600 text-white' : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Contain
                </button>
              </div>
            </div>

            <div className="relative aspect-16/10 rounded-2xl overflow-hidden bg-stone-900 border-2 border-stone-200 dark:border-stone-700 shadow-inner group">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Destination Preview" 
                  className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'}`}
                  onError={() => setErrorMsg(isKm ? 'មិនអាចបើករូបភាពតាម URL នេះបានទេ' : 'Cannot load image from this URL')}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-500 font-khmer text-xs">
                  <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                  <span>{isKm ? 'គ្មានរូបភាពជ្រើសរើស' : 'No photo selected'}</span>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-xs font-khmer gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  <span>{isKm ? 'កំពុងបង្រួមទំហំរូបភាព...' : 'Optimizing and compressing image...'}</span>
                </div>
              )}

              {/* Size reduction badge if compressed */}
              {fileDetails && (
                <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 bg-emerald-950/80 backdrop-blur-md rounded-lg text-emerald-300 text-[10px] font-mono border border-emerald-500/40 flex items-center gap-1 shadow">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{fileDetails.origSize} ➔ {fileDetails.compSize}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action 1: Upload from Phone / Device Gallery */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 dark:text-amber-200 font-khmer flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-600" />
                <span>{isKm ? 'វិធីទី១៖ ជ្រើសរើសរូបពីទូរស័ព្ទ / កុំព្យូទ័រ' : 'Option 1: Choose from Phone / Computer'}</span>
              </span>
              <span className="text-[10px] text-amber-800 dark:text-amber-300 font-khmer">JPG, PNG, WebP</span>
            </div>

            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/jpeg,image/png,image/webp,image/jpg" 
              className="hidden" 
              onChange={handleFileChange} 
            />

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-khmer font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isKm ? 'ជ្រើសរើសរូបភាពពីវិចិត្រសាល (Gallery / File)' : 'Select Image from Device Gallery'}</span>
            </button>
            <p className="text-[10px] text-stone-500 font-khmer text-center">
              {isKm 
                ? 'រូបភាពនឹងត្រូវបង្រួមទំហំស្វ័យប្រវត្តិកម្រិត HD ដើម្បីផ្ទុកលឿន និងសន្សំទំហំទូរស័ព្ទ' 
                : 'Image is automatically compressed to HD for fast loading and reduced data usage'}
            </p>
          </div>

          {/* Action 2: Direct Image URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 font-khmer block">
              {isKm ? 'វិធីទី២៖ ឬបញ្ចូលតំណភ្ជាប់រូបភាព (Image URL)' : 'Option 2: Or Paste Image URL'}
            </label>
            <div className="flex gap-2">
              <input 
                type="url" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-white dark:bg-stone-700 dark:hover:bg-stone-600 text-xs font-khmer font-bold rounded-xl transition"
              >
                {isKm ? 'ដាក់រូប' : 'Apply'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs font-khmer">
              {errorMsg}
            </div>
          )}

          {/* Revert to default */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-[11px] text-stone-500 hover:text-amber-600 font-khmer flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{isKm ? 'កំណត់រូបភាពដើមឡើងវិញ' : 'Reset to default image'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-khmer text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            {isKm ? 'បោះបង់' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={isProcessing || !photoUrl.trim()}
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-khmer font-bold text-xs shadow-md flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isKm ? 'រក្សាទុករូបភាព' : 'Save Photo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

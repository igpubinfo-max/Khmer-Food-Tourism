import React, { useState, useRef, useEffect } from 'react';
import { TouristDestination } from '../types';
import { 
  X, Upload, Image as ImageIcon, Check, RefreshCw, 
  MapPin, Smartphone, Sparkles, CheckCircle2, AlertCircle
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

// Compress large Data URL strings directly (to avoid localStorage quota overflow)
const compressDataUrl = (
  dataUrl: string,
  maxWidth = 1200,
  maxHeight = 800,
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve) => {
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
        resolve(dataUrl);
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
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

// Normalize and validate any image format (HTTP/HTTPS, Data URL, or raw Base64)
export const normalizeAndValidateImage = (
  input: string,
  isKm = true
): { isValid: boolean; normalizedUrl: string; error?: string } => {
  const trimmed = (input || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      normalizedUrl: '',
      error: isKm ? 'សូមបញ្ចូលតំណភ្ជាប់រូបភាព ឬជ្រើសរើសឯកសារ' : 'Please provide an image URL or choose a file'
    };
  }

  // 1. Data URL format: data:image/webp;base64,... or data:image/jpeg;base64,...
  if (trimmed.startsWith('data:image/')) {
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx === -1 || commaIdx === trimmed.length - 1) {
      return {
        isValid: false,
        normalizedUrl: '',
        error: isKm ? 'ទម្រង់ Data URL មិនត្រឹមត្រូវ (ខ្វះទិន្នន័យ Base64)' : 'Invalid Data URL format (Missing Base64 payload)'
      };
    }
    return { isValid: true, normalizedUrl: trimmed };
  }

  // 2. Raw Base64 string without data:image/ scheme (auto-detect signature)
  if (
    trimmed.startsWith('/9j/') || // JPEG
    trimmed.startsWith('iVBOR') || // PNG
    trimmed.startsWith('UklGR') || // WebP
    trimmed.startsWith('R0lGO')    // GIF
  ) {
    let mime = 'image/jpeg';
    if (trimmed.startsWith('iVBOR')) mime = 'image/png';
    else if (trimmed.startsWith('UklGR')) mime = 'image/webp';
    else if (trimmed.startsWith('R0lGO')) mime = 'image/gif';
    return { isValid: true, normalizedUrl: `data:${mime};base64,${trimmed}` };
  }

  // 3. HTTP / HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      new URL(trimmed);
      return { isValid: true, normalizedUrl: trimmed };
    } catch {
      return {
        isValid: false,
        normalizedUrl: '',
        error: isKm ? 'តំណភ្ជាប់ URL មិនត្រឹមត្រូវ' : 'Invalid URL syntax'
      };
    }
  }

  // 4. Local relative paths (/foods/..., /images/...)
  if (trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return { isValid: true, normalizedUrl: trimmed };
  }

  return {
    isValid: false,
    normalizedUrl: '',
    error: isKm 
      ? 'សូមបញ្ចូលតំណភ្ជាប់រូបភាព (https://...) ឬ Data URL (data:image/...)' 
      : 'Please provide a valid image URL (https://...) or Data URL (data:image/...)'
  };
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

    // Validate size (max 20MB before compression)
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg(isKm ? 'ទំហំរូបភាពធំពេក (អតិបរមា 20MB)' : 'File size is too large (max 20MB)');
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
      setErrorMsg(err.message || (isKm ? 'បរាជ័យក្នុងការដំណើរការរូបភាព' : 'Error processing image'));
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Immediate Live Preview as the user types or pastes into the URL / Base64 box
  const handleUrlInputChange = (val: string) => {
    setUrlInput(val);
    setErrorMsg('');
    const check = normalizeAndValidateImage(val, isKm);
    if (check.isValid) {
      setPhotoUrl(check.normalizedUrl);
      setFileDetails(null);
    }
  };

  const handleApplyUrl = () => {
    const check = normalizeAndValidateImage(urlInput, isKm);
    if (!check.isValid) {
      setErrorMsg(check.error || (isKm ? 'ទម្រង់រូបភាពមិនត្រឹមត្រូវ' : 'Invalid image format'));
      return;
    }
    setPhotoUrl(check.normalizedUrl);
    setFileDetails(null);
    setErrorMsg('');
  };

  const handleResetToDefault = () => {
    const defaultUrl = `https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Royal_Palace%2C_Phnom_Penh_Cambodia_1.jpg/960px-Royal_Palace%2C_Phnom_Penh_Cambodia_1.jpg`;
    setPhotoUrl(defaultUrl);
    setUrlInput(defaultUrl);
    setFileDetails(null);
    setErrorMsg('');
  };

  const handleSave = async () => {
    setErrorMsg('');
    setIsProcessing(true);

    // Determine candidate: prioritize what's currently in urlInput if typed/pasted, else photoUrl
    const candidate = urlInput.trim() ? urlInput.trim() : photoUrl.trim();
    const check = normalizeAndValidateImage(candidate, isKm);

    if (!check.isValid) {
      setErrorMsg(check.error || (isKm ? 'សូមបញ្ចូលរូបភាព ឬជ្រើសរើសឯកសារត្រឹមត្រូវ' : 'Please provide a valid image'));
      setIsProcessing(false);
      return;
    }

    let finalPhotoUrl = check.normalizedUrl;

    // If large Data URL (> 400KB), compress before storing to protect localStorage
    if (finalPhotoUrl.startsWith('data:image/') && finalPhotoUrl.length > 400 * 1024) {
      try {
        finalPhotoUrl = await compressDataUrl(finalPhotoUrl);
      } catch (compErr) {
        console.warn('Data URL compression skipped, using original:', compErr);
      }
    }

    const updated: TouristDestination = {
      ...destination,
      photoUrl: finalPhotoUrl,
    };

    try {
      await Promise.resolve(onSave(updated));
      setPhotoUrl(finalPhotoUrl);
      onClose();
    } catch (saveErr: any) {
      console.error('Error saving destination photo:', saveErr);
      setErrorMsg(isKm ? 'បរាជ័យក្នុងការរក្សាទុករូបភាព។ សូមព្យាយាមម្ដងទៀត។' : 'Failed to save photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#047857] flex items-center justify-between bg-[#064E3B] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 text-emerald-300 rounded-xl border border-white/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-moul text-sm text-white">
                {isKm ? 'ផ្លាស់ប្តូររូបភាពកន្លែងទេសចរណ៍' : 'Change Destination Photo'}
              </h3>
              <p className="text-[11px] text-emerald-200 font-khmer flex items-center gap-1">
                <span>{destination.nameKh}</span>
                <span>•</span>
                <span className="text-emerald-200 font-bold">{destination.provinceKh}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 no-scrollbar">
          {/* Destination Summary Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-[#0F172A] dark:text-slate-100 font-khmer">
                {destination.nameKh} ({destination.nameEn})
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-khmer">
                <MapPin className="w-3 h-3 text-[#059669]" />
                <span>{destination.provinceKh} • {destination.categoryKh}</span>
              </div>
            </div>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-[#064E3B] border border-slate-200">
              {destination.id}
            </span>
          </div>

          {/* Large Image Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0F172A] dark:text-slate-200 font-khmer flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#059669]" />
                <span>{isKm ? 'ការមើលរូបភាពជាក់ស្តែង (Live Preview)' : 'Live Preview'}</span>
              </label>

              {/* Fit Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setFitMode('cover')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    fitMode === 'cover' ? 'bg-[#064E3B] text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Cover
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode('contain')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    fitMode === 'contain' ? 'bg-[#064E3B] text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Contain
                </button>
              </div>
            </div>

            <div className="relative aspect-16/10 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-inner group">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Destination Preview" 
                  className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'}`}
                  onError={() => setErrorMsg(isKm ? 'មិនអាចបើករូបភាពតាមប្រភពនេះបានទេ សូមពិនិត្យឡើងវិញ' : 'Cannot load image from this source')}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-khmer text-xs">
                  <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                  <span>{isKm ? 'គ្មានរូបភាពជ្រើសរើស' : 'No photo selected'}</span>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-xs font-khmer gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-300" />
                  <span>{isKm ? 'កំពុងដំណើរការ និងបង្រួមទំហំរូបភាព...' : 'Processing and optimizing image...'}</span>
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
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F172A] dark:text-emerald-300 font-khmer flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#059669]" />
                <span>{isKm ? 'វិធីទី១៖ ជ្រើសរើសរូបពីទូរស័ព្ទ / កុំព្យូទ័រ' : 'Option 1: Choose from Phone / Computer'}</span>
              </span>
              <span className="text-[10px] text-slate-500 font-khmer font-bold">JPG, PNG, WebP</span>
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
              className="w-full py-3 px-4 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-khmer font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-300" />
              <span>{isKm ? 'ជ្រើសរើសរូបភាពពីវិចិត្រសាល (Gallery / File)' : 'Select Image from Device Gallery'}</span>
            </button>
            <p className="text-[10px] text-slate-500 font-khmer text-center">
              {isKm 
                ? 'រូបភាពនឹងត្រូវបង្រួមទំហំស្វ័យប្រវត្តិកម្រិត HD ដើម្បីផ្ទុកលឿន និងសន្សំទំហំទូរស័ព្ទ' 
                : 'Image is automatically compressed to HD for fast loading and reduced data usage'}
            </p>
          </div>

          {/* Action 2: Direct Image URL or Base64 / Data URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0F172A] dark:text-slate-200 font-khmer block">
              {isKm ? 'វិធីទី២៖ ឬបញ្ចូលតំណភ្ជាប់រូបភាព (Image URL / Base64)' : 'Option 2: Or Paste Image URL or Base64'}
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={urlInput}
                onChange={(e) => handleUrlInputChange(e.target.value)}
                placeholder="https://... ឬ data:image/webp;base64,..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3.5 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-khmer font-bold rounded-xl transition active:scale-95 cursor-pointer"
              >
                {isKm ? 'ដាក់រូប' : 'Apply'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-khmer">
              {isKm 
                ? 'គាំទ្រតំណភ្ជាប់ HTTPS, Data URL (data:image/...) និងកូដ Base64' 
                : 'Supports HTTPS URLs, Data URLs (data:image/...), and Base64'}
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs font-khmer flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Revert to default */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-[11px] text-slate-500 hover:text-[#064E3B] font-khmer flex items-center gap-1 transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{isKm ? 'កំណត់រូបភាពដើមឡើងវិញ' : 'Reset to default image'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-khmer text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {isKm ? 'បោះបង់' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-khmer font-bold text-xs shadow-md shadow-emerald-950/20 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 text-emerald-300 animate-spin" />
            ) : (
              <Check className="w-4 h-4 text-emerald-300" />
            )}
            <span>{isKm ? 'រក្សាទុករូបភាព' : 'Save Photo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { Restaurant } from '../types';
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Camera,
  Trash2,
  Utensils,
  Store,
} from 'lucide-react';
import {
  pickImageUsingNativeAndroidGallery,
  processAndCompressImageFile,
} from '../utils/androidMediaHelper';

interface RestaurantImageModalProps {
  restaurant: Restaurant | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRest: Restaurant) => void;
  isKm: boolean;
}

export const RestaurantImageModal: React.FC<RestaurantImageModalProps> = ({
  restaurant,
  isOpen,
  onClose,
  onSave,
  isKm,
}) => {
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const profileCameraInputRef = useRef<HTMLInputElement>(null);
  const shopGalleryFileInputRef = useRef<HTMLInputElement>(null);
  const shopGalleryCameraInputRef = useRef<HTMLInputElement>(null);
  const foodFileInputRef = useRef<HTMLInputElement>(null);
  const foodCameraInputRef = useRef<HTMLInputElement>(null);

  const [photoUrl, setPhotoUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shopPhotos, setShopPhotos] = useState<string[]>([]);
  const [foodPhotos, setFoodPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (restaurant && isOpen) {
      const initialProfile = restaurant.profileImage || restaurant.photoUrl || '';
      setPhotoUrl(initialProfile);
      setUrlInput(initialProfile);
      const initialShopGallery = Array.from(
        new Set([
          initialProfile,
          ...(restaurant.galleryPhotos || []),
        ])
      ).filter(Boolean);
      setShopPhotos(initialShopGallery);

      const shopGallerySet = new Set(initialShopGallery);
      const initialFood = Array.from(
        new Set((restaurant.foodImages || []).filter((u) => u && !shopGallerySet.has(u)))
      );
      setFoodPhotos(initialFood);
      setErrorMsg('');
    }
  }, [restaurant, isOpen]);

  if (!isOpen || !restaurant) return null;

  const handlePickProfileNativeOrFallback = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const nativePick = await pickImageUsingNativeAndroidGallery();
      if (nativePick.cancelled) {
        setIsProcessing(false);
        return;
      }
      if (nativePick.success && nativePick.dataUrl) {
        const nextUrl = nativePick.dataUrl;
        setPhotoUrl(nextUrl);
        setShopPhotos((prev) => Array.from(new Set([nextUrl, ...prev])).filter(Boolean));
        setUrlInput('');
        setIsProcessing(false);
        return;
      }
    } catch {
      // fallback
    }
    setIsProcessing(false);
    profileFileInputRef.current?.click();
  };

  const handleProfileFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg('');
    try {
      const dataUrl = await processAndCompressImageFile(file);
      setPhotoUrl(dataUrl);
      setShopPhotos((prev) => Array.from(new Set([dataUrl, ...prev])).filter(Boolean));
      setUrlInput('');
    } catch (err: any) {
      setErrorMsg(err?.message || (isKm ? 'រូបភាពមិនត្រឹមត្រូវ' : 'Invalid image'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShopGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg('');
    const added: string[] = [];
    for (const file of files.slice(0, 8)) {
      try {
        const dataUrl = await processAndCompressImageFile(file);
        if (dataUrl) added.push(dataUrl);
      } catch (err: any) {
        setErrorMsg(err?.message || (isKm ? 'រូបភាពមិនត្រឹមត្រូវ' : 'Invalid image'));
      }
    }
    setIsProcessing(false);

    if (added.length > 0) {
      setShopPhotos((prev) => {
        const next = Array.from(new Set([...(photoUrl ? [photoUrl] : []), ...prev, ...added])).slice(0, 20);
        if (!photoUrl && next.length > 0) {
          setPhotoUrl(next[0]);
        }
        return next;
      });
    }
  };

  const handleReplaceShopPhoto = async (idx: number) => {
    try {
      const nativePick = await pickImageUsingNativeAndroidGallery();
      if (nativePick.success && nativePick.dataUrl) {
        const nextUrl = nativePick.dataUrl;
        setShopPhotos((prev) => {
          const updated = prev.map((item, i) => (i === idx ? nextUrl : item));
          if (idx === 0) setPhotoUrl(nextUrl);
          return updated;
        });
      }
    } catch {
      // ignore
    }
  };

  const handleRemoveShopPhoto = (idx: number) => {
    setShopPhotos((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (idx === 0 && next.length > 0) {
        setPhotoUrl(next[0]);
      }
      return next;
    });
  };

  const handleFoodFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg('');
    const added: string[] = [];
    for (const file of files.slice(0, 8)) {
      try {
        const dataUrl = await processAndCompressImageFile(file);
        if (dataUrl) added.push(dataUrl);
      } catch (err: any) {
        setErrorMsg(err?.message || (isKm ? 'រូបភាពមិនត្រឹមត្រូវ' : 'Invalid image'));
      }
    }
    setIsProcessing(false);

    if (added.length > 0) {
      setFoodPhotos((prev) => [...prev, ...added].slice(0, 12));
    }
  };

  const handleReplaceFoodPhoto = async (idx: number) => {
    try {
      const nativePick = await pickImageUsingNativeAndroidGallery();
      if (nativePick.success && nativePick.dataUrl) {
        setFoodPhotos((prev) => prev.map((item, i) => (i === idx ? nativePick.dataUrl! : item)));
      }
    } catch {
      // ignore
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('data:image/') &&
      !trimmed.startsWith('/')
    ) {
      setErrorMsg(isKm ? 'តំណភ្ជាប់ត្រូវចាប់ផ្ដើមដោយ https://' : 'URL must start with https://');
      return;
    }
    setPhotoUrl(trimmed);
    setShopPhotos((prev) => Array.from(new Set([trimmed, ...prev])).filter(Boolean));
    setErrorMsg('');
  };

  const handleRemoveFoodPhoto = (idx: number) => {
    setFoodPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const finalCover = photoUrl || shopPhotos[0] || '';
    if (!finalCover) {
      setErrorMsg(isKm ? 'សូមបញ្ចូលរូបភាពតំណាងហាងមុនពេលរក្សាទុក' : 'Please provide a shop profile photo before saving');
      return;
    }

    const updatedGallery = Array.from(new Set([finalCover, ...shopPhotos])).filter(Boolean);
    const gallerySet = new Set(updatedGallery);
    const cleanFoodPhotos = foodPhotos.filter((u) => u && !gallerySet.has(u));

    const updatedRestaurant: Restaurant = {
      ...restaurant,
      photoUrl: finalCover,
      profileImage: finalCover,
      foodImages: cleanFoodPhotos,
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
                {isKm ? 'កែប្រែរូបតំណាងហាង & រូបភាពមុខម្ហូប' : 'Edit Shop Profile & Food Photos'}
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
          {/* 1. Shop Photos Section (រូបហាង) */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/70 border border-emerald-200 dark:border-emerald-800/60">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100">
              <span className="flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>
                  {isKm
                    ? `១. រូបហាង (Shop Photos - ${shopPhotos.length} សន្លឹក)`
                    : `1. Shop Photos (${shopPhotos.length})`}
                </span>
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                {isKm ? 'រូបហាង' : 'Shop Category'}
              </span>
            </div>

            <div className="relative aspect-16/9 w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Restaurant Profile Preview"
                  className="w-full h-full object-cover transition-all duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <ImageIcon className="w-10 h-10 mb-2 stroke-1" />
                  <span className="text-xs">{isKm ? 'មិនទាន់មានរូបភាព' : 'No image selected'}</span>
                </div>
              )}

              <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-black/70 text-[10px] text-white font-bold">
                {isKm ? 'រូបហាង' : 'Shop Photo'}
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs">{isKm ? 'កំពុងដំណើរការរូបភាព...' : 'Processing image...'}</span>
                </div>
              )}
            </div>

            {shopPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {shopPhotos.map((imgUrl, i) => (
                  <div
                    key={i}
                    className={`relative group aspect-square rounded-xl overflow-hidden border-2 bg-slate-900 ${
                      photoUrl === imgUrl ? 'border-emerald-600 ring-2 ring-emerald-500/40' : 'border-emerald-300 dark:border-emerald-700'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Shop ${i + 1}`}
                      onClick={() => setPhotoUrl(imgUrl)}
                      className="w-full h-full object-cover cursor-pointer"
                    />
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-bold">
                      {isKm ? 'រូបហាង' : 'Shop'}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-1 bg-black/75 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => handleReplaceShopPhoto(i)}
                        className="px-1.5 py-0.5 rounded bg-white/90 text-slate-900 font-bold text-[9px] cursor-pointer"
                      >
                        {isKm ? 'ប្តូរ' : 'Replace'}
                      </button>
                      {shopPhotos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveShopPhoto(i)}
                          className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[9px] cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5 inline" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <input
              type="file"
              ref={profileFileInputRef}
              onChange={handleProfileFileChange}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
            />
            <input
              type="file"
              ref={profileCameraInputRef}
              onChange={handleProfileFileChange}
              accept="image/jpeg,image/jpg,image/png"
              capture="environment"
              className="hidden"
            />
            <input
              type="file"
              ref={shopGalleryFileInputRef}
              onChange={handleShopGalleryFilesChange}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={shopGalleryCameraInputRef}
              onChange={handleShopGalleryFilesChange}
              accept="image/jpeg,image/jpg,image/png"
              capture="environment"
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => shopGalleryFileInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white flex items-center justify-center gap-1.5 font-bold text-xs transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{isKm ? 'បន្ថែមរូបហាងពី Gallery' : 'Add Shop Photos'}</span>
              </button>
              <button
                type="button"
                onClick={() => shopGalleryCameraInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 font-bold text-xs transition cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{isKm ? 'ថតរូបហាងថ្មី (Camera)' : 'Camera Shop Photo'}</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️ {errorMsg}</span>
            </div>
          )}

          {/* 2. Food Photos (Multiple Images) Section */}
          <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-slate-800/70 border border-amber-300 dark:border-amber-700/50 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-amber-600" />
                <span>
                  {isKm
                    ? `២. រូបភាពមុខម្ហូបប្រចាំហាង (Food Photos - ${foodPhotos.length} សន្លឹក)`
                    : `2. Food Photos (${foodPhotos.length})`}
                </span>
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                {isKm ? 'ច្រើនសន្លឹក' : 'Multiple'}
              </span>
            </div>

            <input
              type="file"
              ref={foodFileInputRef}
              onChange={handleFoodFilesChange}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={foodCameraInputRef}
              onChange={handleFoodFilesChange}
              accept="image/jpeg,image/jpg,image/png"
              capture="environment"
              className="hidden"
            />

            {foodPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {foodPhotos.map((imgUrl, i) => (
                  <div
                    key={i}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-amber-400 bg-slate-900"
                  >
                    <img
                      src={imgUrl}
                      alt={`Food ${i + 1}`}
                      onClick={() => setPhotoUrl(imgUrl)}
                      className="w-full h-full object-cover cursor-pointer"
                    />
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-bold">
                      {isKm ? `ម្ហូបទី ${i + 1}` : `Food ${i + 1}`}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-1 bg-black/75 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => handleReplaceFoodPhoto(i)}
                        className="px-1.5 py-0.5 rounded bg-white/90 text-slate-900 font-bold text-[9px] cursor-pointer"
                      >
                        {isKm ? 'ប្តូរ' : 'Replace'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFoodPhoto(i)}
                        className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[9px] cursor-pointer"
                      >
                        <Trash2 className="w-2.5 h-2.5 inline" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 text-center py-2">
                {isKm
                  ? 'មិនទាន់មានរូបភាពមុខម្ហូបបន្ថែមនៅឡើយទេ។'
                  : 'No additional food photos uploaded yet.'}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => foodFileInputRef.current?.click()}
                className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isKm ? 'បន្ថែមរូបម្ហូបពី Gallery' : 'Add Food Photos'}</span>
              </button>
              <button
                type="button"
                onClick={() => foodCameraInputRef.current?.click()}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isKm ? 'ថតរូបម្ហូប (Camera)' : 'Camera Food Photo'}</span>
              </button>
            </div>
          </div>

          {/* Option 3: Direct Image URL */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isKm ? 'ឬ បញ្ចូលតំណភ្ជាប់រូបភាព (Image URL)' : 'Or Paste Image URL'}
            </span>

            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/restaurant-photo.jpg"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition shrink-0"
              >
                {isKm ? 'មើល' : 'Preview'}
              </button>
            </div>
          </div>
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
            disabled={isProcessing || (!photoUrl && shopPhotos.length === 0)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#059669] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-emerald-950/20 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isKm ? 'រក្សាទុករូបភាពទាំងអស់' : 'Save Photos'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

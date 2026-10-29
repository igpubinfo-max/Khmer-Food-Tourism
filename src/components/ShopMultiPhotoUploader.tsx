import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Trash2,
  Star,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Plus,
  Sparkles,
  Layers,
  CheckCircle2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  isNativeAndroidOrIosPlatform,
  pickImageUsingNativeAndroidGallery,
  pickMultipleImagesUsingNativeAndroidGallery,
  processAndCompressImageFile,
  batchProcessAndCompressImageFiles,
} from '../utils/androidMediaHelper';
import { searchOnlineFoodImages, OnlineFoodImageCandidate } from '../services/onlineFoodImageService';

export interface ShopMultiPhotoUploaderProps {
  photos: string[];
  onChangePhotos: (photos: string[]) => void;
  maxPhotos?: number;
  isKm?: boolean;
  shopName?: string;
  signatureDish?: string;
  onToast?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const ShopMultiPhotoUploader: React.FC<ShopMultiPhotoUploaderProps> = ({
  photos,
  onChangePhotos,
  maxPhotos = 20,
  isKm = true,
  shopName = '',
  signatureDish = '',
  onToast,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineCandidates, setOnlineCandidates] = useState<OnlineFoodImageCandidate[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetIndexRef = useRef<number | null>(null);

  const samplePhotos = [
    '/foods/food-1.jpg',
    '/foods/food-2.jpg',
    '/foods/food-3.jpg',
    '/foods/food-4.jpg',
    '/foods/food-5.jpg',
    '/foods/food-6.jpg',
  ];

  const toast = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => {
    if (onToast) onToast(msg, type);
  };

  // 1. Pick Multiple Photos from Gallery in ONE step
  const handlePickMultiplePhotos = async () => {
    if (photos.length >= maxPhotos) {
      toast(
        isKm ? `⚠️ អាចផ្ទុករូបភាពបានអតិបរមា ${maxPhotos} សន្លឹកប៉ុណ្ណោះ!` : `⚠️ Maximum ${maxPhotos} photos allowed!`,
        'warning'
      );
      return;
    }

    if (!isNativeAndroidOrIosPlatform()) {
      fileInputRef.current?.click();
      return;
    }

    setIsProcessing(true);
    try {
      const remainingSlots = maxPhotos - photos.length;
      const nativePick = await pickMultipleImagesUsingNativeAndroidGallery(remainingSlots, 1200);

      if (nativePick.cancelled) {
        setIsProcessing(false);
        return;
      }

      if (nativePick.success && Array.isArray(nativePick.dataUrls) && nativePick.dataUrls.length > 0) {
        const nextList = [...photos, ...nativePick.dataUrls].slice(0, maxPhotos);
        onChangePhotos(nextList);
        toast(
          isKm
            ? `✅ បានបន្ថែមរូបភាពចំនួន ${nativePick.dataUrls.length} សន្លឹកជោគជ័យ!`
            : `✅ Added ${nativePick.dataUrls.length} photo(s) successfully!`,
          'success'
        );
        setIsProcessing(false);
        return;
      }
    } catch {
      // Fallback to web multi-file input
    }

    setIsProcessing(false);
    fileInputRef.current?.click();
  };

  // 2. Handle HTML multi-file selection (Web + Fallback)
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      const remainingSlots = maxPhotos - photos.length;
      const dataUrls = await batchProcessAndCompressImageFiles(files, remainingSlots, 1200, 0.84);
      if (dataUrls.length > 0) {
        const nextList = [...photos, ...dataUrls].slice(0, maxPhotos);
        onChangePhotos(nextList);
        toast(
          isKm
            ? `✅ បានបន្ថែមរូបភាពចំនួន ${dataUrls.length} សន្លឹកជោគជ័យ!`
            : `✅ Added ${dataUrls.length} photo(s) successfully!`,
          'success'
        );
      } else {
        toast(isKm ? '⚠️ មិនអាចអានឯកសាររូបភាពបានទេ' : '⚠️ Could not read image files', 'warning');
      }
    } catch (err: any) {
      toast(err?.message || (isKm ? 'រូបភាពមិនត្រឹមត្រូវ' : 'Invalid image file'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Take Photo with Native Camera
  const handleCameraCapture = () => {
    if (photos.length >= maxPhotos) {
      toast(
        isKm ? `⚠️ អាចផ្ទុករូបភាពបានអតិបរមា ${maxPhotos} សន្លឹកប៉ុណ្ណោះ!` : `⚠️ Maximum ${maxPhotos} photos allowed!`,
        'warning'
      );
      return;
    }
    cameraInputRef.current?.click();
  };

  const handleCameraFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsProcessing(true);
    try {
      const dataUrl = await processAndCompressImageFile(file, 1200, 0.85);
      if (dataUrl) {
        onChangePhotos([...photos, dataUrl].slice(0, maxPhotos));
        toast(isKm ? '✅ បានថតរូបភាពថ្មីជោគជ័យ!' : '✅ Photo captured successfully!', 'success');
      }
    } catch (err: any) {
      toast(err?.message || (isKm ? 'រូបភាពមិនត្រឹមត្រូវ' : 'Invalid photo'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Remove a photo
  const handleRemovePhoto = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = photos.filter((_, i) => i !== index);
    onChangePhotos(updated);
    if (previewIndex === index) {
      setPreviewIndex(null);
    } else if (previewIndex !== null && previewIndex > index) {
      setPreviewIndex(previewIndex - 1);
    }
    toast(isKm ? '🗑️ បានលុបរូបភាពចេញ' : '🗑️ Photo removed', 'info');
  };

  // 5. Reorder Photos: Move Left / Earlier
  const handleMoveLeft = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (index <= 0) return;
    const nextList = [...photos];
    const temp = nextList[index];
    nextList[index] = nextList[index - 1];
    nextList[index - 1] = temp;
    onChangePhotos(nextList);
    if (previewIndex === index) setPreviewIndex(index - 1);
  };

  // 6. Reorder Photos: Move Right / Later
  const handleMoveRight = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (index >= photos.length - 1) return;
    const nextList = [...photos];
    const temp = nextList[index];
    nextList[index] = nextList[index + 1];
    nextList[index + 1] = temp;
    onChangePhotos(nextList);
    if (previewIndex === index) setPreviewIndex(index + 1);
  };

  // 7. Set as Cover Photo (moves photo to index 0)
  const handleSetAsCover = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (index === 0) return;
    const selected = photos[index];
    const remaining = photos.filter((_, i) => i !== index);
    onChangePhotos([selected, ...remaining]);
    if (previewIndex !== null) setPreviewIndex(0);
    toast(
      isKm ? '★ បានកំណត់ជារូបភាពតំណាងហាងចម្បង (Cover Photo)!' : '★ Set as main shop cover photo!',
      'success'
    );
  };

  // 8. Replace a specific photo
  const handleReplacePhoto = async (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isNativeAndroidOrIosPlatform()) {
      replaceTargetIndexRef.current = index;
      replaceInputRef.current?.click();
      return;
    }
    try {
      const nativePick = await pickImageUsingNativeAndroidGallery();
      if (nativePick.cancelled) return;
      if (nativePick.success && nativePick.dataUrl) {
        const updated = photos.map((item, i) => (i === index ? nativePick.dataUrl! : item));
        onChangePhotos(updated);
        toast(isKm ? '✅ បានប្តូររូបភាពជោគជ័យ!' : '✅ Photo replaced!', 'success');
        return;
      }
    } catch {}
    replaceTargetIndexRef.current = index;
    replaceInputRef.current?.click();
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const targetIdx = replaceTargetIndexRef.current;
    if (!file || targetIdx === null) return;

    try {
      const dataUrl = await processAndCompressImageFile(file, 1200, 0.85);
      if (dataUrl) {
        const updated = photos.map((item, i) => (i === targetIdx ? dataUrl : item));
        onChangePhotos(updated);
        toast(isKm ? '✅ បានប្តូររូបភាពជោគជ័យ!' : '✅ Photo replaced!', 'success');
      }
    } catch (err: any) {
      toast(err?.message || (isKm ? 'រូបភាពមិនត្រឹមត្រូវ' : 'Invalid image'), 'error');
    } finally {
      replaceTargetIndexRef.current = null;
    }
  };

  // 9. AI Online Food Search
  const handleSearchOnlinePhotos = async () => {
    setIsSearchingOnline(true);
    try {
      const qKh = signatureDish.trim() || shopName.trim() || 'ម្ហូបខ្មែរ';
      const results = await searchOnlineFoodImages({
        nameKh: qKh,
        nameEn: qKh,
        categorySlug: 'soup',
        existingUrls: photos,
      });
      setOnlineCandidates(results);
      if (results.length > 0) {
        const newUrls = results.map(r => r.url).filter(u => !photos.includes(u));
        if (newUrls.length > 0) {
          onChangePhotos([...photos, ...newUrls].slice(0, maxPhotos));
          toast(
            isKm
              ? `✨ បានបន្ថែមរូបភាពម្ហូបពី Online ចំនួន ${newUrls.length} សន្លឹក!`
              : `✨ Added ${newUrls.length} online food photos!`,
            'success'
          );
        } else {
          toast(isKm ? 'រូបភាពទាំងនេះមានរួចហើយ' : 'These photos are already added', 'info');
        }
      }
    } catch {
      toast(isKm ? 'មិនអាចស្វែងរករូបភាពពី Online បានទេ' : 'Failed to search online food photos', 'warning');
    } finally {
      setIsSearchingOnline(false);
    }
  };

  return (
    <div className="space-y-3 font-khmer">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        capture="environment"
        onChange={handleCameraFileChange}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleReplaceFileChange}
        className="hidden"
      />

      {/* Header Info Banner */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-amber-500" />
          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
            {isKm ? 'រូបភាពតំណាងហាង & រូបភាពមុខម្ហូប (Shop & Food Photos)' : 'Shop Profile & Food Photos'}
          </h4>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] font-sans">
          {photos.length} / {maxPhotos} {isKm ? 'សន្លឹក' : 'Photos'}
        </span>
      </div>

      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
        {isKm
          ? 'លោកអ្នកអាចជ្រើសរូបភាពច្រើនសន្លឹកក្នុងពេលតែមួយពី Gallery, កំណត់រូបតំណាងហាងចម្បង (Cover), និងរៀបចំលំដាប់លំដោយរូបភាពតាមចិត្តបានយ៉ាងងាយស្រួល។'
          : 'Select several photos at once from your gallery, choose your main cover photo, and reorder photos freely.'}
      </p>

      {/* Main Action Buttons: Multi-Upload Gallery + Camera */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isProcessing || photos.length >= maxPhotos}
          onClick={handlePickMultiplePhotos}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-[#064E3B] to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          <Upload className={`w-4 h-4 ${isProcessing ? 'animate-bounce' : ''}`} />
          <span>
            {isProcessing
              ? (isKm ? 'កំពុងដំណើរការរូបភាព...' : 'Processing Photos...')
              : (isKm ? '📸 ជ្រើសរូបច្រើនសន្លឹកពី Gallery (Multi-Select)' : '📸 Select Multiple Photos from Gallery')}
          </span>
        </button>

        <button
          type="button"
          disabled={isProcessing || photos.length >= maxPhotos}
          onClick={handleCameraCapture}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          <Camera className="w-4 h-4 text-slate-950" />
          <span>{isKm ? '📷 ថតរូបថ្មី (Camera Capture)' : '📷 Take New Photo (Camera)'}</span>
        </button>
      </div>

      {/* Preset Khmer Food Quick Picks */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span>{isKm ? 'ឬជ្រើសរូបគំរូម្ហូបខ្មែររហ័ស (Preset Samples):' : 'Or quick-pick preset sample photos:'}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {samplePhotos.map((url, i) => {
            const isAdded = photos.includes(url);
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (isAdded) {
                    onChangePhotos(photos.filter(p => p !== url));
                  } else if (photos.length < maxPhotos) {
                    onChangePhotos([...photos, url]);
                  }
                }}
                className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                  isAdded
                    ? 'border-emerald-600 ring-2 ring-emerald-500/50 scale-95'
                    : 'border-slate-300 dark:border-slate-700 opacity-70 hover:opacity-100 hover:scale-105'
                }`}
                title={isAdded ? (isKm ? 'បានជ្រើសរើស' : 'Selected') : (isKm ? 'ចុចដើម្បីបន្ថែម' : 'Click to add')}
              >
                <img src={url} alt="sample" className="w-full h-full object-cover" />
                {isAdded && (
                  <div className="absolute inset-0 bg-emerald-950/60 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Online Search Helper Button */}
      <button
        type="button"
        disabled={isSearchingOnline || photos.length >= maxPhotos}
        onClick={handleSearchOnlinePhotos}
        className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300/80 dark:border-slate-700 transition cursor-pointer"
      >
        <Sparkles className={`w-3.5 h-3.5 text-amber-500 ${isSearchingOnline ? 'animate-spin' : ''}`} />
        <span>
          {isSearchingOnline
            ? (isKm ? 'កំពុងស្វែងរករូបភាពពី Online...' : 'Searching online photos...')
            : (isKm ? '✨ ស្វែងរករូបភាពត្រូវនឹងឈ្មោះហាងពី Online ដោយស្វ័យប្រវត្តិ' : '✨ Auto-Search Matching Photos Online')}
        </span>
      </button>

      {/* Photos Grid with Reorder, Preview, Set Cover, and Remove Controls */}
      {photos.length > 0 ? (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            <span>
              {isKm
                ? 'បញ្ជីរូបភាពដែលបានជ្រើស (រូបទី ១ ជា Cover Photo របស់ហាង)៖'
                : 'Selected Photos (Photo #1 is your main Cover Photo):'}
            </span>
            <button
              type="button"
              onClick={() => onChangePhotos([])}
              className="text-rose-600 hover:underline cursor-pointer text-[10px]"
            >
              {isKm ? 'សម្អាតទាំងអស់ (Clear All)' : 'Clear All'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {photos.map((imgUrl, idx) => {
              const isCover = idx === 0;
              return (
                <div
                  key={`${imgUrl}-${idx}`}
                  className={`relative rounded-2xl overflow-hidden border-2 bg-slate-900 group shadow-sm transition-all duration-200 ${
                    isCover
                      ? 'border-amber-400 ring-2 ring-amber-400/30'
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                  }`}
                >
                  {/* Aspect Ratio Box with Image */}
                  <div
                    className="relative aspect-square w-full cursor-pointer overflow-hidden"
                    onClick={() => setPreviewIndex(idx)}
                  >
                    <img
                      src={imgUrl}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Badge: Shop Photo Label */}
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                      {isCover ? (
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[9px] shadow-md flex items-center gap-1 font-khmer">
                          <Star className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
                          <span>{isKm ? 'រូបហាង' : 'Shop Photo'}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-white font-khmer font-bold text-[10px] shadow">
                          {isKm ? 'រូបហាង' : 'Shop Photo'}
                        </span>
                      )}
                    </div>

                    {/* Quick Preview Eye Icon on Hover */}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewIndex(idx);
                        }}
                        className="p-1 rounded-lg bg-black/70 hover:bg-black text-white shadow-sm cursor-pointer"
                        title={isKm ? 'មើលរូបធំ (Preview)' : 'Preview full size'}
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Action Bar Beneath or Overlay */}
                  <div className="p-1.5 bg-slate-950/90 border-t border-white/10 flex items-center justify-between gap-1 text-[10px]">
                    {/* Left & Right Reorder Arrows */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => handleMoveLeft(idx, e)}
                        className="p-1 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white cursor-pointer transition active:scale-95"
                        title={isKm ? 'រំកិលទៅមុខ (Move Earlier)' : 'Move left'}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === photos.length - 1}
                        onClick={(e) => handleMoveRight(idx, e)}
                        className="p-1 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white cursor-pointer transition active:scale-95"
                        title={isKm ? 'រំកិលទៅក្រោយ (Move Later)' : 'Move right'}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Set As Cover Button (if not already cover) */}
                    {!isCover ? (
                      <button
                        type="button"
                        onClick={(e) => handleSetAsCover(idx, e)}
                        className="px-1.5 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-[9px] flex items-center gap-0.5 cursor-pointer transition"
                        title={isKm ? 'ដាក់ជារូបតំណាងហាង' : 'Set as main cover'}
                      >
                        <Star className="w-2.5 h-2.5" />
                        <span>{isKm ? 'ដាក់ Cover' : 'Set Cover'}</span>
                      </button>
                    ) : (
                      <span className="text-[9px] text-amber-400 font-bold">
                        {isKm ? 'រូបចម្បង' : 'Main Cover'}
                      </span>
                    )}

                    {/* Replace & Remove Buttons */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => handleReplacePhoto(idx, e)}
                        className="p-1 rounded-md bg-white/10 hover:bg-white/25 text-slate-200 cursor-pointer transition"
                        title={isKm ? 'ប្តូររូបភាពនេះ' : 'Replace photo'}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleRemovePhoto(idx, e)}
                        className="p-1 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white cursor-pointer transition"
                        title={isKm ? 'លុបរូបភាពនេះ' : 'Remove photo'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* "+ Add More Photos" Dashed Card at the end */}
            {photos.length < maxPhotos && (
              <button
                type="button"
                onClick={handlePickMultiplePhotos}
                className="aspect-square rounded-2xl border-2 border-dashed border-emerald-500/50 hover:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 flex flex-col items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 transition active:scale-98 cursor-pointer p-2 text-center"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="font-bold text-[11px] leading-tight">
                  {isKm ? '+ បន្ថែមរូបទៀត' : '+ Add More'}
                </span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400">
                  {isKm ? 'ជ្រើសច្រើនសន្លឹក' : 'Multi-Select'}
                </span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          onClick={handlePickMultiplePhotos}
          className="p-6 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 text-center space-y-2 cursor-pointer transition"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
              {isKm ? 'មិនទាន់មានរូបភាពត្រូវបានជ្រើសរើសទេ' : 'No photos selected yet'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isKm
                ? 'ចុចទីនេះ ឬប៊ូតុងខាងលើ ដើម្បីជ្រើសរូបភាពហាង & រូបម្ហូបច្រើនសន្លឹកក្នុងពេលតែមួយ'
                : 'Click here to select multiple shop & food photos in one step'}
            </p>
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {previewIndex !== null && photos[previewIndex] && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="relative max-w-xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="px-4 py-3 bg-slate-950 flex items-center justify-between text-white border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs">
                  {isKm
                    ? `រូបភាពទី ${previewIndex + 1} នៃ ${photos.length}`
                    : `Photo ${previewIndex + 1} of ${photos.length}`}
                </span>
                {previewIndex === 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
                    {isKm ? 'រូបតំណាងហាង (Cover)' : 'Cover'}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPreviewIndex(null)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Full-Size Photo Display */}
            <div className="relative bg-black flex items-center justify-center min-h-[260px] max-h-[65vh] overflow-hidden">
              <img
                src={photos[previewIndex]}
                alt={`Full Preview ${previewIndex + 1}`}
                className="max-h-[65vh] w-auto max-w-full object-contain"
              />

              {/* Prev / Next Arrows */}
              {previewIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setPreviewIndex(previewIndex - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white shadow-lg cursor-pointer"
                  title={isKm ? 'រូបមុន' : 'Previous'}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {previewIndex < photos.length - 1 && (
                <button
                  type="button"
                  onClick={() => setPreviewIndex(previewIndex + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white shadow-lg cursor-pointer"
                  title={isKm ? 'រូបបន្ទាប់' : 'Next'}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Bottom Actions inside Lightbox */}
            <div className="px-4 py-3 bg-slate-950 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 text-xs font-khmer">
              <div className="flex items-center gap-1.5">
                {previewIndex !== 0 ? (
                  <button
                    type="button"
                    onClick={() => handleSetAsCover(previewIndex)}
                    className="py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5 fill-slate-950" />
                    <span>{isKm ? '★ ដាក់ជារូបតំណាងហាង (Set as Cover)' : '★ Set as Main Cover'}</span>
                  </button>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{isKm ? 'រូបនេះជារូបតំណាងហាងរួចហើយ' : 'Already Shop Cover Photo'}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(previewIndex)}
                  className="py-1.5 px-3 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isKm ? 'លុបរូបនេះ' : 'Remove'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewIndex(null)}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                >
                  {isKm ? 'បិទ' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

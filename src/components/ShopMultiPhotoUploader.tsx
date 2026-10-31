import React, { useState, useRef } from 'react';
import {
  Camera,
  Trash2,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import {
  isNativeAndroidOrIosPlatform,
  pickImageUsingNativeAndroidGallery,
} from '../utils/androidMediaHelper';
import { validateAndModerateShopImage } from '../utils/imageModeration';
import { DefaultShopIcon } from './icons/DefaultShopIcon';

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
  isKm = true,
  onToast,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const currentPhoto = photos[0] || '';

  const toast = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info') => {
    if (onToast) onToast(msg, type);
  };

  const handlePickFromGallery = async () => {
    setModerationWarning(null);
    if (!isNativeAndroidOrIosPlatform()) {
      fileInputRef.current?.click();
      return;
    }

    setIsProcessing(true);
    try {
      const nativePick = await pickImageUsingNativeAndroidGallery(1200, 0.85);
      if (nativePick?.cancelled) {
        setIsProcessing(false);
        return;
      }
      if (nativePick?.dataUrl) {
        const modRes = await validateAndModerateShopImage(nativePick.dataUrl, isKm ? 'km' : 'en');
        if (!modRes.valid || !modRes.dataUrl) {
          setModerationWarning(modRes.reason || null);
          toast(modRes.reason || (isKm ? '⚠️ រូបភាពមិនត្រឹមត្រូវ' : '⚠️ Invalid shop image'), 'warning');
          setIsProcessing(false);
          return;
        }
        onChangePhotos([modRes.dataUrl]);
        toast(
          isKm
            ? '✅ បានជ្រើសរូបភាពតំណាងហាង ១ សន្លឹកជោគជ័យ!'
            : '✅ Single shop photo selected & verified!',
          'success'
        );
        setIsProcessing(false);
        return;
      }
    } catch {}
    setIsProcessing(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setModerationWarning(null);
    setIsProcessing(true);
    try {
      const modRes = await validateAndModerateShopImage(file, isKm ? 'km' : 'en');
      if (!modRes.valid || !modRes.dataUrl) {
        setModerationWarning(modRes.reason || null);
        toast(modRes.reason || (isKm ? '⚠️ រូបភាពមិនត្រឹមត្រូវ' : '⚠️ Invalid shop image'), 'warning');
        return;
      }
      onChangePhotos([modRes.dataUrl]);
      toast(
        isKm
          ? '✅ បានជ្រើសរូបភាពតំណាងហាង ១ សន្លឹកជោគជ័យ!'
          : '✅ Single shop photo selected & verified!',
        'success'
      );
    } catch (err: any) {
      toast(err?.message || (isKm ? 'រូបភាពមិនត្រឹមត្រូវ' : 'Invalid image file'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 font-khmer">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
            {isKm ? '📸 រូបភាពតំណាងហាង (១ សន្លឹកគត់)' : '📸 Single Shop Photo Only'}
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {isKm
              ? 'អនុញ្ញាតតែរូបភាពតំណាងឱ្យហាង ១ សន្លឹកប៉ុណ្ណោះ (មិនមានការបញ្ចូលរូបមុខម្ហូបនីមួយៗទេ)។'
              : 'Only 1 photo representing the shop is allowed (no individual food/menu photos).'}
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] shrink-0">
          {currentPhoto ? '1 / 1' : '0 / 1'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-emerald-500 shrink-0 bg-slate-200 dark:bg-slate-700">
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt="Shop Photo"
              className="w-full h-full object-cover"
              onError={() => onChangePhotos([])}
            />
          ) : (
            <DefaultShopIcon className="w-full h-full" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handlePickFromGallery}
              className="py-2 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {currentPhoto ? <RefreshCw className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
              <span>
                {isProcessing
                  ? isKm
                    ? 'កំពុងពិនិត្យ...'
                    : 'Checking...'
                  : currentPhoto
                  ? isKm
                    ? 'ប្តូររូបហាង'
                    : 'Replace Photo'
                  : isKm
                  ? 'រើសពីទូរស័ព្ទ'
                  : 'Gallery'}
              </span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => cameraInputRef.current?.click()}
              className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{isKm ? 'ថតរូបហាង' : 'Take Photo'}</span>
            </button>
          </div>

          {currentPhoto && (
            <button
              type="button"
              onClick={() => onChangePhotos([])}
              className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isKm ? 'លុបរូបភាពហាង' : 'Remove Photo'}</span>
            </button>
          )}
        </div>
      </div>

      {moderationWarning && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-400 text-rose-800 dark:text-rose-200 text-[11px] font-bold">
          {moderationWarning}
        </div>
      )}
    </div>
  );
};

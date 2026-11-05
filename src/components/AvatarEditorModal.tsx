import React, { useState, useEffect } from 'react';
import { RotateCw, RotateCcw, Check, X, Camera, RefreshCw } from 'lucide-react';
import { tr } from '../utils/i18n';
import { fileToAvatarDataUrl } from '../utils/avatarHelper';

export interface AvatarEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImageUrl: string;
  onSave: (finalDataUrl: string) => void | Promise<void>;
  onPickNewImage: () => void;
  language: 'km' | 'en' | 'zh';
  isVip?: boolean;
  isAdmin?: boolean;
}

export const AvatarEditorModal: React.FC<AvatarEditorModalProps> = ({
  isOpen,
  onClose,
  initialImageUrl,
  onSave,
  onPickNewImage,
  language,
  isVip = false,
  isAdmin = false
}) => {
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>(initialImageUrl || '');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Reset rotation and sync image when modal opens or initialImageUrl changes
  useEffect(() => {
    if (isOpen && initialImageUrl) {
      setRotationDegrees(0);
      setIsProcessing(true);
      fileToAvatarDataUrl(initialImageUrl, 320, 0.88, 0)
        .then((url) => {
          setPreviewDataUrl(url);
          setIsProcessing(false);
        })
        .catch(() => {
          setPreviewDataUrl(initialImageUrl);
          setIsProcessing(false);
        });
    }
  }, [isOpen, initialImageUrl]);

  // Whenever rotation changes, re-render the preview cleanly
  const handleRotate = async (delta: number) => {
    const nextDeg = ((rotationDegrees + delta) % 360 + 360) % 360;
    setRotationDegrees(nextDeg);
    if (!initialImageUrl) return;
    setIsProcessing(true);
    try {
      const updatedUrl = await fileToAvatarDataUrl(initialImageUrl, 320, 0.88, nextDeg);
      setPreviewDataUrl(updatedUrl);
    } catch {
      // Ignore fallback
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    setRotationDegrees(0);
    if (!initialImageUrl) return;
    setIsProcessing(true);
    try {
      const updatedUrl = await fileToAvatarDataUrl(initialImageUrl, 320, 0.88, 0);
      setPreviewDataUrl(updatedUrl);
    } catch {
      // Ignore
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!previewDataUrl || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(previewDataUrl);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-khmer select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔄</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {tr(language, 'កែសម្រួល & បង្វិលរូបប្រូហ្វាល់', 'Edit & Rotate Profile Photo', '编辑并旋转头像')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tr(language, 'តម្រង់រូបឱ្យត្រង់ស្អាតមុនពេលរក្សាទុក', 'Orient photo upright before saving', '保存前将照片调整至正向')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col items-center gap-4 overflow-y-auto">
          {/* Avatar Preview Ring */}
          <div className="relative my-2">
            <div
              className={`w-44 h-44 sm:w-48 sm:h-48 rounded-full overflow-hidden flex items-center justify-center bg-slate-950 shadow-xl transition-all duration-200 ${
                isAdmin
                  ? 'ring-4 ring-emerald-400 border-4 border-emerald-600'
                  : isVip
                  ? 'ring-4 ring-amber-400 border-4 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.45)]'
                  : 'ring-4 ring-emerald-500/40 border-4 border-emerald-600'
              }`}
            >
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Avatar Preview"
                  className={`w-full h-full object-cover transition-opacity duration-150 ${
                    isProcessing ? 'opacity-60 scale-95' : 'opacity-100 scale-100'
                  }`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  {tr(language, 'គ្មានរូបភាព', 'No Image', '无图片')}
                </div>
              )}
            </div>

            {/* Rotation Degrees Badge */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900/90 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold font-mono shadow-md flex items-center gap-1">
              <span>{rotationDegrees}°</span>
              {rotationDegrees === 90 && <span className="text-[10px] text-slate-300">(ស្ដាំ)</span>}
              {rotationDegrees === 180 && <span className="text-[10px] text-amber-300">(ផ្កាប់)</span>}
              {rotationDegrees === 270 && <span className="text-[10px] text-slate-300">(ឆ្វេង)</span>}
              {rotationDegrees === 0 && <span className="text-[10px] text-emerald-300">✓ ត្រង់</span>}
            </div>
          </div>

          {/* Khmer Instruction */}
          <div className="text-center px-2">
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {tr(
                language,
                'ប្រសិនបើរូបភាពទ្រេត ឬផ្ដេក សូមចុច «បង្វិលស្តាំ» ឬ «បង្វិលឆ្វេង» ដើម្បីតម្រង់ឱ្យត្រង់ស្អាត។',
                'If photo appears sideways or tilted, tap Rotate Right or Rotate Left to orient it upright.',
                '如果照片显示为横向或倾斜，请点击向右或向左旋转以调正。'
              )}
            </p>
          </div>

          {/* Quick Rotation Buttons */}
          <div className="grid grid-cols-3 gap-2 w-full pt-1">
            <button
              type="button"
              onClick={() => handleRotate(270)}
              disabled={isProcessing || isSaving}
              className="py-2.5 px-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{tr(language, '↺ បង្វិលឆ្វេង', '↺ Left 90°', '↺ 向左 90°')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRotate(90)}
              disabled={isProcessing || isSaving}
              className="py-2.5 px-2 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <RotateCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{tr(language, '↻ បង្វិលស្តាំ', '↻ Right 90°', '↻ 向右 90°')}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isProcessing || isSaving || rotationDegrees === 0}
              className="py-2.5 px-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>{tr(language, 'កំណត់ដើម', 'Reset', '重置')}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={isSaving || isProcessing || !previewDataUrl}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{tr(language, 'កំពុងរក្សាទុក...', 'Saving...', '保存中...')}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{tr(language, '✅ យល់ព្រម & រក្សាទុក', 'Confirm & Save', '确认并保存')}</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onPickNewImage();
              }}
              disabled={isSaving}
              className="py-2.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
            >
              <Camera className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>{tr(language, 'រូបភាពរបស់ខ្ញុំ', 'រូបភាពរបស់ខ្ញុំ', 'រូបភាពរបស់ខ្ញុំ')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs flex items-center justify-center transition cursor-pointer disabled:opacity-60"
            >
              <span>{tr(language, 'បោះបង់', 'Cancel', '取消')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

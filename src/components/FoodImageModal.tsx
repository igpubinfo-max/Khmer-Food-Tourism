import React, { useState, useRef, useEffect } from 'react';
import { FoodItem, resolveFoodPhotoUrl, handleFoodImageError } from '../types';
import { 
  X, Upload, Image as ImageIcon, Check, RefreshCw, 
  AlertTriangle, CheckCircle2, Eye, Sliders, Smartphone, Search, Globe 
} from 'lucide-react';
import { searchOnlineFoodImages, OnlineFoodImageCandidate } from '../services/onlineFoodImageService';
import { normalizeAndValidateImage } from './TouristImageModal';
import {
  isNativeAndroidOrIosPlatform,
  pickImageUsingNativeAndroidGallery,
} from '../utils/androidMediaHelper';
import { applyFoodWatermarkOnce } from '../utils/foodWatermark';
import { useApp } from '../context/AppContext';
import { tr } from '../utils/i18n';

interface FoodImageModalProps {
  food: FoodItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFood: FoodItem) => void;
  isKm: boolean;
}

// Preserve original resolution & quality and apply the "Cambodia Flavors & Tourism" watermark once
const compressImageFile = async (
  file: File,
  maxWidth = 2400,
  maxHeight = 2400,
  quality = 0.94
): Promise<string> => {
  const result = await applyFoodWatermarkOnce(file, {
    maxWidth,
    maxHeight,
    quality,
    outputMimeType: 'image/jpeg',
  });
  return result.dataUrl;
};

export const FoodImageModal: React.FC<FoodImageModalProps> = ({
  food,
  isOpen,
  onClose,
  onSave,
  isKm,
}) => {
  const { language } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [photoUrl, setPhotoUrl] = useState('');
  const [auditStatus, setAuditStatus] = useState<'verified' | 'flagged_review' | 'replaced'>('verified');
  const [auditNote, setAuditNote] = useState('');
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [urlInput, setUrlInput] = useState('');
  const [hasUnappliedUrlDraft, setHasUnappliedUrlDraft] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineCandidates, setOnlineCandidates] = useState<OnlineFoodImageCandidate[]>([]);

  useEffect(() => {
    if (food) {
      setPhotoUrl(food.photoUrl || '');
      setUrlInput(food.photoUrl && food.photoUrl.startsWith('http') ? food.photoUrl : '');
      setHasUnappliedUrlDraft(false);
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
        setHasUnappliedUrlDraft(false);
        setAuditStatus('verified');
        setAuditNote(tr(language, `រូបភាពស្វែងរកពី Online ដោយស្វ័យប្រវត្តិ (${results[0].source})`, `Auto-matched online photo (${results[0].source})`, `已自动匹配在线图片 (${results[0].source})`));
      }
    } catch (err: any) {
      setErrorMsg(err.message || (tr(language, 'មិនអាចស្វែងរករូបភាពពី Online បានទេ', 'Failed to search online food images', '无法搜索在线美食图片')));
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handlePickGalleryPhoto = async () => {
    if (!isNativeAndroidOrIosPlatform()) {
      fileInputRef.current?.click();
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);
    try {
      const pick = await pickImageUsingNativeAndroidGallery();
      if (pick.cancelled) {
        return;
      }
      if (pick.dataUrl) {
        const wmRes = await applyFoodWatermarkOnce(pick.dataUrl, { maxWidth: 2400, maxHeight: 2400, quality: 0.94, outputMimeType: 'image/jpeg' });
        pick.dataUrl = wmRes.dataUrl;
        const note = tr(language, `រូបភាពបានបញ្ចូលដោយរដ្ឋបាលពីទូរស័ព្ទ (${(pick.dataUrl.length / 1024).toFixed(0)} KB)`, `Custom photo uploaded by admin (${(pick.dataUrl.length / 1024).toFixed(0)} KB)`, `管理员上传的自定义图片 (${(pick.dataUrl.length / 1024).toFixed(0)} KB)`);
        setPhotoUrl(pick.dataUrl);
        setUrlInput('');
        setHasUnappliedUrlDraft(false);
        setAuditStatus('verified');
        setAuditNote(note);
        const nowIso = new Date().toISOString();
        onSave({
          ...food,
          photoUrl: pick.dataUrl,
          isCustomPhoto: true,
          photoUpdatedAt: nowIso,
          updatedAt: nowIso,
          adminApprovedAt: nowIso,
          imageAuditStatus: 'verified',
          imageAuditNote: note,
        });
        return;
      }
      fileInputRef.current?.click();
    } catch {
      fileInputRef.current?.click();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMsg(tr(language, 'សូមជ្រើសរើសប្រភេទរូបភាព JPG, PNG ឬ WebP ប៉ុណ្ណោះ', 'Please select a JPG, PNG, or WebP image', '请选择 JPG、PNG 或 WebP 图片'));
      return;
    }

    // Validate size (max 12MB before compression)
    if (file.size > 12 * 1024 * 1024) {
      setErrorMsg(tr(language, 'ទំហំរូបភាពធំពេក (អតិបរមា 12MB)', 'File size is too large (max 12MB)', '文件过大（最大 12MB）'));
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);
    try {
      const compressedDataUrl = await compressImageFile(file);
      const note = tr(language, `រូបភាពបានបញ្ចូលដោយរដ្ឋបាលពីទូរស័ព្ទ/កុំព្យូទ័រ (${(compressedDataUrl.length / 1024).toFixed(0)} KB)`, `Custom photo uploaded by admin (${(compressedDataUrl.length / 1024).toFixed(0)} KB)`, `管理员上传的自定义图片 (${(compressedDataUrl.length / 1024).toFixed(0)} KB)`);
      setPhotoUrl(compressedDataUrl);
      setUrlInput('');
      setHasUnappliedUrlDraft(false);
      setAuditStatus('verified');
      setAuditNote(note);
      const nowIso = new Date().toISOString();
      onSave({
        ...food,
        photoUrl: compressedDataUrl,
        isCustomPhoto: true,
        photoUpdatedAt: nowIso,
        updatedAt: nowIso,
        adminApprovedAt: nowIso,
        imageAuditStatus: 'verified',
        imageAuditNote: note,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing image');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyUrl = () => {
    const check = normalizeAndValidateImage(urlInput, isKm);
    if (!check.isValid) {
      setErrorMsg(check.error || (tr(language, 'តំណភ្ជាប់រូបភាពមិនត្រឹមត្រូវ', 'Invalid image URL', '图片链接无效')));
      return;
    }
    setPhotoUrl(check.normalizedUrl);
    setHasUnappliedUrlDraft(false);
    setAuditStatus('verified');
    setAuditNote(tr(language, 'រូបភាពតំណភ្ជាប់ URL កំណត់ដោយរដ្ឋបាល', 'Image URL set by administrator', '管理员设置的图片链接'));
    setErrorMsg('');
  };

  const handleResetToDefault = () => {
    const defaultUrl = food.originalPhotoUrl || `/foods/${food.id}.jpg`;
    setPhotoUrl(defaultUrl);
    setUrlInput('');
    setHasUnappliedUrlDraft(false);
    setAuditStatus('verified');
    setAuditNote(tr(language, 'បានកំណត់ទៅរូបភាពដើមពិតប្រាកដពី Magnific', 'Reset to authentic food image', '已重置为正宗美食原图'));
  };

  const handleSave = () => {
    setErrorMsg('');
    const candidate = hasUnappliedUrlDraft && urlInput.trim() ? urlInput.trim() : photoUrl.trim();
    const check = normalizeAndValidateImage(candidate, isKm);

    if (!check.isValid) {
      setErrorMsg(check.error || (tr(language, 'សូមបញ្ចូលរូបភាព ឬជ្រើសរើសឯកសារត្រឹមត្រូវ', 'Please provide a valid image', '请提供有效的图片')));
      return;
    }

    const defaultStaticUrl = food.originalPhotoUrl || `/foods/${food.id}.jpg`;
    const updated: FoodItem = {
      ...food,
      photoUrl: check.normalizedUrl,
      isCustomPhoto: check.normalizedUrl !== defaultStaticUrl,
      photoUpdatedAt: new Date().toISOString(),
      imageAuditStatus: auditStatus,
      imageAuditNote: auditNote.trim() || (auditStatus === 'verified' ? (tr(language, 'បានផ្ទៀងផ្ទាត់ដោយរដ្ឋបាល', 'Verified by admin', '已由管理员验证')) : (tr(language, 'រង់ចាំពិនិត្យ', 'Pending review', '等待审核'))),
    };

    try {
      onSave(updated);
      onClose();
    } catch (saveErr: any) {
      console.error('Failed to save food photo:', saveErr);
      setErrorMsg(tr(language, 'បរាជ័យក្នុងការរក្សាទុករូបភាព', 'Failed to save food photo', '美食图片保存失败'));
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="kft-khmer-modal-header px-5 pt-3.5 pb-4 text-white flex items-center justify-between">
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
                {tr(language, 'ការបង្ហាញរូបភាពក្នុងកម្មវិធី (Live App Preview)', 'Live Mobile Card Preview', '手机卡片实时预览')}
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setFitMode('cover')}
                  className={`px-2 py-0.5 rounded-md font-bold transition ${
                    fitMode === 'cover' ? 'bg-[#064E3B] text-white' : 'text-slate-500'
                  }`}
                >
                  {tr(language, 'ពេញស៊ុម (Cover)', 'Cover', '填满')}
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode('contain')}
                  className={`px-2 py-0.5 rounded-md font-bold transition ${
                    fitMode === 'contain' ? 'bg-[#064E3B] text-white' : 'text-slate-500'
                  }`}
                >
                  {tr(language, 'រូបពេញ (Contain)', 'Fit', '完整显示')}
                </button>
              </div>
            </div>

            {/* Mobile Card Mockup */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/60 shadow-xs max-w-sm mx-auto">
              <div className="relative aspect-[16/10] bg-slate-900 flex items-center justify-center overflow-hidden">
                {photoUrl ? (
                  <img loading="lazy" decoding="async" 
                    src={resolveFoodPhotoUrl(photoUrl, food.photoUpdatedAt, undefined, food.id)} 
                    onError={(e) => handleFoodImageError(e, food.id, photoUrl)}
                    alt={food.nameKh} 
                    className={`w-full h-full transition-all duration-200 ${
                      fitMode === 'cover' ? 'object-cover' : 'object-contain'
                    }`}
                  />
                ) : (
                  <div className="text-center text-slate-400 p-4">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span>{tr(language, 'មិនទាន់មានរូបភាព', 'No photo selected', '未选择图片')}</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-[#064E3B]/80 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
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
                {tr(language, '១. ជ្រើសរើសពី រូបភាពរបស់ខ្ញុំ', '1. Choose from My Photos', '1. 从我的相册选择')}
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
              onClick={handlePickGalleryPhoto}
              className="w-full py-3 px-4 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 transition active:scale-98 disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-emerald-300" />
              <span>
                {isProcessing 
                  ? (tr(language, 'កំពុងដំណើរការ និងបង្រួមរូបភាព...', 'Optimizing image...', '正在优化图片...')) 
                  : (tr(language, 'រូបភាពរបស់ខ្ញុំ', 'My Photos', '我的相册'))}
              </span>
            </button>
            <p className="text-[10px] text-slate-500 text-center">
              {tr(language, 'ប្រព័ន្ធនឹងបង្រួមទំហំរូបភាពស្វ័យប្រវត្ត (WebP/JPEG) ដើម្បីឱ្យកម្មវិធីដំណើរការលឿននិងមិនគាំង', 'Auto-compressed to high-performance WebP for fast offline loading', '已自动压缩为高性能 WebP，加载更快、支持离线')}
            </p>
          </div>

          {/* Option 2: Auto Online Food Image Search + Direct URL Input */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[#0F172A] dark:text-slate-200 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-600" />
                {tr(language, '២. ស្វែងរករូបភាពម្ហូបពី Online ឬបញ្ចូល URL', '2. Auto Online Food Photo Search or Web URL', '2. 自动在线搜索美食图片或输入网址')}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                FREE API
              </span>
            </div>

            <button
              type="button"
              disabled={isSearchingOnline}
              onClick={handleSearchOnlineImages}
              className="w-full py-2.5 px-3.5 rounded-xl bg-[#064E3B] hover:bg-emerald-800 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              <Search className={`w-4 h-4 text-emerald-200 ${isSearchingOnline ? 'animate-spin' : ''}`} />
              <span>
                {isSearchingOnline
                  ? (tr(language, 'កំពុងស្វែងរករូបភាពម្ហូបពី Online...', 'Searching online food photos...', '正在搜索在线美食图片...'))
                  : (tr(language, 'ស្វែងរករូបភាពម្ហូបពី Online ដោយស្វ័យប្រវត្តិ', 'Auto-Search Matching Food Photos Online', '自动在线搜索匹配的美食图片'))}
              </span>
            </button>

            {onlineCandidates.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
                  {tr(language, `រកឃើញរូបភាពម្ហូបពី Online ចំនួន ${onlineCandidates.length} សន្លឹក (ចុចជ្រើសរើស)៖`, `Found ${onlineCandidates.length} matching online photos (tap to select):`, `找到 ${onlineCandidates.length} 张匹配的在线图片（点击选择）：`)}
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
                          setHasUnappliedUrlDraft(false);
                          setAuditStatus('verified');
                          setAuditNote(
                            tr(language, `រូបភាពជ្រើសរើសពី Online (${cand.source})`, `Online photo selected (${cand.source})`, `已选择在线图片 (${cand.source})`)
                          );
                        }}
                        className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition cursor-pointer group ${
                          isSelected
                            ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        <img loading="lazy" decoding="async"
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
                onChange={e => {
                  const val = e.target.value;
                  setUrlInput(val);
                  setHasUnappliedUrlDraft(true);
                  setErrorMsg('');
                  const check = normalizeAndValidateImage(val, isKm);
                  if (check.isValid) {
                    setPhotoUrl(check.normalizedUrl);
                    setHasUnappliedUrlDraft(false);
                  }
                }}
                placeholder="https://... ឬ data:image/webp;base64,..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-3.5 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold transition shrink-0 active:scale-95 cursor-pointer"
              >
                {tr(language, 'ដាក់រូប', 'Apply', '应用')}
              </button>
            </div>
          </div>

          {/* Audit Status & Verification Note */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-[#0F172A] dark:text-slate-300 block">
              {tr(language, 'ស្ថានភាពផ្ទៀងផ្ទាត់រូបភាព (Audit Status):', 'Verification Status:', '验证状态：')}
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
                <span>{tr(language, '✓ ផ្ទៀងផ្ទាត់ត្រឹមត្រូវ', '✓ Verified Authentic', '✓ 已验证为正宗')}</span>
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
                <span>{tr(language, '⚠️ រង់ចាំពិនិត្យ', '⚠️ Pending Review', '⚠️ 待审核')}</span>
              </button>
            </div>

            <div className="pt-1">
              <label className="text-[11px] text-slate-500 block mb-1">
                {tr(language, 'កំណត់ចំណាំសវនកម្ម (Audit Note):', 'Audit Note / Source:', '审核备注 / 来源：')}
              </label>
              <input 
                type="text"
                value={auditNote}
                onChange={e => setAuditNote(e.target.value)}
                placeholder={tr(language, 'ឧទាហរណ៍៖ រូបថតម្ហូបដើមពីហាង...', 'e.g., Authentic traditional photo...', '例如：正宗传统美食图片...')}
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
            <span>{tr(language, 'កំណត់រូបដើម', 'Reset', '重置')}</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300 transition"
            >
              {tr(language, 'បោះបង់', 'Cancel', '取消')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/20 transition active:scale-95"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>{tr(language, 'រក្សាទុករូបភាព', 'Save Photo', '保存图片')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

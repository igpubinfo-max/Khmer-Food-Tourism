import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Heart, Clock, Users, Flame, ChefHat, 
  Share2, CheckCircle2, Circle, Volume2, Sparkles, Send, Bookmark, Globe, Check,
  Edit2, Save, Upload, Camera, ArrowLeft
} from 'lucide-react';
import {
  shareRichContent,
  formatRichShareText,
  copyTextNativeOrWeb,
  pickImageUsingNativeAndroidGallery,
  processAndCompressImageFile,
} from '../utils/androidMediaHelper';
import { searchOnlineFoodImages, OnlineFoodImageCandidate } from '../services/onlineFoodImageService';
import { FoodCategorySlug, FoodItem } from '../types';
import { tr } from '../utils/i18n';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';
import { DishTagChips } from './DishTagChips';
import { PassportStampButton } from './PassportStampButton';
import { WhereToEat } from './WhereToEat';

export const FoodDetailModal: React.FC = () => {
  const { 
    selectedFood, setSelectedFood, updateFood, language, 
    isBookmarked, toggleBookmark, showToast, openAddToWishlist,
    currentUser
  } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineCandidates, setOnlineCandidates] = useState<OnlineFoodImageCandidate[]>([]);
  const [isEditingAdminFood, setIsEditingAdminFood] = useState(false);

  // Admin editable fields
  const [editNameKh, setEditNameKh] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editCategorySlug, setEditCategorySlug] = useState<FoodCategorySlug>('soup');
  const [editCategoryKh, setEditCategoryKh] = useState('');
  const [editPriceUsd, setEditPriceUsd] = useState('');
  const [editPriceRiel, setEditPriceRiel] = useState('');
  const [editCookTime, setEditCookTime] = useState('');
  const [editServings, setEditServings] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [editDescriptionKh, setEditDescriptionKh] = useState('');
  const [editDescriptionEn, setEditDescriptionEn] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedFood) {
      setEditNameKh(selectedFood.nameKh || '');
      setEditNameEn(selectedFood.nameEn || '');
      setEditCategorySlug((selectedFood.categorySlug as FoodCategorySlug) || 'soup');
      setEditCategoryKh(selectedFood.categoryKh || '');
      setEditPriceUsd((selectedFood.priceUsd || 0).toString());
      setEditPriceRiel((selectedFood.priceRiel || 0).toString());
      setEditCookTime(selectedFood.cookTime || '២៥ នាទី');
      setEditServings(selectedFood.servings || '៣-៤ នាក់');
      setEditCalories((selectedFood.calories || 320).toString());
      setEditDifficulty(selectedFood.difficulty || 'medium');
      setEditDescriptionKh(selectedFood.descriptionKh || '');
      setEditDescriptionEn(selectedFood.descriptionEn || '');
      setEditPhotoUrl(selectedFood.photoUrl || '');
    }
    setOnlineCandidates([]);
    setIsSearchingOnline(false);

    if ((window as any).__kft_open_food_edit && isAdmin) {
      setIsEditingAdminFood(true);
      (window as any).__kft_open_food_edit = undefined;
    } else {
      setIsEditingAdminFood(false);
    }
  }, [selectedFood?.id, isAdmin]);

  if (!selectedFood) return null;
  const loc = getLocalizedFood(selectedFood, language);

  const handleSearchOnlinePhoto = async () => {
    setIsSearchingOnline(true);
    try {
      const results = await searchOnlineFoodImages({
        nameKh: selectedFood.nameKh,
        nameEn: selectedFood.nameEn,
        categorySlug: selectedFood.categorySlug,
        existingUrls: selectedFood.photoUrl ? [selectedFood.photoUrl] : [],
      });
      setOnlineCandidates(results);
      if (results.length > 0) {
        showToast(
          language === 'km'
            ? `✨ រកឃើញរូបភាពម្ហូបចំនួន ${results.length} សន្លឹក! សូមចុចលើរូបភាពខាងក្រោមដើម្បីជ្រើសរើស។`
            : `✨ Found ${results.length} matching dish photos! Tap a photo below to apply.`,
          'success'
        );
      }
    } catch {
      showToast(
        language === 'km' ? 'មិនអាចស្វែងរករូបភាពពី Online បានទេ' : 'Failed to search online photos',
        'warning'
      );
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleSelectCandidate = (cand: OnlineFoodImageCandidate) => {
    const updated = {
      ...selectedFood,
      photoUrl: cand.url,
      imageAuditStatus: 'verified' as const,
      imageAuditNote: `រូបភាពជ្រើសរើសពី Online (${cand.source})`,
    };
    updateFood(updated);
    setSelectedFood(updated);
    showToast(
      language === 'km'
        ? '✅ បានរក្សាទុករូបភាពម្ហូបពី Online រួចរាល់!'
        : '✅ Online food photo saved!',
      'success'
    );
  };

  const handlePickDevicePhoto = async () => {
    setIsUploadingPhoto(true);
    try {
      const pick = await pickImageUsingNativeAndroidGallery();
      if (!pick.cancelled && pick.dataUrl) {
        setEditPhotoUrl(pick.dataUrl);
        showToast(language === 'km' ? 'បានជ្រើសរើសរូបភាពពីទូរស័ព្ទ' : 'Photo selected from device', 'info');
      }
    } catch {
      fileInputRef.current?.click();
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const dataUrl = await processAndCompressImageFile(file, 1080, 810, 0.85);
      setEditPhotoUrl(dataUrl);
      showToast(language === 'km' ? 'បានបង្រួម និងបញ្ចូលរូបភាពរួចរាល់' : 'Photo compressed and ready', 'info');
    } catch {
      showToast(language === 'km' ? 'មិនអាចដំណើរការរូបភាពនេះបានទេ' : 'Failed to process image', 'warning');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveAdminFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood) return;

    const catSlug = editCategorySlug;
    const catKhMap: Record<FoodCategorySlug, string> = {
      soup: 'ស៊ុប សម្ល & បបរ',
      stirfry: 'ម្ហូបឆា',
      grilled: 'ម្ហូបអាំង ចៀន & ចំហុយ',
      salad: 'ញាំ ភ្លា & ទឹកគ្រឿង',
      noodles: 'មី គុយទាវ & នំបញ្ចុក',
      rice: 'ម្ហូបបាយ',
      streetfood: 'អាហារសម្រន់តាមផ្លូវ',
      dessert: 'បង្អែមខ្មែរ',
      drink: 'ភេសជ្ជៈខ្មែរ',
      cake: 'នំខ្មែរ',
      specialty: 'មុខម្ហូបពិសេស',
    };

    const updated: FoodItem = {
      ...selectedFood,
      nameKh: editNameKh.trim() || selectedFood.nameKh,
      nameEn: editNameEn.trim() || selectedFood.nameEn,
      categorySlug: catSlug,
      categoryKh: editCategoryKh.trim() || catKhMap[catSlug] || selectedFood.categoryKh,
      priceUsd: parseFloat(editPriceUsd) || selectedFood.priceUsd,
      priceRiel: parseInt(editPriceRiel) || selectedFood.priceRiel,
      cookTime: editCookTime.trim() || selectedFood.cookTime,
      servings: editServings.trim() || selectedFood.servings,
      calories: parseInt(editCalories) || selectedFood.calories,
      difficulty: editDifficulty,
      descriptionKh: editDescriptionKh.trim() || selectedFood.descriptionKh,
      descriptionEn: editDescriptionEn.trim() || selectedFood.descriptionEn,
      photoUrl: editPhotoUrl.trim() || selectedFood.photoUrl,
      imageAuditStatus: 'verified',
      imageAuditNote: 'កែប្រែដោយរដ្ឋបាល (Admin Edited)',
    };

    updateFood(updated);
    setSelectedFood(updated);
    setIsEditingAdminFood(false);
    showToast(
      tr(
        language,
        `✅ បានកែប្រែព័ត៌មានមុខម្ហូប «${updated.nameKh}» រួចរាល់!`,
        `✅ Updated food details for "${updated.nameEn}"!`,
        `✅ 已成功更新菜品信息！`
      ),
      'success'
    );
  };

  const bookmarked = isBookmarked(selectedFood.id);

  const toggleIngredient = (index: number) => {
    setCheckedIngredients(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Text to Speech for Recipe in active language
  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      showToast(
        tr(language, 'កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រសម្លេងអានទេ', 'Speech synthesis not supported', '当前浏览器不支持语音朗读'),
        'warning'
      );
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead =
      language === 'km'
        ? `${loc.name}។ ${loc.description}។ គ្រឿងផ្សំរួមមាន៖ ${loc.ingredients.map(i => i.name).join('、')}។`
        : language === 'zh'
        ? `${loc.name}。${loc.description}。所需食材包括：${loc.ingredients.map(i => i.name).join('、')}。`
        : `${loc.name}. ${loc.description}. Ingredients include: ${loc.ingredients.map(i => i.name).join(', ')}.`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = language === 'km' ? 'km-KH' : language === 'zh' ? 'zh-CN' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    showToast(
      tr(language, 'កំពុងអានព័ត៌មានមុខម្ហូប...', 'Reading recipe audio...', '正在朗读菜品食谱...'),
      'info'
    );
  };

  const isKm = language === 'km';
  const sharePayload = {
    title: loc.name,
    nameKh: loc.name,
    nameEn: loc.name,
    description: loc.description,
    location: tr(language, `${loc.category} • កម្ពុជា`, `${loc.category} • Cambodia`, `${loc.category} • 柬埔寨`),
    signatureDishes: loc.ingredients.slice(0, 4).map(i => i.name),
    photoUrl: selectedFood.photoUrl,
    itemType: 'food' as const,
    itemId: selectedFood.id,
    isKm,
  };

  // Social Sharing
  const handleShareNative = () => {
    shareRichContent(sharePayload, showToast);
  };

  const handleShareTelegram = () => {
    const { fullText, directLink } = formatRichShareText(sharePayload);
    const text = encodeURIComponent(fullText);
    const url = encodeURIComponent(directLink);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    const { fullText, directLink } = formatRichShareText(sharePayload);
    const url = encodeURIComponent(directLink);
    const quote = encodeURIComponent(fullText);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, '_blank');
  };

  const handleCopyLink = async () => {
    const { fullText, title } = formatRichShareText(sharePayload);
    const ok = await copyTextNativeOrWeb(fullText, title);
    if (ok) {
      showToast(
        tr(
          language,
          'បានចម្លងព័ត៌មានមុខម្ហូប និងតំណភ្ជាប់រួចរាល់!',
          'Food details & link copied to clipboard!',
          '菜品详情与链接已复制到剪贴板！'
        ),
        'success'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg h-[90vh] sm:h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-slate-200/80 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Controls */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          <button
            onClick={() => {
              if (isSpeaking) window.speechSynthesis.cancel();
              setSelectedFood(null);
            }}
            className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white shadow pointer-events-auto transition active:scale-90"
            title={tr(language, 'បិទ', 'Close', '关闭')}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Admin Edit Food Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsEditingAdminFood(!isEditingAdminFood)}
                className="py-1.5 px-3 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-lg backdrop-blur-md transition active:scale-90 flex items-center gap-1.5 border border-white/60"
                title={tr(language, 'កែប្រែព័ត៌មាន និងរូបភាព', 'Edit Details & Photos (Admin)', '编辑详情与图片（管理员）')}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="font-khmer">{isEditingAdminFood ? tr(language, 'មើលធម្មតា', 'View', '查看') : tr(language, 'កែប្រែ', 'Edit', '编辑')}</span>
              </button>
            )}

            {/* Audio Reader */}
            <button
              onClick={handleSpeak}
              className={`p-2.5 rounded-full backdrop-blur-md shadow transition active:scale-90 ${
                isSpeaking ? 'bg-[#10B981] text-white animate-pulse' : 'bg-black/50 hover:bg-black/70 text-white'
              }`}
              title={tr(language, 'ស្តាប់សម្លេងអានរូបមន្ត', 'Listen to recipe audio', '语音朗读食谱')}
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Bookmark to Wishlist */}
            <button
              onClick={() => openAddToWishlist({
                id: selectedFood.id,
                type: 'food',
                nameKh: selectedFood.nameKh,
                nameEn: selectedFood.nameEn,
                photoUrl: selectedFood.photoUrl,
                categoryKh: selectedFood.categoryKh,
                priceDisplay: selectedFood.calories ? `${selectedFood.calories} ${tr(language, 'គីឡូកាឡូរី', 'kcal', '千卡')}` : undefined,
                rating: selectedFood.rating,
              })}
              className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md shadow transition active:scale-90 text-amber-300"
              title={tr(language, 'ដាក់ក្នុងបញ្ជីចង់ញ៉ាំ', 'Save to wishlist', '加入收藏清单')}
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>

            {/* Share Button */}
            <button
              onClick={handleShareNative}
              className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md shadow transition active:scale-90 text-white"
              title={tr(language, 'ចែករំលែកមុខម្ហូប', 'Share dish', '分享菜品')}
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Favorite */}
            <button
              onClick={() => toggleBookmark(selectedFood.id)}
              className={`p-2.5 rounded-full backdrop-blur-md shadow transition active:scale-90 ${
                bookmarked ? 'bg-rose-500 text-white' : 'bg-black/50 hover:bg-black/70 text-white'
              }`}
              title={tr(language, 'រក្សាទុក', 'Save', '收藏')}
            >
              <Heart className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 no-scrollbar pb-6">
          {isEditingAdminFood ? (
            /* ADMIN EDIT FOOD FORM */
            <form onSubmit={handleSaveAdminFood} className="p-4 sm:p-6 space-y-4 font-khmer pt-16">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

              <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-400/60 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Edit2 className="w-4 h-4 text-amber-600" />
                    <span>{isKm ? 'កែប្រែព័ត៌មានមុខម្ហូប (Admin Edit)' : 'Admin Food Editor'}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">ID: {selectedFood.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingAdminFood(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold"
                >
                  {isKm ? 'បោះបង់' : 'Cancel'}
                </button>
              </div>

              {/* 1. Photo replacement */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="block font-bold text-xs text-slate-800 dark:text-slate-200">
                  {isKm ? 'រូបភាពមុខម្ហូប (Photo URL / Upload)' : 'Dish Photo'}
                </label>
                <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-slate-900 border border-amber-400/50">
                  <img src={editPhotoUrl || selectedFood.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <input
                  type="text"
                  value={editPhotoUrl}
                  onChange={(e) => setEditPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSearchOnlinePhoto}
                    disabled={isSearchingOnline}
                    className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{isSearchingOnline ? (isKm ? 'កំពុងស្វែងរក...' : 'Searching...') : (isKm ? '🤖 ស្វែងរក Online' : 'Auto Online Search')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePickDevicePhoto}
                    disabled={isUploadingPhoto}
                    className="py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isKm ? 'ជ្រើសរូបពីទូរស័ព្ទ' : 'Choose from Device'}</span>
                  </button>
                </div>
                {onlineCandidates.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {onlineCandidates.map((cand, idx) => (
                      <button
                        key={`${cand.url}-${idx}`}
                        type="button"
                        onClick={() => setEditPhotoUrl(cand.url)}
                        className={`aspect-4/3 rounded-lg overflow-hidden border-2 transition ${
                          editPhotoUrl === cand.url ? 'border-amber-500 ring-2 ring-amber-400/50' : 'border-slate-200'
                        }`}
                      >
                        <img src={cand.url} alt={cand.title} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'ឈ្មោះមុខម្ហូប (ភាសាខ្មែរ) *' : 'Name (Khmer) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editNameKh}
                    onChange={(e) => setEditNameKh(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'ឈ្មោះមុខម្ហូប (English)' : 'Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={editNameEn}
                    onChange={(e) => setEditNameEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* 3. Category & Price */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'ប្រភេទម្ហូប' : 'Category'}
                  </label>
                  <select
                    value={editCategorySlug}
                    onChange={(e) => setEditCategorySlug(e.target.value as FoodCategorySlug)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
                  >
                    <option value="soup">ស៊ុប / សម្ល</option>
                    <option value="stirfry">ម្ហូបឆា</option>
                    <option value="grilled">ម្ហូបអាំង</option>
                    <option value="salad">ញាំ / ភ្លា</option>
                    <option value="noodles">គុយទាវ / នំបញ្ចុក</option>
                    <option value="rice">ម្ហូបបាយ</option>
                    <option value="streetfood">អាហារសម្រន់</option>
                    <option value="dessert">បង្អែម</option>
                    <option value="cake">នំខ្មែរ</option>
                    <option value="drink">ភេសជ្ជៈ</option>
                    <option value="specialty">ពិសេស</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'តម្លៃ ($ USD)' : 'Price USD'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPriceUsd}
                    onChange={(e) => {
                      setEditPriceUsd(e.target.value);
                      const val = parseFloat(e.target.value) || 0;
                      setEditPriceRiel((Math.round(val * 4100)).toString());
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'តម្លៃ (៛ រៀល)' : 'Price Riel'}
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={editPriceRiel}
                    onChange={(e) => setEditPriceRiel(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'កម្រិតចម្អិន' : 'Difficulty'}
                  </label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
                  >
                    <option value="easy">ងាយ (Easy)</option>
                    <option value="medium">មធ្យម (Medium)</option>
                    <option value="hard">ជំនាញ (Hard)</option>
                  </select>
                </div>
              </div>

              {/* 4. Specs */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-[11px] text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'ពេលចម្អិន' : 'Cook Time'}
                  </label>
                  <input
                    type="text"
                    value={editCookTime}
                    onChange={(e) => setEditCookTime(e.target.value)}
                    placeholder="២៥ នាទី"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[11px] text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'ចំណុះទទួលទាន' : 'Servings'}
                  </label>
                  <input
                    type="text"
                    value={editServings}
                    onChange={(e) => setEditServings(e.target.value)}
                    placeholder="៣-៤ នាក់"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[11px] text-slate-800 dark:text-slate-200 mb-1">
                    {isKm ? 'កាឡូរី (Cal)' : 'Calories'}
                  </label>
                  <input
                    type="number"
                    value={editCalories}
                    onChange={(e) => setEditCalories(e.target.value)}
                    placeholder="320"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* 5. Description */}
              <div>
                <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">
                  {isKm ? 'ការពិពណ៌នា (ភាសាខ្មែរ)' : 'Description (Khmer)'}
                </label>
                <textarea
                  rows={3}
                  value={editDescriptionKh}
                  onChange={(e) => setEditDescriptionKh(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white leading-relaxed"
                />
              </div>

              {/* Save & Cancel */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingAdminFood(false)}
                  className="py-3 px-4 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
                >
                  {isKm ? 'បោះបង់' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-[#064E3B] to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-emerald-300" />
                  <span>{isKm ? 'រក្សាទុកការកែប្រែ' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          ) : (
          <>
          {/* Hero Image */}
          <div className="relative h-64 sm:h-72 w-full bg-slate-800">
            <img 
              src={selectedFood.photoUrl} 
              alt={loc.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Bottom info inside hero */}
            <div className="absolute bottom-3.5 left-4 right-24 text-white">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#064E3B] text-emerald-100 border border-emerald-400/40 shadow-xs mb-2 inline-block">
                {loc.category}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-moul leading-snug drop-shadow text-white">
                {loc.name}
              </h2>
            </div>

            {/* Reference Image Label (រូបភាពយោង) */}
            <div className="absolute bottom-2.5 right-3 z-10 px-1.5 py-0.5 rounded bg-black/55 backdrop-blur-xs text-[8px] sm:text-[9px] text-white/85 font-khmer border border-white/15 select-none pointer-events-none shadow-2xs">
              <span>{tr(language, 'រូបភាពយោង', 'Reference photo', '参考图片')}</span>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            {/* Meta Rating & Category Bar */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-[#064E3B] text-white font-bold text-xs sm:text-sm font-khmer">
                  {loc.category}
                </span>
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-khmer">
                  {tr(language, 'មុខម្ហូបខ្មែរប្រពៃណី', 'Traditional Khmer Recipe', '传统高棉食谱')}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-sm">
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 shadow-xs font-bold text-slate-800 dark:text-white flex items-center gap-1 border border-slate-200">
                  <span className="text-amber-500">★</span> {selectedFood.rating} <span className="font-normal text-slate-400 text-xs">({selectedFood.reviewCount})</span>
                </span>
              </div>
            </div>

            {/* Auto Online Food Photo Search Button ($0 Free) - ADMIN ONLY per Requirement #1 */}
            {isAdmin && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/70 to-amber-50/40 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-900 border-2 border-emerald-500/40 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5 font-khmer">
                    <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                    {tr(
                      language,
                      'ប្តូរ ឬស្វែងរករូបភាពម្ហូបពីអនឡាញដោយស្វ័យប្រវត្តិ',
                      'Auto-Search Matching Food Photos Online (Admin)',
                      '自动在线搜索并匹配菜品照片（管理员）'
                    )}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold shrink-0">
                    {tr(language, 'ឥតគិតថ្លៃ $0', 'FREE $0', '免费 $0')}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isSearchingOnline}
                  onClick={handleSearchOnlinePhoto}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-[#064E3B] to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 disabled:opacity-60 cursor-pointer font-khmer"
                >
                  <Sparkles className={`w-4 h-4 text-amber-300 shrink-0 ${isSearchingOnline ? 'animate-spin' : ''}`} />
                  <span>
                    {isSearchingOnline
                      ? tr(language, 'កំពុងស្វែងរករូបភាពម្ហូប...', 'Searching online food photos...', '正在在线搜索菜品照片...')
                      : tr(
                          language,
                          '🤖 ស្វែងរករូបភាពម្ហូបដោយស្វ័យប្រវត្តិ (ឥតគិតថ្លៃ $0)',
                          '🤖 Auto-Search Matching Food Photos Online (Free $0)',
                          '🤖 自动在线搜索匹配菜品照片（免费 $0）'
                        )}
                  </span>
                </button>

                {onlineCandidates.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block font-khmer">
                      {tr(
                        language,
                        `✨ រកឃើញរូបភាពម្ហូបចំនួន ${onlineCandidates.length} សន្លឹក (ចុចជ្រើសរើស)៖`,
                        `✨ Found ${onlineCandidates.length} matching online photos (tap to select):`,
                        `✨ 已找到 ${onlineCandidates.length} 张匹配照片（点击选择）：`
                      )}
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {onlineCandidates.map((cand, idx) => {
                        const isSelected = selectedFood.photoUrl === cand.url;
                        return (
                          <button
                            key={`${cand.url}-${idx}`}
                            type="button"
                            onClick={() => handleSelectCandidate(cand)}
                            className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition cursor-pointer group ${
                              isSelected
                                ? 'border-emerald-600 ring-2 ring-emerald-500/40'
                                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                            }`}
                          >
                            <img
                              src={cand.url}
                              alt={cand.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] px-1.5 py-0.5 truncate">
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
              </div>
            )}

            {/* Attributes Grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700">
                <Clock className="w-4 h-4 mx-auto text-[#059669] mb-1" />
                <p className="text-[11px] text-slate-400">{tr(language, 'ចម្អិន', 'Cook', '烹饪时间')}</p>
                <p className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-slate-200">{loc.cookTime}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700">
                <Users className="w-4 h-4 mx-auto text-[#10B981] mb-1" />
                <p className="text-[11px] text-slate-400">{tr(language, 'ចំណុះ', 'Serves', '份量')}</p>
                <p className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-slate-200">{loc.servings}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700">
                <Flame className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                <p className="text-[11px] text-slate-400">{tr(language, 'ថាមពល', 'Energy', '热量')}</p>
                <p className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-slate-200">
                  {selectedFood.calories} {tr(language, 'គីឡូកាឡូរី', 'kcal', '千卡')}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700">
                <ChefHat className="w-4 h-4 mx-auto text-[#064E3B] dark:text-emerald-400 mb-1" />
                <p className="text-[11px] text-slate-400">{tr(language, 'កម្រិត', 'Level', '难度')}</p>
                <p className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-slate-200">
                  {loc.difficultyLabel}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-bold text-[#0F172A] dark:text-white text-base mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#059669]" />
                {tr(language, 'អំពីមុខម្ហូបនេះ', 'About this Dish', '关于这道菜')}
              </h3>
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800">
                {loc.description}
              </p>
              <div className="mt-2.5">
                <DishTagChips food={selectedFood} language={language} />
              </div>
            </div>

            {/* Food Passport stamp + where to eat */}
            <div className="flex flex-wrap gap-2">
              <PassportStampButton foodId={selectedFood.id} language={language} showToast={showToast} variant="full" />
            </div>
            <WhereToEat food={selectedFood} />

            {/* Ingredients Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#0F172A] dark:text-white text-base">
                  {tr(language, 'គ្រឿងផ្សំចាំបាច់', 'Ingredients Needed', '所需食材')}
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  {Object.values(checkedIngredients).filter(Boolean).length} / {loc.ingredients.length}
                </span>
              </div>

              <div className="space-y-2">
                {loc.ingredients.map((ing, idx) => {
                  const isChecked = !!checkedIngredients[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleIngredient(idx)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition border text-sm ${
                        isChecked
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-[#064E3B] dark:text-emerald-300 line-through opacity-70'
                          : 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-emerald-500'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <span className="font-semibold">{ing.name}</span>
                      </div>
                      <span className="font-bold text-slate-500 dark:text-slate-400 text-xs">{ing.amount}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step-by-Step Cooking Directions */}
            <div>
              <h3 className="font-bold text-[#0F172A] dark:text-white text-base mb-2.5">
                {tr(language, 'របៀបធ្វើ និងវិធីចម្អិនតាមលំដាប់', 'Step-by-Step Instructions', '详细烹饪步骤')}
              </h3>

              <div className="space-y-3">
                {loc.steps.map((st) => (
                  <div 
                    key={st.stepNumber}
                    className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-2xs space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#064E3B] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {st.stepNumber}
                      </span>
                      <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                        {st.instruction}
                      </p>
                    </div>

                    {st.tip && (
                      <div className="ml-9 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-xs text-[#064E3B] dark:text-emerald-300">
                        💡 {st.tip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Social Share Bar */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-2.5 text-center">
                {tr(language, 'ចែករំលែកមុខម្ហូបនេះទៅកាន់មិត្តភក្តិ', 'Share this recipe with friends', '将此食谱分享给好友')}
              </p>
              
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {/* Telegram */}
                <button
                  type="button"
                  onClick={handleShareTelegram}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#229ED9] text-white text-xs font-bold shadow hover:brightness-105 transition active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  Telegram
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  onClick={handleShareFacebook}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1877F2] text-white text-xs font-bold shadow hover:brightness-105 transition active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Facebook
                </button>

                {/* Copy link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-200 transition active:scale-95"
                >
                  {tr(language, 'ចម្លងតំណ', 'Copy link', '复制链接')}
                </button>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

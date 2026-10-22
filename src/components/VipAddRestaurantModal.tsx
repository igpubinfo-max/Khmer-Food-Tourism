import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Store,
  Image,
  Sparkles,
  CheckCircle2,
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  Utensils,
} from 'lucide-react';
import { RestaurantPriceLevel } from '../types';
import {
  pickImageUsingNativeAndroidGallery,
  processAndCompressImageFile,
} from '../utils/androidMediaHelper';

export const VipAddRestaurantModal: React.FC = () => {
  const {
    isVipAddRestaurantModalOpen,
    setIsVipAddRestaurantModalOpen,
    addRestaurant,
    currentUser,
    language,
    showToast,
    setIsManageMenuModalOpen,
    setManagingRestaurant,
    restaurants,
  } = useApp();

  const isKm = language === 'km';

  // Form Fields
  const [nameKh, setNameKh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [provinceKh, setProvinceKh] = useState('រាជធានីភ្នំពេញ');
  const [provinceEn, setProvinceEn] = useState('Phnom Penh');
  const [addressKh, setAddressKh] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [openingHoursKh, setOpeningHoursKh] = useState('០៧:០០ ព្រឹក - ០៩:០០ យប់');
  const [priceLevel] = useState<RestaurantPriceLevel>('$$');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('/Shop/rest-1.jpg');
  const [foodPhotos, setFoodPhotos] = useState<string[]>([]);
  const [descriptionKh, setDescriptionKh] = useState('');
  const [signatureDish, setSignatureDish] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const profileGalleryInputRef = useRef<HTMLInputElement>(null);
  const profileCameraInputRef = useRef<HTMLInputElement>(null);
  const foodGalleryInputRef = useRef<HTMLInputElement>(null);
  const foodCameraInputRef = useRef<HTMLInputElement>(null);

  if (!isVipAddRestaurantModalOpen) return null;

  const samplePhotos = [
    '/Shop/rest-1.jpg',
    '/Shop/rest-2.jpg',
    '/Shop/rest-3.jpg',
    '/Shop/rest-4.jpg',
    '/Shop/rest-5.jpg',
    '/Shop/rest-19.jpg',
  ];

  const provinces = [
    { nameKh: 'រាជធានីភ្នំពេញ', nameEn: 'Phnom Penh' },
    { nameKh: 'ខេត្តសៀមរាប', nameEn: 'Siem Reap' },
    { nameKh: 'ខេត្តបាត់ដំបង', nameEn: 'Battambang' },
    { nameKh: 'ខេត្តកំពត', nameEn: 'Kampot' },
    { nameKh: 'ខេត្តកែប', nameEn: 'Kep' },
    { nameKh: 'ខេត្តព្រះសីហនុ', nameEn: 'Sihanoukville' },
    { nameKh: 'ខេត្តកោះកុង', nameEn: 'Koh Kong' },
    { nameKh: 'ខេត្តកំពង់ចាម', nameEn: 'Kampong Cham' },
    { nameKh: 'ខេត្តកំពង់ស្ពឺ', nameEn: 'Kampong Speu' },
    { nameKh: 'ខេត្តមណ្ឌលគិរី', nameEn: 'Mondulkiri' },
  ];

  const handlePickProfileFromGallery = async () => {
    setIsUploadingImage(true);
    try {
      const nativePick = await pickImageUsingNativeAndroidGallery();
      if (nativePick.cancelled) {
        setIsUploadingImage(false);
        return;
      }
      if (nativePick.success && nativePick.dataUrl) {
        setProfilePhotoUrl(nativePick.dataUrl);
        showToast(
          isKm ? '✅ បានជ្រើសរើសរូបតំណាងហាងជោគជ័យ!' : '✅ Shop profile picture selected!',
          'success'
        );
        setIsUploadingImage(false);
        return;
      }
    } catch {
      // Fallback
    }
    setIsUploadingImage(false);
    profileGalleryInputRef.current?.click();
  };

  const handleProfileFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const dataUrl = await processAndCompressImageFile(file);
      setProfilePhotoUrl(dataUrl);
      showToast(isKm ? '✅ បានដាក់រូបតំណាងហាងជោគជ័យ!' : '✅ Shop profile picture uploaded!', 'success');
    } catch (err: any) {
      showToast(err?.message || (isKm ? 'រូបភាពមិនត្រឹមត្រូវ' : 'Invalid image'), 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFoodFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setIsUploadingImage(true);
    const uploaded: string[] = [];
    for (const file of files.slice(0, 8)) {
      try {
        const dataUrl = await processAndCompressImageFile(file);
        if (dataUrl) uploaded.push(dataUrl);
      } catch (err: any) {
        showToast(
          err?.message || (isKm ? 'រូបភាពមិនត្រឹមត្រូវ' : 'Invalid image file'),
          'warning'
        );
      }
    }
    setIsUploadingImage(false);
    if (uploaded.length > 0) {
      setFoodPhotos((prev) => [...prev, ...uploaded].slice(0, 10));
      showToast(
        isKm
          ? `✅ បានបន្ថែមរូបភាពមុខម្ហូបចំនួន ${uploaded.length} សន្លឹក!`
          : `✅ Added ${uploaded.length} food photo(s)!`,
        'success'
      );
    }
  };

  const handleReplaceFoodPhoto = async (idx: number) => {
    try {
      const nativePick = await pickImageUsingNativeAndroidGallery();
      if (nativePick.success && nativePick.dataUrl) {
        setFoodPhotos((prev) => prev.map((item, i) => (i === idx ? nativePick.dataUrl! : item)));
        showToast(isKm ? '✅ បានប្តូររូបភាពមុខម្ហូបជោគជ័យ!' : '✅ Food photo replaced!', 'success');
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលឈ្មោះហាងជាភាសាខ្មែរ!' : 'Please enter restaurant name in Khmer!', 'warning');
      return;
    }

    const finalProfile = profilePhotoUrl.trim() || '/Shop/rest-1.jpg';
    const combinedGallery = Array.from(new Set([finalProfile, ...foodPhotos]));

    const newRestData = {
      nameKh: nameKh.trim(),
      nameEn: nameEn.trim() || nameKh.trim(),
      descriptionKh: descriptionKh.trim() || 'ភោជនីយដ្ឋានម្ហូបខ្មែររសជាតិដើម ផាសុកភាព និងអនាម័យខ្ពស់។',
      descriptionEn: nameEn.trim() ? `${nameEn.trim()} authentic restaurant.` : 'Authentic Khmer restaurant.',
      photoUrl: finalProfile,
      profileImage: finalProfile,
      foodImages: foodPhotos,
      galleryPhotos: combinedGallery,
      addressKh: addressKh.trim() || `${provinceKh} ប្រទេសកម្ពុជា`,
      addressEn: `${provinceEn}, Cambodia`,
      provinceKh,
      provinceEn,
      phone: phone.trim() || '012 345 678',
      openingHoursKh,
      openingHoursEn: '07:00 AM - 09:00 PM',
      priceLevel,
      mapUrl: `https://maps.google.com/?q=${encodeURIComponent(nameKh)}`,
      latitude: 11.5564,
      longitude: 104.9282,
      signatureDishesKh: signatureDish.trim() ? [signatureDish.trim()] : ['ម្ហូបពិសេសប្រចាំហាង'],
      isFeatured: true,
      isVerified: true,
      membershipTier: 'premium' as const,
      status: 'approved' as const,
      ownerId: currentUser?.id,
      ownerName: currentUser?.name,
      ownerPhone: phone.trim(),
    };

    addRestaurant(newRestData);
    setIsVipAddRestaurantModalOpen(false);
    setFoodPhotos([]);

    setTimeout(() => {
      const added = restaurants[0];
      if (added) {
        setManagingRestaurant(added);
        setIsManageMenuModalOpen(true);
      }
    }, 300);

    showToast(
      isKm
        ? '🎉 បានបន្ថែមហាងថ្មីក្រោមសិទ្ធិ VIP ដោយជោគជ័យ! លោកអ្នកអាចគ្រប់គ្រងមុខម្ហូបបានភ្លាមៗ។'
        : '🎉 Restaurant added under VIP benefits! You can now manage your menu items.',
      'success'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-amber-500/40 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-600 via-yellow-600 to-[#064E3B] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-400 text-slate-950 shadow-md">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-moul text-sm sm:text-base text-white">
                  {isKm ? 'បន្ថែមហាងផ្ទាល់ខ្លួន (VIP Store)' : 'Add My VIP Restaurant'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase font-sans">
                  VIP Power
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-khmer">
                {isKm ? 'បន្ថែមរូបតំណាងហាង រូបភាពម្ហូប និងគ្រប់គ្រងមុខម្ហូបបានភ្លាមៗ' : 'Upload shop profile, food photos & manage menu'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsVipAddRestaurantModalOpen(false)}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[78vh] font-khmer text-xs">
          {/* Store Name Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {isKm ? 'ឈ្មោះហាង (ជាភាសាខ្មែរ) *' : 'Restaurant Name (Khmer) *'}
              </label>
              <input
                type="text"
                required
                value={nameKh}
                onChange={(e) => setNameKh(e.target.value)}
                placeholder={isKm ? 'ឧ. ភោជនីយដ្ឋាន មរតកខ្មែរ' : 'e.g. Morodok Khmer'}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {isKm ? 'ឈ្មោះហាង (ជាអក្សរឡាតាំង)' : 'Restaurant Name (English)'}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Morodok Khmer Restaurant"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Province & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {isKm ? 'រាជធានី / ខេត្ត' : 'Province / City'}
              </label>
              <select
                value={provinceKh}
                onChange={(e) => {
                  const found = provinces.find((p) => p.nameKh === e.target.value);
                  setProvinceKh(e.target.value);
                  if (found) setProvinceEn(found.nameEn);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
              >
                {provinces.map((p) => (
                  <option key={p.nameKh} value={p.nameKh}>
                    {isKm ? p.nameKh : p.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {isKm ? 'លេខទូរស័ព្ទទំនាក់ទំនង' : 'Phone Number'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="012 345 678"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Address & Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {isKm ? 'អាសយដ្ឋាន ឬទីតាំងជាក់ស្តែង' : 'Address'}
              </label>
              <input
                type="text"
                value={addressKh}
                onChange={(e) => setAddressKh(e.target.value)}
                placeholder={isKm ? 'ឧ. ផ្លូវលេខ ៦៣ សង្កាត់បឹងកេងកង' : 'Street address'}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {isKm ? 'ម៉ោងបើក & បិទ' : 'Opening Hours'}
              </label>
              <input
                type="text"
                value={openingHoursKh}
                onChange={(e) => setOpeningHoursKh(e.target.value)}
                placeholder="០៧:០០ ព្រឹក - ០៩:០០ យប់"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Signature Dish */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
              {isKm ? 'មុខម្ហូបពិសេសប្រចាំហាង (Signature Dish)' : 'Signature Dish'}
            </label>
            <input
              type="text"
              value={signatureDish}
              onChange={(e) => setSignatureDish(e.target.value)}
              placeholder={isKm ? 'ឧ. អាម៉ុកត្រីរ៉ស់, សម្លម្ជូរគ្រឿង' : 'e.g. Traditional Fish Amok'}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* 1. Shop Profile Picture Upload Field */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Image className="w-4 h-4 text-amber-500" />
                <span>{isKm ? '១. រូបភាពតំណាងហាង (Shop Profile Picture)' : '1. Shop Profile Picture'}</span>
              </label>
              <span className="text-[10px] text-slate-400">JPG, JPEG, PNG</span>
            </div>

            <input
              ref={profileGalleryInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleProfileFileChange}
              className="hidden"
            />
            <input
              ref={profileCameraInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              capture="environment"
              onChange={handleProfileFileChange}
              className="hidden"
            />

            {profilePhotoUrl && (
              <div className="relative rounded-2xl overflow-hidden border-2 border-amber-500/60 bg-slate-900 h-36">
                <img src={profilePhotoUrl} alt="Shop Profile" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePickProfileFromGallery}
                    className="px-2.5 py-1 rounded-lg bg-white/90 text-slate-900 font-bold text-[10px] flex items-center gap-1 shadow cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isKm ? 'ប្តូររូប' : 'Replace'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfilePhotoUrl('')}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] flex items-center gap-1 shadow cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{isKm ? 'លុប' : 'Remove'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isUploadingImage}
                onClick={handlePickProfileFromGallery}
                className="py-2 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isKm ? 'ជ្រើសពី Gallery / Photos' : 'Choose from Gallery'}</span>
              </button>
              <button
                type="button"
                disabled={isUploadingImage}
                onClick={() => profileCameraInputRef.current?.click()}
                className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isKm ? 'ថតរូបថ្មី (Camera)' : 'Take Photo (Camera)'}</span>
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {samplePhotos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="sample"
                  onClick={() => setProfilePhotoUrl(url)}
                  className={`w-12 h-12 rounded-xl object-cover cursor-pointer border-2 transition shrink-0 ${
                    profilePhotoUrl === url
                      ? 'border-amber-500 ring-2 ring-amber-400/50 scale-105'
                      : 'border-slate-300 opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 2. Food Photos (Multiple Images) Upload Field */}
          <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-slate-800/70 border border-amber-300/70 dark:border-amber-700/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-amber-600" />
                <span>
                  {isKm
                    ? `២. រូបភាពមុខម្ហូបប្រចាំហាង (Food Photos - ${foodPhotos.length} សន្លឹក)`
                    : `2. Food Photos (${foodPhotos.length} uploaded)`}
                </span>
              </label>
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                {isKm ? 'អាចដាក់បានច្រើនសន្លឹក' : 'Multiple Photos'}
              </span>
            </div>

            <input
              ref={foodGalleryInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleFoodFilesChange}
              className="hidden"
            />
            <input
              ref={foodCameraInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              capture="environment"
              onChange={handleFoodFilesChange}
              className="hidden"
            />

            {foodPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {foodPhotos.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden border border-amber-400 bg-slate-900"
                  >
                    <img src={imgUrl} alt={`Food ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 p-1 bg-black/75 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => handleReplaceFoodPhoto(idx)}
                        className="px-1.5 py-0.5 rounded bg-white/90 text-slate-900 font-bold text-[9px] cursor-pointer"
                      >
                        {isKm ? 'ប្តូរ' : 'Replace'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFoodPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[9px] cursor-pointer"
                      >
                        {isKm ? 'លុប' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isUploadingImage}
                onClick={() => foodGalleryInputRef.current?.click()}
                className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isKm ? 'ជ្រើសរូបម្ហូបច្រើនសន្លឹក' : 'Add Food Photos'}</span>
              </button>
              <button
                type="button"
                disabled={isUploadingImage}
                onClick={() => foodCameraInputRef.current?.click()}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isKm ? 'ថតរូបម្ហូប (Camera)' : 'Camera Food Photo'}</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
              {isKm ? 'ការពិពណ៌នាអំពីហាង' : 'Restaurant Description'}
            </label>
            <textarea
              rows={2}
              value={descriptionKh}
              onChange={(e) => setDescriptionKh(e.target.value)}
              placeholder={isKm ? 'រៀបរាប់សង្ខេបអំពីបរិយាកាស និងរសជាតិម្ហូប...' : 'Brief description...'}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* VIP Instant Publish Card */}
          <div className="p-3 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/15 rounded-2xl border border-amber-400/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {isKm ? 'សិទ្ធិ VIP ពេញលេញ (១០០% Unlocked)' : 'VIP Full Permissions'}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isKm ? 'ឥតគិតថ្លៃចុះបញ្ជី • សកម្មតាមសុពលភាពគម្រោង VIP (30 ឬ 90 ថ្ងៃ)' : 'Zero registration fee • Active under VIP plan (30 or 90 days)'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white font-black text-[10px]">
              FREE FOR VIP
            </span>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98"
            >
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
              <span>{isKm ? '✨ បង្កើតហាងភ្លាមៗ (Create VIP Store) →' : '✨ Create VIP Restaurant Now →'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

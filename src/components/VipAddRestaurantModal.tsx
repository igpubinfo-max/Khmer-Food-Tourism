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
  Edit2,
  Lock,
  Clock,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { RestaurantPriceLevel, isUserVipActive, getVipAccountState } from '../types';
import {
  pickImageUsingNativeAndroidGallery,
  processAndCompressImageFile,
} from '../utils/androidMediaHelper';
import { searchOnlineFoodImages, OnlineFoodImageCandidate } from '../services/onlineFoodImageService';

export const VipAddRestaurantModal: React.FC = () => {
  const {
    isVipAddRestaurantModalOpen,
    setIsVipAddRestaurantModalOpen,
    addRestaurant,
    deleteRestaurant,
    currentUser,
    language,
    showToast,
    setIsManageMenuModalOpen,
    setManagingRestaurant,
    restaurants,
    openUpgradeVipModal,
    setIsAuthModalOpen,
  } = useApp();

  const isKm = language === 'km';
  const isAdmin = 
    currentUser?.role === 'admin' || 
    currentUser?.id === 'admin-authorized-single' || 
    currentUser?.username === 'admin' || 
    currentUser?.username === 'cheasavuth';
  const isApprovedVip = isUserVipActive(currentUser);
  const vipState = getVipAccountState(currentUser);
  const isAuthorized = isAdmin || isApprovedVip;

  const existingOwnedRestaurant =
    currentUser && currentUser.role !== 'admin'
      ? restaurants.find((r) => r.ownerId === currentUser.id)
      : undefined;

  // Form Fields
  const [nameKh, setNameKh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [provinceKh, setProvinceKh] = useState('រាជធានីភ្នំពេញ');
  const [provinceEn, setProvinceEn] = useState('Phnom Penh');
  const [addressKh, setAddressKh] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [openingHoursKh, setOpeningHoursKh] = useState('០៧:០០ ព្រឹក - ០៩:០០ យប់');
  const [priceLevel] = useState<RestaurantPriceLevel>('$$');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('/foods/food-1.jpg');
  const [foodPhotos, setFoodPhotos] = useState<string[]>([]);
  const [descriptionKh, setDescriptionKh] = useState('');
  const [signatureDish, setSignatureDish] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineCandidates, setOnlineCandidates] = useState<OnlineFoodImageCandidate[]>([]);

  const handleSearchOnlineFoodPhotos = async () => {
    setIsSearchingOnline(true);
    try {
      const queryKh = signatureDish.trim() || nameKh.trim() || 'ម្ហូបខ្មែរ';
      const results = await searchOnlineFoodImages({
        nameKh: queryKh,
        nameEn: nameEn.trim() || queryKh,
        categorySlug: 'soup',
        existingUrls: [profilePhotoUrl, ...foodPhotos],
      });
      setOnlineCandidates(results);
      if (results.length > 0) {
        setFoodPhotos((prev) => (prev.includes(results[0].url) ? prev : [...prev, results[0].url]));
        showToast(
          isKm
            ? `✨ រកឃើញរូបភាពម្ហូបពី Online ចំនួន ${results.length} សន្លឹក!`
            : `✨ Found ${results.length} online food photos!`,
          'success'
        );
      }
    } catch {
      showToast(isKm ? 'មិនអាចស្វែងរករូបភាពពី Online បានទេ' : 'Failed to search online food photos', 'warning');
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const profileGalleryInputRef = useRef<HTMLInputElement>(null);
  const profileCameraInputRef = useRef<HTMLInputElement>(null);
  const foodGalleryInputRef = useRef<HTMLInputElement>(null);
  const foodCameraInputRef = useRef<HTMLInputElement>(null);

  if (!isVipAddRestaurantModalOpen) return null;

  const samplePhotos = [
    '/foods/food-1.jpg',
    '/foods/food-2.jpg',
    '/foods/food-3.jpg',
    '/foods/food-4.jpg',
    '/foods/food-5.jpg',
    '/foods/food-6.jpg',
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
                  {isKm ? 'ចុះបញ្ជីហាង VIP របស់អ្នក (1 ហាង)' : 'Register Your VIP Restaurant (1 Store)'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase font-sans">
                  VIP 1 ហាង
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-khmer leading-relaxed mt-0.5">
                {isKm
                  ? 'ចុះបញ្ជីហាងមុន ហាងរបស់លោកអ្នកនឹងបង្ហាញមុនគេតាមលំដាប់លេខរៀង ដើម្បីងាយស្រួលឱ្យអតិថិជនស្វែងរក និងតាមដានស្ថិតិហាង។'
                  : 'Register early so your restaurant appears first in chronological order for easy discovery and analytics tracking.'}
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

        {/* Form Body or VIP Permission Guard or 1-Restaurant-Per-User Limit Guard */}
        {!isAuthorized ? (
          <div className="p-6 text-center space-y-4 font-khmer">
            {!currentUser ? (
              <div className="py-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#064E3B] dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? 'សូមចូលគណនីជាមុនសិន' : 'Please Sign In First'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
                  {isKm
                    ? 'លោកអ្នកត្រូវចូលគណនីដែលមានសមាជិកភាព VIP សកម្ម ដើម្បីចុះបញ្ជីហាង VIP របស់អ្នក។'
                    : 'Please sign in with your active VIP account to register your restaurant.'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVipAddRestaurantModalOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    {isKm ? 'ចូលគណនីឥឡូវនេះ' : 'Sign In Now'}
                  </button>
                </div>
              </div>
            ) : vipState === 'pending_vip' ? (
              <div className="py-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto shadow-md ring-4 ring-amber-400/20">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold font-sans">
                  PENDING_ADMIN_APPROVAL
                </span>
                <h3 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? '⏳ កំពុងរង់ចាំ Admin ពិនិត្យ និងអនុម័ត' : '⏳ Awaiting Admin Approval'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  {isKm
                    ? 'ការស្នើសុំសមាជិកភាព VIP របស់អ្នកត្រូវបានកត់ត្រា និងកំពុងស្ថិតក្នុងការពិនិត្យផ្ទៀងផ្ទាត់ដោយ Administrator។ មុខងារចុះបញ្ជីហាង VIP នឹងបើកដំណើរការភ្លាមៗក្រោយពេលទទួលបានការអនុម័ត!'
                    : 'Your VIP request is awaiting Admin approval. Restaurant registration will unlock immediately upon approval!'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsVipAddRestaurantModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                  >
                    {isKm ? 'យល់ព្រម (បិទ)' : 'Close'}
                  </button>
                </div>
              </div>
            ) : vipState === 'expired_vip' ? (
              <div className="py-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto shadow-md ring-4 ring-red-400/20">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 text-xs font-bold font-sans">
                  VIP_EXPIRED
                </span>
                <h3 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? '⚠️ សមាជិកភាព VIP បានផុតកំណត់' : '⚠️ VIP Membership Expired'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  {isKm
                    ? 'សមាជិកភាព VIP របស់លោកអ្នកបានផុតកំណត់ហើយ។ សូមបន្តកញ្ចប់ VIP ($2.99 / 30 ថ្ងៃ ឬ $4.99 / 90 ថ្ងៃ) ដើម្បីចុះបញ្ជីហាង VIP របស់អ្នក។'
                    : 'Your VIP membership has expired. Please renew your VIP membership to register your restaurant.'}
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVipAddRestaurantModalOpen(false);
                      openUpgradeVipModal(true);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                  >
                    {isKm ? '✨ បន្តកញ្ចប់ VIP ឥឡូវនេះ' : '✨ Renew VIP Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVipAddRestaurantModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                  >
                    {isKm ? 'បិទ' : 'Close'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center mx-auto shadow-lg ring-4 ring-amber-400/20">
                  <Crown className="w-8 h-8" />
                </div>
                <h3 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? '🔒 សម្រាប់តែសមាជិក VIP ដែលបានអនុម័ត' : '🔒 Approved VIP Only'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  {isKm
                    ? 'ការចុះបញ្ជីហាង គឺអនុញ្ញាតជូនតែសមាជិក VIP ដែលបានបង់ប្រាក់ និងទទួលបានការអនុម័តពី Administrator ប៉ុណ្ណោះ។ សូមដំឡើងទៅកញ្ចប់ VIP ($2.99 / 30 ថ្ងៃ ឬ $4.99 / 90 ថ្ងៃ) ដើម្បីចុះបញ្ជីហាង និងទទួលបានអត្ថប្រយោជន៍ទាំង ១០!'
                    : 'Restaurant registration is exclusive to approved VIP members. Upgrade to VIP ($2.99 / 30 days or $4.99 / 90 days) to register your restaurant!'}
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVipAddRestaurantModalOpen(false);
                      openUpgradeVipModal();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                  >
                    {isKm ? '👑 ដំឡើងទៅកញ្ចប់ VIP ឥឡូវនេះ' : '👑 Upgrade to VIP Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVipAddRestaurantModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                  >
                    {isKm ? 'បិទ' : 'Close'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : existingOwnedRestaurant ? (
          <div className="p-5 space-y-4 font-khmer text-xs">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                <Store className="w-5 h-5 shrink-0" />
                <span>
                  {isKm
                    ? 'គណនី VIP នីមួយៗអាចបង្កើតបានត្រឹមតែ ១ ហាងប៉ុណ្ណោះ'
                    : 'Each VIP Account Can Add Only 1 Restaurant'}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                {isKm
                  ? `គណនីរបស់លោកអ្នកមានហាង "${existingOwnedRestaurant.nameKh}" រួចហើយ។ ប្រសិនបើលោកអ្នកចង់ផ្លាស់ប្តូរព័ត៌មាន សូមចុចកែប្រែហាងដែលមានស្រាប់ ឬលុបហាងចាស់ជាមុនសិន មុននឹងបន្ថែមហាងថ្មី។`
                  : `You already own "${existingOwnedRestaurant.nameEn || existingOwnedRestaurant.nameKh}". Please edit your existing restaurant or delete it before adding a new one.`}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <img
                src={existingOwnedRestaurant.photoUrl}
                alt={existingOwnedRestaurant.nameKh}
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-amber-400"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {isKm ? existingOwnedRestaurant.nameKh : existingOwnedRestaurant.nameEn}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  📍 {existingOwnedRestaurant.addressKh}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  🍽️ {existingOwnedRestaurant.menuItems?.length || 0} / 20 មុខម្ហូប
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsVipAddRestaurantModalOpen(false);
                  setManagingRestaurant(existingOwnedRestaurant);
                  setIsManageMenuModalOpen(true);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#064E3B] to-emerald-600 hover:from-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                <span>
                  {isKm
                    ? '✏️ កែប្រែហាងដែលមានស្រាប់ (Edit Existing Restaurant)'
                    : '✏️ Edit Existing Restaurant'}
                </span>
              </button>

              {deleteRestaurant && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        isKm
                          ? `តើអ្នកពិតជាចង់លុបហាង "${existingOwnedRestaurant.nameKh}" មែនទេ? ក្រោយពេលលុប អ្នកអាចបង្កើតហាងថ្មីជំនួសវិញបានភ្លាមៗ។`
                          : `Delete "${existingOwnedRestaurant.nameEn || existingOwnedRestaurant.nameKh}" so you can add a new restaurant?`
                      )
                    ) {
                      deleteRestaurant(existingOwnedRestaurant.id);
                    }
                  }}
                  className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {isKm
                      ? '🗑️ លុបហាងចាស់ដើម្បីបង្កើតថ្មី (Delete Existing Store)'
                      : '🗑️ Delete Existing Store to Add New'}
                  </span>
                </button>
              )}
            </div>
          </div>
        ) : (
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

            <button
              type="button"
              disabled={isSearchingOnline}
              onClick={handleSearchOnlineFoodPhotos}
              className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-[#064E3B] to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 text-amber-300 shrink-0 ${isSearchingOnline ? 'animate-spin' : ''}`} />
              <span>
                {isSearchingOnline
                  ? (isKm ? 'កំពុងស្វែងរករូបភាពម្ហូបពី Online...' : 'Searching online food photos...')
                  : (isKm
                      ? '🤖 ស្វែងរករូបភាពម្ហូបពី Online ដោយស្វ័យប្រវត្តិ (ឥតគិតថ្លៃ $0)'
                      : '🤖 Auto-Search Matching Food Photos Online (Free $0)')}
              </span>
            </button>

            {onlineCandidates.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
                  {isKm
                    ? `✨ រកឃើញរូបភាពម្ហូបពី Online ចំនួន ${onlineCandidates.length} សន្លឹក (ចុចជ្រើសរើសបន្ថែម)៖`
                    : `✨ Found ${onlineCandidates.length} online food photos (tap to add):`}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {onlineCandidates.map((cand, idx) => {
                    const isAdded = foodPhotos.includes(cand.url);
                    return (
                      <button
                        key={`${cand.url}-${idx}`}
                        type="button"
                        onClick={() => {
                          setFoodPhotos((prev) =>
                            prev.includes(cand.url) ? prev : [...prev, cand.url]
                          );
                          setProfilePhotoUrl(cand.url);
                        }}
                        className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                          isAdded
                            ? 'border-emerald-600 ring-2 ring-emerald-500/40'
                            : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        <img src={cand.url} alt={cand.title} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] px-1.5 py-0.5 truncate">
                          {cand.source}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
        )}
      </div>
    </div>
  );
};

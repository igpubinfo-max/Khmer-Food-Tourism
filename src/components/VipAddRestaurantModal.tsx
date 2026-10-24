import React, { useState, useMemo } from 'react';
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
  ShieldCheck,
  ShieldAlert,
  Bot,
} from 'lucide-react';
import {
  RestaurantPriceLevel,
  isUserVipActive,
  getVipAccountState,
  AiStoreCategoryVerificationReport,
} from '../types';
import {
  pickImageUsingNativeAndroidGallery,
  processAndCompressImageFile,
} from '../utils/androidMediaHelper';
import { searchOnlineFoodImages, OnlineFoodImageCandidate } from '../services/onlineFoodImageService';
import { ShopMultiPhotoUploader } from './ShopMultiPhotoUploader';
import {
  analyzeFoodBusinessDeterministically,
  verifyFoodBusinessOnServer,
} from '../services/aiFoodBusinessVerifierService';

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
    getOwnedRestaurantsForUser,
    openManageMyVipStore,
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

  const ownedRestaurants = getOwnedRestaurantsForUser(currentUser);
  const existingOwnedRestaurant =
    currentUser && !isAdmin
      ? ownedRestaurants[0]
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
  const [shopPhotos, setShopPhotos] = useState<string[]>(['/foods/food-1.jpg']);
  const [descriptionKh, setDescriptionKh] = useState('');
  const [signatureDish, setSignatureDish] = useState('');
  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [aiReport, setAiReport] = useState<AiStoreCategoryVerificationReport | null>(null);

  // Live AI preview analysis as user types
  const liveAiPreview = useMemo(() => {
    if (!nameKh.trim() && !nameEn.trim() && !signatureDish.trim() && !descriptionKh.trim()) {
      return null;
    }
    return analyzeFoodBusinessDeterministically({
      nameKh: nameKh.trim(),
      nameEn: nameEn.trim(),
      signatureDishesKh: signatureDish.trim() ? [signatureDish.trim()] : [],
      descriptionKh: descriptionKh.trim(),
      addressKh: addressKh.trim(),
      provinceKh,
      photoUrl: shopPhotos[0] || '/foods/food-1.jpg',
      foodImages: shopPhotos,
    });
  }, [nameKh, nameEn, signatureDish, descriptionKh, addressKh, provinceKh, shopPhotos]);

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
    { nameKh: 'ខេត្តព្រះសីហនុ', nameEn: 'Preah Sihanouk' },
    { nameKh: 'ខេត្តកោះកុង', nameEn: 'Koh Kong' },
    { nameKh: 'ខេត្តមណ្ឌលគិរី', nameEn: 'Mondulkiri' },
    { nameKh: 'ខេត្តរតនគិរី', nameEn: 'Ratanakiri' },
    { nameKh: 'ខេត្តកណ្តាល', nameEn: 'Kandal' },
    { nameKh: 'ខេត្តកំពង់ចាម', nameEn: 'Kampong Cham' },
    { nameKh: 'ខេត្តកំពង់ឆ្នាំង', nameEn: 'Kampong Chhnang' },
    { nameKh: 'ខេត្តកំពង់ស្ពឺ', nameEn: 'Kampong Speu' },
    { nameKh: 'ខេត្តកំពង់ធំ', nameEn: 'Kampong Thom' },
    { nameKh: 'ខេត្តក្រចេះ', nameEn: 'Kratie' },
    { nameKh: 'ខេត្តតាកែវ', nameEn: 'Takeo' },
    { nameKh: 'ខេត្តព្រៃវែង', nameEn: 'Prey Veng' },
    { nameKh: 'ខេត្តស្វាយរៀង', nameEn: 'Svay Rieng' },
    { nameKh: 'ខេត្តពោធិ៍សាត់', nameEn: 'Pursat' },
    { nameKh: 'ខេត្តបន្ទាយមានជ័យ', nameEn: 'Banteay Meanchey' },
    { nameKh: 'ខេត្តប៉ៃលិន', nameEn: 'Pailin' },
    { nameKh: 'ខេត្តឧត្តរមានជ័យ', nameEn: 'Oddar Meanchey' },
    { nameKh: 'ខេត្តព្រះវិហារ', nameEn: 'Preah Vihear' },
    { nameKh: 'ខេត្តស្ទឹងត្រែង', nameEn: 'Stung Treng' },
    { nameKh: 'ខេត្តត្បូងឃ្មុំ', nameEn: 'Tboung Khmum' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលឈ្មោះហាងជាភាសាខ្មែរ!' : 'Please enter restaurant name in Khmer!', 'warning');
      return;
    }

    setIsVerifyingAi(true);
    setAiReport(null);

    try {
      const finalProfile = (shopPhotos[0] || '').trim() || '/Shop/rest-1.jpg';
      const combinedGallery = Array.from(new Set([finalProfile, ...shopPhotos])).filter(Boolean);

      // Run Server-Side AI Food-Business Verification before saving or publishing
      const serverReport = await verifyFoodBusinessOnServer({
        nameKh: nameKh.trim(),
        nameEn: nameEn.trim() || nameKh.trim(),
        descriptionKh: descriptionKh.trim(),
        descriptionEn: nameEn.trim(),
        signatureDishesKh: signatureDish.trim() ? [signatureDish.trim()] : [],
        addressKh: addressKh.trim() || `${provinceKh} ប្រទេសកម្ពុជា`,
        provinceKh,
        phone: phone.trim(),
        photoUrl: finalProfile,
        profileImage: finalProfile,
        foodImages: shopPhotos,
        galleryPhotos: combinedGallery,
        ownerId: currentUser?.id,
        ownerName: currentUser?.name,
      });

      setAiReport(serverReport);

      // 1. If AI determines the business is unrelated to prepared food -> Reject and explain in Khmer
      if (serverReport.decision === 'rejected') {
        showToast(isKm ? serverReport.reasonKh : serverReport.reasonEn, 'warning');
        return;
      }

      const newRestData = {
        nameKh: nameKh.trim(),
        nameEn: nameEn.trim() || nameKh.trim(),
        descriptionKh: descriptionKh.trim() || 'ភោជនីយដ្ឋានម្ហូបខ្មែររសជាតិដើម ផាសុកភាព និងអនាម័យខ្ពស់។',
        descriptionEn: nameEn.trim() ? `${nameEn.trim()} authentic restaurant.` : 'Authentic Khmer restaurant.',
        photoUrl: finalProfile,
        profileImage: finalProfile,
        foodImages: shopPhotos,
        galleryPhotos: combinedGallery,
        addressKh: addressKh.trim() || `${provinceKh} ប្រទេសកម្ពុជា`,
        addressEn: `${provinceEn}, Cambodia`,
        provinceKh,
        provinceEn,
        phone: phone.trim() || currentUser?.phone || '012 345 678',
        openingHoursKh,
        openingHoursEn: '07:00 AM - 09:00 PM',
        priceLevel,
        mapUrl: `https://maps.google.com/?q=${encodeURIComponent(nameKh.trim())}`,
        latitude: 11.5564,
        longitude: 104.9282,
        signatureDishesKh: signatureDish.trim() ? [signatureDish.trim()] : ['ម្ហូបពិសេសប្រចាំហាង'],
        isFeatured: serverReport.decision === 'approved',
        isVerified: serverReport.decision === 'approved',
        membershipTier: 'premium' as const,
        status: (serverReport.decision === 'pending_review' ? 'pending' : 'approved') as 'approved' | 'pending' | 'rejected',
        aiCategoryVerification: serverReport,
        ownerId: currentUser?.id,
        ownerName: currentUser?.name,
        ownerPhone: phone.trim() || currentUser?.phone || '',
      };

      const created = addRestaurant(newRestData);
      if (!created) return;

      // Reset form state cleanly
      setNameKh('');
      setNameEn('');
      setAddressKh('');
      setDescriptionKh('');
      setSignatureDish('');
      setShopPhotos(['/foods/food-1.jpg']);
      setAiReport(null);
      setIsVipAddRestaurantModalOpen(false);

      setManagingRestaurant(created);
      setIsManageMenuModalOpen(true);
    } catch (err: any) {
      console.error('Error creating VIP shop:', err);
      showToast(
        isKm
          ? 'មានបញ្ហាបច្ចេកទេសពេលបង្កើតហាង។ សូមពិនិត្យព័ត៌មាន រួចព្យាយាមម្ដងទៀត!'
          : 'An unexpected error occurred while creating your shop. Please try again!',
        'warning'
      );
    } finally {
      setIsVerifyingAi(false);
    }
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

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center gap-3">
                <img
                  src={existingOwnedRestaurant.photoUrl}
                  alt={existingOwnedRestaurant.nameKh}
                  className="w-14 h-14 rounded-xl object-cover shrink-0 border border-amber-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {isKm ? existingOwnedRestaurant.nameKh : existingOwnedRestaurant.nameEn}
                    </h4>
                    {existingOwnedRestaurant.status === 'approved' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                        {isKm ? '✅ អនុម័តរួចរាល់' : '✅ Approved'}
                      </span>
                    ) : existingOwnedRestaurant.status === 'pending' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold">
                        {isKm ? '⏳ រង់ចាំ Admin ពិនិត្យ' : '⏳ Pending Admin Review'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                        {isKm ? '🚫 ត្រូវបានបដិសេធ' : '🚫 Rejected'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    📍 {existingOwnedRestaurant.addressKh}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                    🍽️ {existingOwnedRestaurant.menuItems?.length || 0} / 20 មុខម្ហូប
                  </span>
                </div>
              </div>

              {existingOwnedRestaurant.aiCategoryVerification && (
                <div
                  className={`p-2.5 rounded-xl border text-[11px] leading-relaxed ${
                    existingOwnedRestaurant.status === 'approved'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : existingOwnedRestaurant.status === 'pending'
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                        : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {isKm
                    ? existingOwnedRestaurant.aiCategoryVerification.reasonKh
                    : existingOwnedRestaurant.aiCategoryVerification.reasonEn}
                </div>
              )}
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
          {/* AI Food-Business Policy Notice */}
          <div className="p-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-400/50 flex items-start gap-2.5">
            <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px] leading-relaxed">
              <p className="font-bold text-emerald-900 dark:text-emerald-200">
                {isKm
                  ? '🤖 ប្រព័ន្ធ AI ត្រួតពិនិត្យប្រភេទអាជីវកម្មម្ហូបអាហារស្វ័យប្រវត្តិ'
                  : '🤖 AI-Powered Food Business Category Verification'}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                {isKm
                  ? 'អនុញ្ញាតឱ្យបង្កើតហាងសម្រាប់តែ ភោជនីយដ្ឋាន អាហារដ្ឋាន តូបលក់ម្ហូប ហាងកាហ្វេ និងហាងលក់ម្ហូបអាហារចម្អិនស្រាប់ប៉ុណ្ណោះ។ ហាងគ្រឿងទេស ខោអាវ គ្រឿងអេឡិចត្រូនិក ឬអាជីវកម្មក្រៅពីអាហារនឹងត្រូវបដិសេធដោយស្វ័យប្រវត្តិ។'
                  : 'Only restaurants, eateries, food stalls, cafés, and businesses selling prepared meals are allowed. Grocery stores, clothing shops, electronics, and non-food businesses will be rejected.'}
              </p>
            </div>
          </div>

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

          {/* Unified Multi-Photo Uploader (Preview, Reorder, Remove, and Set Cover) */}
          <ShopMultiPhotoUploader
            photos={shopPhotos}
            onChangePhotos={setShopPhotos}
            shopName={nameKh}
            signatureDish={signatureDish}
            isKm={isKm}
            onToast={showToast}
            maxPhotos={20}
          />

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

          {/* Live AI Category Verification Status & Rejection Alert */}
          {(aiReport || liveAiPreview) && (() => {
            const activeReport = aiReport || liveAiPreview!;
            const isRejected = activeReport.decision === 'rejected';
            const isPending = activeReport.decision === 'pending_review';
            return (
              <div
                className={`p-3.5 rounded-2xl border-2 space-y-1.5 transition-all ${
                  isRejected
                    ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-200'
                    : isPending
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-200'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {isRejected ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    ) : isPending ? (
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    <span>
                      {isRejected
                        ? isKm
                          ? '🚫 មិនអនុញ្ញាត៖ អាជីវកម្មមិនមែនជាម្ហូបអាហារចម្អិនស្រាប់'
                          : '🚫 Not Eligible: Non-Food Business Detected'
                        : isPending
                          ? isKm
                            ? '⏳ ព័ត៌មានមិនទាន់ច្បាស់លាស់ (នឹងបញ្ជូនទៅ Admin ពិនិត្យ)'
                            : '⏳ Uncertain Category (Will Send to Admin Review)'
                          : isKm
                            ? `✅ មានសិទ្ធិអនុម័ត៖ ${activeReport.detectedCategoryLabelKh}`
                            : `✅ Eligible Food Business: ${activeReport.detectedCategoryLabelEn}`}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-[10px] font-mono font-bold">
                    AI {activeReport.confidenceScore}%
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {isKm ? activeReport.reasonKh : activeReport.reasonEn}
                </p>
              </div>
            );
          })()}

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
              disabled={isVerifyingAi}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 text-slate-950 font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
            >
              {isVerifyingAi ? (
                <>
                  <RefreshCw className="w-5 h-5 text-slate-950 animate-spin" />
                  <span>
                    {isKm
                      ? '🤖 កំពុងត្រួតពិនិត្យប្រភេទអាជីវកម្មដោយ AI...'
                      : '🤖 Verifying Food Business Category with AI...'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-slate-950" />
                  <span>{isKm ? '✨ បង្កើតហាងភ្លាមៗ (Create VIP Store) →' : '✨ Create VIP Restaurant Now →'}</span>
                </>
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

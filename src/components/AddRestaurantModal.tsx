import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Store,
  Image,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  Utensils,
  Edit2,
  Lock,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { RestaurantPriceLevel, VIP_PLANS, VipPlanType, isUserVipActive, getVipAccountState } from '../types';
import { ShopMultiPhotoUploader } from './ShopMultiPhotoUploader';
import {
  pickImageUsingNativeAndroidGallery,
  processAndCompressImageFile,
} from '../utils/androidMediaHelper';

export const AddRestaurantModal: React.FC = () => {
  const {
    isAddRestaurantModalOpen,
    setIsAddRestaurantModalOpen,
    addRestaurant,
    deleteRestaurant,
    addRegistrationTransaction,
    language,
    currentUser,
    setIsAuthModalOpen,
    showToast,
    restaurants,
    setManagingRestaurant,
    setIsManageMenuModalOpen,
    openUpgradeVipModal,
  } = useApp();

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

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTier, setSelectedTier] = useState<'free' | 'premium'>('free');
  const [selectedVipPlan, setSelectedVipPlan] = useState<VipPlanType>('quarterly');

  // Form Fields
  const [nameKh, setNameKh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [provinceKh, setProvinceKh] = useState('រាជធានីភ្នំពេញ');
  const [provinceEn, setProvinceEn] = useState('Phnom Penh');
  const [addressKh, setAddressKh] = useState('');
  const [phone, setPhone] = useState('');
  const [openingHoursKh, setOpeningHoursKh] = useState('០៧:០០ ព្រឹក - ០៩:០០ យប់');
  const [priceLevel, setPriceLevel] = useState<RestaurantPriceLevel>('$$');
  const [shopPhotos, setShopPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80'
  ]);
  const [descriptionKh, setDescriptionKh] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Step Fields ($2.99 for 30 Days or $4.99 for 90 Days)
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentMethod] = useState<'BankTransfer' | 'Bakong' | 'KHQR'>('BankTransfer');

  if (!isAddRestaurantModalOpen) return null;

  const isKm = language === 'km';
  const activePlan = VIP_PLANS[selectedVipPlan];

  // 1. Free Registration Handler ($0 Free Listing)
  const handleFreeRegistration = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!nameKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលឈ្មោះហាងជាភាសាខ្មែរ!' : 'Please enter restaurant name in Khmer!', 'warning');
      return;
    }
    if (!addressKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលអាសយដ្ឋានហាង!' : 'Please enter restaurant address!', 'warning');
      return;
    }
    if (!phone.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលលេខទូរស័ព្ទទាក់ទង!' : 'Please enter contact phone number!', 'warning');
      return;
    }

    setIsSubmitting(true);

    const finalProfile =
      (shopPhotos[0] || '').trim() ||
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80';
    const combinedGallery = Array.from(new Set([finalProfile, ...shopPhotos]));

    const created = addRestaurant({
      nameKh: nameKh.trim() || 'ហាងអាហារខ្មែរ',
      nameEn: nameEn.trim() || nameKh.trim() || 'Khmer Restaurant',
      provinceKh,
      provinceEn,
      addressKh: addressKh.trim() || 'កម្ពុជា',
      addressEn: addressKh.trim() || 'Cambodia',
      phone: phone.trim(),
      openingHoursKh,
      openingHoursEn: openingHoursKh,
      priceLevel,
      photoUrl: finalProfile,
      profileImage: finalProfile,
      foodImages: shopPhotos,
      galleryPhotos: combinedGallery,
      signatureDishesKh: ['ម្ហូបខ្មែរប្រពៃណី'],
      descriptionKh: descriptionKh.trim() || 'ហាងអាហារខ្មែររសជាតិដើម បរិយាកាសស្អាត និងផាសុកភាព។',
      descriptionEn: descriptionKh.trim() || 'Authentic traditional Khmer restaurant.',
      mapUrl: `https://maps.google.com/?q=${encodeURIComponent(nameKh || 'Cambodia Restaurant')}`,
      latitude: 11.5564,
      longitude: 104.9282,
      membershipTier: 'free',
      menuItems: [],
      status: 'approved',
      isVerified: true,
      isPromoted: false,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      ownerPhone: phone.trim(),
    });

    setIsSubmitting(false);
    if (!created) return;
    setIsAddRestaurantModalOpen(false);
    setStep(1);
    setSelectedTier('free');
    setShopPhotos([]);
  };

  // 2. Next to Step 2 for Premium ($2.99 for 30 Days or $4.99 for 90 Days)
  const handleNextToPayment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!nameKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលឈ្មោះហាងជាភាសាខ្មែរ!' : 'Please enter restaurant name in Khmer!', 'warning');
      return;
    }
    if (!addressKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលអាសយដ្ឋានហាង!' : 'Please enter restaurant address!', 'warning');
      return;
    }
    if (!phone.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលលេខទូរស័ព្ទទាក់ទង!' : 'Please enter contact phone number!', 'warning');
      return;
    }
    setStep(2);
  };

  // 3. Final Submit for Premium ($2.99 / 30 Days or $4.99 / 90 Days)
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionRef.trim()) {
      showToast(
        isKm
          ? 'សូមបញ្ចូលលេខកូដប្រតិបត្តិការធនាគារ (Transaction Ref / Trx ID) ពីវិក្កយបត្ររបស់អ្នក!'
          : 'Please enter your bank Transaction Reference / Trx ID!',
        'warning'
      );
      return;
    }

    setIsSubmitting(true);
    const generatedRestId = `rest-vip-${Date.now()}`;
    const expiresAt = new Date(
      Date.now() + activePlan.durationDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const finalProfile =
      (shopPhotos[0] || '').trim() ||
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80';
    const combinedGallery = Array.from(new Set([finalProfile, ...shopPhotos]));

    const created = addRestaurant({
      id: generatedRestId,
      nameKh: nameKh.trim() || 'ហាងអាហារខ្មែរ',
      nameEn: nameEn.trim() || nameKh.trim() || 'Khmer Restaurant',
      provinceKh,
      provinceEn,
      addressKh: addressKh.trim() || 'កម្ពុជា',
      addressEn: addressKh.trim() || 'Cambodia',
      phone: phone.trim(),
      openingHoursKh,
      openingHoursEn: openingHoursKh,
      priceLevel,
      photoUrl: finalProfile,
      profileImage: finalProfile,
      foodImages: shopPhotos,
      galleryPhotos: combinedGallery,
      signatureDishesKh: ['ម្ហូបខ្មែរប្រពៃណី'],
      descriptionKh: descriptionKh.trim() || 'ហាងអាហារខ្មែររសជាតិដើម បរិយាកាសស្អាត និងផាសុកភាព។',
      descriptionEn: descriptionKh.trim() || 'Authentic traditional Khmer restaurant with delicious dishes.',
      mapUrl: `https://maps.google.com/?q=${encodeURIComponent(nameKh || 'Cambodia Restaurant')}`,
      latitude: 11.5564,
      longitude: 104.9282,
      membershipTier: 'premium',
      membershipExpiresAt: expiresAt,
      menuItems: [],
      paymentStatus: 'pending_verification',
      promotionalPrice: activePlan.priceUsd,
      isPromoted: true,
      isVerified: true,
      status: 'approved',
      ownerId: currentUser?.id || 'owner-guest',
      ownerName: currentUser?.name || 'Restaurant Owner',
      ownerPhone: phone.trim(),
    });

    if (!created) {
      setIsSubmitting(false);
      return;
    }

    addRegistrationTransaction({
      restaurantId: generatedRestId,
      restaurantNameKh: nameKh.trim(),
      restaurantNameEn: nameEn.trim() || nameKh.trim(),
      ownerId: currentUser?.id || 'owner-guest',
      ownerName: currentUser?.name || 'Restaurant Owner',
      ownerPhone: phone.trim(),
      amountUsd: activePlan.priceUsd,
      durationDays: activePlan.durationDays,
      planType: activePlan.id,
      paymentMethod,
      transactionRef: transactionRef.trim(),
      notes: `One-time payment of $${activePlan.priceUsd.toFixed(2)} USD for ${activePlan.durationDays} days Premium VIP Membership (${activePlan.nameEn}).`,
    });

    setIsSubmitting(false);
    setIsAddRestaurantModalOpen(false);
    setStep(1);
    setTransactionRef('');
    setShopPhotos([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#047857] flex items-center justify-between bg-[#064E3B] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-200 rounded-xl border border-emerald-400/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-moul text-sm text-white leading-snug">
                {isKm ? 'ចុះបញ្ជីហាងអាហារ (បង្ហោះរូបហាង & រូបម្ហូប)' : 'Register Restaurant (Profile & Food Photos)'}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-200 font-khmer">
                <span className={`px-2 py-0.5 rounded-full ${step === 1 ? 'bg-[#10B981] text-white font-bold' : 'bg-white/20'}`}>
                  {isKm ? '១. ព័ត៌មានហាង & រូបភាព' : '1. Shop & Photos'}
                </span>
                {selectedTier === 'premium' && (
                  <>
                    <span>→</span>
                    <span className={`px-2 py-0.5 rounded-full ${step === 2 ? 'bg-[#10B981] text-white font-bold' : 'bg-white/20'}`}>
                      {isKm
                        ? `២. VIP $${activePlan.priceUsd.toFixed(2)} (${activePlan.durationDays} ថ្ងៃ)`
                        : `2. VIP $${activePlan.priceUsd.toFixed(2)} (${activePlan.durationDays} Days)`}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsAddRestaurantModalOpen(false)}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VIP Permission Guard or 1-Restaurant-Per-User Limit Guard or Step 1/2 Forms */}
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
                    ? 'លោកអ្នកត្រូវចូលគណនីដែលមានសមាជិកភាព VIP សកម្ម ដើម្បីចុះបញ្ជីហាងអាហារ។'
                    : 'Please sign in with your active VIP account to register a restaurant.'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddRestaurantModalOpen(false);
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
                    ? 'ការស្នើសុំសមាជិកភាព VIP របស់អ្នកត្រូវបានកត់ត្រា និងកំពុងស្ថិតក្នុងការពិនិត្យផ្ទៀងផ្ទាត់ដោយ Administrator។ មុខងារចុះបញ្ជីហាងនឹងបើកដំណើរការភ្លាមៗក្រោយពេលទទួលបានការអនុម័ត!'
                    : 'Your VIP request is awaiting Admin approval. Restaurant registration will unlock immediately upon approval!'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddRestaurantModalOpen(false)}
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
                    ? 'សមាជិកភាព VIP របស់លោកអ្នកបានផុតកំណត់ហើយ។ សូមបន្តកញ្ចប់ VIP ($2.99 / 30 ថ្ងៃ ឬ $4.99 / 90 ថ្ងៃ) ដើម្បីចុះបញ្ជីហាងរបស់អ្នក។'
                    : 'Your VIP membership has expired. Please renew your VIP membership to register your restaurant.'}
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddRestaurantModalOpen(false);
                      openUpgradeVipModal(true);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                  >
                    {isKm ? '✨ បន្តកញ្ចប់ VIP ឥឡូវនេះ' : '✨ Renew VIP Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddRestaurantModalOpen(false)}
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
                      setIsAddRestaurantModalOpen(false);
                      openUpgradeVipModal();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                  >
                    {isKm ? '👑 ដំឡើងទៅកញ្ចប់ VIP ឥឡូវនេះ' : '👑 Upgrade to VIP Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddRestaurantModalOpen(false)}
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
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                <Store className="w-5 h-5 shrink-0" />
                <span>
                  {isKm
                    ? 'គណនីនីមួយៗអាចបង្កើតបានត្រឹមតែ ១ ហាងប៉ុណ្ណោះ'
                    : 'Each User Can Add Only 1 Restaurant'}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                {isKm
                  ? `គណនីរបស់លោកអ្នកមានហាង "${existingOwnedRestaurant.nameKh}" រួចហើយ។ សូមកែប្រែហាងដែលមានស្រាប់ ឬលុបហាងចាស់ជាមុនសិន មុននឹងបន្ថែមហាងថ្មី។`
                  : `You already own "${existingOwnedRestaurant.nameEn || existingOwnedRestaurant.nameKh}". Please edit your existing restaurant or delete it before adding another.`}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <img
                src={existingOwnedRestaurant.photoUrl}
                alt={existingOwnedRestaurant.nameKh}
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-emerald-500"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {isKm ? existingOwnedRestaurant.nameKh : existingOwnedRestaurant.nameEn}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  📍 {existingOwnedRestaurant.addressKh}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsAddRestaurantModalOpen(false);
                  setManagingRestaurant(existingOwnedRestaurant);
                  setIsManageMenuModalOpen(true);
                }}
                className="w-full py-3 rounded-2xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
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
        ) : step === 1 && (
          <form
            onSubmit={selectedTier === 'free' ? handleFreeRegistration : handleNextToPayment}
            className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1 text-xs font-khmer"
          >
            {/* Membership Tier Cards */}
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 text-xs">
                {isKm ? 'ជ្រើសរើសប្រភេទសមាជិកភាព (Select Membership Plan):' : 'Select Membership Plan:'}
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* Free Listing Card ($0) */}
                <div
                  onClick={() => setSelectedTier('free')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    selectedTier === 'free'
                      ? 'border-[#059669] bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-[#059669]/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-[#0F172A] dark:text-slate-100 flex items-center gap-1">
                        <span>🎁</span>
                        <span>{isKm ? 'ឥតគិតថ្លៃ' : 'Free Listing'}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#059669] text-white">
                        $0
                      </span>
                    </div>
                    <ul className="text-[10px] text-slate-600 dark:text-slate-300 space-y-1">
                      <li>✓ {isKm ? 'បង្ហាញក្នុងបញ្ជីហាងផ្លូវការ' : 'Listed in directory'}</li>
                      <li>✓ {isKm ? 'រូបតំណាងហាង & រូបម្ហូប' : 'Shop profile & food photos'}</li>
                      <li>✓ {isKm ? 'អាសយដ្ឋាន និងលេខទូរស័ព្ទ' : 'Address & contact info'}</li>
                    </ul>
                  </div>
                  {selectedTier === 'free' && (
                    <div className="mt-2 text-[10px] font-bold text-[#064E3B] dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isKm ? 'បានជ្រើសរើស' : 'Selected'}</span>
                    </div>
                  )}
                </div>

                {/* Premium VIP Membership Card ($2.99 / 30d or $4.99 / 90d) */}
                <div
                  onClick={() => setSelectedTier('premium')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    selectedTier === 'premium'
                      ? 'border-[#064E3B] bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-[#064E3B]/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-[#064E3B] dark:text-emerald-400 flex items-center gap-1">
                        <span>⭐</span>
                        <span>{isKm ? 'Premium VIP' : 'Premium VIP'}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#064E3B] text-white font-mono">
                        ${activePlan.priceUsd.toFixed(2)}
                      </span>
                    </div>
                    <ul className="text-[10px] text-slate-600 dark:text-slate-300 space-y-1">
                      <li className="text-[#064E3B] dark:text-emerald-400 font-bold">
                        ✓ {isKm ? 'មុខម្ហូប ៥ មុខ ជាមួយរូបភាព និងតម្លៃ' : 'Up to 5 food items with photos & prices'}
                      </li>
                      <li>✓ {isKm ? 'រូបតំណាងហាង & រូបភាពម្ហូបច្រើនសន្លឹក' : 'Shop profile & multiple food photos'}</li>
                      <li>✓ {isKm ? 'កែប្រែព័ត៌មានហាងដោយខ្លួនឯង' : 'Self-service editing'}</li>
                      <li className="text-[#059669] font-medium pt-0.5">
                        ✓ {isKm ? 'VIP 30 ថ្ងៃ ($2.99) ឬ 90 ថ្ងៃ ($4.99)' : 'VIP 30 Days ($2.99) or 90 Days ($4.99)'}
                      </li>
                    </ul>
                  </div>
                  {selectedTier === 'premium' && (
                    <div className="mt-2 text-[10px] font-bold text-[#064E3B] dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {isKm
                          ? `បានជ្រើសរើស ($${activePlan.priceUsd.toFixed(2)} / ${activePlan.durationDays} ថ្ងៃ)`
                          : `Selected ($${activePlan.priceUsd.toFixed(2)} / ${activePlan.durationDays}d)`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedTier === 'premium' && (
                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  {(['quarterly', 'annual'] as VipPlanType[]).map((planKey) => {
                    const p = VIP_PLANS[planKey];
                    const active = selectedVipPlan === planKey;
                    return (
                      <button
                        key={planKey}
                        type="button"
                        onClick={() => setSelectedVipPlan(planKey)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          active
                            ? 'border-[#064E3B] bg-emerald-50 dark:bg-emerald-950/40 text-[#064E3B] dark:text-emerald-300 font-bold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{isKm ? p.nameKh : p.nameEn}</span>
                          <span className="font-mono font-black">${p.priceUsd.toFixed(2)}</span>
                        </div>
                        <div className="text-[10px] opacity-80">
                          {isKm ? `សុពលភាព ${p.durationDays} ថ្ងៃ` : `${p.durationDays} days duration`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Shop Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isKm ? 'ឈ្មោះហាងជាភាសាខ្មែរ *' : 'Restaurant Name (Khmer) *'}
                </label>
                <input
                  type="text"
                  required
                  value={nameKh}
                  onChange={(e) => setNameKh(e.target.value)}
                  placeholder="ឧ. ភោជនីយដ្ឋាន ម្លិះអង្គរ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isKm ? 'ឈ្មោះហាងជាអក្សរឡាតាំង' : 'Restaurant Name (English)'}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Malis Angkor Restaurant"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-sans focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
                />
              </div>
            </div>

            {/* Province & Price Tier */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isKm ? 'ខេត្ត / រាជធានី' : 'Province / City'}
                </label>
                <select
                  value={provinceKh}
                  onChange={(e) => {
                    setProvinceKh(e.target.value);
                    setProvinceEn(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
                >
                  <option value="រាជធានីភ្នំពេញ">រាជធានីភ្នំពេញ (Phnom Penh)</option>
                  <option value="ខេត្តសៀមរាប">ខេត្តសៀមរាប (Siem Reap)</option>
                  <option value="ខេត្តបាត់ដំបង">ខេត្តបាត់ដំបង (Battambang)</option>
                  <option value="ខេត្តកំពត">ខេត្តកំពត (Kampot)</option>
                  <option value="ខេត្តកែប">ខេត្តកែប (Kep)</option>
                  <option value="ខេត្តព្រះសីហនុ">ខេត្តព្រះសីហនុ (Preah Sihanouk)</option>
                  <option value="ខេត្តកោះកុង">ខេត្តកោះកុង (Koh Kong)</option>
                  <option value="ខេត្តមណ្ឌលគិរី">ខេត្តមណ្ឌលគិរី (Mondulkiri)</option>
                  <option value="ខេត្តរតនគិរី">ខេត្តរតនគិរី (Ratanakiri)</option>
                  <option value="ខេត្តកណ្តាល">ខេត្តកណ្តាល (Kandal)</option>
                  <option value="ខេត្តកំពង់ចាម">ខេត្តកំពង់ចាម (Kampong Cham)</option>
                  <option value="ខេត្តកំពង់ឆ្នាំង">ខេត្តកំពង់ឆ្នាំង (Kampong Chhnang)</option>
                  <option value="ខេត្តកំពង់ស្ពឺ">ខេត្តកំពង់ស្ពឺ (Kampong Speu)</option>
                  <option value="ខេត្តកំពង់ធំ">ខេត្តកំពង់ធំ (Kampong Thom)</option>
                  <option value="ខេត្តក្រចេះ">ខេត្តក្រចេះ (Kratie)</option>
                  <option value="ខេត្តតាកែវ">ខេត្តតាកែវ (Takeo)</option>
                  <option value="ខេត្តព្រៃវែង">ខេត្តព្រៃវែង (Prey Veng)</option>
                  <option value="ខេត្តស្វាយរៀង">ខេត្តស្វាយរៀង (Svay Rieng)</option>
                  <option value="ខេត្តពោធិ៍សាត់">ខេត្តពោធិ៍សាត់ (Pursat)</option>
                  <option value="ខេត្តបន្ទាយមានជ័យ">ខេត្តបន្ទាយមានជ័យ (Banteay Meanchey)</option>
                  <option value="ខេត្តប៉ៃលិន">ខេត្តប៉ៃលិន (Pailin)</option>
                  <option value="ខេត្តឧត្តរមានជ័យ">ខេត្តឧត្តរមានជ័យ (Oddar Meanchey)</option>
                  <option value="ខេត្តព្រះវិហារ">ខេត្តព្រះវិហារ (Preah Vihear)</option>
                  <option value="ខេត្តស្ទឹងត្រែង">ខេត្តស្ទឹងត្រែង (Stung Treng)</option>
                  <option value="ខេត្តត្បូងឃ្មុំ">ខេត្តត្បូងឃ្មុំ (Tboung Khmum)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isKm ? 'កម្រិតតម្លៃ' : 'Price Tier'}
                </label>
                <select
                  value={priceLevel}
                  onChange={(e) => setPriceLevel(e.target.value as RestaurantPriceLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
                >
                  <option value="$">$ (ទូទៅ / $1 - $3)</option>
                  <option value="$$">$$ (មធ្យម / $3 - $8)</option>
                  <option value="$$$">$$$ (លំដាប់ខ្ពស់ / $8 - $20)</option>
                  <option value="$$$$">$$$$ (ប្រណិត / $20+)</option>
                </select>
              </div>
            </div>

            {/* Address & Contact Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-[#059669]" />
                  {isKm ? 'អាសយដ្ឋានជាក់ស្ដែង *' : 'Physical Address *'}
                </label>
                <input
                  type="text"
                  required
                  value={addressKh}
                  onChange={(e) => setAddressKh(e.target.value)}
                  placeholder="ផ្ទះលេខ, ផ្លូវ, សង្កាត់, ក្រុង/ខណ្ឌ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <Phone className="w-3.5 h-3.5 inline mr-1 text-[#059669]" />
                  {isKm ? 'លេខទូរស័ព្ទទាក់ទង *' : 'Contact Phone *'}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="012 xxx xxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
                />
              </div>
            </div>

            {/* Opening Hours */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-[#059669]" />
                {isKm ? 'ម៉ោងបើកដំណើរការ' : 'Opening Hours'}
              </label>
              <input
                type="text"
                value={openingHoursKh}
                onChange={(e) => setOpeningHoursKh(e.target.value)}
                placeholder="០៧:០០ ព្រឹក - ០៩:០០ យប់"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isKm ? 'ការពិពណ៌នាអំពីហាង' : 'Restaurant Description'}
              </label>
              <textarea
                rows={2}
                value={descriptionKh}
                onChange={(e) => setDescriptionKh(e.target.value)}
                placeholder="រៀបរាប់ពីរសជាតិអាហារ បរិយាកាស និងសេវាកម្ម..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs resize-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
              />
            </div>

            {/* Unified Multi-Photo Uploader (Preview, Reorder, Remove, and Set Cover) */}
            <ShopMultiPhotoUploader
              photos={shopPhotos}
              onChangePhotos={setShopPhotos}
              shopName={nameKh}
              isKm={isKm}
              onToast={showToast}
              maxPhotos={20}
            />

            {/* Submit Actions */}
            <div className="pt-2">
              {selectedTier === 'free' ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>🚀</span>
                  <span>{isKm ? 'ចុះបញ្ជីហាងឥតគិតថ្លៃ ($0 Free Listing)' : 'Register Free Restaurant Listing ($0)'}</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>
                    {isKm
                      ? `បន្តទៅបង់ប្រាក់សមាជិកភាព VIP ($${activePlan.priceUsd.toFixed(2)} សម្រាប់ ${activePlan.durationDays} ថ្ងៃ)`
                      : `Continue to VIP ($${activePlan.priceUsd.toFixed(2)} for ${activePlan.durationDays} Days)`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        )}

        {/* Step 2: Payment Workflow ($2.99 for 30 Days or $4.99 for 90 Days) */}
        {!existingOwnedRestaurant && step === 2 && (
          <form onSubmit={handleFinalSubmit} className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1 text-xs font-khmer">
            {/* Plan Price Header Box */}
            <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-slate-800 dark:to-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center relative overflow-hidden">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#064E3B] text-white text-[10px] font-bold rounded-full mb-2 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>
                  ⭐ {isKm ? `សមាជិកភាព ${activePlan.nameKh}` : `${activePlan.nameEn} Membership`}
                </span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-black text-[#064E3B] dark:text-emerald-400 font-mono">
                  ${activePlan.priceUsd.toFixed(2)} USD
                </span>
                <span className="text-xs text-slate-500">
                  ({activePlan.durationDays} {isKm ? 'ថ្ងៃ' : 'Days'})
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                {isKm
                  ? `ការទូទាត់តែមួយលើក $${activePlan.priceUsd.toFixed(2)} សម្រាប់រយៈពេល ${activePlan.durationDays} ថ្ងៃពេញ។`
                  : `One-time payment of $${activePlan.priceUsd.toFixed(2)} for ${activePlan.durationDays} days.`}
              </p>
            </div>

            {/* Bank Transfer Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="text-xs font-bold text-[#0F172A] dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#059669]" />
                <span>{isKm ? 'ព័ត៌មានគណនីផ្ទេរប្រាក់ (ABA Bank Transfer)' : 'Bank Transfer Information'}</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isKm ? 'ធនាគារ៖' : 'Bank:'}</span>
                  <span className="font-bold text-[#0F172A] dark:text-slate-100 font-mono">ABA BANK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isKm ? 'ម្ចាស់គណនី៖' : 'Beneficiary:'}</span>
                  <span className="font-bold text-[#0F172A] dark:text-slate-100 font-mono">CHEA KIMSENG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isKm ? 'លេខគណនី៖' : 'Account Number:'}</span>
                  <span className="font-bold text-[#064E3B] dark:text-emerald-400 font-mono text-xs">095 245 959 (USD)</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">{isKm ? 'ចំនួនទឹកប្រាក់៖' : 'Total Amount:'}</span>
                  <span className="font-bold text-[#064E3B] dark:text-emerald-400 font-mono text-xs">
                    ${activePlan.priceUsd.toFixed(2)} USD ({activePlan.durationDays} Days)
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Reference Input */}
            <div className="space-y-1.5">
              <label className="block font-bold text-[#0F172A] dark:text-slate-200 text-xs">
                {isKm ? 'លេខកូដប្រតិបត្តិការធនាគារ (Transaction Ref / Trx ID) *' : 'Bank Transaction Reference / Trx ID *'}
              </label>
              <input
                type="text"
                required
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="ឧ. TRX-123456789 ឬលេខ Ref លើវិក្កយបត្រ ABA"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 font-mono font-bold text-xs focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20"
              />
              <p className="text-[10px] text-slate-500">
                {isKm
                  ? `បញ្ចូលលេខកូដប្រតិបត្តិការពីបង្កាន់ដៃធនាគារ ABA របស់អ្នក ដើម្បីឱ្យរដ្ឋបាលផ្ទៀងផ្ទាត់ និងបើកដំណើរការ ${activePlan.durationDays} ថ្ងៃជូន។`
                  : `Enter the Transaction ID shown on your ABA bank receipt for administrative verification (${activePlan.durationDays} days).`}
              </p>
            </div>

            {/* Verification Notice */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
              <div className="text-[10px] text-[#0F172A] dark:text-slate-200 leading-relaxed">
                <span className="font-bold block text-[#064E3B] dark:text-emerald-400 mb-0.5">
                  {isKm ? 'ការការពារសុវត្ថិភាព និងការផ្ទៀងផ្ទាត់' : 'Security & Verification'}
                </span>
                {isKm
                  ? `រដ្ឋបាលនឹងផ្ទៀងផ្ទាត់លេខកូដប្រតិបត្តិការធនាគារជាមួយរបាយការណ៍គណនី ABA Bank ដើម្បីបើកដំណើរការសមាជិកភាព VIP ${activePlan.durationDays} ថ្ងៃពេញ។`
                  : `The administrator will verify the bank transaction reference to activate your ${activePlan.durationDays}-day VIP membership.`}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isKm ? 'ត្រឡប់ក្រោយ' : 'Back'}</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="py-3 px-4 rounded-2xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center justify-center gap-1.5 transition active:scale-[0.98] disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isKm ? 'ដាក់ស្នើ និងបង់ប្រាក់' : `Submit & Pay $${activePlan.priceUsd.toFixed(2)}`}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

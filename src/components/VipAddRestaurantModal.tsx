import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Store,
  CheckCircle2,
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  Edit2,
  Lock,
  PlusCircle,
  QrCode,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Image as ImageIcon,
  Crown,
  CreditCard,
  Clock,
} from 'lucide-react';
import { RestaurantPriceLevel, GoogleMapsPlaceMetadata, isUserVipActive, getDynamicVipPlans, isAdminAccount } from '../types';
import {
  pickImageUsingNativeAndroidGallery,
  pickMultipleImagesUsingNativeAndroidGallery,
  processAndCompressImageFile,
  batchProcessAndCompressImageFiles,
} from '../utils/androidMediaHelper';
import { analyzeFoodBusinessDeterministically } from '../services/aiFoodBusinessVerifierService';
import { tr } from '../utils/i18n';
import { ShopLocationCheckInPickerModal, ShopCheckInLocationResult } from './ShopLocationCheckInPickerModal';
import { GoogleMapsShopImporterModal, ImportedGoogleShopData } from './GoogleMapsShopImporterModal';
import { resolveProvinceGeoConfig } from '../services/googlePlacesService';

const SAMPLE_SHOP_PHOTOS = [
  '/foods/food-1.jpg',
  '/foods/food-2.jpg',
  '/foods/food-3.jpg',
  '/foods/food-4.jpg',
];

const PROVINCES = [
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

export const VipAddRestaurantModal: React.FC = () => {
  const {
    isVipAddRestaurantModalOpen,
    setIsVipAddRestaurantModalOpen,
    addRestaurant,
    replaceExistingRestaurant,
    submitAdditionalStorePaymentRequest,
    getCurrentUserStoreQuota,
    deleteRestaurant,
    currentUser,
    language,
    showToast,
    setIsManageMenuModalOpen,
    setManagingRestaurant,
    getOwnedRestaurantsForUser,
    setIsAuthModalOpen,
    appSettings,
    restaurants,
    openUpgradeVipModal,
  } = useApp();

  const isKm = language === 'km';
  const isAdmin = isAdminAccount(currentUser);

  // Simple 2-Tab Navigation: 'create_form' (Default!) or 'my_stores' or 'pay_additional_slot'
  const [activeTab, setActiveTab] = useState<'create_form' | 'my_stores' | 'pay_additional_slot'>('create_form');
  const [replacingStoreId, setReplacingStoreId] = useState<string | null>(null);
  const [confirmDeleteStoreId, setConfirmDeleteStoreId] = useState<string | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const isApprovedVip = isUserVipActive(currentUser);
  const dynamicPlans = getDynamicVipPlans(appSettings);
  const quota = getCurrentUserStoreQuota(currentUser);
  const ownedRestaurants = getOwnedRestaurantsForUser(currentUser);
  const requiresAdditionalPayment = !isAdmin && !replacingStoreId && quota.remainingAvailableSlots <= 0;

  // Essential Form Fields
  const [nameKh, setNameKh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [provinceKh, setProvinceKh] = useState('រាជធានីភ្នំពេញ');
  const [provinceEn, setProvinceEn] = useState('Phnom Penh');
  const [addressKh, setAddressKh] = useState('');
  const [shopLat, setShopLat] = useState<number | null>(null);
  const [shopLng, setShopLng] = useState<number | null>(null);
  const [shopMapUrl, setShopMapUrl] = useState<string>('');
  const [isCheckInPickerOpen, setIsCheckInPickerOpen] = useState(false);
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [openingHoursKh, setOpeningHoursKh] = useState('០៧:០០ ព្រឹក - ០៩:០០ យប់');
  const [priceLevel, setPriceLevel] = useState<RestaurantPriceLevel>('$');
  const [shopPhotos, setShopPhotos] = useState<string[]>(['/foods/food-1.jpg']);
  const [descriptionKh, setDescriptionKh] = useState('');
  const [isGoogleImportModalOpen, setIsGoogleImportModalOpen] = useState(false);
  const [importedGooglePlaceId, setImportedGooglePlaceId] = useState<string | undefined>(undefined);
  const [importedGoogleMeta, setImportedGoogleMeta] = useState<GoogleMapsPlaceMetadata | undefined>(undefined);
  const [businessCategory, setBusinessCategory] = useState<string>('');
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [signatureDishesKh, setSignatureDishesKh] = useState<string[]>(['ម្ហូបពិសេសប្រចាំហាង']);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Additional Store Payment Checkout State ($10 per extra store when free quota is used)
  const [slotTrxRef, setSlotTrxRef] = useState('');
  const [slotProofData, setSlotProofData] = useState<{
    dataUrl: string;
    fileName?: string;
    mimeType?: string;
  } | null>(null);
  const [isSubmittingSlotPayment, setIsSubmittingSlotPayment] = useState(false);
  const slotFileInputRef = useRef<HTMLInputElement | null>(null);

  const targetReplacingStore = useMemo(
    () => (replacingStoreId ? ownedRestaurants.find((r) => r.id === replacingStoreId) || null : null),
    [replacingStoreId, ownedRestaurants]
  );

  const resetFormFields = () => {
    setNameKh('');
    setNameEn('');
    setAddressKh('');
    setShopLat(null);
    setShopLng(null);
    setShopMapUrl('');
    setDescriptionKh('');
    setShopPhotos(['/foods/food-1.jpg']);
    setReplacingStoreId(null);
    setShowMoreOptions(false);
    setImportedGooglePlaceId(undefined);
    setImportedGoogleMeta(undefined);
    setBusinessCategory('');
    setWebsiteUrl('');
    setSignatureDishesKh(['ម្ហូបពិសេសប្រចាំហាង']);
  };

  const beginReplaceStore = (store: (typeof ownedRestaurants)[0]) => {
    setReplacingStoreId(store.id);
    setNameKh(store.nameKh || '');
    setNameEn(store.nameEn || '');
    setProvinceKh(store.provinceKh || 'រាជធានីភ្នំពេញ');
    setProvinceEn(store.provinceEn || 'Phnom Penh');
    setAddressKh(store.addressKh || '');
    setShopLat(typeof store.latitude === 'number' ? store.latitude : null);
    setShopLng(typeof store.longitude === 'number' ? store.longitude : null);
    setShopMapUrl(store.mapUrl || '');
    setPhone(store.phone || currentUser?.phone || '');
    setOpeningHoursKh(store.openingHoursKh || '០៧:០០ ព្រឹក - ០៩:០០ យប់');
    setShopPhotos(
      Array.isArray(store.galleryPhotos) && store.galleryPhotos.length > 0
        ? store.galleryPhotos
        : [store.photoUrl || '/foods/food-1.jpg']
    );
    setDescriptionKh(store.descriptionKh || '');
    setImportedGooglePlaceId(store.googlePlaceId);
    setImportedGoogleMeta(store.googleMapsMeta);
    setBusinessCategory(store.businessCategory || '');
    setWebsiteUrl(store.websiteUrl || store.googleMapsMeta?.websiteUri || '');
    setSignatureDishesKh(Array.isArray(store.signatureDishesKh) && store.signatureDishesKh.length > 0 ? store.signatureDishesKh : ['ម្ហូបពិសេសប្រចាំហាង']);
    setActiveTab('create_form');
  };

  // When modal opens, always start cleanly on the Create Form (or Replace Mode if requested)
  useEffect(() => {
    if (!isVipAddRestaurantModalOpen) return;
    setPhone((prev) => prev || currentUser?.phone || '');
    const initialReq = (window as any).__kft_vip_store_initial_mode;
    if (initialReq) {
      delete (window as any).__kft_vip_store_initial_mode;
      if (initialReq.mode === 'replace' && initialReq.storeId) {
        const found = ownedRestaurants.find((s) => s.id === initialReq.storeId) || ownedRestaurants[0];
        if (found) {
          beginReplaceStore(found);
          return;
        }
      } else if (initialReq.mode === 'my_stores') {
        setActiveTab('my_stores');
        return;
      }
    }
    setReplacingStoreId(null);
    setActiveTab('create_form');
  }, [isVipAddRestaurantModalOpen]);

  if (!isVipAddRestaurantModalOpen) return null;

  // Pick Shop Photo from Gallery
  const handlePickFromGallery = async () => {
    setIsUploadingPhoto(true);
    try {
      const nativePick = await pickMultipleImagesUsingNativeAndroidGallery(5, 1200);
      if (nativePick.cancelled) {
        setIsUploadingPhoto(false);
        return;
      }
      if (nativePick.success && Array.isArray(nativePick.dataUrls) && nativePick.dataUrls.length > 0) {
        const cleanExisting = shopPhotos.filter((p) => !SAMPLE_SHOP_PHOTOS.includes(p));
        const nextPhotos = [...nativePick.dataUrls, ...cleanExisting].slice(0, 20);
        setShopPhotos(nextPhotos);
        showToast(
          tr(language, '✅ បានជ្រើសរូបភាពហាងជោគជ័យ!', '✅ Shop photo selected!', '✅ 店铺图片已选择！'),
          'success'
        );
        setIsUploadingPhoto(false);
        return;
      }
    } catch {}
    setIsUploadingPhoto(false);
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setIsUploadingPhoto(true);
    try {
      const dataUrls = await batchProcessAndCompressImageFiles(files, 5, 1200, 0.84);
      if (dataUrls.length > 0) {
        const cleanExisting = shopPhotos.filter((p) => !SAMPLE_SHOP_PHOTOS.includes(p));
        setShopPhotos([...dataUrls, ...cleanExisting].slice(0, 20));
        showToast(
          tr(language, '✅ បានជ្រើសរូបភាពហាងជោគជ័យ!', '✅ Shop photo selected!', '✅ 店铺图片已选择！'),
          'success'
        );
      }
    } catch {
      showToast(tr(language, '⚠️ មិនអាចអានរូបភាពបានទេ', '⚠️ Could not read image', '⚠️ 无法读取图片'), 'warning');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCameraFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const dataUrl = await processAndCompressImageFile(file, 1200, 0.85);
      if (dataUrl) {
        const cleanExisting = shopPhotos.filter((p) => !SAMPLE_SHOP_PHOTOS.includes(p));
        setShopPhotos([dataUrl, ...cleanExisting].slice(0, 20));
        showToast(
          tr(language, '✅ បានថតរូបហាងជោគជ័យ!', '✅ Shop photo captured!', '✅ 拍照成功！'),
          'success'
        );
      }
    } catch {
      showToast(tr(language, '⚠️ មិនអាចអានរូបភាពបានទេ', '⚠️ Could not read photo', '⚠️ 无法读取照片'), 'warning');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const trimmedNameKh = nameKh.trim();
    const trimmedNameEn = nameEn.trim();
    if (!trimmedNameKh && !trimmedNameEn) {
      showToast(
        tr(language, '⚠️ សូមបញ្ចូលឈ្មោះហាងរបស់អ្នក!', '⚠️ Please enter your shop name!', '⚠️ 请输入您的店铺名称！'),
        'warning'
      );
      return;
    }

    // Prevent duplicate shop entries by checking existing records using Google Place ID
    if (importedGooglePlaceId) {
      const existingDup = restaurants.find(
        (r) =>
          r.id !== replacingStoreId &&
          (r.googlePlaceId === importedGooglePlaceId ||
            r.googleMapsMeta?.placeId === importedGooglePlaceId ||
            r.id === `gplace-${importedGooglePlaceId}`)
      );
      if (existingDup) {
        showToast(
          tr(
            language,
            `⚠️ ហាង «${existingDup.nameKh || existingDup.nameEn}» មានក្នុងប្រព័ន្ធរួចហើយ (Google Place ID ដូចគ្នា)! សូមជ្រើសរើសហាងផ្សេង។`,
            `⚠️ "${existingDup.nameEn || existingDup.nameKh}" is already registered with this Google Place ID!`,
            `⚠️ 店铺“${existingDup.nameEn || existingDup.nameKh}”已在系统中注册（相同的 Google Place ID）！`
          ),
          'warning'
        );
        return;
      }
    }

    // If non-Admin user has already used their free store quota and is NOT replacing an existing store,
    // prompt them to either replace their existing store for $0 or unlock an extra store slot.
    if (!isAdmin && !replacingStoreId && quota.remainingAvailableSlots <= 0) {
      setActiveTab('pay_additional_slot');
      return;
    }

    const finalNameKh = trimmedNameKh || trimmedNameEn;
    const finalNameEn = trimmedNameEn || trimmedNameKh;
    const finalProfile = (shopPhotos[0] || '').trim() || '/foods/food-1.jpg';
    const combinedGallery = Array.from(new Set([finalProfile, ...shopPhotos])).filter(Boolean);

    // Fast synchronous check only to block obvious non-food spam (clothing, electronics, etc.)
    const quickCheck = analyzeFoodBusinessDeterministically({
      nameKh: finalNameKh,
      nameEn: finalNameEn,
      descriptionKh: descriptionKh.trim(),
      addressKh: addressKh.trim() || provinceKh,
      provinceKh,
      photoUrl: finalProfile,
      foodImages: combinedGallery,
    });

    if (quickCheck.decision === 'rejected') {
      showToast(isKm ? quickCheck.reasonKh : quickCheck.reasonEn, 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const newRestData = {
        nameKh: finalNameKh,
        nameEn: finalNameEn,
        descriptionKh:
          descriptionKh.trim() || 'ភោជនីយដ្ឋានម្ហូបខ្មែររសជាតិដើម ផាសុកភាព និងអនាម័យខ្ពស់។',
        descriptionEn: `${finalNameEn} authentic restaurant.`,
        photoUrl: finalProfile,
        profileImage: finalProfile,
        foodImages: [],
        galleryPhotos: combinedGallery,
        addressKh: addressKh.trim() || provinceKh,
        addressEn: addressKh.trim() || `${provinceEn}, Cambodia`,
        provinceKh,
        provinceEn,
        phone: phone.trim() || currentUser?.phone || '012 345 678',
        openingHoursKh: openingHoursKh.trim() || '០៧:០០ ព្រឹក - ០៩:០០ យប់',
        openingHoursEn: '07:00 AM - 09:00 PM',
        priceLevel,
        mapUrl:
          shopMapUrl.trim() ||
          (shopLat !== null && shopLng !== null
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${finalNameKh} ${shopLat},${shopLng}`)}`
            : `https://maps.google.com/?q=${encodeURIComponent(finalNameKh)}`),
        latitude: shopLat !== null ? shopLat : (resolveProvinceGeoConfig(provinceKh)?.lat ?? 11.5564),
        longitude: shopLng !== null ? shopLng : (resolveProvinceGeoConfig(provinceKh)?.lng ?? 104.9282),
        signatureDishesKh: signatureDishesKh.length > 0 ? signatureDishesKh : ['ម្ហូបពិសេសប្រចាំហាង'],
        googlePlaceId: importedGooglePlaceId,
        dataSource: importedGooglePlaceId ? ('google_maps' as const) : ('vip_owner' as const),
        googleMapsMeta: importedGoogleMeta
          ? {
              ...importedGoogleMeta,
              websiteUri: websiteUrl.trim() || importedGoogleMeta.websiteUri,
            }
          : undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        businessCategory: businessCategory.trim() || undefined,
        isFeatured: true,
        isVerified: true,
        membershipTier: 'premium' as const,
        status: 'approved' as const,
        aiCategoryVerification: quickCheck,
        ownerId: currentUser?.id,
        ownerName: currentUser?.name,
        ownerPhone: phone.trim() || currentUser?.phone || '',
      };

      const created = replacingStoreId
        ? replaceExistingRestaurant(replacingStoreId, newRestData)
        : addRestaurant(newRestData);

      if (!created) {
        setIsSaving(false);
        return;
      }

      resetFormFields();
      setIsVipAddRestaurantModalOpen(false);
      // Immediately open the shop management modal so the user can add dishes right away
      (window as any).__kft_manage_initial_tab = 'menu';
      setManagingRestaurant(created);
      setIsManageMenuModalOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickSlotReceiptFromGallery = async () => {
    const picked = await pickImageUsingNativeAndroidGallery(1200, 0.84);
    if (picked && picked.dataUrl) {
      setSlotProofData({
        dataUrl: picked.dataUrl,
        fileName: picked.fileName || 'aba_store_slot_receipt.jpg',
        mimeType: picked.mimeType || 'image/jpeg',
      });
      showToast(
        isKm ? '📸 បានភ្ជាប់រូបភាពវិក្កយបត្រជោគជ័យ!' : '📸 Attached payment receipt!',
        'success'
      );
      return;
    }
    slotFileInputRef.current?.click();
  };

  const handleSlotFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await processAndCompressImageFile(file, 1200, 0.84);
      setSlotProofData({
        dataUrl,
        fileName: file.name || 'aba_store_slot_receipt.jpg',
        mimeType: file.type || 'image/jpeg',
      });
      showToast(
        isKm ? '📸 បានភ្ជាប់រូបភាពវិក្កយបត្រជោគជ័យ!' : '📸 Attached payment receipt!',
        'success'
      );
    } catch {
      showToast(isKm ? 'មិនអាចអានឯកសាររូបភាពបានទេ' : 'Failed to read image', 'warning');
    }
  };

  const handleSubmitAdditionalStorePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotProofData?.dataUrl && (!slotTrxRef || slotTrxRef.trim().length < 4)) {
      showToast(
        isKm
          ? 'សូមអាប់ឡូតរូបភាពវិក្កយបត្រ ABA ឬបញ្ចូលលេខប្រតិបត្តិការ (Trx ID)!'
          : 'Please upload your ABA receipt screenshot or enter a Transaction ID!',
        'warning'
      );
      return;
    }

    setIsSubmittingSlotPayment(true);
    try {
      const res = await submitAdditionalStorePaymentRequest(
        slotTrxRef.trim(),
        `Additional Store Slot #${quota.totalAllowedStores + 1} ($${quota.additionalStoreFeeUsd.toFixed(2)} USD)`,
        slotProofData || undefined,
        quota.additionalStoreFeeUsd
      );
      if (res.success) {
        setSlotTrxRef('');
        setSlotProofData(null);
        setReplacingStoreId(null);
        setActiveTab(res.autoVerified ? 'create_form' : 'my_stores');
      }
    } finally {
      setIsSubmittingSlotPayment(false);
    }
  };

  const coverPhoto = shopPhotos[0] || '/foods/food-1.jpg';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={() => {
        resetFormFields();
        setIsVipAddRestaurantModalOpen(false);
      }}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-emerald-500/30 my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraFileChange}
          className="hidden"
        />

        {/* Compact, Clear Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#064E3B] to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-400 text-slate-950 shadow-xs shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-moul text-sm text-white truncate">
                {targetReplacingStore
                  ? tr(language, '🔄 ប្តូរដាក់ហាងថ្មី ($0)', '🔄 Replace with New Shop ($0)', '🔄 更换为新店铺 ($0)')
                  : requiresAdditionalPayment
                  ? tr(
                      language,
                      `🏪 បន្ថែមហាងទី ${quota.nextStoreSlotNumber} (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`,
                      `🏪 Add Shop #${quota.nextStoreSlotNumber} (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`,
                      `🏪 添加第 ${quota.nextStoreSlotNumber} 家店铺 (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`
                    )
                  : tr(language, '🏪 បង្កើត និងបន្ថែមហាងថ្មី', '🏪 Create & Add New Shop', '🏪 创建与添加新店铺')}
              </h3>
              <p className="text-[11px] text-emerald-100 font-khmer truncate">
                {targetReplacingStore
                  ? tr(
                      language,
                      `កំពុងប្តូរជំនួសហាង «${targetReplacingStore.nameKh}»`,
                      `Replacing "${targetReplacingStore.nameEn || targetReplacingStore.nameKh}"`,
                      `正在替换“${targetReplacingStore.nameEn || targetReplacingStore.nameKh}”`
                    )
                  : requiresAdditionalPayment
                  ? tr(
                      language,
                      `ហាងទី ១ ឥតគិតថ្លៃ • ហាងបន្ថែមតម្រូវឱ្យបង់ប្រាក់ +${quota.additionalStoreFeeUsd.toFixed(2)} USD / ១ ហាង`,
                      `1st shop included with VIP • Each extra shop requires +${quota.additionalStoreFeeUsd.toFixed(2)} USD`,
                      `首店包含在 VIP 中 • 每增加一家店铺需支付 +${quota.additionalStoreFeeUsd.toFixed(2)} USD`
                    )
                  : tr(
                      language,
                      'បំពេញតែព័ត៌មានសំខាន់ៗ រួចចុចបង្កើតភ្លាម!',
                      'Fill in basic info and tap Create immediately!',
                      '仅需填写基本信息，即可立即创建店铺！'
                    )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetFormFields();
              setIsVipAddRestaurantModalOpen(false);
            }}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Simple 2-Tab Bar if User Already Has Stores */}
        {currentUser && ownedRestaurants.length > 0 && (
          <div className="px-4 pt-2.5 pb-1 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex gap-2 font-khmer text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setReplacingStoreId(null);
                setActiveTab('create_form');
              }}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'create_form'
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>
                {targetReplacingStore
                  ? tr(language, 'កែប្តូរហាងថ្មី ($0)', 'Replace Shop ($0)', '更换新店 ($0)')
                  : quota.canAddWithoutNewPayment
                  ? tr(language, 'បង្កើតហាងថ្មី ($0)', 'Create New Shop ($0)', '创建新店铺 ($0)')
                  : tr(
                      language,
                      `បន្ថែមហាងថ្មី (+${quota.additionalStoreFeeUsd.toFixed(2)})`,
                      `Add New Shop (+${quota.additionalStoreFeeUsd.toFixed(2)})`,
                      `添加新店 (+${quota.additionalStoreFeeUsd.toFixed(2)})`
                    )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my_stores')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'my_stores'
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>
                {tr(
                  language,
                  `ហាងរបស់ខ្ញុំ (${ownedRestaurants.length})`,
                  `My Shops (${ownedRestaurants.length})`,
                  `我的店铺 (${ownedRestaurants.length})`
                )}
              </span>
            </button>
          </div>
        )}

        {/* Not Signed In Guard */}
        {!currentUser ? (
          <div className="p-6 text-center space-y-3 font-khmer">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#064E3B] dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h4 className="font-moul text-sm text-slate-900 dark:text-white">
              {tr(language, 'សូមចូលគណនីជាមុនសិន', 'Please Sign In First', '请先登录账号')}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {tr(
                language,
                'សូមចូលគណនីរបស់អ្នកដើម្បីបង្កើត និងគ្រប់គ្រងហាងអាហារ។',
                'Please sign in to create and manage your restaurant.',
                '请先登录以创建和管理您的餐厅。'
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsVipAddRestaurantModalOpen(false);
                setIsAuthModalOpen(true);
              }}
              className="px-6 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              {tr(language, 'ចូលគណនីឥឡូវនេះ', 'Sign In Now', '立即登录')}
            </button>
          </div>
        ) : !isAdmin && !isApprovedVip ? (
          <div className="p-6 text-center space-y-3.5 font-khmer">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <Crown className="w-7 h-7" />
            </div>
            <h4 className="font-moul text-sm text-slate-900 dark:text-white">
              {tr(language, '🔒 សម្រាប់សមាជិក VIP សកម្មប៉ុណ្ណោះ', '🔒 Active VIP Membership Required', '🔒 仅限活跃 VIP 会员')}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {tr(
                language,
                `កញ្ចប់ VIP រួមបញ្ចូលសិទ្ធិបង្កើតហាងទី ១ ដោយឥតគិតថ្លៃ ($0)។ សូមដំឡើង ឬបន្តសមាជិកភាព VIP (${dynamicPlans.quarterly.priceUsd.toFixed(2)} / ${dynamicPlans.quarterly.durationDays} ថ្ងៃ ឬ ${dynamicPlans.annual.priceUsd.toFixed(2)} / ${dynamicPlans.annual.durationDays} ថ្ងៃ) ជាមុនសិន!`,
                `Your 1st shop is included with an active VIP subscription ($0). Please upgrade or renew VIP (${dynamicPlans.quarterly.priceUsd.toFixed(2)} or ${dynamicPlans.annual.priceUsd.toFixed(2)}) first!`,
                `VIP 会员免费包含第 1 家店铺 ($0)。请先开通或续费 VIP 套餐！`
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsVipAddRestaurantModalOpen(false);
                openUpgradeVipModal();
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Crown className="w-4 h-4 fill-slate-950" />
              <span>{tr(language, '👑 ដំឡើងទៅកញ្ចប់ VIP ឥឡូវនេះ', '👑 Upgrade to VIP Now', '👑 立即升级 VIP')}</span>
            </button>
          </div>
        ) : activeTab === 'my_stores' ? (
          /* ============================================================================
             COMPACT MY STORES LIST (Edit, Replace for $0, or Delete)
             ============================================================================ */
          <div className="p-4 space-y-3 overflow-y-auto flex-1 font-khmer text-xs">
            {ownedRestaurants.map((store, idx) => (
              <div
                key={store.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-2.5"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={store.photoUrl}
                    alt={store.nameKh}
                    className="w-14 h-14 rounded-xl object-cover shrink-0 border border-emerald-500/40"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold">
                        #{idx + 1}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {isKm ? store.nameKh : store.nameEn || store.nameKh}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      📍 {store.addressKh || store.provinceKh}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                      🍽️ {store.menuItems?.length || 0} {tr(language, 'មុខម្ហូប', 'dishes', '道菜品')}
                    </span>
                  </div>
                </div>

                {confirmDeleteStoreId === store.id ? (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-400 space-y-2">
                    <p className="font-bold text-rose-900 dark:text-rose-200 text-[11px]">
                      {tr(
                        language,
                        `តើអ្នកពិតជាចង់លុបហាង «${store.nameKh}» មែនទេ?`,
                        `Delete "${store.nameEn || store.nameKh}"?`,
                        `确定要删除“${store.nameEn || store.nameKh}”吗？`
                      )}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteStoreId(null);
                          deleteRestaurant(store.id);
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs cursor-pointer"
                      >
                        {tr(language, '🗑️ លុបឥឡូវនេះ', '🗑️ Confirm Delete', '🗑️ 确认删除')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteStoreId(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
                      >
                        {tr(language, 'បោះបង់', 'Cancel', '取消')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsVipAddRestaurantModalOpen(false);
                        setManagingRestaurant(store);
                        setIsManageMenuModalOpen(true);
                      }}
                      className="py-2 px-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{tr(language, 'គ្រប់គ្រង', 'Manage', '管理')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => beginReplaceStore(store)}
                      className="py-2 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{tr(language, 'ប្តូរហាងថ្មី', 'Replace', '更换')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteRestaurant(store.id)}
                      className="py-2 px-2 rounded-xl bg-rose-100 hover:bg-rose-600 hover:text-white dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{tr(language, 'លុប', 'Delete', '删除')}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                resetFormFields();
                setActiveTab('create_form');
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 text-slate-950 font-black text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>
                {quota.canAddWithoutNewPayment
                  ? tr(language, '+ បង្កើតហាងថ្មីមួយទៀត ($0)', '+ Create Another Shop ($0)', '+ 再创建一家新店铺 ($0)')
                  : tr(
                      language,
                      `+ បន្ថែមហាងទី ${quota.nextStoreSlotNumber} (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`,
                      `+ Add Shop #${quota.nextStoreSlotNumber} (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`,
                      `+ 添加第 ${quota.nextStoreSlotNumber} 家店铺 (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`
                    )}
              </span>
            </button>
          </div>
        ) : activeTab === 'pay_additional_slot' ? (
          /* ============================================================================
             EXTRA STORE SLOT CHECKOUT (Only if non-Admin user wants >1 simultaneous store)
             ============================================================================ */
          <form
            onSubmit={handleSubmitAdditionalStorePayment}
            className="p-4 space-y-3.5 overflow-y-auto flex-1 font-khmer text-xs"
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('create_form')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{tr(language, 'ត្រឡប់ក្រោយ', 'Back', '返回')}</span>
              </button>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                +${quota.additionalStoreFeeUsd.toFixed(2)} USD / 1 {tr(language, 'ហាងបន្ថែម', 'Extra Shop', '额外店铺')}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-400/80 space-y-1.5">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between">
                <span>
                  {tr(
                    language,
                    `🏪 តម្លៃបន្ថែមហាងទី ${quota.nextStoreSlotNumber}`,
                    `🏪 Additional Shop #${quota.nextStoreSlotNumber} Fee`,
                    `🏪 第 ${quota.nextStoreSlotNumber} 家额外店铺费用`
                  )}
                </span>
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">
                  +${quota.additionalStoreFeeUsd.toFixed(2)} USD
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">
                {tr(
                  language,
                  `ហាងទី ១ ត្រូវបានរួមបញ្ចូលក្នុងកញ្ចប់ VIP រួចហើយ ($0)។ រាល់ការបន្ថែមហាងទី ២ ឬហាងបន្តបន្ទាប់ តម្រូវឱ្យបង់ប្រាក់បន្ថែម ${quota.additionalStoreFeeUsd.toFixed(2)} USD ក្នុង ១ ហាង ហើយហាងបន្ថែមនឹងត្រូវបើកដំណើរការក្រោយពេលការទូទាត់ត្រូវបានផ្ទៀងផ្ទាត់ និងអនុម័ត។`,
                  `Your 1st shop is covered by your VIP subscription ($0). Each additional shop requires a separate ${quota.additionalStoreFeeUsd.toFixed(2)} USD payment and will be activated once payment is verified and approved.`,
                  `您的第 1 家店铺已包含在 VIP 订阅中 ($0)。每增加一家额外店铺需单独支付 ${quota.additionalStoreFeeUsd.toFixed(2)} USD，付款经核实批准后即可激活。`
                )}
              </p>
            </div>

            {quota.pendingAdditionalStoreTransaction && (
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-400/70 space-y-1">
                <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 text-xs">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    {tr(
                      language,
                      '⏳ សំណើទូទាត់បន្ថែមហាងកំពុងរង់ចាំការផ្ទៀងផ្ទាត់',
                      '⏳ Additional Shop Payment Pending Verification',
                      '⏳ 额外店铺付款正在等待审核'
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {tr(
                    language,
                    `លេខសម្គាល់៖ ${quota.pendingAdditionalStoreTransaction.id} • ហាងបន្ថែមនឹងអាចបង្កើត និងបើកដំណើរការភ្លាមៗក្រោយពេល Admin ផ្ទៀងផ្ទាត់ និងអនុម័តការទូទាត់។`,
                    `Ref: ${quota.pendingAdditionalStoreTransaction.id} • Your extra shop slot will unlock as soon as payment is verified and approved.`,
                    `单号：${quota.pendingAdditionalStoreTransaction.id} • 付款审核通过后将立即解锁额外店铺名额。`
                  )}
                </p>
              </div>
            )}

            {ownedRestaurants[0] && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 space-y-2">
                <p className="text-[11px] text-slate-700 dark:text-slate-200 font-medium">
                  {tr(
                    language,
                    `💡 ជម្រើសឥតគិតថ្លៃ ($0)៖ អ្នកអាចប្តូរហាងចាស់ «${ownedRestaurants[0].nameKh}» ដាក់ហាងថ្មីនេះជំនួសដោយមិនបាច់បង់ប្រាក់!`,
                    `💡 Free Option ($0): You can replace your existing store "${ownedRestaurants[0].nameKh}" with this new shop for $0!`,
                    `💡 免费选项 ($0)：您可以直接将现有店铺“${ownedRestaurants[0].nameKh}”更换为新店铺，无需付费！`
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReplacingStoreId(ownedRestaurants[0].id);
                    setActiveTab('create_form');
                  }}
                  className="w-full py-2 rounded-xl bg-[#064E3B] text-white font-bold text-xs cursor-pointer"
                >
                  {tr(language, '🔄 ប្តូរជំនួសហាងចាស់ដោយឥតគិតថ្លៃ ($0)', '🔄 Replace Existing Shop for Free ($0)', '🔄 免费更换现有店铺 ($0)')}
                </button>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <img
                src={appSettings.supportQrImageUrl || '/aba-khqr-499.png'}
                alt="ABA KHQR"
                className="w-28 h-36 object-contain rounded-xl border border-amber-400 bg-white p-1 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/donation-qr.png';
                }}
              />
              <div className="space-y-1 text-left">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                  <QrCode className="w-3 h-3" />
                  <span>ABA KHQR</span>
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {appSettings.supportAccountName || 'CHEA KIMSENG'} (095 245 959)
                </div>
                <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  ${quota.additionalStoreFeeUsd.toFixed(2)} USD
                </div>
                <p className="text-[10px] text-slate-500">
                  {tr(
                    language,
                    'ស្កេនបង់ប្រាក់ រួចភ្ជាប់រូបវិក្កយបត្រខាងក្រោមដើម្បីបើកហាងបន្ថែមថ្មី។',
                    'Scan to pay, then attach your receipt below to unlock an extra shop.',
                    '扫码支付后在下方上传收据，即可开启额外新店铺。'
                  )}
                </p>
              </div>
            </div>

            <input
              ref={slotFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSlotFileInputChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handlePickSlotReceiptFromGallery}
              className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>
                {slotProofData?.fileName
                  ? `✓ ${slotProofData.fileName}`
                  : tr(language, '📸 ជ្រើសរូបវិក្កយបត្រ ABA ពីទូរស័ព្ទ', '📸 Upload ABA Receipt Screenshot', '📸 上传 ABA 付款收据截图')}
              </span>
            </button>

            <input
              type="text"
              value={slotTrxRef}
              onChange={(e) => setSlotTrxRef(e.target.value)}
              placeholder={tr(language, 'លេខប្រតិបត្តិការ ABA (Trx ID - មិនបាច់ដាក់ក៏បានបើមានរូប)', 'ABA Transaction ID (Optional if receipt uploaded)', 'ABA 交易号（如已上传截图可不填）')}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
            />

            <button
              type="submit"
              disabled={isSubmittingSlotPayment}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmittingSlotPayment
                  ? tr(language, 'កំពុងបញ្ជូន...', 'Submitting...', '正在提交...')
                  : tr(language, '✅ បញ្ជាក់ការបង់ប្រាក់បន្ថែមហាង', '✅ Confirm Extra Shop Payment', '✅ 确认额外店铺付款')}
              </span>
            </button>
          </form>
        ) : (
          /* ============================================================================
             ULTRA-SIMPLE, COMPACT CREATE / ADD SHOP FORM (Default Screen!)
             ============================================================================ */
          <form
            onSubmit={handleSubmit}
            noValidate
            className="p-4 space-y-3.5 overflow-y-auto flex-1 font-khmer text-xs"
          >
            {/* Store Quota & Additional Shop Fee Notice (Displayed upfront before confirming!) */}
            {requiresAdditionalPayment ? (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {tr(
                        language,
                        `បន្ថែមហាងទី ${quota.nextStoreSlotNumber} (ហាងបន្ថែម)`,
                        `Adding Shop #${quota.nextStoreSlotNumber} (Additional Shop)`,
                        `添加第 ${quota.nextStoreSlotNumber} 家店铺（额外店铺）`
                      )}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono font-black text-xs shrink-0">
                    +${quota.additionalStoreFeeUsd.toFixed(2)} USD
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">
                  {tr(
                    language,
                    `ហាងទី ១ ត្រូវបានរួមបញ្ចូលក្នុងកញ្ចប់ VIP រួចហើយ (${quota.usedStoresCount}/${quota.totalAllowedStores} ហាង)។ ការបន្ថែមហាងទី ${quota.nextStoreSlotNumber} តម្រូវឱ្យបង់ប្រាក់បន្ថែម ${quota.additionalStoreFeeUsd.toFixed(2)} USD ហើយហាងនឹងបើកដំណើរការក្រោយពេលការទូទាត់ត្រូវបានផ្ទៀងផ្ទាត់ និងអនុម័ត។`,
                    `Your 1st shop is covered by your VIP subscription (${quota.usedStoresCount}/${quota.totalAllowedStores} used). Adding Shop #${quota.nextStoreSlotNumber} requires an additional ${quota.additionalStoreFeeUsd.toFixed(2)} USD fee and will be activated after payment verification.`,
                    `第 1 家店铺已包含在 VIP 套餐中（已用 ${quota.usedStoresCount}/${quota.totalAllowedStores}）。添加第 ${quota.nextStoreSlotNumber} 家店铺需额外支付 ${quota.additionalStoreFeeUsd.toFixed(2)} USD，付款审核通过后激活。`
                  )}
                </p>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('pay_additional_slot')}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>
                      {tr(
                        language,
                        `បង់ប្រាក់បន្ថែមហាងឥឡូវនេះ (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`,
                        `Pay Extra Shop Fee Now (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`,
                        `立即支付额外店铺费 (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`
                      )}
                    </span>
                  </button>
                  {ownedRestaurants[0] && (
                    <button
                      type="button"
                      onClick={() => beginReplaceStore(ownedRestaurants[0])}
                      className="py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{tr(language, 'ប្តូរហាងចាស់ ($0)', 'Replace ($0)', '更换旧店 ($0)')}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : !isAdmin ? (
              <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400/50 flex items-center justify-between text-[11px]">
                <span className="font-bold text-emerald-900 dark:text-emerald-200">
                  {targetReplacingStore
                    ? tr(language, '🔄 កែប្តូរជំនួសហាងដែលមានស្រាប់', '🔄 Replacing Existing Shop', '🔄 更换现有店铺')
                    : quota.usedStoresCount === 0
                    ? tr(language, '🎁 ហាងទី ១ រួមបញ្ចូលក្នុងកញ្ចប់ VIP', '🎁 1st Shop Included with VIP', '🎁 首店包含在 VIP 套餐中')
                    : tr(
                        language,
                        `✅ កូតាហាងបន្ថែមដែលបានផ្ទៀងផ្ទាត់ (${quota.usedStoresCount + 1}/${quota.totalAllowedStores})`,
                        `✅ Verified Store Slot (${quota.usedStoresCount + 1}/${quota.totalAllowedStores})`,
                        `✅ 已核实额外店铺名额 (${quota.usedStoresCount + 1}/${quota.totalAllowedStores})`
                      )}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px]">
                  $0.00
                </span>
              </div>
            ) : null}
            {/* Option: Manual Entry vs. Import from Google Maps */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 dark:from-emerald-950/50 dark:via-slate-800 dark:to-slate-800 border border-emerald-400/50 dark:border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <span>🗺️</span>
                    <span>
                      {tr(
                        language,
                        'ទាញយកទិន្នន័យហាងពី Google Maps',
                        'Import Shop from Google Maps',
                        '从 Google 地图导入店铺信息'
                      )}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">
                    {tr(
                      language,
                      'ស្វែងរកហាងរបស់អ្នកនៅលើ Google Maps ដើម្បីបំពេញឈ្មោះ អាសយដ្ឋាន លេខទូរស័ព្ទ និងរូបភាពដោយស្វ័យប្រវត្តិ ឬបំពេញដោយដៃខាងក្រោម។',
                      'Search your shop on Google Maps to auto-fill name, address, GPS, phone & photos, or enter manually below.',
                      '在 Google 地图上搜索您的店铺以自动填写名称、地址、GPS、电话和照片，或在下方手动填写。'
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsGoogleImportModalOpen(true)}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#064E3B] to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <span>🔍</span>
                  <span>
                    {tr(
                      language,
                      'Import ពី Google Maps',
                      'Import from Google Maps',
                      '从 Google 地图导入'
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (importedGooglePlaceId) {
                      setImportedGooglePlaceId(undefined);
                      setImportedGoogleMeta(undefined);
                      showToast(
                        tr(
                          language,
                          '✏️ បានប្តូរទៅការបំពេញដោយដៃ',
                          '✏️ Switched to Manual Entry',
                          '✏️ 已切换为手动输入'
                        ),
                        'info'
                      );
                    }
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                    !importedGooglePlaceId
                      ? 'bg-amber-400/90 text-slate-950 border-amber-500 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>✏️</span>
                  <span>
                    {tr(
                      language,
                      'បំពេញដោយដៃ (Manual)',
                      'Manual Entry',
                      '手动填写 (Manual)'
                    )}
                  </span>
                </button>
              </div>

              {importedGooglePlaceId && (
                <div className="p-2.5 rounded-xl bg-emerald-600/15 dark:bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-between gap-2 text-[11px]">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        {tr(
                          language,
                          'បានទាញយកពី Google Maps (អាចកែប្រែបានមុនរក្សាទុក)',
                          'Imported from Google Maps (Review & edit below)',
                          '已从 Google 地图导入（保存前可修改）'
                        )}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate mt-0.5">
                      Place ID: {importedGooglePlaceId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGoogleImportModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#064E3B] hover:bg-emerald-700 text-white font-bold text-[10px] shrink-0 cursor-pointer"
                  >
                    {tr(language, 'ប្តូរហាង', 'Change', '更换')}
                  </button>
                </div>
              )}
            </div>

            {/* 1. Shop Photo Section (Simple Cover Preview + 2 Clear Buttons) */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-500 shrink-0 bg-slate-200 dark:bg-slate-700 shadow-xs">
                  <img
                    src={coverPhoto}
                    alt="Shop Cover"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/foods/food-1.jpg';
                    }}
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/65 text-white text-[9px] text-center py-0.5 font-bold">
                    {tr(language, 'រូបហាង', 'Shop Photo', '店铺照片')}
                  </span>
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                    {tr(language, '១. រូបភាពតំណាងហាង', '1. Shop Cover Photo', '1. 店铺封面照片')}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={handlePickFromGallery}
                      className="py-2 px-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isUploadingPhoto
                          ? tr(language, 'កំពុងរើស...', 'Loading...', '加载中...')
                          : tr(language, 'រើសពីទូរស័ព្ទ', 'Gallery', '相册选图')}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => cameraInputRef.current?.click()}
                      className="py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      <span>{tr(language, 'ថតរូប', 'Camera', '拍照')}</span>
                    </button>
                  </div>

                  {/* Quick Sample Thumbnails */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {tr(language, 'រូបគំរូ៖', 'Samples:', '示例：')}
                    </span>
                    {SAMPLE_SHOP_PHOTOS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setShopPhotos([url])}
                        className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                          coverPhoto === url
                            ? 'border-emerald-600 scale-105'
                            : 'border-transparent opacity-65 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt="sample" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Shop Name (Khmer Required, English Optional) */}
            <div className="space-y-2.5">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {tr(language, '២. ឈ្មោះហាង (ភាសាខ្មែរ) *', '2. Shop Name (Khmer) *', '2. 店铺名称（柬文）*')}
                </label>
                <input
                  type="text"
                  required
                  value={nameKh}
                  onChange={(e) => setNameKh(e.target.value)}
                  placeholder={tr(language, 'ឧ. ភោជនីយដ្ឋាន ម្លិះ ឬ មិចកាហ្វេរ', 'e.g. Malis Restaurant or Café', '例如：茉莉餐厅')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                  {tr(language, 'ឈ្មោះជាអក្សរឡាតាំង / អង់គ្លេស (មិនបាច់ដាក់ក៏បាន)', 'English Name (Optional)', '英文名称（选填）')}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Malis Restaurant"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs focus:border-emerald-600 outline-none"
                />
              </div>
            </div>

            {/* 3. Province & Phone Number */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                  {tr(language, '៣. ខេត្ត / រាជធានី', '3. Province / City', '3. 省份 / 城市')}
                </label>
                <select
                  value={provinceKh}
                  onChange={(e) => {
                    const found = PROVINCES.find((p) => p.nameKh === e.target.value);
                    setProvinceKh(e.target.value);
                    if (found) setProvinceEn(found.nameEn);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-emerald-600 outline-none"
                >
                  {PROVINCES.map((p) => (
                    <option key={p.nameKh} value={p.nameKh}>
                      {isKm ? p.nameKh : p.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <Phone className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                  {tr(language, '៤. លេខទូរស័ព្ទហាង', '4. Phone Number', '4. 联系电话')}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="012 345 678"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:border-emerald-600 outline-none"
                />
              </div>
            </div>

            {/* 4. Short Address / Location + Check In Button */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {tr(language, '៥. ទីតាំង ឬអាសយដ្ឋានខ្លីៗ (មិនបាច់ដាក់ក៏បាន)', '5. Short Address / Location (Optional)', '5. 简短地址或位置（选填）')}
              </label>
              <input
                type="text"
                value={addressKh}
                onChange={(e) => setAddressKh(e.target.value)}
                placeholder={tr(language, 'ឧ. ជិតផ្សារថ្មី ឬ ផ្លូវលេខ ៦៣...', 'e.g. Near Central Market, St. 63...', '例如：中央市场附近...')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-emerald-600 outline-none"
              />

              {/* Check In / Set Shop Location Button */}
              <button
                type="button"
                onClick={() => setIsCheckInPickerOpen(true)}
                className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600/90 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm border border-emerald-400/30 transition cursor-pointer"
              >
                <span>📍 កំណត់ទីតាំងហាង (Check In)</span>
              </button>

              {/* Selected GPS Coordinates & Map Preview Badge */}
              {shopLat !== null && shopLng !== null && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-2 text-[11px]">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{tr(language, 'បានកំណត់ទីតាំង GPS រួចរាល់', 'GPS Location Pinned', '已标记 GPS 位置')}</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                      GPS: {shopLat.toFixed(6)}, {shopLng.toFixed(6)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCheckInPickerOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] shrink-0 cursor-pointer"
                  >
                    {tr(language, 'កែទីតាំង', 'Adjust Pin', '调整位置')}
                  </button>
                </div>
              )}
            </div>

            {/* Optional Collapsible Extra Info (Opening Hours & Description) */}
            <div>
              <button
                type="button"
                onClick={() => setShowMoreOptions((prev) => !prev)}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-between transition cursor-pointer"
              >
                <span>
                  {tr(
                    language,
                    '⚙️ បន្ថែមម៉ោងបើកហាង និងការពិពណ៌នា (មិនបាច់ដាក់ក៏បាន)',
                    '⚙️ Add Opening Hours & Description (Optional)',
                    '⚙️ 添加营业时间与简介（选填）'
                  )}
                </span>
                {showMoreOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showMoreOptions && (
                <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'ម៉ោងបើក & បិទហាង', 'Opening Hours', '营业时间')}
                    </label>
                    <input
                      type="text"
                      value={openingHoursKh}
                      onChange={(e) => setOpeningHoursKh(e.target.value)}
                      placeholder="០៧:០០ ព្រឹក - ០៩:០០ យប់"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        {tr(language, 'ប្រភេទអាជីវកម្ម / ហាង', 'Business Category', '营业类别')}
                      </label>
                      <input
                        type="text"
                        value={businessCategory}
                        onChange={(e) => setBusinessCategory(e.target.value)}
                        placeholder={tr(language, 'ឧ. restaurant, cafe, bakery...', 'e.g. restaurant, cafe, bakery...', '例如：restaurant, cafe...')}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        {tr(language, 'គេហទំព័រ / Facebook Page (Website)', 'Website / Page URL', '网站 / 主页链接')}
                      </label>
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'ការពិពណ៌នាអំពីហាង', 'Shop Description', '店铺简介')}
                    </label>
                    <textarea
                      rows={2}
                      value={descriptionKh}
                      onChange={(e) => setDescriptionKh(e.target.value)}
                      placeholder={tr(language, 'រៀបរាប់ខ្លីៗអំពីរសជាតិម្ហូប និងសេវាកម្ម...', 'Brief description of your food & service...', '简短介绍您的招牌美食与服务...')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-1 space-y-2">
              {requiresAdditionalPayment && (
                <div className="px-3 py-2 rounded-xl bg-amber-100/80 dark:bg-amber-950/60 border border-amber-400/70 flex items-center justify-between text-[11px] font-bold text-amber-950 dark:text-amber-200">
                  <span>
                    {tr(
                      language,
                      `តម្លៃបន្ថែមហាងទី ${quota.nextStoreSlotNumber}៖`,
                      `Additional Shop #${quota.nextStoreSlotNumber} Fee:`,
                      `第 ${quota.nextStoreSlotNumber} 家店铺费用：`
                    )}
                  </span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">
                    +${quota.additionalStoreFeeUsd.toFixed(2)} USD
                  </span>
                </div>
              )}
              <button
                type="submit"
                disabled={isSaving || isUploadingPhoto}
                className={`w-full py-3.5 px-4 rounded-2xl disabled:opacity-60 font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer ${
                  requiresAdditionalPayment
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 text-slate-950'
                    : 'bg-gradient-to-r from-[#064E3B] via-emerald-700 to-[#047857] hover:from-emerald-800 hover:to-emerald-700 text-white'
                }`}
              >
                {requiresAdditionalPayment ? (
                  <CreditCard className="w-5 h-5 text-slate-950 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
                )}
                <span>
                  {isSaving
                    ? tr(language, '⏳ កំពុងរក្សាទុកហាង...', '⏳ Saving Shop...', '⏳ 正在保存店铺...')
                    : targetReplacingStore
                    ? tr(language, '🔄 រក្សាទុកការប្តូរហាងថ្មីឥឡូវនេះ ($0)', '🔄 Save & Replace Shop Now ($0)', '🔄 立即保存并更换店铺 ($0)')
                    : requiresAdditionalPayment
                    ? tr(
                        language,
                        `💳 បន្តទៅបង់ប្រាក់ +${quota.additionalStoreFeeUsd.toFixed(2)} USD ដើម្បីបន្ថែមហាងទី ${quota.nextStoreSlotNumber}`,
                        `💳 Pay +${quota.additionalStoreFeeUsd.toFixed(2)} USD to Add Shop #${quota.nextStoreSlotNumber}`,
                        `💳 支付 +${quota.additionalStoreFeeUsd.toFixed(2)} USD 添加第 ${quota.nextStoreSlotNumber} 家店铺`
                      )
                    : tr(
                        language,
                        '✅ ចុះបញ្ជីហាងឥឡូវនេះ',
                        '✅ Register Shop Now',
                        '✅ 立即注册店铺'
                      )}
                </span>
              </button>
            </div>
          </form>
        )}
        <ShopLocationCheckInPickerModal
          isOpen={isCheckInPickerOpen}
          onClose={() => setIsCheckInPickerOpen(false)}
          initialLat={shopLat ?? undefined}
          initialLng={shopLng ?? undefined}
          initialAddress={addressKh}
          initialProvinceKh={provinceKh}
          shopName={nameKh || nameEn}
          language={language}
          onConfirmLocation={(loc: ShopCheckInLocationResult) => {
            setShopLat(loc.latitude);
            setShopLng(loc.longitude);
            setShopMapUrl(loc.mapUrl);
            if (loc.formattedAddressKh) {
              setAddressKh(loc.formattedAddressKh);
            }
            const matchedProv = PROVINCES.find(
              (p) =>
                p.nameKh === loc.provinceKh ||
                p.nameKh.replace(/^ខេត្ត|^រាជធានី/g, '') === loc.provinceKh.replace(/^ខេត្ត|^រាជធានី/g, '')
            );
            if (matchedProv) {
              setProvinceKh(matchedProv.nameKh);
              setProvinceEn(matchedProv.nameEn);
            }
            showToast(
              tr(
                language,
                '📍 បានកំណត់ទីតាំងហាង (Check In) ដោយជោគជ័យ!',
                '📍 Shop location pinned successfully!',
                '📍 店铺位置已成功标记！'
              ),
              'success'
            );
          }}
        />
        <GoogleMapsShopImporterModal
          isOpen={isGoogleImportModalOpen}
          onClose={() => setIsGoogleImportModalOpen(false)}
          language={language}
          existingRestaurants={restaurants}
          defaultProvinceKh={provinceKh}
          onSelectShop={(shop: ImportedGoogleShopData) => {
            setNameKh(shop.nameKh || shop.nameEn);
            setNameEn(shop.nameEn || shop.nameKh);
            const matchedProv = PROVINCES.find(
              (p) =>
                p.nameKh === shop.provinceKh ||
                p.nameKh.replace(/^ខេត្ត|^រាជធានី/g, '') === shop.provinceKh.replace(/^ខេត្ត|^រាជធានី/g, '')
            );
            if (matchedProv) {
              setProvinceKh(matchedProv.nameKh);
              setProvinceEn(matchedProv.nameEn);
            } else {
              setProvinceKh(shop.provinceKh);
              setProvinceEn(shop.provinceEn);
            }
            setAddressKh(shop.addressKh || shop.addressEn);
            setShopLat(shop.latitude);
            setShopLng(shop.longitude);
            setShopMapUrl(shop.mapUrl);
            if (shop.phone) {
              setPhone(shop.phone);
            }
            if (shop.openingHoursKh) {
              setOpeningHoursKh(shop.openingHoursKh);
            }
            if (shop.priceLevel) {
              setPriceLevel(shop.priceLevel);
            }
            if (Array.isArray(shop.photoUrls) && shop.photoUrls.length > 0) {
              setShopPhotos(shop.photoUrls.slice(0, 20));
            }
            if (shop.descriptionKh) {
              setDescriptionKh(shop.descriptionKh);
            }
            setBusinessCategory(shop.businessCategory || '');
            setWebsiteUrl(shop.websiteUrl || '');
            if (Array.isArray(shop.signatureDishesKh) && shop.signatureDishesKh.length > 0) {
              setSignatureDishesKh(shop.signatureDishesKh);
            }
            setImportedGooglePlaceId(shop.googlePlaceId);
            setImportedGoogleMeta(shop.googleMapsMeta);
            setShowMoreOptions(true);
            showToast(
              tr(
                language,
                `✅ បានទាញយកទិន្នន័យហាង «${shop.nameKh || shop.nameEn}» ពី Google Maps រួចរាល់! សូមពិនិត្យ និងកែប្រែតាមតម្រូវការ។`,
                `✅ Imported "${shop.nameEn || shop.nameKh}" from Google Maps! Review and edit before saving.`,
                `✅ 已从 Google 地图导入“${shop.nameEn || shop.nameKh}”！保存前可检查并修改。`
              ),
              'success'
            );
          }}
        />
      </div>
    </div>
  );
};

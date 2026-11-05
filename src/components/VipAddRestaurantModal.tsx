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
  Eye,
  ExternalLink,
  Navigation,
} from 'lucide-react';
import {
  RestaurantPriceLevel,
  GoogleMapsPlaceMetadata,
  isUserVipActive,
  getDynamicVipPlans,
  isAdminAccount,
  isValidCambodiaCoordinates,
  buildCanonicalGoogleMapsPinUrl,
  isValidGoogleMapsUrl,
  extractCoordsFromGoogleMapsUrl,
} from '../types';
import {
  isNativeAndroidOrIosPlatform,
  pickImageUsingNativeAndroidGallery,
  savePngDataUrlToGallery,
} from '../utils/androidMediaHelper';
import { validateAndModerateShopImage } from '../utils/imageModeration';
import { DefaultShopIcon } from './icons/DefaultShopIcon';
import { tr } from '../utils/i18n';
import { ShopLocationCheckInPickerModal, ShopCheckInLocationResult } from './ShopLocationCheckInPickerModal';

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

const SHOP_CATEGORIES = [
  {
    id: 'restaurant',
    labelKh: '🍽️ ភោជនីយដ្ឋាន & អាហារខ្មែរ',
    labelEn: '🍽️ Khmer Restaurant',
    labelZh: '🍽️ 柬式餐厅',
    defaultDishKh: 'ម្ហូបខ្មែរប្រចាំហាង',
  },
  {
    id: 'cafe',
    labelKh: '☕ ហាងកាហ្វេ & ភេសជ្ជៈ',
    labelEn: '☕ Café & Drinks',
    labelZh: '☕ 咖啡与饮品',
    defaultDishKh: 'កាហ្វេ និងភេសជ្ជៈ',
  },
  {
    id: 'street_food',
    labelKh: '🍜 គុយទាវ អាហារព្រឹក & អាហារតាមផ្លូវ',
    labelEn: '🍜 Noodles & Breakfast',
    labelZh: '🍜 粿条与早餐小吃',
    defaultDishKh: 'គុយទាវ និងអាហារព្រឹក',
  },
  {
    id: 'seafood',
    labelKh: '🦐 គ្រឿងសមុទ្រ សាច់អាំង & ស៊ុប',
    labelEn: '🦐 Seafood, BBQ & Hotpot',
    labelZh: '🦐 海鲜烧烤与火锅',
    defaultDishKh: 'គ្រឿងសមុទ្រ និងសាច់អាំង',
  },
  {
    id: 'bakery',
    labelKh: '🥐 ហាងនំប៉័ង & បង្អែម',
    labelEn: '🥐 Bakery & Desserts',
    labelZh: '🥐 烘焙与甜品',
    defaultDishKh: 'នំប៉័ង និងបង្អែម',
  },
  {
    id: 'vegetarian',
    labelKh: '🥗 ឆា អាំង ញ៉ាំ & អាហារសុខភាព',
    labelEn: '🥗 Stir-Fry, Grill & Salad',
    labelZh: '🥗 炒烤凉拌与健康美食',
    defaultDishKh: 'ឆា អាំង ញ៉ាំ',
  },
];

const HOTEL_CATEGORIES = [
  {
    id: 'hotel',
    labelKh: '🏨 សណ្ឋាគារ & កន្លែងស្នាក់នៅ',
    labelEn: '🏨 Hotel & Stay',
    labelZh: '🏨 酒店与住宿',
    defaultDishKh: 'បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ និង Wi-Fi',
  },
  {
    id: 'resort',
    labelKh: '🌴 រីសត & សណ្ឋាគារប្រណីត',
    labelEn: '🌴 Resort & Luxury Hotel',
    labelZh: '🌴 度假村与豪华酒店',
    defaultDishKh: 'រីសតមានអាងហែលទឹក និងសួនធម្មជាតិ',
  },
  {
    id: 'boutique_villa',
    labelKh: '🏡 ប៊ូទិក & វីឡា',
    labelEn: '🏡 Boutique Hotel & Villa',
    labelZh: '🏡 精品酒店与别墅',
    defaultDishKh: 'វីឡា និងប៊ូទិកប្រណីត',
  },
  {
    id: 'guesthouse',
    labelKh: '🛏️ ផ្ទះសំណាក់ & បឹងហ្គាឡូ',
    labelEn: '🛏️ Guesthouse & Bungalow',
    labelZh: '🛏️ 客栈与木屋',
    defaultDishKh: 'ផ្ទះសំណាក់ស្អាត តម្លៃសមរម្យ',
  },
];

export const VipAddRestaurantModal: React.FC = () => {
  const {
    isVipAddRestaurantModalOpen,
    setIsVipAddRestaurantModalOpen,
    addRestaurant,
    replaceExistingRestaurant,
    findDuplicateOrExistingListings,
    submitExistingListingUpgradeRequest,
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

  // Navigation Tabs: 'create_form' (Default!) or 'my_stores' or 'pay_additional_slot'
  const [activeTab, setActiveTab] = useState<'create_form' | 'my_stores' | 'pay_additional_slot'>('create_form');
  const [formMode, setFormMode] = useState<'add_new' | 'upgrade_existing'>('add_new');
  const [upgradingExistingStoreId, setUpgradingExistingStoreId] = useState<string | null>(null);
  const [existingSearchQuery, setExistingSearchQuery] = useState<string>('');
  const [existingProvinceFilter, setExistingProvinceFilter] = useState<string>('ALL');
  const [isPreviewStep, setIsPreviewStep] = useState(false);
  const [replacingStoreId, setReplacingStoreId] = useState<string | null>(null);
  const [confirmDeleteStoreId, setConfirmDeleteStoreId] = useState<string | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const isApprovedVip = isUserVipActive(currentUser);
  const dynamicPlans = getDynamicVipPlans(appSettings);
  const quota = getCurrentUserStoreQuota(currentUser);
  const ownedRestaurants = getOwnedRestaurantsForUser(currentUser);
  const requiresAdditionalPayment =
    !isAdmin && !replacingStoreId && !upgradingExistingStoreId && formMode === 'add_new' && quota.remainingAvailableSlots <= 0;

  // 7 Core Form Fields requested by User:
  // 1. Shop / Hotel Name
  const [businessType, setBusinessType] = useState<'restaurant' | 'hotel'>('restaurant');
  const [nameKh, setNameKh] = useState('');
  const [nameEn, setNameEn] = useState('');
  // 2. Shop / Hotel Category
  const [businessCategory, setBusinessCategory] = useState<string>('restaurant');
  // 3. Phone Number
  const [phone, setPhone] = useState(currentUser?.phone || '');
  // 4. Address / Province
  const [provinceKh, setProvinceKh] = useState('រាជធានីភ្នំពេញ');
  const [provinceEn, setProvinceEn] = useState('Phnom Penh');
  const [addressKh, setAddressKh] = useState('');
  // 5. Google Maps Link
  const [shopMapUrl, setShopMapUrl] = useState<string>('');
  // 6. GPS Location
  const [shopLat, setShopLat] = useState<number | null>(null);
  const [shopLng, setShopLng] = useState<number | null>(null);
  const [gpsInputText, setGpsInputText] = useState<string>('');
  // 7. Shop Photos
  const [shopPhoto, setShopPhoto] = useState<string>('');

  const [isCheckInPickerOpen, setIsCheckInPickerOpen] = useState(false);
  const [openingHoursKh, setOpeningHoursKh] = useState('០៧:០០ ព្រឹក - ០៩:០០ យប់');
  const [priceLevel, setPriceLevel] = useState<RestaurantPriceLevel>('$');
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);
  const [descriptionKh, setDescriptionKh] = useState('');
  const [importedGooglePlaceId, setImportedGooglePlaceId] = useState<string | undefined>(undefined);
  const [importedGoogleMeta, setImportedGoogleMeta] = useState<GoogleMapsPlaceMetadata | undefined>(undefined);
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [signatureDishesKh, setSignatureDishesKh] = useState<string[]>(['ម្ហូបខ្មែរប្រចាំហាង']);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [submittedPendingShop, setSubmittedPendingShop] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Additional Store Payment Checkout State
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

  const targetUpgradingExistingStore = useMemo(
    () => (upgradingExistingStoreId ? restaurants.find((r) => r.id === upgradingExistingStoreId) || null : null),
    [upgradingExistingStoreId, restaurants]
  );

  // Live duplicate detection when user is in 'add_new' mode
  const detectedDuplicates = useMemo(() => {
    if (formMode !== 'add_new' || replacingStoreId || upgradingExistingStoreId) return [];
    if (nameKh.trim().length < 2 && nameEn.trim().length < 2 && phone.trim().length < 8) return [];
    return findDuplicateOrExistingListings({
      nameKh: nameKh.trim(),
      nameEn: nameEn.trim(),
      phone: phone.trim(),
      mapUrl: shopMapUrl.trim(),
      googlePlaceId: importedGooglePlaceId,
      latitude: shopLat,
      longitude: shopLng,
      provinceKh,
      businessType,
    });
  }, [
    formMode,
    replacingStoreId,
    upgradingExistingStoreId,
    nameKh,
    nameEn,
    phone,
    shopMapUrl,
    importedGooglePlaceId,
    shopLat,
    shopLng,
    provinceKh,
    businessType,
    findDuplicateOrExistingListings,
  ]);

  // Searchable list of existing shops/hotels for the 'upgrade_existing' selector
  const searchableExistingListings = useMemo(() => {
    const q = existingSearchQuery.trim().toLowerCase();
    return restaurants
      .filter((r) => {
        if (!r || r.status === 'rejected') return false;
        const rType = r.businessType === 'hotel' ? 'hotel' : 'restaurant';
        if (rType !== businessType) return false;
        if (existingProvinceFilter !== 'ALL' && r.provinceKh !== existingProvinceFilter) return false;
        if (!q) return true;
        const nKh = (r.nameKh || '').toLowerCase();
        const nEn = (r.nameEn || '').toLowerCase();
        const addr = (r.addressKh || '').toLowerCase();
        const ph = (r.phone || '').replace(/[\s\-+]/g, '');
        const qClean = q.replace(/[\s\-+]/g, '');
        return (
          nKh.includes(q) ||
          nEn.includes(q) ||
          addr.includes(q) ||
          (qClean.length >= 3 && ph.includes(qClean)) ||
          (Array.isArray(r.signatureDishesKh) && r.signatureDishesKh.some((d) => d.toLowerCase().includes(q)))
        );
      })
      .slice(0, 30);
  }, [restaurants, businessType, existingProvinceFilter, existingSearchQuery]);

  const activeCategoryList = businessType === 'hotel' ? HOTEL_CATEGORIES : SHOP_CATEGORIES;
  const selectedCategoryObj = useMemo(
    () => activeCategoryList.find((c) => c.id === businessCategory) || activeCategoryList[0],
    [activeCategoryList, businessCategory]
  );

  const resetFormFields = () => {
    setNameKh('');
    setNameEn('');
    setBusinessCategory(businessType === 'hotel' ? 'hotel' : 'restaurant');
    setAddressKh('');
    setShopLat(null);
    setShopLng(null);
    setGpsInputText('');
    setShopMapUrl('');
    setDescriptionKh('');
    setShopPhoto('');
    setModerationWarning(null);
    setReplacingStoreId(null);
    setUpgradingExistingStoreId(null);
    setExistingSearchQuery('');
    setShowMoreOptions(false);
    setIsPreviewStep(false);
    setImportedGooglePlaceId(undefined);
    setImportedGoogleMeta(undefined);
    setWebsiteUrl('');
    setSignatureDishesKh([businessType === 'hotel' ? 'បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ និង Wi-Fi' : 'ម្ហូបខ្មែរប្រចាំហាង']);
  };

  const beginUpgradeExistingStore = (store: (typeof restaurants)[0]) => {
    const bType = store.businessType === 'hotel' ? 'hotel' : 'restaurant';
    setBusinessType(bType);
    setFormMode('upgrade_existing');
    setUpgradingExistingStoreId(store.id);
    setReplacingStoreId(null);
    setNameKh(store.nameKh || '');
    setNameEn(store.nameEn || '');
    setProvinceKh(store.provinceKh || 'រាជធានីភ្នំពេញ');
    setProvinceEn(store.provinceEn || 'Phnom Penh');
    setAddressKh(store.addressKh || '');
    const latVal = typeof store.latitude === 'number' && store.latitude !== 0 ? store.latitude : null;
    const lngVal = typeof store.longitude === 'number' && store.longitude !== 0 ? store.longitude : null;
    setShopLat(latVal);
    setShopLng(lngVal);
    setGpsInputText(latVal !== null && lngVal !== null ? `${latVal.toFixed(6)}, ${lngVal.toFixed(6)}` : '');
    setShopMapUrl(store.mapUrl || '');
    setPhone(store.phone || currentUser?.phone || '');
    setOpeningHoursKh(store.openingHoursKh || '០៧:០០ ព្រឹក - ០៩:០០ យប់');
    setPriceLevel(store.priceLevel || '$');
    setShopPhoto(store.profileImage || store.photoUrl || '');
    setModerationWarning(null);
    setDescriptionKh(store.descriptionKh || '');
    setImportedGooglePlaceId(store.googlePlaceId);
    setImportedGoogleMeta(store.googleMapsMeta);
    setBusinessCategory(store.businessCategory || (bType === 'hotel' ? 'hotel' : 'restaurant'));
    setWebsiteUrl(store.websiteUrl || store.googleMapsMeta?.websiteUri || '');
    setSignatureDishesKh(
      Array.isArray(store.signatureDishesKh) && store.signatureDishesKh.length > 0
        ? store.signatureDishesKh
        : [bType === 'hotel' ? 'បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ និង Wi-Fi' : 'ម្ហូបខ្មែរប្រចាំហាង']
    );
    setShowMoreOptions(true);
    setIsPreviewStep(false);
    setActiveTab('create_form');
  };

  const beginReplaceStore = (store: (typeof ownedRestaurants)[0]) => {
    const bType = store.businessType === 'hotel' ? 'hotel' : 'restaurant';
    setBusinessType(bType);
    setReplacingStoreId(store.id);
    setNameKh(store.nameKh || '');
    setNameEn(store.nameEn || '');
    setProvinceKh(store.provinceKh || 'រាជធានីភ្នំពេញ');
    setProvinceEn(store.provinceEn || 'Phnom Penh');
    setAddressKh(store.addressKh || '');
    const latVal = typeof store.latitude === 'number' && store.latitude !== 0 ? store.latitude : null;
    const lngVal = typeof store.longitude === 'number' && store.longitude !== 0 ? store.longitude : null;
    setShopLat(latVal);
    setShopLng(lngVal);
    setGpsInputText(latVal !== null && lngVal !== null ? `${latVal.toFixed(6)}, ${lngVal.toFixed(6)}` : '');
    setShopMapUrl(store.mapUrl || '');
    setPhone(store.phone || currentUser?.phone || '');
    setOpeningHoursKh(store.openingHoursKh || '០៧:០០ ព្រឹក - ០៩:០០ យប់');
    setShopPhoto(store.profileImage || store.photoUrl || '');
    setModerationWarning(null);
    setDescriptionKh(store.descriptionKh || '');
    setImportedGooglePlaceId(store.googlePlaceId);
    setImportedGoogleMeta(store.googleMapsMeta);
    setBusinessCategory(store.businessCategory || 'restaurant');
    setWebsiteUrl(store.websiteUrl || store.googleMapsMeta?.websiteUri || '');
    setSignatureDishesKh(
      Array.isArray(store.signatureDishesKh) && store.signatureDishesKh.length > 0
        ? store.signatureDishesKh
        : ['ម្ហូបខ្មែរប្រចាំហាង']
    );
    setIsPreviewStep(false);
    setActiveTab('create_form');
  };

  // When modal opens, check for initial mode or prefilled location from Google Maps Search
  useEffect(() => {
    if (!isVipAddRestaurantModalOpen) return;
    setPhone((prev) => prev || currentUser?.phone || '');

    const prefillLoc = (window as any).__kft_prefill_shop_location;
    if (prefillLoc) {
      delete (window as any).__kft_prefill_shop_location;
      if (typeof prefillLoc.latitude === 'number' && typeof prefillLoc.longitude === 'number') {
        setShopLat(Number(prefillLoc.latitude.toFixed(6)));
        setShopLng(Number(prefillLoc.longitude.toFixed(6)));
        setGpsInputText(`${prefillLoc.latitude.toFixed(6)}, ${prefillLoc.longitude.toFixed(6)}`);
      }
      if (prefillLoc.mapUrl) setShopMapUrl(prefillLoc.mapUrl);
      if (prefillLoc.addressKh) setAddressKh(prefillLoc.addressKh);
      if (prefillLoc.provinceKh) {
        const matched = PROVINCES.find(
          (p) =>
            p.nameKh === prefillLoc.provinceKh ||
            p.nameKh.replace(/^ខេត្ត|^រាជធានី/g, '') === prefillLoc.provinceKh.replace(/^ខេត្ត|^រាជធានី/g, '')
        );
        if (matched) {
          setProvinceKh(matched.nameKh);
          setProvinceEn(matched.nameEn);
        }
      }
    }

    const legacyAddMode = (window as any).__kft_vip_add_mode;
    if (legacyAddMode) {
      delete (window as any).__kft_vip_add_mode;
    }

    const initialReq = (window as any).__kft_vip_store_initial_mode;
    if (initialReq) {
      delete (window as any).__kft_vip_store_initial_mode;
      const reqType = initialReq.businessType === 'hotel' ? 'hotel' : 'restaurant';
      setBusinessType(reqType);
      setBusinessCategory(reqType === 'hotel' ? 'hotel' : 'restaurant');
      setSignatureDishesKh([reqType === 'hotel' ? 'បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ និង Wi-Fi' : 'ម្ហូបខ្មែរប្រចាំហាង']);
      if (initialReq.mode === 'upgrade_existing') {
        setFormMode('upgrade_existing');
        if (initialReq.storeId) {
          const foundExisting = restaurants.find((s) => s.id === initialReq.storeId);
          if (foundExisting) {
            beginUpgradeExistingStore(foundExisting);
            return;
          }
        }
        setUpgradingExistingStoreId(null);
        setReplacingStoreId(null);
        setSubmittedPendingShop(null);
        setIsPreviewStep(false);
        setActiveTab('create_form');
        return;
      } else if (initialReq.mode === 'replace' && initialReq.storeId) {
        const found = ownedRestaurants.find((s) => s.id === initialReq.storeId) || ownedRestaurants[0];
        if (found) {
          beginReplaceStore(found);
          return;
        }
      } else if (initialReq.mode === 'my_stores') {
        setActiveTab('my_stores');
        return;
      }
      setFormMode('add_new');
    } else if (legacyAddMode === 'upgrade_existing') {
      setFormMode('upgrade_existing');
      setBusinessType('restaurant');
      setBusinessCategory('restaurant');
    } else {
      setFormMode('add_new');
      setBusinessType('restaurant');
      setBusinessCategory('restaurant');
    }
    setUpgradingExistingStoreId(null);
    setReplacingStoreId(null);
    setSubmittedPendingShop(null);
    setIsPreviewStep(false);
    setActiveTab('create_form');
  }, [isVipAddRestaurantModalOpen]);

  if (!isVipAddRestaurantModalOpen) return null;

  // Pick Shop Photo from Gallery with Image Moderation & Validation
  const handlePickFromGallery = async () => {
    setModerationWarning(null);
    if (!isNativeAndroidOrIosPlatform()) {
      fileInputRef.current?.click();
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const nativePick = await pickImageUsingNativeAndroidGallery(1200, 0.85);
      if (nativePick?.cancelled) {
        setIsUploadingPhoto(false);
        return;
      }
      if (nativePick?.dataUrl) {
        const modRes = await validateAndModerateShopImage(nativePick.dataUrl, language);
        if (!modRes.valid || !modRes.dataUrl) {
          setModerationWarning(modRes.reason || null);
          showToast(modRes.reason || tr(language, '⚠️ រូបភាពមិនត្រឹមត្រូវ', '⚠️ Invalid shop image', '⚠️ 图片无效'), 'warning');
          setIsUploadingPhoto(false);
          return;
        }
        setShopPhoto(modRes.dataUrl);
        showToast(
          tr(language, '✅ បានជ្រើសរូបភាពហាងជោគជ័យ!', '✅ Shop photo selected!', '✅ 店铺照片已选择！'),
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
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setModerationWarning(null);
    setIsUploadingPhoto(true);
    try {
      const modRes = await validateAndModerateShopImage(file, language);
      if (!modRes.valid || !modRes.dataUrl) {
        setModerationWarning(modRes.reason || null);
        showToast(modRes.reason || tr(language, '⚠️ រូបភាពមិនត្រឹមត្រូវ', '⚠️ Invalid shop image', '⚠️ 图片无效'), 'warning');
        return;
      }
      setShopPhoto(modRes.dataUrl);
      showToast(
        tr(language, '✅ បានជ្រើសរូបភាពហាងជោគជ័យ!', '✅ Shop photo selected!', '✅ 店铺照片已选择！'),
        'success'
      );
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
    setModerationWarning(null);
    setIsUploadingPhoto(true);
    try {
      const modRes = await validateAndModerateShopImage(file, language);
      if (!modRes.valid || !modRes.dataUrl) {
        setModerationWarning(modRes.reason || null);
        showToast(modRes.reason || tr(language, '⚠️ រូបភាពមិនត្រឹមត្រូវ', '⚠️ Invalid shop photo', '⚠️ 照片无效'), 'warning');
        return;
      }
      setShopPhoto(modRes.dataUrl);
      showToast(
        tr(language, '✅ បានថតរូបហាងជោគជ័យ!', '✅ Shop photo captured!', '✅ 拍照成功！'),
        'success'
      );
    } catch {
      showToast(tr(language, '⚠️ មិនអាចអានរូបភាពបានទេ', '⚠️ Could not read photo', '⚠️ 无法读取照片'), 'warning');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleGpsInputChange = (val: string) => {
    setGpsInputText(val);
    const match = val.trim().match(/(-?\d+\.\d+)\s*[,/\s]\s*(-?\d+\.\d+)/);
    if (match) {
      const pLat = parseFloat(match[1]);
      const pLng = parseFloat(match[2]);
      if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
        setShopLat(Number(pLat.toFixed(6)));
        setShopLng(Number(pLng.toFixed(6)));
        if (!shopMapUrl.trim()) {
          setShopMapUrl(`https://www.google.com/maps/search/?api=1&query=${pLat.toFixed(6)},${pLng.toFixed(6)}`);
        }
      }
    }
  };

  // Validate form and open Preview screen before submitting
  const handleProceedToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNameKh = nameKh.trim();
    const trimmedNameEn = nameEn.trim();
    if (!trimmedNameKh && !trimmedNameEn) {
      showToast(
        tr(language, '⚠️ សូមបញ្ចូលឈ្មោះហាងរបស់អ្នក!', '⚠️ Please enter your shop name!', '⚠️ 请输入您的店铺名称！'),
        'warning'
      );
      return;
    }

    if (!phone.trim()) {
      showToast(
        tr(language, '⚠️ សូមបញ្ចូលលេខទូរស័ព្ទទំនាក់ទំនងហាង!', '⚠️ Please enter your shop phone number!', '⚠️ 请输入店铺联系电话！'),
        'warning'
      );
      return;
    }

    const trimmedMapUrl = shopMapUrl.trim();
    if (trimmedMapUrl && !isValidGoogleMapsUrl(trimmedMapUrl)) {
      showToast(
        tr(
          language,
          '⚠️ សូមបញ្ចូលតំណភ្ជាប់ Google Maps ឱ្យបានត្រឹមត្រូវ ឬចុចប៊ូតុងជ្រើសរើសទីតាំងលើផែនទី!',
          '⚠️ Please enter a valid Google Maps link or use the Select Location on Google Maps button!',
          '⚠️ 请输入有效的 Google 地图链接，或点击在地图上选择位置按钮！'
        ),
        'warning'
      );
      return;
    }

    // If user is trying to add a new listing that matches an existing listing, prompt them to select & upgrade it instead of creating a duplicate
    if (formMode === 'add_new' && !replacingStoreId && !upgradingExistingStoreId && detectedDuplicates.length > 0) {
      const exactMatch = detectedDuplicates.find((d) => {
        const nKhA = trimmedNameKh.toLowerCase();
        const nKhB = (d.nameKh || '').trim().toLowerCase();
        const nEnA = trimmedNameEn.toLowerCase();
        const nEnB = (d.nameEn || '').trim().toLowerCase();
        return (nKhA.length >= 3 && nKhA === nKhB) || (nEnA.length >= 3 && nEnA === nEnB);
      });
      if (exactMatch) {
        showToast(
          tr(
            language,
            `⚠️ «${exactMatch.nameKh || exactMatch.nameEn}» មានក្នុងប្រព័ន្ធរួចហើយ! សូមចុចប៊ូតុង «⬆️ ជ្រើសរើស និងដំឡើង» ខាងក្រោមដើម្បីស្នើកែប្រែព័ត៌មានជំនួសការបង្កើតស្ទួន។`,
            `⚠️ "${exactMatch.nameEn || exactMatch.nameKh}" already exists! Please select the existing listing below to submit an upgrade request instead of creating a duplicate.`,
            `⚠️ “${exactMatch.nameEn || exactMatch.nameKh}” 已存在！请选择下方现有列表提交升级申请，避免重复创建。`
          ),
          'warning'
        );
        return;
      }
    }

    setIsPreviewStep(true);
  };

  const handleConfirmSubmit = () => {
    if (isSaving) return;

    const trimmedNameKh = nameKh.trim();
    const trimmedNameEn = nameEn.trim();
    if (!trimmedNameKh && !trimmedNameEn) return;

    if (!isAdmin && !replacingStoreId && !upgradingExistingStoreId && quota.remainingAvailableSlots <= 0) {
      setIsPreviewStep(false);
      setActiveTab('pay_additional_slot');
      return;
    }

    const finalNameKh = trimmedNameKh || trimmedNameEn;
    const finalNameEn = trimmedNameEn || trimmedNameKh;
    const finalProfile = shopPhoto.trim() || '';
    const combinedGallery = finalProfile ? [finalProfile] : [];
    const trimmedMapUrl = shopMapUrl.trim();

    let resolvedLat = shopLat;
    let resolvedLng = shopLng;
    if ((resolvedLat === null || resolvedLng === null) && trimmedMapUrl) {
      const extracted = extractCoordsFromGoogleMapsUrl(trimmedMapUrl);
      if (extracted) {
        resolvedLat = extracted.latitude;
        resolvedLng = extracted.longitude;
      }
    }
    const hasVerifiedCoords =
      resolvedLat !== null &&
      resolvedLng !== null &&
      isValidCambodiaCoordinates(resolvedLat, resolvedLng);
    const hasValidMapLink = isValidGoogleMapsUrl(trimmedMapUrl);
    const resolvedMapUrl = hasValidMapLink
      ? trimmedMapUrl
      : hasVerifiedCoords
        ? buildCanonicalGoogleMapsPinUrl(resolvedLat!, resolvedLng!, importedGooglePlaceId)
        : '';

    setIsSaving(true);
    try {
      if (upgradingExistingStoreId) {
        const upgraded = submitExistingListingUpgradeRequest(upgradingExistingStoreId, {
          businessType,
          nameKh: finalNameKh,
          nameEn: finalNameEn,
          descriptionKh:
            descriptionKh.trim() ||
            `${finalNameKh} (${selectedCategoryObj.labelKh.replace(/^[^\s]+\s/, '')}) — ផាសុកភាព និងសេវាកម្មល្អ។`,
          descriptionEn: `${finalNameEn} (${selectedCategoryObj.labelEn.replace(/^[^\s]+\s/, '')}).`,
          photoUrl: finalProfile || undefined,
          profileImage: finalProfile || undefined,
          galleryPhotos: combinedGallery.length > 0 ? combinedGallery : undefined,
          phone: phone.trim() || currentUser?.phone || '',
          addressKh: addressKh.trim() || provinceKh,
          addressEn: addressKh.trim() || `${provinceEn}, Cambodia`,
          provinceKh,
          provinceEn,
          openingHoursKh: openingHoursKh.trim() || '០៧:០០ ព្រឹក - ០៩:០០ យប់',
          openingHoursEn: '07:00 AM - 09:00 PM',
          priceLevel,
          mapUrl: resolvedMapUrl || undefined,
          latitude: hasVerifiedCoords ? resolvedLat! : undefined,
          longitude: hasVerifiedCoords ? resolvedLng! : undefined,
          businessCategory: businessCategory.trim() || (businessType === 'hotel' ? 'hotel' : 'restaurant'),
          categoryKh: selectedCategoryObj.labelKh.replace(/^[^\s]+\s/, ''),
          categoryEn: selectedCategoryObj.labelEn.replace(/^[^\s]+\s/, ''),
          websiteUrl: websiteUrl.trim() || undefined,
          signatureDishesKh:
            signatureDishesKh.length > 0 ? signatureDishesKh : [selectedCategoryObj.defaultDishKh],
        });

        if (!upgraded) {
          setIsSaving(false);
          return;
        }

        resetFormFields();
        if (!isAdmin) {
          setSubmittedPendingShop(upgraded);
        } else {
          setIsVipAddRestaurantModalOpen(false);
          (window as any).__kft_manage_initial_tab = 'info';
          setManagingRestaurant(upgraded);
          setIsManageMenuModalOpen(true);
        }
        return;
      }

      const newRestData = {
        nameKh: finalNameKh,
        nameEn: finalNameEn,
        descriptionKh:
          descriptionKh.trim() || `${finalNameKh} (${selectedCategoryObj.labelKh.replace(/^[^\s]+\s/, '')}) — ផាសុកភាព និងរសជាតិឈ្ងុយឆ្ងាញ់។`,
        descriptionEn: `${finalNameEn} (${selectedCategoryObj.labelEn.replace(/^[^\s]+\s/, '')}).`,
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
        mapUrl: resolvedMapUrl,
        latitude: hasVerifiedCoords ? resolvedLat! : 0,
        longitude: hasVerifiedCoords ? resolvedLng! : 0,
        locationVerificationStatus:
          isAdmin || hasVerifiedCoords || hasValidMapLink
            ? ('verified' as const)
            : ('needs_admin_review' as const),
        locationNeedsReview: !(isAdmin || hasVerifiedCoords || hasValidMapLink),
        locationVerifiedAt: isAdmin || hasVerifiedCoords || hasValidMapLink ? new Date().toISOString() : undefined,
        locationReviewNote:
          isAdmin || hasVerifiedCoords || hasValidMapLink
            ? undefined
            : 'New shop submitted — awaiting Admin verification of shop & Google Maps location.',
        signatureDishesKh:
          signatureDishesKh.length > 0 ? signatureDishesKh : [selectedCategoryObj.defaultDishKh],
        googlePlaceId: importedGooglePlaceId,
        dataSource: 'vip_owner' as const,
        googleMapsMeta: importedGoogleMeta
          ? {
              ...importedGoogleMeta,
              websiteUri: websiteUrl.trim() || importedGoogleMeta.websiteUri,
            }
          : undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        businessType,
        businessCategory: businessCategory.trim() || (businessType === 'hotel' ? 'hotel' : 'restaurant'),
        categoryKh: selectedCategoryObj.labelKh.replace(/^[^\s]+\s/, ''),
        categoryEn: selectedCategoryObj.labelEn.replace(/^[^\s]+\s/, ''),
        isFeatured: true,
        isVerified: true,
        isAdminEdited: isAdmin ? true : undefined,
        adminEditedAt: isAdmin ? new Date().toISOString() : undefined,
        membershipTier: 'premium' as const,
        status: 'approved' as const,
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
      if (!isAdmin) {
        setSubmittedPendingShop(created);
      } else {
        setIsVipAddRestaurantModalOpen(false);
        (window as any).__kft_manage_initial_tab = 'info';
        setManagingRestaurant(created);
        setIsManageMenuModalOpen(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickSlotReceiptFromGallery = async () => {
    if (!isNativeAndroidOrIosPlatform()) {
      slotFileInputRef.current?.click();
      return;
    }
    const picked = await pickImageUsingNativeAndroidGallery(1200, 0.84);
    if (picked && picked.cancelled) return;
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
      const modRes = await validateAndModerateShopImage(file, language);
      if (!modRes.valid || !modRes.dataUrl) {
        showToast(modRes.reason || (isKm ? 'មិនអាចអានឯកសាររូបភាពបានទេ' : 'Failed to read image'), 'warning');
        return;
      }
      setSlotProofData({
        dataUrl: modRes.dataUrl,
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

  const coverPhoto = shopPhoto.trim();

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

        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#064E3B] to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-400 text-slate-950 shadow-xs shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-moul text-sm text-white truncate">
                {targetReplacingStore
                  ? tr(language, '🔄 កែប្តូរព័ត៌មានថ្មី ($0)', '🔄 Replace Listing ($0)', '🔄 更换信息 ($0)')
                  : isPreviewStep
                  ? tr(language, '👁️ មើលជាមុន និងដាក់ស្នើ', '👁️ Preview & Submit', '👁️ 预览并提交')
                  : businessType === 'hotel'
                  ? tr(language, '🏨 បន្ថែមសណ្ឋាគារ / ផ្ទះសំណាក់ថ្មី', '🏨 Add New Hotel / Stay', '🏨 添加新酒店/客栈')
                  : tr(language, '➕ បន្ថែមហាងថ្មី (Add New Shop)', '➕ Add New Shop', '➕ 添加新店铺')}
              </h3>
              <p className="text-[11px] text-emerald-100 font-khmer truncate">
                {isPreviewStep
                  ? tr(
                      language,
                      'ជំហានទី ៣៖ ពិនិត្យព័ត៌មានហាងមុនពេលបញ្ជូនទៅផ្ទៀងផ្ទាត់',
                      'Step 3: Review your shop details before submitting',
                      '第 3 步：提交审核前检查店铺信息'
                    )
                  : tr(
                      language,
                      'បំពេញព័ត៌មានហាង ជ្រើសរើសទីតាំងលើ Google Maps រួចដាក់ស្នើ',
                      'Enter shop info, select location on Google Maps & submit',
                      '填写店铺信息，在 Google 地图上选择位置并提交'
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
        {currentUser && ownedRestaurants.length > 0 && !isPreviewStep && (
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
                  : tr(language, '+ បន្ថែមហាងថ្មី', '+ Add New Shop', '+ 添加新店铺')}
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

        {/* Submission Confirmation Alert Dialog */}
        {submittedPendingShop ? (
          <div className="p-6 text-center space-y-4 font-khmer animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-400 text-amber-600 dark:text-amber-300 flex items-center justify-center mx-auto shadow-md">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 font-bold text-xs border border-amber-300 dark:border-amber-700">
                ⏳ {tr(language, 'រង់ចាំការត្រួតពិនិត្យ និងអនុម័តពី Admin', 'Pending Admin Review & Approval', '等待管理员审核与批准')}
              </span>
              <h4 className="font-moul text-base text-slate-900 dark:text-white pt-1">
                {tr(
                  language,
                  '✅ បានទទួលសំណើបន្ថែមហាងរបស់អ្នកជោគជ័យ!',
                  '✅ Shop Submission Received!',
                  '✅ 您的店铺申请已成功提交！'
                )}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {tr(
                  language,
                  `ហាង «${submittedPendingShop.nameKh || submittedPendingShop.nameEn}» ត្រូវបានបញ្ជូនទៅកាន់រដ្ឋបាល (Admin) ដើម្បីត្រួតពិនិត្យ និងផ្ទៀងផ្ទាត់ទីតាំង។ បន្ទាប់ពីផ្ទៀងផ្ទាត់រួចរាល់ ហាងរបស់អ្នកនឹងបង្ហាញជាផ្លូវការ!`,
                  `Your shop "${submittedPendingShop.nameEn || submittedPendingShop.nameKh}" has been sent for verification.`,
                  `您的店铺“${submittedPendingShop.nameEn || submittedPendingShop.nameKh}”已提交管理员核验！`
                )}
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  const shop = submittedPendingShop;
                  setSubmittedPendingShop(null);
                  setIsVipAddRestaurantModalOpen(false);
                  (window as any).__kft_manage_initial_tab = 'info';
                  setManagingRestaurant(shop);
                  setIsManageMenuModalOpen(true);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-[#064E3B] hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                {tr(language, '🏪 ពិនិត្យ និងកែប្រែព័ត៌មានហាងឥឡូវនេះ', '🏪 View & Edit Shop Info Now', '🏪 立即查看与编辑店铺信息')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmittedPendingShop(null);
                  setIsVipAddRestaurantModalOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                {tr(language, 'យល់ព្រម (បិទផ្ទាំងនេះ)', 'OK, Got It', '好的，知道了')}
              </button>
            </div>
          </div>
        ) : !currentUser ? (
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
                'សូមចូលគណនីរបស់អ្នកដើម្បីបន្ថែមហាងថ្មី និងគ្រប់គ្រងហាងអាហារ។',
                'Please sign in to add and manage your shop.',
                '请先登录以添加和管理您的餐厅。'
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
                `Your 1st shop is included with an active VIP subscription ($0). Please upgrade or renew VIP first!`,
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
             MY STORES LIST
             ============================================================================ */
          <div className="p-4 space-y-3 overflow-y-auto flex-1 font-khmer text-xs">
            {ownedRestaurants.map((store, idx) => (
              <div
                key={store.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-2.5"
              >
                <div className="flex items-center gap-3">
                  {store.photoUrl ? (
                    <img
                      src={store.photoUrl}
                      alt={store.nameKh}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-emerald-500/40"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-emerald-500/40">
                      <DefaultShopIcon className="w-full h-full" />
                    </div>
                  )}
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
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                      {store.status === 'pending'
                        ? tr(language, '⏳ រង់ចាំការអនុម័តពី Admin', '⏳ Pending Admin Review', '⏳ 等待管理员审核')
                        : tr(language, '✅ បានអនុម័ត', '✅ Verified Shop', '✅ 已认证店铺')}
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
                setFormMode('add_new');
                setActiveTab('create_form');
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 text-slate-950 font-black text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>
                {quota.canAddWithoutNewPayment
                  ? tr(language, '+ បន្ថែមហាងថ្មីមួយទៀត ($0)', '+ Add Another Shop ($0)', '+ 再添加一家新店铺 ($0)')
                  : tr(
                      language,
                      `+ បន្ថែមហាងទី ${quota.nextStoreSlotNumber} (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`,
                      `+ Add Shop #${quota.nextStoreSlotNumber} (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`,
                      `+ 添加第 ${quota.nextStoreSlotNumber} 家店铺 (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`
                    )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                resetFormFields();
                setFormMode('upgrade_existing');
                setActiveTab('create_form');
              }}
              className="w-full py-2.5 px-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>⬆️</span>
              <span>
                {tr(
                  language,
                  'ដំឡើងហាង/សណ្ឋាគារដែលមានស្រាប់ (Upgrade Existing Shop / Hotel)',
                  'Upgrade Existing Shop / Hotel',
                  '升级现有店铺 / 酒店'
                )}
              </span>
            </button>
          </div>
        ) : activeTab === 'pay_additional_slot' ? (
          /* ============================================================================
             EXTRA STORE SLOT CHECKOUT
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
                  `ហាងទី ១ ត្រូវបានរួមបញ្ចូលក្នុងកញ្ចប់ VIP រួចហើយ ($0)។ រាល់ការបន្ថែមហាងទី ២ ឬហាងបន្តបន្ទាប់ តម្រូវឱ្យបង់ប្រាក់បន្ថែម ${quota.additionalStoreFeeUsd.toFixed(2)} USD ក្នុង ១ ហាង។`,
                  `Your 1st shop is covered by your VIP subscription ($0). Each additional shop requires a separate ${quota.additionalStoreFeeUsd.toFixed(2)} USD payment.`,
                  `您的第 1 家店铺已包含在 VIP 订阅中 ($0)。每增加一家额外店铺需单独支付 ${quota.additionalStoreFeeUsd.toFixed(2)} USD。`
                )}
              </p>
            </div>

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

            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-3 text-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                <QrCode className="w-3.5 h-3.5" />
                <span>ABA KHQR</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await savePngDataUrlToGallery('/images/aba_khqr_official_kimseng.png', 'ABA-KHQR-KIMSENG-CHEA-095245959.png');
                    showToast(
                      res.duplicate
                        ? tr(language, '✅ រូបភាព ABA QR ច្បាប់ដើមមាននៅក្នុង Gallery រួចហើយ!', '✅ Original ABA QR image is already in your Gallery!', '✅ 原始 ABA 二维码图片已在相册中！')
                        : tr(language, '✅ បានរក្សាទុករូបភាព ABA QR ច្បាប់ដើមទៅក្នុង Gallery / Photos រួចរាល់!', '✅ Saved original ABA QR image to Gallery/Photos!', '✅ 原始 ABA 二维码已保存到手机相册！'),
                      'success'
                    );
                  } catch {}
                }}
                className="w-60 sm:w-68 max-w-full mx-auto rounded-2xl overflow-hidden border-2 border-amber-400 shadow-sm bg-white cursor-pointer active:scale-[0.985] transition block p-0"
              >
                <img
                  src="/images/aba_khqr_official_kimseng.png"
                  alt="ABA KHQR — KIMSENG CHEA"
                  className="w-full h-auto object-contain block bg-white"
                />
              </button>
              <div className="space-y-1">
                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {appSettings.supportAccountName || 'CHEA KIMSENG'} (095 245 959)
                </div>
                <div className="text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  ${quota.additionalStoreFeeUsd.toFixed(2)} USD
                </div>
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
        ) : isPreviewStep ? (
          /* ============================================================================
             STEP 3: PREVIEW AND SUBMIT SCREEN (មើលជាមុន និងដាក់ស្នើហាង)
             ============================================================================ */
          <div className="p-4 space-y-4 overflow-y-auto flex-1 font-khmer text-xs animate-fade-in">
            {/* Step Explanation Banner */}
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/50 space-y-1">
              <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
                <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {tr(
                    language,
                    'ជំហានទី ៣៖ ពិនិត្យមើលព័ត៌មានហាងជាមុន (Preview)',
                    'Step 3: Preview Your Shop Details',
                    '第 3 步：预览您的店铺信息'
                  )}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {tr(
                  language,
                  'សូមពិនិត្យមើលព័ត៌មានហាង ទីតាំង GPS និងតំណភ្ជាប់ Google Maps ខាងក្រោមឱ្យបានត្រឹមត្រូវ មុនពេលចុច «✅ បញ្ជាក់ និងដាក់ស្នើហាង» ដើម្បីបញ្ជូនទៅផ្ទៀងផ្ទាត់។',
                  'Please review your shop details, GPS coordinates, and Google Maps link below before submitting for verification.',
                  '请核对下方的店铺名称、照片、GPS 坐标与 Google 地图链接，确认无误后点击提交审核。'
                )}
              </p>
            </div>

            {/* Visual Shop Preview Card */}
            <div className="rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-white dark:bg-slate-800 shadow-md">
              <div className="relative h-40 bg-slate-900">
                {coverPhoto ? (
                  <img src={coverPhoto} alt={nameKh || nameEn} className="w-full h-full object-cover" />
                ) : (
                  <DefaultShopIcon className="w-full h-full" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                    {isKm ? selectedCategoryObj.labelKh : selectedCategoryObj.labelEn}
                  </span>
                </div>
                <div className="absolute bottom-2.5 left-3 right-3 text-white">
                  <h4 className="font-bold text-sm sm:text-base truncate">{nameKh || nameEn}</h4>
                  {nameEn && nameKh && (
                    <p className="text-[11px] text-emerald-200 truncate">{nameEn}</p>
                  )}
                </div>
              </div>

              {/* Detailed Checklist of the 7 Fields */}
              <div className="p-3.5 space-y-2.5 divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                <div className="flex justify-between gap-2 pt-0.5">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">
                    {tr(language, '១. ឈ្មោះហាង៖', '1. Shop Name:', '1. 店铺名称：')}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">
                    {nameKh || nameEn}
                  </span>
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">
                    {tr(language, '២. ប្រភេទហាង៖', '2. Shop Category:', '2. 店铺类别：')}
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-right">
                    {isKm ? selectedCategoryObj.labelKh : selectedCategoryObj.labelEn}
                  </span>
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">
                    {tr(language, '៣. លេខទូរស័ព្ទ៖', '3. Phone Number:', '3. 联系电话：')}
                  </span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white text-right">
                    {phone}
                  </span>
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">
                    {tr(language, '៤. អាសយដ្ឋាន / ខេត្ត៖', '4. Address / Province:', '4. 地址 / 省份：')}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">
                    {addressKh ? `${addressKh}, ${provinceKh}` : provinceKh}
                  </span>
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">
                    {tr(language, '៥. ទីតាំង GPS៖', '5. GPS Location:', '5. GPS 坐标：')}
                  </span>
                  <span className="font-bold font-mono text-emerald-700 dark:text-emerald-300 text-right">
                    {shopLat !== null && shopLng !== null
                      ? `${shopLat.toFixed(6)}, ${shopLng.toFixed(6)}`
                      : tr(language, 'មិនទាន់កំណត់ម្ជុល GPS', 'Not pinned yet', '未标记 GPS')}
                  </span>
                </div>

                <div className="pt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      {tr(language, '៦. តំណភ្ជាប់ Google Maps៖', '6. Google Maps Link:', '6. Google 地图链接：')}
                    </span>
                    {(shopMapUrl || (shopLat !== null && shopLng !== null)) && (
                      <a
                        href={
                          shopMapUrl.trim() ||
                          `https://www.google.com/maps/search/?api=1&query=${shopLat},${shopLng}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 underline"
                      >
                        <span>{tr(language, 'សាកល្បងបើកផែនទី', 'Test Map Link', '测试打开地图')}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono text-[10px] text-slate-600 dark:text-slate-300 break-all">
                    {shopMapUrl.trim() ||
                      (shopLat !== null && shopLng !== null
                        ? `https://www.google.com/maps/search/?api=1&query=${shopLat.toFixed(6)},${shopLng.toFixed(6)}`
                        : tr(language, 'មិនទាន់មានលីង Google Maps', 'No Google Maps link provided', '暂无链接'))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons: Edit vs Confirm & Submit */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsPreviewStep(false)}
                className="py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{tr(language, '✏️ កែប្រែព័ត៌មាន', '✏️ Edit Details', '✏️ 返回修改')}</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmSubmit}
                className="py-3 px-3 rounded-2xl bg-gradient-to-r from-[#064E3B] via-emerald-700 to-[#047857] hover:from-emerald-800 text-white font-black text-xs shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  {isSaving
                    ? tr(language, '⏳ កំពុងដាក់ស្នើ...', '⏳ Submitting...', '⏳ 正在提交...')
                    : tr(language, '✅ បញ្ជាក់ និងដាក់ស្នើហាង', '✅ Confirm & Submit', '✅ 确认并提交')}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================================
             SIMPLE, CLEAR ADD NEW SHOP FORM (3-STEP KHMER GUIDE + 7 FIELDS)
             ============================================================================ */
          <form
            onSubmit={handleProceedToPreview}
            noValidate
            className="p-4 space-y-3.5 overflow-y-auto flex-1 font-khmer text-xs"
          >
            {/* Mode Switcher: Add New vs Upgrade Existing Shop / Hotel */}
            <div className="p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFormMode('add_new');
                  setUpgradingExistingStoreId(null);
                }}
                className={`py-2.5 px-2.5 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  formMode === 'add_new' && !upgradingExistingStoreId
                    ? 'bg-[#064E3B] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {tr(language, 'បន្ថែមថ្មី (Add New)', 'Add New Listing', '添加新列表')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormMode('upgrade_existing');
                  setReplacingStoreId(null);
                }}
                className={`py-2.5 px-2.5 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  formMode === 'upgrade_existing' || Boolean(upgradingExistingStoreId)
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
              >
                <span>⬆️</span>
                <span className="truncate">
                  {tr(
                    language,
                    'ដំឡើងដែលមានស្រាប់ (Upgrade Existing)',
                    'Upgrade Existing Shop / Hotel',
                    '升级现有店铺/酒店'
                  )}
                </span>
              </button>
            </div>

            {/* Business Type Switcher: Shop / Restaurant vs Hotel / Stay */}
            {!upgradingExistingStoreId && !replacingStoreId && (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setBusinessType('restaurant');
                    setBusinessCategory('restaurant');
                    setSignatureDishesKh(['ម្ហូបខ្មែរប្រចាំហាង']);
                  }}
                  className={`py-2 px-3 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                    businessType === 'restaurant'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  🍽️ {tr(language, 'ហាងអាហារ (Shop / Restaurant)', 'Shop / Restaurant', '餐饮店铺')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBusinessType('hotel');
                    setBusinessCategory('hotel');
                    setSignatureDishesKh(['បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ និង Wi-Fi']);
                  }}
                  className={`py-2 px-3 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                    businessType === 'hotel'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  🏨 {tr(language, 'សណ្ឋាគារ / ផ្ទះសំណាក់ (Hotel)', 'Hotel / Stay', '酒店 / 住宿')}
                </button>
              </div>
            )}

            {/* Existing Listing Selector when in 'upgrade_existing' mode and no listing selected yet */}
            {formMode === 'upgrade_existing' && !upgradingExistingStoreId ? (
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-slate-800/90 border-2 border-amber-400/70 space-y-3">
                <div className="space-y-1">
                  <div className="font-extrabold text-amber-950 dark:text-amber-200 text-xs flex items-center gap-1.5">
                    <span>⬆️</span>
                    <span>
                      {tr(
                        language,
                        'ជ្រើសរើសហាង ឬសណ្ឋាគារដែលមានស្រាប់ដើម្បីដំឡើង និងកែប្រែព័ត៌មាន',
                        'Select an Existing Shop or Hotel to Upgrade',
                        '选择现有店铺或酒店进行升级与修改'
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {tr(
                      language,
                      'ស្វែងរកហាង ឬសណ្ឋាគាររបស់អ្នកដែលមានក្នុងប្រព័ន្ធរួចហើយ រួចចុច «ជ្រើសរើស» ដើម្បីបន្ថែម ឬកែប្រែរូបភាព ការពិពណ៌នា លេខទូរស័ព្ទ និងទីតាំង (តម្រូវឱ្យមានការអនុម័តពី Admin មុនផ្សព្វផ្សាយ)។',
                      'Search for your existing shop or hotel below and tap Select to update photos, descriptions, contact details, and business info (requires Admin approval before publishing).',
                      '搜索现有店铺或酒店并点击选择，即可更新照片、简介、联系方式及位置（需管理员审核批准后发布）。'
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={existingSearchQuery}
                    onChange={(e) => setExistingSearchQuery(e.target.value)}
                    placeholder={tr(
                      language,
                      '🔍 ស្វែងរកតាមឈ្មោះ លេខទូរស័ព្ទ ឬអាសយដ្ឋាន...',
                      '🔍 Search by name, phone, or address...',
                      '🔍 按名称、电话或地址搜索...'
                    )}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:border-amber-500"
                  />
                  <select
                    value={existingProvinceFilter}
                    onChange={(e) => setExistingProvinceFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold outline-none"
                  >
                    <option value="ALL">
                      {tr(language, 'គ្រប់រាជធានី-ខេត្តទាំង ២៥', 'All 25 Provinces', '全部 25 个省市')}
                    </option>
                    {PROVINCES.map((p) => (
                      <option key={p.nameKh} value={p.nameKh}>
                        {isKm ? p.nameKh : p.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {searchableExistingListings.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-xs">
                      {tr(
                        language,
                        'រកមិនឃើញហាង/សណ្ឋាគារដែលត្រូវនឹងពាក្យស្វែងរកទេ។',
                        'No matching existing shops or hotels found.',
                        '未找到匹配的现有店铺或酒店。'
                      )}
                    </div>
                  ) : (
                    searchableExistingListings.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2.5 hover:border-amber-400 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.photoUrl ? (
                            <img
                              src={item.photoUrl}
                              alt={item.nameKh}
                              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                              <DefaultShopIcon className="w-full h-full" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                              {item.nameKh || item.nameEn}
                            </div>
                            {item.nameEn && item.nameKh && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {item.nameEn}
                              </div>
                            )}
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                              📍 {item.provinceKh} {item.phone ? `• 📞 ${item.phone}` : ''}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => beginUpgradeExistingStore(item)}
                          className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-black text-[11px] shrink-0 shadow-2xs transition active:scale-95 cursor-pointer"
                        >
                          {tr(language, '⬆️ ជ្រើសរើស', '⬆️ Select', '⬆️ 选择')}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {/* Active Existing Listing Upgrade Banner */}
            {targetUpgradingExistingStore && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300">
                      ⬆️ {tr(language, 'កំពុងស្នើដំឡើងហាង/សណ្ឋាគារដែលមានស្រាប់', 'Upgrading Existing Listing', '正在升级现有列表')}
                    </div>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                      {targetUpgradingExistingStore.nameKh || targetUpgradingExistingStore.nameEn}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUpgradingExistingStoreId(null);
                      setFormMode('upgrade_existing');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-400 text-amber-800 dark:text-amber-200 font-bold text-[10px] shrink-0 cursor-pointer"
                  >
                    {tr(language, '🔄 ប្តូរជ្រើសរើស', '🔄 Change', '🔄 更换选择')}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug">
                  {tr(
                    language,
                    'អ្នកអាចបន្ថែម ឬកែប្រែរូបភាព ការពិពណ៌នា លេខទូរស័ព្ទ អាសយដ្ឋាន និងផែនទីខាងក្រោម។ រាល់ការកែប្រែនឹងត្រូវដាក់ជូន Admin អនុម័តមុនពេលផ្សព្វផ្សាយ។',
                    'Add or update photos, descriptions, contact details, and location below. Changes require Admin approval before publishing.',
                    '在下方添加或更新照片、简介、联系方式及位置。修改内容需经管理员批准后发布。'
                  )}
                </p>
              </div>
            )}

            {/* 3-Step Khmer Guide Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-slate-800 border border-emerald-400/50 space-y-1.5">
              <div className="font-bold text-emerald-950 dark:text-emerald-200 text-xs flex items-center gap-1.5">
                <span>📋</span>
                <span>
                  {tr(
                    language,
                    'ការណែនាំ ៣ ជំហានងាយៗក្នុងការបន្ថែមហាងថ្មី៖',
                    '3 Simple Steps to Add a New Shop:',
                    '添加新店铺的 3 个简单步骤：'
                  )}
                </span>
              </div>
              <div className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1 leading-relaxed">
                <div>
                  <b className="text-emerald-800 dark:text-emerald-300">
                    {tr(language, 'ជំហានទី ១៖', 'Step 1:', '第 1 步：')}
                  </b>{' '}
                  {tr(
                    language,
                    'បំពេញឈ្មោះហាង ប្រភេទហាង លេខទូរស័ព្ទ អាសយដ្ឋាន/ខេត្ត និងរូបភាពហាង។',
                    'Enter shop name, category, phone, address/province, and shop photo.',
                    '填写店铺名称、类别、电话、地址/省份及店铺照片。'
                  )}
                </div>
                <div>
                  <b className="text-emerald-800 dark:text-emerald-300">
                    {tr(language, 'ជំហានទី ២៖', 'Step 2:', '第 2 步：')}
                  </b>{' '}
                  {tr(
                    language,
                    'ចុចប៊ូតុង «📍 ជ្រើសរើសទីតាំងលើផែនទី Google Maps» ដើម្បីទាញយកកូអរដោនេ GPS និងលីងផែនទីដោយស្វ័យប្រវត្តិ។',
                    'Tap "Select Location on Google Maps" to auto-retrieve GPS coordinates & Maps link.',
                    '点击“在 Google 地图上选择位置”自动获取 GPS 坐标和地图链接。'
                  )}
                </div>
                <div>
                  <b className="text-emerald-800 dark:text-emerald-300">
                    {tr(language, 'ជំហានទី ៣៖', 'Step 3:', '第 3 步：')}
                  </b>{' '}
                  {tr(
                    language,
                    'ចុច «👁️ មើលជាមុន និងដាក់ស្នើហាង» ដើម្បីពិនិត្យម្ដងទៀត មុនបញ្ជូនទៅផ្ទៀងផ្ទាត់។',
                    'Tap "Preview & Submit" to review before sending for verification.',
                    '点击“预览并提交”核对信息后提交审核。'
                  )}
                </div>
              </div>
            </div>

            {/* Store Quota & Additional Shop Fee Notice */}
            {requiresAdditionalPayment ? (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {tr(
                        language,
                        `បន្ថែមហាងទី ${quota.nextStoreSlotNumber} (ហាងបន្ថែម)`,
                        `Adding Shop #${quota.nextStoreSlotNumber}`,
                        `添加第 ${quota.nextStoreSlotNumber} 家店铺`
                      )}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono font-black text-xs shrink-0">
                    +${quota.additionalStoreFeeUsd.toFixed(2)} USD
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('pay_additional_slot')}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>
                      {tr(
                        language,
                        `បង់ប្រាក់បន្ថែមហាង (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`,
                        `Pay Extra Shop Fee (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`,
                        `支付额外店铺费 (+${quota.additionalStoreFeeUsd.toFixed(2)} USD)`
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
            ) : null}

            {/* FIELD 1: Shop / Hotel Name */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div>
                <label className="block font-bold text-slate-900 dark:text-white mb-1">
                  {businessType === 'hotel'
                    ? tr(language, '១. ឈ្មោះសណ្ឋាគារ / ផ្ទះសំណាក់ (Hotel Name) *', '1. Hotel / Stay Name *', '1. 酒店/客栈名称 *')
                    : tr(language, '១. ឈ្មោះហាង (Shop Name) *', '1. Shop Name *', '1. 店铺名称 *')}
                </label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">
                  {tr(
                    language,
                    'វាយបញ្ចូលឈ្មោះជាភាសាខ្មែរ ឬអង់គ្លេសឱ្យបានច្បាស់លាស់។',
                    'Enter the name in Khmer or English.',
                    '请输入清晰的柬文或英文名称。'
                  )}
                </p>
                <input
                  type="text"
                  required
                  value={nameKh}
                  onChange={(e) => setNameKh(e.target.value)}
                  placeholder={
                    businessType === 'hotel'
                      ? tr(language, 'ឧ. សណ្ឋាគារ សុខា ឬ ផ្ទះសំណាក់ មេគង្គ', 'e.g. Sokha Hotel or Mekong Guesthouse', '例如：索卡酒店')
                      : tr(language, 'ឧ. ភោជនីយដ្ឋាន ម្លិះ ឬ ហាងកាហ្វេភ្នំពេញ', 'e.g. Malis Restaurant or Café', '例如：茉莉餐厅')
                  }
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
                  placeholder={businessType === 'hotel' ? 'e.g. Angkor Boutique Hotel' : 'e.g. Malis Restaurant'}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs focus:border-emerald-600 outline-none"
                />
              </div>

              {/* Live Duplicate Detection Alert & 1-Tap Select to Upgrade Existing Listing */}
              {detectedDuplicates.length > 0 && (
                <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 space-y-2 animate-fade-in">
                  <div className="font-extrabold text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>
                      {tr(
                        language,
                        'រកឃើញហាង/សណ្ឋាគារដែលមានក្នុងប្រព័ន្ធរួចហើយ! (Duplicate Detected)',
                        'Existing Shop / Hotel Detected in Database!',
                        '检测到系统中已存在相同店铺/酒店！'
                      )}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-snug">
                    {tr(
                      language,
                      'ដើម្បីបង្ការការបង្កើតស្ទួន សូមជ្រើសរើសហាង/សណ្ឋាគារដែលមានស្រាប់ខាងក្រោម ហើយដាក់ស្នើដំឡើង និងកែប្រែព័ត៌មាន (Upgrade Request)៖',
                      'To prevent duplicate listings, select the existing listing below and submit an upgrade request with your updated photos, description, and contact info:',
                      '为防止重复创建，请选择下方现有列表并提交升级与信息修改申请：'
                    )}
                  </p>
                  <div className="space-y-1.5">
                    {detectedDuplicates.slice(0, 3).map((dup) => (
                      <div
                        key={dup.id}
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {dup.photoUrl ? (
                            <img
                              src={dup.photoUrl}
                              alt={dup.nameKh}
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                              <DefaultShopIcon className="w-full h-full" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                              {dup.nameKh || dup.nameEn}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              📍 {dup.provinceKh} {dup.phone ? `• 📞 ${dup.phone}` : ''}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => beginUpgradeExistingStore(dup)}
                          className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black text-[10px] shrink-0 shadow-2xs cursor-pointer"
                        >
                          {tr(language, '⬆️ ជ្រើសរើស និងដំឡើង', '⬆️ Select & Upgrade', '⬆️ 选择并升级')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* FIELD 2: Category */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="block font-bold text-slate-900 dark:text-white">
                {businessType === 'hotel'
                  ? tr(language, '២. ប្រភេទកន្លែងស្នាក់នៅ (Hotel Category) *', '2. Accommodation Category *', '2. 住宿类别 *')
                  : tr(language, '២. ប្រភេទហាង (Shop Category) *', '2. Shop Category *', '2. 店铺类别 *')}
              </label>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {tr(
                  language,
                  'ជ្រើសរើសប្រភេទដើម្បីឱ្យភ្ញៀវងាយស្រួលស្វែងរកតាមផ្នែក។',
                  'Select your category so guests can easily find you.',
                  '选择类别，方便客人按分类查找。'
                )}
              </p>
              <select
                value={businessCategory}
                onChange={(e) => {
                  const nextCat = e.target.value;
                  setBusinessCategory(nextCat);
                  const found = activeCategoryList.find((c) => c.id === nextCat);
                  if (found) {
                    setSignatureDishesKh([found.defaultDishKh]);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:border-emerald-600 outline-none"
              >
                {activeCategoryList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {language === 'km' ? cat.labelKh : language === 'zh' ? cat.labelZh : cat.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {/* FIELD 3: Phone Number (លេខទូរស័ព្ទ) */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <label className="block font-bold text-slate-900 dark:text-white">
                <Phone className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                {tr(language, '៣. លេខទូរស័ព្ទហាង (Phone Number) *', '3. Phone Number *', '3. 联系电话 *')}
              </label>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {tr(
                  language,
                  'បញ្ចូលលេខទូរស័ព្ទសម្រាប់ភ្ញៀវទាក់ទងមកកាន់ហាងផ្ទាល់។',
                  'Enter contact phone number for customers.',
                  '输入供顾客联系的电话号码。'
                )}
              </p>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="012 345 678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:border-emerald-600 outline-none"
              />
            </div>

            {/* FIELD 4: Address / Province (អាសយដ្ឋាន / ខេត្ត-រាជធានី) */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div>
                <label className="block font-bold text-slate-900 dark:text-white mb-1">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                  {tr(language, '៤. ខេត្ត / រាជធានី និងអាសយដ្ឋាន (Address / Province) *', '4. Province & Address *', '4. 省份与详细地址 *')}
                </label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">
                  {tr(
                    language,
                    'ជ្រើសរើសខេត្ត/រាជធានី និងបញ្ចូលអាសយដ្ឋានហាង (ឬវានឹងបំពេញស្វ័យប្រវត្តិពេលអ្នករើសទីតាំងលើផែនទីខាងក្រោម)។',
                    'Select province and enter address (or auto-fill by selecting location on Google Maps below).',
                    '选择省份并输入地址（也可通过下方在 Google 地图上选择位置自动填充）。'
                  )}
                </p>
                <select
                  value={provinceKh}
                  onChange={(e) => {
                    const found = PROVINCES.find((p) => p.nameKh === e.target.value);
                    setProvinceKh(e.target.value);
                    if (found) setProvinceEn(found.nameEn);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:border-emerald-600 outline-none"
                >
                  {PROVINCES.map((p) => (
                    <option key={p.nameKh} value={p.nameKh}>
                      {isKm ? p.nameKh : p.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                  {tr(language, 'អាសយដ្ឋានហាង (ផ្លូវ ភូមិ សង្កាត់ ឬទីតាំងសម្គាល់)', 'Street / Sangkat / Landmark Address', '街道 / 分区 / 地标地址')}
                </label>
                <input
                  type="text"
                  value={addressKh}
                  onChange={(e) => setAddressKh(e.target.value)}
                  placeholder={tr(language, 'ឧ. ផ្លូវលេខ ៦៣ សង្កាត់បឹងកេងកង១ (ជិតផ្សារថ្មី)...', 'e.g. St. 63, Boeung Keng Kang 1...', '例如：63号路，万景岗1分区...')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-emerald-600 outline-none"
                />
              </div>
            </div>

            {/* FIELDS 5 & 6: Select Location on Google Maps + Google Maps Link + GPS Location */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/80 to-amber-50/60 dark:from-emerald-950/60 dark:via-slate-800 dark:to-slate-800 border-2 border-emerald-500/60 space-y-3">
              <div className="space-y-1">
                <div className="font-bold text-emerald-950 dark:text-emerald-200 text-xs flex items-center gap-1.5">
                  <span>📍</span>
                  <span>
                    {tr(
                      language,
                      '៥ & ៦. ជ្រើសរើសទីតាំងលើផែនទី Google Maps (GPS & លីងផែនទី)',
                      '5 & 6. Select Location on Google Maps (GPS & Maps Link)',
                      '5 & 6. 在 Google 地图上选择位置（GPS 与地图链接）'
                    )}
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {tr(
                    language,
                    'ចុចប៊ូតុងពណ៌បៃតងខាងក្រោម ដើម្បីបើកផែនទី Google Maps និងជ្រើសរើសទីតាំងហាងរបស់អ្នក។ ពេលជ្រើសរើសរួច ប្រព័ន្ធនឹងត្រឡប់មកវិញ ហើយបំពេញកូអរដោនេ GPS និងតំណភ្ជាប់ Google Maps ដោយស្វ័យប្រវត្តិ!',
                    'Tap the button below to open Google Maps and select your shop location. Returning will automatically fill in GPS coordinates and the Google Maps link!',
                    '点击下方按钮打开 Google 地图并选择店铺准确位置，返回后将自动填写 GPS 坐标和地图链接！'
                  )}
                </p>
              </div>

              {/* Prominent Select Location on Google Maps Button */}
              <button
                type="button"
                onClick={() => setIsCheckInPickerOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#064E3B] via-emerald-600 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md border border-emerald-300/40 transition active:scale-98 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  {tr(
                    language,
                    '📍 ជ្រើសរើសទីតាំងលើផែនទី Google Maps',
                    '📍 Select Location on Google Maps',
                    '📍 在 Google 地图上选择位置'
                  )}
                </span>
              </button>

              {/* Auto-filled / Editable GPS Location Field */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                  <Navigation className="w-3 h-3 inline mr-1 text-emerald-600" />
                  {tr(language, 'ទីតាំងកូអរដោនេ GPS (Latitude, Longitude)៖', 'GPS Location (Latitude, Longitude):', 'GPS 坐标（纬度, 经度）：')}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={
                      gpsInputText ||
                      (shopLat !== null && shopLng !== null ? `${shopLat.toFixed(6)}, ${shopLng.toFixed(6)}` : '')
                    }
                    onChange={(e) => handleGpsInputChange(e.target.value)}
                    placeholder={tr(
                      language,
                      'បំពេញស្វ័យប្រវត្តិពេលរើសលើផែនទី (ឧ. 11.556400, 104.928200)',
                      'Auto-filled from map (e.g. 11.556400, 104.928200)',
                      '从地图选择后自动填充（如 11.556400, 104.928200）'
                    )}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-emerald-300 font-mono text-xs focus:border-emerald-600 outline-none"
                  />
                </div>
                {shopLat !== null && shopLng !== null && (
                  <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {tr(
                        language,
                        `✅ បានភ្ជាប់កូអរដោនេ GPS រួចរាល់ (${shopLat.toFixed(5)}, ${shopLng.toFixed(5)})`,
                        `✅ GPS coordinates ready (${shopLat.toFixed(5)}, ${shopLng.toFixed(5)})`,
                        `✅ 已获取 GPS 坐标 (${shopLat.toFixed(5)}, ${shopLng.toFixed(5)})`
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Auto-filled / Editable Google Maps Link Field */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                  🗺️ {tr(language, 'តំណភ្ជាប់ផែនទី Google Maps (Google Maps Link)៖', 'Google Maps Link:', 'Google 地图链接：')}
                </label>
                <input
                  type="url"
                  value={shopMapUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setShopMapUrl(val);
                    const extracted = extractCoordsFromGoogleMapsUrl(val);
                    if (extracted) {
                      setShopLat(Number(extracted.latitude.toFixed(6)));
                      setShopLng(Number(extracted.longitude.toFixed(6)));
                      setGpsInputText(`${extracted.latitude.toFixed(6)}, ${extracted.longitude.toFixed(6)}`);
                    }
                  }}
                  placeholder="https://www.google.com/maps/search/?api=1&query=... ឬ https://maps.app.goo.gl/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:border-emerald-600 outline-none"
                />
                {shopMapUrl.trim() && (
                  <div
                    className={`text-[10px] font-bold flex items-center gap-1 ${
                      isValidGoogleMapsUrl(shopMapUrl)
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isValidGoogleMapsUrl(shopMapUrl) ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{tr(language, '✅ តំណភ្ជាប់ Google Maps ត្រឹមត្រូវ', '✅ Valid Google Maps link', '✅ 有效的 Google 地图链接')}</span>
                      </>
                    ) : (
                      <span>
                        {tr(
                          language,
                          '⚠️ សូមបញ្ចូលលីងពី Google Maps ឬចុចប៊ូតុងជ្រើសរើសទីតាំងខាងលើ',
                          '⚠️ Please enter a valid Google Maps URL or use the button above',
                          '⚠️ 请输入有效的 Google 地图链接或使用上方按钮'
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* FIELD 7: Shop Photos (រូបភាពហាង) */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-500 shrink-0 bg-slate-200 dark:bg-slate-700 shadow-xs">
                  {coverPhoto ? (
                    <img
                      src={coverPhoto}
                      alt="Shop Photo"
                      className="w-full h-full object-cover"
                      onError={() => setShopPhoto('')}
                    />
                  ) : (
                    <DefaultShopIcon className="w-full h-full" />
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] text-center py-0.5 font-bold">
                    {tr(language, 'រូបភាពហាង', 'Shop Photo', '店铺照片')}
                  </span>
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white text-xs">
                    {tr(language, '៧. រូបភាពហាង (Shop Photos)', '7. Shop Photos', '7. 店铺照片')}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    {tr(
                      language,
                      'ជ្រើសរើសរូបភាពមុខហាងពីទូរស័ព្ទ ឬថតរូបហាងផ្ទាល់ ដើម្បីបង្ហាញជូនអតិថិជន។',
                      'Select a storefront photo from your phone gallery or take a photo.',
                      '从手机相册选择门面照片或直接拍照上传。'
                    )}
                  </p>
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
                          ? tr(language, 'កំពុងពិនិត្យ...', 'Checking...', '审核中...')
                          : coverPhoto
                          ? tr(language, 'ប្តូររូបហាង', 'Change Photo', '更换照片')
                          : tr(language, 'រើសរូបពីទូរស័ព្ទ', 'Choose Photo', '相册选图')}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => cameraInputRef.current?.click()}
                      className="py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      <span>{tr(language, 'ថតរូបហាង', 'Take Photo', '拍摄店铺')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {moderationWarning && (
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-400 text-rose-800 dark:text-rose-200 text-[10px] font-bold">
                  {moderationWarning}
                </div>
              )}
            </div>

            {/* Optional Extra Info (Opening Hours & Description) */}
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

            {/* Preview & Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isSaving || isUploadingPhoto}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#064E3B] via-emerald-700 to-[#047857] hover:from-emerald-800 hover:to-emerald-700 disabled:opacity-60 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                <Eye className="w-5 h-5 text-amber-300 shrink-0" />
                <span>
                  {tr(
                    language,
                    '👁️ មើលជាមុន និងដាក់ស្នើហាង (Preview & Submit)',
                    '👁️ Preview & Submit Shop',
                    '👁️ 预览并提交店铺'
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
            setGpsInputText(`${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`);
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
                '✅ បានជ្រើសរើសទីតាំង និងបំពេញកូអរដោនេ GPS + លីង Google Maps ដោយស្វ័យប្រវត្តិ!',
                '✅ Location selected! Automatically filled GPS coordinates & Google Maps link!',
                '✅ 已选择位置！自动填充了 GPS 坐标和 Google 地图链接！'
              ),
              'success'
            );
          }}
        />
      </div>
    </div>
  );
};

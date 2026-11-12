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
  Search,
  Crosshair,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  TouristDestination,
  RestaurantPriceLevel,
  GoogleMapsPlaceMetadata,
  SHOP_ALL_INCLUSIVE_5_BENEFITS,
  getShopSubscriptionCatalog,
  isShopSubscriptionActive,
  isIosOrIpadAppStoreRuntime,
  isUserVipActive,
  getDynamicVipPlans,
  isAdminAccount,
  isValidCambodiaCoordinates,
  buildCanonicalGoogleMapsPinUrl,
  isValidGoogleMapsUrl,
  extractCoordsFromGoogleMapsUrl,
  inferBusinessTypeAndCategory,
  isHotelBusinessRecord,
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
import { getCurrentDeviceLocation } from '../services/restaurantCheckInService';
import { inferCambodiaProvinceFromAddressOrGps } from '../services/googlePlacesService';

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

// ----------------------------------------------------------------------------
// Search / validation helpers (pure functions, no hooks)
// ----------------------------------------------------------------------------

/** Lower-case, strip zero-width characters & normalize Unicode so Khmer and English search reliably. */
const normalizeSearchText = (s?: string | null): string =>
  String(s || '')
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
    .trim();

/** "ខេត្តកំពត" / "កំពត" / "Kampot" all normalize to a comparable province key. */
const stripProvincePrefix = (s?: string | null): string =>
  normalizeSearchText(s).replace(/^(ខេត្ត|រាជធានី)\s*/, '').replace(/\s+/g, '');

const findProvinceMatch = (kh?: string | null, en?: string | null) => {
  const khKey = stripProvincePrefix(kh);
  const enKey = normalizeSearchText(en).replace(/\s+/g, '');
  return (
    PROVINCES.find(
      (p) =>
        (khKey && stripProvincePrefix(p.nameKh) === khKey) ||
        (enKey && p.nameEn.toLowerCase().replace(/\s+/g, '') === enKey) ||
        (khKey && p.nameEn.toLowerCase().replace(/\s+/g, '') === khKey)
    ) || null
  );
};

/** Accepts Cambodian local (012 345 678), +855 and other international formats (8–13 digits). */
const isPlausiblePhoneNumber = (raw: string): boolean => {
  const digits = raw.replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 13;
};

const parseGpsText = (val: string): { lat: number; lng: number } | null => {
  const match = val.trim().match(/(-?\d+(?:\.\d+)?)\s*[,/\s]\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

/** Free reverse geocoding (ArcGIS → OpenStreetMap fallback). No paid Google API calls. */
const reverseGeocodeFreeAddress = async (lat: number, lng: number): Promise<string | null> => {
  const withTimeout = async (url: string, ms: number, init?: RequestInit) => {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { ...(init || {}), signal: controller.signal });
    } finally {
      clearTimeout(tId);
    }
  };
  try {
    const res = await withTimeout(
      `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=json&location=${lng},${lat}&langCode=km`,
      4000
    );
    if (res.ok) {
      const data = await res.json();
      const a = data?.address;
      if (a) {
        const parts = [a.Address, a.Neighborhood || a.District, a.City || a.Subregion, a.Region]
          .map((p: unknown) => String(p || '').trim())
          .filter(Boolean);
        const unique = Array.from(new Set(parts));
        if (unique.length > 0) return unique.join(', ');
      }
    }
  } catch {}
  try {
    const res = await withTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=km,en`,
      4500,
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      const a = data?.address || {};
      const parts = [
        a.road || a.pedestrian,
        a.suburb || a.quarter || a.village,
        a.city_district || a.county || a.town,
        a.city || a.state,
      ]
        .map((p: unknown) => String(p || '').trim())
        .filter(Boolean);
      const unique = Array.from(new Set(parts));
      if (unique.length > 0) return unique.join(', ');
    }
  } catch {}
  return null;
};

type ExistingListingOption = {
  id: string;
  source: 'restaurant' | 'destination';
  businessType: 'restaurant' | 'hotel';
  nameKh: string;
  nameEn: string;
  provinceKh: string;
  provinceEn: string;
  addressKh: string;
  phone: string;
  photoUrl: string;
  isPending: boolean;
  extraText?: string;
};

const classifyHotelCategoryFromText = (text: string): string => {
  const t = normalizeSearchText(text);
  if (/resort|រីសត/.test(t)) return 'resort';
  if (/villa|boutique|វីឡា|ប៊ូទិក/.test(t)) return 'boutique_villa';
  if (/guest\s*house|guesthouse|bungalow|hostel|ផ្ទះសំណាក់|បឹងហ្គាឡូ/.test(t)) return 'guesthouse';
  return 'hotel';
};

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
    destinations,
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
  // Seed hotel (from `destinations`) that a VIP owner is claiming/upgrading → saved as a VIP listing with the same id
  const [claimingDestinationId, setClaimingDestinationId] = useState<string | null>(null);
  // Inline validation: errors are shown only after the first submit attempt
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationNotice, setLocationNotice] = useState<{ type: 'error' | 'warning' | 'success'; text: string } | null>(null);
  const [showAdvancedLocation, setShowAdvancedLocation] = useState(false);

  const isIosAppStore = isIosOrIpadAppStoreRuntime();
  const shopCatalog = useMemo(() => getShopSubscriptionCatalog(appSettings), [appSettings]);
  const quota = getCurrentUserStoreQuota(currentUser);
  const ownedRestaurants = getOwnedRestaurantsForUser(currentUser);
  // Section B: Independent Shop Package — submitting a shop has ZERO Consumer VIP prerequisite and ZERO extra-slot lock!
  const requiresAdditionalPayment = false;

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

  const targetClaimingDestination = useMemo<TouristDestination | null>(
    () => (claimingDestinationId ? (destinations || []).find((d) => d.id === claimingDestinationId) || null : null),
    [claimingDestinationId, destinations]
  );

  // Seed hotels live in `destinations` (categorySlug === 'hotel'), not in `restaurants`
  const seedHotelDestinations = useMemo(() => {
    const restIds = new Set(restaurants.map((r) => r.id));
    return (destinations || []).filter((d) => d && d.categorySlug === 'hotel' && !restIds.has(d.id));
  }, [destinations, restaurants]);

  // Live duplicate detection when user is in 'add_new' mode
  const detectedDuplicates = useMemo(() => {
    if (formMode !== 'add_new' || replacingStoreId || upgradingExistingStoreId || claimingDestinationId) return [];
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
    claimingDestinationId,
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

  // Unified list of every existing shop/hotel (VIP/seed restaurants + seed hotels from `destinations`)
  const allExistingListingOptions = useMemo<ExistingListingOption[]>(() => {
    const fromRestaurants: ExistingListingOption[] = restaurants
      .filter((r) => r && r.status !== 'rejected')
      .map((r) => ({
        id: r.id,
        source: 'restaurant' as const,
        businessType: isHotelBusinessRecord(r) ? ('hotel' as const) : ('restaurant' as const),
        nameKh: r.nameKh || '',
        nameEn: r.nameEn || '',
        provinceKh: r.provinceKh || '',
        provinceEn: r.provinceEn || '',
        addressKh: r.addressKh || r.addressEn || '',
        phone: r.phone || '',
        photoUrl: r.profileImage || r.photoUrl || '',
        isPending: r.status === 'pending',
        extraText: Array.isArray(r.signatureDishesKh) ? r.signatureDishesKh.join(' ') : '',
      }));
    const fromDestinations: ExistingListingOption[] = seedHotelDestinations.map((d) => ({
      id: d.id,
      source: 'destination' as const,
      businessType: 'hotel' as const,
      nameKh: d.nameKh || '',
      nameEn: d.nameEn || '',
      provinceKh: d.provinceKh || '',
      provinceEn: d.provinceEn || '',
      addressKh: d.addressKh || d.addressEn || '',
      phone: d.phone || '',
      photoUrl: d.photoUrl || '',
      isPending: false,
    }));
    return [...fromRestaurants, ...fromDestinations];
  }, [restaurants, seedHotelDestinations]);

  // Searchable list for the 'upgrade_existing' selector.
  // - Token based (every word must match), Khmer/English/phone/address aware
  // - Province filter tolerant of "ខេត្តកំពត" vs "កំពត" vs "Kampot"
  // - Searches BOTH shops and hotels when a query is typed (current type ranked first)
  const searchableExistingListings = useMemo(() => {
    const q = normalizeSearchText(existingSearchQuery);
    const tokens = q.split(/\s+/).filter(Boolean);
    const provinceKey = existingProvinceFilter === 'ALL' ? '' : stripProvincePrefix(existingProvinceFilter);
    const provinceObj = existingProvinceFilter === 'ALL' ? null : findProvinceMatch(existingProvinceFilter);
    const provinceEnKey = provinceObj ? provinceObj.nameEn.toLowerCase().replace(/\s+/g, '') : '';

    const scored: Array<{ item: ExistingListingOption; score: number }> = [];
    for (const item of allExistingListingOptions) {
      if (!tokens.length && item.businessType !== businessType) continue;
      if (provinceKey) {
        const itemProvKh = stripProvincePrefix(item.provinceKh);
        const itemProvEn = normalizeSearchText(item.provinceEn).replace(/\s+/g, '');
        const addr = normalizeSearchText(item.addressKh);
        const provinceOk =
          itemProvKh === provinceKey ||
          (provinceEnKey && itemProvEn === provinceEnKey) ||
          (provinceEnKey && itemProvKh === provinceEnKey) ||
          addr.includes(provinceKey);
        if (!provinceOk) continue;
      }

      let score = item.businessType === businessType ? 50 : 0;
      if (tokens.length) {
        const nKh = normalizeSearchText(item.nameKh);
        const nEn = normalizeSearchText(item.nameEn);
        const haystack = `${nKh} ${nEn} ${normalizeSearchText(item.addressKh)} ${normalizeSearchText(item.provinceKh)} ${normalizeSearchText(item.provinceEn)} ${normalizeSearchText(item.extraText)}`;
        const phoneDigits = item.phone.replace(/[^\d]/g, '');
        const allMatch = tokens.every((t) => {
          if (haystack.includes(t)) return true;
          const tDigits = t.replace(/[^\d]/g, '');
          return tDigits.length >= 3 && phoneDigits.includes(tDigits);
        });
        if (!allMatch) continue;
        if (nKh.startsWith(q) || nEn.startsWith(q)) score += 30;
        else if (nKh.includes(q) || nEn.includes(q)) score += 20;
        else score += 5;
      }
      scored.push({ item, score });
    }
    scored.sort((a, b) => b.score - a.score || (a.item.nameEn || a.item.nameKh).localeCompare(b.item.nameEn || b.item.nameKh));
    return { total: scored.length, items: scored.slice(0, 40).map((s) => s.item) };
  }, [allExistingListingOptions, businessType, existingProvinceFilter, existingSearchQuery]);

  // Duplicate detection against seed hotels (which `findDuplicateOrExistingListings` does not cover)
  const detectedSeedHotelDuplicates = useMemo<ExistingListingOption[]>(() => {
    if (formMode !== 'add_new' || businessType !== 'hotel' || replacingStoreId || upgradingExistingStoreId || claimingDestinationId) return [];
    const nK = normalizeSearchText(nameKh);
    const nE = normalizeSearchText(nameEn);
    if (nK.length < 4 && nE.length < 4) return [];
    const phoneDigits = phone.replace(/[^\d]/g, '');
    return allExistingListingOptions
      .filter((o) => o.source === 'destination')
      .filter((o) => {
        const oK = normalizeSearchText(o.nameKh);
        const oE = normalizeSearchText(o.nameEn);
        const nameHit =
          (nK.length >= 4 && (oK.includes(nK) || oE.includes(nK))) ||
          (nE.length >= 4 && (oE.includes(nE) || oK.includes(nE)));
        const oPhone = o.phone.replace(/[^\d]/g, '');
        const phoneHit = phoneDigits.length >= 8 && oPhone.length >= 8 && oPhone.endsWith(phoneDigits.slice(-8));
        return nameHit || phoneHit;
      })
      .slice(0, 3);
  }, [formMode, businessType, replacingStoreId, upgradingExistingStoreId, claimingDestinationId, nameKh, nameEn, phone, allExistingListingOptions]);

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
    setClaimingDestinationId(null);
    setExistingSearchQuery('');
    setShowMoreOptions(false);
    setIsPreviewStep(false);
    setSubmitAttempted(false);
    setLocationNotice(null);
    setShowAdvancedLocation(false);
    setImportedGooglePlaceId(undefined);
    setImportedGoogleMeta(undefined);
    setWebsiteUrl('');
    setSignatureDishesKh([businessType === 'hotel' ? 'បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ និង Wi-Fi' : 'ម្ហូបខ្មែរប្រចាំហាង']);
  };

  const beginUpgradeExistingStore = (store: (typeof restaurants)[0]) => {
    const inferred = inferBusinessTypeAndCategory(store);
    const bType = inferred.businessType;
    setBusinessType(bType);
    setFormMode('upgrade_existing');
    setUpgradingExistingStoreId(store.id);
    setClaimingDestinationId(null);
    setSubmitAttempted(false);
    setLocationNotice(null);
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
    setOpeningHoursKh(store.openingHoursKh || (bType === 'hotel' ? 'បើកទទួលភ្ញៀវ ២៤ ម៉ោង' : '០៧:០០ ព្រឹក - ០៩:០០ យប់'));
    setPriceLevel(store.priceLevel || '$');
    setShopPhoto(store.profileImage || store.photoUrl || '');
    setModerationWarning(null);
    setDescriptionKh(store.descriptionKh || '');
    setImportedGooglePlaceId(store.googlePlaceId);
    setImportedGoogleMeta(store.googleMapsMeta);
    setBusinessCategory(inferred.businessCategory);
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
    const inferred = inferBusinessTypeAndCategory(store);
    const bType = inferred.businessType;
    setBusinessType(bType);
    setReplacingStoreId(store.id);
    setClaimingDestinationId(null);
    setUpgradingExistingStoreId(null);
    setSubmitAttempted(false);
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
    setOpeningHoursKh(store.openingHoursKh || (bType === 'hotel' ? 'បើកទទួលភ្ញៀវ ២៤ ម៉ោង' : '០៧:០០ ព្រឹក - ០៩:០០ យប់'));
    setShopPhoto(store.profileImage || store.photoUrl || '');
    setModerationWarning(null);
    setDescriptionKh(store.descriptionKh || '');
    setImportedGooglePlaceId(store.googlePlaceId);
    setImportedGoogleMeta(store.googleMapsMeta);
    setBusinessCategory(inferred.businessCategory);
    setWebsiteUrl(store.websiteUrl || store.googleMapsMeta?.websiteUri || '');
    setSignatureDishesKh(
      Array.isArray(store.signatureDishesKh) && store.signatureDishesKh.length > 0
        ? store.signatureDishesKh
        : [bType === 'hotel' ? 'បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ និង Wi-Fi' : 'ម្ហូបខ្មែរប្រចាំហាង']
    );
    setIsPreviewStep(false);
    setActiveTab('create_form');
  };

  // Claim / upgrade a seed hotel that exists only in `destinations` → submitted as VIP listing (same id) for Admin approval
  const beginClaimDestinationHotel = (dest: TouristDestination) => {
    setBusinessType('hotel');
    setFormMode('upgrade_existing');
    setClaimingDestinationId(dest.id);
    setUpgradingExistingStoreId(null);
    setReplacingStoreId(null);
    setSubmitAttempted(false);
    setLocationNotice(null);
    setNameKh(dest.nameKh || '');
    setNameEn(dest.nameEn || '');
    const prov = findProvinceMatch(dest.provinceKh, dest.provinceEn);
    setProvinceKh(prov?.nameKh || dest.provinceKh || 'រាជធានីភ្នំពេញ');
    setProvinceEn(prov?.nameEn || dest.provinceEn || 'Phnom Penh');
    setAddressKh(dest.addressKh || dest.addressEn || '');
    const latVal = typeof dest.latitude === 'number' && isValidCambodiaCoordinates(dest.latitude, dest.longitude) ? dest.latitude : null;
    const lngVal = latVal !== null ? dest.longitude : null;
    setShopLat(latVal);
    setShopLng(lngVal);
    setGpsInputText(latVal !== null && lngVal !== null ? `${latVal.toFixed(6)}, ${lngVal.toFixed(6)}` : '');
    setShopMapUrl(dest.mapUrl || '');
    setPhone(dest.phone || currentUser?.phone || '');
    setOpeningHoursKh(dest.bestTimeToVisitKh || 'បើកទទួលភ្ញៀវ ២៤ ម៉ោង');
    setShopPhoto(dest.photoUrl || '');
    setModerationWarning(null);
    setDescriptionKh(dest.descriptionKh || '');
    setImportedGooglePlaceId(undefined);
    setImportedGoogleMeta(undefined);
    setBusinessCategory(classifyHotelCategoryFromText(`${dest.nameEn} ${dest.nameKh} ${dest.categoryEn || ''}`));
    setWebsiteUrl('');
    setSignatureDishesKh(
      Array.isArray(dest.highlightsKh) && dest.highlightsKh.length > 0
        ? dest.highlightsKh.slice(0, 4)
        : ['បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ និង Wi-Fi']
    );
    setShowMoreOptions(true);
    setIsPreviewStep(false);
    setActiveTab('create_form');
  };

  const selectExistingOption = (opt: ExistingListingOption) => {
    if (opt.source === 'destination') {
      const dest = (destinations || []).find((d) => d.id === opt.id);
      if (dest) beginClaimDestinationHotel(dest);
      return;
    }
    const rest = restaurants.find((r) => r.id === opt.id);
    if (rest) beginUpgradeExistingStore(rest);
  };

  const clearUpgradeSelection = () => {
    setUpgradingExistingStoreId(null);
    setClaimingDestinationId(null);
    setFormMode('upgrade_existing');
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
    setClaimingDestinationId(null);
    setSubmitAttempted(false);
    setLocationNotice(null);
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
    const parsed = parseGpsText(val);
    if (parsed) {
      setShopLat(Number(parsed.lat.toFixed(6)));
      setShopLng(Number(parsed.lng.toFixed(6)));
      if (!shopMapUrl.trim()) {
        setShopMapUrl(`https://www.google.com/maps/search/?api=1&query=${parsed.lat.toFixed(6)},${parsed.lng.toFixed(6)}`);
      }
    } else if (!val.trim()) {
      setShopLat(null);
      setShopLng(null);
    }
  };

  const applyDetectedProvince = (provinceText: string) => {
    const match = findProvinceMatch(provinceText);
    if (match) {
      setProvinceKh(match.nameKh);
      setProvinceEn(match.nameEn);
    }
  };

  const clearLocation = () => {
    setShopLat(null);
    setShopLng(null);
    setGpsInputText('');
    setShopMapUrl('');
    setLocationNotice(null);
  };

  // 1-tap automatic location detection (device GPS → Google Maps pin link → province & address auto-fill, $0 cost)
  const handleDetectCurrentLocation = async () => {
    if (isDetectingLocation) return;
    setLocationNotice(null);
    setIsDetectingLocation(true);
    try {
      const gps = await getCurrentDeviceLocation(true);
      if (gps.errorMessage) {
        setLocationNotice({
          type: 'error',
          text: tr(
            language,
            '⚠️ មិនអាចទាញយកទីតាំង GPS បានទេ។ សូមបើកសិទ្ធិទីតាំង (Location) ក្នុងទូរស័ព្ទ ឬចុច «ជ្រើសលើផែនទី» ជំនួសវិញ។',
            '⚠️ Could not get your GPS location. Please allow Location permission, or tap "Pick on Map" instead.',
            '⚠️ 无法获取 GPS 位置。请允许定位权限，或点击“在地图上选择”。'
          ),
        });
        return;
      }
      const lat = Number(gps.latitude.toFixed(6));
      const lng = Number(gps.longitude.toFixed(6));
      if (!gps.isInsideCambodia || !isValidCambodiaCoordinates(lat, lng)) {
        setLocationNotice({
          type: 'error',
          text: tr(
            language,
            '⚠️ ទីតាំងបច្ចុប្បន្នរបស់អ្នកមិននៅក្នុងប្រទេសកម្ពុជាទេ។ សូមចុច «ជ្រើសលើផែនទី» ដើម្បីកំណត់ទីតាំងហាង។',
            '⚠️ Your current location is outside Cambodia. Please tap "Pick on Map" to set the listing location.',
            '⚠️ 您当前的位置不在柬埔寨境内。请点击“在地图上选择”设置位置。'
          ),
        });
        return;
      }

      setShopLat(lat);
      setShopLng(lng);
      setGpsInputText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setShopMapUrl(buildCanonicalGoogleMapsPinUrl(lat, lng, importedGooglePlaceId));
      applyDetectedProvince(inferCambodiaProvinceFromAddressOrGps('', lat, lng));

      if (!addressKh.trim()) {
        const addr = await reverseGeocodeFreeAddress(lat, lng);
        if (addr) {
          setAddressKh(addr);
          applyDetectedProvince(inferCambodiaProvinceFromAddressOrGps(addr, lat, lng));
        }
      }

      setLocationNotice(
        gps.isSufficientAccuracy
          ? {
              type: 'success',
              text: tr(
                language,
                `✅ បានកំណត់ទីតាំងដោយស្វ័យប្រវត្តិ (ភាពត្រឹមត្រូវ ±${Math.round(gps.accuracyMeters)}m)`,
                `✅ Location detected automatically (accuracy ±${Math.round(gps.accuracyMeters)}m)`,
                `✅ 已自动定位（精度 ±${Math.round(gps.accuracyMeters)} 米）`
              ),
            }
          : {
              type: 'warning',
              text: tr(
                language,
                `⚠️ ទីតាំងមិនសូវច្បាស់ (±${Math.round(gps.accuracyMeters)}m)។ សូមចុច «ជ្រើសលើផែនទី» ដើម្បីកែម្ជុលឱ្យចំហាង។`,
                `⚠️ Low GPS accuracy (±${Math.round(gps.accuracyMeters)}m). Tap "Pick on Map" to fine-tune the pin.`,
                `⚠️ GPS 精度较低（±${Math.round(gps.accuracyMeters)} 米）。请点击“在地图上选择”微调位置。`
              ),
            }
      );
    } catch {
      setLocationNotice({
        type: 'error',
        text: tr(
          language,
          '⚠️ មិនអាចទាញយកទីតាំងបានទេ។ សូមព្យាយាមម្តងទៀត ឬជ្រើសលើផែនទី។',
          '⚠️ Could not detect location. Please try again or pick on the map.',
          '⚠️ 无法获取位置，请重试或在地图上选择。'
        ),
      });
    } finally {
      setIsDetectingLocation(false);
    }
  };

  /** Returns field → message for every invalid field (empty object = valid). */
  const validateForm = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const nK = nameKh.trim();
    const nE = nameEn.trim();
    if (!nK && !nE) {
      errs.name =
        businessType === 'hotel'
          ? tr(language, 'សូមបញ្ចូលឈ្មោះសណ្ឋាគារ / ផ្ទះសំណាក់', 'Please enter the hotel / stay name', '请输入酒店/客栈名称')
          : tr(language, 'សូមបញ្ចូលឈ្មោះហាង', 'Please enter the shop name', '请输入店铺名称');
    } else if (Math.max(nK.length, nE.length) < 2) {
      errs.name = tr(language, 'ឈ្មោះខ្លីពេក (យ៉ាងតិច ២ តួអក្សរ)', 'Name is too short (at least 2 characters)', '名称太短（至少 2 个字符）');
    }

    const ph = phone.trim();
    if (!ph) {
      errs.phone = tr(language, 'សូមបញ្ចូលលេខទូរស័ព្ទទំនាក់ទំនង', 'Please enter a contact phone number', '请输入联系电话');
    } else if (!isPlausiblePhoneNumber(ph)) {
      errs.phone = tr(
        language,
        'លេខទូរស័ព្ទមិនត្រឹមត្រូវ (ឧ. 012 345 678 ឬ +855 12 345 678)',
        'Invalid phone number (e.g. 012 345 678 or +855 12 345 678)',
        '电话号码无效（例如 012 345 678 或 +855 12 345 678）'
      );
    }

    const mapUrl = shopMapUrl.trim();
    if (mapUrl && !isValidGoogleMapsUrl(mapUrl)) {
      errs.location = tr(
        language,
        'តំណភ្ជាប់ Google Maps មិនត្រឹមត្រូវ។ សូមចុច «ជ្រើសលើផែនទី» ជំនួសវិញ។',
        'Invalid Google Maps link. Please tap "Pick on Map" instead.',
        'Google 地图链接无效，请点击“在地图上选择”。'
      );
    } else if (gpsInputText.trim()) {
      const parsed = parseGpsText(gpsInputText);
      if (!parsed) {
        errs.location = tr(
          language,
          'ទម្រង់ GPS មិនត្រឹមត្រូវ (ឧ. 11.556400, 104.928200)',
          'Invalid GPS format (e.g. 11.556400, 104.928200)',
          'GPS 格式无效（例如 11.556400, 104.928200）'
        );
      } else if (!isValidCambodiaCoordinates(parsed.lat, parsed.lng)) {
        errs.location = tr(
          language,
          'កូអរដោនេ GPS ត្រូវតែនៅក្នុងប្រទេសកម្ពុជា',
          'GPS coordinates must be inside Cambodia',
          'GPS 坐标必须位于柬埔寨境内'
        );
      }
    }
    return errs;
  };

  // Validate form and open Preview screen before submitting
  const handleProceedToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const errs = validateForm();
    const errKeys = Object.keys(errs);
    if (errKeys.length > 0) {
      const firstKey = ['name', 'phone', 'location'].find((k) => errs[k]) || errKeys[0];
      showToast(`⚠️ ${errs[firstKey]}`, 'warning');
      if (firstKey === 'location') setShowAdvancedLocation(true);
      setTimeout(() => {
        const el = document.getElementById(`kft-addshop-field-${firstKey}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const input = el.querySelector('input, select, textarea') as HTMLElement | null;
          input?.focus({ preventScroll: true });
        }
      }, 60);
      return;
    }
    const trimmedNameKh = nameKh.trim();
    const trimmedNameEn = nameEn.trim();

    // Exact-name match against a seed hotel → ask the owner to claim/upgrade it instead of creating a duplicate
    const exactSeedHotel = detectedSeedHotelDuplicates.find((d) => {
      const a = normalizeSearchText(trimmedNameKh);
      const b = normalizeSearchText(trimmedNameEn);
      return (
        (a.length >= 3 && (normalizeSearchText(d.nameKh) === a || normalizeSearchText(d.nameEn) === a)) ||
        (b.length >= 3 && (normalizeSearchText(d.nameEn) === b || normalizeSearchText(d.nameKh) === b))
      );
    });
    if (exactSeedHotel) {
      showToast(
        tr(
          language,
          `⚠️ «${exactSeedHotel.nameKh || exactSeedHotel.nameEn}» មានក្នុងប្រព័ន្ធរួចហើយ! សូមចុច «ជ្រើសរើស និងដំឡើង» ខាងក្រោមជំនួសការបង្កើតស្ទួន។`,
          `⚠️ "${exactSeedHotel.nameEn || exactSeedHotel.nameKh}" already exists! Please tap "Select & Upgrade" below instead of creating a duplicate.`,
          `⚠️ “${exactSeedHotel.nameEn || exactSeedHotel.nameKh}” 已存在！请点击下方“选择并升级”，避免重复创建。`
        ),
        'warning'
      );
      document.getElementById('kft-addshop-field-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    // Section B: Any signed-in user can submit 1 or multiple shops; each shop activates its own Shop Package after Admin approval.

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
        phone: phone.trim() || currentUser?.phone || '',
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
        : claimingDestinationId
          ? addRestaurant({ ...newRestData, id: claimingDestinationId })
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
  const isHotel = businessType === 'hotel';
  const isSelectingExisting = formMode === 'upgrade_existing' && !upgradingExistingStoreId && !claimingDestinationId;
  const errors: Record<string, string> = submitAttempted ? validateForm() : {};
  const hasName = Boolean(nameKh.trim() || nameEn.trim());
  const hasPhone = isPlausiblePhoneNumber(phone);
  const hasLocation = shopLat !== null && shopLng !== null;
  const hasPhoto = Boolean(coverPhoto);
  const completedCount = [hasName, hasPhone, hasLocation, hasPhoto].filter(Boolean).length;
  const activeUpgradeName = targetUpgradingExistingStore
    ? targetUpgradingExistingStore.nameKh || targetUpgradingExistingStore.nameEn
    : targetClaimingDestination
      ? targetClaimingDestination.nameKh || targetClaimingDestination.nameEn
      : '';
  const inputClass = (hasErr: boolean) =>
    `w-full px-3.5 py-3 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none transition ${
      hasErr
        ? 'border-rose-500 ring-2 ring-rose-500/20'
        : 'border-slate-300 dark:border-slate-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
    }`;
  const renderFieldError = (key: string) =>
    errors[key] ? (
      <p role="alert" className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-start gap-1">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
        <span>{errors[key]}</span>
      </p>
    ) : null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in overflow-y-auto"
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
        <div className="kft-khmer-modal-header px-4 sm:px-5 pt-3 pb-3.5 text-white flex items-center justify-between shrink-0">
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
                  : activeUpgradeName || isSelectingExisting
                  ? tr(language, '⬆️ កែប្រែហាង / សណ្ឋាគារដែលមានស្រាប់', '⬆️ Update Existing Listing', '⬆️ 更新现有列表')
                  : businessType === 'hotel'
                  ? tr(language, '🏨 បន្ថែមសណ្ឋាគារ / ផ្ទះសំណាក់ថ្មី', '🏨 Add New Hotel / Stay', '🏨 添加新酒店/客栈')
                  : tr(language, '➕ បន្ថែមហាងថ្មី', '➕ Add New Shop', '➕ 添加新店铺')}
              </h3>
              <p className="text-[11px] text-emerald-100 font-khmer truncate">
                {isPreviewStep
                  ? tr(
                      language,
                      'ពិនិត្យព័ត៌មានម្តងទៀតមុនពេលដាក់ស្នើ',
                      'Check your details once more before submitting',
                      '提交前再次检查信息'
                    )
                  : isSelectingExisting
                  ? tr(language, 'ស្វែងរក ហើយចុចជ្រើសរើសរបស់អ្នក', 'Search, then tap your listing', '搜索并点击您的列表')
                  : tr(
                      language,
                      'បំពេញព័ត៌មាន ៣ ផ្នែកខ្លីៗ រួចដាក់ស្នើ',
                      'Fill in 3 short sections, then submit',
                      '填写 3 个简短部分后提交'
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
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold text-xs border border-emerald-300 dark:border-emerald-700">
                  {isKm ? inferBusinessTypeAndCategory(submittedPendingShop).labelKh : inferBusinessTypeAndCategory(submittedPendingShop).labelEn}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 font-bold text-xs border border-amber-300 dark:border-amber-700">
                  ⏳ {tr(language, 'រង់ចាំការត្រួតពិនិត្យ និងអនុម័តពី Admin', 'Pending Admin Review & Approval', '等待管理员审核与批准')}
                </span>
              </div>
              <h4 className="font-moul text-base text-slate-900 dark:text-white pt-1">
                {isHotelBusinessRecord(submittedPendingShop)
                  ? tr(
                      language,
                      '✅ បានទទួលសំណើសណ្ឋាគារ / កន្លែងស្នាក់នៅរបស់អ្នកជោគជ័យ!',
                      '✅ Hotel / Accommodation Submission Received!',
                      '✅ 您的酒店/住宿申请已成功提交！'
                    )
                  : tr(
                      language,
                      '✅ បានទទួលសំណើបន្ថែមហាងរបស់អ្នកជោគជ័យ!',
                      '✅ Shop Submission Received!',
                      '✅ 您的店铺申请已成功提交！'
                    )}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {isHotelBusinessRecord(submittedPendingShop)
                  ? tr(
                      language,
                      `សណ្ឋាគារ «${submittedPendingShop.nameKh || submittedPendingShop.nameEn}» ត្រូវបានបញ្ជូនទៅកាន់ផ្នែក «សណ្ឋាគារ» របស់ Admin ដើម្បីត្រួតពិនិត្យ។ បន្ទាប់ពីអនុម័តរួចរាល់ នឹងបង្ហាញក្នុងផ្នែកសណ្ឋាគារជាផ្លូវការ!`,
                      `Your hotel "${submittedPendingShop.nameEn || submittedPendingShop.nameKh}" has been sent to the Admin Hotels queue for verification.`,
                      `您的酒店“${submittedPendingShop.nameEn || submittedPendingShop.nameKh}”已提交管理员酒店审核队列！`
                    )
                  : tr(
                      language,
                      `ហាង «${submittedPendingShop.nameKh || submittedPendingShop.nameEn}» ត្រូវបានបញ្ជូនទៅកាន់រដ្ឋបាល (Admin) ដើម្បីត្រួតពិនិត្យ និងផ្ទៀងផ្ទាត់ទីតាំង។ បន្ទាប់ពីផ្ទៀងផ្ទាត់រួចរាល់ ហាងរបស់អ្នកនឹងបង្ហាញជាផ្លូវការ!`,
                      `Your shop "${submittedPendingShop.nameEn || submittedPendingShop.nameKh}" has been sent for verification.`,
                      `您的店铺“${submittedPendingShop.nameEn || submittedPendingShop.nameKh}”已提交管理员核验！`
                    )}
              </p>
            </div>
            {!isIosAppStore && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-left text-[11px] text-slate-700 dark:text-slate-200 space-y-1">
                <div className="font-extrabold text-amber-900 dark:text-amber-200">
                  {tr(language, '💡 ជំហានបន្ទាប់ (បង់ប្រាក់បើកកញ្ចប់ហាងក្រោយ Admin អនុម័ត)៖', '💡 Next Step (Activate Paid Shop Package After Approval):', '💡 下一步（管理员批准后付款开通店铺套餐）：')}
                </div>
                <p>
                  {appSettings.shopPayAfterApproval !== false
                    ? tr(
                        language,
                        `ក្រោយពេល Admin ត្រួតពិនិត្យ និងអនុម័តរួច អ្នកអាចបើកកញ្ចប់ហាង ($${shopCatalog.monthlyPlan.priceUsd.toFixed(2)}/30ថ្ងៃ ឬ $${(shopCatalog.earlyBirdRemaining > 0 && shopCatalog.earlyBirdPlan.enabled ? shopCatalog.earlyBirdPlan.priceUsd : shopCatalog.yearlyPlan.priceUsd).toFixed(2)}/ឆ្នាំ) ដើម្បីទទួលបានគ្រប់មុខងារទាំង ៥!`,
                        `Once Admin approves your listing, you can activate the All-Inclusive Shop Package ($${shopCatalog.monthlyPlan.priceUsd.toFixed(2)}/30d or $${(shopCatalog.earlyBirdRemaining > 0 && shopCatalog.earlyBirdPlan.enabled ? shopCatalog.earlyBirdPlan.priceUsd : shopCatalog.yearlyPlan.priceUsd).toFixed(2)}/yr) for all 5 benefits!`,
                        `管理员批准后，即可开通全包店铺套餐（$${shopCatalog.monthlyPlan.priceUsd.toFixed(2)}/30天 或 $${(shopCatalog.earlyBirdRemaining > 0 && shopCatalog.earlyBirdPlan.enabled ? shopCatalog.earlyBirdPlan.priceUsd : shopCatalog.yearlyPlan.priceUsd).toFixed(2)}/年）解锁全部 5 项权益！`
                      )
                    : tr(
                        language,
                        'អ្នកអាចចូលទៅបើកកញ្ចប់ហាង VIP ឥឡូវនេះ ឬរង់ចាំ Admin អនុម័តជាមុនក៏បាន។',
                        'You can activate your VIP Shop Package now or after Admin approval.',
                        '您可立即开通店铺 VIP 套餐，或等待管理员批准后开通。'
                      )}
                </p>
              </div>
            )}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  const shop = submittedPendingShop;
                  setSubmittedPendingShop(null);
                  setIsVipAddRestaurantModalOpen(false);
                  (window as any).__kft_manage_initial_tab = !isIosAppStore && appSettings.shopPayAfterApproval === false ? 'membership' : 'info';
                  setManagingRestaurant(shop);
                  setIsManageMenuModalOpen(true);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-[#064E3B] hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                {isHotelBusinessRecord(submittedPendingShop)
                  ? tr(language, '🏨 ពិនិត្យ និងគ្រប់គ្រងសណ្ឋាគារឥឡូវនេះ', '🏨 Manage Hotel Info & Menu Now', '🏨 立即管理酒店信息')
                  : tr(language, '🏪 ពិនិត្យព័ត៌មានហាង & ម៉ឺនុយម្ហូបឥឡូវនេះ', '🏪 Manage Shop Info & Menu Now', '🏪 立即管理店铺与菜单')}
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
                      loading="lazy"
                      decoding="async"
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-emerald-500/40"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-emerald-500/40">
                      <DefaultShopIcon className="w-full h-full" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold">
                        #{idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                        {isKm ? inferBusinessTypeAndCategory(store).labelKh : inferBusinessTypeAndCategory(store).labelEn}
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
                        ? tr(language, '⏳ រង់ចាំ Admin អនុម័ត', '⏳ Pending Admin Review', '⏳ 等待管理员审核')
                        : isShopSubscriptionActive(store)
                        ? tr(language, '👑 កញ្ចប់ហាង VIP សកម្ម', '👑 VIP Shop Active', '👑 店铺 VIP 已激活')
                        : store.shopPaymentStatus === 'pending_verification'
                        ? tr(language, '⏳ រង់ចាំផ្ទៀងផ្ទាត់ការបង់ប្រាក់', '⏳ Payment Under Review', '⏳ 付款审核中')
                        : tr(language, '✅ បានអនុម័ត • អាចបើកកញ្ចប់ហាង', '✅ Approved • Ready for Shop Package', '✅ 已批准 • 可开通套餐')}
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
              <span>{tr(language, '+ បន្ថែមហាងថ្មីមួយទៀត', '+ Add Another Shop', '+ 再添加一家新店铺')}</span>
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
                  `ការដាក់ហាង និងមុខងារ VIP ទាំង ៥ តម្រូវឱ្យបើកកញ្ចប់ហាងបង់ប្រាក់ (មិនរួមបញ្ចូលក្នុង Free Trial 7 ថ្ងៃទេ)។ រាល់ការបន្ថែមហាងបន្ទាប់ តម្រូវឱ្យបង់ប្រាក់បន្ថែម ${quota.additionalStoreFeeUsd.toFixed(2)} USD ក្នុង ១ ហាង។`,
                  `Shop listing & all 5 VIP store benefits require the Paid Shop Package (not included in the 7-Day Free Trial). Each additional shop slot requires ${quota.additionalStoreFeeUsd.toFixed(2)} USD.`,
                  `上架店铺及 5 项 VIP 权益需开通付费店铺套餐（不含在 7 天免费试用内）。每增加一家额外店铺需支付 ${quota.additionalStoreFeeUsd.toFixed(2)} USD。`
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
                    const res = await savePngDataUrlToGallery('/images/aba_khqr_official_savuth.png', 'ABA-KHQR-CHEA-SAVUTH-000056833.png');
                    showToast(
                      res.duplicate
                        ? tr(language, '✅ រូបភាព ABA QR ច្បាប់ដើមមាននៅក្នុង រូបភាពរបស់ខ្ញុំ រួចហើយ!', '✅ Original ABA QR image is already in My Photos!', '✅ 原始 ABA 二维码图片已在我的照片中！')
                        : tr(language, '✅ បានរក្សាទុករូបភាព ABA QR ច្បាប់ដើមទៅក្នុង រូបភាពរបស់ខ្ញុំ រួចរាល់!', '✅ Saved original ABA QR image to My Photos!', '✅ 原始 ABA 二维码已保存到我的照片！'),
                      'success'
                    );
                  } catch {}
                }}
                className="w-60 sm:w-68 max-w-full mx-auto rounded-2xl overflow-hidden border-2 border-amber-400 shadow-sm bg-white cursor-pointer active:scale-[0.985] transition block p-0"
              >
                <img loading="lazy" decoding="async"
                  src="/images/aba_khqr_official_savuth.png"
                  alt="ABA KHQR — CHEA SAVUTH"
                  className="w-full h-auto object-contain block bg-white"
                />
              </button>
              <div className="space-y-1">
                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  CHEA SAVUTH (USD: 000 056 833 • KHR: 003 787 096)
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
                  : tr(language, '📸 ជ្រើសរូបវិក្កយបត្រ ABA ពី រូបភាពរបស់ខ្ញុំ', '📸 My Photos (ABA Receipt)', '📸 我的照片 (ABA 付款收据)')}
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
                  <img src={coverPhoto} alt={nameKh || nameEn} loading="lazy" decoding="async" className="w-full h-full object-cover" />
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

            {(!hasLocation || !hasPhoto) && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-400 space-y-1 text-[11px] text-amber-900 dark:text-amber-200">
                {!hasLocation && (
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span>
                      {tr(
                        language,
                        'មិនទាន់មានទីតាំងលើផែនទី — Admin នឹងត្រូវផ្ទៀងផ្ទាត់ទីតាំងមុនអនុម័ត (អាចយឺតជាង)។',
                        'No map location yet — Admin must verify the location before approval (may take longer).',
                        '尚未设置地图位置——管理员需先核实位置（审核可能较慢）。'
                      )}
                    </span>
                  </div>
                )}
                {!hasPhoto && (
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span>
                      {tr(
                        language,
                        'មិនទាន់មានរូបភាព — អ្នកអាចបន្ថែមពេលក្រោយក្នុង «គ្រប់គ្រងហាង»។',
                        'No photo yet — you can add one later from "Manage Shop".',
                        '尚未添加照片——稍后可在“管理店铺”中添加。'
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons: Edit vs Confirm & Submit */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 sticky bottom-0 -mx-4 px-4 py-2.5 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800">
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
             REDESIGNED ADD / UPGRADE SHOP & HOTEL FORM
             (Mode → Type → Basic Info → Location → Photo → Optional details, sticky submit bar)
             ============================================================================ */
          <form
            onSubmit={handleProceedToPreview}
            noValidate
            className="flex-1 min-h-0 flex flex-col font-khmer text-xs"
          >
            <div className="p-4 space-y-3 overflow-y-auto flex-1 overscroll-contain">
              {/* Mode Switcher: Add New vs Existing Listing */}
              <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setFormMode('add_new');
                    setUpgradingExistingStoreId(null);
                    setClaimingDestinationId(null);
                    setSubmitAttempted(false);
                  }}
                  className={`min-h-[44px] py-2 px-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    formMode === 'add_new' && !upgradingExistingStoreId && !claimingDestinationId
                      ? 'bg-[#064E3B] text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span>{tr(language, 'បន្ថែមថ្មី', 'Add New', '添加新列表')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormMode('upgrade_existing');
                    setReplacingStoreId(null);
                    setSubmitAttempted(false);
                  }}
                  className={`min-h-[44px] py-2 px-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    formMode === 'upgrade_existing' || Boolean(upgradingExistingStoreId) || Boolean(claimingDestinationId)
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span>{tr(language, 'មានក្នុងកម្មវិធីរួចហើយ', 'Already Listed', '已有列表')}</span>
                </button>
              </div>

              {/* Business Type Switcher: Shop / Restaurant vs Hotel / Stay */}
              {!upgradingExistingStoreId && !claimingDestinationId && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBusinessType('restaurant');
                      setBusinessCategory('restaurant');
                      setSignatureDishesKh(['ម្ហូបខ្មែរប្រចាំហាង']);
                    }}
                    className={`min-h-[44px] py-2 px-3 rounded-xl border-2 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      !isHotel
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>🍽️</span>
                    <span>{tr(language, 'ហាងអាហារ / កាហ្វេ', 'Shop / Restaurant', '餐饮店铺')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBusinessType('hotel');
                      setBusinessCategory('hotel');
                      setSignatureDishesKh(['បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ និង Wi-Fi']);
                    }}
                    className={`min-h-[44px] py-2 px-3 rounded-xl border-2 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      isHotel
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>🏨</span>
                    <span>{tr(language, 'សណ្ឋាគារ / ផ្ទះសំណាក់', 'Hotel / Stay', '酒店 / 住宿')}</span>
                  </button>
                </div>
              )}

              {isSelectingExisting ? (
                /* ---------------- EXISTING LISTING FINDER ---------------- */
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-slate-800/90 border border-amber-400/70 space-y-1">
                    <div className="font-extrabold text-amber-950 dark:text-amber-200 text-xs flex items-center gap-1.5">
                      <Search className="w-4 h-4 shrink-0" />
                      <span>
                        {tr(
                          language,
                          'ស្វែងរកហាង ឬសណ្ឋាគាររបស់អ្នក',
                          'Find your shop or hotel',
                          '查找您的店铺或酒店'
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {tr(
                        language,
                        'វាយឈ្មោះ (ខ្មែរ ឬអង់គ្លេស) លេខទូរស័ព្ទ ឬអាសយដ្ឋាន រួចចុចលើលទ្ធផលដើម្បីកែប្រែរូបភាព ព័ត៌មាន និងទីតាំង។ ការកែប្រែត្រូវរង់ចាំ Admin អនុម័ត។',
                        'Type a name (Khmer or English), phone, or address, then tap a result to update its photo, details and location. Changes are reviewed by Admin.',
                        '输入名称（柬文或英文）、电话或地址，点击结果即可更新照片、信息和位置。修改需管理员审核。'
                      )}
                    </p>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="search"
                      autoFocus
                      enterKeyHint="search"
                      value={existingSearchQuery}
                      onChange={(e) => setExistingSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                      placeholder={tr(
                        language,
                        'ឧ. Diamond, សុខា, 012 345 678...',
                        'e.g. Diamond, Sokha, 012 345 678...',
                        '例如：Diamond、Sokha、012 345 678...'
                      )}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                    {existingSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setExistingSearchQuery('')}
                        aria-label={tr(language, 'សម្អាត', 'Clear', '清除')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <select
                    value={existingProvinceFilter}
                    onChange={(e) => setExistingProvinceFilter(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none"
                  >
                    <option value="ALL">
                      {tr(language, '📍 គ្រប់រាជធានី-ខេត្តទាំង ២៥', '📍 All 25 Provinces', '📍 全部 25 个省市')}
                    </option>
                    {PROVINCES.map((p) => (
                      <option key={p.nameKh} value={p.nameKh}>
                        {isKm ? p.nameKh : p.nameEn}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5">
                    <span>
                      {existingSearchQuery.trim()
                        ? tr(
                            language,
                            `រកឃើញ ${searchableExistingListings.total} លទ្ធផល`,
                            `${searchableExistingListings.total} result(s) found`,
                            `找到 ${searchableExistingListings.total} 个结果`
                          )
                        : isHotel
                        ? tr(language, 'សណ្ឋាគារដែលមានក្នុងប្រព័ន្ធ', 'Hotels already in the app', '应用中已有的酒店')
                        : tr(language, 'ហាងដែលមានក្នុងប្រព័ន្ធ', 'Shops already in the app', '应用中已有的店铺')}
                    </span>
                    {existingProvinceFilter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setExistingProvinceFilter('ALL')}
                        className="font-bold text-amber-700 dark:text-amber-300 underline cursor-pointer"
                      >
                        {tr(language, 'បង្ហាញគ្រប់ខេត្ត', 'Show all provinces', '显示所有省份')}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {searchableExistingListings.items.length === 0 ? (
                      <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                        <div className="text-2xl">🔎</div>
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                          {tr(
                            language,
                            'រកមិនឃើញហាង/សណ្ឋាគារដែលត្រូវគ្នាទេ',
                            'No matching shop or hotel found',
                            '未找到匹配的店铺或酒店'
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {tr(
                            language,
                            'សាកល្បងវាយពាក្យខ្លីជាងនេះ (ឧ. ពាក្យតែមួយ) ឬជ្រើស «គ្រប់ខេត្ត»។',
                            'Try a shorter keyword (e.g. a single word) or choose "All Provinces".',
                            '请尝试更短的关键词（如单个词）或选择“全部省市”。'
                          )}
                        </p>
                      </div>
                    ) : (
                      searchableExistingListings.items.map((item) => (
                        <button
                          type="button"
                          key={`${item.source}-${item.id}`}
                          onClick={() => selectExistingOption(item)}
                          className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 hover:border-amber-400 active:scale-[0.99] transition cursor-pointer"
                        >
                          {item.photoUrl ? (
                            <img decoding="async"
                              src={item.photoUrl}
                              alt={item.nameKh || item.nameEn}
                              loading="lazy"
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
                            {item.nameEn && item.nameKh && item.nameEn !== item.nameKh && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{item.nameEn}</div>
                            )}
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                              {item.businessType === 'hotel' ? '🏨' : '🍽️'} 📍 {isKm ? item.provinceKh : item.provinceEn || item.provinceKh}
                              {item.phone ? ` • 📞 ${item.phone}` : ''}
                            </div>
                            {item.isPending && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-[9px] font-bold">
                                ⏳ {tr(language, 'រង់ចាំ Admin', 'Pending review', '待审核')}
                              </span>
                            )}
                          </div>
                          <span className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-black text-[11px] shrink-0 shadow-2xs">
                            {tr(language, 'ជ្រើសរើស', 'Select', '选择')}
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const q = existingSearchQuery.trim();
                      setFormMode('add_new');
                      setUpgradingExistingStoreId(null);
                      setClaimingDestinationId(null);
                      if (q && !nameKh.trim() && !/^[\d\s+\-()]+$/.test(q)) setNameKh(q);
                      if (existingProvinceFilter !== 'ALL') {
                        const p = findProvinceMatch(existingProvinceFilter);
                        if (p) {
                          setProvinceKh(p.nameKh);
                          setProvinceEn(p.nameEn);
                        }
                      }
                    }}
                    className="w-full min-h-[44px] py-3 px-3 rounded-2xl bg-[#064E3B] hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {isHotel
                        ? tr(language, 'រកមិនឃើញ? បន្ថែមសណ្ឋាគារថ្មី', "Can't find it? Add a new hotel", '找不到？添加新酒店')
                        : tr(language, 'រកមិនឃើញ? បន្ថែមហាងថ្មី', "Can't find it? Add a new shop", '找不到？添加新店铺')}
                    </span>
                  </button>
                </div>
              ) : (
                /* ---------------- ADD / UPDATE FORM ---------------- */
                <>
                  {/* Active Existing Listing Upgrade Banner */}
                  {activeUpgradeName && (
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300">
                            ⬆️ {tr(language, 'កំពុងកែប្រែព័ត៌មានដែលមានស្រាប់', 'Updating existing listing', '正在更新现有列表')}
                          </div>
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">{activeUpgradeName}</div>
                        </div>
                        <button
                          type="button"
                          onClick={clearUpgradeSelection}
                          className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-400 text-amber-800 dark:text-amber-200 font-bold text-[11px] shrink-0 cursor-pointer"
                        >
                          {tr(language, '🔄 ប្តូរ', '🔄 Change', '🔄 更换')}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug">
                        {tr(
                          language,
                          'ពិនិត្យ និងកែប្រែព័ត៌មានខាងក្រោម។ ការកែប្រែនឹងត្រូវ Admin អនុម័តមុនពេលបង្ហាញជាសាធារណៈ។',
                          'Review and update the details below. Changes are published after Admin approval.',
                          '请检查并更新以下信息。修改经管理员批准后发布。'
                        )}
                      </p>
                    </div>
                  )}

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
                          className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
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
                            className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>{tr(language, 'ប្តូរហាងចាស់ ($0)', 'Replace ($0)', '更换旧店 ($0)')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* All-Inclusive Shop Package Overview (Android & Web only; hidden on iOS) */}
                  {!isIosAppStore && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#162032] via-[#132235] to-[#0B2926] border border-amber-400/80 space-y-2 shadow-md">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-amber-300 flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                          <span>
                            {tr(
                              language,
                              'កញ្ចប់ដាក់ហាងរួមបញ្ចូលទាំង ៥ មុខងារ (គ្មានទារថ្លៃបន្ថែម)',
                              'All-Inclusive Shop Package (All 5 Benefits Included)',
                              '全包店铺套餐（含全部 5 大权益，无额外广告费）'
                            )}
                          </span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#064E3B] text-amber-300 font-mono font-black text-[10px]">
                          {'$'}{shopCatalog.monthlyPlan.priceUsd.toFixed(2)}/30d • {'$'}{(shopCatalog.earlyBirdRemaining > 0 && shopCatalog.earlyBirdPlan.enabled ? shopCatalog.earlyBirdPlan.priceUsd : shopCatalog.yearlyPlan.priceUsd).toFixed(2)}/yr
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-slate-100">
                        {SHOP_ALL_INCLUSIVE_5_BENEFITS.map((b, i) => (
                          <li key={i} className="leading-snug">
                            {isKm ? b.km : language === 'zh' ? b.zh : b.en}
                          </li>
                        ))}
                      </ul>
                      <div className="pt-2 border-t border-slate-700/80 text-[10.5px] font-bold text-amber-300 leading-relaxed">
                        {tr(
                          language,
                          `🔒 កញ្ចប់ដាក់ហាងបង់ប្រាក់ (${shopCatalog.monthlyPlan.priceUsd.toFixed(2)}/30ថ្ងៃ ឬ ${(shopCatalog.earlyBirdRemaining > 0 && shopCatalog.earlyBirdPlan.enabled ? shopCatalog.earlyBirdPlan.priceUsd : shopCatalog.yearlyPlan.priceUsd).toFixed(2)}/ឆ្នាំ) — មិនរួមបញ្ចូលក្នុង Free Trial 7 ថ្ងៃឡើយ។ ការបង់ប្រាក់ធ្វើឡើងក្រោយពេល Admin ត្រួតពិនិត្យ និងអនុម័តព័ត៌មានហាង។`,
                          `🔒 Paid Shop Package (${shopCatalog.monthlyPlan.priceUsd.toFixed(2)}/30d or ${(shopCatalog.earlyBirdRemaining > 0 && shopCatalog.earlyBirdPlan.enabled ? shopCatalog.earlyBirdPlan.priceUsd : shopCatalog.yearlyPlan.priceUsd).toFixed(2)}/yr) — Not included in the 7-Day Free Trial. Payment is completed after Admin approves your shop details.`,
                          `🔒 付费店铺套餐（${shopCatalog.monthlyPlan.priceUsd.toFixed(2)}/30天 或 ${(shopCatalog.earlyBirdRemaining > 0 && shopCatalog.earlyBirdPlan.enabled ? shopCatalog.earlyBirdPlan.priceUsd : shopCatalog.yearlyPlan.priceUsd).toFixed(2)}/年）——不含在 7 天免费试用内，管理员审核通过后付款开通。`
                        )}
                      </div>
                    </div>
                  )}

                  {/* Progress checklist */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { ok: hasName, label: tr(language, 'ឈ្មោះ', 'Name', '名称'), required: true },
                      { ok: hasPhone, label: tr(language, 'ទូរស័ព្ទ', 'Phone', '电话'), required: true },
                      { ok: hasLocation, label: tr(language, 'ទីតាំង', 'Location', '位置'), required: false },
                      { ok: hasPhoto, label: tr(language, 'រូបភាព', 'Photo', '照片'), required: false },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className={`py-1.5 px-1 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 ${
                          s.ok
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {s.ok ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <span className="w-3 h-3 rounded-full border border-current shrink-0" />}
                        <span className="truncate">
                          {s.label}
                          {s.required ? ' *' : ''}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* SECTION 1: Basic Information */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#064E3B] text-white text-[11px] flex items-center justify-center shrink-0">1</span>
                      <span>{tr(language, 'ព័ត៌មានទូទៅ', 'Basic Information', '基本信息')}</span>
                    </div>

                    {/* Name */}
                    <div id="kft-addshop-field-name">
                      <label htmlFor="kft-addshop-name" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                        {isHotel
                          ? tr(language, 'ឈ្មោះសណ្ឋាគារ / ផ្ទះសំណាក់ *', 'Hotel / Stay Name *', '酒店/客栈名称 *')
                          : tr(language, 'ឈ្មោះហាង *', 'Shop Name *', '店铺名称 *')}
                      </label>
                      <input
                        id="kft-addshop-name"
                        type="text"
                        autoComplete="organization"
                        enterKeyHint="next"
                        value={nameKh}
                        onChange={(e) => setNameKh(e.target.value)}
                        aria-invalid={Boolean(errors.name)}
                        placeholder={
                          isHotel
                            ? tr(language, 'ឧ. សណ្ឋាគារ សុខា', 'e.g. Sokha Hotel', '例如：索卡酒店')
                            : tr(language, 'ឧ. ភោជនីយដ្ឋាន ម្លិះ', 'e.g. Malis Restaurant', '例如：茉莉餐厅')
                        }
                        className={inputClass(Boolean(errors.name))}
                      />
                      {renderFieldError('name')}
                    </div>

                    <div>
                      <label htmlFor="kft-addshop-name-en" className="block font-bold text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                        {tr(language, 'ឈ្មោះជាអក្សរឡាតាំង (ស្រេចចិត្ត)', 'Name in English (optional)', '英文名称（选填）')}
                      </label>
                      <input
                        id="kft-addshop-name-en"
                        type="text"
                        enterKeyHint="next"
                        value={nameEn}
                        onChange={(e) => setNameEn(e.target.value)}
                        placeholder={isHotel ? 'e.g. Angkor Boutique Hotel' : 'e.g. Malis Restaurant'}
                        className={inputClass(false)}
                      />
                    </div>

                    {/* Live Duplicate Detection Alert & 1-Tap Select to Upgrade Existing Listing */}
                    {(detectedDuplicates.length > 0 || detectedSeedHotelDuplicates.length > 0) && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 space-y-2 animate-fade-in">
                        <div className="font-extrabold text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>
                            {tr(
                              language,
                              'ហាង/សណ្ឋាគារនេះប្រហែលជាមានក្នុងកម្មវិធីរួចហើយ!',
                              'This listing may already exist in the app!',
                              '该店铺/酒店可能已存在于应用中！'
                            )}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-snug">
                          {tr(
                            language,
                            'ប្រសិនបើជារបស់អ្នក សូមចុច «ជ្រើសរើស និងដំឡើង» ដើម្បីកែប្រែវា ជំនួសការបង្កើតស្ទួន។',
                            'If it is yours, tap "Select & Upgrade" to update it instead of creating a duplicate.',
                            '如果是您的店铺，请点击“选择并升级”进行更新，避免重复创建。'
                          )}
                        </p>
                        <div className="space-y-1.5">
                          {[
                            ...detectedDuplicates.slice(0, 3).map((dup) => ({
                              id: dup.id,
                              source: 'restaurant' as const,
                              nameKh: dup.nameKh,
                              nameEn: dup.nameEn,
                              provinceKh: dup.provinceKh,
                              phone: dup.phone,
                              photoUrl: dup.photoUrl,
                              onSelect: () => beginUpgradeExistingStore(dup),
                            })),
                            ...detectedSeedHotelDuplicates.map((dup) => ({
                              id: dup.id,
                              source: 'destination' as const,
                              nameKh: dup.nameKh,
                              nameEn: dup.nameEn,
                              provinceKh: dup.provinceKh,
                              phone: dup.phone,
                              photoUrl: dup.photoUrl,
                              onSelect: () => selectExistingOption(dup),
                            })),
                          ].map((dup) => (
                            <div
                              key={`${dup.source}-${dup.id}`}
                              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {dup.photoUrl ? (
                                  <img src={dup.photoUrl} alt={dup.nameKh} loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                                    <DefaultShopIcon className="w-full h-full" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{dup.nameKh || dup.nameEn}</div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                    📍 {dup.provinceKh} {dup.phone ? `• 📞 ${dup.phone}` : ''}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={dup.onSelect}
                                className="px-2.5 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black text-[10px] shrink-0 shadow-2xs cursor-pointer"
                              >
                                {tr(language, '⬆️ ជ្រើសរើស និងដំឡើង', '⬆️ Select & Upgrade', '⬆️ 选择并升级')}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Category chips */}
                    <div>
                      <div className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        {isHotel
                          ? tr(language, 'ប្រភេទកន្លែងស្នាក់នៅ *', 'Accommodation Type *', '住宿类别 *')
                          : tr(language, 'ប្រភេទហាង *', 'Shop Category *', '店铺类别 *')}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {activeCategoryList.map((cat) => {
                          const selected = businessCategory === cat.id;
                          return (
                            <button
                              type="button"
                              key={cat.id}
                              aria-pressed={selected}
                              onClick={() => {
                                setBusinessCategory(cat.id);
                                setSignatureDishesKh([cat.defaultDishKh]);
                              }}
                              className={`min-h-[44px] px-2.5 py-2 rounded-xl border-2 text-left text-[11px] font-bold leading-snug transition cursor-pointer ${
                                selected
                                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {language === 'km' ? cat.labelKh : language === 'zh' ? cat.labelZh : cat.labelEn}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Phone */}
                    <div id="kft-addshop-field-phone">
                      <label htmlFor="kft-addshop-phone" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                        <Phone className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                        {tr(language, 'លេខទូរស័ព្ទទំនាក់ទំនង *', 'Contact Phone *', '联系电话 *')}
                      </label>
                      <input
                        id="kft-addshop-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        aria-invalid={Boolean(errors.phone)}
                        placeholder="012 345 678"
                        className={`${inputClass(Boolean(errors.phone))} font-mono`}
                      />
                      {renderFieldError('phone')}
                    </div>
                  </div>

                  {/* SECTION 2: Location */}
                  <div
                    id="kft-addshop-field-location"
                    className={`p-3.5 rounded-2xl border space-y-3 ${
                      errors.location
                        ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-400'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#064E3B] text-white text-[11px] flex items-center justify-center shrink-0">2</span>
                      <span>{tr(language, 'ទីតាំង', 'Location', '位置')}</span>
                      <span className="ml-auto text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {tr(language, 'ណែនាំឱ្យដាក់', 'Recommended', '推荐填写')}
                      </span>
                    </div>

                    {hasLocation ? (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-400 flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-emerald-900 dark:text-emerald-200 text-[11px]">
                            {tr(language, 'បានកំណត់ទីតាំងលើផែនទី', 'Location pinned on map', '已在地图上标记位置')}
                          </div>
                          <div className="font-mono text-[10px] text-emerald-700 dark:text-emerald-300 truncate">
                            {shopLat!.toFixed(6)}, {shopLng!.toFixed(6)}
                          </div>
                        </div>
                        <a
                          href={shopMapUrl.trim() || `https://www.google.com/maps/search/?api=1&query=${shopLat},${shopLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shrink-0"
                          aria-label={tr(language, 'បើកក្នុង Google Maps', 'Open in Google Maps', '在 Google 地图中打开')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={clearLocation}
                          className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-rose-600 shrink-0 cursor-pointer"
                          aria-label={tr(language, 'លុបទីតាំង', 'Clear location', '清除位置')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {tr(
                          language,
                          'ប្រសិនបើអ្នកកំពុងនៅហាង ចុច «ប្រើទីតាំងខ្ញុំ»។ បើមិននៅទេ ចុច «ជ្រើសលើផែនទី»។ ហាងដែលមានទីតាំងត្រឹមត្រូវ ទទួលបានការអនុម័តលឿនជាង។',
                          'At the shop right now? Tap "Use My Location". Otherwise tap "Pick on Map". Listings with a location get approved faster.',
                          '如果您正在店内，请点击“使用我的位置”，否则点击“在地图上选择”。有准确位置的列表审核更快。'
                        )}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleDetectCurrentLocation}
                        disabled={isDetectingLocation}
                        className="min-h-[48px] py-2.5 px-2 rounded-xl bg-gradient-to-r from-[#064E3B] to-emerald-700 hover:from-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.98] cursor-pointer disabled:opacity-70"
                      >
                        {isDetectingLocation ? (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <Crosshair className="w-4 h-4 text-amber-300 shrink-0" />
                        )}
                        <span>
                          {isDetectingLocation
                            ? tr(language, 'កំពុងស្វែងរក...', 'Detecting...', '定位中...')
                            : tr(language, 'ប្រើទីតាំងខ្ញុំ', 'Use My Location', '使用我的位置')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCheckInPickerOpen(true)}
                        className="min-h-[48px] py-2.5 px-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-600 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span>
                          {hasLocation
                            ? tr(language, 'កែលើផែនទី', 'Adjust on Map', '在地图上调整')
                            : tr(language, 'ជ្រើសលើផែនទី', 'Pick on Map', '在地图上选择')}
                        </span>
                      </button>
                    </div>

                    {locationNotice && (
                      <div
                        role="status"
                        className={`p-2.5 rounded-xl text-[11px] font-bold leading-snug border ${
                          locationNotice.type === 'error'
                            ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-800 dark:text-rose-200'
                            : locationNotice.type === 'warning'
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                        }`}
                      >
                        {locationNotice.text}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2.5">
                      <div>
                        <label htmlFor="kft-addshop-province" className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                          {tr(language, 'ខេត្ត / រាជធានី *', 'Province / City *', '省份 / 城市 *')}
                        </label>
                        <select
                          id="kft-addshop-province"
                          value={provinceKh}
                          onChange={(e) => {
                            const found = PROVINCES.find((p) => p.nameKh === e.target.value);
                            setProvinceKh(e.target.value);
                            if (found) setProvinceEn(found.nameEn);
                          }}
                          className={`${inputClass(false)} font-medium`}
                        >
                          {PROVINCES.map((p) => (
                            <option key={p.nameKh} value={p.nameKh}>
                              {isKm ? p.nameKh : p.nameEn}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="kft-addshop-address" className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                          {tr(language, 'អាសយដ្ឋាន (ផ្លូវ សង្កាត់ ឬកន្លែងសម្គាល់)', 'Address (street, sangkat or landmark)', '地址（街道、分区或地标）')}
                        </label>
                        <input
                          id="kft-addshop-address"
                          type="text"
                          autoComplete="street-address"
                          value={addressKh}
                          onChange={(e) => setAddressKh(e.target.value)}
                          placeholder={tr(language, 'ឧ. ផ្លូវលេខ ៦៣ ជិតផ្សារថ្មី', 'e.g. St. 63, near Central Market', '例如：63号路，中央市场附近')}
                          className={inputClass(false)}
                        />
                      </div>
                    </div>

                    {/* Advanced: paste Google Maps link / GPS coordinates */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowAdvancedLocation((prev) => !prev)}
                        className="w-full py-2 px-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between cursor-pointer"
                      >
                        <span>
                          🗺️ {tr(language, 'បិទភ្ជាប់លីង Google Maps ឬ GPS ដោយដៃ', 'Paste a Google Maps link or GPS manually', '手动粘贴 Google 地图链接或 GPS')}
                        </span>
                        {showAdvancedLocation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {showAdvancedLocation && (
                        <div className="space-y-2.5 pt-1">
                          <div className="space-y-1">
                            <label htmlFor="kft-addshop-mapurl" className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                              {tr(language, 'លីង Google Maps', 'Google Maps Link', 'Google 地图链接')}
                            </label>
                            <input
                              id="kft-addshop-mapurl"
                              type="url"
                              inputMode="url"
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
                              placeholder="https://maps.app.goo.gl/..."
                              className={`${inputClass(Boolean(errors.location) && Boolean(shopMapUrl.trim()) && !isValidGoogleMapsUrl(shopMapUrl))} font-mono text-xs`}
                            />
                            {shopMapUrl.trim() && (
                              <div
                                className={`text-[10px] font-bold flex items-center gap-1 ${
                                  isValidGoogleMapsUrl(shopMapUrl) ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {isValidGoogleMapsUrl(shopMapUrl) ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>{tr(language, 'លីង Google Maps ត្រឹមត្រូវ', 'Valid Google Maps link', '有效的 Google 地图链接')}</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>
                                      {tr(
                                        language,
                                        'លីងនេះមិនមែនជាលីង Google Maps ទេ',
                                        'This is not a valid Google Maps link',
                                        '这不是有效的 Google 地图链接'
                                      )}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label htmlFor="kft-addshop-gps" className="block font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                              <Navigation className="w-3 h-3 inline mr-1 text-emerald-600" />
                              {tr(language, 'កូអរដោនេ GPS (Latitude, Longitude)', 'GPS (Latitude, Longitude)', 'GPS 坐标（纬度, 经度）')}
                            </label>
                            <input
                              id="kft-addshop-gps"
                              type="text"
                              inputMode="decimal"
                              value={
                                gpsInputText ||
                                (shopLat !== null && shopLng !== null ? `${shopLat.toFixed(6)}, ${shopLng.toFixed(6)}` : '')
                              }
                              onChange={(e) => handleGpsInputChange(e.target.value)}
                              placeholder="11.556400, 104.928200"
                              className={`${inputClass(false)} font-mono text-xs`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {renderFieldError('location')}
                  </div>

                  {/* SECTION 3: Photo */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#064E3B] text-white text-[11px] flex items-center justify-center shrink-0">3</span>
                      <span>
                        {isHotel
                          ? tr(language, 'រូបភាពសណ្ឋាគារ', 'Hotel Photo', '酒店照片')
                          : tr(language, 'រូបភាពហាង', 'Shop Photo', '店铺照片')}
                      </span>
                      <span className="ml-auto text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {tr(language, 'ណែនាំឱ្យដាក់', 'Recommended', '推荐填写')}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={handlePickFromGallery}
                      className={`relative w-full h-40 rounded-2xl overflow-hidden flex items-center justify-center transition cursor-pointer ${
                        coverPhoto
                          ? 'border-2 border-emerald-500'
                          : 'border-2 border-dashed border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      {coverPhoto ? (
                        <>
                          <img loading="lazy" decoding="async"
                            src={coverPhoto}
                            alt={tr(language, 'រូបភាពហាង', 'Shop photo', '店铺照片')}
                            className="w-full h-full object-cover"
                            onError={() => setShopPhoto('')}
                          />
                          <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-black/70 text-white text-[10px] font-bold flex items-center gap-1">
                            <Edit2 className="w-3 h-3" />
                            {tr(language, 'ប្តូររូប', 'Change', '更换')}
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-emerald-800 dark:text-emerald-300 px-4 text-center">
                          {isUploadingPhoto ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
                          <span className="font-bold text-xs">
                            {isUploadingPhoto
                              ? tr(language, 'កំពុងពិនិត្យរូបភាព...', 'Checking photo...', '正在检查照片...')
                              : tr(language, 'ចុចទីនេះដើម្បីជ្រើសរូបភាព', 'Tap here to choose a photo', '点击此处选择照片')}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {tr(
                              language,
                              'រូបមុខហាង ឬខាងក្នុងហាងដែលច្បាស់ល្អ',
                              'A clear photo of the storefront or interior',
                              '清晰的门面或店内照片'
                            )}
                          </span>
                        </div>
                      )}
                      {isUploadingPhoto && coverPhoto && (
                        <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-7 h-7 text-white animate-spin" />
                        </span>
                      )}
                    </button>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        disabled={isUploadingPhoto}
                        onClick={handlePickFromGallery}
                        className="min-h-[44px] py-2 px-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{tr(language, 'រូបភាពរបស់ខ្ញុំ', 'My Photos', '我的照片')}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isUploadingPhoto}
                        onClick={() => cameraInputRef.current?.click()}
                        className="min-h-[44px] py-2 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        <Camera className="w-3.5 h-3.5 shrink-0" />
                        <span>{tr(language, 'ថតរូប', 'Camera', '拍照')}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isUploadingPhoto || !coverPhoto}
                        onClick={() => {
                          setShopPhoto('');
                          setModerationWarning(null);
                        }}
                        className="min-h-[44px] py-2 px-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{tr(language, 'លុប', 'Remove', '删除')}</span>
                      </button>
                    </div>

                    {moderationWarning && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-400 text-rose-800 dark:text-rose-200 text-[11px] font-bold flex items-start gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{moderationWarning}</span>
                      </div>
                    )}
                  </div>

                  {/* Optional Extra Info (Opening Hours, Price, Website & Description) */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowMoreOptions((prev) => !prev)}
                      className="w-full min-h-[44px] py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-between transition cursor-pointer"
                    >
                      <span>
                        ⚙️ {tr(
                          language,
                          'ព័ត៌មានបន្ថែម៖ ម៉ោងបើក តម្លៃ ការពិពណ៌នា (ស្រេចចិត្ត)',
                          'More details: hours, price, description (optional)',
                          '更多信息：营业时间、价格、简介（选填）'
                        )}
                      </span>
                      {showMoreOptions ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                    </button>

                    {showMoreOptions && (
                      <div className="p-3.5 space-y-3 bg-white dark:bg-slate-900/40">
                        <div>
                          <label htmlFor="kft-addshop-hours" className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            <Clock className="w-3 h-3 inline mr-1 text-emerald-600" />
                            {isHotel
                              ? tr(language, 'ម៉ោងទទួលភ្ញៀវ / Check-in', 'Reception / Check-in hours', '前台/入住时间')
                              : tr(language, 'ម៉ោងបើក និងបិទ', 'Opening hours', '营业时间')}
                          </label>
                          <input
                            id="kft-addshop-hours"
                            type="text"
                            value={openingHoursKh}
                            onChange={(e) => setOpeningHoursKh(e.target.value)}
                            placeholder="០៧:០០ ព្រឹក - ០៩:០០ យប់"
                            className={inputClass(false)}
                          />
                        </div>

                        <div>
                          <div className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            {tr(language, 'កម្រិតតម្លៃ', 'Price level', '价格等级')}
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(['$', '$$', '$$$', '$$$$'] as RestaurantPriceLevel[]).map((lvl) => (
                              <button
                                type="button"
                                key={lvl}
                                aria-pressed={priceLevel === lvl}
                                onClick={() => setPriceLevel(lvl)}
                                className={`min-h-[40px] rounded-xl border-2 font-mono font-black text-xs transition cursor-pointer ${
                                  priceLevel === lvl
                                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label htmlFor="kft-addshop-website" className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            {tr(language, 'គេហទំព័រ ឬ Facebook', 'Website or Facebook page', '网站或 Facebook 主页')}
                          </label>
                          <input
                            id="kft-addshop-website"
                            type="url"
                            inputMode="url"
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            placeholder="https://facebook.com/..."
                            className={`${inputClass(false)} text-xs`}
                          />
                        </div>

                        <div>
                          <label htmlFor="kft-addshop-desc" className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            {isHotel
                              ? tr(language, 'ការពិពណ៌នាអំពីសណ្ឋាគារ', 'Hotel description', '酒店简介')
                              : tr(language, 'ការពិពណ៌នាអំពីហាង', 'Shop description', '店铺简介')}
                          </label>
                          <textarea
                            id="kft-addshop-desc"
                            rows={3}
                            maxLength={600}
                            value={descriptionKh}
                            onChange={(e) => setDescriptionKh(e.target.value)}
                            placeholder={
                              isHotel
                                ? tr(language, 'រៀបរាប់ខ្លីៗអំពីបន្ទប់ និងសេវាកម្ម...', 'Briefly describe your rooms & services...', '简短介绍客房与服务...')
                                : tr(language, 'រៀបរាប់ខ្លីៗអំពីរសជាតិម្ហូប និងសេវាកម្ម...', 'Brief description of your food & service...', '简短介绍您的招牌美食与服务...')
                            }
                            className={`${inputClass(false)} resize-none`}
                          />
                          <div className="text-right text-[10px] text-slate-400 mt-0.5">{descriptionKh.length}/600</div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sticky Submit Bar (always reachable on mobile) */}
            {!isSelectingExisting && (
              <div className="shrink-0 px-4 pt-2.5 pb-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 space-y-1.5">
                {submitAttempted && Object.keys(errors).length > 0 && (
                  <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {tr(
                        language,
                        `សូមកែ ${Object.keys(errors).length} ចំណុចដែលបានសម្គាល់ពណ៌ក្រហម`,
                        `Please fix ${Object.keys(errors).length} highlighted field(s)`,
                        `请修正 ${Object.keys(errors).length} 个标红的字段`
                      )}
                    </span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSaving || isUploadingPhoto || isDetectingLocation}
                  className="w-full min-h-[50px] py-3 px-4 rounded-2xl bg-gradient-to-r from-[#064E3B] via-emerald-700 to-[#047857] hover:from-emerald-800 hover:to-emerald-700 disabled:opacity-60 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
                >
                  <Eye className="w-5 h-5 text-amber-300 shrink-0" />
                  <span>
                    {activeUpgradeName
                      ? tr(language, 'ពិនិត្យ និងដាក់ស្នើការកែប្រែ', 'Review & Submit Update', '检查并提交修改')
                      : tr(language, 'ពិនិត្យ និងដាក់ស្នើ', 'Review & Submit', '检查并提交')}
                  </span>
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold">{completedCount}/4</span>
                </button>
              </div>
            )}
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
            setLocationNotice(null);
            if (loc.formattedAddressKh) {
              setAddressKh(loc.formattedAddressKh);
            }
            const matchedProv = findProvinceMatch(loc.provinceKh, loc.provinceEn);
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

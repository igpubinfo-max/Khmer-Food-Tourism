import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Trash2, Award, 
  AlertCircle, CheckCircle2, Image, DollarSign, Calendar, Clock,
  Store, BarChart3, ShieldCheck, Share2, Phone, MapPin, ExternalLink,
  MessageCircle, Copy, Check, HelpCircle, ArrowRight, Camera, Upload, Lock, ShieldAlert, Star, Mail,
  QrCode, Download, Plus, RefreshCw
} from 'lucide-react';
import { 
  RestaurantPriceLevel, isRestaurantPremiumActive, isUserVipActive, 
  VipPlanType, getVipAccountState, getVipRemainingDays,
  getRestaurantRatingSummary, isSeedRestaurantId, getRestaurantCreatedAtMs,
  getDynamicVipPlans, getDynamicVipBenefits,
  isValidCambodiaCoordinates, buildCanonicalGoogleMapsPinUrl,
  isValidGoogleMapsUrl, extractCoordsFromGoogleMapsUrl,
  BUSINESS_CATEGORY_CATALOG, inferBusinessTypeAndCategory, isHotelBusinessRecord,
  isUserOwnerOfRestaurantRecord,
  SHOP_ALL_INCLUSIVE_5_BENEFITS,
  getShopSubscriptionCatalog,
  isShopSubscriptionActive,
  isIosOrIpadAppStoreRuntime,
  parseSafeDateMs,
} from '../types';
import { tr } from '../utils/i18n';
import {
  isNativeAndroidOrIosPlatform,
  pickImageUsingNativeAndroidGallery,
  savePngDataUrlToGallery,
} from '../utils/androidMediaHelper';
import { validateAndModerateShopImage } from '../utils/imageModeration';
import { DefaultShopIcon } from './icons/DefaultShopIcon';
import { ShopLocationCheckInPickerModal, ShopCheckInLocationResult } from './ShopLocationCheckInPickerModal';

export const ManageMenuModal: React.FC = () => {
  const { 
    isManageMenuModalOpen, 
    setIsManageMenuModalOpen, 
    managingRestaurant,
    setManagingRestaurant,
    restaurants,
    currentUser,
    appSettings,
    getCurrentUserStoreQuota,
    updateRestaurant,
    deleteRestaurant,
    addRestaurantMenuItem,
    deleteRestaurantMenuItem,
    submitShopPhotoReplacementRequest,
    approveShopPhotoReplacement,
    rejectShopPhotoReplacement,
    submitShopSubscriptionPaymentRequest,
    upgradeRestaurantToPremium,
    getOwnedRestaurantsForUser,
    setActiveManagedShopId,
    setIsVipAddRestaurantModalOpen,
    language,
    showToast,
    openUpgradeVipModal,
    setIsAuthModalOpen,
  } = useApp();

  const isKm = language === 'km';
  const isIosAppStore = isIosOrIpadAppStoreRuntime();
  const shopCatalog = getShopSubscriptionCatalog(appSettings);
  const [selectedShopPlanId, setSelectedShopPlanId] = useState<'shop_30d' | 'shop_365d' | 'shop_earlybird_365d'>(
    () => (shopCatalog.earlyBirdRemaining > 0 && shopCatalog.earlyBirdPlan.enabled ? 'shop_earlybird_365d' : 'shop_30d')
  );
  const [shopTrxRef, setShopTrxRef] = useState('');
  const [shopReceiptDraft, setShopReceiptDraft] = useState<{ dataUrl: string; fileName: string; mimeType: string } | null>(null);
  const [isSubmittingShopPayment, setIsSubmittingShopPayment] = useState(false);
  const shopReceiptInputRef = useRef<HTMLInputElement>(null);

  // Dish Menu Item quick-add state (Shop Package Benefit #1)
  const [dishNameKh, setDishNameKh] = useState('');
  const [dishNameEn, setDishNameEn] = useState('');
  const [dishPriceUsd, setDishPriceUsd] = useState('');

  const dynamicPlansMap = getDynamicVipPlans(appSettings);
  const dynamicBenefits = getDynamicVipBenefits(appSettings);
  const storeQuota = getCurrentUserStoreQuota();

  // Main Tabs: info, photos, analytics, membership
  const [mainTab, setMainTab] = useState<'info' | 'photos' | 'analytics' | 'membership'>('info');
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Single Shop Photo Replacement State
  const shopPhotoFileRef = useRef<HTMLInputElement>(null);
  const shopPhotoCameraRef = useRef<HTMLInputElement>(null);
  const [isUploadingShopPhoto, setIsUploadingShopPhoto] = useState(false);
  const [shopPhotoModerationWarning, setShopPhotoModerationWarning] = useState<string | null>(null);
  const [stagedReplacementPhoto, setStagedReplacementPhoto] = useState<string>('');

  // Self-Service Store Info fields
  const [storeBusinessType, setStoreBusinessType] = useState<'restaurant' | 'hotel'>(
    () => inferBusinessTypeAndCategory(managingRestaurant || {}).businessType
  );
  const [storeBusinessCategory, setStoreBusinessCategory] = useState<string>(
    () => inferBusinessTypeAndCategory(managingRestaurant || {}).businessCategory
  );
  const [storeNameKh, setStoreNameKh] = useState(managingRestaurant?.nameKh || '');
  const [storeNameEn, setStoreNameEn] = useState(managingRestaurant?.nameEn || '');
  const [storePhone, setStorePhone] = useState(managingRestaurant?.phone || '');
  const [storeProvinceKh, setStoreProvinceKh] = useState(managingRestaurant?.provinceKh || 'រាជធានីភ្នំពេញ');
  const [storeAddressKh, setStoreAddressKh] = useState(managingRestaurant?.addressKh || '');
  const [storeOpeningHours, setStoreOpeningHours] = useState(managingRestaurant?.openingHoursKh || '');
  const [storePriceLevel, setStorePriceLevel] = useState<RestaurantPriceLevel>(managingRestaurant?.priceLevel || '$$');
  const [storeDescriptionKh, setStoreDescriptionKh] = useState(managingRestaurant?.descriptionKh || '');
  const [storeMapUrl, setStoreMapUrl] = useState(managingRestaurant?.mapUrl || '');
  const [storeLatitude, setStoreLatitude] = useState<number>(
    typeof managingRestaurant?.latitude === 'number' ? managingRestaurant.latitude : 0
  );
  const [storeLongitude, setStoreLongitude] = useState<number>(
    typeof managingRestaurant?.longitude === 'number' ? managingRestaurant.longitude : 0
  );
  const [isStoreCheckInOpen, setIsStoreCheckInOpen] = useState(false);
  const [storeCoverPhoto, setStoreCoverPhoto] = useState(managingRestaurant?.photoUrl || '');
  const [storeGalleryPhotos, setStoreGalleryPhotos] = useState<string[]>(managingRestaurant?.galleryPhotos || []);
  const [storePromoVideoUrl, setStorePromoVideoUrl] = useState(managingRestaurant?.promoVideoUrl || '');
  const [storeTelegramUrl, setStoreTelegramUrl] = useState(managingRestaurant?.telegramUrl || '');
  const [storeFacebookUrl, setStoreFacebookUrl] = useState(managingRestaurant?.facebookUrl || '');
  const [newGalleryInput, setNewGalleryInput] = useState('');
  const [confirmDeleteStore, setConfirmDeleteStore] = useState(false);

  const isAdminUser =
    currentUser?.role === 'admin' ||
    currentUser?.id === 'admin-authorized-single' ||
    currentUser?.username === 'admin' ||
    currentUser?.username === 'cheasavuth';

  // Ensure non-admin user ALWAYS opens their own shop (by unique shop_id and owner_id)
  useEffect(() => {
    if (!isManageMenuModalOpen || !currentUser) return;
    const owned = getOwnedRestaurantsForUser(currentUser);
    if (!isAdminUser && owned.length > 0) {
      const isCurrentlyOwned = managingRestaurant && owned.some((r) => r.id === managingRestaurant.id);
      if (!isCurrentlyOwned) {
        setManagingRestaurant(owned[0]);
      }
    }
  }, [isManageMenuModalOpen, currentUser?.id, managingRestaurant?.id]);

  // Sync state whenever managingRestaurant changes (strictly isolated per shop_id)
  useEffect(() => {
    if (managingRestaurant) {
      const fresh = restaurants.find((r) => r.id === managingRestaurant.id) || managingRestaurant;
      const inferred = inferBusinessTypeAndCategory(fresh);
      setStoreBusinessType(inferred.businessType);
      setStoreBusinessCategory(inferred.businessCategory);
      setStoreNameKh(fresh.nameKh || '');
      setStoreNameEn(fresh.nameEn || '');
      setStorePhone(fresh.phone || '');
      setStoreProvinceKh(fresh.provinceKh || 'រាជធានីភ្នំពេញ');
      setStoreAddressKh(fresh.addressKh || '');
      setStoreOpeningHours(fresh.openingHoursKh || '');
      setStorePriceLevel(fresh.priceLevel || '$$');
      setStoreDescriptionKh(fresh.descriptionKh || '');
      setStoreMapUrl(fresh.mapUrl || '');
      setStoreLatitude(typeof fresh.latitude === 'number' ? fresh.latitude : 0);
      setStoreLongitude(typeof fresh.longitude === 'number' ? fresh.longitude : 0);
      setStoreCoverPhoto(fresh.photoUrl || '');
      setStoreGalleryPhotos(fresh.galleryPhotos || []);
      setStagedReplacementPhoto('');
      setShopPhotoModerationWarning(null);
      setStorePromoVideoUrl(fresh.promoVideoUrl || '');
      setStoreTelegramUrl(fresh.telegramUrl || '');
      setStoreFacebookUrl(fresh.facebookUrl || '');
      setConfirmDeleteStore(false);
      setStatusBanner(null);
    }
  }, [managingRestaurant?.id]);

  // Allow external triggers (e.g. ProfileView VIP feature cards) to open a specific tab
  useEffect(() => {
    if (isManageMenuModalOpen) {
      const requestedTab = (window as any).__kft_manage_initial_tab;
      if (requestedTab === 'video' || requestedTab === 'menu') {
        setMainTab('info');
        (window as any).__kft_manage_initial_tab = undefined;
      } else if (requestedTab === 'membership' && isIosAppStore) {
        setMainTab('info');
        (window as any).__kft_manage_initial_tab = undefined;
      } else if (requestedTab && ['info', 'photos', 'analytics', 'membership'].includes(requestedTab)) {
        setMainTab(requestedTab);
        (window as any).__kft_manage_initial_tab = undefined;
      }
    }
  }, [isManageMenuModalOpen]);

  // Upgrade / Renewal fields
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'BankTransfer' | 'Bakong' | 'KHQR'>('BankTransfer');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isManageMenuModalOpen || !managingRestaurant) return null;

  const currentRest =
    restaurants.find((r) => r.id === managingRestaurant.id) || managingRestaurant;

  const isAdmin = 
    currentUser?.role === 'admin' || 
    currentUser?.id === 'admin-authorized-single' || 
    currentUser?.username === 'admin' || 
    currentUser?.username === 'cheasavuth';

  const ownedShopsForCurrentUser = getOwnedRestaurantsForUser(currentUser);
  const isOwner = Boolean(
    currentUser &&
      (isUserOwnerOfRestaurantRecord(currentUser, currentRest) ||
        isUserOwnerOfRestaurantRecord(currentUser, managingRestaurant) ||
        ownedShopsForCurrentUser.some((r) => r.id === currentRest.id))
  );
  const isApprovedVip = isUserVipActive(currentUser);
  const vipState = getVipAccountState(currentUser);
  // Basic shop management is free for the shop owner; VIP is an optional upgrade
  const isAuthorized = isAdmin || isOwner;

  const handleCloseModal = () => {
    setIsManageMenuModalOpen(false);
    setManagingRestaurant(null);
  };

  const ratingSummary = getRestaurantRatingSummary(managingRestaurant);
  const switchableShops = isAdmin
    ? [...restaurants.filter((r) => !isSeedRestaurantId(r.id))].sort(
        (a, b) => getRestaurantCreatedAtMs(b) - getRestaurantCreatedAtMs(a)
      )
    : ownedShopsForCurrentUser;

  const isShopSubActive = isShopSubscriptionActive(currentRest) || isAdmin;
  const isPremiumActive = isShopSubActive;
  const shopExpiryRaw =
    currentRest.shopSubscriptionExpiresAt || currentRest.subscriptionExpiresAt || currentRest.membershipExpiresAt;
  const shopExpMs = parseSafeDateMs(shopExpiryRaw);
  const shopRemainingDays =
    shopExpMs !== null && shopExpMs > Date.now()
      ? Math.max(1, Math.ceil((shopExpMs - Date.now()) / (24 * 60 * 60 * 1000)))
      : 0;
  const isExpired = !isShopSubActive && Boolean(shopExpiryRaw || currentRest.shopPaymentStatus === 'expired');
  const vipRemainingDays = shopRemainingDays;
  const vipExpiryRaw = shopExpiryRaw;
  const formattedVipExpiry = vipExpiryRaw
    ? (() => {
        try {
          const d = new Date(vipExpiryRaw);
          return Number.isNaN(d.getTime()) ? vipExpiryRaw : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
          return vipExpiryRaw;
        }
      })()
    : null;

  // Analytics Metrics
  const viewsCount = currentRest.analytics?.views ?? 0;
  const callsCount = currentRest.analytics?.phoneClicks ?? 0;
  const mapsCount = currentRest.analytics?.mapClicks ?? 0;
  const sharesCount = currentRest.analytics?.shareClicks ?? 0;

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://khmerfoodtourism.com';
  const shareableUrl = `${origin}/?restaurant=${managingRestaurant.id}`;

  // Single Shop Photo Picker & Moderation Handlers
  const handlePickSingleShopPhotoFromGallery = async () => {
    setShopPhotoModerationWarning(null);
    if (!isNativeAndroidOrIosPlatform()) {
      shopPhotoFileRef.current?.click();
      return;
    }
    setIsUploadingShopPhoto(true);
    try {
      const nativePick = await pickImageUsingNativeAndroidGallery(1200, 0.85);
      if (nativePick?.cancelled) {
        setIsUploadingShopPhoto(false);
        return;
      }
      if (nativePick?.dataUrl) {
        const modRes = await validateAndModerateShopImage(nativePick.dataUrl, language);
        if (!modRes.valid || !modRes.dataUrl) {
          setShopPhotoModerationWarning(modRes.reason || null);
          showToast(modRes.reason || tr(language, '⚠️ រូបភាពមិនត្រឹមត្រូវ', '⚠️ Invalid shop image', '⚠️ 图片无效'), 'warning');
          setIsUploadingShopPhoto(false);
          return;
        }
        setStagedReplacementPhoto(modRes.dataUrl);
        showToast(
          tr(
            language,
            '✅ បានជ្រើសរូបភាពហាងថ្មីរួចរាល់! សូមចុចប៊ូតុងដាក់ស្នើប្តូររូបភាព។',
            '✅ New shop photo selected & verified! Tap Submit below.',
            '✅ 新店铺照片已选定！请点击下方提交按钮。'
          ),
          'success'
        );
        setIsUploadingShopPhoto(false);
        return;
      }
    } catch {}
    setIsUploadingShopPhoto(false);
    shopPhotoFileRef.current?.click();
  };

  const handleSingleShopPhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setShopPhotoModerationWarning(null);
    setIsUploadingShopPhoto(true);
    try {
      const modRes = await validateAndModerateShopImage(file, language);
      if (!modRes.valid || !modRes.dataUrl) {
        setShopPhotoModerationWarning(modRes.reason || null);
        showToast(modRes.reason || tr(language, '⚠️ រូបភាពមិនត្រឹមត្រូវ', '⚠️ Invalid shop image', '⚠️ 图片无效'), 'warning');
        return;
      }
      setStagedReplacementPhoto(modRes.dataUrl);
      showToast(
        tr(
          language,
          '✅ បានជ្រើសរូបភាពហាងថ្មីរួចរាល់! សូមចុចប៊ូតុងដាក់ស្នើប្តូររូបភាព។',
          '✅ New shop photo selected & verified! Tap Submit below.',
          '✅ 新店铺照片已选定！请点击下方提交按钮。'
        ),
        'success'
      );
    } catch {
      showToast(tr(language, '⚠️ មិនអាចអានរូបភាពបានទេ', '⚠️ Could not read image', '⚠️ 无法读取图片'), 'warning');
    } finally {
      setIsUploadingShopPhoto(false);
    }
  };

  const handleSubmitStagedShopPhotoReplacement = () => {
    const newPhoto = stagedReplacementPhoto.trim();
    if (!newPhoto) {
      showToast(
        tr(language, '⚠️ សូមជ្រើសរើស ឬថតរូបភាពហាងថ្មីជាមុនសិន!', '⚠️ Please select or take a new shop photo first!', '⚠️ 请先选择或拍摄一张新店铺照片！'),
        'warning'
      );
      return;
    }
    const ok = submitShopPhotoReplacementRequest(currentRest.id, newPhoto);
    if (ok) {
      setStagedReplacementPhoto('');
      setStatusBanner({
        type: 'success',
        text: isAdmin
          ? tr(language, '✅ បានប្តូរ និងអនុម័តរូបភាពហាងថ្មីជោគជ័យ!', '✅ Shop photo replaced & approved!', '✅ 店铺照片已更换并批准！')
          : tr(
              language,
              '⏳ បានបញ្ជូនរូបភាពហាងថ្មីទៅកាន់ Admin (Pending Admin Approval)! រូបភាពចាស់នៅតែបង្ហាញជាធម្មតារហូតដល់មានការអនុម័ត។',
              '⏳ New shop photo submitted for Admin review (Pending Admin Approval)! Your existing approved photo remains visible until approved.',
              '⏳ 新店铺照片已提交管理员审核（Pending Admin Approval）！审核通过前将继续显示原照片。'
            ),
      });
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveStoreInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeNameKh.trim() && !storeNameEn.trim()) {
      setStatusBanner({
        type: 'error',
        text: tr(language, '⚠️ សូមបញ្ចូលឈ្មោះហាងជាភាសាខ្មែរ!', '⚠️ Please enter restaurant name!', '⚠️ 请输入餐厅名称！'),
      });
      showToast(tr(language, 'សូមបញ្ចូលឈ្មោះហាង!', 'Please enter restaurant name!', '请输入餐厅名称！'), 'warning');
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const parseCoordsFromUrl = (rawUrl: string): { lat: number; lng: number } | null => {
      if (!rawUrl) return null;
      const decoded = (() => {
        try {
          return decodeURIComponent(rawUrl);
        } catch {
          return rawUrl;
        }
      })();
      const patterns = [
        /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
        /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
        /[?&](?:query|q|destination|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
      ];
      for (const rx of patterns) {
        const m = decoded.match(rx);
        if (m) {
          const lat = Number(m[1]);
          const lng = Number(m[2]);
          if (isValidCambodiaCoordinates(lat, lng)) return { lat, lng };
        }
      }
      return null;
    };

    const trimmedMapUrl = storeMapUrl.trim();
    if (trimmedMapUrl && !isValidGoogleMapsUrl(trimmedMapUrl)) {
      setStatusBanner({
        type: 'error',
        text: isKm
          ? '⚠️ សូមបញ្ចូលលីង Google Maps ឱ្យបានត្រឹមត្រូវ (ឧ. https://maps.app.goo.gl/... ឬ https://www.google.com/maps/...)'
          : '⚠️ Please enter a valid Google Maps link (e.g., https://maps.app.goo.gl/... or https://www.google.com/maps/...)',
      });
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    let resolvedLat = Number(storeLatitude);
    let resolvedLng = Number(storeLongitude);
    if (!isValidCambodiaCoordinates(resolvedLat, resolvedLng)) {
      const parsed = parseCoordsFromUrl(trimmedMapUrl) || extractCoordsFromGoogleMapsUrl(trimmedMapUrl);
      if (parsed) {
        resolvedLat = parsed.lat;
        resolvedLng = parsed.lng;
      }
    }
    const hasVerifiedCoords = isValidCambodiaCoordinates(resolvedLat, resolvedLng);
    const finalLat = hasVerifiedCoords ? resolvedLat : 0;
    const finalLng = hasVerifiedCoords ? resolvedLng : 0;
    const finalMapUrl =
      trimmedMapUrl && isValidGoogleMapsUrl(trimmedMapUrl)
        ? trimmedMapUrl
        : hasVerifiedCoords
          ? buildCanonicalGoogleMapsPinUrl(finalLat, finalLng, managingRestaurant.googlePlaceId)
          : '';
    const mapUrlChanged = trimmedMapUrl !== (managingRestaurant.mapUrl || '').trim();
    const isAdminEditing = Boolean(isAdmin);

    const finalCover = storeCoverPhoto.trim() || managingRestaurant.photoUrl;
    const finalGallery = [finalCover].filter(Boolean);
    const matchedCat =
      BUSINESS_CATEGORY_CATALOG.find((c) => c.value === storeBusinessCategory) ||
      (storeBusinessType === 'hotel' ? BUSINESS_CATEGORY_CATALOG[6] : BUSINESS_CATEGORY_CATALOG[0]);
    updateRestaurant({
      ...managingRestaurant,
      businessType: storeBusinessType,
      businessCategory: matchedCat.value,
      categoryKh: matchedCat.shortKh,
      categoryEn: matchedCat.shortEn,
      nameKh: storeNameKh.trim() || storeNameEn.trim(),
      nameEn: storeNameEn.trim() || storeNameKh.trim(),
      phone: storePhone.trim(),
      provinceKh: storeProvinceKh.trim() || managingRestaurant.provinceKh,
      addressKh: storeAddressKh.trim(),
      openingHoursKh: storeOpeningHours.trim(),
      priceLevel: storePriceLevel,
      descriptionKh: storeDescriptionKh.trim(),
      mapUrl: finalMapUrl,
      latitude: finalLat,
      longitude: finalLng,
      locationVerificationStatus: isAdminEditing
        ? (hasVerifiedCoords || Boolean(finalMapUrl) ? 'verified' : 'needs_admin_review')
        : mapUrlChanged
          ? 'needs_admin_review'
          : (hasVerifiedCoords ? 'verified' : 'needs_admin_review'),
      locationNeedsReview: isAdminEditing
        ? (!hasVerifiedCoords && !finalMapUrl)
        : (mapUrlChanged || !hasVerifiedCoords),
      locationVerifiedAt: isAdminEditing && (hasVerifiedCoords || Boolean(finalMapUrl)) ? new Date().toISOString() : managingRestaurant.locationVerifiedAt,
      locationReviewNote:
        !isAdminEditing && mapUrlChanged
          ? 'User updated Google Maps link — pending Admin location verification.'
          : hasVerifiedCoords || Boolean(finalMapUrl)
            ? undefined
            : 'Flagged for Admin location review — please verify exact GPS coordinates.',
      photoUrl: finalCover,
      profileImage: finalCover,
      foodImages: [],
      galleryPhotos: finalGallery,
      promoVideoUrl: isPremiumActive ? (storePromoVideoUrl.trim() || undefined) : managingRestaurant.promoVideoUrl,
      telegramUrl: storeTelegramUrl.trim() || undefined,
      facebookUrl: storeFacebookUrl.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });

    setStatusBanner({
      type: 'success',
      text: tr(
        language,
        `✅ បានរក្សាទុកព័ត៌មានហាង "${storeNameKh.trim() || storeNameEn.trim()}" ដោយជោគជ័យ!`,
        `✅ Saved restaurant info for "${storeNameEn.trim() || storeNameKh.trim()}"!`,
        `✅ 已成功保存店铺 "${storeNameEn.trim() || storeNameKh.trim()}" 的信息！`
      ),
    });
    modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSavePhotosOnly = () => {
    const finalCover = storeCoverPhoto.trim() || storeGalleryPhotos[0] || managingRestaurant.photoUrl;
    const cappedGallery = [finalCover].filter(Boolean);
    updateRestaurant({
      ...managingRestaurant,
      photoUrl: finalCover,
      profileImage: finalCover,
      foodImages: [],
      galleryPhotos: cappedGallery,
      updatedAt: new Date().toISOString(),
    });
    setStatusBanner({
      type: 'success',
      text: tr(
        language,
        `✅ បានរក្សាទុករូបភាពហាងចំនួន ${cappedGallery.length} សន្លឹកដោយជោគជ័យ!`,
        `✅ Saved ${cappedGallery.length} restaurant photos successfully!`,
        `✅ 已成功保存 ${cappedGallery.length} 张店铺照片！`
      ),
    });
    modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddGalleryPhoto = (url: string) => {
    if (!url.trim()) return;
    if (storeGalleryPhotos.length >= 30) {
      showToast(isKm ? 'អាចបន្ថែម រូបភាពរបស់ខ្ញុំ អតិបរមា ៣០ សន្លឹក!' : 'Max 30 photos allowed!', 'warning');
      return;
    }
    if (!storeGalleryPhotos.includes(url.trim())) {
      setStoreGalleryPhotos([...storeGalleryPhotos, url.trim()]);
    }
    setNewGalleryInput('');
  };

  const handleRemoveGalleryPhoto = (index: number) => {
    setStoreGalleryPhotos(storeGalleryPhotos.filter((_, i) => i !== index));
  };

  const handleCopyShareLink = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareableUrl).then(() => {
        setCopiedLink(true);
        showToast(isKm ? 'បានចម្លងតំណភ្ជាប់ហាងជោគជ័យ!' : 'Restaurant link copied!', 'success');
        setTimeout(() => setCopiedLink(false), 2000);
      }).catch(() => {
        showToast(isKm ? 'បានចម្លងតំណភ្ជាប់ហាងជោគជ័យ!' : 'Restaurant link copied!', 'success');
      });
    } else {
      setCopiedLink(true);
      showToast(isKm ? 'បានចម្លងតំណភ្ជាប់ហាងជោគជ័យ!' : 'Restaurant link copied!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDirectShare = () => {
    if (navigator.share) {
      navigator.share({
        title: isKm ? managingRestaurant.nameKh : managingRestaurant.nameEn,
        text: isKm 
          ? `សូមណែនាំហាងអាហារឆ្ងាញ់៖ ${managingRestaurant.nameKh} 📍 ${managingRestaurant.addressKh} 📞 ${managingRestaurant.phone}`
          : `Check out ${managingRestaurant.nameEn}!`,
        url: shareableUrl,
      }).catch(() => {});
    } else {
      handleCopyShareLink();
    }
  };

  const handleUpgradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionRef.trim()) {
      showToast(
        isKm ? 'សូមបញ្ចូលលេខកូដប្រតិបត្តិការធនាគារ (Transaction Ref)!' : 'Please enter bank transaction reference!',
        'warning'
      );
      return;
    }
    upgradeRestaurantToPremium(managingRestaurant.id, transactionRef.trim(), paymentMethod);
    setTransactionRef('');
    setIsManageMenuModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Active Shop Identity & Shop Switcher */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#047857] bg-[#064E3B] text-white space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-emerald-500/20 border border-emerald-400/40 shrink-0 flex items-center justify-center">
                {managingRestaurant.photoUrl ? (
                  <img
                    src={managingRestaurant.photoUrl}
                    alt={managingRestaurant.nameKh}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="w-5 h-5 text-emerald-200" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="font-moul text-xs sm:text-sm text-white leading-snug truncate">
                    {storeBusinessType === 'hotel' || isHotelBusinessRecord(currentRest)
                      ? (isKm ? 'គ្រប់គ្រងសណ្ឋាគារ / ផ្ទះសំណាក់ VIP របស់ខ្ញុំ' : 'Manage My VIP Hotel / Stay')
                      : (isKm ? 'គ្រប់គ្រងហាង VIP របស់ខ្ញុំ' : 'Manage My VIP Store')}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px]">
                    ID: {managingRestaurant.id.length > 14 ? managingRestaurant.id.slice(-10) : managingRestaurant.id}
                  </span>
                </div>
                <p className="text-xs font-bold text-amber-200 font-khmer truncate">
                  {storeBusinessType === 'hotel' || isHotelBusinessRecord(currentRest) ? '🏨' : '🏪'} {isKm ? managingRestaurant.nameKh : (managingRestaurant.nameEn || managingRestaurant.nameKh)}
                </p>
              </div>
            </div>
            <button
              onClick={handleCloseModal}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition shrink-0 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Multi-Shop Switcher Bar (Ensures Owner/Admin always edits the exact intended shop_id) */}
          {switchableShops.length > 0 && (
            <div className="pt-2 border-t border-emerald-700/70 flex flex-col gap-1.5 font-khmer">
              <div className="flex items-center justify-between text-[10px] text-emerald-200 flex-wrap gap-1">
                <span>
                  {isKm
                    ? `ជ្រើសរើសហាង (${storeQuota.usedStoresCount}/${storeQuota.totalAllowedStores === 999 ? '∞' : storeQuota.totalAllowedStores} ហាង)៖`
                    : `Select store (${storeQuota.usedStoresCount}/${storeQuota.totalAllowedStores === 999 ? '∞' : storeQuota.totalAllowedStores} stores):`}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      (window as any).__kft_vip_store_initial_mode = { mode: "replace", storeId: managingRestaurant.id };
                      setIsManageMenuModalOpen(false);
                      setIsVipAddRestaurantModalOpen(true);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-emerald-400/20 hover:bg-emerald-400/30 border border-emerald-300/40 text-emerald-100 font-bold text-[10px] transition cursor-pointer"
                  >
                    {isKm ? '🔄 ប្តូរហាងថ្មី ($0)' : '🔄 Replace ($0)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      (window as any).__kft_vip_store_initial_mode = { mode: "create" };
                      setIsManageMenuModalOpen(false);
                      setIsVipAddRestaurantModalOpen(true);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 text-amber-200 font-bold text-[10px] transition cursor-pointer"
                  >
                    {isKm ? '+ បន្ថែមហាងថ្មី' : '+ Add New Shop'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {switchableShops.map((shop) => {
                  const active = shop.id === managingRestaurant.id;
                  return (
                    <button
                      key={shop.id}
                      type="button"
                      onClick={() => {
                        setActiveManagedShopId(shop.id);
                        setManagingRestaurant(shop);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                        active
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-sm ring-2 ring-white/50'
                          : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-100 border border-emerald-600/50'
                      }`}
                    >
                      <img
                        src={shop.photoUrl}
                        alt={shop.nameKh}
                        loading="lazy"
                        decoding="async"
                        className="w-4 h-4 rounded-full object-cover shrink-0"
                      />
                      <span className="max-w-[130px] truncate">
                        {isKm ? shop.nameKh : (shop.nameEn || shop.nameKh)}
                      </span>
                      {active && <span className="text-[9px] font-black">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* If Unauthorized: Display VIP Barrier */}
        {!isAuthorized ? (
          <div className="p-6 text-center space-y-4 font-khmer flex-1 overflow-y-auto">
            {!currentUser ? (
              <div className="py-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#064E3B] dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? 'សូមចូលគណនីជាមុនសិន' : 'Please Sign In First'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
                  {isKm
                    ? 'លោកអ្នកត្រូវចូលគណនីដែលមានសិទ្ធិ VIP ដើម្បីគ្រប់គ្រងព័ត៌មានហាងរបស់អ្នក។'
                    : 'Please sign in to your approved VIP account to manage your restaurant.'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsManageMenuModalOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    {isKm ? 'ចូលគណនីឥឡូវនេះ' : 'Sign In Now'}
                  </button>
                </div>
              </div>
            ) : vipState === 'pending_vip' ? (
              <div className="py-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto shadow-md ring-4 ring-amber-400/20">
                  <Clock className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold font-sans">
                  PENDING_ADMIN_APPROVAL
                </span>
                <h3 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? '⏳ កំពុងរង់ចាំ Admin ពិនិត្យ និងអនុម័ត' : '⏳ Awaiting Admin Approval'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  {isKm
                    ? 'ការស្នើសុំសមាជិកភាព VIP របស់អ្នកត្រូវបានកត់ត្រា និងកំពុងស្ថិតក្នុងការពិនិត្យផ្ទៀងផ្ទាត់ដោយ Administrator។ មុខងារគ្រប់គ្រងហាងនឹងបើកដំណើរការភ្លាមៗក្រោយពេលទទួលបានការអនុម័ត!'
                    : 'Your VIP subscription request is currently pending Admin verification. Restaurant management will unlock immediately upon approval!'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                  >
                    {isKm ? 'យល់ព្រម (បិទ)' : 'Close'}
                  </button>
                </div>
              </div>
            ) : vipState === 'expired_vip' ? (
              <div className="py-8 space-y-3">
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
                    ? `សមាជិកភាព VIP របស់លោកអ្នកបានផុតកំណត់កាលបរិច្ឆេទហើយ។ សូមបន្តកញ្ចប់ VIP ($${dynamicPlansMap.quarterly.priceUsd.toFixed(2)} / ${dynamicPlansMap.quarterly.durationDays} ថ្ងៃ ឬ $${dynamicPlansMap.annual.priceUsd.toFixed(2)} / ${dynamicPlansMap.annual.durationDays} ថ្ងៃ) ដើម្បីបន្តគ្រប់គ្រងហាង VIP របស់អ្នក។`
                    : `Your VIP membership has expired. Please renew your VIP membership ($${dynamicPlansMap.quarterly.priceUsd.toFixed(2)} / ${dynamicPlansMap.quarterly.durationDays} days or $${dynamicPlansMap.annual.priceUsd.toFixed(2)} / ${dynamicPlansMap.annual.durationDays} days) to continue managing your VIP restaurant.`}
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsManageMenuModalOpen(false);
                      openUpgradeVipModal(true);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                  >
                    {isKm ? '✨ បន្តកញ្ចប់ VIP ឥឡូវនេះ' : '✨ Renew VIP Now'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                  >
                    {isKm ? 'បិទ' : 'Close'}
                  </button>
                </div>
              </div>
            ) : !isOwner && !isAdmin ? (
              <div className="py-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto shadow-md">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? '⛔ គ្មានសិទ្ធិគ្រប់គ្រងហាងនេះទេ' : '⛔ Unauthorized Restaurant'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  {isKm
                    ? 'មានតែម្ចាស់ហាងផ្ទាល់ដែលមានសមាជិកភាព VIP សកម្ម ឬ Admin ប៉ុណ្ណោះដែលអាចគ្រប់គ្រងហាងនេះបាន។'
                    : 'Only the approved VIP owner or Admin can manage this restaurant.'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                  >
                    {isKm ? 'បិទ' : 'Close'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center mx-auto shadow-lg ring-4 ring-amber-400/20">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="font-moul text-sm text-slate-900 dark:text-white">
                  {isKm ? '🔒 សម្រាប់តែសមាជិក VIP ដែលបានអនុម័ត' : '🔒 Approved VIP Only'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  {isKm
                    ? `ផ្ទាំងគ្រប់គ្រងម្ចាស់ហាង VIP គឺអនុញ្ញាតជូនតែសមាជិក VIP ដែលបានបង់ប្រាក់ និងទទួលបានការអនុម័តពី Admin ប៉ុណ្ណោះ។ សូមដំឡើងទៅកញ្ចប់ VIP ($${dynamicPlansMap.quarterly.priceUsd.toFixed(2)} / ${dynamicPlansMap.quarterly.durationDays} ថ្ងៃ ឬ $${dynamicPlansMap.annual.priceUsd.toFixed(2)} / ${dynamicPlansMap.annual.durationDays} ថ្ងៃ) ដើម្បីទទួលបានអត្ថប្រយោជន៍ទាំង ${dynamicBenefits.length}!`
                    : `Owner management is reserved exclusively for admin-approved VIP subscribers. Upgrade to VIP ($${dynamicPlansMap.quarterly.priceUsd.toFixed(2)} / ${dynamicPlansMap.quarterly.durationDays} days or $${dynamicPlansMap.annual.priceUsd.toFixed(2)} / ${dynamicPlansMap.annual.durationDays} days) to manage your VIP restaurant!`}
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsManageMenuModalOpen(false);
                      openUpgradeVipModal();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                  >
                    {isKm ? '👑 ដំឡើងទៅកញ្ចប់ VIP ឥឡូវនេះ' : '👑 Upgrade to VIP Now'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                  >
                    {isKm ? 'បិទ' : 'Close'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
        {/* AI Category Verification Status Banner (Pending Admin Review or Rejected) */}
        {(currentRest.status === 'pending' || currentRest.status === 'rejected') && (
          <div
            className={`px-4 py-2.5 border-b font-khmer text-xs flex items-start gap-2.5 ${
              currentRest.status === 'pending'
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            {currentRest.status === 'pending' ? (
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5 flex-1">
              <p className="font-bold">
                {currentRest.status === 'pending'
                  ? storeBusinessType === 'hotel' || isHotelBusinessRecord(currentRest)
                    ? isKm
                      ? '⏳ កំពុងរង់ចាំ Admin ពិនិត្យសណ្ឋាគារ / កន្លែងស្នាក់នៅ (Pending Admin Hotel Review)'
                      : '⏳ Pending Admin Hotel / Accommodation Review'
                    : isKm
                      ? '⏳ កំពុងរង់ចាំ Admin ពិនិត្យប្រភេទអាជីវកម្មម្ហូបអាហារ (Pending Admin Review)'
                      : '⏳ Pending Admin Food-Category Review'
                  : storeBusinessType === 'hotel' || isHotelBusinessRecord(currentRest)
                    ? isKm
                      ? '🚫 សំណើសណ្ឋាគារ / ផ្ទះសំណាក់ត្រូវបានបដិសេធ'
                      : '🚫 Hotel / Accommodation Submission Rejected'
                    : isKm
                      ? '🚫 សំណើហាងត្រូវបានបដិសេធ (មិនមែនជាហាងលក់ម្ហូបអាហារចម្អិនស្រាប់)'
                      : '🚫 Store Rejected (Non-Food Business)'}
              </p>
              <p className="text-[11px] leading-relaxed">
                {storeBusinessType === 'hotel' || isHotelBusinessRecord(currentRest)
                  ? isKm
                    ? `ប្រភេទអាជីវកម្ម៖ ${inferBusinessTypeAndCategory(currentRest).labelKh} • សូមបំពេញព័ត៌មានសណ្ឋាគារ រូបភាព ១ សន្លឹក និងលីង Google Maps ឱ្យបានច្បាស់លាស់ ដើម្បីឱ្យ Admin ត្រួតពិនិត្យ និងអនុម័តដាក់បង្ហាញក្នុងផ្នែកសណ្ឋាគារ។`
                    : `Category: ${inferBusinessTypeAndCategory(currentRest).labelEn} • Please provide clear hotel details, 1 photo, and Google Maps link for Admin review.`
                  : currentRest.aiCategoryVerification
                    ? isKm
                      ? currentRest.aiCategoryVerification.reasonKh
                      : currentRest.aiCategoryVerification.reasonEn
                    : isKm
                      ? 'សូមបំពេញព័ត៌មានហាង រូបភាពហាង ១ សន្លឹក និងលីង Google Maps ឱ្យបានច្បាស់លាស់ ដើម្បីឱ្យ Admin ត្រួតពិនិត្យ និងអនុម័តដាក់បង្ហាញជាសាធារណៈ។'
                      : 'Please provide clear store info, single shop photo, and Google Maps link for Admin approval.'}
              </p>
            </div>
          </div>
        )}

        {/* Clearly Separated Management Sections */}
        <div className={`grid ${isIosAppStore ? 'grid-cols-3' : 'grid-cols-4'} bg-slate-100 dark:bg-slate-800/80 p-1 border-b border-slate-200 dark:border-slate-700 text-center font-khmer gap-0.5`}>
          <button
            onClick={() => { setMainTab('info'); setStatusBanner(null); }}
            className={`py-2 px-1 text-[10px] sm:text-[11px] font-bold rounded-xl transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              mainTab === 'info'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span className="leading-tight">{isKm ? '១. ព័ត៌មានហាង' : '1. Info'}</span>
          </button>

          <button
            onClick={() => { setMainTab('photos'); setStatusBanner(null); }}
            className={`py-2 px-1 text-[10px] sm:text-[11px] font-bold rounded-xl transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              mainTab === 'photos'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="leading-tight">{tr(language, '២. រូបភាពហាង', '2. Photo', '2. 照片')}</span>
          </button>

          <button
            onClick={() => { setMainTab('analytics'); setStatusBanner(null); }}
            className={`py-2 px-1 text-[10px] sm:text-[11px] font-bold rounded-xl transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              mainTab === 'analytics'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="leading-tight">{isKm ? '៣. ស្ថិតិ & ផ្កាយ' : '3. Stats'}</span>
          </button>

          {!isIosAppStore && (
            <button
              onClick={() => { setMainTab('membership'); setStatusBanner(null); }}
              className={`py-2 px-1 text-[10px] sm:text-[11px] font-bold rounded-xl transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                mainTab === 'membership'
                  ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span className="leading-tight">{isKm ? '៤. កញ្ចប់ហាង' : '4. Shop Plan'}</span>
            </button>
          )}
        </div>

        {/* Status Bar: Separate VIP Status, Verification, and Customer Rating */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs font-khmer flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isPremiumActive ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#064E3B] text-white flex items-center gap-1 shadow-xs">
                <Award className="w-3 h-3 text-amber-300" />
                <span>{isKm ? 'សមាជិក VIP' : 'VIP Active'}</span>
              </span>
            ) : isExpired ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>⏳ {isKm ? 'ផុតកំណត់ VIP' : 'VIP Expired'}</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                🏷️ {isKm ? 'ហាងធម្មតា' : 'Standard'}
              </span>
            )}

            {/* Genuine Customer Rating Pill (Strictly separated from VIP status) */}
            {ratingSummary.hasReviews ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/60 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>
                  {ratingSummary.averageRating.toFixed(1)} ({ratingSummary.reviewCount} {isKm ? 'ការវាយតម្លៃ' : 'reviews'})
                </span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {isKm ? 'មិនទាន់មានការវាយតម្លៃ' : 'No ratings yet'}
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-[#064E3B] dark:text-emerald-400">
              {tr(language, '១ រូបភាពហាង • Google Maps', '1 Shop Photo • Google Maps', '1张店铺图 • Google Maps')}
            </span>
          </div>
        </div>

        {/* Clear Success / Error Feedback Banner */}
        {statusBanner && (
          <div
            className={`mx-4 mt-3 p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs font-khmer ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-900 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/50 border-red-400 text-red-800 dark:text-red-200'
            }`}
          >
            <span className="font-bold">{statusBanner.text}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="p-1 rounded-lg hover:bg-black/10 text-current shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body Content */}
        <div ref={modalBodyRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar text-xs">

          {/* TAB 1: STORE INFORMATION */}
          {mainTab === 'info' && (
            <form onSubmit={handleSaveStoreInfo} noValidate className="space-y-3 font-khmer">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#064E3B] dark:text-emerald-400 shrink-0" />
                    <span className="text-[11px] text-[#064E3B] dark:text-emerald-300 leading-snug font-bold">
                      {storeBusinessType === 'hotel'
                        ? isKm
                          ? '🏨 កែប្រែព័ត៌មានសណ្ឋាគារ / ផ្ទះសំណាក់ ឬប្តូរអាជីវកម្មថ្មី (ឥតគិតថ្លៃ $0.00)'
                          : '🏨 Edit Hotel / Stay Info or Replace Business (Free $0.00)'
                        : isKm 
                          ? '🏪 កែប្រែព័ត៌មានហាង ឬប្តូរហាងថ្មី (ឥតគិតថ្លៃ $0.00)' 
                          : '🏪 Edit Store Info or Replace Store (Free $0.00)'}
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-[11px] shrink-0 shadow cursor-pointer"
                  >
                    {isKm ? '💾 រក្សាទុក' : '💾 Save'}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-emerald-200/70 dark:border-emerald-800/60 text-[10px] text-slate-600 dark:text-slate-300">
                  <span>
                    {storeBusinessType === 'hotel'
                      ? isKm
                        ? 'អ្នកអាចកែប្រែព័ត៌មានសណ្ឋាគារនេះ ឬប្តូរប្រភេទអាជីវកម្មដោយមិនបាច់បង់ប្រាក់បន្ថែមឡើយ ($0)។'
                        : 'You can edit this hotel or replace it with another business at zero additional cost ($0).'
                      : isKm
                        ? 'អ្នកអាចកែប្រែព័ត៌មានហាងនេះ ឬប្តូរដាក់ហាងថ្មីជំនួសហាងនេះដោយមិនបាច់បង់ប្រាក់បន្ថែមឡើយ ($0)។'
                        : 'You can edit this store or replace it with a brand-new store at zero additional cost ($0).'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      (window as any).__kft_vip_store_initial_mode = { mode: "replace", storeId: managingRestaurant.id };
                      setIsManageMenuModalOpen(false);
                      setIsVipAddRestaurantModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-400 text-[#064E3B] dark:text-emerald-300 font-bold text-[10px] shrink-0 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    {isKm ? '🔄 ប្តូរហាងថ្មីជំនួស ($0)' : '🔄 Replace Store ($0)'}
                  </button>
                </div>
              </div>

              {/* Business Type & Exact Sub-Category Selector */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <label className="block font-bold text-[#0F172A] dark:text-slate-200 text-xs">
                  {isKm ? '🏷️ ប្រភេទអាជីវកម្ម (ហាងអាហារ ឬ សណ្ឋាគារ / កន្លែងស្នាក់នៅ) *' : '🏷️ Business Type & Category *'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStoreBusinessType('restaurant');
                      if (['hotel', 'resort', 'boutique_villa', 'guesthouse'].includes(storeBusinessCategory)) {
                        setStoreBusinessCategory('restaurant');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      storeBusinessType === 'restaurant'
                        ? 'bg-[#064E3B] text-white border-[#059669] shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span>🍽️</span>
                    <span>{isKm ? 'ហាងអាហារ / កាហ្វេ' : 'Food / Restaurant'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStoreBusinessType('hotel');
                      if (!['hotel', 'resort', 'boutique_villa', 'guesthouse'].includes(storeBusinessCategory)) {
                        setStoreBusinessCategory('hotel');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      storeBusinessType === 'hotel'
                        ? 'bg-[#064E3B] text-white border-[#059669] shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span>🏨</span>
                    <span>{isKm ? 'សណ្ឋាគារ / ផ្ទះសំណាក់' : 'Hotel / Stay'}</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {BUSINESS_CATEGORY_CATALOG.filter((c) => c.businessType === storeBusinessType).map((cat) => {
                    const active = storeBusinessCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setStoreBusinessCategory(cat.value)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          active
                            ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                        }`}
                      >
                        {isKm ? cat.labelKh : cat.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    {storeBusinessType === 'hotel'
                      ? (isKm ? '១. ឈ្មោះសណ្ឋាគារ / ផ្ទះសំណាក់ (ជាភាសាខ្មែរ) *' : '1. Hotel / Stay Name (Khmer) *')
                      : (isKm ? '១. ឈ្មោះហាង (ជាភាសាខ្មែរ) *' : '1. Restaurant Name (Khmer) *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={storeNameKh}
                    onChange={e => setStoreNameKh(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    {storeBusinessType === 'hotel'
                      ? (isKm ? '២. ឈ្មោះសណ្ឋាគារ / ផ្ទះសំណាក់ (ជាភាសាអង់គ្លេស)' : '2. Hotel / Stay Name (English)')
                      : (isKm ? '២. ឈ្មោះហាង (ជាភាសាអង់គ្លេស)' : '2. Restaurant Name (English)')}
                  </label>
                  <input
                    type="text"
                    value={storeNameEn}
                    onChange={e => setStoreNameEn(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    {isKm ? '៣. លេខទូរស័ព្ទទំនាក់ទំនង *' : '3. Contact Phone *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={storePhone}
                    onChange={e => setStorePhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    {isKm ? '៤. ម៉ោងបើកដំណើរការ' : '4. Opening Hours'}
                  </label>
                  <input
                    type="text"
                    value={storeOpeningHours}
                    onChange={e => setStoreOpeningHours(e.target.value)}
                    placeholder="ឧ. ០៧:០០ ព្រឹក - ០៩:០០ យប់"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    {isKm ? '៥. ខេត្ត / រាជធានី' : '5. Province / City'}
                  </label>
                  <input
                    type="text"
                    value={storeProvinceKh}
                    onChange={e => setStoreProvinceKh(e.target.value)}
                    placeholder="ឧ. រាជធានីភ្នំពេញ ឬ សៀមរាប"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                  {isKm ? '៧. អាសយដ្ឋានហាងលម្អិត *' : '7. Detailed Address *'}
                </label>
                <input
                  type="text"
                  required
                  value={storeAddressKh}
                  onChange={e => setStoreAddressKh(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStoreCheckInOpen(true)}
                    className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <span>📍 កំណត់ទីតាំងហាង (Check In)</span>
                  </button>
                  {isValidCambodiaCoordinates(storeLatitude, storeLongitude) ? (
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                      ✅ GPS: {storeLatitude.toFixed(6)}, {storeLongitude.toFixed(6)}
                    </span>
                  ) : (
                    <span className="text-[11px] font-khmer text-amber-700 dark:text-amber-300 font-bold">
                      {tr(
                        language,
                        '📍 រង់ចាំការផ្ទៀងផ្ទាត់ GPS (Needs GPS Review)',
                        '📍 Needs Verified GPS Coordinates',
                        '📍 待核实 GPS 坐标'
                      )}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                      Latitude (9.4 – 14.7)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={storeLatitude || ''}
                      placeholder="e.g. 11.553152"
                      onChange={e => setStoreLatitude(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-[#0F172A] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                      Longitude (102.3 – 107.7)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={storeLongitude || ''}
                      placeholder="e.g. 104.928957"
                      onChange={e => setStoreLongitude(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-[#0F172A] dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                  {isKm ? '៨. ការពិពណ៌នាអំពីហាង និងមុខម្ហូបពិសេស' : '8. About Your Shop & Specialties'}
                </label>
                <textarea
                  rows={2}
                  value={storeDescriptionKh}
                  onChange={e => setStoreDescriptionKh(e.target.value)}
                  placeholder="រៀបរាប់ពីមុខម្ហូបប្រចាំហាង បរិយាកាស និងសេវាកម្ម..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-none focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                  {isKm ? '៩. លីង Google Maps (Google Maps Link)' : '9. Google Maps Link'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={storeMapUrl}
                    placeholder="https://maps.app.goo.gl/... ឬ https://www.google.com/maps/..."
                    onChange={e => {
                      const val = e.target.value;
                      setStoreMapUrl(val);
                      const parsed = extractCoordsFromGoogleMapsUrl(val);
                      if (parsed && isValidCambodiaCoordinates(parsed.lat, parsed.lng)) {
                        setStoreLatitude(parsed.lat);
                        setStoreLongitude(parsed.lng);
                      }
                    }}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white font-mono text-[11px]"
                  />
                  {storeMapUrl.trim() && isValidGoogleMapsUrl(storeMapUrl.trim()) && (
                    <a
                      href={storeMapUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {isKm ? 'បើកផែនទី' : 'Open Map'}
                    </a>
                  )}
                </div>
                {storeMapUrl.trim() && (
                  <p
                    className={`text-[11px] font-bold mt-1 ${
                      isValidGoogleMapsUrl(storeMapUrl.trim()) ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isValidGoogleMapsUrl(storeMapUrl.trim())
                      ? isKm
                        ? '✅ លីង Google Maps ត្រឹមត្រូវ (ត្រូវឆ្លងកាត់ការត្រួតពិនិត្យពី Admin)'
                        : '✅ Valid Google Maps link (Subject to Admin verification)'
                      : isKm
                        ? '⚠️ សូមបញ្ចូលលីង Google Maps ឱ្យបានត្រឹមត្រូវ (ឧ. https://maps.app.goo.gl/...)'
                        : '⚠️ Please enter a valid Google Maps link'}
                  </p>
                )}
              </div>

              {/* VIP Feature: Food Video Reels (TikTok / Facebook / YouTube Video Link) */}
              <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-slate-800 rounded-2xl border border-amber-300 dark:border-amber-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <span>🎥</span>
                    <span>{isKm ? 'វីដេអូផ្សព្វផ្សាយហាង Video Reels (TikTok / Facebook / YouTube)' : 'Store Video Reels (TikTok / FB / YouTube)'}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px]">
                    VIP UNLOCKED
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={storePromoVideoUrl}
                    onChange={e => setStorePromoVideoUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@.../video/... ឬ Facebook/YouTube link"
                    className="flex-1 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-mono text-[#0F172A] dark:text-white"
                  />
                  {storePromoVideoUrl.trim() && (
                    <a
                      href={storePromoVideoUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{isKm ? 'មើលវីដេអូ' : 'Preview'}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* VIP Feature: Direct Telegram & Facebook Contact Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    {isKm ? '💬 តំណភ្ជាប់ Telegram ហាង' : '💬 Store Telegram Link'}
                  </label>
                  <input
                    type="text"
                    value={storeTelegramUrl}
                    onChange={e => setStoreTelegramUrl(e.target.value)}
                    placeholder="https://t.me/your_store"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-[#0F172A] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    {isKm ? '📘 តំណភ្ជាប់ Facebook Page ហាង' : '📘 Store Facebook Page Link'}
                  </label>
                  <input
                    type="text"
                    value={storeFacebookUrl}
                    onChange={e => setStoreFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/your_store"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-[#0F172A] dark:text-white"
                  />
                </div>
              </div>

              {/* Benefit #1: Shop Menu Items Manager (ម៉ឺនុយម្ហូបប្រចាំហាង) */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-slate-800/90 border border-emerald-300 dark:border-emerald-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
                    <span>🍽️</span>
                    <span>{isKm ? 'ម៉ឺនុយម្ហូបប្រចាំហាង (Shop Menu Items)' : 'Shop Menu Items'}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px]">
                    {(currentRest.menuItems || []).length} {isKm ? 'មុខ' : 'items'}
                  </span>
                </div>

                {(currentRest.menuItems || []).length > 0 && (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                    {(currentRest.menuItems || []).map((mi) => (
                      <div
                        key={mi.id}
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {mi.nameKh || mi.nameEn}
                            {mi.nameEn && mi.nameKh && mi.nameEn !== mi.nameKh ? ` • ${mi.nameEn}` : ''}
                          </div>
                          <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                            {typeof mi.priceUsd === 'number' && mi.priceUsd > 0 ? `$${mi.priceUsd.toFixed(2)}` : ''}
                            {mi.priceRiel ? ` (${mi.priceRiel.toLocaleString()}៛)` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteRestaurantMenuItem(currentRest.id, mi.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white transition cursor-pointer shrink-0"
                          title={isKm ? 'លុបមុខម្ហូប' : 'Delete dish'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={dishNameKh}
                    onChange={(e) => setDishNameKh(e.target.value)}
                    placeholder={isKm ? 'ឈ្មោះម្ហូប (ឧ. អាម៉ុកត្រី)' : 'Dish name (Khmer/EN)'}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={dishNameEn}
                    onChange={(e) => setDishNameEn(e.target.value)}
                    placeholder={isKm ? 'ឈ្មោះអង់គ្លេស (ស្រេចចិត្ត)' : 'English name (optional)'}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={dishPriceUsd}
                      onChange={(e) => setDishPriceUsd(e.target.value)}
                      placeholder="$ USD"
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const kh = dishNameKh.trim();
                        const en = dishNameEn.trim();
                        if (!kh && !en) {
                          showToast(isKm ? 'សូមបញ្ចូលឈ្មោះមុខម្ហូបជាមុនសិន!' : 'Please enter a dish name!', 'warning');
                          return;
                        }
                        const usd = Math.max(0, Number(dishPriceUsd) || 0);
                        const ok = addRestaurantMenuItem(currentRest.id, {
                          nameKh: kh || en,
                          nameEn: en || kh,
                          priceUsd: usd,
                          priceRiel: usd > 0 ? Math.round(usd * 4100) : 0,
                          photoUrl: '',
                          isSignature: true,
                        });
                        if (ok) {
                          setDishNameKh('');
                          setDishNameEn('');
                          setDishPriceUsd('');
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isKm ? 'បន្ថែម' : 'Add'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold shadow-md shadow-emerald-950/20 transition active:scale-[0.98] cursor-pointer"
                >
                  {isKm ? '💾 រក្សាទុកព័ត៌មានហាងទាំងអស់' : '💾 Save All Store Information'}
                </button>

                {/* Safe 2-Step Delete Store Confirmation */}
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-red-800 dark:text-red-300">
                      <span className="font-bold block">
                        {isKm ? `🗑️ លុបហាង "${managingRestaurant.nameKh}" នេះចេញ?` : `🗑️ Delete "${managingRestaurant.nameEn || managingRestaurant.nameKh}"?`}
                      </span>
                      <span className="text-[10px] opacity-85">
                        {isKm
                          ? 'ការលុបហាងនឹងដកហាងនេះចេញពីបញ្ជី។ សូមបញ្ជាក់មុនពេលលុប។'
                          : 'Deleting removes this store listing permanently. Please confirm before deleting.'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteRestaurant(managingRestaurant.id)}
                      className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isKm ? 'លុបហាង' : 'Delete Shop'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: SINGLE SHOP PHOTO & ADMIN REVIEW WORKFLOW */}
          {mainTab === 'photos' && (
            <div className="space-y-3.5 font-khmer">
              {/* Hidden Single File Inputs */}
              <input
                ref={shopPhotoFileRef}
                type="file"
                accept="image/*"
                onChange={handleSingleShopPhotoFileChange}
                className="hidden"
              />
              <input
                ref={shopPhotoCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleSingleShopPhotoFileChange}
                className="hidden"
              />

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-xs text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4" />
                    <span>
                      {tr(
                        language,
                        '📸 រូបភាពតំណាងហាង (អនុញ្ញាតតែ ១ សន្លឹកគត់)',
                        '📸 Single Shop Photo (1 Storefront Photo Only)',
                        '📸 店铺代表照片（仅限 1 张）'
                      )}
                    </span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                    1/1
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {tr(
                    language,
                    'រូបភាពដែលបង្ហោះត្រូវតែជារូបភាពតំណាងឱ្យហាងតែប៉ុណ្ណោះ (មិនមានការបង្ហោះរូបមុខម្ហូបនីមួយៗទេ)។ រាល់ការប្តូររូបភាពហាងថ្មីត្រូវឆ្លងកាត់ការពិនិត្យ និងអនុម័តពី Admin ជាមុនសិន។',
                    'The uploaded photo must represent the shop only (no individual food/menu photos). Any replacement photo requires Admin review and approval before replacing your active photo.',
                    '上传的照片必须仅代表店铺（不支持单道菜品照片）。更换店铺照片需经管理员审核批准后才会生效。'
                  )}
                </p>
              </div>

              {/* Current Active Approved Shop Photo Card */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {tr(
                        language,
                        'រូបភាពហាងដែលបានអនុម័ត និងកំពុងបង្ហាញបច្ចុប្បន្ន',
                        'Currently Active Approved Shop Photo',
                        '当前已批准并公开展示的店铺照片'
                      )}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                    {tr(language, 'កំពុងបង្ហាញ (Active)', 'Active', '生效中')}
                  </span>
                </div>
                <div className="relative w-full h-44 rounded-2xl overflow-hidden border-2 border-emerald-500/60 bg-slate-100 dark:bg-slate-900">
                  {currentRest.photoUrl ? (
                    <img
                      src={currentRest.photoUrl}
                      alt={currentRest.nameKh}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <DefaultShopIcon className="w-full h-full" />
                  )}
                </div>
              </div>

              {/* Pending / Reviewed Shop Photo Replacement Status Card (Item 5B) */}
              {currentRest.pendingPhotoReplacement && (
                <div
                  id="kft-shop-photo-replacement-status"
                  className={`p-3.5 rounded-2xl border-2 space-y-2.5 ${
                    currentRest.pendingPhotoReplacement.status === 'pending'
                      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400'
                      : currentRest.pendingPhotoReplacement.status === 'approved'
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400'
                      : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        {tr(
                          language,
                          'ស្ថានភាពសំណើប្តូររូបភាពហាងថ្មី',
                          'Shop Photo Replacement Status',
                          '店铺照片更换审核状态'
                        )}
                      </span>
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                        currentRest.pendingPhotoReplacement.status === 'pending'
                          ? 'bg-amber-400 text-slate-950'
                          : currentRest.pendingPhotoReplacement.status === 'approved'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {currentRest.pendingPhotoReplacement.status === 'pending'
                        ? tr(language, '⏳ កំពុងរង់ចាំការអនុម័តពី Admin (Pending Admin Approval)', '⏳ Pending Admin Approval', '⏳ 等待管理员审核批准')
                        : currentRest.pendingPhotoReplacement.status === 'approved'
                        ? tr(language, '✅ បានអនុម័តដោយ Admin (Approved)', '✅ Approved by Admin', '✅ 管理员已批准')
                        : tr(language, '🚫 ត្រូវបានបដិសេធដោយ Admin (Rejected)', '🚫 Rejected by Admin', '🚫 管理员已拒绝')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-amber-500 shrink-0 bg-slate-200 dark:bg-slate-800">
                      <img
                        src={currentRest.pendingPhotoReplacement.newPhotoUrl}
                        alt="New replacement photo"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1 text-[11px]">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {tr(language, '📅 ថ្ងៃដាក់ស្នើ៖ ', '📅 Submitted Date: ', '📅 提交时间：')}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {currentRest.pendingPhotoReplacement.submittedAt.replace('T', ' ').slice(0, 16)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {tr(language, '🕒 ថ្ងៃពិនិត្យ៖ ', '🕒 Review Date: ', '🕒 审核时间：')}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {currentRest.pendingPhotoReplacement.reviewedAt
                            ? currentRest.pendingPhotoReplacement.reviewedAt.replace('T', ' ').slice(0, 16)
                            : tr(language, 'កំពុងរង់ចាំការពិនិត្យ', 'Awaiting Admin Review', '等待审核')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {tr(language, '⚖️ ការសម្រេចរបស់ Admin៖ ', '⚖️ Admin Decision: ', '⚖️ 管理员决定：')}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {currentRest.pendingPhotoReplacement.adminDecision === 'approved'
                            ? tr(language, 'អនុម័ត (Approved — បានជំនួសរូបភាពថ្មី)', 'Approved (Photo Replaced)', '已批准（已替换新照片）')
                            : currentRest.pendingPhotoReplacement.adminDecision === 'rejected'
                            ? tr(language, 'បដិសេធ (Rejected — រក្សារូបភាពដើមដដែល)', 'Rejected (Original Photo Kept)', '已拒绝（保留原照片）')
                            : tr(language, 'កំពុងរង់ចាំការអនុម័ត (Pending Admin Approval)', 'Pending Admin Approval', '等待管理员批准')}
                        </span>
                      </div>
                      {currentRest.pendingPhotoReplacement.rejectionReason && (
                        <p className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold pt-0.5">
                          💬 {currentRest.pendingPhotoReplacement.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Direct Admin Review Controls if currentUser is Admin */}
                  {isAdmin && currentRest.pendingPhotoReplacement.status === 'pending' && (
                    <div className="pt-2 border-t border-amber-300/70 dark:border-amber-800/70 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => approveShopPhotoReplacement(currentRest.id)}
                        className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{tr(language, '✅ អនុម័តរូបភាពថ្មី (Admin)', '✅ Approve New Photo', '✅ 批准新照片')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectShopPhotoReplacement(currentRest.id)}
                        className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>{tr(language, '🚫 បដិសេធរូបភាពថ្មី', '🚫 Reject New Photo', '🚫 拒绝新照片')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Replace / Update Single Shop Photo Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {tr(
                    language,
                    '🔄 ប្តូរ ឬធ្វើបច្ចុប្បន្នភាពរូបភាពហាងថ្មី (១ សន្លឹកគត់)',
                    '🔄 Replace or Update Single Shop Photo',
                    '🔄 更换或更新单张店铺照片'
                  )}
                </div>

                {stagedReplacementPhoto && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 flex items-center gap-3">
                    <img
                      src={stagedReplacementPhoto}
                      alt="Staged New Shop Photo"
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 rounded-xl object-cover border border-emerald-500 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                        {tr(language, '✨ រូបភាពហាងថ្មីដែលបានជ្រើសរើស', '✨ New Shop Photo Selected', '✨ 已选定的新店铺照片')}
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">
                        {tr(
                          language,
                          'ចុចប៊ូតុងដាក់ស្នើខាងក្រោមដើម្បីបញ្ជូនទៅកាន់ Admin អនុម័ត។',
                          'Tap the submit button below to send for Admin approval.',
                          '点击下方提交按钮发送给管理员审核。'
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStagedReplacementPhoto('')}
                      className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {shopPhotoModerationWarning && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-400 text-rose-800 dark:text-rose-200 text-[11px] font-bold">
                    {shopPhotoModerationWarning}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isUploadingShopPhoto}
                    onClick={handlePickSingleShopPhotoFromGallery}
                    className="py-2.5 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Image className="w-4 h-4" />
                    <span>
                      {isUploadingShopPhoto
                        ? tr(language, 'កំពុងពិនិត្យ...', 'Checking...', '审核中...')
                        : tr(language, '🖼️ រូបភាពរបស់ខ្ញុំ', '🖼️ My Photos', '🖼️ 我的照片')}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isUploadingShopPhoto}
                    onClick={() => shopPhotoCameraRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{tr(language, '📸 ថតរូបហាងថ្មី', '📸 Take Shop Photo', '📸 拍摄新店铺照')}</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!stagedReplacementPhoto || isUploadingShopPhoto}
                  onClick={handleSubmitStagedShopPhotoReplacement}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:from-[#047857] hover:to-[#065F46] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-[0.98] cursor-pointer"
                >
                  {isAdmin
                    ? tr(language, '💾 រក្សាទុក និងអនុម័តរូបភាពហាងថ្មីភ្លាមៗ (Admin)', '💾 Save & Approve New Shop Photo (Admin)', '💾 立即保存并批准新店铺照片')
                    : tr(
                        language,
                        '📤 ដាក់ស្នើប្តូររូបភាពហាងថ្មីទៅកាន់ Admin (Submit for Admin Approval)',
                        '📤 Submit New Shop Photo for Admin Review',
                        '📤 提交新店铺照片供管理员审核'
                      )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: RESTAURANT ANALYTICS & GENUINE CUSTOMER RATINGS */}
          {mainTab === 'analytics' && (
            <div className="space-y-4 font-khmer">
              {/* Genuine Customer Rating Summary Card (Clearly separated from VIP Status) */}
              <div className="p-4 bg-amber-50/90 dark:bg-amber-950/30 rounded-2xl border border-amber-300 dark:border-amber-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>{isKm ? 'ការវាយតម្លៃពិតប្រាកដពីអតិថិជន (Customer Ratings)' : 'Genuine Customer Ratings'}</span>
                  </span>
                  {ratingSummary.hasReviews ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs">
                      ★ {ratingSummary.averageRating.toFixed(1)} ({ratingSummary.reviewCount})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px]">
                      {isKm ? 'មិនទាន់មានការវាយតម្លៃ / No ratings yet' : 'No ratings yet'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isKm
                    ? 'ពិន្ទុផ្កាយត្រូវបានគណនាដោយស្វ័យប្រវត្តិពីការវាយតម្លៃពិតប្រាកដរបស់អតិថិជនតែប៉ុណ្ណោះ។ សមាជិកភាព VIP មិនបង្កើតពិន្ទុផ្កាយ 5 សិប្បនិម្មិតឡើយ។'
                    : 'Star ratings are calculated strictly from genuine customer reviews. VIP status never auto-assigns a 5-star rating.'}
                </p>
              </div>

              {/* Analytics Header Summary */}
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800 dark:to-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-[#064E3B] dark:text-emerald-400 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" />
                    <span>{isKm ? 'ស្ថិតិដំណើរការហាងក្នុងកម្មវិធី' : 'In-App Performance Analytics'}</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  {isKm 
                    ? 'ស្ថិតិជាក់ស្តែងរបស់អ្នកប្រើប្រាស់ដែលបានមើលទំព័រហាង ចុចហៅទូរស័ព្ទ និងចុចមើលទីតាំងលើ Google Maps។' 
                    : 'Actual engagement tracking of page views, phone calls, and Google Maps clicks.'}
                </p>
              </div>

              {/* 4 Metric Cards (Unlocked with Active Shop Package — Benefit #5) */}
              {!isShopSubActive ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-slate-800 border-2 border-amber-400/80 text-center space-y-2.5">
                  <Lock className="w-6 h-6 text-amber-600 mx-auto" />
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    {isKm
                      ? '🔒 ស្ថិតិអ្នកចូលមើលហាងលម្អិត (Store Analytics) រួមបញ្ចូលក្នុងកញ្ចប់ហាង VIP'
                      : '🔒 Live Store Analytics is included in the VIP Shop Package'}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {isKm
                      ? 'ទិន្នន័យហាងរបស់អ្នកត្រូវបានរក្សាទុកជានិច្ច។ បើក ឬបន្តកញ្ចប់ហាង ដើម្បីមើលចំនួនអ្នកចូលមើល អ្នកចុចហៅទូរស័ព្ទ និងអ្នកចុចផែនទី!'
                      : 'Your shop data is safely preserved. Activate or renew the Shop Package to view views, phone clicks, and map navigations!'}
                  </p>
                  {!isIosAppStore && (
                    <button
                      type="button"
                      onClick={() => setMainTab('membership')}
                      className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      <span>{isKm ? 'ទៅកាន់ផ្ទាំងកញ្ចប់ហាង' : 'Open Shop Package'}</span>
                    </button>
                  )}
                </div>
              ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Page Views */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-medium">{isKm ? 'អ្នកចូលមើល' : 'Page Views'}</span>
                    <Store className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-[#0F172A] dark:text-white font-mono">
                    {viewsCount}
                  </div>
                  <span className="text-[9px] text-slate-400">{isKm ? 'ដងក្នុងកម្មវិធី' : 'total views'}</span>
                </div>

                {/* Phone Clicks */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-medium">{isKm ? 'ចុចហៅទូរស័ព្ទ' : 'Call Clicks'}</span>
                    <Phone className="w-4 h-4 text-[#059669]" />
                  </div>
                  <div className="text-xl font-black text-[#0F172A] dark:text-white font-mono">
                    {callsCount}
                  </div>
                  <span className="text-[9px] text-slate-400">{isKm ? 'ដង' : 'direct calls'}</span>
                </div>

                {/* Google Maps Clicks */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-medium">{isKm ? 'ចុចមើល Maps' : 'Map Clicks'}</span>
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl font-black text-[#0F172A] dark:text-white font-mono">
                    {mapsCount}
                  </div>
                  <span className="text-[9px] text-slate-400">{isKm ? 'ដង' : 'navigation clicks'}</span>
                </div>

                {/* Share Clicks */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-medium">{isKm ? 'ចុចចែករំលែក' : 'Share Clicks'}</span>
                    <Share2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-xl font-black text-[#0F172A] dark:text-white font-mono">
                    {sharesCount}
                  </div>
                  <span className="text-[9px] text-slate-400">{isKm ? 'ដង' : 'total shares'}</span>
                </div>
              </div>
              )}

              {/* Shareable Restaurant Page Link (Benefit 5) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0F172A] dark:text-white flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-[#059669]" />
                    <span>{isKm ? 'តំណភ្ជាប់ចែករំលែកទំព័រហាងផ្ទាល់' : 'Shareable Restaurant Page Link'}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={shareableUrl}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="px-3 py-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs flex items-center gap-1 shadow transition active:scale-95"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? (isKm ? 'បានចម្លង' : 'Copied') : (isKm ? 'ចម្លង' : 'Copy')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDirectShare}
                    className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Honest Engagement Disclaimer */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-[10px] text-slate-500 space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  {isKm ? '📌 ការបញ្ជាក់អំពីទិន្នន័យស្ថិតិ៖' : '📌 Analytics Transparency Notice:'}
                </span>
                <p>
                  {isKm 
                    ? 'ស្ថិតិនេះឆ្លុះបញ្ចាំងពីសកម្មភាពជាក់ស្តែងរបស់អ្នកប្រើប្រាស់ក្នុងកម្មវិធី (ចំនួនមើលទំព័រ ចុចខល និងចុចផែនទី) ដោយមិនធានាចំនួនភ្ញៀវ ឬចំណូលលក់ជាក់ស្តែងឡើយ។' 
                    : 'These statistics reflect authentic in-app user interactions (views, calls, maps). We do not guarantee foot traffic, sales volume, or customer numbers.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: INDEPENDENT ALL-INCLUSIVE SHOP PACKAGE ($6.99/30d, $49.99 Early-Bird/365d, $59.99/365d — NO Lifetime; hidden on iOS) */}
          {!isIosAppStore && mainTab === 'membership' && (() => {
            const shopOptions = [
              shopCatalog.monthlyPlan,
              ...(shopCatalog.earlyBirdRemaining > 0 && shopCatalog.earlyBirdPlan.enabled ? [shopCatalog.earlyBirdPlan] : []),
              shopCatalog.yearlyPlan,
            ].filter((p) => p.enabled);
            const activeShopPlan =
              shopOptions.find((p) => p.planId === selectedShopPlanId) || shopOptions[0] || shopCatalog.monthlyPlan;
            const mustWaitForAdminApproval =
              !isAdmin && appSettings.shopPayAfterApproval !== false && currentRest.status !== 'approved';

            const handlePickShopReceipt = async () => {
              if (isNativeAndroidOrIosPlatform()) {
                try {
                  const picked = await pickImageUsingNativeAndroidGallery(1200, 0.85);
                  if (picked?.cancelled) return;
                  if (picked?.dataUrl) {
                    setShopReceiptDraft({
                      dataUrl: picked.dataUrl,
                      fileName: picked.fileName || `aba_shop_receipt_${Date.now()}.jpg`,
                      mimeType: picked.mimeType || 'image/jpeg',
                    });
                    showToast(isKm ? '✅ បានភ្ជាប់វិក្កយបត្រ ABA រួចរាល់!' : '✅ Attached ABA receipt!', 'success');
                    return;
                  }
                } catch {}
              }
              shopReceiptInputRef.current?.click();
            };

            const handleShopReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === 'string') {
                  setShopReceiptDraft({
                    dataUrl: reader.result,
                    fileName: file.name || 'aba_shop_receipt.png',
                    mimeType: file.type || 'image/png',
                  });
                  showToast(isKm ? '✅ បានភ្ជាប់វិក្កយបត្រ ABA រួចរាល់!' : '✅ Attached ABA receipt!', 'success');
                }
              };
              reader.readAsDataURL(file);
            };

            const handleSubmitShopPayment = async () => {
              if (isSubmittingShopPayment) return;
              if (!shopReceiptDraft?.dataUrl) {
                showToast(
                  isKm ? '⚠️ សូមភ្ជាប់រូបភាពវិក្កយបត្រ ABA ជាមុនសិន!' : '⚠️ Please attach your ABA payment receipt screenshot first!',
                  'warning'
                );
                return;
              }
              setIsSubmittingShopPayment(true);
              try {
                const res = await submitShopSubscriptionPaymentRequest({
                  shopId: currentRest.id,
                  planId: activeShopPlan.planId as 'shop_30d' | 'shop_365d' | 'shop_earlybird_365d',
                  transactionRef: shopTrxRef.trim() || undefined,
                  paymentProofData: shopReceiptDraft,
                });
                if (res.success) {
                  setShopReceiptDraft(null);
                  setShopTrxRef('');
                }
              } finally {
                setIsSubmittingShopPayment(false);
              }
            };

            return (
              <div className="space-y-4 font-khmer">
                <input
                  ref={shopReceiptInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleShopReceiptFileChange}
                  className="hidden"
                />

                {/* 1. Shop Package Status & Expiry Summary */}
                <div
                  className={`p-4 rounded-2xl border-2 space-y-2 ${
                    isShopSubActive
                      ? 'bg-gradient-to-br from-emerald-50 via-teal-50/70 to-amber-50/40 dark:from-emerald-950/40 dark:to-slate-900 border-emerald-500/80'
                      : currentRest.shopPaymentStatus === 'pending_verification'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1 shadow-xs ${
                        isAdmin
                          ? 'bg-amber-400 text-slate-950'
                          : isShopSubActive
                          ? 'bg-[#064E3B] text-white'
                          : currentRest.shopPaymentStatus === 'pending_verification'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>
                        {isAdmin
                          ? tr(language, '🛡️ គណនី Admin (សិទ្ធិពេញលេញ)', '🛡️ System Admin Access', '🛡️ 管理员全权限')
                          : isShopSubActive
                          ? tr(language, '👑 កញ្ចប់ហាង VIP សកម្ម', '👑 VIP Shop Package Active', '👑 店铺 VIP 套餐已生效')
                          : currentRest.shopPaymentStatus === 'pending_verification'
                          ? tr(language, '⏳ កំពុងរង់ចាំផ្ទៀងផ្ទាត់វិក្កយបត្រ', '⏳ Receipt Under Review', '⏳ 付款审核中')
                          : isExpired
                          ? tr(language, '⚠️ កញ្ចប់ហាងបានផុតកំណត់ (ទិន្នន័យរក្សាទុក 100%)', '⚠️ Shop Package Expired (Data Safe)', '⚠️ 套餐已到期（数据完整保留）')
                          : currentRest.status === 'pending'
                          ? tr(language, '⏳ រង់ចាំ Admin អនុម័តហាងជាមុន', '⏳ Pending Admin Shop Approval', '⏳ 等待管理员审核店铺')
                          : tr(language, '💳 រង់ចាំបើកកញ្ចប់ហាង VIP', '💳 Ready to Activate Shop Package', '💳 待开通店铺 VIP 套餐')}
                      </span>
                    </span>

                    {formattedVipExpiry && (
                      <span className="text-[11px] font-mono font-bold text-[#064E3B] dark:text-emerald-300">
                        📅 {formattedVipExpiry} {vipRemainingDays > 0 ? `(${vipRemainingDays}d)` : ''}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    {isShopSubActive && !isAdmin
                      ? tr(
                          language,
                          '💡 អ្នកអាចបង់បន្តមុនថ្ងៃផុតកំណត់បានគ្រប់ពេល — ប្រព័ន្ធនឹងបូកបន្ថែមចំនួនថ្ងៃ (30 ឬ 365 ថ្ងៃ) ពីលើថ្ងៃផុតកំណត់បច្ចុប្បន្នដោយស្វ័យប្រវត្តិ!',
                          '💡 Renew early anytime — 30 or 365 days stack directly onto your current expiration date!',
                          '💡 可随时提前续费——新天数将自动叠加在当前到期日之后！'
                        )
                      : tr(
                          language,
                          'កញ្ចប់ហាងនេះដាច់ដោយឡែកពី Consumer VIP ហើយគ្មានគម្រោង Lifetime ទេ។ ពេលផុតកំណត់ ស្លាក VIP នឹងផ្អាកបណ្ដោះអាសន្ន ដោយរក្សាទុកទិន្នន័យ និងម៉ឺនុយហាង 100%។',
                          'Shop Package is independent of Consumer VIP (no Lifetime tier). If expired, VIP visibility pauses without deleting any shop or menu data.',
                          '店铺套餐独立于个人 VIP（无终身套餐）。到期仅暂停置顶与金牌展示，所有店铺及菜单数据 100% 保留。'
                        )}
                  </p>
                </div>

                {/* 2. All 5 Included Benefits (Zero Extra Advertising Fees) */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-white to-emerald-50/60 dark:from-slate-800 dark:via-slate-800 dark:to-emerald-950/30 border border-amber-400/80 space-y-2">
                  <div className="font-bold text-xs text-[#064E3B] dark:text-amber-300 flex items-center justify-between gap-2">
                    <span>
                      {tr(
                        language,
                        '✨ មុខងារទាំង ៥ ក្នុងកញ្ចប់តែមួយ (គ្មានទារថ្លៃផ្សព្វផ្សាយបន្ថែម)',
                        '✨ All 5 Benefits Included in One Package (No Extra Ad Fees)',
                        '✨ 单一套餐包含全部 5 大权益（无任何额外广告费）'
                      )}
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-200">
                    {SHOP_ALL_INCLUSIVE_5_BENEFITS.map((b, idx) => (
                      <li key={idx} className="leading-snug">
                        {isKm ? b.km : language === 'zh' ? b.zh : b.en}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. Pay-After-Approval Guard OR Official Shop Plan Selector + ABA KHQR Checkout */}
                {!shopCatalog.shopPlansEnabled ? (
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-600 dark:text-slate-300">
                    {tr(language, 'កញ្ចប់ហាងត្រូវបានផ្អាកបណ្តោះអាសន្នដោយ Admin។', 'Shop subscriptions are temporarily paused by Admin.', '管理员已暂停店铺套餐开通。')}
                  </div>
                ) : mustWaitForAdminApproval ? (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 text-center space-y-2">
                    <Clock className="w-7 h-7 text-amber-600 mx-auto" />
                    <div className="font-bold text-xs text-amber-950 dark:text-amber-200">
                      {tr(
                        language,
                        '⏳ រង់ចាំ Admin ពិនិត្យ និងអនុម័តហាងជាមុនសិន មុនពេលបង់ប្រាក់!',
                        '⏳ Please wait for Admin to approve your shop before paying!',
                        '⏳ 请等待管理员审核批准您的店铺后再付款！'
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {tr(
                        language,
                        'ដើម្បីការពារម្ចាស់ហាង ប្រព័ន្ធនឹងបើកផ្ទាំងបង់ប្រាក់ ABA KHQR ភ្លាមៗបន្ទាប់ពីរដ្ឋបាល (Admin) ពិនិត្យអនុម័តហាងរបស់អ្នករួចរាល់។',
                        'To protect shop owners, ABA KHQR checkout unlocks right after Admin approves your shop listing.',
                        '为保障商家权益，管理员审核通过您的店铺后将立即开放 ABA KHQR 付款。'
                      )}
                    </p>
                  </div>
                ) : !isAdmin ? (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/70 space-y-3 shadow-xs">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center justify-between gap-2">
                      <span>{tr(language, '១. ជ្រើសរើសកញ្ចប់ហាង (ក្នុង ១ ហាង)', '1. Choose Shop Plan (per shop)', '1. 选择单店套餐')}</span>
                      {shopCatalog.earlyBirdRemaining > 0 && shopCatalog.earlyBirdPlan.enabled && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                          🔥 {tr(language, `សល់ ${shopCatalog.earlyBirdRemaining}/${shopCatalog.earlyBirdCap} ហាង`, `${shopCatalog.earlyBirdRemaining}/${shopCatalog.earlyBirdCap} left`, `剩余 ${shopCatalog.earlyBirdRemaining}/${shopCatalog.earlyBirdCap} 名额`)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {shopOptions.map((opt) => {
                        const selected = activeShopPlan.planId === opt.planId;
                        return (
                          <button
                            key={opt.planId}
                            type="button"
                            onClick={() => setSelectedShopPlanId(opt.planId as any)}
                            className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer relative ${
                              selected
                                ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 shadow-xs'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 hover:border-amber-300'
                            }`}
                          >
                            {(opt.badgeKm || opt.badgeEn) && (
                              <span className="inline-block mb-1 px-2 py-0.5 rounded-full bg-emerald-700 text-amber-200 text-[9px] font-black">
                                {isKm ? opt.badgeKm : opt.badgeEn}
                              </span>
                            )}
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {isKm ? opt.titleKm : opt.titleEn}
                              </span>
                              <span className="font-mono font-black text-base text-[#064E3B] dark:text-amber-300">
                                {'$'}{opt.priceUsd.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {tr(language, `សុពលភាព ${opt.durationDays} ថ្ងៃពេញ`, `${opt.durationDays} days active`, `有效期 ${opt.durationDays} 天`)}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Step 2: ABA KHQR */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await savePngDataUrlToGallery('/images/aba_qr_code_only.png', 'ABA-KHQR-KIMSENG-CHEA-095245959.png');
                            showToast(isKm ? '✅ បានរក្សាទុក ABA QR ទៅក្នុង រូបភាពរបស់ខ្ញុំ!' : '✅ Saved ABA QR to Gallery!', 'success');
                          } catch {}
                        }}
                        className="w-28 h-28 p-1.5 rounded-xl bg-white border-2 border-emerald-500/50 shrink-0 cursor-pointer"
                      >
                        <img loading="lazy" decoding="async" src="/images/aba_qr_code_only.png" alt="ABA KHQR" className="w-full h-full object-contain" />
                      </button>
                      <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <QrCode className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>ABA KHQR • CHEA KIMSENG</span>
                        </div>
                        <div className="font-mono font-black text-sm text-[#004B87] dark:text-sky-400">095 245 959</div>
                        <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          {tr(
                            language,
                            `ចំនួនទឹកប្រាក់ត្រូវបង់៖ $${activeShopPlan.priceUsd.toFixed(2)} USD (${activeShopPlan.durationDays} ថ្ងៃ)`,
                            `Amount due: $${activeShopPlan.priceUsd.toFixed(2)} USD (${activeShopPlan.durationDays} days)`,
                            `应付金额：$${activeShopPlan.priceUsd.toFixed(2)} USD（${activeShopPlan.durationDays} 天）`
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await savePngDataUrlToGallery('/images/aba_qr_code_only.png', 'ABA-KHQR-KIMSENG-CHEA-095245959.png');
                              showToast(isKm ? '✅ បានរក្សាទុក ABA QR!' : '✅ Saved ABA QR!', 'success');
                            } catch {}
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3 text-emerald-600" />
                          <span>{isKm ? 'រក្សាទុក QR' : 'Save QR'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Step 3: Upload ABA Receipt + Submit */}
                    <div className="space-y-2">
                      {shopReceiptDraft && (
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-emerald-800 dark:text-emerald-200 truncate">
                            ✅ {shopReceiptDraft.fileName}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShopReceiptDraft(null)}
                            className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handlePickShopReceipt}
                          className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-4 h-4" />
                          <span>{isKm ? 'ភ្ជាប់វិក្កយបត្រ ABA' : 'Attach ABA Receipt'}</span>
                        </button>
                        <input
                          type="text"
                          value={shopTrxRef}
                          onChange={(e) => setShopTrxRef(e.target.value)}
                          placeholder={isKm ? 'លេខ Trx ID (ស្រេចចិត្ត)' : 'ABA Trx ID (optional)'}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isSubmittingShopPayment}
                        onClick={handleSubmitShopPayment}
                        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#064E3B] to-emerald-700 hover:from-emerald-800 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                      >
                        {isSubmittingShopPayment ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-amber-300" />
                        )}
                        <span>
                          {isShopSubActive
                            ? tr(
                                language,
                                `🔄 បន្តសុពលភាពកញ្ចប់ហាង ($${activeShopPlan.priceUsd.toFixed(2)} / +${activeShopPlan.durationDays} ថ្ងៃ)`,
                                `🔄 Renew Shop Package ($${activeShopPlan.priceUsd.toFixed(2)} / +${activeShopPlan.durationDays}d)`,
                                `🔄 续费店铺套餐 ($${activeShopPlan.priceUsd.toFixed(2)} / +${activeShopPlan.durationDays}天)`
                              )
                            : tr(
                                language,
                                `✅ បញ្ជូនវិក្កយបត្របើកកញ្ចប់ហាង ($${activeShopPlan.priceUsd.toFixed(2)})`,
                                `✅ Submit Receipt & Activate Shop ($${activeShopPlan.priceUsd.toFixed(2)})`,
                                `✅ 提交凭证开通套餐 ($${activeShopPlan.priceUsd.toFixed(2)})`
                              )}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Support Channel */}
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <span className="font-bold text-xs text-[#064E3B] dark:text-emerald-400 block">
                    {isKm ? 'ជំនួយម្ចាស់ហាង (Shop Owner Support)' : 'Shop Owner Support'}
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href="https://t.me/cheasavuth"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>Telegram Support</span>
                    </a>
                    <a
                      href="mailto:kftcam@gmail.com"
                      className="flex-1 py-2 px-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition font-mono"
                    >
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span>kftcam@gmail.com</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
        </>
        )}

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500 font-khmer">
          <span>
            {isIosAppStore
              ? (isKm ? 'គ្រប់គ្រងព័ត៌មានហាង ម៉ឺនុយ និងទីតាំងផែនទី' : 'Manage shop details, menu & map pin')
              : (isKm
                  ? `កញ្ចប់ហាង៖ $${shopCatalog.monthlyPlan.priceUsd.toFixed(2)}/ខែ • $${shopCatalog.yearlyPlan.priceUsd.toFixed(2)}/ឆ្នាំ`
                  : `Shop Plans: $${shopCatalog.monthlyPlan.priceUsd.toFixed(2)}/mo • $${shopCatalog.yearlyPlan.priceUsd.toFixed(2)}/yr`)}
          </span>
          <button
            onClick={handleCloseModal}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition font-medium cursor-pointer"
          >
            {isKm ? 'បិទ' : 'Close'}
          </button>
        </div>
        <ShopLocationCheckInPickerModal
          isOpen={isStoreCheckInOpen}
          onClose={() => setIsStoreCheckInOpen(false)}
          initialLat={storeLatitude}
          initialLng={storeLongitude}
          initialAddress={storeAddressKh}
          initialProvinceKh={storeProvinceKh}
          shopName={storeNameKh || storeNameEn}
          language={language}
          onConfirmLocation={(loc: ShopCheckInLocationResult) => {
            setStoreLatitude(loc.latitude);
            setStoreLongitude(loc.longitude);
            setStoreMapUrl(loc.mapUrl);
            if (loc.formattedAddressKh) setStoreAddressKh(loc.formattedAddressKh);
            if (loc.provinceKh) setStoreProvinceKh(loc.provinceKh);
            showToast(
              isKm
                ? '📍 បានកំណត់ទីតាំងហាង (Check In) ដោយជោគជ័យ! សូមចុច «រក្សាទុក» ដើម្បីរក្សាទុកការកែប្រែ។'
                : '📍 Shop location pinned! Tap Save to persist changes.',
              'success'
            );
          }}
        />
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, UtensilsCrossed, Plus, Trash2, Edit2, Sparkles, 
  AlertCircle, CheckCircle2, Image, DollarSign, Calendar, Clock,
  Store, BarChart3, ShieldCheck, Share2, Phone, MapPin, ExternalLink,
  MessageCircle, Copy, Check, HelpCircle, ArrowRight, Camera, Upload, Lock, ShieldAlert, Star
} from 'lucide-react';
import { 
  RestaurantMenuItem, RestaurantPriceLevel, isRestaurantPremiumActive, isUserVipActive, 
  VipPlanType, getVipAccountState, getVipRemainingDays,
  getRestaurantRatingSummary, isSeedRestaurantId, getRestaurantCreatedAtMs,
  getDynamicVipPlans, getDynamicVipBenefits
} from '../types';
import { tr } from '../utils/i18n';
import {
  pickImageUsingNativeAndroidGallery,
  processAndCompressImageFile,
} from '../utils/androidMediaHelper';
import { searchOnlineFoodImages, OnlineFoodImageCandidate } from '../services/onlineFoodImageService';
import { ShopMultiPhotoUploader } from './ShopMultiPhotoUploader';

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
    addRestaurantMenuItem,
    updateRestaurantMenuItem,
    deleteRestaurantMenuItem,
    updateRestaurant,
    deleteRestaurant,
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
  const [selectedVipPlan, setSelectedVipPlan] = useState<VipPlanType>('quarterly');
  const dynamicPlansMap = getDynamicVipPlans(appSettings);
  const dynamicBenefits = getDynamicVipBenefits(appSettings);
  const activePlan = dynamicPlansMap[selectedVipPlan];
  const promoPrice = activePlan.priceUsd;
  const storeQuota = getCurrentUserStoreQuota();

  // Main Tabs: menu, info, photos, analytics, membership
  const [mainTab, setMainTab] = useState<'menu' | 'info' | 'photos' | 'analytics' | 'membership'>('menu');

  // Menu item form mode: list, add, edit
  const [menuMode, setMenuMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [confirmDeleteMenuItemId, setConfirmDeleteMenuItemId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Menu item fields
  const [nameKh, setNameKh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [priceUsd, setPriceUsd] = useState('5.00');
  const [priceRiel, setPriceRiel] = useState('20000');
  const [dishPhotoUrl, setDishPhotoUrl] = useState('https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80');
  const [descriptionKh, setDescriptionKh] = useState('');
  const [isSearchingOnlineDish, setIsSearchingOnlineDish] = useState(false);
  const [onlineDishCandidates, setOnlineDishCandidates] = useState<OnlineFoodImageCandidate[]>([]);

  const foodDishGalleryRef = useRef<HTMLInputElement>(null);
  const foodDishCameraRef = useRef<HTMLInputElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const nameKhInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDishPhoto, setIsUploadingDishPhoto] = useState(false);
  const [isSavingDish, setIsSavingDish] = useState(false);

  const handleDishFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingDishPhoto(true);
    try {
      const dataUrl = await processAndCompressImageFile(file, 1000, 0.85);
      if (dataUrl) {
        setDishPhotoUrl(dataUrl);
        showToast(
          isKm ? '✅ បានផ្ទុករូបភាពមុខម្ហូបជោគជ័យ!' : '✅ Food photo uploaded successfully!',
          'success'
        );
      }
    } catch (err: any) {
      showToast(err?.message || (isKm ? 'រូបភាពមិនត្រឹមត្រូវ' : 'Invalid image file'), 'error');
    } finally {
      setIsUploadingDishPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handlePickDishNativeGallery = async () => {
    setIsUploadingDishPhoto(true);
    try {
      const nativeRes = await pickImageUsingNativeAndroidGallery();
      if (nativeRes && !nativeRes.cancelled && nativeRes.dataUrl) {
        setDishPhotoUrl(nativeRes.dataUrl);
        showToast(
          isKm ? '✅ បានជ្រើសរូបភាពពី Gallery ជោគជ័យ!' : '✅ Photo selected from Gallery!',
          'success'
        );
        setIsUploadingDishPhoto(false);
        return;
      }
    } catch {}
    setIsUploadingDishPhoto(false);
    foodDishGalleryRef.current?.click();
  };

  const handlePickDishCamera = () => {
    foodDishCameraRef.current?.click();
  };

  const handleRemoveDishPhoto = () => {
    setDishPhotoUrl('');
    showToast(isKm ? 'បានលុបរូបភាពចេញ' : 'Photo removed', 'info');
  };

  const handleSearchOnlineDishPhotos = async () => {
    setIsSearchingOnlineDish(true);
    try {
      const qKh = nameKh.trim() || storeNameKh.trim() || 'ម្ហូបខ្មែរ';
      const results = await searchOnlineFoodImages({
        nameKh: qKh,
        nameEn: nameEn.trim() || qKh,
        categorySlug: 'soup',
        existingUrls: dishPhotoUrl ? [dishPhotoUrl] : [],
      });
      setOnlineDishCandidates(results);
      if (results.length > 0) {
        setDishPhotoUrl(results[0].url);
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
      setIsSearchingOnlineDish(false);
    }
  };

  // Self-Service Store Info fields
  const [storeNameKh, setStoreNameKh] = useState(managingRestaurant?.nameKh || '');
  const [storeNameEn, setStoreNameEn] = useState(managingRestaurant?.nameEn || '');
  const [storePhone, setStorePhone] = useState(managingRestaurant?.phone || '');
  const [storeProvinceKh, setStoreProvinceKh] = useState(managingRestaurant?.provinceKh || 'រាជធានីភ្នំពេញ');
  const [storeAddressKh, setStoreAddressKh] = useState(managingRestaurant?.addressKh || '');
  const [storeOpeningHours, setStoreOpeningHours] = useState(managingRestaurant?.openingHoursKh || '');
  const [storePriceLevel, setStorePriceLevel] = useState<RestaurantPriceLevel>(managingRestaurant?.priceLevel || '$$');
  const [storeDescriptionKh, setStoreDescriptionKh] = useState(managingRestaurant?.descriptionKh || '');
  const [storeMapUrl, setStoreMapUrl] = useState(managingRestaurant?.mapUrl || '');
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
      setStoreNameKh(fresh.nameKh || '');
      setStoreNameEn(fresh.nameEn || '');
      setStorePhone(fresh.phone || '');
      setStoreProvinceKh(fresh.provinceKh || 'រាជធានីភ្នំពេញ');
      setStoreAddressKh(fresh.addressKh || '');
      setStoreOpeningHours(fresh.openingHoursKh || '');
      setStorePriceLevel(fresh.priceLevel || '$$');
      setStoreDescriptionKh(fresh.descriptionKh || '');
      setStoreMapUrl(fresh.mapUrl || '');
      setStoreCoverPhoto(fresh.photoUrl || '');
      setStoreGalleryPhotos(fresh.galleryPhotos || []);
      setStorePromoVideoUrl(fresh.promoVideoUrl || '');
      setStoreTelegramUrl(fresh.telegramUrl || '');
      setStoreFacebookUrl(fresh.facebookUrl || '');
      setConfirmDeleteStore(false);
      setConfirmDeleteMenuItemId(null);
      setMenuMode('list');
      setEditingItemId(null);
      setStatusBanner(null);
    }
  }, [managingRestaurant?.id]);

  // Allow external triggers (e.g. ProfileView VIP feature cards) to open a specific tab
  useEffect(() => {
    if (isManageMenuModalOpen) {
      const requestedTab = (window as any).__kft_manage_initial_tab;
      if (requestedTab === 'video') {
        setMainTab('info');
        (window as any).__kft_manage_initial_tab = undefined;
      } else if (requestedTab && ['menu', 'info', 'photos', 'analytics', 'membership'].includes(requestedTab)) {
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

  const isOwner = Boolean(
    currentUser &&
      (managingRestaurant.ownerId === currentUser.id ||
        (currentUser.email &&
          managingRestaurant.ownerEmail &&
          managingRestaurant.ownerEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()))
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
    : getOwnedRestaurantsForUser(currentUser);

  const menuItems = currentRest.menuItems || managingRestaurant.menuItems || [];
  const isPremiumActive = isRestaurantPremiumActive(currentRest) || isApprovedVip || isAdmin;
  const isExpired = vipState === 'expired_vip' || (currentRest.membershipTier === 'premium' && !isPremiumActive);
  const isFree = !isPremiumActive && !isExpired;
  const maxMenuLimit = isPremiumActive ? 20 : 5;
  const maxPhotoLimit = isPremiumActive ? 30 : 3;
  const vipRemainingDays = getVipRemainingDays(currentUser);
  const vipExpiryRaw = currentUser?.subscriptionExpiryDate || currentRest.membershipExpiresAt || currentRest.subscriptionExpiresAt;
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

  const resetMenuForm = () => {
    setNameKh('');
    setNameEn('');
    setPriceUsd('5.00');
    setPriceRiel('20000');
    setDishPhotoUrl('https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80');
    setDescriptionKh('');
    setEditingItemId(null);
    setOnlineDishCandidates([]);
    setMenuMode('list');
  };

  const sampleFoodPhotos = [
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
  ];

  const handleStartAdd = () => {
    if (menuItems.length >= maxMenuLimit) {
      if (!isPremiumActive) {
        showToast(
          tr(
            language,
            `គម្រោងឥតគិតថ្លៃអាចបន្ថែមមុខម្ហូបបាន ${maxMenuLimit} មុខ។ សូមដំឡើងទៅគម្រោង VIP ដើម្បីបន្ថែមរហូតដល់ ២០ មុខ!`,
            `Free Plan allows up to ${maxMenuLimit} dishes. Upgrade to VIP to add up to 20 dishes!`,
            `免费计划最多可添加 ${maxMenuLimit} 道菜品。升级 VIP 可添加多达 20 道菜品！`
          ),
          'warning'
        );
        setMainTab('membership');
      } else {
        showToast(
          tr(
            language,
            'សមាជិកភាព Premium VIP អនុញ្ញាតឱ្យបន្ថែមមុខម្ហូបអតិបរមាត្រឹម ២០ មុខប៉ុណ្ណោះ!',
            'Premium VIP membership allows a maximum of 20 food menu items!',
            'VIP 会员最多可添加 20 道菜品！'
          ),
          'warning'
        );
      }
      return;
    }
    resetMenuForm();
    setStatusBanner(null);
    setMenuMode('add');
    setTimeout(() => {
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      nameKhInputRef.current?.focus();
    }, 60);
  };

  const handleStartEdit = (item: RestaurantMenuItem) => {
    setEditingItemId(item.id);
    setNameKh(item.nameKh);
    setNameEn(item.nameEn || '');
    setPriceUsd(item.priceUsd.toString());
    setPriceRiel(item.priceRiel.toString());
    setDishPhotoUrl(item.photoUrl);
    setDescriptionKh(item.descriptionKh || '');
    setStatusBanner(null);
    setMenuMode('edit');
    setTimeout(() => {
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 60);
  };

  const handleMenuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingDish) return;

    const finalNameKh = nameKh.trim() || nameEn.trim();
    if (!finalNameKh) {
      const errMsg = tr(
        language,
        '⚠️ សូមបញ្ចូលឈ្មោះមុខម្ហូប (ជាភាសាខ្មែរ ឬ អង់គ្លេស) ជាមុនសិន!',
        '⚠️ Please enter the dish name before saving!',
        '⚠️ 保存前请输入菜品名称！'
      );
      setStatusBanner({ type: 'error', text: errMsg });
      showToast(errMsg, 'error');
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => nameKhInputRef.current?.focus(), 100);
      return;
    }

    const usd = Math.max(0, parseFloat(priceUsd) || 0);
    const riel = Math.max(0, parseInt(priceRiel, 10) || Math.round(usd * 4100));
    const finalPhoto = dishPhotoUrl.trim() || sampleFoodPhotos[0];

    setIsSavingDish(true);
    try {
      if (menuMode === 'add') {
        const ok = addRestaurantMenuItem(managingRestaurant.id, {
          nameKh: finalNameKh,
          nameEn: nameEn.trim() || finalNameKh,
          priceUsd: usd,
          priceRiel: riel,
          photoUrl: finalPhoto,
          descriptionKh: descriptionKh.trim(),
        });
        if (ok) {
          resetMenuForm();
          setStatusBanner({
            type: 'success',
            text: tr(
              language,
              `✅ បានរក្សាទុកមុខម្ហូប "${finalNameKh}" ចូលក្នុងហាង "${managingRestaurant.nameKh}" ដោយជោគជ័យ!`,
              `✅ Saved "${finalNameKh}" to "${managingRestaurant.nameEn || managingRestaurant.nameKh}" successfully!`,
              `✅ 已成功将 "${finalNameKh}" 保存至店铺菜单！`
            ),
          });
          modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setStatusBanner({
            type: 'error',
            text: tr(
              language,
              '⚠️ មិនអាចរក្សាទុកមុខម្ហូបបានទេ សូមពិនិត្យព័ត៌មានម្តងទៀត។',
              '⚠️ Could not save dish. Please check the form details and try again.',
              '⚠️ 无法保存菜品，请检查输入信息后重试。'
            ),
          });
          modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (menuMode === 'edit' && editingItemId) {
        const existing = menuItems.find(m => m.id === editingItemId);
        if (!existing) {
          setIsSavingDish(false);
          return;
        }
        const ok = updateRestaurantMenuItem(managingRestaurant.id, {
          ...existing,
          nameKh: finalNameKh,
          nameEn: nameEn.trim() || finalNameKh,
          priceUsd: usd,
          priceRiel: riel,
          photoUrl: finalPhoto,
          descriptionKh: descriptionKh.trim(),
        });
        if (ok) {
          resetMenuForm();
          setStatusBanner({
            type: 'success',
            text: tr(
              language,
              `✅ បានរក្សាទុកការកែប្រែមុខម្ហូប "${finalNameKh}" ដោយជោគជ័យ!`,
              `✅ Updated dish "${finalNameKh}" successfully!`,
              `✅ 已成功更新菜品 "${finalNameKh}"！`
            ),
          });
          modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setStatusBanner({
            type: 'error',
            text: tr(
              language,
              '⚠️ មិនអាចរក្សាទុកការកែប្រែបានទេ សូមពិនិត្យព័ត៌មានម្តងទៀត។',
              '⚠️ Failed to save changes. Please verify your input.',
              '⚠️ 无法保存修改，请检查输入信息。'
            ),
          });
          modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } finally {
      setIsSavingDish(false);
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

    const finalCover = storeCoverPhoto.trim() || managingRestaurant.photoUrl;
    const finalGallery = Array.from(new Set([finalCover, ...storeGalleryPhotos])).filter(Boolean).slice(0, maxPhotoLimit);
    updateRestaurant({
      ...managingRestaurant,
      nameKh: storeNameKh.trim() || storeNameEn.trim(),
      nameEn: storeNameEn.trim() || storeNameKh.trim(),
      phone: storePhone.trim(),
      provinceKh: storeProvinceKh.trim() || managingRestaurant.provinceKh,
      addressKh: storeAddressKh.trim(),
      openingHoursKh: storeOpeningHours.trim(),
      priceLevel: storePriceLevel,
      descriptionKh: storeDescriptionKh.trim(),
      mapUrl: storeMapUrl.trim(),
      photoUrl: finalCover,
      profileImage: finalCover,
      foodImages: storeGalleryPhotos.slice(0, maxPhotoLimit),
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
    const cappedGallery = Array.from(new Set([finalCover, ...storeGalleryPhotos])).filter(Boolean).slice(0, maxPhotoLimit);
    updateRestaurant({
      ...managingRestaurant,
      photoUrl: finalCover,
      profileImage: finalCover,
      foodImages: storeGalleryPhotos.slice(0, maxPhotoLimit),
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
      showToast(isKm ? 'អាចបន្ថែមរូបភាព Gallery អតិបរមា ៣០ សន្លឹក!' : 'Max 30 gallery photos allowed!', 'warning');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
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
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="w-5 h-5 text-emerald-200" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="font-moul text-xs sm:text-sm text-white leading-snug truncate">
                    {isKm ? 'គ្រប់គ្រងហាង VIP របស់ខ្ញុំ' : 'Manage My VIP Store'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px]">
                    ID: {managingRestaurant.id.slice(-8)}
                  </span>
                </div>
                <p className="text-xs font-bold text-amber-200 font-khmer truncate">
                  🏪 {isKm ? managingRestaurant.nameKh : (managingRestaurant.nameEn || managingRestaurant.nameKh)}
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
                      setIsManageMenuModalOpen(false);
                      setIsVipAddRestaurantModalOpen(true);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 text-amber-200 font-bold text-[10px] transition cursor-pointer"
                  >
                    {storeQuota.canAddWithoutNewPayment
                      ? (isKm ? '+ បន្ថែមហាងថ្មី ($0)' : '+ Add Store ($0)')
                      : (isKm ? `+ បន្ថែមហាងថ្មី (+$${storeQuota.additionalStoreFeeUsd.toFixed(2)})` : `+ Add Store (+$${storeQuota.additionalStoreFeeUsd.toFixed(2)})`)}
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
                    ? 'លោកអ្នកត្រូវចូលគណនីដែលមានសិទ្ធិ VIP ដើម្បីគ្រប់គ្រងហាង និងមុខម្ហូប។'
                    : 'Please sign in to your approved VIP account to manage your restaurant and menu.'}
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
                    ? 'ការស្នើសុំសមាជិកភាព VIP របស់អ្នកត្រូវបានកត់ត្រា និងកំពុងស្ថិតក្នុងការពិនិត្យផ្ទៀងផ្ទាត់ដោយ Administrator។ មុខងារគ្រប់គ្រងហាង និងបន្ថែមមុខម្ហូបនឹងបើកដំណើរការភ្លាមៗក្រោយពេលទទួលបានការអនុម័ត!'
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
                    ? `សមាជិកភាព VIP របស់លោកអ្នកបានផុតកំណត់កាលបរិច្ឆេទហើយ។ សូមបន្តកញ្ចប់ VIP ($${dynamicPlansMap.quarterly.priceUsd.toFixed(2)} / ${dynamicPlansMap.quarterly.durationDays} ថ្ងៃ ឬ $${dynamicPlansMap.annual.priceUsd.toFixed(2)} / ${dynamicPlansMap.annual.durationDays} ថ្ងៃ) ដើម្បីបន្តគ្រប់គ្រងហាង និងមុខម្ហូប។`
                    : `Your VIP membership has expired. Please renew your VIP membership ($${dynamicPlansMap.quarterly.priceUsd.toFixed(2)} / ${dynamicPlansMap.quarterly.durationDays} days or $${dynamicPlansMap.annual.priceUsd.toFixed(2)} / ${dynamicPlansMap.annual.durationDays} days) to continue managing your restaurant and menu items.`}
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
                    ? `ផ្ទាំងគ្រប់គ្រងម្ចាស់ហាង និងការបន្ថែមមុខម្ហូប គឺអនុញ្ញាតជូនតែសមាជិក VIP ដែលបានបង់ប្រាក់ និងទទួលបានការអនុម័តពី Admin ប៉ុណ្ណោះ។ សូមដំឡើងទៅកញ្ចប់ VIP ($${dynamicPlansMap.quarterly.priceUsd.toFixed(2)} / ${dynamicPlansMap.quarterly.durationDays} ថ្ងៃ ឬ $${dynamicPlansMap.annual.priceUsd.toFixed(2)} / ${dynamicPlansMap.annual.durationDays} ថ្ងៃ) ដើម្បីទទួលបានអត្ថប្រយោជន៍ទាំង ${dynamicBenefits.length}!`
                    : `Owner management is reserved exclusively for admin-approved VIP subscribers. Upgrade to VIP ($${dynamicPlansMap.quarterly.priceUsd.toFixed(2)} / ${dynamicPlansMap.quarterly.durationDays} days or $${dynamicPlansMap.annual.priceUsd.toFixed(2)} / ${dynamicPlansMap.annual.durationDays} days) to manage your restaurant and menu items!`}
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
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5 flex-1">
              <p className="font-bold">
                {currentRest.status === 'pending'
                  ? isKm
                    ? '⏳ កំពុងរង់ចាំ Admin ពិនិត្យប្រភេទអាជីវកម្មម្ហូបអាហារ (Pending Admin Review)'
                    : '⏳ Pending Admin Food-Category Review'
                  : isKm
                    ? '🚫 សំណើហាងត្រូវបានបដិសេធ (មិនមែនជាហាងលក់ម្ហូបអាហារចម្អិនស្រាប់)'
                    : '🚫 Store Rejected (Non-Food Business)'}
              </p>
              <p className="text-[11px] leading-relaxed">
                {currentRest.aiCategoryVerification
                  ? isKm
                    ? currentRest.aiCategoryVerification.reasonKh
                    : currentRest.aiCategoryVerification.reasonEn
                  : isKm
                    ? 'សូមបន្ថែមមុខម្ហូបពិសេស និងរូបភាពម្ហូបអាហារឱ្យបានច្បាស់លាស់ ដើម្បីឱ្យ Admin អនុម័តដាក់បង្ហាញជាសាធារណៈ។'
                    : 'Please add clear prepared food menu items and photos for Admin approval.'}
              </p>
            </div>
          </div>
        )}

        {/* Clearly Separated Management Sections */}
        <div className="grid grid-cols-5 bg-slate-100 dark:bg-slate-800/80 p-1 border-b border-slate-200 dark:border-slate-700 text-center font-khmer gap-0.5">
          <button
            onClick={() => { setMainTab('menu'); setMenuMode('list'); setStatusBanner(null); }}
            className={`py-2 px-1 text-[10px] sm:text-[11px] font-bold rounded-xl transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              mainTab === 'menu'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span className="leading-tight">{isKm ? '១. មុខម្ហូប' : '1. Menu'}</span>
          </button>

          <button
            onClick={() => { setMainTab('info'); setStatusBanner(null); }}
            className={`py-2 px-1 text-[10px] sm:text-[11px] font-bold rounded-xl transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              mainTab === 'info'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span className="leading-tight">{isKm ? '២. ព័ត៌មានហាង' : '2. Info'}</span>
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
            <span className="leading-tight">{tr(language, '៣. រូបភាពហាង', '3. Photos', '3. 照片')}</span>
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
            <span className="leading-tight">{isKm ? '៤. ស្ថិតិ & ផ្កាយ' : '4. Stats'}</span>
          </button>

          <button
            onClick={() => { setMainTab('membership'); setStatusBanner(null); }}
            className={`py-2 px-1 text-[10px] sm:text-[11px] font-bold rounded-xl transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              mainTab === 'membership'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="leading-tight">{isKm ? '៥. គម្រោង VIP' : '5. VIP'}</span>
          </button>
        </div>

        {/* Status Bar: Separate VIP Status, Verification, and Customer Rating */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs font-khmer flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isPremiumActive ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#064E3B] text-white flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{isKm ? '👑 សមាជិក VIP' : '👑 VIP Active'}</span>
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
            <span className="text-xs font-bold text-[#064E3B] dark:text-emerald-400 font-mono">
              {menuItems.length} / {maxMenuLimit}
            </span>
            <span className="text-[10px] text-slate-500 ml-1">
              {tr(language, 'មុខម្ហូប', 'dishes', '道菜品')}
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

          {/* TAB 1: MENU ITEMS & PRICES */}
          {mainTab === 'menu' && (
            <div>
              {menuMode === 'list' && (
                <div className="space-y-3 font-khmer">
                  {/* Friendly Khmer Step-by-Step Guide */}
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-[#064E3B] dark:text-emerald-300 text-xs">
                        {isKm ? '📋 គ្រប់គ្រងមុខម្ហូប និងតម្លៃក្នុងហាងរបស់អ្នក' : '📋 Manage Your Store Menu & Prices'}
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        {isKm
                          ? 'ចុច "+ បន្ថែមមុខម្ហូបថ្មី" ដើម្បីដាក់រូបម្ហូប និងតម្លៃ ឬចុច "កែប្រែ / លុប" លើមុខម្ហូបនីមួយៗ។'
                          : 'Tap "+ Add New Dish" to add dishes with photos and prices, or Edit / Delete existing items.'}
                      </p>
                    </div>
                  </div>

                  {menuItems.length < maxMenuLimit ? (
                    <button
                      type="button"
                      onClick={handleStartAdd}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:from-[#047857] hover:to-[#065F46] text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-amber-300" />
                      <span>{tr(language, '+ បន្ថែមមុខម្ហូបថ្មី (Add New Dish)', '+ Add New Dish', '+ 添加新菜品')}</span>
                    </button>
                  ) : !isPremiumActive ? (
                    <button
                      type="button"
                      onClick={() => setMainTab('membership')}
                      className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {tr(
                          language,
                          '👑 ពេញកំណត់គម្រោងឥតគិតថ្លៃ (៥ មុខ) — ដំឡើង VIP ដើម្បីបន្ថែមដល់ ២០ មុខ!',
                          '👑 Free limit reached (5 dishes) — Upgrade to VIP for up to 20 dishes!',
                          '👑 已达免费上限（5道）— 升级 VIP 可添加多达 20 道菜品！'
                        )}
                      </span>
                    </button>
                  ) : null}

                  {menuItems.length === 0 ? (
                    <div className="py-8 px-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 space-y-2.5 font-khmer">
                      <UtensilsCrossed className="w-10 h-10 mx-auto text-emerald-600/60" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {tr(language, 'ហាងនេះមិនទាន់មានមុខម្ហូបនៅឡើយទេ', 'No menu items added to this shop yet', '此店铺尚未添加菜品')}
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                        {tr(
                          language,
                          'បន្ថែមមុខម្ហូបឆ្ងាញ់ៗរបស់ហាងអ្នក ជាមួយរូបភាព និងតម្លៃ ដើម្បីទាក់ទាញអតិថិជន!',
                          'Add your signature dishes with photos and prices so customers can see your menu!',
                          '添加招牌菜品、照片与价格，吸引更多顾客！'
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={handleStartAdd}
                        className="px-5 py-2.5 rounded-xl bg-[#064E3B] text-white font-bold text-xs hover:bg-[#047857] transition active:scale-95 cursor-pointer"
                      >
                        {tr(language, '+ បន្ថែមមុខម្ហូបដំបូងឥឡូវនេះ', '+ Add First Dish Now', '+ 立即添加第一道菜品')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {menuItems.map((item, index) => (
                        <div 
                          key={item.id}
                          className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 space-y-2.5 shadow-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                              <img src={item.photoUrl} alt={item.nameKh} className="w-full h-full object-cover" />
                              <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-[#064E3B] text-white text-[10px] font-bold flex items-center justify-center shadow">
                                {index + 1}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-[#0F172A] dark:text-white font-khmer text-xs sm:text-sm truncate">
                                {item.nameKh}
                              </h4>
                              {item.nameEn && (
                                <p className="text-[10px] text-slate-500 truncate">{item.nameEn}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#064E3B] dark:text-emerald-400 font-black font-mono text-xs border border-emerald-200 dark:border-emerald-800">
                                  ${item.priceUsd.toFixed(2)}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  ({item.priceRiel.toLocaleString()} ៛)
                                </span>
                              </div>
                              {item.descriptionKh && (
                                <p className="text-[10px] text-slate-500 font-khmer line-clamp-1 mt-0.5">{item.descriptionKh}</p>
                              )}
                            </div>
                          </div>

                          {/* Clear Labeled Action Buttons + Safe Delete Confirmation */}
                          {confirmDeleteMenuItemId === item.id ? (
                            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-red-700 dark:text-red-300">
                                {isKm ? `តើអ្នកពិតជាចង់លុប "${item.nameKh}" មែនទេ?` : `Delete "${item.nameKh}"?`}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteRestaurantMenuItem(managingRestaurant.id, item.id);
                                    setConfirmDeleteMenuItemId(null);
                                    setStatusBanner({
                                      type: 'success',
                                      text: isKm ? `🗑️ បានលុបមុខម្ហូប "${item.nameKh}" រួចរាល់!` : `🗑️ Deleted "${item.nameKh}"!`,
                                    });
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] cursor-pointer"
                                >
                                  {isKm ? 'បាទ/ចាស លុប' : 'Yes, Delete'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteMenuItemId(null)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer"
                                >
                                  {isKm ? 'បោះបង់' : 'Cancel'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                className="py-1.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[#064E3B] dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>{isKm ? '✏️ កែប្រែម្ហូប និងតម្លៃ' : '✏️ Edit Dish & Price'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteMenuItemId(item.id)}
                                className="py-1.5 px-3 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{isKm ? '🗑️ លុបមុខម្ហូប' : '🗑️ Delete Dish'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Menu Add / Edit Form */}
              {(menuMode === 'add' || menuMode === 'edit') && (
                <form onSubmit={handleMenuSubmit} noValidate className="space-y-3 font-khmer">
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-2">
                    <h3 className="font-bold text-xs sm:text-sm text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>
                        {menuMode === 'add'
                          ? (isKm ? '➕ បន្ថែមមុខម្ហូបថ្មី និងតម្លៃ' : '➕ Add New Dish & Price')
                          : (isKm ? '✏️ កែប្រែមុខម្ហូប និងតម្លៃ' : '✏️ Edit Dish & Price')}
                      </span>
                    </h3>
                    <button
                      type="button"
                      onClick={resetMenuForm}
                      className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                    >
                      {isKm ? 'បោះបង់ (Cancel)' : 'Cancel'}
                    </button>
                  </div>

                  <div>
                    <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                      {isKm ? '១. ឈ្មោះមុខម្ហូប (ជាភាសាខ្មែរ) *' : '1. Dish Name (Khmer) *'}
                    </label>
                    <input
                      ref={nameKhInputRef}
                      type="text"
                      value={nameKh}
                      onChange={e => setNameKh(e.target.value)}
                      placeholder="ឧ. ត្រីដុតអំបិលម្ទេស ឬ សម្លកកូរ"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                      {isKm ? '២. ឈ្មោះមុខម្ហូប (ជាភាសាអង់គ្លេស - មិនបង្ខំ)' : '2. Dish Name (English - Optional)'}
                    </label>
                    <input
                      type="text"
                      value={nameEn}
                      onChange={e => setNameEn(e.target.value)}
                      placeholder="e.g. Grilled Fish with Chili Salt"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                        {isKm ? '៣. តម្លៃដុល្លារ ($ USD) *' : '3. Price ($ USD) *'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={priceUsd}
                        onChange={e => {
                          setPriceUsd(e.target.value);
                          const val = parseFloat(e.target.value) || 0;
                          setPriceRiel((Math.round(val * 4100)).toString());
                        }}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                        {isKm ? '៤. តម្លៃរៀល (៛ KHR)' : '4. Price (KHR)'}
                      </label>
                      <input
                        type="number"
                        step="500"
                        value={priceRiel}
                        onChange={e => setPriceRiel(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                      {isKm ? '៥. ការពិពណ៌នាអំពីមុខម្ហូប (មិនបង្ខំ)' : '5. Short Dish Description (Optional)'}
                    </label>
                    <textarea
                      rows={2}
                      value={descriptionKh}
                      onChange={e => setDescriptionKh(e.target.value)}
                      placeholder="រៀបរាប់ពីរសជាតិ គ្រឿងផ្សំ និងរបៀបទទួលទាន..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-none focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                    />
                  </div>

                  {/* Quick Save / Cancel Bar RIGHT HERE so mobile users never have to scroll past online photos to save */}
                  <div className="grid grid-cols-2 gap-2.5 py-1">
                    <button
                      type="button"
                      onClick={resetMenuForm}
                      className="py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                    >
                      {isKm ? 'បោះបង់ (Cancel)' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingDish || isUploadingDishPhoto}
                      className="py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] disabled:opacity-60 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
                    >
                      {isSavingDish
                        ? tr(language, '⏳ កំពុងរក្សាទុក...', '⏳ Saving...', '⏳ 正在保存...')
                        : menuMode === 'add'
                        ? tr(language, '💾 រក្សាទុកមុខម្ហូប', '💾 Save Dish', '💾 保存菜品')
                        : tr(language, '💾 រក្សាទុកការកែប្រែ', '💾 Save Changes', '💾 保存修改')}
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                    <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                      {isKm ? '៦. រូបភាពមុខម្ហូប (ជ្រើសពីទូរស័ព្ទ ឬ ស្វែងរក Online) *' : '6. Dish Photo (Phone Upload or Online Search) *'}
                    </label>

                    {/* Hidden Native / Web File Inputs */}
                    <input
                      ref={foodDishGalleryRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleDishFileSelect}
                      className="hidden"
                    />
                    <input
                      ref={foodDishCameraRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      capture="environment"
                      onChange={handleDishFileSelect}
                      className="hidden"
                    />

                    {/* Active Selected Photo Preview Card (Requirement 2: Image Preview with Replace & Remove) */}
                    {dishPhotoUrl && (
                      <div className="p-3 mb-2.5 rounded-2xl bg-emerald-50 dark:bg-slate-800/90 border-2 border-emerald-500/60 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={dishPhotoUrl}
                            alt="Dish preview"
                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-emerald-300 shadow-xs"
                          />
                          <div className="min-w-0">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-[#064E3B] text-white text-[10px] font-bold">
                              {isKm ? '✓ រូបភាពដែលបានជ្រើស' : '✓ Active Photo Selected'}
                            </span>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-1 font-mono">
                              {dishPhotoUrl.startsWith('data:') 
                                ? (isKm ? 'រូបថតផ្ទាល់ពីទូរស័ព្ទ (បានបង្ហាប់រួច)' : 'Phone Camera/Gallery Upload') 
                                : dishPhotoUrl}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={handlePickDishNativeGallery}
                            className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-100 hover:text-[#064E3B] transition cursor-pointer"
                            title={isKm ? 'ផ្លាស់ប្តូររូបភាព' : 'Change Photo'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveDishPhoto}
                            className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                            title={isKm ? 'លុបរូបភាព' : 'Remove Photo'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Option A: Phone Image Upload (Gallery or Camera) */}
                    <div className="grid grid-cols-2 gap-2 mb-2.5">
                      <button
                        type="button"
                        disabled={isUploadingDishPhoto}
                        onClick={handlePickDishNativeGallery}
                        className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Image className="w-4 h-4 text-slate-950" />
                        <span>{isUploadingDishPhoto ? (isKm ? 'កំពុងដំណើរការ...' : 'Uploading...') : (isKm ? '🖼️ ជ្រើសពី Gallery' : '🖼️ Pick Gallery')}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isUploadingDishPhoto}
                        onClick={handlePickDishCamera}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4 text-amber-300" />
                        <span>{isUploadingDishPhoto ? (isKm ? 'កំពុងដំណើរការ...' : 'Uploading...') : (isKm ? '📸 ថតរូបពី Camera' : '📸 Take Photo')}</span>
                      </button>
                    </div>

                    {/* Option B: Online AI Food Photo Search Button */}
                    <button
                      type="button"
                      disabled={isSearchingOnlineDish || isUploadingDishPhoto}
                      onClick={handleSearchOnlineDishPhotos}
                      className="w-full mb-2.5 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-[#064E3B] to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 disabled:opacity-60 cursor-pointer"
                    >
                      <Sparkles className={`w-4 h-4 text-amber-300 shrink-0 ${isSearchingOnlineDish ? 'animate-spin' : ''}`} />
                      <span>
                        {isSearchingOnlineDish
                          ? (isKm ? 'កំពុងស្វែងរករូបភាពម្ហូបពី Online...' : 'Searching online food photos...')
                          : (isKm
                              ? '🤖 ស្វែងរករូបភាពម្ហូបពី Online ដោយស្វ័យប្រវត្តិ (ឥតគិតថ្លៃ $0)'
                              : '🤖 Auto-Search Matching Food Photos Online (Free $0)')}
                      </span>
                    </button>

                    {onlineDishCandidates.length > 0 && (
                      <div className="space-y-1.5 mb-2.5">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
                          {isKm
                            ? `✨ រកឃើញរូបភាពម្ហូបពី Online ចំនួន ${onlineDishCandidates.length} សន្លឹក (ចុចជ្រើសរើស)៖`
                            : `✨ Found ${onlineDishCandidates.length} online food photos (tap to select):`}
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {onlineDishCandidates.map((cand, idx) => (
                            <button
                              key={`${cand.url}-${idx}`}
                              type="button"
                              onClick={() => setDishPhotoUrl(cand.url)}
                              className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                                dishPhotoUrl === cand.url
                                  ? 'border-emerald-600 ring-2 ring-emerald-500/40'
                                  : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                              }`}
                            >
                              <img src={cand.url} alt={cand.title} className="w-full h-full object-cover" />
                              <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] px-1.5 py-0.5 truncate">
                                {cand.source}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Sample Photos & URL input fallback */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{isKm ? 'រូបភាពគំរូ ឬតំណភ្ជាប់ URL' : 'Sample Photos or Direct URL'}</span>
                      </div>
                      <input
                        type="text"
                        value={dishPhotoUrl}
                        onChange={e => setDishPhotoUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white font-mono text-[11px]"
                      />
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {sampleFoodPhotos.map((url, i) => (
                          <div
                            key={i}
                            onClick={() => setDishPhotoUrl(url)}
                            className={`aspect-16/10 rounded-lg overflow-hidden cursor-pointer border-2 transition ${
                              dishPhotoUrl === url ? 'border-[#064E3B] ring-2 ring-emerald-300' : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={url} alt="sample" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetMenuForm}
                      className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                    >
                      {isKm ? 'បោះបង់ (Cancel)' : 'Cancel'}
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingDish || isUploadingDishPhoto}
                      className="py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] disabled:opacity-60 text-white font-bold shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      {isSavingDish
                        ? tr(language, '⏳ កំពុងរក្សាទុក...', '⏳ Saving...', '⏳ 正在保存...')
                        : menuMode === 'add'
                        ? tr(language, '💾 រក្សាទុកមុខម្ហូប', '💾 Save Dish', '💾 保存菜品')
                        : tr(language, '💾 រក្សាទុកការកែប្រែ', '💾 Update Dish', '💾 保存修改')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: STORE INFORMATION & PRICES */}
          {mainTab === 'info' && (
            <form onSubmit={handleSaveStoreInfo} noValidate className="space-y-3 font-khmer">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#064E3B] dark:text-emerald-400 shrink-0" />
                    <span className="text-[11px] text-[#064E3B] dark:text-emerald-300 leading-snug font-bold">
                      {isKm 
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
                    {isKm
                      ? 'អ្នកអាចកែប្រែព័ត៌មានហាងនេះ ឬប្តូរដាក់ហាងថ្មីជំនួសហាងនេះដោយមិនបាច់បង់ប្រាក់បន្ថែមឡើយ ($0)។'
                      : 'You can edit this store or replace it with a brand-new store at zero additional cost ($0).'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManageMenuModalOpen(false);
                      setIsVipAddRestaurantModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-400 text-[#064E3B] dark:text-emerald-300 font-bold text-[10px] shrink-0 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    {isKm ? '🔄 ប្តូរហាងថ្មីជំនួស ($0)' : '🔄 Replace Store ($0)'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    {isKm ? '១. ឈ្មោះហាង (ជាភាសាខ្មែរ) *' : '1. Restaurant Name (Khmer) *'}
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
                    {isKm ? '២. ឈ្មោះហាង (ជាភាសាអង់គ្លេស)' : '2. Restaurant Name (English)'}
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
                    {isKm ? '៥. កម្រិតតម្លៃជាមធ្យមក្នុងហាង' : '5. Store Price Range'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { level: '$' as RestaurantPriceLevel, labelKh: '$ សមរម្យ', labelEn: '$ Budget' },
                      { level: '$$' as RestaurantPriceLevel, labelKh: '$$ មធ្យម', labelEn: '$$ Mid' },
                      { level: '$$$' as RestaurantPriceLevel, labelKh: '$$$ ប្រណីត', labelEn: '$$$ Fine' },
                    ]).map((opt) => (
                      <button
                        key={opt.level}
                        type="button"
                        onClick={() => setStorePriceLevel(opt.level)}
                        className={`py-2 px-2 rounded-xl border font-bold text-[11px] transition cursor-pointer ${
                          storePriceLevel === opt.level
                            ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {isKm ? opt.labelKh : opt.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    {isKm ? '៦. ខេត្ត / រាជធានី' : '6. Province / City'}
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

              <div>
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
                  {isKm ? '៩. តំណភ្ជាប់ផែនទី Google Maps URL' : '9. Google Maps URL'}
                </label>
                <input
                  type="text"
                  value={storeMapUrl}
                  onChange={e => setStoreMapUrl(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white font-mono text-[11px]"
                />
              </div>

              {/* VIP Feature: Food Video Reels (TikTok / Facebook / YouTube Video Link) */}
              <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-slate-800 rounded-2xl border border-amber-300 dark:border-amber-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <span>🎥</span>
                    <span>{isKm ? 'វីដេអូម្ហូប Food Video Reels (TikTok / Facebook / YouTube)' : 'Food Video Reels (TikTok / FB / YouTube)'}</span>
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
                    {!confirmDeleteStore ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteStore(true)}
                        className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isKm ? 'លុបហាង' : 'Delete'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => deleteRestaurant(managingRestaurant.id)}
                          className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition cursor-pointer"
                        >
                          {isKm ? 'បញ្ជាក់លុប' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteStore(false)}
                          className="px-2.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer"
                        >
                          {isKm ? 'បោះបង់' : 'Cancel'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: DEDICATED STORE PHOTOS & GALLERY SECTION */}
          {mainTab === 'photos' && (
            <div className="space-y-3.5 font-khmer">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-xs text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4" />
                    <span>
                      {tr(
                        language,
                        `📸 រូបភាពមុខហាង និងរូបភាពម្ហូប (រហូតដល់ ${maxPhotoLimit} សន្លឹក)`,
                        `📸 Store Cover & Food Gallery (Up to ${maxPhotoLimit} Photos)`,
                        `📸 店铺封面与美食相册（最多 ${maxPhotoLimit} 张）`
                      )}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {tr(
                      language,
                      'រូបទី ១ គឺជារូបភាពមុខហាងគោល (Cover)។ បន្ទាប់ពីបន្ថែម ឬផ្លាស់ប្តូររូបភាព សូមចុចប៊ូតុង "💾 រក្សាទុករូបភាពហាង"។',
                      'Photo #1 is your main storefront cover. Tap "Save Store Photos" after adding or reordering photos.',
                      '第 1 张照片为主封面。添加或调整照片后，请点击“💾 保存店铺照片”。'
                    )}
                  </p>
                </div>
              </div>

              <ShopMultiPhotoUploader
                photos={Array.from(new Set([storeCoverPhoto, ...storeGalleryPhotos])).filter(Boolean)}
                onChangePhotos={(updated) => {
                  if (updated.length > 0) {
                    setStoreCoverPhoto(updated[0]);
                    setStoreGalleryPhotos(updated.slice(1));
                  } else {
                    setStoreCoverPhoto('');
                    setStoreGalleryPhotos([]);
                  }
                }}
                shopName={storeNameKh}
                isKm={isKm}
                onToast={showToast}
                maxPhotos={maxPhotoLimit}
              />

              <button
                type="button"
                onClick={handleSavePhotosOnly}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:from-[#047857] hover:to-[#065F46] text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-[0.98] cursor-pointer"
              >
                {isKm ? '💾 រក្សាទុករូបភាពហាងទាំងអស់ (Save Store Photos)' : '💾 Save All Store Photos'}
              </button>
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

              {/* 4 Metric Cards */}
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

          {/* TAB 5: VIP MEMBERSHIP PLAN & DIRECT SUPPORT (Free vs VIP Comparison & Synced Pricing) */}
          {mainTab === 'membership' && (
            <div className="space-y-4 font-khmer">
              {/* 1. Current Shop Plan, Payment Status & Expiration Summary Card */}
              <div
                className={`p-4 rounded-2xl border-2 space-y-2.5 ${
                  isPremiumActive
                    ? 'bg-gradient-to-br from-emerald-50 via-teal-50/70 to-amber-50/40 dark:from-emerald-950/40 dark:to-slate-900 border-emerald-500/80'
                    : vipState === 'pending_vip'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1 shadow-xs ${
                        isAdmin
                          ? 'bg-amber-400 text-slate-950'
                          : isPremiumActive
                          ? 'bg-[#064E3B] text-white'
                          : vipState === 'pending_vip'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {isAdmin
                          ? tr(language, '🛡️ គណនី Admin (សិទ្ធិ VIP អចិន្ត្រៃយ៍)', '🛡️ System Admin (Permanent VIP)', '🛡️ 系统管理员（永久 VIP）')
                          : isPremiumActive
                          ? tr(language, '👑 គម្រោង VIP កំពុងដំណើរការ', '👑 Active VIP Plan', '👑 VIP 会员已激活')
                          : vipState === 'pending_vip'
                          ? tr(language, '⏳ កំពុងរង់ចាំ Admin អនុម័ត VIP', '⏳ Pending VIP Verification', '⏳ 等待管理员审核 VIP')
                          : isExpired
                          ? tr(language, '⚠️ គម្រោង VIP បានផុតកំណត់', '⚠️ VIP Plan Expired', '⚠️ VIP 会员已过期')
                          : tr(language, '🏷️ គម្រោងមូលដ្ឋានឥតគិតថ្លៃ ($0)', '🏷️ Free Basic Plan ($0)', '🏷️ 免费基础计划 ($0)')}
                      </span>
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {isAdmin
                      ? tr(language, 'ស្ថានភាព៖ អនុម័តពេញលេញ ($0)', 'Status: Full Admin Access', '状态：管理员全权限')
                      : isPremiumActive
                      ? tr(language, 'ការបង់ប្រាក់៖ ✅ បានផ្ទៀងផ្ទាត់', 'Payment: ✅ Verified', '支付状态：✅ 已验证')
                      : vipState === 'pending_vip'
                      ? tr(language, 'ការបង់ប្រាក់៖ ⏳ រង់ចាំពិនិត្យ', 'Payment: ⏳ Pending Review', '支付状态：⏳ 待审核')
                      : tr(language, 'ការបង់ប្រាក់៖ ឥតគិតថ្លៃ ($0)', 'Payment: Free Tier ($0)', '支付状态：免费 ($0)')}
                  </span>
                </div>

                {/* Expiration Date & Remaining Days */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-[11px] flex-wrap gap-2">
                  <div className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#064E3B] dark:text-emerald-400" />
                    <span>
                      {isAdmin
                        ? tr(language, 'សុពលភាព VIP៖ គ្មានថ្ងៃផុតកំណត់ (Permanent)', 'VIP Expiry: Never Expires (Admin)', '有效期：永久有效（管理员）')
                        : formattedVipExpiry
                        ? tr(
                            language,
                            `ថ្ងៃផុតកំណត់ VIP៖ ${formattedVipExpiry}${vipRemainingDays > 0 ? ` (នៅសល់ ${vipRemainingDays} ថ្ងៃ)` : ''}`,
                            `VIP Expiration: ${formattedVipExpiry}${vipRemainingDays > 0 ? ` (${vipRemainingDays} days left)` : ''}`,
                            `VIP 到期日：${formattedVipExpiry}${vipRemainingDays > 0 ? `（剩余 ${vipRemainingDays} 天）` : ''}`
                          )
                        : tr(
                            language,
                            'អ្នកកំពុងប្រើប្រាស់មុខងារគ្រប់គ្រងហាងមូលដ្ឋានដោយឥតគិតថ្លៃ ($0)។',
                            'You are using basic shop management for free ($0).',
                            '您当前正在免费使用基础店铺管理功能 ($0)。'
                          )}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Clear Comparison: Free Basic Plan ($0) vs Optional Paid VIP Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Free Basic Plan Card */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                      {tr(language, '🏷️ គម្រោងមូលដ្ឋាន (Free)', '🏷️ Free Basic Plan', '🏷️ 免费基础计划')}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono font-black text-xs">
                      $0.00
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{tr(language, 'កែប្រែព័ត៌មានហាង លេខទូរស័ព្ទ និងផែនទីដោយសេរី', 'Edit shop info, phone, hours & Google Maps link', '免费编辑店铺信息、电话、营业时间与地图链接')}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{tr(language, 'បន្ថែម និងកែប្រែមុខម្ហូបបានរហូតដល់ ៥ មុខ', 'Add & edit up to 5 food menu items', '可添加和编辑最多 5 道菜品')}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{tr(language, 'បង្ហោះរូបភាពហាងមូលដ្ឋានបាន ៣ សន្លឹក', 'Upload up to 3 storefront/food photos', '可上传最多 3 张店铺/菜品照片')}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{tr(language, 'មើលស្ថិតិអ្នកចូលមើល និងផ្កាយវាយតម្លៃ', 'View store statistics & genuine customer ratings', '查看基础访问统计与顾客真实评分')}</span>
                    </li>
                  </ul>
                </div>

                {/* VIP Premium Plan Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-white to-emerald-50/60 dark:from-slate-800 dark:via-slate-800 dark:to-emerald-950/30 border-2 border-amber-400/80 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between border-b border-amber-200/70 dark:border-slate-700 pb-2">
                    <span className="font-bold text-xs text-[#064E3B] dark:text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{tr(language, '👑 គម្រោង VIP Premium', '👑 VIP Premium Plan', '👑 VIP 尊享计划')}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#064E3B] text-amber-300 font-mono font-black text-xs">
                      ${dynamicPlansMap.quarterly.priceUsd.toFixed(2)} / ${dynamicPlansMap.annual.priceUsd.toFixed(2)}
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-200">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{tr(language, 'ស្លាកសញ្ញា 👑 VIP Gold Badge & អាទិភាពបង្ហាញលើគេ', '👑 VIP Gold Badge & Top Priority Home/Directory Ranking', '👑 VIP 金牌标识及首页/餐厅列表置顶优先展示')}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{tr(language, 'បន្ថែមមុខម្ហូប និងតម្លៃបានរហូតដល់ ២០ មុខ', 'Add & edit up to 20 menu items with AI photo search', '可添加多达 20 道菜品及价格')}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{tr(language, 'រូបភាព Gallery រហូតដល់ ៣០ សន្លឹក + វីដេអូផ្សព្វផ្សាយ (TikTok/FB)', 'Up to 30 gallery photos + Promo Video Reels (TikTok/FB)', '多达 30 张相册照片 + 推广视频链接 (TikTok/FB)')}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{tr(language, 'រួមបញ្ចូលហាង VIP ទី ១ ឥតគិតថ្លៃ ($0) និងស្ថិតិពេញលេញ', 'Includes 1st VIP Store free ($0) + full analytics & VIP tools', '包含第 1 家 VIP 店铺免费 ($0) 及完整数据分析')}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 3. Synchronized VIP Plan Selector & Optional Upgrade / Renewal Action */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border-2 border-emerald-500/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-xs text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>
                      {tr(
                        language,
                        'ជ្រើសរើសកញ្ចប់សមាជិកភាព VIP (តម្លៃផ្លូវការពី Admin)',
                        'Official VIP Plans (Synced with Admin Settings)',
                        '官方 VIP 套餐（与管理员设置实时同步）'
                      )}
                    </span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-[#064E3B] dark:text-emerald-300 font-bold border border-emerald-300">
                    {tr(language, 'មិនបង្ខំ (Optional Upgrade)', 'Optional Paid Upgrade', '可选付费升级')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(['quarterly', 'annual'] as VipPlanType[]).map((pk) => {
                    const p = dynamicPlansMap[pk];
                    const active = selectedVipPlan === pk;
                    return (
                      <button
                        key={pk}
                        type="button"
                        onClick={() => setSelectedVipPlan(pk)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          active
                            ? 'border-[#064E3B] bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-300 font-bold shadow'
                            : 'border-emerald-300/60 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{isKm ? p.nameKh : p.nameEn}</span>
                          <span className="font-mono font-black">${p.priceUsd.toFixed(2)}</span>
                        </div>
                        <div className="text-[10px] opacity-80">
                          {tr(language, `សុពលភាព ${p.durationDays} ថ្ងៃ`, `${p.durationDays} days duration`, `有效期 ${p.durationDays} 天`)}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  {tr(
                    language,
                    `ការទូទាត់តែមួយលើក $${activePlan.priceUsd.toFixed(2)} សម្រាប់រយៈពេល ${activePlan.durationDays} ថ្ងៃពេញ • រួមបញ្ចូលហាងទី ១ ឥតគិតថ្លៃ ($0) • បន្ថែមហាងបន្ទាប់ +$${storeQuota.additionalStoreFeeUsd.toFixed(2)} USD / ហាង។ ទិន្នន័យហាង និងមុខម្ហូបរបស់អ្នកត្រូវបានរក្សាទុកជានិច្ច មិនបាត់បង់ឡើយ។`,
                    `One-time payment of $${activePlan.priceUsd.toFixed(2)} for ${activePlan.durationDays} days • Includes 1st Store Free ($0) • Additional stores +$${storeQuota.additionalStoreFeeUsd.toFixed(2)} USD / store. Your existing shop data and menu items are always preserved.`,
                    `一次性支付 $${activePlan.priceUsd.toFixed(2)} 即可享受 ${activePlan.durationDays} 天 VIP 权益 • 首店免费 ($0) • 新增分店 +$${storeQuota.additionalStoreFeeUsd.toFixed(2)} USD/店。您的所有店铺数据与菜品永久保留。`
                  )}
                </p>

                {isAdmin ? (
                  <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-900 border border-emerald-400 text-[11px] text-[#064E3B] dark:text-emerald-300 font-bold flex items-center justify-between gap-2">
                    <span>
                      {tr(
                        language,
                        '✅ គណនី Admin មានសិទ្ធិ VIP អចិន្ត្រៃយ៍លើគ្រប់ហាងទាំងអស់ ដោយមិនចាំបាច់បង់ប្រាក់ឡើយ។',
                        '✅ Your Admin account has permanent full VIP access for all shops with no payment required.',
                        '✅ 您的管理员账号拥有所有店铺的永久 VIP 权限，无需付费。'
                      )}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseModal();
                      openUpgradeVipModal(isPremiumActive || isExpired);
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isPremiumActive
                        ? tr(
                            language,
                            `🔄 បន្តសុពលភាពគម្រោង VIP បន្ថែម ($${activePlan.priceUsd.toFixed(2)} / ${activePlan.durationDays} ថ្ងៃ)`,
                            `🔄 Renew / Extend VIP Plan ($${activePlan.priceUsd.toFixed(2)} / ${activePlan.durationDays} Days)`,
                            `🔄 续费 / 延长 VIP 套餐 ($${activePlan.priceUsd.toFixed(2)} / ${activePlan.durationDays} 天)`
                          )
                        : tr(
                            language,
                            `👑 ដំឡើងទៅគម្រោង ${activePlan.nameKh} ($${activePlan.priceUsd.toFixed(2)} / ${activePlan.durationDays} ថ្ងៃ)`,
                            `👑 Upgrade to ${activePlan.nameEn} ($${activePlan.priceUsd.toFixed(2)} / ${activePlan.durationDays} Days)`,
                            `👑 升级至 ${activePlan.nameEn} ($${activePlan.priceUsd.toFixed(2)} / ${activePlan.durationDays} 天)`
                          )}
                    </span>
                  </button>
                )}
              </div>

              {/* Dynamic VIP Benefits Breakdown */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <h4 className="font-bold text-xs text-[#064E3B] dark:text-emerald-400 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>
                    {tr(
                      language,
                      `អត្ថប្រយោជន៍ទាំង ${dynamicBenefits.length} យ៉ាងនៃសមាជិកភាព VIP Premium`,
                      `${dynamicBenefits.length} Full Benefits of Premium VIP Membership`,
                      `VIP 尊享会员全部 ${dynamicBenefits.length} 项特权`
                    )}
                  </span>
                </h4>

                <div className="grid grid-cols-1 gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                  {dynamicBenefits.map((b, idx) => (
                    <div key={b.id || idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                      <span>
                        <strong>
                          {idx + 1}. {isKm ? b.titleKh : b.titleEn}
                        </strong>
                        {(b.descKh || b.descEn) && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                            {isKm ? b.descKh : b.descEn}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* VIP Member Support Channel (Benefit 10) */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                <span className="font-bold text-xs text-[#064E3B] dark:text-emerald-400 block">
                  {isKm ? 'សេវាជំនួយសមាជិក VIP (VIP Member Support)' : 'VIP Member Support Channel'}
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {isKm 
                    ? 'មានចម្ងល់ ឬត្រូវការជំនួយក្នុងការរៀបចំហាង និងមុខម្ហូប? ទាក់ទងផ្ទាល់មកកាន់ក្រុមការងាររដ្ឋបាល៖' 
                    : 'Need priority assistance with your restaurant setup? Contact our VIP team directly:'}
                </p>
                <div className="flex gap-2">
                  <a
                    href="https://t.me/cheasavuth"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Telegram VIP Support</span>
                  </a>
                  <a
                    href="tel:012345678"
                    className="py-2 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition font-mono"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>012 345 678</span>
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>
        </>
        )}

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500 font-khmer">
          <span>
            {isKm
              ? `សមាជិកភាព VIP (${dynamicPlansMap.quarterly.durationDays} ថ្ងៃ $${dynamicPlansMap.quarterly.priceUsd.toFixed(2)} / ${dynamicPlansMap.annual.durationDays} ថ្ងៃ $${dynamicPlansMap.annual.priceUsd.toFixed(2)})`
              : `VIP Plans: ${dynamicPlansMap.quarterly.durationDays} Days ($${dynamicPlansMap.quarterly.priceUsd.toFixed(2)}) / ${dynamicPlansMap.annual.durationDays} Days ($${dynamicPlansMap.annual.priceUsd.toFixed(2)})`}
          </span>
          <button
            onClick={handleCloseModal}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition font-medium"
          >
            {isKm ? 'បិទ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

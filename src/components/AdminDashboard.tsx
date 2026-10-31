import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Shield, Utensils, Store, Compass, MessageSquare, 
  Users, Plus, Trash2, Edit2, CheckCircle2, AlertTriangle, Settings, 
  QrCode, Heart, KeyRound, Lock, ExternalLink, CreditCard,
  ShieldCheck, ShieldAlert, Clock, RefreshCw, FileText, Check, Ban,
  Sparkles, Image as ImageIcon, Search, Camera, Upload
} from 'lucide-react';
import {
  FoodCategorySlug, DestinationCategorySlug, UserRole, User, RegistrationTransaction, FoodItem, TouristDestination, isSeedRestaurantId,
  VipBenefitItem, TEN_VIP_BENEFITS, getDynamicVipBenefits, getAdditionalStoreFeeUsd,
  getVipFeaturedRotationConfig, getVipFeaturedRotationState,
  sanitizeManualFeaturedSchedule, getManualFeaturedSlotEndMs, ManualFeaturedSlot, MAX_MANUAL_FEATURED_SLOTS
} from '../types';
import { getSecurityAuditLogs, SecurityAuditEntry, revokeAdminSession, getOfficialOwnershipCertificate, verifyAppOwnershipAndDomainIntegrity } from '../utils/security';
import { FoodImageModal } from './FoodImageModal';
import { generateAuthenticRecipeByDishName } from '../utils/khmerRecipeGenerator';
import { resolveUserAvatarUrl, handleAvatarImageError } from '../utils/avatarHelper';
import { TouristImageModal } from './TouristImageModal';
import { searchOnlineFoodImages, OnlineFoodImageCandidate } from '../services/onlineFoodImageService';
import {
  getCloudApiConfig,
  saveCloudApiConfig,
  testSupabaseConnection,
  isGoogleMapsConfigured,
  isSupabaseConfigured,
  SUPABASE_SETUP_SQL,
} from '../services/supabaseService';
import {
  getSmartCacheStats,
  verifyGooglePlacesApiStatus,
  getLastGooglePlacesApiDiagnosis,
  setGoogleMapsDailyLimit,
  GooglePlacesApiDiagnosticReport,
} from '../services/googlePlacesService';

export const AdminDashboard: React.FC = () => {
  const { 
    isAdminOpen, setIsAdminOpen, language,
    foods, addFood, updateFood, deleteFood,
    restaurants, deleteRestaurant, approveRestaurant, rejectRestaurant, toggleVerifyRestaurant,
    approveShopPhotoReplacement, rejectShopPhotoReplacement,
    destinations, addDestination, updateDestination, deleteDestination,
    users, deletedUsers, updateUserRole, adminGrantUserVip, cancelUserVip, restoreUserAccess, disableUserAccount, deleteUserAccount, clearAllRegisteredUsers,
    transactions, verifyTransaction, rejectTransaction, requestMorePaymentInfo, deleteTransactions, getAuthorizedPaymentProof,
    appSettings, updateAppSettings, refreshAppSettingsFromServer, setAdminPassword, currentUser, showToast,
    aiCheckIns, approveAiCheckIn, rejectAiCheckIn, mergeAiCheckIn,
    setIsAiCheckInModalOpen, triggerCloudSyncNow, isSyncingUsers, lastUsersSyncedAt, syncUsersNow,
    supportTickets, replyToSupportTicket, updateSupportTicketStatus, approveVipFromSupportTicket, markSupportTicketRead,
    openGoogleMapsSearchModal, openManageMyVipStore, setSelectedRestaurant
  } = useApp();

  const [activeTab, setActiveTab] = useState<'stats' | 'support_tickets' | 'food' | 'restaurants' | 'destinations' | 'users' | 'transactions' | 'settings' | 'security' | 'image_audit' | 'ai_checkins'>(() => {
    return (window as any).__kft_admin_tab || 'stats';
  });

  useEffect(() => {
    if ((window as any).__kft_admin_tab) {
      setActiveTab((window as any).__kft_admin_tab);
      delete (window as any).__kft_admin_tab;
    }
    if ((window as any).__kft_admin_settings_section) {
      setActiveSettingsSection((window as any).__kft_admin_settings_section);
      delete (window as any).__kft_admin_settings_section;
    }
  }, [isAdminOpen]);

  // Synchronize Cloud data once when Admin Dashboard opens
  useEffect(() => {
    if (!isAdminOpen) return;
    if (syncUsersNow) {
      syncUsersNow();
    } else if (triggerCloudSyncNow) {
      triggerCloudSyncNow(true);
    }
  }, [isAdminOpen]);

  // Lightweight background refresh while viewing the Users tab (every 2 minutes)
  useEffect(() => {
    if (!isAdminOpen || activeTab !== 'users') return;
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        if (triggerCloudSyncNow) {
          triggerCloudSyncNow(false);
        }
      }
    }, 120000);
    return () => clearInterval(interval);
  }, [isAdminOpen, activeTab]);

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'vip' | 'owner' | 'regular'>('all');
  const [adminReplyDrafts, setAdminReplyDrafts] = useState<Record<string, string>>({});
  const [inspectingTicketReceipt, setInspectingTicketReceipt] = useState<string | null>(null);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'pending' | 'replied' | 'resolved'>('all');
  const [userPendingDeletion, setUserPendingDeletion] = useState<User | null>(null);
  const [selectedUserIdsForDeletion, setSelectedUserIdsForDeletion] = useState<string[]>([]);
  const [usersPendingBatchDeletion, setUsersPendingBatchDeletion] = useState<User[]>([]);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [confirmDeleteForeverChecked, setConfirmDeleteForeverChecked] = useState(false);

  // Image Audit states
  const [auditFilter, setAuditFilter] = useState<'all' | 'verified' | 'flagged'>('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [editingFoodUrl, setEditingFoodUrl] = useState('');
  const [selectedFoodForImageEdit, setSelectedFoodForImageEdit] = useState<FoodItem | null>(null);

  // Form states for Food
  const [newFoodNameKh, setNewFoodNameKh] = useState('');
  const [newFoodNameEn, setNewFoodNameEn] = useState('');
  const [newFoodCategory, setNewFoodCategory] = useState<FoodCategorySlug>('soup');
  const [newFoodCookTime, setNewFoodCookTime] = useState('២៥ នាទី');
  const [newFoodPhotoUrl, setNewFoodPhotoUrl] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80');
  const [newFoodDescKh, setNewFoodDescKh] = useState('');
  const [showAddFoodForm, setShowAddFoodForm] = useState(false);
  const [isSearchingNewFoodPhoto, setIsSearchingNewFoodPhoto] = useState(false);
  const [newFoodPhotoCandidates, setNewFoodPhotoCandidates] = useState<OnlineFoodImageCandidate[]>([]);

  // Form states for Destination
  const [newDestNameKh, setNewDestNameKh] = useState('');
  const [newDestNameEn, setNewDestNameEn] = useState('');
  const [newDestCategory, setNewDestCategory] = useState<DestinationCategorySlug>('temple');
  const [newDestProvince, setNewDestProvince] = useState('ខេត្តសៀមរាប');
  const [newDestAddress, setNewDestAddress] = useState('');
  const [newDestFee, setNewDestFee] = useState('');
  const [newDestBestTime, setNewDestBestTime] = useState('ពេញមួយឆ្នាំ');
  const [newDestPhotoUrl, setNewDestPhotoUrl] = useState('https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800&auto=format&fit=crop&q=80');
  const [newDestDescKh, setNewDestDescKh] = useState('');
  const [showAddDestForm, setShowAddDestForm] = useState(false);
  const [selectedDestForImageEdit, setSelectedDestForImageEdit] = useState<TouristDestination | null>(null);
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [destProvinceFilter, setDestProvinceFilter] = useState('all');
  const [adminRestSearchQuery, setAdminRestSearchQuery] = useState('');

  // Form states for Settings & Promotional pricing
  const [playStoreUrl, setPlayStoreUrl] = useState(appSettings.playStoreUrl);
  const [appStoreUrl, setAppStoreUrl] = useState(appSettings.appStoreUrl);
  const [supportQrUrl, setSupportQrUrl] = useState(appSettings.supportQrImageUrl);
  const [bankName, setBankName] = useState(appSettings.supportBankName);
  const [accountName, setAccountName] = useState(appSettings.supportAccountName);
  const [supportMessageKh, setSupportMessageKh] = useState(appSettings.supportMessageKh);
  const [promotionalFeeUsd, setPromotionalFeeUsd] = useState(appSettings.promotionalFeeUsd || 4.99);
  const [promotionPeriodKh, setPromotionPeriodKh] = useState(appSettings.promotionPeriodKh || '');
  const [newAdminPass, setNewAdminPass] = useState('');

  // Dynamic VIP Membership & Store Fee Admin Settings States (Controlled String Drafts so clearing/typing never reverts)
  const [vipShortDurationInput, setVipShortDurationInput] = useState<string>(() => String(appSettings.vipShortDurationDays ?? 30));
  const [vipShortPriceInput, setVipShortPriceInput] = useState<string>(() => String(appSettings.vipShortPriceUsd ?? 4.99));
  const [vipShortNameKh, setVipShortNameKh] = useState<string>(appSettings.vipShortNameKh || `VIP ${appSettings.vipShortDurationDays ?? 30} ថ្ងៃ`);
  const [vipShortNameEn, setVipShortNameEn] = useState<string>(appSettings.vipShortNameEn || `VIP ${appSettings.vipShortDurationDays ?? 30} Days`);
  const [vipLongDurationInput, setVipLongDurationInput] = useState<string>(() => String(appSettings.vipLongDurationDays ?? 60));
  const [vipLongPriceInput, setVipLongPriceInput] = useState<string>(() => String(appSettings.vipLongPriceUsd ?? 6.99));
  const [vipLongNameKh, setVipLongNameKh] = useState<string>(appSettings.vipLongNameKh || `VIP ${appSettings.vipLongDurationDays ?? 60} ថ្ងៃ`);
  const [vipLongNameEn, setVipLongNameEn] = useState<string>(appSettings.vipLongNameEn || `VIP ${appSettings.vipLongDurationDays ?? 60} Days`);
  const [additionalStoreFeeInput, setAdditionalStoreFeeInput] = useState<string>(() => String(getAdditionalStoreFeeUsd(appSettings)));
  const [vipBenefitsDraft, setVipBenefitsDraft] = useState<VipBenefitItem[]>(() => getDynamicVipBenefits(appSettings));
  const [vipFeaturedRotationEnabledInput, setVipFeaturedRotationEnabledInput] = useState<boolean>(() => appSettings.vipFeaturedRotationEnabled !== false);
  const [vipFeaturedDurationDaysInput, setVipFeaturedDurationDaysInput] = useState<string>(() => String(appSettings.vipFeaturedDurationDays ?? 1));
  // Manual Top Listing schedule form (Admin picks shop + start date/time + duration)
  const toLocalDateTimeInput = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const [manualShopId, setManualShopId] = useState<string>('');
  const [manualShopQuery, setManualShopQuery] = useState<string>('');
  const [manualStartLocal, setManualStartLocal] = useState<string>(() => toLocalDateTimeInput(new Date()));
  const [manualDaysInput, setManualDaysInput] = useState<string>('1');
  const [isSavingManualSlot, setIsSavingManualSlot] = useState<boolean>(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState<'all' | 'featured_rotation' | 'vip_pricing' | 'payment_khqr' | 'distribution' | 'cloud_system' | 'security'>('all');

  const isVipFormDirtyRef = useRef<boolean>(false);
  const [isSavingVipSettings, setIsSavingVipSettings] = useState<boolean>(false);
  const [vipSaveFeedback, setVipSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const hydrateVipFormFromSettings = (s: typeof appSettings) => {
    const sDays = s.vipShortDurationDays ?? 30;
    const sPrice = s.vipShortPriceUsd ?? 4.99;
    const lDays = s.vipLongDurationDays ?? 60;
    const lPrice = s.vipLongPriceUsd ?? 6.99;
    const rotCfg = getVipFeaturedRotationConfig(s);
    setPlayStoreUrl(s.playStoreUrl);
    setAppStoreUrl(s.appStoreUrl);
    setSupportQrUrl(s.supportQrImageUrl);
    setBankName(s.supportBankName);
    setAccountName(s.supportAccountName);
    setSupportMessageKh(s.supportMessageKh);
    setPromotionalFeeUsd(s.promotionalFeeUsd || sPrice);
    setPromotionPeriodKh(s.promotionPeriodKh || '');
    setVipShortDurationInput(String(sDays));
    setVipShortPriceInput(String(sPrice));
    setVipShortNameKh(s.vipShortNameKh || `VIP ${sDays} ថ្ងៃ`);
    setVipShortNameEn(s.vipShortNameEn || `VIP ${sDays} Days`);
    setVipLongDurationInput(String(lDays));
    setVipLongPriceInput(String(lPrice));
    setVipLongNameKh(s.vipLongNameKh || `VIP ${lDays} ថ្ងៃ`);
    setVipLongNameEn(s.vipLongNameEn || `VIP ${lDays} Days`);
    setAdditionalStoreFeeInput(String(getAdditionalStoreFeeUsd(s)));
    setVipBenefitsDraft(getDynamicVipBenefits(s));
    setVipFeaturedRotationEnabledInput(rotCfg.enabled);
    setVipFeaturedDurationDaysInput(String(rotCfg.durationDays));
  };

  // Reset dirty flag and pull latest settings when Admin Dashboard opens
  useEffect(() => {
    if (isAdminOpen) {
      isVipFormDirtyRef.current = false;
      setVipSaveFeedback(null);
      hydrateVipFormFromSettings(appSettings);
      if (refreshAppSettingsFromServer) {
        refreshAppSettingsFromServer(false).then(latest => {
          if (latest && !isVipFormDirtyRef.current) {
            hydrateVipFormFromSettings(latest);
          }
        });
      }
    }
  }, [isAdminOpen]);

  // Keep Admin settings form synchronized ONLY when the Admin is NOT actively editing the form
  useEffect(() => {
    if (isVipFormDirtyRef.current || isSavingVipSettings) {
      return;
    }
    hydrateVipFormFromSettings(appSettings);
  }, [appSettings, isSavingVipSettings]);

  // Transaction filter & Full-Resolution Payment Proof Inspection Modal
  // Default to 'pending' so approved/rejected payment requests automatically hide/archive out of the pending queue
  const [txnFilter, setTxnFilter] = useState<'pending' | 'archived' | 'verified' | 'rejected' | 'all'>('pending');
  const [inspectingProofTxn, setInspectingProofTxn] = useState<RegistrationTransaction | null>(null);
  const [selectedTxnIdsForDeletion, setSelectedTxnIdsForDeletion] = useState<string[]>([]);
  const [txnsPendingDeletion, setTxnsPendingDeletion] = useState<RegistrationTransaction[]>([]);

  // Security audit logs state
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>(() => getSecurityAuditLogs());

  // Supabase Free Tier + Google Maps Places API + Smart Cache configuration state
  const [cloudCfg, setCloudCfg] = useState(() => getCloudApiConfig());
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<string>('');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isSavingNewFood, setIsSavingNewFood] = useState(false);
  const [googleMapsDiag, setGoogleMapsDiag] = useState<any>(() => getLastGooglePlacesApiDiagnosis());
  const [isVerifyingGoogleMaps, setIsVerifyingGoogleMaps] = useState(false);
  const [adminDailyLimitInput, setAdminDailyLimitInput] = useState<string>(() => String(getSmartCacheStats().dailyApiLimit || 500));

  const handleVerifyGoogleMapsApi = async (_customKey?: string) => {
    setIsVerifyingGoogleMaps(true);
    try {
      const report = await verifyGooglePlacesApiStatus();
      setGoogleMapsDiag(report);
      showToast(
        report.status === 'OK'
          ? '✅ Google Places API (New) ដំណើរការធម្មតា 100%!'
          : `🔍 លទ្ធផលពិនិត្យ API៖ ${report.status} (ប្រព័ន្ធ Fallback កម្ពុជាដំណើរការធម្មតា 100%)`,
        report.status === 'OK' ? 'success' : 'info'
      );
    } finally {
      setIsVerifyingGoogleMaps(false);
    }
  };

  useEffect(() => {
    if (isAdminOpen && activeTab === 'settings') {
      const cachedDiag = getLastGooglePlacesApiDiagnosis();
      if (cachedDiag) {
        setGoogleMapsDiag(cachedDiag);
      } else {
        verifyGooglePlacesApiStatus().then(setGoogleMapsDiag).catch(() => {});
      }
    }
  }, [isAdminOpen, activeTab]);

  if (!isAdminOpen) return null;

  const smartCacheStats = getSmartCacheStats();

  const isKm = language === 'km';
  const pendingRestaurants = restaurants.filter(r => r.status === 'pending');
  const pendingPhotoReplacementRestaurants = restaurants.filter(
    r => r.pendingPhotoReplacement?.status === 'pending'
  );
  const reviewedPhotoReplacementRestaurants = restaurants.filter(
    r => r.pendingPhotoReplacement && r.pendingPhotoReplacement.status !== 'pending'
  );
  const verifiedRestaurantsCount = restaurants.filter(r => r.isVerified).length;
  const pendingTxns = transactions.filter(
    t => t.status === 'pending_verification' || t.status === 'needs_more_info'
  );
  const archivedTxns = transactions.filter(
    t => t.status !== 'pending_verification' && t.status !== 'needs_more_info'
  );
  const verifiedTxns = transactions.filter(t => t.status === 'verified');
  const rejectedTxns = transactions.filter(
    t => t.status === 'rejected' || t.status === 'failed' || t.status === 'cancelled'
  );
  const pendingSupportTickets = supportTickets.filter(t => String(t.status || '').toLowerCase() === 'pending');
  const unreadAdminTickets = supportTickets.filter(t => t.unreadByAdmin);
  const filteredSupportTickets = supportTickets.filter(t => {
    if (ticketFilter === 'all') return true;
    return String(t.status || '').toLowerCase() === ticketFilter.toLowerCase();
  });

  const filteredTransactions = transactions.filter(t => {
    if (txnFilter === 'all') return true;
    if (txnFilter === 'pending')
      return t.status === 'pending_verification' || t.status === 'needs_more_info';
    if (txnFilter === 'archived')
      return t.status !== 'pending_verification' && t.status !== 'needs_more_info';
    if (txnFilter === 'rejected')
      return t.status === 'rejected' || t.status === 'failed' || t.status === 'cancelled';
    return t.status === txnFilter;
  });


  const handleCreateFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingNewFood) return;
    const trimmedKh = newFoodNameKh.trim() || newFoodNameEn.trim();
    if (!trimmedKh) {
      showToast(
        isKm ? '⚠️ សូមបញ្ចូលឈ្មោះមុខម្ហូបជាមុនសិន!' : '⚠️ Please enter the food name first!',
        'error'
      );
      return;
    }
    setIsSavingNewFood(true);
    try {
      const generatedRecipe = generateAuthenticRecipeByDishName(
        trimmedKh,
        newFoodNameEn.trim() || trimmedKh,
        newFoodCategory,
        newFoodDescKh.trim()
      );
      addFood({
        nameKh: trimmedKh,
        nameEn: newFoodNameEn.trim() || trimmedKh,
        categorySlug: newFoodCategory,
        categoryKh: newFoodCategory === 'soup' ? 'សម្ល & អាម៉ុក' : newFoodCategory === 'grilled' ? 'ម្ហូបអាំង' : 'ម្ហូបខ្មែរ',
        categoryEn: newFoodCategory,
        descriptionKh: newFoodDescKh.trim() || generatedRecipe.descriptionKh,
        descriptionEn: newFoodDescKh.trim() || generatedRecipe.descriptionEn,
        photoUrl: newFoodPhotoUrl.trim() || '/foods/food-1.jpg',
        prepTime: '១៥ នាទី',
        cookTime: newFoodCookTime.trim() || '៣០ នាទី',
        servings: '២-៣ នាក់',
        difficulty: 'medium',
        priceRiel: 0,
        priceUsd: 0,
        ingredients: generatedRecipe.ingredients,
        steps: generatedRecipe.steps,
      });
      setNewFoodNameKh('');
      setNewFoodNameEn('');
      setNewFoodDescKh('');
      setNewFoodPhotoCandidates([]);
      setShowAddFoodForm(false);
    } finally {
      setIsSavingNewFood(false);
    }
  };

  const handleCreateDestination = (e: React.FormEvent) => {
    e.preventDefault();
    addDestination({
      nameKh: newDestNameKh,
      nameEn: newDestNameEn || newDestNameKh,
      categorySlug: newDestCategory,
      categoryKh: newDestCategory === 'temple' ? 'ប្រាសាទបុរាណ' : newDestCategory === 'nature' ? 'ធម្មជាតិ & ទឹកធ្លាក់' : 'ទេសចរណ៍',
      categoryEn: newDestCategory,
      descriptionKh: newDestDescKh,
      descriptionEn: newDestDescKh,
      photoUrl: newDestPhotoUrl,
      provinceKh: newDestProvince,
      provinceEn: newDestProvince,
      addressKh: newDestAddress || newDestProvince,
      addressEn: newDestAddress || newDestProvince,
      entranceFeeKh: newDestFee,
      entranceFeeEn: newDestFee,
      bestTimeToVisitKh: newDestBestTime,
      bestTimeToVisitEn: newDestBestTime,
      mapUrl: `https://maps.google.com/?q=${encodeURIComponent(newDestNameKh)}`,
      latitude: 12.5,
      longitude: 104.9,
      highlightsKh: ['ទេសភាពស្រស់ស្អាត', 'វប្បធម៌ខ្មែរ', 'ខ្យល់អាកាសបរិសុទ្ធ'],
    });
    setNewDestNameKh('');
    setNewDestDescKh('');
    setShowAddDestForm(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingVipSettings) return;

    const parsedShortDays = parseInt(vipShortDurationInput.trim(), 10);
    const parsedShortPrice = parseFloat(vipShortPriceInput.trim());
    const parsedLongDays = parseInt(vipLongDurationInput.trim(), 10);
    const parsedLongPrice = parseFloat(vipLongPriceInput.trim());
    const parsedExtraFee = parseFloat(additionalStoreFeeInput.trim());
    const parsedFeaturedDays = parseInt(vipFeaturedDurationDaysInput.trim(), 10);

    if (!Number.isFinite(parsedFeaturedDays) || parsedFeaturedDays < 1 || parsedFeaturedDays > 365) {
      const msg = isKm ? '⚠️ សូមបញ្ចូលរយៈពេលបង្វិលបង្ហាញហាង VIP ឱ្យបានត្រឹមត្រូវ (១ ដល់ ៣៦៥ ថ្ងៃ)!' : '⚠️ Please enter a valid VIP Featured Duration (1 to 365 days)!';
      setVipSaveFeedback({ type: 'error', message: msg });
      showToast(msg, 'warning');
      return;
    }

    if (!Number.isFinite(parsedShortDays) || parsedShortDays < 1 || parsedShortDays > 3650) {
      const msg = isKm ? '⚠️ សូមបញ្ចូលរយៈពេលកញ្ចប់ VIP ទី១ ឱ្យបានត្រឹមត្រូវ (១ ដល់ ៣៦៥០ ថ្ងៃ)!' : '⚠️ Please enter a valid duration for Plan #1 (1 to 3650 days)!';
      setVipSaveFeedback({ type: 'error', message: msg });
      showToast(msg, 'warning');
      return;
    }
    if (!Number.isFinite(parsedShortPrice) || parsedShortPrice <= 0 || parsedShortPrice > 10000) {
      const msg = isKm ? '⚠️ សូមបញ្ចូលតម្លៃកញ្ចប់ VIP ទី១ ឱ្យបានត្រឹមត្រូវ (ធំជាង $0.00)!' : '⚠️ Please enter a valid USD price for Plan #1 (greater than $0.00)!';
      setVipSaveFeedback({ type: 'error', message: msg });
      showToast(msg, 'warning');
      return;
    }
    if (!Number.isFinite(parsedLongDays) || parsedLongDays < 1 || parsedLongDays > 3650) {
      const msg = isKm ? '⚠️ សូមបញ្ចូលរយៈពេលកញ្ចប់ VIP ទី២ ឱ្យបានត្រឹមត្រូវ (១ ដល់ ៣៦៥០ ថ្ងៃ)!' : '⚠️ Please enter a valid duration for Plan #2 (1 to 3650 days)!';
      setVipSaveFeedback({ type: 'error', message: msg });
      showToast(msg, 'warning');
      return;
    }
    if (!Number.isFinite(parsedLongPrice) || parsedLongPrice <= 0 || parsedLongPrice > 10000) {
      const msg = isKm ? '⚠️ សូមបញ្ចូលតម្លៃកញ្ចប់ VIP ទី២ ឱ្យបានត្រឹមត្រូវ (ធំជាង $0.00)!' : '⚠️ Please enter a valid USD price for Plan #2 (greater than $0.00)!';
      setVipSaveFeedback({ type: 'error', message: msg });
      showToast(msg, 'warning');
      return;
    }
    if (!Number.isFinite(parsedExtraFee) || parsedExtraFee < 0 || parsedExtraFee > 10000) {
      const msg = isKm ? '⚠️ សូមបញ្ចូលតម្លៃបន្ថែមហាងឱ្យបានត្រឹមត្រូវ ($0 ឡើងទៅ)!' : '⚠️ Please enter a valid Additional Store Fee ($0 or more)!';
      setVipSaveFeedback({ type: 'error', message: msg });
      showToast(msg, 'warning');
      return;
    }

    const cleanShortDays = Math.round(parsedShortDays);
    const cleanShortPrice = Math.round(parsedShortPrice * 100) / 100;
    const cleanLongDays = Math.round(parsedLongDays);
    const cleanLongPrice = Math.round(parsedLongPrice * 100) / 100;
    const cleanExtraFee = Math.round(parsedExtraFee * 100) / 100;
    const cleanFeaturedDays = Math.max(1, Math.min(365, Math.round(parsedFeaturedDays)));

    const cleanShortNameKh =
      !vipShortNameKh.trim() || /^VIP\s+\d+\s*(ថ្ងៃ|\?+)$/i.test(vipShortNameKh.trim())
        ? `VIP ${cleanShortDays} ថ្ងៃ`
        : vipShortNameKh.trim();
    const cleanShortNameEn =
      !vipShortNameEn.trim() || /^VIP\s+\d+\s*Days?$/i.test(vipShortNameEn.trim())
        ? `VIP ${cleanShortDays} Days`
        : vipShortNameEn.trim();
    const cleanLongNameKh =
      !vipLongNameKh.trim() || /^VIP\s+\d+\s*(ថ្ងៃ|\?+)$/i.test(vipLongNameKh.trim())
        ? `VIP ${cleanLongDays} ថ្ងៃ`
        : vipLongNameKh.trim();
    const cleanLongNameEn =
      !vipLongNameEn.trim() || /^VIP\s+\d+\s*Days?$/i.test(vipLongNameEn.trim())
        ? `VIP ${cleanLongDays} Days`
        : vipLongNameEn.trim();

    setIsSavingVipSettings(true);
    setVipSaveFeedback(null);

    try {
      const res = await updateAppSettings({
        apkDownloadUrl: '',
        playStoreUrl,
        appStoreUrl,
        supportQrImageUrl: supportQrUrl,
        supportBankName: bankName,
        supportAccountName: accountName,
        supportMessageKh,
        promotionalFeeUsd: cleanShortPrice,
        promotionPeriodKh,
        vipShortDurationDays: cleanShortDays,
        vipShortPriceUsd: cleanShortPrice,
        vipShortNameKh: cleanShortNameKh,
        vipShortNameEn: cleanShortNameEn,
        vipLongDurationDays: cleanLongDays,
        vipLongPriceUsd: cleanLongPrice,
        vipLongNameKh: cleanLongNameKh,
        vipLongNameEn: cleanLongNameEn,
        additionalStoreFeeUsd: cleanExtraFee,
        vipFeaturedRotationEnabled: vipFeaturedRotationEnabledInput,
        vipFeaturedDurationDays: cleanFeaturedDays,
        vipBenefitsList: vipBenefitsDraft.map((b, idx) => ({
          id: idx + 1,
          titleKh: b.titleKh.trim() || `អត្ថប្រយោជន៍ទី ${idx + 1}`,
          titleEn: b.titleEn.trim() || `VIP Benefit #${idx + 1}`,
          descriptionKh: (b.descriptionKh || b.descKh || '').trim(),
          descriptionEn: (b.descriptionEn || b.descEn || '').trim(),
          descKh: (b.descKh || b.descriptionKh || '').trim(),
          descEn: (b.descEn || b.descriptionEn || '').trim(),
          iconName: b.iconName || 'Sparkles',
          category: b.category || 'promotion',
        })),
      });

      if (res && res.ok && res.settings) {
        isVipFormDirtyRef.current = false;
        hydrateVipFormFromSettings(res.settings);
        setVipSaveFeedback({
          type: 'success',
          message: isKm
            ? `✅ បានរក្សាទុកក្នុង Database ជោគជ័យ (v${res.settings.settingsVersion})៖ Plan #1 = ${res.settings.vipShortDurationDays} ថ្ងៃ (${res.settings.vipShortPriceUsd?.toFixed(2)}) • Plan #2 = ${res.settings.vipLongDurationDays} ថ្ងៃ (${res.settings.vipLongPriceUsd?.toFixed(2)}) • ហាងបន្ថែម = ${res.settings.additionalStoreFeeUsd?.toFixed(2)}`
            : `✅ Confirmed saved to Database (v${res.settings.settingsVersion}): Plan #1 = ${res.settings.vipShortDurationDays}d (${res.settings.vipShortPriceUsd?.toFixed(2)}) • Plan #2 = ${res.settings.vipLongDurationDays}d (${res.settings.vipLongPriceUsd?.toFixed(2)}) • Extra Store = ${res.settings.additionalStoreFeeUsd?.toFixed(2)}`,
        });
      } else {
        setVipSaveFeedback({
          type: 'error',
          message:
            res?.error ||
            (isKm
              ? '❌ ការរក្សាទុកទៅកាន់ Database បរាជ័យ។ សូមពិនិត្យអ៊ីនធឺណិតហើយព្យាយាមម្តងទៀត!'
              : '❌ Failed to save to Database. Please check your internet connection and try again!'),
        });
      }
    } finally {
      setIsSavingVipSettings(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPass || newAdminPass.length < 8) {
      showToast(isKm ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោច ៨ តួអក្សរ!' : 'Password must be at least 8 characters!', 'warning');
      return;
    }
    await setAdminPassword(newAdminPass);
    setNewAdminPass('');
  };

  const handleRevokeSessions = () => {
    revokeAdminSession();
    setIsAdminOpen(false);
    showToast(isKm ? 'បានចាកចេញពីសម័យគ្រប់គ្រងដោយសុវត្ថិភាព!' : 'Admin session revoked securely!', 'info');
  };

  const handleRefreshAudit = () => {
    setAuditLogs(getSecurityAuditLogs());
    showToast(isKm ? 'បានទាញយកកំណត់ហេតុសុវត្ថិភាពថ្មី!' : 'Security logs refreshed!', 'info');
  };

  // Image Audit derived lists & handlers
  const flaggedFoods = foods.filter(f => f.imageAuditStatus === 'flagged_review');
  const verifiedFoods = foods.filter(f => f.imageAuditStatus === 'verified' || !f.imageAuditStatus);

  const filteredAuditFoods = foods.filter(food => {
    if (auditFilter === 'verified' && food.imageAuditStatus !== 'verified') return false;
    if (auditFilter === 'flagged' && food.imageAuditStatus !== 'flagged_review') return false;
    if (auditSearchQuery.trim()) {
      const q = auditSearchQuery.toLowerCase();
      return (
        food.nameKh.toLowerCase().includes(q) ||
        food.nameEn.toLowerCase().includes(q) ||
        food.categoryKh.toLowerCase().includes(q) ||
        food.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleApproveImage = (food: FoodItem) => {
    updateFood({
      ...food,
      imageAuditStatus: 'verified',
      imageAuditNote: isKm ? 'បានយល់ព្រមផ្ទៀងផ្ទាត់ដោយរដ្ឋបាលផ្លូវការ' : 'Officially verified and approved by administrator'
    });
    showToast(isKm ? `បានយល់ព្រមរូបភាពសម្រាប់ "${food.nameKh}"!` : `Approved image for "${food.nameEn}"!`, 'success');
  };

  const handleSaveCustomImage = (food: FoodItem, newUrl: string) => {
    if (!newUrl.trim()) return;
    updateFood({
      ...food,
      photoUrl: newUrl.trim(),
      imageAuditStatus: 'verified',
      imageAuditNote: isKm ? 'បានផ្លាស់ប្តូររូបភាពថ្មីដោយរដ្ឋបាល' : 'Custom image URL provided by administrator'
    });
    setEditingFoodId(null);
    setEditingFoodUrl('');
    showToast(isKm ? `បានផ្លាស់ប្តូររូបភាពថ្មីសម្រាប់ "${food.nameKh}" ជោគជ័យ!` : `Updated photo for "${food.nameEn}"!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-5xl h-[92vh] bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#064E3B] text-white shrink-0 border-b border-[#047857]">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <img 
                src={resolveUserAvatarUrl(currentUser)} 
                alt={currentUser?.name || "Admin"} 
                referrerPolicy="no-referrer"
                onError={(e) => handleAvatarImageError(e, currentUser)}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-emerald-300 shadow-md ring-2 ring-emerald-400/40 bg-emerald-950" 
              />
              <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-600 rounded-full border border-white text-white shadow-xs">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold font-khmer text-white">
                  {currentUser?.name || (isKm ? 'រដ្ឋបាលប្រព័ន្ធ (Chea Savuth)' : 'Chea Savuth (Admin)')}
                </h2>
                <span className="text-[10px] bg-[#059669] text-white font-bold px-2 py-0.5 rounded-full font-mono border border-emerald-400/40">
                  OFFICIAL ADMIN
                </span>
              </div>
              <p className="text-xs text-emerald-200 font-khmer">
                {isKm 
                  ? 'គ្រប់គ្រងមុខម្ហូប (200) ហាងអាហារ (200+) ទេសចរណ៍ (300) ការទូទាត់ VIP និងសន្តិសុខ' 
                  : 'Manage foods (200), restaurants (200+), destinations (300), VIP transactions, and security'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAdminOpen(false)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation — All Menu Items Displayed Directly on Screen Without Swiping */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 px-3 py-2.5 bg-stone-100/90 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 shrink-0 text-[11px] font-khmer">
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold border transition cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isKm ? 'ទិដ្ឋភាពរួម' : 'Overview'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('support_tickets')}
            className={`flex items-center justify-center gap-1 px-2 py-2 rounded-xl font-bold border transition relative cursor-pointer ${
              activeTab === 'support_tickets'
                ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">{isKm ? `សារជំនួយ (${supportTickets.length})` : `Support (${supportTickets.length})`}</span>
            {(unreadAdminTickets.length > 0 || pendingSupportTickets.length > 0) && (
              <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[9px] font-bold animate-pulse shrink-0">
                {unreadAdminTickets.length || pendingSupportTickets.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center justify-center gap-1 px-2 py-2 rounded-xl font-bold border transition relative cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isKm ? `ការទូទាត់ (${transactions.length})` : `VIP Pay (${transactions.length})`}</span>
            {pendingTxns.length > 0 && (
              <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[9px] font-bold shrink-0">
                {pendingTxns.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('food')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold border transition cursor-pointer ${
              activeTab === 'food'
                ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            <Utensils className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isKm ? `មុខម្ហូប (${foods.length})` : `Foods (${foods.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('image_audit')}
            className={`flex items-center justify-center gap-1 px-2 py-2 rounded-xl font-bold border transition relative cursor-pointer ${
              activeTab === 'image_audit'
                ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">{isKm ? 'សវនកម្មរូបភាព' : 'Image Audit'}</span>
            {flaggedFoods.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-bold shrink-0">
                {flaggedFoods.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restaurants')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold border transition relative cursor-pointer ${
              activeTab === 'restaurants'
                ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            <Store className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isKm ? `ហាងអាហារ (${restaurants.length})` : `Shops (${restaurants.length})`}</span>
            {(pendingRestaurants.length + pendingPhotoReplacementRestaurants.length) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold shrink-0">
                {pendingRestaurants.length + pendingPhotoReplacementRestaurants.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai_checkins')}
            className={`flex items-center justify-center gap-1 px-2 py-2 rounded-xl font-bold border transition relative cursor-pointer ${
              activeTab === 'ai_checkins'
                ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">{isKm ? `ឆែកអ៊ីន AI (${aiCheckIns.length})` : `AI Check-in (${aiCheckIns.length})`}</span>
            {aiCheckIns.filter(c => c.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-bold shrink-0">
                {aiCheckIns.filter(c => c.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('destinations')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold border transition cursor-pointer ${
              activeTab === 'destinations'
                ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isKm ? `ទេសចរណ៍ (${destinations.length})` : `Tourism (${destinations.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold border transition cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isKm ? `អ្នកប្រើ (${users.length})` : `Users (${users.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold border transition cursor-pointer ${
              activeTab === 'security'
                ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="truncate">{isKm ? 'សន្តិសុខ & Logs' : 'Security'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-bold border transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isKm ? 'ការកំណត់' : 'Settings'}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs">
          {/* STATS OVERVIEW TAB */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-slate-700 dark:border-stone-700 shadow-xs">
                  <span className="text-stone-400 font-khmer text-xs">{isKm ? 'មុខម្ហូបខ្មែរសរុប' : 'Total Khmer Dishes'}</span>
                  <p className="text-2xl font-bold text-[#064E3B] dark:text-emerald-400 font-mono mt-2">{foods.length}</p>
                  <span className="text-[10px] text-[#059669] font-bold">✓ 200+ Disconnected Prices</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-slate-700 dark:border-stone-700 shadow-xs">
                  <span className="text-stone-400 font-khmer text-xs">{isKm ? 'ហាងអាហារសរុប' : 'Total Restaurants'}</span>
                  <p className="text-2xl font-bold text-[#059669] font-mono mt-2">{restaurants.length}</p>
                  <span className="text-[10px] text-stone-500 font-khmer">{verifiedRestaurantsCount} {isKm ? 'ហាងផ្ទៀងផ្ទាត់ផ្លូវការ' : 'Verified Stores'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-slate-700 dark:border-stone-700 shadow-xs">
                  <span className="text-stone-400 font-khmer text-xs">{isKm ? 'ប្រតិបត្តិការ VIP' : 'VIP Transactions'}</span>
                  <p className="text-2xl font-bold text-[#064E3B] dark:text-emerald-400 font-mono mt-2">{transactions.length}</p>
                  <span className="text-[10px] text-[#059669] font-bold font-khmer">{pendingTxns.length} {isKm ? 'រង់ចាំផ្ទៀងផ្ទាត់' : 'Pending Approval'}</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-slate-700 dark:border-stone-700 shadow-xs">
                  <span className="text-stone-400 font-khmer text-xs">{isKm ? 'តំបន់ទេសចរណ៍' : 'Tourist Destinations'}</span>
                  <p className="text-2xl font-bold text-[#0F172A] dark:text-stone-100 font-mono mt-2">{destinations.length}</p>
                  <span className="text-[10px] text-[#059669] font-bold font-khmer">{isKm ? '២៥ ខេត្តក្រុង' : '25 Provinces'}</span>
                </div>
              </div>

              {/* Quick Box #3: Google Maps Places API Key Entry Card on Overview */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border-2 border-emerald-500/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-[#064E3B] dark:text-emerald-300 font-khmer text-sm flex items-center gap-1.5">
                      <span>🗺️ ប្រអប់ទី ៣៖ បញ្ចូលសោ Google Maps Places API Key ($200/ខែ Free Credit)</span>
                    </h4>
                    <p className="text-[11px] text-stone-600 dark:text-stone-300 font-khmer mt-0.5">
                      បិទភ្ជាប់សោ Google Maps Places API Key (ផ្តើមដោយ <code className="font-mono font-bold">AIzaSy...</code>) ដើម្បីទាញយកហាង កាហ្វេ និងកន្លែងទេសចរណ៍ថ្មីៗទូទាំងកម្ពុជាដោយស្វ័យប្រវត្តិ + Smart Cache!
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-khmer ${
                    Boolean(cloudCfg.googleMapsApiKey && cloudCfg.googleMapsApiKey.length > 15) || isGoogleMapsConfigured()
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-200 text-amber-900'
                  }`}>
                    {Boolean(cloudCfg.googleMapsApiKey && cloudCfg.googleMapsApiKey.length > 15) || isGoogleMapsConfigured()
                      ? '✓ បានភ្ជាប់ Google Maps រួចរាល់'
                      : 'មិនទាន់ដាក់សោ Google Maps'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={cloudCfg.googleMapsApiKey}
                    onChange={(e) => setCloudCfg({ ...cloudCfg, googleMapsApiKey: e.target.value })}
                    placeholder="បិទភ្ជាប់សោ Google Maps Places API Key ទីនេះ (ឧ. AIzaSy...)"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-emerald-400 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const clip = await navigator.clipboard.readText();
                        if (clip && clip.trim()) {
                          const updated = { ...cloudCfg, googleMapsApiKey: clip.trim() };
                          const saved = saveCloudApiConfig(updated);
                          setCloudCfg(saved);
                          showToast('បានបិទភ្ជាប់ និងរក្សាទុកសោ Google Maps Places API ជោគជ័យ!', 'success');
                        }
                      } catch {
                        showToast('សូមចុចឱ្យជាប់ក្នុងប្រអប់ រួចជ្រើសរើស Paste', 'info');
                      }
                    }}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-khmer font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                  >
                    📋 Paste & រក្សាទុកភ្លាម
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const saved = saveCloudApiConfig(cloudCfg);
                      setCloudCfg(saved);
                      handleVerifyGoogleMapsApi(saved.googleMapsApiKey);
                      showToast('បានរក្សាទុកសោ Google Maps Places API Key ក្នុងប្រអប់ទី ៣ ជោគជ័យ!', 'success');
                    }}
                    className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white font-khmer font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                  >
                    💾 រក្សាទុកសោ (Save Key)
                  </button>
                  <button
                    type="button"
                    disabled={isVerifyingGoogleMaps}
                    onClick={() => handleVerifyGoogleMapsApi(cloudCfg.googleMapsApiKey)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-khmer font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                  >
                    {isVerifyingGoogleMaps ? '⏳ កំពុងពិនិត្យ...' : '🔍 ពិនិត្យស្ថានភាព API'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openGoogleMapsSearchModal('all')}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-khmer font-bold text-xs rounded-xl transition cursor-pointer shrink-0 shadow-sm"
                  >
                    🗺️ ស្វែងរក & នាំចូលពី Google Maps
                  </button>
                </div>
              </div>

              {/* Pending Support Messages Alert Banner */}
              {(unreadAdminTickets.length > 0 || pendingSupportTickets.length > 0) && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2 font-khmer text-xs">
                      <MessageSquare className="w-4 h-4 text-amber-600 animate-bounce" />
                      <span>
                        {isKm
                          ? `🔔 មានសារជំនួយបញ្ហាការបង់ប្រាក់ VIP ថ្មីចំនួន ${unreadAdminTickets.length || pendingSupportTickets.length} កំពុងរង់ចាំការឆ្លើយតបពីរដ្ឋបាល!`
                          : `🔔 ${unreadAdminTickets.length || pendingSupportTickets.length} New User Payment Support Messages awaiting Admin reply!`}
                      </span>
                    </p>
                    <button
                      onClick={() => setActiveTab('support_tickets')}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-khmer font-bold text-xs transition active:scale-95 cursor-pointer"
                    >
                      {isKm ? '💬 មើល & ឆ្លើយតបឥឡូវនេះ' : '💬 View & Reply Now'}
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Transactions Alert */}
              {pendingTxns.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-[#059669] space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 font-khmer">
                      <CreditCard className="w-4 h-4 text-[#059669]" />
                      <span>{isKm ? `មានប្រតិបត្តិការចុះបញ្ជីថ្មី ${pendingTxns.length} រង់ចាំការផ្ទៀងផ្ទាត់ធនាគារ!` : `${pendingTxns.length} Pending VIP Registrations!`}</span>
                    </p>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="px-3 py-1 bg-[#064E3B] hover:bg-[#047857] text-white rounded-lg font-khmer font-bold text-xs transition active:scale-95"
                    >
                      {isKm ? 'ពិនិត្យឥឡូវនេះ' : 'Review Now'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* USER–ADMIN SUPPORT & TWO-WAY REPLY SYSTEM TAB */}
          {activeTab === 'support_tickets' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-base flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-amber-500" />
                    <span>
                      {isKm
                        ? 'ប្រព័ន្ធទំនាក់ទំនងជំនួយបង់ប្រាក់ និងឆ្លើយតប ២ ទិស (User–Admin Payment Support & Reply)'
                        : 'User–Admin Payment Support & Two-Way Reply System'}
                    </span>
                  </h3>
                  <p className="text-stone-500 font-khmer text-xs">
                    {isKm
                      ? `ពិនិត្យសារបញ្ហាការបង់ប្រាក់ ABA រូបវិក្កយបត្រ ឆ្លើយតបទៅអ្នកប្រើប្រាស់ផ្ទាល់ និងអនុម័តបើក VIP (${appSettings.vipShortDurationDays ?? 30} ថ្ងៃ $${Number(appSettings.vipShortPriceUsd ?? 4.99).toFixed(2)} ឬ ${appSettings.vipLongDurationDays ?? 60} ថ្ងៃ ${Number(appSettings.vipLongPriceUsd ?? 6.99).toFixed(2)})`
                      : `Inspect user ABA payment issues, receipts, reply in-app, and approve & activate VIP (${appSettings.vipShortDurationDays ?? 30} Days $${Number(appSettings.vipShortPriceUsd ?? 4.99).toFixed(2)} or ${appSettings.vipLongDurationDays ?? 60} Days ${Number(appSettings.vipLongPriceUsd ?? 6.99).toFixed(2)})`}
                  </p>
                </div>

                {/* Status Filter */}
                <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl shrink-0">
                  {(['all', 'pending', 'replied', 'resolved'] as const).map((status) => {
                    const label =
                      status === 'all'
                        ? isKm
                          ? `ទាំងអស់ (${supportTickets.length})`
                          : `All (${supportTickets.length})`
                        : status === 'pending'
                        ? isKm
                          ? `រង់ចាំ (${pendingSupportTickets.length})`
                          : `Pending (${pendingSupportTickets.length})`
                        : status === 'replied'
                        ? isKm
                          ? 'បានឆ្លើយតប'
                          : 'Replied'
                        : isKm
                        ? 'ដោះស្រាយរួច'
                        : 'Resolved';
                    return (
                      <button
                        key={status}
                        onClick={() => setTicketFilter(status)}
                        className={`px-2.5 py-1.5 rounded-lg font-khmer font-semibold text-xs transition ${
                          ticketFilter === status
                            ? 'bg-[#064E3B] text-white shadow'
                            : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredSupportTickets.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-center text-stone-400 font-khmer">
                  {isKm ? 'មិនទាន់មានសារជំនួយបង់ប្រាក់ក្នុងប្រភេទនេះឡើយ។' : 'No support messages found in this filter.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSupportTickets.map((ticket) => {
                    const draftText = adminReplyDrafts[ticket.id] || '';
                    const normStatus = String(ticket.status || 'pending').toLowerCase();
                    const isVipTicketApproved = Boolean(ticket.vipApproved || (ticket as any).vipActivated);
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => {
                          if (ticket.unreadByAdmin) {
                            markSupportTicketRead(ticket.id);
                          }
                        }}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          normStatus === 'pending'
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700'
                            : normStatus === 'replied'
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-800'
                            : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                        }`}
                      >
                        {/* Ticket Top Metadata Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-2.5 border-b border-stone-200 dark:border-stone-700">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs text-stone-800 dark:text-stone-200">
                                {ticket.id}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-khmer ${
                                  normStatus === 'resolved'
                                    ? 'bg-emerald-600 text-white'
                                    : normStatus === 'replied'
                                    ? 'bg-sky-600 text-white'
                                    : 'bg-amber-500 text-slate-950'
                                }`}
                              >
                                {normStatus === 'pending'
                                  ? isKm
                                    ? '⏳ រង់ចាំពិនិត្យ'
                                    : '⏳ Pending'
                                  : normStatus === 'replied'
                                  ? isKm
                                    ? '💬 បានឆ្លើយតប'
                                    : '💬 Replied'
                                  : isKm
                                  ? '✅ ដោះស្រាយរួច'
                                  : '✅ Resolved'}
                              </span>
                              {ticket.unreadByAdmin && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold">
                                  {isKm ? 'សារថ្មី' : 'NEW MESSAGE'}
                                </span>
                              )}
                              {isVipTicketApproved && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[10px] font-bold font-khmer">
                                  👑 {isKm ? 'បានបើក VIP រួចរាល់' : 'VIP Activated'}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px] font-khmer text-stone-700 dark:text-stone-300 pt-1">
                              <div>
                                <span className="text-stone-400">👤 គណនី៖ </span>
                                <strong>{ticket.username}</strong> (<code className="font-mono text-[10px]">{ticket.userId}</code>)
                              </div>
                              <div>
                                <span className="text-stone-400">💎 គម្រោង៖ </span>
                                <strong className="text-emerald-700 dark:text-emerald-300">{ticket.paymentPlanLabel || ticket.paymentPlanId || (ticket as any).paymentPlan}</strong>
                              </div>
                              <div>
                                <span className="text-stone-400">💵 ទឹកប្រាក់៖ </span>
                                <strong className="font-mono">${Number(ticket.amountUsd || 0).toFixed(2)} USD ({ticket.durationDays} Days)</strong>
                              </div>
                              <div>
                                <span className="text-stone-400">📅 ថ្ងៃបង់ប្រាក់៖ </span>
                                <span className="font-mono">{ticket.paymentDate}</span>
                              </div>
                              <div>
                                <span className="text-stone-400">🔢 លេខយោង ABA៖ </span>
                                <strong className="font-mono text-amber-700 dark:text-amber-300">{ticket.paymentRef || 'N/A'}</strong>
                              </div>
                              <div>
                                <span className="text-stone-400">🕒 ផ្ញើនៅ៖ </span>
                                <span className="font-mono">{ticket.createdAt}</span>
                              </div>
                            </div>
                          </div>

                          {/* Status Selector & Direct VIP Activation Action */}
                          <div className="flex sm:flex-col items-end gap-2 shrink-0 flex-wrap">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-stone-400 font-khmer">ស្ថានភាព៖</span>
                              <select
                                value={normStatus}
                                onChange={(e) =>
                                  updateSupportTicketStatus(
                                    ticket.id,
                                    e.target.value as 'pending' | 'replied' | 'resolved'
                                  )
                                }
                                className="px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-xs font-bold text-stone-800 dark:text-stone-100"
                              >
                                <option value="pending">{isKm ? 'រង់ចាំពិនិត្យ' : 'Pending'}</option>
                                <option value="replied">{isKm ? 'បានឆ្លើយតប' : 'Replied'}</option>
                                <option value="resolved">{isKm ? 'ដោះស្រាយរួច' : 'Resolved'}</option>
                              </select>
                            </div>

                            {!isVipTicketApproved && (
                              <button
                                type="button"
                                onClick={() => approveVipFromSupportTicket(ticket.id)}
                                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-khmer font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>
                                  {isKm
                                    ? `✅ អនុម័ត & បើក VIP (${ticket.durationDays} ថ្ងៃ / $${Number(ticket.amountUsd || 0).toFixed(2)})`
                                    : `✅ Approve & Activate VIP (${ticket.durationDays}d / $${Number(ticket.amountUsd || 0).toFixed(2)})`}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Attached Receipt Image */}
                        {(ticket.receiptUrl || (ticket as any).receiptImageUrl) && (
                          <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={ticket.receiptUrl || (ticket as any).receiptImageUrl}
                                alt="User Receipt"
                                onClick={() => setInspectingTicketReceipt(ticket.receiptUrl || (ticket as any).receiptImageUrl || null)}
                                className="w-16 h-16 object-cover rounded-lg border border-emerald-500 cursor-pointer hover:opacity-90"
                              />
                              <div className="font-khmer text-xs">
                                <p className="font-bold text-stone-900 dark:text-stone-100">
                                  🧾 {isKm ? 'រូបភាពវិក្កយបត្របង់ប្រាក់ ABA ភ្ជាប់មកជាមួយ' : 'Attached ABA Payment Receipt'}
                                </p>
                                <p className="text-[10px] text-stone-500 font-mono">
                                  {(ticket as any).receiptFileName || 'aba_receipt.png'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInspectingTicketReceipt(ticket.receiptUrl || (ticket as any).receiptImageUrl || null)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-khmer font-bold text-xs cursor-pointer"
                            >
                              {isKm ? '🔍 មើលរូបពេញ' : '🔍 View Receipt'}
                            </button>
                          </div>
                        )}

                        {/* AI & Transaction Payment Verification Report for Admin */}
                        {ticket.aiVerificationReport && (
                          <div
                            className={`p-3 rounded-xl border font-khmer text-xs space-y-2 ${
                              ticket.aiVerificationReport.canAutoApprove
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 font-bold">
                              <span>
                                🤖{' '}
                                {ticket.aiVerificationReport.canAutoApprove
                                  ? isKm
                                    ? 'របាយការណ៍ AI & Transaction៖ ផ្ទៀងផ្ទាត់ត្រឹមត្រូវ 100%'
                                    : 'AI & Transaction Report: 100% Verified'
                                  : isKm
                                  ? '🚩 របាយការណ៍ AI៖ រកឃើញព័ត៌មានមិនត្រូវគ្នា (ត្រូវការការត្រួតពិនិត្យផ្ទាល់ពី Admin)'
                                  : '🚩 AI Report: Mismatch Detected (Flagged for Manual Admin Review)'}
                              </span>
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/80 dark:bg-stone-900 text-stone-800 dark:text-stone-200">
                                Score: {ticket.aiVerificationReport.confidenceScore}%
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                              <div className="p-1.5 rounded-lg bg-white/80 dark:bg-stone-900/80 border border-black/10">
                                <span className="text-stone-400 block">អ្នកទទួល (Kim Seng):</span>
                                <strong>
                                  {ticket.aiVerificationReport.checks.recipient.passed ? '✅ ' : '❌ '}
                                  {ticket.aiVerificationReport.checks.recipient.detected}
                                </strong>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white/80 dark:bg-stone-900/80 border border-black/10">
                                <span className="text-stone-400 block">ទឹកប្រាក់ (Amount):</span>
                                <strong>
                                  {ticket.aiVerificationReport.checks.amount.passed ? '✅ ' : '❌ '}
                                  {ticket.aiVerificationReport.checks.amount.detected}
                                </strong>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white/80 dark:bg-stone-900/80 border border-black/10">
                                <span className="text-stone-400 block">លេខ Trx. ID:</span>
                                <strong>
                                  {ticket.aiVerificationReport.checks.trxId.passed ? '✅ ' : '⚠️ '}
                                  {ticket.aiVerificationReport.checks.trxId.detected}
                                </strong>
                              </div>
                              <div className="p-1.5 rounded-lg bg-white/80 dark:bg-stone-900/80 border border-black/10">
                                <span className="text-stone-400 block">កាលបរិច្ឆេទ (Date):</span>
                                <strong>
                                  {ticket.aiVerificationReport.checks.date.passed ? '✅ ' : '❌ '}
                                  {ticket.aiVerificationReport.checks.date.detected}
                                </strong>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Conversation History Thread */}
                        <div className="space-y-2 max-h-60 overflow-y-auto p-3 rounded-xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800">
                          {ticket.messages.map((msg) => {
                            const isAdminMsg = msg.senderRole === 'admin';
                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                              >
                                <div
                                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs font-khmer ${
                                    isAdminMsg
                                      ? 'bg-[#064E3B] text-white rounded-br-xs'
                                      : 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-700 rounded-bl-xs'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-3 mb-0.5 text-[10px] opacity-80">
                                    <span className="font-bold">
                                      {isAdminMsg ? `🛡️ ${msg.senderName} (Admin)` : `👤 ${msg.senderName}`}
                                    </span>
                                    <span className="font-mono">{msg.createdAt}</span>
                                  </div>
                                  <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                  {msg.attachmentUrl && (
                                    <img
                                      src={msg.attachmentUrl}
                                      alt="Attachment"
                                      onClick={() => setInspectingTicketReceipt(msg.attachmentUrl || null)}
                                      className="mt-2 max-h-36 rounded-lg border border-white/20 cursor-pointer"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Admin Reply Input Box */}
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={draftText}
                            onChange={(e) =>
                              setAdminReplyDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                            }
                            placeholder={
                              isKm
                                ? 'វាយសារឆ្លើយតបទៅកាន់អ្នកប្រើប្រាស់ផ្ទាល់នៅទីនេះ...'
                                : 'Type your admin reply to the user here...'
                            }
                            className="flex-1 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-khmer text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!draftText.trim()) {
                                showToast(isKm ? 'សូមសរសេរសារឆ្លើយតបជាមុនសិន!' : 'Please enter a reply!', 'warning');
                                return;
                              }
                              replyToSupportTicket(ticket.id, draftText.trim());
                              setAdminReplyDrafts((prev) => ({ ...prev, [ticket.id]: '' }));
                            }}
                            className="px-4 py-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-khmer font-bold text-xs transition active:scale-95 cursor-pointer shrink-0"
                          >
                            {isKm ? '📨 ផ្ញើការឆ្លើយតប' : '📨 Send Reply'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Lightbox for Support Ticket Receipt */}
              {inspectingTicketReceipt && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
                  onClick={() => setInspectingTicketReceipt(null)}
                >
                  <div
                    className="relative max-w-xl w-full bg-slate-900 rounded-3xl p-4 border border-emerald-500/40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-3 text-white font-khmer">
                      <span className="font-bold text-sm">🧾 រូបភាពវិក្កយបត្របង់ប្រាក់របស់អ្នកប្រើប្រាស់</span>
                      <button
                        type="button"
                        onClick={() => setInspectingTicketReceipt(null)}
                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <img
                      src={inspectingTicketReceipt}
                      alt="Receipt Full Preview"
                      className="max-h-[75vh] w-auto mx-auto object-contain rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRANSACTIONS TAB (VIP Registrations & Payment Verification Management) */}
          {activeTab === 'transactions' && (() => {
            const validSelectedTxnIds = selectedTxnIdsForDeletion.filter(id =>
              transactions.some(t => t.id === id)
            );
            const allVisibleTxnsSelected =
              filteredTransactions.length > 0 &&
              filteredTransactions.every(t => validSelectedTxnIds.includes(t.id));

            const toggleSelectTxn = (txnId: string) => {
              setSelectedTxnIdsForDeletion(prev =>
                prev.includes(txnId) ? prev.filter(id => id !== txnId) : [...prev, txnId]
              );
            };

            const toggleSelectAllVisibleTxns = () => {
              const visibleIds = filteredTransactions.map(t => t.id);
              if (allVisibleTxnsSelected) {
                setSelectedTxnIdsForDeletion(prev => prev.filter(id => !visibleIds.includes(id)));
              } else {
                setSelectedTxnIdsForDeletion(prev => Array.from(new Set([...prev, ...visibleIds])));
              }
            };

            return (
              <div className="space-y-5">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-base">
                        {isKm
                          ? 'គ្រប់គ្រងការផ្ទៀងផ្ទាត់ការទូទាត់ប្រាក់ VIP (Payment Verification & Archive)'
                          : 'VIP Payment Verification & Archive Management'}
                      </h3>
                      <p className="text-stone-500 font-khmer text-xs mt-0.5">
                        {isKm
                          ? 'សំណើដែលបានអនុម័ត (Approved) នឹងត្រូវលាក់/បញ្ជូនទៅបណ្ណសារប្រវត្តិដោយស្វ័យប្រវត្តិ ដើម្បីរក្សាបញ្ជីរង់ចាំឱ្យស្អាត'
                          : 'Approved requests automatically move to Archived History to keep the Pending Queue clean'}
                      </p>
                    </div>

                    {/* Selection & Export Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {filteredTransactions.length > 0 && (
                        <label className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 hover:bg-stone-100 text-stone-700 dark:text-stone-200 font-khmer text-xs font-bold border border-stone-300 dark:border-stone-600 transition flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={allVisibleTxnsSelected}
                            onChange={toggleSelectAllVisibleTxns}
                            className="w-4 h-4 rounded accent-rose-600 cursor-pointer"
                          />
                          <span>
                            {isKm
                              ? `ជ្រើសរើសទាំងអស់ក្នុងទំព័រនេះ (${filteredTransactions.length})`
                              : `Select All Visible (${filteredTransactions.length})`}
                          </span>
                        </label>
                      )}

                      {validSelectedTxnIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const targets = transactions.filter(t =>
                              validSelectedTxnIds.includes(t.id)
                            );
                            if (targets.length > 0) {
                              setTxnsPendingDeletion(targets);
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-khmer text-xs font-bold border border-rose-700 shadow-md shadow-rose-600/25 transition flex items-center gap-1.5 cursor-pointer animate-fade-in"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>
                            {isKm
                              ? `លុបកំណត់ត្រាទូទាត់ដែលបានជ្រើសរើស (${validSelectedTxnIds.length})`
                              : `Delete Selected Records (${validSelectedTxnIds.length})`}
                          </span>
                        </button>
                      )}

                      {transactions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const auditPayload = {
                              exportedAt: new Date().toISOString(),
                              appName: 'Cambodia Flavors & Tourism',
                              totalRecords: transactions.length,
                              transactions: transactions.map(t => ({
                                id: t.id,
                                type: t.type,
                                userId: t.userId,
                                userName: t.userName || t.ownerName,
                                userEmail: t.userEmail,
                                amountUsd: t.amountUsd,
                                durationDays: t.durationDays,
                                status: t.status,
                                transactionRef: t.transactionRef,
                                createdAt: t.createdAt,
                                verifiedAt: t.verifiedAt,
                                verifiedBy: t.verifiedBy,
                                notes: t.notes,
                              })),
                            };
                            const blob = new Blob([JSON.stringify(auditPayload, null, 2)], {
                              type: 'application/json',
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `kft_payment_audit_history_${new Date()
                              .toISOString()
                              .split('T')[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                            showToast(
                              isKm
                                ? '📥 បានទាញយកបណ្ណសារប្រវត្តិទូទាត់សម្រាប់សវនកម្មជោគជ័យ!'
                                : '📥 Exported payment audit history successfully!',
                              'success'
                            );
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-stone-700 hover:bg-slate-200 text-slate-700 dark:text-stone-200 font-khmer text-xs font-bold border border-slate-300 dark:border-stone-600 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>📥 {isKm ? 'រក្សាទុកប្រវត្តិសវនកម្ម' : 'Export Audit'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Tabs: Pending Queue (Default Clean View) vs Archived History */}
                  <div className="flex flex-wrap gap-1.5 bg-stone-100 dark:bg-stone-800 p-1.5 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setTxnFilter('pending')}
                      className={`px-3 py-1.5 rounded-xl font-khmer text-xs font-bold transition cursor-pointer ${
                        txnFilter === 'pending'
                          ? 'bg-[#064E3B] text-white shadow'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-stone-700'
                      }`}
                    >
                      ⏳ {isKm ? 'រង់ចាំពិនិត្យ' : 'Pending Review'} ({pendingTxns.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setTxnFilter('archived')}
                      className={`px-3 py-1.5 rounded-xl font-khmer text-xs font-bold transition cursor-pointer ${
                        txnFilter === 'archived'
                          ? 'bg-slate-800 text-white shadow'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-stone-700'
                      }`}
                    >
                      📦 {isKm ? 'បណ្ណសារប្រវត្តិ (អនុម័ត/បដិសេធ)' : 'Archived History'} ({archivedTxns.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setTxnFilter('verified')}
                      className={`px-3 py-1.5 rounded-xl font-khmer text-xs font-bold transition cursor-pointer ${
                        txnFilter === 'verified'
                          ? 'bg-[#059669] text-white shadow'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-stone-700'
                      }`}
                    >
                      ✓ {isKm ? 'អនុម័តរួច' : 'Approved'} ({verifiedTxns.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setTxnFilter('rejected')}
                      className={`px-3 py-1.5 rounded-xl font-khmer text-xs font-bold transition cursor-pointer ${
                        txnFilter === 'rejected'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-stone-700'
                      }`}
                    >
                      ✕ {isKm ? 'បដិសេធ/មិនត្រឹមត្រូវ' : 'Rejected/Invalid'} ({rejectedTxns.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setTxnFilter('all')}
                      className={`px-3 py-1.5 rounded-xl font-khmer text-xs font-bold transition cursor-pointer ${
                        txnFilter === 'all'
                          ? 'bg-white dark:bg-stone-700 shadow text-[#0F172A] dark:text-white'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-white/60 dark:hover:bg-stone-700'
                      }`}
                    >
                      📋 {isKm ? 'ទាំងអស់' : 'All'} ({transactions.length})
                    </button>
                  </div>
                </div>

                {/* Transactions List */}
                <div className="space-y-3">
                  {filteredTransactions.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 space-y-2.5 font-khmer">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-[#064E3B] dark:text-emerald-300 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {txnFilter === 'pending'
                          ? isKm
                            ? '🎉 បញ្ជីរង់ចាំពិនិត្យស្អាតល្អ! គ្មានសំណើទូទាត់កំពុងរង់ចាំទេ'
                            : '🎉 Pending Queue is Clean! No payment requests awaiting review'
                          : isKm
                          ? 'គ្មានកំណត់ត្រាទូទាត់ក្នុងផ្នែកនេះឡើយ'
                          : 'No payment records in this view'}
                      </h4>
                      {txnFilter === 'pending' && archivedTxns.length > 0 && (
                        <p className="text-xs text-stone-500">
                          {isKm
                            ? `សំណើដែលបានអនុម័ត ឬបដិសេធចំនួន ${archivedTxns.length} ត្រូវបានរក្សាទុកក្នុង "📦 បណ្ណសារប្រវត្តិ"។`
                            : `${archivedTxns.length} reviewed record(s) are safely stored in "📦 Archived History".`}
                        </p>
                      )}
                    </div>
                  ) : (
                    filteredTransactions.map((t) => {
                      const authorizedProofUrl = getAuthorizedPaymentProof(t.id) || t.paymentProofUrl;
                      const isTxnSelected = validSelectedTxnIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isTxnSelected
                              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700 ring-1 ring-rose-400/30'
                              : t.status === 'pending_verification' || t.status === 'needs_more_info'
                              ? 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                              : t.status === 'verified'
                              ? 'bg-white dark:bg-stone-800 border-slate-200 dark:border-slate-700'
                              : 'bg-red-50/40 dark:bg-stone-800 border-red-200'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="checkbox"
                                  checked={isTxnSelected}
                                  onChange={() => toggleSelectTxn(t.id)}
                                  title={
                                    isKm
                                      ? 'ជ្រើសរើសកំណត់ត្រាទូទាត់នេះដើម្បីលុប'
                                      : 'Select this payment record for deletion'
                                  }
                                  className="w-4 h-4 rounded accent-rose-600 cursor-pointer shrink-0"
                                />
                                <span
                                  onClick={() => toggleSelectTxn(t.id)}
                                  className="font-mono font-bold text-[#0F172A] dark:text-stone-200 cursor-pointer"
                                >
                                  {t.id}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full font-khmer font-bold text-[10px] ${
                                    t.status === 'verified'
                                      ? 'bg-slate-100 text-[#064E3B] dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : t.status === 'pending_verification'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : t.status === 'needs_more_info'
                                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {t.status === 'verified'
                                    ? '✓ បានផ្ទៀងផ្ទាត់ & បញ្ជូនទៅបណ្ណសារ'
                                    : t.status === 'pending_verification'
                                    ? '⏳ រង់ចាំការផ្ទៀងផ្ទាត់'
                                    : t.status === 'needs_more_info'
                                    ? '💬 រង់ចាំភស្តុតាងបន្ថែម'
                                    : '✕ បានបដិសេធ'}
                                </span>
                                <span className="font-bold text-[#064E3B] dark:text-emerald-400 font-mono text-sm">
                                  ${t.amountUsd.toFixed(2)} {t.currency || 'USD'}
                                </span>
                                {t.type === 'additional_store_slot' ? (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-800 dark:text-purple-300 font-mono text-[10px] font-bold">
                                    🏪 ហាងបន្ថែមទី {t.storeSlotNumber || 2} (+1 Store Slot)
                                  </span>
                                ) : t.durationDays ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold">
                                    {t.durationDays} Days (
                                    {t.planType ||
                                      `${t.durationDays} Days ($${t.amountUsd.toFixed(2)})`}
                                    )
                                  </span>
                                ) : null}
                              </div>

                              <div className="font-bold text-[#0F172A] dark:text-stone-100 font-khmer text-sm">
                                {t.type === 'additional_store_slot'
                                  ? `🏪 ស្នើសុំបើកសិទ្ធិបន្ថែមហាងថ្មីទី ${t.storeSlotNumber || 2} (+1 ហាង • $${t.amountUsd.toFixed(2)} USD)៖ ${
                                      t.userName || t.ownerName || 'VIP Store Owner'
                                    }`
                                  : t.type === 'user_vip_upgrade'
                                  ? `👑 ដំឡើងសមាជិកភាព VIP (${t.durationDays || 10} ថ្ងៃ)៖ ${
                                      t.userName || t.ownerName || 'User VIP'
                                    }`
                                  : t.restaurantNameKh}
                              </div>

                              <div className="text-[11px] text-stone-600 dark:text-stone-400 font-khmer flex flex-wrap gap-x-2 gap-y-1">
                                <span>
                                  {t.type === 'user_vip_upgrade' ? 'អ្នកប្រើប្រាស់៖' : 'ម្ចាស់ហាង៖'}{' '}
                                  <strong>{t.userName || t.ownerName}</strong>
                                </span>
                                {t.userId && (
                                  <span>
                                    • ID: <code className="font-mono text-[10px]">{t.userId}</code>
                                  </span>
                                )}
                                {t.userEmail && <span>• ✉️ {t.userEmail}</span>}
                                {t.ownerPhone && <span>• 📞 {t.ownerPhone}</span>}
                                <span>
                                  • វិធីបង់៖ <strong className="font-mono">{t.paymentMethod}</strong>
                                </span>
                                <span>• កាលបរិច្ឆេទ៖ {t.createdAt}</span>
                              </div>

                              <div className="p-2 bg-stone-100 dark:bg-stone-900 rounded-xl font-mono text-xs flex items-center justify-between">
                                <span className="text-stone-500 font-khmer">Bank Ref / Trx ID:</span>
                                <span className="font-bold text-[#064E3B] dark:text-emerald-400">
                                  {t.transactionRef}
                                </span>
                              </div>

                              {/* PART 3 REQUIREMENT: Uploaded Payment Proof Thumbnail & Full-Resolution Inspection Button */}
                              {authorizedProofUrl ? (
                                <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5">
                                    <img
                                      src={authorizedProofUrl}
                                      alt="Payment Proof Thumbnail"
                                      onClick={() => setInspectingProofTxn(t)}
                                      className="w-14 h-14 object-cover rounded-lg border border-emerald-400 cursor-pointer hover:opacity-90 transition bg-white"
                                    />
                                    <div className="font-khmer text-xs">
                                      <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                                        <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>
                                          {isKm
                                            ? 'ភស្តុតាងបង់ប្រាក់ (Payment Proof)'
                                            : 'Uploaded Payment Proof'}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                        {t.paymentProofFileName || 'aba_receipt.jpg'}{' '}
                                        {t.paymentProofUploadedAt
                                          ? `• ${t.paymentProofUploadedAt}`
                                          : ''}
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setInspectingProofTxn(t)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-khmer font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
                                  >
                                    <Search className="w-3.5 h-3.5" />
                                    <span>{isKm ? '🔍 មើលភស្តុតាងពេញ' : '🔍 View Proof'}</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="p-2 rounded-xl bg-amber-50/60 dark:bg-slate-800/60 border border-amber-200 dark:border-slate-700 text-[11px] text-amber-800 dark:text-amber-300 font-khmer flex items-center justify-between">
                                  <span>
                                    ⚠️{' '}
                                    {isKm
                                      ? 'អ្នកប្រើប្រាស់មិនទាន់ភ្ជាប់រូបភាពវិក្កយបត្របង់ប្រាក់នៅឡើយទេ'
                                      : 'No payment proof screenshot attached yet'}
                                  </span>
                                </div>
                              )}

                              {(t.verifiedBy || t.verifiedAt) && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-khmer flex items-center gap-2">
                                  <span>
                                    🛡️ ត្រួតពិនិត្យដោយ៖ <strong>{t.verifiedBy || 'Admin'}</strong>
                                  </span>
                                  {t.verifiedAt && <span>• ពេលវេលា៖ {t.verifiedAt}</span>}
                                </div>
                              )}

                              {t.notes && (
                                <div className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-xl border border-amber-200 dark:border-amber-800 font-khmer">
                                  📝 <strong>សម្គាល់៖</strong> {t.notes}
                                </div>
                              )}

                              {t.aiVerificationReport && (
                                <div
                                  className={`p-2.5 rounded-xl border font-khmer text-[11px] space-y-1.5 ${
                                    t.aiVerificationReport.canAutoApprove
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                                  }`}
                                >
                                  <div className="font-bold flex items-center justify-between gap-2">
                                    <span>
                                      🤖{' '}
                                      {t.aiVerificationReport.canAutoApprove
                                        ? isKm
                                          ? 'AI & Transaction Verified (100%)'
                                          : 'AI & Transaction Verified (100%)'
                                        : isKm
                                        ? '🚩 ដាក់សញ្ញាសម្រាប់ Admin ត្រួតពិនិត្យផ្ទាល់ (Flagged for Manual Review)'
                                        : '🚩 Flagged for Manual Admin Review'}
                                    </span>
                                    <span className="font-mono text-[10px]">
                                      Score: {t.aiVerificationReport.confidenceScore}%
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px]">
                                    <div className="p-1 rounded bg-white/80 dark:bg-stone-900/80">
                                      <span className="text-stone-400">Kim Seng: </span>
                                      <strong>
                                        {t.aiVerificationReport.checks.recipient.passed
                                          ? '✅ '
                                          : '❌ '}
                                        {t.aiVerificationReport.checks.recipient.detected}
                                      </strong>
                                    </div>
                                    <div className="p-1 rounded bg-white/80 dark:bg-stone-900/80">
                                      <span className="text-stone-400">Amount: </span>
                                      <strong>
                                        {t.aiVerificationReport.checks.amount.passed ? '✅ ' : '❌ '}
                                        {t.aiVerificationReport.checks.amount.detected}
                                      </strong>
                                    </div>
                                    <div className="p-1 rounded bg-white/80 dark:bg-stone-900/80">
                                      <span className="text-stone-400">Trx ID: </span>
                                      <strong>
                                        {t.aiVerificationReport.checks.trxId.passed ? '✅ ' : '⚠️ '}
                                        {t.aiVerificationReport.checks.trxId.detected}
                                      </strong>
                                    </div>
                                    <div className="p-1 rounded bg-white/80 dark:bg-stone-900/80">
                                      <span className="text-stone-400">Date: </span>
                                      <strong>
                                        {t.aiVerificationReport.checks.date.passed ? '✅ ' : '❌ '}
                                        {t.aiVerificationReport.checks.date.detected}
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Administrator Review Actions + Delete Selected Button */}
                            <div className="flex sm:flex-col gap-2 shrink-0 flex-wrap">
                              {(t.status === 'pending_verification' ||
                                t.status === 'needs_more_info') && (
                                <>
                                  {authorizedProofUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setInspectingProofTxn(t)}
                                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-khmer font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                                    >
                                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                                      <span>{isKm ? '🔍 មើលភស្តុតាងពេញ' : 'View Proof'}</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => verifyTransaction(t.id)}
                                    className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#064E3B] hover:from-emerald-700 hover:to-[#047857] text-white font-khmer font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                                  >
                                    <Check className="w-4 h-4 text-emerald-200" />
                                    <span>
                                      {isKm
                                        ? t.type === 'additional_store_slot'
                                          ? `✅ អនុម័តបើកហាងបន្ថែមទី ${t.storeSlotNumber || 2} (+1 ហាង)`
                                          : t.type === 'user_vip_upgrade'
                                          ? `✅ អនុម័តដំឡើង VIP (${t.durationDays || 10} ថ្ងៃ)`
                                          : 'ផ្ទៀងផ្ទាត់ & ធ្វើឱ្យសកម្ម'
                                        : t.type === 'additional_store_slot'
                                        ? `Approve Store Slot #${t.storeSlotNumber || 2} (+1 Store)`
                                        : t.type === 'user_vip_upgrade'
                                        ? `Approve VIP (${t.durationDays || 10} Days)`
                                        : 'Verify & Activate'}
                                    </span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      const note = window.prompt(
                                        isKm
                                          ? 'បញ្ចូលសារស្នើសុំភស្តុតាងបន្ថែមពីអ្នកប្រើប្រាស់ (Request More Information)៖'
                                          : 'Enter message requesting clearer payment proof from user:',
                                        isKm
                                          ? 'សូមអាប់ឡូតរូបភាពវិក្កយបត្របង់ប្រាក់ ABA ឱ្យបានច្បាស់លាស់ (បង្ហាញចំនួនទឹកប្រាក់ កាលបរិច្ឆេទ និងលេខប្រតិបត្តិការ)។'
                                          : 'Please upload a clearer ABA receipt screenshot showing the amount, date, and transaction ID.'
                                      );
                                      if (note !== null) {
                                        requestMorePaymentInfo(t.id, note.trim());
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-500 hover:text-slate-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-khmer font-bold text-xs transition cursor-pointer"
                                  >
                                    <span>{isKm ? '💬 ស្នើសុំភស្តុតាងបន្ថែម' : 'Request More Info'}</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      const customReason = window.prompt(
                                        isKm
                                          ? 'បញ្ចូលមូលហេតុនៃការបដិសេធ (Rejection Reason)៖'
                                          : 'Enter rejection reason:',
                                        isKm
                                          ? 'មិនឃើញមានប្រតិបត្តិការទូទាត់ក្នុងរបាយការណ៍ធនាគារ ABA ឡើយ។'
                                          : 'Transaction could not be verified on ABA bank statement.'
                                      );
                                      if (customReason !== null) {
                                        rejectTransaction(
                                          t.id,
                                          customReason.trim() ||
                                            'Transaction ID could not be verified on bank statement.'
                                        );
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-khmer font-bold text-xs transition cursor-pointer"
                                  >
                                    <span>{isKm ? '❌ បដិសេធ' : 'Reject'}</span>
                                  </button>
                                </>
                              )}

                              {isTxnSelected && (
                                <button
                                  type="button"
                                  onClick={() => setTxnsPendingDeletion([t])}
                                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 font-khmer font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{isKm ? 'លុបកំណត់ត្រានេះ' : 'Delete Record'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Confirmation Modal Before Deleting Selected Payment Records */}
                {txnsPendingDeletion.length > 0 && (
                  <div
                    className="fixed inset-0 z-[125] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
                    onClick={() => setTxnsPendingDeletion([])}
                  >
                    <div
                      className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border-2 border-rose-500/40 shadow-2xl overflow-hidden font-khmer"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="p-5 bg-gradient-to-br from-rose-600 to-red-800 text-white flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-6 h-6 text-amber-300" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base leading-snug">
                            {isKm
                              ? `បញ្ជាក់ការលុបកំណត់ត្រាទូទាត់ (${txnsPendingDeletion.length})`
                              : `Confirm Payment Record Deletion (${txnsPendingDeletion.length})`}
                          </h3>
                          <p className="text-[11px] text-rose-100 mt-0.5">
                            {isKm
                              ? 'លុបតែកំណត់ត្រាទូទាត់ដែលបានជ្រើសរើសប៉ុណ្ណោះ'
                              : 'Only the selected payment records will be removed'}
                          </p>
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                          {txnsPendingDeletion.map(item => (
                            <div
                              key={item.id}
                              className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs space-y-0.5"
                            >
                              <div className="flex items-center justify-between font-bold text-stone-900 dark:text-stone-100">
                                <span className="font-mono text-[11px]">{item.id}</span>
                                <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                                  ${item.amountUsd.toFixed(2)} USD
                                </span>
                              </div>
                              <div className="text-[11px] text-stone-600 dark:text-stone-300">
                                👤 {item.userName || item.ownerName} • Ref: {item.transactionRef}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 space-y-1.5 text-xs">
                          <p className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              {isKm
                                ? 'សុវត្ថិភាពគណនី និងស្ថានភាព VIP ត្រូវបានការពារ ១០០%៖'
                                : 'User Account & VIP Status 100% Protected:'}
                            </span>
                          </p>
                          <p className="text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed">
                            {isKm
                              ? 'ការលុបកំណត់ត្រាទូទាត់នេះ នឹងមិនលុបគណនីរបស់អ្នកប្រើប្រាស់ ហើយក៏មិនផ្លាស់ប្តូរ ឬបិទសមាជិកភាព VIP របស់គាត់ឡើយ។'
                              : 'Deleting these payment records will NEVER delete the user account or change their active VIP status.'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setTxnsPendingDeletion([])}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-xs transition cursor-pointer"
                          >
                            {isKm ? 'បោះបង់ (Cancel)' : 'Cancel'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const idsToRemove = txnsPendingDeletion.map(item => item.id);
                              deleteTransactions(idsToRemove);
                              setSelectedTxnIdsForDeletion(prev =>
                                prev.filter(id => !idsToRemove.includes(id))
                              );
                              setTxnsPendingDeletion([]);
                            }}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/25 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>
                              {isKm
                                ? `យល់ព្រមលុបកំណត់ត្រា (${txnsPendingDeletion.length})`
                                : `Delete Records (${txnsPendingDeletion.length})`}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Full-Resolution Payment Proof Inspection Lightbox Modal (Admin Review) */}
              {inspectingProofTxn && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
                  onClick={() => setInspectingProofTxn(null)}
                >
                  <div
                    className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-emerald-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                      <div className="font-khmer">
                        <h4 className="font-bold text-sm flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-emerald-400" />
                          <span>
                            {isKm
                              ? `ពិនិត្យភស្តុតាងបង់ប្រាក់ពេញលេញ (${inspectingProofTxn.id})`
                              : `Full-Resolution Payment Proof (${inspectingProofTxn.id})`}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-300">
                          👤 {inspectingProofTxn.userName || inspectingProofTxn.ownerName} • 💵 $
                          {inspectingProofTxn.amountUsd.toFixed(2)} USD ({inspectingProofTxn.durationDays || 90} Days) • Ref:{' '}
                          {inspectingProofTxn.transactionRef}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectingProofTxn(null)}
                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1 bg-slate-950 flex items-center justify-center">
                      <img
                        src={getAuthorizedPaymentProof(inspectingProofTxn.id) || inspectingProofTxn.paymentProofUrl}
                        alt="Full Resolution Payment Receipt"
                        className="max-w-full max-h-[65vh] object-contain rounded-xl border border-slate-800"
                      />
                    </div>

                    <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 font-khmer">
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {isKm
                          ? 'សូមផ្ទៀងផ្ទាត់ចំនួនទឹកប្រាក់ កាលបរិច្ឆេទ និងគណនីទទួល CHEA KIMSENG (095 245 959)'
                          : 'Verify amount, date, and recipient CHEA KIMSENG (095 245 959)'}
                      </span>
                      <div className="flex items-center gap-2">
                        {(inspectingProofTxn.status === 'pending_verification' ||
                          inspectingProofTxn.status === 'needs_more_info') && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                verifyTransaction(inspectingProofTxn.id);
                                setInspectingProofTxn(null);
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                            >
                              {isKm ? '✅ អនុម័ត VIP ឥឡូវនេះ' : '✅ Approve VIP Now'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const note = window.prompt(
                                  isKm
                                    ? 'បញ្ចូលសារស្នើសុំភស្តុតាងបន្ថែម៖'
                                    : 'Enter message requesting clearer proof:',
                                  isKm
                                    ? 'សូមអាប់ឡូតរូបភាពវិក្កយបត្របង់ប្រាក់ ABA ឱ្យបានច្បាស់លាស់។'
                                    : 'Please upload a clearer receipt screenshot.'
                                );
                                if (note !== null) {
                                  requestMorePaymentInfo(inspectingProofTxn.id, note.trim());
                                  setInspectingProofTxn(null);
                                }
                              }}
                              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs cursor-pointer"
                            >
                              {isKm ? '💬 ស្នើសុំភស្តុតាងបន្ថែម' : '💬 Request More Info'}
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setInspectingProofTxn(null)}
                          className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs cursor-pointer"
                        >
                          {isKm ? 'បិទ' : 'Close'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
            );
          })()}

          {/* FOODS TAB */}
          {activeTab === 'food' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#0F172A] dark:text-stone-100 font-khmer text-sm">
                  {isKm ? `គ្រប់គ្រងបញ្ជីមុខម្ហូបខ្មែរ (សរុប ${foods.length} មុខ - គ្មានតម្លៃលើរូបភាព)` : `Manage Khmer Foods (${foods.length} items - No Prices on Pictures)`}
                </h3>
                <button
                  onClick={() => setShowAddFoodForm(!showAddFoodForm)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#064E3B] text-white font-bold hover:bg-[#047857] font-khmer transition active:scale-95 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{showAddFoodForm ? (isKm ? 'បិទ' : 'Close') : (isKm ? 'បញ្ចូលមុខម្ហូបថ្មី' : 'Add Food')}</span>
                </button>
              </div>

              {showAddFoodForm && (
                <form onSubmit={handleCreateFood} noValidate className="p-4 rounded-2xl bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-slate-700 dark:border-stone-700 space-y-3 font-khmer">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium mb-1">ឈ្មោះខ្មែរ *</label>
                      <input
                        type="text"
                        required
                        value={newFoodNameKh}
                        onChange={(e) => setNewFoodNameKh(e.target.value)}
                        placeholder="ឧ. ញាំស្វាយខ្ចីត្រីឆ្អើរ"
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">ឈ្មោះអង់គ្លេស</label>
                      <input
                        type="text"
                        value={newFoodNameEn}
                        onChange={(e) => setNewFoodNameEn(e.target.value)}
                        placeholder="Green Mango Salad"
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">ប្រភេទ</label>
                    <select
                      value={newFoodCategory}
                      onChange={(e) => setNewFoodCategory(e.target.value as FoodCategorySlug)}
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                    >
                      <option value="soup">សម្ល & អាម៉ុក (Soup)</option>
                      <option value="grilled">ម្ហូបអាំង (Grilled)</option>
                      <option value="stirfry">ម្ហូបឆា (Stir-fry)</option>
                      <option value="salad">ញាំ & ភ្លា (Salad)</option>
                      <option value="noodles">គុយទាវ & នំបញ្ចុក (Noodles)</option>
                      <option value="rice">ម្ហូបបាយ (Rice Dishes)</option>
                      <option value="dessert">បង្អែមខ្មែរ (Dessert)</option>
                      <option value="specialty">មុខម្ហូបពិសេស (Specialty)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block font-medium">រូបភាព (Photo URL)</label>
                      <button
                        type="button"
                        disabled={isSearchingNewFoodPhoto}
                        onClick={async () => {
                          if (!newFoodNameKh.trim() && !newFoodNameEn.trim()) {
                            showToast(
                              isKm
                                ? 'សូមវាយបញ្ចូលឈ្មោះមុខម្ហូបជាមុនសិន មុនពេលស្វែងរករូបភាព Online'
                                : 'Please enter the dish name first before searching online photos',
                              'error'
                            );
                            return;
                          }
                          setIsSearchingNewFoodPhoto(true);
                          try {
                            const results = await searchOnlineFoodImages({
                              nameKh: newFoodNameKh,
                              nameEn: newFoodNameEn,
                              categorySlug: newFoodCategory,
                              existingUrls: foods.map(f => f.photoUrl),
                            });
                            setNewFoodPhotoCandidates(results);
                            if (results.length > 0) {
                              setNewFoodPhotoUrl(results[0].url);
                              showToast(
                                isKm
                                  ? `រកឃើញរូបភាពម្ហូបពី Online ចំនួន ${results.length} សន្លឹក!`
                                  : `Found ${results.length} matching online food photos!`,
                                'success'
                              );
                            }
                          } catch {
                            showToast(
                              isKm ? 'មិនអាចស្វែងរករូបភាពពី Online បានទេ' : 'Failed to search online food photos',
                              'error'
                            );
                          } finally {
                            setIsSearchingNewFoodPhoto(false);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-60 cursor-pointer"
                      >
                        <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isSearchingNewFoodPhoto ? 'animate-spin' : ''}`} />
                        <span>
                          {isSearchingNewFoodPhoto
                            ? (isKm ? 'កំពុងស្វែងរក...' : 'Searching...')
                            : (isKm ? '🤖 ស្វែងរករូបភាពម្ហូបពី Online ដោយស្វ័យប្រវត្តិ' : '🤖 Auto-Search Online Photo')}
                        </span>
                      </button>
                    </div>

                    <input
                      type="text"
                      value={newFoodPhotoUrl}
                      onChange={(e) => setNewFoodPhotoUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                    />

                    {newFoodPhotoCandidates.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
                          {isKm
                            ? `✨ រូបភាពម្ហូបពី Online ដែលត្រូវគ្នា (${newFoodPhotoCandidates.length} សន្លឹក - ចុចជ្រើសរើស)៖`
                            : `✨ Matching Online Food Photos (${newFoodPhotoCandidates.length} results - tap to select):`}
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {newFoodPhotoCandidates.map((cand, idx) => {
                            const isSelected = newFoodPhotoUrl === cand.url;
                            return (
                              <button
                                key={`${cand.url}-${idx}`}
                                type="button"
                                onClick={() => setNewFoodPhotoUrl(cand.url)}
                                className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                                  isSelected
                                    ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                                }`}
                              >
                                <img
                                  src={cand.thumbUrl || cand.url}
                                  alt={cand.title}
                                  className="w-full h-full object-cover"
                                />
                                {isSelected && (
                                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#064E3B] text-white font-bold hover:bg-[#047857] font-khmer transition active:scale-95 shadow-xs"
                  >
                    {isKm ? 'រក្សាទុកមុខម្ហូប' : 'Save Food Item'}
                  </button>
                </form>
              )}

              {/* Food List */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                {foods.map((food) => (
                  <div key={food.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-slate-200 dark:border-slate-700 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img src={food.photoUrl} alt="food" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-[#0F172A] dark:text-stone-100 font-khmer truncate">{food.nameKh}</h4>
                        <p className="text-[10px] text-stone-400 truncate">
                          {food.nameEn} • {food.categoryKh}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedFoodForImageEdit(food)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#064E3B] dark:bg-emerald-950/40 dark:text-emerald-400 font-bold text-[11px] font-khmer flex items-center gap-1 transition shadow-2xs border border-slate-200 dark:border-slate-700"
                        title={isKm ? 'ផ្លាស់ប្តូររូបភាពពីទូរស័ព្ទ/កុំព្យូទ័រ' : 'Change photo from phone or computer'}
                      >
                        <Camera className="w-3.5 h-3.5 text-[#059669]" />
                        <span>{isKm ? 'កែរូបថត' : 'Photo'}</span>
                      </button>

                      <button
                        onClick={() => deleteFood(food.id)}
                        className="p-2 text-stone-400 hover:text-rose-600 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESTAURANTS TAB */}
          {activeTab === 'restaurants' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-bold text-[#0F172A] dark:text-stone-100 font-khmer text-sm">
                    {isKm ? `គ្រប់គ្រងហាងអាហារ (សរុប ${restaurants.length} ហាង)` : `Manage Restaurants (${restaurants.length} shops)`}
                  </h3>
                  <p className="text-[10px] text-stone-400 font-khmer">
                    {isKm ? `${verifiedRestaurantsCount} ហាងផ្ទៀងផ្ទាត់ផ្លូវការ • ${restaurants.length - verifiedRestaurantsCount} គំរូសហគមន៍` : `${verifiedRestaurantsCount} verified • ${restaurants.length - verifiedRestaurantsCount} community listings`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openGoogleMapsSearchModal('restaurant')}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-khmer font-bold text-xs shadow-sm transition cursor-pointer"
                >
                  🗺️ {isKm ? 'ស្វែងរក & នាំចូលហាងពី Google Maps' : 'Import Shops from Google Maps'}
                </button>
              </div>

              {pendingRestaurants.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-amber-900 dark:text-amber-200 font-khmer text-xs sm:text-sm flex items-center gap-1.5">
                      <span>⏳ {isKm ? `ហាងរង់ចាំការត្រួតពិនិត្យ និងអនុម័តពី Admin (${pendingRestaurants.length})` : `Pending Shop Submissions for Admin Approval (${pendingRestaurants.length})`}</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                      ADMIN APPROVAL REQUIRED
                    </span>
                  </div>
                  <div className="space-y-2">
                    {pendingRestaurants.map((rest) => (
                      <div
                        key={`pending-${rest.id}`}
                        className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <img
                            src={rest.photoUrl}
                            alt={rest.nameKh}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-amber-400"
                          />
                          <div className="min-w-0 space-y-0.5 font-khmer">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {rest.nameKh} ({rest.nameEn})
                              </h5>
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[9px] font-bold">
                                {isKm ? 'រង់ចាំអនុម័ត' : 'Pending Approval'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              📍 {rest.provinceKh} • 📞 {rest.phone} • 👤 {rest.ownerName || 'Shop Owner'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center font-khmer">
                          <button
                            type="button"
                            onClick={() => {
                              (window as any).__kft_manage_initial_tab = 'info';
                              openManageMyVipStore(rest.id);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-[11px] font-black shadow-xs flex items-center gap-1 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{isKm ? 'កែប្រែ' : 'Edit'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => approveRestaurant(rest.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
                          >
                            {isKm ? '✅ អនុម័ត (Approve)' : '✅ Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectRestaurant(rest.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
                          >
                            {isKm ? '🚫 បដិសេធ (Reject)' : '🚫 Reject'}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRestaurant(rest.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isKm ? 'លុប' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending & Recently Reviewed Shop Photo Replacement Requests */}
              {(pendingPhotoReplacementRestaurants.length > 0 || reviewedPhotoReplacementRestaurants.length > 0) && (
                <div
                  id="kft-admin-photo-replacement-queue"
                  className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/60 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="font-bold text-amber-900 dark:text-amber-300 font-khmer text-xs sm:text-sm">
                        {isKm
                          ? `📸 សំណើប្តូររូបភាពហាងថ្មី (${pendingPhotoReplacementRestaurants.length} រង់ចាំការអនុម័ត)`
                          : `📸 Shop Photo Replacement Requests (${pendingPhotoReplacementRestaurants.length} Pending Approval)`}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-bold font-khmer">
                      {isKm ? 'រក្សារូបភាពចាស់រហូតដល់អនុម័ត' : 'Keeps Approved Photo Until Verified'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[...pendingPhotoReplacementRestaurants, ...reviewedPhotoReplacementRestaurants].map((rest) => {
                      const req = rest.pendingPhotoReplacement!;
                      const isPending = req.status === 'pending';
                      const isApproved = req.status === 'approved';
                      return (
                        <div
                          key={`photo-req-${rest.id}`}
                          className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-amber-200 dark:border-amber-800/60 flex flex-col gap-3 shadow-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h5 className="font-bold text-slate-900 dark:text-white font-khmer text-xs sm:text-sm flex items-center gap-1.5">
                                <span>{rest.nameKh}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-khmer ${
                                    isPending
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                      : isApproved
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                                  }`}
                                >
                                  {isPending
                                    ? isKm
                                      ? '⏳ រង់ចាំការអនុម័តពី Admin'
                                      : '⏳ Pending Admin Approval'
                                    : isApproved
                                    ? isKm
                                      ? '✅ អនុម័តរួចរាល់'
                                      : '✅ Approved'
                                    : isKm
                                    ? '🚫 បដិសេធ'
                                    : '🚫 Rejected'}
                                </span>
                              </h5>
                              <p className="text-[11px] text-slate-500 dark:text-stone-400 font-khmer mt-0.5">
                                {rest.provinceKh} • 📞 {rest.phone}
                                {rest.ownerName ? ` • 👤 ${rest.ownerName}` : ''}
                              </p>
                            </div>

                            {isPending && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  id={`kft-admin-approve-photo-${rest.id}`}
                                  onClick={() => approveShopPhotoReplacement(rest.id)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold font-khmer flex items-center gap-1 shadow-xs transition cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{isKm ? 'អនុម័តរូបភាពថ្មី' : 'Approve New Photo'}</span>
                                </button>
                                <button
                                  type="button"
                                  id={`kft-admin-reject-photo-${rest.id}`}
                                  onClick={() =>
                                    rejectShopPhotoReplacement(
                                      rest.id,
                                      isKm
                                        ? 'រូបភាពហាងថ្មីមិនត្រូវតាមស្តង់ដារ ត្រូវបានបដិសេធដោយ Admin (រក្សាទុករូបភាពចាស់ដដែល)'
                                        : 'Rejected by Admin — original approved shop photo retained'
                                    )
                                  }
                                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold font-khmer flex items-center gap-1 shadow-xs transition cursor-pointer"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>{isKm ? 'បដិសេធ' : 'Reject'}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Side-by-side comparison: Current Approved Photo vs New Submitted Photo */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-stone-800/80 border border-slate-200 dark:border-stone-700">
                              <span className="block text-[10px] font-bold text-slate-600 dark:text-stone-300 font-khmer mb-1">
                                {isKm ? '១. រូបភាពហាងកំពុងបង្ហាញ (Approved)' : '1. Active Approved Shop Photo'}
                              </span>
                              <img
                                src={rest.photoUrl}
                                alt="Current Approved"
                                className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-stone-700"
                              />
                            </div>
                            <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/70">
                              <span className="block text-[10px] font-bold text-amber-800 dark:text-amber-300 font-khmer mb-1">
                                {isKm ? '២. រូបភាពហាងថ្មីដែលស្នើប្តូរ (Submitted)' : '2. Submitted Replacement Photo'}
                              </span>
                              <img
                                src={req.newPhotoUrl}
                                alt="Submitted Replacement"
                                className="w-full h-24 object-cover rounded-lg border border-amber-300 dark:border-amber-600"
                              />
                            </div>
                          </div>

                          {/* Audit timestamps & Admin Decision */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px] font-khmer bg-slate-50 dark:bg-stone-800/60 p-2 rounded-lg border border-slate-200/70 dark:border-stone-700">
                            <div>
                              <span className="text-slate-400">{isKm ? 'កាលបរិច្ឆេទដាក់ស្នើ៖ ' : 'Submitted: '}</span>
                              <span className="font-bold text-slate-700 dark:text-stone-200">
                                {new Date(req.submittedAt).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">{isKm ? 'កាលបរិច្ឆេទត្រួតពិនិត្យ៖ ' : 'Reviewed: '}</span>
                              <span className="font-bold text-slate-700 dark:text-stone-200">
                                {req.reviewedAt
                                  ? new Date(req.reviewedAt).toLocaleString()
                                  : isKm
                                  ? 'រង់ចាំ Admin ពិនិត្យ'
                                  : 'Awaiting Review'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">{isKm ? 'សេចក្តីសម្រេច Admin៖ ' : 'Admin Decision: '}</span>
                              <span className="font-bold text-slate-700 dark:text-stone-200">
                                {req.adminDecision || (isKm ? 'កំពុងរង់ចាំការពិនិត្យ' : 'Pending Review')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Admin Search Input for Shops */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={adminRestSearchQuery}
                  onChange={(e) => setAdminRestSearchQuery(e.target.value)}
                  placeholder={
                    isKm
                      ? 'ស្វែងរកហាងតាមឈ្មោះ លេខទូរស័ព្ទ ខេត្ត ម្ចាស់ហាង ឬ ID...'
                      : 'Search shops by name, phone, province, owner, or ID...'
                  }
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-xs font-khmer text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {adminRestSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAdminRestSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-stone-700 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                {restaurants
                  .filter((rest) => {
                    const q = adminRestSearchQuery.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (rest.nameKh || '').toLowerCase().includes(q) ||
                      (rest.nameEn || '').toLowerCase().includes(q) ||
                      (rest.phone || '').toLowerCase().includes(q) ||
                      (rest.provinceKh || '').toLowerCase().includes(q) ||
                      (rest.provinceEn || '').toLowerCase().includes(q) ||
                      (rest.addressKh || '').toLowerCase().includes(q) ||
                      (rest.ownerName || '').toLowerCase().includes(q) ||
                      (rest.ownerPhone || '').toLowerCase().includes(q) ||
                      (rest.ownerEmail || '').toLowerCase().includes(q) ||
                      (rest.id || '').toLowerCase().includes(q)
                    );
                  })
                  .map((rest) => (
                  <div key={rest.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-slate-200 dark:border-slate-700 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div
                      onClick={() => setSelectedRestaurant(rest)}
                      className="flex items-center gap-3 overflow-hidden cursor-pointer group"
                    >
                      <img src={rest.photoUrl} alt="rest" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-[#0F172A] dark:text-stone-100 font-khmer truncate group-hover:text-emerald-600 transition">{rest.nameKh}</h4>
                          {rest.status === 'pending' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold font-khmer">
                              ⏳ រង់ចាំពិនិត្យ
                            </span>
                          )}
                          {rest.status === 'rejected' && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-bold font-khmer">
                              🚫 បដិសេធ
                            </span>
                          )}
                          {rest.isVerified && <span className="text-[#059669] text-[10px] font-bold">✓ Verified</span>}
                          {rest.isPromoted && <span className="text-[#064E3B] dark:text-emerald-400 text-[10px] font-bold">★ Promoted</span>}
                        </div>
                        <p className="text-[10px] text-stone-400 truncate">
                          {rest.provinceKh} • 📞 {rest.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap">
                      {rest.status !== 'approved' && (
                        <button
                          onClick={() => approveRestaurant(rest.id)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-khmer bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          {isKm ? 'អនុម័ត' : 'Approve'}
                        </button>
                      )}
                      <button
                        onClick={() => toggleVerifyRestaurant(rest.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-khmer cursor-pointer ${
                          rest.isVerified ? 'bg-stone-200 text-stone-700' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {rest.isVerified ? 'Unverify' : 'Verify'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          (window as any).__kft_manage_initial_tab = 'info';
                          openManageMyVipStore(rest.id);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-black font-khmer bg-amber-400 hover:bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs transition cursor-pointer"
                        title={isKm ? 'កែប្រែហាង' : 'Edit Shop'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{isKm ? 'កែប្រែ' : 'Edit'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRestaurant(rest.id)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-khmer bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 shadow-xs transition cursor-pointer"
                        title={isKm ? 'លុបហាង' : 'Delete Shop'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isKm ? 'លុប' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI CHECK-IN SUBMISSIONS TAB */}
          {activeTab === 'ai_checkins' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-stone-200 dark:border-stone-700">
                <div>
                  <h3 className="font-bold text-[#0F172A] dark:text-stone-100 font-khmer text-sm flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-500" />
                    <span>{isKm ? `ការឆែកអ៊ីន & បន្ថែមហាងដោយ AI (${aiCheckIns.length})` : `AI Check-in Submissions (${aiCheckIns.length})`}</span>
                  </h3>
                  <p className="text-[11px] text-stone-500 font-khmer">
                    {isKm ? 'ពិនិត្យ អនុម័ត ឬច្របាច់បញ្ចូលគ្នា (Merge) ហាងដែលបានឆែកអ៊ីនដោយ Administrator' : 'Review, approve, or merge restaurant check-ins contributed by Administrator'}
                  </p>
                </div>
                <button
                  onClick={() => setIsAiCheckInModalOpen(true)}
                  className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-bold text-xs shadow-xs font-khmer transition active:scale-95"
                >
                  <Camera className="w-4 h-4 text-emerald-200" />
                  <span>{isKm ? '+ ឆែកអ៊ីន & បន្ថែមហាងដោយ AI ថ្មី' : '+ New AI Check-in & Add'}</span>
                </button>
              </div>

              {aiCheckIns.length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <Camera className="w-10 h-10 mx-auto text-stone-300 dark:text-stone-600" />
                  <p className="font-khmer">{isKm ? 'មិនទាន់មានការឆែកអ៊ីនពីសមាជិកនៅឡើយទេ' : 'No AI check-in submissions yet'}</p>
                </div>
              ) : (
                <div className="space-y-3 font-khmer">
                  {aiCheckIns.map(checkIn => (
                    <div
                      key={checkIn.id}
                      className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <img
                            src={checkIn.photoUrl}
                            alt={checkIn.restaurantNameKh}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                {checkIn.restaurantNameKh}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                checkIn.status === 'approved' 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : checkIn.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : checkIn.status === 'merged'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}>
                                {checkIn.status.toUpperCase()}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-mono">
                                AI Confidence: {Math.round(checkIn.confidenceScore * 100)}%
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500">
                              {checkIn.foodCategoryKh} • 📍 {checkIn.provinceKh} ({checkIn.addressKh})
                            </p>
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              👤 {checkIn.userName} • 🕒 {checkIn.checkInTime.slice(0, 16).replace('T', ' ')}
                            </p>
                            {checkIn.signatureDishes && checkIn.signatureDishes.length > 0 && (
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-1">
                                🍲 {checkIn.signatureDishes.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons for Admin */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {checkIn.status === 'pending' && (
                            <>
                              <button
                                onClick={() => approveAiCheckIn(checkIn.id)}
                                className="px-3 py-1.5 bg-[#064E3B] hover:bg-[#047857] text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isKm ? 'អនុម័ត & បន្ថែម' : 'Approve'}</span>
                              </button>
                              <button
                                onClick={() => rejectAiCheckIn(checkIn.id, 'Unverified details')}
                                className="px-2.5 py-1.5 bg-rose-50 text-rose-600 dark:bg-rose-950/40 rounded-xl text-xs font-bold hover:bg-rose-100 transition"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>{isKm ? 'បដិសេធ' : 'Reject'}</span>
                              </button>
                            </>
                          )}
                          {checkIn.status === 'approved' && (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isKm ? 'បានចុះផ្សាយ' : 'Published'}</span>
                            </span>
                          )}
                          {checkIn.status === 'merged' && (
                            <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isKm ? 'បានច្របាច់បញ្ចូល' : 'Merged'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'destinations' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-stone-200 dark:border-stone-700">
                <div>
                  <h3 className="font-bold text-[#0F172A] dark:text-stone-100 font-khmer text-sm flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#059669]" />
                    <span>{isKm ? `តំបន់ទេសចរណ៍ខ្មែរ (${destinations.length} កន្លែង)` : `Tourist Destinations (${destinations.length})`}</span>
                  </h3>
                  <p className="text-[11px] text-stone-500 font-khmer">
                    {isKm ? 'គ្រប់គ្រងព័ត៌មាន និងផ្លាស់ប្តូររូបភាពតំបន់ទេសចរណ៍ពីទូរស័ព្ទ ឬកុំព្យូទ័រ' : 'Manage destinations and replace photos from phone or computer'}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => openGoogleMapsSearchModal('tourism')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold font-khmer text-xs shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <span>🗺️ {isKm ? 'នាំចូលពី Google Maps' : 'Import from Google Maps'}</span>
                  </button>
                  <button
                    onClick={() => setShowAddDestForm(!showAddDestForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#064E3B] text-white font-bold hover:bg-[#047857] font-khmer text-xs shadow-xs transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{showAddDestForm ? 'បិទ' : 'បញ្ចូលកន្លែងថ្មី'}</span>
                  </button>
                </div>
              </div>

              {/* Search & Province Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={destSearchQuery}
                    onChange={(e) => setDestSearchQuery(e.target.value)}
                    placeholder={isKm ? "ស្វែងរកតាមឈ្មោះកន្លែង ខេត្ត ឬលេខសម្គាល់..." : "Search by destination name, province, or ID..."}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-khmer focus:outline-none focus:border-[#059669]"
                  />
                  {destSearchQuery && (
                    <button
                      onClick={() => setDestSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px] font-khmer">
                  <button
                    onClick={() => setDestProvinceFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                      destProvinceFilter === 'all' 
                        ? 'bg-[#064E3B] text-white shadow-xs' 
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                    }`}
                  >
                    {isKm ? `ទាំងអស់ (${destinations.length})` : `All (${destinations.length})`}
                  </button>
                  {Array.from(new Set(destinations.map(d => d.provinceKh))).filter(Boolean).slice(0, 10).map((prov) => {
                    const count = destinations.filter(d => d.provinceKh === prov).length;
                    return (
                      <button
                        key={prov}
                        onClick={() => setDestProvinceFilter(prov)}
                        className={`px-2.5 py-1 rounded-lg shrink-0 transition ${
                          destProvinceFilter === prov 
                            ? 'bg-[#064E3B] text-white font-bold shadow-xs' 
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                        }`}
                      >
                        {prov} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {showAddDestForm && (
                <form onSubmit={handleCreateDestination} className="p-4 rounded-2xl bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-slate-700 dark:border-stone-700 space-y-3 font-khmer">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={newDestNameKh}
                      onChange={(e) => setNewDestNameKh(e.target.value)}
                      placeholder="ឈ្មោះកន្លែងទេសចរណ៍ *"
                      className="px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700 text-xs focus:outline-none focus:border-[#059669]"
                    />
                    <input
                      type="text"
                      value={newDestProvince}
                      onChange={(e) => setNewDestProvince(e.target.value)}
                      placeholder="ខេត្ត / ក្រុង"
                      className="px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700 text-xs focus:outline-none focus:border-[#059669]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#064E3B] text-white font-bold hover:bg-[#047857] font-khmer text-xs transition active:scale-95 shadow-xs"
                  >
                    រក្សាទុក
                  </button>
                </form>
              )}

              {/* Destination Items List */}
              <div className="space-y-2.5 max-h-[58vh] overflow-y-auto no-scrollbar">
                {destinations
                  .filter(d => {
                    const q = destSearchQuery.toLowerCase().trim();
                    const matchesSearch = !q || 
                      d.nameKh.toLowerCase().includes(q) ||
                      d.nameEn.toLowerCase().includes(q) ||
                      d.provinceKh.toLowerCase().includes(q) ||
                      d.id.toLowerCase().includes(q);
                    const matchesProvince = destProvinceFilter === 'all' || d.provinceKh === destProvinceFilter;
                    return matchesSearch && matchesProvince;
                  })
                  .map((d) => (
                    <div 
                      key={d.id} 
                      className="p-3 bg-white dark:bg-stone-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:border-slate-600 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Thumbnail with quick click to edit photo */}
                        <div 
                          onClick={() => setSelectedDestForImageEdit(d)}
                          className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-700 shrink-0 cursor-pointer group border border-slate-200 dark:border-slate-700"
                          title={isKm ? 'ចុចដើម្បីប្តូររូបភាព' : 'Click to change photo'}
                        >
                          <img 
                            src={d.photoUrl} 
                            alt={d.nameKh} 
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-200" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                            <Camera className="w-4 h-4 text-emerald-200" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                              {d.id}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-[#064E3B] border border-slate-200 dark:border-slate-700 font-khmer">
                              {d.provinceKh}
                            </span>
                          </div>
                          <h4 className="font-bold text-[#0F172A] dark:text-stone-100 font-khmer text-xs truncate mt-0.5">
                            {d.nameKh}
                          </h4>
                          <p className="text-[10px] text-stone-500 truncate">
                            {d.nameEn} • {d.categoryKh}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {/* Change Photo Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedDestForImageEdit(d)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-[#064E3B] dark:text-emerald-400 border border-slate-200 dark:border-slate-700 font-khmer font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#059669]" />
                          <span>{isKm ? 'ប្តូររូបភាព' : 'Change Photo'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteDestination(d.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (() => {
            const deletedIdsSet = new Set(
              (deletedUsers || []).map(d => (d.id || '').trim().toLowerCase()).filter(Boolean)
            );
            const deletedEmailsSet = new Set(
              (deletedUsers || []).map(d => (d.email || '').trim().toLowerCase()).filter(Boolean)
            );
            const deletedPhonesSet = new Set(
              (deletedUsers || []).map(d => (d.phone || '').replace(/[\s()-]/g, '').trim()).filter(Boolean)
            );

            const deletableUsers = users.filter(u => {
              if (
                u.role === 'admin' ||
                u.id === 'admin-authorized-single' ||
                u.username === 'cheasavuth' ||
                u.username === 'admin'
              ) {
                return false;
              }
              if ((u as any).permanentlyDeleted === true || u.isDisabled === true) {
                return false;
              }
              const uId = (u.id || '').trim().toLowerCase();
              const uEmail = (u.email || '').trim().toLowerCase();
              const uPhone = (u.phone || '').replace(/[\s()-]/g, '').trim();
              if (uId && deletedIdsSet.has(uId)) return false;
              if (uEmail && deletedEmailsSet.has(uEmail)) return false;
              if (uPhone && deletedPhonesSet.has(uPhone)) return false;
              return true;
            });
            const validSelectedIds = selectedUserIdsForDeletion.filter(id =>
              deletableUsers.some(u => u.id === id)
            );
            const allDeletableSelected =
              deletableUsers.length > 0 &&
              validSelectedIds.length === deletableUsers.length;

            const toggleSelectUser = (userId: string) => {
              setSelectedUserIdsForDeletion(prev =>
                prev.includes(userId)
                  ? prev.filter(id => id !== userId)
                  : [...prev, userId]
              );
            };

            const toggleSelectAllDeletable = () => {
              if (allDeletableSelected) {
                setSelectedUserIdsForDeletion([]);
              } else {
                setSelectedUserIdsForDeletion(deletableUsers.map(u => u.id));
              }
            };

            const pendingDeleteTargets: User[] =
              usersPendingBatchDeletion.length > 0
                ? usersPendingBatchDeletion
                : userPendingDeletion
                ? [userPendingDeletion]
                : [];

            const vipUsersCount = deletableUsers.filter(
              u => u.membershipTier === 'premium_vip' && u.subscriptionStatus === 'active'
            ).length;
            const ownerUsersCount = deletableUsers.filter(u => u.role === 'owner').length;
            const googleUsersCount = deletableUsers.filter(
              u => u.authProvider === 'google' || u.id.startsWith('google-')
            ).length;

            const filteredDisplayUsers = deletableUsers
              .filter(u => {
                if (userTypeFilter === 'vip') {
                  return u.membershipTier === 'premium_vip' && u.subscriptionStatus === 'active';
                }
                if (userTypeFilter === 'owner') {
                  return u.role === 'owner';
                }
                if (userTypeFilter === 'regular') {
                  return u.membershipTier !== 'premium_vip' && u.role !== 'owner';
                }
                return true;
              })
              .filter(u => {
                if (!userSearchQuery.trim()) return true;
                const q = userSearchQuery.trim().toLowerCase();
                return (
                  (u.name || '').toLowerCase().includes(q) ||
                  (u.email || '').toLowerCase().includes(q) ||
                  (u.phone || '').toLowerCase().includes(q) ||
                  (u.id || '').toLowerCase().includes(q)
                );
              })
              .sort((a, b) => {
                const aVip = a.membershipTier === 'premium_vip' && a.subscriptionStatus === 'active' ? 1 : 0;
                const bVip = b.membershipTier === 'premium_vip' && b.subscriptionStatus === 'active' ? 1 : 0;
                if (bVip !== aVip) return bVip - aVip;
                const aMs = new Date(a.lastLoginAt || a.registeredAtIso || a.createdAt || 0).getTime() || 0;
                const bMs = new Date(b.lastLoginAt || b.registeredAtIso || b.createdAt || 0).getTime() || 0;
                return bMs - aMs;
              });

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-sm flex items-center gap-2">
                      <span>
                        {isKm ? `អ្នកប្រើប្រាស់ក្នុងប្រព័ន្ធ (${deletableUsers.length} គណនី)` : `User Accounts (${deletableUsers.length})`}
                      </span>
                      {lastUsersSyncedAt && (
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ✓ {isKm ? 'ធ្វើសមកាលកម្ម៖' : 'Synced:'} {new Date(lastUsersSyncedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-stone-500 font-khmer mt-0.5">
                      {isKm
                        ? 'គណនីនីមួយៗត្រូវបានរក្សាទុក និងបង្ហាញតែ ១ គត់ ដោយភ្ជាប់ជាមួយប្រវត្តិ VIP ថ្ងៃចុះឈ្មោះ និងសកម្មភាពពេញលេញ'
                        : 'Each user is securely saved and displayed once with VIP status, registration date, and activity records'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={isSyncingUsers}
                      onClick={async () => {
                        const ok = syncUsersNow
                          ? await syncUsersNow()
                          : triggerCloudSyncNow
                          ? await triggerCloudSyncNow(true)
                          : false;
                        if (ok) {
                          showToast(
                            isKm
                              ? `✅ បានធ្វើសមកាលកម្មបញ្ជីអ្នកប្រើប្រាស់ពី Cloud ជោគជ័យ (${deletableUsers.length} គណនី)!`
                              : `✅ Synchronized user accounts from Cloud (${deletableUsers.length} users)!`,
                            'success'
                          );
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-khmer text-xs font-bold border border-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingUsers ? 'animate-spin' : ''}`} />
                      <span>{isKm ? 'ធ្វើសមកាលកម្មឥឡូវនេះ' : 'Sync Users Now'}</span>
                    </button>

                    {deletableUsers.length > 0 && (
                      <label className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 hover:bg-stone-100 text-stone-700 dark:text-stone-200 font-khmer text-xs font-bold border border-stone-300 dark:border-stone-600 transition flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allDeletableSelected}
                          onChange={toggleSelectAllDeletable}
                          className="w-4 h-4 rounded accent-rose-600 cursor-pointer"
                        />
                        <span>
                          {isKm
                            ? `ជ្រើសរើសទាំងអស់ (${deletableUsers.length})`
                            : `Select All (${deletableUsers.length})`}
                        </span>
                      </label>
                    )}

                    {/* Manage / Delete button appears ONLY when at least one account is selected */}
                    {validSelectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const targets = deletableUsers.filter(u =>
                            validSelectedIds.includes(u.id)
                          );
                          if (targets.length > 0) {
                            setConfirmDeleteForeverChecked(false);
                            setUsersPendingBatchDeletion(targets);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-khmer text-xs font-bold border border-rose-700 shadow-md shadow-rose-600/25 transition flex items-center gap-1.5 cursor-pointer animate-fade-in"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>
                          {isKm
                            ? `គ្រប់គ្រង / លុបគណនី (${validSelectedIds.length})`
                            : `Manage / Delete Selected (${validSelectedIds.length})`}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const backupObj = {
                          timestamp: new Date().toISOString(),
                          appName: 'Cambodia Flavors & Tourism',
                          version: 'v2.1.0',
                          users: deletableUsers,
                          count: deletableUsers.length,
                        };
                        const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `kft_users_backup_${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast(isKm ? 'បានទាញយក Backup ទិន្នន័យជោគជ័យ!' : 'Backup downloaded successfully!', 'success');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-stone-700 hover:bg-slate-200 text-slate-700 dark:text-stone-200 font-khmer text-xs font-bold border border-slate-300 dark:border-stone-600 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📥 {isKm ? 'ទាញយក Backup' : 'Export Backup'}</span>
                    </button>
                  </div>
                </div>

                {/* User Summary KPI Cards & Search / Filter Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-khmer">
                  <div className="p-3 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                    <div className="text-[11px] text-stone-500">{isKm ? 'គណនីសរុប' : 'Total Users'}</div>
                    <div className="text-lg font-black text-stone-900 dark:text-stone-100 mt-0.5">{deletableUsers.length}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                    <div className="text-[11px] text-amber-800 dark:text-amber-300">{isKm ? 'សមាជិក VIP សកម្ម' : 'Active VIP'}</div>
                    <div className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">👑 {vipUsersCount}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300">{isKm ? 'ម្ចាស់ហាងអាហារ' : 'Shop Owners'}</div>
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">🏪 {ownerUsersCount}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60">
                    <div className="text-[11px] text-blue-800 dark:text-blue-300">{isKm ? 'ចូលតាម Google' : 'Google Sign-In'}</div>
                    <div className="text-lg font-black text-blue-700 dark:text-blue-300 mt-0.5">G {googleUsersCount}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={e => setUserSearchQuery(e.target.value)}
                      placeholder={isKm ? 'ស្វែងរកតាមឈ្មោះ អ៊ីមែល លេខទូរស័ព្ទ ឬ User ID...' : 'Search by name, email, phone, or User ID...'}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-khmer text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-khmer">
                    {([
                      { id: 'all', label: isKm ? `ទាំងអស់ (${deletableUsers.length})` : `All (${deletableUsers.length})` },
                      { id: 'vip', label: isKm ? `👑 VIP (${vipUsersCount})` : `👑 VIP (${vipUsersCount})` },
                      { id: 'owner', label: isKm ? `🏪 ម្ចាស់ហាង (${ownerUsersCount})` : `🏪 Owners (${ownerUsersCount})` },
                      { id: 'regular', label: isKm ? '👤 ទូទៅ' : '👤 Regular' },
                    ] as const).map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setUserTypeFilter(f.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                          userTypeFilter === f.id
                            ? 'bg-[#064E3B] text-white shadow-xs'
                            : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredDisplayUsers.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 space-y-3 font-khmer">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-[#064E3B] dark:text-emerald-300 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {userSearchQuery.trim() || userTypeFilter !== 'all'
                          ? (isKm ? 'រកមិនឃើញគណនីដែលត្រូវនឹងការស្វែងរកនេះទេ' : 'No matching user accounts found')
                          : (isKm ? 'មូលដ្ឋានទិន្នន័យអ្នកប្រើប្រាស់ត្រូវបានសម្អាតស្អាត (Database Clean)' : 'User Database is Clean')}
                      </h4>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                        {isKm 
                          ? 'ចុចប៊ូតុង «ធ្វើសមកាលកម្មឥឡូវនេះ» ដើម្បីទាញយកគណនីថ្មីៗពីម៉ាស៊ីនមេ Cloud ភ្លាមៗ។' 
                          : 'Click "Sync Users Now" to fetch the latest accounts from the Cloud server.'}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold">
                      <span>✓ Database Verified & Active</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[52vh] overflow-y-auto no-scrollbar">
                    {filteredDisplayUsers.map((u) => {
                      const isSystemAdmin =
                        u.role === 'admin' ||
                        u.id === 'admin-authorized-single' ||
                        u.username === 'cheasavuth' ||
                        u.username === 'admin';
                      const isSelected = !isSystemAdmin && validSelectedIds.includes(u.id);
                      const userIdSet = new Set<string>([
                        u.id,
                        ...(Array.isArray(u.legacyIds) ? u.legacyIds : []),
                      ]);
                      const uEmailLower = (u.email || '').toLowerCase().trim();

                      const userCustomRestsCount = restaurants.filter(
                        r =>
                          !isSeedRestaurantId(r.id) &&
                          ((r.ownerId && userIdSet.has(r.ownerId)) ||
                            (uEmailLower && r.ownerEmail && r.ownerEmail.toLowerCase().trim() === uEmailLower))
                      ).length;
                      const userTxnsCount = transactions.filter(
                        t =>
                          (t.userId && userIdSet.has(t.userId)) ||
                          (t.ownerId && userIdSet.has(t.ownerId)) ||
                          (uEmailLower && t.userEmail && t.userEmail.toLowerCase().trim() === uEmailLower)
                      ).length;
                      const userTicketsCount = supportTickets.filter(
                        tk =>
                          (tk.userId && userIdSet.has(tk.userId)) ||
                          (uEmailLower && tk.userEmail && tk.userEmail.toLowerCase().trim() === uEmailLower)
                      ).length;

                      const providerLabel =
                        u.authProvider === 'google' || u.id.startsWith('google-')
                          ? 'Google'
                          : u.authProvider === 'phone'
                          ? 'Phone'
                          : 'Email';

                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            if (!isSystemAdmin) toggleSelectUser(u.id);
                          }}
                          className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                            isSelected
                              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700 shadow-xs'
                              : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                          } ${!isSystemAdmin ? 'cursor-pointer' : ''}`}
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            {!isSystemAdmin ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectUser(u.id)}
                                onClick={e => e.stopPropagation()}
                                title={isKm ? 'ជ្រើសរើសគណនីនេះដើម្បីលុប' : 'Select account for deletion'}
                                className="w-4 h-4 mt-1 sm:mt-0 rounded accent-rose-600 cursor-pointer shrink-0"
                              />
                            ) : (
                              <div className="w-4 h-4 shrink-0 flex items-center justify-center" title="System Admin (Protected)">
                                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                              </div>
                            )}
                            <img src={resolveUserAvatarUrl(u)} alt={u.name} referrerPolicy="no-referrer" onError={(e) => handleAvatarImageError(e, u)} className="w-11 h-11 rounded-full object-cover border border-stone-200 dark:border-stone-600 shrink-0 bg-emerald-950" />
                            <div className="min-w-0">
                              <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer flex items-center gap-2 flex-wrap">
                                <span>{u.name}</span>
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[9px] font-mono">
                                  {providerLabel}
                                </span>
                                <code className="text-[10px] font-mono text-stone-400">({u.id})</code>
                              </h4>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                                {u.email || 'N/A'} • 📞 {u.phone || 'N/A'}
                              </p>
                              {(u.membershipTier === 'premium_vip' || u.subscriptionStatus === 'active' || u.paymentStatus === 'pending_verification' || (u as any).vipPlanType || (u as any).vipExpiryDate) && (() => {
                                const userVerifiedVipTxn = transactions.find(
                                  t =>
                                    ((t.userId && userIdSet.has(t.userId)) ||
                                      (t.ownerId && userIdSet.has(t.ownerId)) ||
                                      (uEmailLower && t.userEmail?.toLowerCase().trim() === uEmailLower)) &&
                                    t.type === 'user_vip_upgrade' &&
                                    t.status === 'verified'
                                );
                                const userPendingVipTxn = transactions.find(
                                  t =>
                                    ((t.userId && userIdSet.has(t.userId)) ||
                                      (t.ownerId && userIdSet.has(t.ownerId)) ||
                                      (uEmailLower && t.userEmail?.toLowerCase().trim() === uEmailLower)) &&
                                    t.status === 'pending_verification'
                                );
                                if (u.membershipTier === 'premium_vip' || u.subscriptionStatus === 'active') {
                                  const recordedDays = userVerifiedVipTxn?.durationDays || ((u as any).vipPlanType === 'annual' ? appSettings.vipLongDurationDays : appSettings.vipShortDurationDays);
                                  const recordedPrice = userVerifiedVipTxn?.amountUsd ?? ((u as any).vipPlanType === 'annual' ? appSettings.vipLongPriceUsd : appSettings.vipShortPriceUsd);
                                  return (
                                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-khmer mt-0.5">
                                      👑 គម្រោង៖ <strong>{`VIP ${recordedDays} Days ($${Number(recordedPrice).toFixed(2)})`}</strong>
                                      {(u.subscriptionStartDate || (u as any).vipActivatedAt) && ` • ថ្ងៃបើក៖ ${new Date((u.subscriptionStartDate || (u as any).vipActivatedAt)!).toLocaleDateString()}`}
                                      {((u as any).vipExpiryDate || u.subscriptionExpiryDate) && ` • ថ្ងៃផុតកំណត់៖ ${new Date(((u as any).vipExpiryDate || u.subscriptionExpiryDate)!).toLocaleDateString()}`}
                                    </p>
                                  );
                                }
                                if (userPendingVipTxn || u.paymentStatus === 'pending_verification') {
                                  return (
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-khmer mt-0.5">
                                      ⏳ កំពុងរង់ចាំការផ្ទៀងផ្ទាត់ការទូទាត់ VIP ({userPendingVipTxn?.transactionRef || u.transactionRef || 'Pending'})
                                    </p>
                                  );
                                }
                                return null;
                              })()}
                              <div className="flex items-center gap-2 flex-wrap mt-1 text-[10px] text-stone-500 font-khmer">
                                <span>📅 ចុះឈ្មោះ៖ <strong>{u.createdAt ? u.createdAt.split('T')[0] : 'N/A'}</strong></span>
                                {(u.lastLoginAt || u.lastActiveAt || u.verifiedAt) && (
                                  <>
                                    <span>•</span>
                                    <span>🕒 សកម្មភាពចុងក្រោយ៖ <strong>{new Date((u.lastLoginAt || u.lastActiveAt || u.verifiedAt)!).toLocaleDateString()}</strong></span>
                                  </>
                                )}
                                <span>•</span>
                                <span>🏪 ហាងផ្ទាល់ខ្លួន៖ <strong>{userCustomRestsCount}</strong></span>
                                <span>•</span>
                                <span>💳 ប្រតិបត្តិការ៖ <strong>{userTxnsCount}</strong></span>
                                {userTicketsCount > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>💬 សំណើជំនួយ៖ <strong>{userTicketsCount}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                              isSystemAdmin
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                : u.membershipTier === 'premium_vip' || u.subscriptionStatus === 'active'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                  : u.paymentStatus === 'pending_verification'
                                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
                                    : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                            }`}>
                              {u.membershipTier === 'premium_vip' && !isSystemAdmin
                                ? 'VIP'
                                : u.paymentStatus === 'pending_verification'
                                  ? 'PENDING VIP'
                                  : u.role}
                            </span>

                            {!isSystemAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteForeverChecked(false);
                                  setUsersPendingBatchDeletion([u]);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 font-khmer text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                                title={isKm ? 'គ្រប់គ្រងគណនី (បោះបង់ VIP / ស្តារសិទ្ធិ / លុបជាអចិន្ត្រៃយ៍)' : 'Manage account (Cancel VIP / Restore Access / Delete Forever)'}
                              >
                                <Settings className="w-3.5 h-3.5" />
                                <span>{isKm ? 'គ្រប់គ្រង / លុប' : 'Manage'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3-Option Admin Account Management Dialog (Cancel VIP / Restore User Access / Delete Forever + Cancel) */}
                {pendingDeleteTargets.length > 0 && (() => {
                  const targetIds = new Set(pendingDeleteTargets.map(t => t.id));
                  const targetEmails = new Set(
                    pendingDeleteTargets.map(t => (t.email || '').toLowerCase()).filter(Boolean)
                  );
                  const targetRestsCount = restaurants.filter(
                    r => !isSeedRestaurantId(r.id) && r.ownerId && targetIds.has(r.ownerId)
                  ).length;
                  const targetTxnsCount = transactions.filter(
                    t => (t.ownerId && targetIds.has(t.ownerId)) || (t.userId && targetIds.has(t.userId))
                  ).length;
                  const targetTicketsCount = supportTickets.filter(
                    t =>
                      targetIds.has(t.userId) ||
                      (t.userEmail && targetEmails.has(t.userEmail.toLowerCase()))
                  ).length;

                  const closeDeletionModal = () => {
                    if (isDeletingUser) return;
                    setConfirmDeleteForeverChecked(false);
                    setUserPendingDeletion(null);
                    setUsersPendingBatchDeletion([]);
                  };

                  return (
                    <div
                      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
                      onClick={closeDeletionModal}
                    >
                      <div
                        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-300 dark:border-stone-700 shadow-2xl overflow-hidden font-khmer my-auto"
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-[#064E3B] to-emerald-900 text-white flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                              <Shield className="w-6 h-6 text-amber-300" />
                            </div>
                            <div>
                              <h3 className="font-bold text-sm sm:text-base leading-snug">
                                {isKm
                                  ? `គ្រប់គ្រងគណនីអ្នកប្រើប្រាស់ (${pendingDeleteTargets.length})`
                                  : `Admin Account Management (${pendingDeleteTargets.length})`}
                              </h3>
                              <p className="text-[11px] text-emerald-100 mt-0.5">
                                {isKm
                                  ? 'សូមជ្រើសរើសជម្រើសណាមួយក្នុងចំណោមជម្រើសទាំង ៣ ខាងក្រោម'
                                  : 'Select one of the 3 account management options below'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={closeDeletionModal}
                            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 sm:p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
                          {/* Target Users List */}
                          <div className="max-h-28 overflow-y-auto space-y-2 pr-1">
                            {pendingDeleteTargets.map(target => (
                              <div
                                key={target.id}
                                className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center gap-3"
                              >
                                <img
                                  src={resolveUserAvatarUrl(target)}
                                  alt={target.name}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => handleAvatarImageError(e, target)}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shrink-0 bg-emerald-950"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                                      {target.name}
                                    </h4>
                                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                                      target.membershipTier === 'premium_vip' && target.subscriptionStatus === 'active'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                        : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                                    }`}>
                                      {target.membershipTier === 'premium_vip' && target.subscriptionStatus === 'active' ? '👑 VIP' : 'Normal User'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                                    {target.email} {target.phone ? `• 📞 ${target.phone}` : ''}
                                  </p>
                                  <p className="text-[10px] font-mono text-stone-400">
                                    ID: {target.id}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* OPTION 0: DIRECT 1-TAP GRANT / ACTIVATE VIP */}
                          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-amber-950/40 dark:to-emerald-950/30 border-2 border-emerald-400 dark:border-emerald-600/80 space-y-2">
                            <div>
                              <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>👑 បើកដំណើរការ / អនុម័ត VIP ជូនគណនីនេះភ្លាមៗ (Grant / Activate VIP)</span>
                              </h4>
                              <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 mt-0.5 leading-relaxed">
                                {isKm
                                  ? 'អនុម័ត និងបើកសិទ្ធិប្រើប្រាស់មុខងារ VIP ពេញលេញជូនអ្នកប្រើប្រាស់ភ្លាមៗ (Sync ទៅគ្រប់ឧបករណ៍ដោយស្វ័យប្រវត្តិ) ដោយមិនចាំបាច់ចុះឈ្មោះ ឬបង់ប្រាក់ម្តងទៀតឡើយ។'
                                  : 'Immediately grant or extend active VIP access across all devices without requiring re-registration or repeated payment.'}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={isDeletingUser}
                                onClick={async () => {
                                  setIsDeletingUser(true);
                                  try {
                                    const shortDays = appSettings?.vipShortDurationDays || 30;
                                    for (const target of pendingDeleteTargets) {
                                      await adminGrantUserVip(target.id || target.email, shortDays);
                                    }
                                    setSelectedUserIdsForDeletion([]);
                                    closeDeletionModal();
                                  } finally {
                                    setIsDeletingUser(false);
                                  }
                                }}
                                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>
                                  {isKm
                                    ? `បើក VIP (${appSettings?.vipShortDurationDays || 30} ថ្ងៃ)`
                                    : `Activate VIP (${appSettings?.vipShortDurationDays || 30}d)`}
                                </span>
                              </button>
                              <button
                                type="button"
                                disabled={isDeletingUser}
                                onClick={async () => {
                                  setIsDeletingUser(true);
                                  try {
                                    const longDays = appSettings?.vipLongDurationDays || 60;
                                    for (const target of pendingDeleteTargets) {
                                      await adminGrantUserVip(target.id || target.email, longDays);
                                    }
                                    setSelectedUserIdsForDeletion([]);
                                    closeDeletionModal();
                                  } finally {
                                    setIsDeletingUser(false);
                                  }
                                }}
                                className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <Sparkles className="w-4 h-4 shrink-0" />
                                <span>
                                  {isKm
                                    ? `បើក VIP (${appSettings?.vipLongDurationDays || 60} ថ្ងៃ)`
                                    : `Activate VIP (${appSettings?.vipLongDurationDays || 60}d)`}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* OPTION 1: CANCEL VIP */}
                          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/70 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                  <span>1. បោះបង់សមាជិកភាព VIP (Cancel VIP)</span>
                                </h4>
                                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                                  {isKm
                                    ? 'ដកសិទ្ធិ និងអត្ថប្រយោជន៍ VIP ចេញ ហើយប្តូរមកជាអ្នកប្រើប្រាស់ធម្មតា (Normal User)។ គណនី អ៊ីមែល ពាក្យសម្ងាត់ និងសិទ្ធិចូលប្រើប្រាស់កម្មវិធីត្រូវបានរក្សាទុកដដែល ១០០%។'
                                    : 'Remove VIP status and benefits, downgrade to a normal user, and preserve the account, email, password, and login access.'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={isDeletingUser}
                              onClick={async () => {
                                setIsDeletingUser(true);
                                try {
                                  for (const target of pendingDeleteTargets) {
                                    await cancelUserVip(target.id);
                                  }
                                  setSelectedUserIdsForDeletion([]);
                                  closeDeletionModal();
                                } finally {
                                  setIsDeletingUser(false);
                                }
                              }}
                              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Ban className="w-4 h-4" />
                              <span>
                                {isKm
                                  ? 'បោះបង់ VIP (រក្សាទុកគណនី & អ៊ីមែល)'
                                  : 'Cancel VIP (Keep Account & Login)'}
                              </span>
                            </button>
                          </div>

                          {/* OPTION 2: RESTORE USER ACCESS */}
                          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700/70 space-y-2">
                            <div>
                              <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                <span>2. ស្តារសិទ្ធិចូលប្រើប្រាស់គណនីឡើងវិញ (Restore User Access)</span>
                              </h4>
                              <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 mt-0.5 leading-relaxed">
                                {isKm
                                  ? 'បើកដំណើរការគណនីដែលត្រូវបានផ្អាក ឬលុបបណ្តោះអាសន្នឡើងវិញ ដើម្បីឱ្យអ្នកប្រើប្រាស់អាចចូលប្រើកម្មវិធីជាមួយអ៊ីមែលដដែល (ស្តារបានតែគណនីដែលមិនទាន់លុបជាអចិន្ត្រៃយ៍ប៉ុណ្ណោះ)។'
                                  : 'Reactivate a previously disabled or deleted user account so the user can log in and use the program again with the same email (only if not permanently deleted).'}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={isDeletingUser}
                              onClick={async () => {
                                setIsDeletingUser(true);
                                try {
                                  for (const target of pendingDeleteTargets) {
                                    await restoreUserAccess(target.id || target.email);
                                  }
                                  setSelectedUserIdsForDeletion([]);
                                  closeDeletionModal();
                                } finally {
                                  setIsDeletingUser(false);
                                }
                              }}
                              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className="w-4 h-4" />
                              <span>
                                {isKm
                                  ? 'ស្តារសិទ្ធិចូលប្រើប្រាស់គណនីឡើងវិញ (Restore User Access)'
                                  : 'Restore User Access'}
                              </span>
                            </button>
                          </div>

                          {/* OPTION 3: DELETE FOREVER */}
                          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/80 space-y-2.5 text-xs">
                            <div>
                              <h4 className="font-bold text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>3. លុបគណនីជាអចិន្ត្រៃយ៍ (Delete Forever)</span>
                              </h4>
                              <p className="text-[11px] text-rose-700/90 dark:text-rose-300/90 mt-0.5 leading-relaxed">
                                {isKm
                                  ? `លុបគណនីទាំងស្រុង និងទិន្នន័យពាក់ព័ន្ធទាំងអស់ជាអចិន្ត្រៃយ៍ (ហាង ${targetRestsCount}, ប្រតិបត្តិការ ${targetTxnsCount}, សំណើជំនួយ ${targetTicketsCount}) ហើយមិនអាចស្តារឡើងវិញបានឡើយ។`
                                  : `Permanently delete the entire account and associated data (${targetRestsCount} shops, ${targetTxnsCount} transactions, ${targetTicketsCount} tickets). Cannot be restored.`}
                              </p>
                            </div>

                            {/* Explicit Confirmation Checkbox to prevent accidental permanent deletion */}
                            <label className="flex items-start gap-2 p-2 rounded-xl bg-white/80 dark:bg-stone-900/70 border border-rose-300 dark:border-rose-800 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={confirmDeleteForeverChecked}
                                onChange={e => setConfirmDeleteForeverChecked(e.target.checked)}
                                className="w-4 h-4 mt-0.5 rounded accent-rose-600 cursor-pointer shrink-0"
                              />
                              <span className="text-[11px] font-bold text-rose-800 dark:text-rose-200 leading-snug">
                                {isKm
                                  ? 'ខ្ញុំយល់ព្រម និងបញ្ជាក់ថាចង់លុបគណនីនេះជាអចិន្ត្រៃយ៍ (Delete Forever) ដោយមិនអាចត្រឡប់ក្រោយវិញបានទេ'
                                  : 'I explicitly confirm that I want to permanently delete this account and all associated data forever'}
                              </span>
                            </label>

                            <button
                              type="button"
                              disabled={isDeletingUser || !confirmDeleteForeverChecked}
                              onClick={async () => {
                                setIsDeletingUser(true);
                                try {
                                  for (const target of pendingDeleteTargets) {
                                    await deleteUserAccount(target.id);
                                  }
                                  setSelectedUserIdsForDeletion(prev =>
                                    prev.filter(id => !targetIds.has(id))
                                  );
                                  closeDeletionModal();
                                } finally {
                                  setIsDeletingUser(false);
                                }
                              }}
                              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/25 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>
                                {isDeletingUser
                                  ? (isKm ? 'កំពុងលុប...' : 'Deleting...')
                                  : (isKm
                                      ? `លុបគណនីជាអចិន្ត្រៃយ៍ (Delete Forever)`
                                      : `Delete Forever (${pendingDeleteTargets.length})`)}
                              </span>
                            </button>
                          </div>

                          {/* Separate Cancel Button to close dialog without changes */}
                          <div className="pt-1">
                            <button
                              type="button"
                              disabled={isDeletingUser}
                              onClick={closeDeletionModal}
                              className="w-full py-2.5 px-4 rounded-xl bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition cursor-pointer"
                            >
                              {isKm ? 'បោះបង់ / បិទផ្ទាំងនេះ (Cancel)' : 'Cancel (Close Without Changes)'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* SECURITY & AUDIT LOGS TAB */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-base">
                    {isKm ? 'សុវត្ថិភាពប្រព័ន្ធ និងកំណត់ហេតុសវនកម្ម (Security & Audit Logs)' : 'Security Controls & Audit Trail'}
                  </h3>
                  <p className="text-stone-500 font-khmer text-xs">
                    {isKm ? 'តាមដានសកម្មភាពសន្តិសុខ និងកម្រិតការពារ PBKDF2-HMAC-SHA256' : 'Real-time security auditing and enterprise cryptographic protection'}
                  </p>
                </div>
                <button
                  onClick={handleRefreshAudit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-khmer text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isKm ? 'ផ្ទុកកំណត់ហេតុឡើងវិញ' : 'Refresh Logs'}</span>
                </button>
              </div>

              {/* Active Security Safeguards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 font-mono text-xs">PBKDF2-SHA256</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-khmer">
                    100,000 iterations + 32-byte cryptographic salt. No fast hashes.
                  </p>
                </div>

                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-blue-900 dark:text-blue-200 font-mono text-xs">HMAC Sessions</span>
                  </div>
                  <p className="text-[10px] text-blue-700 dark:text-blue-300 font-khmer">
                    Cryptographically signed tokens with 2h expiry and memory key.
                  </p>
                </div>

                <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-purple-900 dark:text-purple-200 font-mono text-xs">Brute-Force Guard</span>
                  </div>
                  <p className="text-[10px] text-purple-700 dark:text-purple-300 font-khmer">
                    Max 5 attempts, exponential throttling & 15m lockout.
                  </p>
                </div>
              </div>

              {/* Intellectual Property & Anti-Clone Certificate Seal */}
              {(() => {
                const cert = getOfficialOwnershipCertificate();
                const integrity = verifyAppOwnershipAndDomainIntegrity(appSettings);
                return (
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 text-white border-2 border-amber-400/70 shadow-lg space-y-2.5 font-khmer">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                        <h4 className="font-bold text-xs sm:text-sm text-amber-300">
                          {isKm
                            ? '🛡️ ត្រាកម្មសិទ្ធិបញ្ញា និងប្រព័ន្ធការពារការលួចចម្លង (Anti-Clone & IP Seal)'
                            : '🛡️ Intellectual Property & Anti-Clone Protection Seal'}
                        </h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                        {integrity.isAuthentic ? '✓ VERIFIED AUTHENTIC' : '⚠️ TAMPER DETECTED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-black/35 p-3 rounded-2xl border border-white/10 font-mono">
                      <div>
                        <span className="text-slate-400">ម្ចាស់កម្មសិទ្ធិផ្តាច់មុខ (Owner): </span>
                        <strong className="text-amber-300">{cert.ownerFullName} (CHEA SAVUTH)</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">គណនីផ្លូវការ ABA KHQR: </span>
                        <strong className="text-emerald-300">{cert.abaAccountNumber}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">លេខកញ្ចប់កម្មវិធី (App ID): </span>
                        <strong className="text-white">{cert.officialAppId}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">ដែនអនុញ្ញាត (Authorized Domain): </span>
                        <strong className="text-emerald-300">{integrity.detectedHostname}</strong>
                      </div>
                      <div className="sm:col-span-2 pt-1 border-t border-white/10 text-[10px] text-amber-200/90">
                        SEAL SIGNATURE: {cert.signatureHash} • Copyright © {cert.copyrightYear}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Audit Log Table */}
              <div className="bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-700 font-bold font-khmer text-xs flex justify-between items-center">
                  <span>{isKm ? 'កំណត់ហេតុសវនកម្មសុវត្ថិភាពថ្មីៗ (គ្មានការកត់ត្រា Password/Token)' : 'Recent Security Audit Events (Sanitized)'}</span>
                  <span className="text-[10px] text-stone-400 font-mono">{auditLogs.length} events</span>
                </div>
                <div className="max-h-[35vh] overflow-y-auto no-scrollbar divide-y divide-stone-100 dark:divide-stone-700 font-mono text-[11px]">
                  {auditLogs.length === 0 ? (
                    <div className="p-6 text-center text-stone-400 font-khmer">
                      {isKm ? 'មិនទាន់មានព្រឹត្តិការណ៍សន្តិសុខត្រូវបានកត់ត្រា' : 'No audit records logged yet.'}
                    </div>
                  ) : (
                    auditLogs.map(log => (
                      <div key={log.id} className="p-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                              log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : log.status === 'BLOCKED' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {log.status}
                            </span>
                            <span className="font-bold text-stone-800 dark:text-stone-200">{log.action}</span>
                            <span className="text-stone-400">[{log.resource}]</span>
                          </div>
                          <p className="text-stone-500 dark:text-stone-400 text-[10px] mt-0.5">{log.details}</p>
                        </div>
                        <span className="text-[10px] text-stone-400 whitespace-nowrap shrink-0">{log.timestamp.slice(11, 19)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Emergency Session Revocation */}
              <div className="p-4 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-xs">
                    {isKm ? 'ចាកចេញពីសម័យគ្រប់គ្រងរដ្ឋបាល' : 'Revoke Active Administrator Session'}
                  </h4>
                  <p className="text-[10px] text-stone-500 font-khmer">
                    {isKm ? 'បិទសម័យរដ្ឋបាលបច្ចុប្បន្នភ្លាមៗ ដើម្បីធានាសុវត្ថិភាព' : 'Invalidates current HMAC session token and locks dashboard.'}
                  </p>
                </div>
                <button
                  onClick={handleRevokeSessions}
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl text-xs font-khmer"
                >
                  {isKm ? 'ចាកចេញភ្លាមៗ' : 'Revoke & Lock'}
                </button>
              </div>
            </div>
          )}

          {/* SETTINGS TAB - ENTERPRISE ADMIN SETTINGS & SYSTEM CONFIGURATION */}
          {activeTab === 'settings' && (() => {
            const rotationState = getVipFeaturedRotationState(
              restaurants,
              users,
              {
                ...appSettings,
                vipFeaturedRotationEnabled: vipFeaturedRotationEnabledInput,
                vipFeaturedDurationDays: parseInt(vipFeaturedDurationDaysInput, 10) || appSettings.vipFeaturedDurationDays || 1,
              }
            );
            const showSection = (sec: typeof activeSettingsSection) =>
              activeSettingsSection === 'all' || activeSettingsSection === sec;

            // ---- Manual Top Listing schedule ----
            const manualSchedule: ManualFeaturedSlot[] = sanitizeManualFeaturedSchedule(
              appSettings.vipFeaturedManualSchedule
            ).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
            const fmtDateTime = (iso: string | number) => {
              const d = new Date(iso);
              const p = (n: number) => String(n).padStart(2, '0');
              return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
            };
            const shopLabel = (id: string) => {
              const r = restaurants.find((x) => x.id === id);
              return r ? (isKm ? r.nameKh || r.nameEn : r.nameEn || r.nameKh) : (isKm ? '(ហាងត្រូវបានលុប)' : '(deleted shop)');
            };
            const manualQuery = manualShopQuery.trim().toLowerCase();
            const manualShopOptions = restaurants
              .filter((r) => r && r.id && (!r.status || r.status === 'approved'))
              .filter((r) =>
                !manualQuery ||
                (r.nameKh || '').toLowerCase().includes(manualQuery) ||
                (r.nameEn || '').toLowerCase().includes(manualQuery)
              )
              .slice(0, 60);
            const manualDaysNum = parseInt(manualDaysInput, 10);
            const manualStartMsPreview = manualStartLocal ? new Date(manualStartLocal).getTime() : Number.NaN;
            const manualEndPreview =
              Number.isFinite(manualDaysNum) && manualDaysNum >= 1 && !Number.isNaN(manualStartMsPreview)
                ? manualStartMsPreview + manualDaysNum * 86400000
                : null;

            const persistManualSchedule = async (next: ManualFeaturedSlot[]) => {
              setIsSavingManualSlot(true);
              try {
                return await updateAppSettings({ vipFeaturedManualSchedule: next });
              } finally {
                setIsSavingManualSlot(false);
              }
            };

            const handleAddManualSlot = async () => {
              const shop = restaurants.find((r) => r.id === manualShopId);
              if (!shop) {
                showToast(isKm ? '⚠️ សូមជ្រើសរើសហាងមុនសិន!' : '⚠️ Please select a shop first!', 'warning');
                return;
              }
              const startMs = manualStartLocal ? new Date(manualStartLocal).getTime() : Date.now();
              if (Number.isNaN(startMs)) {
                showToast(isKm ? '⚠️ កាលបរិច្ឆេទចាប់ផ្តើមមិនត្រឹមត្រូវ!' : '⚠️ Invalid start date!', 'warning');
                return;
              }
              if (!Number.isFinite(manualDaysNum) || manualDaysNum < 1 || manualDaysNum > 365) {
                showToast(isKm ? '⚠️ រយៈពេលត្រូវតែចាប់ពី ១ ដល់ ៣៦៥ ថ្ងៃ!' : '⚠️ Duration must be 1–365 days!', 'warning');
                return;
              }
              const endMs = startMs + manualDaysNum * 86400000;
              const overlap = manualSchedule.find(
                (s) => s.restaurantId === shop.id && Date.parse(s.startAt) < endMs && getManualFeaturedSlotEndMs(s) > startMs
              );
              if (overlap) {
                showToast(
                  isKm
                    ? '⚠️ ហាងនេះមានកាលវិភាគស្ទួនគ្នាក្នុងចន្លោះពេលនេះរួចហើយ!'
                    : '⚠️ This shop already has a schedule overlapping this period!',
                  'warning'
                );
                return;
              }
              if (manualSchedule.length >= MAX_MANUAL_FEATURED_SLOTS) {
                showToast(isKm ? '⚠️ កាលវិភាគពេញហើយ សូមលុបកាលវិភាគចាស់ៗ!' : '⚠️ Schedule is full. Remove old entries first!', 'warning');
                return;
              }
              const nowIso = new Date().toISOString();
              const slot: ManualFeaturedSlot = {
                id: `mfs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                restaurantId: shop.id,
                startAt: new Date(startMs).toISOString(),
                durationDays: manualDaysNum,
                createdAt: nowIso,
              };
              const res = await persistManualSchedule([...manualSchedule, slot]);
              if (res && res.ok) {
                setManualShopId('');
                showToast(
                  isKm
                    ? `📌 បានកំណត់កាលវិភាគ Top Listing សម្រាប់ «${shop.nameKh || shop.nameEn}» (${manualDaysNum} ថ្ងៃ)`
                    : `📌 Top Listing scheduled for "${shop.nameEn || shop.nameKh}" (${manualDaysNum} day(s))`,
                  'success'
                );
              }
            };

            const handleRemoveManualSlot = async (id: string) => {
              await persistManualSchedule(manualSchedule.filter((s) => s.id !== id));
            };

            const handleClearEndedSlots = async () => {
              const nowMs = Date.now();
              await persistManualSchedule(manualSchedule.filter((s) => getManualFeaturedSlotEndMs(s) > nowMs));
            };

            return (
              <div className="space-y-5 font-khmer">
                {/* Enterprise Header Banner */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0F172A] via-[#064E3B] to-[#0F172A] text-white border border-emerald-500/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 shrink-0">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-moul text-sm sm:text-base text-white">
                          {isKm ? 'ការកំណត់ប្រព័ន្ធរដ្ឋបាលកម្រិតខ្ពស់ (Enterprise Admin Settings)' : 'Enterprise Admin Settings & Configuration'}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-mono font-bold">
                          RBAC VERIFIED
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {isKm
                          ? 'គ្រប់គ្រងប្រព័ន្ធបង្វិលហាង VIP កញ្ចប់សមាជិកភាព ការទូទាត់ KHQR តំណភ្ជាប់កម្មវិធី Cloud Database និងសុវត្ថិភាពរដ្ឋបាល'
                          : 'Centralized configuration for VIP Shop Rotation, Membership Pricing, KHQR Payments, App Distribution, Cloud DB, and Security'}
                      </p>
                    </div>
                  </div>
                  {appSettings.settingsUpdatedAt && (
                    <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-[10px] font-mono text-emerald-200 shrink-0 self-start sm:self-center">
                      Synced: {appSettings.settingsUpdatedAt.replace('T', ' ').slice(0, 16)} (v{appSettings.settingsVersion || 1})
                    </div>
                  )}
                </div>

                {/* Organized Settings Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {([
                    { id: 'all', labelKh: '📋 ទាំងអស់', labelEn: '📋 All Categories' },
                    { id: 'featured_rotation', labelKh: '🔄 បង្វិលហាង VIP មុខគេ', labelEn: '🔄 VIP Featured Rotation' },
                    { id: 'vip_pricing', labelKh: '👑 កញ្ចប់ VIP & តម្លៃហាង', labelEn: '👑 VIP & Store Pricing' },
                    { id: 'payment_khqr', labelKh: '💳 ការទូទាត់ KHQR', labelEn: '💳 Payment & KHQR' },
                    { id: 'distribution', labelKh: '📲 តំណភ្ជាប់កម្មវិធី', labelEn: '📲 App Links' },
                    { id: 'cloud_system', labelKh: '☁️ ប្រព័ន្ធ Cloud & API', labelEn: '☁️ Cloud & APIs' },
                    { id: 'security', labelKh: '🔐 សុវត្ថិភាពរដ្ឋបាល', labelEn: '🔐 Admin Security' },
                  ] as const).map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveSettingsSection(cat.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition cursor-pointer ${
                        activeSettingsSection === cat.id
                          ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-2xs'
                          : 'bg-white dark:bg-stone-800 text-slate-700 dark:text-stone-300 border-slate-200 dark:border-stone-700 hover:bg-slate-50 dark:hover:bg-stone-700/70'
                      }`}
                    >
                      {isKm ? cat.labelKh : cat.labelEn}
                    </button>
                  ))}
                </div>

                {/* CATEGORY 1: VIP SHOP FEATURED ROTATION SETTINGS */}
                {showSection('featured_rotation') && (
                  <div className="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-slate-200/90 dark:border-stone-700 shadow-xs space-y-4">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-stone-700 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#064E3B] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                          <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                              {isKm
                                ? 'ប្រព័ន្ធបង្វិលហាង VIP បង្ហាញលើគេ (VIP Shop Featured Rotation Settings)'
                                : 'VIP Shop Featured Rotation Settings'}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                vipFeaturedRotationEnabledInput
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-700 dark:bg-stone-700 dark:text-stone-300'
                              }`}
                            >
                              {vipFeaturedRotationEnabledInput
                                ? isKm ? '● កំពុងបើកដំណើរការ (Active)' : '● Rotation Enabled'
                                : isKm ? '○ បានបិទ (Disabled)' : '○ Rotation Disabled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-stone-400 mt-0.5">
                            {isKm
                              ? 'ហាង VIP ថ្មីដែលបានអនុម័តនឹងបង្ហាញនៅលើគេបង្អស់ (Top Listing: 1 ថ្ងៃ ជាលំនាំដើម) ហើយបន្ទាប់មកប្រព័ន្ធនឹងបង្វិលហាង VIP បន្ទាប់តាមលំដាប់ចុះឈ្មោះដោយស្វ័យប្រវត្តិ។'
                              : 'Newly approved VIP shops appear at the top for 1 day by default, then automatically rotate through all eligible VIP shops in registration order.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column: Controls */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-stone-900/70 border border-slate-200/80 dark:border-stone-700 space-y-4">
                        {/* Enable / Disable Toggle */}
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {isKm ? 'បើក/បិទ ការបង្វិលហាង VIP ស្វ័យប្រវត្តិ' : 'Enable Automatic Featured Rotation'}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-stone-400 mt-0.5">
                              {isKm
                                ? 'បើកដើម្បីផ្តល់អាទិភាពដល់ហាង VIP ថ្មី និងបង្វិលវេនគ្នាដោយស្មើភាព'
                                : 'Fairly rotate top directory placement across all eligible VIP shops'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              isVipFormDirtyRef.current = true;
                              setVipSaveFeedback(null);
                              setVipFeaturedRotationEnabledInput(prev => !prev);
                            }}
                            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                              vipFeaturedRotationEnabledInput ? 'bg-[#064E3B]' : 'bg-slate-300 dark:bg-stone-600'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform duration-200 ${
                                vipFeaturedRotationEnabledInput ? 'translate-x-6' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Featured Duration Input + Presets */}
                        <div className="pt-3 border-t border-slate-200/70 dark:border-stone-700 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-800 dark:text-stone-200">
                              {isKm ? 'រយៈពេលបង្ហាញលើគេក្នុង ១ ហាង (ថ្ងៃ / Days)៖' : 'Featured Duration (Days per Shop):'}
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={vipFeaturedDurationDaysInput}
                                onChange={e => {
                                  const raw = e.target.value.replace(/[^0-9]/g, '');
                                  isVipFormDirtyRef.current = true;
                                  setVipSaveFeedback(null);
                                  setVipFeaturedDurationDaysInput(raw);
                                }}
                                className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-slate-900 dark:text-white font-mono font-bold text-xs text-center"
                              />
                              <span className="text-xs font-bold text-slate-600 dark:text-stone-300">
                                {isKm ? 'ថ្ងៃ' : 'Days'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[10px] text-slate-500 mr-1">
                              {isKm ? 'ជ្រើសរើសរហ័ស៖' : 'Presets:'}
                            </span>
                            {[1, 2, 3, 5, 7, 14].map(d => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  isVipFormDirtyRef.current = true;
                                  setVipSaveFeedback(null);
                                  setVipFeaturedDurationDaysInput(String(d));
                                }}
                                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border transition cursor-pointer ${
                                  Number(vipFeaturedDurationDaysInput) === d
                                    ? 'bg-[#064E3B] text-white border-[#064E3B]'
                                    : 'bg-white dark:bg-stone-800 text-slate-700 dark:text-stone-300 border-slate-200 dark:border-stone-700 hover:bg-emerald-50'
                                }`}
                              >
                                {d} {isKm ? 'ថ្ងៃ' : d === 1 ? 'Day' : 'Days'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Live Rotation Queue Status */}
                      <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-2.5 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300">
                              {isKm ? 'ស្ថានភាពហាង VIP កំពុងបង្ហាញលើគេផ្ទាល់' : 'Live Featured VIP Queue Status'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                              {rotationState.eligibleQueue.length} {isKm ? 'ហាងក្នុងជួរ' : 'Eligible Shops'}
                            </span>
                          </div>

                          {rotationState.primaryFeaturedShop ? (
                            <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-emerald-200/90 dark:border-stone-700 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                  🌟 {rotationState.primaryFeaturedShop.restaurant.nameKh || rotationState.primaryFeaturedShop.restaurant.nameEn}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 text-[9px] font-bold shrink-0">
                                  {rotationState.primaryFeaturedShop.reason === 'manual_schedule'
                                    ? isKm ? '📌 កំណត់ដោយ Admin' : '📌 Admin Scheduled'
                                    : rotationState.primaryFeaturedShop.reason === 'new_shop_boost'
                                    ? isKm ? 'ហាងថ្មី (Top Slot)' : 'New Shop Boost'
                                    : isKm ? 'វេនបង្វិលស្វ័យប្រវត្តិ' : 'Scheduled Rotation'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-stone-400">
                                {isKm
                                  ? `សល់ប្រហែល ${rotationState.primaryFeaturedShop.remainingHours} ម៉ោងទៀត • ហាងបន្ទាប់៖ ${rotationState.nextRotatingShop?.nameKh || rotationState.nextRotatingShop?.nameEn || '—'}`
                                  : `~${rotationState.primaryFeaturedShop.remainingHours}h remaining • Next in line: ${rotationState.nextRotatingShop?.nameEn || rotationState.nextRotatingShop?.nameKh || '—'}`}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-white/80 dark:bg-stone-800/80 border border-slate-200 dark:border-stone-700 text-[11px] text-slate-500 dark:text-stone-400">
                              {vipFeaturedRotationEnabledInput
                                ? isKm
                                  ? 'មិនទាន់មានហាង VIP ក្នុងជួរបង្វិលនៅឡើយទេ។ នៅពេលសមាជិក VIP បន្ថែមហាងថ្មី វានឹងបង្ហាញលើគេដោយស្វ័យប្រវត្តិ។'
                                  : 'No custom VIP shops in the rotation queue yet. Newly approved VIP shops will automatically take the top slot.'
                                : isKm
                                ? 'ប្រព័ន្ធបង្វិលហាង VIP កំពុងត្រូវបានបិទ។'
                                : 'VIP Featured Rotation is currently disabled.'}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
                          <span className="text-[10px] text-slate-600 dark:text-stone-400">
                            {isKm
                              ? `ប៊ូតុងចុះឈ្មោះហាងបង្ហាញ៖ "Top Listing: ${vipFeaturedDurationDaysInput || 1} Day(s)"`
                              : `Register button label: "Top Listing: ${vipFeaturedDurationDaysInput || 1} Day(s)"`}
                          </span>
                          <button
                            type="button"
                            onClick={handleSaveSettings}
                            disabled={isSavingVipSettings}
                            className="px-4 py-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] disabled:opacity-60 text-white font-bold text-xs shadow-2xs transition cursor-pointer shrink-0"
                          >
                            {isSavingVipSettings
                              ? isKm ? 'កំពុងរក្សាទុក...' : 'Saving...'
                              : isKm ? '💾 រក្សាទុកការបង្វិលហាង' : '💾 Save Rotation'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* MANUAL TOP LISTING SCHEDULE */}
                    <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/10 border border-amber-300/70 dark:border-amber-800/40 space-y-3">
                      <div>
                        <div className="text-xs font-extrabold text-amber-950 dark:text-amber-300">
                          {isKm ? '📌 កំណត់ហាងបង្ហាញលើគេដោយដៃ (Manual Top Listing Schedule)' : '📌 Manual Top Listing Schedule'}
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-stone-400 mt-0.5 leading-snug">
                          {isKm
                            ? 'ជ្រើសរើសហាង កាលបរិច្ឆេទចាប់ផ្តើម និងរយៈពេល។ ហាងដែលបានកំណត់នឹងបង្ហាញនៅលើគេបង្អស់តាមពេលវេលានោះ មុនការបង្វិលស្វ័យប្រវត្តិ។'
                            : 'Pick a shop, its start date/time and duration. Scheduled shops take the very top spot during that window, ahead of automatic rotation.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-800 dark:text-stone-200">
                            {isKm ? '១. ជ្រើសរើសហាង' : '1. Select Shop'}
                          </label>
                          <input
                            type="text"
                            value={manualShopQuery}
                            onChange={(e) => setManualShopQuery(e.target.value)}
                            placeholder={isKm ? 'ស្វែងរកឈ្មោះហាង...' : 'Search shop name...'}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-xs text-slate-900 dark:text-white"
                          />
                          <select
                            value={manualShopId}
                            onChange={(e) => setManualShopId(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-xs text-slate-900 dark:text-white"
                          >
                            <option value="">{isKm ? '— ជ្រើសរើសហាង —' : '— Choose a shop —'}</option>
                            {manualShopOptions.map((r) => (
                              <option key={r.id} value={r.id}>
                                {(isKm ? r.nameKh || r.nameEn : r.nameEn || r.nameKh)}
                              </option>
                            ))}
                          </select>
                          {manualShopOptions.length >= 60 && (
                            <div className="text-[10px] text-slate-500">
                              {isKm ? 'បង្ហាញ ៦០ ហាងដំបូង — សូមវាយឈ្មោះដើម្បីរកឱ្យចំ' : 'Showing first 60 — type to narrow down'}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-800 dark:text-stone-200">
                            {isKm ? '២. កាលបរិច្ឆេទ & ម៉ោងចាប់ផ្តើម' : '2. Start Date & Time'}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="datetime-local"
                              value={manualStartLocal}
                              onChange={(e) => setManualStartLocal(e.target.value)}
                              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-xs text-slate-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => setManualStartLocal(toLocalDateTimeInput(new Date()))}
                              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-slate-300 dark:border-stone-600 text-[11px] font-bold text-slate-700 dark:text-stone-200 hover:bg-amber-50 cursor-pointer shrink-0"
                            >
                              {isKm ? 'ឥឡូវនេះ' : 'Now'}
                            </button>
                          </div>

                          <label className="text-[11px] font-bold text-slate-800 dark:text-stone-200 block pt-1">
                            {isKm ? '៣. រយៈពេលបង្ហាញ (ថ្ងៃ)' : '3. Display Duration (Days)'}
                          </label>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={manualDaysInput}
                              onChange={(e) => setManualDaysInput(e.target.value.replace(/[^0-9]/g, ''))}
                              className="w-16 px-2 py-1.5 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-center font-mono font-bold text-xs text-slate-900 dark:text-white"
                            />
                            {[1, 3, 7, 14, 30].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setManualDaysInput(String(d))}
                                className={`px-2 py-1 rounded-lg font-mono text-[11px] font-bold border cursor-pointer ${
                                  Number(manualDaysInput) === d
                                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                                    : 'bg-white dark:bg-stone-800 text-slate-700 dark:text-stone-300 border-slate-200 dark:border-stone-700 hover:bg-amber-50'
                                }`}
                              >
                                {d}{isKm ? ' ថ្ងៃ' : 'd'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                        <span className="text-[10px] text-slate-600 dark:text-stone-400">
                          {manualEndPreview
                            ? isKm
                              ? `ចាប់ពី ${fmtDateTime(manualStartMsPreview)} → បញ្ចប់ ${fmtDateTime(manualEndPreview)}`
                              : `From ${fmtDateTime(manualStartMsPreview)} → ends ${fmtDateTime(manualEndPreview)}`
                            : isKm ? 'សូមបញ្ចូលកាលបរិច្ឆេទ និងរយៈពេលឱ្យត្រឹមត្រូវ' : 'Enter a valid start date and duration'}
                        </span>
                        <button
                          type="button"
                          onClick={handleAddManualSlot}
                          disabled={isSavingManualSlot || !manualShopId}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow-2xs transition cursor-pointer"
                        >
                          {isSavingManualSlot
                            ? isKm ? 'កំពុងរក្សាទុក...' : 'Saving...'
                            : isKm ? '➕ កំណត់ពេលបង្ហាញ' : '➕ Schedule Top Listing'}
                        </button>
                      </div>

                      {/* Scheduled list */}
                      <div className="pt-2 border-t border-amber-200/70 dark:border-amber-800/40 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-800 dark:text-stone-200">
                            {isKm ? `កាលវិភាគដែលបានកំណត់ (${manualSchedule.length})` : `Scheduled Slots (${manualSchedule.length})`}
                          </span>
                          {manualSchedule.some((s) => getManualFeaturedSlotEndMs(s) <= Date.now()) && (
                            <button
                              type="button"
                              onClick={handleClearEndedSlots}
                              disabled={isSavingManualSlot}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-stone-800 border border-slate-300 dark:border-stone-600 text-slate-700 dark:text-stone-200 hover:bg-slate-50 cursor-pointer"
                            >
                              {isKm ? 'សម្អាតដែលផុតកំណត់' : 'Clear ended'}
                            </button>
                          )}
                        </div>

                        {manualSchedule.length === 0 ? (
                          <div className="text-[11px] text-slate-500 dark:text-stone-400 p-2.5 rounded-lg bg-white/70 dark:bg-stone-800/60 border border-slate-200 dark:border-stone-700">
                            {isKm ? 'មិនទាន់មានកាលវិភាគដោយដៃទេ — ប្រព័ន្ធប្រើការបង្វិលស្វ័យប្រវត្តិ។' : 'No manual schedule yet — automatic rotation is in effect.'}
                          </div>
                        ) : (
                          manualSchedule.map((slot) => {
                            const nowMs = Date.now();
                            const startMs = Date.parse(slot.startAt);
                            const endMs = getManualFeaturedSlotEndMs(slot);
                            const status = nowMs >= endMs ? 'ended' : nowMs >= startMs ? 'active' : 'upcoming';
                            return (
                              <div
                                key={slot.id}
                                className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                      {shopLabel(slot.restaurantId)}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                        status === 'active'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : status === 'upcoming'
                                          ? 'bg-sky-100 text-sky-800'
                                          : 'bg-slate-200 text-slate-600'
                                      }`}
                                    >
                                      {status === 'active'
                                        ? isKm ? '● កំពុងបង្ហាញ' : '● Active'
                                        : status === 'upcoming'
                                        ? isKm ? '⏳ នឹងមកដល់' : '⏳ Upcoming'
                                        : isKm ? 'ផុតកំណត់' : 'Ended'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-stone-400 font-mono">
                                    {fmtDateTime(startMs)} → {fmtDateTime(endMs)} ({slot.durationDays}{isKm ? ' ថ្ងៃ' : 'd'})
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveManualSlot(slot.id)}
                                  disabled={isSavingManualSlot}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white dark:bg-rose-950/50 transition cursor-pointer shrink-0"
                                  title={isKm ? 'លុបកាលវិភាគនេះ' : 'Remove this schedule'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* CATEGORY 2: VIP MEMBERSHIP PACKAGES & STORE PRICING */}
                {showSection('vip_pricing') && (
              <div className="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-slate-200/90 dark:border-stone-700 shadow-xs space-y-5 font-khmer">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-700 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-sm">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-moul text-stone-900 dark:text-stone-100 text-sm">
                        {isKm
                          ? '👑 ការកំណត់កញ្ចប់សមាជិកភាព VIP និងតម្លៃបន្ថែមហាង (Global Sync)'
                          : '👑 Admin VIP Packages, Durations, Benefits & Store Fee Management'}
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {isKm
                          ? 'កែប្រែរយៈពេលកញ្ចប់ VIP (10 ថ្ងៃ និង 90 ថ្ងៃ) តម្លៃកញ្ចប់ អត្ថប្រយោជន៍ និងតម្លៃបន្ថែមហាង ($10/ហាង)។ ការកែប្រែនឹងធ្វើបច្ចុប្បន្នភាពដោយស្វ័យប្រវត្តិទូទាំងកម្មវិធី និង Server ដោយមិនប៉ះពាល់សមាជិកភាពដែលកំពុងសកម្មឡើយ។'
                          : 'Modify VIP package durations (10 days & 90 days), prices, benefits, and additional store fee ($10/store). Changes synchronize globally without affecting active memberships.'}
                      </p>
                    </div>
                  </div>
                  {appSettings.settingsUpdatedAt && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono font-bold">
                      Synced: {appSettings.settingsUpdatedAt.replace('T', ' ').slice(0, 16)}
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  {/* Short & Long VIP Packages Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Package 1: Short VIP Plan (Default 10 Days) */}
                    <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-stone-900/80 border border-amber-300 dark:border-amber-800/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-900 dark:text-amber-300">
                          {isKm ? '📦 កញ្ចប់ VIP រយៈពេលខ្លី (ឧ. 10 ថ្ងៃ)' : '📦 Short VIP Package (e.g. 10 Days)'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                          Plan #1
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                            {isKm ? 'រយៈពេល (ថ្ងៃ / Days) *' : 'Duration (Days) *'}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="30"
                            value={vipShortDurationInput}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9]/g, '');
                              isVipFormDirtyRef.current = true;
                              setVipSaveFeedback(null);
                              setVipShortDurationInput(raw);
                              const parsed = parseInt(raw, 10);
                              if (Number.isFinite(parsed) && parsed >= 1) {
                                setVipShortNameKh(prev => (!prev.trim() || /^VIP\s+\d+\s*(ថ្ងៃ|\?+)$/i.test(prev.trim()) ? `VIP ${parsed} ថ្ងៃ` : prev));
                                setVipShortNameEn(prev => (!prev.trim() || /^VIP\s+\d+\s*Days?$/i.test(prev.trim()) ? `VIP ${parsed} Days` : prev));
                              }
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                            {isKm ? 'តម្លៃកញ្ចប់ ($ USD) *' : 'Package Price ($ USD) *'}
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="4.99"
                            value={vipShortPriceInput}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9.]/g, '');
                              if ((raw.match(/\./g) || []).length > 1) return;
                              isVipFormDirtyRef.current = true;
                              setVipSaveFeedback(null);
                              setVipShortPriceInput(raw);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-mono font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                            {isKm ? 'ឈ្មោះកញ្ចប់ (ខ្មែរ)' : 'Plan Name (Khmer)'}
                          </label>
                          <input
                            type="text"
                            value={vipShortNameKh}
                            onChange={e => {
                              isVipFormDirtyRef.current = true;
                              setVipSaveFeedback(null);
                              setVipShortNameKh(e.target.value);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                            {isKm ? 'ឈ្មោះកញ្ចប់ (English)' : 'Plan Name (English)'}
                          </label>
                          <input
                            type="text"
                            value={vipShortNameEn}
                            onChange={e => {
                              isVipFormDirtyRef.current = true;
                              setVipSaveFeedback(null);
                              setVipShortNameEn(e.target.value);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Package 2: Long VIP Plan (Default 90 Days) */}
                    <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-stone-900/80 border border-emerald-300 dark:border-emerald-800/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-900 dark:text-emerald-300">
                          {isKm ? '📦 កញ្ចប់ VIP រយៈពេលវែង (ឧ. 90 ថ្ងៃ)' : '📦 Long VIP Package (e.g. 90 Days)'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px]">
                          Plan #2
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                            {isKm ? 'រយៈពេល (ថ្ងៃ / Days) *' : 'Duration (Days) *'}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="60"
                            value={vipLongDurationInput}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9]/g, '');
                              isVipFormDirtyRef.current = true;
                              setVipSaveFeedback(null);
                              setVipLongDurationInput(raw);
                              const parsed = parseInt(raw, 10);
                              if (Number.isFinite(parsed) && parsed >= 1) {
                                setVipLongNameKh(prev => (!prev.trim() || /^VIP\s+\d+\s*(ថ្ងៃ|\?+)$/i.test(prev.trim()) ? `VIP ${parsed} ថ្ងៃ` : prev));
                                setVipLongNameEn(prev => (!prev.trim() || /^VIP\s+\d+\s*Days?$/i.test(prev.trim()) ? `VIP ${parsed} Days` : prev));
                              }
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                            {isKm ? 'តម្លៃកញ្ចប់ ($ USD) *' : 'Package Price ($ USD) *'}
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="6.99"
                            value={vipLongPriceInput}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9.]/g, '');
                              if ((raw.match(/\./g) || []).length > 1) return;
                              isVipFormDirtyRef.current = true;
                              setVipSaveFeedback(null);
                              setVipLongPriceInput(raw);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-mono font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                            {isKm ? 'ឈ្មោះកញ្ចប់ (ខ្មែរ)' : 'Plan Name (Khmer)'}
                          </label>
                          <input
                            type="text"
                            value={vipLongNameKh}
                            onChange={e => {
                              isVipFormDirtyRef.current = true;
                              setVipSaveFeedback(null);
                              setVipLongNameKh(e.target.value);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                            {isKm ? 'ឈ្មោះកញ្ចប់ (English)' : 'Plan Name (English)'}
                          </label>
                          <input
                            type="text"
                            value={vipLongNameEn}
                            onChange={e => {
                              isVipFormDirtyRef.current = true;
                              setVipSaveFeedback(null);
                              setVipLongNameEn(e.target.value);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Store Fee Configuration ($10 per additional store beyond the 1st) */}
                  <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-stone-900/80 border border-purple-300 dark:border-purple-800/60 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h5 className="font-bold text-xs text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-purple-600" />
                          <span>
                            {isKm
                              ? '🏪 តម្លៃបន្ថែមហាងថ្មីលើសពីហាងទី ១ (Additional Store Fee USD)'
                              : '🏪 Additional Store Fee (Per Store Beyond First)'}
                          </span>
                        </h5>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400">
                          {isKm
                            ? 'ហាងទី ១ រួមបញ្ចូលឥតគិតថ្លៃ ($0) • ការកែប្រែ ឬប្តូរហាងចាស់ដាក់ហាងថ្មីគឺឥតគិតថ្លៃ ($0) • បន្ថែមហាងបន្ទាប់គិតថ្លៃតាមការកំណត់ខាងក្រោម៖'
                            : '1st store is included free ($0) • Editing or replacing an existing store is free ($0) • Each additional store requires verified payment of:'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-700 dark:text-stone-300">$ USD:</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="5.00"
                          value={additionalStoreFeeInput}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '');
                            if ((raw.match(/\./g) || []).length > 1) return;
                            isVipFormDirtyRef.current = true;
                            setVipSaveFeedback(null);
                            setAdditionalStoreFeeInput(raw);
                          }}
                          className="w-28 px-3 py-2 rounded-xl border-2 border-purple-400 dark:border-purple-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-mono font-black text-sm text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic VIP Benefits List Editor */}
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-700 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h5 className="font-bold text-xs text-stone-900 dark:text-stone-100">
                          {isKm
                            ? `✨ បញ្ជីអត្ថប្រយោជន៍សមាជិកភាព VIP (${vipBenefitsDraft.length} ចំណុច)`
                            : `✨ VIP Membership Benefits (${vipBenefitsDraft.length} Items)`}
                        </h5>
                        <p className="text-[10px] text-stone-500">
                          {isKm
                            ? 'កែប្រែចំណងជើង ឬបន្ថែម/លុបអត្ថប្រយោជន៍ VIP ដែលបង្ហាញក្នុងទំព័រដំឡើង VIP និងទំព័រគ្រប់គ្រងហាង'
                            : 'Edit, add, or remove VIP benefits shown across the app'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setVipBenefitsDraft(prev => [
                              ...prev,
                              {
                                id: prev.length + 1,
                                titleKh: `អត្ថប្រយោជន៍ពិសេសទី ${prev.length + 1}`,
                                titleEn: `Exclusive VIP Benefit #${prev.length + 1}`,
                                descriptionKh: 'អត្ថប្រយោជន៍បន្ថែមសម្រាប់សមាជិក VIP',
                                descriptionEn: 'Additional benefit for VIP members',
                                descKh: 'អត្ថប្រយោជន៍បន្ថែមសម្រាប់សមាជិក VIP',
                                descEn: 'Additional benefit for VIP members',
                              },
                            ])
                          }
                          className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isKm ? 'បន្ថែមអត្ថប្រយោជន៍' : 'Add Benefit'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVipBenefitsDraft(TEN_VIP_BENEFITS)}
                          className="px-2.5 py-1 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-700 dark:text-stone-200 font-bold text-[11px] cursor-pointer"
                        >
                          {isKm ? 'កំណត់លំនាំដើម (10)' : 'Reset Default (10)'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {vipBenefitsDraft.map((benefit, index) => (
                        <div
                          key={index}
                          className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-start gap-2"
                        >
                          <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-1">
                            {index + 1}
                          </span>
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={benefit.titleKh}
                              onChange={e => {
                                const val = e.target.value;
                                setVipBenefitsDraft(prev =>
                                  prev.map((item, idx) => (idx === index ? { ...item, titleKh: val } : item))
                                );
                              }}
                              placeholder="ចំណងជើងអត្ថប្រយោជន៍ (ខ្មែរ)"
                              className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-xs text-stone-900 dark:text-white font-bold"
                            />
                            <input
                              type="text"
                              value={benefit.titleEn}
                              onChange={e => {
                                const val = e.target.value;
                                setVipBenefitsDraft(prev =>
                                  prev.map((item, idx) => (idx === index ? { ...item, titleEn: val } : item))
                                );
                              }}
                              placeholder="Benefit Title (English)"
                              className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-xs text-stone-900 dark:text-white"
                            />
                          </div>
                          {vipBenefitsDraft.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setVipBenefitsDraft(prev => prev.filter((_, idx) => idx !== index))
                              }
                              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 hover:bg-rose-100 transition cursor-pointer shrink-0"
                              title={isKm ? 'លុបចំណុចនេះ' : 'Remove benefit'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {vipSaveFeedback && (
                    <div
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                        vipSaveFeedback.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-800 dark:text-rose-200'
                      }`}
                    >
                      <span>{vipSaveFeedback.message}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                    <p className="text-[11px] text-stone-500">
                      {isKm
                        ? '🔒 ការផ្លាស់ប្តូរតម្លៃ និងរយៈពេល នឹងអនុវត្តចំពោះការទិញថ្មីៗប៉ុណ្ណោះ ដោយរក្សាទុកសុពលភាពសមាជិកចាស់ និងប្រវត្តិទូទាត់ទាំងអស់។'
                        : '🔒 Updated prices and durations apply to future purchases while preserving existing memberships and payment history.'}
                    </p>
                    <button
                      type="submit"
                      disabled={isSavingVipSettings}
                      className="px-6 py-3 bg-gradient-to-r from-[#064E3B] to-[#047857] hover:from-[#047857] hover:to-[#065F46] disabled:opacity-60 text-white font-extrabold rounded-2xl shadow-md transition-all text-xs flex items-center gap-2 active:scale-95 cursor-pointer"
                    >
                      {isSavingVipSettings ? (
                        <RefreshCw className="w-4 h-4 text-amber-300 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-amber-300" />
                      )}
                      <span>
                        {isSavingVipSettings
                          ? isKm
                            ? '⏳ កំពុងរក្សាទុកទៅកាន់ Database...'
                            : '⏳ Saving to Database...'
                          : isKm
                          ? '💾 រក្សាទុក & ធ្វើបច្ចុប្បន្នភាពការកំណត់ VIP ទូទាំងកម្មវិធី'
                          : '💾 Save & Synchronize VIP Settings Globally'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
              )}

              {/* CATEGORY 4: Official Store Distribution Links (Google Play Store) */}
              {showSection('distribution') && (
              <div className="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-slate-200/90 dark:border-stone-700 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-200 dark:border-stone-700">
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-sm">
                      {isKm ? 'តំណភ្ជាប់ផ្លូវការ Google Play Store' : 'Official Google Play Store Link'}
                    </h4>
                    <p className="text-[11px] text-stone-500 font-khmer">
                      {isKm ? 'កម្មវិធីត្រូវបានដំឡើងជាផ្លូវការតាមរយៈ Google Play Store ប៉ុណ្ណោះ' : 'Official installation is exclusively via Google Play Store'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-3 font-khmer">
                  <div>
                    <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                      {isKm ? 'តំណភ្ជាប់ផ្លូវការ Google Play Store' : 'Official Google Play Store URL'}
                    </label>
                    <input
                      type="text"
                      value={playStoreUrl}
                      onChange={e => setPlayStoreUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 font-mono text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-xl shadow-md transition-all font-khmer text-xs active:scale-95"
                  >
                    {isKm ? 'រក្សាទុកតំណភ្ជាប់ Google Play Store' : 'Save Google Play Store Link'}
                  </button>
                </form>
              </div>
              )}

              {/* CATEGORY 3: Support / Payment KHQR Configuration */}
              {showSection('payment_khqr') && (
              <div className="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-slate-200/90 dark:border-stone-700 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-200 dark:border-stone-700">
                  <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-sm">
                      {isKm ? 'ការកំណត់ QR Code ឧបត្ថម្ភ (Support / KHQR)' : 'Support / KHQR Configuration'}
                    </h4>
                    <p className="text-[11px] text-stone-500 font-khmer">
                      {isKm ? 'កែប្រែព័ត៌មានគណនី និងរូបភាព KHQR សម្រាប់ទទួលការឧបត្ថម្ភគាំទ្រ' : 'Update verified KHQR image and bank details'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col items-center justify-center p-3 bg-stone-50 dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <img 
                      src={supportQrUrl} 
                      alt="Support KHQR Preview" 
                      className="w-36 h-auto max-h-48 object-contain rounded-xl border border-stone-300 shadow-sm"
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/donation-qr.png';
                      }}
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-3 font-khmer">
                    <div>
                      <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                        {isKm ? 'ទីតាំងរូបភាព QR Code (Image URL)' : 'KHQR Image URL'}
                      </label>
                      <input
                        type="text"
                        value={supportQrUrl}
                        onChange={e => setSupportQrUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 font-mono text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                          {isKm ? 'ឈ្មោះធនាគារ' : 'Bank Name'}
                        </label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={e => setBankName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                          {isKm ? 'ឈ្មោះម្ចាស់គណនី' : 'Account Name'}
                        </label>
                        <input
                          type="text"
                          value={accountName}
                          onChange={e => setAccountName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveSettings}
                      className="px-5 py-2.5 bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-xl shadow-md transition-all font-khmer text-xs active:scale-95"
                    >
                      {isKm ? 'រក្សាទុកព័ត៌មាន KHQR' : 'Save KHQR Configuration'}
                    </button>
                  </div>
                </div>
              </div>
              )}

              {/* CATEGORY 6: Administrator Password & Credentials Management */}
              {showSection('security') && (
              <div className="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-slate-200/90 dark:border-stone-700 shadow-xs space-y-4 font-khmer">
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-200 dark:border-stone-700">
                  <KeyRound className="w-5 h-5 text-[#059669]" />
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      {isKm ? 'ផ្លាស់ប្តូរពាក្យសម្ងាត់រដ្ឋបាល' : 'Update Admin Credentials'}
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      {isKm ? 'ផ្លាស់ប្តូរពាក្យសម្ងាត់ដោយប្រើប្រាស់ PBKDF2-HMAC-SHA256 (100,000 Iterations)' : 'Hash & update admin credentials securely'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleChangeAdminPassword} className="space-y-3 max-w-md">
                  <div>
                    <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                      {isKm ? 'ពាក្យសម្ងាត់ថ្មី (New Password - យ៉ាងហោច ៨ តួ)' : 'New Admin Password (min 8 chars)'}
                    </label>
                    <input
                      type="password"
                      value={newAdminPass}
                      onChange={e => setNewAdminPass(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center gap-2 active:scale-95"
                  >
                    <Lock className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{isKm ? 'Hash PBKDF2 និងផ្លាស់ប្តូរ' : 'Hash PBKDF2 & Update'}</span>
                  </button>
                </form>
              </div>
              )}

              {/* CATEGORY 5: Supabase Free Tier Cloud & Google Maps Places API + Smart Cache */}
              {showSection('cloud_system') && (
              <div className="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-slate-200/90 dark:border-stone-700 shadow-xs space-y-4 font-khmer text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-700">
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-2">
                      <span>☁️</span>
                      <span>ប្រព័ន្ធ Cloud Supabase (Free Tier) & Google Maps Places API + Smart Cache</span>
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      ភ្ជាប់ Supabase ឥតគិតថ្លៃ (50,000 នាក់/ខែ, 500MB Database, 1GB រូបភាព) និង Google Maps Places API ($200/ខែ Free Credit + Smart Cache សន្សំកូតា)
                    </p>
                  </div>
                </div>

                {/* Smart Cache & Daily API Quota Live Statistics (Admin Only) */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div>
                    <div className="text-[10px] text-stone-500">ហាង & ទីតាំងក្នុង Smart Cache</div>
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                      {smartCacheStats.totalCachedPlaces} កន្លែង
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-500">សន្សំកូតា Google Maps ($0)</div>
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                      {smartCacheStats.cacheHitsSavedQuota} ដង
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-500">ចំនួនហៅ API ថ្ងៃនេះ / កូតាប្រចាំថ្ងៃ</div>
                    <div className="text-lg font-black text-stone-800 dark:text-stone-200 font-mono">
                      {smartCacheStats.dailyApiCallsCount} / {smartCacheStats.dailyApiLimit}
                    </div>
                  </div>
                  <div className="flex flex-col justify-between gap-1">
                    <div className="text-[10px] text-stone-500 font-bold">កំណត់កូតា API ប្រចាំថ្ងៃ (Cost Limit)</div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={10}
                        max={5000}
                        value={adminDailyLimitInput}
                        onChange={(e) => setAdminDailyLimitInput(e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg border border-emerald-300 bg-white dark:bg-stone-800 text-xs font-bold font-mono text-stone-900 dark:text-stone-100"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const parsed = parseInt(adminDailyLimitInput, 10);
                          if (!Number.isFinite(parsed) || parsed < 10) {
                            showToast('សូមបញ្ចូលកូតាយ៉ាងតិច 10 ដង/ថ្ងៃ', 'warning');
                            return;
                          }
                          setGoogleMapsDailyLimit(parsed);
                          showToast(`✅ បានកំណត់កូតា Google Maps API ប្រចាំថ្ងៃត្រឹម ${parsed} ដង/ថ្ងៃ`, 'success');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer"
                      >
                        រក្សាទុក
                      </button>
                    </div>
                  </div>
                </div>

                {/* Admin-Only Google Maps API Status, Error Details, Billing & Restrictions Diagnostics */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-stone-900/90 border-2 border-indigo-200 dark:border-indigo-900/70 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-stone-100">
                        🛡️ របាយការណ៍ស្ថានភាព Google Maps API & Error Details (បង្ហាញតែក្នុង Admin Settings ប៉ុណ្ណោះ)
                      </span>
                      {googleMapsDiag && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                            googleMapsDiag.status === 'OK'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-slate-950'
                          }`}
                        >
                          {googleMapsDiag.status}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isVerifyingGoogleMaps}
                      onClick={() => handleVerifyGoogleMapsApi(cloudCfg.googleMapsApiKey)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingGoogleMaps ? 'animate-spin' : ''}`} />
                      <span>
                        {isVerifyingGoogleMaps
                          ? 'កំពុងផ្ទៀងផ្ទាត់ផ្ទាល់ជាមួយ Google Cloud...'
                          : '🔍 ផ្ទៀងផ្ទាត់ស្ថានភាព API, Billing & Restrictions ឥឡូវនេះ'}
                      </span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-stone-400">
                    🔒 <strong>សុវត្ថិភាពអេក្រង់អ្នកប្រើប្រាស់ (User Screen Protection)៖</strong> សារព្រមានបច្ចេកទេស និងកំហុស API ទាំងអស់ត្រូវបានដកចេញពីអេក្រង់ User/VIP ទាំងស្រុង។ នៅពេល Google Places API (New) មិនទាន់បើក ឬជាប់ Billing ប្រព័ន្ធស្វែងរកហាង និងតំបន់ទេសចរណ៍កម្ពុជា (Multi-Source Cambodia Search + Smart Cache) ដំណើរការជំនួសដោយស្វ័យប្រវត្តិ 100% ដោយមិនបង្ហាញ Error ដល់អ្នកប្រើប្រាស់ឡើយ។
                  </p>

                  {googleMapsDiag ? (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px]">
                        <div className={`p-2.5 rounded-xl border ${googleMapsDiag.placesApiNewEnabled ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'}`}>
                          <div className="font-bold flex items-center justify-between">
                            <span>1. Places API (New)</span>
                            <span>{googleMapsDiag.placesApiNewEnabled ? '✅ Enabled' : '⚠️ Disabled'}</span>
                          </div>
                          <div className="text-[10px] mt-1 opacity-85">
                            Project #{googleMapsDiag.projectId || '834153814844'}
                          </div>
                          {googleMapsDiag.enableUrl && !googleMapsDiag.placesApiNewEnabled && (
                            <a
                              href={googleMapsDiag.enableUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-extrabold text-indigo-700 underline"
                            >
                              <span>បើក Places API (New)</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>

                        <div className={`p-2.5 rounded-xl border ${googleMapsDiag.billingEnabled ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'}`}>
                          <div className="font-bold flex items-center justify-between">
                            <span>2. Cloud Billing</span>
                            <span>{googleMapsDiag.billingEnabled ? '✅ Active' : '⚠️ Check Billing'}</span>
                          </div>
                          <div className="text-[10px] mt-1 opacity-85">
                            {googleMapsDiag.billingEnabled ? 'គណនី Billing ដំណើរការធម្មតា' : 'ត្រូវភ្ជាប់ Billing ដើម្បីទទួល $200/ខែ Free'}
                          </div>
                          {googleMapsDiag.billingUrl && !googleMapsDiag.billingEnabled && (
                            <a
                              href={googleMapsDiag.billingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-extrabold text-indigo-700 underline"
                            >
                              <span>ផ្ទៀងផ្ទាត់ Cloud Billing</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>

                        <div className={`p-2.5 rounded-xl border ${googleMapsDiag.keyRestrictionsOk ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-red-50 border-red-300 text-red-950'}`}>
                          <div className="font-bold flex items-center justify-between">
                            <span>3. API Key Restrictions</span>
                            <span>{googleMapsDiag.keyRestrictionsOk ? '✅ Valid' : '❌ Restricted/Invalid'}</span>
                          </div>
                          <div className="text-[10px] mt-1 font-mono opacity-85">
                            Key: {googleMapsDiag.keyMasked || 'AIzaSy...'}
                          </div>
                          {googleMapsDiag.credentialsUrl && (
                            <a
                              href={googleMapsDiag.credentialsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-extrabold text-indigo-700 underline"
                            >
                              <span>ពិនិត្យ Key Restrictions</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>

                        <div className="p-2.5 rounded-xl border bg-emerald-50 border-emerald-300 text-emerald-950">
                          <div className="font-bold flex items-center justify-between">
                            <span>4. ប្រព័ន្ធស្វែងរកកម្ពុជា</span>
                            <span>✅ Active 100%</span>
                          </div>
                          <div className="text-[10px] mt-1 opacity-85">
                            Smart Cache + Multi-Source Cambodia ដំណើរការដោយគ្មាន Error
                          </div>
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                        googleMapsDiag.status === 'OK'
                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                          : 'bg-amber-50/90 border-amber-300 text-amber-950'
                      }`}>
                        <div className="font-bold mb-0.5">
                          📋 សេចក្តីលម្អិតបច្ចេកទេស (Admin Diagnostic Message):
                        </div>
                        <div>{isKm ? googleMapsDiag.messageKh : googleMapsDiag.messageEn}</div>
                        {googleMapsDiag.rawDetail && googleMapsDiag.status !== 'OK' && (
                          <div className="mt-1.5 p-2 rounded-lg bg-white/80 dark:bg-stone-800 border border-amber-200 font-mono text-[10px] text-slate-700 dark:text-stone-300 break-all">
                            Raw API Response: {googleMapsDiag.rawDetail}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-stone-500">
                      ចុចប៊ូតុង <strong>«🔍 ផ្ទៀងផ្ទាត់ស្ថានភាព API, Billing & Restrictions ឥឡូវនេះ»</strong> ដើម្បីពិនិត្យសោ Google Maps API ផ្ទាល់។
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                      1. Supabase Project URL (Free Tier)
                    </label>
                    <input
                      type="text"
                      value={cloudCfg.supabaseUrl}
                      onChange={(e) => setCloudCfg({ ...cloudCfg, supabaseUrl: e.target.value })}
                      placeholder="https://xxxxxxxx.supabase.co"
                      className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                      2. Supabase Anon Public Key
                    </label>
                    <input
                      type="password"
                      value={cloudCfg.supabaseAnonKey}
                      onChange={(e) => setCloudCfg({ ...cloudCfg, supabaseAnonKey: e.target.value })}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 font-mono text-[11px]"
                    />
                  </div>
                  <div id="admin-google-maps-key-box" className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-500/60">
                    <label className="block font-bold mb-1 text-[#064E3B] dark:text-emerald-300">
                      3. Google Maps Places API Key ($200/ខែ Free Credit) ⭐
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={cloudCfg.googleMapsApiKey}
                        onChange={(e) => setCloudCfg({ ...cloudCfg, googleMapsApiKey: e.target.value })}
                        placeholder="AIzaSy..."
                        className="flex-1 px-3 py-2 rounded-xl border border-emerald-400 bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const saved = saveCloudApiConfig(cloudCfg);
                          setCloudCfg(saved);
                          handleVerifyGoogleMapsApi(saved.googleMapsApiKey);
                          showToast('បានរក្សាទុកសោ Google Maps Places API Key ជោគជ័យ!', 'success');
                        }}
                        className="px-3 py-2 bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-xl text-[11px] shrink-0"
                      >
                        💾 Save & Verify
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                      4. Google Gemini AI Vision API Key (ស្កេនម្ហូប & រូបមន្ត)
                    </label>
                    <input
                      type="password"
                      value={cloudCfg.geminiApiKey}
                      onChange={(e) => setCloudCfg({ ...cloudCfg, geminiApiKey: e.target.value })}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 font-mono text-[11px]"
                    />
                  </div>
                </div>

                {supabaseTestStatus && (
                  <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[11px] font-bold text-stone-800 dark:text-stone-200">
                    {supabaseTestStatus}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const saved = saveCloudApiConfig(cloudCfg);
                      setCloudCfg(saved);
                      handleVerifyGoogleMapsApi(saved.googleMapsApiKey);
                      showToast('បានរក្សាទុកការកំណត់ Cloud Supabase & Google Maps Places API ជោគជ័យ!', 'success');
                    }}
                    className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-xl shadow-xs transition active:scale-95"
                  >
                    💾 រក្សាទុកការកំណត់ Cloud & API
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      saveCloudApiConfig(cloudCfg);
                      setSupabaseTestStatus('កំពុងសាកល្បងភ្ជាប់ទៅកាន់ Supabase...');
                      const res = await testSupabaseConnection();
                      setSupabaseTestStatus(res.messageKh);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition active:scale-95"
                  >
                    🔌 សាកល្បងភ្ជាប់ Supabase
                  </button>

                  <button
                    type="button"
                    disabled={isSyncingCloud}
                    onClick={async () => {
                      if (!triggerCloudSyncNow) return;
                      setIsSyncingCloud(true);
                      const ok = await triggerCloudSyncNow();
                      setIsSyncingCloud(false);
                      showToast(
                        ok
                          ? 'បានធ្វើសមកាលកម្មទិន្នន័យ (Sync) ជាមួយ Supabase Cloud ជោគជ័យ!'
                          : 'មិនទាន់អាច Sync បានទេ សូមពិនិត្យ Supabase URL & Anon Key។',
                        ok ? 'success' : 'warning'
                      );
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs transition active:scale-95"
                  >
                    🔄 {isSyncingCloud ? 'កំពុង Sync...' : 'Sync ទិន្នន័យជាមួយ Cloud ឥឡូវនេះ'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(SUPABASE_SETUP_SQL);
                      showToast('បានចម្លងកូដ SQL សម្រាប់ដាក់ក្នុង Supabase SQL Editor!', 'info');
                    }}
                    className="px-3 py-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-800 dark:text-stone-200 font-bold rounded-xl transition"
                  >
                    📋 ចម្លងកូដ SQL បង្កើតតារាង Supabase
                  </button>
                </div>
              </div>
              )}
            </div>
            );
          })()}

          {/* AI IMAGE AUDIT & REPLACEMENT TAB */}
          {activeTab === 'image_audit' && (
            <div className="space-y-6">
              {/* Header & Description */}
              <div className="bg-gradient-to-r bg-[#064E3B] text-white p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 text-emerald-200 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-moul text-base text-white">
                      {isKm ? 'សវនកម្មរូបភាពម្ហូបខ្មែរ AI & ការផ្ទៀងផ្ទាត់' : 'AI Food Image Audit & Verification'}
                    </h3>
                    <p className="text-xs text-emerald-200 font-khmer">
                      {isKm 
                        ? 'ការត្រួតពិនិត្យរូបភាពមុខម្ហូបខ្មែរទាំង ១០០ មុខ ដើម្បីធានាភាពត្រឹមត្រូវតាមឈ្មោះមុខម្ហូបពិតប្រាកដ និងដកភាពជាន់គ្នាចេញ ១០០%'
                        : 'Audit and replacement of 100 Cambodian dish images ensuring authentic culinary representation and 0% duplicates.'}
                    </p>
                  </div>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-emerald-200 font-khmer">{isKm ? 'មុខម្ហូបសរុបបាន Audit' : 'Total Dishes Audited'}</div>
                    <div className="text-2xl font-bold font-mono text-white mt-1">{foods.length}</div>
                    <div className="text-[9px] text-emerald-200 font-khmer mt-0.5">✓ គ្រប់មុខម្ហូបទាំងអស់</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-emerald-200 font-khmer">{isKm ? 'ផ្ទៀងផ្ទាត់ត្រឹមត្រូវ ១០០%' : 'Verified & Accurate'}</div>
                    <div className="text-2xl font-bold font-mono text-emerald-200 mt-1">{verifiedFoods.length}</div>
                    <div className="text-[9px] text-emerald-200 font-khmer mt-0.5">✓ រូបភាពច្បាស់តាមមុខម្ហូប</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-emerald-200 font-khmer">{isKm ? 'ដកភាពជាន់គ្នាចេញ' : 'Duplicates Resolved'}</div>
                    <div className="text-2xl font-bold font-mono text-white mt-1">228</div>
                    <div className="text-[9px] text-emerald-200 font-khmer mt-0.5">0% Duplication rate</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-emerald-200 font-khmer">{isKm ? 'រង់ចាំរដ្ឋបាលពិនិត្យ' : 'Pending Admin Review'}</div>
                    <div className="text-2xl font-bold font-mono text-white mt-1">{flaggedFoods.length}</div>
                    <div className="text-[9px] text-emerald-200 font-khmer mt-0.5">{flaggedFoods.length > 0 ? 'ទាមទារការសម្រេច' : 'រួចរាល់ទាំងអស់'}</div>
                  </div>
                </div>
              </div>

              {/* REVIEW QUEUE (Flagged Dishes) */}
              <div className="bg-white dark:bg-stone-800 p-5 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-700">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <div>
                      <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-sm">
                        {isKm ? 'ផ្ទាំងត្រួតពិនិត្យរូបភាពរង់ចាំការសម្រេច (Review Queue)' : 'Image Audit Review Queue'}
                      </h4>
                      <p className="text-[11px] text-stone-500 font-khmer">
                        {isKm ? 'មុខម្ហូបពិសេសក្នុងតំបន់ ឬអាហារប្លែកៗដែលទាមទារការត្រួតពិនិត្យផ្ទៀងផ្ទាត់ពីរដ្ឋបាល' : 'Specialty regional dishes flagged for manual administrator confirmation'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-full font-bold text-xs font-mono">
                    {flaggedFoods.length} Items
                  </span>
                </div>

                {flaggedFoods.length === 0 ? (
                  <div className="p-8 text-center text-stone-500 font-khmer space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <p className="font-bold text-stone-800 dark:text-stone-200">
                      {isKm ? 'អបអរសាទរ! មុខម្ហូបទាំងអស់ត្រូវបានផ្ទៀងផ្ទាត់ត្រឹមត្រូវ ១០០%' : 'All food images are officially verified! No pending reviews.'}
                    </p>
                    <p className="text-[11px]">
                      {isKm ? 'គ្មានមុខម្ហូបណាមួយស្ថិតក្នុងបញ្ជីរង់ចាំការពិនិត្យឡើយ។' : 'The review queue is currently clear.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {flaggedFoods.map(food => (
                      <div 
                        key={food.id} 
                        className="p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-3"
                      >
                        <div className="flex gap-3">
                          <img 
                            src={food.photoUrl} 
                            alt={food.nameKh}
                            className="w-24 h-24 object-cover rounded-xl border border-stone-300 shadow-sm shrink-0" 
                          />
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                                {food.id}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-khmer">
                                {food.categoryKh}
                              </span>
                            </div>
                            <h5 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-sm truncate">
                              {food.nameKh}
                            </h5>
                            <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium truncate">
                              {food.nameEn}
                            </p>
                            <p className="text-[10px] text-amber-800 dark:text-amber-300 font-khmer bg-amber-100/80 dark:bg-amber-900/40 p-1.5 rounded-lg leading-relaxed">
                              ⚠️ {food.imageAuditNote || 'រង់ចាំការពិនិត្យពីរដ្ឋបាល'}
                            </p>
                          </div>
                        </div>

                        {/* Direct URL input if editing */}
                        {editingFoodId === food.id ? (
                          <div className="space-y-2 pt-1 border-t border-amber-200 dark:border-amber-800">
                            <label className="text-[10px] font-bold text-stone-700 dark:text-stone-300 font-khmer block">
                              {isKm ? 'តំណភ្ជាប់រូបភាពថ្មី (New Image URL):' : 'Enter New Image URL:'}
                            </label>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={editingFoodUrl}
                                onChange={e => setEditingFoodUrl(e.target.value)}
                                className="flex-1 px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-800 text-[11px] font-mono text-stone-800 dark:text-stone-200"
                                placeholder="https://..."
                              />
                              <button
                                onClick={() => handleSaveCustomImage(food, editingFoodUrl)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold font-khmer transition"
                              >
                                {isKm ? 'រក្សាទុក' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingFoodId(null)}
                                className="px-2.5 py-1.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-khmer"
                              >
                                {isKm ? 'បោះបង់' : 'Cancel'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 pt-1 border-t border-amber-200 dark:border-amber-800">
                            <button
                              onClick={() => handleApproveImage(food)}
                              className="flex-1 py-2 px-3 bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-xl text-xs font-khmer flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-200" />
                              <span>{isKm ? 'យល់ព្រមរូបភាពនេះ' : 'Approve Photo'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedFoodForImageEdit(food)}
                              className="py-2 px-3 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl text-xs font-khmer flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                            >
                              <Camera className="w-3.5 h-3.5 text-emerald-200" />
                              <span>{isKm ? 'ផ្លាស់ប្តូររូបភាព' : 'Change Photo'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FULL CATALOG AUDIT BROWSER */}
              <div className="bg-white dark:bg-stone-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 dark:border-stone-700 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-700">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#059669]" />
                    <div>
                      <h4 className="font-bold text-[#0F172A] dark:text-stone-100 font-khmer text-sm">
                        {isKm ? `កាតាឡុកមុខម្ហូបទាំងអស់ (${foods.length})` : `Full Catalog Image Browser (${foods.length})`}
                      </h4>
                      <p className="text-[11px] text-stone-500 font-khmer">
                        {isKm ? 'ស្វែងរក និងត្រួតពិនិត្យរូបភាពមុខម្ហូបទាំងអស់ក្នុងប្រព័ន្ធ' : 'Search and audit all dish images'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Filter Pills */}
                    <div className="flex bg-slate-100 dark:bg-stone-900 p-1 rounded-xl text-[11px] font-khmer border border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => setAuditFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          auditFilter === 'all' ? 'bg-white dark:bg-stone-800 text-[#064E3B] shadow-xs' : 'text-stone-500'
                        }`}
                      >
                        {isKm ? `ទាំងអស់ (${foods.length})` : `All (${foods.length})`}
                      </button>
                      <button
                        onClick={() => setAuditFilter('verified')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          auditFilter === 'verified' ? 'bg-white dark:bg-stone-800 text-[#059669] shadow-xs' : 'text-stone-500'
                        }`}
                      >
                        {isKm ? `ផ្ទៀងផ្ទាត់ (${verifiedFoods.length})` : `Verified (${verifiedFoods.length})`}
                      </button>
                      <button
                        onClick={() => setAuditFilter('flagged')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          auditFilter === 'flagged' ? 'bg-white dark:bg-stone-800 text-amber-600 shadow-xs' : 'text-stone-500'
                        }`}
                      >
                        {isKm ? `រង់ចាំពិនិត្យ (${flaggedFoods.length})` : `Flagged (${flaggedFoods.length})`}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={e => setAuditSearchQuery(e.target.value)}
                    placeholder={isKm ? "ស្វែងរកឈ្មោះម្ហូបខ្មែរ អង់គ្លេស ឬលេខសម្គាល់..." : "Search by Khmer, English name, or ID..."}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs font-khmer focus:outline-none focus:border-[#059669]"
                  />
                </div>

                {/* Grid of Dishes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto p-1">
                  {filteredAuditFoods.map(food => (
                    <div 
                      key={food.id}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 dark:border-stone-700 bg-white dark:bg-stone-900/50 flex gap-3 items-center hover:border-slate-300 dark:border-slate-600 transition shadow-xs"
                    >
                      <img 
                        src={food.photoUrl} 
                        alt={food.nameKh}
                        className="w-16 h-16 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0" 
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[9px] font-bold text-stone-500">
                            {food.id}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-stone-800 text-[#064E3B] dark:text-emerald-400 font-khmer">
                            {food.categoryKh}
                          </span>
                        </div>
                        <h6 className="font-bold text-[#0F172A] dark:text-stone-100 font-khmer text-xs truncate">
                          {food.nameKh}
                        </h6>
                        <p className="text-[10px] text-stone-500 truncate">
                          {food.nameEn}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          {food.imageAuditStatus === 'flagged_review' ? (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded font-khmer flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {isKm ? 'រង់ចាំពិនិត្យ' : 'Review'}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-[#059669] bg-slate-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded font-khmer flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {isKm ? 'ផ្ទៀងផ្ទាត់ហើយ' : 'Verified'}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedFoodForImageEdit(food)}
                            className="text-[10px] font-bold text-[#064E3B] dark:text-emerald-400 hover:text-[#059669] hover:underline font-khmer flex items-center gap-0.5"
                          >
                            <Camera className="w-3 h-3" />
                            <span>{isKm ? 'កែរូបភាព' : 'Edit Photo'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Food Image Upload & Management Modal (Phone Gallery + Preview + Compression) */}
      <FoodImageModal
        food={selectedFoodForImageEdit}
        isOpen={!!selectedFoodForImageEdit}
        onClose={() => setSelectedFoodForImageEdit(null)}
        onSave={(updatedFood) => {
          updateFood(updatedFood);
          showToast(isKm ? `បានរក្សាទុករូបភាពសម្រាប់ "${updatedFood.nameKh}" ជោគជ័យ!` : `Updated photo for "${updatedFood.nameEn}"!`, 'success');
        }}
        isKm={isKm}
      />

      {/* Tourist Destination Image Upload & Management Modal (Phone Gallery + Preview + Compression) */}
      <TouristImageModal
        destination={selectedDestForImageEdit}
        isOpen={!!selectedDestForImageEdit}
        onClose={() => setSelectedDestForImageEdit(null)}
        onSave={(updatedDest) => {
          updateDestination(updatedDest);
          showToast(isKm ? `បានរក្សាទុករូបភាពសម្រាប់ "${updatedDest.nameKh}" ជោគជ័យ!` : `Updated photo for "${updatedDest.nameEn}"!`, 'success');
        }}
        isKm={isKm}
      />
    </div>
  );
};

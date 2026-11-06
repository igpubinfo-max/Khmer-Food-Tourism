import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { RestaurantCard } from './RestaurantCard';
import { TouristCard } from './TouristCard';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { 
  User as UserIcon, Heart, Shield, Store, 
  Globe, LogOut, RefreshCw, ShieldCheck, CheckCircle2,
  Bell, Compass, Bookmark, Plus, Trash2, ChevronRight,
  Edit2, Check, X as CloseIcon, Crown, Award, Copy, Clock, MessageSquare, Mail, Settings, Camera, RotateCw, RotateCcw
} from 'lucide-react';
import {
  isRestaurantPremiumActive, isUserVipActive, getVipAccountState, getVipRemainingDays,
  APP_VERSION, APP_BUILD_CODE, getDynamicVipPlans, getDynamicVipBenefits,
  isAdminAccount, getVipFeaturedRotationConfig, getVipFeaturedRotationState
} from '../types';
import { tr } from '../utils/i18n';
import { resolveUserAvatarUrl, handleAvatarImageError, fileToAvatarDataUrl, isCustomUploadedAvatarDataUrl, rotateDataUrl } from '../utils/avatarHelper';
import { AvatarEditorModal } from './AvatarEditorModal';
import {
  isNativeAndroidOrIosPlatform,
  pickImageUsingNativeAndroidGallery,
} from '../utils/androidMediaHelper';
import { requestManualUpdateCheck } from '../services/appUpdateService';
import { IconNavFood, IconNavShop, IconNavTourism } from './icons/HandcraftedIcons';
import { ShopAvatar } from './icons/DefaultShopIcon';

export const ProfileView: React.FC = () => {
  const { 
    currentUser, users, login, logout, language, setLanguage, 
    bookmarks, foods, destinations, restaurants,
    wishlists, tripPlans, deleteTripPlan, notifications, notificationsEnabled, setNotificationsEnabled,
    unreadNotificationsCount, setIsWhatToEatModalOpen, setIsNearMeModalOpen,
    setIsDailyDiscoveriesModalOpen, setIsWishlistsModalOpen, setIsAiTripPlannerModalOpen,
    setIsNotificationsModalOpen, setIsTrendingSocialModalOpen,
    setIsAuthModalOpen, setIsAdminOpen, setIsAdminLoginModalOpen,
    setIsInstallModalOpen, setIsSupportModalOpen, setIsAddRestaurantModalOpen,
    setIsVipAddRestaurantModalOpen,
    setManagingRestaurant, setIsManageMenuModalOpen,
    getOwnedRestaurantsForUser, openManageMyVipStore, activeManagedShopId,
    setSelectedFood, setSelectedRestaurant, setSelectedDestination,
    deleteRestaurant,
    resetAllData, showToast, updateCurrentUserProfile,
    openUpgradeVipModal,
    configureVipAutoRenew,
    cancelVipAutoRenew,
    retryFailedVipAutoRenew,
    supportTickets, openSupportTicketModal, transactions,
    setActiveTab, setIsRestaurantCheckInModalOpen,
    openGoogleMapsSearchModal,
    appSettings, updateAppSettings, getCurrentUserStoreQuota
  } = useApp();

  const isKm = language === 'km';
  const isAdmin = isAdminAccount(currentUser);
  const isVip = isUserVipActive(currentUser);
  const vipAccountState = getVipAccountState(currentUser);
  const storeQuota = getCurrentUserStoreQuota();
  const dynamicPlans = getDynamicVipPlans(appSettings);
  const shortPlan = dynamicPlans.quarterly;
  const longPlan = dynamicPlans.annual;
  const dynamicBenefits = getDynamicVipBenefits(appSettings);
  const rotationCfg = getVipFeaturedRotationConfig(appSettings);
  const rotationState = getVipFeaturedRotationState(restaurants, users, appSettings);
  const isOwner = Boolean(
    currentUser &&
      !isAdmin &&
      (currentUser.role === 'owner' ||
        isVip ||
        restaurants.some(r => r.ownerId === currentUser.id))
  );
  const remainingDays = getVipRemainingDays(currentUser);
  const [selectedVipPowerPanel, setSelectedVipPowerPanel] = useState<'analytics' | 'reels' | 'photos' | 'rank' | null>('analytics');

  const [activeSubTab, setActiveSubTab] = useState<'bookmarks' | 'wishlists' | 'tripplans' | 'settings' | 'myrestaurant' | 'membership'>(
    isAdmin ? 'settings' : (isOwner ? 'myrestaurant' : (isVip ? 'wishlists' : 'bookmarks'))
  );

  useEffect(() => {
    if (isAdmin && activeSubTab !== 'settings') {
      setActiveSubTab('settings');
    } else if (!isVip && !isAdmin && activeSubTab === 'tripplans') {
      setActiveSubTab('bookmarks');
    }
  }, [isAdmin, isVip, activeSubTab]);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showSupportDetails, setShowSupportDetails] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
  const [avatarEditorSourceUrl, setAvatarEditorSourceUrl] = useState<string>('');
  const [isAvatarActionSheetOpen, setIsAvatarActionSheetOpen] = useState(false);

  // Automatic VIP Renewal Management State
  const [showProfileAutoRenewSetup, setShowProfileAutoRenewSetup] = useState(false);
  const [profileAutoRenewPlan, setProfileAutoRenewPlan] = useState<'quarterly' | 'annual'>(
    currentUser?.autoRenewPlanId === 'annual' || currentUser?.vipPlanType === 'annual' ? 'annual' : 'quarterly'
  );
  const [profileAutoRenewMethod, setProfileAutoRenewMethod] = useState<'KHQR' | 'Bakong' | 'Card'>(
    currentUser?.autoRenewPaymentMethod === 'Bakong' || currentUser?.autoRenewPaymentMethod === 'Card'
      ? currentUser.autoRenewPaymentMethod
      : 'KHQR'
  );
  const [profileAutoRenewConsent, setProfileAutoRenewConsent] = useState(false);
  const [isRetryingProfileAutoRenew, setIsRetryingProfileAutoRenew] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setProfileAutoRenewPlan(
        currentUser.autoRenewPlanId === 'annual' || currentUser.vipPlanType === 'annual' ? 'annual' : 'quarterly'
      );
      setProfileAutoRenewMethod(
        currentUser.autoRenewPaymentMethod === 'Bakong' || currentUser.autoRenewPaymentMethod === 'Card'
          ? currentUser.autoRenewPaymentMethod
          : 'KHQR'
      );
    }
  }, [currentUser?.id, currentUser?.autoRenewPlanId, currentUser?.vipPlanType, currentUser?.autoRenewPaymentMethod]);

  const hasCustomAvatar = Boolean(
    currentUser && isCustomUploadedAvatarDataUrl(currentUser.avatar)
  );

  const handleAvatarClick = () => {
    if (!currentUser || isSavingAvatar) return;
    if (hasCustomAvatar) {
      setIsAvatarActionSheetOpen(true);
    } else {
      handleTriggerAvatarPicker();
    }
  };

  const handleOpenCurrentAvatarEditor = () => {
    if (!currentUser?.avatar) return;
    setIsAvatarActionSheetOpen(false);
    setAvatarEditorSourceUrl(currentUser.avatar);
    setIsAvatarEditorOpen(true);
  };

  const handleTriggerAvatarPicker = async () => {
    setIsAvatarActionSheetOpen(false);
    if (!currentUser || isSavingAvatar) return;
    if (isNativeAndroidOrIosPlatform()) {
      setIsSavingAvatar(true);
      try {
        const nativePick = await pickImageUsingNativeAndroidGallery(1080, 0.88);
        if (nativePick?.cancelled) {
          setIsSavingAvatar(false);
          return;
        }
        if (nativePick?.dataUrl) {
          setAvatarEditorSourceUrl(nativePick.dataUrl);
          setIsAvatarEditorOpen(true);
          setIsSavingAvatar(false);
          return;
        }
      } catch {
        // Fallback to standard file input below if native picker fails
      }
      setIsSavingAvatar(false);
    }
    avatarInputRef.current?.click();
  };

  const handleAvatarPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file || !currentUser) {
      inputEl.value = '';
      return;
    }
    setIsSavingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = typeof reader.result === 'string' ? reader.result : '';
        if (raw) {
          setAvatarEditorSourceUrl(raw);
          setIsAvatarEditorOpen(true);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      showToast(
        tr(language, 'មិនអាចប្រើរូបភាពនេះបានទេ សូមជ្រើសរើសរូបភាពផ្សេង', 'Could not use this photo, please pick another one', '无法使用这张照片，请换一张'),
        'warning'
      );
    } finally {
      inputEl.value = '';
      setIsSavingAvatar(false);
    }
  };

  const handleSaveAvatarFromEditor = (finalDataUrl: string) => {
    if (!currentUser || !finalDataUrl) return;
    updateCurrentUserProfile(currentUser.name, finalDataUrl);
    showToast(
      tr(language, 'បានរក្សាទុករូបភាពប្រូហ្វាល់ត្រង់ស្អាតជោគជ័យ!', 'Profile photo saved upright successfully!', '头像已成功正向保存！'),
      'success'
    );
  };

  const handleResetToDefaultAvatar = () => {
    if (!currentUser) return;
    setIsAvatarActionSheetOpen(false);
    updateCurrentUserProfile(currentUser.name, '');
    showToast(
      tr(language, 'បានកំណត់រូបភាពប្រូហ្វាល់ដើមឡើងវិញ', 'Profile photo reset to default', '头像已恢复为默认'),
      'info'
    );
  };

  // Discreet private 5-tap trigger on App Version footer for Admin access (no visible Admin button to users)
  const adminVersionTapCountRef = useRef<number>(0);
  const adminVersionTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVersionFooterTap = () => {
    if (isAdmin) return;
    adminVersionTapCountRef.current += 1;
    if (adminVersionTapTimerRef.current) {
      clearTimeout(adminVersionTapTimerRef.current);
    }
    if (adminVersionTapCountRef.current >= 5) {
      adminVersionTapCountRef.current = 0;
      setIsAdminLoginModalOpen(true);
      return;
    }
    adminVersionTapTimerRef.current = setTimeout(() => {
      adminVersionTapCountRef.current = 0;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (adminVersionTapTimerRef.current) {
        clearTimeout(adminVersionTapTimerRef.current);
      }
    };
  }, []);

  // Bookmarked items
  const savedFoods = foods.filter(f => bookmarks.includes(f.id));
  const savedDestinations = destinations.filter(d => bookmarks.includes(d.id));
  const savedRestaurants = restaurants.filter(r => bookmarks.includes(r.id));

  // Owner restaurants (sorted newest/active first via getOwnedRestaurantsForUser)
  const myRestaurants = getOwnedRestaurantsForUser(currentUser);

  const vipDashboard = (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-amber-600/25 border-2 border-amber-400/80 shadow-md space-y-3.5 transition animate-fade-in font-khmer">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-md ring-4 ring-amber-400/20">
                <Crown className="w-6 h-6 fill-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {isKm ? 'ស្ថានភាពសមាជិកភាព៖' : 'Membership:'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 shadow-2xs">
                    {tr(language, 'សមាជិក VIP សកម្ម', 'Active VIP Member', 'VIP 会员（有效）')}
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 font-bold mt-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {isKm 
                      ? `ថ្ងៃផុតកំណត់៖ ${currentUser?.subscriptionExpiryDate ? currentUser.subscriptionExpiryDate.split('T')[0] : ''} (សល់ ${remainingDays} ថ្ងៃ)` 
                      : `Expires: ${currentUser?.subscriptionExpiryDate ? currentUser.subscriptionExpiryDate.split('T')[0] : ''} (${remainingDays} days left)`}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Super Potential Privileges Showcase */}
          <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-amber-400/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>{tr(language, 'អត្ថប្រយោជន៍គណនី VIP', 'VIP Member Benefits', 'VIP 会员专属权益')}</span>
              </span>
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                {tr(language, 'សកម្មទាំងអស់', 'All Active', '全部已开启')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => {
                  setSelectedVipPowerPanel('rank');
                  if (myRestaurants[0]) {
                    (window as any).__kft_manage_initial_tab = 'info';
                    setManagingRestaurant(myRestaurants[0]);
                    setIsManageMenuModalOpen(true);
                  } else {
                    setActiveSubTab('myrestaurant');
                  }
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer active:scale-95 ${
                  selectedVipPowerPanel === 'rank'
                    ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-400 shadow-xs'
                    : 'bg-amber-50/90 dark:bg-slate-800 border-amber-300/70 dark:border-amber-500/40 hover:border-amber-400'
                }`}
              >
                <span className="text-base">🚀</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{isKm ? 'ចំណាត់ថ្នាក់ស្វែងរកកំពូល' : 'Top Search Rank'}</div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">{tr(language, '✓ អាទិភាពបង្ហាញមុខគេ', '✓ Priority Placement', '✓ 优先展示已开启')}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedVipPowerPanel('analytics');
                  if (myRestaurants[0]) {
                    (window as any).__kft_manage_initial_tab = 'analytics';
                    setManagingRestaurant(myRestaurants[0]);
                    setIsManageMenuModalOpen(true);
                  }
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer active:scale-95 ${
                  selectedVipPowerPanel === 'analytics'
                    ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-400 shadow-xs'
                    : 'bg-amber-50/90 dark:bg-slate-800 border-amber-300/70 dark:border-amber-500/40 hover:border-amber-400'
                }`}
              >
                <span className="text-base">📈</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{isKm ? 'ស្ថិតិ Live Analytics' : 'Live Analytics'}</div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">{isKm ? '✓ ចុចមើលចំនួនអ្នកមើល & Call' : '✓ Tap to view stats'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedVipPowerPanel('rank');
                  setActiveSubTab('membership');
                }}
                className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-slate-800 border border-amber-300/70 dark:border-amber-500/40 hover:border-amber-400 flex items-center gap-2 text-left transition cursor-pointer active:scale-95"
              >
                <span className="text-base">👑</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{isKm ? 'ផ្លាកសញ្ញា Golden VIP' : 'Golden VIP Badge'}</div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">{isKm ? '✓ បង្ហាញលើ Profile & ហាង' : '✓ Active on Profile & Shop'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedVipPowerPanel('photos');
                  if (myRestaurants[0]) {
                    (window as any).__kft_manage_initial_tab = 'photos';
                    setManagingRestaurant(myRestaurants[0]);
                    setIsManageMenuModalOpen(true);
                  } else {
                    setIsVipAddRestaurantModalOpen(true);
                  }
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer active:scale-95 ${
                  selectedVipPowerPanel === 'photos'
                    ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-400 shadow-xs'
                    : 'bg-amber-50/90 dark:bg-slate-800 border-amber-300/70 dark:border-amber-500/40 hover:border-amber-400'
                }`}
              >
                <span className="text-base">📸</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{isKm ? 'រូបថតហាងផ្លូវការ HD' : 'Official HD Shop Photo'}</div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">{isKm ? '✓ ចុចកែប្រែរូបតំណាងហាង' : '✓ Tap to update shop photo'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedVipPowerPanel('reels');
                  if (myRestaurants[0]) {
                    (window as any).__kft_manage_initial_tab = 'info';
                    setManagingRestaurant(myRestaurants[0]);
                    setIsManageMenuModalOpen(true);
                  }
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer active:scale-95 ${
                  selectedVipPowerPanel === 'reels'
                    ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-400 shadow-xs'
                    : 'bg-amber-50/90 dark:bg-slate-800 border-amber-300/70 dark:border-amber-500/40 hover:border-amber-400'
                }`}
              >
                <span className="text-base">🎥</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{isKm ? 'វីដេអូផ្សព្វផ្សាយហាង' : 'Video Promotion'}</div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">{isKm ? '✓ ចុចភ្ជាប់វីដេអូ TikTok & FB' : '✓ Tap to manage Reels'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => openGoogleMapsSearchModal('all')}
                className="p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-400/70 hover:border-emerald-500 flex items-center gap-2 text-left transition cursor-pointer active:scale-95 col-span-2"
              >
                <span className="text-base">🗺️</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {isKm ? 'ស្វែងរកទីតាំងលើ Google Maps (Places API)' : 'Google Maps Places Search (VIP Access)'}
                  </div>
                  <div className="text-[9px] text-emerald-700 dark:text-emerald-300 font-bold">
                    {isKm ? '✓ ស្វែងរកហាងកាហ្វេ ភោជនីយដ្ឋាន & តំបន់ទេសចរណ៍ទូទាំងកម្ពុជា' : '✓ Search cafés, restaurants & places across Cambodia'}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black shrink-0">
                  {isKm ? 'បើកស្វែងរក' : 'Search'}
                </span>
              </button>
            </div>

            {/* Interactive VIP Live Analytics & Food Video Reels Quick Panel */}
            {selectedVipPowerPanel === 'analytics' && (
              <div className="mt-2 p-3 rounded-2xl bg-gradient-to-br from-emerald-950 to-slate-900 text-white border border-emerald-500/40 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <span>📈</span>
                    <span>
                      {isKm
                        ? `ស្ថិតិផ្ទាល់ Live Analytics (${myRestaurants[0]?.nameKh || currentUser?.restaurantName || currentUser?.name})`
                        : 'Real-Time VIP Live Analytics'}
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-bold">
                    ● LIVE
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="p-2 rounded-xl bg-white/10 border border-white/10">
                    <div className="text-sm font-black font-mono text-amber-300">
                      {myRestaurants[0]?.analytics?.views ?? 0}
                    </div>
                    <div className="text-[9px] text-slate-300">{tr(language, 'អ្នកចូលមើល', 'Views', '浏览')}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10 border border-white/10">
                    <div className="text-sm font-black font-mono text-emerald-300">
                      {myRestaurants[0]?.analytics?.phoneClicks ?? 0}
                    </div>
                    <div className="text-[9px] text-slate-300">{tr(language, 'ចុចខល', 'Calls', '致电')}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10 border border-white/10">
                    <div className="text-sm font-black font-mono text-sky-300">
                      {myRestaurants[0]?.analytics?.mapClicks ?? 0}
                    </div>
                    <div className="text-[9px] text-slate-300">{tr(language, 'ចុចផែនទី', 'Maps', '导航')}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10 border border-white/10">
                    <div className="text-sm font-black font-mono text-purple-300">
                      {myRestaurants[0]?.analytics?.shareClicks ?? 0}
                    </div>
                    <div className="text-[9px] text-slate-300">{tr(language, 'ចែករំលែក', 'Shares', '分享')}</div>
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-[11px] text-amber-100 leading-relaxed font-khmer">
                    {tr(
                      language,
                      'តាមដានចំនួនអ្នកចូលមើល ការហៅទូរស័ព្ទ និងការស្វែងរកទីតាំងហាងរបស់អ្នកដោយផ្ទាល់។',
                      'Track real visitor views, phone calls, map directions, and shares for your restaurant.',
                      '实时查看顾客对您餐厅的浏览、致电、地图导航与分享统计。'
                    )}
                  </div>
                  {myRestaurants[0] ? (
                    <button
                      type="button"
                      onClick={() => {
                        (window as any).__kft_manage_initial_tab = 'analytics';
                        setManagingRestaurant(myRestaurants[0]);
                        setIsManageMenuModalOpen(true);
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 border-2 border-white/60 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                    >
                      <Crown className="w-4 h-4 fill-slate-950 shrink-0" />
                      <span>{isKm ? '📊 បើកផ្ទាំងស្ថិតិលម្អិត & គ្រប់គ្រងហាង VIP (1/1 ហាង)' : '📊 Open Full Store Analytics & Hub (1/1 Store)'}</span>
                    </button>
                  ) : (
                    <div className="relative p-1 rounded-2xl group">
                      {/* Softly blinking glowing lights around border */}

                      <button
                        type="button"
                        onClick={() => setIsVipAddRestaurantModalOpen(true)}
                        className="relative w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm border-2 border-white/90 vip-glow-btn flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-lg"
                      >
                        <Crown className="w-4 h-4 fill-slate-950 shrink-0" />
                        <span>{isKm ? '+ ចុះបញ្ជីហាង VIP របស់អ្នក' : '+ Register Your VIP Restaurant'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedVipPowerPanel === 'reels' && (
              <div className="mt-2 p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-amber-950 text-white border border-amber-400/50 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <span>🎥</span>
                    <span>{isKm ? 'គ្រប់គ្រងវីដេអូម្ហូប Food Video Reels (TikTok & Facebook)' : 'Food Video Reels Manager'}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[10px] text-slate-200 leading-relaxed">
                  {isKm
                    ? 'ភ្ជាប់វីដេអូម្ហូបពី TikTok, Facebook Reels ឬ YouTube ទៅលើទំព័រហាង VIP របស់អ្នក និងទស្សនាវីដេអូម្ហូបកំពុងល្បី។'
                    : 'Attach TikTok, Facebook Reels, or YouTube food videos directly to your VIP store page.'}
                </p>
                <div className="flex gap-2">
                  {myRestaurants[0] ? (
                    <button
                      type="button"
                      onClick={() => {
                        (window as any).__kft_manage_initial_tab = 'info';
                        setManagingRestaurant(myRestaurants[0]);
                        setIsManageMenuModalOpen(true);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[11px] transition cursor-pointer"
                    >
                      {isKm ? '🎬 ដាក់/កែប្រែវីដេអូ Reels ហាងខ្ញុំ' : '🎬 Edit Store Video Reel'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsVipAddRestaurantModalOpen(true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[11px] transition cursor-pointer"
                    >
                      {isKm ? '+ ចុះបញ្ជីហាង VIP របស់អ្នក' : '+ Register Your VIP Store'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsTrendingSocialModalOpen(true)}
                    className="py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] transition cursor-pointer"
                  >
                    {isKm ? '🔥 មើល Reels ល្បីៗ' : '🔥 Watch Trending Reels'}
                  </button>
                </div>
              </div>
            )}

            {/* Prominent Always-Visible VIP Store Registration / Management Banner */}
            {selectedVipPowerPanel !== 'analytics' && (
              <div className="mt-2 p-3.5 rounded-2xl bg-gradient-to-br from-[#064E3B] via-emerald-900 to-slate-900 text-white border-2 border-amber-400/70 shadow-md space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 fill-amber-300 text-amber-300 shrink-0" />
                    <span>{isKm ? 'សិទ្ធិចុះបញ្ជីហាង VIP ពិសេស' : 'VIP Store Priority Registration'}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black">
                    {myRestaurants[0] ? (isKm ? '1/1 ហាង' : '1/1 Store') : (isKm ? '១ គណនី = ១ ហាង' : '1 Account = 1 Store')}
                  </span>
                </div>
                <p className="text-[11px] text-amber-50/95 leading-relaxed font-medium">
                  {isKm
                    ? 'គ្រប់គ្រងរូបភាពហាង ទីតាំងផែនទី និងព័ត៌មានទំនាក់ទំនងហាងរបស់អ្នក។'
                    : 'Manage your shop photo, map location, and contact details so diners can easily find your restaurant.'}
                </p>
                {myRestaurants[0] ? (
                  <button
                    type="button"
                    onClick={() => {
                      (window as any).__kft_manage_initial_tab = 'info';
                      setManagingRestaurant(myRestaurants[0]);
                      setIsManageMenuModalOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-600 text-slate-950 font-black text-xs shadow-md border-2 border-white/70 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                  >
                    <Store className="w-4 h-4 shrink-0" />
                    <span>{isKm ? '✏️ គ្រប់គ្រងហាង VIP របស់អ្នក (1/1 ហាង)' : '✏️ Manage Your VIP Store (1/1)'}</span>
                  </button>
                ) : (
                  <div className="relative p-1 rounded-2xl group">
                    <button
                      type="button"
                      onClick={() => {
                        (window as any).__kft_vip_add_mode = 'add_new';
                        setIsVipAddRestaurantModalOpen(true);
                      }}
                      className="relative w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm border-2 border-white/90 vip-glow-btn flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-lg"
                    >
                      <Crown className="w-4 h-4 fill-slate-950 shrink-0" />
                      <span>{isKm ? '+ ចុះបញ្ជីហាង VIP របស់អ្នក (1 ហាង)' : '+ Register Your VIP Restaurant (1 Store)'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
  );

  return (
    <div className="max-w-md mx-auto w-full px-3.5 py-3 space-y-3 pb-8">
      {/* User Header Profile Card */}
      <div className="shrink-0 p-3 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-xs">
        {currentUser ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="relative shrink-0">
                  <img 
                    key={resolveUserAvatarUrl(currentUser)}
                    src={resolveUserAvatarUrl(currentUser)} 
                    alt={currentUser.name} 
                    referrerPolicy="no-referrer"
                    decoding="async"
                    onClick={handleAvatarClick}
                    onError={(e) => handleAvatarImageError(e, currentUser)}
                    className={`w-14 h-14 bg-emerald-950 cursor-pointer ${
      isAdmin 
        ? 'rounded-full ring-4 ring-emerald-400/40 border-2 border-[#059669]' 
        : isVip 
        ? 'rounded-2xl ring-4 ring-amber-400/50 border-2 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] bg-white' 
        : 'rounded-2xl ring-4 ring-emerald-500/20 border-2 border-[#059669]'
    } object-cover shadow-md active:scale-95 transition`}
                  />
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={isSavingAvatar}
                    aria-label={tr(language, 'ប្តូររូបភាពប្រូហ្វាល់', 'Change profile photo', '更换头像')}
                    title={tr(language, 'ប្តូររូបភាពប្រូហ្វាល់', 'Change profile photo', '更换头像')}
                    className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center cursor-pointer active:scale-90 transition disabled:opacity-60"
                  >
                    <Camera className="w-3 h-3" />
                  </button>

                  {hasCustomAvatar && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCurrentAvatarEditor();
                      }}
                      aria-label={tr(language, 'បង្វិលរូបភាព 90°', 'Rotate photo 90°', '旋转照片 90°')}
                      title={tr(language, 'បង្វិលរូបភាព 90°', 'Rotate photo 90°', '旋转照片 90°')}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center cursor-pointer active:scale-90 transition"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  )}

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarPicked}
                  />
                </div>                <div className="flex-1 min-w-0">
                  {/* Large Prominent Account Name & Quick Edit */}
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <input
                        type="text"
                        autoFocus
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        placeholder={tr(language, 'វាយឈ្មោះថ្មី...', 'Enter new name...', '输入新名称...')}
                        className="w-full max-w-[180px] px-2.5 py-1 text-xs font-bold rounded-lg border-2 border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        onClick={() => {
                          if (tempName.trim()) {
                            updateCurrentUserProfile(tempName.trim());
                          }
                          setIsEditingName(false);
                        }}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                        title={tr(language, 'រក្សាទុក', 'Save', '保存')}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-600 dark:text-slate-300 transition"
                        title={tr(language, 'បោះបង់', 'Cancel', '取消')}
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="font-moul text-base sm:text-lg text-slate-900 dark:text-white leading-snug tracking-wide break-words">
                        {currentUser.name}
                      </h2>
                      <button
                        onClick={() => {
                          setTempName(currentUser.name);
                          setIsEditingName(true);
                        }}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-emerald-100 dark:bg-slate-700 dark:hover:bg-emerald-950/50 text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300 transition"
                        title={tr(language, 'កែប្រែឈ្មោះ', 'Edit Name', '修改名称')}
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  
                  {/* Verified Badge & Role & VIP Status */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs font-khmer">
                        <Shield className="w-3.5 h-3.5 text-emerald-700 fill-emerald-700 dark:text-emerald-400 dark:fill-emerald-400" />
                        <span>🛡️ {tr(language, 'អ្នកគ្រប់គ្រងប្រព័ន្ធ', 'Administrator', '系统管理员')}</span>
                      </span>
                    ) : isVip ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-200 to-amber-300 text-amber-950 border border-amber-400 shadow-2xs font-khmer">
                        <Crown className="w-3.5 h-3.5 fill-amber-700 text-amber-700" />
                        <span>{tr(language, 'សមាជិក VIP', 'VIP MEMBER', 'VIP 尊享会员')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 shadow-2xs font-khmer">
                        <span>{tr(language, 'គណនីឥតគិតថ្លៃ', 'Free User', '免费账户')}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs font-khmer" title={tr(language, 'គណនីបានផ្ទៀងផ្ទាត់', 'Verified Account', '已认证账户')}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{tr(language, 'ផ្ទៀងផ្ទាត់', 'Verified', '已认证')}</span>
                    </span>
                    {!isAdmin && currentUser.role === 'owner' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-khmer bg-amber-100 text-amber-900 border border-amber-300">
                        {tr(language, '🏪 ម្ចាស់ហាង', '🏪 Store Owner', '🏪 店主')}
                      </span>
                    )}
                  </div>

                  {isAdmin ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold font-khmer mt-1">
                      {tr(language, 'គណនីរដ្ឋបាលប្រព័ន្ធផ្លូវការ • Enterprise Control Center', 'Official System Administrator • Enterprise Control Center', '官方系统管理员 • 企业控制中心')}
                    </p>
                  ) : (
                    <div className="mt-1 flex items-center gap-x-2.5 gap-y-0.5 flex-wrap">
                      {currentUser.phone && (
                        <p className="text-xs text-[#059669] font-mono font-bold flex items-center gap-1">
                          <span>📞</span> <span>{currentUser.phone}</span>
                        </p>
                      )}
                      {currentUser.email && !currentUser.email.endsWith('@phone.kh') && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-mono flex items-center gap-1 min-w-0">
                          <span>✉️</span> <span className="truncate">{currentUser.email}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Quick Log Out Button in Profile Header */}
              <button
                onClick={() => {
                  if (window.confirm(tr(language, 'តើអ្នកពិតជាចង់ចាកចេញពីគណនីមែនទេ?', 'Are you sure you want to log out?', '您确定要退出登录吗？'))) {
                    logout();
                  }
                }}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                title={tr(language, 'ចាកចេញពីគណនី', 'Sign Out of Account', '退出登录')}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{tr(language, 'ចាកចេញ', 'Log Out', '退出')}</span>
              </button>
            </div>

            {currentUser.bio && (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/40 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-khmer line-clamp-1">
                {currentUser.bio}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-3 font-khmer">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-[#064E3B] border border-slate-200 flex items-center justify-center mx-auto">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#0F172A] dark:text-white">
                {tr(language, 'សូមចូលគណនីរបស់អ្នក', 'Please Sign In', '请登录您的账户')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {tr(language, 'ដើម្បីរក្សាទុកម្ហូប និងចុះបញ្ជីហាង', 'To save recipes & manage shops', '登录以收藏食谱并管理店铺')}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs sm:text-sm shadow-xs font-khmer transition cursor-pointer"
              >
                {tr(language, 'ចូលគណនី / ចុះឈ្មោះ', 'Sign In / Register', '登录 / 注册')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Executive Hub OR Membership Status & VIP Upgrade Banner Card */}
      {isAdmin ? (
        /* PROFESSIONAL ENTERPRISE ADMIN SETTINGS & CONTROL CENTER (Strictly Admin Tools Only — Zero Consumer VIP Dashboards) */
        <div className="space-y-4 font-khmer animate-fade-in">
          {/* 1. Executive System Overview Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#064E3B] via-[#065F46] to-slate-900 text-white border border-emerald-500/40 shadow-lg space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 shadow-xs">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-black text-white font-moul">
                      {tr(language, 'មជ្ឈមណ្ឌលគ្រប់គ្រង និងការកំណត់រដ្ឋបាល', 'Enterprise Admin Control & Settings', '企业级管理员控制与设置中心')}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                      ● ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-100/90 mt-0.5">
                    {tr(language, 'គ្រប់គ្រងអ្នកប្រើប្រាស់ ហាងអាហារ ការអនុម័ត និងការកំណត់ប្រព័ន្ធ', 'Manage users, shops, approvals, featured rotation & system configuration', '管理用户、餐厅、审批、置顶轮播与系统配置')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  (window as any).__kft_admin_tab = 'settings';
                  setIsAdminOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm transition shrink-0 active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Shield className="w-4 h-4 fill-slate-950" />
                <span>{tr(language, 'បើកផ្ទាំងរដ្ឋបាលពេញលេញ', 'Open Admin Console', '打开完整管理后台')}</span>
              </button>
            </div>

            {/* Clean 3-Total Statistics: Total Shops, Total Food, Total Travel */}
            <div className="grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/10 border border-white/15 overflow-hidden pt-1">
              {[
                {
                  n: restaurants.length,
                  label: tr(language, 'ហាងអាហារសរុប', 'Total Shops', '餐厅总数'),
                  Icon: IconNavShop,
                  tab: 'restaurants',
                },
                {
                  n: foods.length,
                  label: tr(language, 'មុខម្ហូបសរុប', 'Total Food', '美食总数'),
                  Icon: IconNavFood,
                  tab: 'food',
                },
                {
                  n: destinations.length,
                  label: tr(language, 'តំបន់ទេសចរណ៍សរុប', 'Total Travel', '景点总数'),
                  Icon: IconNavTourism,
                  tab: 'destinations',
                },
              ].map((s) => (
                <button
                  key={s.tab}
                  type="button"
                  onClick={() => {
                    (window as any).__kft_admin_tab = s.tab;
                    setIsAdminOpen(true);
                  }}
                  className="py-3 px-2 flex flex-col items-center justify-center gap-1 text-center hover:bg-white/10 active:scale-95 transition cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-xl bg-white/15 text-amber-300 border border-white/20 flex items-center justify-center shrink-0">
                    <s.Icon className="w-4 h-4" />
                  </span>
                  <span className="block text-xl font-black text-white font-mono leading-tight">
                    {s.n}
                  </span>
                  <span className="block text-[11px] font-bold text-emerald-100 leading-tight">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Organized Admin Settings Categories */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h4 className="font-moul text-xs sm:text-sm text-slate-900 dark:text-white">
                  {tr(language, 'ផ្នែកគ្រប់គ្រងរដ្ឋបាល (Admin Categories)', 'Administrative Management Categories', '管理员功能分类')}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {tr(language, 'ជ្រើសរើសផ្នែករដ្ឋបាលដើម្បីគ្រប់គ្រង និងកំណត់ប្រព័ន្ធ', 'Select an administrative module to configure or manage', '选择管理模块进行配置与管理')}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold">
                RBAC: ADMIN ONLY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => { (window as any).__kft_admin_tab = 'users'; setIsAdminOpen(true); }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 dark:bg-slate-900/60 dark:hover:bg-slate-700/70 border border-slate-200/90 dark:border-slate-700 flex items-start gap-3 text-left transition cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-[#064E3B] text-white shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{tr(language, '១. គ្រប់គ្រងអ្នកប្រើប្រាស់ & សិទ្ធិ VIP', '1. User & VIP Access Management', '1. 用户与 VIP 权限管理')}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {tr(language, 'ត្រួតពិនិត្យគណនី អនុម័ត VIP បន្តសុពលភាព ឬបិទ/លុបគណនី', 'Verify accounts, grant or revoke VIP, manage user roles', '管理用户账户、审批或撤销 VIP 权限')}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { (window as any).__kft_admin_tab = 'restaurants'; setIsAdminOpen(true); }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 dark:bg-slate-900/60 dark:hover:bg-slate-700/70 border border-slate-200/90 dark:border-slate-700 flex items-start gap-3 text-left transition cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-emerald-700 text-white shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{tr(language, '២. គ្រប់គ្រងហាង & ការអនុម័ត', '2. Shop Management & Approvals', '2. 店铺管理与审批')}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {tr(language, 'ស្វែងរក កែប្រែ លុប ឬអនុម័តហាងអាហារទូទាំងប្រទេស', 'Search, edit, delete, or approve restaurant listings', '搜索、编辑、删除或审批全国餐厅')}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { (window as any).__kft_admin_tab = 'payments'; setIsAdminOpen(true); }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 dark:bg-slate-900/60 dark:hover:bg-slate-700/70 border border-slate-200/90 dark:border-slate-700 flex items-start gap-3 text-left transition cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{tr(language, '៣. ការទូទាត់ ABA KHQR & សំបុត្រជំនួយ', '3. Payment & Support Verification', '3. 付款审核与客服工单')}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {tr(language, 'ផ្ទៀងផ្ទាត់វិក្កយបត្រ ABA និងឆ្លើយតបសំណើអតិថិជន', 'Verify ABA receipts, store slot fees & support tickets', '核实 ABA 收据、额外店铺费用与客服消息')}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { (window as any).__kft_admin_tab = 'settings'; setIsAdminOpen(true); }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 dark:bg-slate-900/60 dark:hover:bg-slate-700/70 border border-slate-200/90 dark:border-slate-700 flex items-start gap-3 text-left transition cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-amber-300 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{tr(language, '៤. ការកំណត់ប្រព័ន្ធ តម្លៃ VIP & សុវត្ថិភាព', '4. System, VIP Pricing & Security', '4. 系统配置、VIP 价格与安全')}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {tr(language, 'កំណត់តម្លៃកញ្ចប់ VIP ប្រព័ន្ធបង្វិលហាង Cloud និងពាក្យសម្ងាត់', 'Configure VIP plans, featured shop rotation, Cloud & security', '配置 VIP 套餐、店铺轮播、云数据库与密码')}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 3. VIP Shop Featured Rotation Quick Configuration Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3.5">
            <div className="flex items-start justify-between gap-3 flex-wrap border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-moul text-xs sm:text-sm text-slate-900 dark:text-white">
                    {tr(language, 'ការកំណត់ប្រព័ន្ធបង្វិលហាង VIP មុខគេ (VIP Shop Featured Settings)', 'VIP Shop Featured Rotation Settings', 'VIP 店铺置顶轮播设置')}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {tr(
                      language,
                      `ហាង VIP ថ្មីបង្ហាញនៅលើគេរយៈពេល ${rotationCfg.durationDays} ថ្ងៃ រួចបង្វិលឆ្លាស់គ្នាដោយស្វ័យប្រវត្តិ`,
                      `New approved VIP shops appear at the top for ${rotationCfg.durationDays} day(s), then rotate fairly in approval order`,
                      `新批准的 VIP 店铺默认置顶展示 ${rotationCfg.durationDays} 天，随后按注册批准顺序自动公平轮播`
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  updateAppSettings({
                    vipFeaturedRotationEnabled: !rotationCfg.enabled,
                  });
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition cursor-pointer ${
                  rotationCfg.enabled
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                }`}
              >
                <span>
                  {rotationCfg.enabled
                    ? tr(language, '● កំពុងបើកដំណើរការ (Enabled)', '● Rotation Enabled', '● 已启用轮播')
                    : tr(language, '○ បានបិទ (Disabled)', '○ Rotation Disabled', '○ 已停用轮播')}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-200 text-[11px]">
                  {tr(language, 'រយៈពេលបង្ហាញលើគេក្នុង ១ ជុំ (ថ្ងៃ / Days)៖', 'Featured Duration (Days per Shop):', '每家店铺置顶展示天数：')}
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 5, 7].map((daysOpt) => (
                    <button
                      key={daysOpt}
                      type="button"
                      onClick={() => {
                        updateAppSettings({
                          vipFeaturedDurationDays: daysOpt,
                        });
                      }}
                      className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs border transition cursor-pointer ${
                        rotationCfg.durationDays === daysOpt
                          ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50'
                      }`}
                    >
                      {daysOpt}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1">
                <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300">
                  {tr(language, 'ហាងកំពុងបង្ហាញលើគេបច្ចុប្បន្ន (Active Top Slot)៖', 'Currently Featured VIP Shop:', '当前置顶展示的 VIP 店铺：')}
                </div>
                {rotationState.primaryFeaturedShop ? (
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                    🌟 {rotationState.primaryFeaturedShop.restaurant.nameKh || rotationState.primaryFeaturedShop.restaurant.nameEn}
                    <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                      {tr(
                        language,
                        `សល់ប្រហែល ${rotationState.primaryFeaturedShop.remainingHours} ម៉ោងទៀត • បន្ទាប់៖ ${rotationState.nextRotatingShop?.nameKh || '—'}`,
                        `~${rotationState.primaryFeaturedShop.remainingHours}h left • Next: ${rotationState.nextRotatingShop?.nameEn || rotationState.nextRotatingShop?.nameKh || '—'}`,
                        `剩余约 ${rotationState.primaryFeaturedShop.remainingHours} 小时`
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {rotationCfg.enabled
                      ? tr(language, 'មិនទាន់មានហាង VIP ក្នុងជួរបង្វិលនៅឡើយទេ', 'No custom VIP shops in rotation queue yet', '暂无参与轮播的 VIP 店铺')
                      : tr(language, 'ប្រព័ន្ធបង្វិលហាងត្រូវបានបិទបណ្តោះអាសន្ន', 'Featured rotation is currently disabled', '置顶轮播当前已关闭')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2-Row × 3-Column Profile Menu Grid (My Shop, Shop List, Plans, Saved, Membership, Settings) */}
      {!isAdmin && (
        <div
          role="tablist"
          aria-label={tr(language, 'ម៉ឺនុយគណនី', 'Profile menu', '个人中心菜单')}
          className="grid grid-cols-3 gap-2 font-khmer shrink-0"
        >
          {/* 1. My Shop */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'myrestaurant'}
            onClick={() => setActiveSubTab('myrestaurant')}
            className={`min-h-[70px] p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer active:scale-95 ${
              activeSubTab === 'myrestaurant'
                ? 'bg-gradient-to-br from-[#064E3B] to-[#047857] text-white border-emerald-400/60 shadow-md'
                : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:border-emerald-500/50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                activeSubTab === 'myrestaurant'
                  ? 'bg-white/15 text-amber-300'
                  : 'bg-emerald-50 dark:bg-slate-700/80 text-[#064E3B] dark:text-emerald-300'
              }`}
            >
              <Store className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-extrabold leading-tight truncate max-w-full">
              {tr(language, 'ហាងខ្ញុំ', 'My Shop', '我的店铺')}
            </span>
          </button>

          {/* 2. Shop List */}
          <button
            type="button"
            role="tab"
            data-testid="profile-grid-wishlists"
            aria-selected={activeSubTab === 'wishlists'}
            onClick={() => setActiveSubTab('wishlists')}
            className={`min-h-[70px] p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer active:scale-95 ${
              activeSubTab === 'wishlists'
                ? 'bg-gradient-to-br from-[#064E3B] to-[#047857] text-white border-emerald-400/60 shadow-md'
                : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:border-emerald-500/50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                activeSubTab === 'wishlists'
                  ? 'bg-white/15 text-amber-300'
                  : 'bg-teal-50 dark:bg-slate-700/80 text-teal-700 dark:text-teal-300'
              }`}
            >
              <Bookmark className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-extrabold leading-tight truncate max-w-full">
              {tr(language, 'បញ្ជីហាង', 'Shop List', '店铺清单')}
              <span className="ml-1 text-[10px] opacity-80">
                ({wishlists.length})
              </span>
            </span>
          </button>

          {/* 3. Plans */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'tripplans'}
            onClick={() => {
              if (!isVip && currentUser?.role !== 'admin') {
                setIsAiTripPlannerModalOpen(true);
                return;
              }
              setActiveSubTab('tripplans');
            }}
            className={`min-h-[70px] p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer active:scale-95 ${
              activeSubTab === 'tripplans'
                ? 'bg-gradient-to-br from-[#064E3B] to-[#047857] text-white border-emerald-400/60 shadow-md'
                : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:border-emerald-500/50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                activeSubTab === 'tripplans'
                  ? 'bg-white/15 text-amber-300'
                  : 'bg-sky-50 dark:bg-slate-700/80 text-sky-700 dark:text-sky-300'
              }`}
            >
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-extrabold leading-tight truncate max-w-full">
              {tr(language, 'ផែនការ', 'Plans', '行程计划')}
              <span className="ml-1 text-[10px] opacity-80">
                {!isVip && currentUser?.role !== 'admin' ? '🔒' : `(${tripPlans.length})`}
              </span>
            </span>
          </button>

          {/* 4. Saved */}
          <button
            type="button"
            role="tab"
            data-testid="profile-grid-saved"
            aria-selected={activeSubTab === 'bookmarks'}
            onClick={() => setActiveSubTab('bookmarks')}
            className={`min-h-[70px] p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer active:scale-95 ${
              activeSubTab === 'bookmarks'
                ? 'bg-gradient-to-br from-[#064E3B] to-[#047857] text-white border-emerald-400/60 shadow-md'
                : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:border-emerald-500/50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                activeSubTab === 'bookmarks'
                  ? 'bg-white/15 text-rose-300'
                  : 'bg-rose-50 dark:bg-slate-700/80 text-rose-600 dark:text-rose-400'
              }`}
            >
              <Heart className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-extrabold leading-tight truncate max-w-full">
              {tr(language, 'រក្សាទុក', 'Saved', '已收藏')}
              <span className="ml-1 text-[10px] opacity-80">
                ({savedFoods.length + savedDestinations.length + savedRestaurants.length})
              </span>
            </span>
          </button>

          {/* 5. Membership */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'membership'}
            onClick={() => setActiveSubTab('membership')}
            className={`min-h-[70px] p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer active:scale-95 ${
              activeSubTab === 'membership'
                ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 border-amber-300 shadow-md'
                : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:border-amber-400/60'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                activeSubTab === 'membership'
                  ? 'bg-slate-950/15 text-slate-950'
                  : 'bg-amber-50 dark:bg-slate-700/80 text-amber-600 dark:text-amber-400'
              }`}
            >
              <Crown className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-extrabold leading-tight truncate max-w-full">
              {tr(language, 'សមាជិកភាព', 'Membership', '尊享会员')}
            </span>
          </button>

          {/* 6. Settings */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'settings'}
            onClick={() => setActiveSubTab('settings')}
            className={`min-h-[70px] p-2 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer active:scale-95 ${
              activeSubTab === 'settings'
                ? 'bg-gradient-to-br from-[#064E3B] to-[#047857] text-white border-emerald-400/60 shadow-md'
                : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:border-emerald-500/50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                activeSubTab === 'settings'
                  ? 'bg-white/15 text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Settings className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-extrabold leading-tight truncate max-w-full">
              {tr(language, 'ការកំណត់', 'Settings', '设置')}
            </span>
          </button>
        </div>
      )}

      <div className="space-y-3 pb-3">
      {/* Tab: My Restaurant (Shop Owner Portal - Consumer VIP Only) */}
      {!isAdmin && activeSubTab === 'myrestaurant' && (
        <div className="space-y-3 font-khmer">
          {myRestaurants.length === 0 ? (
            <div className="text-center py-7 bg-gradient-to-br from-amber-50 via-white to-emerald-50 dark:from-slate-800 dark:via-slate-800 dark:to-emerald-950/40 rounded-3xl border-2 border-amber-400/70 p-6 space-y-3.5 shadow-md">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shadow-md">
                <Store className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-sm text-[#0F172A] dark:text-white">
                  {isKm ? 'ចុះបញ្ជីហាង VIP របស់អ្នក' : 'Register Your VIP Restaurant'}
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed max-w-md mx-auto bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-500/40 rounded-2xl p-3 font-medium">
                  {isKm
                    ? 'គ្រប់គ្រងរូបភាពហាង ទីតាំងផែនទី និងព័ត៌មានទំនាក់ទំនងហាងរបស់អ្នក។'
                    : 'Manage your shop photo, map location, and contact details so diners can easily find your restaurant.'}
                </p>
              </div>
              <button
                onClick={() => {
                  (window as any).__kft_vip_store_initial_mode = { mode: "create" };
                  setIsVipAddRestaurantModalOpen(true);
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 border-2 border-white/80 inline-flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Crown className="w-4 h-4 fill-slate-950 shrink-0" />
                <span>
                  {isKm ? '+ ចុះបញ្ជីហាង VIP របស់អ្នក' : '+ Register Your VIP Restaurant'}
                </span>
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {currentUser?.role === 'admin'
                    ? (isKm ? `ហាងរបស់ខ្ញុំ (${myRestaurants.length})` : `My Restaurants (${myRestaurants.length})`)
                    : (isKm
                        ? `ហាងរបស់ខ្ញុំ (${storeQuota.usedStoresCount}/${storeQuota.totalAllowedStores} ហាង)`
                        : `My Stores (${storeQuota.usedStoresCount}/${storeQuota.totalAllowedStores})`)}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      (window as any).__kft_vip_store_initial_mode = { mode: "replace", storeId: myRestaurants[0]?.id };
                      setIsVipAddRestaurantModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isKm ? 'ប្តូរហាងថ្មី ($0)' : 'Replace Store ($0)'}</span>
                  </button>
                  <button
                    onClick={() => {
                      (window as any).__kft_vip_store_initial_mode = { mode: "create" };
                      setIsVipAddRestaurantModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-bold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {storeQuota.canAddWithoutNewPayment
                        ? (isKm ? '+ បន្ថែមហាងថ្មី ($0)' : '+ Add Store ($0)')
                        : (isKm ? `+ បន្ថែមហាងថ្មី (+$${storeQuota.additionalStoreFeeUsd.toFixed(2)})` : `+ Add Store (+$${storeQuota.additionalStoreFeeUsd.toFixed(2)})`)}
                    </span>
                  </button>
                </div>
              </div>
              {myRestaurants.map(restaurant => {
              const isPremium = isRestaurantPremiumActive(restaurant) || isVip || currentUser?.role === 'admin';
              const isExpired = restaurant.membershipTier === 'premium' && !isPremium;
              const isFree = !isPremium && !isExpired;

              return (
                <div key={restaurant.id} className="p-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3.5">
                  <div className="flex items-center gap-3">
                    <ShopAvatar
                      restaurant={{
                        ...restaurant,
                        photoUrl:
                          restaurant.thumbnailUrl ||
                          restaurant.photoUrl ||
                          restaurant.profileImage ||
                          restaurant.pendingUpgradeRequest?.proposedChanges?.photoUrl ||
                          restaurant.pendingPhotoReplacement?.newPhotoUrl ||
                          '',
                      }}
                      alt={restaurant.nameKh || restaurant.nameEn || 'restaurant'}
                      className="w-16 h-16 rounded-2xl border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#0F172A] dark:text-white text-sm truncate">
                        {isKm ? restaurant.nameKh : restaurant.nameEn}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate">{restaurant.addressKh}</p>
                      <p className="text-[10px] text-[#059669] font-mono mt-0.5">📞 {restaurant.phone}</p>
                    </div>
                  </div>

                  {/* Membership Card */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200/90 dark:border-slate-600 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isPremium ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#064E3B] text-white flex items-center gap-1 font-khmer shadow-xs">
                            <ShieldCheck className="w-3 h-3 text-emerald-200" />
                            <span>{isKm ? 'សមាជិកភាព VIP Premium (សកម្ម)' : 'Premium VIP Active'}</span>
                          </span>
                        ) : isExpired ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            ⏳ {isKm ? 'Premium បានផុតកំណត់' : 'Premium Expired'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                            🏷️ {isKm ? 'ចុះបញ្ជីឥតគិតថ្លៃ ($0 Free Listing)' : 'Free Listing ($0)'}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-bold text-[#064E3B] dark:text-emerald-400 font-mono">
                        👁️ {restaurant.analytics?.views ?? 0} {isKm ? 'ចូលមើល' : 'views'}
                      </div>
                    </div>

                    {isPremium && (restaurant.membershipExpiresAt || currentUser?.subscriptionExpiryDate) && (
                      <p className="text-[10px] text-slate-700 dark:text-slate-300">
                        {isKm 
                          ? `📅 ផុតកំណត់នៅថ្ងៃទី៖ ${new Date(restaurant.membershipExpiresAt || currentUser?.subscriptionExpiryDate || '').toLocaleDateString()} (កញ្ចប់ VIP $${shortPlan.priceUsd.toFixed(2)} / ${shortPlan.durationDays} ថ្ងៃ ឬ $${longPlan.priceUsd.toFixed(2)} / ${longPlan.durationDays} ថ្ងៃ)` 
                          : `Valid until: ${new Date(restaurant.membershipExpiresAt || currentUser?.subscriptionExpiryDate || '').toLocaleDateString()} (VIP $${shortPlan.priceUsd.toFixed(2)} / ${shortPlan.durationDays}d or $${longPlan.priceUsd.toFixed(2)} / ${longPlan.durationDays}d)`}
                      </p>
                    )}

                    {isFree && (
                      <p className="text-[10px] text-slate-500">
                        {isKm 
                          ? `ដំឡើងទៅកញ្ចប់ VIP ($${shortPlan.priceUsd.toFixed(2)} / ${shortPlan.durationDays} ថ្ងៃ ឬ $${longPlan.priceUsd.toFixed(2)} / ${longPlan.durationDays} ថ្ងៃ) ដើម្បីទទួលបានស្លាកសញ្ញា 👑 VIP និងអាទិភាពបង្ហាញលើគេ!` 
                          : `Upgrade to VIP ($${shortPlan.priceUsd.toFixed(2)} / ${shortPlan.durationDays} days or $${longPlan.priceUsd.toFixed(2)} / ${longPlan.durationDays} days) for the 👑 VIP badge and priority placement!`}
                      </p>
                    )}

                    {isExpired && (
                      <p className="text-[10px] text-red-600">
                        {isKm 
                          ? `សមាជិកភាព VIP បានផុតកំណត់ហើយ។ ទិន្នន័យហាងទាំងអស់ត្រូវបានរក្សាទុកដដែល។ សូមបន្តសមាជិកភាព VIP ($${shortPlan.priceUsd.toFixed(2)} / ${shortPlan.durationDays} ថ្ងៃ ឬ $${longPlan.priceUsd.toFixed(2)} / ${longPlan.durationDays} ថ្ងៃ)។` 
                          : `VIP expired. All store details are retained. Renew VIP ($${shortPlan.priceUsd.toFixed(2)} / ${shortPlan.durationDays} days or $${longPlan.priceUsd.toFixed(2)} / ${longPlan.durationDays} days).`}
                      </p>
                    )}

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => {
                          (window as any).__kft_manage_initial_tab = 'info';
                          setManagingRestaurant(restaurant);
                          setIsManageMenuModalOpen(true);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-emerald-200" />
                        <span>{isKm ? 'កែប្រែព័ត៌មានហាង & រូបភាព' : 'Edit Store & Photo'}</span>
                      </button>

                      <button
                        onClick={() => deleteRestaurant(restaurant.id)}
                        className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                        title={isKm ? 'លុបហាងដើម្បីបង្កើតហាងថ្មី' : 'Delete store'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isKm ? 'លុប' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>
      )}

      {/* Tab: Membership Page (Consumer Users Only) */}
      {!isAdmin && activeSubTab === 'membership' && (
        <div className="space-y-4 font-khmer">
          {isVip ? (
            vipDashboard
          ) : (
            /* Header Card (shown for non-VIP or expired users; active VIPs already see vipDashboard above) */
            <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/20 via-emerald-500/10 to-teal-500/15 border-2 border-amber-400/50 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-2xl bg-amber-400 text-slate-900 shadow-md shrink-0">
                    <Crown className="w-6 h-6 fill-slate-900" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-moul text-sm text-slate-900 dark:text-white truncate">
                      {tr(language, 'ទំព័រសមាជិកភាព VIP', 'VIP Membership Page', 'VIP 会员专属中心')}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {tr(
                        language,
                        `កញ្ចប់ $${shortPlan.priceUsd.toFixed(2)} (${shortPlan.durationDays} ថ្ងៃ) ឬ $${longPlan.priceUsd.toFixed(2)} (${longPlan.durationDays} ថ្ងៃ)`,
                        `$${shortPlan.priceUsd.toFixed(2)} USD (${shortPlan.durationDays} Days) or $${longPlan.priceUsd.toFixed(2)} USD (${longPlan.durationDays} Days)`,
                        `$${shortPlan.priceUsd.toFixed(2)} 美元 (${shortPlan.durationDays} 天) 或 $${longPlan.priceUsd.toFixed(2)} 美元 (${longPlan.durationDays} 天)`
                      )}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-black shrink-0 ${
                    currentUser?.autoRenewLastStatus === 'failed' ||
                    currentUser?.paymentStatus === 'waiting_for_payment'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                      : currentUser?.subscriptionStatus === 'pending'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : currentUser?.subscriptionStatus === 'expired'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {currentUser?.autoRenewLastStatus === 'failed' ||
                  currentUser?.paymentStatus === 'waiting_for_payment'
                    ? tr(language, '⚠️ រង់ចាំការបង់ប្រាក់បន្ត', '⚠️ Awaiting Payment', '⚠️ 待续费付款')
                    : currentUser?.subscriptionStatus === 'pending'
                    ? tr(language, '⏳ រង់ចាំអនុម័ត', '⏳ Pending Review', '⏳ 等待审核')
                    : currentUser?.subscriptionStatus === 'expired'
                    ? tr(language, '❌ ផុតកំណត់', 'Expired', '已到期')
                    : tr(language, 'គណនីឥតគិតថ្លៃ', 'Free User', '免费账户')}
                </span>
              </div>

              {/* Current Status Summary */}
              <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500">{tr(language, 'ស្ថានភាពបច្ចុប្បន្ន៖', 'Current Status:', '当前状态：')}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">
                    {currentUser?.autoRenewLastStatus === 'failed' ||
                    currentUser?.paymentStatus === 'waiting_for_payment'
                      ? tr(
                          language,
                          'ការបង់ប្រាក់បន្តសុពលភាពមិនទាន់ជោគជ័យ / រង់ចាំការបង់ប្រាក់',
                          'Renewal Payment Not Confirmed / Awaiting Payment',
                          '续费付款未确认 / 等待付款'
                        )
                      : currentUser?.subscriptionStatus === 'pending'
                      ? tr(language, '⏳ រង់ចាំរដ្ឋបាលអនុម័ត', '⏳ Pending Admin Approval', '⏳ 等待管理员审核')
                      : currentUser?.subscriptionStatus === 'expired'
                      ? tr(language, '❌ ផុតកំណត់សុពលភាព', 'Expired', '已到期')
                      : tr(language, 'គណនីឥតគិតថ្លៃ', 'Free Account', '免费账户')}
                  </span>
                </div>
                {currentUser?.subscriptionExpiryDate && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500">{tr(language, 'ថ្ងៃផុតកំណត់ចុងក្រោយ៖', 'Last Expiration Date:', '上次到期日：')}</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      {currentUser.subscriptionExpiryDate.split('T')[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* Manual Renew / Upgrade CTA */}
              <button
                type="button"
                onClick={() =>
                  openUpgradeVipModal(
                    Boolean(
                      currentUser?.subscriptionStatus === 'expired' ||
                        currentUser?.autoRenewLastStatus === 'failed' ||
                        currentUser?.paymentStatus === 'waiting_for_payment' ||
                        currentUser?.subscriptionExpiryDate
                    )
                  )
                }
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Crown className="w-4 h-4 fill-white" />
                <span>
                  {currentUser?.subscriptionStatus === 'pending'
                    ? tr(language, '⏳ មើលស្ថានភាពសំណើដំឡើង VIP', 'View Pending Request Status', '⏳ 查看 VIP 升级申请状态')
                    : currentUser?.subscriptionStatus === 'expired' ||
                      currentUser?.autoRenewLastStatus === 'failed' ||
                      currentUser?.paymentStatus === 'waiting_for_payment'
                    ? tr(
                        language,
                        '🔄 បង់ប្រាក់បន្តដោយដៃ (Manual Renew VIP)',
                        '🔄 Manual Renew VIP Membership',
                        '🔄 手动续费 VIP 会员'
                      )
                    : tr(
                        language,
                        `👑 ដំឡើងទៅជា VIP ($${shortPlan.priceUsd.toFixed(2)}/${shortPlan.durationDays}ថ្ងៃ • $${longPlan.priceUsd.toFixed(2)}/${longPlan.durationDays}ថ្ងៃ)`,
                        `Upgrade to VIP ($${shortPlan.priceUsd.toFixed(2)}/${shortPlan.durationDays}d • $${longPlan.priceUsd.toFixed(2)}/${longPlan.durationDays}d)`,
                        `👑 升级至 VIP ($${shortPlan.priceUsd.toFixed(2)}/${shortPlan.durationDays}天 • $${longPlan.priceUsd.toFixed(2)}/${longPlan.durationDays}天)`
                      )}
                </span>
              </button>
            </div>
          )}

          {/* Unified Renewal Controls, Auto-Renewal ON/OFF Toggle, Cancel Subscription & Complete Payment History (Only in Membership Tab) */}
          {currentUser && (() => {
            const isAutoRenewOn =
              currentUser.autoRenew !== false && !currentUser.autoRenewCancelledAt;
            const isPaymentFailedOrWaiting =
              currentUser.autoRenewLastStatus === 'failed' ||
              currentUser.paymentStatus === 'waiting_for_payment' ||
              (!isVip && currentUser.subscriptionStatus === 'expired');

            const myTransactions = transactions.filter(
              t =>
                t &&
                (t.userId === currentUser.id ||
                  t.ownerId === currentUser.id ||
                  (currentUser.email &&
                    t.userEmail &&
                    t.userEmail.toLowerCase() === currentUser.email.toLowerCase()))
            );
            const mySupportTickets = supportTickets.filter(t => t.userId === currentUser.id);
            const unreadAdminReplies = mySupportTickets.filter(t => t.unreadByUser).length;

            // Merge transactions and vipMembershipHistory into a complete, deduplicated payment & membership ledger
            const rawHistory = Array.isArray(currentUser.vipMembershipHistory)
              ? currentUser.vipMembershipHistory
              : [];
            const seenRefs = new Set<string>();
            const combinedPaymentHistory: Array<{
              id: string;
              transactionRef: string;
              date: string;
              amountUsd: number;
              durationDays?: number;
              paymentMethod: string;
              status: 'verified' | 'pending' | 'failed' | 'cancelled' | 'info';
              titleKh: string;
              titleEn: string;
              noteKh?: string;
              noteEn?: string;
            }> = [];

            for (const txn of myTransactions) {
              const refKey = String(txn.transactionRef || txn.id || '').trim().toUpperCase();
              if (refKey) seenRefs.add(refKey);
              const normalizedStatus: 'verified' | 'pending' | 'failed' | 'cancelled' =
                txn.status === 'verified'
                  ? 'verified'
                  : txn.status === 'rejected' || txn.status === 'failed' || txn.paymentStatus === 'failed'
                  ? 'failed'
                  : txn.status === 'cancelled'
                  ? 'cancelled'
                  : 'pending';
              const isExtraStore =
                (txn.type as string) === 'additional_store_slot' ||
                (txn.type as string) === 'additional_store_fee' ||
                (txn.type as string) === 'additional_store';
              combinedPaymentHistory.push({
                id: txn.id,
                transactionRef: txn.transactionRef || txn.id,
                date: txn.verifiedAt || txn.createdAt || '',
                amountUsd: Number(txn.amountUsd ?? shortPlan.priceUsd),
                durationDays: txn.durationDays,
                paymentMethod: txn.paymentMethod || 'KHQR',
                status: normalizedStatus,
                titleKh: isExtraStore
                  ? `បន្ថែមហាងថ្មី (+1 ហាង)`
                  : txn.isAutoRenewal
                  ? `ការបន្តសមាជិកភាព VIP ស្វ័យប្រវត្តិ (${txn.durationDays || shortPlan.durationDays} ថ្ងៃ)`
                  : `សមាជិកភាព VIP (${txn.durationDays || shortPlan.durationDays} ថ្ងៃ)`,
                titleEn: isExtraStore
                  ? `Additional Store Slot (+1 Shop)`
                  : txn.isAutoRenewal
                  ? `Automatic VIP Renewal (${txn.durationDays || shortPlan.durationDays} Days)`
                  : `VIP Membership (${txn.durationDays || shortPlan.durationDays} Days)`,
                noteKh: txn.notes,
                noteEn: txn.notes,
              });
            }

            for (const h of rawHistory) {
              if (!h) continue;
              const refKey = h.transactionRef ? String(h.transactionRef).trim().toUpperCase() : '';
              if (refKey && seenRefs.has(refKey)) continue;
              if (refKey) seenRefs.add(refKey);
              const histStatus: 'verified' | 'pending' | 'failed' | 'cancelled' | 'info' =
                h.status === 'verified'
                  ? 'verified'
                  : h.status === 'failed' || h.action === 'payment_failed'
                  ? 'failed'
                  : (h.action as string) === 'auto_renew_cancelled' || (h.action as string) === 'expired'
                  ? 'cancelled'
                  : 'info';
              combinedPaymentHistory.push({
                id: h.id,
                transactionRef:
                  h.transactionRef ||
                  (h.action === 'auto_renew_enabled'
                    ? 'AUTO-RENEW-ON'
                    : h.action === 'auto_renew_cancelled'
                    ? 'AUTO-RENEW-OFF'
                    : h.id),
                date: h.date ? h.date.replace('T', ' ').slice(0, 16) : '',
                amountUsd: typeof h.amountUsd === 'number' ? h.amountUsd : 0,
                durationDays: h.durationDays,
                paymentMethod: h.paymentMethod || 'ABA KHQR',
                status: histStatus,
                titleKh: h.noteKh,
                titleEn: h.noteEn,
              });
            }

            return (
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3.5">
                {/* Alert Banner when automatic renewal payment is not confirmed or subscription expired */}
                {isPaymentFailedOrWaiting && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-xs font-extrabold text-rose-800 dark:text-rose-200">
                          {tr(
                            language,
                            '⚠️ ការបង់ប្រាក់បន្តសុពលភាពមិនទាន់ជោគជ័យ / រង់ចាំការបង់ប្រាក់',
                            '⚠️ Renewal Payment Not Confirmed / Awaiting Payment',
                            '⚠️ 自动续费未确认 / 等待付款'
                          )}
                        </div>
                        <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                          {tr(
                            language,
                            'ប្រព័ន្ធមិនអាចបន្ថែមថ្ងៃផុតកំណត់ VIP ដោយស្វ័យប្រវត្តិបានទេ ប្រសិនបើមិនទាន់មានកំណត់ត្រាបង់ប្រាក់ជោគជ័យសម្រាប់វគ្គថ្មី។ សូមចុចប៊ូតុងខាងក្រោមដើម្បីបង់ប្រាក់បន្តដោយដៃ (Manual Renew)។',
                            'VIP expiration is only extended after receiving a confirmed payment for the new cycle. Please tap the button below to renew manually.',
                            '只有在收到新周期的确认付款后才会延长 VIP 有效期。请点击下方按钮手动续费。'
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isRetryingProfileAutoRenew}
                      onClick={async () => {
                        setIsRetryingProfileAutoRenew(true);
                        try {
                          await retryFailedVipAutoRenew();
                        } finally {
                          setIsRetryingProfileAutoRenew(false);
                        }
                      }}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-60"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>
                        {tr(
                          language,
                          '🔄 បង់ប្រាក់បន្តដោយដៃឥឡូវនេះ (Manual Renew)',
                          '🔄 Renew Manually Now (Manual Renew)',
                          '🔄 立即手动续费 (Manual Renew)'
                        )}
                      </span>
                    </button>
                  </div>
                )}

                {/* Dates Row: Membership Expiration Date & Next Billing Date */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {tr(language, 'ថ្ងៃផុតកំណត់សមាជិកភាព', 'Membership Expiration Date', '会员到期日')}
                    </div>
                    <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                      {currentUser.subscriptionExpiryDate ? currentUser.subscriptionExpiryDate.split('T')[0] : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {tr(language, 'ថ្ងៃបង់ប្រាក់បន្ទាប់', 'Next Billing Date', '下次续费日期')}
                    </div>
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                      {isAutoRenewOn && currentUser.subscriptionExpiryDate
                        ? currentUser.subscriptionExpiryDate.split('T')[0]
                        : tr(language, 'គ្មានការកាត់ប្រាក់បន្ថែម', 'No Further Charges', '不再扣款')}
                    </div>
                  </div>
                </div>

                {/* Clear Auto-Renewal ON/OFF Toggle & Cancel Subscription Button (Requirements 2 & 6) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {tr(language, 'កុងតាក់បន្តសុពលភាពស្វ័យប្រវត្តិ (Auto-Renewal)', 'Auto-Renewal Toggle', '自动续费开关')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isAutoRenewOn
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isAutoRenewOn
                            ? tr(language, 'បើក (ON)', 'ON', '开启 (ON)')
                            : tr(language, 'បិទ (OFF)', 'OFF', '关闭 (OFF)')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {tr(
                          language,
                          'បើកជាស្រេច (ON by default) សម្រាប់សមាជិក VIP។ ប្រព័ន្ធនឹងបន្ថែមថ្ងៃផុតកំណត់តែនៅពេលទទួលបានការបញ្ជាក់បង់ប្រាក់ជោគជ័យប៉ុណ្ណោះ។',
                          'ON by default for VIP memberships. Membership is extended only after confirmed payment verification.',
                          'VIP 会员默认开启。仅在确认付款验证成功后才会延长会员有效期。'
                        )}
                      </p>
                    </div>

                    {/* Interactive ON/OFF Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isAutoRenewOn}
                      onClick={() => {
                        if (isAutoRenewOn) {
                          cancelVipAutoRenew();
                        } else {
                          configureVipAutoRenew({
                            enabled: true,
                            planId:
                              currentUser.autoRenewPlanId === 'annual' || currentUser.vipPlanType === 'annual'
                                ? 'annual'
                                : 'quarterly',
                            paymentMethod: 'KHQR',
                            paymentLabel: 'ABA KHQR',
                            explicitConsent: true,
                          });
                        }
                      }}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isAutoRenewOn ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                      title={
                        isAutoRenewOn
                          ? tr(language, 'ចុចដើម្បីបិទ Auto-Renewal', 'Tap to turn Auto-Renewal OFF', '点击关闭自动续费')
                          : tr(language, 'ចុចដើម្បីបើក Auto-Renewal', 'Tap to turn Auto-Renewal ON', '点击开启自动续费')
                      }
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isAutoRenewOn ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Cancel Subscription & Manual Renew Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {isAutoRenewOn && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              tr(
                                language,
                                'តើអ្នកពិតជាចង់បោះបង់ការបន្តសមាជិកភាពស្វ័យប្រវត្តិ (Cancel Subscription) មែនទេ? អត្ថប្រយោជន៍ VIP របស់អ្នកនឹងនៅតែដំណើរការរហូតដល់ថ្ងៃផុតកំណត់។',
                                'Are you sure you want to cancel your subscription auto-renewal? Your VIP benefits will remain active until the expiration date.',
                                '您确定要取消订阅自动续费吗？您的 VIP 权益在到期日之前仍然有效。'
                              )
                            )
                          ) {
                            cancelVipAutoRenew();
                          }
                        }}
                        className="flex-1 py-2.5 px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/50 text-rose-700 dark:text-rose-300 text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>
                          {tr(
                            language,
                            'បោះបង់ការជាវ (Cancel Subscription)',
                            'Cancel Subscription',
                            '取消订阅 (Cancel Subscription)'
                          )}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openUpgradeVipModal(true)}
                      className="flex-1 py-2.5 px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/60 text-amber-800 dark:text-amber-300 text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>
                        {tr(
                          language,
                          'បង់ប្រាក់បន្តដោយដៃ (Manual Renew)',
                          'Manual Renew VIP',
                          '手动续费 (Manual Renew)'
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Complete Membership & Payment History (Requirement 7) */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                      <span>
                        {tr(
                          language,
                          'ប្រវត្តិសមាជិកភាព និងការបង់ប្រាក់ពេញលេញ',
                          'Complete Membership & Payment History',
                          '完整会员与付款历史记录'
                        )}
                      </span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 font-mono font-bold">
                      {combinedPaymentHistory.length}
                    </span>
                  </div>

                  {combinedPaymentHistory.length === 0 ? (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                      {tr(
                        language,
                        'មិនទាន់មានកំណត់ត្រាប្រតិបត្តិការបង់ប្រាក់នៅឡើយទេ។',
                        'No membership payment records yet.',
                        '暂无会员付款记录。'
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {combinedPaymentHistory.slice(0, 25).map(item => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border text-[11px] space-y-1.5 ${
                            item.status === 'failed'
                              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80'
                              : item.status === 'verified'
                              ? 'bg-emerald-50/40 dark:bg-slate-900/60 border-emerald-200/80 dark:border-slate-700'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-slate-900 dark:text-white leading-snug">
                              {isKm ? item.titleKh : item.titleEn}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 ${
                                item.status === 'verified'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : item.status === 'failed'
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                  : item.status === 'pending'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {item.status === 'verified'
                                ? tr(language, '✓ ជោគជ័យ (Verified)', '✓ Verified', '✓ 已验证')
                                : item.status === 'failed'
                                ? tr(language, '✕ បរាជ័យ (Failed)', '✕ Failed', '✕ 失败')
                                : item.status === 'pending'
                                ? tr(language, '⏳ រង់ចាំពិនិត្យ (Pending)', '⏳ Pending', '⏳ 待审核')
                                : item.status === 'cancelled'
                                ? tr(language, 'បានបោះបង់ (Cancelled)', 'Cancelled', '已取消')
                                : tr(language, 'ព័ត៌មាន (Info)', 'Info', '信息')}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] border-t border-slate-200/60 dark:border-slate-700/60">
                            <div>
                              <span className="text-slate-400 block">
                                {tr(language, 'លេខប្រតិបត្តិការ (Trx ID)', 'Transaction ID', '交易单号')}
                              </span>
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-200 break-all">
                                {item.transactionRef || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">
                                {tr(language, 'ចំនួនទឹកប្រាក់', 'Amount', '付款金额')}
                              </span>
                              <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                                ${Number(item.amountUsd || 0).toFixed(2)} USD
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">
                                {tr(language, 'កាលបរិច្ឆេទ', 'Payment Date', '日期')}
                              </span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">
                                {item.date ? item.date.replace('T', ' ').slice(0, 16) : '—'}
                              </span>
                            </div>
                          </div>

                          {item.status === 'failed' && (item.noteKh || item.noteEn) && (
                            <div className="text-[10px] text-rose-700 dark:text-rose-300 font-medium pt-0.5">
                              {isKm ? item.noteKh : item.noteEn}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Support & Payment Assistance inside Membership Section */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {tr(language, 'សារជំនួយ & បញ្ហាការបង់ប្រាក់ VIP', 'VIP Payment Support & Tickets', 'VIP 付款客服与工单')}
                      </span>
                      {unreadAdminReplies > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black shrink-0">
                          {unreadAdminReplies}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openSupportTicketModal()}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{tr(language, 'ទាក់ទងរដ្ឋបាល', 'Contact Admin', '联系管理员')}</span>
                    </button>
                  </div>

                  {mySupportTickets.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {mySupportTickets.slice(0, 3).map(ticket => {
                        const latestMsg = ticket.messages[ticket.messages.length - 1];
                        return (
                          <div
                            key={ticket.id}
                            onClick={() => openSupportTicketModal()}
                            className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-slate-900/70 border border-amber-200 dark:border-slate-700 hover:border-amber-400 cursor-pointer transition space-y-0.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-extrabold text-slate-900 dark:text-white">
                                #{ticket.id} • {ticket.paymentPlanLabel}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                                {ticket.status === 'resolved'
                                  ? tr(language, '✓ បានដោះស្រាយ', '✓ Resolved', '✓ 已解决')
                                  : ticket.status === 'replied'
                                  ? tr(language, '💬 រដ្ឋបាលបានឆ្លើយតប', '💬 Replied', '💬 已回复')
                                  : tr(language, '⏳ រង់ចាំពិនិត្យ', '⏳ Pending', '⏳ 待处理')}
                              </span>
                            </div>
                            {latestMsg && (
                              <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
                                {latestMsg.message}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Dynamic Benefits Check-list */}
          <div className="space-y-2">
            <h5 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>
                {tr(
                  language,
                  `អត្ថប្រយោជន៍ទាំង ${dynamicBenefits.length} យ៉ាងនៃសមាជិក VIP៖`,
                  `All ${dynamicBenefits.length} VIP Member Benefits:`,
                  `VIP 会员全部 ${dynamicBenefits.length} 项专属特权：`
                )}
              </span>
            </h5>

            <div className="space-y-2">
              {dynamicBenefits.map((b, idx) => (
                <div 
                  key={b.id || idx}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-2xs flex items-start gap-2.5"
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-mono ${
                    isVip 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {isKm ? b.titleKh : b.titleEn}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                        isVip ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isVip
                          ? tr(language, '✓ សកម្ម', '✓ Active', '✓ 已开启')
                          : tr(language, 'សម្រាប់ VIP', 'VIP Only', 'VIP 专享')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {isKm ? b.descKh : b.descEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Wishlists (បញ្ជីកន្លែងដែលចង់ទៅ - Consumer Users Only) */}
      {!isAdmin && activeSubTab === 'wishlists' && (
        <div className="space-y-3 font-khmer">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-[#0F172A] dark:text-white">
              {isKm ? `បញ្ជីផ្ទាល់ខ្លួនសរុប (${wishlists.length})` : `My Wishlists (${wishlists.length})`}
            </h4>
            <button
              data-testid="profile-open-wishlists-modal"
              onClick={() => setIsWishlistsModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#064E3B] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#047857] transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isKm ? 'គ្រប់គ្រងបញ្ជី' : 'Manage Lists'}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {wishlists.map(w => (
              <div
                key={w.id}
                onClick={() => setIsWishlistsModalOpen(true)}
                className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-500 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{w.emoji}</span>
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-white">
                      {isKm ? w.nameKh : w.nameEn}
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      {isKm ? `${w.items.length} ទីតាំង / មុខម្ហូបក្នុងបញ្ជី` : `${w.items.length} items`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: AI Trip Plans (ផែនការដើរលេង AI - Consumer Users Only) */}
      {!isAdmin && activeSubTab === 'tripplans' && (
        <div className="space-y-3 font-khmer">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-[#0F172A] dark:text-white">
              {isKm ? `ផែនការដើរលេងដែលបានរក្សាទុក (${tripPlans.length})` : `Saved AI Trip Plans (${tripPlans.length})`}
            </h4>
            <button
              onClick={() => setIsAiTripPlannerModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#064E3B] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#047857] transition"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{isKm ? '+ បង្កើតថ្មី' : '+ New Plan'}</span>
            </button>
          </div>

          {tripPlans.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-3 shadow-xs">
              <Compass className="w-10 h-10 mx-auto text-[#059669]" />
              <div>
                <h4 className="font-bold text-xs text-[#0F172A] dark:text-white">
                  {isKm ? 'មិនទាន់មានផែនការដើរលេងនៅឡើយទេ' : 'No saved trip plans yet'}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isKm ? 'ឱ្យ AI រៀបចំកាលវិភាគ ហាងញ៉ាំអាហារ និងកន្លែងដើរលេងដោយស្វ័យប្រវត្តិតាមថវិកា!' : 'Let AI automate your itinerary and food spots!'}
                </p>
              </div>
              <button
                onClick={() => setIsAiTripPlannerModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#064E3B] text-white font-bold text-xs shadow-xs hover:bg-[#047857] transition"
              >
                {isKm ? 'បង្កើតផែនការដើរលេងឥឡូវនេះ' : 'Generate AI Plan'}
              </button>
            </div>
          ) : (
            tripPlans.map(plan => (
              <div
                key={plan.id}
                className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#064E3B] text-[10px] font-bold">
                    📍 {plan.provinceKh}
                  </span>
                  <button
                    onClick={() => deleteTripPlan(plan.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded-lg"
                    title={isKm ? 'លុប' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F172A] dark:text-white">
                    {plan.durationDays} ថ្ងៃ • {plan.companion}
                  </span>
                  <span className="font-mono text-emerald-600 font-bold">
                    ~${plan.totalEstimatedCostUsd} USD
                  </span>
                </div>

                <button
                  onClick={() => setIsAiTripPlannerModalOpen(true)}
                  className="w-full py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition"
                >
                  {isKm ? 'មើលកាលវិភាគលម្អិត' : 'View Full Schedule'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Bookmarks (Consumer Users Only) */}
      {!isAdmin && activeSubTab === 'bookmarks' && (
        <div className="space-y-4">
          {savedFoods.length === 0 && savedDestinations.length === 0 && savedRestaurants.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs space-y-1 font-khmer">
              <Heart className="w-8 h-8 mx-auto text-slate-300" />
              <p>{isKm ? 'មិនទាន់មានមុខម្ហូប ឬកន្លែងកម្សាន្តដែលបានរក្សាទុកនៅឡើយទេ' : 'No saved items yet'}</p>
            </div>
          ) : (
            <>
              {savedFoods.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-[#0F172A] dark:text-white font-khmer">
                    {isKm ? 'មុខម្ហូបដែលបានរក្សាទុក' : 'Saved Recipes'}
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {savedFoods.map(f => <FoodCard key={f.id} food={f} />)}
                  </div>
                </div>
              )}

              {savedDestinations.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-xs text-[#0F172A] dark:text-white font-khmer">
                    {isKm ? 'តំបន់ទេសចរណ៍ដែលបានរក្សាទុក' : 'Saved Travel Spots'}
                  </h4>
                  <div className="space-y-3">
                    {savedDestinations.map(d => <TouristCard key={d.id} destination={d} />)}
                  </div>
                </div>
              )}

              {savedRestaurants.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-xs text-[#0F172A] dark:text-white font-khmer">
                    {isKm ? 'ហាងដែលបានរក្សាទុក' : language === 'zh' ? '收藏的餐厅' : 'Saved Restaurants'}
                  </h4>
                  <div className="space-y-3">
                    {savedRestaurants.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Settings (Always visible for Admin as System & General Preferences Card, or when Settings tab selected) */}
      {(isAdmin || activeSubTab === 'settings') && (
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700 space-y-3.5 text-xs font-khmer shadow-xs">
          {isAdmin && (
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-[#064E3B] dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {tr(language, 'ការកំណត់ប្រព័ន្ធទូទៅ & សុវត្ថិភាពទិន្នន័យ', 'General System Preferences & Data Safety', '系统通用偏好与数据安全')}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {tr(language, 'ភាសា ការជូនដំណឹង គោលការណ៍ឯកជនភាព និងការគ្រប់គ្រងទិន្នន័យមូលដ្ឋាន', 'Language, notifications, privacy policy, and local database maintenance', '语言、通知、隐私政策及本地数据库维护')}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-bold">
                SYSTEM PREFS
              </span>
            </div>
          )}

          {/* Language Switch */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="font-medium text-[#0F172A] dark:text-slate-200 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#059669]" />
              {tr(language, 'ភាសាកម្មវិធី', 'App Language', '应用语言')}
            </span>
            <div className="flex items-center gap-1">
              {(['km', 'en', 'zh'] as const).map((langOpt) => (
                <button
                  key={langOpt}
                  type="button"
                  onClick={() => setLanguage(langOpt)}
                  className={`px-2.5 py-1 rounded-xl font-bold text-[11px] border transition cursor-pointer ${
                    language === langOpt
                      ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-[#0F172A] dark:text-slate-200 border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {langOpt === 'km' ? 'ខ្មែរ' : langOpt === 'en' ? 'EN' : '中文'}
                </button>
              ))}
            </div>
          </div>

          {/* Support & Feedback Contact Email (Moved from Header into Settings) */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-slate-700/60 border border-emerald-200 dark:border-slate-600 space-y-2.5 my-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#064E3B] text-emerald-200 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {tr(language, 'ជំនួយបច្ចេកទេស & មតិកែលម្អ', 'Support & Feedback Contact', '技术支持与意见反馈')}
                  </div>
                  <a
                    href="mailto:kftcam@gmail.com"
                    className="font-mono text-xs font-bold text-[#059669] dark:text-emerald-400 underline truncate block"
                  >
                    kftcam@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText('kftcam@gmail.com').then(() => {
                        showToast(
                          tr(language, 'បានចម្លងអ៊ីមែលជោគជ័យ!', 'Email copied to clipboard!', '邮箱地址已复制！'),
                          'success'
                        );
                      }).catch(() => {});
                    } else {
                      showToast(
                        tr(language, 'បានចម្លងអ៊ីមែលជោគជ័យ!', 'Email copied to clipboard!', '邮箱地址已复制！'),
                        'success'
                      );
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-100 text-[#064E3B] dark:text-emerald-300 font-bold text-[11px] border border-emerald-300 dark:border-slate-600 flex items-center gap-1 transition cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{tr(language, 'ចម្លង', 'Copy', '复制')}</span>
                </button>
                <a
                  href="mailto:kftcam@gmail.com"
                  className="px-2.5 py-1.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-[11px] flex items-center gap-1 transition"
                >
                  <Mail className="w-3 h-3" />
                  <span>{tr(language, 'ផ្ញើអ៊ីមែល', 'Email', '发邮件')}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Helpful Notifications Toggle */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <div>
              <span className="font-medium text-[#0F172A] dark:text-slate-200 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#059669]" />
                {tr(language, 'ការជូនដំណឹង', 'Notifications', '消息通知')}
              </span>
              <p className="text-[10px] text-slate-500 pl-6">
                {tr(language, 'ទទួលដំណឹងអំពីមុខម្ហូប កន្លែងថ្មីៗ និងការផ្តល់ជូនពិសេស', 'Updates on new dishes, places, and special offers', '获取新菜品、热门地点与优惠提醒')}
              </p>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                notificationsEnabled ? 'bg-[#064E3B]' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Privacy Policy & Data Safety */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="font-medium text-[#0F172A] dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              {isKm ? 'គោលការណ៍ឯកជនភាព & សុវត្ថិភាព' : 'Privacy Policy & Data Safety'}
            </span>
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-[#0F172A] dark:text-slate-200 font-bold hover:bg-slate-200 transition border border-slate-200 dark:border-slate-600"
            >
              {isKm ? 'មើល' : 'View'}
            </button>
          </div>

          {/* Check for App Updates */}
          <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <div className="min-w-0 flex-1">
              <span className="font-medium text-[#0F172A] dark:text-slate-200 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#059669] shrink-0" />
                {tr(language, 'ពិនិត្យកំណែអាប់ដេតកម្មវិធី', 'Check for App Updates', '检查应用更新')}
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-6 mt-0.5 leading-relaxed">
                {tr(
                  language,
                  `កំណែបច្ចុប្បន្ន៖ ${APP_VERSION} • Build ${APP_BUILD_CODE} (ជូនដំណឹងស្វ័យប្រវត្តិពេលមានកំណែថ្មី)`,
                  `Current: ${APP_VERSION} • Build ${APP_BUILD_CODE} (auto-alerts when a new update is ready)`,
                  `当前版本：${APP_VERSION} • Build ${APP_BUILD_CODE}（有新版本时自动提醒更新）`
                )}
              </p>
            </div>
            <button
              onClick={() => requestManualUpdateCheck()}
              className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#064E3B] dark:text-emerald-300 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition border border-emerald-200 dark:border-emerald-800 cursor-pointer shrink-0"
            >
              {tr(language, 'ពិនិត្យ', 'Check', '检查')}
            </button>
          </div>

          {/* Reset App Data */}
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0 flex-1">
              <span className="font-medium text-[#0F172A] dark:text-slate-200 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-slate-500 shrink-0" />
                {tr(language, 'កំណត់ទិន្នន័យឡើងវិញ', 'Reset App Data', '重置应用数据')}
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-6 mt-0.5 leading-relaxed">
                {tr(
                  language,
                  'សម្អាតបញ្ជីចំណូលចិត្ត (❤️) ផែនការដើរលេង និងតម្រងស្វែងរកលើទូរស័ព្ទ (មិនប៉ះពាល់គណនី VIP ឬទិន្នន័យម្ហូបឡើយ)',
                  'Clears saved favorites (❤️), trip plans & search filters on this device (keeps your VIP account & app data safe)',
                  '清除本机收藏列表 (❤️)、行程计划与搜索筛选（不影响 VIP 账户及应用数据）'
                )}
              </p>
            </div>
            <button
              onClick={() => {
                const confirmMsg = tr(
                  language,
                  'តើអ្នកចង់កំណត់ទិន្នន័យលើទូរស័ព្ទឡើងវិញមែនទេ?\n\n• សម្អាតបញ្ជីចំណូលចិត្ត (❤️) ឱ្យទៅជា 0\n• សម្អាតផែនការដើរលេងបណ្ដោះអាសន្ន\n• កំណត់ពាក្យស្វែងរក និងតម្រងខេត្តទៅ «ទាំងអស់»\n\n(គណនី VIP និងទិន្នន័យម្ហូបអាហារទាំងអស់ត្រូវបានរក្សាទុកដដែល)',
                  'Reset local app preferences?\n\n• Clear saved Favorites (❤️)\n• Clear temporary saved trip plans\n• Reset search & province filter to All\n\n(Your VIP account and food/tourism data remain safe)',
                  '确定重置本机偏好设置吗？\n\n• 清空收藏列表 (❤️)\n• 清空临时保存的行程计划\n• 重置搜索词与省份筛选为“全部”\n\n（您的 VIP 账户及所有美食旅游数据将完整保留）'
                );
                if (window.confirm(confirmMsg)) {
                  resetAllData();
                }
              }}
              className="px-3 py-1 rounded-xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 cursor-pointer shrink-0"
            >
              {tr(language, 'កំណត់ឡើងវិញ', 'Reset', '重置')}
            </button>
          </div>
        </div>
      )}

      </div>

      {/* Clean App Version Footer (Discreet 5-tap within 3s opens Admin Login privately — zero visible Admin button to users) */}
      <div className="pt-2 pb-1 text-center font-khmer">
        <span
          onClick={handleVersionFooterTap}
          className="inline-block px-3 py-1 font-mono text-[10px] text-slate-400 dark:text-slate-500 select-none"
        >
          Cambodia Flavors & Tourism {APP_VERSION} • Build {APP_BUILD_CODE}
        </span>
      </div>

      {/* Avatar Action Sheet Modal */}
      {isAvatarActionSheetOpen && currentUser && (
        <div
          className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in font-khmer select-none"
          onClick={() => setIsAvatarActionSheetOpen(false)}
        >
          <div
            className="w-full sm:max-w-xs bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {tr(language, 'ជម្រើសរូបភាពប្រូហ្វាល់', 'Profile Photo Options', '头像选项')}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tr(language, 'ជ្រើសរើសសកម្មភាពសម្រាប់រូបភាពរបស់អ្នក', 'Choose an action for your avatar', '请选择头像操作')}
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleOpenCurrentAvatarEditor}
                className="w-full py-2.5 px-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/40 font-bold text-xs flex items-center gap-2.5 transition cursor-pointer"
              >
                <RotateCw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="flex-1 text-left">
                  {tr(language, '🔄 បង្វិល 90° & កែតម្រង់រូបនេះ', 'Rotate 90° & Adjust Photo', '旋转 90° 并调整当前头像')}
                </span>
              </button>

              <button
                type="button"
                onClick={handleTriggerAvatarPicker}
                className="w-full py-2.5 px-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-400/40 font-bold text-xs flex items-center gap-2.5 transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="flex-1 text-left">
                  {tr(language, '📷 ជ្រើសរូបថ្មីពី រូបភាពរបស់ខ្ញុំ', '📷 រូបភាពរបស់ខ្ញុំ', '📷 រូបភាពរបស់ខ្ញុំ')}
                </span>
              </button>

              <button
                type="button"
                onClick={handleResetToDefaultAvatar}
                className="w-full py-2.5 px-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-400/30 font-bold text-xs flex items-center gap-2.5 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="flex-1 text-left">
                  {tr(language, '🗑️ ប្រើរូបតំណាងដើម (Reset)', 'Use Default Avatar', '恢复默认头像')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsAvatarActionSheetOpen(false)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs text-center transition cursor-pointer mt-1"
              >
                {tr(language, 'បោះបង់', 'Cancel', '取消')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Crop & Rotate Modal */}
      <AvatarEditorModal
        isOpen={isAvatarEditorOpen}
        onClose={() => {
          setIsAvatarEditorOpen(false);
          setAvatarEditorSourceUrl('');
        }}
        initialImageUrl={avatarEditorSourceUrl}
        onSave={handleSaveAvatarFromEditor}
        onPickNewImage={() => {
          setIsAvatarEditorOpen(false);
          setTimeout(() => handleTriggerAvatarPicker(), 150);
        }}
        language={language}
        isVip={isVip}
        isAdmin={isAdmin}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal 
        isOpen={isPrivacyModalOpen} 
        onClose={() => setIsPrivacyModalOpen(false)} 
      />
    </div>
  );
};

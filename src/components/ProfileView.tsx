import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { RestaurantCard } from './RestaurantCard';
import { FoodPassportCard } from './FoodPassportCard';
import { TouristCard } from './TouristCard';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { 
  User as UserIcon, Heart, Shield, Store, 
  Globe, LogOut, RefreshCw, Download, Sparkles, UtensilsCrossed, ShieldCheck, CheckCircle2,
  Bot, Bell, Compass, Calendar, Bookmark, Plus, MapPin, Trash2, Share2, Tag, Utensils, ChevronRight, ChevronLeft,
  Edit2, Check, X as CloseIcon, Crown, Star, Zap, Award, Smartphone, Copy, ExternalLink, Clock, Lock, MessageSquare, Mail
} from 'lucide-react';
import {
  isRestaurantPremiumActive, isUserVipActive, getVipAccountState, getVipRemainingDays,
  APP_VERSION, APP_BUILD_CODE, getDynamicVipPlans, getDynamicVipBenefits,
  isAdminAccount, getVipFeaturedRotationConfig, getVipFeaturedRotationState
} from '../types';
import { tr } from '../utils/i18n';

export const ProfileView: React.FC = () => {
  const { 
    currentUser, users, login, logout, language, setLanguage, 
    bookmarks, foods, destinations, posts, restaurants,
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

  const [activeSubTab, setActiveSubTab] = useState<'bookmarks' | 'wishlists' | 'tripplans' | 'myposts' | 'settings' | 'myrestaurant' | 'membership'>(
    isAdmin ? 'settings' : (isOwner ? 'myrestaurant' : (isVip ? 'wishlists' : 'bookmarks'))
  );

  useEffect(() => {
    if (isAdmin && activeSubTab !== 'settings') {
      setActiveSubTab('settings');
    } else if (!isVip && !isAdmin && (activeSubTab === 'wishlists' || activeSubTab === 'tripplans')) {
      setActiveSubTab('bookmarks');
    }
  }, [isAdmin, isVip, activeSubTab]);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // Horizontal tabs scroll navigation state
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkTabsScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
    }
  };

  const scrollTabs = (offset: number) => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkTabsScroll, 250);
    }
  };

  useEffect(() => {
    checkTabsScroll();
    window.addEventListener('resize', checkTabsScroll);
    return () => window.removeEventListener('resize', checkTabsScroll);
  }, []);

  // Bookmarked items
  const savedFoods = foods.filter(f => bookmarks.includes(f.id));
  const savedDestinations = destinations.filter(d => bookmarks.includes(d.id));
  const savedRestaurants = restaurants.filter(r => bookmarks.includes(r.id));

  // User posts
  const myPosts = posts.filter(p => currentUser && p.authorId === currentUser.id);

  // Owner restaurants (sorted newest/active first via getOwnedRestaurantsForUser)
  const myRestaurants = getOwnedRestaurantsForUser(currentUser);

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-24">
      {/* User Header Profile Card */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-xs">
        {currentUser ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className={`w-16 h-16 sm:w-22 sm:h-22 ${
    isAdmin 
      ? 'rounded-full ring-4 ring-emerald-400/40 border-2 border-[#059669]' 
      : isVip 
      ? 'rounded-2xl ring-4 ring-amber-400/50 border-2 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] bg-white' 
      : 'rounded-2xl ring-4 ring-emerald-500/20 border-2 border-[#059669]'
  } object-cover shadow-md shrink-0`}
                />
                <div className="flex-1 min-w-0">
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
                      <h2 className="font-moul text-lg sm:text-2xl text-slate-900 dark:text-white leading-snug tracking-wide break-words">
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
                        <span>{tr(language, '👑 សមាជិក VIP', '👑 VIP MEMBER', '👑 VIP 尊享会员')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 shadow-2xs font-khmer">
                        <span>{tr(language, 'គណនីឥតគិតថ្លៃ', 'Free User', '免费账户')}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs font-khmer">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{tr(language, 'គណនីបានផ្ទៀងផ្ទាត់ ✓', 'Verified Account ✓', '已认证账户 ✓')}</span>
                    </span>
                    {!isAdmin && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-khmer ${
                        currentUser.role === 'owner' 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border border-slate-300'
                      }`}>
                        {currentUser.role === 'owner'
                          ? tr(language, '🏪 ម្ចាស់ហាង', '🏪 Store Owner', '🏪 店主')
                          : tr(language, '👤 អ្នកប្រើប្រាស់', '👤 Member', '👤 普通用户')}
                      </span>
                    )}
                  </div>

                  {isAdmin ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold font-khmer mt-1">
                      {tr(language, 'គណនីរដ្ឋបាលប្រព័ន្ធផ្លូវការ • Enterprise Control Center', 'Official System Administrator • Enterprise Control Center', '官方系统管理员 • 企业控制中心')}
                    </p>
                  ) : (
                    <div className="mt-1 space-y-1">
                      {currentUser.phone && (
                        <p className="text-xs sm:text-sm text-[#059669] font-mono font-bold flex items-center gap-1.5">
                          <span>📞</span> <span>{currentUser.phone}</span>
                        </p>
                      )}
                      {currentUser.email && !currentUser.email.endsWith('@phone.kh') && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-mono flex items-center gap-1.5">
                          <span>✉️</span> <span>{currentUser.email}</span>
                        </p>
                      )}
                      {isVip && currentUser.subscriptionExpiryDate && (
                        <div className={`mt-1.5 p-2 rounded-xl border text-[11px] font-khmer flex items-center justify-between gap-2 ${
                          remainingDays <= 3
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
                            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200'
                        }`}>
                          <div>
                            <p className="font-bold">
                              📅 {tr(language, 'ថ្ងៃផុតកំណត់ VIP៖', 'VIP Expiration Date:', 'VIP 到期日期：')}{' '}
                              <span className="font-mono underline">{currentUser.subscriptionExpiryDate.split('T')[0]}</span>
                            </p>
                            <p className="font-extrabold mt-0.5">
                              ⏳ {tr(language, `រយៈពេលនៅសល់៖ ${remainingDays} ថ្ងៃទៀត`, `Remaining Time: ${remainingDays} day(s) left`, `剩余时间：${remainingDays} 天`)}
                              {remainingDays <= 3 && tr(language, ' (ជិតផុតកំណត់!)', ' (Expiring Soon!)', '（即将到期！）')}
                            </p>
                          </div>
                          {remainingDays <= 3 && (
                            <button
                              onClick={() => openUpgradeVipModal(true)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] shrink-0 cursor-pointer"
                            >
                              {tr(language, 'បន្ត VIP', 'Renew', '续费')}
                            </button>
                          )}
                        </div>
                      )}
                      {!isVip && getVipAccountState(currentUser) === 'expired_vip' && (
                        <div className="mt-1.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-[11px] font-khmer flex items-center justify-between gap-2 text-rose-700 dark:text-rose-300">
                          <span>
                            ⚠️ {tr(language, `ផុតកំណត់ VIP (${currentUser.subscriptionExpiryDate?.split('T')[0] || ''}) — គណនីធម្មតា`, `VIP Expired (${currentUser.subscriptionExpiryDate?.split('T')[0] || 'Expired'}) — Normal Account`, `VIP 已过期（${currentUser.subscriptionExpiryDate?.split('T')[0] || ''}）— 普通账户`)}
                          </span>
                          <button
                            onClick={() => openUpgradeVipModal(true)}
                            className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] shrink-0 cursor-pointer"
                          >
                            {tr(language, 'បន្ត VIP', 'Renew', '续费')}
                          </button>
                        </div>
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
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                title={tr(language, 'ចាកចេញពីគណនី', 'Sign Out of Account', '退出登录')}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{tr(language, 'ចាកចេញ', 'Log Out', '退出')}</span>
              </button>
            </div>

            {currentUser.bio && (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-khmer">
                {currentUser.bio}
              </p>
            )}

            {/* Admin shortcut under bio removed: single Admin entry is the Admin panel below */}
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
                {tr(language, 'ដើម្បីរក្សាទុកម្ហូប ចែករំលែក និងចុះបញ្ជីហាង', 'To save recipes, share posts & manage shops', '登录以收藏食谱、分享动态并管理店铺')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs sm:text-sm shadow-xs font-khmer transition cursor-pointer"
              >
                {tr(language, 'ចូលគណនី / ចុះឈ្មោះ', 'Sign In / Register', '登录 / 注册')}
              </button>
              <button
                type="button"
                onClick={() => setIsAdminLoginModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 font-khmer transition cursor-pointer"
              >
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{tr(language, 'ច្រកចូលរដ្ឋបាល (Admin)', 'Admin Login', '管理员登录')}</span>
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

            {/* Key Administrative Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={() => { (window as any).__kft_admin_tab = 'users'; setIsAdminOpen(true); }}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition cursor-pointer"
              >
                <div className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">
                  {tr(language, 'អ្នកប្រើប្រាស់', 'Users & VIP', '用户与 VIP')}
                </div>
                <div className="text-lg font-black text-white font-mono mt-0.5">{users.length}</div>
                <div className="text-[10px] text-amber-300 font-bold mt-0.5">
                  {users.filter(u => isUserVipActive(u)).length} {tr(language, 'គណនី VIP សកម្ម', 'Active VIPs', '活跃 VIP')}
                </div>
              </button>

              <button
                type="button"
                onClick={() => { (window as any).__kft_admin_tab = 'restaurants'; setIsAdminOpen(true); }}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition cursor-pointer"
              >
                <div className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">
                  {tr(language, 'គ្រប់គ្រងហាង', 'Shops', '店铺管理')}
                </div>
                <div className="text-lg font-black text-white font-mono mt-0.5">{restaurants.length}</div>
                <div className="text-[10px] text-emerald-300 font-bold mt-0.5">
                  {rotationState.eligibleQueue.length} {tr(language, 'ហាង VIP ក្នុងប្រព័ន្ធបង្វិល', 'In VIP Rotation', '参与轮播')}
                </div>
              </button>

              <button
                type="button"
                onClick={() => { (window as any).__kft_admin_tab = 'payments'; setIsAdminOpen(true); }}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition cursor-pointer"
              >
                <div className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">
                  {tr(language, 'ការទូទាត់ & សំបុត្រ', 'Approvals', '付款与工单')}
                </div>
                <div className="text-lg font-black text-white font-mono mt-0.5">
                  {transactions.filter(t => t.status === 'pending_verification').length + supportTickets.filter(t => t.status === 'pending' || t.unreadByAdmin).length}
                </div>
                <div className="text-[10px] text-amber-200 font-bold mt-0.5">
                  {tr(language, 'រង់ចាំពិនិត្យ', 'Pending Review', '待审核')}
                </div>
              </button>

              <button
                type="button"
                onClick={() => { (window as any).__kft_admin_tab = 'food'; setIsAdminOpen(true); }}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition cursor-pointer"
              >
                <div className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">
                  {tr(language, 'មាតិកាប្រព័ន្ធ', 'Catalog', '系统内容')}
                </div>
                <div className="text-lg font-black text-white font-mono mt-0.5">{foods.length + destinations.length}</div>
                <div className="text-[10px] text-emerald-200 font-bold mt-0.5">
                  {foods.length} {tr(language, 'ម្ហូប', 'Dishes', '菜品')} • {destinations.length} {tr(language, 'ទេសចរណ៍', 'Places', '景点')}
                </div>
              </button>
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
      ) : isVip ? (
        /* SUPER POTENTIAL VIP ACCOUNT DASHBOARD */
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
                    🌟 PREMIUM VIP (សកម្ម)
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 font-bold mt-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {isKm 
                      ? `សុពលភាពសល់ ${remainingDays} ថ្ងៃ (ដល់ថ្ងៃ ${currentUser?.subscriptionExpiryDate ? currentUser.subscriptionExpiryDate.split('T')[0] : ''})` 
                      : `Expires: ${currentUser?.subscriptionExpiryDate ? currentUser.subscriptionExpiryDate.split('T')[0] : ''} (${remainingDays} days left)`}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={() => openUpgradeVipModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition shrink-0 active:scale-95 cursor-pointer"
            >
              {isKm ? '🔄 បន្ត VIP' : 'Renew VIP'}
            </button>
          </div>

          {/* Super Potential Privileges Showcase */}
          <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-2xl border border-amber-400/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{isKm ? '⚡ សក្តានុពលគណនី VIP (Super Potential Account):' : '⚡ Super Potential Account Powers:'}</span>
              </span>
              <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                10/10 UNLOCKED
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
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">{isKm ? '✓ អាទិភាពបង្ហាញមុខគេ 10x' : '✓ 10x Priority Active'}</div>
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
                    (window as any).__kft_manage_initial_tab = 'info';
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
                  <div className="font-bold text-slate-900 dark:text-white truncate">{isKm ? 'រូបថត HD ឥតកំណត់' : 'Unlimited HD Photos'}</div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">{isKm ? '✓ ចុចបន្ថែមរូបថត & ម្ហូប ២០មុខ' : '✓ Tap to upload HD photos'}</div>
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
                  <div className="font-bold text-slate-900 dark:text-white truncate">{isKm ? 'Food Video Reels' : 'Video Promotion'}</div>
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
                      {myRestaurants[0]?.analytics?.views || 128}
                    </div>
                    <div className="text-[9px] text-slate-300">{isKm ? 'អ្នកចូលមើល' : 'Views'}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10 border border-white/10">
                    <div className="text-sm font-black font-mono text-emerald-300">
                      {myRestaurants[0]?.analytics?.phoneClicks || 24}
                    </div>
                    <div className="text-[9px] text-slate-300">{isKm ? 'ចុចខល' : 'Calls'}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10 border border-white/10">
                    <div className="text-sm font-black font-mono text-sky-300">
                      {myRestaurants[0]?.analytics?.mapClicks || 37}
                    </div>
                    <div className="text-[9px] text-slate-300">{isKm ? 'ចុចផែនទី' : 'Maps'}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10 border border-white/10">
                    <div className="text-sm font-black font-mono text-purple-300">
                      {myRestaurants[0]?.analytics?.shareClicks || 19}
                    </div>
                    <div className="text-[9px] text-slate-300">{isKm ? 'ចែករំលែក' : 'Shares'}</div>
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-[11px] text-amber-100 leading-relaxed font-khmer">
                    {isKm
                      ? '✨ ចុះបញ្ជីហាងមុន ហាងរបស់លោកអ្នកនឹងបង្ហាញមុនគេតាមលំដាប់លេខរៀង ដើម្បីងាយស្រួលឱ្យអតិថិជនស្វែងរក និងតាមដានស្ថិតិហាង។'
                      : '✨ Register your restaurant early so it appears first in chronological order, making it easy for customers to find and track store analytics.'}
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
                      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-70 blur-xs vip-glow-btn pointer-events-none" />
                      <div className="absolute top-1 left-2 w-2 h-2 rounded-full bg-yellow-200 shadow-sm shadow-amber-300 vip-sparkle-dot pointer-events-none" />
                      <div className="absolute top-1 right-2 w-2 h-2 rounded-full bg-yellow-200 shadow-sm shadow-amber-300 vip-sparkle-dot pointer-events-none" style={{ animationDelay: '0.9s' }} />
                      <div className="absolute bottom-1 left-4 w-1.5 h-1.5 rounded-full bg-amber-200 shadow-sm shadow-amber-300 vip-sparkle-dot pointer-events-none" style={{ animationDelay: '0.4s' }} />
                      <div className="absolute bottom-1 right-4 w-1.5 h-1.5 rounded-full bg-amber-200 shadow-sm shadow-amber-300 vip-sparkle-dot pointer-events-none" style={{ animationDelay: '1.3s' }} />

                      <button
                        type="button"
                        onClick={() => setIsVipAddRestaurantModalOpen(true)}
                        className="relative w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm border-2 border-white/90 vip-glow-btn flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-lg"
                      >
                        <Crown className="w-4 h-4 fill-slate-950 shrink-0" />
                        <span>{isKm ? '+ ចុះបញ្ជីហាង VIP របស់អ្នក' : '+ Register Your VIP Restaurant'}</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-900 shrink-0" />
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
                    ? 'ចុះបញ្ជីហាងមុន ហាងរបស់លោកអ្នកនឹងបង្ហាញមុនគេតាមលំដាប់លេខរៀង ដើម្បីងាយស្រួលឱ្យអតិថិជនស្វែងរក និងតាមដានស្ថិតិហាង។'
                    : 'Register your restaurant early so it appears first in chronological order, making it easy for customers to find and track store analytics.'}
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
                    {/* Softly blinking glowing lights around border */}
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-70 blur-xs vip-glow-btn pointer-events-none" />
                    <div className="absolute top-1 left-2 w-2 h-2 rounded-full bg-yellow-200 shadow-sm shadow-amber-300 vip-sparkle-dot pointer-events-none" />
                    <div className="absolute top-1 right-2 w-2 h-2 rounded-full bg-yellow-200 shadow-sm shadow-amber-300 vip-sparkle-dot pointer-events-none" style={{ animationDelay: '0.9s' }} />
                    <div className="absolute bottom-1 left-4 w-1.5 h-1.5 rounded-full bg-amber-200 shadow-sm shadow-amber-300 vip-sparkle-dot pointer-events-none" style={{ animationDelay: '0.4s' }} />
                    <div className="absolute bottom-1 right-4 w-1.5 h-1.5 rounded-full bg-amber-200 shadow-sm shadow-amber-300 vip-sparkle-dot pointer-events-none" style={{ animationDelay: '1.3s' }} />

                    <button
                      type="button"
                      onClick={() => setIsVipAddRestaurantModalOpen(true)}
                      className="relative w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm border-2 border-white/90 vip-glow-btn flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-lg"
                    >
                      <Crown className="w-4 h-4 fill-slate-950 shrink-0" />
                      <span>{isKm ? '+ ចុះបញ្ជីហាង VIP របស់អ្នក (1 ហាង)' : '+ Register Your VIP Restaurant (1 Store)'}</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-900 shrink-0" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : currentUser?.subscriptionStatus === 'pending' ? (
        /* PENDING ADMIN CONFIRMATION CARD */
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-600/15 border border-amber-400/50 shadow-xs transition font-khmer">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl shrink-0 bg-amber-400 text-slate-900 shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-khmer">
                    {isKm ? 'ស្ថានភាពសមាជិកភាព៖' : 'Membership:'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    {isKm ? '⏳ រង់ចាំការអនុម័តពីរដ្ឋបាល (Pending)' : '⏳ Pending Admin Approval'}
                  </span>
                </div>
                
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 font-khmer truncate">
                  {isKm 
                    ? 'សំណើដំឡើង VIP ត្រូវបានបញ្ជូន។ រដ្ឋបាលកំពុងត្រួតពិនិត្យ និងអនុម័ត...' 
                    : 'VIP upgrade request submitted. Administrator is reviewing your payment...'}
                </p>
              </div>
            </div>

            <button
              onClick={openUpgradeVipModal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold font-khmer shadow-xs transition shrink-0 active:scale-95 bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isKm ? 'មើលស្ថានភាព' : 'View Status'}
            </button>
          </div>
        </div>
      ) : currentUser?.subscriptionStatus === 'expired' ? (
        /* EXPIRED VIP CARD */
        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 shadow-xs transition font-khmer">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl shrink-0 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
                <Crown className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-khmer">
                    {isKm ? 'ស្ថានភាពសមាជិកភាព៖' : 'Membership:'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                    {isKm ? '❌ ផុតកំណត់ (Expired)' : 'Expired'}
                  </span>
                </div>
                
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 font-khmer truncate">
                  {isKm ? 'សមាជិកភាព VIP របស់អ្នកបានផុតកំណត់ហើយ។ សូមបន្តឡើងវិញដើម្បីទទួលអត្ថប្រយោជន៍។' : 'Your VIP membership has expired. Renew to regain all 10 benefits.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => openUpgradeVipModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold font-khmer shadow-xs transition shrink-0 active:scale-95 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white cursor-pointer"
            >
              {isKm ? '🔄 បន្ត VIP' : 'Renew VIP'}
            </button>
          </div>
        </div>
      ) : (
        /* STANDARD FREE USER UPGRADE CARD */
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/20 via-slate-900/10 to-amber-950/20 border border-slate-200 dark:border-slate-700 shadow-xs transition font-khmer">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                <Crown className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-khmer">
                    {isKm ? 'ស្ថានភាពសមាជិកភាព៖' : 'Membership:'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {isKm ? 'គណនីឥតគិតថ្លៃ (Free User)' : 'Free User'}
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-khmer truncate">
                  {isKm 
                    ? `ដំឡើងទៅជា Premium VIP ($${shortPlan.priceUsd.toFixed(2)}/${shortPlan.durationDays}ថ្ងៃ ឬ $${longPlan.priceUsd.toFixed(2)}/${longPlan.durationDays}ថ្ងៃ) ដើម្បីដោះសោសក្តានុពលទាំង ${dynamicBenefits.length}!` 
                    : `Upgrade to Premium VIP ($${shortPlan.priceUsd.toFixed(2)}/${shortPlan.durationDays}d or $${longPlan.priceUsd.toFixed(2)}/${longPlan.durationDays}d) to unlock all ${dynamicBenefits.length} powers!`}
                </p>
              </div>
            </div>

            <button
              onClick={() => openUpgradeVipModal(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold font-khmer shadow-xs transition shrink-0 active:scale-95 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20 cursor-pointer"
            >
              {isKm ? '👑 ដំឡើង VIP' : 'Upgrade VIP'}
            </button>
          </div>
        </div>
      )}

      {/* Requirement 1: Contact Admin / Payment Support & Support Messages / Payment History - Users Only */}
      {currentUser && currentUser.role !== 'admin' && (() => {
        const mySupportTickets = supportTickets.filter(t => t.userId === currentUser.id);
        const unreadAdminReplies = mySupportTickets.filter(t => t.unreadByUser).length;
        const myPaymentHistory = transactions.filter(
          t => t.userId === currentUser.id || t.ownerId === currentUser.id
        );
        return (
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border-2 border-amber-400/60 shadow-xs space-y-3 font-khmer">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>
                      {isKm
                        ? 'សារជំនួយ & ប្រវត្តិការបង់ប្រាក់ (Support Messages / Payment History)'
                        : 'Support Messages / Payment History'}
                    </span>
                    {unreadAdminReplies > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">
                        {isKm ? `${unreadAdminReplies} សារឆ្លើយតបថ្មីពី Admin` : `${unreadAdminReplies} New Reply`}
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isKm
                      ? 'បានបង់ប្រាក់តាម ABA រួចហើយតែមិនទាន់បើក VIP? ផ្ញើសារ និងវិក្កយបត្រមកកាន់ Admin ផ្ទាល់'
                      : 'Paid via ABA but VIP not activated? Message Admin & attach your receipt directly'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openSupportTicketModal()}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>
                  {isKm ? '💬 ទាក់ទង Admin / ជំនួយការបង់ប្រាក់' : '💬 Contact Admin / Payment Support'}
                </span>
              </button>
            </div>

            {mySupportTickets.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                {mySupportTickets.slice(0, 3).map(ticket => {
                  const latestMsg = ticket.messages[ticket.messages.length - 1];
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => openSupportTicketModal()}
                      className="p-3 rounded-2xl bg-amber-50/60 dark:bg-slate-900/70 border border-amber-200 dark:border-slate-700 hover:border-amber-400 cursor-pointer transition space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          #{ticket.id} • {ticket.paymentPlanLabel}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ticket.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : ticket.status === 'replied'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ticket.status === 'resolved'
                            ? isKm
                              ? '✓ បានដោះស្រាយ (Resolved)'
                              : '✓ Resolved'
                            : ticket.status === 'replied'
                            ? isKm
                              ? '💬 Admin បានឆ្លើយតប (Replied)'
                              : '💬 Replied'
                            : isKm
                            ? '⏳ រង់ចាំ (Pending)'
                            : '⏳ Pending'}
                        </span>
                      </div>
                      {latestMsg && (
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
                          <strong className={latestMsg.senderRole === 'admin' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}>
                            {latestMsg.senderRole === 'admin' ? 'Admin: ' : `${isKm ? 'អ្នក' : 'You'}: `}
                          </strong>
                          {latestMsg.message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {myPaymentHistory.length > 0 && (
              <div className="pt-1 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  {isKm ? 'ប្រវត្តិការបង់ប្រាក់ VIP ថ្មីៗ៖' : 'Recent VIP Payment History:'}
                </div>
                {myPaymentHistory.slice(0, 2).map(txn => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {txn.type === 'additional_store_fee'
                          ? isKm
                            ? `បន្ថែមហាងថ្មី ($${Number(txn.amountUsd || 0).toFixed(2)})`
                            : `Extra Store ($${Number(txn.amountUsd || 0).toFixed(2)})`
                          : `VIP ${txn.durationDays || shortPlan.durationDays} ${isKm ? 'ថ្ងៃ' : 'Days'} ($${Number(txn.amountUsd ?? shortPlan.priceUsd).toFixed(2)})`}
                      </span>
                      <span className="text-slate-400 ml-2 font-mono">{txn.transactionRef}</span>
                    </div>
                    <span
                      className={`font-bold ${
                        txn.status === 'verified'
                          ? 'text-emerald-600'
                          : txn.status === 'rejected'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {txn.status === 'verified'
                        ? isKm
                          ? '✓ អនុម័តរួច'
                          : '✓ Verified'
                        : txn.status === 'rejected'
                        ? isKm
                          ? '✕ បដិសេធ'
                          : '✕ Rejected'
                        : isKm
                        ? '⏳ រង់ចាំពិនិត្យ'
                        : '⏳ Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Cambodian Food Passport - Consumer Users Only */}
      {!isAdmin && <FoodPassportCard />}

      {/* App Installation & Support Buttons Showcase - Users Only */}
      {!isAdmin && (
        <div className="grid grid-cols-1 gap-2.5">
          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition text-left"
          >
            <div className="p-2 rounded-xl bg-[#10B981] text-white shrink-0">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#0F172A] dark:text-white font-khmer">
                {isKm ? 'ជួយឧបត្ថម្ភ' : 'Support App'}
              </div>
              <div className="text-[10px] text-slate-500 font-khmer">
                {isKm ? 'Bakong KHQR' : 'Bakong KHQR'}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* 6 Personalized Account Features Hub (Strictly Consumer VIP Access Controlled - Hidden for Admin) */}
      {!isAdmin && (
      <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950 via-[#064E3B] to-slate-900 text-white border border-emerald-500/40 shadow-xs space-y-3 font-khmer relative overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h3 className="font-moul text-xs sm:text-sm text-white">
              {isKm ? 'សេវាកម្មផ្ទាល់ខ្លួន (Personal Features)' : 'Personalized Features'}
            </h3>
          </div>
          {isVip || currentUser?.role === 'admin' ? (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/50 text-emerald-200 text-[10px] font-extrabold flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-300" />
              {isKm ? 'បើកដំណើរការ VIP' : 'VIP Unlocked'}
            </span>
          ) : (
            <button
              onClick={() => openUpgradeVipModal(vipAccountState === 'expired_vip' || currentUser?.subscriptionStatus === 'cancelled')}
              className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-stone-950 text-[10px] font-extrabold flex items-center gap-1 shadow-xs hover:brightness-105 cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              {isKm ? '🔒 សម្រាប់តែ VIP • ដំឡើងឥឡូវ' : '🔒 VIP Only • Upgrade'}
            </button>
          )}
        </div>

        {!isVip && currentUser?.role !== 'admin' && (
          <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] text-amber-100 leading-snug">
              <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>
                {isKm
                  ? vipAccountState === 'expired_vip' || currentUser?.subscriptionStatus === 'cancelled'
                    ? 'សមាជិកភាព VIP របស់អ្នកបានផុតកំណត់ ឬត្រូវបានបោះបង់។ សូមបន្តកញ្ចប់ VIP ដើម្បីបើកសោមុខងារពិសេសទាំង ៦!'
                    : 'មុខងារពិសេសផ្ទាល់ខ្លួនទាំង ៦ ត្រូវបានចាក់សោសម្រាប់គណនីធម្មតា (Free User)។ សូមដំឡើងទៅ VIP ដើម្បីប្រើប្រាស់!'
                  : vipAccountState === 'expired_vip' || currentUser?.subscriptionStatus === 'cancelled'
                  ? 'Your VIP has expired or was cancelled. Renew VIP to unlock all 6 Personalized Features!'
                  : 'All 6 Personalized Features are locked for Free Users. Upgrade to VIP to unlock immediate access!'}
              </span>
            </div>
            <button
              onClick={() => openUpgradeVipModal(vipAccountState === 'expired_vip' || currentUser?.subscriptionStatus === 'cancelled')}
              className="shrink-0 px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-[10px] cursor-pointer"
            >
              {isKm ? 'ដំឡើង VIP' : 'Upgrade'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {/* A. ថ្ងៃនេះញ៉ាំអ្វី? */}
          <button
            onClick={() => setIsWhatToEatModalOpen(true)}
            className="p-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-left transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">🍲</span>
              {!isVip && currentUser?.role !== 'admin' ? (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/50 text-amber-200 text-[9px] font-extrabold flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> VIP
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-900 text-[8px] font-black">
                  {isKm ? 'អាទិភាពខ្ពស់ ⭐' : 'High Priority'}
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {isKm ? 'ថ្ងៃនេះញ៉ាំអ្វី?' : 'What to Eat Today?'}
            </div>
          </button>

          {/* B. នៅជិតខ្ញុំ */}
          <button
            onClick={() => setIsNearMeModalOpen(true)}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">📍</span>
              {!isVip && currentUser?.role !== 'admin' ? (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/50 text-amber-200 text-[9px] font-extrabold flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> VIP
                </span>
              ) : (
                <span className="text-[9px] font-mono text-emerald-300 font-bold">GPS</span>
              )}
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {isKm ? 'នៅជិតខ្ញុំ' : 'Near Me'}
            </div>
          </button>

          {/* C. កន្លែងថ្មីប្រចាំថ្ងៃ */}
          <button
            onClick={() => setIsDailyDiscoveriesModalOpen(true)}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">✨</span>
              {!isVip && currentUser?.role !== 'admin' ? (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/50 text-amber-200 text-[9px] font-extrabold flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> VIP
                </span>
              ) : (
                <span className="text-[8px] text-amber-300 font-bold">Daily</span>
              )}
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {isKm ? 'កន្លែងថ្មីប្រចាំថ្ងៃ' : 'Daily Picks'}
            </div>
          </button>

          {/* D. បញ្ជីកន្លែងដែលចង់ទៅ */}
          <button
            onClick={() => setIsWishlistsModalOpen(true)}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">📑</span>
              {!isVip && currentUser?.role !== 'admin' ? (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/50 text-amber-200 text-[9px] font-extrabold flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> VIP
                </span>
              ) : (
                <span className="text-[9px] text-emerald-300 font-bold">{wishlists.length}</span>
              )}
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {isKm ? 'បញ្ជីកន្លែងចង់ទៅ' : 'My Wishlists'}
            </div>
          </button>

          {/* E. ផែនការដើរលេង AI */}
          <button
            onClick={() => setIsAiTripPlannerModalOpen(true)}
            className="p-2.5 rounded-2xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/30 text-left transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">🤖</span>
              {!isVip && currentUser?.role !== 'admin' ? (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/50 text-amber-200 text-[9px] font-extrabold flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> VIP
                </span>
              ) : (
                <span className="text-[8px] text-teal-300 font-bold">Smart AI</span>
              )}
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {isKm ? 'ផែនការដើរលេង AI' : 'AI Trip Planner'}
            </div>
          </button>

          {/* F. ការជូនដំណឹង */}
          <button
            onClick={() => setIsNotificationsModalOpen(true)}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition relative cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">🔔</span>
              {!isVip && currentUser?.role !== 'admin' ? (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/50 text-amber-200 text-[9px] font-extrabold flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> VIP
                </span>
              ) : unreadNotificationsCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[8px] font-black">
                  {unreadNotificationsCount}
                </span>
              ) : null}
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {isKm ? 'ការជូនដំណឹង' : 'Notifications'}
            </div>
          </button>

          {/* G. ស្វែងរកទីតាំងលើ Google Maps (VIP & Admin) */}
          <button
            onClick={() => openGoogleMapsSearchModal('all')}
            className="col-span-2 p-2.5 rounded-2xl bg-gradient-to-r from-emerald-700/60 to-teal-700/60 hover:from-emerald-700/80 hover:to-teal-700/80 border border-amber-400/50 text-left transition relative cursor-pointer flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🗺️</span>
              <div>
                <div className="text-xs font-bold text-amber-300">
                  {isKm ? 'ស្វែងរកហាង & ទីតាំងលើ Google Maps' : 'Google Maps Places Search'}
                </div>
                <div className="text-[10px] text-emerald-100">
                  {isKm ? 'ហាងកាហ្វេ ភោជនីយដ្ឋាន និងតំបន់ទេសចរណ៍ទូទាំងកម្ពុជា' : 'Search cafés, restaurants & attractions across Cambodia'}
                </div>
              </div>
            </div>
            {!isVip ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/50 text-amber-200 text-[9px] font-extrabold flex items-center gap-0.5 shrink-0">
                <Lock className="w-2.5 h-2.5" /> VIP
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black shrink-0">
                VIP Maps
              </span>
            )}
          </button>
        </div>
      </div>
      )}

      {/* Tabs: My Restaurant (for owners) / Wishlists / Saved / Trip Plans / My Posts / Membership / Settings */}
      {!isAdmin && (
      <div className="relative group/tabs">
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <button
            onClick={() => scrollTabs(-150)}
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
            title={isKm ? 'រំកិលទៅឆ្វេង' : 'Scroll left'}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Right Scroll Button */}
        {canScrollRight && (
          <button
            onClick={() => scrollTabs(150)}
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
            title={isKm ? 'រំកិលទៅស្តាំ (ការកំណត់ & VIP)' : 'Scroll right'}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        <div 
          ref={tabsContainerRef}
          onScroll={checkTabsScroll}
          onWheel={(e) => {
            if (e.deltaY !== 0 && tabsContainerRef.current) {
              tabsContainerRef.current.scrollLeft += e.deltaY;
              checkTabsScroll();
            }
          }}
          className="flex border-b border-slate-200 dark:border-slate-700 text-xs font-khmer overflow-x-auto scroll-smooth scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 px-1"
        >
          {isOwner && (
            <button
              onClick={() => setActiveSubTab('myrestaurant')}
              className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
                activeSubTab === 'myrestaurant'
                  ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {isKm ? '🏪 ហាងខ្ញុំ' : '🏪 Shop'}
            </button>
          )}

          <button
            onClick={() => {
              if (!isVip && currentUser?.role !== 'admin') {
                setIsWishlistsModalOpen(true);
                return;
              }
              setActiveSubTab('wishlists');
            }}
            className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
              activeSubTab === 'wishlists'
                ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {isKm
              ? `📄 បញ្ជីចង់ទៅ ${!isVip && currentUser?.role !== 'admin' ? '🔒' : `(${wishlists.length})`}`
              : `Lists ${!isVip && currentUser?.role !== 'admin' ? '🔒' : `(${wishlists.length})`}`}
          </button>

          <button
            onClick={() => {
              if (!isVip && currentUser?.role !== 'admin') {
                setIsAiTripPlannerModalOpen(true);
                return;
              }
              setActiveSubTab('tripplans');
            }}
            className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
              activeSubTab === 'tripplans'
                ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {isKm
              ? `🤖 ផែនការ AI ${!isVip && currentUser?.role !== 'admin' ? '🔒' : `(${tripPlans.length})`}`
              : `Plans ${!isVip && currentUser?.role !== 'admin' ? '🔒' : `(${tripPlans.length})`}`}
          </button>

          <button
            onClick={() => setActiveSubTab('bookmarks')}
            className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
              activeSubTab === 'bookmarks'
                ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {isKm ? `❤️ ចំណូលចិត្ត (${savedFoods.length + savedDestinations.length + savedRestaurants.length})` : `Saved (${savedFoods.length + savedDestinations.length + savedRestaurants.length})`}
          </button>

          <button
            onClick={() => setActiveSubTab('myposts')}
            className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
              activeSubTab === 'myposts'
                ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {isKm ? `ការបង្ហោះ (${myPosts.length})` : `Posts (${myPosts.length})`}
          </button>

          {currentUser?.role !== 'admin' && (
            <button
              onClick={() => setActiveSubTab('membership')}
              className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
                activeSubTab === 'membership'
                  ? 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span className="flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{isKm ? (isVip ? '👑 សមាជិក VIP' : '👑 សមាជិកភាព') : '👑 Membership'}</span>
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('settings')}
            className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
              activeSubTab === 'settings'
                ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>⚙️ {isKm ? 'ការកំណត់' : 'Settings'}</span>
          </button>
        </div>
      </div>
      )}

      {/* Tab: My Restaurant (Shop Owner Portal - Consumer VIP Only) */}
      {!isAdmin && activeSubTab === 'myrestaurant' && isOwner && (
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
                    ? 'ចុះបញ្ជីហាងមុន ហាងរបស់លោកអ្នកនឹងបង្ហាញមុនគេតាមលំដាប់លេខរៀង ដើម្បីងាយស្រួលឱ្យអតិថិជនស្វែងរក និងតាមដានស្ថិតិហាង។'
                    : 'Register your restaurant early so it appears first in chronological order, making it easy for customers to find and track store analytics.'}
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
              const items = restaurant.menuItems || [];

              return (
                <div key={restaurant.id} className="p-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3.5">
                  <div className="flex items-center gap-3">
                    <img src={restaurant.photoUrl} alt="restaurant" className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0" />
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
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#064E3B] to-[#059669] text-white flex items-center gap-1 font-khmer shadow-xs">
                            <Sparkles className="w-3 h-3 text-emerald-200" />
                            <span>⭐ {isKm ? 'សមាជិកភាព VIP Premium (សកម្ម)' : 'Premium VIP Active'}</span>
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
                        {items.length} / 20 {isKm ? 'មុខម្ហូប' : 'items'}
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
                          ? `គណនីឥតគិតថ្លៃមិនអាចបន្ថែមមុខម្ហូបបានទេ។ ដំឡើងទៅកញ្ចប់ VIP ($${shortPlan.priceUsd.toFixed(2)} / ${shortPlan.durationDays} ថ្ងៃ ឬ $${longPlan.priceUsd.toFixed(2)} / ${longPlan.durationDays} ថ្ងៃ) ដើម្បីបន្ថែមម្ហូប!` 
                          : `Free listing cannot add food items. Upgrade to VIP ($${shortPlan.priceUsd.toFixed(2)} / ${shortPlan.durationDays} days or $${longPlan.priceUsd.toFixed(2)} / ${longPlan.durationDays} days) to add food items!`}
                      </p>
                    )}

                    {isExpired && (
                      <p className="text-[10px] text-red-600">
                        {isKm 
                          ? `សមាជិកភាព VIP បានផុតកំណត់ហើយ។ ទិន្នន័យមុខម្ហូបទាំងអស់ត្រូវបានរក្សាទុកដដែល។ សូមបន្តសមាជិកភាព VIP ($${shortPlan.priceUsd.toFixed(2)} / ${shortPlan.durationDays} ថ្ងៃ ឬ $${longPlan.priceUsd.toFixed(2)} / ${longPlan.durationDays} ថ្ងៃ)។` 
                          : `VIP expired. All food items are retained. Renew VIP ($${shortPlan.priceUsd.toFixed(2)} / ${shortPlan.durationDays} days or $${longPlan.priceUsd.toFixed(2)} / ${longPlan.durationDays} days).`}
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
                        <span>{isKm ? `កែប្រែហាង & មុខម្ហូប (${items.length}/20)` : `Edit Store & Menu (${items.length}/20)`}</span>
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
          {/* Header Card */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/20 via-emerald-500/10 to-teal-500/15 border-2 border-amber-400/50 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-amber-400 text-slate-900 shadow-md">
                  <Crown className="w-6 h-6 fill-slate-900" />
                </div>
                <div>
                  <h4 className="font-moul text-sm text-slate-900 dark:text-white">
                    {isKm ? 'ទំព័រសមាជិកភាព (VIP Membership Page)' : 'VIP Membership Page'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isKm
                      ? `កញ្ចប់ $${shortPlan.priceUsd.toFixed(2)} USD (${shortPlan.durationDays} ថ្ងៃ) ឬ $${longPlan.priceUsd.toFixed(2)} USD (${longPlan.durationDays} ថ្ងៃ)`
                      : `$${shortPlan.priceUsd.toFixed(2)} USD (${shortPlan.durationDays} Days) or $${longPlan.priceUsd.toFixed(2)} USD (${longPlan.durationDays} Days)`}
                  </p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                isVip 
                  ? 'bg-amber-400 text-slate-950 shadow-xs' 
                  : currentUser?.subscriptionStatus === 'pending'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : currentUser?.subscriptionStatus === 'expired'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {isVip 
                  ? (isKm ? '🌟 Premium VIP' : '🌟 Premium VIP') 
                  : currentUser?.subscriptionStatus === 'pending'
                  ? (isKm ? '⏳ រង់ចាំអនុម័ត (Pending)' : '⏳ Pending Review')
                  : currentUser?.subscriptionStatus === 'expired'
                  ? (isKm ? '❌ ផុតកំណត់' : 'Expired')
                  : (isKm ? 'Free User' : 'Free User')}
              </span>
            </div>

            {/* Details */}
            <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">{isKm ? 'ស្ថានភាពបច្ចុប្បន្ន៖' : 'Current Status:'}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {isVip 
                    ? (isKm ? 'កំពុងដំណើរការ (Active)' : 'Active') 
                    : currentUser?.subscriptionStatus === 'pending'
                    ? (isKm ? '⏳ រង់ចាំរដ្ឋបាលអនុម័ត (Pending Review)' : '⏳ Pending Admin Approval')
                    : currentUser?.subscriptionStatus === 'expired'
                    ? (isKm ? '❌ ផុតកំណត់ (Expired)' : 'Expired')
                    : (isKm ? 'គណនីឥតគិតថ្លៃ (Free Account)' : 'Free Account')}
                </span>
              </div>
              {isVip && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isKm ? 'កាលបរិច្ឆេទផុតកំណត់៖' : 'Expiry Date:'}</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {currentUser?.subscriptionExpiryDate ? currentUser.subscriptionExpiryDate.split('T')[0] : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isKm ? 'រយៈពេលដែលនៅសល់៖' : 'Remaining Period:'}</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {remainingDays} {isKm ? 'ថ្ងៃ' : 'Days'}
                    </span>
                  </div>
                  {currentUser?.transactionRef && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Trx Ref:</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400 truncate max-w-[180px]">
                        {currentUser.transactionRef}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Upgrade / Renew CTA */}
            <button
              onClick={() => openUpgradeVipModal(Boolean(isVip || currentUser?.subscriptionStatus === 'expired'))}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Crown className="w-4 h-4 fill-white" />
              <span>
                {isVip 
                  ? (isKm ? `🔄 បន្តសមាជិកភាព VIP ($${shortPlan.priceUsd.toFixed(2)}/${shortPlan.durationDays}ថ្ងៃ • $${longPlan.priceUsd.toFixed(2)}/${longPlan.durationDays}ថ្ងៃ)` : `Renew VIP ($${shortPlan.priceUsd.toFixed(2)}/${shortPlan.durationDays}d • $${longPlan.priceUsd.toFixed(2)}/${longPlan.durationDays}d)`)
                  : currentUser?.subscriptionStatus === 'pending'
                  ? (isKm ? '⏳ មើលស្ថានភាពសំណើដំឡើង VIP' : 'View Pending Request Status')
                  : currentUser?.subscriptionStatus === 'expired'
                  ? (isKm ? `🔄 បន្តសមាជិកភាព VIP ឡើងវិញ ($${shortPlan.priceUsd.toFixed(2)}/${shortPlan.durationDays}ថ្ងៃ • $${longPlan.priceUsd.toFixed(2)}/${longPlan.durationDays}ថ្ងៃ)` : `Renew VIP ($${shortPlan.priceUsd.toFixed(2)}/${shortPlan.durationDays}d • $${longPlan.priceUsd.toFixed(2)}/${longPlan.durationDays}d)`)
                  : (isKm ? `👑 ដំឡើងទៅជា Premium VIP ($${shortPlan.priceUsd.toFixed(2)}/${shortPlan.durationDays}ថ្ងៃ • $${longPlan.priceUsd.toFixed(2)}/${longPlan.durationDays}ថ្ងៃ)` : `Upgrade to Premium VIP ($${shortPlan.priceUsd.toFixed(2)}/${shortPlan.durationDays}d • $${longPlan.priceUsd.toFixed(2)}/${longPlan.durationDays}d)`)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openSupportTicketModal()}
              className="w-full py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 border border-amber-400 text-amber-800 dark:text-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>
                {isKm
                  ? '💬 ទាក់ទង Admin / បញ្ហាការបង់ប្រាក់ VIP (ផ្ញើសារ & វិក្កយបត្រ)'
                  : '💬 Contact Admin / Payment Support'}
              </span>
            </button>
          </div>

          {/* Dynamic Benefits Check-list */}
          <div className="space-y-2">
            <h5 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>
                {isKm
                  ? `អត្ថប្រយោជន៍ទាំង ${dynamicBenefits.length} យ៉ាងនៃ Premium VIP:`
                  : `All ${dynamicBenefits.length} Premium VIP Benefits:`}
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
                        {isVip ? '✓ Active' : 'Locked'}
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
              <Bot className="w-3.5 h-3.5" />
              <span>{isKm ? '+ បង្កើតថ្មី' : '+ New Plan'}</span>
            </button>
          </div>

          {tripPlans.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-3 shadow-xs">
              <Bot className="w-10 h-10 mx-auto text-[#059669]" />
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
                {isKm ? '🤖 បង្កើតផែនការដើរលេងឥឡូវនេះ' : 'Generate AI Plan'}
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

      {/* Tab: My Posts (Consumer Users Only) */}
      {!isAdmin && activeSubTab === 'myposts' && (
        <div className="space-y-3">
          {myPosts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-khmer">
              <p>{isKm ? 'លោកអ្នកមិនទាន់បានបង្ហោះអ្វីនៅឡើយទេ' : 'You haven’t posted anything yet'}</p>
            </div>
          ) : (
            myPosts.map((p) => (
              <div key={p.id} className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <img src={p.photoUrl} alt="thumb" className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <h5 className="font-bold text-xs text-[#0F172A] dark:text-white font-khmer">{p.titleKh}</h5>
                    <p className="text-[10px] text-slate-400">{p.likesCount} ❤️ • {p.comments.length} 💬</p>
                  </div>
                </div>
              </div>
            ))
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

          {/* VIP Membership Management (Users only - Never shown to Admin) */}
          {!isAdmin && (
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
              <div>
                <span className="font-medium text-[#0F172A] dark:text-slate-200 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  {isKm ? 'គ្រប់គ្រងសមាជិកភាព (VIP Membership)' : 'VIP Membership'}
                </span>
                <p className="text-[10px] text-slate-500 pl-6">
                  {isVip 
                    ? (isKm ? `ស្ថានភាព៖ Premium VIP (${remainingDays} ថ្ងៃទៀត)` : `Status: Premium VIP (${remainingDays} days left)`)
                    : (isKm
                        ? `ស្ថានភាព៖ គណនីឥតគិតថ្លៃ • $${shortPlan.priceUsd.toFixed(2)}/${shortPlan.durationDays}ថ្ងៃ • $${longPlan.priceUsd.toFixed(2)}/${longPlan.durationDays}ថ្ងៃ`
                        : `Status: Free User • $${shortPlan.priceUsd.toFixed(2)}/${shortPlan.durationDays}d • $${longPlan.priceUsd.toFixed(2)}/${longPlan.durationDays}d`)}
                </p>
              </div>
              <button
                onClick={() => openUpgradeVipModal(Boolean(isVip))}
                className="px-3 py-1 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold border border-amber-300 hover:bg-amber-100 transition cursor-pointer"
              >
                {isVip ? (isKm ? 'គ្រប់គ្រង / បន្ត' : 'Manage / Renew') : (isKm ? 'ដំឡើង VIP' : 'Upgrade')}
              </button>
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
                {isKm ? 'ការជូនដំណឹង (Notifications)' : 'Notifications'}
              </span>
              <p className="text-[10px] text-slate-500 pl-6">
                {isKm ? 'ជូនដំណឹងអំពីប្រូម៉ូសិនហាង និងកន្លែងថ្មី' : 'Receive promo alerts & viral new spots'}
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

          {/* Reset App Data */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="font-medium text-[#0F172A] dark:text-slate-200 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-slate-500" />
              {isKm ? 'កំណត់ទិន្នន័យឡើងវិញ' : 'Reset Database to Seed'}
            </span>
            <button
              onClick={() => {
                if (window.confirm(isKm ? 'តើអ្នកពិតជាចង់កំណត់ទិន្នន័យទាំងអស់ឡើងវិញមែនទេ?' : 'Reset all data to defaults?')) {
                  resetAllData();
                }
              }}
              className="px-3 py-1 rounded-xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100"
            >
              {isKm ? 'កំណត់ឡើងវិញ' : 'Reset'}
            </button>
          </div>

          {/* Sign Out */}
          {currentUser && (
            <button
              onClick={logout}
              className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-[#0F172A] dark:text-slate-200 font-bold flex items-center justify-center gap-1.5 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>{isKm ? 'ចាកចេញពីគណនី' : 'Sign Out'}</span>
            </button>
          )}

          {/* Admin Portal Access (Shown only when NOT logged in as Admin and NOT a VIP customer) */}
          {!isVip && !isAdmin && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-center">
              <button
                type="button"
                onClick={() => setIsAdminLoginModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-700/80 dark:hover:bg-emerald-950/50 text-slate-700 hover:text-[#064E3B] dark:text-slate-200 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-600 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{tr(language, '🛡️ ច្រកចូលប្រព័ន្ធរដ្ឋបាល (Admin Login)', '🛡️ System Administration (Admin Login)', '🛡️ 系统管理中心（管理员登录）')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Global Bottom Account Actions & Log Out (Always accessible without navigating to Settings tab) */}
      {currentUser && (
        <div className="pt-4 border-t border-slate-200/90 dark:border-slate-700/80 space-y-3 font-khmer">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {isKm ? `គណនីកំពុងប្រើប្រាស់៖ ${currentUser.name}` : `Signed in as: ${currentUser.name}`}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              KhmerFoodTourism {APP_VERSION} (Build {APP_BUILD_CODE})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.confirm(isKm ? 'តើអ្នកពិតជាចង់ចាកចេញពីគណនីមែនទេ?' : 'Are you sure you want to log out?')) {
                  logout();
                }
              }}
              className="flex-1 py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>{isKm ? 'ចាកចេញពីគណនី (Sign Out)' : 'Sign Out of Account'}</span>
            </button>

            <button
              onClick={() => {
                setActiveSubTab('settings');
                setTimeout(() => scrollTabs(400), 50);
              }}
              className="py-2.5 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition shadow-xs cursor-pointer"
              title={isKm ? 'ទៅកាន់ការកំណត់' : 'Settings'}
            >
              <span>⚙️ {isKm ? 'ការកំណត់' : 'Settings'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal 
        isOpen={isPrivacyModalOpen} 
        onClose={() => setIsPrivacyModalOpen(false)} 
      />
    </div>
  );
};

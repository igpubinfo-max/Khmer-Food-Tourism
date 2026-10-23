import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Shield, Utensils, Store, Compass, MessageSquare, 
  Users, Plus, Trash2, CheckCircle2, AlertTriangle, Settings, 
  QrCode, Heart, KeyRound, Lock, ExternalLink, CreditCard,
  ShieldCheck, ShieldAlert, Clock, RefreshCw, FileText, Check, Ban,
  Sparkles, Image as ImageIcon, Search, Camera, Upload
} from 'lucide-react';
import { FoodCategorySlug, DestinationCategorySlug, UserRole, RegistrationTransaction, FoodItem, TouristDestination } from '../types';
import { getSecurityAuditLogs, SecurityAuditEntry, revokeAdminSession } from '../utils/security';
import { FoodImageModal } from './FoodImageModal';
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
import { getSmartCacheStats } from '../services/googlePlacesService';

export const AdminDashboard: React.FC = () => {
  const { 
    isAdminOpen, setIsAdminOpen, language,
    foods, addFood, updateFood, deleteFood,
    restaurants, deleteRestaurant, approveRestaurant, toggleVerifyRestaurant,
    destinations, addDestination, updateDestination, deleteDestination,
    posts, deletePost,
    users, updateUserRole, clearAllRegisteredUsers,
    transactions, verifyTransaction, rejectTransaction, requestMorePaymentInfo, getAuthorizedPaymentProof,
    appSettings, updateAppSettings, setAdminPassword, currentUser, showToast,
    aiCheckIns, approveAiCheckIn, rejectAiCheckIn, mergeAiCheckIn,
    setIsAiCheckInModalOpen, triggerCloudSyncNow,
    supportTickets, replyToSupportTicket, updateSupportTicketStatus, approveVipFromSupportTicket, markSupportTicketRead
  } = useApp();

  const [activeTab, setActiveTab] = useState<'stats' | 'support_tickets' | 'food' | 'restaurants' | 'destinations' | 'community' | 'users' | 'transactions' | 'settings' | 'security' | 'image_audit' | 'ai_checkins'>(() => {
    return (window as any).__kft_admin_tab || 'stats';
  });

  useEffect(() => {
    if ((window as any).__kft_admin_tab) {
      setActiveTab((window as any).__kft_admin_tab);
      delete (window as any).__kft_admin_tab;
    }
  }, [isAdminOpen]);
  const [adminReplyDrafts, setAdminReplyDrafts] = useState<Record<string, string>>({});
  const [inspectingTicketReceipt, setInspectingTicketReceipt] = useState<string | null>(null);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'Pending' | 'Replied' | 'Resolved'>('all');

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
  const [newDestFee, setNewDestFee] = useState('ឥតគិតថ្លៃ (ជាតិ)');
  const [newDestBestTime, setNewDestBestTime] = useState('ពេញមួយឆ្នាំ');
  const [newDestPhotoUrl, setNewDestPhotoUrl] = useState('https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800&auto=format&fit=crop&q=80');
  const [newDestDescKh, setNewDestDescKh] = useState('');
  const [showAddDestForm, setShowAddDestForm] = useState(false);
  const [selectedDestForImageEdit, setSelectedDestForImageEdit] = useState<TouristDestination | null>(null);
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [destProvinceFilter, setDestProvinceFilter] = useState('all');

  // Form states for Settings & Promotional pricing
  const [apkUrl, setApkUrl] = useState(appSettings.apkDownloadUrl);
  const [playStoreUrl, setPlayStoreUrl] = useState(appSettings.playStoreUrl);
  const [appStoreUrl, setAppStoreUrl] = useState(appSettings.appStoreUrl);
  const [supportQrUrl, setSupportQrUrl] = useState(appSettings.supportQrImageUrl);
  const [bankName, setBankName] = useState(appSettings.supportBankName);
  const [accountName, setAccountName] = useState(appSettings.supportAccountName);
  const [supportMessageKh, setSupportMessageKh] = useState(appSettings.supportMessageKh);
  const [promotionalFeeUsd, setPromotionalFeeUsd] = useState(appSettings.promotionalFeeUsd || 2.99);
  const [promotionPeriodKh, setPromotionPeriodKh] = useState(appSettings.promotionPeriodKh || '');
  const [newAdminPass, setNewAdminPass] = useState('');

  // Transaction filter & Full-Resolution Payment Proof Inspection Modal
  const [txnFilter, setTxnFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [inspectingProofTxn, setInspectingProofTxn] = useState<RegistrationTransaction | null>(null);

  // Security audit logs state
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>(() => getSecurityAuditLogs());

  // Supabase Free Tier + Google Maps Places API + Smart Cache configuration state
  const [cloudCfg, setCloudCfg] = useState(() => getCloudApiConfig());
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<string>('');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  if (!isAdminOpen) return null;

  const smartCacheStats = getSmartCacheStats();

  const isKm = language === 'km';
  const pendingRestaurants = restaurants.filter(r => r.status === 'pending');
  const verifiedRestaurantsCount = restaurants.filter(r => r.isVerified).length;
  const pendingTxns = transactions.filter(
    t => t.status === 'pending_verification' || t.status === 'needs_more_info'
  );
  const pendingSupportTickets = supportTickets.filter(t => t.status === 'Pending');
  const unreadAdminTickets = supportTickets.filter(t => t.unreadByAdmin);
  const filteredSupportTickets = supportTickets.filter(t => {
    if (ticketFilter === 'all') return true;
    return t.status === ticketFilter;
  });

  const filteredTransactions = transactions.filter(t => {
    if (txnFilter === 'all') return true;
    if (txnFilter === 'pending')
      return t.status === 'pending_verification' || t.status === 'needs_more_info';
    return t.status === txnFilter;
  });

  const handleCreateFood = (e: React.FormEvent) => {
    e.preventDefault();
    addFood({
      nameKh: newFoodNameKh,
      nameEn: newFoodNameEn || newFoodNameKh,
      categorySlug: newFoodCategory,
      categoryKh: newFoodCategory === 'soup' ? 'សម្ល & អាម៉ុក' : newFoodCategory === 'grilled' ? 'ម្ហូបអាំង' : 'ម្ហូបខ្មែរ',
      categoryEn: newFoodCategory,
      descriptionKh: newFoodDescKh,
      descriptionEn: newFoodDescKh,
      photoUrl: newFoodPhotoUrl,
      prepTime: '១៥ នាទី',
      cookTime: newFoodCookTime,
      servings: '២-៣ នាក់',
      difficulty: 'medium',
      priceRiel: 0,
      priceUsd: 0,
      ingredients: [
        { nameKh: 'គ្រឿងផ្សំខ្មែរដើម', nameEn: 'Traditional Khmer ingredients', amount: '១ ចាន' },
        { nameKh: 'គ្រឿងទេស និងអំបិល ស្ករ', nameEn: 'Seasonings', amount: 'តាមចំណូលចិត្ត' },
      ],
      steps: [
        { stepNumber: 1, instructionKh: 'រៀបចំលាងសម្អាតគ្រឿងផ្សំឱ្យស្អាត។', instructionEn: 'Clean and prep ingredients.' },
        { stepNumber: 2, instructionKh: 'ចម្អិនតាមលំដាប់រហូតដល់ឈ្ងុយឆ្ងាញ់។', instructionEn: 'Cook until delicious.' },
      ],
    });
    setNewFoodNameKh('');
    setNewFoodDescKh('');
    setShowAddFoodForm(false);
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

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateAppSettings({
      apkDownloadUrl: apkUrl,
      playStoreUrl,
      appStoreUrl,
      supportQrImageUrl: supportQrUrl,
      supportBankName: bankName,
      supportAccountName: accountName,
      supportMessageKh,
      promotionalFeeUsd: Number(promotionalFeeUsd),
      promotionPeriodKh,
    });
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
                src={currentUser?.avatar || '/images/admin_profile.png'} 
                alt="Chea Savuth Admin" 
                className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-300 shadow-md ring-2 ring-emerald-400/30" 
              />
              <div className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-600 rounded-full border border-white text-white shadow-xs">
                <Shield className="w-3 h-3 text-white" />
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 overflow-x-auto no-scrollbar shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'stats' ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-stone-400'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{isKm ? 'ទិដ្ឋភាពរួម' : 'Overview'}</span>
          </button>

          <button
            onClick={() => setActiveTab('support_tickets')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition relative ${
              activeTab === 'support_tickets' ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-stone-400'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span>{isKm ? `សារជំនួយ & ឆ្លើយតប (${supportTickets.length})` : `Support & Replies (${supportTickets.length})`}</span>
            {(unreadAdminTickets.length > 0 || pendingSupportTickets.length > 0) && (
              <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[9px] font-bold animate-pulse">
                {unreadAdminTickets.length || pendingSupportTickets.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition relative ${
              activeTab === 'transactions' ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-stone-400'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{isKm ? `ការទូទាត់ VIP (${transactions.length})` : `VIP Payments (${transactions.length})`}</span>
            {pendingTxns.length > 0 && (
              <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[9px] font-bold">
                {pendingTxns.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('food')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'food' ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-stone-400'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>{isKm ? `មុខម្ហូប (${foods.length})` : `Foods (${foods.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('image_audit')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition relative ${
              activeTab === 'image_audit' ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-stone-400'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#059669]" />
            <span>{isKm ? `សវនកម្មរូបភាព AI` : `AI Image Audit`}</span>
            {flaggedFoods.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-bold">
                {flaggedFoods.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('restaurants')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition relative ${
              activeTab === 'restaurants' ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-stone-400'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>{isKm ? `ហាងអាហារ (${restaurants.length})` : `Shops (${restaurants.length})`}</span>
            {pendingRestaurants.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ai_checkins')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition relative ${
              activeTab === 'ai_checkins' ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-stone-400'
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-500" />
            <span>{isKm ? `ការឆែកអ៊ីន AI (${aiCheckIns.length})` : `AI Check-ins (${aiCheckIns.length})`}</span>
            {aiCheckIns.filter(c => c.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-bold">
                {aiCheckIns.filter(c => c.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('destinations')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'destinations' ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-stone-400'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>{isKm ? `ទេសចរណ៍ (${destinations.length})` : `Destinations (${destinations.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('community')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'community' ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-stone-400'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{isKm ? `សហគមន៍ (${posts.length})` : `Feed (${posts.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'users' ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-stone-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isKm ? `អ្នកប្រើ (${users.length})` : `Users (${users.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'security' ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-stone-400'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span>{isKm ? 'សន្តិសុខ & Logs' : 'Security'}</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'settings' ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400' : 'border-transparent text-stone-400'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{isKm ? 'ការកំណត់' : 'Settings'}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs">
          {/* STATS OVERVIEW TAB */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-slate-700 dark:border-stone-700 shadow-xs">
                  <span className="text-stone-400 font-khmer text-xs">មុខម្ហូបខ្មែរសរុប</span>
                  <p className="text-2xl font-bold text-[#064E3B] dark:text-emerald-400 font-mono mt-2">{foods.length}</p>
                  <span className="text-[10px] text-[#059669] font-bold">✓ 200+ Disconnected Prices</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-slate-700 dark:border-stone-700 shadow-xs">
                  <span className="text-stone-400 font-khmer text-xs">ហាងអាហារសរុប</span>
                  <p className="text-2xl font-bold text-[#059669] font-mono mt-2">{restaurants.length}</p>
                  <span className="text-[10px] text-stone-500 font-khmer">{verifiedRestaurantsCount} ហាងផ្ទៀងផ្ទាត់ផ្លូវការ</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-slate-700 dark:border-stone-700 shadow-xs">
                  <span className="text-stone-400 font-khmer text-xs">ប្រតិបត្តិការ VIP</span>
                  <p className="text-2xl font-bold text-[#064E3B] dark:text-emerald-400 font-mono mt-2">{transactions.length}</p>
                  <span className="text-[10px] text-[#059669] font-bold font-khmer">{pendingTxns.length} រង់ចាំផ្ទៀងផ្ទាត់</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-slate-200 dark:border-slate-700 dark:border-stone-700 shadow-xs">
                  <span className="text-stone-400 font-khmer text-xs">តំបន់ទេសចរណ៍</span>
                  <p className="text-2xl font-bold text-[#0F172A] dark:text-stone-100 font-mono mt-2">{destinations.length}</p>
                  <span className="text-[10px] text-[#059669] font-bold font-khmer">២៥ ខេត្តក្រុង</span>
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
                      showToast('បានរក្សាទុកសោ Google Maps Places API Key ក្នុងប្រអប់ទី ៣ ជោគជ័យ!', 'success');
                    }}
                    className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white font-khmer font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                  >
                    💾 រក្សាទុកសោ (Save Key)
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
                      ? 'ពិនិត្យសារបញ្ហាការបង់ប្រាក់ ABA រូបវិក្កយបត្រ ឆ្លើយតបទៅអ្នកប្រើប្រាស់ផ្ទាល់ និងអនុម័តបើក VIP (30 ថ្ងៃ $2.99 ឬ 90 ថ្ងៃ $4.99)'
                      : 'Inspect user ABA payment issues, receipts, reply in-app, and approve & activate VIP (30 Days $2.99 or 90 Days $4.99)'}
                  </p>
                </div>

                {/* Status Filter */}
                <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl shrink-0">
                  {(['all', 'Pending', 'Replied', 'Resolved'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setTicketFilter(status)}
                      className={`px-2.5 py-1.5 rounded-lg font-khmer font-semibold text-xs transition ${
                        ticketFilter === status
                          ? 'bg-[#064E3B] text-white shadow'
                          : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                      }`}
                    >
                      {status === 'all'
                        ? isKm
                          ? `ទាំងអស់ (${supportTickets.length})`
                          : `All (${supportTickets.length})`
                        : status}
                    </button>
                  ))}
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
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => {
                          if (ticket.unreadByAdmin) {
                            markSupportTicketRead(ticket.id, 'admin');
                          }
                        }}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          ticket.status === 'Pending'
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700'
                            : ticket.status === 'Replied'
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
                                  ticket.status === 'Resolved'
                                    ? 'bg-emerald-600 text-white'
                                    : ticket.status === 'Replied'
                                    ? 'bg-sky-600 text-white'
                                    : 'bg-amber-500 text-slate-950'
                                }`}
                              >
                                {ticket.status === 'Pending'
                                  ? isKm
                                    ? '⏳ រង់ចាំពិនិត្យ (Pending)'
                                    : '⏳ Pending'
                                  : ticket.status === 'Replied'
                                  ? isKm
                                    ? '💬 បានឆ្លើយតប (Replied)'
                                    : '💬 Replied'
                                  : isKm
                                  ? '✅ ដោះស្រាយរួច (Resolved)'
                                  : '✅ Resolved'}
                              </span>
                              {ticket.unreadByAdmin && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold">
                                  NEW MESSAGE
                                </span>
                              )}
                              {ticket.vipActivated && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[10px] font-bold font-khmer">
                                  👑 បានបើក VIP រួចរាល់
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
                                <strong className="text-emerald-700 dark:text-emerald-300">{ticket.paymentPlan}</strong>
                              </div>
                              <div>
                                <span className="text-stone-400">💵 ទឹកប្រាក់៖ </span>
                                <strong className="font-mono">${ticket.amountUsd.toFixed(2)} USD ({ticket.durationDays} Days)</strong>
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
                                value={ticket.status}
                                onChange={(e) =>
                                  updateSupportTicketStatus(
                                    ticket.id,
                                    e.target.value as 'Pending' | 'Replied' | 'Resolved'
                                  )
                                }
                                className="px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-xs font-bold text-stone-800 dark:text-stone-100"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Replied">Replied</option>
                                <option value="Resolved">Resolved</option>
                              </select>
                            </div>

                            {!ticket.vipActivated && (
                              <button
                                type="button"
                                onClick={() => approveVipFromSupportTicket(ticket.id)}
                                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-khmer font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>
                                  {isKm
                                    ? `✅ អនុម័ត & បើក VIP (${ticket.durationDays} ថ្ងៃ / $${ticket.amountUsd.toFixed(2)})`
                                    : `✅ Approve & Activate VIP (${ticket.durationDays}d / $${ticket.amountUsd.toFixed(2)})`}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Attached Receipt Image */}
                        {ticket.receiptImageUrl && (
                          <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={ticket.receiptImageUrl}
                                alt="User Receipt"
                                onClick={() => setInspectingTicketReceipt(ticket.receiptImageUrl || null)}
                                className="w-16 h-16 object-cover rounded-lg border border-emerald-500 cursor-pointer hover:opacity-90"
                              />
                              <div className="font-khmer text-xs">
                                <p className="font-bold text-stone-900 dark:text-stone-100">
                                  🧾 {isKm ? 'រូបភាពវិក្កយបត្របង់ប្រាក់ ABA ភ្ជាប់មកជាមួយ' : 'Attached ABA Payment Receipt'}
                                </p>
                                <p className="text-[10px] text-stone-500 font-mono">
                                  {ticket.receiptFileName || 'aba_receipt.png'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInspectingTicketReceipt(ticket.receiptImageUrl || null)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-khmer font-bold text-xs cursor-pointer"
                            >
                              {isKm ? '🔍 មើលរូបពេញ' : '🔍 View Receipt'}
                            </button>
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

          {/* TRANSACTIONS TAB (VIP Registrations) */}
          {activeTab === 'transactions' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-base">
                    {isKm ? 'ការទូទាត់ប្រាក់ចុះបញ្ជីហាង VIP (VIP Registration Fee & Transactions)' : 'VIP Registration Transactions'}
                  </h3>
                  <p className="text-stone-500 font-khmer text-xs">
                    {isKm ? 'ផ្ទៀងផ្ទាត់លេខកូដប្រតិបត្តិការ (Trx ID) ជាមួយធនាគារ មុននឹងធ្វើឱ្យហាងសកម្ម' : 'Verify bank transaction references before activating promoted restaurant listings'}
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl shrink-0">
                  <button
                    onClick={() => setTxnFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-khmer font-semibold ${txnFilter === 'all' ? 'bg-white dark:bg-stone-700 shadow text-[#0F172A] dark:text-white' : 'text-stone-500'}`}
                  >
                    {isKm ? 'ទាំងអស់' : 'All'} ({transactions.length})
                  </button>
                  <button
                    onClick={() => setTxnFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg font-khmer font-semibold ${txnFilter === 'pending' ? 'bg-[#064E3B] text-white shadow' : 'text-stone-500'}`}
                  >
                    {isKm ? 'រង់ចាំ' : 'Pending'} ({pendingTxns.length})
                  </button>
                  <button
                    onClick={() => setTxnFilter('verified')}
                    className={`px-3 py-1.5 rounded-lg font-khmer font-semibold ${txnFilter === 'verified' ? 'bg-[#059669] text-white shadow' : 'text-stone-500'}`}
                  >
                    {isKm ? 'ផ្ទៀងផ្ទាត់រួច' : 'Verified'}
                  </button>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 font-khmer">
                    {isKm ? 'គ្មានប្រតិបត្តិការក្នុងប្រភេទនេះឡើយ' : 'No transactions found.'}
                  </div>
                ) : (
                  filteredTransactions.map((t) => {
                    const authorizedProofUrl = getAuthorizedPaymentProof(t.id) || t.paymentProofUrl;
                    return (
                    <div 
                      key={t.id} 
                      className={`p-4 rounded-2xl border transition-all ${
                        t.status === 'pending_verification' || t.status === 'needs_more_info'
                          ? 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600' 
                          : t.status === 'verified'
                          ? 'bg-white dark:bg-stone-800 border-slate-200 dark:border-slate-700 dark:border-stone-700'
                          : 'bg-red-50/40 dark:bg-stone-800 border-red-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-[#0F172A] dark:text-stone-200">{t.id}</span>
                            <span className={`px-2 py-0.5 rounded-full font-khmer font-bold text-[10px] ${
                              t.status === 'verified' 
                                ? 'bg-slate-100 text-[#064E3B] dark:bg-emerald-950/40 dark:text-emerald-400'
                                : t.status === 'pending_verification'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : t.status === 'needs_more_info'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {t.status === 'verified'
                                ? '✓ បានផ្ទៀងផ្ទាត់ & ធ្វើឱ្យសកម្ម'
                                : t.status === 'pending_verification'
                                ? '⏳ រង់ចាំការផ្ទៀងផ្ទាត់'
                                : t.status === 'needs_more_info'
                                ? '💬 រង់ចាំភស្តុតាងបន្ថែម'
                                : '✕ បានបដិសេធ'}
                            </span>
                            <span className="font-bold text-[#064E3B] dark:text-emerald-400 font-mono text-sm">
                              ${t.amountUsd.toFixed(2)} {t.currency || 'USD'}
                            </span>
                            {t.durationDays && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold">
                                {t.durationDays} Days ({t.planType || (t.durationDays <= 30 ? '30 Days ($2.99)' : '90 Days ($4.99)')})
                              </span>
                            )}
                          </div>

                          <div className="font-bold text-[#0F172A] dark:text-stone-100 font-khmer text-sm">
                            {t.type === 'user_vip_upgrade' 
                              ? `👑 ដំឡើងសមាជិកភាព VIP (${t.durationDays || 30} ថ្ងៃ)៖ ${t.userName || t.ownerName || 'User VIP'}` 
                              : t.restaurantNameKh}
                          </div>

                          <div className="text-[11px] text-stone-600 dark:text-stone-400 font-khmer flex flex-wrap gap-x-2 gap-y-1">
                            <span>{t.type === 'user_vip_upgrade' ? 'អ្នកប្រើប្រាស់៖' : 'ម្ចាស់ហាង៖'} <strong>{t.userName || t.ownerName}</strong></span>
                            {t.userId && <span>• ID: <code className="font-mono text-[10px]">{t.userId}</code></span>}
                            {t.userEmail && <span>• ✉️ {t.userEmail}</span>}
                            {t.ownerPhone && <span>• 📞 {t.ownerPhone}</span>}
                            <span>• វិធីបង់៖ <strong className="font-mono">{t.paymentMethod}</strong></span>
                            <span>• កាលបរិច្ឆេទ៖ {t.createdAt}</span>
                          </div>

                          <div className="p-2 bg-stone-100 dark:bg-stone-900 rounded-xl font-mono text-xs flex items-center justify-between">
                            <span className="text-stone-500 font-khmer">Bank Ref / Trx ID:</span>
                            <span className="font-bold text-[#064E3B] dark:text-emerald-400">{t.transactionRef}</span>
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
                                    <span>{isKm ? 'ភស្តុតាងបង់ប្រាក់ (Payment Proof)' : 'Uploaded Payment Proof'}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                    {t.paymentProofFileName || 'aba_receipt.jpg'}{' '}
                                    {t.paymentProofUploadedAt ? `• ${t.paymentProofUploadedAt}` : ''}
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
                              <span>⚠️ {isKm ? 'អ្នកប្រើប្រាស់មិនទាន់ភ្ជាប់រូបភាពវិក្កយបត្របង់ប្រាក់នៅឡើយទេ' : 'No payment proof screenshot attached yet'}</span>
                            </div>
                          )}

                          {(t.verifiedBy || t.verifiedAt) && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-khmer flex items-center gap-2">
                              <span>🛡️ ត្រួតពិនិត្យដោយ៖ <strong>{t.verifiedBy || 'Admin'}</strong></span>
                              {t.verifiedAt && <span>• ពេលវេលា៖ {t.verifiedAt}</span>}
                            </div>
                          )}

                          {t.notes && (
                            <div className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-xl border border-amber-200 dark:border-amber-800 font-khmer">
                              📝 <strong>សម្គាល់៖</strong> {t.notes}
                            </div>
                          )}
                        </div>

                        {/* PART 3 REQUIREMENT: 4 Administrator Review Actions (View Proof, Approve, Request More Info, Reject) */}
                        {(t.status === 'pending_verification' || t.status === 'needs_more_info') && (
                          <div className="flex sm:flex-col gap-2 shrink-0 flex-wrap">
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
                                  ? (t.type === 'user_vip_upgrade' ? `✅ អនុម័តដំឡើង VIP (${t.durationDays || 90} ថ្ងៃ)` : 'ផ្ទៀងផ្ទាត់ & ធ្វើឱ្យសកម្ម')
                                  : (t.type === 'user_vip_upgrade' ? `Approve VIP (${t.durationDays || 90} Days)` : 'Verify & Activate')}
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
                                  isKm ? 'បញ្ចូលមូលហេតុនៃការបដិសេធ (Rejection Reason)៖' : 'Enter rejection reason:',
                                  isKm ? 'មិនឃើញមានប្រតិបត្តិការទូទាត់ក្នុងរបាយការណ៍ធនាគារ ABA ឡើយ។' : 'Transaction could not be verified on ABA bank statement.'
                                );
                                if (customReason !== null) {
                                  rejectTransaction(t.id, customReason.trim() || 'Transaction ID could not be verified on bank statement.');
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-khmer font-bold text-xs transition cursor-pointer"
                            >
                              <span>{isKm ? '❌ បដិសេធ' : 'Reject'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                  })
                )}
              </div>

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

              {/* Promotional Settings Editor */}
              <div className="p-5 bg-white dark:bg-stone-800 rounded-3xl border border-slate-200 dark:border-slate-700 dark:border-stone-700 space-y-3 font-khmer">
                <h4 className="font-bold text-[#0F172A] dark:text-stone-100 text-sm flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-[#059669]" />
                  <span>{isKm ? 'ការកំណត់តម្លៃប្រូម៉ូសិនចុះបញ្ជីហាង' : 'Promotional Pricing Configuration'}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">
                      {isKm ? 'តម្លៃប្រូម៉ូសិន (USD)' : 'Promotional Fee (USD)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={promotionalFeeUsd}
                      onChange={e => setPromotionalFeeUsd(parseFloat(e.target.value) || 2.99)}
                      className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      {isKm ? 'សារប្រូម៉ូសិន (Khmer Notice)' : 'Promotion Notice (Khmer)'}
                    </label>
                    <input
                      type="text"
                      value={promotionPeriodKh}
                      onChange={e => setPromotionPeriodKh(e.target.value)}
                      placeholder="តម្លៃគម្រោង VIP៖ $2.99 (30 ថ្ងៃ) / $4.99 (90 ថ្ងៃ)"
                      className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 font-khmer"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-xl text-xs transition active:scale-95 shadow-xs"
                >
                  {isKm ? 'រក្សាទុកការកំណត់ប្រូម៉ូសិន' : 'Save Promotional Settings'}
                </button>
              </div>
            </div>
          )}

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
                <form onSubmit={handleCreateFood} className="p-4 rounded-2xl bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-slate-700 dark:border-stone-700 space-y-3 font-khmer">
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
                      type="url"
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#0F172A] dark:text-stone-100 font-khmer text-sm">
                    {isKm ? `គ្រប់គ្រងហាងអាហារ (សរុប ${restaurants.length} ហាង)` : `Manage Restaurants (${restaurants.length} shops)`}
                  </h3>
                  <p className="text-[10px] text-stone-400 font-khmer">
                    {isKm ? `${verifiedRestaurantsCount} ហាងផ្ទៀងផ្ទាត់ផ្លូវការ • ${restaurants.length - verifiedRestaurantsCount} គំរូសហគមន៍` : `${verifiedRestaurantsCount} verified • ${restaurants.length - verifiedRestaurantsCount} community listings`}
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                {restaurants.map((rest) => (
                  <div key={rest.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-slate-200 dark:border-slate-700 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img src={rest.photoUrl} alt="rest" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-[#0F172A] dark:text-stone-100 font-khmer truncate">{rest.nameKh}</h4>
                          {rest.isVerified && <span className="text-[#059669] text-[10px] font-bold">✓ Verified</span>}
                          {rest.isPromoted && <span className="text-[#064E3B] dark:text-emerald-400 text-[10px] font-bold">★ Promoted</span>}
                        </div>
                        <p className="text-[10px] text-stone-400 truncate">
                          {rest.provinceKh} • 📞 {rest.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleVerifyRestaurant(rest.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-khmer ${
                          rest.isVerified ? 'bg-stone-200 text-stone-700' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {rest.isVerified ? 'Unverify' : 'Verify'}
                      </button>
                      <button
                        onClick={() => deleteRestaurant(rest.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
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
                <button
                  onClick={() => setShowAddDestForm(!showAddDestForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#064E3B] text-white font-bold hover:bg-[#047857] font-khmer text-xs shadow-xs self-start sm:self-auto transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{showAddDestForm ? 'បិទ' : 'បញ្ចូលកន្លែងថ្មី'}</span>
                </button>
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

          {/* COMMUNITY POSTS TAB */}
          {activeTab === 'community' && (
            <div className="space-y-4">
              <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-sm">
                {isKm ? `ការចែករំលែកសហគមន៍ (${posts.length} បទបង្ហាញ)` : `Community Feed (${posts.length} posts)`}
              </h3>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                {posts.map((p) => (
                  <div key={p.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={p.photoUrl} alt="post" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      <div>
                        <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer truncate max-w-xs">{p.titleKh}</h4>
                        <p className="text-[10px] text-stone-400">{p.authorName} • {p.locationName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deletePost(p.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-sm">
                    {isKm ? `អ្នកប្រើប្រាស់ក្នុងប្រព័ន្ធ (${users.length} គណនី)` : `User Accounts (${users.length})`}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-khmer mt-0.5">
                    {isKm ? 'គ្រប់គ្រងគណនីអ្នកប្រើប្រាស់ និងសមាជិកភាព VIP' : 'Manage registered accounts and VIP memberships'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Trigger JSON backup download for admin
                      const backupObj = {
                        timestamp: new Date().toISOString(),
                        appName: 'Khmer Food & Tourism',
                        version: 'v1.8.0',
                        users: users,
                        count: users.length,
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

                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(isKm 
                        ? 'តើអ្នកពិតជាចង់សម្អាត និងលុបគណនីអ្នកប្រើប្រាស់ទាំងអស់ចេញពី Database មែនទេ?\n\n(ទិន្នន័យ Admin, មុខម្ហូប ២០០+, ហាងអាហារ ២២០+, និងតំបន់ទេសចរណ៍ ១២៤+ នឹងត្រូវបានរក្សាទុក ១០០% ដដែល)' 
                        : 'Are you sure you want to purge all registered users from the database?\n\n(Admin credentials, 200+ foods, 220+ restaurants, and 124 destinations will remain completely intact)')) {
                        await clearAllRegisteredUsers();
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-khmer text-xs font-bold border border-rose-300 dark:border-rose-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isKm ? '🧹 សម្អាតគណនីទាំងអស់' : 'Purge All Users'}</span>
                  </button>
                </div>
              </div>

              {users.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 space-y-3 font-khmer">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-[#064E3B] dark:text-emerald-300 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {isKm ? 'មូលដ្ឋានទិន្នន័យអ្នកប្រើប្រាស់ត្រូវបានសម្អាតស្អាត (Database Clean)' : 'User Database is Clean'}
                    </h4>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                      {isKm 
                        ? 'គ្មានគណនីអ្នកប្រើប្រាស់ទូទៅដែលបានចុះឈ្មោះក្នុងប្រព័ន្ធឡើយ។ គណនីរដ្ឋបាល (Admin), មុខម្ហូប (២០០+), ហាងអាហារ (២២០+) និងតំបន់ទេសចរណ៍ (១២៤+) ត្រូវបានរក្សាទុកសុវត្ថិភាព ១០០%។' 
                        : 'No registered user accounts exist. System Admin, 200+ foods, 220+ restaurants, and 124 destinations are 100% intact.'}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold">
                    <span>✓ Database Verified & Active</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                  {users.map((u) => (
                    <div key={u.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer flex items-center gap-2">
                            <span>{u.name}</span>
                            <code className="text-[10px] font-mono text-stone-400">({u.id})</code>
                          </h4>
                          <p className="text-[10px] text-stone-400">{u.email} • 📞 {u.phone || 'N/A'}</p>
                          {(u.role === 'vip' || u.vipPlanType || u.vipExpiryDate) && (
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-khmer mt-0.5">
                              👑 គម្រោង៖ <strong>{u.vipPlanType === 'annual' ? 'VIP 90 Days ($4.99)' : 'VIP 30 Days ($2.99)'}</strong>
                              {u.vipActivatedAt && ` • ថ្ងៃបើក៖ ${new Date(u.vipActivatedAt).toLocaleDateString()}`}
                              {u.vipExpiryDate && ` • ថ្ងៃផុតកំណត់៖ ${new Date(u.vipExpiryDate).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-100 dark:bg-stone-700 font-mono self-start sm:self-center">
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Installation & Store URLs */}
              <div className="bg-white dark:bg-stone-800 p-5 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-200 dark:border-stone-700">
                  <QrCode className="w-5 h-5 text-red-600" />
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-sm">
                      {isKm ? 'តំណភ្ជាប់ដំឡើងកម្មវិធី និង QR Code' : 'App Installation & Download Links'}
                    </h4>
                    <p className="text-[11px] text-stone-500 font-khmer">
                      {isKm ? 'កែប្រែតំណភ្ជាប់ទាញយក APK, Play Store និង App Store ដោយមិនបាច់ Rebuild កម្មវិធីឡើយ' : 'Update download links dynamically without rebuilding the app'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-3 font-khmer">
                  <div>
                    <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                      {isKm ? 'តំណភ្ជាប់ទាញយក Android APK (Direct APK Download URL)' : 'Direct APK Download URL'}
                    </label>
                    <input
                      type="url"
                      value={apkUrl}
                      onChange={e => setApkUrl(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 font-mono text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                        {isKm ? 'តំណភ្ជាប់ Google Play Store' : 'Google Play Store URL'}
                      </label>
                      <input
                        type="url"
                        value={playStoreUrl}
                        onChange={e => setPlayStoreUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                        {isKm ? 'តំណភ្ជាប់ Apple App Store' : 'Apple App Store URL'}
                      </label>
                      <input
                        type="url"
                        value={appStoreUrl}
                        onChange={e => setAppStoreUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-xl shadow-md transition-all font-khmer text-xs active:scale-95"
                  >
                    {isKm ? 'រក្សាទុកតំណភ្ជាប់ដំឡើង' : 'Save Download Configuration'}
                  </button>
                </form>
              </div>

              {/* Support / Donation KHQR Configuration */}
              <div className="bg-white dark:bg-stone-800 p-5 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-4">
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

              {/* Password Management */}
              <div className="bg-white dark:bg-stone-800 p-5 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-4 font-khmer">
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

              {/* Supabase Free Tier Cloud & Google Maps Places API + Smart Cache */}
              <div className="bg-white dark:bg-stone-800 p-5 rounded-3xl border-2 border-emerald-500/40 dark:border-emerald-600/40 shadow-sm space-y-4 font-khmer text-xs">
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

                {/* Smart Cache Live Statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
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
                    <div className="text-[10px] text-stone-500">ចំនួនហៅទៅ Google API ផ្ទាល់</div>
                    <div className="text-lg font-black text-stone-700 dark:text-stone-300 font-mono">
                      {smartCacheStats.googleApiCallsCount} ដង
                    </div>
                  </div>
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
                          showToast('បានរក្សាទុកសោ Google Maps Places API Key ជោគជ័យ!', 'success');
                        }}
                        className="px-3 py-2 bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-xl text-[11px] shrink-0"
                      >
                        💾 Save
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
            </div>
          )}

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

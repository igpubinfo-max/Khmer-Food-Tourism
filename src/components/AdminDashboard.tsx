import React, { useState } from 'react';
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

export const AdminDashboard: React.FC = () => {
  const { 
    isAdminOpen, setIsAdminOpen, language,
    foods, addFood, updateFood, deleteFood,
    restaurants, deleteRestaurant, approveRestaurant, toggleVerifyRestaurant,
    destinations, addDestination, updateDestination, deleteDestination,
    posts, deletePost,
    users, updateUserRole,
    transactions, verifyTransaction, rejectTransaction,
    appSettings, updateAppSettings, setAdminPassword, currentUser, showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'stats' | 'food' | 'restaurants' | 'destinations' | 'community' | 'users' | 'transactions' | 'settings' | 'security' | 'image_audit'>('stats');

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
  const [promotionalFeeUsd, setPromotionalFeeUsd] = useState(appSettings.promotionalFeeUsd || 4.99);
  const [promotionPeriodKh, setPromotionPeriodKh] = useState(appSettings.promotionPeriodKh || '');
  const [newAdminPass, setNewAdminPass] = useState('');

  // Transaction filter
  const [txnFilter, setTxnFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');

  // Security audit logs state
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>(() => getSecurityAuditLogs());

  if (!isAdminOpen) return null;

  const isKm = language === 'km';
  const pendingRestaurants = restaurants.filter(r => r.status === 'pending');
  const verifiedRestaurantsCount = restaurants.filter(r => r.isVerified).length;
  const pendingTxns = transactions.filter(t => t.status === 'pending_verification');

  const filteredTransactions = transactions.filter(t => {
    if (txnFilter === 'all') return true;
    if (txnFilter === 'pending') return t.status === 'pending_verification';
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
        className="relative w-full max-w-5xl h-[92vh] bg-stone-50 dark:bg-stone-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#A7DCA5]/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0B3D2E] via-[#14532D] to-[#0B3D2E] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-[#A7DCA5] border border-[#A7DCA5]/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-khmer text-white">
                  {isKm ? 'ផ្ទាំងគ្រប់គ្រងរដ្ឋបាលជាន់ខ្ពស់' : 'Administrator Control Center'}
                </h2>
                <span className="text-[10px] bg-[#228B4E] text-white font-bold px-2 py-0.5 rounded-full font-mono">
                  SINGLE AUTHORIZED ADMIN
                </span>
              </div>
              <p className="text-xs text-[#A7DCA5] font-khmer">
                {isKm 
                  ? 'គ្រប់គ្រងមុខម្ហូប (100) ហាងអាហារ (200+) ទេសចរណ៍ ការទូទាត់ $4.99 និងសន្តិសុខ' 
                  : 'Manage foods (100), restaurants (200+), destinations, $4.99 transactions, and security'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAdminOpen(false)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#A7DCA5] hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 overflow-x-auto no-scrollbar shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'stats' ? 'border-[#14532D] text-[#14532D] dark:text-[#A7DCA5]' : 'border-transparent text-stone-400'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{isKm ? 'ទិដ្ឋភាពរួម' : 'Overview'}</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition relative ${
              activeTab === 'transactions' ? 'border-[#14532D] text-[#14532D] dark:text-[#A7DCA5]' : 'border-transparent text-stone-400'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{isKm ? `ការទូទាត់ $4.99 (${transactions.length})` : `Payments (${transactions.length})`}</span>
            {pendingTxns.length > 0 && (
              <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[9px] font-bold">
                {pendingTxns.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('food')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'food' ? 'border-[#14532D] text-[#14532D] dark:text-[#A7DCA5]' : 'border-transparent text-stone-400'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>{isKm ? `មុខម្ហូប (${foods.length})` : `Foods (${foods.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('image_audit')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition relative ${
              activeTab === 'image_audit' ? 'border-[#14532D] text-[#14532D] dark:text-[#A7DCA5]' : 'border-transparent text-stone-400'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#228B4E]" />
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
              activeTab === 'restaurants' ? 'border-[#14532D] text-[#14532D] dark:text-[#A7DCA5]' : 'border-transparent text-stone-400'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>{isKm ? `ហាងអាហារ (${restaurants.length})` : `Shops (${restaurants.length})`}</span>
            {pendingRestaurants.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('destinations')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'destinations' ? 'border-[#14532D] text-[#14532D] dark:text-[#A7DCA5]' : 'border-transparent text-stone-400'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>{isKm ? `ទេសចរណ៍ (${destinations.length})` : `Destinations (${destinations.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('community')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'community' ? 'border-[#14532D] text-[#14532D] dark:text-[#A7DCA5]' : 'border-transparent text-stone-400'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{isKm ? `សហគមន៍ (${posts.length})` : `Feed (${posts.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'users' ? 'border-[#14532D] text-[#14532D] dark:text-[#A7DCA5]' : 'border-transparent text-stone-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isKm ? `អ្នកប្រើ (${users.length})` : `Users (${users.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'security' ? 'border-[#14532D] text-[#14532D] dark:text-[#A7DCA5]' : 'border-transparent text-stone-400'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span>{isKm ? 'សន្តិសុខ & Logs' : 'Security'}</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'settings' ? 'border-[#14532D] text-[#14532D] dark:text-[#A7DCA5]' : 'border-transparent text-stone-400'
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
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-[#A7DCA5]/30 dark:border-stone-700 shadow-xs">
                  <span className="text-stone-400 font-khmer text-xs">មុខម្ហូបខ្មែរសរុប</span>
                  <p className="text-2xl font-bold text-[#14532D] dark:text-[#A7DCA5] font-mono mt-2">{foods.length}</p>
                  <span className="text-[10px] text-[#228B4E] font-bold">✓ 200+ Disconnected Prices</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-[#A7DCA5]/30 dark:border-stone-700 shadow-xs">
                  <span className="text-stone-400 font-khmer text-xs">ហាងអាហារសរុប</span>
                  <p className="text-2xl font-bold text-[#228B4E] font-mono mt-2">{restaurants.length}</p>
                  <span className="text-[10px] text-stone-500 font-khmer">{verifiedRestaurantsCount} ហាងផ្ទៀងផ្ទាត់ផ្លូវការ</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-[#A7DCA5]/30 dark:border-stone-700 shadow-xs">
                  <span className="text-stone-400 font-khmer text-xs">ប្រតិបត្តិការ $4.99</span>
                  <p className="text-2xl font-bold text-[#14532D] dark:text-[#A7DCA5] font-mono mt-2">{transactions.length}</p>
                  <span className="text-[10px] text-[#228B4E] font-bold font-khmer">{pendingTxns.length} រង់ចាំផ្ទៀងផ្ទាត់</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-[#A7DCA5]/30 dark:border-stone-700 shadow-xs">
                  <span className="text-stone-400 font-khmer text-xs">តំបន់ទេសចរណ៍</span>
                  <p className="text-2xl font-bold text-[#183326] dark:text-stone-100 font-mono mt-2">{destinations.length}</p>
                  <span className="text-[10px] text-[#228B4E] font-bold font-khmer">២៥ ខេត្តក្រុង</span>
                </div>
              </div>

              {/* Pending Transactions Alert */}
              {pendingTxns.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#EAF6EC] dark:bg-[#0B3D2E]/50 border-2 border-[#228B4E] space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[#183326] dark:text-white flex items-center gap-1.5 font-khmer">
                      <CreditCard className="w-4 h-4 text-[#228B4E]" />
                      <span>{isKm ? `មានប្រតិបត្តិការចុះបញ្ជីថ្មី ${pendingTxns.length} រង់ចាំការផ្ទៀងផ្ទាត់ធនាគារ!` : `${pendingTxns.length} Pending $4.99 Registrations!`}</span>
                    </p>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="px-3 py-1 bg-[#14532D] hover:bg-[#0B3D2E] text-white rounded-lg font-khmer font-bold text-xs transition active:scale-95"
                    >
                      {isKm ? 'ពិនិត្យឥឡូវនេះ' : 'Review Now'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRANSACTIONS TAB ($4.99 Promotional Registrations) */}
          {activeTab === 'transactions' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-base">
                    {isKm ? 'ការទូទាត់ប្រាក់ចុះបញ្ជីហាង ($4.99 Registration Fee & Transactions)' : '$4.99 Registration Transactions'}
                  </h3>
                  <p className="text-stone-500 font-khmer text-xs">
                    {isKm ? 'ផ្ទៀងផ្ទាត់លេខកូដប្រតិបត្តិការ (Trx ID) ជាមួយធនាគារ មុននឹងធ្វើឱ្យហាងសកម្ម' : 'Verify bank transaction references before activating promoted restaurant listings'}
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl shrink-0">
                  <button
                    onClick={() => setTxnFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-khmer font-semibold ${txnFilter === 'all' ? 'bg-white dark:bg-stone-700 shadow text-[#183326] dark:text-white' : 'text-stone-500'}`}
                  >
                    {isKm ? 'ទាំងអស់' : 'All'} ({transactions.length})
                  </button>
                  <button
                    onClick={() => setTxnFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg font-khmer font-semibold ${txnFilter === 'pending' ? 'bg-[#14532D] text-white shadow' : 'text-stone-500'}`}
                  >
                    {isKm ? 'រង់ចាំ' : 'Pending'} ({pendingTxns.length})
                  </button>
                  <button
                    onClick={() => setTxnFilter('verified')}
                    className={`px-3 py-1.5 rounded-lg font-khmer font-semibold ${txnFilter === 'verified' ? 'bg-[#228B4E] text-white shadow' : 'text-stone-500'}`}
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
                  filteredTransactions.map((t) => (
                    <div 
                      key={t.id} 
                      className={`p-4 rounded-2xl border transition-all ${
                        t.status === 'pending_verification' 
                          ? 'bg-[#EAF6EC]/60 dark:bg-[#0B3D2E]/40 border-[#A7DCA5]' 
                          : t.status === 'verified'
                          ? 'bg-white dark:bg-stone-800 border-[#A7DCA5]/40 dark:border-stone-700'
                          : 'bg-red-50/40 dark:bg-stone-800 border-red-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#183326] dark:text-stone-200">{t.id}</span>
                            <span className={`px-2 py-0.5 rounded-full font-khmer font-bold text-[10px] ${
                              t.status === 'verified' 
                                ? 'bg-[#EAF6EC] text-[#14532D] dark:bg-[#14532D]/40 dark:text-[#A7DCA5]'
                                : t.status === 'pending_verification'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {t.status === 'verified' ? '✓ បានផ្ទៀងផ្ទាត់ & ធ្វើឱ្យសកម្ម' : t.status === 'pending_verification' ? '⏳ រង់ចាំការផ្ទៀងផ្ទាត់' : '✕ បានបដិសេធ'}
                            </span>
                            <span className="font-bold text-[#14532D] dark:text-[#A7DCA5] font-mono text-sm">${t.amountUsd} USD</span>
                          </div>

                          <div className="font-bold text-[#183326] dark:text-stone-100 font-khmer text-sm">
                            {t.restaurantNameKh}
                          </div>

                          <div className="text-[11px] text-stone-600 dark:text-stone-400 font-khmer space-x-2">
                            <span>ម្ចាស់ហាង៖ <strong>{t.ownerName}</strong></span>
                            {t.ownerPhone && <span>• 📞 {t.ownerPhone}</span>}
                            <span>• វិធីបង់៖ <strong className="font-mono">{t.paymentMethod}</strong></span>
                            <span>• កាលបរិច្ឆេទ៖ {t.createdAt}</span>
                          </div>

                          <div className="p-2 bg-stone-100 dark:bg-stone-900 rounded-xl font-mono text-xs flex items-center justify-between">
                            <span className="text-stone-500 font-khmer">Bank Ref / Trx ID:</span>
                            <span className="font-bold text-[#14532D] dark:text-[#A7DCA5]">{t.transactionRef}</span>
                          </div>
                        </div>

                        {/* Verification Actions */}
                        {t.status === 'pending_verification' && (
                          <div className="flex sm:flex-col gap-2 shrink-0">
                            <button
                              onClick={() => verifyTransaction(t.id)}
                              className="px-3.5 py-2 rounded-xl bg-[#14532D] hover:bg-[#0B3D2E] text-white font-khmer font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition active:scale-95"
                            >
                              <Check className="w-4 h-4 text-[#A7DCA5]" />
                              <span>{isKm ? 'ផ្ទៀងផ្ទាត់ & ធ្វើឱ្យសកម្ម' : 'Verify & Activate'}</span>
                            </button>

                            <button
                              onClick={() => rejectTransaction(t.id, 'Transaction ID could not be verified on bank statement.')}
                              className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-rose-600 hover:text-white text-stone-700 dark:text-stone-300 font-khmer font-medium text-xs transition"
                            >
                              <span>{isKm ? 'បដិសេធ' : 'Reject'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Promotional Settings Editor */}
              <div className="p-5 bg-white dark:bg-stone-800 rounded-3xl border border-[#A7DCA5]/40 dark:border-stone-700 space-y-3 font-khmer">
                <h4 className="font-bold text-[#183326] dark:text-stone-100 text-sm flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-[#228B4E]" />
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
                      onChange={e => setPromotionalFeeUsd(parseFloat(e.target.value) || 4.99)}
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
                      placeholder="តម្លៃប្រូម៉ូសិនពិសេស៖ $4.99 USD"
                      className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 font-khmer"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-[#14532D] hover:bg-[#0B3D2E] text-white font-bold rounded-xl text-xs transition active:scale-95 shadow-xs"
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
                <h3 className="font-bold text-[#183326] dark:text-stone-100 font-khmer text-sm">
                  {isKm ? `គ្រប់គ្រងបញ្ជីមុខម្ហូបខ្មែរ (សរុប ${foods.length} មុខ - គ្មានតម្លៃលើរូបភាព)` : `Manage Khmer Foods (${foods.length} items - No Prices on Pictures)`}
                </h3>
                <button
                  onClick={() => setShowAddFoodForm(!showAddFoodForm)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#14532D] text-white font-bold hover:bg-[#0B3D2E] font-khmer transition active:scale-95 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#A7DCA5]" />
                  <span>{showAddFoodForm ? (isKm ? 'បិទ' : 'Close') : (isKm ? 'បញ្ចូលមុខម្ហូបថ្មី' : 'Add Food')}</span>
                </button>
              </div>

              {showAddFoodForm && (
                <form onSubmit={handleCreateFood} className="p-4 rounded-2xl bg-[#EAF6EC]/70 dark:bg-stone-800 border border-[#A7DCA5]/40 dark:border-stone-700 space-y-3 font-khmer">
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

                  <div>
                    <label className="block font-medium mb-1">រូបភាព (Photo URL)</label>
                    <input
                      type="url"
                      value={newFoodPhotoUrl}
                      onChange={(e) => setNewFoodPhotoUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#14532D] text-white font-bold hover:bg-[#0B3D2E] font-khmer transition active:scale-95 shadow-xs"
                  >
                    {isKm ? 'រក្សាទុកមុខម្ហូប' : 'Save Food Item'}
                  </button>
                </form>
              )}

              {/* Food List */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                {foods.map((food) => (
                  <div key={food.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-[#A7DCA5]/30 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img src={food.photoUrl} alt="food" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#A7DCA5]/40" />
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-[#183326] dark:text-stone-100 font-khmer truncate">{food.nameKh}</h4>
                        <p className="text-[10px] text-stone-400 truncate">
                          {food.nameEn} • {food.categoryKh}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedFoodForImageEdit(food)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#EAF6EC] hover:bg-[#A7DCA5]/40 text-[#14532D] dark:bg-[#14532D]/50 dark:text-[#A7DCA5] font-bold text-[11px] font-khmer flex items-center gap-1 transition shadow-2xs border border-[#A7DCA5]/40"
                        title={isKm ? 'ផ្លាស់ប្តូររូបភាពពីទូរស័ព្ទ/កុំព្យូទ័រ' : 'Change photo from phone or computer'}
                      >
                        <Camera className="w-3.5 h-3.5 text-[#228B4E]" />
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
                  <h3 className="font-bold text-[#183326] dark:text-stone-100 font-khmer text-sm">
                    {isKm ? `គ្រប់គ្រងហាងអាហារ (សរុប ${restaurants.length} ហាង)` : `Manage Restaurants (${restaurants.length} shops)`}
                  </h3>
                  <p className="text-[10px] text-stone-400 font-khmer">
                    {isKm ? `${verifiedRestaurantsCount} ហាងផ្ទៀងផ្ទាត់ផ្លូវការ • ${restaurants.length - verifiedRestaurantsCount} គំរូសហគមន៍` : `${verifiedRestaurantsCount} verified • ${restaurants.length - verifiedRestaurantsCount} community listings`}
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                {restaurants.map((rest) => (
                  <div key={rest.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-[#A7DCA5]/30 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img src={rest.photoUrl} alt="rest" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#A7DCA5]/40" />
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-[#183326] dark:text-stone-100 font-khmer truncate">{rest.nameKh}</h4>
                          {rest.isVerified && <span className="text-[#228B4E] text-[10px] font-bold">✓ Verified</span>}
                          {rest.isPromoted && <span className="text-[#14532D] dark:text-[#A7DCA5] text-[10px] font-bold">★ Promoted</span>}
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

          {/* DESTINATIONS TAB */}
          {activeTab === 'destinations' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-stone-200 dark:border-stone-700">
                <div>
                  <h3 className="font-bold text-[#183326] dark:text-stone-100 font-khmer text-sm flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#228B4E]" />
                    <span>{isKm ? `តំបន់ទេសចរណ៍ខ្មែរ (${destinations.length} កន្លែង)` : `Tourist Destinations (${destinations.length})`}</span>
                  </h3>
                  <p className="text-[11px] text-stone-500 font-khmer">
                    {isKm ? 'គ្រប់គ្រងព័ត៌មាន និងផ្លាស់ប្តូររូបភាពតំបន់ទេសចរណ៍ពីទូរស័ព្ទ ឬកុំព្យូទ័រ' : 'Manage destinations and replace photos from phone or computer'}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddDestForm(!showAddDestForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14532D] text-white font-bold hover:bg-[#0B3D2E] font-khmer text-xs shadow-xs self-start sm:self-auto transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 text-[#A7DCA5]" />
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
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs font-khmer focus:outline-none focus:border-[#228B4E]"
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
                        ? 'bg-[#14532D] text-white shadow-xs' 
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
                            ? 'bg-[#14532D] text-white font-bold shadow-xs' 
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
                <form onSubmit={handleCreateDestination} className="p-4 rounded-2xl bg-[#EAF6EC]/70 dark:bg-stone-800 border border-[#A7DCA5]/40 dark:border-stone-700 space-y-3 font-khmer">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={newDestNameKh}
                      onChange={(e) => setNewDestNameKh(e.target.value)}
                      placeholder="ឈ្មោះកន្លែងទេសចរណ៍ *"
                      className="px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700 text-xs focus:outline-none focus:border-[#228B4E]"
                    />
                    <input
                      type="text"
                      value={newDestProvince}
                      onChange={(e) => setNewDestProvince(e.target.value)}
                      placeholder="ខេត្ត / ក្រុង"
                      className="px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700 text-xs focus:outline-none focus:border-[#228B4E]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#14532D] text-white font-bold hover:bg-[#0B3D2E] font-khmer text-xs transition active:scale-95 shadow-xs"
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
                      className="p-3 bg-white dark:bg-stone-800/90 rounded-2xl border border-[#A7DCA5]/30 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-[#A7DCA5] transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Thumbnail with quick click to edit photo */}
                        <div 
                          onClick={() => setSelectedDestForImageEdit(d)}
                          className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-700 shrink-0 cursor-pointer group border border-[#A7DCA5]/40"
                          title={isKm ? 'ចុចដើម្បីប្តូររូបភាព' : 'Click to change photo'}
                        >
                          <img 
                            src={d.photoUrl} 
                            alt={d.nameKh} 
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-200" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                            <Camera className="w-4 h-4 text-[#A7DCA5]" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                              {d.id}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EAF6EC] text-[#14532D] border border-[#A7DCA5]/40 font-khmer">
                              {d.provinceKh}
                            </span>
                          </div>
                          <h4 className="font-bold text-[#183326] dark:text-stone-100 font-khmer text-xs truncate mt-0.5">
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
                          className="px-3 py-1.5 rounded-xl bg-[#EAF6EC] hover:bg-[#A7DCA5]/40 dark:bg-[#14532D]/40 dark:hover:bg-[#14532D]/60 text-[#14532D] dark:text-[#A7DCA5] border border-[#A7DCA5]/40 font-khmer font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#228B4E]" />
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
              <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-sm">
                {isKm ? `អ្នកប្រើប្រាស់ក្នុងប្រព័ន្ធ (${users.length} គណនី)` : `User Accounts (${users.length})`}
              </h3>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                {users.map((u) => (
                  <div key={u.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer">{u.name}</h4>
                        <p className="text-[10px] text-stone-400">{u.email} • 📞 {u.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-100 dark:bg-stone-700 font-mono">
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
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
                    className="px-5 py-2.5 bg-gradient-to-r from-[#14532D] to-[#228B4E] hover:from-[#0B3D2E] hover:to-[#14532D] text-white font-bold rounded-xl shadow-md transition-all font-khmer text-xs active:scale-95"
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
                      className="px-5 py-2.5 bg-[#14532D] hover:bg-[#0B3D2E] text-white font-bold rounded-xl shadow-md transition-all font-khmer text-xs active:scale-95"
                    >
                      {isKm ? 'រក្សាទុកព័ត៌មាន KHQR' : 'Save KHQR Configuration'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Management */}
              <div className="bg-white dark:bg-stone-800 p-5 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-4 font-khmer">
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-200 dark:border-stone-700">
                  <KeyRound className="w-5 h-5 text-[#228B4E]" />
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
                    className="px-5 py-2.5 bg-[#14532D] hover:bg-[#0B3D2E] text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center gap-2 active:scale-95"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#A7DCA5]" />
                    <span>{isKm ? 'Hash PBKDF2 និងផ្លាស់ប្តូរ' : 'Hash PBKDF2 & Update'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* AI IMAGE AUDIT & REPLACEMENT TAB */}
          {activeTab === 'image_audit' && (
            <div className="space-y-6">
              {/* Header & Description */}
              <div className="bg-gradient-to-r from-[#0B3D2E] via-[#14532D] to-[#0B3D2E] text-white p-6 rounded-3xl border border-[#A7DCA5]/40 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 text-[#A7DCA5] rounded-2xl border border-[#A7DCA5]/30">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-moul text-base text-white">
                      {isKm ? 'សវនកម្មរូបភាពម្ហូបខ្មែរ AI & ការផ្ទៀងផ្ទាត់' : 'AI Food Image Audit & Verification'}
                    </h3>
                    <p className="text-xs text-[#A7DCA5] font-khmer">
                      {isKm 
                        ? 'ការត្រួតពិនិត្យរូបភាពមុខម្ហូបខ្មែរទាំង ១០០ មុខ ដើម្បីធានាភាពត្រឹមត្រូវតាមឈ្មោះមុខម្ហូបពិតប្រាកដ និងដកភាពជាន់គ្នាចេញ ១០០%'
                        : 'Audit and replacement of 100 Cambodian dish images ensuring authentic culinary representation and 0% duplicates.'}
                    </p>
                  </div>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-[#A7DCA5] font-khmer">{isKm ? 'មុខម្ហូបសរុបបាន Audit' : 'Total Dishes Audited'}</div>
                    <div className="text-2xl font-bold font-mono text-white mt-1">{foods.length}</div>
                    <div className="text-[9px] text-[#A7DCA5] font-khmer mt-0.5">✓ គ្រប់មុខម្ហូបទាំងអស់</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-[#A7DCA5] font-khmer">{isKm ? 'ផ្ទៀងផ្ទាត់ត្រឹមត្រូវ ១០០%' : 'Verified & Accurate'}</div>
                    <div className="text-2xl font-bold font-mono text-[#A7DCA5] mt-1">{verifiedFoods.length}</div>
                    <div className="text-[9px] text-[#A7DCA5] font-khmer mt-0.5">✓ រូបភាពច្បាស់តាមមុខម្ហូប</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-[#A7DCA5] font-khmer">{isKm ? 'ដកភាពជាន់គ្នាចេញ' : 'Duplicates Resolved'}</div>
                    <div className="text-2xl font-bold font-mono text-white mt-1">228</div>
                    <div className="text-[9px] text-[#A7DCA5] font-khmer mt-0.5">0% Duplication rate</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                    <div className="text-[10px] text-[#A7DCA5] font-khmer">{isKm ? 'រង់ចាំរដ្ឋបាលពិនិត្យ' : 'Pending Admin Review'}</div>
                    <div className="text-2xl font-bold font-mono text-white mt-1">{flaggedFoods.length}</div>
                    <div className="text-[9px] text-[#A7DCA5] font-khmer mt-0.5">{flaggedFoods.length > 0 ? 'ទាមទារការសម្រេច' : 'រួចរាល់ទាំងអស់'}</div>
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
                              className="flex-1 py-2 px-3 bg-[#14532D] hover:bg-[#0B3D2E] text-white font-bold rounded-xl text-xs font-khmer flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5 text-[#A7DCA5]" />
                              <span>{isKm ? 'យល់ព្រមរូបភាពនេះ' : 'Approve Photo'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedFoodForImageEdit(food)}
                              className="py-2 px-3 bg-[#228B4E] hover:bg-[#14532D] text-white font-bold rounded-xl text-xs font-khmer flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                            >
                              <Camera className="w-3.5 h-3.5 text-[#A7DCA5]" />
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
              <div className="bg-white dark:bg-stone-800 p-5 rounded-3xl border border-[#A7DCA5]/30 dark:border-stone-700 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-700">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#228B4E]" />
                    <div>
                      <h4 className="font-bold text-[#183326] dark:text-stone-100 font-khmer text-sm">
                        {isKm ? `កាតាឡុកមុខម្ហូបទាំងអស់ (${foods.length})` : `Full Catalog Image Browser (${foods.length})`}
                      </h4>
                      <p className="text-[11px] text-stone-500 font-khmer">
                        {isKm ? 'ស្វែងរក និងត្រួតពិនិត្យរូបភាពមុខម្ហូបទាំងអស់ក្នុងប្រព័ន្ធ' : 'Search and audit all dish images'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Filter Pills */}
                    <div className="flex bg-[#EAF6EC] dark:bg-stone-900 p-1 rounded-xl text-[11px] font-khmer border border-[#A7DCA5]/40">
                      <button
                        onClick={() => setAuditFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          auditFilter === 'all' ? 'bg-white dark:bg-stone-800 text-[#14532D] shadow-xs' : 'text-stone-500'
                        }`}
                      >
                        {isKm ? `ទាំងអស់ (${foods.length})` : `All (${foods.length})`}
                      </button>
                      <button
                        onClick={() => setAuditFilter('verified')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          auditFilter === 'verified' ? 'bg-white dark:bg-stone-800 text-[#228B4E] shadow-xs' : 'text-stone-500'
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
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-xs font-khmer focus:outline-none focus:border-[#228B4E]"
                  />
                </div>

                {/* Grid of Dishes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto p-1">
                  {filteredAuditFoods.map(food => (
                    <div 
                      key={food.id}
                      className="p-3 rounded-2xl border border-[#A7DCA5]/30 dark:border-stone-700 bg-white dark:bg-stone-900/50 flex gap-3 items-center hover:border-[#A7DCA5] transition shadow-xs"
                    >
                      <img 
                        src={food.photoUrl} 
                        alt={food.nameKh}
                        className="w-16 h-16 object-cover rounded-xl border border-[#A7DCA5]/40 shrink-0" 
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[9px] font-bold text-stone-500">
                            {food.id}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#EAF6EC] dark:bg-stone-800 text-[#14532D] dark:text-[#A7DCA5] font-khmer">
                            {food.categoryKh}
                          </span>
                        </div>
                        <h6 className="font-bold text-[#183326] dark:text-stone-100 font-khmer text-xs truncate">
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
                            <span className="text-[9px] font-bold text-[#228B4E] bg-[#EAF6EC] dark:bg-emerald-950/60 px-1.5 py-0.2 rounded font-khmer flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {isKm ? 'ផ្ទៀងផ្ទាត់ហើយ' : 'Verified'}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedFoodForImageEdit(food)}
                            className="text-[10px] font-bold text-[#14532D] dark:text-[#A7DCA5] hover:text-[#228B4E] hover:underline font-khmer flex items-center gap-0.5"
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

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Shield, Utensils, Store, Compass, MessageSquare, 
  Users, Plus, Trash2, CheckCircle2, AlertTriangle, Settings, QrCode, Heart, KeyRound, Lock, ExternalLink
} from 'lucide-react';
import { FoodCategorySlug, DestinationCategorySlug, UserRole } from '../types';

export const AdminDashboard: React.FC = () => {
  const { 
    isAdminOpen, setIsAdminOpen, language,
    foods, addFood, deleteFood,
    restaurants, deleteRestaurant, approveRestaurant, toggleVerifyRestaurant,
    destinations, addDestination, deleteDestination,
    posts, deletePost,
    users, updateUserRole,
    appSettings, updateAppSettings, setAdminPassword, currentUser
  } = useApp();

  const [activeTab, setActiveTab] = useState<'stats' | 'food' | 'restaurants' | 'destinations' | 'community' | 'users' | 'settings'>('stats');

  // Form states for Food
  const [newFoodNameKh, setNewFoodNameKh] = useState('');
  const [newFoodNameEn, setNewFoodNameEn] = useState('');
  const [newFoodCategory, setNewFoodCategory] = useState<FoodCategorySlug>('soup');
  const [newFoodPriceRiel, setNewFoodPriceRiel] = useState(18000);
  const [newFoodPriceUsd, setNewFoodPriceUsd] = useState(4.5);
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

  // Form states for Settings
  const [apkUrl, setApkUrl] = useState(appSettings.apkDownloadUrl);
  const [playStoreUrl, setPlayStoreUrl] = useState(appSettings.playStoreUrl);
  const [appStoreUrl, setAppStoreUrl] = useState(appSettings.appStoreUrl);
  const [supportQrUrl, setSupportQrUrl] = useState(appSettings.supportQrImageUrl);
  const [bankName, setBankName] = useState(appSettings.supportBankName);
  const [accountName, setAccountName] = useState(appSettings.supportAccountName);
  const [supportMessageKh, setSupportMessageKh] = useState(appSettings.supportMessageKh);
  const [newAdminPass, setNewAdminPass] = useState('');

  if (!isAdminOpen) return null;

  const isKm = language === 'km';
  const pendingRestaurants = restaurants.filter(r => r.status === 'pending');
  const verifiedRestaurantsCount = restaurants.filter(r => r.isVerified).length;

  // Handlers
  const handleCreateFood = (e: React.FormEvent) => {
    e.preventDefault();
    addFood({
      nameKh: newFoodNameKh,
      nameEn: newFoodNameEn || newFoodNameKh,
      categorySlug: newFoodCategory,
      categoryKh: newFoodCategory === 'soup' ? 'សម្ល & អាម៉ុក' : newFoodCategory === 'stirfry' ? 'ម្ហូបឆា' : 'ម្ហូបខ្មែរ',
      categoryEn: newFoodCategory,
      descriptionKh: newFoodDescKh,
      descriptionEn: newFoodDescKh,
      photoUrl: newFoodPhotoUrl,
      prepTime: '២០ នាទី',
      cookTime: newFoodCookTime,
      servings: '២-៣ នាក់',
      difficulty: 'medium',
      calories: 350,
      priceRiel: Number(newFoodPriceRiel),
      priceUsd: Number(newFoodPriceUsd),
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
    });
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPass) return;
    await setAdminPassword(newAdminPass);
    setNewAdminPass('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-4xl h-[92vh] bg-stone-50 dark:bg-stone-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-amber-950/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-950 via-stone-900 to-red-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-khmer">
                  {isKm ? 'ផ្ទាំងគ្រប់គ្រងរដ្ឋបាលជាន់ខ្ពស់' : 'Administrator Control Center'}
                </h2>
                <span className="text-[10px] bg-amber-500 text-stone-950 font-bold px-2 py-0.5 rounded-full">
                  Chea Savuth
                </span>
              </div>
              <p className="text-xs text-stone-300 font-khmer">
                {isKm ? 'គ្រប់គ្រងមុខម្ហូប ហាងអាហារ ទេសចរណ៍ សហគមន៍ និងការកំណត់ QR Code' : 'Manage foods, restaurants, tourism, community, and QR configuration'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAdminOpen(false)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <X className="w-5 h-5 text-stone-200" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 overflow-x-auto no-scrollbar shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'stats' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-400'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{isKm ? 'ទិដ្ឋភាពរួម' : 'Overview'}</span>
          </button>

          <button
            onClick={() => setActiveTab('food')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'food' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-400'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>{isKm ? `មុខម្ហូប (${foods.length})` : `Foods (${foods.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('restaurants')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition relative ${
              activeTab === 'restaurants' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-400'
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
              activeTab === 'destinations' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-400'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>{isKm ? `ទេសចរណ៍ (${destinations.length})` : `Destinations (${destinations.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('community')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'community' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-400'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{isKm ? `សហគមន៍ (${posts.length})` : `Feed (${posts.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'users' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isKm ? `អ្នកប្រើ (${users.length})` : `Users (${users.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'settings' ? 'border-red-600 text-red-600' : 'border-transparent text-stone-400'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{isKm ? 'ការកំណត់ QR Code & ប្រព័ន្ធ' : 'App & QR Settings'}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 text-xs">
          {/* STATS OVERVIEW */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 font-khmer">
                      {isKm ? 'មុខម្ហូបខ្មែរ (100+)' : 'Khmer Foods'}
                    </span>
                    <Utensils className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">{foods.length}</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-stone-800 border border-emerald-200 dark:border-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 font-khmer">
                      {isKm ? 'ហាងអាហារ (100+)' : 'Restaurants'}
                    </span>
                    <Store className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">{restaurants.length}</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    {verifiedRestaurantsCount} {isKm ? 'ផ្ទៀងផ្ទាត់ផ្លូវការ' : 'verified'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-stone-800 border border-blue-200 dark:border-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 font-khmer">
                      {isKm ? 'តំបន់ទេសចរណ៍' : 'Destinations'}
                    </span>
                    <Compass className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">{destinations.length}</p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-stone-800 border border-rose-200 dark:border-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 font-khmer">
                      {isKm ? 'ការបង្ហោះសហគមន៍' : 'Community Posts'}
                    </span>
                    <MessageSquare className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">{posts.length}</p>
                </div>
              </div>

              {/* Pending approval notification */}
              {pendingRestaurants.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-stone-800 border border-amber-300 space-y-2">
                  <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 font-khmer">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>{isKm ? 'មានសំណើចុះបញ្ជីហាងអាហារថ្មីរង់ចាំការត្រួតពិនិត្យ!' : 'Pending Restaurant Submissions:'}</span>
                  </p>
                  {pendingRestaurants.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-stone-700 rounded-xl">
                      <div>
                        <p className="font-bold text-stone-900 dark:text-white font-khmer">{r.nameKh}</p>
                        <p className="text-[10px] text-stone-500">{r.addressKh} • 📞 {r.phone}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveRestaurant(r.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-khmer"
                        >
                          {isKm ? 'អនុម័ត' : 'Approve'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FOODS TAB */}
          {activeTab === 'food' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer">
                  {isKm ? `គ្រប់គ្រងបញ្ជីមុខម្ហូបខ្មែរ (សរុប ${foods.length} មុខ)` : `Manage Khmer Foods (${foods.length} items)`}
                </h3>
                <button
                  onClick={() => setShowAddFoodForm(!showAddFoodForm)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-500 font-khmer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddFoodForm ? (isKm ? 'បិទបែបបទ' : 'Close') : (isKm ? 'បញ្ចូលមុខម្ហូបថ្មី' : 'Add Food')}</span>
                </button>
              </div>

              {showAddFoodForm && (
                <form onSubmit={handleCreateFood} className="p-4 rounded-2xl bg-amber-50/70 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 space-y-3 font-khmer">
                  <h4 className="font-bold text-amber-900 dark:text-amber-200">
                    {isKm ? 'បញ្ចូលមុខម្ហូបខ្មែរថ្មី' : 'New Dish Information'}
                  </h4>
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

                  <div className="grid grid-cols-3 gap-2">
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
                      <label className="block font-medium mb-1">តម្លៃរៀល (៛)</label>
                      <input
                        type="number"
                        value={newFoodPriceRiel}
                        onChange={(e) => setNewFoodPriceRiel(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                      />
                    </div>

                    <div>
                      <label className="block font-medium mb-1">តម្លៃដុល្លារ ($)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={newFoodPriceUsd}
                        onChange={(e) => setNewFoodPriceUsd(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                      />
                    </div>
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

                  <div>
                    <label className="block font-medium mb-1">ការពិពណ៌នាអំពីមុខម្ហូប</label>
                    <textarea
                      rows={2}
                      value={newFoodDescKh}
                      onChange={(e) => setNewFoodDescKh(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-500 font-khmer"
                  >
                    {isKm ? 'រក្សាទុកមុខម្ហូប' : 'Save Food Item'}
                  </button>
                </form>
              )}

              {/* Food List */}
              <div className="space-y-2 max-h-[55vh] overflow-y-auto no-scrollbar">
                {foods.map((food) => (
                  <div key={food.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img src={food.photoUrl} alt="food" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer truncate">{food.nameKh}</h4>
                        <p className="text-[10px] text-stone-400 truncate">
                          {food.nameEn} • {food.priceRiel.toLocaleString()} ៛ (${food.priceUsd}) • {food.categoryKh}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteFood(food.id)}
                      className="p-2 text-stone-400 hover:text-rose-600 rounded-lg shrink-0"
                      title="លុប"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer">
                    {isKm ? `គ្រប់គ្រង និងផ្ទៀងផ្ទាត់ហាងអាហារ (សរុប ${restaurants.length} ហាង)` : `Manage & Verify Restaurants (${restaurants.length} shops)`}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-khmer">
                    {isKm ? `${verifiedRestaurantsCount} ហាងផ្ទៀងផ្ទាត់ផ្លូវការ • ${restaurants.length - verifiedRestaurantsCount} ហាងគំរូ/មិនទាន់ផ្ទៀងផ្ទាត់` : `${verifiedRestaurantsCount} verified • ${restaurants.length - verifiedRestaurantsCount} unverified`}
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                {restaurants.map((rest) => (
                  <div key={rest.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img src={rest.photoUrl} alt="rest" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer truncate">{rest.nameKh}</h4>
                          
                          {/* Verification Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            rest.isVerified ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {rest.isVerified ? (isKm ? '✓ ផ្ទៀងផ្ទាត់រួច' : '✓ Verified') : (isKm ? '⚠️ មិនទាន់ផ្ទៀងផ្ទាត់' : '⚠️ Unverified')}
                          </span>

                          {/* Approval Status */}
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                            rest.status === 'approved' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {rest.status === 'approved' ? 'Approved' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400 truncate">
                          {rest.provinceKh} • 📞 {rest.phone} • {rest.priceLevel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Toggle Verification */}
                      <button
                        onClick={() => toggleVerifyRestaurant(rest.id)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                          rest.isVerified 
                            ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                        title={rest.isVerified ? 'ដកការផ្ទៀងផ្ទាត់' : 'ផ្ទៀងផ្ទាត់ផ្លូវការ'}
                      >
                        {rest.isVerified ? (isKm ? 'ដកផ្ទៀងផ្ទាត់' : 'Unverify') : (isKm ? 'ផ្ទៀងផ្ទាត់' : 'Verify')}
                      </button>

                      {rest.status !== 'approved' && (
                        <button
                          onClick={() => approveRestaurant(rest.id)}
                          className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-bold text-[10px]"
                        >
                          {isKm ? 'អនុម័ត' : 'Approve'}
                        </button>
                      )}

                      <button
                        onClick={() => deleteRestaurant(rest.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                        title="លុប"
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
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer">
                  {isKm ? `គ្រប់គ្រងតំបន់ទេសចរណ៍ (សរុប ${destinations.length})` : `Manage Tourist Spots (${destinations.length})`}
                </h3>
                <button
                  onClick={() => setShowAddDestForm(!showAddDestForm)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 font-khmer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddDestForm ? (isKm ? 'បិទបែបបទ' : 'Close') : (isKm ? 'បញ្ចូលកន្លែងថ្មី' : 'Add Destination')}</span>
                </button>
              </div>

              {showAddDestForm && (
                <form onSubmit={handleCreateDestination} className="p-4 rounded-2xl bg-blue-50/70 dark:bg-stone-800 border border-blue-200 dark:border-stone-700 space-y-3 font-khmer">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200">
                    {isKm ? 'បញ្ចូលតំបន់ទេសចរណ៍ថ្មី' : 'New Destination'}
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium mb-1">ឈ្មោះខ្មែរ *</label>
                      <input
                        type="text"
                        required
                        value={newDestNameKh}
                        onChange={(e) => setNewDestNameKh(e.target.value)}
                        placeholder="ប្រាសាទបន្ទាយស្រី"
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">ឈ្មោះអង់គ្លេស</label>
                      <input
                        type="text"
                        value={newDestNameEn}
                        onChange={(e) => setNewDestNameEn(e.target.value)}
                        placeholder="Banteay Srei Temple"
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-medium mb-1">ប្រភេទ</label>
                      <select
                        value={newDestCategory}
                        onChange={(e) => setNewDestCategory(e.target.value as DestinationCategorySlug)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                      >
                        <option value="temple">ប្រាសាទ / Temple</option>
                        <option value="nature">ធម្មជាតិ & ទឹកធ្លាក់ / Nature</option>
                        <option value="mountain">ភ្នំ / Mountain</option>
                        <option value="beach">ឆ្នេរសមុទ្រ / Beach</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium mb-1">ខេត្ត</label>
                      <input
                        type="text"
                        value={newDestProvince}
                        onChange={(e) => setNewDestProvince(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                      />
                    </div>

                    <div>
                      <label className="block font-medium mb-1">តម្លៃសំបុត្រ</label>
                      <input
                        type="text"
                        value={newDestFee}
                        onChange={(e) => setNewDestFee(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">រូបភាព (Photo URL)</label>
                    <input
                      type="url"
                      value={newDestPhotoUrl}
                      onChange={(e) => setNewDestPhotoUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">ការពិពណ៌នា</label>
                    <textarea
                      rows={2}
                      value={newDestDescKh}
                      onChange={(e) => setNewDestDescKh(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 font-khmer"
                  >
                    {isKm ? 'រក្សាទុកទីតាំងទេសចរណ៍' : 'Save Destination'}
                  </button>
                </form>
              )}

              <div className="space-y-2">
                {destinations.map((dest) => (
                  <div key={dest.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={dest.photoUrl} alt="dest" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      <div>
                        <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer">{dest.nameKh}</h4>
                        <p className="text-[10px] text-stone-400">
                          {dest.provinceKh} • {dest.categoryKh} • {dest.entranceFeeKh}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteDestination(dest.id)}
                      className="p-2 text-stone-400 hover:text-rose-600 rounded-lg"
                      title="លុប"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COMMUNITY POSTS MODERATION */}
          {activeTab === 'community' && (
            <div className="space-y-4">
              <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer">
                {isKm ? 'ត្រួតពិនិត្យការបង្ហោះសហគមន៍' : 'Community Moderation'}
              </h3>

              <div className="space-y-2">
                {posts.map((post) => (
                  <div key={post.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={post.photoUrl} alt="post" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      <div>
                        <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer">{post.titleKh}</h4>
                        <p className="text-[10px] text-stone-400">
                          {post.authorName} • {post.categoryTag} • {post.likesCount} ❤️ • {post.comments.length} 💬
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => deletePost(post.id)}
                      className="p-2 text-stone-400 hover:text-rose-600 rounded-lg"
                      title="លុបការបង្ហោះមិនសមរម្យ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer">
                {isKm ? 'គ្រប់គ្រងអ្នកប្រើប្រាស់ និងសិទ្ធិ' : 'User Management & Permissions'}
              </h3>

              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt="user" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer">{u.name}</h4>
                          {u.name.toLowerCase().includes('savuth') && (
                            <span className="text-[9px] bg-amber-500 text-stone-950 px-1.5 py-0.2 rounded font-bold">Admin</span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400">{u.email} • {u.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={u.role}
                        onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                        className="px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-[11px] font-semibold"
                      >
                        <option value="user">User</option>
                        <option value="owner">Shop Owner</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS & QR CODES TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* App Download Links & Install QR Configuration */}
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
                      className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
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
                        className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
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
                        className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-800 hover:to-amber-700 text-white font-bold rounded-xl shadow-md transition-all font-khmer text-xs"
                    >
                      {isKm ? 'រក្សាទុកតំណភ្ជាប់ដំឡើង' : 'Save Download Configuration'}
                    </button>
                  </div>
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
                  {/* QR Preview Frame */}
                  <div className="flex flex-col items-center justify-center p-3 bg-stone-50 dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <span className="text-[10px] text-stone-400 font-khmer mb-2">រូបភាព QR បច្ចុប្បន្ន</span>
                    <img 
                      src={supportQrUrl} 
                      alt="Support KHQR Preview" 
                      className="w-36 h-auto max-h-48 object-contain rounded-xl border border-stone-300 shadow-sm"
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/donation-qr.png';
                      }}
                    />
                  </div>

                  {/* Settings fields */}
                  <div className="sm:col-span-2 space-y-3 font-khmer">
                    <div>
                      <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                        {isKm ? 'ទីតាំងរូបភាព QR Code (Image URL)' : 'KHQR Image URL'}
                      </label>
                      <input
                        type="text"
                        value={supportQrUrl}
                        onChange={e => setSupportQrUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
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

                    <div>
                      <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                        {isKm ? 'សារអំពាវនាវឧបត្ថម្ភ (Khmer)' : 'Support Message (Khmer)'}
                      </label>
                      <textarea
                        rows={2}
                        value={supportMessageKh}
                        onChange={e => setSupportMessageKh(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100 resize-none"
                      />
                    </div>

                    <button
                      onClick={handleSaveSettings}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-all font-khmer text-xs"
                    >
                      {isKm ? 'រក្សាទុកព័ត៌មាន KHQR' : 'Save KHQR Configuration'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Administrator Security & Password Management */}
              <div className="bg-white dark:bg-stone-800 p-5 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-4 font-khmer">
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-200 dark:border-stone-700">
                  <KeyRound className="w-5 h-5 text-amber-600" />
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      {isKm ? 'សុវត្ថិភាពគណនីរដ្ឋបាល Chea Savuth' : 'Chea Savuth Account Security'}
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      {isKm ? 'ផ្លាស់ប្តូរពាក្យសម្ងាត់រដ្ឋបាលដោយប្រើប្រាស់ Web Crypto SHA-256 + Salt' : 'Update secure hashed admin credentials'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleChangeAdminPassword} className="space-y-3 max-w-md">
                  <div>
                    <label className="block font-semibold mb-1 text-stone-700 dark:text-stone-300">
                      {isKm ? 'ពាក្យសម្ងាត់ថ្មី (New Password)' : 'New Admin Password'}
                    </label>
                    <input
                      type="password"
                      value={newAdminPass}
                      onChange={e => setNewAdminPass(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 rounded-xl border bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-100"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-stone-900 hover:bg-black text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isKm ? 'ផ្លាស់ប្តូរ និង Hash ពាក្យសម្ងាត់' : 'Hash & Update Password'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

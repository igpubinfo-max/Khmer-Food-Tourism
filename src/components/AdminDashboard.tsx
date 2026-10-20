import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Shield, Utensils, Store, Compass, MessageSquare, 
  Users, Plus, Trash2, CheckCircle2, AlertTriangle, Eye, BarChart3, Edit
} from 'lucide-react';
import { FoodCategorySlug, DestinationCategorySlug, UserRole } from '../types';

export const AdminDashboard: React.FC = () => {
  const { 
    isAdminOpen, setIsAdminOpen, language,
    foods, addFood, deleteFood,
    restaurants, addRestaurant, deleteRestaurant, approveRestaurant,
    destinations, addDestination, deleteDestination,
    posts, deletePost,
    users, updateUserRole
  } = useApp();

  const [activeTab, setActiveTab] = useState<'stats' | 'food' | 'restaurants' | 'destinations' | 'community' | 'users'>('stats');

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

  if (!isAdminOpen) return null;

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
      highlightsKh: ['ទេសភាពស្រស់ស្អាត', 'ខ្យល់អាកាសបរិសុទ្ធ'],
    });
    setNewDestNameKh('');
    setNewDestDescKh('');
    setShowAddDestForm(false);
  };

  const pendingRestaurants = restaurants.filter(r => r.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-stone-900 w-full max-w-3xl h-[92vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-red-900 via-stone-900 to-amber-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-red-600/40 border border-red-400/40">
              <Shield className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-moul text-sm sm:text-base text-amber-200">
                {language === 'km' ? 'ផ្ទាំងគ្រប់គ្រងរដ្ឋបាល (Admin Dashboard)' : 'Admin Management Portal'}
              </h2>
              <p className="text-[10px] text-amber-200/80">
                {language === 'km' ? 'គ្រប់គ្រងមុខម្ហូប ហាងអាហារ តំបន់ទេសចរណ៍ និងសហគមន៍' : 'Khmer Food & Tourism System Administration'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAdminOpen(false)}
            className="p-1.5 rounded-full text-stone-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Nav Tabs */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 text-xs px-2">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'stats' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-400'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{language === 'km' ? 'ស្ថិតិទូទៅ' : 'Overview'}</span>
          </button>

          <button
            onClick={() => setActiveTab('food')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'food' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-400'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>{language === 'km' ? `មុខម្ហូប (${foods.length})` : `Foods (${foods.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('restaurants')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition relative ${
              activeTab === 'restaurants' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-400'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>{language === 'km' ? `ហាងអាហារ (${restaurants.length})` : `Shops (${restaurants.length})`}</span>
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
            <span>{language === 'km' ? `ទេសចរណ៍ (${destinations.length})` : `Destinations (${destinations.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('community')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'community' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-400'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{language === 'km' ? `សហគមន៍ (${posts.length})` : `Feed (${posts.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === 'users' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{language === 'km' ? `អ្នកប្រើ (${users.length})` : `Users (${users.length})`}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 text-xs">
          {/* STATS OVERVIEW */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                      {language === 'km' ? 'មុខម្ហូបសរុប' : 'Total Foods'}
                    </span>
                    <Utensils className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">{foods.length}</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-stone-800 border border-emerald-200 dark:border-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                      {language === 'km' ? 'ភោជនីយដ្ឋាន' : 'Total Shops'}
                    </span>
                    <Store className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">{restaurants.length}</p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-stone-800 border border-blue-200 dark:border-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300">
                      {language === 'km' ? 'តំបន់ទេសចរណ៍' : 'Destinations'}
                    </span>
                    <Compass className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">{destinations.length}</p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-stone-800 border border-rose-200 dark:border-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                      {language === 'km' ? 'ការបង្ហោះសហគមន៍' : 'Community Posts'}
                    </span>
                    <MessageSquare className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">{posts.length}</p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-stone-800 border border-purple-200 dark:border-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300">
                      {language === 'km' ? 'អ្នកប្រើប្រាស់' : 'Active Users'}
                    </span>
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-2">{users.length}</p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-100/70 dark:bg-stone-800 border border-amber-300 dark:border-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300">
                      {language === 'km' ? 'សំណើរង់ចាំអនុម័ត' : 'Pending Review'}
                    </span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-200 mt-2">
                    {pendingRestaurants.length}
                  </p>
                </div>
              </div>

              {pendingRestaurants.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-stone-800 border border-amber-300 space-y-2">
                  <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>{language === 'km' ? 'មានសំណើចុះបញ្ជីហាងអាហារថ្មីរង់ចាំការត្រួតពិនិត្យ!' : 'Pending Restaurant Submissions:'}</span>
                  </p>
                  {pendingRestaurants.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-stone-700 rounded-xl">
                      <div>
                        <p className="font-bold text-stone-900 dark:text-white">{r.nameKh}</p>
                        <p className="text-[10px] text-stone-500">{r.addressKh} • 📞 {r.phone}</p>
                      </div>
                      <button
                        onClick={() => approveRestaurant(r.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        {language === 'km' ? 'អនុម័ត' : 'Approve'}
                      </button>
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
                <h3 className="font-bold text-stone-900 dark:text-stone-100">
                  {language === 'km' ? 'គ្រប់គ្រងបញ្ជីមុខម្ហូបខ្មែរ' : 'Manage Khmer Food Directory'}
                </h3>
                <button
                  onClick={() => setShowAddFoodForm(!showAddFoodForm)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-500"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddFoodForm ? 'បិទបែបបទ' : (language === 'km' ? 'បញ្ចូលមុខម្ហូបថ្មី' : 'Add Food')}</span>
                </button>
              </div>

              {showAddFoodForm && (
                <form onSubmit={handleCreateFood} className="p-4 rounded-2xl bg-amber-50/70 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 space-y-3">
                  <h4 className="font-bold text-amber-900 dark:text-amber-200">
                    {language === 'km' ? 'បញ្ចូលមុខម្ហូបខ្មែរថ្មី' : 'New Dish Information'}
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
                        <option value="soup">សម្ល / Soups</option>
                        <option value="stirfry">ម្ហូបឆា / Stir-fry</option>
                        <option value="salad">ញាំ-ភ្លា / Salad</option>
                        <option value="breakfast">អាហារពេលព្រឹក / Breakfast</option>
                        <option value="dessert">នំ-បង្អែម / Dessert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium mb-1">តម្លៃ (រៀល)</label>
                      <input
                        type="number"
                        value={newFoodPriceRiel}
                        onChange={(e) => setNewFoodPriceRiel(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-stone-700"
                      />
                    </div>

                    <div>
                      <label className="block font-medium mb-1">តម្លៃ ($)</label>
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
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-500"
                  >
                    {language === 'km' ? 'រក្សាទុកមុខម្ហូប' : 'Save Food Item'}
                  </button>
                </form>
              )}

              {/* Food List Table */}
              <div className="space-y-2">
                {foods.map((food) => (
                  <div key={food.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={food.photoUrl} alt="food" className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <h4 className="font-bold text-stone-900 dark:text-stone-100">{food.nameKh}</h4>
                        <p className="text-[10px] text-stone-400">
                          {food.nameEn} • {food.priceRiel.toLocaleString()} ៛ (${food.priceUsd}) • {food.categoryKh}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteFood(food.id)}
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

          {/* RESTAURANTS TAB */}
          {activeTab === 'restaurants' && (
            <div className="space-y-4">
              <h3 className="font-bold text-stone-900 dark:text-stone-100">
                {language === 'km' ? 'គ្រប់គ្រង និងអនុម័តហាងអាហារ' : 'Manage & Moderate Restaurants'}
              </h3>

              <div className="space-y-2">
                {restaurants.map((rest) => (
                  <div key={rest.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={rest.photoUrl} alt="rest" className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-stone-900 dark:text-stone-100">{rest.nameKh}</h4>
                          <span className={`px-2 py-0.2 rounded-md text-[9px] font-bold ${
                            rest.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {rest.status === 'approved' ? '✓ បានអនុម័ត' : '⏳ រង់ចាំពិនិត្យ'}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-400">
                          {rest.provinceKh} • 📞 {rest.phone} • {rest.priceLevel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {rest.status !== 'approved' && (
                        <button
                          onClick={() => approveRestaurant(rest.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px]"
                        >
                          {language === 'km' ? 'អនុម័ត' : 'Approve'}
                        </button>
                      )}
                      <button
                        onClick={() => deleteRestaurant(rest.id)}
                        className="p-2 text-stone-400 hover:text-rose-600 rounded-lg"
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
                <h3 className="font-bold text-stone-900 dark:text-stone-100">
                  {language === 'km' ? 'គ្រប់គ្រងតំបន់ទេសចរណ៍' : 'Manage Tourist Spots'}
                </h3>
                <button
                  onClick={() => setShowAddDestForm(!showAddDestForm)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddDestForm ? 'បិទបែបបទ' : (language === 'km' ? 'បញ្ចូលកន្លែងថ្មី' : 'Add Destination')}</span>
                </button>
              </div>

              {showAddDestForm && (
                <form onSubmit={handleCreateDestination} className="p-4 rounded-2xl bg-blue-50/70 dark:bg-stone-800 border border-blue-200 dark:border-stone-700 space-y-3">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200">
                    {language === 'km' ? 'បញ្ចូលតំបន់ទេសចរណ៍ថ្មី' : 'New Destination'}
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
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500"
                  >
                    {language === 'km' ? 'រក្សាទុកទីតាំងទេសចរណ៍' : 'Save Destination'}
                  </button>
                </form>
              )}

              <div className="space-y-2">
                {destinations.map((dest) => (
                  <div key={dest.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={dest.photoUrl} alt="dest" className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <h4 className="font-bold text-stone-900 dark:text-stone-100">{dest.nameKh}</h4>
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
              <h3 className="font-bold text-stone-900 dark:text-stone-100">
                {language === 'km' ? 'ត្រួតពិនិត្យការបង្ហោះសហគមន៍' : 'Community Moderation'}
              </h3>

              <div className="space-y-2">
                {posts.map((post) => (
                  <div key={post.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={post.photoUrl} alt="post" className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <h4 className="font-bold text-stone-900 dark:text-stone-100">{post.titleKh}</h4>
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
              <h3 className="font-bold text-stone-900 dark:text-stone-100">
                {language === 'km' ? 'គ្រប់គ្រងអ្នកប្រើប្រាស់ និងសិទ្ធិ' : 'User Management & Permissions'}
              </h3>

              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt="user" className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <h4 className="font-bold text-stone-900 dark:text-stone-100">{u.name}</h4>
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
        </div>
      </div>
    </div>
  );
};

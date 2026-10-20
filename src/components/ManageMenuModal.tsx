import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, UtensilsCrossed, Plus, Trash2, Edit2, Sparkles, 
  AlertCircle, CheckCircle2, Image, DollarSign, Calendar, Clock
} from 'lucide-react';
import { RestaurantMenuItem, isRestaurantPremiumActive } from '../types';

export const ManageMenuModal: React.FC = () => {
  const { 
    isManageMenuModalOpen, 
    setIsManageMenuModalOpen, 
    managingRestaurant,
    addRestaurantMenuItem,
    updateRestaurantMenuItem,
    deleteRestaurantMenuItem,
    upgradeRestaurantToPremium,
    language,
    showToast
  } = useApp();

  const isKm = language === 'km';

  // Form mode: list, add, edit, upgrade
  const [mode, setMode] = useState<'list' | 'add' | 'edit' | 'upgrade'>('list');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Menu item fields
  const [nameKh, setNameKh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [priceUsd, setPriceUsd] = useState('5.00');
  const [priceRiel, setPriceRiel] = useState('20000');
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80');
  const [descriptionKh, setDescriptionKh] = useState('');

  // Upgrade / Renewal fields
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'BankTransfer' | 'Bakong' | 'KHQR'>('BankTransfer');

  if (!isManageMenuModalOpen || !managingRestaurant) return null;

  const menuItems = managingRestaurant.menuItems || [];
  const isPremiumActive = isRestaurantPremiumActive(managingRestaurant);
  const isExpired = managingRestaurant.membershipTier === 'premium' && !isPremiumActive;
  const isFree = managingRestaurant.membershipTier === 'free';

  const resetForm = () => {
    setNameKh('');
    setNameEn('');
    setPriceUsd('5.00');
    setPriceRiel('20000');
    setPhotoUrl('https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80');
    setDescriptionKh('');
    setEditingItemId(null);
    setMode('list');
  };

  const sampleFoodPhotos = [
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
  ];

  const handleStartAdd = () => {
    if (!isPremiumActive) {
      showToast(
        isKm 
          ? 'ការចុះបញ្ជីឥតគិតថ្លៃមិនអាចបន្ថែមមុខម្ហូបបានទេ។ សូមដំឡើងទៅ Premium ($4.99 សម្រាប់ ៣៦៥ ថ្ងៃ)!' 
          : 'Free listing cannot add food items. Please upgrade to Premium ($4.99 for 365 days)!',
        'warning'
      );
      setMode('upgrade');
      return;
    }
    if (menuItems.length >= 5) {
      showToast(
        isKm 
          ? 'សមាជិកភាព Premium អនុញ្ញាតឱ្យបន្ថែមមុខម្ហូបអតិបរមាត្រឹម ៥ មុខប៉ុណ្ណោះ!' 
          : 'Premium membership allows a maximum of 5 food menu items!',
        'warning'
      );
      return;
    }
    resetForm();
    setMode('add');
  };

  const handleStartEdit = (item: RestaurantMenuItem) => {
    if (!isPremiumActive) {
      showToast(
        isKm 
          ? 'សមាជិកភាពបានផុតកំណត់ហើយ មិនអាចកែប្រែបានទេ។ សូមបន្តសមាជិកភាព ($4.99)!' 
          : 'Membership expired. Please renew Premium ($4.99) to edit menu items!',
        'warning'
      );
      return;
    }
    setEditingItemId(item.id);
    setNameKh(item.nameKh);
    setNameEn(item.nameEn || '');
    setPriceUsd(item.priceUsd.toString());
    setPriceRiel(item.priceRiel.toString());
    setPhotoUrl(item.photoUrl);
    setDescriptionKh(item.descriptionKh || '');
    setMode('edit');
  };

  const handleSubmitItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលឈ្មោះមុខម្ហូបជាភាសាខ្មែរ!' : 'Please enter food name in Khmer!', 'warning');
      return;
    }

    const usd = parseFloat(priceUsd) || 0;
    const riel = parseInt(priceRiel) || Math.round(usd * 4100);

    if (mode === 'add') {
      const success = addRestaurantMenuItem(managingRestaurant.id, {
        nameKh: nameKh.trim(),
        nameEn: nameEn.trim() || undefined,
        priceUsd: usd,
        priceRiel: riel,
        photoUrl: photoUrl.trim(),
        descriptionKh: descriptionKh.trim() || undefined,
      });
      if (success) resetForm();
    } else if (mode === 'edit' && editingItemId) {
      const existing = menuItems.find(m => m.id === editingItemId);
      if (!existing) return;

      const success = updateRestaurantMenuItem(managingRestaurant.id, {
        ...existing,
        nameKh: nameKh.trim(),
        nameEn: nameEn.trim() || undefined,
        priceUsd: usd,
        priceRiel: riel,
        photoUrl: photoUrl.trim(),
        descriptionKh: descriptionKh.trim() || undefined,
      });
      if (success) resetForm();
    }
  };

  const handleDeleteItem = (item: RestaurantMenuItem) => {
    if (window.confirm(isKm ? `តើអ្នកពិតជាចង់លុបមុខម្ហូប "${item.nameKh}" មែនទេ?` : `Are you sure you want to delete "${item.nameKh}"?`)) {
      deleteRestaurantMenuItem(managingRestaurant.id, item.id);
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
    setMode('list');
    setIsManageMenuModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-amber-300/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-gradient-to-r from-amber-900 via-stone-900 to-amber-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-moul text-sm text-amber-200 leading-snug">
                {isKm ? 'គ្រប់គ្រងមុខម្ហូបក្នុងហាង' : 'Manage Restaurant Menu'}
              </h2>
              <p className="text-[10px] text-amber-200/80 font-khmer">
                {isKm ? managingRestaurant.nameKh : managingRestaurant.nameEn}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsManageMenuModalOpen(false)}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Membership Status Bar */}
        <div className="p-4 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPremiumActive ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950 flex items-center gap-1 font-khmer">
                  <Sparkles className="w-3 h-3" />
                  <span>⭐ {isKm ? 'សមាជិកភាព Premium (៣៦៥ ថ្ងៃ)' : 'Premium Active (365 Days)'}</span>
                </span>
              ) : isExpired ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1 font-khmer">
                  <AlertCircle className="w-3 h-3" />
                  <span>⏳ {isKm ? 'Premium បានផុតកំណត់' : 'Premium Expired'}</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700 font-khmer">
                  🏷️ {isKm ? 'ចុះបញ្ជីឥតគិតថ្លៃ ($0 Free Listing)' : 'Free Listing ($0)'}
                </span>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 font-mono">
                {menuItems.length} / 5
              </span>
              <span className="text-[10px] text-stone-500 font-khmer ml-1">
                {isKm ? 'មុខម្ហូប' : 'items'}
              </span>
            </div>
          </div>

          {/* Membership Details & Expiration Notice */}
          {isPremiumActive && managingRestaurant.membershipExpiresAt && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-stone-600 dark:text-stone-300 font-khmer">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {isKm 
                  ? `សុពលភាពដល់ថ្ងៃទី៖ ${new Date(managingRestaurant.membershipExpiresAt).toLocaleDateString()} (ទូទាត់តែមួយលើក $4.99 គ្មានកាត់ប្រចាំខែ)` 
                  : `Valid until: ${new Date(managingRestaurant.membershipExpiresAt).toLocaleDateString()} (One-time $4.99 payment, no monthly fee)`}
              </span>
            </div>
          )}

          {/* Free Listing Notice */}
          {isFree && (
            <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs font-khmer">
              <div className="text-[10px] text-amber-900 dark:text-amber-200">
                <span className="font-bold">{isKm ? 'សេចក្តីជូនដំណឹង៖' : 'Notice:'}</span>{' '}
                {isKm 
                  ? 'គណនីឥតគិតថ្លៃមិនអាចបន្ថែមមុខម្ហូបបានទេ។ ដំឡើងទៅ Premium ($4.99 សម្រាប់ ៣៦៥ ថ្ងៃ) ដើម្បីបន្ថែមម្ហូប ៥ មុខ!' 
                  : 'Free listing cannot add food items. Upgrade to Premium ($4.99 for 365 days) to add up to 5 food items!'}
              </div>
              <button
                onClick={() => setMode('upgrade')}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] shrink-0 ml-2 shadow"
              >
                {isKm ? 'ដំឡើង $4.99' : 'Upgrade $4.99'}
              </button>
            </div>
          )}

          {/* Expired Premium Notice */}
          {isExpired && (
            <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center justify-between text-xs font-khmer">
              <div className="text-[10px] text-red-900 dark:text-red-200">
                <span className="font-bold">{isKm ? 'ផុតកំណត់៖' : 'Expired:'}</span>{' '}
                {isKm 
                  ? 'ទិន្នន័យមុខម្ហូបទាំងអស់ត្រូវបានរក្សាទុកដដែល (គ្មានការលុបឡើយ)។ សូមបន្តសមាជិកភាព $4.99 សម្រាប់ ៣៦៥ ថ្ងៃថ្មី!' 
                  : 'All food items are retained. Renew Premium ($4.99) for another 365 days to add or edit items!'}
              </div>
              <button
                onClick={() => setMode('upgrade')}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] shrink-0 ml-2 shadow"
              >
                {isKm ? 'បន្ត $4.99' : 'Renew $4.99'}
              </button>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar text-xs">
          {/* Mode: List View */}
          {mode === 'list' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-xs">
                  {isKm ? 'បញ្ជីមុខម្ហូបក្នុងហាង (អតិបរមា ៥ មុខ)' : 'Restaurant Menu Items (Max 5)'}
                </h3>

                {isPremiumActive && menuItems.length < 5 && (
                  <button
                    onClick={handleStartAdd}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow font-khmer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isKm ? 'បន្ថែមម្ហូបថ្មី' : 'Add Dish'}</span>
                  </button>
                )}
              </div>

              {menuItems.length === 0 ? (
                <div className="py-10 text-center text-stone-400 space-y-2 font-khmer">
                  <UtensilsCrossed className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="text-xs">
                    {isKm ? 'ហាងនេះមិនទាន់មានមុខម្ហូបនៅឡើយទេ' : 'No menu items added yet'}
                  </p>
                  {isPremiumActive ? (
                    <button
                      onClick={handleStartAdd}
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs"
                    >
                      {isKm ? '+ បន្ថែមមុខម្ហូបដំបូង' : '+ Add First Menu Item'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setMode('upgrade')}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-xs shadow"
                    >
                      {isKm ? '⭐ ដំឡើង Premium $4.99 ដើម្បីបន្ថែមម្ហូប' : '⭐ Upgrade to Premium $4.99 to add food items'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {menuItems.map((item, index) => (
                    <div 
                      key={item.id}
                      className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center gap-3"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-200 shrink-0 border border-stone-200 dark:border-stone-700">
                        <img src={item.photoUrl} alt={item.nameKh} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <h4 className="font-bold text-stone-900 dark:text-stone-100 font-khmer text-xs truncate">
                            {item.nameKh}
                          </h4>
                        </div>
                        {item.nameEn && (
                          <p className="text-[10px] text-stone-500 truncate">{item.nameEn}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-red-600 font-bold font-mono text-xs">${item.priceUsd.toFixed(2)}</span>
                          <span className="text-[10px] text-stone-400 font-mono">({item.priceRiel.toLocaleString()} ៛)</span>
                        </div>
                        {item.descriptionKh && (
                          <p className="text-[10px] text-stone-500 font-khmer line-clamp-1 mt-0.5">{item.descriptionKh}</p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(item)}
                          disabled={!isPremiumActive}
                          className="p-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 text-stone-700 dark:text-stone-200 transition disabled:opacity-40"
                          title="កែប្រែ"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition"
                          title="លុប"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mode: Add / Edit Form */}
          {(mode === 'add' || mode === 'edit') && (
            <form onSubmit={handleSubmitItem} className="space-y-3 font-khmer">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                  {mode === 'add' 
                    ? (isKm ? `+ បន្ថែមមុខម្ហូបថ្មី (${menuItems.length + 1}/5)` : `+ Add New Menu Item (${menuItems.length + 1}/5)`) 
                    : (isKm ? 'កែប្រែព័ត៌មានមុខម្ហូប' : 'Edit Menu Item')}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] text-stone-500 hover:text-stone-800"
                >
                  {isKm ? 'បោះបង់' : 'Cancel'}
                </button>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isKm ? 'ឈ្មោះមុខម្ហូប (ភាសាខ្មែរ) *' : 'Dish Name (Khmer) *'}
                </label>
                <input
                  type="text"
                  required
                  value={nameKh}
                  onChange={e => setNameKh(e.target.value)}
                  placeholder="ឧ. ឡុកឡាក់សាច់គោពិសេស"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isKm ? 'ឈ្មោះមុខម្ហូបជាអក្សរឡាតាំង' : 'Dish Name (English)'}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={e => setNameEn(e.target.value)}
                  placeholder="e.g. Special Beef Lok Lak"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {isKm ? 'តម្លៃ (USD $)' : 'Price (USD $)'}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={priceUsd}
                    onChange={e => {
                      setPriceUsd(e.target.value);
                      const num = parseFloat(e.target.value) || 0;
                      setPriceRiel((num * 4100).toFixed(0));
                    }}
                    placeholder="5.00"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {isKm ? 'តម្លៃជាប្រាក់រៀល (៛)' : 'Price (KHR ៛)'}
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={priceRiel}
                    onChange={e => setPriceRiel(e.target.value)}
                    placeholder="20000"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isKm ? 'រូបភាពមុខម្ហូប (Photo URL) *' : 'Dish Photo URL *'}
                </label>
                <input
                  type="url"
                  required
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs mb-2"
                />
                
                <div className="grid grid-cols-4 gap-2">
                  {sampleFoodPhotos.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setPhotoUrl(url)}
                      className={`aspect-16/10 rounded-lg overflow-hidden cursor-pointer border-2 transition ${
                        photoUrl === url ? 'border-amber-500 ring-2 ring-amber-300' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="sample" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isKm ? 'ការពិពណ៌នាអំពីមុខម្ហូប' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={descriptionKh}
                  onChange={e => setDescriptionKh(e.target.value)}
                  placeholder="រៀបរាប់ពីរសជាតិ គ្រឿងផ្សំ និងរបៀបទទួលទាន..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold"
                >
                  {isKm ? 'បោះបង់' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow"
                >
                  {mode === 'add' ? (isKm ? 'រក្សាទុកមុខម្ហូប' : 'Save Dish') : (isKm ? 'កែប្រែព័ត៌មាន' : 'Update Dish')}
                </button>
              </div>
            </form>
          )}

          {/* Mode: Upgrade / Renew to Premium ($4.99 for 365 Days) */}
          {mode === 'upgrade' && (
            <form onSubmit={handleUpgradeSubmit} className="space-y-4 font-khmer">
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-stone-800 dark:to-stone-900 rounded-2xl border-2 border-amber-400 text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 text-white text-[10px] font-bold rounded-full shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>One-Time Payment: $4.99 USD for 365 Days</span>
                </div>
                <div className="text-2xl font-black text-red-700 font-mono">$4.99 USD</div>
                <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-snug">
                  {isKm 
                    ? 'ការទូទាត់តែមួយលើក $4.99 សម្រាប់រយៈពេល ៣៦៥ ថ្ងៃពេញ (គ្មានការកាត់ប្រាក់ប្រចាំខែ និងគ្មានការបន្តស្វ័យប្រវត្តិឡើយ)។ លោកអ្នកអាចបន្ថែមមុខម្ហូបលម្អិតបានរហូតដល់ ៥ មុខ ជាមួយរូបភាព និងតម្លៃ។' 
                    : 'One-time payment of $4.99 for 365 days. No monthly subscription, no automatic charges. Add up to 5 food menu items with photos and prices.'}
                </p>
              </div>

              {/* Bank Transfer Details (NO QR CODE) */}
              <div className="p-4 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2">
                <div className="text-xs font-bold text-stone-800 dark:text-stone-200 border-b pb-1">
                  {isKm ? 'ព័ត៌មានគណនីផ្ទេរប្រាក់ (ABA Bank Transfer)' : 'Bank Transfer Details'}
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-stone-500">{isKm ? 'ធនាគារ៖' : 'Bank:'}</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200 font-mono">ABA BANK</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-stone-500">{isKm ? 'ឈ្មោះគណនី៖' : 'Beneficiary:'}</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200 font-mono">KHMER FOOD TOURISM</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-stone-500">{isKm ? 'លេខគណនី៖' : 'Account Number:'}</span>
                  <span className="font-bold text-red-700 font-mono text-xs">000 123 456 (USD)</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1 border-t">
                  <span className="text-stone-500">{isKm ? 'ចំនួនទឹកប្រាក់៖' : 'Amount:'}</span>
                  <span className="font-bold text-red-600 font-mono text-xs">$4.99 USD</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1 text-xs">
                  {isKm ? 'លេខកូដប្រតិបត្តិការធនាគារ (Transaction Ref / Trx ID) *' : 'Bank Transaction Reference / Trx ID *'}
                </label>
                <input
                  type="text"
                  required
                  value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)}
                  placeholder="ឧ. TRX-123456789 ឬលេខ Ref លើវិក្កយបត្រ"
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-amber-400 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-bold text-xs"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  {isKm 
                    ? 'បញ្ចូលលេខកូដប្រតិបត្តិការពីបង្កាន់ដៃធនាគារ ABA របស់អ្នក។ រដ្ឋបាលនឹងផ្ទៀងផ្ទាត់ និងបើកដំណើរការ ៣៦៥ ថ្ងៃជូន។' 
                    : 'Enter the Transaction ID from your ABA bank receipt for administrative verification.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold"
                >
                  {isKm ? 'ត្រឡប់ក្រោយ' : 'Back'}
                </button>

                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold shadow text-xs"
                >
                  {isKm ? 'ដាក់ស្នើការទូទាត់ $4.99' : 'Submit $4.99 Payment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, UtensilsCrossed, Plus, Trash2, Edit2, Sparkles, 
  AlertCircle, CheckCircle2, Image, DollarSign, Calendar, Clock,
  Store, BarChart3, ShieldCheck, Share2, Phone, MapPin, ExternalLink,
  MessageCircle, Copy, Check, HelpCircle, ArrowRight
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
    updateRestaurant,
    upgradeRestaurantToPremium,
    language,
    showToast,
    appSettings
  } = useApp();

  const isKm = language === 'km';
  const promoPrice = appSettings.promotionalFeeUsd || 9.99;

  // Main Tabs: menu, info, analytics, membership
  const [mainTab, setMainTab] = useState<'menu' | 'info' | 'analytics' | 'membership'>('menu');

  // Menu item form mode: list, add, edit
  const [menuMode, setMenuMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Menu item fields
  const [nameKh, setNameKh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [priceUsd, setPriceUsd] = useState('5.00');
  const [priceRiel, setPriceRiel] = useState('20000');
  const [dishPhotoUrl, setDishPhotoUrl] = useState('https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80');
  const [descriptionKh, setDescriptionKh] = useState('');

  // Self-Service Store Info fields
  const [storeNameKh, setStoreNameKh] = useState(managingRestaurant?.nameKh || '');
  const [storeNameEn, setStoreNameEn] = useState(managingRestaurant?.nameEn || '');
  const [storePhone, setStorePhone] = useState(managingRestaurant?.phone || '');
  const [storeAddressKh, setStoreAddressKh] = useState(managingRestaurant?.addressKh || '');
  const [storeOpeningHours, setStoreOpeningHours] = useState(managingRestaurant?.openingHoursKh || '');
  const [storeMapUrl, setStoreMapUrl] = useState(managingRestaurant?.mapUrl || '');
  const [storeCoverPhoto, setStoreCoverPhoto] = useState(managingRestaurant?.photoUrl || '');
  const [storeGalleryPhotos, setStoreGalleryPhotos] = useState<string[]>(managingRestaurant?.galleryPhotos || []);
  const [newGalleryInput, setNewGalleryInput] = useState('');

  // Upgrade / Renewal fields
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'BankTransfer' | 'Bakong' | 'KHQR'>('BankTransfer');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isManageMenuModalOpen || !managingRestaurant) return null;

  const menuItems = managingRestaurant.menuItems || [];
  const isPremiumActive = isRestaurantPremiumActive(managingRestaurant);
  const isExpired = managingRestaurant.membershipTier === 'premium' && !isPremiumActive;
  const isFree = managingRestaurant.membershipTier === 'free';

  // Analytics Metrics
  const viewsCount = managingRestaurant.analytics?.views || 86;
  const callsCount = managingRestaurant.analytics?.phoneClicks || 19;
  const mapsCount = managingRestaurant.analytics?.mapClicks || 24;
  const sharesCount = managingRestaurant.analytics?.shareClicks || 11;

  const shareableUrl = `${window.location.origin}/?restaurant=${managingRestaurant.id}`;

  const resetMenuForm = () => {
    setNameKh('');
    setNameEn('');
    setPriceUsd('5.00');
    setPriceRiel('20000');
    setDishPhotoUrl('https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80');
    setDescriptionKh('');
    setEditingItemId(null);
    setMenuMode('list');
  };

  const sampleFoodPhotos = [
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
  ];

  const sampleGalleryPhotos = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=800&auto=format&fit=crop&q=80',
  ];

  const handleStartAdd = () => {
    if (!isPremiumActive) {
      showToast(
        isKm 
          ? 'ការចុះបញ្ជីឥតគិតថ្លៃមិនអាចបន្ថែមមុខម្ហូបបានទេ។ សូមដំឡើងទៅ Premium VIP ($9.99 សម្រាប់ ៣៦៥ ថ្ងៃ)!' 
          : 'Free listing cannot add food items. Please upgrade to Premium VIP ($9.99 for 365 days)!',
        'warning'
      );
      setMainTab('membership');
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
    resetMenuForm();
    setMenuMode('add');
  };

  const handleStartEdit = (item: RestaurantMenuItem) => {
    if (!isPremiumActive) {
      showToast(
        isKm 
          ? 'សមាជិកភាពបានផុតកំណត់ហើយ មិនអាចកែប្រែបានទេ។ សូមបន្តសមាជិកភាព ($9.99)!' 
          : 'Membership expired. Please renew Premium ($9.99) to edit menu items!',
        'warning'
      );
      return;
    }
    setEditingItemId(item.id);
    setNameKh(item.nameKh);
    setNameEn(item.nameEn || '');
    setPriceUsd(item.priceUsd.toString());
    setPriceRiel(item.priceRiel.toString());
    setDishPhotoUrl(item.photoUrl);
    setDescriptionKh(item.descriptionKh || '');
    setMenuMode('edit');
  };

  const handleMenuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលឈ្មោះមុខម្ហូប!' : 'Please enter food name!', 'warning');
      return;
    }

    const usd = parseFloat(priceUsd) || 0;
    const riel = parseInt(priceRiel) || Math.round(usd * 4100);

    if (menuMode === 'add') {
      const ok = addRestaurantMenuItem(managingRestaurant.id, {
        nameKh: nameKh.trim(),
        nameEn: nameEn.trim(),
        priceUsd: usd,
        priceRiel: riel,
        photoUrl: dishPhotoUrl.trim() || sampleFoodPhotos[0],
        descriptionKh: descriptionKh.trim(),
      });
      if (ok) resetMenuForm();
    } else if (menuMode === 'edit' && editingItemId) {
      const existing = menuItems.find(m => m.id === editingItemId);
      if (!existing) return;
      const ok = updateRestaurantMenuItem(managingRestaurant.id, {
        ...existing,
        nameKh: nameKh.trim(),
        nameEn: nameEn.trim(),
        priceUsd: usd,
        priceRiel: riel,
        photoUrl: dishPhotoUrl.trim() || sampleFoodPhotos[0],
        descriptionKh: descriptionKh.trim(),
      });
      if (ok) resetMenuForm();
    }
  };

  const handleSaveStoreInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeNameKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលឈ្មោះហាងជាភាសាខ្មែរ!' : 'Please enter restaurant name!', 'warning');
      return;
    }

    updateRestaurant({
      ...managingRestaurant,
      nameKh: storeNameKh.trim(),
      nameEn: storeNameEn.trim(),
      phone: storePhone.trim(),
      addressKh: storeAddressKh.trim(),
      openingHoursKh: storeOpeningHours.trim(),
      mapUrl: storeMapUrl.trim(),
      photoUrl: storeCoverPhoto.trim() || managingRestaurant.photoUrl,
      galleryPhotos: storeGalleryPhotos,
    });

    showToast(isKm ? 'បានកែប្រែព័ត៌មានហាងដោយជោគជ័យ!' : 'Restaurant info saved successfully!', 'success');
  };

  const handleAddGalleryPhoto = (url: string) => {
    if (!url.trim()) return;
    if (storeGalleryPhotos.length >= 6) {
      showToast(isKm ? 'អាចបន្ថែមរូបភាព Gallery អតិបរមា ៦ សន្លឹក!' : 'Max 6 gallery photos allowed!', 'warning');
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
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    showToast(isKm ? 'បានចម្លងតំណភ្ជាប់ហាងជោគជ័យ!' : 'Restaurant link copied!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
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
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#047857] flex items-center justify-between bg-[#064E3B] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-200 rounded-xl border border-emerald-400/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-moul text-sm text-white leading-snug">
                {isKm ? 'ផ្ទាំងគ្រប់គ្រងម្ចាស់ហាង' : 'Owner Management Hub'}
              </h2>
              <p className="text-[10px] text-emerald-200 font-khmer">
                {isKm ? managingRestaurant.nameKh : managingRestaurant.nameEn}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsManageMenuModalOpen(false)}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Main Management Tabs */}
        <div className="grid grid-cols-4 bg-slate-100 dark:bg-slate-800/80 p-1 border-b border-slate-200 dark:border-slate-700 text-center font-khmer">
          <button
            onClick={() => { setMainTab('menu'); setMenuMode('list'); }}
            className={`py-2 px-1 text-[11px] font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
              mainTab === 'menu'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>{isKm ? 'មុខម្ហូប (៥)' : 'Menu (5)'}</span>
          </button>

          <button
            onClick={() => setMainTab('info')}
            className={`py-2 px-1 text-[11px] font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
              mainTab === 'info'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{isKm ? 'កែព័ត៌មានហាង' : 'Edit Store'}</span>
          </button>

          <button
            onClick={() => setMainTab('analytics')}
            className={`py-2 px-1 text-[11px] font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
              mainTab === 'analytics'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{isKm ? 'ស្ថិតិហាង' : 'Analytics'}</span>
          </button>

          <button
            onClick={() => setMainTab('membership')}
            className={`py-2 px-1 text-[11px] font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
              mainTab === 'membership'
                ? 'bg-white dark:bg-slate-900 text-[#064E3B] dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{isKm ? 'សមាជិក VIP' : 'VIP Plan'}</span>
          </button>
        </div>

        {/* Membership Status Pill Header */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-khmer">
          <div className="flex items-center gap-2">
            {isPremiumActive ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#064E3B] text-white flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3 text-emerald-300" />
                <span>⭐ {isKm ? 'សមាជិកភាព VIP Premium (៣៦៥ ថ្ងៃ)' : 'VIP Premium Active (365 Days)'}</span>
              </span>
            ) : isExpired ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>⏳ {isKm ? 'Premium បានផុតកំណត់' : 'Premium Expired'}</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                🏷️ {isKm ? 'ចុះបញ្ជីឥតគិតថ្លៃ ($0 Free Listing)' : 'Free Listing ($0)'}
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-[#064E3B] dark:text-emerald-400 font-mono">
              {menuItems.length} / 5
            </span>
            <span className="text-[10px] text-slate-500 ml-1">
              {isKm ? 'មុខម្ហូប' : 'items'}
            </span>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar text-xs">

          {/* TAB 1: MENU ITEMS */}
          {mainTab === 'menu' && (
            <div>
              {menuMode === 'list' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#0F172A] dark:text-white font-khmer text-xs">
                      {isKm ? 'មុខម្ហូបក្នុងហាង (អតិបរមា ៥ មុខ)' : 'Food Menu Items (Max 5)'}
                    </h3>

                    {isPremiumActive && menuItems.length < 5 && (
                      <button
                        onClick={handleStartAdd}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-xs font-khmer transition active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-200" />
                        <span>{isKm ? 'បន្ថែមម្ហូបថ្មី' : 'Add Dish'}</span>
                      </button>
                    )}
                  </div>

                  {menuItems.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 space-y-2 font-khmer">
                      <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="text-xs">
                        {isKm ? 'ហាងនេះមិនទាន់មានមុខម្ហូបនៅឡើយទេ' : 'No menu items added yet'}
                      </p>
                      {isPremiumActive ? (
                        <button
                          onClick={handleStartAdd}
                          className="px-4 py-2 rounded-xl bg-[#064E3B] text-white font-bold text-xs hover:bg-[#047857] transition active:scale-95"
                        >
                          {isKm ? '+ បន្ថែមមុខម្ហូបដំបូង' : '+ Add First Menu Item'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setMainTab('membership')}
                          className="px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-md transition active:scale-95"
                        >
                          {isKm ? '⭐ ដំឡើង Premium $9.99 ដើម្បីបន្ថែមម្ហូប' : '⭐ Upgrade to Premium $9.99 to add food items'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {menuItems.map((item, index) => (
                        <div 
                          key={item.id}
                          className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 flex items-center gap-3 shadow-xs"
                        >
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <img src={item.photoUrl} alt={item.nameKh} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 right-0 bg-black/65 text-white/90 text-[7px] px-1 rounded-tl-sm font-khmer select-none">
                              {isKm ? 'រូបតំណាង' : 'Sample'}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <h4 className="font-bold text-[#0F172A] dark:text-white font-khmer text-xs truncate">
                                {item.nameKh}
                              </h4>
                            </div>
                            {item.nameEn && (
                              <p className="text-[10px] text-slate-500 truncate">{item.nameEn}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[#064E3B] dark:text-emerald-400 font-bold font-mono text-xs">${item.priceUsd.toFixed(2)}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({item.priceRiel.toLocaleString()} ៛)</span>
                            </div>
                            {item.descriptionKh && (
                              <p className="text-[10px] text-slate-500 font-khmer line-clamp-1 mt-0.5">{item.descriptionKh}</p>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleStartEdit(item)}
                              disabled={!isPremiumActive}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-[#064E3B] transition disabled:opacity-40"
                              title={isKm ? 'កែប្រែ' : 'Edit'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteRestaurantMenuItem(managingRestaurant.id, item.id)}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 transition"
                              title={isKm ? 'លុប' : 'Delete'}
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

              {/* Menu Add / Edit Form */}
              {(menuMode === 'add' || menuMode === 'edit') && (
                <form onSubmit={handleMenuSubmit} className="space-y-3 font-khmer">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <h3 className="font-bold text-xs text-[#064E3B] dark:text-emerald-400 flex items-center gap-1.5">
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>{menuMode === 'add' ? (isKm ? 'បន្ថែមមុខម្ហូបថ្មី' : 'Add Food Item') : (isKm ? 'កែប្រែមុខម្ហូប' : 'Edit Food Item')}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={resetMenuForm}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      {isKm ? 'បោះបង់' : 'Cancel'}
                    </button>
                  </div>

                  <div>
                    <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                      {isKm ? 'ឈ្មោះមុខម្ហូប (ជាភាសាខ្មែរ) *' : 'Dish Name (Khmer) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={nameKh}
                      onChange={e => setNameKh(e.target.value)}
                      placeholder="ឧ. ត្រីដុតអំបិលម្ទេស ឬ សម្លកកូរ"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                      {isKm ? 'ឈ្មោះមុខម្ហូប (English)' : 'Dish Name (English)'}
                    </label>
                    <input
                      type="text"
                      value={nameEn}
                      onChange={e => setNameEn(e.target.value)}
                      placeholder="e.g. Grilled Fish with Chili Salt"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                        {isKm ? 'តម្លៃ ($ USD) *' : 'Price ($ USD) *'}
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
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                        {isKm ? 'តម្លៃ (៛ រៀល)' : 'Price (KHR)'}
                      </label>
                      <input
                        type="number"
                        step="500"
                        value={priceRiel}
                        onChange={e => setPriceRiel(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                      {isKm ? 'រូបភាពមុខម្ហូប (Image URL)' : 'Dish Photo URL'}
                    </label>
                    <input
                      type="url"
                      value={dishPhotoUrl}
                      onChange={e => setDishPhotoUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mb-2 focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white font-mono text-[11px]"
                    />
                    
                    <div className="grid grid-cols-4 gap-2">
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

                  <div>
                    <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                      {isKm ? 'ការពិពណ៌នាអំពីមុខម្ហូប' : 'Description'}
                    </label>
                    <textarea
                      rows={2}
                      value={descriptionKh}
                      onChange={e => setDescriptionKh(e.target.value)}
                      placeholder="រៀបរាប់ពីរសជាតិ គ្រឿងផ្សំ និងរបៀបទទួលទាន..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-none focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={resetMenuForm}
                      className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                    >
                      {isKm ? 'បោះបង់' : 'Cancel'}
                    </button>

                    <button
                      type="submit"
                      className="py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold shadow-xs transition active:scale-95"
                    >
                      {menuMode === 'add' ? (isKm ? 'រក្សាទុកមុខម្ហូប' : 'Save Dish') : (isKm ? 'កែប្រែព័ត៌មាន' : 'Update Dish')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: SELF-SERVICE STORE INFO EDITING (Benefit 4 & Benefit 2) */}
          {mainTab === 'info' && (
            <form onSubmit={handleSaveStoreInfo} className="space-y-3 font-khmer">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                <Store className="w-4 h-4 text-[#064E3B] dark:text-emerald-400 shrink-0" />
                <span className="text-[11px] text-[#064E3B] dark:text-emerald-300 leading-snug">
                  {isKm 
                    ? 'កែប្រែព័ត៌មានហាង រូបភាព អាសយដ្ឋាន និងលេខទូរស័ព្ទដោយខ្លួនឯងបានគ្រប់ពេលវេលា។' 
                    : 'Self-service editing of your restaurant name, multiple photos, phone, and address.'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    {isKm ? 'ឈ្មោះហាង (ជាភាសាខ្មែរ) *' : 'Restaurant Name (Khmer) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={storeNameKh}
                    onChange={e => setStoreNameKh(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    {isKm ? 'ឈ្មោះហាង (English)' : 'Restaurant Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={storeNameEn}
                    onChange={e => setStoreNameEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    {isKm ? 'លេខទូរស័ព្ទទំនាក់ទំនង *' : 'Contact Phone *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={storePhone}
                    onChange={e => setStorePhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                    {isKm ? 'ម៉ោងបើកដំណើរការ' : 'Opening Hours'}
                  </label>
                  <input
                    type="text"
                    value={storeOpeningHours}
                    onChange={e => setStoreOpeningHours(e.target.value)}
                    placeholder="ឧ. ០៧:០០ ព្រឹក - ០៩:០០ យប់"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                  {isKm ? 'អាសយដ្ឋានហាង *' : 'Restaurant Address *'}
                </label>
                <input
                  type="text"
                  required
                  value={storeAddressKh}
                  onChange={e => setStoreAddressKh(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                  {isKm ? 'តំណភ្ជាប់ Google Maps URL' : 'Google Maps URL'}
                </label>
                <input
                  type="url"
                  value={storeMapUrl}
                  onChange={e => setStoreMapUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white font-mono text-[11px]"
                />
              </div>

              {/* Cover Photo */}
              <div>
                <label className="block font-bold text-[#0F172A] dark:text-slate-300 mb-1">
                  {isKm ? 'រូបភាពមុខហាងធំ (Cover Photo)' : 'Restaurant Cover Photo'}
                </label>
                <input
                  type="url"
                  value={storeCoverPhoto}
                  onChange={e => setStoreCoverPhoto(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mb-2 focus:ring-2 focus:ring-emerald-500/30 focus:border-[#059669] outline-none text-[#0F172A] dark:text-white font-mono text-[11px]"
                />
              </div>

              {/* Multiple Gallery Photos (Benefit 2 for VIP) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0F172A] dark:text-white flex items-center gap-1.5">
                    <span>📸</span>
                    <span>{isKm ? `រូបភាពហាងបន្ថែម Gallery (${storeGalleryPhotos.length}/6 សន្លឹក)` : `Multiple Gallery Photos (${storeGalleryPhotos.length}/6)`}</span>
                  </span>
                  {!isPremiumActive && (
                    <span className="text-[10px] text-amber-600 font-bold">
                      {isKm ? '⭐ សម្រាប់តែ VIP' : '⭐ VIP Feature'}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="បញ្ចូលតំណភ្ជាប់រូបភាព Gallery URL..."
                    value={newGalleryInput}
                    onChange={e => setNewGalleryInput(e.target.value)}
                    disabled={!isPremiumActive || storeGalleryPhotos.length >= 6}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddGalleryPhoto(newGalleryInput)}
                    disabled={!isPremiumActive || !newGalleryInput.trim() || storeGalleryPhotos.length >= 6}
                    className="px-3 py-1.5 rounded-xl bg-[#064E3B] text-white font-bold text-xs disabled:opacity-40"
                  >
                    {isKm ? 'បន្ថែម' : 'Add'}
                  </button>
                </div>

                {/* Gallery Thumbnails List */}
                {storeGalleryPhotos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                    {storeGalleryPhotos.map((photo, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                        <img src={photo} alt="thumb" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryPhoto(i)}
                          className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full hover:bg-red-600 transition"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sample Presets */}
                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 block mb-1">
                    {isKm ? 'ជ្រើសរើសរូបគំរូបរិយាកាសហាងរហ័ស៖' : 'Quick select sample photos:'}
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {sampleGalleryPhotos.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAddGalleryPhoto(url)}
                        disabled={!isPremiumActive || storeGalleryPhotos.length >= 6}
                        className="w-12 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-300 hover:border-emerald-500 transition opacity-80 hover:opacity-100 disabled:opacity-30"
                      >
                        <img src={url} alt="sample" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold shadow-md shadow-emerald-950/20 transition active:scale-[0.98]"
                >
                  {isKm ? 'រក្សាទុកការកែប្រែព័ត៌មានហាង' : 'Save Restaurant Info'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: RESTAURANT ANALYTICS (Benefit 7 & Benefit 5) */}
          {mainTab === 'analytics' && (
            <div className="space-y-4 font-khmer">
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

          {/* TAB 4: VIP MEMBERSHIP PLAN & DIRECT SUPPORT (10 Benefits & Rules) */}
          {mainTab === 'membership' && (
            <div className="space-y-4 font-khmer">
              {/* Promo Price Banner */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border-2 border-emerald-500/80 text-center space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#064E3B] text-white text-[10px] font-bold rounded-full shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{isKm ? '⭐ តម្លៃពិសេសដំណាច់ឆ្នាំ៖ $9.99 USD សម្រាប់ ៣៦៥ ថ្ងៃ' : '⭐ End of Year Promo: $9.99 for 365 Days'}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-slate-400 line-through text-sm">$29.99 USD</span>
                  <span className="text-2xl font-black text-[#064E3B] dark:text-emerald-400 font-mono">${promoPrice} USD</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  {isKm 
                    ? 'ការទូទាត់តែមួយលើក $9.99 សម្រាប់រយៈពេល ៣៦៥ ថ្ងៃពេញ (តម្លៃពិសេសត្រឹមដំណាច់ឆ្នាំនេះប៉ុណ្ណោះ គ្មានការកាត់ប្រាក់ប្រចាំខែ និងគ្មានការបន្តស្វ័យប្រវត្តិឡើយ)។' 
                    : 'One-time payment of $9.99 for 365 days (End of year promo only. No monthly subscription or auto-renewal).'}
                </p>
              </div>

              {/* 10 VIP Benefits Breakdown */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <h4 className="font-bold text-xs text-[#064E3B] dark:text-emerald-400 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{isKm ? 'អត្ថប្រយោជន៍ទាំង ១០ យ៉ាងនៃសមាជិកភាព VIP Premium' : '10 Full Benefits of Premium VIP Membership'}</span>
                </h4>

                <div className="grid grid-cols-1 gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                    <span><strong>1. {isKm ? 'បង្ហាញក្នុងបញ្ជីហាងឆ្នើម' : 'Featured restaurant listing'}</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                    <span><strong>2. {isKm ? 'រូបភាពហាងច្រើនសន្លឹក Gallery' : 'Multiple restaurant photos'}</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                    <span><strong>3. {isKm ? 'មុខម្ហូបរហូតដល់ ៥ មុខ ជាមួយរូបភាព និងតម្លៃ' : 'Up to 5 editable food menu items'}</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                    <span><strong>4. {isKm ? 'កែប្រែព័ត៌មានហាង រូបភាព និងលេខទូរស័ព្ទដោយខ្លួនឯង' : 'Self-service editing of name, photos, phone, address'}</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                    <span><strong>5. {isKm ? 'តំណភ្ជាប់ចែករំលែកទំព័រហាងផ្ទាល់' : 'A shareable restaurant page link'}</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                    <span><strong>6. {isKm ? 'ផ្លាកសញ្ញា Premium VIP លើបញ្ជី និងទំព័រហាង' : 'Premium VIP badge on listings & detail pages'}</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                    <span><strong>7. {isKm ? 'ស្ថិតិហាង (ចំនួនមើល ចុចទូរស័ព្ទ និងចុច Maps)' : 'Restaurant analytics (views, calls, maps)'}</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                    <span><strong>8. {isKm ? 'បង្ហាញក្នុងផ្នែកផ្សព្វផ្សាយ VIP ពិសេស' : 'Placement in dedicated Premium promotion section'}</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                    <span><strong>9. {isKm ? 'ប៊ូតុងខល ផែនទី និងចែករំលែករហ័ស' : 'Easy-to-access call, map, and share buttons'}</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                    <span><strong>10. {isKm ? 'សេវាជំនួយសមាជិក VIP ផ្ទាល់តាម Telegram' : 'VIP member support channel'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Bank Transfer Details (NO QR CODE) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-[#0F172A] dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1">
                  {isKm ? 'ព័ត៌មានគណនីផ្ទេរប្រាក់ (ABA Bank Transfer)' : 'Bank Transfer Details'}
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">{isKm ? 'ធនាគារ៖' : 'Bank:'}</span>
                  <span className="font-bold text-[#0F172A] dark:text-white font-mono">ABA BANK</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">{isKm ? 'ឈ្មោះគណនី៖' : 'Beneficiary:'}</span>
                  <span className="font-bold text-[#0F172A] dark:text-white font-mono">CHEA KIMSENG</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">{isKm ? 'លេខគណនី៖' : 'Account Number:'}</span>
                  <span className="font-bold text-[#064E3B] dark:text-emerald-400 font-mono text-xs">000 123 456 (USD)</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">{isKm ? 'ចំនួនទឹកប្រាក់៖' : 'Amount:'}</span>
                  <span className="font-bold text-[#064E3B] dark:text-emerald-400 font-mono text-xs">${promoPrice} USD</span>
                </div>
              </div>

              {/* Transaction ID Submission Form */}
              <form onSubmit={handleUpgradeSubmit} className="space-y-3">
                <div>
                  <label className="block font-bold text-[#0F172A] dark:text-white mb-1 text-xs">
                    {isKm ? 'លេខកូដប្រតិបត្តិការធនាគារ (Transaction Ref / Trx ID) *' : 'Bank Transaction Reference / Trx ID *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                    placeholder="ឧ. TRX-123456789 ឬលេខ Ref លើវិក្កយបត្រ ABA"
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white font-mono font-bold text-xs focus:outline-none focus:border-[#064E3B]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {isKm 
                      ? 'បញ្ចូលលេខកូដប្រតិបត្តិការពីបង្កាន់ដៃធនាគារ ABA របស់អ្នក ដើម្បីឱ្យរដ្ឋបាលផ្ទៀងផ្ទាត់ និងបើកដំណើរការ ៣៦៥ ថ្ងៃជូន។' 
                      : 'Enter the Transaction ID shown on your ABA bank receipt for administrative verification.'}
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-[0.98]"
                >
                  {isKm ? `ដាក់ស្នើផ្ទៀងផ្ទាត់ និងដំឡើង VIP ($${promoPrice})` : `Submit for Verification ($${promoPrice})`}
                </button>
              </form>

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

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500 font-khmer">
          <span>{isKm ? 'សមាជិកភាពសុពលភាព ៣៦៥ ថ្ងៃ' : '365 Days Valid Membership'}</span>
          <button
            onClick={() => setIsManageMenuModalOpen(false)}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition font-medium"
          >
            {isKm ? 'បិទ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

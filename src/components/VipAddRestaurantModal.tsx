import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Store, Image, MapPin, Phone, Clock, Plus, 
  Sparkles, CheckCircle2, ChevronRight, DollarSign
} from 'lucide-react';
import { RestaurantPriceLevel } from '../types';

export const VipAddRestaurantModal: React.FC = () => {
  const { 
    isVipAddRestaurantModalOpen, 
    setIsVipAddRestaurantModalOpen, 
    addRestaurant, 
    currentUser, 
    language,
    showToast,
    setIsManageMenuModalOpen,
    setManagingRestaurant,
    restaurants
  } = useApp();

  const isKm = language === 'km';

  // Form Fields
  const [nameKh, setNameKh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [provinceKh, setProvinceKh] = useState('រាជធានីភ្នំពេញ');
  const [provinceEn, setProvinceEn] = useState('Phnom Penh');
  const [addressKh, setAddressKh] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [openingHoursKh, setOpeningHoursKh] = useState('០៧:០០ ព្រឹក - ០៩:០០ យប់');
  const [priceLevel, setPriceLevel] = useState<RestaurantPriceLevel>('$$');
  const [photoUrl, setPhotoUrl] = useState('/Shop/rest-1.jpg');
  const [descriptionKh, setDescriptionKh] = useState('');
  const [signatureDish, setSignatureDish] = useState('');

  if (!isVipAddRestaurantModalOpen) return null;

  const samplePhotos = [
    '/Shop/rest-1.jpg',
    '/Shop/rest-2.jpg',
    '/Shop/rest-3.jpg',
    '/Shop/rest-4.jpg',
    '/Shop/rest-5.jpg',
    '/Shop/rest-19.jpg'
  ];

  const provinces = [
    { nameKh: 'រាជធានីភ្នំពេញ', nameEn: 'Phnom Penh' },
    { nameKh: 'ខេត្តសៀមរាប', nameEn: 'Siem Reap' },
    { nameKh: 'ខេត្តបាត់ដំបង', nameEn: 'Battambang' },
    { nameKh: 'ខេត្តកំពត', nameEn: 'Kampot' },
    { nameKh: 'ខេត្តកែប', nameEn: 'Kep' },
    { nameKh: 'ខេត្តព្រះសីហនុ', nameEn: 'Sihanoukville' },
    { nameKh: 'ខេត្តកោះកុង', nameEn: 'Koh Kong' },
    { nameKh: 'ខេត្តកំពង់ចាម', nameEn: 'Kampong Cham' },
    { nameKh: 'ខេត្តកំពង់ស្ពឺ', nameEn: 'Kampong Speu' },
    { nameKh: 'ខេត្តមណ្ឌលគិរី', nameEn: 'Mondulkiri' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលឈ្មោះហាងជាភាសាខ្មែរ!' : 'Please enter restaurant name in Khmer!', 'warning');
      return;
    }

    const newRestData = {
      nameKh: nameKh.trim(),
      nameEn: nameEn.trim() || nameKh.trim(),
      descriptionKh: descriptionKh.trim() || 'ភោជនីយដ្ឋានម្ហូបខ្មែររសជាតិដើម ផាសុកភាព និងអនាម័យខ្ពស់។',
      descriptionEn: nameEn.trim() ? `${nameEn.trim()} authentic restaurant.` : 'Authentic Khmer restaurant.',
      photoUrl,
      galleryPhotos: [photoUrl],
      addressKh: addressKh.trim() || `${provinceKh} ប្រទេសកម្ពុជា`,
      addressEn: `${provinceEn}, Cambodia`,
      provinceKh,
      provinceEn,
      phone: phone.trim() || '012 345 678',
      openingHoursKh,
      openingHoursEn: '07:00 AM - 09:00 PM',
      priceLevel,
      mapUrl: `https://maps.google.com/?q=${encodeURIComponent(nameKh)}`,
      latitude: 11.5564,
      longitude: 104.9282,
      signatureDishesKh: signatureDish.trim() ? [signatureDish.trim()] : ['ម្ហូបពិសេសប្រចាំហាង'],
      isFeatured: true,
      isVerified: true,
      membershipTier: 'premium' as const,
      status: 'approved' as const
    };

    addRestaurant(newRestData);
    setIsVipAddRestaurantModalOpen(false);

    // Open management modal for this new restaurant
    setTimeout(() => {
      const added = restaurants[0];
      if (added) {
        setManagingRestaurant(added);
        setIsManageMenuModalOpen(true);
      }
    }, 300);

    showToast(
      isKm 
        ? '🎉 បានបន្ថែមហាងថ្មីក្រោមសិទ្ធិ VIP ដោយជោគជ័យ! លោកអ្នកអាចគ្រប់គ្រងមុខម្ហូបបានភ្លាមៗ។' 
        : '🎉 Restaurant added under VIP benefits! You can now manage your menu items.',
      'success'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-amber-500/40 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-600 via-yellow-600 to-[#064E3B] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-400 text-slate-950 shadow-md">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-moul text-sm sm:text-base text-white">
                  {isKm ? 'បន្ថែមហាងផ្ទាល់ខ្លួន (VIP Store)' : 'Add My VIP Restaurant'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase font-sans">
                  VIP Power
                </span>
              </div>
              <p className="text-[11px] text-amber-100 font-khmer">
                {isKm ? 'បន្ថែមហាង និងគ្រប់គ្រងមុខម្ហូបបានភ្លាមៗ' : 'Instant store creation & menu control'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsVipAddRestaurantModalOpen(false)}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[78vh] font-khmer text-xs">
          {/* Store Name Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {isKm ? 'ឈ្មោះហាង (ជាភាសាខ្មែរ) *' : 'Restaurant Name (Khmer) *'}
              </label>
              <input
                type="text"
                required
                value={nameKh}
                onChange={e => setNameKh(e.target.value)}
                placeholder={isKm ? 'ឧ. ភោជនីយដ្ឋាន មរតកខ្មែរ' : 'e.g. Morodok Khmer'}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {isKm ? 'ឈ្មោះហាង (ជាអក្សរឡាតាំង)' : 'Restaurant Name (English)'}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={e => setNameEn(e.target.value)}
                placeholder="e.g. Morodok Khmer Restaurant"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Province & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {isKm ? 'រាជធានី / ខេត្ត' : 'Province / City'}
              </label>
              <select
                value={provinceKh}
                onChange={e => {
                  const found = provinces.find(p => p.nameKh === e.target.value);
                  setProvinceKh(e.target.value);
                  if (found) setProvinceEn(found.nameEn);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
              >
                {provinces.map(p => (
                  <option key={p.nameKh} value={p.nameKh}>
                    {isKm ? p.nameKh : p.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {isKm ? 'លេខទូរស័ព្ទទំនាក់ទំនង' : 'Phone Number'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="012 345 678"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Address & Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {isKm ? 'អាសយដ្ឋាន ឬទីតាំងជាក់ស្តែង' : 'Address'}
              </label>
              <input
                type="text"
                value={addressKh}
                onChange={e => setAddressKh(e.target.value)}
                placeholder={isKm ? 'ឧ. ផ្លូវលេខ ៦៣ សង្កាត់បឹងកេងកង' : 'Street address'}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                {isKm ? 'ម៉ោងបើក & បិទ' : 'Opening Hours'}
              </label>
              <input
                type="text"
                value={openingHoursKh}
                onChange={e => setOpeningHoursKh(e.target.value)}
                placeholder="០៧:០០ ព្រឹក - ០៩:០០ យប់"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Signature Dish */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
              {isKm ? 'មុខម្ហូបពិសេសប្រចាំហាង (Signature Dish)' : 'Signature Dish'}
            </label>
            <input
              type="text"
              value={signatureDish}
              onChange={e => setSignatureDish(e.target.value)}
              placeholder={isKm ? 'ឧ. អាម៉ុកត្រីរ៉ស់, សម្លម្ជូរគ្រឿង' : 'e.g. Traditional Fish Amok'}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Photo Selection */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              {isKm ? 'ជ្រើសរើសរូបថតហាង' : 'Store Photo'}
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {samplePhotos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="sample"
                  onClick={() => setPhotoUrl(url)}
                  className={`w-14 h-14 rounded-xl object-cover cursor-pointer border-2 transition shrink-0 ${
                    photoUrl === url ? 'border-amber-500 ring-2 ring-amber-400/50 scale-105' : 'border-slate-300 opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
            <input
              type="text"
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
              placeholder="Photo URL or /Shop/rest-X.jpg"
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
              {isKm ? 'ការពិពណ៌នាអំពីហាង' : 'Restaurant Description'}
            </label>
            <textarea
              rows={2}
              value={descriptionKh}
              onChange={e => setDescriptionKh(e.target.value)}
              placeholder={isKm ? 'រៀបរាប់សង្ខេបអំពីបរិយាកាស និងរសជាតិម្ហូប...' : 'Brief description...'}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* VIP Instant Publish Card */}
          <div className="p-3 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/15 rounded-2xl border border-amber-400/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {isKm ? 'សិទ្ធិ VIP ពេញលេញ (១០០% Unlocked)' : 'VIP Full Permissions'}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isKm ? 'ឥតគិតថ្លៃចុះបញ្ជី • ផ្សព្វផ្សាយភ្លាមៗ ៣៦៥ ថ្ងៃ' : 'Zero registration fee • Active for 365 days'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white font-black text-[10px]">
              FREE FOR VIP
            </span>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98"
            >
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
              <span>{isKm ? '✨ បង្កើតហាងភ្លាមៗ (Create VIP Store) →' : '✨ Create VIP Restaurant Now →'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

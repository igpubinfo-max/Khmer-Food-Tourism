import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Store, Image, MapPin, Phone, Clock, Plus, 
  ArrowRight, ArrowLeft, QrCode, ShieldCheck, CheckCircle2, 
  FileText, Copy, AlertTriangle, Sparkles 
} from 'lucide-react';
import { RestaurantPriceLevel } from '../types';

export const AddRestaurantModal: React.FC = () => {
  const { 
    isAddRestaurantModalOpen, 
    setIsAddRestaurantModalOpen, 
    addRestaurant, 
    addRegistrationTransaction,
    appSettings,
    language, 
    currentUser, 
    setIsAuthModalOpen,
    showToast 
  } = useApp();

  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [nameKh, setNameKh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [provinceKh, setProvinceKh] = useState('រាជធានីភ្នំពេញ');
  const [provinceEn, setProvinceEn] = useState('Phnom Penh');
  const [addressKh, setAddressKh] = useState('');
  const [phone, setPhone] = useState('');
  const [openingHoursKh, setOpeningHoursKh] = useState('០៧:០០ ព្រឹក - ០៩:០០ យប់');
  const [priceLevel, setPriceLevel] = useState<RestaurantPriceLevel>('$$');
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80');
  const [dishesInput, setDishesInput] = useState('អាម៉ុកត្រី, ឡុកឡាក់សាច់គោ, គុយទាវ');
  const [descriptionKh, setDescriptionKh] = useState('');

  // Payment Step Fields
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'KHQR' | 'Bakong' | 'BankTransfer'>('KHQR');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAddRestaurantModalOpen) return null;

  const isKm = language === 'km';
  const promoPrice = appSettings.promotionalFeeUsd || 4.99;

  // Preset photos for quick selection
  const samplePhotos = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
  ];

  const handleRegisterFreeTrial = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!nameKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលឈ្មោះហាងជាភាសាខ្មែរ!' : 'Please enter restaurant name in Khmer!', 'warning');
      return;
    }
    if (!addressKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលអាសយដ្ឋានហាង!' : 'Please enter restaurant address!', 'warning');
      return;
    }
    if (!phone.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលលេខទូរស័ព្ទទាក់ទង!' : 'Please enter contact phone number!', 'warning');
      return;
    }

    setIsSubmitting(true);

    const dishes = dishesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const generatedRestId = `rest-${Date.now()}`;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    // 1. Create Restaurant Listing with 1-Month Free Promotion
    addRestaurant({
      nameKh: nameKh || 'ហាងអាហារខ្មែរ',
      nameEn: nameEn || nameKh || 'Khmer Restaurant',
      provinceKh,
      provinceEn,
      addressKh: addressKh || 'កម្ពុជា',
      addressEn: addressKh || 'Cambodia',
      phone: phone.trim(),
      openingHoursKh,
      openingHoursEn: openingHoursKh,
      priceLevel,
      photoUrl,
      signatureDishesKh: dishes.length > 0 ? dishes : ['ម្ហូបខ្មែរប្រពៃណី'],
      descriptionKh: descriptionKh || 'ហាងអាហារខ្មែររសជាតិដើម បរិយាកាសស្អាត និងផាសុកភាព។',
      descriptionEn: descriptionKh || 'Authentic traditional Khmer restaurant with delicious dishes.',
      mapUrl: `https://maps.google.com/?q=${encodeURIComponent(nameKh || 'Cambodia Restaurant')}`,
      latitude: 11.5564,
      longitude: 104.9282,
      paymentStatus: 'free_trial',
      isFreeTrial: true,
      freeTrialExpiry: expiryDate.toISOString(),
      promotionalPrice: promoPrice,
      isPromoted: true,
      isVerified: true,
      status: 'approved',
    });

    // 2. Record Registration Transaction for Free Trial
    addRegistrationTransaction({
      restaurantId: generatedRestId,
      restaurantNameKh: nameKh,
      restaurantNameEn: nameEn || nameKh,
      ownerId: currentUser?.id || 'owner-guest',
      ownerName: currentUser?.name || 'Restaurant Owner',
      ownerPhone: phone,
      amountUsd: 0,
      paymentMethod: 'Manual',
      transactionRef: `FREE-TRIAL-${Date.now().toString().slice(-6)}`,
      status: 'verified',
      notes: '🎁 ការចុះបញ្ជីផ្សព្វផ្សាយឥតគិតថ្លៃ ១ ខែដំបូង (1-Month Free Trial Promotion)',
    });

    setIsSubmitting(false);
    setIsAddRestaurantModalOpen(false);
    setStep(1);
    setTransactionRef('');
  };

  const handleNextToPayment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!nameKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលឈ្មោះហាងជាភាសាខ្មែរ!' : 'Please enter restaurant name in Khmer!', 'warning');
      return;
    }
    if (!addressKh.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលអាសយដ្ឋានហាង!' : 'Please enter restaurant address!', 'warning');
      return;
    }
    if (!phone.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលលេខទូរស័ព្ទទាក់ទង!' : 'Please enter contact phone number!', 'warning');
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionRef.trim()) {
      showToast(
        isKm 
          ? 'សូមបញ្ចូលលេខកូដប្រតិបត្តិការធនាគារ (Transaction Ref / Trx ID) ពីវិក្កយបត្ររបស់អ្នក!' 
          : 'Please enter your bank Transaction Reference / Trx ID!', 
        'warning'
      );
      return;
    }

    setIsSubmitting(true);

    const dishes = dishesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const generatedRestId = `rest-${Date.now()}`;

    // 1. Create Restaurant Listing (Pending admin verification)
    addRestaurant({
      nameKh: nameKh || 'ហាងអាហារខ្មែរ',
      nameEn: nameEn || nameKh || 'Khmer Restaurant',
      provinceKh,
      provinceEn,
      addressKh: addressKh || 'កម្ពុជា',
      addressEn: addressKh || 'Cambodia',
      phone: phone.trim(),
      openingHoursKh,
      openingHoursEn: openingHoursKh,
      priceLevel,
      photoUrl,
      signatureDishesKh: dishes.length > 0 ? dishes : ['ម្ហូបខ្មែរប្រពៃណី'],
      descriptionKh: descriptionKh || 'ហាងអាហារខ្មែររសជាតិដើម បរិយាកាសស្អាត និងផាសុកភាព។',
      descriptionEn: descriptionKh || 'Authentic traditional Khmer restaurant with delicious dishes.',
      mapUrl: `https://maps.google.com/?q=${encodeURIComponent(nameKh || 'Cambodia Restaurant')}`,
      latitude: 11.5564,
      longitude: 104.9282,
      paymentStatus: 'pending_verification',
      promotionalPrice: promoPrice,
      isPromoted: false,
    });

    // 2. Record Registration Transaction
    addRegistrationTransaction({
      restaurantId: generatedRestId,
      restaurantNameKh: nameKh,
      restaurantNameEn: nameEn || nameKh,
      ownerId: currentUser?.id || 'owner-guest',
      ownerName: currentUser?.name || 'Restaurant Owner',
      ownerPhone: phone,
      amountUsd: promoPrice,
      paymentMethod,
      transactionRef: transactionRef.trim(),
      notes: `Promotional registration payment ($${promoPrice} USD). Awaiting administrative verification against bank statement.`,
    });

    setIsSubmitting(false);
    setIsAddRestaurantModalOpen(false);
    setStep(1);
    setTransactionRef('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-amber-300/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-gradient-to-r from-amber-900 via-red-900 to-amber-950 text-amber-50">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-moul text-sm text-amber-200">
                {isKm ? 'ចុះបញ្ជី និងផ្សព្វផ្សាយហាងអាហារ' : 'Register & Promote Restaurant'}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-amber-200/90 font-khmer">
                <span className={`px-2 py-0.5 rounded-full ${step === 1 ? 'bg-amber-500 text-white font-bold' : 'bg-white/20'}`}>
                  {isKm ? '១. ចុះបញ្ជីឥតគិតថ្លៃ ១ ខែ' : '1. Free 1-Month Trial'}
                </span>
                <span>→</span>
                <span className={`px-2 py-0.5 rounded-full ${step === 2 ? 'bg-amber-500 text-white font-bold' : 'bg-white/20'}`}>
                  {isKm ? `២. VIP ប្រូម៉ូសិន $${promoPrice}` : `2. VIP Promo $${promoPrice}`}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsAddRestaurantModalOpen(false)}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-amber-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Restaurant Details Form */}
        {step === 1 && (
          <form onSubmit={handleRegisterFreeTrial} className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1 text-xs">
            {/* 1-Month Free Promotional Banner */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-amber-50 to-orange-50 dark:from-stone-800 dark:to-stone-800 rounded-2xl border-2 border-emerald-400/80 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow">
                  🎁
                </div>
                <div>
                  <div className="font-bold text-emerald-950 dark:text-emerald-200 font-khmer text-xs flex items-center gap-1.5">
                    <span>{isKm ? 'ឥតគិតថ្លៃ ១ ខែដំបូង ក្រោយការចុះបញ្ជី!' : '1-Month Free Trial Upon Registration!'}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-600 text-white font-mono font-bold">FREE</span>
                  </div>
                  <div className="text-[10px] text-stone-600 dark:text-stone-300 font-khmer mt-0.5 leading-snug">
                    {isKm 
                      ? 'ហាងរបស់អ្នកនឹងត្រូវបានដាក់បង្ហាញ និងផ្សព្វផ្សាយរយៈពេល ៣០ ថ្ងៃដោយឥតគិតថ្លៃ។ ផុតកំណត់ទើបជ្រើសរើសបន្តប្រូម៉ូសិនពិសេសត្រឹម $4.99 USD តាម ABA Bank' 
                      : 'Your restaurant will be actively promoted for 30 days for free. Extended VIP promotion is only $4.99 USD via ABA Bank.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Shop Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1 font-khmer">
                  {isKm ? 'ឈ្មោះហាងជាភាសាខ្មែរ *' : 'Restaurant Name (Khmer) *'}
                </label>
                <input
                  type="text"
                  required
                  value={nameKh}
                  onChange={(e) => setNameKh(e.target.value)}
                  placeholder="ឧ. ភោជនីយដ្ឋាន ម្លិះអង្គរ"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500 font-khmer"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1 font-khmer">
                  {isKm ? 'ឈ្មោះហាងជាអក្សរឡាតាំង' : 'Restaurant Name (English)'}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Malis Angkor Restaurant"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Province & Price Tier */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1 font-khmer">
                  {isKm ? 'ខេត្ត / រាជធានី' : 'Province / City'}
                </label>
                <select
                  value={provinceKh}
                  onChange={(e) => {
                    setProvinceKh(e.target.value);
                    setProvinceEn(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500 font-khmer"
                >
                  <option value="រាជធានីភ្នំពេញ">រាជធានីភ្នំពេញ (Phnom Penh)</option>
                  <option value="ខេត្តសៀមរាប">ខេត្តសៀមរាប (Siem Reap)</option>
                  <option value="ខេត្តបាត់ដំបង">ខេត្តបាត់ដំបង (Battambang)</option>
                  <option value="ខេត្តកំពត">ខេត្តកំពត (Kampot)</option>
                  <option value="ខេត្តកែប">ខេត្តកែប (Kep)</option>
                  <option value="ខេត្តព្រះសីហនុ">ខេត្តព្រះសីហនុ (Sihanoukville)</option>
                  <option value="ខេត្តមណ្ឌលគិរី">ខេត្តមណ្ឌលគិរី (Mondulkiri)</option>
                  <option value="ខេត្តរតនគិរី">ខេត្តរតនគិរី (Ratanakiri)</option>
                  <option value="ខេត្តកោះកុង">ខេត្តកោះកុង (Koh Kong)</option>
                  <option value="ខេត្តកំពង់ចាម">ខេត្តកំពង់ចាម (Kampong Cham)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1 font-khmer">
                  {isKm ? 'កម្រិតតម្លៃ' : 'Price Tier'}
                </label>
                <select
                  value={priceLevel}
                  onChange={(e) => setPriceLevel(e.target.value as RestaurantPriceLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500 font-khmer"
                >
                  <option value="$">$ (ទូទៅ / $1 - $3)</option>
                  <option value="$$">$$ (មធ្យម / $3 - $8)</option>
                  <option value="$$$">$$$ (លំដាប់ខ្ពស់ / $8 - $20)</option>
                  <option value="$$$$">$$$$ (ប្រណិត / $20+)</option>
                </select>
              </div>
            </div>

            {/* Address & Contact Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1 font-khmer">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
                  {isKm ? 'អាសយដ្ឋានជាក់ស្ដែង *' : 'Physical Address *'}
                </label>
                <input
                  type="text"
                  required
                  value={addressKh}
                  onChange={(e) => setAddressKh(e.target.value)}
                  placeholder="ផ្ទះលេខ, ផ្លូវ, សង្កាត់, ក្រុង/ខណ្ឌ..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500 font-khmer"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1 font-khmer">
                  <Phone className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                  {isKm ? 'លេខទូរស័ព្ទទាក់ទង *' : 'Contact Phone *'}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="012 xxx xxx"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Opening Hours & Signature Dishes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1 font-khmer">
                  <Clock className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
                  {isKm ? 'ម៉ោងបើកដំណើរការ' : 'Opening Hours'}
                </label>
                <input
                  type="text"
                  value={openingHoursKh}
                  onChange={(e) => setOpeningHoursKh(e.target.value)}
                  placeholder="០៧:០០ ព្រឹក - ០៩:០០ យប់"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500 font-khmer"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1 font-khmer">
                  {isKm ? 'មុខម្ហូបប្រចាំហាង (ញែកដោយក្បៀស)' : 'Signature Dishes (comma-separated)'}
                </label>
                <input
                  type="text"
                  value={dishesInput}
                  onChange={(e) => setDishesInput(e.target.value)}
                  placeholder="អាម៉ុកត្រី, ឡុកឡាក់, ក្តាមឆាម្រេចខ្ចី"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500 font-khmer"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1 font-khmer">
                {isKm ? 'ការពិពណ៌នាអំពីហាង' : 'Restaurant Description'}
              </label>
              <textarea
                rows={2}
                value={descriptionKh}
                onChange={(e) => setDescriptionKh(e.target.value)}
                placeholder="រៀបរាប់ពីរសជាតិអាហារ បរិយាកាស និងសេវាកម្ម..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500 resize-none font-khmer"
              />
            </div>

            {/* Photo URL & Presets */}
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1 font-khmer">
                <Image className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
                {isKm ? 'រូបភាពតំណាងហាង (Photo URL)' : 'Restaurant Photo URL'}
              </label>
              <input
                type="url"
                required
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500 mb-2"
              />

              <div className="grid grid-cols-4 gap-2">
                {samplePhotos.map((url, i) => (
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

            {/* Step 1 Actions */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 hover:from-emerald-700 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-emerald-700/20 transition active:scale-[0.98] flex items-center justify-center gap-2 font-khmer disabled:opacity-50"
              >
                <span>🎁</span>
                <span>{isKm ? 'ចុះបញ្ជី និងបើកការផ្សព្វផ្សាយឥតគិតថ្លៃ ១ ខែភ្លាមៗ' : 'Register & Activate 1-Month Free Promotion Now'}</span>
              </button>

              <button
                type="button"
                onClick={handleNextToPayment}
                className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium text-[11px] transition flex items-center justify-center gap-1.5 font-khmer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>{isKm ? `ឬ បង់ប្រាក់ $${promoPrice} តាម ABA Bank ដើម្បីផ្សព្វផ្សាយអចិន្ត្រៃយ៍ (Lifetime VIP)` : `Or Pay $${promoPrice} via ABA Bank for Lifetime VIP`}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Payment Workflow ($4.99 USD) */}
        {step === 2 && (
          <form onSubmit={handleFinalSubmit} className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1 text-xs">
            {/* Promo Price Header Box */}
            <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/70 dark:from-stone-800 dark:to-stone-900 p-4 rounded-2xl border border-amber-300 text-center relative overflow-hidden">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-full mb-2 shadow-sm font-khmer">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Special Promotional Price: ${promoPrice} USD</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-stone-400 line-through text-sm">$19.99 USD</span>
                <span className="text-2xl font-black text-red-700 font-mono">${promoPrice} USD</span>
                <span className="text-xs text-stone-500 font-khmer">(~ ២០,៤០០ រៀល)</span>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 font-khmer mt-1">
                {isKm 
                  ? 'ថ្លៃចុះបញ្ជី និងផ្សព្វផ្សាយហាងអាហារពេញមួយជីវិត គ្មានការគិតថ្លៃប្រចាំខែ' 
                  : 'One-time promotional fee for lifetime restaurant listing and promotion.'}
              </p>
            </div>

            {/* Bakong KHQR Payment Box */}
            <div className="bg-stone-50 dark:bg-stone-800/60 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 flex flex-col items-center">
              <div className="text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-2 font-khmer flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-red-600" />
                <span>{isKm ? 'ស្កេនទូទាត់តាម ABA Mobile ឬ Bakong KHQR' : 'Scan & Pay via ABA Mobile / Bakong KHQR'}</span>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-amber-400 mb-3 text-center">
                <img 
                  src={appSettings.supportQrImageUrl || '/donation-qr.png'} 
                  alt="KHQR Registration Fee" 
                  className="w-44 h-44 object-contain mx-auto"
                />
                <div className="text-[10px] font-bold text-stone-600 mt-1 font-mono">
                  AMOUNT: ${promoPrice} USD
                </div>
              </div>

              {/* Bank Details */}
              <div className="w-full bg-white dark:bg-stone-900 rounded-xl p-3 border border-stone-200 dark:border-stone-700 text-[11px] space-y-1 font-khmer">
                <div className="flex justify-between">
                  <span className="text-stone-500">{isKm ? 'ធនាគារ៖' : 'Bank:'}</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">{appSettings.supportBankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">{isKm ? 'ម្ចាស់គណនី៖' : 'Beneficiary:'}</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">{appSettings.supportAccountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">{isKm ? 'ចំនួនទឹកប្រាក់៖' : 'Total Amount:'}</span>
                  <span className="font-bold text-red-600 font-mono">${promoPrice} USD</span>
                </div>
              </div>
            </div>

            {/* Transaction Reference Input */}
            <div className="space-y-1.5">
              <label className="block font-bold text-stone-800 dark:text-stone-200 font-khmer text-xs">
                {isKm ? 'លេខកូដប្រតិបត្តិការធនាគារ (Transaction Ref / Trx ID) *' : 'Bank Transaction Reference / Trx ID *'}
              </label>
              <input
                type="text"
                required
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="ឧ. KHQR-123456789 ឬលេខ Ref លើវិក្កយបត្រ"
                className="w-full px-3 py-2.5 rounded-xl border-2 border-amber-400 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-bold focus:outline-none focus:border-red-600"
              />
              <p className="text-[10px] text-stone-500 font-khmer">
                {isKm 
                  ? 'សូមបញ្ចូលលេខកូដប្រតិបត្តិការ (Trx ID) ដែលមាននៅលើបង្កាន់ដៃធនាគាររបស់អ្នក ដើម្បីឱ្យរដ្ឋបាលផ្ទៀងផ្ទាត់។' 
                  : 'Enter the Transaction ID shown on your mobile banking receipt for admin verification.'}
              </p>
            </div>

            {/* Strict Admin Verification Notice */}
            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-300 dark:border-red-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-[10px] text-red-900 dark:text-red-200 font-khmer leading-relaxed">
                <span className="font-bold block text-red-700 dark:text-red-300 mb-0.5">
                  {isKm ? 'ការការពារសុវត្ថិភាព និងការផ្ទៀងផ្ទាត់ផ្លូវការ' : 'Security Policy & Official Verification'}
                </span>
                {isKm 
                  ? 'ប្រព័ន្ធមិនអនុញ្ញាតឱ្យហាងដំណើរការដោយស្វ័យប្រវត្តិតែមួយក្ដុចឡើយ។ ហាងរបស់អ្នកនឹងស្ថិតក្នុងស្ថានភាព "រង់ចាំការផ្ទៀងផ្ទាត់" (Pending Verification) ហើយនឹងត្រូវបានធ្វើឱ្យសកម្ម (Verified & Activated) បន្ទាប់ពីរដ្ឋបាលបានផ្ទៀងផ្ទាត់លេខកូដប្រតិបត្តិការត្រឹមត្រូវជាមួយធនាគារ។' 
                  : 'Listings are never activated solely by user confirmation. The listing will remain in "Pending Verification" status until the administrator verifies the payment against official bank statements.'}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-khmer text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isKm ? 'ត្រឡប់ក្រោយ' : 'Back'}</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-khmer text-xs font-bold shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 transition active:scale-[0.98] disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isKm ? 'ដាក់ស្នើ និងបង់ប្រាក់' : 'Submit & Pay'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

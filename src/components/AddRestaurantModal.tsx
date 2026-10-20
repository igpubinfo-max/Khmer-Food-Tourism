import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Store, Image, MapPin, Phone, Clock, Plus, 
  ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, 
  AlertTriangle, Sparkles, Building2, CreditCard
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
  const [selectedTier, setSelectedTier] = useState<'free' | 'premium'>('free');

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
  const [descriptionKh, setDescriptionKh] = useState('');

  // Payment Step Fields (One-time $4.99 for 365 Days)
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'BankTransfer' | 'Bakong' | 'KHQR'>('BankTransfer');
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

  // 1. Free Registration Handler ($0 Free Listing)
  const handleFreeRegistration = (e?: React.FormEvent) => {
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

    addRestaurant({
      nameKh: nameKh.trim() || 'ហាងអាហារខ្មែរ',
      nameEn: nameEn.trim() || nameKh.trim() || 'Khmer Restaurant',
      provinceKh,
      provinceEn,
      addressKh: addressKh.trim() || 'កម្ពុជា',
      addressEn: addressKh.trim() || 'Cambodia',
      phone: phone.trim(),
      openingHoursKh,
      openingHoursEn: openingHoursKh,
      priceLevel,
      photoUrl,
      signatureDishesKh: ['ម្ហូបខ្មែរប្រពៃណី'],
      descriptionKh: descriptionKh.trim() || 'ហាងអាហារខ្មែររសជាតិដើម បរិយាកាសស្អាត និងផាសុកភាព។',
      descriptionEn: descriptionKh.trim() || 'Authentic traditional Khmer restaurant.',
      mapUrl: `https://maps.google.com/?q=${encodeURIComponent(nameKh || 'Cambodia Restaurant')}`,
      latitude: 11.5564,
      longitude: 104.9282,
      membershipTier: 'free',
      menuItems: [], // Free users cannot add food menu items!
      status: 'approved',
      isVerified: true,
      isPromoted: false,
    });

    setIsSubmitting(false);
    setIsAddRestaurantModalOpen(false);
    setStep(1);
    setSelectedTier('free');
  };

  // 2. Next to Step 2 for Premium ($4.99 for 365 Days)
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

  // 3. Final Submit for Premium ($4.99 Payment)
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
    const generatedRestId = `rest-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // Create Restaurant with Premium status
    addRestaurant({
      nameKh: nameKh.trim() || 'ហាងអាហារខ្មែរ',
      nameEn: nameEn.trim() || nameKh.trim() || 'Khmer Restaurant',
      provinceKh,
      provinceEn,
      addressKh: addressKh.trim() || 'កម្ពុជា',
      addressEn: addressKh.trim() || 'Cambodia',
      phone: phone.trim(),
      openingHoursKh,
      openingHoursEn: openingHoursKh,
      priceLevel,
      photoUrl,
      signatureDishesKh: ['ម្ហូបខ្មែរប្រពៃណី'],
      descriptionKh: descriptionKh.trim() || 'ហាងអាហារខ្មែររសជាតិដើម បរិយាកាសស្អាត និងផាសុកភាព។',
      descriptionEn: descriptionKh.trim() || 'Authentic traditional Khmer restaurant with delicious dishes.',
      mapUrl: `https://maps.google.com/?q=${encodeURIComponent(nameKh || 'Cambodia Restaurant')}`,
      latitude: 11.5564,
      longitude: 104.9282,
      membershipTier: 'premium',
      membershipExpiresAt: expiresAt,
      menuItems: [], // Up to 5 items can now be added by owner!
      paymentStatus: 'pending_verification',
      promotionalPrice: promoPrice,
      isPromoted: true,
      isVerified: true,
      status: 'approved',
    });

    // Record Registration Transaction
    addRegistrationTransaction({
      restaurantId: generatedRestId,
      restaurantNameKh: nameKh.trim(),
      restaurantNameEn: nameEn.trim() || nameKh.trim(),
      ownerId: currentUser?.id || 'owner-guest',
      ownerName: currentUser?.name || 'Restaurant Owner',
      ownerPhone: phone.trim(),
      amountUsd: promoPrice,
      paymentMethod,
      transactionRef: transactionRef.trim(),
      notes: `One-time payment of $${promoPrice} USD for 365 days Premium Membership (allows up to 5 food menu items). No monthly charges.`,
    });

    setIsSubmitting(false);
    setIsAddRestaurantModalOpen(false);
    setStep(1);
    setTransactionRef('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#047857] flex items-center justify-between bg-[#064E3B] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-200 rounded-xl border border-emerald-400/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-moul text-sm text-white leading-snug">
                {isKm ? 'ចុះបញ្ជីហាងអាហារ' : 'Register Restaurant'}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-200 font-khmer">
                <span className={`px-2 py-0.5 rounded-full ${step === 1 ? 'bg-[#10B981] text-white font-bold' : 'bg-white/20'}`}>
                  {isKm ? '១. ព័ត៌មានហាង' : '1. Shop Details'}
                </span>
                {selectedTier === 'premium' && (
                  <>
                    <span>→</span>
                    <span className={`px-2 py-0.5 rounded-full ${step === 2 ? 'bg-[#10B981] text-white font-bold' : 'bg-white/20'}`}>
                      {isKm ? `២. Premium $${promoPrice} (៣៦៥ ថ្ងៃ)` : `2. Premium $${promoPrice} (365 Days)`}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsAddRestaurantModalOpen(false)}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Restaurant Form & Membership Selector */}
        {step === 1 && (
          <form 
            onSubmit={selectedTier === 'free' ? handleFreeRegistration : handleNextToPayment} 
            className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1 text-xs font-khmer"
          >
            {/* Membership Tier Cards */}
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 text-xs">
                {isKm ? 'ជ្រើសរើសប្រភេទសមាជិកភាព (Select Membership Plan):' : 'Select Membership Plan:'}
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* Free Listing Card ($0) */}
                <div 
                  onClick={() => setSelectedTier('free')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    selectedTier === 'free' 
                      ? 'border-[#059669] bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-[#059669]/20' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-[#0F172A] dark:text-slate-100 flex items-center gap-1">
                        <span>🎁</span>
                        <span>{isKm ? 'ឥតគិតថ្លៃ' : 'Free Listing'}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#059669] text-white">
                        $0
                      </span>
                    </div>
                    <ul className="text-[10px] text-slate-600 dark:text-slate-300 space-y-1">
                      <li>✓ {isKm ? 'បង្ហាញក្នុងបញ្ជីហាងផ្លូវការ' : 'Listed in directory'}</li>
                      <li>✓ {isKm ? 'រូបតំណាងហាង ១ សន្លឹក' : '1 profile photo'}</li>
                      <li>✓ {isKm ? 'អាសយដ្ឋាន និងលេខទូរស័ព្ទ' : 'Address & contact info'}</li>
                      <li className="text-red-500 font-semibold pt-0.5">
                        ✗ {isKm ? 'មិនអាចបន្ថែមមុខម្ហូបបានទេ' : 'Cannot add food items'}
                      </li>
                    </ul>
                  </div>
                  {selectedTier === 'free' && (
                    <div className="mt-2 text-[10px] font-bold text-[#064E3B] dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isKm ? 'បានជ្រើសរើស' : 'Selected'}</span>
                    </div>
                  )}
                </div>

                {/* Premium Membership Card ($4.99 for 365 Days) */}
                <div 
                  onClick={() => setSelectedTier('premium')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                    selectedTier === 'premium' 
                      ? 'border-[#064E3B] bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-[#064E3B]/20' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-[#064E3B] dark:text-emerald-400 flex items-center gap-1">
                        <span>⭐</span>
                        <span>{isKm ? 'Premium VIP' : 'Premium VIP'}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#064E3B] text-white font-mono">
                        $4.99
                      </span>
                    </div>
                    <ul className="text-[10px] text-slate-600 dark:text-slate-300 space-y-1">
                      <li className="text-[#064E3B] dark:text-emerald-400 font-bold">
                        ✓ {isKm ? 'ថែមមុខម្ហូបបានរហូតដល់ ៥ មុខ' : 'Add up to 5 food items'}
                      </li>
                      <li>✓ {isKm ? 'រូបភាព តម្លៃ និងការពិពណ៌នា' : 'Photos, prices, descriptions'}</li>
                      <li>✓ {isKm ? 'កែប្រែព័ត៌មានបានគ្រប់ពេល' : 'Edit info during membership'}</li>
                      <li>✓ {isKm ? 'សុពលភាព ១ ឆ្នាំ (៣៦៥ ថ្ងៃ)' : 'One-time for 365 days'}</li>
                    </ul>
                  </div>
                  {selectedTier === 'premium' && (
                    <div className="mt-2 text-[10px] font-bold text-[#064E3B] dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isKm ? 'បានជ្រើសរើស ($4.99)' : 'Selected ($4.99)'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* No Auto-Renew Guarantee Notice */}
              <p className="text-[10px] text-slate-500 mt-1.5">
                {isKm 
                  ? 'ℹ️ ការទូទាត់ Premium គឺជាការបង់តែមួយលើក $4.99 សម្រាប់រយៈពេល ៣៦៥ ថ្ងៃ (គ្មានការកាត់ប្រាក់ប្រចាំខែ និងគ្មានការបន្តស្វ័យប្រវត្តិឡើយ)។' 
                  : 'ℹ️ Premium is a one-time payment of $4.99 for 365 days. No monthly subscription or automatic renewal.'}
              </p>
            </div>

            {/* Shop Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isKm ? 'ឈ្មោះហាងជាភាសាខ្មែរ *' : 'Restaurant Name (Khmer) *'}
                </label>
                <input
                  type="text"
                  required
                  value={nameKh}
                  onChange={(e) => setNameKh(e.target.value)}
                  placeholder="ឧ. ភោជនីយដ្ឋាន ម្លិះអង្គរ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isKm ? 'ឈ្មោះហាងជាអក្សរឡាតាំង' : 'Restaurant Name (English)'}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Malis Angkor Restaurant"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-sans focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
                />
              </div>
            </div>

            {/* Province & Price Tier */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isKm ? 'ខេត្ត / រាជធានី' : 'Province / City'}
                </label>
                <select
                  value={provinceKh}
                  onChange={(e) => {
                    setProvinceKh(e.target.value);
                    setProvinceEn(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
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
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isKm ? 'កម្រិតតម្លៃ' : 'Price Tier'}
                </label>
                <select
                  value={priceLevel}
                  onChange={(e) => setPriceLevel(e.target.value as RestaurantPriceLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
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
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-[#059669]" />
                  {isKm ? 'អាសយដ្ឋានជាក់ស្ដែង *' : 'Physical Address *'}
                </label>
                <input
                  type="text"
                  required
                  value={addressKh}
                  onChange={(e) => setAddressKh(e.target.value)}
                  placeholder="ផ្ទះលេខ, ផ្លូវ, សង្កាត់, ក្រុង/ខណ្ឌ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <Phone className="w-3.5 h-3.5 inline mr-1 text-[#059669]" />
                  {isKm ? 'លេខទូរស័ព្ទទាក់ទង *' : 'Contact Phone *'}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="012 xxx xxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
                />
              </div>
            </div>

            {/* Opening Hours */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-[#059669]" />
                {isKm ? 'ម៉ោងបើកដំណើរការ' : 'Opening Hours'}
              </label>
              <input
                type="text"
                value={openingHoursKh}
                onChange={(e) => setOpeningHoursKh(e.target.value)}
                placeholder="០៧:០០ ព្រឹក - ០៩:០០ យប់"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isKm ? 'ការពិពណ៌នាអំពីហាង' : 'Restaurant Description'}
              </label>
              <textarea
                rows={2}
                value={descriptionKh}
                onChange={(e) => setDescriptionKh(e.target.value)}
                placeholder="រៀបរាប់ពីរសជាតិអាហារ បរិយាកាស និងសេវាកម្ម..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs resize-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
              />
            </div>

            {/* Profile Photo */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                <Image className="w-3.5 h-3.5 inline mr-1 text-[#059669]" />
                {isKm ? 'រូបភាពតំណាងហាង (Restaurant Profile Photo URL) *' : 'Profile Photo URL *'}
              </label>
              <input
                type="url"
                required
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs mb-2 focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] outline-none"
              />

              <div className="grid grid-cols-4 gap-2">
                {samplePhotos.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setPhotoUrl(url)}
                    className={`aspect-16/10 rounded-lg overflow-hidden cursor-pointer border-2 transition ${
                      photoUrl === url ? 'border-[#064E3B] ring-2 ring-[#059669]' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="sample" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-2">
              {selectedTier === 'free' ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>🚀</span>
                  <span>{isKm ? 'ចុះបញ្ជីហាងឥតគិតថ្លៃ ($0 Free Listing)' : 'Register Free Restaurant Listing ($0)'}</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>{isKm ? `បន្តទៅបង់ប្រាក់សមាជិកភាព Premium ($${promoPrice} សម្រាប់ ៣៦៥ ថ្ងៃ)` : `Continue to Premium ($${promoPrice} for 365 Days)`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        )}

        {/* Step 2: Payment Workflow (One-Time $4.99 USD for 365 Days) — NO QR CODE */}
        {step === 2 && (
          <form onSubmit={handleFinalSubmit} className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1 text-xs font-khmer">
            {/* Promo Price Header Box */}
            <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-slate-800 dark:to-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center relative overflow-hidden">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#064E3B] text-white text-[10px] font-bold rounded-full mb-2 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>One-Time Payment: ${promoPrice} USD for 365 Days</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-slate-400 line-through text-sm">$19.99 USD</span>
                <span className="text-2xl font-black text-[#064E3B] dark:text-emerald-400 font-mono">${promoPrice} USD</span>
                <span className="text-xs text-slate-500">(~ ២០,៤០០ រៀល)</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                {isKm 
                  ? 'ការទូទាត់តែមួយលើក $4.99 សម្រាប់រយៈពេល ៣៦៥ ថ្ងៃពេញ (គ្មានការគិតថ្លៃប្រចាំខែ និងគ្មានការបន្តស្វ័យប្រវត្តិឡើយ)។ លោកអ្នកអាចបន្ថែមមុខម្ហូបក្នុងហាងបានរហូតដល់ ៥ មុខ។' 
                  : 'One-time payment of $4.99 for 365 days. No monthly subscription or automatic renewal. Add up to 5 food menu items.'}
              </p>
            </div>

            {/* Bank Transfer Box (NO QR CODE) */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="text-xs font-bold text-[#0F172A] dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#059669]" />
                <span>{isKm ? 'ព័ត៌មានគណនីផ្ទេរប្រាក់ (ABA Bank Transfer)' : 'Bank Transfer Information'}</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isKm ? 'ធនាគារ៖' : 'Bank:'}</span>
                  <span className="font-bold text-[#0F172A] dark:text-slate-100 font-mono">ABA BANK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isKm ? 'ម្ចាស់គណនី៖' : 'Beneficiary:'}</span>
                  <span className="font-bold text-[#0F172A] dark:text-slate-100 font-mono">KHMER FOOD TOURISM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isKm ? 'លេខគណនី៖' : 'Account Number:'}</span>
                  <span className="font-bold text-[#064E3B] dark:text-emerald-400 font-mono text-xs">000 123 456 (USD)</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">{isKm ? 'ចំនួនទឹកប្រាក់៖' : 'Total Amount:'}</span>
                  <span className="font-bold text-[#064E3B] dark:text-emerald-400 font-mono text-xs">${promoPrice} USD</span>
                </div>
              </div>
            </div>

            {/* Transaction Reference Input */}
            <div className="space-y-1.5">
              <label className="block font-bold text-[#0F172A] dark:text-slate-200 text-xs">
                {isKm ? 'លេខកូដប្រតិបត្តិការធនាគារ (Transaction Ref / Trx ID) *' : 'Bank Transaction Reference / Trx ID *'}
              </label>
              <input
                type="text"
                required
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="ឧ. TRX-123456789 ឬលេខ Ref លើវិក្កយបត្រ ABA"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 font-mono font-bold text-xs focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20"
              />
              <p className="text-[10px] text-slate-500">
                {isKm 
                  ? 'បញ្ចូលលេខកូដប្រតិបត្តិការពីបង្កាន់ដៃធនាគារ ABA របស់អ្នក ដើម្បីឱ្យរដ្ឋបាលផ្ទៀងផ្ទាត់ និងបើកដំណើរការ ៣៦៥ ថ្ងៃជូន។' 
                  : 'Enter the Transaction ID shown on your ABA bank receipt for administrative verification.'}
              </p>
            </div>

            {/* Verification Notice */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
              <div className="text-[10px] text-[#0F172A] dark:text-slate-200 leading-relaxed">
                <span className="font-bold block text-[#064E3B] dark:text-emerald-400 mb-0.5">
                  {isKm ? 'ការការពារសុវត្ថិភាព និងការផ្ទៀងផ្ទាត់' : 'Security & Verification'}
                </span>
                {isKm 
                  ? 'រដ្ឋបាលនឹងផ្ទៀងផ្ទាត់លេខកូដប្រតិបត្តិការធនាគារជាមួយរបាយការណ៍គណនី ABA Bank ដើម្បីបើកដំណើរការសមាជិកភាព Premium ៣៦៥ ថ្ងៃពេញ។' 
                  : 'The administrator will verify the bank transaction reference to activate your 365-day Premium membership.'}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isKm ? 'ត្រឡប់ក្រោយ' : 'Back'}</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="py-3 px-4 rounded-2xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center justify-center gap-1.5 transition active:scale-[0.98] disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isKm ? 'ដាក់ស្នើ និងបង់ប្រាក់' : 'Submit & Pay $4.99'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

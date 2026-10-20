import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Store, Image, MapPin, Phone, Clock, Plus } from 'lucide-react';
import { RestaurantPriceLevel } from '../types';

export const AddRestaurantModal: React.FC = () => {
  const { 
    isAddRestaurantModalOpen, setIsAddRestaurantModalOpen, 
    addRestaurant, language, currentUser, setIsAuthModalOpen 
  } = useApp();

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

  if (!isAddRestaurantModalOpen) return null;

  // Preset photos for quick selection
  const samplePhotos = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    const dishes = dishesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    addRestaurant({
      nameKh: nameKh || 'ហាងអាហារខ្មែរ',
      nameEn: nameEn || nameKh || 'Khmer Restaurant',
      provinceKh,
      provinceEn,
      addressKh: addressKh || 'កម្ពុជា',
      addressEn: addressKh || 'Cambodia',
      phone: phone || '012 345 678',
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
    });

    setIsAddRestaurantModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-amber-900 text-amber-50">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-300" />
            <h2 className="font-moul text-sm sm:text-base text-amber-200">
              {language === 'km' ? 'ចុះបញ្ជីហាងអាហារថ្មី' : 'Register New Restaurant'}
            </h2>
          </div>
          <button
            onClick={() => setIsAddRestaurantModalOpen(false)}
            className="p-1 rounded-full text-amber-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1 text-xs">
          {/* Shop Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === 'km' ? 'ឈ្មោះហាងជាភាសាខ្មែរ *' : 'Restaurant Name (Khmer) *'}
              </label>
              <input
                type="text"
                required
                value={nameKh}
                onChange={(e) => setNameKh(e.target.value)}
                placeholder="ឧទាហរណ៍៖ ភោជនីយដ្ឋាន មរតកខ្មែរ"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === 'km' ? 'ឈ្មោះហាងជាអក្សរឡាតាំង' : 'Restaurant Name (English)'}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Morodok Khmer Restaurant"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Province & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === 'km' ? 'ខេត្ត / រាជធានី' : 'Province / City'}
              </label>
              <select
                value={provinceKh}
                onChange={(e) => {
                  setProvinceKh(e.target.value);
                  setProvinceEn(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
              >
                <option value="រាជធានីភ្នំពេញ">រាជធានីភ្នំពេញ (Phnom Penh)</option>
                <option value="ខេត្តសៀមរាប">ខេត្តសៀមរាប (Siem Reap)</option>
                <option value="ខេត្តបាត់ដំបង">ខេត្តបាត់ដំបង (Battambang)</option>
                <option value="ខេត្តកំពត">ខេត្តកំពត (Kampot)</option>
                <option value="ខេត្តកែប">ខេត្តកែប (Kep)</option>
                <option value="ខេត្តព្រះសីហនុ">ខេត្តព្រះសីហនុ (Sihanoukville)</option>
                <option value="ខេត្តមណ្ឌលគិរី">ខេត្តមណ្ឌលគិរី (Mondulkiri)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === 'km' ? 'កម្រិតតម្លៃ' : 'Price Tier'}
              </label>
              <select
                value={priceLevel}
                onChange={(e) => setPriceLevel(e.target.value as RestaurantPriceLevel)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
              >
                <option value="$">$ (ទូទៅ / Street Food $1-$3)</option>
                <option value="$$">$$ (មធ្យម / Mid-range $3-$8)</option>
                <option value="$$$">$$$ (លំដាប់ខ្ពស់ / Upscale $10-$25)</option>
                <option value="$$$$">$$$$ (ប្រណិត / Luxury $30+)</option>
              </select>
            </div>
          </div>

          {/* Address & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
                {language === 'km' ? 'អាសយដ្ឋានជាក់ស្ដែង' : 'Physical Address'}
              </label>
              <input
                type="text"
                required
                value={addressKh}
                onChange={(e) => setAddressKh(e.target.value)}
                placeholder="ផ្ទះលេខ, ផ្លូវ, សង្កាត់, ខណ្ឌ..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                <Phone className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                {language === 'km' ? 'លេខទូរស័ព្ទទាក់ទង' : 'Phone Number'}
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="012 345 678"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Opening Hours & Dishes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
                {language === 'km' ? 'ម៉ោងបើកដំណើរការ' : 'Opening Hours'}
              </label>
              <input
                type="text"
                value={openingHoursKh}
                onChange={(e) => setOpeningHoursKh(e.target.value)}
                placeholder="០៧:០០ ព្រឹក - ០៩:០០ យប់"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                {language === 'km' ? 'មុខម្ហូបប្រចាំហាង (ញែកដោយក្បៀស)' : 'Signature Dishes (comma-separated)'}
              </label>
              <input
                type="text"
                value={dishesInput}
                onChange={(e) => setDishesInput(e.target.value)}
                placeholder="អាម៉ុកត្រី, ឡុកឡាក់, ម្ជូរគ្រឿង"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
              {language === 'km' ? 'ការពិពណ៌នាអំពីហាង' : 'Restaurant Description'}
            </label>
            <textarea
              rows={2}
              value={descriptionKh}
              onChange={(e) => setDescriptionKh(e.target.value)}
              placeholder="រៀបរាប់ពីរសជាតិអាហារ បរិយាកាស និងសេវាកម្ម..."
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Photo URL & Presets */}
          <div>
            <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
              <Image className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
              {language === 'km' ? 'រូបភាពតំណាងហាង (Photo URL)' : 'Restaurant Photo URL'}
            </label>
            <input
              type="url"
              required
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500 mb-2"
            />

            {/* Quick selector */}
            <p className="text-[10px] text-stone-400 mb-1">
              {language === 'km' ? 'ឬចុចជ្រើសរើសរូបភាពគំរូខាងក្រោម៖' : 'Or select a sample photo:'}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {samplePhotos.map((url, i) => (
                <div
                  key={i}
                  onClick={() => setPhotoUrl(url)}
                  className={`aspect-16/10 rounded-lg overflow-hidden cursor-pointer border-2 transition ${
                    photoUrl === url ? 'border-amber-500 ring-2 ring-amber-300' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="sample" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>
                {language === 'km' ? 'បញ្ជូនព័ត៌មានចុះបញ្ជីហាង' : 'Submit Restaurant Registration'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

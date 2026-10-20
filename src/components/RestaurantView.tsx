import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RestaurantCard } from './RestaurantCard';
import { Store, Plus, MapPin, Sparkles, PhoneCall } from 'lucide-react';

export const RestaurantView: React.FC = () => {
  const { 
    restaurants, language, searchQuery, setSearchQuery, 
    selectedProvince, setSelectedProvince, setIsAddRestaurantModalOpen,
    currentUser, setIsAuthModalOpen 
  } = useApp();

  const [priceFilter, setPriceFilter] = useState<string>('all');

  const provinces = [
    { id: '', nameKh: 'គ្រប់ទីតាំង', nameEn: 'All Locations' },
    { id: 'រាជធានីភ្នំពេញ', nameKh: 'ភ្នំពេញ', nameEn: 'Phnom Penh' },
    { id: 'ខេត្តសៀមរាប', nameKh: 'សៀមរាប', nameEn: 'Siem Reap' },
    { id: 'ខេត្តកែប/កំពត', nameKh: 'កំពត / កែប', nameEn: 'Kampot / Kep' },
    { id: 'ខេត្តបាត់ដំបង', nameKh: 'បាត់ដំបង', nameEn: 'Battambang' },
  ];

  const filteredRestaurants = restaurants.filter((r) => {
    // only show approved restaurants unless owner or admin
    if (r.status !== 'approved' && currentUser?.role !== 'admin' && currentUser?.id !== r.ownerId) {
      return false;
    }
    // province filter
    if (selectedProvince && !r.provinceKh.includes(selectedProvince)) {
      return false;
    }
    // price filter
    if (priceFilter !== 'all' && r.priceLevel !== priceFilter) {
      return false;
    }
    // search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.nameKh.toLowerCase().includes(q) || r.nameEn.toLowerCase().includes(q);
      const matchAddress = r.addressKh.toLowerCase().includes(q) || r.addressEn.toLowerCase().includes(q);
      const matchDish = r.signatureDishesKh.some(d => d.toLowerCase().includes(q));
      if (!matchName && !matchAddress && !matchDish) return false;
    }
    return true;
  });

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-24">
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-moul text-sm sm:text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-600" />
            <span>{language === 'km' ? 'បញ្ជីភោជនីយដ្ឋាន & ហាងអាហារ' : 'Restaurant Directory'}</span>
          </h2>
          <p className="text-[11px] text-stone-500">
            {language === 'km' 
              ? `មានភោជនីយដ្ឋានឆ្ងាញ់ៗចំនួន ${filteredRestaurants.length} ហាង` 
              : `Found ${filteredRestaurants.length} restaurants`}
          </p>
        </div>

        <button
          onClick={() => {
            if (!currentUser) setIsAuthModalOpen(true);
            else setIsAddRestaurantModalOpen(true);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{language === 'km' ? 'ចុះបញ្ជីហាង' : 'Add Shop'}</span>
        </button>
      </div>

      {/* Banner for Restaurant Owners */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white shadow-xs flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="font-bold text-xs text-amber-200">
            {language === 'km' ? 'តើលោកអ្នកជាម្ចាស់ហាងអាហារមែនទេ?' : 'Are you a restaurant owner?'}
          </p>
          <p className="text-[10px] text-amber-100/80">
            {language === 'km' ? 'ចុះបញ្ជីហាងរបស់អ្នកដើម្បីទទួលបានអតិថិជនកាន់តែច្រើន!' : 'List your shop and attract foodies across Cambodia!'}
          </p>
        </div>
        <button
          onClick={() => {
            if (!currentUser) setIsAuthModalOpen(true);
            else setIsAddRestaurantModalOpen(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold shrink-0 shadow transition active:scale-95"
        >
          {language === 'km' ? 'ចុះឈ្មោះហាង' : 'Register'}
        </button>
      </div>

      {/* Location Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {provinces.map((p) => {
          const active = selectedProvince === p.id || (!selectedProvince && p.id === '');
          return (
            <button
              key={p.id || 'all'}
              onClick={() => setSelectedProvince(p.id)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition font-medium ${
                active
                  ? 'bg-amber-600 text-white font-bold shadow-2xs'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
              }`}
            >
              {language === 'km' ? p.nameKh : p.nameEn}
            </button>
          );
        })}
      </div>

      {/* Restaurant List */}
      {filteredRestaurants.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 space-y-2">
          <Store className="w-8 h-8 mx-auto text-stone-300" />
          <p className="text-xs text-stone-500 font-medium">
            {language === 'km' ? 'មិនមានហាងអាហារដែលត្រូវនឹងការស្វែងរកទេ' : 'No restaurants found'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </div>
  );
};

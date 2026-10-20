import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RestaurantCard } from './RestaurantCard';
import { Store, Plus, MapPin, Sparkles, PhoneCall, CheckCircle2, AlertCircle } from 'lucide-react';

export const RestaurantView: React.FC = () => {
  const { 
    restaurants, language, searchQuery, setSearchQuery, 
    selectedProvince, setSelectedProvince, setIsAddRestaurantModalOpen,
    currentUser, setIsAuthModalOpen 
  } = useApp();

  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');

  const isKm = language === 'km';

  const provinces = [
    { id: '', nameKh: 'គ្រប់ទីតាំង', nameEn: 'All Locations' },
    { id: 'ភ្នំពេញ', nameKh: 'ភ្នំពេញ', nameEn: 'Phnom Penh' },
    { id: 'សៀមរាប', nameKh: 'សៀមរាប', nameEn: 'Siem Reap' },
    { id: 'កំពត', nameKh: 'កំពត', nameEn: 'Kampot' },
    { id: 'កែប', nameKh: 'កែប', nameEn: 'Kep' },
    { id: 'បាត់ដំបង', nameKh: 'បាត់ដំបង', nameEn: 'Battambang' },
    { id: 'ព្រះសីហនុ', nameKh: 'ព្រះសីហនុ', nameEn: 'Sihanoukville' },
    { id: 'កំពង់ចាម', nameKh: 'កំពង់ចាម', nameEn: 'Kampong Cham' },
    { id: 'មណ្ឌលគិរី', nameKh: 'មណ្ឌលគិរី', nameEn: 'Mondulkiri' },
    { id: 'កោះកុង', nameKh: 'កោះកុង', nameEn: 'Koh Kong' },
    { id: 'តាកែវ', nameKh: 'តាកែវ', nameEn: 'Takeo' },
    { id: 'ពោធិ៍សាត់', nameKh: 'ពោធិ៍សាត់', nameEn: 'Pursat' },
  ];

  const filteredRestaurants = restaurants.filter((r) => {
    // only show approved restaurants unless owner or admin
    if (r.status !== 'approved' && currentUser?.role !== 'admin' && currentUser?.id !== r.ownerId) {
      return false;
    }
    // verification filter
    if (verifiedFilter === 'verified' && !r.isVerified) return false;
    if (verifiedFilter === 'unverified' && r.isVerified) return false;

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

  const verifiedCount = restaurants.filter(r => r.isVerified).length;
  const sampleCount = restaurants.filter(r => !r.isVerified).length;

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-24">
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-moul text-sm sm:text-base text-[#183326] dark:text-stone-100 flex items-center gap-2">
            <Store className="w-4 h-4 text-[#14532D]" />
            <span>{isKm ? 'បញ្ជីភោជនីយដ្ឋាន & ហាងអាហារ' : 'Restaurant Directory'}</span>
          </h2>
          <p className="text-[11px] text-stone-500 font-khmer">
            {isKm 
              ? `បង្ហាញ ${filteredRestaurants.length} / ${restaurants.length} ហាង (${verifiedCount} ផ្ទៀងផ្ទាត់ផ្លូវការ)` 
              : `Showing ${filteredRestaurants.length} of ${restaurants.length} (${verifiedCount} verified)`}
          </p>
        </div>

        <button
          onClick={() => {
            if (!currentUser) setIsAuthModalOpen(true);
            else setIsAddRestaurantModalOpen(true);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#14532D] hover:bg-[#0B3D2E] text-white font-bold text-xs shadow-xs font-khmer transition"
        >
          <Plus className="w-3.5 h-3.5 text-[#A7DCA5]" />
          <span>{isKm ? 'ចុះបញ្ជីហាង' : 'Add Shop'}</span>
        </button>
      </div>

      {/* Verification Filter Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-[#EAF6EC] dark:bg-stone-800 rounded-2xl text-xs font-khmer border border-[#A7DCA5]/50">
        <button
          onClick={() => setVerifiedFilter('all')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-center font-bold transition-all ${
            verifiedFilter === 'all'
              ? 'bg-[#14532D] text-white shadow-xs'
              : 'text-[#183326]/70 dark:text-stone-300 hover:text-[#14532D]'
          }`}
        >
          {isKm ? `ទាំងអស់ (${restaurants.length})` : `All (${restaurants.length})`}
        </button>
        <button
          onClick={() => setVerifiedFilter('verified')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-center font-bold flex items-center justify-center gap-1 transition-all ${
            verifiedFilter === 'verified'
              ? 'bg-[#228B4E] text-white shadow-xs'
              : 'text-[#228B4E] dark:text-emerald-400 hover:bg-[#A7DCA5]/30'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{isKm ? `ផ្ទៀងផ្ទាត់ (${verifiedCount})` : `Verified (${verifiedCount})`}</span>
        </button>
        <button
          onClick={() => setVerifiedFilter('unverified')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-center font-bold flex items-center justify-center gap-1 transition-all ${
            verifiedFilter === 'unverified'
              ? 'bg-[#34A853] text-white shadow-xs'
              : 'text-[#14532D] dark:text-stone-300 hover:bg-[#A7DCA5]/30'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{isKm ? `គំរូ (${sampleCount})` : `Sample (${sampleCount})`}</span>
        </button>
      </div>

      {/* Banner for Restaurant Owners */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0B3D2E] via-[#14532D] to-[#0B3D2E] text-white shadow-xs flex items-center justify-between border border-[#228B4E]/40">
        <div className="space-y-0.5">
          <p className="font-bold text-xs text-white font-khmer">
            {isKm ? '🎁 ចុះបញ្ជីហាងឥតគិតថ្លៃ ($0) ឬ Premium $4.99/ឆ្នាំ' : '🎁 Free Shop Listing ($0) or Premium $4.99/Year'}
          </p>
          <p className="text-[10px] text-[#A7DCA5] font-khmer">
            {isKm ? 'ចុះឈ្មោះហាងរបស់អ្នក និងថែមមុខម្ហូបក្នុងហាងបានរហូតដល់ ៥ មុខ!' : 'List your restaurant and add up to 5 food menu items!'}
          </p>
        </div>
        <button
          onClick={() => {
            if (!currentUser) setIsAuthModalOpen(true);
            else setIsAddRestaurantModalOpen(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-[#34A853] hover:bg-[#228B4E] text-white text-xs font-bold shrink-0 shadow transition active:scale-95 font-khmer"
        >
          {isKm ? 'ចុះបញ្ជីហាង' : 'Register Shop'}
        </button>
      </div>

      {/* Location Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 font-khmer">
        {provinces.map((p) => {
          const active = selectedProvince === p.id || (!selectedProvince && p.id === '');
          return (
            <button
              key={p.id || 'all'}
              onClick={() => setSelectedProvince(p.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                active
                  ? 'bg-[#14532D] text-white font-bold shadow-xs border border-[#34A853]'
                  : 'bg-white dark:bg-stone-800 text-[#183326] dark:text-stone-300 border border-[#A7DCA5]/60 hover:bg-[#EAF6EC]'
              }`}
            >
              {isKm ? p.nameKh : p.nameEn}
            </button>
          );
        })}
      </div>

      {/* Restaurant Cards List */}
      <div className="space-y-3">
        {filteredRestaurants.length > 0 ? (
          filteredRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))
        ) : (
          <div className="py-12 text-center text-stone-400 space-y-2 font-khmer">
            <Store className="w-10 h-10 mx-auto text-stone-300" />
            <p className="text-xs">
              {isKm ? 'រកមិនឃើញហាងអាហារត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ' : 'No restaurants matched your filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

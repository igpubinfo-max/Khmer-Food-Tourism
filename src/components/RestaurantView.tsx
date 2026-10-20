import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RestaurantCard } from './RestaurantCard';
import { isRestaurantPremiumActive } from '../types';
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

  // Benefit 1: Featured restaurant listing (VIP restaurants placed first)
  const sortedRestaurants = [...filteredRestaurants].sort((a, b) => {
    const aVip = isRestaurantPremiumActive(a) ? 1 : 0;
    const bVip = isRestaurantPremiumActive(b) ? 1 : 0;
    return bVip - aVip;
  });

  const verifiedCount = restaurants.filter(r => r.isVerified).length;
  const sampleCount = restaurants.filter(r => !r.isVerified).length;

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-24">
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-moul text-sm sm:text-base text-[#0F172A] dark:text-white flex items-center gap-2">
            <Store className="w-4 h-4 text-[#064E3B] dark:text-emerald-400" />
            <span>{isKm ? 'បញ្ជីភោជនីយដ្ឋាន & ហាងអាហារ' : 'Restaurant Directory'}</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-khmer">
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
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-xs font-khmer transition"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-200" />
          <span>{isKm ? 'ចុះបញ្ជីហាង' : 'Add Shop'}</span>
        </button>
      </div>

      {/* Verification Filter Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-khmer border border-slate-200/90 dark:border-slate-700">
        <button
          onClick={() => setVerifiedFilter('all')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-center font-bold transition-all ${
            verifiedFilter === 'all'
              ? 'bg-[#064E3B] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#064E3B]'
          }`}
        >
          {isKm ? `ទាំងអស់ (${restaurants.length})` : `All (${restaurants.length})`}
        </button>
        <button
          onClick={() => setVerifiedFilter('verified')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-center font-bold flex items-center justify-center gap-1 transition-all ${
            verifiedFilter === 'verified'
              ? 'bg-[#059669] text-white shadow-xs'
              : 'text-[#059669] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{isKm ? `ផ្ទៀងផ្ទាត់ (${verifiedCount})` : `Verified (${verifiedCount})`}</span>
        </button>
        <button
          onClick={() => setVerifiedFilter('unverified')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-center font-bold flex items-center justify-center gap-1 transition-all ${
            verifiedFilter === 'unverified'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{isKm ? `គំរូ (${sampleCount})` : `Sample (${sampleCount})`}</span>
        </button>
      </div>

      {/* Banner for Restaurant Owners */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#064E3B] via-[#065F46] to-[#047857] text-white shadow-xs flex items-center justify-between border border-emerald-600/30">
        <div className="space-y-0.5">
          <p className="font-bold text-xs text-white font-khmer">
            {isKm ? '🎁 ចុះបញ្ជីហាងឥតគិតថ្លៃ ($0) ឬ VIP $9.99/ឆ្នាំ' : '🎁 Free Shop Listing ($0) or VIP $9.99/Year'}
          </p>
          <p className="text-[10px] text-emerald-200 font-khmer">
            {isKm ? 'តម្លៃពិសេសត្រឹមដំណាច់ឆ្នាំនេះ ទទួលបានអត្ថប្រយោជន៍ VIP ទាំង ១០ យ៉ាង!' : 'End of year promo: get all 10 VIP membership benefits!'}
          </p>
        </div>
        <button
          onClick={() => {
            if (!currentUser) setIsAuthModalOpen(true);
            else setIsAddRestaurantModalOpen(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold shrink-0 shadow transition active:scale-95 font-khmer"
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
                  ? 'bg-[#064E3B] text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {isKm ? p.nameKh : p.nameEn}
            </button>
          );
        })}
      </div>

      {/* Restaurant Cards List */}
      <div className="space-y-3">
        {sortedRestaurants.length > 0 ? (
          sortedRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-2 font-khmer">
            <Store className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs">
              {isKm ? 'រកមិនឃើញហាងអាហារត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ' : 'No restaurants matched your filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

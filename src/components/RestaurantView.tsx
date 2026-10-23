import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { RestaurantCard } from './RestaurantCard';
import { isRestaurantPremiumActive, Restaurant, sortRestaurantsChronologically } from '../types';
import { Store, Plus, MapPin, Sparkles, PhoneCall, CheckCircle2, AlertCircle, Camera, Globe, Loader2, Edit2 } from 'lucide-react';
import {
  searchCambodiaPlacesWithSmartCache,
  convertGooglePlaceToRestaurant,
  GooglePlaceCachedItem,
} from '../services/googlePlacesService';

export const RestaurantView: React.FC = () => {
  const { 
    restaurants, language, searchQuery, setSearchQuery, 
    selectedProvince, setSelectedProvince, setIsAddRestaurantModalOpen,
    setIsVipAddRestaurantModalOpen,
    currentUser, setIsAuthModalOpen, setIsAiCheckInModalOpen,
    addRestaurant, showToast,
    setManagingRestaurant, setIsManageMenuModalOpen
  } = useApp();

  const myExistingRest = currentUser ? restaurants.find((r) => r.ownerId === currentUser.id) : undefined;
  const isUserAtOneStoreLimit = Boolean(currentUser && currentUser.role !== 'admin' && myExistingRest);

  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [smartCachePlaces, setSmartCachePlaces] = useState<GooglePlaceCachedItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [cacheSourceLabel, setCacheSourceLabel] = useState<string>('');

  const isKm = language === 'km';

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSmartCachePlaces([]);
      setIsSearchingOnline(false);
      return;
    }

    let cancelled = false;
    setIsSearchingOnline(true);
    const timer = setTimeout(async () => {
      const res = await searchCambodiaPlacesWithSmartCache(
        q,
        selectedProvince || 'ទាំងអស់',
        'restaurant'
      );
      if (!cancelled) {
        setSmartCachePlaces(res.results);
        setCacheSourceLabel(
          res.fromSmartCache
            ? 'Smart Cache ($0 កូតា Google)'
            : res.providerUsed === 'google_maps_api'
            ? 'Google Maps Places API + រក្សាទុកចូល Smart Cache'
            : 'ផែនទីអនឡាញកម្ពុជា + រក្សាទុកចូល Smart Cache'
        );
        setIsSearchingOnline(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedProvince]);

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

  // Chronological order: restaurants added earlier appear first, newly added restaurants appear afterward
  const sortedRestaurants = sortRestaurantsChronologically(filteredRestaurants);

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

        <div className="flex items-center gap-1.5">
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setIsAiCheckInModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-bold text-xs shadow-xs font-khmer transition active:scale-95"
              title={isKm ? 'ឆែកអ៊ីន & បន្ថែមហាងដោយ AI (Administrator Only)' : 'AI Food Check-in (Admin Only)'}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-200" />
              <span>{isKm ? 'ឆែកអ៊ីន AI' : 'AI Check-in'}</span>
            </button>
          )}

          <button
            onClick={() => {
              if (!currentUser) {
                setIsAuthModalOpen(true);
              } else if (isUserAtOneStoreLimit && myExistingRest) {
                setManagingRestaurant(myExistingRest);
                setIsManageMenuModalOpen(true);
              } else {
                setIsVipAddRestaurantModalOpen(true);
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-xs font-khmer transition cursor-pointer"
          >
            {isUserAtOneStoreLimit ? (
              <>
                <Edit2 className="w-3.5 h-3.5 text-slate-950" />
                <span>{isKm ? 'គ្រប់គ្រងហាងខ្ញុំ' : 'My Store'}</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-slate-950" />
                <span>{isKm ? 'បន្ថែមហាង VIP' : 'Add Store'}</span>
              </>
            )}
          </button>
        </div>
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

      {/* Banner for VIP Restaurant Owners */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-600/90 via-amber-700 to-[#064E3B] text-white shadow-xs flex items-center justify-between border border-amber-400/40 font-khmer">
        <div className="space-y-0.5">
          <p className="font-bold text-xs text-white flex items-center gap-1.5">
            <span>👑</span>
            <span>{isKm ? 'ហាងសមាជិក VIP (VIP Restaurant Listings)' : 'VIP Restaurant Listings'}</span>
          </p>
          <p className="text-[10px] text-amber-100">
            {isKm ? 'បន្ថែម និងកែប្រែទម្រង់ហាងផ្ទាល់ខ្លួន ទទួលបានអត្ថប្រយោជន៍ VIP ទាំង ១០ យ៉ាង!' : 'Add & manage your store with all 10 VIP benefits!'}
          </p>
        </div>
        <button
          onClick={() => {
            if (!currentUser) {
              setIsAuthModalOpen(true);
            } else if (isUserAtOneStoreLimit && myExistingRest) {
              setManagingRestaurant(myExistingRest);
              setIsManageMenuModalOpen(true);
            } else {
              setIsVipAddRestaurantModalOpen(true);
            }
          }}
          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shrink-0 shadow transition active:scale-95 cursor-pointer"
        >
          {isUserAtOneStoreLimit
            ? (isKm ? '✏️ គ្រប់គ្រងហាងខ្ញុំ' : '✏️ My Store')
            : (isKm ? '+ បន្ថែមហាង' : '+ Add Store')}
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
        ) : !isSearchingOnline && smartCachePlaces.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2 font-khmer">
            <Store className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs">
              {isKm ? 'រកមិនឃើញហាងអាហារត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ' : 'No restaurants matched your filters'}
            </p>
          </div>
        ) : null}

        {/* Google Maps Places API + Smart Cache Live Results */}
        {searchQuery.trim().length >= 2 && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3 font-khmer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {isKm
                    ? 'លទ្ធផលស្វែងរកបន្ថែមពី Google Maps & Smart Cache'
                    : 'Google Maps & Smart Cache Results'}
                </span>
              </div>
              {cacheSourceLabel && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold">
                  ⚡ {cacheSourceLabel}
                </span>
              )}
            </div>

            {isSearchingOnline ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>កំពុងស្វែងរកហាងពិតៗនៅភ្នំពេញ និងទូទាំងប្រទេស...</span>
              </div>
            ) : smartCachePlaces.length > 0 ? (
              <div className="space-y-3">
                {smartCachePlaces.map((place) => {
                  const mappedRest = convertGooglePlaceToRestaurant(place);
                  const alreadyInApp = restaurants.some(
                    (r) =>
                      r.id === mappedRest.id ||
                      r.nameKh.toLowerCase() === mappedRest.nameKh.toLowerCase()
                  );
                  return (
                    <div key={place.placeId} className="space-y-1.5">
                      <RestaurantCard restaurant={mappedRest} />
                      {!alreadyInApp && currentUser?.role === 'admin' && (
                        <button
                          onClick={() => {
                            addRestaurant({
                              nameKh: mappedRest.nameKh,
                              nameEn: mappedRest.nameEn,
                              descriptionKh: mappedRest.descriptionKh,
                              descriptionEn: mappedRest.descriptionEn,
                              photoUrl: mappedRest.photoUrl,
                              addressKh: mappedRest.addressKh,
                              addressEn: mappedRest.addressEn,
                              provinceKh: mappedRest.provinceKh,
                              provinceEn: mappedRest.provinceEn,
                              phone: mappedRest.phone,
                              openingHoursKh: mappedRest.openingHoursKh,
                              openingHoursEn: mappedRest.openingHoursEn,
                              priceLevel: mappedRest.priceLevel,
                              mapUrl: mappedRest.mapUrl,
                              latitude: mappedRest.latitude,
                              longitude: mappedRest.longitude,
                              signatureDishesKh: mappedRest.signatureDishesKh,
                              isVerified: true,
                              status: 'approved',
                            });
                            showToast(
                              `បានរក្សាទុកហាង "${mappedRest.nameKh}" ចូលក្នុងបញ្ជីកម្មវិធី និង Smart Cache!`,
                              'success'
                            );
                          }}
                          className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>រក្សាទុកហាងនេះទុកក្នុងបញ្ជីកម្មវិធីអចិន្ត្រៃយ៍ (Save to Directory)</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

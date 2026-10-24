import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RestaurantCard } from './RestaurantCard';
import { isRestaurantPremiumActive, Restaurant, sortRestaurantsChronologically, getVipAccountState } from '../types';
import { Store, Plus, MapPin, Sparkles, PhoneCall, CheckCircle2, AlertCircle, Camera, Globe, Loader2, Edit2 } from 'lucide-react';
import {
  searchCambodiaPlacesWithSmartCache,
  convertGooglePlaceToRestaurant,
  findDuplicateRestaurantForGooglePlace,
  GooglePlaceCachedItem,
} from '../services/googlePlacesService';

const RESTAURANT_BATCH_SIZE = 20;

export const RestaurantView: React.FC = () => {
  const { 
    restaurants, language, searchQuery, setSearchQuery, 
    selectedProvince, setSelectedProvince, setIsAddRestaurantModalOpen,
    setIsVipAddRestaurantModalOpen,
    currentUser, setIsAuthModalOpen, setIsAiCheckInModalOpen,
    addRestaurant, deleteRestaurant, showToast,
    setManagingRestaurant, setIsManageMenuModalOpen,
    activeManagedShopId, setActiveManagedShopId,
    getOwnedRestaurantsForUser, openManageMyVipStore,
    openUpgradeVipModal,
    openGoogleMapsSearchModal,
    importGooglePlaceToApp
  } = useApp();

  const myOwnedRestaurants = useMemo(
    () => getOwnedRestaurantsForUser(currentUser),
    [restaurants, currentUser, activeManagedShopId]
  );
  const myExistingRest = useMemo(
    () =>
      (activeManagedShopId && myOwnedRestaurants.find((r) => r.id === activeManagedShopId)) ||
      myOwnedRestaurants[0],
    [myOwnedRestaurants, activeManagedShopId]
  );
  const isUserAtOneStoreLimit = Boolean(currentUser && myExistingRest);

  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [visibleCount, setVisibleCount] = useState<number>(RESTAURANT_BATCH_SIZE);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const [smartCachePlaces, setSmartCachePlaces] = useState<GooglePlaceCachedItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [cacheSourceLabel, setCacheSourceLabel] = useState<string>('');

  const isKm = language === 'km';

  useEffect(() => {
    setVisibleCount(RESTAURANT_BATCH_SIZE);
  }, [selectedProvince, priceFilter, verifiedFilter, searchQuery]);

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

  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (r.status !== 'approved' && currentUser?.role !== 'admin' && currentUser?.id !== r.ownerId) {
        return false;
      }
      if (verifiedFilter === 'verified' && !r.isVerified) return false;
      if (verifiedFilter === 'unverified' && r.isVerified) return false;
      if (selectedProvince && !r.provinceKh.includes(selectedProvince)) {
        return false;
      }
      if (priceFilter !== 'all' && r.priceLevel !== priceFilter) {
        return false;
      }
      if (q) {
        const matchName = r.nameKh.toLowerCase().includes(q) || r.nameEn.toLowerCase().includes(q);
        const matchAddress = r.addressKh.toLowerCase().includes(q) || r.addressEn.toLowerCase().includes(q);
        const matchDish = r.signatureDishesKh.some(d => d.toLowerCase().includes(q));
        if (!matchName && !matchAddress && !matchDish) return false;
      }
      return true;
    });
  }, [restaurants, currentUser?.role, currentUser?.id, verifiedFilter, selectedProvince, priceFilter, searchQuery]);

  // Chronological order: restaurants added earlier appear first, newly added restaurants appear afterward
  const sortedRestaurants = useMemo(
    () => sortRestaurantsChronologically(filteredRestaurants),
    [filteredRestaurants]
  );

  const displayedRestaurants = useMemo(
    () => sortedRestaurants.slice(0, visibleCount),
    [sortedRestaurants, visibleCount]
  );

  useEffect(() => {
    const node = loadMoreTriggerRef.current;
    if (!node || visibleCount >= sortedRestaurants.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(sortedRestaurants.length, prev + RESTAURANT_BATCH_SIZE));
        }
      },
      { rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, sortedRestaurants.length]);

  const { verifiedCount, sampleCount } = useMemo(() => {
    let v = 0;
    for (const r of restaurants) {
      if (r.isVerified) v++;
    }
    return { verifiedCount: v, sampleCount: restaurants.length - v };
  }, [restaurants]);

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
          <button
            type="button"
            onClick={() => openGoogleMapsSearchModal('restaurant')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-bold text-xs shadow-xs font-khmer transition active:scale-95 cursor-pointer"
            title={isKm ? 'ស្វែងរកហាងលើផែនទី Google Maps' : 'Search Shops on Google Maps'}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-200" />
            <span>{isKm ? 'Google Maps' : 'Google Maps'}</span>
          </button>

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
                return;
              }
              const state = getVipAccountState(currentUser);
              if (state === 'pending_vip') {
                showToast(isKm ? '⏳ គណនី VIP របស់អ្នកកំពុងរង់ចាំការពិនិត្យ និងអនុម័តពី Administrator។' : '⏳ VIP pending Admin approval.', 'info');
                return;
              }
              if (state === 'expired_vip') {
                showToast(isKm ? '⚠️ សមាជិកភាព VIP របស់អ្នកបានផុតកំណត់ហើយ! សូមបន្តសមាជិកភាព VIP។' : '⚠️ VIP expired. Please renew.', 'warning');
                openUpgradeVipModal(true);
                return;
              }
              if (state === 'regular_unpaid') {
                showToast(isKm ? '🔒 សម្រាប់តែសមាជិក VIP ដែលបានអនុម័តប៉ុណ្ណោះ! សូមដំឡើងទៅកញ្ចប់ VIP។' : '🔒 VIP required!', 'warning');
                openUpgradeVipModal();
                return;
              }
              if (myExistingRest) {
                openManageMyVipStore(myExistingRest.id);
              } else {
                setIsVipAddRestaurantModalOpen(true);
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-xs font-khmer transition cursor-pointer"
          >
            {myExistingRest ? (
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
      <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-[#064E3B] text-white shadow-lg border-2 border-amber-300/70 space-y-3 font-khmer">
        <div className="flex items-start justify-between gap-2.5">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-base">👑</span>
              <span className="font-black text-xs sm:text-sm text-white">
                {myExistingRest
                  ? (isKm ? `ហាង VIP របស់ខ្ញុំ៖ ${myExistingRest.nameKh}` : `My VIP Store: ${myExistingRest.nameEn || myExistingRest.nameKh}`)
                  : (isKm ? 'ចុះបញ្ជីហាង VIP របស់អ្នក (1 ហាង)' : 'Register Your VIP Restaurant (1 Store)')}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 text-[9px] font-black">
                {myExistingRest ? `${myExistingRest.menuItems?.length || 0}/20 មុខម្ហូប` : 'VIP 1 ហាង'}
              </span>
            </div>
            <p className="text-[11px] text-amber-50 leading-relaxed font-medium">
              {myExistingRest
                ? (isKm
                    ? `📍 ${myExistingRest.addressKh} • ចុចប៊ូតុងខាងក្រោមដើម្បីបន្ថែមមុខម្ហូប កែតម្លៃ រូបភាព និងព័ត៌មានហាង "${myExistingRest.nameKh}"។`
                    : `📍 ${myExistingRest.addressEn || myExistingRest.addressKh} • Tap below to manage menus, prices, photos & info.`)
                : (isKm
                    ? 'ចុះបញ្ជីហាងមុន ហាងរបស់លោកអ្នកនឹងបង្ហាញមុនគេតាមលំដាប់លេខរៀង ដើម្បីងាយស្រួលឱ្យអតិថិជនស្វែងរក និងតាមដានស្ថិតិហាង។'
                    : 'Register your restaurant early so it appears first in chronological order, making it easy for customers to find and track store analytics.')}
            </p>
          </div>
        </div>

        {/* Multi-Shop Selector Pill Bar (when user/Admin has multiple VIP shops) */}
        {myOwnedRestaurants.length > 1 && (
          <div className="p-2.5 rounded-2xl bg-black/25 border border-white/20 space-y-1.5">
            <div className="text-[10px] font-bold text-amber-200 flex items-center justify-between">
              <span>{isKm ? `🏪 ជ្រើសរើសហាងដែលអ្នកចង់គ្រប់គ្រង (${myOwnedRestaurants.length} ហាង)៖` : `🏪 Select shop to manage (${myOwnedRestaurants.length}):`}</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {myOwnedRestaurants.map((shop) => {
                const isSelected = myExistingRest?.id === shop.id;
                return (
                  <button
                    key={shop.id}
                    type="button"
                    onClick={() => {
                      setActiveManagedShopId(shop.id);
                      openManageMyVipStore(shop.id);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-300 text-slate-950 shadow-sm ring-2 ring-white'
                        : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    <img src={shop.photoUrl} alt={shop.nameKh} className="w-4 h-4 rounded-full object-cover shrink-0" />
                    <span className="truncate max-w-[130px]">{isKm ? shop.nameKh : (shop.nameEn || shop.nameKh)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative p-1 rounded-2xl group">
          {/* Softly blinking glowing lights around border */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-70 blur-xs vip-glow-btn pointer-events-none" />
          <div className="absolute top-1 left-2 w-2 h-2 rounded-full bg-yellow-200 shadow-sm shadow-amber-300 vip-sparkle-dot pointer-events-none" />
          <div className="absolute top-1 right-2 w-2 h-2 rounded-full bg-yellow-200 shadow-sm shadow-amber-300 vip-sparkle-dot pointer-events-none" style={{ animationDelay: '0.9s' }} />
          <div className="absolute bottom-1 left-4 w-1.5 h-1.5 rounded-full bg-amber-200 shadow-sm shadow-amber-300 vip-sparkle-dot pointer-events-none" style={{ animationDelay: '0.4s' }} />
          <div className="absolute bottom-1 right-4 w-1.5 h-1.5 rounded-full bg-amber-200 shadow-sm shadow-amber-300 vip-sparkle-dot pointer-events-none" style={{ animationDelay: '1.3s' }} />

          <div className="relative flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                if (!currentUser) {
                  setIsAuthModalOpen(true);
                  return;
                }
                const state = getVipAccountState(currentUser);
                if (state === 'pending_vip') {
                  showToast(isKm ? '⏳ ការស្នើសុំសមាជិកភាព VIP របស់អ្នកកំពុងរង់ចាំការពិនិត្យ និងអនុម័តពី Administrator។' : '⏳ VIP request pending Admin approval.', 'info');
                  return;
                }
                if (state === 'expired_vip') {
                  showToast(isKm ? '⚠️ សមាជិកភាព VIP របស់អ្នកបានផុតកំណត់ហើយ! សូមបន្តសមាជិកភាព VIP ដើម្បីចុះបញ្ជីហាង។' : '⚠️ VIP membership expired. Please renew.', 'warning');
                  openUpgradeVipModal(true);
                  return;
                }
                if (state === 'regular_unpaid') {
                  showToast(isKm ? '🔒 ការចុះបញ្ជីហាងគឺសម្រាប់តែសមាជិក VIP ដែលបានអនុម័តប៉ុណ្ណោះ! សូមដំឡើងទៅកញ្ចប់ VIP។' : '🔒 VIP required!', 'warning');
                  openUpgradeVipModal();
                  return;
                }
                if (myExistingRest) {
                  openManageMyVipStore(myExistingRest.id);
                } else {
                  setIsVipAddRestaurantModalOpen(true);
                }
              }}
              className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-500 text-slate-950 text-xs sm:text-sm font-black border-2 border-white/90 vip-glow-btn flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-lg"
            >
              <span className="text-base">👑</span>
              <span className="truncate">
                {myExistingRest
                  ? (isKm ? `✏️ គ្រប់គ្រងហាង VIP របស់ខ្ញុំ (${myExistingRest.nameKh})` : `✏️ Manage My VIP Store (${myExistingRest.nameEn || myExistingRest.nameKh})`)
                  : (isKm ? '+ ចុះបញ្ជីហាង VIP របស់អ្នក (1 ហាង)' : '+ Register Your VIP Restaurant (1 Store)')}
              </span>
              <span className="text-xs">✨</span>
            </button>

            {currentUser?.role === 'admin' && myExistingRest && (
              <button
                type="button"
                onClick={() => setIsVipAddRestaurantModalOpen(true)}
                className="py-3 px-3.5 rounded-xl bg-emerald-900/90 hover:bg-emerald-800 text-amber-200 border border-amber-300/60 text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{isKm ? 'បន្ថែមហាងថ្មី' : 'Add Store'}</span>
              </button>
            )}
          </div>
        </div>
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
        {displayedRestaurants.length > 0 ? (
          <>
            {displayedRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
            {visibleCount < sortedRestaurants.length && (
              <div ref={loadMoreTriggerRef} className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => Math.min(sortedRestaurants.length, prev + RESTAURANT_BATCH_SIZE))}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#064E3B] dark:text-emerald-400 shadow-2xs font-khmer"
                >
                  {isKm
                    ? `បង្ហាញហាងបន្ថែម (${displayedRestaurants.length} / ${sortedRestaurants.length})`
                    : `Show More Restaurants (${displayedRestaurants.length} / ${sortedRestaurants.length})`}
                </button>
              </div>
            )}
          </>
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
                  const existingRest = findDuplicateRestaurantForGooglePlace(place, restaurants);
                  const alreadyInApp = Boolean(existingRest);
                  return (
                    <div key={place.placeId} className="space-y-1.5">
                      <RestaurantCard restaurant={existingRest || mappedRest} />
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => importGooglePlaceToApp(place)}
                          className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            alreadyInApp
                              ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>
                            {alreadyInApp
                              ? '✓ មានក្នុងបញ្ជីរួចហើយ (ចុចដើម្បីធ្វើបច្ចុប្បន្នភាពទិន្នន័យ Google Maps)'
                              : '📥 នាំចូលហាងនេះចូលក្នុងបញ្ជីកម្មវិធីអចិន្ត្រៃយ៍ (Import from Google Maps)'}
                          </span>
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

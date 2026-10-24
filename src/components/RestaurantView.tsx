import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RestaurantCard } from './RestaurantCard';
import { isRestaurantPremiumActive, Restaurant, sortRestaurantsChronologically, getVipAccountState } from '../types';
import { Store, Plus, MapPin, Sparkles, PhoneCall, CheckCircle2, AlertCircle, Camera, Globe, Loader2, Edit2 } from 'lucide-react';
import {
  searchCambodiaPlacesWithSmartCache,
  convertGooglePlaceToRestaurant,
  findDuplicateRestaurantForGooglePlace,
  normalizeKhmerSearchText,
  GooglePlaceCachedItem,
} from '../services/googlePlacesService';
import { tr, translateProvince } from '../utils/i18n';

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
    const q = normalizeKhmerSearchText(searchQuery);
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
        const matchName =
          normalizeKhmerSearchText(r.nameKh).includes(q) ||
          normalizeKhmerSearchText(r.nameEn).includes(q);
        const matchAddress =
          normalizeKhmerSearchText(r.addressKh).includes(q) ||
          normalizeKhmerSearchText(r.addressEn).includes(q);
        const matchDish = r.signatureDishesKh.some((d) => normalizeKhmerSearchText(d).includes(q));
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
            <span>{tr(language, 'បញ្ជីភោជនីយដ្ឋាន & ហាងអាហារ', 'Restaurant Directory', '餐厅与美食店铺名录')}</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-khmer">
            {tr(
              language,
              `បង្ហាញ ${filteredRestaurants.length} / ${restaurants.length} ហាង (${verifiedCount} ផ្ទៀងផ្ទាត់ផ្លូវការ)`,
              `Showing ${filteredRestaurants.length} of ${restaurants.length} (${verifiedCount} verified)`,
              `显示 ${filteredRestaurants.length} / ${restaurants.length} 家店铺（${verifiedCount} 家官方认证）`
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openGoogleMapsSearchModal('restaurant')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-bold text-xs shadow-xs font-khmer transition active:scale-95 cursor-pointer"
            title={tr(language, 'ស្វែងរកហាងលើផែនទី Google Maps', 'Search Shops on Google Maps', '在 Google 地图上搜索餐厅')}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-200" />
            <span>{tr(language, 'ស្វែងរក Google Maps', 'Google Maps Search', '谷歌地图搜索')}</span>
          </button>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setIsAiCheckInModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-bold text-xs shadow-xs font-khmer transition active:scale-95"
              title={tr(language, 'ឆែកអ៊ីន & បន្ថែមហាងដោយ AI (Administrator Only)', 'AI Food Check-in (Admin Only)', 'AI 探店打卡（仅限管理员）')}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-200" />
              <span>{tr(language, 'ឆែកអ៊ីន AI', 'AI Check-in', 'AI 探店打卡')}</span>
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
                showToast(tr(language, '⏳ គណនី VIP របស់អ្នកកំពុងរង់ចាំការពិនិត្យ និងអនុម័តពី Administrator។', '⏳ VIP pending Admin approval.', '⏳ 您的 VIP 申请正在等待管理员审核。'), 'info');
                return;
              }
              if (state === 'expired_vip') {
                showToast(tr(language, '⚠️ សមាជិកភាព VIP របស់អ្នកបានផុតកំណត់ហើយ! សូមបន្តសមាជិកភាព VIP។', '⚠️ VIP expired. Please renew.', '⚠️ 您的 VIP 会员已到期，请续费。'), 'warning');
                openUpgradeVipModal(true);
                return;
              }
              if (state === 'regular_unpaid') {
                showToast(tr(language, '🔒 សម្រាប់តែសមាជិក VIP ដែលបានអនុម័តប៉ុណ្ណោះ! សូមដំឡើងទៅកញ្ចប់ VIP។', '🔒 VIP required!', '🔒 仅限已认证 VIP 会员！请先升级 VIP。'), 'warning');
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
                <span>{tr(language, 'គ្រប់គ្រងហាងខ្ញុំ', 'My Store', '管理我的店铺')}</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-slate-950" />
                <span>{tr(language, 'បន្ថែមហាង VIP', 'Add Store', '添加 VIP 店铺')}</span>
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
          {tr(language, `ទាំងអស់ (${restaurants.length})`, `All (${restaurants.length})`, `全部 (${restaurants.length})`)}
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
          <span>{tr(language, `ផ្ទៀងផ្ទាត់ (${verifiedCount})`, `Verified (${verifiedCount})`, `已认证 (${verifiedCount})`)}</span>
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
          <span>{tr(language, `គំរូ (${sampleCount})`, `Sample (${sampleCount})`, `示例 (${sampleCount})`)}</span>
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
                  ? tr(
                      language,
                      `ហាង VIP របស់ខ្ញុំ៖ ${myExistingRest.nameKh}`,
                      `My VIP Store: ${myExistingRest.nameEn || myExistingRest.nameKh}`,
                      `我的 VIP 店铺：${myExistingRest.nameEn || myExistingRest.nameKh}`
                    )
                  : tr(language, 'ចុះបញ្ជីហាង VIP របស់អ្នក (1 ហាង)', 'Register Your VIP Restaurant (1 Store)', '注册您的专属 VIP 餐厅（1 家店铺）')}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 text-[9px] font-black">
                {myExistingRest
                  ? tr(
                      language,
                      `${myExistingRest.menuItems?.length || 0}/20 មុខម្ហូប`,
                      `${myExistingRest.menuItems?.length || 0}/20 dishes`,
                      `${myExistingRest.menuItems?.length || 0}/20 道菜品`
                    )
                  : tr(language, 'VIP 1 ហាង', 'VIP 1 Store', 'VIP 1 家店铺')}
              </span>
            </div>
            <p className="text-[11px] text-amber-50 leading-relaxed font-medium">
              {myExistingRest
                ? tr(
                    language,
                    `📍 ${myExistingRest.addressKh} • ចុចប៊ូតុងខាងក្រោមដើម្បីបន្ថែមមុខម្ហូប កែតម្លៃ រូបភាព និងព័ត៌មានហាង "${myExistingRest.nameKh}"។`,
                    `📍 ${myExistingRest.addressEn || myExistingRest.addressKh} • Tap below to manage menus, prices, photos & info.`,
                    `📍 ${myExistingRest.addressEn || myExistingRest.addressKh} • 点击下方按钮管理菜单、价格、图片与店铺信息。`
                  )
                : tr(
                    language,
                    'ចុះបញ្ជីហាងមុន ហាងរបស់លោកអ្នកនឹងបង្ហាញមុនគេតាមលំដាប់លេខរៀង ដើម្បីងាយស្រួលឱ្យអតិថិជនស្វែងរក និងតាមដានស្ថិតិហាង។',
                    'Register your restaurant early so it appears first in chronological order, making it easy for customers to find and track store analytics.',
                    '越早注册您的 VIP 餐厅，越能优先展示在推荐列表中，方便国内外顾客搜索并查看实时店铺访问统计。'
                  )}
            </p>
          </div>
        </div>

        {/* Multi-Shop Selector Pill Bar (when user/Admin has multiple VIP shops) */}
        {myOwnedRestaurants.length > 1 && (
          <div className="p-2.5 rounded-2xl bg-black/25 border border-white/20 space-y-1.5">
            <div className="text-[10px] font-bold text-amber-200 flex items-center justify-between">
              <span>
                {tr(
                  language,
                  `🏪 ជ្រើសរើសហាងដែលអ្នកចង់គ្រប់គ្រង (${myOwnedRestaurants.length} ហាង)៖`,
                  `🏪 Select shop to manage (${myOwnedRestaurants.length}):`,
                  `🏪 选择要管理的店铺（共 ${myOwnedRestaurants.length} 家）：`
                )}
              </span>
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
                  showToast(tr(language, '⏳ ការស្នើសុំសមាជិកភាព VIP របស់អ្នកកំពុងរង់ចាំការពិនិត្យ និងអនុម័តពី Administrator។', '⏳ VIP request pending Admin approval.', '⏳ 您的 VIP 申请正在等待管理员审核。'), 'info');
                  return;
                }
                if (state === 'expired_vip') {
                  showToast(tr(language, '⚠️ សមាជិកភាព VIP របស់អ្នកបានផុតកំណត់ហើយ! សូមបន្តសមាជិកភាព VIP ដើម្បីចុះបញ្ជីហាង។', '⚠️ VIP membership expired. Please renew.', '⚠️ 您的 VIP 会员已到期，请续费。'), 'warning');
                  openUpgradeVipModal(true);
                  return;
                }
                if (state === 'regular_unpaid') {
                  showToast(tr(language, '🔒 ការចុះបញ្ជីហាងគឺសម្រាប់តែសមាជិក VIP ដែលបានអនុម័តប៉ុណ្ណោះ! សូមដំឡើងទៅកញ្ចប់ VIP។', '🔒 VIP required!', '🔒 仅限已认证 VIP 会员！请先升级 VIP。'), 'warning');
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
                  ? tr(
                      language,
                      `✏️ គ្រប់គ្រងហាង VIP របស់ខ្ញុំ (${myExistingRest.nameKh})`,
                      `✏️ Manage My VIP Store (${myExistingRest.nameEn || myExistingRest.nameKh})`,
                      `✏️ 管理我的 VIP 店铺 (${myExistingRest.nameEn || myExistingRest.nameKh})`
                    )
                  : tr(
                      language,
                      '+ ចុះបញ្ជីហាង VIP របស់អ្នក (1 ហាង)',
                      '+ Register Your VIP Restaurant (1 Store)',
                      '+ 注册您的专属 VIP 餐厅 (1 家店铺)'
                    )}
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
                <span>{tr(language, 'បន្ថែមហាងថ្មី', 'Add Store', '添加新店铺')}</span>
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
              {language === 'km' ? p.nameKh : language === 'zh' ? translateProvince(p.nameEn, 'zh') : p.nameEn}
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
                  {tr(
                    language,
                    `បង្ហាញហាងបន្ថែម (${displayedRestaurants.length} / ${sortedRestaurants.length})`,
                    `Show More Restaurants (${displayedRestaurants.length} / ${sortedRestaurants.length})`,
                    `加载更多餐厅 (${displayedRestaurants.length} / ${sortedRestaurants.length})`
                  )}
                </button>
              </div>
            )}
          </>
        ) : !isSearchingOnline && smartCachePlaces.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2 font-khmer">
            <Store className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs">
              {tr(language, 'រកមិនឃើញហាងអាហារត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ', 'No restaurants matched your filters', '未找到符合筛选条件的餐厅')}
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
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-2.5">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {isKm
                    ? `រកមិនឃើញទីតាំង "${searchQuery.trim()}" ក្នុងឃ្លាំងទិន្នន័យទេ។ អ្នកអាចបើកស្វែងរកទីតាំងនេះផ្ទាល់នៅលើ Google Maps៖`
                    : language === 'zh'
                    ? `未在缓存中找到“${searchQuery.trim()}”，您可以直接在 Google 地图中搜索：`
                    : `No cached results for "${searchQuery.trim()}". You can open this search directly in Google Maps:`}
                </p>
              </div>
            )}

            {/* Always provide a 1-click button to open the exact query in Google Maps */}
            <div className="pt-1 flex flex-col sm:flex-row gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${searchQuery.trim()} ${selectedProvince || ''} Cambodia`.trim()
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>
                  {isKm
                    ? `🗺️ បើកស្វែងរក "${searchQuery.trim()}" ផ្ទាល់នៅលើ Google Maps`
                    : language === 'zh'
                    ? `🗺️ 在 Google 地图中搜索 “${searchQuery.trim()}”`
                    : `🗺️ Open "${searchQuery.trim()}" in Google Maps`}
                </span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

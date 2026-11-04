import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RestaurantCard } from './RestaurantCard';
import { Restaurant, sortRestaurantsWithVipRotation, isAdminAccount, getVipFeaturedRotationConfig, isStrictVerifiedCambodiaRestaurant } from '../types';
import { shuffleForCurrentSession } from '../utils/sessionShuffle';
import { Store, Plus, Edit2, Shield, Settings, MapPin, Globe, RefreshCw, Search, X } from 'lucide-react';
import { normalizeKhmerSearchText } from '../services/googlePlacesService';
import { tr, translateProvince } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';

const RESTAURANT_BATCH_SIZE = 40;

export const RestaurantView: React.FC = () => {
  const {
    restaurants,
    users,
    appSettings,
    language,
    selectedProvince,
    setSelectedProvince,
    setIsVipAddRestaurantModalOpen,
    currentUser,
    setIsAuthModalOpen,
    activeManagedShopId,
    setActiveManagedShopId,
    getOwnedRestaurantsForUser,
    getCurrentUserStoreQuota,
    openManageMyVipStore,
    setIsAdminOpen,
    setIsRestaurantCheckInModalOpen,
    openGoogleMapsSearchModal,
  } = useApp();

  const isAdmin = isAdminAccount(currentUser);
  const storeQuota = getCurrentUserStoreQuota(currentUser);

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

  const [priceFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [shopSearchQuery, setShopSearchQuery] = useState<string>('');
  const [debouncedShopSearchQuery, setDebouncedShopSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(RESTAURANT_BATCH_SIZE);
  const [nowTickMs, setNowTickMs] = useState<number>(() => Date.now());
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        setNowTickMs(Date.now());
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Debounce search query to prevent thermal CPU throttling and frame drops while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedShopSearchQuery(shopSearchQuery);
    }, 180);
    return () => clearTimeout(timer);
  }, [shopSearchQuery]);

  const isKm = language === 'km';

  const classifyRestaurantCategory = (r: Restaurant): string => {
    const text = `${r.nameKh || ''} ${r.nameEn || ''} ${r.descriptionKh || ''} ${r.descriptionEn || ''} ${(r.signatureDishesKh || []).join(' ')}`.toLowerCase();
    if (
      text.includes('កាហ្វេ') ||
      text.includes('cafe') ||
      text.includes('coffee') ||
      text.includes('roastery') ||
      text.includes('atelier') ||
      text.includes('kinyei')
    ) {
      return 'cafe_bistro';
    }
    if (
      text.includes('សាច់អាំង') ||
      text.includes('bbq') ||
      text.includes('grill') ||
      text.includes('សុវណ្ណា') ||
      text.includes('sovanna')
    ) {
      return 'bbq_grill';
    }
    if (
      text.includes('សមុទ្រ') ||
      text.includes('seafood') ||
      text.includes('crab') ||
      text.includes('មាត់ទន្លេ') ||
      text.includes('មាត់បឹង') ||
      text.includes('មាត់ព្រែក') ||
      text.includes('riverside') ||
      text.includes('lake') ||
      text.includes('sailing') ||
      text.includes('bopha') ||
      text.includes('ក្បាលកោះ')
    ) {
      return 'seafood_riverside';
    }
    if (
      r.priceLevel === '$$$' ||
      text.includes('ម្លិះ') ||
      text.includes('malis') ||
      text.includes('wat damnak') ||
      text.includes('chanrey tree') ||
      text.includes('ក្រវាញ') ||
      text.includes('kravanh') ||
      text.includes('viroth') ||
      text.includes('រំដេង') ||
      text.includes('romdeng')
    ) {
      return 'khmer_fine_dining';
    }
    return 'family_garden';
  };

  const restaurantCategories = [
    { id: 'all', nameKh: 'គ្រប់ប្រភេទហាង', nameEn: 'All Restaurants', nameZh: '全部餐厅' },
    { id: 'khmer_fine_dining', nameKh: 'ម្ហូបខ្មែរប្រណីត', nameEn: 'Khmer Fine Dining', nameZh: '高端柬式料理' },
    { id: 'seafood_riverside', nameKh: 'គ្រឿងសមុទ្រ & មាត់ទន្លេ', nameEn: 'Seafood & Riverside', nameZh: '海鲜与河畔餐厅' },
    { id: 'family_garden', nameKh: 'ភោជនីយដ្ឋានគ្រួសារ & សួន', nameEn: 'Family & Garden', nameZh: '家庭与花园餐厅' },
    { id: 'cafe_bistro', nameKh: 'កាហ្វេ & ប៊ីស្រ្តូ', nameEn: 'Cafe & Bistro', nameZh: '咖啡与简餐' },
    { id: 'bbq_grill', nameKh: 'សាច់អាំង & ជួបជុំ', nameEn: 'BBQ & Grill', nameZh: '烧烤与聚餐' },
  ];

  useEffect(() => {
    setVisibleCount(RESTAURANT_BATCH_SIZE);
  }, [selectedProvince, priceFilter, categoryFilter, shopSearchQuery]);

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

  const sessionShuffledRestaurants = useMemo(
    () => shuffleForCurrentSession(restaurants),
    [restaurants]
  );

  const validDirectoryRestaurants = useMemo(() => {
    const seenIds = new Set<string>();
    return sessionShuffledRestaurants.filter((r) => {
      if (!isStrictVerifiedCambodiaRestaurant(r)) {
        return false;
      }
      if (
        r.aiCategoryVerification?.detectedType &&
        r.aiCategoryVerification.detectedType !== 'restaurant'
      ) {
        return false;
      }
      if (r.status === 'rejected' && r.pendingPhotoReplacement?.source === 'google_places_replacement_shop') {
        return false;
      }
      if (r.status !== 'approved' && currentUser?.role !== 'admin' && currentUser?.id !== r.ownerId) {
        return false;
      }
      // Keep ALL approved shops visible to all users (shops without photos render DefaultShopIcon;
      // shops with verified/Admin-uploaded photos are automatically sorted to the top via sortRestaurantsWithVipRotation).
      const idStr = String(r.id);
      if (seenIds.has(idStr)) return false;
      seenIds.add(idStr);
      return true;
    });
  }, [sessionShuffledRestaurants, currentUser?.role, currentUser?.id, isAdmin]);

  const filteredRestaurants = useMemo(() => {
    const cleanSelProv = (selectedProvince || '').replace(/^រាជធានី|^ខេត្ត/g, '').trim();
    const normQuery = normalizeKhmerSearchText(debouncedShopSearchQuery);
    const rawQueryLower = debouncedShopSearchQuery.trim().toLowerCase();

    return validDirectoryRestaurants.filter((r) => {
      if (cleanSelProv && !r.provinceKh.replace(/^រាជធានី|^ខេត្ត/g, '').includes(cleanSelProv)) {
        return false;
      }
      if (priceFilter !== 'all' && r.priceLevel !== priceFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && classifyRestaurantCategory(r) !== categoryFilter) {
        return false;
      }
      if (normQuery || rawQueryLower) {
        const zhLoc = getLocalizedRestaurant(r, 'zh');
        const hayRaw = `${r.nameKh || ''} ${r.nameEn || ''} ${zhLoc.name || ''} ${r.provinceKh || ''} ${r.provinceEn || ''} ${zhLoc.province || ''} ${r.addressKh || ''} ${r.addressEn || ''} ${zhLoc.address || ''} ${(r.signatureDishesKh || []).join(' ')} ${(zhLoc.signatureDishes || []).join(' ')}`.toLowerCase();
        const hayNorm = normalizeKhmerSearchText(hayRaw);
        if (!hayRaw.includes(rawQueryLower) && (!normQuery || !hayNorm.includes(normQuery))) {
          return false;
        }
      }
      return true;
    });
  }, [validDirectoryRestaurants, selectedProvince, priceFilter, categoryFilter, debouncedShopSearchQuery]);

  const sortedRestaurants = useMemo(
    () => sortRestaurantsWithVipRotation(filteredRestaurants, users, appSettings, nowTickMs),
    [filteredRestaurants, users, appSettings, nowTickMs]
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
      { root: document.getElementById('kft-main-scroll'), rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, sortedRestaurants.length]);

  const { totalDirectoryCount, pendingCount } = useMemo(() => {
    let p = 0;
    for (const r of restaurants) {
      if (r.status === 'pending') p++;
    }
    return {
      totalDirectoryCount: validDirectoryRestaurants.length,
      pendingCount: p,
    };
  }, [validDirectoryRestaurants, restaurants]);

  const rotCfg = getVipFeaturedRotationConfig(appSettings);

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-3 pb-6">
      {/* =====================================================================
          SECTION 1: SEARCH SHOPS (ស្វែងរកហាង) — Clearly Labeled Section
          ===================================================================== */}
      <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-500/30 dark:border-slate-800 shadow-xs space-y-2.5 font-khmer">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-[#064E3B] dark:text-emerald-400 shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-moul text-xs sm:text-sm text-[#0F172A] dark:text-white truncate">
                {tr(language, '🔍 ស្វែងរកហាង (Search Shops)', '🔍 Search Shops', '🔍 搜索店铺')}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {tr(
                  language,
                  'វាយឈ្មោះហាង ជ្រើសរើសប្រភេទហាង ឬខេត្ត-រាជធានីខាងក្រោម',
                  'Search by shop name, category, or province below',
                  '按店铺名称、类别或省份搜索'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openGoogleMapsSearchModal('restaurant')}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-[#064E3B] dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{tr(language, 'ស្វែងរកលើផែនទី', 'Find on Map', '地图查找')}</span>
          </button>
        </div>

        {/* Shop Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={shopSearchQuery}
            onChange={(e) => setShopSearchQuery(e.target.value)}
            placeholder={tr(
              language,
              'វាយឈ្មោះហាង មុខម្ហូប ឬខេត្ត-ក្រុង...',
              'Search shop name, dish, or province...',
              '输入店铺名称、菜品或省份...'
            )}
            className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 font-khmer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          {shopSearchQuery && (
            <button
              type="button"
              onClick={() => setShopSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title={tr(language, 'សម្អាត', 'Clear', '清除')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Restaurant Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {restaurantCategories.map((cat) => {
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-emerald-700 text-white shadow-xs ring-1 ring-emerald-400/50'
                    : 'bg-emerald-50/80 dark:bg-slate-800 text-emerald-900 dark:text-emerald-200 border border-emerald-200/80 dark:border-slate-700 hover:bg-emerald-100/70'
                }`}
              >
                {language === 'km' ? cat.nameKh : language === 'zh' ? cat.nameZh : cat.nameEn}
              </button>
            );
          })}
        </div>

        {/* Province Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {provinces.map((p) => {
            const cleanSel = (selectedProvince || '').replace(/^រាជធានី|^ខេត្ត/g, '').trim();
            const active = cleanSel === p.id || (!cleanSel && p.id === '');
            return (
              <button
                key={p.id || 'all'}
                onClick={() => setSelectedProvince(p.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
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
      </div>

      {/* =====================================================================
          SECTION 2: ADD NEW SHOP (បន្ថែមហាងថ្មី) — Clearly Labeled Section
          ===================================================================== */}
      <div className="p-3.5 rounded-3xl bg-gradient-to-br from-[#022c22] via-[#064E3B] to-emerald-900 text-white shadow-md border border-emerald-500/40 space-y-2.5 font-khmer">
        <div className="flex items-start justify-between gap-2.5">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Store className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="font-moul text-xs sm:text-sm text-white">
                {tr(language, '➕ បន្ថែមហាងថ្មី (Add New Shop)', '➕ Add New Shop', '➕ 添加新店铺')}
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/90 leading-relaxed">
              {tr(
                language,
                'ចុចប៊ូតុង «+ បន្ថែមហាងថ្មី» ខាងក្រោម ដើម្បីបំពេញឈ្មោះហាង ប្រភេទហាង លេខទូរស័ព្ទ រូបភាព និងជ្រើសរើសទីតាំងលើផែនទី Google Maps។',
                'Tap "+ Add New Shop" below to enter shop details, select location on Google Maps, preview, and submit.',
                '点击下方“+ 添加新店铺”填写店铺信息、在 Google 地图上选择位置并预览提交。'
              )}
            </p>
          </div>
        </div>

        {/* Prominent + Add New Shop Button */}
        <button
          type="button"
          onClick={() => {
            if (!currentUser) {
              setIsAuthModalOpen(true);
              return;
            }
            (window as any).__kft_vip_store_initial_mode = { mode: 'create' };
            setIsVipAddRestaurantModalOpen(true);
          }}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4 stroke-[3] shrink-0" />
          <span>{tr(language, '+ បន្ថែមហាងថ្មី (+ Add New Shop)', '+ Add New Shop', '+ 添加新店铺')}</span>
        </button>

        {/* Secondary Management Controls for Admin or Existing Shop Owners */}
        {isAdmin ? (
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                (window as any).__kft_admin_tab = 'restaurants';
                setIsAdminOpen(true);
              }}
              className="py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">
                {tr(language, `គ្រប់គ្រងហាង (${totalDirectoryCount})`, `Manage Shops (${totalDirectoryCount})`, `管理店铺 (${totalDirectoryCount})`)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsRestaurantCheckInModalOpen(true)}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 border border-white/15 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="truncate">{tr(language, 'ឆែកអ៊ីន & បញ្ជាក់ GPS', 'GPS Check-In', 'GPS 实地核验')}</span>
            </button>
          </div>
        ) : myExistingRest ? (
          <div className="pt-1 border-t border-white/15 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-amber-200 truncate block">
                {tr(
                  language,
                  `ហាងរបស់ខ្ញុំ៖ ${myExistingRest.nameKh}`,
                  `My Shop: ${myExistingRest.nameEn || myExistingRest.nameKh}`,
                  `我的店铺：${myExistingRest.nameEn || myExistingRest.nameKh}`
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openManageMyVipStore(myExistingRest.id)}
              className="py-1.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            >
              <Edit2 className="w-3 h-3 text-amber-300" />
              <span>{tr(language, 'កែប្រែហាងខ្ញុំ', 'Edit My Shop', '编辑我的店铺')}</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Restaurant Cards List */}
      <div className="space-y-2">
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
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#064E3B] dark:text-emerald-400 shadow-2xs font-khmer cursor-pointer"
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
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-2 font-khmer">
            <Store className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs">
              {tr(language, 'រកមិនឃើញហាងអាហារក្នុងផ្នែកនេះទេ', 'No restaurants matched your filters', '未找到符合筛选条件的餐厅')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

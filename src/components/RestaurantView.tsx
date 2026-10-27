import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RestaurantCard } from './RestaurantCard';
import { Restaurant, sortRestaurantsWithVipRotation } from '../types';
import { shuffleForCurrentSession } from '../utils/sessionShuffle';
import { Store, Plus, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react';
import { normalizeKhmerSearchText } from '../services/googlePlacesService';
import { tr, translateProvince } from '../utils/i18n';

const RESTAURANT_BATCH_SIZE = 20;

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
  } = useApp();

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
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [visibleCount, setVisibleCount] = useState<number>(RESTAURANT_BATCH_SIZE);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

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
  }, [selectedProvince, priceFilter, categoryFilter, verifiedFilter]);

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

  const filteredRestaurants = useMemo(() => {
    const cleanSelProv = (selectedProvince || '').replace(/^រាជធានី|^ខេត្ត/g, '').trim();
    const seenNames = new Set<string>();
    return sessionShuffledRestaurants.filter((r) => {
      // Strictly exclude any non-restaurant records (food dishes or tourist attractions)
      if (!r || !r.id || String(r.id).startsWith('food-') || String(r.id).startsWith('dest-')) {
        return false;
      }
      if (
        r.aiCategoryVerification?.detectedType &&
        r.aiCategoryVerification.detectedType !== 'restaurant'
      ) {
        return false;
      }
      if (r.status !== 'approved' && currentUser?.role !== 'admin' && currentUser?.id !== r.ownerId) {
        return false;
      }
      if (verifiedFilter === 'verified' && !r.isVerified) return false;
      if (verifiedFilter === 'unverified' && r.isVerified) return false;
      if (cleanSelProv && !r.provinceKh.replace(/^រាជធានី|^ខេត្ត/g, '').includes(cleanSelProv)) {
        return false;
      }
      if (priceFilter !== 'all' && r.priceLevel !== priceFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && classifyRestaurantCategory(r) !== categoryFilter) {
        return false;
      }
      // Deduplicate by normalized Khmer+English name within the same province
      const dedupKey = `${normalizeKhmerSearchText(r.nameKh)}|${normalizeKhmerSearchText(r.provinceKh)}`;
      if (seenNames.has(dedupKey)) return false;
      seenNames.add(dedupKey);
      return true;
    });
  }, [sessionShuffledRestaurants, currentUser?.role, currentUser?.id, verifiedFilter, selectedProvince, priceFilter, categoryFilter]);

  const sortedRestaurants = useMemo(
    () => sortRestaurantsWithVipRotation(filteredRestaurants, users, appSettings),
    [filteredRestaurants, users, appSettings]
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
      {/* Title Bar (Search removed — kept on Home Screen only) */}
      <div className="flex items-center justify-between gap-2">
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

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              if (!currentUser) {
                setIsAuthModalOpen(true);
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
                <span>{tr(language, 'បន្ថែមហាងថ្មី', 'Add Store', '添加店铺')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Verification Filter Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-khmer border border-slate-200/90 dark:border-slate-700">
        <button
          onClick={() => setVerifiedFilter('all')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-center font-bold transition-all cursor-pointer ${
            verifiedFilter === 'all'
              ? 'bg-[#064E3B] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#064E3B]'
          }`}
        >
          {tr(language, `ទាំងអស់ (${restaurants.length})`, `All (${restaurants.length})`, `全部 (${restaurants.length})`)}
        </button>
        <button
          onClick={() => setVerifiedFilter('verified')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-center font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
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
          className={`flex-1 py-1.5 px-2 rounded-xl text-center font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            verifiedFilter === 'unverified'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{tr(language, `គំរូ (${sampleCount})`, `Sample (${sampleCount})`, `示例 (${sampleCount})`)}</span>
        </button>
      </div>

      {/* Banner for Restaurant Owners */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-[#064E3B] text-white shadow-lg border-2 border-amber-300/70 space-y-3 font-khmer">
        <div className="flex items-start justify-between gap-2.5">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Store className="w-4 h-4 text-amber-200 shrink-0" />
              <span className="font-black text-xs sm:text-sm text-white">
                {myExistingRest
                  ? tr(
                      language,
                      `ហាងរបស់ខ្ញុំ៖ ${myExistingRest.nameKh}`,
                      `My Store: ${myExistingRest.nameEn || myExistingRest.nameKh}`,
                      `我的店铺：${myExistingRest.nameEn || myExistingRest.nameKh}`
                    )
                  : tr(language, 'ចុះបញ្ជីហាងរបស់អ្នក (1 ហាង)', 'Register Your Restaurant (1 Store)', '注册您的餐厅（1 家店铺）')}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 text-[9px] font-black">
                {myExistingRest
                  ? tr(
                      language,
                      `${myExistingRest.menuItems?.length || 0} មុខម្ហូប`,
                      `${myExistingRest.menuItems?.length || 0} dishes`,
                      `${myExistingRest.menuItems?.length || 0} 道菜品`
                    )
                  : tr(language, 'ឥតគិតថ្លៃ ១ ហាងដំបូង', '1st Shop Free', '首店免费')}
              </span>
            </div>
            <p className="text-[11px] text-amber-50 leading-relaxed font-medium">
              {myExistingRest
                ? tr(
                    language,
                    `${myExistingRest.addressKh} • ចុចប៊ូតុងខាងក្រោមដើម្បីបន្ថែមមុខម្ហូប កែតម្លៃ រូបភាព និងព័ត៌មានហាង "${myExistingRest.nameKh}"។`,
                    `${myExistingRest.addressEn || myExistingRest.addressKh} • Tap below to manage menus, prices, photos & info.`,
                    `${myExistingRest.addressEn || myExistingRest.addressKh} • 点击下方按钮管理菜单、价格、图片与店铺信息。`
                  )
                : tr(
                    language,
                    'ចុះបញ្ជីហាងមុន ហាងរបស់លោកអ្នកនឹងបង្ហាញមុនគេតាមលំដាប់លេខរៀង ដើម្បីងាយស្រួលឱ្យអតិថិជនស្វែងរក និងតាមដានស្ថិតិហាង។',
                    'Register your restaurant early so it appears first in chronological order, making it easy for customers to find and track store analytics.',
                    '越早注册您的餐厅，越能优先展示在推荐列表中，方便国内外顾客搜索并查看实时店铺访问统计。'
                  )}
            </p>
          </div>
        </div>

        {/* Multi-Shop Selector Pill Bar (when user/Admin has multiple shops) */}
        {myOwnedRestaurants.length > 1 && (
          <div className="p-2.5 rounded-2xl bg-black/25 border border-white/20 space-y-1.5">
            <div className="text-[10px] font-bold text-amber-200 flex items-center justify-between">
              <span>
                {tr(
                  language,
                  `ជ្រើសរើសហាងដែលអ្នកចង់គ្រប់គ្រង (${myOwnedRestaurants.length} ហាង)៖`,
                  `Select shop to manage (${myOwnedRestaurants.length}):`,
                  `选择要管理的店铺（共 ${myOwnedRestaurants.length} 家）：`
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
                    <span className="truncate max-w-[130px]">{isKm ? shop.nameKh : shop.nameEn || shop.nameKh}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative p-1 rounded-2xl group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-70 blur-xs vip-glow-btn pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                if (!currentUser) {
                  setIsAuthModalOpen(true);
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
              <Store className="w-4 h-4 text-slate-950 shrink-0" />
              <span className="truncate">
                {myExistingRest
                  ? tr(
                      language,
                      `គ្រប់គ្រងហាងរបស់ខ្ញុំ (${myExistingRest.nameKh})`,
                      `Manage My Store (${myExistingRest.nameEn || myExistingRest.nameKh})`,
                      `管理我的店铺 (${myExistingRest.nameEn || myExistingRest.nameKh})`
                    )
                  : tr(
                      language,
                      '+ ចុះបញ្ជីហាងរបស់អ្នក (1 ហាង)',
                      '+ Register Your Restaurant (1 Store)',
                      '+ 注册您的专属餐厅 (1 家店铺)'
                    )}
              </span>
            </button>

            {myExistingRest && (
              <button
                type="button"
                onClick={() => {
                  (window as any).__kft_vip_store_initial_mode = { mode: 'create' };
                  setIsVipAddRestaurantModalOpen(true);
                }}
                className="py-3 px-3.5 rounded-xl bg-emerald-900/90 hover:bg-emerald-800 text-amber-200 border border-amber-300/60 text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {storeQuota.canAddWithoutNewPayment
                    ? tr(language, 'បន្ថែមហាងថ្មី ($0)', 'Add Store ($0)', '添加新店铺 ($0)')
                    : tr(language, `បន្ថែមហាងថ្មី (+${storeQuota.additionalStoreFeeUsd.toFixed(2)})`, `Add Store (+${storeQuota.additionalStoreFeeUsd.toFixed(2)})`, `添加新店铺 (+${storeQuota.additionalStoreFeeUsd.toFixed(2)})`)}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Restaurant Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 font-khmer">
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

      {/* Location Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 font-khmer">
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

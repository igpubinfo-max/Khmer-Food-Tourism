import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RestaurantCard } from './RestaurantCard';
import { Restaurant, sortRestaurantsWithVipRotation, isAdminAccount, getVipFeaturedRotationConfig, isStrictVerifiedCambodiaRestaurant, openExternalUrlNativeSafe, isHotelBusinessRecord, isIosOrIpadAppStoreRuntime, getShopSubscriptionCatalog } from '../types';
import { shuffleForCurrentSession } from '../utils/sessionShuffle';
import { Store, Edit2, Settings, MapPin, Search } from 'lucide-react';
import {
  ListingSearchPanel,
  ListingSearchInput,
  ListingPills,
  ListingAddPanel,
} from './listing/ListingUI';
import { normalizeKhmerSearchText } from '../services/googlePlacesService';
import { analyzeSearchQuery, scoreSearchRecord, restaurantSearchFields } from '../utils/searchEngine';
import { tr, translateProvince } from '../utils/i18n';
import { getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { matchShopToProductQuery, verifyShopDataForDisplay } from '../utils/foodFilters';
import { parseSmartSearchIntent } from '../utils/aiSearchBridge';

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
    showToast,
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
    }, 30 * 60 * 1000);
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
    const text = `${r.nameKh || ''} ${r.nameEn || ''} ${r.descriptionKh || ''} ${r.descriptionEn || ''} ${(r.signatureDishesKh || []).join(' ')} ${(r.signatureDishesEn || []).join(' ')}`.toLowerCase();
    if (
      text.includes('កាហ្វេ') ||
      text.includes('តែគុជ') ||
      text.includes('ប៊ីស្រ្តូ') ||
      text.includes('cafe') ||
      text.includes('café') ||
      text.includes('coffee') ||
      text.includes('roastery') ||
      text.includes('atelier') ||
      text.includes('kinyei') ||
      text.includes('bistro') ||
      text.includes('brown ') ||
      text.includes('tube ') ||
      text.includes('starbucks') ||
      text.includes('amazon') ||
      text.includes('chagee') ||
      text.includes('koi ') ||
      text.includes('mixue') ||
      text.includes('boba') ||
      text.includes('bakery') ||
      text.includes('pastry') ||
      text.includes('sister srey') ||
      text.includes('ministry of cat') ||
      text.includes('camping')
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
    { id: 'cafe_bistro', nameKh: '☕ កាហ្វេប្រេន & កន្លែងល្បីយុវវ័យ', nameEn: '☕ Branded Cafes & Youth Spots', nameZh: '☕ 品牌咖啡与青年热门打卡点' },
    { id: 'khmer_fine_dining', nameKh: 'ម្ហូបខ្មែរប្រណីត', nameEn: 'Khmer Fine Dining', nameZh: '高端柬式料理' },
    { id: 'seafood_riverside', nameKh: 'គ្រឿងសមុទ្រ & មាត់ទន្លេ', nameEn: 'Seafood & Riverside', nameZh: '海鲜与河畔餐厅' },
    { id: 'family_garden', nameKh: 'ភោជនីយដ្ឋានគ្រួសារ & សួន', nameEn: 'Family & Garden', nameZh: '家庭与花园餐厅' },
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
      if (isHotelBusinessRecord(r)) {
        return false;
      }
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
    const rawQuery = debouncedShopSearchQuery.trim();
    const smartIntent = rawQuery ? parseSmartSearchIntent(rawQuery) : null;
    const effectiveProvRaw = selectedProvince || smartIntent?.detectedProvinceKh || '';
    const cleanSelProv = effectiveProvRaw.replace(/^រាជធានី|^ខេត្ត/g, '').trim();
    const effectiveProductQuery = (smartIntent?.isConversationalPrompt && smartIntent.coreQuery ? smartIntent.coreQuery : rawQuery).trim();
    const normQuery = normalizeKhmerSearchText(effectiveProductQuery || rawQuery);
    const rawQueryLower = (effectiveProductQuery || rawQuery).toLowerCase();
    const queryAnalysis = rawQuery ? analyzeSearchQuery(rawQuery) : null;

    return validDirectoryRestaurants.filter((r) => {
      if (!verifyShopDataForDisplay(r)) {
        return false;
      }
      if (cleanSelProv && !r.provinceKh.replace(/^រាជធានី|^ខេត្ត/g, '').includes(cleanSelProv)) {
        return false;
      }
      if (priceFilter !== 'all' && r.priceLevel !== priceFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && classifyRestaurantCategory(r) !== categoryFilter) {
        return false;
      }
      if (rawQuery) {
        // 0. Natural-language semantic category match (e.g. "ជួយរកហាងកាហ្វេស្អាតនៅកំពត")
        if (smartIntent && queryAnalysis && queryAnalysis.distinctive.length === 0) {
          if (smartIntent.semanticCategory === 'cafe' && classifyRestaurantCategory(r) === 'cafe_bistro') return true;
          if ((smartIntent.semanticCategory === 'seafood' || smartIntent.semanticCategory === 'bbq' || smartIntent.semanticCategory === 'fine_dining') && classifyRestaurantCategory(r) === 'khmer_dining') return true;
          if (!smartIntent.semanticCategory && smartIntent.detectedProvinceKh) return true;
        }
        // 1. Shop name match (exact / partial / typo-tolerant, Khmer + English + Chinese names)
        if (queryAnalysis) {
          const nameDetail = scoreSearchRecord(
            queryAnalysis,
            restaurantSearchFields(r, [getLocalizedRestaurant(r, 'zh').name])
          );
          if (nameDetail.matchedInName && nameDetail.score >= 200) {
            return true;
          }
        }
        // 2. Product / dish match (menu, signature dishes, shop category)
        const productMatch = matchShopToProductQuery(r, effectiveProductQuery || rawQuery);
        if (productMatch.matches) {
          return true;
        }
        // Only fall back to location/province substring if the query is purely a location name (not a blocked food product)
        const zhLoc = getLocalizedRestaurant(r, 'zh');
        const locRaw = `${r.provinceKh || ''} ${r.provinceEn || ''} ${zhLoc.province || ''} ${r.addressKh || ''} ${r.addressEn || ''} ${zhLoc.address || ''}`.toLowerCase();
        const locNorm = normalizeKhmerSearchText(locRaw);
        const isPureLocationMatch =
          (rawQueryLower.length >= 3 && locRaw.includes(rawQueryLower)) ||
          (normQuery.length >= 3 && locNorm.includes(normQuery));
        return isPureLocationMatch && productMatch.score === 0;
      }
      return true;
    });
  }, [validDirectoryRestaurants, selectedProvince, priceFilter, categoryFilter, debouncedShopSearchQuery]);

  const sortedRestaurants = useMemo(() => {
    const vipSorted = sortRestaurantsWithVipRotation(filteredRestaurants, users, appSettings, nowTickMs);
    const q = debouncedShopSearchQuery.trim();
    if (!q) return vipSorted;
    // While searching, the most relevant shops come first (exact name → partial → typo → dish/category),
    // keeping the VIP rotation order only as a tie-breaker inside the same relevance tier.
    const qa = analyzeSearchQuery(q);
    return vipSorted
      .map((r, idx) => ({
        r,
        idx,
        score: scoreSearchRecord(qa, restaurantSearchFields(r, [getLocalizedRestaurant(r, 'zh').name])).score,
      }))
      .sort((a, b) => Math.floor(b.score / 100) - Math.floor(a.score / 100) || a.idx - b.idx)
      .map((x) => x.r);
  }, [filteredRestaurants, users, appSettings, nowTickMs, debouncedShopSearchQuery]);

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

  const handleAddShopClick = () => {
    if (!currentUser) {
      showToast(
        tr(language, 'សូមចូលគណនីជាមុនសិន ដើម្បីបន្ថែមហាងថ្មី', 'Please sign in first to add a shop', '请先登录以添加新店铺'),
        'info'
      );
      setIsAuthModalOpen(true);
      return;
    }
    (window as any).__kft_vip_store_initial_mode = { mode: 'create', businessType: 'restaurant' };
    setIsVipAddRestaurantModalOpen(true);
  };

  const cleanSelectedProvince = (selectedProvince || '').replace(/^រាជធានី|^ខេត្ត/g, '').trim();

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-3 pb-6">
      {/* =====================================================================
          SECTION 1: SEARCH SHOPS
          ===================================================================== */}
      <ListingSearchPanel
        icon={Search}
        title={tr(language, 'ស្វែងរកហាង (Search Shops)', 'Search Shops', '搜索店铺')}
        subtitle={tr(
          language,
          'វាយឈ្មោះហាង ជ្រើសរើសប្រភេទហាង ឬខេត្ត-រាជធានីខាងក្រោម',
          'Search by shop name, category, or province below',
          '按店铺名称、类别或省份搜索'
        )}
        headerAction={
          <button
            type="button"
            onClick={() => openGoogleMapsSearchModal('restaurant')}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-300/80 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            <MapPin className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{tr(language, 'ស្វែងរកលើផែនទី', 'Find on Map', '地图查找')}</span>
          </button>
        }
      >
        <ListingSearchInput
          value={shopSearchQuery}
          onChange={setShopSearchQuery}
          placeholder={tr(
            language,
            'វាយឈ្មោះហាង មុខម្ហូប ឬខេត្ត-ក្រុង...',
            'Search shop name, dish, or province...',
            '输入店铺名称、菜品或省份...'
          )}
          clearLabel={tr(language, 'សម្អាត', 'Clear', '清除')}
        />

        <ListingPills
          items={restaurantCategories.map((cat) => ({
            id: cat.id,
            label: language === 'km' ? cat.nameKh : language === 'zh' ? cat.nameZh : cat.nameEn,
          }))}
          activeId={categoryFilter}
          onSelect={setCategoryFilter}
        />

        <ListingPills
          items={provinces.map((p) => ({
            id: p.id,
            label: language === 'km' ? p.nameKh : language === 'zh' ? translateProvince(p.nameEn, 'zh') : p.nameEn,
          }))}
          activeId={cleanSelectedProvince}
          onSelect={setSelectedProvince}
        />
      </ListingSearchPanel>

      {/* =====================================================================
          SECTION 2: ADD NEW SHOP (VIP listings are showcased as large cards)
          ===================================================================== */}
      <ListingAddPanel
        icon={Store}
        title={tr(language, 'បន្ថែមហាងថ្មី (Add New Shop)', 'Add New Shop', '添加新店铺')}
        description={(() => {
          if (isIosOrIpadAppStoreRuntime()) {
            return tr(
              language,
              'បំពេញឈ្មោះហាង ប្រភេទហាង លេខទូរស័ព្ទ រូបភាព និងជ្រើសរើសទីតាំងលើផែនទី Google Maps ដើម្បីដាក់ស្នើឱ្យរដ្ឋបាលពិនិត្យអនុម័ត។',
              'Enter shop details, phone, photo, and Google Maps pin to submit for Admin review and approval.',
              '填写店铺信息、电话、照片并在 Google 地图上选择位置后提交审核。'
            );
          }
          const shopCat = getShopSubscriptionCatalog(appSettings);
          const mPrice = shopCat.monthlyPlan.priceUsd.toFixed(2);
          const yPrice = (shopCat.earlyBirdRemaining > 0 && shopCat.earlyBirdPlan.enabled ? shopCat.earlyBirdPlan.priceUsd : shopCat.yearlyPlan.priceUsd).toFixed(2);
          return tr(
            language,
            `ចុះបញ្ជីហាងក្នុងកញ្ចប់ហាង VIP បង់ប្រាក់ (${mPrice}/ខែ ឬ ${yPrice}/ឆ្នាំ) បើកគ្រប់មុខងារទាំង ៥ (មិនរួមបញ្ចូលក្នុង Free Trial 7 ថ្ងៃឡើយ • បង់ប្រាក់ក្រោយ Admin អនុម័ត)។`,
            `Register your shop with the Paid All-Inclusive Shop Package (${mPrice}/mo or ${yPrice}/yr) for all 5 VIP benefits (not included in 7-Day Free Trial; pay after Admin approval).`,
            `开通付费全包店铺套餐（${mPrice}/月 或 ${yPrice}/年）享全部 5 大权益（不含在 7 天免费试用内，管理员审核通过后付款）。`
          );
        })()}
        actionLabel={tr(language, 'បន្ថែមហាងថ្មី (Add New Shop)', 'Add New Shop', '添加新店铺')}
        onAction={handleAddShopClick}
      >
        {isAdmin ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                (window as any).__kft_admin_tab = 'restaurants';
                setIsAdminOpen(true);
              }}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-amber-300 shrink-0" strokeWidth={1.75} />
              <span className="truncate">
                {tr(language, `គ្រប់គ្រងហាង (${totalDirectoryCount})`, `Manage Shops (${totalDirectoryCount})`, `管理店铺 (${totalDirectoryCount})`)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsRestaurantCheckInModalOpen(true)}
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-50 border border-white/15 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-emerald-300 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{tr(language, 'ឆែកអ៊ីន & បញ្ជាក់ GPS', 'GPS Check-In', 'GPS 实地核验')}</span>
            </button>
          </div>
        ) : myExistingRest ? (
          <div className="pt-2.5 border-t border-white/15 flex items-center justify-between gap-2">
            <span className="min-w-0 flex-1 text-[11px] font-bold text-amber-200 truncate">
              {tr(
                language,
                `ហាងរបស់ខ្ញុំ៖ ${myExistingRest.nameKh}`,
                `My Shop: ${myExistingRest.nameEn || myExistingRest.nameKh}`,
                `我的店铺：${myExistingRest.nameEn || myExistingRest.nameKh}`
              )}
            </span>
            <button
              type="button"
              onClick={() => openManageMyVipStore(myExistingRest.id)}
              className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/25 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4 text-amber-300" strokeWidth={1.75} />
              <span>{tr(language, 'កែប្រែហាងខ្ញុំ', 'Edit My Shop', '编辑我的店铺')}</span>
            </button>
          </div>
        ) : null}
      </ListingAddPanel>

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
            <Store className="w-10 h-10 mx-auto text-slate-300" strokeWidth={1.75} />
            <p className="text-xs">
              {debouncedShopSearchQuery.trim()
                ? tr(
                    language,
                    `រកមិនឃើញហាងដែលត្រូវនឹង «${debouncedShopSearchQuery.trim()}» ក្នុងកម្មវិធីទេ`,
                    `No shops in the app match "${debouncedShopSearchQuery.trim()}"`,
                    `应用内未找到与“${debouncedShopSearchQuery.trim()}”匹配的店铺`
                  )
                : tr(language, 'រកមិនឃើញហាងអាហារក្នុងផ្នែកនេះទេ', 'No restaurants matched your filters', '未找到符合筛选条件的餐厅')}
            </p>
            {debouncedShopSearchQuery.trim() && (
              <button
                type="button"
                onClick={() =>
                  openExternalUrlNativeSafe(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${debouncedShopSearchQuery.trim()} Cambodia`)}`
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#064E3B] dark:text-emerald-400 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                {tr(language, 'ស្វែងរកនៅលើ Google Maps', 'Search on Google Maps', '在 Google 地图中搜索')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

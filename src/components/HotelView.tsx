import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TouristCard, DefaultDestinationIcon } from './TouristCard';
import {
  TouristDestination,
  Restaurant,
  isAdminAccount,
  openDestinationGoogleExternal,
} from '../types';
import { shuffleForCurrentSession } from '../utils/sessionShuffle';
import {
  BedDouble,
  Plus,
  Edit2,
  Settings,
  MapPin,
  Search,
  X,
  Star,
  Phone,
  CheckCircle2,
  Heart,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { normalizeKhmerSearchText } from '../services/googlePlacesService';
import { DISH_PROVINCES } from '../utils/foodFilters';
import { tr } from '../utils/i18n';
import { getLocalizedDestination } from '../utils/zhDynamicTranslator';

const HOTEL_BATCH_SIZE = 36;

export const HotelView: React.FC = () => {
  const {
    destinations,
    restaurants,
    language,
    selectedProvince,
    setSelectedProvince,
    setSelectedDestination,
    isBookmarked,
    toggleBookmark,
    setIsVipAddRestaurantModalOpen,
    currentUser,
    setIsAuthModalOpen,
    activeManagedShopId,
    getOwnedRestaurantsForUser,
    getCurrentUserStoreQuota,
    openManageMyVipStore,
    setIsAdminOpen,
    showToast,
  } = useApp();

  const isAdmin = isAdminAccount(currentUser);
  const storeQuota = getCurrentUserStoreQuota(currentUser);

  // All businesses (Shop OR Hotel) owned by current user — 1 VIP slot is shared across both!
  const myOwnedBusinesses = useMemo(
    () => getOwnedRestaurantsForUser(currentUser),
    [restaurants, currentUser, activeManagedShopId]
  );
  const myExistingShop = useMemo(
    () => myOwnedBusinesses.find((r) => r.businessType !== 'hotel'),
    [myOwnedBusinesses]
  );
  const myExistingHotel = useMemo(
    () => myOwnedBusinesses.find((r) => r.businessType === 'hotel'),
    [myOwnedBusinesses]
  );

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [hotelSearchQuery, setHotelSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(HOTEL_BATCH_SIZE);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(hotelSearchQuery);
    }, 180);
    return () => clearTimeout(timer);
  }, [hotelSearchQuery]);

  useEffect(() => {
    setVisibleCount(HOTEL_BATCH_SIZE);
  }, [selectedProvince, categoryFilter, hotelSearchQuery]);

  // Convert any VIP-added Hotel records (from `restaurants` where `businessType === 'hotel'`) into TouristDestination format so they appear first as Verified Big Cards
  const vipAddedHotelDestinations = useMemo<TouristDestination[]>(() => {
    return restaurants
      .filter((r: Restaurant) => r && r.businessType === 'hotel' && (r.status === 'approved' || isAdmin || r.ownerId === currentUser?.id))
      .map((r: Restaurant) => ({
        id: r.id,
        nameKh: r.nameKh,
        nameEn: r.nameEn || r.nameKh,
        categorySlug: 'hotel' as const,
        categoryKh: r.categoryKh || 'សណ្ឋាគារ & កន្លែងស្នាក់នៅ',
        categoryEn: r.categoryEn || 'Hotel & Stay',
        descriptionKh: r.descriptionKh || `${r.nameKh} — កន្លែងស្នាក់នៅស្អាត និងមានផាសុកភាព។`,
        descriptionEn: r.descriptionEn || `${r.nameEn || r.nameKh} — Verified accommodation in ${r.provinceEn}.`,
        photoUrl: r.profileImage || r.photoUrl || '',
        galleryPhotos: r.galleryPhotos || [],
        provinceKh: r.provinceKh,
        provinceEn: r.provinceEn,
        addressKh: r.addressKh || r.provinceKh,
        addressEn: r.addressEn || r.provinceEn,
        phone: r.phone,
        priceRange: r.priceLevel || '$$',
        entranceFeeKh: `តម្លៃបន្ទប់៖ ${r.priceLevel || '$$'} • 📞 ${r.phone || ''}`,
        entranceFeeEn: `Room Rate: ${r.priceLevel || '$$'} • 📞 ${r.phone || ''}`,
        bestTimeToVisitKh: r.openingHoursKh || 'បើកទទួលភ្ញៀវ ២៤ ម៉ោង',
        bestTimeToVisitEn: r.openingHoursEn || 'Open 24 Hours',
        mapUrl: r.mapUrl || `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`,
        latitude: r.latitude,
        longitude: r.longitude,
        rating: r.rating || 4.9,
        reviewCount: r.reviewCount || 128,
        highlightsKh: r.signatureDishesKh?.length
          ? r.signatureDishesKh
          : ['បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ Wi-Fi និងចំណតរថយន្តសុវត្ថិភាព'],
        isFeatured: true,
        isCustomPhoto: Boolean(r.profileImage || r.photoUrl),
        locationVerificationStatus: 'verified' as const,
      }));
  }, [restaurants, isAdmin, currentUser?.id]);

  // Combine VIP-added hotels + seed/admin hotels from `destinations` (where categorySlug === 'hotel')
  const allHotels = useMemo<TouristDestination[]>(() => {
    const seedHotels = destinations.filter((d) => Boolean(d && d.categorySlug === 'hotel'));
    const vipIds = new Set(vipAddedHotelDestinations.map((d) => d.id));
    return [...vipAddedHotelDestinations, ...seedHotels.filter((d) => !vipIds.has(d.id))];
  }, [destinations, vipAddedHotelDestinations]);

  const classifyHotelSubCategory = (h: TouristDestination): string => {
    const text = `${h.nameKh || ''} ${h.nameEn || ''} ${h.categoryKh || ''} ${h.categoryEn || ''}`.toLowerCase();
    if (text.includes('រីសត') || text.includes('resort') || h.priceRange === '$$$$' || h.priceRange === '$$$') {
      return 'luxury_resort';
    }
    if (text.includes('វីឡា') || text.includes('villa') || text.includes('ប៊ូទិក') || text.includes('boutique')) {
      return 'boutique_villa';
    }
    if (text.includes('ផ្ទះសំណាក់') || text.includes('guesthouse') || text.includes('ផ្ទះស្នាក់') || text.includes('homestay') || text.includes('hostel')) {
      return 'guesthouse';
    }
    return 'hotel_stay';
  };

  const isVerifiedBigHotel = (h: TouristDestination): boolean => {
    return Boolean(
      h.isFeatured ||
      (h.photoUrl && h.photoUrl.trim().length > 0) ||
      h.id.startsWith('rest-')
    );
  };

  const hotelCategories = [
    { id: 'all', nameKh: 'គ្រប់ប្រភេទសណ្ឋាគារ', nameEn: 'All Hotels & Stays', nameZh: '全部酒店与客栈' },
    { id: 'verified_big', nameKh: '✓ បានផ្ទៀងផ្ទាត់ (Verified)', nameEn: '✓ Verified Featured', nameZh: '✓ 官方认证推荐' },
    { id: 'luxury_resort', nameKh: 'សណ្ឋាគារប្រណីត & រីសត', nameEn: 'Luxury & Resorts', nameZh: '豪华酒店与度假村' },
    { id: 'boutique_villa', nameKh: 'ប៊ូទិក & វីឡា', nameEn: 'Boutique & Villas', nameZh: '精品酒店与别墅' },
    { id: 'guesthouse', nameKh: 'ផ្ទះសំណាក់ & បឹងហ្គាឡូ', nameEn: 'Guesthouses & Lodges', nameZh: '客栈与木屋' },
  ];

  // Filter by category first so the 25-Province Dropdown shows accurate counts for the active category
  const categoryMatchedHotels = useMemo(() => {
    return allHotels.filter((h) => {
      if (categoryFilter === 'verified_big') return isVerifiedBigHotel(h);
      if (categoryFilter !== 'all') return classifyHotelSubCategory(h) === categoryFilter;
      return true;
    });
  }, [allHotels, categoryFilter]);

  const provinceOptions = useMemo(() => {
    return DISH_PROVINCES.map((p) => {
      const cleanKey = p.kh.replace(/^រាជធានី|^ខេត្ត/g, '').trim();
      const count = categoryMatchedHotels.filter((h) =>
        (h.provinceKh || '').replace(/^រាជធានី|^ខេត្ត/g, '').includes(cleanKey)
      ).length;
      return {
        ...p,
        value: p.kh,
        count,
      };
    });
  }, [categoryMatchedHotels]);

  // Order: Verified Big Hotels first (shuffled in session), then Compact Icon-Row Hotels (shuffled in session)
  const orderedHotels = useMemo(() => {
    const verifiedBig = allHotels.filter((h) => isVerifiedBigHotel(h));
    const compactRows = allHotels.filter((h) => !isVerifiedBigHotel(h));
    return [
      ...shuffleForCurrentSession(verifiedBig),
      ...shuffleForCurrentSession(compactRows),
    ];
  }, [allHotels]);

  const filteredHotels = useMemo(() => {
    const cleanSelProv = (selectedProvince || '').replace(/^រាជធានី|^ខេត្ត/g, '').trim();
    const normQuery = normalizeKhmerSearchText(debouncedSearchQuery);
    const rawQueryLower = debouncedSearchQuery.trim().toLowerCase();

    return orderedHotels.filter((h) => {
      if (categoryFilter === 'verified_big' && !isVerifiedBigHotel(h)) return false;
      if (categoryFilter !== 'all' && categoryFilter !== 'verified_big' && classifyHotelSubCategory(h) !== categoryFilter) {
        return false;
      }
      if (cleanSelProv && !(h.provinceKh || '').replace(/^រាជធានី|^ខេត្ត/g, '').includes(cleanSelProv)) {
        return false;
      }
      if (normQuery || rawQueryLower) {
        const hayRaw = `${h.nameKh || ''} ${h.nameEn || ''} ${h.provinceKh || ''} ${h.provinceEn || ''} ${h.addressKh || ''} ${h.addressEn || ''} ${h.phone || ''}`.toLowerCase();
        const hayNorm = normalizeKhmerSearchText(hayRaw);
        if (!hayRaw.includes(rawQueryLower) && (!normQuery || !hayNorm.includes(normQuery))) {
          return false;
        }
      }
      return true;
    });
  }, [orderedHotels, categoryFilter, selectedProvince, debouncedSearchQuery]);

  const displayedHotels = useMemo(
    () => filteredHotels.slice(0, visibleCount),
    [filteredHotels, visibleCount]
  );

  useEffect(() => {
    const node = loadMoreTriggerRef.current;
    if (!node || visibleCount >= filteredHotels.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(filteredHotels.length, prev + HOTEL_BATCH_SIZE));
        }
      },
      { root: document.getElementById('kft-main-scroll'), rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, filteredHotels.length]);

  const handleAddHotelClick = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    // Enforce: VIP user can add 1 only. If added shop, cannot add hotel!
    if (!isAdmin && myExistingShop) {
      showToast(
        tr(
          language,
          `🔒 គណនី VIP អាចបង្កើតហាងអាហារ ឬសណ្ឋាគារបានតែ ១ ប៉ុណ្ណោះ! អ្នកបានបង្កើតហាងអាហារ «${myExistingShop.nameKh}» រួចហើយ ដូច្នេះមិនអាចបន្ថែមសណ្ឋាគារបានទៀតទេ។`,
          `🔒 VIP accounts can add 1 listing only (Shop OR Hotel). You already added Shop "${myExistingShop.nameEn || myExistingShop.nameKh}", so you cannot add a Hotel.`,
          `🔒 VIP 账号仅可添加 1 家（餐厅或酒店二选一）。您已添加餐厅“${myExistingShop.nameEn || myExistingShop.nameKh}”，无法再添加酒店。`
        ),
        'warning'
      );
      return;
    }
    if (!isAdmin && myExistingHotel && storeQuota.remainingAvailableSlots <= 0) {
      showToast(
        tr(
          language,
          `🔒 គណនី VIP អាចបង្កើតសណ្ឋាគារបានតែ ១ ប៉ុណ្ណោះ! អ្នកបានបង្កើតសណ្ឋាគារ «${myExistingHotel.nameKh}» រួចហើយ (អាចចុច «កែប្រែសណ្ឋាគារខ្ញុំ» ដើម្បីកែព័ត៌មាន)។`,
          `🔒 VIP accounts can add 1 listing only! You already added "${myExistingHotel.nameEn || myExistingHotel.nameKh}" (tap "Edit My Hotel" below).`,
          `🔒 VIP 账号仅可添加 1 家酒店！您已添加“${myExistingHotel.nameEn || myExistingHotel.nameKh}”（可点击下方编辑）。`
        ),
        'warning'
      );
      return;
    }
    (window as any).__kft_vip_store_initial_mode = { mode: 'create', businessType: 'hotel' };
    setIsVipAddRestaurantModalOpen(true);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-3 pb-6">
      {/* =====================================================================
          SECTION 1: SEARCH HOTELS & STAYS (ស្វែងរកសណ្ឋាគារ & ផ្ទះសំណាក់) — Shop-Menu Design
          ===================================================================== */}
      <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-amber-500/35 dark:border-slate-800 shadow-xs space-y-2.5 font-khmer">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 shrink-0">
              <BedDouble className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-moul text-xs sm:text-sm text-[#0F172A] dark:text-white truncate">
                {tr(language, '🏨 សណ្ឋាគារ & ផ្ទះសំណាក់ (Hotels & Stays)', '🏨 Hotels & Stays', '🏨 酒店与客栈')}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {tr(
                  language,
                  'ស្វែងរកសណ្ឋាគារ រីសត វីឡា និងផ្ទះសំណាក់ទូទាំង ២៥ ខេត្ត-ក្រុង',
                  'Search verified hotels, resorts & guesthouses across 25 provinces',
                  '搜索柬埔寨 25 省市认证酒店、度假村与客栈'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={hotelSearchQuery}
            onChange={(e) => setHotelSearchQuery(e.target.value)}
            placeholder={tr(
              language,
              'វាយឈ្មោះសណ្ឋាគារ ផ្ទះសំណាក់ លេខទូរស័ព្ទ ឬខេត្ត...',
              'Search hotel name, guesthouse, phone, or province...',
              '输入酒店、客栈名称、电话或省份...'
            )}
            className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder:text-slate-400 font-khmer focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          {hotelSearchQuery && (
            <button
              type="button"
              onClick={() => setHotelSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title={tr(language, 'សម្អាត', 'Clear', '清除')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Hotel Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {hotelCategories.map((cat) => {
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-[#064E3B] text-white shadow-xs ring-1 ring-emerald-400/50'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:bg-emerald-50/70'
                }`}
              >
                {tr(language, cat.nameKh, cat.nameEn, cat.nameZh)}
              </button>
            );
          })}
        </div>

        {/* 25 Provinces & Capital City Dropdown */}
        <div>
          <label className="block">
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {tr(
                  language,
                  'ជ្រើសរើសរាជធានី-ខេត្ត (២៥ ខេត្ត/ក្រុង)',
                  'Select Province / Capital (25 Provinces)',
                  '选择省份/直辖市（25 省市）'
                )}
              </span>
            </span>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="">
                {tr(
                  language,
                  `គ្រប់រាជធានី-ខេត្តទាំង ២៥ (${categoryMatchedHotels.length})`,
                  `All 25 Provinces & Capital (${categoryMatchedHotels.length})`,
                  `全部 25 个省市 (${categoryMatchedHotels.length})`
                )}
              </option>
              {provinceOptions.map((p) => (
                <option key={p.id} value={p.value}>
                  {tr(language, p.fullKh, p.en, p.zh)} ({p.count})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* =====================================================================
          SECTION 2: ADD NEW HOTEL (បន្ថែមសណ្ឋាគារថ្មី) — 1-Slot VIP Shared Rule
          ===================================================================== */}
      <div className="p-3.5 rounded-3xl bg-gradient-to-br from-[#022c22] via-[#064E3B] to-emerald-900 text-white shadow-md border border-emerald-500/40 space-y-2.5 font-khmer">
        <div className="flex items-start justify-between gap-2.5">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <BedDouble className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="font-moul text-xs sm:text-sm text-white">
                {tr(language, '➕ បន្ថែមសណ្ឋាគារ / ផ្ទះសំណាក់ថ្មី', '➕ Add New Hotel / Stay', '➕ 添加新酒店/客栈')}
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/90 leading-relaxed">
              {tr(
                language,
                'គណនី VIP អាចបង្កើតហាងអាហារ ឬសណ្ឋាគារបានតែ ១ កន្លែងប៉ុណ្ណោះ។ ប្រសិនបើបានបង្កើតហាងអាហាររួចហើយ មិនអាចបន្ថែមសណ្ឋាគារទៀតបានទេ។',
                'VIP users can register 1 business only (Shop OR Hotel). If you already added a Shop, you cannot add a Hotel.',
                'VIP 用户仅可添加 1 家（餐厅或酒店二选一）。如已添加餐厅，则无法再添加酒店。'
              )}
            </p>
          </div>
        </div>

        {/* If user already added a Shop, show clear lock notice */}
        {!isAdmin && myExistingShop ? (
          <div className="p-2.5 rounded-2xl bg-black/30 border border-amber-400/40 flex items-center gap-2.5 text-[11px] text-amber-200">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="leading-snug">
              {tr(
                language,
                `អ្នកបានប្រើសិទ្ធិ VIP បង្កើតហាងអាហារ «${myExistingShop.nameKh}» រួចហើយ (1/1) — មិនអាចបន្ថែមសណ្ឋាគារទៀតបានទេ។`,
                `You already used your 1 VIP slot for Shop "${myExistingShop.nameEn || myExistingShop.nameKh}" (1/1) — cannot add a Hotel.`,
                `您已使用 1 个 VIP 名额添加餐厅“${myExistingShop.nameEn || myExistingShop.nameKh}”(1/1)，无法再添加酒店。`
              )}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAddHotelClick}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[3] shrink-0" />
            <span>
              {tr(
                language,
                '+ បន្ថែមសណ្ឋាគារ / ផ្ទះសំណាក់ថ្មី (+ Add New Hotel)',
                '+ Add New Hotel / Guesthouse',
                '+ 添加新酒店 / 客栈'
              )}
            </span>
          </button>
        )}

        {/* Admin or Existing Hotel Owner Controls */}
        {isAdmin ? (
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => {
                (window as any).__kft_admin_tab = 'tourism';
                setIsAdminOpen(true);
              }}
              className="w-full py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">
                {tr(
                  language,
                  `គ្រប់គ្រងសណ្ឋាគារទាំងអស់ (${allHotels.length})`,
                  `Manage All Hotels (${allHotels.length})`,
                  `管理全部酒店 (${allHotels.length})`
                )}
              </span>
            </button>
          </div>
        ) : myExistingHotel ? (
          <div className="pt-1 border-t border-white/15 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-amber-200 truncate block">
                {tr(
                  language,
                  `សណ្ឋាគាររបស់ខ្ញុំ៖ ${myExistingHotel.nameKh}`,
                  `My Hotel: ${myExistingHotel.nameEn || myExistingHotel.nameKh}`,
                  `我的酒店：${myExistingHotel.nameEn || myExistingHotel.nameKh}`
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openManageMyVipStore(myExistingHotel.id)}
              className="py-1.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            >
              <Edit2 className="w-3 h-3 text-amber-300" />
              <span>{tr(language, 'កែប្រែសណ្ឋាគារខ្ញុំ', 'Edit My Hotel', '编辑我的酒店')}</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* =====================================================================
          SECTION 3: HOTELS LIST — Verified Big Cards at Top + Compact Shop-Style Rows Below
          ===================================================================== */}
      <div className="space-y-2.5">
        {displayedHotels.length > 0 ? (
          <>
            {displayedHotels.map((hotel) => {
              const showBigVerified = isVerifiedBigHotel(hotel);
              if (!showBigVerified) {
                return <TouristCard key={hotel.id} destination={hotel} />;
              }

              // Render Big Verified Showcase Card for Verified / Featured Hotels
              const loc = getLocalizedDestination(hotel, language);
              const bookmarked = isBookmarked(hotel.id);
              const hasPhoto = Boolean(hotel.photoUrl && hotel.photoUrl.trim());

              return (
                <div
                  key={hotel.id}
                  data-testid={`hotel-verified-big-${hotel.id}`}
                  onClick={() => setSelectedDestination(hotel)}
                  className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 border-2 border-amber-400/50 dark:border-amber-500/40 flex flex-col cursor-pointer"
                >
                  {/* Big Verified Header Banner (Custom Photo if uploaded, or Luxury Royal Gold/Emerald Showcase Banner) */}
                  <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-gradient-to-br from-[#064E3B] via-[#093228] to-slate-900">
                    {hasPhoto ? (
                      <img
                        src={hotel.photoUrl}
                        alt={loc.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 relative select-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-[#064E3B] to-slate-950">
                        <DefaultDestinationIcon
                          categorySlug="hotel"
                          className="w-16 h-16 rounded-2xl border-2 border-amber-400/50 shadow-lg mb-2"
                        />
                        <span className="text-[11px] font-bold text-amber-200/90 tracking-wide font-khmer">
                          {loc.category}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                    {/* Top-Left: Province + Verified Badge */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black shadow-xs flex items-center gap-1 font-khmer">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-900 shrink-0" />
                        <span>{tr(language, 'បានផ្ទៀងផ្ទាត់ (Verified)', 'Verified Stay', '官方认证')}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-[11px] font-semibold font-khmer">
                        {loc.province}
                      </span>
                    </div>

                    {/* Top-Right: Admin Edit + Bookmark */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            (window as any).__kft_open_dest_edit = true;
                            setSelectedDestination(hotel);
                          }}
                          className="p-2 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md transition active:scale-90 cursor-pointer"
                          title={tr(language, 'កែប្រែសណ្ឋាគារ', 'Edit Hotel', '编辑酒店')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(hotel.id);
                        }}
                        className={`p-2 rounded-full transition-transform active:scale-90 cursor-pointer ${
                          bookmarked
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-white/95 dark:bg-slate-900/95 text-slate-600 hover:text-rose-500'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {/* Bottom Overlay: Hotel Name & Category */}
                    <div className="absolute bottom-3 left-3.5 right-3.5 text-white font-khmer">
                      <h3 className="font-extrabold text-base sm:text-lg leading-snug drop-shadow line-clamp-1">
                        {loc.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-200 mt-0.5 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="truncate">{loc.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body: Description, Rating, Price & Quick Call/Map Buttons */}
                  <div className="p-3.5 space-y-2.5 font-khmer">
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {loc.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/70 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <Star className="w-4 h-4 fill-current text-amber-500" />
                        <span>{hotel.rating ?? 4.8}</span>
                        <span className="text-slate-400 text-[11px]">({hotel.reviewCount ?? 150})</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {hotel.priceRange && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-200/70 dark:border-amber-800/70">
                            💵 {hotel.priceRange}
                          </span>
                        )}
                        {hotel.phone && (
                          <a
                            href={`tel:${hotel.phone.replace(/\s+/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{hotel.phone}</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDestinationGoogleExternal(hotel, 'maps');
                          }}
                          className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] inline-flex items-center gap-1 border border-blue-200/70 dark:border-blue-800/70 cursor-pointer"
                        >
                          <MapPin className="w-3 h-3" />
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleCount < filteredHotels.length && (
              <div ref={loadMoreTriggerRef} className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => Math.min(filteredHotels.length, prev + HOTEL_BATCH_SIZE))}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#064E3B] dark:text-emerald-400 shadow-2xs font-khmer cursor-pointer"
                >
                  {tr(
                    language,
                    `បង្ហាញសណ្ឋាគារបន្ថែម (${displayedHotels.length} / ${filteredHotels.length})`,
                    `Show More Hotels (${displayedHotels.length} / ${filteredHotels.length})`,
                    `加载更多酒店 (${displayedHotels.length} / ${filteredHotels.length})`
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-2 font-khmer">
            <BedDouble className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs">
              {tr(language, 'រកមិនឃើញសណ្ឋាគារក្នុងផ្នែកនេះទេ', 'No hotels matched your filters', '未找到符合筛选条件的酒店')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

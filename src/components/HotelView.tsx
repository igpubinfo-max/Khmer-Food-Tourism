import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  TouristDestination,
  Restaurant,
  isAdminAccount,
  openDestinationGoogleExternal,
  openExternalUrlNativeSafe,
  inferBusinessTypeAndCategory,
  isHotelBusinessRecord,
} from '../types';
import { shuffleForCurrentSession } from '../utils/sessionShuffle';
import { BedDouble, Edit2, Settings, MapPin, Heart, Lock, Camera, Star, Trash2, Download } from 'lucide-react';
import { TouristImageModal } from './TouristImageModal';
import {
  ListingSearchPanel,
  ListingSearchInput,
  ListingPills,
  ListingAddPanel,
  ListingRow,
  ListingFeaturedCard,
  ListingThumb,
} from './listing/ListingUI';
import { rankBySearchRelevance, destinationSearchFields, analyzeSearchQuery } from '../utils/searchEngine';
import { parseSmartSearchIntent } from '../utils/aiSearchBridge';
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
    updateDestination,
    deleteDestination,
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
    () => myOwnedBusinesses.find((r) => !isHotelBusinessRecord(r)),
    [myOwnedBusinesses]
  );
  const myExistingHotel = useMemo(
    () => myOwnedBusinesses.find((r) => isHotelBusinessRecord(r)),
    [myOwnedBusinesses]
  );

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [hotelSearchQuery, setHotelSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(HOTEL_BATCH_SIZE);
  const [hotelForImageEdit, setHotelForImageEdit] = useState<TouristDestination | null>(null);
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

  // Convert any VIP-added Hotel records (from `restaurants` where `isHotelBusinessRecord(r)`) into TouristDestination format so they appear first as Verified Big Cards
  const vipAddedHotelDestinations = useMemo<TouristDestination[]>(() => {
    return restaurants
      .filter((r: Restaurant) => r && isHotelBusinessRecord(r) && (r.status === 'approved' || isAdmin || r.ownerId === currentUser?.id))
      .map((r: Restaurant) => {
        const catInfo = inferBusinessTypeAndCategory(r);
        return {
          id: r.id,
          nameKh: r.nameKh,
          nameEn: r.nameEn || r.nameKh,
          categorySlug: 'hotel' as const,
          categoryKh: r.categoryKh || catInfo.shortKh,
          categoryEn: r.categoryEn || catInfo.shortEn,
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
          entranceFeeKh: `តម្លៃបន្ទប់៖ ${r.priceLevel || '$'} • ${r.phone || ''}`,
          entranceFeeEn: `Room Rate: ${r.priceLevel || '$'} • ${r.phone || ''}`,
          bestTimeToVisitKh: r.openingHoursKh || 'បើកទទួលភ្ញៀវ ២៤ ម៉ោង',
          bestTimeToVisitEn: r.openingHoursEn || 'Open 24 Hours',
          mapUrl: r.mapUrl || `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`,
          latitude: r.latitude,
          longitude: r.longitude,
          googlePlaceId: r.googlePlaceId,
          rating: r.rating || 0,
          reviewCount: r.reviewCount || 0,
          highlightsKh: r.signatureDishesKh?.length
            ? r.signatureDishesKh
            : ['បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ Wi-Fi និងចំណតរថយន្តសុវត្ថិភាព'],
          isFeatured: true,
          isCustomPhoto: Boolean(r.profileImage || r.photoUrl),
          locationVerificationStatus: 'verified' as const,
        };
      });
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

  // Only hotels added by a VIP owner (or explicitly promoted by Admin) are showcased as large cards. All other hotels use the compact row layout.
  const vipHotelIds = useMemo(
    () => new Set(vipAddedHotelDestinations.map((d) => d.id)),
    [vipAddedHotelDestinations]
  );
  const isVerifiedBigHotel = (h: TouristDestination): boolean =>
    vipHotelIds.has(h.id) || Boolean(h.isAdminEdited && h.isFeatured);

  const hotelCategories = [
    { id: 'all', nameKh: 'គ្រប់ប្រភេទសណ្ឋាគារ', nameEn: 'All Hotels & Stays', nameZh: '全部酒店与客栈' },
    { id: 'verified_big', nameKh: 'សណ្ឋាគារ VIP', nameEn: 'VIP Hotels', nameZh: 'VIP 酒店' },
    { id: 'hotel_stay', nameKh: 'សណ្ឋាគារ & ភោជនីយដ្ឋាន', nameEn: 'Hotels & Dining', nameZh: '酒店与餐厅' },
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
    const trimmedQ = debouncedSearchQuery.trim();
    const smartIntent = trimmedQ ? parseSmartSearchIntent(trimmedQ) : null;
    const effectiveProvRaw = selectedProvince || smartIntent?.detectedProvinceKh || '';
    const cleanSelProv = effectiveProvRaw.replace(/^រាជធានី|^ខេត្ត/g, '').trim();

    const scoped = orderedHotels.filter((h) => {
      if (categoryFilter === 'verified_big' && !isVerifiedBigHotel(h)) return false;
      if (categoryFilter !== 'all' && categoryFilter !== 'verified_big' && classifyHotelSubCategory(h) !== categoryFilter) {
        return false;
      }
      if (categoryFilter === 'all' && smartIntent?.semanticCategory) {
        if (smartIntent.semanticCategory === 'resort' && classifyHotelSubCategory(h) !== 'luxury_resort') return false;
        if (smartIntent.semanticCategory === 'guesthouse' && classifyHotelSubCategory(h) !== 'guesthouse') return false;
      }
      if (cleanSelProv && !(h.provinceKh || '').replace(/^រាជធានី|^ខេត្ត/g, '').includes(cleanSelProv)) {
        return false;
      }
      return true;
    });

    if (!trimmedQ) return scoped;

    const qa = analyzeSearchQuery(trimmedQ);
    if (qa.distinctive.length === 0 && (smartIntent?.detectedProvinceKh || smartIntent?.semanticCategory)) {
      return scoped;
    }

    // Relevance-ranked search: exact name → prefix → all words → typo-tolerant match → category/address,
    // Khmer + English + Chinese names, with unrelated hotels removed. Ties: rating, then name (deterministic).
    return rankBySearchRelevance(
      scoped,
      trimmedQ,
      (h) => destinationSearchFields(h, [getLocalizedDestination(h, 'zh').name, classifyHotelSubCategory(h)]),
      {
        bucketSize: 100,
        tieBreak: (a, b) => (b.rating || 0) - (a.rating || 0) || (a.nameEn || a.nameKh || '').localeCompare(b.nameEn || b.nameKh || ''),
      }
    );
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
          `គណនី VIP អាចបង្កើតហាងអាហារ ឬសណ្ឋាគារបានតែ ១ ប៉ុណ្ណោះ! អ្នកបានបង្កើតហាងអាហារ «${myExistingShop.nameKh}» រួចហើយ ដូច្នេះមិនអាចបន្ថែមសណ្ឋាគារបានទៀតទេ។`,
          `VIP accounts can add 1 listing only (Shop OR Hotel). You already added Shop "${myExistingShop.nameEn || myExistingShop.nameKh}", so you cannot add a Hotel.`,
          `VIP 账号仅可添加 1 家（餐厅或酒店二选一）。您已添加餐厅“${myExistingShop.nameEn || myExistingShop.nameKh}”，无法再添加酒店。`
        ),
        'warning'
      );
      return;
    }
    if (!isAdmin && myExistingHotel && storeQuota.remainingAvailableSlots <= 0) {
      showToast(
        tr(
          language,
          `គណនី VIP អាចបង្កើតសណ្ឋាគារបានតែ ១ ប៉ុណ្ណោះ! អ្នកបានបង្កើតសណ្ឋាគារ «${myExistingHotel.nameKh}» រួចហើយ (អាចចុច «កែប្រែសណ្ឋាគារខ្ញុំ» ដើម្បីកែព័ត៌មាន)។`,
          `VIP accounts can add 1 listing only! You already added "${myExistingHotel.nameEn || myExistingHotel.nameKh}" (tap "Edit My Hotel" below).`,
          `VIP 账号仅可添加 1 家酒店！您已添加“${myExistingHotel.nameEn || myExistingHotel.nameKh}”（可点击下方编辑）。`
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
          SECTION 1: SEARCH HOTELS & STAYS
          ===================================================================== */}
      <ListingSearchPanel
        icon={BedDouble}
        title={tr(language, 'សណ្ឋាគារ & ផ្ទះសំណាក់ (Hotels & Stays)', 'Hotels & Stays', '酒店与客栈')}
        subtitle={tr(
          language,
          'ស្វែងរកសណ្ឋាគារ រីសត វីឡា និងផ្ទះសំណាក់ទូទាំង ២៥ ខេត្ត-ក្រុង',
          'Search hotels, resorts & guesthouses across 25 provinces',
          '搜索柬埔寨 25 省市酒店、度假村与客栈'
        )}
      >
        <ListingSearchInput
          value={hotelSearchQuery}
          onChange={setHotelSearchQuery}
          placeholder={tr(
            language,
            'វាយឈ្មោះសណ្ឋាគារ ផ្ទះសំណាក់ លេខទូរស័ព្ទ ឬខេត្ត...',
            'Search hotel name, guesthouse, phone, or province...',
            '输入酒店、客栈名称、电话或省份...'
          )}
          clearLabel={tr(language, 'សម្អាត', 'Clear', '清除')}
        />

        <ListingPills
          items={hotelCategories.map((cat) => ({
            id: cat.id,
            label: tr(language, cat.nameKh, cat.nameEn, cat.nameZh),
          }))}
          activeId={categoryFilter}
          onSelect={setCategoryFilter}
        />

        <label className="block">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={1.75} />
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
            className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
          >
            <option value="">
              {tr(
                language,
                'គ្រប់រាជធានី-ខេត្តទាំង ២៥',
                'All 25 Provinces & Capital',
                '全部 25 个省市'
              )}
            </option>
            {provinceOptions.map((p) => (
              <option key={p.id} value={p.value}>
                {tr(language, p.fullKh, p.en, p.zh)}
              </option>
            ))}
          </select>
        </label>
      </ListingSearchPanel>

      {/* =====================================================================
          SECTION 2: ADD NEW HOTEL (1 VIP slot shared with Shop; VIP hotels show as large cards)
          ===================================================================== */}
      <ListingAddPanel
        icon={BedDouble}
        title={tr(language, 'បន្ថែមសណ្ឋាគារ / ផ្ទះសំណាក់ថ្មី', 'Add New Hotel / Stay', '添加新酒店/客栈')}
        description={tr(
          language,
          'គណនី VIP អាចបង្កើតហាងអាហារ ឬសណ្ឋាគារបានតែ ១ កន្លែងប៉ុណ្ណោះ។ សណ្ឋាគារដែលបន្ថែមដោយ VIP នឹងបង្ហាញជាកាតធំ។',
          'A VIP account can register 1 business only (Shop OR Hotel). Hotels added by VIP are showcased as large cards.',
          'VIP 账号仅可添加 1 家（餐厅或酒店二选一）。VIP 添加的酒店将以大卡片展示。'
        )}
        actionLabel={tr(language, 'បន្ថែមសណ្ឋាគារ / ផ្ទះសំណាក់ថ្មី', 'Add New Hotel / Guesthouse', '添加新酒店 / 客栈')}
        onAction={handleAddHotelClick}
        lockedNotice={
          !isAdmin && myExistingShop ? (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-amber-400/40 flex items-center gap-2.5 text-[11px] text-amber-200">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.75} />
              <span className="leading-snug">
                {tr(
                  language,
                  `អ្នកបានប្រើសិទ្ធិ VIP បង្កើតហាងអាហារ «${myExistingShop.nameKh}» រួចហើយ (1/1) — មិនអាចបន្ថែមសណ្ឋាគារទៀតបានទេ។`,
                  `You already used your 1 VIP slot for Shop "${myExistingShop.nameEn || myExistingShop.nameKh}" (1/1) — cannot add a Hotel.`,
                  `您已使用 1 个 VIP 名额添加餐厅“${myExistingShop.nameEn || myExistingShop.nameKh}”(1/1)，无法再添加酒店。`
                )}
              </span>
            </div>
          ) : undefined
        }
      >
        {isAdmin ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                (window as any).__kft_admin_tab = 'hotels';
                setIsAdminOpen(true);
              }}
              className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-amber-300 shrink-0" strokeWidth={1.75} />
              <span className="truncate">
                {tr(
                  language,
                  'គ្រប់គ្រងសណ្ឋាគារទាំងអស់',
                  'Manage All Hotels',
                  '管理全部酒店'
                )}
              </span>
            </button>
            <a
              href="/templates/KhmerFoodTourism_Hotel_Photo_Insert_Template.xlsx"
              download="KhmerFoodTourism_Hotel_Photo_Insert_Template.xlsx"
              onClick={() =>
                showToast(
                  tr(
                    language,
                    'កំពុងទាញយកគំរូ Excel សម្រាប់ដាក់រូបភាពសណ្ឋាគារ...',
                    'Downloading Hotel Photo Excel Template...',
                    '正在下载酒店图片 Excel 模板...'
                  ),
                  'success'
                )
              }
              className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">
                {tr(
                  language,
                  'ទាញយកគំរូ Excel ដាក់រូបសណ្ឋាគារ (.xlsx)',
                  'Download Excel Photo Template (.xlsx)',
                  '下载酒店图片 Excel 模板 (.xlsx)'
                )}
              </span>
            </a>
          </div>
        ) : myExistingHotel ? (
          <div className="pt-2.5 border-t border-white/15 flex items-center justify-between gap-2">
            <span className="min-w-0 flex-1 text-[11px] font-bold text-amber-200 truncate">
              {tr(
                language,
                `សណ្ឋាគាររបស់ខ្ញុំ៖ ${myExistingHotel.nameKh}`,
                `My Hotel: ${myExistingHotel.nameEn || myExistingHotel.nameKh}`,
                `我的酒店：${myExistingHotel.nameEn || myExistingHotel.nameKh}`
              )}
            </span>
            <button
              type="button"
              onClick={() => openManageMyVipStore(myExistingHotel.id)}
              className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/25 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4 text-amber-300" strokeWidth={1.75} />
              <span>{tr(language, 'កែប្រែសណ្ឋាគារខ្ញុំ', 'Edit My Hotel', '编辑我的酒店')}</span>
            </button>
          </div>
        ) : null}
      </ListingAddPanel>

      {/* =====================================================================
          SECTION 3: HOTELS LIST — VIP hotels as large cards, everything else as compact rows
          ===================================================================== */}
      <div className="space-y-2">
        {displayedHotels.length > 0 ? (
          <>
            {displayedHotels.map((hotel) => {
              const loc = getLocalizedDestination(hotel, language);
              const isBig = isVerifiedBigHotel(hotel);
              const isVipRecord = vipHotelIds.has(hotel.id);

              const adminEditButton = isAdmin ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {!isVipRecord && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHotelForImageEdit(hotel);
                        }}
                        className="p-1.5 rounded-lg bg-[#064E3B] hover:bg-emerald-800 text-white transition-colors active:scale-95 cursor-pointer"
                        title={tr(language, 'ប្តូររូបភាពសណ្ឋាគារ', 'Upload / Change Hotel Photo', '更换酒店图片')}
                      >
                        <Camera className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextFeatured = !(hotel.isAdminEdited && hotel.isFeatured);
                          updateDestination({
                            ...hotel,
                            isFeatured: nextFeatured,
                            isAdminEdited: true,
                          });
                          showToast(
                            nextFeatured
                              ? tr(language, `បានដាក់ «${hotel.nameKh}» ជាកាតធំ (Featured)`, `Set "${hotel.nameEn}" as Large Card`, `已设为大卡片`)
                              : tr(language, `បានប្តូរ «${hotel.nameKh}» ជាជួរតូចធម្មតា`, `Set "${hotel.nameEn}" as Compact Row`, `已恢复为小行显示`),
                            'success'
                          );
                        }}
                        className={`p-1.5 rounded-lg transition-colors active:scale-95 cursor-pointer ${
                          hotel.isAdminEdited && hotel.isFeatured
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100'
                        }`}
                        title={tr(language, 'ប្តូរទំហំកាតធំ / ជួរតូច', 'Toggle Large Card / Compact Row', '切换大卡片/小行')}
                      >
                        <Star className={`w-4 h-4 ${hotel.isAdminEdited && hotel.isFeatured ? 'fill-current' : ''}`} strokeWidth={1.75} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isVipRecord) {
                        openManageMyVipStore(hotel.id);
                      } else {
                        (window as any).__kft_open_dest_edit = true;
                        setSelectedDestination(hotel);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors active:scale-95 cursor-pointer"
                    title={tr(language, 'កែប្រែព័ត៌មាន & ទីតាំង GPS', 'Edit Info & GPS', '编辑信息与定位')}
                  >
                    <Edit2 className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                  {!isVipRecord && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(tr(language, `តើអ្នកពិតជាចង់លុបសណ្ឋាគារ «${hotel.nameKh}» មែនទេ?`, `Delete hotel "${hotel.nameEn}"?`, `确定删除酒店“${hotel.nameEn}”吗？`))) {
                          deleteDestination(hotel.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors active:scale-95 cursor-pointer"
                      title={tr(language, 'លុបសណ្ឋាគារ', 'Delete Hotel', '删除酒店')}
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              ) : null;

              const hasOwnerOrAdminHotelPhoto =
                Boolean(hotel.photoUrl) &&
                !hotel.photoUrl.startsWith('/destinations/hotel-') &&
                !hotel.photoUrl.includes('places.googleapis.com') &&
                (isVipRecord || Boolean(hotel.isAdminEdited));
              const effectiveHotelPhotoUrl = hasOwnerOrAdminHotelPhoto ? hotel.photoUrl : '';

              if (isBig) {
                const bookmarked = isBookmarked(hotel.id);
                return (
                  <ListingFeaturedCard
                    key={hotel.id}
                    testId={`hotel-featured-${hotel.id}`}
                    language={language}
                    coverUrl={effectiveHotelPhotoUrl}
                    fallbackIcon={BedDouble}
                    title={loc.name}
                    province={loc.province}
                    address={loc.address}
                    description={loc.description}
                    rating={hotel.rating}
                    reviewCount={hotel.reviewCount}
                    priceText={hotel.priceRange}
                    phone={hotel.phone}
                    badgeLabel={tr(language, 'សណ្ឋាគារ VIP', 'VIP Hotel', 'VIP 酒店')}
                    onOpen={() => setSelectedDestination(hotel)}
                    onOpenMap={() => openDestinationGoogleExternal(hotel, 'maps')}
                    topRightActions={
                      <>
                        {adminEditButton}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(hotel.id);
                          }}
                          className={`p-1.5 rounded-lg transition-colors active:scale-95 cursor-pointer ${
                            bookmarked
                              ? 'bg-rose-500 text-white'
                              : 'bg-white/95 dark:bg-slate-900/95 text-slate-600 hover:text-rose-500'
                          }`}
                          title={tr(language, 'រក្សាទុក', 'Save', '收藏')}
                        >
                          <Heart className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} strokeWidth={1.75} />
                        </button>
                      </>
                    }
                  />
                );
              }

              return (
                <ListingRow
                  key={hotel.id}
                  testId={`hotel-row-${hotel.id}`}
                  thumb={<ListingThumb src={effectiveHotelPhotoUrl} alt={loc.name} icon={BedDouble} />}
                  title={loc.name}
                  province={loc.province}
                  chips={hotel.priceRange ? [{ text: hotel.priceRange, tone: 'amber' }] : undefined}
                  onClick={() => setSelectedDestination(hotel)}
                  actionTitle={tr(language, 'មើលព័ត៌មានលម្អិត', 'View details', '查看详情')}
                  trailingActions={
                    adminEditButton ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {adminEditButton}
                      </div>
                    ) : null
                  }
                />
              );
            })}

            {visibleCount < filteredHotels.length && (
              <div ref={loadMoreTriggerRef} className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => Math.min(filteredHotels.length, prev + HOTEL_BATCH_SIZE))}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-emerald-900 dark:text-emerald-400 font-khmer cursor-pointer"
                >
                  {tr(
                    language,
                    'បង្ហាញសណ្ឋាគារបន្ថែម',
                    'Show More Hotels',
                    '加载更多酒店'
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-2 font-khmer">
            <BedDouble className="w-10 h-10 mx-auto text-slate-300" strokeWidth={1.75} />
            <p className="text-xs">
              {debouncedSearchQuery.trim()
                ? tr(
                    language,
                    `រកមិនឃើញសណ្ឋាគារដែលត្រូវនឹង «${debouncedSearchQuery.trim()}» ក្នុងកម្មវិធីទេ`,
                    `No hotels in the app match "${debouncedSearchQuery.trim()}"`,
                    `应用内未找到与“${debouncedSearchQuery.trim()}”匹配的酒店`
                  )
                : tr(language, 'រកមិនឃើញសណ្ឋាគារក្នុងផ្នែកនេះទេ', 'No hotels matched your filters', '未找到符合筛选条件的酒店')}
            </p>
            {debouncedSearchQuery.trim() && (
              <button
                type="button"
                onClick={() =>
                  openExternalUrlNativeSafe(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${debouncedSearchQuery.trim()} Cambodia`)}`
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-emerald-900 dark:text-emerald-400 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                {tr(language, 'ស្វែងរកនៅលើ Google Maps', 'Search on Google Maps', '在 Google 地图中搜索')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Direct Hotel Photo Upload Modal for Admin */}
      <TouristImageModal
        destination={hotelForImageEdit}
        isOpen={Boolean(hotelForImageEdit)}
        onClose={() => setHotelForImageEdit(null)}
        onSave={(updatedHotel) => {
          updateDestination({
            ...updatedHotel,
            isAdminEdited: true,
          });
          setHotelForImageEdit(null);
          showToast(
            tr(
              language,
              `បានរក្សាទុករូបភាពសណ្ឋាគារ «${updatedHotel.nameKh}» ជោគជ័យ!`,
              `Saved hotel photo for "${updatedHotel.nameEn}"!`,
              `已保存酒店“${updatedHotel.nameEn}”的图片！`
            ),
            'success'
          );
        }}
        isKm={language === 'km'}
      />
    </div>
  );
};

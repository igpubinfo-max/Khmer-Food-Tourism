import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, MapPin, Star, ExternalLink, X, CheckCircle, AlertTriangle,
  Globe, RefreshCw, PlusCircle, Edit3, Check, ChevronLeft, ChevronRight,
  Navigation, ShieldCheck, Database, Sparkles, SlidersHorizontal, Phone, Image as ImageIcon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tr, translateProvinceName } from '../utils/i18n';
import { translateDynamicTextToZh } from '../utils/zhDynamicTranslator';
import {
  GooglePlaceCachedItem,
  GooglePlaceSearchCategory,
  searchGoogleMapsPlacesAdvanced,
  getSmartCacheStats,
  setGoogleMapsDailyLimit,
  findDuplicateRestaurantForGooglePlace,
  findDuplicateDestinationForGooglePlace,
  convertGooglePlaceToRestaurant,
  convertGooglePlaceToDestination,
} from '../services/googlePlacesService';

const CAMBODIA_PROVINCES = [
  'ទាំងអស់',
  'រាជធានីភ្នំពេញ',
  'សៀមរាប',
  'កំពត',
  'កែប',
  'ព្រះសីហនុ',
  'បាត់ដំបង',
  'កំពង់ចាម',
  'មណ្ឌលគិរី',
  'រតនគិរី',
  'កោះកុង',
  'កណ្តាល',
  'កំពង់ឆ្នាំង',
  'កំពង់ស្ពឺ',
  'កំពង់ធំ',
  'ក្រចេះ',
  'តាកែវ',
  'ព្រៃវែង',
  'ស្វាយរៀង',
  'ពោធិ៍សាត់',
  'បន្ទាយមានជ័យ',
  'ប៉ៃលិន',
  'ឧត្តរមានជ័យ',
  'ព្រះវិហារ',
  'ស្ទឹងត្រែង',
  'ត្បូងឃ្មុំ',
];

const SEARCH_CATEGORIES: { id: GooglePlaceSearchCategory; labelKh: string; labelEn: string; labelZh: string; emoji: string; group: 'all' | 'food' | 'tourism' }[] = [
  { id: 'all', labelKh: 'ទាំងអស់ (All Places)', labelEn: 'All Places', labelZh: '全部地点', emoji: '🌏', group: 'all' },
  { id: 'restaurant', labelKh: 'ភោជនីយដ្ឋាន & អាហារដ្ឋាន', labelEn: 'Restaurants', labelZh: '餐厅与美食店', emoji: '🍽️', group: 'food' },
  { id: 'cafe', labelKh: 'ហាងកាហ្វេ & ភេសជ្ជៈ', labelEn: 'Cafés & Coffee', labelZh: '咖啡厅与饮品', emoji: '☕', group: 'food' },
  { id: 'street_food', labelKh: 'អាហារតាមផ្លូវ & ផ្សាររាត្រី', labelEn: 'Street Food & Night Markets', labelZh: '街头小吃与夜市', emoji: '🍜', group: 'food' },
  { id: 'seafood', labelKh: 'អាហារគ្រឿងសមុទ្រ', labelEn: 'Seafood', labelZh: '海鲜餐厅', emoji: '🦀', group: 'food' },
  { id: 'bakery', labelKh: 'ហាងនំប៉័ង & បង្អែម', labelEn: 'Bakery & Desserts', labelZh: '烘焙与甜品店', emoji: '🥐', group: 'food' },
  { id: 'tourism', labelKh: 'តំបន់ទេសចរណ៍ទូទៅ', labelEn: 'Tourist Attractions', labelZh: '热门旅游景点', emoji: '🏛️', group: 'tourism' },
  { id: 'temple', labelKh: 'ប្រាសាទបុរាណ & វត្តអារាម', labelEn: 'Ancient Temples & Pagodas', labelZh: '古迹寺庙与佛塔', emoji: '🛕', group: 'tourism' },
  { id: 'nature', labelKh: 'ធម្មជាតិ & ទឹកធ្លាក់', labelEn: 'Nature & Waterfalls', labelZh: '自然生态与瀑布', emoji: '🌿', group: 'tourism' },
  { id: 'beach', labelKh: 'ឆ្នេរសមុទ្រ & កោះ', labelEn: 'Beaches & Islands', labelZh: '海滩与海岛', emoji: '🏖️', group: 'tourism' },
  { id: 'mountain', labelKh: 'ភ្នំ & ទេសភាព', labelEn: 'Mountains & Viewpoints', labelZh: '高山与观景台', emoji: '⛰️', group: 'tourism' },
  { id: 'resort', labelKh: 'រមណីយដ្ឋាន & អេកូទេសចរណ៍', labelEn: 'Resorts & Eco-Tourism', labelZh: '度假村与生态旅游', emoji: '🏕️', group: 'tourism' },
];

const QUICK_SEARCH_PRESETS: { query: string; category: GooglePlaceSearchCategory; province: string; labelKh: string; labelEn: string; labelZh: string }[] = [
  { query: 'ជំនោរក្បាលកោះ', category: 'restaurant', province: 'ទាំងអស់', labelKh: '🍽️ ជំនោរក្បាលកោះ (Chumnor Kbal Koh)', labelEn: '🍽️ Chumnor Kbal Koh', labelZh: '🍽️ 岛头微风餐厅 (Chumnor Kbal Koh)' },
  { query: 'ភោជនីយដ្ឋានម្ហូបខ្មែរល្បីៗ', category: 'restaurant', province: 'រាជធានីភ្នំពេញ', labelKh: '🍽️ ហាងម្ហូបខ្មែរភ្នំពេញ', labelEn: '🍽️ Phnom Penh Khmer Restaurants', labelZh: '🍽️ 金边知名高棉餐厅' },
  { query: 'ប្រាសាទបុរាណ និងរមណីយដ្ឋាន', category: 'temple', province: 'សៀមរាប', labelKh: '🛕 ប្រាសាទសៀមរាប', labelEn: '🛕 Siem Reap Temples', labelZh: '🛕 暹粒古迹寺庙' },
  { query: 'អាហារគ្រឿងសមុទ្រ និងឆ្នេរ', category: 'seafood', province: 'កែប', labelKh: '🦀 គ្រឿងសមុទ្រកែប', labelEn: '🦀 Kep Seafood', labelZh: '🦀 白马海鲜餐厅' },
  { query: 'ហាងកាហ្វេ និងរមណីយដ្ឋានមាត់ព្រែក', category: 'cafe', province: 'កំពត', labelKh: '☕ កាហ្វេ & រមណីយដ្ឋានកំពត', labelEn: '☕ Kampot Riverside Cafés', labelZh: '☕ 贡布河畔咖啡与度假村' },
  { query: 'ឆ្នេរសមុទ្រ និងកោះស្អាតៗ', category: 'beach', province: 'ព្រះសីហនុ', labelKh: '🏖️ ឆ្នេរ & កោះព្រះសីហនុ', labelEn: '🏖️ Sihanoukville Beaches & Islands', labelZh: '🏖️ 西哈努克海滩与海岛' },
  { query: 'ទឹកធ្លាក់ និងធម្មជាតិ', category: 'nature', province: 'មណ្ឌលគិរី', labelKh: '🌿 ទឹកធ្លាក់មណ្ឌលគិរី', labelEn: '🌿 Mondulkiri Waterfalls', labelZh: '🌿 蒙多基里瀑布与自然' },
];

const ITEMS_PER_PAGE = 6;

export const GoogleMapsPlaceSearchModal: React.FC = () => {
  const {
    language,
    currentUser,
    restaurants,
    destinations,
    selectedProvince,
    isGoogleMapsSearchModalOpen,
    setIsGoogleMapsSearchModalOpen,
    googleMapsSearchInitialTab,
    importGooglePlaceToApp,
    setSelectedRestaurant,
    setSelectedDestination,
    showToast,
  } = useApp();

  const isAdmin = Boolean(
    currentUser &&
    (currentUser.role === 'admin' ||
      currentUser.id === 'admin-authorized-single' ||
      currentUser.username === 'admin' ||
      currentUser.username === 'cheasavuth')
  );

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GooglePlaceSearchCategory>('all');
  const [province, setProvince] = useState<string>('ទាំងអស់');
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [results, setResults] = useState<GooglePlaceCachedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [fromCache, setFromCache] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);

  // Admin Batch Selection & Review/Edit State
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    nameKh: string;
    nameEn: string;
    category: 'restaurant' | 'tourism';
    provinceKh: string;
    addressKh: string;
    phone: string;
    photoUrl: string;
  }>({
    nameKh: '',
    nameEn: '',
    category: 'restaurant',
    provinceKh: 'រាជធានីភ្នំពេញ',
    addressKh: '',
    phone: '',
    photoUrl: '',
  });

  // Admin API Daily Quota Config
  const [showQuotaConfig, setShowQuotaConfig] = useState(false);
  const [quotaStats, setQuotaStats] = useState(() => getSmartCacheStats());
  const [customDailyLimit, setCustomDailyLimit] = useState(() => String(getSmartCacheStats().dailyApiLimit));

  const refreshQuotaStats = () => {
    const s = getSmartCacheStats();
    setQuotaStats(s);
    setCustomDailyLimit(String(s.dailyApiLimit));
  };

  useEffect(() => {
    if (isGoogleMapsSearchModalOpen) {
      refreshQuotaStats();
      if (googleMapsSearchInitialTab === 'restaurant') {
        setCategory('restaurant');
      } else if (googleMapsSearchInitialTab === 'tourism') {
        setCategory('tourism');
      } else {
        setCategory('all');
      }
      if (selectedProvince && selectedProvince !== 'ទាំងអស់') {
        setProvince(selectedProvince);
      }
    }
  }, [isGoogleMapsSearchModalOpen, googleMapsSearchInitialTab, selectedProvince]);

  const executeSearch = async (overrideParams?: {
    q?: string;
    cat?: GooglePlaceSearchCategory;
    prov?: string;
    loc?: { lat: number; lng: number } | null;
    pageToken?: string;
    append?: boolean;
  }) => {
    const activeQuery = overrideParams?.q !== undefined ? overrideParams.q : query;
    const activeCat = overrideParams?.cat !== undefined ? overrideParams.cat : category;
    const activeProv = overrideParams?.prov !== undefined ? overrideParams.prov : province;
    const activeLoc = overrideParams?.loc !== undefined ? overrideParams.loc : gpsLocation;
    const token = overrideParams?.pageToken;
    const isAppend = Boolean(overrideParams?.append);

    if (isAppend) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setErrorMsg(undefined);
    }

    try {
      const response = await searchGoogleMapsPlacesAdvanced({
        query: activeQuery,
        category: activeCat,
        categoryFilter: activeCat,
        province: activeProv,
        provinceFilter: activeProv,
        location: activeLoc ? { lat: activeLoc.lat, lng: activeLoc.lng, radiusMeters: 15000 } : undefined,
        lat: activeLoc?.lat,
        lng: activeLoc?.lng,
        radiusMeters: 15000,
        pageToken: token,
        pageSize: 12,
        language,
      });

      const foundPlaces = response.places || response.results || [];

      if (isAppend) {
        setResults(prev => {
          const existingIds = new Set(prev.map(p => p.placeId));
          const uniqueNew = foundPlaces.filter(p => !existingIds.has(p.placeId));
          return [...prev, ...uniqueNew];
        });
      } else {
        setResults(foundPlaces);
        setCurrentPage(1);
        setSelectedPlaceIds(new Set());
      }

      setNextPageToken(response.nextPageToken);
      setFromCache(Boolean(response.fromCache ?? response.fromSmartCache));
      const errText =
        language === 'km'
          ? response.errorMessageKh || response.errorMessage
          : language === 'zh'
          ? response.errorMessageZh || response.errorMessageEn || response.errorMessage
          : response.errorMessageEn || response.errorMessage;
      if (errText) {
        setErrorMsg(errText);
      }
      refreshQuotaStats();
    } catch (err: any) {
      setErrorMsg(err?.message || 'មានបញ្ហាក្នុងការភ្ជាប់ទៅកាន់ Google Maps API');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleUseMyGpsLocation = () => {
    if (!navigator.geolocation) {
      showToast(
        language === 'km'
          ? 'ឧបករណ៍របស់អ្នកមិនគាំទ្រការចាប់ទីតាំង GPS ទេ'
          : 'Geolocation is not supported on this device',
        'warning'
      );
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsLocation(coords);
        setGpsLoading(false);
        showToast(
          language === 'km'
            ? `📍 បានចាប់ទីតាំង GPS របស់អ្នក (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
            : `📍 GPS Location locked (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
          'success'
        );
        executeSearch({ loc: coords });
      },
      () => {
        setGpsLoading(false);
        showToast(
          language === 'km'
            ? '⚠️ មិនអាចចាប់ទីតាំង GPS បានទេ។ សូមអនុញ្ញាតសិទ្ធិ Location លើឧបករណ៍របស់អ្នក។'
            : '⚠️ Unable to get GPS location. Please enable Location permission.',
          'warning'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Check duplicate status for each result
  const duplicateMap = useMemo(() => {
    const map = new Map<string, { isDuplicate: boolean; existingNameKh?: string; existingId?: string; type: 'restaurant' | 'tourism' }>();
    for (const item of results) {
      if (item.category === 'tourism') {
        const dupDest = findDuplicateDestinationForGooglePlace(item, destinations);
        if (dupDest) {
          map.set(item.placeId, {
            isDuplicate: true,
            existingNameKh: dupDest.nameKh,
            existingId: dupDest.id,
            type: 'tourism',
          });
          continue;
        }
      }
      const dupRest = findDuplicateRestaurantForGooglePlace(item, restaurants);
      if (dupRest) {
        map.set(item.placeId, {
          isDuplicate: true,
          existingNameKh: dupRest.nameKh,
          existingId: dupRest.id,
          type: 'restaurant',
        });
      } else {
        map.set(item.placeId, {
          isDuplicate: false,
          type: item.category,
        });
      }
    }
    return map;
  }, [results, restaurants, destinations]);

  const totalPages = Math.max(1, Math.ceil(results.length / ITEMS_PER_PAGE));
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return results.slice(start, start + ITEMS_PER_PAGE);
  }, [results, currentPage]);

  const toggleSelectPlace = (placeId: string) => {
    setSelectedPlaceIds(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  };

  const handleSelectAllOnPage = () => {
    const pageIds = paginatedResults.map(p => p.placeId);
    const allSelected = pageIds.every(id => selectedPlaceIds.has(id));
    setSelectedPlaceIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleBatchImportSelected = () => {
    if (selectedPlaceIds.size === 0) return;
    let importedCount = 0;
    let duplicateCount = 0;
    for (const item of results) {
      if (!selectedPlaceIds.has(item.placeId)) continue;
      const res = importGooglePlaceToApp(item);
      if (res.imported) importedCount++;
      else if (res.duplicate) duplicateCount++;
    }
    setSelectedPlaceIds(new Set());
    showToast(
      language === 'km'
        ? `📥 បាននាំចូលទីតាំងថ្មីចំនួន ${importedCount} ${duplicateCount > 0 ? `(រំលងទីតាំងស្ទួន ${duplicateCount})` : ''} ដោយជោគជ័យ!`
        : `📥 Imported ${importedCount} new places ${duplicateCount > 0 ? `(${duplicateCount} duplicates synced)` : ''}!`,
      'success'
    );
  };

  const startEditingBeforeImport = (place: GooglePlaceCachedItem) => {
    setEditingPlaceId(place.placeId);
    setEditDraft({
      nameKh: place.nameKh,
      nameEn: place.nameEn,
      category: place.category,
      provinceKh: place.provinceKh || 'រាជធានីភ្នំពេញ',
      addressKh: place.addressKh,
      phone: place.phone || '',
      photoUrl: place.hasRealGooglePhoto ? place.photoUrl : '',
    });
  };

  const handleSaveEditedImport = (place: GooglePlaceCachedItem) => {
    importGooglePlaceToApp(place, {
      nameKh: editDraft.nameKh,
      nameEn: editDraft.nameEn,
      category: editDraft.category,
      provinceKh: editDraft.provinceKh,
      addressKh: editDraft.addressKh,
      phone: editDraft.phone,
      photoUrl: editDraft.photoUrl || undefined,
    });
    setEditingPlaceId(null);
  };

  const handleOpenPlacePreview = (place: GooglePlaceCachedItem) => {
    const dupInfo = duplicateMap.get(place.placeId);
    if (dupInfo?.isDuplicate && dupInfo.existingId) {
      if (dupInfo.type === 'tourism') {
        const existing = destinations.find(d => d.id === dupInfo.existingId);
        if (existing) {
          setSelectedDestination(existing);
          return;
        }
      } else {
        const existing = restaurants.find(r => r.id === dupInfo.existingId);
        if (existing) {
          setSelectedRestaurant(existing);
          return;
        }
      }
    }

    if (place.category === 'tourism') {
      setSelectedDestination(convertGooglePlaceToDestination(place));
    } else {
      setSelectedRestaurant(convertGooglePlaceToRestaurant(place));
    }
  };

  const handleSaveDailyLimit = () => {
    const parsed = parseInt(customDailyLimit, 10);
    if (isNaN(parsed) || parsed < 10) {
      showToast('សូមបញ្ចូលចំនួនកំណត់យ៉ាងតិច 10 ដងក្នុងមួយថ្ងៃ', 'warning');
      return;
    }
    setGoogleMapsDailyLimit(parsed);
    refreshQuotaStats();
    setShowQuotaConfig(false);
    showToast(`✅ បានកំណត់កូតា Google Maps API ប្រចាំថ្ងៃត្រឹម ${parsed} ដង/ថ្ងៃ`, 'success');
  };

  if (!isGoogleMapsSearchModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden shadow-2xl border border-emerald-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shrink-0 shadow-inner">
              <Globe className="w-6 h-6 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                  {tr(
                    language,
                    '🗺️ ស្វែងរកហាង & តំបន់ទេសចរណ៍លើ Google Maps',
                    '🗺️ Google Maps Search — Shops & Tourist Attractions',
                    '🗺️ 谷歌地图搜索 — 店铺与旅游景点'
                  )}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  <Sparkles className="w-3 h-3" /> Places API (New)
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 truncate mt-0.5">
                {tr(
                  language,
                  'ស្វែងរកតាមឈ្មោះ ប្រភេទ ខេត្ត/ក្រុង ឬ GPS ជិតអ្នក • ការពារទិន្នន័យស្ទួនដោយស្វ័យប្រវត្តិ',
                  'Search by place name, category, province, or GPS location • Automatic duplicate protection',
                  '按地点名称、类别、省份或 GPS 附近位置搜索 • 自动防重保护'
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsGoogleMapsSearchModalOpen(false)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
            title={tr(language, 'បិទ', 'Close', '关闭')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <form
            onSubmit={e => {
              e.preventDefault();
              executeSearch();
            }}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2.5"
          >
            {/* Keyword Input */}
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={tr(
                  language,
                  'វាយឈ្មោះហាង ភោជនីយដ្ឋាន ឬតំបន់ទេសចរណ៍...',
                  'Search shop, restaurant, or tourist attraction...',
                  '输入店铺、餐厅或旅游景点名称（支持中文/高棉语/英文）...'
                )}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Selector */}
            <div className="sm:col-span-3">
              <select
                value={category}
                onChange={e => {
                  const nextCat = e.target.value as GooglePlaceSearchCategory;
                  setCategory(nextCat);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {SEARCH_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {tr(language, c.labelKh, c.labelEn, c.labelZh)}
                  </option>
                ))}
              </select>
            </div>

            {/* Province Selector */}
            <div className="sm:col-span-2">
              <select
                value={province}
                onChange={e => setProvince(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CAMBODIA_PROVINCES.map(prov => (
                  <option key={prov} value={prov}>
                    📍{' '}
                    {prov === 'ទាំងអស់'
                      ? tr(language, 'គ្រប់ខេត្ត/ក្រុង', 'All Provinces', '全部省份/城市')
                      : translateProvinceName(prov, prov, language)}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Submit Button */}
            <div className="sm:col-span-2 flex gap-1.5">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm py-2.5 px-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>{tr(language, 'ស្វែងរក', 'Search', '搜索')}</span>
              </button>

              <button
                type="button"
                onClick={handleUseMyGpsLocation}
                disabled={gpsLoading || isLoading}
                title={tr(language, 'ស្វែងរកទីតាំងជិតខ្ញុំ (GPS)', 'Search Near Me (GPS)', '搜索我附近的位置 (GPS)')}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  gpsLocation
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                <Navigation className={`w-4 h-4 ${gpsLoading ? 'animate-ping' : ''}`} />
              </button>
            </div>
          </form>

          {/* Quick Search Presets & GPS Status */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 mr-1">
                {tr(language, 'ស្វែងរករហ័ស៖', 'Quick Search:', '快捷搜索：')}
              </span>
              {QUICK_SEARCH_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(preset.query);
                    setCategory(preset.category);
                    setProvince(preset.province);
                    executeSearch({
                      q: preset.query,
                      cat: preset.category,
                      prov: preset.province,
                    });
                  }}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700 transition-colors cursor-pointer"
                >
                  {tr(language, preset.labelKh, preset.labelEn, preset.labelZh)}
                </button>
              ))}
            </div>

            {gpsLocation && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">
                <Navigation className="w-3 h-3" />
                <span>GPS: {Number(gpsLocation.lat ?? 11.5564).toFixed(3)}, {Number(gpsLocation.lng ?? 104.9282).toFixed(3)} (15km)</span>
                <button
                  type="button"
                  onClick={() => setGpsLocation(null)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* API Usage & Quota Control Bar */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Powered by Google Maps
              </span>
              <span>
                📡 {tr(language, 'ចំនួនហៅ API ថ្ងៃនេះ៖', 'API Calls Today:', '今日 API 调用：')}{' '}
                <strong className={quotaStats.dailyApiCallsCount >= quotaStats.dailyApiLimit ? 'text-red-600' : 'text-slate-900'}>
                  {quotaStats.dailyApiCallsCount} / {quotaStats.dailyApiLimit}
                </strong>
              </span>
              <span>
                ⚡ {tr(language, 'ឃ្លាំងសម្ងាត់ឆ្លាតវៃ (៣០ ថ្ងៃ)៖', 'Smart Cache (30-Day TTL):', '智能缓存（30天）：')}{' '}
                <strong className="text-emerald-700">
                  {tr(
                    language,
                    `${quotaStats.totalCachedPlaces} ទីតាំង (សន្សំបាន ${quotaStats.cacheHitsSavedQuota} ដង $0)`,
                    `${quotaStats.totalCachedPlaces} places (${quotaStats.cacheHitsSavedQuota} hits saved $0)`,
                    `${quotaStats.totalCachedPlaces} 个地点（已节省 ${quotaStats.cacheHitsSavedQuota} 次调用 $0）`
                  )}
                </strong>
              </span>
              {fromCache && results.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  {tr(language, '⚡ ទាញពីឃ្លាំងសម្ងាត់ (0 API Cost)', '⚡ Loaded from Smart Cache ($0)', '⚡ 来自智能缓存（0 API 费用）')}
                </span>
              )}
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuotaConfig(prev => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  {tr(language, 'កំណត់កូតា API', 'API Limit', 'API 配额设置')}
                </button>
              </div>
            )}
          </div>

          {/* Admin Daily Quota Config Drawer */}
          {isAdmin && showQuotaConfig && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-amber-900">
                <strong>🛡️ ការគ្រប់គ្រងចំណាយ Google Maps API (Cost Control):</strong> កំណត់ចំនួនហៅ API អតិបរមាក្នុង ១ ថ្ងៃ។ ការស្វែងរកដដែលៗត្រូវបានរក្សាទុកក្នុង Smart Cache រយៈពេល ៣០ ថ្ងៃដោយមិនគិតថ្លៃ។
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={customDailyLimit}
                  onChange={e => setCustomDailyLimit(e.target.value)}
                  className="w-24 px-2.5 py-1 rounded-lg border border-amber-300 bg-white text-xs font-bold text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleSaveDailyLimit}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                >
                  រក្សាទុក
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Batch Import Toolbar */}
        {isAdmin && results.length > 0 && (
          <div className="px-4 sm:px-6 py-2.5 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-indigo-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paginatedResults.length > 0 && paginatedResults.every(p => selectedPlaceIds.has(p.placeId))}
                  onChange={handleSelectAllOnPage}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  {language === 'km'
                    ? `ជ្រើសរើសទាំងអស់ក្នុងទំព័រនេះ (${selectedPlaceIds.size} បានជ្រើសរើស)`
                    : `Select all on page (${selectedPlaceIds.size} selected)`}
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              {selectedPlaceIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleBatchImportSelected}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>
                    {tr(
                      language,
                      `📥 នាំចូលទីតាំងដែលបានជ្រើស (${selectedPlaceIds.size}) ចូលកម្មវិធី`,
                      `📥 Import Selected (${selectedPlaceIds.size}) to App`,
                      `📥 将所选地点 (${selectedPlaceIds.size}) 导入应用`
                    )}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Content / Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-100/70">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm space-y-1">
                <p className="font-bold">
                  {tr(language, 'សារជូនដំណឹងពីប្រព័ន្ធ Google Maps API', 'Google Maps API System Notice', 'Google Maps API 系统提示')}
                </p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                {tr(
                  language,
                  'កំពុងស្វែងរកទិន្នន័យពិតពី Google Maps Platform...',
                  'Searching real places on Google Maps Platform...',
                  '正在通过 Google Maps 平台搜索真实地点数据...'
                )}
              </p>
              <p className="text-xs text-slate-500">
                {tr(
                  language,
                  'ផ្ទៀងផ្ទាត់ឈ្មោះ អាសយដ្ឋាន កូអរដោនេ រូបភាពផ្លូវការ និងការពារទិន្នន័យស្ទួន',
                  'Verifying names, coordinates, official photos, and checking for duplicates',
                  '正在核验地点名称、地址、GPS 坐标、官方照片并检查重复项'
                )}
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 px-4 text-center max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <MapPin className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-800">
                  {query.trim()
                    ? tr(
                        language,
                        `រកមិនឃើញទីតាំង "${query}" ក្នុងឃ្លាំងទិន្នន័យកម្មវិធីទេ`,
                        `No cached results found for "${query}"`,
                        `未在应用数据库中找到“${query}”`
                      )
                    : tr(
                        language,
                        'ស្វែងរកហាង ភោជនីយដ្ឋាន និងតំបន់ទេសចរណ៍ពិតៗនៅកម្ពុជា',
                        'Search Real Shops, Restaurants & Tourist Attractions in Cambodia',
                        '搜索柬埔寨真实餐厅、店铺与旅游景点'
                      )}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {tr(
                    language,
                    'វាយបញ្ចូលឈ្មោះទីតាំងជាភាសាខ្មែរ អង់គ្លេស ឬចិន រួចចុច «ស្វែងរក» ឬចុចប៊ូតុងខាងក្រោមដើម្បីបើកស្វែងរកទីតាំងនេះផ្ទាល់នៅលើផែនទី Google Maps។',
                    'Search by Khmer, English, or Chinese name, or tap the button below to open your search directly in Google Maps.',
                    '支持输入高棉语、中文或英文名称搜索。如果未找到结果，请点击下方按钮直接在 Google 地图中打开搜索。'
                  )}
                </p>
                {query.trim() && (
                  <div className="pt-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${query.trim()} ${province !== 'ទាំងអស់' ? province : ''} Cambodia`.trim()
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>
                        {tr(
                          language,
                          `🗺️ បើកស្វែងរក "${query.trim()}" ផ្ទាល់នៅលើ Google Maps`,
                          `🗺️ Open "${query.trim()}" in Google Maps`,
                          `🗺️ 在 Google 地图中搜索 “${query.trim()}”`
                        )}
                      </span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedResults.map(place => {
                  const dupInfo = duplicateMap.get(place.placeId);
                  const isDup = Boolean(dupInfo?.isDuplicate);
                  const isSelected = selectedPlaceIds.has(place.placeId);
                  const isEditingThis = editingPlaceId === place.placeId;
                  const safeLat = Number(place.latitude ?? place.lat ?? 11.5564);
                  const safeLng = Number(place.longitude ?? place.lng ?? 104.9282);
                  const safeRating = Number(place.rating ?? 0);
                  const safeRatingCount = Number(place.userRatingCount ?? place.reviewCount ?? 0);
                  const placeMapsHref =
                    place.googleMapsUrl ||
                    (place as any).mapUrl ||
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.nameKh || place.nameEn || 'Cambodia')}`;
                  const displayTitle =
                    language === 'km'
                      ? place.nameKh || place.nameEn
                      : language === 'zh'
                      ? translateDynamicTextToZh(place.nameEn || place.nameKh) || place.nameEn || place.nameKh
                      : place.nameEn || place.nameKh;
                  const displayAddress =
                    language === 'km'
                      ? place.addressKh || place.addressEn
                      : language === 'zh'
                      ? translateDynamicTextToZh(place.addressEn || place.addressKh) || place.addressEn || place.addressKh
                      : place.addressEn || place.addressKh;

                  return (
                    <div
                      key={place.placeId}
                      className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-sm hover:shadow-md flex flex-col ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                          : isDup
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Top Image & Badges */}
                      <div className="relative h-44 bg-slate-900 overflow-hidden">
                        <img
                          src={place.photoUrl}
                          alt={displayTitle}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                        {/* Admin Checkbox + Category Badge */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                          {isAdmin && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectPlace(place.placeId)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow"
                            />
                          )}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-sm ${
                              place.category === 'tourism'
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {place.category === 'tourism'
                              ? tr(language, '🏛️ តំបន់ទេសចរណ៍', '🏛️ Tourist Spot', '🏛️ 旅游景点')
                              : tr(language, '🍽️ ហាងអាហារ / កាហ្វេ', '🍽️ Restaurant / Café', '🍽️ 餐厅 / 咖啡馆')}
                          </span>
                          {place.provinceKh && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-sm">
                              📍 {translateProvinceName(place.provinceKh, place.provinceEn || place.provinceKh, language)}
                            </span>
                          )}
                        </div>

                        {/* Duplicate Status Badge */}
                        <div className="absolute top-2.5 right-2.5">
                          {isDup ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow">
                              <CheckCircle className="w-3 h-3" />
                              {tr(language, 'មានក្នុងកម្មវិធីរួចហើយ', 'In App', '已在应用中')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-800 shadow-sm">
                              Google Place
                            </span>
                          )}
                        </div>

                        {/* Place Title & Rating on Bottom of Photo */}
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2 text-white">
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-sm sm:text-base leading-snug truncate drop-shadow">
                              {displayTitle}
                            </h3>
                            {place.nameKh && place.nameKh !== displayTitle && (
                              <p className="text-[11px] text-white/85 truncate">{place.nameKh}</p>
                            )}
                          </div>

                          <div className="shrink-0 flex flex-col items-end">
                            {safeRatingCount > 0 ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-extrabold text-xs shadow">
                                <Star className="w-3.5 h-3.5 fill-slate-950" />
                                <span>{safeRating.toFixed(1)}</span>
                                <span className="text-[10px] font-semibold">({safeRatingCount})</span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-black/60 text-white/90 text-[10px] font-semibold">
                                {tr(language, 'មិនទាន់មានផ្កាយ', 'No ratings yet', '暂无评分')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5 text-xs text-slate-600">
                          <p className="flex items-start gap-1.5 line-clamp-2">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{displayAddress}</span>
                          </p>

                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 flex-wrap">
                            <span>
                              🌐 GPS: {safeLat.toFixed(4)}, {safeLng.toFixed(4)}
                            </span>
                            {place.phone && (
                              <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                {place.phone}
                              </span>
                            )}
                          </div>

                          {/* Photo Authenticity & Attribution Notice */}
                          <div className="pt-1 flex items-center justify-between gap-2 text-[10px] text-slate-400 border-t border-slate-100">
                            <span className="truncate">
                              {place.hasRealGooglePhoto
                                ? tr(
                                    language,
                                    `📸 រូបភាពផ្លូវការពី Google Maps ${
                                      place.photoAttributions?.length
                                        ? `(ផ្តល់ដោយ៖ ${place.photoAttributions[0]})`
                                        : ''
                                    }`,
                                    `📸 Official Google Maps Photo`,
                                    `📸 Google 地图官方照片`
                                  )
                                : tr(
                                    language,
                                    '🖼️ គ្មានរូបភាពលើ Google Maps (ប្រើស្លាកឈ្មោះទីតាំងពិត)',
                                    '🖼️ Verified Google Place Card',
                                    '🖼️ 已验证 Google 地图地点'
                                  )}
                            </span>
                            <span className="font-mono text-[9px] text-slate-400 shrink-0" title={place.placeId}>
                              ID: {String(place.placeId || '').slice(0, 10)}…
                            </span>
                          </div>
                        </div>

                        {/* Inline Admin Editor Before Import */}
                        {isAdmin && isEditingThis && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-indigo-200 space-y-2 text-xs">
                            <div className="font-bold text-indigo-950 flex items-center justify-between">
                              <span>✏️ ពិនិត្យ និងកែសម្រួលមុននាំចូល (Admin Override)</span>
                              <button
                                type="button"
                                onClick={() => setEditingPlaceId(null)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">ឈ្មោះខ្មែរ</label>
                                <input
                                  type="text"
                                  value={editDraft.nameKh}
                                  onChange={e => setEditDraft(d => ({ ...d, nameKh: e.target.value }))}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">ឈ្មោះអង់គ្លេស</label>
                                <input
                                  type="text"
                                  value={editDraft.nameEn}
                                  onChange={e => setEditDraft(d => ({ ...d, nameEn: e.target.value }))}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">ប្រភេទទីតាំង</label>
                                <select
                                  value={editDraft.category}
                                  onChange={e =>
                                    setEditDraft(d => ({ ...d, category: e.target.value as 'restaurant' | 'tourism' }))
                                  }
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                                >
                                  <option value="restaurant">🍽️ ភោជនីយដ្ឋាន / ហាងអាហារ</option>
                                  <option value="tourism">🏛️ តំបន់ទេសចរណ៍</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">ខេត្ត/ក្រុង</label>
                                <select
                                  value={editDraft.provinceKh}
                                  onChange={e => setEditDraft(d => ({ ...d, provinceKh: e.target.value }))}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                                >
                                  {CAMBODIA_PROVINCES.filter(p => p !== 'ទាំងអស់').map(p => (
                                    <option key={p} value={p}>
                                      {p}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  តំណភ្ជាប់រូបភាពផ្ទាល់ខ្លួន (ទុកទទេដើម្បីប្រើរូប Google Maps ពិត)
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <ImageIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <input
                                    type="text"
                                    value={editDraft.photoUrl}
                                    onChange={e => setEditDraft(d => ({ ...d, photoUrl: e.target.value }))}
                                    placeholder="https://..."
                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingPlaceId(null)}
                                className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 font-semibold"
                              >
                                បោះបង់
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedImport(place)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                រក្សាទុក & នាំចូល
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenPlacePreview(place)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                            >
                              {tr(language, 'មើលព័ត៌មានលម្អិត', 'View Details', '查看详情')}
                            </button>

                            <a
                              href={placeMapsHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>{tr(language, 'បើក Google Maps', 'Google Maps', '打开谷歌地图')}</span>
                            </a>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditingBeforeImport(place)}
                                title={tr(language, 'ពិនិត្យ និងកែសម្រួលមុននាំចូល', 'Review & Edit Before Import', '导入前编辑')}
                                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => importGooglePlaceToApp(place)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                                  isDup
                                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                }`}
                              >
                                {isDup ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>{tr(language, 'ធ្វើបច្ចុប្បន្នភាព Meta', 'Sync Meta', '同步元数据')}</span>
                                  </>
                                ) : (
                                  <>
                                    <PlusCircle className="w-3.5 h-3.5" />
                                    <span>{tr(language, 'នាំចូលកម្មវិធី', 'Import to App', '导入应用')}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination & Load More from Google Maps */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 disabled:opacity-40 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{tr(language, 'ទំព័រមុន', 'Prev', '上一页')}</span>
                  </button>

                  <span className="text-xs font-bold text-slate-700 px-2">
                    {tr(
                      language,
                      `ទំព័រ ${currentPage} នៃ ${totalPages} (សរុប ${results.length} ទីតាំង)`,
                      `Page ${currentPage} of ${totalPages} (${results.length} places)`,
                      `第 ${currentPage} / ${totalPages} 页（共 ${results.length} 个地点）`
                    )}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 disabled:opacity-40 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <span>{tr(language, 'ទំព័របន្ទាប់', 'Next', '下一页')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {nextPageToken && (
                  <button
                    type="button"
                    disabled={isLoadingMore}
                    onClick={() => executeSearch({ pageToken: nextPageToken, append: true })}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                  >
                    {isLoadingMore ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PlusCircle className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {tr(
                        language,
                        'ទាញយកលទ្ធផលបន្ថែមពី Google Maps (Next Page)',
                        'Load More Results from Google Maps',
                        '从 Google 地图加载更多结果'
                      )}
                    </span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Policy & Attribution Compliance */}
        <div className="px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Google Maps Platform Compliance:</span>
            <span>
              {tr(
                language,
                'រូបភាព និងទិន្នន័យផែនទីផ្តល់ដោយ Google Maps • រក្សាទុកព័ត៌មាន Admin ដាច់ដោយឡែកពី Google Metadata',
                'Photos & map data powered by Google Maps • Admin records stored separately from Google Metadata',
                '地图与照片数据由 Google 地图提供 • 管理员数据与 Google 元数据独立存储'
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsGoogleMapsSearchModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
          >
            {tr(language, 'បិទផ្ទាំងស្វែងរក', 'Close', '关闭搜索窗口')}
          </button>
        </div>
      </div>
    </div>
  );
};

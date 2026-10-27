import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  MapPin,
  Phone,
  Clock,
  Globe,
  Star,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  ExternalLink,
  Loader2,
  Store,
  Edit3,
} from 'lucide-react';
import { Language, Restaurant } from '../types';
import { tr } from '../utils/i18n';
import {
  GooglePlaceCachedItem,
  GooglePlaceSearchCategory,
  searchGoogleMapsPlacesAdvanced,
  fetchGooglePlaceDetailsById,
  findDuplicateRestaurantForGooglePlace,
  buildGoogleMapsMetaFromCachedItem,
  formatDisplayPhone,
  resolveProvinceGeoConfig,
  CAMBODIA_PROVINCE_GEO_LIST,
} from '../services/googlePlacesService';

export interface ImportedGoogleShopData {
  place: GooglePlaceCachedItem;
  googlePlaceId: string;
  googleMapsMeta: ReturnType<typeof buildGoogleMapsMetaFromCachedItem>;
  nameKh: string;
  nameEn: string;
  provinceKh: string;
  provinceEn: string;
  addressKh: string;
  addressEn: string;
  latitude: number;
  longitude: number;
  phone: string;
  mapUrl: string;
  businessCategory: string;
  businessCategoryLabelKh: string;
  businessCategoryLabelEn: string;
  openingHoursKh: string;
  websiteUrl?: string;
  priceLevel: '$' | '$$' | '$$$' | '$$$$';
  photoUrls: string[];
  hasOfficialGooglePhoto: boolean;
  descriptionKh: string;
  descriptionEn: string;
  signatureDishesKh: string[];
}

interface GoogleMapsShopImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectShop: (data: ImportedGoogleShopData) => void;
  existingRestaurants: Restaurant[];
  replacingStoreId?: string | null;
  language: Language;
  initialQuery?: string;
  initialProvinceKh?: string;
}

const IMPORT_CATEGORIES: {
  id: GooglePlaceSearchCategory;
  labelKh: string;
  labelEn: string;
  labelZh: string;
  emoji: string;
}[] = [
  { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All Shops', labelZh: '全部店铺', emoji: '🏪' },
  { id: 'restaurant', labelKh: 'ភោជនីយដ្ឋាន', labelEn: 'Restaurants', labelZh: '餐厅', emoji: '🍽️' },
  { id: 'cafe', labelKh: 'ហាងកាហ្វេ & ភេសជ្ជៈ', labelEn: 'Cafés & Drinks', labelZh: '咖啡与饮品', emoji: '☕' },
  { id: 'street_food', labelKh: 'អាហារតាមផ្លូវ', labelEn: 'Street Food', labelZh: '街头小吃', emoji: '🍜' },
  { id: 'seafood', labelKh: 'គ្រឿងសមុទ្រ', labelEn: 'Seafood', labelZh: '海鲜', emoji: '🦀' },
  { id: 'bakery', labelKh: 'ហាងនំប៉័ង & បង្អែម', labelEn: 'Bakery & Desserts', labelZh: '烘焙甜品', emoji: '🥐' },
];

export function resolveProvincePair(rawProvince?: string): { provinceKh: string; provinceEn: string } {
  const geo = resolveProvinceGeoConfig(rawProvince);
  if (!geo) {
    return { provinceKh: 'រាជធានីភ្នំពេញ', provinceEn: 'Phnom Penh' };
  }
  const fullKh = geo.kh === 'ភ្នំពេញ' ? 'រាជធានីភ្នំពេញ' : `ខេត្ត${geo.kh.replace(/^ខេត្ត|^រាជធានី/g, '')}`;
  return { provinceKh: fullKh, provinceEn: geo.en };
}

export function getBusinessCategoryLabels(place: GooglePlaceCachedItem): {
  categoryCode: string;
  labelKh: string;
  labelEn: string;
  labelZh: string;
  signatureDishesKh: string[];
} {
  const types = (place.types || []).map((t) => t.toLowerCase());
  const text = `${place.nameKh} ${place.nameEn} ${types.join(' ')}`.toLowerCase();

  if (place.category === 'cafe' || /(coffee|cafe|café|កាហ្វេ|tea|boba|roastery)/i.test(text)) {
    return {
      categoryCode: 'cafe',
      labelKh: 'ហាងកាហ្វេ & ភេសជ្ជៈ (Café & Coffee Shop)',
      labelEn: 'Café & Coffee Shop',
      labelZh: '咖啡厅与饮品店',
      signatureDishesKh: ['កាហ្វេ និងភេសជ្ជៈ', 'នំដុត និងអាហារសម្រន់'],
    };
  }
  if (/(bakery|bread|cake|dessert|នំប៉័ង|នំខេក|បង្អែម|ice_cream)/i.test(text)) {
    return {
      categoryCode: 'bakery',
      labelKh: 'ហាងនំប៉័ង & បង្អែម (Bakery & Dessert)',
      labelEn: 'Bakery & Dessert Shop',
      labelZh: '烘焙与甜品店',
      signatureDishesKh: ['នំប៉័ង និងនំខេក', 'បង្អែម និងភេសជ្ជៈ'],
    };
  }
  if (/(seafood|គ្រឿងសមុទ្រ|ក្តាម|បង្គា|មឹក)/i.test(text)) {
    return {
      categoryCode: 'seafood',
      labelKh: 'ភោជនីយដ្ឋានគ្រឿងសមុទ្រ (Seafood Restaurant)',
      labelEn: 'Seafood Restaurant',
      labelZh: '海鲜餐厅',
      signatureDishesKh: ['អាហារគ្រឿងសមុទ្រស្រស់ៗ', 'ម្ហូបពិសេសប្រចាំហាង'],
    };
  }
  if (place.category === 'street_food' || /(street_food|night_market|អាហារតាមផ្លូវ|ផ្សាររាត្រី|គុយទាវ|មី)/i.test(text)) {
    return {
      categoryCode: 'street_food',
      labelKh: 'អាហារដ្ឋាន & អាហារតាមផ្លូវ (Local Eatery)',
      labelEn: 'Local Eatery & Street Food',
      labelZh: '特色小吃与快餐店',
      signatureDishesKh: ['អាហារប្រចាំហាង', 'គុយទាវ និងបាយ'],
    };
  }
  return {
    categoryCode: 'restaurant',
    labelKh: 'ភោជនីយដ្ឋាន & អាហារដ្ឋាន (Restaurant)',
    labelEn: 'Restaurant',
    labelZh: '餐厅与美食店',
    signatureDishesKh: ['ម្ហូបពិសេសប្រចាំហាង', 'ម្ហូបខ្មែរ និងភេសជ្ជៈ'],
  };
}

export const GoogleMapsShopImporterModal: React.FC<GoogleMapsShopImporterModalProps> = ({
  isOpen,
  onClose,
  onSelectShop,
  existingRestaurants,
  replacingStoreId,
  language,
  initialQuery = '',
  initialProvinceKh = 'ទាំងអស់',
}) => {
  const isKm = language === 'km';
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<GooglePlaceSearchCategory>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('ទាំងអស់');
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  const [results, setResults] = useState<GooglePlaceCachedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [providerUsed, setProviderUsed] = useState<'google_maps_api' | 'smart_cache' | 'online_cambodia_map'>('smart_cache');
  const [apiWarning, setApiWarning] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastExecutedKeyRef = useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialQuery && initialQuery.trim().length >= 2) {
        setQuery(initialQuery.trim());
      }
      setErrorMsg('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialQuery]);

  // Check duplicate status for each place using Google Place ID (and ignoring replacingStoreId if user is replacing that store)
  const duplicateMap = useMemo(() => {
    const map = new Map<string, Restaurant>();
    const pool = replacingStoreId
      ? existingRestaurants.filter((r) => r.id !== replacingStoreId)
      : existingRestaurants;
    for (const item of results) {
      // Only check restaurant/cafe/food places
      const dup = findDuplicateRestaurantForGooglePlace(item, pool);
      if (dup) {
        map.set(item.placeId, dup);
      }
    }
    return map;
  }, [results, existingRestaurants, replacingStoreId]);

  if (!isOpen) return null;

  const handleSearch = async (overrideOpts?: {
    q?: string;
    cat?: GooglePlaceSearchCategory;
    prov?: string;
    loc?: { lat: number; lng: number } | null;
    pageToken?: string;
    append?: boolean;
  }) => {
    const activeQ = (overrideOpts?.q !== undefined ? overrideOpts.q : query).trim();
    const activeCat = overrideOpts?.cat !== undefined ? overrideOpts.cat : category;
    const activeProv = overrideOpts?.prov !== undefined ? overrideOpts.prov : provinceFilter;
    const activeLoc = overrideOpts?.loc !== undefined ? overrideOpts.loc : gpsLocation;
    const isAppend = Boolean(overrideOpts?.append);

    if (activeQ.length < 2 && !activeLoc && activeCat === 'all' && activeProv === 'ទាំងអស់') {
      setErrorMsg(
        tr(
          language,
          'សូមវាយបញ្ចូលឈ្មោះហាង យ៉ាងតិច ២ តួអក្សរ ឬចុចស្វែងរកហាងក្បែរខ្លួន (GPS)!',
          'Please enter at least 2 characters of your shop name or tap Find Nearby (GPS)!',
          '请输入至少 2 个字符的店铺名称，或点击搜索附近店铺 (GPS)！'
        )
      );
      return;
    }

    // Deduplicate identical consecutive requests to control API costs (Requirement 8)
    const reqKey = `${activeQ.toLowerCase()}|${activeCat}|${activeProv}|${activeLoc ? `${activeLoc.lat.toFixed(3)},${activeLoc.lng.toFixed(3)}` : 'noloc'}|${overrideOpts?.pageToken || ''}`;
    if (!isAppend && reqKey === lastExecutedKeyRef.current && results.length > 0) {
      return;
    }
    lastExecutedKeyRef.current = reqKey;

    inputRef.current?.blur();
    if (isAppend) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setErrorMsg('');
      setApiWarning('');
      setHasSearched(true);
    }

    try {
      const response = await searchGoogleMapsPlacesAdvanced({
        query: activeQ,
        category: activeCat,
        categoryFilter: activeCat,
        typeFilter: 'restaurant',
        province: activeProv === 'ទាំងអស់' ? '' : activeProv,
        provinceFilter: activeProv === 'ទាំងអស់' ? '' : activeProv,
        searchScope: activeLoc ? 'nearby' : activeProv !== 'ទាំងអស់' ? 'province' : 'nationwide',
        lat: activeLoc?.lat,
        lng: activeLoc?.lng,
        radiusMeters: activeLoc ? 10000 : 25000,
        pageToken: overrideOpts?.pageToken,
        pageSize: 20,
        language,
      });

      const foodAndShopResults = (response.places || response.results || []).filter(
        (p) => p.category !== 'tourism'
      );

      if (isAppend) {
        setResults((prev) => {
          const seen = new Set(prev.map((x) => x.placeId));
          return [...prev, ...foodAndShopResults.filter((x) => !seen.has(x.placeId))];
        });
      } else {
        setResults(foodAndShopResults);
      }

      setNextPageToken(response.nextPageToken);
      setProviderUsed(response.providerUsed);
      setFromCache(Boolean(response.fromCache ?? response.fromSmartCache));

      const warnText =
        language === 'km'
          ? response.apiWarningKh
          : language === 'zh'
          ? response.apiWarningZh || response.apiWarningEn
          : response.apiWarningEn;
      if (warnText) {
        setApiWarning(warnText);
      }

      if (!isAppend && foodAndShopResults.length === 0 && response.errorMessage) {
        setErrorMsg(
          language === 'km'
            ? response.errorMessageKh || response.errorMessage
            : language === 'zh'
            ? response.errorMessageZh || response.errorMessageEn || response.errorMessage
            : response.errorMessageEn || response.errorMessage
        );
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          tr(
            language,
            'មិនអាចតភ្ជាប់ទៅកាន់ Google Maps បានទេ។ សូមសាកល្បងម្តងទៀត ឬបញ្ចូលដោយដៃ។',
            'Unable to connect to Google Maps. Please try again or enter details manually.',
            '无法连接 Google 地图，请重试或手动填写。'
          )
      );
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleFindNearbyGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg(
        tr(
          language,
          'ឧបករណ៍របស់អ្នកមិនគាំទ្រការចាប់ទីតាំង GPS ទេ។',
          'Geolocation is not supported on this device.',
          '您的设备不支持 GPS 定位。'
        )
      );
      return;
    }
    setIsLocatingGps(true);
    setErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsLocation(coords);
        setIsLocatingGps(false);
        handleSearch({
          q: query.trim() || 'ភោជនីយដ្ឋាន ហាងកាហ្វេ',
          loc: coords,
        });
      },
      () => {
        setIsLocatingGps(false);
        setErrorMsg(
          tr(
            language,
            'មិនអាចចាប់ទីតាំង GPS បានទេ។ សូមវាយឈ្មោះហាងក្នុងប្រអប់ស្វែងរកខាងលើ។',
            'Unable to access GPS location. Please search by typing your shop name above.',
            '无法获取 GPS 位置，请在上方输入店铺名称进行搜索。'
          )
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  const handleImportPlace = async (initialPlace: GooglePlaceCachedItem) => {
    let place = initialPlace;
    // Perform Place Details lookup if place came from Google Places API and is missing phone or hours (Requirement 5)
    if (
      place.source === 'google_maps_api' &&
      (!place.phone || !place.openHours || place.openHours.includes('មើលម៉ោងបើកលើ'))
    ) {
      const detailed = await fetchGooglePlaceDetailsById(place.googlePlaceId || place.placeId, language);
      if (detailed) {
        place = { ...place, ...detailed };
      }
    }
    const googleMeta = buildGoogleMapsMetaFromCachedItem(place);
    const { provinceKh, provinceEn } = resolveProvincePair(place.provinceKh || place.province);
    const catInfo = getBusinessCategoryLabels(place);
    const cleanPhone = formatDisplayPhone(place.phone);

    // Only import real Google Maps photos; if the place only has an SVG no-photo placeholder, let the form keep/choose photos cleanly
    const realPhotos = (place.photoUrls || [place.photoUrl]).filter(
      (u) => u && !u.startsWith('data:image/svg+xml')
    );

    const attributionNoteKh =
      place.photoAttributions && place.photoAttributions.length > 0
        ? ` (រូបភាពពី Google Maps៖ ${place.photoAttributions.slice(0, 2).join(', ')})`
        : '';

    const importedData: ImportedGoogleShopData = {
      place,
      googlePlaceId: googleMeta.placeId,
      googleMapsMeta: googleMeta,
      nameKh: place.nameKh || place.nameEn,
      nameEn: place.nameEn || place.nameKh,
      provinceKh,
      provinceEn,
      addressKh: place.addressKh || place.address || provinceKh,
      addressEn: place.address || place.addressKh || provinceEn,
      latitude: Number.isFinite(place.lat) ? place.lat : 11.5564,
      longitude: Number.isFinite(place.lng) ? place.lng : 104.9282,
      phone: cleanPhone,
      mapUrl:
        place.googleMapsUrl ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${place.nameEn || place.nameKh} ${place.lat},${place.lng}`
        )}`,
      businessCategory: catInfo.categoryCode,
      businessCategoryLabelKh: catInfo.labelKh,
      businessCategoryLabelEn: catInfo.labelEn,
      openingHoursKh:
        place.openHours && !place.openHours.includes('មើលម៉ោងបើកលើ')
          ? place.openHours
          : '០៧:០០ ព្រឹក - ០៩:០០ យប់',
      websiteUrl: place.websiteUri,
      priceLevel: place.priceLevel || '$$',
      photoUrls: realPhotos,
      hasOfficialGooglePhoto: Boolean(place.hasOfficialGooglePhoto && realPhotos.length > 0),
      descriptionKh: `${place.nameKh} (${catInfo.labelKh}) មានទីតាំងស្ថិតនៅ ${
        place.addressKh || place.address
      }។ ទាញយកទិន្នន័យផ្លូវការពី Google Maps${attributionNoteKh}។`,
      descriptionEn: `${place.nameEn || place.nameKh} (${catInfo.labelEn}) located at ${
        place.address || provinceEn
      }. Imported from Google Maps.`,
      signatureDishesKh: catInfo.signatureDishesKh,
    };

    onSelectShop(importedData);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in font-khmer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-emerald-500/40 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#064E3B] via-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-400 text-slate-950 shadow-xs shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-moul text-xs sm:text-sm text-white truncate">
                {tr(
                  language,
                  '🗺️ ទាញយកព័ត៌មានហាងពី Google Maps',
                  '🗺️ Import Shop from Google Maps',
                  '🗺️ 从 Google 地图导入店铺'
                )}
              </h3>
              <p className="text-[11px] text-emerald-100 truncate">
                {tr(
                  language,
                  'ស្វែងរកហាងរបស់អ្នក រួចចុចជ្រើសរើសដើម្បីបំពេញទម្រង់ដោយស្វ័យប្រវត្តិ',
                  'Search your shop on Google Places to auto-fill all form fields',
                  '在 Google 地图中搜索您的店铺，一键自动填充表单信息'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Controls */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr(
                  language,
                  'វាយឈ្មោះហាង ភោជនីយដ្ឋាន ឬហាងកាហ្វេ...',
                  'Type your shop, restaurant, or café name...',
                  '输入您的店铺、餐厅或咖啡馆名称...'
                )}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] disabled:opacity-60 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{tr(language, 'ស្វែងរក', 'Search', '搜索')}</span>
            </button>
          </form>

          {/* Province & GPS Nearby Filter Row */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={provinceFilter}
              onChange={(e) => {
                setProvinceFilter(e.target.value);
                setGpsLocation(null);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[11px] font-medium outline-none"
            >
              <option value="ទាំងអស់">
                🌏 {tr(language, 'ទូទាំងប្រទេសកម្ពុជា (២៥ ខេត្ត/រាជធានី)', 'All Cambodia (25 Provinces)', '全柬埔寨（25个省市）')}
              </option>
              {CAMBODIA_PROVINCE_GEO_LIST.map((p) => (
                <option key={p.kh} value={p.kh}>
                  📍 {language === 'km' ? p.kh : language === 'zh' ? p.zh : p.en}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleFindNearbyGps}
              disabled={isLocatingGps || isLoading}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 border transition cursor-pointer ${
                gpsLocation
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-slate-800'
              }`}
            >
              {isLocatingGps ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span>
                {tr(
                  language,
                  'ហាងក្បែរខ្ញុំ (GPS)',
                  'Near Me (GPS)',
                  '我附近的店铺 (GPS)'
                )}
              </span>
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {IMPORT_CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    if (query.trim().length >= 2 || gpsLocation) {
                      handleSearch({ cat: cat.id });
                    }
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 transition cursor-pointer ${
                    active
                      ? 'bg-[#064E3B] text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>
                    {language === 'km'
                      ? cat.labelKh
                      : language === 'zh'
                      ? cat.labelZh
                      : cat.labelEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <p>{errorMsg}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1 rounded-lg bg-[#064E3B] text-white font-bold text-[11px] cursor-pointer"
                >
                  {tr(
                    language,
                    '✏️ បន្តបញ្ចូលព័ត៌មានហាងដោយដៃ',
                    '✏️ Continue Manual Entry',
                    '✏️ 继续手动填写店铺信息'
                  )}
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center space-y-2.5">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                {tr(
                  language,
                  'កំពុងស្វែងរកទិន្នន័យហាងពី Google Maps...',
                  'Searching shops on Google Maps...',
                  '正在从 Google 地图搜索店铺数据...'
                )}
              </p>
            </div>
          ) : results.length > 0 ? (
            <>
              {apiWarning && (
                <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/70 text-[10px] text-amber-900 dark:text-amber-200 leading-relaxed">
                  {apiWarning}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                <span>
                  {tr(
                    language,
                    `រកឃើញ ${results.length} ទីតាំង — សូមជ្រើសរើសហាងរបស់អ្នក៖`,
                    `Found ${results.length} places — select your shop to auto-fill:`,
                    `找到 ${results.length} 个地点 — 请选择您的店铺以自动填充：`
                  )}
                </span>
                <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  {providerUsed === 'google_maps_api'
                    ? '🌐 Google Places API (Live)'
                    : fromCache
                    ? '⚡ Smart Cache'
                    : '🗺️ Cambodia Map Directory'}
                </span>
              </div>

              {results.map((item) => {
                const existingDup = duplicateMap.get(item.placeId);
                const catInfo = getBusinessCategoryLabels(item);
                const cleanPhone = formatDisplayPhone(item.phone);
                const hasRealPhoto =
                  item.photoUrl && !item.photoUrl.startsWith('data:image/svg+xml');

                return (
                  <div
                    key={item.placeId}
                    className={`p-3 rounded-2xl border transition space-y-2.5 ${
                      existingDup
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/70'
                        : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={item.photoUrl}
                        alt={item.nameKh}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug">
                            {isKm ? item.nameKh : item.nameEn || item.nameKh}
                          </h4>
                          {item.rating > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-[10px] flex items-center gap-0.5 shrink-0">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              <span>{item.rating.toFixed(1)}</span>
                              {item.reviewCount > 0 && (
                                <span className="text-[9px] opacity-80">({item.reviewCount})</span>
                              )}
                            </span>
                          )}
                        </div>

                        {item.nameEn && item.nameEn !== item.nameKh && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-sans">
                            {item.nameEn}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                            {item.primaryTypeDisplayName ||
                              (language === 'km'
                                ? catInfo.labelKh
                                : language === 'zh'
                                ? catInfo.labelZh
                                : catInfo.labelEn)}
                          </span>
                          {item.priceLevel && (
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                              {item.priceLevel}
                            </span>
                          )}
                          {hasRealPhoto && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
                              📸 {tr(language, 'មានរូបហាង', 'Has Photos', '含店铺照片')}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1 leading-snug">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            {item.addressKh || item.address}{' '}
                            <span className="text-[10px] font-mono text-slate-400">
                              ({item.lat.toFixed(4)}, {item.lng.toFixed(4)})
                            </span>
                          </span>
                        </p>

                        {item.editorialSummary && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                            💬 {item.editorialSummary}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                          {cleanPhone && (
                            <span className="flex items-center gap-1 font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                              <Phone className="w-3 h-3" />
                              {cleanPhone}
                            </span>
                          )}
                          {item.openHours && !item.openHours.includes('មើលម៉ោងបើកលើ') && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.openHours}
                            </span>
                          )}
                          {item.websiteUri && (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 truncate max-w-[160px]">
                              <Globe className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.websiteUri}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Photo Attributions if required by Google Places API policy (Requirement 7) */}
                    {item.photoAttributions && item.photoAttributions.length > 0 && (
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 px-1">
                        {tr(language, 'ប្រភពរូបភាព Google Maps៖ ', 'Photo attribution: ', '照片来源：')}
                        {item.photoAttributions.slice(0, 2).join(', ')}
                      </div>
                    )}

                    {/* Duplicate Prevention Warning or Import Action (Requirement 5) */}
                    {existingDup ? (
                      <div className="p-2.5 rounded-xl bg-amber-100/80 dark:bg-amber-950/60 border border-amber-400/70 flex items-center justify-between gap-2">
                        <div className="text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            {tr(
                              language,
                              `ហាងនេះមានក្នុងប្រព័ន្ធរួចហើយ («${existingDup.nameKh}» • Place ID ដូចគ្នា)`,
                              `Already registered in app ("${existingDup.nameEn || existingDup.nameKh}" • Duplicate Place ID)`,
                              `该店铺已存在于系统中（“${existingDup.nameEn || existingDup.nameKh}” • Place ID 重复）`
                            )}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold text-[10px] shrink-0">
                          {tr(language, 'មានរួចហើយ', 'Duplicate', '已存在')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/70">
                        <a
                          href={item.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{tr(language, 'មើលលើ Maps', 'View Map', '查看地图')}</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleImportPlace(item)}
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#064E3B] to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                          <span>
                            {tr(
                              language,
                              'ជ្រើសរើស និងបំពេញទម្រង់ហាងនេះ',
                              'Select & Auto-Fill Form',
                              '选择并自动填充此店铺'
                            )}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {nextPageToken && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    disabled={isLoadingMore}
                    onClick={() => handleSearch({ pageToken: nextPageToken, append: true })}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                  >
                    {isLoadingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>
                      {tr(
                        language,
                        'បង្ហាញលទ្ធផលបន្ថែម (Load More Places)',
                        'Load More Places',
                        '加载更多地点'
                      )}
                    </span>
                  </button>
                </div>
              )}
            </>
          ) : hasSearched ? (
            /* Not Found Fallback -> Continue Manually (Requirement 6) */
            <div className="py-8 px-4 text-center space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                <Store className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  {tr(
                    language,
                    'រកមិនឃើញហាងនេះនៅលើ Google Maps ទេ',
                    'Could not find this shop on Google Maps',
                    '在 Google 地图上未找到该店铺'
                  )}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {tr(
                    language,
                    'ប្រសិនបើហាងរបស់អ្នកមិនទាន់មាននៅលើ Google Maps ទេ លោកអ្នកអាចបន្តបញ្ចូលព័ត៌មានហាងដោយដៃជាធម្មតាបានភ្លាមៗ។',
                    'If your shop is not listed on Google Maps yet, you can continue adding it manually as usual.',
                    '如果您的店铺尚未在 Google 地图上列出，您可以像往常一样继续手动填写添加。'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-amber-300" />
                <span>
                  {tr(
                    language,
                    '✏️ បន្តបញ្ចូលព័ត៌មានហាងដោយដៃ (Manual Entry)',
                    '✏️ Continue Adding Shop Manually',
                    '✏️ 继续手动添加店铺'
                  )}
                </span>
              </button>
            </div>
          ) : (
            /* Initial Prompt before search */
            <div className="py-8 px-4 text-center space-y-2.5 text-slate-500 dark:text-slate-400">
              <Globe className="w-9 h-9 text-emerald-600/80 mx-auto stroke-1" />
              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                {tr(
                  language,
                  'វាយឈ្មោះហាងរបស់អ្នកខាងលើ ដើម្បីទាញយកទិន្នន័យពី Google Maps',
                  'Type your shop name above to import details from Google Maps',
                  '在上方输入您的店铺名称，即可从 Google 地图导入信息'
                )}
              </p>
              <p className="text-[11px] max-w-xs mx-auto leading-relaxed">
                {tr(
                  language,
                  'ប្រព័ន្ធនឹងទាញយក ឈ្មោះហាង អាសយដ្ឋាន កូអរដោនេ GPS លេខទូរស័ព្ទ ម៉ោងបើក ប្រភេទអាជីវកម្ម និងរូបភាពហាងដោយស្វ័យប្រវត្តិ។',
                  'Automatically imports shop name, address, GPS coordinates, phone number, opening hours, category, website, and photos.',
                  '系统将自动导入店铺名称、地址、GPS 坐标、电话号码、营业时间、类别、网站和照片。'
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer with Official Google Attribution & Manual Entry Fallback (Requirements 6 & 7) */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-sans text-[10px]">
            <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold">Powered by Google Maps</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs transition cursor-pointer"
          >
            {tr(language, 'បញ្ចូលដោយដៃ (Manual)', 'Enter Manually', '手动填写')}
          </button>
        </div>
      </div>
    </div>
  );
};

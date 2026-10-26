import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Navigation, Compass, Store, Mountain, 
  Phone, Star, ArrowUpRight, LocateFixed, Loader2, MapPin, RefreshCw
} from 'lucide-react';
import {
  sanitizeDialablePhone,
  searchNearbyPlacesWithin500m,
  convertGooglePlaceToRestaurant,
  convertGooglePlaceToDestination,
  findDuplicateRestaurantForGooglePlace,
  findDuplicateDestinationForGooglePlace,
  mergeGoogleMapsPlaceWithExistingRestaurant,
  GooglePlaceCachedItem,
  buildPlaceSpecificNoPhotoSvg,
} from '../services/googlePlacesService';
import { Restaurant, TouristDestination } from '../types';
import { tr, translateProvince } from '../utils/i18n';
import { getLocalizedRestaurant, getLocalizedDestination } from '../utils/zhDynamicTranslator';

// Haversine formula for distance between 2 GPS coordinates in meters
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return Infinity;
  }
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const MAX_NEARBY_RADIUS_METERS = 500;

interface PhnomPenhSpotPreset {
  id: string;
  labelKh: string;
  labelEn: string;
  labelZh: string;
  lat: number;
  lng: number;
}

const PHNOM_PENH_SPOT_PRESETS: PhnomPenhSpotPreset[] = [
  { id: 'bkk1', labelKh: 'បឹងកេងកង ១', labelEn: 'BKK1', labelZh: '万景岗1区 (BKK1)', lat: 11.5515, lng: 104.9282 },
  { id: 'riverside', labelKh: 'មាត់ទន្លេ & ព្រះបរមរាជវាំង', labelEn: 'Riverside & Palace', labelZh: '河畔与皇宫', lat: 11.5656, lng: 104.9314 },
  { id: 'central_market', labelKh: 'ផ្សារថ្មី', labelEn: 'Central Market', labelZh: '中央市场', lat: 11.5696, lng: 104.9210 },
  { id: 'independence', labelKh: 'វិមានឯករាជ្យ', labelEn: 'Independence Monument', labelZh: '独立纪念碑', lat: 11.5564, lng: 104.9282 },
  { id: 'russian_market', labelKh: 'ផ្សារទួលទំពូង', labelEn: 'Russian Market', labelZh: '俄罗斯市场', lat: 11.5405, lng: 104.9144 },
];

export const NearMeModal: React.FC = () => {
  const { 
    isNearMeModalOpen, setIsNearMeModalOpen, 
    restaurants, destinations, language,
    setSelectedRestaurant, setSelectedDestination 
  } = useApp();

  const [activeType, setActiveType] = useState<'restaurants' | 'destinations'>('restaurants');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'granted' | 'fallback'>('idle');
  const [manualProvince, setManualProvince] = useState<string>('រាជធានីភ្នំពេញ');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('gps');
  const [isLoadingNearby, setIsLoadingNearby] = useState<boolean>(false);
  const [liveNearbyRestaurants, setLiveNearbyRestaurants] = useState<GooglePlaceCachedItem[]>([]);
  const [liveNearbyAttractions, setLiveNearbyAttractions] = useState<GooglePlaceCachedItem[]>([]);
  const [providerBadge, setProviderBadge] = useState<'google_maps_api' | 'smart_cache' | 'online_cambodia_map'>('google_maps_api');

  // Center coordinate fallbacks for provinces if GPS unavailable
  const provinceCenters: Record<string, { lat: number; lng: number }> = {
    'រាជធានីភ្នំពេញ': { lat: 11.5564, lng: 104.9282 },
    'ខេត្តសៀមរាប': { lat: 13.3671, lng: 103.8448 },
    'ខេត្តព្រះសីហនុ': { lat: 10.6275, lng: 103.5221 },
    'ខេត្តកំពត': { lat: 10.6104, lng: 104.1815 },
    'ខេត្តកែប': { lat: 10.4819, lng: 104.2975 },
    'ខេត្តបាត់ដំបង': { lat: 13.0957, lng: 103.2022 },
    'ខេត្តមណ្ឌលគិរី': { lat: 12.4558, lng: 107.1889 },
    'ខេត្តរតនគិរី': { lat: 13.7394, lng: 106.9872 },
    'ខេត្តកោះកុង': { lat: 11.6154, lng: 102.9838 },
  };

  const baseCoords = useMemo(() => {
    return userCoords || provinceCenters[manualProvince] || provinceCenters['រាជធានីភ្នំពេញ'];
  }, [userCoords, manualProvince]);

  const fetchLiveNearby500m = async (coords: { lat: number; lng: number }, forceRefresh = false) => {
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return;
    setIsLoadingNearby(true);
    try {
      const res = await searchNearbyPlacesWithin500m(
        coords.lat,
        coords.lng,
        MAX_NEARBY_RADIUS_METERS,
        forceRefresh
      );
      setLiveNearbyRestaurants(res.restaurants);
      setLiveNearbyAttractions(res.attractions);
      setProviderBadge(res.providerUsed);
    } catch (err) {
      console.warn('NearMe 500m fetch warning:', err);
    } finally {
      setIsLoadingNearby(false);
    }
  };

  // Request GPS with high accuracy
  const requestLocation = (forceRefresh = false) => {
    setSelectedPresetId('gps');
    setGeoStatus('requesting');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const nextCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserCoords(nextCoords);
          setGeoStatus('granted');
          fetchLiveNearby500m(nextCoords, forceRefresh);
        },
        error => {
          console.warn('Geolocation denied or error:', error.message);
          const fallback = provinceCenters[manualProvince] || provinceCenters['រាជធានីភ្នំពេញ'];
          setUserCoords(fallback);
          setGeoStatus('fallback');
          fetchLiveNearby500m(fallback, forceRefresh);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      const fallback = provinceCenters[manualProvince] || provinceCenters['រាជធានីភ្នំពេញ'];
      setUserCoords(fallback);
      setGeoStatus('fallback');
      fetchLiveNearby500m(fallback, forceRefresh);
    }
  };

  useEffect(() => {
    if (isNearMeModalOpen) {
      if (!userCoords) {
        requestLocation(false);
      } else {
        fetchLiveNearby500m(userCoords, false);
      }
    }
  }, [isNearMeModalOpen]);

  // Handle manual province switch if fallback
  const handleProvinceChange = (prov: string) => {
    setManualProvince(prov);
    setSelectedPresetId('province');
    const coords = provinceCenters[prov] || provinceCenters['រាជធានីភ្នំពេញ'];
    setUserCoords(coords);
    fetchLiveNearby500m(coords, false);
  };

  // Handle Phnom Penh real location quick preset
  const handleSelectSpotPreset = (preset: PhnomPenhSpotPreset) => {
    setSelectedPresetId(preset.id);
    setManualProvince('រាជធានីភ្នំពេញ');
    const coords = { lat: preset.lat, lng: preset.lng };
    setUserCoords(coords);
    setGeoStatus('fallback');
    fetchLiveNearby500m(coords, false);
  };

  // Merge & deduplicate Supabase restaurants + Google Maps/Live 500m places, strictly within 500m, sorted nearest first
  const nearbyRestaurants = useMemo(() => {
    const mergedMap = new Map<string, Restaurant>();

    // 1. Add existing Supabase/in-app restaurants within 500m
    for (const r of restaurants) {
      const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, r.latitude, r.longitude);
      if (dist <= MAX_NEARBY_RADIUS_METERS) {
        mergedMap.set(r.id, r);
      }
    }

    // 2. Merge live Google Places / 500m places without duplicating existing Supabase records
    for (const gp of liveNearbyRestaurants) {
      const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, gp.lat, gp.lng);
      if (dist > MAX_NEARBY_RADIUS_METERS) continue;

      const existingMatch = findDuplicateRestaurantForGooglePlace(gp, Array.from(mergedMap.values()));
      if (existingMatch) {
        mergedMap.set(existingMatch.id, mergeGoogleMapsPlaceWithExistingRestaurant(existingMatch, gp));
      } else {
        const converted = convertGooglePlaceToRestaurant(gp);
        mergedMap.set(converted.id, converted);
      }
    }

    return Array.from(mergedMap.values())
      .map(r => {
        const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, r.latitude, r.longitude);
        return { ...r, distanceMeters: dist };
      })
      .filter(r => r.distanceMeters <= MAX_NEARBY_RADIUS_METERS)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [restaurants, liveNearbyRestaurants, baseCoords]);

  // Merge & deduplicate Supabase destinations + Google Maps/Live 500m attractions, strictly within 500m, sorted nearest first
  const nearbyDestinations = useMemo(() => {
    const mergedMap = new Map<string, TouristDestination>();

    for (const d of destinations) {
      const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, d.latitude, d.longitude);
      if (dist <= MAX_NEARBY_RADIUS_METERS) {
        mergedMap.set(d.id, d);
      }
    }

    for (const gp of liveNearbyAttractions) {
      const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, gp.lat, gp.lng);
      if (dist > MAX_NEARBY_RADIUS_METERS) continue;

      const existingMatch = findDuplicateDestinationForGooglePlace(gp, Array.from(mergedMap.values()));
      if (!existingMatch) {
        const converted = convertGooglePlaceToDestination(gp);
        mergedMap.set(converted.id, converted);
      }
    }

    return Array.from(mergedMap.values())
      .map(d => {
        const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, d.latitude, d.longitude);
        return { ...d, distanceMeters: dist };
      })
      .filter(d => d.distanceMeters <= MAX_NEARBY_RADIUS_METERS)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [destinations, liveNearbyAttractions, baseCoords]);

  if (!isNearMeModalOpen) return null;

  const localizedManualProvince = translateProvince(manualProvince, language);
  const meterUnit = tr(language, 'ម៉ែត្រ', 'm', '米');

  const buildDirectionsUrl = (targetLat: number, targetLng: number, fallbackName: string, existingMapUrl?: string) => {
    if (Number.isFinite(targetLat) && Number.isFinite(targetLng) && Number.isFinite(baseCoords.lat) && Number.isFinite(baseCoords.lng)) {
      return `https://www.google.com/maps/dir/?api=1&origin=${baseCoords.lat},${baseCoords.lng}&destination=${targetLat},${targetLng}&travelmode=walking`;
    }
    return existingMapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackName)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#064E3B] to-[#047857] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-moul text-sm text-white">
                  {tr(language, 'នៅជិតខ្ញុំ (Near Me)', 'Near Me', '附近探索 (Near Me)')}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-[9px] font-bold text-emerald-200">
                  {providerBadge === 'google_maps_api'
                    ? 'Google Maps Live'
                    : providerBadge === 'online_cambodia_map'
                    ? '500m Street GPS'
                    : 'Smart Cache 500m'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-khmer">
                {tr(
                  language,
                  'ក្នុងរង្វង់ ៥០០ ម៉ែត្រពីទីតាំង GPS របស់អ្នក',
                  'Within 500m of your current GPS location',
                  '距离您当前 GPS 位置 500 米以内'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNearMeModalOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-100 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location GPS Status bar & Province Switcher */}
        <div className="px-3 pt-2.5 pb-2 bg-emerald-50/80 dark:bg-slate-800/80 border-b border-emerald-100 dark:border-slate-800 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <LocateFixed className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate font-khmer">
                {geoStatus === 'granted' && selectedPresetId === 'gps'
                  ? tr(
                      language,
                      `📍 GPS ផ្ទាល់ (${baseCoords.lat.toFixed(4)}, ${baseCoords.lng.toFixed(4)}) • ៥០០ម`,
                      `📍 Live GPS (${baseCoords.lat.toFixed(4)}, ${baseCoords.lng.toFixed(4)}) • 500m`,
                      `📍 实时 GPS (${baseCoords.lat.toFixed(4)}, ${baseCoords.lng.toFixed(4)}) • 500米`
                    )
                  : geoStatus === 'requesting'
                  ? tr(
                      language,
                      '⏳ កំពុងចាប់ទីតាំង GPS (រង្វង់ ៥០០ម)...',
                      '⏳ Acquiring GPS (500m radius)...',
                      '⏳ 正在获取 GPS（500米范围）...'
                    )
                  : tr(
                      language,
                      `ទីតាំង៖ ${localizedManualProvince} (${baseCoords.lat.toFixed(4)}, ${baseCoords.lng.toFixed(4)})`,
                      `Location: ${localizedManualProvince} (${baseCoords.lat.toFixed(4)}, ${baseCoords.lng.toFixed(4)})`,
                      `当前位置：${localizedManualProvince} (${baseCoords.lat.toFixed(4)}, ${baseCoords.lng.toFixed(4)})`
                    )}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <select
                value={manualProvince}
                onChange={e => handleProvinceChange(e.target.value)}
                className="text-[10px] font-bold font-khmer px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200"
              >
                {Object.keys(provinceCenters).map(p => (
                  <option key={p} value={p}>{translateProvince(p, language)}</option>
                ))}
              </select>
              <button
                onClick={() => requestLocation(true)}
                disabled={isLoadingNearby}
                className="px-2.5 py-1 rounded-lg bg-[#064E3B] hover:bg-[#047857] disabled:opacity-60 text-white text-[10px] font-bold font-khmer transition shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingNearby ? 'animate-spin' : ''}`} />
                <span>{tr(language, 'ចាប់ទីតាំងឡើងវិញ', 'Refresh GPS', '刷新定位')}</span>
              </button>
            </div>
          </div>

          {/* Real Phnom Penh 500m Hotspot Quick Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 font-khmer">
            <button
              onClick={() => requestLocation(false)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                selectedPresetId === 'gps'
                  ? 'bg-[#064E3B] text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
              }`}
            >
              <LocateFixed className="w-3 h-3" />
              <span>{tr(language, 'GPS របស់ខ្ញុំ', 'My GPS', '我的 GPS')}</span>
            </button>
            {PHNOM_PENH_SPOT_PRESETS.map(spot => (
              <button
                key={spot.id}
                onClick={() => handleSelectSpotPreset(spot)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                  selectedPresetId === spot.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-emerald-400'
                }`}
              >
                <MapPin className="w-2.5 h-2.5" />
                <span>{tr(language, spot.labelKh, spot.labelEn, spot.labelZh)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab switchers: Restaurants vs Destinations */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 shrink-0 font-khmer">
          <button
            onClick={() => setActiveType('restaurants')}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeType === 'restaurants'
                ? 'bg-white dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>{tr(language, 'ភោជនីយដ្ឋានជិតខ្ញុំ', 'Restaurants Near Me', '附近餐厅')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-[10px]">
              {nearbyRestaurants.length}
            </span>
          </button>

          <button
            onClick={() => setActiveType('destinations')}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeType === 'destinations'
                ? 'bg-white dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mountain className="w-4 h-4" />
            <span>{tr(language, 'កន្លែងដើរលេងជិតខ្ញុំ', 'Spots Near Me', '附近景点')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-[10px]">
              {nearbyDestinations.length}
            </span>
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar font-khmer">
          {isLoadingNearby && nearbyRestaurants.length === 0 && nearbyDestinations.length === 0 ? (
            <div className="py-14 px-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700 my-2">
              <Loader2 className="w-8 h-8 mx-auto mb-3 text-emerald-600 animate-spin" />
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 font-khmer">
                {tr(
                  language,
                  'កំពុងស្វែងរកទីតាំងពិតក្នុងរង្វង់ ៥០០ ម៉ែត្រ...',
                  'Searching real places within 500m...',
                  '正在搜索 500 米范围内的真实地点...'
                )}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tr(
                  language,
                  'កំពុងភ្ជាប់ទៅ Google Maps Platform & ផែនទីកម្ពុជា',
                  'Connecting to Google Maps Platform & Cambodia GPS directory',
                  '正在连接 Google Maps Platform 与柬埔寨地图数据'
                )}
              </p>
            </div>
          ) : activeType === 'restaurants' ? (
            nearbyRestaurants.length === 0 ? (
              <div className="py-12 px-4 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 my-2">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#064E3B] dark:text-emerald-400 shadow-xs">
                  <Compass className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1.5 font-khmer">
                  {tr(
                    language,
                    'រកមិនឃើញហាងក្នុងរង្វង់ ៥០០ ម៉ែត្រទេ',
                    'No shops found within 500m',
                    '500 米范围内未找到商家'
                  )}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-4 leading-relaxed font-khmer">
                  {tr(
                    language,
                    'មិនមានហាង ឬភោជនីយដ្ឋានក្នុងរង្វង់ ៥០០ ម៉ែត្រពីទីតាំង GPS របស់អ្នកឡើយ។ សូមសាកល្បងចាប់ទីតាំងឡើងវិញ ឬជ្រើសរើសតំបន់ខាងលើ។',
                    'No shops or restaurants were found within 500 meters of your current GPS location. Try refreshing your GPS or selecting an area above.',
                    '您当前 GPS 位置 500 米以内暂无餐厅或商铺。请尝试刷新定位或选择上方区域。'
                  )}
                </p>
                <button
                  onClick={() => requestLocation(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#064E3B] to-[#047857] hover:from-[#047857] hover:to-[#064E3B] text-white text-xs font-bold font-khmer rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <LocateFixed className="w-4 h-4" />
                  <span>{tr(language, 'ចាប់ទីតាំងឡើងវិញ', 'Refresh GPS', '刷新定位')}</span>
                </button>
              </div>
            ) : (
              nearbyRestaurants.map((r) => {
                const rLoc = getLocalizedRestaurant(r, language);
                const hasOfficialPhoto =
                  !r.photoUrl?.startsWith('data:image/svg+xml') &&
                  (r.googleMapsMeta?.hasOfficialGooglePhoto !== false);
                return (
                  <div
                    key={r.id}
                    className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs hover:border-emerald-500 transition space-y-2.5"
                  >
                    <div className="flex gap-3">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={r.photoUrl}
                          alt={rLoc.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = buildPlaceSpecificNoPhotoSvg(r.nameKh, r.provinceKh, 'restaurant');
                          }}
                        />
                        <span className="absolute bottom-0.5 right-1 bg-black/65 text-white/90 text-[7px] px-1 rounded-xs">
                          {hasOfficialPhoto
                            ? tr(language, 'រូបភាពហាង', 'Photo', '实景图')
                            : tr(language, 'ផែនទី GPS', 'GPS Map', '地图点')}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 
                            onClick={() => {
                              setSelectedRestaurant(r);
                              setIsNearMeModalOpen(false);
                            }}
                            className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-white truncate cursor-pointer hover:text-emerald-600"
                          >
                            {rLoc.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 text-[11px] font-black shrink-0">
                            📍 {r.distanceMeters} {meterUnit}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="font-bold text-[#059669] font-mono">{r.priceLevel || '$$'}</span>
                          <span>•</span>
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-bold">{r.rating > 0 ? r.rating.toFixed(1) : '4.5'}</span>
                          </div>
                          <span>•</span>
                          <span className="truncate">{rLoc.province}</span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                          {rLoc.address}
                        </p>
                      </div>
                    </div>

                    {/* Direct Directions & Details Action Buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <a
                        href={buildDirectionsUrl(r.latitude, r.longitude, `${r.nameKh} ${r.addressKh}`, r.mapUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 bg-gradient-to-r from-[#064E3B] to-[#047857] hover:from-[#047857] hover:to-[#064E3B] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5 text-emerald-300" />
                        <span>{tr(language, 'នាំផ្លូវ (Google Maps)', 'Directions Route', '路线导航 (Google 地图)')}</span>
                      </a>

                      {sanitizeDialablePhone(r.phone) && (
                        <a
                          href={`tel:${sanitizeDialablePhone(r.phone)}`}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 rounded-xl transition"
                          title={r.phone}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        onClick={() => {
                          setSelectedRestaurant(r);
                          setIsNearMeModalOpen(false);
                        }}
                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer"
                        title={tr(language, 'ព័ត៌មានលម្អិត', 'Details', '查看详情')}
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            nearbyDestinations.length === 0 ? (
              <div className="py-12 px-4 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 my-2">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#064E3B] dark:text-emerald-400 shadow-xs">
                  <Mountain className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1.5 font-khmer">
                  {tr(
                    language,
                    'រកមិនឃើញកន្លែងដើរលេងក្នុងរង្វង់ ៥០០ ម៉ែត្រទេ',
                    'No spots found within 500m',
                    '500 米范围内未找到景点'
                  )}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-4 leading-relaxed font-khmer">
                  {tr(
                    language,
                    'មិនមានកន្លែងកម្សាន្តក្នុងរង្វង់ ៥០០ ម៉ែត្រពីទីតាំង GPS របស់អ្នកឡើយ។ សូមសាកល្បងចាប់ទីតាំងឡើងវិញ ឬជ្រើសរើសតំបន់ខាងលើ។',
                    'No tourist spots were found within 500 meters of your current GPS location. Try refreshing your GPS or selecting an area above.',
                    '您当前 GPS 位置 500 米以内暂无旅游景点。请尝试刷新定位或选择上方区域。'
                  )}
                </p>
                <button
                  onClick={() => requestLocation(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#064E3B] to-[#047857] hover:from-[#047857] hover:to-[#064E3B] text-white text-xs font-bold font-khmer rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <LocateFixed className="w-4 h-4" />
                  <span>{tr(language, 'ចាប់ទីតាំងឡើងវិញ', 'Refresh GPS', '刷新定位')}</span>
                </button>
              </div>
            ) : (
              nearbyDestinations.map((d) => {
                const dLoc = getLocalizedDestination(d, language);
                const hasOfficialPhoto =
                  !d.photoUrl?.startsWith('data:image/svg+xml') &&
                  (d.googleMapsMeta?.hasOfficialGooglePhoto !== false);
                return (
                  <div
                    key={d.id}
                    className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs hover:border-emerald-500 transition space-y-2.5"
                  >
                    <div className="flex gap-3">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={d.photoUrl}
                          alt={dLoc.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = buildPlaceSpecificNoPhotoSvg(d.nameKh, d.provinceKh, 'tourism');
                          }}
                        />
                        <span className="absolute bottom-0.5 right-1 bg-black/65 text-white/90 text-[7px] px-1 rounded-xs">
                          {hasOfficialPhoto
                            ? tr(language, 'រូបភាពទីតាំង', 'Photo', '实景图')
                            : tr(language, 'ផែនទី GPS', 'GPS Map', '地图点')}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 
                            onClick={() => {
                              setSelectedDestination(d);
                              setIsNearMeModalOpen(false);
                            }}
                            className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-white truncate cursor-pointer hover:text-emerald-600"
                          >
                            {dLoc.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 text-[11px] font-black shrink-0">
                            📍 {d.distanceMeters} {meterUnit}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="font-bold text-emerald-600">{dLoc.category}</span>
                          <span>•</span>
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-bold">{d.rating > 0 ? d.rating.toFixed(1) : '4.6'}</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                          {dLoc.address || `${dLoc.province} - ${dLoc.entranceFee}`}
                        </p>
                      </div>
                    </div>

                    {/* Direct Navigation */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <a
                        href={buildDirectionsUrl(d.latitude, d.longitude, `${d.nameKh} ${d.provinceKh}`, d.mapUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 bg-gradient-to-r from-[#064E3B] to-[#047857] hover:from-[#047857] hover:to-[#064E3B] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5 text-emerald-300" />
                        <span>{tr(language, 'នាំផ្លូវ (Google Maps)', 'Directions Route', '路线导航 (Google 地图)')}</span>
                      </a>

                      <button
                        onClick={() => {
                          setSelectedDestination(d);
                          setIsNearMeModalOpen(false);
                        }}
                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer"
                        title={tr(language, 'ព័ត៌មានលម្អិត', 'Details', '查看详情')}
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
};

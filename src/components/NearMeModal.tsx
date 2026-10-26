import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Navigation, Compass, Store, Mountain, 
  Phone, Star, ArrowUpRight, LocateFixed 
} from 'lucide-react';
import { sanitizeDialablePhone } from '../services/googlePlacesService';
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

  // Request GPS with high accuracy
  const requestLocation = () => {
    setGeoStatus('requesting');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGeoStatus('granted');
        },
        error => {
          console.warn('Geolocation denied or error:', error.message);
          const fallback = provinceCenters[manualProvince] || provinceCenters['រាជធានីភ្នំពេញ'];
          setUserCoords(fallback);
          setGeoStatus('fallback');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      const fallback = provinceCenters[manualProvince] || provinceCenters['រាជធានីភ្នំពេញ'];
      setUserCoords(fallback);
      setGeoStatus('fallback');
    }
  };

  useEffect(() => {
    if (isNearMeModalOpen && !userCoords) {
      requestLocation();
    }
  }, [isNearMeModalOpen]);

  // Handle manual province switch if fallback
  const handleProvinceChange = (prov: string) => {
    setManualProvince(prov);
    const coords = provinceCenters[prov] || provinceCenters['រាជធានីភ្នំពេញ'];
    setUserCoords(coords);
  };

  // Sorted nearby restaurants strictly within 500 meters
  const nearbyRestaurants = useMemo(() => {
    const baseCoords = userCoords || provinceCenters[manualProvince] || provinceCenters['រាជធានីភ្នំពេញ'];
    return [...restaurants]
      .map(r => {
        const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, r.latitude, r.longitude);
        return { ...r, distanceMeters: dist };
      })
      .filter(r => r.distanceMeters <= MAX_NEARBY_RADIUS_METERS)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [restaurants, userCoords, manualProvince]);

  // Sorted nearby destinations strictly within 500 meters
  const nearbyDestinations = useMemo(() => {
    const baseCoords = userCoords || provinceCenters[manualProvince] || provinceCenters['រាជធានីភ្នំពេញ'];
    return [...destinations]
      .map(d => {
        const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, d.latitude, d.longitude);
        return { ...d, distanceMeters: dist };
      })
      .filter(d => d.distanceMeters <= MAX_NEARBY_RADIUS_METERS)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [destinations, userCoords, manualProvince]);

  if (!isNearMeModalOpen) return null;

  const localizedManualProvince = translateProvince(manualProvince, language);
  const meterUnit = tr(language, 'ម៉ែត្រ', 'm', '米');

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
              <h3 className="font-moul text-sm text-white">
                {tr(language, 'នៅជិតខ្ញុំ (Near Me)', 'Near Me', '附近探索 (Near Me)')}
              </h3>
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
        <div className="p-3 bg-emerald-50/80 dark:bg-slate-800/80 border-b border-emerald-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <LocateFixed className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate font-khmer">
              {geoStatus === 'granted' 
                ? tr(
                    language,
                    '📍 GPS ច្បាស់លាស់ • ក្នុងរង្វង់ ៥០០ ម៉ែត្រ',
                    '📍 Precise GPS • Within 500m radius',
                    '📍 GPS 精确定位 • 500 米以内'
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
                    `ទីតាំង៖ ${localizedManualProvince} (រង្វង់ ៥០០ម)`,
                    `Location: ${localizedManualProvince} (500m radius)`,
                    `当前位置：${localizedManualProvince}（500米以内）`
                  )}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {geoStatus === 'fallback' && (
              <select
                value={manualProvince}
                onChange={e => handleProvinceChange(e.target.value)}
                className="text-[10px] font-bold font-khmer px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200"
              >
                {Object.keys(provinceCenters).map(p => (
                  <option key={p} value={p}>{translateProvince(p, language)}</option>
                ))}
              </select>
            )}
            <button
              onClick={requestLocation}
              className="px-2 py-1 rounded-lg bg-[#064E3B] hover:bg-[#047857] text-white text-[10px] font-bold font-khmer transition shadow-2xs cursor-pointer"
            >
              {tr(language, 'ចាប់ទីតាំងឡើងវិញ', 'Refresh GPS', '刷新定位')}
            </button>
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
          {activeType === 'restaurants' ? (
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
                    'មិនមានហាង ឬភោជនីយដ្ឋានក្នុងរង្វង់ ៥០០ ម៉ែត្រពីទីតាំង GPS របស់អ្នកឡើយ។ សូមសាកល្បងចាប់ទីតាំងឡើងវិញ ឬផ្លាស់ទីទៅក្បែរហាង។',
                    'No shops or restaurants were found within 500 meters of your current GPS location. Try refreshing your GPS or moving closer.',
                    '您当前 GPS 位置 500 米以内暂无收录的餐厅或商铺。请尝试刷新定位或移动至附近。'
                  )}
                </p>
                <button
                  onClick={requestLocation}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#064E3B] to-[#047857] hover:from-[#047857] hover:to-[#064E3B] text-white text-xs font-bold font-khmer rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <LocateFixed className="w-4 h-4" />
                  <span>{tr(language, 'ចាប់ទីតាំងឡើងវិញ', 'Refresh GPS', '刷新定位')}</span>
                </button>
              </div>
            ) : (
              nearbyRestaurants.map((r) => {
                const rLoc = getLocalizedRestaurant(r, language);
                return (
                  <div
                    key={r.id}
                    className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs hover:border-emerald-500 transition space-y-2.5"
                  >
                    <div className="flex gap-3">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img src={r.photoUrl} alt={rLoc.name} className="w-full h-full object-cover" loading="lazy" />
                        <span className="absolute bottom-0.5 right-1 bg-black/60 text-white/80 text-[7px] px-1 rounded-xs">
                          {tr(language, 'រូបភាពយោង', 'Reference', '参考图')}
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
                          <span className="font-bold text-[#059669] font-mono">{r.priceLevel}</span>
                          <span>•</span>
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-bold">{r.rating}</span>
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
                        href={r.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(r.nameKh + ' ' + r.addressKh)}`}
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
                    'មិនមានកន្លែងកម្សាន្តក្នុងរង្វង់ ៥០០ ម៉ែត្រពីទីតាំង GPS របស់អ្នកឡើយ។ សូមសាកល្បងចាប់ទីតាំងឡើងវិញ។',
                    'No tourist spots were found within 500 meters of your current GPS location. Try refreshing your GPS.',
                    '您当前 GPS 位置 500 米以内暂无收录的旅游景点。请尝试刷新定位。'
                  )}
                </p>
                <button
                  onClick={requestLocation}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#064E3B] to-[#047857] hover:from-[#047857] hover:to-[#064E3B] text-white text-xs font-bold font-khmer rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <LocateFixed className="w-4 h-4" />
                  <span>{tr(language, 'ចាប់ទីតាំងឡើងវិញ', 'Refresh GPS', '刷新定位')}</span>
                </button>
              </div>
            ) : (
              nearbyDestinations.map((d) => {
                const dLoc = getLocalizedDestination(d, language);
                return (
                  <div
                    key={d.id}
                    className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs hover:border-emerald-500 transition space-y-2.5"
                  >
                    <div className="flex gap-3">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img src={d.photoUrl} alt={dLoc.name} className="w-full h-full object-cover" loading="lazy" />
                        <span className="absolute bottom-0.5 right-1 bg-black/60 text-white/80 text-[7px] px-1 rounded-xs">
                          {tr(language, 'រូបភាពយោង', 'Reference', '参考图')}
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
                            <span className="font-bold">{d.rating}</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                          {dLoc.province} - {dLoc.entranceFee}
                        </p>
                      </div>
                    </div>

                    {/* Direct Navigation */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <a
                        href={d.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(d.nameKh + ' ' + d.provinceKh)}`}
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

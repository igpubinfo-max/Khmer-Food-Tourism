import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  Navigation,
  Phone,
  Search,
  Compass,
  Sparkles,
  WifiOff,
  Wifi,
  Download,
  CheckCircle2,
  ListOrdered,
  Play,
  Square,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  Language,
  Restaurant,
  TouristDestination,
  TrendingFoodItem,
  sanitizeRestaurantShopPhoto,
} from '../types';
import { tr } from '../utils/i18n';
import { ShopAvatar } from './icons/DefaultShopIcon';
import { DefaultDestinationIcon } from './TouristCard';
import { PROVINCIAL_ADMIN_HISTORY_HOSPITALS } from '../data/provincialAdminPortsEmergencyData';
import { matchProvinceHub } from '../utils/destinationTravelInfo';
import {
  readSavedUserGpsDetailed,
  saveUserGps,
  isValidCambodiaGps,
} from '../utils/nearMeEngine';
import {
  TravelMode,
  ComputedRoadRoute,
  CAMBODIA_WATER_FEATURES,
  CAMBODIA_PARKS,
  CAMBODIA_ROAD_SEGMENTS,
  generateLocalStreetSegmentsAroundPin,
  computeOfflineRoadRoute,
  fetchOrComputeHybridRoadRoute,
  snapUserGpsToActiveRoute,
  computeBearingDeg,
  haversineKm,
  getCachedTileBlobUrl,
  saveTileBlob,
  fetchRealRoadTileBlob,
  getOfflinePackStatus,
  downloadOfflineMapPack,
} from '../utils/offlineCambodiaRoadEngine';

export const OFFLINE_CAMBODIA_MAP_EVENT = 'kft:open-offline-cambodia-map';

export interface OfflineMapOpenPayload {
  kind: 'destination' | 'restaurant' | 'trending';
  mode?: 'maps' | 'directions' | 'search';
  destination?: Partial<TouristDestination>;
  restaurant?: Partial<Restaurant>;
  trending?: Partial<TrendingFoodItem>;
  origin?: { lat: number; lng: number } | null;
}

export const openInAppOfflineCambodiaMap = (payload: OfflineMapOpenPayload): boolean => {
  if (typeof window === 'undefined') return false;
  window.dispatchEvent(new CustomEvent(OFFLINE_CAMBODIA_MAP_EVENT, { detail: payload }));
  return true;
};

interface MapPinEntry {
  id: string;
  kind: 'destination' | 'restaurant' | 'hotel' | 'hospital';
  nameKh: string;
  nameEn: string;
  provinceKh: string;
  provinceEn: string;
  categoryKh: string;
  categoryEn: string;
  lat: number;
  lng: number;
  photoUrl?: string;
  phone?: string;
  priceRange?: string;
  addressKh?: string;
  rawDestination?: TouristDestination;
  rawRestaurant?: Restaurant;
}

const PROVINCE_NODES: Array<{
  kh: string;
  en: string;
  lat: number;
  lng: number;
  isCapital?: boolean;
}> = [
  { kh: 'រាជធានីភ្នំពេញ', en: 'Phnom Penh', lat: 11.5564, lng: 104.9282, isCapital: true },
  { kh: 'សៀមរាប', en: 'Siem Reap', lat: 13.3633, lng: 103.8564 },
  { kh: 'ព្រះសីហនុ', en: 'Preah Sihanouk', lat: 10.6275, lng: 103.5221 },
  { kh: 'បាត់ដំបង', en: 'Battambang', lat: 13.0957, lng: 103.2022 },
  { kh: 'កំពត', en: 'Kampot', lat: 10.5942, lng: 104.1640 },
  { kh: 'កែប', en: 'Kep', lat: 10.4829, lng: 104.3167 },
  { kh: 'កំពង់ចាម', en: 'Kampong Cham', lat: 11.9934, lng: 105.4635 },
  { kh: 'កណ្តាល (តាខ្មៅ)', en: 'Ta Khmau (Kandal)', lat: 11.4833, lng: 104.9480 },
  { kh: 'កំពង់ឆ្នាំង', en: 'Kampong Chhnang', lat: 12.2500, lng: 104.6667 },
  { kh: 'កំពង់ស្ពឺ', en: 'Kampong Speu', lat: 11.4533, lng: 104.5208 },
  { kh: 'កំពង់ធំ', en: 'Kampong Thom', lat: 12.7111, lng: 104.8887 },
  { kh: 'កោះកុង', en: 'Koh Kong', lat: 11.6153, lng: 102.9838 },
  { kh: 'ក្រចេះ', en: 'Kratie', lat: 12.4881, lng: 106.0188 },
  { kh: 'មណ្ឌលគិរី', en: 'Mondulkiri', lat: 12.4558, lng: 107.1881 },
  { kh: 'រតនគិរី', en: 'Ratanakiri', lat: 13.7394, lng: 106.9872 },
  { kh: 'ព្រះវិហារ', en: 'Preah Vihear', lat: 13.8073, lng: 104.9805 },
  { kh: 'ពោធិ៍សាត់', en: 'Pursat', lat: 12.5388, lng: 103.9192 },
  { kh: 'ព្រៃវែង', en: 'Prey Veng', lat: 11.4868, lng: 105.3253 },
  { kh: 'ស្វាយរៀង', en: 'Svay Rieng', lat: 11.0879, lng: 105.7993 },
  { kh: 'តាកែវ', en: 'Takeo', lat: 10.9908, lng: 104.7850 },
  { kh: 'បន្ទាយមានជ័យ', en: 'Banteay Meanchey', lat: 13.5859, lng: 102.9737 },
  { kh: 'ឧត្តរមានជ័យ', en: 'Oddar Meanchey', lat: 14.1817, lng: 103.5176 },
  { kh: 'ប៉ៃលិន', en: 'Pailin', lat: 12.8489, lng: 102.6093 },
  { kh: 'ស្ទឹងត្រែង', en: 'Stung Treng', lat: 13.5259, lng: 105.9683 },
  { kh: 'ត្បូងឃ្មុំ', en: 'Tboung Khmum', lat: 11.8891, lng: 105.6550 },
];

const latLngToWorldPx = (lat: number, lng: number, zoom: number) => {
  const scale = 256 * Math.pow(2, zoom);
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  const x = ((lng + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
};

const worldPxToLatLng = (x: number, y: number, zoom: number) => {
  const scale = 256 * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    lat: Math.max(9.2, Math.min(15.2, lat)),
    lng: Math.max(101.8, Math.min(108.2, lng)),
  };
};

const getCompassDirection = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  language: Language
): { bearingDeg: number; label: string } => {
  const bearingDeg = Math.round(computeBearingDeg(lat1, lng1, lat2, lng2));
  const dirsKh = [
    'ទិសខាងជើង (N)',
    'ទិសឦសាន (NE)',
    'ទិសខាងកើត (E)',
    'ទិសអាគ្នេយ៍ (SE)',
    'ទិសខាងត្បូង (S)',
    'ទិសនិរតី (SW)',
    'ទិសខាងលិច (W)',
    'ទិសពាយ័ព្យ (NW)',
  ];
  const dirsEn = ['North (N)', 'Northeast (NE)', 'East (E)', 'Southeast (SE)', 'South (S)', 'Southwest (SW)', 'West (W)', 'Northwest (NW)'];
  const dirsZh = ['正北 (N)', '东北 (NE)', '正东 (E)', '东南 (SE)', '正南 (S)', '西南 (SW)', '正西 (W)', '西北 (NW)'];
  const idx = Math.round(bearingDeg / 45) % 8;
  return {
    bearingDeg,
    label: tr(language, dirsKh[idx], dirsEn[idx], dirsZh[idx]),
  };
};

const MAX_CACHED_TILE_IMAGES = 160;

export const OfflineCambodiaMapModal: React.FC = () => {
  const {
    language,
    destinations,
    restaurants,
    setSelectedDestination,
    setSelectedRestaurant,
    showToast,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isPageVisible, setIsPageVisible] = useState<boolean>(
    typeof document !== 'undefined' ? !document.hidden : true
  );
  const [filterKind, setFilterKind] = useState<
    'all' | 'destination' | 'restaurant' | 'hotel' | 'hospital'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');

  // Verified GPS state (strictly distinguishes real satellite fixes from default fallback)
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    isRealGps: boolean;
  }>(() => {
    const saved = readSavedUserGpsDetailed();
    if (saved && saved.isRealGps) {
      return { lat: saved.lat, lng: saved.lng, isRealGps: true };
    }
    return { lat: 11.5564, lng: 104.9282, isRealGps: false };
  });

  const [gpsStatus, setGpsStatus] = useState<
    'searching' | 'fixed' | 'recovering' | 'error' | 'denied'
  >(() => {
    const saved = readSavedUserGpsDetailed();
    return saved && saved.isRealGps ? 'fixed' : 'searching';
  });
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(() => {
    const saved = readSavedUserGpsDetailed();
    return saved?.accuracy ?? null;
  });
  const [compassHeading, setCompassHeading] = useState<number | null>(() => {
    const saved = readSavedUserGpsDetailed();
    return saved?.heading ?? null;
  });
  const [gpsRetryTick, setGpsRetryTick] = useState(0);
  const lastFixRef = useRef<{ lat: number; lng: number; acc: number; at: number } | null>(null);

  // Map Viewport State
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 11.5564,
    lng: 104.9282,
  });
  const [zoom, setZoom] = useState<number>(15);
  const [mapTheme, setMapTheme] = useState<'google-day' | 'night'>('google-day');
  const [showStepsPanel, setShowStepsPanel] = useState<boolean>(false);
  const [isNavigatingLive, setIsNavigatingLive] = useState<boolean>(false);
  const [isFollowingUserGps, setIsFollowingUserGps] = useState<boolean>(false);
  const [rerouteCount, setRerouteCount] = useState<number>(0);
  const [rerouteNotice, setRerouteNotice] = useState<string | null>(null);
  const [viewportHasCachedTiles, setViewportHasCachedTiles] = useState<boolean>(false);

  // Offline Map Download State
  const [isDownloadingMap, setIsDownloadingMap] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedTilesCount, setDownloadedTilesCount] = useState(0);

  // Hybrid OSRM / Offline A* Route State
  const [hybridRoute, setHybridRoute] = useState<ComputedRoadRoute | null>(null);

  // LRU Tile Image Cache for 60fps canvas rendering without memory leaks
  const tileImageCacheRef = useRef<Map<string, { img: HTMLImageElement; blobUrl?: string }>>(
    new Map()
  );
  const [tileRenderTick, setTileRenderTick] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startCenterWorldX: number;
    startCenterWorldY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startCenterWorldX: 0,
    startCenterWorldY: 0,
  });

  // Track online/offline & page visibility for battery saving
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onVisChange = () => setIsPageVisible(!document.hidden);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, []);

  // Build unified pins list
  const allPins = useMemo<MapPinEntry[]>(() => {
    const list: MapPinEntry[] = [];

    for (const d of destinations) {
      let lat = d.latitude;
      let lng = d.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number' || lat < 9.5 || lat > 15.2) {
        const hub = PROVINCE_NODES.find(
          (p) => (d.provinceKh || '').includes(p.kh) || p.kh.includes(d.provinceKh || '')
        );
        if (!hub) continue;
        lat = hub.lat + 0.005;
        lng = hub.lng + 0.005;
      }
      const isHotel =
        d.categorySlug === 'hotel' || (d.categoryEn || '').toLowerCase().includes('hotel');
      list.push({
        id: d.id,
        kind: isHotel ? 'hotel' : 'destination',
        nameKh: d.nameKh,
        nameEn: d.nameEn,
        provinceKh: d.provinceKh,
        provinceEn: d.provinceEn,
        categoryKh: d.categoryKh,
        categoryEn: d.categoryEn,
        lat,
        lng,
        photoUrl: (d.photoUrl || '').trim() || undefined,
        phone: d.phone,
        priceRange: d.priceRange,
        addressKh: d.addressKh,
        rawDestination: d,
      });
    }

    for (const r of restaurants) {
      let lat = r.latitude;
      let lng = r.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number' || lat < 9.5 || lat > 15.2) {
        const hub = PROVINCE_NODES.find(
          (p) => (r.provinceKh || '').includes(p.kh) || p.kh.includes(r.provinceKh || '')
        );
        if (!hub) continue;
        lat = hub.lat - 0.004;
        lng = hub.lng + 0.004;
      }
      const cleanPhoto = sanitizeRestaurantShopPhoto(
        r.id,
        (r.photoUrl || r.profileImage || '').trim()
      );
      list.push({
        id: r.id,
        kind: 'restaurant',
        nameKh: r.nameKh,
        nameEn: r.nameEn,
        provinceKh: r.provinceKh,
        provinceEn: r.provinceEn,
        categoryKh: r.categoryKh || 'ភោជនីយដ្ឋាន / ហាងម្ហូប',
        categoryEn: r.categoryEn || 'Restaurant / Shop',
        lat,
        lng,
        photoUrl: cleanPhoto || undefined,
        phone: r.phone,
        priceRange: r.priceLevel,
        addressKh: r.addressKh,
        rawRestaurant: r,
      });
    }

    for (const h of PROVINCIAL_ADMIN_HISTORY_HOSPITALS) {
      const hub = PROVINCE_NODES.find(
        (p) => p.kh.includes(h.provinceName.km) || h.provinceName.km.includes(p.kh)
      );
      if (!hub) continue;
      list.push({
        id: `hosp-${h.key}`,
        kind: 'hospital',
        nameKh: h.hospitalName.km,
        nameEn: h.hospitalName.en,
        provinceKh: h.provinceName.km,
        provinceEn: h.provinceName.en,
        categoryKh: 'មន្ទីរពេទ្យបង្អែកខេត្ត (សង្គ្រោះបន្ទាន់ 24 ម៉ោង)',
        categoryEn: 'Provincial Referral Hospital (24/7 Emergency)',
        lat: hub.lat + 0.008,
        lng: hub.lng + 0.008,
        phone: h.hospitalPhone,
        addressKh: h.hospitalAddress.km,
      });
    }

    return list;
  }, [destinations, restaurants]);

  // Apply real GPS fix with outlier/jitter filtering & compass heading extraction
  const applyGpsFix = (pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy, heading, speed } = pos.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (accuracy > 3500) return;

    const now = Date.now();
    const prev = lastFixRef.current;
    if (prev) {
      const dtSec = Math.max(0.2, (now - prev.at) / 1000);
      const movedMeters = haversineKm(prev.lat, prev.lng, latitude, longitude) * 1000;
      const impliedSpeedKmh = (movedMeters / dtSec) * 3.6;

      // Reject sudden impossible GPS teleportation glitches (> 200 km/h) when accuracy is worse
      if (impliedSpeedKmh > 200 && accuracy > prev.acc * 1.5 && dtSec < 12) return;
      // Ignore coarse cell-tower fix arriving right after a fine (<25m) satellite fix
      if (prev.acc <= 25 && accuracy > 120 && now - prev.at < 15000) return;
      // Battery/render throttle when stationary (< 2.5m movement and similar accuracy)
      if (!isNavigatingLive && movedMeters < 2.5 && Math.abs(accuracy - prev.acc) < 3) return;

      // Derive movement heading if hardware compass heading is absent and user moved > 4m
      if ((heading === null || !Number.isFinite(heading)) && movedMeters > 4) {
        setCompassHeading(Math.round(computeBearingDeg(prev.lat, prev.lng, latitude, longitude)));
      }
    }

    if (typeof heading === 'number' && Number.isFinite(heading) && heading >= 0) {
      setCompassHeading(Math.round(heading));
    }

    lastFixRef.current = { lat: latitude, lng: longitude, acc: accuracy, at: now };
    setUserLocation({ lat: latitude, lng: longitude, isRealGps: true });
    setGpsAccuracy(Math.max(3, Math.round(accuracy)));
    setGpsStatus('fixed');

    if (isValidCambodiaGps(latitude, longitude)) {
      saveUserGps({
        lat: latitude,
        lng: longitude,
        accuracy,
        heading,
        speed,
        isRealGps: true,
      });
    }
  };

  const requestDeviceGps = () => {
    setGpsStatus('searching');
    setGpsRetryTick((t) => t + 1);
  };

  // Device compass orientation listener (throttled to <= 4Hz & >= 5deg change to prevent 120Hz Canvas CPU/GPU overheating)
  useEffect(() => {
    if (!isOpen || !isPageVisible) return;
    let lastUpdateMs = 0;
    let lastHeadingDeg = -999;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const now = Date.now();
      if (now - lastUpdateMs < 250) return;
      const anyEv = e as any;
      let nextDeg: number | null = null;
      if (typeof anyEv.webkitCompassHeading === 'number' && Number.isFinite(anyEv.webkitCompassHeading)) {
        nextDeg = Math.round(anyEv.webkitCompassHeading);
      } else if (typeof e.alpha === 'number' && Number.isFinite(e.alpha)) {
        nextDeg = Math.round((360 - e.alpha) % 360);
      }
      if (nextDeg === null) return;
      const diff = Math.abs(nextDeg - lastHeadingDeg);
      const wrappedDiff = diff > 180 ? 360 - diff : diff;
      if (wrappedDiff < 5) return;
      lastUpdateMs = now;
      lastHeadingDeg = nextDeg;
      setCompassHeading(nextDeg);
    };
    window.addEventListener('deviceorientationabsolute' as any, handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute' as any, handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isOpen, isPageVisible]);

  // Sequentialized, battery-aware continuous real-GPS tracking (pauses when modal closed or backgrounded)
  useEffect(() => {
    if (!isOpen || !isPageVisible) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    let cancelled = false;
    let watchId: number | null = null;

    const onFix = (pos: GeolocationPosition) => {
      if (!cancelled) applyGpsFix(pos);
    };

    const onError = (err: GeolocationPositionError) => {
      if (cancelled) return;
      if (err.code === 1) {
        setGpsStatus('denied');
      } else if (lastFixRef.current) {
        setGpsStatus('recovering');
      } else {
        setGpsStatus('error');
      }
    };

    // Start single watchPosition with high accuracy to avoid clobbering Capacitor's single permissionListener
    watchId = navigator.geolocation.watchPosition(onFix, onError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: isNavigatingLive ? 0 : 3000,
    });

    return () => {
      cancelled = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOpen, isPageVisible, isNavigatingLive, gpsRetryTick]);

  const focusMapOnPlaceAndRoute = (
    targetLat: number,
    targetLng: number,
    mode?: 'maps' | 'directions' | 'search'
  ) => {
    setMapCenter({ lat: targetLat, lng: targetLng });
    setZoom(mode === 'maps' ? 15 : 15);
  };

  // Listen for global open event
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<OfflineMapOpenPayload>;
      const payload = custom.detail;
      if (!payload) return;

      const savedReal = readSavedUserGpsDetailed();
      if (savedReal && savedReal.isRealGps) {
        setUserLocation({ lat: savedReal.lat, lng: savedReal.lng, isRealGps: true });
        if (savedReal.accuracy) setGpsAccuracy(Math.round(savedReal.accuracy));
        setGpsStatus('fixed');
      } else {
        requestDeviceGps();
      }

      setFilterKind('all');
      setSearchQuery('');
      setShowStepsPanel(payload.mode === 'directions');
      setIsFollowingUserGps(false);

      if (payload.kind === 'destination' && payload.destination) {
        const d = payload.destination;
        setActivePinId(d.id || null);
        if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
          focusMapOnPlaceAndRoute(d.latitude, d.longitude, payload.mode);
        }
      } else if (payload.kind === 'restaurant' && payload.restaurant) {
        const r = payload.restaurant;
        setActivePinId(r.id || null);
        if (typeof r.latitude === 'number' && typeof r.longitude === 'number') {
          focusMapOnPlaceAndRoute(r.latitude, r.longitude, payload.mode);
        }
      } else if (payload.kind === 'trending' && payload.trending) {
        const t = payload.trending;
        const match = allPins.find(
          (p) =>
            p.id === t.id ||
            (typeof t.latitude === 'number' &&
              typeof t.longitude === 'number' &&
              Math.abs(p.lat - t.latitude) < 0.002 &&
              Math.abs(p.lng - t.longitude) < 0.002)
        );
        if (match) {
          setActivePinId(match.id);
          focusMapOnPlaceAndRoute(match.lat, match.lng, payload.mode);
        } else if (typeof t.latitude === 'number' && typeof t.longitude === 'number') {
          focusMapOnPlaceAndRoute(t.latitude, t.longitude, payload.mode);
        }
      }

      setIsOpen(true);
    };

    window.addEventListener(OFFLINE_CAMBODIA_MAP_EVENT, handler);
    return () => window.removeEventListener(OFFLINE_CAMBODIA_MAP_EVENT, handler);
  }, [allPins]);

  const activePin = useMemo<MapPinEntry | null>(() => {
    if (!activePinId) return allPins[0] || null;
    return allPins.find((p) => p.id === activePinId) || allPins[0] || null;
  }, [allPins, activePinId]);

  // Refresh offline tile count from IndexedDB v3
  useEffect(() => {
    if (!isOpen) return;
    getOfflinePackStatus().then((st) => {
      setDownloadedTilesCount(st.downloadedTilesCount);
    });
  }, [isOpen, activePin, tileRenderTick]);

  const visiblePins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPins.filter((p) => {
      if (p.id === activePinId) return true;
      if (filterKind !== 'all' && p.kind !== filterKind) return false;
      if (!q) return true;
      return (
        p.nameKh.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.provinceKh.toLowerCase().includes(q) ||
        p.provinceEn.toLowerCase().includes(q) ||
        (p.addressKh || '').toLowerCase().includes(q)
      );
    });
  }, [allPins, filterKind, searchQuery, activePinId]);

  // Immediate synchronous offline A* road-following route (zero latency!)
  const instantAstarRoute = useMemo<ComputedRoadRoute | null>(() => {
    if (!activePin) return null;
    return computeOfflineRoadRoute(
      userLocation.lat,
      userLocation.lng,
      activePin.lat,
      activePin.lng,
      activePin.nameKh,
      activePin.nameEn,
      activePin.addressKh,
      travelMode
    );
  }, [activePin, userLocation.lat, userLocation.lng, travelMode, rerouteCount]);

  // Upgrade route asynchronously with real OSRM geometry (online or IndexedDB cached)
  useEffect(() => {
    if (!isOpen || !activePin) return;
    let cancelled = false;
    fetchOrComputeHybridRoadRoute(
      userLocation.lat,
      userLocation.lng,
      activePin.lat,
      activePin.lng,
      activePin.nameKh,
      activePin.nameEn,
      activePin.addressKh,
      travelMode
    ).then((res) => {
      if (!cancelled) setHybridRoute(res);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, activePin, userLocation.lat, userLocation.lng, travelMode, isOnline, rerouteCount]);

  const roadRoute = hybridRoute || instantAstarRoute;

  // Live Road Snapping & Automatic Route Deviation Recalculation
  const activeRouteSnap = useMemo(() => {
    if (!roadRoute) return null;
    return snapUserGpsToActiveRoute(userLocation.lat, userLocation.lng, roadRoute);
  }, [userLocation.lat, userLocation.lng, roadRoute]);

  useEffect(() => {
    if (!isOpen || !activeRouteSnap || !userLocation.isRealGps) return;
    if (activeRouteSnap.isOffRoute && isNavigatingLive) {
      setRerouteCount((c) => c + 1);
      const msg = tr(
        language,
        '🔄 បានគណនាផ្លូវថ្មីដោយស្វ័យប្រវត្តិពីទីតាំង GPS បច្ចុប្បន្នរបស់អ្នក',
        '🔄 Auto-rerouted from your current GPS position',
        '🔄 已根据您当前的 GPS 位置自动重新规划路线'
      );
      setRerouteNotice(msg);
      const timer = setTimeout(() => setRerouteNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [
    isOpen,
    activeRouteSnap?.isOffRoute,
    isNavigatingLive,
    userLocation.isRealGps,
    language,
  ]);

  // Keep map centered on user when Follow Mode or Live Navigation is active
  useEffect(() => {
    if (!isOpen) return;
    if ((isNavigatingLive || isFollowingUserGps) && activeRouteSnap) {
      setMapCenter({
        lat: activeRouteSnap.snappedLat,
        lng: activeRouteSnap.snappedLng,
      });
    }
  }, [
    isOpen,
    isNavigatingLive,
    isFollowingUserGps,
    activeRouteSnap?.snappedLat,
    activeRouteSnap?.snappedLng,
  ]);

  const localStreets = useMemo(() => {
    if (!activePin) return [];
    const targetSegs = generateLocalStreetSegmentsAroundPin(
      activePin.lat,
      activePin.lng,
      activePin.addressKh,
      activePin.nameKh
    );
    const startSegs = generateLocalStreetSegmentsAroundPin(userLocation.lat, userLocation.lng);
    return [...targetSegs, ...startSegs];
  }, [activePin, userLocation.lat, userLocation.lng]);

  const nearbyAroundActive = useMemo(() => {
    if (!activePin) return [];
    return allPins
      .filter((p) => p.id !== activePin.id)
      .map((p) => ({
        pin: p,
        distKm: haversineKm(activePin.lat, activePin.lng, p.lat, p.lng),
      }))
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, 8);
  }, [allPins, activePin]);
  // LRU memory guard for tile images
  const cacheTileInMemory = (key: string, img: HTMLImageElement, blobUrl?: string) => {
    const map = tileImageCacheRef.current;
    if (map.size >= MAX_CACHED_TILE_IMAGES && !map.has(key)) {
      const oldestKey = map.keys().next().value;
      if (oldestKey) {
        const evicted = map.get(oldestKey);
        if (evicted?.blobUrl) {
          try {
            URL.revokeObjectURL(evicted.blobUrl);
          } catch {
            /* ignore */
          }
        }
        map.delete(oldestKey);
      }
    }
    map.set(key, { img, blobUrl });
  };

  // Handle Offline Map Download Button
  const handleDownloadOfflineMap = async () => {
    if (isDownloadingMap) return;
    setIsDownloadingMap(true);
    setDownloadProgress(5);
    const targetLat = activePin ? activePin.lat : mapCenter.lat;
    const targetLng = activePin ? activePin.lng : mapCenter.lng;
    const packId = activePin ? `pin-${activePin.id}` : 'cambodia-core-pack';

    try {
      const res = await downloadOfflineMapPack(
        targetLat,
        targetLng,
        packId,
        activePin?.addressKh,
        activePin?.nameKh,
        (pct) => setDownloadProgress(pct),
        userLocation.lat,
        userLocation.lng
      );
      const st = await getOfflinePackStatus();
      setDownloadedTilesCount(Math.max(res.totalSaved, st.downloadedTilesCount));
      setTileRenderTick((t) => t + 1);
      showToast(
        tr(
          language,
          `បានទាញយក និងរក្សាទុកផែនទីផ្លូវលម្អិត Offline ចំនួន ${res.totalSaved} ផ្ទាំង និងទិន្នន័យផ្លូវធ្វើដំណើរក្នុងទូរស័ព្ទជោគជ័យ!`,
          `Successfully saved ${res.totalSaved} detailed offline map tiles and road routes to your device!`,
          `已成功将 ${res.totalSaved} 张详细离线道路地图及路线保存到手机！`
        ),
        'success'
      );
    } finally {
      setIsDownloadingMap(false);
      setDownloadProgress(100);
    }
  };

  // Start / Stop Live Turn-by-Turn Navigation (uses real GPS when outdoors, or step progression)
  const handleToggleLiveNavigation = () => {
    if (!roadRoute || roadRoute.path.length < 2) return;
    if (isNavigatingLive) {
      setIsNavigatingLive(false);
      setIsFollowingUserGps(false);
      return;
    }
    setIsNavigatingLive(true);
    setIsFollowingUserGps(true);
    setZoom(16);
    if (userLocation.isRealGps) {
      setMapCenter({ lat: userLocation.lat, lng: userLocation.lng });
    } else {
      requestDeviceGps();
    }
  };

  // ============================================================================
  // HIGH-DPI GOOGLE-MAPS / TRIPADVISOR REAL TILE + VECTOR ROAD CANVAS RENDERER
  // ============================================================================
  useEffect(() => {
    if (!isOpen || !isPageVisible) return;
    const rafId = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const container = viewportRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(240, Math.floor(rect.height));
      const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);

      const intZoom = Math.max(7, Math.min(16, Math.round(zoom)));
      const centerWorld = latLngToWorldPx(mapCenter.lat, mapCenter.lng, intZoom);
      const toScreen = (lat: number, lng: number) => {
        const pt = latLngToWorldPx(lat, lng, intZoom);
        return {
          x: w / 2 + (pt.x - centerWorld.x),
          y: h / 2 + (pt.y - centerWorld.y),
        };
      };

      const isDay = mapTheme === 'google-day';
      const tileTheme: 'day' | 'dark' = isDay ? 'day' : 'dark';

      // 1. Base Background (Google Maps Warm Ivory or TripAdvisor Dark Navy-Slate #242B35)
      ctx.fillStyle = isDay ? '#F3EFE6' : '#242B35';
      ctx.fillRect(0, 0, w, h);

      // 2. Render Real Slippy Map Tiles (256x256) with Overzoom Parent Fallback
      const minTileX = Math.floor((centerWorld.x - w / 2) / 256);
      const maxTileX = Math.floor((centerWorld.x + w / 2) / 256);
      const minTileY = Math.floor((centerWorld.y - h / 2) / 256);
      const maxTileY = Math.floor((centerWorld.y + h / 2) / 256);

      let totalViewportCells = 0;
      let realTileCellsDrawn = 0;
      const uncachedTileRects: Array<{ x: number; y: number }> = [];

      for (let tx = minTileX; tx <= maxTileX; tx++) {
        for (let ty = minTileY; ty <= maxTileY; ty++) {
          totalViewportCells++;
          const key = `gmap/${intZoom}/${tx}/${ty}`;
          const screenX = Math.floor(w / 2 + (tx * 256 - centerWorld.x));
          const screenY = Math.floor(h / 2 + (ty * 256 - centerWorld.y));

          const cachedEntry = tileImageCacheRef.current.get(key);
          if (cachedEntry && cachedEntry.img.complete && cachedEntry.img.naturalWidth > 0) {
            ctx.save();
            if (!isDay) {
              ctx.filter = 'invert(90%) hue-rotate(185deg) saturate(82%) brightness(92%) contrast(96%)';
            }
            ctx.drawImage(cachedEntry.img, screenX, screenY, 256, 256);
            ctx.restore();
            realTileCellsDrawn++;
            continue;
          }

          // Check Overzoom Parent Tiles (z-1, z-2, z-3) for instant seamless display
          let drewOverzoomParent = false;
          for (let dz = 1; dz <= 3; dz++) {
            const pz = intZoom - dz;
            if (pz < 7) break;
            const scale = 1 << dz;
            const ptx = Math.floor(tx / scale);
            const pty = Math.floor(ty / scale);
            const pKey = `gmap/${pz}/${ptx}/${pty}`;
            const pEntry = tileImageCacheRef.current.get(pKey);
            if (pEntry && pEntry.img.complete && pEntry.img.naturalWidth > 0) {
              const subSize = 256 / scale;
              const sx = (tx % scale) * subSize;
              const sy = (ty % scale) * subSize;
              ctx.save();
              if (!isDay) {
                ctx.filter = 'invert(90%) hue-rotate(185deg) saturate(82%) brightness(92%) contrast(96%)';
              }
              ctx.drawImage(pEntry.img, sx, sy, subSize, subSize, screenX, screenY, 256, 256);
              ctx.restore();
              drewOverzoomParent = true;
              realTileCellsDrawn++;
              break;
            }
          }

          if (!drewOverzoomParent) {
            uncachedTileRects.push({ x: screenX, y: screenY });
          }

          if (!cachedEntry) {
            const placeholder = new Image();
            placeholder.crossOrigin = 'anonymous';
            cacheTileInMemory(key, placeholder);

            getCachedTileBlobUrl(intZoom, tx, ty, tileTheme).then((blobUrl) => {
              if (blobUrl) {
                cacheTileInMemory(key, placeholder, blobUrl);
                placeholder.onload = () => setTileRenderTick((t) => t + 1);
                placeholder.src = blobUrl;
              } else if (typeof navigator !== 'undefined' && navigator.onLine) {
                fetchRealRoadTileBlob(intZoom, tx, ty)
                  .then((blob) => {
                    if (blob) {
                      saveTileBlob(intZoom, tx, ty, blob, 'day');
                      const objUrl = URL.createObjectURL(blob);
                      cacheTileInMemory(key, placeholder, objUrl);
                      placeholder.onload = () => setTileRenderTick((t) => t + 1);
                      placeholder.src = objUrl;
                    }
                  })
                  .catch(() => {});
              }
            });
          }
        }
      }

      const hasRealTiles = realTileCellsDrawn > 0 && realTileCellsDrawn >= totalViewportCells * 0.5;
      if (hasRealTiles !== viewportHasCachedTiles) {
        setViewportHasCachedTiles(hasRealTiles);
      }

      // 3. When offline or viewing uncached tile cells, render our accurate Vector Road Network
      //    (Never paint fake grids or opaque horizontal boxes over real downloaded tiles!)
      if (realTileCellsDrawn < totalViewportCells) {
        // Clearly distinguish uncached offline tile cells from downloaded tile cells
        if (!isOnline && uncachedTileRects.length > 0 && realTileCellsDrawn > 0) {
          ctx.save();
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 1.2;
          for (const cell of uncachedTileRects) {
            ctx.strokeRect(cell.x + 1, cell.y + 1, 254, 254);
          }
          ctx.restore();
        }

        // Parks & Green Zones
        for (const park of CAMBODIA_PARKS) {
          const p = toScreen(park.lat, park.lng);
          const pEdge = toScreen(park.lat + park.radiusDegLat, park.lng + park.radiusDegLng);
          const rx = Math.max(12, Math.abs(pEdge.x - p.x));
          const ry = Math.max(10, Math.abs(pEdge.y - p.y));
          if (p.x + rx < 0 || p.x - rx > w || p.y + ry < 0 || p.y - ry > h) continue;
          ctx.fillStyle = isDay ? 'rgba(185, 230, 190, 0.75)' : 'rgba(16, 185, 129, 0.14)';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Tonle Sap Lake & Major Rivers
        const tsCenter = toScreen(12.88, 104.05);
        const tsEdge = toScreen(13.22, 104.45);
        const tsRx = Math.max(14, Math.abs(tsEdge.x - tsCenter.x));
        const tsRy = Math.max(9, Math.abs(tsEdge.y - tsCenter.y));
        ctx.save();
        ctx.translate(tsCenter.x, tsCenter.y);
        ctx.rotate((-28 * Math.PI) / 180);
        ctx.fillStyle = isDay ? '#90CAF9' : '#16222F';
        ctx.beginPath();
        ctx.ellipse(0, 0, tsRx, tsRy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        for (const river of CAMBODIA_WATER_FEATURES) {
          const riverWidth =
            intZoom >= 15 ? 26 : intZoom >= 13 ? 16 : intZoom >= 11 ? 9 : 4;
          ctx.strokeStyle = isDay ? '#81D4FA' : '#16222F';
          ctx.lineWidth = riverWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          river.points.forEach(([lat, lng], idx) => {
            const pt = toScreen(lat, lng);
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
        }

        // Render Real Cambodia Road Network (Two-Pass Casing + Fill)
        const allRoads = [...CAMBODIA_ROAD_SEGMENTS, ...localStreets];
        for (const pass of ['casing', 'fill'] as const) {
          for (const seg of allRoads) {
            if (seg.tier === 'street' && intZoom < 12) continue;
            if (seg.tier === 'boulevard' && intZoom < 10) continue;

            const innerW =
              seg.tier === 'expressway'
                ? intZoom >= 14 ? 9 : 5
                : seg.tier === 'national'
                ? intZoom >= 14 ? 8 : 4.5
                : seg.tier === 'boulevard'
                ? intZoom >= 14 ? 6.8 : 3.5
                : intZoom >= 15 ? 5.2 : 3.0;

            ctx.lineWidth = pass === 'casing' ? innerW + 2.4 : innerW;
            if (pass === 'casing') {
              ctx.strokeStyle = isDay
                ? seg.tier === 'street'
                  ? '#C8BFB0'
                  : '#C68B12'
                : '#1B222C';
            } else {
              ctx.strokeStyle =
                seg.tier === 'expressway'
                  ? isDay ? '#FF9800' : '#F59E0B'
                  : seg.tier === 'national'
                  ? isDay ? '#FBC02D' : '#D97706'
                  : seg.tier === 'boulevard'
                  ? isDay ? '#FFF176' : '#64748B'
                  : isDay ? '#FFFFFF' : '#475569';
            }

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            seg.points.forEach(([lat, lng], idx) => {
              const pt = toScreen(lat, lng);
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
          }
        }

        // Render Street & Highway Labels Rotated Along Actual Road Geometry
        const placedLabels: Array<[number, number]> = [];
        for (const seg of allRoads) {
          if (seg.tier === 'street' && intZoom < 13) continue;
          if (seg.tier === 'boulevard' && intZoom < 11) continue;

          for (let i = 0; i < seg.points.length - 1; i++) {
            const p1 = toScreen(seg.points[i][0], seg.points[i][1]);
            const p2 = toScreen(seg.points[i + 1][0], seg.points[i + 1][1]);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            if (midX < 40 || midX > w - 40 || midY < 24 || midY > h - 24) continue;
            const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (segLen < 60) continue;
            if (placedLabels.some(([lx, ly]) => Math.hypot(lx - midX, ly - midY) < 90)) continue;
            placedLabels.push([midX, midY]);

            let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            if (angle > Math.PI / 2) angle -= Math.PI;
            if (angle < -Math.PI / 2) angle += Math.PI;

            const labelText = (
              intZoom >= 14
                ? language === 'en'
                  ? seg.nameEn
                  : seg.nameKh
                : seg.code || (language === 'en' ? seg.nameEn : seg.nameKh)
            ).slice(0, 26);

            ctx.save();
            ctx.translate(midX, midY);
            ctx.rotate(angle);
            ctx.font = seg.tier === 'street' ? 'bold 10px sans-serif' : 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 3.2;
            ctx.strokeStyle = isDay ? '#FFFFFF' : '#18202A';
            ctx.strokeText(labelText, 0, 0);
            ctx.fillStyle =
              seg.tier === 'national' || seg.tier === 'expressway'
                ? isDay ? '#92400E' : '#FDE047'
                : isDay ? '#1E293B' : '#E2E8F0';
            ctx.fillText(labelText, 0, 0);
            ctx.restore();
          }
        }

        // Provincial Capital Markers at low zoom
        if (intZoom <= 11) {
          for (const hub of PROVINCE_NODES) {
            const pt = toScreen(hub.lat, hub.lng);
            if (pt.x < -20 || pt.x > w + 20 || pt.y < -20 || pt.y > h + 20) continue;
            ctx.fillStyle = hub.isCapital ? '#DC2626' : '#38BDF8';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, hub.isCapital ? 4.5 : 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = hub.isCapital ? 'bold 11.5px sans-serif' : 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = isDay ? '#FFFFFF' : '#0F172A';
            const name = language === 'en' ? hub.en : hub.kh;
            ctx.strokeText(name, pt.x, pt.y - 7);
            ctx.fillStyle = hub.isCapital ? (isDay ? '#991B1B' : '#FDE047') : isDay ? '#0F172A' : '#E2E8F0';
            ctx.fillText(name, pt.x, pt.y - 7);
          }
        }
      }

      // 4. Render Google-Maps-Style Blue Road-Following Route Polyline (#1A73E8 with #0D47A1 casing)
      if (roadRoute && roadRoute.path.length >= 2) {
        ctx.strokeStyle = '#0D47A1';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        roadRoute.path.forEach(([lat, lng], idx) => {
          const pt = toScreen(lat, lng);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();

        ctx.strokeStyle = '#1A73E8';
        ctx.lineWidth = 5.8;
        ctx.beginPath();
        roadRoute.path.forEach(([lat, lng], idx) => {
          const pt = toScreen(lat, lng);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();

        // Directional navigation chevrons along route
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < roadRoute.path.length - 1; i++) {
          const p1 = toScreen(roadRoute.path[i][0], roadRoute.path[i][1]);
          const p2 = toScreen(roadRoute.path[i + 1][0], roadRoute.path[i + 1][1]);
          const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          if (segLen < 35) continue;
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          ctx.save();
          ctx.translate(midX, midY);
          ctx.rotate(ang);
          ctx.beginPath();
          ctx.moveTo(4, 0);
          ctx.lineTo(-3, -3);
          ctx.lineTo(-1.5, 0);
          ctx.lineTo(-3, 3);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // 5. Render Nearby POI Pins
      for (const pin of visiblePins.slice(0, 300)) {
        if (activePin?.id === pin.id) continue;
        const pt = toScreen(pin.lat, pin.lng);
        if (pt.x < -10 || pt.x > w + 10 || pt.y < -10 || pt.y > h + 10) continue;

        const color =
          pin.kind === 'hospital'
            ? '#F43F5E'
            : pin.kind === 'hotel'
            ? '#38BDF8'
            : pin.kind === 'restaurant'
            ? '#F97316'
            : '#10B981';

        ctx.fillStyle = color;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, intZoom >= 14 ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 6. Render User Real GPS Blue Location Marker + Meter-Accurate Halo + Compass Direction Cone
      const displayUserLat =
        isNavigatingLive && activeRouteSnap ? activeRouteSnap.snappedLat : userLocation.lat;
      const displayUserLng =
        isNavigatingLive && activeRouteSnap ? activeRouteSnap.snappedLng : userLocation.lng;
      const uPt = toScreen(displayUserLat, displayUserLng);
      const gpsLive = userLocation.isRealGps || isNavigatingLive;

      // Accuracy radius circle scaled accurately to meters-per-pixel
      if (gpsLive && gpsAccuracy && gpsAccuracy > 5 && gpsAccuracy <= 250) {
        const metersPerPx =
          (156543.03392 * Math.cos((displayUserLat * Math.PI) / 180)) / Math.pow(2, intZoom);
        const accPx = Math.min(44, Math.max(12, gpsAccuracy / metersPerPx));
        ctx.fillStyle = 'rgba(26, 115, 232, 0.14)';
        ctx.strokeStyle = 'rgba(26, 115, 232, 0.42)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(uPt.x, uPt.y, accPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Directional Compass Heading Beam / Cone
      const effectiveHeading =
        compassHeading ?? (activeRouteSnap ? activeRouteSnap.bearingDeg : null);
      if (gpsLive && typeof effectiveHeading === 'number' && Number.isFinite(effectiveHeading)) {
        const rad = ((effectiveHeading - 90) * Math.PI) / 180;
        const spread = (28 * Math.PI) / 180;
        ctx.save();
        const grad = ctx.createRadialGradient(uPt.x, uPt.y, 4, uPt.x, uPt.y, 34);
        grad.addColorStop(0, 'rgba(26, 115, 232, 0.48)');
        grad.addColorStop(1, 'rgba(26, 115, 232, 0.0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(uPt.x, uPt.y);
        ctx.arc(uPt.x, uPt.y, 34, rad - spread, rad + spread);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Outer pulse ring
      ctx.fillStyle = gpsLive ? 'rgba(26, 115, 232, 0.28)' : 'rgba(148, 163, 184, 0.28)';
      ctx.beginPath();
      ctx.arc(uPt.x, uPt.y, 13, 0, Math.PI * 2);
      ctx.fill();

      // Inner Google Maps Blue Dot (#1A73E8)
      ctx.fillStyle = gpsLive ? '#1A73E8' : '#64748B';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(uPt.x, uPt.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 7. Render Active Destination Pin (TripAdvisor Signature Yellow Star Teardrop Pin ★)
      if (activePin) {
        const tPt = toScreen(activePin.lat, activePin.lng);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(tPt.x, tPt.y + 14, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#EAB308';
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tPt.x, tPt.y - 4, 14, Math.PI * 0.82, Math.PI * 0.18, false);
        ctx.lineTo(tPt.x, tPt.y + 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', tPt.x, tPt.y - 4);
        ctx.restore();

        const title = (language === 'en' ? activePin.nameEn : activePin.nameKh).slice(0, 28);
        ctx.font = 'bold 11px sans-serif';
        const boxW = Math.min(220, Math.max(110, ctx.measureText(title).width + 20));
        const boxX = Math.max(8, Math.min(w - boxW - 8, tPt.x - boxW / 2));
        const boxY = Math.max(8, tPt.y - 36);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxX, boxY, boxW, 22, 6);
        } else {
          ctx.rect(boxX, boxY, boxW, 22);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FEF08A';
        ctx.textAlign = 'center';
        ctx.fillText(title, boxX + boxW / 2, boxY + 14.5);
      }

      ctx.restore();
    });
    return () => cancelAnimationFrame(rafId);
  }, [
    isOpen,
    isPageVisible,
    isOnline,
    gpsAccuracy,
    gpsStatus,
    compassHeading,
    isNavigatingLive,
    activeRouteSnap,
    mapCenter,
    zoom,
    mapTheme,
    activePin,
    visiblePins,
    roadRoute,
    localStreets,
    userLocation,
    language,
    tileRenderTick,
    viewportHasCachedTiles,
  ]);
  if (!isOpen) return null;

  const totalDistanceKm =
    isNavigatingLive && activeRouteSnap
      ? activeRouteSnap.remainingDistanceKm
      : roadRoute
      ? roadRoute.totalDistanceKm
      : 0;
  const estMinutes =
    isNavigatingLive && activeRouteSnap
      ? activeRouteSnap.remainingMinutes
      : roadRoute
      ? roadRoute.estimatedMinutes
      : 3;
  const estHours = Math.floor(estMinutes / 60);
  const remMins = estMinutes % 60;
  const driveTimeLabel =
    estHours > 0
      ? tr(
          language,
          `≈ ${estHours} ម៉ោង ${remMins} នាទី`,
          `≈ ${estHours}h ${remMins}m`,
          `≈ ${estHours}小时${remMins}分`
        )
      : tr(
          language,
          `≈ ${estMinutes} នាទី`,
          `≈ ${estMinutes} mins`,
          `≈ ${estMinutes}分钟`
        );

  const etaClockString = (() => {
    const arrival = new Date(Date.now() + estMinutes * 60000);
    return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  })();

  const compassInfo = activePin
    ? getCompassDirection(
        userLocation.lat,
        userLocation.lng,
        activePin.lat,
        activePin.lng,
        language
      )
    : null;

  const matchedHub = activePin
    ? matchProvinceHub(activePin.provinceEn || activePin.provinceKh)
    : null;

  const activeNextStep =
    roadRoute && activeRouteSnap
      ? roadRoute.steps[activeRouteSnap.nextStepIndex] || roadRoute.steps[0]
      : roadRoute?.steps?.[0];

  return (
    <div className="fixed inset-0 z-[130] bg-slate-950/95 backdrop-blur-md flex flex-col overflow-hidden animate-fadeIn">
      {/* Top Header Bar */}
      <div
        style={{ paddingTop: 'max(var(--kft-safe-top, 0px), 0.6rem)' }}
        className="px-3.5 pb-2 bg-gradient-to-r from-[#064E3B] via-[#065F46] to-slate-900 border-b border-emerald-500/30 flex items-center justify-between gap-2 shrink-0"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                {tr(
                  language,
                  'ផែនទីផ្លូវថ្នល់កម្ពុជា Offline & នាំផ្លូវ',
                  'Cambodia Road Map & Offline Navigation',
                  '柬埔寨道路地图与离线导航'
                )}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isOnline
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                    : 'bg-amber-500 text-slate-950'
                }`}
              >
                {isOnline ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                {isOnline
                  ? tr(language, 'Online + រក្សាទុកផែនទី', 'Online + Map Cache', '在线+离线缓存')
                  : tr(language, 'គ្មានអ៊ីនធឺណិត (Offline Mode)', 'Offline Mode Active', '离线导航模式')}
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/85 truncate">
              {tr(
                language,
                `ផែនទីផ្លូវថ្នល់ពិតប្រាកដ ផ្លូវជាតិ ផ្លូវក្នុងក្រុង និងទីតាំង ${allPins.length} កន្លែង`,
                `Accurate street network, national highways & ${allPins.length} verified places`,
                `真实街道网络、国家公路及 ${allPins.length} 个地点`
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsNavigatingLive(false);
            setIsOpen(false);
          }}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 cursor-pointer"
          aria-label="Close offline map"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search + Offline Download Bar + Category Filter + Travel Mode Selector */}
      <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  const firstMatch = visiblePins.find((p) => p.id !== activePinId) || visiblePins[0];
                  if (firstMatch) {
                    setIsFollowingUserGps(false);
                    setActivePinId(firstMatch.id);
                    setMapCenter({ lat: firstMatch.lat, lng: firstMatch.lng });
                    setZoom(15);
                    setSearchQuery('');
                  }
                }
              }}
              placeholder={tr(
                language,
                'ស្វែងរកហាង ផ្លូវ រមណីយដ្ឋាន សណ្ឋាគារ ឬខេត្ត...',
                'Search shop, street, attraction, hotel, or province...',
                '搜索餐厅、街道、景点、酒店或省份...'
              )}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
            {searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-56 overflow-y-auto rounded-xl bg-slate-900 border border-emerald-500/40 shadow-2xl divide-y divide-slate-800">
                {visiblePins
                  .filter((p) => {
                    const q = searchQuery.trim().toLowerCase();
                    return (
                      p.nameKh.toLowerCase().includes(q) ||
                      p.nameEn.toLowerCase().includes(q) ||
                      p.provinceKh.toLowerCase().includes(q) ||
                      p.provinceEn.toLowerCase().includes(q) ||
                      (p.addressKh || '').toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 8)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setIsFollowingUserGps(false);
                        setActivePinId(p.id);
                        setMapCenter({ lat: p.lat, lng: p.lng });
                        setZoom(15);
                        setSearchQuery('');
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {p.kind === 'restaurant' ? '🍜 ' : p.kind === 'hotel' ? '🏨 ' : p.kind === 'hospital' ? '🏥 ' : '🏛️ '}
                          {language === 'en' ? p.nameEn : p.nameKh}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {p.addressKh || p.provinceKh}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 shrink-0">
                        {haversineKm(userLocation.lat, userLocation.lng, p.lat, p.lng).toFixed(1)} km
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadOfflineMap}
            disabled={isDownloadingMap}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-extrabold text-[11px] flex items-center gap-1.5 shrink-0 shadow cursor-pointer"
          >
            {isDownloadingMap ? (
              <>
                <Download className="w-3.5 h-3.5 animate-bounce" />
                <span>{downloadProgress}%</span>
              </>
            ) : downloadedTilesCount > 0 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-950" />
                <span>
                  {tr(
                    language,
                    `ទាញយក Offline (${downloadedTilesCount})`,
                    `Offline Ready (${downloadedTilesCount})`,
                    `已缓存 (${downloadedTilesCount})`
                  )}
                </span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>
                  {tr(language, 'ទាញយកផែនទី Offline', 'Download Offline Map', '下载离线地图')}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Category Pills + Travel Mode Pills (Driving / Cycling / Walking) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            {(
              [
                { id: 'all', kh: '🗺️ ទាំងអស់', en: '🗺️ All', zh: '🗺️ 全部' },
                { id: 'destination', kh: '🏛️ រមណីយដ្ឋាន', en: '🏛️ Tourism', zh: '🏛️ 景点' },
                { id: 'restaurant', kh: '🍜 ហាងម្ហូប', en: '🍜 Shops', zh: '🍜 餐厅' },
                { id: 'hotel', kh: '🏨 សណ្ឋាគារ', en: '🏨 Hotels', zh: '🏨 酒店' },
                { id: 'hospital', kh: '🏥 មន្ទីរពេទ្យ', en: '🏥 Hospitals', zh: '🏥 医院' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterKind(tab.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition cursor-pointer ${
                  filterKind === tab.id
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tr(language, tab.kh, tab.en, tab.zh)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-full border border-slate-700 shrink-0">
            {(
              [
                { mode: 'driving' as TravelMode, kh: '🚗 រថយន្ត/ម៉ូតូ', en: '🚗 Drive', zh: '🚗 驾车' },
                { mode: 'cycling' as TravelMode, kh: '🚲 កង់', en: '🚲 Cycle', zh: '🚲 骑行' },
                { mode: 'walking' as TravelMode, kh: '🚶 ថ្មើរជើង', en: '🚶 Walk', zh: '🚶 步行' },
              ]
            ).map((m) => (
              <button
                key={m.mode}
                type="button"
                onClick={() => setTravelMode(m.mode)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition cursor-pointer ${
                  travelMode === m.mode
                    ? 'bg-sky-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tr(language, m.kh, m.en, m.zh)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Slippy Road Map Canvas Viewport */}
      <div
        ref={viewportRef}
        className="relative flex-1 min-h-[250px] bg-[#242B35] overflow-hidden select-none touch-none"
        onPointerDown={(e) => {
          const intZ = Math.max(7, Math.min(16, Math.round(zoom)));
          const cw = latLngToWorldPx(mapCenter.lat, mapCenter.lng, intZ);
          dragRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            startCenterWorldX: cw.x,
            startCenterWorldY: cw.y,
          };
        }}
        onPointerMove={(e) => {
          if (!dragRef.current.active) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          if (Math.hypot(dx, dy) > 8 && isFollowingUserGps) {
            setIsFollowingUserGps(false);
          }
          const intZ = Math.max(7, Math.min(16, Math.round(zoom)));
          const nextLatLng = worldPxToLatLng(
            dragRef.current.startCenterWorldX - dx,
            dragRef.current.startCenterWorldY - dy,
            intZ
          );
          setMapCenter(nextLatLng);
        }}
        onPointerUp={(e) => {
          const moved = Math.hypot(
            e.clientX - dragRef.current.startX,
            e.clientY - dragRef.current.startY
          );
          dragRef.current.active = false;
          if (moved < 6 && viewportRef.current) {
            const rect = viewportRef.current.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const w = rect.width;
            const h = rect.height;
            const intZ = Math.max(7, Math.min(16, Math.round(zoom)));
            const cw = latLngToWorldPx(mapCenter.lat, mapCenter.lng, intZ);

            let bestPin: MapPinEntry | null = null;
            let bestDist = 24;
            for (const p of visiblePins) {
              const pw = latLngToWorldPx(p.lat, p.lng, intZ);
              const sx = w / 2 + (pw.x - cw.x);
              const sy = h / 2 + (pw.y - cw.y);
              const d = Math.hypot(sx - clickX, sy - clickY);
              if (d < bestDist) {
                bestDist = d;
                bestPin = p;
              }
            }
            if (bestPin) {
              setActivePinId(bestPin.id);
              setMapCenter({ lat: bestPin.lat, lng: bestPin.lng });
            }
          }
        }}
      >
        <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />
        {/* Live Turn-by-Turn Top Navigation Maneuver Banner (when active) */}
        {isNavigatingLive && activeNextStep && (
          <div className="absolute top-2.5 left-2.5 right-14 z-20 px-3 py-2 rounded-2xl bg-emerald-950/95 border-2 border-emerald-400/80 shadow-xl text-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-black text-base flex items-center justify-center shrink-0">
                {activeNextStep.turnType === 'left' || activeNextStep.turnType === 'slight-left'
                  ? '↰'
                  : activeNextStep.turnType === 'right' || activeNextStep.turnType === 'slight-right'
                  ? '↱'
                  : activeNextStep.turnType === 'u-turn'
                  ? '↶'
                  : activeNextStep.turnType === 'arrive'
                  ? '🏁'
                  : '↑'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-amber-300 truncate">
                  {language === 'en'
                    ? activeNextStep.instructionEn
                    : language === 'zh'
                    ? activeNextStep.instructionZh
                    : activeNextStep.instructionKh}
                </div>
                <div className="text-[11px] text-emerald-200 font-semibold">
                  {activeRouteSnap && activeRouteSnap.distanceToNextTurnMeters > 0
                    ? `${activeRouteSnap.distanceToNextTurnMeters} m • `
                    : ''}
                  {tr(language, 'ម៉ោងទៅដល់ប៉ាន់ស្មាន', 'ETA', '预计到达')}: {etaClockString}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setRerouteCount((c) => c + 1);
                requestDeviceGps();
              }}
              className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
              title="Recalculate Route"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Auto-Rerouting Toast Banner */}
        {rerouteNotice && (
          <div className="absolute top-16 left-3 right-14 z-20 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-extrabold shadow-lg">
            {rerouteNotice}
          </div>
        )}

        {/* Quick Street Zoom vs Full Route View Buttons */}
        {!isNavigatingLive && activePin && (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setIsFollowingUserGps(false);
                setMapCenter({ lat: activePin.lat, lng: activePin.lng });
                setZoom(15);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-sky-600/95 hover:bg-sky-500 text-white text-[11px] font-bold shadow-lg border border-white/20 cursor-pointer"
            >
              🔍 {tr(language, 'ផ្លូវលម្អិតជុំវិញហាង', 'Zoom to Shop Streets', '放大周边街道')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFollowingUserGps(false);
                setMapCenter({
                  lat: (activePin.lat + userLocation.lat) / 2,
                  lng: (activePin.lng + userLocation.lng) / 2,
                });
                const dist = haversineKm(
                  userLocation.lat,
                  userLocation.lng,
                  activePin.lat,
                  activePin.lng
                );
                setZoom(dist > 80 ? 8 : dist > 20 ? 11 : 13);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 text-[11px] font-bold shadow-lg border border-amber-400/30 cursor-pointer"
            >
              🛣️ {tr(language, 'មើលផ្លូវធ្វើដំណើរសរុប', 'Full Route Overview', '查看完整路线')}
            </button>
          </div>
        )}

        {/* Floating Zoom, Theme & GPS Controls */}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(16, z + 1))}
            className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(7, z - 1))}
            className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setMapTheme((t) => (t === 'google-day' ? 'night' : 'google-day'))
            }
            className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700 text-amber-300 flex items-center justify-center shadow-lg hover:bg-slate-800 cursor-pointer"
            title="Toggle Day / Night Road Map Style"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              requestDeviceGps();
              setIsFollowingUserGps(true);
              setMapCenter({ lat: userLocation.lat, lng: userLocation.lng });
              setZoom(15);
            }}
            className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-lg cursor-pointer ${
              isFollowingUserGps
                ? 'bg-sky-600 border-2 border-white'
                : 'bg-emerald-600/95 border border-emerald-400/50 hover:bg-emerald-500'
            }`}
            title="Center on my real GPS location"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>

        {/* Live GPS Status Pill + Downloaded vs Uncached Offline Data Indicator */}
        <div className="absolute left-2.5 bottom-10 flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              requestDeviceGps();
              setIsFollowingUserGps(true);
              setMapCenter({ lat: userLocation.lat, lng: userLocation.lng });
              setZoom(15);
            }}
            className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 shadow-lg cursor-pointer ${
              userLocation.isRealGps && gpsStatus === 'fixed'
                ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-200'
                : gpsStatus === 'denied'
                ? 'bg-rose-950/90 border-rose-400/60 text-rose-200'
                : 'bg-slate-900/90 border-amber-400/50 text-amber-200'
            }`}
          >
            <LocateFixed
              className={`w-3 h-3 ${
                gpsStatus === 'searching' ? 'animate-spin text-amber-300' : 'text-emerald-400'
              }`}
            />
            <span>
              {userLocation.isRealGps && gpsStatus === 'fixed'
                ? tr(
                    language,
                    `GPS ត្រឹមត្រូវ${gpsAccuracy ? ` ±${gpsAccuracy} ម` : ''}${
                      compassHeading !== null ? ` • ${compassHeading}°` : ''
                    }`,
                    `GPS Locked${gpsAccuracy ? ` ±${gpsAccuracy}m` : ''}${
                      compassHeading !== null ? ` • ${compassHeading}°` : ''
                    }`,
                    `GPS 已定位${gpsAccuracy ? ` ±${gpsAccuracy}米` : ''}`
                  )
                : gpsStatus === 'recovering'
                ? tr(
                    language,
                    'សញ្ញា GPS ខ្សោយ - កំពុងភ្ជាប់ឡើងវិញ...',
                    'GPS signal weak - recovering...',
                    'GPS 信号弱 - 正在恢复...'
                  )
                : gpsStatus === 'denied'
                ? tr(
                    language,
                    'សូមបើកសិទ្ធិ GPS ក្នុងទូរស័ព្ទ',
                    'Tap to enable GPS permission',
                    '请开启手机 GPS 权限'
                  )
                : tr(
                    language,
                    'កំពុងស្វែងរកផ្កាយរណប GPS... (ចុចទីនេះ)',
                    'Acquiring GPS satellites... (Tap)',
                    '正在搜索 GPS 卫星...'
                  )}
            </span>
          </button>

          <span
            className={`px-2 py-1 rounded-xl border text-[10px] font-bold shadow-lg ${
              viewportHasCachedTiles
                ? 'bg-slate-900/90 border-emerald-400/50 text-emerald-300'
                : 'bg-slate-900/90 border-amber-400/50 text-amber-300'
            }`}
          >
            {viewportHasCachedTiles
              ? tr(
                  language,
                  '✓ ផែនទីផ្លូវលម្អិតពេញលេញ',
                  '✓ Detailed Map Tiles Active',
                  '✓ 详细街道瓦片已加载'
                )
              : tr(
                  language,
                  '⚡ ផ្លូវវ៉ិចទ័រ Offline (មិនទាន់ទាញយកផ្ទាំងលម្អិត)',
                  '⚡ Offline Vector Roads (Uncached Tiles)',
                  '⚡ 离线矢量道路模式'
                )}
          </span>
        </div>

        {/* Map Legend Strip */}
        <div className="absolute left-2.5 bottom-2 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center gap-2.5 text-[10px] text-slate-200">
          <span className="font-bold text-amber-300">Zoom {Math.round(zoom)}x</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1 rounded bg-[#1A73E8] inline-block" />{' '}
            {tr(language, 'ផ្លូវនាំទិស', 'Route', '路线')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1A73E8] border border-white inline-block" />{' '}
            GPS
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />{' '}
            {tr(language, 'ហាងម្ហូប', 'Shops', '餐厅')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{' '}
            {tr(language, 'ទេសចរណ៍', 'Tourism', '旅游')}
          </span>
        </div>
      </div>

      {/* Selected Location & Turn-by-Turn Road Navigation Drawer */}
      {activePin && (
        <div
          style={{ paddingBottom: 'max(var(--kft-safe-bottom, 0px), 0.75rem)' }}
          className="px-3.5 pt-3 bg-slate-900 border-t border-emerald-500/30 space-y-2.5 shrink-0 max-h-[50vh] overflow-y-auto"
        >
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
              {activePin.photoUrl ? (
                <img
                  src={activePin.photoUrl}
                  alt={activePin.nameKh}
                  className="w-full h-full object-cover"
                />
              ) : activePin.rawRestaurant ? (
                <ShopAvatar
                  restaurant={activePin.rawRestaurant}
                  alt={activePin.nameKh}
                  className="w-full h-full object-cover"
                />
              ) : activePin.rawDestination ? (
                <DefaultDestinationIcon
                  destination={activePin.rawDestination}
                  categorySlug={activePin.rawDestination.categorySlug}
                  className="w-full h-full rounded-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl bg-rose-950 text-rose-200">
                  🏥
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  📍 {language === 'en' ? activePin.provinceEn : activePin.provinceKh}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30">
                  {language === 'en' ? activePin.categoryEn : activePin.categoryKh}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                {language === 'en' ? activePin.nameEn : activePin.nameKh}
              </h3>
              {activePin.addressKh && (
                <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                  {activePin.addressKh}
                </p>
              )}
              <p className="text-[10px] text-emerald-300/90 font-mono mt-0.5">
                GPS: {activePin.lat.toFixed(5)}, {activePin.lng.toFixed(5)}
              </p>
            </div>
          </div>

          {/* Road Route Distance, Travel Time / ETA & Compass Strip */}
          <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-800/90 border border-slate-700 text-center">
            <div>
              <div className="text-[10px] text-slate-400">
                {tr(language, 'ចម្ងាយតាមផ្លូវថ្នល់', 'Road Distance', '道路距离')}
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-emerald-400">
                {totalDistanceKm} km
              </div>
            </div>
            <div className="border-x border-slate-700 px-1">
              <div className="text-[10px] text-slate-400">
                {tr(language, 'រយៈពេល & ម៉ោងទៅដល់', 'Time & ETA', '预计耗时与到达')}
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-amber-300">
                {driveTimeLabel} ({etaClockString})
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">
                {tr(language, 'ទិសដៅត្រីវិស័យ', 'Compass', '罗盘方向')}
              </div>
              <div className="text-[11px] sm:text-xs font-extrabold text-sky-300 truncate">
                {compassInfo?.label} ({compassInfo?.bearingDeg}°)
              </div>
            </div>
          </div>

          {/* Active Road Route Summary & Turn-by-Turn Steps Panel */}
          {roadRoute && (
            <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-[11px] text-emerald-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-amber-300 flex items-center gap-1.5 min-w-0">
                  <span>🛣️</span>
                  <span className="truncate">
                    {language === 'en'
                      ? roadRoute.mainRoadsSummaryEn
                      : language === 'zh'
                      ? roadRoute.mainRoadsSummaryZh
                      : roadRoute.mainRoadsSummaryKh}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStepsPanel((s) => !s)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>
                    {showStepsPanel
                      ? tr(language, 'លាក់ជំហានផ្លូវ', 'Hide Steps', '隐藏步骤')
                      : tr(
                          language,
                          `មើលជំហានបត់ផ្លូវ (${roadRoute.steps.length})`,
                          `Turn-by-Turn (${roadRoute.steps.length})`,
                          `导航步骤 (${roadRoute.steps.length})`
                        )}
                  </span>
                </button>
              </div>

              {matchedHub && (
                <div className="text-[10px] text-slate-300">
                  {language === 'en'
                    ? matchedHub.nationalRoadEn
                    : language === 'zh'
                    ? matchedHub.nationalRoadZh
                    : matchedHub.nationalRoadKh}
                </div>
              )}

              {showStepsPanel && (
                <div className="pt-1.5 border-t border-emerald-500/20 space-y-1.5 max-h-36 overflow-y-auto">
                  {roadRoute.steps.map((st, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setIsFollowingUserGps(false);
                        setMapCenter({ lat: st.coord[0], lng: st.coord[1] });
                        setZoom(15);
                      }}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900/75 hover:bg-slate-800 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {st.turnType === 'depart'
                            ? '🚗'
                            : st.turnType === 'arrive'
                            ? '🏁'
                            : st.turnType === 'left' || st.turnType === 'slight-left'
                            ? '↰'
                            : st.turnType === 'right' || st.turnType === 'slight-right'
                            ? '↱'
                            : '↑'}
                        </span>
                        <span className="truncate font-medium text-white">
                          {language === 'en'
                            ? st.instructionEn
                            : language === 'zh'
                            ? st.instructionZh
                            : st.instructionKh}
                        </span>
                      </div>
                      {st.distanceKm > 0 && (
                        <span className="text-[10px] font-mono text-amber-300 shrink-0">
                          {st.distanceKm} km
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleToggleLiveNavigation}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer ${
                isNavigatingLive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              {isNavigatingLive ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span>
                    {tr(language, 'បញ្ឈប់ការនាំផ្លូវផ្ទាល់', 'Stop Live Navigation', '停止实时导航')}
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span>
                    {tr(
                      language,
                      'ចាប់ផ្តើមនាំផ្លូវផ្ទាល់តាម GPS (Online/Offline)',
                      'Start Live GPS Road Navigation',
                      '开始 GPS 实时道路导航'
                    )}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadOfflineMap}
              disabled={isDownloadingMap}
              className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>
                {isDownloadingMap
                  ? tr(
                      language,
                      `កំពុងទាញយកផែនទី Offline (${downloadProgress}%)...`,
                      `Saving Offline Map (${downloadProgress}%)...`,
                      `正在保存离线地图 (${downloadProgress}%)...`
                    )
                  : tr(
                      language,
                      'រក្សាទុកផែនទីផ្លូវតំបន់នេះក្នុងទូរស័ព្ទ (Offline)',
                      'Save Detailed Street Map Offline',
                      '保存此区域详细离线街道图'
                    )}
              </span>
            </button>

            {(activePin.rawDestination || activePin.rawRestaurant) && (
              <button
                type="button"
                onClick={() => {
                  if (activePin.rawDestination) {
                    setSelectedDestination(activePin.rawDestination);
                  } else if (activePin.rawRestaurant) {
                    setSelectedRestaurant(activePin.rawRestaurant);
                  }
                  setIsOpen(false);
                }}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  {tr(
                    language,
                    'មើលរូបភាព និងព័ត៌មានលម្អិតក្នុង App',
                    'View Full Photos & Details in App',
                    '在应用内查看完整图片与详情'
                  )}
                </span>
              </button>
            )}

            {activePin.phone && (
              <a
                href={`tel:${activePin.phone.replace(/\s+/g, '')}`}
                className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 fill-white shrink-0" />
                <span>
                  {tr(
                    language,
                    `ហៅទូរស័ព្ទ (${activePin.phone})`,
                    `Call (${activePin.phone})`,
                    `致电 (${activePin.phone})`
                  )}
                </span>
              </a>
            )}
          </div>

          {nearbyAroundActive.length > 0 && (
            <div className="pt-1">
              <div className="text-[11px] font-bold text-slate-300 mb-1.5">
                📍{' '}
                {tr(
                  language,
                  'ហាង និងរមណីយដ្ឋាននៅជិតទីតាំងនេះ (ចុចដើម្បីមើលផ្លូវ និងរូបភាព)៖',
                  'Nearby Shops & Attractions (Tap to switch pin):',
                  '附近餐厅与景点（点击切换）：'
                )}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {nearbyAroundActive.map(({ pin, distKm }) => (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={() => {
                      setIsFollowingUserGps(false);
                      setActivePinId(pin.id);
                      setMapCenter({ lat: pin.lat, lng: pin.lng });
                      setZoom(15);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left shrink-0 max-w-[180px] cursor-pointer"
                  >
                    <div className="text-[11px] font-bold text-white truncate">
                      {pin.kind === 'restaurant'
                        ? '🍜 '
                        : pin.kind === 'hotel'
                        ? '🏨 '
                        : '🏛️ '}
                      {language === 'en' ? pin.nameEn : pin.nameKh}
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      {distKm.toFixed(1)} km • {pin.provinceKh}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
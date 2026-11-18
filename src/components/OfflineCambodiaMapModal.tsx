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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
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
  CAMBODIA_WATER_FEATURES,
  CAMBODIA_PARKS,
  CAMBODIA_ROAD_SEGMENTS,
  generateLocalStreetSegmentsAroundPin,
  computeOfflineRoadRoute,
  haversineKm,
  getCachedTileBlobUrl,
  saveTileBlob,
  getOfflinePackStatus,
  downloadOfflineMapPack,
  latLngToTileXY,
  tileXYToBounds,
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

// Web Mercator projection helpers (zoom z = 7 .. 17)
const latLngToWorldPx = (lat: number, lng: number, zoom: number): { x: number; y: number } => {
  const scale = 256 * Math.pow(2, zoom);
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  const x = ((lng + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
};

const worldPxToLatLng = (x: number, y: number, zoom: number): { lat: number; lng: number } => {
  const scale = 256 * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    lat: Math.max(9.5, Math.min(15.2, lat)),
    lng: Math.max(101.8, Math.min(108.2, lng)),
  };
};

const getCompassDirection = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  lang: 'km' | 'en' | 'zh'
): { bearingDeg: number; label: string } => {
  const dLon = ((toLng - fromLng) * Math.PI) / 180;
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

  const dirs = [
    { km: 'ទិសខាងជើង (N)', en: 'North (N)', zh: '正北 (N)' },
    { km: 'ទិសឦសាន (NE)', en: 'Northeast (NE)', zh: '东北 (NE)' },
    { km: 'ទិសខាងកើត (E)', en: 'East (E)', zh: '正东 (E)' },
    { km: 'ទិសអាគ្នេយ៍ (SE)', en: 'Southeast (SE)', zh: '东南 (SE)' },
    { km: 'ទិសខាងត្បូង (S)', en: 'South (S)', zh: '正南 (S)' },
    { km: 'ទិសនិរតី (SW)', en: 'Southwest (SW)', zh: '西南 (SW)' },
    { km: 'ទិសខាងលិច (W)', en: 'West (W)', zh: '正西 (W)' },
    { km: 'ទិសពាយ័ព្យ (NW)', en: 'Northwest (NW)', zh: '西北 (NW)' },
  ];
  const idx = Math.round(brng / 45) % 8;
  return {
    bearingDeg: Math.round(brng),
    label: tr(lang, dirs[idx].km, dirs[idx].en, dirs[idx].zh),
  };
};

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
  const [filterKind, setFilterKind] = useState<'all' | 'destination' | 'restaurant' | 'hotel' | 'hospital'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; isRealGps: boolean }>({
    lat: 11.5564,
    lng: 104.9182,
    isRealGps: false,
  });

  // Slippy Map Center & Zoom (zoom 7 = whole Cambodia, zoom 14..16 = Google Maps street level!)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 11.553,
    lng: 104.925,
  });
  const [zoom, setZoom] = useState<number>(14);
  const [mapTheme, setMapTheme] = useState<'google-day' | 'night'>('google-day');
  const [showStepsPanel, setShowStepsPanel] = useState<boolean>(false);
  const [isNavigatingLive, setIsNavigatingLive] = useState<boolean>(false);

  // Offline Map Download State
  const [isDownloadingMap, setIsDownloadingMap] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedTilesCount, setDownloadedTilesCount] = useState(0);

  // Cached tile images in memory for fast 60fps canvas rendering
  const tileImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
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

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Load initial offline tile count from IndexedDB & auto-cache current area for instant offline readiness
  useEffect(() => {
    if (!isOpen) return;
    getOfflinePackStatus().then((st) => {
      setDownloadedTilesCount(st.downloadedTilesCount);
      if (st.downloadedTilesCount === 0) {
        const targetLat = activePin ? activePin.lat : mapCenter.lat;
        const targetLng = activePin ? activePin.lng : mapCenter.lng;
        downloadOfflineMapPack(
          targetLat,
          targetLng,
          'auto-init-pack',
          activePin?.addressKh,
          activePin?.nameKh
        ).then(() => {
          getOfflinePackStatus().then((updated) => {
            setDownloadedTilesCount(updated.downloadedTilesCount);
          });
        });
      }
    });
  }, [isOpen, activePin, mapCenter.lat, mapCenter.lng]);

  // Build unified pins list (Tourism + Hotels + Restaurants/Shops + 25 Referral Hospitals)
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
      const isHotel = d.categorySlug === 'hotel' || (d.categoryEn || '').toLowerCase().includes('hotel');
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

  const requestDeviceGps = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            isRealGps: true,
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    }
  };

  // Live GPS tracking during active turn-by-turn navigation
  useEffect(() => {
    if (!isOpen || !isNavigatingLive) return;
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            isRealGps: true,
          });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 }
      );
    }
    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOpen, isNavigatingLive]);

  const focusMapOnPlaceAndRoute = (targetLat: number, targetLng: number, startLat: number, startLng: number) => {
    const distKm = haversineKm(startLat, startLng, targetLat, targetLng);
    if (distKm <= 8) {
      // Same city: focus at detailed street level (zoom 14) showing streets, intersections & route!
      setMapCenter({
        lat: (targetLat * 0.65 + startLat * 0.35),
        lng: (targetLng * 0.65 + startLng * 0.35),
      });
      setZoom(14);
    } else {
      // Focus directly on the target shop/attraction street neighborhood first (zoom 14)
      setMapCenter({ lat: targetLat, lng: targetLng });
      setZoom(14);
    }
  };

  // Listen for global open event
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<OfflineMapOpenPayload>;
      const payload = custom.detail;
      if (!payload) return;

      let startLat = userLocation.lat;
      let startLng = userLocation.lng;
      if (payload.origin && typeof payload.origin.lat === 'number' && typeof payload.origin.lng === 'number') {
        startLat = payload.origin.lat;
        startLng = payload.origin.lng;
        setUserLocation({ lat: startLat, lng: startLng, isRealGps: true });
      } else {
        requestDeviceGps();
      }

      setFilterKind('all');
      setSearchQuery('');
      setShowStepsPanel(payload.mode === 'directions');

      if (payload.kind === 'destination' && payload.destination) {
        const d = payload.destination;
        setActivePinId(d.id || null);
        if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
          focusMapOnPlaceAndRoute(d.latitude, d.longitude, startLat, startLng);
        }
      } else if (payload.kind === 'restaurant' && payload.restaurant) {
        const r = payload.restaurant;
        setActivePinId(r.id || null);
        if (typeof r.latitude === 'number' && typeof r.longitude === 'number') {
          focusMapOnPlaceAndRoute(r.latitude, r.longitude, startLat, startLng);
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
          focusMapOnPlaceAndRoute(match.lat, match.lng, startLat, startLng);
        } else if (typeof t.latitude === 'number' && typeof t.longitude === 'number') {
          focusMapOnPlaceAndRoute(t.latitude, t.longitude, startLat, startLng);
        }
      }

      setIsOpen(true);
    };

    window.addEventListener(OFFLINE_CAMBODIA_MAP_EVENT, handler);
    return () => window.removeEventListener(OFFLINE_CAMBODIA_MAP_EVENT, handler);
  }, [allPins, userLocation.lat, userLocation.lng]);

  const activePin = useMemo<MapPinEntry | null>(() => {
    if (!activePinId) return allPins[0] || null;
    return allPins.find((p) => p.id === activePinId) || allPins[0] || null;
  }, [allPins, activePinId]);

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

  // Compute road-following route using our A* Offline Road Network Router!
  const roadRoute = useMemo(() => {
    if (!activePin) return null;
    return computeOfflineRoadRoute(
      userLocation.lat,
      userLocation.lng,
      activePin.lat,
      activePin.lng,
      activePin.nameKh,
      activePin.nameEn,
      activePin.addressKh
    );
  }, [activePin, userLocation.lat, userLocation.lng]);

  // Local street network around active pin and user GPS
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

  // Handle Offline Map Download Button (works both Online AND Offline!)
  const handleDownloadOfflineMap = async () => {
    if (isDownloadingMap) return;
    setIsDownloadingMap(true);
    setDownloadProgress(5);
    const targetLat = activePin ? activePin.lat : mapCenter.lat;
    const targetLng = activePin ? activePin.lng : mapCenter.lng;
    const packId = activePin ? `pack-${activePin.id}` : 'pack-cambodia';

    try {
      const res = await downloadOfflineMapPack(
        targetLat,
        targetLng,
        packId,
        activePin?.addressKh,
        activePin?.nameKh,
        (pct) => setDownloadProgress(pct)
      );
      const st = await getOfflinePackStatus();
      setDownloadedTilesCount(st.downloadedTilesCount);
      setTileRenderTick((t) => t + 1);
      showToast(
        tr(
          language,
          `បានទាញយក និងរក្សាទុកផែនទីផ្លូវលម្អិត Offline ចំនួន ${res.totalSaved} ផ្ទាំង ក្នុងទូរស័ព្ទជោគជ័យ!`,
          `Successfully saved ${res.totalSaved} detailed offline map tiles to your device!`,
          `已成功将 ${res.totalSaved} 张详细离线道路地图保存到手机！`
        ),
        'success'
      );
    } finally {
      setIsDownloadingMap(false);
      setDownloadProgress(100);
    }
  };

  // Simulate moving along the road route so users can test live GPS navigation even indoors
  const handleSimulateDriveAlongRoute = () => {
    if (!roadRoute || roadRoute.path.length < 2) return;
    if (isNavigatingLive) {
      setIsNavigatingLive(false);
      return;
    }
    setIsNavigatingLive(true);
    let idx = 0;
    const pts = roadRoute.path;
    const timer = setInterval(() => {
      idx++;
      if (idx >= pts.length) {
        clearInterval(timer);
        setIsNavigatingLive(false);
        return;
      }
      const [lat, lng] = pts[idx];
      setUserLocation({ lat, lng, isRealGps: true });
      setMapCenter({ lat, lng });
    }, 900);
  };

  // ============================================================================
  // HIGH-DPI GOOGLE-MAPS-STYLE ROAD & STREET CANVAS RENDERER
  // ============================================================================
  useEffect(() => {
    if (!isOpen) return;
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

    // 1. Base Ocean & Land Fill (Google Maps warm cream + Gulf of Thailand blue)
    ctx.fillStyle = isDay ? '#EDE9DF' : '#081220';
    ctx.fillRect(0, 0, w, h);

    // Gulf of Thailand Ocean Polygon (South-West of Cambodia)
    const seaCoords: Array<[number, number]> = [
      [12.20, 101.50],
      [11.65, 102.90],
      [11.10, 103.10],
      [10.60, 103.50],
      [10.55, 104.12],
      [10.42, 104.45],
      [10.15, 104.60],
      [9.50, 104.60],
      [9.50, 101.50],
    ];
    ctx.fillStyle = isDay ? '#AADAFF' : '#0C4A6E';
    ctx.beginPath();
    seaCoords.forEach(([lat, lng], idx) => {
      const pt = toScreen(lat, lng);
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fill();

    // Cambodia Main Territory Land Polygon (Google Maps warm ivory)
    const camLandCoords: Array<[number, number]> = [
      [10.42, 104.45],
      [10.55, 104.12],
      [10.60, 103.50],
      [11.10, 103.10],
      [11.65, 102.90],
      [12.20, 102.70],
      [12.85, 102.50],
      [13.65, 102.55],
      [14.25, 103.20],
      [14.42, 104.50],
      [14.35, 105.20],
      [13.95, 105.95],
      [14.55, 106.60],
      [14.68, 107.35],
      [13.80, 107.55],
      [12.90, 107.50],
      [12.30, 107.40],
      [11.90, 106.70],
      [11.55, 106.10],
      [10.90, 106.20],
      [10.85, 105.60],
      [10.90, 105.10],
      [10.45, 104.80],
    ];
    ctx.fillStyle = isDay ? '#F7F5EE' : '#0F2236';
    ctx.strokeStyle = isDay ? '#94A3B8' : '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    camLandCoords.forEach(([lat, lng], idx) => {
      const pt = toScreen(lat, lng);
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Render Cached / Online Slippy Map Tiles (256x256) if available
    const minTileX = Math.floor((centerWorld.x - w / 2) / 256);
    const maxTileX = Math.floor((centerWorld.x + w / 2) / 256);
    const minTileY = Math.floor((centerWorld.y - h / 2) / 256);
    const maxTileY = Math.floor((centerWorld.y + h / 2) / 256);

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const key = `${intZoom}/${tx}/${ty}`;
        const screenX = Math.floor(w / 2 + (tx * 256 - centerWorld.x));
        const screenY = Math.floor(h / 2 + (ty * 256 - centerWorld.y));

        const cachedImg = tileImageCacheRef.current.get(key);
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
          ctx.save();
          if (!isDay) {
            ctx.globalAlpha = 0.35;
          }
          ctx.drawImage(cachedImg, screenX, screenY, 256, 256);
          ctx.restore();
        } else if (!cachedImg) {
          // Mark loading placeholder & check IndexedDB first, then online tile server
          const placeholder = new Image();
          placeholder.crossOrigin = 'anonymous';
          tileImageCacheRef.current.set(key, placeholder);
          getCachedTileBlobUrl(intZoom, tx, ty).then((blobUrl) => {
            if (blobUrl) {
              placeholder.onload = () => setTileRenderTick((t) => t + 1);
              placeholder.src = blobUrl;
            } else if (typeof navigator !== 'undefined' && navigator.onLine) {
              const sub = ['a', 'b', 'c'][Math.abs(tx + ty) % 3];
              const remoteUrl = `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${intZoom}/${tx}/${ty}.png`;
              fetch(remoteUrl)
                .then((r) => (r.ok ? r.blob() : null))
                .then((blob) => {
                  if (blob) {
                    saveTileBlob(intZoom, tx, ty, blob);
                    placeholder.onload = () => setTileRenderTick((t) => t + 1);
                    placeholder.src = URL.createObjectURL(blob);
                  }
                })
                .catch(() => {});
            }
          });
        }
      }
    }

    // 3. Always Render High-Detail Vector City Blocks, Parks, Rivers, Streets, Intersections & Road Labels
    //    so that even with 0% internet and 0 prior downloads, the map looks like a real detailed Google Road Map!
    if (intZoom >= 11) {
      // Realistic Google-Maps urban street grid & building blocks
      const gridStep = intZoom >= 15 ? 76 : intZoom >= 14 ? 56 : intZoom >= 13 ? 42 : 30;
      const offsetX = ((-centerWorld.x % gridStep) + gridStep) % gridStep;
      const offsetY = ((-centerWorld.y % gridStep) + gridStep) % gridStep;

      // Draw building footprints inside city blocks at street zoom (13..16)
      if (intZoom >= 13) {
        ctx.fillStyle = isDay ? 'rgba(229, 224, 213, 0.72)' : 'rgba(30, 41, 59, 0.55)';
        ctx.strokeStyle = isDay ? 'rgba(209, 202, 188, 0.8)' : 'rgba(51, 65, 85, 0.65)';
        ctx.lineWidth = 0.8;
        for (let gx = offsetX - gridStep; gx < w; gx += gridStep) {
          for (let gy = offsetY - gridStep; gy < h; gy += gridStep) {
            const pad = Math.max(5, Math.floor(gridStep * 0.14));
            const bw = Math.floor((gridStep - pad * 3) / 2);
            const bh = Math.floor((gridStep - pad * 3) / 2);
            if (bw > 6 && bh > 6) {
              ctx.fillRect(gx + pad, gy + pad, bw, bh);
              ctx.strokeRect(gx + pad, gy + pad, bw, bh);
              ctx.fillRect(gx + pad * 2 + bw, gy + pad, bw, bh);
              ctx.strokeRect(gx + pad * 2 + bw, gy + pad, bw, bh);
              ctx.fillRect(gx + pad, gy + pad * 2 + bh, gridStep - pad * 2, bh);
              ctx.strokeRect(gx + pad, gy + pad * 2 + bh, gridStep - pad * 2, bh);
            }
          }
        }
      }

      // Draw secondary local streets with Google Maps white fill + casing
      ctx.strokeStyle = isDay ? 'rgba(205, 198, 184, 0.85)' : 'rgba(51, 65, 85, 0.8)';
      ctx.lineWidth = intZoom >= 14 ? 5.5 : 3.2;
      ctx.beginPath();
      for (let gx = offsetX; gx < w; gx += gridStep) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
      }
      for (let gy = offsetY; gy < h; gy += gridStep) {
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
      }
      ctx.stroke();

      ctx.strokeStyle = isDay ? 'rgba(255, 255, 255, 0.92)' : 'rgba(71, 85, 105, 0.85)';
      ctx.lineWidth = intZoom >= 14 ? 3.8 : 2.0;
      ctx.beginPath();
      for (let gx = offsetX; gx < w; gx += gridStep) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
      }
      for (let gy = offsetY; gy < h; gy += gridStep) {
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
      }
      ctx.stroke();
    }

    // Parks & Green Zones
    for (const park of CAMBODIA_PARKS) {
      const p = toScreen(park.lat, park.lng);
      const pEdge = toScreen(park.lat + park.radiusDegLat, park.lng + park.radiusDegLng);
      const rx = Math.max(12, Math.abs(pEdge.x - p.x));
      const ry = Math.max(10, Math.abs(pEdge.y - p.y));
      if (p.x + rx < 0 || p.x - rx > w || p.y + ry < 0 || p.y - ry > h) continue;
      ctx.fillStyle = isDay ? 'rgba(185, 230, 190, 0.78)' : 'rgba(6, 95, 70, 0.45)';
      ctx.strokeStyle = isDay ? '#81C784' : '#059669';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (intZoom >= 12) {
        ctx.fillStyle = isDay ? '#1B5E20' : '#6EE7B7';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(language === 'en' ? park.nameEn : park.nameKh, p.x, p.y + 3);
      }
    }

    // Tonle Sap Lake & Rivers (Mekong, Tonle Sap, Bassac)
    const tsCenter = toScreen(12.88, 104.05);
    const tsEdge = toScreen(13.22, 104.45);
    const tsRx = Math.max(14, Math.abs(tsEdge.x - tsCenter.x));
    const tsRy = Math.max(9, Math.abs(tsEdge.y - tsCenter.y));
    ctx.save();
    ctx.translate(tsCenter.x, tsCenter.y);
    ctx.rotate((-28 * Math.PI) / 180);
    ctx.fillStyle = isDay ? '#90CAF9' : '#0369A1';
    ctx.strokeStyle = isDay ? '#42A5F5' : '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, tsRx, tsRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    for (const river of CAMBODIA_WATER_FEATURES) {
      const riverWidth =
        intZoom >= 15 ? 26 : intZoom >= 13 ? 16 : intZoom >= 11 ? 9 : intZoom >= 9 ? 5 : 3;
      ctx.strokeStyle = isDay ? '#81D4FA' : '#0284C7';
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

    // 4. Render All Roads & Local Streets (Two-Pass Google Maps Casing + Inner Fill)
    const allRoads = [...CAMBODIA_ROAD_SEGMENTS, ...localStreets];

    for (const pass of ['casing', 'fill'] as const) {
      for (const seg of allRoads) {
        if (seg.tier === 'street' && intZoom < 11) continue;
        if (seg.tier === 'boulevard' && intZoom < 9) continue;

        const innerW =
          seg.tier === 'expressway'
            ? intZoom >= 14 ? 9 : intZoom >= 11 ? 6 : 4
            : seg.tier === 'national'
            ? intZoom >= 14 ? 8 : intZoom >= 11 ? 5.2 : 3.4
            : seg.tier === 'boulevard'
            ? intZoom >= 14 ? 6.8 : intZoom >= 12 ? 4.4 : 2.6
            : intZoom >= 15 ? 5.4 : intZoom >= 13 ? 3.8 : 2.2;

        ctx.lineWidth = pass === 'casing' ? innerW + 2.4 : innerW;

        if (pass === 'casing') {
          ctx.strokeStyle = isDay
            ? seg.tier === 'street'
              ? '#C8BFB0'
              : '#C68B12'
            : '#1E293B';
        } else {
          ctx.strokeStyle =
            seg.tier === 'expressway'
              ? '#FF9800'
              : seg.tier === 'national'
              ? '#FBC02D'
              : seg.tier === 'boulevard'
              ? isDay
                ? '#FFF176'
                : '#F59E0B'
              : isDay
              ? '#FFFFFF'
              : '#475569';
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

    // 5. Render Road Names & Highway Shields along road segments
    for (const seg of allRoads) {
      if (seg.tier === 'street' && intZoom < 13) continue;
      if (seg.tier === 'boulevard' && intZoom < 11) continue;
      const midIdx = Math.floor(seg.points.length / 2);
      const [mLat, mLng] = seg.points[midIdx];
      const pt = toScreen(mLat, mLng);
      if (pt.x < 30 || pt.x > w - 30 || pt.y < 20 || pt.y > h - 20) continue;

      const labelText =
        intZoom >= 13
          ? language === 'en'
            ? seg.nameEn
            : seg.nameKh
          : seg.code || (language === 'en' ? seg.nameEn : seg.nameKh);

      if (!labelText) continue;
      ctx.font = seg.tier === 'street' ? 'bold 9.5px sans-serif' : 'bold 10.5px sans-serif';
      const textW = Math.min(180, ctx.measureText(labelText).width + 10);

      ctx.fillStyle =
        seg.tier === 'national' || seg.tier === 'expressway'
          ? '#FEF08A'
          : isDay
          ? 'rgba(255, 255, 255, 0.92)'
          : 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle =
        seg.tier === 'national' || seg.tier === 'expressway'
          ? '#CA8A04'
          : isDay
          ? '#CBD5E1'
          : '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pt.x - textW / 2, pt.y - 8, textW, 15, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle =
        seg.tier === 'national' || seg.tier === 'expressway'
          ? '#713F12'
          : isDay
          ? '#1E293B'
          : '#F8FAFC';
      ctx.textAlign = 'center';
      ctx.fillText(labelText.slice(0, 26), pt.x, pt.y + 3);
    }

    // 6. Render 25 Provincial Capital Labels
    for (const hub of PROVINCE_NODES) {
      const pt = toScreen(hub.lat, hub.lng);
      if (pt.x < -20 || pt.x > w + 20 || pt.y < -20 || pt.y > h + 20) continue;
      ctx.fillStyle = hub.isCapital ? '#DC2626' : '#0F172A';
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

    // 7. Render Google-Maps-Style Blue Road-Following Route Polyline (#1A73E8 with #0D47A1 casing)
    if (roadRoute && roadRoute.path.length >= 2) {
      // Outer dark blue casing
      ctx.strokeStyle = '#0D47A1';
      ctx.lineWidth = 8.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      roadRoute.path.forEach(([lat, lng], idx) => {
        const pt = toScreen(lat, lng);
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Inner Google Maps vibrant navigation blue
      ctx.strokeStyle = '#1A73E8';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      roadRoute.path.forEach(([lat, lng], idx) => {
        const pt = toScreen(lat, lng);
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // White directional chevrons along the road route
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < roadRoute.path.length - 1; i++) {
        const p1 = toScreen(roadRoute.path[i][0], roadRoute.path[i][1]);
        const p2 = toScreen(roadRoute.path[i + 1][0], roadRoute.path[i + 1][1]);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (segLen < 24) continue;
        ctx.beginPath();
        ctx.arc(midX, midY, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 8. Render Nearby Pins
    for (const pin of visiblePins.slice(0, 350)) {
      if (activePin?.id === pin.id) continue;
      const pt = toScreen(pin.lat, pin.lng);
      if (pt.x < -10 || pt.x > w + 10 || pt.y < -10 || pt.y > h + 10) continue;

      const color =
        pin.kind === 'restaurant'
          ? '#EA580C'
          : pin.kind === 'hotel'
          ? '#0284C7'
          : pin.kind === 'hospital'
          ? '#E11D48'
          : '#059669';

      ctx.fillStyle = color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, intZoom >= 13 ? 5.5 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (intZoom >= 14) {
        ctx.font = 'bold 9.5px sans-serif';
        ctx.textAlign = 'left';
        ctx.strokeStyle = isDay ? '#FFFFFF' : '#0F172A';
        ctx.lineWidth = 2.5;
        const pName = (language === 'en' ? pin.nameEn : pin.nameKh).slice(0, 22);
        ctx.strokeText(pName, pt.x + 8, pt.y + 3);
        ctx.fillStyle = isDay ? '#0F172A' : '#F8FAFC';
        ctx.fillText(pName, pt.x + 8, pt.y + 3);
      }
    }

    // 9. Render User GPS Blue Dot
    const uPt = toScreen(userLocation.lat, userLocation.lng);
    ctx.fillStyle = 'rgba(26, 115, 232, 0.25)';
    ctx.beginPath();
    ctx.arc(uPt.x, uPt.y, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1A73E8';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(uPt.x, uPt.y, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 10. Render Active Destination / Shop Pin (Google Maps Red Drop Pin + Callout Box)
    if (activePin) {
      const tPt = toScreen(activePin.lat, activePin.lng);
      // Pin shadow
      ctx.fillStyle = 'rgba(225, 29, 72, 0.28)';
      ctx.beginPath();
      ctx.arc(tPt.x, tPt.y, 16, 0, Math.PI * 2);
      ctx.fill();

      // Red Pin Circle
      ctx.fillStyle = '#E11D48';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(tPt.x, tPt.y, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Callout Banner above Pin
      const title = (language === 'en' ? activePin.nameEn : activePin.nameKh).slice(0, 28);
      ctx.font = 'bold 11px sans-serif';
      const boxW = Math.min(220, Math.max(110, ctx.measureText(title).width + 20));
      const boxX = Math.max(8, Math.min(w - boxW - 8, tPt.x - boxW / 2));
      const boxY = Math.max(8, tPt.y - 34);

      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FEF08A';
      ctx.textAlign = 'center';
      ctx.fillText(title, boxX + boxW / 2, boxY + 14.5);
    }

    ctx.restore();
  }, [
    isOpen,
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
  ]);

  if (!isOpen) return null;

  const totalDistanceKm = roadRoute ? roadRoute.totalDistanceKm : 0;
  const estMinutes = roadRoute ? roadRoute.estimatedMinutes : 3;
  const estHours = Math.floor(estMinutes / 60);
  const remMins = estMinutes % 60;
  const driveTimeLabel =
    estHours > 0
      ? tr(language, `≈ ${estHours} ម៉ោង ${remMins} នាទី`, `≈ ${estHours}h ${remMins}m`, `≈ ${estHours}小时${remMins}分`)
      : tr(language, `≈ ${estMinutes} នាទី`, `≈ ${estMinutes} mins`, `≈ ${estMinutes}分钟`);

  const compassInfo = activePin
    ? getCompassDirection(userLocation.lat, userLocation.lng, activePin.lat, activePin.lng, language)
    : null;

  const matchedHub = activePin ? matchProvinceHub(activePin.provinceEn || activePin.provinceKh) : null;

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
              <h2 className="text-sm sm:text-base font-extrabold font-moul text-white truncate">
                {tr(language, 'ផែនទីផ្លូវថ្នល់កម្ពុជា Offline & នាំផ្លូវ', 'Cambodia Offline Road Map & Navigation', '柬埔寨离线道路地图与导航')}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                  isOnline
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                    : 'bg-amber-500 text-slate-950 border-amber-300'
                }`}
              >
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>
                  {isOnline
                    ? tr(language, 'Online + Offline រួចរាល់', 'Offline Ready', '离线可用')
                    : tr(language, 'គ្មានអ៊ីនធឺណិត (Offline Mode)', 'No Internet (Offline Mode)', '无网络（离线模式）')}
                </span>
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-emerald-100/90 font-khmer truncate">
              {tr(
                language,
                `ផែនទីផ្លូវថ្នល់លម្អិត ផ្លូវជាតិ ផ្លូវក្នុងក្រុង និងទីតាំង ${allPins.length.toLocaleString()} កន្លែង`,
                `Detailed Roads, Streets, Intersections & ${allPins.length.toLocaleString()} Places`,
                `详细道路、街区、交叉路口与 ${allPins.length.toLocaleString()} 个地点`
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition active:scale-90 cursor-pointer shrink-0"
          aria-label="Close Offline Map"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search, Download Offline Map & Category Filter Bar */}
      <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr(
                language,
                'ស្វែងរកហាង ផ្លូវ រមណីយដ្ឋាន សណ្ឋាគារ ឬខេត្ត...',
                'Search shops, streets, attractions, hotels...',
                '搜索餐厅、街道、景点、酒店...'
              )}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 font-khmer"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 1-Tap Offline Map Download Button */}
          <button
            type="button"
            onClick={handleDownloadOfflineMap}
            disabled={isDownloadingMap}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-[11px] font-khmer flex items-center gap-1.5 shadow shrink-0 cursor-pointer disabled:opacity-60"
          >
            {isDownloadingMap ? (
              <>
                <Download className="w-3.5 h-3.5 animate-bounce" />
                <span>{downloadProgress}%</span>
              </>
            ) : downloadedTilesCount > 0 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-900" />
                <span>{tr(language, `ទាញយក Offline (${downloadedTilesCount})`, `Saved (${downloadedTilesCount})`, `已下载 (${downloadedTilesCount})`)}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{tr(language, 'ទាញយកផែនទី Offline', 'Download Map', '下载离线地图')}</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', labelKh: 'ទាំងអស់', labelEn: 'All Places', labelZh: '全部', icon: '🗺️' },
            { id: 'destination', labelKh: 'រមណីយដ្ឋាន', labelEn: 'Tourism', labelZh: '景点', icon: '🏛️' },
            { id: 'restaurant', labelKh: 'ហាងម្ហូប', labelEn: 'Shops & Food', labelZh: '餐厅', icon: '🍜' },
            { id: 'hotel', labelKh: 'សណ្ឋាគារ', labelEn: 'Hotels', labelZh: '酒店', icon: '🏨' },
            { id: 'hospital', labelKh: 'មន្ទីរពេទ្យបង្អែក', labelEn: 'Hospitals', labelZh: '医院', icon: '🏥' },
          ].map((tab) => {
            const active = filterKind === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterKind(tab.id as any)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-khmer shrink-0 flex items-center gap-1 transition cursor-pointer border ${
                  active
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tr(language, tab.labelKh, tab.labelEn, tab.labelZh)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {searchQuery.trim().length > 0 && (
        <div className="max-h-40 overflow-y-auto bg-slate-900/95 border-b border-emerald-500/30 px-3 py-1.5 space-y-1 shrink-0">
          {visiblePins.slice(0, 12).map((pin) => (
            <button
              key={pin.id}
              type="button"
              onClick={() => {
                setActivePinId(pin.id);
                setMapCenter({ lat: pin.lat, lng: pin.lng });
                setZoom(15);
                setSearchQuery('');
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between gap-2 text-xs font-khmer text-white cursor-pointer"
            >
              <span className="truncate font-bold">
                {pin.kind === 'restaurant' ? '🍜 ' : pin.kind === 'hotel' ? '🏨 ' : pin.kind === 'hospital' ? '🏥 ' : '📍 '}
                {language === 'en' ? pin.nameEn : pin.nameKh}
              </span>
              <span className="text-[10px] text-emerald-300 shrink-0">{pin.provinceKh}</span>
            </button>
          ))}
        </div>
      )}

      {/* Interactive Google-Maps-Style Road Canvas Viewport */}
      <div
        ref={viewportRef}
        className="relative flex-1 min-h-[240px] bg-[#F3EFE6] overflow-hidden select-none touch-none"
        onPointerDown={(e) => {
          const intZoom = Math.max(7, Math.min(16, Math.round(zoom)));
          const cw = latLngToWorldPx(mapCenter.lat, mapCenter.lng, intZoom);
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
          const intZoom = Math.max(7, Math.min(16, Math.round(zoom)));
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          const nextLatLng = worldPxToLatLng(
            dragRef.current.startCenterWorldX - dx,
            dragRef.current.startCenterWorldY - dy,
            intZoom
          );
          setMapCenter(nextLatLng);
        }}
        onPointerUp={(e) => {
          const moved = Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY);
          dragRef.current.active = false;
          // If it was a tap (< 6px drag), check if user tapped a pin on canvas
          if (moved < 6 && viewportRef.current) {
            const rect = viewportRef.current.getBoundingClientRect();
            const tapX = e.clientX - rect.left;
            const tapY = e.clientY - rect.top;
            const intZoom = Math.max(7, Math.min(16, Math.round(zoom)));
            const cw = latLngToWorldPx(mapCenter.lat, mapCenter.lng, intZoom);
            for (const pin of visiblePins.slice(0, 350)) {
              const pt = latLngToWorldPx(pin.lat, pin.lng, intZoom);
              const sx = rect.width / 2 + (pt.x - cw.x);
              const sy = rect.height / 2 + (pt.y - cw.y);
              if (Math.hypot(tapX - sx, tapY - sy) <= 16) {
                setActivePinId(pin.id);
                setMapCenter({ lat: pin.lat, lng: pin.lng });
                break;
              }
            }
          }
        }}
        onPointerCancel={() => {
          dragRef.current.active = false;
        }}
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 1 : -1;
          setZoom((z) => Math.max(7, Math.min(16, z + delta)));
        }}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Top-Left Street / Route View Mode Switcher */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={() => {
              if (activePin) {
                setMapCenter({ lat: activePin.lat, lng: activePin.lng });
                setZoom(15);
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-khmer shadow border cursor-pointer ${
              zoom >= 13
                ? 'bg-[#1A73E8] text-white border-white/40'
                : 'bg-slate-900/90 text-white border-slate-700'
            }`}
          >
            🔍 {tr(language, 'ផ្លូវលម្អិតជុំវិញហាង', 'Street Detail', '街道详情')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (activePin) {
                const dist = haversineKm(userLocation.lat, userLocation.lng, activePin.lat, activePin.lng);
                setMapCenter({
                  lat: (userLocation.lat + activePin.lat) / 2,
                  lng: (userLocation.lng + activePin.lng) / 2,
                });
                setZoom(dist > 120 ? 8 : dist > 45 ? 10 : dist > 15 ? 12 : 13);
              } else {
                setMapCenter({ lat: 12.45, lng: 104.9 });
                setZoom(8);
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-khmer shadow border cursor-pointer ${
              zoom < 13
                ? 'bg-[#1A73E8] text-white border-white/40'
                : 'bg-slate-900/90 text-white border-slate-700'
            }`}
          >
            🛣️ {tr(language, 'មើលផ្លូវធ្វើដំណើរសរុប', 'Full Route', '全程路线')}
          </button>
        </div>

        {/* Floating Map Zoom, Theme & GPS Controls */}
        <div className="absolute right-3 top-3 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(16, z + 1))}
            className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow flex items-center justify-center cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-emerald-300" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(7, z - 1))}
            className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow flex items-center justify-center cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-emerald-300" />
          </button>
          <button
            type="button"
            onClick={() => setMapTheme((t) => (t === 'google-day' ? 'night' : 'google-day'))}
            className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow flex items-center justify-center cursor-pointer"
            title="Toggle Day / Night Map Theme"
          >
            <Layers className="w-4 h-4 text-amber-300" />
          </button>
          <button
            type="button"
            onClick={() => {
              requestDeviceGps();
              if (activePin) {
                setMapCenter({ lat: activePin.lat, lng: activePin.lng });
                setZoom(15);
              }
            }}
            className="w-9 h-9 rounded-xl bg-emerald-700/95 hover:bg-emerald-600 text-white border border-emerald-400/50 shadow flex items-center justify-center cursor-pointer"
            title="Center on Destination"
          >
            <LocateFixed className="w-4 h-4 text-amber-300" />
          </button>
        </div>

        {/* Floating Zoom Level & Road Legend Pill */}
        <div className="absolute left-3 bottom-2.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-700/80 text-[10px] text-slate-200 flex items-center gap-2.5 font-khmer pointer-events-none">
          <span className="font-mono text-amber-300 font-bold">Zoom {Math.round(zoom)}x</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded bg-[#1A73E8] inline-block" />
            {tr(language, 'ផ្លូវនាំទិស', 'Route', '导航路线')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            {tr(language, 'ហាងម្ហូប', 'Shops', '餐厅')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            {tr(language, 'ទេសចរណ៍', 'Tourism', '景点')}
          </span>
        </div>
      </div>

      {/* Bottom Selected Place Detail, Turn-by-Turn Steps & Offline Actions */}
      {activePin && (
        <div
          style={{ paddingBottom: 'max(var(--kft-safe-bottom, 0px), 0.75rem)' }}
          className="bg-slate-900 border-t-2 border-emerald-500/50 px-3.5 pt-3 space-y-2.5 max-h-[48dvh] overflow-y-auto shrink-0 font-khmer"
        >
          <div className="flex items-start gap-3">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-emerald-400/50 bg-slate-800 shrink-0 shadow-md">
              {activePin.rawRestaurant ? (
                <ShopAvatar
                  restaurant={activePin.rawRestaurant}
                  alt={activePin.nameKh}
                  className="w-full h-full rounded-none border-0"
                  imgClassName="w-full h-full object-cover"
                />
              ) : activePin.photoUrl ? (
                <img
                  src={activePin.photoUrl}
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
                <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">{activePin.addressKh}</p>
              )}
              <p className="text-[10px] text-emerald-300/90 font-mono mt-0.5">
                GPS: {activePin.lat.toFixed(5)}, {activePin.lng.toFixed(5)}
              </p>
            </div>
          </div>

          {/* Road Route Distance, Drive Time & Compass Strip */}
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
                {tr(language, 'រយៈពេលធ្វើដំណើរ', 'Drive Time', '预计车程')}
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-amber-300">{driveTimeLabel}</div>
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

          {/* Active Road Route Summary & Turn-by-Turn Toggle */}
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
                      : tr(language, `មើលជំហានបត់ផ្លូវ (${roadRoute.steps.length})`, `Turn-by-Turn (${roadRoute.steps.length})`, `分步导航 (${roadRoute.steps.length})`)}
                  </span>
                </button>
              </div>

              {matchedHub && (
                <p className="text-[10px] text-emerald-200/90 leading-relaxed">
                  {language === 'en'
                    ? matchedHub.nationalRoadEn
                    : language === 'zh'
                    ? matchedHub.nationalRoadZh
                    : matchedHub.nationalRoadKh}
                </p>
              )}

              {/* Expandable Turn-by-Turn Street Instructions */}
              {showStepsPanel && (
                <div className="pt-1.5 border-t border-emerald-500/30 space-y-1.5 max-h-36 overflow-y-auto">
                  {roadRoute.steps.map((step, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => {
                        setMapCenter({ lat: step.coord[0], lng: step.coord[1] });
                        setZoom(15);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg bg-slate-900/75 hover:bg-slate-900 flex items-center justify-between gap-2 text-[11px] cursor-pointer"
                    >
                      <span className="text-white font-medium">
                        {step.turnType === 'depart'
                          ? '🚗 '
                          : step.turnType === 'arrive'
                          ? '🏁 '
                          : step.turnType === 'right'
                          ? '↱ '
                          : '↰ '}
                        {language === 'en'
                          ? step.instructionEn
                          : language === 'zh'
                          ? step.instructionZh
                          : step.instructionKh}
                      </span>
                      {step.distanceKm > 0 && (
                        <span className="text-[10px] font-mono text-amber-300 shrink-0">
                          {step.distanceKm} km
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons: Start Live Offline Navigation, Download Offline Map Pack, View Details, Call */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSimulateDriveAlongRoute}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer ${
                isNavigatingLive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-[#1A73E8] hover:bg-blue-600 text-white'
              }`}
            >
              {isNavigatingLive ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span>{tr(language, 'បញ្ឈប់ការនាំផ្លូវផ្ទាល់', 'Stop Live Navigation', '停止实时导航')}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                  <span>{tr(language, 'ចាប់ផ្តើមនាំផ្លូវតាមផ្លូវថ្នល់ (Offline)', 'Start Offline Road Navigation', '开始离线道路导航')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadOfflineMap}
              disabled={isDownloadingMap}
              className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer disabled:opacity-60"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>
                {isDownloadingMap
                  ? tr(language, `កំពុងរក្សាទុកផែនទី Offline (${downloadProgress}%)...`, `Saving Offline Map (${downloadProgress}%)...`, `正在保存离线地图 (${downloadProgress}%)...`)
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
                  {tr(language, `ហៅទូរស័ព្ទ (${activePin.phone})`, `Call (${activePin.phone})`, `致电 (${activePin.phone})`)}
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
                      setActivePinId(pin.id);
                      setMapCenter({ lat: pin.lat, lng: pin.lng });
                      setZoom(15);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left shrink-0 max-w-[180px] cursor-pointer"
                  >
                    <div className="text-[11px] font-bold text-white truncate">
                      {pin.kind === 'restaurant' ? '🍜 ' : pin.kind === 'hotel' ? '🏨 ' : '🏛️ '}
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

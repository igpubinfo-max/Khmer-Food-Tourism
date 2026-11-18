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
  ExternalLink,
  Sparkles,
  WifiOff,
  Wifi,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  Restaurant,
  TouristDestination,
  TrendingFoodItem,
  openExternalUrlNativeSafe,
  sanitizeRestaurantShopPhoto,
} from '../types';
import { tr } from '../utils/i18n';
import { ShopAvatar } from './icons/DefaultShopIcon';
import { DefaultDestinationIcon } from './TouristCard';
import { PROVINCIAL_ADMIN_HISTORY_HOSPITALS } from '../data/provincialAdminPortsEmergencyData';
import { matchProvinceHub } from '../utils/destinationTravelInfo';

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

const LON_MIN = 102.25;
const LON_MAX = 107.70;
const LAT_MIN = 10.25;
const LAT_MAX = 14.75;
const SVG_W = 1000;
const SVG_H = 860;

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const projectCoord = (lat: number, lng: number): { x: number; y: number } => {
  const clampedLng = Math.max(LON_MIN, Math.min(LON_MAX, lng));
  const clampedLat = Math.max(LAT_MIN, Math.min(LAT_MAX, lat));
  const x = ((clampedLng - LON_MIN) / (LON_MAX - LON_MIN)) * (SVG_W - 100) + 50;
  const y = ((LAT_MAX - clampedLat) / (LAT_MAX - LAT_MIN)) * (SVG_H - 100) + 50;
  return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
};

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
  { kh: 'កណ្តាល', en: 'Kandal', lat: 11.4833, lng: 104.9500 },
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

const NATIONAL_HIGHWAYS: Array<{
  code: string;
  nameKh: string;
  color: string;
  coords: Array<[number, number]>;
}> = [
  {
    code: 'NH1',
    nameKh: 'ផ្លូវជាតិលេខ ១ (ភ្នំពេញ → អ្នកលឿង → ស្វាយរៀង/បាវិត)',
    color: '#F59E0B',
    coords: [
      [11.5564, 104.9282],
      [11.2635, 105.2805],
      [11.0879, 105.7993],
      [11.0732, 106.1665],
    ],
  },
  {
    code: 'NH11 & NH8',
    nameKh: 'ផ្លូវជាតិលេខ ៨ & ១១ (ភ្នំពេញ → ព្រៃវែង → ត្បូងឃ្មុំ)',
    color: '#FBBF24',
    coords: [
      [11.5564, 104.9282],
      [11.4868, 105.3253],
      [11.8891, 105.655],
    ],
  },
  {
    code: 'NH2',
    nameKh: 'ផ្លូវជាតិលេខ ២ (ភ្នំពេញ → តាកែវ → ភ្នំដិន)',
    color: '#F59E0B',
    coords: [
      [11.5564, 104.9282],
      [11.4833, 104.95],
      [10.9908, 104.785],
      [10.615, 104.855],
    ],
  },
  {
    code: 'NH3',
    nameKh: 'ផ្លូវជាតិលេខ ៣ (ភ្នំពេញ → កំពត → កែប → វាលរេញ)',
    color: '#F59E0B',
    coords: [
      [11.5564, 104.9282],
      [10.5942, 104.164],
      [10.4829, 104.3167],
      [10.708, 103.816],
    ],
  },
  {
    code: 'NH4 & E4',
    nameKh: 'ផ្លូវជាតិលេខ ៤ & ផ្លូវល្បឿនលឿន E4 (ភ្នំពេញ → កំពង់ស្ពឺ → ព្រះសីហនុ)',
    color: '#38BDF8',
    coords: [
      [11.5564, 104.9282],
      [11.4533, 104.5208],
      [11.15, 103.95],
      [10.6275, 103.5221],
    ],
  },
  {
    code: 'NH48',
    nameKh: 'ផ្លូវជាតិលេខ ៤៨ (ស្រែអំបិល → កោះកុង)',
    color: '#FBBF24',
    coords: [
      [11.15, 103.95],
      [11.6153, 102.9838],
    ],
  },
  {
    code: 'NH5',
    nameKh: 'ផ្លូវជាតិលេខ ៥ (ភ្នំពេញ → កំពង់ឆ្នាំង → ពោធិ៍សាត់ → បាត់ដំបង → ប៉ោយប៉ែត)',
    color: '#F59E0B',
    coords: [
      [11.5564, 104.9282],
      [12.25, 104.6667],
      [12.5388, 103.9192],
      [13.0957, 103.2022],
      [13.5859, 102.9737],
      [13.656, 102.563],
    ],
  },
  {
    code: 'NH57',
    nameKh: 'ផ្លូវជាតិលេខ ៥៧ (បាត់ដំបង → ប៉ៃលិន)',
    color: '#FBBF24',
    coords: [
      [13.0957, 103.2022],
      [12.8489, 102.6093],
    ],
  },
  {
    code: 'NH6',
    nameKh: 'ផ្លូវជាតិលេខ ៦ (ភ្នំពេញ → កំពង់ធំ → សៀមរាប → បន្ទាយមានជ័យ)',
    color: '#F59E0B',
    coords: [
      [11.5564, 104.9282],
      [12.1, 105.05],
      [12.7111, 104.8887],
      [13.3633, 103.8564],
      [13.5859, 102.9737],
    ],
  },
  {
    code: 'NH62 & NH68',
    nameKh: 'ផ្លូវជាតិលេខ ៦២ & ៦៨ (កំពង់ធំ → ព្រះវិហារ & សៀមរាប → ឧត្តរមានជ័យ)',
    color: '#FBBF24',
    coords: [
      [12.7111, 104.8887],
      [13.8073, 104.9805],
      [14.1817, 103.5176],
      [13.3633, 103.8564],
    ],
  },
  {
    code: 'NH7',
    nameKh: 'ផ្លូវជាតិលេខ ៧ (ភ្នំពេញ → កំពង់ចាម → ក្រចេះ → ស្ទឹងត្រែង → ឡាវ)',
    color: '#F59E0B',
    coords: [
      [11.5564, 104.9282],
      [11.9934, 105.4635],
      [11.8891, 105.655],
      [12.4881, 106.0188],
      [13.5259, 105.9683],
    ],
  },
  {
    code: 'NH76 & NH78',
    nameKh: 'ផ្លូវជាតិលេខ ៧៦ & ៧៨ (ស្នួល → មណ្ឌលគិរី → រតនគិរី → ស្ទឹងត្រែង)',
    color: '#FBBF24',
    coords: [
      [12.07, 106.42],
      [12.4558, 107.1881],
      [13.7394, 106.9872],
      [13.5259, 105.9683],
    ],
  },
];

const CAMBODIA_BORDER_COORDS: Array<[number, number]> = [
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
    lng: 104.9282,
    isRealGps: false,
  });

  const [zoom, setZoom] = useState(1.65);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
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

  const allPins = useMemo<MapPinEntry[]>(() => {
    const list: MapPinEntry[] = [];

    for (const d of destinations) {
      if (typeof d.latitude !== 'number' || typeof d.longitude !== 'number') continue;
      if (d.latitude < 9.5 || d.latitude > 15.2 || d.longitude < 102.0 || d.longitude > 108.0) continue;
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
        lat: d.latitude,
        lng: d.longitude,
        photoUrl: (d.photoUrl || '').trim() || undefined,
        phone: d.phone,
        priceRange: d.priceRange,
        addressKh: d.addressKh,
        rawDestination: d,
      });
    }

    for (const r of restaurants) {
      if (typeof r.latitude !== 'number' || typeof r.longitude !== 'number') continue;
      if (r.latitude < 9.5 || r.latitude > 15.2 || r.longitude < 102.0 || r.longitude > 108.0) continue;
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
        lat: r.latitude,
        lng: r.longitude,
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
        lat: hub.lat + 0.012,
        lng: hub.lng + 0.012,
        phone: h.hospitalPhone,
        addressKh: h.hospitalAddress.km,
      });
    }

    return list;
  }, [destinations, restaurants]);

  const centerOnPin = (lat: number, lng: number, targetZoom = 2.8) => {
    const pt = projectCoord(lat, lng);
    const dx = (SVG_W / 2 - pt.x) * targetZoom;
    const dy = (SVG_H / 2 - pt.y) * targetZoom;
    setZoom(targetZoom);
    setPan({ x: dx, y: dy });
  };

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
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    }
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<OfflineMapOpenPayload>;
      const payload = custom.detail;
      if (!payload) return;

      if (payload.origin && typeof payload.origin.lat === 'number' && typeof payload.origin.lng === 'number') {
        setUserLocation({
          lat: payload.origin.lat,
          lng: payload.origin.lng,
          isRealGps: true,
        });
      } else {
        requestDeviceGps();
      }

      setFilterKind('all');
      setSearchQuery('');

      if (payload.kind === 'destination' && payload.destination) {
        const d = payload.destination;
        const targetId = d.id || 'temp-dest';
        setActivePinId(targetId);
        if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
          centerOnPin(d.latitude, d.longitude, 3.1);
        }
      } else if (payload.kind === 'restaurant' && payload.restaurant) {
        const r = payload.restaurant;
        const targetId = r.id || 'temp-rest';
        setActivePinId(targetId);
        if (typeof r.latitude === 'number' && typeof r.longitude === 'number') {
          centerOnPin(r.latitude, r.longitude, 3.1);
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
          centerOnPin(match.lat, match.lng, 3.1);
        } else if (typeof t.latitude === 'number' && typeof t.longitude === 'number') {
          centerOnPin(t.latitude, t.longitude, 3.1);
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
        p.provinceEn.toLowerCase().includes(q)
      );
    });
  }, [allPins, filterKind, searchQuery, activePinId]);

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

  if (!isOpen) return null;

  const userPt = projectCoord(userLocation.lat, userLocation.lng);
  const targetPt = activePin ? projectCoord(activePin.lat, activePin.lng) : null;

  const directDistanceKm = activePin
    ? Number((haversineKm(userLocation.lat, userLocation.lng, activePin.lat, activePin.lng) * 1.24).toFixed(1))
    : 0;
  const estMinutes = Math.max(3, Math.round((directDistanceKm / 48) * 60));
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

  const borderPointsStr = CAMBODIA_BORDER_COORDS.map(([lat, lng]) => {
    const pt = projectCoord(lat, lng);
    return `${pt.x},${pt.y}`;
  }).join(' ');

  return (
    <div className="fixed inset-0 z-[130] bg-slate-950/95 backdrop-blur-md flex flex-col overflow-hidden animate-fadeIn">
      {/* Top Header Bar */}
      <div
        style={{ paddingTop: 'max(var(--kft-safe-top, 0px), 0.65rem)' }}
        className="px-3.5 pb-2.5 bg-gradient-to-r from-[#064E3B] via-[#065F46] to-slate-900 border-b border-emerald-500/30 flex items-center justify-between gap-2 shrink-0"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold font-moul text-white truncate">
                {tr(language, 'ផែនទីកម្ពុជា Offline & នាំផ្លូវ', 'Cambodia Offline Map & Route', '柬埔寨离线地图与路线')}
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
            <p className="text-[11px] text-emerald-100/85 font-khmer truncate">
              {tr(
                language,
                `ផ្លូវជាតិ ២៥ ខេត្ត-រាជធានី និងម្ជុលទីតាំងសរុប ${allPins.length.toLocaleString()} កន្លែង (ដំណើរការ 100% ទោះគ្មានអ៊ីនធឺណិត)`,
                `25 Provinces, National Highways & ${allPins.length.toLocaleString()} Verified Places (Works 100% Offline)`,
                `覆盖柬埔寨 25 省市国道与 ${allPins.length.toLocaleString()} 个地点（无网 100% 可用）`
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

      {/* Search & Category Filter Bar */}
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
                'ស្វែងរកហាង រមណីយដ្ឋាន សណ្ឋាគារ ឬខេត្តនៅលើផែនទី Offline...',
                'Search shops, attractions, hotels, or provinces offline...',
                '离线搜索餐厅、景点、酒店或省份...'
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
                centerOnPin(pin.lat, pin.lng, 3.2);
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

      {/* Interactive Cambodia Vector Map Viewport */}
      <div
        className="relative flex-1 min-h-[220px] bg-[#07131F] overflow-hidden select-none touch-none"
        onPointerDown={(e) => {
          dragRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            origX: pan.x,
            origY: pan.y,
          };
        }}
        onPointerMove={(e) => {
          if (!dragRef.current.active) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          setPan({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
        }}
        onPointerUp={() => {
          dragRef.current.active = false;
        }}
        onPointerCancel={() => {
          dragRef.current.active = false;
        }}
      >
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: dragRef.current.active ? 'none' : 'transform 180ms ease-out',
          }}
        >
          <defs>
            <radialGradient id="kftCamLandGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#0E3A2F" />
              <stop offset="70%" stopColor="#092620" />
              <stop offset="100%" stopColor="#061A16" />
            </radialGradient>
          </defs>

          {[11, 12, 13, 14].map((latLine) => {
            const pt = projectCoord(latLine, LON_MIN);
            return (
              <g key={`lat-${latLine}`}>
                <line x1={0} y1={pt.y} x2={SVG_W} y2={pt.y} stroke="#1E293B" strokeWidth={1} strokeDasharray="4 4" />
                <text x={12} y={pt.y - 4} fill="#475569" fontSize={10}>
                  {latLine}°N
                </text>
              </g>
            );
          })}
          {[103, 104, 105, 106, 107].map((lonLine) => {
            const pt = projectCoord(LAT_MIN, lonLine);
            return (
              <g key={`lon-${lonLine}`}>
                <line x1={pt.x} y1={0} x2={pt.x} y2={SVG_H} stroke="#1E293B" strokeWidth={1} strokeDasharray="4 4" />
                <text x={pt.x + 4} y={18} fill="#475569" fontSize={10}>
                  {lonLine}°E
                </text>
              </g>
            );
          })}

          <polygon
            points={borderPointsStr}
            fill="url(#kftCamLandGrad)"
            stroke="#10B981"
            strokeWidth={2.2}
            strokeOpacity={0.65}
          />

          <ellipse
            cx={projectCoord(12.88, 104.05).x}
            cy={projectCoord(12.88, 104.05).y}
            rx={44}
            ry={24}
            transform={`rotate(-28 ${projectCoord(12.88, 104.05).x} ${projectCoord(12.88, 104.05).y})`}
            fill="#0284C7"
            fillOpacity={0.38}
            stroke="#38BDF8"
            strokeWidth={1}
          />
          <text
            x={projectCoord(12.88, 104.05).x}
            y={projectCoord(12.88, 104.05).y + 3}
            textAnchor="middle"
            fill="#7DD3FC"
            fontSize={9}
            fontWeight="bold"
          >
            បឹងទន្លេសាប
          </text>

          {NATIONAL_HIGHWAYS.map((hw) => {
            const pts = hw.coords
              .map(([lat, lng]) => {
                const p = projectCoord(lat, lng);
                return `${p.x},${p.y}`;
              })
              .join(' ');
            const mid = hw.coords[Math.floor(hw.coords.length / 2)];
            const midPt = projectCoord(mid[0], mid[1]);
            return (
              <g key={hw.code}>
                <polyline
                  points={pts}
                  fill="none"
                  stroke={hw.color}
                  strokeWidth={2.4}
                  strokeOpacity={0.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect
                  x={midPt.x - 16}
                  y={midPt.y - 7}
                  width={32}
                  height={13}
                  rx={4}
                  fill="#0F172A"
                  stroke={hw.color}
                  strokeWidth={1}
                />
                <text
                  x={midPt.x}
                  y={midPt.y + 2.5}
                  textAnchor="middle"
                  fill={hw.color}
                  fontSize={7.5}
                  fontWeight="bold"
                >
                  {hw.code}
                </text>
              </g>
            );
          })}

          {PROVINCE_NODES.map((hub) => {
            const pt = projectCoord(hub.lat, hub.lng);
            return (
              <g key={hub.en}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hub.isCapital ? 5.5 : 3.5}
                  fill={hub.isCapital ? '#FBBF24' : '#E2E8F0'}
                  stroke="#0F172A"
                  strokeWidth={1.2}
                />
                <text
                  x={pt.x}
                  y={pt.y - 7}
                  textAnchor="middle"
                  fill={hub.isCapital ? '#FDE68A' : '#CBD5E1'}
                  fontSize={hub.isCapital ? 10.5 : 8.5}
                  fontWeight="bold"
                >
                  {language === 'en' ? hub.en : hub.kh}
                </text>
              </g>
            );
          })}

          {visiblePins.slice(0, 380).map((pin) => {
            const isSelected = activePin?.id === pin.id;
            if (isSelected) return null;
            const pt = projectCoord(pin.lat, pin.lng);
            const color =
              pin.kind === 'restaurant'
                ? '#F97316'
                : pin.kind === 'hotel'
                ? '#38BDF8'
                : pin.kind === 'hospital'
                ? '#F43F5E'
                : '#10B981';
            return (
              <circle
                key={pin.id}
                cx={pt.x}
                cy={pt.y}
                r={3.2}
                fill={color}
                stroke="#0F172A"
                strokeWidth={0.8}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePinId(pin.id);
                }}
              />
            );
          })}

          {targetPt && (
            <g>
              <line
                x1={userPt.x}
                y1={userPt.y}
                x2={targetPt.x}
                y2={targetPt.y}
                stroke="#38BDF8"
                strokeWidth={3}
                strokeDasharray="7 5"
              />
              <circle cx={userPt.x} cy={userPt.y} r={9} fill="#38BDF8" fillOpacity={0.28} />
              <circle cx={userPt.x} cy={userPt.y} r={5} fill="#0284C7" stroke="#FFFFFF" strokeWidth={1.8} />
              <text
                x={userPt.x}
                y={userPt.y + 15}
                textAnchor="middle"
                fill="#7DD3FC"
                fontSize={8.5}
                fontWeight="bold"
              >
                {userLocation.isRealGps
                  ? tr(language, 'ទីតាំងអ្នក (GPS)', 'Your GPS', '您的位置')
                  : tr(language, 'ចំណុចចាប់ផ្តើម (ភ្នំពេញ)', 'Start (Phnom Penh)', '起点（金边）')}
              </text>

              <circle cx={targetPt.x} cy={targetPt.y} r={14} fill="#F43F5E" fillOpacity={0.28} />
              <circle cx={targetPt.x} cy={targetPt.y} r={7} fill="#E11D48" stroke="#FDE047" strokeWidth={2.2} />
              <rect
                x={targetPt.x - 85}
                y={targetPt.y - 28}
                width={170}
                height={17}
                rx={6}
                fill="#0F172A"
                fillOpacity={0.92}
                stroke="#FDE047"
                strokeWidth={1.2}
              />
              <text
                x={targetPt.x}
                y={targetPt.y - 16.5}
                textAnchor="middle"
                fill="#FEF08A"
                fontSize={8.5}
                fontWeight="bold"
              >
                {(language === 'en' ? activePin?.nameEn : activePin?.nameKh)?.slice(0, 28)}
              </text>
            </g>
          )}
        </svg>

        <div className="absolute right-3 top-3 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(5, Number((z + 0.45).toFixed(2))))}
            className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow flex items-center justify-center cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-emerald-300" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.45).toFixed(2))))}
            className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow flex items-center justify-center cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-emerald-300" />
          </button>
          <button
            type="button"
            onClick={() => {
              requestDeviceGps();
              if (activePin) {
                centerOnPin(activePin.lat, activePin.lng, 2.8);
              } else {
                setZoom(1.5);
                setPan({ x: 0, y: 0 });
              }
            }}
            className="w-9 h-9 rounded-xl bg-emerald-700/90 hover:bg-emerald-600 text-white border border-emerald-400/50 shadow flex items-center justify-center cursor-pointer"
            title="Center on Pin"
          >
            <LocateFixed className="w-4 h-4 text-amber-300" />
          </button>
        </div>

        <div className="absolute left-3 bottom-2.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-700/80 text-[10px] text-slate-200 flex items-center gap-2.5 font-khmer pointer-events-none">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            {tr(language, 'ទេសចរណ៍', 'Tourism', '景点')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            {tr(language, 'ហាងម្ហូប', 'Shops', '餐厅')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
            {tr(language, 'សណ្ឋាគារ', 'Hotels', '酒店')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            {tr(language, 'មន្ទីរពេទ្យ', 'Hospitals', '医院')}
          </span>
        </div>
      </div>

      {/* Bottom Selected Place Detail & Offline Route Sheet (with Real Photo & Actions!) */}
      {activePin && (
        <div
          style={{ paddingBottom: 'max(var(--kft-safe-bottom, 0px), 0.75rem)' }}
          className="bg-slate-900 border-t-2 border-emerald-500/50 px-3.5 pt-3 space-y-2.5 max-h-[48dvh] overflow-y-auto shrink-0 font-khmer"
        >
          <div className="flex items-start gap-3">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-400/50 bg-slate-800 shrink-0 shadow-md">
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

          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-center">
            <div>
              <div className="text-[10px] text-slate-400">
                {tr(language, 'ចម្ងាយផ្លូវប៉ាន់ស្មាន', 'Est. Distance', '预计距离')}
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-emerald-400">
                {directDistanceKm} km
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

          {matchedHub && (
            <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-[11px] text-emerald-100 space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <span>🛣️</span>
                <span>
                  {tr(
                    language,
                    'ផ្លូវជាតិសំខាន់ និងទិសដៅធ្វើដំណើរ (Offline Highway Guide)',
                    'National Highway & Route Guide (Offline)',
                    '国家公路与离线行程指南'
                  )}
                </span>
              </div>
              <p className="leading-relaxed">
                {language === 'en'
                  ? matchedHub.nationalRoadEn
                  : language === 'zh'
                  ? matchedHub.nationalRoadZh
                  : matchedHub.nationalRoadKh}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

            <button
              type="button"
              onClick={() => {
                const label = encodeURIComponent(activePin.nameKh || activePin.nameEn);
                const geoUrl = `geo:${activePin.lat},${activePin.lng}?q=${activePin.lat},${activePin.lng}(${label})`;
                openExternalUrlNativeSafe(geoUrl);
              }}
              className="sm:col-span-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/40 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 shrink-0" />
              <span>
                {tr(
                  language,
                  'បើកកូអរដោនេ GPS ក្នុងកម្មវិធីផែនទីទូរស័ព្ទ (សម្រាប់អ្នកបានទាញយក Offline Map ក្នុងទូរស័ព្ទ)',
                  'Open Raw GPS Coordinates in Phone Map App (geo:)',
                  '在手机地图应用中打开 GPS 坐标 (geo:)'
                )}
              </span>
              <ExternalLink className="w-3 h-3 opacity-80 shrink-0" />
            </button>
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
                      centerOnPin(pin.lat, pin.lng, zoom);
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

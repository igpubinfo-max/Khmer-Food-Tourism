import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Navigation,
  Compass,
  Store,
  Mountain,
  Phone,
  Star,
  ArrowUpRight,
  LocateFixed,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  UtensilsCrossed,
  CheckCircle2,
  Utensils,
  Soup,
  Coffee,
  Flame,
  LayoutGrid,
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
import {
  FoodItem,
  Restaurant,
  TouristDestination,
  isPlaceLocationVerified,
  openRestaurantGoogleExternal,
  openDestinationGoogleExternal,
} from '../types';
import { tr, translateProvince } from '../utils/i18n';
import { getLocalizedRestaurant, getLocalizedDestination } from '../utils/zhDynamicTranslator';
import {
  classifyShopBusinessKind,
  matchShopToProductQuery,
  verifyShopDataForDisplay,
} from '../utils/foodFilters';
import { normalizeKhmerFoodText } from '../utils/khmerFoodSearch';
import {
  matchesSearchQuery,
  destinationSearchFields,
  analyzeSearchQuery,
  scoreSearchRecord,
  restaurantSearchFields,
} from '../utils/searchEngine';
import { ShopAvatar } from './icons/DefaultShopIcon';
import { openAiAssistantWithQuery, getAskAiButtonLabel } from '../utils/aiSearchBridge';
import { smoothScrollToElement } from '../utils/smoothScroll';

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
const LAST_KNOWN_GPS_STORAGE_KEY = 'kft_last_known_user_gps_v1';

const RADIUS_OPTIONS: { value: number; labelKh: string; labelEn: string; labelZh: string }[] = [
  { value: 500, labelKh: '៥០០ ម៉ែត្រ', labelEn: '500m', labelZh: '500米' },
  { value: 1000, labelKh: '១ គ.ម', labelEn: '1km', labelZh: '1公里' },
  { value: 2000, labelKh: '២ គ.ម', labelEn: '2km', labelZh: '2公里' },
  { value: 5000, labelKh: '៥ គ.ម', labelEn: '5km', labelZh: '5公里' },
];

function readSavedUserGps(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem(LAST_KNOWN_GPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Number.isFinite(Number(parsed.lat)) &&
      Number.isFinite(Number(parsed.lng)) &&
      Number(parsed.lat) >= 9.5 &&
      Number(parsed.lat) <= 15.0 &&
      Number(parsed.lng) >= 102.0 &&
      Number(parsed.lng) <= 108.0
    ) {
      return { lat: Number(parsed.lat), lng: Number(parsed.lng) };
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function saveUserGps(coords: { lat: number; lng: number }) {
  try {
    localStorage.setItem(
      LAST_KNOWN_GPS_STORAGE_KEY,
      JSON.stringify({ lat: coords.lat, lng: coords.lng, updatedAt: Date.now() })
    );
  } catch {
    // ignore storage errors
  }
}

export const NearMeModal: React.FC = () => {
  const {
    isNearMeModalOpen,
    setIsWhatToEatModalOpen,
    setIsNearMeModalOpen,
    restaurants,
    destinations,
    language,
    setSelectedRestaurant,
    setSelectedDestination,
  } = useApp();

  const [activeType, setActiveType] = useState<'restaurants' | 'destinations'>(() => {
    const init = typeof window !== 'undefined' ? (window as any).__kft_near_me_initial_tab : null;
    return init === 'destinations' ? 'destinations' : 'restaurants';
  });
  const [nearbyQuery, setNearbyQuery] = useState<string>('');
  const [targetFood, setTargetFood] = useState<FoodItem | null>(null);
  const [quickFilterId, setQuickFilterId] = useState<string>('all');
  const nearMeScrollRef = useRef<HTMLDivElement | null>(null);
  const nearbyListStartRef = useRef<HTMLDivElement | null>(null);

  const scrollToNearbyShopList = () => {
    smoothScrollToElement(nearbyListStartRef.current, {
      containerEl: nearMeScrollRef.current,
      offsetTop: 8,
    });
  };
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(() => readSavedUserGps());

  useEffect(() => {
    const onTabEvent = (e: Event) => {
      const tab = (e as CustomEvent<'restaurants' | 'destinations'>).detail;
      if (tab === 'restaurants' || tab === 'destinations') {
        setActiveType(tab);
        setQuickFilterId('all');
      }
    };
    window.addEventListener('kft:near-me-tab', onTabEvent);
    return () => window.removeEventListener('kft:near-me-tab', onTabEvent);
  }, []);

  useEffect(() => {
    if (isNearMeModalOpen && typeof window !== 'undefined') {
      const initTab = (window as any).__kft_near_me_initial_tab;
      if (initTab === 'restaurants' || initTab === 'destinations') {
        setActiveType(initTab);
        (window as any).__kft_near_me_initial_tab = undefined;
      }
      const initFood = (window as any).__kft_near_me_initial_food;
      if (initFood && typeof initFood === 'object') {
        setTargetFood(initFood as FoodItem);
        (window as any).__kft_near_me_initial_food = undefined;
      } else {
        setTargetFood(null);
      }
      const initQuery = (window as any).__kft_near_me_initial_query;
      if (typeof initQuery === 'string') {
        setNearbyQuery(initQuery);
        (window as any).__kft_near_me_initial_query = undefined;
      } else {
        setNearbyQuery('');
      }
      setQuickFilterId('all');
    }
  }, [isNearMeModalOpen]);

  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'granted' | 'fallback'>('idle');
  const [manualProvince, setManualProvince] = useState<string>('រាជធានីភ្នំពេញ');
  const [selectedRadiusMeters, setSelectedRadiusMeters] = useState<number>(MAX_NEARBY_RADIUS_METERS);
  const [isLoadingNearby, setIsLoadingNearby] = useState<boolean>(false);
  const [liveNearbyRestaurants, setLiveNearbyRestaurants] = useState<GooglePlaceCachedItem[]>([]);
  const [liveNearbyAttractions, setLiveNearbyAttractions] = useState<GooglePlaceCachedItem[]>([]);

  // All 25 Cambodian Provinces & Capital City center coordinates
  const provinceCenters: Record<string, { lat: number; lng: number }> = {
    'រាជធានីភ្នំពេញ': { lat: 11.5564, lng: 104.9282 },
    'ខេត្តសៀមរាប': { lat: 13.3633, lng: 103.8564 },
    'ខេត្តបាត់ដំបង': { lat: 13.0957, lng: 103.2022 },
    'ខេត្តកំពត': { lat: 10.6104, lng: 104.1815 },
    'ខេត្តកែប': { lat: 10.4833, lng: 104.3167 },
    'ខេត្តព្រះសីហនុ': { lat: 10.6275, lng: 103.5221 },
    'ខេត្តកំពង់ចាម': { lat: 11.9934, lng: 105.4635 },
    'ខេត្តមណ្ឌលគិរី': { lat: 12.4558, lng: 107.1881 },
    'ខេត្តរតនគិរី': { lat: 13.7394, lng: 106.9873 },
    'ខេត្តកោះកុង': { lat: 11.6153, lng: 102.9838 },
    'ខេត្តកណ្តាល': { lat: 11.4833, lng: 104.9500 },
    'ខេត្តកំពង់ឆ្នាំង': { lat: 12.2500, lng: 104.6667 },
    'ខេត្តកំពង់ស្ពឺ': { lat: 11.4533, lng: 104.5208 },
    'ខេត្តកំពង់ធំ': { lat: 12.7111, lng: 104.8887 },
    'ខេត្តក្រចេះ': { lat: 12.4881, lng: 106.0188 },
    'ខេត្តតាកែវ': { lat: 10.9908, lng: 104.7850 },
    'ខេត្តព្រៃវែង': { lat: 11.4868, lng: 105.3253 },
    'ខេត្តស្វាយរៀង': { lat: 11.0879, lng: 105.7993 },
    'ខេត្តពោធិ៍សាត់': { lat: 12.5388, lng: 103.9192 },
    'ខេត្តបន្ទាយមានជ័យ': { lat: 13.5859, lng: 102.9737 },
    'ខេត្តប៉ៃលិន': { lat: 12.8489, lng: 102.6093 },
    'ខេត្តឧត្តរមានជ័យ': { lat: 14.1818, lng: 103.5176 },
    'ខេត្តព្រះវិហារ': { lat: 13.8073, lng: 104.9805 },
    'ខេត្តស្ទឹងត្រែង': { lat: 13.5259, lng: 105.9683 },
    'ខេត្តត្បូងឃ្មុំ': { lat: 11.8891, lng: 105.6540 },
  };

  const baseCoords = useMemo(() => {
    return userCoords || provinceCenters[manualProvince] || provinceCenters['រាជធានីភ្នំពេញ'];
  }, [userCoords, manualProvince]);

  const handleProvinceChange = (prov: string) => {
    setManualProvince(prov);
    const center = provinceCenters[prov] || provinceCenters['រាជធានីភ្នំពេញ'];
    setUserCoords(center);
    setGeoStatus('fallback');
    void fetchLiveNearby500m(center, false, selectedRadiusMeters);
  };

  const fetchLiveNearby500m = async (
    coords: { lat: number; lng: number },
    forceRefresh = false,
    radiusOverride = selectedRadiusMeters
  ) => {
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return;
    setIsLoadingNearby(true);
    try {
      const res = await searchNearbyPlacesWithin500m(
        coords.lat,
        coords.lng,
        radiusOverride,
        forceRefresh
      );
      setLiveNearbyRestaurants(res.restaurants);
      setLiveNearbyAttractions(res.attractions);
    } catch (err) {
      console.warn('NearMe fetch warning:', err);
    } finally {
      setIsLoadingNearby(false);
    }
  };

  // Request GPS without back-to-back duplicate network bursts
  const requestLocation = (forceRefresh = false) => {
    setGeoStatus('requesting');

    const savedGps = userCoords || readSavedUserGps();
    const defaultCenter = provinceCenters[manualProvince] || provinceCenters['រាជធានីភ្នំពេញ'];
    let fetchedCoords: { lat: number; lng: number } | null = null;

    if (savedGps) {
      if (!userCoords) setUserCoords(savedGps);
      fetchedCoords = savedGps;
      fetchLiveNearby500m(savedGps, forceRefresh, selectedRadiusMeters);
    }

    if ('geolocation' in navigator) {
      const onSuccess = (position: GeolocationPosition) => {
        const nextCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        saveUserGps(nextCoords);
        setUserCoords(nextCoords);
        setGeoStatus('granted');
        if (
          !fetchedCoords ||
          forceRefresh ||
          calculateDistanceMeters(fetchedCoords.lat, fetchedCoords.lng, nextCoords.lat, nextCoords.lng) > 120
        ) {
          fetchedCoords = nextCoords;
          fetchLiveNearby500m(nextCoords, forceRefresh, selectedRadiusMeters);
        }
      };

      const onFinalFallback = () => {
        const fallback = savedGps || defaultCenter;
        setUserCoords(fallback);
        setGeoStatus('fallback');
        if (!fetchedCoords) {
          fetchedCoords = fallback;
          fetchLiveNearby500m(fallback, forceRefresh, selectedRadiusMeters);
        }
      };

      navigator.geolocation.getCurrentPosition(
        onSuccess,
        onFinalFallback,
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 180000 }
      );
    } else {
      const fallback = savedGps || defaultCenter;
      setUserCoords(fallback);
      setGeoStatus('fallback');
      if (!fetchedCoords) {
        fetchLiveNearby500m(fallback, forceRefresh, selectedRadiusMeters);
      }
    }
  };

  useEffect(() => {
    if (isNearMeModalOpen) {
      requestLocation(false);
    }
  }, [isNearMeModalOpen]);

  const handleSelectRadius = (newRadius: number) => {
    setSelectedRadiusMeters(newRadius);
    fetchLiveNearby500m(baseCoords, true, newRadius);
  };

  // Merge & deduplicate verified Supabase restaurants + Google Maps/Live nearby places within user's location
  const allVerifiedCityRestaurants = useMemo(() => {
    const mergedMap = new Map<string, Restaurant>();
    const maxCitySearchRadius = Math.max(selectedRadiusMeters, 15000);

    for (const r of restaurants) {
      if (!verifyShopDataForDisplay(r)) continue;
      const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, r.latitude, r.longitude);
      if (dist <= maxCitySearchRadius) {
        mergedMap.set(r.id, r);
      }
    }

    for (const gp of liveNearbyRestaurants) {
      const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, gp.lat, gp.lng);
      if (dist > maxCitySearchRadius) continue;

      const existingMatch = findDuplicateRestaurantForGooglePlace(gp, Array.from(mergedMap.values()));
      if (existingMatch) {
        const merged = mergeGoogleMapsPlaceWithExistingRestaurant(existingMatch, gp);
        if (verifyShopDataForDisplay(merged)) {
          mergedMap.set(existingMatch.id, merged);
        }
      } else {
        const converted = convertGooglePlaceToRestaurant(gp);
        if (verifyShopDataForDisplay(converted)) {
          mergedMap.set(converted.id, converted);
        }
      }
    }

    return Array.from(mergedMap.values())
      .map((r) => {
        const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, r.latitude, r.longitude);
        return { ...r, distanceMeters: dist };
      })
      .filter((r) => Number.isFinite(r.distanceMeters) && r.distanceMeters <= maxCitySearchRadius)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [restaurants, liveNearbyRestaurants, baseCoords, selectedRadiusMeters]);

  const nearbyRestaurants = useMemo(() => {
    return allVerifiedCityRestaurants.filter((r) => r.distanceMeters <= selectedRadiusMeters);
  }, [allVerifiedCityRestaurants, selectedRadiusMeters]);

  const nearbyDestinations = useMemo(() => {
    const mergedMap = new Map<string, TouristDestination>();

    for (const d of destinations) {
      if (!isPlaceLocationVerified(d)) continue;
      const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, d.latitude, d.longitude);
      if (dist <= selectedRadiusMeters) {
        mergedMap.set(d.id, d);
      }
    }

    for (const gp of liveNearbyAttractions) {
      const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, gp.lat, gp.lng);
      if (dist > selectedRadiusMeters) continue;

      const existingMatch = findDuplicateDestinationForGooglePlace(gp, Array.from(mergedMap.values()));
      if (!existingMatch) {
        const converted = convertGooglePlaceToDestination(gp);
        mergedMap.set(converted.id, converted);
      }
    }

    return Array.from(mergedMap.values())
      .map((d) => {
        const dist = calculateDistanceMeters(baseCoords.lat, baseCoords.lng, d.latitude, d.longitude);
        return { ...d, distanceMeters: dist };
      })
      .filter((d) => Number.isFinite(d.distanceMeters) && d.distanceMeters <= selectedRadiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [destinations, liveNearbyAttractions, baseCoords, selectedRadiusMeters]);

  const filteredNearbyRestaurants = useMemo(() => {
    const rawQuery = nearbyQuery.trim();
    const passesQuickFilter = (r: Restaurant): boolean => {
      if (quickFilterId === 'all') return true;
      const zhLoc = getLocalizedRestaurant(r, 'zh');
      const shopKind = classifyShopBusinessKind(r);
      const haystack = normalizeKhmerFoodText(
        [
          r.nameKh,
          r.nameEn,
          zhLoc.name,
          r.categoryKh,
          r.categoryEn,
          ...(r.signatureDishesKh || []),
          ...(r.signatureDishesEn || []),
          ...(zhLoc.signatureDishes || []),
          ...((r.menuItems || []).map((m) => `${m.nameKh} ${m.nameEn || ''}`)),
        ]
          .filter(Boolean)
          .join(' ')
      );

      if (quickFilterId === 'noodles') {
        if (shopKind === 'bakery_bread' || shopKind === 'coffee_drink' || shopKind === 'pizza_western') return false;
        return /គុយទាវ|មី|មីសួរ|នំបញ្ចុក|លតឆា|noodle|soup|ស៊ុប|面|粉|粿条|粉丝|汤/.test(haystack);
      }
      if (quickFilterId === 'rice_khmer') {
        if (shopKind === 'bakery_bread' || shopKind === 'coffee_drink' || shopKind === 'pizza_western') return false;
        return /បាយ|ម្ហូបខ្មែរ|សម្ល|អាម៉ុក|ឡុកឡាក់|khmer|rice|restaurant|ភោជនីយដ្ឋាន|អាហារដ្ឋាន|饭|高棉|餐厅/.test(haystack);
      }
      if (quickFilterId === 'coffee') {
        return /កាហ្វេ|តែ|ភេសជ្ជៈ|នំប៉័ង|នំខេក|coffee|cafe|café|tea|bakery|咖啡|茶|烘焙/.test(haystack);
      }
      if (quickFilterId === 'bbq_seafood') {
        if (shopKind === 'bakery_bread' || shopKind === 'coffee_drink') return false;
        return /សាច់អាំង|គ្រឿងសមុទ្រ|ស៊ុប|ក្តាម|បង្គា|មឹក|bbq|seafood|grill|hotpot|buffet|烧烤|海鲜|火锅/.test(haystack);
      }
      return true;
    };

    if (!rawQuery) {
      return nearbyRestaurants
        .filter((r) => {
          if (!passesQuickFilter(r)) return false;
          if (quickFilterId !== 'coffee' && classifyShopBusinessKind(r) === 'bakery_bread') {
            return false;
          }
          return true;
        })
        .map((r) => ({
          ...r,
          matchedInventoryItems: (r.signatureDishesKh || []).slice(0, 2),
        }));
    }

    const activeTargetFood =
      targetFood &&
      normalizeKhmerFoodText(rawQuery).includes(normalizeKhmerFoodText(targetFood.nameKh))
        ? targetFood
        : null;

    const evaluateCandidates = (candidates: Array<Restaurant & { distanceMeters: number }>) => {
      const results: Array<
        Restaurant & {
          distanceMeters: number;
          matchedInventoryItems: string[];
          _matchScore: number;
          _isExactProductMatch: boolean;
        }
      > = [];

      const nameQa = analyzeSearchQuery(rawQuery);
      for (const r of candidates) {
        if (!passesQuickFilter(r)) continue;
        const matchRes = matchShopToProductQuery(r, rawQuery, activeTargetFood);
        if (!matchRes.matches) {
          const nameDetail = scoreSearchRecord(nameQa, restaurantSearchFields(r, [getLocalizedRestaurant(r, 'zh').name]));
          if (!(nameDetail.matchedInName && nameDetail.score >= 200)) continue;
          results.push({
            ...r,
            matchedInventoryItems: (r.signatureDishesKh || []).slice(0, 2),
            _matchScore: Math.round(nameDetail.score / 4),
            _isExactProductMatch: nameDetail.exactName,
          });
          continue;
        }
        results.push({
          ...r,
          matchedInventoryItems:
            matchRes.matchedInventoryItems.length > 0
              ? matchRes.matchedInventoryItems
              : (r.signatureDishesKh || []).slice(0, 2),
          _matchScore: matchRes.score,
          _isExactProductMatch: matchRes.isExactProductMatch,
        });
      }

      return results.sort((a, b) => {
        if (a._isExactProductMatch !== b._isExactProductMatch) {
          return a._isExactProductMatch ? -1 : 1;
        }
        const aWithinSelected = a.distanceMeters <= selectedRadiusMeters;
        const bWithinSelected = b.distanceMeters <= selectedRadiusMeters;
        if (aWithinSelected !== bWithinSelected) {
          return aWithinSelected ? -1 : 1;
        }
        if (Math.abs(a._matchScore - b._matchScore) > 35) {
          return b._matchScore - a._matchScore;
        }
        return a.distanceMeters - b.distanceMeters;
      });
    };

    const strictRadiusMatches = evaluateCandidates(nearbyRestaurants);
    if (strictRadiusMatches.length >= 3) {
      return strictRadiusMatches;
    }

    return evaluateCandidates(allVerifiedCityRestaurants);
  }, [nearbyRestaurants, allVerifiedCityRestaurants, nearbyQuery, targetFood, quickFilterId, selectedRadiusMeters]);

  const filteredNearbyDestinations = useMemo(() => {
    const q = nearbyQuery.trim().toLowerCase();
    return nearbyDestinations.filter((d) => {
      const zhLoc = getLocalizedDestination(d, 'zh');
      const haystack = [
        d.nameKh,
        d.nameEn,
        zhLoc.name,
        d.categoryKh,
        d.categoryEn,
        zhLoc.category,
        d.descriptionKh,
        d.descriptionEn,
        zhLoc.description,
        d.addressKh,
        d.addressEn,
        zhLoc.address,
        d.provinceKh,
        d.provinceEn,
        zhLoc.province,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (quickFilterId === 'culture' && !/វត្ត|ប្រាសាទ|សារមន្ទីរ|វប្បធម៌|ប្រវត្តិ|temple|pagoda|museum|palace|heritage|វាំង|寺|庙|宫|博物馆|古迹/.test(haystack)) return false;
      if (quickFilterId === 'nature' && !/ធម្មជាតិ|សួន|ទន្លេ|ភ្នំ|បឹង|ឆ្នេរ|park|river|nature|garden|beach|mountain|自然|公园|河|山|海滩/.test(haystack)) return false;
      if (quickFilterId === 'leisure' && !/ផ្សារ|កម្សាន្ត|ដើរលេង|រមណីយដ្ឋាន|market|mall|walk|night|plaza|市场|夜市|步道|广场/.test(haystack)) return false;
      if (
        q &&
        !matchesSearchQuery(nearbyQuery, {
          ...destinationSearchFields(d, [zhLoc.name]),
          categories: [d.categoryKh, d.categoryEn, zhLoc.category, d.categorySlug],
          texts: [d.descriptionKh, d.descriptionEn, zhLoc.description, zhLoc.address],
        })
      )
        return false;
      return true;
    });
  }, [nearbyDestinations, nearbyQuery, quickFilterId]);

  if (!isNearMeModalOpen) return null;

  const localizedManualProvince = translateProvince(manualProvince, language);
  const meterUnit = tr(language, 'ម៉ែត្រ', 'm', '米');
  const activeRadiusText =
    selectedRadiusMeters === 500
      ? tr(language, '៥០០ ម៉ែត្រ', '500m', '500 米')
      : selectedRadiusMeters === 1000
      ? tr(language, '១ គ.ម', '1km', '1 公里')
      : selectedRadiusMeters === 2000
      ? tr(language, '២ គ.ម', '2km', '2 公里')
      : tr(language, '៥ គ.ម', '5km', '5 公里');

  const formatDistanceLabel = (distMeters: number) => {
    if (distMeters <= 2000) {
      return `${distMeters} ${meterUnit}`;
    }
    const km = (distMeters / 1000).toFixed(1);
    return `${km} ${tr(language, 'គ.ម', 'km', '公里')}`;
  };

  const cleanCardAddress = (rawAddr: string | undefined, provLabel: string) => {
    const cleaned = (rawAddr || '')
      .replace(/(?:\s*,\s*){2,}/g, ', ')
      .replace(/^[\s,.;:–—-]+|[\s,.;:–—-]+$/g, '')
      .trim();
    if (!cleaned || (language === 'en' && /[\u1780-\u17FF]/.test(cleaned))) {
      return language === 'en' ? `${provLabel}, Cambodia` : provLabel;
    }
    return cleaned;
  };

  // 6 Premium 3D Gold-Framed Main Categories (3x2 grid)
  const mainCategoryButtons = [
    {
      id: 'all',
      type: 'restaurants' as const,
      label: tr(language, 'ហាងទាំងអស់', 'All Shops', '全部店铺'),
      count: nearbyRestaurants.length,
      imageSrc: '/categories/shop_cat_all.png',
      gradient: 'linear-gradient(180deg, #FF9933 0%, #D94E08 100%)',
      icon: <LayoutGrid className="w-5 h-5 text-white drop-shadow-xs" strokeWidth={2.2} />,
    },
    {
      id: 'rice_khmer',
      type: 'restaurants' as const,
      label: tr(language, 'បាយ & ម្ហូបខ្មែរ', 'Rice & Khmer', '柬式简餐'),
      imageSrc: '/categories/nearme_cat_rice_khmer.png',
      gradient: 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
      icon: <Utensils className="w-5 h-5 text-white drop-shadow-xs" strokeWidth={2.2} />,
    },
    {
      id: 'noodles',
      type: 'restaurants' as const,
      label: tr(language, 'គុយទាវ & មី', 'Noodles', '粉面汤品'),
      imageSrc: '/categories/nearme_cat_noodles.png',
      gradient: 'linear-gradient(180deg, #F75977 0%, #C41D4B 100%)',
      icon: <Soup className="w-5 h-5 text-white drop-shadow-xs" strokeWidth={2.2} />,
    },
    {
      id: 'coffee',
      type: 'restaurants' as const,
      label: tr(language, 'កាហ្វេ & ភេសជ្ជៈ', 'Café & Drinks', '咖啡饮品'),
      imageSrc: '/categories/shop_cat_drinks.png',
      gradient: 'linear-gradient(180deg, #3290FA 0%, #1254C7 100%)',
      icon: <Coffee className="w-5 h-5 text-white drop-shadow-xs" strokeWidth={2.2} />,
    },
    {
      id: 'bbq_seafood',
      type: 'restaurants' as const,
      label: tr(language, 'សាច់អាំង & ស៊ុប', 'BBQ & Hotpot', '烧烤海鲜'),
      imageSrc: '/categories/nearme_cat_bbq.png',
      gradient: 'linear-gradient(180deg, #F4B630 0%, #C67D0D 100%)',
      icon: <Flame className="w-5 h-5 text-white drop-shadow-xs" strokeWidth={2.2} />,
    },
    {
      id: 'destinations',
      type: 'destinations' as const,
      label: tr(language, 'កន្លែងជិតខ្ញុំ', 'Nearby Places', '附近景点'),
      count: nearbyDestinations.length,
      imageSrc: '/categories/shop_cat_nearme.png',
      gradient: 'linear-gradient(180deg, #22AAA3 0%, #0E6769 100%)',
      icon: <Compass className="w-5 h-5 text-white drop-shadow-xs" strokeWidth={2.2} />,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 animate-in fade-in duration-200 overscroll-none"
      onClick={() => setIsNearMeModalOpen(false)}
    >
      <div
        className="w-full max-w-full md:max-w-2xl lg:max-w-3xl bg-[#1E293B] text-slate-900 rounded-none md:rounded-3xl border-0 md:border border-slate-700/80 shadow-2xl h-full md:h-[92dvh] max-h-full md:max-h-[92vh] flex flex-col overflow-hidden overscroll-contain font-khmer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clean Header */}
        <div
          style={{
            background: 'linear-gradient(92deg, #064E3B 0%, #047857 55%, #0D9488 100%)',
            paddingTop: 'max(var(--kft-safe-top, 0px), 0.75rem)',
          }}
          className="px-3.5 sm:px-4 pb-3 text-white flex items-center justify-between shrink-0 shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              style={{
                background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                boxShadow: '0 4px 10px rgba(234, 88, 12, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
              }}
              className="w-10 h-10 rounded-2xl border border-white/40 flex items-center justify-center text-white shrink-0"
            >
              {activeType === 'restaurants' ? (
                <UtensilsCrossed className="w-5 h-5" />
              ) : (
                <Compass className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-moul text-xs sm:text-sm text-white leading-[1.7] py-0.5 break-words">
                  {tr(language, 'ស្វែងរកម្ហូបជិតខ្ញុំ', 'Food & Shops Near Me', '附近美食与店铺')}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 border border-white/35 text-white text-[10px] font-extrabold shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-amber-300" />
                  <span>{tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费')}</span>
                </span>
              </div>
              <p className="text-[11px] text-emerald-50 font-khmer leading-[1.55] break-words">
                {tr(
                  language,
                  `ក្នុងរង្វង់ ${activeRadiusText} ពីទីតាំង GPS របស់អ្នក • នាំផ្លូវផ្ទាល់`,
                  `Within ${activeRadiusText} of your GPS • Direct map directions`,
                  `距离您当前位置 ${activeRadiusText} 以内 • 支持一键路线导航`
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNearMeModalOpen(false)}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={nearMeScrollRef} className="flex-1 overflow-y-auto no-scrollbar bg-[#1E293B]">
        {/* Essential Control Bar: GPS Location + Search Shops + 6 Colorful Gradient Main Categories */}
        <div className="px-3.5 pt-2.5 pb-3 bg-[#1E293B] border-b border-slate-700/80 space-y-2.5">
          {/* Row 1: Essential GPS Location Status + Province Selector + Refresh GPS */}
          <div className="flex items-center justify-between gap-2 flex-wrap bg-white px-3 py-2 rounded-2xl border border-slate-200/85 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
              </span>
              <span className="text-[11.5px] font-extrabold text-slate-800 leading-[1.6] break-words">
                {geoStatus === 'granted'
                  ? tr(
                      language,
                      `GPS ផ្ទាល់ • ${localizedManualProvince}`,
                      `Live GPS • ${localizedManualProvince}`,
                      `实时 GPS • ${localizedManualProvince}`
                    )
                  : geoStatus === 'requesting'
                  ? tr(
                      language,
                      'កំពុងចាប់ទីតាំង GPS...',
                      'Locating GPS...',
                      '正在获取 GPS...'
                    )
                  : tr(
                      language,
                      `${localizedManualProvince} • ${activeRadiusText}`,
                      `${localizedManualProvince} • ${activeRadiusText}`,
                      `${localizedManualProvince} • ${activeRadiusText}`
                    )}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={manualProvince}
                onChange={(e) => handleProvinceChange(e.target.value)}
                aria-label={tr(language, 'ជ្រើសរើសខេត្ត/ក្រុង', 'Select Province/City', '选择省份/城市')}
                className="px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[10.5px] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {Object.keys(provinceCenters).map((prov) => (
                  <option key={prov} value={prov}>
                    {translateProvince(prov, language)}
                  </option>
                ))}
              </select>

              <button
                onClick={() => requestLocation(true)}
                disabled={isLoadingNearby}
                style={{
                  background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                }}
                className="px-2.5 py-1 rounded-xl disabled:opacity-60 text-white text-[10.5px] font-extrabold transition shadow-2xs flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingNearby ? 'animate-spin' : ''}`} />
                <span>{tr(language, 'GPS ថ្មី', 'GPS', '定位')}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Clean White Rounded Search Shops Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={nearbyQuery}
              onChange={(e) => setNearbyQuery(e.target.value)}
              placeholder={tr(
                language,
                'ស្វែងរកហាង ឬមុខម្ហូបជិតអ្នក (ឧ. គុយទាវ, កាហ្វេ, បាយ)...',
                'Search nearby shops or dishes (e.g. noodles, coffee, rice)...',
                '搜索附近的餐厅或菜品（如 粿条、咖啡、米饭）...'
              )}
              className="w-full h-10 pl-9 pr-8 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.04)] text-xs sm:text-[13px] font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition"
            />
            {nearbyQuery && (
              <button
                type="button"
                onClick={() => {
                  setNearbyQuery('');
                  setTargetFood(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {nearbyQuery.trim().length >= 2 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const q = nearbyQuery.trim();
                  setIsNearMeModalOpen(false);
                  openAiAssistantWithQuery(q, setIsWhatToEatModalOpen);
                }}
                style={{
                  background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-white text-[11px] font-extrabold shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>{getAskAiButtonLabel(language)}</span>
              </button>
            </div>
          )}

          {/* Row 3: 6 Premium 3D Gold-Framed Main Category Buttons (3×2 Grid) + Clear White Text Below Each Button */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.84) 0%, rgba(15, 23, 42, 0.94) 100%)',
              boxShadow: '0 10px 28px rgba(15, 23, 42, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
            }}
            className="rounded-[24px] p-2.5 sm:p-3.5 border border-amber-400/25"
          >
            <div className="grid grid-cols-3 gap-x-2 sm:gap-x-3 gap-y-2.5 sm:gap-y-3">
              {mainCategoryButtons.map((card) => {
                const active =
                  card.type === 'destinations'
                    ? activeType === 'destinations'
                    : activeType === 'restaurants' && quickFilterId === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    id={`kft-nearme-cat-${card.id}-btn`}
                    onClick={() => {
                      if (card.type === 'destinations') {
                        setActiveType('destinations');
                        setQuickFilterId('all');
                      } else {
                        setActiveType('restaurants');
                        setQuickFilterId(card.id);
                      }
                      scrollToNearbyShopList();
                    }}
                    aria-pressed={active}
                    className="group relative flex flex-col items-center justify-start min-w-0 p-0 bg-transparent border-0 transition-transform duration-150 active:scale-[0.95] cursor-pointer focus:outline-none select-none"
                  >
                    {/* 3D Gold-Bordered Button Graphic */}
                    <div
                      className="relative w-full aspect-[2.12/1] flex items-center justify-center transition-all duration-200 rounded-[14px]"
                      style={{
                        filter: active
                          ? 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.72)) drop-shadow(0 5px 10px rgba(15, 23, 42, 0.35))'
                          : 'drop-shadow(0 5px 10px rgba(15, 23, 42, 0.32))',
                        transform: active ? 'translateY(-1.5px) scale(1.02)' : 'none',
                      }}
                    >
                      <img
                        src={card.imageSrc}
                        alt={card.label}
                        loading="eager"
                        decoding="async"
                        draggable={false}
                        className="w-full h-full object-contain pointer-events-none select-none"
                      />
                    </div>

                    {/* Clear White Title Below Each Button */}
                    <span
                      className="mt-1 px-0.5 font-khmer font-extrabold leading-[1.62] text-center break-words whitespace-normal w-full transition-colors duration-150"
                      style={{
                        fontSize: 'clamp(11px, 3.05vw, 13.4px)',
                        color: active ? '#FDE047' : '#FFFFFF',
                        textShadow: active
                          ? '0 1px 3px rgba(0, 0, 0, 0.92), 0 0 8px rgba(250, 204, 21, 0.45)'
                          : '0 1.5px 3px rgba(0, 0, 0, 0.90), 0 0 2px rgba(0, 0, 0, 0.75)',
                      }}
                    >
                      {card.label}
                    </span>

                    {/* Subtle Gold Active Indicator Bar Below Title */}
                    {active && (
                      <span
                        className="mt-0.5 h-1 w-7 rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, #FDE047 0%, #F59E0B 100%)',
                          boxShadow: '0 0 6px rgba(250, 204, 21, 0.8)',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div ref={nearbyListStartRef} id="kft-nearby-shop-list-section" className="scroll-mt-2" />

        {/* Shop & Place Cards List */}
        <div className="p-3.5 sm:p-4 pb-16 space-y-3 bg-[#1E293B] min-h-[75vh]">
          {isLoadingNearby ? (
            <div className="py-14 px-4 text-center bg-white rounded-3xl border border-slate-200/90 shadow-xs my-2">
              <Loader2 className="w-8 h-8 mx-auto mb-3 text-emerald-600 animate-spin" />
              <h4 className="font-extrabold text-slate-900 text-sm mb-1 font-khmer">
                {tr(
                  language,
                  `កំពុងស្វែងរកទីតាំងពិតក្នុងរង្វង់ ${activeRadiusText}...`,
                  `Searching real places within ${activeRadiusText}...`,
                  `正在搜索 ${activeRadiusText} 范围内的真实地点...`
                )}
              </h4>
              <p className="text-xs text-slate-500">
                {tr(
                  language,
                  'កំពុងស្វែងរកហាងអាហារ និងកន្លែងដើរលេងនៅក្បែរអ្នក...',
                  'Finding nearby restaurants and attractions...',
                  '正在查找附近的餐厅与景点...'
                )}
              </p>
            </div>
          ) : activeType === 'restaurants' ? (
            filteredNearbyRestaurants.length === 0 ? (
              <div className="py-12 px-4 text-center bg-white rounded-3xl border border-slate-200/90 shadow-xs my-2">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                  <Compass className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm mb-1.5 font-khmer">
                  {tr(
                    language,
                    `រកមិនឃើញហាងក្នុងរង្វង់ ${activeRadiusText} ទេ`,
                    `No shops found within ${activeRadiusText}`,
                    `${activeRadiusText} 范围内未找到商家`
                  )}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4 leading-relaxed font-khmer">
                  {tr(
                    language,
                    `មិនមានហាង ឬភោជនីយដ្ឋានក្នុងរង្វង់ ${activeRadiusText} ពីទីតាំង GPS របស់អ្នកឡើយ។ សូមសាកល្បងពង្រីករង្វង់ស្វែងរក ឬចាប់ទីតាំងឡើងវិញ។`,
                    `No shops or restaurants were found within ${activeRadiusText} of your current GPS location. Try expanding the radius or refreshing your GPS.`,
                    `您当前 GPS 位置 ${activeRadiusText} 以内暂无餐厅或商铺。请尝试扩大搜索范围或刷新定位。`
                  )}
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {selectedRadiusMeters < 5000 && (
                    <button
                      onClick={() =>
                        handleSelectRadius(
                          selectedRadiusMeters === 500 ? 1000 : selectedRadiusMeters === 1000 ? 2000 : 5000
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold font-khmer rounded-full transition cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {selectedRadiusMeters === 500
                          ? tr(language, 'ពង្រីកទៅ ១ គ.ម (1km)', 'Expand to 1km', '扩大至 1公里')
                          : tr(language, 'ពង្រីកទៅ ២ គ.ម (2km)', 'Expand to 2km', '扩大至 2公里')}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => requestLocation(true)}
                    style={{
                      background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-white text-xs font-extrabold font-khmer rounded-full shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <LocateFixed className="w-4 h-4" />
                    <span>{tr(language, 'ចាប់ទីតាំងឡើងវិញ', 'Refresh GPS', '刷新定位')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredNearbyRestaurants.map((r) => {
                  const rLoc = getLocalizedRestaurant(r, language);
                  const hasOfficialPhoto =
                    Boolean(r.photoUrl) &&
                    !r.photoUrl?.startsWith('data:image/svg+xml') &&
                    r.googleMapsMeta?.hasOfficialGooglePhoto !== false;

                  return (
                    <div
                      key={r.id}
                      onClick={() => {
                        setSelectedRestaurant(r);
                        setIsNearMeModalOpen(false);
                      }}
                      className="p-3 bg-white rounded-[22px] border border-slate-200/90 shadow-[0_6px_18px_rgba(15,23,42,0.05)] hover:border-emerald-500/60 transition space-y-2.5 cursor-pointer"
                    >
                      <div className="flex gap-3">
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/70">
                          <ShopAvatar
                            restaurant={r}
                            alt={rLoc.name}
                            className="w-full h-full rounded-2xl object-cover"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/65 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                            {hasOfficialPhoto
                              ? tr(language, 'រូបភាពហាង', 'Photo', '实景图')
                              : tr(language, 'ផែនទី GPS', 'GPS Map', '地图点')}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-1.5">
                              <h4
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRestaurant(r);
                                  setIsNearMeModalOpen(false);
                                }}
                                className="font-extrabold text-[13.5px] sm:text-sm text-slate-900 leading-[1.65] line-clamp-2 break-words cursor-pointer hover:text-emerald-700"
                              >
                                {rLoc.name}
                              </h4>
                              <span
                                style={{
                                  background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                                }}
                                className="px-2 py-0.5 rounded-full text-white text-[10.5px] font-extrabold shrink-0 shadow-2xs"
                              >
                                📍 {formatDistanceLabel(r.distanceMeters)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 flex-wrap">
                              <div className="flex items-center gap-0.5">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span className="font-extrabold text-slate-900">
                                  {r.rating > 0 ? r.rating.toFixed(1) : '4.5'}
                                </span>
                              </div>
                              <span>•</span>
                              <span className="font-semibold leading-[1.5]">
                                {translateProvince(r.provinceKh || rLoc.province, language)}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 line-clamp-2 break-words leading-[1.55] mt-1">
                              {cleanCardAddress(rLoc.address, translateProvince(r.provinceKh || rLoc.province, language))}
                            </p>
                          </div>

                          {r.matchedInventoryItems && r.matchedInventoryItems.length > 0 && (
                            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[10.5px] font-bold text-emerald-800 max-w-full">
                              <span className="line-clamp-1 break-words leading-[1.5]">
                                🍜 {r.matchedInventoryItems.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Direct Directions & Call Action Buttons */}
                      <div
                        className="flex items-center gap-2 pt-2 border-t border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openRestaurantGoogleExternal(r, 'directions', baseCoords)}
                          style={{
                            background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                          }}
                          className="flex-1 py-2 px-3 text-white rounded-xl text-xs font-extrabold shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-white" />
                          <span>{tr(language, 'បង្ហាញផ្លូវ', 'Directions', '路线导航')}</span>
                        </button>

                        {sanitizeDialablePhone(r.phone) && (
                          <a
                            href={`tel:${sanitizeDialablePhone(r.phone)}`}
                            style={{
                              background: 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)',
                            }}
                            className="p-2 text-white rounded-xl shadow-xs transition active:scale-95"
                            title={r.phone}
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}

                        <button
                          onClick={() => {
                            setSelectedRestaurant(r);
                            setIsNearMeModalOpen(false);
                          }}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                          title={tr(language, 'ព័ត៌មានលម្អិត', 'Details', '查看详情')}
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : filteredNearbyDestinations.length === 0 ? (
            <div className="py-12 px-4 text-center bg-white rounded-3xl border border-slate-200/90 shadow-xs my-2">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                <Mountain className="w-7 h-7" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm mb-1.5 font-khmer">
                {tr(
                  language,
                  `រកមិនឃើញកន្លែងដើរលេងក្នុងរង្វង់ ${activeRadiusText} ទេ`,
                  `No spots found within ${activeRadiusText}`,
                  `${activeRadiusText} 范围内未找到景点`
                )}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4 leading-relaxed font-khmer">
                {tr(
                  language,
                  `មិនមានកន្លែងកម្សាន្តក្នុងរង្វង់ ${activeRadiusText} ពីទីតាំង GPS របស់អ្នកឡើយ។ សូមសាកល្បងពង្រីករង្វង់ស្វែងរក ឬចាប់ទីតាំងឡើងវិញ។`,
                  `No tourist spots were found within ${activeRadiusText} of your current GPS location. Try expanding the radius or refreshing your GPS.`,
                  `您当前 GPS 位置 ${activeRadiusText} 以内暂无旅游景点。请尝试扩大搜索范围或刷新定位。`
                )}
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {selectedRadiusMeters < 5000 && (
                  <button
                    onClick={() =>
                      handleSelectRadius(
                        selectedRadiusMeters === 500 ? 1000 : selectedRadiusMeters === 1000 ? 2000 : 5000
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold font-khmer rounded-full transition cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {selectedRadiusMeters === 500
                        ? tr(language, 'ពង្រីកទៅ ១ គ.ម (1km)', 'Expand to 1km', '扩大至 1公里')
                        : tr(language, 'ពង្រីកទៅ ២ គ.ម (2km)', 'Expand to 2km', '扩大至 2公里')}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => requestLocation(true)}
                  style={{
                    background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-white text-xs font-extrabold font-khmer rounded-full shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <LocateFixed className="w-4 h-4" />
                  <span>{tr(language, 'ចាប់ទីតាំងឡើងវិញ', 'Refresh GPS', '刷新定位')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredNearbyDestinations.map((d) => {
                const dLoc = getLocalizedDestination(d, language);
                const hasOfficialPhoto =
                  !d.photoUrl?.startsWith('data:image/svg+xml') &&
                  d.googleMapsMeta?.hasOfficialGooglePhoto !== false;
                return (
                  <div
                    key={d.id}
                    className="p-3 bg-white rounded-[22px] border border-slate-200/90 shadow-[0_6px_18px_rgba(15,23,42,0.05)] hover:border-emerald-500/60 transition space-y-2.5"
                  >
                    <div className="flex gap-3">
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/70">
                        <img decoding="async"
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
                        <span className="absolute bottom-1 right-1 bg-black/65 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                          {hasOfficialPhoto
                            ? tr(language, 'រូបភាពទីតាំង', 'Photo', '实景图')
                            : tr(language, 'ផែនទី GPS', 'GPS Map', '地图点')}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5">
                          <h4
                            onClick={() => {
                              if (String(d.id).startsWith('gplace_dest_')) {
                                openDestinationGoogleExternal(d, 'directions', baseCoords);
                                return;
                              }
                              setSelectedDestination(d);
                              setIsNearMeModalOpen(false);
                            }}
                            className="font-extrabold text-[13.5px] sm:text-sm text-slate-900 leading-[1.65] line-clamp-2 break-words cursor-pointer hover:text-emerald-700"
                          >
                            {dLoc.name}
                          </h4>
                          <span
                            style={{
                              background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                            }}
                            className="px-2 py-0.5 rounded-full text-white text-[10.5px] font-extrabold shrink-0 shadow-2xs"
                          >
                            📍 {formatDistanceLabel(d.distanceMeters)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 flex-wrap">
                          <span className="font-extrabold text-emerald-700">{dLoc.category}</span>
                          <span>•</span>
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-extrabold text-slate-900">
                              {d.rating > 0 ? d.rating.toFixed(1) : '4.6'}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-2 break-words leading-[1.55] mt-1">
                          {cleanCardAddress(dLoc.address, translateProvince(d.provinceKh || dLoc.province, language))}
                        </p>
                      </div>
                    </div>

                    {/* Direct Navigation */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => openDestinationGoogleExternal(d, 'directions', baseCoords)}
                        style={{
                          background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                        }}
                        className="flex-1 py-2 px-3 text-white rounded-xl text-xs font-extrabold shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5 text-white" />
                        <span>{tr(language, 'បង្ហាញផ្លូវ', 'Directions', '路线导航')}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (String(d.id).startsWith('gplace_dest_')) {
                            openDestinationGoogleExternal(d, 'directions', baseCoords);
                            return;
                          }
                          setSelectedDestination(d);
                          setIsNearMeModalOpen(false);
                        }}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                        title={tr(language, 'ព័ត៌មានលម្អិត', 'Details', '查看详情')}
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

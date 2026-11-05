import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Search,
  CheckCircle2,
  Loader2,
  ExternalLink,
  AlertCircle,
  Crosshair,
  Building2,
  ClipboardPaste,
} from 'lucide-react';
import {
  CAMBODIA_PROVINCE_GEO_LIST,
  calculateHaversineMeters,
  inferCambodiaProvinceFromAddressOrGps,
  resolveProvinceGeoConfig,
  searchGoogleMapsPlacesAdvanced,
} from '../services/googlePlacesService';
import { rankBySearchRelevance, normalizeSearchText } from '../utils/searchEngine';
import { getCurrentDeviceLocation } from '../services/restaurantCheckInService';
import { extractCoordsFromGoogleMapsUrl, isValidGoogleMapsUrl, openExternalUrlNativeSafe } from '../types';

export interface ShopCheckInLocationResult {
  latitude: number;
  longitude: number;
  formattedAddressKh: string;
  formattedAddressEn: string;
  provinceKh: string;
  provinceEn: string;
  mapUrl: string;
  placeName?: string;
}

interface ShopLocationCheckInPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLocation: (result: ShopCheckInLocationResult) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  initialProvinceKh?: string;
  shopName?: string;
  language?: 'km' | 'en' | 'zh';
}

interface SearchCandidate {
  name: string;
  altName?: string;
  address: string;
  lat: number;
  lng: number;
  provinceKh: string;
  mapUrl?: string;
  category?: string;
}

export const ShopLocationCheckInPickerModal: React.FC<ShopLocationCheckInPickerModalProps> = ({
  isOpen,
  onClose,
  onConfirmLocation,
  initialLat,
  initialLng,
  initialAddress = '',
  initialProvinceKh = 'រាជធានីភ្នំពេញ',
  shopName = '',
  language = 'km',
}) => {
  const isKm = language === 'km';

  const defaultProvGeo = resolveProvinceGeoConfig(initialProvinceKh) || CAMBODIA_PROVINCE_GEO_LIST[0];
  const hasValidInitialCoords =
    typeof initialLat === 'number' &&
    typeof initialLng === 'number' &&
    Number.isFinite(initialLat) &&
    Number.isFinite(initialLng) &&
    !(Math.abs(initialLat - 11.5564) < 0.0001 && Math.abs(initialLng - 104.9282) < 0.0001);

  const [lat, setLat] = useState<number>(hasValidInitialCoords ? initialLat! : defaultProvGeo.lat);
  const [lng, setLng] = useState<number>(hasValidInitialCoords ? initialLng! : defaultProvGeo.lng);
  const [customMapUrl, setCustomMapUrl] = useState<string>('');
  const [formattedAddress, setFormattedAddress] = useState<string>(initialAddress || '');
  const [provinceKh, setProvinceKh] = useState<string>(initialProvinceKh || 'រាជធានីភ្នំពេញ');
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [gpsWarning, setGpsWarning] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingPlace, setIsSearchingPlace] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchCandidate[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'done' | 'empty'>('idle');
  const searchRequestIdRef = useRef<number>(0);
  const [manualCoordInput, setManualCoordInput] = useState<string>('');
  const [mapLoadError, setMapLoadError] = useState<boolean>(false);
  const [pasteNotice, setPasteNotice] = useState<string>('');

  const reverseGeocodeCoordinates = useCallback(
    async (targetLat: number, targetLng: number) => {
      setIsReverseGeocoding(true);
      const inferredProv = inferCambodiaProvinceFromAddressOrGps('', targetLat, targetLng);
      const normalizedProvKh =
        inferredProv === 'ភ្នំពេញ' ? 'រាជធានីភ្នំពេញ' : inferredProv;
      setProvinceKh(normalizedProvKh);

      try {
        const arcUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=json&location=${targetLng},${targetLat}&langCode=km`;
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 3800);
        const res = await fetch(arcUrl, { signal: controller.signal });
        clearTimeout(tId);
        if (res.ok) {
          const data = await res.json();
          const addr = data?.address;
          if (addr) {
            const parts = [
              addr.PlaceName,
              addr.Address,
              addr.Neighborhood || addr.District,
              addr.City || addr.Subregion,
            ]
              .map((p) => String(p || '').trim())
              .filter(Boolean);
            const uniqueParts = Array.from(new Set(parts));
            if (uniqueParts.length > 0) {
              const resolvedAddr = uniqueParts.join(', ');
              setFormattedAddress(resolvedAddr);
              const detectedProv = inferCambodiaProvinceFromAddressOrGps(
                `${resolvedAddr} ${addr.Region || ''}`,
                targetLat,
                targetLng
              );
              setProvinceKh(detectedProv === 'ភ្នំពេញ' ? 'រាជធានីភ្នំពេញ' : detectedProv);
              setIsReverseGeocoding(false);
              return;
            }
          }
        }
      } catch {
        // Fallback to Nominatim
      }

      try {
        const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${targetLat}&lon=${targetLng}&accept-language=km,en`;
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(nomUrl, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(tId);
        if (res.ok) {
          const data = await res.json();
          const a = data?.address || {};
          const parts = [
            data?.name,
            a.road || a.pedestrian,
            a.suburb || a.quarter || a.village,
            a.city_district || a.county || a.town,
            a.city || a.state,
          ]
            .map((p) => String(p || '').trim())
            .filter(Boolean);
          const uniqueParts = Array.from(new Set(parts));
          if (uniqueParts.length > 0) {
            const resolvedAddr = uniqueParts.join(', ');
            setFormattedAddress(resolvedAddr);
            const detectedProv = inferCambodiaProvinceFromAddressOrGps(
              resolvedAddr,
              targetLat,
              targetLng
            );
            setProvinceKh(detectedProv === 'ភ្នំពេញ' ? 'រាជធានីភ្នំពេញ' : detectedProv);
            setIsReverseGeocoding(false);
            return;
          }
        }
      } catch {
        // Fallback to coordinate description
      }

      setFormattedAddress((prev) =>
        prev.trim()
          ? prev
          : `${normalizedProvKh} (GPS: ${targetLat.toFixed(5)}, ${targetLng.toFixed(5)})`
      );
      setIsReverseGeocoding(false);
    },
    []
  );

  const applyParsedLocationInput = useCallback(
    async (rawText: string): Promise<boolean> => {
      const trimmed = rawText.trim();
      if (!trimmed) return false;

      // 1. Check if it's a Google Maps URL with coordinates
      const extracted = extractCoordsFromGoogleMapsUrl(trimmed);
      if (extracted) {
        const pLat = Number(extracted.latitude.toFixed(6));
        const pLng = Number(extracted.longitude.toFixed(6));
        setLat(pLat);
        setLng(pLng);
        setManualCoordInput(`${pLat.toFixed(6)}, ${pLng.toFixed(6)}`);
        if (isValidGoogleMapsUrl(trimmed)) {
          setCustomMapUrl(trimmed);
        }
        setPasteNotice(
          isKm
            ? `✅ បានទាញយកកូអរដោនេ GPS (${pLat.toFixed(5)}, ${pLng.toFixed(5)}) និងលីង Google Maps ដោយស្វ័យប្រវត្តិ!`
            : `✅ Automatically retrieved GPS (${pLat.toFixed(5)}, ${pLng.toFixed(5)}) & Google Maps link!`
        );
        await reverseGeocodeCoordinates(pLat, pLng);
        return true;
      }

      // 2. Check if it's raw lat,lng coordinates
      const coordMatch = trimmed.match(/(-?\d+\.\d+)\s*[,/\s]\s*(-?\d+\.\d+)/);
      if (coordMatch) {
        const pLat = parseFloat(coordMatch[1]);
        const pLng = parseFloat(coordMatch[2]);
        if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
          setLat(Number(pLat.toFixed(6)));
          setLng(Number(pLng.toFixed(6)));
          setManualCoordInput(`${pLat.toFixed(6)}, ${pLng.toFixed(6)}`);
          setPasteNotice(
            isKm
              ? `✅ បានកំណត់កូអរដោនេ GPS (${pLat.toFixed(5)}, ${pLng.toFixed(5)}) ដោយជោគជ័យ!`
              : `✅ GPS coordinates (${pLat.toFixed(5)}, ${pLng.toFixed(5)}) applied!`
          );
          await reverseGeocodeCoordinates(pLat, pLng);
          return true;
        }
      }

      // 3. If it's a valid short Google Maps link (e.g. https://maps.app.goo.gl/...) without inline coords
      if (isValidGoogleMapsUrl(trimmed)) {
        setCustomMapUrl(trimmed);
        setPasteNotice(
          isKm
            ? '✅ បានរក្សាទុកលីង Google Maps! សូមពិនិត្យម្ជុល GPS នៅលើផែនទីខាងក្រោម។'
            : '✅ Saved Google Maps link! Verify the GPS pin on the map below.'
        );
        return true;
      }

      return false;
    },
    [isKm, reverseGeocodeCoordinates]
  );

  const handleUseMyCurrentLocation = useCallback(async () => {
    setIsLocatingGps(true);
    setGpsWarning('');
    try {
      const gps = await getCurrentDeviceLocation();
      setLat(Number(gps.latitude.toFixed(6)));
      setLng(Number(gps.longitude.toFixed(6)));
      setManualCoordInput(`${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`);
      if (gps.errorMessage) {
        setGpsWarning(
          isKm
            ? 'មិនអាចទាញយក GPS ផ្ទាល់ពីឧបករណ៍បានទេ។ អ្នកអាចវាយឈ្មោះហាង/ផ្លូវ ដើម្បីស្វែងរកលើផែនទី ឬរំកិលម្ជុល (Pin) ខាងក្រោម!'
            : 'GPS permission unavailable. You can search your shop/street or adjust the pin below!'
        );
      }
      await reverseGeocodeCoordinates(gps.latitude, gps.longitude);
    } catch {
      setGpsWarning(
        isKm
          ? 'ប្រព័ន្ធ GPS មិនដំណើរការទេ។ សូមស្វែងរកទីតាំងហាងនៅលើផែនទីខាងក្រោម។'
          : 'GPS unavailable. Please search or select your shop location below.'
      );
    } finally {
      setIsLocatingGps(false);
    }
  }, [isKm, reverseGeocodeCoordinates]);

  // Initialize when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setGpsWarning('');
    setPasteNotice('');
    setSearchResults([]);
    setMapLoadError(false);
    if (shopName && !searchQuery) {
      setSearchQuery(shopName);
    }

    if (hasValidInitialCoords) {
      setLat(Number(initialLat!.toFixed(6)));
      setLng(Number(initialLng!.toFixed(6)));
      setManualCoordInput(`${initialLat!.toFixed(6)}, ${initialLng!.toFixed(6)}`);
      if (initialAddress) {
        setFormattedAddress(initialAddress);
      } else {
        reverseGeocodeCoordinates(initialLat!, initialLng!);
      }
    } else {
      handleUseMyCurrentLocation();
    }
  }, [isOpen]);

  // Automatically check clipboard when returning from external Google Maps app
  useEffect(() => {
    if (!isOpen) return;
    const handleWindowReturn = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && (isValidGoogleMapsUrl(text.trim()) || extractCoordsFromGoogleMapsUrl(text.trim()))) {
            await applyParsedLocationInput(text.trim());
          }
        }
      } catch {
        // Clipboard permission not granted silently ignore
      }
    };
    window.addEventListener('focus', handleWindowReturn);
    return () => window.removeEventListener('focus', handleWindowReturn);
  }, [isOpen, applyParsedLocationInput]);

  if (!isOpen) return null;

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const applied = await applyParsedLocationInput(text.trim());
          if (!applied) {
            setSearchQuery(text.trim());
          }
          return;
        }
      }
    } catch {
      // Fallback
    }
    setGpsWarning(
      isKm
        ? 'សូមបិទភ្ជាប់ (Paste) លីង Google Maps ឬកូអរដោនេ GPS ទៅក្នុងប្រអប់ស្វែងរកខាងក្រោម។'
        : 'Please paste your Google Maps link or GPS coordinates into the search box below.'
    );
  };

  const handleSearchPlace = async (e?: React.FormEvent, opts?: { silent?: boolean }) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    // First check if user pasted a Google Maps link or lat,lng coordinates (only on explicit submit)
    if (!opts?.silent) {
      const wasParsed = await applyParsedLocationInput(q);
      if (wasParsed) {
        setSearchResults([]);
        setSearchStatus('idle');
        return;
      }
    }

    const requestId = ++searchRequestIdRef.current;
    setIsSearchingPlace(true);
    setSearchStatus('loading');
    const list: SearchCandidate[] = [];

    // 1. Google Maps Places (live API when enabled) + verified Cambodia directory + smart cache,
    //    already relevance-filtered by the shared search engine (exact → partial → typo-tolerant).
    const googleTask = searchGoogleMapsPlacesAdvanced({
      query: q,
      category: 'all',
      typeFilter: 'all',
      province: '',
      searchScope: 'nationwide',
      pageSize: 10,
      language,
    })
      .then((gRes) => {
        for (const p of gRes.places || gRes.results || []) {
          if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
            const prov = p.provinceKh || inferCambodiaProvinceFromAddressOrGps(p.addressKh || p.address || '', p.lat, p.lng);
            list.push({
              name: p.nameKh || p.nameEn,
              altName: p.nameEn && p.nameEn !== p.nameKh ? p.nameEn : undefined,
              address: p.addressKh || p.address || '',
              lat: Number(p.lat.toFixed(6)),
              lng: Number(p.lng.toFixed(6)),
              provinceKh: prov === 'ភ្នំពេញ' ? 'រាជធានីភ្នំពេញ' : prov,
              mapUrl: p.googleMapsUrl,
              category: [p.category, p.primaryTypeDisplayName, ...(p.types || [])].filter(Boolean).join(' '),
            });
          }
        }
      })
      .catch(() => undefined);

    // 2. ArcGIS World Geocoder for streets, sangkats, villages and landmarks (biased to the current pin)
    const arcTask = (async () => {
      try {
        const params = new URLSearchParams({
          f: 'json',
          countryCode: 'KHM',
          maxLocations: '10',
          SingleLine: q,
          location: `${lng},${lat}`,
          outFields: 'PlaceName,Place_addr,City,Region,Type',
        });
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(
          `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${params.toString()}`,
          { signal: controller.signal }
        );
        clearTimeout(tId);
        if (!res.ok) return;
        const data = await res.json();
        const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
        for (const c of candidates) {
          const cLat = Number(c?.location?.y);
          const cLng = Number(c?.location?.x);
          if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) continue;
          if (Number(c?.score || 0) < 80) continue; // weak geocoder guesses are never shown
          const name = String(c?.attributes?.PlaceName || c?.address?.split(',')[0] || '').trim();
          if (!name) continue;
          const addr = String(c?.attributes?.Place_addr || c?.address || name).trim();
          const prov = inferCambodiaProvinceFromAddressOrGps(`${addr} ${c?.attributes?.Region || ''}`, cLat, cLng);
          list.push({
            name,
            address: addr,
            lat: Number(cLat.toFixed(6)),
            lng: Number(cLng.toFixed(6)),
            provinceKh: prov === 'ភ្នំពេញ' ? 'រាជធានីភ្នំពេញ' : prov,
            category: String(c?.attributes?.Type || ''),
          });
        }
      } catch {
        // Ignore network error
      }
    })();

    await Promise.all([googleTask, arcTask]);
    if (requestId !== searchRequestIdRef.current) return; // a newer search is already running

    // 3. Relevance filter + rank (unrelated places removed), nearest to the current pin as tie-breaker,
    //    and duplicates (same name within ~80 m) merged.
    const ranked = rankBySearchRelevance(
      list,
      q,
      (c) => ({ names: [c.name, c.altName], categories: [c.category], locations: [c.address, c.provinceKh] }),
      {
        bucketSize: 100,
        tieBreak: (a, b) =>
          calculateHaversineMeters(lat, lng, a.lat, a.lng) - calculateHaversineMeters(lat, lng, b.lat, b.lng),
      }
    );
    const deduped: SearchCandidate[] = [];
    for (const c of ranked) {
      const key = normalizeSearchText(c.name);
      if (deduped.some((d) => normalizeSearchText(d.name) === key && calculateHaversineMeters(d.lat, d.lng, c.lat, c.lng) < 80)) {
        continue;
      }
      deduped.push(c);
      if (deduped.length >= 12) break;
    }

    setSearchResults(deduped);
    setSearchStatus(deduped.length > 0 ? 'done' : 'empty');
    setIsSearchingPlace(false);
  };

  // Autocomplete: search automatically while typing (debounced), ignoring pasted links / coordinates.
  useEffect(() => {
    if (!isOpen) return;
    const q = searchQuery.trim();
    if (q.length < 3 || /^https?:\/\//i.test(q) || /^-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+$/.test(q)) {
      if (!q) {
        setSearchResults([]);
        setSearchStatus('idle');
      }
      return;
    }
    const timer = setTimeout(() => {
      handleSearchPlace(undefined, { silent: true });
    }, 550);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isOpen]);

  const handleSelectCandidate = (c: SearchCandidate) => {
    setLat(c.lat);
    setLng(c.lng);
    setFormattedAddress(c.address ? `${c.name}, ${c.address}` : c.name);
    setProvinceKh(c.provinceKh);
    setManualCoordInput(`${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`);
    if (c.mapUrl) {
      setCustomMapUrl(c.mapUrl);
    } else {
      setCustomMapUrl(`https://www.google.com/maps/search/?api=1&query=${c.lat.toFixed(6)},${c.lng.toFixed(6)}`);
    }
    setPasteNotice(
      isKm
        ? `✅ បានជ្រើសរើសទីតាំង «${c.name}» (GPS: ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)})`
        : `✅ Selected location "${c.name}" (GPS: ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)})`
    );
    setSearchResults([]);
    setSearchStatus('idle');
  };

  const nudgePin = (dLat: number, dLng: number) => {
    const nextLat = Number((lat + dLat).toFixed(6));
    const nextLng = Number((lng + dLng).toFixed(6));
    setLat(nextLat);
    setLng(nextLng);
    setManualCoordInput(`${nextLat.toFixed(6)}, ${nextLng.toFixed(6)}`);
    setCustomMapUrl(`https://www.google.com/maps/search/?api=1&query=${nextLat.toFixed(6)},${nextLng.toFixed(6)}`);
    reverseGeocodeCoordinates(nextLat, nextLng);
  };

  const handleProvinceQuickJump = (provNameKh: string) => {
    setProvinceKh(provNameKh);
    const geo = resolveProvinceGeoConfig(provNameKh);
    if (geo) {
      setLat(Number(geo.lat.toFixed(6)));
      setLng(Number(geo.lng.toFixed(6)));
      setManualCoordInput(`${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}`);
      reverseGeocodeCoordinates(geo.lat, geo.lng);
    }
  };

  const handleApplyManualCoords = () => {
    applyParsedLocationInput(manualCoordInput);
  };

  const resolvedGoogleMapsLink =
    customMapUrl.trim() && isValidGoogleMapsUrl(customMapUrl.trim())
      ? customMapUrl.trim()
      : `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;

  const handleConfirm = () => {
    const provGeo = resolveProvinceGeoConfig(provinceKh) || CAMBODIA_PROVINCE_GEO_LIST[0];
    const cleanAddr =
      formattedAddress.trim() ||
      `${provGeo.kh} (GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)})`;

    onConfirmLocation({
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      formattedAddressKh: cleanAddr,
      formattedAddressEn: cleanAddr,
      provinceKh: provinceKh || 'រាជធានីភ្នំពេញ',
      provinceEn: provGeo.en,
      mapUrl: resolvedGoogleMapsLink,
      placeName: shopName.trim() || undefined,
    });
    onClose();
  };

  const googleMapEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col font-khmer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#064E3B] via-emerald-800 to-[#047857] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-moul text-xs sm:text-sm text-white">
                {isKm ? '📍 ជ្រើសរើសទីតាំងហាងលើផែនទី Google Maps' : '📍 Select Shop Location on Google Maps'}
              </h3>
              <p className="text-[11px] text-emerald-100">
                {isKm
                  ? 'ជ្រើសរើសទីតាំងពិតប្រាកដ ដើម្បីទាញយក GPS និងលីងផែនទីដោយស្វ័យប្រវត្តិ'
                  : 'Select exact location to auto-fill GPS coordinates and Google Maps link'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
          {/* Clear Khmer Step-by-Step Guide */}
          <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-[11px] text-emerald-100 space-y-1 leading-relaxed">
            <div className="font-bold text-amber-300">
              {isKm ? '💡 របៀបជ្រើសរើសទីតាំងហាងដោយងាយស្រួល៖' : '💡 How to select your shop location:'}
            </div>
            <p>
              {isKm
                ? '១. ចុច «🎯 ប្រើទីតាំងបច្ចុប្បន្ន (GPS)» ឬវាយឈ្មោះហាង/ផ្លូវ ដើម្បីស្វែងរកទីតាំងនៅលើផែនទីខាងក្រោម។'
                : '1. Tap "Use Current GPS" or search your shop/street name on the map below.'}
            </p>
            <p>
              {isKm
                ? '២. ពេលជ្រើសរើសរួច សូមចុចប៊ូតុងពណ៌បៃតងខាងក្រោម ដើម្បីត្រឡប់ទៅទម្រង់ហាង និងបំពេញ GPS + លីង Google Maps ដោយស្វ័យប្រវត្តិ។'
                : '2. Tap the green Confirm button below to return and auto-fill GPS & Maps link.'}
            </p>
          </div>

          {pasteNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{pasteNotice}</span>
            </div>
          )}

          {/* Action Row: Use Live GPS + Open External Google Maps App + Paste Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleUseMyCurrentLocation}
              disabled={isLocatingGps}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-60"
            >
              {isLocatingGps ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              <span>
                {isKm
                  ? '🎯 ប្រើទីតាំងបច្ចុប្បន្នរបស់ខ្ញុំ (GPS)'
                  : '🎯 Use My Current Location (GPS)'}
              </span>
            </button>

            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <select
                value={provinceKh}
                onChange={(e) => handleProvinceQuickJump(e.target.value)}
                className="w-full bg-transparent text-white text-xs font-bold focus:outline-none"
              >
                <option value="រាជធានីភ្នំពេញ" className="bg-slate-900 text-white">
                  រាជធានីភ្នំពេញ (Phnom Penh)
                </option>
                {CAMBODIA_PROVINCE_GEO_LIST.filter((p) => p.kh !== 'ភ្នំពេញ').map((p) => (
                  <option key={p.en} value={p.kh} className="bg-slate-900 text-white">
                    {p.kh} ({p.en})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Open Google Maps App & Auto-Paste Bar */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                shopName.trim() ? `${shopName.trim()} ${provinceKh}` : `${lat},${lng}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {isKm ? '🗺️ បើកកម្មវិធី Google Maps' : '🗺️ Open Google Maps App'}
              </span>
            </a>

            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ClipboardPaste className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {isKm ? '📋 បិទភ្ជាប់លីងពី Google Maps' : '📋 Paste Google Maps Link'}
              </span>
            </button>
          </div>

          {/* GPS Warning if permission denied */}
          {gpsWarning && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-2 text-amber-200 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{gpsWarning}</span>
            </div>
          )}

          {/* Place / Street / Link Search Box */}
          <form onSubmit={handleSearchPlace} className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (isValidGoogleMapsUrl(val.trim())) {
                      applyParsedLocationInput(val.trim());
                    }
                  }}
                  placeholder={
                    isKm
                      ? 'វាយឈ្មោះហាង ផ្លូវ សង្កាត់ ឬបិទភ្ជាប់លីង Google Maps...'
                      : 'Search shop name, street, or paste Google Maps link...'
                  }
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingPlace}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                {isSearchingPlace ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>{isKm ? 'ស្វែងរក' : 'Search'}</span>
              </button>
            </div>

            {/* Search Dropdown Results */}
            {searchStatus === 'loading' && searchResults.length === 0 && (
              <div className="mt-1.5 px-3.5 py-3 bg-slate-800 border border-slate-700 rounded-2xl flex items-center gap-2 text-xs text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>{isKm ? `កំពុងស្វែងរក «${searchQuery.trim()}»...` : `Searching "${searchQuery.trim()}"...`}</span>
              </div>
            )}
            {searchStatus === 'empty' && searchResults.length === 0 && searchQuery.trim() && (
              <div className="mt-1.5 p-3.5 bg-slate-800 border border-amber-500/30 rounded-2xl space-y-2">
                <p className="text-xs text-amber-200">
                  {isKm
                    ? `រកមិនឃើញទីតាំងដែលត្រូវនឹង «${searchQuery.trim()}» ទេ។ សូមពិនិត្យអក្ខរាវិរុទ្ធ ឬបើក Google Maps ដើម្បីចម្លងលីងទីតាំងហាង រួចបិទភ្ជាប់នៅទីនេះ។`
                    : `No verified place matches "${searchQuery.trim()}". Check the spelling, or open Google Maps, copy the shop's link and paste it here.`}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    openExternalUrlNativeSafe(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${searchQuery.trim()} Cambodia`)}`
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {isKm ? `ស្វែងរក «${searchQuery.trim()}» លើ Google Maps` : `Search "${searchQuery.trim()}" on Google Maps`}
                </button>
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="mt-1.5 bg-slate-800 border border-emerald-500/40 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-700/70">
                {searchResults.map((c, idx) => (
                  <button
                    key={`${c.lat}-${c.lng}-${idx}`}
                    type="button"
                    onClick={() => handleSelectCandidate(c)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-950/60 transition flex items-start gap-2.5 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        {c.name}
                        {c.altName && c.altName !== c.name ? ` (${c.altName})` : ''}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{c.address}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                      {isKm ? 'ជ្រើសរើស' : 'Select'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Interactive Google Maps Preview + Fine Pin Adjustment Controls */}
          <div className="rounded-2xl overflow-hidden border border-emerald-500/30 bg-slate-950 relative">
            <div className="h-52 sm:h-60 w-full relative bg-slate-900">
              {!mapLoadError ? (
                <iframe
                  key={`${lat.toFixed(5)}-${lng.toFixed(5)}`}
                  title="Google Maps Shop Pin"
                  src={googleMapEmbedUrl}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  onError={() => setMapLoadError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <MapPin className="w-8 h-8 text-amber-400" />
                  <p className="text-xs text-slate-300">
                    {isKm
                      ? 'ផែនទីកំពុងប្រើប្រាស់ទម្រង់កូអរដោនេ GPS ផ្ទាល់'
                      : 'Using direct GPS coordinate pin mode'}
                  </p>
                </div>
              )}

              {/* Center Pin Badge Overlay */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                <span className="px-2.5 py-1 rounded-full bg-slate-900/90 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 shadow-md">
                  📍 GPS: {lat.toFixed(6)}, {lng.toFixed(6)}
                </span>
              </div>
            </div>

            {/* Pin Fine-Tuning Bar (Move Pin North / South / East / West) */}
            <div className="p-2.5 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[11px] text-slate-300 font-bold">
                <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                <span>{isKm ? 'រំកិលម្ជុលលើផែនទី៖' : 'Adjust Pin:'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => nudgePin(0.00045, 0)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold border border-slate-700 cursor-pointer"
                >
                  ⬆️ {isKm ? 'ជើង' : 'N'}
                </button>
                <button
                  type="button"
                  onClick={() => nudgePin(-0.00045, 0)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold border border-slate-700 cursor-pointer"
                >
                  ⬇️ {isKm ? 'ត្បូង' : 'S'}
                </button>
                <button
                  type="button"
                  onClick={() => nudgePin(0, -0.00045)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold border border-slate-700 cursor-pointer"
                >
                  ⬅️ {isKm ? 'លិច' : 'W'}
                </button>
                <button
                  type="button"
                  onClick={() => nudgePin(0, 0.00045)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold border border-slate-700 cursor-pointer"
                >
                  ➡️ {isKm ? 'កើត' : 'E'}
                </button>
              </div>
            </div>
          </div>

          {/* Auto-Retrieved Location Details Summary */}
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2.5">
            <div className="text-[11px] font-bold text-amber-300">
              {isKm
                ? '📋 ទិន្នន័យទីតាំងដែលនឹងត្រូវបំពេញចូលទម្រង់ហាងដោយស្វ័យប្រវត្តិ៖'
                : '📋 Location Details to Auto-Fill in Shop Form:'}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{isKm ? 'អាសយដ្ឋានហាង៖' : 'Shop Address:'}</span>
                </label>
                {isReverseGeocoding && (
                  <span className="text-[10px] text-amber-300 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {isKm ? 'កំពុងទាញអាសយដ្ឋាន...' : 'Fetching address...'}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={formattedAddress}
                onChange={(e) => setFormattedAddress(e.target.value)}
                placeholder={
                  isKm
                    ? 'ឧ. ផ្លូវ ២៧១ សង្កាត់ទួលទំពូង ខណ្ឌចំការមន ភ្នំពេញ'
                    : 'e.g. Street 271, Tuol Tompoung, Phnom Penh'
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">
                  {isKm ? 'ទីតាំង GPS (Latitude, Longitude)៖' : 'GPS Coordinates:'}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={manualCoordInput}
                    onChange={(e) => setManualCoordInput(e.target.value)}
                    onBlur={handleApplyManualCoords}
                    placeholder="11.556400, 104.928200"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-[11px] font-mono text-amber-300 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">
                  {isKm ? 'តំណភ្ជាប់ Google Maps៖' : 'Google Maps Link:'}
                </label>
                <input
                  type="text"
                  readOnly
                  value={resolvedGoogleMapsLink}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-[11px] font-mono text-emerald-300 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Confirm & Return to App Form */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            {isKm ? 'បោះបង់' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {isKm
                ? '✅ បញ្ជាក់ទីតាំង និងត្រឡប់ទៅបំពេញទម្រង់ហាង'
                : '✅ Confirm Location & Return to Shop Form'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

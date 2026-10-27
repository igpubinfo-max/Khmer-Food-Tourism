import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import {
  CAMBODIA_PROVINCE_GEO_LIST,
  inferCambodiaProvinceFromAddressOrGps,
  resolveProvinceGeoConfig,
} from '../services/googlePlacesService';
import { getCurrentDeviceLocation } from '../services/restaurantCheckInService';

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
  address: string;
  lat: number;
  lng: number;
  provinceKh: string;
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
  const [formattedAddress, setFormattedAddress] = useState<string>(initialAddress || '');
  const [provinceKh, setProvinceKh] = useState<string>(initialProvinceKh || 'រាជធានីភ្នំពេញ');
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [gpsWarning, setGpsWarning] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingPlace, setIsSearchingPlace] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchCandidate[]>([]);
  const [manualCoordInput, setManualCoordInput] = useState<string>('');
  const [mapLoadError, setMapLoadError] = useState<boolean>(false);

  const reverseGeocodeCoordinates = useCallback(
    async (targetLat: number, targetLng: number) => {
      setIsReverseGeocoding(true);
      const inferredProv = inferCambodiaProvinceFromAddressOrGps('', targetLat, targetLng);
      const normalizedProvKh =
        inferredProv === 'ភ្នំពេញ' ? 'រាជធានីភ្នំពេញ' : inferredProv;
      setProvinceKh(normalizedProvKh);

      try {
        // 1. Try ArcGIS Reverse Geocode first (fast ~250ms, reliable in Cambodia)
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
        // 2. Fallback to OpenStreetMap Nominatim reverse geocoding
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
            ? 'មិនអាចទាញយក GPS ផ្ទាល់ពីឧបករណ៍បានទេ (ឬមិនទាន់អនុញ្ញាត Location)។ អ្នកអាចស្វែងរក ឬកំណត់ម្ជុល (Pin) ដោយដៃខាងក្រោម!'
            : 'GPS permission denied or unavailable. You can search or adjust the pin manually below!'
        );
      }
      await reverseGeocodeCoordinates(gps.latitude, gps.longitude);
    } catch {
      setGpsWarning(
        isKm
          ? 'ប្រព័ន្ធ GPS មិនដំណើរការទេ។ សូមជ្រើសរើសទីតាំងហាងដោយដៃខាងក្រោម។'
          : 'GPS unavailable. Please select your shop location manually below.'
      );
    } finally {
      setIsLocatingGps(false);
    }
  }, [isKm, reverseGeocodeCoordinates]);

  // Initialize when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setGpsWarning('');
    setSearchResults([]);
    setMapLoadError(false);

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
      // Automatically detect current GPS location when opening Check-In for a new shop
      handleUseMyCurrentLocation();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearchPlace = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    // Check if user pasted raw lat,lng coordinates (e.g. "11.5564, 104.9282")
    const coordMatch = q.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
    if (coordMatch) {
      const parsedLat = parseFloat(coordMatch[1]);
      const parsedLng = parseFloat(coordMatch[2]);
      if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
        setLat(Number(parsedLat.toFixed(6)));
        setLng(Number(parsedLng.toFixed(6)));
        setManualCoordInput(`${parsedLat.toFixed(6)}, ${parsedLng.toFixed(6)}`);
        setSearchResults([]);
        await reverseGeocodeCoordinates(parsedLat, parsedLng);
        return;
      }
    }

    setIsSearchingPlace(true);
    try {
      const params = new URLSearchParams({
        f: 'json',
        countryCode: 'KHM',
        maxLocations: '10',
        SingleLine: q,
        location: `${lng},${lat}`,
        outFields: 'PlaceName,Place_addr,City,Region',
      });
      const res = await fetch(
        `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${params.toString()}`
      );
      const list: SearchCandidate[] = [];
      if (res.ok) {
        const data = await res.json();
        const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
        for (const c of candidates) {
          const cLat = Number(c?.location?.y);
          const cLng = Number(c?.location?.x);
          if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) continue;
          const name = String(c?.attributes?.PlaceName || c?.address?.split(',')[0] || q).trim();
          const addr = String(c?.attributes?.Place_addr || c?.address || name).trim();
          const prov = inferCambodiaProvinceFromAddressOrGps(addr, cLat, cLng);
          list.push({
            name,
            address: addr,
            lat: Number(cLat.toFixed(6)),
            lng: Number(cLng.toFixed(6)),
            provinceKh: prov === 'ភ្នំពេញ' ? 'រាជធានីភ្នំពេញ' : prov,
          });
        }
      }
      setSearchResults(list);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearchingPlace(false);
    }
  };

  const handleSelectCandidate = (c: SearchCandidate) => {
    setLat(c.lat);
    setLng(c.lng);
    setFormattedAddress(c.address ? `${c.name}, ${c.address}` : c.name);
    setProvinceKh(c.provinceKh);
    setManualCoordInput(`${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`);
    setSearchResults([]);
  };

  const nudgePin = (dLat: number, dLng: number) => {
    const nextLat = Number((lat + dLat).toFixed(6));
    const nextLng = Number((lng + dLng).toFixed(6));
    setLat(nextLat);
    setLng(nextLng);
    setManualCoordInput(`${nextLat.toFixed(6)}, ${nextLng.toFixed(6)}`);
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
    const m = manualCoordInput.trim().match(/(-?\d+\.\d+)\s*[,/\s]\s*(-?\d+\.\d+)/);
    if (m) {
      const pLat = parseFloat(m[1]);
      const pLng = parseFloat(m[2]);
      if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
        setLat(Number(pLat.toFixed(6)));
        setLng(Number(pLng.toFixed(6)));
        reverseGeocodeCoordinates(pLat, pLng);
      }
    }
  };

  const handleConfirm = () => {
    const provGeo = resolveProvinceGeoConfig(provinceKh) || CAMBODIA_PROVINCE_GEO_LIST[0];
    const cleanAddr =
      formattedAddress.trim() ||
      `${provGeo.kh} (GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)})`;
    const queryLabel = shopName.trim()
      ? `${shopName.trim()} ${lat.toFixed(6)},${lng.toFixed(6)}`
      : `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryLabel)}`;

    onConfirmLocation({
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      formattedAddressKh: cleanAddr,
      formattedAddressEn: cleanAddr,
      provinceKh: provinceKh || 'រាជធានីភ្នំពេញ',
      provinceEn: provGeo.en,
      mapUrl,
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
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-moul text-sm sm:text-base text-amber-300">
                📍 {isKm ? 'កំណត់ទីតាំងហាង (Check In)' : 'Set Shop Location (Check In)'}
              </h3>
              <p className="text-[11px] text-emerald-100">
                {isKm
                  ? 'ជ្រើសរើសទីតាំងពិតប្រាកដរបស់ហាងនៅលើផែនទី Google Maps'
                  : 'Pinpoint your exact shop location on Google Maps'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* GPS Current Location Button + Province Quick Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleUseMyCurrentLocation}
              disabled={isLocatingGps}
              className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-60"
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

          {/* GPS Warning if permission denied */}
          {gpsWarning && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-2 text-amber-200 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{gpsWarning}</span>
            </div>
          )}

          {/* Place / Street Search Box to Move Pin Anywhere */}
          <form onSubmit={handleSearchPlace} className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isKm
                      ? 'ស្វែងរកឈ្មោះផ្លូវ ភូមិ សង្កាត់ ឬឈ្មោះហាង...'
                      : 'Search street, sangkat, landmark, or paste lat,lng...'
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
                <span>{isKm ? 'ស្វែងរក' : 'Find'}</span>
              </button>
            </div>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="mt-1.5 bg-slate-800 border border-emerald-500/40 rounded-2xl shadow-xl max-h-44 overflow-y-auto divide-y divide-slate-700/70">
                {searchResults.map((c, idx) => (
                  <button
                    key={`${c.lat}-${c.lng}-${idx}`}
                    type="button"
                    onClick={() => handleSelectCandidate(c)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-950/60 transition flex items-start gap-2.5 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{c.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{c.address}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                      {c.provinceKh}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Interactive Google Maps Preview + Fine Pin Adjustment Controls */}
          <div className="rounded-2xl overflow-hidden border border-emerald-500/30 bg-slate-950 relative">
            <div className="h-56 sm:h-64 w-full relative bg-slate-900">
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
                  📍 {lat.toFixed(6)}, {lng.toFixed(6)}
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-amber-400/40 text-[11px] font-bold text-amber-300 flex items-center gap-1 shadow-md"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Pin Fine-Tuning Bar (Move Pin North / South / East / West or Enter Exact GPS) */}
            <div className="p-2.5 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[11px] text-slate-300 font-bold">
                <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                <span>{isKm ? 'រំកិលម្ជុល (Pin)៖' : 'Adjust Pin:'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => nudgePin(0.00045, 0)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold border border-slate-700 cursor-pointer"
                  title="Move North (~50m)"
                >
                  ⬆️ {isKm ? 'ជើង' : 'N'}
                </button>
                <button
                  type="button"
                  onClick={() => nudgePin(-0.00045, 0)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold border border-slate-700 cursor-pointer"
                  title="Move South (~50m)"
                >
                  ⬇️ {isKm ? 'ត្បូង' : 'S'}
                </button>
                <button
                  type="button"
                  onClick={() => nudgePin(0, -0.00045)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold border border-slate-700 cursor-pointer"
                  title="Move West (~50m)"
                >
                  ⬅️ {isKm ? 'លិច' : 'W'}
                </button>
                <button
                  type="button"
                  onClick={() => nudgePin(0, 0.00045)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold border border-slate-700 cursor-pointer"
                  title="Move East (~50m)"
                >
                  ➡️ {isKm ? 'កើត' : 'E'}
                </button>
              </div>
            </div>
          </div>

          {/* Selected Address & Manual Coordinate Editor */}
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {isKm
                      ? 'អាសយដ្ឋានហាងដែលបានជ្រើសរើស (អាចកែសម្រួលបាន)៖'
                      : 'Selected Shop Address (Editable):'}
                  </span>
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

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-slate-400 mb-0.5">
                  {isKm ? 'កូអរដោនេ GPS (Latitude, Longitude)៖' : 'GPS Coordinates (Lat, Lng):'}
                </label>
                <input
                  type="text"
                  value={manualCoordInput}
                  onChange={(e) => setManualCoordInput(e.target.value)}
                  onBlur={handleApplyManualCoords}
                  placeholder="11.556400, 104.928200"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-[11px] font-mono text-amber-300 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyManualCoords}
                className="mt-4 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold transition cursor-pointer"
              >
                {isKm ? 'កំណត់ GPS' : 'Apply GPS'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Confirm / Cancel */}
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
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isKm
                ? '✅ បញ្ជាក់ទីតាំងហាងនេះ (Confirm Check In)'
                : '✅ Confirm Shop Location (Check In)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

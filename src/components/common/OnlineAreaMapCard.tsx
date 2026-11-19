import React, { useEffect, useRef, useState } from 'react';
import { Navigation, Maximize2, Minimize2, Compass, WifiOff, Map as MapIcon } from 'lucide-react';
import { Language } from '../../types';
import { openExternalUrlNativeSafe } from '../../types';
import { tr } from '../../utils/i18n';
import { haversineKm } from '../../utils/offlineCambodiaRoadEngine';

interface OnlineAreaMapCardProps {
  language: Language;
  nameKh: string;
  nameEn: string;
  addressKh?: string;
  provinceKh?: string;
  provinceEn?: string;
  lat?: number;
  lng?: number;
  /** Fallback only: opens the separate Offline Map when the device has no internet. */
  onOpenFullMap: (mode: 'maps' | 'directions') => void;
}

/**
 * "The Area" card — ONLINE map (Google Maps, live tiles + street-level detail, pinch-zoom / pan).
 * The Offline Cambodia Map is a separate feature and is only offered here as a no-internet fallback.
 */
export const OnlineAreaMapCard: React.FC<OnlineAreaMapCardProps> = ({
  language,
  nameKh,
  nameEn,
  addressKh,
  provinceKh,
  provinceEn,
  lat,
  lng,
  onOpenFullMap,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  );
  const [expanded, setExpanded] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [isVisibleInViewport, setIsVisibleInViewport] = useState(false);
  const cardContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isVisibleInViewport) return;
    const el = cardContainerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsVisibleInViewport(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setIsVisibleInViewport(true);
          obs.disconnect();
        }
      },
      { rootMargin: '280px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isVisibleInViewport]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Lock page scroll while the map is expanded full-screen
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const hasCoords =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= 9.5 &&
    lat <= 15.2 &&
    lng >= 102.0 &&
    lng <= 108.0;
  const validLat = hasCoords ? (lat as number) : 11.5564;
  const validLng = hasCoords ? (lng as number) : 104.9282;

  const isSiemReap =
    (provinceEn || '').toLowerCase().includes('siem reap') || (provinceKh || '').includes('សៀមរាប');
  const airportName = isSiemReap
    ? tr(language, 'អាកាសយានដ្ឋានអន្តរជាតិសៀមរាបអង្គរ (SAI)', 'Siem Reap Angkor International Airport', '暹粒吴哥国际机场')
    : tr(language, 'អាកាសយានដ្ឋានអន្តរជាតិតេជោ / ភ្នំពេញ', 'Techo International Airport', '德崇/金边国际机场');
  const airportLat = isSiemReap ? 13.3692 : 11.4114;
  const airportLng = isSiemReap ? 104.2225 : 104.9181;
  const airportDistKm = Math.max(1, Math.round(haversineKm(validLat, validLng, airportLat, airportLng) * 1.18));

  const provinceLabel = language === 'en' ? provinceEn || 'Cambodia' : provinceKh || 'កម្ពុជា';
  const fullAddress =
    addressKh && addressKh.trim() ? `${addressKh}, ${provinceLabel}` : `${nameKh}, ${provinceLabel}`;

  const placeName = language === 'en' ? nameEn || nameKh : nameKh || nameEn;
  const query = hasCoords
    ? `${validLat},${validLng}(${placeName})`
    : `${placeName} ${provinceEn || provinceKh || 'Cambodia'}`;
  const hl = language === 'en' ? 'en' : language === 'zh' ? 'zh-CN' : 'km';
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=17&hl=${hl}&output=embed`;
  const placeUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    hasCoords ? `${validLat},${validLng}` : `${placeName} ${provinceEn || provinceKh || 'Cambodia'}`
  )}`;
  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${validLat},${validLng}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${placeName} ${provinceEn || provinceKh || 'Cambodia'}`
      )}&travelmode=driving`;

  const handleDirections = () => {
    if (isOnline) openExternalUrlNativeSafe(directionsUrl);
    else onOpenFullMap('directions');
  };

  const handleAddress = () => {
    if (isOnline) openExternalUrlNativeSafe(placeUrl);
    else onOpenFullMap('maps');
  };

  const mapBoxClass = expanded
    ? 'fixed inset-0 z-[90] bg-[#12161F] flex flex-col'
    : 'relative w-full h-52 sm:h-60 overflow-hidden border-t border-slate-800';

  return (
    <div ref={cardContainerRef} className="rounded-2xl overflow-hidden bg-[#12161F] border border-slate-700/80 shadow-lg text-white font-khmer">
      <div className="p-4 space-y-3">
        <h3 className="text-base sm:text-lg font-extrabold text-white">
          {tr(language, 'ផែនទីតំបន់ជុំវិញទីតាំងនេះ (The Area)', 'The area', '周边街区地图 (The Area)')}
        </h3>

        <div className="space-y-0.5">
          <div className="text-xs font-bold text-slate-300">{tr(language, 'អាសយដ្ឋាន (Address)', 'Address', '地址')}</div>
          <button
            type="button"
            onClick={handleAddress}
            className="text-left text-xs sm:text-sm text-slate-100 underline decoration-slate-400 underline-offset-4 hover:text-amber-300 transition cursor-pointer"
          >
            {fullAddress}
          </button>
        </div>

        <div className="space-y-0.5">
          <div className="text-xs font-bold text-slate-300">
            {tr(language, 'ការធ្វើដំណើរ (How to get there)', 'How to get there', '如何前往')}
          </div>
          <div className="text-xs sm:text-sm text-slate-200">
            {airportName} • {airportDistKm} km
          </div>
        </div>
      </div>

      <div className={mapBoxClass}>
        {expanded && (
          <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800">
            <span className="text-sm font-extrabold text-white truncate">{placeName}</span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/15 cursor-pointer"
              title="Close"
            >
              <Minimize2 className="w-4 h-4 text-amber-300" />
            </button>
          </div>
        )}

        <div className={expanded ? 'relative flex-1 min-h-0' : 'absolute inset-0'}>
          {isOnline ? (
            <>
              {(isVisibleInViewport || interactive || expanded) && (
              <iframe
                key={embedUrl}
                title={`Online map — ${placeName}`}
                src={embedUrl}
                className="w-full h-full border-0 block bg-[#242B35]"
                style={{ pointerEvents: interactive || expanded ? 'auto' : 'none' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              )}
              {!interactive && !expanded && (
                <button
                  type="button"
                  aria-label="Activate map"
                  onClick={() => setInteractive(true)}
                  className="absolute inset-0 w-full h-full bg-transparent cursor-pointer"
                >
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-9 px-2.5 py-1 rounded-full bg-slate-950/80 text-[10px] font-bold text-slate-100 border border-white/10">
                    {tr(language, 'ចុចដើម្បីពង្រីក / រុញផែនទី', 'Tap to zoom & pan the map', '点击后可缩放/拖动地图')}
                  </span>
                </button>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-4 text-center bg-[#1B212B]">
              <WifiOff className="w-6 h-6 text-amber-300" />
              <div className="text-xs font-bold text-slate-100">
                {tr(
                  language,
                  'គ្មានអ៊ីនធឺណិត — ផែនទី Online មិនអាចបង្ហាញបានទេ',
                  'No internet — the online map is unavailable',
                  '无网络 — 无法显示在线地图'
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenFullMap('maps')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow flex items-center gap-1.5 cursor-pointer"
              >
                <MapIcon className="w-3.5 h-3.5" />
                {tr(language, 'បើកផែនទី Offline', 'Open Offline Map', '打开离线地图')}
              </button>
            </div>
          )}

          <div className="pointer-events-none absolute left-2.5 bottom-2 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-bold text-slate-200 flex items-center gap-1 border border-white/10">
            <Compass className="w-3 h-3 text-amber-400" />
            <span>{isOnline ? 'Online Map • Google Maps' : 'Offline'}</span>
          </div>

          {isOnline && (
            <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDirections}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 fill-slate-950" />
                <span>{tr(language, 'នាំផ្លូវទៅទីតាំងនេះ', 'Get Directions', '路线导航')}</span>
              </button>
              {!expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-white/15 shadow-lg cursor-pointer"
                  title="Expand Map"
                >
                  <Maximize2 className="w-4 h-4 text-amber-300" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

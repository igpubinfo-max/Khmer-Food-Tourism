import React, { useEffect, useRef, useState } from 'react';
import { Navigation, Maximize2, Compass } from 'lucide-react';
import { Language } from '../../types';
import { tr } from '../../utils/i18n';
import {
  CAMBODIA_ROAD_SEGMENTS,
  CAMBODIA_WATER_FEATURES,
  CAMBODIA_PARKS,
  generateLocalStreetSegmentsAroundPin,
  getCachedTileBlobUrl,
  saveTileBlob,
  fetchRealRoadTileBlob,
  haversineKm,
} from '../../utils/offlineCambodiaRoadEngine';

interface TripAdvisorAreaMapCardProps {
  language: Language;
  nameKh: string;
  nameEn: string;
  addressKh?: string;
  provinceKh?: string;
  provinceEn?: string;
  lat?: number;
  lng?: number;
  onOpenFullMap: (mode: 'maps' | 'directions') => void;
}

const latLngToWorldPx = (lat: number, lng: number, zoom: number) => {
  const scale = 256 * Math.pow(2, zoom);
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  const x = ((lng + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
};

export const TripAdvisorAreaMapCard: React.FC<TripAdvisorAreaMapCardProps> = ({
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tileCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [tileTick, setTileTick] = useState(0);

  const validLat = typeof lat === 'number' && lat >= 9.5 && lat <= 15.2 ? lat : 11.5564;
  const validLng = typeof lng === 'number' && lng >= 102.0 && lng <= 108.0 ? lng : 104.9282;

  const isSiemReap =
    (provinceEn || '').toLowerCase().includes('siem reap') ||
    (provinceKh || '').includes('សៀមរាប');
  const airportName = isSiemReap
    ? tr(
        language,
        'អាកាសយានដ្ឋានអន្តរជាតិសៀមរាបអង្គរ (SAI)',
        'Siem Reap Angkor International Airport',
        '暹粒吴哥国际机场'
      )
    : tr(
        language,
        'អាកាសយានដ្ឋានអន្តរជាតិតេជោ / ភ្នំពេញ',
        'Techo International Airport',
        '德崇/金边国际机场'
      );
  const airportLat = isSiemReap ? 13.3692 : 11.4114;
  const airportLng = isSiemReap ? 104.2225 : 104.9181;
  const airportDistKm = Math.max(
    1,
    Math.round(haversineKm(validLat, validLng, airportLat, airportLng) * 1.18)
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 420;
    const h = canvas.clientHeight || 220;
    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. TripAdvisor Dark Navy-Slate Base (#242B35)
    ctx.fillStyle = '#242B35';
    ctx.fillRect(0, 0, w, h);

    const zoom = 15;
    const centerW = latLngToWorldPx(validLat, validLng, zoom);
    const toScreen = (pLat: number, pLng: number) => {
      const pt = latLngToWorldPx(pLat, pLng, zoom);
      return {
        x: w / 2 + (pt.x - centerW.x),
        y: h / 2 + (pt.y - centerW.y),
      };
    };

    // 2. Render Real Dark Navy Slippy Map Tiles (CartoDB Dark Matter / OpenStreetMap)
    const minTileX = Math.floor((centerW.x - w / 2) / 256);
    const maxTileX = Math.floor((centerW.x + w / 2) / 256);
    const minTileY = Math.floor((centerW.y - h / 2) / 256);
    const maxTileY = Math.floor((centerW.y + h / 2) / 256);

    let anyRealTileDrawn = false;
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const key = `dark/${zoom}/${tx}/${ty}`;
        const screenX = Math.floor(w / 2 + (tx * 256 - centerW.x));
        const screenY = Math.floor(h / 2 + (ty * 256 - centerW.y));

        const cachedImg = tileCacheRef.current.get(key);
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
          ctx.save();
          ctx.filter = 'invert(90%) hue-rotate(185deg) saturate(82%) brightness(92%) contrast(96%)';
          ctx.drawImage(cachedImg, screenX, screenY, 256, 256);
          ctx.restore();
          anyRealTileDrawn = true;
        } else if (!cachedImg) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          tileCacheRef.current.set(key, img);

          getCachedTileBlobUrl(zoom, tx, ty, 'day').then((blobUrl) => {
            if (blobUrl) {
              img.onload = () => setTileTick((t) => t + 1);
              img.src = blobUrl;
            } else if (typeof navigator !== 'undefined' && navigator.onLine) {
              fetchRealRoadTileBlob(zoom, tx, ty)
                .then((blob) => {
                  if (blob) {
                    saveTileBlob(zoom, tx, ty, blob, 'day');
                    img.onload = () => setTileTick((t) => t + 1);
                    img.src = URL.createObjectURL(blob);
                  }
                })
                .catch(() => {});
            }
          });
        }
      }
    }

    // 3. When offline and real raster tile is not yet cached, render accurate vector road geometry
    if (!anyRealTileDrawn) {
      for (const park of CAMBODIA_PARKS) {
        const p = toScreen(park.lat, park.lng);
        const pEdge = toScreen(park.lat + park.radiusDegLat, park.lng + park.radiusDegLng);
        const rx = Math.max(12, Math.abs(pEdge.x - p.x));
        const ry = Math.max(10, Math.abs(pEdge.y - p.y));
        if (p.x + rx < 0 || p.x - rx > w || p.y + ry < 0 || p.y - ry > h) continue;
        ctx.fillStyle = 'rgba(20, 83, 45, 0.35)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const river of CAMBODIA_WATER_FEATURES) {
        ctx.strokeStyle = '#16202A';
        ctx.lineWidth = 22;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        river.points.forEach(([rLat, rLng], idx) => {
          const pt = toScreen(rLat, rLng);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }

      const localStreets = generateLocalStreetSegmentsAroundPin(
        validLat,
        validLng,
        addressKh,
        nameKh
      );
      const allRoads = [...CAMBODIA_ROAD_SEGMENTS, ...localStreets];

      for (const pass of ['casing', 'fill'] as const) {
        for (const seg of allRoads) {
          const width =
            seg.tier === 'expressway' || seg.tier === 'national'
              ? 10
              : seg.tier === 'boulevard'
              ? 8
              : 5.5;
          ctx.lineWidth = pass === 'casing' ? width + 2.5 : width;
          ctx.strokeStyle =
            pass === 'casing'
              ? '#1B222C'
              : seg.tier === 'expressway' || seg.tier === 'national'
              ? '#64748B'
              : seg.tier === 'boulevard'
              ? '#526075'
              : '#424E60';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          seg.points.forEach(([rLat, rLng], idx) => {
            const pt = toScreen(rLat, rLng);
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
        }
      }

      // Draw rotated street names along real road segments
      const placedLabels: Array<[number, number]> = [];
      for (const seg of allRoads) {
        for (let i = 0; i < seg.points.length - 1; i++) {
          const p1 = toScreen(seg.points[i][0], seg.points[i][1]);
          const p2 = toScreen(seg.points[i + 1][0], seg.points[i + 1][1]);
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          if (midX < 40 || midX > w - 40 || midY < 24 || midY > h - 24) continue;
          const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          if (segLen < 55) continue;
          if (placedLabels.some(([lx, ly]) => Math.hypot(lx - midX, ly - midY) < 75)) continue;
          placedLabels.push([midX, midY]);

          let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          if (angle > Math.PI / 2) angle -= Math.PI;
          if (angle < -Math.PI / 2) angle += Math.PI;

          const label = (seg.code || seg.nameEn).toUpperCase().slice(0, 22);
          ctx.save();
          ctx.translate(midX, midY);
          ctx.rotate(angle);
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#1E2530';
          ctx.strokeText(label, 0, 0);
          ctx.fillStyle = '#CBD5E1';
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }
      }
    }

    // 4. Center TripAdvisor Signature Yellow Star Teardrop Pin (★)
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 16, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#EAB308';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 15, Math.PI * 0.82, Math.PI * 0.18, false);
    ctx.lineTo(cx, cy + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', cx, cy - 4);

    ctx.restore();
  }, [validLat, validLng, addressKh, nameKh, provinceEn, tileTick]);

  const fullAddress =
    addressKh && addressKh.trim()
      ? `${addressKh}, ${
          language === 'en' ? provinceEn || 'Cambodia' : provinceKh || 'កម្ពុជា'
        }`
      : `${nameKh}, ${
          language === 'en' ? provinceEn || 'Cambodia' : provinceKh || 'កម្ពុជា'
        }`;

  return (
    <div className="rounded-2xl overflow-hidden bg-[#12161F] border border-slate-700/80 shadow-lg text-white font-khmer">
      <div className="p-4 space-y-3">
        <h3 className="text-base sm:text-lg font-extrabold text-white">
          {tr(
            language,
            'ផែនទីតំបន់ជុំវិញទីតាំងនេះ (The Area)',
            'The area',
            '周边街区地图 (The Area)'
          )}
        </h3>

        <div className="space-y-0.5">
          <div className="text-xs font-bold text-slate-300">
            {tr(language, 'អាសយដ្ឋាន (Address)', 'Address', '地址')}
          </div>
          <button
            type="button"
            onClick={() => onOpenFullMap('maps')}
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

      <div
        onClick={() => onOpenFullMap('directions')}
        className="relative w-full h-52 sm:h-60 cursor-pointer group overflow-hidden border-t border-slate-800"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute left-2.5 bottom-2 px-2 py-0.5 rounded bg-slate-950/75 text-[10px] font-bold text-slate-200 flex items-center gap-1 border border-white/10">
          <Compass className="w-3 h-3 text-amber-400" />
          <span>Street Map</span>
        </div>

        <div className="absolute right-2.5 bottom-2 px-2 py-0.5 rounded bg-white/85 text-slate-900 text-[9px] font-semibold">
          © OpenStreetMap • Offline Ready
        </div>

        <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenFullMap('directions');
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 fill-slate-950" />
            <span>
              {tr(language, 'នាំផ្លូវទៅទីតាំងនេះ', 'Get Directions', '路线导航')}
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenFullMap('maps');
            }}
            className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-white/15 shadow-lg cursor-pointer"
            title="Expand Map"
          >
            <Maximize2 className="w-4 h-4 text-amber-300" />
          </button>
        </div>
      </div>
    </div>
  );
};
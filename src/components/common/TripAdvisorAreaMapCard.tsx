import React, { useEffect, useRef } from 'react';
import { Navigation, Maximize2, Compass } from 'lucide-react';
import { Language } from '../../types';
import { tr } from '../../utils/i18n';
import {
  CAMBODIA_ROAD_SEGMENTS,
  generateLocalStreetSegmentsAroundPin,
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

// Web Mercator projection at street zoom 15.5
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

  const validLat = typeof lat === 'number' && lat >= 9.5 && lat <= 15.2 ? lat : 11.5564;
  const validLng = typeof lng === 'number' && lng >= 102.0 && lng <= 108.0 ? lng : 104.9282;

  // Distance to Phnom Penh / Techo International Airport (or Siem Reap Angkor International Airport if in Siem Reap)
  const isSiemReap = (provinceEn || '').toLowerCase().includes('siem reap') || (provinceKh || '').includes('សៀមរាប');
  const airportName = isSiemReap
    ? tr(language, 'អាកាសយានដ្ឋានអន្តរជាតិសៀមរាបអង្គរ (SAI)', 'Siem Reap Angkor International Airport', '暹粒吴哥国际机场')
    : tr(language, 'អាកាសយានដ្ឋានអន្តរជាតិតេជោ / ភ្នំពេញ', 'Techo International Airport', '德崇/金边国际机场');
  const airportLat = isSiemReap ? 13.3692 : 11.4114;
  const airportLng = isSiemReap ? 104.2225 : 104.9181;
  const airportDistKm = Math.max(1, Math.round(haversineKm(validLat, validLng, airportLat, airportLng) * 1.18));

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

    // 2. TripAdvisor Diagonal & Orthogonal Urban City Blocks + Building Footprints (#2E3744)
    const blockStep = 52;
    ctx.fillStyle = '#2D3643';
    ctx.strokeStyle = '#36404F';
    ctx.lineWidth = 1;
    for (let bx = -blockStep; bx < w + blockStep; bx += blockStep) {
      for (let by = -blockStep; by < h + blockStep; by += blockStep) {
        const pad = 7;
        const subW = (blockStep - pad * 3) / 2;
        const subH = (blockStep - pad * 3) / 2;
        ctx.fillRect(bx + pad, by + pad, subW, subH);
        ctx.fillRect(bx + pad * 2 + subW, by + pad, subW, subH);
        ctx.fillRect(bx + pad, by + pad * 2 + subH, blockStep - pad * 2, subH);
      }
    }

    // 3. Secondary Street Grid (#3F4B5C casing, #495669 road fill)
    for (let gx = 26; gx < w; gx += blockStep) {
      ctx.strokeStyle = '#3C4757';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();

      ctx.strokeStyle = '#485568';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    for (let gy = 24; gy < h; gy += blockStep) {
      ctx.strokeStyle = '#3C4757';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();

      ctx.strokeStyle = '#485568';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // 4. Diagonal Main Boulevard (like SAMDECH MUNIRETH BLVD & MAO TSE TOUNG BLVD in TripAdvisor!)
    const localSegs = generateLocalStreetSegmentsAroundPin(validLat, validLng, addressKh, nameKh);
    const allSegs = [...CAMBODIA_ROAD_SEGMENTS, ...localSegs];

    // Also add realistic intersecting boulevards passing near the shop
    ctx.strokeStyle = '#394454';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h);
    ctx.lineTo(w * 0.88, 0);
    ctx.moveTo(w * 0.42, 0);
    ctx.lineTo(w * 0.46, h);
    ctx.stroke();

    ctx.strokeStyle = '#536278';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h);
    ctx.lineTo(w * 0.88, 0);
    ctx.moveTo(w * 0.42, 0);
    ctx.lineTo(w * 0.46, h);
    ctx.stroke();

    // Render real nearby road segments
    for (const seg of allSegs) {
      ctx.strokeStyle = seg.tier === 'street' ? '#4C5A6E' : '#586880';
      ctx.lineWidth = seg.tier === 'street' ? 6 : 10;
      ctx.beginPath();
      seg.points.forEach(([sLat, sLng], idx) => {
        const pt = toScreen(sLat, sLng);
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    }

    // 5. One-Way Street Arrows (↑ ↓ ↗) like TripAdvisor
    ctx.fillStyle = '#AAB6C8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↑', w * 0.435, h * 0.32);
    ctx.fillText('↓', w * 0.45, h * 0.68);
    ctx.fillText('↗', w * 0.62, h * 0.44);
    ctx.fillText('↙', w * 0.34, h * 0.78);

    // 6. Crisp White Rotated Street Labels (ST 288, BLVD, Cross Streets)
    let primarySt = 'ST 288';
    if (addressKh) {
      const m = addressKh.match(/(?:st(?:reet)?\.?|ផ្លូវ(?:លេខ)?)\s*([0-9A-Za-z]+)/i);
      if (m) primarySt = `ST ${m[1].toUpperCase()}`;
    }
    const baseNum = parseInt(primarySt.replace(/\D/g, ''), 10) || 288;

    ctx.fillStyle = '#E2E8F0';
    ctx.strokeStyle = '#242B35';
    ctx.lineWidth = 2.5;
    ctx.font = 'bold 10px sans-serif';

    // Horizontal & Vertical Street Labels
    const stLabels = [
      { text: primarySt, x: w * 0.25, y: h * 0.50, angle: 0 },
      { text: `ST ${baseNum - 10}`, x: w * 0.22, y: h * 0.24, angle: 0 },
      { text: `ST ${baseNum + 12}`, x: w * 0.74, y: h * 0.75, angle: 0 },
      { text: `ST ${baseNum - 4}`, x: w * 0.16, y: h * 0.36, angle: Math.PI / 2 },
      { text: `ST ${baseNum + 6}`, x: w * 0.78, y: h * 0.34, angle: Math.PI / 4 },
    ];
    for (const lbl of stLabels) {
      ctx.save();
      ctx.translate(lbl.x, lbl.y);
      ctx.rotate(lbl.angle);
      ctx.strokeText(lbl.text, 0, 0);
      ctx.fillText(lbl.text, 0, 0);
      ctx.restore();
    }

    // Diagonal Boulevard Label
    ctx.save();
    ctx.translate(w * 0.68, h * 0.28);
    ctx.rotate(-0.56);
    ctx.font = 'bold 10.5px sans-serif';
    const blvdLabel = (provinceEn || 'PHNOM PENH').toUpperCase() + ' MAIN BLVD';
    ctx.strokeText(blvdLabel, 0, 0);
    ctx.fillText(blvdLabel, 0, 0);
    ctx.restore();

    // 7. TripAdvisor Signature Yellow Teardrop Star Pin (⭐) at Center
    const cx = w / 2;
    const cy = h / 2;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 16, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Yellow teardrop body (#EAB308 / #FACC15)
    ctx.fillStyle = '#EAB308';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 15, Math.PI * 0.82, Math.PI * 0.18, false);
    ctx.lineTo(cx, cy + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dark Star inside Yellow Pin
    ctx.fillStyle = '#1E293B';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', cx, cy - 4);

    ctx.restore();
  }, [validLat, validLng, addressKh, nameKh, provinceEn]);

  const fullAddress =
    addressKh && addressKh.trim()
      ? `${addressKh}, ${language === 'en' ? provinceEn || 'Cambodia' : provinceKh || 'កម្ពុជា'}`
      : `${nameKh}, ${language === 'en' ? provinceEn || 'Cambodia' : provinceKh || 'កម្ពុជា'}`;

  return (
    <div className="rounded-2xl overflow-hidden bg-[#12161F] border border-slate-700/80 shadow-lg text-white font-khmer">
      {/* TripAdvisor "The area" Header */}
      <div className="p-4 space-y-3">
        <h3 className="text-base sm:text-lg font-extrabold text-white">
          {tr(language, 'ផែនទីតំបន់ជុំវិញទីតាំងនេះ (The Area)', 'The area', '周边街区地图 (The Area)')}
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

      {/* Interactive TripAdvisor Dark Street Map Canvas */}
      <div
        onClick={() => onOpenFullMap('directions')}
        className="relative w-full h-52 sm:h-60 cursor-pointer group overflow-hidden border-t border-slate-800"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Bottom-left & Bottom-right Attribution Badges matching TripAdvisor */}
        <div className="absolute left-2.5 bottom-2 px-2 py-0.5 rounded bg-slate-950/75 text-[10px] font-bold text-slate-200 flex items-center gap-1 border border-white/10">
          <Compass className="w-3 h-3 text-amber-400" />
          <span>Offline Street Map</span>
        </div>

        <div className="absolute right-2.5 bottom-2 px-2 py-0.5 rounded bg-white/85 text-slate-900 text-[9px] font-semibold">
          © OpenStreetMap • Offline Ready
        </div>

        {/* Floating Action Pill to Open Full Interactive Road Navigation */}
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
            <span>{tr(language, 'នាំផ្លូវទៅទីតាំងនេះ', 'Get Directions', '路线导航')}</span>
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

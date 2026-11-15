import React from 'react';
import { LocateFixed, MapPin, RefreshCw } from 'lucide-react';
import { Language } from '../../types';
import { tr, translateProvince } from '../../utils/i18n';
import { PROVINCE_CENTERS, RADIUS_OPTIONS } from '../../utils/nearMeEngine';

export interface NearMeControlBarProps {
  language: Language;
  geoStatus: 'requesting' | 'granted' | 'fallback';
  detectedGpsProvince: string;
  manualProvince: string;
  onProvinceChange: (provinceKh: string) => void;
  onRefreshGps: () => void;
  isLoadingNearby: boolean;
  selectedRadiusMeters: number;
  onSelectRadius: (radiusMeters: number) => void;
  countLabel: string;
}

export const NearMeControlBar: React.FC<NearMeControlBarProps> = ({
  language,
  geoStatus,
  detectedGpsProvince,
  manualProvince,
  onProvinceChange,
  onRefreshGps,
  isLoadingNearby,
  selectedRadiusMeters,
  onSelectRadius,
  countLabel,
}) => {
  const displayProvinceKh = manualProvince || detectedGpsProvince || 'រាជធានីភ្នំពេញ';
  const localizedDisplayProvince = translateProvince(displayProvinceKh, language);

  return (
    <div className="space-y-2" data-testid="near-me-control-bar">
      {/* Row 1: Essential GPS Location Status + Province Selector + Refresh GPS */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-white px-3 py-2 rounded-2xl border border-slate-200/85 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
          </span>
          <span className="text-[11.5px] font-extrabold text-slate-800 leading-[1.6] break-words">
            {geoStatus === 'requesting'
              ? tr(
                  language,
                  'កំពុងចាប់ទីតាំង GPS...',
                  'Locating GPS...',
                  '正在获取 GPS...'
                )
              : tr(
                  language,
                  `GPS ផ្ទាល់ • ${localizedDisplayProvince}`,
                  `Live GPS • ${localizedDisplayProvince}`,
                  `实时 GPS • ${localizedDisplayProvince}`
                )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={displayProvinceKh}
            onChange={(e) => onProvinceChange(e.target.value)}
            aria-label={tr(language, 'ជ្រើសរើសខេត្ត/ក្រុង', 'Select Province/City', '选择省份/城市')}
            className="px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[10.5px] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {Object.keys(PROVINCE_CENTERS).map((prov) => (
              <option key={prov} value={prov}>
                {translateProvince(prov, language)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onRefreshGps}
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

      {/* Row 2: Search Radius Selector (5 km Default, Expandable to 10 km or 20 km) */}
      <div className="flex items-center justify-between gap-2 flex-wrap px-2.5 py-1.5 rounded-2xl bg-slate-800/85 border border-slate-700/90">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-extrabold text-emerald-300 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{tr(language, 'រង្វង់ស្វែងរក៖', 'Radius:', '搜索范围：')}</span>
          </span>
          {RADIUS_OPTIONS.map((opt) => {
            const isSelected = selectedRadiusMeters === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSelectRadius(opt.value)}
                style={
                  isSelected
                    ? { background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)' }
                    : undefined
                }
                className={`px-2.5 py-1 rounded-full text-[10.5px] font-extrabold transition cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'text-white shadow-xs border border-emerald-300/60'
                    : 'bg-slate-700/80 text-slate-200 hover:bg-slate-700 border border-slate-600'
                }`}
              >
                {tr(language, opt.labelKh, opt.labelEn, opt.labelZh)}
              </button>
            );
          })}
        </div>
        <span className="text-[10.5px] font-bold text-amber-300/95">{countLabel}</span>
      </div>
    </div>
  );
};

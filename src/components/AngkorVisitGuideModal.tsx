import React, { useMemo, useState } from 'react';
import {
  X,
  Compass,
  MapPin,
  Clock,
  Navigation,
  ShieldCheck,
  CheckCircle2,
  Ban,
  Sparkles,
  ChevronRight,
  Route,
  Building2,
} from 'lucide-react';
import { Language, TouristDestination } from '../types';
import { tr } from '../utils/i18n';
import {
  ANGKOR_TEMPLE_CIRCUITS,
  ANGKOR_CODE_OF_CONDUCT,
  ANGKOR_PARK_FACILITIES,
  AngkorTempleCircuit,
  buildCircuitGoogleMapsRouteUrl,
} from '../data/angkorVisitGuideData';
import { calculateDistanceMeters } from '../utils/nearMeEngine';

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export type AngkorGuideTab = 'circuits' | 'facilities' | 'conduct';

interface AngkorVisitGuideModalProps {
  isOpen: boolean;
  initialTab?: AngkorGuideTab;
  language: Language;
  destinations: TouristDestination[];
  userCoords?: { lat: number; lng: number } | null;
  onClose: () => void;
  onSelectDestination?: (dest: TouristDestination) => void;
}

export const AngkorVisitGuideModal: React.FC<AngkorVisitGuideModalProps> = ({
  isOpen,
  initialTab = 'circuits',
  language,
  destinations,
  userCoords,
  onClose,
  onSelectDestination,
}) => {
  const [activeTab, setActiveTab] = useState<AngkorGuideTab>(initialTab);
  const [selectedCircuitId, setSelectedCircuitId] = useState<AngkorTempleCircuit['id']>('small-circuit');
  const [facilityFilter, setFacilityFilter] = useState<'all' | 'restroom' | 'parking' | 'firstaid_info'>('all');
  const [localGps, setLocalGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const effectiveCoords = userCoords || localGps;

  const selectedCircuit = useMemo(
    () => ANGKOR_TEMPLE_CIRCUITS.find((c) => c.id === selectedCircuitId) || ANGKOR_TEMPLE_CIRCUITS[0],
    [selectedCircuitId]
  );

  const destinationById = useMemo(() => {
    const map = new Map<string, TouristDestination>();
    for (const d of destinations) {
      if (d && d.id) map.set(d.id, d);
    }
    return map;
  }, [destinations]);

  const filteredFacilities = useMemo(() => {
    const base =
      facilityFilter === 'all'
        ? ANGKOR_PARK_FACILITIES
        : ANGKOR_PARK_FACILITIES.filter((f) => f.category === facilityFilter);

    return base
      .map((f) => {
        const distMeters = effectiveCoords
          ? calculateDistanceMeters(effectiveCoords.lat, effectiveCoords.lng, f.latitude, f.longitude)
          : null;
        return { facility: f, distMeters };
      })
      .sort((a, b) => {
        if (a.distMeters !== null && b.distMeters !== null) {
          return a.distMeters - b.distMeters;
        }
        return 0;
      });
  }, [facilityFilter, effectiveCoords]);

  const handleRequestNearestGps = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocalGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[140] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] max-h-[92dvh] rounded-3xl bg-slate-900 border border-amber-400/35 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="kft-khmer-modal-header px-4 py-3.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              style={{
                background: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 100%)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-slate-950"
            >
              <Compass className="w-5 h-5" strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <h2 className="font-khmer font-extrabold text-white text-sm sm:text-base leading-[1.6] truncate">
                {tr(
                  language,
                  'មគ្គុទ្ទេសក៍ឧទ្យានអង្គរផ្លូវការ',
                  'Official Angkor Park Guide',
                  '吴哥古迹公园官方导览'
                )}
              </h2>
              <p className="text-[11px] font-bold text-amber-200 leading-[1.45] truncate">
                {tr(
                  language,
                  'ផ្លូវវង់តូច/វង់ធំ • បង្គន់ & ចំណត • ក្រមប្រតិបត្តិអង្គរ',
                  'Temple Circuits • Restrooms & Parking • Code of Conduct',
                  '大小圈路线 • 免费公厕与停车场 • 景区行为规范'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={tr(language, 'បិទ', 'Close', '关闭')}
            className="w-8 h-8 rounded-full bg-black/35 hover:bg-black/55 text-white flex items-center justify-center border border-white/25 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Main Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-2.5 bg-slate-950/90 border-b border-white/10 shrink-0">
          {[
            {
              id: 'circuits' as AngkorGuideTab,
              emoji: '🗺️',
              label: tr(language, 'ផ្លូវទស្សនា (4 ខ្សែ)', '4 Temple Circuits', '4条游览路线'),
            },
            {
              id: 'facilities' as AngkorGuideTab,
              emoji: '🚻',
              label: tr(language, 'បង្គន់ & ចំណត', 'Toilets & Parking', '公厕与停车场'),
            },
            {
              id: 'conduct' as AngkorGuideTab,
              emoji: '🙏',
              label: tr(language, 'ក្រមប្រតិបត្តិអង្គរ', 'Code of Conduct', '吴哥行为规范'),
            },
          ].map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={
                  active
                    ? {
                        background: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 100%)',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                      }
                    : {
                        background: 'rgba(30, 41, 59, 0.9)',
                      }
                }
                className={`min-h-[40px] px-2 py-1.5 rounded-xl font-khmer font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1 border transition cursor-pointer ${
                  active
                    ? 'text-slate-950 border-amber-200'
                    : 'text-slate-200 border-white/15 hover:border-amber-400/50'
                }`}
              >
                <span>{t.emoji}</span>
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 bg-slate-900">
          {/* TAB 1: TEMPLE CIRCUITS */}
          {activeTab === 'circuits' && (
            <div className="space-y-3.5">
              {/* 4 Circuit Selector Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {ANGKOR_TEMPLE_CIRCUITS.map((c) => {
                  const active = c.id === selectedCircuit.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCircuitId(c.id)}
                      className={`p-2.5 rounded-2xl text-left border transition cursor-pointer flex flex-col justify-between gap-1 ${
                        active
                          ? 'bg-emerald-950/90 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                          : 'bg-slate-800/80 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 truncate">
                          {tr(language, c.badgeKh, c.badgeEn, c.badgeZh)}
                        </span>
                        <span className="text-[10px] font-extrabold text-emerald-300 shrink-0">
                          {c.stops.length} {tr(language, 'គោលដៅ', 'stops', '站')}
                        </span>
                      </div>
                      <div className="font-khmer font-extrabold text-xs sm:text-[13px] text-white leading-[1.55] break-words">
                        {tr(language, c.nameKh, c.nameEn, c.nameZh)}
                      </div>
                      <div className="text-[10.5px] font-bold text-slate-300 flex items-center gap-1.5">
                        <Route className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{tr(language, c.distanceLabelKh, c.distanceLabelEn, c.distanceLabelZh)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Circuit Overview Card + Multi-Stop Route Button */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-khmer font-extrabold text-sm sm:text-base text-amber-300 leading-[1.6]">
                      {tr(language, selectedCircuit.nameKh, selectedCircuit.nameEn, selectedCircuit.nameZh)}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-bold text-emerald-200">
                      <span className="inline-flex items-center gap-1">
                        <Route className="w-3.5 h-3.5 text-amber-400" />
                        {tr(language, selectedCircuit.distanceLabelKh, selectedCircuit.distanceLabelEn, selectedCircuit.distanceLabelZh)}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {tr(language, selectedCircuit.durationLabelKh, selectedCircuit.durationLabelEn, selectedCircuit.durationLabelZh)}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-[1.65] font-khmer">
                  {tr(language, selectedCircuit.descriptionKh, selectedCircuit.descriptionEn, selectedCircuit.descriptionZh)}
                </p>

                <a
                  href={buildCircuitGoogleMapsRouteUrl(selectedCircuit)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                    boxShadow: '0 4px 14px rgba(21, 128, 61, 0.4)',
                  }}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl text-white font-khmer font-extrabold text-xs sm:text-[13px] flex items-center justify-center gap-2 border border-emerald-300/60 transition active:scale-98"
                >
                  <Navigation className="w-4 h-4 shrink-0" />
                  <span>
                    {tr(
                      language,
                      `បើកផែនទីនាំផ្លូវបន្តគ្នាទាំង ${selectedCircuit.stops.length} គោលដៅ (Google Maps)`,
                      `Open Full ${selectedCircuit.stops.length}-Stop Route in Google Maps`,
                      `在 Google 地图中打开全程 ${selectedCircuit.stops.length} 站连续导航`
                    )}
                  </span>
                </a>
              </div>

              {/* Ordered Stops Timeline */}
              <div className="space-y-2.5">
                {selectedCircuit.stops.map((stop) => {
                  const matchedDest = destinationById.get(stop.destinationId);
                  const singleMapUrl = `https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}&travelmode=driving`;
                  return (
                    <div
                      key={`${selectedCircuit.id}-stop-${stop.stepNumber}`}
                      className="p-2.5 rounded-2xl bg-slate-800/90 border border-white/12 flex flex-col gap-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-700 border border-amber-400/30">
                          <img
                            src={stop.photoUrl}
                            alt={tr(language, stop.nameKh, stop.nameEn, stop.nameZh)}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                          <span
                            style={{
                              background: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 100%)',
                            }}
                            className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold text-slate-950 shadow-xs"
                          >
                            #{stop.stepNumber}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="font-khmer font-extrabold text-xs sm:text-sm text-white leading-[1.55] break-words">
                            {tr(language, stop.nameKh, stop.nameEn, stop.nameZh)}
                          </h4>
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 text-[10.5px] font-bold">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{tr(language, stop.bestTimeKh, stop.bestTimeEn, stop.bestTimeZh)}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-[1.55] font-khmer break-words">
                            {tr(language, stop.summaryKh, stop.summaryEn, stop.summaryZh)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                        {matchedDest && onSelectDestination && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectDestination(matchedDest);
                            }}
                            className="flex-1 min-h-[34px] px-2.5 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-amber-300 font-khmer font-extrabold text-[11px] inline-flex items-center justify-center gap-1 border border-amber-400/30 cursor-pointer"
                          >
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{tr(language, 'ព័ត៌មានប្រាសាទ', 'Temple Details', '查看古迹详情')}</span>
                          </button>
                        )}
                        <a
                          href={singleMapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-h-[34px] px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-khmer font-extrabold text-[11px] inline-flex items-center justify-center gap-1 border border-emerald-400/40"
                        >
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{tr(language, 'នាំផ្លូវ Google Maps', 'Navigate', '地图导航')}</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PARK FACILITIES (RESTROOMS, PARKING, FIRST AID & INFO) */}
          {activeTab === 'facilities' && (
            <div className="space-y-3">
              {/* Filter Pills + GPS Nearest Button */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all' as const, label: tr(language, 'ទាំងអស់', 'All', '全部') },
                  { id: 'restroom' as const, label: tr(language, '🚻 បង្គន់អនាម័យឥតគិតថ្លៃ', '🚻 Free Toilets', '🚻 免费公厕') },
                  { id: 'parking' as const, label: tr(language, '🅿️ ចំណតផ្លូវការ', '🅿️ Parking', '🅿️ 停车场') },
                  { id: 'firstaid_info' as const, label: tr(language, '🚑 សង្គ្រោះបឋម & ព័ត៌មាន', '🚑 First Aid & Info', '🚑 急救与咨询') },
                ].map((f) => {
                  const active = facilityFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFacilityFilter(f.id)}
                      className={`px-2.5 py-1.5 rounded-full font-khmer font-extrabold text-[11px] border transition cursor-pointer ${
                        active
                          ? 'bg-amber-400 text-slate-950 border-amber-200'
                          : 'bg-slate-800 text-slate-200 border-white/15 hover:border-amber-400/50'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={handleRequestNearestGps}
                  disabled={gpsLoading}
                  className="ml-auto px-2.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-khmer font-extrabold text-[11px] inline-flex items-center gap-1 border border-emerald-300/50 cursor-pointer"
                >
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>
                    {gpsLoading
                      ? tr(language, 'កំពុងរក GPS...', 'Locating...', '定位中...')
                      : tr(language, 'ជិតខ្ញុំបំផុត (GPS)', 'Nearest to Me', '离我最近')}
                  </span>
                </button>
              </div>

              {/* Facilities List */}
              <div className="space-y-2.5">
                {filteredFacilities.map(({ facility, distMeters }) => {
                  const badgeEmoji =
                    facility.category === 'restroom'
                      ? '🚻'
                      : facility.category === 'parking'
                        ? '🅿️'
                        : '🚑';
                  const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}&travelmode=walking`;
                  return (
                    <div
                      key={facility.id}
                      className="p-3 rounded-2xl bg-slate-800/90 border border-white/12 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-lg shrink-0">
                            {badgeEmoji}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-khmer font-extrabold text-xs sm:text-[13px] text-white leading-[1.55] break-words">
                              {tr(language, facility.nameKh, facility.nameEn, facility.nameZh)}
                            </h4>
                            <p className="text-[11px] font-bold text-amber-300 leading-[1.45] mt-0.5 break-words">
                              📍 {tr(language, facility.nearTempleKh, facility.nearTempleEn, facility.nearTempleZh)}
                            </p>
                          </div>
                        </div>

                        {distMeters !== null && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-[10.5px] font-extrabold shrink-0">
                            {formatDistance(distMeters)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 pt-1 border-t border-white/10">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-200">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          {tr(language, facility.hoursKh, facility.hoursEn, facility.hoursZh)}
                        </span>
                        <span className="text-emerald-300 font-bold">
                          {tr(language, facility.noteKh, facility.noteEn, facility.noteZh)}
                        </span>
                      </div>

                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-khmer font-extrabold text-xs flex items-center justify-center gap-1.5 border border-emerald-400/40"
                      >
                        <Navigation className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {tr(language, 'បើកផែនទីនាំផ្លូវទៅទីតាំងនេះ', 'Navigate in Google Maps', '打开 Google 地图导航')}
                        </span>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: APSARA VISITOR CODE OF CONDUCT */}
          {activeTab === 'conduct' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/35 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <p className="text-xs font-khmer text-amber-100 leading-[1.65]">
                  {tr(
                    language,
                    'ក្រមប្រតិបត្តិអង្គរផ្លូវការរបស់អាជ្ញាធរជាតិអប្សរា (APSARA National Authority) ដើម្បីគោរពទីសក្ការៈ និងថែរក្សាបេតិកភណ្ឌពិភពលោក។',
                    'Official APSARA National Authority Visitor Code of Conduct to respect sacred sites and preserve World Heritage temples.',
                    '阿普萨拉国家管理局（APSARA）官方游客行为准则，共同守护世界文化遗产与神圣宗教圣地。'
                  )}
                </p>
              </div>

              <div className="space-y-2.5">
                {ANGKOR_CODE_OF_CONDUCT.map((rule) => {
                  const isDo = rule.type === 'do';
                  return (
                    <div
                      key={rule.id}
                      className={`p-3 rounded-2xl border flex items-start gap-3 ${
                        isDo
                          ? 'bg-emerald-950/60 border-emerald-500/40'
                          : 'bg-rose-950/60 border-rose-500/40'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                          isDo
                            ? 'bg-emerald-500/20 border-emerald-400/40'
                            : 'bg-rose-500/20 border-rose-400/40'
                        }`}
                      >
                        {rule.emoji}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                              isDo
                                ? 'bg-emerald-500 text-white'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {isDo ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                {tr(language, 'គួរអនុវត្ត', 'DO', '应当遵守')}
                              </>
                            ) : (
                              <>
                                <Ban className="w-3 h-3" />
                                {tr(language, 'ហាមឃាត់', 'PROHIBITED', '严禁行为')}
                              </>
                            )}
                          </span>
                        </div>

                        <h4 className="font-khmer font-extrabold text-xs sm:text-sm text-white leading-[1.55] break-words">
                          {tr(language, rule.titleKh, rule.titleEn, rule.titleZh)}
                        </h4>
                        <p className="text-[11.5px] font-khmer text-slate-200 leading-[1.6] break-words">
                          {tr(language, rule.detailKh, rule.detailEn, rule.detailZh)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AngkorParkQuickBar: React.FC<{
  language: Language;
  onOpenTab: (tab: AngkorGuideTab) => void;
}> = ({ language, onOpenTab }) => {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.92) 0%, rgba(15, 23, 42, 0.96) 100%)',
        boxShadow: '0 8px 22px rgba(6, 78, 59, 0.28), inset 0 1px 0 rgba(253, 224, 71, 0.25)',
      }}
      className="w-full rounded-[20px] p-2.5 border border-amber-400/40 space-y-2"
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-1 text-left cursor-pointer"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="font-khmer font-extrabold text-xs sm:text-[13px] text-amber-200 leading-snug line-clamp-2">
            {tr(
              language,
              'មគ្គុទ្ទេសក៍ផ្លូវទស្សនាអង្គរផ្លូវការ (Visit Angkor Guide)',
              'Official Angkor Park Visitor Guide',
              '吴哥古迹公园官方导览指南'
            )}
          </span>
        </div>
        <ChevronRight className={`w-4 h-4 text-amber-300 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
      </button>

      <div className={`grid grid-cols-3 gap-1.5 ${expanded ? '' : 'hidden'}`}>
        <button
          type="button"
          onClick={() => onOpenTab('circuits')}
          className="min-h-[40px] px-2 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 border border-amber-400/40 text-white font-khmer font-extrabold text-[11px] flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
        >
          <span>🗺️</span>
          <span className="truncate">{tr(language, 'ផ្លូវវង់តូច/ធំ (4ខ្សែ)', '4 Circuits', '大小圈4路线')}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenTab('facilities')}
          className="min-h-[40px] px-2 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 border border-emerald-400/40 text-white font-khmer font-extrabold text-[11px] flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
        >
          <span>🚻</span>
          <span className="truncate">{tr(language, 'បង្គន់ & ចំណត', 'Toilets/Parking', '公厕与停车')}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenTab('conduct')}
          className="min-h-[40px] px-2 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 border border-amber-400/40 text-white font-khmer font-extrabold text-[11px] flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
        >
          <span>🙏</span>
          <span className="truncate">{tr(language, 'ក្រមប្រតិបត្តិ', 'Code of Conduct', '行为规范')}</span>
        </button>
      </div>
    </div>
  );
};

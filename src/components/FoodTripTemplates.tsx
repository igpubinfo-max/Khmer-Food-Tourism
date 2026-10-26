import React, { useMemo, useState } from 'react';
import { ChevronLeft, ExternalLink, Share2, MapPin, LocateFixed, Compass } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tr, translateProvince } from '../utils/i18n';
import { shareText } from '../utils/shareApp';
import { getLocalizedDestination, getLocalizedFood, getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { FOOD_TRIP_TEMPLATES, SLOT_LABELS, FoodTripTemplate, TripStop } from '../data/foodTripTemplates';

interface ResolvedStop {
  key: string;
  type: TripStop['type'];
  name: string;
  photoUrl?: string;
  mapLink: string;
  onOpen?: () => void;
}

const PROVINCE_OPTIONS = [
  { id: 'all', kh: 'គ្រប់តំបន់ទាំងអស់ (All Areas)', en: 'All Areas', zh: '全部区域' },
  { id: 'រាជធានីភ្នំពេញ', kh: 'រាជធានីភ្នំពេញ (Phnom Penh)', en: 'Phnom Penh', zh: '金边市' },
  { id: 'ខេត្តសៀមរាប', kh: 'ខេត្តសៀមរាប (Siem Reap)', en: 'Siem Reap', zh: '暹粒省' },
  { id: 'ខេត្តកំពត', kh: 'ខេត្តកំពត–កែប (Kampot–Kep)', en: 'Kampot–Kep', zh: '贡布–白马' },
  { id: 'ខេត្តបាត់ដំបង', kh: 'ខេត្តបាត់ដំបង (Battambang)', en: 'Battambang', zh: '马德望省' },
  { id: 'ខេត្តព្រះសីហនុ', kh: 'ខេត្តព្រះសីហនុ (Preah Sihanouk)', en: 'Preah Sihanouk', zh: '西哈努克省' },
];

/** "Ready-made 1-Day Food Trips": static itineraries built from existing dishes, restaurants and destinations. */
export const FoodTripTemplates: React.FC = () => {
  const { language, foods, restaurants, destinations, showToast, setSelectedFood, setSelectedRestaurant, setSelectedDestination } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  const resolve = useMemo(() => {
    const foodMap = new Map(foods.map((f) => [f.id, f]));
    const restMap = new Map(restaurants.map((r) => [r.id, r]));
    const destMap = new Map(destinations.map((d) => [d.id, d]));
    return (tpl: FoodTripTemplate, stop: TripStop): ResolvedStop | null => {
      if (stop.type === 'food') {
        const f = foodMap.get(stop.id);
        if (!f) return null;
        const name = getLocalizedFood(f, language).name;
        return {
          key: stop.id,
          type: 'food',
          name,
          photoUrl: f.photoUrl,
          mapLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.nameEn} ${tpl.mapHint}`)}`,
          onOpen: () => setSelectedFood(f),
        };
      }
      if (stop.type === 'restaurant') {
        const r = restMap.get(stop.id);
        if (!r) return null;
        return {
          key: stop.id,
          type: 'restaurant',
          name: getLocalizedRestaurant(r, language).name,
          photoUrl: r.photoUrl,
          mapLink: r.mapUrl || `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`,
          onOpen: () => setSelectedRestaurant(r),
        };
      }
      const d = destMap.get(stop.id);
      if (!d) return null;
      return {
        key: stop.id,
        type: 'destination',
        name: getLocalizedDestination(d, language).name,
        photoUrl: d.photoUrl,
        mapLink: d.mapUrl || `https://www.google.com/maps/search/?api=1&query=${d.latitude},${d.longitude}`,
        onOpen: () => setSelectedDestination(d),
      };
    };
  }, [foods, restaurants, destinations, language, setSelectedFood, setSelectedRestaurant, setSelectedDestination]);

  const handleGpsDetect = () => {
    if (!('geolocation' in navigator)) {
      showToast(tr(language, 'ទូរស័ព្ទមិនគាំទ្រ GPS ទេ', 'GPS not supported', '设备不支持 GPS'), 'warning');
      return;
    }
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Simple distance check to major areas
        if (lat > 13.0 && lng > 103.5) {
          setSelectedArea('ខេត្តសៀមរាប');
        } else if (lat < 11.0 && lng < 104.5) {
          setSelectedArea('ខេត្តកំពត');
        } else if (lat < 11.0 && lng < 103.8) {
          setSelectedArea('ខេត្តព្រះសីហនុ');
        } else if (lat > 12.8 && lng < 103.5) {
          setSelectedArea('ខេត្តបាត់ដំបង');
        } else {
          setSelectedArea('រាជធានីភ្នំពេញ');
        }
        showToast(
          tr(language, '📍 បានចាប់ទីតាំងតំបន់របស់អ្នកដោយស្វ័យប្រវត្តិ!', '📍 Detected your starting area via GPS!', '📍 已通过 GPS 自动定位您的起始区域！'),
          'success'
        );
      },
      () => {
        setIsLocatingGps(false);
        showToast(tr(language, 'មិនអាចចាប់ទីតាំង GPS បានទេ សូមជ្រើសរើសដោយដៃ', 'Could not access GPS, please pick area manually', '无法获取 GPS 定位，请手动选择区域'), 'info');
      },
      { timeout: 6000, enableHighAccuracy: true }
    );
  };

  const typeLabel = (t: TripStop['type']) =>
    t === 'food' ? tr(language, 'ម្ហូប', 'Dish', '菜品') : t === 'restaurant' ? tr(language, 'ហាង', 'Place', '餐厅') : tr(language, 'ទេសចរណ៍', 'Sight', '景点');
  const typeEmoji = (t: TripStop['type']) => (t === 'food' ? '🍲' : t === 'restaurant' ? '🏪' : '🏛️');

  const tplTitle = (t: FoodTripTemplate) => tr(language, t.titleKh, t.titleEn, t.titleZh);
  const tplSub = (t: FoodTripTemplate) => tr(language, t.subtitleKh, t.subtitleEn, t.subtitleZh);
  const tplProvince = (t: FoodTripTemplate) => tr(language, t.provinceKh, t.provinceEn, t.provinceZh);

  const filteredTemplates = useMemo(() => {
    if (selectedArea === 'all') return FOOD_TRIP_TEMPLATES;
    return FOOD_TRIP_TEMPLATES.filter(
      (t) => t.provinceKh.includes(selectedArea) || selectedArea.includes(t.provinceKh)
    );
  }, [selectedArea]);

  const shareTrip = (tpl: FoodTripTemplate) => {
    const lines: string[] = [`🗺️ ${tplTitle(tpl)} (${tplProvince(tpl)})`];
    for (const slot of tpl.slots) {
      const lbl = SLOT_LABELS[slot.slot];
      lines.push(`${lbl.emoji} ${tr(language, lbl.kh, lbl.en, lbl.zh)}`);
      for (const stop of slot.stops) {
        const rs = resolve(tpl, stop);
        if (rs) lines.push(`  ${typeEmoji(rs.type)} ${rs.name} — ${rs.mapLink}`);
      }
    }
    shareText(language, tplTitle(tpl), lines.join('\n'), showToast);
  };

  const open = openId ? FOOD_TRIP_TEMPLATES.find((t) => t.id === openId) : null;

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 border-2 border-amber-300/70 space-y-3 font-khmer">
      {!open ? (
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h4 className="font-moul text-sm text-[#064E3B] dark:text-emerald-300">
                🗺️ {tr(language, 'ដំណើរម្ហូប ១ ថ្ងៃ (រួចរាល់)', 'Ready-made 1-Day Food Trips', '现成一日美食行程')}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {tr(language, 'កាលវិភាគក្នុងតំបន់ភូមិសាស្ត្រតែមួយ មិនលោតខេត្តឆ្ងាយឡើយ', 'Single-area geographic consistency for consecutive meals', '同一地理区域内一日行程规划，路线连贯无跨省跳跃')}
              </p>
            </div>
          </div>

          {/* Starting Area / Province Selector with GPS Button */}
          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-slate-700 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{tr(language, 'ជ្រើសរើសតំបន់ចាប់ផ្តើម៖', 'Starting Area / Province:', '选择出发区域 / 省份：')}</span>
              </span>
              <button
                type="button"
                onClick={handleGpsDetect}
                disabled={isLocatingGps}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
              >
                <LocateFixed className="w-3 h-3 text-emerald-600" />
                <span>{isLocatingGps ? tr(language, 'កំពុងចាប់ GPS...', 'Locating...', '正在定位...') : tr(language, '📍 ចាប់ GPS ខ្ញុំ', '📍 Auto GPS', '📍 GPS 自动定位')}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full text-xs font-bold font-khmer px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {PROVINCE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {tr(language, opt.kh, opt.en, opt.zh)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List of itineraries */}
          <div className="space-y-2">
            {filteredTemplates.length === 0 ? (
              <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500">
                <p className="font-bold mb-1">
                  {tr(language, 'មិនទាន់មានដំណើរកម្សាន្តក្នុងតំបន់នេះនៅឡើយទេ', 'No itineraries found for this area yet', '该区域暂无专属一日行程')}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedArea('all')}
                  className="mt-2 text-emerald-600 dark:text-emerald-400 font-bold underline cursor-pointer"
                >
                  {tr(language, 'មើលគ្រប់តំបន់ទាំងអស់', 'View All Areas', '查看全部区域')}
                </button>
              </div>
            ) : (
              filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setOpenId(t.id)}
                  className="w-full min-h-[56px] flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left active:scale-[0.98] transition cursor-pointer hover:border-emerald-500 shadow-2xs"
                >
                  <span className="text-2xl shrink-0">{t.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-1">
                      <span className="block text-sm font-bold text-slate-900 dark:text-white leading-snug truncate">{tplTitle(t)}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                        📍 {tplProvince(t)}
                      </span>
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{tplSub(t)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="w-11 h-11 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
              aria-label={tr(language, 'ត្រឡប់', 'Back', '返回')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{open.emoji} {tplTitle(open)}</h4>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                  📍 {tplProvince(open)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{tplSub(open)}</p>
            </div>
            <button
              type="button"
              onClick={() => shareTrip(open)}
              className="min-h-[44px] px-3 rounded-xl bg-[#064E3B] text-white text-sm font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer shrink-0"
            >
              <Share2 className="w-4 h-4" />
              {tr(language, 'ចែករំលែក', 'Share', '分享')}
            </button>
          </div>

          {open.slots.map((slot) => {
            const stops = slot.stops.map((s) => resolve(open, s)).filter((x): x is ResolvedStop => Boolean(x));
            if (stops.length === 0) return null;
            const lbl = SLOT_LABELS[slot.slot];
            return (
              <div key={slot.slot} className="space-y-1.5">
                <p className="text-sm font-extrabold text-[#064E3B] dark:text-emerald-300">
                  {lbl.emoji} {tr(language, lbl.kh, lbl.en, lbl.zh)}
                </p>
                {stops.map((st) => (
                  <div key={`${slot.slot}-${st.key}`} className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    {st.photoUrl && <img src={st.photoUrl} alt={st.name} loading="lazy" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate-100" />}
                    <button type="button" onClick={st.onOpen} className="min-w-0 flex-1 text-left cursor-pointer">
                      <span className="block text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">{st.name}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{typeEmoji(st.type)} {typeLabel(st.type)}</span>
                    </button>
                    <a
                      href={st.mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shrink-0 active:scale-95 transition"
                      title={tr(language, 'បើកក្នុង Google Maps', 'Open in Google Maps', '在谷歌地图中打开')}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Maps</span>
                    </a>
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

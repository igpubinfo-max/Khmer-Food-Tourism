import React, { useMemo, useState } from 'react';
import { ChevronLeft, ExternalLink, Share2, MapPin, LocateFixed } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tr } from '../utils/i18n';
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

interface ProvinceSelectItem {
  id: string;
  kh: string;
  en: string;
  zh: string;
  lat: number;
  lng: number;
}

export const ALL_25_FOOD_TRIP_PROVINCE_OPTIONS: ProvinceSelectItem[] = [
  { id: 'all', kh: 'គ្រប់តំបន់ទាំងអស់ (All 25 Provinces)', en: 'All Areas (25 Provinces & Cities)', zh: '全部区域（全柬 25 省市）', lat: 11.5564, lng: 104.9282 },
  { id: 'រាជធានីភ្នំពេញ', kh: '១. រាជធានីភ្នំពេញ (Phnom Penh)', en: '1. Phnom Penh', zh: '1. 金边市 (Phnom Penh)', lat: 11.5564, lng: 104.9282 },
  { id: 'ខេត្តសៀមរាប', kh: '២. ខេត្តសៀមរាប (Siem Reap)', en: '2. Siem Reap', zh: '2. 暹粒省 (Siem Reap)', lat: 13.3633, lng: 103.8564 },
  { id: 'ខេត្តបាត់ដំបង', kh: '៣. ខេត្តបាត់ដំបង (Battambang)', en: '3. Battambang', zh: '3. 马德望省 (Battambang)', lat: 13.0957, lng: 103.2022 },
  { id: 'ខេត្តកំពត', kh: '៤. ខេត្តកំពត (Kampot)', en: '4. Kampot', zh: '4. 贡布省 (Kampot)', lat: 10.6104, lng: 104.1815 },
  { id: 'ខេត្តកែប', kh: '៥. ខេត្តកែប (Kep)', en: '5. Kep', zh: '5. 白马省 (Kep)', lat: 10.4833, lng: 104.3167 },
  { id: 'ខេត្តព្រះសីហនុ', kh: '៦. ខេត្តព្រះសីហនុ (Preah Sihanouk)', en: '6. Preah Sihanouk', zh: '6. 西哈努克省 (Preah Sihanouk)', lat: 10.6275, lng: 103.5221 },
  { id: 'ខេត្តកំពង់ចាម', kh: '៧. ខេត្តកំពង់ចាម (Kampong Cham)', en: '7. Kampong Cham', zh: '7. 磅湛省 (Kampong Cham)', lat: 11.9934, lng: 105.4635 },
  { id: 'ខេត្តមណ្ឌលគិរី', kh: '៨. ខេត្តមណ្ឌលគិរី (Mondulkiri)', en: '8. Mondulkiri', zh: '8. 蒙多基里省 (Mondulkiri)', lat: 12.4558, lng: 107.1881 },
  { id: 'ខេត្តរតនគិរី', kh: '៩. ខេត្តរតនគិរី (Ratanakiri)', en: '9. Ratanakiri', zh: '9. 拉达那基里省 (Ratanakiri)', lat: 13.7394, lng: 106.9873 },
  { id: 'ខេត្តកោះកុង', kh: '១០. ខេត្តកោះកុង (Koh Kong)', en: '10. Koh Kong', zh: '10. 国公省 (Koh Kong)', lat: 11.6153, lng: 102.9838 },
  { id: 'ខេត្តកណ្តាល', kh: '១១. ខេត្តកណ្តាល (Kandal)', en: '11. Kandal', zh: '11. 干丹省 (Kandal)', lat: 11.4833, lng: 104.9500 },
  { id: 'ខេត្តកំពង់ឆ្នាំង', kh: '១២. ខេត្តកំពង់ឆ្នាំង (Kampong Chhnang)', en: '12. Kampong Chhnang', zh: '12. 磅清扬省 (Kampong Chhnang)', lat: 12.2500, lng: 104.6667 },
  { id: 'ខេត្តកំពង់ស្ពឺ', kh: '១៣. ខេត្តកំពង់ស្ពឺ (Kampong Speu)', en: '13. Kampong Speu', zh: '13. 磅士卑省 (Kampong Speu)', lat: 11.4533, lng: 104.5208 },
  { id: 'ខេត្តកំពង់ធំ', kh: '១៤. ខេត្តកំពង់ធំ (Kampong Thom)', en: '14. Kampong Thom', zh: '14. 磅同省 (Kampong Thom)', lat: 12.7111, lng: 104.8887 },
  { id: 'ខេត្តក្រចេះ', kh: '១៥. ខេត្តក្រចេះ (Kratie)', en: '15. Kratie', zh: '15. 桔井省 (Kratie)', lat: 12.4881, lng: 106.0188 },
  { id: 'ខេត្តតាកែវ', kh: '១៦. ខេត្តតាកែវ (Takeo)', en: '16. Takeo', zh: '16. 茶胶省 (Takeo)', lat: 10.9908, lng: 104.7850 },
  { id: 'ខេត្តព្រៃវែង', kh: '១៧. ខេត្តព្រៃវែង (Prey Veng)', en: '17. Prey Veng', zh: '17. 波罗勉省 (Prey Veng)', lat: 11.4868, lng: 105.3253 },
  { id: 'ខេត្តស្វាយរៀង', kh: '១៨. ខេត្តស្វាយរៀង (Svay Rieng)', en: '18. Svay Rieng', zh: '18. 柴桢省 (Svay Rieng)', lat: 11.0879, lng: 105.7993 },
  { id: 'ខេត្តពោធិ៍សាត់', kh: '១៩. ខេត្តពោធិ៍សាត់ (Pursat)', en: '19. Pursat', zh: '19. 菩萨省 (Pursat)', lat: 12.5388, lng: 103.9192 },
  { id: 'ខេត្តបន្ទាយមានជ័យ', kh: '២០. ខេត្តបន្ទាយមានជ័យ (Banteay Meanchey)', en: '20. Banteay Meanchey', zh: '20. 班迭棉吉省 (Banteay Meanchey)', lat: 13.5859, lng: 102.9737 },
  { id: 'ខេត្តប៉ៃលិន', kh: '២១. ខេត្តប៉ៃលិន (Pailin)', en: '21. Pailin', zh: '21. 拜林省 (Pailin)', lat: 12.8489, lng: 102.6093 },
  { id: 'ខេត្តឧត្តរមានជ័យ', kh: '២២. ខេត្តឧត្តរមានជ័យ (Oddar Meanchey)', en: '22. Oddar Meanchey', zh: '22. 奥多棉吉省 (Oddar Meanchey)', lat: 14.1818, lng: 103.5176 },
  { id: 'ខេត្តព្រះវិហារ', kh: '២៣. ខេត្តព្រះវិហារ (Preah Vihear)', en: '23. Preah Vihear', zh: '23. 柏威夏省 (Preah Vihear)', lat: 13.8073, lng: 104.9805 },
  { id: 'ខេត្តស្ទឹងត្រែង', kh: '២៤. ខេត្តស្ទឹងត្រែង (Stung Treng)', en: '24. Stung Treng', zh: '24. 上丁省 (Stung Treng)', lat: 13.5259, lng: 105.9683 },
  { id: 'ខេត្តត្បូងឃ្មុំ', kh: '២៥. ខេត្តត្បូងឃ្មុំ (Tboung Khmum)', en: '25. Tboung Khmum', zh: '25. 特本克蒙省 (Tboung Khmum)', lat: 11.8891, lng: 105.6540 },
];

/** "Ready-made 1-Day Food Trips": static & province-curated itineraries built from existing dishes, restaurants and destinations across all 25 provinces. */
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

  // Build templates for all 25 Cambodian provinces so every province in the selector has a complete 1-Day Food Trip
  const allTemplates = useMemo(() => {
    const templates: FoodTripTemplate[] = [...FOOD_TRIP_TEMPLATES];
    const coveredProvinces = new Set(FOOD_TRIP_TEMPLATES.map((t) => t.provinceKh));

    for (const prov of ALL_25_FOOD_TRIP_PROVINCE_OPTIONS) {
      if (prov.id === 'all' || coveredProvinces.has(prov.id)) continue;

      const coreKh = prov.id.replace(/^រាជធានី|^ខេត្ត/g, '').replace(/ណ្ដ/g, 'ណ្ត').trim();
      const cleanEn = prov.en.replace(/^\d+\.\s*/, '');
      const cleanZh = prov.zh.replace(/^\d+\.\s*/, '').replace(/\s*\([^)]*\)$/, '');

      const provDests = destinations.filter((d) =>
        (d.provinceKh || '').replace(/ណ្ដ/g, 'ណ្ត').includes(coreKh)
      );
      const provRests = restaurants.filter((r) =>
        (r.provinceKh || '').replace(/ណ្ដ/g, 'ណ្ត').includes(coreKh)
      );

      const d1 = provDests[0]?.id || 'dest-1';
      const d2 = provDests[1]?.id || provDests[0]?.id || 'dest-2';
      const r1 = provRests[0]?.id || 'rest-1';
      const r2 = provRests[1]?.id || provRests[0]?.id || 'rest-2';
      const f1 = foods[0]?.id || 'food-1';
      const f2 = foods[1]?.id || 'food-2';

      templates.push({
        id: `trip-prov-${prov.id}`,
        emoji: '🧭',
        titleKh: `ដំណើរម្ហូប និងទេសចរណ៍ ${prov.id} ១ ថ្ងៃ`,
        titleEn: `${cleanEn} Food & Heritage Day`,
        titleZh: `${cleanZh}美食与景点一日游`,
        subtitleKh: `ម្ហូបប្រចាំតំបន់ ហាងល្បីៗ និងរមណីយដ្ឋានក្នុង${prov.id}`,
        subtitleEn: `Local specialties, popular shops & top sights in ${cleanEn}`,
        subtitleZh: `${cleanZh}地道风味美食、人气餐厅与必游景点`,
        provinceKh: prov.id,
        provinceEn: cleanEn,
        provinceZh: cleanZh,
        mapHint: `${cleanEn} Cambodia`,
        slots: [
          { slot: 'morning', stops: [{ type: 'food', id: f1 }, { type: 'destination', id: d1 }] },
          { slot: 'lunch', stops: [{ type: 'restaurant', id: r1 }] },
          { slot: 'afternoon', stops: [{ type: 'destination', id: d2 }] },
          { slot: 'dinner', stops: [{ type: 'food', id: f2 }, { type: 'restaurant', id: r2 }] },
        ],
      });
    }

    return templates;
  }, [destinations, restaurants, foods]);

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
        let nearestId = 'រាជធានីភ្នំពេញ';
        let bestDistSq = Infinity;
        for (const p of ALL_25_FOOD_TRIP_PROVINCE_OPTIONS) {
          if (p.id === 'all') continue;
          const dSq = (lat - p.lat) * (lat - p.lat) + (lng - p.lng) * (lng - p.lng);
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            nearestId = p.id;
          }
        }
        setSelectedArea(nearestId);
        showToast(
          tr(language, '📍 បានចាប់ទីតាំងតំបន់របស់អ្នកដោយស្វ័យប្រវត្តិ!', '📍 Detected your starting area via GPS!', '📍 已通过 GPS 自动定位您的起始区域！'),
          'success'
        );
      },
      () => {
        setIsLocatingGps(false);
        showToast(tr(language, 'មិនអាចចាប់ទីតាំង GPS បានទេ សូមជ្រើសរើសដោយដៃ', 'Could not access GPS, please pick area manually', '无法获取 GPS 定位，请手动选择区域'), 'info');
      },
      { timeout: 6000, enableHighAccuracy: false, maximumAge: 120000 }
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
    return allTemplates.filter(
      (t) => t.provinceKh === selectedArea || t.provinceKh.includes(selectedArea) || selectedArea.includes(t.provinceKh)
    );
  }, [selectedArea, allTemplates]);

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

  const open = openId ? allTemplates.find((t) => t.id === openId) : null;

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

          {/* Starting Area / Province Selector with GPS Button (All 25 Cambodian Provinces & Cities) */}
          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-slate-700 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{tr(language, 'ជ្រើសរើសតំបន់ចាប់ផ្តើម (២៥ ខេត្ត/រាជធានី)៖', 'Starting Area / Province (All 25):', '选择出发区域 / 省份（全柬 25 省市）：')}</span>
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
                {ALL_25_FOOD_TRIP_PROVINCE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {tr(language, opt.kh, opt.en, opt.zh)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List of itineraries */}
          <div className="space-y-2">
            {filteredTemplates.map((t) => (
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
            ))}
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

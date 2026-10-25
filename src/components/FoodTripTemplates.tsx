import React, { useMemo, useState } from 'react';
import { ChevronLeft, ExternalLink, Share2 } from 'lucide-react';
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

/** "Ready-made 1-Day Food Trips": static itineraries built from existing dishes, restaurants and destinations. */
export const FoodTripTemplates: React.FC = () => {
  const { language, foods, restaurants, destinations, showToast, setSelectedFood, setSelectedRestaurant, setSelectedDestination } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);

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

  const typeLabel = (t: TripStop['type']) =>
    t === 'food' ? tr(language, 'ម្ហូប', 'Dish', '菜品') : t === 'restaurant' ? tr(language, 'ហាង', 'Place', '餐厅') : tr(language, 'ទេសចរណ៍', 'Sight', '景点');
  const typeEmoji = (t: TripStop['type']) => (t === 'food' ? '🍲' : t === 'restaurant' ? '🏪' : '🏛️');

  const tplTitle = (t: FoodTripTemplate) => tr(language, t.titleKh, t.titleEn, t.titleZh);
  const tplSub = (t: FoodTripTemplate) => tr(language, t.subtitleKh, t.subtitleEn, t.subtitleZh);

  const shareTrip = (tpl: FoodTripTemplate) => {
    const lines: string[] = [`🗺️ ${tplTitle(tpl)}`];
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
    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 border-2 border-amber-300/70 space-y-3">
      {!open ? (
        <>
          <div>
            <h4 className="font-moul text-sm text-[#064E3B] dark:text-emerald-300">
              🗺️ {tr(language, 'ដំណើរម្ហូប ១ ថ្ងៃ (រួចរាល់)', 'Ready-made 1-Day Food Trips', '现成一日美食行程')}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {tr(language, 'ជ្រើសរើសមួយ ហើយបើកផែនទីតាមចំណុចនីមួយៗ', 'Pick one and open each stop in Google Maps', '选择一个行程，逐站在谷歌地图中打开')}
            </p>
          </div>
          <div className="space-y-2">
            {FOOD_TRIP_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setOpenId(t.id)}
                className="w-full min-h-[56px] flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left active:scale-[0.98] transition cursor-pointer"
              >
                <span className="text-2xl shrink-0">{t.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white leading-snug">{tplTitle(t)}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{tplSub(t)}</span>
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
              <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{open.emoji} {tplTitle(open)}</h4>
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

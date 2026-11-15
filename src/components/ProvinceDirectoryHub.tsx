import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, MapPin, Navigation, Shuffle, ArrowUpDown } from 'lucide-react';
import {
  FoodItem,
  resolveFoodPhotoUrl,
  handleFoodImageError,
} from '../types';
import {
  DISH_PROVINCES,
  ProvinceFilterOption,
  doesDishBelongToProvince,
} from '../utils/foodFilters';
import { tr } from '../utils/i18n';

type RegionId = ProvinceFilterOption['region'];
type RegionFilter = 'all' | RegionId;
type SortMode = 'number' | 'dishes';

const REGION_META: Record<
  RegionId,
  { emoji: string; kh: string; en: string; zh: string; from: string; to: string; ring: string }
> = {
  central: { emoji: '🏙️', kh: 'កណ្តាល', en: 'Central', zh: '中部', from: '#FB923C', to: '#EA580C', ring: 'rgba(251,146,60,0.55)' },
  tonle_sap: { emoji: '🛶', kh: 'បឹងទន្លេសាប', en: 'Tonle Sap', zh: '洞里萨湖', from: '#34D399', to: '#059669', ring: 'rgba(52,211,153,0.55)' },
  coastal: { emoji: '🌊', kh: 'ឆ្នេរសមុទ្រ', en: 'Coastal', zh: '沿海', from: '#38BDF8', to: '#0284C7', ring: 'rgba(56,189,248,0.55)' },
  mekong: { emoji: '🌾', kh: 'មេគង្គ', en: 'Mekong', zh: '湄公河', from: '#FBBF24', to: '#D97706', ring: 'rgba(251,191,36,0.55)' },
  highlands: { emoji: '⛰️', kh: 'តំបន់ខ្ពង់រាប', en: 'Highlands', zh: '高地', from: '#A78BFA', to: '#7C3AED', ring: 'rgba(167,139,250,0.55)' },
};

const REGION_ORDER: RegionId[] = ['central', 'tonle_sap', 'coastal', 'mekong', 'highlands'];

interface Props {
  language: 'km' | 'en' | 'zh';
  provinces: ProvinceFilterOption[];
  dishes: FoodItem[];
  onSelectProvince: (id: string) => void;
  onOpenMap: (prov: ProvinceFilterOption) => void;
}

export const ProvinceDirectoryHub: React.FC<Props> = ({
  language,
  provinces,
  dishes,
  onSelectProvince,
  onOpenMap,
}) => {
  const isKm = language === 'km';
  const isZh = language === 'zh';
  const [region, setRegion] = useState<RegionFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('number');

  const regionLabel = (r: RegionId) => tr(language, REGION_META[r].kh, REGION_META[r].en, REGION_META[r].zh);
  const nameOf = (p: ProvinceFilterOption) => (isKm ? p.fullKh : isZh ? p.zh : p.en);
  const subNameOf = (p: ProvinceFilterOption) => (isKm ? p.en : p.kh);
  const specialtyOf = (p: ProvinceFilterOption) =>
    isKm ? p.culinaryTitleKh : isZh ? p.culinaryTitleZh : p.culinaryTitleEn;

  // Dish count + cover dish per province (computed once per dish list)
  const stats = useMemo(() => {
    const byId = new Map<string, { count: number; cover: FoodItem | null }>();
    const dishById = new Map<string, FoodItem>();
    for (const d of dishes) dishById.set(d.id, d);
    for (const p of DISH_PROVINCES) {
      let count = 0;
      let firstBelonging: FoodItem | null = null;
      for (const d of dishes) {
        if (doesDishBelongToProvince(d, p.id)) {
          count++;
          if (!firstBelonging) firstBelonging = d;
        }
      }
      const signatureCover = p.signatureDishIds.map((id) => dishById.get(id)).find(Boolean) || null;
      byId.set(p.id, { count, cover: signatureCover || firstBelonging });
    }
    return byId;
  }, [dishes]);

  const regionCounts = useMemo(() => {
    const m = new Map<RegionId, number>();
    for (const p of provinces) m.set(p.region, (m.get(p.region) || 0) + 1);
    return m;
  }, [provinces]);

  // Random pick across ALL provinces: shuffled once per open (Fisher-Yates), then rotates every 5s
  // so every province is shown (no repeats until all have been shown).
  const shuffledOrder = useMemo(() => {
    const order = provinces.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }, [provinces]);
  const [featuredPos, setFeaturedPos] = useState(0);
  useEffect(() => {
    if (shuffledOrder.length < 2) return;
    const timer = window.setInterval(() => setFeaturedPos((n) => (n + 1) % shuffledOrder.length), 5000);
    return () => window.clearInterval(timer);
  }, [shuffledOrder]);

  const featured = useMemo(() => {
    if (provinces.length !== DISH_PROVINCES.length) return null;
    return provinces[shuffledOrder[featuredPos % shuffledOrder.length]] || null;
  }, [provinces, shuffledOrder, featuredPos]);

  const list = useMemo(() => {
    const base = provinces
      .map((p) => ({ p, num: DISH_PROVINCES.findIndex((x) => x.id === p.id) + 1 }))
      .filter(({ p }) => region === 'all' || p.region === region);
    if (sortMode === 'dishes') {
      base.sort((a, b) => (stats.get(b.p.id)?.count || 0) - (stats.get(a.p.id)?.count || 0) || a.num - b.num);
    } else {
      base.sort((a, b) => a.num - b.num);
    }
    return base;
  }, [provinces, region, sortMode, stats]);

  const photoOf = (food: FoodItem | null | undefined, size = 360) =>
    food
      ? resolveFoodPhotoUrl(food.photoUrl, food.photoUpdatedAt, size, food.id) || '/welcome/hero-bg.webp'
      : '/welcome/hero-bg.webp';

  const featuredStat = featured ? stats.get(featured.id) : null;
  const featuredMeta = featured ? REGION_META[featured.region] : null;

  return (
    <div className="space-y-3.5">
      {/* 2. Featured province of the day */}
      {featured && featuredMeta && (
        <button
          type="button"
          onClick={() => onSelectProvince(featured.id)}
          className="relative w-full text-left rounded-[26px] overflow-hidden border cursor-pointer active:scale-[0.99] transition group"
          style={{ borderColor: featuredMeta.ring, boxShadow: `0 14px 34px rgba(0,0,0,0.38), 0 0 0 1px ${featuredMeta.ring}` }}
        >
          <img
            src={photoOf(featuredStat?.cover, 720)}
            alt={nameOf(featured)}
            loading="lazy"
            decoding="async"
            onError={(e) =>
              featuredStat?.cover && handleFoodImageError(e, featuredStat.cover.id, featuredStat.cover.photoUrl)
            }
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/10" />
          <div className="relative p-4 pt-24 space-y-2">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold text-white shadow-md"
              style={{ background: `linear-gradient(180deg, ${featuredMeta.from} 0%, ${featuredMeta.to} 100%)` }}
            >
              <Shuffle className="w-3 h-3" strokeWidth={1.75} />
              {tr(language, 'ខេត្តណែនាំ (ចៃដន្យ)', 'Random Province Pick', '随机推荐省市')}
            </span>
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="font-moul text-[13px] text-white leading-[1.7] drop-shadow">
                  {nameOf(featured)}
                </div>
                <p className="text-[11.5px] text-slate-100/95 leading-[1.6] line-clamp-2 mt-0.5">
                  {specialtyOf(featured)}
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-slate-900 text-[11px] font-extrabold shadow-lg">
                {tr(language, 'ស្វែងយល់', 'Explore', '探索')}
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </button>
      )}

      {/* 3. Region chips + sort */}
      <div className="space-y-2">
        <div className="kft-hscroll flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full min-w-0">
          {(['all', ...REGION_ORDER] as RegionFilter[]).map((r) => {
            const active = region === r;
            const count = r === 'all' ? provinces.length : regionCounts.get(r) || 0;
            if (r !== 'all' && count === 0) return null;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRegion(r)}
                aria-pressed={active}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold border transition cursor-pointer whitespace-nowrap ${
                  active
                    ? 'text-white border-transparent shadow-md'
                    : 'text-slate-200 border-white/15 bg-white/5 hover:bg-white/10'
                }`}
                style={
                  active
                    ? {
                        background:
                          r === 'all'
                            ? 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)'
                            : `linear-gradient(180deg, ${REGION_META[r].from} 0%, ${REGION_META[r].to} 100%)`,
                      }
                    : undefined
                }
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{r === 'all' ? tr(language, 'គ្រប់តំបន់', 'All regions', '全部片区') : regionLabel(r)}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 px-0.5">
          <h4 className="text-[13px] font-extrabold text-white leading-[1.6] flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" />
            {tr(language, 'ជ្រើសរើសខេត្តដើម្បីមើលម្ហូប', 'Pick a province to see its dishes', '选择省市查看美食')}
          </h4>
          <button
            type="button"
            onClick={() => setSortMode((m) => (m === 'number' ? 'dishes' : 'number'))}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/8 border border-white/15 text-[10.5px] font-extrabold text-slate-100 hover:bg-white/15 transition cursor-pointer"
          >
            <ArrowUpDown className="w-3 h-3" />
            {sortMode === 'number'
              ? tr(language, 'តាមលេខ', 'By No.', '按序号')
              : tr(language, 'ម្ហូបច្រើនជាងគេ', 'Most dishes', '菜品最多')}
          </button>
        </div>
      </div>

      {/* 4. Province cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {list.map(({ p, num }) => {
          const meta = REGION_META[p.region];
          const st = stats.get(p.id);
          return (
            <div
              key={p.id}
              data-testid={`province-card-${p.id}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectProvince(p.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectProvince(p.id);
                }
              }}
              className="group relative flex gap-3 p-2.5 rounded-[22px] border border-white/10 hover:border-white/30 text-left cursor-pointer transition active:scale-[0.985] overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                boxShadow: '0 8px 22px rgba(0,0,0,0.25)',
              }}
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                style={{ background: `linear-gradient(180deg, ${meta.from}, ${meta.to})` }}
              />

              {/* Cover dish photo */}
              <div className="relative w-[78px] h-[78px] shrink-0 rounded-2xl overflow-hidden bg-slate-700 ml-1">
                <img
                  src={photoOf(st?.cover, 240)}
                  alt={nameOf(p)}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => st?.cover && handleFoodImageError(e, st.cover.id, st.cover.photoUrl)}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                />
                <span
                  className="absolute top-1 left-1 min-w-[22px] h-[22px] px-1 rounded-lg text-white text-[11px] font-black flex items-center justify-center shadow"
                  style={{ background: `linear-gradient(180deg, ${meta.from}, ${meta.to})` }}
                >
                  {num}
                </span>
              </div>

              <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-[13.5px] text-white leading-[1.6] break-words">{nameOf(p)}</span>
                    <span className="text-[10.5px] text-slate-400 leading-[1.5] break-words">({subNameOf(p)})</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-[1.55] line-clamp-2 break-words mt-0.5">
                    {specialtyOf(p)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-1.5 mt-1.5">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white/95 border border-white/15"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" /> <span>{regionLabel(p.region)}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMap(p);
                      }}
                      aria-label={tr(language, 'ផែនទី', 'Map', '地图')}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white border border-emerald-300/40 hover:scale-105 active:scale-95 transition cursor-pointer"
                      style={{ background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)' }}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

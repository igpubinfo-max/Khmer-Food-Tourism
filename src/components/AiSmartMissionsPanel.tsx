import React, { useMemo, useRef, useState } from 'react';
import { Clock3, Scale, Timer, LocateFixed, Users, Gem, RefreshCw, Crown, Lock, ChefHat, Navigation, X } from 'lucide-react';
import type { FoodItem, Language, Restaurant } from '../types';
import { openRestaurantGoogleExternal, resolveFoodPhotoUrl, handleFoodImageError } from '../types';
import { tr } from '../utils/i18n';
import { smoothScrollToElement } from '../utils/smoothScroll';
import { readSavedUserGps } from '../utils/nearMeEngine';
import { getLocalizedFood, getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import {
  KCAL_CAPS,
  GROUP_SIZES,
  runSmartMission,
  type SmartMissionId,
  type Tri,
} from '../services/aiSmartMissions';

interface MissionDef {
  id: SmartMissionId;
  vip: boolean;
  bgColor: string;
  edgeColor: string;
  icon: React.ReactNode;
  label: Tri;
  desc: Tri;
}

const iconCls = 'w-5 h-5 text-white shrink-0';

const MISSIONS: MissionDef[] = [
  {
    id: 'now',
    vip: false,
    bgColor: '#D95D14',
    edgeColor: '#A8430A',
    icon: <Clock3 className={iconCls} strokeWidth={1.75} />,
    label: { km: 'ឥឡូវនេះ', en: 'Right Now', zh: '此刻吃啥' },
    desc: {
      km: 'AI មើលម៉ោងបច្ចុប្បន្ន ហើយណែនាំម្ហូបដែលអ្នកស្រុកញ៉ាំពេលនេះ',
      en: 'AI reads the clock and suggests what Cambodians eat at this hour',
      zh: 'AI 根据当前时间推荐当地人此刻会吃的菜',
    },
  },
  {
    id: 'kcal',
    vip: false,
    bgColor: '#064E3B',
    edgeColor: '#03382A',
    icon: <Scale className={iconCls} strokeWidth={1.75} />,
    label: { km: 'គោលដៅកាឡូរី', en: 'Calorie Goal', zh: '热量目标' },
    desc: {
      km: 'ជ្រើសកម្រិតកាឡូរីអតិបរមា ហើយទទួលបានម្ហូបពិន្ទុខ្ពស់ក្នុងកម្រិតនោះ',
      en: 'Pick a max kcal and get top-rated dishes within that limit',
      zh: '设定热量上限，获取该范围内的高分菜品',
    },
  },
  {
    id: 'quick',
    vip: false,
    bgColor: '#1D4ED8',
    edgeColor: '#1E3A8A',
    icon: <Timer className={iconCls} strokeWidth={1.75} />,
    label: { km: 'រហ័ស ២០ នាទី', en: '20-Min Meals', zh: '20分钟快手菜' },
    desc: {
      km: 'ម្ហូបដែលរៀបចំ និងចម្អិនរួចក្នុង ២០ នាទី ឬតិចជាង',
      en: 'Dishes you can prep and cook in 20 minutes or less',
      zh: '备料加烹饪不超过 20 分钟的菜品',
    },
  },
  {
    id: 'local',
    vip: true,
    bgColor: '#0F766E',
    edgeColor: '#0A524D',
    icon: <LocateFixed className={iconCls} strokeWidth={1.75} />,
    label: { km: 'ម្ហូបតំបន់ជិតខ្ញុំ', en: 'Local Specialties', zh: '本地名菜' },
    desc: {
      km: 'ប្រើ GPS រកខេត្តជិតបំផុត រួចបង្ហាញម្ហូបឈ្មោះ និងហាងជិតៗ',
      en: 'Uses GPS to find your province, then shows its signature dishes & shops',
      zh: '通过 GPS 定位所在省份，推荐招牌菜与附近餐厅',
    },
  },
  {
    id: 'group',
    vip: true,
    bgColor: '#B45309',
    edgeColor: '#7C3A06',
    icon: <Users className={iconCls} strokeWidth={1.75} />,
    label: { km: 'រៀបតុជួបជុំ', en: 'Table Builder', zh: '聚餐配菜' },
    desc: {
      km: 'AI រៀបឈុតតុពេញលេញ (បាយ សម្ល អាំង បន្លែ ញាំ) និងគណនាចំនួនចានតាមចំនួនអ្នក',
      en: 'AI builds a full table (rice, soup, grill, veggie, salad) and works out portions for your party',
      zh: 'AI 配齐一桌菜（主食、汤、烧烤、时蔬、凉拌）并按人数核算份量',
    },
  },
  {
    id: 'gems',
    vip: true,
    bgColor: '#BE123C',
    edgeColor: '#8A0E2C',
    icon: <Gem className={iconCls} strokeWidth={1.75} />,
    label: { km: 'ម្ហូបលាក់កំបាំង', en: 'Hidden Gems', zh: '隐藏宝藏' },
    desc: {
      km: 'ម្ហូបពិន្ទុខ្ពស់ ប៉ុន្តែមានអ្នកស្គាល់តិច — ឱកាសរកឃើញរសជាតិថ្មី',
      en: 'Top-rated dishes few people know yet — discover something new',
      zh: '评分很高却少有人知的菜 — 发现全新风味',
    },
  },
];

const SHORT: Record<SmartMissionId, Tri> = {
  now: { km: 'តាមម៉ោងបច្ចុប្បន្ន', en: 'Fits this hour', zh: '贴合当前时段' },
  kcal: { km: 'ក្រោម 350 – 650 kcal', en: 'Under 350 – 650 kcal', zh: '350 – 650 千卡以内' },
  quick: { km: 'រួចក្នុង ≤ ២០ នាទី', en: 'Done in ≤ 20 min', zh: '20分钟内完成' },
  local: { km: 'តាម GPS ខេត្តអ្នក', en: 'By your GPS province', zh: '按所在省份' },
  group: { km: 'តុពេញ + ចំនួនចាន', en: 'Full table + portions', zh: '整桌配菜+份量' },
  gems: { km: 'ពិន្ទុខ្ពស់ មិនសូវល្បី', en: 'Top-rated, unseen', zh: '高分冷门' },
};

const t = (language: Language, v: Tri) => tr(language, v.km, v.en, v.zh);

interface Props {
  language: Language;
  foods: FoodItem[];
  restaurants: Restaurant[];
  canUseVip: boolean;
  activeId: SmartMissionId | null;
  onActiveChange: (id: SmartMissionId | null) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onPickFood: (food: FoodItem) => void;
  onPickShop: (shop: Restaurant) => void;
  onVipRequired: () => void;
}

export const AiSmartMissionsPanel: React.FC<Props> = ({
  language,
  foods,
  restaurants,
  canUseVip,
  activeId,
  onActiveChange,
  scrollContainerRef,
  onPickFood,
  onPickShop,
  onVipRequired,
}) => {
  const [seed, setSeed] = useState(1);
  const [kcalCap, setKcalCap] = useState(500);
  const [people, setPeople] = useState(4);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(() => readSavedUserGps());
  const [gpsBusy, setGpsBusy] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const scrollToResults = () =>
    smoothScrollToElement(resultsRef.current, {
      containerEl: scrollContainerRef.current,
      offsetTop: 8,
      delayMs: 45,
    });

  const result = useMemo(
    () =>
      activeId
        ? runSmartMission(activeId, foods, restaurants, { seed, kcalCap, people, gps })
        : null,
    [activeId, foods, restaurants, seed, kcalCap, people, gps]
  );
  const active = MISSIONS.find((m) => m.id === activeId) || null;

  const detectGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSeed(1);
        setGpsBusy(false);
      },
      () => setGpsBusy(false),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 }
    );
  };

  const select = (m: MissionDef) => {
    if (m.vip && !canUseVip) {
      onVipRequired();
      return;
    }
    setSeed(1);
    onActiveChange(m.id);
    scrollToResults();
  };

  const chipCls = (on: boolean) =>
    `px-2.5 py-1 rounded-full text-[11px] font-extrabold border cursor-pointer transition active:scale-95 ${
      on ? 'bg-[#064E3B] text-white border-[#064E3B]' : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500'
    }`;

  return (
    <div className="rounded-3xl p-3 sm:p-3.5 bg-white border border-slate-200 space-y-2.5 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-extrabold text-slate-900 block leading-[1.6]">
          {tr(language, 'បេសកកម្មឆ្លាតវៃ៖ តើអ្នកត្រូវការអ្វី?', 'Smart missions: what do you need?', '智能任务：您需要什么？')}
        </label>
        <span className="text-[10px] font-bold text-[#064E3B] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
          {tr(language, '៦ បេសកកម្ម AI', '6 AI Missions', '6 大 AI 任务')}
        </span>
      </div>

      <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2 sm:gap-2.5 items-stretch">
        {MISSIONS.map((m, idx) => {
          const locked = m.vip && !canUseVip;
          const selected = activeId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={selected}
              onClick={() => select(m)}
              style={
                {
                  backgroundColor: m.bgColor,
                  '--kft-3d': `0 6px 0 ${m.edgeColor}, 0 12px 18px rgba(2,6,23,0.30), inset 0 2px 0 rgba(255,255,255,0.30), inset 0 -2px 0 rgba(0,0,0,0.12)`,
                  '--kft-3d-press': `0 2px 0 ${m.edgeColor}, 0 4px 8px rgba(2,6,23,0.25), inset 0 2px 0 rgba(255,255,255,0.25)`,
                } as React.CSSProperties
              }
              className={`group relative min-h-[88px] mb-1.5 rounded-2xl p-2.5 flex items-center gap-2.5 text-left text-white transition-all duration-100 shadow-[var(--kft-3d)] hover:-translate-y-px active:translate-y-1 active:shadow-[var(--kft-3d-press)] cursor-pointer ${
                selected ? 'outline outline-[3px] outline-offset-2 outline-amber-400' : ''
              }`}
            >
              <span className="absolute top-1.5 right-2 z-10 px-1.5 py-[1px] rounded-full bg-black/25 border border-white/30 text-[8.5px] font-extrabold text-white leading-tight flex items-center gap-0.5">
                {m.vip ? (
                  <>
                    {locked ? <Lock className="w-2.5 h-2.5 text-amber-300" strokeWidth={1.75} /> : <Crown className="w-2.5 h-2.5 text-amber-300" strokeWidth={1.75} />}
                    <span>VIP</span>
                  </>
                ) : (
                  <span>{tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费')}</span>
                )}
              </span>
              <span className="w-11 h-11 shrink-0 rounded-xl bg-white/20 flex items-center justify-center shadow-[0_3px_0_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform group-active:translate-y-0.5">
                {m.icon}
              </span>
              <span className="min-w-0 flex-1 pt-2">
                <span
                  className="block font-khmer font-extrabold leading-[1.55] break-words"
                  style={{ fontSize: 'clamp(11px, 3vw, 13.5px)' }}
                >
                  <span className="opacity-80 mr-1">{idx + 1}.</span>
                  {t(language, m.label)}
                </span>
                <span
                  className="block font-khmer font-semibold text-white/90 leading-[1.5] break-words"
                  style={{ fontSize: 'clamp(9.5px, 2.55vw, 11px)' }}
                >
                  {t(language, SHORT[m.id])}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {!active && (
        <p className="text-[11px] text-slate-600 leading-[1.6] px-0.5">
          {tr(
            language,
            'ជ្រើសបេសកកម្មមួយខាងលើ — បេសកកម្មនីមួយៗប្រើទិន្នន័យផ្សេងគ្នា៖ ម៉ោង កាឡូរី ពេលវេលាចម្អិន GPS ចំនួនអ្នក និងពិន្ទុវាយតម្លៃ។',
            'Pick a mission above — each uses a different real signal: clock, calories, cook time, GPS, party size and rating volume.',
            '选择上方任务 — 每个任务使用不同的真实数据：时间、热量、烹饪时长、GPS、人数与评价量。'
          )}
        </p>
      )}

      {active && result && (
        <div ref={resultsRef} className="p-3 rounded-2xl border border-emerald-500/35 bg-slate-50/90 space-y-2.5 scroll-mt-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-extrabold text-[#064E3B] block leading-[1.6]">{t(language, active.desc)}</span>
              <span className="text-[11px] font-bold text-slate-600 block leading-[1.6] mt-0.5">{t(language, result.summary)}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSeed((s) => s + 1);
                  scrollToResults();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black inline-flex items-center gap-1 cursor-pointer active:scale-95 transition"
              >
                <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
                <span>{tr(language, 'ប្តូរថ្មី', 'Shuffle', '换一批')}</span>
              </button>
              <button
                type="button"
                onClick={() => onActiveChange(null)}
                className="p-1.5 rounded-xl bg-slate-200/70 text-slate-600 hover:text-slate-900 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {result.tips && result.tips.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-2.5 space-y-1">
              {result.tips.map((tip, i) => (
                <p key={i} className="text-[11px] font-bold text-amber-900 leading-[1.6] break-words">
                  {t(language, tip)}
                </p>
              ))}
            </div>
          )}

          {active.id === 'kcal' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500">{tr(language, 'កាឡូរីអតិបរមា៖', 'Max calories:', '热量上限：')}</span>
              {KCAL_CAPS.map((c) => (
                <button key={c} type="button" onClick={() => { setKcalCap(c); setSeed(1); }} className={chipCls(kcalCap === c)}>
                  {c} kcal
                </button>
              ))}
            </div>
          )}

          {active.id === 'group' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500">{tr(language, 'ចំនួនអ្នក៖', 'Party size:', '用餐人数：')}</span>
              {GROUP_SIZES.map((n) => (
                <button key={n} type="button" onClick={() => { setPeople(n); setSeed(1); }} className={chipCls(people === n)}>
                  {n} {tr(language, 'នាក់', 'ppl', '人')}
                </button>
              ))}
            </div>
          )}

          {active.id === 'local' && !gps && (
            <button
              type="button"
              onClick={detectGps}
              disabled={gpsBusy}
              className="px-3 py-1.5 rounded-xl bg-[#064E3B] text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition disabled:opacity-60"
            >
              <LocateFixed className={`w-4 h-4 ${gpsBusy ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              <span>{tr(language, 'ប្រើទីតាំងរបស់ខ្ញុំ', 'Use my location', '使用我的位置')}</span>
            </button>
          )}

          <div className="space-y-2">
            {result.dishes.map(({ food, note }) => {
              const loc = getLocalizedFood(food, language);
              return (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => onPickFood(food)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-500 flex items-center justify-between gap-2.5 cursor-pointer text-left transition shadow-2xs active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={resolveFoodPhotoUrl(food.photoUrl, food.photoUpdatedAt, 240, food.id)}
                      onError={(e) => handleFoodImageError(e, food.id, food.photoUrl)}
                      alt={loc.name}
                      loading="lazy"
                      decoding="async"
                      className="w-12 h-12 rounded-xl object-cover shrink-0 bg-slate-200"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 truncate">{loc.name}</div>
                      <div className="text-[10px] font-bold text-emerald-700 leading-[1.5] break-words">{t(language, note)}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        ★ {food.rating} • {loc.category}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-emerald-50 text-[#064E3B] text-[10px] font-bold shrink-0 flex items-center gap-1">
                    <ChefHat className="w-4 h-4" strokeWidth={1.75} />
                    <span>{tr(language, 'រូបមន្ត', 'Recipe', '食谱')}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {result.shops.length > 0 && (
            <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-700">
                {tr(language, 'ហាងអាហារណែនាំ និងការនាំផ្លូវ៖', 'Recommended shops & navigation:', '推荐餐厅与路线导航：')}
              </div>
              {result.shops.map((shop) => {
                const sLoc = getLocalizedRestaurant(shop, language);
                return (
                  <div key={shop.id} className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-2">
                    <div onClick={() => onPickShop(shop)} className="min-w-0 flex-1 cursor-pointer">
                      <div className="text-xs font-bold text-slate-900 truncate hover:text-emerald-600">{sLoc.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {sLoc.province} • ★ {shop.rating}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openRestaurantGoogleExternal(shop, 'directions')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-[10px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Navigation className="w-4 h-4 text-emerald-300" strokeWidth={1.75} />
                      <span>{tr(language, 'នាំផ្លូវ', 'Navigate', '导航')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Sparkles, Bot, Calendar, DollarSign, Users, MapPin, 
  Clock, CheckCircle, Share2, BookmarkCheck, ArrowRight, RefreshCw, Send, Compass, Utensils
} from 'lucide-react';
import { TripPlan } from '../types';

export interface CambodiaProvinceTripOption {
  id: string;
  nameKh: string;
  shortKh: string;
  nameEn: string;
  nameZh: string;
  highlightKh: string;
  highlightEn: string;
}

export const ALL_25_CAMBODIA_PROVINCES: CambodiaProvinceTripOption[] = [
  { id: 'ខេត្តសៀមរាប', nameKh: 'ខេត្តសៀមរាប', shortKh: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒省', highlightKh: 'ប្រាសាទអង្គរវត្ត ភ្នំគូលែន ផាប់ស្ទ្រីត និងភូមិវប្បធម៌', highlightEn: 'Angkor Wat, Phnom Kulen & Pub Street' },
  { id: 'ខេត្តកំពត', nameKh: 'ខេត្តកំពត', shortKh: 'កំពត', nameEn: 'Kampot', nameZh: '贡布省', highlightKh: 'ឧទ្យានជាតិភ្នំបូកគោ ព្រែកកំពត និងចម្ការម្រេចកំពត', highlightEn: 'Bokor Mountain, Kampot River & Pepper Farms' },
  { id: 'ខេត្តព្រះសីហនុ', nameKh: 'ខេត្តព្រះសីហនុ', shortKh: 'ព្រះសីហនុ', nameEn: 'Preah Sihanouk', nameZh: '西哈努克省', highlightKh: 'ឆ្នេរអូរឈើទាល កោះរ៉ុង កោះរ៉ុងសន្លឹម និងទឹកធ្លាក់ក្បាលឆាយ', highlightEn: 'Otres Beach, Koh Rong Islands & Kbal Chhay' },
  { id: 'ខេត្តមណ្ឌលគិរី', nameKh: 'ខេត្តមណ្ឌលគិរី', shortKh: 'មណ្ឌលគិរី', nameEn: 'Mondulkiri', nameZh: '蒙多基里省', highlightKh: 'ទឹកធ្លាក់ប៊ូស្រា សមុទ្រឈើ និងដែនជម្រកសត្វដំរី', highlightEn: 'Bousra Waterfall, Sea Forest & Elephant Sanctuary' },
  { id: 'រាជធានីភ្នំពេញ', nameKh: 'រាជធានីភ្នំពេញ', shortKh: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边市', highlightKh: 'ព្រះបរមរាជវាំង វត្តភ្នំ មាត់ទន្លេចតុមុខ និងផ្សារធំថ្មី', highlightEn: 'Royal Palace, Wat Phnom, Riverside & Central Market' },
  { id: 'ខេត្តកែប', nameKh: 'ខេត្តកែប', shortKh: 'កែប', nameEn: 'Kep', nameZh: '白马省', highlightKh: 'ឆ្នេរកែប ផ្សារក្ដាម កោះទន្សាយ និងឧទ្យានជាតិកែប', highlightEn: 'Kep Beach, Crab Market, Rabbit Island & National Park' },
  { id: 'ខេត្តបាត់ដំបង', nameKh: 'ខេត្តបាត់ដំបង', shortKh: 'បាត់ដំបង', nameEn: 'Battambang', nameZh: '马德望省', highlightKh: 'ភ្នំសំពៅ ឡូរីបាត់ដំបង ប្រាសាទបាណន់ និងស្ទឹងសង្កែ', highlightEn: 'Phnom Sampeau, Bamboo Train & Wat Banan' },
  { id: 'ខេត្តកោះកុង', nameKh: 'ខេត្តកោះកុង', shortKh: 'កោះកុង', nameEn: 'Koh Kong', nameZh: '国公省', highlightKh: 'ទឹកធ្លាក់តាតៃ ព្រៃកោងកាងពាមក្រសោប និងតំបន់អារ៉ែង', highlightEn: 'Tatai Waterfall, Peam Krasop Mangroves & Areng Valley' },
  { id: 'ខេត្តរតនគិរី', nameKh: 'ខេត្តរតនគិរី', shortKh: 'រតនគិរី', nameEn: 'Ratanakiri', nameZh: '拉达那基里省', highlightKh: 'បឹងយក្សឡោម ទឹកធ្លាក់កាចាញ ទឹកធ្លាក់ចាអុង និងវាលថ្មរំប្លង់', highlightEn: 'Yeak Laom Lake, Kachanh & Cha Ong Waterfalls' },
  { id: 'ខេត្តកណ្តាល', nameKh: 'ខេត្តកណ្តាល', shortKh: 'កណ្តាល', nameEn: 'Kandal', nameZh: '干拉省', highlightKh: 'ភ្នំព្រះរាជទ្រព្យ (ឧត្តុង្គ) កោះឧកញ៉ាតី និងរមណីយដ្ឋានភ្នំធន់មន្ទ', highlightEn: 'Oudong Mountain, Koh Dach Silk Island & Mekong Cruises' },
  { id: 'ខេត្តកំពង់ចាម', nameKh: 'ខេត្តកំពង់ចាម', shortKh: 'កំពង់ចាម', nameEn: 'Kampong Cham', nameZh: '磅湛省', highlightKh: 'ស្ពានឫស្សីកោះប៉ែន ប្រាសាទនគរបាជ័យ និងភ្នំប្រុសភ្នំស្រី', highlightEn: 'Koh Paen Bamboo Bridge, Wat Nokor & Phnom Pros' },
  { id: 'ខេត្តកំពង់ឆ្នាំង', nameKh: 'ខេត្តកំពង់ឆ្នាំង', shortKh: 'កំពង់ឆ្នាំង', nameEn: 'Kampong Chhnang', nameZh: '磅清扬省', highlightKh: 'ភូមិស្មូនឆ្នាំងអណ្តូងឫស្សី ភូមិបណ្តែតទឹក និងភ្នំសន្ទTouch', highlightEn: 'Andoung Russei Pottery Village & Floating Villages' },
  { id: 'ខេត្តកំពង់ស្ពឺ', nameKh: 'ខេត្តកំពង់ស្ពឺ', shortKh: 'កំពង់ស្ពឺ', nameEn: 'Kampong Speu', nameZh: '磅士卑省', highlightKh: 'ឧទ្យានជាតិគិរីរម្យ ទឹកធ្លាក់ជ្រាវ និងភ្នំឱរ៉ាល់', highlightEn: 'Kirirom Pine National Park, Chambok & Chreav Waterfall' },
  { id: 'ខេត្តកំពង់ធំ', nameKh: 'ខេត្តកំពង់ធំ', shortKh: 'កំពង់ធំ', nameEn: 'Kampong Thom', nameZh: '磅同省', highlightKh: 'ប្រាសាទសំបូរព្រៃគុក (បេតិកភណ្ឌពិភពលោក) និងភ្នំសន្ទុក', highlightEn: 'Sambor Prei Kuk UNESCO Temples & Phnom Santuk' },
  { id: 'ខេត្តក្រចេះ', nameKh: 'ខេត្តក្រចេះ', shortKh: 'ក្រចេះ', nameEn: 'Kratie', nameZh: '桔井省', highlightKh: 'អន្លង់ផ្សោតកាំពី កោះទ្រង់ និងប្រាសាទសសរ ១០០', highlightEn: 'Kampi Irrawaddy Dolphins, Koh Trong & 100-Pillar Pagoda' },
  { id: 'ខេត្តតាកែវ', nameKh: 'ខេត្តតាកែវ', shortKh: 'តាកែវ', nameEn: 'Takeo', nameZh: '茶胶省', highlightKh: 'ភ្នំដា ប្រាសាទភ្នំជីសូរ ប្រាសាទតាព្រហ្មទន្លេបាទី និងភ្នំតាម៉ៅ', highlightEn: 'Phnom Da, Phnom Chisor, Tonle Bati & Phnom Tamao Zoo' },
  { id: 'ខេត្តព្រៃវែង', nameKh: 'ខេត្តព្រៃវែង', shortKh: 'ព្រៃវែង', nameEn: 'Prey Veng', nameZh: '波罗勉省', highlightKh: 'រមណីយដ្ឋានបាភ្នំ ស្ពានអ្នកលឿង និងបឹងស្នេហ៍ទួលព័ន្ធតាឡី', highlightEn: 'Ba Phnom Resort, Neak Loeung Bridge & Boeung Sne Bird Sanctuary' },
  { id: 'ខេត្តស្វាយរៀង', nameKh: 'ខេត្តស្វាយរៀង', shortKh: 'ស្វាយរៀង', nameEn: 'Svay Rieng', nameZh: '柴桢省', highlightKh: 'ប្រាសាទបាសាក់ រមណីយដ្ឋានព្រៃគគីរ និងមាត់ទន្លេវ៉ៃគោ', highlightEn: 'Prasat Basak, Prey Koki Eco-Park & Waiko Riverfront' },
  { id: 'ខេត្តពោធិ៍សាត់', nameKh: 'ខេត្តពោធិ៍សាត់', shortKh: 'ពោធិ៍សាត់', nameEn: 'Pursat', nameZh: '菩萨省', highlightKh: 'ភ្នំ ១៥០០ (វាលវែង) ទឹកធ្លាក់ច្រកល្អៀង និងបូជនីយដ្ឋានអ្នកតាឃ្លាំងមឿង', highlightEn: 'Phnom 1500 Veal Veng, Chrok La Eang Waterfall & Kampong Luong' },
  { id: 'ខេត្តបន្ទាយមានជ័យ', nameKh: 'ខេត្តបន្ទាយមានជ័យ', shortKh: 'បន្ទាយមានជ័យ', nameEn: 'Banteay Meanchey', nameZh: '卜迭棉芷省', highlightKh: 'ប្រាសាទបន្ទាយឆ្មារ ប្រាសាទបន្ទាយទ័ព និងអាងទឹកត្រពាំងថ្ម', highlightEn: 'Banteay Chhmar Temple, Banteay Top & Trapeang Thma Crane Sanctuary' },
  { id: 'ខេត្តប៉ៃលិន', nameKh: 'ខេត្តប៉ៃលិន', shortKh: 'ប៉ៃលិន', nameEn: 'Pailin', nameZh: '拜林省', highlightKh: 'ភ្នំយ៉ាត ទឹកធ្លាក់ភ្នំខៀវ (អូរតាវ៉ៅ) និងចម្ការតាង៉ែនប៉ៃលិន', highlightEn: 'Phnom Yat Pagoda, Phnom Khiev Waterfall & Longan Orchards' },
  { id: 'ខេត្តឧត្តរមានជ័យ', nameKh: 'ខេត្តឧត្តរមានជ័យ', shortKh: 'ឧត្តរមានជ័យ', nameEn: 'Oddar Meanchey', nameZh: '奥多棉芷省', highlightKh: 'តំបន់ប្រវត្តិសាស្ត្រអន្លង់វែង ស្ពានទ័ព និងជួរភ្នំដងរែក', highlightEn: 'Anlong Veng Historical Site, Spean Toap & Dangrek Mountains' },
  { id: 'ខេត្តព្រះវិហារ', nameKh: 'ខេត្តព្រះវិហារ', shortKh: 'ព្រះវិហារ', nameEn: 'Preah Vihear', nameZh: '柏威夏省', highlightKh: 'ប្រាសាទព្រះវិហារ ប្រាសាទកោះកេរ និងប្រាសាទព្រះខ័នកំពង់ស្វាយ', highlightEn: 'Preah Vihear UNESCO Temple, Koh Ker Pyramid & Preah Khan' },
  { id: 'ខេត្តស្ទឹងត្រែង', nameKh: 'ខេត្តស្ទឹងត្រែង', shortKh: 'ស្ទឹងត្រែង', nameEn: 'Stung Treng', nameZh: '上丁省', highlightKh: 'តំបន់រ៉ាមសារទន្លេមេគង្គ ទឹកធ្លាក់សុភមិត្ត និងកោះហាន', highlightEn: 'Mekong Ramsar Wetlands, Sopheakmit Waterfall & Koh Han' },
  { id: 'ខេត្តត្បូងឃ្មុំ', nameKh: 'ខេត្តត្បូងឃ្មុំ', shortKh: 'ត្បូងឃ្មុំ', nameEn: 'Tboung Khmum', nameZh: '特本克蒙省', highlightKh: 'រមណីយដ្ឋានទឹកធ្លាក់ហោង ប្រាសាទព្រះធាតុបាស្រី និងចម្ការកៅស៊ូជប់', highlightEn: 'Haong Waterfall, Preah Theat Basrei Temple & Chup Rubber Estate' },
];

export const AiTripPlannerModal: React.FC = () => {
  const { 
    isAiTripPlannerModalOpen, setIsAiTripPlannerModalOpen,
    generateAiTripPlan, saveTripPlan, language, showToast,
    destinations, restaurants, setSelectedDestination, setSelectedRestaurant
  } = useApp();

  const isKm = language === 'km';

  // Wizard state: inputs vs generated result
  const [selectedProvince, setSelectedProvince] = useState<string>('ខេត្តសៀមរាប');
  const [durationDays, setDurationDays] = useState<number>(2);
  const [budgetLevel, setBudgetLevel] = useState<'budget' | 'medium' | 'luxury'>('medium');
  const [companion, setCompanion] = useState<'solo' | 'couple' | 'friends' | 'family'>('friends');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepText, setGenerationStepText] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<TripPlan | null>(null);
  const [activeDayTab, setActiveDayTab] = useState<number>(1);

  const selectedProvinceMeta = useMemo(() => {
    const found =
      ALL_25_CAMBODIA_PROVINCES.find(p => p.id === selectedProvince) ||
      ALL_25_CAMBODIA_PROVINCES[0];
    const core = found.shortKh.replace(/ណ្ដ/g, 'ណ្ត').trim();
    const destCount = destinations.filter(d =>
      (d.provinceKh || '').replace(/ណ្ដ/g, 'ណ្ត').includes(core)
    ).length;
    const restCount = restaurants.filter(r =>
      (r.provinceKh || '').replace(/ណ្ដ/g, 'ណ្ត').includes(core)
    ).length;
    return { ...found, destCount, restCount };
  }, [selectedProvince, destinations, restaurants]);

  if (!isAiTripPlannerModalOpen) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationStepText(isKm ? 'AI កំពុងវិភាគតំបន់ទេសចរណ៍ និងហាងឆ្ងាញ់ៗ...' : 'AI analyzing top spots & restaurants...');

    setTimeout(() => {
      setGenerationStepText(isKm ? 'AI កំពុងរៀបចំកាលវិភាគធ្វើដំណើរ និងគណនាថវិកា...' : 'AI calculating routes & optimal budget...');
    }, 700);

    setTimeout(() => {
      const plan = generateAiTripPlan(selectedProvince, durationDays, budgetLevel, companion);
      setGeneratedPlan(plan);
      setActiveDayTab(1);
      setIsGenerating(false);
    }, 1400);
  };

  const handleShare = () => {
    if (!generatedPlan) return;
    const text = `🗺️ ផែនការដើរលេង AI នៅ${generatedPlan.provinceKh} (${generatedPlan.durationDays} ថ្ងៃ)\n` +
      `💰 ថវិកាប៉ាន់ស្មានសរុប៖ ~$${generatedPlan.totalEstimatedCostUsd} USD\n` +
      `👥 ដំណើរកម្សាន្ត៖ ${generatedPlan.companion}\n` +
      `ទាញយកកម្មវិធី Khmer Food & Tourism ដើម្បីមើលកាលវិភាគលម្អិត!`;
    
    if (navigator.share) {
      navigator.share({ title: 'AI Trip Plan', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      showToast(isKm ? 'បានចម្លងផែនការដើរលេងទៅក្តារតម្បៀតខ្ទាស់!' : 'Copied trip plan to clipboard!', 'info');
    }
  };

  const handleSave = () => {
    if (generatedPlan) {
      saveTripPlan(generatedPlan);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#064E3B] via-emerald-800 to-[#047857] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-moul text-sm text-white">
                  {isKm ? 'ផែនការដើរលេង AI' : 'AI Trip Planner'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-900 text-[10px] font-black shadow-xs">
                  {isKm ? 'ឆ្លាតវៃស្វ័យប្រវត្តិ 🤖' : 'Automated AI 🤖'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-khmer">
                {isKm ? 'រៀបចំផ្លូវដើរលេង កន្លែងញ៉ាំ និងកម្សាន្តតាមថវិកា' : 'Auto-generate meals & sightseeing itinerary'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAiTripPlannerModalOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-emerald-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] p-4 pb-8 space-y-4 font-khmer">
          {/* AI Generating Loading State */}
          {isGenerating ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-[#064E3B] dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800 shadow-sm animate-bounce">
                <Bot className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-[#0F172A] dark:text-white animate-pulse">
                  {generationStepText}
                </h4>
                <p className="text-xs text-slate-500">
                  {isKm ? 'រៀបចំកន្លែងញ៉ាំ និងកន្លែងកម្សាន្តដ៏ល្អបំផុតជូនអ្នក...' : 'Selecting best spots for you...'}
                </p>
              </div>
            </div>
          ) : !generatedPlan ? (
            /* Input Form Screen */
            <div className="space-y-4">
              {/* 1. Destination Province (All 25 Cambodian Provinces & Capital City) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>
                      {isKm
                        ? '១. ជ្រើសរើសខេត្តគោលដៅ (ទាំង ២៥ ខេត្ត/រាជធានី)៖'
                        : '1. Select Province / City (All 25):'}
                    </span>
                  </label>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    25 ខេត្ត/រាជធានី
                  </span>
                </div>

                {/* Full 25-Province Dropdown Selector */}
                <select
                  value={selectedProvince}
                  onChange={e => setSelectedProvince(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-emerald-500/40 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {ALL_25_CAMBODIA_PROVINCES.map((prov, idx) => (
                    <option key={prov.id} value={prov.id}>
                      {idx + 1}. {isKm ? `${prov.nameKh} (${prov.nameEn})` : `${prov.nameEn} (${prov.nameKh})`}
                    </option>
                  ))}
                </select>

                {/* All 25 Selectable Province Buttons Grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {ALL_25_CAMBODIA_PROVINCES.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProvince(p.id)}
                      className={`p-2 rounded-xl text-xs font-bold transition text-center truncate cursor-pointer ${
                        selectedProvince === p.id
                          ? 'bg-[#064E3B] text-white shadow-xs ring-1 ring-emerald-400/50'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50'
                      }`}
                    >
                      {isKm ? p.shortKh : p.nameEn}
                    </button>
                  ))}
                </div>

                {/* Selected Province Tourism & Dining Info Preview */}
                <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-slate-800/90 border border-emerald-500/30 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-[#064E3B] dark:text-emerald-400">
                      📍 {isKm ? selectedProvinceMeta.nameKh : selectedProvinceMeta.nameEn}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-700">
                        <Compass className="w-3 h-3 text-emerald-500" />
                        {selectedProvinceMeta.destCount} {isKm ? 'តំបន់ទេសចរណ៍' : 'Spots'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-700">
                        <Utensils className="w-3 h-3 text-amber-500" />
                        {selectedProvinceMeta.restCount} {isKm ? 'ហាងអាហារ' : 'Shops'}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    ✨ {isKm ? selectedProvinceMeta.highlightKh : selectedProvinceMeta.highlightEn}
                  </p>
                </div>
              </div>

              {/* 2. Duration Days */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>{isKm ? '២. ចំនួនថ្ងៃធ្វើដំណើរ៖' : '2. Duration:'}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { days: 1, labelKh: '១ ថ្ងៃពេញ' },
                    { days: 2, labelKh: '២ ថ្ងៃ ១ យប់' },
                    { days: 3, labelKh: '៣ ថ្ងៃ ២ យប់' },
                  ].map(d => (
                    <button
                      key={d.days}
                      onClick={() => setDurationDays(d.days)}
                      className={`p-2.5 rounded-xl text-xs font-bold transition text-center ${
                        durationDays === d.days
                          ? 'bg-[#064E3B] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {d.labelKh}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Budget Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>{isKm ? '៣. កម្រិតថវិកា៖' : '3. Budget Level:'}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'budget', labelKh: 'សន្សំសំចៃ', subKh: '< $40/ថ្ងៃ' },
                    { id: 'medium', labelKh: 'មធ្យម', subKh: '$40-$100/ថ្ងៃ' },
                    { id: 'luxury', labelKh: 'ទំនើប VIP', subKh: '> $100/ថ្ងៃ' },
                  ].map(b => (
                    <button
                      key={b.id}
                      onClick={() => setBudgetLevel(b.id as any)}
                      className={`p-2 rounded-xl text-center transition ${
                        budgetLevel === b.id
                          ? 'bg-[#064E3B] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{b.labelKh}</div>
                      <div className={`text-[10px] ${budgetLevel === b.id ? 'text-emerald-200' : 'text-slate-400'}`}>
                        {b.subKh}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Companions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>{isKm ? '៤. អ្នករួមដំណើរជាមួយ៖' : '4. Companions:'}</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'solo', labelKh: 'ម្នាក់ឯង', icon: '🎒' },
                    { id: 'couple', labelKh: 'គូស្នេហ៍', icon: '❤️' },
                    { id: 'friends', labelKh: 'មិត្តភក្តិ', icon: '🎉' },
                    { id: 'family', labelKh: 'គ្រួសារ', icon: '👨‍👩‍👧‍👦' },
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCompanion(c.id as any)}
                      className={`p-2 rounded-xl text-center transition ${
                        companion === c.id
                          ? 'bg-[#064E3B] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="text-base">{c.icon}</div>
                      <div className="text-[11px] font-bold mt-0.5">{c.labelKh}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Generate Button */}
              <button
                onClick={handleGenerate}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-stone-900 font-black text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
              >
                <Sparkles className="w-5 h-5 fill-current" />
                <span>{isKm ? '« បង្កើតផែនការដើរលេងដោយ AI »' : 'Generate AI Trip Plan'}</span>
              </button>
            </div>
          ) : (
            /* Result Screen */
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800/80 border border-emerald-200 dark:border-slate-700 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-[#064E3B] text-white text-[11px] font-bold">
                    📍 {generatedPlan.provinceKh}
                  </span>
                  <span className="text-xs font-black text-[#059669] dark:text-emerald-400">
                    {isKm ? `ថវិកាប៉ាន់ស្មាន៖ ~$${generatedPlan.totalEstimatedCostUsd} USD` : `Est: ~$${generatedPlan.totalEstimatedCostUsd}`}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span>📅 {generatedPlan.durationDays} ថ្ងៃ</span>
                  <span>•</span>
                  <span className="capitalize">👥 {generatedPlan.companion}</span>
                  <span>•</span>
                  <span className="capitalize">💰 {generatedPlan.budgetLevel}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <BookmarkCheck className="w-4 h-4 text-emerald-300" />
                    <span>{isKm ? 'រក្សាទុកផែនការ' : 'Save Plan'}</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-xl bg-white dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 border border-slate-200 dark:border-slate-600 shadow-2xs transition"
                    title={isKm ? 'ចែករំលែក' : 'Share'}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setGeneratedPlan(null)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                    title={isKm ? 'រៀបចំថ្មី' : 'Reset'}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Tabs */}
              <div className="flex gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-2">
                {generatedPlan.days.map(day => (
                  <button
                    key={day.dayNumber}
                    onClick={() => setActiveDayTab(day.dayNumber)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition text-center ${
                      activeDayTab === day.dayNumber
                        ? 'bg-[#064E3B] text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isKm ? `ថ្ងៃទី ${day.dayNumber}` : `Day ${day.dayNumber}`}
                  </button>
                ))}
              </div>

              {/* Day Timeline Activities */}
              {generatedPlan.days
                .filter(d => d.dayNumber === activeDayTab)
                .map(day => (
                  <div key={day.dayNumber} className="space-y-3">
                    {day.activities.map((act, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-[#064E3B] text-[10px] font-bold">
                            {act.timePeriod === 'morning' ? '🌅 ពេលព្រឹក' :
                             act.timePeriod === 'lunch' ? '🍛 ពេលថ្ងៃត្រង់' :
                             act.timePeriod === 'afternoon' ? '🌄 ពេលរសៀល' : '🌙 ពេលល្ងាច'}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-600 font-bold">
                            ~${act.estimatedCostUsd}
                          </span>
                        </div>

                        <div className="flex gap-3">
                          {act.photoUrl && (
                            <img src={act.photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-xs text-[#0F172A] dark:text-white leading-snug">
                              {isKm ? act.titleKh : act.titleEn}
                            </h5>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {isKm ? act.descKh : act.descEn}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
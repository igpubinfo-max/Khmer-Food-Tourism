import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Sparkles, Bot, Calendar, DollarSign, Users, MapPin, 
  Clock, CheckCircle, Share2, BookmarkCheck, ArrowRight, RefreshCw, Send 
} from 'lucide-react';
import { TripPlan } from '../types';

export const AiTripPlannerModal: React.FC = () => {
  const { 
    isAiTripPlannerModalOpen, setIsAiTripPlannerModalOpen,
    generateAiTripPlan, saveTripPlan, language, showToast 
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

  if (!isAiTripPlannerModalOpen) return null;

  // Provinces list
  const popularProvinces = [
    'ខេត្តសៀមរាប',
    'ខេត្តកំពត',
    'ខេត្តព្រះសីហនុ',
    'ខេត្តមណ្ឌលគិរី',
    'រាជធានីភ្នំពេញ',
    'ខេត្តកែប',
    'ខេត្តបាត់ដំបង',
    'ខេត្តកោះកុង',
    'ខេត្តរតនគិរី',
  ];

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
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar font-khmer">
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
              {/* 1. Destination Province */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>{isKm ? '១. ជ្រើសរើសខេត្តគោលដៅ៖' : '1. Select Province:'}</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {popularProvinces.map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedProvince(p)}
                      className={`p-2 rounded-xl text-xs font-bold transition text-center truncate ${
                        selectedProvince === p
                          ? 'bg-[#064E3B] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {p.replace('ខេត្ត', '').replace('រាជធានី', '')}
                    </button>
                  ))}
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
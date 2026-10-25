import React, { useState } from 'react';
import {
  Utensils,
  Store,
  MapPin,
  Navigation,
  ChevronRight,
  ArrowRight,
  Heart,
  Leaf,
  HeartPulse,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const WELCOME_SESSION_KEY = 'kft_welcome_shown_session_v3';
export const WELCOME_LOCAL_KEY = 'kft_welcome_shown_v3';

export type WelcomeTargetSection =
  | 'home'
  | 'food'
  | 'restaurants'
  | 'tourism'
  | 'nearby'
  | 'ai_health';

interface WelcomeScreenModalProps {
  onComplete: (targetSection?: WelcomeTargetSection) => void;
}

export const WelcomeScreenModal: React.FC<WelcomeScreenModalProps> = ({ onComplete }) => {
  const { language, setLanguage } = useApp();
  const isKm = language === 'km';
  const isZh = language === 'zh';
  const [isExiting, setIsExiting] = useState(false);

  const handleProceed = (targetSection: WelcomeTargetSection = 'home') => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      sessionStorage.setItem(WELCOME_SESSION_KEY, 'true');
      localStorage.setItem(WELCOME_LOCAL_KEY, 'true');
    } catch {
      // ignore storage errors
    }
    setTimeout(() => {
      onComplete(targetSection);
    }, 120);
  };

  const featureCards: Array<{
    id: WelcomeTargetSection;
    image: string;
    titleKh: string;
    titleEn: string;
    icon: React.FC<{ className?: string }>;
    badgeBg: string;
    cardBg: string;
    cardBorder: string;
    chevronBg: string;
    chevronText: string;
  }> = [
    {
      id: 'food',
      image: '/welcome/card-food.jpg',
      titleKh: 'ស្វែងរក ម្ហូប',
      titleEn: 'FOOD & DISHES',
      icon: Utensils,
      badgeBg: 'bg-[#f59e0b]',
      cardBg: 'bg-[#fdfaf3]',
      cardBorder: 'border-amber-200/70',
      chevronBg: 'bg-[#fde6c4]',
      chevronText: 'text-[#d97706]',
    },
    {
      id: 'restaurants',
      image: '/welcome/card-shops.jpg',
      titleKh: 'ហាង និងអាជីវកម្ម',
      titleEn: 'SHOPS & RESTAURANTS',
      icon: Store,
      badgeBg: 'bg-[#ef5350]',
      cardBg: 'bg-[#fdf6f7]',
      cardBorder: 'border-rose-200/70',
      chevronBg: 'bg-[#fbd5d8]',
      chevronText: 'text-[#e11d48]',
    },
    {
      id: 'tourism',
      image: '/welcome/card-travel.jpg',
      titleKh: 'ទីកន្លែងទេសចរណ៍',
      titleEn: 'TRAVEL & ATTRACTIONS',
      icon: MapPin,
      badgeBg: 'bg-[#3b82f6]',
      cardBg: 'bg-[#f5f8fd]',
      cardBorder: 'border-blue-200/70',
      chevronBg: 'bg-[#d3e3fd]',
      chevronText: 'text-[#2563eb]',
    },
    {
      id: 'nearby',
      image: '/welcome/card-maps.jpg',
      titleKh: 'ផែនទីជិតខ្ញុំ',
      titleEn: 'MAPS & NEARBY',
      icon: Navigation,
      badgeBg: 'bg-[#43a047]',
      cardBg: 'bg-[#f4fbf6]',
      cardBorder: 'border-emerald-200/70',
      chevronBg: 'bg-[#d1f2d9]',
      chevronText: 'text-[#15803d]',
    },
  ];

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center bg-[#0f291e] overflow-y-auto transition-opacity duration-200 font-khmer ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Mobile-First Centered Frame Matching Reference Layout */}
      <div className="relative w-full max-w-[440px] min-h-screen sm:min-h-[92vh] sm:my-3 sm:rounded-[34px] bg-[#fafaf9] shadow-2xl overflow-hidden flex flex-col justify-between">
        {/* ===================================================================
            1. HERO SECTION (Cambodian Food Platter + Angkor Wat Sunrise)
           =================================================================== */}
        <div className="relative w-full h-[300px] sm:h-[325px] shrink-0 overflow-hidden select-none">
          {/* Clean Photorealistic Hero Background */}
          <img
            src="/welcome/hero-bg.jpg"
            alt="Khmer Food & Angkor Wat"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Subtle Top & Center Readability Gradient Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(10,36,22,0.55) 0%, rgba(12,42,25,0.42) 56%, rgba(250,250,249,0.0) 92%, rgba(250,250,249,1) 100%)',
            }}
          />

          {/* Top-Right Compact Language Switcher (Preserving Language Selection) */}
          <div className="relative z-20 flex justify-end px-3.5 pt-2.5">
            <div className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-md p-0.5 rounded-full border border-white/25">
              <button
                type="button"
                onClick={() => setLanguage('km')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                  language === 'km'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                🇰🇭 ខ្មែរ
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                  language === 'en'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                🇬🇧 EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('zh')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                  language === 'zh'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                🇨🇳 中文
              </button>
            </div>
          </div>

          {/* Hero Logo Badge + Cambodian Green & Gold Title */}
          <div className="relative z-10 px-3.5 pt-0.5 flex items-center gap-3">
            {/* Enlarged Official App Logo Preserving Exact Original Proportions & Clarity */}
            <div className="w-[114px] h-[114px] sm:w-[126px] sm:h-[126px] shrink-0 flex items-center justify-center">
              <img
                src="/welcome/welcome-logo.png"
                alt="Khmer Food & Tourism Official Logo"
                className="w-full h-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.5)] select-none"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/welcome/welcome-logo.jpg';
                }}
              />
            </div>

            {/* Green & Gold 3D-Styled Khmer Headline + English Subtitle */}
            <div className="flex-1 min-w-0 pt-0.5 text-center sm:text-left">
              <div className="inline-block relative">
                <h1
                  className="font-moul text-[19px] sm:text-[21px] leading-[1.35] tracking-normal text-[#fef08a]"
                  style={{
                    textShadow:
                      '0 2px 0 #14532d, 0 -1px 0 #14532d, 2px 0 0 #14532d, -2px 0 0 #14532d, 0 4px 10px rgba(0,0,0,0.65)',
                  }}
                >
                  ស្វែងរក ម្ហូប
                  <span className="block text-[15px] sm:text-[17px] text-[#bbf7d0] mt-0.5">
                    និង ទីកន្លែងទេសចរណ៍{' '}
                    <Leaf className="w-4 h-4 inline-block text-lime-300 fill-lime-400 -mt-1" />
                  </span>
                </h1>
              </div>

              <p
                className="text-[11px] sm:text-xs font-black tracking-[0.06em] text-white uppercase mt-1"
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.85)' }}
              >
                KHMER FOOD & TOURISM
              </p>
            </div>
          </div>

          {/* Subtitle & Green Brushstroke Banner */}
          <div className="relative z-10 px-4 mt-1.5 flex flex-col items-center text-center">
            <p
              className="text-xs sm:text-[13px] font-extrabold text-white tracking-wide"
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}
            >
              {isKm
                ? 'ម្ហូបឆ្ងាញ់ ទីកន្លែងស្អាត ទៅតែមួយកន្លែង'
                : isZh
                ? '美味佳肴与优美景点，尽在一处'
                : 'Delicious Food & Scenic Places — All in One Place'}
            </p>

            {/* Green Brushstroke Pill Badge */}
            <div className="mt-1 px-5 py-1 rounded-full bg-gradient-to-r from-[#1b5e20]/95 via-[#2e7d32] to-[#1b5e20]/95 border border-lime-300/40 shadow-lg">
              <span className="text-xs sm:text-[13px] font-extrabold text-[#fde047] italic tracking-wide drop-shadow-xs">
                {isKm
                  ? 'គ្រប់អ្វីនៅក្នុងកម្មវិធីតែមួយ!'
                  : isZh
                  ? '一站式全功能应用！'
                  : 'Everything in a Single App!'}
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================================
            2. FOUR VISUAL FEATURE CARDS (2x2 Grid) + AI HEALTH ASSISTANT CARD
           =================================================================== */}
        <div className="relative z-20 -mt-3 px-3.5 pb-3.5 flex-1 flex flex-col justify-between bg-[#fafaf9] rounded-t-[26px]">
          <div className="space-y-2.5 pt-1">
            <div className="grid grid-cols-2 gap-2.5">
              {featureCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleProceed(card.id)}
                    className={`group rounded-[20px] ${card.cardBg} border ${card.cardBorder} shadow-[0_4px_14px_rgba(0,0,0,0.07)] hover:shadow-md overflow-hidden text-left transition-all duration-150 hover:scale-[1.01] active:scale-98 cursor-pointer flex flex-col`}
                  >
                    {/* Card Photo Header + Overlapping Circular Badge */}
                    <div className="relative w-full h-[80px] sm:h-[88px]">
                      <img
                        src={card.image}
                        alt={card.titleEn}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div
                        className={`absolute left-3 -bottom-3.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full ${card.badgeBg} border-[2.5px] border-white shadow-md flex items-center justify-center text-white`}
                      >
                        <Icon className="w-4 h-4 stroke-[2.4]" />
                      </div>
                    </div>

                    {/* Card Text + Right Circular Chevron */}
                    <div className="pt-4 pb-2.5 px-3 flex items-end justify-between gap-1 flex-1">
                      <div className="min-w-0">
                        <h3 className="text-[12.5px] sm:text-[13.5px] font-extrabold text-slate-900 leading-tight truncate">
                          {card.titleKh}
                        </h3>
                        <p className="text-[9px] sm:text-[9.5px] font-extrabold text-slate-600 uppercase tracking-tight mt-0.5 truncate font-sans">
                          {card.titleEn}
                        </p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full ${card.chevronBg} ${card.chevronText} flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform`}
                      >
                        <ChevronRight className="w-3.5 h-3.5 stroke-[2.8]" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* PROMINENT AI HEALTH ASSISTANT CARD (Directly Below Travel & Maps Cards) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleProceed('ai_health')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleProceed('ai_health');
                }
              }}
              className="group w-full rounded-[22px] bg-gradient-to-br from-[#f0fdf4] via-white to-[#dcfce7]/90 border-2 border-[#43a047]/45 shadow-[0_6px_18px_rgba(21,128,61,0.12)] hover:shadow-[0_8px_22px_rgba(21,128,61,0.18)] p-3 text-left transition-all duration-150 hover:scale-[1.005] active:scale-99 cursor-pointer relative overflow-hidden"
            >
              {/* Subtle Decorative Medical Leaf Glow */}
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-emerald-200/40 blur-xl pointer-events-none" />

              <div className="relative z-10 flex items-center gap-3">
                {/* Health Icon Badge */}
                <div className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-[#16a34a] via-[#15803d] to-[#14532d] border-2 border-white shadow-md flex items-center justify-center text-white shrink-0">
                  <HeartPulse className="w-6 h-6 stroke-[2.3] text-white" />
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-[#14532d] text-[8px] font-black uppercase tracking-wider shadow-xs border border-white">
                    GUIDE
                  </span>
                </div>

                {/* Title & Short Khmer Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-[13.5px] sm:text-[14.5px] font-extrabold text-[#14532d] leading-tight">
                      {isKm
                        ? 'មគ្គុទ្ទេសក៍អាហារសុខភាព និងរបបអាហារតាមជំងឺ'
                        : isZh
                        ? '健康饮食与慢性病适宜膳食指南'
                        : 'Healthy Food & Disease-Friendly Nutrition Guide'}
                    </h3>
                    <span className="text-[9.5px] font-extrabold text-emerald-700 bg-emerald-100/90 border border-emerald-300/70 px-1.5 py-0.5 rounded-md uppercase font-sans">
                      {isZh ? '医学营养指南' : 'Nutrition Guide'}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-[11.5px] font-bold text-slate-700 leading-snug mt-0.5">
                    {isKm
                      ? 'ណែនាំអាហារសុខភាព អាហារគួរជៀសវាង និងម្ហូបខ្មែរសម្រាប់ទឹកនោមផ្អែម លើសឈាម ខ្លាញ់ ហ្គោត និងក្រពះ'
                      : isZh
                      ? '提供糖尿病、高血压、高血脂、痛风及胃炎的循证健康食材、饮食禁忌与适宜高棉菜推荐'
                      : 'Evidence-based healthy foods, foods to limit & Cambodian dishes for diabetes, BP, cholesterol, gout & gastritis'}
                  </p>
                </div>
              </div>

              {/* Prominent "Explore Healthy Food Guide" CTA Button */}
              <div className="relative z-10 mt-2.5 flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#15803d] via-[#16a34a] to-[#2e7d32] group-hover:brightness-105 text-white shadow-sm transition">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" />
                  <span className="text-xs sm:text-[13px] font-extrabold tracking-wide truncate">
                    {isKm
                      ? 'មើលមគ្គុទ្ទេសក៍អាហារសុខភាព (Healthy Nutrition Guide)'
                      : isZh
                      ? '查看健康饮食与慢病膳食指南 (Nutrition Guide)'
                      : 'Explore Healthy Food & Nutrition Guide'}
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.8] text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================
              3. PAGINATION DOTS + PROMINENT "GET STARTED" BUTTON + FOOTER
             =================================================================== */}
          <div className="pt-3 space-y-3">
            {/* 3 Pagination Indicator Dots (Green Active + 2 Gray) */}
            <div className="flex items-center justify-center gap-2">
              <span className="w-4 h-2 rounded-full bg-[#43a047]" />
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span className="w-2 h-2 rounded-full bg-slate-300" />
            </div>

            {/* Prominent Golden-Orange Pill "Get Started" Button */}
            <button
              type="button"
              onClick={() => handleProceed('home')}
              className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#f6c343] via-[#f08c2b] to-[#e05326] hover:brightness-105 text-white shadow-[0_8px_22px_rgba(224,83,38,0.38)] flex items-center justify-between transition active:scale-98 cursor-pointer"
            >
              <span className="w-6" />
              <div className="text-center leading-tight">
                <span className="block text-[16px] sm:text-[18px] font-extrabold tracking-wide drop-shadow-xs">
                  ចាប់ផ្តើមប្រើកម្មវិធី
                </span>
                <span className="block text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-white/95 font-sans mt-0.5">
                  GET STARTED
                </span>
              </div>
              <ArrowRight className="w-6 h-6 stroke-[2.6] text-white shrink-0" />
            </button>

            {/* Footer Heart Tagline */}
            <div className="flex items-center justify-center gap-1.5 text-center pb-0.5">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
              <span className="text-xs font-extrabold text-slate-700">
                {isKm
                  ? 'ស្វែងរក កាន់តែងាយស្រួល ជាមួយកម្មវិធីយើង'
                  : 'Discover Cambodia More Easily With Our App'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

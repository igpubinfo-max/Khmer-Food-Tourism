import React, { useEffect, useState } from 'react';
import {
  Utensils,
  BookOpen,
  Sparkles,
  Flame,
  Heart,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const WELCOME_SESSION_KEY = 'kft_welcome_shown_session_v1';
const WELCOME_DURATION_MS = 4500; // 4.5 seconds (within 3–5 seconds requirement)

interface WelcomeScreenModalProps {
  onComplete: () => void;
}

export const WelcomeScreenModal: React.FC<WelcomeScreenModalProps> = ({ onComplete }) => {
  const { language } = useApp();
  const isKm = language === 'km';
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const handleProceedToLogin = () => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      sessionStorage.setItem(WELCOME_SESSION_KEY, 'true');
    } catch {
      // ignore storage errors
    }
    setTimeout(() => {
      onComplete();
    }, 180);
  };

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / WELCOME_DURATION_MS) * 100);
      setProgress(pct);
      if (elapsed >= WELCOME_DURATION_MS) {
        clearInterval(interval);
        handleProceedToLogin();
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const benefits = [
    {
      icon: Utensils,
      color: 'from-emerald-500 to-teal-600',
      titleKh: 'ស្វែងយល់មុខម្ហូបខ្មែរឆ្ងាញ់ៗ និងពេញនិយម',
      titleEn: 'Discover delicious and popular Khmer foods.',
    },
    {
      icon: BookOpen,
      color: 'from-amber-500 to-orange-600',
      titleKh: 'មើលរូបភាព ឈ្មោះ ការពិពណ៌នា និងរូបមន្តចម្អិន',
      titleEn: 'Explore food photos, names, descriptions, and recipes.',
    },
    {
      icon: Sparkles,
      color: 'from-purple-500 to-indigo-600',
      titleKh: 'ប្រើប្រាស់ AI ជួយស្គាល់មុខម្ហូបតាមរយៈរូបថត',
      titleEn: 'Use AI to help identify foods from photos.',
    },
    {
      icon: Flame,
      color: 'from-rose-500 to-red-600',
      titleKh: 'ស្វែងរកមុខម្ហូប និងហាងអាហារកំពុងល្បី',
      titleEn: 'Discover trending foods and restaurants.',
    },
    {
      icon: Heart,
      color: 'from-pink-500 to-rose-600',
      titleKh: 'រក្សាទុកមុខម្ហូបដែលចូលចិត្តដើម្បីងាយស្រួលមើល',
      titleEn: 'Save favorite foods for easy access.',
    },
    {
      icon: MapPin,
      color: 'from-cyan-500 to-blue-600',
      titleKh: 'ស្វែងរកភោជនីយដ្ឋានថ្មីៗ និងចែករំលែកបទពិសោធន៍អាហារ',
      titleEn: 'Discover new restaurants and share food experiences.',
    },
  ];

  const remainingSeconds = Math.max(
    1,
    Math.ceil(((100 - progress) / 100) * (WELCOME_DURATION_MS / 1000))
  );

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center bg-[#022C22] text-white overflow-y-auto transition-opacity duration-200 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Food-Themed Background Collage with Warm Royal Emerald Overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="grid grid-cols-2 h-full w-full opacity-25 scale-105">
          <img
            src="/foods/food-1.jpg"
            alt="Fish Amok"
            className="w-full h-full object-cover"
          />
          <img
            src="/foods/food-27.jpg"
            alt="Kampot Pepper Crab"
            className="w-full h-full object-cover"
          />
          <img
            src="/foods/food-37.jpg"
            alt="Nom Banh Chok"
            className="w-full h-full object-cover"
          />
          <img
            src="/foods/food-26.jpg"
            alt="Beef Lok Lak"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#022C22]/90 via-[#064E3B]/92 to-[#022C22]/98 backdrop-blur-[2px]" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-md mx-auto px-5 py-6 flex flex-col justify-between min-h-screen">
        {/* Top Brand & Hero Food Showcase */}
        <div className="text-center space-y-3 pt-1 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[11px] font-khmer font-bold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isKm
                ? 'សូមស្វាគមន៍មកកាន់ មគ្គុទ្ទេសក៍ម្ហូបអាហារ និងទេសចរណ៍ខ្មែរ'
                : 'Welcome to Khmer Food & Tourism Guide'}
            </span>
          </div>

          {/* App Logo + Featured Dish Thumbnails */}
          <div className="flex items-center justify-center gap-3 py-1">
            <img
              src="/foods/food-1.jpg"
              alt="Amok"
              className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-400/40 shadow-lg -rotate-6"
            />
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-amber-400 via-emerald-600 to-[#064E3B] p-0.5 shadow-2xl">
              <div className="w-full h-full rounded-[22px] bg-[#022C22] flex items-center justify-center overflow-hidden">
                <img
                  src="/icon-192.png"
                  alt="App Logo"
                  className="w-14 h-14 object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logo.svg';
                  }}
                />
              </div>
            </div>
            <img
              src="/foods/food-27.jpg"
              alt="Pepper Crab"
              className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400/40 shadow-lg rotate-6"
            />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-moul text-white tracking-wide drop-shadow">
              {isKm ? 'មរតក ẩm thực និងទេសចរណ៍ខ្មែរ' : 'Khmer Food Collection & Tourism'}
            </h1>
            <p className="text-xs text-emerald-200/90 font-khmer mt-1">
              {isKm
                ? 'កម្មវិធីប្រមូលផ្តុំមុខម្ហូបខ្មែរ ភោជនីយដ្ឋាន និងតំបន់ទេសចរណ៍ទូទាំង ២៥ ខេត្ត-រាជធានី'
                : 'Discover Authentic Cambodian Cuisine, Restaurants & Scenic Destinations'}
            </p>
          </div>
        </div>

        {/* 6 Key Benefits List */}
        <div className="my-3 space-y-2 font-khmer">
          <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>{isKm ? '✨ អត្ថប្រយោជន៍សំខាន់ៗនៃកម្មវិធី៖' : '✨ Key App Benefits:'}</span>
            <span className="text-[10px] text-emerald-300 font-mono">200+ Dishes • AI Vision</span>
          </div>

          <div className="space-y-2">
            {benefits.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 shadow-sm transition"
                >
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow-md`}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white leading-snug">
                      {isKm ? item.titleKh : item.titleEn}
                    </p>
                    <p className="text-[10px] text-emerald-200/85 truncate">
                      {isKm ? item.titleEn : item.titleKh}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Countdown Progress & "Get Started" Button */}
        <div className="space-y-2.5 pt-2 font-khmer">
          {/* Smooth Countdown Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-emerald-200/90">
              <span>
                {isKm
                  ? `កំពុងបន្តទៅកាន់ផ្ទាំងចូលគណនីក្នុងរយៈពេល ${remainingSeconds} វិនាទី...`
                  : `Continuing to Login screen in ${remainingSeconds}s...`}
              </span>
              <span className="font-mono font-bold text-amber-300">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleProceedToLogin}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
          >
            <span>{isKm ? 'ចាប់ផ្តើមប្រើប្រាស់ឥឡូវនេះ (Get Started)' : 'Get Started Now'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};

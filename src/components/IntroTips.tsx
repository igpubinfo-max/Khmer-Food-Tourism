import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { tr } from '../utils/i18n';

export const INTRO_SEEN_KEY = 'kft_v3_intro_seen';

/** Skippable 3-card first-run intro (find dishes, collect your Food Passport, share with friends). Shown once. */
export const IntroTips: React.FC = () => {
  const { language } = useApp();
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem(INTRO_SEEN_KEY) !== 'true';
    } catch {
      return false;
    }
  });
  const [step, setStep] = useState(0);

  if (!visible) return null;

  const cards = [
    {
      emoji: '🔎',
      title: tr(language, 'ស្វែងរកម្ហូបឆ្ងាញ់', 'Find great dishes', '发现美味菜肴'),
      body: tr(
        language,
        'ស្វែងរកតាមឈ្មោះ ខេត្ត ឬស្លាកម្ហូប ហើយមើលរូបមន្តចម្អិន និងកន្លែងញ៉ាំ។',
        'Search by name, province or dish tag, then see the recipe and where to eat it.',
        '按名称、省份或菜品标签搜索，查看食谱和哪里可以吃到。'
      ),
    },
    {
      emoji: '🛂',
      title: tr(language, 'ប្រមូលលិខិតឆ្លងដែនម្ហូប', 'Collect your Food Passport', '收集你的美食护照'),
      body: tr(
        language,
        'ចុច «ខ្ញុំបានភ្លក់» លើម្ហូបនីមួយៗ ដើម្បីប្រមូលត្រា និងឡើងកម្រិត។',
        'Tap “I tried it” on each dish to collect stamps and level up.',
        '在每道菜上点击“我吃过了”，收集印章并升级。'
      ),
    },
    {
      emoji: '💌',
      title: tr(language, 'ចែករំលែកជាមួយមិត្តភក្តិ', 'Share with friends', '分享给好友'),
      body: tr(
        language,
        'បង្កើតកាតស្អាតៗ និងដំណើរម្ហូប ១ ថ្ងៃ ដើម្បីចែករំលែកទៅគ្រួសារ និងមិត្តភក្តិ។',
        'Make pretty share cards and 1-day food trips to send to family and friends.',
        '生成精美分享卡片和一日美食行程，发给家人朋友。'
      ),
    },
  ];

  const finish = () => {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, 'true');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const card = cards[step];
  const last = step === cards.length - 1;

  return (
    <div className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-khmer" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 text-center shadow-2xl space-y-4">
        <div className="text-6xl" aria-hidden="true">{card.emoji}</div>
        <h3 className="font-moul text-base text-[#064E3B] dark:text-emerald-300">{card.title}</h3>
        <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">{card.body}</p>
        <div className="flex items-center justify-center gap-2" aria-hidden="true">
          {cards.map((_, i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-[#059669]' : 'w-2 bg-slate-300'}`} />
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={finish}
            className="min-h-[48px] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold cursor-pointer active:scale-95 transition"
          >
            {tr(language, 'រំលង', 'Skip', '跳过')}
          </button>
          <button
            type="button"
            onClick={() => (last ? finish() : setStep((s) => s + 1))}
            className="flex-1 min-h-[48px] rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-base font-bold cursor-pointer active:scale-95 transition"
          >
            {last ? tr(language, 'ចាប់ផ្តើម', 'Get started', '开始使用') : tr(language, 'បន្ទាប់', 'Next', '下一步')}
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Search, X } from 'lucide-react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';

interface Props {
  language: Language;
  userName?: string;
  query: string;
  onChange: (value: string) => void;
}

/** Friendly greeting + one big, easy-to-tap search bar (min 48px tall, 16px text). */
export const HomeGreetingSearch: React.FC<Props> = ({ language, userName, query, onChange }) => {
  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? tr(language, 'អរុណសួស្តី', 'Good morning', '早上好')
      : hour < 17
      ? tr(language, 'ទិវាសួស្តី', 'Good afternoon', '下午好')
      : tr(language, 'សាយ័ណ្ហសួស្តី', 'Good evening', '晚上好');

  return (
    <section className="space-y-2.5">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-khmer">
          {greeting}
          {userName ? `, ${userName}` : ''} 👋
        </p>
        <h2 className="font-moul text-lg leading-snug text-[#064E3B] dark:text-emerald-300">
          {tr(language, 'ថ្ងៃនេះចង់ញ៉ាំអ្វី?', 'What would you like to eat today?', '今天想吃点什么？')}
        </h2>
      </div>

      <div className="relative flex items-center">
        <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 absolute left-4 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder={tr(
            language,
            'ស្វែងរកម្ហូប ហាង ឬកន្លែងដើរលេង...',
            'Search dishes, restaurants or places...',
            '搜索菜肴、餐厅或景点...'
          )}
          aria-label={tr(language, 'ស្វែងរក', 'Search', '搜索')}
          className="w-full min-h-[52px] pl-12 pr-12 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-500/40 text-slate-900 dark:text-white placeholder-slate-400 text-base shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-khmer transition"
        />
        {query && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-1.5 w-11 h-11 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            title={tr(language, 'សម្អាតការស្វែងរក', 'Clear search', '清除搜索')}
            aria-label={tr(language, 'សម្អាតការស្វែងរក', 'Clear search', '清除搜索')}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </section>
  );
};

import React from 'react';
import { useApp } from '../context/AppContext';
import { LogOut, Check, Sparkles } from 'lucide-react';

export const ExitConfirmModal: React.FC = () => {
  const { isExitModalOpen, setIsExitModalOpen, exitAppNow, language } = useApp();

  if (!isExitModalOpen) return null;

  const isKm = language === 'km';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={() => setIsExitModalOpen(false)}
    >
      <div 
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 p-6 text-center transform animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Khmer Angkor / Exit Icon Badge */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-[#064E3B] via-[#059669] to-[#10B981] p-0.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
            <LogOut className="w-8 h-8 text-[#064E3B] dark:text-emerald-400" />
          </div>
        </div>

        {/* Title in Khmer strictly as specified */}
        <h3 className="text-lg font-bold font-khmer text-[#0F172A] dark:text-white mb-1 leading-snug">
          តើអ្នកចង់ចាកចេញពីកម្មវិធីមែនទេ?
        </h3>
        
        <p className="text-xs text-slate-500 dark:text-slate-400 font-khmer mb-6">
          {isKm 
            ? 'សូមជ្រើសរើស "បាទ/ចាស" ដើម្បីចាកចេញ ឬ "បន្តប្រើប្រាស់" ដើម្បីបន្តរុករកអាហារ និងទេសចរណ៍ខ្មែរ' 
            : 'Are you sure you want to exit the Khmer Food & Tourism app?'}
        </p>

        {/* Action Buttons: បាទ/ចាស (Exit) & បន្តប្រើប្រាស់ (Stay) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsExitModalOpen(false)}
            className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-khmer text-xs font-semibold transition-all active:scale-[0.98] border border-slate-200 dark:border-slate-700"
          >
            <Sparkles className="w-4 h-4 text-[#059669]" />
            <span>{isKm ? 'បន្តប្រើប្រាស់' : 'Stay'}</span>
          </button>

          <button
            onClick={exitAppNow}
            className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-2xl bg-[#064E3B] hover:bg-[#047857] text-white font-khmer text-xs font-bold shadow-md transition-all active:scale-[0.98]"
          >
            <Check className="w-4 h-4" />
            <span>{isKm ? 'បាទ/ចាស' : 'Exit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

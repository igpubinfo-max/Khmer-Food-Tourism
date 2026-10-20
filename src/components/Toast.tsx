import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />,
  };

  const bgStyles = {
    success: 'bg-white border-emerald-200 text-slate-800 shadow-lg',
    info: 'bg-white border-blue-200 text-slate-800 shadow-lg',
    warning: 'bg-white border-rose-200 text-rose-950 shadow-lg',
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-sm w-11/12 animate-in fade-in slide-in-from-top-4 duration-200">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md ${bgStyles[toast.type]}`}>
        {icons[toast.type]}
        <p className="text-sm font-medium leading-snug">{toast.message}</p>
      </div>
    </div>
  );
};

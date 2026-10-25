import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tr } from '../utils/i18n';

/**
 * Small "Offline mode" banner. Purely informational: it never reads or writes app data.
 * Foods / restaurants already live in the app's persisted state (vault overrides merged on top),
 * so offline viewing works without any second cache that could shadow admin photos.
 */
export const OfflineBanner: React.FC = () => {
  const { language } = useApp();
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 bottom-16 z-40 px-4 pointer-events-none"
    >
      <div className="max-w-md mx-auto px-3 py-2 rounded-xl bg-slate-900/95 text-white text-xs font-semibold flex items-center gap-2 shadow-lg font-khmer">
        <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
        <span>
          {tr(
            language,
            'របៀបគ្មានអ៊ីនធឺណិត — កំពុងបង្ហាញទិន្នន័យដែលបានរក្សាទុក',
            'Offline mode — showing saved data',
            '离线模式 — 正在显示已保存的数据'
          )}
        </span>
      </div>
    </div>
  );
};

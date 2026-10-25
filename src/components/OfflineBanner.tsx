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
      <div className="max-w-md mx-auto px-3.5 py-2.5 rounded-2xl bg-slate-900/95 border border-amber-400/30 text-white text-xs flex items-start gap-2.5 shadow-xl font-khmer">
        <WifiOff className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <div className="min-w-0 leading-snug">
          <div className="font-extrabold text-amber-300">
            {tr(
              language,
              'ប្រើបានទោះគ្មានអ៊ីនធឺណិត — មិនត្រូវការអ៊ីនធឺណិត',
              'Works Offline — No Internet Required',
              '支持离线使用 — 无需网络连接'
            )}
          </div>
          <div className="text-[11px] text-slate-200 mt-0.5">
            {tr(
              language,
              'អាចមើលម្ហូប រូបមន្ត និងមុខម្ហូបដែលបានរក្សាទុក។ ការស្វែងរកអនឡាញ និងផែនទីផ្ទាល់ ត្រូវការអ៊ីនធឺណិត។',
              'Browse saved dishes, recipes, and favorites offline. Online search and live maps require internet.',
              '可离线浏览菜肴、食谱与收藏内容；在线搜索与实时地图需连接网络。'
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

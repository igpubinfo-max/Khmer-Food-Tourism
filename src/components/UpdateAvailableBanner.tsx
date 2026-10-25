import React, { useEffect, useState } from 'react';
import { Download, Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tr } from '../utils/i18n';
import { APP_VERSION } from '../types';

const UPDATE_CACHE_KEY = 'kft_v3_update_check_cache';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface UpdateCacheData {
  timestamp: number;
  latestTag: string;
  hasUpdate: boolean;
}

function parseVersionNumbers(v: string): number[] {
  const clean = (v || '').replace(/^v/i, '').trim();
  const base = clean.split(/[-.+]/)[0] || '0';
  return base.split('.').map((p) => parseInt(p, 10) || 0);
}

function isRemoteNewer(remoteTag: string, localTag: string): boolean {
  if (!remoteTag) return false;
  const remote = parseVersionNumbers(remoteTag);
  const local = parseVersionNumbers(localTag);
  const maxLen = Math.max(remote.length, local.length);
  for (let i = 0; i < maxLen; i++) {
    const r = remote[i] || 0;
    const l = local[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

/**
 * Lightweight, non-intrusive banner that alerts users when an update is available.
 * Cached in localStorage for 6 hours to conserve bandwidth & API limits.
 */
export const UpdateAvailableBanner: React.FC = () => {
  const { language, setIsInstallModalOpen } = useApp();
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const checkUpdate = async () => {
      try {
        const cachedRaw = localStorage.getItem(UPDATE_CACHE_KEY);
        if (cachedRaw) {
          try {
            const cached: UpdateCacheData = JSON.parse(cachedRaw);
            if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
              if (isMounted) setHasUpdate(cached.hasUpdate);
              return;
            }
          } catch {
            // Invalid cache, proceed to fetch
          }
        }

        const res = await fetch('https://api.github.com/repos/igpubinfo-max/Khmer-Food-Tourism/releases/latest', {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });

        if (!res.ok) return;

        const data = await res.json();
        const remoteTag = data?.tag_name || '';
        const newer = isRemoteNewer(remoteTag, APP_VERSION);

        const cacheToSave: UpdateCacheData = {
          timestamp: Date.now(),
          latestTag: remoteTag,
          hasUpdate: newer,
        };
        localStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify(cacheToSave));

        if (isMounted) {
          setHasUpdate(newer);
        }
      } catch {
        // Silently ignore network / offline errors
      }
    };

    checkUpdate();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!hasUpdate || dismissed) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 text-slate-950 shadow-md border-b border-amber-400/40 font-khmer">
      <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsInstallModalOpen(true)}
          className="flex-1 text-left flex items-center gap-2 cursor-pointer transition active:opacity-80"
        >
          <div className="w-7 h-7 rounded-lg bg-slate-950/90 text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white leading-tight drop-shadow-xs line-clamp-2">
            {tr(
              language,
              'មានកំណែអាប់ដេតថ្មី! ចុចទីនេះដើម្បីទាញយក និងដំឡើងកំណែចុងក្រោយ (មិនបាត់ទិន្នន័យទេ)',
              'New update available! Tap to download & install the latest version (keeps all your data).',
              '发现新版本！点击下载并覆盖安装最新版本（保留所有数据）。'
            )}
          </p>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsInstallModalOpen(true)}
            className="px-2 py-1 rounded-md bg-white text-slate-900 font-extrabold text-[11px] shadow-xs flex items-center gap-1 hover:bg-amber-100 transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3 h-3 text-emerald-700" />
            <span>{tr(language, 'ទាញយក', 'Update', '更新')}</span>
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md text-white/80 hover:text-white hover:bg-black/20 transition cursor-pointer"
            aria-label={tr(language, 'បិទ', 'Dismiss', '关闭')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { APP_BUILD_CODE, APP_VERSION, APP_VERSION_NAME, type AppSettings } from '../types';

export interface NativePlayUpdateInfo {
  playStoreSupported: boolean;
  updateAvailable: boolean;
  updateDownloaded: boolean;
  updateInProgress?: boolean;
  availableVersionCode?: number;
  immediateAllowed?: boolean;
  flexibleAllowed?: boolean;
  currentVersionCode?: number;
  currentVersionName?: string;
  packageName?: string;
  reason?: string;
}

export interface NativeInstallStateEvent {
  installStatus: number;
  bytesDownloaded: number;
  totalBytesToDownload: number;
  isDownloaded: boolean;
  isDownloading: boolean;
  isInstalling: boolean;
}

interface NativeAppUpdateBridge {
  checkForUpdate(): Promise<NativePlayUpdateInfo>;
  startInAppUpdate(options?: {
    mode?: 'immediate' | 'flexible';
    playStoreUrl?: string;
    autoComplete?: boolean;
  }): Promise<{ started: boolean; method: string }>;
  completeUpdate(): Promise<{ completed: boolean; reason?: string }>;
  openPlayStore(options?: { playStoreUrl?: string }): Promise<{ opened: boolean }>;
  addListener(
    eventName: 'installStateChange',
    listenerFunc: (event: NativeInstallStateEvent) => void
  ): Promise<PluginListenerHandle>;
}

const NativeAppUpdate = registerPlugin<NativeAppUpdateBridge>('NativeAppUpdate');

const OFFICIAL_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.khmerfood.tourism';
const REMOTE_MANIFEST_URL = 'https://igpubinfo-max.github.io/Khmer-Food-Tourism/version.json';
const SNOOZE_STORAGE_KEY = 'kft_snoozed_app_update_v1';
const SNOOZE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

export const CHECK_APP_UPDATE_EVENT = 'kft:check-app-update';

export interface RemoteVersionManifest {
  version?: string;
  versionName?: string;
  buildCode?: number;
  releasedAt?: string;
  playStoreUrl?: string;
  releaseNotesKh?: string;
  releaseNotesEn?: string;
  forceUpdate?: boolean;
}

export interface AppUpdateStatus {
  hasUpdate: boolean;
  currentVersion: string;
  currentBuildCode: number;
  latestVersion: string;
  latestBuildCode: number;
  forceUpdate: boolean;
  releaseNotesKh?: string;
  releaseNotesEn?: string;
  playStoreInAppSupported: boolean;
  updateDownloaded: boolean;
  source: 'play_store' | 'remote_manifest' | 'cloud_settings' | 'none';
}

function normalizeSemver(raw?: string): number[] {
  if (!raw) return [0, 0, 0];
  const cleaned = String(raw).trim().replace(/^v/i, '').split('-')[0];
  const parts = cleaned.split('.').map((n) => parseInt(n, 10));
  return [
    Number.isFinite(parts[0]) ? parts[0] : 0,
    Number.isFinite(parts[1]) ? parts[1] : 0,
    Number.isFinite(parts[2]) ? parts[2] : 0,
  ];
}

export function compareSemver(a?: string, b?: string): number {
  const pa = normalizeSemver(a);
  const pb = normalizeSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 5000): Promise<RemoteVersionManifest | null> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const sep = url.includes('?') ? '&' : '?';
    const bustUrl = `${url}${sep}_t=${Date.now()}`;
    const res = await fetch(bustUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
      signal: controller?.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data === 'object') {
      return data as RemoteVersionManifest;
    }
    return null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchRemoteVersionManifest(): Promise<RemoteVersionManifest | null> {
  const isNative = Capacitor.isNativePlatform();
  if (!isNative && typeof window !== 'undefined') {
    // On Web / PWA, check same-origin deployed version.json first
    const localRel = await fetchJsonWithTimeout('./version.json', 4500);
    if (localRel && (localRel.buildCode || localRel.versionName || localRel.version)) {
      return localRel;
    }
  }
  // Check official live GitHub Pages deployment manifest
  return fetchJsonWithTimeout(REMOTE_MANIFEST_URL, 5000);
}

async function checkNativePlayStoreUpdate(): Promise<NativePlayUpdateInfo | null> {
  if (Capacitor.getPlatform() !== 'android') {
    return null;
  }
  try {
    const info = await NativeAppUpdate.checkForUpdate();
    return info || null;
  } catch {
    return null;
  }
}

/**
 * Checks all authoritative live update channels (Google Play In-App Updates API,
 * deployed `version.json` manifest, and Cloud `AppSettings`) without blocking UI.
 */
export async function checkLiveAppUpdate(appSettings?: Partial<AppSettings> | null): Promise<AppUpdateStatus> {
  const currentBuildCode = APP_BUILD_CODE;
  const currentVersion = APP_VERSION;

  const [playInfo, manifest] = await Promise.all([
    checkNativePlayStoreUpdate(),
    fetchRemoteVersionManifest(),
  ]);

  let latestBuildCode = currentBuildCode;
  let latestVersion = currentVersion;
  let hasUpdate = false;
  let source: AppUpdateStatus['source'] = 'none';
  let forceUpdate = Boolean(appSettings?.forceAppUpdate);
  let releaseNotesKh = appSettings?.updateReleaseNotesKh;
  let releaseNotesEn = appSettings?.updateReleaseNotesEn;

  // 1. Check Cloud AppSettings (Admin-published version metadata)
  const cloudBuild = Number(appSettings?.latestAppBuildCode || 0);
  const cloudVer = appSettings?.latestAppVersion?.trim();
  if (cloudBuild > latestBuildCode || (cloudVer && compareSemver(cloudVer, APP_VERSION_NAME) > 0)) {
    hasUpdate = true;
    source = 'cloud_settings';
    if (cloudBuild > latestBuildCode) latestBuildCode = cloudBuild;
    if (cloudVer) latestVersion = cloudVer.startsWith('v') ? cloudVer : `v${cloudVer}`;
  }

  // 2. Check Live Remote Manifest (`version.json`)
  if (manifest) {
    const remoteBuild = Number(manifest.buildCode || 0);
    const remoteVerRaw = (manifest.versionName || manifest.version || '').trim();
    if (remoteBuild > latestBuildCode || (remoteVerRaw && compareSemver(remoteVerRaw, APP_VERSION_NAME) > 0)) {
      hasUpdate = true;
      source = 'remote_manifest';
      if (remoteBuild > latestBuildCode) latestBuildCode = remoteBuild;
      if (remoteVerRaw) {
        latestVersion = remoteVerRaw.startsWith('v') ? remoteVerRaw : `v${remoteVerRaw}`;
      }
    }
    if (manifest.forceUpdate) forceUpdate = true;
    if (!releaseNotesKh && manifest.releaseNotesKh) releaseNotesKh = manifest.releaseNotesKh;
    if (!releaseNotesEn && manifest.releaseNotesEn) releaseNotesEn = manifest.releaseNotesEn;
  }

  // 3. Check Official Google Play Store In-App Update API (Android)
  const playAvailableVc = Number(playInfo?.availableVersionCode || 0);
  if (playInfo && (playInfo.updateAvailable || playInfo.updateDownloaded || playAvailableVc > currentBuildCode)) {
    hasUpdate = true;
    source = 'play_store';
    if (playAvailableVc > latestBuildCode) {
      latestBuildCode = playAvailableVc;
    }
  }

  return {
    hasUpdate,
    currentVersion,
    currentBuildCode,
    latestVersion,
    latestBuildCode,
    forceUpdate,
    releaseNotesKh,
    releaseNotesEn,
    playStoreInAppSupported: Boolean(playInfo?.playStoreSupported),
    updateDownloaded: Boolean(playInfo?.updateDownloaded),
    source,
  };
}

/**
 * Subscribe to native Google Play In-App Update download progress (Android).
 */
export async function subscribeToInstallState(
  cb: (event: NativeInstallStateEvent) => void
): Promise<(() => void) | null> {
  if (Capacitor.getPlatform() !== 'android') return null;
  try {
    const handle = await NativeAppUpdate.addListener('installStateChange', cb);
    return () => {
      handle.remove().catch(() => {});
    };
  } catch {
    return null;
  }
}

/**
 * Triggers automatic update for the user's current platform:
 * - Android: Launches official Google Play In-App Update (`IMMEDIATE` / `FLEXIBLE` with auto-complete),
 *   falling back cleanly to the app's official Google Play Store Update screen.
 * - iOS: Opens the official App Store page.
 * - Web / PWA: Clears stale Service Worker & Cache Storage (strictly preserving `localStorage` account & VIP data)
 *   and reloads into the new build immediately.
 */
export async function triggerAutoAppUpdate(
  latestBuildCode?: number,
  appSettings?: Partial<AppSettings> | null
): Promise<void> {
  const platform = Capacitor.getPlatform();
  const playStoreUrl = appSettings?.playStoreUrl || OFFICIAL_PLAY_STORE_URL;

  if (platform === 'android') {
    try {
      await NativeAppUpdate.startInAppUpdate({
        mode: 'immediate',
        playStoreUrl,
        autoComplete: true,
      });
      return;
    } catch {
      try {
        await NativeAppUpdate.openPlayStore({ playStoreUrl });
        return;
      } catch {
        window.open(playStoreUrl, '_blank', 'noopener,noreferrer');
        return;
      }
    }
  }

  if (platform === 'ios') {
    const iosUrl = appSettings?.iosAppStoreUrl || appSettings?.appStoreUrl || playStoreUrl;
    window.open(iosUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // Web / PWA: Clear stale Service Worker & HTTP Cache Storage (preserving localStorage user & VIP state!) and reload
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister().catch(() => false)));
    }
  } catch {}

  try {
    if (typeof caches !== 'undefined' && caches.keys) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name).catch(() => false)));
    }
  } catch {}

  try {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('v', String(latestBuildCode || Date.now()));
    window.location.replace(nextUrl.toString());
  } catch {
    window.location.reload();
  }
}

export function isUpdateSnoozed(buildCode: number): boolean {
  if (!buildCode || buildCode <= APP_BUILD_CODE) return false;
  try {
    const raw = localStorage.getItem(SNOOZE_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { buildCode?: number; untilMs?: number };
    if (parsed && parsed.buildCode === buildCode && Number(parsed.untilMs || 0) > Date.now()) {
      return true;
    }
  } catch {}
  return false;
}

export function snoozeUpdateAlert(buildCode: number): void {
  try {
    localStorage.setItem(
      SNOOZE_STORAGE_KEY,
      JSON.stringify({
        buildCode,
        untilMs: Date.now() + SNOOZE_DURATION_MS,
      })
    );
  } catch {}
}

export function clearUpdateSnooze(): void {
  try {
    localStorage.removeItem(SNOOZE_STORAGE_KEY);
  } catch {}
}

export function requestManualUpdateCheck(): void {
  clearUpdateSnooze();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHECK_APP_UPDATE_EVENT, { detail: { manual: true } }));
  }
}

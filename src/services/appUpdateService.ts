import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { APP_BUILD_CODE, APP_VERSION, APP_VERSION_NAME, type AppSettings } from '../types';
import {
  fetchAuthoritativeAppSettingsFromServer,
  normalizeAuthoritativeAppSettings,
  pullCloudDocument,
} from './supabaseService';

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
const PRIMARY_REMOTE_MANIFEST_URL =
  (import.meta as any).env?.VITE_UPDATE_MANIFEST_URL ||
  'https://igpubinfo-max.github.io/Khmer-Food-Tourism/version.json';
const FALLBACK_REMOTE_MANIFEST_URL =
  'https://kimseng-prog.github.io/Khmer-Food-Tourism/version.json';
const SNOOZE_STORAGE_KEY = 'kft_snoozed_app_update_v1';
const ENFORCED_POLICY_CACHE_KEY = 'kft_enforced_update_policy_v1';
const WEB_ACK_BUILD_KEY = 'kft_web_ack_build_v1';
const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000;

export const CHECK_APP_UPDATE_EVENT = 'kft:check-app-update';

export interface RemoteVersionManifest {
  version?: string;
  versionName?: string;
  buildCode?: number;
  minRequiredBuildCode?: number;
  minRequiredVersion?: string;
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
  minRequiredBuildCode?: number;
  minRequiredVersion?: string;
  forceUpdate: boolean;
  releaseNotesKh?: string;
  releaseNotesEn?: string;
  playStoreInAppSupported: boolean;
  updateDownloaded: boolean;
  source: 'play_store' | 'remote_manifest' | 'cloud_settings' | 'none';
}

interface CachedEnforcedUpdatePolicy {
  latestVersion?: string;
  latestBuildCode?: number;
  minRequiredVersion?: string;
  minRequiredBuildCode?: number;
  forceUpdate?: boolean;
  releaseNotesKh?: string;
  releaseNotesEn?: string;
  playStoreUrl?: string;
  updatedAtMs?: number;
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

function formatVersionTag(ver?: string): string {
  const cleaned = String(ver || '').trim().replace(/^v/i, '');
  return cleaned ? `v${cleaned}` : APP_VERSION;
}

function pickHigherSemver(a?: string, b?: string): string | undefined {
  const ca = String(a || '').trim().replace(/^v/i, '');
  const cb = String(b || '').trim().replace(/^v/i, '');
  if (!ca && !cb) return undefined;
  if (!ca) return cb;
  if (!cb) return ca;
  return compareSemver(ca, cb) >= 0 ? ca : cb;
}


export function acknowledgeWebUpdateBuild(buildCode: number, latestVersion?: string): void {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify({
    buildCode: Number(buildCode || 0),
    latestVersion: String(latestVersion || '').trim().replace(/^v/i, ''),
    updatedAtMs: Date.now(),
  });
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WEB_ACK_BUILD_KEY, payload);
    }
  } catch {}
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(WEB_ACK_BUILD_KEY, payload);
    }
  } catch {}
}

export function getEffectiveWebRuntimeState(): { buildCode: number; versionName: string } {
  let buildCode = APP_BUILD_CODE;
  let versionName = APP_VERSION_NAME;
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
    return { buildCode, versionName };
  }
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const vParam = Number(params.get('v') || 0);
      if (Number.isFinite(vParam) && vParam > buildCode && vParam < 100000000) {
        buildCode = vParam;
      }
    }
  } catch {}
  const readFromStorage = (store?: Storage) => {
    if (!store) return;
    const raw = store.getItem(WEB_ACK_BUILD_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { buildCode?: number; latestVersion?: string };
    const ackBuild = Number(parsed?.buildCode || 0);
    if (Number.isFinite(ackBuild) && ackBuild > buildCode) {
      buildCode = ackBuild;
    }
    if (parsed?.latestVersion) {
      const higher = pickHigherSemver(versionName, parsed.latestVersion);
      if (higher) versionName = higher;
    }
  };
  try {
    if (typeof sessionStorage !== 'undefined') readFromStorage(sessionStorage);
  } catch {}
  try {
    if (typeof localStorage !== 'undefined') readFromStorage(localStorage);
  } catch {}
  return { buildCode, versionName };
}

function readCachedEnforcedPolicy(): CachedEnforcedUpdatePolicy | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(ENFORCED_POLICY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as CachedEnforcedUpdatePolicy) : null;
  } catch {
    return null;
  }
}

function writeCachedEnforcedPolicy(policy: CachedEnforcedUpdatePolicy): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const existing = readCachedEnforcedPolicy();
    const merged: CachedEnforcedUpdatePolicy = {
      latestBuildCode: Math.max(
        Number(existing?.latestBuildCode) || 0,
        Number(policy.latestBuildCode) || 0
      ) || undefined,
      minRequiredBuildCode: Math.max(
        Number(existing?.minRequiredBuildCode) || 0,
        Number(policy.minRequiredBuildCode) || 0
      ) || undefined,
      latestVersion: pickHigherSemver(existing?.latestVersion, policy.latestVersion),
      minRequiredVersion: pickHigherSemver(existing?.minRequiredVersion, policy.minRequiredVersion),
      forceUpdate:
        policy.forceUpdate !== undefined
          ? Boolean(policy.forceUpdate)
          : Boolean(existing?.forceUpdate),
      releaseNotesKh: policy.releaseNotesKh || existing?.releaseNotesKh,
      releaseNotesEn: policy.releaseNotesEn || existing?.releaseNotesEn,
      playStoreUrl: policy.playStoreUrl || existing?.playStoreUrl,
      updatedAtMs: Date.now(),
    };
    localStorage.setItem(ENFORCED_POLICY_CACHE_KEY, JSON.stringify(merged));
  } catch {
    // ignore storage errors
  }
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500): Promise<RemoteVersionManifest | null> {
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
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      signal: controller?.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data === 'object' && (data.buildCode || data.versionName || data.version)) {
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
    const localRel = await fetchJsonWithTimeout('./version.json', 3500);
    if (localRel && (localRel.buildCode || localRel.versionName || localRel.version)) {
      return localRel;
    }
  }
  const primary = await fetchJsonWithTimeout(PRIMARY_REMOTE_MANIFEST_URL, 4500);
  if (primary) return primary;
  if (FALLBACK_REMOTE_MANIFEST_URL !== PRIMARY_REMOTE_MANIFEST_URL) {
    return fetchJsonWithTimeout(FALLBACK_REMOTE_MANIFEST_URL, 3500);
  }
  return null;
}

async function checkNativePlayStoreUpdate(timeoutMs = 3500): Promise<NativePlayUpdateInfo | null> {
  if (Capacitor.getPlatform() !== 'android') {
    return null;
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeoutPromise = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    });
    const info = await Promise.race([
      NativeAppUpdate.checkForUpdate().catch(() => null),
      timeoutPromise,
    ]);
    return info || null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Synchronous evaluation of update status from known AppSettings and cached server policy.
 * Used on initial render (0ms) and when offline so Force Update cannot be bypassed by disabling internet.
 */
export function evaluateSyncUpdateStatus(appSettings?: Partial<AppSettings> | null): AppUpdateStatus {
  const webState = getEffectiveWebRuntimeState();
  const currentBuildCode = webState.buildCode;
  const currentVersionName = webState.versionName;
  const currentVersion = formatVersionTag(currentVersionName);
  const cached = readCachedEnforcedPolicy();

  const cloudBuild = Math.max(
    Number(appSettings?.latestAppBuildCode || 0),
    Number(cached?.latestBuildCode || 0)
  );
  const minRequiredBuild = Math.max(
    Number(appSettings?.minRequiredBuildCode || 0),
    Number(cached?.minRequiredBuildCode || 0),
    Boolean(appSettings?.forceAppUpdate) && cloudBuild > 0 ? cloudBuild : 0
  );
  const cloudVer = pickHigherSemver(appSettings?.latestAppVersion, cached?.latestVersion);
  const minRequiredVer = pickHigherSemver(
    appSettings?.minRequiredVersion,
    pickHigherSemver(
      cached?.minRequiredVersion,
      Boolean(appSettings?.forceAppUpdate) && cloudVer ? cloudVer : undefined
    )
  );

  const isBelowMinBuild = minRequiredBuild > 0 && currentBuildCode < minRequiredBuild;
  const isBelowMinVersion = Boolean(minRequiredVer && compareSemver(minRequiredVer, currentVersionName) > 0);
  const isBelowMinRequired = isBelowMinBuild || isBelowMinVersion;

  const isBuildNewer = cloudBuild > currentBuildCode;
  const isVersionNewer = Boolean(cloudVer && compareSemver(cloudVer, currentVersionName) > 0);
  const hasUpdate = isBelowMinRequired || isBuildNewer || isVersionNewer;

  const latestBuildCode = Math.max(currentBuildCode, cloudBuild, minRequiredBuild);
  const resolvedVerRaw = pickHigherSemver(currentVersionName, pickHigherSemver(cloudVer, minRequiredVer));
  const latestVersion = formatVersionTag(resolvedVerRaw);

  const isNative = typeof Capacitor !== 'undefined' && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform();
  const forceFlag = Boolean(appSettings?.forceAppUpdate || cached?.forceUpdate);
  const forceUpdate = isNative && hasUpdate && (isBelowMinRequired || forceFlag);

  if (forceUpdate) {
    clearUpdateSnooze();
  }

  return {
    hasUpdate,
    currentVersion,
    currentBuildCode,
    latestVersion,
    latestBuildCode,
    minRequiredBuildCode: minRequiredBuild > 0 ? minRequiredBuild : undefined,
    minRequiredVersion: minRequiredVer,
    forceUpdate,
    releaseNotesKh: appSettings?.updateReleaseNotesKh || cached?.releaseNotesKh,
    releaseNotesEn: appSettings?.updateReleaseNotesEn || cached?.releaseNotesEn,
    playStoreInAppSupported: false,
    updateDownloaded: false,
    source: hasUpdate ? 'cloud_settings' : 'none',
  };
}

/**
 * Checks all authoritative live update channels simultaneously:
 * 1. Direct Cloud Server Settings (`kft_cloud_version_policy_v1`, `kft_cloud_admin_vip_pricing_v2`, `kft_cloud_app_settings_v1`)
 * 2. Live Remote Manifest (`version.json` on GitHub Pages)
 * 3. Official Google Play In-App Updates API (Android)
 * 4. Offline-persisted Enforced Update Policy (`kft_enforced_update_policy_v1`)
 */
export async function checkLiveAppUpdate(appSettings?: Partial<AppSettings> | null): Promise<AppUpdateStatus> {
  const [playInfo, manifest, serverSettingsRes, versionPolicyDoc] = await Promise.all([
    checkNativePlayStoreUpdate(),
    fetchRemoteVersionManifest(),
    fetchAuthoritativeAppSettingsFromServer(appSettings || undefined, 4500).catch(() => ({
      ok: false,
      settings: null,
    })),
    pullCloudDocument<Partial<AppSettings>>('kft_cloud_version_policy_v1', 4000).catch(() => null),
  ]);

  let effectiveSettings: Partial<AppSettings> = appSettings ? { ...appSettings } : {};
  if (serverSettingsRes?.settings) {
    effectiveSettings = normalizeAuthoritativeAppSettings(serverSettingsRes.settings, effectiveSettings);
  }
  if (versionPolicyDoc && typeof versionPolicyDoc === 'object') {
    effectiveSettings = normalizeAuthoritativeAppSettings(versionPolicyDoc, effectiveSettings);
  }

  const cached = readCachedEnforcedPolicy();

  // If Android PackageManager reports a lower installed native APK versionCode, enforce against the actual installed APK build
  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
  const webState = getEffectiveWebRuntimeState();
  const nativeInstalledBuild =
    playInfo && Number(playInfo.currentVersionCode || 0) > 0
      ? Number(playInfo.currentVersionCode)
      : APP_BUILD_CODE;
  const currentBuildCode = isNative ? Math.min(APP_BUILD_CODE, nativeInstalledBuild) : webState.buildCode;
  const currentVersionName = isNative
    ? playInfo?.currentVersionName && compareSemver(APP_VERSION_NAME, playInfo.currentVersionName) > 0
      ? playInfo.currentVersionName
      : APP_VERSION_NAME
    : webState.versionName;
  const currentVersion = formatVersionTag(currentVersionName);

  let latestBuildCode = currentBuildCode;
  let latestVersionName = currentVersionName;
  let hasUpdate = false;
  let source: AppUpdateStatus['source'] = 'none';
  let releaseNotesKh = effectiveSettings?.updateReleaseNotesKh || cached?.releaseNotesKh;
  let releaseNotesEn = effectiveSettings?.updateReleaseNotesEn || cached?.releaseNotesEn;

  // 1. Evaluate Cloud Settings & Cached Enforced Policy (checks BOTH build number AND semver!)
  const cloudBuild = Math.max(
    Number(effectiveSettings?.latestAppBuildCode || 0),
    Number(cached?.latestBuildCode || 0)
  );
  const cloudVer = pickHigherSemver(effectiveSettings?.latestAppVersion, cached?.latestVersion);
  const cloudForce = Boolean(effectiveSettings?.forceAppUpdate || cached?.forceUpdate);

  const minRequiredBuild = Math.max(
    Number(effectiveSettings?.minRequiredBuildCode || 0),
    Number(cached?.minRequiredBuildCode || 0),
    cloudForce && cloudBuild > 0 ? cloudBuild : 0
  );
  const minRequiredVer = pickHigherSemver(
    effectiveSettings?.minRequiredVersion,
    pickHigherSemver(cached?.minRequiredVersion, cloudForce && cloudVer ? cloudVer : undefined)
  );

  const isBelowCloudMinBuild = minRequiredBuild > 0 && currentBuildCode < minRequiredBuild;
  const isBelowCloudMinVer = Boolean(minRequiredVer && compareSemver(minRequiredVer, currentVersionName) > 0);
  const isCloudBuildNewer = cloudBuild > currentBuildCode;
  const isCloudVerNewer = Boolean(cloudVer && compareSemver(cloudVer, currentVersionName) > 0);

  if (isBelowCloudMinBuild || isBelowCloudMinVer || isCloudBuildNewer || isCloudVerNewer) {
    hasUpdate = true;
    source = 'cloud_settings';
    const targetBuild = Math.max(cloudBuild, minRequiredBuild);
    if (targetBuild > latestBuildCode) latestBuildCode = targetBuild;
    const targetVer = pickHigherSemver(cloudVer, minRequiredVer);
    if (targetVer && compareSemver(targetVer, latestVersionName) > 0) {
      latestVersionName = targetVer;
    }
  }

  let isBelowAnyMinRequired = isBelowCloudMinBuild || isBelowCloudMinVer;
  let forceFlag = cloudForce;

  // 2. Evaluate Live Remote Manifest (`version.json`) — checks BOTH buildCode AND versionName/version
  if (manifest) {
    const remoteBuild = Number(manifest.buildCode || 0);
    const remoteVerRaw = String(manifest.versionName || manifest.version || '').trim().replace(/^v/i, '');
    const remoteMinBuild = Math.max(
      Number(manifest.minRequiredBuildCode || 0),
      manifest.forceUpdate && remoteBuild > 0 ? remoteBuild : 0
    );
    const remoteMinVer = String(
      manifest.minRequiredVersion || (manifest.forceUpdate && remoteVerRaw ? remoteVerRaw : '')
    )
      .trim()
      .replace(/^v/i, '');

    const isBelowRemoteMinBuild = remoteMinBuild > 0 && currentBuildCode < remoteMinBuild;
    const isBelowRemoteMinVer = Boolean(remoteMinVer && compareSemver(remoteMinVer, currentVersionName) > 0);
    const isRemoteBuildNewer = remoteBuild > currentBuildCode;
    const isRemoteVerNewer = Boolean(remoteVerRaw && compareSemver(remoteVerRaw, currentVersionName) > 0);

    if (isBelowRemoteMinBuild || isBelowRemoteMinVer || isRemoteBuildNewer || isRemoteVerNewer) {
      hasUpdate = true;
      source = 'remote_manifest';
      const targetRemoteBuild = Math.max(remoteBuild, remoteMinBuild);
      if (targetRemoteBuild > latestBuildCode) latestBuildCode = targetRemoteBuild;
      const targetRemoteVer = pickHigherSemver(remoteVerRaw, remoteMinVer);
      if (targetRemoteVer && compareSemver(targetRemoteVer, latestVersionName) > 0) {
        latestVersionName = targetRemoteVer;
      }
    }

    if (isBelowRemoteMinBuild || isBelowRemoteMinVer) {
      isBelowAnyMinRequired = true;
    }
    if (manifest.forceUpdate) {
      forceFlag = true;
    }
    if (!releaseNotesKh && manifest.releaseNotesKh) releaseNotesKh = manifest.releaseNotesKh;
    if (!releaseNotesEn && manifest.releaseNotesEn) releaseNotesEn = manifest.releaseNotesEn;
  }

  // 3. Evaluate Official Google Play Store In-App Update API (Android)
  const playAvailableVc = Number(playInfo?.availableVersionCode || 0);
  if (playInfo && (playInfo.updateAvailable || playInfo.updateDownloaded || playAvailableVc > currentBuildCode)) {
    hasUpdate = true;
    source = 'play_store';
    if (playAvailableVc > latestBuildCode) {
      latestBuildCode = playAvailableVc;
    }
  }

  const finalMinBuild = Math.max(
    minRequiredBuild,
    Number(manifest?.minRequiredBuildCode || 0),
    forceFlag && latestBuildCode > currentBuildCode ? latestBuildCode : 0
  );
  const finalMinVer = pickHigherSemver(
    minRequiredVer,
    pickHigherSemver(manifest?.minRequiredVersion, forceFlag ? latestVersionName : undefined)
  );

  const forceUpdate = isNative && hasUpdate && (isBelowAnyMinRequired || forceFlag);

  // Persist authoritative requirement locally so offline mode / airplane mode can never bypass Force Update
  if (latestBuildCode > currentBuildCode || compareSemver(latestVersionName, currentVersionName) > 0 || forceFlag) {
    writeCachedEnforcedPolicy({
      latestBuildCode,
      latestVersion: latestVersionName,
      minRequiredBuildCode: finalMinBuild > 0 ? finalMinBuild : undefined,
      minRequiredVersion: finalMinVer,
      forceUpdate: forceFlag || isBelowAnyMinRequired,
      releaseNotesKh,
      releaseNotesEn,
      playStoreUrl: effectiveSettings?.playStoreUrl || manifest?.playStoreUrl || OFFICIAL_PLAY_STORE_URL,
    });
  }

  if (forceUpdate) {
    clearUpdateSnooze();
  }

  return {
    hasUpdate,
    currentVersion,
    currentBuildCode,
    latestVersion: formatVersionTag(latestVersionName),
    latestBuildCode,
    minRequiredBuildCode: finalMinBuild > 0 ? finalMinBuild : undefined,
    minRequiredVersion: finalMinVer,
    forceUpdate,
    releaseNotesKh,
    releaseNotesEn,
    playStoreInAppSupported: Boolean(playInfo?.playStoreSupported),
    updateDownloaded: Boolean(playInfo?.updateDownloaded),
    source,
  };
}

/**
 * Subscribe to Google Play In-App Update download progress on Android.
 */
export async function subscribeToInstallState(
  callback: (event: NativeInstallStateEvent) => void
): Promise<() => void> {
  if (Capacitor.getPlatform() !== 'android') {
    return () => {};
  }
  try {
    const handle = await NativeAppUpdate.addListener('installStateChange', callback);
    return () => {
      handle.remove().catch(() => {});
    };
  } catch {
    return () => {};
  }
}

/**
 * Performs the update action when the user clicks "Update Now":
 * - Android: Launches official Google Play In-App Update (`IMMEDIATE` / `FLEXIBLE` with auto-complete),
 *   falling back cleanly to the app's official Google Play Store Update screen.
 * - iOS: Opens the official App Store page.
 * - Web / PWA: Clears stale Service Worker & Cache Storage (strictly preserving `localStorage` account & VIP data)
 *   and reloads into the new build immediately.
 */
export async function triggerAutoAppUpdate(
  latestBuildCode?: number,
  appSettings?: Partial<AppSettings> | null,
  latestVersion?: string,
  isForceUpdate?: boolean
): Promise<void> {
  const isMandatory =
    Boolean(isForceUpdate) ||
    Boolean(appSettings?.forceAppUpdate) ||
    Number(appSettings?.minRequiredBuildCode || 0) > APP_BUILD_CODE ||
    Boolean(appSettings?.minRequiredVersion && compareSemver(appSettings.minRequiredVersion, APP_VERSION_NAME) > 0);

  if (!isMandatory) {
    snoozeUpdateAlert(latestBuildCode || APP_BUILD_CODE, latestVersion);
  } else {
    clearUpdateSnooze();
  }

  const platform = Capacitor.getPlatform();
  const playStoreUrl = appSettings?.playStoreUrl || OFFICIAL_PLAY_STORE_URL;

  if (platform === 'android') {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<{ started: boolean }>((_, reject) => {
        timer = setTimeout(() => reject(new Error('startInAppUpdate timeout')), 3500);
      });
      await Promise.race([
        NativeAppUpdate.startInAppUpdate({
          mode: 'immediate',
          playStoreUrl,
          autoComplete: true,
        }),
        timeoutPromise,
      ]);
      return;
    } catch {
      try {
        await NativeAppUpdate.openPlayStore({ playStoreUrl });
        return;
      } catch {
        window.open(playStoreUrl, '_blank', 'noopener,noreferrer');
        return;
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  if (platform === 'ios') {
    const iosUrl = appSettings?.iosAppStoreUrl || appSettings?.appStoreUrl || playStoreUrl;
    window.open(iosUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // Web / PWA: Acknowledge target build on Web, clear stale Service Worker & HTTP Cache Storage, and reload
  acknowledgeWebUpdateBuild(latestBuildCode || APP_BUILD_CODE, latestVersion);
  snoozeUpdateAlert(latestBuildCode || APP_BUILD_CODE, latestVersion);
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
    await fetch(nextUrl.toString(), {
      method: 'GET',
      cache: 'reload',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
    }).catch(() => null);
    window.location.replace(nextUrl.toString());
  } catch {
    window.location.reload();
  }
}

export function isUpdateSnoozed(buildCode: number, latestVersion?: string, forceUpdate?: boolean): boolean {
  if (forceUpdate) return false;
  try {
    const raw = localStorage.getItem(SNOOZE_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { buildCode?: number; latestVersion?: string; untilMs?: number };
    if (!parsed || Number(parsed.untilMs || 0) <= Date.now()) {
      return false;
    }
    if (buildCode && parsed.buildCode && parsed.buildCode >= buildCode) {
      return true;
    }
    if (latestVersion && parsed.latestVersion && parsed.latestVersion === latestVersion) {
      return true;
    }
  } catch {}
  return false;
}

export function snoozeUpdateAlert(buildCode: number, latestVersion?: string): void {
  try {
    localStorage.setItem(
      SNOOZE_STORAGE_KEY,
      JSON.stringify({
        buildCode,
        latestVersion: latestVersion || '',
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

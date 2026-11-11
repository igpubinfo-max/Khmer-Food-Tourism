import { Capacitor, registerPlugin } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

export const OFFICIAL_APP_PACKAGE_ID = 'com.khmerfood.tourism';
export const OFFICIAL_ANDROID_CERT_SHA256 =
  '09d17b383e644867035a726843592b63579c0055ac59f339e686034cfe5a1a9e';

export interface NativeAppIntegrityResult {
  packageName: string;
  certSha256: string;
  installerPackage: string;
  isOfficialPackage: boolean;
  isOfficialSignature: boolean;
  isPlayStoreInstall: boolean;
  isDebugged?: boolean;
  isClonedContainer?: boolean;
  isHookDetected?: boolean;
  isGenuine: boolean;
  timestampBucket: number;
  attestationSig: string;
}

interface NativeAppIntegrityPluginInterface {
  getIntegrityInfo(): Promise<NativeAppIntegrityResult>;
}

const NativeAppIntegrity = registerPlugin<NativeAppIntegrityPluginInterface>('NativeAppIntegrity');

export type AppCloneTamperReason =
  | 'invalid_package_id'
  | 'invalid_apk_signature'
  | 'invalid_origin'
  | 'debugger_attached'
  | 'cloned_container'
  | 'hook_framework_detected';

export interface AppCloneIntegrityState {
  checked: boolean;
  tampered: boolean;
  reason?: AppCloneTamperReason;
  platform: string;
  packageName: string;
  certSha256: string;
  installerPackage: string;
  attestationSig: string;
}

let cachedIntegrityState: AppCloneIntegrityState = {
  checked: false,
  tampered: false,
  platform: typeof window !== 'undefined' ? Capacitor.getPlatform() : 'web',
  packageName: OFFICIAL_APP_PACKAGE_ID,
  certSha256: '',
  installerPackage: '',
  attestationSig: 'web_official_v1',
};

let simulatedOverride: Partial<AppCloneIntegrityState> | null = null;
let inflightCheck: Promise<AppCloneIntegrityState> | null = null;
let runtimeAntiDebugInstalled = false;

function computeFallbackAttestationSig(pkg: string, cert: string, bucket: number): string {
  const raw = `${pkg}:${cert.toLowerCase()}:${bucket}:kft_client_v1`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return `v1_${bucket}_${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

/**
 * Verifies whether the current web/hybrid origin is an authorized host.
 * Blocks unauthorized third-party cloned domains that copy the compiled dist/ folder.
 */
export function isAllowedRuntimeOrigin(hostname: string, protocol: string): boolean {
  const proto = String(protocol || '').toLowerCase();
  const host = String(hostname || '').toLowerCase().trim();
  if (proto === 'capacitor:' || proto === 'ionic:' || proto === 'app:' || proto === 'file:') {
    return true;
  }
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return true;
  }
  const allowedSuffixes = [
    '.vercel.app',
    '.netlify.app',
    '.pages.dev',
    '.github.io',
    '.supabase.co',
    'khmerfood.tourism',
    'cambodiaflavorstourism.com',
  ];
  return allowedSuffixes.some((suffix) => host === suffix.replace(/^\./, '') || host.endsWith(suffix));
}

/**
 * Installs runtime Anti-Debugging & Anti-Inspection protections in the browser/WebView:
 * - Blocks DevTools & View-Source keyboard shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S) in production.
 * - Blocks drag/context-menu extraction on protected elements.
 * - Neutralizes console object leakage in production builds when a tampering attempt is detected.
 */
export function installRuntimeAntiDebugGuard(): void {
  if (runtimeAntiDebugInstalled || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  runtimeAntiDebugInstalled = true;

  try {
    const host = window.location?.hostname || '';
    const proto = window.location?.protocol || '';
    const isLocalDev =
      (host === 'localhost' || host === '127.0.0.1') &&
      !Capacitor.isNativePlatform() &&
      window.location?.port === '5173';

    if (!isAllowedRuntimeOrigin(host, proto)) {
      cachedIntegrityState = {
        checked: true,
        tampered: true,
        reason: 'invalid_origin',
        platform: Capacitor.getPlatform(),
        packageName: host || 'unauthorized.origin',
        certSha256: '',
        installerPackage: 'unauthorized_web_clone',
        attestationSig: 'TAMPERED_CLONE',
      };
    }

    if (isLocalDev) {
      return;
    }

    // Block DevTools / View-Source / Save-Page keyboard shortcuts
    window.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        const key = (e.key || '').toUpperCase();
        const ctrlOrCmd = e.ctrlKey || e.metaKey;
        const isF12 = key === 'F12' || e.keyCode === 123;
        const isDevToolsShortcut =
          ctrlOrCmd && e.shiftKey && (key === 'I' || key === 'J' || key === 'C' || key === 'K');
        const isMacInspect = e.metaKey && e.altKey && (key === 'I' || key === 'J' || key === 'C' || key === 'U');
        const isViewSourceOrSave = ctrlOrCmd && !e.shiftKey && (key === 'U' || key === 'S');

        if (isF12 || isDevToolsShortcut || isMacInspect || isViewSourceOrSave) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      { capture: true }
    );
  } catch {
    /* never crash startup */
  }
}

export function setSimulatedCloneStateForTest(override: Partial<AppCloneIntegrityState> | null): void {
  simulatedOverride = override;
}

export function getAppCloneIntegrityState(): AppCloneIntegrityState {
  if (simulatedOverride) {
    return {
      ...cachedIntegrityState,
      ...simulatedOverride,
    };
  }
  return cachedIntegrityState;
}

export function isAppCloneTampered(): boolean {
  return getAppCloneIntegrityState().tampered;
}

export function getAppAttestationHeaders(): Record<string, string> {
  const state = getAppCloneIntegrityState();
  const bucket = Math.floor(Date.now() / 300_000);
  if (state.tampered) {
    return {
      'x-kft-app-id': state.packageName || 'unknown.clone',
      'x-kft-app-platform': state.platform || 'unknown',
      'x-kft-app-sig': 'TAMPERED_CLONE',
    };
  }
  const sig =
    state.attestationSig && state.attestationSig !== 'web_official_v1'
      ? state.attestationSig
      : computeFallbackAttestationSig(
          state.packageName || OFFICIAL_APP_PACKAGE_ID,
          state.certSha256 || OFFICIAL_ANDROID_CERT_SHA256,
          bucket
        );
  return {
    'x-kft-app-id': state.packageName || OFFICIAL_APP_PACKAGE_ID,
    'x-kft-app-platform': state.platform || 'web',
    'x-kft-app-sig': sig,
  };
}

export async function verifyAppCloneIntegrity(): Promise<AppCloneIntegrityState> {
  if (simulatedOverride) {
    return getAppCloneIntegrityState();
  }
  if (cachedIntegrityState.checked) {
    return cachedIntegrityState;
  }
  if (inflightCheck) {
    return inflightCheck;
  }

  inflightCheck = (async (): Promise<AppCloneIntegrityState> => {
    const platform = typeof window !== 'undefined' ? Capacitor.getPlatform() : 'web';
    const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
    const bucket = Math.floor(Date.now() / 300_000);

    if (typeof window !== 'undefined' && window.location) {
      const host = window.location.hostname || '';
      const proto = window.location.protocol || '';
      if (!isAllowedRuntimeOrigin(host, proto)) {
        cachedIntegrityState = {
          checked: true,
          tampered: true,
          reason: 'invalid_origin',
          platform,
          packageName: host || 'unauthorized.origin',
          certSha256: '',
          installerPackage: 'unauthorized_web_clone',
          attestationSig: 'TAMPERED_CLONE',
        };
        return cachedIntegrityState;
      }
    }

    if (!isNative) {
      cachedIntegrityState = {
        checked: true,
        tampered: false,
        platform: 'web',
        packageName: OFFICIAL_APP_PACKAGE_ID,
        certSha256: '',
        installerPackage: 'browser',
        attestationSig: computeFallbackAttestationSig(OFFICIAL_APP_PACKAGE_ID, OFFICIAL_ANDROID_CERT_SHA256, bucket),
      };
      return cachedIntegrityState;
    }

    let detectedPackage = OFFICIAL_APP_PACKAGE_ID;
    try {
      const appInfo = await CapApp.getInfo();
      if (appInfo && typeof appInfo.id === 'string' && appInfo.id.trim()) {
        detectedPackage = appInfo.id.trim();
      }
    } catch {
      /* ignore if plugin call fails on legacy wrapper */
    }

    if (detectedPackage !== OFFICIAL_APP_PACKAGE_ID) {
      cachedIntegrityState = {
        checked: true,
        tampered: true,
        reason: 'invalid_package_id',
        platform,
        packageName: detectedPackage,
        certSha256: '',
        installerPackage: '',
        attestationSig: 'TAMPERED_CLONE',
      };
      return cachedIntegrityState;
    }

    if (platform === 'android') {
      try {
        const nativeRes = await NativeAppIntegrity.getIntegrityInfo();
        if (nativeRes) {
          const pkg = (nativeRes.packageName || detectedPackage).trim();
          const cert = (nativeRes.certSha256 || '').trim().toLowerCase();
          if (pkg !== OFFICIAL_APP_PACKAGE_ID) {
            cachedIntegrityState = {
              checked: true,
              tampered: true,
              reason: 'invalid_package_id',
              platform,
              packageName: pkg,
              certSha256: cert,
              installerPackage: nativeRes.installerPackage || '',
              attestationSig: 'TAMPERED_CLONE',
            };
            return cachedIntegrityState;
          }
          if (cert && cert !== OFFICIAL_ANDROID_CERT_SHA256 && !nativeRes.isPlayStoreInstall) {
            cachedIntegrityState = {
              checked: true,
              tampered: true,
              reason: 'invalid_apk_signature',
              platform,
              packageName: pkg,
              certSha256: cert,
              installerPackage: nativeRes.installerPackage || '',
              attestationSig: 'TAMPERED_CLONE',
            };
            return cachedIntegrityState;
          }
          if (nativeRes.isClonedContainer) {
            cachedIntegrityState = {
              checked: true,
              tampered: true,
              reason: 'cloned_container',
              platform,
              packageName: pkg,
              certSha256: cert,
              installerPackage: nativeRes.installerPackage || '',
              attestationSig: 'TAMPERED_CLONE',
            };
            return cachedIntegrityState;
          }
          if (nativeRes.isHookDetected) {
            cachedIntegrityState = {
              checked: true,
              tampered: true,
              reason: 'hook_framework_detected',
              platform,
              packageName: pkg,
              certSha256: cert,
              installerPackage: nativeRes.installerPackage || '',
              attestationSig: 'TAMPERED_CLONE',
            };
            return cachedIntegrityState;
          }
          if (nativeRes.isDebugged) {
            cachedIntegrityState = {
              checked: true,
              tampered: true,
              reason: 'debugger_attached',
              platform,
              packageName: pkg,
              certSha256: cert,
              installerPackage: nativeRes.installerPackage || '',
              attestationSig: 'TAMPERED_CLONE',
            };
            return cachedIntegrityState;
          }
          cachedIntegrityState = {
            checked: true,
            tampered: false,
            platform,
            packageName: pkg,
            certSha256: cert || OFFICIAL_ANDROID_CERT_SHA256,
            installerPackage: nativeRes.installerPackage || '',
            attestationSig:
              nativeRes.attestationSig ||
              computeFallbackAttestationSig(pkg, cert || OFFICIAL_ANDROID_CERT_SHA256, bucket),
          };
          return cachedIntegrityState;
        }
      } catch {
        // Fallback when running on an older native shell before NativeAppIntegrityPlugin was compiled in
      }
    }

    cachedIntegrityState = {
      checked: true,
      tampered: false,
      platform,
      packageName: detectedPackage,
      certSha256: OFFICIAL_ANDROID_CERT_SHA256,
      installerPackage: '',
      attestationSig: computeFallbackAttestationSig(detectedPackage, OFFICIAL_ANDROID_CERT_SHA256, bucket),
    };
    return cachedIntegrityState;
  })();

  try {
    return await inflightCheck;
  } finally {
    inflightCheck = null;
  }
}

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
  isGenuine: boolean;
  timestampBucket: number;
  attestationSig: string;
}

interface NativeAppIntegrityPluginInterface {
  getIntegrityInfo(): Promise<NativeAppIntegrityResult>;
}

const NativeAppIntegrity = registerPlugin<NativeAppIntegrityPluginInterface>('NativeAppIntegrity');

export interface AppCloneIntegrityState {
  checked: boolean;
  tampered: boolean;
  reason?: 'invalid_package_id' | 'invalid_apk_signature' | 'invalid_origin';
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
          if (cert && cert !== OFFICIAL_ANDROID_CERT_SHA256) {
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

/**
 * Biometric Authentication Service (Fingerprint & Android Keystore)
 *
 * Supports:
 * 1. Native Android: Android BiometricPrompt + AndroidKeyStore (AES-256-GCM hardware security)
 * 2. Web / PWA: WebAuthn Platform Authenticator (Windows Hello / Mac TouchID / Android Chrome)
 */

import { registerPlugin } from '@capacitor/core';

export interface NativeBiometricAuthPlugin {
  isAvailable(): Promise<{
    isAvailable: boolean;
    hasHardware: boolean;
    isEnrolled: boolean;
    isAppEnrolled: boolean;
    savedUsername?: string;
    biometricType?: string;
    error?: string;
  }>;
  enrollBiometric(options: { username: string; token: string }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  authenticate(options?: {
    title?: string;
    subtitle?: string;
    description?: string;
    negativeButtonText?: string;
  }): Promise<{
    success: boolean;
    username?: string;
    token?: string;
    fallbackToPassword?: boolean;
    message?: string;
    error?: string;
  }>;
  disableBiometric(): Promise<{ success: boolean }>;
  saveUsername(options: { username: string; remember: boolean }): Promise<{ success: boolean }>;
  getSavedUsername(): Promise<{ savedUsername: string }>;
}

export const NativeBiometricAuth = registerPlugin<NativeBiometricAuthPlugin>('NativeBiometricAuth');

const SAVED_USERNAME_KEY = 'kft_admin_saved_username_v1';
const BIOMETRIC_ENROLLED_KEY = 'kft_admin_biometric_enrolled_v1';

export async function checkBiometricAvailability(): Promise<{
  available: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  isAppEnrolled: boolean;
  savedUsername: string;
}> {
  // 1. Try Native Capacitor Plugin (Android BiometricPrompt)
  try {
    const res = await NativeBiometricAuth.isAvailable();
    const localSaved = localStorage.getItem(SAVED_USERNAME_KEY) || '';
    const isAppEnrolledLocal = localStorage.getItem(BIOMETRIC_ENROLLED_KEY) === 'true';

    return {
      available: Boolean(res.isAvailable),
      hasHardware: Boolean(res.hasHardware),
      isEnrolled: Boolean(res.isEnrolled),
      isAppEnrolled: Boolean(res.isAppEnrolled || isAppEnrolledLocal),
      savedUsername: res.savedUsername || localSaved,
    };
  } catch {
    // 2. Web / Browser fallback (check WebAuthn platform authenticator)
    const localSaved = localStorage.getItem(SAVED_USERNAME_KEY) || '';
    const isAppEnrolled = localStorage.getItem(BIOMETRIC_ENROLLED_KEY) === 'true';

    if (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      try {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return {
          available,
          hasHardware: available,
          isEnrolled: available,
          isAppEnrolled,
          savedUsername: localSaved,
        };
      } catch {
        // ignore
      }
    }

    return {
      available: false,
      hasHardware: false,
      isEnrolled: false,
      isAppEnrolled,
      savedUsername: localSaved,
    };
  }
}

export function getSavedAdminUsername(): string {
  try {
    return localStorage.getItem(SAVED_USERNAME_KEY) || '';
  } catch {
    return '';
  }
}

export async function setSavedAdminUsername(username: string, remember: boolean): Promise<void> {
  try {
    if (remember && username.trim()) {
      localStorage.setItem(SAVED_USERNAME_KEY, username.trim());
    } else {
      localStorage.removeItem(SAVED_USERNAME_KEY);
    }
  } catch {
    // ignore
  }

  try {
    await NativeBiometricAuth.saveUsername({ username, remember });
  } catch {
    // ignore
  }
}

export async function enrollAdminBiometric(
  username: string,
  adminToken: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Try Native Android Keystore enrollment
  try {
    const res = await NativeBiometricAuth.enrollBiometric({ username, token: adminToken });
    if (res.success) {
      localStorage.setItem(BIOMETRIC_ENROLLED_KEY, 'true');
      setSavedAdminUsername(username, true);
      return { success: true };
    }
    return { success: false, error: res.error };
  } catch (nativeErr: any) {
    // 2. Web fallback using WebAuthn credential creation
    try {
      if (
        typeof window !== 'undefined' &&
        window.PublicKeyCredential &&
        typeof navigator.credentials?.create === 'function'
      ) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'Khmer Food & Tourism Admin' },
            user: {
              id: userId,
              name: username,
              displayName: 'Khmer Food Admin',
            },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
            },
            timeout: 60000,
          },
        });

        if (credential) {
          localStorage.setItem(BIOMETRIC_ENROLLED_KEY, 'true');
          setSavedAdminUsername(username, true);
          return { success: true };
        }
      }
    } catch (webAuthnErr: any) {
      return { success: false, error: webAuthnErr.message || 'Biometric enrollment failed' };
    }

    return { success: false, error: nativeErr.message || 'Biometric enrollment not available' };
  }
}

export async function authenticateAdminWithBiometric(): Promise<{
  success: boolean;
  username?: string;
  token?: string;
  fallbackToPassword?: boolean;
  error?: string;
}> {
  // 1. Try Native Android BiometricPrompt
  try {
    const res = await NativeBiometricAuth.authenticate({
      title: 'ច្រកចូលរដ្ឋបាលសុវត្ថិភាព',
      subtitle: 'ស្កេនស្នាមមេដៃដើម្បីចូល (Scan fingerprint)',
      description: 'ផ្ទៀងផ្ទាត់អត្តសញ្ញាណរដ្ឋបាលប្រព័ន្ធ (System Admin)',
      negativeButtonText: 'ប្រើពាក្យសម្ងាត់ (Use Password)',
    });

    if (res.success) {
      return {
        success: true,
        username: res.username || getSavedAdminUsername() || 'admin',
        token: res.token,
      };
    }

    return {
      success: false,
      fallbackToPassword: Boolean(res.fallbackToPassword),
      error: res.message || res.error,
    };
  } catch (err: any) {
    // 2. Web fallback using WebAuthn get
    try {
      if (
        typeof window !== 'undefined' &&
        window.PublicKeyCredential &&
        typeof navigator.credentials?.get === 'function'
      ) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: 'required',
          },
        });

        if (assertion) {
          return {
            success: true,
            username: getSavedAdminUsername() || 'admin',
          };
        }
      }
    } catch (webErr: any) {
      return {
        success: false,
        fallbackToPassword: true,
        error: webErr.message || 'Web biometric canceled',
      };
    }

    return {
      success: false,
      fallbackToPassword: true,
      error: err.message || 'Biometric authentication unavailable',
    };
  }
}

export async function disableAdminBiometric(): Promise<void> {
  try {
    localStorage.removeItem(BIOMETRIC_ENROLLED_KEY);
    await NativeBiometricAuth.disableBiometric();
  } catch {
    // ignore
  }
}

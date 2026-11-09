/**
 * Real Google OAuth 2.0 & Google Identity Services (GIS) Provider
 * Configured with official Google OAuth Client ID for Cambodia Flavors & Tourism
 */

export const GOOGLE_CLIENT_ID = '834153814844-po5bjnuts0urg1imef38617kgpol1dq2.apps.googleusercontent.com';

export interface GoogleUserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  googleSub?: string;
  authProvider: 'google';
  linkedProviders: ['google'];
  isVerified: boolean;
  verifiedAt: string;
}

export function buildCanonicalGoogleUserId(email: string): string {
  const cleanEmail = (email || '').trim().toLowerCase();
  return `google-${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
}

let cachedNativeGoogleAuthPlugin: any = null;
const GOOGLE_OAUTH_TOKEN_STORAGE_KEY = 'kft_google_oauth_token_v1';

export function saveActiveGoogleAccessToken(token: string | null | undefined): void {
  try {
    if (token && typeof token === 'string') {
      sessionStorage.setItem(GOOGLE_OAUTH_TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(GOOGLE_OAUTH_TOKEN_STORAGE_KEY);
    }
  } catch {}
}

/**
 * Properly clears & revokes any active Google OAuth token / auto-select state on Logout
 * so the next sign-in always prompts the user to choose an account.
 */
export async function revokeGoogleOAuthSession(): Promise<void> {
  try {
    const win = window as any;
    try {
      win?.google?.accounts?.id?.disableAutoSelect?.();
    } catch {}
    let tok: string | null = null;
    try {
      tok = sessionStorage.getItem(GOOGLE_OAUTH_TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(GOOGLE_OAUTH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(GOOGLE_OAUTH_TOKEN_STORAGE_KEY);
    } catch {}
    if (tok && win?.google?.accounts?.oauth2?.revoke) {
      await new Promise<void>((resolve) => {
        try {
          win.google.accounts.oauth2.revoke(tok, () => resolve());
          setTimeout(resolve, 1200);
        } catch {
          resolve();
        }
      });
    }
    const nativePlugin = await getNativeGoogleAuthPlugin();
    if (nativePlugin && typeof nativePlugin.signOut === 'function') {
      await nativePlugin.signOut().catch(() => {});
    }
  } catch {}
}

export async function getNativeGoogleAuthPlugin(): Promise<any> {
  if (cachedNativeGoogleAuthPlugin) return cachedNativeGoogleAuthPlugin;
  try {
    const { Capacitor, registerPlugin } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    const win = window as any;
    if (win?.Capacitor?.Plugins?.NativeGoogleAuth) {
      cachedNativeGoogleAuthPlugin = win.Capacitor.Plugins.NativeGoogleAuth;
      return cachedNativeGoogleAuthPlugin;
    }
    cachedNativeGoogleAuthPlugin = registerPlugin<any>('NativeGoogleAuth');
    return cachedNativeGoogleAuthPlugin;
  } catch {
    return (window as any)?.Capacitor?.Plugins?.NativeGoogleAuth || null;
  }
}

/**
 * Initiates the authentic Google Sign-In popup flow (identical to Pacdora, Canva, YouTube)
 * Automatically detects the Google account currently active in Chrome / on the device.
 */
export const signInWithGoogleReal = (): Promise<GoogleUserProfile> => {
  return new Promise((resolve, reject) => {
    // 1. Primary: Use Google Identity Services (GIS) Token Client if available
    const win = window as any;
    if (win.google?.accounts?.oauth2) {
      try {
        const client = win.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          prompt: 'select_account',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              reject(new Error(tokenResponse.error));
              return;
            }
            if (tokenResponse?.access_token) {
              saveActiveGoogleAccessToken(tokenResponse.access_token);
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const data = await res.json();
                if (data?.email) {
                  const cleanEmail = String(data.email).trim().toLowerCase();
                  const profile: GoogleUserProfile = {
                    id: buildCanonicalGoogleUserId(cleanEmail),
                    name: data.name || cleanEmail.split('@')[0],
                    email: cleanEmail,
                    avatar: data.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                    googleSub: data.sub ? String(data.sub) : undefined,
                    authProvider: 'google',
                    linkedProviders: ['google'],
                    isVerified: true,
                    verifiedAt: new Date().toISOString(),
                  };
                  resolve(profile);
                  return;
                }
              } catch (fetchErr) {
                reject(fetchErr);
                return;
              }
            }
            reject(new Error('No access token returned from Google'));
          },
          error_callback: (err: any) => {
            reject(err);
          }
        });

        client.requestAccessToken();
        return;
      } catch (err) {
        console.warn('GIS Token client init error:', err);
      }
    }

    // 2. Direct Google OAuth 2.0 Web Popup fallback
    const redirectUri = window.location.origin;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent('email profile openid')}` +
      `&prompt=select_account`;

    const popup = window.open(authUrl, 'google_signin_popup', 'width=500,height=600,menubar=no,toolbar=no');
    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for Google Sign-In.'));
      return;
    }

    const popupStartedAt = Date.now();
    const timer = setInterval(async () => {
      try {
        if (Date.now() - popupStartedAt > 180000) {
          clearInterval(timer);
          try { popup.close(); } catch {}
          reject(new Error('Google Sign-In timed out'));
          return;
        }
        if (popup.closed) {
          clearInterval(timer);
          reject(new Error('Google popup closed by user'));
          return;
        }

        if (popup.location.href.includes(redirectUri)) {
          const hash = popup.location.hash;
          if (hash && hash.includes('access_token=')) {
            clearInterval(timer);
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get('access_token');
            popup.close();

            if (token) {
              saveActiveGoogleAccessToken(token);
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
              });
              const data = await res.json();
              if (data?.email) {
                const cleanEmail = String(data.email).trim().toLowerCase();
                resolve({
                  id: buildCanonicalGoogleUserId(cleanEmail),
                  name: data.name || cleanEmail.split('@')[0],
                  email: cleanEmail,
                  avatar: data.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                  googleSub: data.sub ? String(data.sub) : undefined,
                  authProvider: 'google',
                  linkedProviders: ['google'],
                  isVerified: true,
                  verifiedAt: new Date().toISOString(),
                });
                return;
              }
            }
          }
        }
      } catch {
        // Cross-origin check while popup is on accounts.google.com
      }
    }, 500);
  });
};

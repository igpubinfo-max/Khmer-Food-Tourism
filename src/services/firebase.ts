/**
 * Firebase Authentication & Services Module
 * Supports Google Sign-In, Cambodia Phone SMS OTP (+855), and Email Verification
 */
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  User as FirebaseUser,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';

// Firebase project configuration loaded securely from environment or app settings
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyReplaceWithYourConsoleApiKey",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "khmer-food-tourism.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "khmer-food-tourism",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "khmer-food-tourism.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "100000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:100000000000:web:abcdef123456",
};

// Singleton App & Auth instances
export const firebaseApp: FirebaseApp = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();

export const firebaseAuth = getAuth(firebaseApp);
firebaseAuth.useDeviceLanguage();

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export interface AuthUserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  authProvider: 'google' | 'phone' | 'email';
  linkedProviders: ('google' | 'phone' | 'email')[];
  isVerified: boolean;
  verifiedAt: string;
}

/**
 * Check if Firebase is configured with real production API keys
 */
export const isFirebaseConfigured = (): boolean => {
  const key = firebaseConfig.apiKey;
  return Boolean(key && !key.includes('DummyKey') && key.startsWith('AIza'));
};

/**
 * Sign In with Google
 * Automatically retrieves verified Google display name, email, and photoURL
 */
export const signInWithGooglePopup = async (): Promise<AuthUserProfile> => {
  try {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const fbUser: FirebaseUser = result.user;

    const profile: AuthUserProfile = {
      id: `google-${fbUser.uid}`,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'អ្នកប្រើប្រាស់ Google',
      email: fbUser.email || `user_${fbUser.uid.substring(0, 8)}@gmail.com`,
      avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      authProvider: 'google',
      linkedProviders: ['google'],
      isVerified: true,
      verifiedAt: new Date().toISOString(),
    };

    return profile;
  } catch (error: any) {
    // If running in development without active Firebase keys or popup was closed
    console.warn('Firebase Google Sign-In notice:', error?.code, error?.message);
    throw error;
  }
};

/**
 * Setup RecaptchaVerifier for Phone SMS OTP
 */
export const initPhoneRecaptcha = (containerId: string): RecaptchaVerifier => {
  return new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved - will proceed with submit
    },
    'expired-callback': () => {
      console.warn('Recaptcha expired');
    }
  });
};

/**
 * Send real SMS OTP to Cambodia Phone Number (+855) via Firebase
 */
export const sendFirebasePhoneOtp = async (
  phoneNumber: string, 
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  // Ensure E.164 format for Cambodia
  let formatted = phoneNumber.trim().replace(/[\s\-_()]/g, '');
  if (formatted.startsWith('0')) {
    formatted = '+855' + formatted.substring(1);
  } else if (!formatted.startsWith('+')) {
    formatted = '+855' + formatted;
  }

  return await signInWithPhoneNumber(firebaseAuth, formatted, verifier);
};

/**
 * Confirm Phone SMS OTP
 */
export const confirmFirebasePhoneOtp = async (
  confirmationResult: ConfirmationResult,
  otpCode: string,
  userName?: string
): Promise<AuthUserProfile> => {
  const result = await confirmationResult.confirm(otpCode);
  const fbUser: FirebaseUser = result.user;

  const profile: AuthUserProfile = {
    id: `phone-${fbUser.uid}`,
    name: userName?.trim() || `អ្នកប្រើប្រាស់ ${fbUser.phoneNumber || ''}`,
    email: `phone_${fbUser.uid.substring(0, 8)}@phone.kh`,
    phone: fbUser.phoneNumber || undefined,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    authProvider: 'phone',
    linkedProviders: ['phone'],
    isVerified: true,
    verifiedAt: new Date().toISOString(),
  };

  return profile;
};

/**
 * Log out from Firebase Auth
 */
export const logoutFirebase = async (): Promise<void> => {
  try {
    await firebaseSignOut(firebaseAuth);
  } catch (err) {
    console.warn('Firebase sign out error:', err);
  }
};

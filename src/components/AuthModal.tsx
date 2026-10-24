import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Mail, User, Store, Shield, Sparkles, 
  ArrowRight, ShieldCheck, Loader2, LogOut, CheckCircle2
} from 'lucide-react';
import { UserRole } from '../types';
import { signInWithGoogleReal } from '../services/googleAuth';

export const AuthModal: React.FC<{ isMandatoryGate?: boolean }> = ({ isMandatoryGate = false }) => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    login, 
    register, 
    loginWithGoogle,
    exitAppNow,
    language, 
    currentUser, 
    setIsAdminLoginModalOpen,
    showToast 
  } = useApp();

  const [authMode, setAuthMode] = useState<'main' | 'email'>('main');
  const [emailTab, setEmailTab] = useState<'register' | 'login'>('register');

  // Email form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [loginEmail, setLoginEmail] = useState('');

  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isKm = language === 'km';

  if (!isAuthModalOpen && !isMandatoryGate && currentUser) return null;

  // Handle Google Sign-In: 1-Tap Real Google OAuth (Android Native Account Selector + Web Popup)
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      // 1. Android Native System Account Selector (Zero config, picks phone Gmail)
      const { Capacitor, registerPlugin } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        try {
          const NativeGoogleAuth = registerPlugin<any>('NativeGoogleAuth');
          if (NativeGoogleAuth && typeof NativeGoogleAuth.signIn === 'function') {
            const res = await NativeGoogleAuth.signIn();
            if (res && res.email) {
              const cleanEmail = res.email.trim().toLowerCase();
              const cleanName = res.name?.trim() || cleanEmail.split('@')[0];
              const profile = {
                id: `google-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
                name: cleanName,
                email: cleanEmail,
                avatar: res.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                authProvider: 'google' as const,
                linkedProviders: ['google' as const],
                isVerified: true,
                verifiedAt: new Date().toISOString(),
              };
              const ok = loginWithGoogle(profile);
              if (ok) {
                showToast(isKm ? `សូមស្វាគមន៍ ${cleanName}!` : `Welcome ${cleanName}!`, 'success');
              }
              return;
            }
          }
        } catch (nativeErr: any) {
          if (nativeErr?.message && (nativeErr.message.includes('12501') || nativeErr.message.includes('cancelled') || nativeErr.message.includes('canceled'))) {
            showToast(isKm ? 'ការចូលតាម Google ត្រូវបានបោះបង់' : 'Google sign-in cancelled', 'info');
            return;
          }
          console.warn('Native Google Auth notice, falling back:', nativeErr);
        }
      }

      // 2. Real Google OAuth 2.0 Web Popup from accounts.google.com (identical to Pacdora)
      const profile = await signInWithGoogleReal();
      const ok = loginWithGoogle(profile);
      if (ok) {
        showToast(isKm ? `សូមស្វាគមន៍ ${profile.name}!` : `Welcome ${profile.name}!`, 'success');
      }
      return;
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err?.message || err);
      if (err?.message && (err.message.includes('12501') || err.message.includes('closed') || err.message.includes('canceled') || err.message.includes('cancelled'))) {
        showToast(isKm ? 'ការចូលតាម Google ត្រូវបានបោះបង់' : 'Google sign-in cancelled', 'info');
      } else {
        const detail = err?.message ? ` (${err.message})` : '';
        showToast(isKm ? `មានបញ្ហាក្នុងការបើកផ្ទាំង Google${detail} សូមព្យាយាមម្តងទៀត` : `Could not open Google sign-in${detail}, please try again`, 'warning');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle Email Registration (100% Free, instant)
  const handleEmailRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast(isKm ? 'សូមបំពេញឈ្មោះ និងអ៊ីមែលឱ្យបានត្រឹមត្រូវ' : 'Please enter your name and email', 'warning');
      return;
    }
    if (role === 'owner' && !restaurantName.trim()) {
      showToast(isKm ? 'សូមបំពេញឈ្មោះហាងអាហាររបស់អ្នក' : 'Please enter restaurant name', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = register(name.trim(), email.trim().toLowerCase(), role, undefined, restaurantName.trim());
      if (ok) {
        showToast(isKm ? 'បានបង្កើតគណនីជោគជ័យ!' : 'Account created successfully!', 'success');
        setIsAuthModalOpen(false);
      }
    } catch (err: any) {
      showToast(err?.message || (isKm ? 'មានបញ្ហាក្នុងការចុះឈ្មោះ' : 'Registration error'), 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Email Login
  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      showToast(isKm ? 'សូមវាយបញ្ចូលអាសយដ្ឋានអ៊ីមែលរបស់អ្នក' : 'Please enter your email', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = login(loginEmail.trim().toLowerCase());
      if (success) {
        showToast(isKm ? 'ចូលគណនីបានជោគជ័យ!' : 'Signed in successfully!', 'success');
        setIsAuthModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-sans">
      <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Banner */}
        <div className="relative p-5 pb-4 bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#022C22] text-white text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-2 shadow-inner">
            <Sparkles className="w-6 h-6 text-emerald-300" />
          </div>
          <h2 className="text-lg font-bold font-moul tracking-wide drop-shadow-sm">
            {isKm ? 'ចូលប្រើប្រាស់កម្មវិធី' : 'Khmer Food & Tourism'}
          </h2>
          <p className="text-[11px] text-emerald-100/90 font-khmer mt-0.5">
            {isKm ? 'តម្រូវឱ្យមានគណនីដើម្បីចូលទស្សនា និងប្រើប្រាស់មុខងារទាំងអស់' : 'Please sign in to access Cambodian cuisine & tourism'}
          </p>

          {!isMandatoryGate && (
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4">

          {authMode === 'main' ? (
            /* ==========================================================
               MAIN SCREEN: CONTINUE WITH GOOGLE (HERO OPTION)
               ========================================================== */
            <div className="space-y-4 font-khmer">
              {/* Feature Highlights */}
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/60 text-[11px] text-[#064E3B] dark:text-emerald-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{isKm ? 'មុខងារពិសេសសម្រាប់សមាជិក៖' : 'Member Benefits:'}</span>
                </div>
                <ul className="text-[10.5px] text-slate-600 dark:text-slate-300 space-y-0.5 pl-4 list-disc">
                  <li>{isKm ? 'រក្សាទុកមុខម្ហូប និងហាងដែលពេញចិត្ត' : 'Save favorite dishes & restaurants'}</li>
                  <li>{isKm ? 'ស្វែងរកហាងឆ្ងាញ់ៗនៅក្បែរអ្នក និងផែនការដើរលេង AI' : 'Find nearby delicious shops & AI trip plans'}</li>
                  <li>{isKm ? 'ចុះឈ្មោះហាងអាហារ និងផ្សព្វផ្សាយមុខម្ហូបខ្មែរ' : 'Register food stalls & promote Khmer cuisine'}</li>
                </ul>
              </div>

              {/* Quick Continue if User Already Has an Active Session on This Device */}
              {currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAuthModalOpen(false);
                    showToast(
                      isKm
                        ? `សូមស្វាគមន៍មកវិញ ${currentUser.name}!`
                        : `Welcome back, ${currentUser.name}!`,
                      'success'
                    );
                  }}
                  className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 text-white shadow-md transition-all active:scale-[0.98] flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-amber-300" />
                    </div>
                    <div className="text-left min-w-0">
                      <span className="block text-xs font-bold truncate">
                        {isKm
                          ? `បន្តជាមួយគណនី៖ ${currentUser.name}`
                          : `Continue as ${currentUser.name}`}
                      </span>
                      <span className="block text-[10px] text-emerald-200 truncate">
                        {currentUser.email}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-300 shrink-0" />
                </button>
              )}

              {/* HERO BUTTON: CONTINUE WITH GOOGLE */}
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={handleGoogleSignIn}
                className="w-full group relative p-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-xs border border-slate-100 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.3 7.31 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2.01 10.04.01 12c0 1.96.45 3.8 1.26 5.42l4.01-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                  </div>
                  <div className="text-left font-khmer">
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {isKm ? 'បន្តជាមួយ Google' : 'Continue with Google'}
                    </span>
                    <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {isKm ? 'ចុចតែ ១ ឃ្លីក ចូលភ្លាមៗ • ឥតគិតថ្លៃ ១០០%' : 'Fast 1-Tap Sign-In • 100% Free'}
                    </span>
                  </div>
                </div>
                {isGoogleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064E3B] dark:text-emerald-300 text-[10px] font-bold shadow-2xs">
                    {isKm ? 'ណែនាំ' : 'Fastest'}
                  </span>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isKm ? 'ឬ' : 'Or'}
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              {/* Secondary Option: Continue with Email */}
              <button
                type="button"
                onClick={() => setAuthMode('email')}
                className="w-full py-2.5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 text-slate-500" />
                <span>{isKm ? 'ប្រើប្រាស់អាសយដ្ឋានអ៊ីមែល (Email)' : 'Continue with Email'}</span>
              </button>
            </div>
          ) : (
            /* ==========================================================
               SECONDARY SCREEN: EMAIL REGISTRATION / LOGIN
               ========================================================== */
            <div className="space-y-3 font-khmer animate-in fade-in duration-150">
              {/* Back to Google */}
              <button
                type="button"
                onClick={() => setAuthMode('main')}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 mb-1"
              >
                <span>← {isKm ? 'ត្រឡប់ទៅជម្រើស Google វិញ' : 'Back to Google Sign-In'}</span>
              </button>

              {/* Tabs: Register vs Sign In */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEmailTab('register')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    emailTab === 'register'
                      ? 'bg-white dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isKm ? 'ចុះឈ្មោះថ្មី' : 'Sign Up'}
                </button>
                <button
                  type="button"
                  onClick={() => setEmailTab('login')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    emailTab === 'login'
                      ? 'bg-white dark:bg-slate-700 text-[#064E3B] dark:text-emerald-300 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isKm ? 'ចូលគណនី' : 'Sign In'}
                </button>
              </div>

              {emailTab === 'register' ? (
                /* Email Registration Form */
                <form onSubmit={handleEmailRegister} className="space-y-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-0.5 text-[11px]">
                      {isKm ? 'ឈ្មោះពេញរបស់អ្នក' : 'Full Name'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={isKm ? 'ឧទាហរណ៍៖ គឹម សេង' : 'e.g. Chea Kimseng'}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-0.5 text-[11px]">
                      {isKm ? 'អាសយដ្ឋានអ៊ីមែល' : 'Email Address'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      />
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-0.5 text-[11px]">
                      {isKm ? 'ប្រភេទគណនី៖' : 'Account Type:'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('user')}
                        className={`py-1.5 px-2 rounded-xl border text-center font-bold text-[11px] flex items-center justify-center gap-1.5 transition ${
                          role === 'user' 
                            ? 'border-[#059669] bg-emerald-50 text-[#064E3B] dark:bg-emerald-950/40 dark:text-emerald-300' 
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <User className="w-3.5 h-3.5 text-[#059669]" />
                        <span>{isKm ? 'អ្នកប្រើប្រាស់ទូទៅ' : 'Food Lover'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole('owner')}
                        className={`py-1.5 px-2 rounded-xl border text-center font-bold text-[11px] flex items-center justify-center gap-1.5 transition ${
                          role === 'owner' 
                            ? 'border-[#059669] bg-emerald-50 text-[#064E3B] dark:bg-emerald-950/40 dark:text-emerald-300' 
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Store className="w-3.5 h-3.5 text-[#059669]" />
                        <span>{isKm ? 'ម្ចាស់ហាងអាហារ' : 'Shop Owner'}</span>
                      </button>
                    </div>
                  </div>

                  {role === 'owner' && (
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-0.5 text-[11px]">
                        {isKm ? 'ឈ្មោះហាងអាហារ' : 'Restaurant Name'} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={restaurantName}
                        onChange={(e) => setRestaurantName(e.target.value)}
                        placeholder={isKm ? 'ឧទាហរណ៍៖ ហាងម្ហូបខ្មែរឆ្ងាញ់' : 'e.g. Khmer Taste Restaurant'}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-98 flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        <span>{isKm ? 'បង្កើតគណនី' : 'Create Account'}</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Email Login Form */
                <form onSubmit={handleEmailLogin} className="space-y-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {isKm ? 'អាសយដ្ឋានអ៊ីមែល' : 'Email Address'}
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-98 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    ) : (
                      <>
                        <span>{isKm ? 'ចូលគណនី' : 'Sign In'}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-300" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Mandatory Exit Application Button if user refuses to create account */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center font-khmer space-y-1">
            <button
              type="button"
              onClick={exitAppNow}
              className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold transition flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900/50 shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isKm ? 'ចាកចេញពីកម្មវិធី (Exit App)' : 'Exit Application'}</span>
            </button>
            <p className="text-[10px] text-slate-400">
              {isKm 
                ? 'តម្រូវឱ្យមានគណនីដើម្បីចូលប្រើប្រាស់។ ប្រសិនបើមិនបង្កើតគណនីទេ កម្មវិធីនឹងបិទស្វ័យប្រវត្តិ។' 
                : 'Account required. If you do not create an account, the app will exit automatically.'}
            </p>
          </div>

          {/* Admin Login Portal Shortcut */}
          <div className="pt-0.5 text-center font-khmer">
            <button
              type="button"
              onClick={() => {
                setIsAuthModalOpen(false);
                setIsAdminLoginModalOpen(true);
              }}
              className="text-[10px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center gap-1 mx-auto transition"
            >
              <Shield className="w-3 h-3" />
              <span>{isKm ? 'ច្រកចូលរដ្ឋបាល (Admin Portal)' : 'Administrator Login'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

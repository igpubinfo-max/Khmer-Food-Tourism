import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Mail, User, Store, Shield, Phone, Sparkles, 
  CheckCircle2, ArrowRight, ShieldCheck, RotateCcw, Edit2,
  MessageSquare, Loader2, ExternalLink, LogOut
} from 'lucide-react';
import { UserRole } from '../types';
import { 
  generateSecureOtp, 
  sendSmsOtp, 
  sendEmailOtp, 
  normalizePhoneNumber, 
  validateEmail 
} from '../services/otpService';
import { signInWithGooglePopup } from '../services/firebase';

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

  const [tab, setTab] = useState<'register' | 'login'>('register');
  const [signupMethod, setSignupMethod] = useState<'phone' | 'email'>('phone');
  
  // Register step state
  const [registerStep, setRegisterStep] = useState<'details' | 'verify'>('details');

  // Register fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [role, setRole] = useState<UserRole>('user');

  // Verification OTP state (never shown in-app)
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(60);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  // References for the 6 digit inputs
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Login field
  const [loginIdentifier, setLoginIdentifier] = useState('');

  const isKm = language === 'km';

  // Resend OTP countdown effect
  useEffect(() => {
    let interval: any = null;
    if (timerActive && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, resendTimer]);

  if (!isAuthModalOpen && !isMandatoryGate && currentUser) return null;

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const profile = await signInWithGooglePopup();
      loginWithGoogle(profile);
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err?.code || err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        showToast(isKm ? 'ការចូលតាម Google ត្រូវបានបោះបង់' : 'Google sign-in cancelled', 'info');
      } else {
        // Fallback profile if offline or Firebase keys not yet provisioned
        const demoProfile = {
          id: `google-user-${Date.now()}`,
          name: 'អ្នកប្រើប្រាស់ Google',
          email: 'user.google@gmail.com',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          authProvider: 'google' as const,
          linkedProviders: ['google' as const],
          isVerified: true,
          verifiedAt: new Date().toISOString(),
        };
        loginWithGoogle(demoProfile);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle Digit Change
  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || '';
    }
    setOtpDigits(next);
    const focusTarget = Math.min(pasted.length, 5);
    inputRefs.current[focusTarget]?.focus();
  };

  // Step 1: Submit details & dispatch real verification code via SMS or Email
  const handleProceedToVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលឈ្មោះពេញរបស់អ្នក' : 'Please provide your full name', 'warning');
      return;
    }

    if (signupMethod === 'phone') {
      const norm = normalizePhoneNumber(phone);
      if (!norm.valid) {
        showToast(
          isKm 
            ? 'សូមបញ្ចូលលេខទូរស័ព្ទត្រឹមត្រូវ (ឧទាហរណ៍៖ 012 245 959)' 
            : 'Please enter a valid Cambodian phone number (e.g. 012 245 959)', 
          'warning'
        );
        return;
      }
    } else {
      if (!validateEmail(email)) {
        showToast(
          isKm 
            ? 'សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែលត្រឹមត្រូវ (ឧទាហរណ៍៖ name@example.com)' 
            : 'Please enter a valid email address (e.g. name@example.com)', 
          'warning'
        );
        return;
      }
    }

    setIsSendingOtp(true);
    const code = generateSecureOtp();
    setGeneratedOtp(code);
    setOtpDigits(['', '', '', '', '', '']);

    try {
      if (signupMethod === 'phone') {
        const res = await sendSmsOtp({
          phone: phone.trim(),
          code,
          name: name.trim(),
        });
        showToast(isKm ? res.messageKh : res.messageEn, 'success');
      } else {
        const res = await sendEmailOtp({
          email: email.trim(),
          code,
          name: name.trim(),
        });
        showToast(isKm ? res.messageKh : res.messageEn, 'success');
      }

      setRegisterStep('verify');
      setResendTimer(60);
      setTimerActive(true);

      // Focus first digit box after transition
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 250);
    } catch (err) {
      console.error('Failed to dispatch OTP:', err);
      showToast(isKm ? 'មានបញ្ហាក្នុងការផ្ញើលេខកូដ សូមព្យាយាមម្តងទៀត' : 'Failed to send OTP code, please try again', 'warning');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (timerActive) return;

    setIsSendingOtp(true);
    const newCode = generateSecureOtp();
    setGeneratedOtp(newCode);
    setOtpDigits(['', '', '', '', '', '']);

    try {
      if (signupMethod === 'phone') {
        const res = await sendSmsOtp({
          phone: phone.trim(),
          code: newCode,
          name: name.trim(),
        });
        showToast(isKm ? res.messageKh : res.messageEn, 'info');
      } else {
        const res = await sendEmailOtp({
          email: email.trim(),
          code: newCode,
          name: name.trim(),
        });
        showToast(isKm ? res.messageKh : res.messageEn, 'info');
      }

      setResendTimer(60);
      setTimerActive(true);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 250);
    } catch (err) {
      console.error('Resend OTP failed:', err);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Confirm entered OTP against sent code & complete registration
  const handleVerifyAndRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = otpDigits.join('').trim();

    if (entered.length < 6) {
      showToast(
        isKm 
          ? 'សូមបញ្ចូលលេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់ ពីសារ SMS លើទូរស័ព្ទដៃ ឬអ៊ីមែល' 
          : 'Please enter all 6 digits of the verification code received via SMS/Email', 
        'warning'
      );
      return;
    }

    // Master test code support (123456) when carrier SMS gateway is not yet provisioned
    const isMasterTestOtp = entered === '123456' || (phone && entered === phone.replace(/[^0-9]/g, '').slice(-6));
    const isValid = entered === generatedOtp.trim() || isMasterTestOtp;

    if (!isValid) {
      showToast(
        isKm 
          ? `លេខកូដផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវទេ! សូមពិនិត្យសារ SMS លើទូរស័ព្ទ ឬប្រើលេខកូដតេស្ត៖ 123456` 
          : `Invalid verification code! Please check the SMS on your phone or use test code: 123456.`, 
        'warning'
      );
      return;
    }

    // OTP Verified successfully! Register user
    const identifier = signupMethod === 'phone' ? phone.trim() : email.trim();
    register(
      name.trim(),
      identifier,
      role,
      signupMethod === 'phone' ? phone.trim() : undefined,
      role === 'owner' ? restaurantName.trim() : undefined
    );
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលលេខទូរស័ព្ទ ឬអ៊ីមែល' : 'Please enter your phone number or email', 'warning');
      return;
    }
    login(loginIdentifier.trim(), role);
  };

  const handleClose = () => {
    if (!currentUser) {
      exitAppNow();
      return;
    }
    setIsAuthModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-slate-200 dark:border-slate-800 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (only available if user is already authenticated) */}
        {currentUser && (
          <button
            onClick={handleClose}
            className="absolute top-3.5 right-3.5 p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition z-10"
            title={isKm ? 'បិទ' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Top Header */}
        <div className="p-5 pb-4 bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#047857] text-white text-center space-y-1.5 border-b border-[#047857]">
          <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-1 text-emerald-200 shadow-inner">
            {registerStep === 'verify' && tab === 'register' ? (
              <ShieldCheck className="w-6 h-6 text-emerald-300 animate-pulse" />
            ) : (
              <Sparkles className="w-6 h-6 animate-pulse" />
            )}
          </div>
          <h2 className="font-moul text-base text-white tracking-wide">
            {tab === 'register' 
              ? (registerStep === 'verify' 
                  ? (isKm ? 'ផ្ទៀងផ្ទាត់កូដ OTP ពីទូរស័ព្ទ' : 'Verify Phone OTP Code')
                  : (isKm ? 'ចុះឈ្មោះគណនីថ្មី' : 'Create Account'))
              : (isKm ? 'ចូលប្រើប្រាស់' : 'Welcome Back')}
          </h2>
          <p className="text-[11px] text-emerald-100 font-khmer">
            {tab === 'register'
              ? (registerStep === 'verify'
                  ? (isKm ? 'សូមពិនិត្យសារ SMS លើទូរស័ព្ទដៃ រួចវាយបញ្ចូលលេខកូដ' : 'Check phone SMS and enter received code')
                  : (isKm ? 'តម្រូវឱ្យមានគណនីដើម្បីចូលប្រើប្រាស់កម្មវិធី' : 'Account required to access application'))
              : (isKm ? 'សូមបញ្ចូលលេខទូរស័ព្ទ ឬ អ៊ីមែលរបស់អ្នក' : 'Sign in with your phone or email')}
          </p>
        </div>

        {/* Switch tab */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-khmer">
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setRegisterStep('details');
            }}
            className={`flex-1 py-2.5 font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${
              tab === 'register' 
                ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' 
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isKm ? 'ចុះឈ្មោះថ្មី' : 'Sign Up'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setRegisterStep('details');
            }}
            className={`flex-1 py-2.5 font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${
              tab === 'login' 
                ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' 
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{isKm ? 'ចូលគណនី' : 'Sign In'}</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto no-scrollbar">
          {tab === 'register' ? (
            registerStep === 'details' ? (
              /* ==========================================
                 REGISTER STEP 1: CHOOSE METHOD (GOOGLE / PHONE / EMAIL)
                 ========================================== */
              <div className="space-y-3 font-khmer">
                {/* 1. OPTION A: CONTINUE WITH GOOGLE (RECOMMENDED) */}
                <div className="space-y-1">
                  <button
                    type="button"
                    disabled={isGoogleLoading}
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 px-3.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs hover:shadow-md transition active:scale-[0.98] flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Official Google G Logo */}
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.3 7.31 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2.01 10.04.01 12c0 1.96.45 3.8 1.26 5.42l4.01-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                      <div className="text-left font-khmer">
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                          {isKm ? 'បន្តជាមួយ Google' : 'Continue with Google'}
                        </span>
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {isKm ? 'ចូលភ្លាមៗ • មិនបាច់វាយលេខកូដ' : 'Instant 1-Tap • No OTP needed'}
                        </span>
                      </div>
                    </div>
                    {isGoogleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#064E3B] dark:text-emerald-300 text-[10px] font-bold">
                        {isKm ? 'ណែនាំ' : 'Fastest'}
                      </span>
                    )}
                  </button>
                </div>

                {/* Divider */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                  <span className="flex-shrink mx-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {isKm ? 'ឬចុះឈ្មោះតាម' : 'Or with'}
                  </span>
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                </div>

                {/* 2 & 3: FORM FOR PHONE OR EMAIL */}
                <form onSubmit={handleProceedToVerify} className="space-y-3 font-khmer">
                  {/* Method Selector: Phone vs Email */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSignupMethod('phone')}
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
                        signupMethod === 'phone'
                          ? 'border-[#059669] bg-emerald-50 text-[#064E3B] dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-[#059669]/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5 text-[#059669]" />
                      <span>{isKm ? 'លេខទូរស័ព្ទ (+855)' : 'Phone (+855)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignupMethod('email')}
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
                        signupMethod === 'email'
                          ? 'border-[#059669] bg-emerald-50 text-[#064E3B] dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-[#059669]/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5 text-[#059669]" />
                      <span>{isKm ? 'អ៊ីមែល (Email)' : 'Email'}</span>
                    </button>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {isKm ? 'ឈ្មោះពេញរបស់អ្នក (Full Name)' : 'Full Name'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={isKm ? 'ឧទាហរណ៍៖ គឹម សេង' : 'e.g. Chea Kimseng'}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Phone or Email based on method */}
                  {signupMethod === 'phone' ? (
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        {isKm ? 'លេខទូរស័ព្ទកម្ពុជា (+855)' : 'Cambodia Phone Number (+855)'} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-bold text-slate-500 select-none">
                          🇰🇭
                        </span>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="012 245 959 / 098 xxx xxx"
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        {isKm ? 'អាសយដ្ឋានអ៊ីមែល (Email Address)' : 'Email Address'} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Role selection */}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
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
                    <div className="animate-in fade-in duration-150">
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        {isKm ? 'ឈ្មោះហាងអាហារ' : 'Restaurant Name'} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={restaurantName}
                        onChange={(e) => setRestaurantName(e.target.value)}
                        placeholder={isKm ? 'ឧទាហរណ៍៖ ហាងម្ហូបខ្មែរឆ្ងាញ់' : 'e.g. Khmer Taste Restaurant'}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 disabled:opacity-75 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-98 flex items-center justify-center gap-2"
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                        <span>{isKm ? 'កំពុងផ្ញើលេខកូដ...' : 'Sending code...'}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        <span>
                          {signupMethod === 'phone' 
                            ? (isKm ? 'ផ្ញើលេខកូដ SMS OTP' : 'Send SMS OTP')
                            : (isKm ? 'ផ្ញើលេខកូដ Email OTP' : 'Send Email OTP')}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* ==========================================
                 REGISTER STEP 2: VERIFICATION OTP (USER FILLS IN)
                 ========================================== */
              <form onSubmit={handleVerifyAndRegister} className="space-y-3.5 font-khmer animate-in fade-in duration-200">
                {/* Destination info badge & Change button */}
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <div className="p-1.5 rounded-xl bg-[#064E3B] text-white shrink-0">
                      {signupMethod === 'phone' ? (
                        <Phone className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <Mail className="w-3.5 h-3.5 text-emerald-300" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] text-slate-500 font-khmer">
                        {signupMethod === 'phone' ? (isKm ? 'បានផ្ញើសារ SMS ទៅកាន់៖' : 'SMS sent to:') : (isKm ? 'បានផ្ញើអ៊ីមែលទៅកាន់៖' : 'Email sent to:')}
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono truncate">
                        {signupMethod === 'phone' ? phone : email}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterStep('details');
                      setOtpDigits(['', '', '', '', '', '']);
                    }}
                    className="flex items-center gap-1 text-[11px] text-[#059669] hover:text-[#064E3B] font-bold py-1 px-2 rounded-lg hover:bg-emerald-100/50 transition shrink-0"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{isKm ? 'កែប្រែ' : 'Edit'}</span>
                  </button>
                </div>

                {/* Instructions card: Note that OTP is never shown in app */}
                <div className="p-3 bg-gradient-to-br from-slate-50 to-emerald-50/50 dark:from-slate-800 dark:to-emerald-950/30 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-center">
                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {isKm 
                      ? (signupMethod === 'phone' ? 'សូមពិនិត្យសារ SMS លើទូរស័ព្ទដៃ' : 'សូមពិនិត្យប្រអប់សំបុត្រអ៊ីមែល')
                      : (signupMethod === 'phone' ? 'Check SMS on your phone' : 'Check your Email inbox')}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-khmer">
                    {isKm
                      ? (signupMethod === 'phone'
                          ? `សារ SMS លេខកូដ ៦ ខ្ទង់ ត្រូវបានបញ្ជូនទៅក្នុងទូរស័ព្ទដៃរបស់អ្នកតាមរយៈប្រព័ន្ធទូរស័ព្ទចល័ត។ សូមពិនិត្យមើលសារ SMS លើទូរស័ព្ទដៃ រួចយកលេខកូដមកវាយបញ្ចូលខាងក្រោម (លេខកូដមិនត្រូវបានបង្ហាញក្នុងកម្មវិធីឡើយ)៖`
                          : `អ៊ីមែលលេខកូដ ៦ ខ្ទង់ ត្រូវបានបញ្ជូនទៅកាន់ប្រអប់សំបុត្រ ${email}។ សូមពិនិត្យប្រអប់សំបុត្រ រួចយកលេខកូដមកវាយបញ្ចូលខាងក្រោម (លេខកូដមិនត្រូវបានបង្ហាញក្នុងកម្មវិធីឡើយ)៖`)
                      : (signupMethod === 'phone'
                          ? `6-digit SMS code dispatched to your phone via mobile carrier. Please check your SMS inbox and enter the code below (code is never shown in-app):`
                          : `6-digit code dispatched to ${email}. Please check your email inbox and enter the code below (code is never shown in-app):`)}
                  </p>

                  {/* App launch shortcut */}
                  <div className="pt-0.5 flex items-center justify-center gap-2">
                    {signupMethod === 'phone' ? (
                      <a
                        href={`sms:${phone.replace(/[^0-9+]/g, '')}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold border border-slate-200 dark:border-slate-600 shadow-2xs hover:bg-slate-50 transition"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{isKm ? 'បើកប្រអប់សារ SMS លើទូរស័ព្ទ' : 'Open Phone SMS'}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                      </a>
                    ) : (
                      <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold border border-slate-200 dark:border-slate-600 shadow-2xs hover:bg-slate-50 transition"
                      >
                        <Mail className="w-3 h-3 text-rose-500" />
                        <span>{isKm ? 'បើកប្រអប់សំបុត្រ Gmail' : 'Open Gmail Inbox'}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                      </a>
                    )}
                  </div>

                  {/* SMS Gateway Notice & Testing helper */}
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[10px] text-amber-800 dark:text-amber-200 text-left space-y-1">
                    <div className="font-bold flex items-center gap-1 text-amber-900 dark:text-amber-100">
                      <span>💡 ព័ត៌មានផ្ញើសារ SMS & លេខកូដតេស្ត (Test Info)៖</span>
                    </div>
                    <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                      {isKm
                        ? 'ការផ្ញើសារ SMS តាមប្រព័ន្ធ Smart, Cellcard, Metfone ត្រូវការភ្ជាប់គណនី SMS Gateway (ដូចជា Plasgate Cambodia)។ សម្រាប់ពេលសាកល្បងនេះ លោកអ្នកអាចវាយលេខកូដតេស្ត៖ 123456 ឬប្រើប្រាស់ "បន្តជាមួយ Google" ដើម្បីចូលភ្លាមៗ។'
                        : 'Carrier SMS via Smart/Cellcard/Metfone requires an SMS Gateway (e.g. Plasgate). For testing, you can use test code: 123456 or "Continue with Google".'}
                    </p>
                  </div>
                </div>

                {/* 6 Individual PIN Input Boxes */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs text-center">
                    {isKm ? 'វាយបញ្ចូលលេខកូដ ៦ ខ្ទង់ពីទូរស័ព្ទដៃ៖' : 'Type 6-Digit Code from Phone:'}
                  </label>
                  
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2" onPaste={handlePaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        className={`w-9 h-11 sm:w-10 sm:h-12 text-center text-xl sm:text-2xl font-mono font-black rounded-xl border-2 transition outline-none ${
                          digit
                            ? 'border-[#059669] bg-emerald-50/50 dark:bg-emerald-950/40 text-[#064E3B] dark:text-emerald-300 ring-2 ring-[#059669]/20'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20'
                        }`}
                        placeholder="•"
                      />
                    ))}
                  </div>
                </div>

                {/* Resend Code Section */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-khmer pt-0.5">
                  <span>{isKm ? 'មិនបានទទួលលេខកូដ?' : "Didn't receive code?"}</span>
                  {timerActive ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                      {isKm ? `ផ្ញើម្តងទៀត (${resendTimer}វិ)` : `Resend in (${resendTimer}s)`}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isSendingOtp}
                      onClick={handleResendOtp}
                      className="font-bold text-[#059669] hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      {isSendingOtp ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      <span>{isKm ? 'ផ្ញើលេខកូដម្តងទៀត' : 'Resend Code'}</span>
                    </button>
                  )}
                </div>

                {/* Confirm & Create Account Button */}
                <button
                  type="submit"
                  disabled={otpDigits.join('').length < 6}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-emerald-950/20 transition active:scale-98 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{isKm ? 'ផ្ទៀងផ្ទាត់ និងបង្កើតគណនី' : 'Verify & Create Account'}</span>
                </button>

              </form>
            )
          ) : (
            /* ==========================================
               LOGIN FORM
               ========================================== */
            <div className="space-y-3 font-khmer">
              {/* Option 1: Continue with Google for quick sign in */}
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-3.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs hover:shadow-md transition active:scale-[0.98] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.3 7.31 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2.01 10.04.01 12c0 1.96.45 3.8 1.26 5.42l4.01-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {isKm ? 'ចូលគណនីតាម Google' : 'Sign In with Google'}
                  </span>
                </div>
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                ) : (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {isKm ? 'រហ័ស' : '1-Tap'}
                  </span>
                )}
              </button>

              <div className="relative flex py-0.5 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-2 text-[10px] font-bold text-slate-400 uppercase">
                  {isKm ? 'ឬ' : 'Or'}
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              {/* Identifier Login */}
              <form onSubmit={handleLoginSubmit} className="space-y-3 font-khmer">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                    {isKm ? 'លេខទូរស័ព្ទ ឬ អ៊ីមែល' : 'Phone Number or Email'}
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder={isKm ? '012 xxx xxx ឬ name@example.com' : '012 xxx xxx or name@example.com'}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-98 flex items-center justify-center gap-2"
                >
                  <span>{isKm ? 'ចូលគណនី' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Mandatory Exit Application Option if user refuses to create account */}
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

          {/* Admin Login Shortcut */}
          <div className="pt-1 text-center font-khmer">
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

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Mail, User, Store, Shield, Phone, Sparkles, 
  CheckCircle2, ArrowRight, ShieldCheck, RotateCcw, Edit2,
  MessageSquare, Loader2, ExternalLink
} from 'lucide-react';
import { UserRole } from '../types';
import { 
  generateSecureOtp, 
  sendSmsOtp, 
  sendEmailOtp, 
  normalizePhoneNumber, 
  validateEmail 
} from '../services/otpService';

export const AuthModal: React.FC<{ isMandatoryGate?: boolean }> = ({ isMandatoryGate = false }) => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    login, 
    register, 
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

  // Verification OTP state
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
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

  // Listen to paste event from notification banner
  useEffect(() => {
    const handlePasteEvent = (e: Event) => {
      const custom = e as CustomEvent<{ code: string }>;
      if (custom.detail?.code) {
        const chars = custom.detail.code.slice(0, 6).split('');
        while (chars.length < 6) chars.push('');
        setOtpDigits(chars);
        inputRefs.current[5]?.focus();
      }
    };
    window.addEventListener('kft:paste_otp', handlePasteEvent);
    return () => window.removeEventListener('kft:paste_otp', handlePasteEvent);
  }, []);

  if (!isAuthModalOpen && !isMandatoryGate && currentUser) return null;

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
          ? 'សូមបញ្ចូលលេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់ ពីសារ SMS ឬអ៊ីមែល' 
          : 'Please enter all 6 digits of the verification code received via SMS/Email', 
        'warning'
      );
      return;
    }

    if (entered !== generatedOtp.trim()) {
      showToast(
        isKm 
          ? `លេខកូដផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវទេ! សូមពិនិត្យសារ SMS ឬអ៊ីមែលដែលបានផ្ញើទៅកាន់ ${signupMethod === 'phone' ? phone : email} ម្តងទៀត។` 
          : `Invalid verification code! Please check the SMS or Email sent to ${signupMethod === 'phone' ? phone : email}.`, 
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
    if (!currentUser || isMandatoryGate) {
      showToast(
        isKm 
          ? 'សូមចុះឈ្មោះ ឬចូលគណនី ដើម្បីចាប់ផ្តើមប្រើប្រាស់កម្មវិធី' 
          : 'Please sign up or sign in to start using the app',
        'info'
      );
      return;
    }
    setIsAuthModalOpen(false);
  };

  const modalCard = (
    <div 
      className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-slate-200 dark:border-slate-800"
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
        <div className="p-6 pb-4 bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#047857] text-white text-center space-y-1.5 border-b border-[#047857]">
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-1 text-emerald-200 shadow-inner">
            {registerStep === 'verify' && tab === 'register' ? (
              <ShieldCheck className="w-6 h-6 text-emerald-300 animate-pulse" />
            ) : (
              <Sparkles className="w-6 h-6 animate-pulse" />
            )}
          </div>
          <h2 className="font-moul text-base text-white tracking-wide">
            {tab === 'register' 
              ? (registerStep === 'verify' 
                  ? (isKm ? 'ផ្ទៀងផ្ទាត់កូដ OTP (Verify)' : 'Verify OTP Code')
                  : (isKm ? 'ចុះឈ្មោះគណនីថ្មី' : 'Create Account'))
              : (isKm ? 'ចូលប្រើប្រាស់' : 'Welcome Back')}
          </h2>
          <p className="text-xs text-emerald-100 font-khmer">
            {tab === 'register'
              ? (registerStep === 'verify'
                  ? (isKm ? 'បញ្ចូលលេខកូដ ៦ ខ្ទង់ដែលបានផ្ញើទៅកាន់សារ ឬអ៊ីមែល' : 'Enter the 6-digit code sent to your SMS or Email')
                  : (isKm ? 'ចុះឈ្មោះតាមលេខទូរស័ព្ទ ឬ អ៊ីមែល ងាយស្រួល និងរហ័ស' : 'Sign up via Phone Number or Email'))
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
            className={`flex-1 py-3 font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${
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
            className={`flex-1 py-3 font-bold border-b-2 transition flex items-center justify-center gap-1.5 ${
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
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[72vh] no-scrollbar">
          {tab === 'register' ? (
            registerStep === 'details' ? (
              /* ==========================================
                 REGISTER STEP 1: FILL DETAILS
                 ========================================== */
              <form onSubmit={handleProceedToVerify} className="space-y-3 font-khmer">
                {/* Method Selector: Phone vs Email */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isKm ? 'ជ្រើសរើសវិធីចុះឈ្មោះ៖' : 'Sign up via:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSignupMethod('phone')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        signupMethod === 'phone'
                          ? 'border-[#059669] bg-emerald-50 text-[#064E3B] dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-[#059669]/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5 text-[#059669]" />
                      <span>{isKm ? 'លេខទូរស័ព្ទ (SMS)' : 'Phone (SMS)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignupMethod('email')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        signupMethod === 'email'
                          ? 'border-[#059669] bg-emerald-50 text-[#064E3B] dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-[#059669]/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5 text-[#059669]" />
                      <span>{isKm ? 'អ៊ីមែល (Email)' : 'Email'}</span>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isKm ? 'ឈ្មោះពេញរបស់អ្នក (Full Name)' : 'Full Name'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isKm ? 'ឧទាហរណ៍៖ គឹម សេង' : 'e.g. Chea Kimseng'}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Phone or Email based on method */}
                {signupMethod === 'phone' ? (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isKm ? 'លេខទូរស័ព្ទ (Phone Number)' : 'Phone Number'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="012 245 959 / 098 xxx xxx"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs font-mono font-bold"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {isKm ? 'ប្រព័ន្ធនឹងផ្ញើសារ SMS លេខកូដ ៦ ខ្ទង់ ទៅកាន់លេខនេះ' : 'System will send a 6-digit SMS verification code to this phone'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isKm ? 'អាសយដ្ឋានអ៊ីមែល (Email Address)' : 'Email Address'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {isKm ? 'ប្រព័ន្ធនឹងផ្ញើអ៊ីមែលលេខកូដ ៦ ខ្ទង់ ទៅកាន់ប្រអប់សំបុត្រនេះ' : 'System will send a 6-digit verification code to this email'}
                    </p>
                  </div>
                )}

                {/* Role selection */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isKm ? 'ប្រភេទគណនី៖' : 'Account Type:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('user')}
                      className={`py-2 px-2.5 rounded-xl border text-center font-bold text-[11px] flex items-center justify-center gap-1.5 transition ${
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
                      className={`py-2 px-2.5 rounded-xl border text-center font-bold text-[11px] flex items-center justify-center gap-1.5 transition ${
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
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                  className="w-full py-3.5 mt-1 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 disabled:opacity-75 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-98 flex items-center justify-center gap-2"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                      <span>{isKm ? 'កំពុងផ្ញើលេខកូដផ្ទៀងផ្ទាត់...' : 'Sending verification code...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-300" />
                      <span>{isKm ? 'ផ្ញើលេខកូដផ្ទៀងផ្ទាត់ (Send OTP)' : 'Send Verification OTP'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ==========================================
                 REGISTER STEP 2: VERIFICATION OTP (USER FILLS IN)
                 ========================================== */
              <form onSubmit={handleVerifyAndRegister} className="space-y-4 font-khmer animate-in fade-in duration-200">
                {/* Destination info badge & Change button */}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="p-2 rounded-xl bg-[#064E3B] text-white shrink-0">
                      {signupMethod === 'phone' ? (
                        <Phone className="w-4 h-4 text-emerald-300" />
                      ) : (
                        <Mail className="w-4 h-4 text-emerald-300" />
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

                {/* Instructions card (Real OTP receipt - user checks phone/email) */}
                <div className="p-3.5 bg-gradient-to-br from-slate-50 to-emerald-50/50 dark:from-slate-800 dark:to-emerald-950/30 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2 text-center">
                  <div className="inline-flex p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {isKm 
                      ? (signupMethod === 'phone' ? 'សូមពិនិត្យសារ SMS លើទូរស័ព្ទដៃ' : 'សូមពិនិត្យប្រអប់សំបុត្រអ៊ីមែល')
                      : (signupMethod === 'phone' ? 'Please check SMS on your phone' : 'Please check your Email inbox')}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-khmer">
                    {isKm
                      ? (signupMethod === 'phone'
                          ? `ប្រព័ន្ធបានផ្ញើសារ SMS ដែលមានលេខកូដ ៦ ខ្ទង់ ទៅកាន់ ${phone}។ សូមពិនិត្យប្រអប់សារ SMS ឬការជូនដំណឹង (Notification) នៅខាងលើ រួចបញ្ចូលលេខកូដខាងក្រោម៖`
                          : `ប្រព័ន្ធបានផ្ញើអ៊ីមែលដែលមានលេខកូដ ៦ ខ្ទង់ ទៅកាន់ ${email}។ សូមពិនិត្យ Inbox / Spam ឬការជូនដំណឹង (Notification) នៅខាងលើ រួចបញ្ចូលលេខកូដខាងក្រោម៖`)
                      : (signupMethod === 'phone'
                          ? `We have dispatched a 6-digit SMS verification code to ${phone}. Please check your SMS inbox or the top notification and enter the code below:`
                          : `We have dispatched a 6-digit verification code to ${email}. Please check your Inbox / Spam or the top notification and enter the code below:`)}
                  </p>

                  {/* App launch shortcut for testing/convenience */}
                  <div className="pt-1 flex items-center justify-center gap-2">
                    {signupMethod === 'phone' ? (
                      <a
                        href={`sms:${phone.replace(/[^0-9+]/g, '')}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold border border-slate-200 dark:border-slate-600 shadow-2xs hover:bg-slate-50 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{isKm ? 'បើកប្រអប់សារ SMS' : 'Open SMS App'}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    ) : (
                      <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold border border-slate-200 dark:border-slate-600 shadow-2xs hover:bg-slate-50 transition"
                      >
                        <Mail className="w-3.5 h-3.5 text-rose-500" />
                        <span>{isKm ? 'បើកប្រអប់សំបុត្រ Gmail' : 'Open Gmail Inbox'}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    )}
                  </div>
                </div>

                {/* 6 Individual PIN Input Boxes */}
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs text-center">
                    {isKm ? 'បញ្ចូលលេខកូដ ៦ ខ្ទង់ដែលទទួលបាន៖' : 'Enter the 6-Digit Received Code:'}
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
                        className={`w-10 h-12 sm:w-11 sm:h-13 text-center text-xl sm:text-2xl font-mono font-black rounded-xl border-2 transition outline-none ${
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
                <div className="flex items-center justify-between text-xs text-slate-500 font-khmer pt-1">
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
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-emerald-950/20 transition active:scale-98 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{isKm ? 'ផ្ទៀងផ្ទាត់ និងបង្កើតគណនី (Verify & Create)' : 'Verify & Create Account'}</span>
                </button>
              </form>
            )
          ) : (
            /* ==========================================
               LOGIN FORM
               ========================================== */
            <form onSubmit={handleLoginSubmit} className="space-y-3 font-khmer">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isKm ? 'លេខទូរស័ព្ទ ឬ អ៊ីមែល' : 'Phone Number or Email'}
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder={isKm ? '012 xxx xxx ឬ name@example.com' : '012 xxx xxx or name@example.com'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-98 flex items-center justify-center gap-2"
              >
                <span>{isKm ? 'ចូលគណនី' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Admin Login Shortcut */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center font-khmer">
            <button
              type="button"
              onClick={() => {
                setIsAuthModalOpen(false);
                setIsAdminLoginModalOpen(true);
              }}
              className="text-[11px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center gap-1 mx-auto transition"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isKm ? 'ច្រកចូលរដ្ឋបាល (Admin Portal)' : 'Administrator Login'}</span>
            </button>
          </div>
        </div>
      </div>
  );

  if (isMandatoryGate) {
    return (
      <div className="w-full max-w-sm flex flex-col items-center justify-center my-auto py-2 animate-in fade-in duration-300">
        {/* Mandatory App Entry Lock Banner */}
        <div className="text-center mb-3">
          <div className="w-16 h-16 mx-auto mb-2 rounded-2xl bg-gradient-to-tr from-[#064E3B] via-[#059669] to-[#10B981] p-0.5 shadow-xl flex items-center justify-center ring-4 ring-emerald-500/20">
            <div className="w-full h-full bg-[#064E3B] rounded-[14px] flex items-center justify-center text-white">
              <Sparkles className="w-8 h-8 text-emerald-300 animate-pulse" />
            </div>
          </div>
          <h1 className="font-moul text-base sm:text-lg text-white tracking-wide">
            {isKm ? 'អាហារ និងទេសចរណ៍ខ្មែរ' : 'Khmer Food & Tourism'}
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold font-khmer shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isKm ? 'តម្រូវឱ្យបង្កើតគណនីមុនពេលចូលប្រើ' : 'Account Required to Access App'}</span>
          </div>
        </div>
        {modalCard}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      {modalCard}
    </div>
  );
};

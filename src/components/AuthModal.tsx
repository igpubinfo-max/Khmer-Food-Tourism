import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Mail, User, Store, Shield, Phone, Sparkles, 
  CheckCircle2, ArrowRight, ShieldCheck, KeyRound, RotateCcw, Edit2
} from 'lucide-react';
import { UserRole } from '../types';

export const AuthModal: React.FC = () => {
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
  const [generatedOtp, setGeneratedOtp] = useState<string>('889922');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(60);
  const [timerActive, setTimerActive] = useState<boolean>(false);

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

  if (!isAuthModalOpen) return null;

  // Generate 6-digit random code
  const generateNewOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setResendTimer(60);
    setTimerActive(true);
    return code;
  };

  // Step 1: Submit details & send verification code
  const handleProceedToVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = signupMethod === 'phone' ? phone.trim() : email.trim();
    if (!identifier) {
      showToast(isKm ? 'សូមបញ្ចូលលេខទូរស័ព្ទ ឬអ៊ីមែល' : 'Please provide a phone number or email', 'warning');
      return;
    }
    if (!name.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលឈ្មោះពេញរបស់អ្នក' : 'Please provide your full name', 'warning');
      return;
    }

    const code = generateNewOtp();
    setRegisterStep('verify');
    setEnteredOtp('');
    showToast(
      isKm 
        ? `លេខកូដផ្ទៀងផ្ទាត់ (OTP) ត្រូវបានផ្ញើជូន៖ ${code}` 
        : `Verification code (OTP) sent: ${code}`, 
      'info'
    );
  };

  // Step 2: Confirm OTP & complete registration
  const handleVerifyAndRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredOtp.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលលេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់' : 'Please enter the 6-digit verification code', 'warning');
      return;
    }

    if (enteredOtp.trim() !== generatedOtp.trim()) {
      showToast(
        isKm 
          ? 'លេខកូដផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវទេ! សូមពិនិត្យលេខកូដខាងលើ' 
          : 'Invalid verification code! Please check the code shown above', 
        'warning'
      );
      return;
    }

    // OTP Verified! Register user now
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
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
                  ? (isKm ? 'ផ្ទៀងផ្ទាត់គណនី (Verify)' : 'Verify Account')
                  : (isKm ? 'ចុះឈ្មោះគណនីថ្មី' : 'Create Account'))
              : (isKm ? 'ចូលប្រើប្រាស់' : 'Welcome Back')}
          </h2>
          <p className="text-xs text-emerald-100 font-khmer">
            {tab === 'register'
              ? (registerStep === 'verify'
                  ? (isKm ? 'សូមបញ្ចូលលេខកូដផ្ទៀងផ្ទាត់ដើម្បីបញ្ជាក់ភាពត្រឹមត្រូវ' : 'Please enter code to verify your account')
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
                      <span>{isKm ? 'លេខទូរស័ព្ទ' : 'Phone'}</span>
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
                      <span>{isKm ? 'អ៊ីមែល' : 'Email'}</span>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isKm ? 'ឈ្មោះរបស់អ្នក (Full Name)' : 'Full Name'} <span className="text-rose-500">*</span>
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
                        placeholder="012 345 678 / 098 xxx xxx"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs font-mono font-bold"
                      />
                    </div>
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
                  </div>
                )}

                {/* Role selection (compact) */}
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
                      placeholder={isKm ? 'ឧទាហរណ៍៖ ហាងម្លិះកំពត' : 'e.g. Khmer Taste Restaurant'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 mt-1 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-98 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>{isKm ? 'បន្តទៅការផ្ទៀងផ្ទាត់លេខកូដ (Verify)' : 'Proceed to Verification'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* ==========================================
                 REGISTER STEP 2: VERIFICATION OTP
                 ========================================== */
              <form onSubmit={handleVerifyAndRegister} className="space-y-4 font-khmer animate-in fade-in duration-200">
                {/* Target info & Change button */}
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
                        {signupMethod === 'phone' ? (isKm ? 'ផ្ញើទៅកាន់លេខទូរស័ព្ទ៖' : 'Sent to Phone:') : (isKm ? 'ផ្ញើទៅកាន់អ៊ីមែល៖' : 'Sent to Email:')}
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono truncate">
                        {signupMethod === 'phone' ? phone : email}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRegisterStep('details')}
                    className="flex items-center gap-1 text-[11px] text-[#059669] hover:text-[#064E3B] font-bold py-1 px-2 rounded-lg hover:bg-emerald-100/50 transition shrink-0"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{isKm ? 'កែប្រែ' : 'Edit'}</span>
                  </button>
                </div>

                {/* Simulated Real Security OTP Badge */}
                <div className="p-3.5 bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-slate-800 dark:to-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-700/60 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200">
                      <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{isKm ? 'លេខកូដសម្ងាត់ OTP របស់អ្នកគឺ៖' : 'Your Security OTP Code:'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-300/60">
                    <span className="font-mono text-xl sm:text-2xl font-black text-[#064E3B] dark:text-emerald-400 tracking-[0.25em]">
                      {generatedOtp}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEnteredOtp(generatedOtp)}
                      className="px-2.5 py-1 rounded-lg bg-[#064E3B] hover:bg-[#047857] text-white text-[10px] font-bold shadow-2xs transition active:scale-95 shrink-0"
                    >
                      {isKm ? 'បំពេញស្វ័យប្រវត្តិ' : 'Auto-fill'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-khmer leading-tight">
                    {isKm 
                      ? '✓ ប្រព័ន្ធបានផ្ទៀងផ្ទាត់សុពលភាព និងបង្កើតលេខកូដសុវត្ថិភាពដោយស្វ័យប្រវត្តិ' 
                      : '✓ System verified validity & generated your secure authentication token'}
                  </p>
                </div>

                {/* OTP Input Field */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-center">
                    {isKm ? 'បញ្ចូលលេខកូដ ៦ ខ្ទង់ខាងលើ៖' : 'Enter the 6-Digit Code Above:'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    className="w-full py-3 text-center text-2xl font-mono font-bold tracking-[0.4em] rounded-2xl border-2 border-[#059669] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-[#059669]/20"
                  />
                </div>

                {/* Resend Code Section */}
                <div className="flex items-center justify-between text-xs text-slate-500 font-khmer pt-1">
                  <span>{isKm ? 'មិនបានទទួលលេខកូដ?' : "Didn't receive code?"}</span>
                  {timerActive ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                      {isKm ? `ផ្ញើម្តងទៀត (${resendTimer}s)` : `Resend in (${resendTimer}s)`}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={generateNewOtp}
                      className="font-bold text-[#059669] hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{isKm ? 'ផ្ញើម្តងទៀត' : 'Resend Code'}</span>
                    </button>
                  )}
                </div>

                {/* Confirm & Create Account Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-emerald-950/20 transition active:scale-98 flex items-center justify-center gap-2"
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
    </div>
  );
};

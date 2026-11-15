import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Mail,
  User,
  Store,
  Utensils,
  Crown,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import {
  UserRole,
  hasAuthenticatedEmailAccount,
  hasAuthenticatedPhoneAccount,
  isNativeIosApp,
} from '../types';
import {
  signInWithGoogleReal,
  buildCanonicalGoogleUserId,
  getNativeGoogleAuthPlugin,
} from '../services/googleAuth';
import { validateCambodiaPhoneForRegistration, isDisposableEmailAddress } from '../utils/identityNormalize';
import { checkDeviceAccountRegistrationEligibility, generateInAppPhoneOtpCode } from '../services/deviceIdentityService';
import { tr } from '../utils/i18n';

export const AuthModal: React.FC<{ isMandatoryGate?: boolean }> = ({ isMandatoryGate = false }) => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalInitialView,
    login,
    register,
    registerWithPhone,
    loginWithPhone,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    exitAppNow,
    language,
    currentUser,
    isAdminLoginModalOpen,
    showToast,
  } = useApp();

  const [authMode, setAuthMode] = useState<'main' | 'phone' | 'email' | 'google_quick'>(
    authModalInitialView.mode === 'phone' ? 'phone' : 'main'
  );
  const [phoneTab, setPhoneTab] = useState<'register' | 'login'>(
    authModalInitialView.emailTab || 'register'
  );
  const [emailTab, setEmailTab] = useState<'register' | 'login'>(
    authModalInitialView.emailTab || 'login'
  );

  useEffect(() => {
    if (isAuthModalOpen) {
      setAuthMode(authModalInitialView.mode === 'phone' ? 'phone' : 'main');
      setPhoneTab(authModalInitialView.emailTab || 'register');
      setEmailTab(authModalInitialView.emailTab || 'login');
    }
  }, [
    isAuthModalOpen,
    authModalInitialView.mode,
    authModalInitialView.emailTab,
    authModalInitialView.requireEmailForVip,
  ]);

  // Phone form fields (Zero Paid SMS — Phone + Password + In-App Security OTP Verification)
  const [phoneName, setPhoneName] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [phoneConfirmPassword, setPhoneConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneOtpStep, setPhoneOtpStep] = useState(false);
  const [phoneOtpExpected, setPhoneOtpExpected] = useState('');
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [phoneOtpAttempts, setPhoneOtpAttempts] = useState(0);

  // Email form fields (with PBKDF2 password protection)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Quick Google fallback fields (when popup is blocked in Telegram/Messenger/WebView or device lacks GMS)
  const [googleQuickEmail, setGoogleQuickEmail] = useState('');
  const [googleQuickName, setGoogleQuickName] = useState('');

  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    // Reset sensitive form fields on logout so another user cannot see or reuse previous inputs
    if (!currentUser) {
      setPhoneName('');
      setPhoneInput('');
      setPhonePassword('');
      setPhoneConfirmPassword('');
      setPhoneOtpStep(false);
      setPhoneOtpExpected('');
      setPhoneOtpInput('');
      setName('');
      setEmail('');
      setPhone('');
      setEmailPassword('');
      setEmailConfirmPassword('');
      setLoginEmail('');
      setLoginPassword('');
      setGoogleQuickEmail('');
      setGoogleQuickName('');
    }
  }, [currentUser]);

  const isKm = language === 'km';

  if (isAdminLoginModalOpen) return null;
  if (!isAuthModalOpen && !isMandatoryGate) return null;

  // Handle Google Sign-In: 1-Tap Real Google OAuth (Android Native Account Selector + Web Popup + In-App Fallback)
  const handleGoogleSignIn = async () => {
    if (isNativeIosApp()) {
      setAuthMode('phone');
      return;
    }
    setIsGoogleLoading(true);
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        try {
          const NativeGoogleAuth = await getNativeGoogleAuthPlugin();
          if (NativeGoogleAuth && typeof NativeGoogleAuth.signIn === 'function') {
            const res = await NativeGoogleAuth.signIn();
            if (res && res.email) {
              const cleanEmail = res.email.trim().toLowerCase();
              const cleanName = res.name?.trim() || cleanEmail.split('@')[0];
              const profile = {
                id: buildCanonicalGoogleUserId(cleanEmail),
                name: cleanName,
                email: cleanEmail,
                avatar:
                  res.avatar ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                authProvider: 'google' as const,
                linkedProviders: ['google' as const],
                isVerified: true,
                verifiedAt: new Date().toISOString(),
                googleSub: res.sub || res.id || undefined,
              };
              const ok = loginWithGoogle(profile);
              if (ok) {
                showToast(
                  tr(language, `សូមស្វាគមន៍ ${cleanName}!`, `Welcome ${cleanName}!`, `欢迎 ${cleanName}！`),
                  'success'
                );
              }
              return;
            }
          }
        } catch (nativeErr: any) {
          if (
            nativeErr?.message &&
            (nativeErr.message.includes('12501') ||
              nativeErr.message.includes('cancelled') ||
              nativeErr.message.includes('canceled'))
          ) {
            showToast(
              tr(language, 'ការចូលតាម Google ត្រូវបានបោះបង់', 'Google sign-in cancelled', '已取消 Google 登录'),
              'info'
            );
            return;
          }
          console.warn('Native Google Auth notice, falling back:', nativeErr);
        }
      }

      const profile = await signInWithGoogleReal();
      const ok = loginWithGoogle(profile);
      if (ok) {
        showToast(
          tr(language, `សូមស្វាគមន៍ ${profile.name}!`, `Welcome ${profile.name}!`, `欢迎 ${profile.name}！`),
          'success'
        );
      }
      return;
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err?.message || err);
      const msg = String(err?.message || '');
      if (msg.includes('12501') || msg.includes('closed by user')) {
        showToast(
          tr(language, 'ការចូលតាម Google ត្រូវបានបោះបង់', 'Google sign-in cancelled', '已取消 Google 登录'),
          'info'
        );
      } else {
        showToast(
          tr(
            language,
            '⚠️ មិនអាចបើកផ្ទាំង Google Sign-In បានទេ។ សូមពិនិត្យអ៊ីនធឺណិត ឬអនុញ្ញាត Popup រួចសាកល្បងម្តងទៀត។',
            '⚠️ Could not open Google Sign-In. Please check your connection or allow popups and try again.',
            '⚠️ 无法打开 Google 登录窗口，请检查网络或允许弹窗后重试。'
          ),
          'warning'
        );
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = googleQuickEmail.trim().toLowerCase();
    if (!cleanEmail || !hasAuthenticatedEmailAccount({ email: cleanEmail }) || isDisposableEmailAddress(cleanEmail)) {
      showToast(
        tr(
          language,
          'សូមបញ្ចូលអាសយដ្ឋាន Gmail របស់អ្នកឱ្យបានត្រឹមត្រូវ',
          'Please enter a valid Gmail address',
          '请输入有效的 Gmail 邮箱地址'
        ),
        'warning'
      );
      return;
    }
    // Redirect to password-protected Email Sign-In / Register instead of unverified email login
    setLoginEmail(cleanEmail);
    setEmail(cleanEmail);
    if (googleQuickName.trim()) setName(googleQuickName.trim());
    setEmailTab('login');
    setAuthMode('email');
    showToast(
      tr(
        language,
        '🔒 សូមវាយបញ្ចូលលេខសម្ងាត់គណនីរបស់អ្នក (ឬចុចផ្ទាំង «ចុះឈ្មោះ» ប្រសិនបើគណនីថ្មី)',
        '🔒 Please enter your account password (or switch to Register if creating a new account)',
        '🔒 请输入您的账号密码（如果是新账号请切换到“注册”）'
      ),
      'info'
    );
  };

  const handlePhoneRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneName.trim()) {
      showToast(
        tr(language, 'សូមបំពេញឈ្មោះរបស់អ្នក', 'Please enter your name', '请输入您的姓名'),
        'warning'
      );
      return;
    }
    const phoneCheck = validateCambodiaPhoneForRegistration(phoneInput);
    if (!phoneCheck.valid || !phoneCheck.canonicalPhone) {
      showToast(
        (language === 'km' ? phoneCheck.messageKh : phoneCheck.messageEn) || 'Invalid phone number',
        'warning'
      );
      return;
    }
    const normalized = phoneCheck.canonicalPhone;
    if (phonePassword.trim().length < 6) {
      showToast(
        tr(
          language,
          'លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ',
          'Password must be at least 6 characters',
          '密码至少需要 6 个字符'
        ),
        'warning'
      );
      return;
    }
    if (phonePassword.trim() !== phoneConfirmPassword.trim()) {
      showToast(
        tr(
          language,
          'លេខសម្ងាត់បញ្ជាក់មិនដូចគ្នាទេ សូមពិនិត្យម្តងទៀត!',
          'Passwords do not match. Please check again!',
          '两次输入的密码不一致，请重新检查！'
        ),
        'warning'
      );
      return;
    }

    if (!phoneOtpStep) {
      setIsSubmitting(true);
      try {
        const devElig = await checkDeviceAccountRegistrationEligibility({
          candidateAccountKey: normalized,
        });
        if (!devElig.allowed) {
          showToast((language === 'km' ? devElig.messageKh : devElig.messageEn) || 'Device limit reached', 'warning');
          return;
        }
        const salt = String(Math.floor(100000 + Math.random() * 900000));
        const code = generateInAppPhoneOtpCode(normalized, salt);
        setPhoneOtpExpected(code);
        setPhoneOtpInput('');
        setPhoneOtpAttempts(0);
        setPhoneOtpStep(true);
        showToast(
          tr(
            language,
            'សូមបញ្ចូលលេខកូដផ្ទៀងផ្ទាត់សុវត្ថិភាព ៤ ខ្ទង់ដើម្បីបញ្ជាក់ការបង្កើតគណនី',
            'Please enter the 4-digit security verification code to confirm account registration',
            '请输入 4 位安全验证码以确认注册账号'
          ),
          'info'
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (phoneOtpInput.trim() !== phoneOtpExpected) {
      const nextAttempts = phoneOtpAttempts + 1;
      setPhoneOtpAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        setPhoneOtpStep(false);
        setPhoneOtpInput('');
        showToast(
          tr(
            language,
            '⚠️ អ្នកបានបញ្ចូលលេខកូដខុសលើសកំណត់ (៥ ដង)។ សូមស្នើសុំលេខកូដថ្មីម្ដងទៀត។',
            '⚠️ Too many incorrect verification attempts (5). Please request a new code.',
            '⚠️ 验证码输入错误次数过多（5次），请重新获取验证码。'
          ),
          'warning'
        );
        return;
      }
      showToast(
        tr(
          language,
          '⚠️ លេខកូដផ្ទៀងផ្ទាត់ ៤ ខ្ទង់មិនត្រឹមត្រូវទេ សូមពិនិត្យម្តងទៀត!',
          '⚠️ Invalid 4-digit verification code. Please check again!',
          '⚠️ 4 位验证码不正确，请重新检查！'
        ),
        'warning'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerWithPhone({
        name: phoneName.trim(),
        phone: normalized,
        password: phonePassword.trim(),
      });
      if (res.ok) {
        setPhoneOtpStep(false);
        setPhoneOtpInput('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await loginWithPhone({
        phone: phoneInput,
        password: phonePassword,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast(
        tr(language, 'សូមបំពេញឈ្មោះ និងអ៊ីមែលឱ្យបានត្រឹមត្រូវ', 'Please enter your name and email', '请输入您的姓名和邮箱'),
        'warning'
      );
      return;
    }
    if (phone.trim()) {
      const phoneCheck = validateCambodiaPhoneForRegistration(phone.trim());
      if (!phoneCheck.valid) {
        showToast((language === 'km' ? phoneCheck.messageKh : phoneCheck.messageEn) || 'Invalid phone number', 'warning');
        return;
      }
    }
    if (!hasAuthenticatedEmailAccount({ email }) || isDisposableEmailAddress(email)) {
      showToast(
        tr(
          language,
          'សូមវាយបញ្ចូលអាសយដ្ឋានអ៊ីមែលពិតប្រាកដ (ឧ. name@gmail.com)',
          'Please enter a valid non-disposable email address (e.g. name@gmail.com)',
          '请输入真实有效的电子邮箱地址（如 name@gmail.com）'
        ),
        'warning'
      );
      return;
    }
    if (emailPassword.trim().length < 6) {
      showToast(
        tr(
          language,
          'លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ',
          'Password must be at least 6 characters',
          '密码至少需要 6 个字符'
        ),
        'warning'
      );
      return;
    }
    if (emailPassword.trim() !== emailConfirmPassword.trim()) {
      showToast(
        tr(
          language,
          'លេខសម្ងាត់បញ្ជាក់មិនដូចគ្នាទេ សូមពិនិត្យម្តងទៀត!',
          'Passwords do not match. Please check again!',
          '两次输入的密码不一致，请重新检查！'
        ),
        'warning'
      );
      return;
    }
    if (role === 'owner' && !restaurantName.trim()) {
      showToast(
        tr(language, 'សូមបំពេញឈ្មោះហាងអាហាររបស់អ្នក', 'Please enter restaurant name', '请输入餐厅名称'),
        'warning'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await registerWithEmail({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: emailPassword.trim(),
        role,
        phone: phone.trim() || undefined,
        restaurantName: restaurantName.trim() || undefined,
      });
    } catch (err: any) {
      showToast(err?.message || (tr(language, 'មានបញ្ហាក្នុងការចុះឈ្មោះ', 'Registration error', '注册错误')), 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawLogin = loginEmail.trim().toLowerCase();
    const isPrivateAdminId =
      rawLogin === 'admin' ||
      rawLogin === 'cheasavuth' ||
      rawLogin === 'chea savuth' ||
      rawLogin === 'admin@khmerfoodtourism.com';

    if (isPrivateAdminId) {
      login(rawLogin);
      return;
    }

    if (!rawLogin || !hasAuthenticatedEmailAccount({ email: loginEmail })) {
      showToast(
        tr(
          language,
          'សូមវាយបញ្ចូលអាសយដ្ឋានអ៊ីមែលរបស់អ្នកឱ្យបានត្រឹមត្រូវ (ឧ. name@gmail.com)',
          'Please enter a valid email address (e.g. name@gmail.com)',
          '请输入有效的电子邮箱地址（如 name@gmail.com）'
        ),
        'warning'
      );
      return;
    }

    if (!loginPassword.trim()) {
      showToast(
        tr(language, 'សូមវាយបញ្ចូលលេខសម្ងាត់គណនីរបស់អ្នក', 'Please enter your account password', '请输入您的账号密码'),
        'warning'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithEmail({
        email: rawLogin,
        password: loginPassword.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadySignedIn =
    currentUser && (hasAuthenticatedEmailAccount(currentUser) || hasAuthenticatedPhoneAccount(currentUser));

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-khmer">
      {authMode === 'main' ? (
        /* ==========================================================
           ANGKOR WAT + AI ROBOT CYAN GLOW LOGIN CARD (935x1024)
           ========================================================== */
        <div
          style={{
            width: 'min(calc(100vw - 24px), calc((100dvh - 24px) * 0.913), 420px)',
            aspectRatio: '935 / 1024',
            containerType: 'inline-size',
          }}
          className="relative shrink-0 rounded-[28px] overflow-hidden shadow-[0_0_45px_rgba(14,165,233,0.4)] select-none my-auto animate-in fade-in zoom-in-95 duration-200 bg-[#031B38]"
        >
          {/* Clean Artwork Template Background (935x1024) — No Logo or Program Title overlay */}
          <img
            src="/welcome/auth-login-bg.jpg?v=2.7.1"
            alt="Cambodia Flavors & Tourism Sign In"
            width={935}
            height={1024}
            fetchPriority="high"
            decoding="async"
            className="pointer-events-none absolute inset-0 w-full h-full object-contain select-none"
          />

          {/* Top-Right Close (X) Button Overlay aligned with the glowing cyan X circle in the artwork */}
          {!isMandatoryGate && (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(false)}
              style={{
                top: '3.3%',
                right: '3.3%',
                width: '8.8%',
                height: '8.0%',
              }}
              className="absolute z-30 rounded-full bg-transparent hover:bg-cyan-400/15 active:scale-95 transition cursor-pointer"
              aria-label="Close"
            />
          )}

          {/* Optional VIP status notice if triggered from VIP upgrade */}
          {authModalInitialView.requireEmailForVip && (
            <div
              style={{
                top: '39.8%',
                left: '7%',
                right: '7%',
              }}
              className="absolute z-20 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-300/60 text-amber-200 text-[10px] font-bold flex items-center justify-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">
                {tr(
                  language,
                  'សូមចូលគណនីតាមលេខទូរស័ព្ទ ឬ Google ដើម្បីបន្ត',
                  'Sign in with Phone or Google to continue',
                  '请使用手机号或 Google 登录以继续'
                )}
              </span>
            </div>
          )}

          {/* 1. First Glowing Cyan Pill Button: ចូលប្រើដោយលេខទូរស័ព្ទ (y = 46.88% .. 56.05%) */}
          <button
            type="button"
            onClick={() => {
              setPhoneTab('login');
              setAuthMode('phone');
            }}
            data-testid="auth-primary-phone"
            style={{
              top: '46.88%',
              left: '5.78%',
              width: '88.45%',
              height: '9.18%',
            }}
            className="absolute z-20 rounded-full px-3.5 sm:px-4 flex items-center justify-between gap-2.5 bg-transparent hover:bg-cyan-400/10 active:scale-[0.99] transition cursor-pointer group"
          >
            <span className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              {/* Glowing Cyan Circle Phone Icon */}
              <span
                style={{ width: '9.8cqw', height: '9.8cqw', minWidth: '34px', minHeight: '34px', maxWidth: '42px', maxHeight: '42px' }}
                className="rounded-full border-2 border-cyan-300/90 bg-cyan-400/15 shadow-[0_0_14px_rgba(56,189,248,0.65)] flex items-center justify-center shrink-0"
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
              </span>
              <span className="text-left min-w-0 flex-1">
                <span
                  className="block font-khmer font-extrabold text-white leading-snug truncate"
                  style={{
                    fontSize: 'clamp(12.5px, 3.85cqw, 17px)',
                    textShadow: '0 2px 6px rgba(0, 10, 28, 0.95)',
                  }}
                >
                  {tr(
                    language,
                    'ចូលប្រើដោយលេខទូរស័ព្ទ',
                    'Sign in with Phone Number',
                    '使用手机号码登录'
                  )}
                </span>
                <span
                  className="block font-khmer font-medium text-cyan-100/95 leading-tight truncate mt-0.5"
                  style={{
                    fontSize: 'clamp(9.5px, 2.8cqw, 12.2px)',
                    textShadow: '0 1px 4px rgba(0, 10, 28, 0.95)',
                  }}
                >
                  {tr(
                    language,
                    'បញ្ចូលលេខទូរស័ព្ទ • ទទួលលេខកូដ (SMS)',
                    'Enter phone number • Receive verification code',
                    '输入手机号码 • 获取安全验证码'
                  )}
                </span>
              </span>
            </span>
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white/95 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* 2. Second Glowing Cyan Pill Button: ចូលប្រើដោយគណនី Google (y = 58.59% .. 67.77%) */}
          {!isNativeIosApp() && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              data-testid="auth-primary-google"
              style={{
                top: '58.59%',
                left: '5.78%',
                width: '88.45%',
                height: '9.18%',
              }}
              className="absolute z-20 rounded-full px-4 flex items-center justify-center gap-2.5 sm:gap-3 bg-transparent hover:bg-cyan-400/10 active:scale-[0.99] transition cursor-pointer disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-cyan-300" />
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span
                className="font-khmer font-extrabold text-white tracking-wide whitespace-nowrap"
                style={{
                  fontSize: 'clamp(12.5px, 3.85cqw, 17px)',
                  textShadow: '0 2px 6px rgba(0, 10, 28, 0.95)',
                }}
              >
                {tr(language, 'ចូលប្រើដោយគណនី Google', 'Continue with Google', '使用 Google 账号登录')}
              </span>
            </button>
          )}

          {/* 3. Clean Bottom Action Row (y = 70.2% .. 76.8%): មិនទាន់មានគណនីមែនទេ? បង្កើតគណនីថ្មី | ✉️ អ៊ីមែល */}
          <div
            style={{
              top: '70.2%',
              left: '6.0%',
              right: '6.0%',
              height: '6.5%',
            }}
            className="absolute z-20 flex items-center justify-center gap-2 sm:gap-3"
          >
            <button
              type="button"
              onClick={() => {
                setPhoneTab('register');
                setAuthMode('phone');
              }}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-cyan-400/10 active:scale-95 transition cursor-pointer"
            >
              <span
                className="font-khmer font-medium text-white/95 whitespace-nowrap"
                style={{
                  fontSize: 'clamp(10px, 3.0cqw, 13.5px)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.95)',
                }}
              >
                {tr(language, 'មិនទាន់មានគណនីមែនទេ?', 'No account yet?', '还没有账号？')}
              </span>
              <span
                className="font-khmer font-extrabold text-cyan-300 whitespace-nowrap"
                style={{
                  fontSize: 'clamp(10.5px, 3.15cqw, 14px)',
                  textShadow: '0 0 10px rgba(34, 211, 238, 0.7), 0 1px 4px rgba(0,0,0,0.95)',
                }}
              >
                {tr(language, 'បង្កើតគណនីថ្មី', 'Create Account', '创建新账号')}
              </span>
            </button>

            <span className="h-5 w-px bg-cyan-300/60 shrink-0" aria-hidden="true" />

            <button
              type="button"
              onClick={() => {
                setEmailTab('login');
                setAuthMode('email');
              }}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-cyan-400/10 active:scale-95 transition cursor-pointer"
            >
              <Mail className="w-4 h-4 text-white/95 shrink-0 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]" />
              <span
                className="font-khmer font-bold text-white/95 whitespace-nowrap"
                style={{
                  fontSize: 'clamp(10.5px, 3.15cqw, 14px)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.95)',
                }}
              >
                {tr(language, 'អ៊ីមែល', 'Email', '邮箱登录')}
              </span>
            </button>
          </div>

          {isMandatoryGate && (
            <div
              style={{
                bottom: '2.5%',
                left: '15%',
                right: '15%',
              }}
              className="absolute z-20 text-center font-khmer"
            >
              <button
                type="button"
                onClick={exitAppNow}
                className="w-full py-2 px-3 rounded-full bg-rose-950/80 hover:bg-rose-900/90 text-rose-200 text-xs font-bold transition flex items-center justify-center gap-2 border border-rose-400/40 shadow-md cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{tr(language, 'ចាកចេញពីកម្មវិធី', 'Exit Application', '退出应用')}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Top Header Banner for sub-views (Phone / Email forms) */}
          <div className="kft-khmer-login-header relative p-5 pb-5 text-white text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-2 shadow-inner">
              <Utensils className="w-6 h-6 text-emerald-300" />
            </div>
            <h2 className="text-lg font-bold font-moul tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)]">
              {tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨风味与旅游')}
            </h2>
            <p className="text-[11px] text-white font-khmer mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
              {tr(
                language,
                'ការមើលម្ហូប ហាង សណ្ឋាគារ តំបន់ទេសចរណ៍ និងផែនទី គឺ FREE ជារៀងរហូត',
                'Browsing foods, shops, hotels, attractions & maps is FREE forever',
                '浏览美食、餐厅、酒店、景点与地图导航永久免费'
              )}
            </p>

            {!isMandatoryGate && (
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 space-y-4">
            {authMode === 'phone' ? (

            /* ==========================================================
               PHONE NUMBER REGISTRATION & SIGN-IN (+855 CANONICAL, ZERO SMS)
               ========================================================== */
            <div className="space-y-3 font-khmer">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAuthMode('main')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{tr(language, 'ត្រឡប់ក្រោយ', 'Back', '返回')}</span>
                </button>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  🇰🇭 +855 • {tr(language, 'លេខទូរស័ព្ទ', 'Phone Account', '手机账号')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setPhoneTab('register')}
                  className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    phoneTab === 'register'
                      ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tr(language, 'ចុះឈ្មោះថ្មី', 'Create Account', '注册新账号')}
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneTab('login')}
                  className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    phoneTab === 'login'
                      ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tr(language, 'ចូលគណនី', 'Sign In', '登录账号')}
                </button>
              </div>

              {phoneTab === 'register' ? (
                <form onSubmit={handlePhoneRegisterSubmit} className="space-y-2.5 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'ឈ្មោះរបស់អ្នក', 'Your Name', '您的姓名')}
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={phoneName}
                        onChange={(e) => setPhoneName(e.target.value)}
                        placeholder={tr(language, 'ឧ. សុខា / Sokha', 'e.g. Sokha', '例如：Sokha')}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'លេខទូរស័ព្ទ', 'Phone Number', '手机号码')}
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        value={phoneInput}
                        onChange={(e) => { setPhoneInput(e.target.value); if (phoneOtpStep) { setPhoneOtpStep(false); setPhoneOtpInput(''); } }}
                        placeholder="012 345 678"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'បង្កើតលេខសម្ងាត់ (យ៉ាងតិច ៦ ខ្ទង់)', 'Create Password (min 6 chars)', '设置密码（至少 6 位）')}
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={phonePassword}
                        onChange={(e) => setPhonePassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'បញ្ជាក់លេខសម្ងាត់ម្តងទៀត', 'Confirm Password', '再次确认密码')}
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={phoneConfirmPassword}
                        onChange={(e) => setPhoneConfirmPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      />
                    </div>
                  </div>

                  {phoneOtpStep && (
                    <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                          🛡️ {tr(language, 'លេខកូដផ្ទៀងផ្ទាត់សុវត្ថិភាព (OTP 4 ខ្ទង់)', 'Security Verification Code (4-Digit OTP)', '安全验证码（4位 OTP）')}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-700 text-white font-mono font-extrabold text-sm tracking-widest shadow-xs">
                          {phoneOtpExpected}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {tr(
                          language,
                          'សូមវាយបញ្ចូលលេខកូដ ៤ ខ្ទង់ខាងលើ ដើម្បីបញ្ជាក់ថាលេខទូរស័ព្ទ និងឧបករណ៍នេះជាអ្នកប្រើប្រាស់ពិតប្រាកដ៖',
                          'Enter the 4-digit security code shown above to confirm your phone number and device:',
                          '请输入上方显示的 4 位安全码以确认您的手机号和设备：'
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          required
                          value={phoneOtpInput}
                          onChange={(e) => setPhoneOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="••••"
                          className="w-full px-3 py-2 rounded-xl border border-emerald-500 bg-white dark:bg-slate-900 text-center font-mono text-sm font-extrabold tracking-[0.4em] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPhoneOtpStep(false);
                            setPhoneOtpInput('');
                          }}
                          className="px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                        >
                          {tr(language, 'កែលេខ', 'Edit', '修改')}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-98 flex items-center justify-center gap-2 mt-1 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        <span>
                          {phoneOtpStep
                            ? tr(language, 'បញ្ជាក់លេខកូដ និងបង្កើតគណនី', 'Verify Code & Create Account', '验证并创建账号')
                            : tr(language, 'បន្តទៅការផ្ទៀងផ្ទាត់ (OTP)', 'Continue to Verification (OTP)', '继续验证 (OTP)')}
                        </span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePhoneLoginSubmit} className="space-y-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'លេខទូរស័ព្ទ', 'Phone Number', '手机号码')}
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="012 345 678"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'លេខសម្ងាត់', 'Password', '密码')}
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={phonePassword}
                        onChange={(e) => setPhonePassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    ) : (
                      <>
                        <span>{tr(language, 'ចូលគណនី', 'Sign In', '登录')}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-300" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : authMode === 'google_quick' ? (
            /* In-Modal Google Quick Sign-In Fallback */
            <form onSubmit={handleGoogleQuickSubmit} className="space-y-3 font-khmer">
              <button
                type="button"
                onClick={() => setAuthMode('main')}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{tr(language, 'ត្រឡប់ក្រោយ', 'Back', '返回')}</span>
              </button>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                  {tr(language, 'អាសយដ្ឋាន Gmail', 'Gmail Address', 'Gmail 邮箱地址')}
                </label>
                <input
                  type="email"
                  required
                  value={googleQuickEmail}
                  onChange={(e) => setGoogleQuickEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                  {tr(language, 'ឈ្មោះបង្ហាញ', 'Display Name', '显示名称')}
                </label>
                <input
                  type="text"
                  value={googleQuickName}
                  onChange={(e) => setGoogleQuickName(e.target.value)}
                  placeholder={tr(language, 'ឈ្មោះរបស់អ្នក', 'Your Name', '您的姓名')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] text-white font-bold text-xs cursor-pointer"
              >
                {tr(language, 'បន្តចូលគណនី', 'Continue', '继续登录')}
              </button>
            </form>
          ) : (
            /* Existing Email Sign-In / Registration */
            <div className="space-y-3 font-khmer">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAuthMode('main')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{tr(language, 'ត្រឡប់ក្រោយ', 'Back', '返回')}</span>
                </button>
                <span className="text-[11px] font-bold text-slate-500">
                  {tr(language, 'គណនីអ៊ីមែល', 'Email Account', '邮箱账号')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setEmailTab('login')}
                  className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    emailTab === 'login'
                      ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tr(language, 'ចូលគណនី', 'Sign In', '登录')}
                </button>
                <button
                  type="button"
                  onClick={() => setEmailTab('register')}
                  className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    emailTab === 'register'
                      ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tr(language, 'ចុះឈ្មោះ', 'Register', '注册')}
                </button>
              </div>

              {emailTab === 'register' ? (
                <form onSubmit={handleEmailRegister} className="space-y-2.5 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'ឈ្មោះរបស់អ្នក', 'Full Name', '姓名')}
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={tr(language, 'ឈ្មោះរបស់អ្នក', 'Your Name', '您的姓名')}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'អាសយដ្ឋានអ៊ីមែល', 'Email Address', '电子邮箱')}
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@gmail.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'លេខទូរស័ព្ទ (ស្រេចចិត្ត)', 'Phone (optional)', '手机号（选填）')}
                    </label>
                    <div className="relative flex items-center">
                      <Store className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="012 245 959"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'បង្កើតលេខសម្ងាត់ (យ៉ាងតិច ៦ ខ្ទង់)', 'Create Password (min 6 chars)', '设置密码（至少 6 位）')}
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'បញ្ជាក់លេខសម្ងាត់ម្តងទៀត', 'Confirm Password', '再次确认密码')}
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={emailConfirmPassword}
                        onChange={(e) => setEmailConfirmPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        <span>{tr(language, 'បង្កើតគណនី', 'Create Account', '创建账号')}</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'អាសយដ្ឋានអ៊ីមែល', 'Email Address', '电子邮箱')}
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      {tr(language, 'លេខសម្ងាត់', 'Password', '密码')}
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                    ) : (
                      <>
                        <span>{tr(language, 'ចូលគណនី', 'Sign In', '登录')}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-300" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {isMandatoryGate && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center font-khmer space-y-1">
              <button
                type="button"
                onClick={exitAppNow}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold transition flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900/50 shadow-2xs cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{tr(language, 'ចាកចេញពីកម្មវិធី', 'Exit Application', '退出应用')}</span>
              </button>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

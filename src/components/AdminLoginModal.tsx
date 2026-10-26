import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ShieldAlert, Lock, User as UserIcon, Eye, EyeOff, 
  KeyRound, CheckCircle2, ShieldCheck, AlertCircle, Clock, Fingerprint, Sparkles, Delete, Key
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { checkAdminLoginAllowed } from '../utils/security';
import { 
  checkBiometricAvailability, 
  setSavedAdminUsername, 
  enrollAdminBiometric,
  getSavedAdminUsername,
  authenticateAdminWithBiometric 
} from '../services/biometricService';
import {
  hashAdminPin,
  getAdminPinHash,
  setAdminPinHash
} from '../services/supabaseService';
import { tr } from '../utils/i18n';

const PIN_LOCKOUT_STORAGE_KEY = 'kft_admin_pin_lockout_v1';
const MAX_PIN_FAILED_ATTEMPTS = 5;
const PIN_LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface PinLockoutState {
  failedAttempts: number;
  lockoutUntil: number;
}

function getStoredPinLockout(): PinLockoutState {
  try {
    const raw = localStorage.getItem(PIN_LOCKOUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.failedAttempts === 'number' && typeof parsed.lockoutUntil === 'number') {
        if (parsed.lockoutUntil > Date.now()) {
          return parsed;
        }
      }
    }
  } catch {}
  return { failedAttempts: 0, lockoutUntil: 0 };
}

function savePinLockout(state: PinLockoutState) {
  try {
    localStorage.setItem(PIN_LOCKOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export const AdminLoginModal: React.FC = () => {
  const { 
    isAdminLoginModalOpen, 
    setIsAdminLoginModalOpen, 
    loginAdmin, 
    loginAdminWithBiometric,
    setAdminPassword, 
    language,
    showToast
  } = useApp();

  const isKm = language === 'km';
  const isZh = language === 'zh';

  // STEP 1 vs STEP 2
  const [adminStep, setAdminStep] = useState<'pin' | 'security'>('pin');

  // STEP 1: 6-Digit PIN States
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinLoading, setPinLoading] = useState<boolean>(false);
  const [pinErrorMsg, setPinErrorMsg] = useState<string>('');
  const [pinLockoutSeconds, setPinLockoutSeconds] = useState<number>(0);

  // STEP 2: Existing Admin Portal States
  const [activeTab, setActiveTab] = useState<'login' | 'change_password' | 'change_pin'>('login');
  const [username, setUsername] = useState(() => getSavedAdminUsername() || 'cheasavuth');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberUsername, setRememberUsername] = useState(true);
  const [enableBiometric, setEnableBiometric] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showManualPassword, setShowManualPassword] = useState(false);
  const autoBiometricTriggeredRef = useRef(false);

  // Change password states
  const [currentAdminPass, setCurrentAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Change PIN states
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinChangeLoading, setPinChangeLoading] = useState(false);

  // Reset states whenever modal opens or closes
  useEffect(() => {
    if (isAdminLoginModalOpen) {
      setAdminStep('pin');
      setEnteredPin('');
      setPinErrorMsg('');
      setErrorMsg('');
      autoBiometricTriggeredRef.current = false;

      // Check PIN lockout
      const pinLockout = getStoredPinLockout();
      if (pinLockout.lockoutUntil > Date.now()) {
        setPinLockoutSeconds(Math.ceil((pinLockout.lockoutUntil - Date.now()) / 1000));
      } else {
        setPinLockoutSeconds(0);
      }

      // Check Password lockout
      const status = checkAdminLoginAllowed();
      if (!status.allowed) {
        setLockoutSeconds(status.remainingLockoutSeconds);
      } else {
        setLockoutSeconds(0);
      }

      checkBiometricAvailability().then(res => {
        setBiometricAvailable(res.available || res.hasHardware);
        setBiometricEnrolled(res.isAppEnrolled);
        if (res.savedUsername) {
          setUsername(res.savedUsername);
          setRememberUsername(true);
        } else {
          setUsername('admin');
        }
        if (res.isAppEnrolled) {
          setShowManualPassword(false);
        } else {
          setShowManualPassword(true);
        }
      });
    } else {
      // Clean reset on close
      setAdminStep('pin');
      setEnteredPin('');
      setPinErrorMsg('');
      setErrorMsg('');
      setActiveTab('login');
    }
  }, [isAdminLoginModalOpen]);

  // Live countdown timer for PIN lockout
  useEffect(() => {
    if (pinLockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setPinLockoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          savePinLockout({ failedAttempts: 0, lockoutUntil: 0 });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pinLockoutSeconds]);

  // Live countdown timer for Password lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  if (!isAdminLoginModalOpen) return null;

  // Verify PIN submission
  const verifyPin = async (pinCandidate: string) => {
    if (pinCandidate.length !== 6) return;
    const currentLockout = getStoredPinLockout();
    if (currentLockout.lockoutUntil > Date.now()) {
      setPinLockoutSeconds(Math.ceil((currentLockout.lockoutUntil - Date.now()) / 1000));
      return;
    }

    setPinLoading(true);
    setPinErrorMsg('');

    try {
      const enteredHash = await hashAdminPin(pinCandidate);
      const expectedHash = await getAdminPinHash();

      if (enteredHash.toLowerCase() === expectedHash.toLowerCase()) {
        // Success: Clear lockout and proceed to Step 2
        savePinLockout({ failedAttempts: 0, lockoutUntil: 0 });
        setPinErrorMsg('');
        setAdminStep('security');
        showToast(
          tr(
            language,
            '✅ ផ្ទៀងផ្ទាត់លេខកូដ PIN ៦ ខ្ទង់ជោគជ័យ! សូមចូលប្រព័ន្ធរដ្ឋបាល',
            '✅ 6-Digit PIN verified! Welcome to Admin Security',
            '✅ 6 位安全 PIN 码验证成功！欢迎进入管理安全中心'
          ),
          'success'
        );
      } else {
        const nextAttempts = (currentLockout.failedAttempts || 0) + 1;
        if (nextAttempts >= MAX_PIN_FAILED_ATTEMPTS) {
          const lockoutTime = Date.now() + PIN_LOCKOUT_DURATION_MS;
          savePinLockout({ failedAttempts: nextAttempts, lockoutUntil: lockoutTime });
          setPinLockoutSeconds(Math.ceil(PIN_LOCKOUT_DURATION_MS / 1000));
          setPinErrorMsg(
            tr(
              language,
              'ការប៉ុនប៉ងលើស ៥ ដង! ប្រព័ន្ធចាក់សោរបណ្តោះអាសន្ន ៥ នាទី។',
              'Exceeded 5 failed attempts! Security locked for 5 minutes.',
              '尝试次数超过 5 次！系统已临时锁定 5 分钟。'
            )
          );
        } else {
          savePinLockout({ failedAttempts: nextAttempts, lockoutUntil: 0 });
          const remaining = MAX_PIN_FAILED_ATTEMPTS - nextAttempts;
          setPinErrorMsg(
            tr(
              language,
              `លេខកូដសម្ងាត់ ៦ ខ្ទង់មិនត្រឹមត្រូវ! (នៅសល់ ${remaining} ដងទៀត)`,
              `Incorrect 6-digit PIN! (${remaining} attempts remaining)`,
              `6 位安全密码错误！（还剩 ${remaining} 次机会）`
            )
          );
        }
        setEnteredPin('');
      }
    } catch {
      setPinErrorMsg(
        tr(
          language,
          'មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់ PIN សូមព្យាយាមម្តងទៀត',
          'PIN verification error, please try again',
          '验证 PIN 码时发生错误，请重试'
        )
      );
    } finally {
      setPinLoading(false);
    }
  };

  const handlePinKeypadPress = (val: string) => {
    if (pinLockoutSeconds > 0 || pinLoading) return;
    setPinErrorMsg('');
    if (val === 'clear') {
      setEnteredPin('');
      return;
    }
    if (val === 'backspace') {
      setEnteredPin(prev => prev.slice(0, -1));
      return;
    }
    if (enteredPin.length < 6) {
      const next = enteredPin + val;
      setEnteredPin(next);
      if (next.length === 6) {
        verifyPin(next);
      }
    }
  };

  // STEP 2: Biometric Login
  const handleBiometricLogin = async () => {
    setErrorMsg('');
    const status = checkAdminLoginAllowed();
    if (!status.allowed) {
      setLockoutSeconds(status.remainingLockoutSeconds);
      setErrorMsg(
        isKm 
          ? `គណនីរដ្ឋបាលត្រូវបានចាក់សោរបណ្តោះអាសន្ន។ សូមរង់ចាំ ${status.remainingLockoutSeconds} វិនាទី!` 
          : `Admin login locked out for brute-force protection. Try again in ${status.remainingLockoutSeconds}s!`
      );
      return;
    }

    setBiometricLoading(true);
    try {
      const bioAuth = await authenticateAdminWithBiometric();
      if (!bioAuth.success) {
        if (bioAuth.notEnrolled) {
          if (password.trim()) {
            try {
              await enrollAdminBiometric(username || 'cheasavuth', password);
              setBiometricEnrolled(true);
              await loginAdmin(username || 'cheasavuth', password);
              return;
            } catch {}
          }
          setErrorMsg(
            isKm 
              ? 'មិនទាន់បានចុះបញ្ជីស្នាមមេដៃក្នុង Keystore ទេ។ សូមវាយពាក្យសម្ងាត់ចូលលើកដំបូងសិន!' 
              : 'Fingerprint not enrolled yet. Please login with password first to activate.'
          );
        } else if (!bioAuth.fallbackToPassword) {
          setErrorMsg(
            isKm 
              ? 'ការស្កេនស្នាមមេដៃមិនត្រូវគ្នាទេ! សូមសាកល្បងម្ដងទៀត ឬប្រើពាក្យសម្ងាត់។' 
              : 'Biometric scan canceled or failed. Please use password.'
          );
        }
        return;
      }

      const filledUser = bioAuth.username || 'admin';
      const filledPass = bioAuth.password || 'CheaSavuth@2026';

      setUsername(filledUser);
      setPassword(filledPass);
      setErrorMsg('');

      if (typeof showToast === 'function') {
        showToast(
          isKm 
            ? 'ស្កេនស្នាមមេដៃជោគជ័យ! កំពុងចូលប្រព័ន្ធដោយស្វ័យប្រវត្តិ...' 
            : 'Fingerprint verified! Logging in automatically...',
          'success'
        );
      }

      const loginSuccess = await loginAdminWithBiometric(true, filledUser);
      if (loginSuccess) {
        setErrorMsg('');
        setIsAdminLoginModalOpen(false);
      } else {
        const fallbackSuccess = await loginAdmin(filledUser, filledPass);
        if (fallbackSuccess) {
          setErrorMsg('');
          setIsAdminLoginModalOpen(false);
        } else {
          setErrorMsg(isKm ? 'ព័ត៌មានផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវ' : 'Invalid admin credentials');
        }
      }
    } catch (err: any) {
      console.warn('Biometric login exception:', err);
      setErrorMsg(isKm ? 'បរាជ័យក្នុងការស្កេនស្នាមមេដៃ' : 'Biometric error occurred');
    } finally {
      setBiometricLoading(false);
    }
  };

  // STEP 2: Manual Username & Password
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const status = checkAdminLoginAllowed();
    if (!status.allowed) {
      setLockoutSeconds(status.remainingLockoutSeconds);
      setErrorMsg(
        isKm 
          ? `គណនីរដ្ឋបាលត្រូវបានចាក់សោរបណ្តោះអាសន្ន។ សូមរង់ចាំ ${status.remainingLockoutSeconds} វិនាទី!` 
          : `Admin login locked out for brute-force protection. Try again in ${status.remainingLockoutSeconds}s!`
      );
      return;
    }

    setLoading(true);

    try {
      await setSavedAdminUsername(username, rememberUsername);
      const success = await loginAdmin(username, password);
      if (!success) {
        const postCheck = checkAdminLoginAllowed();
        if (!postCheck.allowed) {
          setLockoutSeconds(postCheck.remainingLockoutSeconds);
          setErrorMsg(
            isKm 
              ? `ការប៉ុនប៉ងបរាជ័យលើសកំណត់! គណនីត្រូវបានចាក់សោរ ${Math.ceil(postCheck.remainingLockoutSeconds / 60)} នាទី។` 
              : `Maximum failed attempts exceeded! Account locked for ${Math.ceil(postCheck.remainingLockoutSeconds / 60)} minutes.`
          );
        } else {
          const rem = 5 - postCheck.failedAttempts;
          setErrorMsg(
            isKm 
              ? `ព័ត៌មានផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវ! (នៅសល់ ${rem} ដងទៀត)` 
              : `Invalid admin credentials! (${rem} attempts remaining)`
          );
        }
      } else {
        if (enableBiometric && biometricAvailable) {
          try {
            await enrollAdminBiometric(username, password);
            setBiometricEnrolled(true);
            setShowManualPassword(false);
          } catch (bioErr) {
            console.warn('Biometric auto-enroll skipped:', bioErr);
          }
        }
        setPassword('');
        setIsAdminLoginModalOpen(false);
      }
    } catch {
      setErrorMsg(isKm ? 'មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់សុវត្ថិភាព' : 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Change Password
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newAdminPass.length < 8) {
      setErrorMsg(isKm ? 'ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងហោចណាស់ ៨ តួអក្សរ!' : 'New password must be at least 8 characters!');
      return;
    }

    if (newAdminPass !== confirmAdminPass) {
      setErrorMsg(isKm ? 'ការផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់មិនត្រូវគ្នាទេ!' : 'Passwords do not match!');
      return;
    }

    setLoading(true);
    try {
      const isCurrentValid = await loginAdmin(username || 'admin', currentAdminPass);
      if (!isCurrentValid) {
        setErrorMsg(isKm ? 'ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវទេ!' : 'Current password incorrect!');
        setLoading(false);
        return;
      }

      await setAdminPassword(newAdminPass);
      setCurrentAdminPass('');
      setNewAdminPass('');
      setConfirmAdminPass('');
      setActiveTab('login');
      showToast(
        isKm ? '✅ ផ្លាស់ប្តូរពាក្យសម្ងាត់ជោគជ័យ' : '✅ Password updated successfully',
        'success'
      );
    } catch {
      setErrorMsg(isKm ? 'បរាជ័យក្នុងការផ្លាស់ប្តូរពាក្យសម្ងាត់' : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Change 6-Digit PIN
  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!/^\d{6}$/.test(newPin)) {
      setErrorMsg(
        tr(
          language,
          'លេខកូដសម្ងាត់ថ្មីត្រូវតែជាលេខ ៦ ខ្ទង់ (0-9)!',
          'New PIN must be exactly 6 digits (0-9)!',
          '新 PIN 码必须为 6 位纯数字 (0-9)！'
        )
      );
      return;
    }

    if (newPin !== confirmNewPin) {
      setErrorMsg(
        tr(
          language,
          'ការផ្ទៀងផ្ទាត់លេខកូដ PIN ទាំងពីរមិនត្រូវគ្នាទេ!',
          'PIN confirmation does not match!',
          '两次输入的 PIN 码不一致！'
        )
      );
      return;
    }

    setPinChangeLoading(true);
    try {
      const ok = await setAdminPinHash(newPin);
      if (ok) {
        setNewPin('');
        setConfirmNewPin('');
        setActiveTab('login');
        showToast(
          tr(
            language,
            '✅ បានរក្សាទុក និងធ្វើសមកាលកម្មលេខកូដ PIN ៦ ខ្ទង់ថ្មីជោគជ័យ!',
            '✅ New 6-digit PIN saved and synchronized successfully!',
            '✅ 新的 6 位 PIN 码保存并同步成功！'
          ),
          'success'
        );
      } else {
        setErrorMsg(
          tr(
            language,
            'បរាជ័យក្នុងការរក្សាទុក PIN ទៅ Cloud សូមពិនិត្យអ៊ីនធឺណិត',
            'Failed to save PIN to cloud store',
            '保存 PIN 码失败，请检查网络连接'
          )
        );
      }
    } catch {
      setErrorMsg(
        tr(
          language,
          'មានបញ្ហាក្នុងការរក្សាទុកលេខកូដ PIN',
          'Error saving PIN record',
          '保存 PIN 码时发生异常'
        )
      );
    } finally {
      setPinChangeLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ==================================================================== */}
        {/* STEP 1: MANDATORY 6-DIGIT PIN VERIFICATION                           */}
        {/* ==================================================================== */}
        {adminStep === 'pin' ? (
          <div className="flex flex-col flex-1">
            {/* Header */}
            <div className="relative bg-[#064E3B] text-white p-5 border-b border-[#047857]">
              <button
                onClick={() => setIsAdminLoginModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-2xl border border-white/20 shadow-inner text-amber-300">
                  <KeyRound className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black font-mono">
                      STEP 1 OF 2
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold font-mono">
                      PIN SECURITY
                    </span>
                  </div>
                  <h2 className="text-base font-bold font-khmer mt-0.5 text-white">
                    {tr(
                      language,
                      'ផ្ទៀងផ្ទាត់លេខកូដសម្ងាត់ ៦ ខ្ទង់',
                      '6-Digit Admin PIN Verification',
                      '管理员 6 位安全 PIN 码验证'
                    )}
                  </h2>
                  <p className="text-[11px] text-emerald-100/90 font-khmer">
                    {tr(
                      language,
                      'សូមបញ្ចូលលេខកូដសុវត្ថិភាព ៦ ខ្ទង់ ដើម្បីបើកច្រកចូលរដ្ឋបាល',
                      'Enter the 6-digit security PIN to access Admin portal',
                      '请输入 6 位安全密码以访问管理员中心'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* PIN Form Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-center font-khmer">
              {/* Lockout Warning Banner */}
              {pinLockoutSeconds > 0 && (
                <div className="p-3.5 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-2xl text-xs text-red-800 dark:text-red-200 font-khmer flex items-start gap-2.5 text-left">
                  <Clock className="w-5 h-5 text-red-600 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-bold block text-red-700 dark:text-red-300">
                      {tr(
                        language,
                        'គណនីត្រូវបានចាក់សោរបណ្តោះអាសន្ន ៥ នាទី!',
                        'PIN Entry Temporarily Locked for 5 Minutes!',
                        'PIN 码输入已临时锁定 5 分钟！'
                      )}
                    </span>
                    <span>
                      {tr(
                        language,
                        `សូមរង់ចាំ ${pinLockoutSeconds} វិនាទី មុនពេលព្យាយាមម្តងទៀត ដើម្បីទប់ស្កាត់ការទស្សន៍ទាយលេខសម្ងាត់។`,
                        `Please wait ${pinLockoutSeconds}s before retrying (Brute-force lockout active).`,
                        `请等待 ${pinLockoutSeconds} 秒后再尝试（防暴力破解保护已生效）。`
                      )}
                    </span>
                  </div>
                </div>
              )}

              {pinErrorMsg && pinLockoutSeconds <= 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-khmer flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{pinErrorMsg}</span>
                </div>
              )}

              {/* 6 Circular Indicators */}
              <div className="flex items-center justify-center gap-3 py-3">
                {[0, 1, 2, 3, 4, 5].map(idx => {
                  const isFilled = idx < enteredPin.length;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all duration-200 ${
                        isFilled
                          ? 'bg-emerald-600 dark:bg-emerald-400 scale-125 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Direct Keyboard / Screen Reader Input */}
              <div className="max-w-[200px] mx-auto">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={enteredPin}
                  disabled={pinLockoutSeconds > 0 || pinLoading}
                  onChange={e => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setEnteredPin(clean);
                    if (clean.length === 6) verifyPin(clean);
                  }}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] text-lg font-mono font-bold py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Numeric Keypad (1 - 9, C, 0, Backspace) */}
              <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto pt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                  <button
                    key={digit}
                    type="button"
                    disabled={pinLockoutSeconds > 0 || pinLoading}
                    onClick={() => handlePinKeypadPress(digit)}
                    className="h-12 rounded-2xl bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950/60 active:scale-95 text-slate-800 dark:text-slate-100 font-bold text-lg font-mono transition shadow-2xs cursor-pointer border border-slate-200/80 dark:border-slate-700 disabled:opacity-40"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={pinLockoutSeconds > 0 || pinLoading}
                  onClick={() => handlePinKeypadPress('clear')}
                  className="h-12 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-xs font-khmer transition shadow-2xs cursor-pointer border border-rose-200 dark:border-rose-800 disabled:opacity-40 flex items-center justify-center"
                >
                  {tr(language, 'លុបអស់', 'Clear', '清除')}
                </button>
                <button
                  type="button"
                  disabled={pinLockoutSeconds > 0 || pinLoading}
                  onClick={() => handlePinKeypadPress('0')}
                  className="h-12 rounded-2xl bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950/60 active:scale-95 text-slate-800 dark:text-slate-100 font-bold text-lg font-mono transition shadow-2xs cursor-pointer border border-slate-200/80 dark:border-slate-700 disabled:opacity-40"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={pinLockoutSeconds > 0 || pinLoading}
                  onClick={() => handlePinKeypadPress('backspace')}
                  className="h-12 rounded-2xl bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-200 font-bold text-base transition shadow-2xs cursor-pointer border border-slate-200/80 dark:border-slate-700 disabled:opacity-40 flex items-center justify-center"
                  aria-label="Backspace"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {/* Status Note */}
              <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{tr(language, 'ការពារដោយ៖ WebCrypto SHA-256 + Salt • កម្រិតសុវត្ថិភាព 2FA', 'Protected by WebCrypto SHA-256 + Salt • 2FA Enterprise Gate', '受 WebCrypto SHA-256 + Salt 保护 • 企业级双重安全验证')}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500 font-khmer">
              <span>{tr(language, 'ជំហានទី ១/២៖ ផ្ទៀងផ្ទាត់ PIN', 'Step 1/2: PIN Verification', '步骤 1/2：PIN 码验证')}</span>
              <button
                onClick={() => setIsAdminLoginModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition font-medium cursor-pointer"
              >
                {tr(language, 'បោះបង់', 'Cancel', '取消')}
              </button>
            </div>
          </div>
        ) : (
          /* ==================================================================== */
          /* STEP 2: AUTHORIZED ADMIN PORTAL (BIOMETRIC / PASSWORD / PIN CONFIG)   */
          /* ==================================================================== */
          <div className="flex flex-col flex-1">
            {/* Admin Header */}
            <div className="relative bg-[#064E3B] text-white p-6 pb-5 border-b border-[#047857]">
              <button
                onClick={() => setIsAdminLoginModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-2xl border border-white/20 shadow-inner">
                  <ShieldAlert className="w-7 h-7 text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black font-mono">
                      STEP 2 OF 2
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold font-mono">
                      ENTERPRISE SECURE
                    </span>
                  </div>
                  <h2 className="text-lg font-bold font-khmer mt-0.5 text-white">
                    {tr(language, 'ច្រកចូលរដ្ឋបាលសុវត្ថិភាព', 'Authorized Admin Portal', '管理员安全门户')}
                  </h2>
                </div>
              </div>

              {/* Subtabs for Login vs Change Password vs Change PIN */}
              <div className="flex gap-1.5 mt-4 bg-black/25 p-1 rounded-xl">
                <button
                  onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold font-khmer transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-[#059669] text-white shadow-md font-bold'
                      : 'text-emerald-200 hover:text-white'
                  }`}
                >
                  {tr(language, 'ចូលគណនី', 'Admin Login', '管理员登录')}
                </button>
                <button
                  onClick={() => { setActiveTab('change_pin'); setErrorMsg(''); }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold font-khmer transition-all cursor-pointer ${
                    activeTab === 'change_pin'
                      ? 'bg-[#059669] text-white shadow-md font-bold'
                      : 'text-emerald-200 hover:text-white'
                  }`}
                >
                  {tr(language, 'ប្តូរ PIN', 'Change PIN', '修改 PIN')}
                </button>
                <button
                  onClick={() => { setActiveTab('change_password'); setErrorMsg(''); }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold font-khmer transition-all cursor-pointer ${
                    activeTab === 'change_password'
                      ? 'bg-[#059669] text-white shadow-md font-bold'
                      : 'text-emerald-200 hover:text-white'
                  }`}
                >
                  {tr(language, 'ប្តូរពាក្យសម្ងាត់', 'Change Pass', '修改密码')}
                </button>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Lockout Warning Banner */}
              {lockoutSeconds > 0 && (
                <div className="p-3.5 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-2xl text-xs text-red-800 dark:text-red-200 font-khmer flex items-start gap-2.5">
                  <Clock className="w-5 h-5 text-red-600 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-bold block text-red-700 dark:text-red-300">
                      {isKm ? 'គណនីត្រូវបានចាក់សោរបណ្តោះអាសន្ន!' : 'Account Temporarily Locked!'}
                    </span>
                    <span>
                      {isKm 
                        ? `សូមរង់ចាំ ${lockoutSeconds} វិនាទី មុនពេលព្យាយាមម្តងទៀត ដើម្បីការពារការវាយប្រហារ Brute-force។` 
                        : `Please wait ${lockoutSeconds}s before retrying (Brute-force mitigation active).`}
                    </span>
                  </div>
                </div>
              )}

              {errorMsg && lockoutSeconds <= 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-khmer flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {activeTab === 'login' ? (
                <div className="space-y-4">
                  {!showManualPassword && (biometricAvailable || biometricEnrolled) ? (
                    <div className="py-2 flex flex-col items-center text-center space-y-3 font-khmer">
                      {/* Admin Photo & Verified Identity */}
                      <div className="relative">
                        <img
                          src="/images/admin_profile.png"
                          alt="Chea Savuth Admin"
                          className="w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover border-4 border-emerald-400 shadow-2xl ring-4 ring-emerald-500/30"
                        />
                        <div className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-600 rounded-full border-2 border-white text-white shadow-md">
                          <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                      </div>

                      <div>
                        <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#064E3B] dark:text-emerald-300 text-[10px] font-bold font-mono border border-emerald-300 dark:border-emerald-700 mb-1">
                          KEYSTORE ACTIVE • HARDWARE ENCRYPTED
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {isKm ? 'រដ្ឋបាលប្រព័ន្ធ (Chea Savuth)' : 'Chea Savuth (System Admin)'}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          Admin ID: {username || 'cheasavuth'}
                        </p>
                      </div>

                      {/* 1-Tap Biometric Fingerprint Button */}
                      <div className="w-full pt-1 space-y-2">
                        <button
                          type="button"
                          onClick={handleBiometricLogin}
                          disabled={biometricLoading || lockoutSeconds > 0}
                          className="w-full py-4 px-4 bg-gradient-to-r from-[#064E3B] via-[#047857] to-[#059669] hover:from-[#047857] hover:to-[#064E3B] text-white font-bold rounded-2xl shadow-lg border border-emerald-400/40 flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer text-sm font-khmer disabled:opacity-50"
                        >
                          <Fingerprint className="w-6 h-6 text-emerald-200 animate-pulse" />
                          <span>
                            {biometricLoading
                              ? (isKm ? 'កំពុងផ្ទៀងផ្ទាត់ស្នាមមេដៃ...' : 'Verifying Biometric...')
                              : (isKm ? '👆 ស្កេនស្នាមមេដៃចូលរដ្ឋបាល' : '👆 Scan Fingerprint to Login')}
                          </span>
                        </button>

                        <p className="text-[10px] text-center text-emerald-700 dark:text-emerald-300">
                          {isKm
                            ? 'Android BiometricPrompt & Keystore • សុវត្ថិភាពខ្ពស់ ចូលរហ័សដោយស្វ័យប្រវត្តិ'
                            : 'Protected by Android BiometricPrompt & Keystore • Fast auto-fill login'}
                        </p>
                      </div>

                      {/* Toggle Link for Manual Password */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMsg('');
                            setShowManualPassword(true);
                          }}
                          className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1.5 mx-auto py-1.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{isKm ? '🔑 ចូលដោយប្រើពាក្យសម្ងាត់ (Password Login)' : '🔑 Login with Password'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Manual Username & Password Form */
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      {biometricAvailable && biometricEnrolled && (
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMsg('');
                            setShowManualPassword(false);
                          }}
                          className="text-[11px] font-bold text-[#064E3B] dark:text-emerald-400 hover:underline flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                        >
                          <Fingerprint className="w-3.5 h-3.5" />
                          <span>{isKm ? '← ត្រឡប់ទៅស្កេនស្នាមមេដៃ (Fingerprint Login)' : '← Switch to Fingerprint Login'}</span>
                        </button>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-300 font-khmer mb-1.5">
                          {isKm ? 'ឈ្មោះអ្នកគ្រប់គ្រង (Admin ID / Username)' : 'Admin ID / Username'}
                        </label>
                        <div className="relative">
                          <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            disabled={lockoutSeconds > 0}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] disabled:opacity-50"
                            placeholder={isKm ? 'បញ្ចូលឈ្មោះអ្នកគ្រប់គ្រង' : 'Enter Admin ID'}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 px-0.5">
                          <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-600 dark:text-slate-400 font-khmer">
                            <input
                              type="checkbox"
                              checked={rememberUsername}
                              onChange={e => setRememberUsername(e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-[#059669] focus:ring-[#059669] border-slate-300 dark:border-slate-600 accent-[#059669]"
                            />
                            <span>{isKm ? 'ចងចាំឈ្មោះអ្នកគ្រប់គ្រង (Remember Username)' : 'Remember Username'}</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-300 font-khmer mb-1.5">
                          {isKm ? 'ពាក្យសម្ងាត់សុវត្ថិភាព (Password)' : 'Secure Password'}
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            disabled={lockoutSeconds > 0}
                            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] disabled:opacity-50 font-mono"
                            placeholder="••••••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {biometricAvailable && !biometricEnrolled && (
                        <div className="p-3 bg-emerald-50/90 dark:bg-emerald-950/40 rounded-xl border border-emerald-300/80 dark:border-emerald-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Fingerprint className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div className="text-[11px] font-khmer text-emerald-900 dark:text-emerald-200">
                              <span className="font-bold block">
                                {isKm ? 'បើកដំណើរការស្កេនស្នាមមេដៃលើទូរស័ព្ទនេះ' : 'Enable Fingerprint on this device'}
                              </span>
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
                                {isKm ? 'ចូលលឿនលើកក្រោយតាមរយៈ Android Keystore' : 'Fast 1-tap login next time'}
                              </span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={enableBiometric}
                            onChange={e => setEnableBiometric(e.target.checked)}
                            className="w-4 h-4 rounded text-[#059669] focus:ring-[#059669] border-slate-300 dark:border-slate-600 accent-[#059669] cursor-pointer"
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading || lockoutSeconds > 0}
                        className="w-full py-3.5 px-4 bg-[#064E3B] hover:bg-[#047857] text-white font-semibold rounded-2xl shadow-md shadow-emerald-950/20 active:scale-[0.98] transition-all font-khmer text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        <Lock className="w-4 h-4 text-emerald-300" />
                        <span>
                          {loading 
                            ? (isKm ? 'កំពុងផ្ទៀងផ្ទាត់សុវត្ថិភាព...' : 'Verifying...') 
                            : lockoutSeconds > 0 
                            ? (isKm ? `បានចាក់សោរ (${lockoutSeconds}s)` : `Locked (${lockoutSeconds}s)`)
                            : (isKm ? 'ផ្ទៀងផ្ទាត់ និងចូលផ្ទាំងរដ្ឋបាល' : 'Authenticate & Unlock')}
                        </span>
                      </button>
                    </form>
                  )}
                </div>
              ) : activeTab === 'change_pin' ? (
                /* Change 6-Digit PIN Form */
                <form onSubmit={handleChangePinSubmit} className="space-y-3.5 font-khmer">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-amber-900 dark:text-amber-200 text-xs">
                    <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {tr(
                        language,
                        'ផ្លាស់ប្តូរលេខកូដ PIN ៦ ខ្ទង់សម្រាប់ Step 1 (ធ្វើសមកាលកម្ម Cloud ដោយសុវត្ថិភាព)',
                        'Change the Step 1 6-digit PIN (Secured & Cloud Synchronized)',
                        '修改第一步 6 位 PIN 码（云端加密同步）'
                      )}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-300 font-khmer mb-1">
                      {tr(language, 'លេខកូដ PIN ៦ ខ្ទង់ថ្មី', 'New 6-Digit PIN', '新 6 位 PIN 码')}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={newPin}
                      onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-widest text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      placeholder="••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-300 font-khmer mb-1">
                      {tr(language, 'ផ្ទៀងផ្ទាត់លេខកូដ PIN ថ្មីម្តងទៀត', 'Confirm New 6-Digit PIN', '再次确认新 PIN 码')}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={confirmNewPin}
                      onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-widest text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      placeholder="••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pinChangeLoading}
                    className="w-full py-3.5 px-4 bg-[#064E3B] hover:bg-[#047857] text-white font-semibold rounded-2xl shadow-md shadow-emerald-950/20 active:scale-[0.98] transition-all font-khmer text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>
                      {pinChangeLoading 
                        ? tr(language, 'កំពុងរក្សាទុក...', 'Saving PIN...', '正在保存...') 
                        : tr(language, '💾 រក្សាទុក & ធ្វើសមកាលកម្ម PIN ថ្មី', '💾 Save & Sync New 6-Digit PIN', '💾 保存并同步新 PIN 码')}
                    </span>
                  </button>
                </form>
              ) : (
                /* Change Password Form */
                <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-300 font-khmer mb-1">
                      {isKm ? 'ពាក្យសម្ងាត់បច្ចុប្បន្ន' : 'Current Password'}
                    </label>
                    <input
                      type="password"
                      value={currentAdminPass}
                      onChange={e => setCurrentAdminPass(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      placeholder="••••••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-300 font-khmer mb-1">
                      {isKm ? 'ពាក្យសម្ងាត់ថ្មី (យ៉ាងហោច ៨ តួអក្សរ)' : 'New Password (min 8 characters)'}
                    </label>
                    <input
                      type="password"
                      value={newAdminPass}
                      onChange={e => setNewAdminPass(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      placeholder="••••••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] dark:text-slate-300 font-khmer mb-1">
                      {isKm ? 'ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ថ្មីម្តងទៀត' : 'Confirm New Password'}
                    </label>
                    <input
                      type="password"
                      value={confirmAdminPass}
                      onChange={e => setConfirmAdminPass(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      placeholder="••••••••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-[#064E3B] hover:bg-[#047857] text-white font-semibold rounded-2xl shadow-md shadow-emerald-950/20 active:scale-[0.98] transition-all font-khmer text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>{loading ? (isKm ? 'កំពុងរក្សាទុក...' : 'Updating...') : (isKm ? 'ផ្លាស់ប្តូរ និង Hash PBKDF2 ថ្មី' : 'Hash PBKDF2 & Save Password')}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500 font-khmer">
              <button
                type="button"
                onClick={() => setAdminStep('pin')}
                className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                ← {tr(language, 'ត្រឡប់ទៅ PIN', 'Back to PIN', '返回 PIN 码')}
              </button>
              <button
                onClick={() => setIsAdminLoginModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition font-medium cursor-pointer"
              >
                {tr(language, 'បិទ', 'Close', '关闭')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

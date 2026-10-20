import React, { useState, useEffect } from 'react';
import { 
  X, ShieldAlert, Lock, User as UserIcon, Eye, EyeOff, 
  KeyRound, CheckCircle2, ShieldCheck, AlertCircle, Clock 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { checkAdminLoginAllowed } from '../utils/security';

export const AdminLoginModal: React.FC = () => {
  const { 
    isAdminLoginModalOpen, 
    setIsAdminLoginModalOpen, 
    loginAdmin, 
    setAdminPassword, 
    language 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'change_password'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Change password states
  const [currentAdminPass, setCurrentAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const isKm = language === 'km';

  // Check rate limiting on modal open
  useEffect(() => {
    if (isAdminLoginModalOpen) {
      const status = checkAdminLoginAllowed();
      if (!status.allowed) {
        setLockoutSeconds(status.remainingLockoutSeconds);
      } else {
        setLockoutSeconds(0);
      }
    }
  }, [isAdminLoginModalOpen]);

  // Countdown timer for lockout
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
        setPassword('');
        setUsername('');
      }
    } catch {
      setErrorMsg(isKm ? 'មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់សុវត្ថិភាព' : 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

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
    } catch {
      setErrorMsg(isKm ? 'បរាជ័យក្នុងការផ្លាស់ប្តូរពាក្យសម្ងាត់' : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl overflow-hidden border border-[#A7DCA5]/40 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Admin Header */}
        <div className="relative bg-gradient-to-r from-[#0B3D2E] via-[#14532D] to-[#0B3D2E] text-white p-6 pb-5">
          <button
            onClick={() => setIsAdminLoginModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#A7DCA5] hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl border border-[#A7DCA5]/30 shadow-inner">
              <ShieldAlert className="w-7 h-7 text-[#A7DCA5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-[#228B4E]/30 text-[#A7DCA5] border border-[#A7DCA5]/40 px-2 py-0.5 rounded-full font-bold font-mono">
                  ENTERPRISE SECURE
                </span>
              </div>
              <h2 className="text-lg font-bold font-khmer mt-0.5">
                {isKm ? 'ច្រកចូលរដ្ឋបាលសុវត្ថិភាព' : 'Authorized Admin Portal'}
              </h2>
            </div>
          </div>

          {/* Subtabs for Login vs Change Password */}
          <div className="flex gap-2 mt-4 bg-black/30 p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold font-khmer transition-all ${
                activeTab === 'login'
                  ? 'bg-[#34A853] text-white shadow-md font-bold'
                  : 'text-[#A7DCA5] hover:text-white'
              }`}
            >
              {isKm ? 'ចូលគណនីរដ្ឋបាល' : 'Admin Login'}
            </button>
            <button
              onClick={() => { setActiveTab('change_password'); setErrorMsg(''); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold font-khmer transition-all ${
                activeTab === 'change_password'
                  ? 'bg-[#34A853] text-white shadow-md font-bold'
                  : 'text-[#A7DCA5] hover:text-white'
              }`}
            >
              {isKm ? 'ប្តូរពាក្យសម្ងាត់' : 'Change Password'}
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
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#183326] dark:text-stone-300 font-khmer mb-1.5">
                  {isKm ? 'ឈ្មោះអ្នកគ្រប់គ្រង (Admin ID / Username)' : 'Admin ID / Username'}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    disabled={lockoutSeconds > 0}
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#34A853] focus:border-[#228B4E] disabled:opacity-50"
                    placeholder={isKm ? 'បញ្ចូលឈ្មោះអ្នកគ្រប់គ្រង' : 'Enter Admin ID'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#183326] dark:text-stone-300 font-khmer mb-1.5">
                  {isKm ? 'ពាក្យសម្ងាត់សុវត្ថិភាព (Password)' : 'Secure Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={lockoutSeconds > 0}
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#34A853] focus:border-[#228B4E] disabled:opacity-50 font-mono"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security Policy Badge */}
              <div className="bg-[#EAF6EC]/60 dark:bg-[#0B3D2E]/40 rounded-xl p-3 border border-[#A7DCA5]/30 text-[11px] text-[#183326] dark:text-stone-300 font-khmer space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-[#14532D] dark:text-[#A7DCA5]">
                  <ShieldCheck className="w-4 h-4 text-[#228B4E]" />
                  <span>{isKm ? 'ស្តង់ដាសុវត្ថិភាពខ្ពស់បំផុត (Security Policy):' : 'Security Policy:'}</span>
                </div>
                <p>
                  {isKm 
                    ? 'ប្រព័ន្ធប្រើប្រាស់ក្បួន PBKDF2-HMAC-SHA256 (100,000 Iterations) + Salt 32-byte និងការទប់ស្កាត់ការប៉ុនប៉ងទស្សន៍ទាយពាក្យសម្ងាត់ (Rate Limiting) ដោយស្វ័យប្រវត្តិ។' 
                    : 'Protected by PBKDF2-HMAC-SHA256 (100,000 iterations), 32-byte salt, and brute-force lockout defenses.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || lockoutSeconds > 0}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#14532D] to-[#228B4E] hover:from-[#0B3D2E] hover:to-[#14532D] text-white font-semibold rounded-2xl shadow-lg shadow-[#14532D]/30 active:scale-[0.98] transition-all font-khmer text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-[#A7DCA5]" />
                <span>
                  {loading 
                    ? (isKm ? 'កំពុងផ្ទៀងផ្ទាត់សុវត្ថិភាព...' : 'Verifying...') 
                    : lockoutSeconds > 0 
                    ? (isKm ? `បានចាក់សោរ (${lockoutSeconds}s)` : `Locked (${lockoutSeconds}s)`)
                    : (isKm ? 'ផ្ទៀងផ្ទាត់ និងចូលផ្ទាំងរដ្ឋបាល' : 'Authenticate & Unlock')}
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#183326] dark:text-stone-300 font-khmer mb-1">
                  {isKm ? 'ពាក្យសម្ងាត់បច្ចុប្បន្ន' : 'Current Password'}
                </label>
                <input
                  type="password"
                  value={currentAdminPass}
                  onChange={e => setCurrentAdminPass(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#34A853] focus:border-[#228B4E]"
                  placeholder="••••••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#183326] dark:text-stone-300 font-khmer mb-1">
                  {isKm ? 'ពាក្យសម្ងាត់ថ្មី (យ៉ាងហោច ៨ តួអក្សរ)' : 'New Password (min 8 characters)'}
                </label>
                <input
                  type="password"
                  value={newAdminPass}
                  onChange={e => setNewAdminPass(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#34A853] focus:border-[#228B4E]"
                  placeholder="••••••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#183326] dark:text-stone-300 font-khmer mb-1">
                  {isKm ? 'ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ថ្មីម្តងទៀត' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  value={confirmAdminPass}
                  onChange={e => setConfirmAdminPass(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#34A853] focus:border-[#228B4E]"
                  placeholder="••••••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#14532D] to-[#228B4E] hover:from-[#0B3D2E] hover:to-[#14532D] text-white font-semibold rounded-2xl shadow-lg shadow-[#14532D]/30 active:scale-[0.98] transition-all font-khmer text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-[#A7DCA5]" />
                <span>{loading ? (isKm ? 'កំពុងរក្សាទុក...' : 'Updating...') : (isKm ? 'ផ្លាស់ប្តូរ និង Hash PBKDF2 ថ្មី' : 'Hash PBKDF2 & Save Password')}</span>
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-100 dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 flex justify-between items-center text-xs text-stone-500 font-khmer">
          <span>{isKm ? 'កម្រិតសុវត្ថិភាព៖ PBKDF2-HMAC-SHA256' : 'Security Level: PBKDF2-256'}</span>
          <button
            onClick={() => setIsAdminLoginModalOpen(false)}
            className="px-4 py-1.5 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-xl transition font-medium"
          >
            {isKm ? 'បោះបង់' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, ShieldAlert, Lock, User as UserIcon, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AdminLoginModal: React.FC = () => {
  const { 
    isAdminLoginModalOpen, 
    setIsAdminLoginModalOpen, 
    loginAdmin, 
    setAdminPassword, 
    appSettings, 
    language 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'change_password'>('login');
  const [username, setUsername] = useState('Chea Savuth');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Change password states
  const [currentAdminPass, setCurrentAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAdminLoginModalOpen) return null;

  const isKm = language === 'km';

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const success = await loginAdmin(username, password);
      if (!success) {
        setErrorMsg(isKm ? 'ឈ្មោះអ្នកប្រើប្រាស់ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ!' : 'Invalid username or password!');
      } else {
        setPassword('');
      }
    } catch (err) {
      setErrorMsg(isKm ? 'មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់សុវត្ថិភាព' : 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newAdminPass.length < 6) {
      setErrorMsg(isKm ? 'ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ!' : 'New password must be at least 6 characters!');
      return;
    }

    if (newAdminPass !== confirmAdminPass) {
      setErrorMsg(isKm ? 'ការផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់មិនត្រូវគ្នាទេ!' : 'Passwords do not match!');
      return;
    }

    setLoading(true);
    try {
      // First verify current password before changing
      const isCurrentValid = await loginAdmin(username, currentAdminPass);
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
    } catch (err) {
      setErrorMsg(isKm ? 'បរាជ័យក្នុងការផ្លាស់ប្តូរពាក្យសម្ងាត់' : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-red-900/20 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Admin Header */}
        <div className="relative bg-gradient-to-r from-red-950 via-red-900 to-stone-900 text-white p-6 pb-5">
          <button
            onClick={() => setIsAdminLoginModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-800/80 rounded-2xl border border-red-500/30 shadow-inner">
              <ShieldAlert className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold">
                  PORTAL SECURE
                </span>
              </div>
              <h2 className="text-xl font-bold font-khmer mt-0.5">
                {isKm ? 'ច្រកចូលរដ្ឋបាល Chea Savuth' : 'Admin Portal: Chea Savuth'}
              </h2>
            </div>
          </div>

          {/* Subtabs for Login vs Change Password */}
          <div className="flex gap-2 mt-4 bg-black/30 p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold font-khmer transition-all ${
                activeTab === 'login'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {isKm ? 'ចូលគណនីរដ្ឋបាល' : 'Admin Login'}
            </button>
            <button
              onClick={() => { setActiveTab('change_password'); setErrorMsg(''); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold font-khmer transition-all ${
                activeTab === 'change_password'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {isKm ? 'ប្តូរពាក្យសម្ងាត់' : 'Change Password'}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-khmer flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 font-khmer mb-1.5">
                  {isKm ? 'ឈ្មោះគណនីរដ្ឋបាល (Username)' : 'Admin Username'}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                    placeholder="Chea Savuth"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 font-khmer mb-1.5">
                  {isKm ? 'ពាក្យសម្ងាត់សុវត្ថិភាព (Password)' : 'Secure Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
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

              {/* Initial Setup Info */}
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/80 text-[11px] text-amber-900 font-khmer space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-800">
                  <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                  <span>{isKm ? 'ការកំណត់សុវត្ថិភាពដំបូង (Initial Setup):' : 'Setup Notice:'}</span>
                </div>
                <p className="text-stone-700">
                  {isKm 
                    ? 'គណនីរដ្ឋបាលដំបូងគឺ "Chea Savuth"។ ពាក្យសម្ងាត់ត្រូវបានរក្សាទុកដោយការ Hash SHA-256 សុវត្ថិភាពខ្ពស់ មិនបង្ហាញជាអក្សរច្បាស់ឡើយ។' 
                    : 'Initial admin account is "Chea Savuth". Passwords are cryptographic SHA-256 salted hashes, never stored in plain text.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-800 to-amber-700 hover:from-red-900 hover:to-amber-800 text-white font-semibold rounded-2xl shadow-lg shadow-red-900/20 active:scale-[0.98] transition-all font-khmer text-sm flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-amber-300" />
                <span>{loading ? (isKm ? 'កំពុងផ្ទៀងផ្ទាត់...' : 'Verifying...') : (isKm ? 'ចូលកាន់ផ្ទាំងគ្រប់គ្រងរដ្ឋបាល' : 'Unlock Admin Dashboard')}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 font-khmer mb-1.5">
                  {isKm ? 'ពាក្យសម្ងាត់បច្ចុប្បន្ន' : 'Current Password'}
                </label>
                <input
                  type="password"
                  value={currentAdminPass}
                  onChange={e => setCurrentAdminPass(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                  placeholder="••••••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 font-khmer mb-1.5">
                  {isKm ? 'ពាក្យសម្ងាត់ថ្មី (យ៉ាងហោច ៦ តួអក្សរ)' : 'New Password (min 6 characters)'}
                </label>
                <input
                  type="password"
                  value={newAdminPass}
                  onChange={e => setNewAdminPass(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                  placeholder="••••••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 font-khmer mb-1.5">
                  {isKm ? 'ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ថ្មី' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  value={confirmAdminPass}
                  onChange={e => setConfirmAdminPass(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                  placeholder="••••••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-800 to-amber-700 hover:from-red-900 hover:to-amber-800 text-white font-semibold rounded-2xl shadow-lg shadow-red-900/20 active:scale-[0.98] transition-all font-khmer text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>{loading ? (isKm ? 'កំពុងរក្សាទុក...' : 'Updating...') : (isKm ? 'ផ្លាស់ប្តូរ និង Hash ពាក្យសម្ងាត់ថ្មី' : 'Hash & Save New Password')}</span>
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500 font-khmer">
          <span>{isKm ? 'ការការពារដោយ SHA-256 Encryption' : 'Protected by SHA-256 Crypto'}</span>
          <button
            onClick={() => setIsAdminLoginModalOpen(false)}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl transition-colors font-medium"
          >
            {isKm ? 'បោះបង់' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

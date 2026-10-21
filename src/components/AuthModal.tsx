import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Mail, User, Store, Shield, Phone, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
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
  
  // Register fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [role, setRole] = useState<UserRole>('user');

  // Login field
  const [loginIdentifier, setLoginIdentifier] = useState('');

  if (!isAuthModalOpen) return null;

  const isKm = language === 'km';

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = signupMethod === 'phone' ? phone.trim() : email.trim();
    if (!identifier) {
      showToast(isKm ? 'សូមបញ្ចូលលេខទូរស័ព្ទ ឬអ៊ីមែល' : 'Please provide a phone number or email', 'warning');
      return;
    }
    if (!name.trim()) {
      showToast(isKm ? 'សូមបញ្ចូលឈ្មោះរបស់អ្នក' : 'Please provide your name', 'warning');
      return;
    }

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
        <div className="p-6 pb-4 bg-gradient-to-br from-[#064E3B] to-[#047857] text-white text-center space-y-1.5 border-b border-[#047857]">
          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-1 text-emerald-200 shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="font-moul text-base text-white tracking-wide">
            {tab === 'register' 
              ? (isKm ? 'ចុះឈ្មោះគណនីថ្មី' : 'Create Account')
              : (isKm ? 'ចូលប្រើប្រាស់' : 'Welcome Back')}
          </h2>
          <p className="text-xs text-emerald-100 font-khmer">
            {tab === 'register'
              ? (isKm ? 'ងាយស្រួល និងរហ័ស តាមលេខទូរស័ព្ទ ឬ អ៊ីមែល' : 'Quick & easy with Phone Number or Email')
              : (isKm ? 'សូមបញ្ចូលលេខទូរស័ព្ទ ឬ អ៊ីមែលរបស់អ្នក' : 'Sign in with your phone or email')}
          </p>
        </div>

        {/* Switch tab */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-khmer">
          <button
            type="button"
            onClick={() => setTab('register')}
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
            onClick={() => setTab('login')}
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
            <form onSubmit={handleRegisterSubmit} className="space-y-3 font-khmer">
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs"
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
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs font-mono"
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
                <span>{isKm ? 'ចុះឈ្មោះ និងចូលប្រើប្រាស់' : 'Sign Up & Get Started'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] text-xs"
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

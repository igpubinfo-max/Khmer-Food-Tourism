import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Lock, Mail, User, Store, Shield, Phone, Sparkles } from 'lucide-react';
import { UserRole } from '../types';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, login, register, language } = useApp();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [role, setRole] = useState<UserRole>('user');

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, role);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register(name, email, role, phone, role === 'owner' ? restaurantName : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-3.5 right-3.5 p-2 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header */}
        <div className="p-6 pb-4 bg-gradient-to-b from-amber-900 to-amber-950 text-white text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center mx-auto mb-2 text-amber-300">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-moul text-base text-amber-200">
            {tab === 'login' 
              ? (language === 'km' ? 'ចូលគណនី' : 'Welcome Back') 
              : (language === 'km' ? 'ចុះឈ្មោះគណនីថ្មី' : 'Create Account')}
          </h2>
          <p className="text-xs text-amber-200/80">
            {language === 'km' ? 'កម្មវិធី អាហារ & ទេសចរណ៍ខ្មែរ' : 'Khmer Food & Tourism App'}
          </p>
        </div>

        {/* Switch tab */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 text-xs">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-3 font-bold border-b-2 transition ${
              tab === 'login' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-400'
            }`}
          >
            {language === 'km' ? 'ចូលប្រើប្រាស់' : 'Sign In'}
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-3 font-bold border-b-2 transition ${
              tab === 'register' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-400'
            }`}
          >
            {language === 'km' ? 'ចុះឈ្មោះថ្មី' : 'Register'}
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh] no-scrollbar">
          {tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === 'km' ? 'អ៊ីមែល / ឈ្មោះគណនី' : 'Email Address'}
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === 'km' ? 'ពាក្យសម្ងាត់' : 'Password'}
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition font-khmer"
              >
                {language === 'km' ? 'ចូលគណនី' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === 'km' ? 'ប្រភេទគណនី (Account Role)' : 'Account Role'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={`p-2 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-1.5 ${
                      role === 'user' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-stone-300 text-stone-600'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{language === 'km' ? 'អ្នកប្រើប្រាស់ទូទៅ' : 'Food Lover'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('owner')}
                    className={`p-2 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-1.5 ${
                      role === 'owner' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-stone-300 text-stone-600'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>{language === 'km' ? 'ម្ចាស់ហាងអាហារ' : 'Shop Owner'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === 'km' ? 'ឈ្មោះពេញ' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="សុខ ចាន់ដារ៉ា"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              {role === 'owner' && (
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {language === 'km' ? 'ឈ្មោះហាងអាហារ' : 'Restaurant Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="ហាងអាហារមរតកខ្មែរ"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === 'km' ? 'អ៊ីមែល' : 'Email'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {language === 'km' ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="012 xxx xxx"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition"
              >
                {language === 'km' ? 'ចុះឈ្មោះឥឡូវនេះ' : 'Complete Registration'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

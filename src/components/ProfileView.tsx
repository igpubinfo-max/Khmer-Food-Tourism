import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { TouristCard } from './TouristCard';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { 
  User as UserIcon, Heart, Shield, Store, 
  Globe, LogOut, RefreshCw, KeyRound, Check, Plus, QrCode, ShieldAlert, ShieldCheck
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { 
    currentUser, users, login, logout, language, setLanguage, 
    bookmarks, foods, destinations, posts, restaurants,
    setIsAuthModalOpen, setIsAdminOpen, setIsAdminLoginModalOpen,
    setIsInstallModalOpen, setIsSupportModalOpen,
    resetAllData, showToast 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'bookmarks' | 'myposts' | 'settings'>('bookmarks');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const isKm = language === 'km';

  // Bookmarked items
  const savedFoods = foods.filter(f => bookmarks.includes(f.id));
  const savedDestinations = destinations.filter(d => bookmarks.includes(d.id));

  // User posts
  const myPosts = posts.filter(p => currentUser && p.authorId === currentUser.id);

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-24">
      {/* User Header Profile Card */}
      <div className="p-4 rounded-3xl bg-white dark:bg-stone-800 border border-amber-100/80 dark:border-stone-700/60 shadow-xs">
        {currentUser ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500 shadow-md"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 font-khmer">
                    {currentUser.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    currentUser.role === 'admin' 
                      ? 'bg-rose-100 text-rose-700' 
                      : currentUser.role === 'owner' 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {currentUser.role === 'admin' ? '🛡️ Administrator' : currentUser.role === 'owner' ? '🏪 Shop Owner' : '👤 Foodie'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">{currentUser.email}</p>
                {currentUser.phone && (
                  <p className="text-[11px] text-stone-400">📞 {currentUser.phone}</p>
                )}
              </div>
            </div>

            {currentUser.bio && (
              <p className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-700/40 p-2.5 rounded-xl border border-stone-100 dark:border-stone-700 font-khmer">
                {currentUser.bio}
              </p>
            )}

            {/* Admin Portal Shortcut ONLY if Admin */}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setIsAdminOpen(true)}
                className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-800 hover:to-amber-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition font-khmer"
              >
                <Shield className="w-4 h-4 text-amber-300" />
                <span>{isKm ? 'ចូលផ្ទាំងគ្រប់គ្រងរដ្ឋបាល (Admin Dashboard)' : 'Open Admin Dashboard'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-3 font-khmer">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-800 dark:text-stone-200">
                {isKm ? 'សូមចូលគណនីរបស់អ្នក' : 'Please Sign In'}
              </h3>
              <p className="text-xs text-stone-500">
                {isKm ? 'ដើម្បីរក្សាទុកម្ហូប ចែករំលែក និងចុះបញ្ជីហាង' : 'To save recipes, share posts & manage shops'}
              </p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs shadow hover:bg-amber-500 font-khmer transition"
              >
                {isKm ? 'ចូលគណនី / ចុះឈ្មោះ' : 'Sign In / Register'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* App Installation & Support Buttons Showcase */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setIsInstallModalOpen(true)}
          className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-amber-200 shadow-xs flex items-center gap-2.5 hover:bg-amber-50 transition text-left"
        >
          <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-800 dark:text-white font-khmer">
              {isKm ? 'ដំឡើង APK' : 'Install App'}
            </div>
            <div className="text-[10px] text-stone-500 font-khmer">
              {isKm ? 'ស្កេន QR Code' : 'Scan QR Code'}
            </div>
          </div>
        </button>

        <button
          onClick={() => setIsSupportModalOpen(true)}
          className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-rose-200 shadow-xs flex items-center gap-2.5 hover:bg-rose-50 transition text-left"
        >
          <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0">
            <Heart className="w-4 h-4 fill-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-800 dark:text-white font-khmer">
              {isKm ? 'ជួយឧបត្ថម្ភ' : 'Support App'}
            </div>
            <div className="text-[10px] text-stone-500 font-khmer">
              {isKm ? 'Bakong KHQR' : 'Bakong KHQR'}
            </div>
          </div>
        </button>
      </div>

      {/* Tabs: Bookmarks / My Posts / Settings */}
      <div className="flex border-b border-stone-200 dark:border-stone-700 text-xs font-khmer">
        <button
          onClick={() => setActiveSubTab('bookmarks')}
          className={`flex-1 py-2.5 font-bold text-center border-b-2 transition ${
            activeSubTab === 'bookmarks'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          {isKm ? `ចំណូលចិត្ត (${bookmarks.length})` : `Saved (${bookmarks.length})`}
        </button>

        <button
          onClick={() => setActiveSubTab('myposts')}
          className={`flex-1 py-2.5 font-bold text-center border-b-2 transition ${
            activeSubTab === 'myposts'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          {isKm ? `ការបង្ហោះរបស់ខ្ញុំ (${myPosts.length})` : `My Posts (${myPosts.length})`}
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex-1 py-2.5 font-bold text-center border-b-2 transition ${
            activeSubTab === 'settings'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          {isKm ? 'ការកំណត់' : 'Settings'}
        </button>
      </div>

      {/* Tab Contents */}
      {activeSubTab === 'bookmarks' && (
        <div className="space-y-4">
          {savedFoods.length === 0 && savedDestinations.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-xs space-y-1 font-khmer">
              <Heart className="w-8 h-8 mx-auto text-stone-300" />
              <p>{isKm ? 'មិនទាន់មានមុខម្ហូប ឬកន្លែងកម្សាន្តដែលបានរក្សាទុកនៅឡើយទេ' : 'No saved items yet'}</p>
            </div>
          ) : (
            <>
              {savedFoods.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-stone-700 dark:text-stone-300 font-khmer">
                    {isKm ? 'មុខម្ហូបដែលបានរក្សាទុក' : 'Saved Recipes'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {savedFoods.map(f => <FoodCard key={f.id} food={f} />)}
                  </div>
                </div>
              )}

              {savedDestinations.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-xs text-stone-700 dark:text-stone-300 font-khmer">
                    {isKm ? 'តំបន់ទេសចរណ៍ដែលបានរក្សាទុក' : 'Saved Travel Spots'}
                  </h4>
                  <div className="space-y-3">
                    {savedDestinations.map(d => <TouristCard key={d.id} destination={d} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeSubTab === 'myposts' && (
        <div className="space-y-3">
          {myPosts.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-xs font-khmer">
              <p>{isKm ? 'លោកអ្នកមិនទាន់បានបង្ហោះអ្វីនៅឡើយទេ' : 'You haven’t posted anything yet'}</p>
            </div>
          ) : (
            myPosts.map((p) => (
              <div key={p.id} className="p-3 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img src={p.photoUrl} alt="thumb" className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <h5 className="font-bold text-xs text-stone-900 dark:text-stone-100 font-khmer">{p.titleKh}</h5>
                    <p className="text-[10px] text-stone-400">{p.likesCount} ❤️ • {p.comments.length} 💬</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeSubTab === 'settings' && (
        <div className="p-4 bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 space-y-3 text-xs font-khmer">
          {/* Language Switch */}
          <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-700">
            <span className="font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-600" />
              {isKm ? 'ភាសាកម្មវិធី (App Language)' : 'Language'}
            </span>
            <button
              onClick={() => setLanguage(isKm ? 'en' : 'km')}
              className="px-3 py-1 rounded-xl bg-amber-100 dark:bg-stone-700 text-amber-800 dark:text-amber-300 font-bold"
            >
              {isKm ? 'ភាសាខ្មែរ (Khmer)' : 'English'}
            </button>
          </div>

          {/* Privacy Policy & Data Safety */}
          <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-700">
            <span className="font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {isKm ? 'គោលការណ៍ឯកជនភាព & សុវត្ថិភាព' : 'Privacy Policy & Data Safety'}
            </span>
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-100 transition"
            >
              {isKm ? 'មើល' : 'View'}
            </button>
          </div>

          {/* Reset App Data */}
          <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-700">
            <span className="font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-stone-500" />
              {isKm ? 'កំណត់ទិន្នន័យឡើងវិញ' : 'Reset Database to Seed'}
            </span>
            <button
              onClick={() => {
                if (window.confirm(isKm ? 'តើអ្នកពិតជាចង់កំណត់ទិន្នន័យទាំងអស់ឡើងវិញមែនទេ?' : 'Reset all data to defaults?')) {
                  resetAllData();
                }
              }}
              className="px-3 py-1 rounded-xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100"
            >
              {isKm ? 'កំណត់ឡើងវិញ' : 'Reset'}
            </button>
          </div>

          {/* Sign Out */}
          {currentUser && (
            <button
              onClick={logout}
              className="w-full py-2.5 rounded-2xl bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 text-stone-700 dark:text-stone-200 font-bold flex items-center justify-center gap-1.5 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>{isKm ? 'ចាកចេញពីគណនី' : 'Sign Out'}</span>
            </button>
          )}

          {/* Discreet Admin Portal Access */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-700 text-center">
            <button
              onClick={() => setIsAdminLoginModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-[11px] font-medium transition py-1.5 px-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700/40"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isKm ? 'ច្រកចូលប្រព័ន្ធរដ្ឋបាល' : 'System Administration'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal 
        isOpen={isPrivacyModalOpen} 
        onClose={() => setIsPrivacyModalOpen(false)} 
      />
    </div>
  );
};

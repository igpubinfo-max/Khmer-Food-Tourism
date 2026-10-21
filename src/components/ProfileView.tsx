import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { TouristCard } from './TouristCard';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { 
  User as UserIcon, Heart, Shield, Store, 
  Globe, LogOut, RefreshCw, Download, Sparkles, UtensilsCrossed, ShieldCheck, CheckCircle2,
  Bot, Bell, Compass, Calendar, Bookmark, Plus, MapPin, Trash2, Share2, Tag, Utensils, ChevronRight,
  Edit2, Check, X as CloseIcon, Crown, Star, Zap, Award
} from 'lucide-react';
import { isRestaurantPremiumActive, isUserVipActive, getVipRemainingDays, TEN_VIP_BENEFITS } from '../types';

export const ProfileView: React.FC = () => {
  const { 
    currentUser, users, login, logout, language, setLanguage, 
    bookmarks, foods, destinations, posts, restaurants,
    wishlists, tripPlans, deleteTripPlan, notifications, notificationsEnabled, setNotificationsEnabled,
    unreadNotificationsCount, setIsWhatToEatModalOpen, setIsNearMeModalOpen,
    setIsDailyDiscoveriesModalOpen, setIsWishlistsModalOpen, setIsAiTripPlannerModalOpen,
    setIsNotificationsModalOpen, setIsTrendingSocialModalOpen,
    setIsAuthModalOpen, setIsAdminOpen, setIsAdminLoginModalOpen,
    setIsInstallModalOpen, setIsSupportModalOpen, setIsAddRestaurantModalOpen,
    setManagingRestaurant, setIsManageMenuModalOpen,
    setSelectedFood, setSelectedRestaurant, setSelectedDestination,
    resetAllData, showToast, updateCurrentUserProfile,
    openUpgradeVipModal
  } = useApp();

  const isKm = language === 'km';
  const isOwner = currentUser?.role === 'owner';
  const isVip = isUserVipActive(currentUser);
  const remainingDays = getVipRemainingDays(currentUser);

  const [activeSubTab, setActiveSubTab] = useState<'bookmarks' | 'wishlists' | 'tripplans' | 'myposts' | 'settings' | 'myrestaurant' | 'membership'>(
    isOwner ? 'myrestaurant' : 'wishlists'
  );
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // Bookmarked items
  const savedFoods = foods.filter(f => bookmarks.includes(f.id));
  const savedDestinations = destinations.filter(d => bookmarks.includes(d.id));

  // User posts
  const myPosts = posts.filter(p => currentUser && p.authorId === currentUser.id);

  // Owner restaurants
  const myRestaurants = restaurants.filter(r => currentUser && r.ownerId === currentUser.id);

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-24">
      {/* User Header Profile Card */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-xs">
        {currentUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#059669] shadow-md ring-4 ring-emerald-500/20 shrink-0"
              />
              <div className="flex-1 min-w-0">
                {/* Large Prominent Account Name & Quick Edit */}
                {isEditingName ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="text"
                      autoFocus
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      placeholder={isKm ? 'វាយឈ្មោះថ្មី...' : 'Enter new name...'}
                      className="w-full max-w-[180px] px-2.5 py-1 text-xs font-bold rounded-lg border-2 border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      onClick={() => {
                        if (tempName.trim()) {
                          updateCurrentUserProfile(tempName.trim());
                        }
                        setIsEditingName(false);
                      }}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                      title={isKm ? 'រក្សាទុក' : 'Save'}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-600 dark:text-slate-300 transition"
                      title={isKm ? 'បោះបង់' : 'Cancel'}
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="font-moul text-lg sm:text-2xl text-slate-900 dark:text-white leading-snug tracking-wide break-words">
                      {currentUser.name}
                    </h2>
                    <button
                      onClick={() => {
                        setTempName(currentUser.name);
                        setIsEditingName(true);
                      }}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-emerald-100 dark:bg-slate-700 dark:hover:bg-emerald-950/50 text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300 transition"
                      title={isKm ? 'កែប្រែឈ្មោះ' : 'Edit Name'}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                
                {/* Verified Badge & Role & VIP Status */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  {isVip ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-200 to-amber-300 text-amber-950 border border-amber-400 shadow-2xs font-khmer">
                      <Crown className="w-3.5 h-3.5 fill-amber-700 text-amber-700" />
                      <span>{isKm ? 'Premium VIP 🌟' : 'Premium VIP 🌟'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 shadow-2xs font-khmer">
                      <span>{isKm ? 'គណនីឥតគិតថ្លៃ (Free)' : 'Free User'}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs font-khmer">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{isKm ? 'គណនីបានផ្ទៀងផ្ទាត់ ✓' : 'Verified Account ✓'}</span>
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-khmer ${
                    currentUser.role === 'admin' 
                      ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                      : currentUser.role === 'owner' 
                      ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border border-slate-300'
                  }`}>
                    {currentUser.role === 'admin' ? '🛡️ Administrator' : currentUser.role === 'owner' ? '🏪 ម្ចាស់ហាង' : '👤 អ្នកប្រើប្រាស់'}
                  </span>
                </div>

                {currentUser.role === 'admin' ? (
                  <p className="text-xs text-rose-600 font-medium font-khmer mt-1">
                    {isKm ? 'គណនីរដ្ឋបាលប្រព័ន្ធ (Private)' : 'System Administrator (Private)'}
                  </p>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    {currentUser.phone && (
                      <p className="text-xs sm:text-sm text-[#059669] font-mono font-bold flex items-center gap-1.5">
                        <span>📞</span> <span>{currentUser.phone}</span>
                      </p>
                    )}
                    {currentUser.email && !currentUser.email.endsWith('@phone.kh') && (
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-mono flex items-center gap-1.5">
                        <span>✉️</span> <span>{currentUser.email}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {currentUser.bio && (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-khmer">
                {currentUser.bio}
              </p>
            )}

            {/* Admin Portal Shortcut ONLY if Admin */}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setIsAdminOpen(true)}
                className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-[#064E3B] to-[#059669] hover:from-[#047857] hover:to-[#064E3B] text-white border border-emerald-400/30 font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition font-khmer"
              >
                <Shield className="w-4 h-4 text-emerald-200" />
                <span>{isKm ? 'ចូលផ្ទាំងគ្រប់គ្រងរដ្ឋបាល (Admin Dashboard)' : 'Open Admin Dashboard'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-3 font-khmer">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-[#064E3B] border border-slate-200 flex items-center justify-center mx-auto">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">
                {isKm ? 'សូមចូលគណនីរបស់អ្នក' : 'Please Sign In'}
              </h3>
              <p className="text-xs text-slate-500">
                {isKm ? 'ដើម្បីរក្សាទុកម្ហូប ចែករំលែក និងចុះបញ្ជីហាង' : 'To save recipes, share posts & manage shops'}
              </p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-xs font-khmer transition"
              >
                {isKm ? 'ចូលគណនី / ចុះឈ្មោះ' : 'Sign In / Register'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Membership Status & VIP Upgrade Banner Card */}
      <div className={`p-4 rounded-3xl border shadow-xs transition ${
        isVip 
          ? 'bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/15 border-amber-400/60' 
          : 'bg-gradient-to-r from-emerald-950/20 via-slate-900/10 to-amber-950/20 border-slate-200 dark:border-slate-700'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-2xl shrink-0 ${isVip ? 'bg-amber-400 text-slate-900 shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              <Crown className={`w-5 h-5 ${isVip ? 'fill-slate-900' : ''}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-white font-khmer">
                  {isKm ? 'ស្ថានភាពសមាជិកភាព៖' : 'Membership:'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-khmer ${
                  isVip 
                    ? 'bg-amber-400 text-slate-950 shadow-2xs' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {isVip ? (isKm ? '🌟 Premium VIP (សកម្ម)' : '🌟 Premium VIP (Active)') : (isKm ? 'គណនីឥតគិតថ្លៃ (Free User)' : 'Free User')}
                </span>
              </div>
              
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-khmer truncate">
                {isVip ? (
                  <span>
                    {isKm 
                      ? `ផុតកំណត់៖ ${currentUser?.subscriptionExpiryDate ? currentUser.subscriptionExpiryDate.split('T')[0] : ''} (${remainingDays} ថ្ងៃទៀត)`
                      : `Expires: ${currentUser?.subscriptionExpiryDate ? currentUser.subscriptionExpiryDate.split('T')[0] : ''} (${remainingDays} days left)`}
                  </span>
                ) : (
                  <span>
                    {isKm 
                      ? 'ដំឡើងទៅជា Premium VIP ($9.99/ឆ្នាំ) ដើម្បីដោះសោអត្ថប្រយោជន៍ទាំង ១០!' 
                      : 'Upgrade to Premium VIP ($9.99/year) to unlock all 10 benefits!'}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={openUpgradeVipModal}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-khmer shadow-xs transition shrink-0 active:scale-95 ${
              isVip 
                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20'
            }`}
          >
            {isVip ? (isKm ? '🔄 បន្ត VIP' : 'Renew VIP') : (isKm ? '👑 ដំឡើង VIP' : 'Upgrade VIP')}
          </button>
        </div>
      </div>

      {/* App Installation & Support Buttons Showcase */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setIsInstallModalOpen(true)}
          className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition text-left"
        >
          <div className="p-2 rounded-xl bg-[#064E3B] text-white shrink-0">
            <Download className="w-4 h-4 text-emerald-200" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#0F172A] dark:text-white font-khmer">
              {isKm ? 'ដំឡើង APK' : 'Install App'}
            </div>
            <div className="text-[10px] text-slate-500 font-khmer">
              {isKm ? 'ទាញយក APK ផ្ទាល់' : 'Direct APK Download'}
            </div>
          </div>
        </button>

        <button
          onClick={() => setIsSupportModalOpen(true)}
          className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition text-left"
        >
          <div className="p-2 rounded-xl bg-[#10B981] text-white shrink-0">
            <Heart className="w-4 h-4 fill-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#0F172A] dark:text-white font-khmer">
              {isKm ? 'ជួយឧបត្ថម្ភ' : 'Support App'}
            </div>
            <div className="text-[10px] text-slate-500 font-khmer">
              {isKm ? 'Bakong KHQR' : 'Bakong KHQR'}
            </div>
          </div>
        </button>
      </div>

      {/* 6 Personalized Account Features Hub */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950 via-[#064E3B] to-slate-900 text-white border border-emerald-500/40 shadow-xs space-y-3 font-khmer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <h3 className="font-moul text-xs sm:text-sm text-white">
              {isKm ? 'សេវាកម្មផ្ទាល់ខ្លួន (Personal Features)' : 'Personalized Features'}
            </h3>
          </div>
          <span className="text-[10px] text-emerald-200">
            {currentUser ? currentUser.name : (isKm ? 'ភ្ញៀវ' : 'Guest')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* A. ថ្ងៃនេះញ៉ាំអ្វី? */}
          <button
            onClick={() => setIsWhatToEatModalOpen(true)}
            className="p-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-left transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">🍲</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-900 text-[8px] font-black">
                {isKm ? 'អាទិភាពខ្ពស់ ⭐' : 'High Priority'}
              </span>
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {isKm ? 'ថ្ងៃនេះញ៉ាំអ្វី?' : 'What to Eat Today?'}
            </div>
          </button>

          {/* B. នៅជិតខ្ញុំ */}
          <button
            onClick={() => setIsNearMeModalOpen(true)}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">📍</span>
              <span className="text-[9px] font-mono text-emerald-300 font-bold">GPS</span>
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {isKm ? 'នៅជិតខ្ញុំ' : 'Near Me'}
            </div>
          </button>

          {/* C. កន្លែងថ្មីប្រចាំថ្ងៃ */}
          <button
            onClick={() => setIsDailyDiscoveriesModalOpen(true)}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">✨</span>
              <span className="text-[8px] text-amber-300 font-bold">Daily</span>
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {isKm ? 'កន្លែងថ្មីប្រចាំថ្ងៃ' : 'Daily Picks'}
            </div>
          </button>

          {/* D. បញ្ជីកន្លែងដែលចង់ទៅ */}
          <button
            onClick={() => setIsWishlistsModalOpen(true)}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">📑</span>
              <span className="text-[9px] text-emerald-300 font-bold">{wishlists.length}</span>
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {isKm ? 'បញ្ជីកន្លែងចង់ទៅ' : 'My Wishlists'}
            </div>
          </button>

          {/* E. ផែនការដើរលេង AI */}
          <button
            onClick={() => setIsAiTripPlannerModalOpen(true)}
            className="p-2.5 rounded-2xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/30 text-left transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">🤖</span>
              <span className="text-[8px] text-teal-300 font-bold">Smart AI</span>
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {isKm ? 'ផែនការដើរលេង AI' : 'AI Trip Planner'}
            </div>
          </button>

          {/* F. ការជូនដំណឹង */}
          <button
            onClick={() => setIsNotificationsModalOpen(true)}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">🔔</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[8px] font-black">
                  {unreadNotificationsCount}
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {isKm ? 'ការជូនដំណឹង' : 'Notifications'}
            </div>
          </button>
        </div>
      </div>

      {/* Tabs: My Restaurant (for owners) / Wishlists / Saved / Trip Plans / My Posts / Settings */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 text-xs font-khmer overflow-x-auto no-scrollbar">
        {isOwner && (
          <button
            onClick={() => setActiveSubTab('myrestaurant')}
            className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
              activeSubTab === 'myrestaurant'
                ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {isKm ? '🏪 ហាងខ្ញុំ' : '🏪 Shop'}
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('wishlists')}
          className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
            activeSubTab === 'wishlists'
              ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          {isKm ? `📑 បញ្ជីចង់ទៅ (${wishlists.length})` : `Lists (${wishlists.length})`}
        </button>

        <button
          onClick={() => setActiveSubTab('tripplans')}
          className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
            activeSubTab === 'tripplans'
              ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          {isKm ? `🤖 ផែនការ AI (${tripPlans.length})` : `Plans (${tripPlans.length})`}
        </button>

        <button
          onClick={() => setActiveSubTab('bookmarks')}
          className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
            activeSubTab === 'bookmarks'
              ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          {isKm ? `❤️ ចំណូលចិត្ត (${bookmarks.length})` : `Saved (${bookmarks.length})`}
        </button>

        <button
          onClick={() => setActiveSubTab('myposts')}
          className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
            activeSubTab === 'myposts'
              ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          {isKm ? `ការបង្ហោះ (${myPosts.length})` : `Posts (${myPosts.length})`}
        </button>

        <button
          onClick={() => setActiveSubTab('membership')}
          className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
            activeSubTab === 'membership'
              ? 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          {isKm ? (isVip ? '👑 សមាជិក VIP' : '👑 សមាជិកភាព') : '👑 Membership'}
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-3 ${
            activeSubTab === 'settings'
              ? 'border-[#064E3B] text-[#064E3B] dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          {isKm ? 'ការកំណត់' : 'Settings'}
        </button>
      </div>

      {/* Tab: My Restaurant (Shop Owner Portal) */}
      {activeSubTab === 'myrestaurant' && isOwner && (
        <div className="space-y-3 font-khmer">
          {myRestaurants.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-3 shadow-xs">
              <Store className="w-10 h-10 mx-auto text-[#059669]" />
              <div>
                <h4 className="font-bold text-xs text-[#0F172A] dark:text-white">
                  {isKm ? 'មិនទាន់មានហាងអាហារដែលបានចុះបញ្ជីនៅឡើយទេ' : 'No registered restaurant found'}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isKm ? 'ចុះបញ្ជីហាងរបស់អ្នកដោយឥតគិតថ្លៃ ($0) ឬ Premium ($4.99 សម្រាប់ ៣៦៥ ថ្ងៃ) ដើម្បីផ្សព្វផ្សាយ!' : 'Register your restaurant for free ($0) or Premium ($4.99)!'}
                </p>
              </div>
              <button
                onClick={() => setIsAddRestaurantModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#064E3B] text-white font-bold text-xs shadow-xs hover:bg-[#047857] transition active:scale-95"
              >
                {isKm ? '+ ចុះបញ្ជីហាងឥឡូវនេះ' : '+ Register Restaurant Now'}
              </button>
            </div>
          ) : (
            myRestaurants.map(restaurant => {
              const isPremium = isRestaurantPremiumActive(restaurant);
              const isExpired = restaurant.membershipTier === 'premium' && !isPremium;
              const isFree = restaurant.membershipTier === 'free';
              const items = restaurant.menuItems || [];

              return (
                <div key={restaurant.id} className="p-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3.5">
                  <div className="flex items-center gap-3">
                    <img src={restaurant.photoUrl} alt="restaurant" className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#0F172A] dark:text-white text-sm truncate">
                        {isKm ? restaurant.nameKh : restaurant.nameEn}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate">{restaurant.addressKh}</p>
                      <p className="text-[10px] text-[#059669] font-mono mt-0.5">📞 {restaurant.phone}</p>
                    </div>
                  </div>

                  {/* Membership Card */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200/90 dark:border-slate-600 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isPremium ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#064E3B] to-[#059669] text-white flex items-center gap-1 font-khmer shadow-xs">
                            <Sparkles className="w-3 h-3 text-emerald-200" />
                            <span>⭐ {isKm ? 'សមាជិកភាព VIP Premium (៣៦៥ ថ្ងៃ)' : 'Premium Active (365 Days)'}</span>
                          </span>
                        ) : isExpired ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            ⏳ {isKm ? 'Premium បានផុតកំណត់' : 'Premium Expired'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                            🏷️ {isKm ? 'ចុះបញ្ជីឥតគិតថ្លៃ ($0 Free Listing)' : 'Free Listing ($0)'}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-bold text-[#064E3B] dark:text-emerald-400 font-mono">
                        {items.length} / 5 {isKm ? 'មុខម្ហូប' : 'items'}
                      </div>
                    </div>

                    {isPremium && restaurant.membershipExpiresAt && (
                      <p className="text-[10px] text-slate-700 dark:text-slate-300">
                        {isKm 
                          ? `📅 ផុតកំណត់នៅថ្ងៃទី៖ ${new Date(restaurant.membershipExpiresAt).toLocaleDateString()} (ទូទាត់តែមួយលើក $4.99 គ្មានកាត់ប្រចាំខែ)` 
                          : `Valid until: ${new Date(restaurant.membershipExpiresAt).toLocaleDateString()} (One-time payment, no monthly fee)`}
                      </p>
                    )}

                    {isFree && (
                      <p className="text-[10px] text-slate-500">
                        {isKm 
                          ? 'គណនីឥតគិតថ្លៃមិនអាចបន្ថែមមុខម្ហូបបានទេ។ ដំឡើងទៅ Premium ($4.99 សម្រាប់ ៣៦៥ ថ្ងៃ) ដើម្បីបន្ថែមម្ហូបរហូតដល់ ៥ មុខ!' 
                          : 'Free listing cannot add food items. Upgrade to Premium ($4.99 for 365 days) to add up to 5 food items!'}
                      </p>
                    )}

                    {isExpired && (
                      <p className="text-[10px] text-red-600">
                        {isKm 
                          ? 'សមាជិកភាពបានផុតកំណត់ ៣៦៥ ថ្ងៃហើយ។ ទិន្នន័យមុខម្ហូបទាំងអស់ត្រូវបានរក្សាទុកដដែល (គ្មានការលុបឡើយ)។ សូមបន្តសមាជិកភាព $4.99 សម្រាប់ ៣៦៥ ថ្ងៃថ្មី។' 
                          : 'Premium expired. All food items are retained. Renew Premium ($4.99) for another 365 days.'}
                      </p>
                    )}

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setManagingRestaurant(restaurant);
                          setIsManageMenuModalOpen(true);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-200" />
                        <span>{isKm ? `គ្រប់គ្រងមុខម្ហូប (${items.length}/5)` : `Manage Menu (${items.length}/5)`}</span>
                      </button>

                      {(!isPremium || isExpired) && (
                        <button
                          onClick={() => {
                            setManagingRestaurant(restaurant);
                            setIsManageMenuModalOpen(true);
                          }}
                          className="py-2 px-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-xs transition active:scale-95"
                        >
                          {isKm ? '⭐ ដំឡើង $4.99' : '⭐ Upgrade $4.99'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Membership Page */}
      {activeSubTab === 'membership' && (
        <div className="space-y-4 font-khmer">
          {/* Header Card */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/20 via-emerald-500/10 to-teal-500/15 border-2 border-amber-400/50 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-amber-400 text-slate-900 shadow-md">
                  <Crown className="w-6 h-6 fill-slate-900" />
                </div>
                <div>
                  <h4 className="font-moul text-sm text-slate-900 dark:text-white">
                    {isKm ? 'ទំព័រសមាជិកភាព (VIP Membership Page)' : 'VIP Membership Page'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isKm ? 'គម្រោងប្រចាំឆ្នាំ $9.99 USD / ៣៦៥ ថ្ងៃ' : '$9.99 USD / 365 Days Annual Plan'}
                  </p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                isVip 
                  ? 'bg-amber-400 text-slate-950 shadow-xs' 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {isVip ? (isKm ? '🌟 Premium VIP' : '🌟 Premium VIP') : (isKm ? 'Free User' : 'Free User')}
              </span>
            </div>

            {/* Details */}
            <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">{isKm ? 'ស្ថានភាពបច្ចុប្បន្ន៖' : 'Current Status:'}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {isVip ? (isKm ? 'កំពុងដំណើរការ (Active)' : 'Active') : (isKm ? 'គណនីឥតគិតថ្លៃ (Free Account)' : 'Free Account')}
                </span>
              </div>
              {isVip && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isKm ? 'កាលបរិច្ឆេទផុតកំណត់៖' : 'Expiry Date:'}</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {currentUser?.subscriptionExpiryDate ? currentUser.subscriptionExpiryDate.split('T')[0] : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isKm ? 'រយៈពេលដែលនៅសល់៖' : 'Remaining Period:'}</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {remainingDays} {isKm ? 'ថ្ងៃ' : 'Days'}
                    </span>
                  </div>
                  {currentUser?.transactionRef && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Trx Ref:</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400 truncate max-w-[180px]">
                        {currentUser.transactionRef}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Upgrade / Renew CTA */}
            <button
              onClick={openUpgradeVipModal}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
            >
              <Crown className="w-4 h-4 fill-white" />
              <span>
                {isVip 
                  ? (isKm ? '🔄 បន្តសមាជិកភាព VIP ៣៦៥ ថ្ងៃ ($9.99)' : 'Renew VIP for 365 Days ($9.99)')
                  : (isKm ? '👑 ដំឡើងទៅជា Premium VIP ($9.99/ឆ្នាំ)' : 'Upgrade to Premium VIP ($9.99/yr)')}
              </span>
            </button>
          </div>

          {/* 10 Benefits Check-list */}
          <div className="space-y-2">
            <h5 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{isKm ? 'អត្ថប្រយោជន៍ទាំង ១០ យ៉ាងនៃ Premium VIP:' : 'All 10 Premium VIP Benefits:'}</span>
            </h5>

            <div className="space-y-2">
              {TEN_VIP_BENEFITS.map(b => (
                <div 
                  key={b.id}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-2xs flex items-start gap-2.5"
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-mono ${
                    isVip 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {b.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {isKm ? b.titleKh : b.titleEn}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                        isVip ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isVip ? '✓ Active' : 'Locked'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {isKm ? b.descriptionKh : b.descriptionEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Wishlists (បញ្ជីកន្លែងដែលចង់ទៅ) */}
      {activeSubTab === 'wishlists' && (
        <div className="space-y-3 font-khmer">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-[#0F172A] dark:text-white">
              {isKm ? `បញ្ជីផ្ទាល់ខ្លួនសរុប (${wishlists.length})` : `My Wishlists (${wishlists.length})`}
            </h4>
            <button
              onClick={() => setIsWishlistsModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#064E3B] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#047857] transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isKm ? 'គ្រប់គ្រងបញ្ជី' : 'Manage Lists'}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {wishlists.map(w => (
              <div
                key={w.id}
                onClick={() => setIsWishlistsModalOpen(true)}
                className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-500 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{w.emoji}</span>
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-white">
                      {isKm ? w.nameKh : w.nameEn}
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      {isKm ? `${w.items.length} ទីតាំង / មុខម្ហូបក្នុងបញ្ជី` : `${w.items.length} items`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: AI Trip Plans (ផែនការដើរលេង AI) */}
      {activeSubTab === 'tripplans' && (
        <div className="space-y-3 font-khmer">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-[#0F172A] dark:text-white">
              {isKm ? `ផែនការដើរលេងដែលបានរក្សាទុក (${tripPlans.length})` : `Saved AI Trip Plans (${tripPlans.length})`}
            </h4>
            <button
              onClick={() => setIsAiTripPlannerModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#064E3B] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#047857] transition"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isKm ? '+ បង្កើតថ្មី' : '+ New Plan'}</span>
            </button>
          </div>

          {tripPlans.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-3 shadow-xs">
              <Bot className="w-10 h-10 mx-auto text-[#059669]" />
              <div>
                <h4 className="font-bold text-xs text-[#0F172A] dark:text-white">
                  {isKm ? 'មិនទាន់មានផែនការដើរលេងនៅឡើយទេ' : 'No saved trip plans yet'}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isKm ? 'ឱ្យ AI រៀបចំកាលវិភាគ ហាងញ៉ាំអាហារ និងកន្លែងដើរលេងដោយស្វ័យប្រវត្តិតាមថវិកា!' : 'Let AI automate your itinerary and food spots!'}
                </p>
              </div>
              <button
                onClick={() => setIsAiTripPlannerModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#064E3B] text-white font-bold text-xs shadow-xs hover:bg-[#047857] transition"
              >
                {isKm ? '🤖 បង្កើតផែនការដើរលេងឥឡូវនេះ' : 'Generate AI Plan'}
              </button>
            </div>
          ) : (
            tripPlans.map(plan => (
              <div
                key={plan.id}
                className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#064E3B] text-[10px] font-bold">
                    📍 {plan.provinceKh}
                  </span>
                  <button
                    onClick={() => deleteTripPlan(plan.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded-lg"
                    title={isKm ? 'លុប' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F172A] dark:text-white">
                    {plan.durationDays} ថ្ងៃ • {plan.companion}
                  </span>
                  <span className="font-mono text-emerald-600 font-bold">
                    ~${plan.totalEstimatedCostUsd} USD
                  </span>
                </div>

                <button
                  onClick={() => setIsAiTripPlannerModalOpen(true)}
                  className="w-full py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition"
                >
                  {isKm ? 'មើលកាលវិភាគលម្អិត' : 'View Full Schedule'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Bookmarks */}
      {activeSubTab === 'bookmarks' && (
        <div className="space-y-4">
          {savedFoods.length === 0 && savedDestinations.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs space-y-1 font-khmer">
              <Heart className="w-8 h-8 mx-auto text-slate-300" />
              <p>{isKm ? 'មិនទាន់មានមុខម្ហូប ឬកន្លែងកម្សាន្តដែលបានរក្សាទុកនៅឡើយទេ' : 'No saved items yet'}</p>
            </div>
          ) : (
            <>
              {savedFoods.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-[#0F172A] dark:text-white font-khmer">
                    {isKm ? 'មុខម្ហូបដែលបានរក្សាទុក' : 'Saved Recipes'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {savedFoods.map(f => <FoodCard key={f.id} food={f} />)}
                  </div>
                </div>
              )}

              {savedDestinations.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-xs text-[#0F172A] dark:text-white font-khmer">
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

      {/* Tab: My Posts */}
      {activeSubTab === 'myposts' && (
        <div className="space-y-3">
          {myPosts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-khmer">
              <p>{isKm ? 'លោកអ្នកមិនទាន់បានបង្ហោះអ្វីនៅឡើយទេ' : 'You haven’t posted anything yet'}</p>
            </div>
          ) : (
            myPosts.map((p) => (
              <div key={p.id} className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <img src={p.photoUrl} alt="thumb" className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <h5 className="font-bold text-xs text-[#0F172A] dark:text-white font-khmer">{p.titleKh}</h5>
                    <p className="text-[10px] text-slate-400">{p.likesCount} ❤️ • {p.comments.length} 💬</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Settings */}
      {activeSubTab === 'settings' && (
        <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700 space-y-3 text-xs font-khmer shadow-xs">
          {/* VIP Membership Management */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <div>
              <span className="font-medium text-[#0F172A] dark:text-slate-200 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                {isKm ? 'គ្រប់គ្រងសមាជិកភាព (VIP Membership)' : 'VIP Membership'}
              </span>
              <p className="text-[10px] text-slate-500 pl-6">
                {isVip 
                  ? (isKm ? `ស្ថានភាព៖ Premium VIP (${remainingDays} ថ្ងៃទៀត)` : `Status: Premium VIP (${remainingDays} days left)`)
                  : (isKm ? 'ស្ថានភាព៖ គណនីឥតគិតថ្លៃ • $9.99/ឆ្នាំ' : 'Status: Free User • $9.99/year')}
              </p>
            </div>
            <button
              onClick={openUpgradeVipModal}
              className="px-3 py-1 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold border border-amber-300 hover:bg-amber-100 transition"
            >
              {isVip ? (isKm ? 'គ្រប់គ្រង / បន្ត' : 'Manage') : (isKm ? 'ដំឡើង VIP' : 'Upgrade')}
            </button>
          </div>

          {/* Language Switch */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="font-medium text-[#0F172A] dark:text-slate-200 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#059669]" />
              {isKm ? 'ភាសាកម្មវិធី (App Language)' : 'Language'}
            </span>
            <button
              onClick={() => setLanguage(isKm ? 'en' : 'km')}
              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-[#0F172A] dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-600"
            >
              {isKm ? 'ភាសាខ្មែរ (Khmer)' : 'English'}
            </button>
          </div>

          {/* Helpful Notifications Toggle */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <div>
              <span className="font-medium text-[#0F172A] dark:text-slate-200 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#059669]" />
                {isKm ? 'ការជូនដំណឹង (Notifications)' : 'Notifications'}
              </span>
              <p className="text-[10px] text-slate-500 pl-6">
                {isKm ? 'ជូនដំណឹងអំពីប្រូម៉ូសិនហាង និងកន្លែងថ្មី' : 'Receive promo alerts & viral new spots'}
              </p>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                notificationsEnabled ? 'bg-[#064E3B]' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Privacy Policy & Data Safety */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="font-medium text-[#0F172A] dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              {isKm ? 'គោលការណ៍ឯកជនភាព & សុវត្ថិភាព' : 'Privacy Policy & Data Safety'}
            </span>
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-[#0F172A] dark:text-slate-200 font-bold hover:bg-slate-200 transition border border-slate-200 dark:border-slate-600"
            >
              {isKm ? 'មើល' : 'View'}
            </button>
          </div>

          {/* Reset App Data */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="font-medium text-[#0F172A] dark:text-slate-200 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-slate-500" />
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
              className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-[#0F172A] dark:text-slate-200 font-bold flex items-center justify-center gap-1.5 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>{isKm ? 'ចាកចេញពីគណនី' : 'Sign Out'}</span>
            </button>
          )}

          {/* Discreet Admin Portal Access */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-center">
            <button
              onClick={() => setIsAdminLoginModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-[#064E3B] dark:hover:text-emerald-400 text-[11px] font-medium transition py-1.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
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

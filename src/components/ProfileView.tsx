import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { TouristCard } from './TouristCard';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { 
  User as UserIcon, Heart, Shield, Store, 
  Globe, LogOut, RefreshCw, Download, Sparkles, UtensilsCrossed, ShieldCheck 
} from 'lucide-react';
import { isRestaurantPremiumActive } from '../types';

export const ProfileView: React.FC = () => {
  const { 
    currentUser, users, login, logout, language, setLanguage, 
    bookmarks, foods, destinations, posts, restaurants,
    setIsAuthModalOpen, setIsAdminOpen, setIsAdminLoginModalOpen,
    setIsInstallModalOpen, setIsSupportModalOpen, setIsAddRestaurantModalOpen,
    setManagingRestaurant, setIsManageMenuModalOpen,
    resetAllData, showToast 
  } = useApp();

  const isKm = language === 'km';
  const isOwner = currentUser?.role === 'owner';
  const [activeSubTab, setActiveSubTab] = useState<'bookmarks' | 'myposts' | 'settings' | 'myrestaurant'>(
    isOwner ? 'myrestaurant' : 'bookmarks'
  );
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

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
                {currentUser.role === 'admin' ? (
                  <p className="text-xs text-rose-600 font-medium font-khmer mt-0.5">
                    {isKm ? 'គណនីរដ្ឋបាលប្រព័ន្ធ (Private)' : 'System Administrator (Private)'}
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-stone-500 mt-0.5">{currentUser.email}</p>
                    {currentUser.phone && (
                      <p className="text-[11px] text-stone-400">📞 {currentUser.phone}</p>
                    )}
                  </>
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
            <Download className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-800 dark:text-white font-khmer">
              {isKm ? 'ដំឡើង APK' : 'Install App'}
            </div>
            <div className="text-[10px] text-stone-500 font-khmer">
              {isKm ? 'ទាញយក APK ផ្ទាល់' : 'Direct APK Download'}
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

      {/* Tabs: My Restaurant (for owners) / Bookmarks / My Posts / Settings */}
      <div className="flex border-b border-stone-200 dark:border-stone-700 text-xs font-khmer overflow-x-auto no-scrollbar">
        {isOwner && (
          <button
            onClick={() => setActiveSubTab('myrestaurant')}
            className={`flex-1 py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-2 ${
              activeSubTab === 'myrestaurant'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            {isKm ? '🏪 ហាងរបស់ខ្ញុំ' : '🏪 My Restaurant'}
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('bookmarks')}
          className={`flex-1 py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-2 ${
            activeSubTab === 'bookmarks'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          {isKm ? `ចំណូលចិត្ត (${bookmarks.length})` : `Saved (${bookmarks.length})`}
        </button>

        <button
          onClick={() => setActiveSubTab('myposts')}
          className={`flex-1 py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-2 ${
            activeSubTab === 'myposts'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          {isKm ? `ការបង្ហោះ (${myPosts.length})` : `Posts (${myPosts.length})`}
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex-1 py-2.5 font-bold text-center border-b-2 transition whitespace-nowrap px-2 ${
            activeSubTab === 'settings'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          {isKm ? 'ការកំណត់' : 'Settings'}
        </button>
      </div>

      {/* Tab: My Restaurant (Shop Owner Portal) */}
      {activeSubTab === 'myrestaurant' && isOwner && (
        <div className="space-y-3 font-khmer">
          {myRestaurants.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 p-6 space-y-3">
              <Store className="w-10 h-10 mx-auto text-amber-500" />
              <div>
                <h4 className="font-bold text-xs text-stone-900 dark:text-stone-100">
                  {isKm ? 'មិនទាន់មានហាងអាហារដែលបានចុះបញ្ជីនៅឡើយទេ' : 'No registered restaurant found'}
                </h4>
                <p className="text-[10px] text-stone-500 mt-1">
                  {isKm ? 'ចុះបញ្ជីហាងរបស់អ្នកដោយឥតគិតថ្លៃ ($0) ឬ Premium ($4.99 សម្រាប់ ៣៦៥ ថ្ងៃ) ដើម្បីផ្សព្វផ្សាយ!' : 'Register your restaurant for free ($0) or Premium ($4.99)!'}
                </p>
              </div>
              <button
                onClick={() => setIsAddRestaurantModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow hover:bg-amber-500"
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
                <div key={restaurant.id} className="p-4 bg-white dark:bg-stone-800 rounded-3xl border border-amber-200/60 dark:border-stone-700 shadow-xs space-y-3.5">
                  <div className="flex items-center gap-3">
                    <img src={restaurant.photoUrl} alt="restaurant" className="w-16 h-16 rounded-2xl object-cover border border-amber-300 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm truncate">
                        {isKm ? restaurant.nameKh : restaurant.nameEn}
                      </h4>
                      <p className="text-[10px] text-stone-500 truncate">{restaurant.addressKh}</p>
                      <p className="text-[10px] text-emerald-600 font-mono mt-0.5">📞 {restaurant.phone}</p>
                    </div>
                  </div>

                  {/* Membership Card */}
                  <div className="p-3.5 bg-stone-50 dark:bg-stone-900/60 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isPremium ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950 flex items-center gap-1 font-khmer">
                            <Sparkles className="w-3 h-3" />
                            <span>⭐ {isKm ? 'សមាជិកភាព VIP Premium (៣៦៥ ថ្ងៃ)' : 'Premium Active (365 Days)'}</span>
                          </span>
                        ) : isExpired ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            ⏳ {isKm ? 'Premium បានផុតកំណត់' : 'Premium Expired'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700">
                            🏷️ {isKm ? 'ចុះបញ្ជីឥតគិតថ្លៃ ($0 Free Listing)' : 'Free Listing ($0)'}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 font-mono">
                        {items.length} / 5 {isKm ? 'មុខម្ហូប' : 'items'}
                      </div>
                    </div>

                    {isPremium && restaurant.membershipExpiresAt && (
                      <p className="text-[10px] text-stone-600 dark:text-stone-300">
                        {isKm 
                          ? `📅 ផុតកំណត់នៅថ្ងៃទី៖ ${new Date(restaurant.membershipExpiresAt).toLocaleDateString()} (ទូទាត់តែមួយលើក $4.99 គ្មានកាត់ប្រចាំខែ)` 
                          : `Valid until: ${new Date(restaurant.membershipExpiresAt).toLocaleDateString()} (One-time payment, no monthly fee)`}
                      </p>
                    )}

                    {isFree && (
                      <p className="text-[10px] text-stone-500">
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
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        <span>{isKm ? `គ្រប់គ្រងមុខម្ហូប (${items.length}/5)` : `Manage Menu (${items.length}/5)`}</span>
                      </button>

                      {(!isPremium || isExpired) && (
                        <button
                          onClick={() => {
                            setManagingRestaurant(restaurant);
                            setIsManageMenuModalOpen(true);
                          }}
                          className="py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold text-xs shadow"
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

      {/* Tab: Bookmarks */}
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

      {/* Tab: My Posts */}
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

      {/* Tab: Settings */}
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

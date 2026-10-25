import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { isUserVipActive } from './types';
import { verifyAppOwnershipAndDomainIntegrity } from './utils/security';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { FoodView } from './components/FoodView';
import { RestaurantView } from './components/RestaurantView';
import { TourismView } from './components/TourismView';
import { CommunityFeed } from './components/CommunityFeed';
const ProfileView = lazy(() => import('./components/ProfileView').then((m) => ({ default: m.ProfileView })));
const IntroTips = lazy(() => import('./components/IntroTips').then((m) => ({ default: m.IntroTips })));
const SmartHubMenuModal = lazy(() => import('./components/SmartHubMenuModal').then((m) => ({ default: m.SmartHubMenuModal })));
import { FoodDetailModal } from './components/FoodDetailModal';
import { RestaurantDetailModal } from './components/RestaurantDetailModal';
import { TouristDetailModal } from './components/TouristDetailModal';
import { AuthModal } from './components/AuthModal';
import { WelcomeScreenModal, WELCOME_SESSION_KEY } from './components/WelcomeScreenModal';
const AddRestaurantModal = lazy(() => import('./components/AddRestaurantModal').then((m) => ({ default: m.AddRestaurantModal })));
const ManageMenuModal = lazy(() => import('./components/ManageMenuModal').then((m) => ({ default: m.ManageMenuModal })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
import { AdminLoginModal } from './components/AdminLoginModal';
const InstallModal = lazy(() => import('./components/InstallModal').then((m) => ({ default: m.InstallModal })));
const SupportModal = lazy(() => import('./components/SupportModal').then((m) => ({ default: m.SupportModal })));
import { ExitConfirmModal } from './components/ExitConfirmModal';
const WhatToEatModal = lazy(() => import('./components/WhatToEatModal').then((m) => ({ default: m.WhatToEatModal })));
const NearMeModal = lazy(() => import('./components/NearMeModal').then((m) => ({ default: m.NearMeModal })));
const DailyDiscoveriesModal = lazy(() => import('./components/DailyDiscoveriesModal').then((m) => ({ default: m.DailyDiscoveriesModal })));
const WishlistsModal = lazy(() => import('./components/WishlistsModal').then((m) => ({ default: m.WishlistsModal })));
const AiTripPlannerModal = lazy(() => import('./components/AiTripPlannerModal').then((m) => ({ default: m.AiTripPlannerModal })));
const NotificationsModal = lazy(() => import('./components/NotificationsModal').then((m) => ({ default: m.NotificationsModal })));
const TrendingSocialModal = lazy(() => import('./components/TrendingSocialModal').then((m) => ({ default: m.TrendingSocialModal })));
const TrendingFoodDetailModal = lazy(() => import('./components/TrendingFoodDetailModal').then((m) => ({ default: m.TrendingFoodDetailModal })));
const AiCheckInModal = lazy(() => import('./components/AiCheckInModal').then((m) => ({ default: m.AiCheckInModal })));
const UpgradeVipModal = lazy(() => import('./components/UpgradeVipModal').then((m) => ({ default: m.UpgradeVipModal })));
const PaymentSupportModal = lazy(() => import('./components/PaymentSupportModal').then((m) => ({ default: m.PaymentSupportModal })));
const QrScannerModal = lazy(() => import('./components/QrScannerModal').then((m) => ({ default: m.QrScannerModal })));
const VipAddRestaurantModal = lazy(() => import('./components/VipAddRestaurantModal').then((m) => ({ default: m.VipAddRestaurantModal })));
const RestaurantCheckInModal = lazy(() => import('./components/RestaurantCheckInModal').then((m) => ({ default: m.RestaurantCheckInModal })));
const GoogleMapsPlaceSearchModal = lazy(() => import('./components/GoogleMapsPlaceSearchModal').then((m) => ({ default: m.GoogleMapsPlaceSearchModal })));
import { Toast } from './components/Toast';
import { RatePrompt } from './components/RatePrompt';
import { OfflineBanner } from './components/OfflineBanner';
import { SMART_HUB_EVENT } from './utils/smartHub';

const MainScreen: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    language,
    currentUser,
    setIsAuthModalOpen,
    selectedFood,
    selectedRestaurant,
    selectedDestination,
    isAuthModalOpen,
    isAddRestaurantModalOpen,
    isManageMenuModalOpen,
    managingRestaurant,
    isAdminOpen,
    isAdminLoginModalOpen,
    isInstallModalOpen,
    isSupportModalOpen,
    isExitModalOpen,
    isWhatToEatModalOpen,
    isNearMeModalOpen,
    isDailyDiscoveriesModalOpen,
    isWishlistsModalOpen,
    isAiTripPlannerModalOpen,
    isNotificationsModalOpen,
    isTrendingSocialModalOpen,
    isTrendingFoodDetailModalOpen,
    isAiCheckInModalOpen,
    isRestaurantCheckInModalOpen,
    isUpgradeVipModalOpen,
    isSupportTicketModalOpen,
    isQrScannerModalOpen,
    isVipAddRestaurantModalOpen,
    isGoogleMapsSearchModalOpen,
    appSettings,
    toast,
  } = useApp();

  // Intellectual Property & Anti-Clone Domain/Merchant Signature Verification
  const ownershipCheck = useMemo(
    () => verifyAppOwnershipAndDomainIntegrity(appSettings),
    [appSettings]
  );

  const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(WELCOME_SESSION_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  // Smart Menu (opened from the Header button or the Home banner via a window event)
  const [isSmartHubOpen, setIsSmartHubOpen] = useState(false);
  useEffect(() => {
    const open = () => setIsSmartHubOpen(true);
    window.addEventListener(SMART_HUB_EVENT, open);
    return () => window.removeEventListener(SMART_HUB_EVENT, open);
  }, []);

  if (!ownershipCheck.isAuthentic) {
    return (
      <div className="flex-1 flex flex-col w-full min-h-screen bg-rose-950 text-white items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-600 flex items-center justify-center text-3xl shadow-xl border-2 border-rose-300">
          🛡️
        </div>
        <h1 className="text-lg font-extrabold tracking-tight text-amber-300">
          ប្រព័ន្ធការពារកម្មសិទ្ធិបញ្ញា (Anti-Clone Security Lock)
        </h1>
        <p className="text-xs text-rose-100 leading-relaxed max-w-sm">
          {ownershipCheck.tamperReasonKh}
        </p>
        <p className="text-[11px] text-rose-200/80 max-w-sm">
          {ownershipCheck.tamperReasonEn}
        </p>
        <div className="p-3 rounded-xl bg-black/40 border border-rose-400/30 text-[10px] font-mono text-amber-200 space-y-1">
          <div>OWNER: {ownershipCheck.certificate.ownerFullName}</div>
          <div>ABA MERCHANT: {ownershipCheck.certificate.abaAccountNumber}</div>
          <div>SEAL: {ownershipCheck.certificate.signatureHash}</div>
        </div>
      </div>
    );
  }

  if (showWelcomeScreen) {
    return (
      <WelcomeScreenModal
        onComplete={() => {
          setShowWelcomeScreen(false);
          setActiveTab('home');
          if (!currentUser) {
            setIsAuthModalOpen(true);
          }
        }}
      />
    );
  }

  // Strict Condition: If user does not create or sign into an account, app cannot be used!
  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col w-full min-h-screen relative overflow-y-auto no-scrollbar bg-slate-950 items-center justify-center p-3 sm:p-4">
        <AuthModal isMandatoryGate={true} />
        {selectedFood && <FoodDetailModal />}
        {isExitModalOpen && <ExitConfirmModal />}
        {isAdminLoginModalOpen && <AdminLoginModal />}
        {toast && <Toast />}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full min-h-screen relative overflow-y-auto no-scrollbar pb-16">
      <Header />
      
      <main key={`lang-${language}`} className="flex-1 w-full">
        <Suspense
          fallback={
            <div className="max-w-md mx-auto px-4 py-10 text-center text-sm text-slate-400 animate-pulse" aria-busy="true">
              …
            </div>
          }
        >
          {activeTab === 'home' && <HomeView />}
          {activeTab === 'food' && <FoodView />}
          {activeTab === 'restaurants' && <RestaurantView />}
          {activeTab === 'tourism' && <TourismView />}
          {activeTab === 'community' && <CommunityFeed />}
          {activeTab === 'profile' && <ProfileView />}
        </Suspense>
      </main>

      <OfflineBanner />

      {/* Smart Menu: dish tags + travel & food tools in one place */}
      <Suspense fallback={null}>
        {isSmartHubOpen && <SmartHubMenuModal onClose={() => setIsSmartHubOpen(false)} />}
      </Suspense>

      {/* First-run intro (shown once, skippable) */}
      <Suspense fallback={null}>
        <IntroTips />
      </Suspense>

      {/* Creation & Action Modals — Conditionally Mounted (lazy-loaded chunks) */}
      <Suspense fallback={null}>
      {isAuthModalOpen && <AuthModal />}
      {isAddRestaurantModalOpen && <AddRestaurantModal />}
      {isAdminOpen && <AdminDashboard />}
      {isAdminLoginModalOpen && <AdminLoginModal />}
      {isInstallModalOpen && <InstallModal />}
      {isSupportModalOpen && <SupportModal />}
      {isExitModalOpen && <ExitConfirmModal />}

      {/* 6 Personalized Account Features — Strictly VIP Access Controlled & Conditionally Mounted */}
      {isWhatToEatModalOpen && (isUserVipActive(currentUser) || currentUser?.role === 'admin') && <WhatToEatModal />}
      {isNearMeModalOpen && (isUserVipActive(currentUser) || currentUser?.role === 'admin') && <NearMeModal />}
      {isDailyDiscoveriesModalOpen && (isUserVipActive(currentUser) || currentUser?.role === 'admin') && <DailyDiscoveriesModal />}
      {isWishlistsModalOpen && (isUserVipActive(currentUser) || currentUser?.role === 'admin') && <WishlistsModal />}
      {isAiTripPlannerModalOpen && (isUserVipActive(currentUser) || currentUser?.role === 'admin') && <AiTripPlannerModal />}
      {isNotificationsModalOpen && (isUserVipActive(currentUser) || currentUser?.role === 'admin') && <NotificationsModal />}
      {isTrendingSocialModalOpen && <TrendingSocialModal />}
      {isTrendingFoodDetailModalOpen && <TrendingFoodDetailModal />}
      {isAiCheckInModalOpen && <AiCheckInModal />}
      {isRestaurantCheckInModalOpen && <RestaurantCheckInModal />}
      {isUpgradeVipModalOpen && <UpgradeVipModal />}
      {isSupportTicketModalOpen && <PaymentSupportModal />}
      {isQrScannerModalOpen && <QrScannerModal />}
      {isVipAddRestaurantModalOpen && <VipAddRestaurantModal />}
      {isGoogleMapsSearchModalOpen && <GoogleMapsPlaceSearchModal />}

      {/* Detail & Edit Modals — Mounted Above Search Modals so Previews Open on Top */}
      {selectedFood && <FoodDetailModal />}
      {selectedRestaurant && <RestaurantDetailModal />}
      {selectedDestination && <TouristDetailModal />}
      {(isManageMenuModalOpen || managingRestaurant) && <ManageMenuModal />}
      </Suspense>

      {/* Notifications */}
      {toast && <Toast />}

      {/* One-time gentle rating prompt (after 5th meaningful action) */}
      <RatePrompt />

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      {/* Full-screen Native Mobile App Layout (No fake bezels, no notches, edge-to-edge full screen) */}
      <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] flex justify-center">
        <div className="w-full max-w-md min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0F172A] relative shadow-none md:shadow-xl md:border-x md:border-slate-200 dark:md:border-slate-800">
          <MainScreen />
        </div>
      </div>
    </AppProvider>
  );
}

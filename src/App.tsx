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
const GuideView = lazy(() => import('./components/GuideView').then((m) => ({ default: m.GuideView })));
const ProfileView = lazy(() => import('./components/ProfileView').then((m) => ({ default: m.ProfileView })));
import { SmartHubMenuModal } from './components/SmartHubMenuModal';
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
import { DeleteShopConfirmModal } from './components/DeleteShopConfirmModal';
const WhatToEatModal = lazy(() => import('./components/WhatToEatModal').then((m) => ({ default: m.WhatToEatModal })));
const NearMeModal = lazy(() => import('./components/NearMeModal').then((m) => ({ default: m.NearMeModal })));
const DailyDiscoveriesModal = lazy(() => import('./components/DailyDiscoveriesModal').then((m) => ({ default: m.DailyDiscoveriesModal })));
const WishlistsModal = lazy(() => import('./components/WishlistsModal').then((m) => ({ default: m.WishlistsModal })));
const AiTripPlannerModal = lazy(() => import('./components/AiTripPlannerModal').then((m) => ({ default: m.AiTripPlannerModal })));
const NotificationsModal = lazy(() => import('./components/NotificationsModal').then((m) => ({ default: m.NotificationsModal })));
import { TrendingSocialModal } from './components/TrendingSocialModal';
import { TrendingFoodDetailModal } from './components/TrendingFoodDetailModal';
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
import { UpdateAvailableBanner } from './components/UpdateAvailableBanner';
import { SMART_HUB_EVENT } from './utils/smartHub';
import { useBodyScrollLock } from './utils/useBodyScrollLock';

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

  // Smart Menu (opened from the Header button or the Home banner via a window event — strictly VIP-controlled)
  const [isSmartHubOpen, setIsSmartHubOpen] = useState(false);
  const hasVipAccess = isUserVipActive(currentUser) || currentUser?.role === 'admin';
  useEffect(() => {
    (window as any).__kft_is_smart_hub_open = Boolean(isSmartHubOpen && hasVipAccess);
    return () => {
      (window as any).__kft_is_smart_hub_open = false;
    };
  }, [isSmartHubOpen, hasVipAccess]);

  useEffect(() => {
    const open = () => {
      if (!hasVipAccess) return;
      setIsSmartHubOpen(true);
    };
    const close = () => setIsSmartHubOpen(false);
    window.addEventListener(SMART_HUB_EVENT, open);
    window.addEventListener('kft:close-smart-hub', close);
    return () => {
      window.removeEventListener(SMART_HUB_EVENT, open);
      window.removeEventListener('kft:close-smart-hub', close);
    };
  }, [hasVipAccess]);
  const isAnyModalOpen = Boolean(
    (isSmartHubOpen && hasVipAccess) ||
    selectedFood ||
    selectedRestaurant ||
    selectedDestination ||
    showWelcomeScreen ||
    !currentUser ||
    isAuthModalOpen ||
    isAddRestaurantModalOpen ||
    (isManageMenuModalOpen && Boolean(managingRestaurant)) ||
    isAdminOpen ||
    isAdminLoginModalOpen ||
    isInstallModalOpen ||
    isSupportModalOpen ||
    isExitModalOpen ||
    (isWhatToEatModalOpen && hasVipAccess) ||
    (isNearMeModalOpen && hasVipAccess) ||
    isDailyDiscoveriesModalOpen ||
    (isWishlistsModalOpen && hasVipAccess) ||
    (isAiTripPlannerModalOpen && hasVipAccess) ||
    isNotificationsModalOpen ||
    isTrendingSocialModalOpen ||
    isTrendingFoodDetailModalOpen ||
    isAiCheckInModalOpen ||
    isRestaurantCheckInModalOpen ||
    isUpgradeVipModalOpen ||
    isSupportTicketModalOpen ||
    isQrScannerModalOpen ||
    isVipAddRestaurantModalOpen ||
    isGoogleMapsSearchModalOpen
  );
  useBodyScrollLock(isAnyModalOpen);

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
    <div className="flex-1 flex flex-col w-full min-h-screen relative overflow-y-auto no-scrollbar pb-[calc(env(safe-area-inset-bottom,0px)+68px)]">
      <Header />
      <UpdateAvailableBanner />
      
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
          {activeTab === 'guide' && <GuideView />}
          {activeTab === 'profile' && <ProfileView />}
        </Suspense>
      </main>

      <OfflineBanner />

      {/* Smart Menu: dish tags + travel & food tools in one place (Strictly VIP Access Controlled) */}
      {isSmartHubOpen && hasVipAccess && <SmartHubMenuModal onClose={() => setIsSmartHubOpen(false)} />}

      {/* Creation & Action Modals — Conditionally Mounted (lazy-loaded chunks) */}
      <Suspense fallback={null}>
      {isAuthModalOpen && <AuthModal />}
      {isAddRestaurantModalOpen && <AddRestaurantModal />}
      {isAdminOpen && <AdminDashboard />}
      {isAdminLoginModalOpen && <AdminLoginModal />}
      {isInstallModalOpen && <InstallModal />}
      {isSupportModalOpen && <SupportModal />}
      {isExitModalOpen && <ExitConfirmModal />}

      {/* Personalized Account Features & Daily/Notification Modals */}
      {isWhatToEatModalOpen && (isUserVipActive(currentUser) || currentUser?.role === 'admin') && <WhatToEatModal />}
      {isNearMeModalOpen && (isUserVipActive(currentUser) || currentUser?.role === 'admin') && <NearMeModal />}
      {isDailyDiscoveriesModalOpen && <DailyDiscoveriesModal />}
      {isWishlistsModalOpen && (isUserVipActive(currentUser) || currentUser?.role === 'admin') && <WishlistsModal />}
      {isAiTripPlannerModalOpen && (isUserVipActive(currentUser) || currentUser?.role === 'admin') && <AiTripPlannerModal />}
      {isNotificationsModalOpen && <NotificationsModal />}
      {isAiCheckInModalOpen && <AiCheckInModal />}
      {isRestaurantCheckInModalOpen && <RestaurantCheckInModal />}
      {isUpgradeVipModalOpen && <UpgradeVipModal />}
      {isSupportTicketModalOpen && <PaymentSupportModal />}
      {isQrScannerModalOpen && <QrScannerModal />}
      {isVipAddRestaurantModalOpen && <VipAddRestaurantModal />}
      {isGoogleMapsSearchModalOpen && <GoogleMapsPlaceSearchModal />}
      {isManageMenuModalOpen && managingRestaurant && <ManageMenuModal />}
      </Suspense>

      {/* Primary Detail Modals — Statically Mounted Outside Suspense for Zero-Latency Instant Open */}
      {isTrendingSocialModalOpen && <TrendingSocialModal />}
      {isTrendingFoodDetailModalOpen && <TrendingFoodDetailModal />}
      {selectedFood && <FoodDetailModal />}
      {selectedRestaurant && <RestaurantDetailModal />}
      {selectedDestination && <TouristDetailModal />}
      <DeleteShopConfirmModal />

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
      <div className="dark w-full min-h-screen bg-[#0F172A] text-[#F8FAFC] flex justify-center">
        <div className="w-full max-w-md min-h-screen flex flex-col bg-[#0F172A] text-[#F8FAFC] relative shadow-none md:shadow-xl md:border-x md:border-slate-800">
          <MainScreen />
        </div>
      </div>
    </AppProvider>
  );
}

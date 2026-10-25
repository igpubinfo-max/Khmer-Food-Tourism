import React, { useState, useMemo } from 'react';
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
import { ProfileView } from './components/ProfileView';
import { FoodDetailModal } from './components/FoodDetailModal';
import { RestaurantDetailModal } from './components/RestaurantDetailModal';
import { TouristDetailModal } from './components/TouristDetailModal';
import { AuthModal } from './components/AuthModal';
import { WelcomeScreenModal, WELCOME_SESSION_KEY } from './components/WelcomeScreenModal';
import { AddRestaurantModal } from './components/AddRestaurantModal';
import { ManageMenuModal } from './components/ManageMenuModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { InstallModal } from './components/InstallModal';
import { SupportModal } from './components/SupportModal';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { WhatToEatModal } from './components/WhatToEatModal';
import { NearMeModal } from './components/NearMeModal';
import { DailyDiscoveriesModal } from './components/DailyDiscoveriesModal';
import { WishlistsModal } from './components/WishlistsModal';
import { AiTripPlannerModal } from './components/AiTripPlannerModal';
import { NotificationsModal } from './components/NotificationsModal';
import { TrendingSocialModal } from './components/TrendingSocialModal';
import { TrendingFoodDetailModal } from './components/TrendingFoodDetailModal';
import { AiCheckInModal } from './components/AiCheckInModal';
import { UpgradeVipModal } from './components/UpgradeVipModal';
import { PaymentSupportModal } from './components/PaymentSupportModal';
import { QrScannerModal } from './components/QrScannerModal';
import { VipAddRestaurantModal } from './components/VipAddRestaurantModal';
import { AiFoodDiscoveryModal } from './components/AiFoodDiscoveryModal';
import { RestaurantCheckInModal } from './components/RestaurantCheckInModal';
import { GoogleMapsPlaceSearchModal } from './components/GoogleMapsPlaceSearchModal';
import { Toast } from './components/Toast';

const MainScreen: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    language,
    currentUser,
    setIsAuthModalOpen,
    setIsNearMeModalOpen,
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
    isAiFoodDiscoveryModalOpen,
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
        onComplete={(targetSection) => {
          setShowWelcomeScreen(false);
          if (targetSection === 'food') {
            setActiveTab('food');
          } else if (targetSection === 'restaurants') {
            setActiveTab('restaurants');
          } else if (targetSection === 'tourism') {
            setActiveTab('tourism');
          } else if (targetSection === 'nearby') {
            setActiveTab('home');
            setIsNearMeModalOpen(true);
          } else {
            setActiveTab('home');
          }
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
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'food' && <FoodView />}
        {activeTab === 'restaurants' && <RestaurantView />}
        {activeTab === 'tourism' && <TourismView />}
        {activeTab === 'community' && <CommunityFeed />}
        {activeTab === 'profile' && <ProfileView />}
      </main>

      {/* Creation & Action Modals — Conditionally Mounted */}
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
      {isAiFoodDiscoveryModalOpen && <AiFoodDiscoveryModal />}
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

      {/* Notifications */}
      {toast && <Toast />}

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

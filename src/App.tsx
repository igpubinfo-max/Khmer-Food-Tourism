import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
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
import { Toast } from './components/Toast';

const MainScreen: React.FC = () => {
  const {
    activeTab,
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
    isAiFoodDiscoveryModalOpen,
    isRestaurantCheckInModalOpen,
    isUpgradeVipModalOpen,
    isSupportTicketModalOpen,
    isQrScannerModalOpen,
    isVipAddRestaurantModalOpen,
    toast,
  } = useApp();
  const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(WELCOME_SESSION_KEY) !== 'true' && localStorage.getItem('kft_welcome_shown_v2') !== 'true';
    } catch {
      return false;
    }
  });

  if (showWelcomeScreen) {
    return (
      <WelcomeScreenModal
        onComplete={() => {
          setShowWelcomeScreen(false);
          setIsAuthModalOpen(true);
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
      
      <main className="flex-1 w-full">
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'food' && <FoodView />}
        {activeTab === 'restaurants' && <RestaurantView />}
        {activeTab === 'tourism' && <TourismView />}
        {activeTab === 'community' && <CommunityFeed />}
        {activeTab === 'profile' && <ProfileView />}
      </main>

      {/* Detail Modals — Conditionally Mounted to Save CPU, GPU & RAM */}
      {selectedFood && <FoodDetailModal />}
      {selectedRestaurant && <RestaurantDetailModal />}
      {selectedDestination && <TouristDetailModal />}
      
      {/* Creation & Action Modals — Conditionally Mounted */}
      {isAuthModalOpen && <AuthModal />}
      {isAddRestaurantModalOpen && <AddRestaurantModal />}
      {(isManageMenuModalOpen || managingRestaurant) && <ManageMenuModal />}
      {isAdminOpen && <AdminDashboard />}
      {isAdminLoginModalOpen && <AdminLoginModal />}
      {isInstallModalOpen && <InstallModal />}
      {isSupportModalOpen && <SupportModal />}
      {isExitModalOpen && <ExitConfirmModal />}

      {/* 6 Personalized Account Features & Viral Modals — Conditionally Mounted */}
      {isWhatToEatModalOpen && <WhatToEatModal />}
      {isNearMeModalOpen && <NearMeModal />}
      {isDailyDiscoveriesModalOpen && <DailyDiscoveriesModal />}
      {isWishlistsModalOpen && <WishlistsModal />}
      {isAiTripPlannerModalOpen && <AiTripPlannerModal />}
      {isNotificationsModalOpen && <NotificationsModal />}
      {isTrendingSocialModalOpen && <TrendingSocialModal />}
      {isTrendingFoodDetailModalOpen && <TrendingFoodDetailModal />}
      {isAiCheckInModalOpen && <AiCheckInModal />}
      {isAiFoodDiscoveryModalOpen && <AiFoodDiscoveryModal />}
      {isRestaurantCheckInModalOpen && <RestaurantCheckInModal />}
      {isUpgradeVipModalOpen && <UpgradeVipModal />}
      {isSupportTicketModalOpen && <PaymentSupportModal />}
      {isQrScannerModalOpen && <QrScannerModal />}
      {isVipAddRestaurantModalOpen && <VipAddRestaurantModal />}

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

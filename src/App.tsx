import React from 'react';
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
import { AddRestaurantModal } from './components/AddRestaurantModal';
import { ManageMenuModal } from './components/ManageMenuModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { InstallModal } from './components/InstallModal';
import { SupportModal } from './components/SupportModal';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { Toast } from './components/Toast';

const MainScreen: React.FC = () => {
  const { activeTab } = useApp();

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

      {/* Detail Modals */}
      <FoodDetailModal />
      <RestaurantDetailModal />
      <TouristDetailModal />
      
      {/* Creation & Action Modals */}
      <AuthModal />
      <AddRestaurantModal />
      <ManageMenuModal />
      <AdminDashboard />
      <AdminLoginModal />
      <InstallModal />
      <SupportModal />
      <ExitConfirmModal />

      {/* Notifications */}
      <Toast />

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      {/* Full-screen Native Mobile App Layout (No fake bezels, no notches, edge-to-edge full screen) */}
      <div className="w-full min-h-screen bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 flex justify-center">
        <div className="w-full max-w-md min-h-screen flex flex-col bg-stone-50 dark:bg-stone-900 relative shadow-none md:shadow-2xl md:border-x md:border-stone-200 dark:md:border-stone-800">
          <MainScreen />
        </div>
      </div>
    </AppProvider>
  );
}

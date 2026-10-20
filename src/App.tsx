import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { DeviceWrapper } from './components/DeviceWrapper';
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
import { AdminDashboard } from './components/AdminDashboard';
import { Toast } from './components/Toast';

const MainScreen: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="flex-1 flex flex-col relative w-full overflow-y-auto no-scrollbar">
      <Header />
      
      <main className="flex-1">
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
      <AdminDashboard />

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
      <DeviceWrapper>
        <MainScreen />
      </DeviceWrapper>
    </AppProvider>
  );
}

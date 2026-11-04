import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export const AddRestaurantModal: React.FC = () => {
  const { isAddRestaurantModalOpen, setIsAddRestaurantModalOpen, setIsVipAddRestaurantModalOpen } = useApp();

  useEffect(() => {
    if (isAddRestaurantModalOpen) {
      setIsAddRestaurantModalOpen(false);
      (window as any).__kft_vip_store_initial_mode = { mode: 'create' };
      setIsVipAddRestaurantModalOpen(true);
    }
  }, [isAddRestaurantModalOpen, setIsAddRestaurantModalOpen, setIsVipAddRestaurantModalOpen]);

  return null;
};

import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  getConsumerVipPricingCatalog,
  isIosOrIpadAppStoreRuntime,
  isNativeIosApp,
} from '../types';
import {
  addTrialWinbackTapListener,
  consumeWebTrialWinbackBannerOnce,
  syncTrialWinbackNotifications,
} from '../services/trialWinbackNotificationService';

/**
 * Invisible controller for Day 6 & Day 8 Trial Win-Back notifications (Android & Web ONLY).
 * Strictly no-ops on iOS / iPadOS App Store runtimes.
 * Automatically cancels scheduled notifications the moment the user upgrades to any paid VIP plan.
 */
export const TrialWinbackBootstrap: React.FC = () => {
  const { currentUser, language, appSettings, setIsUpgradeVipModalOpen, showToast } = useApp();
  const latestRef = useRef({ setIsUpgradeVipModalOpen });
  latestRef.current = { setIsUpgradeVipModalOpen };

  const promoPriceUsd = getConsumerVipPricingCatalog(appSettings).promo30d.priceUsd;

  useEffect(() => {
    if (isNativeIosApp() || isIosOrIpadAppStoreRuntime()) return;
    if (appSettings.consumerVipEnabled === false) return;

    const timer = setTimeout(() => {
      void syncTrialWinbackNotifications({
        user: currentUser,
        language,
        promoPriceUsd,
        requestPermissionIfPrompt: false,
      });

      const webMsg = consumeWebTrialWinbackBannerOnce({
        user: currentUser,
        language,
        promoPriceUsd,
      });
      if (webMsg) {
        showToast(webMsg, 'info');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [
    currentUser?.id,
    currentUser?.freeTrialExpiresAt,
    currentUser?.subscriptionExpiryDate,
    currentUser?.activeConsumerPlanId,
    currentUser?.promo099Used,
    language,
    promoPriceUsd,
    appSettings.consumerVipEnabled,
    showToast,
  ]);

  useEffect(() => {
    if (isNativeIosApp() || isIosOrIpadAppStoreRuntime()) return;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    void addTrialWinbackTapListener(() => {
      latestRef.current.setIsUpgradeVipModalOpen(true);
    }).then((off) => {
      if (cancelled) off();
      else unsubscribe = off;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return null;
};
